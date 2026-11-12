import { Fighter } from './Fighter.js?v=30fps81';
import { PixelForge } from '../engine/PixelForge.js?v=30fps81';

/**
 * HD-2D 30fps Arcade Adventure Monster Archetypes (`ghoul`, `cultist`, `brute`)
 * and 3-Phase Final Boss (`ArchfiendBoss` — Malphas, Archfiend of the Black Pit).
 *
 * Uses native 7-row x 30-col (`208x208` cell, `6240x1456`) 30fps pixel-art sprite sheets
 * with ZERO `ctx.rotate(...)` or canvas shearing so every silhouette stays 100% crisp.
 */
const MONSTER_ARCHETYPES = {
  ghoul: {
    heroId: 'ghoul',
    name: 'ASHFANG GHOUL',
    eliteName: 'DIRE ASHFANG ALPHA',
    theme: 'abyssal',
    primaryColor: '#ef4444',
    secondaryColor: '#f97316',
    maxHp: 460,
    eliteHp: 740,
    moveSpeed: 214,
    attackRange: 118,
    autoInterval: 1.18,
    autoDuration: 0.62,
    skillMaxCooldown: 4.8,
    skillDuration: 0.74,
    dashMaxCooldown: 4.4,
    dashDuration: 0.42,
    spriteScale: 0.98,
    eliteScale: 1.10,
    scoreValue: 250,
    deathSfx: 'scythe_reap'
  },
  cultist: {
    heroId: 'cultist',
    name: 'VOID CULTIST',
    eliteName: 'ARCH-HERETIC WARLOCK',
    theme: 'abyssal',
    primaryColor: '#a855f7',
    secondaryColor: '#38bdf8',
    maxHp: 390,
    eliteHp: 650,
    moveSpeed: 152,
    attackRange: 455,
    autoInterval: 1.65,
    autoDuration: 0.72,
    skillMaxCooldown: 6.2,
    skillDuration: 0.92,
    dashMaxCooldown: 5.0,
    dashDuration: 0.44,
    spriteScale: 1.0,
    eliteScale: 1.10,
    scoreValue: 350,
    deathSfx: 'chrono_hit'
  },
  brute: {
    heroId: 'brute',
    name: 'OBSIDIAN JUGGERNAUT',
    eliteName: 'HELLFORGED EXECUTIONER',
    theme: 'forge',
    primaryColor: '#f59e0b',
    secondaryColor: '#dc2626',
    maxHp: 940,
    eliteHp: 1380,
    moveSpeed: 128,
    attackRange: 146,
    autoInterval: 1.72,
    autoDuration: 0.84,
    skillMaxCooldown: 5.8,
    skillDuration: 0.96,
    dashMaxCooldown: 5.4,
    dashDuration: 0.62,
    spriteScale: 1.20,
    eliteScale: 1.30,
    scoreValue: 550,
    deathSfx: 'thunder_slam'
  }
};

export class Monster extends Fighter {
  constructor(kind, x, groundY, facing = -1, opts = {}) {
    const cfg = MONSTER_ARCHETYPES[kind] || MONSTER_ARCHETYPES.ghoul;
    const isElite = Boolean(opts.isElite);
    super({
      name: isElite ? cfg.eliteName : cfg.name,
      heroId: cfg.heroId,
      x,
      groundY,
      facing,
      theme: cfg.theme,
      primaryColor: cfg.primaryColor,
      secondaryColor: cfg.secondaryColor,
      maxHp: opts.maxHp || (isElite ? cfg.eliteHp : cfg.maxHp),
      moveSpeed: cfg.moveSpeed * (isElite ? 1.08 : 1.0),
      attackRange: cfg.attackRange,
      autoInterval: cfg.autoInterval * (isElite ? 0.90 : 1.0),
      skillMaxCooldown: cfg.skillMaxCooldown * (isElite ? 0.88 : 1.0),
      skillName:
        kind === 'cultist'
          ? 'VOID SIGIL'
          : kind === 'brute'
            ? 'SEISMIC CLEAVE'
            : 'FERAL POUNCE',
      ultName: 'ABYSSAL SURGE',
      deathSfx: cfg.deathSfx
    });

    this.kind = kind;
    this.isMonster = true;
    this.isElite = isElite;
    this.isBoss = false;
    this.hasTrueUltimate = false;
    this.team = 2;
    this.dmgScale = (isElite ? 1.22 : 1.0) * (opts.dmgScale || 1.0);
    this.spriteScale = opts.spriteScale || (isElite ? cfg.eliteScale : cfg.spriteScale);
    this.scoreValue = Math.round(cfg.scoreValue * (isElite ? 1.75 : 1.0));

    this.autoDuration = cfg.autoDuration;
    this.skillDuration = cfg.skillDuration;
    this.dashDuration = cfg.dashDuration;
    this.dashMaxCooldown = cfg.dashMaxCooldown;

    this.autoCooldown = 0.45 + Math.random() * 0.55;
    this.skillCooldown = 1.6 + Math.random() * 1.4;
    this.dashCooldown = 1.2 + Math.random() * 1.2;

    this.hasPoise = kind === 'brute' || isElite;
    this.telegraphLabel = '';
    this.telegraphTimer = 0;
    this.telegraphRings = [];
    this.didActionFrame = false;
    this.didSecondaryAction = false;
    this.dashStartX = x;
    this.dashTargetX = x;
    this.bruteAltSkill = 0;
  }

