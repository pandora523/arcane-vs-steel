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

    this.selectedHero = 'warrior';
    this.playerHero = 'warrior';
    this.isLandingOpen = true;
    this.surgeCooldown = 0;

    this.bindUI();
    this.resetMatch();

    const params = new URLSearchParams(window.location.search);
    const urlHero = params.get('hero');
    if (urlHero === 'warrior' || urlHero === 'mage') {
      this.selectChampion(urlHero, false);
      this.startDuel(urlHero, false);
    }

    const simSec = Number(params.get('sim') || 0);
    const killTarget = params.get('kill');
    if (simSec > 0 || killTarget) {
      this.isLandingOpen = false;
      if (this.landingOverlay) this.landingOverlay.classList.add('hidden');
      this.syncChampionUI();
    }

    if (simSec > 0) {
      const steps = Math.floor(simSec / 0.02);
      for (let i = 0; i < steps; i++) {
        this.stepSimulation(0.02);
      }
      this.updateHUD();
    }
    if (killTarget === 'warrior' || killTarget === 'mage') {
      const victim = killTarget === 'warrior' ? this.warrior : this.mage;
      const attacker = killTarget === 'warrior' ? this.mage : this.warrior;
      victim.takeDamage(9999, attacker, true, 120, 0);
      const dtSec = Number(params.get('dt') || 1.2);
      const steps = Math.floor(dtSec / 0.02);
      for (let i = 0; i < steps; i++) {
        this.stepSimulation(0.02);
      }
      this.updateHUD();
    }

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  bindUI() {
    this.btnSfx = document.getElementById('btn-sfx');
    this.sfxLabel = document.getElementById('sfx-label');
    this.btnSlowMo = document.getElementById('btn-slowmo');
    this.btnReset = document.getElementById('btn-reset');
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.btnOpenSelect = document.getElementById('btn-open-select');
    this.btnVictorySelect = document.getElementById('btn-victory-select');
    this.ultBanner = document.getElementById('ult-banner');
    this.victoryOverlay = document.getElementById('victory-overlay');
    this.landingOverlay = document.getElementById('landing-overlay');
    this.timerEl = document.getElementById('match-timer');

    this.cardWarrior = document.getElementById('card-warrior');
    this.cardMage = document.getElementById('card-mage');
    this.ribbonWarrior = document.getElementById('ribbon-warrior');
    this.ribbonMage = document.getElementById('ribbon-mage');
    this.btnStartDuel = document.getElementById('btn-start-duel');
    this.startDuelText = document.getElementById('start-duel-text');
    this.btnSpectateDuel = document.getElementById('btn-spectate-duel');

    this.previewWarriorCanvas = document.getElementById('preview-warrior');
    this.previewMageCanvas = document.getElementById('preview-mage');

    this.btnCmdSkill = document.getElementById('btn-cmd-skill');
    this.cmdSkillLabel = document.getElementById('cmd-skill-label');
    this.cmdSkillGem = document.getElementById('cmd-skill-gem');
    this.btnCmdUlt = document.getElementById('btn-cmd-ult');
    this.cmdUltLabel = document.getElementById('cmd-ult-label');

    this.badgeWarrior = document.getElementById('warrior-champ-badge');
    this.badgeMage = document.getElementById('mage-champ-badge');

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

    if (this.cardWarrior) {
      this.cardWarrior.addEventListener('click', () => this.selectChampion('warrior'));
      this.cardWarrior.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectChampion('warrior');
        }
      });
    }
    if (this.cardMage) {
      this.cardMage.addEventListener('click', () => this.selectChampion('mage'));
      this.cardMage.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectChampion('mage');
        }
      });
    }

    if (this.btnStartDuel) {
      this.btnStartDuel.addEventListener('click', () => this.startDuel(this.selectedHero));
    }
    if (this.btnSpectateDuel) {
      this.btnSpectateDuel.addEventListener('click', () => this.startDuel(null));
    }
    if (this.btnOpenSelect) {
      this.btnOpenSelect.addEventListener('click', () => this.openLanding());
    }
    if (this.btnVictorySelect) {
      this.btnVictorySelect.addEventListener('click', () => this.openLanding());
    }

    if (this.btnCmdSkill) {
      this.btnCmdSkill.addEventListener('click', () => this.triggerPlayerSkill());
    }
    if (this.btnCmdUlt) {
      this.btnCmdUlt.addEventListener('click', () => this.triggerPlayerUlt());
    }

    window.addEventListener('keydown', (e) => {
      if (this.isLandingOpen || this.isMatchOver) return;
      if (e.code === 'KeyW' || e.code === 'Digit1') {
        this.triggerPlayerSkill();
      } else if (e.code === 'Space' || e.code === 'Digit2') {
        e.preventDefault();
        this.triggerPlayerUlt();
      }
    });

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

  selectChampion(hero, playSound = true) {
    this.selectedHero = hero;
    const isW = hero === 'warrior';
    if (this.cardWarrior) {
      this.cardWarrior.classList.toggle('selected', isW);
      this.cardWarrior.setAttribute('aria-pressed', String(isW));
    }
    if (this.cardMage) {
      this.cardMage.classList.toggle('selected', !isW);
      this.cardMage.setAttribute('aria-pressed', String(!isW));
    }
    if (this.ribbonWarrior) {
      this.ribbonWarrior.textContent = isW ? '★ SELECTED CHAMPION' : 'CLICK TO SELECT';
    }
    if (this.ribbonMage) {
      this.ribbonMage.textContent = !isW ? '★ SELECTED CHAMPION' : 'CLICK TO SELECT';
    }
    if (this.startDuelText) {
      this.startDuelText.textContent = isW
        ? 'ENTER SANCTUARY AS AETHELGARD'
        : 'ENTER SANCTUARY AS IGNIS SOL';
    }
    if (playSound && this.audio) {
      this.audio.play(isW ? 'slash' : 'fireball', isW ? 320 : 880);
    }
  }

  startDuel(hero, playSound = true) {
    this.playerHero = hero;
    this.isLandingOpen = false;
    if (this.landingOverlay) this.landingOverlay.classList.add('hidden');
    this.syncChampionUI();
    this.resetMatch();
    if (playSound && this.audio) {
      this.audio.play('ult_cast', 600);
    }
  }

  openLanding() {
    this.isLandingOpen = true;
    this.victoryOverlay.classList.add('hidden');
    if (this.landingOverlay) this.landingOverlay.classList.remove('hidden');
  }

  syncChampionUI() {
    const isW = this.playerHero === 'warrior';
    const isM = this.playerHero === 'mage';
    if (this.badgeWarrior) this.badgeWarrior.classList.toggle('hidden', !isW);
    if (this.badgeMage) this.badgeMage.classList.toggle('hidden', !isM);

    const hasPlayer = isW || isM;
    if (this.btnCmdSkill) {
      this.btnCmdSkill.classList.toggle('hidden', !hasPlayer);
      this.btnCmdSkill.classList.toggle('skill-arcane', isM);
    }
    if (this.cmdSkillGem) {
      this.cmdSkillGem.className = `gem-indicator ${isM ? 'gem-orange' : 'gem-cyan'}`;
    }
    if (this.btnCmdUlt) {
      this.btnCmdUlt.classList.toggle('hidden', !hasPlayer);
    }
  }

  getPlayerFighter() {
    if (this.playerHero === 'warrior') return this.warrior;
    if (this.playerHero === 'mage') return this.mage;
    return null;
  }

  triggerPlayerSkill() {
    const f = this.getPlayerFighter();
    if (!f || f.isDead || f.state === 'ULTIMATE' || f.state === 'SKILL') return;
    if (f.skillCooldown <= 0) {
      f.skillCooldown = f.skillMaxCooldown;
      f.setState('SKILL');
      this.vfx.spawnDamageText(f.x, f.y - 135, 0, false, `${f.skillName}!`);
    }
  }

  triggerPlayerUlt() {
    const f = this.getPlayerFighter();
    if (!f || f.isDead || f.state === 'ULTIMATE') return;
    if (f.mana >= f.maxMana) {
      f.mana = 0;
      f.setState('ULTIMATE');
      this.triggerUltimateCinematic(f);
    } else if (this.surgeCooldown <= 0) {
      this.surgeCooldown = 5.0;
      f.gainMana(38);
      if (this.audio) this.audio.play('reflect', f.x);
      this.vfx.spawnShockwave(f.x, f.y - 55, 95, '#facc15', 0.35, true);
      this.vfx.spawnDamageText(f.x, f.y - 135, 0, false, 'OVERDRIVE SURGE +38%!');
      this.updateHUD();
    }
  }

  renderChampionPreviews(now) {
    if (!this.isLandingOpen) return;
    const assets = PixelForge.initAssets();
    const t = now * 0.001;

    const drawPreview = (canvas, sheet, isWarrior, isSelected) => {
      if (!canvas || !sheet || !sheet.complete || !sheet.naturalWidth) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      // Cycle smoothly between combat-ready idle and signature attack when selected
      let frameIdx = Math.floor(t * 6.5) % 8;
      if (isSelected) {
        const cycle = t % 4.2;
        if (cycle > 2.6 && cycle < 3.6) {
          const atkStep = Math.min(7, Math.floor(((cycle - 2.6) / 1.0) * 8));
          frameIdx = 16 + atkStep;
        }
      }
      const col = frameIdx % 8;
      const row = (frameIdx / 8) | 0;
      const hover = isWarrior ? 0 : Math.round(Math.sin(t * 3.2) * 4);
      ctx.drawImage(sheet, col * 128, row * 128, 128, 128, 8, 10 + hover, 144, 144);
    };

    drawPreview(
      this.previewWarriorCanvas,
      assets.warrior.sheet,
      true,
      this.selectedHero === 'warrior'
    );
    drawPreview(
      this.previewMageCanvas,
      assets.mage.sheet,
      false,
      this.selectedHero === 'mage'
    );
  }

  resetMatch() {
    this.vfx.clear();
    clearTimeout(this.victoryTimeout);
    clearTimeout(this.ultBannerTimeout);
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;

    this.warrior = new Warrior(ww * 0.2, gy);
    this.mage = new FireMage(ww * 0.8, gy);
    this.fighters = [this.warrior, this.mage];

    this.matchTime = 0;
    this.ultSlowTimer = 0;
    this.surgeCooldown = 0;
    this.isMatchOver = false;
    this.victoryOverlay.classList.add('hidden');
    this.ultBanner.classList.add('hidden');
    this.syncChampionUI();
    this.updateHUD();
  }

  triggerUltimateCinematic(caster) {
    this.ultSlowTimer = 0.55;
    this.renderer.triggerUltimateCamera(caster.x, caster.y - 60);
    if (this.audio) this.audio.play('ult_cast', caster.x);

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
    this.ultSlowTimer = 0.65;
    this.updateHUD();

    if (this.audio) {
      this.audio.play(
        deadFighter === this.warrior ? 'death_warrior' : 'death_mage',
        deadFighter.x
      );
    }

    const winner = deadFighter === this.warrior ? this.mage : this.warrior;
    document.getElementById('victory-winner').textContent = `${winner.name.toUpperCase()} TRIUMPHS`;
    document.getElementById('victory-stats').textContent =
      winner === this.warrior
        ? 'Steel cleaves through the arcane tempest!'
        : 'Arcane fire reduces steel to molten ash!';
    clearTimeout(this.victoryTimeout);
    this.victoryTimeout = setTimeout(() => {
      if (this.isMatchOver) {
        this.victoryOverlay.classList.remove('hidden');
        if (this.audio) this.audio.play('victory_fanfare');
      }
    }, 1650);
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
          if (this.audio) this.audio.play('meteor_impact', p.x);
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
          if (this.audio) this.audio.play(isCrit ? 'hit_crit' : 'clang', enemy.x);
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

    const pf = this.getPlayerFighter();
    if (pf && this.cmdSkillLabel && this.cmdUltLabel) {
      this.cmdSkillLabel.textContent =
        pf.skillCooldown <= 0 ? `[W] ${pf.skillName}` : `[W] ${pf.skillCooldown.toFixed(1)}s`;
      this.cmdUltLabel.textContent =
        pf.mana >= pf.maxMana
          ? `[SPACE] ${pf.ultName.split(' ')[0]}!`
          : this.surgeCooldown <= 0
            ? `[SPACE] +38% SURGE`
            : `[SPACE] ${this.surgeCooldown.toFixed(1)}s`;
    }

    const mins = String(Math.floor(this.matchTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.matchTime % 60)).padStart(2, '0');
    this.timerEl.textContent = `${mins}:${secs}`;
  }

  stepSimulation(rawDt) {
    this.renderer.update(rawDt, this.fighters);

    if (this.isLandingOpen) {
      // Gently animate idle breathing in the background cathedral while on the Landing Screen
      this.warrior.walkPhase += rawDt * 2.4;
      this.mage.runeOrbit += rawDt * 2.2;
      return;
    }

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
    if (!this.isMatchOver) {
      this.matchTime += dt;
      if (this.surgeCooldown > 0) this.surgeCooldown = Math.max(0, this.surgeCooldown - dt);
      const pf = this.getPlayerFighter();
      if (pf && !pf.isDead && pf.state !== 'ULTIMATE') {
        // Champion's Blessing: subtle bonus Overdrive generation for the player's chosen hero
        pf.gainMana(dt * 1.4);
      }
    }

    this.warrior.update(dt, this.mage, this);
    this.mage.update(dt, this.warrior, this);
    this.updateProjectiles(dt);
    this.vfx.update(dt, this.renderer.groundY, this.renderer);
  }

  loop(now) {
    const rawDt = Math.min(0.033, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.stepSimulation(rawDt);
    this.renderChampionPreviews(now);

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
