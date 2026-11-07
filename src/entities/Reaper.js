import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Reaper extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Malakor',
      x,
      groundY,
      facing,
      maxHp: 1240,
      attackRange: 175,
      moveSpeed: 192,
      autoInterval: 1.08,
      lightColor: 'rgba(192, 132, 252, 1)',
      primaryColor: '#c084fc'
    });
    this.heroId = 'reaper';
    this.theme = 'abyssal';
    this.deathSfx = 'death_reaper';
    this.hasPoise = true;
    this.skillMaxCooldown = 4.9;
    this.skillTriggerRange = 540;
    this.skillName = 'SPECTRAL CHAIN';
    this.ultName = 'GRIM HARVEST';
    this.comboStep = 0;
    this.stepDustTimer = 0;

    // 100% Bespoke Soulreaper Visual Systems (Zero shared Warrior/Priestess/Mage/Archer VFX)
    this.soulWisps = []; // Homing Soul-Skull Orbs ripped from enemy into Malakor
    this.tombstones = []; // Haunted Gothic Gravestones & Skeletal Hands on the arena floor
    this.chainClaw = null; // Segmented Iron Chain + Giant Skeletal Bone Claw grapple
    this.deathAvatar = null; // Towering 270px Hooded Grim Reaper Specter behind Malakor

    this.didChainPull = false;
    this.didReapFinisher = false;
    this.ultStage = 0;
    this.dodgeMaxCooldown = 3.2;
    this.dashMaxCooldown = 3.0;
  }

  getEffectiveAttackRange() {
    // Every 3rd swing hurls a Spinning Boomerang Phantom Scythe up to 395px!
    return this.comboStep % 3 === 2 ? 395 : this.attackRange;
  }

  /**
   * Bespoke Necrotic Soul-Siphon (never uses Seraphina's green/gold cross heals!)
   * Rips homing crimson-violet Soul-Skull Orbs out of the enemy that curve into Malakor's chest.
   */
  leechLife(amount, sourceEntity, game, label = 'SOUL LEECH') {
    if (this.isDead || amount <= 0) return 0;
    const prevHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const actual = Math.max(1, Math.round(amount));

    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, `${label} +${actual}`, '#e879f9');
      game.vfx.spawnGlyphBurst(this.x, this.y - 98, 5, 'abyssal');
    }

    const fromX = sourceEntity ? sourceEntity.x : this.x + this.facing * 120;
    const fromY = sourceEntity ? sourceEntity.y - 96 : this.y - 96;
    const count = Math.min(7, Math.max(3, Math.round(actual / 9)));
    for (let i = 0; i < count; i++) {
      this.soulWisps.push({
        startX: fromX + (Math.random() - 0.5) * 36,
        startY: fromY + (Math.random() - 0.5) * 36,
        arcHeight: -45 - Math.random() * 65 + (i % 2 === 0 ? -25 : 25),
        life: -i * 0.045,
        maxLife: 0.48 + Math.random() * 0.14,
        color: i % 2 === 0 ? '#c084fc' : '#f43f5e'
      });
    }
    return this.hp - prevHp;
  }

  spawnTombstoneRow(centerX, game, count = 7) {
    const ww = game.renderer.worldWidth;
    this.tombstones = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - Math.floor(count / 2)) * 96;
      const tx = Math.max(95, Math.min(ww - 95, centerX + offset));
      this.tombstones.push({
        x: Math.round(tx / 4) * 4,
        groundY: this.groundY,
        width: i % 2 === 0 ? 44 : 36,
        height: i === Math.floor(count / 2) ? 96 : i % 2 === 0 ? 80 : 68,
        life: -Math.abs(i - Math.floor(count / 2)) * 0.04,
        maxLife: 1.55,
        shattered: false,
        seed: i * 1.7
      });
    }
  }

  onStartDash(enemy, game, dir) {
    this.dashDuration = 0.40;
    this.vx = dir * 515;
    if (game.audio) game.audio.play('scythe_reap', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 6, 'abyssal');
    game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'SHADOW STALK!', '#c084fc');
  }

  onStartDodge(enemy, game, dir) {
    this.dashDuration = 0.40;
    const smartDir = enemy && Math.abs(enemy.x - this.x) > 220 ? this.facing : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 445;
    if (game.audio) game.audio.play('soul_drain', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 7, 'abyssal');
    game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'GRAVE MELD!', '#e879f9');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;
    const speed = this.state === 'DASH' ? 515 : 415;
    this.x += this.dashDir * speed * dt;

    // Bubble dark obsidian-violet shadow particles along the floor pool
    if (Math.random() < 0.82) {
      game.vfx.spawnParticle({
        x: this.x + (Math.random() - 0.5) * 64,
        y: this.groundY - 4 - Math.random() * 18,
        vx: -this.dashDir * 65,
        vy: -45 - Math.random() * 35,
        size: 6,
        color: Math.random() > 0.45 ? '#c084fc' : '#4c1d95',
        maxLife: 0.28
      });
    }

    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 156
    ) {
      this.didActionFrame = true;
      enemy.takeDamage(46, this, false, 90, -60);
      this.leechLife(15, enemy, game, 'SOUL LEECH');
      if (game.audio) game.audio.play('scythe_reap', enemy.x);
      game.vfx.spawnSlash(this.x + this.facing * 44, this.y - 96, 112, -1.3, 1.2, '#c084fc', 0.28);
    }

    if (t >= this.dashDuration) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    // Advance Homing Soul-Wisp Orbs
    for (let i = this.soulWisps.length - 1; i >= 0; i--) {
      const w = this.soulWisps[i];
      w.life += dt;
      if (w.life >= w.maxLife) {
        this.soulWisps.splice(i, 1);
      }
    }

    // Advance Haunted Tombstones
    for (let i = this.tombstones.length - 1; i >= 0; i--) {
      const tb = this.tombstones[i];
      tb.life += dt;
      if (tb.life >= tb.maxLife) {
        this.tombstones.splice(i, 1);
      }
    }

    // Advance Giant Grim Reaper Death Avatar
    if (this.deathAvatar) {
      this.deathAvatar.life += dt;
      if (this.deathAvatar.life >= this.deathAvatar.maxLife) {
        this.deathAvatar = null;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.32) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
        game.vfx.spawnBurst(this.x - this.facing * 14, this.groundY - 2, 4, '#c084fc', 65, {
          upBias: 28,
          size: 4,
          life: 0.34,
          additive: true
        });
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.30) {
      this.torsoAngle = -this.facing * 0.24 * (t / 0.30);
      if (Math.random() < 0.58) {
        game.vfx.spawnParticle({
          x: this.x - this.facing * 18 + (Math.random() - 0.5) * 28,
          y: this.y - 106 + (Math.random() - 0.5) * 28,
          vx: this.facing * 48,
          vy: -78,
          size: 5,
          color: mode === 2 ? '#f43f5e' : '#c084fc',
          maxLife: 0.26
        });
      }
    } else if (t < 0.66) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 165;
        this.torsoVel = this.facing * 13;

        const cx = this.x + this.facing * 48;
        const cy = this.y - 98;
        const startA = this.facing === 1 ? -1.75 : Math.PI - 1.05;
        const endA = this.facing === 1 ? 1.15 : Math.PI + 1.75;

        if (mode === 2) {
          // 3rd Strike: Hurls a Spinning Boomerang Twin-Blade Phantom Scythe!
          if (game.audio) game.audio.play('scythe_reap', this.x);
          game.vfx.spawnDamageText(this.x, this.y - 146, 0, false, 'PHANTOM SCYTHE!', '#e879f9');
          game.vfx.spawnProjectile({
            x: this.x + this.facing * 56,
            y: this.y - 104,
            vx: this.facing * 590,
            vy: 0,
            radius: 22,
            color: '#c084fc',
            coreColor: '#f43f5e',
            owner: this,
            damage: 58,
            type: 'phantom_scythe'
          });
        } else {
          if (game.audio) game.audio.play('scythe_reap', this.x);
        }

        game.vfx.spawnSlash(cx, cy, 124, startA, endA, '#9333ea', 0.30);
        game.vfx.spawnSlash(cx, cy, 102, startA, endA, '#c084fc', 0.24);
        game.vfx.spawnGlyphBurst(cx, cy, 5, 'abyssal');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 52) {
          const isCrit = mode === 2 || Math.random() < 0.24;
          const dmg = mode === 2 ? 84 : mode === 1 ? 74 : 68;
          enemy.takeDamage(dmg, this, isCrit, 85, mode === 2 ? -110 : 0);
          this.leechLife(mode === 2 ? 22 : 15, enemy, game, 'SOUL LEECH');
          if (game.audio) game.audio.play(mode === 2 ? 'soul_drain' : 'scythe_reap', enemy.x);
          if (game.renderer) game.renderer.triggerHitStop(0.055);
          game.vfx.spawnBurst(enemy.x, enemy.y - 96, 14, '#c084fc', 235);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 5, 'abyssal');
        }
      }
    } else if (t >= 0.88) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // SIGNATURE SKILL: "SPECTRAL CHAIN" (Skeletal Bone-Claw Grapple -> Executioner's Scythe Guillotine)
    // Zero beams or crystal spikes: throws a physical segmented iron chain & giant skeletal bone claw that clamps onto the enemy,
    // drags them through grasping underworld hands, and finishes with an Executioner's Scythe Guillotine + Soul Leech!
    const t = this.stateTimer;
    const ww = game.renderer.worldWidth;

    if (t < 0.08) {
      this.didChainPull = false;
      this.didReapFinisher = false;
      this.torsoAngle = -this.facing * 0.22;
      this.chainClaw = {
        targetX: enemy ? enemy.x : this.x + this.facing * 320,
        targetY: enemy ? enemy.y - 96 : this.y - 96,
        phase: 'extend'
      };
    } else if (t < 0.52) {
      if (!this.didChainPull) {
        this.didChainPull = true;
        if (game.audio) game.audio.play('chain_hook', this.x);

        const targetX = enemy ? enemy.x : this.x + this.facing * 320;
        const targetY = enemy ? enemy.y - 96 : this.y - 96;
        this.chainClaw = { targetX, targetY, phase: 'drag' };

        game.vfx.spawnGlyphBurst(targetX, targetY, 8, 'abyssal');

        if (enemy && !enemy.isDead) {
          enemy.takeDamage(28, this, false, -180, -40);
          game.vfx.spawnDamageText(enemy.x, enemy.y - 154, 0, false, 'DEATH GRIP!', '#e879f9');
          game.renderer.triggerShake(10, 0.20);
        }
      }

      // Reel the clamped enemy across the floor into Malakor's scythe reach!
      if (enemy && !enemy.isDead) {
        const desiredX = Math.max(95, Math.min(ww - 95, this.x + this.facing * 124));
        enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 4.5);
        this.chainClaw = {
          targetX: enemy.x,
          targetY: enemy.y - 96,
          phase: 'drag'
        };
      }
    } else if (!this.didReapFinisher) {
      this.didReapFinisher = true;
      this.chainClaw = null;
      if (game.audio) game.audio.play('scythe_reap', this.x);
      if (game.audio) game.audio.play('soul_drain', this.x);
      game.renderer.triggerShake(14, 0.28);
      game.renderer.triggerHitStop(0.06);

      const reapX = this.x + this.facing * 56;
      const startA = this.facing === 1 ? -1.85 : Math.PI - 1.35;
      const endA = this.facing === 1 ? 1.35 : Math.PI + 1.85;
      game.vfx.spawnSlash(reapX, this.y - 98, 142, startA, endA, '#c084fc', 0.34);
      game.vfx.spawnSlash(reapX, this.y - 98, 114, startA, endA, '#f43f5e', 0.28);
      game.vfx.spawnGlyphBurst(reapX, this.y - 98, 9, 'abyssal');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 225) {
        enemy.takeDamage(68, this, true, 115, -135);
        this.leechLife(48, enemy, game, 'SOUL DRAIN');
      }
    } else if (t >= 0.96) {
      this.chainClaw = null;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    // 100% BESPOKE SOULREAPER ULTIMATE: "GRIM HARVEST — BONEYARD & AVATAR OF DEATH"
    // Stage 1 (0.00s - 0.50s): Haunted Gothic Tombstones & Grasping Skeletal Hands erupt across the arena floor!
    // Stage 2 (0.50s - 1.00s): A Colossal 270px-Tall Hooded Grim Reaper Specter manifests above the Boneyard, raising a 310px Nether Scythe!
    // Stage 3 (1.00s - 1.55s): The Giant Death Avatar swings its screen-spanning Scythe across the arena, shattering all Tombstones into Homing Soul-Skulls!
    const t = this.stateTimer;
    const ww = game.renderer.worldWidth;
    const targetX = enemy ? enemy.x : ww * 0.5;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY; // Malakor stays grounded in necromantic command (never jumps like Warrior!)

    if (t < 0.04) {
      this.ultStage = 0;
    }

    // STAGE 1 (0.05s): Summon the Haunted Graveyard of 7 Gothic Tombstones & Skeletal Hands
    if (t >= 0.05 && this.ultStage === 0) {
      this.ultStage = 1;
      if (game.audio) game.audio.play('chain_hook', targetX);
      if (game.audio) game.audio.play('soul_drain', this.x);
      game.renderer.triggerShake(14, 0.28);

      const center = (this.x + targetX) * 0.5;
      this.spawnTombstoneRow(center, game, 7);
      this.deathAvatar = {
        life: 0,
        maxLife: 1.48,
        swingProgress: 0
      };

      game.vfx.spawnDamageText(this.x + this.facing * 92, this.groundY - 350, 0, false, 'RISE, BONEYARD!', '#c084fc');
      if (enemy && !enemy.isDead) {
        enemy.takeDamage(34, this, false, -40, 0);
        this.leechLife(28, enemy, game, 'GRAVE SIPHON');
      }
    }

    // STAGE 2 (0.52s): The Towering 270px Grim Reaper Avatar manifests at full height & tolls the Bell of Death
    if (t >= 0.52 && this.ultStage === 1) {
      this.ultStage = 2;
      if (game.audio) game.audio.play('reaper_ult', this.x);
      game.renderer.triggerShake(18, 0.34);
      game.vfx.spawnGlyphBurst(this.x, this.y - 160, 10, 'abyssal');
      game.vfx.spawnDamageText(this.x + this.facing * 92, this.groundY - 365, 0, false, 'AVATAR OF DEATH!', '#f43f5e');

      if (enemy && !enemy.isDead) {
        // Pull enemy toward the center of the Boneyard so the Death Avatar's colossal scythe reaps them
        const pullX = Math.max(120, Math.min(ww - 120, this.x + this.facing * 185));
        enemy.x += (pullX - enemy.x) * 0.55;
        enemy.takeDamage(36, this, true, -60, -50);
        this.leechLife(28, enemy, game, 'DEATH TOLL');
      }
    }

    if (this.deathAvatar && t >= 0.85) {
      this.deathAvatar.swingProgress = Math.min(1, (t - 0.85) / 0.28);
    }

    // STAGE 3 (1.00s): Colossal Grim Reaper Avatar swings its 310px Scythe, shattering all 7 Tombstones into Homing Soul-Skulls!
    if (t >= 1.00 && this.ultStage === 2) {
      this.ultStage = 3;
      if (game.audio) game.audio.play('scythe_reap', targetX);
      if (game.audio) game.audio.play('soul_drain', this.x);

      game.renderer.triggerShake(28, 0.58);
      game.renderer.triggerAberration(16);
      game.renderer.triggerHitStop(0.095);

      for (const tb of this.tombstones) {
        tb.shattered = true;
        game.vfx.spawnGlyphBurst(tb.x, this.groundY - 42, 4, 'abyssal');
        game.vfx.spawnBurst(tb.x, this.groundY - 36, 10, '#c084fc', 240, { upBias: 120, size: 7 });
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(124, this, true, 185, -240);
        this.leechLife(54, enemy, game, 'GRIM HARVEST');
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 98, 12, 'abyssal');
      }
    }

    if (t >= 1.54) {
      this.deathAvatar = null;
      this.setState('IDLE');
    }
  }

  /**
   * Renders the Abyssal Floor Shadow Pool & Grasping Shadow Hands when Malakor dodges/dashes
   */
  drawShadowPool(ctx) {
    const px = Math.round(this.x / 4) * 4;
    const py = Math.round(this.groundY / 4) * 4;
    const t = this.stateTimer;
    ctx.save();
    // Outer violet-crimson rim & inner obsidian void pool on the floor
    ctx.fillStyle = '#7e22ce';
    ctx.fillRect(px - 76, py - 10, 152, 16);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(px - 68, py - 8, 136, 12);
    ctx.fillStyle = '#090514';
    ctx.fillRect(px - 60, py - 6, 120, 10);

    // 4 Grasping Skeletal Shadow Hands reaching out of the shadow puddle
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const hx = px + i * 26;
      const reach = 14 + Math.round(Math.sin(t * 28 + i * 1.9) * 8);
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(hx - 4, py - reach, 8, reach);
      ctx.fillStyle = '#e879f9';
      ctx.fillRect(hx - 6, py - reach - 4, 4, 6);
      ctx.fillRect(hx + 2, py - reach - 4, 4, 6);
    }
    ctx.restore();
  }

  /**
   * Renders Haunted Gothic Gravestones (Weathered Stone Tombstones with Gothic Cross Finials, Skull Emblems & Grasping Bone Hands)
   */
  drawTombstones(ctx) {
    if (!this.tombstones.length) return;
    ctx.save();
    for (const tb of this.tombstones) {
      if (tb.life <= 0) continue;
      const pop = Math.min(1, tb.life / 0.14);
      const fade = Math.min(1, (tb.maxLife - tb.life) * 3.0);
      const bx = tb.x;
      const by = Math.round(tb.groundY / 4) * 4;
      const h = Math.round((tb.height * pop) / 4) * 4;
      const w = tb.width;

      ctx.globalAlpha = fade;

      // Dark grave soil mound & necrotic mist at base of tombstone
      ctx.fillStyle = '#090514';
      ctx.fillRect(bx - w * 0.75, by - 6, w * 1.5, 10);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.55)';
      ctx.fillRect(bx - w * 0.65, by - 4, w * 1.3, 6);

      if (!tb.shattered) {
        // Gothic Cross Finial atop the gravestone
        const topY = by - h;
        ctx.fillStyle = '#090514';
        ctx.fillRect(bx - 6, topY - 26, 12, 26);
        ctx.fillRect(bx - 14, topY - 20, 28, 10);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(bx - 4, topY - 24, 8, 24);
        ctx.fillRect(bx - 12, topY - 18, 24, 6);

        // Stepped Weathered Dark-Slate Gravestone Slab
        ctx.fillStyle = '#090514';
        ctx.fillRect(bx - w * 0.5 - 4, topY, w + 8, h);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx - w * 0.5, topY + 4, w, h - 4);
        ctx.fillStyle = '#334155';
        ctx.fillRect(bx - w * 0.5 + 4, topY + 8, w - 8, h - 12);
        // Stone highlight bevel
        ctx.fillStyle = '#64748b';
        ctx.fillRect(bx - w * 0.5 + 2, topY + 4, w - 4, 4);

        // Glowing Crimson-Amethyst Skull Emblem carved into the Tombstone
        const sy = topY + 24;
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(bx - 8, sy - 8, 16, 12);
        ctx.fillRect(bx - 4, sy + 4, 8, 4);
        ctx.fillStyle = '#090514';
        ctx.fillRect(bx - 6, sy - 4, 4, 4);
        ctx.fillRect(bx + 2, sy - 4, 4, 4);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(bx - 5, sy - 3, 2, 2);
        ctx.fillRect(bx + 3, sy - 3, 2, 2);

        // Carved Epitaph Rune Lines below the skull
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(bx - 10, sy + 14, 20, 4);
        ctx.fillRect(bx - 6, sy + 22, 12, 4);
      }

      // Grasping Bone Hands clawing out of the grave soil in front of each tombstone
      const handWave = Math.round(Math.sin(tb.life * 18 + tb.seed) * 6);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(bx - 14, by - 18 + handWave, 4, 18 - handWave);
      ctx.fillRect(bx - 18, by - 22 + handWave, 12, 4);
      ctx.fillRect(bx + 10, by - 16 - handWave, 4, 16 + handWave);
      ctx.fillRect(bx + 6, by - 20 - handWave, 12, 4);
    }
    ctx.restore();
  }

  /**
   * Renders the Segmented Iron Chain & Giant Crimson-Bone Skeletal Claw clamping over the enemy during SPECTRAL CHAIN
   */
  drawSkeletalChainClaw(ctx) {
    if (!this.chainClaw) return;
    ctx.save();
    const x1 = Math.round(this.x + this.facing * 44);
    const y1 = Math.round(this.y - 98);
    const x2 = Math.round(this.chainClaw.targetX);
    const y2 = Math.round(this.chainClaw.targetY);
    const dir = Math.sign(x2 - x1) || this.facing;

    // 1. Alternating Horizontal & Vertical Iron Chain Links with Abyssal Outline
    const links = 16;
    for (let i = 0; i <= links; i++) {
      const u = i / links;
      const sag = Math.sin(u * Math.PI) * 16;
      const lx = Math.round((x1 + (x2 - x1) * u) / 4) * 4;
      const ly = Math.round((y1 + (y2 - y1) * u + sag) / 4) * 4;

      ctx.fillStyle = '#090514';
      if (i % 2 === 0) {
        ctx.fillRect(lx - 10, ly - 6, 20, 12);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(lx - 8, ly - 4, 16, 8);
        ctx.fillStyle = '#090514';
        ctx.fillRect(lx - 4, ly - 2, 8, 4);
      } else {
        ctx.fillRect(lx - 6, ly - 8, 12, 16);
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(lx - 4, ly - 6, 8, 12);
      }
    }

    // 2. Giant Pixel-Art Skeletal Bone-Claw & Underworld Jaws clamping the target!
    ctx.translate(x2, y2);
    ctx.scale(dir, 1);
    // Obsidian Wrist Cuff & Crimson Soul Gem
    ctx.fillStyle = '#090514';
    ctx.fillRect(-26, -18, 22, 36);
    ctx.fillStyle = '#7e22ce';
    ctx.fillRect(-22, -14, 14, 28);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-18, -6, 8, 12);
    // 4 Giant Articulated Bone Fingers clamping around the enemy's torso
    const fingerOffsets = [-28, -10, 10, 28];
    for (const fy of fingerOffsets) {
      const curve = fy < 0 ? 8 : -8;
      ctx.fillStyle = '#090514';
      ctx.fillRect(-6, fy - 6, 36, 12);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-4, fy - 4, 24, 8);
      // Hooked crimson-violet bone talons at tip
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(20, fy - 4 + curve * 0.5, 12, 8);
    }
    ctx.restore();
  }

  /**
   * Renders the Towering 270px Hooded Grim Reaper Death Avatar above the Boneyard during GRIM HARVEST
   */
  drawDeathAvatar(ctx) {
    if (!this.deathAvatar) return;
    const da = this.deathAvatar;
    const rise = Math.min(1, da.life / 0.30);
    const fade = Math.min(1, (da.maxLife - da.life) * 3.2);
    // Positioned forward over the Boneyard & higher so the Death Avatar's Skull & Scythe are 100% clear of the overhead plaque
    const ax = Math.round((this.x + this.facing * 92) / 4) * 4;
    const ay = Math.round((this.groundY - 156 * rise) / 4) * 4;

    ctx.save();
    ctx.translate(ax, ay);
    ctx.scale(this.facing, 1);
    ctx.globalAlpha = fade * 0.92;

    // 1. Towering Tattered Abyssal Shroud & Exposed Necrotic Ribcage Torso
    ctx.fillStyle = '#090514';
    ctx.fillRect(-60, -116, 120, 172);
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(-52, -108, 104, 156);
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(-40, -96, 80, 128);

    // Glowing Bone-White & Violet Ribcage Bars + Spine
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-4, -76, 8, 72);
    for (let r = 0; r < 4; r++) {
      const ry = -70 + r * 18;
      const rw = 58 - r * 6;
      ctx.fillStyle = '#090514';
      ctx.fillRect(-rw * 0.5 - 2, ry - 2, rw + 4, 10);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-rw * 0.5, ry, rw, 6);
      ctx.fillStyle = '#090514';
      ctx.fillRect(-6, ry, 12, 6);
    }

    // 2. Colossal Horned Reaper Hood & Skull Face with Blazing Crimson Eyes
    ctx.fillStyle = '#090514';
    ctx.fillRect(-48, -176, 96, 72);
    // Twin Curved Obsidian Horns on the Death Avatar's Hood
    ctx.fillRect(-64, -188, 20, 16);
    ctx.fillRect(44, -188, 20, 16);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(-60, -184, 12, 8);
    ctx.fillRect(48, -184, 12, 8);

    ctx.fillStyle = '#3b0764';
    ctx.fillRect(-42, -170, 84, 60);
    // Deep pitch-black hood void
    ctx.fillStyle = '#090514';
    ctx.fillRect(-30, -156, 60, 46);
    // Pixel Skull Cranium & Jaw Teeth inside Hood
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-22, -150, 44, 26);
    ctx.fillRect(-14, -124, 28, 10);
    ctx.fillStyle = '#090514';
    ctx.fillRect(-8, -122, 4, 8);
    ctx.fillRect(0, -122, 4, 8);
    ctx.fillRect(8, -122, 4, 8);
    // Blazing Crimson-White Eye Sockets
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-16, -142, 12, 10);
    ctx.fillRect(4, -142, 12, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-12, -140, 4, 4);
    ctx.fillRect(8, -140, 4, 4);

    // 3. Colossal 310px-Wide Netherworld Executioner Scythe (Swings down at Stage 3!)
    const swingA = -0.78 + da.swingProgress * 2.15;
    ctx.save();
    ctx.translate(18, -102);
    ctx.rotate(swingA);

    // Long Obsidian Polearm Shaft
    ctx.fillStyle = '#090514';
    ctx.fillRect(-24, -148, 14, 232);
    ctx.fillStyle = '#9333ea';
    ctx.fillRect(-20, -144, 6, 224);

    // Enormous Stepped Crescent Reaper Blade at top of shaft
    for (let s = 0; s <= 18; s++) {
      const u = s / 18;
      const bx = Math.round((-16 + u * 176) / 4) * 4;
      const by = Math.round((-144 + u * u * 100) / 4) * 4;
      const thick = Math.max(8, Math.round(((1 - u * 0.65) * 38) / 4) * 4);
      ctx.fillStyle = '#090514';
      ctx.fillRect(bx - 4, by - 4, 16, thick + 8);
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(bx, by, 12, thick);
      ctx.fillStyle = s % 2 === 0 ? '#c084fc' : '#f43f5e';
      ctx.fillRect(bx + 2, by + thick * 0.45, 10, thick * 0.45);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 4, by + thick - 4, 8, 4);
    }
    ctx.restore();

    ctx.restore();
  }

  /**
   * Renders Homing Soul-Wisp Skull Orbs flying from the enemy into Malakor's chest
   */
  drawSoulWisps(ctx) {
    if (!this.soulWisps.length) return;
    ctx.save();
    const tx = this.x;
    const ty = this.y - 98;
    for (const w of this.soulWisps) {
      if (w.life < 0) continue;
      const u = Math.min(1, w.life / w.maxLife);
      const wx = Math.round((w.startX + (tx - w.startX) * u) / 4) * 4;
      const wy = Math.round(
        (w.startY + (ty - w.startY) * u + Math.sin(u * Math.PI) * w.arcHeight) / 4
      ) * 4;

      // Trailing Wisp Tail
      for (let tail = 1; tail <= 3; tail++) {
        const tu = Math.max(0, u - tail * 0.06);
        const tlx = Math.round((w.startX + (tx - w.startX) * tu) / 4) * 4;
        const tly = Math.round(
          (w.startY + (ty - w.startY) * tu + Math.sin(tu * Math.PI) * w.arcHeight) / 4
        ) * 4;
        ctx.fillStyle = w.color;
        ctx.globalAlpha = (1 - tail * 0.25) * 0.75;
        ctx.fillRect(tlx - 4, tly - 4, 8, 8);
      }

      // Soul-Skull Wisp Head
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#090514';
      ctx.fillRect(wx - 8, wy - 8, 16, 16);
      ctx.fillStyle = w.color;
      ctx.fillRect(wx - 6, wy - 6, 12, 10);
      ctx.fillRect(wx - 4, wy + 4, 8, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx - 4, wy - 3, 3, 3);
      ctx.fillRect(wx + 1, wy - 3, 3, 3);
    }
    ctx.restore();
  }

  /**
   * Foreground pass called by Renderer after all fighters are drawn so Chain-Claw & Soul-Wisps render over the target
   */
  drawForegroundOverlay(ctx) {
    this.drawSkeletalChainClaw(ctx);
    this.drawSoulWisps(ctx);
  }

  draw(ctx, isReflection = false) {
    const sprites = PixelForge.initAssets().reaper;
    if (!sprites) return;

    // 1. World-Space Haunted Tombstones and Towering Death Avatar behind Malakor
    if (!isReflection) {
      this.drawTombstones(ctx);
      this.drawDeathAvatar(ctx);
    }

    // 2. Shadow-Grave Submerge Puddle during DODGE or DASH
    const isSubmerged = !isReflection && (this.state === 'DODGE' || this.state === 'DASH');
    if (isSubmerged) {
      this.drawShadowPool(ctx);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    // When submerged in the Shadow Pool during Dodge/Dash, sink 32px into the floor shadow!
    const sinkOffset = isSubmerged ? Math.round(Math.sin(Math.min(1, this.stateTimer / 0.12) * (Math.PI * 0.5)) * 32) : 0;

    ctx.translate(Math.round(this.x), Math.round(this.y + sinkOffset));
    ctx.scale(this.facing, 1);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
