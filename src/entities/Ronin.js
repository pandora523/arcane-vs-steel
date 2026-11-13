import { Fighter } from './Fighter.js?v=30fps97';
import { PixelForge } from '../engine/PixelForge.js?v=30fps97';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps97';
import { STORM_EFFECT_REGISTRY } from '../engine/shaders/stormShaders.js?v=30fps97';

const AUTO_SLICES_4 = [
  [60, 8],
  [68, 7],
  [75, 8],
  [83, 7]
];

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
      attackRange: 112,
      autoInterval: 0.88,
      lightColor: 'rgba(129, 140, 248, 1)',
      primaryColor: '#818cf8'
    });
    this.heroId = 'ronin';
    this.deathSfx = 'death_ronin';
    this.skillName = 'ZANTETSUKEN FLASH';
    this.ultName = 'SUSANOO OMNISLASH';
    this.hasTrueUltimate = true;
    this.trueUltName = 'AMAKAKERU: SHOGUNATE REALM SLICE';
    this.trueUltDuration = 3.70;
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
    this._autoVariant = 0;
    this.stepDustTimer = 0;
    this.divePitchRad = 0;

    // Kaze-Maru Unique Iaido & Storm-God Mechanics:
    // 1. Lightning Afterimage Clones left behind during Shunpo / Zantetsuken / Omnislash
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
    // 6. Minimal cold-steel katana blade traces & flesh-cut wound slashes for basic Auto-Attacks
    this.cleanBladeCuts = [];
    this._ultTargetX = 600;
    this.susanooAvatar = null;

    // 7. Supreme Ultimate (`AMAKAKERU: SHOGUNATE REALM SLICE`) state
    this._trueUltInit = false;
    this._trueUltStep = 0;
    this._trueUltCutsDone = 0;
    this._trueUltTargetX = 600;
    this._trueUltDashDir = 1;
    this._trueUltStartX = 300;
    this._trueUltBackX = 750;
    this.raijinEyeSeal = null;
    this.trueUltLightningSurge = null;

    this.fx = new ArcaneShaderFX(STORM_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      const roninAssets = PixelForge.initAssets()?.ronin;
      if (roninAssets?.sheet?.src && !roninAssets.sheet.src.includes('v=30fps97')) {
        roninAssets.sheet.src = 'assets/sprites/ronin_sheet.png?v=30fps97';
      }
      if (roninAssets?.vfx?.src && !roninAssets.vfx.src.includes('v=30fps63')) {
        roninAssets.vfx.src = 'assets/sprites/ronin_vfx.png?v=30fps97';
      }
    }
  }

  setState(newState) {
    if (
      this.state === 'AUTO_ATTACK' &&
      newState !== 'AUTO_ATTACK' &&
      newState !== 'JUMP' &&
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.y = this.groundY;
    }
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
      this._trueUltDashDir = this.facing || 1;
      this._trueUltStartX = this.x;
      this._trueUltBackX = this.x;
      this.raijinEyeSeal = null;
      this.trueUltLightningSurge = null;
      this.trueUltFrameOverride = 214;
    } else {
      this._trueUltInit = false;
      if (newState !== 'AUTO_ATTACK' && newState !== 'ULTIMATE') {
        this.trueUltFrameOverride = null;
      }
      this.raijinEyeSeal = null;
      this.cameraAirLift = 0;
      this.unstoppablePoise = false;
    }
    if (newState === 'AUTO_ATTACK') {
      this._autoVariant = (((this.comboStep || 0) % 4) + 4) % 4;
      this.comboStep = (this._autoVariant + 1) % 4;
      this.trueUltFrameOverride = AUTO_SLICES_4[this._autoVariant][0];
      this._drewAutoGlint = false;
    }
    if (newState === 'DEATH') {
      this.fx?.clear();
      this.cleanBladeCuts = [];
      this.trueUltLightningSurge = null;
      this.trueUltFrameOverride = null;
    }
  }

  getEffectiveAttackRange() {
    const nextVar = (((this.comboStep || 0) % 4) + 4) % 4;
    return nextVar === 3 ? 124 : nextVar === 2 ? 118 : this.attackRange;
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
      this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 0.92 && this.stateTimer < 1.28;
    if (isSkillDive || isUltDive || isTrueUltBlitz) {
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

    // 4. Update Clean Katana Blade Traces & Flesh-Cut Wound Slashes
    for (let i = this.cleanBladeCuts.length - 1; i >= 0; i--) {
      this.cleanBladeCuts[i].age += dt;
      if (this.cleanBladeCuts[i].age >= this.cleanBladeCuts[i].maxLife) {
        this.cleanBladeCuts.splice(i, 1);
      }
    }

    // 5. Update Full-Arena Supreme Ultimate Lightning Surge
    if (this.trueUltLightningSurge) {
      this.trueUltLightningSurge.age += dt;
      if (this.trueUltLightningSurge.age >= this.trueUltLightningSurge.maxLife) {
        this.trueUltLightningSurge = null;
      }
    }

    // 6. Legacy Delayed Judgment-Cut queue drain (kept empty on clean Auto-Attacks)
    for (let i = this.delayedJudgmentCuts.length - 1; i >= 0; i--) {
      const jc = this.delayedJudgmentCuts[i];
      jc.timer -= dt;
      if (jc.timer <= 0) {
        this.delayedJudgmentCuts.splice(i, 1);
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.divePitchRad = 0;
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
    const dur = this.autoDuration || 0.46;
    const mode = (((this._autoVariant ?? 0) % 4) + 4) % 4;
    const u = Math.min(0.999, Math.max(0, t / dur));
    const [sliceStart, sliceLen] = AUTO_SLICES_4[mode];
    this.trueUltFrameOverride = sliceStart + Math.min(sliceLen - 1, Math.floor(u * sliceLen));
    this.y = this.groundY;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const minX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
        ? game.adventure.lockMinX + 20
        : 65;
    const bossWallAlive = Boolean(
      game?.adventure?.bossEntity &&
        !game.adventure.bossEntity.isDead &&
        game.adventure.bossEntity.isColossalBoss
    );
    const rawMaxX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX - 20
        : ww - 65;
    const maxX = bossWallAlive
      ? Math.min(rawMaxX, (game.adventure.bossEntity.anchorX || 9335) - 85)
      : rawMaxX;

    const rawFoes = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    const foes = rawFoes.filter((f) => f && !f.isDead && !f.isBenched);
    const frontFoe =
      foes.find((f) => (f.x - this.x) * this.facing >= -20 && Math.abs(f.x - this.x) <= 195) ||
      (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 195 ? enemy : null);

    // Physical Fumikomi Step-In (0.00..0.22s): close directly into 68..74px body-to-body distance
    // so Kaze-Maru's +92px Thunder-Odachi sprite physically slices straight through enemy flesh!
    const manualPullBack =
      this.isPlayerControlled &&
      !this.adventureAutoPlay &&
      (this.manualMoveAxis || 0) * this.facing < -0.2;
    if (t < 0.22 && frontFoe && !manualPullBack) {
      const fDir = frontFoe.x >= this.x ? 1 : -1;
      this.facing = fDir;
      const idealDist = frontFoe.isColossalBoss ? 86 : mode === 3 ? 68 : 74;
      const curDist = Math.abs(frontFoe.x - this.x);
      if (curDist > idealDist) {
        const stepPx = Math.min(curDist - idealDist, 390 * dt);
        this.x = Math.max(minX, Math.min(maxX, this.x + fDir * stepPx));
      }
    }

    if (t >= 0.16 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('slash', this.x);

      const closeInFlesh = Boolean(frontFoe && Math.abs(frontFoe.x - this.x) <= 82);
      this.vx = this.facing * (closeInFlesh ? 56 : mode === 3 ? 185 : 155);

      // Shallow horizontal katana cut plane matching the 4 full-furikiri Row-2 animations (ZERO bloated VFX!)
      const cutSlope = mode === 0 ? -0.14 : mode === 1 ? 0.14 : mode === 2 ? -0.22 : 0.08;
      const cutCenterY = this.groundY - (mode === 3 ? 72 : 78);
      this.cleanBladeCuts.push({
        type: 'blade',
        x0: this.x + this.facing * 22,
        y0: cutCenterY - cutSlope * 36,
        x1: this.x + this.facing * 94,
        y1: cutCenterY + cutSlope * 36,
        age: 0,
        maxLife: 0.13
      });

      const baseDmgs = [48, 52, 58, 78];
      const critRates = [0.28, 0.30, 0.34, 0.38];
      const knockXs = [52, 58, 64, 92];
      const knockYs = [0, -75, -95, -120];
      const manaGains = [2.5, 2.6, 2.9, 3.4];

      let landed = false;
      for (const foe of foes) {
        const reachLim = foe.isColossalBoss ? 148 : 134;
        if ((foe.x - this.x) * this.facing >= -24 && Math.abs(foe.x - this.x) <= reachLim) {
          const isCrit = Math.random() < critRates[mode];
          const dmg = baseDmgs[mode] * (isCrit ? 1.32 : 1);
          foe.takeDamage(dmg, this, isCrit, knockXs[mode], knockYs[mode]);
          this.cleanBladeCuts.push({
            type: 'wound',
            x: foe.x,
            y: (foe.y || this.groundY) - 78,
            dir: this.facing,
            slope: cutSlope,
            isCrit,
            seed: (mode + 1) * 17 + Math.round(t * 100),
            age: 0,
            maxLife: 0.20
          });
          landed = true;
        }
      }
      if (landed) this.gainMana(manaGains[mode]);
    }

    if (t >= 0.44) {
      this.y = this.groundY;
      this._drewAutoGlint = false;
      this.trueUltFrameOverride = null;
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
    const ww = game?.renderer?.worldWidth || 1200;

    // Guarantee PixelForge.getFrameIndex honors trueUltFrameOverride (isCrouching/isFlipVault/isBlinkTeleport = false)
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.isBlinkTeleport = false;
    this.vx = 0;
    this.vy = 0;

    // Resolve active enemy target (supports 1v1, 3v3 tag & 9600px Adventure Mode)
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
      this._trueUltAfterimageAcc = 0;

      const rawEnemyX = focusEnemy
        ? focusEnemy.x
        : this.x + (this.facing || 1) * 280;
      const dashDir =
        Math.abs(rawEnemyX - this.x) > 4
          ? rawEnemyX >= this.x
            ? 1
            : -1
          : this.facing || 1;
      this._trueUltDashDir = dashDir;

      // Guarantee clear landing room on the BACK SIDE of the enemy (`backX = targetX + dashDir * 148`)
      const minTargetX = dashDir === 1 ? 195 : 235;
      const maxTargetX = dashDir === 1 ? ww - 235 : ww - 195;
      const initTargetX = Math.max(minTargetX, Math.min(maxTargetX, rawEnemyX));
      this._trueUltTargetX = initTargetX;

      // Guarantee Kaze-Maru starts strictly in front of `initTargetX` along `-dashDir`
      let startX = this.x;
      if ((initTargetX - startX) * dashDir < 110) {
        startX = Math.max(80, Math.min(ww - 80, initTargetX - dashDir * 145));
      }
      this._trueUltStartX = startX;
      this._trueUltBackX = Math.max(80, Math.min(ww - 80, initTargetX + dashDir * 148));
      this.x = startX;
      this.y = this.groundY;
      this.facing = dashDir;

      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
        game.audio.play('parry_clang', this.x);
      }
      if (game?.renderer) {
        game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.54);
        game.renderer.triggerShake(7, 0.20);
      }

      // Manifest Row 5 Raijin Thunder-Drum Eye Seal behind Kaze-Maru + Susanoo Wind-Gathering Domain
      this.raijinEyeSeal = {
        x: this.x - dashDir * 10,
        y: this.groundY - 108,
        age: 0,
        alpha: 1.0,
        floorLockAlpha: 0
      };
      this.amakakeruCleaves = [];

      this.spawnSayaGlint(false);
      this.spawnPixelShockwave(this.x, this.groundY - 4, 150, 'cyan', 0.34, true);
      this.fx.spawn('susanooStormDomain', this.x, this.groundY, {
        key: 'susanooStormDomain',
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        light: 1.34
      });

      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 160, '#38bdf8', 0.34, true);
        game.vfx.spawnDamageText(
          this.x,
          this.groundY - 168,
          0,
          true,
          '★ AMAKAKERU: SHOGUNATE REALM SLICE ★',
          '#38bdf8'
        );
      }
    }

    const dashDir = this._trueUltDashDir || 1;

    // Sustain dramatic Ult Dim through the Iaido charge, single back-side flash-cut & Noto resheath (`0.00s..2.15s`)
    if (game?.renderer && t < 2.65) {
      const dimTarget = t <= 1.95 ? 0.54 : 0.54 * Math.max(0, 1 - (t - 1.95) / 0.70);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    // Smoothly track target during Beat 1 charge (`t < 0.90s`) while preserving back-side landing room
    if (t < 0.90 && focusEnemy && !focusEnemy.isDead) {
      const minTargetX = dashDir === 1 ? 195 : 235;
      const maxTargetX = dashDir === 1 ? ww - 235 : ww - 195;
      const desiredX = Math.max(minTargetX, Math.min(maxTargetX, focusEnemy.x));
      this._trueUltTargetX += (desiredX - this._trueUltTargetX) * Math.min(1, dt * 9.0);
      // If enemy was pinned right against the far wall, storm-vacuum pulls them slightly inward so back-side dash has clear room!
      if ((focusEnemy.x - maxTargetX) * dashDir > 0 || (minTargetX - focusEnemy.x) * dashDir < 0) {
        if (focusEnemy.x > maxTargetX) focusEnemy.x -= Math.min(focusEnemy.x - maxTargetX, dt * 320);
        if (focusEnemy.x < minTargetX) focusEnemy.x += Math.min(minTargetX - focusEnemy.x, dt * 320);
      }
      if ((this._trueUltTargetX - this._trueUltStartX) * dashDir < 105) {
        this._trueUltStartX = Math.max(
          80,
          Math.min(ww - 80, this._trueUltTargetX - dashDir * 140)
        );
      }
      this._trueUltBackX = Math.max(
        80,
        Math.min(ww - 80, this._trueUltTargetX + dashDir * 148)
      );
    }

    const targetX = this._trueUltTargetX;
    const startX = this._trueUltStartX;
    const backSideX = this._trueUltBackX;

    // Step Row 5 Raijin Thunder-Drum Eye Seal
    if (this.raijinEyeSeal) {
      this.raijinEyeSeal.age += dt;
      this.raijinEyeSeal.x = this.x - this.facing * 10;
      this.raijinEyeSeal.y = this.y - 106;
      this.raijinEyeSeal.alpha =
        t < 2.25 ? Math.min(1, t / 0.20) : Math.max(0, 1 - (t - 2.25) / 0.55);
      this.raijinEyeSeal.floorLockAlpha =
        t >= 0.92 && t < 2.15
          ? Math.min(1, (t - 0.92) / 0.14) * (t <= 1.95 ? 1 : Math.max(0, 1 - (t - 1.95) / 0.20))
          : 0;
    }

    // Step Row 7 Amakakeru Heaven-Splitting Thunder Cleave
    for (let i = this.amakakeruCleaves.length - 1; i >= 0; i--) {
      const c = this.amakakeruCleaves[i];
      c.age += dt;
      if (c.age >= c.maxLife) {
        this.amakakeruCleaves.splice(i, 1);
      }
    }

    // Hold struck target frozen in time between the single Iaido slash (`1.04s`) and the Tsuba click (`1.95s`)
    if (t >= 1.04 && t < 1.95 && focusEnemy && !focusEnemy.isDead) {
      const drift = focusEnemy.x - targetX;
      if (Math.abs(drift) > 18) {
        focusEnemy.x -= Math.sign(drift) * Math.min(Math.abs(drift) - 18, dt * 420);
      }
      focusEnemy.vx = 0;
      focusEnemy.vy = Math.min(0, focusEnemy.vy || 0);
    }

    // =========================================================================
    // BEAT 1 (`0.00s .. 0.92s`): Grounded Iaido Battoujutsu Charge & Pose
    // =========================================================================
    if (t < 0.92) {
      this.x = startX;
      this.y = this.groundY;
      this.facing = dashDir;
      this.cameraAirLift = 0;
      this.divePitchRad = 0;
      // Row 7 F04..F08 = indices 214..218 (deep coiled grounded Iaido charge pose with Koiguchi sparks)
      this.trueUltFrameOverride = 214 + Math.min(4, Math.floor((t / 0.92) * 5));

      if (t >= 0.46 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        if (game?.audio) game.audio.play('parry_clang', this.x);
        this.spawnSayaGlint(true);
        this.spawnPixelShockwave(this.x, this.groundY - 4, 132, 'gold', 0.28, true);
      }
      return;
    }

    // =========================================================================
    // BEAT 2 (`0.92s .. 1.34s`): Single Supersonic Iaido Flash-Dash Through
    //                            Enemy onto Their Back Side (`1` Razor Slash!)
    // =========================================================================
    if (t < 1.34) {
      if (this._trueUltStep < 2) {
        this._trueUltStep = 2;
        if (game?.audio) {
          game.audio.play('blink', this.x);
          game.audio.play('dash_whoosh', this.x);
        }
        this.spawnAfterimage(startX, this.groundY, dashDir, 7, 8, 0.34);
        this.spawnPixelShockwave(startX, this.groundY - 4, 155, 'cyan', 0.28, true);
      }

      const dashSpan = 0.28; // `0.92s .. 1.20s` supersonic travel, `1.20s .. 1.34s` back-side skid hold
      const rawU = Math.min(1, Math.max(0, (t - 0.92) / dashSpan));
      const easeDash = 1 - Math.pow(1 - rawU, 3.0);

      this.x = startX + (backSideX - startX) * easeDash;
      this.y = this.groundY;
      // Moving in `dashDir` -> once past `targetX`, facing `dashDir` means facing AWAY from the enemy!
      this.facing = dashDir;
      this.divePitchRad = 0;
      this.cameraAirLift = 0;

      if (rawU < 0.55) {
        this.trueUltFrameOverride = rawU < 0.28 ? 132 : 133;
        this.syncSpearMachCone();
      } else if (rawU < 0.96) {
        this.fx?.stopByKey('shunpoSpearMachCone');
        this.trueUltFrameOverride = rawU < 0.72 ? 65 : rawU < 0.86 ? 66 : 67;
      } else {
        this.fx?.stopByKey('shunpoSpearMachCone');
        this.trueUltFrameOverride = 237;
      }

      if (rawU < 0.95) {
        this._trueUltAfterimageAcc += dt;
        if (this._trueUltAfterimageAcc >= 0.022) {
          this._trueUltAfterimageAcc = 0;
          this.spawnAfterimage(this.x, this.groundY, dashDir, 4, 12, 0.34);
        }
      }

      // Trigger ONE single razor-clean katana slash right as Kaze-Maru crosses `targetX`!
      if (this._trueUltCutsDone === 0 && rawU >= 0.42) {
        this._trueUltCutsDone = 1;
        // Ensure enemy sits cleanly at `targetX` so `backSideX` is strictly on their back side!
        if (focusEnemy && !focusEnemy.isDead && (backSideX - focusEnemy.x) * dashDir < 48) {
          focusEnemy.x = targetX;
        }

        // Single long diagonal-horizontal katana slash line across the enemy (held until Tsuba click at 1.95s)
        this.addSlashLine(
          targetX - dashDir * 245,
          this.groundY - 66,
          targetX + dashDir * 245,
          this.groundY - 122,
          1.05,
          false
        );
        this.spawnPixelLightningBolt(targetX, this.groundY - 260, this.groundY, 'cyan', 0.26);
        this.spawnPixelShockwave(targetX, this.groundY - 88, 145, 'cyan', 0.26, false);

        if (game?.audio) {
          game.audio.play('raijin_slash', targetX);
        }
        if (game?.renderer) {
          game.renderer.triggerShake(9, 0.14);
          game.renderer.triggerHitStop(0.045);
        }
        if (game?.vfx) {
          game.vfx.spawnDamageText(
            targetX,
            this.groundY - 158,
            0,
            true,
            'IAIDO FLASH-CUT!',
            '#67e8f9'
          );
        }

        let slashedAny = false;
        for (const foe of foes) {
          if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - targetX) < 235) {
            foe.takeDamage(foe === focusEnemy ? 120 : 95, this, true, 12, -18);
            foe.vx = 0;
            slashedAny = true;
          }
        }
        if (!slashedAny && focusEnemy && !focusEnemy.isDead) {
          focusEnemy.takeDamage(120, this, true, 12, -18);
          focusEnemy.vx = 0;
        }
      }
      return;
    }

    // =========================================================================
    // BEAT 3 (`1.34s .. 3.70s`): Zanshin Pause on Enemy's Back Side, Slow Noto
    //   Resheath -> t = 1.95s Tsuba Click -> WHOLE STAGE SLICES OPEN + FULL-ARENA
    //   LIGHTNING SURGE & Teleports into Unburned Moonlit Japanese Castle
    //   (`shogunate` w/ Raining Cherry Blossoms — or `shogunate_inferno` ONLY if
    //   Ignis Sol has ALREADY ignited the arena into `inferno`)!
    // =========================================================================
    if (this._trueUltStep < 3) {
      this._trueUltStep = 3;
      this.fx?.stopByKey('shunpoSpearMachCone');
      this.x = backSideX;
      this.y = this.groundY;
      this.facing = dashDir; // Facing AWAY from the enemy on their back side!
      this.divePitchRad = 0;
      this.cameraAirLift = 0;
      this.spawnPixelShockwave(this.x, this.groundY - 4, 96, 'cyan', 0.24, true);
    }

    if (t < 1.95) {
      // `1.34s .. 1.95s`: Slowly slide Thunder-Odachi into Saya scabbard (`237 -> 236 -> 210..214`)
      const uSheath = (t - 1.34) / 0.61;
      const sheathFrames = [237, 236, 210, 211, 212, 213, 214];
      this.trueUltFrameOverride =
        sheathFrames[Math.min(sheathFrames.length - 1, Math.floor(uSheath * sheathFrames.length))];
      this.x = backSideX;
      this.y = this.groundY;
      this.facing = dashDir;
      return;
    }

    // `t >= 1.95s`: TSUBA CLICKS SHUT -> WHOLE-STAGE DIAGONAL KATANA SLICE + FULL-ARENA LIGHTNING SURGE!
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this.x = backSideX;
      this.y = this.groundY;
      this.facing = dashDir;
      this.spawnSayaGlint(true);

      // First Ronin Ultimate vs Ignis Sol teleports to UNBURNED `shogunate` (with raining cherry blossoms!).
      // Only use `shogunate_inferno` if Ignis Sol has ALREADY burned the stage (`inferno` / `shogunate_inferno`);
      // if Sol casts Meteor AFTERward, `Renderer.setStageTransformation('inferno', 1.0, true)` automatically fuses it!
      const activeStageNow = game?.renderer?.getActiveStageId?.() || game?.renderer?.stageId || 'cathedral';
      const permStageNow = game?.renderer?.permanentStageOverride || '';
      const stageAlreadyBurning =
        activeStageNow === 'inferno' ||
        activeStageNow === 'shogunate_inferno' ||
        permStageNow === 'inferno' ||
        permStageNow === 'shogunate_inferno';
      const destStageKey = stageAlreadyBurning ? 'shogunate_inferno' : 'shogunate';

      if (game?.audio) {
        game.audio.play('parry_clang', this.x);
        game.audio.play('raijin_slash', targetX);
        game.audio.play('thunder_slam', targetX);
        game.audio.play('hit_crit', targetX);
      }
      if (game?.renderer) {
        game.renderer.setStageTransformation?.(destStageKey, 1.0, true);
        game.renderer.triggerDimensionalStageSlice?.({
          fromStageId: activeStageNow,
          toStageId: game.renderer.permanentStageOverride || destStageKey,
          focusX: targetX,
          focusY: this.groundY - 92,
          dir: dashDir,
          duration: 1.08
        });
        game.renderer.triggerImpactFrame?.(
          targetX,
          this.groundY - 92,
          0.14,
          stageAlreadyBurning ? 'inferno' : 'storm'
        );
        game.renderer.triggerShake(22, 0.38);
        game.renderer.triggerAberration(12);
        game.renderer.triggerHitStop(0.085);
      }

      // Detonate the katana slash line & unleash a FULL-ARENA HIGH-VOLTAGE LIGHTNING SURGE (ZERO middle crystal)!
      for (const line of this.activeSlashLines) {
        line.detonated = true;
      }
      this.triggerTrueUltLightningSurge(targetX, this.groundY, dashDir, ww, stageAlreadyBurning);

      const boltColor = stageAlreadyBurning ? 'gold' : 'cyan';
      this.spawnPixelShockwave(targetX, this.groundY - 6, 320, boltColor, 0.46, true);
      for (const offX of [-270, -90, 90, 270]) {
        const bx = Math.max(50, Math.min(ww - 50, targetX + offX));
        this.spawnPixelLightningBolt(
          bx,
          this.groundY - 480,
          this.groundY,
          offX % 180 === 0 ? boltColor : 'purple',
          0.46
        );
      }

      if (game?.vfx) {
        game.vfx.spawnShockwave(
          targetX,
          this.groundY - 6,
          320,
          stageAlreadyBurning ? '#fb923c' : '#38bdf8',
          0.48,
          true
        );
        game.vfx.spawnBurst(
          targetX,
          this.groundY - 76,
          36,
          stageAlreadyBurning ? '#fb923c' : '#67e8f9',
          365,
          { upBias: 205, size: 5 }
        );
        game.vfx.spawnDamageText(
          targetX,
          this.groundY - 198,
          0,
          true,
          stageAlreadyBurning ? '★ BURNING SHOGUNATE REALM SLICE! ★' : '★ SHOGUNATE REALM SLICE! ★',
          stageAlreadyBurning ? '#fb923c' : '#67e8f9'
        );
      }

      this.heal(Math.round(this.maxHp * 0.12), 'ZANSHIN RENEWAL');
      // Deal ONE massive 560 Supreme Crit (`120 + 560 = 680` total damage)!
      let hitFinisher = false;
      for (const foe of foes) {
        if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - targetX) < 265) {
          foe.takeDamage(foe === focusEnemy ? 560 : 425, this, true, 255 * dashDir, -285);
          hitFinisher = true;
        }
      }
      if (!hitFinisher && focusEnemy && !focusEnemy.isDead) {
        focusEnemy.takeDamage(560, this, true, 255 * dashDir, -285);
      }
    }

    if (t < 3.25) {
      // `1.95s .. 3.25s`: Motionless sheathed Zanshin hold facing away (`Row 7` `215..218`) as the stage halves split apart!
      const uHold = (t - 1.95) / 1.30;
      this.x = backSideX;
      this.y = this.groundY;
      this.facing = dashDir;
      this.trueUltFrameOverride = 215 + Math.min(3, Math.floor(uHold * 4));
      return;
    }

    // `3.25s .. 3.70s`: Smooth rise from sheathed Iaido crouch back to standing samurai guard (`Row 7` `235..239`)
    const uRise = Math.min(1, (t - 3.25) / 0.45);
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
      this.trueUltLightningSurge = null;
      if (focusEnemy && !focusEnemy.isDead && Math.abs(focusEnemy.x - this.x) > 8) {
        this.facing = focusEnemy.x >= this.x ? 1 : -1;
      }
      this.setState('IDLE');
    }
  }

  triggerTrueUltLightningSurge(focusX, groundY, dir = 1, worldWidth = 1200, isInferno = false) {
    this.trueUltLightningSurge = {
      focusX,
      groundY,
      dir: dir >= 0 ? 1 : -1,
      worldWidth: worldWidth || 1200,
      isInferno: Boolean(isInferno),
      age: 0,
      maxLife: 1.18
    };
  }

  /**
   * 3-Pass HD-2D Additive Bloom Renderer for Kaze-Maru's 208x208 VFX Sheet (`assets/sprites/ronin_vfx.png`).
   * Zero canvas rotation (`ctx.rotate` strictly forbidden).
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
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const glowSprite =
      glowColor === 'gold'
        ? renderer?.glowGold || renderer?.glowCyan
        : glowColor === 'purple'
          ? renderer?.glowViolet || renderer?.glowPurple || renderer?.glowCyan
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

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Minimal Cold-Steel Katana Blade Trace & Flesh-Cut Wound Slash Renderer (`this.cleanBladeCuts`).
   * Zero bloated energy crescents, zero canvas rotation (`0` `ctx.rotate`, `0` `quadraticCurveTo`).
   */
  drawCleanBladeCutsWorld(ctx) {
    if (!this.cleanBladeCuts || this.cleanBladeCuts.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    for (const c of this.cleanBladeCuts) {
      const u = Math.min(1, Math.max(0, c.age / Math.max(0.01, c.maxLife)));
      const fade = 1 - u;
      if (fade <= 0.02) continue;

      if (c.type === 'blade') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.52;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(Math.round(c.x0), Math.round(c.y0));
        ctx.lineTo(Math.round(c.x1), Math.round(c.y1));
        ctx.stroke();

        ctx.globalAlpha = fade * 0.92;
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.round(c.x0), Math.round(c.y0));
        ctx.lineTo(Math.round(c.x1), Math.round(c.y1));
        ctx.stroke();
      } else if (c.type === 'wound') {
        const span = (c.isCrit ? 32 : 25) * (0.65 + 0.35 * Math.min(1, u * 3.2));
        const dx = c.dir * span;
        const dy = span * (c.slope || -0.14);
        const x0 = Math.round(c.x - dx);
        const y0 = Math.round(c.y - dy);
        const x1 = Math.round(c.x + dx);
        const y1 = Math.round(c.y + dy);

        // Clean crimson flesh-cut gash + razor cold-steel core
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.94;
        ctx.strokeStyle = '#9f1239';
        ctx.lineWidth = c.isCrit ? 5 : 4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.round(c.x - dx * 0.72), Math.round(c.y - dy * 0.72));
        ctx.lineTo(Math.round(c.x + dx * 0.72), Math.round(c.y + dy * 0.72));
        ctx.stroke();

        // 6 directional pixel blood/steel droplets spraying along the cut exit vector
        for (let k = 0; k < 6; k++) {
          const spd = 72 + ((c.seed + k * 23) % 88);
          const spreadY = ((k % 3) - 1) * 24 + (c.slope || 0) * 65;
          const sx = Math.round((c.x + c.dir * (10 + u * spd) + (k - 2.5) * 4) / 2) * 2;
          const sy = Math.round((c.y + u * spreadY + u * u * 38) / 2) * 2;
          ctx.fillStyle = k % 3 === 0 ? '#ffffff' : k % 2 === 0 ? '#e11d48' : '#fda4af';
          const sz = k === 0 ? 4 : 3;
          ctx.fillRect(sx, sy, sz, sz - (k % 2));
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Full-Arena High-Voltage Lightning Surge (`this.trueUltLightningSurge`) for `AMAKAKERU: SHOGUNATE REALM SLICE`.
   * Electrifies sky, stage, floor, and enemy with branching jagged polylines (`0` crystal shapes, `0` `ctx.rotate`, `0` `quadraticCurveTo`).
   */
  drawLightningSurgeWorld(ctx, renderer = null) {
    const surge = this.trueUltLightningSurge;
    if (!surge) return;
    const u = Math.min(1, Math.max(0, surge.age / Math.max(0.05, surge.maxLife)));
    const fade = u < 0.14 ? 1.0 : Math.pow(1 - (u - 0.14) / 0.86, 1.25);
    if (fade <= 0.015) return;

    const fx = surge.focusX;
    const gy = surge.groundY;
    const isInf = surge.isInferno;
    const outerCol = isInf ? '#ea580c' : '#4f46e5';
    const midCol = isInf ? '#fb923c' : '#38bdf8';
    const hiCol = isInf ? '#fef08a' : '#a5f3fc';
    const glowTex = isInf ? renderer?.glowOrange || renderer?.glowGold : renderer?.glowCyan;
    const tick = Math.floor(surge.age * 24);

    const hashSigned = (n) => {
      const s = Math.sin(n * 127.1 + tick * 311.7) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };

    const strokeJaggedBolt = (x0, y0, x1, y1, segs, jitterAmp, wOuter, wMid, wCore, seedBase, alphaScale = 1) => {
      const pts = [[Math.round(x0), Math.round(y0)]];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      for (let s = 1; s < segs; s++) {
        const f = s / segs;
        const env = Math.sin(f * Math.PI);
        const off = hashSigned(seedBase + s * 13.7) * jitterAmp * (0.45 + 0.55 * env);
        pts.push([
          Math.round((x0 + dx * f + nx * off) / 2) * 2,
          Math.round((y0 + dy * f + ny * off) / 2) * 2
        ]);
      }
      pts.push([Math.round(x1), Math.round(y1)]);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.75, fade * 0.58 * alphaScale);
      ctx.strokeStyle = outerCol;
      ctx.lineWidth = wOuter;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]);
      ctx.stroke();

      ctx.globalAlpha = Math.min(0.92, fade * 0.84 * alphaScale);
      ctx.strokeStyle = midCol;
      ctx.lineWidth = wMid;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]);
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, fade * 0.96 * alphaScale);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = wCore;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]);
      ctx.stroke();

      return pts;
    };

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    // 0. Brief Ionized Electric Surge Wash across the viewport (strictly <= 0.15 alpha so silhouettes pop!)
    if (u < 0.24) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - u / 0.24) * 0.14;
      ctx.fillStyle = midCol;
      ctx.fillRect(fx - 900, gy - 680, 1800, 860);
    }

    // 1. 9 Full-Arena Sky-to-Earth Branching Thunderbolts across `fx - 560 .. fx + 560`
    const skyOffsets = [-540, -405, -270, -135, 0, 135, 270, 405, 540];
    for (let b = 0; b < skyOffsets.length; b++) {
      const stagger = (b % 3) * 0.05;
      if (u < stagger) continue;
      const isCenter = skyOffsets[b] === 0;
      const bxTop = fx + skyOffsets[b] + hashSigned(b * 19 + 3) * 34;
      const bxBot = fx + skyOffsets[b] + hashSigned(b * 31 + 7) * 26;
      const byTop = gy - 580;
      const byBot = gy + ((b % 3) - 1) * 10;
      const spine = strokeJaggedBolt(
        bxTop,
        byTop,
        bxBot,
        byBot,
        12,
        isCenter ? 38 : 30,
        isCenter ? 9 : 6,
        isCenter ? 4.5 : 3,
        isCenter ? 2.2 : 1.5,
        100 + b * 41,
        isCenter ? 1.0 : 0.88
      );

      // Two forked lightning branches splitting outward off each sky bolt
      const forkA = spine[4] || [bxTop, gy - 360];
      const forkB = spine[8] || [bxBot, gy - 180];
      const sideA = b % 2 === 0 ? -1 : 1;
      strokeJaggedBolt(
        forkA[0],
        forkA[1],
        forkA[0] + sideA * (64 + (b % 3) * 22),
        forkA[1] + 96,
        5,
        14,
        3.5,
        2.0,
        1.0,
        500 + b * 29,
        0.78
      );
      strokeJaggedBolt(
        forkB[0],
        forkB[1],
        forkB[0] - sideA * (54 + (b % 2) * 24),
        forkB[1] + 84,
        4,
        12,
        3.0,
        1.8,
        1.0,
        700 + b * 37,
        0.74
      );

      // Ground-strike pixel cross spark at courtyard impact
      if (glowTex && b % 2 === 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.20, fade * 0.18);
        ctx.drawImage(glowTex, bxBot - 36, byBot - 22, 72, 44);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.92;
      ctx.fillStyle = hiCol;
      ctx.fillRect(Math.round(bxBot) - 14, Math.round(byBot) - 2, 28, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(bxBot) - 6, Math.round(byBot) - 6, 12, 12);
    }

    // 2. 6 Arena-Wide Horizontal & Diagonal Surge Webs racing through the air (`fx - 640 .. fx + 640`)
    const webHeights = [-410, -305, -210, -125, -68, -26];
    for (let w = 0; w < webHeights.length; w++) {
      const reach = (260 + u * 440) * (0.85 + (w % 2) * 0.18);
      const wy0 = gy + webHeights[w] + hashSigned(900 + w * 17) * 24;
      const wy1 = gy + webHeights[w] - surge.dir * (w % 2 === 0 ? 46 : -38);
      strokeJaggedBolt(
        fx - reach,
        wy0,
        fx + reach,
        wy1,
        14,
        26,
        5.5,
        2.6,
        1.3,
        1100 + w * 53,
        0.84
      );
    }

    // 3. 14 Crawling Courtyard Ground-Current Lightning Veins skittering outward across the floor
    for (let g = 0; g < 14; g++) {
      const gDir = g % 2 === 0 ? 1 : -1;
      const lane = Math.floor(g / 2);
      const startX = fx + gDir * (14 + lane * 26);
      const endX = startX + gDir * (130 + lane * 68) * (0.45 + 0.55 * Math.min(1, u * 2.2));
      const gy0 = gy - 8 + ((g * 7) % 30);
      const gy1 = gy - 6 + (((g + 3) * 11) % 32);
      strokeJaggedBolt(startX, gy0, endX, gy1, 6, 11, 4.0, 2.0, 1.0, 1600 + g * 23, 0.80);
    }

    // 4. 8 High-Voltage Enemy Body-Overload Chains crackling directly through `focusX` (zero crystals!)
    for (let e = 0; e < 8; e++) {
      const ang = (e / 8) * Math.PI * 2 + tick * 0.35;
      const rIn = 10 + (e % 2) * 8;
      const rOut = 74 + (e % 3) * 28;
      const cy = gy - 88;
      strokeJaggedBolt(
        fx + Math.cos(ang) * rIn,
        cy + Math.sin(ang) * rIn * 0.85,
        fx + Math.cos(ang + 0.45) * rOut,
        cy + Math.sin(ang + 0.45) * rOut * 0.85,
        5,
        15,
        5.0,
        2.5,
        1.3,
        2100 + e * 31,
        0.92
      );
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
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
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
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
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
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

    // 0. Render Cold-Steel Katana Blade Traces & Flesh-Cut Wound Slashes + Full-Arena Lightning Surge!
    this.drawCleanBladeCutsWorld(ctx);
    this.drawLightningSurgeWorld(ctx, renderer);

    // 1. Render Foreground Row-3 Raijin Halo Crest & Row-4 Slash Ring (Skill / Overdrive / Counter) IN FRONT of characters!
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

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
