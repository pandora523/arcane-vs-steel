import { Fighter } from './Fighter.js?v=30fps32';
import { PixelForge } from '../engine/PixelForge.js?v=30fps32';

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
    // 3. Active Curving Gungnir Light-Javelins (Bezier Homing Arcs with 4x4 Pixel Trails)
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
      this._skillStep = 0;
    }
    if (newState === 'ULTIMATE') {
      this._spearsFired = 0;
      this._ultOriginX = this.x;
      this._ultStep = 0;
    }
  }

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.26) {
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

  spawnGungnirSkySpear(startX, startY, targetX, targetY, damage = 24, isUlt = false, arcSpread = null) {
    // Compute a sweeping Quadratic Bezier control point so javelins fan out into a celestial halo arc
    // and curve dynamically onto the target.
    const spread =
      arcSpread !== null
        ? arcSpread
        : (Math.random() - 0.5) * (isUlt ? 340 : 190);
    const flightDuration = isUlt ? 0.46 + Math.random() * 0.10 : 0.38;
    const ctrlX = (startX + targetX) * 0.5 + spread * 0.95;
    const ctrlY = Math.min(startY, targetY) - (isUlt ? 155 + Math.abs(spread) * 0.38 : 105 + Math.abs(spread) * 0.28);

    this.activeSkySpears.push({
      startX,
      startY,
      ctrlX,
      ctrlY,
      targetX,
      targetY,
      spreadOffset: (Math.random() - 0.5) * 44,
      x: startX,
      y: startY,
      angle: -Math.PI * 0.35,
      damage,
      isUlt,
      age: 0,
      flightDuration,
      maxLife: flightDuration + 0.08,
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

    // 4. Update Active Curving Gungnir Light-Javelins along their Bezier Homing Arcs
    if (this.activeSkySpears.length > 0 && game) {
      const ww = game.renderer ? game.renderer.worldWidth : 1600;
      const targets = game.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (let i = this.activeSkySpears.length - 1; i >= 0; i--) {
        const sp = this.activeSkySpears[i];
        sp.age += dt;
        const u = Math.min(1, sp.age / Math.max(0.05, sp.flightDuration));

        // Smooth homing lock-on during first 52% of the arc so fast dashes/blinks have fair counterplay
        if (u < 0.52 && enemy && !enemy.isDead) {
          const desiredTx = Math.max(85, Math.min(ww - 85, enemy.x + sp.spreadOffset));
          sp.targetX += (desiredTx - sp.targetX) * Math.min(1, dt * 6.2);
        }

        // Ease-in-out acceleration along the quadratic Bezier curve: graceful halo fan-out -> supersonic dive!
        const easeU =
          u < 0.32
            ? 0.5 * (u / 0.32) * (u / 0.32) * 0.32
            : 0.16 + 0.84 * Math.pow((u - 0.32) / 0.68, 1.32);
        const tB = Math.min(1, easeU);
        const invT = 1 - tB;

        const prevX = sp.x;
        const prevY = sp.y;
        sp.x = invT * invT * sp.startX + 2 * invT * tB * sp.ctrlX + tB * tB * sp.targetX;
        sp.y = invT * invT * sp.startY + 2 * invT * tB * sp.ctrlY + tB * tB * sp.targetY;

        // Analytical Bezier derivative for exact tangent rotation along the curve
        const dxB = 2 * invT * (sp.ctrlX - sp.startX) + 2 * tB * (sp.targetX - sp.ctrlX);
        const dyB = 2 * invT * (sp.ctrlY - sp.startY) + 2 * tB * (sp.targetY - sp.ctrlY);
        if (Math.hypot(dxB, dyB) > 0.01) {
          sp.angle = Math.atan2(dyB, dxB);
        } else if (Math.hypot(sp.x - prevX, sp.y - prevY) > 0.01) {
          sp.angle = Math.atan2(sp.y - prevY, sp.x - prevX);
        }

        sp.trail.push({ x: sp.x, y: sp.y });
        if (sp.trail.length > 14) sp.trail.shift();

        // Spawn golden-crimson feather sparks along the curved flight path
        if (Math.random() < 0.45) {
          game.vfx.spawnParticle({
            x: sp.x + (Math.random() - 0.5) * 10,
            y: sp.y + (Math.random() - 0.5) * 10,
            vx: -Math.cos(sp.angle) * 55 + (Math.random() - 0.5) * 28,
            vy: -Math.sin(sp.angle) * 55 - 20,
            size: sp.isUlt ? 4.5 : 3.5,
            color: Math.random() < 0.55 ? '#fbbf24' : '#f43f5e',
            maxLife: 0.24
          });
        }

        for (const t of targets) {
          if (t && !t.isDead && !t.isBenched && !sp.hitTargets.has(t)) {
            if (Math.abs(t.x - sp.x) < 60 && Math.abs(t.y - 68 - sp.y) < 82) {
              sp.hitTargets.add(t);
              t.takeDamage(sp.damage, this, sp.isUlt, 65, sp.isUlt ? -115 : -45);
              this.gainMana(sp.isUlt ? 0 : 2.8);
              if (game.audio) game.audio.play('holy_spear', sp.x);
              game.vfx.spawnSlash(sp.x, sp.y, 98, sp.angle - 0.9, sp.angle + 0.9, '#f43f5e', 0.22);
              game.vfx.spawnBurst(sp.x, sp.y, 10, '#fbbf24', 195, { upBias: 65, size: 4.5 });
            }
          }
        }

        if (u >= 1.0 || sp.y >= this.groundY - 4 || sp.age >= sp.maxLife) {
          const impX = sp.x;
          game.vfx.spawnShockwave(impX, this.groundY - 4, sp.isUlt ? 118 : 82, '#f43f5e', 0.28, true);
          game.vfx.spawnBurst(impX, this.groundY - 12, sp.isUlt ? 12 : 8, '#fbbf24', 185, {
            upBias: 105,
            size: 5
          });
          // Render the 30fps HD-2D Valhalla Impact Crater & Embedded Gungnir Sky-Lance (Row 1 of valkyrie_vfx.png)!
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
            maxLinger: sp.isUlt ? 0.42 : 0.30,
            isUltimate: sp.isUlt
          });
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
    if (dist < 240) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game);
    }
  }

  startCrouch(enemy, game) {
    this.crouchDuration = 0.64;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isInvulnerable = true;
    this.isFlipVault = true;

    const ww = game.renderer.worldWidth;
    let retreatDir = -this.facing;
    if (this.x < 210) retreatDir = 1;
    else if (this.x > ww - 210) retreatDir = -1;

    this.vaultStartX = this.x;
    this.vaultTargetX = Math.max(85, Math.min(ww - 85, this.x + retreatDir * 175));
    this.vx = 0;
    this.vy = 0;
    this.heal(5, 'VALKYRIE GRACE');
    this.spawnAfterimage(this.x, this.y, this.facing, 7, 4, 0.24);

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
      game.vfx.spawnShockwave(this.x, this.groundY - 6, 96, '#f43f5e', 0.26, true);
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.64;
    const u = Math.min(1, t / dur);

    const easeU = 1 - Math.pow(1 - u, 1.8);
    this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeU;
    this.y = this.groundY - Math.sin(u * Math.PI) * 58;
    this.vx = 0;
    this.vy = 0;

    if (t >= 0.18 && !this.didActionFrame) {
      this.didActionFrame = true;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 320;
      this.spawnGungnirSkySpear(
        this.x + this.facing * 24,
        this.y - 98,
        tx - 16,
        this.groundY - 24,
        18,
        false,
        -this.facing * 105
      );
      this.spawnVfxAnim(0, this.x + this.facing * 30, this.y - 84, 184, 184, 0.24, {
        vx: this.facing * 220,
        flipX: this.facing < 0,
        glowColor: 'crimson'
      });
      if (game.audio) game.audio.play('holy_spear', this.x);
      game.vfx.spawnDamageText(this.x, this.y - 150, 0, false, 'GUNGNIR JAVELIN!', '#fbbf24');
    }

    if (t >= 0.35 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 340;
      this.spawnGungnirSkySpear(
        this.x + this.facing * 24,
        this.y - 98,
        tx + 18,
        this.groundY - 24,
        19,
        false,
        this.facing * 125
      );
      if (game.audio) game.audio.play('holy_spear', this.x);
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isFlipVault = false;
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
    this.vaultStartX = this.x;
    // Ranged Aerial Repositioning Vault: leap to a safe ranged vantage (390px from enemy), never onto their feet!
    let desiredX = this.x - this.facing * 165;
    if (enemy && !enemy.isDead) {
      const side = this.x < enemy.x ? -1 : 1;
      desiredX = enemy.x + side * 395;
      if (desiredX < 140 || desiredX > ww - 140) {
        desiredX = enemy.x - side * 365;
      }
    }
    this.dragoonTargetX = Math.max(110, Math.min(ww - 110, desiredX));
    this.vx = 0;
    this.vy = 0;
    this.spawnAfterimage(this.x, this.y, this.facing, 8, 2, 0.26);

    if (game && game.audio) game.audio.play('dash_whoosh', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 148,
        0,
        true,
        '★ VALKYRIE SKY-VAULT! ★',
        '#fbbf24'
      );
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 112, '#fbbf24', 0.28, true);
      game.vfx.spawnBurst(this.x, this.y - 60, 16, '#f43f5e', 230, { upBias: 155, size: 5 });
    }
  }

  onStartDash(enemy, game, _dir) {
    this.isFlipVault = false;
    // If Freyja is already within ranged javelin distance, glide backward/reposition to keep distance!
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
        'VALKYRIE WING-GLIDE!',
        '#f43f5e'
      );
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = Math.max(0.01, this.dashDuration || 0.44);
    const u = Math.min(1, t / dur);

    if (this.isFlipVault) {
      const easeU = 1 - Math.pow(1 - u, 1.85);
      this.x = this.vaultStartX + (this.dragoonTargetX - this.vaultStartX) * easeU;
      this.y = this.groundY - Math.sin(u * Math.PI) * 185;
      this.vx = 0;
      this.vy = 0;

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.045) {
        this.afterimageSpawnAccum = 0;
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 29)), 0.22);
      }

      // Hurl 2 high-altitude curving Gungnir Javelins at the enemy from the apex of her sky-vault!
      if (u >= 0.34 && (this._jumpJavelins || 0) < 1) {
        this._jumpJavelins = 1;
        const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 360;
        this.spawnGungnirSkySpear(
          this.x + this.facing * 24,
          this.y - 96,
          tx - 22,
          this.groundY - 28,
          19,
          false,
          -125
        );
        if (game.audio) game.audio.play('holy_spear', this.x);
      }
      if (u >= 0.54 && (this._jumpJavelins || 0) < 2) {
        this._jumpJavelins = 2;
        const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 360;
        this.spawnGungnirSkySpear(
          this.x + this.facing * 24,
          this.y - 96,
          tx + 22,
          this.groundY - 28,
          20,
          false,
          125
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

    this.y = this.groundY - Math.sin(u * Math.PI) * 28;
    this.vx = this.dashDir * 520 * (1 - u * 0.52);
    if (Math.random() < 0.38) {
      this.spawnAfterimage(this.x, this.y, this.facing, 6, Math.min(29, Math.floor(u * 29)), 0.20);
    }
    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    // Grounded Ranged Valkyrie Javelin Combo (Row 2 F00..F29): firmly planted sabatons, zero melee lunge!
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;

    if (t >= 0.16 && !this.didActionFrame) {
      this.didActionFrame = true;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 380;
      const arcDir = this.comboStep % 2 === 0 ? -95 : 95;
      this.spawnGungnirSkySpear(
        this.x + this.facing * 28,
        this.y - 106,
        tx,
        this.groundY - 32,
        17,
        false,
        arcDir
      );
      if (game.audio) game.audio.play('holy_spear', this.x);
      game.vfx.spawnBurst(this.x + this.facing * 34, this.y - 106, 8, '#fbbf24', 155, {
        upBias: 60,
        size: 4.5
      });
    }

    if (t >= 0.35 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const step = this.comboStep;
      this.comboStep = (this.comboStep + 1) % 3;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 380;

      if (step < 2) {
        // Second curving Gungnir Javelin on opposite arc (Row 2 F16..F23 Wing-Whip Projection)
        const arcDir = step % 2 === 0 ? 115 : -115;
        this.spawnGungnirSkySpear(
          this.x + this.facing * 28,
          this.y - 110,
          tx + (Math.random() - 0.5) * 28,
          this.groundY - 28,
          18,
          false,
          arcDir
        );
        if (game.audio) game.audio.play('holy_spear', this.x);
      } else {
        // 3rd-Combo Finisher: Twin Converging Valkyrie Javelins + Wyvern Spiral Lance-Wave!
        this.spawnVfxAnim(0, this.x + this.facing * 42, this.y - 92, 196, 196, 0.28, {
          vx: this.facing * 260,
          flipX: this.facing < 0,
          glowColor: 'gold'
        });
        this.spawnGungnirSkySpear(
          this.x + this.facing * 24,
          this.y - 122,
          tx - 18,
          this.groundY - 24,
          16,
          false,
          -155
        );
        this.spawnGungnirSkySpear(
          this.x + this.facing * 24,
          this.y - 98,
          tx + 18,
          this.groundY - 24,
          16,
          false,
          155
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
      game.vfx.spawnSpecialCastAura(this, this.skillName, '✦ VALKYRIE SKILL ✦', 'crimson', false);
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 108, '#fbbf24', 0.26, true);
      this.spawnVfxAnim(3, this.x, this.groundY - 96, 196, 196, 0.30, {
        followOwner: true,
        offsetX: 0,
        offsetY: -96,
        glowColor: 'crimson'
      });
    }

    // Phase 0 (0.00s .. 0.18s -> Row 3 F00..F05): 100% Grounded Valkyrie Wing-Flare & Skyward Invocation!
    if (t < 0.18) {
      this.vx = 0;
      this.vy = 0;
      this.x = originX;
      this.y = this.groundY;
      this.divePitchRad = 0;
      return;
    }

    // Compute a safe ranged landing vantage so her diagonal command glide stays firmly at range (~280-390px from enemy)
    let glideEndX = clampX(originX + this.facing * 42);
    if (enemy && !enemy.isDead) {
      const distAfter = Math.abs(enemy.x - glideEndX);
      if (distAfter < 275) {
        const side = originX <= enemy.x ? -1 : 1;
        glideEndX = clampX(enemy.x + side * 295);
      }
    }

    // Phase 1 (0.18s .. 0.45s -> Row 3 F06..F14): Airborne Winged Valkyrie Halo Barrage!
    if (t >= 0.18 && t < 0.45) {
      const uAir = (t - 0.18) / 0.27;
      this.vx = 0;
      this.vy = 0;
      this.x = originX;
      // Smoothly rises to groundY - 92 and holds at groundY - 76 for the diagonal command thrust
      this.y = this.groundY - Math.sin(uAir * Math.PI * 0.72) * 96;
      this.divePitchRad = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
    }

    // Fan out the 6-Javelin Celestial Halo Volley across 0.18s .. 0.43s!
    const volleyTimes = [0.18, 0.23, 0.28, 0.33, 0.38, 0.43];
    const arcSpreads = [-210, 210, -140, 140, -75, 75];
    const crownAngles = [-2.35, -0.75, -2.05, -1.05, -1.75, -1.35];

    while (
      this._skillJavelinsFired < volleyTimes.length &&
      t >= volleyTimes[this._skillJavelinsFired]
    ) {
      const idx = this._skillJavelinsFired;
      this._skillJavelinsFired++;
      const cAng = crownAngles[idx];
      const sx = this.x + Math.cos(cAng) * 68;
      const sy = this.y - 84 + Math.sin(cAng) * 44;
      const tx =
        enemy && !enemy.isDead
          ? enemy.x + (idx - 2.5) * 18
          : this.x + this.facing * (340 + idx * 24);

      this.spawnGungnirSkySpear(
        sx,
        sy,
        tx,
        this.groundY - 22,
        12,
        false,
        arcSpreads[idx]
      );
      if (game.audio) game.audio.play('holy_spear', sx);
    }

    // Phase 2 (0.45s .. 0.57s -> Row 3 F15..F18): Diagonal Valkyrie Sky-Spear Command Glide (+26 deg)!
    if (t >= 0.45 && t < 0.57) {
      const uDive = Math.min(1, (t - 0.45) / 0.12);
      const startDiveY = this.groundY - 74;
      this.vx = 0;
      this.vy = 0;
      this.x = originX + (glideEndX - originX) * uDive;
      this.y = startDiveY + (this.groundY - startDiveY) * uDive;
      this.divePitchRad = 0.45; // +26 deg matching Row 3 F15..F18!

      this.afterimageSpawnAccum += dt;
      if (this.afterimageSpawnAccum >= 0.026) {
        this.afterimageSpawnAccum = 0;
        const col = Math.min(18, Math.max(15, 15 + Math.floor(uDive * 4)));
        this.spawnAfterimage(this.x, this.y, this.facing, 3, col, 0.24);
      }
      return;
    }

    // Phase 3 (0.57s .. 0.90s -> Row 3 F19..F29): Grounded Touchdown & Dragonfire Obelisk Eruption!
    if (t >= 0.57) {
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
    const clampX = (xVal) => Math.max(125, Math.min(ww - 125, xVal));
    const originX = this._ultOriginX !== undefined ? this._ultOriginX : this.x;
    const enemyX = enemy && !enemy.isDead ? enemy.x : ww * 0.5 + this.facing * 180;
    this._ultTargetX = enemyX;

    if (!this.didActionFrame) {
      this.didActionFrame = true;
      this._ultOriginX = this.x;
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

    // Safe Ranged Sanctuary Waypoints (always keeping ~290-370px ranged distance from enemyX!)
    const side = originX <= enemyX ? -1 : 1;
    let baseSanctuaryX = enemyX + side * 335;
    if (baseSanctuaryX < 150 || baseSanctuaryX > ww - 150) {
      baseSanctuaryX = clampX(ww * 0.5 + side * 245);
    }
    const dirToEnemy = enemyX >= baseSanctuaryX ? 1 : -1;
    const wpLaunch = { x: clampX(baseSanctuaryX - dirToEnemy * 42), y: this.groundY - 168 };
    const wpCrown = { x: clampX(baseSanctuaryX - dirToEnemy * 18), y: this.groundY - 182 };
    const wpGlide = { x: clampX(baseSanctuaryX + dirToEnemy * 46), y: this.groundY - 196 };
    const wpLand = { x: clampX(enemyX + side * 305), y: this.groundY };

    // Stage 1 (0.30s .. 1.38s -> Row 4 F05..F22): Multi-Angle Winged Valkyrie Spear-Glides + 12 Homing Gungnir Javelins!
    if (t >= 0.30 && t < 1.38) {
      this.vx = 0;
      this.vy = 0;
      let isGlidingSpear = false;

      if (t < 0.54) {
        // Pass 1 (F05..F08): '/' Up-Diagonal Winged Sky-Launch (-22 deg) from Ground!
        const u = (t - 0.30) / 0.24;
        const ease = 1 - Math.pow(1 - u, 2.0);
        this.x = originX + (wpLaunch.x - originX) * ease;
        this.y = this.groundY + (wpLaunch.y - this.groundY) * ease;
        this.facing = dirToEnemy;
        this.divePitchRad = -0.38;
        isGlidingSpear = true;
      } else if (t < 0.84) {
        // Pass 2 (F09..F13): Celestial Sanctuary Crown Command Hover!
        const u = (t - 0.54) / 0.30;
        this.x = wpLaunch.x + (wpCrown.x - wpLaunch.x) * u;
        this.y = wpLaunch.y + (wpCrown.y - wpLaunch.y) * u + Math.sin(u * Math.PI * 2) * 6;
        this.facing = enemyX >= this.x ? 1 : -1;
        this.divePitchRad = 0;
        if (this._ultStep < 1 && u >= 0.25) {
          this._ultStep = 1;
          this.spawnVfxAnim(0, this.x + this.facing * 36, this.y - 78, 208, 208, 0.28, {
            vx: this.facing * 250,
            flipX: this.facing < 0,
            glowColor: 'gold'
          });
        }
      } else if (t < 1.08) {
        // Pass 3 (F14..F17): '--->' Cross-Sky Supersonic Valkyrie Glide (-6 deg)!
        const u = (t - 0.84) / 0.24;
        const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        this.x = wpCrown.x + (wpGlide.x - wpCrown.x) * ease;
        this.y = wpCrown.y + (wpGlide.y - wpCrown.y) * ease;
        this.facing = enemyX >= this.x ? 1 : -1;
        this.divePitchRad = -0.10;
        isGlidingSpear = true;
      } else {
        // Pass 4 (F18..F22): '\' Sovereign Gungnir Sky-Spear Descent (+28 deg) to Safe Ranged Ground Vantage!
        const u = (t - 1.08) / 0.30;
        const ease = u * u * (3 - 2 * u);
        this.x = wpGlide.x + (wpLand.x - wpGlide.x) * ease;
        this.y = wpGlide.y + (wpLand.y - wpGlide.y) * ease;
        this.facing = enemyX >= this.x ? 1 : -1;
        this.divePitchRad = 0.49;
        isGlidingSpear = true;
      }

      if (isGlidingSpear) {
        this.afterimageSpawnAccum += dt;
        if (this.afterimageSpawnAccum >= 0.028) {
          this.afterimageSpawnAccum = 0;
          const col = Math.min(22, Math.max(5, Math.floor((t / this.ultDuration) * 30)));
          this.spawnAfterimage(this.x, this.y, this.facing, 4, col, 0.28);
        }
      }

      // Command 12 Curving Homing Gungnir Sky-Javelins arrayed in a grand Valhalla Crown Halo around Freyja!
      const spearInterval = 0.082;
      const expectedSpears = Math.min(12, Math.floor(Math.max(0, t - 0.32) / spearInterval) + 1);
      while (this._spearsFired < expectedSpears) {
        const idx = this._spearsFired;
        this._spearsFired++;

        const crownAngles = [-2.55, -0.55, -2.20, -0.90, -1.85, -1.25, -2.75, -0.35, -2.05, -1.05, -2.40, -0.70];
        const cAng = crownAngles[idx % crownAngles.length];
        const spawnR = 76 + (idx % 3) * 18;
        const sx = this.x + Math.cos(cAng) * spawnR;
        const sy = this.y - 76 + Math.sin(cAng) * (spawnR * 0.65);

        const arcSpreadSlots = [-250, 250, -185, 185, -120, 120, -290, 290, -75, 75, -215, 215];
        const arcSpread = arcSpreadSlots[idx % arcSpreadSlots.length];

        const tx =
          enemy && !enemy.isDead
            ? enemy.x + (Math.random() - 0.5) * 96
            : ww * 0.5 + (idx - 5.5) * 65;

        this.spawnGungnirSkySpear(
          sx,
          sy,
          Math.max(90, Math.min(ww - 90, tx)),
          this.groundY,
          10,
          true,
          arcSpread
        );
        if (game.audio) game.audio.play('holy_spear', sx);
      }
      return;
    }

    // Stage 2 (1.38s .. 1.80s -> Row 4 F23..F29): 100% Grounded Sovereign Judgment & Recovery!
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

      // Foreground Row-4 Valhalla Dragonfire Star-Cross Ring Burst!
      this.spawnVfxAnim(4, impactX, this.groundY - 96, 236, 236, 0.42, {
        glowColor: 'gold',
        inFront: true
      });

      // Erupt a Cataclysmic 5-Spire Fan of 30fps Dragonfire Ruby-Gold Obelisk Spires at impactX!
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

  /**
   * 3-Pass HD-2D Additive Bloom Renderer for Freyja's 208x208 VFX Sheet (assets/sprites/valkyrie_vfx.png, 5 rows):
   * - Pass 1: Soft radial crimson/gold lighting halo from renderer.glowCrimson / renderer.glowGold
   * - Pass 2: Crisp nearest-neighbor cel-shaded pixel-art cell
   * - Pass 3: Subtle additive ('lighter') bloom pass for sunlit Valhalla radiance
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

  /**
   * Renders a 4x4-Snapped Pixel-Art Valhalla Sanctuary Ground Seal beneath the Ultimate Target (`ULTIMATE`).
   */
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

    // 8 Rotating Valhalla Wing-Rune Nodes & Rising 4x4 Golden Feather Motes
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
   * Renders a Real-Time 4x4-Snapped Pixel-Art Dragonfire Valkyrie Mach-Cone & Golden Feather Helix
   * aligned to `this.divePitchRad` during Freyja's multi-angle winged spear-glides (`SKILL` F15..F18 & `ULTIMATE` F05..F08, F14..F22).
   */
  drawPixelValkyrieMachCone4x4(ctx) {
    const isSkillGlide = this.state === 'SKILL' && this.stateTimer >= 0.45 && this.stateTimer < 0.57;
    const isUltGlide =
      this.state === 'ULTIMATE' &&
      ((this.stateTimer >= 0.30 && this.stateTimer < 0.54) ||
        (this.stateTimer >= 0.84 && this.stateTimer < 1.38));
    if (!isSkillGlide && !isUltGlide) return;

    const isSovereignDescent = this.state === 'ULTIMATE' && this.stateTimer >= 1.08;
    const snap4 = (v) => Math.round(v / 4) * 4;
    const baseAngle = this.divePitchRad || 0;
    const ux = Math.cos(baseAngle) * this.facing;
    const uy = Math.sin(baseAngle);
    const nx = -uy;
    const ny = ux;

    const cx = this.x;
    const cy = this.y - 76;
    const tipX = cx + ux * 70;
    const tipY = cy + uy * 70;
    const phase = this.stateTimer * 34.0;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. V-Shaped 4x4 Pixel Dragonfire Mach-Cone Shockwings Sweeping Back from Gungnir's Tip
    for (const side of [-1, 1]) {
      for (let step = 0; step <= 17; step++) {
        const backDist = step * 6.5;
        const spread = 4 + step * (isSovereignDescent ? 3.0 : 2.4);
        const wx = snap4(tipX - ux * backDist + nx * side * spread);
        const wy = snap4(tipY - uy * backDist + ny * side * spread);

        ctx.globalAlpha = Math.max(0.15, 0.92 - step * 0.044);
        ctx.fillStyle =
          step <= 3
            ? '#ffffff'
            : step % 2 === 0
              ? '#fbbf24'
              : isSovereignDescent
                ? '#fda4af'
                : '#f43f5e';
        ctx.fillRect(wx - 2, wy - 2, 4, 4);
      }
    }

    // 2. Spiraling 4x4 Pixel Golden-Crimson Valkyrie Helix Contrail
    for (let h = 0; h <= 18; h++) {
      const dist = h * 6.0;
      const wave = Math.sin(h * 0.65 - phase) * (10 + h * 0.65);
      const hx = snap4(tipX - ux * dist + nx * wave);
      const hy = snap4(tipY - uy * dist + ny * wave);
      ctx.globalAlpha = Math.max(0.15, 0.84 - h * 0.04);
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

    // 0. Render 4x4 Pixel-Art Valhalla Sanctuary Ground Seal during ULTIMATE
    this.drawPixelValhallaSeal4x4(ctx);

    // 0B. Render Colossal Bahamut Sovereign & Valhalla Seal BEHIND Freyja during ULTIMATE (Row 3 of valkyrie_vfx.png)!
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
        this.bahamutAvatar.y - 122,
        248,
        248,
        fade * 0.88,
        this.facing < 0,
        renderer,
        'crimson'
      );
    }

    // 0C. Render Un-Rotated Crimson-Gold Valkyrie Afterimages (pure 4x4-snapped pixel-art frames!)
    if (this.afterimages.length > 0 && sprites && sprites.sheet && sprites.sheet.complete) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.54);
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

    // 0D. Render Midground 3-Pass Bloomed 30fps Valkyrie VFX Sheet Animations
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

    // 1. Aerial Vantage Jump Target Reticle (Stepped 4x4 Pixel-Art Ring)
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

    // 2. Gungnir Javelin Barrage Skill: Stepped 4x4 Pixel-Art Valhalla Crown Halo around Freyja
    if (this.state === 'SKILL' && this.stateTimer < 0.56) {
      const cx = Math.round(this.x / 4) * 4;
      const cy = Math.round((this.y - 88) / 4) * 4;
      const env = Math.sin(Math.min(1, this.stateTimer / 0.56) * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let deg = 0; deg < 360; deg += 12) {
        const a = (deg * Math.PI) / 180 + this.stateTimer * 5.0;
        const hx = Math.round((cx + Math.cos(a) * 68) / 4) * 4;
        const hy = Math.round((cy + Math.sin(a) * 42) / 4) * 4;
        ctx.globalAlpha = 0.82 * env;
        ctx.fillStyle = deg % 36 === 0 ? '#ffffff' : deg % 24 === 0 ? '#fbbf24' : '#f43f5e';
        ctx.fillRect(hx - 2, hy - 2, 4, 4);
      }
      ctx.restore();
    }

    // 3. Curving Homing Gungnir Sky-Javelins with Authentic Stepped 4x4 Pixel-Art Comet Trails & Winged Spearheads
    if (this.activeSkySpears.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (const sp of this.activeSkySpears) {
        // 3A. Stepped 4x4 Pixel-Art Curved Comet Trail along sp.trail
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

              // Outer crimson-rose pixel aura block
              ctx.globalAlpha = (sp.isUlt ? 0.62 : 0.50) * uSeg;
              ctx.fillStyle = '#f43f5e';
              const auraSz = uSeg > 0.55 ? 12 : 8;
              ctx.fillRect(px - auraSz * 0.5, py - auraSz * 0.5, auraSz, auraSz);

              // Inner sunlit gold pixel block
              if (uSeg > 0.25) {
                ctx.globalAlpha = (sp.isUlt ? 0.90 : 0.82) * uSeg;
                ctx.fillStyle = uSeg > 0.78 ? '#fef9c3' : '#fbbf24';
                ctx.fillRect(px - 2, py - 2, 4, 4);
              }
            }
          }
        }

        // 3B. Stepped 4x4 Pixel-Art Target Ground Sigil for Ultimate Javelins
        if (sp.isUlt) {
          const gtx = Math.round(sp.targetX / 4) * 4;
          const gty = Math.round((this.groundY - 4) / 4) * 4;
          ctx.globalAlpha = 0.58;
          for (let deg = 0; deg < 360; deg += 30) {
            const a = (deg * Math.PI) / 180;
            const rx = Math.round((gtx + Math.cos(a) * 32) / 4) * 4;
            const ry = Math.round((gty + Math.sin(a) * 8) / 4) * 4;
            ctx.fillStyle = deg % 60 === 0 ? '#fbbf24' : '#f43f5e';
            ctx.fillRect(rx - 2, ry - 2, 4, 4);
          }
        }

        // 3C. Render the Winged Golden Gungnir Javelin on a World-Space Stepped 4x4 Pixel Grid!
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

        // Crimson-Gold Pixel Shaft (-44 .. +8)
        for (let d = -44; d <= 8; d += 4) {
          putJavelinPx(d, 0, d < -20 ? '#e11d48' : '#fbbf24', 4, 0.95, false);
        }

        // Swept Valkyrie Wing-Flukes on Crossguard (-8 .. +12, perp -16 .. +16)
        for (const sign of [-1, 1]) {
          putJavelinPx(4, sign * 4, '#fbbf24', 4, 0.98, false);
          putJavelinPx(0, sign * 8, '#fbbf24', 4, 0.98, false);
          putJavelinPx(-4, sign * 12, '#f43f5e', 4, 0.95, false);
          putJavelinPx(-8, sign * 16, '#fef08a', 4, 0.92, true);
        }

        // Broad Diamond Spearhead (+8 .. +40) with White-Hot Core & Golden Edge Pixels
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

    // 1. Render Real-Time Pitch-Aligned 4x4 Pixel Dragonfire Mach-Cone around Freyja during SKILL / ULTIMATE Spear-Glides!
    this.drawPixelValkyrieMachCone4x4(ctx);

    // 2. Render Foreground Row-4 Valhalla Star-Cross Impact Bursts IN FRONT of characters!
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