  setState(next) {
    // Monsters use 7-row sheets (Rows 0..6); map any crouch/jump/victory fallbacks safely
    if (next === 'CROUCH' || next === 'JUMP') {
      next = 'DASH';
    } else if (next === 'VICTORY') {
      next = 'IDLE';
    }
    super.setState(next);
    this.didActionFrame = false;
    this.didSecondaryAction = false;
  }

  spawnFloorTelegraph(x, radius, delay, damage, color = '#a855f7', label = 'VOID SIGIL!') {
    this.telegraphRings.push({
      x,
      y: this.groundY,
      radius,
      timer: 0,
      maxTimer: delay,
      damage,
      color,
      label
    });
  }

  updateTelegraphRings(dt, game) {
    if (!this.telegraphRings.length) return;
    for (let i = this.telegraphRings.length - 1; i >= 0; i--) {
      const ring = this.telegraphRings[i];
      ring.timer += dt;
      if (ring.timer >= ring.maxTimer) {
        this.telegraphRings.splice(i, 1);
        if (this.isDead) continue;
        if (game?.audio) game.audio.play('flame_pillar', ring.x);
        if (game?.renderer) game.renderer.triggerShake(7, 0.16);
        if (game?.vfx) {
          game.vfx.spawnShockwave(ring.x, ring.y - 6, ring.radius * 1.35, ring.color, 0.34, true);
          game.vfx.spawnBurst(ring.x, ring.y - 18, 18, ring.color, 250, { upBias: 155, size: 6 });
          game.vfx.spawnGlyphBurst(ring.x, ring.y - 42, 6, this.theme === 'forge' ? 'forge' : 'abyssal');
        }
        const enemies = game?.getEnemiesOf ? game.getEnemiesOf(this) : [];
        for (const target of enemies) {
          if (
            target &&
            !target.isDead &&
            !target.isBenched &&
            Math.abs(target.x - ring.x) <= ring.radius &&
            Math.abs(target.y - ring.y) <= 58
          ) {
            target.takeDamage(Math.round(ring.damage * this.dmgScale), this, false, 130, -140);
          }
        }
      }
    }
  }

  update(dt, enemy, game) {
    this.updateTelegraphRings(dt, game);
    if (this.telegraphTimer > 0) {
      this.telegraphTimer = Math.max(0, this.telegraphTimer - dt);
      if (this.telegraphTimer <= 0) this.telegraphLabel = '';
    }
    if (this.forgeArmorTimer > 0) {
      this.forgeArmorTimer = Math.max(0, this.forgeArmorTimer - dt);
    }

    // Physics, death, cooldowns, stun/root handled cleanly if we run custom monster AI before state dispatch
    if (this.isDead) {
      this.telegraphRings.length = 0;
      super.update(dt, enemy, game);
      return;
    }

    // Monster pack spacing so multiple ghouls/cultists don't stack on the exact same pixel
    if (game?.fighters && (this.state === 'IDLE' || this.state === 'WALK')) {
      for (const other of game.fighters) {
        if (other && other !== this && other.team === this.team && !other.isDead) {
          const dx = this.x - other.x;
          const absDx = Math.abs(dx);
          const minAllySep = this.isBoss || other.isBoss ? 120 : 72;
          if (absDx < minAllySep) {
            const push = absDx < 2 ? (this.x % 2 === 0 ? 1 : -1) : Math.sign(dx);
            this.x += push * (minAllySep - absDx) * 3.8 * dt;
          }
        }
      }
    }

    // Run bespoke Monster AI when in neutral IDLE / WALK, bypassing Champion Overdrive/TrueUlt AI
    if (
      (this.state === 'IDLE' || this.state === 'WALK') &&
      !(this.stunTimer > 0) &&
      !this.isRooted &&
      enemy &&
      !enemy.isDead
    ) {
      this.runMonsterNeutralAI(dt, enemy, game);
      // Pass null enemy to super.update ONLY if still in IDLE/WALK so super.update won't overwrite monster spacing with champion AI
      if (this.state === 'IDLE' || this.state === 'WALK') {
        const savedState = this.state;
        const savedMoveDir = this.moveDir;
        const savedFacing = enemy.x >= this.x ? 1 : -1;
        super.update(dt, null, game);
        if (!this.isDead && !(this.stunTimer > 0) && !this.isRooted) {
          this.facing = savedFacing;
          this.state = savedState;
          this.moveDir = savedMoveDir;
        }
        return;
      }
    }

    super.update(dt, enemy, game);
  }

