import { Fighter } from './Fighter.js?v=30fps64';
import { PixelForge } from '../engine/PixelForge.js?v=30fps64';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps64';
import { GLACIAL_EFFECT_REGISTRY } from '../engine/shaders/glacialShaders.js?v=30fps64';

/**
 * Glacia / Lyra (`icemage`) — Cryo Sovereign & Borealis Prism Weaver.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D shader & particle engine)
 * + `assets/sprites/icemage_sheet.png` & `assets/sprites/icemage_vfx.png`.
 */
export class IceMage extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Lyra',
      maxHp: 1190,
      attackRange: 505,
      moveSpeed: 172,
      autoInterval: 1.08,
      lightColor: 'rgba(103, 232, 249, 1)',
      primaryColor: '#67e8f9'
    });
    this.heroId = 'icemage';
    this.theme = 'glacial';
    this.deathSfx = 'death_icemage';
    this.skillMaxCooldown = 5.10;
    this.skillTriggerRange = 545;
    this.skillName = 'TRI-BEAM PRISM MATRIX';
    this.ultName = 'BOREALIS PRISM CATHEDRAL';
    this.hasTrueUltimate = true;
    this.trueUltName = 'ABSOLUTE ZERO: DIAMOND DUST ETERNITY';
    this.trueUltDuration = 4.45;
    this._trueUltStep = 0;
    this._trueUltCoffinX = 600;
    this._trueUltShatterTimer = 0;
    this.comboStep = 0;
    this.stepDustTimer = 0;

    // 100% Original IceMage Dynamic Mechanics & Visual Systems
    this.cryoPrisms = []; // Up to 3 floating Hexagonal Cryo-Prism Mirrors on the battlefield that refract lasers
    this.prismBeams = []; // Active multi-segment refracted Borealis laser chains (Glacia -> Prism -> Enemy)
    this.permafrostZones = []; // Frozen Permafrost Ice-Rink floor stretches (boosts Glacia's skate speed, chills enemies)
    this.iceDecoy = null; // Sculpted solid Ice-Statue Decoy left behind on Dodge that shatters into frost needles + a Prism
    this.iceWall = null; // Angled Refractive Glacial Ice-Wall Monolith erected on Crouch that splits enemy projectiles
    this.triMatrixCage = null; // Geometric 3-Prism Triangular Laser Matrix around the enemy during SKILL
    this.borealisCathedral = null; // Colossal Diamond Iceberg Prison + 7-Prism Orbital Array + Aurora Sky Curtain during ULTIMATE
    this.skateRibbons = []; // Legacy array preserved for telemetry/compatibility
    this.activeFrostRings = []; // Tracks Hoarfrost Shatter Novas that stamp Row-4 bloomed sprite cells

    this.dodgeMaxCooldown = 3.08;
    this.dashMaxCooldown = 3.05;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.94;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;

    this.didMatrixDeploy = false;
    this.didMatrixImplode = false;
    this._drewScepterFocus = false;
    this.ultStage = 0;

    this.fx = new ArcaneShaderFX(GLACIAL_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      const iceAssets = PixelForge.initAssets()?.icemage;
      if (iceAssets?.vfx?.src && !iceAssets.vfx.src.includes('v=30fps50')) {
        iceAssets.vfx.src = 'assets/sprites/icemage_vfx.png?v=30fps64';
      }
    }
  }

  setState(newState) {
    super.setState(newState);
    this._drewScepterFocus = false;
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
    }
    if (newState !== 'JUMP' && newState !== 'DODGE' && newState !== 'DASH') {
      this.fx?.stopByKey('glacialSkateRibbon');
    }
  }

  ensureGlacialSkateRibbon() {
    if (!this.fx) return;
    if (!this.fx.active.some((s) => s.key === 'glacialSkateRibbon')) {
      this.fx.spawn('glacialSkateRibbon', this.x - this.facing * 12, this.y - 10, {
        follow: this,
        offsetX: -12,
        offsetY: -10,
        flip: this.facing < 0,
        light: 1.18
      });
    }
  }

  /**
   * Spawns a 120Hz `ArcaneShaderFX` Hoarfrost Shatter Burst + optional Row-4 bloomed Hoarfrost Nova sprite.
   */
  spawnPixelFrostRing(x, y, maxRadius = 110, color = '#67e8f9', maxLife = 0.30, isFloor = false, hasSpikes = false) {
    if (this.fx) {
      this.fx.spawn('absoluteZeroShatterBurst', x, y, {
        light: hasSpikes ? 1.36 : 1.16,
        extra: { isLarge: maxRadius >= 115 || hasSpikes }
      });
    }
    if (hasSpikes) {
      this.activeFrostRings.push({
        x,
        y,
        maxRadius,
        color,
        life: 0,
        maxLife,
        isFloor,
        hasSpikes
      });
    }
  }

  /**
   * Spawns multi-segment 120Hz `refractedBorealisBeam` laser chains across an array of `{ x, y }` vertices.
   */
  spawnBeamChainFX(points, magenta = false, maxLife = 0.34, width = 7) {
    if (!points || points.length < 2) return;
    this.prismBeams.push({
      points,
      life: 0,
      maxLife,
      color: magenta ? '#e879f9' : '#67e8f9',
      width
    });
    if (!this.fx) return;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      this.fx.spawn('refractedBorealisBeam', p0.x, p0.y, {
        flip: false,
        light: magenta ? 1.34 : 1.22,
        extra: {
          dx: p1.x - p0.x,
          dy: p1.y - p0.y,
          magenta
        }
      });
      this.fx.burst(p1.x, p1.y, {
        count: 6,
        speedMin: 30,
        speedMax: 96,
        lifeMin: 0.14,
        lifeMax: 0.28,
        gravity: 25,
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#e879f9']
      });
    }
  }

  onProjectileTrail(p) {
    if (!this.fx || p.type !== 'cryo_shard') return;
    if (p.ringTimer >= 0.048) {
      p.ringTimer = 0;
      this.fx.burst(p.x - Math.sign(p.vx || 1) * 16, p.y, {
        count: 3,
        speedMin: 22,
        speedMax: 68,
        lifeMin: 0.15,
        lifeMax: 0.28,
        gravity: -12,
        spread: 1.05,
        angle: Math.atan2(-(p.vy || 0), -(p.vx || 1)),
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#e879f9']
      });
    }
  }

  onProjectileHit(p, _hitTarget, isCrit, game) {
    if (!this.fx) return false;
    this.fx.spawn('absoluteZeroShatterBurst', p.x, p.y, {
      light: isCrit ? 1.38 : 1.22,
      extra: { isLarge: Boolean(isCrit) }
    });
    this.fx.burst(p.x, p.y, {
      count: isCrit ? 18 : 12,
      speedMin: 50,
      speedMax: isCrit ? 210 : 165,
      lifeMin: 0.16,
      lifeMax: 0.34,
      gravity: 75,
      colors: ['#ffffff', '#bae6fd', '#67e8f9', '#38bdf8', '#e879f9']
    });
    if (game?.vfx) {
      game.vfx.spawnGlyphBurst(p.x, p.y, isCrit ? 6 : 4, 'glacial');
    }
    return true;
  }

  /**
   * Spawns or refreshes a Floating Hexagonal Cryo-Prism Mirror on the battlefield (max 3 active).
   */
  deployCryoPrism(x, y, game, duration = 6.5) {
    const ww = game && game.renderer ? game.renderer.worldWidth : 1200;
    const clampedX = Math.max(110, Math.min(ww - 110, x));
    const clampedY = Math.max(this.groundY - 235, Math.min(this.groundY - 68, y));

    for (const p of this.cryoPrisms) {
      if (Math.hypot(p.x - clampedX, p.y - clampedY) < 64) {
        p.x = clampedX;
        p.y = clampedY;
        p.baseY = clampedY;
        p.life = 0;
        p.maxLife = duration;
        p.pulse = 1.0;
        return p;
      }
    }

    if (this.cryoPrisms.length >= 3) {
      this.cryoPrisms.shift();
    }
    const prism = {
      x: clampedX,
      y: clampedY,
      baseY: clampedY,
      phase: Math.random() * Math.PI * 2,
      life: 0,
      maxLife: duration,
      pulse: 1.0
    };
    this.cryoPrisms.push(prism);
    if (this.fx) {
      this.fx.burst(clampedX, clampedY, {
        count: 8,
        speedMin: 28,
        speedMax: 85,
        lifeMin: 0.16,
        lifeMax: 0.3,
        gravity: -10,
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#e879f9']
      });
    }
    if (game && game.vfx) {
      game.vfx.spawnGlyphBurst(clampedX, clampedY, 4, 'glacial');
    }
    return prism;
  }

  spawnCryoPrism(x, y, game = this.game, duration = 6.8) {
    return this.deployCryoPrism(x, y, game, duration);
  }

  /**
   * Freezes a stretch of the arena floor into a shimmering 2.5D Permafrost Ice-Rink.
   */
  spawnPermafrostZone(centerX, radius = 155, duration = 4.6) {
    const ww = this.game && this.game.renderer ? this.game.renderer.worldWidth : 1200;
    const cx = Math.max(120, Math.min(ww - 120, centerX));
    for (const z of this.permafrostZones) {
      if (Math.abs(z.x - cx) < 95) {
        z.x = (z.x + cx) * 0.5;
        z.radius = Math.max(z.radius, radius);
        z.life = 0;
        z.maxLife = Math.max(z.maxLife, duration);
        if (z.fxSlot) {
          z.fxSlot.x = z.x;
          if (z.fxSlot.inst?.cfg) z.fxSlot.inst.cfg.radiusWorld = z.radius;
        }
        return z;
      }
    }
    if (this.permafrostZones.length >= 3) {
      const removed = this.permafrostZones.shift();
      if (removed?.fxSlot) removed.fxSlot.done = true;
    }
    const fxSlot = this.fx
      ? this.fx.spawn('permafrostSnowflakeSigil', cx, this.groundY, {
          light: 1.18,
          extra: { radiusWorld: radius }
        })
      : null;
    const zone = {
      x: cx,
      y: this.groundY,
      radius,
      life: 0,
      maxLife: duration,
      fxSlot
    };
    this.permafrostZones.push(zone);
    return zone;
  }

  /**
   * Applies Brittle Frost Crystallization stacks (1..4) to an enemy; at 4 stacks triggers ABSOLUTE ZERO SHATTER!
   */
  applyBrittleFrost(enemy, stacks, game, sourceX = null, sourceY = null) {
    if (!enemy || enemy.isDead || enemy.isInvulnerable) return;
    enemy.brittleStacks = (enemy.brittleStacks || 0) + stacks;
    enemy.brittleDecayTimer = 4.8;

    if (enemy.brittleStacks >= 4) {
      this.triggerBrittleShatter(enemy, game, sourceX ?? enemy.x, sourceY ?? (enemy.y - 96));
    } else if (game && game.vfx) {
      const sCount = Math.floor(enemy.brittleStacks);
      if (stacks >= 1) {
        game.vfx.spawnDamageText(
          enemy.x,
          enemy.y - 144,
          0,
          false,
          `BRITTLE FROST [${sCount}/4]`,
          '#a5f3fc'
        );
      }
    }
  }

  /**
   * Detonates 4 Brittle Frost stacks on the enemy in a diamond crystal burst, dealing bonus damage & granting Glacia a Cryo-Shield!
   */
  triggerBrittleShatter(enemy, game, originX, originY) {
    if (!enemy || enemy.isDead) return;
    enemy.brittleStacks = 0;
    enemy.brittleDecayTimer = 0;

    const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
    const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
    const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
    const shatterDmg = isVanguard ? 38 : isHarvester ? 40 : isGroundedCaster ? 44 : 46;

    enemy.takeDamage(shatterDmg, this, true, 85, -95);
    this.heal(16, 'CRYO BARRIER');

    if (game) {
      if (game.audio) game.audio.play('ice_shatter', enemy.x);
      if (game.renderer) {
        game.renderer.triggerShake(11, 0.20);
        game.renderer.triggerAberration(6);
      }
      if (game.vfx) {
        game.vfx.spawnDamageText(enemy.x, enemy.y - 172, 0, true, '★ ABSOLUTE ZERO SHATTER! ★', '#67e8f9');
        this.spawnPixelFrostRing(enemy.x, enemy.y - 96, 118, '#67e8f9', 0.32, false, true);
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 8, 'glacial');
      }
    }
    if (this.fx) {
      this.fx.burst(enemy.x, enemy.y - 96, {
        count: 22,
        speedMin: 60,
        speedMax: 240,
        lifeMin: 0.18,
        lifeMax: 0.4,
        gravity: 85,
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#e879f9']
      });
    }

    if (this.cryoPrisms.length > 0) {
      const prism = this.cryoPrisms[0];
      prism.pulse = 1.35;
      this.spawnBeamChainFX(
        [
          { x: originX, y: originY },
          { x: prism.x, y: prism.y },
          { x: enemy.x, y: enemy.y - 98 }
        ],
        true,
        0.34,
        7
      );
    }
  }

  /**
   * Fires a multi-segment Refracted Borealis Laser chain through active Cryo-Prisms onto the enemy.
   */
  fireRefractedPrismLaser(spawnX, spawnY, enemy, game, isEmpowered = false) {
    if (!enemy || enemy.isDead) return;
    const targetX = enemy.x;
    const targetY = enemy.y - 102;

    const midX = (spawnX + targetX) * 0.5;
    const sortedPrisms = [...this.cryoPrisms].sort(
      (a, b) => Math.abs(a.x - midX) - Math.abs(b.x - midX)
    );

    const chainCount = isEmpowered ? Math.min(2, sortedPrisms.length) : Math.min(1, sortedPrisms.length);
    const chosenPrisms = sortedPrisms.slice(0, chainCount);

    if (chosenPrisms.length > 0) {
      const pts = [{ x: spawnX, y: spawnY }];
      for (const p of chosenPrisms) {
        p.pulse = 1.4;
        p.life = Math.max(0, p.life - 1.2);
        pts.push({ x: p.x, y: p.y });
      }
      pts.push({ x: targetX, y: targetY });

      this.spawnBeamChainFX(pts, isEmpowered, isEmpowered ? 0.38 : 0.28, isEmpowered ? 8 : 6);

      const lastPrism = chosenPrisms[chosenPrisms.length - 1];
      const dx = targetX - lastPrism.x;
      const dy = targetY - lastPrism.y;
      const d = Math.hypot(dx, dy) || 1;
      const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
      const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
      const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
      const refractDmg = isVanguard ? 18 : isHarvester ? 19 : isGroundedCaster ? 21 : 22;

      if (game && game.vfx) {
        game.vfx.spawnProjectile({
          x: lastPrism.x,
          y: lastPrism.y,
          vx: (dx / d) * 740,
          vy: (dy / d) * 740,
          radius: 17,
          color: '#67e8f9',
          coreColor: '#e879f9',
          owner: this,
          damage: refractDmg,
          type: 'cryo_shard'
        });
        game.vfx.spawnDamageText(
          lastPrism.x,
          lastPrism.y - 34,
          0,
          false,
          chosenPrisms.length > 1 ? 'DOUBLE PRISM REFRACT!' : 'PRISM REFRACT!',
          '#67e8f9'
        );
      }
      this.applyBrittleFrost(enemy, 1, game, lastPrism.x, lastPrism.y);
    }
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    this.isFlipVault = true;
    this.flipStartX = this.x;
    this.flipAngle = 0;
    this.wallFlipCooldown = 3.0;

    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : -this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;

    const dist = enemy ? Math.abs(enemy.x - this.x) : 300;
    const retreatX = this.x - this.facing * 260;
    const nearWallOrCornered =
      this.x < 330 ||
      this.x > ww - 330 ||
      retreatX < 190 ||
      retreatX > ww - 190 ||
      dist < 225;

    if (enemy && nearWallOrCornered) {
      this.dashDuration = 0.62;
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      let target = enemy.x + openSideDir * 350;
      if (Math.abs(target - this.x) < 260) {
        const crossDir = this.x < enemy.x ? 1 : -1;
        target = enemy.x + crossDir * 340;
      }
      this.flipTargetX = Math.max(150, Math.min(ww - 150, target));
      this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || 1;
    } else {
      this.dashDuration = 0.58;
      this.flipTargetX = Math.max(150, Math.min(ww - 150, this.x + dir * 335));
      this.dashDir = dir;
    }

    this.vx = 0;
    this.vy = 0;
    this.ensureGlacialSkateRibbon();
    this.spawnPermafrostZone(this.x, 140, 4.2);
    this.spawnPixelFrostRing(this.x, this.groundY, 92, '#67e8f9', 0.30, true, false);
    if (game && game.audio) game.audio.play('frost_cast', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 135, 0, false, 'AXEL PRISM VAULT!', '#67e8f9');
      game.vfx.spawnGlyphBurst(this.x, this.y - 60, 6, 'glacial');
    }
  }

  startCrouch(enemy, game) {
    this.crouchCooldown = 3.25;
    this.crouchDuration = 0.94;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.vx = 0;

    const wallX = this.x + this.facing * 72;
    this.iceWall = {
      x: wallX,
      y: this.groundY,
      facing: this.facing,
      life: 0,
      maxLife: 2.35,
      refractedCount: 0
    };
    this.spawnPermafrostZone(this.x + this.facing * 50, 165, 4.8);
    this.spawnPixelFrostRing(wallX, this.groundY - 2, 84, '#67e8f9', 0.28, true, false);

    if (game && game.audio) game.audio.play('frost_cast', wallX);
    if (game && game.vfx) {
      game.vfx.spawnGlyphBurst(wallX, this.groundY - 78, 6, 'glacial');
      game.vfx.spawnDamageText(this.x, this.y - 128, 0, false, 'REFRACTIVE ICE-WALL!', '#a5f3fc');
    }
  }

  onStartDash(enemy, game, dir) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    this.dashDuration = 0.38;
    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipAngle = 0;

    const escapeDir = this.x < 240 ? 1 : this.x > ww - 240 ? -1 : dir;
    this.dashDir = escapeDir;
    this.vx = escapeDir * 415;
    this.ensureGlacialSkateRibbon();
    this.spawnPermafrostZone(this.x, 150, 4.4);
    this.deployCryoPrism(this.x - escapeDir * 35, this.groundY - 145, game, 6.2);

    if (game && game.audio) game.audio.play('frost_cast', this.x);
    if (game && game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.y - 88, 6, 'glacial');
      game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'PERMAFROST SKATE!', '#67e8f9');
    }
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 999;
    const nearLeft = this.x < 305;
    const nearRight = this.x > ww - 305;

    this.isDeflecting = false;
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.40;

    const decoyX = this.x;
    const decoyFrame = PixelForge.getFrameIndex(this, this.walkPhase);
    this.iceDecoy = {
      x: decoyX,
      y: this.groundY,
      facing: this.facing,
      frameIdx: decoyFrame,
      life: 0,
      maxLife: 0.85,
      shattered: false
    };
    this.ensureGlacialSkateRibbon();
    this.spawnPermafrostZone(decoyX, 160, 4.6);

    let smartDir = nearLeft ? 1 : nearRight ? -1 : dir;
    if (enemy && dist < 245 && (nearLeft || nearRight)) {
      const openSideDir = enemy.x < ww * 0.5 ? 1 : -1;
      smartDir = openSideDir;
      this.vx = smartDir * 465;
    } else {
      this.vx = smartDir * 385;
    }
    this.dashDir = smartDir;

    if (game && game.audio) game.audio.play('frost_cast', decoyX);
    if (game && game.vfx) {
      game.vfx.spawnGlyphBurst(decoyX, this.y - 92, 7, 'glacial');
      game.vfx.spawnDamageText(decoyX, this.y - 156, 0, false, 'FROST STATUE DECOY!', '#a5f3fc');
    }
  }

  /**
   * Detonates Glacia's sculpted Ice-Statue Decoy into a 6-way Frost Needle burst and spawns a Cryo-Prism Mirror!
   */
  detonateIceDecoy(enemy, game) {
    if (!this.iceDecoy || this.iceDecoy.shattered) return;
    const d = this.iceDecoy;
    d.shattered = true;

    const prism = this.deployCryoPrism(d.x, this.groundY - 132, game, 6.8);
    this.spawnPixelFrostRing(d.x, d.y - 92, 112, '#67e8f9', 0.30, false, true);

    if (this.fx) {
      this.fx.burst(d.x, d.y - 92, {
        count: 18,
        speedMin: 55,
        speedMax: 225,
        lifeMin: 0.18,
        lifeMax: 0.38,
        gravity: 80,
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#e879f9']
      });
    }
    if (game) {
      if (game.audio) game.audio.play('ice_shatter', d.x);
      if (game.vfx) {
        game.vfx.spawnGlyphBurst(d.x, d.y - 92, 7, 'glacial');
        game.vfx.spawnDamageText(d.x, d.y - 162, 0, false, 'DECOY SHATTER NOVA!', '#67e8f9');
      }
    }

    if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - d.x);
      if (dist < 225) {
        const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
        const novaDmg = isVanguard ? 26 : isHarvester ? 28 : isGroundedCaster ? 31 : 33;
        enemy.takeDamage(novaDmg, this, false, 95, -55);
        this.applyBrittleFrost(enemy, 1, game, d.x, d.y - 92);
      } else if (game && game.vfx && prism) {
        const dx = enemy.x - prism.x;
        const dy = (enemy.y - 102) - prism.y;
        const len = Math.hypot(dx, dy) || 1;
        game.vfx.spawnProjectile({
          x: prism.x,
          y: prism.y,
          vx: (dx / len) * 685,
          vy: (dy / len) * 685,
          radius: 17,
          color: '#67e8f9',
          coreColor: '#ffffff',
          owner: this,
          damage: 24,
          type: 'cryo_shard'
        });
      }
    }
    this.iceDecoy = null;
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    this.ensureGlacialSkateRibbon();

    // Row 8: Axel Prism Vault (Airborne Figure-Skating Leap + Apex Cryo-Prism Deployment)
    if ((this.state === 'JUMP' || this.state === 'DODGE') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const airU = Math.max(0, Math.min(1, (u - 0.08) / 0.78));
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * airU;

      const liftFrac = Math.sin(airU * Math.PI);
      this.y = this.groundY - liftFrac * 88;
      this.flipAngle = 0;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (u >= 0.48 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        const prism = this.deployCryoPrism(this.x, this.y - 92, game, 6.8);
        if (game && game.audio) game.audio.play('prism_beam', this.x);
        this.fireRefractedPrismLaser(this.x + this.facing * 28, this.y - 98, enemy, game, false);
        if (prism && game && game.vfx) {
          const dx = enemy.x - prism.x;
          const dy = (enemy.y - 98) - prism.y;
          const td = Math.hypot(dx, dy) || 1;
          game.vfx.spawnProjectile({
            x: prism.x,
            y: prism.y,
            vx: (dx / td) * 710,
            vy: (dy / td) * 710,
            radius: 18,
            color: '#67e8f9',
            coreColor: '#e879f9',
            owner: this,
            damage: 32,
            type: 'cryo_shard'
          });
          this.fx?.spawn('cryoPrismMachCone', prism.x, prism.y, {
            flip: false,
            light: 1.24,
            extra: { aimAngle: Math.atan2(dy, dx), empowered: true }
          });
        }
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.flipAngle = 0;
        this.isInvulnerable = false;
        this.spawnPermafrostZone(this.x, 145, 4.2);
        this.spawnPixelFrostRing(this.x, this.groundY, 76, '#67e8f9', 0.25, true, false);
        this.setState('IDLE');
      }
      return;
    }

    if (t >= this.dashDuration) {
      this.isInvulnerable = false;
      this.vx *= 0.25;
      this.setState('IDLE');
    }
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    this.vx = 0;
    this.isDeflecting = t < 0.82;

    if (t >= 0.34 && !this.didActionFrame && enemy && !enemy.isDead) {
      this.didActionFrame = true;
      const wallX = this.iceWall ? this.iceWall.x : this.x + this.facing * 68;
      const spawnY = this.groundY - 64;
      const dx = enemy.x - wallX;
      const dy = (enemy.y - 76) - spawnY;
      const d = Math.hypot(dx, dy) || 1;

      if (game && game.audio) game.audio.play('prism_beam', wallX);
      if (game && game.vfx) {
        game.vfx.spawnProjectile({
          x: wallX,
          y: spawnY,
          vx: (dx / d) * 705,
          vy: (dy / d) * 705,
          radius: 19,
          color: '#67e8f9',
          coreColor: '#ffffff',
          owner: this,
          damage: 38,
          type: 'cryo_shard'
        });
      }
      this.fx?.spawn('cryoPrismMachCone', wallX, spawnY, {
        flip: false,
        light: 1.24,
        extra: { aimAngle: Math.atan2(dy, dx), empowered: false }
      });
      this.applyBrittleFrost(enemy, 1, game, wallX, spawnY);
    }

    if (t >= this.crouchDuration) {
      this.isCrouching = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    if (this.wallFlipCooldown > 0) this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    if (this.crouchCooldown > 0) this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    if (this._trueUltShatterTimer > 0) {
      this._trueUltShatterTimer = Math.max(0, this._trueUltShatterTimer - dt);
    }

    // 1. Update Floating Hexagonal Cryo-Prism Mirrors
    for (let i = this.cryoPrisms.length - 1; i >= 0; i--) {
      const p = this.cryoPrisms[i];
      p.life += dt;
      p.phase += dt * 3.2;
      p.y = p.baseY + Math.sin(p.phase) * 7;
      p.pulse = Math.max(1.0, p.pulse - dt * 1.8);
      if (p.life >= p.maxLife) {
        this.cryoPrisms.splice(i, 1);
      }
    }

    // 2. Update Refracted Borealis Laser Chains
    for (let i = this.prismBeams.length - 1; i >= 0; i--) {
      const b = this.prismBeams[i];
      b.life += dt;
      if (b.life >= b.maxLife) {
        this.prismBeams.splice(i, 1);
      }
    }

    // 3. Update Permafrost Ice-Rink Floor Zones
    let onPermafrost = false;
    for (let i = this.permafrostZones.length - 1; i >= 0; i--) {
      const z = this.permafrostZones[i];
      z.life += dt;
      if (Math.abs(this.x - z.x) <= z.radius) {
        onPermafrost = true;
      }
      if (enemy && !enemy.isDead && Math.abs(enemy.x - z.x) <= z.radius && Math.abs(enemy.y - this.groundY) < 28) {
        if (!enemy.hasPoise) {
          enemy.vx *= Math.pow(0.45, dt);
        }
        enemy._permafrostTick = (enemy._permafrostTick || 0) + dt;
        if (enemy._permafrostTick >= 1.25) {
          enemy._permafrostTick = 0;
          this.applyBrittleFrost(enemy, 1, game, z.x, this.groundY - 40);
        }
      }
      if (z.life >= z.maxLife) {
        if (z.fxSlot) z.fxSlot.done = true;
        this.permafrostZones.splice(i, 1);
      }
    }

    if (onPermafrost && this.state === 'WALK') {
      this.x += this.facing * (this.moveDir || 1) * 38 * dt;
    }

    if (enemy && enemy.brittleStacks > 0) {
      enemy.brittleDecayTimer = (enemy.brittleDecayTimer || 4.0) - dt;
      if (enemy.brittleDecayTimer <= 0) {
        enemy.brittleStacks = 0;
      }
    }

    // 4. Update Sculpted Ice-Statue Decoy
    if (this.iceDecoy) {
      this.iceDecoy.life += dt;
      const enemyNear = enemy && !enemy.isDead && Math.abs(enemy.x - this.iceDecoy.x) < 155;
      if (enemyNear || this.iceDecoy.life >= this.iceDecoy.maxLife) {
        this.detonateIceDecoy(enemy, game);
      }
    }

    // 5. Update Refractive Hexagonal Ice-Wall Monolith (intercepts & splits incoming enemy projectiles!)
    if (this.iceWall) {
      this.iceWall.life += dt;
      if (game && game.vfx && game.vfx.projectiles) {
        for (let i = game.vfx.projectiles.length - 1; i >= 0; i--) {
          const proj = game.vfx.projectiles[i];
          const isEnemyProj =
            proj.owner !== this && (!this.team || !proj.owner?.team || proj.owner.team !== this.team);
          if (
            isEnemyProj &&
            Math.abs(proj.x - this.iceWall.x) < 48 &&
            Math.abs(proj.y - (this.iceWall.y - 76)) < 85
          ) {
            const origX = proj.x;
            const origY = proj.y;
            game.vfx.projectiles.splice(i, 1);
            this.iceWall.refractedCount++;
            if (game.audio) game.audio.play('ice_shatter', origX);
            game.vfx.spawnDamageText(origX, origY - 36, 0, false, 'PRISM WALL REFRACT!', '#67e8f9');
            game.vfx.spawnGlyphBurst(origX, origY, 5, 'glacial');
            this.fx?.spawn('absoluteZeroShatterBurst', origX, origY, {
              light: 1.28,
              extra: { isLarge: false }
            });

            if (enemy && !enemy.isDead) {
              for (const offsetAng of [-0.16, 0.16]) {
                const dx = enemy.x - origX;
                const dy = (enemy.y - 98) - origY;
                const baseAng = Math.atan2(dy, dx) + offsetAng;
                game.vfx.spawnProjectile({
                  x: origX,
                  y: origY,
                  vx: Math.cos(baseAng) * 690,
                  vy: Math.sin(baseAng) * 690,
                  radius: 16,
                  color: '#67e8f9',
                  coreColor: '#e879f9',
                  owner: this,
                  damage: 22,
                  type: 'cryo_shard'
                });
              }
            }
          }
        }
      }
      if (this.iceWall.life >= this.iceWall.maxLife) {
        this.iceWall = null;
      }
    }

    // 6. Update Tri-Beam Prism Matrix Cage & Borealis Cathedral Ultimate
    if (this.triMatrixCage) {
      this.triMatrixCage.life += dt;
      if (this.triMatrixCage.life >= this.triMatrixCage.maxLife) {
        this.triMatrixCage = null;
      }
    }
    if (this.borealisCathedral) {
      this.borealisCathedral.life += dt;
      if (this.borealisCathedral.life >= this.borealisCathedral.maxLife) {
        this.borealisCathedral = null;
      }
    }
    for (let i = this.activeFrostRings.length - 1; i >= 0; i--) {
      this.activeFrostRings[i].life += dt;
      if (this.activeFrostRings[i].life >= this.activeFrostRings[i].maxLife) {
        this.activeFrostRings.splice(i, 1);
      }
    }

    this.fx.update(dt);

    // 7. Proactive Cryo-Prism Sovereign Tactical AI
    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer ? game.renderer.worldWidth : 1200;
      const nearWall = this.x < 255 || this.x > ww - 255;
      const pinnedLeft = this.x < 235 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 235 && enemy.x < this.x;
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 175);

      if ((pinnedLeft || pinnedRight) && dist < 260 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.0;
        this.startJump(enemy, game);
        return;
      }

      if (incomingProj && this.crouchCooldown <= 0 && !this.iceWall) {
        this.startCrouch(enemy, game);
        return;
      }

      if ((dist < 230 || (nearWall && dist < 295)) && this.dodgeCooldown <= 0) {
        this.startDodge(enemy, game);
        return;
      }

      if (
        dist >= 265 &&
        dist <= this.attackRange &&
        this.autoCooldown <= 0 &&
        this.crouchCooldown <= 0 &&
        this.comboStep % 4 === 2
      ) {
        this.autoCooldown = this.autoInterval * (0.92 + Math.random() * 0.2);
        this.startCrouch(enemy, game);
        return;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.28) {
        this.stepDustTimer = 0;
        this.fx.burst(this.x - this.facing * 12, this.groundY - 4, {
          count: onPermafrost ? 5 : 3,
          speedMin: 22,
          speedMax: 68,
          lifeMin: 0.14,
          lifeMax: 0.28,
          gravity: 40,
          colors: ['#ffffff', '#bae6fd', '#67e8f9', '#e879f9']
        });
      }
    }

    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.26) {
      this.torsoAngle = -this.facing * 0.14 * (t / 0.26);
      if (t >= 0.05 && !this._drewScepterFocus) {
        this._drewScepterFocus = true;
        this.fx.spawn('cryoScepterFocus', this.x + this.facing * 44, this.y - 110, {
          follow: this,
          offsetX: 44,
          offsetY: -110,
          flip: this.facing < 0,
          light: 1.24
        });
      }
    } else if (t < 0.60) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.torsoVel = this.facing * 8.5;

        const spawnX = this.x + this.facing * 52;
        const spawnY = this.y - 108;
        const targetY = enemy ? enemy.y - 106 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 675;

        if (game.audio) game.audio.play('prism_beam', this.x);
        if (game.vfx) {
          game.vfx.spawnGlyphBurst(spawnX, spawnY, 5, 'glacial');
        }

        if (this.cryoPrisms.length < 2 || mode === 2) {
          const prismX = this.x + this.facing * (145 + (this.comboStep % 2) * 85);
          const prismY = this.groundY - (125 + (this.comboStep % 3) * 28);
          this.deployCryoPrism(prismX, prismY, game, 6.6);
        }

        const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;
        const primaryDmg = isVanguard
          ? mode === 2 ? 46 : 40
          : isHarvester
            ? mode === 2 ? 48 : 42
            : isGroundedCaster
              ? mode === 2 ? 52 : 45
              : mode === 2 ? 54 : 47;

        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 19,
          color: '#67e8f9',
          coreColor: mode === 2 ? '#e879f9' : '#ffffff',
          owner: this,
          damage: primaryDmg,
          type: 'cryo_shard'
        });

        this.fx.spawn('cryoPrismMachCone', spawnX, spawnY, {
          flip: false,
          light: mode === 2 ? 1.32 : 1.2,
          extra: {
            aimAngle: Math.atan2(dy, dx),
            empowered: mode === 2
          }
        });

        if (enemy && !enemy.isDead) {
          this.fireRefractedPrismLaser(spawnX, spawnY, enemy, game, mode === 2);
        }
      }
    } else if (t >= 0.84) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // ★ SIGNATURE SKILL: "TRI-BEAM PRISM MATRIX"
    const t = this.stateTimer;

    if (t < 0.08) {
      this.didMatrixDeploy = false;
      this.didMatrixImplode = false;
      this.isDeflecting = true;
    } else if (t < 0.44) {
      if (!this.didMatrixDeploy) {
        this.didMatrixDeploy = true;
        const tx = enemy ? enemy.x : this.x + this.facing * 290;
        const ty = enemy ? enemy.groundY : this.groundY;

        if (game.audio) game.audio.play('frost_cast', tx);
        this.spawnPermafrostZone(tx, 185, 5.2);

        const p1 = this.deployCryoPrism(tx - 115, ty - 165, game, 6.8);
        const p2 = this.deployCryoPrism(tx, ty - 228, game, 6.8);
        const p3 = this.deployCryoPrism(tx + 115, ty - 165, game, 6.8);

        this.triMatrixCage = {
          x: tx,
          y: ty,
          nodes: [
            { x: p1.x, y: p1.y },
            { x: p2.x, y: p2.y },
            { x: p3.x, y: p3.y }
          ],
          life: 0,
          maxLife: 0.88,
          imploded: false
        };

        // Chain laser beam: Glacia -> Prism 1 -> Prism 2 -> Prism 3 -> Prism 1 + Target
        this.spawnBeamChainFX(
          [
            { x: this.x + this.facing * 44, y: this.y - 104 },
            { x: p1.x, y: p1.y },
            { x: p2.x, y: p2.y },
            { x: p3.x, y: p3.y },
            { x: p1.x, y: p1.y }
          ],
          false,
          0.62,
          8
        );
        this.spawnBeamChainFX(
          [
            { x: p3.x, y: p3.y },
            { x: tx, y: ty - 96 }
          ],
          false,
          0.62,
          8
        );

        if (enemy && !enemy.isDead) {
          const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
          const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
          const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
          const lockDmg = isVanguard ? 32 : isHarvester ? 34 : isGroundedCaster ? 38 : 40;
          enemy.takeDamage(lockDmg, this, false, 18, -35);
          this.applyBrittleFrost(enemy, 2, game, tx, ty - 96);
          if (game.vfx) {
            game.vfx.spawnDamageText(enemy.x, enemy.y - 162, 0, false, 'TRI-PRISM LASER CAGE!', '#67e8f9');
            game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 8, 'glacial');
          }
          if (game.renderer) game.renderer.triggerShake(10, 0.18);
        }
      }
    } else if (!this.didMatrixImplode && t >= 0.64) {
      this.didMatrixImplode = true;
      this.isDeflecting = false;
      const tx = enemy ? enemy.x : (this.triMatrixCage ? this.triMatrixCage.x : this.x + this.facing * 290);
      const ty = enemy ? enemy.groundY : this.groundY;

      if (this.triMatrixCage) {
        this.triMatrixCage.imploded = true;
        for (const n of this.triMatrixCage.nodes) {
          this.spawnBeamChainFX(
            [
              { x: n.x, y: n.y },
              { x: tx, y: ty - 96 }
            ],
            true,
            0.36,
            8
          );
        }
      }

      if (game.audio) game.audio.play('ice_shatter', tx);
      if (enemy && !enemy.isDead) {
        const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
        const convergeDmg = isVanguard ? 42 : isHarvester ? 45 : isGroundedCaster ? 50 : 52;
        enemy.takeDamage(convergeDmg, this, true, 90, -105);
        enemy.brittleStacks = Math.max(4, (enemy.brittleStacks || 0) + 2);
        this.applyBrittleFrost(enemy, 0, game, tx, ty - 96);
      }
    } else if (t >= 0.90) {
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // ★ 100% BESPOKE ICEMAGE ULTIMATE: "BOREALIS CATHEDRAL — ABSOLUTE ZERO"
    const t = this.stateTimer;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : this.x + this.facing * 280;
    const centerX = Math.max(240, Math.min(ww - 240, targetX));

    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;
    this.isDeflecting = t < 1.40;

    if (t < 0.04) {
      this.ultStage = 0;
    }

    const isVanguard = enemy && enemy.hasPoise && enemy.attackRange <= 160;
    const isHarvester = enemy && enemy.hasPoise && enemy.attackRange > 160;
    const isGroundedCaster = enemy && !enemy.hasPoise && enemy.moveSpeed <= 122;

    // Stage 1 (t >= 0.05): Flash-Freeze Arena Floor & Encase Enemy in the Colossal Faceted Diamond Iceberg!
    if (t >= 0.05 && this.ultStage === 0) {
      this.ultStage = 1;
      if (game.audio) game.audio.play('frost_cast', centerX);
      game.renderer.triggerShake(14, 0.25);

      this.spawnPermafrostZone(centerX, 340, 6.0);
      this.borealisCathedral = {
        x: centerX,
        y: this.groundY,
        life: 0,
        maxLife: 1.50,
        stage: 1,
        shattered: false
      };

      this.fx.spawn('borealisCathedralDomain', centerX, this.groundY, {
        light: 1.4
      });

      game.vfx.spawnDamageText(centerX, this.groundY - 360, 0, false, 'ABSOLUTE ZERO — BOREALIS CATHEDRAL!', '#67e8f9');
      if (enemy && !enemy.isDead) {
        if (!enemy.hasPoise) enemy.vx = 0;
        const d1 = isVanguard ? 28 : isHarvester ? 30 : isGroundedCaster ? 33 : 35;
        enemy.takeDamage(d1, this, false, -20, 0);
        this.applyBrittleFrost(enemy, 2, game, centerX, this.groundY - 110);
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 8, 'glacial');
      }
    }

    if (enemy && !enemy.isDead && !enemy.hasPoise && t < 1.0) {
      enemy.vx *= 0.12;
    }

    // Stage 2 (t >= 0.52): 7-Prism Orbital Laser Array slices through the Diamond Iceberg from 7 angles!
    if (t >= 0.52 && this.ultStage === 1) {
      this.ultStage = 2;
      if (this.borealisCathedral) this.borealisCathedral.stage = 2;
      if (game.audio) game.audio.play('prism_beam', centerX);
      game.renderer.triggerShake(16, 0.28);

      const cx = this.borealisCathedral ? this.borealisCathedral.x : centerX;
      const cy = this.groundY - 125;
      for (let k = 0; k < 7; k++) {
        const ang = -Math.PI * 0.92 + (k / 6) * (Math.PI * 0.84);
        const px = cx + Math.cos(ang) * 195;
        const py = cy + Math.sin(ang) * 165;
        this.spawnBeamChainFX(
          [
            { x: px, y: py },
            { x: cx, y: cy }
          ],
          k % 2 === 1,
          0.48,
          7
        );
      }

      if (enemy && !enemy.isDead) {
        const d2 = isVanguard ? 32 : isHarvester ? 34 : isGroundedCaster ? 36 : 38;
        enemy.takeDamage(d2, this, true, -25, -45);
        game.vfx.spawnDamageText(cx, this.groundY - 330, 0, false, '7-PRISM ORBITAL CONVERGENCE!', '#e879f9');
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 10, 'glacial');
      }
    }

    // Stage 3 (t >= 0.98): Colossal Diamond Iceberg Shatter & Crystalline Blizzard!
    if (t >= 0.98 && this.ultStage === 2) {
      this.ultStage = 3;
      if (this.borealisCathedral) {
        this.borealisCathedral.stage = 3;
        this.borealisCathedral.shattered = true;
      }
      if (game.audio) game.audio.play('ice_shatter', centerX);

      game.renderer.triggerShake(26, 0.50);
      game.renderer.triggerAberration(15);
      game.renderer.triggerHitStop(0.085);

      const cx = this.borealisCathedral ? this.borealisCathedral.x : centerX;
      const cy = this.groundY - 135;
      game.vfx.spawnDamageText(cx, this.groundY - 380, 0, true, '★ CATHEDRAL DIAMOND SHATTER! ★', '#a5f3fc');
      this.spawnPixelFrostRing(cx, cy, 240, '#67e8f9', 0.44, false, true);
      this.fx.burst(cx, cy, {
        count: 34,
        speedMin: 80,
        speedMax: 320,
        lifeMin: 0.22,
        lifeMax: 0.48,
        gravity: 95,
        colors: ['#ffffff', '#bae6fd', '#67e8f9', '#38bdf8', '#e879f9']
      });
      game.vfx.spawnGlyphBurst(cx, cy, 14, 'glacial');

      this.deployCryoPrism(cx - 140, this.groundY - 155, game, 7.0);
      this.deployCryoPrism(cx, this.groundY - 210, game, 7.0);
      this.deployCryoPrism(cx + 140, this.groundY - 155, game, 7.0);

      if (enemy && !enemy.isDead) {
        const d3 = isVanguard ? 94 : isHarvester ? 98 : isGroundedCaster ? 106 : 112;
        enemy.takeDamage(d3, this, true, 165, -210);
        this.heal(28, 'BOREALIS AEGIS');
      }
    }

    if (t >= 1.50) {
      this.isDeflecting = false;
      this.borealisCathedral = null;
      this.setState('IDLE');
    }
  }

  /**
   * ★ 3-OVERDRIVE SUPREME ULTIMATE (`state === 'TRUE_ULTIMATE'`):
   * "ABSOLUTE ZERO: DIAMOND DUST ETERNITY" (4.45s)
   * Never changes the stage background image.
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;

    if (t < 0.04) {
      this._trueUltStep = 0;
    }

    const targets = game?.fighters
      ? game.fighters.filter(
          (f) => f && f !== this && !f.isDead && !f.isBenched && (!this.team || !f.team || f.team !== this.team)
        )
      : [];
    if (enemy && !enemy.isDead && !enemy.isBenched && !targets.includes(enemy)) {
      targets.push(enemy);
    }

    // =========================================================================
    // PHASE 1 (0.00s .. 1.10s — Sovereign Aurora Ascension & Mandala Seal)
    // =========================================================================
    if (t < 1.10) {
      this._trueUltCoffinX = enemy
        ? Math.max(220, Math.min(980, enemy.x))
        : Math.max(220, Math.min(980, this.x + this.facing * 240));
      if (Math.abs(this._trueUltCoffinX - this.x) > 8) {
        this.facing = this._trueUltCoffinX >= this.x ? 1 : -1;
      }

      // Levitate 58px above this.groundY
      const liftU = Math.min(1, t / 0.28);
      this.y = this.groundY - 58 * (1 - Math.pow(1 - liftU, 2));
      this.trueUltFrameOverride = 120 + Math.min(9, Math.floor((t / 1.10) * 10));

      if (t >= 0.04 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        game?.audio?.play?.('ult_cast', this.x);
        game?.audio?.play?.('frost_cast', this.x);
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#38bdf8');
        game?.vfx?.spawnDamageText?.(
          this.x,
          this.y - 168,
          0,
          true,
          '★ ABSOLUTE ZERO: DIAMOND DUST! ★',
          '#38bdf8'
        );
        this.spawnPermafrostZone(this._trueUltCoffinX, 260, 5.5);
        this.spawnCryoPrism(this._trueUltCoffinX - 165, this.groundY - 175, game, 7.2);
        this.spawnCryoPrism(this._trueUltCoffinX, this.groundY - 225, game, 7.2);
        this.spawnCryoPrism(this._trueUltCoffinX + 165, this.groundY - 175, game, 7.2);
      }
      return;
    }

    // =========================================================================
    // PHASE 2 (1.10s .. 3.15s — Crystalline Diamond-Coffin Monolith & 8-Prism Borealis Refraction)
    // =========================================================================
    if (t >= 1.10 && this._trueUltStep < 2) {
      this._trueUltStep = 2;
      game?.audio?.play?.('frost_cast', this._trueUltCoffinX);
      game?.audio?.play?.('prism_beam', this._trueUltCoffinX);
      game?.vfx?.spawnDamageText?.(
        this._trueUltCoffinX,
        this.groundY - 224,
        0,
        true,
        'DIAMOND COFFIN SEAL!',
        '#67e8f9'
      );
    }

    // Encase active enemies at this._trueUltCoffinX from 1.10s .. 3.18s (ZERO micro-DoT damage ticks during charge!)
    if (t >= 1.10 && t <= 3.18) {
      this.y = this.groundY - 58;
      this.trueUltFrameOverride = 130 + (Math.floor((t - 1.10) * 14) % 10);

      if (enemy && !enemy.isDead) {
        enemy.x += (this._trueUltCoffinX - enemy.x) * Math.min(1, dt * 18);
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.chronoTimeStopTimer = Math.max(enemy.chronoTimeStopTimer || 0, 0.15);
      }
      for (const foe of targets) {
        if (foe && !foe.isDead) {
          foe.x += (this._trueUltCoffinX - foe.x) * Math.min(1, dt * 18);
          foe.vx = 0;
          foe.vy = 0;
          foe.chronoTimeStopTimer = Math.max(foe.chronoTimeStopTimer || 0, 0.15);
        }
      }
    }

    if (t < 3.20) {
      return;
    }

    // =========================================================================
    // PHASE 3 (t >= 3.20s, _trueUltStep < 3 — Scepter Tap & Instantaneous Diamond Dust Shatter)
    // =========================================================================
    if (t >= 3.20 && this._trueUltStep < 3) {
      this._trueUltStep = 3;
      this._trueUltShatterTimer = 0.95;

      if (enemy) enemy.chronoTimeStopTimer = 0;
      for (const foe of targets) {
        if (foe) foe.chronoTimeStopTimer = 0;
      }

      game?.renderer?.triggerImpactFrame?.(0.12, this._trueUltCoffinX, this.groundY - 110, 'glacial');
      game?.renderer?.triggerImpactFrame?.(this._trueUltCoffinX, this.groundY - 110, 0.12, 'glacial');
      game?.renderer?.shake?.(26, 0.70);
      game?.renderer?.triggerShake?.(26, 0.70);
      game?.renderer?.flash?.(0.32, '#f0f9ff');
      game?.renderer?.triggerAberration?.(16);
      game?.renderer?.triggerHitStop?.(0.09);

      game?.audio?.play?.('ult_cast', this._trueUltCoffinX);
      game?.audio?.play?.('ice_shatter', this._trueUltCoffinX);
      game?.audio?.play?.('prism_beam', this._trueUltCoffinX);

      this.heal(Math.round(this.maxHp * 0.18), 'AURORA SOVEREIGNTY');

      this.spawnPixelFrostRing(this._trueUltCoffinX, this.groundY - 128, 260, '#67e8f9', 0.48, false, true);
      this.fx?.burst(this._trueUltCoffinX, this.groundY - 128, {
        count: 42,
        speedMin: 90,
        speedMax: 350,
        lifeMin: 0.24,
        lifeMax: 0.56,
        gravity: 85,
        colors: ['#ffffff', '#f0f9ff', '#bae6fd', '#67e8f9', '#38bdf8', '#e879f9']
      });
      game?.vfx?.spawnGlyphBurst?.(this._trueUltCoffinX, this.groundY - 128, 16, 'glacial');
      game?.vfx?.spawnDamageText?.(
        this._trueUltCoffinX,
        this.groundY - 260,
        0,
        true,
        '★ DIAMOND DUST ETERNITY! ★',
        '#f0f9ff'
      );

      // Deal a SINGLE INSTANTANEOUS SHATTER BURST of 370 Crit damage (isCrit = true, knockX = 310, knockY = -250)
      for (const t of targets) {
        if (t && !t.isDead) {
          t.chronoTimeStopTimer = 0;
          t.takeDamage(370, this, true, 310, -250);
        }
      }
    }

    // =========================================================================
    // PHASE 4 (3.20s .. 4.45s — Smooth Descent & Return to IDLE)
    // =========================================================================
    const descU = Math.min(1, Math.max(0, (t - 3.20) / Math.max(0.01, this.trueUltDuration - 3.20)));
    const smoothDesc = descU * descU * (3 - 2 * descU);
    this.y = this.groundY - 58 * (1 - smoothDesc);
    this.trueUltFrameOverride = 140 + Math.min(9, Math.floor(descU * 10));

    if (t >= this.trueUltDuration) {
      this.y = this.groundY;
      this.vy = 0;
      this.isInvulnerable = false;
      this.trueUltFrameOverride = null;
      if (enemy) enemy.chronoTimeStopTimer = 0;
      this.setState('IDLE');
    }
  }

  /**
   * Renders any cell from `icemage_vfx.png` (rows 0..7, cols 0..29) with 3-Pass HD-2D Bloom.
   */
  drawBloomedVfxCell(ctx, vfxSheet, rowIdx, colIdx, x, y, size, fade = 1.0, renderer = null, glowScale = 1.9) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const c = Math.max(0, Math.min(29, Math.floor(colIdx)));
    const r = Math.max(0, Math.min(7, Math.floor(rowIdx)));
    const drawSize = Math.round(size / 4) * 4;
    const half = Math.round(-drawSize * 0.5);
    const gx = Math.round(x / 4) * 4;
    const gy = Math.round(y / 4) * 4;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(gx, gy);

    if (renderer && renderer.glowGlacial && glowScale > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * (r === 2 ? 0.32 : 0.48);
      const gSize = drawSize * glowScale;
      ctx.drawImage(renderer.glowGlacial, -gSize * 0.5, -gSize * 0.5, gSize, gSize);
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * (r === 2 ? 0.28 : 0.42);
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, half - 8, half - 8, drawSize + 16, drawSize + 16);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.99;
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, half, half, drawSize, drawSize);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * (r === 2 ? 0.14 : 0.28);
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, half, half, drawSize, drawSize);

    ctx.restore();
  }

  /**
   * Renders a rectangular `(w, h)` cell from `icemage_vfx.png` (rows 0..7, cols 0..29) with 3-Pass HD-2D Bloom.
   */
  drawBloomedVfxRect(
    ctx,
    vfxSheet,
    rowIdx,
    colIdx,
    x,
    y,
    w,
    h,
    fade = 1.0,
    renderer = null,
    glowScale = 1.6,
    angleRad = 0
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth || fade <= 0.01) return;
    const c = Math.max(0, Math.min(29, Math.floor(colIdx)));
    const r = Math.max(0, Math.min(7, Math.floor(rowIdx)));
    const drawW = Math.round(w / 4) * 4;
    const drawH = Math.round(h / 4) * 4;
    const halfW = Math.round(-drawW * 0.5);
    const halfH = Math.round(-drawH * 0.5);
    const gx = Math.round(x / 4) * 4;
    const gy = Math.round(y / 4) * 4;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(gx, gy);
    if (angleRad) ctx.rotate(angleRad);

    if (renderer && renderer.glowGlacial && glowScale > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.44;
      const gW = drawW * glowScale;
      const gH = drawH * glowScale;
      ctx.drawImage(renderer.glowGlacial, -gW * 0.5, -gH * 0.5, gW, gH);
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.36;
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, halfW - 6, halfH - 6, drawW + 12, drawH + 12);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.99;
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, halfW, halfH, drawW, drawH);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.28;
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, halfW, halfH, drawW, drawH);

    ctx.restore();
  }

  /**
   * Renders `icemage_vfx.png` Row 5 (Aurora Borealis Sovereign Snowflake Mandala, 320x320)
   * spinning behind Lyra during her 3-Overdrive Supreme Ultimate (`TRUE_ULTIMATE`).
   */
  drawBehind(ctx, renderer = null) {
    if (this.state !== 'TRUE_ULTIMATE' && this._trueUltShatterTimer <= 0) return;
    const vfxSheet = PixelForge.initAssets()?.icemage?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const t = this.stateTimer || 0;
    const dur = this.trueUltDuration || 4.45;
    const fadeIn = Math.min(1, t / 0.18);
    const fadeOut = this.state === 'TRUE_ULTIMATE'
      ? Math.min(1, Math.max(0, (dur - t) / 0.35))
      : Math.min(1, this._trueUltShatterTimer / 0.35);
    const fade = fadeIn * fadeOut;
    if (fade <= 0.01) return;

    const col = Math.floor(t * 30) % 30;
    this.drawBloomedVfxRect(
      ctx,
      vfxSheet,
      5,
      col,
      this.x,
      this.y - 104,
      320,
      320,
      fade * 0.94,
      renderer,
      1.65,
      0
    );
  }

  /**
   * Renders soft Glacial Floor Bloom & Flanking Row-2 Glacier Crystal Spires for active Permafrost Zones
   * (while 120Hz `permafrostSnowflakeSigil` renders the 2.5D back/front perspective rings & rising glints).
   */
  drawPermafrostZones(ctx, renderer = null) {
    if (!this.permafrostZones.length) return;
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const z of this.permafrostZones) {
      const fade = Math.min(1, (z.maxLife - z.life) * 1.5) * Math.min(1, z.life / 0.15);
      const rx = Math.round(z.x / 4) * 4;
      const ry = Math.round((z.y - 2) / 4) * 4;
      const rX = Math.round((z.radius * 0.92) / 4) * 4;

      if (renderer && renderer.glowGlacial) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.42;
        ctx.drawImage(renderer.glowGlacial, rx - rX * 1.25, ry - 48, rX * 2.5, 96);
      }

      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const spireCol = Math.min(20, Math.floor((z.life * 18) % 16) + 5);
        for (const side of [-1, 1]) {
          const ex = Math.round((rx + side * (rX - 12)) / 4) * 4;
          this.drawBloomedVfxCell(ctx, vfxSheet, 2, spireCol, ex, ry - 28, 68, fade * 0.92, renderer, 1.4);
        }
      }
    }

    ctx.restore();
  }

  /**
   * Renders 2 Counter-Rotating Bloomed Snowflake-Prism Satellites behind Glacia's shoulders.
   */
  drawOrbitingCryoPrisms(ctx, renderer = null) {
    if (this.isDead) return;
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const t = performance.now() * 0.001;
    const col = Math.floor(this.stateTimer * 30) % 30;
    const satellites = [
      { ox: -this.facing * 42, oy: -128 + Math.round(Math.sin(t * 3.0) * 3) * 2, size: 52 },
      { ox: this.facing * 36, oy: -148 + Math.round(Math.cos(t * 3.0) * 3) * 2, size: 44 }
    ];

    for (const s of satellites) {
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        col,
        this.x + s.ox,
        this.y + s.oy,
        s.size,
        0.92,
        renderer,
        1.5
      );
    }
  }

  /**
   * Renders Floating Hexagonal Cryo-Prism Mirrors (Row 1) & Tri-Matrix Rose-Window Seal (Row 3).
   */
  drawCryoPrismsAndMatrixSeal(ctx, renderer = null) {
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (this.triMatrixCage) {
      const mc = this.triMatrixCage;
      const fade = Math.min(1, (mc.maxLife - mc.life) * 3.0);
      const nodes = mc.nodes;
      const cx = Math.round(((nodes[0].x + nodes[1].x + nodes[2].x) / 3) / 4) * 4;
      const cy = Math.round(((nodes[0].y + nodes[1].y + nodes[2].y) / 3) / 4) * 4;
      const sealCol = Math.floor(mc.life * 30) % 30;
      this.drawBloomedVfxCell(ctx, vfxSheet, 3, sealCol, cx, cy, 128, fade * 0.92, renderer, 1.8);
    }

    const col = Math.floor(this.stateTimer * 30) % 30;
    for (const p of this.cryoPrisms) {
      const fade = Math.min(1, (p.maxLife - p.life) * 1.5) * Math.min(1, p.life / 0.14);
      this.drawBloomedVfxCell(ctx, vfxSheet, 1, col, p.x, p.y, 104, fade, renderer, 1.85);
    }

    ctx.restore();
  }

  /**
   * Renders Sculpted Ice-Statue Decoy (Dodge), Refractive Glacial Ice-Wall (Crouch), & Brittle Frost Crystals.
   */
  drawIceConstructsAndBrittle(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().icemage;
    const vfxSheet = sprites?.vfx;

    if (this.iceDecoy && sprites?.sheet && sprites.sheet.complete) {
      const d = this.iceDecoy;
      const fade = Math.min(1, (d.maxLife - d.life) * 3.5);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(d.x / 4) * 4, Math.round(d.y / 4) * 4);
      ctx.scale(d.facing, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.88;
      PixelForge.drawAfterimageFrame(ctx, sprites, d.frameIdx, 208, 208);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.65;
      PixelForge.drawGhostFrame(ctx, sprites, d.frameIdx, 208, 208);
      ctx.restore();
    }

    if (this.iceWall && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const iw = this.iceWall;
      const fade = Math.min(1, (iw.maxLife - iw.life) * 2.5);
      const col = Math.min(21, Math.floor((iw.life / iw.maxLife) * 22));
      this.drawBloomedVfxCell(ctx, vfxSheet, 2, col, iw.x, iw.y - 68, 160, fade, renderer, 1.9);
    }

    if (this.game && this.game.fighters && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const baseCol = Math.floor(this.stateTimer * 30) % 30;
      for (const f of this.game.fighters) {
        if (f !== this && !f.isDead && f.brittleStacks >= 1) {
          const count = Math.min(3, Math.floor(f.brittleStacks));
          for (let k = 0; k < count; k++) {
            const ox = (k - 1) * 26;
            const oy = -32 - (k % 2) * 18;
            this.drawBloomedVfxCell(
              ctx,
              vfxSheet,
              1,
              (baseCol + k * 7) % 30,
              f.x + ox,
              f.y + oy,
              36,
              0.92,
              renderer,
              1.2
            );
          }
        }
      }
    }
  }

  /**
   * Renders the Colossal Borealis Cathedral Ultimate constructs (Rose Mandala, Faceted Diamond Iceberg,
   * 7 Orbiting Snowflake-Prism Turrets, & Stage 3 Hoarfrost Shatter Starburst), layered with `borealisCathedralDomain`.
   */
  drawBorealisCathedral(ctx, renderer = null) {
    if (!this.borealisCathedral) return;
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const bc = this.borealisCathedral;
    const fade = Math.min(1, (bc.maxLife - bc.life) * 3.0);
    const cx = Math.round(bc.x / 4) * 4;
    const cy = Math.round(bc.y / 4) * 4;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const sealCol = Math.floor(bc.life * 24) % 30;
    this.drawBloomedVfxCell(ctx, vfxSheet, 3, sealCol, cx, cy - 156, 280, fade * 0.94, renderer, 2.0);

    const iceCol = bc.shattered
      ? Math.min(29, 22 + Math.floor(((bc.life - 0.98) / 0.52) * 8))
      : Math.min(21, Math.floor((bc.life / 0.98) * 21));
    this.drawBloomedVfxCell(
      ctx,
      vfxSheet,
      2,
      iceCol,
      cx,
      cy - 132,
      312,
      fade * (bc.shattered ? 0.88 : 0.98),
      renderer,
      2.1
    );

    const prismCol = Math.floor(bc.life * 30) % 30;
    for (let k = 0; k < 7; k++) {
      const ang = -Math.PI * 0.92 + (k / 6) * (Math.PI * 0.84);
      const px = Math.round((cx + Math.cos(ang) * 196) / 4) * 4;
      const py = Math.round((cy - 128 + Math.sin(ang) * 164) / 4) * 4;
      this.drawBloomedVfxCell(ctx, vfxSheet, 1, prismCol, px, py, 104, fade * 0.96, renderer, 1.6);
    }

    if (bc.shattered) {
      const novaCol = Math.min(29, Math.floor(((bc.life - 0.98) / 0.52) * 30));
      this.drawBloomedVfxCell(ctx, vfxSheet, 4, novaCol, cx, cy - 136, 328, fade * 0.96, renderer, 2.2);
    }

    ctx.restore();
  }

  /**
   * Stamps Row-4 Hoarfrost Shatter Starburst sprites for spiked shatter detonations.
   */
  drawFrostShatterNovas(ctx, renderer = null) {
    if (!this.activeFrostRings.length) return;
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    for (const r of this.activeFrostRings) {
      if (!r.hasSpikes) continue;
      const u = Math.min(1, r.life / r.maxLife);
      const fade = Math.max(0, 1 - u);
      const col = Math.min(29, Math.floor(u * 30));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        4,
        col,
        r.x,
        r.y,
        Math.round(r.maxRadius * 1.45),
        fade * 0.88,
        renderer,
        1.6
      );
    }
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);
    this.drawPermafrostZones(ctx, renderer);
    this.drawIceConstructsAndBrittle(ctx, renderer);
    this.drawCryoPrismsAndMatrixSeal(ctx, renderer);
  }

  drawUltimateForeground(ctx, renderer = null) {
    this.drawBorealisCathedral(ctx, renderer);
    this.drawFrostShatterNovas(ctx, renderer);
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().icemage;
    if (!sprites) return;
    const vfxSheet = sprites.vfx;

    if (!isReflection) {
      this.drawBehind(ctx, renderer);
      this.drawOrbitingCryoPrisms(ctx, renderer);
    }

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

    // Supreme Ultimate (`TRUE_ULTIMATE`) Phase 2 Diamond-Coffin Monolith (Row 6, 280x320) & 8-Prism Borealis Refraction,
    // plus Phase 3 Diamond Dust Prismatic Starburst Shatter (Row 7, 420x360)
    if (!isReflection && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const t = this.stateTimer || 0;
      const coffinX = Math.round((this._trueUltCoffinX || 600) / 4) * 4;
      const coffinY = Math.round((this.groundY - 148) / 4) * 4;

      if (this.state === 'TRUE_ULTIMATE' && t >= 1.10 && t <= 3.18) {
        const sealProgress = Math.max(0, Math.min(1, (t - 1.10) / 2.08));
        const row6Col = Math.min(29, Math.floor(sealProgress * 30));
        const fade = Math.min(1, (t - 1.10) / 0.14);

        // Row 6: Absolute Zero Crystalline Diamond-Coffin Monolith (280x320)
        this.drawBloomedVfxRect(
          ctx,
          vfxSheet,
          6,
          row6Col,
          coffinX,
          coffinY,
          280,
          320,
          fade * 0.96,
          renderer,
          1.85,
          0
        );

        // 8 orbiting Borealis laser refraction lines bouncing across the Diamond Coffin (1.10s .. 3.18s)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const prismCol = Math.floor(t * 30) % 30;
        for (let i = 0; i < 8; i++) {
          const ang = t * 3.4 + (i * Math.PI * 2) / 8;
          const nextAng = ang + Math.PI * 0.75 + Math.sin(t * 6.0 + i) * 0.25;
          const px = Math.round(coffinX + Math.cos(ang) * 168);
          const py = Math.round(coffinY + Math.sin(ang) * 134);
          const bx = Math.round(coffinX + Math.cos(nextAng) * 58);
          const by = Math.round(coffinY + Math.sin(nextAng) * 86);
          const tx = Math.round(coffinX - Math.cos(ang) * 112);
          const ty = Math.round(coffinY - Math.sin(ang) * 96);
          const beamColor = i % 2 === 0 ? '#38bdf8' : '#e879f9';

          ctx.strokeStyle = beamColor;
          ctx.lineWidth = 5;
          ctx.globalAlpha = fade * 0.68;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(bx, by);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.globalAlpha = fade * 0.92;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(bx, by);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          this.drawBloomedVfxCell(ctx, vfxSheet, 1, (prismCol + i * 3) % 30, px, py, 56, fade * 0.88, renderer, 1.3);
        }
        ctx.restore();
      }

      // Phase 3: Row 7 (Diamond Dust Prismatic Starburst Shatter, 420x360) at _trueUltCoffinX and across the stage
      if (this._trueUltShatterTimer > 0) {
        const uShatter = 1 - Math.max(0, Math.min(1, this._trueUltShatterTimer / 0.95));
        const row7Col = Math.min(29, Math.floor(uShatter * 30));
        const shatterFade = Math.min(1, this._trueUltShatterTimer / 0.25);

        this.drawBloomedVfxRect(
          ctx,
          vfxSheet,
          7,
          row7Col,
          coffinX,
          coffinY,
          420,
          360,
          shatterFade * 0.98,
          renderer,
          2.1,
          0
        );

        for (const side of [-1, 1]) {
          const stageX = Math.max(160, Math.min(1040, coffinX + side * 260));
          const subCol = Math.min(29, Math.max(0, row7Col - 2));
          this.drawBloomedVfxRect(
            ctx,
            vfxSheet,
            7,
            subCol,
            stageX,
            coffinY - 12,
            320,
            280,
            shatterFade * 0.82,
            renderer,
            1.7,
            0
          );
        }
      }
    }
  }
}
