import { Fighter } from './Fighter.js?v=30fps20';
import { PixelForge } from '../engine/PixelForge.js?v=30fps20';

export class Valkyrie extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Freyja',
      maxHp: 1180,
      moveSpeed: 212,
      attackRange: 215,
      autoInterval: 0.78,
      lightColor: 'rgba(244, 63, 94, 1)',
      primaryColor: '#f43f5e'
    });
    this.heroId = 'valkyrie';
    this.deathSfx = 'death_priestess';
    this.skillName = 'WYVERN CORKSCREW';
    this.ultName = 'VALHALLA SKY-SANCTUARY';
    this.theme = 'crimson';
    this.hasPoise = true;
    this.skillTriggerRange = 480;
    this.skillMaxCooldown = 4.4;
    this.autoDuration = 0.54;
    this.skillDuration = 0.86;
    this.ultDuration = 1.48;
    this.crouchDuration = 0.58;
    this.dashDuration = 0.38;
    this.comboStep = 0;

    // Freyja Unique Sky-Dragoon Mechanics:
    // 1. Winged Hover Physics (floats gracefully above ground hazards on her Valkyrie wings)
    this.hoverOffset = 0;
    // 2. High Dragoon Jump Target Crosshair on the arena floor
    this.dragoonTargetX = null;
    // 3. Active Curving Gungnir Light-Spears (Bezier Homing Arcs with Ribbon Trails)
    this.activeSkySpears = [];
    // 4. Colossal Bahamut Sovereign Avatar state during Ultimate
    this.bahamutAvatar = null;
  }

  spawnGungnirSkySpear(startX, startY, targetX, targetY, damage = 24, isUlt = false, arcSpread = null) {
    // Compute a sweeping Quadratic/Cubic Bezier control point so spears NEVER fly in plain straight lines!
    // Instead, they fan out into a high celestial halo arc (left/right/zenith) and curve dynamically onto the target.
    const spread =
      arcSpread !== null
        ? arcSpread
        : (Math.random() - 0.5) * (isUlt ? 340 : 180);
    const flightDuration = isUlt ? 0.46 + Math.random() * 0.10 : 0.38;
    const ctrlX = startX + spread * 1.15;
    const ctrlY = Math.min(startY, targetY) - (isUlt ? 145 + Math.abs(spread) * 0.38 : 95 + Math.abs(spread) * 0.25);

    this.activeSkySpears.push({
      startX,
      startY,
      ctrlX,
      ctrlY,
      targetX,
      targetY,
      spreadOffset: (Math.random() - 0.5) * 54,
      x: startX,
      y: startY,
      angle: -Math.PI * 0.5,
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

    // Update Active Curving Gungnir Light-Spears along their Bezier Homing Arcs
    if (this.activeSkySpears.length > 0 && game) {
      const ww = game.renderer ? game.renderer.worldWidth : 1600;
      const targets = game.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (let i = this.activeSkySpears.length - 1; i >= 0; i--) {
        const sp = this.activeSkySpears[i];
        sp.age += dt;
        const u = Math.min(1, sp.age / Math.max(0.05, sp.flightDuration));

        // Smooth homing lock-on during first 68% of the arc
        if (u < 0.68 && enemy && !enemy.isDead) {
          const desiredTx = Math.max(85, Math.min(ww - 85, enemy.x + sp.spreadOffset));
          sp.targetX += (desiredTx - sp.targetX) * Math.min(1, dt * 8);
        }

        // Ease-in-out acceleration along the quadratic Bezier curve: slow halo fan-out -> supersonic dive!
        const easeU = u < 0.35 ? 0.5 * (u / 0.35) * (u / 0.35) * 0.35 : 0.175 + 0.825 * Math.pow((u - 0.35) / 0.65, 1.35);
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
        if (sp.trail.length > 11) sp.trail.shift();

        // Spawn golden-crimson feather sparks along the curved flight path
        if (Math.random() < 0.55) {
          game.vfx.spawnParticle({
            x: sp.x + (Math.random() - 0.5) * 14,
            y: sp.y + (Math.random() - 0.5) * 14,
            vx: -Math.cos(sp.angle) * 65 + (Math.random() - 0.5) * 35,
            vy: -Math.sin(sp.angle) * 65 - 25,
            size: sp.isUlt ? 6 : 5,
            color: Math.random() < 0.55 ? '#fbbf24' : '#f43f5e',
            maxLife: 0.26
          });
        }

        for (const t of targets) {
          if (t && !t.isDead && !t.isBenched && !sp.hitTargets.has(t)) {
            if (Math.abs(t.x - sp.x) < 68 && Math.abs(t.y - 68 - sp.y) < 82) {
              sp.hitTargets.add(t);
              t.takeDamage(sp.damage, this, sp.isUlt, 95, -135);
              if (game.audio) game.audio.play('holy_spear', sp.x);
              game.vfx.spawnSlash(sp.x, sp.y, 108, sp.angle - 1.1, sp.angle + 1.1, '#f43f5e', 0.24);
              game.vfx.spawnBurst(sp.x, sp.y, 12, '#fbbf24', 210, { upBias: 70, size: 5 });
            }
          }
        }

        if (u >= 1.0 || sp.y >= this.groundY - 4 || sp.age >= sp.maxLife) {
          const impX = sp.x;
          game.vfx.spawnShockwave(impX, this.groundY - 4, sp.isUlt ? 128 : 88, '#f43f5e', 0.30, true);
          game.vfx.spawnBurst(impX, this.groundY - 12, sp.isUlt ? 14 : 9, '#fbbf24', 195, {
            upBias: 110,
            size: 6
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
            maxLinger: sp.isUlt ? 0.46 : 0.34,
            isUltimate: sp.isUlt
          });
          this.activeSkySpears.splice(i, 1);
        }
      }
    }

    super.update(dt, enemy, game);

    // Winged Valkyrie Hover Offset during IDLE and WALK so Freyja visibly glides on her wings!
    if (!this.isDead && !this.isBenched && (this.state === 'IDLE' || this.state === 'WALK')) {
      this.hoverOffset = -10 + Math.sin(this.walkPhase * 2.2) * 4.5;
    } else {
      this.hoverOffset = 0;
    }
  }

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.85 + Math.random() * 0.26);
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    if (dist < 185) {
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
    if (this.x < 195) retreatDir = 1;
    else if (this.x > ww - 195) retreatDir = -1;

    this.vaultStartX = this.x;
    this.vaultTargetX = Math.max(85, Math.min(ww - 85, this.x + retreatDir * 155));
    this.vx = 0;
    this.vy = 0;

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
    this.y = this.groundY - Math.sin(u * Math.PI) * 64;
    this.vx = 0;
    this.vy = 0;

    if (t >= 0.20 && !this.didActionFrame) {
      this.didActionFrame = true;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 240;
      this.spawnGungnirSkySpear(
        this.x + this.facing * 24,
        this.y - 92,
        tx - 18,
        this.groundY,
        24,
        false,
        -this.facing * 95
      );
      if (game.audio) game.audio.play('holy_spear', this.x);
      game.vfx.spawnDamageText(this.x, this.y - 150, 0, false, 'GUNGNIR JAVELIN!', '#fbbf24');
    }

    if (t >= 0.36 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 280;
      this.spawnGungnirSkySpear(
        this.x + this.facing * 24,
        this.y - 92,
        tx + 22,
        this.groundY,
        26,
        false,
        this.facing * 115
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
    this.dashDuration = 0.68;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isFlipVault = true;

    const ww = game.renderer.worldWidth;
    this.vaultStartX = this.x;
    this.dragoonTargetX =
      enemy && !enemy.isDead
        ? Math.max(90, Math.min(ww - 90, enemy.x))
        : Math.max(90, Math.min(ww - 90, this.x + this.facing * 220));
    this.vx = 0;
    this.vy = 0;

    if (game && game.audio) game.audio.play('dash_whoosh', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 148,
        0,
        true,
        '★ HIGH DRAGOON JUMP! ★',
        '#fbbf24'
      );
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 118, '#fbbf24', 0.30, true);
      game.vfx.spawnBurst(this.x, this.y - 60, 18, '#f43f5e', 240, { upBias: 165, size: 6 });
    }
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
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
      const ww = game.renderer.worldWidth;
      if (u < 0.46 && enemy && !enemy.isDead) {
        this.dragoonTargetX = Math.max(90, Math.min(ww - 90, enemy.x));
      }

      if (u < 0.48) {
        const pAsc = u / 0.48;
        const easeAsc = 1 - Math.pow(1 - pAsc, 2.2);
        this.x = this.vaultStartX + (this.dragoonTargetX - this.vaultStartX) * (easeAsc * 0.35);
        this.y = this.groundY - easeAsc * 225;
      } else {
        const pDive = (u - 0.48) / 0.52;
        const apexX = this.vaultStartX + (this.dragoonTargetX - this.vaultStartX) * 0.35;
        this.x = apexX + (this.dragoonTargetX - apexX) * pDive;
        this.y = this.groundY - (1 - pDive * pDive) * 225;
      }
      this.vx = 0;
      this.vy = 0;

      if (u >= 0.88 && !this.didActionFrame) {
        this.didActionFrame = true;
        this.y = this.groundY;
        if (game.audio) game.audio.play('holy_spear', this.x);
        game.renderer.triggerShake(11, 0.22);
        game.renderer.triggerHitStop(0.045);
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 185, '#f43f5e', 0.36, true);
        game.vfx.spawnBurst(this.x, this.groundY - 36, 24, '#fbbf24', 270, {
          upBias: 155,
          size: 6
        });
        game.vfx.spawnSkyStrike({
          x: this.x,
          y: this.groundY,
          targetX: this.x,
          groundY: this.groundY,
          vx: 0,
          vy: 1400,
          type: 'gungnir_lance',
          color: '#f43f5e',
          coreColor: '#fbbf24',
          owner: this,
          target: enemy,
          damage: 0,
          maxLinger: 0.42
        });

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 165) {
          enemy.takeDamage(52, this, true, 175, -210);
          game.vfx.spawnDamageText(
            enemy.x,
            enemy.y - 162,
            0,
            true,
            '★ DRAGOON SKY-DIVE! ★',
            '#fbbf24'
          );
          this.gainMana(16);
        }
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
    this.vx = this.dashDir * 590 * (1 - u * 0.52);
    if (t >= dur) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t >= 0.16 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx = this.facing * 145;
      if (game.audio) game.audio.play('holy_spear', this.x);
      const sA = this.facing === 1 ? -1.4 : Math.PI - 1.1;
      const eA = this.facing === 1 ? 1.1 : Math.PI + 1.4;
      game.vfx.spawnSlash(this.x + this.facing * 36, this.y - 84, 132, sA, eA, '#f43f5e', 0.24);

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 25) {
        enemy.takeDamage(22, this, false, 65, 0);
        this.gainMana(7);
      }
    }

    if (t >= 0.34 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const step = this.comboStep;
      this.comboStep = (this.comboStep + 1) % 3;

      if (step < 2) {
        this.vx = this.facing * 165;
        if (game.audio) game.audio.play('holy_spear', this.x);
        const sA = this.facing === 1 ? -1.5 : Math.PI - 1.2;
        const eA = this.facing === 1 ? 1.2 : Math.PI + 1.5;
        game.vfx.spawnSlash(this.x + this.facing * 42, this.y - 92, 138, sA, eA, '#f43f5e', 0.26);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 32) {
          const isCrit = Math.random() < 0.32;
          enemy.takeDamage(isCrit ? 34 : 26, this, isCrit, 95, 0);
          this.gainMana(8);
        }
      } else {
        this.vy = -165;
        this.vx = this.facing * 175;
        if (game.audio) game.audio.play('holy_spear', this.x);
        const sA = this.facing === 1 ? 1.4 : Math.PI - 1.4;
        const eA = this.facing === 1 ? -1.8 : Math.PI + 1.8;
        game.vfx.spawnSlash(this.x + this.facing * 36, this.y - 88, 148, sA, eA, '#f43f5e', 0.30);
        game.vfx.spawnBurst(this.x + this.facing * 75, this.y - 88, 16, '#fbbf24', 220, {
          upBias: 155,
          size: 5
        });
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 38) {
          enemy.takeDamage(38, this, true, 85, -225);
          game.vfx.spawnDamageText(
            enemy.x,
            enemy.y - 156,
            0,
            true,
            'HALBERD SKY-LAUNCH!',
            '#fbbf24'
          );
          this.gainMana(12);
        }
      }
    }

    if (t >= 0.56) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._corkscrewHits) this._corkscrewHits = 0;

    // Initial cast aura & pair of arcing escort Gungnir Javelins that curve above her corkscrew drill!
    if (!this.didActionFrame) {
      this.didActionFrame = true;
      game.vfx.spawnSpecialCastAura(this, this.skillName, '✦ VALKYRIE SKILL ✦', 'crimson', false);
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 320;
      this.spawnGungnirSkySpear(this.x - this.facing * 20, this.y - 110, tx - 24, this.groundY, 12, false, -140);
      this.spawnGungnirSkySpear(this.x + this.facing * 20, this.y - 125, tx + 24, this.groundY, 12, false, 140);
    }

    if (t < 0.62) {
      // Dynamic helical corkscrew flight path instead of flat horizontal line
      this.y = this.groundY - 42 + Math.sin(t * 28) * 14;
      this.vy = 0;
      this.vx = this.facing * 640;

      if (Math.random() < 0.85) {
        game.vfx.spawnParticle({
          x: this.x + this.facing * 72,
          y: this.y - 54 + Math.sin(t * 38) * 28,
          vx: -this.facing * 155,
          vy: Math.cos(t * 38) * 95,
          size: 6,
          color: Math.random() < 0.5 ? '#fbbf24' : '#f43f5e',
          maxLife: 0.34
        });
      }

      // Periodic spinning Valhalla Dragonfire Star-Cross rings along the drill path
      if (
        (t >= 0.14 && this._corkscrewHits === 0) ||
        (t >= 0.28 && this._corkscrewHits === 1) ||
        (t >= 0.42 && this._corkscrewHits === 2)
      ) {
        this._corkscrewHits++;
        if (game.audio) game.audio.play('holy_spear', this.x);
        game.vfx.spawnSlash(
          this.x + this.facing * 54,
          this.y - 68,
          128,
          -Math.PI,
          Math.PI,
          '#f43f5e',
          0.26
        );
        if (enemy && !enemy.isDead) {
          const dx = (enemy.x - this.x) * this.facing;
          if (dx > -35 && dx < 155 && Math.abs(enemy.y - this.y) < 105) {
            const ww = game.renderer.worldWidth;
            enemy.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 68));
            enemy.y = Math.min(this.groundY, this.y + 18);
            enemy.vx = 0;
            enemy.vy = 0;
            enemy.takeDamage(16, this, false, 25, 0);
            if (this._corkscrewHits === 1) {
              game.vfx.spawnDamageText(enemy.x, enemy.y - 152, 0, true, 'WYVERN SKEWER!', '#fbbf24');
            }
          }
        }
      }
    }

    if (t >= 0.62 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.y = this.groundY;
      this.vx = 0;
      const slamX = this.x + this.facing * 68;
      if (game.audio) game.audio.play('holy_spear', slamX);
      game.renderer.triggerShake(11, 0.22);
      game.vfx.spawnShockwave(slamX, this.groundY - 6, 168, '#f43f5e', 0.34, true);
      game.vfx.spawnBurst(slamX, this.groundY - 48, 24, '#fbbf24', 270, {
        upBias: 145,
        size: 6
      });
      // Erupt a 30fps Dragonfire Ruby-Gold Obelisk Spire (Row 2 of valkyrie_vfx.png) at the skewering finisher!
      game.vfx.spawnCrystalSpike({
        x: slamX,
        groundY: this.groundY,
        width: 58,
        height: 165,
        color: '#f43f5e',
        owner: this,
        target: enemy,
        damage: 14,
        delay: 0
      });
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 175) {
        enemy.takeDamage(32, this, true, 210, -195);
      }
    }

    if (t >= 0.84) {
      this._corkscrewHits = 0;
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
        maxLife: 1.75
      };
      game.vfx.spawnSpecialCastAura(this, this.ultName, '★ ULTIMATE OVERDRIVE ★', 'crimson', true);
    }

    if (t < 1.42) {
      // Dynamic celestial figure-8 ascent in the sky
      const targetSkyX = ww * 0.5 - this.facing * 110 + Math.sin(t * 5.5) * 45;
      this.x += (targetSkyX - this.x) * Math.min(1, dt * 6);
      const targetSkyY = this.groundY - 205 + Math.cos(t * 8.5) * 14;
      this.y += (targetSkyY - this.y) * Math.min(1, dt * 10);
      this.vx = 0;
      this.vy = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      // Command 10 Curving Homing Gungnir Sky-Spears arrayed in a grand halo crown around Freyja!
      const spearInterval = 0.105;
      const expectedSpears = Math.min(10, Math.floor(Math.max(0, t - 0.20) / spearInterval));
      while (this._spearsFired < expectedSpears) {
        const idx = this._spearsFired;
        this._spearsFired++;

        // Fan the spears out in a wide, dramatic Valhalla Crown Halo around Freyja (-260px to +260px arc spread)
        const crownAngles = [-2.55, -0.55, -2.20, -0.90, -1.85, -1.25, -2.75, -0.35, -2.05, -1.05];
        const cAng = crownAngles[idx % crownAngles.length];
        const spawnR = 78 + (idx % 3) * 18;
        const sx = this.x + Math.cos(cAng) * spawnR;
        const sy = this.y - 74 + Math.sin(cAng) * (spawnR * 0.65);

        const arcSpreadSlots = [-250, 250, -185, 185, -120, 120, -290, 290, -75, 75];
        const arcSpread = arcSpreadSlots[idx % arcSpreadSlots.length];

        const tx =
          enemy && !enemy.isDead
            ? enemy.x + (Math.random() - 0.5) * 110
            : ww * 0.5 + (idx - 4.5) * 72;

        this.spawnGungnirSkySpear(
          sx,
          sy,
          Math.max(90, Math.min(ww - 90, tx)),
          this.groundY,
          14,
          true,
          arcSpread
        );
        if (game.audio) game.audio.play('holy_spear', sx);
      }
    } else if (t >= 1.42 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const impactX = enemy && !enemy.isDead ? enemy.x : ww * 0.5;
      this.x = Math.max(90, Math.min(ww - 90, impactX));
      this.y = this.groundY;
      this.vx = 0;
      this.vy = 0;

      if (game.audio) {
        game.audio.play('thunder_slam', this.x);
      }
      game.renderer.triggerShake(16, 0.30);
      game.renderer.triggerAberration(9);
      game.renderer.triggerHitStop(0.065);
      game.vfx.spawnShockwave(this.x, this.groundY - 6, 265, '#fbbf24', 0.44, true);
      game.vfx.spawnSlash(this.x, this.groundY - 78, 195, -Math.PI, Math.PI, '#f43f5e', 0.38);
      game.vfx.spawnBurst(this.x, this.groundY - 58, 36, '#f43f5e', 330, {
        upBias: 195,
        size: 7
      });

      // Erupt a Cataclysmic 5-Spire Fan of 30fps Dragonfire Ruby-Gold Obelisk Spires (Row 2 of valkyrie_vfx.png)!
      const offsets = [0, -105, 105, -210, 210];
      offsets.forEach((off, i) => {
        const sx = Math.max(85, Math.min(ww - 85, this.x + off));
        game.vfx.spawnCrystalSpike({
          x: sx,
          groundY: this.groundY,
          width: i === 0 ? 68 : 56,
          height: i === 0 ? 195 : 162,
          color: '#f43f5e',
          owner: this,
          target: enemy,
          damage: i === 0 ? 18 : 10,
          delay: Math.floor(Math.abs(off) / 105) * 0.06
        });
      });

      game.vfx.spawnDamageText(
        this.x,
        this.groundY - 178,
        0,
        true,
        '★ BAHAMUT SUPERNOVA DIVE! ★',
        '#fbbf24'
      );

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(54, this, true, 235, -245);
      }
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
    const valkAssets = PixelForge.initAssets().valkyrie;
    const valkVfx = valkAssets?.vfx;
    const hasVfx = !!(valkVfx && valkVfx.complete && valkVfx.naturalWidth);

    // 1. High Dragoon Jump Target Crosshair & Descending Golden Beam
    if (this.dragoonTargetX !== null && this.state === 'JUMP') {
      const tx = Math.round(this.dragoonTargetX);
      const ty = Math.round(this.groundY - 4);
      const pulse = 0.7 + 0.3 * Math.sin(this.stateTimer * 28);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85 * pulse;
      if (hasVfx) {
        const ringCol = Math.floor(this.stateTimer * 30) % 30;
        ctx.drawImage(valkVfx, ringCol * 208, 832, 208, 208, tx - 72, ty - 42, 144, 72);
      }
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(tx - 46, ty - 3, 92, 6);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(tx - 24, ty - 5, 48, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(tx - 2, ty - 220, 4, 220);
      ctx.restore();
    }

    // 2. Wyvern Corkscrew Skill: Blazing 30fps Spiral Lance-Wave Vortex (Row 0 & Row 4 of valkyrie_vfx.png)
    if (this.state === 'SKILL' && this.stateTimer < 0.64 && hasVfx) {
      const vCol = Math.floor(this.stateTimer * 45) % 30;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(Math.round(this.x + this.facing * 52), Math.round(this.y - 68));
      ctx.scale(this.facing, 1);
      ctx.globalAlpha = 0.92;
      // Row 0: Crimson-Gold Wyvern Spiral Lance-Wave (cropY = 0)
      ctx.drawImage(valkVfx, vCol * 208, 0, 208, 208, -98, -98, 196, 196);
      // Row 4: Spinning Valhalla Star-Cross Vortex Ring (cropY = 832)
      ctx.globalAlpha = 0.68;
      ctx.drawImage(valkVfx, ((vCol + 12) % 30) * 208, 832, 208, 208, -78, -78, 156, 156);
      ctx.restore();
    }

    // 3. Valhalla Sky-Sanctuary Ultimate: Colossal Bahamut Sovereign & Celestial Sanctuary Halo (Row 3 & Row 4)
    if (this.state === 'ULTIMATE' && hasVfx) {
      const uCol = Math.floor(this.stateTimer * 30) % 30;
      const env = this.stateTimer < 0.2 ? this.stateTimer / 0.2 : Math.max(0, 1 - Math.max(0, this.stateTimer - 1.45) / 0.33);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.88 * env;
      // Colossal Bahamut Sovereign & Valhalla Seal looming above Freyja (Row 3, cropY = 624)
      const bSz = 268;
      ctx.drawImage(
        valkVfx,
        uCol * 208,
        624,
        208,
        208,
        Math.round(this.x - bSz * 0.5),
        Math.round(this.y - 235),
        bSz,
        bSz
      );
      // Spinning Valhalla Star-Cross Halo around Freyja (Row 4, cropY = 832)
      ctx.globalAlpha = 0.65 * env;
      const hSz = 220;
      ctx.drawImage(
        valkVfx,
        ((uCol + 15) % 30) * 208,
        832,
        208,
        208,
        Math.round(this.x - hSz * 0.5),
        Math.round(this.y - 185),
        hSz,
        hSz
      );
      ctx.restore();
    }

    // 4. Curving Homing Gungnir Sky-Spears with Sweeping Golden-Crimson Ribbon Trails & 30fps HD-2D Sprites
    if (this.activeSkySpears.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'lighter';

      for (const sp of this.activeSkySpears) {
        // 4A. Sweeping Curved Celestial Ribbon Trail along sp.trail
        if (sp.trail && sp.trail.length >= 2) {
          for (let k = 1; k < sp.trail.length; k++) {
            const p0 = sp.trail[k - 1];
            const p1 = sp.trail[k];
            const frac = k / sp.trail.length;
            ctx.save();
            ctx.globalAlpha = frac * (sp.isUlt ? 0.85 : 0.72);
            ctx.strokeStyle = k >= sp.trail.length - 3 ? '#fef08a' : k % 2 === 0 ? '#fbbf24' : '#f43f5e';
            ctx.lineWidth = Math.max(2, Math.round(frac * (sp.isUlt ? 10 : 7)));
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
            ctx.restore();
          }
        }

        // 4B. Target Ground Lock-On Sigil for Ultimate Spears
        if (sp.isUlt && hasVfx) {
          const lockCol = Math.floor((sp.age * 35) % 30);
          ctx.save();
          ctx.globalAlpha = 0.52;
          ctx.drawImage(
            valkVfx,
            lockCol * 208,
            832,
            208,
            208,
            Math.round(sp.targetX - 48),
            Math.round(this.groundY - 26),
            96,
            48
          );
          ctx.restore();
        }

        // 4C. Render the Curving Gungnir Sky-Spear Sprite (Row 0 of valkyrie_vfx.png + Ornate Winged Spearhead)
        ctx.save();
        ctx.translate(Math.round(sp.x), Math.round(sp.y));
        ctx.rotate(sp.angle);

        if (hasVfx) {
          const spCol = Math.floor((sp.age * 45 + sp.spiralPhase * 5) % 30);
          const spSize = sp.isUlt ? 148 : 124;
          ctx.globalAlpha = 0.96;
          ctx.drawImage(
            valkVfx,
            spCol * 208,
            0,
            208,
            208,
            -Math.round(spSize * 0.52),
            -Math.round(spSize * 0.5),
            spSize,
            spSize
          );
        }

        // Crisp Pixel-Art Winged Golden Gungnir Spearhead & Dragon-Fluke Crossguard Core
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-44, -3, 82, 6);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-32, -2, 68, 4);
        // Flared Golden Valkyrie Wing-Flukes on Crossguard
        ctx.fillRect(6, -12, 6, 24);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(10, -8, 4, 16);
        // Blazing White-Gold Diamond Spear Tip
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, -2, 28, 4);
        ctx.fillRect(36, -5, 4, 10);
        ctx.restore();
      }
      ctx.restore();
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

    const groundPlantOffset = 6;
    const hoverY = isReflection ? 0 : Math.round(this.hoverOffset || 0);

    ctx.translate(
      Math.round(this.x),
      Math.round(this.y + groundPlantOffset + hoverY)
    );
    ctx.scale(this.facing, 1);

    // Unfurled Crimson-Gold Valkyrie Wing Halo behind Freyja during aerial/special states so her wings extend freely beyond the 208x208 cell!
    const seraphWings = assets.priestess?.wings;
    if (
      !isReflection &&
      seraphWings &&
      seraphWings.complete &&
      seraphWings.naturalWidth &&
      (this.state === 'ULTIMATE' || this.state === 'SKILL' || this.state === 'JUMP' || this.state === 'CROUCH')
    ) {
      const wingFrame = Math.floor((this.walkPhase * 8 + this.stateTimer * 18) % 6);
      const wingScale = this.state === 'ULTIMATE' ? 1.22 : 1.04;
      const ww = Math.round(236 * wingScale);
      const wh = Math.round(216 * wingScale);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.state === 'ULTIMATE' ? 0.72 : 0.48;
      ctx.drawImage(
        seraphWings,
        wingFrame * 128,
        0,
        128,
        128,
        Math.round(-ww * 0.56),
        Math.round(-wh * 0.88),
        ww,
        wh
      );
      ctx.restore();
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
