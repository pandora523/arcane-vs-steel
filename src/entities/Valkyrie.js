import { Fighter } from './Fighter.js?v=30fps34';
import { PixelForge } from '../engine/PixelForge.js?v=30fps34';

export class Valkyrie extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Freyja',
      maxHp: 1205,
      moveSpeed: 212,
      attackRange: 520,
      autoInterval: 0.99,
      lightColor: 'rgba(244, 63, 94, 1)',
      primaryColor: '#f43f5e'
    });
    this.heroId = 'valkyrie';
    this.deathSfx = 'death_priestess';
    this.skillName = 'GUNGNIR JAVELIN BARRAGE';
    this.ultName = 'VALHALLA SKY-SANCTUARY';
    this.theme = 'crimson';
    this.hasPoise = true;
    this.skillTriggerRange = 620;
    this.skillMaxCooldown = 4.75;
    this.dodgeMaxCooldown = 3.30;
    this.autoDuration = 0.60;
    this.skillDuration = 0.90;
    this.ultDuration = 1.80;
    this.crouchDuration = 0.64;
    this.dashDuration = 0.38;
    this.comboStep = 0;

    // Freyja Unique Ranged Sky-Valkyrie Mechanics:
    // 1. Grounded Stance by default (0 hover float on IDLE/WALK/AUTO_ATTACK/Cast Startups!)
    this.hoverOffset = 0;
    this.divePitchRad = 0;
    // 2. Aerial Vantage Jump Target Reticle
    this.dragoonTargetX = null;
    // 3. Active Sleek Shallow-Curving Gungnir Light-Javelins (Bezier Homing Arcs with 4x4 Pixel Trails)
    this.activeSkySpears = [];
    // 4. Colossal Bahamut Sovereign Avatar state during Ultimate (Row 3 of valkyrie_vfx.png)
    this.bahamutAvatar = null;
    // 5. Crisp Un-Rotated Crimson-Gold Valkyrie Afterimages & 30fps VFX Sheet Anims
    this.afterimages = [];
    this.afterimageSpawnAccum = 0;
    this.activeVfxAnims = [];
    this._ultTargetX = 600;
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'SKILL' && newState !== 'ULTIMATE' && newState !== 'DASH') {
      this.divePitchRad = 0;
    }
    if (newState === 'SKILL') {
      this._skillJavelinsFired = 0;
      this._skillOriginX = this.x;
      this._skillSkimTargetX = null;
      this._skillStep = 0;
    }
    if (newState === 'ULTIMATE') {
      this._spearsFired = 0;
      this._ultOriginX = this.x;
      this._ultWaypoints = null;
      this._ultStep = 0;
    }
  }

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.24) {
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + col,
      age: 0,
      maxLife
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.44, opts = {}) {
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
      glowColor: opts.glowColor || 'crimson',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: Boolean(opts.inFront)
    });
  }

  spawnGungnirSkySpear(
    startX,
    startY,
    targetX,
    targetY,
    damage = 24,
    isUlt = false,
    arcSpread = null,
    verticalArc = null
  ) {
    // Sleek, shallow horizontal/sweeping Quadratic Bezier curves (10..24 deg) so javelins streak
    // gracefully across the arena into the enemy's torso instead of spiking steeply to the ceiling!
    const spread =
      arcSpread !== null
        ? arcSpread
        : (Math.random() - 0.5) * (isUlt ? 160 : 95);
    const vArc =
      verticalArc !== null
        ? verticalArc
        : isUlt
          ? -38 + (Math.random() - 0.5) * 44
          : -24 + (Math.random() - 0.5) * 32;
    const flightDuration = isUlt ? 0.38 + Math.random() * 0.08 : 0.32;
    const ctrlX = startX + (targetX - startX) * 0.46 + spread * 0.35;
    const midY = (startY + targetY) * 0.5;
    const ctrlY = Math.max(this.groundY - 210, Math.min(this.groundY - 26, midY + vArc));

    this.activeSkySpears.push({
      startX,
      startY,
      ctrlX,
      ctrlY,
      targetX,
      targetY,
      spreadOffset: (Math.random() - 0.5) * 36,
      x: startX,
      y: startY,
      angle: targetX >= startX ? 0 : Math.PI,
      damage,
      isUlt,
      age: 0,
      flightDuration,
      maxLife: flightDuration + 0.06,
      trail: [{ x: startX, y: startY }],
      spiralPhase: Math.random() * Math.PI * 2,
      hitTargets: new Set()
    });
  }

  update(dt, enemy, game) {
    // 1. Update Crimson-Gold Valkyrie Afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    // 2. Update Active 30fps Valkyrie VFX Sheet Animations
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

    // 3. Update Colossal Bahamut Sovereign Avatar during ULTIMATE
    if (this.bahamutAvatar) {
      this.bahamutAvatar.life += dt;
      this.bahamutAvatar.x = this.x;
      this.bahamutAvatar.y = this.y;
      if (this.bahamutAvatar.life >= this.bahamutAvatar.maxLife || this.state !== 'ULTIMATE') {
        this.bahamutAvatar = null;
      }
    }

    // 4. Update Active Sleek Shallow-Curving Gungnir Light-Javelins
    if (this.activeSkySpears.length > 0 && game) {
      const ww = game.renderer ? game.renderer.worldWidth : 1600;
      const targets = game.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (let i = this.activeSkySpears.length - 1; i >= 0; i--) {
        const sp = this.activeSkySpears[i];
        sp.age += dt;
        const u = Math.min(1, sp.age / Math.max(0.05, sp.flightDuration));

        // Smooth homing lock-on during first 55% of flight so fast dashes/blinks have fair counterplay
        if (u < 0.55 && enemy && !enemy.isDead) {
          const desiredTx = Math.max(85, Math.min(ww - 85, enemy.x + sp.spreadOffset));
          const desiredTy = Math.min(this.groundY - 28, enemy.y - (sp.isUlt ? 48 : 72));
          sp.targetX += (desiredTx - sp.targetX) * Math.min(1, dt * 7.0);
          sp.targetY += (desiredTy - sp.targetY) * Math.min(1, dt * 7.0);
        }

        // Smooth progressive acceleration along the shallow Bezier curve
        const tB = Math.min(1, u * (0.65 + 0.35 * u));
        const invT = 1 - tB;

        const prevX = sp.x;
        const prevY = sp.y;
        sp.x = invT * invT * sp.startX + 2 * invT * tB * sp.ctrlX + tB * tB * sp.targetX;
        sp.y = invT * invT * sp.startY + 2 * invT * tB * sp.ctrlY + tB * tB * sp.targetY;

        const dxB = 2 * invT * (sp.ctrlX - sp.startX) + 2 * tB * (sp.targetX - sp.ctrlX);
        const dyB = 2 * invT * (sp.ctrlY - sp.startY) + 2 * tB * (sp.targetY - sp.ctrlY);
        if (Math.hypot(dxB, dyB) > 0.01) {
          sp.angle = Math.atan2(dyB, dxB);
        } else if (Math.hypot(sp.x - prevX, sp.y - prevY) > 0.01) {
          sp.angle = Math.atan2(sp.y - prevY, sp.x - prevX);
        }

        sp.trail.push({ x: sp.x, y: sp.y });
        if (sp.trail.length > 13) sp.trail.shift();

        if (Math.random() < 0.42) {
          game.vfx.spawnParticle({
            x: sp.x + (Math.random() - 0.5) * 8,
            y: sp.y + (Math.random() - 0.5) * 8,
            vx: -Math.cos(sp.angle) * 55 + (Math.random() - 0.5) * 24,
            vy: -Math.sin(sp.angle) * 55 - 12,
            size: sp.isUlt ? 4.5 : 3.5,
            color: Math.random() < 0.55 ? '#fbbf24' : '#f43f5e',
            maxLife: 0.22
          });
        }

        let hitSomeone = false;
        for (const t of targets) {
          if (t && !t.isDead && !t.isBenched && !sp.hitTargets.has(t)) {
            if (Math.abs(t.x - sp.x) < 62 && Math.abs(t.y - 68 - sp.y) < 84) {
              sp.hitTargets.add(t);
              hitSomeone = true;
              t.takeDamage(sp.damage, this, sp.isUlt, 65, sp.isUlt ? -115 : -45);
              this.gainMana(sp.isUlt ? 0 : 2.8);
              if (game.audio) game.audio.play('holy_spear', sp.x);
              game.vfx.spawnSlash(sp.x, sp.y, 96, sp.angle - 0.85, sp.angle + 0.85, '#f43f5e', 0.22);
              game.vfx.spawnBurst(sp.x, sp.y, 10, '#fbbf24', 195, { upBias: 55, size: 4.5 });
            }
          }
        }

        if (hitSomeone || u >= 1.0 || sp.y >= this.groundY - 4 || sp.age >= sp.maxLife) {
          const impX = sp.x;
          if (!hitSomeone) {
            game.vfx.spawnBurst(impX, sp.y, sp.isUlt ? 10 : 7, '#fbbf24', 175, {
              upBias: 65,
              size: 4.5
            });
          }
          if (sp.isUlt) {
            game.vfx.spawnShockwave(impX, this.groundY - 4, 108, '#f43f5e', 0.26, true);
            game.vfx.spawnSkyStrike({
              x: impX,
              y: this.groundY,
              targetX: impX,
              groundY: this.groundY,
              vx: 0,
              vy: 1400,
              type: 'gungnir_lance',
              color: '#f43f5e',
              coreColor: '#fbbf24',
              owner: this,
              target: enemy,
              damage: 0,
              maxLinger: 0.36,
              isUltimate: true
            });
          }
          this.activeSkySpears.splice(i, 1);
        }
      }
    }

    super.update(dt, enemy, game);

    // Keep Freyja firmly grounded on her shadow during IDLE / WALK / AUTO_ATTACK (zero artificial hover float!)
    this.hoverOffset = 0;
  }

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.85 + Math.random() * 0.26);
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    if (dist < 250) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game);
    }
  }

  startCrouch(_enemy, game) {
    // Grounded Sliding Valkyrie Wing-Backstep (Row 7 CROUCH — 0 vertical pop!)
    this.crouchDuration = 0.64;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isInvulnerable = true;
    this.isFlipVault = false;

    const ww = game.renderer.worldWidth;
    let retreatDir = -this.facing;
    if (this.x < 220) retreatDir = 1;
    else if (this.x > ww - 220) retreatDir = -1;

    this.vaultStartX = this.x;
    this.vaultTargetX = Math.max(85, Math.min(ww - 85, this.x + retreatDir * 185));
    this.vx = 0;
    this.vy = 0;
    this.heal(5, 'VALKYRIE GRACE');
    this.spawnAfterimage(this.x, this.y, this.facing, 7, 4, 0.22);

    if (game && game.audio) game.audio.play('dash_whoosh', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 146,
        0,
        false,
        'VALKYRIE WING-BACKSTEP!',
        '#fbbf24'
      );
      game.vfx.spawnShockwave(this.x, this.groundY - 6, 96, '#f43f5e', 0.24, true);
    }
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.64;
    const u = Math.min(1, t / dur);

    // Pure horizontal grounded sliding backstep (y stays firmly on groundY!)
    const easeU = 1 - Math.pow(1 - u, 2.0);
    this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeU;
    this.y = this.groundY;
    this.vx = 0;
    this.vy = 0;

    if (t >= 0.18 && !this.didActionFrame) {
      this.didActionFrame = true;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 320;
      const ty = enemy && !enemy.isDead ? enemy.y - 74 : this.groundY - 74;
      this.spawnGungnirSkySpear(
        this.x + this.facing * 28,
        this.y - 84,
        tx,
        ty,
        18,
        false,
        -55,
        -24
      );
      this.spawnVfxAnim(0, this.x + this.facing * 32, this.y - 80, 184, 184, 0.24, {
        vx: this.facing * 240,
        flipX: this.facing < 0,
        glowColor: 'crimson'
      });
      if (game.audio) game.audio.play('holy_spear', this.x);
      game.vfx.spawnDamageText(this.x, this.y - 150, 0, false, 'GUNGNIR JAVELIN!', '#fbbf24');
    }

    if (t >= 0.35 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 340;
      const ty = enemy && !enemy.isDead ? enemy.y - 68 : this.groundY - 68;
      this.spawnGungnirSkySpear(
        this.x + this.facing * 28,
        this.y - 82,
        tx,
        ty,
        19,
        false,
        55,
        16
      );
      if (game.audio) game.audio.play('holy_spear', this.x);
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.isCrouching = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game) {
    this.dashDuration = 0.66;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isFlipVault = true;
    this._jumpJavelins = 0;
    this.heal(6, 'VALHALLA WINGS');

    const ww = game.renderer.worldWidth;
    const clampX = (v) => Math.max(105, Math.min(ww - 105, v));
    this.vaultStartX = this.x;

    // Guarantee a WIDE horizontal wing-glide (>= 200px travel) so JUMP is a sleek 13 deg falcon skim, never a vertical spike!
    let desiredX = clampX(this.x - this.facing * 225);
    if (enemy && !enemy.isDead) {
      const side = this.x <= enemy.x ? -1 : 1;
      const candidateBack = clampX(this.x + side * 220);
      if (Math.abs(candidateBack - this.x) >= 165 && Math.abs(enemy.x - candidateBack) >= 280) {
        desiredX = candidateBack;
      } else {
        // Sweep across to a fresh wide ranged position in the open arena
        const openDir = this.x < ww * 0.5 ? 1 : -1;
        desiredX = clampX(this.x + openDir * 235);
        if (Math.abs(enemy.x - desiredX) < 220) {
          desiredX = clampX(enemy.x - side * 355);
        }
      }
    }
    this.dragoonTargetX = desiredX;
    this.vx = 0;
    this.vy = 0;
    this.spawnAfterimage(this.x, this.y, this.facing, 8, 2, 0.24);

    if (game && game.audio) game.audio.play('dash_whoosh', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 148,
        0,
        true,
        '★ VALKYRIE WING-GLIDE! ★',
        '#fbbf24'
      );
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 108, '#fbbf24', 0.26, true);
      game.vfx.spawnBurst(this.x, this.y - 54, 14, '#f43f5e', 210, { upBias: 95, size: 4.5 });
    }
  }

  onStartDash(enemy, game, _dir) {
    this.isFlipVault = false;
    if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 380) {
      const ww = game.renderer.worldWidth;
      let kiteDir = -this.facing;
      if (this.x < 190) kiteDir = 1;
      else if (this.x > ww - 190) kiteDir = -1;
      this.dashDir = kiteDir;
    }
    if (game && game.audio) game.audio.play('dash_whoosh', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 144,
        0,
        false,
        'VALKYRIE WING-SKIM!',
        '#f43f5e'
      );
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = Math.max(0.01, this.dashDuration || 0.44);
    const u = Math.min(1, t / dur);

    if (this.isFlipVault) {
      // Wide, shallow 46px-max-altitude horizontal Valkyrie Wing-Vault (zero 185px steep vertical spike!)
      const easeU = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      this.x = this.vaultStartX + (this.dragoonTargetX - this.vaultStartX) * easeU;
      this.y = this.groundY - Math.sin(u * Math.PI) * 46;
      this.vx = 0;
      this.vy = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.048) {
        this.afterimageSpawnAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 29)), 0.22);
      }

      if (u >= 0.34 && (this._jumpJavelins || 0) < 1) {
        this._jumpJavelins = 1;
        const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 360;
        const ty = enemy && !enemy.isDead ? enemy.y - 72 : this.groundY - 72;
        this.spawnGungnirSkySpear(
          this.x + this.facing * 26,
          this.y - 88,
          tx,
          ty,
          19,
          false,
          -65,
          -28
        );
        if (game.audio) game.audio.play('holy_spear', this.x);
      }
      if (u >= 0.56 && (this._jumpJavelins || 0) < 2) {
        this._jumpJavelins = 2;
        const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 360;
        const ty = enemy && !enemy.isDead ? enemy.y - 68 : this.groundY - 68;
        this.spawnGungnirSkySpear(
          this.x + this.facing * 26,
          this.y - 86,
          tx,
          ty,
          20,
          false,
          65,
          14
        );
        if (game.audio) game.audio.play('holy_spear', this.x);
      }

      if (t >= dur) {
        this.y = this.groundY;
        this.dragoonTargetX = null;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    // Ultra-low 10px horizontal wing-skim dash
    this.y = this.groundY - Math.sin(u * Math.PI) * 10;
    this.vx = this.dashDir * 530 * (1 - u * 0.50);
    if (Math.random() < 0.38) {
      this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(29, Math.floor(u * 29)), 0.18);
    }
    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateAutoAttack(_dt, enemy, game) {
    const t = this.stateTimer;
    // Grounded Ranged Valkyrie Lance-Projection Combo (Row 2 F00..F29): firmly planted sabatons, sleek horizontal javelins!
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;

    if (t >= 0.16 && !this.didActionFrame) {
      this.didActionFrame = true;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 380;
      const ty = enemy && !enemy.isDead ? enemy.y - 76 : this.groundY - 76;
      const vArc = this.comboStep % 2 === 0 ? -28 : 16;
      this.spawnGungnirSkySpear(
        this.x + this.facing * 34,
        this.y - 92,
        tx,
        ty,
        17,
        false,
        this.comboStep % 2 === 0 ? -45 : 45,
        vArc
      );
      if (game.audio) game.audio.play('holy_spear', this.x);
      game.vfx.spawnBurst(this.x + this.facing * 38, this.y - 92, 8, '#fbbf24', 155, {
        upBias: 45,
        size: 4.5
      });
    }

    if (t >= 0.36 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const step = this.comboStep;
      this.comboStep = (this.comboStep + 1) % 3;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 380;
      const ty = enemy && !enemy.isDead ? enemy.y - 72 : this.groundY - 72;

      if (step < 2) {
        const vArc = step % 2 === 0 ? 18 : -26;
        this.spawnGungnirSkySpear(
          this.x + this.facing * 34,
          this.y - 90,
          tx,
          ty,
          18,
          false,
          step % 2 === 0 ? 50 : -50,
          vArc
        );
        if (game.audio) game.audio.play('holy_spear', this.x);
      } else {
        // 3rd-Combo Finisher: Twin Converging Horizontal Pincer Javelins + Wyvern Spiral Lance-Wave!
        this.spawnVfxAnim(0, this.x + this.facing * 44, this.y - 88, 196, 196, 0.28, {
          vx: this.facing * 270,
          flipX: this.facing < 0,
          glowColor: 'gold'
        });
        this.spawnGungnirSkySpear(
          this.x + this.facing * 32,
          this.y - 102,
          tx,
          ty - 8,
          16,
          false,
          -65,
          -36
        );
        this.spawnGungnirSkySpear(
          this.x + this.facing * 32,
          this.y - 80,
          tx,
          ty + 8,
          16,
          false,
          65,
          24
        );
        if (game.audio) game.audio.play('holy_spear', this.x);
        game.vfx.spawnDamageText(
          this.x,
          this.y - 156,
          0,
          true,
          'TWIN GUNGNIR JAVELINS!',
          '#fbbf24'
        );
      }
    }

    if (t >= this.autoDuration) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._skillJavelinsFired) this._skillJavelinsFired = 0;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => Math.max(95, Math.min(ww - 95, xVal));
    const originX = this._skillOriginX !== undefined ? this._skillOriginX : this.x;

    // Initial cast aura & Row-3 Valhalla Invocation Seal (100% Grounded!)
    if (!this.didActionFrame) {
      this.didActionFrame = true;
      this._skillOriginX = this.x;

      // Pick whichever safe direction gives the widest ~165px horizontal wing-skim (~6..11 deg ultra-shallow slope!)
      const cands = [clampX(originX - 165), clampX(originX + 165)];
      let bestSkim = cands[0];
      let bestScore = -9999;
      for (const cx of cands) {
        const span = Math.abs(cx - originX);
        const eDist = enemy && !enemy.isDead ? Math.abs(enemy.x - cx) : 400;
        const safeBonus = eDist >= 255 && eDist <= 540 ? 200 : eDist < 220 ? -400 : 0;
        if (span + safeBonus > bestScore) {
          bestScore = span + safeBonus;
          bestSkim = cx;
        }
      }
      this._skillSkimTargetX = bestSkim;

      game.vfx.spawnSpecialCastAura(this, this.skillName, '✦ VALKYRIE SKILL ✦', 'crimson', false);
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 108, '#fbbf24', 0.26, true);
      this.spawnVfxAnim(3, this.x, this.groundY - 92, 196, 196, 0.30, {
        followOwner: true,
        offsetX: 0,
        offsetY: -92,
        glowColor: 'crimson'
      });
    }

    // Phase 0 (0.00s .. 0.18s -> Row 3 F00..F05): 100% Grounded Valkyrie Wing-Flare & Invocation!
    if (t < 0.18) {
      this.vx = 0;
      this.vy = 0;
      this.x = originX;
      this.y = this.groundY;
      this.divePitchRad = 0;
      return;
    }

    const skimTargetX = this._skillSkimTargetX !== null ? this._skillSkimTargetX : originX;

    // Phase 1 (0.18s .. 0.57s -> Row 3 F06..F18): Sleek Low Horizontal Wing-Skim (max lift 18px over ~165px!)
    if (t >= 0.18 && t < 0.57) {
      const uSkim = (t - 0.18) / 0.39;
      const easeX = uSkim < 0.5 ? 2 * uSkim * uSkim : 1 - Math.pow(-2 * uSkim + 2, 2) / 2;
      this.vx = 0;
      this.vy = 0;
      this.x = originX + (skimTargetX - originX) * easeX;
      this.y = this.groundY - Math.sin(uSkim * Math.PI) * 18;
      this.divePitchRad = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.045) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(18, Math.max(6, Math.floor((t / this.skillDuration) * 30)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.22);
      }
    }

    // Fan out the 6-Javelin Sleek Shallow Halo Volley across 0.18s .. 0.48s!
    const volleyTimes = [0.18, 0.24, 0.30, 0.36, 0.42, 0.48];
    const arcSpreads = [-85, 85, -55, 55, -28, 28];
    const verticalArcs = [-44, 20, -28, 14, -16, -6];

    while (
      this._skillJavelinsFired < volleyTimes.length &&
      t >= volleyTimes[this._skillJavelinsFired]
    ) {
      const idx = this._skillJavelinsFired;
      this._skillJavelinsFired++;
      const syOffsets = [-112, -74, -104, -80, -96, -88];
      const sx = this.x + this.facing * (18 + (idx % 3) * 10);
      const sy = this.y + syOffsets[idx];
      const tx =
        enemy && !enemy.isDead
          ? enemy.x + (idx - 2.5) * 12
          : this.x + this.facing * (340 + idx * 18);
      const ty = enemy && !enemy.isDead ? enemy.y - 72 : this.groundY - 72;

      this.spawnGungnirSkySpear(
        sx,
        sy,
        tx,
        ty,
        12,
        false,
        arcSpreads[idx],
        verticalArcs[idx]
      );
      if (game.audio) game.audio.play('holy_spear', sx);
    }

    // Phase 2 (0.57s .. 0.90s -> Row 3 F19..F29): 100% Grounded Forward Command Thrust & Obelisk Eruption!
    if (t >= 0.57) {
      this.x = skimTargetX;
      this.y = this.groundY;
      this.divePitchRad = 0;

      if (!this.didSecondaryAction) {
        this.didSecondaryAction = true;
        const strikeX =
          enemy && !enemy.isDead
            ? Math.max(85, Math.min(ww - 85, enemy.x))
            : Math.max(85, Math.min(ww - 85, this.x + this.facing * 360));
        if (game.audio) game.audio.play('holy_spear', strikeX);
        game.renderer.triggerShake(9, 0.18);
        game.vfx.spawnShockwave(strikeX, this.groundY - 6, 152, '#f43f5e', 0.32, true);
        game.vfx.spawnBurst(strikeX, this.groundY - 42, 18, '#fbbf24', 240, {
          upBias: 135,
          size: 5.5
        });
        this.spawnVfxAnim(4, strikeX, this.groundY - 82, 208, 208, 0.34, {
          glowColor: 'gold',
          inFront: true
        });
        game.vfx.spawnCrystalSpike({
          x: strikeX,
          groundY: this.groundY,
          width: 58,
          height: 168,
          color: '#f43f5e',
          owner: this,
          target: enemy,
          damage: 21,
          delay: 0
        });
      }
    }

    if (t >= this.skillDuration) {
      this._skillJavelinsFired = 0;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._spearsFired) this._spearsFired = 0;
    this.isInvulnerable = true;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (xVal) => Math.max(105, Math.min(ww - 105, xVal));
    const originX = this._ultOriginX !== undefined ? this._ultOriginX : this.x;
    const enemyX = enemy && !enemy.isDead ? enemy.x : ww * 0.5 + this.facing * 180;
    this._ultTargetX = enemyX;

    if (!this.didActionFrame) {
      this.didActionFrame = true;
      this._ultOriginX = this.x;

      // Span the ENTIRE safe open-arena sanctuary (~320px wide runway, max altitude 54px -> ~10..13 deg shallow Valkyrie glide!)
      const openSide = enemyX >= ww * 0.5 ? -1 : 1;
      const outerEdgeX = openSide < 0 ? 115 : ww - 115;
      const innerEdgeX = clampX(enemyX + openSide * 265);
      const midRunwayX = Math.round((outerEdgeX + innerEdgeX) * 0.5);

      if (Math.abs(originX - outerEdgeX) >= Math.abs(originX - innerEdgeX)) {
        // Sweep wide out to outerEdgeX (54px altitude), drift inward to midRunwayX (46px), falcon-glide onto innerEdgeX!
        this._ultWaypoints = {
          climb: { x: outerEdgeX, y: this.groundY - 54 },
          drift: { x: midRunwayX, y: this.groundY - 46 },
          land: { x: clampX(enemyX + openSide * 295), y: this.groundY }
        };
      } else {
        // Sweep wide inward to innerEdgeX (54px altitude), drift outward to midRunwayX (46px), falcon-glide onto outer vantage!
        this._ultWaypoints = {
          climb: { x: innerEdgeX, y: this.groundY - 54 },
          drift: { x: midRunwayX, y: this.groundY - 46 },
          land: { x: clampX(enemyX + openSide * 385), y: this.groundY }
        };
      }

      this.bahamutAvatar = {
        x: this.x,
        y: this.y,
        life: 0,
        maxLife: 1.80
      };
      game.vfx.spawnSpecialCastAura(this, this.ultName, '★ ULTIMATE OVERDRIVE ★', 'crimson', true);
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 155, '#fbbf24', 0.34, true);
    }

    // Stage 0 (0.00s .. 0.30s -> Row 4 F00..F04): 100% GROUNDED Valhalla Awakening Cast (ZERO lifting / ZERO floating!)
    if (t < 0.30) {
      this.vx = 0;
      this.vy = 0;
      this.x = originX;
      this.y = this.groundY;
      this.divePitchRad = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      return;
    }

    const wps = this._ultWaypoints || {
      climb: { x: clampX(originX - this.facing * 200), y: this.groundY - 68 },
      drift: { x: clampX(originX - this.facing * 110), y: this.groundY - 58 },
      land: { x: originX, y: this.groundY }
    };

    // Stage 1 (0.30s .. 1.44s -> Row 4 F05..F23): Wide, Shallow Sweeping Valkyrie Wing-Glides + 12 Sleek Javelins!
    if (t >= 0.30 && t < 1.44) {
      this.vx = 0;
      this.vy = 0;
      let spawnTrail = false;

      if (t < 0.68) {
        // Pass 1 (F05..F10): Long, Shallow Wing-Sweep Climb (max 68px altitude over ~220px = ~17 deg!)
        const u = (t - 0.30) / 0.38;
        const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const dx = wps.climb.x - originX;
        this.x = originX + dx * ease;
        this.y = this.groundY + (wps.climb.y - this.groundY) * ease;
        this.facing = Math.abs(dx) > 25 ? (dx >= 0 ? 1 : -1) : (enemyX >= this.x ? 1 : -1);
        this.divePitchRad = -0.17;
        spawnTrail = true;
      } else if (t < 1.10) {
        // Pass 2 (F11..F17): Level Mid-Sky Valhalla Command Drift (~5 deg near-horizontal glide!)
        const u = (t - 0.68) / 0.42;
        const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        this.x = wps.climb.x + (wps.drift.x - wps.climb.x) * ease;
        this.y = wps.climb.y + (wps.drift.y - wps.climb.y) * ease;
        this.facing = enemyX >= this.x ? 1 : -1;
        this.divePitchRad = -0.04;
        if (this._ultStep < 1 && u >= 0.25) {
          this._ultStep = 1;
          this.spawnVfxAnim(0, this.x + this.facing * 38, this.y - 84, 208, 208, 0.28, {
            vx: this.facing * 260,
            flipX: this.facing < 0,
            glowColor: 'gold'
          });
        }
      } else {
        // Pass 3 (F18..F23): Long, Shallow Falcon-Wing Touchdown Glide (58px descent over ~115px = ~22 deg!)
        const u = (t - 1.10) / 0.34;
        const ease = u * u * (3 - 2 * u);
        this.x = wps.drift.x + (wps.land.x - wps.drift.x) * ease;
        this.y = wps.drift.y + (wps.land.y - wps.drift.y) * ease;
        this.facing = enemyX >= this.x ? 1 : -1;
        this.divePitchRad = 0.17;
        spawnTrail = true;
      }

      if (spawnTrail) {
        this.afterimageSpawnAccum += dt;
        if (this.afterimageSpawnAccum >= 0.034) {
          this.afterimageSpawnAccum = 0;
          const col = Math.min(23, Math.max(5, Math.floor((t / this.ultDuration) * 30)));
          this.spawnAfterimage(this.x, this.y, this.facing, 4, col, 0.24);
        }
      }

      // Command 12 Sleek Shallow-Curving Gungnir Light-Javelins across the arena!
      const spearInterval = 0.082;
      const expectedSpears = Math.min(12, Math.floor(Math.max(0, t - 0.34) / spearInterval) + 1);
      while (this._spearsFired < expectedSpears) {
        const idx = this._spearsFired;
        this._spearsFired++;

        const sySlots = [-124, -76, -114, -84, -104, -92, -128, -72, -110, -80, -118, -88];
        const sx = this.x + this.facing * (14 + (idx % 4) * 10);
        const sy = this.y + sySlots[idx % sySlots.length];

        const arcSpreadSlots = [-95, 95, -65, 65, -35, 35, -115, 115, -45, 45, -80, 80];
        const vArcSlots = [-56, 18, -42, 12, -28, -8, -62, 22, -34, 8, -48, 14];

        const tx =
          enemy && !enemy.isDead
            ? enemy.x + (Math.random() - 0.5) * 76
            : ww * 0.5 + (idx - 5.5) * 58;
        const ty = enemy && !enemy.isDead ? enemy.y - 44 : this.groundY - 44;

        this.spawnGungnirSkySpear(
          sx,
          sy,
          Math.max(90, Math.min(ww - 90, tx)),
          ty,
          10,
          true,
          arcSpreadSlots[idx % arcSpreadSlots.length],
          vArcSlots[idx % vArcSlots.length]
        );
        if (game.audio) game.audio.play('holy_spear', sx);
      }
      return;
    }

    // Stage 2 (1.44s .. 1.80s -> Row 4 F24..F29): 100% Grounded Sovereign Forward Thrust & Recovery!
    this.x = wps.land.x;
    this.y = this.groundY;
    this.divePitchRad = 0;
    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    if (!this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const impactX = Math.max(90, Math.min(ww - 90, enemy && !enemy.isDead ? enemy.x : ww * 0.5));

      if (game.audio) {
        game.audio.play('thunder_slam', impactX);
      }
      game.renderer.triggerShake(16, 0.30);
      game.renderer.triggerAberration(9);
      game.renderer.triggerHitStop(0.065);
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 128, '#fbbf24', 0.30, true);
      game.vfx.spawnShockwave(impactX, this.groundY - 6, 265, '#fbbf24', 0.44, true);
      game.vfx.spawnSlash(impactX, this.groundY - 78, 195, -Math.PI, Math.PI, '#f43f5e', 0.38);
      game.vfx.spawnBurst(impactX, this.groundY - 58, 36, '#f43f5e', 330, {
        upBias: 195,
        size: 7
      });

      this.spawnVfxAnim(4, impactX, this.groundY - 96, 236, 236, 0.42, {
        glowColor: 'gold',
        inFront: true
      });

      const offsets = [0, -105, 105, -210, 210];
      offsets.forEach((off, i) => {
        const sx = Math.max(85, Math.min(ww - 85, impactX + off));
        game.vfx.spawnCrystalSpike({
          x: sx,
          groundY: this.groundY,
          width: i === 0 ? 68 : 56,
          height: i === 0 ? 195 : 162,
          color: '#f43f5e',
          owner: this,
          target: enemy,
          damage: i === 0 ? 14 : 8,
          delay: Math.floor(Math.abs(off) / 105) * 0.06
        });
      });

      game.vfx.spawnDamageText(
        impactX,
        this.groundY - 178,
        0,
        true,
        '★ GUNGNIR SOVEREIGN JUDGMENT! ★',
        '#fbbf24'
      );

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(42, this, true, 235, -245);
      }
    }

    if (t >= this.ultDuration) {
      this._spearsFired = 0;
      this.bahamutAvatar = null;
      this.y = this.groundY;
      this.divePitchRad = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

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
    glowColor = 'crimson'
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
      glowColor === 'gold' ? renderer?.glowGold || renderer?.glowCrimson : renderer?.glowCrimson;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.38);
      const gw = Math.round(w * 1.15);
      const gh = Math.round(h * 1.15);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.44);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  drawPixelValhallaSeal4x4(ctx) {
    if (this.state !== 'ULTIMATE') return;
    const snap4 = (v) => Math.round(v / 4) * 4;
    const cx = this._ultTargetX || this.x;
    const gy = this.groundY - 4;
    const phase = this.stateTimer * 7.5;
    const rx = 156;
    const ry = 18;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < 44; i++) {
      const ang = (i / 44) * Math.PI * 2 + phase;
      const px = snap4(cx + Math.cos(ang) * rx);
      const py = snap4(gy + Math.sin(ang) * ry);
      ctx.globalAlpha = 0.76;
      ctx.fillStyle = i % 4 === 0 ? '#ffffff' : i % 2 === 0 ? '#fbbf24' : '#f43f5e';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    for (let d = 0; d < 8; d++) {
      const da = (d / 8) * Math.PI * 2 - phase * 1.15;
      const dx = snap4(cx + Math.cos(da) * rx);
      const dy = snap4(gy + Math.sin(da) * ry);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(dx - 4, dy - 4, 8, 8);
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(dx - 2, dy - 2, 4, 4);

      const moteY = snap4(gy - ((this.stateTimer * 135 + d * 28) % 116));
      ctx.globalAlpha = 0.68;
      ctx.fillStyle = d % 2 === 0 ? '#fbbf24' : '#fda4af';
      ctx.fillRect(dx - 2, moteY - 2, 4, 4);
    }

    ctx.restore();
  }

  /**
   * Renders a Sleek, Shallow-Angled 4x4 Pixel Dragonfire Valkyrie Mach-Cone & Horizontal Feather Stream
   * during Freyja's grounded command thrust (`SKILL` 0.54..0.68s) and shallow `ULTIMATE` wing-sweeps.
   */
  drawPixelValkyrieMachCone4x4(ctx) {
    const isSkillThrust = this.state === 'SKILL' && this.stateTimer >= 0.54 && this.stateTimer < 0.68;
    const isUltSweep =
      this.state === 'ULTIMATE' &&
      ((this.stateTimer >= 0.32 && this.stateTimer < 0.66) ||
        (this.stateTimer >= 1.10 && this.stateTimer < 1.44));
    if (!isSkillThrust && !isUltSweep) return;

    const isSovereignGlide = this.state === 'ULTIMATE' && this.stateTimer >= 1.10;
    const snap4 = (v) => Math.round(v / 4) * 4;
    const baseAngle = this.divePitchRad || 0;
    const ux = Math.cos(baseAngle) * this.facing;
    const uy = Math.sin(baseAngle);
    const nx = -uy;
    const ny = ux;

    const cx = this.x;
    const cy = this.y - 82;
    const tipX = cx + ux * 68;
    const tipY = cy + uy * 68;
    const phase = this.stateTimer * 32.0;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const side of [-1, 1]) {
      for (let step = 0; step <= 16; step++) {
        const backDist = step * 6.5;
        const spread = 4 + step * (isSovereignGlide ? 2.4 : 2.0);
        const wx = snap4(tipX - ux * backDist + nx * side * spread);
        const wy = snap4(tipY - uy * backDist + ny * side * spread);

        ctx.globalAlpha = Math.max(0.14, 0.88 - step * 0.045);
        ctx.fillStyle =
          step <= 3
            ? '#ffffff'
            : step % 2 === 0
              ? '#fbbf24'
              : isSovereignGlide
                ? '#fda4af'
                : '#f43f5e';
        ctx.fillRect(wx - 2, wy - 2, 4, 4);
      }
    }

    for (let h = 0; h <= 16; h++) {
      const dist = h * 6.5;
      const wave = Math.sin(h * 0.65 - phase) * (8 + h * 0.5);
      const hx = snap4(tipX - ux * dist + nx * wave);
      const hy = snap4(tipY - uy * dist + ny * wave);
      ctx.globalAlpha = Math.max(0.14, 0.80 - h * 0.042);
      ctx.fillStyle = h % 3 === 0 ? '#fef9c3' : h % 2 === 0 ? '#fbbf24' : '#f43f5e';
      ctx.fillRect(hx - 2, hy - 2, 4, 4);
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().valkyrie;
    const vfxSheet = sprites?.vfx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    this.drawPixelValhallaSeal4x4(ctx);

    if (this.bahamutAvatar && vfxSheet && vfxSheet.complete) {
      const u = Math.min(1, Math.max(0, this.bahamutAvatar.life / this.bahamutAvatar.maxLife));
      const col = Math.min(29, Math.floor(u * 30));
      const fade = u < 0.10 ? u / 0.10 : u > 0.84 ? (1 - u) / 0.16 : 1.0;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        this.bahamutAvatar.x,
        this.bahamutAvatar.y - 118,
        244,
        244,
        fade * 0.86,
        this.facing < 0,
        renderer,
        'crimson'
      );
    }

    if (this.afterimages.length > 0 && sprites && sprites.sheet && sprites.sheet.complete) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.50);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 4) * 4, Math.round((img.y + 4) / 4) * 4);
        ctx.scale(img.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawAfterimageFrame(ctx, sprites, img.frameIdx || 190, 208, 208);
        ctx.restore();
      }
    }

    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        if (v.inFront) continue;
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
          fade * 0.90,
          v.flipX,
          renderer,
          v.glowColor
        );
      }
    }

    if (this.dragoonTargetX !== null && this.state === 'JUMP') {
      const tx = Math.round(this.dragoonTargetX / 4) * 4;
      const ty = Math.round((this.groundY - 4) / 4) * 4;
      const pulse = 0.7 + 0.3 * Math.sin(this.stateTimer * 28);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.78 * pulse;
      for (let deg = 0; deg < 360; deg += 15) {
        const a = (deg * Math.PI) / 180 + this.stateTimer * 6;
        const rx = Math.round((tx + Math.cos(a) * 44) / 4) * 4;
        const ry = Math.round((ty + Math.sin(a) * 12) / 4) * 4;
        ctx.fillStyle = deg % 45 === 0 ? '#fbbf24' : '#f43f5e';
        ctx.fillRect(rx - 2, ry - 2, 4, 4);
      }
      ctx.restore();
    }

    if (this.state === 'SKILL' && this.stateTimer < 0.56) {
      const cx = Math.round(this.x / 4) * 4;
      const cy = Math.round((this.y - 88) / 4) * 4;
      const env = Math.sin(Math.min(1, this.stateTimer / 0.56) * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let deg = 0; deg < 360; deg += 12) {
        const a = (deg * Math.PI) / 180 + this.stateTimer * 5.0;
        const hx = Math.round((cx + Math.cos(a) * 66) / 4) * 4;
        const hy = Math.round((cy + Math.sin(a) * 34) / 4) * 4;
        ctx.globalAlpha = 0.80 * env;
        ctx.fillStyle = deg % 36 === 0 ? '#ffffff' : deg % 24 === 0 ? '#fbbf24' : '#f43f5e';
        ctx.fillRect(hx - 2, hy - 2, 4, 4);
      }
      ctx.restore();
    }

    if (this.activeSkySpears.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (const sp of this.activeSkySpears) {
        if (sp.trail && sp.trail.length >= 2) {
          for (let k = 0; k < sp.trail.length - 1; k++) {
            const p0 = sp.trail[k];
            const p1 = sp.trail[k + 1];
            const segDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
            const steps = Math.max(1, Math.ceil(segDist / 4));
            for (let s = 0; s < steps; s++) {
              const uSeg = (k + s / steps) / Math.max(1, sp.trail.length - 1);
              const px = Math.round((p0.x + (p1.x - p0.x) * (s / steps)) / 4) * 4;
              const py = Math.round((p0.y + (p1.y - p0.y) * (s / steps)) / 4) * 4;

              ctx.globalAlpha = (sp.isUlt ? 0.62 : 0.50) * uSeg;
              ctx.fillStyle = '#f43f5e';
              const auraSz = uSeg > 0.55 ? 12 : 8;
              ctx.fillRect(px - auraSz * 0.5, py - auraSz * 0.5, auraSz, auraSz);

              if (uSeg > 0.25) {
                ctx.globalAlpha = (sp.isUlt ? 0.90 : 0.82) * uSeg;
                ctx.fillStyle = uSeg > 0.78 ? '#fef9c3' : '#fbbf24';
                ctx.fillRect(px - 2, py - 2, 4, 4);
              }
            }
          }
        }

        if (sp.isUlt) {
          const gtx = Math.round(sp.targetX / 4) * 4;
          const gty = Math.round((this.groundY - 4) / 4) * 4;
          ctx.globalAlpha = 0.56;
          for (let deg = 0; deg < 360; deg += 30) {
            const a = (deg * Math.PI) / 180;
            const rx = Math.round((gtx + Math.cos(a) * 32) / 4) * 4;
            const ry = Math.round((gty + Math.sin(a) * 8) / 4) * 4;
            ctx.fillStyle = deg % 60 === 0 ? '#fbbf24' : '#f43f5e';
            ctx.fillRect(rx - 2, ry - 2, 4, 4);
          }
        }

        const ux = Math.cos(sp.angle);
        const uy = Math.sin(sp.angle);
        const nx = -uy;
        const ny = ux;
        const jScale = sp.isUlt ? 1.15 : 1.0;

        const putJavelinPx = (localAlong, localPerp, col, sz = 4, alpha = 0.96, additive = false) => {
          const wx = sp.x + (ux * localAlong + nx * localPerp) * jScale;
          const wy = sp.y + (uy * localAlong + ny * localPerp) * jScale;
          const px = Math.round(wx / 4) * 4;
          const py = Math.round(wy / 4) * 4;
          ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
          ctx.globalAlpha = alpha;
          ctx.fillStyle = col;
          ctx.fillRect(px - sz * 0.5, py - sz * 0.5, sz, sz);
        };

        for (let d = -44; d <= 8; d += 4) {
          putJavelinPx(d, 0, d < -20 ? '#e11d48' : '#fbbf24', 4, 0.95, false);
        }

        for (const sign of [-1, 1]) {
          putJavelinPx(4, sign * 4, '#fbbf24', 4, 0.98, false);
          putJavelinPx(0, sign * 8, '#fbbf24', 4, 0.98, false);
          putJavelinPx(-4, sign * 12, '#f43f5e', 4, 0.95, false);
          putJavelinPx(-8, sign * 16, '#fef08a', 4, 0.92, true);
        }

        for (let d = 8; d <= 40; d += 4) {
          if (d <= 24) {
            putJavelinPx(d, -4, '#fbbf24', 4, 0.95, true);
            putJavelinPx(d, 4, '#fbbf24', 4, 0.95, true);
          }
          putJavelinPx(d, 0, '#ffffff', 4, 1.0, false);
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  drawUltimateForeground(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().valkyrie;
    const vfxSheet = sprites?.vfx;

    this.drawPixelValkyrieMachCone4x4(ctx);

    if (this.activeVfxAnims.length > 0 && vfxSheet && vfxSheet.complete) {
      for (const v of this.activeVfxAnims) {
        if (!v.inFront) continue;
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
          fade * 0.94,
          v.flipX,
          renderer,
          v.glowColor
        );
      }
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const assets = PixelForge.initAssets();
    const sprites = assets.valkyrie;
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
