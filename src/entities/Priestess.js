import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Priestess extends Fighter {
  constructor(x, groundY, facing = -1) {
    super({
      name: 'Seraphina',
      x,
      groundY,
      facing,
      maxHp: 1236,
      attackRange: 512,
      moveSpeed: 128,
      autoInterval: 1.29,
      lightColor: 'rgba(253, 224, 71, 1)',
      primaryColor: '#fde047'
    });
    this.heroId = 'priestess';
    this.theme = 'radiant';
    this.deathSfx = 'death_priestess';
    this.skillMaxCooldown = 5.1;
    this.ultName = 'SERAPHIC APOTHEOSIS';
    this.skillName = 'DIVINE SANCTUARY';
    this.haloPhase = 0;
    this.shotCombo = 0;
    this.dodgeMaxCooldown = 3.55;
    this.dashMaxCooldown = 3.55;
    this.wallWingCooldown = 0;
    this.isFlipVault = false;
    this.isAngelicAscent = false;
    this.ascentStartX = x;
    this.ascentTargetX = x;
    this.didSanctuaryHeal = false;
    this.didUltMiracle = false;
    this.ultChakramStep = 0;
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer.worldWidth;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 999;
    const retreatX = this.x - this.facing * 190;
    const pinnedLeft = (this.x < 215 || retreatX < 100) && (!enemy || enemy.x > this.x - 30);
    const pinnedRight = (this.x > ww - 215 || retreatX > ww - 100) && (!enemy || enemy.x < this.x + 30);
    const corneredAtWall = dist < 275 && (pinnedLeft || pinnedRight);

    // SERAPHIC WING FLIGHT: When cornered against a wall, Seraphina unfurls 6 golden angel wings
    // and flies high across the cathedral over the enemy to the opposite side of the arena!
    if (enemy && corneredAtWall && this.wallWingCooldown <= 0) {
      this.isAngelicAscent = true;
      this.isFlipVault = true;
      this.wallWingCooldown = 8.6;
      this.dashDuration = 0.54;
      this.ascentStartX = this.x;

      // Fly over the enemy to the open side of the arena
      const crossDir = this.x < ww * 0.5 ? 1 : -1;
      const desiredX = enemy.x + crossDir * 250;
      this.ascentTargetX = Math.max(215, Math.min(ww - 215, desiredX));
      this.dashDir = Math.sign(this.ascentTargetX - this.ascentStartX) || 1;
      this.vx = 0;
      this.vy = 0;

      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(25, 'WINGS OF GRACE');
      game.vfx.spawnShockwave(this.x, this.groundY, 125, '#fde047', 0.36, true);
      game.vfx.spawnBurst(this.x, this.y - 95, 20, '#fef9c3', 240, { upBias: 120 });
      game.vfx.spawnGlyphBurst(this.x, this.y - 105, 9, 'radiant');
      game.vfx.spawnDamageText(this.x, this.y - 152, 0, false, 'SERAPHIC WING FLIGHT!', '#fef08a');
      return;
    }

    this.isAngelicAscent = false;
    this.isFlipVault = false;
    this.dashDuration = 0.38;
    this.vx = dir * 355;
    if (game.audio) game.audio.play('holy_heal', this.x);
    this.heal(24, 'AEGIS');
    game.vfx.spawnShockwave(this.x, this.y - 95, 92, '#fde047', 0.3, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 100, 7, 'heal');
    game.vfx.spawnDamageText(this.x, this.y - 145, 0, false, 'AEGIS SANCTUARY!', '#4ade80');
  }

  onStartDash(enemy, game, dir) {
    this.isAngelicAscent = false;
    this.isFlipVault = false;
    this.dashDuration = 0.36;
    this.vx = dir * 360;
    if (game.audio) game.audio.play('holy_bolt', this.x);
    game.vfx.spawnShockwave(this.x, this.y - 95, 76, '#fde047', 0.26, false, true);
    game.vfx.spawnGlyphBurst(this.x, this.y - 95, 5, 'radiant');
    game.vfx.spawnDamageText(this.x, this.y - 140, 0, false, 'RADIANT GLIDE!', '#fef08a');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if (this.isAngelicAscent) {
      const p = Math.min(1, t / this.dashDuration);
      const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
      this.x = this.ascentStartX + (this.ascentTargetX - this.ascentStartX) * ease;
      this.y = this.groundY - Math.sin(p * Math.PI) * 180;
      if (enemy) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      // Golden feather & healing cross trail while flying across the sky
      if (Math.random() < 0.85) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 44,
          y: this.y - 95 + (Math.random() - 0.5) * 32,
          vx: -this.dashDir * 65 + (Math.random() - 0.5) * 40,
          vy: 35 + Math.random() * 45,
          size: 6,
          color: Math.random() > 0.35 ? '#fde047' : '#ffffff',
          maxLife: 0.36
        });
      }

      // At the apex of her winged flight over the enemy, Seraphina calls down an Aerial Star-Cross Smite Ray!
      if (p >= 0.45 && !this.didActionFrame && enemy && !enemy.isDead) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('holy_bolt', this.x);
        const sx = this.x;
        const sy = this.y - 102;
        game.vfx.spawnBeam({
          x1: sx,
          y1: sy,
          x2: enemy.x,
          y2: enemy.y - 96,
          width: 22,
          color: '#fde047',
          coreColor: '#ffffff',
          maxLife: 0.30
        });
        enemy.takeDamage(23, this, false, 30, 0);
        game.vfx.spawnShockwave(sx, sy, 68, '#fde047', 0.24, false, false);
        game.vfx.spawnGlyphBurst(sx, sy, 5, 'radiant');
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isAngelicAscent = false;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        game.vfx.spawnShockwave(this.x, this.groundY, 96, '#fde047', 0.28, true);
        this.setState('IDLE');
      }
      return;
    }

    this.x += this.dashDir * 335 * dt;

    if (Math.random() < 0.72) {
      game.vfx.spawnParticle({
        x: this.x - this.dashDir * 16,
        y: this.y - 90 + (Math.random() - 0.5) * 36,
        vx: -this.dashDir * 70,
        vy: -40 - Math.random() * 35,
        size: 6,
        color: Math.random() > 0.45 ? '#fde047' : '#4ade80',
        maxLife: 0.3
      });
    }

    if (t >= this.dashDuration) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.haloPhase += dt * 2.8;
    this.wallWingCooldown = Math.max(0, this.wallWingCooldown - dt);

    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      const ww = game.renderer.worldWidth;
      const nearWall = this.x < 215 || this.x > ww - 215;
      const incomingProj =
        game.vfx &&
        game.vfx.projectiles.some((p) => p.owner === enemy && Math.abs(p.x - this.x) < 135);
      if ((dist < 185 || (nearWall && dist < 245) || incomingProj) && this.dodgeCooldown <= 0) {
        this.startDodge(enemy, game);
        return;
      }
      if (dist < 185) {
        this.x -= this.facing * this.moveSpeed * 0.55 * dt;
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.32) {
      this.torsoAngle = -this.facing * 0.15 * (t / 0.32);
      if (Math.random() < 0.55) {
        const a = t * 20;
        game.vfx.spawnParticle({
          x: this.x + this.facing * 44 + Math.cos(a) * 20,
          y: this.y - 114 + Math.sin(a) * 20,
          vx: -Math.cos(a) * 42,
          vy: -Math.sin(a) * 42,
          size: 5,
          color: '#fef9c3',
          maxLife: 0.24
        });
      }
    } else if (t < 0.68) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.shotCombo++;
        this.vx -= this.facing * 45;
        this.torsoVel = -this.facing * 7;
        if (game.audio) game.audio.play('holy_bolt', this.x);

        const spawnX = this.x + this.facing * 50;
        const spawnY = this.y - 114;
        const targetY = enemy ? enemy.y - 110 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 460;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 648;
        const isGraceCast = this.shotCombo % 3 === 0;

        // Primary Luminous Star-Cross Bolt
        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 15,
          color: '#fde047',
          coreColor: '#ffffff',
          owner: this,
          damage: isGraceCast ? 64 : 74,
          type: 'holy_light',
          isMeteor: false
        });

        // Every 3rd cast: "GRACE OF DAWN!" — fires a second Holy Lance AND mends Seraphina's wounds!
        if (isGraceCast) {
          this.heal(25, 'DAWN GRACE');
          game.vfx.spawnProjectile({
            x: spawnX - this.facing * 14,
            y: spawnY - 14,
            vx: (dx / dist) * (speed * 0.95),
            vy: (dy / dist) * (speed * 0.95) - 18,
            radius: 13,
            color: '#facc15',
            coreColor: '#fef9c3',
            owner: this,
            damage: 38,
            type: 'holy_light',
            isMeteor: false
          });
        }

        game.vfx.spawnShockwave(spawnX, spawnY, 54, '#fde047', 0.22, false, true);
        game.vfx.spawnBurst(spawnX, spawnY, 12, '#fef9c3', 175);
        game.vfx.spawnGlyphBurst(spawnX, spawnY, 4, 'radiant');
      }
    } else if (t >= 0.88) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // SIGNATURE PRIESTESS SKILL: "DIVINE SANCTUARY" (Cathedral Barrier Dome + Crisscrossing Sanctum Judgment Rays)
    // Phase 1 (0.14s): Erects a Golden Pixel-Art Cathedral Dome & Rose-Mandala around Seraphina (+88 HP Heal)
    // Phase 2 (0.38s): Twin Diagonal Crisscrossing Cathedral Sanctum Beams + Scepter Grace Ray + Luminous Star-Cross Lance!
    const t = this.stateTimer;

    if (t < 0.14) {
      this.didSanctuaryHeal = false;
    } else if (t >= 0.14 && !this.didSanctuaryHeal) {
      this.didSanctuaryHeal = true;
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(91, 'SANCTUARY');
      game.vfx.spawnShockwave(this.x, this.groundY, 155, '#4ade80', 0.42, true);
      game.vfx.spawnShockwave(this.x, this.y - 95, 120, '#fde047', 0.38);
      game.vfx.spawnGlyphBurst(this.x, this.y - 105, 9, 'heal');
    }

    if (t >= 0.38 && !this.didActionFrame && enemy) {
      this.didActionFrame = true;
      this.vx -= this.facing * 50;
      if (game.audio) game.audio.play('holy_smite', enemy.x);

      const sx = this.x + this.facing * 52;
      const sy = this.y - 118;
      const dx = enemy.x - sx;
      const dy = (enemy.y - 108) - sy;
      const dist = Math.hypot(dx, dy) || 1;
      const horizDist = Math.abs(enemy.x - this.x);

      // 1. Twin Diagonal Crisscrossing Cathedral Sanctum Rays converging on the enemy
      game.vfx.spawnBeam({
        x1: enemy.x - 145,
        y1: -120,
        x2: enemy.x + 35,
        y2: this.groundY - 8,
        width: 44,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.48
      });
      game.vfx.spawnBeam({
        x1: enemy.x + 145,
        y1: -120,
        x2: enemy.x - 35,
        y2: this.groundY - 8,
        width: 44,
        color: '#facc15',
        coreColor: '#ffffff',
        maxLife: 0.48
      });

      // 2. Instant Prismatic Scepter-to-Target Grace Ray
      game.vfx.spawnBeam({
        x1: sx,
        y1: sy,
        x2: enemy.x,
        y2: enemy.y - 98,
        width: 32,
        color: '#fef08a',
        coreColor: '#ffffff',
        maxLife: 0.42
      });

      // 3. Erupt a Radiant Sanctum Pillar of Light on the Enemy!
      game.vfx.spawnFlamePillar(enemy.x, this.groundY, this, null, {
        theme: 'radiant',
        delay: 0.02,
        maxLife: 0.68,
        scaleWidth: 0.85
      });

      if (!enemy.isDead) {
        const beamDmg = horizDist >= 260 ? (enemy.maxHp > 1320 ? 92 : enemy.moveSpeed <= 122 ? 112 : 98) : 84;
        enemy.takeDamage(beamDmg, this, false, 60, -45);
      }

      // 4. Follow-up Luminous Star-Cross Lance
      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        vx: (dx / dist) * 645,
        vy: (dy / dist) * 645,
        radius: 16,
        color: '#fde047',
        coreColor: '#ffffff',
        owner: this,
        damage: 46,
        type: 'holy_light',
        isMeteor: false
      });

      game.vfx.spawnShockwave(enemy.x, this.groundY, 165, '#fde047', 0.42, true);
      game.vfx.spawnShockwave(sx, sy, 104, '#fef08a', 0.36, false, true);
      game.vfx.spawnBurst(enemy.x, enemy.y - 95, 22, '#fef08a', 260, { upBias: 110, size: 7 });
      game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 95, 10, 'radiant');
    } else if (t >= 0.96) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // 3-STAGE WINGED ARCHANGEL ULTIMATE: "SERAPHIC APOTHEOSIS"
    // Stage 1 (0.00s - 0.48s): Unfurls 6 Golden Seraphim Wings + Sacred Halo Mandala & levitates 118px into the air (+132 HP Miracle Heal)
    // Stage 2 (0.48s - 0.90s): 4 Orbiting Halo Cross-Star Chakrams fire Diagonal Golden Lance Beams downward from her airborne halo!
    // Stage 3 (0.94s - 1.52s): Twin Crisscrossing Diagonal Heaven's Judgment X-Beams form a Giant Sacred Cross of Light on the enemy!
    const t = this.stateTimer;
    const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.5;
    this.isFlipVault = true;
    this.vx = 0;
    this.vy = 0;

    if (t < 0.08) {
      this.didUltMiracle = false;
      this.ultChakramStep = 0;
    }

    // Smooth Archangel Levitation Curve (ascends 118px into the air with 6 flapping Seraphim wings, then glides back down)
    let lift = 0;
    if (t < 0.38) {
      lift = Math.sin((t / 0.38) * (Math.PI * 0.5)) * 118;
    } else if (t < 1.18) {
      lift = 118 + Math.sin((t - 0.38) * 8) * 6;
    } else {
      lift = Math.max(0, Math.cos(((t - 1.18) / 0.34) * (Math.PI * 0.5)) * 118);
    }
    this.y = this.groundY - lift;

    // Stage 1: Miracle Benediction Self-Heal + Golden Sanctuary Rings while ascending on Seraphim wings
    if (t >= 0.16 && !this.didUltMiracle) {
      this.didUltMiracle = true;
      if (game.audio) game.audio.play('holy_heal', this.x);
      this.heal(132, 'MIRACLE');
      game.vfx.spawnShockwave(this.x, this.groundY, 195, '#4ade80', 0.5, true);
      game.vfx.spawnShockwave(this.x, this.y - 105, 160, '#fde047', 0.46);
      game.vfx.spawnGlyphBurst(this.x, this.y - 115, 12, 'heal');
    }

    // Stage 2 (0.44s - 0.80s): 4 Orbiting Halo Star-Cross Chakrams fire Diagonal Golden Lance Beams downward!
    const volleyTimes = [0.44, 0.56, 0.68, 0.80];
    if (
      this.ultChakramStep < volleyTimes.length &&
      t >= volleyTimes[this.ultChakramStep] &&
      enemy &&
      !enemy.isDead
    ) {
      const step = this.ultChakramStep;
      this.ultChakramStep++;
      if (game.audio) game.audio.play('holy_bolt', this.x);

      const haloX = this.x + Math.cos(step * 1.57) * 58;
      const haloY = this.y - 118 + Math.sin(step * 1.57) * 34;
      const aimX = enemy.x + (step - 1.5) * 42;
      const aimY = this.groundY - 12;

      game.vfx.spawnBeam({
        x1: haloX,
        y1: haloY,
        x2: aimX,
        y2: aimY,
        width: 30,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.42
      });
      game.vfx.spawnShockwave(aimX, this.groundY, 92, '#fde047', 0.32, true);
      game.vfx.spawnShockwave(haloX, haloY, 64, '#fef08a', 0.26);
      game.vfx.spawnBurst(aimX, this.groundY - 24, 10, '#fef08a', 195, { upBias: 90, size: 6 });
      game.vfx.spawnGlyphBurst(aimX, this.groundY - 45, 5, 'radiant');
      const chakramDmg = Math.abs(enemy.x - this.x) >= 210 ? 22 : 18;
      enemy.takeDamage(chakramDmg, this, false, 28, 0);
    }

    // Stage 3 (0.94s): Twin Diagonal Crisscrossing Heaven's Judgment X-Beams (Giant Sacred Cross of Light!)
    if (t >= 0.94 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game.audio) game.audio.play('priestess_ult', targetX);

      game.renderer.triggerShake(24, 0.58);
      game.renderer.triggerAberration(14);
      game.renderer.triggerHitStop(0.085);

      // Diagonal Heaven Beam 1 (Top-Left to Bottom-Right across the enemy)
      game.vfx.spawnBeam({
        x1: targetX - 240,
        y1: -140,
        x2: targetX + 65,
        y2: this.groundY - 8,
        width: 74,
        color: '#fde047',
        coreColor: '#ffffff',
        maxLife: 0.78
      });

      // Diagonal Heaven Beam 2 (Top-Right to Bottom-Left across the enemy, forming an X-Cross of Light!)
      game.vfx.spawnBeam({
        x1: targetX + 240,
        y1: -140,
        x2: targetX - 65,
        y2: this.groundY - 8,
        width: 74,
        color: '#facc15',
        coreColor: '#ffffff',
        maxLife: 0.78
      });

      // Scepter-to-Enemy Direct Golden Judgement Ray
      game.vfx.spawnBeam({
        x1: this.x + this.facing * 44,
        y1: this.y - 115,
        x2: targetX,
        y2: this.groundY - 95,
        width: 48,
        color: '#fef08a',
        coreColor: '#ffffff',
        maxLife: 0.68
      });

      // Twin Radiant Cathedral Pillars of Heaven's Light flanking the enemy!
      game.vfx.spawnFlamePillar(targetX, this.groundY, this, null, {
        theme: 'radiant',
        delay: 0.02,
        maxLife: 0.82,
        scaleWidth: 1.15,
        isUltimate: true
      });

      for (let r = 0; r < 4; r++) {
        game.vfx.spawnShockwave(
          targetX,
          this.groundY - 95,
          95 + r * 45,
          r % 2 === 0 ? '#fde047' : '#fef08a',
          0.48,
          false
        );
      }

      game.vfx.spawnShockwave(targetX, this.groundY, 270, '#fde047', 0.55, true);
      game.vfx.spawnShockwave(targetX, this.groundY, 190, '#4ade80', 0.48, true);
      game.vfx.spawnBurst(targetX, this.groundY - 60, 36, '#fef08a', 340, { upBias: 150, size: 8 });
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 90, 14, 'radiant');
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 90, 8, 'heal');

      if (enemy && !enemy.isDead) {
        const ultDmg = Math.abs(enemy.x - this.x) >= 210 ? 128 : 112;
        enemy.takeDamage(ultDmg, this, true, 150, -210);
      }
    } else if (t >= 1.52) {
      this.y = this.groundY;
      this.isFlipVault = false;
      this.setState('IDLE');
    }
  }

  drawSeraphimVFX(ctx, sprites, isReflection, renderer = null) {
    if (isReflection) return;
    const showWings =
      this.isAngelicAscent || this.state === 'ULTIMATE' || this.state === 'SKILL';
    if (!showWings) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const p = 4; // 4px crisp pixel grid
    const snap = (v) => Math.round(v / p) * p;
    const isFullArchangel = this.isAngelicAscent || this.state === 'ULTIMATE';
    const cx = -4;
    const cy = -124;
    const vfxSheet = sprites && sprites.vfx;

    // 0. Large Radiant Celestial Gold + Emerald-Grace Radial Light Halos behind Seraphina so her skills visibly illuminate the arena!
    if (renderer && renderer.glowGold) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bigR = isFullArchangel ? 265 : 205;
      ctx.globalAlpha = isFullArchangel ? 0.46 : 0.38;
      ctx.drawImage(renderer.glowGold, cx - bigR, cy - bigR, bigR * 2, bigR * 2);
      if (renderer.glowEmerald) {
        const graceR = isFullArchangel ? 190 : 150;
        ctx.globalAlpha = 0.26;
        ctx.drawImage(renderer.glowEmerald, cx - graceR, cy - graceR, graceR * 2, graceR * 2);
      }
      ctx.restore();
    }

    // Helper to draw luminous chunky-pixel VFX sprite with rich Celestial Gold HD-2D bloom & radial light halo
    const drawGlowingVfxCell = (sx, sy, sw, sh, dx, dy, dw, dh, alpha) => {
      const auraW = Math.round((dw * 1.16) / 4) * 4;
      const auraH = Math.round((dh * 1.16) / 4) * 4;
      const midX = dx + dw * 0.5;
      const midY = dy + dh * 0.5;
      if (renderer && renderer.glowGold) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, alpha * 0.34);
        const gR = Math.max(dw, dh) * 0.82;
        ctx.drawImage(renderer.glowGold, midX - gR, midY - gR, gR * 2, gR * 2);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.32);
      ctx.drawImage(vfxSheet, sx, sy, sw, sh, Math.round(midX - auraW * 0.5), Math.round(midY - auraH * 0.5), auraW, auraH);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, alpha * 0.98);
      ctx.drawImage(vfxSheet, sx, sy, sw, sh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.18);
      ctx.drawImage(vfxSheet, sx, sy, sw, sh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    };

    // 1. Chunky-Pixel Glowing Sacred Golden Cathedral Stained-Glass Rose Halo behind the wings
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
      const haloSize = isFullArchangel ? 284 : 232;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.haloPhase * 0.65);
      drawGlowingVfxCell(
        0,
        0,
        320,
        320,
        -haloSize * 0.5,
        -haloSize * 0.5,
        haloSize,
        haloSize,
        isFullArchangel ? 0.98 : 0.92
      );
      ctx.restore();
    }

    // 2. Authentic 4-Frame HD-2D Pixel-Art Feathered Seraphim Angel Wings (320x232 per cell) with Golden Bloom!
    const wingSheet = sprites && sprites.wings;
    if (wingSheet && wingSheet.complete && wingSheet.naturalWidth > 0) {
      const cellW = 320;
      const cellH = 232;
      const wingFrame = Math.floor(this.stateTimer * 2.2) % 4;
      let recoilX = 0;
      let recoilY = 0;
      if (!this.isDead && this.hurtTimer > 0) {
        recoilX = -6 + Math.round((Math.sin(this.hurtTimer * 60) * 4) / 2) * 2;
        recoilY = -2;
      }
      const dx = Math.round(-cellW * 0.5 + recoilX);
      const dy = Math.round(-208 - 26 + recoilY);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.24;
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx - 4, dy - 4, cellW + 8, cellH + 8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, cellW, cellH);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.14;
      ctx.drawImage(wingSheet, wingFrame * cellW, 0, cellW, cellH, dx, dy, cellW, cellH);
    }

    // 3. Twin Flanking Chunky-Pixel Glowing Valkyrie Winged Spears during DIVINE SANCTUARY (SKILL)
    if (this.state === 'SKILL' && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth > 0) {
      const spearSz = 132;
      const bob = Math.round(Math.sin(this.stateTimer * 10) * 6);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * 96, -118 + bob);
        drawGlowingVfxCell(320, 56, 208, 208, -spearSz * 0.5, -spearSz * 0.5, spearSz, spearSz, 0.98);
        ctx.restore();
      }
    }

    // 4. Subtle Dark Silhouette Separation Cushion right behind Seraphina's head & torso
    // so her Cathedral Halo & Wings blaze brightly around her without ever washing out her face!
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    const cushionGrad = ctx.createRadialGradient(0, -118, 14, 0, -118, 72);
    cushionGrad.addColorStop(0, 'rgba(6, 4, 15, 0.68)');
    cushionGrad.addColorStop(0.65, 'rgba(6, 4, 15, 0.42)');
    cushionGrad.addColorStop(1, 'rgba(6, 4, 15, 0)');
    ctx.fillStyle = cushionGrad;
    ctx.fillRect(-74, -192, 148, 148);

    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = PixelForge.initAssets().priestess;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    this.drawSeraphimVFX(ctx, sprites, false, renderer);
    ctx.restore();
  }

  drawUltimateForeground(ctx, renderer = null) {
    if (this.state !== 'ULTIMATE') return;
    const sprites = PixelForge.initAssets().priestess;
    const vfxSheet = sprites && sprites.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    const orbitR = 136;
    const starSz = 68;
    for (let i = 0; i < 6; i++) {
      const a = -this.haloPhase * 2.5 + (i * Math.PI * 2) / 6;
      const ox = Math.round((-4 + Math.cos(a) * orbitR) / 4) * 4;
      const oy = Math.round((-124 + Math.sin(a) * orbitR) / 4) * 4;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(this.haloPhase * 3);
      if (renderer && renderer.glowGold) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42;
        ctx.drawImage(renderer.glowGold, -starSz * 0.9, -starSz * 0.9, starSz * 1.8, starSz * 1.8);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34;
      ctx.drawImage(vfxSheet, 528, 56, 208, 208, -starSz * 0.5 - 6, -starSz * 0.5 - 6, starSz + 12, starSz + 12);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.98;
      ctx.drawImage(vfxSheet, 528, 56, 208, 208, -starSz * 0.5, -starSz * 0.5, starSz, starSz);
      ctx.restore();
    }
    ctx.restore();
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().priestess;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const scaleDir = this.facing;

    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(scaleDir, 1);

    if (isReflection) {
      this.drawSeraphimVFX(ctx, sprites, true, renderer);
    }

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.haloPhase, isReflection, renderer);

    ctx.restore();
  }
}
