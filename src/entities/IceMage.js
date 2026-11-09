import { Fighter } from './Fighter.js?v=30fps23';
import { PixelForge } from '../engine/PixelForge.js?v=30fps23';
import { PixelFont } from '../engine/PixelFont.js?v=30fps23';

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
        game.vfx.spawnShockwave(enemy.x, enemy.y - 96, 118, '#67e8f9', 0.30, false, true);
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
    if (game && game.audio) game.audio.play('frost_cast', this.x);
    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 135, 0, false, 'AXEL PRISM VAULT!', '#67e8f9');
      game.vfx.spawnShockwave(this.x, this.groundY, 92, '#67e8f9', 0.30, true);
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

    if (game && game.audio) game.audio.play('frost_cast', wallX);
    if (game && game.vfx) {
      game.vfx.spawnShockwave(wallX, this.groundY - 2, 84, '#67e8f9', 0.28, true);
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

    if (game) {
      if (game.audio) game.audio.play('ice_shatter', d.x);
      if (game.vfx) {
        game.vfx.spawnShockwave(d.x, d.y - 92, 112, '#67e8f9', 0.28, false, true);
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
        if (game && game.vfx) {
          game.vfx.spawnShockwave(this.x, this.groundY, 76, '#67e8f9', 0.25, true);
        }
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
      game.vfx.spawnShockwave(cx, cy, 240, '#67e8f9', 0.44, false, true);
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
   * Renders Shimmering Permafrost Ice-Rink Floor Zones & Figure-Skate Blade Ribbons
   */
  drawPermafrostZones(ctx, renderer = null) {
    if (!this.permafrostZones.length && !this.skateRibbons.length) return;
    ctx.save();

    for (const z of this.permafrostZones) {
      const fade = Math.min(1, (z.maxLife - z.life) * 1.5) * Math.min(1, z.life / 0.15);
      const rx = Math.round(z.x);
      const ry = Math.round(z.y - 3);
      const rad = Math.round(z.radius);

      // Glowing mirror-ice floor strip
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.42;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(rx - rad, ry - 5, rad * 2, 10);

      ctx.globalAlpha = fade * 0.72;
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(rx - Math.round(rad * 0.85), ry - 3, Math.round(rad * 1.7), 6);

      ctx.globalAlpha = fade * 0.90;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(rx - Math.round(rad * 0.6), ry - 1, Math.round(rad * 1.2), 2);

      // Mini crystalline rime spires along the Permafrost edge
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.88;
      for (let k = -4; k <= 4; k++) {
        const sx = rx + k * Math.round(rad * 0.22);
        const sh = (Math.abs(k) % 2 === 0 ? 10 : 15) * fade;
        ctx.fillStyle = k % 2 === 0 ? '#67e8f9' : '#c084fc';
        ctx.beginPath();
        ctx.moveTo(sx - 4, ry);
        ctx.lineTo(sx, ry - sh);
        ctx.lineTo(sx + 4, ry);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Figure-skating frost blade ribbons
    ctx.globalCompositeOperation = 'lighter';
    for (const sr of this.skateRibbons) {
      const fade = Math.max(0, 1 - sr.life / sr.maxLife);
      ctx.globalAlpha = fade * 0.75;
      ctx.fillStyle = '#a5f3fc';
      ctx.fillRect(Math.round(sr.x - 10), Math.round(sr.y - 2), 20, 3);
    }

    ctx.restore();
  }

  /**
   * Renders Floating Hexagonal Cryo-Prism Mirrors on the battlefield + Refracted Borealis Laser Chains
   */
  drawCryoPrismsAndBeams(ctx, renderer = null) {
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Multi-segment Refracted Borealis Laser Chains
    for (const b of this.prismBeams) {
      const fade = Math.max(0, 1 - b.life / b.maxLife);
      if (b.points.length < 2) continue;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Outer aurora glow beam
      ctx.globalAlpha = fade * 0.55;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * 2.2;
      ctx.beginPath();
      ctx.moveTo(b.points[0].x, b.points[0].y);
      for (let i = 1; i < b.points.length; i++) {
        ctx.lineTo(b.points[i].x, b.points[i].y);
      }
      ctx.stroke();

      // Inner diamond-white laser core
      ctx.globalAlpha = fade * 0.95;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, b.width * 0.65);
      ctx.beginPath();
      ctx.moveTo(b.points[0].x, b.points[0].y);
      for (let i = 1; i < b.points.length; i++) {
        ctx.lineTo(b.points[i].x, b.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Active Tri-Beam Prism Matrix Laser Triangle
    if (this.triMatrixCage) {
      const mc = this.triMatrixCage;
      const fade = Math.min(1, (mc.maxLife - mc.life) * 3.0);
      const nodes = mc.nodes;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = mc.imploded ? '#e879f9' : '#67e8f9';
      ctx.lineWidth = 5;
      ctx.globalAlpha = fade * 0.78;
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.lineTo(nodes[1].x, nodes[1].y);
      ctx.lineTo(nodes[2].x, nodes[2].y);
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = fade * 0.95;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Battlefield Floating Hexagonal Cryo-Prism Mirrors (Row 1 of icemage_vfx.png)
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const col = Math.floor(performance.now() * 0.03) % 30;
      for (const p of this.cryoPrisms) {
        const fade = Math.min(1, (p.maxLife - p.life) * 1.5) * Math.min(1, p.life / 0.14);
        const size = Math.round(68 * p.pulse);
        const half = Math.round(-size * 0.5);

        ctx.save();
        ctx.translate(Math.round(p.x), Math.round(p.y));
        if (renderer && renderer.glowGlacial) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.55;
          ctx.drawImage(renderer.glowGlacial, -size * 1.15, -size * 1.15, size * 2.3, size * 2.3);
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.42;
        ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, half - 4, half - 4, size + 8, size + 8);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.96;
        ctx.drawImage(vfxSheet, col * 208, 208, 208, 208, half, half, size, size);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * Renders Sculpted Solid Ice-Statue Decoy (Dodge) & Refractive Glacial Ice-Wall (Crouch) + Enemy Brittle Crystals
   */
  drawIceConstructsAndBrittle(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().icemage;
    const vfxSheet = sprites?.vfx;

    // 1. Sculpted Ice-Statue Decoy
    if (this.iceDecoy && sprites?.sheet && sprites.sheet.complete) {
      const d = this.iceDecoy;
      const fade = Math.min(1, (d.maxLife - d.life) * 3.5);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(d.x), Math.round(d.y));
      ctx.scale(d.facing, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.85;
      PixelForge.drawAfterimageFrame(ctx, sprites, d.frameIdx, 208, 208);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.65;
      PixelForge.drawGhostFrame(ctx, sprites, d.frameIdx, 208, 208);
      ctx.restore();
    }

    // 2. Refractive Hexagonal Ice-Wall Monolith (Row 2 of icemage_vfx.png)
    if (this.iceWall && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const iw = this.iceWall;
      const fade = Math.min(1, (iw.maxLife - iw.life) * 2.5);
      const col = Math.min(22, Math.floor((iw.life / iw.maxLife) * 24));
      const wSize = 148;
      const half = Math.round(-wSize * 0.5);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(iw.x), Math.round(iw.y - wSize * 0.45));
      if (renderer && renderer.glowGlacial) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.52;
        ctx.drawImage(renderer.glowGlacial, -wSize, -wSize, wSize * 2, wSize * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.94;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, half, half, wSize, wSize);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.38;
      ctx.drawImage(vfxSheet, col * 208, 416, 208, 208, half, half, wSize, wSize);
      ctx.restore();
    }

    // 3. Render Brittle Frost Diamond Crystals on any chilled enemy (1..3 stacks)
    if (this.game && this.game.fighters) {
      for (const f of this.game.fighters) {
        if (f !== this && !f.isDead && f.brittleStacks >= 1) {
          const count = Math.min(3, Math.floor(f.brittleStacks));
          ctx.save();
          for (let k = 0; k < count; k++) {
            const ox = (k - 1) * 22;
            const oy = -24 - (k % 2) * 18;
            const cx = Math.round(f.x + ox);
            const cy = Math.round(f.y + oy);
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 16);
            ctx.lineTo(cx + 8, cy);
            ctx.lineTo(cx, cy + 12);
            ctx.lineTo(cx - 8, cy);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#a5f3fc';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 12);
            ctx.lineTo(cx + 4, cy);
            ctx.lineTo(cx, cy + 8);
            ctx.lineTo(cx - 4, cy);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }
  }

  /**
   * Renders the Colossal Borealis Cathedral: Northern Lights Sky Curtain + Faceted Diamond Iceberg + 7-Prism Orbital Array!
   */
  drawBorealisCathedral(ctx, renderer = null) {
    if (!this.borealisCathedral) return;
    const vfxSheet = PixelForge.initAssets().icemage?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const bc = this.borealisCathedral;
    const pop = Math.min(1, bc.life / 0.20);
    const fade = Math.min(1, (bc.maxLife - bc.life) * 3.0);
    const cx = Math.round(bc.x);
    const cy = Math.round(bc.y);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Shimmering Northern Lights (Aurora Borealis) Sky Curtain above the Cathedral
    ctx.globalCompositeOperation = 'lighter';
    const t = performance.now() * 0.003;
    for (let i = -8; i <= 8; i++) {
      const rx = cx + i * 26;
      const waveY = Math.sin(t + i * 0.55) * 18;
      const col = i % 3 === 0 ? '#c084fc' : i % 2 === 0 ? '#67e8f9' : '#2dd4bf';
      ctx.globalAlpha = fade * (0.28 + 0.14 * Math.sin(t * 1.3 + i));
      ctx.fillStyle = col;
      ctx.fillRect(rx - 10, Math.round(cy - 340 + waveY), 20, 155);
    }

    // 2. Sacred Borealis Snowflake Floor Halo
    const sealCol = Math.floor(bc.life * 24) % 30;
    const sealW = Math.round(320 * pop);
    ctx.globalAlpha = fade * 0.72;
    ctx.drawImage(vfxSheet, sealCol * 208, 624, 208, 208, cx - sealW * 0.5, cy - 36, sealW, 72);

    // 3. Colossal Faceted Diamond Iceberg Monolith encasing the enemy (Row 2 of icemage_vfx.png)
    const iceCol = bc.shattered
      ? Math.min(29, 23 + Math.floor(((bc.life - 0.98) / 0.52) * 7))
      : Math.min(22, Math.floor((bc.life / 0.98) * 22));
    const iceW = Math.round(288 * (0.82 + 0.18 * pop));
    const iceH = Math.round(304 * (0.82 + 0.18 * pop));

    if (renderer && renderer.glowGlacial) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.68;
      ctx.drawImage(renderer.glowGlacial, cx - iceW * 0.9, cy - iceH * 1.1, iceW * 1.8, iceH * 1.4);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * (bc.shattered ? 0.78 : 0.94);
    ctx.drawImage(
      vfxSheet,
      iceCol * 208,
      416,
      208,
      208,
      Math.round(cx - iceW * 0.5),
      Math.round(cy - iceH + 16),
      iceW,
      iceH
    );

    // 4. 7-Prism Orbital Refraction Crown hovering in a grand arch around the Iceberg
    const prismCol = Math.floor(bc.life * 30) % 30;
    for (let k = 0; k < 7; k++) {
      const ang = -Math.PI * 0.92 + (k / 6) * (Math.PI * 0.84);
      const px = Math.round(cx + Math.cos(ang) * 195);
      const py = Math.round(cy - 125 + Math.sin(ang) * 165);
      const pSize = 64;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.95;
      ctx.drawImage(vfxSheet, prismCol * 208, 208, 208, 208, px - 32, py - 32, pSize, pSize);
    }

    // 5. Absolute Zero Shatter Starburst at Stage 3 detonation (Row 4 of icemage_vfx.png)
    if (bc.shattered) {
      const novaCol = Math.min(29, Math.floor(((bc.life - 0.98) / 0.52) * 30));
      const novaSize = 340;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.88;
      ctx.drawImage(
        vfxSheet,
        novaCol * 208,
        832,
        208,
        208,
        Math.round(cx - novaSize * 0.5),
        Math.round(cy - 135 - novaSize * 0.5),
        novaSize,
        novaSize
      );
    }

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    this.drawPermafrostZones(ctx, renderer);
    this.drawIceConstructsAndBrittle(ctx, renderer);
    this.drawCryoPrismsAndBeams(ctx, renderer);
  }

  drawUltimateForeground(ctx, renderer = null) {
    this.drawBorealisCathedral(ctx, renderer);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().icemage;
    if (!sprites) return;

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
