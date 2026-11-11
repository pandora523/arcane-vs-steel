import { Fighter } from './Fighter.js?v=30fps68';
import { PixelForge } from '../engine/PixelForge.js?v=30fps68';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps68';
import {
  CYBER_EFFECT_REGISTRY,
  CYBER_NEON_PALETTE,
  CYBER_MAGENTA_PALETTE
} from '../engine/shaders/cyberShaders.js?v=30fps68';

const CYBER_HIT_STOP_SEC = 0.038;

/**
 * VEX-09 (`android`) — Cybernetic Valkyrie Skirmisher Champion.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D shader & particle engine)
 * + `assets/sprites/android_sheet.png` & `assets/sprites/android_vfx.png`.
 */
export class Android extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'VEX-09',
      maxHp: 3760,
      moveSpeed: 228,
      attackRange: 192,
      autoInterval: 0.86,
      lightColor: 'rgba(0, 240, 255, 1)',
      primaryColor: '#00f0ff'
    });

    this.heroId = 'android';
    this.deathSfx = 'death_android';
    this.skillName = 'EMP OVERLOAD BLITZ';
    this.ultName = 'SINGULARITY PROTOCOL';
    this.hasTrueUltimate = true;
    this.trueUltName = 'PROJECT GUNG-09: ORBITAL SATELLITE BUSTER';
    this.trueUltDuration = 4.45;
    this.theme = 'cyber';
    this.hasPoise = true;
    this.skillTriggerRange = 460;
    this.skillMaxCooldown = 4.32;
    this.dodgeMaxCooldown = 3.4;
    this.dashMaxCooldown = 3.5;
    this.autoDuration = 0.50;
    this.skillDuration = 0.96;
    this.ultDuration = 1.85;
    this.crouchDuration = 0.88;
    this.dashDuration = 0.34;
    this.comboStep = 0;

    // Native 120Hz dual-buffer HD-2D shader & particle engine (`back` & `front` 2.5D layers)
    this.fx = new ArcaneShaderFX(CYBER_EFFECT_REGISTRY, { pixelScale: 3, viewW: 440, viewH: 220 });

    // Ensure browser always fetches latest v=30fps62 VEX-09 sprite & VFX sheets
    if (typeof Image !== 'undefined') {
      const androidAssets = PixelForge.initAssets()?.android;
      if (androidAssets?.sheet?.src && !androidAssets.sheet.src.includes('v=30fps62')) {
        androidAssets.sheet.src = 'assets/sprites/android_sheet.png?v=30fps68';
      }
      if (androidAssets?.vfx?.src && !androidAssets.vfx.src.includes('v=30fps62')) {
        androidAssets.vfx.src = 'assets/sprites/android_vfx.png?v=30fps68';
      }
    }

    // Autonomous Fin-Funnel Drones & Supreme Ultimate state
    this.funnelDrones = [
      { angle: 0, x: this.x, y: this.y - 120 },
      { angle: Math.PI * 0.5, x: this.x, y: this.y - 120 },
      { angle: Math.PI, x: this.x, y: this.y - 120 },
      { angle: Math.PI * 1.5, x: this.x, y: this.y - 120 }
    ];
    this._trueUltStep = 0;
    this._trueUltTargetX = 600;
    this._trueUltBusterTimer = 0;

    // Baked 30fps `android_vfx.png` constructs & holographic afterimages
    this.afterimages = [];
    this.activeVfxAnims = [];
    this._skillStep = 0;
    this._ultStep = 0;
    this._ultFocusX = this.x + this.facing * 180;
    this._ultCoreFx = null;
    this._deathSparksTriggered = false;
  }

  setState(newState) {
    super.setState(newState);
    if (newState !== 'CROUCH') {
      this.isDeflecting = false;
      this.fx?.stopByKey('aegisHexDome');
    }
    if (
      newState !== 'DASH' &&
      newState !== 'JUMP' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.fx?.stopByKey('wingPylonThruster');
    }
    if (newState === 'SKILL') {
      this._skillStep = 0;
    }
    if (newState === 'ULTIMATE') {
      this._ultStep = 0;
      this._ultCoreFx = null;
    }
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
    }
  }

  spawnAfterimage(x, y, facing, row = 6, col = 12, maxLife = 0.26) {
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + col,
      age: 0,
      maxLife
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.52, opts = {}) {
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
      foreground: Boolean(opts.foreground),
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0
    });
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    // Aegis Hex-Matrix Guard (`CROUCH` F02..F13): absorbs 65% melee damage & triggers counter-discharge
    if (this.isDeflecting && !this.isDead) {
      const reduced = Math.max(1, Math.round(amount * 0.35));
      this.fx.spawn('cyberImpactSpark', this.x + this.facing * 42, this.y - 78, {
        palette: CYBER_NEON_PALETTE,
        flip: this.facing < 0,
        light: 1.15
      });
      if (this.game?.vfx) {
        this.game.vfx.spawnDamageText(
          this.x,
          this.y - 178,
          0,
          false,
          'HEX MATRIX GUARD!',
          '#00f0ff'
        );
      }
      if (this.game?.audio) {
        this.game.audio.play('reflect', this.x);
      }
      super.takeDamage(reduced, attacker, false, knockX * 0.25, 0);
      return;
    }

    super.takeDamage(amount, attacker, isCrit, knockX, knockY);

    if (this.isDead && !this._deathSparksTriggered) {
      this._deathSparksTriggered = true;
      this.fx.spawn('rgbGlitchTear', this.x, this.groundY, {
        palette: CYBER_MAGENTA_PALETTE,
        light: 1.05
      });
      this.fx.spawn('cyberImpactSpark', this.x, this.groundY - 62, {
        palette: CYBER_NEON_PALETTE,
        light: 1.0
      });
    } else if (!this.isDead && (isCrit || amount >= 42)) {
      this.fx.spawn('rgbGlitchTear', this.x, this.groundY, {
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        palette: CYBER_MAGENTA_PALETTE,
        maxDuration: 0.34,
        light: 0.9
      });
    }
  }

  startCrouch(enemy, game) {
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.crouchDuration = 0.86;
    this.vx = 0;

    // Full-height 3D Geodesic Hexagonal Aegis Dome (`back` + `front` wraparound, `252x168px` world size)
    this.fx.spawn('aegisHexDome', this.x + this.facing * 6, this.groundY, {
      follow: this,
      offsetX: 6,
      offsetY: 0,
      useGroundY: true,
      flip: this.facing < 0,
      palette: CYBER_NEON_PALETTE,
      maxDuration: 0.44,
      light: 1.0,
      extra: {
        radius: 42,
        radiusY: 56
      }
    });

    if (game?.audio) {
      game.audio.play('reflect', this.x);
    }
  }

  startJump(enemy, game, dir = 1) {
    this.dashDuration = 0.62;
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isFlipVault = true;
    this._jumpStartX = this.x;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const jumpDir = dir || this.facing;
    this._jumpEndX = Math.max(95, Math.min(ww - 95, this.x + jumpDir * 195));

    // Tankless twin-pylon plasma thruster exhaust anchored to upper-back shoulder wing-pylons (`back` layer)
    this.fx.spawn('wingPylonThruster', this.x - this.facing * 18, this.y - 138, {
      follow: this,
      offsetX: -18,
      offsetY: -138,
      flip: this.facing < 0,
      palette: CYBER_NEON_PALETTE,
      maxDuration: 0.44,
      light: 1.0,
      extra: { length: 18, tilt: -0.65 }
    });

    if (game?.audio) {
      game.audio.play('zephyr_flip', this.x);
    }
  }

  onStartDodge(enemy, game, dir) {
    // 55% Hex-Matrix Crouch Deflect & Counter-Chakram, 45% Wing-Pylon Aerial Vault Cleave
    if (Math.random() < 0.55) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game, dir);
    }
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.34;
    this.dashDir = dir || this.facing;
    this.fx.spawn('cyberImpactSpark', this.x, this.groundY, {
      palette: CYBER_NEON_PALETTE,
      light: 1.0,
      extra: { phaseMode: true }
    });
    this.fx.spawn('wingPylonThruster', this.x - this.facing * 20, this.y - 134, {
      follow: this,
      offsetX: -20,
      offsetY: -134,
      flip: this.facing < 0,
      palette: CYBER_MAGENTA_PALETTE,
      maxDuration: 0.30,
      light: 1.05,
      extra: { length: 20, tilt: -0.88 }
    });
    if (game?.audio) {
      game.audio.play('blink', this.x);
    }
  }

  reflectNearbyProjectiles(game) {
    if (!game?.vfx?.projectiles) return;
    for (const p of game.vfx.projectiles) {
      if (p.owner === this || (this.team && p.owner?.team === this.team)) continue;
      if (Math.abs(p.x - this.x) < 96 && Math.abs(p.y - (this.y - 96)) < 98) {
        p.owner = this;
        p.vx = -p.vx * 1.25;
        p.type = 'cyber_disc';
        p.color = '#00f0ff';
        p.damage = Math.max(32, Math.round((p.damage || 28) * 1.15));
        this.fx.spawn('cyberImpactSpark', p.x, p.y, {
          palette: CYBER_NEON_PALETTE,
          light: 1.2
        });
        if (game.audio) game.audio.play('reflect', this.x);
        if (game.vfx) {
          game.vfx.spawnDamageText(this.x, this.y - 186, 0, true, '★ CHAKRAM DEFLECT! ★', '#00f0ff');
        }
      }
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    if (this.state === 'JUMP') {
      const u = Math.min(1, this.stateTimer / (this.dashDuration || 0.62));
      this.x = this._jumpStartX + (this._jumpEndX - this._jumpStartX) * u;
      this.y = this.groundY - Math.sin(u * Math.PI) * 118;

      if (!this.didActionFrame && u >= 0.52) {
        this.didActionFrame = true;
        // `plasmaCrescentSlash` has built-in `cy = -26` (`-78px` at 3x), so `this.y - 18` centers arc at `this.y - 96`
        this.fx.spawn('plasmaCrescentSlash', this.x + this.facing * 38, this.y - 18, {
          flip: this.facing < 0,
          palette: CYBER_NEON_PALETTE,
          light: 1.1,
          extra: { radius: 38, sparks: ['#ffffff', '#7df9ff', '#00f0ff', '#ff2e93'] }
        });
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 205) {
          enemy.takeDamage(68, this, false, 130, 0);
          this.gainMana(4);
          this.fx.spawn('cyberImpactSpark', enemy.x - this.facing * 10, enemy.y - 96, {
            palette: CYBER_NEON_PALETTE,
            light: 1.15
          });
        }
        if (game?.audio) game.audio.play('cyber_slash', this.x);
      }

      if (u >= 1) {
        this.y = this.groundY;
        this.isFlipVault = false;
        this.setState('IDLE');
      }
      return;
    }

    // Wing-Pylon Phase-Rush (`DASH`)
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    this.x = Math.max(85, Math.min(ww - 85, this.x + (this.dashDir || this.facing) * 620 * dt));
    if (Math.random() < 0.45) {
      this.spawnAfterimage(this.x, this.y, this.facing, 6, 12, 0.22);
    }
    if (this.stateTimer >= this.dashDuration) {
      this.fx.spawn('cyberImpactSpark', this.x, this.groundY, {
        palette: CYBER_MAGENTA_PALETTE,
        light: 0.95,
        extra: { phaseMode: true }
      });
      this.setState('IDLE');
    }
  }

  updateCrouch(dt, enemy, game) {
    const u = this.stateTimer / (this.crouchDuration || 0.86);
    if (u <= 0.52) {
      this.isDeflecting = true;
      this.reflectNearbyProjectiles(game);
    } else {
      this.isDeflecting = false;
      this.fx.stopByKey('aegisHexDome');
    }

    // Counter-slash + Cyber Chakram Disc launch at F15 (`u >= 0.52`)
    if (!this.didActionFrame && u >= 0.52) {
      this.didActionFrame = true;
      this.fx.spawn('plasmaCrescentSlash', this.x + this.facing * 44, this.groundY, {
        flip: this.facing < 0,
        palette: CYBER_MAGENTA_PALETTE,
        light: 1.05,
        extra: { radius: 34, sparks: ['#ffffff', '#ff2e93', '#00f0ff'] }
      });
      if (game?.vfx) {
        game.vfx.spawnProjectile({
          x: this.x + this.facing * 58,
          y: this.groundY - 92,
          vx: this.facing * 640,
          vy: 0,
          radius: 24,
          damage: 68,
          color: '#00f0ff',
          owner: this,
          type: 'cyber_disc'
        });
      }
      if (game?.audio) game.audio.play('cyber_slash', this.x);
    }

    if (this.stateTimer >= this.crouchDuration) {
      this.setState('IDLE');
    }
  }

  updateAutoAttack(dt, enemy, game) {
    const u = this.stateTimer / (this.autoDuration || 0.50);
    // Forward lunge momentum during strike frames F08..F15
    if (u >= 0.22 && u <= 0.52) {
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 165 * dt));
    }

    if (!this.didActionFrame && u >= 0.30) {
      this.didActionFrame = true;
      const combo = this.comboStep % 3;
      const step = combo;
      this.comboStep++;
      const hitX = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 155;

      if (combo === 2) {
        // 3rd Hit Finisher: `twinCrossSlash` has built-in `X = +34 (+102px), Y = -23 (-69px)`
        this.fx.spawn('twinCrossSlash', this.x - this.facing * 14, this.groundY - 24, {
          flip: this.facing < 0,
          palette: CYBER_MAGENTA_PALETTE,
          light: 1.15,
          extra: { sparks: ['#ffffff', '#7df9ff', '#00f0ff', '#ff2e93'] }
        });
        if (game?.vfx) {
          game.vfx.spawnProjectile({
            x: this.x + this.facing * 68,
            y: this.groundY - 94,
            vx: this.facing * 670,
            vy: 0,
            radius: 25,
            damage: 66,
            color: '#00f0ff',
            owner: this,
            type: 'cyber_disc'
          });
        }
        // Command 2 of her autonomous Fin-Funnel Drones (android_vfx.png Row 6, 150x150) to fire converging cyan-magenta laser pulses at the target
        for (let dIdx = 0; dIdx < 2; dIdx++) {
          const drone = this.funnelDrones?.[dIdx];
          const droneX = drone ? drone.x : this.x + this.facing * (dIdx === 0 ? -36 : 42);
          const droneY = drone ? drone.y : this.y - (dIdx === 0 ? 148 : 122);
          this.spawnVfxAnim(6, droneX, droneY, 150, 150, 0.30, {
            flipX: this.facing < 0,
            foreground: true
          });
          this.fx.spawn('orbitalHelixBeam', droneX, droneY, {
            flip: false,
            palette: dIdx === 0 ? CYBER_NEON_PALETTE : CYBER_MAGENTA_PALETTE,
            light: 1.18,
            extra: {
              dx: (hitX - droneX) / 3,
              dy: (this.groundY - 96 - droneY) / 3,
              width: 3.8
            }
          });
        }
        this.spawnVfxAnim(6, hitX, this.groundY - 96, 176, 176, 0.34, { foreground: true });
      } else {
        // `plasmaCrescentSlash` has built-in `cx = +6 (+18px), cy = -26 (-78px)` & floor sparks at `y = 0` (`groundY`)
        this.fx.spawn('plasmaCrescentSlash', this.x + this.facing * 44, this.groundY - 8, {
          flip: this.facing < 0,
          palette: step === 0 ? CYBER_NEON_PALETTE : CYBER_MAGENTA_PALETTE,
          light: 1.1,
          extra: {
            radius: 38,
            sparks: ['#ffffff', '#7df9ff', '#00f0ff', '#ff2e93']
          }
        });
      }

      if (game?.audio) {
        game.audio.play('cyber_slash', this.x);
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 210) {
        const isCrit = step === 2 || Math.random() < 0.24;
        const dmg = step === 2 ? 88 : 64;
        enemy.takeDamage(dmg, this, isCrit, step === 2 ? 145 : 85, 0);
        this.gainMana(5);

        this.fx.spawn('cyberImpactSpark', enemy.x - this.facing * 12, enemy.y - 96, {
          palette: CYBER_NEON_PALETTE,
          light: 1.15
        });

        if (game?.renderer) {
          game.renderer.triggerHitStop(CYBER_HIT_STOP_SEC * 0.55);
        }
      }
    }

    if (this.stateTimer >= this.autoDuration) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    // Step 0 (t >= 0.04s): Holo-Target Reticle Lock on full 208x208 enemy silhouette
    if (this._skillStep === 0 && t >= 0.04) {
      this._skillStep = 1;
      const lockX = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 180;
      const lockY = enemy && !enemy.isDead ? enemy.groundY : this.groundY;
      this.fx.spawn('holoTargetReticle', lockX, lockY, {
        palette: CYBER_NEON_PALETTE,
        light: 1.05,
        extra: { boxW: 22, boxH: 62 }
      });
      if (game?.audio) game.audio.play('skill_cast', this.x);
    }

    // Step 1 (t >= 0.28s): Cyber Thruster Blitz Lunge + X-Cross Plasma Strike
    if (this._skillStep === 1 && t >= 0.28) {
      this._skillStep = 2;
      this.spawnAfterimage(this.x, this.y, this.facing, 3, 9, 0.28);
      if (enemy && !enemy.isDead) {
        const targetX = enemy.x - this.facing * 92;
        if (Math.abs(enemy.x - this.x) <= 460) {
          this.x = Math.max(85, Math.min(ww - 85, targetX));
        }
      } else {
        this.x = Math.max(85, Math.min(ww - 85, this.x + this.facing * 170));
      }
      this.spawnAfterimage(this.x - this.facing * 48, this.y, this.facing, 3, 12, 0.26);

      this.fx.spawn('twinCrossSlash', this.x - this.facing * 10, this.groundY - 24, {
        flip: this.facing < 0,
        palette: CYBER_MAGENTA_PALETTE,
        light: 1.15,
        extra: { sparks: ['#ffffff', '#7df9ff', '#00f0ff', '#ff2e93'] }
      });

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 235) {
        enemy.takeDamage(78, this, false, 95, 0);
        this.fx.spawn('cyberImpactSpark', enemy.x, enemy.y - 96, {
          palette: CYBER_NEON_PALETTE,
          light: 1.2
        });
      }
      if (game?.audio) game.audio.play('cyber_slash', this.x);
    }

    // Step 2 (t >= 0.54s): Instant Hemispherical EMP Scanline Dome Detonation (`warmup: 0.42` pops right on beat)
    if (this._skillStep === 2 && t >= 0.54) {
      this._skillStep = 3;
      const empX = enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 280 ? enemy.x : this.x + this.facing * 95;
      this.fx.spawn('empOverloadDome', empX, this.groundY, {
        palette: CYBER_NEON_PALETTE,
        warmup: 0.42,
        light: 1.2,
        extra: { radius: 48, fringe: '#ff2e93' }
      });

      const foes = game?.fighters
        ? game.fighters.filter((f) => f && !f.isDead && !f.isBenched && f !== this && (!this.team || f.team !== this.team))
        : enemy && !enemy.isDead
          ? [enemy]
          : [];
      for (const foe of foes) {
        if (Math.abs(foe.x - empX) <= 235) {
          foe.takeDamage(92, this, true, 155, -135);
          this.fx.spawn('rgbGlitchTear', foe.x, foe.groundY, {
            follow: foe,
            offsetX: 0,
            offsetY: 0,
            palette: CYBER_MAGENTA_PALETTE,
            maxDuration: 0.42,
            light: 0.95
          });
        }
      }
      this.heal(32, 'NANO SHIELD');
      this.gainMana(6);

      if (game?.renderer) {
        game.renderer.triggerShake(9, 0.18);
        game.renderer.triggerAberration(5);
      }
      if (game?.audio) game.audio.play('emp_blast', empX);
    }

    if (t >= this.skillDuration) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.isInvulnerable = t < 1.55;

    // Hover ascension curve matching Row 4 (`ULTIMATE`)
    if (t < 1.48) {
      const lift = Math.sin(Math.min(1, t / 1.48) * Math.PI) * 34;
      this.y = this.groundY - lift;
    } else {
      this.y = this.groundY;
    }

    // Step 0 (t >= 0.05s): Ignite Upper-Back Wing-Pylon Thrusters + Deploy `singularityReactor` & Holo-Lock
    if (this._ultStep === 0 && t >= 0.05) {
      this._ultStep = 1;
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const rawFocusX = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 220;
      this._ultFocusX = Math.max(120, Math.min(ww - 120, rawFocusX));

      this.fx.spawn('wingPylonThruster', this.x - this.facing * 18, this.y - 146, {
        follow: this,
        offsetX: -18,
        offsetY: -146,
        flip: this.facing < 0,
        palette: CYBER_NEON_PALETTE,
        maxDuration: 1.38,
        light: 1.05,
        extra: { length: 20, tilt: -0.58 }
      });
      this.fx.spawn('holoTargetReticle', this._ultFocusX, this.groundY, {
        palette: CYBER_MAGENTA_PALETTE,
        light: 1.05,
        extra: { boxW: 22, boxH: 62 }
      });
      this._ultCoreFx = this.fx.spawn('singularityReactor', this._ultFocusX, this.groundY, {
        palette: CYBER_NEON_PALETTE,
        light: 1.2,
        extra: { radius: 42, coreY: -32 }
      });

      if (game?.audio) game.audio.play('ult_cast', this.x);
    }

    // Steps 1..3 (t = 0.44s, 0.76s, 1.06s): Singularity Gravity Pull + Targeted Hand-to-Core Orbital Helix Beams
    const pulseTimes = [0.44, 0.76, 1.06];
    for (let pIdx = 0; pIdx < pulseTimes.length; pIdx++) {
      if (this._ultStep === pIdx + 1 && t >= pulseTimes[pIdx]) {
        this._ultStep = pIdx + 2;
        if (enemy && !enemy.isDead) {
          this._ultFocusX = this._ultFocusX * 0.45 + enemy.x * 0.55;
          if (this._ultCoreFx) {
            this._ultCoreFx.worldX = this._ultFocusX;
          }
        }
        // Aim VEX-09's raised outstretched hand `(this.x + facing * 56, this.y - 142)` directly into `(coreX, coreY)`
        if (Math.abs(this._ultFocusX - this.x) > 8) {
          this.facing = this._ultFocusX >= this.x ? 1 : -1;
        }
        const handX = this.x + this.facing * 56;
        const handY = this.y - 142;
        const coreX = this._ultFocusX;
        const coreY = this.groundY - 96;

        this.fx.spawn('orbitalHelixBeam', handX, handY, {
          flip: false,
          palette: pIdx % 2 === 0 ? CYBER_NEON_PALETTE : CYBER_MAGENTA_PALETTE,
          light: 1.2,
          extra: {
            dx: (coreX - handX) / 3,
            dy: (coreY - handY) / 3,
            width: 4.5
          }
        });

        // Center `twinCrossSlash` (`X = +102px, Y = -69px`) squarely inside the Singularity Core `(coreX, coreY)`
        const slashFlip = pIdx % 2 === 1;
        this.fx.spawn('twinCrossSlash', coreX + (slashFlip ? 102 : -102), coreY + 69, {
          flip: slashFlip,
          palette: CYBER_NEON_PALETTE,
          light: 1.15,
          extra: { sparks: ['#ffffff', '#7df9ff', '#00f0ff', '#ff2e93'] }
        });

        const foes = game?.fighters
          ? game.fighters.filter((f) => f && !f.isDead && !f.isBenched && f !== this && (!this.team || f.team !== this.team))
          : enemy && !enemy.isDead
            ? [enemy]
            : [];
        for (const foe of foes) {
          if (Math.abs(foe.x - this._ultFocusX) <= 340) {
            foe.x += (this._ultFocusX - foe.x) * 0.34;
            foe.takeDamage(58, this, false, 35, 0);
            this.fx.spawn('cyberImpactSpark', foe.x, foe.y - 84, {
              palette: CYBER_MAGENTA_PALETTE,
              light: 1.15
            });
          }
        }
        if (game?.audio) game.audio.play('cyber_beam', this._ultFocusX);
      }
    }

    // Step 4 (t >= 1.38s): Cataclysmic Singularity Supernova Detonation
    if (this._ultStep === 4 && t >= 1.38) {
      this._ultStep = 5;
      this.fx.spawn('supernovaExplosion', this._ultFocusX, this.groundY - 88, {
        palette: CYBER_MAGENTA_PALETTE,
        light: 1.3
      });
      this.fx.spawn('empOverloadDome', this._ultFocusX, this.groundY, {
        palette: CYBER_NEON_PALETTE,
        warmup: 0.42,
        light: 1.25,
        extra: { radius: 52, fringe: '#ff2e93' }
      });

      const foes = game?.fighters
        ? game.fighters.filter((f) => f && !f.isDead && !f.isBenched && f !== this && (!this.team || f.team !== this.team))
        : enemy && !enemy.isDead
          ? [enemy]
          : [];
      for (const foe of foes) {
        if (Math.abs(foe.x - this._ultFocusX) <= 360) {
          foe.takeDamage(168, this, true, 210, -185);
          this.fx.spawn('rgbGlitchTear', foe.x, foe.groundY, {
            follow: foe,
            offsetX: 0,
            offsetY: 0,
            palette: CYBER_NEON_PALETTE,
            maxDuration: 0.46,
            light: 1.0
          });
        }
      }
      if (game?.renderer) {
        game.renderer.triggerShake(14, 0.28);
        game.renderer.triggerAberration(8);
        game.renderer.triggerHitStop(0.05);
      }
      if (game?.audio) game.audio.play('emp_blast', this._ultFocusX);
    }

    if (t >= this.ultDuration) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Overdrive Supreme Ultimate (`state === 'TRUE_ULTIMATE'`) —
   * "PROJECT GUNG-09: ORBITAL SATELLITE BUSTER" (`4.45s`)
   * Note: Never changes stage background image (`overrideArena` is never called).
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;

    const targets = game?.fighters
      ? game.fighters.filter(
          (f) => f && !f.isDead && !f.isBenched && f !== this && (!this.team || f.team !== this.team)
        )
      : enemy && !enemy.isDead
        ? [enemy]
        : [];

    // Track target X during 0.00s .. 2.75s
    if (t <= 2.75) {
      this._trueUltTargetX = enemy
        ? Math.max(200, Math.min(1000, enemy.x))
        : Math.max(200, Math.min(1000, this.x + this.facing * 240));
      if (Math.abs(this._trueUltTargetX - this.x) > 8) {
        this.facing = this._trueUltTargetX >= this.x ? 1 : -1;
      }
    }

    // Phase 1 (0.00s .. 1.15s — Wing-Pylon Ascension & Orbital Satellite Target-Lock)
    if (t < 1.15) {
      const uAsc = Math.min(1, t / 1.15);
      const ease = 1 - Math.pow(1 - uAsc, 2.4);
      this.y = this.groundY - 72 * ease;

      if (t >= 0.04 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        game?.audio?.play?.('ult_cast', this.x);
        game?.audio?.play?.('emp_blast', this.x);
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#00f0ff');
        game?.vfx?.spawnDamageText?.(
          this.x,
          this.y - 190,
          0,
          true,
          '★ PROJECT GUNG-09: ORBITAL LOCK! ★',
          '#00f0ff'
        );
        this.fx.spawn('wingPylonThruster', this.x - this.facing * 18, this.y - 146, {
          follow: this,
          offsetX: -18,
          offsetY: -146,
          flip: this.facing < 0,
          palette: CYBER_NEON_PALETTE,
          maxDuration: 3.15,
          light: 1.15,
          extra: { length: 22, tilt: -0.58 }
        });
        this.fx.spawn('holoTargetReticle', this._trueUltTargetX, this.groundY, {
          palette: CYBER_NEON_PALETTE,
          light: 1.2,
          extra: { boxW: 26, boxH: 66 }
        });
      }
      return;
    }

    // Phase 2 (1.15s .. 3.00s — 8-Drone All-Range Octagonal Convergence Grid, zero micro-tick damage)
    if (t < 3.05) {
      this.y = this.groundY - 72 + Math.sin((t - 1.15) * 6.0) * 4;

      if (t >= 1.15 && this._trueUltStep < 2) {
        this._trueUltStep = 2;
        game?.audio?.play?.('cyber_beam', this._trueUltTargetX);
        game?.audio?.play?.('blink', this.x);
        game?.vfx?.spawnDamageText?.(
          this._trueUltTargetX,
          this.groundY - 196,
          0,
          true,
          'ALL-RANGE FUNNEL LOCK!',
          '#ff2e93'
        );
      }

      if (t <= 3.00) {
        if (enemy && !enemy.isDead) {
          enemy.x += (this._trueUltTargetX - enemy.x) * Math.min(1, dt * 7);
          enemy.vx *= 0.2;
        }
        for (const foe of targets) {
          if (foe !== enemy) {
            foe.x += (this._trueUltTargetX - foe.x) * Math.min(1, dt * 7);
            foe.vx *= 0.2;
          }
        }
      }
      return;
    }

    // Phase 3 (t >= 3.05s, _trueUltStep < 3 — Instantaneous Orbital Satellite Buster Beam)
    if (t >= 3.05 && this._trueUltStep < 3) {
      this._trueUltStep = 3;
      this._trueUltBusterTimer = 1.00;

      game?.renderer?.triggerImpactFrame?.(0.12, this._trueUltTargetX, this.groundY - 110, 'cyber');
      if (game?.renderer && game.renderer.impactFrameTimer > 1.0) {
        game.renderer.triggerImpactFrame(this._trueUltTargetX, this.groundY - 110, 0.12, 'cyber');
      }
      game?.renderer?.shake?.(28, 0.75);
      game?.renderer?.triggerShake?.(28, 0.75);
      game?.renderer?.flash?.(0.32, '#ecfeff');
      game?.renderer?.triggerAberration?.(12);
      game?.renderer?.triggerHitStop?.(0.08);

      game?.audio?.play?.('ult_cast', this._trueUltTargetX);
      game?.audio?.play?.('cyber_beam', this._trueUltTargetX);
      game?.audio?.play?.('emp_blast', this._trueUltTargetX);

      this.heal(Math.round(this.maxHp * 0.12), 'NANO-CORE OVERCLOCK');

      this.fx.spawn('supernovaExplosion', this._trueUltTargetX, this.groundY - 96, {
        palette: CYBER_NEON_PALETTE,
        light: 1.35
      });
      this.fx.spawn('empOverloadDome', this._trueUltTargetX, this.groundY, {
        palette: CYBER_MAGENTA_PALETTE,
        warmup: 0.42,
        light: 1.3,
        extra: { radius: 56, fringe: '#00f0ff' }
      });

      {
        const isCrit = true;
        const knockX = 330;
        const knockY = -270;
        for (const t of targets) {
          t.takeDamage(705, this, isCrit, knockX, knockY);
          this.fx.spawn('rgbGlitchTear', t.x, t.groundY, {
            follow: t,
            offsetX: 0,
            offsetY: 0,
            palette: CYBER_NEON_PALETTE,
            maxDuration: 0.52,
            light: 1.1
          });
        }
      }
    }

    // Phase 4 (3.05s .. 4.45s — Smoothly descend back to groundY & return to IDLE)
    const uDesc = Math.min(1, Math.max(0, (t - 3.05) / (this.trueUltDuration - 3.05)));
    const easeDesc = uDesc * uDesc * (3 - 2 * uDesc);
    this.y = this.groundY - 72 * (1 - easeDesc);

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.isInvulnerable = false;
      this._trueUltStep = 0;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.fx.update(dt);

    if (this._trueUltBusterTimer > 0) {
      this._trueUltBusterTimer = Math.max(0, this._trueUltBusterTimer - dt);
    }

    if (Array.isArray(this.funnelDrones)) {
      for (let i = 0; i < this.funnelDrones.length; i++) {
        const d = this.funnelDrones[i];
        d.angle += dt * 2.6;
        d.x = this.x + Math.cos(d.angle) * 64;
        d.y = this.y - 126 + Math.sin(d.angle * 2) * 14;
      }
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

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

    super.update(dt, enemy, game);
  }

  drawBloomedVfxCell(ctx, vfxSheet, row, col, x, y, w, h, alpha = 0.95, flipX = false, renderer = null) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || alpha <= 0.01) return;
    const sx = Math.max(0, Math.min(29, col)) * 208;
    const sy = Math.max(0, Math.min(7, row)) * 208;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    if (renderer?.glowCyber || renderer?.glowCyan) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.28);
      ctx.drawImage(renderer.glowCyber || renderer.glowCyan, -w * 0.65, -h * 0.65, w * 1.3, h * 1.3);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha * 0.96);
    ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(-w * 0.5), Math.round(-h * 0.5), Math.round(w), Math.round(h));

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.34);
    ctx.drawImage(vfxSheet, sx, sy, 208, 208, Math.round(-w * 0.5), Math.round(-h * 0.5), Math.round(w), Math.round(h));
    ctx.restore();
  }

  /**
   * Stamps `android_vfx.png` Row 5 (Orbital Satellite Target-Lock Hex Reticle, `310x240`)
   * on the arena floor under `this._trueUltTargetX` during `TRUE_ULTIMATE`.
   */
  drawBehind(ctx, renderer = null) {
    if (this.state !== 'TRUE_ULTIMATE' && this._trueUltBusterTimer <= 0) return;
    const sprites = PixelForge.initAssets().android;
    const vfxSheet = sprites?.vfx;
    if (!vfxSheet?.complete || !vfxSheet.naturalWidth) return;

    const t = this.stateTimer || 0;
    const col = Math.floor(t * 30) % 30;
    const fadeIn = Math.min(1, t / 0.22);
    const fadeOut =
      this.state === 'TRUE_ULTIMATE' && t > 3.25
        ? Math.max(0, 1 - (t - 3.25) / 0.85)
        : 1.0;
    const alpha = fadeIn * fadeOut * 0.94;
    if (alpha <= 0.02) return;

    this.drawBloomedVfxCell(
      ctx,
      vfxSheet,
      5,
      col,
      this._trueUltTargetX,
      this.groundY - 6,
      310,
      240,
      alpha,
      false,
      renderer
    );
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().android;
    const vfxSheet = sprites?.vfx;

    // 0. Supreme Ultimate Row 5 Orbital Satellite Target-Lock Hex Reticle (`310x240`) on arena floor
    this.drawBehind(ctx, renderer);

    // 1. Holographic Cyber Afterimages
    if (this.afterimages.length > 0 && sprites?.sheet?.complete) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.55);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 4) * 4, Math.round(img.y / 4) * 4);
        ctx.scale(img.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawAfterimageFrame(ctx, sprites, img.frameIdx, 208, 208);
        ctx.restore();
      }
    }

    // 2. Background/Midground `android_vfx.png` 30fps constructs (BEHIND characters)
    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete) {
      for (const v of this.activeVfxAnims) {
        if (v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.1 ? u / 0.1 : u > 0.8 ? (1 - u) / 0.2 : 1.0;
        this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.92, v.flipX, renderer);
      }
    }

    // 3. Live 120Hz `ArcaneShaderFX` "back" layer spanning full 1200px arena (renders behind VEX-09 & opponent)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
  }

  drawUltimateForeground(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().android;
    const vfxSheet = sprites?.vfx;

    // 1. Foreground `android_vfx.png` constructs
    if (this.activeVfxAnims.length > 0 && vfxSheet?.complete) {
      for (const v of this.activeVfxAnims) {
        if (!v.foreground) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.1 ? u / 0.1 : u > 0.8 ? (1 - u) / 0.2 : 1.0;
        this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, v.y, v.w, v.h, fade * 0.94, v.flipX, renderer);
      }
    }

    // 2. Live 120Hz `ArcaneShaderFX` "front" layer spanning full 1200px arena
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().android;
    if (!sprites) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
    const groundPlantOffset = 4;

    ctx.translate(Math.round(this.x), Math.round(this.y + groundPlantOffset));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();

    if (isReflection) return;
    const vfxSheet = sprites?.vfx;
    if (!vfxSheet?.complete || !vfxSheet.naturalWidth) return;

    // Supreme Ultimate Phase 2 (1.15s .. 3.00s): 8 Orbiting Row 6 Fin-Funnel Nodes (156x156) in an Octagonal Ring
    // around (this._trueUltTargetX, this.groundY - 110) with converging cyan/magenta targeting lasers
    if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.15 && this.stateTimer < 3.05) {
      const cx = this._trueUltTargetX;
      const cy = this.groundY - 110;
      const baseCol = Math.floor(this.stateTimer * 30) % 30;
      const ringProgress = Math.min(1, (this.stateTimer - 1.15) / 0.25);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const ang = i * (Math.PI * 0.25) + this.stateTimer * 2.8;
        const rx = 168 * ringProgress;
        const ry = 114 * ringProgress;
        const dx = cx + Math.cos(ang) * rx;
        const dy = cy + Math.sin(ang) * ry;
        const beamCol = i % 2 === 0 ? '#00f0ff' : '#ff2e93';

        ctx.strokeStyle = beamCol;
        ctx.globalAlpha = 0.68;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(Math.round(dx), Math.round(dy));
        ctx.lineTo(Math.round(cx), Math.round(cy));
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.92;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.round(dx), Math.round(dy));
        ctx.lineTo(Math.round(cx), Math.round(cy));
        ctx.stroke();
      }
      ctx.restore();

      for (let i = 0; i < 8; i++) {
        const ang = i * (Math.PI * 0.25) + this.stateTimer * 2.8;
        const dx = cx + Math.cos(ang) * (168 * ringProgress);
        const dy = cy + Math.sin(ang) * (114 * ringProgress);
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          6,
          (baseCol + i * 3) % 30,
          dx,
          dy,
          156,
          156,
          0.95 * ringProgress,
          Math.cos(ang) < 0,
          renderer
        );
      }
    }

    // Supreme Ultimate Phase 3 (this._trueUltBusterTimer > 0): Seamless full-height vertical column of Row 7
    // (Project GUNG-09 Orbital Satellite Buster Column, 340px wide from sky y = groundY - 640 down to groundY + 24)
    if (this._trueUltBusterTimer > 0) {
      const busterProg = 1.0 - Math.max(0, Math.min(1, this._trueUltBusterTimer / 1.0));
      const col = Math.min(29, Math.floor(busterProg * 30));
      const alpha =
        this._trueUltBusterTimer < 0.28
          ? this._trueUltBusterTimer / 0.28
          : 0.98;
      const sx = col * 208;
      const sy = 7 * 208;
      const cx = Math.round(this._trueUltTargetX);
      const colW = 340;
      const halfW = Math.round(colW * 0.5);
      // Slice the exact 3-ring 144px vertical period (`sy + 32 .. sy + 176`) stacked directly above
      // a single non-overlapping base segment (`sy + 32 .. sy + 208`, height 176) anchored at groundY + 24!
      const coreSliceY = sy + 32;
      const coreSliceH = 144;
      const baseSliceH = 176;
      const stepH = 180;
      const baseH = 220;
      const baseBotY = Math.round(this.groundY + 24);
      const trunkBotY = baseBotY - baseH;

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      if (renderer?.glowCyber || renderer?.glowCyan) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, alpha * 0.34);
        ctx.drawImage(renderer.glowCyber || renderer.glowCyan, cx - colW * 0.85, this.groundY - 680, colW * 1.7, 740);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, alpha * 0.96);
      ctx.drawImage(vfxSheet, sx, coreSliceY, 208, baseSliceH, cx - halfW, trunkBotY, colW, baseH);
      for (let seg = 0; seg < 4; seg++) {
        const yTop = trunkBotY - (seg + 1) * stepH;
        ctx.drawImage(vfxSheet, sx, coreSliceY, 208, coreSliceH, cx - halfW, yTop, colW, stepH);
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.34);
      ctx.drawImage(vfxSheet, sx, coreSliceY, 208, baseSliceH, cx - halfW, trunkBotY, colW, baseH);
      for (let seg = 0; seg < 4; seg++) {
        const yTop = trunkBotY - (seg + 1) * stepH;
        ctx.drawImage(vfxSheet, sx, coreSliceY, 208, coreSliceH, cx - halfW, yTop, colW, stepH);
      }

      ctx.restore();
    }
  }
}
