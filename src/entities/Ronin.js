import { Fighter } from './Fighter.js?v=30fps96';
import { PixelForge } from '../engine/PixelForge.js?v=30fps96';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps96';
import { STORM_EFFECT_REGISTRY } from '../engine/shaders/stormShaders.js?v=30fps96';

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

    // 6. Supreme Ultimate (`AMAKAKERU: SHOGUNATE REALM SLICE`) state
    this._trueUltInit = false;
    this._trueUltStep = 0;
    this._trueUltCutsDone = 0;
    this._trueUltTargetX = 600;
    this._trueUltDashDir = 1;
    this._trueUltStartX = 300;
    this._trueUltBackX = 750;
    this.raijinEyeSeal = null;
    this.amakakeruCleaves = [];

    this.fx = new ArcaneShaderFX(STORM_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      const roninAssets = PixelForge.initAssets()?.ronin;
      if (roninAssets?.sheet?.src && !roninAssets.sheet.src.includes('v=30fps96')) {
        roninAssets.sheet.src = 'assets/sprites/ronin_sheet.png?v=30fps96';
      }
      if (roninAssets?.vfx?.src && !roninAssets.vfx.src.includes('v=30fps63')) {
        roninAssets.vfx.src = 'assets/sprites/ronin_vfx.png?v=30fps96';
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
      this.amakakeruCleaves = [];
      this.trueUltFrameOverride = 214;
    } else {
      this._trueUltInit = false;
      if (newState !== 'AUTO_ATTACK' && newState !== 'ULTIMATE') {
        this.trueUltFrameOverride = null;
      }
      this.raijinEyeSeal = null;
      this.amakakeruCleaves = [];
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
      this.trueUltFrameOverride = null;
    }
  }

  getEffectiveAttackRange() {
    const nextVar = (((this.comboStep || 0) % 4) + 4) % 4;
    return nextVar === 3 ? 215 : nextVar === 2 ? 196 : this.attackRange;
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
          t.takeDamage(jc.dmg || 38, this, true, 95, -145);
        }
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

    if ((mode === 0 || mode === 3) && t >= 0.04 && !this._drewAutoGlint) {
      this._drewAutoGlint = true;
      this.spawnSayaGlint(false);
    }

    // V2 (Raijin Jōdan Helm-Splitter): Subtle 14px athletic thunder-hop during 0.08..0.36s
    if (mode === 2 && t >= 0.08 && t <= 0.36) {
      const hopU = (t - 0.08) / 0.28;
      this.y = this.groundY - Math.sin(hopU * Math.PI) * 14;
      this.vy = 0;
    } else {
      this.y = this.groundY;
    }

    if (t >= 0.17 && !this.didActionFrame) {
      this.didActionFrame = true;
      const rawFoes = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      const foes = rawFoes.filter((f) => f && !f.isDead && !f.isBenched);
      const frontFoe =
        foes.find((f) => (f.x - this.x) * this.facing >= -16 && Math.abs(f.x - this.x) <= 222) ||
        (enemy && !enemy.isDead ? enemy : foes[0] || null);

      if (mode === 0) {
        // V0 (60..67): Battōjutsu Quick-Draw Rising Slash (cyan electric arc)
        this.vx = this.facing * 255;
        if (game?.audio) game.audio.play('slash', this.x);
        this.spawnVfxAnim(0, this.x + this.facing * 44, this.groundY - 82, 196, 196, 0.28, {
          vx: this.facing * 260,
          flipX: this.facing < 0,
          glowColor: 'cyan'
        });
        this.spawnPixelShockwave(
          this.x + this.facing * 38,
          this.groundY - 80,
          98,
          'cyan',
          0.24,
          false
        );
        this.addSlashLine(
          this.x + this.facing * 16,
          this.groundY - 42,
          this.x + this.facing * 146,
          this.groundY - 118,
          0.26
        );

        let landed = false;
        for (const foe of foes) {
          if (Math.abs(foe.x - this.x) <= this.attackRange + 30) {
            const isCrit = Math.random() < 0.28;
            const dmg = 46 * (isCrit ? 1.32 : 1);
            foe.takeDamage(dmg, this, isCrit, 75, 0);
            landed = true;
          }
        }
        if (landed) this.gainMana(2.4);
      } else if (mode === 1) {
        // V1 (68..74): Reverse Kesagiri Storm Whip (violet cross-body storm cleave + slash ring)
        this.vx = this.facing * 270;
        if (game?.audio) game.audio.play('slash', this.x);
        this.spawnVfxAnim(0, this.x + this.facing * 48, this.groundY - 84, 200, 200, 0.28, {
          vx: this.facing * 275,
          flipX: this.facing < 0,
          glowColor: 'purple'
        });
        this.spawnVfxAnim(4, this.x + this.facing * 64, this.groundY - 82, 186, 186, 0.26, {
          flipX: this.facing < 0,
          glowColor: 'purple'
        });
        this.spawnPixelShockwave(
          this.x + this.facing * 44,
          this.groundY - 82,
          104,
          'purple',
          0.25,
          false
        );
        this.addSlashLine(
          this.x + this.facing * 18,
          this.groundY - 122,
          this.x + this.facing * 150,
          this.groundY - 46,
          0.27
        );
        this.addSlashLine(
          this.x + this.facing * 24,
          this.groundY - 58,
          this.x + this.facing * 144,
          this.groundY - 110,
          0.24
        );

        let landed = false;
        for (const foe of foes) {
          if (Math.abs(foe.x - this.x) <= this.attackRange + 32) {
            const isCrit = Math.random() < 0.30;
            const dmg = 50 * (isCrit ? 1.32 : 1);
            foe.takeDamage(dmg, this, isCrit, 85, -135);
            landed = true;
          }
        }
        if (landed) this.gainMana(2.5);
      } else if (mode === 2) {
        // V2 (75..82): Raijin Jōdan Helm-Splitter (vertical thunderbolt + grounded Judgment Pillar)
        this.vx = this.facing * 245;
        const strikeX =
          frontFoe && Math.abs(frontFoe.x - this.x) <= 214
            ? frontFoe.x
            : this.x + this.facing * 92;
        if (game?.audio) {
          game.audio.play('raijin_slash', strikeX);
          game.audio.play('slash', this.x);
        }
        this.spawnPixelLightningBolt(strikeX, this.groundY - 228, this.groundY, 'cyan', 0.30);
        this.spawnVfxAnim(2, strikeX, this.groundY - 94, 204, 204, 0.38, {
          startFrame: 12,
          endFrame: 27,
          glowColor: 'cyan'
        });
        this.spawnPixelShockwave(strikeX, this.groundY - 78, 108, 'cyan', 0.26, false);
        this.addSlashLine(
          strikeX - this.facing * 14,
          this.groundY - 156,
          strikeX + this.facing * 18,
          this.groundY - 16,
          0.30
        );

        let landed = false;
        for (const foe of foes) {
          if (Math.abs(foe.x - this.x) <= this.attackRange + 38) {
            const isCrit = Math.random() < 0.35;
            const dmg = 54 * (isCrit ? 1.32 : 1);
            foe.takeDamage(dmg, this, isCrit, 92, -150);
            if (isCrit) {
              game?.vfx?.spawnDamageText?.(
                foe.x,
                foe.y - 150,
                0,
                true,
                'RAIJIN HELM-SPLITTER!',
                '#67e8f9'
              );
            }
            landed = true;
          }
        }
        if (landed) this.gainMana(2.8);
      } else {
        // V3 (83..89): Iaido Flash-Through Thrust & Delayed Judgment Cut!
        const oldX = this.x;
        const ww = game?.renderer ? game.renderer.worldWidth : 1200;
        const minX =
          game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
            ? game.adventure.lockMinX + 24
            : 85;
        const maxX =
          game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
            ? game.adventure.lockMaxX - 24
            : ww - 85;

        this.spawnAfterimage(oldX, this.groundY, this.facing, 2, 24, 0.30);

        if (frontFoe && !frontFoe.isDead && Math.abs(frontFoe.x - this.x) <= 218) {
          const newX = Math.max(minX, Math.min(maxX, frontFoe.x + this.facing * 94));
          this.spawnAfterimage((oldX + newX) * 0.5, this.groundY, this.facing, 3, 10, 0.28);
          this.x = newX;
          this.facing = frontFoe.x >= this.x ? 1 : -1;
          this.addSlashLine(oldX, this.groundY - 76, newX, this.groundY - 76, 0.38);
          this.spawnVfxAnim(0, (oldX + newX) * 0.5, this.groundY - 80, 208, 208, 0.30, {
            flipX: newX < oldX,
            glowColor: 'cyan'
          });
          this.spawnPixelShockwave(frontFoe.x, frontFoe.y - 78, 112, 'cyan', 0.26, false);

          if (game?.audio) {
            game.audio.play('dash_whoosh', this.x);
            game.audio.play('slash', frontFoe.x);
          }
          game?.vfx?.spawnDamageText(
            this.x,
            this.groundY - 148,
            0,
            true,
            'IAIDO FLASH-THROUGH!',
            '#38bdf8'
          );

          const corridorMin = Math.min(oldX, newX) - 36;
          const corridorMax = Math.max(oldX, newX) + 36;
          for (const foe of foes) {
            if (foe === frontFoe || (foe.x >= corridorMin && foe.x <= corridorMax)) {
              foe.takeDamage(52, this, true, 35, -125);
            }
          }
          this.gainMana(3.4);

          this.delayedJudgmentCuts.push({
            target: frontFoe,
            timer: 0.24,
            dmg: 36
          });
        } else {
          this.x = Math.max(minX, Math.min(maxX, this.x + this.facing * 145));
          this.addSlashLine(oldX, this.groundY - 76, this.x, this.groundY - 76, 0.28);
          this.spawnVfxAnim(0, this.x + this.facing * 32, this.groundY - 78, 196, 196, 0.28, {
            vx: this.facing * 240,
            flipX: this.facing < 0,
            glowColor: 'cyan'
          });
          if (game?.audio) game.audio.play('slash', this.x);
        }
      }
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
        this.spawnVfxAnim(6, targetX, this.groundY - 92, 236, 236, 0.92, {
          flipX: dashDir < 0,
          glowColor: 'cyan',
          inFront: true
        });
        this.spawnPixelShockwave(targetX, this.groundY - 88, 145, 'cyan', 0.28, false);

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
    //   Resheath -> t = 1.95s Tsuba Click -> WHOLE STAGE SLICES OPEN & Teleports
    //   into Feudal Japanese Castle (`shogunate`) or Burning Japanese Stage
    //   (`shogunate_inferno` when fighting Ignis Sol / Inferno)!
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

    // `t >= 1.95s`: TSUBA CLICKS SHUT -> WHOLE-STAGE DIAGONAL KATANA SLICE & REALM TELEPORT!
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this.x = backSideX;
      this.y = this.groundY;
      this.facing = dashDir;
      this.spawnSayaGlint(true);

      // Detect Ignis Sol (`heroId === 'mage'` / `FireMage`) or active Inferno stage for Burning Japanese Stage synergy!
      const activeStageNow = game?.renderer?.getActiveStageId?.() || game?.renderer?.stageId || 'cathedral';
      const permStageNow = game?.renderer?.permanentStageOverride || '';
      const vsIgnisSol =
        foes.some((f) => f && (f.heroId === 'mage' || f.constructor?.name === 'FireMage')) ||
        Boolean(enemy && (enemy.heroId === 'mage' || enemy.constructor?.name === 'FireMage')) ||
        activeStageNow === 'inferno' ||
        activeStageNow === 'shogunate_inferno' ||
        permStageNow === 'inferno' ||
        permStageNow === 'shogunate_inferno';
      const destStageKey = vsIgnisSol ? 'shogunate_inferno' : 'shogunate';

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
          vsIgnisSol ? 'inferno' : 'storm'
        );
        game.renderer.triggerShake(22, 0.38);
        game.renderer.triggerAberration(12);
        game.renderer.triggerHitStop(0.085);
      }

      // Detonate the single katana slash line across the target + erupt ONE majestic Amakakeru cleave!
      for (const line of this.activeSlashLines) {
        line.detonated = true;
      }
      this.amakakeruCleaves.push({
        x: targetX,
        groundY: this.groundY,
        w: 312,
        h: 528,
        age: 0,
        maxLife: 0.96,
        glowColor: vsIgnisSol ? 'gold' : 'cyan',
        inFront: true
      });

      this.spawnPixelShockwave(
        targetX,
        this.groundY - 6,
        310,
        vsIgnisSol ? 'gold' : 'cyan',
        0.48,
        true
      );
      this.spawnPixelLightningBolt(
        targetX,
        this.groundY - 460,
        this.groundY,
        vsIgnisSol ? 'gold' : 'cyan',
        0.46
      );
      this.spawnVfxAnim(4, targetX, this.groundY - 96, 256, 256, 0.44, {
        glowColor: vsIgnisSol ? 'gold' : 'cyan',
        inFront: true
      });

      if (game?.vfx) {
        game.vfx.spawnShockwave(
          targetX,
          this.groundY - 6,
          320,
          vsIgnisSol ? '#fb923c' : '#38bdf8',
          0.48,
          true
        );
        game.vfx.spawnBurst(
          targetX,
          this.groundY - 76,
          34,
          vsIgnisSol ? '#fb923c' : '#fda4af',
          345,
          { upBias: 195, size: 6 }
        );
        game.vfx.spawnDamageText(
          targetX,
          this.groundY - 198,
          0,
          true,
          vsIgnisSol ? '★ BURNING SHOGUNATE REALM SLICE! ★' : '★ SHOGUNATE REALM SLICE! ★',
          vsIgnisSol ? '#fb923c' : '#fda4af'
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
      this.amakakeruCleaves = [];
      if (focusEnemy && !focusEnemy.isDead && Math.abs(focusEnemy.x - this.x) > 8) {
        this.facing = focusEnemy.x >= this.x ? 1 : -1;
      }
      this.setState('IDLE');
    }
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

    this.drawAmakakeruCleavesLayer(ctx, vfxSheet, renderer, true);

    // 1. Render Foreground Row-3 Raijin Halo Crest, Row-4 Slash Ring & Row-6 Single Iaido Cut IN FRONT of characters!
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