  runMonsterNeutralAI(dt, enemy, game) {
    const dist = Math.abs(enemy.x - this.x);
    this.facing = enemy.x >= this.x ? 1 : -1;

    if (this.kind === 'cultist') {
      // Ranged Warlock spacing: maintain 270..440px, retreat or Void-Step if crowded
      if (dist < 175 && this.dashCooldown <= 0) {
        this.startMonsterDash(enemy, game, -this.facing, 210);
        return;
      }
      if (this.skillCooldown <= 0 && dist <= 560) {
        this.skillCooldown = this.skillMaxCooldown;
        this.telegraphLabel = '★ VOID SIGIL! ★';
        this.telegraphTimer = 0.78;
        this.setState('SKILL');
        return;
      }
      if (dist <= this.attackRange && dist >= 185 && this.autoCooldown <= 0) {
        this.autoCooldown = this.autoInterval;
        this.setState('AUTO_ATTACK');
        return;
      }
      if (dist < 235) {
        this.state = 'WALK';
        this.moveDir = -1;
        this.walkPhase += dt * 4.2;
        this.x -= this.facing * this.moveSpeed * 0.85 * dt;
        this.headBob = Math.sin(this.walkPhase * 2) * 1.8;
      } else if (dist > 410) {
        this.state = 'WALK';
        this.moveDir = 1;
        this.walkPhase += dt * 4.2;
        this.x += this.facing * this.moveSpeed * dt;
        this.headBob = Math.sin(this.walkPhase * 2) * 1.8;
      } else {
        this.state = 'IDLE';
        this.moveDir = 0;
      }
      return;
    }

    if (this.kind === 'brute') {
      // Heavy Armored Juggernaut: Bull-Charge from mid-range or Seismic Slam / Cleaver Chop
      if (this.dashCooldown <= 0 && dist > 205 && dist < 520) {
        this.telegraphLabel = '! BULL CHARGE !';
        this.telegraphTimer = 0.62;
        this.forgeArmorTimer = 0.65;
        this.startMonsterDash(enemy, game, this.facing, Math.min(330, dist - 55));
        return;
      }
      if (this.skillCooldown <= 0 && dist <= 380) {
        this.skillCooldown = this.skillMaxCooldown;
        this.forgeArmorTimer = 0.72;
        this.telegraphLabel = '! SEISMIC SLAM !';
        this.telegraphTimer = 0.65;
        this.setState('SKILL');
        return;
      }
      if (dist <= this.attackRange && this.autoCooldown <= 0) {
        this.autoCooldown = this.autoInterval;
        this.setState('AUTO_ATTACK');
        return;
      }
      if (dist > 122) {
        this.state = 'WALK';
        this.moveDir = 1;
        this.walkPhase += dt * 3.4;
        this.x += this.facing * this.moveSpeed * dt;
        this.headBob = Math.abs(Math.sin(this.walkPhase * 2)) * 2.8;
      } else {
        this.state = 'IDLE';
        this.moveDir = 0;
      }
      return;
    }

    // Default (`ghoul` — Ashfang Rusher): aggressive pack stalker + Feral Pounce
    if (this.skillCooldown <= 0 && dist >= 130 && dist <= 310) {
      this.skillCooldown = this.skillMaxCooldown;
      this.telegraphLabel = '! POUNCE !';
      this.telegraphTimer = 0.52;
      this.setState('SKILL');
      return;
    }
    if (this.dashCooldown <= 0 && dist > 265) {
      this.startMonsterDash(enemy, game, this.facing, 195);
      return;
    }
    if (dist <= this.attackRange && this.autoCooldown <= 0) {
      this.autoCooldown = this.autoInterval;
      this.setState('AUTO_ATTACK');
      return;
    }
    if (dist > 102) {
      this.state = 'WALK';
      this.moveDir = 1;
      this.walkPhase += dt * 5.6;
      this.x += this.facing * this.moveSpeed * dt;
      this.headBob = Math.sin(this.walkPhase * 2) * 2.4;
    } else {
      this.state = 'IDLE';
      this.moveDir = 0;
    }
  }

