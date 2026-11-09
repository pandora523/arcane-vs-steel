import { Fighter } from './Fighter.js?v=30fps27';
import { PixelForge } from '../engine/PixelForge.js?v=30fps27';

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
    this.skillDuration = 0.86;
    this.ultDuration = 1.78;
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

    // Add X-shaped Judgment Cut slash lines + Row-4 Judgment Slash Ring + Row-1 Sky-Odachi seal across attacker
    this.addSlashLine(attacker.x - 62, attacker.y - 138, attacker.x + 62, attacker.y - 22, 0.42);
    this.addSlashLine(attacker.x - 62, attacker.y - 22, attacker.x + 62, attacker.y - 138, 0.42);
    this.spawnVfxAnim(4, attacker.x, attacker.y - 78, 216, 216, 0.42, { glowColor: 'cyan' });
    this.spawnVfxAnim(1, attacker.x, attacker.groundY - 92, 208, 208, 0.50, {
      startFrame: 8,
      endFrame: 29,
      glowColor: 'purple'
    });

    if (game) {
      if (game.audio) {
        game.audio.play('dash_whoosh', this.x);
        game.audio.play('slash', attacker.x);
      }
      game.renderer.triggerShake(9, 0.18);
      game.renderer.triggerHitStop(0.045);
      const sA = this.facing === 1 ? -1.8 : Math.PI - 1.2;
      const eA = this.facing === 1 ? 1.2 : Math.PI + 1.8;
      game.vfx.spawnSlash(attacker.x, attacker.y - 84, 135, sA, eA, '#38bdf8', 0.28);
      game.vfx.spawnShockwave(attacker.x, attacker.y - 84, 130, '#818cf8', 0.28);
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
          this.addSlashLine(t.x - 56, t.y - 134, t.x + 56, t.y - 26, 0.34);
          this.addSlashLine(t.x - 56, t.y - 26, t.x + 56, t.y - 134, 0.34);
          this.spawnVfxAnim(2, t.x, t.groundY - 94, 208, 208, 0.44, { glowColor: 'cyan' });
          this.spawnVfxAnim(4, t.x, t.y - 78, 188, 188, 0.34, { glowColor: 'purple' });
          if (game.audio) game.audio.play('slash', t.x);
          game.renderer.triggerShake(7, 0.15);
          game.vfx.spawnShockwave(t.x, t.y - 82, 115, '#38bdf8', 0.26);
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
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 86, '#818cf8', 0.24, true);
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
      if (game.audio) game.audio.play('slash', this.x);
      const sA = this.facing === 1 ? -1.6 : Math.PI - 1.2;
      const eA = this.facing === 1 ? 1.2 : Math.PI + 1.6;
      game.vfx.spawnSlash(this.x, this.y - 74, 120, sA, eA, '#38bdf8', 0.26);
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
        game.vfx.spawnSlash(this.x, this.y - 68, 118, -1.6, 1.2, '#38bdf8', 0.26);
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
        game.vfx.spawnSlash(this.x, this.y - 68, 124, 1.2, -1.6, '#818cf8', 0.26);
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
        const arcColor = step === 0 ? '#38bdf8' : '#818cf8';
        const sA = this.facing === 1 ? -1.65 : Math.PI - 1.25;
        const eA = this.facing === 1 ? 1.25 : Math.PI + 1.65;
        game.vfx.spawnSlash(this.x + this.facing * 38, this.y - 84, 126, sA, eA, arcColor, 0.26);
        this.spawnVfxAnim(0, this.x + this.facing * 44, this.y - 82, 196, 196, 0.28, {
          vx: this.facing * 260,
          flipX: this.facing < 0,
          glowColor: step === 0 ? 'cyan' : 'purple'
        });
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
    this.isInvulnerable = t < 0.62;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const center =
      enemy && !enemy.isDead
        ? enemy.x
        : Math.max(220, Math.min(ww - 220, (this._skillOriginX || this.x) + this.facing * 165));

    // Phase 0 (0.00s .. 0.18s -> Row 3 F00..F06): Deep Coiled Iaido Spear-Charge Crouch
    if (t < 0.18) {
      const coilU = t / 0.18;
      this.vx = -this.facing * 55 * (1 - coilU);
      this.y = this.groundY;
      this.divePitchRad = -0.06 * coilU;
      if (this._zantetsuStep === 0) {
        this._zantetsuStep = 1;
        this._skillOriginX = this.x;
        this._skillOriginY = this.groundY;
        this.spawnVfxAnim(4, this.x, this.y - 76, 176, 176, 0.24, {
          followOwner: true,
          offsetX: 0,
          offsetY: -76,
          glowColor: 'cyan'
        });
      }
      return;
    }

    // Phase 1 (0.18s .. 0.48s -> Row 3 F07..F15): 3 Continuous High-Velocity Aerodynamic Spear-Lunges!
    // Each pass smoothly interpolates (this.x, this.y) through the enemy so Kaze-Maru's razor-sharp
    // spear body glides continuously across the screen instead of teleporting in discrete jumps.
    const passWaypoints = [
      { x: this._skillOriginX || this.x, y: this.groundY },
      { x: Math.max(85, Math.min(ww - 85, center + 125)), y: this.groundY - 46 },
      { x: Math.max(85, Math.min(ww - 85, center - 120)), y: this.groundY - 78 },
      { x: Math.max(85, Math.min(ww - 85, center + 102)), y: this.groundY }
    ];

    if (t >= 0.18 && t < 0.48) {
      const spearProgress = (t - 0.18) / 0.30; // 0..1 across 3 passes
      const passFloat = spearProgress * 3.0;
      const passIdx = Math.min(2, Math.floor(passFloat));
      const localU = passFloat - passIdx;
      // Smooth cubic ease-in-out for high-velocity aerodynamic dart feel
      const easeU = localU < 0.5 ? 2 * localU * localU : 1 - Math.pow(-2 * localU + 2, 2) / 2;

      const p0 = passWaypoints[passIdx];
      const p1 = passWaypoints[passIdx + 1];
      this.x = p0.x + (p1.x - p0.x) * easeU;
      this.y = p0.y + (p1.y - p0.y) * easeU;
      this.vx = 0;
      this.vy = 0;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      this.facing = dx >= 0 ? 1 : -1;
      // Row 3 F07..F15 already has a horizontal spear posture; add dynamic pitch along vertical slope
      this.divePitchRad = Math.max(-0.42, Math.min(0.45, Math.atan2(dy, Math.abs(dx)) * 0.85));

      // Spawn continuous ribbon of razor-sharp spear afterimages
      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.024) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(15, Math.max(7, 7 + Math.floor(spearProgress * 8)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.28, this.divePitchRad);
      }

      // Trigger slash lines, crescent waves, and multi-hit strikes at the start of each spear pass
      const targetStep = passIdx + 2; // 2, 3, 4
      if (this._zantetsuStep < targetStep) {
        this._zantetsuStep = targetStep;
        this.addSlashLine(p0.x, p0.y - 68, p1.x, p1.y - 68, 0.64);
        this.spawnVfxAnim(0, center, (p0.y + p1.y) * 0.5 - 72, 208, 208, 0.28, {
          vx: this.facing * 280,
          flipX: this.facing < 0,
          glowColor: passIdx % 2 === 0 ? 'cyan' : 'purple'
        });
        if (game.audio) game.audio.play('dash_whoosh', center);
        game.vfx.spawnSlash(
          center,
          (p0.y + p1.y) * 0.5 - 70,
          132,
          -1.6,
          1.4,
          passIdx % 2 === 0 ? '#38bdf8' : '#818cf8',
          0.26
        );
        if (enemy && !enemy.isDead && Math.abs(enemy.x - center) < 230) {
          enemy.takeDamage(20, this, passIdx === 2, 22, -98);
        }
      }
      return;
    }

    // Phase 2 (0.48s .. 0.64s -> Row 3 F16..F20): Deceleration Slide-Brake
    if (t >= 0.48 && t < 0.64) {
      this.y = this.groundY;
      this.divePitchRad *= Math.pow(0.001, dt);
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
    }

    // Phase 3 (0.64s -> Row 3 F22): NOTO SHEATHING CLICK! Detonates all slash lines & erupts Raijin Sky-Odachi + Dragon Pillar!
    if (t >= 0.64 && !this.didSecondaryAction) {
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
      this.spawnVfxAnim(1, strikeX, this.groundY - 94, 220, 220, 0.52, {
        startFrame: 10,
        endFrame: 29,
        glowColor: 'cyan'
      });
      this.spawnVfxAnim(2, strikeX, this.groundY - 96, 212, 212, 0.48, {
        glowColor: 'purple'
      });

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 340) {
        game.vfx.spawnShockwave(enemy.x, enemy.y - 78, 165, '#818cf8', 0.34);
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
    const targetX = enemy && !enemy.isDead ? enemy.x : ww * 0.5;
    const dir = targetX >= (this._ultOriginX || this.x) ? 1 : -1;

    // Continuous Omnislash Diving Waypoints around targetX (6 razor-sharp diagonal dives + high Heaven-Split apex)
    const clampX = (xVal) => Math.max(85, Math.min(ww - 85, xVal));
    const diveWaypoints = [
      { x: clampX(targetX - dir * 130), y: this.groundY - 125 }, // 0: Initial high dive perch
      { x: clampX(targetX + dir * 130), y: this.groundY - 22 },  // 1: Dive 1 (top-left -> bottom-right)
      { x: clampX(targetX - dir * 125), y: this.groundY - 140 }, // 2: Dive 2 (bottom-right -> high-left)
      { x: clampX(targetX + dir * 125), y: this.groundY - 38 },  // 3: Dive 3 (high-left -> low-right)
      { x: clampX(targetX - dir * 135), y: this.groundY - 30 },  // 4: Dive 4 (low-right -> low-left)
      { x: clampX(targetX + dir * 130), y: this.groundY - 148 }, // 5: Dive 5 (low-left -> high-right)
      { x: clampX(targetX - dir * 120), y: this.groundY - 45 }   // 6: Dive 6 (high-right -> low-left)
    ];

    // Stage 0 (0.00s .. 0.26s -> Row 4 F00..F04): Susanoo Storm-God Awakening & Smooth Ascending Leap to Perch 0
    if (t < 0.26) {
      if (this._omniStep === 0) {
        this._omniStep = 1;
        this._ultOriginX = this.x;
        this._ultOriginY = this.y;
        // Manifest Row-3 Colossal Susanoo Storm-God Avatar & 8-Drum Halo behind Kaze-Maru!
        this.spawnVfxAnim(3, this.x, this.y - 108, 248, 248, 1.55, {
          followOwner: true,
          offsetX: 0,
          offsetY: -108,
          glowColor: 'purple'
        });
        // Manifest Row-4 Thousand-Blade Judgment Slash Ring around the target!
        this.spawnVfxAnim(4, targetX, this.groundY - 82, 236, 236, 1.32, {
          glowColor: 'cyan'
        });
      }
      const leapU = Math.min(1, t / 0.26);
      const easeLeap = 1 - Math.pow(1 - leapU, 2.2);
      this.x = this._ultOriginX + (diveWaypoints[0].x - this._ultOriginX) * easeLeap;
      this.y = this._ultOriginY + (diveWaypoints[0].y - this._ultOriginY) * easeLeap;
      this.vx = 0;
      this.vy = 0;
      this.facing = targetX >= this.x ? 1 : -1;
      this.divePitchRad = leapU * 0.18;
      return;
    }

    // Stage 1 (0.26s .. 0.92s -> Row 4 F05..F15): 6 Continuous High-Velocity Diagonal Omnislash Dives!
    // Kaze-Maru's entire body is in the sharp diagonal diving spear posture (Row 4 F05..F15) and glides
    // continuously at high velocity through the enemy along each diagonal chord!
    if (t >= 0.26 && t < 0.92) {
      const omniU = (t - 0.26) / 0.66; // 0..1 across 6 continuous dives
      const diveFloat = omniU * 6.0;
      const diveIdx = Math.min(5, Math.floor(diveFloat));
      const localU = diveFloat - diveIdx;
      const easeDive = localU < 0.5 ? 2 * localU * localU : 1 - Math.pow(-2 * localU + 2, 2) / 2;

      const p0 = diveWaypoints[diveIdx];
      const p1 = diveWaypoints[diveIdx + 1];
      this.x = p0.x + (p1.x - p0.x) * easeDive;
      this.y = p0.y + (p1.y - p0.y) * easeDive;
      this.vx = 0;
      this.vy = 0;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      this.facing = dx >= 0 ? 1 : -1;
      // Row 4 F05..F13 is already sculpted at a +35 deg downward-right diagonal dive;
      // dynamically adjust divePitchRad so the spear tip points strictly along (dx, dy)!
      const desiredAngle = Math.atan2(dy, Math.abs(dx));
      this.divePitchRad = Math.max(-0.65, Math.min(0.55, desiredAngle - 0.42));

      // Continuous ribbon of diving spear afterimages
      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.022) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(15, Math.max(5, 5 + Math.floor(omniU * 10)));
        this.spawnAfterimage(this.x, this.y, this.facing, 4, col, 0.30, this.divePitchRad);
      }

      // Trigger slash beam, crescent wave & damage as Kaze-Maru pierces through the center of each dive
      const stepTrigger = diveIdx + 2; // 2..7
      if (this._omniStep < stepTrigger && localU >= 0.25) {
        this._omniStep = stepTrigger;
        this.addSlashLine(p0.x, p0.y - 54, p1.x, p1.y - 54, 0.52);
        this.spawnVfxAnim(0, targetX, this.groundY - 82, 212, 212, 0.26, {
          vx: this.facing * 260,
          flipX: this.facing < 0,
          glowColor: diveIdx % 2 === 0 ? 'cyan' : 'purple'
        });
        if (game.audio) game.audio.play('slash', targetX);
        game.renderer.triggerShake(8, 0.12);
        game.vfx.spawnSlash(
          targetX,
          this.groundY - 82,
          142,
          -1.8,
          1.5,
          diveIdx % 2 === 0 ? '#38bdf8' : '#818cf8',
          0.26
        );
        if (enemy && !enemy.isDead) {
          enemy.takeDamage(21, this, true, 16, -110);
        }
      }
      this._ultApexStartX = this.x;
      this._ultApexStartY = this.y;
      return;
    }

    // Stage 2A (0.92s .. 1.06s -> Row 4 F15..F17): High-Altitude Ascent to the Heaven-Split Apex!
    const apexX = clampX(targetX - dir * 142);
    const apexY = this.groundY - 215;
    const landX = clampX(targetX + dir * 58);
    const landY = this.groundY;

    if (t >= 0.92 && t < 1.06) {
      const ascU = (t - 0.92) / 0.14;
      const easeAsc = 1 - Math.pow(1 - ascU, 2.0);
      this.x = (this._ultApexStartX || this.x) + (apexX - (this._ultApexStartX || this.x)) * easeAsc;
      this.y = (this._ultApexStartY || this.y) + (apexY - (this._ultApexStartY || this.y)) * easeAsc;
      this.facing = dir;
      // Lock body into razor-sharp downward diving spear angle aiming straight at the enemy!
      this.divePitchRad = 0.22 * easeAsc;
      return;
    }

    // Stage 2B (1.06s .. 1.32s -> Row 4 F18..F21): FULL-BODY RAZOR-SHARP HEAVEN-SPLIT DIVE (>--->>)!
    // Kaze-Maru plunges continuously like a supersonic lightning spear from (apexX, apexY) straight
    // through the enemy into the ground at (landX, landY)!
    if (t >= 1.06 && t < 1.32) {
      const diveU = Math.min(1, (t - 1.06) / 0.26);
      const easePlunge = diveU * diveU * (3 - 2 * diveU);
      this.x = apexX + (landX - apexX) * easePlunge;
      this.y = apexY + (landY - apexY) * easePlunge;
      this.vx = 0;
      this.vy = 0;
      this.facing = dir;
      // Row 4 F17..F21 is sculpted at -55 deg steep downward spear dive; add +0.20 rad pitch for razor alignment
      this.divePitchRad = 0.20;

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.018) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(21, Math.max(17, 17 + Math.floor(diveU * 4)));
        this.spawnAfterimage(this.x, this.y, this.facing, 4, col, 0.36, this.divePitchRad);
      }
      return;
    }

    // Stage 3 (1.32s -> Row 4 F22..F25): SUSANOO HEAVEN-SPLIT IMPACT CRATER, SKY-ODACHI & LIGHTNING DRAGON!
    if (t >= 1.32 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.x = landX;
      this.y = this.groundY;
      this.divePitchRad = 0;

      // Diagonal Heaven-Split spear beam + vertical lightning pillar line
      this.addSlashLine(apexX, apexY - 36, landX, this.groundY - 12, 0.56);
      this.addSlashLine(targetX, this.groundY - 265, targetX, this.groundY, 0.54);

      // Erupt Row-1 Impaled Raijin Sky-Odachi & 8-Drum Crater + Row-2 Coiling Lightning Dragon-Pillar!
      this.spawnVfxAnim(1, targetX, this.groundY - 98, 248, 248, 0.62, {
        startFrame: 6,
        endFrame: 29,
        glowColor: 'cyan'
      });
      this.spawnVfxAnim(2, targetX, this.groundY - 104, 236, 236, 0.58, {
        glowColor: 'purple'
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 84, 244, 244, 0.48, {
        glowColor: 'cyan'
      });

      if (game.audio) {
        game.audio.play('thunder_slam', targetX);
      }
      game.renderer.triggerShake(15, 0.28);
      game.renderer.triggerAberration(9);
      game.renderer.triggerHitStop(0.06);
      game.vfx.spawnShockwave(targetX, this.groundY - 8, 235, '#38bdf8', 0.42, true);
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
    const sy = Math.max(0, Math.min(4, Math.floor(row))) * cell;

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

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().ronin;
    const vfxSheet = sprites?.vfx;

    // 1. Render Indigo-Cyan Lightning Afterimage Clones (with dynamic dive pitch!)
    if (this.afterimages.length > 0 && sprites && sprites.sheet && sprites.sheet.complete) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.58);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x), Math.round(img.y));
        ctx.scale(img.facing, 1);
        if (img.pitch) {
          ctx.translate(0, -76);
          ctx.rotate(img.pitch);
          ctx.translate(0, 76);
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawAfterimageFrame(ctx, sprites, img.frameIdx || 190, 208, 208);
        ctx.restore();
      }
    }

    // 2. Render 3-Pass Bloomed 30fps Ronin VFX Sheet Animations (Crescent Waves, Sky-Odachi, Dragon Pillar, Susanoo, Judgment Ring)
    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
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

    // 3. Render Persistent Judgment-Cut Lightning Slash Lines as Stepped 4x4 Pixel-Art Beams
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

    const groundPlantOffset = 0;
    const walkBob =
      !isReflection && this.state === 'WALK'
        ? Math.round(Math.abs(Math.sin(this.walkPhase * 4.0)) * 2)
        : 0;

    ctx.translate(
      Math.round(this.x),
      Math.round(this.y + groundPlantOffset - walkBob)
    );
    ctx.scale(this.facing, 1);

    // Apply smooth aerodynamic dive pitch around Kaze-Maru's center of mass during SKILL / ULTIMATE / DASH
    if (!isReflection && Math.abs(this.divePitchRad) > 0.005) {
      ctx.translate(0, -76);
      ctx.rotate(this.divePitchRad);
      ctx.translate(0, 76);
    }

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
