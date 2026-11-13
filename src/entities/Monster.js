import { Fighter } from './Fighter.js?v=30fps87';
import { PixelForge } from '../engine/PixelForge.js?v=30fps87';

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

    this.heroId = cfg.heroId;
    this.kind = kind;
    this.theme = cfg.theme;
    this.primaryColor = cfg.primaryColor;
    this.secondaryColor = cfg.secondaryColor;
    this.deathSfx = cfg.deathSfx;
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
    this.skillMaxCooldown = cfg.skillMaxCooldown * (isElite ? 0.88 : 1.0);
    this.skillName =
      kind === 'cultist'
        ? 'VOID SIGIL'
        : kind === 'brute'
          ? 'SEISMIC CLEAVE'
          : 'FERAL POUNCE';
    this.ultName = 'ABYSSAL SURGE';
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
    this.dashStartGy = groundY;
    this.dashTargetGy = groundY;
    this.pounceVelZ = 0;
    this.flankOffsetZ = ((Math.round(x) % 5) - 2) * 14;
    this.bruteAltSkill = 0;
  }

  shiftMonsterDepth(dz, game) {
    if (!Number.isFinite(dz) || dz === 0) return;
    const minGy = (game?.adventure?.depthMinY || 442) + 8;
    const maxGy = (game?.adventure?.depthMaxY || 680) - 8;
    const prevGy = Number.isFinite(this.groundY) ? this.groundY : 561;
    const nextGy = Math.max(minGy, Math.min(maxGy, prevGy + dz));
    const applied = nextGy - prevGy;
    if (applied === 0) return;
    this.groundY = nextGy;
    this.y += applied;
    if (Array.isArray(this.capeNodes)) {
      for (const n of this.capeNodes) {
        if (n) n.y += applied;
      }
    }
  }

  setMonsterGroundY(targetGy, game) {
    const prevGy = Number.isFinite(this.groundY) ? this.groundY : 561;
    this.shiftMonsterDepth(targetGy - prevGy, game);
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

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    const prevHp = this.hp;
    let finalAmount = amount;
    const prog = this.game?.isAdventureMode?.() ? this.game.adventure?.progression : null;
    if (prog && attacker && !attacker.isMonster) {
      finalAmount = prog.scaleOutgoingDamage(amount, attacker, this, isCrit);
    }
    if (this.isColossalBoss) {
      knockX = 0;
      knockY = 0;
    }
    super.takeDamage(finalAmount, attacker, isCrit, knockX, knockY);
    if (this.isColossalBoss) {
      this.x = this.anchorX;
      this.vx = 0;
      this.vy = 0;
      this.y = this.anchorGroundY;
      this.groundY = this.anchorGroundY;
      this.facing = 1;
    }
    const dealt = Math.max(0, prevHp - this.hp);
    if (dealt > 0 && prog && attacker && !attacker.isMonster) {
      prog.onPlayerHitMonster(attacker, this, dealt);
      if (!this._isAdvCleaveSplash) {
        this.game?.adventure?.skillSets?.onDirectMonsterHit?.(
          attacker,
          this,
          amount,
          isCrit,
          knockX,
          knockY
        );
      }
    }
  }

  spawnFloorTelegraph(
    x,
    radius,
    delay,
    damage,
    color = '#a855f7',
    label = 'VOID SIGIL!',
    targetGroundY = null
  ) {
    const gy = Number.isFinite(targetGroundY) ? targetGroundY : this.groundY;
    this.telegraphRings.push({
      x,
      y: gy,
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
        const maxDepthDelta = Math.max(54, ring.radius * 0.56);
        for (const target of enemies) {
          const tGy = target ? target.groundY || target.y : 0;
          if (
            target &&
            !target.isDead &&
            !target.isBenched &&
            Math.abs(target.x - ring.x) <= ring.radius &&
            Math.abs(tGy - ring.y) <= maxDepthDelta &&
            target.y >= tGy - 68
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

    // 3D Monster pack spacing so multiple ghouls/cultists fan out organically across X and depth groundY
    if (game?.fighters && (this.state === 'IDLE' || this.state === 'WALK')) {
      for (const other of game.fighters) {
        if (other && other !== this && other.team === this.team && !other.isDead) {
          const dx = this.x - other.x;
          const dz = (this.groundY || this.y) - (other.groundY || other.y);
          const dist2D = Math.hypot(dx, dz * 1.45);
          const minAllySep = this.isBoss || other.isBoss ? 116 : 74;
          if (dist2D < minAllySep) {
            const nx = dist2D < 2 ? (this.x % 2 === 0 ? 1 : -1) : dx / dist2D;
            const nz = dist2D < 2 ? (Math.round(this.x) % 3 === 0 ? 0.6 : -0.6) : (dz * 1.45) / dist2D;
            const pushMag = (minAllySep - dist2D) * 3.6 * dt;
            this.x += nx * pushMag;
            this.shiftMonsterDepth(nz * pushMag * 0.72, game);
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
    const enemyGy = enemy.groundY || enemy.y;
    const dz = enemyGy - this.groundY;
    const absDz = Math.abs(dz);
    this.facing = enemy.x >= this.x ? 1 : -1;

    if (this.kind === 'cultist') {
      // Ranged Warlock spacing: maintain 270..440px in X while flanking gently in 3D depth
      if (dist < 175 && absDz < 72 && this.dashCooldown <= 0) {
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
      if (dist <= this.attackRange && dist >= 185 && absDz <= 135 && this.autoCooldown <= 0) {
        this.autoCooldown = this.autoInterval;
        this.setState('AUTO_ATTACK');
        return;
      }
      const desiredGy = enemyGy + this.flankOffsetZ * 2.2;
      const cultistDz = desiredGy - this.groundY;
      let moving = false;
      if (dist < 235) {
        this.moveDir = -1;
        this.x -= this.facing * this.moveSpeed * 0.85 * dt;
        moving = true;
      } else if (dist > 410) {
        this.moveDir = 1;
        this.x += this.facing * this.moveSpeed * dt;
        moving = true;
      }
      if (Math.abs(cultistDz) > 22) {
        this.shiftMonsterDepth(Math.sign(cultistDz) * this.moveSpeed * 0.66 * dt, game);
        if (!moving) this.moveDir = 1;
        moving = true;
      }
      if (moving) {
        this.state = 'WALK';
        this.walkPhase += dt * 4.2;
        this.headBob = Math.sin(this.walkPhase * 2) * 1.8;
      } else {
        this.state = 'IDLE';
        this.moveDir = 0;
      }
      return;
    }

    if (this.kind === 'brute') {
      // Heavy Armored Juggernaut: aligns on 3D lane before Bull-Charge, Seismic Slam, or Cleaver Chop
      if (this.dashCooldown <= 0 && dist > 205 && dist < 520 && absDz <= 56) {
        this.telegraphLabel = '! BULL CHARGE !';
        this.telegraphTimer = 0.62;
        this.forgeArmorTimer = 0.65;
        this.startMonsterDash(enemy, game, this.facing, Math.min(330, dist - 55));
        return;
      }
      if (this.skillCooldown <= 0 && dist <= 380 && absDz <= 46) {
        this.skillCooldown = this.skillMaxCooldown;
        this.forgeArmorTimer = 0.72;
        this.telegraphLabel = '! SEISMIC SLAM !';
        this.telegraphTimer = 0.65;
        this.setState('SKILL');
        return;
      }
      if (dist <= this.attackRange && absDz <= 48 && this.autoCooldown <= 0) {
        this.autoCooldown = this.autoInterval;
        this.setState('AUTO_ATTACK');
        return;
      }
      if (dist > 122 || absDz > 34) {
        this.state = 'WALK';
        this.moveDir = 1;
        this.walkPhase += dt * 3.4;
        if (dist > 116) {
          this.x += this.facing * this.moveSpeed * dt;
        }
        if (absDz > 12) {
          this.shiftMonsterDepth(
            Math.sign(dz) * Math.min(absDz, this.moveSpeed * 0.86 * dt),
            game
          );
        }
        this.headBob = Math.abs(Math.sin(this.walkPhase * 2)) * 2.8;
      } else {
        this.state = 'IDLE';
        this.moveDir = 0;
      }
      return;
    }

    // Default (`ghoul` — Ashfang Rusher): aggressive 3D pack stalker + Feral Pounce
    if (this.skillCooldown <= 0 && dist >= 130 && dist <= 310 && absDz <= 56) {
      this.skillCooldown = this.skillMaxCooldown;
      this.telegraphLabel = '! POUNCE !';
      this.telegraphTimer = 0.52;
      this.pounceVelZ = Math.max(-135, Math.min(135, dz * 2.1));
      this.setState('SKILL');
      return;
    }
    if (this.dashCooldown <= 0 && dist > 265) {
      this.startMonsterDash(enemy, game, this.facing, 195);
      return;
    }
    if (dist <= this.attackRange && absDz <= 46 && this.autoCooldown <= 0) {
      this.autoCooldown = this.autoInterval;
      this.setState('AUTO_ATTACK');
      return;
    }
    const ghoulGoalGy = enemyGy + this.flankOffsetZ * 0.55;
    const ghoulDz = ghoulGoalGy - this.groundY;
    if (dist > 102 || Math.abs(ghoulDz) > 28) {
      this.state = 'WALK';
      this.moveDir = 1;
      this.walkPhase += dt * 5.6;
      if (dist > 96) {
        this.x += this.facing * this.moveSpeed * dt;
      }
      if (Math.abs(ghoulDz) > 8) {
        this.shiftMonsterDepth(
          Math.sign(ghoulDz) * Math.min(Math.abs(ghoulDz), this.moveSpeed * 0.88 * dt),
          game
        );
      }
      this.headBob = Math.sin(this.walkPhase * 2) * 2.4;
    } else {
      this.state = 'IDLE';
      this.moveDir = 0;
    }
  }

  startMonsterDash(enemy, game, dir, distance = 200) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const minX = game?.adventure?.lockActive ? game.adventure.lockMinX + 24 : 95;
    const maxX = game?.adventure?.lockActive ? game.adventure.lockMaxX - 24 : ww - 95;
    const minGy = (game?.adventure?.depthMinY || 442) + 14;
    const maxGy = (game?.adventure?.depthMaxY || 680) - 14;
    this.dashCooldown = this.dashMaxCooldown;
    this.dashDir = dir || this.facing;
    this.dashStartX = this.x;
    this.dashTargetX = Math.max(minX, Math.min(maxX, this.x + this.dashDir * distance));
    this.dashStartGy = this.groundY;
    const targetGy =
      this.kind === 'cultist'
        ? this.groundY + (this.groundY > 561 ? -58 : 58)
        : enemy
          ? enemy.groundY || enemy.y
          : this.groundY;
    this.dashTargetGy = Math.max(minGy, Math.min(maxGy, targetGy));
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
      this.setMonsterGroundY(
        this.dashStartGy + (this.dashTargetGy - this.dashStartGy) * chargeU,
        game
      );
      if (
        !this.didActionFrame &&
        enemy &&
        !enemy.isDead &&
        Math.abs(enemy.x - this.x) < 115 &&
        Math.abs((enemy.groundY || enemy.y) - this.groundY) < 58
      ) {
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
      this.setMonsterGroundY(
        this.dashStartGy + (this.dashTargetGy - this.dashStartGy) * ease,
        game
      );
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
        if (
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - this.x) <= this.attackRange + 28 &&
          Math.abs((enemy.groundY || enemy.y) - this.groundY) <= 58
        ) {
          enemy.takeDamage(Math.round(52 * this.dmgScale), this, false, 165, -90);
        }
      } else {
        // Ashfang Ghoul twin claw rip
        if (game?.audio) game.audio.play('slash', this.x);
        const fAng = this.facing === 1 ? 0 : Math.PI;
        game?.vfx?.spawnSlash(this.x + this.facing * 42, this.y - 78, 62, fAng - 0.9, fAng + 0.9, '#ef4444', 0.20);
        if (
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - this.x) <= this.attackRange + 22 &&
          Math.abs((enemy.groundY || enemy.y) - this.groundY) <= 54
        ) {
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
        const targetGy = enemy ? enemy.groundY || enemy.y : this.groundY;
        this.spawnFloorTelegraph(targetX, 82, 0.72, 54, '#a855f7', 'VOID SIGIL', targetGy);
        if (this.isElite) {
          const riftGy = Math.max(454, Math.min(668, targetGy + (targetGy > 561 ? -54 : 54)));
          this.spawnFloorTelegraph(
            targetX + this.facing * 125,
            72,
            0.88,
            46,
            '#38bdf8',
            'ASTRAL RIFT',
            riftGy
          );
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
      // Ghoul Feral Pounce Lunge in 3D space
      if (t >= 0.22 && t < 0.56) {
        this.x += this.facing * 410 * dt;
        this.shiftMonsterDepth((this.pounceVelZ || 0) * dt, game);
        this.y = this.groundY - Math.sin(((t - 0.22) / 0.34) * Math.PI) * 34;
        if (
          !this.didActionFrame &&
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - this.x) < 105 &&
          Math.abs((enemy.groundY || enemy.y) - this.groundY) <= 56
        ) {
          this.didActionFrame = true;
          if (game?.audio) game.audio.play('scythe_reap', this.x);
          const fAng = this.facing === 1 ? 0 : Math.PI;
          game?.vfx?.spawnSlash(this.x + this.facing * 38, this.y - 76, 68, fAng - 1.0, fAng + 1.0, '#ef4444', 0.22);
          enemy.takeDamage(Math.round(46 * this.dmgScale), this, true, 145, -80);
        }
      }
    }

    if (t >= this.skillDuration) {
      this.pounceVelZ = 0;
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
    const charSet = assets[this.heroId] || assets[this.kind];
    if (charSet && charSet.sheet && charSet.sheet.complete && charSet.sheet.naturalWidth > 0) {
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
    }

    if (!isReflection) {
      this.drawOverheadPlate(ctx);
    }
  }
}

/**
 * GIANT LEFT-SIDE COLOSSAL FINAL BOSS: BEHEMOTH MALPHAS, COLOSSUS OF THE BLACK PIT
 *
 * Toweringly huge (`456x456` HD-2D Sovereign Torso + articulated `256x256` Siege-Claws & Slamming Fist)
 * anchored on the LEFT side of Zone IV (`anchorX = 3865`, visual body `x: 3610..4066`, `y: 200..656`)
 * permanently facing RIGHT (`+X`) across the 3D Caldera Sanctuary while the player battles on the center-right!
 *
 * - Phase 1 (100%..65% HP): Colossal Fist Crush (tracks player's 3D `(x, groundY)`) + Abyssal Jaw Hellfire Fan
 * - Phase 2 (<= 65% HP):    Colossal Claw 3D Lane Sweep (rakes Upper or Lower road left-to-right) + Vanguard Summon + Caldera Fist Barrage
 * - Phase 3 (<= 30% HP):    Black Pit Cataclysm (5-Pillar Magma Cascade + Crashing Siege-Fist -> 2.2s Exposed Heart-Core +45% DMG Window!)
 */
export class ArchfiendBoss extends Monster {
  constructor(x = 3865, groundY = 561, _facing = 1) {
    super('brute', x, groundY, 1, {
      maxHp: 3900,
      spriteScale: 2.18,
      dmgScale: 1.18
    });
    this.heroId = 'archfiend';
    this.kind = 'archfiend';
    this.name = 'BEHEMOTH MALPHAS';
    this.theme = 'abyssal';
    this.primaryColor = '#ef4444';
    this.secondaryColor = '#f59e0b';
    this.isBoss = true;
    this.isColossalBoss = true;
    this.isElite = true;
    this.scoreValue = 4200;

    // Permanently anchored on the LEFT side of Zone IV facing RIGHT (+X)!
    this.anchorX = Number.isFinite(x) ? x : 3865;
    this.anchorGroundY = Number.isFinite(groundY) ? groundY : 561;
    this.x = this.anchorX;
    this.groundY = this.anchorGroundY;
    this.y = this.anchorGroundY;
    this.facing = 1;

    this.moveSpeed = 0;
    this.attackRange = 880;
    this.autoInterval = 1.85;
    this.autoDuration = 1.04;
    this.skillMaxCooldown = 3.9;
    this.skillDuration = 1.08;
    this.ultDuration = 1.85;
    this.ultCooldown = 6.2;
    this.skillName = 'SIEGE CLAW & HELLFIRE';
    this.ultName = 'BLACK PIT CATACLYSM';

    this.hasPoise = true;
    this.unstoppablePoise = true;
    this.bossPhase = 1;
    this.didPhase2 = false;
    this.didPhase3 = false;
    this.vulnerableTimer = 0;

    // Articulated Multi-Limb State (Zero ctx.rotate — pure 2.5D integer pixel blits!)
    this.skillVariant = 0;
    this.slamTargetX = this.anchorX + 380;
    this.slamTargetGy = 561;
    this.fistVisible = false;
    this.fistWorldX = this.anchorX + 320;
    this.fistWorldY = 260;
    this.fistShadowGy = 561;

    this.rakeActive = false;
    this.rakeWarnOnly = false;
    this.rakeLaneGy = 504;
    this.clawWorldX = this.anchorX + 165;
    this.clawWorldY = 548;
  }

  pinColossalAnchor() {
    this.x = this.anchorX;
    this.vx = 0;
    this.vy = 0;
    this.groundY = this.anchorGroundY;
    this.y = this.anchorGroundY;
    this.facing = 1;
  }

  update(dt, enemy, game) {
    this.pinColossalAnchor();
    if (this.isDead) {
      this.fistVisible = false;
      this.rakeActive = false;
      this.rakeWarnOnly = false;
      super.update(dt, enemy, game);
      this.pinColossalAnchor();
      return;
    }

    this.walkPhase = (this.walkPhase || 0) + dt * 2.4;
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
      this.ultCooldown = 0.45;
      this.telegraphLabel = '★ PHASE II: SIEGE CLAW AWAKENING! ★';
      this.telegraphTimer = 1.75;
      if (game?.renderer) {
        game.renderer.triggerShake(18, 0.55);
        game.renderer.triggerAberration(12);
      }
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          'COLOSSAL CALDERA SURGE',
          '★ BEHEMOTH PHASE II ★',
          'abyssal',
          true
        );
        game.vfx.spawnShockwave(this.anchorX + 80, this.anchorGroundY - 54, 280, '#ef4444', 0.52, true);
      }
      game?.adventure?.onBossPhaseShift?.(this, 2);
    }

    // Phase 3 Transition (`<= 30% HP`)
    if (!this.didPhase3 && hpRatio <= 0.30 && this.state !== 'ULTIMATE') {
      this.didPhase3 = true;
      this.bossPhase = 3;
      this.isBerserk = true;
      this.ultCooldown = 0.2;
      this.telegraphLabel = '★ PHASE III: BLACK PIT CATACLYSM! ★';
      this.telegraphTimer = 1.9;
      if (game?.renderer) {
        game.renderer.triggerShake(24, 0.72);
        game.renderer.triggerAberration(16);
      }
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          'BLACK PIT CATACLYSM',
          '★ FINAL COLOSSUS ENRAGE ★',
          'arcane',
          true
        );
        game.vfx.spawnShockwave(this.anchorX + 80, this.anchorGroundY - 58, 340, '#f59e0b', 0.62, true);
      }
      game?.adventure?.onBossPhaseShift?.(this, 3);
    }

    // Idle articulated claw hover when not actively raking or slamming
    if (this.state !== 'AUTO_ATTACK' && this.state !== 'ULTIMATE') {
      this.fistVisible = false;
    }
    if (this.state !== 'SKILL') {
      this.rakeActive = false;
      this.rakeWarnOnly = false;
      const slumpOff = this.vulnerableTimer > 0 ? 28 : 0;
      this.clawWorldX = this.anchorX + 168 + Math.sin(this.walkPhase * 1.4) * 14;
      this.clawWorldY = 556 + Math.cos(this.walkPhase * 1.8) * 10 + slumpOff;
    }

    super.update(dt, enemy, game);
    this.pinColossalAnchor();
  }

  runMonsterNeutralAI(_dt, enemy, game) {
    this.pinColossalAnchor();
    if (this.vulnerableTimer > 0) {
      this.state = 'IDLE';
      this.moveDir = 0;
      this.telegraphLabel = '★ HEART CORE EXPOSED! (+45% DMG) ★';
      this.telegraphTimer = Math.max(this.telegraphTimer, 0.14);
      return;
    }

    const enemyGy = enemy ? enemy.groundY || enemy.y : 561;

    // Phase 2 & Phase 3 Colossal Signature Cataclysm (`ULTIMATE`)
    if (this.bossPhase >= 2 && this.ultCooldown <= 0) {
      this.ultCooldown = this.bossPhase >= 3 ? 6.6 : 8.0;
      this.slamTargetX = Math.max(4030, Math.min(4660, enemy ? enemy.x : 4300));
      this.slamTargetGy = Math.max(462, Math.min(660, enemyGy));
      this.telegraphLabel =
        this.bossPhase >= 3 ? '★ BLACK PIT CATACLYSM! ★' : '★ CALDERA FIST BARRAGE! ★';
      this.telegraphTimer = 1.45;
      this.setState('ULTIMATE');
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          this.bossPhase >= 3 ? 'BLACK PIT CATACLYSM' : 'CALDERA FIST BARRAGE',
          '⚠ COLOSSUS OVERDRIVE ⚠',
          'abyssal',
          true
        );
      }
      return;
    }

    // Alternating Special Skill: Colossal Claw 3D Lane Rake vs Abyssal Jaw Hellfire Fan
    if (this.skillCooldown <= 0) {
      this.skillCooldown = this.skillMaxCooldown * (this.bossPhase >= 3 ? 0.76 : 1.0);
      this.skillVariant = (this.skillVariant + 1) % 2;
      if (this.skillVariant === 1) {
        this.rakeLaneGy = enemyGy <= 561 ? 500 : 624;
        this.telegraphLabel =
          this.rakeLaneGy <= 561 ? '⚠ CLAW SWEEP: UPPER ROAD! ⚠' : '⚠ CLAW SWEEP: LOWER ROAD! ⚠';
        this.telegraphTimer = 0.95;
      } else {
        this.telegraphLabel = '★ ABYSSAL JAW HELLFIRE! ★';
        this.telegraphTimer = 0.85;
      }
      this.setState('SKILL');
      return;
    }

    // Primary Colossal Fist Sky-Crush tracking player's 3D position!
    if (this.autoCooldown <= 0) {
      this.autoCooldown = this.autoInterval * (this.bossPhase >= 3 ? 0.80 : 1.0);
      this.slamTargetX = Math.max(4020, Math.min(4680, enemy ? enemy.x : 4260));
      this.slamTargetGy = Math.max(462, Math.min(662, enemyGy));
      this.telegraphLabel = '! COLOSSAL FIST CRUSH !';
      this.telegraphTimer = 0.68;
      this.setState('AUTO_ATTACK');
      this.spawnFloorTelegraph(
        this.slamTargetX,
        104,
        0.54,
        72,
        '#f59e0b',
        'FIST CRUSH',
        this.slamTargetGy
      );
      return;
    }

    this.state = 'IDLE';
    this.moveDir = 0;
  }

  updateAutoAttack(_dt, _enemy, game) {
    const t = this.stateTimer;
    this.fistVisible = true;
    this.fistShadowGy = this.slamTargetGy;

    if (t < 0.48) {
      // Hoist giant runic fist high above target 3D lane
      const u = t / 0.48;
      const ease = 1 - Math.pow(1 - u, 2);
      this.fistWorldX = this.anchorX + 190 + (this.slamTargetX - (this.anchorX + 190)) * ease;
      this.fistWorldY = this.slamTargetGy - 250 - Math.sin(u * Math.PI * 0.5) * 95;
    } else if (t < 0.62) {
      // Meteoric downward slam onto the road!
      const u = (t - 0.48) / 0.14;
      this.fistWorldX = this.slamTargetX;
      this.fistWorldY = this.slamTargetGy - 345 * (1 - u * u);
      if (u >= 0.86 && !this.didActionFrame) {
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('thunder_slam', this.slamTargetX);
        if (game?.renderer) game.renderer.triggerShake(16, 0.28);
        game?.vfx?.spawnShockwave(this.slamTargetX, this.slamTargetGy - 8, 155, '#f59e0b', 0.34, true);
        game?.vfx?.spawnBurst(this.slamTargetX, this.slamTargetGy - 18, 22, '#fb923c', 290, {
          upBias: 170,
          size: 7
        });
        game?.vfx?.spawnDecal(this.slamTargetX, 118, 'fissure', '#ea580c', 4.5, this.slamTargetGy);
      }
    } else {
      // Retract giant fist back toward left caldera
      const u = Math.min(1, (t - 0.62) / Math.max(0.15, this.autoDuration - 0.62));
      this.fistWorldX = this.slamTargetX + (this.anchorX + 190 - this.slamTargetX) * u;
      this.fistWorldY = this.slamTargetGy - u * 165;
    }

    if (t >= this.autoDuration) {
      this.fistVisible = false;
      this.setState('IDLE');
    }
  }

  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;

    if (this.skillVariant === 1) {
      // Variant B: Giant Open Siege-Claw 3D Horizontal Lane Sweep (`x: 3860 -> 4690`)!
      if (t < 0.48) {
        this.rakeWarnOnly = true;
        this.rakeActive = false;
        const coil = t / 0.48;
        this.clawWorldX = this.anchorX + 120 - coil * 38;
        this.clawWorldY = this.rakeLaneGy + 18;
      } else if (t < 0.94) {
        this.rakeWarnOnly = false;
        this.rakeActive = true;
        const u = (t - 0.48) / 0.46;
        this.clawWorldX = this.anchorX + 110 + u * 830;
        this.clawWorldY = this.rakeLaneGy + 18;

        if (!this.didSecondaryAction) {
          this.didSecondaryAction = true;
          if (game?.audio) game.audio.play('heavy_cleave', this.clawWorldX);
          if (game?.renderer) game.renderer.triggerShake(14, 0.25);
        }
        if (
          !this.didActionFrame &&
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - this.clawWorldX) <= 125 &&
          Math.abs((enemy.groundY || enemy.y) - this.rakeLaneGy) <= 64 &&
          enemy.y >= (enemy.groundY || enemy.y) - 62
        ) {
          this.didActionFrame = true;
          enemy.takeDamage(Math.round(66 * this.dmgScale), this, true, 220, -110);
          game?.vfx?.spawnShockwave(enemy.x, this.rakeLaneGy - 18, 120, '#ef4444', 0.28, true);
        }
      } else {
        this.rakeWarnOnly = false;
        this.rakeActive = false;
        const u = Math.min(1, (t - 0.94) / Math.max(0.1, this.skillDuration - 0.94));
        this.clawWorldX = this.anchorX + 940 * (1 - u) + 168 * u;
        this.clawWorldY = this.rakeLaneGy + 18;
      }

      if (t >= this.skillDuration) {
        this.rakeWarnOnly = false;
        this.rakeActive = false;
        this.setState('IDLE');
      }
      return;
    }

    // Variant A: Abyssal Skull-Jaw Hellfire Barrage Rightward across Zone IV!
    if (t >= 0.32 && !this.didActionFrame) {
      this.didActionFrame = true;
      const sx = this.anchorX + 88;
      const sy = 338;
      const tx = enemy ? Math.max(sx + 180, enemy.x) : sx + 480;
      const ty = enemy ? (enemy.groundY || enemy.y) - 62 : 500;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      if (game?.audio) game.audio.play('fireball', sx);

      const spreadOffsets = this.bossPhase >= 2 ? [-95, -46, 0, 46, 95] : [-58, 0, 58];
      spreadOffsets.forEach((vyOff, idx) => {
        const isCenter = idx === Math.floor(spreadOffsets.length / 2);
        game?.vfx?.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / len) * 525,
          vy: (dy / len) * 525 + vyOff,
          radius: isCenter ? 19 : 14,
          color: '#ef4444',
          coreColor: '#fef08a',
          damage: isCenter ? 54 : 42,
          owner: this,
          type: 'fireball'
        });
      });

      if (enemy) {
        this.spawnFloorTelegraph(
          Math.max(4010, enemy.x),
          94,
          0.78,
          60,
          '#ef4444',
          'HELLFIRE SEAL',
          enemy.groundY || enemy.y
        );
      }
    }

    if (t >= this.skillDuration) {
      this.setState('IDLE');
    }
  }

  updateUltimate(_dt, enemy, game) {
    const t = this.stateTimer;
    const minX = 4020;
    const maxX = 4690;
    const minGy = (game?.adventure?.depthMinY || 442) + 20;
    const maxGy = (game?.adventure?.depthMaxY || 680) - 20;

    this.fistVisible = true;
    this.fistShadowGy = this.slamTargetGy;

    if (!this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const base = Math.max(minX, Math.min(maxX, enemy ? enemy.x : 4340));
      const baseGy = enemy ? enemy.groundY || enemy.y : 561;
      const count = this.bossPhase >= 3 ? 5 : 3;
      const xOffsets = count === 5 ? [-240, -120, 0, 120, 240] : [-155, 0, 155];
      const zOffsets = count === 5 ? [-64, 54, 0, -54, 64] : [-56, 0, 56];

      xOffsets.forEach((off, idx) => {
        const px = Math.max(minX, Math.min(maxX, base + off));
        const pGy = Math.max(minGy, Math.min(maxGy, baseGy + zOffsets[idx]));
        const delay = 0.56 + idx * 0.14;
        this.spawnFloorTelegraph(px, 88, delay, 68, '#ef4444', 'CATACLYSM', pGy);
        game?.vfx?.spawnFlamePillar(px, pGy, this, enemy, {
          theme: 'abyssal',
          delay,
          maxLife: 1.25,
          scaleWidth: idx === Math.floor(count / 2) ? 1.22 : 0.92,
          isUltimate: true,
          groundY: pGy
        });
      });
    }

    if (t < 0.72) {
      const u = t / 0.72;
      this.fistWorldX = this.slamTargetX;
      this.fistWorldY = this.slamTargetGy - 280 - Math.sin(u * Math.PI * 0.5) * 90;
    } else if (t < 1.05) {
      const u = (t - 0.72) / 0.33;
      this.fistWorldX = this.slamTargetX;
      this.fistWorldY = this.slamTargetGy - 370 * (1 - u * u);
      if (u >= 0.85 && !this.didActionFrame) {
        this.didActionFrame = true;
        if (game?.audio) game.audio.play('meteor_impact', this.slamTargetX);
        if (game?.renderer) {
          game.renderer.triggerShake(20, 0.45);
          game.renderer.triggerAberration(12);
        }
        game?.vfx?.spawnShockwave(this.slamTargetX, this.slamTargetGy - 10, 230, '#ef4444', 0.46, true);
        game?.vfx?.spawnBurst(this.slamTargetX, this.slamTargetGy - 18, 26, '#f59e0b', 330, {
          upBias: 185,
          size: 7
        });
      }
    } else {
      const u = Math.min(1, (t - 1.05) / 0.75);
      this.fistWorldX = this.slamTargetX + (this.anchorX + 185 - this.slamTargetX) * u;
      this.fistWorldY = this.slamTargetGy - u * 180;
    }

    if (t >= this.ultDuration) {
      this.fistVisible = false;
      this.vulnerableTimer = this.bossPhase >= 3 ? 2.2 : 1.45;
      this.telegraphLabel = '★ HEART CORE EXPOSED! (+45% DMG) ★';
      this.telegraphTimer = this.vulnerableTimer;
      this.setState('IDLE');
    }
  }

  drawTelegraphRings(ctx) {
    super.drawTelegraphRings(ctx);
    if (!ctx || (!this.rakeWarnOnly && !this.rakeActive)) return;

    // Clear 3D Full-Lane Danger Corridor for Colossal Claw Sweep (`x: 3940..4710`)
    ctx.save();
    const yTop = Math.round(this.rakeLaneGy - 54);
    const bandH = 108;
    const xStart = this.anchorX + 95;
    const bandW = 4720 - xStart;
    const pulse = 0.20 + 0.12 * Math.sin((this.walkPhase || 0) * 14);
    ctx.fillStyle = this.rakeActive
      ? 'rgba(239, 68, 68, 0.30)'
      : `rgba(249, 115, 22, ${pulse.toFixed(3)})`;
    ctx.fillRect(xStart, yTop, bandW, bandH);
    ctx.strokeStyle = this.rakeActive ? '#fef08a' : '#fb923c';
    ctx.lineWidth = 2;
    ctx.strokeRect(xStart, yTop, bandW, bandH);

    // Pixel directional chevrons indicating rightward claw rake (`>>>`)
    ctx.fillStyle = '#fef08a';
    for (let cx = xStart + 70; cx < xStart + bandW - 60; cx += 150) {
      const cy = Math.round(this.rakeLaneGy);
      ctx.fillRect(cx, cy - 10, 8, 4);
      ctx.fillRect(cx + 6, cy - 6, 8, 4);
      ctx.fillRect(cx + 12, cy - 2, 8, 4);
      ctx.fillRect(cx + 6, cy + 2, 8, 4);
      ctx.fillRect(cx, cy + 6, 8, 4);
    }
    ctx.restore();
  }

  draw(ctx, isReflection = false, renderer = null) {
    if (isReflection || !ctx) return;
    const assets = PixelForge.initAssets();
    const charSet = assets.archfiend;
    const colossusImg = charSet?.colossus;

    if (colossusImg && colossusImg.complete && colossusImg.naturalWidth > 0) {
      const t = renderer?.time || this.walkPhase || 0;
      const shakeX = this.hurtTimer > 0 ? Math.round(Math.sin(this.hurtTimer * 58) * 5) : 0;
      const sinkY = this.isDead
        ? Math.round(Math.min(1, (this.deathTimer || 0) / 1.55) * 290)
        : 0;
      const slumpX = !this.isDead && this.vulnerableTimer > 0 ? 24 : 0;
      const slumpY = !this.isDead && this.vulnerableTimer > 0 ? 28 : 0;
      const breatheY = !this.isDead ? Math.round(Math.sin(t * 2.6) * 5) : 0;

      const torsoSize = 456;
      const torsoX = Math.round(this.anchorX - 255 + shakeX + slumpX);
      const torsoY = Math.round(654 - torsoSize + breatheY + slumpY + sinkY);
      const useOverchargedTorso =
        this.bossPhase >= 2 ||
        this.vulnerableTimer > 0 ||
        this.state === 'SKILL' ||
        this.state === 'ULTIMATE';
      const torsoCellSx = useOverchargedTorso ? 512 : 0;

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      if (this.isDead && this.deathTimer > 1.1) {
        ctx.globalAlpha *= Math.max(0.14, 1 - (this.deathTimer - 1.1) * 0.65);
      }

      // 1. Abyssal Caldera Rim Glow underneath Colossal Boss on the Left Edge
      ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
      ctx.fillRect(torsoX + 24, 616, torsoSize - 48, 38);

      // 2. Rear Articulated Siege-Claw (`Cell 2`: sx = 1024) behind right shoulder
      const rearClawSz = 224;
      const rearClawX = Math.round(torsoX + 236 + Math.cos(t * 2.2) * 8);
      const rearClawY = Math.round(torsoY + 132 + Math.sin(t * 2.8) * 7);
      ctx.drawImage(colossusImg, 1024, 0, 512, 512, rearClawX, rearClawY, rearClawSz, rearClawSz);

      // 3. Towering Colossal Sovereign Torso, Horned Skull & Blazing Ribcage Heart-Core (`456x456`)
      ctx.drawImage(colossusImg, torsoCellSx, 0, 512, 512, torsoX, torsoY, torsoSize, torsoSize);

      // Subtle <=0.20 additive hit-flash on torso impact
      if (this.hitFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.20, this.hitFlash * 1.4);
        ctx.drawImage(colossusImg, 512, 0, 512, 512, torsoX, torsoY, torsoSize, torsoSize);
        ctx.restore();
      }

      // 4. Exposed Molten Heart-Core Target Reticle during Punish Window (`+45% DMG`)
      if (!this.isDead && this.vulnerableTimer > 0) {
        const coreX = Math.round(torsoX + 246);
        const coreY = Math.round(torsoY + 246);
        const pulseR = 26 + Math.round(Math.sin(t * 14) * 5);
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 2;
        ctx.strokeRect(coreX - pulseR, coreY - pulseR, pulseR * 2, pulseR * 2);
        ctx.strokeStyle = '#fef08a';
        ctx.strokeRect(coreX - pulseR + 5, coreY - pulseR + 5, (pulseR - 5) * 2, (pulseR - 5) * 2);
      }

      // 5. Foreground Articulated Siege-Claw (`Cell 2`: sx = 1024) OR Crashing Vertical Fist (`Cell 3`: sx = 1536)
      if (!this.isDead) {
        if (this.fistVisible) {
          const fistSz = 248;
          const fx = Math.round(this.fistWorldX - fistSz * 0.5);
          const fy = Math.round(this.fistWorldY - fistSz + 26);
          // Grounded 2.5D shadow beneath the airborne fist
          ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
          ctx.beginPath();
          ctx.ellipse(
            Math.round(this.fistWorldX),
            Math.round(this.fistShadowGy - 4),
            56,
            16,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.drawImage(colossusImg, 1536, 0, 512, 512, fx, fy, fistSz, fistSz);
        } else {
          const clawSz = this.rakeActive || this.rakeWarnOnly ? 276 : 248;
          const cx = Math.round(this.clawWorldX - clawSz * 0.45);
          const cy = Math.round(this.clawWorldY - clawSz * 0.62);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
          ctx.fillRect(Math.round(this.clawWorldX - 48), Math.round(this.clawWorldY + 14), 96, 8);
          ctx.drawImage(colossusImg, 1024, 0, 512, 512, cx, cy, clawSz, clawSz);
        }
      }

      ctx.restore();
    } else {
      super.draw(ctx, false, renderer);
      return;
    }

    // 6. Colossal Boss Phase & Telegraph Callout Plate above Crown
    if (!this.isDead) {
      const bx = Math.round(this.anchorX - 18);
      const by = 192;
      const barW = 148;
      const barH = 8;
      const x0 = bx - Math.floor(barW * 0.5);
      const hpPct = Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));

      ctx.save();
      if (this.telegraphTimer > 0 && this.telegraphLabel) {
        ctx.font = '8px "ArcanePixel", "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const tw = Math.max(108, this.telegraphLabel.length * 6 + 14);
        ctx.fillStyle = '#090512';
        ctx.fillRect(bx - Math.floor(tw * 0.5), by - 26, tw, 14);
        ctx.strokeStyle = this.vulnerableTimer > 0 ? '#67e8f9' : '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx - Math.floor(tw * 0.5), by - 26, tw, 14);
        ctx.fillStyle = this.vulnerableTimer > 0 ? '#ecfeff' : '#fef08a';
        ctx.fillText(this.telegraphLabel, bx, by - 16);
      } else {
        ctx.font = '7px "ArcanePixel", "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fca5a5';
        ctx.fillText(`★ COLOSSUS • PHASE ${this.bossPhase || 1} ★`, bx, by - 6);
      }

      ctx.fillStyle = '#05070e';
      ctx.fillRect(x0 - 1, by - 1, barW + 2, barH + 2);
      ctx.strokeStyle = this.vulnerableTimer > 0 ? '#67e8f9' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 - 1, by - 1, barW + 2, barH + 2);
      ctx.fillStyle = this.vulnerableTimer > 0 ? '#38bdf8' : '#dc2626';
      ctx.fillRect(x0, by, Math.round(barW * hpPct), barH);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
      ctx.fillRect(x0, by, Math.round(barW * hpPct), 2);
      ctx.restore();
    }
  }
}
