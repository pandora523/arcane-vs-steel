import { Renderer } from './engine/Renderer.js';
import { VFXManager } from './engine/VFXManager.js';
import { Warrior } from './entities/Warrior.js';
import { FireMage } from './entities/FireMage.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('arena-canvas');
    this.renderer = new Renderer(this.canvas);
    this.vfx = new VFXManager();

    this.userSlowMo = false;
    this.ultSlowTimer = 0;
    this.matchTime = 0;
    this.isMatchOver = false;

    this.bindUI();
    this.resetMatch();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  bindUI() {
    this.btnSlowMo = document.getElementById('btn-slowmo');
    this.btnReset = document.getElementById('btn-reset');
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.ultBanner = document.getElementById('ult-banner');
    this.victoryOverlay = document.getElementById('victory-overlay');

    this.btnSlowMo.addEventListener('click', () => {
      this.userSlowMo = !this.userSlowMo;
      this.btnSlowMo.setAttribute('aria-pressed', String(this.userSlowMo));
    });

    this.btnReset.addEventListener('click', () => this.resetMatch());
    this.btnPlayAgain.addEventListener('click', () => this.resetMatch());
  }

  resetMatch() {
    this.vfx.clear();
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;

    // Spawn 720 units apart across the 1200-unit arena
    this.warrior = new Warrior(ww * 0.2, gy);
    this.mage = new FireMage(ww * 0.8, gy);
    this.fighters = [this.warrior, this.mage];

    this.matchTime = 0;
    this.ultSlowTimer = 0;
    this.isMatchOver = false;
    this.victoryOverlay.classList.add('hidden');
    this.ultBanner.classList.add('hidden');
    this.updateHUD();
  }

  triggerUltimateCinematic(caster) {
    this.ultSlowTimer = 0.6;
    this.renderer.triggerUltimateCamera(caster.x, caster.y - 60);

    document.getElementById('ult-caster').textContent = caster.name.toUpperCase();
    document.getElementById('ult-name').textContent = caster.ultName;
    this.ultBanner.classList.remove('hidden');

    clearTimeout(this.ultBannerTimeout);
    this.ultBannerTimeout = setTimeout(() => {
      this.ultBanner.classList.add('hidden');
    }, 1500);
  }

  onFighterDeath(deadFighter) {
    if (this.isMatchOver) return;
    this.isMatchOver = true;
    const winner = deadFighter === this.warrior ? this.mage : this.warrior;
    document.getElementById('victory-winner').textContent = `${winner.name.toUpperCase()} TRIUMPHS`;
    document.getElementById('victory-stats').textContent =
      winner === this.warrior
        ? 'Steel cleaves through the arcane tempest!'
        : 'Arcane fire reduces steel to molten ash!';
    setTimeout(() => {
      if (this.isMatchOver) this.victoryOverlay.classList.remove('hidden');
    }, 900);
  }

  updateProjectiles(dt) {
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;

    for (let i = this.vfx.projectiles.length - 1; i >= 0; i--) {
      const p = this.vfx.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (Math.random() < 0.8) {
        this.vfx.spawnParticle({
          x: p.x + (Math.random() - 0.5) * p.radius,
          y: p.y + (Math.random() - 0.5) * p.radius,
          vx: -p.vx * 0.15 + (Math.random() - 0.5) * 40,
          vy: -p.vy * 0.15 - 30,
          size: p.isMeteor ? 16 : 6.5,
          color: Math.random() > 0.3 ? p.color : '#fef08a',
          maxLife: p.isMeteor ? 0.55 : 0.32
        });
      }

      const enemy = p.owner === this.warrior ? this.mage : this.warrior;
      const hitEnemy =
        enemy &&
        !enemy.isDead &&
        Math.hypot(p.x - enemy.x, p.y - (enemy.y - 42)) < p.radius + 28;
      const hitGround = p.y >= gy - 4;

      if (hitEnemy || hitGround) {
        if (p.isMeteor) {
          this.renderer.triggerShake(28, 0.7);
          this.renderer.triggerAberration(18);
          this.renderer.triggerHitStop(0.09);
          this.vfx.spawnShockwave(p.x, gy, 320, '#fb923c', 0.7, true);
          this.vfx.spawnShockwave(p.x, gy - 35, 240, '#fef08a', 0.55, false);
          this.vfx.spawnDecal(p.x, 175, 'fissure', '#fb923c', 7.0);
          this.vfx.spawnBurst(p.x, gy - 15, 50, '#fb923c', 420, { upBias: 180, size: 11 });
          this.vfx.spawnBurst(p.x, gy - 15, 32, '#fef08a', 340, { upBias: 150, size: 8 });

          if (enemy && !enemy.isDead && Math.abs(enemy.x - p.x) < 280) {
            enemy.takeDamage(p.damage, p.owner, true, 270, -420);
          }
        } else if (hitEnemy) {
          const isCrit = Math.random() < 0.25;
          enemy.takeDamage(isCrit ? p.damage * 1.45 : p.damage, p.owner, isCrit, 125, -75);
          this.vfx.spawnShockwave(p.x, p.y, 65, p.color, 0.28);
          this.vfx.spawnBurst(p.x, p.y, 12, p.color, 210);
        } else {
          this.vfx.spawnDecal(p.x, 42, 'scorch', p.color, 3.5);
          this.vfx.spawnBurst(p.x, gy, 9, p.color, 150, { upBias: 80 });
        }
        this.vfx.projectiles.splice(i, 1);
      } else if (p.x < -300 || p.x > ww + 300) {
        this.vfx.projectiles.splice(i, 1);
      }
    }
  }

  updateHUD() {
    const updateFighterHUD = (prefix, f) => {
      const hpPct = Math.max(0, (f.hp / f.maxHp) * 100);
      const manaPct = Math.min(100, (f.mana / f.maxMana) * 100);
      document.getElementById(`${prefix}-hp-bar`).style.width = `${hpPct}%`;
      document.getElementById(`${prefix}-hp-dmg`).style.width = `${hpPct}%`;
      document.getElementById(`${prefix}-hp-text`).textContent = `${Math.ceil(f.hp)}`;
      document.getElementById(`${prefix}-state`).textContent = f.isDead ? 'DEFEATED' : f.state;
      document.getElementById(`${prefix}-mana-bar`).style.width = `${manaPct}%`;
      document.getElementById(`${prefix}-ult-label`).textContent = `ULT ${Math.floor(manaPct)}%`;

      const cdPct = ((f.skillMaxCooldown - f.skillCooldown) / f.skillMaxCooldown) * 100;
      document.getElementById(`${prefix}-skill-cd`).style.width = `${cdPct}%`;
      document.getElementById(`${prefix}-skill-text`).textContent =
        f.skillCooldown <= 0 ? `${f.skillName}` : `${f.skillName} ${f.skillCooldown.toFixed(1)}s`;
    };

    updateFighterHUD('warrior', this.warrior);
    updateFighterHUD('mage', this.mage);

    const mins = String(Math.floor(this.matchTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.matchTime % 60)).padStart(2, '0');
    document.getElementById('match-timer').textContent = `${mins}:${secs}`;
  }

  loop(now) {
    const rawDt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.renderer.update(rawDt, this.fighters);

    if (this.renderer.hitStop > 0) {
      this.renderer.hitStop = Math.max(0, this.renderer.hitStop - rawDt);
      this.renderer.render(this.fighters, this.vfx);
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    let timeScale = 1.0;
    if (this.ultSlowTimer > 0) {
      this.ultSlowTimer = Math.max(0, this.ultSlowTimer - rawDt);
      timeScale = 0.25;
    } else if (this.userSlowMo) {
      timeScale = 0.35;
    }

    const dt = rawDt * timeScale;
    if (!this.isMatchOver) this.matchTime += dt;

    this.warrior.update(dt, this.mage, this);
    this.mage.update(dt, this.warrior, this);
    this.updateProjectiles(dt);
    this.vfx.update(dt, this.renderer.groundY, this.renderer);

    this.updateHUD();
    this.renderer.render(this.fighters, this.vfx);

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => new Game());
