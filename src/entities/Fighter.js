export class Fighter {
  constructor(opts) {
    this.name = opts.name;
    this.x = opts.x;
    this.y = opts.groundY;
    this.groundY = opts.groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = opts.facing || 1;

    this.maxHp = opts.maxHp || 1000;
    this.hp = this.maxHp;
    this.mana = 0;
    this.maxMana = 100;
    this.isDead = false;

    this.attackRange = opts.attackRange || 90;
    this.moveSpeed = opts.moveSpeed || 155;
    this.lightColor = opts.lightColor || 'rgba(56, 189, 248, 1)';
    this.primaryColor = opts.primaryColor || '#38bdf8';

    // State Machine: IDLE, WALK, AUTO_ATTACK, SKILL, ULTIMATE
    this.state = 'IDLE';
    this.stateTimer = 0;
    this.didActionFrame = false;

    this.autoCooldown = 0;
    this.autoInterval = opts.autoInterval || 1.25;
    this.skillCooldown = 2.5;
    this.skillMaxCooldown = 5.0;

    // TABS-style Spring / Wobble Rigging
    this.walkPhase = Math.random() * Math.PI * 2;
    this.torsoAngle = 0;
    this.torsoVel = 0;
    this.headBob = 0;
    this.armAngle = 0;
    this.armVel = 0;
    this.hitFlash = 0;

    // 5-node Verlet-like Cape / Cloth Trail
    this.capeNodes = Array.from({ length: 5 }, (_, i) => ({
      x: this.x - this.facing * i * 9,
      y: this.y - 52 + i * 9
    }));
  }

  setState(newState) {
    this.state = newState;
    this.stateTimer = 0;
    this.didActionFrame = false;
  }

  gainMana(amount) {
    if (this.isDead || this.state === 'ULTIMATE') return;
    this.mana = Math.min(this.maxMana, this.mana + amount);
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 90, knockY = -80) {
    if (this.isDead) return;
    // Deflect or reduce damage during Whirlwind Dash
    if (this.isDeflecting) {
      amount *= 0.25;
      knockX *= 0.2;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.16;
    this.gainMana(amount * 0.12);
    if (attacker) attacker.gainMana(11);

    const dir = attacker ? Math.sign(this.x - attacker.x) || -this.facing : -this.facing;
    this.vx += dir * knockX;
    if (this.y >= this.groundY - 2 && knockY < 0) {
      this.vy = knockY;
    }
    // TABS wobble recoil impulse
    this.torsoVel += dir * 9.5;
    this.armVel -= 12;

    if (this.game) {
      this.game.vfx.spawnDamageText(this.x, this.y - 75, amount, isCrit);
      this.game.vfx.spawnBurst(this.x, this.y - 45, isCrit ? 16 : 8, this.primaryColor, 170);
      if (isCrit) {
        this.game.renderer.triggerShake(11, 0.24);
        this.game.renderer.triggerAberration(9);
        this.game.renderer.triggerHitStop(0.05);
      }
    }

    if (this.hp <= 0) {
      this.isDead = true;
      this.vy = -220;
      this.vx = dir * 240;
      this.torsoVel = dir * 18;
      if (this.game) {
        this.game.renderer.triggerShake(18, 0.5);
        this.game.renderer.triggerAberration(14);
        this.game.onFighterDeath(this);
      }
    }
  }

  update(dt, enemy, game) {
    this.game = game;
    this.groundY = game.renderer.groundY;

    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);

    // Passive mana trickle
    if (!this.isDead && this.state !== 'ULTIMATE') {
      this.gainMana(dt * 4.5);
    }

    // Physics integration & Gravity
    this.vy += 980 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.vy = 0;
      this.vx *= Math.pow(0.001, dt);
    } else {
      this.vx *= Math.pow(0.25, dt);
    }

    // Arena boundaries
    const margin = 70;
    this.x = Math.max(margin, Math.min(game.renderer.width - margin, this.x));

    // Update Cape Physics
    this.updateCape(dt);

    if (this.isDead) {
      this.torsoAngle += (Math.PI * 0.48 * -this.facing - this.torsoAngle) * 6 * dt;
      return;
    }

    // Face opponent unless mid-whirlwind
    if (enemy && this.state !== 'ULTIMATE') {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    // Cooldowns
    this.autoCooldown = Math.max(0, this.autoCooldown - dt);
    this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    this.stateTimer += dt;

    // TABS Spring-damper torso physics
    const targetTorso = this.getTargetTorsoAngle();
    const springK = 130;
    const damping = 11;
    const force = (targetTorso - this.torsoAngle) * springK - this.torsoVel * damping;
    this.torsoVel += force * dt;
    this.torsoAngle += this.torsoVel * dt;

    // Ambient Aura Particles
    if (Math.random() < 0.35) {
      game.vfx.spawnParticle({
        x: this.x + (Math.random() - 0.5) * 34,
        y: this.y - Math.random() * 60,
        vx: (Math.random() - 0.5) * 18,
        vy: -35 - Math.random() * 35,
        size: 3.5,
        color: this.primaryColor,
        maxLife: 0.55
      });
    }

    // AI Decision & State Machine
    const dist = enemy ? Math.abs(enemy.x - this.x) : 999;

    if (this.state === 'IDLE' || this.state === 'WALK') {
      if (enemy && !enemy.isDead) {
        if (this.mana >= this.maxMana) {
          this.mana = 0;
          this.setState('ULTIMATE');
          game.triggerUltimateCinematic(this);
          return;
        }
        if (this.skillCooldown <= 0 && dist <= this.attackRange * 2.1) {
          this.skillCooldown = this.skillMaxCooldown;
          this.setState('SKILL');
          return;
        }
        if (dist <= this.attackRange) {
          if (this.autoCooldown <= 0) {
            this.autoCooldown = this.autoInterval;
            this.setState('AUTO_ATTACK');
            return;
          }
          this.state = 'IDLE';
        } else {
          this.state = 'WALK';
          this.walkPhase += dt * 11.5;
          // Goofy TABS bouncy stride impulse
          const stride = Math.abs(Math.sin(this.walkPhase));
          this.x += this.facing * this.moveSpeed * (0.55 + stride * 0.75) * dt;
          this.headBob = Math.sin(this.walkPhase * 2) * 5;
        }
      } else {
        this.state = 'IDLE';
      }
    }

    if (this.state === 'IDLE') {
      this.walkPhase += dt * 3.2;
      this.headBob = Math.sin(this.walkPhase) * 2.5;
    } else if (this.state === 'AUTO_ATTACK') {
      this.updateAutoAttack(dt, enemy, game);
    } else if (this.state === 'SKILL') {
      this.updateSkill(dt, enemy, game);
    } else if (this.state === 'ULTIMATE') {
      this.updateUltimate(dt, enemy, game);
    }
  }

  getTargetTorsoAngle() {
    if (this.state === 'WALK') {
      return this.facing * 0.18 + Math.sin(this.walkPhase) * 0.14;
    }
    if (this.state === 'IDLE') {
      return Math.sin(this.walkPhase) * 0.05;
    }
    return 0;
  }

  updateCape(dt) {
    const anchorX = this.x - this.facing * 8;
    const anchorY = this.y - 54 + this.headBob * 0.5;
    this.capeNodes[0].x = anchorX;
    this.capeNodes[0].y = anchorY;

    for (let i = 1; i < this.capeNodes.length; i++) {
      const prev = this.capeNodes[i - 1];
      const cur = this.capeNodes[i];
      const wave = Math.sin(this.walkPhase * 1.8 - i * 0.9) * 35;
      cur.x += (-this.facing * 45 - this.vx * 0.25 + wave) * dt;
      cur.y += (140 + i * 15) * dt;

      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const d = Math.hypot(dx, dy) || 1;
      const segLen = 11;
      if (d > segLen) {
        cur.x = prev.x + (dx / d) * segLen;
        cur.y = prev.y + (dy / d) * segLen;
      }
    }
  }
}
