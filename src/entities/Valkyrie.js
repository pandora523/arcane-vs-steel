import { Fighter } from './Fighter.js?v=30fps19';
import { PixelForge } from '../engine/PixelForge.js?v=30fps19';

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
    // 3. Active Raining Gungnir Light-Spears (from Wing-Backstep Javelins & Valhalla Sky-Barrage)
    this.activeSkySpears = [];
  }

  spawnGungnirSkySpear(startX, startY, targetX, targetY, damage = 24, isUlt = false) {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = isUlt ? 1280 : 1080;
    this.activeSkySpears.push({
      x: startX,
      y: startY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      angle: Math.atan2(dy, dx),
      damage,
      isUlt,
      age: 0,
      maxLife: 0.75,
      hitTargets: new Set()
    });
  }

  update(dt, enemy, game) {
    // Update Active Raining Gungnir Light-Spears / Javelins
    if (this.activeSkySpears.length > 0 && game) {
      const targets = game.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
      for (let i = this.activeSkySpears.length - 1; i >= 0; i--) {
        const sp = this.activeSkySpears[i];
        sp.age += dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;

        for (const t of targets) {
          if (t && !t.isDead && !t.isBenched && !sp.hitTargets.has(t)) {
            if (Math.abs(t.x - sp.x) < 58 && Math.abs(t.y - 65 - sp.y) < 75) {
              sp.hitTargets.add(t);
              t.takeDamage(sp.damage, this, sp.isUlt, 95, -135);
              if (game.audio) game.audio.play('holy_spear', sp.x);
              game.vfx.spawnBurst(sp.x, sp.y, 10, '#fbbf24', 195, { upBias: 60, size: 5 });
            }
          }
        }

        if (sp.y >= this.groundY - 4 || sp.age >= sp.maxLife) {
          game.vfx.spawnShockwave(sp.x, this.groundY - 4, sp.isUlt ? 115 : 78, '#f43f5e', 0.26, true);
          game.vfx.spawnBurst(sp.x, this.groundY - 12, sp.isUlt ? 12 : 8, '#fbbf24', 180, {
            upBias: 95,
            size: 5
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
      this.spawnGungnirSkySpear(this.x + this.facing * 24, this.y - 92, tx - 18, this.groundY, 24, false);
      if (game.audio) game.audio.play('holy_spear', this.x);
      game.vfx.spawnDamageText(this.x, this.y - 150, 0, false, 'GUNGNIR JAVELIN!', '#fbbf24');
    }

    if (t >= 0.36 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 280;
      this.spawnGungnirSkySpear(this.x + this.facing * 24, this.y - 92, tx + 22, this.groundY, 26, false);
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
      game.vfx.spawnSlash(this.x + this.facing * 36, this.y - 84, 132, sA, eA, '#fbbf24', 0.24);

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
        game.vfx.spawnSlash(this.x + this.facing * 36, this.y - 88, 148, sA, eA, '#fbbf24', 0.30);
        game.vfx.spawnBurst(this.x + this.facing * 75, this.y - 88, 16, '#f43f5e', 220, {
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

    if (t < 0.62) {
      this.y = this.groundY - 38;
      this.vy = 0;
      this.vx = this.facing * 640;

      if (Math.random() < 0.75) {
        game.vfx.spawnParticle({
          x: this.x + this.facing * 72,
          y: this.y - 54 + Math.sin(t * 36) * 24,
          vx: -this.facing * 140,
          vy: Math.cos(t * 36) * 85,
          size: 5,
          color: Math.random() < 0.5 ? '#fbbf24' : '#f43f5e',
          maxLife: 0.32
        });
      }

      if (enemy && !enemy.isDead) {
        const dx = (enemy.x - this.x) * this.facing;
        if (dx > -25 && dx < 135 && Math.abs(enemy.y - this.y) < 95) {
          const ww = game.renderer.worldWidth;
          enemy.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 68));
          enemy.y = Math.min(this.groundY, this.y + 18);
          enemy.vx = 0;
          enemy.vy = 0;

          if (
            (t >= 0.16 && this._corkscrewHits === 0) ||
            (t >= 0.30 && this._corkscrewHits === 1) ||
            (t >= 0.44 && this._corkscrewHits === 2)
          ) {
            this._corkscrewHits++;
            if (game.audio) game.audio.play('holy_spear', enemy.x);
            game.vfx.spawnSlash(enemy.x, enemy.y - 72, 115, -1.6, 1.4, '#fbbf24', 0.24);
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
      if (game.audio) game.audio.play('holy_spear', this.x);
      game.renderer.triggerShake(10, 0.20);
      game.vfx.spawnShockwave(this.x + this.facing * 68, this.groundY - 6, 155, '#f43f5e', 0.32, true);
      game.vfx.spawnBurst(this.x + this.facing * 68, this.groundY - 48, 22, '#fbbf24', 260, {
        upBias: 135,
        size: 6
      });
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 165) {
        enemy.takeDamage(32, this, true, 210, -195);
      }
    }

    if (t >= 0.80) {
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
    if (t < 1.42) {
      const targetSkyX = ww * 0.5 - this.facing * 120;
      this.x += (targetSkyX - this.x) * Math.min(1, dt * 6);
      const targetSkyY = this.groundY - 195 + Math.sin(t * 8) * 8;
      this.y += (targetSkyY - this.y) * Math.min(1, dt * 10);
      this.vx = 0;
      this.vy = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      const spearInterval = 0.13;
      const expectedSpears = Math.min(8, Math.floor(Math.max(0, t - 0.26) / spearInterval));
      while (this._spearsFired < expectedSpears) {
        this._spearsFired++;
        const tx =
          enemy && !enemy.isDead
            ? enemy.x + (Math.random() - 0.5) * 90
            : ww * 0.5 + (this._spearsFired - 4.5) * 75;
        this.spawnGungnirSkySpear(
          this.x + (Math.random() - 0.5) * 60,
          this.y - 60,
          Math.max(90, Math.min(ww - 90, tx)),
          this.groundY,
          14,
          true
        );
        if (game.audio) game.audio.play('holy_spear', this.x);
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
      game.renderer.triggerShake(15, 0.28);
      game.renderer.triggerAberration(9);
      game.renderer.triggerHitStop(0.06);
      game.vfx.spawnShockwave(this.x, this.groundY - 6, 250, '#fbbf24', 0.42, true);
      game.vfx.spawnBurst(this.x, this.groundY - 58, 34, '#f43f5e', 320, {
        upBias: 185,
        size: 7
      });
      game.vfx.spawnDamageText(
        this.x,
        this.groundY - 175,
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
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  drawForegroundOverlay(ctx) {
    if (this.dragoonTargetX !== null && this.state === 'JUMP') {
      const tx = Math.round(this.dragoonTargetX);
      const ty = Math.round(this.groundY - 4);
      const pulse = 0.7 + 0.3 * Math.sin(this.stateTimer * 28);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85 * pulse;
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(tx - 46, ty - 3, 92, 6);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(tx - 24, ty - 5, 48, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(tx - 2, ty - 220, 4, 220);
      ctx.restore();
    }

    if (this.activeSkySpears.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const sp of this.activeSkySpears) {
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(sp.angle);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-38, -4, 72, 8);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-26, -2.5, 58, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, -2, 26, 4);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().valkyrie;
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
