import { Fighter } from '../entities/Fighter.js?v=30fps84';
import { Monster, ArchfiendBoss } from '../entities/Monster.js?v=30fps84';
import { PixelForge } from '../engine/PixelForge.js?v=30fps84';

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
 *   wave encounters, `"GO! ➔"` prompts, 3D item pickups (`HP`, `MANA`, `ULT CORE`), and a 3-Phase Archfiend Boss Lair.
 * - Full 360° 3D Manual Player Control (`Move Up/Down/Left/Right`, `Solar Vault`, `Flame Ward`, `Arcane Blink`,
 *   `Attack`, `Skill`, `Overdrive`, `Astral Meteor Ultimate`) + optional `Auto-Play` AI toggle.
 */
export class AdventureManager {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.autoPlay = false;

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

    // Input state (3D Keyboard WASD/Arrows + 360° Touch Virtual Analog Joystick + Right-Side Skill Cluster)
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
    this.heldAttack = false;
    this.uiHeldAttack = false;
    this.queuedAction = null;
    this.queuedActionTimer = 0;

    // Tracked cooldown maximums for smooth 360-degree radial HUD sweeps
    this.jumpCd = 0;
    this.jumpCdMax = 1.75;
    this.autoCdMax = 0.72;
    this.skillCdMax = 4.5;
    this.dodgeCdMax = 2.4;
    this.crouchCdMax = 3.2;
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
    this.queuedAction = null;
    this.queuedActionTimer = 0;
    this.setJoystickVector(0, 0, false);
  }

  onKeyDown(e) {
    if (!this.active || this.game.isLandingOpen || this.game.isMatchOver) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
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
    } else if (code === 'Space') {
      this.triggerAction('jump');
      e.preventDefault();
    } else if (code === 'KeyV' || code === 'KeyH') {
      this.triggerAction('crouch');
      e.preventDefault();
    } else if (code === 'KeyJ' || code === 'KeyZ') {
      this.heldAttack = true;
      this.triggerAction('attack');
      e.preventDefault();
    } else if (code === 'KeyK' || code === 'KeyX') {
      this.triggerAction('skill');
      e.preventDefault();
    } else if (code === 'KeyL' || code === 'KeyC' || code === 'ShiftLeft' || code === 'ShiftRight') {
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
    let maxPx = 30;
    if (this.joyActive) {
      vx = this.joyX;
      vy = this.joyY;
      maxPx = 36;
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
    if (!this.active || this.game.isMatchOver) return;
    this.queuedAction = actionName;
    this.queuedActionTimer = 0.24;
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
    const slots = ['attack', 'dodge', 'skill', 'overdrive', 'ultimate', 'crouch', 'jump'];
    const heroTags =
      heroKey === 'mage'
        ? {
            attack: 'FIRE',
            dodge: 'BLINK',
            skill: 'PILLAR',
            overdrive: 'NOVA',
            ultimate: 'METEOR',
            crouch: 'WARD',
            jump: 'VAULT'
          }
        : {
            attack: 'ATK',
            dodge: 'DASH',
            skill: 'SKILL',
            overdrive: 'DRIVE',
            ultimate: 'ULT',
            crouch: 'GUARD',
            jump: 'JUMP'
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

    const heroKey = player.heroId || 'mage';
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
      }
      if (sweep?.style?.setProperty) {
        const deg = Math.max(0, Math.min(360, (sweepRatio || 0) * 360));
        sweep.style.setProperty('--cd-deg', `${deg.toFixed(1)}deg`);
      }
      if (txt && txt.textContent !== labelText) {
        txt.textContent = labelText;
      }
    };

    // 1. Basic Attack (subtle cadence sweep while keeping primary icon vibrant)
    const autoCd = Math.max(0, player.autoCooldown || 0);
    this.autoCdMax = Math.max(this.autoCdMax, autoCd, (player.autoInterval || 1) * 0.68, 0.25);
    updateOrbSlot('attack', 'ready', autoCd > 0.03 ? autoCd / this.autoCdMax : 0, '');

    // 2. Arcane Blink / Dodge
    const dodgeCd = Math.max(0, player.dodgeCooldown || 0);
    this.dodgeCdMax = Math.max(this.dodgeCdMax, dodgeCd, (player.dodgeMaxCooldown || 3.2) * 0.72, 0.5);
    if (dodgeCd > 0.05) {
      updateOrbSlot('dodge', 'cd', dodgeCd / this.dodgeCdMax, `${dodgeCd.toFixed(1)}s`);
    } else {
      updateOrbSlot('dodge', 'ready', 0, '');
    }

    // 3. Special Skill
    const skillCd = Math.max(0, player.skillCooldown || 0);
    this.skillCdMax = Math.max(this.skillCdMax, skillCd, (player.skillMaxCooldown || 5.0) * 0.78, 0.5);
    if (skillCd > 0.05) {
      updateOrbSlot('skill', 'cd', skillCd / this.skillCdMax, `${skillCd.toFixed(1)}s`);
    } else {
      updateOrbSlot('skill', 'ready', 0, '');
    }

    // 4. Solar Vault / Aerial Jump (independent cooldown from Blink!)
    const jumpCd = Math.max(0, this.jumpCd || 0);
    if (jumpCd > 0.05) {
      updateOrbSlot('jump', 'cd', jumpCd / this.jumpCdMax, `${jumpCd.toFixed(1)}s`);
    } else {
      updateOrbSlot('jump', 'ready', 0, '');
    }

    // 5. Flame Ward / Counter Guard
    const crouchCd = Math.max(0, player.crouchCooldown || 0);
    this.crouchCdMax = Math.max(this.crouchCdMax, crouchCd, 3.2);
    if (crouchCd > 0.05) {
      updateOrbSlot('crouch', 'cd', crouchCd / this.crouchCdMax, `${crouchCd.toFixed(1)}s`);
    } else {
      updateOrbSlot('crouch', 'ready', 0, '');
    }

    // 6. Overdrive Art (Mana Gauge 0..100%)
    const maxMana = Math.max(1, player.maxMana || 100);
    const manaRatio = Math.max(0, Math.min(1, (player.mana || 0) / maxMana));
    if (manaRatio < 0.999) {
      updateOrbSlot('overdrive', 'charge', 1 - manaRatio, `${Math.floor(manaRatio * 100)}%`);
    } else {
      updateOrbSlot('overdrive', 'ready', 0, 'MAX');
    }

    // 7. Supreme Cataclysm Ultimate (Finisher Gauge 0..100%)
    const hasUlt = Boolean(player.hasTrueUltimate);
    const maxFin = Math.max(1, player.maxFinisherGauge || 100);
    const ultRatio = Math.max(0, Math.min(1, (player.finisherGauge || 0) / maxFin));
    if (!hasUlt) {
      updateOrbSlot('ultimate', 'charge', 1, '', true);
    } else if (ultRatio < 0.999) {
      updateOrbSlot('ultimate', 'charge', 1 - ultRatio, `${Math.floor(ultRatio * 100)}%`, false);
    } else {
      updateOrbSlot('ultimate', 'ready', 0, 'ULT', false);
    }
  }

  startCampaign(playerFighter) {
    this.attachListeners();
    this.active = true;
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
    this.jumpCd = 0;

    this.autoCdMax = Math.max(0.25, (playerFighter.autoInterval || 1) * 0.68);
    this.skillCdMax = Math.max(0.5, (playerFighter.skillMaxCooldown || 5.0) * 0.78);
    this.dodgeCdMax = Math.max(0.5, (playerFighter.dodgeMaxCooldown || 3.2) * 0.72);
    this.crouchCdMax = 3.2;
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
    if (Array.isArray(playerFighter.capeNodes)) {
      playerFighter.capeNodes.forEach((n, i) => {
        if (n) {
          n.x = playerFighter.x - playerFighter.facing * i * 9;
          n.y = playerFighter.y - 52 + i * 9;
        }
      });
    }
    // Give Sol a head-start boost on Overdrive & Finisher so arcade action pops fast!
    playerFighter.mana = Math.max(playerFighter.mana, 45);
    if (playerFighter.hasTrueUltimate) {
      playerFighter.finisherGauge = Math.max(playerFighter.finisherGauge, 34);
    }

    this.game.fighters = [playerFighter];
    this.refreshActionIcons(playerFighter.heroId || 'mage');
    this.spawnZoneEncounter(0, 1);
    this.syncStageBadge();
    this.syncRightHUD();
    this.syncControlDeckUI();
  }

  stopCampaign() {
    this.active = false;
    this.lockActive = false;
    this.goPromptActive = false;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this.bossEntity = null;
    this.pickups = [];
    this.jumpCd = 0;
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
    const facing = player && player.x > x ? 1 : -1;
    const m = kind === 'archfiend' ? new ArchfiendBoss(x, gy, facing) : new Monster(kind, x, gy, facing, opts);
    m.game = this.game;
    m.team = 2;
    m.groundY = gy;
    m.y = gy;
    this.game.fighters.push(m);
    if (!this.game.rightFighter || this.game.rightFighter.isDead || m.isBoss) {
      this.game.rightFighter = m;
    }
    if (this.game.vfx) {
      this.game.vfx.spawnShockwave(x, gy - 24, m.isBoss ? 220 : 92, m.primaryColor, 0.34, true);
      this.game.vfx.spawnBurst(x, gy - 44, m.isBoss ? 26 : 12, m.primaryColor, 210, { upBias: 130, size: 5 });
    }
    return m;
  }

  spawnPickup(type, x, groundY = null) {
    const fallbackGy = this.game.leftFighter?.groundY || ADVENTURE_DEPTH_MID_Y;
    const gy = Math.max(
      this.depthMinY + 16,
      Math.min(this.depthMaxY - 16, Number.isFinite(groundY) ? groundY : fallbackGy)
    );
    this.pickups.push({
      type, // 'hp' | 'mana' | 'ult'
      x,
      groundY: gy,
      y: gy,
      vy: -210,
      age: 0,
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
      // Staggered across upper & lower 3D lanes inside immediate viewport framing!
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
      this.totalWaveLabel = 'FINAL BOSS';
      this.bossWarningTimer = 1.85;
      this.bossSpawnPending = true;
      if (this.game.audio) this.game.audio.play('eclipse_charge', 4200);
      if (this.game.renderer) {
        this.game.renderer.triggerShake(14, 0.65);
        this.game.renderer.triggerStageEvent?.(
          '⚠ WARNING: ARCHFIEND MALPHAS! ⚠',
          'SOVEREIGN OF THE BLACK PIT AWAKENS!',
          '#ef4444',
          3.4
        );
      }
    }

    this.syncStageBadge();
    this.syncRightHUD();
  }

  onBossPhaseShift(boss, phase) {
    if (!this.active || this.game.isMatchOver) return;
    if (phase === 2) {
      // Summon 2 flanking Ashfang Vanguards on upper & lower 3D lanes + drop Solar Recovery Shrine!
      this.spawnMonster('ghoul', Math.max(this.lockMinX + 60, boss.x - 360), { groundY: 484 });
      this.spawnMonster('ghoul', Math.min(this.lockMaxX - 60, boss.x + 220), { groundY: 638 });
      this.spawnPickup('hp', 4120, 502);
      this.spawnPickup('mana', 4210, 622);
    } else if (phase === 3) {
      this.spawnPickup('hp', 4080, 496);
      this.spawnPickup('ult', 4180, 628);
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
      const d = Math.hypot(m.x - player.x, (mGy - pGy) * 1.65) - (m.isBoss ? 45 : 0);
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
    if (player && !player.isDead) {
      // Arcade beat-'em-up momentum reward: bonus Overdrive & Astral Ultimate charge per kill!
      player.gainMana(18);
      if (player.hasTrueUltimate) {
        player.gainFinisher(deadMonster.isElite ? 26 : 14);
      }
      if (this.game.vfx) {
        this.game.vfx.spawnDamageText(
          deadMonster.x,
          deadMonster.y - 165,
          0,
          false,
          `+${pts} PTS`,
          '#fde047'
        );
      }
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
    const dropBaseX = p ? Math.min(this.lockMaxX - 160, p.x + 150) : zoneIdx * 1200 + 820;
    if (zoneIdx === 0) {
      this.spawnPickup('hp', dropBaseX, 514);
      this.spawnPickup('mana', dropBaseX + 78, 608);
    } else if (zoneIdx === 1) {
      this.spawnPickup('hp', dropBaseX, 512);
      this.spawnPickup('ult', dropBaseX + 82, 610);
    } else if (zoneIdx === 2) {
      // Sanctuary Boss-Prep Cache staggered across the 3D road before Throne of the Black Pit!
      this.spawnPickup('hp', 3340, 498);
      this.spawnPickup('mana', 3420, 562);
      this.spawnPickup('ult', 3500, 626);
    }

    if (this.game.audio) {
      this.game.audio.play('reflect', dropBaseX);
    }
  }

  updatePickups(dt, player) {
    if (!this.pickups.length) return;
    const pGy = player ? player.groundY || player.y : ADVENTURE_DEPTH_MID_Y;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      const pkGy = Number.isFinite(pk.groundY) ? pk.groundY : ADVENTURE_DEPTH_MID_Y;
      pk.age += dt;
      if (pk.y < pkGy || pk.vy < 0) {
        pk.vy += 680 * dt;
        pk.y += pk.vy * dt;
        if (pk.y >= pkGy) {
          pk.y = pkGy;
          pk.vy = 0;
        }
      }

      if (
        player &&
        !player.isDead &&
        Math.abs(player.x - pk.x) <= 74 &&
        Math.abs(pGy - pkGy) <= 64 &&
        Math.abs(player.y - pk.y) <= 105
      ) {
        this.pickups.splice(i, 1);
        this.score += 150;
        if (this.game.audio) this.game.audio.play('holy_hit', pk.x);
        if (pk.type === 'hp') {
          player.heal(Math.round(player.maxHp * 0.34), 'SOLAR ELIXIR +HP!');
        } else if (pk.type === 'mana') {
          player.gainMana(55);
          this.game.vfx?.spawnDamageText(player.x, player.y - 148, 0, false, '+55% SOLAR MANA!', '#38bdf8');
        } else if (pk.type === 'ult') {
          if (player.hasTrueUltimate) {
            player.gainFinisher(42);
          } else {
            player.gainMana(100);
          }
          this.game.vfx?.spawnDamageText(player.x, player.y - 156, 0, true, '★ ASTRAL CORE +ULT! ★', '#fde047');
        }
        this.game.vfx?.spawnBurst(pk.x, pk.y - 24, 14, '#fde047', 190, { upBias: 120, size: 5 });
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
      g.hudEls.modeBadge.textContent = `${this.totalWaveLabel} • ${this.score} PTS`;
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

    // Optional Auto-Play AI Mode: Sol fights waves autonomously across 3D lanes & marches right when cleared!
    if (this.autoPlay) {
      player._manualWalkActive = false;
      player._advVaultVelZ = 0;
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
        player.walkPhase += dt * 5.0;
        const autoMoveSpeed = Math.max(player.moveSpeed || 180, 188);
        player.x += (dx / len) * autoMoveSpeed * 1.45 * dt;
        this.shiftEntityDepth(player, (dz / len) * autoMoveSpeed * 1.10 * dt);
        Fighter.prototype.update.call(player, dt, null, this.game);
        player.state = 'WALK';
        return;
      }
      if (target && (player.state === 'IDLE' || player.state === 'WALK') && !(player.stunTimer > 0) && !player.isRooted) {
        const autoMoveSpeed = Math.max(player.moveSpeed || 180, 188);
        const dz = (target.groundY || ADVENTURE_DEPTH_MID_Y) - (player.groundY || ADVENTURE_DEPTH_MID_Y);
        if (Math.abs(dz) > 14) {
          this.shiftEntityDepth(player, Math.sign(dz) * Math.min(Math.abs(dz), autoMoveSpeed * 0.92 * dt));
        }
      }
      player.update(dt, target, this.game);
      return;
    }

    // Manual 360° 3D Player Control Mode (Touch Virtual Analog Joystick + WASD / Arrow Keys)!
    let vecX = 0;
    let vecY = 0;
    if (this.joyActive) {
      const mag = Math.hypot(this.joyX, this.joyY);
      if (mag > 0.13) {
        const scaledMag = 0.54 + 0.46 * Math.min(1, (mag - 0.13) / 0.65);
        vecX = (this.joyX / mag) * scaledMag;
        vecY = (this.joyY / mag) * scaledMag;
      }
    } else {
      const kbX = (this.heldRight || this.uiHeldRight ? 1 : 0) - (this.heldLeft || this.uiHeldLeft ? 1 : 0);
      const kbY = (this.heldDown || this.uiHeldDown ? 1 : 0) - (this.heldUp || this.uiHeldUp ? 1 : 0);
      const mag = Math.hypot(kbX, kbY);
      if (mag > 0) {
        vecX = kbX / (mag > 1 ? mag : 1);
        vecY = kbY / (mag > 1 ? mag : 1);
      }
    }
    const moveDirX = Math.abs(vecX) > 0.12 ? (vecX > 0 ? 1 : -1) : 0;
    const isMoving3D = Math.hypot(vecX, vecY) > 0.05;

    // Continuous hold-to-attack on primary thumb orb or [J/Z]
    if (!this.queuedAction && (this.heldAttack || this.uiHeldAttack) && player.autoCooldown <= 0) {
      this.queuedAction = 'attack';
      this.queuedActionTimer = 0.08;
    }

    const isAttackRecoveryCancel =
      player.state === 'AUTO_ATTACK' &&
      player.didActionFrame &&
      this.queuedAction &&
      this.queuedAction !== 'attack';

    const canAct =
      !player.isDead &&
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      (player.state === 'IDLE' || player.state === 'WALK' || isAttackRecoveryCancel);

    if (canAct && this.queuedAction) {
      const act = this.queuedAction;
      if (
        act === 'ultimate' &&
        player.hasTrueUltimate &&
        player.finisherGauge >= player.maxFinisherGauge &&
        typeof player.updateTrueUltimate === 'function'
      ) {
        this.queuedAction = null;
        if (target) player.facing = target.x >= player.x ? 1 : -1;
        player.finisherGauge = 0;
        if (player.stats) player.stats.ultsUsed++;
        player.setState('TRUE_ULTIMATE');
        this.game.triggerTrueUltimateCinematic(player);
      } else if (act === 'overdrive' && player.mana >= player.maxMana) {
        this.queuedAction = null;
        if (target) player.facing = target.x >= player.x ? 1 : -1;
        player.mana = 0;
        if (player.hasTrueUltimate) player.gainFinisher(34);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('ULTIMATE');
        this.game.triggerUltimateCinematic(player);
      } else if (act === 'skill' && player.skillCooldown <= 0) {
        this.queuedAction = null;
        if (target) player.facing = target.x >= player.x ? 1 : -1;
        this.skillCdMax = Math.max(0.5, player.skillMaxCooldown * 0.78);
        player.skillCooldown = this.skillCdMax;
        if (player.stats) player.stats.skillsUsed++;
        player.setState('SKILL');
      } else if (act === 'dodge' && player.dodgeCooldown <= 0) {
        this.queuedAction = null;
        const blinkDir = moveDirX !== 0 ? moveDirX : target ? (player.x < target.x ? -1 : 1) : player.facing;
        this.dodgeCdMax = Math.max(0.5, player.dodgeMaxCooldown * 0.72);
        player.dodgeCooldown = this.dodgeCdMax;
        player.dashDir = blinkDir;
        player.isInvulnerable = true;
        player._advVaultVelZ = Math.abs(vecY) > 0.12 ? vecY * 290 : 0;
        player.setState('DODGE');
        if (typeof player.onStartDodge === 'function') {
          player.onStartDodge(isMoving3D ? null : target, this.game, blinkDir);
        }
      } else if (act === 'jump' && this.jumpCd <= 0 && typeof player.startJump === 'function') {
        this.queuedAction = null;
        const vaultDir = moveDirX !== 0 ? moveDirX : player.facing;
        player.facing = vaultDir;
        player._advVaultVelZ = Math.abs(vecY) > 0.12 ? vecY * 235 : 0;
        const prevDodgeCd = player.dodgeCooldown;
        player.startJump(null, this.game, vaultDir);
        player.dodgeCooldown = prevDodgeCd;
        this.jumpCd = this.jumpCdMax;
      } else if (act === 'crouch' && (player.crouchCooldown || 0) <= 0 && typeof player.startCrouch === 'function') {
        this.queuedAction = null;
        if (target) player.facing = target.x >= player.x ? 1 : -1;
        player.startCrouch(target, this.game);
        this.crouchCdMax = Math.max(this.crouchCdMax, player.crouchCooldown || 3.2);
      } else if (act === 'attack' && player.autoCooldown <= 0) {
        this.queuedAction = null;
        if (target) player.facing = target.x >= player.x ? 1 : -1;
        this.autoCdMax = Math.max(0.25, player.autoInterval * 0.68);
        player.autoCooldown = this.autoCdMax;
        player.setState('AUTO_ATTACK');
      }
    }

    // Apply responsive 360° 3D movement (X + Depth groundY) when in neutral IDLE/WALK
    if (
      !player.isDead &&
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      (player.state === 'IDLE' || player.state === 'WALK')
    ) {
      player._advVaultVelZ = 0;
      if (isMoving3D && !this.game.isMatchOver) {
        player._manualWalkActive = true;
        if (moveDirX !== 0) {
          player.facing = moveDirX;
        }
        player.moveDir = 1;
        player.state = 'WALK';
        const advMoveSpeed = Math.max(player.moveSpeed || 180, 188);
        player.x += vecX * advMoveSpeed * 1.42 * dt;
        this.shiftEntityDepth(player, vecY * advMoveSpeed * 1.12 * dt);
      } else {
        player._manualWalkActive = false;
        player.moveDir = 0;
        if (!this.game.isMatchOver) {
          player.state = 'IDLE';
        }
      }
      // Pass `enemy = null` while in manual IDLE/WALK so FireMage.js autonomous dodge/retreat
      // never overrides the player's 3D positioning, while keeping all 120Hz Solar Shaders & cooldowns ticking!
      player.update(dt, null, this.game);
    } else {
      player._manualWalkActive = false;
      if ((player.state === 'DODGE' || player.state === 'JUMP') && player._advVaultVelZ) {
        this.shiftEntityDepth(player, player._advVaultVelZ * dt);
      } else {
        player._advVaultVelZ = 0;
      }
      // During active Attack, Skill, Jump, Blink, Crouch, Overdrive, or Astral Meteor Ultimate,
      // pass `target` so Sol's projectiles, Triple Solar Pillars, and Meteor lock onto the monster in 3D!
      player.update(dt, target, this.game);
    }
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game;
    const player = g.leftFighter;
    if (!player) return;

    this.goBlinkTimer += dt;
    if (this.jumpCd > 0) {
      this.jumpCd = Math.max(0, this.jumpCd - dt);
    }

    // 1. Boss Warning Countdown -> Spawn Archfiend Malphas!
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer = Math.max(0, this.bossWarningTimer - dt);
      if (this.bossWarningTimer <= 0 && this.bossSpawnPending) {
        this.bossSpawnPending = false;
        this.bossEntity = this.spawnMonster('archfiend', 4440, { groundY: ADVENTURE_DEPTH_MID_Y });
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

    // 5. Update Player (Manual or Auto-Play) + All Active Monsters
    const nearestMonster = this.getNearestLivingMonster(player);
    this.processPlayerControls(dt, player, nearestMonster);

    for (const f of g.fighters) {
      if (!f || f === player) continue;
      f.update(dt, player, g);
    }

    this.syncRightHUD();
    this.syncControlDeckUI();
  }

  renderWorldFloor(ctx, renderer) {
    if (!this.active || !ctx) return;
    const t = renderer.time || 0;
    const roadTop = 438;
    const roadBot = 684;

    // 1. Render Monster 3D Floor Telegraph Rings
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
        // Floor rune threshold strip across the entire 3D road depth
        ctx.fillStyle = `rgba(251, 146, 60, ${(pulse * 0.24).toFixed(3)})`;
        ctx.fillRect(gx - 6, roadTop, 12, roadBot - roadTop);
        ctx.fillStyle = `rgba(254, 240, 138, ${(pulse * 0.76).toFixed(3)})`;
        for (let seg = 0; seg < 8; seg++) {
          const sy = Math.round(roadTop + ((seg * 32 + t * 52) % (roadBot - roadTop - 12)));
          ctx.fillRect(gx - 2, sy, 4, 14);
        }
        // Upper & lower arcane seal obelisks anchoring the 3D threshold
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

    // 3. Render Pixel-Art 3D Arcade Pickups (`Solar Heart`, `Solar Mana`, `Astral Core`) sorted by depth
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

        // Grounded 3D lane contact shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.fillRect(px - 14, pkGy - 3, 28, 5);

        const colMain =
          pk.type === 'hp' ? '#22c55e' : pk.type === 'mana' ? '#38bdf8' : '#facc15';
        const colCore =
          pk.type === 'hp' ? '#bbf7d0' : pk.type === 'mana' ? '#e0f2fe' : '#ffffff';
        const tag = pk.type === 'hp' ? '+HP' : pk.type === 'mana' ? '+MANA' : '★ULT';

        // Crisp 16-bit selective-outlined gem/chalice icon
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

  renderScreenHUD(ctx, renderer) {
    if (!this.active || !ctx || this.game.isLandingOpen) return;
    const w = renderer.width;
    const h = renderer.height;
    const t = renderer.time || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Compact 4-Zone Campaign Progress Strip under Top Center Crest & Utility Pill
    const stripW = Math.min(renderer.isMobileLandscape ? 290 : 360, Math.round(w * 0.42));
    const stripH = renderer.isMobileLandscape ? 15 : 18;
    const stripX = Math.round((w - stripW) * 0.5);
    const stripY = renderer.isMobileLandscape ? 68 : renderer.isMobile ? 96 : 68;
    ctx.fillStyle = 'rgba(6, 9, 18, 0.82)';
    ctx.fillRect(stripX, stripY, stripW, stripH);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(stripX, stripY, stripW, stripH);

    const segW = Math.floor((stripW - 16) / 4);
    const segH = renderer.isMobileLandscape ? 9 : 10;
    const segPadY = renderer.isMobileLandscape ? 3 : 4;
    for (let i = 0; i < 4; i++) {
      const sx = stripX + 4 + i * (segW + 2);
      const sy = stripY + segPadY;
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
      ctx.fillText(i === 3 ? 'BOSS' : `Z${i + 1}`, sx + Math.floor(segW * 0.5), sy + (renderer.isMobileLandscape ? 7 : 8));
    }

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

    // 3. Dramatic Boss Approaching Arcade Alert Banner
    if (this.bossWarningTimer > 0) {
      const flash = Math.abs(Math.sin(t * 12));
      const by = Math.round(h * 0.34);
      ctx.fillStyle = `rgba(69, 10, 10, ${(0.78 + flash * 0.16).toFixed(3)})`;
      ctx.fillRect(0, by - 30, w, 60);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, by - 30, w, 3);
      ctx.fillRect(0, by + 27, w, 3);

      ctx.font = renderer.isMobile
        ? '11px "ArcanePixel", "Press Start 2P", monospace'
        : '15px "ArcanePixel", "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('⚠ WARNING! ARCHFIEND MALPHAS APPROACHING! ⚠', Math.round(w * 0.5), by + 5);
    }

    ctx.restore();
  }
}