  startMonsterDash(_enemy, game, dir, distance = 200) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const minX = game?.adventure?.lockActive ? game.adventure.lockMinX + 24 : 95;
    const maxX = game?.adventure?.lockActive ? game.adventure.lockMaxX - 24 : ww - 95;
    this.dashCooldown = this.dashMaxCooldown;
    this.dashDir = dir || this.facing;
    this.dashStartX = this.x;
    this.dashTargetX = Math.max(minX, Math.min(maxX, this.x + this.dashDir * distance));
    this.setState('DASH');
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
  }

  updateDashOrDodge(_dt, enemy, game) {
    const dur = this.dashDuration || 0.45;
    const t = this.stateTimer;
    const u = Math.min(1, t / dur);

    if (this.kind === 'brute') {
      // Brief 0.20s stomp windup before unstoppable Bull-Charge!
      if (t < 0.20) {
        this.vx = 0;
        return;
      }
      const chargeU = Math.min(1, (t - 0.20) / Math.max(0.15, dur - 0.20));
      this.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * chargeU;
      if (!this.didActionFrame && enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 115) {
        this.didActionFrame = true;
        enemy.takeDamage(Math.round(56 * this.dmgScale), this, true, 240, -165);
        if (game?.renderer) game.renderer.triggerShake(11, 0.22);
        if (game?.vfx) {
          game.vfx.spawnShockwave(this.x + this.facing * 36, this.y - 68, 95, '#f59e0b', 0.28, true);
        }
      }
    } else {
      const ease = 1 - Math.pow(1 - u, 2);
      this.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * ease;
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  updateAutoAttack(_dt, enemy, game) {
    const t = this.stateTimer;
    const hitTime = this.kind === 'brute' ? 0.38 : this.kind === 'cultist' ? 0.34 : 0.26;

    if (t >= hitTime && !this.didActionFrame) {
      this.didActionFrame = true;
      if (this.kind === 'cultist') {
        const sx = this.x + this.facing * 44;
        const sy = this.y - 98;
        const tx = enemy ? enemy.x : sx + this.facing * 380;
        const ty = enemy ? enemy.y - 96 : sy;
        const dx = tx - sx;
        const dy = ty - sy;
        const len = Math.hypot(dx, dy) || 1;
        const spd = 435;
        if (game?.audio) game.audio.play('skill_cast', sx);
        game?.vfx?.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / len) * spd,
          vy: (dy / len) * spd,
          radius: 14,
          color: '#a855f7',
          coreColor: '#f3e8ff',
          damage: Math.round(34 * this.dmgScale),
          owner: this,
          type: 'phantom_scythe'
        });
      } else if (this.kind === 'brute') {
        if (game?.audio) game.audio.play('heavy_cleave', this.x);
        if (game?.renderer) game.renderer.triggerShake(9, 0.18);
        const fAng = this.facing === 1 ? 0 : Math.PI;
        game?.vfx?.spawnSlash(this.x + this.facing * 52, this.y - 88, 86, fAng - 1.1, fAng + 1.1, '#f59e0b', 0.26);
        game?.vfx?.spawnShockwave(this.x + this.facing * 64, this.groundY - 8, 92, '#ea580c', 0.26, true);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 28) {
          enemy.takeDamage(Math.round(52 * this.dmgScale), this, false, 165, -90);
        }
      } else {
        // Ashfang Ghoul twin claw rip
        if (game?.audio) game.audio.play('slash', this.x);
        const fAng = this.facing === 1 ? 0 : Math.PI;
        game?.vfx?.spawnSlash(this.x + this.facing * 42, this.y - 78, 62, fAng - 0.9, fAng + 0.9, '#ef4444', 0.20);
        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 22) {
          enemy.takeDamage(Math.round(32 * this.dmgScale), this, false, 95, 0);
        }
      }
    }

    if (t >= this.autoDuration) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;

    if (this.kind === 'cultist') {
      if (t >= 0.18 && !this.didActionFrame) {
        this.didActionFrame = true;
        const targetX = enemy ? enemy.x : this.x + this.facing * 300;
        this.spawnFloorTelegraph(targetX, 82, 0.72, 54, '#a855f7', 'VOID SIGIL');
        if (this.isElite) {
          this.spawnFloorTelegraph(targetX + this.facing * 125, 72, 0.88, 46, '#38bdf8', 'ASTRAL RIFT');
        }
        if (game?.audio) game.audio.play('skill_cast', this.x);
      }
    } else if (this.kind === 'brute') {
      if (t >= 0.44 && !this.didActionFrame) {
        this.didActionFrame = true;
        const sx = this.x + this.facing * 62;
        if (game?.audio) game.audio.play('thunder_slam', sx);
        if (game?.renderer) game.renderer.triggerShake(13, 0.25);
        game?.vfx?.spawnShockwave(sx, this.groundY - 8, 135, '#f59e0b', 0.34, true);
        game?.vfx?.spawnBurst(sx, this.groundY - 16, 18, '#fb923c', 240, { upBias: 150, size: 6 });
        game?.vfx?.spawnProjectile({
          x: sx,
          y: this.groundY - 48,
          vx: this.facing * 510,
          vy: 0,
          radius: 22,
          color: '#f59e0b',
          coreColor: '#fef08a',
          damage: Math.round(54 * this.dmgScale),
          owner: this,
          type: 'forge_wave'
        });
      }
    } else {
      // Ghoul Feral Pounce Lunge
      if (t >= 0.22 && t < 0.56) {
        this.x += this.facing * 410 * dt;
        this.y = this.groundY - Math.sin(((t - 0.22) / 0.34) * Math.PI) * 34;
        if (!this.didActionFrame && enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 105) {
          this.didActionFrame = true;
          if (game?.audio) game.audio.play('scythe_reap', this.x);
          const fAng = this.facing === 1 ? 0 : Math.PI;
          game?.vfx?.spawnSlash(this.x + this.facing * 38, this.y - 76, 68, fAng - 1.0, fAng + 1.0, '#ef4444', 0.22);
          enemy.takeDamage(Math.round(46 * this.dmgScale), this, true, 145, -80);
        }
      }
    }

    if (t >= this.skillDuration) {
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  drawTelegraphRings(ctx) {
    if (!this.telegraphRings.length || !ctx) return;
    ctx.save();
    for (const r of this.telegraphRings) {
      const u = Math.max(0, Math.min(1, r.timer / Math.max(0.05, r.maxTimer)));
      const rx = Math.round(r.x);
      const ry = Math.round(r.y - 4);
      const radX = Math.round(r.radius);
      const radY = Math.max(10, Math.round(r.radius * 0.28));

      // Crisp 2.5D pixel-stepped danger ellipse + shrinking lock-on inner ring
      ctx.globalAlpha = 0.22 + u * 0.28;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.ellipse(rx, ry, radX * u, radY * u, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.88;
      ctx.strokeStyle = u > 0.78 ? '#fef08a' : r.color;
      ctx.lineWidth = u > 0.78 ? 3 : 2;
      ctx.beginPath();
      ctx.ellipse(rx, ry, radX, radY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Pixel cardinal warning ticks
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - radX - 2, ry - 2, 4, 4);
      ctx.fillRect(rx + radX - 2, ry - 2, 4, 4);
      ctx.fillRect(rx - 2, ry - radY - 2, 4, 4);
      ctx.fillRect(rx - 2, ry + radY - 2, 4, 4);
    }
    ctx.restore();
  }

  drawOverheadPlate(ctx) {
    if (this.isDead) return;
    const scale = this.spriteScale || 1;
    const barW = this.isBoss ? 96 : this.isElite ? 66 : 52;
    const barH = this.isBoss ? 7 : 5;
    const bx = Math.round(this.x);
    const by = Math.round(this.y - 168 * scale - (this.isBoss ? 18 : 6));
    const x0 = bx - Math.floor(barW * 0.5);
    const hpPct = Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));

    ctx.save();
    // Optional active telegraph callout above the monster's head
    if (this.telegraphTimer > 0 && this.telegraphLabel) {
      ctx.font = '8px "ArcanePixel", "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const tw = Math.max(68, this.telegraphLabel.length * 6 + 10);
      ctx.fillStyle = '#090512';
      ctx.fillRect(bx - Math.floor(tw * 0.5), by - 25, tw, 12);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - Math.floor(tw * 0.5), by - 25, tw, 12);
      ctx.fillStyle = '#fef08a';
      ctx.fillText(this.telegraphLabel, bx, by - 16);
    } else if (this.isElite || this.isBoss) {
      ctx.font = '7px "ArcanePixel", "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const tag = this.isBoss ? `★ BOSS • PHASE ${this.bossPhase || 1} ★` : '★ ELITE';
      ctx.fillStyle = this.isBoss ? '#fca5a5' : '#fde047';
      ctx.fillText(tag, bx, by - 5);
    }

    ctx.fillStyle = '#05070e';
    ctx.fillRect(x0 - 1, by - 1, barW + 2, barH + 2);
    ctx.strokeStyle = this.isBoss ? '#ef4444' : this.isElite ? '#facc15' : '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 1, by - 1, barW + 2, barH + 2);

    ctx.fillStyle = this.isBoss ? '#dc2626' : this.primaryColor;
    ctx.fillRect(x0, by, Math.round(barW * hpPct), barH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(x0, by, Math.round(barW * hpPct), 1);
    ctx.restore();
  }

  draw(ctx, isReflection = false, renderer = null) {
    const assets = PixelForge.initAssets();
    const charSet = assets[this.heroId];
    if (!charSet || !charSet.sheet) return;

    const scale = this.spriteScale || 1.0;
    const drawW = Math.round(208 * scale);
    const drawH = Math.round(208 * scale);
    const shakeX =
      !isReflection && this.hurtTimer > 0 ? Math.round(Math.sin(this.hurtTimer * 55) * 4) : 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x + shakeX), Math.round(this.y));
    ctx.scale(this.facing, 1);

    if (this.isDead && this.deathTimer > 1.2) {
      const fade = Math.max(0.12, 1 - (this.deathTimer - 1.2) * 0.55);
      ctx.globalAlpha *= fade;
    }

    PixelForge.drawSheetFrame(ctx, charSet, this, drawW, drawH, this.walkPhase, isReflection, renderer);

    if (!isReflection && this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.45, this.hitFlash * 2.2);
      PixelForge.drawSheetFrame(ctx, charSet, this, drawW, drawH, this.walkPhase, true, renderer);
    }
    ctx.restore();

    if (!isReflection) {
      this.drawOverheadPlate(ctx);
    }
  }
}

