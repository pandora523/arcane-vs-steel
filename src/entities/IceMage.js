import { Fighter } from './Fighter.js?v=30fps29';
import { PixelForge } from '../engine/PixelForge.js?v=30fps29';
import { PixelFont } from '../engine/PixelFont.js?v=30fps29';

export class IceMage extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Glacia',
      x,
      groundY,
      facing,
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
    this.ultName = 'BOREALIS CATHEDRAL';
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
    this.skateRibbons = []; // Crystalline figure-skating blade ribbons left behind as Glacia glides
    this.activeFrostRings = []; // Pure 4x4 pixel-art expanding crystalline snowflake shockwaves (zero smooth Canvas2D arcs!)

    this.dodgeMaxCooldown = 3.08;
    this.dashMaxCooldown = 3.05;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.94;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = x;
    this.flipTargetX = x;
    this.flipAngle = 0;

    this.didMatrixDeploy = false;
    this.didMatrixImplode = false;
    this.ultStage = 0;
  }

  /**
   * Spawns a pure 4x4 pixel-art expanding Crystalline Snowflake Shockwave Ring (replaces smooth vector spawnShockwave).
   */
  spawnPixelFrostRing(x, y, maxRadius = 110, color = '#67e8f9', maxLife = 0.30, isFloor = false, hasSpikes = false) {
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

  /**
   * Spawns or refreshes a Floating Hexagonal Cryo-Prism Mirror on the battlefield (max 3 active).
   */
  deployCryoPrism(x, y, game, duration = 6.5) {
    const ww = game && game.renderer ? game.renderer.worldWidth : 1200;
    const clampedX = Math.max(110, Math.min(ww - 110, x));
    const clampedY = Math.max(this.groundY - 235, Math.min(this.groundY - 68, y));

    // If a prism is already very close, refresh it instead of stacking
    for (const p of this.cryoPrisms) {
      if (Math.hypot(p.x - clampedX, p.y - clampedY) < 64) {
        p.x = clampedX;
        p.y = clampedY;
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
    if (game && game.vfx) {
      game.vfx.spawnGlyphBurst(clampedX, clampedY, 4, 'glacial');
    }
    return prism;
  }

  /**
   * Freezes a stretch of the arena floor into a shimmering Permafrost Ice-Rink.
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
        return z;
      }
    }
    if (this.permafrostZones.length >= 3) {
      this.permafrostZones.shift();
    }
    const zone = {
      x: cx,
      y: this.groundY,
      radius,
      life: 0,
      maxLife: duration
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
    // Grant Glacia a Crystalline Frost Barrier heal on shatter
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
        game.vfx.spawnBurst(enemy.x, enemy.y - 96, 18, '#a5f3fc', 240, { upBias: 95, size: 6 });
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 8, 'glacial');
      }
    }

    // If Glacia has any active Cryo-Prisms, fire a ricochet laser from the shattered enemy back through the nearest prism!
    if (this.cryoPrisms.length > 0) {
      const prism = this.cryoPrisms[0];
      prism.pulse = 1.35;
      this.prismBeams.push({
        points: [
          { x: originX, y: originY },
          { x: prism.x, y: prism.y },
          { x: enemy.x, y: enemy.y - 98 }
        ],
        life: 0,
        maxLife: 0.34,
        color: '#e879f9',
        width: 7
      });
    }
  }

  /**
   * Fires a multi-segment Refracted Borealis Laser chain through active Cryo-Prisms onto the enemy.
   */
  fireRefractedPrismLaser(spawnX, spawnY, enemy, game, isEmpowered = false) {
    if (!enemy || enemy.isDead) return;
    const targetX = enemy.x;
    const targetY = enemy.y - 102;

    // Sort active prisms by proximity to the midpoint between Glacia and the enemy
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
        p.life = Math.max(0, p.life - 1.2); // Energize prism lifespan when refracting!
        pts.push({ x: p.x, y: p.y });
      }
      pts.push({ x: targetX, y: targetY });

      this.prismBeams.push({
        points: pts,
        life: 0,
        maxLife: isEmpowered ? 0.38 : 0.28,
        color: isEmpowered ? '#e879f9' : '#67e8f9',
        width: isEmpowered ? 8 : 6
      });

      // Spawn a refracted secondary cryo_shard from the last prism toward the enemy!
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

    // Erect a Refractive Hexagonal Ice-Wall Monolith in front of Glacia!
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
    // Boosted figure-skating momentum across Permafrost
    this.vx = escapeDir * 415;
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

    // ★ SIGNATURE ICEMAGE DODGE: "FROST-MIRROR STATUE DECOY & SKATE SLIDE"
    // Freezes a sculpted solid Ice-Statue Decoy at her departure spot while skating to safety!
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

    // Spawn a floating Hexagonal Cryo-Prism Mirror where the decoy shattered!
    const prism = this.deployCryoPrism(d.x, this.groundY - 132, game, 6.8);
    this.spawnPixelFrostRing(d.x, d.y - 92, 112, '#67e8f9', 0.30, false, true);

    if (game) {
      if (game.audio) game.audio.play('ice_shatter', d.x);
      if (game.vfx) {
        game.vfx.spawnBurst(d.x, d.y - 92, 16, '#a5f3fc', 225, { upBias: 85, size: 6 });
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
        // Fire a homing cryo_shard from the newly birthed prism toward the enemy
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

    // Record figure-skating blade ribbons during Dash / Dodge / Jump
    if (Math.random() < 0.65) {
      this.skateRibbons.push({
        x: this.x + (Math.random() - 0.5) * 16,
        y: this.y - 6,
        life: 0,
        maxLife: 0.42
      });
    }

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

      // At apex (u >= 0.48), deploy an aerial Cryo-Prism Mirror and refract a beam down at the enemy!
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
      // Pulse a freezing Permafrost wave & fire a low refractive frost lance through the Ice-Wall!
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

    // 3. Update Permafrost Ice-Rink Floor Zones (Skate acceleration for Glacia + Brittle Frost buildup on enemy)
    let onPermafrost = false;
    for (let i = this.permafrostZones.length - 1; i >= 0; i--) {
      const z = this.permafrostZones[i];
      z.life += dt;
      if (Math.abs(this.x - z.x) <= z.radius) {
        onPermafrost = true;
      }
      if (enemy && !enemy.isDead && Math.abs(enemy.x - z.x) <= z.radius && Math.abs(enemy.y - this.groundY) < 28) {
        // Enemy standing on Permafrost accumulates slow Rime Chill toward Brittle Shatter
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
        this.permafrostZones.splice(i, 1);
      }
    }

    // Boost Glacia's figure-skating glide when on Permafrost!
    if (onPermafrost && this.state === 'WALK') {
      this.x += this.facing * (this.moveDir || 1) * 38 * dt;
      if (Math.random() < 0.45) {
        this.skateRibbons.push({
          x: this.x + (Math.random() - 0.5) * 14,
          y: this.groundY - 4,
          life: 0,
          maxLife: 0.36
        });
      }
    }

    // Decay enemy Brittle Frost stacks if not refreshed
    if (enemy && enemy.brittleStacks > 0) {
      enemy.brittleDecayTimer = (enemy.brittleDecayTimer || 4.0) - dt;
      if (enemy.brittleDecayTimer <= 0) {
        enemy.brittleStacks = 0;
      }
    }

    // 4. Update Sculpted Ice-Statue Decoy (detonates if enemy steps close or fuse expires!)
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
            // Refract the enemy projectile into 2 friendly Borealis Frost Shards!
            const origX = proj.x;
            const origY = proj.y;
            game.vfx.projectiles.splice(i, 1);
            this.iceWall.refractedCount++;
            if (game.audio) game.audio.play('ice_shatter', origX);
            game.vfx.spawnDamageText(origX, origY - 36, 0, false, 'PRISM WALL REFRACT!', '#67e8f9');
            game.vfx.spawnGlyphBurst(origX, origY, 5, 'glacial');

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
    for (let i = this.skateRibbons.length - 1; i >= 0; i--) {
      this.skateRibbons[i].life += dt;
      if (this.skateRibbons[i].life >= this.skateRibbons[i].maxLife) {
        this.skateRibbons.splice(i, 1);
      }
    }
    for (let i = this.activeFrostRings.length - 1; i >= 0; i--) {
      this.activeFrostRings[i].life += dt;
      if (this.activeFrostRings[i].life >= this.activeFrostRings[i].maxLife) {
        this.activeFrostRings.splice(i, 1);
      }
    }

    // 7. Proactive Cryo-Prism Sovereign Tactical AI (Jump Vault, Decoy Slide, Refractive Ice-Wall Crouch)
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
      if (this.stepDustTimer >= 0.30) {
        this.stepDustTimer = 0;
        this.skateRibbons.push({
          x: this.x - this.facing * 10,
          y: this.groundY - 4,
          life: 0,
          maxLife: 0.38
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

        // Materialize a new Floating Cryo-Prism Mirror if fewer than 2 are on the field (or on every 3rd shot)
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

        // Primary Hexagonal Cryo-Prism Shard Bolt
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

        // Refract Borealis Laser through active battlefield Cryo-Prisms!
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
    // Deploys 3 Hexagonal Cryo-Prisms in a geometric triangle around the enemy, chains a Borealis Laser around all 3, and implodes!
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

        // Deploy 3 Cryo-Prisms in a triangle framing the target
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

        // Chain laser beam: Glacia -> Prism 1 -> Prism 2 -> Prism 3 -> Target
        this.prismBeams.push({
          points: [
            { x: this.x + this.facing * 44, y: this.y - 104 },
            { x: p1.x, y: p1.y },
            { x: p2.x, y: p2.y },
            { x: p3.x, y: p3.y },
            { x: tx, y: ty - 96 }
          ],
          life: 0,
          maxLife: 0.62,
          color: '#67e8f9',
          width: 8
        });

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
        // Fire 3 converging beams from the triangle vertices into the enemy's core!
        for (const n of this.triMatrixCage.nodes) {
          this.prismBeams.push({
            points: [
              { x: n.x, y: n.y },
              { x: tx, y: ty - 96 }
            ],
            life: 0,
            maxLife: 0.36,
            color: '#e879f9',
            width: 8
          });
        }
      }

      if (game.audio) game.audio.play('ice_shatter', tx);
      if (enemy && !enemy.isDead) {
        const isVanguard = enemy.hasPoise && enemy.attackRange <= 160;
        const isHarvester = enemy.hasPoise && enemy.attackRange > 160;
        const isGroundedCaster = !enemy.hasPoise && enemy.moveSpeed <= 122;
        const convergeDmg = isVanguard ? 42 : isHarvester ? 45 : isGroundedCaster ? 50 : 52;
        enemy.takeDamage(convergeDmg, this, true, 90, -105);
        // Trigger immediate Brittle Shatter if enemy has any Brittle stacks!
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
        this.prismBeams.push({
          points: [
            { x: px, y: py },
            { x: cx, y: cy }
          ],
          life: 0,
          maxLife: 0.48,
          color: k % 2 === 0 ? '#67e8f9' : '#e879f9',
          width: 7
        });
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
      game.vfx.spawnBurst(cx, cy, 28, '#67e8f9', 320, { upBias: 90, size: 7 });
      game.vfx.spawnBurst(cx, cy, 22, '#e879f9', 290, { upBias: 75, size: 6 });
      game.vfx.spawnGlyphBurst(cx, cy, 14, 'glacial');

      // Refresh 3 Cryo-Prisms on the field after the ultimate!
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
   * Helper: Renders any cell from `icemage_vfx.png` with Chronomancer/Octopath-style 3-Pass HD-2D Bloom:
   * (1) Radial `renderer.glowGlacial` halo (`lighter`)
   * (2) Expanded outer pixel bloom pass (`lighter`)
   * (3) Crisp un-blurred pixel-art sprite pass (`source-over`)
   * (4) Inner specular crystal highlight pass (`lighter`)
   */
  drawBloomedVfxCell(ctx, vfxSheet, rowIdx, colIdx, x, y, size, fade = 1.0, renderer = null, glowScale = 1.9) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const c = Math.max(0, Math.min(29, Math.floor(colIdx)));
    const r = Math.max(0, Math.min(4, Math.floor(rowIdx)));
    const drawSize = Math.round(size / 4) * 4;
    const half = Math.round(-drawSize * 0.5);
    const gx = Math.round(x / 4) * 4;
    const gy = Math.round(y / 4) * 4;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(gx, gy);

    if (renderer && renderer.glowGlacial && glowScale > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.52;
      const gSize = drawSize * glowScale;
      ctx.drawImage(renderer.glowGlacial, -gSize * 0.5, -gSize * 0.5, gSize, gSize);
    }

    // Pass 1: Expanded outer pixel bloom aura
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.44;
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, half - 8, half - 8, drawSize + 16, drawSize + 16);

    // Pass 2: Main crisp pixel-art sprite
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.98;
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, half, half, drawSize, drawSize);

    // Pass 3: Inner specular crystal highlight bloom
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.36;
    ctx.drawImage(vfxSheet, c * 208, r * 208, 208, 208, half, half, drawSize, drawSize);

    ctx.restore();
  }

  /**
   * Stepped 4x4 Pixel-Art Borealis Laser & Dual-Helix Refraction Beam Rasterizer
   * Matches `VFXManager.js` HD-2D beams: radial glacial light halos + additive `lighter` stepped 4x4 pixel
   * energy bands + pure-white 4x4 pixel core + dual-helix 4x4 pixel frost motes (ZERO #0c1226 black boxes!).
   */
  drawSteppedPixelLine4x4(ctx, x0, y0, x1, y1, mainColor = '#38bdf8', coreColor = '#ffffff', fade = 1.0, renderer = null) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 4));
    const nx = dist > 0.001 ? -dy / dist : 0;
    const ny = dist > 0.001 ? dx / dist : -1;
    const tNow = performance.now() * 0.012;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Pass 0: Soft radial glacial light halos along the shaft
    if (renderer && renderer.glowGlacial) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.34;
      const haloSteps = Math.max(2, Math.min(6, Math.ceil(dist / 72)));
      for (let h = 0; h <= haloSteps; h++) {
        const u = h / haloSteps;
        const hx = x0 + dx * u;
        const hy = y0 + dy * u;
        ctx.drawImage(renderer.glowGlacial, hx - 56, hy - 56, 112, 112);
      }
    }

    // Pass 1: Additive outer 12x12 & 8x8 stepped 4x4 pixel Borealis energy bands
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.36;
    ctx.fillStyle = mainColor === '#e879f9' ? '#a855f7' : '#0284c7';
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const gx = Math.round((x0 + dx * u) / 4) * 4;
      const gy = Math.round((y0 + dy * u) / 4) * 4;
      ctx.fillRect(gx - 6, gy - 6, 12, 12);
    }

    ctx.globalAlpha = fade * 0.78;
    ctx.fillStyle = mainColor;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const gx = Math.round((x0 + dx * u) / 4) * 4;
      const gy = Math.round((y0 + dy * u) / 4) * 4;
      ctx.fillRect(gx - 4, gy - 4, 8, 8);
    }

    // Pass 2: Crisp 4x4 pixel diamond-white core + dual-helix 4x4 pixel frost motes spiraling along the beam
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.98;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const bx = x0 + dx * u;
      const by = y0 + dy * u;
      const gx = Math.round(bx / 4) * 4;
      const gy = Math.round(by / 4) * 4;
      ctx.fillStyle = coreColor;
      ctx.fillRect(gx - 2, gy - 2, 4, 4);

      if (s % 3 === 0) {
        const helixOff = Math.sin(u * 10.0 - tNow) * 7.5;
        const hx1 = Math.round((bx + nx * helixOff) / 4) * 4;
        const hy1 = Math.round((by + ny * helixOff) / 4) * 4;
        ctx.fillStyle = '#a5f3fc';
        ctx.fillRect(hx1 - 2, hy1 - 2, 4, 4);

        const hx2 = Math.round((bx - nx * helixOff) / 4) * 4;
        const hy2 = Math.round((by - ny * helixOff) / 4) * 4;
        ctx.fillStyle = '#e879f9';
        ctx.fillRect(hx2 - 2, hy2 - 2, 4, 4);
      }
    }

    ctx.restore();
  }

  /**
   * Stepped 4x4 Pixel-Art Faceted Diamond Crystal Star Rasterizer (Zero dark #0c1226 boxes!)
   */
  drawSteppedPixelDiamond4x4(ctx, cx, cy, radiusBlocks = 2, bodyColor = '#38bdf8', facetColor = '#a5f3fc', fade = 1.0) {
    const gx = Math.round(cx / 4) * 4;
    const gy = Math.round(cy / 4) * 4;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Additive outer diamond glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.55;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(gx - (radiusBlocks + 1) * 4, gy - 2, (radiusBlocks * 2 + 2) * 4, 4);
    ctx.fillRect(gx - 2, gy - (radiusBlocks + 1) * 4, 4, (radiusBlocks * 2 + 2) * 4);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.96;
    for (let by = -radiusBlocks; by <= radiusBlocks; by++) {
      const rem = radiusBlocks - Math.abs(by);
      for (let bx = -rem; bx <= rem; bx++) {
        const manhattan = Math.abs(bx) + Math.abs(by);
        const px = gx + bx * 4 - 2;
        const py = gy + by * 4 - 2;
        if (bx === 0 && by === 0) {
          ctx.fillStyle = '#ffffff';
        } else if (manhattan === 1) {
          ctx.fillStyle = '#e0f2fe';
        } else if (bx <= 0 && by <= 0) {
          ctx.fillStyle = facetColor;
        } else {
          ctx.fillStyle = bodyColor;
        }
        ctx.fillRect(px, py, 4, 4);
      }
    }
    ctx.restore();
  }

  /**
   * Pass 7: Renders Luminous HD-2D Perspective Crystalline Snowflake Floor Sigils & Figure-Skate Sparkle Trails!
   * Replaces the old opaque rectangular "ice road" with:
   * - Soft radial `renderer.glowGlacial` floor bloom (`lighter`)
   * - Perspective-foreshortened Rotating 12-Point Snowflake Octagram Sigil (`rX = rad * 0.90, rY = 18`) stepped on the 4x4 pixel grid
   * - Dendritic crystal spokes & 12 outer diamond rune nodes
   * - Drifting 4x4 pixel diamond snowflakes rising gently from the frost sigil
   * - Flanking 3-pass bloomed Row-2 Glacier Crystal Spires
   */
  drawPermafrostZones(ctx, renderer = null) {
    if (!this.permafrostZones.length && !this.skateRibbons.length) return;
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;
    const tNow = performance.now() * 0.0022;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const z of this.permafrostZones) {
      const fade = Math.min(1, (z.maxLife - z.life) * 1.5) * Math.min(1, z.life / 0.15);
      const rx = Math.round(z.x / 4) * 4;
      const ry = Math.round((z.y - 2) / 4) * 4;
      const rX = Math.round((z.radius * 0.92) / 4) * 4;
      const rY = 18;

      // 1. Soft Glacial & Aurora Floor Bloom
      if (renderer && renderer.glowGlacial) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.52;
        ctx.drawImage(renderer.glowGlacial, rx - rX * 1.25, ry - 48, rX * 2.5, 96);
      }

      // 2. Perspective-Foreshortened Counter-Rotating 4x4 Pixel Snowflake Rings (Outer & Inner Ellipses)
      ctx.globalCompositeOperation = 'lighter';
      const ringSteps = 44;
      for (let s = 0; s < ringSteps; s++) {
        const aOut = (s / ringSteps) * Math.PI * 2 + tNow;
        const ox = Math.round((rx + Math.cos(aOut) * rX) / 4) * 4;
        const oy = Math.round((ry + Math.sin(aOut) * rY) / 4) * 4;
        ctx.globalAlpha = fade * (s % 4 === 0 ? 0.95 : 0.72);
        ctx.fillStyle = s % 4 === 0 ? '#ffffff' : (s % 2 === 0 ? '#38bdf8' : '#c084fc');
        ctx.fillRect(ox - 2, oy - 2, 4, 4);

        const aIn = -(s / ringSteps) * Math.PI * 2 + tNow * 1.4;
        const ix = Math.round((rx + Math.cos(aIn) * (rX * 0.58)) / 4) * 4;
        const iy = Math.round((ry + Math.sin(aIn) * (rY * 0.58)) / 4) * 4;
        if (s % 2 === 0) {
          ctx.globalAlpha = fade * 0.78;
          ctx.fillStyle = s % 4 === 0 ? '#a5f3fc' : '#38bdf8';
          ctx.fillRect(ix - 2, iy - 2, 4, 4);
        }
      }

      // 3. 8 Rotating Dendritic Snowflake Crystal Spokes & 8 Outer Diamond Nodes on the Floor Plane
      for (let k = 0; k < 8; k++) {
        const ang = tNow * 0.65 + k * (Math.PI * 0.25);
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const spokeSteps = 8;
        for (let d = 1; d <= spokeSteps; d++) {
          const u = d / spokeSteps;
          const sx = Math.round((rx + ca * rX * u) / 4) * 4;
          const sy = Math.round((ry + sa * rY * u) / 4) * 4;
          ctx.globalAlpha = fade * (d === spokeSteps ? 0.96 : 0.68);
          ctx.fillStyle = d === spokeSteps ? '#ffffff' : (k % 2 === 0 ? '#67e8f9' : '#e879f9');
          ctx.fillRect(sx - 2, sy - 2, 4, 4);
        }
        // Outer 4x4 diamond star node at each of the 8 octagram vertices
        const vx = Math.round((rx + ca * (rX + 6)) / 4) * 4;
        const vy = Math.round((ry + sa * (rY + 2)) / 4) * 4;
        this.drawSteppedPixelDiamond4x4(
          ctx,
          vx,
          vy,
          1,
          k % 2 === 0 ? '#38bdf8' : '#c084fc',
          '#ffffff',
          fade * 0.9
        );
      }

      // 4. Drifting 4x4 Pixel Diamond Snowflakes Rising Gently Above the Frost Sigil
      const numFlakes = 7;
      for (let fIdx = 0; fIdx < numFlakes; fIdx++) {
        const fAng = tNow * 0.9 + fIdx * ((Math.PI * 2) / numFlakes);
        const riseU = (z.life * 0.85 + fIdx * 0.19) % 1.0;
        const fx = Math.round((rx + Math.cos(fAng) * (rX * 0.76)) / 4) * 4;
        const fy = Math.round((ry + Math.sin(fAng) * (rY * 0.5) - riseU * 36) / 4) * 4;
        const flakeAlpha = fade * (1.0 - riseU * 0.75);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = flakeAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx - 2, fy - 2, 4, 4);
        ctx.fillStyle = fIdx % 2 === 0 ? '#67e8f9' : '#e879f9';
        ctx.fillRect(fx - 6, fy - 2, 4, 4);
        ctx.fillRect(fx + 2, fy - 2, 4, 4);
        ctx.fillRect(fx - 2, fy - 6, 4, 4);
        ctx.fillRect(fx - 2, fy + 2, 4, 4);
      }

      // 5. Flanking 3-Pass Bloomed Glacial Crystal Spires from Row 2 of icemage_vfx.png
      if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const spireCol = Math.min(20, Math.floor((z.life * 18) % 16) + 5);
        for (const side of [-1, 1]) {
          const ex = Math.round((rx + side * (rX - 12)) / 4) * 4;
          this.drawBloomedVfxCell(ctx, vfxSheet, 2, spireCol, ex, ry - 28, 68, fade * 0.92, renderer, 1.4);
        }
      }
    }

    // 6. Shimmering Figure-Skating Ice-Blade Sparkle Ribbons (Additive 4x4 Pixel Star-Glints)
    ctx.globalCompositeOperation = 'lighter';
    for (const sr of this.skateRibbons) {
      const fade = Math.max(0, 1 - sr.life / sr.maxLife);
      const sx = Math.round(sr.x / 4) * 4;
      const sy = Math.round((sr.y - sr.life * 18) / 4) * 4;
      ctx.globalAlpha = fade * 0.88;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx - 8, sy - 2, 16, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx - 4, sy - 2, 8, 4);
      ctx.fillRect(sx - 2, sy - 6, 4, 12);
    }

    ctx.restore();
  }

  /**
   * Renders 2 Counter-Rotating Bloomed Snowflake-Prism Satellites behind Glacia's shoulders
   * (Matching `Chronomancer.drawOrbitingGears`!)
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
   * Pass 8A: Renders Floating Hexagonal Cryo-Prism Mirrors + Dual-Helix Stepped 4x4 Pixel Refracted Laser Chains
   */
  drawCryoPrismsAndBeams(ctx, renderer = null) {
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Multi-segment Refracted Borealis Laser Chains
    for (const b of this.prismBeams) {
      const fade = Math.max(0, 1 - b.life / b.maxLife);
      if (b.points.length < 2) continue;
      for (let i = 0; i < b.points.length - 1; i++) {
        this.drawSteppedPixelLine4x4(
          ctx,
          b.points[i].x,
          b.points[i].y,
          b.points[i + 1].x,
          b.points[i + 1].y,
          b.color || '#38bdf8',
          '#ffffff',
          fade,
          renderer
        );
      }
      for (let i = 0; i < b.points.length; i++) {
        this.drawSteppedPixelDiamond4x4(
          ctx,
          b.points[i].x,
          b.points[i].y,
          2,
          b.color || '#38bdf8',
          '#a5f3fc',
          fade
        );
      }
    }

    // 2. Active Tri-Beam Prism Matrix Laser Triangle + Bloomed Row 3 Rose-Window Seal
    if (this.triMatrixCage) {
      const mc = this.triMatrixCage;
      const fade = Math.min(1, (mc.maxLife - mc.life) * 3.0);
      const nodes = mc.nodes;
      const beamCol = mc.imploded ? '#e879f9' : '#38bdf8';

      const cx = Math.round(((nodes[0].x + nodes[1].x + nodes[2].x) / 3) / 4) * 4;
      const cy = Math.round(((nodes[0].y + nodes[1].y + nodes[2].y) / 3) / 4) * 4;
      const sealCol = Math.floor(performance.now() * 0.03) % 30;
      this.drawBloomedVfxCell(ctx, vfxSheet, 3, sealCol, cx, cy, 128, fade * 0.92, renderer, 1.8);

      for (let i = 0; i < 3; i++) {
        const n0 = nodes[i];
        const n1 = nodes[(i + 1) % 3];
        this.drawSteppedPixelLine4x4(ctx, n0.x, n0.y, n1.x, n1.y, beamCol, '#ffffff', fade, renderer);
        if (mc.imploded) {
          this.drawSteppedPixelLine4x4(ctx, n0.x, n0.y, cx, cy, '#e879f9', '#ffffff', fade, renderer);
        }
      }
    }

    // 3. Battlefield Floating Hexagonal Cryo-Prism Mirrors (Row 1 of icemage_vfx.png with 3-pass HD-2D bloom!)
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const col = Math.floor(performance.now() * 0.03) % 30;
      for (const p of this.cryoPrisms) {
        const fade = Math.min(1, (p.maxLife - p.life) * 1.5) * Math.min(1, p.life / 0.14);
        this.drawBloomedVfxCell(ctx, vfxSheet, 1, col, p.x, p.y, 104, fade, renderer, 1.85);
      }
    }

    ctx.restore();
  }

  /**
   * Pass 8B: Renders Sculpted Ice-Statue Decoy (Dodge), Refractive Glacial Ice-Wall (Crouch), & Brittle Frost Diamonds
   */
  drawIceConstructsAndBrittle(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().icemage;
    const vfxSheet = sprites?.vfx;

    // 1. Sculpted Ice-Statue Decoy (snapped to 4px grid)
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

    // 2. Refractive Hexagonal Ice-Wall Monolith (Row 2 of icemage_vfx.png with 3-pass HD-2D bloom!)
    if (this.iceWall && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const iw = this.iceWall;
      const fade = Math.min(1, (iw.maxLife - iw.life) * 2.5);
      const col = Math.min(21, Math.floor((iw.life / iw.maxLife) * 22));
      this.drawBloomedVfxCell(ctx, vfxSheet, 2, col, iw.x, iw.y - 68, 160, fade, renderer, 1.9);
    }

    // 3. Render Brittle Frost Diamond Crystals on any chilled enemy (1..3 stacks)
    if (this.game && this.game.fighters) {
      for (const f of this.game.fighters) {
        if (f !== this && !f.isDead && f.brittleStacks >= 1) {
          const count = Math.min(3, Math.floor(f.brittleStacks));
          for (let k = 0; k < count; k++) {
            const ox = (k - 1) * 24;
            const oy = -28 - (k % 2) * 16;
            this.drawSteppedPixelDiamond4x4(
              ctx,
              f.x + ox,
              f.y + oy,
              2,
              k % 2 === 0 ? '#38bdf8' : '#c084fc',
              '#ffffff',
              0.96
            );
          }
        }
      }
    }
  }

  /**
   * Pass 8C: Renders the Colossal Borealis Cathedral Ultimate:
   * - Additive `lighter` Stepped 4x4 Pixel Aurora Borealis (Northern Lights) Sky Curtains (ZERO #0c1226 black bars!)
   * - 3-Pass Bloomed 280x280 12-Point Borealis Snowflake Rose-Window Mandala (Row 3)
   * - 3-Pass Bloomed 312x312 Faceted Cathedral Glacier Monolith (Row 2)
   * - 7 Orbiting Bloomed 104x104 Snowflake-Prism Turrets (Row 1) + Converging Borealis Laser Rays
   * - 3-Pass Bloomed 328x328 Hoarfrost Shatter Starburst (Row 4) at Stage 3 detonation!
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

    // 1. Additive Stepped 4x4 Pixel Aurora Borealis (Northern Lights) Sky Curtains above the Cathedral
    const t = performance.now() * 0.003;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = -8; i <= 8; i++) {
      const rx = cx + i * 24;
      const waveY = Math.round((Math.sin(t + i * 0.55) * 16) / 4) * 4;
      const topY = cy - 340 + waveY;
      const col = i % 3 === 0 ? '#c084fc' : i % 2 === 0 ? '#38bdf8' : '#2dd4bf';

      ctx.globalAlpha = fade * 0.28;
      ctx.fillStyle = col;
      ctx.fillRect(rx - 8, topY - 8, 16, 148);

      ctx.globalAlpha = fade * 0.52;
      ctx.fillRect(rx - 4, topY, 8, 132);

      ctx.globalAlpha = fade * 0.72;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 2, topY + 12, 4, 48);
    }

    // 2. Grand 12-Pointed Borealis Snowflake Rose-Window Mandala suspended behind the Glacier Monolith (Row 3)
    const sealCol = Math.floor(bc.life * 24) % 30;
    this.drawBloomedVfxCell(ctx, vfxSheet, 3, sealCol, cx, cy - 156, 280, fade * 0.94, renderer, 2.0);

    // 3. Colossal Faceted Diamond Iceberg Monolith encasing the enemy (Row 2)
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

    // 4. 7-Prism Orbital Refraction Crown hovering in a grand arch around the Iceberg (Row 1) + Converging Laser Rays
    const prismCol = Math.floor(bc.life * 30) % 30;
    for (let k = 0; k < 7; k++) {
      const ang = -Math.PI * 0.92 + (k / 6) * (Math.PI * 0.84);
      const px = Math.round((cx + Math.cos(ang) * 196) / 4) * 4;
      const py = Math.round((cy - 128 + Math.sin(ang) * 164) / 4) * 4;
      if (bc.life >= 0.35 && !bc.shattered && k % 2 === 0) {
        this.drawSteppedPixelLine4x4(
          ctx,
          px,
          py,
          cx,
          cy - 116,
          k % 4 === 0 ? '#38bdf8' : '#e879f9',
          '#ffffff',
          fade * 0.65,
          renderer
        );
      }
      this.drawBloomedVfxCell(ctx, vfxSheet, 1, prismCol, px, py, 104, fade * 0.96, renderer, 1.6);
    }

    // 5. Absolute Zero Shatter Starburst at Stage 3 detonation (Row 4)
    if (bc.shattered) {
      const novaCol = Math.min(29, Math.floor(((bc.life - 0.98) / 0.52) * 30));
      this.drawBloomedVfxCell(ctx, vfxSheet, 4, novaCol, cx, cy - 136, 328, fade * 0.96, renderer, 2.2);
    }

    ctx.restore();
  }

  /**
   * Pass 15: Pure 4x4 Pixel-Art Expanding Crystalline Snowflake Shockwave Rings
   * Replaces smooth Canvas2D vector shockwaves with stepped 4x4 pixel frost rings + 8 crystalline star spikes + bloomed Row-4 Hoarfrost Starburst!
   */
  drawPixelFrostRings4x4(ctx, renderer = null) {
    if (!this.activeFrostRings.length) return;
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const r of this.activeFrostRings) {
      const u = Math.min(1, r.life / r.maxLife);
      const fade = Math.max(0, 1 - u);
      const rad = r.maxRadius * (0.20 + 0.80 * Math.pow(u, 0.65));
      const rx = Math.round(r.x / 4) * 4;
      const ry = Math.round(r.y / 4) * 4;
      const rX = rad;
      const rY = r.isFloor ? rad * 0.24 : rad;

      if (renderer && renderer.glowGlacial) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.45;
        ctx.drawImage(renderer.glowGlacial, rx - rX * 1.15, ry - rY * 1.15, rX * 2.3, rY * 2.3);
      }

      // If hasSpikes (Shatter Nova), also stamp the 3-pass bloomed Row-4 Hoarfrost Shatter Starburst sprite cell!
      if (r.hasSpikes && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        const col = Math.min(29, Math.floor(u * 30));
        this.drawBloomedVfxCell(ctx, vfxSheet, 4, col, rx, ry, Math.round(r.maxRadius * 1.45), fade * 0.88, renderer, 1.6);
      }

      ctx.globalCompositeOperation = 'lighter';
      const steps = Math.max(24, Math.min(64, Math.round(rad * 0.55)));
      for (let s = 0; s < steps; s++) {
        const ang = (s / steps) * Math.PI * 2;
        const spikeBoost = r.hasSpikes && s % 4 === 0 ? 1.22 : 1.0;
        const px = Math.round((rx + Math.cos(ang) * rX * spikeBoost) / 4) * 4;
        const py = Math.round((ry + Math.sin(ang) * rY * spikeBoost) / 4) * 4;

        ctx.globalAlpha = fade * 0.58;
        ctx.fillStyle = s % 3 === 0 ? '#e879f9' : r.color;
        ctx.fillRect(px - 4, py - 4, 8, 8);

        ctx.globalAlpha = fade * 0.95;
        ctx.fillStyle = s % 2 === 0 ? '#ffffff' : '#a5f3fc';
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    this.drawPermafrostZones(ctx, renderer);
    this.drawIceConstructsAndBrittle(ctx, renderer);
    this.drawCryoPrismsAndBeams(ctx, renderer);
    this.drawPixelFrostRings4x4(ctx, renderer);
  }

  drawUltimateForeground(ctx, renderer = null) {
    this.drawBorealisCathedral(ctx, renderer);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().icemage;
    if (!sprites) return;

    if (!isReflection) {
      this.drawOrbitingCryoPrisms(ctx, renderer);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    ctx.translate(Math.round(this.x), Math.round(this.y));
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
