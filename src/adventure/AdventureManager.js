import { Fighter } from '../entities/Fighter.js?v=30fps127';
import { Monster, ArchfiendBoss } from '../entities/Monster.js?v=30fps127';
import { PixelForge } from '../engine/PixelForge.js?v=30fps127';
import {
  AdventureProgression,
  ADVENTURE_SKILL_TREE,
  getHeroSkillTreeTheme
} from './AdventureProgression.js?v=30fps127';
import { AdventureSkillSets, ADVENTURE_HERO_KITS } from './AdventureSkillSets.js?v=30fps127';
import { AdventureDestructibles } from './AdventureDestructibles.js?v=30fps127';
import { AdventureMapRenderer } from './AdventureMapRenderer.js?v=30fps127';

export const ADVENTURE_WORLD_WIDTH = 9600;
export const ADVENTURE_BOSS_ANCHOR_X = 9335;
export const ADVENTURE_BOSS_MAX_WALK_X = 9250;
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
    maxX: 2400,
    triggerX: 0,
    midTriggerX: 1340,
    sub1LockMinX: 80,
    sub1LockMaxX: 1220,
    lockMinX: 1200,
    lockMaxX: 2360
  },
  {
    index: 1,
    id: 'causeway',
    stageId: 'sylvan',
    title: 'ZONE II • CURSED STARWOOD',
    minX: 2400,
    maxX: 4800,
    triggerX: 2540,
    midTriggerX: 3740,
    sub1LockMinX: 2420,
    sub1LockMaxX: 3580,
    lockMinX: 3600,
    lockMaxX: 4760
  },
  {
    index: 2,
    id: 'stronghold',
    stageId: 'boneyard',
    title: 'ZONE III • ABYSSAL BONE-GATE',
    minX: 4800,
    maxX: 7200,
    triggerX: 4940,
    midTriggerX: 6140,
    sub1LockMinX: 4820,
    sub1LockMaxX: 5980,
    lockMinX: 6000,
    lockMaxX: 7160
  },
  {
    index: 3,
    id: 'blackpit',
    stageId: 'clocktower',
    title: 'ZONE IV • THRONE OF THE BLACK PIT',
    minX: 7200,
    maxX: 9600,
    triggerX: 7340,
    midTriggerX: 8520,
    sub1LockMinX: 7220,
    sub1LockMaxX: 8360,
    lockMinX: 8380,
    lockMaxX: 9520,
    isBossZone: true
  }
];

/**
 * Marvel-Arcade 2.5D Beat-'Em-Up Adventure Campaign Coordinator:
 * - 9600px continuous seamless 4-Zone 3D stage (`X: 80..9520`, `groundY: 442..680`) with 8 staged
 *   wave encounters, `"GO!"` prompts, HD-2D RPG pickups (`HP`, `SOUL EMBER`, `ASTRAL RELIC`),
 *   3-Branch Skill Tree leveling, Dedicated 11-Hero 2.5D Adventure Skill Sets, and a Giant Right-Side Colossal Boss (`BEHEMOTH MALPHAS`).
 */
export class AdventureManager {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.autoPlay = false;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this._hudStripRect = null;

    this.progression = new AdventureProgression(this);
    this.skillSets = new AdventureSkillSets(this);
    this.destructibles = new AdventureDestructibles(this);
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
    this._bossWarnPulseTimer = 0;
    this.bossSpawnPending = false;
    this.bossEntity = null;

    this.pickups = [];
    this.portals = [];
    this.monstersKilled = 0;
    this.totalWaveLabel = 'WAVE 1 / 8';
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
    this.comboResetTimer = 0;
    this._comboLockTarget = null;

    // Tracked cooldown maximums for smooth 360-degree radial HUD sweeps
    this.autoCdMax = 0.52;
    this.skillCdMax = 4.5;
    this.dodgeCdMax = 1.35;
    this._renderedIconHero = null;
    this._renderedMageIconsReady = false;
    this._renderedHeroIconsReady = false;