/**
 * 3-Phase Final Arcade Boss: MALPHAS, ARCHFIEND OF THE BLACK PIT
 * - Phase 1 (100%..65% HP): Brimstone Volley + Dread Claw Cleave + Winged Rush
 * - Phase 2 (<= 65% HP):    Dread Wing Awakening Roar + Vanguard Summon + Sky-Rend Divebomb + Shrine Drop
 * - Phase 3 (<= 30% HP):    Black Pit Apocalypse — 5-Pillar Hellfire Cascade + Exhausted Punish Window
 */
export class ArchfiendBoss extends Monster {
  constructor(x, groundY, facing = -1) {
    super('brute', x, groundY, facing, {
      maxHp: 5200,
      spriteScale: 1.46,
      dmgScale: 1.24
    });
    this.heroId = 'archfiend';
    this.kind = 'archfiend';
    this.name = 'ARCHFIEND MALPHAS';
    this.theme = 'abyssal';
    this.primaryColor = '#ef4444';
    this.secondaryColor = '#f59e0b';
    this.isBoss = true;
    this.isElite = true;
    this.scoreValue = 3500;
    this.moveSpeed = 158;
    this.attackRange = 175;
    this.autoInterval = 1.48;
    this.autoDuration = 0.78;
    this.skillMaxCooldown = 4.6;
    this.skillDuration = 0.96;
    this.ultDuration = 1.75;
    this.ultCooldown = 7.2;
    this.skillName = 'BRIMSTONE BARRAGE';
    this.ultName = 'BLACK PIT APOCALYPSE';

    this.hasPoise = true;
    this.unstoppablePoise = true;
    this.bossPhase = 1;
    this.didPhase2 = false;
    this.didPhase3 = false;
    this.vulnerableTimer = 0;
    this.diveTargetX = x;
    this.diveStartX = x;
  }

