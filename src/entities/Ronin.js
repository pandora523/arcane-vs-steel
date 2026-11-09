import { Fighter } from './Fighter.js?v=30fps33';
import { PixelForge } from '../engine/PixelForge.js?v=30fps33';

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
    // 2. Active Persistent Judgment-Cut Slash Lines (rendered as stepped 4x4 pixel-art lightning beams)
    this.activeSlashLines = [];
    // 3. Queued Delayed Judgment-Cut Sheath Detonations
    this.delayedJudgmentCuts = [];
    // 4. Iaido Serene Mind Counter-Blink state
    this.iaidoCounterActive = false;
    // 5. Active 30fps HD-2D VFX sheet animations (Row 0..4 of assets/sprites/ronin_vfx.png)
    this.activeVfxAnims = [];
    // 6. Pure 4x4 Pixel-Art Raijin Shockwave Rings & Sky-Splitting Pixel Lightning Bolts (zero smooth vector arcs!)
    this.activePixelShockwaves = [];
    this.activeLightningBolts = [];
    this._ultTargetX = 600;
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'CROUCH') {
      this.iaidoCounterActive = false;
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
    this.activePixelShockwaves.push({
      x,
      y,
      maxR,
      colorType,
      age: 0,
      maxLife,
      isGround
    });
  }

  spawnPixelLightningBolt(x, topY, botY, colorType = 'cyan', maxLife = 0.34) {
    this.activeLightningBolts.push({
      x,
      topY,
      botY,
      colorType,
      age: 0,
      maxLife,
      seed: Math.floor(Math.random() * 1000)
    });
  }

  addSlashLine(x1, y1, x2, y2, maxLife = 0.65) {
    this.activeSlashLines.push({
      x1,
      y1,
      x2,
      y2,
      age: 0,
      maxLife,
      detonated: false,
      seed: Math.floor(Math.random() * 1000)
    });
  }

  triggerIaidoCounterBlink(attacker, game) {
    if (!attacker || attacker.isDead) return;
    this.iaidoCounterActive = false;
    this.isDeflecting = false;
    const oldX = this.x;
    this.spawnAfterimage(oldX, this.y, this.facing, 7, 10, 0.34);

    // Teleport directly BEHIND the attacker's back!
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const behindDir = attacker.facing || -this.facing;
    this.x = Math.max(85, Math.min(ww - 85, attacker.x - behindDir * 86));
    this.y = this.groundY;
    this.facing = attacker.x >= this.x ? 1 : -1;
    this.spawnAfterimage((oldX + this.x) * 0.5, this.y - 12, this.facing, 6, 12, 0.28);

    // Add X-shaped Judgment Cut slash lines + Row-3 Raijin Ring + Row-1 Cross-Slash seal across attacker
    this.addSlashLine(attacker.x - 62, attacker.y - 138, attacker.x + 62, attacker.y - 22, 0.42);
    this.addSlashLine(attacker.x - 62, attacker.y - 22, attacker.x + 62, attacker.y - 138, 0.42);
    this.spawnVfxAnim(3, attacker.x, attacker.y - 78, 216, 216, 0.42, { glowColor: 'cyan' });
    this.spawnVfxAnim(1, attacker.x, attacker.groundY - 92, 208, 208, 0.44, {
      startFrame: 18,
      endFrame: 29,
      glowColor: 'purple'
    });
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

    // 3b. Update Pure 4x4 Pixel-Art Shockwave Rings & Sky Lightning Bolts
    for (let i = this.activePixelShockwaves.length - 1; i >= 0; i--) {
      this.activePixelShockwaves[i].age += dt;
      if (this.activePixelShockwaves[i].age >= this.activePixelShockwaves[i].maxLife) {
        this.activePixelShockwaves.splice(i, 1);
      }
    }
    for (let i = this.activeLightningBolts.length - 1; i >= 0; i--) {
      this.activeLightningBolts[i].age += dt;
      if (this.activeLightningBolts[i].age >= this.activeLightningBolts[i].maxLife) {
        this.activeLightningBolts.splice(i, 1);
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
          this.addSlashLine(t.x - 56, t.y - 134, t.x + 56, t.y - 26, 0.34);
          this.addSlashLine(t.x - 56, t.y - 26, t.x + 56, t.y - 134, 0.34);
          this.spawnVfxAnim(2, t.x, t.groundY - 94, 208, 208, 0.44, {
            startFrame: 18,
            endFrame: 29,
            glowColor: 'cyan'
          });
          this.spawnVfxAnim(3, t.x, t.y - 78, 188, 188, 0.34, { glowColor: 'purple' });
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
      // Subtle smooth forward Suriashi/Hayagake dash lean
      this.divePitchRad = 0.05;
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.24) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
        game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 4, '#38bdf8', 65, {
          upBias: 28,
          size: 4,
          life: 0.28,
          additive: true
        });
      }
    } else if (this.state === 'IDLE') {
      this.divePitchRad *= Math.pow(0.001, dt);
    }

    super.update(dt, enemy, game);
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
      const oldX = this.x;
      const ww = game.renderer.worldWidth;
      this.spawnAfterimage(oldX, this.y, this.facing, 7, 14, 0.28);
      this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 165));
      this.addSlashLine(oldX, this.y - 68, this.x, this.y - 68, 0.32);
      this.spawnVfxAnim(0, this.x + this.facing * 32, this.y - 74, 196, 196, 0.30, {
        vx: this.facing * 240,
        flipX: this.facing < 0,
        glowColor: 'cyan'
      });
      this.spawnPixelShockwave(this.x, this.y - 72, 108, 'cyan', 0.26, false);
      if (game.audio) game.audio.play('slash', this.x);
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
    const ww = game.renderer.worldWidth;
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
        if (game.audio) game.audio.play('slash', this.x);
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
        if (game.audio) game.audio.play('slash', this.x);
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
    if (t >= 0.18 && !this.didActionFrame) {
      this.didActionFrame = true;
      const step = this.comboStep;
      this.comboStep = (this.comboStep + 1) % 3;

      if (step < 2) {
        this.vx = this.facing * 255;
        if (game.audio) game.audio.play('slash', this.x);
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
        const ww = game.renderer.worldWidth;
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

          if (game.audio) {
            game.audio.play('dash_whoosh', this.x);
            game.audio.play('slash', enemy.x);
          }
          game.vfx.spawnDamageText(
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
          if (game.audio) game.audio.play('slash', this.x);
        }
      }
    }

    if (t >= 0.44) {
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
    //   Pass 0 (0.18..0.27s, F06..F08): Up-Diagonal Spear-Dash ('/' -18 deg) from ground through enemy
    //   Pass 1 (0.27..0.36s, F09..F11): Cross-Air Horizontal Spear-Blitz ('--->' +2 deg)
    //   Pass 2 (0.36..0.48s, F12..F15): Head-First Down-Diagonal Spear-Dive ('\\' +26 deg) back to ground
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

      // Spawn continuous ribbon of crisp un-rotated multi-angle spear afterimages
      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.024) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(15, Math.max(6, Math.floor((t / this.skillDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.28, 0);
      }

      // Trigger diagonal slash lines, crescent waves, and multi-hit strikes on each spear pass
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
        if (game.audio) game.audio.play('dash_whoosh', center);
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
      if (game.audio) game.audio.play('slash', this.x);
      game.renderer.triggerShake(11, 0.22);
      game.renderer.triggerAberration(6);
      game.renderer.triggerHitStop(0.05);
      game.vfx.spawnDamageText(
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
        game.vfx.spawnBurst(mx, my, 8, '#38bdf8', 210, { upBias: 60, size: 5 });
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
    const dir = targetX >= originX ? 1 : -1;
    const landX = clampX(targetX - dir * 68);

    // Stage 0 (0.00s .. 0.30s -> Row 4 F00..F04): 100% GROUNDED Susanoo Awakening Cast (ZERO lifting / ZERO floating!)
    if (t < 0.30) {
      if (this._omniStep === 0) {
        this._omniStep = 1;
        this._ultOriginX = this.x;
        this._ultOriginY = this.groundY;
        // Manifest Row-3 Raijin Storm Ring around the target!
        this.spawnVfxAnim(3, targetX, this.groundY - 82, 236, 236, 1.32, {
          glowColor: 'cyan'
        });
        this.spawnPixelShockwave(this.x, this.groundY - 4, 145, 'purple', 0.34, true);
        this.spawnPixelLightningBolt(this.x, this.groundY - 280, this.groundY, 'cyan', 0.36);
      }
      // Stay 100% planted on the ground in place during the entire Ultimate cast startup!
      this.x = this._ultOriginX;
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;
      this.facing = targetX >= this.x ? 1 : -1;
      this.divePitchRad = 0;
      return;
    }

    // Stage 1 & 2 (0.30s .. 1.26s -> Row 4 F05..F20): 6 Continuous Frame-Locked Multi-Angle Spear-Dashes!
    //   Pass 0 (0.30..0.48s, F05..F07): Ground-Launch Up-Diagonal Spear-Dash ('/' -20 deg)
    //   Pass 1 (0.48..0.60s, F08..F09): Head-First Down-Diagonal Cross-Dive ('\\' +24 deg)
    //   Pass 2 (0.60..0.72s, F10..F11): Up-Diagonal Sky-Slash ('/' -22 deg)
    //   Pass 3 (0.72..0.84s, F12..F13): Horizontal Supersonic Mid-Air Blitz ('--->' +4 deg)
    //   Pass 4 (0.84..1.02s, F14..F16): Steep Up-Diagonal Ascension Slash to Heaven-Split Apex ('/' -24 deg)
    //   Pass 5 (1.02..1.26s, F17..F20): FINAL HEAVEN-SPLIT HEAD-FIRST THUNDER-SPEAR PLUNGE ('\\' +32 deg) to ground!
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

      // Continuous ribbon of crisp un-rotated multi-angle spear afterimages
      this.afterimageSpawnAccum += dt;
      const spawnInterval = passIdx === 5 ? 0.018 : 0.022;
      if (this.afterimageSpawnAccum >= spawnInterval) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(20, Math.max(5, Math.floor((t / this.ultDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 4, col, 0.32, 0);
      }

      // Trigger multi-angle diagonal slash beam, crescent wave & damage on passes 0..4 (pass 5 detonates on landing!)
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
          if (game.audio) game.audio.play('slash', targetX);
          game.renderer.triggerShake(8, 0.12);
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

      // Diagonal Heaven-Split spear beam from sky apex straight to ground + vertical lightning pillar line
      const apexPt = omniPasses[5].p0;
      this.addSlashLine(apexPt.x, apexPt.y - 62, landX, this.groundY - 42, 0.58);
      this.addSlashLine(targetX, this.groundY - 275, targetX, this.groundY, 0.54);

      // Erupt Row-1 Cross-Slash Detonation + Row-2 Judgement Thunder Pillar + Row-3 Raijin Storm Ring!
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
      // Pure 4x4 Pixel-Art Heaven-Split Shockwaves & Twin Sky-Splitting Raijin Thunderbolts!
      this.spawnPixelShockwave(targetX, this.groundY - 6, 235, 'cyan', 0.44, true);
      this.spawnPixelShockwave(targetX, this.groundY - 82, 175, 'gold', 0.38, false);
      this.spawnPixelLightningBolt(targetX, this.groundY - 310, this.groundY, 'gold', 0.44);
      this.spawnPixelLightningBolt(targetX - 56, this.groundY - 270, this.groundY, 'cyan', 0.38);
      this.spawnPixelLightningBolt(targetX + 56, this.groundY - 270, this.groundY, 'purple', 0.38);

      if (game.audio) {
        game.audio.play('thunder_slam', targetX);
      }
      game.renderer.triggerShake(15, 0.28);
      game.renderer.triggerAberration(9);
      game.renderer.triggerHitStop(0.06);
      game.vfx.spawnBurst(targetX, this.groundY - 68, 32, '#818cf8', 320, {
        upBias: 175,
        size: 7
      });
      game.vfx.spawnDamageText(
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
      this.setState('IDLE');
    }
  }

  /**
   * 3-Pass HD-2D Additive Bloom Renderer for Kaze-Maru's 208x208 VFX Sheet (assets/sprites/ronin_vfx.png):
   * - Pass 1: Soft radial cyan/purple lighting halo from renderer.glowCyan / renderer.glowPurple
   * - Pass 2: Crisp nearest-neighbor base pixel-art cell
   * - Pass 3: Additive ('lighter') bloom overlay for white-hot electric-cyan & violet-storm luminance
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
    const sy = Math.max(0, Math.min(3, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    // Pass 1: Soft HD-2D radial glow halo behind pixel art
    const glowSprite =
      glowColor === 'purple' ? renderer?.glowPurple || renderer?.glowCyan : renderer?.glowCyan;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.42);
      const gw = Math.round(w * 1.15);
      const gh = Math.round(h * 1.15);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    // Pass 2: Base nearest-neighbor pixel-art cell
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    // Pass 3: Additive HD-2D bloom pass
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.52);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  /**
   * Renders a Judgment-Cut Slash Line as a Stepped 4x4 Pixel-Art Lightning Beam with Dual-Helix Sparks
   * (zero smooth anti-aliased vector strokes).
   */
  drawSteppedPixelSlash4x4(ctx, line) {
    const alpha = Math.max(0, 1 - line.age / line.maxLife);
    if (alpha <= 0.01) return;

    const snap4 = (v) => Math.round(v / 4) * 4;
    const x1 = snap4(line.x1);
    const y1 = snap4(line.y1);
    const x2 = snap4(line.x2);
    const y2 = snap4(line.y2);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(dist / 4));
    const nx = dist > 0 ? -dy / dist : 0;
    const ny = dist > 0 ? dx / dist : -1;

    const outerCol = line.detonated ? '#a855f7' : '#6366f1';
    const midCol = line.detonated ? '#fde047' : '#22d3ee';
    const coreCol = '#ffffff';
    const phase = line.age * 28.0 + (line.seed || 0);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Outer Indigo/Violet Aura Pixels & Crackling Dual-Helix Lightning Zigzags (4x4 blocks)
    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = outerCol;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const px = snap4(x1 + dx * u);
      const py = snap4(y1 + dy * u);
      ctx.fillRect(px - 2, py - 6, 4, 12);
      if (s % 2 === 0) {
        const zig = Math.round(Math.sin(u * Math.PI * 5 + phase) * 2.5) * 4;
        const zx = snap4(px + nx * zig);
        const zy = snap4(py + ny * zig);
        ctx.fillStyle = s % 4 === 0 ? midCol : outerCol;
        ctx.fillRect(zx - 2, zy - 2, 4, 4);
      }
    }

    // 2. Electric-Cyan / Golden-Storm Inner Beam (4x4 blocks)
    ctx.globalAlpha = alpha * 0.92;
    ctx.fillStyle = midCol;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const px = snap4(x1 + dx * u);
      const py = snap4(y1 + dy * u);
      ctx.fillRect(px - 2, py - 4, 4, 8);
    }

    // 3. White-Hot Razor Core (4x4 blocks)
    ctx.globalAlpha = alpha;
    ctx.fillStyle = coreCol;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const px = snap4(x1 + dx * u);
      const py = snap4(y1 + dy * u);
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    // 4. 4x4 Pixel Star Cross Glints at Midpoint & Endpoints
    const mx = snap4((x1 + x2) * 0.5);
    const my = snap4((y1 + y2) * 0.5);
    ctx.fillStyle = midCol;
    ctx.fillRect(mx - 10, my - 2, 20, 4);
    ctx.fillRect(mx - 2, my - 10, 4, 20);
    ctx.fillStyle = coreCol;
    ctx.fillRect(mx - 2, my - 2, 4, 4);

    ctx.restore();
  }

  /**
   * Renders an Expanding 4x4-Snapped Pixel-Art Raijin Shockwave Ring with 8 Orbiting Taiko Drum Nodes.
   */
  drawPixelShockwave4x4(ctx, sw) {
    const u = Math.min(1, sw.age / sw.maxLife);
    const alpha = Math.max(0, 1 - u);
    if (alpha <= 0.02) return;

    const snap4 = (v) => Math.round(v / 4) * 4;
    const ease = 1 - Math.pow(1 - u, 2.2);
    const rx = sw.maxR * (0.22 + 0.78 * ease);
    const ry = sw.isGround ? rx * 0.24 : rx * 0.88;

    const midCol =
      sw.colorType === 'gold' ? '#fef08a' : sw.colorType === 'purple' ? '#a78bfa' : '#22d3ee';
    const outerCol =
      sw.colorType === 'gold' ? '#eab308' : sw.colorType === 'purple' ? '#7c3aed' : '#4f46e5';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const steps = 36;
    for (let i = 0; i < steps; i++) {
      const ang = (i / steps) * Math.PI * 2 + u * 2.5;
      const px = snap4(sw.x + Math.cos(ang) * rx);
      const py = snap4(sw.y + Math.sin(ang) * ry);

      ctx.globalAlpha = alpha * 0.65;
      ctx.fillStyle = outerCol;
      ctx.fillRect(px - 4, py - 4, 8, 8);

      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : midCol;
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    // 8 Raijin Taiko Drum Nodes around the perimeter
    for (let d = 0; d < 8; d++) {
      const da = (d / 8) * Math.PI * 2 - u * 3.0;
      const dx = snap4(sw.x + Math.cos(da) * rx);
      const dy = snap4(sw.y + Math.sin(da) * ry);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#eab308';
      ctx.fillRect(dx - 4, dy - 4, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dx - 2, dy - 2, 4, 4);
    }

    ctx.restore();
  }

  /**
   * Renders a Sky-Splitting 4x4-Snapped Jagged Pixel-Art Raijin Thunderbolt (`x, topY -> botY`).
   */
  drawPixelLightningBolt4x4(ctx, bolt) {
    const u = Math.min(1, bolt.age / bolt.maxLife);
    const alpha = Math.max(0, 1 - u);
    if (alpha <= 0.02) return;

    const snap4 = (v) => Math.round(v / 4) * 4;
    const midCol =
      bolt.colorType === 'gold' ? '#fef08a' : bolt.colorType === 'purple' ? '#c084fc' : '#67e8f9';
    const outerCol =
      bolt.colorType === 'gold' ? '#eab308' : bolt.colorType === 'purple' ? '#7c3aed' : '#0284c7';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const spanY = Math.max(16, bolt.botY - bolt.topY);
    const segs = Math.max(8, Math.floor(spanY / 8));
    const phase = bolt.age * 36.0 + (bolt.seed || 0);

    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const py = snap4(bolt.topY + spanY * t);
      const zig =
        s === 0 || s === segs
          ? 0
          : Math.round(Math.sin(t * Math.PI * 6 + phase) * 3.5 + Math.cos(t * 13 + phase) * 2.0) * 4;
      const px = snap4(bolt.x + zig);

      // Outer storm jacket (12x8 pixel block)
      ctx.globalAlpha = alpha * 0.58;
      ctx.fillStyle = outerCol;
      ctx.fillRect(px - 6, py - 4, 12, 8);

      // Mid cyan/gold plasma (8x8 pixel block)
      ctx.globalAlpha = alpha * 0.88;
      ctx.fillStyle = midCol;
      ctx.fillRect(px - 4, py - 4, 8, 8);

      // White-hot 4x4 pixel spine
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 2, py - 4, 4, 8);

      // Branching lightning forks at 35% and 68% height
      if (s === Math.floor(segs * 0.35) || s === Math.floor(segs * 0.68)) {
        const dir = s % 2 === 0 ? 1 : -1;
        for (let b = 1; b <= 5; b++) {
          ctx.globalAlpha = alpha * (1 - b * 0.16);
          ctx.fillStyle = b <= 2 ? '#ffffff' : midCol;
          ctx.fillRect(px + dir * b * 4, py + b * 4, 4, 4);
        }
      }
    }

    ctx.restore();
  }

  /**
   * Renders a Real-Time 4x4-Snapped Pixel-Art Supersonic Mach-Cone & Double-Helix Contrail around Kaze-Maru
   * whenever he is in his aerodynamic multi-angle diving spear posture (`SKILL` F06..F15 or `ULTIMATE` F05..F20).
   */
  drawPixelSpearMachCone4x4(ctx) {
    const isSkillDive = this.state === 'SKILL' && this.stateTimer >= 0.18 && this.stateTimer < 0.48;
    const isUltDive = this.state === 'ULTIMATE' && this.stateTimer >= 0.30 && this.stateTimer < 1.26;
    if (!isSkillDive && !isUltDive) return;

    const isHeavenSplit = this.state === 'ULTIMATE' && this.stateTimer >= 1.02;
    const snap4 = (v) => Math.round(v / 4) * 4;
    const baseAngle = this.divePitchRad || 0;
    const ux = Math.cos(baseAngle) * this.facing;
    const uy = Math.sin(baseAngle);
    const nx = -uy;
    const ny = ux;

    const cx = this.x;
    const cy = this.y - 72;
    const tipX = cx + ux * 68;
    const tipY = cy + uy * 68;
    const phase = this.stateTimer * 35.0;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. V-Shaped 4x4 Pixel Mach-Cone Shockwings Sweeping Back from the Spear Tip
    for (const side of [-1, 1]) {
      for (let step = 0; step <= 18; step++) {
        const backDist = step * 6.5;
        const spread = 4 + step * (isHeavenSplit ? 3.1 : 2.5);
        const wx = snap4(tipX - ux * backDist + nx * side * spread);
        const wy = snap4(tipY - uy * backDist + ny * side * spread);

        ctx.globalAlpha = Math.max(0.15, 0.92 - step * 0.042);
        ctx.fillStyle =
          step <= 3
            ? '#ffffff'
            : isHeavenSplit && step % 2 === 0
              ? '#fef08a'
              : step % 2 === 0
                ? '#67e8f9'
                : '#a78bfa';
        ctx.fillRect(wx - 2, wy - 2, 4, 4);
      }
    }

    // 2. Spiraling 4x4 Pixel Lightning Helix Contrail Behind the Spear Body
    for (let h = 0; h <= 20; h++) {
      const dist = h * 6.0;
      const wave = Math.sin(h * 0.65 - phase) * (10 + h * 0.7);
      const hx = snap4(tipX - ux * dist + nx * wave);
      const hy = snap4(tipY - uy * dist + ny * wave);
      ctx.globalAlpha = Math.max(0.15, 0.85 - h * 0.038);
      ctx.fillStyle = h % 3 === 0 ? '#ffffff' : h % 2 === 0 ? '#22d3ee' : '#c084fc';
      ctx.fillRect(hx - 2, hy - 2, 4, 4);
    }

    ctx.restore();
  }

  /**
   * Renders a 4x4-Snapped Pixel-Art Raijin Storm-Domain Ground Seal beneath the Ultimate Target (`ULTIMATE`).
   */
  drawPixelStormDomain4x4(ctx) {
    if (this.state !== 'ULTIMATE') return;
    const snap4 = (v) => Math.round(v / 4) * 4;
    const cx = this._ultTargetX || this.x;
    const gy = this.groundY - 4;
    const phase = this.stateTimer * 8.0;
    const rx = 152;
    const ry = 18;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < 44; i++) {
      const ang = (i / 44) * Math.PI * 2 + phase;
      const px = snap4(cx + Math.cos(ang) * rx);
      const py = snap4(gy + Math.sin(ang) * ry);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#22d3ee' : '#a78bfa';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    // 8 Rotating Pixel Taiko Drums & Rising 4x4 Storm Motes
    for (let d = 0; d < 8; d++) {
      const da = (d / 8) * Math.PI * 2 - phase * 1.2;
      const dx = snap4(cx + Math.cos(da) * rx);
      const dy = snap4(gy + Math.sin(da) * ry);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = '#eab308';
      ctx.fillRect(dx - 4, dy - 4, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dx - 2, dy - 2, 4, 4);

      const moteY = snap4(gy - ((this.stateTimer * 140 + d * 28) % 120));
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = d % 2 === 0 ? '#67e8f9' : '#fef08a';
      ctx.fillRect(dx - 2, moteY - 2, 4, 4);
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().ronin;
    const vfxSheet = sprites?.vfx;

    // 0. Render 4x4 Pixel-Art Raijin Storm-Domain Ground Seal during ULTIMATE
    this.drawPixelStormDomain4x4(ctx);

    // 1. Render Indigo-Cyan Lightning Afterimage Clones (pure un-rotated 4x4 pixel-art frames!)
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

    // 2. Render Background/Midground 3-Pass Bloomed 30fps Ronin VFX Sheet Animations (Rows 0..2: Crescent Waves, Dragon Pillar, Sky-Odachi)
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        if (v.row === 3) continue; // Row 3 Storm Impact & Raijin Ring renders in front of characters in drawUltimateForeground!
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

    // 3. Render Floor-Plane 4x4 Pixel-Art Raijin Shockwave Rings
    if (this.activePixelShockwaves.length > 0) {
      for (const sw of this.activePixelShockwaves) {
        if (sw.isGround) {
          this.drawPixelShockwave4x4(ctx, sw);
        }
      }
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().ronin;
    const vfxSheet = sprites?.vfx;

    // 1. Render Real-Time 4x4 Pixel-Art Supersonic Mach-Cone & Spear Contrail IN FRONT of characters during SKILL / ULTIMATE dives!
    this.drawPixelSpearMachCone4x4(ctx);

    // 2. Render Foreground Row-3 Raijin Storm Impact & Ring IN FRONT of characters!
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        if (v.row !== 3) continue;
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

    // 3. Render Radial 4x4 Pixel-Art Raijin Shockwave Rings & Sky-Splitting Lightning Bolts
    if (this.activePixelShockwaves.length > 0) {
      for (const sw of this.activePixelShockwaves) {
        if (!sw.isGround) {
          this.drawPixelShockwave4x4(ctx, sw);
        }
      }
    }
    if (this.activeLightningBolts.length > 0) {
      for (const bolt of this.activeLightningBolts) {
        this.drawPixelLightningBolt4x4(ctx, bolt);
      }
    }

    // 4. Render Persistent Judgment-Cut Lightning Slash Lines as Stepped 4x4 Pixel-Art Beams in Foreground
    if (this.activeSlashLines.length > 0) {
      for (const line of this.activeSlashLines) {
        this.drawSteppedPixelSlash4x4(ctx, line);
      }
    }
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
