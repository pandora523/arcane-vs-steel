import { Fighter } from '../entities/Fighter.js?v=30fps88';
import { Monster, ArchfiendBoss } from '../entities/Monster.js?v=30fps88';
import { PixelForge } from '../engine/PixelForge.js?v=30fps88';
import { AdventureProgression, ADVENTURE_SKILL_TREE } from './AdventureProgression.js?v=30fps88';
import { AdventureSkillSets, ADVENTURE_HERO_KITS } from './AdventureSkillSets.js?v=30fps88';

export const ADVENTURE_WORLD_WIDTH = 4800;
export const ADVENTURE_DEPTH_MIN_Y = 442;
export const ADVENTURE_DEPTH_MAX_Y = 680;
export const ADVENTURE_DEPTH_MID_Y = 561;

export const ADVENTURE_ZONES = [
  {
    index: 0,
    id: 'outskirts',
    stageId: 'cathedral',
    title: 'ZONE I • ECLIPSE OUTSKIRTS',
    minX: 0,
    maxX: 1200,
    triggerX: 0,
    lockMinX: 80,
    lockMaxX: 1160
  },
  {
    index: 1,
    id: 'causeway',
    stageId: 'sylvan',
    title: 'ZONE II • CURSED STARWOOD',
    minX: 1200,
    maxX: 2400,
    triggerX: 1310,
    lockMinX: 1220,
    lockMaxX: 2360
  },
  {
    index: 2,
    id: 'stronghold',
    stageId: 'boneyard',
    title: 'ZONE III • ABYSSAL BONE-GATE',
    minX: 2400,
    maxX: 3600,
    triggerX: 2510,
    lockMinX: 2420,
    lockMaxX: 3560
  },
  {
    index: 3,
    id: 'blackpit',
    stageId: 'clocktower',
    title: 'ZONE IV • THRONE OF THE BLACK PIT',
    minX: 3600,
    maxX: 4800,
    triggerX: 3720,
    lockMinX: 3620,
    lockMaxX: 4720,
    isBossZone: true
  }
];

/**
 * Marvel-Arcade 2.5D Beat-'Em-Up Adventure Campaign Coordinator:
 * - 4800px continuous seamless 4-Zone 3D stage (`X: 80..4720`, `groundY: 442..680`) with screen-lock
 *   wave encounters, `"GO! ➔"` prompts, magnetic RPG pickups (`HP`, `SOUL EMBER`, `ASTRAL RELIC`),
 *   3-Branch Skill Tree leveling, Dedicated 11-Hero 2.5D Adventure Skill Sets, and a Giant Left-Side Colossal Boss (`BEHEMOTH MALPHAS`).
 */
export class AdventureManager {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.autoPlay = false;

    this.progression = new AdventureProgression(this);
    this.skillSets = new AdventureSkillSets(this);
    this.isSkillTreeOpen = false;

    this.depthMinY = ADVENTURE_DEPTH_MIN_Y;
    this.depthMaxY = ADVENTURE_DEPTH_MAX_Y;

    this.zoneIndex = 0;
    this.subWave = 0;
    this.subWaveDelay = 0;
    this.zonesCleared = [false, false, false, false];

    this.lockActive = false;
    this.lockMinX = 80;
    this.lockMaxX = ADVENTURE_WORLD_WIDTH - 80;

    this.goPromptActive = false;
    this.goPromptText = 'GO!';
    this.goBlinkTimer = 0;

    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this.bossEntity = null;

    this.pickups = [];
    this.monstersKilled = 0;
    this.totalWaveLabel = 'WAVE 1 / 5';
    this.score = 0;
    this.comboHits = 0;
    this.comboTimer = 0;

    // Input state (3D Keyboard WASD/Arrows + Smooth 360° Touch Analog Joystick + Right-Side Skill Cluster)
    this.heldLeft = false;
    this.heldRight = false;
    this.heldUp = false;
    this.heldDown = false;
    this.uiHeldLeft = false;
    this.uiHeldRight = false;
    this.uiHeldUp = false;
    this.uiHeldDown = false;
    this.joyX = 0;
    this.joyY = 0;
    this.joyActive = false;
    this.smoothVelX = 0;
    this.smoothVelY = 0;
    this.heldAttack = false;
    this.uiHeldAttack = false;
    this.queuedAction = null;
    this.queuedActionTimer = 0;

    // Tracked cooldown maximums for smooth 360-degree radial HUD sweeps
    this.autoCdMax = 0.52;
    this.skillCdMax = 4.5;
    this.dodgeCdMax = 1.35;
    this._renderedIconHero = null;

