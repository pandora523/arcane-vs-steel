import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Ronin extends Fighter {
  constructor(opts) {
    super({
      ...opts,
      name: opts.name || 'KAZE-MARU',
      maxHp: 1060,
      moveSpeed: 238,
      attackRange: 175,
      autoInterval: 0.66,
      lightColor: 'rgba(129, 140, 248, 1)',
      primaryColor: '#818cf8'
    });
    this.heroId = 'ronin';
    this.skillName = 'ZANTETSUKEN: 5-FOLD FLASH';
    this.ultName = 'SUSANOO: OMNISLASH STORM';
    this.theme = 'storm';
    this.hasPoise = false;
    this.skillTriggerRange = 440;
    this.skillMaxCooldown = 4.8;
    this.comboStep = 0;

    // Kaze-Maru Unique Mechanics:
    // 1. Lightning Afterimage Clones left behind during Shunpo / Flash-Through / Zantetsuken / Omnislash
    this.afterimages = [];
    // 2. Active Persistent Judgment-Cut Slash Lines that detonate when he clicks his blade into its scabbard (Noto/Chiburi)
    this.activeSlashLines = [];
    // 3. Queued Delayed Judgment-Cut Sheath Detonations
    this.delayedJudgmentCuts = [];
    // 4. Iaido Serene Mind Counter-Blink state
    this.iaidoCounterActive = false;
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'CROUCH') {
      this.iaidoCounterActive = false;
    }
  }

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.28) {
    this.afterimages.push({
      x,
      y,
      facing,
      row,
      col,
      age: 0,
      maxLife
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
      detonated: false
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

    // Add X-shaped Judgment Cut slash lines across the attacker
    this.addSlashLine(attacker.x - 58, attacker.y - 135, attacker.x + 58, attacker.y - 25, 0.38);
    this.addSlashLine(attacker.x - 58, attacker.y - 25, attacker.x + 58, attacker.y - 135, 0.38);

    if (game) {
      if (game.audio) {
        game.audio.playDash('storm');
        game.audio.playSkillHit('storm');
      }
      game.renderer.triggerShake(9, 0.18);
      game.renderer.triggerHitStop(0.045);
      game.vfx.spawnSlashArc(attacker.x, attacker.y - 84, this.facing, '#38bdf8', 135, 1);
      game.vfx.spawnShockwave(attacker.x, attacker.y - 84, 130, '#818cf8', 0.28);
      game.vfx.spawnDamageText(
        this.x,
        this.y - 218,
        0,
        true,
        '★ IAIDO COUNTER-BLINK! ★',
        '#38bdf8'
      );
    }

    attacker.takeDamage(54, this, true, 145, -155);
    this.gainMana(18);
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

    // 3. Update Delayed Judgment-Cut Sheath Detonations (from 3rd Auto-Attack Flash-Through)
    for (let i = this.delayedJudgmentCuts.length - 1; i >= 0; i--) {
      const jc = this.delayedJudgmentCuts[i];
      jc.timer -= dt;
      if (jc.timer <= 0) {
        this.delayedJudgmentCuts.splice(i, 1);
        const t = jc.target;
        if (t && !t.isDead && game) {
          this.addSlashLine(t.x - 52, t.y - 130, t.x + 52, t.y - 30, 0.30);
          this.addSlashLine(t.x - 52, t.y - 30, t.x + 52, t.y - 130, 0.30);
          if (game.audio) game.audio.playSkillHit('storm');
          game.renderer.triggerShake(7, 0.15);
          game.vfx.spawnShockwave(t.x, t.y - 82, 115, '#38bdf8', 0.26);
          game.vfx.spawnBurst(t.x, t.y - 82, 16, '#818cf8', 235, { upBias: 95, size: 5 });
          game.vfx.spawnDamageText(t.x, t.y - 216, 0, true, 'JUDGMENT SHEATH!', '#38bdf8');
          t.takeDamage(28, this, true, 95, -145);
        }
      }
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
    if (game && game.audio) game.audio.playDash('storm');
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 204,
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

    // While in Serene Mind Counter Stance (t < 0.42s):
    // 1) Any enemy projectile within 145px triggers an instant Counter-Blink behind the enemy + deflects the projectile!
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
      // 2) If enemy winds up a close melee attack within 190px, blink-counter behind them immediately!
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
      this.spawnAfterimage(oldX, this.y, this.facing, 7, 14, 0.26);
      this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 165));
      this.addSlashLine(oldX, this.y - 68, this.x, this.y - 68, 0.28);
      if (game.audio) game.audio.playSkillHit('storm');
      game.vfx.spawnSlashArc(this.x, this.y - 74, this.facing, '#38bdf8', 120, 1);
      if (enemy && !enemy.isDead && Math.abs(enemy.x - (oldX + this.x) * 0.5) < 135) {
        enemy.takeDamage(38, this, true, 125, -135);
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
    // TSUBAME GAESHI (Swallow-Turn Aerial Dash & Twin X-Slash!)
    this.dashDuration = 0.56;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isFlipVault = true;
    const ww = game.renderer.worldWidth;
    const dir = enemy && !enemy.isDead ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
    this.dashDir = dir;
    this.vaultStartX = this.x;
    // Target lands on the FAR side of the enemy if within range!
    const targetX =
      enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 280
        ? enemy.x + dir * 82
        : this.x + dir * 215;
    this.vaultTargetX = Math.max(85, Math.min(ww - 85, targetX));
    this.vx = 0;
    this.vy = 0;
    this.spawnAfterimage(this.x, this.y, this.facing, 8, 4, 0.26);
    if (game && game.audio) game.audio.playDash('storm');
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 204,
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
    this.spawnAfterimage(this.x, this.y, this.facing, 6, 6, 0.28);
    if (game && game.audio) game.audio.playDash('storm');
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 196,
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
      // Tsubame Gaeshi Aerial Swallow-Dash: rises fast, then darts diagonally across the enemy with 2 aerial slashes!
      const easeU = 1 - Math.pow(1 - u, 1.8);
      this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeU;
      this.y = this.groundY - Math.sin(u * Math.PI) * 98;
      this.vx = 0;
      this.vy = 0;

      if (Math.random() < 0.35) {
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.floor(u * 28), 0.18);
      }

      // First Swallow Slash at u >= 0.36
      if (u >= 0.36 && !this.didActionFrame) {
        this.didActionFrame = true;
        if (game.audio) game.audio.playMeleeHit(false);
        this.addSlashLine(this.x - 45, this.y - 110, this.x + this.facing * 75, this.y - 20, 0.28);
        game.vfx.spawnSlashArc(this.x, this.y - 68, this.facing, '#38bdf8', 118, 1);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 145) {
          enemy.takeDamage(24, this, false, 45, -130);
        }
      }

      // Second Crossing Swallow Slash at u >= 0.58
      if (u >= 0.58 && !this.didSecondaryAction) {
        this.didSecondaryAction = true;
        if (game.audio) game.audio.playSkillHit('storm');
        this.addSlashLine(this.x - 45, this.y - 20, this.x + this.facing * 75, this.y - 110, 0.28);
        game.vfx.spawnSlashArc(this.x, this.y - 68, -this.facing, '#818cf8', 124, -1);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 155) {
          enemy.takeDamage(28, this, true, 95, 120);
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

    // Shunpo Lightning Step: ultra-fast burst with afterimages
    const burst = 690 * (1 - u * 0.62);
    this.vx = this.dashDir * burst;
    if (Math.random() < 0.42) {
      this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.floor(u * 28), 0.22);
    }
    if (t >= dur) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    // KAZE-MARU 3-STAGE SANDAN KENDO & IAIDO FLASH-THROUGH COMBO (Zero generic projectile wave spam!):
    // Step 0: Fast Battoujutsu hip-draw horizontal cut (+45px step-in)
    // Step 1: Rising Kiriage diagonal upper-slash
    // Step 2: IAIDO FLASH-THROUGH — slices straight THROUGH the enemy to their opposite side and queues a Delayed Judgment-Cut Sheath explosion!
    if (t >= 0.18 && !this.didActionFrame) {
      this.didActionFrame = true;
      const step = this.comboStep;
      this.comboStep = (this.comboStep + 1) % 3;

      if (step < 2) {
        // Steps 0 & 1: Rapid Kendo step-in sword slashes
        this.vx = this.facing * 240;
        if (game.audio) game.audio.playMeleeHit(step === 1);
        const arcColor = step === 0 ? '#38bdf8' : '#818cf8';
        game.vfx.spawnSlashArc(this.x, this.y - 84, this.facing, arcColor, 126, step === 0 ? 1 : -1);
        this.addSlashLine(
          this.x + this.facing * 18,
          this.y - (step === 0 ? 78 : 35),
          this.x + this.facing * 145,
          this.y - (step === 0 ? 68 : 125),
          0.24
        );

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 28) {
          const isCrit = Math.random() < 0.32;
          const dmg = (step === 0 ? 28 : 32) * (isCrit ? 1.35 : 1);
          enemy.takeDamage(dmg, this, isCrit, 75, step === 1 ? -145 : 0);
          this.gainMana(10);
        }
      } else {
        // Step 2 (3rd Hit): IAIDO FLASH-THROUGH SLASH & DELAYED JUDGMENT CUT!
        const oldX = this.x;
        const ww = game.renderer.worldWidth;
        this.spawnAfterimage(oldX, this.y, this.facing, 2, 16, 0.30);

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 220) {
          // Teleport/Flash straight THROUGH the enemy to their opposite side!
          const newX = Math.max(85, Math.min(ww - 85, enemy.x + this.facing * 94));
          this.spawnAfterimage((oldX + newX) * 0.5, this.y, this.facing, 6, 15, 0.26);
          this.x = newX;
          this.facing = enemy.x >= this.x ? 1 : -1;
          this.addSlashLine(oldX, this.y - 76, newX, this.y - 76, 0.36);

          if (game.audio) {
            game.audio.playDash('storm');
            game.audio.playSkillHit('storm');
          }
          game.vfx.spawnDamageText(
            this.x,
            this.y - 208,
            0,
            true,
            'IAIDO FLASH-THROUGH!',
            '#38bdf8'
          );
          enemy.takeDamage(34, this, true, 35, -125);
          this.gainMana(14);

          // Queue the Delayed Judgment-Cut Sheath Detonation 0.24s later!
          this.delayedJudgmentCuts.push({
            target: enemy,
            timer: 0.24
          });
        } else {
          this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 145));
          this.addSlashLine(oldX, this.y - 76, this.x, this.y - 76, 0.28);
          if (game.audio) game.audio.playMeleeHit(true);
        }
      }
    }

    if (t >= 0.44) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    // KAZE-MARU UNIQUE SKILL: ZANTETSUKEN — 5-FOLD LIGHTNING ZIG-ZAG & DELAYED SLASH WEB!
    // Kaze-Maru dashes back-and-forth across the enemy 5 times in 0.54s, drawing a glowing web of
    // 5 Persistent Lightning Slash Lines across the target, then pauses and clicks his Odachi into its scabbard (Noto)
    // at t = 0.68s to detonate the entire web simultaneously!
    if (!this._zantetsuStep) this._zantetsuStep = 0;

    const triggerZigZagPass = (passIdx) => {
      const ww = game.renderer.worldWidth;
      const oldX = this.x;
      const oldY = this.y;
      this.spawnAfterimage(oldX, oldY, this.facing, 3, Math.min(28, passIdx * 5 + 4), 0.34);

      const center = enemy && !enemy.isDead ? enemy.x : Math.max(200, Math.min(ww - 200, this.x + this.facing * 160));
      const offsets = [
        { dx: 115, dy: 0 },
        { dx: -115, dy: -48 },
        { dx: 105, dy: -75 },
        { dx: -105, dy: -24 },
        { dx: 95, dy: 0 }
      ];
      const off = offsets[passIdx - 1] || offsets[0];
      const nextX = Math.max(85, Math.min(ww - 85, center + off.dx));
      const nextY = this.groundY + off.dy;

      this.x = nextX;
      this.y = nextY;
      this.vx = 0;
      this.vy = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      this.addSlashLine(oldX, oldY - 68, nextX, nextY - 68, 0.72);
      if (game.audio) game.audio.playDash('storm');
      game.vfx.spawnSlashArc(center, this.groundY - 78 + off.dy * 0.5, this.facing, '#38bdf8', 125, passIdx % 2 === 0 ? 1 : -1);

      if (enemy && !enemy.isDead && Math.abs(enemy.x - center) < 220) {
        enemy.takeDamage(14, this, false, 18, -95);
      }
    };

    if (t >= 0.12 && this._zantetsuStep < 1) {
      this._zantetsuStep = 1;
      triggerZigZagPass(1);
    }
    if (t >= 0.22 && this._zantetsuStep < 2) {
      this._zantetsuStep = 2;
      triggerZigZagPass(2);
    }
    if (t >= 0.32 && this._zantetsuStep < 3) {
      this._zantetsuStep = 3;
      triggerZigZagPass(3);
    }
    if (t >= 0.42 && this._zantetsuStep < 4) {
      this._zantetsuStep = 4;
      triggerZigZagPass(4);
    }
    if (t >= 0.52 && this._zantetsuStep < 5) {
      this._zantetsuStep = 5;
      triggerZigZagPass(5);
      this.y = this.groundY;
    }

    // At t = 0.68s: Kaze-Maru clicks his Odachi into his scabbard (NOTO!) -> DETONATE ALL SLASH LINES!
    if (t >= 0.68 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.y = this.groundY;
      if (game.audio) game.audio.playSkillHit('storm');
      game.renderer.triggerShake(11, 0.22);
      game.renderer.triggerAberration(6);
      game.renderer.triggerHitStop(0.05);
      game.vfx.spawnDamageText(
        this.x,
        this.y - 216,
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

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 320) {
        game.vfx.spawnShockwave(enemy.x, enemy.y - 78, 165, '#818cf8', 0.34);
        enemy.takeDamage(42, this, true, 165, -210);
      }
    }

    if (t >= 0.86) {
      this._zantetsuStep = 0;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    // KAZE-MARU UNIQUE ULTIMATE: SUSANOO — 8-HIT TELEPORTING OMNISLASH STORM!
    // Kaze-Maru teleports rapidly around the enemy in 8 omnidirectional high-speed sword slashes
    // before ascending 165px above them at t = 1.42s and plunging down with a Susanoo Heaven-Split!
    if (!this._omniStep) this._omniStep = 0;
    this.isInvulnerable = true;

    const omniSchedule = [0.24, 0.38, 0.52, 0.66, 0.80, 0.94, 1.08, 1.22];
    const omniOffsets = [
      { dx: -110, dy: -20 },
      { dx: 110, dy: -55 },
      { dx: -95, dy: -95 },
      { dx: 95, dy: -15 },
      { dx: -120, dy: -65 },
      { dx: 120, dy: -85 },
      { dx: -80, dy: -115 },
      { dx: 80, dy: -40 }
    ];

    for (let i = 0; i < omniSchedule.length; i++) {
      if (t >= omniSchedule[i] && this._omniStep === i) {
        this._omniStep = i + 1;
        const ww = game.renderer.worldWidth;
        const oldX = this.x;
        const oldY = this.y;
        this.spawnAfterimage(oldX, oldY, this.facing, 4, (i * 3 + 6) % 30, 0.36);

        const targetX = enemy && !enemy.isDead ? enemy.x : ww * 0.5;
        const off = omniOffsets[i];
        this.x = Math.max(85, Math.min(ww - 85, targetX + off.dx));
        this.y = this.groundY + off.dy;
        this.vx = 0;
        this.vy = 0;
        this.facing = targetX >= this.x ? 1 : -1;

        this.addSlashLine(
          targetX - off.dx * 0.9,
          this.groundY - 75 + off.dy * 0.6,
          targetX + off.dx * 0.9,
          this.groundY - 75 - off.dy * 0.6,
          0.45
        );

        if (game.audio) game.audio.playSkillHit('storm');
        game.renderer.triggerShake(8, 0.14);
        game.vfx.spawnSlashArc(
          targetX,
          this.groundY - 78 + off.dy * 0.4,
          this.facing,
          i % 2 === 0 ? '#38bdf8' : '#818cf8',
          138,
          i % 2 === 0 ? 1 : -1
        );

        if (enemy && !enemy.isDead) {
          enemy.takeDamage(18, this, true, 15, -115);
        }
      }
    }

    // Final Susanoo Heaven-Split Dive at t = 1.44s!
    if (t >= 1.44 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const targetX = enemy && !enemy.isDead ? enemy.x : this.x;
      this.spawnAfterimage(this.x, this.y, this.facing, 4, 22, 0.40);
      this.x = Math.max(85, Math.min(game.renderer.worldWidth - 85, targetX + this.facing * 52));
      this.y = this.groundY;
      this.addSlashLine(targetX, this.groundY - 260, targetX, this.groundY, 0.48);

      if (game.audio) {
        game.audio.playUltimate('storm');
        game.audio.playSkillHit('storm');
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
        this.groundY - 236,
        0,
        true,
        '★ SUSANOO HEAVEN-SPLIT! ★',
        '#38bdf8'
      );

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(58, this, true, 220, -245);
      }
    }

    if (t >= 1.78) {
      this._omniStep = 0;
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  drawForegroundOverlay(ctx) {
    const assets = PixelForge.initAssets();
    const sheet = assets.roninSheet;

    // 1. Render Indigo-Cyan Lightning Afterimage Clones
    if (this.afterimages.length > 0 && sheet && sheet.complete && sheet.naturalWidth > 0) {
      const cellW = sheet.naturalWidth / 30;
      const cellH = sheet.naturalHeight / 9;
      const drawW = 208;
      const drawH = 208;
      const anchorFootY = Math.round((45.5 / 52) * drawH);

      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.55);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = alpha;
        ctx.translate(Math.round(img.x), Math.round(img.y));
        ctx.scale(img.facing, 1);
        ctx.filter = 'hue-rotate(15deg) brightness(1.8) saturate(1.8)';
        ctx.drawImage(
          sheet,
          img.col * cellW,
          img.row * cellH,
          cellW,
          cellH,
          -Math.round(drawW * 0.5),
          -anchorFootY,
          drawW,
          drawH
        );
        ctx.restore();
      }
    }

    // 2. Render Persistent Judgment-Cut Lightning Slash Lines
    if (this.activeSlashLines.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const line of this.activeSlashLines) {
        const alpha = Math.max(0, 1 - line.age / line.maxLife);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = line.detonated ? '#fde047' : '#818cf8';
        ctx.lineWidth = line.detonated ? 7 : 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = line.detonated ? 3 : 1.8;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  draw(ctx, isReflection = false) {
    const assets = PixelForge.initAssets();
    const sheet = assets.roninSheet;
    if (!sheet || !sheet.complete || sheet.naturalWidth === 0) return;

    const totalCols = 30;
    const totalRows = 9;
    const cellW = sheet.naturalWidth / totalCols;
    const cellH = sheet.naturalHeight / totalRows;

    let row = 0;
    let col = 0;

    if (this.isDead || this.state === 'DEATH') {
      row = 5;
      col = Math.min(29, Math.floor((this.deathTimer / 1.05) * 30));
    } else if (this.state === 'HURT' || this.hurtTimer > 0.08) {
      row = 5;
      col = Math.min(8, Math.floor((1 - this.hurtTimer / 0.34) * 9));
    } else if (this.state === 'ULTIMATE') {
      row = 4;
      col = Math.min(29, Math.floor((this.stateTimer / 1.78) * 30));
    } else if (this.state === 'SKILL') {
      row = 3;
      col = Math.min(29, Math.floor((this.stateTimer / 0.86) * 30));
    } else if (this.state === 'AUTO_ATTACK') {
      row = 2;
      col = Math.min(29, Math.floor((this.stateTimer / 0.44) * 30));
    } else if (this.state === 'JUMP') {
      row = 8;
      const dur = Math.max(0.01, this.dashDuration || 0.56);
      col = Math.min(29, Math.floor((this.stateTimer / dur) * 30));
    } else if (this.state === 'CROUCH') {
      row = 7;
      const dur = Math.max(0.01, this.crouchDuration || 0.62);
      col = Math.min(29, Math.floor((this.stateTimer / dur) * 30));
    } else if (this.state === 'DASH' || this.state === 'DODGE') {
      row = 6;
      const dur = Math.max(0.01, this.dashDuration || 0.42);
      col = Math.min(29, Math.floor((this.stateTimer / dur) * 30));
    } else if (this.state === 'WALK') {
      row = 1;
      col = Math.floor(((this.walkPhase / (Math.PI * 2)) % 1 + 1) * 30) % 30;
    } else {
      row = 0;
      col = Math.floor(((this.walkPhase / (Math.PI * 2)) % 1 + 1) * 30) % 30;
    }

    const drawW = 208;
    const drawH = 208;
    const anchorFootY = Math.round((45.5 / 52) * drawH);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.filter = 'brightness(2.2) contrast(1.4)';
    }

    ctx.drawImage(
      sheet,
      col * cellW,
      row * cellH,
      cellW,
      cellH,
      -Math.round(drawW * 0.5),
      -anchorFootY,
      drawW,
      drawH
    );
    ctx.restore();
  }
}