  update(dt, enemy, game) {
    if (this.isDead) {
      super.update(dt, enemy, game);
      return;
    }

    this.ultCooldown = Math.max(0, this.ultCooldown - dt);
    if (this.vulnerableTimer > 0) {
      this.vulnerableTimer = Math.max(0, this.vulnerableTimer - dt);
      this.unstoppablePoise = false;
      if (this.vulnerableTimer <= 0) {
        this.unstoppablePoise = true;
      }
    }

    const hpRatio = this.hp / Math.max(1, this.maxHp);

    // Phase 2 Transition (`<= 65% HP`)
    if (!this.didPhase2 && hpRatio <= 0.65 && this.state !== 'ULTIMATE') {
      this.didPhase2 = true;
      this.bossPhase = 2;
      this.moveSpeed = 178;
      this.ultCooldown = 0.6;
      this.telegraphLabel = '★ PHASE II: DREAD WINGS! ★';
      this.telegraphTimer = 1.6;
      if (game?.renderer) {
        game.renderer.triggerShake(18, 0.55);
        game.renderer.triggerAberration(12);
      }
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          'DREAD WING AWAKENING',
          '★ ARCHFIEND PHASE II ★',
          'abyssal',
          true
        );
        game.vfx.spawnShockwave(this.x, this.groundY - 54, 260, '#ef4444', 0.52, true);
      }
      game?.adventure?.onBossPhaseShift?.(this, 2);
    }

    // Phase 3 Transition (`<= 30% HP`)
    if (!this.didPhase3 && hpRatio <= 0.30 && this.state !== 'ULTIMATE') {
      this.didPhase3 = true;
      this.bossPhase = 3;
      this.isBerserk = true;
      this.moveSpeed = 198;
      this.ultCooldown = 0.25;
      this.telegraphLabel = '★ PHASE III: APOCALYPSE! ★';
      this.telegraphTimer = 1.8;
      if (game?.renderer) {
        game.renderer.triggerShake(24, 0.72);
        game.renderer.triggerAberration(16);
      }
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          'BLACK PIT APOCALYPSE',
          '★ FINAL PHASE ENRAGE ★',
          'arcane',
          true
        );
        game.vfx.spawnShockwave(this.x, this.groundY - 58, 320, '#f59e0b', 0.62, true);
      }
      game?.adventure?.onBossPhaseShift?.(this, 3);
    }

    super.update(dt, enemy, game);
  }

  runMonsterNeutralAI(dt, enemy, game) {
    if (this.vulnerableTimer > 0) {
      this.state = 'IDLE';
      this.moveDir = 0;
      this.telegraphLabel = '★ VULNERABLE! ★';
      this.telegraphTimer = Math.max(this.telegraphTimer, 0.12);
      return;
    }

    const dist = Math.abs(enemy.x - this.x);
    this.facing = enemy.x >= this.x ? 1 : -1;

    // Phase 2 & Phase 3 Boss Signature Ultimate (`ULTIMATE`, Row 4)
    if (this.bossPhase >= 2 && this.ultCooldown <= 0) {
      this.ultCooldown = this.bossPhase >= 3 ? 6.8 : 8.2;
      this.diveStartX = this.x;
      this.diveTargetX = enemy.x;
      this.telegraphLabel =
        this.bossPhase >= 3 ? '★ BLACK PIT APOCALYPSE! ★' : '★ SKY-REND DIVEBOMB! ★';
      this.telegraphTimer = 1.35;
      this.setState('ULTIMATE');
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          this.bossPhase >= 3 ? 'BLACK PIT APOCALYPSE' : 'SKY-REND DIVEBOMB',
          '⚠ BOSS OVERDRIVE ⚠',
          'abyssal',
          true
        );
      }
      return;
    }

    if (this.skillCooldown <= 0 && dist <= 680) {
      this.skillCooldown = this.skillMaxCooldown * (this.bossPhase >= 3 ? 0.78 : 1.0);
      this.telegraphLabel = '★ BRIMSTONE VOLLEY! ★';
      this.telegraphTimer = 0.75;
      this.setState('SKILL');
      return;
    }

    if (this.dashCooldown <= 0 && dist > 255) {
      this.telegraphLabel = '! DREAD RUSH !';
      this.telegraphTimer = 0.45;
      this.startMonsterDash(enemy, game, this.facing, Math.min(360, dist - 75));
      return;
    }

    if (dist <= this.attackRange && this.autoCooldown <= 0) {
      this.autoCooldown = this.autoInterval * (this.bossPhase >= 3 ? 0.82 : 1.0);
      this.setState('AUTO_ATTACK');
      return;
    }

    if (dist > 142) {
      this.state = 'WALK';
      this.moveDir = 1;
      this.walkPhase += dt * 3.8;
      this.x += this.facing * this.moveSpeed * dt;
      this.headBob = Math.abs(Math.sin(this.walkPhase * 2)) * 3.0;
    } else {
      this.state = 'IDLE';
      this.moveDir = 0;
    }
  }

  updateAutoAttack(_dt, enemy, game) {
    const t = this.stateTimer;
    if (t >= 0.34 && !this.didActionFrame) {
      this.didActionFrame = true;
      if (game?.audio) game.audio.play('heavy_cleave', this.x);
      if (game?.renderer) game.renderer.triggerShake(12, 0.22);
      const fAng = this.facing === 1 ? 0 : Math.PI;
      game?.vfx?.spawnSlash(this.x + this.facing * 68, this.y - 104, 118, fAng - 1.15, fAng + 1.15, '#ef4444', 0.28);
      game?.vfx?.spawnShockwave(this.x + this.facing * 78, this.groundY - 12, 128, '#f59e0b', 0.28, true);
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 36) {
        enemy.takeDamage(68, this, true, 210, -120);
      }
    }
    if (t >= this.autoDuration) {
      this.setState('IDLE');
    }
  }

  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    if (t >= 0.32 && !this.didActionFrame) {
      this.didActionFrame = true;
      const sx = this.x + this.facing * 64;
      const sy = this.y - 134;
      const tx = enemy ? enemy.x : sx + this.facing * 420;
      const ty = enemy ? enemy.y - 96 : sy;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      if (game?.audio) game.audio.play('fireball', sx);

      [-55, 0, 55].forEach((vyOff, idx) => {
        game?.vfx?.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / len) * 510,
          vy: (dy / len) * 510 + vyOff,
          radius: idx === 1 ? 18 : 14,
          color: '#ef4444',
          coreColor: '#fef08a',
          damage: idx === 1 ? 54 : 42,
          owner: this,
          type: 'fireball'
        });
      });

      if (enemy) {
        this.spawnFloorTelegraph(enemy.x, 90, 0.78, 62, '#ef4444', 'HELLFIRE SEAL');
      }
    }
    if (t >= this.skillDuration) {
      this.setState('IDLE');
    }
  }

  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const minX = game?.adventure?.lockActive ? game.adventure.lockMinX + 60 : 3680;
    const maxX = game?.adventure?.lockActive ? game.adventure.lockMaxX - 60 : 4720;

    if (this.bossPhase >= 3) {
      // Phase 3: Black Pit Apocalypse — 5 sequential telegraphed hellfire pillars + Vulnerable Punish Window!
      this.y = this.groundY;
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        const base = enemy ? enemy.x : (minX + maxX) * 0.5;
        [-260, -130, 0, 130, 260].forEach((off, idx) => {
          const px = Math.max(minX, Math.min(maxX, base + off));
          this.spawnFloorTelegraph(px, 84, 0.56 + idx * 0.16, 72, '#ef4444', 'APOCALYPSE');
          game?.vfx?.spawnFlamePillar(px, this.groundY, this, enemy, {
            theme: 'abyssal',
            delay: 0.56 + idx * 0.16,
            maxLife: 1.2,
            scaleWidth: idx === 2 ? 1.2 : 0.9,
            isUltimate: true
          });
        });
      }
      if (t >= this.ultDuration) {
        this.vulnerableTimer = 1.65;
        this.telegraphLabel = '★ VULNERABLE! ★';
        this.telegraphTimer = 1.65;
        this.setState('IDLE');
      }
      return;
    }

    // Phase 2: Sky-Rend Winged Divebomb!
    if (t < 0.62) {
      const u = t / 0.62;
      this.y = this.groundY - Math.sin(u * Math.PI * 0.5) * 215;
      if (!this.didSecondaryAction) {
        this.didSecondaryAction = true;
        this.diveTargetX = Math.max(minX, Math.min(maxX, enemy ? enemy.x : this.x));
        this.spawnFloorTelegraph(this.diveTargetX, 112, 0.68, 78, '#f59e0b', 'DIVEBOMB');
      }
    } else if (t < 1.05) {
      const u = (t - 0.62) / 0.43;
      this.x = this.diveStartX + (this.diveTargetX - this.diveStartX) * u;
      this.y = this.groundY - (1 - u) * 215;
    } else {
      this.y = this.groundY;
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('meteor_impact', this.x);
        if (game?.renderer) {
          game.renderer.triggerShake(20, 0.45);
          game.renderer.triggerAberration(12);
        }
        game?.vfx?.spawnShockwave(this.x, this.groundY - 12, 240, '#ef4444', 0.48, true);
        game?.vfx?.spawnBurst(this.x, this.groundY - 20, 28, '#f59e0b', 340, { upBias: 185, size: 7 });
        [-1, 1].forEach((dir) => {
          game?.vfx?.spawnProjectile({
            x: this.x + dir * 48,
            y: this.groundY - 46,
            vx: dir * 540,
            vy: 0,
            radius: 22,
            color: '#ef4444',
            coreColor: '#fef08a',
            damage: 52,
            owner: this,
            type: 'forge_wave'
          });
        });
      }
      if (t >= 1.45) {
        this.vulnerableTimer = 1.15;
        this.setState('IDLE');
      }
    }
  }
}
