import { Fighter } from './Fighter.js';
import { PixelForge } from '../engine/PixelForge.js';

export class Reaper extends Fighter {
  constructor(x, groundY, facing = 1) {
    super({
      name: 'Malakor',
      x,
      groundY,
      facing,
      maxHp: 1249,
      attackRange: 175,
      moveSpeed: 190,
      autoInterval: 1.10,
      lightColor: 'rgba(192, 132, 252, 1)',
      primaryColor: '#c084fc'
    });
    this.heroId = 'reaper';
    this.theme = 'abyssal';
    this.deathSfx = 'death_reaper';
    this.hasPoise = true;
    this.isDeflecting = false;
    this.skillMaxCooldown = 4.90;
    this.skillTriggerRange = 525;
    this.skillName = 'SPECTRAL CHAIN';
    this.ultName = 'GRIM HARVEST';
    this.comboStep = 0;
    this.stepDustTimer = 0;

    // 100% Bespoke Soulreaper Visual Systems (Zero shared Warrior/Priestess/Mage/Archer VFX)
    this.soulWisps = []; // Homing Soul-Skull Orbs ripped from enemy into Malakor
    this.tombstones = []; // Haunted Gothic Gravestones & Skeletal Hands on the arena floor
    this.chainClaw = null; // Segmented Iron Chain + Giant Skeletal Bone Claw grapple
    this.deathAvatar = null; // Towering Hooded Grim Reaper Specter looming behind the execution zone
    this.wraithEchoes = []; // Crimson-Violet Wraith Afterimages left during Phantom Blitz & Wraith Phase

    this.didChainPull = false;
    this.didReapFinisher = false;
    this.ultStage = 0;
    this.dodgeMaxCooldown = 3.22;
    this.dashMaxCooldown = 3.00;
  }

