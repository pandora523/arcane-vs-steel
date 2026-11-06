import { Renderer } from './engine/Renderer.js';
import { VFXManager } from './engine/VFXManager.js';
import { PixelForge } from './engine/PixelForge.js';
import { AudioManager } from './engine/AudioManager.js';
import { Warrior } from './entities/Warrior.js';
import { FireMage } from './entities/FireMage.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('arena-canvas');
    this.renderer = new Renderer(this.canvas);
    this.vfx = new VFXManager();
    this.audio = new AudioManager();
    PixelForge.initAssets();

    this.userSlowMo = false;
    this.ultSlowTimer = 0;
    this.matchTime = 0;
    this.hudTimer = 0;
    this.isMatchOver = false;

    this.bindUI();
    this.resetMatch();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  bindUI() {
    this.btnSfx = document.getElementById('btn-sfx');
    this.sfxLabel = document.getElementById('sfx-label');
    this.btnSlowMo = document.getElementById('btn-slowmo');
    this.btnReset = document.getElementById('btn-reset');
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.ultBanner = document.getElementById('ult-banner');
    this.victoryOverlay = document.getElementById('victory-overlay');
    this.timerEl = document.getElementById('match-timer');

    const cacheHUD = (p) => ({
      hpBar: document.getElementById(`${p}-hp-bar`),
      hpDmg: document.getElementById(`${p}-hp-dmg`),
      hpText: document.getElementById(`${p}-hp-text`),
      state: document.getElementById(`${p}-state`),
      manaBar: document.getElementById(`${p}-mana-bar`),
      ultLabel: document.getElementById(`${p}-ult-label`),
      skillCd: document.getElementById(`${p}-skill-cd`),
      skillText: document.getElementById(`${p}-skill-text`)
    });
    this.hudEls = {
      warrior: cacheHUD('warrior'),
      mage: cacheHUD('mage')
    };

    if (this.btnSfx) {
      this.btnSfx.addEventListener('click', () => {
        const on = this.audio.toggle();
        this.btnSfx.setAttribute('aria-pressed', String(on));
        this.sfxLabel.textContent = on ? 'SFX ON' : 'SFX OFF';
      });
    }

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
    this.ultSlowTimer = 0.55;
    this.renderer.triggerUltimateCamera(caster.x, caster.y - 60);

    document.getElementById('ult-caster').textContent = caster.name.toUpperCase();
    document.getElementById('ult-name').textContent = caster.ultName;
    this.ultBanner.classList.remove('hidden');

    clearTimeout(this.ultBannerTimeout);
    this.ultBannerTimeout = setTimeout(() => {
      this.ultBanner.classList.add('hidden');
    }, 1400);
  }

  onFighterDeath(deadFighter) {
    if (this.isMatchOver) return;
    this.isMatchOver = true;
    this.updateHUD();
    const winner = deadFighter === this.warrior ? this.mage : this.warrior;
    document.getElementById('victory-winner').textContent = `${winner.name.toUpperCase()} TRIUMPHS`;
    document.getElementById('victory-stats').textContent =
      winner === this.warrior
        ? 'Steel cleaves through the arcane tempest!'
        : 'Arcane fire reduces steel to molten ash!';
    setTimeout(() => {
      if (this.isMatchOver) this.victoryOverlay.classList.remove('hidden');
    }, 850);
  }

  updateProjectiles(dt) {
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;

    for (let i = this.vfx.projectiles.length - 1; i >= 0; i--) {
      const p = this.vfx.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (Math.random() < 0.65) {
        this.vfx.spawnParticle({
          x: p.x + (Math.random() - 0.5) * p.radius,
          y: p.y + (Math.random() - 0.5) * p.radius,
          vx: -p.vx * 0.15 + (Math.random() - 0.5) * 40,
          vy: -p.vy * 0.15 - 25,
          size: p.isMeteor ? 15 : 6,
          color: Math.random() > 0.3 ? p.color : '#fef08a',
          maxLife: p.isMeteor ? 0.48 : 0.28
        });
      }

      const enemy = p.owner === this.warrior ? this.mage : this.warrior;
      const hitEnemy =
        enemy &&
        !enemy.isDead &&
        Math.hypot(p.x - enemy.x, p.y - (enemy.y - 44)) < p.radius + 32;
      const hitGround = p.y >= gy - 4;

      if (hitEnemy || hitGround) {
        if (p.isMeteor) {
          this.renderer.triggerShake(26, 0.65);
          this.renderer.triggerAberration(16);
          this.vfx.spawnShockwave(p.x, gy, 330, '#fb923c', 0.65, true);
          this.vfx.spawnShockwave(p.x, gy - 35, 250, '#fef08a', 0.5, false);
          this.vfx.spawnDecal(p.x, 180, 'fissure', '#fb923c', 6.5);
          this.vfx.spawnBurst(p.x, gy - 15, 36, '#fb923c', 410, { upBias: 175, size: 10 });
          this.vfx.spawnBurst(p.x, gy - 15, 24, '#fef08a', 330, { upBias: 140, size: 8 });

          if (enemy && !enemy.isDead && Math.abs(enemy.x - p.x) < 310) {
            enemy.takeDamage(p.damage, p.owner, true, 240, -380);
            this.renderer.triggerHitStop(0.09);
          }
        } else if (hitEnemy) {
          const isCrit = Math.random() < 0.28;
          enemy.takeDamage(isCrit ? p.damage * 1.45 : p.damage, p.owner, isCrit, 110, 0);
          this.audio.play('clang');
          this.renderer.triggerHitStop(0.055);
          this.vfx.spawnShockwave(p.x, p.y, 68, p.color, 0.25);
          this.vfx.spawnBurst(p.x, p.y, 10, p.color, 200);
        } else {
          this.vfx.spawnDecal(p.x, 42, 'scorch', p.color, 3.5);
          this.vfx.spawnBurst(p.x, gy, 7, p.color, 140, { upBias: 70 });
        }
        this.vfx.projectiles.splice(i, 1);
      } else if (p.x < -300 || p.x > ww + 300) {
        this.vfx.projectiles.splice(i, 1);
      }
    }
  }

  updateHUD() {
    const sync = (els, f) => {
      const hpPct = Math.max(0, (f.hp / f.maxHp) * 100);
      const manaPct = Math.min(100, (f.mana / f.maxMana) * 100);
      els.hpBar.style.width = `${hpPct}%`;
      els.hpDmg.style.width = `${hpPct}%`;
      els.hpText.textContent = `${Math.ceil(f.hp)}`;
      els.state.textContent = f.isDead ? 'DEFEATED' : f.state;
      els.manaBar.style.width = `${manaPct}%`;
      els.ultLabel.textContent = `OVERDRIVE ${Math.floor(manaPct)}%`;

      const cdPct = ((f.skillMaxCooldown - f.skillCooldown) / f.skillMaxCooldown) * 100;
      els.skillCd.style.width = `${cdPct}%`;
      els.skillText.textContent =
        f.skillCooldown <= 0 ? `${f.skillName}` : `${f.skillCooldown.toFixed(1)}s`;
    };

    sync(this.hudEls.warrior, this.warrior);
    sync(this.hudEls.mage, this.mage);

    const mins = String(Math.floor(this.matchTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.matchTime % 60)).padStart(2, '0');
    this.timerEl.textContent = `${mins}:${secs}`;
  }

  loop(now) {
    const rawDt = Math.min(0.033, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.renderer.update(rawDt, this.fighters);

    let timeScale = 1.0;
    if (this.renderer.hitStopTimer > 0) {
      timeScale = 0.08;
    } else if (this.ultSlowTimer > 0) {
      this.ultSlowTimer = Math.max(0, this.ultSlowTimer - rawDt);
      timeScale = 0.28;
    } else if (this.userSlowMo) {
      timeScale = 0.35;
    }

    const dt = rawDt * timeScale;
    if (!this.isMatchOver) this.matchTime += dt;

    this.warrior.update(dt, this.mage, this);
    this.mage.update(dt, this.warrior, this);
    this.updateProjectiles(dt);
    this.vfx.update(dt, this.renderer.groundY, this.renderer);

    this.hudTimer += rawDt;
    if (this.hudTimer >= 0.06) {
      this.hudTimer = 0;
      this.updateHUD();
    }

    this.renderer.render(this.fighters, this.vfx);
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => new Game());
