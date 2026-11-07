import { Renderer } from './engine/Renderer.js';
import { VFXManager } from './engine/VFXManager.js';
import { PixelForge } from './engine/PixelForge.js';
import { AudioManager } from './engine/AudioManager.js';
import { Warrior } from './entities/Warrior.js';
import { FireMage } from './entities/FireMage.js';
import { Archer } from './entities/Archer.js';
import { Priestess } from './entities/Priestess.js';
import { Reaper } from './entities/Reaper.js';
import { Chronomancer } from './entities/Chronomancer.js';

const CHAMPION_ROSTER = {
  warrior: {
    id: 'warrior',
    name: 'AETHELGARD',
    role: 'RUNEBLADE KNIGHT',
    style: 'MELEE VANGUARD',
    trait: 'PASSIVE: AEGIS SPELL DEFLECT',
    cls: Warrior,
    theme: 'steel',
    color: '#38bdf8',
    selectSfx: 'slash',
    victoryLine: 'Runeblade steel cleaves through the sanctuary tempest!',
    skills: [
      {
        name: 'FROST CRESCENT',
        type: 'AUTO + PASSIVE',
        vfxCell: 0,
        desc: 'Cleaves with frost waves & raises an Aegis barrier that deflects projectiles.'
      },
      {
        name: 'TEMPEST VANGUARD',
        type: 'SKILL • 4.5S CD',
        vfxCell: 1,
        desc: '3-hit spinning cryo-cyclone that pulls foes inward and shatters armor.'
      },
      {
        name: 'HEAVENLY EARTHSHATTER',
        type: '★ OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Leaps skyward and slams a colossal Runeblade monolith, erupting 5 glacial spires.'
      }
    ]
  },
  archer: {
    id: 'archer',
    name: 'SYLVARA',
    role: 'TEMPEST BOWMASTER',
    style: 'RANGED MARKSMAN',
    trait: 'PASSIVE: ZEPHYR VAULT EVASION',
    cls: Archer,
    theme: 'emerald',
    color: '#34d399',
    selectSfx: 'arrow_shoot',
    victoryLine: 'Supersonic astral arrows pierce through the eclipse!',
    skills: [
      {
        name: 'ASTRAL LONGBOW',
        type: 'AUTO + PASSIVE',
        vfxCell: 0,
        desc: 'Fires high-velocity piercing arrows & vaults over cornering foes with Zephyr Backflip.'
      },
      {
        name: 'STARFALL VOLLEY',
        type: 'SKILL • 4.2S CD',
        vfxCell: 1,
        desc: 'Rains 5 emerald starlight arrows from the heavens onto the enemy position.'
      },
      {
        name: 'ASTRAL HURRICANE',
        type: '★ OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Unleashes an Emerald Wind-Dragon and 10-beam orbital starlight bombardment.'
      }
    ]
  },
  mage: {
    id: 'mage',
    name: 'IGNIS SOL',
    role: 'SOLAR ARCHMAGE',
    style: 'ARCANE ARTILLERY',
    trait: 'PASSIVE: ARCANE BLINK WARP',
    cls: FireMage,
    theme: 'arcane',
    color: '#fb923c',
    selectSfx: 'fireball',
    victoryLine: 'Solar cataclysm reduces all opposition to molten ash!',
    skills: [
      {
        name: 'SOLAR FIREBALL',
        type: 'AUTO + PASSIVE',
        vfxCell: 2,
        desc: 'Launches explosive solar plasma orbs & teleports away from melee threats.'
      },
      {
        name: 'TRIPLE SOLAR PILLAR',
        type: 'SKILL • 4.8S CD',
        vfxCell: 1,
        desc: 'Erupts 3 sequential columns of molten hellfire beneath the enemy.'
      },
      {
        name: 'ECLIPSE SUPERNOVA',
        type: '★ OVERDRIVE ULT',
        vfxCell: 0,
        desc: 'Summons the Black-Sun Eclipse, raining meteors before a cataclysmic solar beam.'
      }
    ]
  },
  priestess: {
    id: 'priestess',
    name: 'SERAPHINA',
    role: 'HIGH PRIESTESS',
    style: 'RADIANT HEALER',
    trait: 'PASSIVE: SERAPHIM WING ESCAPE',
    cls: Priestess,
    theme: 'radiant',
    color: '#fde047',
    selectSfx: 'holy_heal',
    victoryLine: 'Sacred light and divine grace purify the sanctuary!',
    skills: [
      {
        name: 'SACRED STARLIGHT',
        type: 'AUTO + PASSIVE',
        vfxCell: 1,
        desc: 'Fires purifying light bolts & ascends on 6 Seraphim wings when cornered.'
      },
      {
        name: 'DIVINE SANCTUARY',
        type: 'SKILL • 5.0S CD',
        vfxCell: 2,
        desc: 'Consecrates the floor, restoring her HP while smiting enemies with Valkyrie spears.'
      },
      {
        name: 'SERAPHIC APOTHEOSIS',
        type: '★ OVERDRIVE ULT',
        vfxCell: 0,
        desc: 'Ascends in full Archangel form, calling down 7 pillars of heavenly judgment.'
      }
    ]
  },
  reaper: {
    id: 'reaper',
    name: 'MALAKOR',
    role: 'ABYSSAL SOULREAPER',
    style: 'LIFESTEAL EXECUTIONER',
    trait: 'PASSIVE: VAMPIRIC SOUL REAP',
    cls: Reaper,
    theme: 'abyssal',
    color: '#c084fc',
    selectSfx: 'scythe_reap',
    victoryLine: 'The Abyssal Scythe reaps every soul in the sanctuary!',
    skills: [
      {
        name: 'CRESCENT SCYTHE',
        type: 'AUTO + PASSIVE',
        vfxCell: 2,
        desc: 'Sweeps wide necrotic scythe waves that drain life force on every strike.'
      },
      {
        name: 'SPECTRAL CHAIN HOOK',
        type: 'SKILL • 4.6S CD',
        vfxCell: 1,
        desc: 'Hurls a skeletal claw chain across the arena, dragging ranged foes into melee.'
      },
      {
        name: 'GRIM HARVEST',
        type: '★ OVERDRIVE ULT',
        vfxCell: 0,
        desc: 'Summons the colossal Death-Avatar & gothic tombstones to reap the battlefield.'
      }
    ]
  },
  chronomancer: {
    id: 'chronomancer',
    name: 'ZEPHYROS',
    role: 'GRAND CHRONOMANCER',
    style: 'TIME & STASIS WEAVER',
    trait: 'PASSIVE: TEMPORAL HP REWIND',
    cls: Chronomancer,
    theme: 'chrono',
    color: '#2dd4bf',
    selectSfx: 'clock_gear',
    victoryLine: 'The Grand Astral Clocktower locks all timelines in stasis!',
    skills: [
      {
        name: 'ESCAPEMENT SAW-GEAR',
        type: 'AUTO + PASSIVE',
        vfxCell: 1,
        desc: 'Hurls spinning clockwork saw-gears & rewinds his own timeline to recover lost HP.'
      },
      {
        name: 'HOURGLASS STASIS',
        type: 'SKILL • 4.6S CD',
        vfxCell: 0,
        desc: 'Materializes a golden hourglass prison that freezes the enemy in time.'
      },
      {
        name: 'DOOMSDAY MIDNIGHT',
        type: '★ OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Manifests the Celestial Astrolabe Clock, striking 12 chimes of temporal judgment.'
      }
    ]
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
    this.autoTourney = true;
    this.winStreak = 0;
    this.reigningHero = null;
    this.ultSlowTimer = 0;
    this.koSlowTimer = 0;
    this.clashCooldown = 0;
    this.stageEventTriggered = false;
    this.stageEventTimer = 0;
    this.stageEventTickTimer = 0;
    this.matchTime = 0;
    this.hudTimer = 0;
    this.isMatchOver = false;

    // Default Matchup: Aethelgard (Warrior) vs. Sylvara (Archer)
    this.slot1Hero = 'warrior';
    this.slot2Hero = 'archer';
    this.activeAssignSlot = 2; // Default cursor on Slot 2 so clicking a 3rd hero pairs them with Fighter 1
    this.isLandingOpen = true;

    const params = new URLSearchParams(window.location.search);
    this.forcedStage = params.get('stage') || null;
    const p1 = params.get('p1');
    const p2 = params.get('p2');
    const urlHero = params.get('hero');
    if (p1 && CHAMPION_ROSTER[p1]) this.slot1Hero = p1;
    if (p2 && CHAMPION_ROSTER[p2]) this.slot2Hero = p2;
    if (urlHero && CHAMPION_ROSTER[urlHero]) {
      this.slot1Hero = urlHero;
      this.slot2Hero = urlHero === 'archer' ? 'mage' : 'archer';
    }

    this.bindUI();
    this.syncRosterSelectionUI(false);
    this.resetMatch();

    const simSec = Number(params.get('sim') || 0);
    const killTarget = params.get('kill');
    const ultParam = params.get('ult');
    const forceUlt = ultParam === '1' || ultParam === 'both';
    const skillParam = params.get('skill');
    const forceSkill = skillParam === '1' || skillParam === 'both';
    const forceCorner = params.get('corner') === '1';
    const forceClash = params.get('clash') === '1';
    const forceEvent = params.get('event') === '1';
    this.isSimPaused = params.get('pause') === '1';
    if (
      p1 ||
      p2 ||
      urlHero ||
      this.forcedStage ||
      simSec > 0 ||
      killTarget ||
      forceUlt ||
      forceSkill ||
      forceCorner ||
      forceClash ||
      forceEvent
    ) {
      this.syncRosterSelectionUI(false);
      this.startDuel(false);
    }

    if (forceEvent) {
      this.triggerStagePhenomenon();
    }

    if (forceClash) {
      this.leftFighter.x = 340;
      this.rightFighter.x = 860;
      this.vfx.spawnProjectile({
        x: 565,
        y: this.renderer.groundY - 105,
        vx: 520,
        vy: 0,
        radius: 26,
        color: this.leftFighter.primaryColor,
        damage: 90,
        owner: this.leftFighter,
        type: 'blade_wave'
      });
      this.vfx.spawnProjectile({
        x: 635,
        y: this.renderer.groundY - 105,
        vx: -520,
        vy: 0,
        radius: 26,
        color: this.rightFighter.primaryColor,
        damage: 90,
        owner: this.rightFighter,
        type: 'fireball'
      });
    }

    if (forceCorner) {
      // Place left fighter (e.g. Priestess or Archer) cornered against the left wall and enemy closing in
      this.leftFighter.x = 105;
      this.leftFighter.dodgeCooldown = 0;
      this.leftFighter.wallWingCooldown = 0;
      this.rightFighter.x = 265;
      this.rightFighter.setState('AUTO_ATTACK');
    }

    if (forceSkill) {
      this.leftFighter.x = 390;
      this.rightFighter.x = 690;
      this.leftFighter.skillCooldown = 0;
      this.leftFighter.setState('SKILL');
      if (skillParam === 'both') {
        this.rightFighter.skillCooldown = 0;
        this.rightFighter.setState('AUTO_ATTACK');
      }
    }

    if (forceUlt) {
      this.leftFighter.x = 410;
      this.rightFighter.x = 710;
      this.leftFighter.mana = this.leftFighter.maxMana;
      if (ultParam === 'both') {
        this.rightFighter.mana = this.rightFighter.maxMana;
      }
    }

    if (simSec > 0) {
      const steps = Math.round(simSec / 0.02);
      for (let i = 0; i < steps; i++) {
        this.ultSlowTimer = 0;
        this.renderer.hitStopTimer = 0;
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
        this.renderer.hitStopTimer = 0;
        this.stepSimulation(0.02);
      }
      if (params.get('victory') === '1') {
        this.victoryOverlay.classList.remove('hidden');
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
    this.btnAutoTourney = document.getElementById('btn-auto-tourney');
    this.btnNextChallenger = document.getElementById('btn-next-challenger');
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
      mage: document.getElementById('card-mage'),
      priestess: document.getElementById('card-priestess'),
      reaper: document.getElementById('card-reaper'),
      chronomancer: document.getElementById('card-chronomancer')
    };
    this.ribbons = {
      warrior: document.getElementById('ribbon-warrior'),
      archer: document.getElementById('ribbon-archer'),
      mage: document.getElementById('ribbon-mage'),
      priestess: document.getElementById('ribbon-priestess'),
      reaper: document.getElementById('ribbon-reaper'),
      chronomancer: document.getElementById('ribbon-chronomancer')
    };
    this.previewCanvases = {
      warrior: document.getElementById('preview-warrior'),
      archer: document.getElementById('preview-archer'),
      mage: document.getElementById('preview-mage'),
      priestess: document.getElementById('preview-priestess'),
      reaper: document.getElementById('preview-reaper'),
      chronomancer: document.getElementById('preview-chronomancer')
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

    if (this.btnAutoTourney) {
      this.btnAutoTourney.addEventListener('click', () => {
        this.autoTourney = !this.autoTourney;
        this.btnAutoTourney.setAttribute('aria-pressed', String(this.autoTourney));
        const autoLabel = document.getElementById('victory-auto-next');
        if (autoLabel) {
          autoLabel.textContent = this.autoTourney
            ? 'AUTO-TOURNEY: NEXT CHALLENGER IN 4S...'
            : 'AUTO-TOURNEY PAUSED • SELECT NEXT ACTION';
        }
        if (!this.autoTourney) {
          clearTimeout(this.autoNextTimeout);
        }
      });
    }

    if (this.btnNextChallenger) {
      this.btnNextChallenger.addEventListener('click', () => this.advanceTourneyChallenger());
    }

    this.btnReset.addEventListener('click', () => this.resetMatch());
    this.btnPlayAgain.addEventListener('click', () => this.resetMatch());
  }

  advanceTourneyChallenger() {
    clearTimeout(this.autoNextTimeout);
    const keys = Object.keys(CHAMPION_ROSTER);
    const keepHero = this.reigningHero || this.slot1Hero;
    const pool = keys.filter((k) => k !== keepHero && k !== this.slot2Hero);
    const candidates = pool.length > 0 ? pool : keys.filter((k) => k !== keepHero);
    const nextChallenger = candidates[Math.floor(Math.random() * candidates.length)] || 'archer';
    this.slot1Hero = keepHero;
    this.slot2Hero = nextChallenger;
    this.syncRosterSelectionUI(false);
    this.resetMatch();
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
          ? '★ P1'
          : isP2
            ? '★ P2'
            : this.activeAssignSlot === 1
              ? 'SET P1'
              : 'SET P2';
      }
    });

    document.querySelectorAll('[data-assign-p1]').forEach((btn) => {
      const k = btn.getAttribute('data-assign-p1');
      const active = this.slot1Hero === k;
      btn.classList.toggle('active-p1', active);
      btn.textContent = active ? '★ P1' : 'P1';
    });
    document.querySelectorAll('[data-assign-p2]').forEach((btn) => {
      const k = btn.getAttribute('data-assign-p2');
      const active = this.slot2Hero === k;
      btn.classList.toggle('active-p2', active);
      btn.textContent = active ? '★ P2' : 'P2';
    });

    // Populate Left (P1) and Right (P2) Fighter Profile & Visual Skill Breakdown Panels
    const syncProfilePanel = (prefix, cfg) => {
      if (!cfg) return;
      const nameEl = document.getElementById(`${prefix}-profile-name`);
      const roleEl = document.getElementById(`${prefix}-profile-role`);
      const styleEl = document.getElementById(`${prefix}-profile-style`);
      const traitEl = document.getElementById(`${prefix}-profile-trait`);
      const haloEl = document.getElementById(`${prefix}-halo`);
      if (nameEl) nameEl.textContent = cfg.name;
      if (roleEl) roleEl.textContent = cfg.role;
      if (styleEl) styleEl.textContent = cfg.style;
      if (traitEl) traitEl.textContent = cfg.trait;
      if (haloEl) haloEl.className = `stage-halo halo-${cfg.theme}`;

      if (Array.isArray(cfg.skills)) {
        cfg.skills.forEach((sk, idx) => {
          const sName = document.getElementById(`${prefix}-skill-name-${idx}`);
          const sType = document.getElementById(`${prefix}-skill-type-${idx}`);
          const sDesc = document.getElementById(`${prefix}-skill-desc-${idx}`);
          if (sName) sName.textContent = sk.name;
          if (sType) sType.textContent = sk.type;
          if (sDesc) sDesc.textContent = sk.desc;
        });
      }
    };
    syncProfilePanel('p1', c1);
    syncProfilePanel('p2', c2);

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
    clearTimeout(this.autoNextTimeout);
    this.victoryOverlay.classList.add('hidden');
    if (this.landingOverlay) this.landingOverlay.classList.remove('hidden');
  }

  renderChampionPreviews(now) {
    if (!this.isLandingOpen) return;
    const assets = PixelForge.initAssets();
    const t = now * 0.001;

    // 1. Render the 6 Center Portrait Selector Tiles from crisp pixel portraits
    Object.keys(CHAMPION_ROSTER).forEach((heroKey) => {
      const canvas = this.previewCanvases[heroKey];
      const port = assets[heroKey]?.portrait;
      if (!canvas || !port || !port.complete || !port.naturalWidth) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(port, 0, 0, canvas.width, canvas.height);
    });

    // 2. Render Live Animated Fighter Sprites & 3 Bespoke VFX Skill Icons on Left (P1) and Right (P2) Profile Panels
    const drawSideProfileVisuals = (prefix, heroKey, flipX) => {
      const cfg = CHAMPION_ROSTER[heroKey];
      const heroAssets = assets[heroKey];
      if (!cfg || !heroAssets) return;

      // Live Animated Character Stage
      const spriteCanvas = document.getElementById(`${prefix}-sprite-canvas`);
      const sheet = heroAssets.sheet;
      if (spriteCanvas && sheet && sheet.complete && sheet.naturalWidth) {
        const cell = Math.round(sheet.naturalWidth / 8) || 208;
        if (spriteCanvas.width !== cell) {
          spriteCanvas.width = cell;
          spriteCanvas.height = cell;
        }
        const sctx = spriteCanvas.getContext('2d');
        sctx.clearRect(0, 0, cell, cell);
        sctx.imageSmoothingEnabled = false;

        let frameIdx = Math.floor(t * 6.5) % 8;
        const cycle = (t + (flipX ? 1.4 : 0)) % 3.8;
        if (cycle > 2.2 && cycle < 3.2) {
          const atkStep = Math.min(7, Math.floor(((cycle - 2.2) / 1.0) * 8));
          frameIdx = 16 + atkStep;
        }
        const col = frameIdx % 8;
        const row = (frameIdx / 8) | 0;
        const hover =
          heroKey === 'mage' || heroKey === 'priestess' ? Math.round(Math.sin(t * 3.2) * 2) * 2 : 0;

        sctx.save();
        if (flipX) {
          sctx.translate(cell, 0);
          sctx.scale(-1, 1);
        }
        sctx.drawImage(sheet, col * cell, row * cell, cell, cell, 0, hover, cell, cell);
        sctx.restore();
      }

      // 3 Bespoke Pixel-Art RPG Ability Icons (designed specifically for 56x56 square skill slots!)
      if (Array.isArray(cfg.skills)) {
        cfg.skills.forEach((_sk, idx) => {
          const iconCanvas = document.getElementById(`${prefix}-skill-icon-${idx}`);
          if (!iconCanvas) return;
          const ictx = iconCanvas.getContext('2d');
          PixelForge.drawSkillIcon(ictx, heroKey, idx, iconCanvas.width, iconCanvas.height, t);
        });
      }
    };

    drawSideProfileVisuals('p1', this.slot1Hero, false);
    drawSideProfileVisuals('p2', this.slot2Hero, true);
  }

  resetMatch() {
    this.vfx.clear();
    clearTimeout(this.victoryTimeout);
    clearTimeout(this.autoNextTimeout);
    clearTimeout(this.ultBannerTimeout);
    if (this.renderer && typeof this.renderer.pickRandomStage === 'function') {
      this.renderer.pickRandomStage(this.forcedStage);
      this.renderer.stageEventTimer = 0;
      this.renderer.stageEventBannerTimer = 0;
      this.renderer.koZoomTimer = 0;
      this.renderer.cutInTimer = 0;
    }
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;

    const c1 = CHAMPION_ROSTER[this.slot1Hero] || CHAMPION_ROSTER.warrior;
    const c2 = CHAMPION_ROSTER[this.slot2Hero] || CHAMPION_ROSTER.archer;

    this.leftFighter = new c1.cls(ww * 0.2, gy, 1);
    this.rightFighter = new c2.cls(ww * 0.8, gy, -1);
    this.leftFighter.game = this;
    this.rightFighter.game = this;
    this.fighters = [this.leftFighter, this.rightFighter];

    // Configure dynamic HUD headers, bar themes & portraits
    this.applySideHUDTheme(this.hudEls.left, c1, this.leftFighter);
    this.applySideHUDTheme(this.hudEls.right, c2, this.rightFighter);
    PixelForge.setHUDPortraits(c1.id, c1.color, c2.id, c2.color);

    this.matchTime = 0;
    this.ultSlowTimer = 0;
    this.koSlowTimer = 0;
    this.clashCooldown = 0;
    this.stageEventTriggered = false;
    this.stageEventTimer = 0;
    this.stageEventTickTimer = 0;
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
    if (typeof this.renderer.triggerUltimateCutIn === 'function') {
      this.renderer.triggerUltimateCutIn(caster);
    }

    // Spawn in-world overhead Ultimate announcement & radiant halo directly around the character's head
    this.vfx.spawnSpecialCastAura(
      caster,
      caster.ultName,
      '★ ULTIMATE ART ★',
      caster.theme || 'steel',
      true
    );
  }

  triggerStagePhenomenon() {
    this.stageEventTriggered = true;
    this.stageEventTimer = 10.0;
    this.stageEventTickTimer = 0;
    const stageId = this.renderer?.stageId || 'cathedral';
    const ww = this.renderer?.worldWidth || 1200;

    if (stageId === 'cathedral') {
      this.renderer.triggerStageEvent(
        '★ STAGE PHENOMENON • SOLAR ECLIPSE ★',
        'BOTH CHAMPIONS GAIN +55% OVERDRIVE CHARGE!',
        '#facc15',
        10.0
      );
    } else if (stageId === 'sylvan') {
      this.renderer.triggerStageEvent(
        '★ STAGE PHENOMENON • STARLIGHT MONSOON ★',
        'ASTRAL SANCTUARY RAIN RESTORES VITALITY!',
        '#34d399',
        10.0
      );
    } else if (stageId === 'boneyard') {
      this.renderer.triggerStageEvent(
        '★ STAGE PHENOMENON • BLOOD MOON FRENZY ★',
        'ALL ATTACKS DEAL +18% ABYSSAL DAMAGE!',
        '#e11d48',
        10.0
      );
    } else {
      this.renderer.triggerStageEvent(
        '★ STAGE PHENOMENON • MIDNIGHT OVERCLOCK ★',
        'ALL SKILL & ATTACK COOLDOWNS ACCELERATED +35%!',
        '#2dd4bf',
        10.0
      );
    }
    if (this.audio) this.audio.play('skill_cast', ww * 0.5);
  }

  onFighterDeath(deadFighter) {
    if (this.isMatchOver) return;
    this.isMatchOver = true;
    this.koSlowTimer = 1.15;
    this.ultSlowTimer = 0.65;
    this.updateHUD();

    if (this.audio && deadFighter.deathSfx) {
      this.audio.play(deadFighter.deathSfx, deadFighter.x);
    }

    const winner = deadFighter === this.leftFighter ? this.rightFighter : this.leftFighter;
    const winnerCfg = CHAMPION_ROSTER[winner.heroId] || CHAMPION_ROSTER.warrior;
    if (typeof this.renderer.triggerKOFinisher === 'function') {
      this.renderer.triggerKOFinisher(
        deadFighter.x,
        deadFighter.y - 95,
        winner.primaryColor,
        winner.name,
        winner.heroId
      );
    }

    // Track King-of-the-Hill Win Streak
    if (this.reigningHero === winner.heroId) {
      this.winStreak++;
    } else {
      this.reigningHero = winner.heroId;
      this.winStreak = 1;
    }

    const eyebrowEl = document.getElementById('victory-eyebrow');
    if (eyebrowEl) {
      eyebrowEl.textContent = `DUEL CONCLUDED • ${winner.name.toUpperCase()} STREAK: ${this.winStreak} WIN${this.winStreak > 1 ? 'S' : ''}`;
    }
    document.getElementById('victory-winner').textContent = `${winner.name.toUpperCase()} TRIUMPHS`;
    document.getElementById('victory-stats').textContent = winnerCfg.victoryLine;

    // Populate Post-Match Combat Telemetry Card
    const fillTel = (side, f) => {
      const s = f?.stats || {
        damageDealt: 0,
        skillsUsed: 0,
        ultsUsed: 0,
        biggestHit: 0,
        healingDone: 0,
        clashes: 0
      };
      const nameEl = document.getElementById(`tel-${side}-name`);
      const dmgEl = document.getElementById(`tel-${side}-dmg`);
      const skEl = document.getElementById(`tel-${side}-skills`);
      const maxEl = document.getElementById(`tel-${side}-max`);
      const exEl = document.getElementById(`tel-${side}-extra`);
      if (nameEl) nameEl.textContent = f.name;
      if (dmgEl) dmgEl.textContent = `${s.damageDealt}`;
      if (skEl) skEl.textContent = `${s.skillsUsed} / ${s.ultsUsed}`;
      if (maxEl) maxEl.textContent = `${s.biggestHit}`;
      if (exEl) exEl.textContent = `${s.healingDone} / ${s.clashes}`;
    };
    fillTel('left', this.leftFighter);
    fillTel('right', this.rightFighter);

    const autoLabel = document.getElementById('victory-auto-next');
    if (autoLabel) {
      autoLabel.textContent = this.autoTourney
        ? 'AUTO-TOURNEY: NEXT CHALLENGER IN 4S...'
        : 'AUTO-TOURNEY PAUSED • SELECT NEXT ACTION';
    }

    clearTimeout(this.victoryTimeout);
    clearTimeout(this.autoNextTimeout);
    this.victoryTimeout = setTimeout(() => {
      if (this.isMatchOver && !this.isSimPaused) {
        this.victoryOverlay.classList.remove('hidden');
        if (this.audio) this.audio.play('victory_fanfare');
        if (this.autoTourney && !this.isSimPaused) {
          this.autoNextTimeout = setTimeout(() => {
            if (this.isMatchOver && this.autoTourney && !this.isLandingOpen) {
              this.advanceTourneyChallenger();
            }
          }, 3800);
        }
      }
    }, 1650);
  }

  triggerClashSpark(cx, cy, col1, col2, label = '★ CLASH! ★') {
    if (this.audio) this.audio.play('clang', cx);
    this.renderer.triggerHitStop(0.065);
    const c1 = col1 || this.leftFighter?.primaryColor || '#38bdf8';
    const c2 = col2 || this.rightFighter?.primaryColor || '#fb923c';
    if (typeof this.renderer.triggerClashCamera === 'function') {
      this.renderer.triggerClashCamera(
        cx,
        cy,
        this.leftFighter?.heroId || 'warrior',
        this.rightFighter?.heroId || 'mage',
        c1,
        c2
      );
    }
    this.vfx.spawnDamageText(cx, cy - 68, 0, false, label, '#fef08a');
    this.vfx.spawnBurst(cx, cy, 24, '#fef08a', 320, { upBias: 115, size: 7 });
    this.vfx.spawnBurst(cx - 12, cy, 18, c1, 285, { upBias: 95, size: 6 });
    this.vfx.spawnBurst(cx + 12, cy, 18, c2, 285, { upBias: 95, size: 6 });
    if (this.leftFighter && !this.leftFighter.isDead) {
      this.leftFighter.gainMana(10);
      if (this.leftFighter.stats) this.leftFighter.stats.clashes++;
    }
    if (this.rightFighter && !this.rightFighter.isDead) {
      this.rightFighter.gainMana(10);
      if (this.rightFighter.stats) this.rightFighter.stats.clashes++;
    }
  }

  updateProjectiles(dt) {
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;

    // 1. Mid-Air Projectile vs. Projectile Clash Detection
    for (let i = this.vfx.projectiles.length - 1; i >= 0; i--) {
      const p = this.vfx.projectiles[i];
      if (!p) continue;
      for (let j = i - 1; j >= 0; j--) {
        const q = this.vfx.projectiles[j];
        if (!q || p.owner === q.owner) continue;
        const dist = Math.hypot(p.x - q.x, p.y - q.y);
        if (dist < (p.radius || 18) + (q.radius || 18) + 28) {
          const cx = (p.x + q.x) * 0.5;
          const cy = (p.y + q.y) * 0.5;
          this.triggerClashSpark(cx, cy, p.color, q.color, '★ ARCANE CLASH! ★');
          if (!p.isMeteor && !q.isMeteor) {
            this.vfx.projectiles.splice(i, 1);
            this.vfx.projectiles.splice(j, 1);
            break;
          } else if (p.isMeteor && !q.isMeteor) {
            this.vfx.projectiles.splice(j, 1);
            i--;
          } else if (!p.isMeteor && q.isMeteor) {
            this.vfx.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    for (let i = this.vfx.projectiles.length - 1; i >= 0; i--) {
      const p = this.vfx.projectiles[i];
      p.age = (p.age || 0) + dt;
      p.ringTimer = (p.ringTimer || 0) + dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if ((p.type === 'arrow' || p.type === 'blade_wave' || p.type === 'holy_light') && p.ringTimer >= 0.085) {
        p.ringTimer = 0;
        this.vfx.spawnShockwave(
          p.x,
          p.y,
          p.type === 'blade_wave' ? 46 : p.type === 'holy_light' ? 38 : 34,
          p.type === 'blade_wave' ? '#38bdf8' : p.type === 'holy_light' ? '#fde047' : '#34d399',
          0.22,
          false,
          true
        );
      }

      for (let k = 0; k < 2; k++) {
        this.vfx.spawnParticle({
          x: p.x + (Math.random() - 0.5) * p.radius * 1.25,
          y: p.y + (Math.random() - 0.5) * p.radius * 1.25,
          vx: -p.vx * 0.16 + (Math.random() - 0.5) * 55,
          vy: -p.vy * 0.16 - 28 + (Math.random() - 0.5) * 30,
          size: p.isMeteor ? 16 : 7,
          color: k === 0 ? p.color : p.coreColor || '#fef08a',
          maxLife: p.isMeteor ? 0.52 : 0.34
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
            const impactSfx =
              p.type === 'arrow'
                ? 'arrow_hit'
                : p.type === 'phantom_scythe'
                  ? 'scythe_reap'
                  : p.type === 'clock_gear'
                    ? 'chrono_hit'
                    : p.type === 'blade_wave'
                      ? isCrit
                        ? 'hit_crit'
                        : 'heavy_cleave'
                      : p.type === 'holy_light'
                        ? 'holy_hit'
                        : 'fire_hit';
            this.audio.play(impactSfx, enemy.x);
          }
          this.renderer.triggerHitStop(0.055);
          this.vfx.spawnShockwave(p.x, p.y, 76, p.color, 0.26);
          this.vfx.spawnBurst(p.x, p.y, 14, p.color, 220);
          if (p.type === 'arrow') {
            this.vfx.spawnSlash(p.x, p.y, 58, -0.9, 0.9, '#34d399', 0.22);
            this.vfx.spawnGlyphBurst(p.x, p.y, 5, 'emerald');
          } else if (p.type === 'phantom_scythe') {
            this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'abyssal');
            if (p.owner && typeof p.owner.leechLife === 'function') {
              p.owner.leechLife(18, enemy, this, 'SOUL LEECH');
            }
          } else if (p.type === 'clock_gear') {
            this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'chrono');
          } else if (p.type === 'blade_wave') {
            this.vfx.spawnSlash(p.x, p.y, 72, -1.2, 1.2, '#38bdf8', 0.25);
            this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'steel');
          } else if (p.type === 'holy_light') {
            this.vfx.spawnShockwave(p.x, p.y, 64, '#ffffff', 0.22);
            this.vfx.spawnGlyphBurst(p.x, p.y, 5, 'radiant');
          } else {
            this.vfx.spawnGlyphBurst(p.x, p.y, 4, 'arcane');
          }
        } else {
          if (this.audio) {
            this.audio.play(
              p.type === 'arrow'
                ? 'arrow_hit'
                : p.type === 'holy_light'
                  ? 'holy_hit'
                  : p.type === 'phantom_scythe'
                    ? 'scythe_reap'
                    : p.type === 'clock_gear'
                      ? 'chrono_hit'
                      : p.type === 'blade_wave'
                        ? 'clang'
                        : 'fire_hit',
              p.x
            );
          }
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
    if (this.koSlowTimer > 0) {
      this.koSlowTimer = Math.max(0, this.koSlowTimer - rawDt);
      timeScale = 0.18;
    } else if (this.ultSlowTimer > 0) {
      this.ultSlowTimer = Math.max(0, this.ultSlowTimer - rawDt);
      timeScale = 0.25;
    } else if (this.userSlowMo) {
      timeScale = 0.35;
    }

    const dt = rawDt * timeScale;
    if (!this.isMatchOver) {
      this.matchTime += dt;
    }
    if (this.clashCooldown > 0) {
      this.clashCooldown = Math.max(0, this.clashCooldown - dt);
    }

    // Trigger Autonomous Mid-Match Stage Phenomenon at 11.5s or when either living fighter drops below 58% HP
    if (
      !this.isMatchOver &&
      !this.stageEventTriggered &&
      !this.leftFighter.isDead &&
      !this.rightFighter.isDead &&
      this.leftFighter.hp > 0 &&
      this.rightFighter.hp > 0 &&
      (this.matchTime >= 11.5 ||
        this.leftFighter.hp / this.leftFighter.maxHp <= 0.58 ||
        this.rightFighter.hp / this.rightFighter.maxHp <= 0.58)
    ) {
      this.triggerStagePhenomenon();
    }

    if (this.stageEventTimer > 0) {
      this.stageEventTimer = Math.max(0, this.stageEventTimer - dt);
      this.stageEventTickTimer += dt;
      if (this.stageEventTickTimer >= 2.0) {
        this.stageEventTickTimer = 0;
        if (this.renderer?.stageId === 'sylvan' && !this.isMatchOver) {
          // Starlight Monsoon periodic sanctuary heal
          this.leftFighter.heal(26, 'STARLIGHT');
          this.rightFighter.heal(26, 'STARLIGHT');
        } else if (this.renderer?.stageId === 'boneyard' && !this.isMatchOver) {
          // Blood Moon Frenzy crimson soul-ember eruption
          const midX = (this.leftFighter.x + this.rightFighter.x) * 0.5;
          this.vfx.spawnBurst(midX, this.renderer.groundY - 40, 20, '#e11d48', 260, {
            upBias: 160,
            size: 6
          });
        }
      }
    }

    this.leftFighter.update(dt, this.rightFighter, this);
    this.rightFighter.update(dt, this.leftFighter, this);

    // Check Simultaneous Melee / Skill Blade Clash
    if (
      !this.isMatchOver &&
      this.clashCooldown <= 0 &&
      !this.leftFighter.isDead &&
      !this.rightFighter.isDead
    ) {
      const dist = Math.abs(this.leftFighter.x - this.rightFighter.x);
      const f1Swinging =
        (this.leftFighter.state === 'AUTO_ATTACK' || this.leftFighter.state === 'SKILL') &&
        this.leftFighter.stateTimer >= 0.14 &&
        this.leftFighter.stateTimer <= 0.42;
      const f2Swinging =
        (this.rightFighter.state === 'AUTO_ATTACK' || this.rightFighter.state === 'SKILL') &&
        this.rightFighter.stateTimer >= 0.14 &&
        this.rightFighter.stateTimer <= 0.42;
      if (dist <= 185 && f1Swinging && f2Swinging) {
        this.clashCooldown = 2.6;
        const cx = (this.leftFighter.x + this.rightFighter.x) * 0.5;
        const cy = this.renderer.groundY - 102;
        this.leftFighter.vx = -155;
        this.rightFighter.vx = 155;
        this.triggerClashSpark(
          cx,
          cy,
          this.leftFighter.primaryColor,
          this.rightFighter.primaryColor,
          '★ PARRY CLASH! ★'
        );
      }
    }

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
    } else if (!this.isSimPaused) {
      this.stepSimulation(rawDt);
    }
    this.renderer.render(this.fighters, this.vfx);

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