  getEffectiveAttackRange() {
    // Every 3rd swing hurls a Spinning Boomerang Phantom Scythe up to 408px!
    return this.comboStep % 3 === 2 ? 408 : this.attackRange;
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
    this.isDeflecting = true;
    this.isWraithPhase = false;
    this.vx = dir * 512;
    if (game.audio) game.audio.play('scythe_reap', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 6, 'abyssal');
    game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'SHADOW STALK!', '#c084fc');
  }

  onStartDodge(enemy, game, dir) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 0;

    // ★ SIGNATURE REAPER EVASION: "WRAITH PHASE-SHIFT AMBUSH"
    // In close-to-mid range (dist <= 235), Malakor sinks into his Abyssal Shadow Pool and phases
    // directly THROUGH the enemy to emerge 155px behind their back for a lethal backstab!
    if (enemy && !enemy.isDead && dist <= 235) {
      this.isWraithPhase = true;
      this.dashDuration = 0.38;
      this.isDeflecting = true;
      this.phaseStartX = this.x;
      const passDir = Math.sign(enemy.x - this.x) || this.facing;
      let behindX = enemy.x + passDir * 155;
      if (behindX < 105 || behindX > ww - 105) {
        behindX = enemy.x - passDir * 155;
      }
      this.phaseTargetX = Math.max(95, Math.min(ww - 95, behindX));
      this.dashDir = Math.sign(this.phaseTargetX - this.phaseStartX) || passDir;
      this.vx = 0;
      if (game.audio) game.audio.play('soul_drain', this.x);
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 8, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'WRAITH PHASE!', '#e879f9');
      return;
    }

    this.isWraithPhase = false;
    this.dashDuration = 0.40;
    this.isDeflecting = dist > 195;
    const smartDir = enemy && dist > 195 ? this.facing : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 456;
    if (game.audio) game.audio.play('soul_drain', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 7, 'abyssal');
    game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'GRAVE MELD!', '#e879f9');

    // When shadow-melding through long-range projectile or pillar fire, siphon soul mist & hurl a counter Phantom Scythe
    if (enemy && !enemy.isDead && dist > 210) {
      this.leechLife(12, enemy, game, 'GRAVE SIPHON');
      if (Math.random() < 0.68) {
        game.vfx.spawnProjectile({
          x: this.x + this.facing * 52,
          y: this.y - 104,
          vx: this.facing * 622,
          vy: 0,
          radius: 21,
          color: '#c084fc',
          coreColor: '#f43f5e',
          owner: this,
          damage: 42,
          type: 'phantom_scythe'
        });
      }
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if (this.state === 'DODGE' && this.isWraithPhase) {
      const p = Math.min(1, t / this.dashDuration);
      const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
      this.x = this.phaseStartX + (this.phaseTargetX - this.phaseStartX) * ease;
      if (enemy) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (Math.random() < 0.85) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 56,
          y: this.groundY - 6 - Math.random() * 24,
          vx: -this.dashDir * 60,
          vy: -45 - Math.random() * 35,
          size: 5,
          color: Math.random() > 0.45 ? '#c084fc' : '#f43f5e',
          maxLife: 0.28
        });
      }

      if (t >= this.dashDuration) {
        this.isWraithPhase = false;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const speed = this.state === 'DASH' ? 512 : 434;
    this.x += this.dashDir * speed * dt;

    // Bubble dark obsidian-violet shadow particles along the floor pool
    if (Math.random() < 0.82) {
      game.vfx.spawnParticle({
        x: this.x + (Math.random() - 0.5) * 64,
        y: this.groundY - 4 - Math.random() * 18,
        vx: -this.dashDir * 65,
        vy: -45 - Math.random() * 35,
        size: 5,
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
      enemy.takeDamage(43, this, false, 90, -60);
      this.leechLife(13, enemy, game, 'SOUL LEECH');
      if (game.audio) game.audio.play('scythe_reap', enemy.x);
      game.vfx.spawnSlash(this.x + this.facing * 44, this.y - 96, 112, -1.3, 1.2, '#c084fc', 0.28);
    }

    if (t >= this.dashDuration) {
      this.isDeflecting = false;
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

    // Advance Wraith Afterimage Echoes
    for (let i = this.wraithEchoes.length - 1; i >= 0; i--) {
      const ec = this.wraithEchoes[i];
      ec.life += dt;
      if (ec.life >= ec.maxLife) {
        this.wraithEchoes.splice(i, 1);
      }
    }

    if (!this.isDead && (this.state === 'IDLE' || this.state === 'WALK') && this.dodgeCooldown <= 0 && game.vfx) {
      const inPillar = game.vfx.pillars.some(
        (pil) => pil.erupted && pil.owner !== this && Math.abs(pil.x - this.x) < 105
      );
      if (inPillar) {
        this.leechLife(24, enemy, game, 'ABYSSAL SIPHON');
        this.skillCooldown = Math.max(0, this.skillCooldown - 0.95);
        this.startDodge(enemy, game);
        return;
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
            vx: this.facing * 612,
            vy: 0,
            radius: 22,
            color: '#c084fc',
            coreColor: '#f43f5e',
            owner: this,
            damage: 54,
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
          const dmg = mode === 2 ? 79 : mode === 1 ? 69 : 63;
          enemy.takeDamage(dmg, this, isCrit, 85, mode === 2 ? -110 : 0);
          this.leechLife(mode === 2 ? 17 : 12, enemy, game, 'SOUL LEECH');
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
    const t = this.stateTimer;
    const ww = game.renderer.worldWidth;

    if (t < 0.08) {
      this.didChainPull = false;
      this.didReapFinisher = false;
      this.torsoAngle = -this.facing * 0.22;
      this.isDeflecting = enemy ? Math.abs(enemy.x - this.x) > 195 : false;
      this.chainClaw = {
        targetX: enemy ? enemy.x : this.x + this.facing * 320,
        targetY: enemy ? enemy.y - 96 : this.y - 96,
        phase: 'extend'
      };
    } else if (t < 0.44) {
      if (!this.didChainPull) {
        this.didChainPull = true;
        if (game.audio) game.audio.play('chain_hook', this.x);

        const targetX = enemy ? enemy.x : this.x + this.facing * 320;
        const targetY = enemy ? enemy.y - 96 : this.y - 96;
        this.chainClaw = { targetX, targetY, phase: 'drag' };

        game.vfx.spawnGlyphBurst(targetX, targetY, 8, 'abyssal');

        if (enemy && !enemy.isDead) {
          enemy.takeDamage(25, this, !enemy.hasPoise, -180, -40);
          game.vfx.spawnDamageText(enemy.x, enemy.y - 154, 0, false, 'DEATH GRIP!', '#e879f9');
          game.renderer.triggerShake(10, 0.20);
        }
      }

      if (enemy && !enemy.isDead) {
        if (Math.abs(enemy.x - this.x) > 147) {
          this.x += this.facing * 128 * dt;
        }
        const desiredX = Math.max(95, Math.min(ww - 95, this.x + this.facing * 121));
        enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 6.0);
        this.chainClaw = {
          targetX: enemy.x,
          targetY: enemy.y - 96,
          phase: 'drag'
        };
      }
    } else if (!this.didReapFinisher) {
      this.didReapFinisher = true;
      this.isDeflecting = false;
      this.chainClaw = null;
      if (game.audio) game.audio.play('scythe_reap', this.x);
      game.renderer.triggerShake(14, 0.28);
      game.renderer.triggerHitStop(0.06);

      const reapX = this.x + this.facing * 56;
      const startA = this.facing === 1 ? -1.85 : Math.PI - 1.35;
      const endA = this.facing === 1 ? 1.35 : Math.PI + 1.85;
      game.vfx.spawnSlash(reapX, this.y - 98, 142, startA, endA, '#c084fc', 0.34);
      game.vfx.spawnSlash(reapX, this.y - 98, 114, startA, endA, '#f43f5e', 0.28);
      game.vfx.spawnGlyphBurst(reapX, this.y - 98, 9, 'abyssal');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 241) {
        enemy.takeDamage(63, this, true, 115, -135);
        this.leechLife(39, enemy, game, 'SOUL DRAIN');
      }
    } else if (t >= 0.88) {
      this.isDeflecting = false;
      this.chainClaw = null;
      this.setState('IDLE');
    }
  }

  spawnWraithTrail(fromX, fromY, toX, toY, facing, count = 4) {
    const frames = [42, 19, 20, 43];
    for (let i = 0; i < count; i++) {
      const u = i / Math.max(1, count);
      this.wraithEchoes.push({
        x: fromX + (toX - fromX) * u,
        y: fromY + (toY - fromY) * u,
        facing,
        frameIdx: frames[i % frames.length],
        life: 0,
        maxLife: 0.34 + i * 0.05
      });
    }
  }

  updateUltimate(dt, enemy, game) {
    // 100% BESPOKE SOULREAPER ULTIMATE: "GRIM HARVEST — WRAITH CROSS-REAP & AVATAR OF DEATH"
    const t = this.stateTimer;
    const ww = game.renderer.worldWidth;
    const targetX = enemy ? enemy.x : ww * 0.5;
    this.vx = 0;
    this.vy = 0;
    this.isDeflecting = t < 1.48;
    this.isInvulnerable = t < 1.25;

    if (t < 0.04) {
      this.ultStage = 0;
      this.y = this.groundY;
    }

    // STAGE 1 (t >= 0.05s): Boneyard Summoning & Towering Hooded Grim Reaper Death Avatar Behind Enemy
    if (t >= 0.05 && this.ultStage === 0) {
      this.ultStage = 1;
      if (game.audio) game.audio.play('soul_drain', targetX);
      game.renderer.triggerShake(14, 0.26);

      this.spawnTombstoneRow(targetX, game, 5);
      this.deathAvatar = {
        x: targetX,
        facing: this.facing,
        life: 0,
        maxLife: 1.50,
        swingProgress: 0
      };

      game.vfx.spawnDamageText(targetX, this.groundY - 265, 0, false, 'DEATH DOMAIN!', '#c084fc');
      if (enemy && !enemy.isDead) {
        enemy.takeDamage(28, this, false, -30, 0);
        this.leechLife(22, enemy, game, 'GRAVE SIPHON');
      }
    }

    // STAGE 2 (t >= 0.36s): Wraith Phantom Cross-Reap Blitz I — Teleporting Through the Enemy!
    if (t >= 0.36 && this.ultStage === 1) {
      this.ultStage = 2;
      if (game.audio) game.audio.play('scythe_reap', targetX);
      game.renderer.triggerShake(18, 0.30);

      const dir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
      const oldX = this.x;
      const newX = Math.max(115, Math.min(ww - 115, targetX + dir * 135));
      this.spawnWraithTrail(oldX, this.groundY, newX, this.groundY, dir, 4);
      this.x = newX;
      this.y = this.groundY;
      this.facing = -dir;

      const sA = this.facing === 1 ? -1.85 : Math.PI - 1.35;
      const eA = this.facing === 1 ? 1.35 : Math.PI + 1.85;
      game.vfx.spawnSlash(targetX, this.groundY - 102, 168, sA, eA, '#c084fc', 0.36);
      game.vfx.spawnSlash(targetX, this.groundY - 102, 134, sA, eA, '#f43f5e', 0.30);
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 98, 8, 'abyssal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(34, this, true, -dir * 45, -50);
        this.leechLife(24, enemy, game, 'PHANTOM REAP');
      }
    }

    // STAGE 3 (t >= 0.64s): Aerial Blood-Moon Cross-Reap Blitz II — Shadow-Step Above the Prey!
    if (t >= 0.64 && this.ultStage === 2) {
      this.ultStage = 3;
      if (game.audio) game.audio.play('reaper_ult', targetX);
      game.renderer.triggerShake(20, 0.32);

      const dir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
      const oldX = this.x;
      const oldY = this.y;
      const newX = Math.max(115, Math.min(ww - 115, targetX + dir * 115));
      const newY = this.groundY - 86;
      this.spawnWraithTrail(oldX, oldY, newX, newY, dir, 4);
      this.x = newX;
      this.y = newY;
      this.facing = -dir;

      const sA = this.facing === 1 ? -1.95 : Math.PI - 1.45;
      const eA = this.facing === 1 ? 1.45 : Math.PI + 1.95;
      game.vfx.spawnSlash(targetX, this.groundY - 118, 178, sA, eA, '#f43f5e', 0.38);
      game.vfx.spawnSlash(targetX, this.groundY - 118, 142, sA, eA, '#c084fc', 0.32);
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 110, 10, 'abyssal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(36, this, true, -dir * 40, -60);
        this.leechLife(26, enemy, game, 'DEATH TOLL');
      }
    }

    if (this.deathAvatar) {
      this.deathAvatar.x = targetX;
      if (t >= 0.85) {
        this.deathAvatar.swingProgress = Math.min(1, (t - 0.85) / 0.28);
      }
    }

    // Smooth descent from aerial cross-reap into the final Guillotine Slam
    if (t >= 0.88 && t < 1.00) {
      const u = (t - 0.88) / 0.12;
      this.y = this.groundY - 86 * (1 - u);
    } else if (t >= 1.00) {
      this.y = this.groundY;
    }

    // STAGE 4 (t >= 1.00s): Synchronized X-Guillotine Scythe Execution (Malakor + Towering Death Avatar!)
    if (t >= 1.00 && this.ultStage === 3) {
      this.ultStage = 4;
      if (game.audio) game.audio.play('scythe_reap', targetX);

      game.renderer.triggerShake(28, 0.58);
      game.renderer.triggerAberration(16);
      game.renderer.triggerHitStop(0.095);

      // Intersecting Twin X-Guillotine Blood-Moon Scythe Slashes across the prey
      game.vfx.spawnSlash(targetX, this.groundY - 115, 210, -2.1, 1.2, '#c084fc', 0.44);
      game.vfx.spawnSlash(targetX, this.groundY - 115, 195, Math.PI - 1.2, Math.PI + 2.1, '#f43f5e', 0.40);
      game.vfx.spawnShockwave(targetX, this.groundY, 195, '#c084fc', 0.44, true);
      game.vfx.spawnShockwave(targetX, this.groundY - 98, 155, '#f43f5e', 0.38, false, true);

      for (const tb of this.tombstones) {
        tb.shattered = true;
        game.vfx.spawnGlyphBurst(tb.x, this.groundY - 42, 4, 'abyssal');
        game.vfx.spawnBurst(tb.x, this.groundY - 36, 10, '#c084fc', 240, { upBias: 120, size: 6 });
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(106, this, true, this.facing * 165, -230);
        this.leechLife(46, enemy, game, 'GRIM HARVEST');
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 98, 12, 'abyssal');
      }
    }

    if (t >= 1.54) {
      this.y = this.groundY;
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.deathAvatar = null;
      this.setState('IDLE');
    }
  }

  /**
   * Renders the Abyssal Floor Shadow Pool & Grasping Bone Hands when Malakor dodges/dashes
   */
  drawShadowPool(ctx) {
    const px = Math.round(this.x / 4) * 4;
    const py = Math.round(this.groundY / 4) * 4;
    const vfxSheet = PixelForge.initAssets().reaper?.vfx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = 'rgba(88, 28, 135, 0.78)';
    ctx.fillRect(px - 80, py - 8, 160, 16);
    ctx.fillStyle = 'rgba(192, 132, 252, 0.85)';
    ctx.fillRect(px - 68, py - 6, 136, 12);
    ctx.fillStyle = '#090514';
    ctx.fillRect(px - 58, py - 4, 116, 8);

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      ctx.drawImage(vfxSheet, 320, 172, 208, 84, px - 68, py - 48, 136, 56);
    }
    ctx.restore();
  }

  /**
   * Renders Authentic 16-bit HD-2D Haunted Gothic Crypt Tombstones & Grasping Skeletal Hands (from reaper_vfx.png)
   */
  drawTombstones(ctx) {
    if (!this.tombstones.length) return;
    const vfxSheet = PixelForge.initAssets().reaper?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const tb of this.tombstones) {
      if (tb.life <= 0) continue;
      const pop = Math.min(1, tb.life / 0.18);
      const fade = Math.min(1, (tb.maxLife - tb.life) * 3.0);
      const bx = Math.round(tb.x);
      const by = Math.round(tb.groundY);

      ctx.save();
      ctx.globalAlpha = fade;

      ctx.beginPath();
      ctx.rect(bx - 90, by - 180, 180, 188);
      ctx.clip();

      const drawW = 128 + (tb.height - 96) * 0.65;
      const drawH = drawW;
      const riseOffset = Math.round((1 - pop) * (drawH * 0.85));

      if (!tb.shattered) {
        const dx = Math.round(bx - drawW * 0.5);
        const dy = Math.round(by - drawH + 10 + riseOffset);
        const dw = Math.round(drawW);
        const dh = Math.round(drawH);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.28;
        ctx.drawImage(vfxSheet, 320, 56, 208, 208, dx - 6, dy - 6, dw + 12, dh + 12);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.96;
        ctx.drawImage(vfxSheet, 320, 56, 208, 208, dx, dy, dw, dh);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.24;
        ctx.drawImage(vfxSheet, 320, 56, 208, 208, dx, dy, dw, dh);
      } else {
        const dx = Math.round(bx - drawW * 0.5);
        const dy = Math.round(by - drawH * 0.48 + 10);
        const dw = Math.round(drawW);
        const dh = Math.round(drawH * 0.48);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.96;
        ctx.drawImage(vfxSheet, 320, 164, 208, 100, dx, dy, dw, dh);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.22;
        ctx.drawImage(vfxSheet, 320, 164, 208, 100, dx, dy, dw, dh);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders the Taut Dark-Iron Spectral Chain & Authentic 16-bit HD-2D Demonic Skeletal Bone-Gauntlet Claw clamping the enemy
   */
  drawSkeletalChainClaw(ctx) {
    if (!this.chainClaw) return;
    const vfxSheet = PixelForge.initAssets().reaper?.vfx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const x1 = Math.round(this.x + this.facing * 44);
    const y1 = Math.round(this.y - 94);
    const x2 = Math.round(this.chainClaw.targetX);
    const y2 = Math.round(this.chainClaw.targetY);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);

    // 1. Smooth Continuous Violet-Crimson Soul-Fire Catenary Bloom along the chain path (Zero Stepped Squares!)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.42)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let s = 0; s <= 18; s++) {
      const u = s / 18;
      const sag = Math.sin(u * Math.PI) * 14 + Math.sin(u * Math.PI * 3 + this.stateTimer * 28) * 3;
      const px = x1 + dx * u;
      const py = y1 + dy * u + sag;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // 2. Crisp Interlocking Dark-Iron & Amethyst-Rune Chain Links
    const numLinks = Math.max(8, Math.min(22, Math.round(dist / 18)));
    for (let i = 0; i <= numLinks; i++) {
      const u = i / numLinks;
      const sag = Math.sin(u * Math.PI) * 14 + Math.sin(u * Math.PI * 3 + this.stateTimer * 28) * 3;
      const lx = Math.round((x1 + dx * u) / 2) * 2;
      const ly = Math.round((y1 + dy * u + sag) / 2) * 2;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle + (i % 2 === 0 ? 0.18 : -0.18));

      // Outer obsidian iron link shadow
      ctx.fillStyle = '#090514';
      ctx.fillRect(-9, -5, 18, 10);
      // Shaded dark steel & amethyst inner link bevel
      ctx.fillStyle = i % 2 === 0 ? '#64748b' : '#9333ea';
      ctx.fillRect(-7, -3, 14, 6);
      ctx.fillStyle = i % 2 === 0 ? '#cbd5e1' : '#e879f9';
      ctx.fillRect(-5, -3, 10, 2);
      // Hollow link center
      if (i % 2 === 0) {
        ctx.fillStyle = '#090514';
        ctx.fillRect(-3, -1, 6, 2);
      }
      ctx.restore();
    }

    // 3. Chunky-Pixel Glowing Demonic Skeletal Bone-Gauntlet Claw clamping the enemy!
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      const dir = Math.sign(dx) || this.facing;
      const clawSize = 156;
      ctx.save();
      ctx.translate(x2, y2);
      ctx.scale(dir, 1);
      const gripRot = Math.sin(this.stateTimer * 32) * 0.08;
      ctx.rotate(gripRot);
      const cdx = Math.round(-clawSize * 0.56);
      const cdy = Math.round(-clawSize * 0.5);
      // Stepped outer crimson-violet pixel bloom aura
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.28;
      ctx.drawImage(vfxSheet, 528, 56, 208, 208, cdx - 8, cdy - 8, clawSize + 16, clawSize + 16);
      // Main chunky-pixel claw
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.96;
      ctx.drawImage(vfxSheet, 528, 56, 208, 208, cdx, cdy, clawSize, clawSize);
      // Balanced luminous core bloom pass
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.24;
      ctx.drawImage(vfxSheet, 528, 56, 208, 208, cdx, cdy, clawSize, clawSize);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Renders the Colossal 320x320 Chunky-Pixel Glowing Grim Reaper Death Avatar Boss Specter BEHIND the fighters during GRIM HARVEST
   */
  drawDeathAvatar(ctx, renderer = null) {
    if (!this.deathAvatar) return;
    const vfxSheet = PixelForge.initAssets().reaper?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    const da = this.deathAvatar;
    const rise = Math.min(1, da.life / 0.28);
    const fade = Math.min(1, (da.maxLife - da.life) * 3.2);
    const ax = Math.round(da.x ?? this.x + this.facing * 115);
    const ay = Math.round(this.groundY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = fade * 0.98;

    // Clip to floor so the Colossal Death Avatar rises smoothly out of the graveyard floor behind the enemy
    ctx.beginPath();
    ctx.rect(ax - 280, ay - 420, 560, 426);
    ctx.clip();

    const drawSize = 336;
    const riseY = Math.round((1 - rise) * 210);
    const floatBob = Math.round(Math.sin(da.life * 6.5) * 6);

    ctx.translate(ax, ay - drawSize * 0.5 + 14 + riseY + floatBob);
    ctx.scale(da.facing || this.facing, 1);

    // Volumetric Blood-Moon & Abyssal Violet Halo behind the Hooded Death Avatar
    if (renderer && renderer.glowViolet) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.56;
      ctx.drawImage(renderer.glowViolet, -220, -220, 440, 440);
    }

    if (da.swingProgress > 0) {
      const lunge = Math.sin(da.swingProgress * Math.PI);
      ctx.scale(1 + lunge * 0.08, 1 + lunge * 0.08);
    }

    const dHalf = Math.round(-drawSize * 0.5);
    // Stepped outer abyssal pixel bloom aura
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.34;
    ctx.drawImage(vfxSheet, 0, 0, 320, 320, dHalf - 10, dHalf - 10, drawSize + 20, drawSize + 20);

    // Main 320x320 chunky-pixel Grim Reaper Death Avatar sprite
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.94;
    ctx.drawImage(vfxSheet, 0, 0, 320, 320, dHalf, dHalf, drawSize, drawSize);

    // Balanced inner crimson-violet rune bloom pass
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * (0.24 + Math.sin(da.swingProgress * Math.PI) * 0.16);
    ctx.drawImage(vfxSheet, 0, 0, 320, 320, dHalf, dHalf, drawSize, drawSize);

    ctx.restore();
  }

  /**
   * Renders Malakor's Crimson-Violet Wraith Afterimage Silhouettes left behind during Phantom Cross-Reap Blitz
   */
  drawWraithEchoes(ctx) {
    if (!this.wraithEchoes || !this.wraithEchoes.length) return;
    const sprites = PixelForge.initAssets().reaper;
    if (!sprites || !sprites.sheet || !sprites.sheet.complete) return;

    for (const ec of this.wraithEchoes) {
      const fade = Math.max(0, 1 - ec.life / ec.maxLife);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(ec.x), Math.round(ec.y + 6));
      ctx.scale(ec.facing, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.46;
      PixelForge.drawGhostFrame(ctx, sprites, ec.frameIdx, 208, 208);
      ctx.restore();
    }
  }

  /**
   * Renders Ethereal Sinuous Soul-Fire Comets flying from the enemy into Malakor's chest with Radial Light Emission!
   */
  drawSoulWisps(ctx, renderer = null) {
    if (!this.soulWisps.length) return;
    ctx.save();
    const tx = this.x;
    const ty = this.y - 94;
    for (const w of this.soulWisps) {
      if (w.life < 0) continue;
      const u = Math.min(1, w.life / w.maxLife);
      const wx = w.startX + (tx - w.startX) * u;
      const wy = w.startY + (ty - w.startY) * u + Math.sin(u * Math.PI) * w.arcHeight;

      ctx.save();
      // 1. Radial Violet Soul-Light Halo around each Soul-Fire Comet
      const cx = Math.round(wx / 2) * 2;
      const cy = Math.round(wy / 2) * 2;
      if (renderer && renderer.glowViolet) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.52;
        ctx.drawImage(renderer.glowViolet, cx - 38, cy - 38, 76, 76);
      }

      // 2. Saturated soul-fire comet ribbon trail with lighter bloom
      for (let tail = 6; tail >= 1; tail--) {
        const tu = Math.max(0, u - tail * 0.035);
        const tlx = Math.round((w.startX + (tx - w.startX) * tu) / 2) * 2;
        const tly = Math.round(
          (w.startY + (ty - w.startY) * tu + Math.sin(tu * Math.PI) * w.arcHeight) / 2
        ) * 2;
        const sz = Math.max(2, Math.round((7 - tail) * 2));
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = tail % 2 === 0 ? '#a855f7' : '#f43f5e';
        ctx.globalAlpha = ((7 - tail) / 7) * 0.42;
        ctx.fillRect(tlx - sz * 0.8, tly - sz * 0.8, sz * 1.6, sz * 1.6);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = tail % 2 === 0 ? '#7e22ce' : w.color;
        ctx.globalAlpha = ((7 - tail) / 7) * 0.88;
        ctx.fillRect(tlx - sz * 0.5, tly - sz * 0.5, sz, sz);
      }

      // 3. Richly Saturated Soul-Wisp Core + Incandescent Center
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.98;
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(cx - 7, cy - 7, 14, 14);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(cx - 5, cy - 5, 10, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Background skill & Ultimate pass (rendered BEHIND the fighters so the Towering Death Avatar & Tombstones frame the duel!)
   */
  drawForegroundOverlay(ctx, renderer = null) {
    this.drawTombstones(ctx);
    this.drawDeathAvatar(ctx, renderer);
    this.drawWraithEchoes(ctx);
    this.drawSkeletalChainClaw(ctx);
    if (this.state !== 'ULTIMATE' && !this.deathAvatar) {
      this.drawSoulWisps(ctx, renderer);
    }
  }

  /**
   * Foreground Ultimate pass (rendered IN FRONT of all fighters!)
   */
  drawUltimateForeground(ctx, renderer = null) {
    if (this.state === 'ULTIMATE' || this.deathAvatar) {
      this.drawSoulWisps(ctx, renderer);
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = PixelForge.initAssets().reaper;
    if (!sprites) return;

    // Shadow-Grave Submerge Puddle during DODGE or DASH
    const isSubmerged = !isReflection && (this.state === 'DODGE' || this.state === 'DASH');
    if (isSubmerged) {
      this.drawShadowPool(ctx);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);

    // Grounded offset (+6px) so Malakor's armored boots sit firmly in the floor contact shadow, plus rhythmic walk step bob!
    const groundPlantOffset = 6;
    const walkBob =
      !isReflection && this.state === 'WALK'
        ? Math.round(Math.abs(Math.sin(this.walkPhase * 4.0)) * 3)
        : 0;
    const sinkOffset = isSubmerged
      ? Math.round(Math.sin(Math.min(1, this.stateTimer / 0.12) * (Math.PI * 0.5)) * 32)
      : 0;

    ctx.translate(
      Math.round(this.x),
      Math.round(this.y + groundPlantOffset - walkBob + sinkOffset)
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