    this._boundKeyDown = (e) => this.onKeyDown(e);
    this._boundKeyUp = (e) => this.onKeyUp(e);
    this._boundBlur = () => this.clearHeldInputs();
    this._listenersAttached = false;
  }

  attachListeners() {
    if (this._listenersAttached || typeof window === 'undefined') return;
    this._listenersAttached = true;
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    window.addEventListener('blur', this._boundBlur);
  }

  clearHeldInputs() {
    this.heldLeft = false;
    this.heldRight = false;
    this.heldUp = false;
    this.heldDown = false;
    this.uiHeldLeft = false;
    this.uiHeldRight = false;
    this.uiHeldUp = false;
    this.uiHeldDown = false;
    this.heldAttack = false;
    this.uiHeldAttack = false;
    this.smoothVelX = 0;
    this.smoothVelY = 0;
    this.queuedAction = null;
    this.queuedActionTimer = 0;
    this.setJoystickVector(0, 0, false);
  }

  onKeyDown(e) {
    if (!this.active || this.game.isLandingOpen || this.game.isMatchOver) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    if (code === 'KeyT') {
      this.toggleSkillTree(true);
      e.preventDefault();
      return;
    }
    if (code === 'Escape' && this.isSkillTreeOpen) {
      this.closeSkillTree(true);
      e.preventDefault();
      return;
    }
    if (this.isSkillTreeOpen) return;

    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.heldLeft = true;
      this.syncJoystickKnobUI();
      e.preventDefault();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.heldRight = true;
      this.syncJoystickKnobUI();
      e.preventDefault();
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      this.heldUp = true;
      this.syncJoystickKnobUI();
      e.preventDefault();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.heldDown = true;
      this.syncJoystickKnobUI();
      e.preventDefault();
    } else if (code === 'KeyJ' || code === 'KeyZ') {
      this.heldAttack = true;
      this.triggerAction('attack');
      e.preventDefault();
    } else if (code === 'KeyK' || code === 'KeyX') {
      this.triggerAction('skill');
      e.preventDefault();
    } else if (
      code === 'KeyL' ||
      code === 'KeyC' ||
      code === 'Space' ||
      code === 'ShiftLeft' ||
      code === 'ShiftRight'
    ) {
      this.triggerAction('dodge');
      e.preventDefault();
    } else if (code === 'KeyU' || code === 'KeyQ') {
      this.triggerAction('overdrive');
      e.preventDefault();
    } else if (code === 'KeyI' || code === 'KeyE') {
      this.triggerAction('ultimate');
      e.preventDefault();
    } else if (code === 'KeyP') {
      this.toggleAutoPlay(true);
      e.preventDefault();
    }
  }

  onKeyUp(e) {
    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.heldLeft = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.heldRight = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      this.heldUp = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.heldDown = false;
      this.syncJoystickKnobUI();
    } else if (code === 'KeyJ' || code === 'KeyZ') {
      this.heldAttack = false;
    }
  }

  toggleSkillTree(playSound = true) {
    if (this.isSkillTreeOpen) {
      this.closeSkillTree(playSound);
    } else {
      this.openSkillTree(playSound);
    }
  }

  openSkillTree(playSound = true) {
    if (!this.active || this.game.isLandingOpen || this.game.isMatchOver) return;
    this.isSkillTreeOpen = true;
    this.clearHeldInputs();
    this.renderSkillTreeModal();
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('adv-skill-tree-modal')?.classList?.remove('hidden');
    }
    if (playSound && this.game.audio) {
      this.game.audio.play('clock_gear', this.game.leftFighter?.x || 600);
    }
  }

  closeSkillTree(playSound = true) {
    this.isSkillTreeOpen = false;
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('adv-skill-tree-modal')?.classList?.add('hidden');
    }
    if (playSound && this.game.audio) {
      this.game.audio.play('clock_gear', this.game.leftFighter?.x || 600);
    }
    this.syncControlDeckUI();
  }

  refundSkillTree(playSound = true) {
    const player = this.game.leftFighter;
    const refunded = this.progression.refundAllSkillPoints(player);
    if (refunded && playSound && this.game.audio) {
      this.game.audio.play('reflect', player?.x || 600);
    }
    this.renderSkillTreeModal();
    this.syncControlDeckUI();
    this.game.updateHUD?.();
  }

  renderSkillTreeModal() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const prog = this.progression;
    const stats = prog.getComputedStats();
    const player = this.game.leftFighter;

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };

    const heroTitle = player?.name ? player.name.toUpperCase() : 'CHAMPION';
    setTxt('adv-st-title', `${heroTitle} • ADVENTURE SKILL TREE`);
    setTxt('adv-st-level-badge', `LV.${prog.level}`);
    const xpPct = prog.level >= prog.maxLevel ? 100 : Math.min(100, Math.round((prog.xp / Math.max(1, prog.xpToNext)) * 100));
    const xpFill = document.getElementById('adv-st-xp-fill');
    if (xpFill?.style) xpFill.style.width = `${xpPct}%`;
    setTxt(
      'adv-st-xp-text',
      prog.level >= prog.maxLevel ? 'MAX LEVEL' : `${prog.xp} / ${prog.xpToNext} XP`
    );
    setTxt('adv-st-sp-count', `${prog.skillPoints} SKILL PT${prog.skillPoints === 1 ? '' : 'S'}`);

    const curHp = player ? Math.ceil(player.hp) : stats.maxHp;
    setTxt('adv-st-stat-hp', `${curHp} / ${stats.maxHp}`);
    setTxt(
      'adv-st-stat-atk',
      `${Math.round(stats.atkMult * 100)}% / ${Math.round(stats.skillMult * 100)}%`
    );
    setTxt(
      'adv-st-stat-spirit',
      `${Math.floor(prog.spirit)}/${prog.maxSpirit} (COST ${stats.skillSpiritCost})`
    );
    setTxt(
      'adv-st-stat-ult',
      `${Math.floor(prog.ultCharge)}% / ${Math.floor(prog.astralCharge)}%`
    );
    setTxt('adv-st-stat-ward', `${Math.round(stats.wardReduction * 100)}% DR`);

    const grid = document.getElementById('adv-st-grid');
    if (!grid || typeof document.createElement !== 'function') return;
    grid.innerHTML = '';

    const branches = [
      { key: 'wrath', title: '🔥 SOLAR WRATH', sub: 'OFFENSE & SPIRIT' },
      { key: 'astral', title: '✦ ASTRAL AWAKENING', sub: 'DRIVE & RELIC SEALS' },
      { key: 'aegis', title: '🛡️ PHOENIX AEGIS', sub: 'VITALITY & AGILITY' }
    ];

    for (const b of branches) {
      const col = document.createElement('div');
      col.className = `adv-st-branch adv-st-branch-${b.key}`;

      const hdr = document.createElement('div');
      hdr.className = 'adv-st-branch-hdr';
      hdr.innerHTML = `<span>${b.title}</span><span>${prog.getBranchPointsSpent(b.key)} PTS</span>`;
      col.appendChild(hdr);

      const nodes = ADVENTURE_SKILL_TREE.filter((n) => n.branch === b.key);
      for (const node of nodes) {
        const rank = prog.getRank(node.id);
        const canUp = prog.canUpgradeNode(node.id);
        const branchPts = prog.getBranchPointsSpent(b.key);
        const tierLocked =
          (node.tier === 2 && branchPts < 1) || (node.tier === 3 && branchPts < 2);

        const card = document.createElement('div');
        card.className = `adv-st-node ${
          rank > 0 ? 'is-unlocked' : canUp ? 'is-available' : tierLocked ? 'is-locked' : ''
        }`;

        const top = document.createElement('div');
        top.className = 'adv-st-node-top';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'adv-st-node-title';
        titleSpan.textContent = `${node.glyph} ${node.name}`;
        const rankSpan = document.createElement('span');
        rankSpan.className = 'adv-st-node-rank';
        rankSpan.textContent = `${rank} / ${node.maxRank}`;
        top.appendChild(titleSpan);
        top.appendChild(rankSpan);

        const desc = document.createElement('p');
        desc.className = 'adv-st-node-desc';
        desc.textContent = node.summary(rank);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `adv-st-upgrade-btn ${canUp ? 'can-upgrade' : ''}`;
        btn.disabled = !canUp;
        btn.textContent =
          rank >= node.maxRank
            ? '★ MAXED'
            : tierLocked
              ? `REQ TIER ${node.tier - 1}`
              : prog.skillPoints <= 0
                ? 'NEED 1 SP'
                : '+ UPGRADE (1 SP)';
        btn.addEventListener('click', () => {
          if (prog.upgradeNode(node.id, this.game.leftFighter)) {
            if (this.game.audio) {
              this.game.audio.play('holy_hit', this.game.leftFighter?.x || 600);
            }
            this.renderSkillTreeModal();
            this.syncControlDeckUI();
            this.game.updateHUD?.();
          }
        });

        card.appendChild(top);
        card.appendChild(desc);
        card.appendChild(btn);
        col.appendChild(card);
      }

      grid.appendChild(col);
    }
  }

  setMoveInput(dir, pressed) {
    if (dir < 0) this.uiHeldLeft = Boolean(pressed);
    if (dir > 0) this.uiHeldRight = Boolean(pressed);
    this.syncJoystickKnobUI();
  }

  setDepthInput(dir, pressed) {
    if (dir < 0) this.uiHeldUp = Boolean(pressed);
    if (dir > 0) this.uiHeldDown = Boolean(pressed);
    this.syncJoystickKnobUI();
  }

  setAttackHeld(pressed) {
    this.uiHeldAttack = Boolean(pressed);
  }

  setJoystickVector(nx, ny, active = true) {
    if (!active) {
      this.joyActive = false;
      this.joyX = 0;
      this.joyY = 0;
    } else {
      const mag = Math.hypot(nx || 0, ny || 0);
      const scale = mag > 1 ? 1 / mag : 1;
      this.joyActive = true;
      this.joyX = (nx || 0) * scale;
      this.joyY = (ny || 0) * scale;
    }
    this.syncJoystickKnobUI();
  }

  syncJoystickKnobUI() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const base = document.getElementById('adv-joystick-base');
    const knob = document.getElementById('adv-joystick-knob');
    if (!base || !knob) return;

    let vx = 0;
    let vy = 0;
    let maxPx = 32;
    if (this.joyActive) {
      vx = this.joyX;
      vy = this.joyY;
      maxPx = 40;
    } else {
      const kbX = (this.heldRight || this.uiHeldRight ? 1 : 0) - (this.heldLeft || this.uiHeldLeft ? 1 : 0);
      const kbY = (this.heldDown || this.uiHeldDown ? 1 : 0) - (this.heldUp || this.uiHeldUp ? 1 : 0);
      const mag = Math.hypot(kbX, kbY);
      vx = mag > 1 ? kbX / mag : kbX;
      vy = mag > 1 ? kbY / mag : kbY;
    }

    const dx = Math.round(vx * maxPx);
    const dy = Math.round(vy * maxPx);
    if (knob.style) knob.style.transform = `translate3d(${dx}px, ${dy}px, 0px)`;
    base.classList?.toggle('is-active', Math.hypot(vx, vy) > 0.08);

    if (typeof base.querySelector === 'function') {
      base.querySelector('.adv-joy-n')?.classList?.toggle('is-lit', vy < -0.22);
      base.querySelector('.adv-joy-s')?.classList?.toggle('is-lit', vy > 0.22);
      base.querySelector('.adv-joy-w')?.classList?.toggle('is-lit', vx < -0.22);
      base.querySelector('.adv-joy-e')?.classList?.toggle('is-lit', vx > 0.22);
    }
  }

  shiftEntityDepth(entity, dz) {
    if (!entity || !Number.isFinite(dz) || dz === 0) return 0;
    const prevGy = Number.isFinite(entity.groundY) ? entity.groundY : ADVENTURE_DEPTH_MID_Y;
    const nextGy = Math.max(this.depthMinY, Math.min(this.depthMaxY, prevGy + dz));
    const applied = nextGy - prevGy;
    if (applied === 0) return 0;
    entity.groundY = nextGy;
    entity.y += applied;
    if (Array.isArray(entity.capeNodes)) {
      for (const n of entity.capeNodes) {
        if (n) n.y += applied;
      }
    }
    return applied;
  }

  triggerAction(actionName) {
    if (!this.active || this.game.isMatchOver || this.isSkillTreeOpen) return;
    this.queuedAction = actionName;
    this.queuedActionTimer = 0.48;
  }

  setAutoPlay(enabled, playSound = false) {
    this.autoPlay = Boolean(enabled);
    const player = this.game.leftFighter;
    if (player) {
      player.adventureAutoPlay = this.autoPlay;
      if (this.autoPlay) {
        player._manualWalkActive = false;
      }
    }
    this.syncControlDeckUI();
    if (playSound && this.game.audio) {
      this.game.audio.play('clock_gear', player ? player.x : 600);
    }
  }

  toggleAutoPlay(playSound = true) {
    this.setAutoPlay(!this.autoPlay, playSound);
  }

  refreshActionIcons(heroKey = 'mage') {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const slots = ['attack', 'dodge', 'skill', 'overdrive', 'ultimate'];
    const heroTags = ADVENTURE_HERO_KITS[heroKey]?.tags || {
      attack: 'ATK',
      dodge: 'DASH',
      skill: 'SKILL',
      overdrive: 'DRIVE',
      ultimate: 'ULT'
    };

    for (const slot of slots) {
      const canvas = document.getElementById(`adv-icon-${slot}`);
      if (canvas && typeof canvas.getContext === 'function') {
        const ictx = canvas.getContext('2d');
        if (ictx) {
          PixelForge.drawAdventureActionIcon(
            ictx,
            heroKey,
            slot,
            canvas.width || 64,
            canvas.height || 64,
            0
          );
        }
      }
      const tagEl = document.getElementById(`adv-tag-${slot}`);
      if (tagEl && heroTags[slot]) {
        tagEl.textContent = heroTags[slot];
      }
    }
    this._renderedIconHero = heroKey;
    this._renderedMageIconsReady = Boolean(
      PixelForge.assets?.mage?.icons?.complete && PixelForge.assets.mage.icons.naturalWidth >= 448
    );
  }

  syncControlDeckUI() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const visible = Boolean(this.active && !this.game.isLandingOpen && !this.game.isMatchOver);
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.classList?.toggle('is-adventure-active', visible);
    }
    const deck = document.getElementById('adventure-controls');
    if (deck) {
      deck.classList?.toggle('hidden', !visible);
    }

    const stLbl = document.getElementById('adv-skilltree-label');
    if (stLbl) {
      stLbl.textContent = `✦ LV.${this.progression.level} SKILLS`;
    }
    const spBadge = document.getElementById('adv-sp-badge');
    if (spBadge) {
      spBadge.textContent = `${this.progression.skillPoints} SP`;
      spBadge.classList?.toggle('has-sp', this.progression.skillPoints > 0);
    }

    const autoBtn = document.getElementById('adv-btn-autoplay');
    const autoLbl = document.getElementById('adv-autoplay-label');
    if (autoBtn) {
      autoBtn.setAttribute?.('aria-pressed', String(this.autoPlay));
      autoBtn.classList?.toggle('is-autoplay-on', this.autoPlay);
    }
    if (autoLbl) {
      autoLbl.textContent = this.autoPlay ? 'AI: ON' : 'AI: OFF';
    }

    this.syncJoystickKnobUI();

    const player = this.game.leftFighter;
    if (!player) return;

    const heroKey = player.heroId || this.game.slot1Hero || 'mage';
    const mageIconsNowReady =
      heroKey === 'mage' &&
      Boolean(PixelForge.assets?.mage?.icons?.complete && PixelForge.assets.mage.icons.naturalWidth >= 448);
    if (
      this._renderedIconHero !== heroKey ||
      (heroKey === 'mage' && mageIconsNowReady && !this._renderedMageIconsReady)
    ) {
      this.refreshActionIcons(heroKey);
    }

    const updateOrbSlot = (slot, mode, sweepRatio, labelText, hidden = false) => {
      const btn = document.getElementById(`adv-btn-${slot}`);
      const sweep = document.getElementById(`adv-cd-sweep-${slot}`);
      const txt = document.getElementById(`adv-cd-text-${slot}`);
      if (btn) {
        btn.classList?.toggle('hidden', Boolean(hidden));
        btn.classList?.toggle('is-ready', mode === 'ready');
        btn.classList?.toggle('is-on-cd', mode === 'cd');
        btn.classList?.toggle('is-charging', mode === 'charge');
        btn.classList?.toggle('is-low-spirit', mode === 'low_spirit');
      }
      if (sweep?.style?.setProperty) {
        const deg = Math.max(0, Math.min(360, (sweepRatio || 0) * 360));
        sweep.style.setProperty('--cd-deg', `${deg.toFixed(1)}deg`);
      }
      if (txt && txt.textContent !== labelText) {
        txt.textContent = labelText;
      }
    };

    const stats = this.progression.getComputedStats();

    // 1. Basic Attack (subtle cadence sweep while keeping primary icon vibrant)
    const autoCd = Math.max(0, player.autoCooldown || 0);
    this.autoCdMax = Math.max(0.32, this.autoCdMax || 0.44);
    updateOrbSlot('attack', 'ready', autoCd > 0.03 ? autoCd / this.autoCdMax : 0, '');

    // 2. Pure 3D Evade Dash
    const dodgeCd = Math.max(0, player.dodgeCooldown || 0);
    this.dodgeCdMax = Math.max(this.dodgeCdMax, dodgeCd, 0.5);
    if (dodgeCd > 0.05) {
      updateOrbSlot('dodge', 'cd', dodgeCd / this.dodgeCdMax, `${dodgeCd.toFixed(1)}s`);
    } else {
      updateOrbSlot('dodge', 'ready', 0, '');
    }

    // 3. Special Skill (Powered by Solar Spirit + Cooldown)
    const skillCd = Math.max(0, player.skillCooldown || 0);
    this.skillCdMax = Math.max(this.skillCdMax, skillCd, 0.5);
    if (skillCd > 0.05) {
      updateOrbSlot('skill', 'cd', skillCd / this.skillCdMax, `${skillCd.toFixed(1)}s`);
    } else if (this.progression.spirit + 0.01 < stats.skillSpiritCost) {
      const spRatio = Math.max(0, Math.min(1, this.progression.spirit / Math.max(1, stats.skillSpiritCost)));
      updateOrbSlot('skill', 'low_spirit', 1 - spRatio, `${stats.skillSpiritCost} SP`);
    } else {
      updateOrbSlot('skill', 'ready', 0, '');
    }

    // 4. Adventure Overdrive Ultimate (Soul Ember & Combo Charge 0..100%)
    const ultRatio = Math.max(0, Math.min(1, this.progression.ultCharge / 100));
    if (ultRatio < 0.999) {
      updateOrbSlot('overdrive', 'charge', 1 - ultRatio, `${Math.floor(ultRatio * 100)}%`);
    } else {
      updateOrbSlot('overdrive', 'ready', 0, 'MAX');
    }

    // 5. Supreme Cataclysm Ultimate (Astral Relic Seals 0..100%)
    const hasUlt = Boolean(player.hasTrueUltimate);
    const sealRatio = Math.max(0, Math.min(1, this.progression.astralCharge / 100));
    if (!hasUlt) {
      updateOrbSlot('ultimate', 'charge', 1, '', true);
    } else if (sealRatio < 0.999) {
      updateOrbSlot('ultimate', 'charge', 1 - sealRatio, `${Math.floor(sealRatio * 100)}%`, false);
    } else {
      updateOrbSlot('ultimate', 'ready', 0, 'ULT', false);
    }
  }

  startCampaign(playerFighter) {
    this.attachListeners();
    this.active = true;
    this.isSkillTreeOpen = false;
    this.clearHeldInputs();

    this.zoneIndex = 0;
    this.subWave = 0;
    this.subWaveDelay = 0;
    this.zonesCleared = [false, false, false, false];
    this.pickups = [];
    this.monstersKilled = 0;
    this.score = 0;
    this.comboHits = 0;
    this.comboTimer = 0;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this.bossEntity = null;
    this.goPromptActive = false;

    this.skillSets.attachToFighter(playerFighter);
    this.progression.resetForNewCampaign();
    this.progression.attachToFighter(playerFighter);

    this.autoCdMax = playerFighter.autoInterval || 0.44;
    this.skillCdMax = Math.max(0.5, (playerFighter.skillMaxCooldown || 4.5) * 0.85);
    this.dodgeCdMax = 1.35;
    this._renderedIconHero = null;
    this._renderedMageIconsReady = false;

    const renderer = this.game.renderer;
    if (renderer) {
      renderer.worldWidth = ADVENTURE_WORLD_WIDTH;
      renderer.adventureMode = true;
      renderer.adventureHook = this;
      renderer.stageId = 'cathedral';
      renderer.permanentStageOverride = null;
      renderer.trueUltStageOverride = null;
      renderer.trueUltStageAlpha = 0;
      renderer.camX = 480;
      renderer.camY = ADVENTURE_DEPTH_MID_Y - 95;
    }

    playerFighter.x = 240;
    playerFighter.groundY = ADVENTURE_DEPTH_MID_Y;
    playerFighter.y = ADVENTURE_DEPTH_MID_Y;
    playerFighter.facing = 1;
    playerFighter.team = 1;
    playerFighter.isPlayerControlled = true;
    playerFighter.adventureAutoPlay = this.autoPlay;
    playerFighter._manualWalkActive = false;
    playerFighter._advVaultVelZ = 0;
    playerFighter._advPureDodge = false;
    playerFighter._advPureDodgeTimer = 0;
    if (Array.isArray(playerFighter.capeNodes)) {
      playerFighter.capeNodes.forEach((n, i) => {
        if (n) {
          n.x = playerFighter.x - playerFighter.facing * i * 9;
          n.y = playerFighter.y - 52 + i * 9;
        }
      });
    }

    this.game.fighters = [playerFighter];
    this.closeSkillTree(false);
    this.renderSkillTreeModal();
    this.refreshActionIcons(playerFighter.heroId || 'mage');
    this.spawnZoneEncounter(0, 1);
    this.syncStageBadge();
    this.syncRightHUD();
    this.syncControlDeckUI();
  }

  stopCampaign() {
    this.closeSkillTree(false);
    if (this.game.leftFighter) {
      this.game.leftFighter._advPureDodge = false;
      this.game.leftFighter._advPureDodgeTimer = 0;
    }
    this.progression.detachFromFighter(this.game.leftFighter);
    this.skillSets.detachFromFighter(this.game.leftFighter);
    this.active = false;
    this.lockActive = false;
    this.goPromptActive = false;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this.bossEntity = null;
    this.pickups = [];
    this.clearHeldInputs();

    const renderer = this.game.renderer;
    if (renderer) {
      renderer.worldWidth = 1200;
      renderer.adventureMode = false;
      renderer.adventureHook = null;
      renderer.adventureCamMinX = null;
      renderer.adventureCamMaxX = null;
    }
    this.syncControlDeckUI();
  }

  spawnMonster(kind, x, opts = {}) {
    const lanePool = [508, 616, 470, 646, 558];
    const defaultGy =
      kind === 'archfiend'
        ? ADVENTURE_DEPTH_MID_Y
        : lanePool[(this.game.fighters ? this.game.fighters.length : 0) % lanePool.length];
    const rawGy = Number.isFinite(opts.groundY) ? opts.groundY : defaultGy;
    const gy = Math.max(this.depthMinY + 12, Math.min(this.depthMaxY - 12, rawGy));
    const player = this.game.leftFighter;
    const spawnX = kind === 'archfiend' ? 3865 : x;
    const facing = kind === 'archfiend' ? 1 : player && player.x > spawnX ? 1 : -1;
    const m =
      kind === 'archfiend'
        ? new ArchfiendBoss(spawnX, gy, facing)
        : new Monster(kind, spawnX, gy, facing, opts);
    m.game = this.game;
    m.team = 2;
    m.groundY = gy;
    m.y = gy;
    this.game.fighters.push(m);
    if (!this.game.rightFighter || this.game.rightFighter.isDead || m.isBoss) {
      this.game.rightFighter = m;
    }
    if (this.game.vfx) {
      this.game.vfx.spawnShockwave(spawnX, gy - 24, m.isBoss ? 250 : 92, m.primaryColor, 0.34, true);
      this.game.vfx.spawnBurst(spawnX, gy - 44, m.isBoss ? 28 : 12, m.primaryColor, 210, { upBias: 130, size: 5 });
    }
    return m;
  }

  spawnPickup(type, x, groundY = null, extra = {}) {
    const fallbackGy = this.game.leftFighter?.groundY || ADVENTURE_DEPTH_MID_Y;
    const gy = Math.max(
      this.depthMinY + 16,
      Math.min(this.depthMaxY - 16, Number.isFinite(groundY) ? groundY : fallbackGy)
    );
    this.pickups.push({
      type, // 'hp' | 'ember' | 'relic' (also accepts legacy 'mana' | 'ult')
      x,
      groundY: gy,
      y: gy,
      vy: -210,
      age: 0,
      ultAmt: extra.ultAmt || 20,
      collected: false
    });
  }

  spawnZoneEncounter(zoneIdx, subWave = 1) {
    const z = ADVENTURE_ZONES[zoneIdx];
    if (!z) return;
    this.zoneIndex = zoneIdx;
    this.subWave = subWave;
    this.goPromptActive = false;
    this.lockActive = true;
    this.lockMinX = z.lockMinX;
    this.lockMaxX = z.lockMaxX;

    if (this.game.renderer) {
      this.game.renderer.adventureCamMinX = z.minX;
      this.game.renderer.adventureCamMaxX = z.maxX;
      if (!this.game.renderer.permanentStageOverride) {
        this.game.renderer.stageId = z.stageId;
      }
    }

    if (zoneIdx === 0 && subWave === 1) {
      this.totalWaveLabel = 'WAVE 1 / 5';
      this.spawnMonster('ghoul', 680, { groundY: 506 });
      this.spawnMonster('ghoul', 840, { groundY: 618 });
    } else if (zoneIdx === 0 && subWave === 2) {
      this.totalWaveLabel = 'WAVE 2 / 5';
      this.spawnMonster('ghoul', 880, { groundY: 476 });
      this.spawnMonster('cultist', 1020, { groundY: 562 });
      this.spawnMonster('ghoul', 230, { groundY: 638 });
      this.game.renderer?.triggerStageEvent?.(
        '★ VANGUARD AMBUSH! ★',
        'VOID CULTIST & ASHFANG PACK DETECTED!',
        '#a855f7',
        2.4
      );
    } else if (zoneIdx === 1) {
      this.totalWaveLabel = 'WAVE 3 / 5';
      this.spawnMonster('brute', 1960, { groundY: 562 });
      this.spawnMonster('cultist', 2140, { groundY: 478 });
      this.spawnMonster('cultist', 2250, { groundY: 644 });
      this.game.renderer?.triggerStageEvent?.(
        '★ ZONE II: CURSED STARWOOD ★',
        'OBSIDIAN JUGGERNAUT BLOCKS THE CAUSEWAY!',
        '#f59e0b',
        2.6
      );
    } else if (zoneIdx === 2) {
      this.totalWaveLabel = 'WAVE 4 / 5';
      this.spawnMonster('brute', 3140, { isElite: true, groundY: 560 });
      this.spawnMonster('ghoul', 2940, { groundY: 474 });
      this.spawnMonster('ghoul', 3290, { groundY: 648 });
      this.spawnMonster('cultist', 2570, { isElite: true, groundY: 518 });
      this.game.renderer?.triggerStageEvent?.(
        '★ ZONE III: ABYSSAL BONE-GATE ★',
        'ELITE HELLFORGED GUARDIANS!',
        '#ef4444',
        2.8
      );
    } else if (zoneIdx === 3) {
      this.totalWaveLabel = 'COLOSSAL BOSS';
      this.bossWarningTimer = 1.85;
      this.bossSpawnPending = true;
      const player = this.game.leftFighter;
      if (player) {
        if (player.x < 4240) player.x = 4240;
        player.facing = -1;
      }
      if (this.game.audio) this.game.audio.play('eclipse_charge', 3920);
      if (this.game.renderer) {
        this.game.renderer.triggerShake(16, 0.72);
        this.game.renderer.triggerStageEvent?.(
          '⚠ WARNING: BEHEMOTH MALPHAS! ⚠',
          'COLOSSAL SOVEREIGN RISES ON THE LEFT ABYSS!',
          '#ef4444',
          3.4
        );
      }
    }

    this.syncStageBadge();
    this.syncRightHUD();
  }

  onBossPhaseShift(_boss, phase) {
    if (!this.active || this.game.isMatchOver) return;
    if (phase === 2) {
      // Summon 2 flanking Ashfang Vanguards on upper & lower right lanes + drop Elixir & Soul Ember!
      this.spawnMonster('ghoul', 4360, { groundY: 484 });
      this.spawnMonster('ghoul', 4540, { groundY: 638 });
      this.spawnPickup('hp', 4250, 502);
      this.spawnPickup('ember', 4340, 622, { ultAmt: 28 });
    } else if (phase === 3) {
      this.spawnPickup('hp', 4240, 496);
      this.spawnPickup('relic', 4360, 626);
      this.spawnPickup('ember', 4460, 558, { ultAmt: 30 });
    }
  }

  getLivingMonsters() {
    if (!this.game.fighters) return [];
    return this.game.fighters.filter((f) => f && f.team === 2 && !f.isDead);
  }

  getNearestLivingMonster(player) {
    const living = this.getLivingMonsters();
    if (!living.length) return null;
    const pGy = player.groundY || player.y || ADVENTURE_DEPTH_MID_Y;
    let best = living[0];
    let bestScore = Infinity;
    for (const m of living) {
      const mGy = m.groundY || m.y || ADVENTURE_DEPTH_MID_Y;
      const depthDist = m.isColossalBoss ? 0 : (mGy - pGy) * 1.65;
      const d = Math.hypot(m.x - player.x, depthDist) - (m.isBoss ? 55 : 0);
      if (d < bestScore) {
        bestScore = d;
        best = m;
      }
    }
    return best;
  }

  onMonsterDeath(deadMonster) {
    if (!this.active) return;
    this.monstersKilled++;
    const pts = deadMonster.scoreValue || 250;
    this.score += pts;

    const player = this.game.leftFighter;
    const xpGain = deadMonster.isBoss ? 320 : deadMonster.isElite ? 95 : 52;
    this.progression.gainXp(xpGain, player);

    if (!deadMonster.isBoss) {
      // Slain monsters drop magnetic Soul Embers to fuel Solar Awakening Ultimate!
      this.spawnPickup('ember', deadMonster.x, deadMonster.groundY, {
        ultAmt: deadMonster.isElite ? 26 : 19
      });
      if (deadMonster.isElite) {
        this.spawnPickup('relic', deadMonster.x + 44, deadMonster.groundY);
      }
    }

    if (player && !player.isDead && this.game.vfx) {
      this.game.vfx.spawnDamageText(
        deadMonster.x,
        deadMonster.y - 165,
        0,
        false,
        `+${xpGain} XP • +${pts}`,
        '#fde047'
      );
    }

    // If the Final Boss Malphas was slain, banish any remaining minions and trigger Campaign Victory!
    if (deadMonster.isBoss) {
      for (const m of this.getLivingMonsters()) {
        if (m !== deadMonster && !m.isDead) {
          m.hp = 0;
          m.isDead = true;
          m.setState('DEATH');
        }
      }
      this.completeCampaignVictory(deadMonster);
      return;
    }

    this.syncRightHUD();
  }

  completeCampaignVictory(boss) {
    const g = this.game;
    const player = g.leftFighter;
    this.lockActive = false;
    this.goPromptActive = false;
    this.zonesCleared[3] = true;

    g.isMatchOver = true;
    g.koSlowTimer = 0.55;
    g.ultSlowTimer = 0;
    g.deadMatchFighter = boss;
    g.victoryRevealPending = true;
    g.postDeathHoldTimer = 0;

    if (player && !player.isDead) {
      player._manualWalkActive = false;
    }
    if (typeof g.renderer?.triggerKOFinisher === 'function' && player) {
      g.renderer.triggerKOFinisher(
        boss.x,
        boss.y - 110,
        player.primaryColor,
        player.name,
        player.heroId
      );
    }

    // Calculate Arcade Rank
    const clearSec = Math.max(1, Math.round(g.matchTime || 1));
    const timeBonus = Math.max(0, (180 - clearSec) * 20);
    this.score += timeBonus;
    const rank =
      this.score >= 8200 ? 'S+ SOLAR SOVEREIGN' : this.score >= 6500 ? 'S RANK' : this.score >= 4800 ? 'A RANK' : 'B RANK';

    const hasDom = typeof document !== 'undefined' && typeof document.getElementById === 'function';
    const eyebrowEl = hasDom ? document.getElementById('victory-eyebrow') : null;
    const winnerEl = hasDom ? document.getElementById('victory-winner') : null;
    const statsEl = hasDom ? document.getElementById('victory-stats') : null;
    const autoEl = hasDom ? document.getElementById('victory-auto-next') : null;

    if (eyebrowEl) {
      eyebrowEl.textContent = `ADVENTURE CAMPAIGN CLEARED • ${rank} • SCORE: ${this.score}`;
    }
    if (winnerEl && player) {
      winnerEl.textContent = `${player.name.toUpperCase()} CONQUERS THE BLACK PIT`;
    }
    if (statsEl) {
      statsEl.textContent = `Archfiend Malphas Vanquished! ${this.monstersKilled} Monsters Slain across 4 Realms in ${clearSec}s.`;
    }
    if (autoEl) {
      autoEl.textContent = 'CAMPAIGN COMPLETE • PRESS PLAY AGAIN TO REPLAY';
    }

    // Populate Left (Sol) & Right (Abyssal Horde + Boss) Telemetry
    if (hasDom && player?.stats) {
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
      };
      setTxt('tel-left-name', player.name);
      setTxt('tel-left-dmg', player.stats.damageDealt || 0);
      setTxt('tel-left-skills', `${player.stats.skillsUsed || 0} / ${player.stats.ultsUsed || 0}`);
      setTxt('tel-left-max', player.stats.biggestHit || 0);
      setTxt('tel-left-extra', `${player.stats.healingDone || 0} / ${this.monstersKilled} KILLS`);

      setTxt('tel-right-name', 'ARCHFIEND HORDE');
      setTxt('tel-right-dmg', boss?.stats?.damageDealt || 0);
      setTxt('tel-right-skills', `PHASE ${boss?.bossPhase || 3}`);
      setTxt('tel-right-max', boss?.stats?.biggestHit || 0);
      setTxt('tel-right-extra', `SCORE ${this.score}`);
    }

    this.syncControlDeckUI();
    g.updateHUD();
  }

  onPlayerDeath(player) {
    const g = this.game;
    g.isMatchOver = true;
    g.koSlowTimer = 0.48;
    g.deadMatchFighter = player;
    g.victoryRevealPending = true;
    g.postDeathHoldTimer = 0;

    const killer = this.bossEntity || this.getLivingMonsters()[0] || player;
    const hasDom = typeof document !== 'undefined' && typeof document.getElementById === 'function';
    const eyebrowEl = hasDom ? document.getElementById('victory-eyebrow') : null;
    const winnerEl = hasDom ? document.getElementById('victory-winner') : null;
    const statsEl = hasDom ? document.getElementById('victory-stats') : null;
    if (eyebrowEl) {
      eyebrowEl.textContent = `ADVENTURE FALLEN AT ZONE ${this.zoneIndex + 1} • SCORE: ${this.score}`;
    }
    if (winnerEl) {
      winnerEl.textContent = `${killer.name.toUpperCase()} PREVAILS`;
    }
    if (statsEl) {
      statsEl.textContent = 'The Black Pit claims another soul — ignite Solar Overdrive and try again!';
    }
    this.syncControlDeckUI();
    g.updateHUD();
  }

  unlockCurrentZone(zoneIdx) {
    this.zonesCleared[zoneIdx] = true;
    this.lockActive = false;
    const nextZone = ADVENTURE_ZONES[zoneIdx + 1];
    this.lockMinX = 80;
    this.lockMaxX = nextZone ? nextZone.maxX - 40 : ADVENTURE_WORLD_WIDTH - 80;

    if (this.game.renderer) {
      this.game.renderer.adventureCamMinX = 0;
      this.game.renderer.adventureCamMaxX = nextZone ? nextZone.maxX : ADVENTURE_WORLD_WIDTH;
    }

    this.goPromptActive = true;
    this.goPromptText = zoneIdx === 2 ? 'BOSS AHEAD! GO!' : 'CLEAR! GO!';
    this.goBlinkTimer = 0;

    const p = this.game.leftFighter;
    this.progression.gainXp(35, p);

    const dropBaseX = p ? Math.min(this.lockMaxX - 180, p.x + 140) : zoneIdx * 1200 + 820;
    if (zoneIdx === 0) {
      this.spawnPickup('hp', dropBaseX, 514);
      this.spawnPickup('ember', dropBaseX + 68, 566, { ultAmt: 24 });
      this.spawnPickup('relic', dropBaseX + 136, 614);
    } else if (zoneIdx === 1) {
      this.spawnPickup('hp', dropBaseX, 512);
      this.spawnPickup('ember', dropBaseX + 68, 564, { ultAmt: 24 });
      this.spawnPickup('relic', dropBaseX + 136, 612);
    } else if (zoneIdx === 2) {
      // Sanctuary Boss-Prep Cache staggered across the 3D road before Throne of the Black Pit!
      this.spawnPickup('hp', 3340, 498);
      this.spawnPickup('ember', 3420, 562, { ultAmt: 28 });
      this.spawnPickup('relic', 3500, 626);
    }

    if (this.game.audio) {
      this.game.audio.play('reflect', dropBaseX);
    }
  }

  updatePickups(dt, player) {
    if (!this.pickups.length) return;
    const pGy = player ? player.groundY || player.y : ADVENTURE_DEPTH_MID_Y;
    const stats = this.progression.getComputedStats();

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      let pkGy = Number.isFinite(pk.groundY) ? pk.groundY : ADVENTURE_DEPTH_MID_Y;
      pk.age += dt;
      if (pk.y < pkGy || pk.vy < 0) {
        pk.vy += 680 * dt;
        pk.y += pk.vy * dt;
        if (pk.y >= pkGy) {
          pk.y = pkGy;
          pk.vy = 0;
        }
      }

      // Magnetic pull on Soul Embers & Astral Relic Shards so kills flow smoothly into Sol's gauges!
      const isMagnetic =
        pk.type === 'ember' || pk.type === 'relic' || pk.type === 'mana' || pk.type === 'ult';
      if (isMagnetic && player && !player.isDead && pk.age >= 0.18) {
        const dx = player.x - pk.x;
        const dz = pGy - pkGy;
        const dist = Math.hypot(dx, dz * 1.35);
        if (dist > 4 && dist <= 265) {
          const pullSpeed = (230 + (265 - dist) * 1.45) * dt;
          pk.x += (dx / dist) * pullSpeed;
          pkGy += (dz / dist) * pullSpeed * 0.85;
          pk.groundY = pkGy;
          if (pk.vy === 0) pk.y = pkGy;
        }
      }

      if (
        player &&
        !player.isDead &&
        Math.abs(player.x - pk.x) <= 78 &&
        Math.abs(pGy - pkGy) <= 68 &&
        Math.abs(player.y - pk.y) <= 110
      ) {
        this.pickups.splice(i, 1);
        this.score += 150;
        if (this.game.audio) this.game.audio.play('holy_hit', pk.x);
        if (pk.type === 'hp') {
          player.heal(Math.round(player.maxHp * 0.34), 'SOLAR ELIXIR +HP!');
          this.game.vfx?.spawnBurst(pk.x, pk.y - 24, 14, '#4ade80', 190, { upBias: 120, size: 5 });
        } else if (pk.type === 'ember' || pk.type === 'mana') {
          const gainAmt = pk.ultAmt || 20;
          this.progression.gainAdventureUlt(gainAmt, player);
          this.progression.gainSpirit(14);
          if (stats.emberHealPct > 0) {
            player.heal(Math.max(8, Math.round(player.maxHp * stats.emberHealPct)), 'EMBER MEND');
          }
          const odTag = ADVENTURE_HERO_KITS[player.heroId]?.tags?.overdrive || 'DRIVE';
          this.game.vfx?.spawnDamageText(
            player.x,
            player.y - 148,
            0,
            false,
            `+SOUL EMBER (${odTag} ${Math.floor(this.progression.ultCharge)}%)`,
            '#fb923c'
          );
          this.game.vfx?.spawnBurst(pk.x, pk.y - 24, 14, '#fb923c', 190, { upBias: 120, size: 5 });
        } else if (pk.type === 'relic' || pk.type === 'ult') {
          this.progression.gainAstralRelic(34, player, '★ ASTRAL SEAL +34%! ★');
          this.game.vfx?.spawnBurst(pk.x, pk.y - 24, 18, '#67e8f9', 210, { upBias: 135, size: 5 });
        }
      }
    }
  }

  syncStageBadge() {
    const badge = this.game.hudEls?.stageBadge;
    if (!badge) return;
    if (this.game.renderer?.permanentStageOverride === 'inferno') {
      badge.textContent = `Z${this.zoneIndex + 1} • LAYWASTE OF INFERNO`;
      return;
    }
    const z = ADVENTURE_ZONES[this.zoneIndex] || ADVENTURE_ZONES[0];
    badge.textContent = z.title;
  }

  syncRightHUD() {
    const g = this.game;
    const rightEls = g.hudEls?.right;
    if (!rightEls) return;

    const living = this.getLivingMonsters();
    const primaryMonster =
      this.bossEntity && !this.bossEntity.isDead
        ? this.bossEntity
        : living.find((m) => m.isElite) || living[0] || g.rightFighter;

    if (primaryMonster) {
      g.rightFighter = primaryMonster;
      if (rightEls.name) {
        rightEls.name.textContent = primaryMonster.isBoss
          ? `★ ${primaryMonster.name}`
          : living.length > 1
            ? `${primaryMonster.name} (+${living.length - 1})`
            : primaryMonster.name;
      }
      if (rightEls.skillText) {
        rightEls.skillText.textContent = primaryMonster.isBoss
          ? `PHASE ${primaryMonster.bossPhase || 1} • ${primaryMonster.skillName}`
          : this.totalWaveLabel;
      }
      if (rightEls.hpBar) {
        rightEls.hpBar.className = `hp-fill fill-${primaryMonster.theme || 'abyssal'}`;
      }
      if (rightEls.portraitFrame) {
        rightEls.portraitFrame.className = 'portrait-frame frame-abyssal';
      }
      if (rightEls.partnerWing) {
        rightEls.partnerWing.classList.add('hidden');
      }
      const leftHeroId = g.leftFighter?.heroId || 'mage';
      const leftCol = g.leftFighter?.primaryColor || '#fb923c';
      PixelForge.setHUDPortraits(leftHeroId, leftCol, 'archfiend', '#ef4444');
    }

    if (g.hudEls?.crestVs) {
      g.hudEls.crestVs.textContent = this.zoneIndex === 3 ? 'BOSS' : `Z${this.zoneIndex + 1}`;
    }
    if (g.hudEls?.modeBadge) {
      g.hudEls.modeBadge.textContent = `LV.${this.progression.level} • ${this.totalWaveLabel} • ${this.score} PTS`;
    }
  }

  processPlayerControls(dt, player, target) {
    player.isPlayerControlled = true;
    player.adventureAutoPlay = this.autoPlay;

    if (this.queuedActionTimer > 0) {
      this.queuedActionTimer = Math.max(0, this.queuedActionTimer - dt);
      if (this.queuedActionTimer <= 0) {
        this.queuedAction = null;
      }
    }

    const stats = this.progression.getComputedStats();

    // Optional Auto-Play AI Mode: Sol fights waves autonomously across 3D lanes & marches right when cleared!
    if (this.autoPlay) {
      player._manualWalkActive = false;
      player._advVaultVelZ = 0;

      // Auto-spend Skill Points in Auto-Play so autonomous showcase runs demonstrate the Skill Tree!
      if (this.progression.skillPoints > 0) {
        const autoOrder = ['wrath_1', 'astral_1', 'aegis_1', 'wrath_2', 'astral_2', 'wrath_1', 'astral_3'];
        for (const nid of autoOrder) {
          if (this.progression.canUpgradeNode(nid)) {
            this.progression.upgradeNode(nid, player);
            break;
          }
        }
      }

      if (!target && !this.lockActive && !this.bossSpawnPending && !this.game.isMatchOver) {
        const nextPickup = this.pickups[0];
        const goalX = nextPickup ? nextPickup.x : ADVENTURE_WORLD_WIDTH - 240;
        const goalGy = nextPickup && Number.isFinite(nextPickup.groundY) ? nextPickup.groundY : ADVENTURE_DEPTH_MID_Y;
        const dx = goalX - player.x;
        const dz = goalGy - (player.groundY || ADVENTURE_DEPTH_MID_Y);
        const len = Math.hypot(dx, dz) || 1;
        player.facing = dx >= -6 ? 1 : -1;
        player.moveDir = 1;
        player.state = 'WALK';
        player.walkPhase += dt * 5.8;
        const autoMoveSpeed = 235 * stats.moveSpeedMult;
        player.x += (dx / len) * autoMoveSpeed * 1.42 * dt;
        this.shiftEntityDepth(player, (dz / len) * autoMoveSpeed * 0.72 * dt);
        Fighter.prototype.update.call(player, dt, null, this.game);
        player.state = 'WALK';
        return;
      }

      if (
        target &&
        !player.isDead &&
        !(player.stunTimer > 0) &&
        !player.isRooted &&
        (player.state === 'IDLE' || player.state === 'WALK')
      ) {
        if (
          player.hasTrueUltimate &&
          this.progression.astralCharge >= 99.9 &&
          typeof player.updateTrueUltimate === 'function'
        ) {
          player.facing = target.x >= player.x ? 1 : -1;
          this.progression.astralCharge = 0;
          this.progression.syncGaugesToPlayer(player);
          if (player.stats) player.stats.ultsUsed++;
          player.setState('TRUE_ULTIMATE');
          this.game.triggerTrueUltimateCinematic(player);
        } else if (this.progression.ultCharge >= 99.9) {
          player.facing = target.x >= player.x ? 1 : -1;
          this.progression.ultCharge = 0;
          this.progression.gainAstralRelic(stats.ultResonanceAstral, player, '✦ ECLIPSE SEAL RESONANCE! ✦');
          this.progression.syncGaugesToPlayer(player);
          if (player.stats) player.stats.ultsUsed++;
          player.setState('ULTIMATE');
          this.game.triggerUltimateCinematic(player);
        } else if (player.skillCooldown <= 0 && this.progression.trySpendSkillSpirit()) {
          player.facing = target.x >= player.x ? 1 : -1;
          this.skillCdMax = Math.max(0.5, player.skillMaxCooldown * 0.78);
          player.skillCooldown = this.skillCdMax;
          if (player.stats) player.stats.skillsUsed++;
          player.setState('SKILL');
        } else {
          const autoMoveSpeed = 235 * stats.moveSpeedMult;
          const desiredGy = target.isColossalBoss
            ? target.sweepLane === 'upper' && target.bossAction === 'claw_sweep'
              ? 636
              : target.sweepLane === 'lower' && target.bossAction === 'claw_sweep'
                ? 484
                : ADVENTURE_DEPTH_MID_Y
            : target.groundY || ADVENTURE_DEPTH_MID_Y;
          const dz = desiredGy - (player.groundY || ADVENTURE_DEPTH_MID_Y);
          if (Math.abs(dz) > 14) {
            this.shiftEntityDepth(player, Math.sign(dz) * Math.min(Math.abs(dz), autoMoveSpeed * 0.68 * dt));
          }
          if (target.isColossalBoss) {
            const effRange = player.getEffectiveAttackRange
              ? player.getEffectiveAttackRange()
              : player.attackRange || 180;
            if (effRange >= 320) {
              if (player.x < 4220) {
                player.x += autoMoveSpeed * 0.85 * dt;
              }
            } else if (player.x > 3955) {
              player.x -= autoMoveSpeed * 0.90 * dt;
            }
          }
        }
      }

      const prevDidAction = Boolean(player.didActionFrame);
      // Temporarily keep player.mana < maxMana if ultCharge < 100 and suppress offensive VS dodge/crouch triggers during Adventure AI
      const prevSkillCd = player.skillCooldown;
      const prevDodgeCd = player.dodgeCooldown;
      const prevCrouchCd = player.crouchCooldown || 0;
      if (this.progression.spirit + 0.01 < stats.skillSpiritCost && player.skillCooldown <= 0) {
        player.skillCooldown = 0.25;
      }
      if (player.dodgeCooldown <= 0) player.dodgeCooldown = 0.25;
      if ((player.crouchCooldown || 0) <= 0) player.crouchCooldown = 0.25;
      const combatTarget = this.skillSets.resolveTarget(player, target);
      this.skillSets.beginPlayerStep(dt, player, combatTarget, false, 0);
      player.update(dt, combatTarget, this.game);
      if (prevSkillCd <= 0 && player.state !== 'SKILL' && player.skillCooldown === 0.25) {
        player.skillCooldown = 0;
      }
      if (prevDodgeCd <= 0 && player.dodgeCooldown <= 0.25) {
        player.dodgeCooldown = 0;
      }
      if (prevCrouchCd <= 0 && (player.crouchCooldown || 0) <= 0.25) {
        player.crouchCooldown = 0;
      }
      if (player.state === 'AUTO_ATTACK' && !prevDidAction && player.didActionFrame) {
        this.progression.onPlayerCastBasicAttack(player, target, this.game);
      }
      this.progression.syncGaugesToPlayer(player);
      return;
    }

    // =========================================================================
    // MANUAL 360° 3D CONTROL: BRISK OBSTACLE-DODGING WALK + PURE 3D EVADE DASH
    // =========================================================================
    const maxSpeedX = 276 * stats.moveSpeedMult;
    const maxSpeedZ = 156 * stats.moveSpeedMult; // Agile 2.5D depth-lane dodging while keeping gentle micro-tilt silky-smooth!
    let targetVx = 0;
    let targetVy = 0;
    let rawDirX = 0;
    let rawDirY = 0;

    if (this.joyActive) {
      const mag = Math.hypot(this.joyX, this.joyY);
      const deadzone = 0.12;
      if (mag > deadzone) {
        const u = Math.min(1, (mag - deadzone) / (1 - deadzone));
        // Progressive quadratic response: gentle precision walk near center, brisk sprint at outer rim
        const curved = 0.28 * u + 0.72 * u * u;
        let nx = this.joyX / mag;
        let ny = this.joyY / mag;
        // Subtle horizontal lane-keeping assist so slight thumb drift doesn't veer steeply up/down
        if (Math.abs(ny) < 0.24 * Math.abs(nx)) {
          ny *= 0.42;
        }
        rawDirX = nx * curved;
        rawDirY = ny * curved;
        targetVx = rawDirX * maxSpeedX;
        targetVy = rawDirY * maxSpeedZ;
      }
    } else {
      const kbX = (this.heldRight || this.uiHeldRight ? 1 : 0) - (this.heldLeft || this.uiHeldLeft ? 1 : 0);
      const kbY = (this.heldDown || this.uiHeldDown ? 1 : 0) - (this.heldUp || this.uiHeldUp ? 1 : 0);
      const mag = Math.hypot(kbX, kbY);
      if (mag > 0) {
        const inv = mag > 1 ? 1 / mag : 1;
        rawDirX = kbX * inv;
        rawDirY = kbY * inv;
        targetVx = rawDirX * maxSpeedX;
        targetVy = rawDirY * maxSpeedZ;
      }
    }

    const isReleasing = Math.abs(targetVx) < 0.01 && Math.abs(targetVy) < 0.01;
    const smoothAlpha = Math.min(1, dt * (isReleasing ? 28 : 20));
    this.smoothVelX += (targetVx - this.smoothVelX) * smoothAlpha;
    this.smoothVelY += (targetVy - this.smoothVelY) * smoothAlpha;
    if (Math.abs(targetVx) < 0.01 && Math.abs(this.smoothVelX) < 2.0) this.smoothVelX = 0;
    if (Math.abs(targetVy) < 0.01 && Math.abs(this.smoothVelY) < 2.0) this.smoothVelY = 0;

    const moveDirX = Math.abs(rawDirX) > 0.06 ? (rawDirX > 0 ? 1 : -1) : 0;
    const isMoving3D = Math.hypot(this.smoothVelX, this.smoothVelY) > 1.2 || Math.hypot(rawDirX, rawDirY) > 0.012;

    // Continuous hold-to-attack on primary thumb orb or [J/Z] — works simultaneously while dragging joystick!
    if (!this.queuedAction && (this.heldAttack || this.uiHeldAttack) && player.autoCooldown <= 0) {
      this.queuedAction = 'attack';
      this.queuedActionTimer = 0.20;
    }

    // Pure 3D Dodge can cancel AUTO_ATTACK immediately so players can reactively evade boss/monster telegraphs!
    const isInstantDodgeCancel =
      player.state === 'AUTO_ATTACK' && this.queuedAction === 'dodge' && player.dodgeCooldown <= 0;

    // Allow cancelling AUTO_ATTACK recovery into Skill/Overdrive/Ultimate OR combo-chaining the next Basic Attack!
    const isAttackRecoveryCancel =
      player.state === 'AUTO_ATTACK' &&
      player.didActionFrame &&
      this.queuedAction &&
      (this.queuedAction !== 'attack' ||
        (player.autoCooldown <= 0 &&
          player.stateTimer >= Math.min(0.35, (player.autoDuration || 0.48) * 0.72)));

    const canAct =
      !player.isDead &&
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      !player._advPureDodge &&
      (player.state === 'IDLE' ||
        player.state === 'WALK' ||
        isInstantDodgeCancel ||
        isAttackRecoveryCancel);

    if (canAct && this.queuedAction) {
      const act = this.queuedAction;
      if (
        act === 'ultimate' &&
        player.hasTrueUltimate &&
        this.progression.astralCharge >= 99.9 &&
        typeof player.updateTrueUltimate === 'function'
      ) {
        this.queuedAction = null;
        if (target) player.facing = target.x >= player.x ? 1 : -1;
        this.progression.astralCharge = 0;
        this.progression.syncGaugesToPlayer(player);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('TRUE_ULTIMATE');
        this.game.triggerTrueUltimateCinematic(player);
      } else if (act === 'overdrive' && this.progression.ultCharge >= 99.9) {
        this.queuedAction = null;
        if (target) player.facing = target.x >= player.x ? 1 : -1;
        this.progression.ultCharge = 0;
        this.progression.gainAstralRelic(
          stats.ultResonanceAstral,
          player,
          '✦ ECLIPSE SEAL RESONANCE! ✦'
        );
        this.progression.syncGaugesToPlayer(player);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('ULTIMATE');
        this.game.triggerUltimateCinematic(player);
      } else if (act === 'skill' && player.skillCooldown <= 0) {
        if (this.progression.trySpendSkillSpirit()) {
          this.queuedAction = null;
          if (target) player.facing = target.x >= player.x ? 1 : -1;
          this.skillCdMax = Math.max(0.5, player.skillMaxCooldown * 0.78);
          player.skillCooldown = this.skillCdMax;
          if (player.stats) player.stats.skillsUsed++;
          player.setState('SKILL');
        } else {
          this.queuedAction = null;
          this.game.vfx?.spawnDamageText(
            player.x,
            player.y - 142,
            0,
            false,
            `NEED ${stats.skillSpiritCost} SPIRIT!`,
            '#c084fc'
          );
        }
      } else if (act === 'dodge' && player.dodgeCooldown <= 0) {
        // 100% Pure Non-Attacking 360° 3D Evade Dash (zero counter-projectiles, zero decoys, zero damage!)
        this.queuedAction = null;
        const inputMag = Math.hypot(rawDirX, rawDirY);
        let evadeX = 0;
        let evadeZ = 0;
        if (inputMag > 0.08) {
          evadeX = rawDirX / inputMag;
          evadeZ = rawDirY / inputMag;
        } else {
          evadeX =
            target && Math.abs(target.x - player.x) < 280
              ? player.x <= target.x
                ? -1
                : 1
              : player.facing || 1;
          evadeZ = 0;
        }
        if (Math.abs(evadeX) > 0.15) {
          player.facing = evadeX > 0 ? 1 : -1;
        }
        this.dodgeCdMax = Math.max(0.55, 1.35 * stats.mobilityCdMult);
        player.dodgeCooldown = this.dodgeCdMax;
        player.dashDir = evadeX >= 0 ? 1 : -1;
        player._advPureDodge = true;
        player._advPureDodgeTimer = 0;
        player._advPureDodgeDur = 0.28;
        player._advPureDodgeDirX = evadeX;
        player._advPureDodgeDirZ = evadeZ;
        player._advVaultVelZ = 0;
        player.setState('DODGE');
        player.isInvulnerable = true;
        player.isFlipVault = false;
        player.isWraithPhase = false;
        player.vx = 0;
        player.vy = 0;
        player.y = player.groundY;
        this.progression.gainSpirit(18);
        this.game.audio?.play?.('dash_whoosh', player.x);
        this.game.vfx?.spawnShockwave?.(player.x, player.groundY - 6, 46, '#bae6fd', 0.18, true);
      } else if (act === 'attack' && player.autoCooldown <= 0) {
        this.queuedAction = null;
        if (target) player.facing = target.x >= player.x ? 1 : -1;
        else if (moveDirX !== 0) player.facing = moveDirX;
        this.autoCdMax = player.autoInterval || 0.44;
        player.autoCooldown = this.autoCdMax;
        player.setState('AUTO_ATTACK');
      } else if (act !== 'attack' && act !== 'dodge' && act !== 'skill' && act !== 'overdrive' && act !== 'ultimate') {
        this.queuedAction = null;
      }
    }

    // Advance Pure Non-Attacking 360° 3D Evade Dash when active
    if (player._advPureDodge) {
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      if (player.isDead || player.state !== 'DODGE') {
        player._advPureDodge = false;
        player.isInvulnerable = false;
      } else {
        player._advPureDodgeTimer += dt;
        const dur = player._advPureDodgeDur || 0.28;
        const u = Math.min(1, player._advPureDodgeTimer / dur);
        const speedScale = 1.36 * (1 - 0.56 * u * u);
        player.x += (player._advPureDodgeDirX || 0) * 580 * speedScale * dt;
        this.shiftEntityDepth(player, (player._advPureDodgeDirZ || 0) * 355 * speedScale * dt);
        player.isInvulnerable = true;
        player.vx = 0;
        player.vy = 0;
        player.y = player.groundY;
        this.skillSets.beginPlayerStep(dt, player, null, true, player._advPureDodgeDirZ || 0);
        player.update(dt, null, this.game);
        player.vx = 0;
        player.vy = 0;
        player.y = player.groundY;
        if (player._advPureDodgeTimer >= dur) {
          player._advPureDodge = false;
          player.isInvulnerable = false;
          if (!player.isDead && player.state === 'DODGE') {
            player.setState('IDLE');
          }
        }
        return;
      }
    }

    // Apply brisk 360° 3D movement in IDLE/WALK AND allow responsive strafing during AUTO_ATTACK!
    if (
      !player.isDead &&
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      (player.state === 'IDLE' || player.state === 'WALK')
    ) {
      player._advVaultVelZ = 0;
      if (isMoving3D && !this.game.isMatchOver) {
        player._manualWalkActive = true;
        player._manualSpeedRatio = Math.max(
          0.32,
          Math.min(
            1.2,
            Math.hypot(
              this.smoothVelX / Math.max(1, maxSpeedX),
              this.smoothVelY / Math.max(1, maxSpeedZ)
            )
          )
        );
        if (moveDirX !== 0) {
          player.facing = moveDirX;
        }
        player.moveDir = 1;
        player.state = 'WALK';
        player.x += this.smoothVelX * dt;
        this.shiftEntityDepth(player, this.smoothVelY * dt);
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
        player.moveDir = 0;
        if (!this.game.isMatchOver) {
          player.state = 'IDLE';
        }
      }
      this.skillSets.beginPlayerStep(dt, player, null, isMoving3D, rawDirY);
      player.update(dt, null, this.game);
    } else {
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      if (
        player.state === 'AUTO_ATTACK' &&
        !player.isDead &&
        !(player.stunTimer > 0) &&
        !player.isRooted &&
        isMoving3D &&
        !this.game.isMatchOver
      ) {
        // Simultaneous Run-and-Cast: glide smoothly along joystick vector while keeping aim locked on target!
        player.x += this.smoothVelX * 0.82 * dt;
        this.shiftEntityDepth(player, this.smoothVelY * 0.85 * dt);
        if (target) {
          player.facing = target.x >= player.x ? 1 : -1;
        } else if (moveDirX !== 0) {
          player.facing = moveDirX;
        }
      } else {
        player._advVaultVelZ = 0;
      }

      const prevDidAction = Boolean(player.didActionFrame);
      const combatTarget = this.skillSets.resolveTarget(player, target);
      this.skillSets.beginPlayerStep(dt, player, combatTarget, isMoving3D, rawDirY);
      player.update(dt, combatTarget, this.game);
      if (player.state === 'AUTO_ATTACK' && isMoving3D && Math.abs(player.vx) > 8) {
        const isMeleeForwardLunge =
          (player.attackRange || 180) < 300 && player.vx * this.smoothVelX >= -5;
        if (!isMeleeForwardLunge) {
          player.vx *= 0.22;
        }
      }
      if (player.state === 'AUTO_ATTACK' && !prevDidAction && player.didActionFrame) {
        this.progression.onPlayerCastBasicAttack(player, target, this.game);
      }
    }
  }

  getActiveStageBounds() {
    const colossalAlive = Boolean(
      this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
    );
    if (colossalAlive) {
      return { minX: 3945, maxX: ADVENTURE_WORLD_WIDTH - 80 };
    }
    if (this.lockActive) {
      return { minX: this.lockMinX, maxX: this.lockMaxX };
    }
    const z = ADVENTURE_ZONES[this.zoneIndex] || ADVENTURE_ZONES[0];
    return {
      minX: Math.max(80, z.minX + 60),
      maxX: Math.min(ADVENTURE_WORLD_WIDTH - 80, z.maxX - 60)
    };
  }

  update(dt) {
    if (!this.active) return;
    if (this.isSkillTreeOpen) {
      this.syncControlDeckUI();
      return;
    }
    const g = this.game;
    const player = g.leftFighter;
    if (!player) return;

    this.goBlinkTimer += dt;
    this.progression.update(dt, player);
    this.skillSets.update(dt, player);

    // 1. Boss Warning Countdown -> Spawn Colossal Behemoth Malphas on the LEFT (`x = 3865`)!
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer = Math.max(0, this.bossWarningTimer - dt);
      if (this.bossWarningTimer <= 0 && this.bossSpawnPending) {
        this.bossSpawnPending = false;
        const isRangedHero = (player.attackRange || 180) >= 320;
        const bossEntryX = isRangedHero ? 4240 : 3985;
        if (player.x < bossEntryX) player.x = bossEntryX;
        else if (!isRangedHero && player.x > 4090) player.x = bossEntryX;
        player.facing = -1;
        this.bossEntity = this.spawnMonster('archfiend', 3865, { groundY: ADVENTURE_DEPTH_MID_Y });
        this.syncRightHUD();
      }
    }

    // 2. Prune decayed monster corpses (after death animation finishes) so waves stay crisp
    for (let i = g.fighters.length - 1; i >= 0; i--) {
      const f = g.fighters[i];
      if (f && f.isMonster && !f.isBoss && f.isDead && (f.deathTimer || 0) >= 1.85) {
        g.fighters.splice(i, 1);
      }
    }

    // 3. Wave Clear & Zone Trigger Progression
    if (!g.isMatchOver && !this.bossSpawnPending) {
      const livingMonsters = this.getLivingMonsters();

      if (this.lockActive && livingMonsters.length === 0) {
        if (this.zoneIndex === 0 && this.subWave === 1) {
          this.subWaveDelay += dt;
          if (this.subWaveDelay >= 0.45) {
            this.subWaveDelay = 0;
            this.spawnZoneEncounter(0, 2);
          }
        } else if (this.zoneIndex < 3) {
          this.unlockCurrentZone(this.zoneIndex);
        }
      }

      // Check if player walked across the next zone's trigger threshold
      if (!this.lockActive && this.zoneIndex < 3) {
        const nextZone = ADVENTURE_ZONES[this.zoneIndex + 1];
        if (nextZone && player.x >= nextZone.triggerX) {
          this.spawnZoneEncounter(this.zoneIndex + 1, 1);
        }
      }
    }

    // 4. Update Pickups
    this.updatePickups(dt, player);

    // 5. Update Player (Manual or Auto-Play) + Clamp Arena Walk Bounds + Update Active Monsters
    const nearestMonster = this.getNearestLivingMonster(player);
    this.processPlayerControls(dt, player, nearestMonster);

    // Keep player out of the Left-Side Colossal Boss's abyssal body pit (`x >= 3945` so all melee heroes reach cleanly!) & inside wave locks!
    const colossalAlive = Boolean(this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss);
    const minWalkX = colossalAlive ? 3945 : this.lockActive ? this.lockMinX : 80;
    const maxWalkX = this.lockActive ? this.lockMaxX : ADVENTURE_WORLD_WIDTH - 80;
    this.skillSets.endPlayerStep(dt, player, minWalkX, maxWalkX, colossalAlive);
    if (player.x < minWalkX) player.x = minWalkX;
    if (player.x > maxWalkX) player.x = maxWalkX;

    for (const f of g.fighters) {
      if (!f || f === player) continue;
      f.update(dt, player, g);
      if (this.lockActive && f.isMonster && !f.isDead && !f.isColossalBoss) {
        const mMin = minWalkX + 18;
        const mMax = Math.max(mMin, maxWalkX - 18);
        if (f.x < mMin) f.x = mMin;
        if (f.x > mMax) f.x = mMax;
      }
    }

    this.syncRightHUD();
    this.syncControlDeckUI();
  }

  renderWorldFloor(ctx, renderer) {
    if (!this.active || !ctx) return;
    const t = renderer.time || 0;
    const roadTop = 438;
    const roadBot = 684;

    // 0. Render Champion Adventure Skill Set 2.5D Floor Zones & Sanctuary Seals
    this.skillSets.renderFloor(ctx);

    // 1. Render Monster 3D Floor Telegraph Rings & Colossal Siege Corridors
    for (const f of this.game.fighters) {
      if (f && f.isMonster && !f.isDead && typeof f.drawTelegraphRings === 'function') {
        f.drawTelegraphRings(ctx);
      }
    }

    // 2. Render 3D Floor-Spanning Arcane Seal Barriers when screen is wave-locked
    if (this.lockActive) {
      ctx.save();
      const pulse = 0.44 + 0.22 * Math.sin(t * 6.5);
      for (const gateX of [this.lockMinX - 16, this.lockMaxX + 16]) {
        if (gateX <= 70 || gateX >= ADVENTURE_WORLD_WIDTH - 70) continue;
        const gx = Math.round(gateX);
        ctx.fillStyle = `rgba(251, 146, 60, ${(pulse * 0.24).toFixed(3)})`;
        ctx.fillRect(gx - 6, roadTop, 12, roadBot - roadTop);
        ctx.fillStyle = `rgba(254, 240, 138, ${(pulse * 0.76).toFixed(3)})`;
        for (let seg = 0; seg < 8; seg++) {
          const sy = Math.round(roadTop + ((seg * 32 + t * 52) % (roadBot - roadTop - 12)));
          ctx.fillRect(gx - 2, sy, 4, 14);
        }
        for (const pyY of [roadTop + 4, roadBot - 4]) {
          ctx.fillStyle = '#0d0f1a';
          ctx.fillRect(gx - 7, pyY - 38, 14, 40);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(gx - 5, pyY - 36, 10, 36);
          ctx.fillStyle = '#fb923c';
          ctx.fillRect(gx - 3, pyY - 30, 6, 18);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(gx - 1, pyY - 26, 2, 10);
        }
      }
      ctx.restore();
    }

    // 3. Render Pixel-Art 3D RPG Pickups (`Solar Elixir +HP`, `Soul Ember +NOVA`, `Astral Relic +SEAL`)
    if (this.pickups.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const sortedPickups = [...this.pickups].sort(
        (a, b) => (a.groundY || a.y || 561) - (b.groundY || b.y || 561)
      );
      for (const pk of sortedPickups) {
        const pkGy = Math.round(Number.isFinite(pk.groundY) ? pk.groundY : pk.y);
        const bob = Math.round(Math.sin(t * 5.2 + pk.x * 0.03) * 6);
        const px = Math.round(pk.x);
        const py = Math.round(pk.y - 26 + bob);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.fillRect(px - 14, pkGy - 3, 28, 5);

        const isHp = pk.type === 'hp';
        const isEmber = pk.type === 'ember' || pk.type === 'mana';
        const colMain = isHp ? '#22c55e' : isEmber ? '#fb923c' : '#38bdf8';
        const colCore = isHp ? '#bbf7d0' : isEmber ? '#fef08a' : '#ecfeff';
        const tag = isHp ? '+HP' : isEmber ? '✦EMBER' : '★SEAL';

        ctx.fillStyle = '#090d16';
        ctx.fillRect(px - 12, py - 12, 24, 24);
        ctx.fillStyle = colMain;
        ctx.fillRect(px - 10, py - 10, 20, 20);
        ctx.fillStyle = colCore;
        ctx.fillRect(px - 5, py - 6, 10, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 2, py - 3, 4, 4);

        ctx.font = '8px "ArcanePixel", "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#05070e';
        ctx.fillText(tag, px + 1, py - 16);
        ctx.fillStyle = colCore;
        ctx.fillText(tag, px, py - 17);
      }
      ctx.restore();
    }
  }

  renderWorldMid(ctx) {
    if (!this.active || !ctx) return;
    this.skillSets.renderMid(ctx);
  }

  renderWorldForeground(ctx) {
    if (!this.active || !ctx) return;
    this.skillSets.renderForeground(ctx);
  }

  renderScreenHUD(ctx, renderer) {
    if (!this.active || !ctx || this.game.isLandingOpen) return;
    const w = renderer.width;
    const h = renderer.height;
    const t = renderer.time || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Compact 4-Zone Campaign Progress + Solar Spirit & XP RPG Strip
    const stripW = Math.min(renderer.isMobileLandscape ? 290 : 360, Math.round(w * 0.48));
    const stripH = renderer.isMobileLandscape ? 25 : 29;
    const stripX = Math.round((w - stripW) * 0.5);
    const stripY = renderer.isMobileLandscape ? 66 : renderer.isMobile ? 104 : 68;
    ctx.fillStyle = 'rgba(6, 9, 18, 0.86)';
    ctx.fillRect(stripX, stripY, stripW, stripH);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(stripX, stripY, stripW, stripH);

    const segW = Math.floor((stripW - 14) / 4);
    const segH = renderer.isMobileLandscape ? 9 : 10;
    for (let i = 0; i < 4; i++) {
      const sx = stripX + 4 + i * (segW + 2);
      const sy = stripY + 3;
      const cleared = this.zonesCleared[i];
      const current = this.zoneIndex === i;
      ctx.fillStyle = cleared
        ? '#22c55e'
        : current
          ? i === 3
            ? '#ef4444'
            : '#fb923c'
          : '#1e293b';
      ctx.fillRect(sx, sy, segW, segH);
      ctx.font = '7px "ArcanePixel", "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = current || cleared ? '#ffffff' : '#94a3b8';
      ctx.fillText(i === 3 ? 'BOSS' : `Z${i + 1}`, sx + Math.floor(segW * 0.5), sy + 8);
    }

    // Bottom sub-row inside strip: Left = Solar Spirit (`SPIRIT`), Right = Level XP (`LV.X`)
    const subY = stripY + segH + 6;
    const halfBarW = Math.floor((stripW - 14) * 0.5);
    const spRatio = Math.max(0, Math.min(1, this.progression.spirit / this.progression.maxSpirit));
    const xpRatio =
      this.progression.level >= this.progression.maxLevel
        ? 1
        : Math.max(0, Math.min(1, this.progression.xp / Math.max(1, this.progression.xpToNext)));

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(stripX + 4, subY, halfBarW, 7);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(stripX + 4, subY, Math.round(halfBarW * spRatio), 7);

    const xpX = stripX + 8 + halfBarW;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(xpX, subY, halfBarW, 7);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(xpX, subY, Math.round(halfBarW * xpRatio), 7);

    ctx.font = '6px "ArcanePixel", "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`SPIRIT ${Math.floor(this.progression.spirit)}`, stripX + 6, subY + 6);
    ctx.textAlign = 'right';
    ctx.fillText(
      `LV.${this.progression.level}${this.progression.skillPoints > 0 ? ` (+${this.progression.skillPoints}SP)` : ''}`,
      xpX + halfBarW - 2,
      subY + 6
    );

    // 2. Classic Marvel/Capcom Flashing `"GO! ➔"` Arcade Advance Prompt
    if (this.goPromptActive && !this.game.isMatchOver) {
      const blink = Math.sin(t * 9.5) > -0.25;
      if (blink) {
        const gx = w - (renderer.isMobileLandscape ? 212 : renderer.isMobile ? 128 : 168);
        const gy = Math.round(h * (renderer.isMobileLandscape ? 0.30 : 0.36));
        const shift = Math.round(Math.sin(t * 8.0) * 6);

        ctx.fillStyle = 'rgba(9, 12, 22, 0.90)';
        ctx.fillRect(gx - 88 + shift, gy - 20, 162, 38);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(gx - 88 + shift, gy - 20, 162, 38);

        ctx.font = renderer.isMobileLandscape
          ? '10px "ArcanePixel", "Press Start 2P", monospace'
          : '12px "ArcanePixel", "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fef08a';
        ctx.fillText(`${this.goPromptText} ➔`, gx - 7 + shift, gy + 4);
      }
    }

    // 3. Dramatic Colossal Boss Approaching Arcade Alert Banner
    if (this.bossWarningTimer > 0) {
      const flash = Math.abs(Math.sin(t * 12));
      const by = Math.round(h * 0.34);
      ctx.fillStyle = `rgba(69, 10, 10, ${(0.78 + flash * 0.16).toFixed(3)})`;
      ctx.fillRect(0, by - 30, w, 60);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, by - 30, w, 3);
      ctx.fillRect(0, by + 27, w, 3);

      ctx.font = renderer.isMobile
        ? '10px "ArcanePixel", "Press Start 2P", monospace'
        : '14px "ArcanePixel", "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('⚠ WARNING! BEHEMOTH MALPHAS RISES ON THE WEST! ⚠', Math.round(w * 0.5), by + 5);
    }

    ctx.restore();
  }
}
