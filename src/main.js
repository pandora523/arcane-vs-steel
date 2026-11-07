import { Renderer } from './engine/Renderer.js';
import { VFXManager } from './engine/VFXManager.js';
import { PixelForge } from './engine/PixelForge.js';
import { AudioManager } from './engine/AudioManager.js';
import { Warrior } from './entities/Warrior.js';
import { FireMage } from './entities/FireMage.js';
import { Archer } from './entities/Archer.js';

const CHAMPION_ROSTER = {
  warrior: {
    id: 'warrior',
    name: 'AETHELGARD',
    cls: Warrior,
    theme: 'steel',
    color: '#38bdf8',
    selectSfx: 'slash',
    victoryLine: 'Runeblade steel cleaves through the sanctuary tempest!'
  },
  archer: {
    id: 'archer',
    name: 'SYLVARA',
    cls: Archer,
    theme: 'emerald',
    color: '#34d399',
    selectSfx: 'arrow_shoot',
    victoryLine: 'Supersonic astral arrows pierce through the eclipse!'
  },
  mage: {
    id: 'mage',
    name: 'IGNIS SOL',
    cls: FireMage,
    theme: 'arcane',
    color: '#fb923c',
    selectSfx: 'fireball',
    victoryLine: 'Solar cataclysm reduces all opposition to molten ash!'
  }
};

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

    // Default Matchup: Aethelgard (Warrior) vs. Sylvara (Archer)
    this.slot1Hero = 'warrior';
    this.slot2Hero = 'archer';
    this.activeAssignSlot = 2; // Default cursor on Slot 2 so clicking a 3rd hero pairs them with Fighter 1
    this.isLandingOpen = true;

    this.bindUI();
    this.syncRosterSelectionUI(false);
    this.resetMatch();

    const params = new URLSearchParams(window.location.search);
    const p1 = params.get('p1');
    const p2 = params.get('p2');
    const urlHero = params.get('hero');
    if (p1 && CHAMPION_ROSTER[p1]) this.slot1Hero = p1;
    if (p2 && CHAMPION_ROSTER[p2]) this.slot2Hero = p2;
    if (urlHero && CHAMPION_ROSTER[urlHero]) {
      this.slot1Hero = urlHero;
      this.slot2Hero = urlHero === 'archer' ? 'mage' : 'archer';
    }

    const simSec = Number(params.get('sim') || 0);
    const killTarget = params.get('kill');
    const forceUlt = params.get('ult') === '1';
    const forceCorner = params.get('corner') === '1';
    if (p1 || p2 || urlHero || simSec > 0 || killTarget || forceUlt || forceCorner) {
      this.syncRosterSelectionUI(false);
      this.startDuel(false);
    }

    if (forceCorner) {
      // Place left fighter (e.g. Archer) cornered against the left wall and enemy closing in
      this.leftFighter.x = 105;
      this.rightFighter.x = 265;
      this.rightFighter.setState('ATTACK');
    }

    if (forceUlt) {
      this.leftFighter.mana = this.leftFighter.maxMana;
      this.rightFighter.mana = this.rightFighter.maxMana;
    }

    if (simSec > 0) {
      const steps = Math.floor(simSec / 0.02);
      for (let i = 0; i < steps; i++) {
        this.stepSimulation(0.02);
      }
      this.updateHUD();
    }
    if (killTarget) {
      const victim =
        killTarget === 'left' || killTarget === this.slot1Hero ? this.leftFighter : this.rightFighter;
      const attacker = victim === this.leftFighter ? this.rightFighter : this.leftFighter;
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
    this.victoryOverlay = document.getElementById('victory-overlay');
    this.landingOverlay = document.getElementById('landing-overlay');
    this.timerEl = document.getElementById('match-timer');

    this.slotBtnLeft = document.getElementById('slot-btn-left');
    this.slotBtnRight = document.getElementById('slot-btn-right');
    this.slotLeftName = document.getElementById('slot-left-name');
    this.slotRightName = document.getElementById('slot-right-name');

    this.cards = {
      warrior: document.getElementById('card-warrior'),
      archer: document.getElementById('card-archer'),
      mage: document.getElementById('card-mage')
    };
    this.ribbons = {
      warrior: document.getElementById('ribbon-warrior'),
      archer: document.getElementById('ribbon-archer'),
      mage: document.getElementById('ribbon-mage')
    };
    this.previewCanvases = {
      warrior: document.getElementById('preview-warrior'),
      archer: document.getElementById('preview-archer'),
      mage: document.getElementById('preview-mage')
    };

    this.btnStartDuel = document.getElementById('btn-start-duel');
    this.startDuelText = document.getElementById('start-duel-text');
    this.btnRandomDuel = document.getElementById('btn-random-duel');

    const cacheHUD = (side) => ({
      name: document.getElementById(`${side}-name`),
      portraitFrame: document.getElementById(`${side}-portrait-frame`),
      hpBar: document.getElementById(`${side}-hp-bar`),
      hpDmg: document.getElementById(`${side}-hp-dmg`),
      hpText: document.getElementById(`${side}-hp-text`),
      state: document.getElementById(`${side}-state`),
      manaBar: document.getElementById(`${side}-mana-bar`),
      ultLabel: document.getElementById(`${side}-ult-label`),
      skillCd: document.getElementById(`${side}-skill-cd`),
      skillText: document.getElementById(`${side}-skill-text`)
    });
    this.hudEls = {
      left: cacheHUD('left'),
      right: cacheHUD('right')
    };

    if (this.slotBtnLeft) {
      this.slotBtnLeft.addEventListener('click', () => this.setActiveSlot(1));
    }
    if (this.slotBtnRight) {
      this.slotBtnRight.addEventListener('click', () => this.setActiveSlot(2));
    }

    // Direct P1 / P2 slot buttons on each roster card
    document.querySelectorAll('[data-assign-p1]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.assignHeroToSlot(1, btn.getAttribute('data-assign-p1'), true);
        this.setActiveSlot(2);
      });
    });
    document.querySelectorAll('[data-assign-p2]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.assignHeroToSlot(2, btn.getAttribute('data-assign-p2'), true);
        this.setActiveSlot(1);
      });
    });

    // Intuitive card click behavior:
    // - Clicking a card already in Slot 1 or Slot 2 selects that slot as the active target to replace (without unexpectedly swapping P1 and P2)
    // - Clicking an unselected card assigns it to the currently active slot and advances the cursor to the other slot
    Object.entries(this.cards).forEach(([heroKey, cardEl]) => {
      if (!cardEl) return;
      cardEl.addEventListener('click', () => {
        if (this.slot1Hero === heroKey) {
          this.setActiveSlot(1);
          if (this.audio) this.audio.play(CHAMPION_ROSTER[heroKey].selectSfx, 350);
        } else if (this.slot2Hero === heroKey) {
          this.setActiveSlot(2);
          if (this.audio) this.audio.play(CHAMPION_ROSTER[heroKey].selectSfx, 850);
        } else {
          this.assignHeroToSlot(this.activeAssignSlot, heroKey, true);
          this.setActiveSlot(this.activeAssignSlot === 1 ? 2 : 1);
        }
      });
    });

    if (this.btnStartDuel) {
      this.btnStartDuel.addEventListener('click', () => this.startDuel(true));
    }
    if (this.btnRandomDuel) {
      this.btnRandomDuel.addEventListener('click', () => {
        const keys = Object.keys(CHAMPION_ROSTER);
        const i1 = Math.floor(Math.random() * keys.length);
        let i2 = Math.floor(Math.random() * (keys.length - 1));
        if (i2 >= i1) i2++;
        this.slot1Hero = keys[i1];
        this.slot2Hero = keys[i2];
        this.syncRosterSelectionUI(true);
        this.startDuel(true);
      });
    }
    if (this.btnOpenSelect) {
      this.btnOpenSelect.addEventListener('click', () => this.openLanding());
    }
    if (this.btnVictorySelect) {
      this.btnVictorySelect.addEventListener('click', () => this.openLanding());
    }

    if (this.btnSfx) {
      this.btnSfx.addEventListener('click', () => {
        const on = this.audio.toggle();
        this.btnSfx.setAttribute('aria-pressed', String(on));
        this.sfxLabel.textContent = on ? 'SFX' : 'MUTE';
      });
    }

    this.btnSlowMo.addEventListener('click', () => {
      this.userSlowMo = !this.userSlowMo;
      this.btnSlowMo.setAttribute('aria-pressed', String(this.userSlowMo));
    });

    this.btnReset.addEventListener('click', () => this.resetMatch());
    this.btnPlayAgain.addEventListener('click', () => this.resetMatch());
  }

  setActiveSlot(slotNum) {
    this.activeAssignSlot = slotNum;
    this.syncRosterSelectionUI(false);
  }

  assignHeroToSlot(slotNum, heroKey, playSound = true) {
    if (!CHAMPION_ROSTER[heroKey]) return;
    if (slotNum === 1) {
      if (this.slot2Hero === heroKey) {
        this.slot2Hero = this.slot1Hero;
      }
      this.slot1Hero = heroKey;
    } else {
      if (this.slot1Hero === heroKey) {
        this.slot1Hero = this.slot2Hero;
      }
      this.slot2Hero = heroKey;
    }
    this.syncRosterSelectionUI(playSound, heroKey);
    if (this.isLandingOpen && this.renderer) {
      this.resetMatch();
    }
  }

  syncRosterSelectionUI(playSound = false, soundHeroKey = null) {
    const c1 = CHAMPION_ROSTER[this.slot1Hero];
    const c2 = CHAMPION_ROSTER[this.slot2Hero];
    if (this.slotLeftName) this.slotLeftName.textContent = c1.name;
    if (this.slotRightName) this.slotRightName.textContent = c2.name;
    if (this.slotBtnLeft) this.slotBtnLeft.classList.toggle('active-slot', this.activeAssignSlot === 1);
    if (this.slotBtnRight) this.slotBtnRight.classList.toggle('active-slot', this.activeAssignSlot === 2);

    Object.keys(CHAMPION_ROSTER).forEach((key) => {
      const card = this.cards[key];
      const ribbon = this.ribbons[key];
      const isP1 = this.slot1Hero === key;
      const isP2 = this.slot2Hero === key;
      if (card) {
        card.classList.toggle('selected-p1', isP1);
        card.classList.toggle('selected-p2', isP2);
      }
      if (ribbon) {
        ribbon.textContent = isP1
          ? '★ FIGHTER 1 (LEFT)'
          : isP2
            ? '★ FIGHTER 2 (RIGHT)'
            : this.activeAssignSlot === 1
              ? 'CLICK FOR P1 (LEFT)'
              : 'CLICK FOR P2 (RIGHT)';
      }
    });

    document.querySelectorAll('[data-assign-p1]').forEach((btn) => {
      const k = btn.getAttribute('data-assign-p1');
      const active = this.slot1Hero === k;
      btn.classList.toggle('active-p1', active);
      btn.textContent = active ? '★ P1 [LEFT]' : 'SET P1 [LEFT]';
    });
    document.querySelectorAll('[data-assign-p2]').forEach((btn) => {
      const k = btn.getAttribute('data-assign-p2');
      const active = this.slot2Hero === k;
      btn.classList.toggle('active-p2', active);
      btn.textContent = active ? '★ P2 [RIGHT]' : 'SET P2 [RIGHT]';
    });

    if (this.startDuelText) {
      this.startDuelText.textContent = `WATCH DUEL: ${c1.name} VS. ${c2.name}`;
    }

    if (playSound && this.audio) {
      const sfxHero = CHAMPION_ROSTER[soundHeroKey || this.slot1Hero];
      this.audio.play(sfxHero.selectSfx, 600);
    }
  }

  startDuel(playSound = true) {
    this.isLandingOpen = false;
    if (this.landingOverlay) this.landingOverlay.classList.add('hidden');
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

  renderChampionPreviews(now) {
    if (!this.isLandingOpen) return;
    const assets = PixelForge.initAssets();
    const t = now * 0.001;

    const drawPreview = (heroKey, isHoveredOrSelected) => {
      const canvas = this.previewCanvases[heroKey];
      const sheet = assets[heroKey]?.sheet;
      if (!canvas || !sheet || !sheet.complete || !sheet.naturalWidth) return;
      const cell = Math.round(sheet.naturalWidth / 8) || 208;
      if (canvas.width !== cell) {
        canvas.width = cell;
        canvas.height = cell;
      }
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      let frameIdx = Math.floor(t * 6.5) % 8;
      if (isHoveredOrSelected) {
        const cycle = (t + (heroKey === 'archer' ? 1.1 : 0)) % 4.0;
        if (cycle > 2.4 && cycle < 3.4) {
          const atkStep = Math.min(7, Math.floor(((cycle - 2.4) / 1.0) * 8));
          frameIdx = 16 + atkStep;
        }
      }
      const col = frameIdx % 8;
      const row = (frameIdx / 8) | 0;
      const hover = heroKey === 'mage' ? Math.round(Math.sin(t * 3.2) * 2) * 2 : 0;
      ctx.drawImage(sheet, col * cell, row * cell, cell, cell, 0, hover, cell, cell);
    };

    Object.keys(CHAMPION_ROSTER).forEach((key) => {
      drawPreview(key, this.slot1Hero === key || this.slot2Hero === key);
    });
  }

  resetMatch() {
    this.vfx.clear();
    clearTimeout(this.victoryTimeout);
    clearTimeout(this.ultBannerTimeout);
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;

    const c1 = CHAMPION_ROSTER[this.slot1Hero] || CHAMPION_ROSTER.warrior;
    const c2 = CHAMPION_ROSTER[this.slot2Hero] || CHAMPION_ROSTER.archer;

    this.leftFighter = new c1.cls(ww * 0.2, gy, 1);
    this.rightFighter = new c2.cls(ww * 0.8, gy, -1);
    this.fighters = [this.leftFighter, this.rightFighter];

    // Configure dynamic HUD headers, bar themes & portraits
    this.applySideHUDTheme(this.hudEls.left, c1, this.leftFighter);
    this.applySideHUDTheme(this.hudEls.right, c2, this.rightFighter);
    PixelForge.setHUDPortraits(c1.id, c1.color, c2.id, c2.color);

    this.matchTime = 0;
    this.ultSlowTimer = 0;
    this.isMatchOver = false;
    this.victoryOverlay.classList.add('hidden');
    if (this.ultBanner) this.ultBanner.classList.add('hidden');
    this.updateHUD();
  }

  applySideHUDTheme(els, rosterCfg, fighter) {
    if (els.name) els.name.textContent = rosterCfg.name;
    if (els.skillText) els.skillText.textContent = fighter.skillName;
    if (els.hpBar) {
      els.hpBar.className = `hp-fill fill-${rosterCfg.theme}`;
    }
    if (els.portraitFrame) {
      els.portraitFrame.className = `portrait-frame frame-${rosterCfg.theme}`;
    }
  }

  triggerUltimateCinematic(caster) {
    this.ultSlowTimer = 0.55;
    this.renderer.triggerUltimateCamera(caster.x, caster.y - 60);
    if (this.audio) this.audio.play('ult_cast', caster.x);

    // Spawn in-world overhead Ultimate announcement & radiant halo directly around the character's head
    this.vfx.spawnSpecialCastAura(
      caster,
      caster.ultName,
      '★ ULTIMATE ART ★',
      caster.theme || 'steel',
      true
    );
  }

  onFighterDeath(deadFighter) {
    if (this.isMatchOver) return;
    this.isMatchOver = true;
    this.ultSlowTimer = 0.65;
    this.updateHUD();

    if (this.audio && deadFighter.deathSfx) {
      this.audio.play(deadFighter.deathSfx, deadFighter.x);
    }

    const winner = deadFighter === this.leftFighter ? this.rightFighter : this.leftFighter;
    const winnerCfg = CHAMPION_ROSTER[winner.heroId] || CHAMPION_ROSTER.warrior;
    document.getElementById('victory-winner').textContent = `${winner.name.toUpperCase()} TRIUMPHS`;
    document.getElementById('victory-stats').textContent = winnerCfg.victoryLine;
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
      p.age = (p.age || 0) + dt;
      p.ringTimer = (p.ringTimer || 0) + dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if ((p.type === 'arrow' || p.type === 'blade_wave') && p.ringTimer >= 0.085) {
        p.ringTimer = 0;
        this.vfx.spawnShockwave(
          p.x,
          p.y,
          p.type === 'blade_wave' ? 46 : 34,
          p.type === 'blade_wave' ? '#38bdf8' : '#34d399',
          0.22,
          false,
          true
        );
      }

      if (Math.random() < 0.72) {
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

      const enemy = p.owner === this.leftFighter ? this.rightFighter : this.leftFighter;
      const hitEnemy =
        enemy &&
        !enemy.isDead &&
        Math.abs(p.x - enemy.x) < p.radius + 36 &&
        Math.abs(p.y - (enemy.y - 108)) < p.radius + 68;
      const hitGround = p.y >= gy - 4;

      if (hitEnemy || hitGround) {
        if (p.isMeteor) {
          if (this.audio) this.audio.play('meteor_impact', p.x);
          this.renderer.triggerShake(22, 0.52);
          this.renderer.triggerAberration(14);
          this.vfx.spawnShockwave(p.x, gy, 290, '#fb923c', 0.6, true);
          this.vfx.spawnShockwave(p.x, gy - 35, 220, '#fef08a', 0.46, false);
          this.vfx.spawnDecal(p.x, 165, 'fissure', '#fb923c', 6.0);
          this.vfx.spawnBurst(p.x, gy - 15, 30, '#fb923c', 380, { upBias: 165, size: 9 });
          this.vfx.spawnBurst(p.x, gy - 15, 20, '#fef08a', 310, { upBias: 130, size: 8 });
          this.vfx.spawnGlyphBurst(p.x, gy - 50, 8, 'arcane');

          if (enemy && !enemy.isDead && Math.abs(enemy.x - p.x) < 230) {
            enemy.takeDamage(p.damage, p.owner, true, 160, -240);
            this.renderer.triggerHitStop(0.075);
          }
        } else if (hitEnemy) {
          const isCrit = Math.random() < 0.28;
          enemy.takeDamage(isCrit ? p.damage * 1.38 : p.damage, p.owner, isCrit, 100, 0);
          if (this.audio) {
            this.audio.play(
              isCrit
                ? 'hit_crit'
                : p.type === 'arrow'
                  ? 'arrow_hit'
                  : p.type === 'blade_wave'
                    ? 'heavy_cleave'
                    : 'clang',
              enemy.x
            );
          }
          this.renderer.triggerHitStop(0.055);
          this.vfx.spawnShockwave(p.x, p.y, 76, p.color, 0.26);
          this.vfx.spawnBurst(p.x, p.y, 14, p.color, 220);
          if (p.type === 'arrow') {
            this.vfx.spawnSlash(p.x, p.y, 58, -0.9, 0.9, '#34d399', 0.22);
            this.vfx.spawnGlyphBurst(p.x, p.y, 5, 'emerald');
          } else if (p.type === 'blade_wave') {
            this.vfx.spawnSlash(p.x, p.y, 72, -1.2, 1.2, '#38bdf8', 0.25);
            this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'steel');
          } else {
            this.vfx.spawnGlyphBurst(p.x, p.y, 4, 'arcane');
          }
        } else {
          this.vfx.spawnDecal(p.x, 42, 'scorch', p.color, 3.5);
          this.vfx.spawnBurst(p.x, gy, 8, p.color, 150, { upBias: 70 });
        }
        this.vfx.projectiles.splice(i, 1);
      } else if (p.x < -300 || p.x > ww + 300) {
        this.vfx.projectiles.splice(i, 1);
      }
    }
  }

  updateHUD() {
    const sync = (els, f) => {
      if (!els || !f) return;
      const hpPct = Math.max(0, (f.hp / f.maxHp) * 100);
      const manaPct = Math.min(100, (f.mana / f.maxMana) * 100);
      els.hpBar.style.width = `${hpPct}%`;
      els.hpDmg.style.width = `${hpPct}%`;
      els.hpText.textContent = `${Math.ceil(f.hp)}`;
      els.state.textContent = f.isDead ? 'DEFEATED' : f.state;

      els.manaBar.style.width = `${manaPct}%`;
      els.ultLabel.textContent = `OVERDRIVE ${Math.floor(manaPct)}%`;

      const cdPct = Math.max(0, (f.skillCooldown / f.skillMaxCooldown) * 100);
      els.skillCd.style.width = `${cdPct}%`;
      els.skillText.textContent =
        f.skillCooldown > 0.05 ? `${f.skillName} ${f.skillCooldown.toFixed(1)}s` : `${f.skillName} READY`;
    };

    sync(this.hudEls.left, this.leftFighter);
    sync(this.hudEls.right, this.rightFighter);

    const mins = String(Math.floor(this.matchTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.matchTime % 60)).padStart(2, '0');
    this.timerEl.textContent = `${mins}:${secs}`;
  }

  stepSimulation(rawDt) {
    this.renderer.update(rawDt, this.fighters);

    if (this.renderer.hitStopTimer > 0) return;

    let timeScale = 1.0;
    if (this.ultSlowTimer > 0) {
      this.ultSlowTimer = Math.max(0, this.ultSlowTimer - rawDt);
      timeScale = 0.25;
    } else if (this.userSlowMo) {
      timeScale = 0.35;
    }

    const dt = rawDt * timeScale;
    if (!this.isMatchOver) {
      this.matchTime += dt;
    }

    this.leftFighter.update(dt, this.rightFighter, this);
    this.rightFighter.update(dt, this.leftFighter, this);
    this.updateProjectiles(dt);
    this.vfx.update(dt, this.renderer.groundY, this.renderer, this.audio);

    this.hudTimer += rawDt;
    if (this.hudTimer >= 0.05) {
      this.hudTimer = 0;
      this.updateHUD();
    }
  }

  loop(now) {
    const rawDt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (this.isLandingOpen) {
      this.renderer.update(rawDt, this.fighters);
      this.vfx.update(rawDt * 0.4, this.renderer.groundY, this.renderer, this.audio);
      this.renderChampionPreviews(now);
    } else {
      this.stepSimulation(rawDt);
    }
    this.renderer.render(this.fighters, this.vfx);

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
