import { Fighter } from './Fighter.js';

export class FireMage extends Fighter {
  constructor(x, groundY) {
    super({
      name: 'Ignis Sol',
      x,
      groundY,
      facing: -1,
      maxHp: 950,
      attackRange: 470,
      moveSpeed: 145,
      autoInterval: 1.35,
      lightColor: 'rgba(251, 146, 60, 1)',
      primaryColor: '#fb923c'
    });
    this.ultName = 'METEOR CATACLYSM';
    this.skillName = 'Flame Pillar';
    this.staffAngle = 0.25;
    this.runeOrbit = 0;
  }

  update(dt, enemy, game) {
    this.runeOrbit += dt * 2.8;
    // Active ranged kiting: keep comfortable distance from Warrior
    if (enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 230) {
        this.x -= this.facing * this.moveSpeed * 0.9 * dt;
      }
    }
    super.update(dt, enemy, game);
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.28) {
      this.torsoAngle = -this.facing * 0.25;
      this.staffAngle = -0.55;
    } else if (t < 0.55) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.vx -= this.facing * 125;
        this.torsoVel = -this.facing * 12;
        this.staffAngle = 0.7;

        const spawnX = this.x + this.facing * 36;
        const spawnY = this.y - 48;
        const targetY = enemy ? enemy.y - 44 : spawnY;
        const dx = enemy ? enemy.x - spawnX : this.facing * 450;
        const dy = targetY - spawnY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 560;

        game.vfx.spawnProjectile({
          x: spawnX,
          y: spawnY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: 13,
          color: '#fb923c',
          coreColor: '#fef08a',
          owner: this,
          damage: 58,
          isMeteor: false
        });
        game.vfx.spawnBurst(spawnX, spawnY, 10, '#fb923c', 150);
      }
    } else {
      this.staffAngle = 0.25;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.35) {
      this.staffAngle = -1.1;
      if (!this.didActionFrame && enemy) {
        this.didActionFrame = true;
        // Backstep slightly while summoning pillar
        this.vx -= this.facing * 150;
        game.vfx.spawnFlamePillar(enemy.x + enemy.vx * 0.15, this.groundY, this, enemy);
        game.vfx.spawnShockwave(this.x, this.y - 70, 55, '#fb923c', 0.35);
      }
    } else if (t >= 0.85) {
      this.staffAngle = 0.25;
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    if (t < 0.75) {
      this.vy = -40;
      this.y = Math.max(this.groundY - 125, this.y - 160 * dt);
      this.staffAngle = -1.35;
      this.runeOrbit += dt * 9;

      if (Math.random() < 0.85) {
        const a = Math.random() * Math.PI * 2;
        game.vfx.spawnParticle({
          x: this.x + Math.cos(a) * 55,
          y: this.y - 45 + Math.sin(a) * 55,
          vx: -Math.cos(a) * 90,
          vy: -Math.sin(a) * 90,
          size: 6,
          color: '#facc15',
          maxLife: 0.4
        });
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      const targetX = enemy ? enemy.x : game.renderer.worldWidth * 0.35;
      const startX = this.x - this.facing * 180;
      const startY = -140;
      const dx = targetX - startX;
      const dy = this.groundY - startY;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 780;

      game.vfx.spawnProjectile({
        x: startX,
        y: startY,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        radius: 42,
        color: '#ea580c',
        coreColor: '#fef08a',
        owner: this,
        damage: 225,
        isMeteor: true
      });
    } else if (t >= 1.55) {
      this.staffAngle = 0.25;
      this.setState('IDLE');
    }
  }

  draw(ctx, isReflection = false) {
    ctx.save();

    // 1. Flowing Ember Robe Cloak
    ctx.beginPath();
    ctx.moveTo(this.capeNodes[0].x, this.capeNodes[0].y);
    for (let i = 1; i < this.capeNodes.length; i++) {
      ctx.lineTo(this.capeNodes[i].x, this.capeNodes[i].y);
    }
    ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : '#9a3412';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    if (this.state === 'ULTIMATE' || this.state === 'SKILL') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(0, -45);
      ctx.rotate(this.runeOrbit);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 48, Math.sin(a) * 48, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Bouncy Legs
    const step = this.state === 'WALK' ? Math.sin(this.walkPhase) * 11 : 0;
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-4, -22);
    ctx.lineTo(-6 - step, 0);
    ctx.moveTo(4, -22);
    ctx.lineTo(6 + step, 0);
    ctx.stroke();

    // 3. Spring-Rigged Robe Torso & Hooded Head
    ctx.translate(0, -24 + this.headBob * 0.45);
    ctx.rotate(this.torsoAngle * this.facing);

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#7c2d12';
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, 2);
    ctx.lineTo(-10, -34);
    ctx.lineTo(10, -34);
    ctx.lineTo(15, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(0, -43 + this.headBob * 0.35);
    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#431407';
    ctx.beginPath();
    ctx.moveTo(-13, 8);
    ctx.quadraticCurveTo(-14, -15, 4, -14);
    ctx.quadraticCurveTo(14, -6, 12, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(5, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < 3; i++) {
      const a = this.runeOrbit + i * ((Math.PI * 2) / 3);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 24, -28 + Math.sin(a) * 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Levitating Ember Staff
    ctx.save();
    const floatY = Math.sin(this.runeOrbit * 1.5) * 4;
    ctx.translate(16, -22 + floatY);
    ctx.rotate(this.staffAngle);

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(0, -34);
    ctx.stroke();

    if (!isReflection) {
      ctx.shadowColor = '#fb923c';
      ctx.shadowBlur = 18;
    }
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, -42, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