    this._boundKeyDown = (e) => this.onKeyDown(e);
    this._boundKeyUp = (e) => this.onKeyUp(e);
    this._boundBlur = () => this.clearHeldInputs();
    this._listenersAttached = false;
    this.bindDOMControls();
  }

  bindDOMControls() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;

    const lockBtn = document.getElementById('adv-btn-lock');
    if (lockBtn) {
      lockBtn._advOwner = this;
      if (!lockBtn._advLockBound && typeof lockBtn.addEventListener === 'function') {
        lockBtn._advLockBound = true;
        let lastTouchTs = 0;
        lockBtn.addEventListener(
          'touchstart',
          (e) => {
            const owner = lockBtn._advOwner;
            if (!owner) return;
            e.preventDefault?.();
            lastTouchTs = Date.now();
            if (owner.autoPlay) owner.setAutoPlay(false, false);
            owner.toggleTargetLock(true);
          },
          { passive: false }
        );
        lockBtn.addEventListener('click', () => {
          const owner = lockBtn._advOwner;
          if (!owner || Date.now() - lastTouchTs < 450) return;
          if (owner.autoPlay) owner.setAutoPlay(false, false);
          owner.toggleTargetLock(true);
        });
      }
    }

    const pauseLockBtn = document.getElementById('adv-btn-pause-lock');
    if (pauseLockBtn) {
      pauseLockBtn._advOwner = this;
      if (!pauseLockBtn._advLockBound && typeof pauseLockBtn.addEventListener === 'function') {
        pauseLockBtn._advLockBound = true;
        pauseLockBtn.addEventListener('click', () => {
          pauseLockBtn._advOwner?.toggleTargetLock(true);
        });
      }
    }

    const canvas = document.getElementById('arena-canvas');
    if (canvas) {
      canvas._advOwner = this;
      if (!canvas._advStripBound && typeof canvas.addEventListener === 'function') {
        canvas._advStripBound = true;
        canvas.addEventListener('pointerdown', (e) => {
          const owner = canvas._advOwner;
          if (
            !owner ||
            !owner.active ||
            owner.game.isLandingOpen ||
            owner.game.isMatchOver ||
            owner.game.isPaused ||
            owner.isSkillTreeOpen ||
            !owner._hudStripRect
          ) {
            return;
          }
          const renderer = owner.game.renderer;
          const cw = renderer?.width || canvas.width || 1280;
          const ch = renderer?.height || canvas.height || 720;
          const rect =
            typeof canvas.getBoundingClientRect === 'function'
              ? canvas.getBoundingClientRect()
              : null;
          let px = e.offsetX ?? e.clientX ?? -1;
          let py = e.offsetY ?? e.clientY ?? -1;
          if (rect && rect.width > 0 && rect.height > 0 && typeof e.clientX === 'number') {
            const isCssRotated = Boolean(
              document.documentElement?.classList?.contains?.('is-css-rotated-landscape')
            );
            if (isCssRotated) {
              px = ((e.clientY - rect.top) / rect.height) * cw;
              py = ((rect.right - e.clientX) / rect.width) * ch;
            } else {
              px = ((e.clientX - rect.left) / rect.width) * cw;
              py = ((e.clientY - rect.top) / rect.height) * ch;
            }
          }
          const sr = owner._hudStripRect;
          if (px >= sr.x - 4 && px <= sr.x + sr.w + 4 && py >= sr.y - 4 && py <= sr.y + sr.h + 4) {
            e.preventDefault?.();
            owner.openSkillTree(true);
          }
        });
      }
    }
  }

  attachListeners() {
    this.bindDOMControls();
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
    this._comboLockTarget = null;
    this.setJoystickVector(0, 0, false);
  }

  onKeyDown(e) {
    if (!this.active || this.game.isLandingOpen || this.game.isMatchOver) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    if (code === 'KeyT') {
      if (this.game.isPaused) {
        this.game.setPaused?.(false, false);
      }
      this.toggleSkillTree(true);
      e.preventDefault();
      return;
    }
    if (code === 'Escape' && this.isSkillTreeOpen) {
      this.closeSkillTree(true);
      e.preventDefault();
      e.stopImmediatePropagation?.();
      return;
    }
    if (this.isSkillTreeOpen || this.game.isPaused) return;

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
    } else if (!this.autoPlay && (code === 'Tab' || code === 'KeyR')) {
      this.toggleTargetLock(true);
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

    const heroKey = player?.heroId || this.game?.slot1Hero || 'mage';
    const heroTheme = getHeroSkillTreeTheme(heroKey);

    const createIconCanvas = (actionSlot, extraClass = '') => {
      const cvs = document.createElement('canvas');
      cvs.width = 64;
      cvs.height = 64;
      cvs.className = extraClass ? `adv-st-icon-canvas ${extraClass}` : 'adv-st-icon-canvas';
      if (typeof cvs.getContext === 'function') {
        const ictx = cvs.getContext('2d');
        if (ictx) {
          PixelForge.drawAdventureActionIcon(ictx, heroKey, actionSlot || 'skill', 64, 64, 0);
        }
      }
      return cvs;
    };

    const branches = [
      {
        key: 'wrath',
        title: heroTheme.branches.wrath.title,
        sub: heroTheme.branches.wrath.sub,
        iconSlot: heroTheme.branches.wrath.iconSlot
      },
      {
        key: 'astral',
        title: heroTheme.branches.astral.title,
        sub: heroTheme.branches.astral.sub,
        iconSlot: heroTheme.branches.astral.iconSlot
      },
      {
        key: 'aegis',
        title: heroTheme.branches.aegis.title,
        sub: heroTheme.branches.aegis.sub,
        iconSlot: heroTheme.branches.aegis.iconSlot
      }
    ];

    for (const b of branches) {
      const col = document.createElement('div');
      col.className = `adv-st-branch adv-st-branch-${b.key}`;

      const hdr = document.createElement('div');
      hdr.className = 'adv-st-branch-hdr';
      const hdrTitleWrap = document.createElement('span');
      hdrTitleWrap.className = 'adv-st-branch-title-wrap';
      hdrTitleWrap.appendChild(createIconCanvas(b.iconSlot, 'adv-st-branch-canvas'));
      const hdrTextBox = document.createElement('span');
      const hdrTitleSpan = document.createElement('span');
      hdrTitleSpan.textContent = b.title;
      const hdrSubSpan = document.createElement('span');
      hdrSubSpan.className = 'adv-st-branch-sub';
      hdrSubSpan.textContent = b.sub;
      hdrTextBox.appendChild(hdrTitleSpan);
      hdrTextBox.appendChild(hdrSubSpan);
      hdrTitleWrap.appendChild(hdrTextBox);
      const hdrPtsSpan = document.createElement('span');
      hdrPtsSpan.textContent = `${prog.getBranchPointsSpent(b.key)} PTS`;
      hdr.appendChild(hdrTitleWrap);
      hdr.appendChild(hdrPtsSpan);
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
        const titleWrap = document.createElement('span');
        titleWrap.className = 'adv-st-node-title-wrap';
        titleWrap.appendChild(createIconCanvas(node.iconSlot || 'skill'));
        const titleSpan = document.createElement('span');
        titleSpan.className = 'adv-st-node-title';
        titleSpan.textContent = heroTheme.nodes?.[node.id] || node.name;
        titleWrap.appendChild(titleSpan);
        const rankSpan = document.createElement('span');
        rankSpan.className = 'adv-st-node-rank';
        rankSpan.textContent = `${rank} / ${node.maxRank}`;
        top.appendChild(titleWrap);
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
            ? 'MAXED'
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
    this.queuedActionTimer = actionName === 'attack' ? 0.62 : 0.48;
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

  acquireBestLockMonster(player = this.game.leftFighter) {
    const living = this.getLivingMonsters();
    if (!living.length) return null;
    if (!player) return living[0];
    const facing = player.facing || 1;
    const pGy = Number.isFinite(player.groundY) ? player.groundY : player.y || ADVENTURE_DEPTH_MID_Y;

    let bestFront = null;
    let bestFrontScore = Infinity;
    for (let i = 0; i < living.length; i++) {
      const m = living[i];
      const signedDx = (m.x - player.x) * facing;
      const inFront = signedDx >= -24 || (m.isColossalBoss && facing > 0);
      if (!inFront) continue;
      const mGy = Number.isFinite(m.groundY) ? m.groundY : m.y || ADVENTURE_DEPTH_MID_Y;
      const depthDist = m.isColossalBoss ? 0 : (mGy - pGy) * 1.5;
      const score =
        Math.hypot(m.x - player.x, depthDist) -
        (m.isBoss ? 55 : m.isMiniBoss ? 22 : 0);
      if (score < bestFrontScore) {
        bestFrontScore = score;
        bestFront = m;
      }
    }
    if (bestFront) return bestFront;
    return this.getNearestLivingMonster(player);
  }

  getActiveLockedMonster(player = this.game.leftFighter) {
    if (!this.manualTargetLock) {
      this.lockedMonster = null;
      return null;
    }
    if (
      this.lockedMonster &&
      !this.lockedMonster.isDead &&
      (!this.game.fighters || this.game.fighters.includes(this.lockedMonster))
    ) {
      return this.lockedMonster;
    }
    this.lockedMonster = this.acquireBestLockMonster(player);
    return this.lockedMonster;
  }

  setTargetLock(enabled, playSound = false) {
    this.manualTargetLock = Boolean(enabled);
    const player = this.game.leftFighter;
    if (this.manualTargetLock) {
      this.lockedMonster = this.acquireBestLockMonster(player);
    } else {
      this.lockedMonster = null;
      this._comboLockTarget = null;
    }
    this.syncControlDeckUI();
    if (playSound && this.game.audio) {
      this.game.audio.play('clock_gear', player ? player.x : 600);
    }
  }

  toggleTargetLock(playSound = true) {
    this.setTargetLock(!this.manualTargetLock, playSound);
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
    const mageImg = PixelForge.assets?.mage?.icons;
    const heroSheet = PixelForge.assets?.heroIconsSheet;
    this._renderedMageIconsReady = Boolean(
      mageImg &&
        (typeof HTMLImageElement === 'undefined' ||
          !(mageImg instanceof HTMLImageElement) ||
          (mageImg.complete && mageImg.naturalWidth >= 448))
    );
    this._renderedHeroIconsReady = Boolean(
      heroSheet &&
        (typeof HTMLImageElement === 'undefined' ||
          !(heroSheet instanceof HTMLImageElement) ||
          (heroSheet.complete && heroSheet.naturalWidth >= 384))
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
      stLbl.textContent = `LV.${this.progression.level} SKILLS`;
    }
    const spBadge = document.getElementById('adv-sp-badge');
    if (spBadge) {
      spBadge.textContent = `${this.progression.skillPoints} SP`;
      spBadge.classList?.toggle('has-sp', this.progression.skillPoints > 0);
    }
    const pauseSpBadge = document.getElementById('pause-sp-badge');
    if (pauseSpBadge) {
      const showPip = Boolean(visible && this.progression.skillPoints > 0);
      pauseSpBadge.textContent = '';
      pauseSpBadge.classList?.toggle('hidden', !showPip);
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
    const skillAutoBtn = document.getElementById('adv-btn-auto');
    const skillAutoLbl = document.getElementById('adv-auto-label');
    if (skillAutoBtn) {
      skillAutoBtn.setAttribute?.('aria-pressed', String(this.autoPlay));
      skillAutoBtn.classList?.toggle('is-autoplay-on', this.autoPlay);
    }
    if (skillAutoLbl) {
      skillAutoLbl.textContent = 'AUTO';
    }

    const lockActive = Boolean(this.manualTargetLock);
    const lockBtn = document.getElementById('adv-btn-lock');
    const lockLbl = document.getElementById('adv-lock-label');
    if (lockBtn) {
      lockBtn.setAttribute?.('aria-pressed', String(lockActive));
      lockBtn.classList?.toggle('is-lock-on', lockActive);
    }
    if (lockLbl) {
      lockLbl.textContent = 'LOCK';
    }
    const pauseLockBtn = document.getElementById('adv-btn-pause-lock');
    const pauseLockLbl = document.getElementById('adv-pause-lock-label');
    if (pauseLockBtn) {
      pauseLockBtn.setAttribute?.('aria-pressed', String(lockActive));
      pauseLockBtn.classList?.toggle('is-lock-on', lockActive);
    }
    if (pauseLockLbl) {
      pauseLockLbl.textContent = lockActive ? 'LOCK: ON' : 'LOCK: OFF';
    }

    this.syncJoystickKnobUI();

    const player = this.game.leftFighter;
    if (!player) return;

    const heroKey = player.heroId || this.game.slot1Hero || 'mage';
    const isMageIconHero = heroKey === 'mage' || heroKey === 'mage_ex';
    const mageImg = PixelForge.assets?.mage?.icons;
    const heroSheet = PixelForge.assets?.heroIconsSheet;
    const mageIconsNowReady =
      isMageIconHero &&
      Boolean(
        mageImg &&
          (typeof HTMLImageElement === 'undefined' ||
            !(mageImg instanceof HTMLImageElement) ||
            (mageImg.complete && mageImg.naturalWidth >= 448))
      );
    const heroIconsNowReady =
      !isMageIconHero &&
      Boolean(
        heroSheet &&
          (typeof HTMLImageElement === 'undefined' ||
            !(heroSheet instanceof HTMLImageElement) ||
            (heroSheet.complete && heroSheet.naturalWidth >= 384))
      );
    if (
      this._renderedIconHero !== heroKey ||
      (isMageIconHero && mageIconsNowReady && !this._renderedMageIconsReady) ||
      (!isMageIconHero && heroIconsNowReady && !this._renderedHeroIconsReady)
    ) {
      this.refreshActionIcons(heroKey);
      if (this.isSkillTreeOpen) {
        this.renderSkillTreeModal();
      }
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
    this.bindDOMControls();
    this.active = true;
    this.isSkillTreeOpen = false;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this._hudStripRect = null;
    this.clearHeldInputs();
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('victory-overlay')?.classList?.remove('is-defeat-plaque');
      document.getElementById('hud-right')?.classList?.remove?.('hidden');
    }

    this.zoneIndex = 0;
    this.subWave = 0;
    this.subWaveDelay = 0;
    this.zonesCleared = [false, false, false, false];
    this.pickups = [];
    this.portals = [];
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
    this._renderedHeroIconsReady = false;

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
      renderer.zoom =
        renderer.isMobileLandscape && typeof renderer.getMobileLandscapeFixedZoom === 'function'
          ? renderer.getMobileLandscapeFixedZoom(false)
          : renderer.isMobilePortrait && typeof renderer.getMobilePortraitFixedZoom === 'function'
            ? renderer.getMobilePortraitFixedZoom(false)
            : renderer.isMobile
              ? 0.64
              : 0.76;
    }

    playerFighter.x = 240;
    playerFighter.groundY = ADVENTURE_DEPTH_MID_Y;
    playerFighter.y = ADVENTURE_DEPTH_MID_Y;
    playerFighter.facing = 1;
    playerFighter.team = 1;
    playerFighter.isPlayerControlled = true;
    playerFighter.isManualAdventureControl = true;
    playerFighter.adventureAutoPlay = this.autoPlay;
    playerFighter._manualWalkActive = false;
    playerFighter._manualSpeedRatio = 0;
    playerFighter._advVaultVelZ = 0;
    playerFighter._advPureDodge = false;
    playerFighter._advPureDodgeTimer = 0;
    playerFighter._advAiVelX = 0;
    playerFighter._advAiVelZ = 0;
    playerFighter._advAiStuckTimer = 0;
    playerFighter._advAiUnstickTimer = 0;
    if (Array.isArray(playerFighter.capeNodes)) {
      playerFighter.capeNodes.forEach((n, i) => {
        if (n) {
          n.x = playerFighter.x - playerFighter.facing * i * 9;
          n.y = playerFighter.y - 52 + i * 9;
        }
      });
    }

    this.game.fighters = [playerFighter];
    this._bossWarnPulseTimer = 0;
    this.destructibles.resetForCampaign();
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
      if (this.game.leftFighter._advPureDodge) {
        this.finishHeroAdventureDodge(this.game.leftFighter, false);
      }
      this.game.leftFighter._advDodgeFrameOverride = null;
      this.game.leftFighter._advDodgeTrails = [];
      this.game.leftFighter._hnsStreaks = [];
      this.game.leftFighter.isManualAdventureControl = false;
      this.game.leftFighter._manualWalkActive = false;
      this.game.leftFighter._manualSpeedRatio = 0;
      this.game.leftFighter._advPureDodge = false;
      this.game.leftFighter._advPureDodgeTimer = 0;
      this.game.leftFighter._advAiVelX = 0;
      this.game.leftFighter._advAiVelZ = 0;
      this.game.leftFighter._advAiStuckTimer = 0;
      this.game.leftFighter._advAiUnstickTimer = 0;
    }
    this.progression.detachFromFighter(this.game.leftFighter);
    this.skillSets.detachFromFighter(this.game.leftFighter);
    this.destructibles.resetForCampaign();
    AdventureMapRenderer.clearBloomCache?.();
    this.active = false;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this._hudStripRect = null;
    this.lockActive = false;
    this.goPromptActive = false;
    this.bossWarningTimer = 0;
    this._bossWarnPulseTimer = 0;
    this.bossSpawnPending = false;
    this.bossEntity = null;
    this.pickups = [];
    this.portals = [];
    this.clearHeldInputs();
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('victory-overlay')?.classList?.remove('is-defeat-plaque');
      document.getElementById('hud-right')?.classList?.remove?.('hidden');
    }

    const renderer = this.game.renderer;
    if (renderer) {
      renderer.worldWidth = 1200;
      renderer.adventureMode = false;
      renderer.adventureHook = null;
      renderer.adventureCamMinX = null;
      renderer.adventureCamMaxX = null;
      renderer.camX = 600;
      renderer.camY = (renderer.groundY || 520) - 95;
      renderer.zoom =
        renderer.isMobileLandscape && typeof renderer.getMobileLandscapeFixedZoom === 'function'
          ? renderer.getMobileLandscapeFixedZoom(false)
          : renderer.isMobilePortrait && typeof renderer.getMobilePortraitFixedZoom === 'function'
            ? renderer.getMobilePortraitFixedZoom(false)
            : renderer.isMobile
              ? 0.72
              : 1.0;
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
    const spawnX =
      kind === 'archfiend' ? (Number.isFinite(x) ? x : ADVENTURE_BOSS_ANCHOR_X) : x;
    const facing = kind === 'archfiend' ? -1 : player && player.x > spawnX ? 1 : -1;
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

    // Open a biome-matched HD-2D Dimensional Summoning Portal behind every emerging Realm enemy!
    if (!m.isBoss && !opts.skipPortal) {
      const portalZone =
        kind === 'templar' || kind === 'astrologer'
          ? 0
          : kind === 'treant' || kind === 'dryad'
            ? 1
            : kind === 'ghoul' || kind === 'cultist'
              ? 2
              : kind === 'brute' || kind === 'fiend'
                ? 3
                : Math.max(0, Math.min(3, Math.floor(spawnX / 2400)));
      this.portals.push({
        x: spawnX - facing * 26,
        groundY: gy,
        zone: portalZone,
        facing,
        age: 0,
        maxLife: 1.36,
        isElite: Boolean(opts.isElite),
        primaryColor: m.primaryColor || '#38bdf8',
        seed: (this.portals.length * 1.7 + spawnX * 0.01) % 6.28
      });
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
      relicAmt: extra.relicAmt || 34,
      collected: false
    });
  }

  spawnZoneEncounter(zoneIdx, subWave = 1) {
    const z = ADVENTURE_ZONES[zoneIdx];
    if (!z) return;
    PixelForge.ensureAdventureLoaded?.(zoneIdx);
    if (subWave >= 2 && zoneIdx < 3) {
      const nextZone = zoneIdx + 1;
      const schedulePrewarm = () => PixelForge.ensureAdventureLoaded?.(nextZone);
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(schedulePrewarm, { timeout: 600 });
      } else {
        setTimeout(schedulePrewarm, 180);
      }
    }
    this.zoneIndex = zoneIdx;
    this.subWave = subWave;
    this.goPromptActive = false;
    this.lockActive = true;
    this.lockMinX = subWave === 1 ? z.sub1LockMinX : z.lockMinX;
    this.lockMaxX = subWave === 1 ? z.sub1LockMaxX : z.lockMaxX;

    if (this.game.renderer) {
      this.game.renderer.adventureCamMinX = z.minX;
      this.game.renderer.adventureCamMaxX = z.maxX;
      if (!this.game.renderer.permanentStageOverride) {
        this.game.renderer.stageId = z.stageId;
      }
    }

    if (zoneIdx === 0 && subWave === 1) {
      this.totalWaveLabel = 'WAVE 1 / 8';
      this.spawnMonster('templar', 720, { groundY: 506 });
      this.spawnMonster('templar', 900, { groundY: 618 });
    } else if (zoneIdx === 0 && subWave === 2) {
      this.totalWaveLabel = 'WAVE 2 / 8';
      this.spawnMonster('templar', 1760, { groundY: 478 });
      this.spawnMonster('astrologer', 1980, { groundY: 562 });
      this.spawnMonster('templar', 2140, { groundY: 636 });
      this.game.renderer?.triggerStageEvent?.(
        'ECLIPSE CHAPEL SANCTUM!',
        'ASTRAL PORTALS OPEN — FALLEN TEMPLARS & SEER!',
        '#38bdf8',
        2.4
      );
    } else if (zoneIdx === 1 && subWave === 1) {
      this.totalWaveLabel = 'WAVE 3 / 8';
      this.spawnMonster('treant', 3120, { groundY: 562 });
      this.spawnMonster('dryad', 3290, { groundY: 478 });
      this.spawnMonster('dryad', 3420, { groundY: 642 });
      this.game.renderer?.triggerStageEvent?.(
        'ZONE II: CURSED STARWOOD',
        'BRIAR PORTALS TEAR OPEN — ELDERTREE & DRYADS!',
        '#34d399',
        2.6
      );
    } else if (zoneIdx === 1 && subWave === 2) {
      this.totalWaveLabel = 'WAVE 4 / 8';
      this.spawnMonster('treant', 4460, {
        isElite: true,
        isMiniBoss: true,
        wardenName: 'ELDER BRIAR-KING',
        wardenTitle: 'STARWOOD WARDEN',
        maxHp: 3100,
        spriteScale: 1.36,
        dmgScale: 1.16,
        groundY: 558
      });
      this.spawnMonster('dryad', 4140, { groundY: 478 });
      this.spawnMonster('dryad', 4340, { groundY: 642 });
      this.game.renderer?.triggerStageEvent?.(
        'REALM WARDEN: ELDER BRIAR-KING!',
        'SOVEREIGN OF THE CURSED STARWOOD AWAKENS!',
        '#34d399',
        2.9
      );
    } else if (zoneIdx === 2 && subWave === 1) {
      this.totalWaveLabel = 'WAVE 5 / 8';
      this.spawnMonster('ghoul', 5480, { isElite: true, groundY: 560 });
      this.spawnMonster('ghoul', 5280, { groundY: 476 });
      this.spawnMonster('ghoul', 5660, { groundY: 646 });
      this.spawnMonster('cultist', 5800, { isElite: true, groundY: 518 });
      this.game.renderer?.triggerStageEvent?.(
        'ZONE III: ABYSSAL BONE-GATE',
        'CRYPT PORTALS UNSEALED — OSSUARY UNDEAD LEGION!',
        '#c084fc',
        2.8
      );
    } else if (zoneIdx === 2 && subWave === 2) {
      this.totalWaveLabel = 'WAVE 6 / 8';
      this.spawnMonster('cultist', 6860, {
        isElite: true,
        isMiniBoss: true,
        wardenName: 'ARCH-LICH MORVATH',
        wardenTitle: 'OSSUARY WARDEN',
        maxHp: 2800,
        spriteScale: 1.24,
        dmgScale: 1.16,
        groundY: 548
      });
      this.spawnMonster('ghoul', 6560, { isElite: true, groundY: 482 });
      this.spawnMonster('ghoul', 6420, { groundY: 640 });
      this.game.renderer?.triggerStageEvent?.(
        'REALM WARDEN: ARCH-LICH MORVATH!',
        'LORD OF THE OSSUARY BONE-GATE UNSEALS THE CRYPT!',
        '#c084fc',
        2.9
      );
    } else if (zoneIdx === 3 && subWave === 1) {
      this.totalWaveLabel = 'WAVE 7 / 8';
      this.spawnMonster('brute', 7920, { isElite: true, groundY: 560 });
      this.spawnMonster('fiend', 8080, { isElite: true, groundY: 482 });
      this.spawnMonster('fiend', 8210, { groundY: 638 });
      this.spawnMonster('fiend', 7720, { groundY: 616 });
      this.game.renderer?.triggerStageEvent?.(
        'ZONE IV: BLACK PIT VANGUARD',
        'HELL-MAW PORTALS ERUPT BEFORE MALPHAS!',
        '#fb923c',
        2.7
      );
    } else if (zoneIdx === 3) {
      this.totalWaveLabel = 'COLOSSAL BOSS';
      this.bossWarningTimer = 1.85;
      this._bossWarnPulseTimer = 0;
      this.bossSpawnPending = true;
      const player = this.game.leftFighter;
      if (player) {
        const isRangedHero = (player.attackRange || 180) >= 320;
        const bossEntryX = isRangedHero ? 8840 : 9165;
        if (player.x < 8500) player.x = bossEntryX;
        else if (player.x > ADVENTURE_BOSS_MAX_WALK_X) player.x = ADVENTURE_BOSS_MAX_WALK_X;
        player.facing = 1;
      }
      if (this.game.audio) this.game.audio.play('eclipse_charge', ADVENTURE_BOSS_ANCHOR_X);
      if (this.game.renderer) {
        this.game.renderer.triggerShake(16, 0.72);
        this.game.renderer.triggerStageEvent?.(
          'WARNING: BEHEMOTH MALPHAS!',
          'COLOSSAL SOVEREIGN RISES ON THE EAST ABYSS!',
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
      // Summon 2 flanking Shackled Pit-Fiends through Hell-Maw Portals + drop Elixir & Soul Ember!
      this.spawnMonster('fiend', 8620, { groundY: 484 });
      this.spawnMonster('fiend', 8780, { groundY: 638 });
      this.spawnPickup('hp', 8880, 502);
      this.spawnPickup('ember', 8980, 622, { ultAmt: 20 });
    } else if (phase === 3) {
      this.spawnPickup('hp', 8860, 496);
      this.spawnPickup('relic', 8980, 626, { relicAmt: 18 });
      this.spawnPickup('ember', 9080, 558, { ultAmt: 22 });
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
    const xpGain = deadMonster.isBoss
      ? 320
      : deadMonster.isMiniBoss
        ? 145
        : deadMonster.isElite
          ? 95
          : 52;
    this.progression.gainXp(xpGain, player);

    if (!deadMonster.isBoss) {
      // Slain monsters drop magnetic Soul Embers to fuel Overdrive; ONLY Realm Mini-Boss Wardens drop a Relic Seal!
      this.spawnPickup('ember', deadMonster.x, deadMonster.groundY, {
        ultAmt: deadMonster.isMiniBoss ? 24 : deadMonster.isElite ? 18 : 13
      });
      if (deadMonster.isMiniBoss) {
        this.spawnPickup('relic', deadMonster.x + 48, deadMonster.groundY, { relicAmt: 18 });
        this.spawnPickup('hp', deadMonster.x - 48, deadMonster.groundY);
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

    g.setPaused?.(false, false);
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
    const victoryOverlay = hasDom ? document.getElementById('victory-overlay') : null;
    const eyebrowEl = hasDom ? document.getElementById('victory-eyebrow') : null;
    const winnerEl = hasDom ? document.getElementById('victory-winner') : null;
    const statsEl = hasDom ? document.getElementById('victory-stats') : null;
    const autoEl = hasDom ? document.getElementById('victory-auto-next') : null;
    const nextChallengerBtn = hasDom ? document.getElementById('btn-next-challenger') : null;
    const playAgainBtn = hasDom ? document.getElementById('btn-play-again') : null;
    const selectBtn = hasDom ? document.getElementById('btn-victory-select') : null;
    const titleBtn = hasDom ? document.getElementById('btn-victory-title') : null;

    victoryOverlay?.classList?.remove('is-defeat-plaque');
    nextChallengerBtn?.classList?.add('hidden');
    if (playAgainBtn) playAgainBtn.textContent = 'RETRY CAMPAIGN';
    if (selectBtn) {
      selectBtn.classList?.remove('hidden');
      selectBtn.textContent = 'CHANGE HERO';
    }
    if (titleBtn) {
      titleBtn.classList?.remove('hidden');
      titleBtn.textContent = 'TITLE SCREEN';
    }

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
      autoEl.classList?.remove('hidden');
      autoEl.textContent = 'CAMPAIGN COMPLETE • PRESS RETRY CAMPAIGN TO REPLAY';
    }

    // Populate Left (Hero) & Right (Abyssal Horde + Boss) Telemetry
    if (hasDom) {
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
      };
      setTxt('tel-left-extra-label', 'MONSTERS SLAIN');
      setTxt('tel-right-skills-label', 'ZONE / PHASE');
      setTxt('tel-right-extra-label', 'RUN SCORE');

      setTxt('tel-left-name', player?.name || 'CHAMPION');
      setTxt('tel-left-dmg', Math.round(player?.stats?.damageDealt || 0));
      setTxt('tel-left-skills', `${player?.stats?.skillsUsed || 0} / ${player?.stats?.ultsUsed || 0}`);
      setTxt('tel-left-max', Math.round(player?.stats?.biggestHit || 0));
      setTxt('tel-left-extra', `${this.monstersKilled} SLAIN`);

      setTxt('tel-right-name', 'ARCHFIEND HORDE');
      setTxt('tel-right-dmg', Math.round(boss?.stats?.damageDealt || 0));
      setTxt('tel-right-skills', `PHASE ${boss?.bossPhase || 3}`);
      setTxt('tel-right-max', Math.round(boss?.stats?.biggestHit || 0));
      setTxt('tel-right-extra', `${this.score} PTS`);
    }

    this.syncControlDeckUI();
    g.updateHUD();
  }

  onPlayerDeath(player) {
    const g = this.game;
    if (this.isSkillTreeOpen) {
      this.closeSkillTree(false);
    }
    if (player) {
      if (player._advPureDodge) {
        this.finishHeroAdventureDodge(player, false);
      }
      player._grabbedByBoss = false;
      player._grabbedByBossTimer = 0;
      player._advPureDodge = false;
      player._advDodgeFrameOverride = null;
      if (Number.isFinite(player.groundY) && player.y < player.groundY) {
        player.y = player.groundY;
        player.vy = 0;
      }
    }

    g.setPaused?.(false, false);
    g.isMatchOver = true;
    g.koSlowTimer = 0.48;
    g.deadMatchFighter = player;
    g.victoryRevealPending = true;
    g.postDeathHoldTimer = 0;

    const killer = this.bossEntity || this.getLivingMonsters()[0] || null;
    const killerName = killer && killer !== player ? killer.name : 'ABYSSAL HORDE';
    const hasDom = typeof document !== 'undefined' && typeof document.getElementById === 'function';
    const victoryOverlay = hasDom ? document.getElementById('victory-overlay') : null;
    const eyebrowEl = hasDom ? document.getElementById('victory-eyebrow') : null;
    const winnerEl = hasDom ? document.getElementById('victory-winner') : null;
    const statsEl = hasDom ? document.getElementById('victory-stats') : null;
    const autoEl = hasDom ? document.getElementById('victory-auto-next') : null;
    const nextChallengerBtn = hasDom ? document.getElementById('btn-next-challenger') : null;
    const playAgainBtn = hasDom ? document.getElementById('btn-play-again') : null;
    const selectBtn = hasDom ? document.getElementById('btn-victory-select') : null;
    const titleBtn = hasDom ? document.getElementById('btn-victory-title') : null;

    victoryOverlay?.classList?.add('is-defeat-plaque');
    nextChallengerBtn?.classList?.add('hidden');
    if (playAgainBtn) playAgainBtn.textContent = 'RETRY CAMPAIGN';
    if (selectBtn) {
      selectBtn.classList?.remove('hidden');
      selectBtn.textContent = 'CHANGE HERO';
    }
    if (titleBtn) {
      titleBtn.classList?.remove('hidden');
      titleBtn.textContent = 'TITLE SCREEN';
    }

    if (eyebrowEl) {
      eyebrowEl.textContent = `PILGRIMAGE DEFEAT • ZONE ${this.zoneIndex + 1} • SCORE: ${this.score}`;
    }
    if (winnerEl) {
      winnerEl.textContent = `DEFEATED — ${killerName.toUpperCase()} PREVAILS`;
    }
    if (statsEl) {
      statsEl.textContent = 'The Black Pit claims another soul — spend Skill Points, unleash Overdrive, and retry!';
    }
    if (autoEl) {
      autoEl.classList?.remove('hidden');
      autoEl.textContent = 'PILGRIMAGE FALLEN • CHOOSE RETRY OR CHANGE HERO';
    }

    if (hasDom) {
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
      };
      setTxt('tel-left-extra-label', 'MONSTERS SLAIN');
      setTxt('tel-right-skills-label', 'ZONE / PHASE');
      setTxt('tel-right-extra-label', 'RUN SCORE');

      setTxt('tel-left-name', player?.name || 'CHAMPION');
      setTxt('tel-left-dmg', Math.round(player?.stats?.damageDealt || 0));
      setTxt('tel-left-skills', `${player?.stats?.skillsUsed || 0} / ${player?.stats?.ultsUsed || 0}`);
      setTxt('tel-left-max', Math.round(player?.stats?.biggestHit || 0));
      setTxt('tel-left-extra', `${this.monstersKilled} SLAIN`);

      setTxt('tel-right-name', killerName.toUpperCase());
      setTxt('tel-right-dmg', Math.round(killer?.stats?.damageDealt || 0));
      setTxt(
        'tel-right-skills',
        killer?.isBoss ? `PHASE ${killer.bossPhase || 1}` : `ZONE ${this.zoneIndex + 1}`
      );
      setTxt('tel-right-max', Math.round(killer?.stats?.biggestHit || 0));
      setTxt('tel-right-extra', `${this.score} PTS`);
    }

    this.syncControlDeckUI();
    g.updateHUD();
  }

  unlockSubWave(zoneIdx) {
    const z = ADVENTURE_ZONES[zoneIdx] || ADVENTURE_ZONES[0];
    this.lockActive = false;
    this.lockMinX = 80;
    this.lockMaxX = z.maxX - 40;

    if (this.game.renderer) {
      this.game.renderer.adventureCamMinX = 0;
      this.game.renderer.adventureCamMaxX = z.maxX;
    }

    this.goPromptActive = true;
    this.goPromptText = zoneIdx === 3 ? 'THRONE AHEAD! GO!' : 'ADVANCE! GO!';
    this.goBlinkTimer = 0;

    const p = this.game.leftFighter;
    this.progression.gainXp(25, p);

    const dropX = p ? Math.min(this.lockMaxX - 180, p.x + 125) : z.minX + 1040;
    this.spawnPickup('ember', dropX, 558, { ultAmt: 22 });
    if (zoneIdx >= 2) {
      this.spawnPickup('hp', dropX + 66, 504);
    }

    if (this.game.audio) {
      this.game.audio.play('reflect', dropX);
    }
  }

  unlockCurrentZone(zoneIdx) {
    this.zonesCleared[zoneIdx] = true;
    this.lockActive = false;
    const nextZone = ADVENTURE_ZONES[zoneIdx + 1];
    this.lockMinX = 80;
    this.lockMaxX = nextZone ? nextZone.sub1LockMaxX : ADVENTURE_WORLD_WIDTH - 80;

    if (this.game.renderer) {
      this.game.renderer.adventureCamMinX = 0;
      this.game.renderer.adventureCamMaxX = nextZone ? nextZone.maxX : ADVENTURE_WORLD_WIDTH;
    }

    this.goPromptActive = true;
    this.goPromptText = zoneIdx === 2 ? 'BOSS REALM AHEAD! GO!' : 'CLEAR! GO!';
    this.goBlinkTimer = 0;

    const p = this.game.leftFighter;
    this.progression.gainXp(35, p);

    const dropBaseX = p ? Math.min(this.lockMaxX - 180, p.x + 140) : zoneIdx * 2400 + 2020;
    if (zoneIdx === 0) {
      this.spawnPickup('hp', dropBaseX, 514);
      this.spawnPickup('ember', dropBaseX + 68, 566, { ultAmt: 16 });
      this.spawnPickup('relic', dropBaseX + 136, 614, { relicAmt: 12 });
    } else if (zoneIdx === 1) {
      this.spawnPickup('hp', dropBaseX, 512);
      this.spawnPickup('ember', dropBaseX + 68, 564, { ultAmt: 16 });
      this.spawnPickup('relic', dropBaseX + 136, 612, { relicAmt: 12 });
    } else if (zoneIdx === 2) {
      // Sanctuary Boss-Prep Cache staggered across the 3D road before Throne of the Black Pit!
      this.spawnPickup('hp', 6920, 498);
      this.spawnPickup('ember', 7000, 562, { ultAmt: 18 });
      this.spawnPickup('relic', 7080, 626, { relicAmt: 12 });
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
          const gainAmt = pk.ultAmt || 16;
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
          const rAmt = pk.relicAmt || 18;
          this.progression.gainAstralRelic(rAmt, player, `ASTRAL SEAL +${rAmt}%!`);
          this.game.vfx?.spawnBurst(pk.x, pk.y - 24, 18, '#67e8f9', 210, { upBias: 135, size: 5 });
        }
      }
    }
  }

  syncStageBadge() {
    const badge = this.game.hudEls?.stageBadge;
    if (!badge) return;
    const ov = this.game.renderer?.permanentStageOverride;
    const zPrefix = `Z${this.zoneIndex + 1}`;
    let nextText;
    if (ov === 'inferno') {
      nextText = `${zPrefix} • LAYWASTE OF INFERNO`;
    } else if (ov === 'glacial') {
      nextText = `${zPrefix} • PERMAFROST AURORA SANCTUM`;
    } else if (ov === 'shogunate') {
      nextText = `${zPrefix} • CRIMSON MOON SHOGUNATE`;
    } else if (ov === 'shogunate_inferno') {
      nextText = `${zPrefix} • BURNING SAKURA SHOGUNATE`;
    } else if (ov === 'shogunate_glacial') {
      nextText = `${zPrefix} • FROZEN SAKURA SHOGUNATE`;
    } else {
      const z = ADVENTURE_ZONES[this.zoneIndex] || ADVENTURE_ZONES[0];
      nextText = z.title;
    }
    if (badge.textContent !== nextText) {
      badge.textContent = nextText;
    }
  }

  syncRightHUD() {
    const g = this.game;
    const rightEls = g.hudEls?.right;
    if (!rightEls) return;

    const living = this.getLivingMonsters();
    const primaryMonster =
      this.bossEntity && !this.bossEntity.isDead
        ? this.bossEntity
        : living.find((m) => m.isMiniBoss) ||
          living.find((m) => m.isElite) ||
          living[0] ||
          g.rightFighter;

    if (primaryMonster) {
      g.rightFighter = primaryMonster;
      // Do NOT show normal enemies on the right-side player HUD during Adventure Mode;
      // Colossal Boss uses the dedicated `#adv-boss-raid-hud` Raid Plaque instead.
      const keepInternalWardenTag = Boolean(primaryMonster.isMiniBoss);
      if (rightEls.name) {
        const nextName = keepInternalWardenTag
          ? living.length > 1
            ? `${primaryMonster.name} (+${living.length - 1})`
            : `${primaryMonster.name}`
          : '';
        if (rightEls.name.textContent !== nextName) {
          rightEls.name.textContent = nextName;
        }
      }
      if (rightEls.skillText) {
        const nextSkill = keepInternalWardenTag
          ? `WARDEN • ${primaryMonster.skillName}`
          : '';
        if (rightEls.skillText.textContent !== nextSkill) {
          rightEls.skillText.textContent = nextSkill;
        }
      }
      if (rightEls.hpBar && primaryMonster.isBoss) {
        const nextBarCls = `hp-fill fill-${primaryMonster.theme || 'abyssal'}`;
        if (rightEls.hpBar.className !== nextBarCls) {
          rightEls.hpBar.className = nextBarCls;
        }
      }
      if (rightEls.partnerWing && !rightEls.partnerWing.classList?.contains?.('hidden')) {
        rightEls.partnerWing.classList?.add?.('hidden');
      }
    }

    // Keep top-left HUD portrait synced to the active Adventure hero across character switches
    const leftHeroId = g.leftFighter?.heroId || g.slot1Hero || 'mage';
    const leftCol = g.leftFighter?.primaryColor || '#fb923c';
    PixelForge.setHUDPortraits(leftHeroId, leftCol, 'archfiend', '#ef4444');

    if (g.hudEls?.crestVs) {
      const nextCrest = this.zoneIndex === 3 ? 'BOSS' : `Z${this.zoneIndex + 1}`;
      if (g.hudEls.crestVs.textContent !== nextCrest) {
        g.hudEls.crestVs.textContent = nextCrest;
      }
    }
    if (g.hudEls?.modeBadge) {
      let nextBadge;
      if (g.renderer?.isMobilePortrait) {
        const shortWave =
          this.totalWaveLabel === 'COLOSSAL BOSS'
            ? 'BOSS'
            : this.totalWaveLabel.replace('WAVE ', 'W').replace(/\s+/g, '');
        nextBadge = `${shortWave} • ${this.score}P`;
      } else {
        nextBadge = `LV.${this.progression.level} • ${this.totalWaveLabel} • ${this.score} PTS`;
      }
      if (g.hudEls.modeBadge.textContent !== nextBadge) {
        g.hudEls.modeBadge.textContent = nextBadge;
      }
    }
    g.updateAdventureBossHUD?.();
  }

  pushHeroDodgeTrail(player, entry) {
    if (!player) return;
    if (!player._advDodgeTrails) player._advDodgeTrails = [];
    if (player._advDodgeTrails.length >= 24) player._advDodgeTrails.shift();
    player._advDodgeTrails.push({
      age: 0,
      maxLife: entry.maxLife ?? 0.30,
      layer: entry.layer || 'back',
      kind: entry.kind || 'streak',
      x: entry.x ?? player.x,
      y: entry.y ?? player.groundY,
      w: entry.w ?? 28,
      h: entry.h ?? 4,
      color: entry.color || player.primaryColor || '#38bdf8'
    });
  }

  finishHeroAdventureDodge(player, returnToIdle = true) {
    if (!player) return;
    const heroId = player.heroId || 'mage';
    const baseHeroId = heroId.endsWith('_ex') ? heroId.slice(0, -3) : heroId;
    player._advPureDodge = false;
    player._advDodgeFrameOverride = null;
    player._advDodgeGhostStep = 0;
    player._advDodgeArrivalDone = false;
    player.isInvulnerable = false;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY;
    if (baseHeroId === 'priestess') {
      player.isAngelicAscent = false;
    } else if (baseHeroId === 'reaper' || baseHeroId === 'mage') {
      player.wraithAlpha = 1.0;
    } else if (baseHeroId === 'titan') {
      player.unstoppablePoise = false;
    }
    if (returnToIdle && !player.isDead && player.state === 'DODGE') {
      player.setState('IDLE');
    }
  }

  startHeroAdventureDodge(player, evadeX, evadeZ, stats) {
    if (!player) return;
    const heroId = player.heroId || 'mage';
    const isExHero = heroId.endsWith('_ex');
    const dodgeStyle = heroId === 'warrior_ex' ? 'warrior_ex' : isExHero ? heroId.slice(0, -3) : heroId;
    if (Math.abs(evadeX) > 0.15) {
      player.facing = evadeX > 0 ? 1 : -1;
    }
    this.dodgeCdMax = Math.max(0.55, 1.35 * (stats?.mobilityCdMult ?? 1));
    player.dodgeCooldown = this.dodgeCdMax;
    player.dashDir = evadeX >= 0 ? 1 : -1;
    player._advPureDodge = true;
    player._advPureDodgeTimer = 0;
    player._advPureDodgeDur = 0.28;
    player._advPureDodgeDirX = evadeX;
    player._advPureDodgeDirZ = evadeZ;
    player._advDodgeGhostStep = 0;
    player._advDodgeTrailAccum = 0;
    player._advDodgeArrivalDone = false;
    player._advVaultVelZ = 0;

    let speedMult = 1.08;
    let initFrame = 184;
    if (heroId === 'valkyrie') {
      speedMult = 1.08;
      initFrame = 124; // Row 4 Twin-Winged Sovereign Glide pose!
    } else if (heroId === 'valkyrie_ex') {
      speedMult = 1.12;
      initFrame = 183; // Standard Row 6 EX Sovereign Winged Glide!
    } else if (dodgeStyle === 'icemage') {
      speedMult = 1.14;
      initFrame = 182; // Row 6 Figure-Skating Ice-Slide!
    } else if (dodgeStyle === 'android') {
      speedMult = 1.16;
      initFrame = 184; // Row 6 Rocket-Thruster Boost!
    } else if (dodgeStyle === 'priestess') {
      speedMult = 1.06;
      initFrame = 182; // Row 6 + Seraphim 30f Archangel Wings!
    } else if (dodgeStyle === 'mage') {
      speedMult = 1.12;
      initFrame = 180; // Row 6 Solar Phoenix Fire-Blink!
    } else if (heroId === 'archer') {
      speedMult = 1.12;
      initFrame = 244; // Row 8 Sylvan Zephyr Wind-Vault!
    } else if (heroId === 'archer_ex') {
      speedMult = 1.14;
      initFrame = 183; // Standard Row 6 EX Astral Zephyr Vault!
    } else if (dodgeStyle === 'reaper') {
      speedMult = 1.12;
      initFrame = 183; // Row 6 Abyssal Wraith Shadow-Shift!
    } else if (dodgeStyle === 'chronomancer') {
      speedMult = 1.14;
      initFrame = 182; // Row 6 Horological Time-Warp!
    } else if (heroId === 'warrior') {
      speedMult = 1.10;
      initFrame = 184; // Row 6 Celestial Runic Flash-Step!
    } else if (heroId === 'warrior_ex') {
      speedMult = 1.15;
      initFrame = 183; // Row 6 Exvius Sword-Drag Flash-Step Blitz!
    } else if (dodgeStyle === 'ronin') {
      speedMult = 1.16;
      initFrame = 185; // Row 6 Lightning Suriashi Slide!
    } else if (dodgeStyle === 'titan') {
      speedMult = 1.08;
      initFrame = 183; // Row 6 Molten Bull-Rush Stride!
    }
    player._advDodgeSpeedMult = speedMult;
    player._advDodgeFrameOverride = initFrame;

    player.setState('DODGE');
    player._advPureDodge = true;
    player._advDodgeFrameOverride = initFrame;
    player.dashDuration = 0.28;
    player.isInvulnerable = true;
    player.isFlipVault = false;
    player.isWraithPhase = false;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY;

    this.progression.gainSpirit(18);
    const audio = this.game?.audio;
    const vfx = this.game?.vfx;

    // Trigger each champion's signature non-attacking Dodge Shaders, Wings, Thrusters & SFX (0 projectiles / 0 damage!)
    switch (dodgeStyle) {
      case 'valkyrie': {
        // Freyja (`GLIDE` — Wings Icon): Sovereign Winged Glide + 6-Pinion Valkyrie Light-Wings & Feather Slipstream!
        audio?.play?.('dash_whoosh', player.x);
        player.fx?.spawn('valhallaGroundBurst', player.x, player.groundY, {
          light: 1.06,
          extra: { radius: 26 }
        });
        player.fx?.spawn('valkyrieWingPlume', player.x - player.facing * 18, player.y - 116, {
          follow: player,
          offsetX: -18,
          offsetY: -116,
          flip: player.facing < 0,
          maxDuration: 0.30,
          light: 1.14,
          extra: { wingSpan: 28 }
        });
        player.fx?.spawn('valkyrieSlipstreamTrail', player.x - player.facing * 18, player.y - 94, {
          follow: player,
          offsetX: -18,
          offsetY: -94,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.04,
          extra: { length: 28, tilt: -0.08 }
        });
        vfx?.spawnShockwave?.(player.x, player.groundY - 4, 56, '#fbbf24', 0.20, true);
        break;
      }
      case 'icemage': {
        // Lyra (`SKATE` — Skate Icon): Graceful Figure-Skating Ice Slide + Glacial Skate Ribbon & Frost Track!
        audio?.play?.('frost_cast', player.x);
        audio?.play?.('dash_whoosh', player.x);
        player.ensureGlacialSkateRibbon?.();
        player.fx?.spawn('permafrostSnowflakeSigil', player.x, player.groundY - 4, {
          maxDuration: 0.30,
          light: 1.08,
          extra: { radius: 24 }
        });
        player.spawnPixelFrostRing?.(player.x, player.groundY - 10, 52, '#67e8f9', 0.20, true, false);
        this.pushHeroDodgeTrail(player, {
          kind: 'ice_track',
          layer: 'back',
          x: player.x,
          y: player.groundY - 2,
          w: 34,
          maxLife: 0.38
        });
        break;
      }
      case 'android': {
        // VEX-09 (`THRUST` — Rocket Icon): Twin Wing-Pylon Rocket-Thruster Boost & Neon Plasma Exhaust!
        audio?.play?.('dash_whoosh', player.x);
        player.fx?.spawn('wingPylonThruster', player.x - player.facing * 18, player.y - 132, {
          follow: player,
          offsetX: -18,
          offsetY: -132,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.08,
          extra: { length: 28, tilt: -0.82 }
        });
        player.fx?.spawn('wingPylonThruster', player.x - player.facing * 20, player.y - 98, {
          follow: player,
          offsetX: -20,
          offsetY: -98,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.04,
          extra: { length: 24, tilt: -0.84 }
        });
        player.fx?.spawn('cyberImpactSpark', player.x - player.facing * 16, player.groundY - 88, {
          flip: player.facing < 0,
          light: 1.10
        });
        vfx?.spawnShockwave?.(player.x, player.groundY - 6, 56, '#00f0ff', 0.18, true);
        break;
      }
      case 'priestess': {
        // Seraphina (`GLIDE` — Wings Icon): Unfurls her 30-frame `seraphim_wings.png` Archangel Wings & Radiant Slipstream!
        player.isAngelicAscent = true;
        audio?.play?.('holy_bolt', player.x);
        player.ensureSlipstream?.();
        player.fx?.spawn('graceHealBloom', player.x, player.groundY, {
          follow: player,
          offsetX: 0,
          offsetY: 0,
          useGroundY: true,
          maxDuration: 0.28,
          light: 1.12
        });
        vfx?.spawnGlyphBurst?.(player.x, player.groundY - 94, 5, 'radiant');
        break;
      }
      case 'mage': {
        // Ignis Sol (`BLINK` — Flame Rift Icon): Solar Phoenix Fire-Blink Rift & Blazing Glide Trail!
        audio?.play?.('blink', player.x);
        player.fx?.spawn('arcaneBlinkRift', player.x, player.groundY, {
          light: 1.24,
          extra: { isArrival: false }
        });
        player.ensureSolarGlideTrail?.();
        player.spawnSolarEcho?.(182, 0.85, 0.24);
        vfx?.spawnGlyphBurst?.(player.x, player.groundY - 92, 5, 'arcane');
        break;
      }
      case 'archer': {
        // Sylvara (`DASH` — Sylvan Wind Icon): Acrobatic Zephyr Wind-Vault + Astral Emerald Wing-Plume!
        audio?.play?.('zephyr_flip', player.x);
        player.fx?.spawn('zephyrGroundBurst', player.x, player.groundY, {
          light: 1.05,
          extra: { radius: 26 }
        });
        player.fx?.spawn('zephyrVaultSlipstream', player.x - player.facing * 14, player.y - 104, {
          follow: player,
          offsetX: -14,
          offsetY: -104,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.06,
          extra: { length: 28, tilt: -0.14 }
        });
        player.fx?.spawn('astralWingPlume', player.x - player.facing * 14, player.y - 110, {
          follow: player,
          offsetX: -14,
          offsetY: -110,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.08,
          extra: { wingSpan: 24 }
        });
        break;
      }
      case 'reaper': {
        // Malakor (`SHIFT` — Abyssal Wraith Icon): Ghostly Translucent Wraith Shadow-Shift & Rift Portal!
        audio?.play?.('dash_whoosh', player.x);
        player.wraithAlpha = 0.34;
        player.fx?.spawn('companionSummonRiftPortal', player.x, player.groundY - 4, {
          light: 1.18,
          extra: { radius: 26, isCrimson: false, customDuration: 0.28 }
        });
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, 4, 0.22);
        break;
      }
      case 'chronomancer': {
        // Chronos (`WARP` — Clockwork Portal Icon): Horological Time-Warp Rift + Paradox Temporal Echoes!
        audio?.play?.('time_rewind', player.x);
        player.fx?.spawn('warpPortalPairRift', player.x, player.groundY - 92, {
          flip: player.facing < 0,
          light: 1.22,
          extra: { isArrival: false }
        });
        player.spawnTemporalEcho?.(182);
        vfx?.spawnGlyphBurst?.(player.x, player.groundY - 92, 4, 'chrono');
        break;
      }
      case 'warrior': {
        // Aethelgard (`STEP` — Runic Flash-Step Icon): Celestial Paladin Runic Teleport Pillar & Speed-Mirage!
        audio?.play?.('dash_whoosh', player.x);
        player.fx?.spawn('blinkTeleportPillar', player.x, player.groundY, {
          maxDuration: 0.24,
          light: 1.16,
          extra: { width: 22, height: 138 }
        });
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, 4, 0.20);
        vfx?.spawnShockwave?.(player.x, player.groundY - 4, 54, '#38bdf8', 0.18, true);
        break;
      }
      case 'warrior_ex': {
        // Aethelgard EX (`BLITZ` — Sword-Drag Flash-Step Icon): Low Exvius Sword-Drag Cinder Blitz & Astral Mirage!
        audio?.play?.('dash_whoosh', player.x);
        player.fx?.spawn('blinkTeleportPillar', player.x, player.groundY, {
          maxDuration: 0.22,
          light: 1.22,
          extra: { width: 24, height: 142 }
        });
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, 4, 0.22, 'gold');
        vfx?.spawnShockwave?.(player.x, player.groundY - 4, 60, '#facc15', 0.18, true);
        break;
      }
      case 'ronin': {
        // Kaze-Maru (`SURIASHI` — Lightning Footwork Icon): Grounded Lightning Shunpo / Suriashi Slide!
        audio?.play?.('dash_whoosh', player.x);
        player.spawnSayaGlint?.(false);
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, 5, 0.20, 0);
        vfx?.spawnShockwave?.(player.x, player.groundY - 4, 52, '#38bdf8', 0.16, true);
        break;
      }
      case 'titan': {
        // Torgar (`STRIDE` — Molten Forge Icon): Unstoppable Khazad Bull-Rush Stride & Molten Anvil Sparks!
        audio?.play?.('dash_whoosh', player.x);
        player.unstoppablePoise = true;
        player.fx?.spawn('runicBulwarkDome', player.x, player.y - 78, {
          follow: player,
          offsetX: 0,
          offsetY: -78,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.12
        });
        player.fx?.spawn('moltenAnvilSparks', player.x, player.groundY - 10, {
          flip: player.facing < 0,
          light: 1.14
        });
        this.game?.renderer?.triggerShake?.(3.5, 0.08);
        vfx?.spawnShockwave?.(player.x, player.groundY - 4, 58, '#f59e0b', 0.20, true);
        break;
      }
      default: {
        audio?.play?.('dash_whoosh', player.x);
        vfx?.spawnShockwave?.(player.x, player.groundY - 6, 46, '#bae6fd', 0.18, true);
        break;
      }
    }
  }

  updateHeroAdventureDodge(dt, player) {
    player._manualWalkActive = false;
    player._manualSpeedRatio = 0;
    if (player.isDead || player.state !== 'DODGE') {
      this.finishHeroAdventureDodge(player, false);
      return false;
    }

    const heroId = player.heroId || 'mage';
    const isExHero = heroId.endsWith('_ex');
    const dodgeStyle = heroId === 'warrior_ex' ? 'warrior_ex' : isExHero ? heroId.slice(0, -3) : heroId;
    player._advPureDodgeTimer = (player._advPureDodgeTimer || 0) + dt;
    const dur = player._advPureDodgeDur || 0.28;
    const u = Math.min(1, player._advPureDodgeTimer / dur);

    // Hero-specific velocity curve (Lyra SKATE glides smoothly with minimal friction; THRUST/SURIASHI burst fast!)
    const speedMult = player._advDodgeSpeedMult || 1.08;
    const speedScale =
      dodgeStyle === 'icemage'
        ? speedMult * (1.24 - 0.28 * u)
        : speedMult * 1.36 * (1 - 0.56 * u * u);
    player.x += (player._advPureDodgeDirX || 0) * 580 * speedScale * dt;
    this.shiftEntityDepth(player, (player._advPureDodgeDirZ || 0) * 355 * speedScale * dt);

    // Hero-specific vertical flight / hover / skate profile & exact sprite frame slice
    let liftY = 0;
    if (heroId === 'valkyrie') {
      liftY = Math.sin(u * Math.PI) * 30;
      player._advDodgeFrameOverride = 124 + Math.min(7, Math.floor(u * 8));
    } else if (heroId === 'valkyrie_ex') {
      liftY = Math.sin(u * Math.PI) * 28;
      player._advDodgeFrameOverride = 183 + Math.min(23, Math.floor(u * 24));
    } else if (dodgeStyle === 'priestess') {
      player.isAngelicAscent = true;
      liftY = Math.sin(u * Math.PI) * 26;
      player._advDodgeFrameOverride = 182 + Math.min(23, Math.floor(u * 24));
    } else if (heroId === 'archer') {
      liftY = Math.sin(u * Math.PI) * 34;
      player._advDodgeFrameOverride = 244 + Math.min(21, Math.floor(u * 22));
    } else if (heroId === 'archer_ex') {
      liftY = Math.sin(u * Math.PI) * 30;
      player._advDodgeFrameOverride = 183 + Math.min(23, Math.floor(u * 24));
    } else if (dodgeStyle === 'android') {
      liftY = Math.sin(u * Math.PI) * 14;
      player._advDodgeFrameOverride = 184 + Math.min(21, Math.floor(u * 22));
    } else if (dodgeStyle === 'mage') {
      liftY = Math.sin(u * Math.PI) * 16;
      player.wraithAlpha = u > 0.16 && u < 0.64 ? 0.34 : 1.0;
      player._advDodgeFrameOverride = 180 + Math.min(28, Math.floor(u * 29));
    } else if (dodgeStyle === 'icemage') {
      liftY = Math.sin(u * Math.PI) * 4;
      player._advDodgeFrameOverride = 182 + Math.min(24, Math.floor(u * 25));
    } else if (dodgeStyle === 'reaper') {
      liftY = Math.sin(u * Math.PI) * 10;
      player.wraithAlpha = u < 0.88 ? 0.34 : 1.0;
      player._advDodgeFrameOverride = 183 + Math.min(23, Math.floor(u * 24));
    } else if (dodgeStyle === 'chronomancer') {
      liftY = Math.sin(u * Math.PI) * 8;
      player._advDodgeFrameOverride = 182 + Math.min(24, Math.floor(u * 25));
    } else if (heroId === 'warrior') {
      liftY = Math.sin(u * Math.PI) * 8;
      player._advDodgeFrameOverride = 184 + Math.min(21, Math.floor(u * 22));
    } else if (heroId === 'warrior_ex') {
      liftY = 0;
      player._advDodgeFrameOverride = 183 + Math.min(23, Math.floor(u * 24));
    } else if (dodgeStyle === 'ronin') {
      liftY = 0;
      player._advDodgeFrameOverride = 185 + Math.min(20, Math.floor(u * 21));
    } else {
      liftY = 0;
      player._advDodgeFrameOverride = 183 + Math.min(22, Math.floor(u * 23));
    }

    player.isInvulnerable = true;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY - liftY;

    // Continuous mid-dodge signature trails, feathers, ice-tracks, rocket exhaust & afterimages
    player._advDodgeTrailAccum = (player._advDodgeTrailAccum || 0) + dt;
    if (player._advDodgeTrailAccum >= 0.032) {
      player._advDodgeTrailAccum = 0;
      if (dodgeStyle === 'icemage') {
        this.pushHeroDodgeTrail(player, {
          kind: 'ice_track',
          layer: 'back',
          x: player.x - player.facing * 8,
          y: player.groundY - 2,
          w: 32,
          maxLife: 0.36
        });
      } else if (dodgeStyle === 'android') {
        this.pushHeroDodgeTrail(player, {
          kind: 'rocket_exhaust',
          layer: 'back',
          x: player.x - player.facing * 24,
          y: player.y - 108,
          w: 30,
          h: 6,
          color: '#00f0ff',
          maxLife: 0.20
        });
        this.pushHeroDodgeTrail(player, {
          kind: 'rocket_exhaust',
          layer: 'back',
          x: player.x - player.facing * 26,
          y: player.y - 82,
          w: 24,
          h: 5,
          color: '#ff2e93',
          maxLife: 0.18
        });
      } else if (dodgeStyle === 'valkyrie' || dodgeStyle === 'priestess') {
        this.pushHeroDodgeTrail(player, {
          kind: 'feather_mote',
          layer: 'front',
          x: player.x - player.facing * 18,
          y: player.y - 86,
          color: dodgeStyle === 'valkyrie' ? '#fbbf24' : '#fef08a',
          maxLife: 0.30
        });
      } else if (dodgeStyle === 'ronin' || dodgeStyle === 'warrior' || dodgeStyle === 'warrior_ex') {
        this.pushHeroDodgeTrail(player, {
          kind: 'lightning_spark',
          layer: 'front',
          x: player.x - player.facing * 14,
          y: player.groundY - (dodgeStyle === 'ronin' || dodgeStyle === 'warrior_ex' ? 14 : 52),
          w: dodgeStyle === 'warrior_ex' ? 32 : 28,
          color: dodgeStyle === 'ronin' ? '#38bdf8' : '#fde047',
          maxLife: 0.22
        });
      } else if (dodgeStyle === 'titan' || dodgeStyle === 'mage') {
        this.pushHeroDodgeTrail(player, {
          kind: 'magma_tread',
          layer: 'back',
          x: player.x - player.facing * 12,
          y: player.groundY - 2,
          w: 28,
          color: dodgeStyle === 'titan' ? '#f59e0b' : '#fb923c',
          maxLife: 0.28
        });
      } else {
        this.pushHeroDodgeTrail(player, {
          kind: 'streak',
          layer: 'back',
          x: player.x - player.facing * 16,
          y: player.y - 72,
          w: 28,
          h: 4,
          color: dodgeStyle === 'reaper' ? '#a855f7' : dodgeStyle === 'archer' ? '#34d399' : '#2dd4bf',
          maxLife: 0.22
        });
      }
    }

    const gStep = player._advDodgeGhostStep || 0;
    if ((gStep === 0 && u >= 0.24) || (gStep === 1 && u >= 0.58)) {
      player._advDodgeGhostStep = gStep + 1;
      const col = Math.min(28, Math.floor(u * 24) + 4);
      if (heroId === 'valkyrie') {
        player.spawnAfterimage?.(player.x, player.y, player.facing, 4, 4 + Math.min(7, Math.floor(u * 7)), 0.18);
      } else if (heroId === 'archer') {
        player.spawnAfterimage?.(player.x, player.y, player.facing, 8, 4 + Math.min(20, Math.floor(u * 20)), 0.18);
      } else if (dodgeStyle === 'mage' && typeof player.spawnSolarEcho === 'function') {
        player.spawnSolarEcho(player._advDodgeFrameOverride, 0.78, 0.20);
      } else if (dodgeStyle === 'chronomancer' && typeof player.spawnTemporalEcho === 'function') {
        player.spawnTemporalEcho(player._advDodgeFrameOverride);
      } else if (dodgeStyle === 'ronin') {
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, col, 0.18, 0);
      } else if (heroId === 'warrior_ex') {
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, col, 0.18, 'gold');
      } else {
        player.spawnAfterimage?.(player.x, player.y, player.facing, 6, col, 0.18);
      }
    }

    // Arrival rift flashes for Blink / Warp / Shadow-Shift champions
    if (!player._advDodgeArrivalDone && u >= 0.82) {
      player._advDodgeArrivalDone = true;
      if (dodgeStyle === 'mage') {
        player.fx?.spawn('arcaneBlinkRift', player.x, player.groundY, {
          light: 1.20,
          extra: { isArrival: true }
        });
      } else if (dodgeStyle === 'chronomancer') {
        player.fx?.spawn('warpPortalPairRift', player.x, player.groundY - 92, {
          flip: player.facing < 0,
          light: 1.20,
          extra: { isArrival: true }
        });
      } else if (dodgeStyle === 'reaper') {
        player.fx?.spawn('companionSummonRiftPortal', player.x, player.groundY - 4, {
          light: 1.16,
          extra: { radius: 24, isCrimson: true, customDuration: 0.24 }
        });
      } else if (dodgeStyle === 'warrior' || dodgeStyle === 'warrior_ex') {
        player.fx?.spawn('blinkTeleportPillar', player.x, player.groundY, {
          maxDuration: 0.20,
          light: 1.14,
          extra: { width: 20, height: 126 }
        });
      }
    }

    this.skillSets.beginPlayerStep(dt, player, null, true, player._advPureDodgeDirZ || 0);
    player.update(dt, null, this.game);
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY - liftY;

    if (player._advPureDodgeTimer >= dur) {
      this.finishHeroAdventureDodge(player, true);
    }
    return true;
  }

  processPlayerControls(dt, player, target) {
    player.isPlayerControlled = true;
    player.isManualAdventureControl = true;
    player.adventureAutoPlay = this.autoPlay;

    if (this.game.isMatchOver && player.isDead) {
      player._grabbedByBoss = false;
      player._grabbedByBossTimer = 0;
      player._advPureDodge = false;
      player._advDodgeFrameOverride = null;
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      player.manualMoveAxis = 0;
      if (Number.isFinite(player.groundY) && player.y < player.groundY) {
        player.y = player.groundY;
        player.vy = 0;
      }
      player.update(dt, null, this.game);
      return;
    }

    if (this.queuedActionTimer > 0) {
      this.queuedActionTimer = Math.max(0, this.queuedActionTimer - dt);
      if (this.queuedActionTimer <= 0) {
        this.queuedAction = null;
      }
    }

    if (player.state === 'AUTO_ATTACK') {
      this.comboResetTimer = 1.85;
    } else if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
      if (this.comboResetTimer <= 0) {
        this._comboLockTarget = null;
        if (player.hasHackAndSlashCombo?.()) {
          player.comboStep = 0;
        }
      }
    }

    if (!this.autoPlay) {
      if (this.manualTargetLock) {
        target = this.getActiveLockedMonster(player);
      } else {
        this.lockedMonster = null;
        this._comboLockTarget = null;
        target = null;
      }
    }

    if (
      this._comboLockTarget &&
      (this._comboLockTarget.isDead ||
        (this.game?.fighters && !this.game.fighters.includes(this._comboLockTarget)))
    ) {
      this._comboLockTarget = null;
    }

    const stickyLockMaxX = (player.getHackAndSlashLockRange?.() || 275) + 45;
    if (
      (this.autoPlay || this.manualTargetLock) &&
      player.hasHackAndSlashCombo?.() &&
      (player.comboStep || 0) !== 0 &&
      (this.comboResetTimer || 0) > 0 &&
      this._comboLockTarget &&
      !this._comboLockTarget.isDead &&
      Math.abs(this._comboLockTarget.x - player.x) <= stickyLockMaxX &&
      (this._comboLockTarget.isColossalBoss ||
        Math.abs(
          (this._comboLockTarget.groundY || this._comboLockTarget.y) -
            (player.groundY || player.y)
        ) <= 92)
    ) {
      target = this._comboLockTarget;
    }

    const stats = this.progression.getComputedStats();

    // Lock manual/auto steering & queued skills while hoisted inside Behemoth Malphas's Siege Grab!
    if (player._grabbedByBoss && (player._grabbedByBossTimer || 0) > 0) {
      player._grabbedByBossTimer = Math.max(0, player._grabbedByBossTimer - dt);
      this.queuedAction = null;
      this.queuedActionTimer = 0;
      player._advVaultVelZ = 0;
      player.manualMoveAxis = 0;
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      this.smoothVelX = 0;
      this.smoothVelY = 0;
      if (player._grabbedByBossTimer <= 0) {
        player._grabbedByBoss = false;
        player.y = player.groundY;
      }
      player.update(dt, target, this.game);
      this.progression.syncGaugesToPlayer(player);
      return;
    }

    // =========================================================================
    // OPTIONAL AUTO-PLAY AI: 2.5D CURVED TACTICAL NAVIGATOR & ANTI-STUCK ORBIT
    // =========================================================================
    if (this.autoPlay) {
      player._advVaultVelZ = 0;
      player.manualMoveAxis = 0;
      if ((player._advSideHoldTimer || 0) > 0) {
        player._advSideHoldTimer = Math.max(0, player._advSideHoldTimer - dt);
      }

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

      // 0. Advance active Bespoke 11-Hero Pure 3D Evade Dash smoothly during Auto-Play
      if (player._advPureDodge) {
        if (this.updateHeroAdventureDodge(dt, player)) {
          this.progression.syncGaugesToPlayer(player);
          return;
        }
      }

      const colossalAlive = Boolean(
        this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
      );
      const minWalkX = colossalAlive ? (this.lockActive ? this.lockMinX : 8380) : this.lockActive ? this.lockMinX : 80;
      const maxWalkX = colossalAlive
        ? ADVENTURE_BOSS_MAX_WALK_X
        : this.lockActive
          ? this.lockMaxX
          : ADVENTURE_WORLD_WIDTH - 80;
      const depthMin = (this.depthMinY || ADVENTURE_DEPTH_MIN_Y) + 12;
      const depthMax = (this.depthMaxY || ADVENTURE_DEPTH_MAX_Y) - 12;
      const pGy = Number.isFinite(player.groundY) ? player.groundY : ADVENTURE_DEPTH_MID_Y;
      const aiClock = (this.goBlinkTimer || 0) + (this.game?.renderer?.time || 0) * 0.35;
      const hid = player.heroId || '';
      const isRangedEx =
        hid === 'mage_ex' ||
        hid === 'priestess_ex' ||
        hid === 'icemage_ex' ||
        hid === 'valkyrie_ex' ||
        hid === 'archer_ex';
      const rawEffRange = player.getEffectiveAttackRange
        ? player.getEffectiveAttackRange()
        : player.attackRange || 180;
      const isRangedHero =
        isRangedEx ||
        ['mage', 'priestess', 'icemage', 'valkyrie', 'archer'].includes(hid) ||
        rawEffRange >= 290;
      const effRange = isRangedEx
        ? Math.max(510, rawEffRange)
        : isRangedHero
          ? Math.max(385, rawEffRange)
          : rawEffRange;
      const isRanged = isRangedHero;
      const maxAutoVx = 268 * stats.moveSpeedMult;
      const maxAutoVz = 164 * stats.moveSpeedMult;

      // 1. Scan 2.5D Floor Telegraphs, Colossal Boss Sweeps/Slams & Incoming Projectiles
      let avoidVx = 0;
      let avoidVz = 0;
      let imminentEvade = null;
      const fighters = this.game?.fighters || [];
      for (let i = 0; i < fighters.length; i++) {
        const m = fighters[i];
        if (!m || m.team !== 2 || m.isDead) continue;
        if (Array.isArray(m.telegraphRings)) {
          for (let j = 0; j < m.telegraphRings.length; j++) {
            const r = m.telegraphRings[j];
            const rx = Math.max(54, (r.radius || 72) + 28);
            const rz = Math.max(46, (r.radius || 72) * 0.68 + 18);
            const nx = (player.x - r.x) / rx;
            const nz = (pGy - r.y) / rz;
            const nd = Math.hypot(nx, nz);
            if (nd < 1.18) {
              const escZ =
                pGy <= r.y
                  ? r.y - rz < depthMin + 14
                    ? 1
                    : -1
                  : r.y + rz > depthMax - 14
                    ? -1
                    : 1;
              const escX =
                player.x <= r.x
                  ? player.x < minWalkX + 95
                    ? 0.85
                    : -0.85
                  : player.x > maxWalkX - 95
                    ? -0.85
                    : 0.85;
              const urgency = 1.22 - nd;
              avoidVx += escX * 260 * urgency;
              avoidVz += escZ * 215 * urgency;
              if (nd < 0.92 && (r.timer || 0) <= 0.44) {
                imminentEvade = { dirX: escX, dirZ: escZ };
              }
            }
          }
        }
        if (m.isColossalBoss) {
          const laneGy =
            m.rakeWarnOnly || m.rakeActive
              ? m.rakeLaneGy || 561
              : m.grabWarnOnly || m.grabActive || m.bossAction === 'claw_grab'
                ? m.grabLaneGy || 561
                : m.bossAction === 'claw_sweep'
                  ? m.sweepLane === 'upper'
                    ? 504
                    : 620
                  : null;
          if (laneGy !== null && Math.abs(pGy - laneGy) < 68) {
            const safeGy = laneGy <= ADVENTURE_DEPTH_MID_Y ? 638 : 484;
            const dirZ = safeGy >= pGy ? 1 : -1;
            avoidVz += dirZ * 260;
            if (Math.abs(pGy - laneGy) < 48) {
              imminentEvade = { dirX: -0.35, dirZ };
            }
          }
          if (m.fistVisible) {
            const sdx = player.x - (m.slamTargetX || 8920);
            const sdz = pGy - (m.slamTargetGy || 561);
            if (Math.abs(sdx) < 155 && Math.abs(sdz) < 76) {
              const escZ = (m.slamTargetGy || 561) <= ADVENTURE_DEPTH_MID_Y ? 1 : -1;
              const escX = (m.slamTargetX || 8920) > (minWalkX + maxWalkX) * 0.5 ? -0.75 : 0.75;
              avoidVx += escX * 250;
              avoidVz += escZ * 230;
              if (Math.abs(sdx) < 112 && Math.abs(sdz) < 54) {
                imminentEvade = { dirX: escX, dirZ: escZ };
              }
            }
          }
        }
      }

      const projs = this.game?.vfx?.projectiles;
      if (Array.isArray(projs)) {
        for (let i = 0; i < projs.length; i++) {
          const p = projs[i];
          if (!p || !p.owner || p.owner.team !== 2) continue;
          const pGyProj = Number.isFinite(p.owner.groundY) ? p.owner.groundY : p.y;
          const dxP = player.x - p.x;
          if (dxP * (p.vx || 0) > 0 && Math.abs(dxP) < 230 && Math.abs(pGy - pGyProj) < 58) {
            const dodgeLaneZ = pGyProj <= ADVENTURE_DEPTH_MID_Y ? 1 : -1;
            avoidVz += dodgeLaneZ * 215;
            if (Math.abs(dxP) < 120) {
              imminentEvade = { dirX: 0.2, dirZ: dodgeLaneZ };
            }
          }
        }
      }

      // Reactive Bespoke 11-Champion Pure 3D Evade Dash out of imminent floor telegraphs / incoming fire
      if (
        imminentEvade &&
        !this.game.isMatchOver &&
        !player.isDead &&
        !(player.stunTimer > 0) &&
        !player.isRooted &&
        player.dodgeCooldown <= 0 &&
        (player.state === 'IDLE' || player.state === 'WALK' || player.state === 'AUTO_ATTACK')
      ) {
        const mag = Math.hypot(imminentEvade.dirX, imminentEvade.dirZ) || 1;
        const evX = imminentEvade.dirX / mag;
        const evZ = imminentEvade.dirZ / mag;
        this.startHeroAdventureDodge(player, evX, evZ, stats);
        this.progression.syncGaugesToPlayer(player);
        return;
      }

      // Shared 2.5D Curved Steering + Stuck-Progress Watchdog
      const applyCurvedAutoSteer = (rawGoalX, rawGoalGy, stopDist = 18, faceOverride = null) => {
        const clampedGoalX = Math.max(minWalkX + 18, Math.min(maxWalkX - 18, rawGoalX));
        const clampedGoalGy = Math.max(depthMin, Math.min(depthMax, rawGoalGy));
        const dxGoal = clampedGoalX - player.x;
        const dzGoal = clampedGoalGy - pGy;
        const distGoal = Math.hypot(dxGoal, dzGoal * 1.25);
        const hasAvoid = Math.hypot(avoidVx, avoidVz) > 16;
        const wantMove = distGoal > stopDist || hasAvoid || (player._advAiUnstickTimer || 0) > 0;

        if (!Number.isFinite(player._advAiLastX)) {
          player._advAiLastX = player.x;
          player._advAiLastGy = pGy;
        }
        const moved25D = Math.hypot(
          player.x - player._advAiLastX,
          (pGy - player._advAiLastGy) * 1.3
        );
        player._advAiLastX = player.x;
        player._advAiLastGy = pGy;

        if (wantMove) {
          if (moved25D < Math.max(0.45, 50 * dt)) {
            player._advAiStuckTimer = (player._advAiStuckTimer || 0) + dt;
          } else {
            player._advAiStuckTimer = Math.max(0, (player._advAiStuckTimer || 0) - dt * 2.2);
          }
          if ((player._advAiStuckTimer || 0) >= 0.24) {
            player._advAiStuckTimer = 0;
            player._advSideHoldTimer = 0;
            const targetInsideEffRange = Boolean(
              target &&
                !target.isDead &&
                (target.isColossalBoss
                  ? isRanged
                    ? player.x >= 8480
                    : player.x >= 9145
                  : Math.abs(target.x - player.x) <= effRange * 0.98)
            );
            if (targetInsideEffRange) {
              const tgtGy = target.isColossalBoss
                ? pGy
                : Number.isFinite(target.groundY)
                  ? target.groundY
                  : ADVENTURE_DEPTH_MID_Y;
              const curDz = Math.abs(tgtGy - pGy);
              player._advAiUnstickTimer = 0;
              if (!target.isColossalBoss && curDz > (isRanged ? 96 : 46)) {
                this.shiftEntityDepth(player, Math.sign(tgtGy - pGy) * Math.min(curDz, maxAutoVz * dt * 2.0));
              }
              player._advAiVelX = 0;
              player._advAiVelZ = 0;
              player._manualWalkActive = false;
              player._manualSpeedRatio = 0;
              player.moveDir = 0;
              player.state = 'IDLE';
              player.facing = target.x >= player.x ? 1 : -1;
              return false;
            }
            player._advAiUnstickTimer = 0.44;
            player._advAiUnstickDirX = player.x < (minWalkX + maxWalkX) * 0.5 ? 1 : -1;
            player._advAiUnstickDirZ = pGy > ADVENTURE_DEPTH_MID_Y ? -1 : 1;
          }
        } else {
          player._advAiStuckTimer = 0;
        }

        let desiredVx = 0;
        let desiredVz = 0;
        if (distGoal > stopDist) {
          const inv = 1 / Math.max(1, Math.hypot(dxGoal, dzGoal));
          const ramp = Math.min(1, distGoal / Math.max(24, stopDist * 2.1));
          desiredVx = dxGoal * inv * maxAutoVx * ramp;
          desiredVz = dzGoal * inv * maxAutoVz * ramp;
        }
        desiredVx += avoidVx;
        desiredVz += avoidVz;

        if ((player._advAiUnstickTimer || 0) > 0) {
          player._advAiUnstickTimer = Math.max(0, player._advAiUnstickTimer - dt);
          desiredVx = desiredVx * 0.25 + (player._advAiUnstickDirX || 1) * maxAutoVx * 1.05;
          desiredVz = desiredVz * 0.25 + (player._advAiUnstickDirZ || 1) * maxAutoVz * 0.98;
        }

        const magCheck = Math.hypot(
          desiredVx / Math.max(1, maxAutoVx),
          desiredVz / Math.max(1, maxAutoVz)
        );
        if (magCheck > 1.18) {
          desiredVx *= 1.18 / magCheck;
          desiredVz *= 1.18 / magCheck;
        }

        const smoothK = Math.min(1, dt * (wantMove ? 15 : 22));
        player._advAiVelX = (player._advAiVelX || 0) + (desiredVx - (player._advAiVelX || 0)) * smoothK;
        player._advAiVelZ = (player._advAiVelZ || 0) + (desiredVz - (player._advAiVelZ || 0)) * smoothK;

        if (wantMove && Math.hypot(player._advAiVelX, player._advAiVelZ) > 6) {
          player.x = Math.max(minWalkX, Math.min(maxWalkX, player.x + player._advAiVelX * dt));
          this.shiftEntityDepth(player, player._advAiVelZ * dt);
          player._manualWalkActive = true;
          player._manualSpeedRatio = Math.max(
            0.36,
            Math.min(
              1.18,
              Math.hypot(
                player._advAiVelX / Math.max(1, maxAutoVx),
                player._advAiVelZ / Math.max(1, maxAutoVz)
              )
            )
          );
          player.moveDir = 1;
          player.state = 'WALK';
          if (faceOverride !== null) {
            player.facing = faceOverride;
          } else if (Math.abs(player._advAiVelX) > 12) {
            player.facing = player._advAiVelX >= 0 ? 1 : -1;
          }
          return true;
        }

        player._advAiVelX = 0;
        player._advAiVelZ = 0;
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
        player.moveDir = 0;
        player.state = 'IDLE';
        if (faceOverride !== null) {
          player.facing = faceOverride;
        }
        return false;
      };

      // 2. Non-Combat / Between-Wave Curved Navigation (Unlocked March, Pickups & Wave-Lock Standby)
      if (!target && !this.game.isMatchOver) {
        if (!player.isDead && !(player.stunTimer > 0) && !player.isRooted && (player.state === 'IDLE' || player.state === 'WALK')) {
          const reachablePickup = this.pickups.find(
            (pk) => pk && pk.x >= minWalkX - 18 && pk.x <= maxWalkX + 18
          );
          if (reachablePickup) {
            const pkGy = Number.isFinite(reachablePickup.groundY)
              ? reachablePickup.groundY
              : ADVENTURE_DEPTH_MID_Y;
            const arcBlend = Math.max(
              0,
              Math.min(1, (Math.abs(reachablePickup.x - player.x) - 42) / 150)
            );
            const curveGy = pkGy + Math.sin(aiClock * 2.5) * 24 * arcBlend;
            applyCurvedAutoSteer(reachablePickup.x, curveGy, 16, null);
          } else if (this.bossSpawnPending) {
            const entryX = isRanged ? 8840 : 9165;
            const entryGy = ADVENTURE_DEPTH_MID_Y + Math.sin(aiClock * 1.9) * 32;
            applyCurvedAutoSteer(entryX, entryGy, 28, 1);
          } else if (this.lockActive) {
            const midLockX = minWalkX + (maxWalkX - minWalkX) * 0.5;
            const weaveGy = ADVENTURE_DEPTH_MID_Y + Math.sin(aiClock * 2.0) * 36;
            applyCurvedAutoSteer(midLockX, weaveGy, 28, 1);
          } else {
            const marchX = ADVENTURE_WORLD_WIDTH - 220;
            const marchGy =
              ADVENTURE_DEPTH_MID_Y + Math.sin(player.x * 0.0058 + aiClock * 0.85) * 48;
            applyCurvedAutoSteer(marchX, marchGy, 22, 1);
          }
        } else {
          player._manualWalkActive = false;
          player._manualSpeedRatio = 0;
        }
        const normVz = Math.max(-1, Math.min(1, (player._advAiVelZ || 0) / Math.max(1, maxAutoVz)));
        this.skillSets.beginPlayerStep(dt, player, null, Boolean(player._manualWalkActive), normVz);
        player.update(dt, null, this.game);
        this.progression.syncGaugesToPlayer(player);
        return;
      }

      // 3. Active 2.5D Combat: Curved Standoff, Corner-Escape Orbit & True 2.5D Hit-Window Gating
      let isMovingCombat = false;
      if (target && !this.game.isMatchOver && !player.isDead && !(player.stunTimer > 0) && !player.isRooted) {
        const targetGy = target.isColossalBoss
          ? pGy
          : Number.isFinite(target.groundY)
            ? target.groundY
            : ADVENTURE_DEPTH_MID_Y;
        const dxToTarget = target.x - player.x;
        const absDx = Math.abs(dxToTarget);
        const absDz = target.isColossalBoss ? 0 : Math.abs(targetGy - pGy);
        const isHackSlash = Boolean(player.hasHackAndSlashCombo?.());
        const autoChainMaxDx = player.isHackAndSlashCaster?.() ? 475 : 210;
        const midHackChain =
          isHackSlash &&
          (player.comboStep || 0) !== 0 &&
          (this.comboResetTimer || 0) > 0 &&
          (target.isColossalBoss ? player.x >= 8480 : absDx <= autoChainMaxDx && absDz <= 78);

        if (player.state === 'IDLE' || player.state === 'WALK') {
          if (
            player.hasTrueUltimate &&
            this.progression.astralCharge >= 99.9 &&
            typeof player.updateTrueUltimate === 'function'
          ) {
            player._manualWalkActive = false;
            player._manualSpeedRatio = 0;
            player.facing = target.x >= player.x ? 1 : -1;
            this.progression.astralCharge = 0;
            this.progression.syncGaugesToPlayer(player);
            if (player.stats) player.stats.ultsUsed++;
            player.setState('TRUE_ULTIMATE');
            this.game.triggerTrueUltimateCinematic(player);
          } else if (
            this.progression.ultCharge >= 99.9 &&
            (target.isColossalBoss || (absDx <= Math.max(360, effRange * 1.35) && absDz <= 115))
          ) {
            player._manualWalkActive = false;
            player._manualSpeedRatio = 0;
            player.facing = target.x >= player.x ? 1 : -1;
            this.progression.ultCharge = 0;
            this.progression.gainAstralRelic(
              stats.ultResonanceAstral,
              player,
              'ECLIPSE SEAL RESONANCE!'
            );
            this.progression.syncGaugesToPlayer(player);
            if (player.stats) player.stats.ultsUsed++;
            player.setState('ULTIMATE');
            this.game.triggerUltimateCinematic(player);
          } else if (
            !midHackChain &&
            player.skillCooldown <= 0 &&
            (target.isColossalBoss ||
              (absDx <= Math.max(255, effRange * 1.45) && absDz <= (isRanged ? 96 : 74))) &&
            this.progression.trySpendSkillSpirit()
          ) {
            player._manualWalkActive = false;
            player._manualSpeedRatio = 0;
            player.facing = target.x >= player.x ? 1 : -1;
            this.skillCdMax = Math.max(0.5, player.skillMaxCooldown * 0.78);
            player.skillCooldown = this.skillCdMax;
            if (player.stats) player.stats.skillsUsed++;
            player.setState('SKILL');
          } else if (
            player.autoCooldown <= 0 &&
            (midHackChain || Math.hypot(avoidVx, avoidVz) < 235) &&
            (target.isColossalBoss
              ? isRanged
                ? player.x >= 8480
                : player.x >= 9145
              : absDx <= (midHackChain ? Math.max(effRange, autoChainMaxDx) : effRange * 0.98) &&
                absDz <= (midHackChain ? 82 : isRanged ? 96 : 46))
          ) {
            player._manualWalkActive = false;
            player._manualSpeedRatio = 0;
            player.facing = target.x >= player.x ? 1 : -1;
            this._comboLockTarget = target;
            this.comboResetTimer = 1.85;
            player.setState('AUTO_ATTACK');
            if (isHackSlash) {
              if ((player.comboStep || 0) !== 0) {
                this.autoCdMax = 0.36;
                player.autoCooldown = player.heroId?.endsWith('_ex') ? 0.015 : 0.03;
              } else {
                this.autoCdMax = 0.62;
                player.autoCooldown = 0.62;
                this._comboLockTarget = null;
              }
            } else {
              this.autoCdMax = player.autoInterval || 0.44;
              player.autoCooldown = this.autoCdMax;
            }
          } else if (midHackChain) {
            player._manualWalkActive = false;
            player._manualSpeedRatio = 0;
          } else if (
            isRanged &&
            !target.isColossalBoss &&
            absDx < 125 &&
            player.dodgeCooldown <= 0
          ) {
            const awayDir = player.x >= target.x ? 1 : -1;
            const awayRoom = awayDir > 0 ? maxWalkX - player.x : player.x - minWalkX;
            const openEscDir =
              awayRoom >= 145
                ? awayDir
                : maxWalkX - player.x >= player.x - minWalkX
                  ? 1
                  : -1;
            const escZ = pGy > ADVENTURE_DEPTH_MID_Y ? -0.45 : 0.45;
            const mag = Math.hypot(openEscDir, escZ) || 1;
            this.startHeroAdventureDodge(player, openEscDir / mag, escZ / mag, stats);
            this.progression.syncGaugesToPlayer(player);
            return;
          } else if (target.isColossalBoss) {
            const bossGoalX = player.isHackAndSlashCaster?.()
              ? 8895 + Math.sin(aiClock * 1.4) * 55
              : isRanged
                ? 8865 + Math.sin(aiClock * 1.35) * 65
                : 9226 + Math.sin(aiClock * 1.7) * 16;
            let bossGoalGy = ADVENTURE_DEPTH_MID_Y + Math.sin(aiClock * 1.65) * 44;
            if (target.rakeWarnOnly || target.rakeActive) {
              bossGoalGy = (target.rakeLaneGy || 561) <= ADVENTURE_DEPTH_MID_Y ? 638 : 484;
            } else if (target.grabWarnOnly || target.grabActive || target.bossAction === 'claw_grab') {
              bossGoalGy = (target.grabLaneGy || 561) <= ADVENTURE_DEPTH_MID_Y ? 640 : 482;
            } else if (target.bossAction === 'claw_sweep') {
              bossGoalGy = target.sweepLane === 'upper' ? 636 : 484;
            } else if (target.fistVisible && Math.abs((target.slamTargetGy || 561) - pGy) < 76) {
              bossGoalGy = (target.slamTargetGy || 561) <= ADVENTURE_DEPTH_MID_Y ? 640 : 482;
            }
            isMovingCombat = applyCurvedAutoSteer(bossGoalX, bossGoalGy, 20, 1);
          } else {
            const idealDistX = Math.min(
              effRange * 0.80,
              isRangedEx
                ? 335
                : isRanged
                  ? 295
                  : Math.max(82, Math.min(132, effRange * 0.68))
            );
            const leftSlot = target.x - idealDistX;
            const rightSlot = target.x + idealDistX;
            const wallMargin = isRanged ? 72 : 40;
            const leftValid = leftSlot >= minWalkX + wallMargin;
            const rightValid = rightSlot <= maxWalkX - wallMargin;

            let candRightSide = player.x > target.x;
            if (leftValid && !rightValid) {
              candRightSide = false;
            } else if (!leftValid && rightValid) {
              candRightSide = true;
            } else if (!leftValid && !rightValid) {
              candRightSide = maxWalkX - target.x >= target.x - minWalkX;
            } else if (isRanged && absDx < 165) {
              if (player.x < minWalkX + 92) candRightSide = true;
              else if (player.x > maxWalkX - 92) candRightSide = false;
            }

            const desiredSide = candRightSide ? 'right' : 'left';
            const prevSide = player._advSideChoice;
            const prevSideValid =
              prevSide === 'right' ? rightValid : prevSide === 'left' ? leftValid : false;
            let wantRightSide = candRightSide;
            if (
              prevSide &&
              prevSide !== desiredSide &&
              prevSideValid &&
              (player._advSideHoldTimer || 0) > 0
            ) {
              wantRightSide = prevSide === 'right';
            } else if (prevSide !== desiredSide) {
              player._advSideChoice = desiredSide;
              player._advSideHoldTimer = 0.70;
            }

            const goalX = wantRightSide ? rightSlot : leftSlot;
            const crossingSides =
              (wantRightSide && player.x < target.x + 28) ||
              (!wantRightSide && player.x > target.x - 28);

            const safeZMin = depthMin + 10;
            const safeZMax = depthMax - 10;
            let goalGy = targetGy;
            if (crossingSides) {
              // Curve across the opposite 2.5D depth lane (capped <= 54px) to orbit cleanly past the monster!
              const orbitSign =
                targetGy > ADVENTURE_DEPTH_MID_Y + 12
                  ? -1
                  : targetGy < ADVENTURE_DEPTH_MID_Y - 12
                    ? 1
                    : pGy <= targetGy
                      ? -1
                      : 1;
              goalGy = Math.max(safeZMin, Math.min(safeZMax, targetGy + orbitSign * 54));
            } else {
              const distFromSlot = Math.abs(player.x - goalX);
              const curveBlend = Math.max(0, Math.min(1, (distFromSlot - 30) / 185));
              const flankSign =
                (player.heroId ? player.heroId.charCodeAt(0) : 1) % 2 === 0 ? 1 : -1;
              const rawWeave =
                (Math.sin(aiClock * 2.35) * 24 + flankSign * 16) * curveBlend +
                (isRanged ? Math.sin(aiClock * 1.95) * 18 : 0) * (1 - curveBlend);
              const clampedWeave = Math.max(-24, Math.min(24, rawWeave));
              goalGy = Math.max(safeZMin, Math.min(safeZMax, targetGy + clampedWeave));
            }

            const faceDir =
              crossingSides && Math.abs(goalX - player.x) > 45
                ? goalX >= player.x
                  ? 1
                  : -1
                : target.x >= player.x
                  ? 1
                  : -1;
            isMovingCombat = applyCurvedAutoSteer(goalX, goalGy, isRanged ? 22 : 16, faceDir);
          }
        } else {
          player._manualWalkActive = false;
          player._manualSpeedRatio = 0;
          // Simultaneous Run-and-Cast Kiting Glide during AUTO_ATTACK
          const avoidMag = Math.hypot(avoidVx, avoidVz);
          const rangedKiteActive =
            isRanged &&
            player.state === 'AUTO_ATTACK' &&
            !target.isColossalBoss &&
            (absDx < 225 || avoidMag > 20);
          if (player.state === 'AUTO_ATTACK' && (avoidMag > 20 || rangedKiteActive)) {
            if (player.isHackAndSlashMelee?.()) {
              this.shiftEntityDepth(player, avoidVz * 0.65 * dt);
            } else {
              const awayDir = player.x >= target.x ? 1 : -1;
              const awayRoom = awayDir > 0 ? maxWalkX - player.x : player.x - minWalkX;
              const openDirX =
                awayRoom >= 115
                  ? awayDir
                  : maxWalkX - player.x >= player.x - minWalkX
                    ? 1
                    : -1;
              const nearCorner = player.x < minWalkX + 95 || player.x > maxWalkX - 95;
              const kiteVx =
                rangedKiteActive && absDx < 225
                  ? openDirX * maxAutoVx * (absDx < 155 ? 0.78 : 0.56) + avoidVx * 0.60
                  : avoidVx * 0.65;
              const dzTarget = targetGy - pGy;
              const cornerEscZ = targetGy > ADVENTURE_DEPTH_MID_Y ? -1 : 1;
              const kiteVz =
                avoidMag > 20 && Math.abs(avoidVz) > 16
                  ? avoidVz * 0.72
                  : nearCorner && absDx < 175
                    ? cornerEscZ * maxAutoVz * 0.76
                    : Math.abs(dzTarget) > 14
                      ? Math.sign(dzTarget) * maxAutoVz * 0.52
                      : 0;
              const prevKiteX = player.x;
              player.x = Math.max(minWalkX, Math.min(maxWalkX, player.x + kiteVx * dt));
              const appliedDx = player.x - prevKiteX;
              if (appliedDx !== 0) {
                if (player._hnsState) {
                  player._hnsState.startX += appliedDx;
                  player._hnsState.destX += appliedDx;
                }
                if (Number.isFinite(player._beatStartX)) player._beatStartX += appliedDx;
                if (Number.isFinite(player._beatTargetX)) player._beatTargetX += appliedDx;
              }
              this.shiftEntityDepth(player, kiteVz * dt);
              player.facing = target.x >= player.x ? 1 : -1;
              isMovingCombat = true;
            }
          }
        }
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
      }

      if (player.state !== 'AUTO_ATTACK' || (player.stateTimer || 0) < 0.04) {
        player._advLv1FallbackShot = false;
      }
      const prevDidAction = Boolean(player.didActionFrame);
      const prevProjLen = this.game?.vfx?.projectiles?.length || 0;
      const combatTarget = this.skillSets.resolveTarget(player, target);
      const normAutoVz = Math.max(
        -1,
        Math.min(1, (player._advAiVelZ || 0) / Math.max(1, maxAutoVz))
      );
      this.skillSets.beginPlayerStep(dt, player, combatTarget, isMovingCombat, normAutoVz);
      player.update(dt, combatTarget, this.game);
      let heroAlreadySpawnedProjectile = false;
      const curProjs = this.game?.vfx?.projectiles;
      if (Array.isArray(curProjs) && curProjs.length > prevProjLen) {
        for (let pi = prevProjLen; pi < curProjs.length; pi++) {
          if (curProjs[pi]?.owner === player) {
            heroAlreadySpawnedProjectile = true;
            break;
          }
        }
      }
      if (player.state === 'AUTO_ATTACK' && !prevDidAction && player.didActionFrame) {
        player._advLv1FallbackShot = true;
        this.progression.onPlayerCastBasicAttack(player, combatTarget || target, this.game, {
          heroAlreadySpawnedProjectile
        });
      } else if (
        isRangedEx &&
        player.state === 'AUTO_ATTACK' &&
        !player.didActionFrame &&
        !player._advLv1FallbackShot &&
        (player.stateTimer || 0) >= 0.16
      ) {
        player._advLv1FallbackShot = true;
        this.progression.onPlayerCastBasicAttack(player, combatTarget || target, this.game, {
          heroAlreadySpawnedProjectile
        });
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
    player.manualMoveAxis = rawDirX;
    const isMoving3D = Math.hypot(this.smoothVelX, this.smoothVelY) > 1.2 || Math.hypot(rawDirX, rawDirY) > 0.012;

    // Continuous hold-to-attack on primary thumb orb or [J/Z] — works simultaneously while dragging joystick!
    if (!this.queuedAction && (this.heldAttack || this.uiHeldAttack)) {
      this.queuedAction = 'attack';
      this.queuedActionTimer = 0.58;
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
          player.stateTimer >=
            (player.hasHackAndSlashCombo?.()
              ? (player.autoDuration || 0.44) * 0.72
              : Math.min(0.35, (player.autoDuration || 0.48) * 0.72))));

    const canAct =
      !player.isDead &&
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      !player._advPureDodge &&
      (player.state === 'IDLE' ||
        player.state === 'WALK' ||
        isInstantDodgeCancel ||
        isAttackRecoveryCancel);

    const lockTarget = this.manualTargetLock && target && !target.isDead ? target : null;

    if (canAct && this.queuedAction) {
      const act = this.queuedAction;
      if (
        act === 'ultimate' &&
        player.hasTrueUltimate &&
        this.progression.astralCharge >= 99.9 &&
        typeof player.updateTrueUltimate === 'function'
      ) {
        this.queuedAction = null;
        if (lockTarget) {
          player.facing = lockTarget.x >= player.x ? 1 : -1;
        } else if (moveDirX !== 0) {
          player.facing = moveDirX;
        }
        this.progression.astralCharge = 0;
        this.progression.syncGaugesToPlayer(player);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('TRUE_ULTIMATE');
        this.game.triggerTrueUltimateCinematic(player);
      } else if (act === 'overdrive' && this.progression.ultCharge >= 99.9) {
        this.queuedAction = null;
        if (lockTarget) {
          player.facing = lockTarget.x >= player.x ? 1 : -1;
        } else if (moveDirX !== 0) {
          player.facing = moveDirX;
        }
        this.progression.ultCharge = 0;
        this.progression.gainAstralRelic(
          stats.ultResonanceAstral,
          player,
          'ECLIPSE SEAL RESONANCE!'
        );
        this.progression.syncGaugesToPlayer(player);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('ULTIMATE');
        this.game.triggerUltimateCinematic(player);
      } else if (act === 'skill' && player.skillCooldown <= 0) {
        if (this.progression.trySpendSkillSpirit()) {
          this.queuedAction = null;
          if (lockTarget) {
            player.facing = lockTarget.x >= player.x ? 1 : -1;
          } else if (moveDirX !== 0) {
            player.facing = moveDirX;
          }
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
        // 100% Pure Non-Attacking Bespoke 11-Champion 360° 3D Evade (zero projectiles, zero decoys, zero damage!)
        this.queuedAction = null;
        const inputMag = Math.hypot(rawDirX, rawDirY);
        let evadeX = 0;
        let evadeZ = 0;
        if (inputMag > 0.08) {
          evadeX = rawDirX / inputMag;
          evadeZ = rawDirY / inputMag;
        } else if (
          lockTarget &&
          !lockTarget.isDestructibleProp &&
          Math.abs(lockTarget.x - player.x) < 280
        ) {
          evadeX = player.x <= lockTarget.x ? -1 : 1;
          evadeZ = 0;
        } else {
          evadeX = player.facing || 1;
          evadeZ = 0;
        }
        this.startHeroAdventureDodge(player, evadeX, evadeZ, stats);
      } else if (act === 'attack' && player.autoCooldown <= 0) {
        this.queuedAction = null;
        const isHns = Boolean(player.hasHackAndSlashCombo?.());
        const hnsLockRange = player.getHackAndSlashLockRange?.() || 275;
        if (!this.manualTargetLock) {
          if (moveDirX !== 0) {
            player.facing = moveDirX;
          }
          this._comboLockTarget = null;
        } else {
          const validLockMonster =
            lockTarget &&
            !lockTarget.isDead &&
            !lockTarget.isDestructibleProp &&
            !lockTarget.isDummyFocal;
          const lockableHnsTarget =
            isHns &&
            validLockMonster &&
            (lockTarget.isColossalBoss || Math.abs(lockTarget.x - player.x) <= hnsLockRange);
          if (isHns) {
            if (lockableHnsTarget) {
              player.facing = lockTarget.x >= player.x ? 1 : -1;
              this._comboLockTarget = lockTarget;
            } else if (validLockMonster) {
              player.facing = lockTarget.x >= player.x ? 1 : -1;
              this._comboLockTarget = null;
            } else {
              if (moveDirX !== 0) {
                player.facing = moveDirX;
              }
              this._comboLockTarget = null;
            }
          } else if (lockTarget) {
            player.facing = lockTarget.x >= player.x ? 1 : -1;
            this._comboLockTarget = lockTarget;
          } else if (moveDirX !== 0) {
            player.facing = moveDirX;
          }
        }
        this.comboResetTimer = 1.85;
        player.setState('AUTO_ATTACK');
        if (isHns) {
          if ((player.comboStep || 0) !== 0) {
            this.autoCdMax = 0.34;
            player.autoCooldown = player.heroId?.endsWith('_ex') ? 0.015 : 0.03;
          } else {
            this.autoCdMax = 0.36;
            player.autoCooldown = 0.34;
            this._comboLockTarget = null;
          }
        } else {
          this.autoCdMax = player.autoInterval || 0.44;
          player.autoCooldown = this.autoCdMax;
        }
      } else if (act !== 'attack' && act !== 'dodge' && act !== 'skill' && act !== 'overdrive' && act !== 'ultimate') {
        this.queuedAction = null;
      }
    }

    // Advance Bespoke 11-Champion Pure Non-Attacking 360° 3D Evade Dash when active
    if (player._advPureDodge) {
      if (this.updateHeroAdventureDodge(dt, player)) {
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
        if (player.isHackAndSlashMelee?.()) {
          // Allow smooth 2.5D depth-lane micro-steering while preserving Hack-and-Slash cross-through & 180° turns!
          this.shiftEntityDepth(player, this.smoothVelY * 0.85 * dt);
        } else {
          // Simultaneous Run-and-Cast: glide smoothly along joystick vector!
          player.x += this.smoothVelX * 0.82 * dt;
          this.shiftEntityDepth(player, this.smoothVelY * 0.85 * dt);
          if (lockTarget) {
            player.facing = lockTarget.x >= player.x ? 1 : -1;
          } else if (moveDirX !== 0) {
            player.facing = moveDirX;
          }
        }
      } else {
        player._advVaultVelZ = 0;
      }

      if (player.state !== 'AUTO_ATTACK' || (player.stateTimer || 0) < 0.04) {
        player._advLv1FallbackShot = false;
      }
      const prevDidAction = Boolean(player.didActionFrame);
      const prevProjLen = this.game?.vfx?.projectiles?.length || 0;
      const combatTarget = this.skillSets.resolveTarget(player, lockTarget);
      this.skillSets.beginPlayerStep(dt, player, combatTarget, isMoving3D, rawDirY);
      player.update(dt, combatTarget, this.game);
      let heroAlreadySpawnedProjectile = false;
      const curProjs = this.game?.vfx?.projectiles;
      if (Array.isArray(curProjs) && curProjs.length > prevProjLen) {
        for (let pi = prevProjLen; pi < curProjs.length; pi++) {
          if (curProjs[pi]?.owner === player) {
            heroAlreadySpawnedProjectile = true;
            break;
          }
        }
      }
      if (
        player.state === 'AUTO_ATTACK' &&
        !player.isHackAndSlashMelee?.() &&
        isMoving3D &&
        Math.abs(player.vx) > 8
      ) {
        const isMeleeForwardLunge =
          (player.attackRange || 180) < 300 && player.vx * this.smoothVelX >= -5;
        if (!isMeleeForwardLunge) {
          player.vx *= 0.22;
        }
      }
      const hidManual = player.heroId || '';
      const isRangedExManual =
        hidManual === 'mage_ex' ||
        hidManual === 'priestess_ex' ||
        hidManual === 'icemage_ex' ||
        hidManual === 'valkyrie_ex' ||
        hidManual === 'archer_ex';
      if (player.state === 'AUTO_ATTACK' && !prevDidAction && player.didActionFrame) {
        player._advLv1FallbackShot = true;
        this.progression.onPlayerCastBasicAttack(player, lockTarget || combatTarget, this.game, {
          heroAlreadySpawnedProjectile
        });
      } else if (
        isRangedExManual &&
        player.state === 'AUTO_ATTACK' &&
        !player.didActionFrame &&
        !player._advLv1FallbackShot &&
        (player.stateTimer || 0) >= 0.16
      ) {
        player._advLv1FallbackShot = true;
        this.progression.onPlayerCastBasicAttack(player, lockTarget || combatTarget, this.game, {
          heroAlreadySpawnedProjectile
        });
      }
      this.progression.syncGaugesToPlayer(player);
    }
  }

  getActiveStageBounds() {
    const colossalAlive = Boolean(
      this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
    );
    if (colossalAlive) {
      return { minX: 8380, maxX: ADVENTURE_BOSS_MAX_WALK_X };
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
    const g = this.game;
    const player = g.leftFighter;
    if (this.isSkillTreeOpen) {
      if (g.isMatchOver && player?.isDead) {
        this.closeSkillTree(false);
      } else {
        this.syncControlDeckUI();
        return;
      }
    }
    if (!player) return;

    this.goBlinkTimer += dt;
    this.progression.update(dt, player);
    this.skillSets.update(dt, player);

    // 1. Boss Warning Countdown -> Boil the East Abyssal Throne Rim (`x = 9265..9410`), then Spawn Colossal Behemoth Malphas (`x = 9335`, facing -1 LEFT)!
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer = Math.max(0, this.bossWarningTimer - dt);
      this._bossWarnPulseTimer = (this._bossWarnPulseTimer || 0) - dt;
      if (this._bossWarnPulseTimer <= 0) {
        this._bossWarnPulseTimer = 0.28;
        const gx = 9265 + Math.round(Math.random() * 145);
        g.vfx?.spawnShockwave?.(gx, 628, 125, '#fb923c', 0.30, true);
        g.vfx?.spawnBurst?.(gx, 622, 12, '#fef08a', 215, {
          upBias: 220,
          size: 5.5,
          life: 0.44
        });
        g.renderer?.triggerShake?.(6, 0.14);
      }
      if (this.bossWarningTimer <= 0 && this.bossSpawnPending) {
        this.bossSpawnPending = false;
        const isRangedHero = (player.attackRange || 180) >= 320;
        const bossEntryX = isRangedHero ? 8840 : 9165;
        if (player.x > ADVENTURE_BOSS_MAX_WALK_X) player.x = bossEntryX;
        else if (player.x < 8480) player.x = bossEntryX;
        else if (!isRangedHero && player.x < 9080) player.x = bossEntryX;
        player.facing = 1;
        this.bossEntity = this.spawnMonster('archfiend', ADVENTURE_BOSS_ANCHOR_X, {
          groundY: ADVENTURE_DEPTH_MID_Y
        });
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

    // 3. 8-Wave Clear & 2-SubWave-Per-Realm Progression across 9600px
    if (!g.isMatchOver && !this.bossSpawnPending) {
      const livingMonsters = this.getLivingMonsters();

      if (this.lockActive && livingMonsters.length === 0) {
        if (this.subWave === 1) {
          this.unlockSubWave(this.zoneIndex);
        } else if (this.zoneIndex < 3) {
          this.unlockCurrentZone(this.zoneIndex);
        }
      }

      // Check if player walked across the current zone's midTriggerX (SubWave 2) or next zone's triggerX (SubWave 1)
      if (!this.lockActive) {
        const curZone = ADVENTURE_ZONES[this.zoneIndex];
        if (curZone && this.subWave === 1 && player.x >= curZone.midTriggerX) {
          this.spawnZoneEncounter(this.zoneIndex, 2);
        } else if (this.subWave >= 2 && this.zoneIndex < 3) {
          const nextZone = ADVENTURE_ZONES[this.zoneIndex + 1];
          if (nextZone && player.x >= nextZone.triggerX) {
            this.spawnZoneEncounter(this.zoneIndex + 1, 1);
          }
        }
      }
    }

    // 4. Update Pickups & Dimensional Summoning Portals
    this.updatePickups(dt, player);
    for (let i = this.portals.length - 1; i >= 0; i--) {
      const p = this.portals[i];
      p.age += dt;
      if (p.age >= p.maxLife) {
        this.portals.splice(i, 1);
      }
    }

    // 5. Update Player (Manual or Auto-Play) + Clamp Arena Walk Bounds + Update Active Monsters
    const nearestMonster = this.getNearestLivingMonster(player);
    this.processPlayerControls(dt, player, nearestMonster);

    // Keep player out of the Right-Side Colossal Boss's throne parapet (`x <= 9250` so all melee heroes reach `9335` cleanly!) & inside wave locks!
    const colossalAlive = Boolean(
      this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
    );
    const minWalkX = colossalAlive
      ? this.lockActive
        ? this.lockMinX
        : 8380
      : this.lockActive
        ? this.lockMinX
        : 80;
    const maxWalkX = colossalAlive
      ? ADVENTURE_BOSS_MAX_WALK_X
      : this.lockActive
        ? this.lockMaxX
        : ADVENTURE_WORLD_WIDTH - 80;
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

    // 6. Update Interactive 2.5D Destructible Terrain, Reliquaries & Ancient Artifacts
    this.destructibles.update(dt, player, g);

    this.syncRightHUD();
    this.syncControlDeckUI();
  }

  getStandingProps() {
    return this.active && this.destructibles ? this.destructibles.getStandingProps() : [];
  }

  renderWorldFloor(ctx, renderer) {
    if (!this.active || !ctx) return;
    const t = renderer?.time || 0;
    const roadTop = 438;
    const roadBot = 684;

    // -1. Render Destructible Prop Contact Shadows & Shattered Rubble Bases on Causeway Floor
    this.destructibles?.renderRubbleAndShadows(ctx, renderer);

    // -0.5. Render Dimensional Summoning Portal 2.5D Foreshortened Ground Rune Seals (`advFxSheet` Row 4 Cols 4..7)
    if (this.portals.length > 0) {
      const assets = PixelForge.initAssets();
      const fxSheet = PixelForge.ensureImage?.(assets?.advFxSheet) || assets?.advFxSheet;
      const fxReady =
        Boolean(fxSheet) &&
        (typeof HTMLImageElement === 'undefined' ||
          !(fxSheet instanceof HTMLImageElement) ||
          (fxSheet.complete && fxSheet.naturalWidth > 0));

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const pHasBounds = Boolean(
        renderer && Number.isFinite(renderer.camX) && Number.isFinite(renderer.width) && renderer.width > 0
      );
      const pHalfSpan = pHasBounds
        ? (renderer.width * 0.5) / Math.max(0.1, renderer.zoom || 1) + 260
        : Infinity;
      for (const p of this.portals) {
        if (pHasBounds && Math.abs(p.x - renderer.camX) > pHalfSpan) continue;
        const u = Math.max(0, Math.min(1, p.age / p.maxLife));
        const openScale = p.age < 0.22 ? 0.35 + 0.65 * (p.age / 0.22) : u > 0.75 ? 1 - 0.55 * ((u - 0.75) / 0.25) : 1;
        const alpha = p.age < 0.14 ? p.age / 0.14 : u > 0.72 ? (1 - u) / 0.28 : 1;
        if (alpha <= 0.01) continue;

        const px = Math.round(p.x);
        const py = Math.round(p.groundY);
        const sealW = Math.round((p.isElite ? 196 : 176) * openScale);
        const sealH = Math.round((p.isElite ? 82 : 74) * openScale);
        const z = Math.max(0, Math.min(3, p.zone | 0));

        const glowTex = renderer?.getGlowForColor
          ? renderer.getGlowForColor(p.primaryColor)
          : renderer?.glowCyan;
        if (glowTex) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.16, 0.15 * alpha);
          ctx.drawImage(glowTex, Math.round(px - sealW * 0.55), Math.round(py - sealH * 0.55), Math.round(sealW * 1.1), Math.round(sealH * 1.1));
          ctx.restore();
        }

        ctx.globalAlpha = Math.min(0.92, alpha);
        if (fxReady && sealW >= 8 && sealH >= 6) {
          ctx.drawImage(
            fxSheet,
            (4 + z) * 128,
            512,
            128,
            128,
            Math.round(px - sealW * 0.5),
            Math.round(py - sealH * 0.5),
            sealW,
            sealH
          );
        } else {
          ctx.fillStyle = p.primaryColor || '#38bdf8';
          ctx.fillRect(Math.round(px - sealW * 0.4), py - 4, Math.round(sealW * 0.8), 8);
        }
      }
      ctx.restore();
    }

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

    // 3. Render Generated & Pixel-Converted HD-2D 3D RPG Pickups (`Solar Elixir +HP`, `Soul Ember +NOVA`, `Astral Relic +SEAL`)
    if (this.pickups.length > 0) {
      const assets = PixelForge.initAssets();
      const propsSheet = PixelForge.ensureImage?.(assets?.advPropsSheet) || assets?.advPropsSheet;
      const sheetReady =
        Boolean(propsSheet) &&
        (typeof HTMLImageElement === 'undefined' ||
          !(propsSheet instanceof HTMLImageElement) ||
          (propsSheet.complete && propsSheet.naturalWidth > 0));

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const pkHasBounds = Boolean(
        renderer && Number.isFinite(renderer.camX) && Number.isFinite(renderer.width) && renderer.width > 0
      );
      const pkHalfSpan = pkHasBounds
        ? (renderer.width * 0.5) / Math.max(0.1, renderer.zoom || 1) + 220
        : Infinity;
      const sortedPickups =
        this.pickups.length > 1
          ? [...this.pickups].sort(
              (a, b) => (a.groundY || a.y || 561) - (b.groundY || b.y || 561)
            )
          : this.pickups;
      for (const pk of sortedPickups) {
        if (pkHasBounds && Math.abs(pk.x - renderer.camX) > pkHalfSpan) continue;
        const pkGy = Math.round(Number.isFinite(pk.groundY) ? pk.groundY : pk.y);
        const bob = Math.round(Math.sin(t * 5.2 + pk.x * 0.03) * 6);
        const px = Math.round(pk.x);
        const py = Math.round(pk.y - 28 + bob);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.fillRect(px - 16, pkGy - 4, 32, 6);

        const isHp = pk.type === 'hp';
        const isEmber = pk.type === 'ember' || pk.type === 'mana';
        const colCore = isHp ? '#bbf7d0' : isEmber ? '#fef08a' : '#ecfeff';
        const tag = isHp ? '+HP' : isEmber ? '+EMBER' : '+SEAL';
        const baseCol = isHp ? 0 : isEmber ? 2 : 4;
        const gleam = Math.floor(t * 4.2 + pk.x * 0.05) % 2;

        // Subtle <= 0.15 floor & aura glow
        const glowTex = isHp
          ? renderer?.glowEmerald || renderer?.glowCyan
          : isEmber
            ? renderer?.glowOrange
            : renderer?.glowCyan;
        if (glowTex) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.15;
          ctx.drawImage(glowTex, px - 34, py - 34, 68, 68);
          ctx.restore();
        }

        if (sheetReady) {
          ctx.drawImage(
            propsSheet,
            (baseCol + gleam) * 128,
            512,
            128,
            128,
            px - 32,
            py - 32,
            64,
            64
          );
        } else {
          const colMain = isHp ? '#22c55e' : isEmber ? '#fb923c' : '#38bdf8';
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(px - 12, py - 12, 24, 24);
          ctx.fillStyle = colMain;
          ctx.fillRect(px - 10, py - 10, 20, 20);
        }

        ctx.font = '8px "ArcanePixel", "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#05070e';
        ctx.fillText(tag, px + 1, py - 27);
        ctx.fillStyle = colCore;
        ctx.fillText(tag, px, py - 28);
      }
      ctx.restore();
    }
  }

  renderWorldMid(ctx, renderer) {
    if (!this.active || !ctx) return;

    // Render Standing Biome-Matched HD-2D Dimensional Summoning Portals BEHIND emerging Realm enemies (`advFxSheet` Rows 0..3 Cols 0..3)
    if (this.portals.length > 0) {
      const assets = PixelForge.initAssets();
      const fxSheet = PixelForge.ensureImage?.(assets?.advFxSheet) || assets?.advFxSheet;
      const fxReady =
        Boolean(fxSheet) &&
        (typeof HTMLImageElement === 'undefined' ||
          !(fxSheet instanceof HTMLImageElement) ||
          (fxSheet.complete && fxSheet.naturalWidth > 0));

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const pHasBounds = Boolean(
        renderer && Number.isFinite(renderer.camX) && Number.isFinite(renderer.width) && renderer.width > 0
      );
      const pHalfSpan = pHasBounds
        ? (renderer.width * 0.5) / Math.max(0.1, renderer.zoom || 1) + 260
        : Infinity;
      const sortedPortals =
        this.portals.length > 1
          ? [...this.portals].sort((a, b) => (a.groundY || 561) - (b.groundY || 561))
          : this.portals;

      for (const p of sortedPortals) {
        if (pHasBounds && Math.abs(p.x - renderer.camX) > pHalfSpan) continue;
        const u = Math.max(0, Math.min(1, p.age / p.maxLife));
        let scaleX = 1.0;
        let scaleY = 1.0;
        let alpha = 1.0;

        if (p.age < 0.20) {
          const k = p.age / 0.20;
          const ease = 1 - Math.pow(1 - k, 3);
          scaleX = 0.16 + 0.88 * ease;
          scaleY = 0.76 + 0.26 * ease;
          alpha = Math.min(1, k * 1.4);
        } else if (u < 0.74) {
          const pulse = Math.sin(p.age * 12.0 + p.seed);
          scaleX = 1.0 + 0.035 * pulse;
          scaleY = 1.0 - 0.02 * pulse;
          alpha = 1.0;
        } else {
          const k = (u - 0.74) / 0.26;
          scaleX = Math.max(0.10, 1 - 0.88 * k * k);
          scaleY = 1.0 + 0.10 * k;
          alpha = Math.max(0, 1 - k);
        }
        if (alpha <= 0.01) continue;

        const px = Math.round(p.x);
        const py = Math.round(p.groundY + 6);
        const baseW = p.isElite ? 214 : 196;
        const baseH = p.isElite ? 224 : 206;
        const dw = Math.max(8, Math.round(baseW * scaleX));
        const dh = Math.max(16, Math.round(baseH * scaleY));
        const dx = Math.round(px - dw * 0.5);
        const dy = Math.round(py - (122 / 128) * dh);
        const z = Math.max(0, Math.min(3, p.zone | 0));
        const frame = Math.floor(p.age * 11.5 + p.seed) & 3;

        const glowTex = renderer?.getGlowForColor
          ? renderer.getGlowForColor(p.primaryColor)
          : renderer?.glowCyan;
        if (glowTex) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.16, 0.15 * alpha);
          ctx.drawImage(
            glowTex,
            Math.round(px - dw * 0.62),
            Math.round(py - dh * 0.82),
            Math.round(dw * 1.24),
            Math.round(dh * 0.96)
          );
          ctx.restore();
        }

        ctx.globalAlpha = alpha;
        if (fxReady) {
          ctx.drawImage(fxSheet, frame * 128, z * 128, 128, 128, dx, dy, dw, dh);
        } else {
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(dx, dy, dw, dh);
          ctx.fillStyle = p.primaryColor || '#38bdf8';
          ctx.fillRect(dx + 4, dy + 4, Math.max(2, dw - 8), Math.max(2, dh - 8));
        }
      }
      ctx.restore();
    }

    this.skillSets.renderMid(ctx);
  }

  renderWorldForeground(ctx, renderer) {
    if (!this.active || !ctx) return;

    // Crisp foreground Portal Rim Sparks IN FRONT of emerging monsters so enemies stride through the rift plane!
    if (this.portals.length > 0) {
      const sparkCols = [
        ['#e0f2fe', '#fde047'],
        ['#a7f3d0', '#5eead4'],
        ['#f3e8ff', '#e879f9'],
        ['#fef08a', '#fb923c']
      ];
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const p of this.portals) {
        if (p.age >= 1.12) continue;
        const fade = p.age > 0.85 ? 1 - (p.age - 0.85) / 0.27 : 1;
        const z = Math.max(0, Math.min(3, p.zone | 0));
        const cols = sparkCols[z];
        for (let s = 0; s < 5; s++) {
          const cyc = (p.age * (1.8 + (s % 2) * 0.45) + s * 0.21 + p.seed) % 1;
          const sx = Math.round(
            p.x + Math.cos(p.age * 5.2 + s * 1.35) * (46 + (s % 2) * 14)
          );
          const sy = Math.round(p.groundY - 18 - cyc * 148);
          ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.88 * fade;
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(sx - 3, sy - 3, 6, 6);
          ctx.fillStyle = cols[s & 1];
          ctx.fillRect(sx - 2, sy - 2, 4, 4);
        }
      }
      ctx.restore();
    }

    this.skillSets.renderForeground(ctx);
    this.destructibles?.renderDebris(ctx, renderer);

    // Crisp 16-bit Pixel Target-Lock Reticle (`0` emojis, `0` ctx.rotate — Selout corner brackets + 'LOCKED' pixel tag)
    if (!this.autoPlay && this.manualTargetLock && !this.game.isMatchOver) {
      const activeLockedTarget = this.getActiveLockedMonster(this.game.leftFighter);
      if (activeLockedTarget && !activeLockedTarget.isDead) {
        const t = renderer?.time || 0;
        const pulse = Math.round(Math.sin(t * 8.0) * 3);
        let cx;
        let cy;
        let halfW;
        let halfH;
        let arm;
        if (activeLockedTarget.isColossalBoss) {
          cx = Math.round((activeLockedTarget.anchorX || activeLockedTarget.x) - 56);
          cy = Math.round((activeLockedTarget.anchorGroundY || 561) - 148);
          halfW = 74 + pulse;
          halfH = 84 + pulse;
          arm = 18;
        } else {
          cx = Math.round(activeLockedTarget.x);
          const baseY = Number.isFinite(activeLockedTarget.y)
            ? activeLockedTarget.y
            : activeLockedTarget.groundY || 561;
          const bodyH = activeLockedTarget.isMiniBoss
            ? 128
            : activeLockedTarget.isElite
              ? 108
              : 92;
          cy = Math.round(baseY - Math.round(bodyH * 0.54));
          halfW =
            (activeLockedTarget.isMiniBoss ? 50 : activeLockedTarget.isElite ? 42 : 36) + pulse;
          halfH = Math.round(bodyH * 0.52) + pulse;
          arm = 13;
        }

        const rx0 = cx - halfW;
        const rx1 = cx + halfW;
        const ry0 = cy - halfH;
        const ry1 = cy + halfH;
        const thick = 3;

        const seloutBar = (bx, by, bw, bh, col) => {
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, bw, bh);
        };

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // Stepped cyan (#38bdf8) Selout corner brackets
        seloutBar(rx0, ry0, arm, thick, '#38bdf8');
        seloutBar(rx0, ry0, thick, arm, '#38bdf8');
        seloutBar(rx1 - arm, ry0, arm, thick, '#38bdf8');
        seloutBar(rx1 - thick, ry0, thick, arm, '#38bdf8');
        seloutBar(rx0, ry1 - thick, arm, thick, '#38bdf8');
        seloutBar(rx0, ry1 - arm, thick, arm, '#38bdf8');
        seloutBar(rx1 - arm, ry1 - thick, arm, thick, '#38bdf8');
        seloutBar(rx1 - thick, ry1 - arm, thick, arm, '#38bdf8');

        // Gold (#fde047) corner vertex pips & cardinal crosshair ticks
        seloutBar(rx0, ry0, 4, 4, '#fde047');
        seloutBar(rx1 - 4, ry0, 4, 4, '#fde047');
        seloutBar(rx0, ry1 - 4, 4, 4, '#fde047');
        seloutBar(rx1 - 4, ry1 - 4, 4, 4, '#fde047');

        seloutBar(cx - 1, ry0 - 5, 3, 6, '#fde047');
        seloutBar(cx - 1, ry1 - 1, 3, 6, '#fde047');
        seloutBar(rx0 - 5, cy - 1, 6, 3, '#fde047');
        seloutBar(rx1 - 1, cy - 1, 6, 3, '#fde047');

        // Crisp darkforge 'LOCKED' pixel tag
        const tagW = 52;
        const tagH = 13;
        const tagX = cx - Math.floor(tagW * 0.5);
        const tagY = ry0 - tagH - 7;
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(tagX - 1, tagY - 1, tagW + 2, tagH + 2);
        ctx.fillStyle = '#090d18';
        ctx.fillRect(tagX, tagY, tagW, tagH);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(tagX, tagY, tagW, 1);
        ctx.fillStyle = '#fde047';
        ctx.font = '7px "ArcanePixel", "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LOCKED', cx, tagY + 10);

        ctx.restore();
      }
    }
  }

  renderScreenHUD(ctx, renderer) {
    if (!this.active || !ctx || this.game.isLandingOpen) return;
    const w = renderer.width;
    const h = renderer.height;
    const t = renderer.time || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Compact 4-Zone Campaign Progress + Solar Spirit & XP RPG Strip (safely below .hud-top!)
    const hudBottomY =
      typeof renderer.getHudBottomY === 'function'
        ? renderer.getHudBottomY()
        : renderer.isMobilePortrait
          ? 142
          : renderer.isMobileLandscape
            ? 84
            : 104;
    const stripW = renderer.isMobilePortrait
      ? Math.min(336, Math.max(244, Math.round(w * 0.80)))
      : Math.min(renderer.isMobileLandscape ? 290 : 360, Math.round(w * 0.48));
    const stripH = renderer.isMobileLandscape ? 25 : 29;
    const stripX = Math.round((w - stripW) * 0.5);
    const stripY = Math.round(hudBottomY + (renderer.isMobilePortrait ? 8 : 6));
    if (!this._hudStripRect) {
      this._hudStripRect = { x: stripX, y: stripY, w: stripW, h: stripH };
    } else {
      this._hudStripRect.x = stripX;
      this._hudStripRect.y = stripY;
      this._hudStripRect.w = stripW;
      this._hudStripRect.h = stripH;
    }
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

    // 2. Classic Flashing "GO!" Arcade Advance Prompt with Crisp Pixel Arrow (zero overflow!)
    if (this.goPromptActive && !this.game.isMatchOver) {
      const blink = Math.sin(t * 9.5) > -0.25;
      if (blink) {
        const promptText = String(this.goPromptText || 'GO!');
        let goFontPx = renderer.isMobilePortrait ? 9 : renderer.isMobileLandscape ? 10 : 11;
        if (promptText.length > 16 && goFontPx > 9) {
          goFontPx = 9;
        }
        ctx.font = `${goFontPx}px "ArcanePixel", "Press Start 2P", monospace`;
        const measuredW = ctx.measureText?.(promptText)?.width || 0;
        const estTextW = Math.max(measuredW, promptText.length * goFontPx * 0.94);
        const arrowW = 24;
        const boxW = Math.max(168, Math.min(252, Math.ceil(estTextW + arrowW + 26)));
        const boxH = 38;
        const gy = Math.max(
          stripY + stripH + 34,
          Math.round(h * (renderer.isMobileLandscape ? 0.36 : 0.38))
        );
        const shift = Math.round(Math.sin(t * 8.0) * 5);
        const rightPad = renderer.isMobilePortrait ? 14 : renderer.isMobileLandscape ? 124 : 80;
        const boxX = Math.max(
          12,
          Math.min(Math.max(12, w - boxW - 12), w - rightPad - boxW + shift)
        );
        const boxY = gy - Math.floor(boxH * 0.5);

        ctx.fillStyle = 'rgba(9, 12, 22, 0.90)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        const textRegionW = boxW - arrowW - 12;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fef08a';
        ctx.fillText(promptText, boxX + 6 + Math.floor(textRegionW * 0.5), gy + 4);

        // Crisp 16-bit pixel arrow (zero OS dingbat glyph)
        const ax = boxX + boxW - arrowW - 8;
        const ay = gy - 2;
        ctx.fillStyle = '#facc15';
        ctx.fillRect(ax, ay - 2, 12, 4);
        ctx.fillRect(ax + 10, ay - 6, 4, 12);
        ctx.fillRect(ax + 14, ay - 4, 4, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ax + 18, ay - 2, 4, 4);
      }
    }

    // 3. Dramatic Colossal Boss Approaching Arcade Alert Banner with Pixel Hazard Crests
    if (this.bossWarningTimer > 0) {
      const flash = Math.abs(Math.sin(t * 12));
      const by = Math.max(stripY + stripH + 46, Math.round(h * 0.36));
      const isNarrowWarn = w < 560;
      const banH = isNarrowWarn ? 64 : 60;
      const banTop = by - Math.floor(banH * 0.5);
      ctx.fillStyle = `rgba(69, 10, 10, ${(0.78 + flash * 0.16).toFixed(3)})`;
      ctx.fillRect(0, banTop, w, banH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, banTop, w, 3);
      ctx.fillRect(0, banTop + banH - 3, w, 3);

      const drawHazardCrest = (cx, cy) => {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 2, cy - 8, 4, 16);
        ctx.fillRect(cx - 6, cy - 4, 12, 8);
        ctx.fillRect(cx - 8, cy - 2, 16, 4);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - 1, cy - 5, 2, 6);
        ctx.fillRect(cx - 1, cy + 3, 2, 2);
      };

      const centerX = Math.round(w * 0.5);
      if (isNarrowWarn) {
        const crestOffset = Math.min(Math.round(w * 0.45), Math.max(120, Math.floor(w * 0.5) - 18));
        drawHazardCrest(centerX - crestOffset, by);
        drawHazardCrest(centerX + crestOffset, by);

        const warnPx = w < 375 ? 8 : 9;
        ctx.font = `${warnPx}px "ArcanePixel", "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fef08a';
        ctx.fillText('WARNING! BEHEMOTH MALPHAS', centerX, by - 4);
        ctx.fillText('RISES ON THE EAST!', centerX, by + 13);
      } else {
        const crestOffset = renderer.isMobile ? Math.min(Math.round(w * 0.45), 248) : Math.min(Math.round(w * 0.45), 292);
        drawHazardCrest(centerX - crestOffset, by);
        drawHazardCrest(centerX + crestOffset, by);

        const warnPx = w < 760 ? 10 : renderer.isMobile ? 10 : 14;
        ctx.font = `${warnPx}px "ArcanePixel", "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fef08a';
        ctx.fillText('WARNING! BEHEMOTH MALPHAS RISES ON THE EAST!', centerX, by + 5);
      }
    }

    ctx.restore();
  }
}
