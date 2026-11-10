import { Fighter } from './Fighter.js?v=30fps58';
import { PixelForge } from '../engine/PixelForge.js?v=30fps58';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps58';
import {
  VALKYRIE_EFFECT_REGISTRY,
  VALKYRIE_CRIMSON_PALETTE,
  VALKYRIE_GOLD_PALETTE
} from '../engine/shaders/valkyrieShaders.js?v=30fps58';

/**
 * Freyja (`valkyrie`) — Dragon-Lance Valkyrie & Valhalla Sky-Sovereign.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D shader & particle engine)
 * + `assets/sprites/valkyrie_sheet.png` & `assets/sprites/valkyrie_vfx.png`.
 */
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

    // Grounded Stance by default (0 hover float on IDLE/WALK/AUTO_ATTACK/Cast Startups)
    this.hoverOffset = 0;
    this.divePitchRad = 0;
    this.dragoonTargetX = null;
    this.activeSkySpears = [];
    this.bahamutAvatar = null;
    this.afterimages = [];
    this.afterimageSpawnAccum = 0;
    this.activeVfxAnims = [];
    this._ultTargetX = 600;
    this.stepTimer = 0;

    // Native 120Hz dual-buffer HD-2D Crimson-Gold Valkyrie shader & particle runtime (`back` + `front` 2.5D layers)
    this.fx = new ArcaneShaderFX(VALKYRIE_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      const valkyrieAssets = PixelForge.initAssets()?.valkyrie;
      if (valkyrieAssets?.vfx?.src && !valkyrieAssets.vfx.src.includes('v=30fps47')) {
        valkyrieAssets.vfx.src = 'assets/sprites/valkyrie_vfx.png?v=30fps58';
      }
    }

    this._volleySlot = null;
    this._drewSpearFocus = false;
    this._deathBurstTriggered = false;
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'SKILL' && newState !== 'ULTIMATE' && newState !== 'DASH') {
      this.divePitchRad = 0;
    }
    if (
      newState !== 'CROUCH' &&
      newState !== 'JUMP' &&
      newState !== 'DASH' &&
      newState !== 'SKILL' &&
      newState !== 'ULTIMATE'
    ) {
      this.fx?.stopByKey('valkyrieSlipstreamTrail');
    }
    if (newState !== 'SKILL' && newState !== 'ULTIMATE') {
      this.fx?.stopByKey('valkyrieHaloArray');
    }
    if (newState !== 'JUMP' && newState !== 'SKILL' && newState !== 'ULTIMATE') {
      this.fx?.stopByKey('valkyrieWingPlume');
    }

    this._drewSpearFocus = false;

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
      this._ultPassCone1 = false;
      this._ultPassCone3 = false;
    }
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    super.takeDamage(amount, attacker, isCrit, knockX, knockY);

    if (this.isDead && !this._deathBurstTriggered) {
      this._deathBurstTriggered = true;
      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.08,
        extra: { radius: 30 }
      });
      this.fx.spawn('gungnirImpactStarburst', this.x, this.groundY - 66, {
        flip: false,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.05,
        extra: { aimAngle: -Math.PI * 0.5, isCrit: true }
      });
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

  ensureBezierVolleySlot() {
    if (this._volleySlot && this.fx.active.includes(this._volleySlot)) {
      this._volleySlot.worldX = Math.round(this.x / 3) * 3;
      this._volleySlot.worldY = Math.round(this.groundY / 3) * 3;
      return;
    }
    const anchorX = Math.round(this.x / 3) * 3;
    const anchorY = Math.round(this.groundY / 3) * 3;
    this._volleySlot = this.fx.spawn('gungnirBezierVolley', anchorX, anchorY, {
      flip: false,
      palette: VALKYRIE_CRIMSON_PALETTE,
      light: 1.15,
      extra: {
        spears: this.activeSkySpears,
        getOrigin: () => ({
          x: this._volleySlot ? this._volleySlot.worldX : Math.round(this.x / 3) * 3,
          y: this._volleySlot ? this._volleySlot.worldY : Math.round(this.groundY / 3) * 3
        }),
        scale: 3
      }
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
      wakeAccum: 0,
      flightDuration,
      maxLife: flightDuration + 0.06,
      trail: [{ x: startX, y: startY }],
      spiralPhase: Math.random() * Math.PI * 2,
      hitTargets: new Set()
    });

    this.ensureBezierVolleySlot();
  }

  update(dt, enemy, game) {
    // 1. Step Crimson-Gold Valkyrie Afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    // 2. Step Active 30fps Valkyrie VFX Sheet Animations
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

    // 3. Step Colossal Bahamut Sovereign Avatar during ULTIMATE
    if (this.bahamutAvatar) {
      this.bahamutAvatar.life += dt;
      this.bahamutAvatar.x = this.x;
      this.bahamutAvatar.y = this.y;
      if (this.bahamutAvatar.life >= this.bahamutAvatar.maxLife || this.state !== 'ULTIMATE') {
        this.bahamutAvatar = null;
      }
    }

    // 4. Subtle Valkyrie Sabaton Rune-Step Cadence during WALK
    if (!this.isDead && this.state === 'WALK') {
      this.stepTimer += dt;
      if (this.stepTimer >= 0.36) {
        this.stepTimer = 0;
        this.fx.spawn('valhallaGroundBurst', this.x - this.facing * 12, this.groundY, {
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 0.82,
          extra: { radius: 12 }
        });
      }
    }

    // 5. Update Active Sleek Shallow-Curving Gungnir Light-Javelins
    if (this.activeSkySpears.length > 0 && game) {
      this.ensureBezierVolleySlot();
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

        sp.wakeAccum = (sp.wakeAccum || 0) + dt;
        if (sp.wakeAccum >= 0.032) {
          sp.wakeAccum = 0;
          this.fx.burst(sp.x, sp.y, {
            count: 1,
            speedMin: 35,
            speedMax: 95,
            lifeMin: 0.14,
            lifeMax: 0.24,
            gravity: 35,
            angle: sp.angle + Math.PI,
            spread: 0.75,
            colors: ['#fde047', '#f43f5e', '#ffffff']
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

              this.fx.spawn('gungnirImpactStarburst', sp.x, sp.y, {
                flip: false,
                palette: sp.isUlt ? VALKYRIE_GOLD_PALETTE : VALKYRIE_CRIMSON_PALETTE,
                light: sp.isUlt ? 1.2 : 1.08,
                extra: { aimAngle: sp.angle, isCrit: sp.isUlt }
              });

              if (game.vfx) {
                game.vfx.spawnSlash(sp.x, sp.y, 96, sp.angle - 0.85, sp.angle + 0.85, '#f43f5e', 0.22);
                game.vfx.spawnBurst(sp.x, sp.y, 8, '#fbbf24', 185, { upBias: 55, size: 4 });
              }
            }
          }
        }

        if (hitSomeone || u >= 1.0 || sp.y >= this.groundY - 4 || sp.age >= sp.maxLife) {
          const impX = sp.x;
          if (!hitSomeone) {
            this.fx.spawn('gungnirImpactStarburst', impX, sp.y, {
              flip: false,
              palette: VALKYRIE_CRIMSON_PALETTE,
              light: 1.0,
              extra: { aimAngle: sp.angle, isCrit: false }
            });
            if (game.vfx) {
              game.vfx.spawnBurst(impX, sp.y, sp.isUlt ? 8 : 6, '#fbbf24', 165, {
                upBias: 65,
                size: 4
              });
            }
          }
          if (sp.isUlt && game.vfx) {
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
    } else if (this._volleySlot) {
      this._volleySlot.inst.release();
      this._volleySlot = null;
    }

    // 6. Step 120Hz `ArcaneShaderFX` runtime
    this.fx.update(dt);

    super.update(dt, enemy, game);

    // Keep Freyja firmly grounded on her shadow during IDLE / WALK / AUTO_ATTACK (zero artificial hover float)
    this.hoverOffset = 0;
  }

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.85 + Math.random() * 0.26);
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    if (dist < 340) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game);
    }
  }

  startDash(enemy, game) {
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    if (dist < 380) {
      this.dashCooldown = this.dashMaxCooldown * (0.86 + Math.random() * 0.28);
      this.startCrouch(enemy, game);
      return;
    }
    super.startDash(enemy, game);
  }

  startCrouch(_enemy, game) {
    // Athletic -360 deg Backward Valkyrie Aerial Backflip (Row 7 CROUCH + Parabolic Vault Arc)
    this.crouchDuration = 0.68;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isInvulnerable = true;
    this.isFlipVault = true;
    this._backflipStep = 0;
    this._didBackflipLand = false;

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let retreatDir = -this.facing;
    if (this.x < 220) retreatDir = 1;
    else if (this.x > ww - 220) retreatDir = -1;

    this.vaultStartX = this.x;
    this.vaultTargetX = Math.max(85, Math.min(ww - 85, this.x + retreatDir * 210));
    this.vx = 0;
    this.vy = 0;
    this.heal(5, 'VALKYRIE GRACE');
    this.spawnAfterimage(this.x, this.y, this.facing, 7, 2, 0.20);

    // 2.5D Valhalla Ground Takeoff Ring + Crimson-Gold Feather Slipstream
    this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
      palette: VALKYRIE_CRIMSON_PALETTE,
      light: 1.08,
      extra: { radius: 28 }
    });
    this.fx.spawn('valkyrieSlipstreamTrail', this.x - this.facing * 14, this.y - 88, {
      follow: this,
      offsetX: -14,
      offsetY: -88,
      flip: this.facing < 0,
      palette: VALKYRIE_CRIMSON_PALETTE,
      maxDuration: 0.56,
      light: 1.05,
      extra: { length: 28, tilt: -0.14 }
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 148,
        0,
        true,
        '★ VALKYRIE BACKFLIP! ★',
        '#fbbf24'
      );
      game.vfx.spawnShockwave(this.x, this.groundY - 6, 98, '#f43f5e', 0.24, true);
    }
  }

  updateCrouch(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.68;
    const u = Math.min(1, t / dur);

    // Takeoff coil (u < 0.08), airborne -360 deg parabolic backflip (0.08..0.80), winged landing (0.80..1.0)
    const moveU = u <= 0.06 ? 0 : u >= 0.82 ? 1 : (u - 0.06) / 0.76;
    const easeMove = 1 - Math.pow(1 - moveU, 1.85);
    this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeMove;

    if (u >= 0.08 && u <= 0.80) {
      const airU = (u - 0.08) / 0.72;
      this.y = this.groundY - Math.sin(airU * Math.PI) * 96;
    } else {
      this.y = this.groundY;
    }
    this.vx = 0;
    this.vy = 0;

    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    const flipThresholds = [0.24, 0.44, 0.64];
    if (this._backflipStep < flipThresholds.length && u >= flipThresholds[this._backflipStep]) {
      this._backflipStep++;
      this.spawnAfterimage(this.x, this.y, this.facing, 7, Math.min(29, Math.floor(u * 29)), 0.22);
    }

    if (t >= 0.26 && !this.didActionFrame) {
      this.didActionFrame = true;
      const sx = this.x + this.facing * 26;
      const sy = this.y - 68;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 320;
      const ty = enemy && !enemy.isDead ? enemy.y - 74 : this.groundY - 74;
      this.spawnGungnirSkySpear(sx, sy, tx, ty, 18, false, -45, -22);

      this.fx.spawn('gungnirSpearThrustCone', sx, sy, {
        flip: false,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.12,
        extra: { aimAngle: Math.atan2(ty - sy, tx - sx), radius: 22, twin: false }
      });

      this.spawnVfxAnim(0, sx + this.facing * 4, sy, 184, 184, 0.24, {
        vx: this.facing * 240,
        flipX: this.facing < 0,
        glowColor: 'crimson'
      });
      if (game?.audio) game.audio.play('holy_spear', this.x);
      if (game?.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'GUNGNIR JAVELIN!', '#fbbf24');
      }
    }

    if (t >= 0.42 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const sx = this.x + this.facing * 26;
      const sy = this.y - 72;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 340;
      const ty = enemy && !enemy.isDead ? enemy.y - 68 : this.groundY - 68;
      this.spawnGungnirSkySpear(sx, sy, tx, ty, 19, false, 45, 16);

      this.fx.spawn('gungnirSpearThrustCone', sx, sy, {
        flip: false,
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.12,
        extra: { aimAngle: Math.atan2(ty - sy, tx - sx), radius: 22, twin: false }
      });
      if (game?.audio) game.audio.play('holy_spear', this.x);
    }

    if (u >= 0.80 && !this._didBackflipLand) {
      this._didBackflipLand = true;
      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.0,
        extra: { radius: 22 }
      });
      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 82, '#fbbf24', 0.20, true);
      }
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

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const clampX = (v) => Math.max(105, Math.min(ww - 105, v));
    this.vaultStartX = this.x;

    // Wide horizontal wing-glide (>= 200px travel) so JUMP is a sleek ~13 deg falcon skim
    let desiredX = clampX(this.x - this.facing * 225);
    if (enemy && !enemy.isDead) {
      const side = this.x <= enemy.x ? -1 : 1;
      const candidateBack = clampX(this.x + side * 220);
      if (Math.abs(candidateBack - this.x) >= 165 && Math.abs(enemy.x - candidateBack) >= 280) {
        desiredX = candidateBack;
      } else {
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

    // 2.5D Valhalla Takeoff Burst + 6-Pinion Valkyrie Light-Wings + Slipstream + Landing Rune Reticle
    this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
      palette: VALKYRIE_GOLD_PALETTE,
      light: 1.1,
      extra: { radius: 30 }
    });
    this.fx.spawn('valkyrieWingPlume', this.x - this.facing * 18, this.y - 116, {
      follow: this,
      offsetX: -18,
      offsetY: -116,
      flip: this.facing < 0,
      palette: VALKYRIE_CRIMSON_PALETTE,
      maxDuration: 0.58,
      light: 1.12,
      extra: { wingSpan: 27 }
    });
    this.fx.spawn('valkyrieSlipstreamTrail', this.x - this.facing * 18, this.y - 94, {
      follow: this,
      offsetX: -18,
      offsetY: -94,
      flip: this.facing < 0,
      palette: VALKYRIE_GOLD_PALETTE,
      maxDuration: 0.56,
      light: 1.05,
      extra: { length: 30, tilt: -0.08 }
    });
    this.fx.spawn('valhallaTargetReticle', this.dragoonTargetX, this.groundY, {
      palette: VALKYRIE_GOLD_PALETTE,
      maxDuration: 0.62,
      light: 1.05,
      extra: { radius: 22, beaconH: 34, duration: 0.64 }
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(
        this.x,
        this.y - 148,
        0,
        true,
        '★ VALKYRIE WING-GLIDE! ★',
        '#fbbf24'
      );
      game.vfx.spawnShockwave(this.x, this.groundY - 4, 108, '#fbbf24', 0.26, true);
    }
  }

  onStartDash(_enemy, game, _dir) {
    this.isFlipVault = false;
    this.dashDir = this.facing;

    this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
      palette: VALKYRIE_CRIMSON_PALETTE,
      light: 1.0,
      extra: { radius: 22 }
    });
    this.fx.spawn('valkyrieSlipstreamTrail', this.x - this.facing * 18, this.y - 92, {
      follow: this,
      offsetX: -18,
      offsetY: -92,
      flip: this.facing < 0,
      palette: VALKYRIE_CRIMSON_PALETTE,
      maxDuration: 0.32,
      light: 1.05,
      extra: { length: 26, tilt: -0.05 }
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
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
      // Wide, shallow 46px-max-altitude horizontal Valkyrie Wing-Vault
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
        const sx = this.x + this.facing * 26;
        const sy = this.y - 88;
        const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 360;
        const ty = enemy && !enemy.isDead ? enemy.y - 72 : this.groundY - 72;
        this.spawnGungnirSkySpear(sx, sy, tx, ty, 19, false, -65, -28);
        this.fx.spawn('gungnirSpearThrustCone', sx, sy, {
          flip: false,
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.1,
          extra: { aimAngle: Math.atan2(ty - sy, tx - sx), radius: 21, twin: false }
        });
        if (game?.audio) game.audio.play('holy_spear', this.x);
      }
      if (u >= 0.56 && (this._jumpJavelins || 0) < 2) {
        this._jumpJavelins = 2;
        const sx = this.x + this.facing * 26;
        const sy = this.y - 86;
        const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 360;
        const ty = enemy && !enemy.isDead ? enemy.y - 68 : this.groundY - 68;
        this.spawnGungnirSkySpear(sx, sy, tx, ty, 20, false, 65, 14);
        this.fx.spawn('gungnirSpearThrustCone', sx, sy, {
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.12,
          extra: { aimAngle: Math.atan2(ty - sy, tx - sx), radius: 21, twin: false }
        });
        if (game?.audio) game.audio.play('holy_spear', this.x);
      }

      if (t >= dur) {
        this.y = this.groundY;
        this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.0,
          extra: { radius: 22 }
        });
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
    // Grounded Ranged Valkyrie Lance-Projection Combo (Row 2 F00..F29): firmly planted sabatons!
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;

    if (t >= 0.03 && !this._drewSpearFocus) {
      this._drewSpearFocus = true;
      const isFinisher = this.comboStep === 2;
      this.fx.spawn('gungnirSpearFocus', this.x + this.facing * 40, this.y - 92, {
        follow: this,
        offsetX: 40,
        offsetY: -92,
        palette: isFinisher ? VALKYRIE_GOLD_PALETTE : VALKYRIE_CRIMSON_PALETTE,
        maxDuration: 0.15,
        light: 1.08,
        extra: { radius: isFinisher ? 22 : 18 }
      });
    }

    if (t >= 0.16 && !this.didActionFrame) {
      this.didActionFrame = true;
      const sx = this.x + this.facing * 38;
      const sy = this.y - 92;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 380;
      const ty = enemy && !enemy.isDead ? enemy.y - 76 : this.groundY - 76;
      const vArc = this.comboStep % 2 === 0 ? -28 : 16;
      this.spawnGungnirSkySpear(
        sx,
        sy,
        tx,
        ty,
        17,
        false,
        this.comboStep % 2 === 0 ? -45 : 45,
        vArc
      );
      this.fx.spawn('gungnirSpearThrustCone', sx, sy, {
        flip: false,
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.12,
        extra: { aimAngle: Math.atan2(ty - sy, tx - sx), radius: 23, twin: false }
      });
      if (game?.audio) game.audio.play('holy_spear', this.x);
    }

    if (t >= 0.36 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const step = this.comboStep;
      this.comboStep = (this.comboStep + 1) % 3;
      const sx = this.x + this.facing * 38;
      const sy = this.y - 90;
      const tx = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 380;
      const ty = enemy && !enemy.isDead ? enemy.y - 72 : this.groundY - 72;
      const aimAng = Math.atan2(ty - sy, tx - sx);

      if (step < 2) {
        const vArc = step % 2 === 0 ? 18 : -26;
        this.spawnGungnirSkySpear(sx, sy, tx, ty, 18, false, step % 2 === 0 ? 50 : -50, vArc);
        this.fx.spawn('gungnirSpearThrustCone', sx, sy, {
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.15,
          extra: { aimAngle: aimAng, radius: 24, twin: false }
        });
        if (game?.audio) game.audio.play('holy_spear', this.x);
      } else {
        // 3rd-Combo Finisher: Twin Converging Horizontal Pincer Javelins + Wyvern Spiral Lance-Wave!
        this.fx.spawn('gungnirSpearThrustCone', sx, sy, {
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.25,
          extra: { aimAngle: aimAng, radius: 30, twin: true }
        });
        this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.05,
          extra: { radius: 22 }
        });

        this.spawnVfxAnim(0, this.x + this.facing * 44, this.y - 88, 196, 196, 0.28, {
          vx: this.facing * 270,
          flipX: this.facing < 0,
          glowColor: 'gold'
        });
        this.spawnGungnirSkySpear(
          this.x + this.facing * 34,
          this.y - 102,
          tx,
          ty - 8,
          16,
          false,
          -65,
          -36
        );
        this.spawnGungnirSkySpear(
          this.x + this.facing * 34,
          this.y - 80,
          tx,
          ty + 8,
          16,
          false,
          65,
          24
        );
        if (game?.audio) game.audio.play('holy_spear', this.x);
        if (game?.vfx) {
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

      const lockTargetX =
        enemy && !enemy.isDead ? clampX(enemy.x) : clampX(this.x + this.facing * 360);

      // 2.5D Grounded Valhalla Burst + Floating Gungnir Rune Halo + 6-Pinion Light-Wings + Target Reticle
      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.12,
        extra: { radius: 30 }
      });
      this.fx.spawn('valkyrieHaloArray', this.x, this.y - 94, {
        follow: this,
        offsetX: 0,
        offsetY: -94,
        palette: VALKYRIE_CRIMSON_PALETTE,
        maxDuration: 0.56,
        light: 1.15,
        extra: { rx: 24, ry: 12 }
      });
      this.fx.spawn('valkyrieWingPlume', this.x - this.facing * 18, this.y - 118, {
        follow: this,
        offsetX: -18,
        offsetY: -118,
        flip: this.facing < 0,
        palette: VALKYRIE_CRIMSON_PALETTE,
        maxDuration: 0.72,
        light: 1.15,
        extra: { wingSpan: 28 }
      });
      this.fx.spawn('valhallaTargetReticle', lockTargetX, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        maxDuration: 0.72,
        light: 1.12,
        extra: { radius: 32, beaconH: 46, duration: 0.74 }
      });

      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(this, this.skillName, '✦ VALKYRIE SKILL ✦', 'crimson', false);
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 108, '#fbbf24', 0.26, true);
      }
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

    // Phase 1 (0.18s .. 0.57s -> Row 3 F06..F18): Sleek Low Horizontal Wing-Skim (max lift 18px over ~165px)
    if (t >= 0.18 && t < 0.57) {
      if (this._skillStep < 1) {
        this._skillStep = 1;
        this.fx.spawn('valkyrieSlipstreamTrail', this.x - this.facing * 18, this.y - 96, {
          follow: this,
          offsetX: -18,
          offsetY: -96,
          flip: this.facing < 0,
          palette: VALKYRIE_CRIMSON_PALETTE,
          maxDuration: 0.38,
          light: 1.1,
          extra: { length: 28, tilt: -0.06 }
        });
      }

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

      this.spawnGungnirSkySpear(sx, sy, tx, ty, 12, false, arcSpreads[idx], verticalArcs[idx]);
      this.fx.burst(sx, sy, {
        count: 5,
        speedMin: 60,
        speedMax: 165,
        angle: Math.atan2(ty - sy, tx - sx),
        spread: 0.85,
        colors: ['#fde047', '#f43f5e', '#ffffff']
      });
      if (game?.audio) game.audio.play('holy_spear', sx);
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

        // Supersonic Gungnir Command Thrust Cone + True 2.5D Dragonfire Obelisk Judgment Pillar
        this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 48, this.groundY - 90, {
          flip: false,
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.25,
          extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 30, twin: true }
        });
        this.fx.spawn('dragonfireObeliskPillar', strikeX, this.groundY, {
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.2,
          extra: { baseRadius: 15, height: 84, isUltimate: false }
        });

        if (game?.audio) game.audio.play('holy_spear', strikeX);
        if (game?.renderer) game.renderer.triggerShake(9, 0.18);
        if (game?.vfx) {
          game.vfx.spawnShockwave(strikeX, this.groundY - 6, 152, '#f43f5e', 0.32, true);
          game.vfx.spawnBurst(strikeX, this.groundY - 42, 16, '#fbbf24', 230, {
            upBias: 135,
            size: 5
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
        this.spawnVfxAnim(4, strikeX, this.groundY - 82, 208, 208, 0.34, {
          glowColor: 'gold',
          inFront: true
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

      const openSide = enemyX >= ww * 0.5 ? -1 : 1;
      const outerEdgeX = openSide < 0 ? 115 : ww - 115;
      const innerEdgeX = clampX(enemyX + openSide * 265);
      const midRunwayX = Math.round((outerEdgeX + innerEdgeX) * 0.5);

      if (Math.abs(originX - outerEdgeX) >= Math.abs(originX - innerEdgeX)) {
        this._ultWaypoints = {
          climb: { x: outerEdgeX, y: this.groundY - 54 },
          drift: { x: midRunwayX, y: this.groundY - 46 },
          land: { x: clampX(enemyX + openSide * 295), y: this.groundY }
        };
      } else {
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

      // 1. Grounded Valhalla Awakening Burst + 6-Pinion Sovereign Light-Wings + Gungnir Halo + Target Sanctuary Seal
      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.2,
        extra: { radius: 36 }
      });
      this.fx.spawn('valkyrieWingPlume', this.x - this.facing * 18, this.y - 120, {
        follow: this,
        offsetX: -18,
        offsetY: -120,
        flip: this.facing < 0,
        palette: VALKYRIE_CRIMSON_PALETTE,
        maxDuration: 1.54,
        light: 1.25,
        extra: { wingSpan: 34 }
      });
      this.fx.spawn('valkyrieHaloArray', this.x, this.y - 98, {
        follow: this,
        offsetX: 0,
        offsetY: -98,
        palette: VALKYRIE_GOLD_PALETTE,
        maxDuration: 1.44,
        light: 1.2,
        extra: { rx: 28, ry: 14 }
      });
      this.fx.spawn('valhallaTargetReticle', clampX(enemyX), this.groundY, {
        palette: VALKYRIE_CRIMSON_PALETTE,
        maxDuration: 1.52,
        light: 1.2,
        extra: { radius: 44, beaconH: 58, duration: 1.55 }
      });

      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(this, this.ultName, '★ ULTIMATE OVERDRIVE ★', 'crimson', true);
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 155, '#fbbf24', 0.34, true);
      }
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

      if (!this._ultPassCone1) {
        this._ultPassCone1 = true;
        this.fx.spawn('valkyrieSlipstreamTrail', this.x - this.facing * 18, this.y - 98, {
          follow: this,
          offsetX: -18,
          offsetY: -98,
          flip: this.facing < 0,
          palette: VALKYRIE_CRIMSON_PALETTE,
          maxDuration: 1.12,
          light: 1.18,
          extra: { length: 32, tilt: -0.1 }
        });
        this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 32, this.y - 92, {
          flip: false,
          palette: VALKYRIE_CRIMSON_PALETTE,
          light: 1.18,
          extra: { aimAngle: wps.climb.x >= originX ? -0.16 : Math.PI + 0.16, radius: 26, twin: false }
        });
      }

      if (t < 0.68) {
        const u = (t - 0.30) / 0.38;
        const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const dx = wps.climb.x - originX;
        this.x = originX + dx * ease;
        this.y = this.groundY + (wps.climb.y - this.groundY) * ease;
        this.facing = Math.abs(dx) > 25 ? (dx >= 0 ? 1 : -1) : enemyX >= this.x ? 1 : -1;
        this.divePitchRad = -0.17;
        spawnTrail = true;
      } else if (t < 1.10) {
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
        const u = (t - 1.10) / 0.34;
        const ease = u * u * (3 - 2 * u);
        this.x = wps.drift.x + (wps.land.x - wps.drift.x) * ease;
        this.y = wps.drift.y + (wps.land.y - wps.drift.y) * ease;
        this.facing = enemyX >= this.x ? 1 : -1;
        this.divePitchRad = 0.17;
        spawnTrail = true;

        if (!this._ultPassCone3) {
          this._ultPassCone3 = true;
          this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 36, this.y - 86, {
            flip: false,
            palette: VALKYRIE_GOLD_PALETTE,
            light: 1.2,
            extra: { aimAngle: this.facing >= 0 ? 0.16 : Math.PI - 0.16, radius: 28, twin: true }
          });
        }
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
        const clampedTx = Math.max(90, Math.min(ww - 90, tx));

        this.spawnGungnirSkySpear(
          sx,
          sy,
          clampedTx,
          ty,
          10,
          true,
          arcSpreadSlots[idx % arcSpreadSlots.length],
          vArcSlots[idx % vArcSlots.length]
        );
        this.fx.burst(sx, sy, {
          count: 4,
          speedMin: 60,
          speedMax: 165,
          angle: Math.atan2(ty - sy, clampedTx - sx),
          spread: 0.85,
          colors: ['#fde047', '#f43f5e', '#ffffff']
        });
        if (game?.audio) game.audio.play('holy_spear', sx);
      }
      return;
    }

    // Stage 2 (1.44s .. 1.80s -> Row 4 F24..F29): 100% Grounded Sovereign Forward Thrust & Cataclysm!
    this.x = wps.land.x;
    this.y = this.groundY;
    this.divePitchRad = 0;
    if (enemy && !enemy.isDead) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    if (!this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const impactX = Math.max(90, Math.min(ww - 90, enemy && !enemy.isDead ? enemy.x : ww * 0.5));

      if (game?.audio) {
        game.audio.play('thunder_slam', impactX);
      }
      if (game?.renderer) {
        game.renderer.triggerShake(16, 0.30);
        game.renderer.triggerAberration(9);
        game.renderer.triggerHitStop(0.065);
      }

      // Sovereign Forward Thrust Cone + Colossal True 2.5D Dragonfire Judgment Pillars (`back` + `front` wrap)
      this.fx.spawn('gungnirSpearThrustCone', this.x + this.facing * 50, this.groundY - 92, {
        flip: false,
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.3,
        extra: { aimAngle: this.facing >= 0 ? 0 : Math.PI, radius: 34, twin: true }
      });
      this.fx.spawn('valhallaGroundBurst', this.x, this.groundY, {
        palette: VALKYRIE_GOLD_PALETTE,
        light: 1.15,
        extra: { radius: 30 }
      });
      this.fx.spawn('dragonfireObeliskPillar', impactX, this.groundY, {
        palette: VALKYRIE_CRIMSON_PALETTE,
        light: 1.35,
        extra: { baseRadius: 19, height: 92, isUltimate: true }
      });
      for (const sideOff of [-110, 110]) {
        const flankX = Math.max(85, Math.min(ww - 85, impactX + sideOff));
        this.fx.spawn('dragonfireObeliskPillar', flankX, this.groundY, {
          palette: VALKYRIE_GOLD_PALETTE,
          light: 1.2,
          extra: { baseRadius: 14, height: 76, isUltimate: false }
        });
      }

      if (game?.vfx) {
        game.vfx.spawnShockwave(this.x, this.groundY - 4, 128, '#fbbf24', 0.30, true);
        game.vfx.spawnShockwave(impactX, this.groundY - 6, 265, '#fbbf24', 0.44, true);
        game.vfx.spawnSlash(impactX, this.groundY - 78, 195, -Math.PI, Math.PI, '#f43f5e', 0.38);
        game.vfx.spawnBurst(impactX, this.groundY - 58, 28, '#f43f5e', 320, {
          upBias: 195,
          size: 6
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
      }

      this.spawnVfxAnim(4, impactX, this.groundY - 96, 236, 236, 0.42, {
        glowColor: 'gold',
        inFront: true
      });

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

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().valkyrie;
    const vfxSheet = sprites?.vfx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Colossal Bahamut / Valhalla Sovereign Crest (`Row 3` of `valkyrie_vfx.png`) behind Freyja
    if (this.bahamutAvatar && vfxSheet?.complete) {
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
        fade * 0.88,
        this.facing < 0,
        renderer,
        'crimson'
      );
    }

    // 2. Crisp Un-Rotated Crimson-Gold Valkyrie Afterimages (`CROUCH`, `JUMP`, `DASH`, `SKILL`, `ULTIMATE`)
    if (this.afterimages.length > 0 && sprites?.sheet?.complete) {
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

    // 3. Background 30fps `valkyrie_vfx.png` cell animations
    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete) {
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

    ctx.restore();

    // 4. Live 120Hz `ArcaneShaderFX` "back" layer (2.5D Light-Wings, Slipstreams, Back Seal/Obelisk Halves)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
  }

  drawUltimateForeground(ctx, renderer = null) {
    // 1. Live 120Hz `ArcaneShaderFX` "front" layer (Spear Mach Cones, Bezier Gungnir Javelins & Front 2.5D Obelisks)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    // 2. Foreground 30fps `valkyrie_vfx.png` cell bursts
    const sprites = PixelForge.initAssets().valkyrie;
    const vfxSheet = sprites?.vfx;
    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete) {
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
