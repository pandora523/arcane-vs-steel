import { Fighter } from './Fighter.js?v=30fps25';
import { PixelForge } from '../engine/PixelForge.js?v=30fps25';

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
    this.autoDuration = 0.56;
    this.skillDuration = 0.86;
    this.ultDuration = 1.65;
    this.crouchDuration = 0.58;
    this.dashDuration = 0.38;
    this.comboStep = 0;

    // Freyja Unique Ranged Sky-Valkyrie Mechanics:
    // 1. Winged Hover Physics (floats gracefully above ground hazards on her Valkyrie wings)
    this.hoverOffset = 0;
    // 2. Aerial Vantage Jump Target Reticle
    this.dragoonTargetX = null;
    // 3. Active Curving Gungnir Light-Javelins (Bezier Homing Arcs with Smooth Ribbon Trails)
    this.activeSkySpears = [];
    // 4. Colossal Bahamut Sovereign Avatar state during Ultimate
    this.bahamutAvatar = null;
  }

  spawnGungnirSkySpear(startX, startY, targetX, targetY, damage = 24, isUlt = false, arcSpread = null) {
    // Compute a sweeping Quadratic Bezier control point so javelins NEVER fly in plain straight lines!
    // Instead, they fan out into a high celestial halo arc (left/right/zenith) and curve dynamically onto the target.
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
    if (this.bahamutAvatar) {
      this.bahamutAvatar.life += dt;
      this.bahamutAvatar.x = this.x;
      this.bahamutAvatar.y = this.y;
      if (this.bahamutAvatar.life >= this.bahamutAvatar.maxLife || this.state !== 'ULTIMATE') {
        this.bahamutAvatar = null;
      }
    }

    // Update Active Curving Gungnir Light-Javelins along their Bezier Homing Arcs
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

    // Winged Valkyrie Hover Offset so Freyja visibly glides above the arena on her feathered wings!
    if (!this.isDead && !this.isBenched && (this.state === 'IDLE' || this.state === 'WALK' || this.state === 'AUTO_ATTACK')) {
      this.hoverOffset = -12 + Math.sin(this.walkPhase * 2.2) * 4.5;
    } else {
      this.hoverOffset = 0;
    }
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
    this.y = this.groundY - Math.sin(u * Math.PI) * 68;
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

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    // If Freyja is already within ranged javelin distance, dash backward/reposition to keep distance!
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

    this.y = this.groundY - Math.sin(u * Math.PI) * 32;
    this.vx = this.dashDir * 520 * (1 - u * 0.52);
    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    // Ranged Aerial Javelin Thrower: Freyja NEVER lunges into melee! She hovers gracefully and hurls curving Gungnir Javelins from afar.
    this.vx = 0;

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
        // Second curving Gungnir Javelin on opposite arc
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
        // 3rd-Combo Finisher: Twin Converging Valkyrie Javelins that pincer onto the enemy from high and low arcs!
        this.vy = -105;
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

    if (t >= 0.56) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._skillJavelinsFired) this._skillJavelinsFired = 0;

    // Initial cast aura
    if (!this.didActionFrame) {
      this.didActionFrame = true;
      this._skillStartX = this.x;
      game.vfx.spawnSpecialCastAura(this, this.skillName, '✦ VALKYRIE SKILL ✦', 'crimson', false);
    }

    // Freyja hovers in a graceful aerial wing-ascent at range (ZERO forward melee charge!)
    const u = Math.min(1, t / 0.84);
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY - Math.sin(u * Math.PI) * 96;

    // Fan out a 6-Javelin Celestial Halo Volley that curves through the heavens onto the enemy!
    const volleyTimes = [0.08, 0.16, 0.24, 0.32, 0.40, 0.48];
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

    // Finisher at t >= 0.58s: Call down a Dragonfire Ruby-Gold Obelisk Spire directly under the enemy from range!
    if (t >= 0.58 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const ww = game.renderer.worldWidth;
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

    if (t >= 0.84) {
      this._skillJavelinsFired = 0;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._spearsFired) this._spearsFired = 0;
    this.isInvulnerable = true;

    const ww = game.renderer.worldWidth;
    if (!this.didActionFrame) {
      this.didActionFrame = true;
      this.bahamutAvatar = {
        x: this.x,
        y: this.y,
        life: 0,
        maxLife: 1.78
      };
      game.vfx.spawnSpecialCastAura(this, this.ultName, '★ ULTIMATE OVERDRIVE ★', 'crimson', true);
    }

    if (t < 1.42) {
      // Freyja ascends to a commanding RANGED celestial sanctuary vantage (never diving onto the enemy's feet!)
      const enemyX = enemy && !enemy.isDead ? enemy.x : ww * 0.5 + this.facing * 180;
      const side = this.x <= enemyX ? -1 : 1;
      let desiredSkyX = enemyX + side * 320 + Math.sin(t * 5.0) * 32;
      if (desiredSkyX < 150 || desiredSkyX > ww - 150) {
        desiredSkyX = Math.max(150, Math.min(ww - 150, ww * 0.5 + side * 240));
      }
      this.x += (desiredSkyX - this.x) * Math.min(1, dt * 6);
      const targetSkyY = this.groundY - 205 + Math.cos(t * 8.0) * 12;
      this.y += (targetSkyY - this.y) * Math.min(1, dt * 10);
      this.vx = 0;
      this.vy = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      // Command 12 Curving Homing Gungnir Sky-Javelins arrayed in a grand Valhalla Crown Halo around Freyja!
      const spearInterval = 0.092;
      const expectedSpears = Math.min(12, Math.floor(Math.max(0, t - 0.18) / spearInterval));
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
    } else if (t >= 1.42 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const impactX = Math.max(90, Math.min(ww - 90, enemy && !enemy.isDead ? enemy.x : ww * 0.5));

      if (game.audio) {
        game.audio.play('thunder_slam', impactX);
      }
      game.renderer.triggerShake(16, 0.30);
      game.renderer.triggerAberration(9);
      game.renderer.triggerHitStop(0.065);
      game.vfx.spawnShockwave(impactX, this.groundY - 6, 265, '#fbbf24', 0.44, true);
      game.vfx.spawnSlash(impactX, this.groundY - 78, 195, -Math.PI, Math.PI, '#f43f5e', 0.38);
      game.vfx.spawnBurst(impactX, this.groundY - 58, 36, '#f43f5e', 330, {
        upBias: 195,
        size: 7
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

    // Smooth descent back to her ranged ground position during recovery (1.42s .. 1.78s)
    if (t >= 1.42) {
      const pDesc = Math.min(1, (t - 1.42) / 0.34);
      this.y = this.y + (this.groundY - this.y) * Math.min(1, pDesc * 0.35 + dt * 12);
    }

    if (t >= 1.78) {
      this._spearsFired = 0;
      this.bahamutAvatar = null;
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  drawForegroundOverlay(ctx) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

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
    if (this.state === 'SKILL' && this.stateTimer < 0.72) {
      const cx = Math.round(this.x / 4) * 4;
      const cy = Math.round((this.y - 84) / 4) * 4;
      const env = Math.sin(Math.min(1, this.stateTimer / 0.72) * Math.PI);
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

    // 3. Curving Homing Gungnir Sky-Javelins with Authentic Stepped 4x4 Pixel-Art Comet Trails & Pixel-Art Winged Spearheads
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
        // (Every block is snapped to 4px world coordinates — 100% authentic chunky pixel art at any flight angle and zero rotated square boxes!)
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

  draw(ctx, isReflection = false, renderer = null) {
    const assets = PixelForge.initAssets();
    const sprites = assets.valkyrie;
    if (!sprites) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    const groundPlantOffset = 6;
    const hoverY = isReflection ? 0 : Math.round(this.hoverOffset || 0);

    ctx.translate(
      Math.round(this.x),
      Math.round(this.y + groundPlantOffset + hoverY)
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
