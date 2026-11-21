// Endless Crusade Gothic Obsidian & Burnished Gold HUD & Collapsible Shop Drawer
// Strictly Node-test safe (all DOM/window/Image accesses guarded), zero emojis,
// pure nearest-neighbor blits & fillRect fallbacks, in-place DOM patching (zero 60fps click drops).

import { PixelForge } from '../engine/PixelForge.js?v=30fps205';
import { ENDLESS_RELICS, ENDLESS_RELIC_SETS, formatEndlessNumber } from './EndlessEconomy.js?v=30fps205';
import { ENDLESS_SHOP_CSS } from './EndlessShopStyles.js?v=30fps205';
import { EndlessMobileHud } from './EndlessMobileHud.js?v=30fps205';
import {
  ENDLESS_VFX_SHEET_URL,
  ENDLESS_ICON_ROW,
  ENDLESS_SIGIL_ROW,
  ENDLESS_ICON_CELL,
  CLOSE_SVG,
  BOSS_CROWN_SVG,
  SYNERGY_DIAMOND_SVG,
  DPS_BAR_SVG,
  ASCEND_STAR_SVG,
  FORGE_DUST_SVG,
  BOUNTY_SVG,
  SHRINE_SVG,
  MERCHANT_SVG,
  STAR_ON_SVG,
  STAR_OFF_SVG,
  OVERDRIVE_BOLT_SVG,
  TRIAL_VAULT_SVG,
  DEFAULT_SQUAD_FORMATIONS,
  DEFAULT_TRIAL_DEFS,
  TRIAL_RARITY_COLORS,
  GEAR_SLOT_ORDER,
  GEAR_SLOT_DEFAULTS,
  DEFAULT_MYTHIC_SETS,
  getTrialSvg,
  formatTrialBestScore,
  formatTrialHudScore,
  formatTrialResultPerf,
  getGearSlotSvg,
  formatGearBonuses,
  resolveGearPowerDelta,
  computeGearItemSignature,
  formatAwayTime,
  formatGoldTag,
  resolveArtifactIconSpec,
  resolveCompanionAuraMeta,
  resolvePromoteCta,
  setTextIfChanged,
  stopEventLeak,
  drawFallbackPixelIcon,
  drawFallbackPortrait,
  drawMonogramPortrait
} from './EndlessShopIcons.js?v=30fps205';

const STYLE_ELEMENT_ID = 'endless-shop-ui-styles';
const ROOT_ELEMENT_ID = 'endless-hud-root';
const RELIC_DEF_BY_ID = new Map(ENDLESS_RELICS.map((r) => [r.id, r]));

function setStyleIfChanged(el, prop, value) {
  if (!el || !el.style) return;
  if (el.style[prop] !== value) {
    el.style[prop] = value;
  }
}

export class EndlessShopUI {
  constructor(endlessManager = null) {
    this.manager = endlessManager || null;
    this.mounted = false;
    this.visible = false;
    this.drawerOpen = false;
    this.activeTab = 'items';

    this.root = null;
    this._createdRoot = false;
    this._vfxFallbackImg = null;
    this._iconCanvases = [];
    this._partySlotRefs = [];
    this._formationBtnRefs = new Map();
    this._relicRowRefs = new Map();
    this._relicSetPillRefs = new Map();
    this._companionCardRefs = new Map();
    this._artifactRowRefs = new Map();
    this._gearSlotRefs = new Map();
    this._gearSetPillRefs = new Map();
    this._gearBagRowRefs = new Map();
    this._buffPillRefs = new Map();
    this._trialCardRefs = new Map();
    this._tabBtnRefs = new Map();
    this._tabPanelRefs = new Map();
    this._bulkBtnRefs = new Map();
    this._statRefs = new Map();
    this._refs = {};

    this._syncCounter = 0;
    this._modifierIconEntry = null;
    this._resetArmed = false;
    this._resetArmTimer = null;
    this._ascendArmed = false;
    this._ascendArmTimer = null;
    this._partyNoticeTimer = null;
    this._saveFlashTimer = null;
    this._ephemeralTimers = new Set();
    this._lastHudSynergySig = '';
    this._lastDrawerSynergySig = '';
    this._lastGearInvSig = '';
    this._lastGearSetSig = '';
    this._lastGearEquipSigs = new Map();
    this._lastTrophySig = '';
    this._lastResolvedAscension = null;
    this._lastBountyCompleted = false;
    this._lastMerchantUid = null;
    this._lastMerchantOfferType = '';
    this._lastTrialHudIconId = '';
    this._lastTrialResultSig = '';
    this._telemExpanded = false;
    this._lastSnapshot = null;
    this._mobileHud = null;

    // Built-in 6-tab registry: ITEMS | GEAR | ALLIES | ASCEND | TRIALS | STATS
    this.tabs = [
      { id: 'items', label: 'ITEMS', builtIn: true },
      { id: 'gear', label: 'GEAR', builtIn: true },
      { id: 'companions', label: 'ALLIES', builtIn: true },
      { id: 'ascend', label: 'ASCEND', builtIn: true },
      { id: 'trials', label: 'TRIALS', builtIn: true },
      { id: 'stats', label: 'STATS', builtIn: true }
    ];
  }

  _hasDom() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return false;
    if (typeof this._hasRealDom === 'boolean') return this._hasRealDom;
    try {
      const probe = document.createElement('div');
      this._hasRealDom = Boolean(
        probe &&
          typeof probe.setAttribute === 'function' &&
          typeof probe.appendChild === 'function' &&
          typeof probe.addEventListener === 'function'
      );
    } catch {
      this._hasRealDom = false;
    }
    return this._hasRealDom;
  }

  _injectStyles() {
    if (!this._hasDom() || !document.head) return;
    if (document.getElementById(STYLE_ELEMENT_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = ENDLESS_SHOP_CSS;
    document.head.appendChild(style);
  }

  _resolveVfxSheet() {
    const forged = PixelForge?.assets?.endlessVfx;
    if (forged && forged.complete && forged.naturalWidth >= ENDLESS_ICON_CELL * 12) {
      return forged;
    }
    if (!this._vfxFallbackImg && typeof Image !== 'undefined') {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this._blitAllIcons(true);
      };
      img.src = ENDLESS_VFX_SHEET_URL;
      this._vfxFallbackImg = img;
    }
    if (
      this._vfxFallbackImg &&
      this._vfxFallbackImg.complete &&
      this._vfxFallbackImg.naturalWidth >= ENDLESS_ICON_CELL * 12
    ) {
      return this._vfxFallbackImg;
    }
    return null;
  }

  _blitIconCanvas(canvas, col, accentHex, force = false, row = ENDLESS_ICON_ROW) {
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const sheet = this._resolveVfxSheet();
    if (sheet && sheet.naturalHeight >= (row + 1) * ENDLESS_ICON_CELL) {
      if (!force && canvas._blittedSheet === sheet && canvas._blittedRow === row && canvas._blittedCol === col) {
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sx = col * ENDLESS_ICON_CELL;
      const sy = row * ENDLESS_ICON_CELL;
      ctx.drawImage(
        sheet,
        sx,
        sy,
        ENDLESS_ICON_CELL,
        ENDLESS_ICON_CELL,
        0,
        0,
        canvas.width,
        canvas.height
      );
      canvas._blittedSheet = sheet;
      canvas._blittedRow = row;
      canvas._blittedCol = col;
      return;
    }
    if (!canvas._fallbackDrawn || force) {
      drawFallbackPixelIcon(canvas, col, accentHex, row);
      canvas._fallbackDrawn = true;
    }
  }

  _blitAllIcons(force = false) {
    for (let i = 0; i < this._iconCanvases.length; i++) {
      const entry = this._iconCanvases[i];
      this._blitIconCanvas(entry.canvas, entry.col, entry.accentHex, force, entry.row ?? ENDLESS_ICON_ROW);
    }
  }

  _resolvePortraitImage(heroKey) {
    if (!heroKey) return null;
    let assets = PixelForge?.assets || null;
    if (!assets && typeof PixelForge?.initAssets === 'function' && typeof Image !== 'undefined') {
      try {
        assets = PixelForge.initAssets();
      } catch (_err) {
        assets = null;
      }
    }
    const baseKey = String(heroKey).replace(/_ex$/, '');
    const img = assets?.[heroKey]?.portrait || assets?.[baseKey]?.portrait || null;
    if (img && typeof PixelForge?.ensureImage === 'function') {
      PixelForge.ensureImage(img);
    }
    return img;
  }

  _blitCompanionPortrait(canvas, heroKey, accentHex, fallbackLabel = null) {
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const keySig = `${heroKey || ''}|${accentHex || ''}|${fallbackLabel || ''}`;
    const img = this._resolvePortraitImage(heroKey);

    if (img && img.complete && img.naturalWidth > 0) {
      if (canvas._blittedPortrait === img && canvas._blittedKeySig === keySig) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas._blittedPortrait = img;
      canvas._blittedKeySig = keySig;
      canvas._fallbackKeySig = null;
      return;
    }

    canvas._expectedKeySig = keySig;
    if (img && !img.complete && typeof img.addEventListener === 'function' && canvas._portraitLoadBoundImg !== img) {
      canvas._portraitLoadBoundImg = img;
      img.addEventListener('load', () => {
        if (canvas._portraitLoadBoundImg === img) {
          canvas._portraitLoadBoundImg = null;
        }
        if (canvas._expectedKeySig === keySig) {
          this._blitCompanionPortrait(canvas, heroKey, accentHex, fallbackLabel);
        }
      }, { once: true });
    }

    if (canvas._fallbackKeySig !== keySig) {
      canvas._blittedPortrait = null;
      if (fallbackLabel) {
        drawMonogramPortrait(canvas, accentHex, fallbackLabel);
      } else {
        drawFallbackPortrait(canvas, accentHex);
      }
      canvas._fallbackKeySig = keySig;
    }
  }

  _playSfx(methodName) {
    const sfx = this.manager?.game?.sfx;
    if (sfx && typeof sfx[methodName] === 'function') {
      try {
        sfx[methodName]();
      } catch (_err) {
        // Ignore audio context autoplay restrictions
      }
    }
  }

  registerTab(tabDef) {
    if (!tabDef || !tabDef.id || !tabDef.label) return false;
    const existingIdx = this.tabs.findIndex((t) => t.id === tabDef.id);
    if (existingIdx >= 0) {
      this.tabs[existingIdx] = { ...this.tabs[existingIdx], ...tabDef };
    } else {
      this.tabs.push({ ...tabDef, builtIn: false });
    }
    if (this.mounted && this._hasDom()) {
      this._ensureTabElements(tabDef);
      this._syncTabVisibility();
    }
    return true;
  }

  mount() {
    if (this.mounted) return this;
    this.mounted = true;
    if (!this._hasDom()) return this;

    this._injectStyles();

    let root = document.getElementById(ROOT_ELEMENT_ID);
    if (!root) {
      root = document.createElement('section');
      root.id = ROOT_ELEMENT_ID;
      root.className = 'endless-hud-root hidden';
      root.setAttribute('aria-label', 'Endless Crusade HUD and Shop');
      const host = document.getElementById('app') || document.body;
      if (host) host.appendChild(root);
      this._createdRoot = true;
    } else {
      root.classList.add('endless-hud-root');
      if (!this.visible) root.classList.add('hidden');
      this._createdRoot = false;
    }

    this.root = root;
    this.root.textContent = '';
    this._iconCanvases = [];
    this._partySlotRefs = [];
    this._formationBtnRefs.clear();
    this._relicRowRefs.clear();
    this._relicSetPillRefs = new Map();
    this._companionCardRefs.clear();
    this._artifactRowRefs.clear();
    this._gearSlotRefs.clear();
    this._gearSetPillRefs.clear();
    this._gearBagRowRefs.clear();
    this._buffPillRefs.clear();
    this._trialCardRefs.clear();
    this._tabBtnRefs.clear();
    this._tabPanelRefs.clear();
    this._bulkBtnRefs.clear();
    this._statRefs.clear();
    this._lastHudSynergySig = '';
    this._lastDrawerSynergySig = '';
    this._lastTrophySig = '';
    this._lastGearInvSig = '';
    this._lastGearSetSig = '';
    this._lastGearEquipSigs.clear();
    this._lastBountyCompleted = false;
    this._lastMerchantUid = null;
    this._lastMerchantOfferType = '';
    this._lastTrialHudIconId = '';
    this._lastTrialResultSig = '';
    this._modifierIconEntry = null;
    this._refs = {};

    this._buildTopStatusBar();
    this._buildActivePartyHud();
    this._buildEventsDock();
    this._mobileHud = new EndlessMobileHud({
      onClaimBounty: (anchorEl) => this._handleClaimActiveBounty(anchorEl),
      onBuyMerchant: (btnEl, cardEl) => this._handleBuyMerchantOffer(btnEl, cardEl),
      onUiClick: () => this._playSfx('playUiClick')
    }).mount(this.root);
    this._buildShopDrawer();
    this._buildFxLayer();
    this._buildOfflineLootModal();
    this._buildTrialResultModal();

    this.setVisible(this.visible);
    this.setDrawerOpen(this.drawerOpen);
    this.setActiveTab(this.activeTab);
    this._blitAllIcons(true);

    return this;
  }

  _makeIconCanvas(size, col, accentHex, className, row = ENDLESS_ICON_ROW) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    if (className) c.className = className;
    c.setAttribute('aria-hidden', 'true');
    this._iconCanvases.push({ canvas: c, col, accentHex, row });
    return c;
  }

  _buildTopStatusBar() {
    const stack = document.createElement('div');
    stack.className = 'endless-top-stack';

    const bar = document.createElement('div');
    bar.className = 'endless-top-bar';
    stopEventLeak(bar);

    // Stage & Realm badge
    const stageBadge = document.createElement('div');
    stageBadge.className = 'endless-stage-badge';
    const stageText = document.createElement('span');
    stageText.textContent = 'STAGE 1 • ECLIPSE SANCTUM';
    const loopPill = document.createElement('span');
    loopPill.className = 'endless-loop-pill hidden';
    loopPill.textContent = 'LOOP II';
    stageBadge.appendChild(stageText);
    stageBadge.appendChild(loopPill);

    // Wave / Boss progress meter
    const waveMeter = document.createElement('div');
    waveMeter.className = 'endless-wave-meter';
    const waveFill = document.createElement('div');
    waveFill.className = 'endless-wave-fill';
    const waveLabel = document.createElement('span');
    waveLabel.className = 'endless-wave-label';
    waveLabel.textContent = 'WAVE 1/5';
    waveMeter.appendChild(waveFill);
    waveMeter.appendChild(waveLabel);

    // Currencies: Sovereign Gold & Astral Shards
    const currencyGroup = document.createElement('div');
    currencyGroup.className = 'endless-currency-group';

    const goldPill = document.createElement('div');
    goldPill.className = 'endless-currency-pill is-gold';
    goldPill.title = 'Sovereign Gold';
    const goldIcon = this._makeIconCanvas(32, 0, '#facc15', 'endless-currency-icon');
    const goldVal = document.createElement('span');
    goldVal.textContent = '0';
    goldPill.appendChild(goldIcon);
    goldPill.appendChild(goldVal);

    const shardPill = document.createElement('div');
    shardPill.className = 'endless-currency-pill is-shard';
    shardPill.title = 'Astral Shards';
    const shardIcon = this._makeIconCanvas(32, 1, '#38bdf8', 'endless-currency-icon');
    const shardVal = document.createElement('span');
    shardVal.textContent = '0';
    shardPill.appendChild(shardIcon);
    shardPill.appendChild(shardVal);

    currencyGroup.appendChild(goldPill);
    currencyGroup.appendChild(shardPill);

    // Tap-Fever meter
    const feverMeter = document.createElement('div');
    feverMeter.className = 'endless-fever-meter';
    feverMeter.title = 'Tap anywhere on the arena to unleash Arcane Smite and charge Tap-Fever';
    const feverFill = document.createElement('div');
    feverFill.className = 'endless-fever-fill';
    const feverLabel = document.createElement('span');
    feverLabel.className = 'endless-fever-label';
    feverLabel.textContent = 'FEVER 0%';
    feverMeter.appendChild(feverFill);
    feverMeter.appendChild(feverLabel);

    // Wave 4: Rotating Realm Modifier Pill (Row 9 Cols 0..3)
    const modPill = document.createElement('div');
    modPill.className = 'endless-modifier-pill';
    modPill.title = 'BLOOD MOON: +60% GOLD & +8% CRIT';
    const modIcon = this._makeIconCanvas(24, 0, '#f43f5e', 'endless-modifier-icon', ENDLESS_SIGIL_ROW);
    this._modifierIconEntry = this._iconCanvases[this._iconCanvases.length - 1] || null;
    const modName = document.createElement('span');
    modName.textContent = 'BLOOD MOON';
    modPill.appendChild(modIcon);
    modPill.appendChild(modName);

    const topBreak = document.createElement('span');
    topBreak.className = 'endless-top-break';
    topBreak.setAttribute('aria-hidden', 'true');

    bar.appendChild(stageBadge);
    bar.appendChild(modPill);
    bar.appendChild(waveMeter);
    bar.appendChild(topBreak);
    bar.appendChild(currencyGroup);
    bar.appendChild(feverMeter);
    this._buildShopToggle(bar);

    // Boss Control Action Pill
    const bossControls = document.createElement('div');
    bossControls.className = 'endless-boss-controls';
    stopEventLeak(bossControls);

    const autoBossBtn = document.createElement('button');
    autoBossBtn.type = 'button';
    autoBossBtn.className = 'endless-autoboss-btn is-on';
    autoBossBtn.textContent = 'AUTO-BOSS: ON';
    autoBossBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleToggleAutoBoss();
    });

    const challengeBtn = document.createElement('button');
    challengeBtn.type = 'button';
    challengeBtn.className = 'endless-challenge-boss-btn hidden';
    challengeBtn.innerHTML = `${BOSS_CROWN_SVG}<span>CHALLENGE BOSS</span>`;
    challengeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleChallengeBoss();
    });

    bossControls.appendChild(autoBossBtn);
    bossControls.appendChild(challengeBtn);

    stack.appendChild(bar);
    stack.appendChild(bossControls);
    this._buildTrialHud(stack);
    this.root.appendChild(stack);

    this._refs.stageBadge = stageBadge;
    this._refs.stageText = stageText;
    this._refs.loopPill = loopPill;
    this._refs.modPill = modPill;
    this._refs.modIcon = modIcon;
    this._refs.modName = modName;
    this._refs.waveMeter = waveMeter;
    this._refs.waveFill = waveFill;
    this._refs.waveLabel = waveLabel;
    this._refs.goldVal = goldVal;
    this._refs.shardVal = shardVal;
    this._refs.feverMeter = feverMeter;
    this._refs.feverFill = feverFill;
    this._refs.feverLabel = feverLabel;
    this._refs.bossControls = bossControls;
    this._refs.autoBossBtn = autoBossBtn;
    this._refs.challengeBtn = challengeBtn;
  }

  _buildTrialHud(parentStack) {
    const hud = document.createElement('div');
    hud.className = 'endless-trial-hud hidden';
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');
    hud.setAttribute('aria-label', 'Active Challenge Trial HUD');
    stopEventLeak(hud);

    const row = document.createElement('div');
    row.className = 'endless-trial-hud-row';

    const iconEl = document.createElement('span');
    iconEl.className = 'endless-trial-hud-icon';
    iconEl.innerHTML = TRIAL_VAULT_SVG;

    const meta = document.createElement('div');
    meta.className = 'endless-trial-hud-meta';

    const head = document.createElement('div');
    head.className = 'endless-trial-hud-head';

    const nameEl = document.createElement('span');
    nameEl.className = 'endless-trial-hud-name';
    nameEl.textContent = 'GILDED VAULT SPRINT';

    const timerEl = document.createElement('span');
    timerEl.className = 'endless-trial-hud-timer';
    timerEl.textContent = '30.0S';

    head.appendChild(nameEl);
    head.appendChild(timerEl);

    const scoreEl = document.createElement('div');
    scoreEl.className = 'endless-trial-hud-score';
    scoreEl.textContent = 'GOLD +0 | GOBLINS 0';

    meta.appendChild(head);
    meta.appendChild(scoreEl);

    const exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'endless-trial-exit-btn';
    exitBtn.textContent = 'EXIT';
    exitBtn.title = 'Exit Trial early and collect current rewards';
    exitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleExitTrial();
    });

    row.appendChild(iconEl);
    row.appendChild(meta);
    row.appendChild(exitBtn);

    const track = document.createElement('div');
    track.className = 'endless-trial-hud-track';
    const fillEl = document.createElement('div');
    fillEl.className = 'endless-trial-hud-fill';
    track.appendChild(fillEl);

    hud.appendChild(row);
    hud.appendChild(track);
    (parentStack || this.root).appendChild(hud);

    this._refs.trialHud = hud;
    this._refs.trialHudIcon = iconEl;
    this._refs.trialHudName = nameEl;
    this._refs.trialHudTimer = timerEl;
    this._refs.trialHudScore = scoreEl;
    this._refs.trialHudExitBtn = exitBtn;
    this._refs.trialHudFill = fillEl;
  }

  _buildActivePartyHud() {
    const partyHud = document.createElement('div');
    partyHud.className = 'endless-party-hud hidden';
    partyHud.setAttribute('aria-label', 'Active Companion Party');

    const strip = document.createElement('div');
    strip.className = 'endless-party-strip';

    this._partySlotRefs = [];
    for (let i = 0; i < 3; i++) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'endless-party-card hidden';
      card.dataset.slotIndex = String(i);
      stopEventLeak(card);

      const portWrap = document.createElement('div');
      portWrap.className = 'endless-party-port-wrap';

      const portCanvas = document.createElement('canvas');
      portCanvas.width = 28;
      portCanvas.height = 28;
      portCanvas.className = 'endless-party-portrait';
      portCanvas.setAttribute('aria-hidden', 'true');
      portWrap.appendChild(portCanvas);

      const starBadge = document.createElement('span');
      starBadge.className = 'endless-party-star hidden';
      const starIco = document.createElement('span');
      starIco.className = 'endless-party-star-ico';
      starIco.innerHTML = STAR_ON_SVG;
      const starTxt = document.createElement('span');
      starTxt.textContent = 'S2';
      starBadge.appendChild(starIco);
      starBadge.appendChild(starTxt);
      portWrap.appendChild(starBadge);

      const meta = document.createElement('div');
      meta.className = 'endless-party-meta';

      const head = document.createElement('div');
      head.className = 'endless-party-head';
      const nameEl = document.createElement('span');
      nameEl.className = 'endless-party-name';
      nameEl.textContent = 'ALLY';
      const lvEl = document.createElement('span');
      lvEl.className = 'endless-party-lv';
      lvEl.textContent = 'LV.1';
      head.appendChild(nameEl);
      head.appendChild(lvEl);

      const ultRow = document.createElement('div');
      ultRow.className = 'endless-party-ult-row';
      const ultTrack = document.createElement('div');
      ultTrack.className = 'endless-party-ult-track';
      const ultFill = document.createElement('div');
      ultFill.className = 'endless-party-ult-fill';
      ultTrack.appendChild(ultFill);
      const ultTag = document.createElement('span');
      ultTag.className = 'endless-party-ult-tag';
      ultTag.textContent = '0%';
      ultRow.appendChild(ultTrack);
      ultRow.appendChild(ultTag);

      meta.appendChild(head);
      meta.appendChild(ultRow);

      card.appendChild(portWrap);
      card.appendChild(meta);

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this._playSfx('playUiClick');
        this.setActiveTab('companions');
        this.setDrawerOpen(true);
      });

      strip.appendChild(card);
      this._partySlotRefs.push({
        card,
        portWrap,
        portCanvas,
        starBadge,
        starTxt,
        nameEl,
        lvEl,
        ultFill,
        ultTag
      });
    }

    const synHud = document.createElement('div');
    synHud.className = 'endless-synergy-hud hidden';
    synHud.setAttribute('aria-label', 'Active Party Synergies');
    stopEventLeak(synHud);

    const synChip = document.createElement('button');
    synChip.type = 'button';
    synChip.className = 'endless-party-syn-chip hidden';
    synChip.setAttribute('aria-label', 'Active Party Synergies');
    stopEventLeak(synChip);
    const synChipIco = document.createElement('span');
    synChipIco.className = 'endless-party-syn-chip-ico';
    synChipIco.innerHTML = SYNERGY_DIAMOND_SVG;
    const synChipTxt = document.createElement('span');
    synChipTxt.className = 'endless-party-syn-chip-txt';
    synChipTxt.textContent = '0 SYN';
    synChip.appendChild(synChipIco);
    synChip.appendChild(synChipTxt);
    synChip.addEventListener('click', (e) => {
      e.stopPropagation();
      this._playSfx('playUiClick');
      this.setActiveTab('companions');
      this.setDrawerOpen(true);
    });

    const overdriveBtn = document.createElement('button');
    overdriveBtn.type = 'button';
    overdriveBtn.className = 'endless-overdrive-btn hidden';
    overdriveBtn.setAttribute('aria-label', 'Squad Overdrive');
    overdriveBtn.disabled = true;
    stopEventLeak(overdriveBtn);

    const overdriveFill = document.createElement('div');
    overdriveFill.className = 'endless-overdrive-fill';

    const overdriveContent = document.createElement('span');
    overdriveContent.className = 'endless-overdrive-content';

    const overdriveIcon = document.createElement('span');
    overdriveIcon.className = 'endless-overdrive-icon';
    overdriveIcon.innerHTML = OVERDRIVE_BOLT_SVG;

    const overdriveLabel = document.createElement('span');
    overdriveLabel.className = 'endless-overdrive-label';
    overdriveLabel.textContent = 'OVERDRIVE 0%';

    const overdriveLabelShort = document.createElement('span');
    overdriveLabelShort.className = 'endless-overdrive-label-short';
    overdriveLabelShort.textContent = 'OD 0%';

    overdriveContent.appendChild(overdriveIcon);
    overdriveContent.appendChild(overdriveLabel);
    overdriveContent.appendChild(overdriveLabelShort);
    overdriveBtn.appendChild(overdriveFill);
    overdriveBtn.appendChild(overdriveContent);

    overdriveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleTriggerSquadOverdrive();
    });

    partyHud.appendChild(strip);
    partyHud.appendChild(synHud);
    partyHud.appendChild(synChip);
    partyHud.appendChild(overdriveBtn);
    this.root.appendChild(partyHud);

    this._refs.partyHud = partyHud;
    this._refs.partyStrip = strip;
    this._refs.synergyHud = synHud;
    this._refs.partySynChip = synChip;
    this._refs.partySynChipTxt = synChipTxt;
    this._refs.overdriveBtn = overdriveBtn;
    this._refs.overdriveFill = overdriveFill;
    this._refs.overdriveLabel = overdriveLabel;
    this._refs.overdriveLabelShort = overdriveLabelShort;
  }

  _buildEventsDock() {
    const dock = document.createElement('div');
    dock.className = 'endless-events-dock hidden';
    dock.setAttribute('aria-label', 'Crusade Bounties, Shrine Buffs, and Merchant');

    // Widget A: Compact Bounty Tracker Pill
    const bountyPill = document.createElement('button');
    bountyPill.type = 'button';
    bountyPill.className = 'endless-bounty-pill hidden';
    bountyPill.setAttribute('aria-label', 'Active Mini-Bounty');
    bountyPill.setAttribute('aria-disabled', 'true');
    stopEventLeak(bountyPill);

    const bountyTop = document.createElement('div');
    bountyTop.className = 'endless-bounty-top';

    const bountyLead = document.createElement('div');
    bountyLead.className = 'endless-bounty-lead';

    const bountyIcon = document.createElement('span');
    bountyIcon.className = 'endless-bounty-icon';
    bountyIcon.innerHTML = BOUNTY_SVG;

    const bountyLabel = document.createElement('span');
    bountyLabel.className = 'endless-bounty-label';
    bountyLabel.textContent = 'SLAY 0/15';

    bountyLead.appendChild(bountyIcon);
    bountyLead.appendChild(bountyLabel);

    const bountyCta = document.createElement('span');
    bountyCta.className = 'endless-bounty-cta';
    bountyCta.textContent = '+0G';

    bountyTop.appendChild(bountyLead);
    bountyTop.appendChild(bountyCta);

    const bountyTrack = document.createElement('div');
    bountyTrack.className = 'endless-bounty-track';
    const bountyFill = document.createElement('div');
    bountyFill.className = 'endless-bounty-fill';
    bountyTrack.appendChild(bountyFill);

    bountyPill.appendChild(bountyTop);
    bountyPill.appendChild(bountyTrack);

    bountyPill.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleClaimActiveBounty();
    });

    // Widget B: Active Shrine / Elixir Buff Timer Strip
    const buffStrip = document.createElement('div');
    buffStrip.className = 'endless-buff-strip hidden';
    buffStrip.setAttribute('aria-label', 'Active Shrine and Elixir Buffs');

    // Widget C: Wandering Merchant Pop-Offer Strip
    const merchantCard = document.createElement('div');
    merchantCard.className = 'endless-merchant-card hidden';
    merchantCard.setAttribute('aria-label', 'Wandering Arcane Merchant Offer');
    stopEventLeak(merchantCard);

    const merchantHead = document.createElement('div');
    merchantHead.className = 'endless-merchant-head';

    const merchantTitleWrap = document.createElement('div');
    merchantTitleWrap.className = 'endless-merchant-title-wrap';

    const merchantIcon = document.createElement('span');
    merchantIcon.className = 'endless-merchant-icon';
    merchantIcon.innerHTML = MERCHANT_SVG;

    const merchantTitle = document.createElement('span');
    merchantTitle.className = 'endless-merchant-title';
    merchantTitle.textContent = 'ARCANE MERCHANT';

    merchantTitleWrap.appendChild(merchantIcon);
    merchantTitleWrap.appendChild(merchantTitle);

    const merchantHeadRight = document.createElement('div');
    merchantHeadRight.className = 'endless-merchant-head-right';

    const merchantTimer = document.createElement('span');
    merchantTimer.className = 'endless-merchant-timer';
    merchantTimer.textContent = '20S';

    const merchantClose = document.createElement('button');
    merchantClose.type = 'button';
    merchantClose.className = 'endless-merchant-close';
    merchantClose.setAttribute('aria-label', 'Dismiss merchant offer');
    merchantClose.innerHTML = CLOSE_SVG;
    merchantClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleDismissMerchantOffer();
    });

    merchantHeadRight.appendChild(merchantTimer);
    merchantHeadRight.appendChild(merchantClose);

    merchantHead.appendChild(merchantTitleWrap);
    merchantHead.appendChild(merchantHeadRight);

    const merchantSub = document.createElement('div');
    merchantSub.className = 'endless-merchant-sub';
    merchantSub.textContent = 'LIMITED OFFER';

    const merchantTrack = document.createElement('div');
    merchantTrack.className = 'endless-merchant-track';
    const merchantFill = document.createElement('div');
    merchantFill.className = 'endless-merchant-fill';
    merchantTrack.appendChild(merchantFill);

    const merchantBuyBtn = document.createElement('button');
    merchantBuyBtn.type = 'button';
    merchantBuyBtn.className = 'endless-merchant-buy-btn';
    merchantBuyBtn.textContent = 'BUY 0G';
    merchantBuyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleBuyMerchantOffer();
    });

    merchantCard.appendChild(merchantHead);
    merchantCard.appendChild(merchantSub);
    merchantCard.appendChild(merchantTrack);
    merchantCard.appendChild(merchantBuyBtn);

    dock.appendChild(bountyPill);
    dock.appendChild(buffStrip);
    dock.appendChild(merchantCard);
    this.root.appendChild(dock);

    this._refs.eventsDock = dock;
    this._refs.bountyPill = bountyPill;
    this._refs.bountyLabel = bountyLabel;
    this._refs.bountyCta = bountyCta;
    this._refs.bountyFill = bountyFill;
    this._refs.buffStrip = buffStrip;
    this._refs.merchantCard = merchantCard;
    this._refs.merchantTitle = merchantTitle;
    this._refs.merchantTimer = merchantTimer;
    this._refs.merchantClose = merchantClose;
    this._refs.merchantSub = merchantSub;
    this._refs.merchantFill = merchantFill;
    this._refs.merchantBuyBtn = merchantBuyBtn;
  }

  _buildFxLayer() {
    const fxLayer = document.createElement('div');
    fxLayer.className = 'endless-fx-layer';
    fxLayer.setAttribute('aria-hidden', 'true');
    this.root.appendChild(fxLayer);
    this._refs.fxLayer = fxLayer;
  }

  _buildOfflineLootModal() {
    const modal = document.createElement('div');
    modal.className = 'endless-offline-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Welcome Back Offline Crusade Loot');
    stopEventLeak(modal);

    const card = document.createElement('div');
    card.className = 'endless-offline-card';
    stopEventLeak(card);

    // Header
    const header = document.createElement('div');
    header.className = 'endless-offline-header';
    const title = document.createElement('div');
    title.className = 'endless-offline-title';
    title.innerHTML = `${BOSS_CROWN_SVG}<span>WELCOME BACK, CRUSADER</span>${BOSS_CROWN_SVG}`;
    const subtitle = document.createElement('div');
    subtitle.className = 'endless-offline-subtitle';
    subtitle.textContent = 'YOUR CRUSADE MARCHED ON WHILE YOU WERE AWAY';
    header.appendChild(title);
    header.appendChild(subtitle);

    // Away Time / Cap / Stages Badges
    const badges = document.createElement('div');
    badges.className = 'endless-offline-badges';
    const awayBadge = document.createElement('span');
    awayBadge.className = 'endless-offline-away-badge';
    awayBadge.textContent = 'AWAY: 0M';
    const capBadge = document.createElement('span');
    capBadge.className = 'endless-offline-cap-badge hidden';
    capBadge.textContent = '12H MAX CAP';
    const stagesBadge = document.createElement('span');
    stagesBadge.className = 'endless-offline-stages-badge hidden';
    stagesBadge.textContent = '1 STAGE SIMULATED';
    badges.appendChild(awayBadge);
    badges.appendChild(capBadge);
    badges.appendChild(stagesBadge);

    // Reward Plaques: Sovereign Gold & Astral Shards
    const rewards = document.createElement('div');
    rewards.className = 'endless-offline-rewards';

    const goldPlaque = document.createElement('div');
    goldPlaque.className = 'endless-offline-plaque is-gold';
    const goldIcon = this._makeIconCanvas(32, 0, '#facc15', 'endless-offline-plaque-icon', ENDLESS_ICON_ROW);
    const goldMeta = document.createElement('div');
    goldMeta.className = 'endless-offline-plaque-meta';
    const goldVal = document.createElement('div');
    goldVal.className = 'endless-offline-plaque-val';
    goldVal.textContent = '+0 GOLD';
    const goldLbl = document.createElement('div');
    goldLbl.className = 'endless-offline-plaque-lbl';
    goldLbl.textContent = 'SOVEREIGN GOLD';
    goldMeta.appendChild(goldVal);
    goldMeta.appendChild(goldLbl);
    goldPlaque.appendChild(goldIcon);
    goldPlaque.appendChild(goldMeta);

    const shardPlaque = document.createElement('div');
    shardPlaque.className = 'endless-offline-plaque is-shard';
    const shardIcon = this._makeIconCanvas(32, 1, '#38bdf8', 'endless-offline-plaque-icon', ENDLESS_ICON_ROW);
    const shardMeta = document.createElement('div');
    shardMeta.className = 'endless-offline-plaque-meta';
    const shardVal = document.createElement('div');
    shardVal.className = 'endless-offline-plaque-val';
    shardVal.textContent = '+0 SHARDS';
    const shardLbl = document.createElement('div');
    shardLbl.className = 'endless-offline-plaque-lbl';
    shardLbl.textContent = 'ASTRAL SHARDS';
    shardMeta.appendChild(shardVal);
    shardMeta.appendChild(shardLbl);
    shardPlaque.appendChild(shardIcon);
    shardPlaque.appendChild(shardMeta);

    rewards.appendChild(goldPlaque);
    rewards.appendChild(shardPlaque);

    // Actions: COLLECT LOOT (Primary) + CONTINUE (Secondary — still claims so gold is never forfeited!)
    const actions = document.createElement('div');
    actions.className = 'endless-offline-actions';

    const collectBtn = document.createElement('button');
    collectBtn.type = 'button';
    collectBtn.className = 'endless-offline-collect-btn';
    collectBtn.textContent = 'COLLECT LOOT';
    collectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleCollectOfflineLoot();
    });

    const continueBtn = document.createElement('button');
    continueBtn.type = 'button';
    continueBtn.className = 'endless-offline-continue-btn';
    continueBtn.textContent = 'CONTINUE';
    continueBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleContinueOfflineLoot();
    });

    actions.appendChild(collectBtn);
    actions.appendChild(continueBtn);

    card.appendChild(header);
    card.appendChild(badges);
    card.appendChild(rewards);
    card.appendChild(actions);
    modal.appendChild(card);
    this.root.appendChild(modal);

    this._refs.offlineModal = modal;
    this._refs.offlineCard = card;
    this._refs.offlineAwayBadge = awayBadge;
    this._refs.offlineCapBadge = capBadge;
    this._refs.offlineStagesBadge = stagesBadge;
    this._refs.offlineGoldPlaque = goldPlaque;
    this._refs.offlineGoldVal = goldVal;
    this._refs.offlineShardPlaque = shardPlaque;
    this._refs.offlineShardVal = shardVal;
    this._refs.offlineCollectBtn = collectBtn;
    this._refs.offlineContinueBtn = continueBtn;
  }

  _buildTrialResultModal() {
    const modal = document.createElement('div');
    modal.className = 'endless-trial-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Challenge Trial Reward Summary');
    stopEventLeak(modal);

    const card = document.createElement('div');
    card.className = 'endless-trial-modal-card';
    stopEventLeak(card);

    const header = document.createElement('div');
    header.className = 'endless-trial-modal-header';

    const statusBadge = document.createElement('div');
    statusBadge.className = 'endless-trial-modal-status';
    statusBadge.textContent = 'TRIAL COMPLETE!';

    const titleRow = document.createElement('div');
    titleRow.className = 'endless-trial-modal-title-row';

    const iconEl = document.createElement('span');
    iconEl.className = 'endless-trial-modal-icon';
    iconEl.innerHTML = TRIAL_VAULT_SVG;

    const titleEl = document.createElement('span');
    titleEl.className = 'endless-trial-modal-title';
    titleEl.textContent = 'GILDED VAULT SPRINT';

    titleRow.appendChild(iconEl);
    titleRow.appendChild(titleEl);

    const perfEl = document.createElement('div');
    perfEl.className = 'endless-trial-modal-perf';
    perfEl.textContent = 'GOBLINS 0 | CHESTS 0 | 30.0S';

    header.appendChild(statusBadge);
    header.appendChild(titleRow);
    header.appendChild(perfEl);

    // 3-Column Rewards Grid (+GOLD, +SHARDS, +FORGE DUST)
    const rewards = document.createElement('div');
    rewards.className = 'endless-trial-modal-rewards';

    const makeRewardPlaque = (cls, lbl, iconNode) => {
      const plaque = document.createElement('div');
      plaque.className = `endless-trial-reward-plaque ${cls}`;
      const icoWrap = document.createElement('div');
      icoWrap.className = 'endless-trial-reward-ico';
      if (typeof iconNode === 'string') {
        icoWrap.innerHTML = iconNode;
      } else if (iconNode) {
        icoWrap.appendChild(iconNode);
      }
      const meta = document.createElement('div');
      meta.className = 'endless-trial-reward-meta';
      const valEl = document.createElement('div');
      valEl.className = 'endless-trial-reward-val';
      valEl.textContent = '+0';
      const lblEl = document.createElement('div');
      lblEl.className = 'endless-trial-reward-lbl';
      lblEl.textContent = lbl;
      meta.appendChild(valEl);
      meta.appendChild(lblEl);
      plaque.appendChild(icoWrap);
      plaque.appendChild(meta);
      rewards.appendChild(plaque);
      return { plaque, valEl };
    };

    const goldIcon = this._makeIconCanvas(24, 0, '#facc15', '', ENDLESS_ICON_ROW);
    const shardIcon = this._makeIconCanvas(24, 1, '#38bdf8', '', ENDLESS_ICON_ROW);
    const goldRef = makeRewardPlaque('is-gold', 'GOLD', goldIcon);
    const shardRef = makeRewardPlaque('is-shard', 'SHARDS', shardIcon);
    const dustRef = makeRewardPlaque('is-dust', 'FORGE DUST', FORGE_DUST_SVG);

    // Gear Drops Container
    const gearBox = document.createElement('div');
    gearBox.className = 'endless-trial-modal-gear hidden';

    const gearHead = document.createElement('div');
    gearHead.className = 'endless-trial-modal-gear-head';
    gearHead.textContent = 'GEAR AWARDED';

    const gearList = document.createElement('div');
    gearList.className = 'endless-trial-modal-gear-list';

    gearBox.appendChild(gearHead);
    gearBox.appendChild(gearList);

    // Collect & Resume CTA
    const collectBtn = document.createElement('button');
    collectBtn.type = 'button';
    collectBtn.className = 'endless-trial-collect-btn';
    collectBtn.textContent = 'COLLECT & RESUME';
    collectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleDismissTrialResult();
    });

    card.appendChild(header);
    card.appendChild(rewards);
    card.appendChild(gearBox);
    card.appendChild(collectBtn);
    modal.appendChild(card);
    this.root.appendChild(modal);

    this._refs.trialModal = modal;
    this._refs.trialModalCard = card;
    this._refs.trialModalStatus = statusBadge;
    this._refs.trialModalIcon = iconEl;
    this._refs.trialModalTitle = titleEl;
    this._refs.trialModalPerf = perfEl;
    this._refs.trialModalGoldPlaque = goldRef.plaque;
    this._refs.trialModalGoldVal = goldRef.valEl;
    this._refs.trialModalShardPlaque = shardRef.plaque;
    this._refs.trialModalShardVal = shardRef.valEl;
    this._refs.trialModalDustPlaque = dustRef.plaque;
    this._refs.trialModalDustVal = dustRef.valEl;
    this._refs.trialModalGearBox = gearBox;
    this._refs.trialModalGearList = gearList;
    this._refs.trialModalCollectBtn = collectBtn;
  }

  _buildShopToggle(parentEl = null) {
    const toggle = document.createElement('button');
    toggle.id = 'endless-shop-toggle';
    toggle.type = 'button';
    toggle.className = 'endless-shop-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    stopEventLeak(toggle);

    const icon = this._makeIconCanvas(32, 11, '#facc15', 'endless-toggle-icon');
    const labelFull = document.createElement('span');
    labelFull.className = 'endless-toggle-label-full';
    labelFull.textContent = 'CRUSADE SHOP';
    const labelShort = document.createElement('span');
    labelShort.className = 'endless-toggle-label-short';
    labelShort.textContent = 'SHOP';
    const dot = document.createElement('span');
    dot.className = 'endless-affordable-dot hidden';
    dot.setAttribute('aria-hidden', 'true');

    const eventDot = document.createElement('span');
    eventDot.className = 'endless-event-alert-dot';
    eventDot.setAttribute('aria-hidden', 'true');
    eventDot.title = 'Active Bounty or Wandering Merchant waiting';

    toggle.appendChild(icon);
    toggle.appendChild(labelFull);
    toggle.appendChild(labelShort);
    toggle.appendChild(dot);
    toggle.appendChild(eventDot);

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDrawer();
    });

    (parentEl || this.root).appendChild(toggle);
    this._refs.shopToggle = toggle;
    this._refs.affordableDot = dot;
    this._refs.eventAlertDot = eventDot;
  }

  _buildShopDrawer() {
    const shell = document.createElement('aside');
    shell.className = 'endless-shop-shell hidden';
    shell.setAttribute('aria-label', 'Endless Crusade Shop Drawer');
    stopEventLeak(shell);

    // Drawer Header
    const header = document.createElement('div');
    header.className = 'endless-drawer-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'endless-drawer-title-wrap';
    const titleIcon = this._makeIconCanvas(32, 11, '#facc15', 'endless-currency-icon');
    const title = document.createElement('span');
    title.className = 'endless-drawer-title';
    title.textContent = 'CRUSADE ARMORY';
    titleWrap.appendChild(titleIcon);
    titleWrap.appendChild(title);

    const headerActions = document.createElement('div');
    headerActions.className = 'endless-drawer-header-actions';

    const drawerAutoBossBtn = document.createElement('button');
    drawerAutoBossBtn.type = 'button';
    drawerAutoBossBtn.className = 'endless-autoboss-btn endless-drawer-autoboss-btn is-on';
    drawerAutoBossBtn.textContent = 'AUTO-BOSS: ON';
    drawerAutoBossBtn.title = 'Toggle automatic Stage Boss challenge';
    drawerAutoBossBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleToggleAutoBoss();
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'endless-drawer-close';
    closeBtn.setAttribute('aria-label', 'Close Crusade Shop');
    closeBtn.innerHTML = CLOSE_SVG;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setDrawerOpen(false);
    });

    headerActions.appendChild(drawerAutoBossBtn);
    headerActions.appendChild(closeBtn);

    header.appendChild(titleWrap);
    header.appendChild(headerActions);
    this._refs.drawerAutoBossBtn = drawerAutoBossBtn;

    // Tab Bar
    const tabBar = document.createElement('div');
    tabBar.className = 'endless-tab-bar';
    tabBar.setAttribute('role', 'tablist');

    // Drawer Body
    const body = document.createElement('div');
    body.className = 'endless-drawer-body';

    // Compact Live Expandable Telemetry Footer Strip
    const telemetry = document.createElement('div');
    telemetry.className = 'endless-drawer-telemetry';

    const telemTop = document.createElement('div');
    telemTop.className = 'endless-telem-top';

    const telemMetrics = document.createElement('div');
    telemMetrics.className = 'endless-telem-metrics';

    const dpsPair = document.createElement('span');
    dpsPair.className = 'endless-telem-pair';
    const dpsKey = document.createElement('span');
    dpsKey.className = 'endless-telem-key';
    dpsKey.textContent = 'DPS';
    const dpsVal = document.createElement('span');
    dpsVal.className = 'endless-telem-val';
    dpsVal.textContent = '0';
    dpsPair.appendChild(dpsKey);
    dpsPair.appendChild(dpsVal);

    const goldPair = document.createElement('span');
    goldPair.className = 'endless-telem-pair';
    const goldKey = document.createElement('span');
    goldKey.className = 'endless-telem-key';
    goldKey.textContent = 'G/S';
    const goldVal = document.createElement('span');
    goldVal.className = 'endless-telem-val is-gold';
    goldVal.textContent = '0';
    goldPair.appendChild(goldKey);
    goldPair.appendChild(goldVal);

    telemMetrics.appendChild(dpsPair);
    telemMetrics.appendChild(goldPair);

    const telemExpandBtn = document.createElement('button');
    telemExpandBtn.type = 'button';
    telemExpandBtn.className = 'endless-telem-expand-btn';
    telemExpandBtn.setAttribute('aria-expanded', this._telemExpanded ? 'true' : 'false');
    telemExpandBtn.textContent = this._telemExpanded ? 'HIDE' : 'SPLIT';
    telemExpandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._playSfx('playUiClick');
      this._telemExpanded = !this._telemExpanded;
      if (this._refs.telemDetails) {
        this._refs.telemDetails.classList.toggle('hidden', !this._telemExpanded);
      }
      telemExpandBtn.setAttribute('aria-expanded', this._telemExpanded ? 'true' : 'false');
      setTextIfChanged(telemExpandBtn, this._telemExpanded ? 'HIDE' : 'SPLIT');
    });

    telemTop.appendChild(telemMetrics);
    telemTop.appendChild(telemExpandBtn);

    const telemTrack = document.createElement('div');
    telemTrack.className = 'endless-dps-bar-track is-slim';
    const telemSegHero = document.createElement('div');
    telemSegHero.className = 'endless-dps-seg is-hero';
    const telemSegTap = document.createElement('div');
    telemSegTap.className = 'endless-dps-seg is-tap';
    const telemSegParty = document.createElement('div');
    telemSegParty.className = 'endless-dps-seg is-party';
    telemTrack.appendChild(telemSegHero);
    telemTrack.appendChild(telemSegTap);
    telemTrack.appendChild(telemSegParty);

    const telemDetails = document.createElement('div');
    telemDetails.className = this._telemExpanded ? 'endless-telem-details' : 'endless-telem-details hidden';

    const makeTelemChip = (cls, lbl) => {
      const chip = document.createElement('div');
      chip.className = `endless-telem-chip ${cls}`;
      const k = document.createElement('span');
      k.className = 'endless-telem-chip-lbl';
      k.textContent = lbl;
      const v = document.createElement('span');
      v.className = 'endless-telem-chip-val';
      v.textContent = '0 (0%)';
      chip.appendChild(k);
      chip.appendChild(v);
      telemDetails.appendChild(chip);
      return v;
    };

    const telemHeroVal = makeTelemChip('is-hero', 'HERO');
    const telemTapVal = makeTelemChip('is-tap', 'TAP');
    const telemPartyVal = makeTelemChip('is-party', 'PARTY');

    telemetry.appendChild(telemTop);
    telemetry.appendChild(telemTrack);
    telemetry.appendChild(telemDetails);

    shell.appendChild(header);
    shell.appendChild(tabBar);
    shell.appendChild(body);
    shell.appendChild(telemetry);
    this.root.appendChild(shell);

    this._refs.shopShell = shell;
    this._refs.tabBar = tabBar;
    this._refs.drawerBody = body;
    this._refs.telemDpsVal = dpsVal;
    this._refs.telemGoldVal = goldVal;
    this._refs.telemExpandBtn = telemExpandBtn;
    this._refs.telemDetails = telemDetails;
    this._refs.telemSegHero = telemSegHero;
    this._refs.telemSegTap = telemSegTap;
    this._refs.telemSegParty = telemSegParty;
    this._refs.telemHeroVal = telemHeroVal;
    this._refs.telemTapVal = telemTapVal;
    this._refs.telemPartyVal = telemPartyVal;

    for (let i = 0; i < this.tabs.length; i++) {
      this._ensureTabElements(this.tabs[i]);
    }
  }

  _ensureTabElements(tabDef) {
    if (!this._refs.tabBar || !this._refs.drawerBody) return;

    let btn = this._tabBtnRefs.get(tabDef.id);
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'endless-tab-btn';
      btn.setAttribute('role', 'tab');
      btn.dataset.tabId = tabDef.id;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'endless-tab-label';
      labelSpan.textContent = tabDef.label;
      btn.appendChild(labelSpan);
      btn._labelSpan = labelSpan;

      if (tabDef.id === 'items') {
        const dot = document.createElement('span');
        dot.className = 'endless-tab-dot is-items hidden';
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
        this._refs.itemsTabDot = dot;
      }

      if (tabDef.id === 'gear') {
        const dot = document.createElement('span');
        dot.className = 'endless-tab-dot is-gear hidden';
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
        this._refs.gearTabDot = dot;
      }

      if (tabDef.id === 'companions') {
        const dot = document.createElement('span');
        dot.className = 'endless-tab-dot is-allies hidden';
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
        this._refs.companionsTabDot = dot;
      }

      if (tabDef.id === 'ascend') {
        const dot = document.createElement('span');
        dot.className = 'endless-tab-dot is-ascend hidden';
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
        this._refs.ascendTabDot = dot;
      }

      if (tabDef.id === 'trials') {
        const dot = document.createElement('span');
        dot.className = 'endless-tab-dot is-trials hidden';
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
        this._refs.trialsTabDot = dot;
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setActiveTab(tabDef.id);
      });
      this._refs.tabBar.appendChild(btn);
      this._tabBtnRefs.set(tabDef.id, btn);
    } else {
      setTextIfChanged(btn._labelSpan || btn, tabDef.label);
    }

    let panel = this._tabPanelRefs.get(tabDef.id);
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'endless-tab-panel hidden';
      panel.dataset.tabPanel = tabDef.id;
      this._refs.drawerBody.appendChild(panel);
      this._tabPanelRefs.set(tabDef.id, panel);

      if (tabDef.id === 'items') {
        this._buildItemsPanel(panel);
      } else if (tabDef.id === 'gear') {
        this._buildGearPanel(panel);
      } else if (tabDef.id === 'companions') {
        this._buildCompanionsPanel(panel);
      } else if (tabDef.id === 'ascend') {
        this._buildAscendPanel(panel);
      } else if (tabDef.id === 'trials') {
        this._buildTrialsPanel(panel);
      } else if (tabDef.id === 'stats') {
        this._buildStatsPanel(panel);
      } else if (typeof tabDef.renderContent === 'function') {
        tabDef.renderContent(panel, this);
      }
    }
  }

  _buildItemsPanel(panel) {
    const bulkBar = document.createElement('div');
    bulkBar.className = 'endless-bulk-bar';

    const bulkLabel = document.createElement('span');
    bulkLabel.className = 'endless-bulk-label';
    bulkLabel.textContent = 'BULK BUY';

    const bulkGroup = document.createElement('div');
    bulkGroup.className = 'endless-bulk-group';

    const modes = ['x1', 'x10', 'MAX'];
    for (let i = 0; i < modes.length; i++) {
      const mode = modes[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = mode === 'x1' ? 'endless-bulk-btn is-active' : 'endless-bulk-btn';
      b.dataset.bulkMode = mode;
      b.textContent = mode.toUpperCase();
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleSetBulkMode(mode);
      });
      bulkGroup.appendChild(b);
      this._bulkBtnRefs.set(mode, b);
    }

    bulkBar.appendChild(bulkLabel);
    bulkBar.appendChild(bulkGroup);

    // Wave 4: Compact Relic Set Synergies strip (Row 9 Cols 4/5/6)
    const setsStrip = document.createElement('div');
    setsStrip.className = 'endless-relic-sets-strip';
    this._relicSetPillRefs = new Map();
    for (let i = 0; i < ENDLESS_RELIC_SETS.length; i++) {
      const setDef = ENDLESS_RELIC_SETS[i];
      const pill = document.createElement('div');
      pill.className = 'endless-relic-set-pill';
      pill.dataset.setId = setDef.id;
      pill.title = `${setDef.name}: ALL LV.${setDef.tiers[0].minLevel} -> ${setDef.tiers[0].bonusDesc}`;

      const head = document.createElement('div');
      head.className = 'endless-relic-set-head';
      const iconCanvas = this._makeIconCanvas(
        24,
        setDef.sigilCol,
        setDef.color,
        'endless-relic-set-icon',
        ENDLESS_SIGIL_ROW
      );
      const nameSpan = document.createElement('span');
      nameSpan.className = 'endless-relic-set-name';
      nameSpan.textContent = setDef.name.replace("'S ", ' ');
      head.appendChild(iconCanvas);
      head.appendChild(nameSpan);

      const foot = document.createElement('div');
      foot.className = 'endless-relic-set-foot';
      const tierSpan = document.createElement('span');
      tierSpan.className = 'endless-relic-set-tier';
      tierSpan.textContent = 'LOCKED';
      const lvSpan = document.createElement('span');
      lvSpan.className = 'endless-relic-set-lv';
      lvSpan.textContent = `0/${setDef.tiers[0].minLevel}`;
      foot.appendChild(tierSpan);
      foot.appendChild(lvSpan);

      pill.appendChild(head);
      pill.appendChild(foot);
      setsStrip.appendChild(pill);
      this._relicSetPillRefs.set(setDef.id, { pill, tierSpan, lvSpan, def: setDef });
    }

    const list = document.createElement('div');
    list.className = 'endless-scroll-list';

    for (let i = 0; i < ENDLESS_RELICS.length; i++) {
      const relic = ENDLESS_RELICS[i];
      const row = document.createElement('div');
      row.className = 'endless-relic-row';
      row.dataset.relicId = relic.id;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'endless-relic-icon-wrap';
      iconWrap.style.borderColor = relic.accentHex;
      const iconCanvas = this._makeIconCanvas(32, relic.iconCol, relic.accentHex, 'endless-relic-icon');
      iconWrap.appendChild(iconCanvas);

      const info = document.createElement('div');
      info.className = 'endless-relic-info';

      const head = document.createElement('div');
      head.className = 'endless-relic-head';
      const nameEl = document.createElement('span');
      nameEl.className = 'endless-relic-name';
      nameEl.textContent = relic.name;
      const lvEl = document.createElement('span');
      lvEl.className = 'endless-relic-lv';
      lvEl.textContent = 'LV.0';
      const milestoneEl = document.createElement('span');
      milestoneEl.className = 'endless-relic-milestone';
      milestoneEl.textContent = 'LV.10 X1.5';
      head.appendChild(nameEl);
      head.appendChild(lvEl);
      head.appendChild(milestoneEl);

      const bonusEl = document.createElement('div');
      bonusEl.className = 'endless-relic-bonus';
      bonusEl.textContent = relic.formatBonus(0);

      const subEl = document.createElement('div');
      subEl.className = 'endless-relic-sub';
      subEl.textContent = relic.shortDesc;

      info.appendChild(head);
      info.appendChild(bonusEl);
      info.appendChild(subEl);

      const buyBtn = document.createElement('button');
      buyBtn.type = 'button';
      buyBtn.className = 'endless-buy-btn';
      buyBtn.dataset.relicId = relic.id;

      const countSpan = document.createElement('span');
      countSpan.className = 'endless-buy-count';
      countSpan.textContent = '+1';

      const costSpan = document.createElement('span');
      costSpan.className = 'endless-buy-cost';
      costSpan.textContent = `${formatEndlessNumber(relic.baseCost)}G`;

      buyBtn.appendChild(countSpan);
      buyBtn.appendChild(costSpan);

      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleBuyRelic(relic.id);
      });

      row.appendChild(iconWrap);
      row.appendChild(info);
      row.appendChild(buyBtn);
      list.appendChild(row);

      this._relicRowRefs.set(relic.id, {
        row,
        lvEl,
        milestoneEl,
        bonusEl,
        buyBtn,
        countSpan,
        costSpan
      });
    }

    panel.appendChild(bulkBar);
    panel.appendChild(setsStrip);
    panel.appendChild(list);
  }

  _buildGearPanel(panel) {
    // 1. Pinned Gear Forge Header Strip
    const header = document.createElement('div');
    header.className = 'endless-gear-header';

    const metricsRow = document.createElement('div');
    metricsRow.className = 'endless-gear-metrics-row';

    const dustMetric = document.createElement('div');
    dustMetric.className = 'endless-gear-metric is-dust';
    dustMetric.title = 'Forge Dust used to enhance equipped or bagged gear up to +20';
    const dustLeft = document.createElement('span');
    dustLeft.className = 'endless-gear-metric-left';
    const dustIcon = document.createElement('span');
    dustIcon.innerHTML = FORGE_DUST_SVG;
    const dustLbl = document.createElement('span');
    dustLbl.className = 'endless-gear-metric-lbl';
    dustLbl.textContent = 'FORGE DUST';
    dustLeft.appendChild(dustIcon);
    dustLeft.appendChild(dustLbl);
    const dustVal = document.createElement('span');
    dustVal.className = 'endless-gear-metric-val';
    dustVal.textContent = '0';
    dustMetric.appendChild(dustLeft);
    dustMetric.appendChild(dustVal);

    const powerMetric = document.createElement('div');
    powerMetric.className = 'endless-gear-metric is-power';
    powerMetric.title = 'Combined Gear Power across all 4 equipped slots';
    const powerLbl = document.createElement('span');
    powerLbl.className = 'endless-gear-metric-lbl';
    powerLbl.textContent = 'GEAR POWER';
    const powerVal = document.createElement('span');
    powerVal.className = 'endless-gear-metric-val';
    powerVal.textContent = '0';
    powerMetric.appendChild(powerLbl);
    powerMetric.appendChild(powerVal);

    metricsRow.appendChild(dustMetric);
    metricsRow.appendChild(powerMetric);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'endless-gear-actions-row';

    const equipBestBtn = document.createElement('button');
    equipBestBtn.type = 'button';
    equipBestBtn.className = 'endless-gear-hdr-btn is-equip-best';
    equipBestBtn.textContent = 'EQUIP BEST';
    equipBestBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleEquipBestGear();
    });

    const salvageLowerBtn = document.createElement('button');
    salvageLowerBtn.type = 'button';
    salvageLowerBtn.className = 'endless-gear-hdr-btn is-salvage';
    salvageLowerBtn.textContent = 'SALVAGE LOWER';
    salvageLowerBtn.disabled = true;
    salvageLowerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleSalvageAllLowerGear();
    });

    actionsRow.appendChild(equipBestBtn);
    actionsRow.appendChild(salvageLowerBtn);

    header.appendChild(metricsRow);
    header.appendChild(actionsRow);

    // 2. Scrollable Gear Forge Body (Equipped 2x2 + Mythic Sets + Bag)
    const scroll = document.createElement('div');
    scroll.className = 'endless-scroll-list endless-gear-scroll';

    // 2A. 4 Equipped Slots Grid (2x2 compact cards)
    const equippedGrid = document.createElement('div');
    equippedGrid.className = 'endless-gear-equipped-grid';

    this._gearSlotRefs.clear();
    for (let i = 0; i < GEAR_SLOT_ORDER.length; i++) {
      const slotId = GEAR_SLOT_ORDER[i];
      const slotDef = GEAR_SLOT_DEFAULTS[slotId];

      const card = document.createElement('div');
      card.className = 'endless-gear-slot-card is-empty';
      card.dataset.gearSlot = slotId;

      const top = document.createElement('div');
      top.className = 'endless-gear-slot-top';

      const iconWrap = document.createElement('span');
      iconWrap.className = 'endless-gear-slot-icon';
      iconWrap.innerHTML = getGearSlotSvg(slotId);

      const badges = document.createElement('div');
      badges.className = 'endless-gear-slot-badges';

      const rarityPill = document.createElement('span');
      rarityPill.className = 'endless-gear-rarity-pill';
      rarityPill.textContent = slotDef.label;

      const enhLvEl = document.createElement('span');
      enhLvEl.className = 'endless-gear-enh-lv hidden';
      enhLvEl.textContent = '+0';

      badges.appendChild(rarityPill);
      badges.appendChild(enhLvEl);
      top.appendChild(iconWrap);
      top.appendChild(badges);

      const nameEl = document.createElement('div');
      nameEl.className = 'endless-gear-slot-name';
      nameEl.textContent = 'EMPTY SLOT';

      const statsEl = document.createElement('div');
      statsEl.className = 'endless-gear-slot-stats';
      statsEl.textContent = 'NO ITEM EQUIPPED';

      const foot = document.createElement('div');
      foot.className = 'endless-gear-slot-foot';

      const setTagEl = document.createElement('span');
      setTagEl.className = 'endless-gear-set-tag is-pwr';
      setTagEl.textContent = 'PWR 0';

      const enhBtn = document.createElement('button');
      enhBtn.type = 'button';
      enhBtn.className = 'endless-gear-enh-btn';
      enhBtn.textContent = '+1';
      enhBtn.disabled = true;

      const slotRef = {
        slotId,
        card,
        iconWrap,
        rarityPill,
        enhLvEl,
        nameEl,
        statsEl,
        foot,
        setTagEl,
        enhBtn,
        currentUid: null,
        currentItem: null
      };

      enhBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (slotRef.currentUid) {
          this._handleEnhanceGear(slotRef.currentUid, slotRef.card, slotRef.enhBtn, slotRef.currentItem);
        }
      });

      foot.appendChild(setTagEl);
      foot.appendChild(enhBtn);

      card.appendChild(top);
      card.appendChild(nameEl);
      card.appendChild(statsEl);
      card.appendChild(foot);
      equippedGrid.appendChild(card);

      this._gearSlotRefs.set(slotId, slotRef);
    }

    // 2B. Mythic Set Passives Strip (3 compact pills)
    const setsStrip = document.createElement('div');
    setsStrip.className = 'endless-gear-sets-strip';
    this._gearSetPillRefs.clear();

    for (let i = 0; i < DEFAULT_MYTHIC_SETS.length; i++) {
      const def = DEFAULT_MYTHIC_SETS[i];
      const pill = document.createElement('div');
      pill.className = 'endless-gear-set-pill';
      pill.dataset.mythicSetId = def.id;
      pill.title = `${def.name}: ${def.fullDesc}`;

      const nameEl = document.createElement('div');
      nameEl.className = 'endless-gear-set-name';
      nameEl.textContent = def.name;

      const statusEl = document.createElement('span');
      statusEl.className = 'endless-gear-set-status';
      statusEl.textContent = `0/${def.requiredPieces}`;

      const descEl = document.createElement('div');
      descEl.className = 'endless-gear-set-desc';
      descEl.textContent = def.shortDesc;

      pill.appendChild(nameEl);
      pill.appendChild(statusEl);
      pill.appendChild(descEl);
      setsStrip.appendChild(pill);

      this._gearSetPillRefs.set(def.id, { pill, nameEl, statusEl, descEl, def });
    }

    // 2C. Inventory Section (BAG x/24)
    const bagHead = document.createElement('div');
    bagHead.className = 'endless-gear-bag-head';
    const bagCount = document.createElement('span');
    bagCount.className = 'endless-gear-bag-title';
    bagCount.textContent = 'BAG 0/24';
    const bagHint = document.createElement('span');
    bagHint.className = 'endless-gear-bag-hint';
    bagHint.textContent = 'LOOT INVENTORY';
    bagHead.appendChild(bagCount);
    bagHead.appendChild(bagHint);

    const bagEmpty = document.createElement('div');
    bagEmpty.className = 'endless-empty-msg';
    bagEmpty.textContent = 'SLAY BOSSES, ELITES & GOBLINS FOR LOOT';

    const bagItems = document.createElement('div');
    bagItems.className = 'endless-gear-bag-items';

    scroll.appendChild(equippedGrid);
    scroll.appendChild(setsStrip);
    scroll.appendChild(bagHead);
    scroll.appendChild(bagEmpty);
    scroll.appendChild(bagItems);

    panel.appendChild(header);
    panel.appendChild(scroll);

    this._refs.gearHeader = header;
    this._refs.gearDustMetric = dustMetric;
    this._refs.gearDustVal = dustVal;
    this._refs.gearPowerVal = powerVal;
    this._refs.gearEquipBestBtn = equipBestBtn;
    this._refs.gearSalvageLowerBtn = salvageLowerBtn;
    this._refs.gearEquippedGrid = equippedGrid;
    this._refs.gearSetsStrip = setsStrip;
    this._refs.gearBagCount = bagCount;
    this._refs.gearBagHint = bagHint;
    this._refs.gearBagEmpty = bagEmpty;
    this._refs.gearBagItems = bagItems;
  }

  _createGearBagRow(item) {
    const row = document.createElement('div');
    row.className = 'endless-gear-bag-row';
    row.dataset.gearUid = String(item.uid || '');

    const iconWrap = document.createElement('div');
    iconWrap.className = 'endless-gear-bag-icon-wrap';
    iconWrap.innerHTML = getGearSlotSvg(item.slot);

    const body = document.createElement('div');
    body.className = 'endless-gear-bag-body';

    const top = document.createElement('div');
    top.className = 'endless-gear-bag-top';

    const nameEl = document.createElement('span');
    nameEl.className = 'endless-gear-bag-name';
    nameEl.textContent = item.name || 'GEAR ITEM';

    const enhLvEl = document.createElement('span');
    enhLvEl.className = 'endless-gear-enh-lv hidden';
    enhLvEl.textContent = '+0';

    const deltaBadge = document.createElement('span');
    deltaBadge.className = 'endless-gear-delta-badge hidden';
    deltaBadge.textContent = '+0';

    const upBadge = document.createElement('span');
    upBadge.className = 'endless-gear-up-badge hidden';
    upBadge.textContent = 'UP!';

    top.appendChild(nameEl);
    top.appendChild(enhLvEl);
    top.appendChild(deltaBadge);
    top.appendChild(upBadge);

    const sub = document.createElement('div');
    sub.className = 'endless-gear-bag-sub';

    const rarityPill = document.createElement('span');
    rarityPill.className = 'endless-gear-rarity-pill';
    rarityPill.textContent = 'COMMON';

    const setTagEl = document.createElement('span');
    setTagEl.className = 'endless-gear-set-tag hidden';
    setTagEl.textContent = '';

    const statsEl = document.createElement('span');
    statsEl.className = 'endless-gear-bag-stats';
    statsEl.textContent = '';

    sub.appendChild(rarityPill);
    sub.appendChild(setTagEl);
    sub.appendChild(statsEl);

    const actions = document.createElement('div');
    actions.className = 'endless-gear-bag-actions';

    const equipBtn = document.createElement('button');
    equipBtn.type = 'button';
    equipBtn.className = 'endless-gear-act-btn is-equip';
    equipBtn.textContent = 'EQUIP';

    const enhBtn = document.createElement('button');
    enhBtn.type = 'button';
    enhBtn.className = 'endless-gear-act-btn is-enhance';
    enhBtn.textContent = '+1';
    enhBtn.disabled = true;

    const salvageBtn = document.createElement('button');
    salvageBtn.type = 'button';
    salvageBtn.className = 'endless-gear-act-btn is-salvage';
    salvageBtn.textContent = 'SALVAGE';

    const rowRef = {
      uid: String(item.uid || ''),
      renderedSlot: item.slot || 'weapon',
      item,
      row,
      iconWrap,
      nameEl,
      enhLvEl,
      deltaBadge,
      upBadge,
      rarityPill,
      setTagEl,
      statsEl,
      equipBtn,
      enhBtn,
      salvageBtn
    };

    equipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleEquipGear(rowRef.uid, rowRef.row, rowRef.equipBtn, rowRef.item);
    });

    enhBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleEnhanceGear(rowRef.uid, rowRef.row, rowRef.enhBtn, rowRef.item);
    });

    salvageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleSalvageGear(rowRef.uid, rowRef.row, rowRef.salvageBtn, rowRef.item);
    });

    actions.appendChild(equipBtn);
    actions.appendChild(enhBtn);
    actions.appendChild(salvageBtn);

    body.appendChild(top);
    body.appendChild(sub);
    body.appendChild(actions);

    row.appendChild(iconWrap);
    row.appendChild(body);

    return rowRef;
  }

  _patchGearBagRow(rowRef, item, equippedMap = null) {
    rowRef.item = item;
    if (rowRef.renderedSlot !== item.slot) {
      rowRef.renderedSlot = item.slot;
      rowRef.iconWrap.innerHTML = getGearSlotSvg(item.slot);
    }

    const rarityColor = item.rarityMeta?.color || '#94a3b8';
    const rarityLabel = item.rarityMeta?.label || String(item.rarity || 'COMMON').toUpperCase();
    const slotLabel = item.slotMeta?.label || GEAR_SLOT_DEFAULTS[item.slot]?.label || String(item.slot || 'GEAR').toUpperCase();
    const lv = Math.max(0, Math.floor(Number(item.enhanceLevel) || 0));
    const isUpgrade = Boolean(item.isUpgradeOverEquipped);
    const delta = resolveGearPowerDelta(item, equippedMap);

    rowRef.row.classList.toggle('is-upgrade', isUpgrade);
    setStyleIfChanged(rowRef.row, 'borderColor', rarityColor);
    setStyleIfChanged(rowRef.iconWrap, 'borderColor', rarityColor);

    setTextIfChanged(rowRef.nameEl, item.name || `${rarityLabel} ${slotLabel}`);
    rowRef.enhLvEl.classList.toggle('hidden', lv <= 0);
    if (lv > 0) {
      setTextIfChanged(rowRef.enhLvEl, `+${lv}`);
    }

    if (rowRef.deltaBadge) {
      if (delta > 0) {
        rowRef.deltaBadge.classList.remove('hidden', 'is-neg');
        rowRef.deltaBadge.classList.add('is-pos');
        setTextIfChanged(rowRef.deltaBadge, `+${formatEndlessNumber(delta)}`);
      } else if (delta < 0) {
        rowRef.deltaBadge.classList.remove('hidden', 'is-pos');
        rowRef.deltaBadge.classList.add('is-neg');
        setTextIfChanged(rowRef.deltaBadge, `-${formatEndlessNumber(Math.abs(delta))}`);
      } else {
        rowRef.deltaBadge.classList.add('hidden');
        rowRef.deltaBadge.classList.remove('is-pos', 'is-neg');
      }
    }

    rowRef.upBadge.classList.toggle('hidden', !isUpgrade);

    setStyleIfChanged(rowRef.rarityPill, 'borderColor', rarityColor);
    setStyleIfChanged(rowRef.rarityPill, 'color', rarityColor);
    setTextIfChanged(rowRef.rarityPill, rarityLabel);

    if (item.setMeta && item.setMeta.name) {
      const accent = item.setMeta.accentHex || '#facc15';
      rowRef.setTagEl.classList.remove('hidden');
      setStyleIfChanged(rowRef.setTagEl, 'borderColor', accent);
      setStyleIfChanged(rowRef.setTagEl, 'color', accent);
      setTextIfChanged(rowRef.setTagEl, item.setMeta.name);
    } else {
      rowRef.setTagEl.classList.add('hidden');
    }

    const bonuses = item.effectiveBonuses || item.bonuses;
    const compactStats = formatGearBonuses(bonuses, 2) || `PWR ${formatEndlessNumber(item.power || 0)}`;
    setTextIfChanged(rowRef.statsEl, compactStats);

    rowRef.equipBtn.classList.toggle('is-upgrade', isUpgrade);
    setTextIfChanged(rowRef.equipBtn, 'EQUIP');

    // Keep Bag +1 enhance button permanently mounted (disabled when unaffordable/maxed)
    // so SALVAGE never shifts horizontally during rapid clicks.
    const isMax = Boolean(item.isMaxEnhanced || lv >= 20);
    const canEnhance = Boolean(!isMax && item.canEnhance);
    rowRef.enhBtn.classList.remove('hidden');
    rowRef.enhBtn.classList.toggle('is-maxed', isMax);
    if (isMax) {
      setTextIfChanged(rowRef.enhBtn, 'MAX');
      rowRef.enhBtn.disabled = true;
    } else {
      const enhCost = Math.max(0, Math.floor(Number(item.enhanceCost) || 0));
      setTextIfChanged(rowRef.enhBtn, `+1 (${formatEndlessNumber(enhCost)}D)`);
      rowRef.enhBtn.disabled = !canEnhance;
    }

    const salvageVal = Math.max(0, Math.floor(Number(item.salvageValue) || 0));
    setTextIfChanged(rowRef.salvageBtn, `SALVAGE +${formatEndlessNumber(salvageVal)}`);

    const fullStats = formatGearBonuses(bonuses, 0);
    const deltaTip = delta !== 0 ? ` (${delta > 0 ? '+' : '-'}${formatEndlessNumber(Math.abs(delta))} VS EQUIPPED)` : '';
    const tip =
      `${item.name || slotLabel}${lv > 0 ? ` +${lv}` : ''} [${rarityLabel} ${slotLabel}] ` +
      `STG ${item.stage || 1} | PWR ${formatEndlessNumber(item.power || 0)}${deltaTip}` +
      (fullStats ? ` | ${fullStats}` : '') +
      (item.setMeta?.name ? ` | SET: ${item.setMeta.name}` : '');
    if (rowRef.row.title !== tip) {
      rowRef.row.title = tip;
    }
  }

  _buildCompanionsPanel(panel) {
    const partyBar = document.createElement('div');
    partyBar.className = 'endless-party-bar';

    const partyRow = document.createElement('div');
    partyRow.className = 'endless-party-row';
    const counter = document.createElement('span');
    counter.className = 'endless-party-counter';
    counter.textContent = 'ACTIVE PARTY 0 / 3';
    const hint = document.createElement('span');
    hint.className = 'endless-party-hint';
    hint.textContent = 'FIGHT BESIDE HERO';
    partyRow.appendChild(counter);
    partyRow.appendChild(hint);

    const notice = document.createElement('div');
    notice.className = 'endless-party-notice hidden';
    notice.textContent = '';

    // Wave 9: Squad Formation Selector Bar (VANGUARD | PHALANX | BLITZ)
    const formationBar = document.createElement('div');
    formationBar.className = 'endless-formation-bar';
    formationBar.setAttribute('aria-label', 'Squad Formation');

    const formationBtns = document.createElement('div');
    formationBtns.className = 'endless-formation-btns';

    for (let i = 0; i < DEFAULT_SQUAD_FORMATIONS.length; i++) {
      const f = DEFAULT_SQUAD_FORMATIONS[i];
      const fBtn = document.createElement('button');
      fBtn.type = 'button';
      fBtn.className = f.id === 'balanced_phalanx'
        ? 'endless-formation-btn is-active'
        : 'endless-formation-btn';
      fBtn.dataset.formationId = f.id;
      fBtn.textContent = f.shortLabel;
      fBtn.title = `${f.name}: ${f.desc}`;
      fBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleSetSquadFormation(f.id);
      });
      formationBtns.appendChild(fBtn);
      this._formationBtnRefs.set(f.id, fBtn);
    }

    const formationDesc = document.createElement('div');
    formationDesc.className = 'endless-formation-desc';
    formationDesc.textContent = DEFAULT_SQUAD_FORMATIONS[1].desc;

    formationBar.appendChild(formationBtns);
    formationBar.appendChild(formationDesc);

    // Active Party Synergies section in Companions tab header
    const synBox = document.createElement('div');
    synBox.className = 'endless-party-synergies-box';

    const synHead = document.createElement('div');
    synHead.className = 'endless-party-syn-head';
    const synTitle = document.createElement('span');
    synTitle.className = 'endless-party-syn-title';
    synTitle.textContent = 'PARTY SYNERGIES';
    const synCount = document.createElement('span');
    synCount.className = 'endless-party-syn-count';
    synCount.textContent = '0 ACTIVE';
    synHead.appendChild(synTitle);
    synHead.appendChild(synCount);

    const synList = document.createElement('div');
    synList.className = 'endless-party-syn-list';
    const synEmpty = document.createElement('div');
    synEmpty.className = 'endless-party-syn-empty';
    synEmpty.textContent = 'DEPLOY COMPATIBLE ALLIES TO UNLOCK SQUAD BONUSES';
    synList.appendChild(synEmpty);

    synBox.appendChild(synHead);
    synBox.appendChild(synList);

    partyBar.appendChild(partyRow);
    partyBar.appendChild(formationBar);
    partyBar.appendChild(synBox);
    partyBar.appendChild(notice);

    const list = document.createElement('div');
    list.className = 'endless-scroll-list';

    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'endless-empty-msg hidden';
    emptyMsg.textContent = 'NO COMPANIONS AVAILABLE YET';
    list.appendChild(emptyMsg);

    panel.appendChild(partyBar);
    panel.appendChild(list);

    this._refs.partyCounter = counter;
    this._refs.partyNotice = notice;
    this._refs.formationBar = formationBar;
    this._refs.formationBtns = formationBtns;
    this._refs.formationDesc = formationDesc;
    this._refs.partySynCount = synCount;
    this._refs.partySynList = synList;
    this._refs.companionList = list;
    this._refs.companionEmpty = emptyMsg;
  }

  _ensureCompanionCard(comp) {
    const existing = this._companionCardRefs.get(comp.id);
    if (existing) return existing;

    const card = document.createElement('div');
    card.className = 'endless-comp-card';
    card.dataset.companionId = comp.id;

    const portWrap = document.createElement('div');
    portWrap.className = 'endless-comp-portrait-wrap';
    portWrap.style.borderColor = comp.accentHex || '#d4af37';

    const portCanvas = document.createElement('canvas');
    portCanvas.width = 40;
    portCanvas.height = 40;
    portCanvas.className = 'endless-comp-portrait';
    portCanvas.setAttribute('aria-hidden', 'true');
    portWrap.appendChild(portCanvas);

    const body = document.createElement('div');
    body.className = 'endless-comp-body';

    const top = document.createElement('div');
    top.className = 'endless-comp-top';
    const nameEl = document.createElement('span');
    nameEl.className = 'endless-comp-name';
    nameEl.textContent = comp.name || comp.id;
    const roleEl = document.createElement('span');
    roleEl.className = 'endless-comp-role';
    roleEl.textContent = comp.role || 'ALLY';
    roleEl.style.borderColor = comp.accentHex || '#d4af37';
    roleEl.style.color = comp.accentHex || '#fde047';
    top.appendChild(nameEl);
    top.appendChild(roleEl);

    const evoRow = document.createElement('div');
    evoRow.className = 'endless-comp-evo-row';

    const starsWrap = document.createElement('div');
    starsWrap.className = 'endless-comp-stars';
    starsWrap.setAttribute('aria-label', 'Companion Star Rank');
    const starEls = [];
    for (let s = 0; s < 5; s++) {
      const starEl = document.createElement('span');
      starEl.className = 'endless-comp-star';
      starEl.innerHTML = s === 0 ? STAR_ON_SVG : STAR_OFF_SVG;
      starEl._lit = s === 0;
      starsWrap.appendChild(starEl);
      starEls.push(starEl);
    }

    const badgesWrap = document.createElement('div');
    badgesWrap.className = 'endless-comp-badges';

    const exBadge = document.createElement('span');
    exBadge.className = 'endless-comp-ex-badge is-evolved';
    exBadge.textContent = 'EX';
    exBadge.title = 'NEXT-GEN EX COMPANION (1-STAR+)';

    const auraBadge = document.createElement('span');
    auraBadge.className = 'endless-comp-aura-badge hidden';
    auraBadge.textContent = 'SOVEREIGN';
    auraBadge.title = '3-STAR SOVEREIGN AURA';

    badgesWrap.appendChild(exBadge);
    badgesWrap.appendChild(auraBadge);

    evoRow.appendChild(starsWrap);
    evoRow.appendChild(badgesWrap);

    const meta = document.createElement('div');
    meta.className = 'endless-comp-meta';
    const lvEl = document.createElement('span');
    lvEl.textContent = 'LOCKED';
    const dpsEl = document.createElement('span');
    dpsEl.textContent = 'DPS 0';
    meta.appendChild(lvEl);
    meta.appendChild(dpsEl);

    const descEl = document.createElement('div');
    descEl.className = 'endless-comp-desc';
    descEl.textContent = comp.abilityName
      ? `${comp.abilityName}: ${comp.desc || ''}`
      : (comp.desc || '');

    const actions = document.createElement('div');
    actions.className = 'endless-comp-actions';

    const primaryBtn = document.createElement('button');
    primaryBtn.type = 'button';
    primaryBtn.className = 'endless-comp-btn';
    primaryBtn.textContent = 'RECRUIT';
    primaryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleCompanionPrimary(comp.id);
    });

    const deployBtn = document.createElement('button');
    deployBtn.type = 'button';
    deployBtn.className = 'endless-comp-btn endless-comp-deploy-btn hidden';
    deployBtn.textContent = 'DEPLOY';
    deployBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleCompanionDeploy(comp.id);
    });

    const promoteBtn = document.createElement('button');
    promoteBtn.type = 'button';
    promoteBtn.className = 'endless-comp-btn endless-comp-promote-btn hidden';
    promoteBtn.textContent = 'PROMOTE';
    promoteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleCompanionPromote(comp.id);
    });

    actions.appendChild(primaryBtn);
    actions.appendChild(deployBtn);
    actions.appendChild(promoteBtn);

    body.appendChild(top);
    body.appendChild(evoRow);
    body.appendChild(meta);
    body.appendChild(descEl);
    body.appendChild(actions);

    card.appendChild(portWrap);
    card.appendChild(body);

    if (this._refs.companionList) {
      this._refs.companionList.appendChild(card);
    }

    const ref = {
      card,
      portWrap,
      portCanvas,
      nameEl,
      roleEl,
      starEls,
      exBadge,
      auraBadge,
      lvEl,
      dpsEl,
      primaryBtn,
      deployBtn,
      promoteBtn,
      heroKey: comp.heroKey,
      accentHex: comp.accentHex
    };
    this._companionCardRefs.set(comp.id, ref);
    return ref;
  }

  _buildAscendPanel(panel) {
    const scroll = document.createElement('div');
    scroll.className = 'endless-scroll-list';

    // Top Astral Ascension Prestige Card (Obsidian-Violet & Burnished-Gold)
    const card = document.createElement('div');
    card.className = 'endless-ascend-card';

    const head = document.createElement('div');
    head.className = 'endless-ascend-head';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'endless-ascend-title-wrap';
    const crestCanvas = this._makeIconCanvas(32, 0, '#c084fc', 'endless-ascend-crest', 1);
    const titleEl = document.createElement('span');
    titleEl.className = 'endless-ascend-title';
    titleEl.textContent = 'ASTRAL ASCENSION';
    titleWrap.appendChild(crestCanvas);
    titleWrap.appendChild(titleEl);

    const countEl = document.createElement('span');
    countEl.className = 'endless-ascend-count';
    countEl.textContent = 'ASCENSIONS: 0';

    head.appendChild(titleWrap);
    head.appendChild(countEl);

    const metrics = document.createElement('div');
    metrics.className = 'endless-ascend-metrics';

    // Current Astral Shards Badge Plaque
    const curPlaque = document.createElement('div');
    curPlaque.className = 'endless-ascend-plaque';
    const curLbl = document.createElement('span');
    curLbl.className = 'endless-ascend-plaque-lbl';
    curLbl.textContent = 'ASTRAL SHARDS';
    const curValRow = document.createElement('div');
    curValRow.className = 'endless-ascend-plaque-val-row';
    const curShardIcon = this._makeIconCanvas(32, 1, '#38bdf8', 'endless-ascend-shard-icon', ENDLESS_ICON_ROW);
    const curShardVal = document.createElement('span');
    curShardVal.className = 'endless-ascend-plaque-val';
    curShardVal.textContent = '0';
    curValRow.appendChild(curShardIcon);
    curValRow.appendChild(curShardVal);
    curPlaque.appendChild(curLbl);
    curPlaque.appendChild(curValRow);

    // Live Pending Prestige Preview Plaque
    const previewPlaque = document.createElement('div');
    previewPlaque.className = 'endless-ascend-plaque is-preview';
    const previewLbl = document.createElement('span');
    previewLbl.className = 'endless-ascend-plaque-lbl';
    previewLbl.textContent = 'ON PRESTIGE';
    const previewVal = document.createElement('span');
    previewVal.className = 'endless-ascend-plaque-val is-pending is-locked';
    previewVal.textContent = '+0 ASTRAL SHARDS';
    previewPlaque.appendChild(previewLbl);
    previewPlaque.appendChild(previewVal);

    metrics.appendChild(curPlaque);
    metrics.appendChild(previewPlaque);

    const noteEl = document.createElement('div');
    noteEl.className = 'endless-ascend-note';
    noteEl.textContent = 'RESETS STAGE, GOLD & ALLIES - KEEPS SHARDS, ARTIFACTS, GEAR, DUST, STARS & TROPHIES';

    const ascendBtn = document.createElement('button');
    ascendBtn.type = 'button';
    ascendBtn.className = 'endless-ascend-btn';
    ascendBtn.disabled = true;
    const ascendBtnIcon = document.createElement('span');
    ascendBtnIcon.innerHTML = ASCEND_STAR_SVG;
    const ascendBtnLabel = document.createElement('span');
    ascendBtnLabel.textContent = 'REACH STAGE 5 TO ASCEND';
    ascendBtn.appendChild(ascendBtnIcon);
    ascendBtn.appendChild(ascendBtnLabel);
    ascendBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleAscendClick();
    });

    card.appendChild(head);
    card.appendChild(metrics);
    card.appendChild(noteEl);
    card.appendChild(ascendBtn);

    // Eternal Artifacts Section Header & List
    const sectionHead = document.createElement('div');
    sectionHead.className = 'endless-ascend-section-head';
    const sectionTitle = document.createElement('span');
    sectionTitle.className = 'endless-ascend-section-title';
    sectionTitle.textContent = 'ETERNAL ARTIFACTS';
    const sectionSub = document.createElement('span');
    sectionSub.className = 'endless-ascend-section-sub';
    sectionSub.textContent = 'PERMANENT BOOSTS';
    sectionHead.appendChild(sectionTitle);
    sectionHead.appendChild(sectionSub);

    const artifactList = document.createElement('div');
    artifactList.className = 'endless-artifact-list';

    const artifactEmpty = document.createElement('div');
    artifactEmpty.className = 'endless-empty-msg hidden';
    artifactEmpty.textContent = 'ETERNAL ARTIFACTS UNAVAILABLE';
    artifactList.appendChild(artifactEmpty);

    scroll.appendChild(card);
    scroll.appendChild(sectionHead);
    scroll.appendChild(artifactList);
    panel.appendChild(scroll);

    this._refs.ascendCard = card;
    this._refs.ascendCount = countEl;
    this._refs.ascendCurShards = curShardVal;
    this._refs.ascendPendingShards = previewVal;
    this._refs.ascendBtn = ascendBtn;
    this._refs.ascendBtnLabel = ascendBtnLabel;
    this._refs.artifactSectionSub = sectionSub;
    this._refs.artifactList = artifactList;
    this._refs.artifactEmpty = artifactEmpty;
  }

  _ensureArtifactRow(art) {
    const existing = this._artifactRowRefs.get(art.id);
    if (existing) return existing;

    const iconSpec = resolveArtifactIconSpec(art);

    const row = document.createElement('div');
    row.className = 'endless-artifact-row';
    row.dataset.artifactId = art.id;

    const iconWrap = document.createElement('div');
    iconWrap.className = 'endless-artifact-icon-wrap';
    iconWrap.style.borderColor = iconSpec.accentHex;
    const iconCanvas = this._makeIconCanvas(32, iconSpec.col, iconSpec.accentHex, 'endless-artifact-icon', iconSpec.row);
    iconWrap.appendChild(iconCanvas);

    const info = document.createElement('div');
    info.className = 'endless-artifact-info';

    const head = document.createElement('div');
    head.className = 'endless-artifact-head';
    const nameEl = document.createElement('span');
    nameEl.className = 'endless-artifact-name';
    nameEl.textContent = art.name || art.id;
    const lvEl = document.createElement('span');
    lvEl.className = 'endless-artifact-lv';
    lvEl.textContent = `LV.${art.level || 0} / ${art.maxLevel || 1}`;
    head.appendChild(nameEl);
    head.appendChild(lvEl);

    const effectEl = document.createElement('div');
    effectEl.className = 'endless-artifact-effect';
    effectEl.textContent = art.effectSummary || '';

    const descEl = document.createElement('div');
    descEl.className = 'endless-artifact-desc';
    descEl.textContent = art.desc || '';

    info.appendChild(head);
    info.appendChild(effectEl);
    info.appendChild(descEl);

    const buyBtn = document.createElement('button');
    buyBtn.type = 'button';
    buyBtn.className = 'endless-artifact-buy-btn';
    buyBtn.dataset.artifactId = art.id;
    buyBtn.textContent = `${formatEndlessNumber(art.cost || 0)} SHARDS`;
    buyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleBuyEternalArtifact(art.id);
    });

    row.appendChild(iconWrap);
    row.appendChild(info);
    row.appendChild(buyBtn);

    if (this._refs.artifactList) {
      this._refs.artifactList.appendChild(row);
    }

    this._blitIconCanvas(iconCanvas, iconSpec.col, iconSpec.accentHex, true, iconSpec.row);

    const ref = {
      row,
      nameEl,
      lvEl,
      effectEl,
      descEl,
      buyBtn
    };
    this._artifactRowRefs.set(art.id, ref);
    return ref;
  }

  _buildTrialsPanel(panel) {
    const header = document.createElement('div');
    header.className = 'endless-trials-header';

    const headRow = document.createElement('div');
    headRow.className = 'endless-trials-head-row';

    const title = document.createElement('span');
    title.className = 'endless-trials-title';
    title.textContent = 'TRIAL PORTALS';

    const clearedPill = document.createElement('span');
    clearedPill.className = 'endless-trials-cleared';
    clearedPill.textContent = 'CLEARED: 0';

    headRow.appendChild(title);
    headRow.appendChild(clearedPill);

    const sub = document.createElement('div');
    sub.className = 'endless-trials-sub';
    sub.textContent = 'PAUSES MAIN STAGE SAFELY | ZERO STAGE LOSS';

    header.appendChild(headRow);
    header.appendChild(sub);

    const list = document.createElement('div');
    list.className = 'endless-scroll-list endless-trials-list';

    panel.appendChild(header);
    panel.appendChild(list);

    this._refs.trialsHeader = header;
    this._refs.trialsCleared = clearedPill;
    this._refs.trialsList = list;

    for (let i = 0; i < DEFAULT_TRIAL_DEFS.length; i++) {
      this._ensureTrialCard(DEFAULT_TRIAL_DEFS[i]);
    }
  }

  _ensureTrialCard(trial) {
    const id = String(trial?.id || 'gold_vault');
    const existing = this._trialCardRefs.get(id);
    if (existing) return existing;

    const accent = String(trial?.accentHex || '#facc15');
    const card = document.createElement('div');
    card.className = 'endless-trial-card';
    card.dataset.trialId = id;
    card.style.borderLeftColor = accent;

    const top = document.createElement('div');
    top.className = 'endless-trial-card-top';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'endless-trial-icon-wrap';
    iconWrap.style.borderColor = accent;
    iconWrap.innerHTML = getTrialSvg(id);

    const titleBlock = document.createElement('div');
    titleBlock.className = 'endless-trial-title-block';

    const nameRow = document.createElement('div');
    nameRow.className = 'endless-trial-name-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'endless-trial-name';
    nameEl.textContent = String(trial?.name || id).toUpperCase();

    const durPill = document.createElement('span');
    durPill.className = 'endless-trial-dur-pill';
    durPill.textContent = `${Math.max(1, Math.round(Number(trial?.durationSec) || 30))}S`;

    nameRow.appendChild(nameEl);
    nameRow.appendChild(durPill);

    const rewardPill = document.createElement('span');
    rewardPill.className = 'endless-trial-reward-pill';
    rewardPill.style.borderColor = accent;
    rewardPill.style.color = accent;
    rewardPill.textContent = String(trial?.rewardTag || 'TRIAL REWARD').toUpperCase();

    titleBlock.appendChild(nameRow);
    titleBlock.appendChild(rewardPill);

    top.appendChild(iconWrap);
    top.appendChild(titleBlock);

    const descEl = document.createElement('div');
    descEl.className = 'endless-trial-desc';
    descEl.textContent = String(trial?.desc || '');

    const footer = document.createElement('div');
    footer.className = 'endless-trial-footer';

    const bestEl = document.createElement('span');
    bestEl.className = 'endless-trial-best';
    bestEl.textContent = 'BEST: --';

    const enterBtn = document.createElement('button');
    enterBtn.type = 'button';
    enterBtn.className = 'endless-trial-enter-btn';
    enterBtn.dataset.trialId = id;
    enterBtn.textContent = 'ENTER TRIAL';
    enterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleEnterTrial(id, card, enterBtn);
    });

    footer.appendChild(bestEl);
    footer.appendChild(enterBtn);

    card.appendChild(top);
    card.appendChild(descEl);
    card.appendChild(footer);

    if (this._refs.trialsList) {
      this._refs.trialsList.appendChild(card);
    }

    const ref = {
      id,
      card,
      iconWrap,
      nameEl,
      durPill,
      rewardPill,
      descEl,
      bestEl,
      enterBtn,
      lastAccent: accent
    };
    this._trialCardRefs.set(id, ref);
    return ref;
  }

  _buildStatsPanel(panel) {
    const scroll = document.createElement('div');
    scroll.className = 'endless-scroll-list';

    // Live Real-Time DPS Breakdown Card
    const dpsCard = document.createElement('div');
    dpsCard.className = 'endless-dps-card';

    const dpsHead = document.createElement('div');
    dpsHead.className = 'endless-dps-card-head';
    const dpsTitle = document.createElement('span');
    dpsTitle.className = 'endless-dps-title';
    dpsTitle.innerHTML = `${DPS_BAR_SVG}<span>DPS BREAKDOWN</span>`;
    const dpsFeverPill = document.createElement('span');
    dpsFeverPill.className = 'endless-dps-fever-pill hidden';
    dpsFeverPill.textContent = 'FEVER X2';
    dpsHead.appendChild(dpsTitle);
    dpsHead.appendChild(dpsFeverPill);

    const dpsBarTrack = document.createElement('div');
    dpsBarTrack.className = 'endless-dps-bar-track';
    const dpsSegHero = document.createElement('div');
    dpsSegHero.className = 'endless-dps-seg is-hero';
    const dpsSegTap = document.createElement('div');
    dpsSegTap.className = 'endless-dps-seg is-tap';
    const dpsSegParty = document.createElement('div');
    dpsSegParty.className = 'endless-dps-seg is-party';
    dpsBarTrack.appendChild(dpsSegHero);
    dpsBarTrack.appendChild(dpsSegTap);
    dpsBarTrack.appendChild(dpsSegParty);

    const dpsLegend = document.createElement('div');
    dpsLegend.className = 'endless-dps-legend';

    const makeDpsCol = (cls, labelText) => {
      const col = document.createElement('div');
      col.className = `endless-dps-col ${cls}`;
      const colHead = document.createElement('div');
      colHead.className = 'endless-dps-col-head';
      const sw = document.createElement('span');
      sw.className = `endless-dps-swatch ${cls}`;
      const lbl = document.createElement('span');
      lbl.textContent = labelText;
      colHead.appendChild(sw);
      colHead.appendChild(lbl);
      const val = document.createElement('div');
      val.className = 'endless-dps-col-val';
      val.textContent = '0';
      const pct = document.createElement('div');
      pct.className = 'endless-dps-col-pct';
      pct.textContent = '0%';
      col.appendChild(colHead);
      col.appendChild(val);
      col.appendChild(pct);
      dpsLegend.appendChild(col);
      return { val, pct };
    };

    const dpsHeroCol = makeDpsCol('is-hero', 'HERO DPS');
    const dpsTapCol = makeDpsCol('is-tap', 'TAP DPS');
    const dpsPartyCol = makeDpsCol('is-party', 'PARTY DPS');

    const dpsSummary = document.createElement('div');
    dpsSummary.className = 'endless-dps-summary';

    const sumTotal = document.createElement('div');
    sumTotal.className = 'endless-dps-sum-item';
    const sumTotalLbl = document.createElement('span');
    sumTotalLbl.className = 'endless-dps-sum-lbl';
    sumTotalLbl.textContent = 'TOTAL DPS';
    const sumTotalVal = document.createElement('span');
    sumTotalVal.className = 'endless-dps-sum-val';
    sumTotalVal.textContent = '0';
    sumTotal.appendChild(sumTotalLbl);
    sumTotal.appendChild(sumTotalVal);

    const sumGold = document.createElement('div');
    sumGold.className = 'endless-dps-sum-item';
    const sumGoldLbl = document.createElement('span');
    sumGoldLbl.className = 'endless-dps-sum-lbl';
    sumGoldLbl.textContent = 'GOLD / SEC';
    const sumGoldVal = document.createElement('span');
    sumGoldVal.className = 'endless-dps-sum-val is-gold';
    sumGoldVal.textContent = '0/S';
    sumGold.appendChild(sumGoldLbl);
    sumGold.appendChild(sumGoldVal);

    dpsSummary.appendChild(sumTotal);
    dpsSummary.appendChild(sumGold);

    dpsCard.appendChild(dpsHead);
    dpsCard.appendChild(dpsBarTrack);
    dpsCard.appendChild(dpsLegend);
    dpsCard.appendChild(dpsSummary);

    const grid = document.createElement('div');
    grid.className = 'endless-stats-grid';

    const statDefs = [
      ['stage', 'STAGE / BEST'],
      ['goldPerSec', 'GOLD / SEC'],
      ['heroDps', 'HERO DPS'],
      ['tapDps', 'TAP SMITE DPS'],
      ['companionDps', 'COMPANION DPS'],
      ['totalDps', 'COMBINED DPS'],
      ['totalKills', 'FOES SLAIN'],
      ['bossesSlain', 'BOSSES SLAIN'],
      ['totalTaps', 'ARCANE TAPS'],
      ['totalGold', 'TOTAL GOLD'],
      ['critInfo', 'CRIT RATE / DMG'],
      ['goldMult', 'GOLD / BOSS MULT'],
      ['discountInfo', 'SHOP DISCOUNT'],
      ['sustainInfo', 'LEECH / BOSS +S']
    ];

    for (let i = 0; i < statDefs.length; i++) {
      const [key, label] = statDefs[i];
      const cell = document.createElement('div');
      cell.className = 'endless-stat-cell';
      const lbl = document.createElement('span');
      lbl.className = 'endless-stat-label';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.className = 'endless-stat-val';
      val.textContent = '0';
      cell.appendChild(lbl);
      cell.appendChild(val);
      grid.appendChild(cell);
      this._statRefs.set(key, val);
    }

    const actions = document.createElement('div');
    actions.className = 'endless-stats-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'endless-action-btn';
    saveBtn.textContent = 'SAVE RUN';
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleSaveRun();
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'endless-action-btn is-danger';
    resetBtn.textContent = 'RESET RUN';
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleResetRunClick();
    });

    actions.appendChild(saveBtn);
    actions.appendChild(resetBtn);

    // Wave 4: Best-Stage Trophies Card (Row 9 Col 7 Trophy Crown)
    const trophiesCard = document.createElement('div');
    trophiesCard.className = 'endless-trophies-card';

    const trophyHead = document.createElement('div');
    trophyHead.className = 'endless-trophy-head';
    const trophyTitleWrap = document.createElement('div');
    trophyTitleWrap.className = 'endless-trophy-title-wrap';
    const trophyIcon = this._makeIconCanvas(28, 7, '#facc15', 'endless-trophy-icon', ENDLESS_SIGIL_ROW);
    const trophyTitle = document.createElement('span');
    trophyTitle.className = 'endless-trophy-title';
    trophyTitle.textContent = 'STAGE TROPHIES';
    trophyTitleWrap.appendChild(trophyIcon);
    trophyTitleWrap.appendChild(trophyTitle);

    const trophyBonus = document.createElement('span');
    trophyBonus.className = 'endless-trophy-bonus';
    trophyBonus.textContent = '+0% DMG / GOLD';
    trophyHead.appendChild(trophyTitleWrap);
    trophyHead.appendChild(trophyBonus);

    const trophyMeta = document.createElement('div');
    trophyMeta.className = 'endless-trophy-meta';
    const trophyRank = document.createElement('span');
    trophyRank.textContent = 'RANK: UNRANKED';
    const trophyNext = document.createElement('span');
    trophyNext.textContent = 'NEXT: STAGE 5';
    trophyMeta.appendChild(trophyRank);
    trophyMeta.appendChild(trophyNext);

    const trophyList = document.createElement('div');
    trophyList.className = 'endless-trophy-list';

    trophiesCard.appendChild(trophyHead);
    trophiesCard.appendChild(trophyMeta);
    trophiesCard.appendChild(trophyList);

    scroll.appendChild(dpsCard);
    scroll.appendChild(trophiesCard);
    scroll.appendChild(grid);
    scroll.appendChild(actions);
    panel.appendChild(scroll);

    this._refs.dpsFeverPill = dpsFeverPill;
    this._refs.dpsSegHero = dpsSegHero;
    this._refs.dpsSegTap = dpsSegTap;
    this._refs.dpsSegParty = dpsSegParty;
    this._refs.dpsHeroVal = dpsHeroCol.val;
    this._refs.dpsHeroPct = dpsHeroCol.pct;
    this._refs.dpsTapVal = dpsTapCol.val;
    this._refs.dpsTapPct = dpsTapCol.pct;
    this._refs.dpsPartyVal = dpsPartyCol.val;
    this._refs.dpsPartyPct = dpsPartyCol.pct;
    this._refs.dpsTotalVal = sumTotalVal;
    this._refs.dpsGoldSecVal = sumGoldVal;
    this._refs.trophyBonus = trophyBonus;
    this._refs.trophyRank = trophyRank;
    this._refs.trophyNext = trophyNext;
    this._refs.trophyList = trophyList;
    this._refs.saveBtn = saveBtn;
    this._refs.resetBtn = resetBtn;
  }

  _scheduleEphemeral(fn, delayMs) {
    if (typeof setTimeout !== 'function') return null;
    const timer = setTimeout(() => {
      this._ephemeralTimers.delete(timer);
      fn();
    }, delayMs);
    this._ephemeralTimers.add(timer);
    return timer;
  }

  _captureAnchorRect(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    try {
      const r = el.getBoundingClientRect();
      if (r && r.width > 0 && r.height > 0) {
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      }
    } catch {
      // Ignore rect failures in headless/Node contexts
    }
    return null;
  }

  _restartCssClass(el, className) {
    if (!el || !el.classList) return;
    if (el.classList.contains(className)) {
      el.classList.remove(className);
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          el.classList?.add(className);
        });
      } else {
        el.classList.add(className);
      }
    } else {
      el.classList.add(className);
    }
  }

  _triggerBuyFeedback(cardEl, btnEl, badgeText, isRecruit = false, preCapturedRect = null) {
    const targets = [cardEl, btnEl].filter(Boolean);
    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      if (!el.classList) continue;
      this._restartCssClass(el, 'is-buy-pulse');
      if (el._buyPulseTimer) {
        clearTimeout(el._buyPulseTimer);
        this._ephemeralTimers.delete(el._buyPulseTimer);
      }
      el._buyPulseTimer = this._scheduleEphemeral(() => {
        el.classList?.remove('is-buy-pulse');
        el._buyPulseTimer = null;
      }, 460);
    }

    if (badgeText && (preCapturedRect || btnEl) && this._hasDom()) {
      this._spawnFloatingMicroBadge(preCapturedRect || btnEl, badgeText, isRecruit);
    }
  }

  _spawnFloatingMicroBadge(anchorOrRect, text, isRecruit = false) {
    if (!this._hasDom() || !anchorOrRect) return;
    const badge = document.createElement('div');
    badge.className = isRecruit
      ? 'endless-micro-badge endless-float-badge is-recruit'
      : 'endless-micro-badge endless-float-badge';
    badge.textContent = String(text);

    const fxLayer = this._refs.fxLayer;
    const rootRect = this.root && typeof this.root.getBoundingClientRect === 'function'
      ? this.root.getBoundingClientRect()
      : null;
    const isPreRect =
      typeof anchorOrRect === 'object' &&
      typeof anchorOrRect.getBoundingClientRect !== 'function' &&
      Number.isFinite(Number(anchorOrRect.width));
    const btnRect = isPreRect
      ? anchorOrRect
      : (typeof anchorOrRect.getBoundingClientRect === 'function'
          ? anchorOrRect.getBoundingClientRect()
          : null);

    if (fxLayer && rootRect && btnRect && rootRect.width > 0 && btnRect.width > 0) {
      const rawLeft = (btnRect.left - rootRect.left) + btnRect.width * 0.5;
      const clampedLeft = Math.max(44, Math.min(rootRect.width - 44, rawLeft));
      const clampedTop = Math.max(8, (btnRect.top - rootRect.top) - 12);
      badge.style.left = `${Math.round(clampedLeft)}px`;
      badge.style.top = `${Math.round(clampedTop)}px`;
      fxLayer.appendChild(badge);
    } else if (fxLayer) {
      badge.style.left = '50%';
      badge.style.top = '50%';
      fxLayer.appendChild(badge);
    } else if (!isPreRect && anchorOrRect.parentNode) {
      anchorOrRect.parentNode.appendChild(badge);
    }

    this._scheduleEphemeral(() => {
      if (badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    }, 700);
  }

  _handleToggleAutoBoss() {
    this._playSfx('playUiClick');
    const syncBefore = this._syncCounter;
    if (typeof this.manager?.toggleAutoBoss === 'function') {
      this.manager.toggleAutoBoss();
    } else if (this.manager?.economy) {
      this.manager.economy.autoBoss = !this.manager.economy.autoBoss;
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleChallengeBoss() {
    this._playSfx('playUiConfirm');
    const syncBefore = this._syncCounter;
    if (typeof this.manager?.challengeBoss === 'function') {
      this.manager.challengeBoss();
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleSetBulkMode(mode) {
    this._playSfx('playUiClick');
    const syncBefore = this._syncCounter;
    if (typeof this.manager?.setBulkMode === 'function') {
      this.manager.setBulkMode(mode);
    } else if (this.manager?.economy) {
      this.manager.economy.bulkMode = mode;
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleBuyRelic(relicId) {
    const bulkMode = this.manager?.economy?.bulkMode || this._lastSnapshot?.bulkMode || 'x1';
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.buyRelic === 'function') {
      res = this.manager.buyRelic(relicId);
    } else if (this.manager?.economy && typeof this.manager.economy.buyRelic === 'function') {
      res = this.manager.economy.buyRelic(relicId);
      if (res?.ok) {
        if (typeof this.manager?.onRelicPurchased === 'function') {
          this.manager.onRelicPurchased(relicId, res);
        }
        if (typeof this.manager?.saveNow === 'function') {
          this.manager.saveNow();
        } else if (typeof this.manager.economy.saveToStorage === 'function') {
          this.manager.economy.saveToStorage(this.manager?.companions?.exportSnapshot?.());
        }
      }
    }

    if (res?.ok) {
      this._playSfx('playUiConfirm');
      const ref = this._relicRowRefs.get(relicId);
      const bought = Math.max(1, Math.floor(Number(res?.bought) || 1));
      const badgeText = res?.milestoneReached
        ? `${res.milestoneReached.tag}!`
        : Array.isArray(res?.setsUpgraded) && res.setsUpgraded.length > 0
          ? `${res.setsUpgraded[0].tierLabel} SET!`
          : bulkMode === 'MAX'
            ? (bought > 1 ? `MAX! +${bought}` : 'MAX!')
            : `+${bought}`;
      this._triggerBuyFeedback(
        ref?.row,
        ref?.buyBtn,
        badgeText,
        Boolean(res?.milestoneReached || (res?.setsUpgraded && res.setsUpgraded.length > 0))
      );
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleCompanionPrimary(companionId) {
    const comps = this.manager?.companions;
    const econ = this.manager?.economy;
    const state = comps?.rosterState?.[companionId];
    const snapComp = !state
      ? (this._lastSnapshot?.companions || this._lastSnapshot?.companionRoster || []).find((c) => c.id === companionId)
      : null;
    const unlocked = Boolean(state?.unlocked ?? snapComp?.unlocked);
    const syncBefore = this._syncCounter;

    let res = null;
    if (unlocked) {
      if (typeof this.manager?.upgradeCompanion === 'function') {
        res = this.manager.upgradeCompanion(companionId);
      } else if (comps && econ) {
        res = comps.upgrade?.(companionId, econ);
        if (res?.ok) {
          const hero = this.manager?.game?.fighters?.[0] || this.manager?.player || null;
          if (hero && typeof comps.syncEntitiesWithWorld === 'function') {
            comps.syncEntitiesWithWorld(hero);
          }
          if (typeof this.manager?.saveNow === 'function') {
            this.manager.saveNow();
          } else {
            econ.saveToStorage?.(comps.exportSnapshot?.());
          }
        }
      }
    } else {
      if (typeof this.manager?.recruitCompanion === 'function') {
        res = this.manager.recruitCompanion(companionId);
      } else if (comps && econ) {
        res = comps.recruit?.(companionId, econ);
        if (res?.ok) {
          const hero = this.manager?.game?.fighters?.[0] || this.manager?.player || null;
          if (hero && typeof comps.syncEntitiesWithWorld === 'function') {
            comps.syncEntitiesWithWorld(hero);
          }
          if (typeof this.manager?.saveNow === 'function') {
            this.manager.saveNow();
          } else {
            econ.saveToStorage?.(comps.exportSnapshot?.());
          }
        }
      }
    }

    if (res?.ok) {
      this._playSfx('playUiConfirm');
      const ref = this._companionCardRefs.get(companionId);
      const badgeText = unlocked ? '+1' : 'RECRUITED!';
      this._triggerBuyFeedback(ref?.card, ref?.primaryBtn, badgeText, !unlocked);
    } else {
      this._playSfx('playUiBack');
      if (res?.reason === 'stage_locked' && res?.unlockStage) {
        this._showPartyNotice(`REACH STAGE ${res.unlockStage} TO RECRUIT`);
      }
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleCompanionDeploy(companionId) {
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.toggleCompanionDeploy === 'function') {
      res = this.manager.toggleCompanionDeploy(companionId);
    } else {
      const comps = this.manager?.companions;
      if (!comps || typeof comps.toggleDeploy !== 'function') return;
      res = comps.toggleDeploy(companionId);
      if (res?.ok) {
        const hero = this.manager?.game?.fighters?.[0] || this.manager?.player || null;
        if (hero && typeof comps.syncEntitiesWithWorld === 'function') {
          comps.syncEntitiesWithWorld(hero);
        }
        if (typeof this.manager?.saveNow === 'function') {
          this.manager.saveNow();
        } else {
          this.manager?.economy?.saveToStorage?.(comps.exportSnapshot?.());
        }
      }
    }

    if (res?.ok) {
      this._playSfx('playUiClick');
    } else if (res?.reason === 'SLOTS_FULL') {
      this._playSfx('playUiBack');
      this._showPartyNotice('PARTY FULL (3/3) - BENCH A COMPANION FIRST');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleCompanionPromote(companionId) {
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.promoteCompanion === 'function') {
      res = this.manager.promoteCompanion(companionId);
    } else if (typeof this.manager?.companionEvo?.promoteCompanion === 'function') {
      res = this.manager.companionEvo.promoteCompanion(
        companionId,
        this.manager?.economy || null,
        this.manager?.gear || null
      );
      if (res?.ok) {
        const hero = this.manager?.game?.fighters?.[0] || this.manager?.player || null;
        if (hero && typeof this.manager?.companions?.syncEntitiesWithWorld === 'function') {
          this.manager.companions.syncEntitiesWithWorld(hero);
        }
        this.manager?.saveNow?.();
      }
    }

    if (res?.ok) {
      this._playSfx('playUiConfirm');
      const ref = this._companionCardRefs.get(companionId);
      const newStar = Math.max(1, Math.min(5, Math.floor(Number(res.star) || 1)));
      const unlockedAuraTier = Math.max(
        0,
        Math.floor(Number(res.unlockedAuraTier) || (newStar >= 3 ? newStar : 0))
      );
      const auraMeta = resolveCompanionAuraMeta(newStar, res.auraTier || null);
      const badgeText = unlockedAuraTier >= 3
        ? `${auraMeta.shortLabel} AURA!`
        : `${newStar}-STAR!`;
      this._triggerBuyFeedback(ref?.card, ref?.promoteBtn, badgeText, unlockedAuraTier >= 3);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleSetSquadFormation(formationId) {
    if (!formationId) return;
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.setSquadFormation === 'function') {
      res = this.manager.setSquadFormation(formationId);
    } else if (typeof this.manager?.companionEvo?.setFormation === 'function') {
      res = this.manager.companionEvo.setFormation(formationId);
      this.manager?.saveNow?.();
    }

    if (res && res.ok === false) {
      this._playSfx('playUiBack');
    } else {
      this._playSfx('playUiClick');
      const btn = this._formationBtnRefs.get(formationId);
      if (btn) {
        this._triggerBuyFeedback(null, btn, null, false);
      }
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleTriggerSquadOverdrive() {
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.triggerSquadOverdrive === 'function') {
      res = this.manager.triggerSquadOverdrive();
    } else if (typeof this.manager?.companionEvo?.consumeOverdrive === 'function') {
      const count = this.manager?.companions?.activeSlots?.length || 1;
      res = this.manager.companionEvo.consumeOverdrive(count);
    }

    if (res?.ok) {
      this._playSfx('playUiConfirm');
      this._triggerBuyFeedback(this._refs.partyHud, this._refs.overdriveBtn, 'OVERDRIVE!', true);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _showPartyNotice(msg) {
    const el = this._refs.partyNotice;
    if (!el) return;
    setTextIfChanged(el, msg);
    el.classList.remove('hidden');
    if (this._partyNoticeTimer) clearTimeout(this._partyNoticeTimer);
    if (typeof setTimeout === 'function') {
      this._partyNoticeTimer = setTimeout(() => {
        el.classList.add('hidden');
        this._partyNoticeTimer = null;
      }, 2400);
    }
  }

  _handleSaveRun() {
    this._playSfx('playUiConfirm');
    if (typeof this.manager?.saveNow === 'function') {
      this.manager.saveNow();
    } else if (this.manager?.economy) {
      this.manager.economy.saveToStorage(this.manager?.companions?.exportSnapshot?.());
    }
    const btn = this._refs.saveBtn;
    if (btn) {
      setTextIfChanged(btn, 'SAVED!');
      if (this._saveFlashTimer) clearTimeout(this._saveFlashTimer);
      if (typeof setTimeout === 'function') {
        this._saveFlashTimer = setTimeout(() => {
          setTextIfChanged(btn, 'SAVE RUN');
          this._saveFlashTimer = null;
        }, 1200);
      }
    }
  }

  _disarmResetConfirm() {
    this._resetArmed = false;
    if (this._resetArmTimer) {
      clearTimeout(this._resetArmTimer);
      this._resetArmTimer = null;
    }
    if (this._refs.resetBtn) {
      this._refs.resetBtn.classList.remove('is-armed');
      setTextIfChanged(this._refs.resetBtn, 'RESET RUN');
    }
  }

  _handleResetRunClick() {
    if (!this._resetArmed) {
      this._resetArmed = true;
      this._playSfx('playUiClick');
      if (this._refs.resetBtn) {
        this._refs.resetBtn.classList.add('is-armed');
        setTextIfChanged(this._refs.resetBtn, 'CONFIRM RESET?');
      }
      if (this._resetArmTimer) clearTimeout(this._resetArmTimer);
      if (typeof setTimeout === 'function') {
        this._resetArmTimer = setTimeout(() => {
          this._disarmResetConfirm();
        }, 4000);
      }
      return;
    }

    this._disarmResetConfirm();
    this._playSfx('playUiBack');
    const syncBefore = this._syncCounter;
    if (typeof this.manager?.resetEndlessRun === 'function') {
      this.manager.resetEndlessRun();
    } else if (this.manager?.economy) {
      this.manager.economy.resetRunState({ keepMeta: true });
      this.manager?.companions?.reset?.();
      this.manager.economy.saveToStorage(this.manager?.companions?.exportSnapshot?.());
    }
    this._resyncIfNeeded(syncBefore);
  }

  _disarmAscendConfirm() {
    this._ascendArmed = false;
    if (this._ascendArmTimer) {
      clearTimeout(this._ascendArmTimer);
      this._ascendArmTimer = null;
    }
    if (this._refs.ascendBtn) {
      this._refs.ascendBtn.classList.remove('is-armed');
    }
    if (this._refs.ascendBtnLabel) {
      const asc = this._lastResolvedAscension;
      if (asc && !asc.canAscend) {
        setTextIfChanged(this._refs.ascendBtnLabel, `REACH STAGE ${asc.unlockStage} TO ASCEND`);
      } else {
        setTextIfChanged(this._refs.ascendBtnLabel, 'ASCEND NOW');
      }
    }
  }

  _triggerAscendFlash(shardsGained = 0, preCapturedBtnRect = null) {
    const card = this._refs.ascendCard;
    if (card && card.classList) {
      this._restartCssClass(card, 'is-ascend-flash');
      if (card._ascendFlashTimer) {
        clearTimeout(card._ascendFlashTimer);
        this._ephemeralTimers.delete(card._ascendFlashTimer);
      }
      card._ascendFlashTimer = this._scheduleEphemeral(() => {
        card.classList?.remove('is-ascend-flash');
        card._ascendFlashTimer = null;
      }, 700);
    }
    const btn = this._refs.ascendBtn;
    const badgeText = shardsGained > 0 ? `+${formatEndlessNumber(shardsGained)} SHARDS!` : 'ASCENDED!';
    if (btn || preCapturedBtnRect) {
      this._triggerBuyFeedback(null, btn, badgeText, false, preCapturedBtnRect);
    }
  }

  _handleAscendClick() {
    const state = this._resolveState(this._lastSnapshot, true);
    const asc = state.ascension;
    if (!asc || !asc.canAscend) {
      this._playSfx('playUiBack');
      this._disarmAscendConfirm();
      return;
    }

    if (!this._ascendArmed) {
      this._ascendArmed = true;
      this._playSfx('playUiClick');
      if (this._refs.ascendBtn) {
        this._refs.ascendBtn.classList.add('is-armed');
      }
      setTextIfChanged(
        this._refs.ascendBtnLabel,
        `CONFIRM ASCEND? (+${formatEndlessNumber(asc.pendingShards)} SHARDS)`
      );
      if (this._ascendArmTimer) clearTimeout(this._ascendArmTimer);
      if (typeof setTimeout === 'function') {
        this._ascendArmTimer = setTimeout(() => {
          this._disarmAscendConfirm();
        }, 4000);
      }
      return;
    }

    const previewGained = asc.pendingShards;
    const preRect = this._captureAnchorRect(this._refs.ascendBtn);
    this._disarmAscendConfirm();
    const syncBefore = this._syncCounter;

    let res = null;
    if (typeof this.manager?.performAscension === 'function') {
      res = this.manager.performAscension();
    } else if (typeof this.manager?.ascension?.performAscension === 'function' && this.manager?.economy) {
      res = this.manager.ascension.performAscension(this.manager.economy, this.manager.companions);
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const ok = res === undefined
      ? typeof this.manager?.performAscension === 'function'
      : Boolean(res?.ok !== false);
    if (ok) {
      this._playSfx('playUiConfirm');
      const gained = Math.max(0, Math.floor(Number(res?.shardsGained ?? previewGained) || 0));
      this._triggerAscendFlash(gained, preRect);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleBuyEternalArtifact(artifactId) {
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.buyEternalArtifact === 'function') {
      res = this.manager.buyEternalArtifact(artifactId);
    } else if (typeof this.manager?.ascension?.buyArtifact === 'function' && this.manager?.economy) {
      res = this.manager.ascension.buyArtifact(artifactId, this.manager.economy);
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const ok = res === undefined
      ? typeof this.manager?.buyEternalArtifact === 'function'
      : Boolean(res?.ok);
    if (ok) {
      this._playSfx('playUiConfirm');
      const ref = this._artifactRowRefs.get(artifactId);
      this._triggerBuyFeedback(ref?.row, ref?.buyBtn, '+1', true);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleEquipGear(uid, rowEl = null, btnEl = null, itemHint = null) {
    if (!uid) return;
    const preBtnRect = this._captureAnchorRect(btnEl);
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.equipGearItem === 'function') {
      res = this.manager.equipGearItem(uid);
    } else if (typeof this.manager?.gear?.equipItem === 'function') {
      res = this.manager.gear.equipItem(uid);
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const ok = res === undefined
      ? typeof this.manager?.equipGearItem === 'function'
      : Boolean(res?.ok);
    if (ok) {
      this._playSfx('playUiConfirm');
      const slotId = res?.equippedItem?.slot || itemHint?.slot || null;
      const slotRef = slotId ? this._gearSlotRefs.get(slotId) : null;
      const anchor = slotRef?.card || (btnEl?.isConnected ? btnEl : this._refs.gearEquipBestBtn);
      const isUp = Boolean(itemHint?.isUpgradeOverEquipped);
      const rect = this._captureAnchorRect(slotRef?.card) || preBtnRect;
      this._triggerBuyFeedback(slotRef?.card || rowEl, anchor, isUp ? 'UPGRADED!' : 'EQUIPPED!', isUp, rect);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleEquipBestGear() {
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.equipBestGear === 'function') {
      res = this.manager.equipBestGear();
    } else if (typeof this.manager?.gear?.equipBest === 'function') {
      res = this.manager.gear.equipBest();
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const changed = Math.max(0, Math.floor(Number(res?.changedCount) || 0));
    const ok = Boolean(res?.ok) && changed > 0;
    const btn = this._refs.gearEquipBestBtn;
    if (ok) {
      this._playSfx('playUiConfirm');
      this._triggerBuyFeedback(this._refs.gearHeader, btn, `EQUIPPED ${changed}!`, true);
    } else if (res?.ok || res === undefined) {
      this._playSfx('playUiClick');
      if (btn) {
        this._spawnFloatingMicroBadge(btn, 'BEST EQUIPPED', false);
      }
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleEnhanceGear(uid, cardEl = null, btnEl = null, itemHint = null) {
    if (!uid) return;
    const preBtnRect = this._captureAnchorRect(btnEl);
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.enhanceGearItem === 'function') {
      res = this.manager.enhanceGearItem(uid);
    } else if (typeof this.manager?.gear?.enhanceItem === 'function') {
      res = this.manager.gear.enhanceItem(uid);
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const ok = res === undefined
      ? typeof this.manager?.enhanceGearItem === 'function'
      : Boolean(res?.ok);
    if (ok) {
      this._playSfx('playUiConfirm');
      const nextLv = Math.max(
        1,
        Math.floor(Number(res?.enhanceLevel ?? res?.item?.enhanceLevel ?? ((itemHint?.enhanceLevel || 0) + 1)) || 1)
      );
      const isMilestone = nextLv >= 20 || nextLv % 5 === 0;
      const anchor = (btnEl && btnEl.isConnected !== false) ? btnEl : this._refs.gearDustMetric;
      this._triggerBuyFeedback(cardEl, anchor, `+${nextLv}!`, isMilestone, preBtnRect);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleSalvageGear(uid, rowEl = null, btnEl = null, itemHint = null) {
    if (!uid) return;
    // Capture click rect BEFORE salvage removes the bag row from DOM!
    const preBtnRect = this._captureAnchorRect(btnEl);
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.salvageGearItem === 'function') {
      res = this.manager.salvageGearItem(uid);
    } else if (typeof this.manager?.gear?.salvageItem === 'function') {
      res = this.manager.gear.salvageItem(uid);
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const ok = res === undefined
      ? typeof this.manager?.salvageGearItem === 'function'
      : Boolean(res?.ok);
    if (ok) {
      this._playSfx('playUiConfirm');
      const dust = Math.max(0, Math.floor(Number(res?.dustGained ?? itemHint?.salvageValue) || 0));
      const badge = dust > 0 ? `+${formatEndlessNumber(dust)} DUST` : 'SALVAGED!';
      const anchor = this._refs.gearDustMetric || this._refs.gearSalvageLowerBtn;
      this._triggerBuyFeedback(this._refs.gearDustMetric, anchor, badge, false, preBtnRect);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleSalvageAllLowerGear() {
    const preBtnRect = this._captureAnchorRect(this._refs.gearSalvageLowerBtn);
    const syncBefore = this._syncCounter;
    let res = null;
    if (typeof this.manager?.salvageAllLowerGear === 'function') {
      res = this.manager.salvageAllLowerGear();
    } else if (typeof this.manager?.gear?.salvageAllLower === 'function') {
      res = this.manager.gear.salvageAllLower();
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const count = Math.max(0, Math.floor(Number(res?.count) || 0));
    const dust = Math.max(0, Math.floor(Number(res?.dustGained) || 0));
    const ok = Boolean(res?.ok) && (count > 0 || dust > 0);
    const btn = this._refs.gearSalvageLowerBtn;
    if (ok) {
      this._playSfx('playUiConfirm');
      const badge = dust > 0
        ? `+${formatEndlessNumber(dust)} DUST (${count})`
        : `SALVAGED ${count}!`;
      this._triggerBuyFeedback(this._refs.gearDustMetric, btn || this._refs.gearDustMetric, badge, true, preBtnRect);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleCollectOfflineLoot() {
    // Capture button rect BEFORE manager.claimOfflineLoot() synchronously hides offlineModal!
    const preBtnRect = this._captureAnchorRect(this._refs.offlineCollectBtn);
    this._playSfx('playUiConfirm');
    const syncBefore = this._syncCounter;
    let claimed = false;
    if (typeof this.manager?.claimOfflineLoot === 'function') {
      const res = this.manager.claimOfflineLoot();
      claimed = res !== false;
    } else if (this.manager?.pendingOfflineLoot) {
      const loot = this.manager.pendingOfflineLoot;
      if (loot.gold > 0) this.manager.economy?.addGold?.(loot.gold);
      if (loot.astralShards > 0) this.manager.economy?.addAstralShards?.(loot.astralShards);
      this.manager.pendingOfflineLoot = null;
      claimed = true;
    }
    if (this._lastSnapshot && typeof this._lastSnapshot === 'object' && !this.manager?.pendingOfflineLoot) {
      this._lastSnapshot = { ...this._lastSnapshot, pendingOfflineLoot: null };
    }
    if (claimed && (preBtnRect || this._refs.offlineCollectBtn)) {
      this._spawnFloatingMicroBadge(preBtnRect || this._refs.offlineCollectBtn, 'LOOT CLAIMED!', false);
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleContinueOfflineLoot() {
    this._playSfx('playUiConfirm');
    const syncBefore = this._syncCounter;
    const hasPending = Boolean(this.manager?.pendingOfflineLoot || this._lastSnapshot?.pendingOfflineLoot);
    if (hasPending && typeof this.manager?.claimOfflineLoot === 'function') {
      this.manager.claimOfflineLoot();
    } else if (typeof this.manager?.dismissOfflineLoot === 'function') {
      this.manager.dismissOfflineLoot();
    } else if (this.manager?.pendingOfflineLoot) {
      const loot = this.manager.pendingOfflineLoot;
      if (loot.gold > 0) this.manager.economy?.addGold?.(loot.gold);
      if (loot.astralShards > 0) this.manager.economy?.addAstralShards?.(loot.astralShards);
      this.manager.pendingOfflineLoot = null;
    }
    if (this._lastSnapshot && typeof this._lastSnapshot === 'object' && !this.manager?.pendingOfflineLoot) {
      this._lastSnapshot = { ...this._lastSnapshot, pendingOfflineLoot: null };
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleClaimActiveBounty(anchorEl = null) {
    if (!this._lastBountyCompleted) return;
    if (typeof this.manager?.claimActiveBounty !== 'function') return;
    const targetAnchor = anchorEl || this._refs.bountyPill;
    const preRect = this._captureAnchorRect(targetAnchor);
    const syncBefore = this._syncCounter;
    const res = this.manager.claimActiveBounty();
    if (res === false || (res && typeof res === 'object' && res.ok === false)) {
      return;
    }
    this._playSfx('playUiConfirm');
    this._triggerBuyFeedback(
      targetAnchor,
      targetAnchor,
      '+REWARD!',
      false,
      preRect
    );
    this._resyncIfNeeded(syncBefore);
  }

  _handleBuyMerchantOffer(btnEl = null, cardEl = null) {
    const targetBtn = btnEl || this._refs.merchantBuyBtn;
    const targetCard = cardEl || this._refs.merchantCard;
    if (targetBtn?.disabled) return;
    if (typeof this.manager?.buyMerchantOffer !== 'function') return;
    // Capture rect BEFORE manager.buyMerchantOffer() synchronously hides merchantCard!
    const preBtnRect = this._captureAnchorRect(targetBtn) || this._captureAnchorRect(targetCard);
    const offerTypeBefore = this._lastMerchantOfferType || '';
    const syncBefore = this._syncCounter;
    const res = this.manager.buyMerchantOffer();
    if (res === false || (res && typeof res === 'object' && res.ok === false)) {
      return;
    }
    this._playSfx('playUiConfirm');
    const offerType = res?.offerType || offerTypeBefore;
    const isElixir = offerType === 'dps_elixir';
    const badgeText = isElixir ? '3X DPS!' : '+GEAR CHEST!';
    this._triggerBuyFeedback(
      targetCard,
      targetBtn,
      badgeText,
      isElixir,
      preBtnRect
    );
    this._resyncIfNeeded(syncBefore);
  }

  _handleDismissMerchantOffer() {
    this._playSfx('playUiBack');
    const syncBefore = this._syncCounter;
    this.manager?.dismissMerchantOffer?.();
    this._resyncIfNeeded(syncBefore);
  }

  _handleEnterTrial(trialId, cardEl = null, btnEl = null) {
    if (!trialId) return;
    if (typeof this.manager?.enterTrial !== 'function') return;
    // Capture click rect BEFORE manager.enterTrial() synchronously closes shopShell!
    const targetCard = cardEl || this._trialCardRefs.get(trialId)?.card || null;
    const targetBtn = btnEl || this._trialCardRefs.get(trialId)?.enterBtn || null;
    const preBtnRect = this._captureAnchorRect(targetBtn) || this._captureAnchorRect(targetCard);
    const syncBefore = this._syncCounter;
    const res = this.manager.enterTrial(trialId);
    const ok = res !== false && !(res && typeof res === 'object' && res.ok === false);
    if (ok) {
      this._playSfx('playUiConfirm');
      this._triggerBuyFeedback(targetCard, targetBtn, null, true);
      const badgeAnchor = preBtnRect || this._refs.trialHud || targetBtn;
      if (badgeAnchor) {
        this._spawnFloatingMicroBadge(badgeAnchor, 'PORTAL OPEN!', true);
      }
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncIfNeeded(syncBefore);
  }

  _handleExitTrial() {
    if (typeof this.manager?.exitTrial !== 'function') return;
    this._playSfx('playUiBack');
    const syncBefore = this._syncCounter;
    this.manager.exitTrial({ completedFull: false });
    this._resyncIfNeeded(syncBefore);
  }

  _handleDismissTrialResult() {
    this._playSfx('playUiConfirm');
    const syncBefore = this._syncCounter;
    if (typeof this.manager?.dismissTrialResult === 'function') {
      this.manager.dismissTrialResult();
    } else if (this._lastSnapshot?.trials && typeof this._lastSnapshot.trials === 'object') {
      this._lastSnapshot = {
        ...this._lastSnapshot,
        trials: { ...this._lastSnapshot.trials, lastResult: null }
      };
    }
    this._resyncIfNeeded(syncBefore);
  }

  _resyncNow() {
    const snap = typeof this.manager?.getUiSnapshot === 'function'
      ? this.manager.getUiSnapshot()
      : this._lastSnapshot;
    this.sync(snap, false);
  }

  _resyncIfNeeded(syncBefore) {
    if (this._syncCounter === syncBefore) {
      this._resyncNow();
    }
  }

  _clearTransientUiState() {
    this._disarmResetConfirm();
    this._disarmAscendConfirm();
    if (this._partyNoticeTimer) {
      clearTimeout(this._partyNoticeTimer);
      this._partyNoticeTimer = null;
    }
    if (this._refs.partyNotice) {
      this._refs.partyNotice.classList.add('hidden');
    }
    if (this._saveFlashTimer) {
      clearTimeout(this._saveFlashTimer);
      this._saveFlashTimer = null;
    }
    if (this._refs.saveBtn) {
      setTextIfChanged(this._refs.saveBtn, 'SAVE RUN');
    }
    for (const timer of this._ephemeralTimers) {
      clearTimeout(timer);
    }
    this._ephemeralTimers.clear();
    if (this._refs.fxLayer) {
      this._refs.fxLayer.textContent = '';
    }
  }

  _syncTabVisibility() {
    for (const [id, btn] of this._tabBtnRefs.entries()) {
      const active = id === this.activeTab;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    for (const [id, panel] of this._tabPanelRefs.entries()) {
      panel.classList.toggle('hidden', id !== this.activeTab);
    }
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    if (this.visible && !this.mounted) {
      this.mount();
    }
    if (this.root) {
      this.root.classList.toggle('hidden', !this.visible);
    }
    if (!this.visible) {
      this.setDrawerOpen(false);
      this._mobileHud?.closePopCard();
      this._clearTransientUiState();
      if (this.root) {
        this.root.classList.remove('has-event-alert');
      }
      this._lastSnapshot = null;
    }
  }

  setDrawerOpen(open) {
    this.drawerOpen = Boolean(open);
    if (this.drawerOpen) {
      this._mobileHud?.closePopCard();
    }
    if (this.root) {
      this.root.classList.toggle('is-drawer-open', Boolean(this.drawerOpen));
    }
    if (this._refs.shopShell) {
      this._refs.shopShell.classList.toggle('hidden', !this.drawerOpen);
    }
    if (this._refs.shopToggle) {
      this._refs.shopToggle.classList.toggle('is-open', this.drawerOpen);
      this._refs.shopToggle.setAttribute('aria-expanded', this.drawerOpen ? 'true' : 'false');
    }
    if (!this.drawerOpen) {
      this._disarmResetConfirm();
      this._disarmAscendConfirm();
    } else if (this._lastSnapshot || this.manager) {
      this._blitAllIcons(false);
      this._resyncNow();
    }
  }

  toggleDrawer() {
    this._playSfx('playUiClick');
    this.setDrawerOpen(!this.drawerOpen);
    return this.drawerOpen;
  }

  isDrawerOpen() {
    return Boolean(this.drawerOpen);
  }

  setActiveTab(tabId) {
    const exists = this.tabs.some((t) => t.id === tabId);
    this.activeTab = exists ? tabId : 'items';
    if (this.activeTab !== 'stats') {
      this._disarmResetConfirm();
    }
    if (this.activeTab !== 'ascend') {
      this._disarmAscendConfirm();
    }
    this._syncTabVisibility();
    if (this.drawerOpen && (this._lastSnapshot || this.manager)) {
      this.sync(this._lastSnapshot, false);
    }
  }

  _resolveState(snapshot, includeDrawerTabs = true) {
    const snap = snapshot && typeof snapshot === 'object' ? snapshot : null;
    const mgr = this.manager || null;
    const econ = mgr?.economy || null;
    const realmObj = snap?.realm || mgr?.getCurrentRealm?.() || null;

    const stage = Math.max(1, Math.floor(Number(snap?.stage ?? econ?.stage ?? mgr?.stage ?? 1) || 1));
    const bestStage = Math.max(
      stage,
      Math.floor(Number(snap?.bestStage ?? econ?.bestStage ?? mgr?.bestStage ?? stage) || stage)
    );
    const waveInStage = Math.max(
      1,
      Math.floor(Number(snap?.waveInStage ?? econ?.waveInStage ?? mgr?.waveInStage ?? 1) || 1)
    );
    const wavesPerStage = Math.max(
      1,
      Math.floor(Number(snap?.wavesPerStage ?? mgr?.wavesPerStage ?? 5) || 5)
    );
    const realmName = String(snap?.realmName ?? realmObj?.name ?? 'ECLIPSE SANCTUM');
    const realmAccent = String(snap?.realmAccent ?? realmObj?.accentHex ?? '#38bdf8');
    const ascendedLoop = Math.max(
      1,
      Math.floor(Number(snap?.ascendedLoop ?? realmObj?.ascendedLoop ?? (Math.floor((stage - 1) / 4) + 1)) || 1)
    );

    const isBossEncounter = Boolean(snap?.isBossEncounter ?? mgr?.isBossEncounter ?? false);
    const bossFarmMode = Boolean(snap?.bossFarmMode ?? mgr?.bossFarmMode ?? false);
    const bossTimer = Math.max(0, Number(snap?.bossTimer ?? mgr?.bossTimer ?? 0) || 0);
    const bossTimerMax = Math.max(1, Number(snap?.bossTimerMax ?? mgr?.bossTimerMax ?? 40) || 40);

    const gold = Number(snap?.gold ?? econ?.gold ?? 0) || 0;
    const totalGoldEarned = Number(snap?.totalGoldEarned ?? econ?.totalGoldEarned ?? gold) || 0;
    const astralShards = Number(snap?.astralShards ?? econ?.astralShards ?? 0) || 0;
    const autoBoss = snap?.autoBoss !== undefined
      ? Boolean(snap.autoBoss)
      : (snap?.autoBossEnabled !== undefined
        ? Boolean(snap.autoBossEnabled)
        : (econ?.autoBoss !== undefined ? Boolean(econ.autoBoss) : true));
    const bulkMode = snap?.bulkMode ?? econ?.bulkMode ?? 'x1';

    const tapFever = Math.max(0, Math.min(100, Number(snap?.tapFever ?? econ?.tapFever ?? 0) || 0));
    const tapFeverTimer = Math.max(0, Number(snap?.tapFeverTimer ?? econ?.tapFeverTimer ?? 0) || 0);
    const tapFeverLevel = Math.max(0, Math.floor(Number(snap?.tapFeverLevel ?? econ?.tapFeverLevel ?? 0) || 0));

    const totalKills = Number(snap?.totalKills ?? econ?.totalKills ?? 0) || 0;
    const bossesSlain = Number(snap?.bossesSlain ?? econ?.bossesSlain ?? 0) || 0;
    const totalTaps = Number(snap?.totalTaps ?? econ?.totalTaps ?? 0) || 0;

    const dpsMetrics = snap?.dpsMetrics || econ?.dpsMetrics || {
      heroDps: 0,
      tapDps: 0,
      companionDps: 0,
      goldPerSec: 0
    };
    const stats = includeDrawerTabs
      ? (snap?.stats || (typeof econ?.getComputedStats === 'function' ? econ.getComputedStats() : null))
      : (snap?.stats || null);

    let relicsView = Array.isArray(snap?.relics) ? snap.relics : null;
    let itemsActionable = false;
    if (relicsView) {
      for (let i = 0; i < relicsView.length; i++) {
        const item = relicsView[i];
        if (item && (item.canAfford ?? item.quote?.canAfford)) {
          itemsActionable = true;
          break;
        }
      }
    } else if (includeDrawerTabs) {
      relicsView = ENDLESS_RELICS.map((r) => {
        const level = econ ? econ.getRelicLevel(r.id) : 0;
        const quote = econ
          ? econ.getRelicCost(r.id, bulkMode)
          : { count: 1, totalCost: r.baseCost, canAfford: gold >= r.baseCost, nextCost: r.baseCost };
        if (quote.canAfford) itemsActionable = true;
        return {
          id: r.id,
          level,
          count: quote.count,
          totalCost: quote.totalCost,
          canAfford: quote.canAfford,
          nextCost: quote.nextCost,
          bonusText: r.formatBonus(level)
        };
      });
    } else {
      relicsView = [];
      for (let i = 0; i < ENDLESS_RELICS.length; i++) {
        const r = ENDLESS_RELICS[i];
        const canAff = econ
          ? Boolean(econ.getRelicCost(r.id, bulkMode)?.canAfford)
          : gold >= r.baseCost;
        if (canAff) {
          itemsActionable = true;
          break;
        }
      }
    }

    let rawHudUnits = Array.isArray(snap?.activeCompanionUnits) ? snap.activeCompanionUnits : null;
    if (!rawHudUnits && mgr?.companions && typeof mgr.companions.getActiveHudUnits === 'function') {
      rawHudUnits = mgr.companions.getActiveHudUnits();
    }

    let companions = Array.isArray(snap?.companions)
      ? snap.companions
      : (Array.isArray(snap?.companionRoster) ? snap.companionRoster : null);
    if (!companions && (includeDrawerTabs || !rawHudUnits) && mgr?.companions && typeof mgr.companions.getRosterView === 'function') {
      companions = mgr.companions.getRosterView(econ);
    }
    if (!companions) companions = [];

    const maxActiveSlots = Math.max(1, Math.floor(Number(snap?.maxActiveSlots ?? mgr?.companions?.maxActiveSlots ?? 3) || 3));
    const activeSlotsCount = Number.isFinite(Number(snap?.activeCompanionCount))
      ? Number(snap.activeCompanionCount)
      : (Array.isArray(snap?.activeSlots)
        ? snap.activeSlots.length
        : (Array.isArray(mgr?.companions?.activeSlots) && companions.length === 0
          ? mgr.companions.activeSlots.length
          : companions.filter((c) => c.deployed).length));

    let alliesActionable = false;
    let alliesUpgradeAffordable = false;
    const hasOpenAllySlot = activeSlotsCount < maxActiveSlots;
    if (companions.length > 0) {
      for (let i = 0; i < companions.length; i++) {
        const c = companions[i];
        if (!c) continue;
        const canRecruit = Boolean(!c.unlocked && !c.stageLocked && c.canAffordRecruit);
        const canPromote = Boolean(c.unlocked && c.promoteQuote?.canPromote && !c.promoteQuote?.isMaxStar);
        const canDeployIntoOpenSlot = Boolean(hasOpenAllySlot && c.unlocked && !c.deployed);
        if (canRecruit || canPromote || canDeployIntoOpenSlot) {
          alliesActionable = true;
        }
        if (c.unlocked && c.canAffordUpgrade) {
          alliesUpgradeAffordable = true;
        }
        if (alliesActionable && alliesUpgradeAffordable) break;
      }
    } else if (mgr?.companions?.rosterState) {
      const rs = mgr.companions.rosterState;
      const activeSet = new Set(Array.isArray(mgr.companions.activeSlots) ? mgr.companions.activeSlots : []);
      for (const cid of Object.keys(rs)) {
        const st = rs[cid];
        if (hasOpenAllySlot && st?.unlocked && !activeSet.has(cid)) {
          alliesActionable = true;
          break;
        }
      }
    }

    if (!rawHudUnits) {
      rawHudUnits = companions
        .filter((c) => c.deployed)
        .slice(0, 3)
        .map((c) => ({
          id: c.id,
          heroKey: c.heroKey,
          activeHeroKey: c.activeHeroKey || c.heroKey,
          name: c.name,
          shortName: c.shortName || c.name,
          role: c.role,
          color: c.accentHex || c.color || '#facc15',
          level: c.level || 1,
          star: c.star || 1,
          auraTier: c.auraTier || c.promoteQuote?.auraTier || null,
          isExEvolved: true,
          ultCharge: 0,
          ultPct: 0,
          isCastingUlt: false,
          skillCdRatio: 0,
          dpsEstimate: c.dpsEstimate || 0,
          lastCallout: ''
        }));
    }

    const activeCompanionUnits = rawHudUnits.slice(0, 3).map((u, idx) => {
      const rawUlt = Number.isFinite(Number(u?.ultPct))
        ? Number(u.ultPct)
        : (Number.isFinite(Number(u?.ultCharge)) ? Number(u.ultCharge) : 0);
      const ultPct = rawUlt <= 1 && rawUlt > 0 && !Number.isFinite(Number(u?.ultCharge))
        ? Math.max(0, Math.min(100, rawUlt * 100))
        : Math.max(0, Math.min(100, rawUlt));
      const fullName = String(u?.name || u?.shortName || u?.id || `ALLY ${idx + 1}`);
      const star = Math.max(1, Math.min(5, Math.floor(Number(u?.star) || 1)));
      const heroKey = String(u?.heroKey || '');
      const activeHeroKey = String(u?.activeHeroKey || heroKey);
      return {
        id: String(u?.id || u?.heroKey || `unit_${idx}`),
        heroKey,
        activeHeroKey,
        name: fullName,
        shortName: String(u?.shortName || fullName),
        role: String(u?.role || 'ALLY'),
        color: String(u?.color || u?.accentHex || '#facc15'),
        level: Math.max(1, Math.floor(Number(u?.level) || 1)),
        star,
        auraTier: u?.auraTier || null,
        isExEvolved: true,
        ultCharge: Math.max(0, Math.min(100, Number(u?.ultCharge ?? ultPct) || 0)),
        ultPct,
        isCastingUlt: Boolean(u?.isCastingUlt),
        skillCdRatio: Math.max(0, Math.min(1, Number(u?.skillCdRatio) || 0)),
        dpsEstimate: Math.max(0, Number(u?.dpsEstimate) || 0),
        lastCallout: String(u?.lastCallout || '')
      };
    });

    let rawSynergies = Array.isArray(snap?.activeSynergies) ? snap.activeSynergies : null;
    if (!rawSynergies && mgr?.companions && typeof mgr.companions.getActiveSynergies === 'function') {
      rawSynergies = mgr.companions.getActiveSynergies();
    }
    const activeSynergies = Array.isArray(rawSynergies)
      ? rawSynergies.map((s, idx) => ({
          id: String(s?.id || s?.name || `syn_${idx}`),
          name: String(s?.name || s?.shortLabel || 'SYNERGY'),
          shortLabel: String(s?.shortLabel || s?.name || 'BUFF'),
          desc: String(s?.desc || ''),
          color: String(s?.color || '#facc15')
        }))
      : [];

    const feverTier = Number.isFinite(Number(snap?.feverTier))
      ? Math.max(0, Math.floor(Number(snap.feverTier)))
      : (tapFeverTimer > 0 ? (tapFeverLevel >= 2 ? 2 : 1) : 0);
    const feverGoldMult = Number.isFinite(Number(snap?.feverGoldMult))
      ? Math.max(1, Number(snap.feverGoldMult))
      : Math.max(1, Number(stats?.feverGoldMult) || (feverTier >= 2 ? 3 : feverTier === 1 ? 2 : 1));

    const rawAsc = (snap && typeof snap.ascension === 'object' && snap.ascension)
      ? snap.ascension
      : (typeof mgr?.ascension?.getAscensionView === 'function'
        ? mgr.ascension.getAscensionView(stage, econ)
        : null);

    const ascShards = Math.max(
      0,
      Math.floor(Number(rawAsc?.astralShards ?? astralShards) || 0)
    );
    const resolvedAstralShards = (snap && snap.astralShards !== undefined)
      ? astralShards
      : (econ && econ.astralShards !== undefined ? astralShards : ascShards);

    let anyArtifactAffordable = false;
    let normalizedArtifacts = [];
    if (Array.isArray(rawAsc?.artifacts)) {
      if (includeDrawerTabs) {
        normalizedArtifacts = rawAsc.artifacts.map((a, idx) => {
          const level = Math.max(0, Math.floor(Number(a?.level) || 0));
          const maxLevel = Math.max(1, Math.floor(Number(a?.maxLevel) || 1));
          const isMaxed = Boolean(a?.isMaxed ?? (level >= maxLevel));
          const cost = Math.max(0, Math.floor(Number(a?.cost) || 0));
          const canAfford = Boolean(
            !isMaxed && (a?.canAfford !== undefined ? a.canAfford : ascShards >= cost)
          );
          if (canAfford) anyArtifactAffordable = true;
          return {
            id: String(a?.id || `artifact_${idx}`),
            name: String(a?.name || a?.id || `ARTIFACT ${idx + 1}`),
            desc: String(a?.desc || ''),
            level,
            maxLevel,
            cost,
            isMaxed,
            canAfford,
            effectSummary: String(a?.effectSummary || ''),
            iconCol: a?.iconCol
          };
        });
      } else {
        for (let i = 0; i < rawAsc.artifacts.length; i++) {
          const a = rawAsc.artifacts[i];
          if (!a) continue;
          const level = Math.max(0, Math.floor(Number(a.level) || 0));
          const maxLevel = Math.max(1, Math.floor(Number(a.maxLevel) || 1));
          const isMaxed = Boolean(a.isMaxed ?? (level >= maxLevel));
          const cost = Math.max(0, Math.floor(Number(a.cost) || 0));
          const canAfford = Boolean(!isMaxed && (a.canAfford !== undefined ? a.canAfford : ascShards >= cost));
          if (canAfford) {
            anyArtifactAffordable = true;
            break;
          }
        }
      }
    }

    const ascension = {
      canAscend: Boolean(rawAsc?.canAscend),
      unlockStage: Math.max(1, Math.floor(Number(rawAsc?.unlockStage) || 5)),
      currentStage: Math.max(1, Math.floor(Number(rawAsc?.currentStage ?? stage) || stage)),
      pendingShards: Math.max(0, Math.floor(Number(rawAsc?.pendingShards) || 0)),
      totalAscensions: Math.max(0, Math.floor(Number(rawAsc?.totalAscensions) || 0)),
      astralShards: ascShards,
      totalAstralShards: Math.max(
        ascShards,
        Math.floor(Number(rawAsc?.totalAstralShards ?? ascShards) || ascShards)
      ),
      modifiers: rawAsc?.modifiers || null,
      artifacts: normalizedArtifacts
    };

    const rawOffline = (snap && Object.prototype.hasOwnProperty.call(snap, 'pendingOfflineLoot'))
      ? snap.pendingOfflineLoot
      : (mgr?.pendingOfflineLoot ?? null);
    const pendingOfflineLoot = (rawOffline && typeof rawOffline === 'object')
      ? {
          awaySec: Math.max(0, Math.floor(Number(rawOffline.awaySec) || 0)),
          cappedSec: Math.max(0, Math.floor(Number(rawOffline.cappedSec ?? rawOffline.awaySec) || 0)),
          gold: Math.max(0, Number(rawOffline.gold) || 0),
          astralShards: Math.max(0, Math.floor(Number(rawOffline.astralShards) || 0)),
          stagesSimulated: Math.max(0, Math.floor(Number(rawOffline.stagesSimulated) || 0)),
          formattedTime: String(
            rawOffline.formattedTime || formatAwayTime(rawOffline.cappedSec ?? rawOffline.awaySec ?? 0)
          ).toUpperCase()
        }
      : null;

    const dirSnap =
      snap?.bossDirector ||
      ((!snap?.realmModifier || includeDrawerTabs) && typeof mgr?.bossDirector?.getDirectorSnapshot === 'function'
        ? mgr.bossDirector.getDirectorSnapshot(stage, bestStage, realmObj)
        : null);
    const realmModifier = snap?.realmModifier || dirSnap?.modifier || null;
    const bestStageTrophies = includeDrawerTabs ? (snap?.bestStageTrophies || dirSnap?.trophies || null) : null;
    const relicSets = includeDrawerTabs
      ? (Array.isArray(snap?.relicSets)
          ? snap.relicSets
          : (typeof econ?.getRelicSetSynergies === 'function' ? econ.getRelicSetSynergies() : []))
      : [];
    const relicMilestones = includeDrawerTabs
      ? (snap?.relicMilestones && typeof snap.relicMilestones === 'object'
          ? snap.relicMilestones
          : (() => {
              const map = {};
              if (typeof econ?.getRelicMilestoneInfo === 'function') {
                for (let i = 0; i < ENDLESS_RELICS.length; i++) {
                  const rid = ENDLESS_RELICS[i].id;
                  map[rid] = econ.getRelicMilestoneInfo(rid);
                }
              }
              return map;
            })())
      : {};

    const gear = (snap && typeof snap.gear === 'object' && snap.gear)
      ? snap.gear
      : ((includeDrawerTabs || snap?.hasGearAction === undefined) && typeof mgr?.gear?.getGearSnapshot === 'function'
        ? mgr.gear.getGearSnapshot()
        : null);
    const forgeDust = Math.max(0, Math.floor(Number(snap?.forgeDust ?? gear?.forgeDust ?? mgr?.gear?.forgeDust ?? 0) || 0));
    const formattedForgeDust = String(
      snap?.formattedForgeDust ?? gear?.formattedForgeDust ?? formatEndlessNumber(forgeDust)
    );
    const hasGearAction = Boolean(
      snap?.hasGearAction !== undefined
        ? snap.hasGearAction
        : (gear && (gear.hasUpgradeAvailable || gear.canEnhanceEquipped))
    );

    const rawEvents = (snap && typeof snap.events === 'object' && snap.events)
      ? snap.events
      : (typeof mgr?.events?.getEventsSnapshot === 'function'
        ? mgr.events.getEventsSnapshot(econ)
        : null);

    let events = null;
    if (rawEvents && typeof rawEvents === 'object') {
      let bounty = null;
      if (rawEvents.bounty && typeof rawEvents.bounty === 'object') {
        const b = rawEvents.bounty;
        const target = Math.max(1, Math.floor(Number(b.target) || 1));
        const progress = Math.max(0, Math.floor(Number(b.progress) || 0));
        const ratio = Number.isFinite(Number(b.ratio))
          ? Math.max(0, Math.min(1, Number(b.ratio)))
          : Math.max(0, Math.min(1, progress / target));
        const rw = (b.rewards && typeof b.rewards === 'object') ? b.rewards : {};
        const rwGold = Math.max(0, Number(rw.gold) || 0);
        bounty = {
          uid: String(b.uid || b.templateId || 'bounty'),
          templateId: String(b.templateId || ''),
          title: String(b.title || 'CRUSADE BOUNTY').toUpperCase(),
          shortLabel: String(b.shortLabel || b.title || 'BOUNTY').toUpperCase(),
          accentHex: String(b.accentHex || '#facc15'),
          progress,
          target,
          ratio,
          completed: Boolean(b.completed || progress >= target),
          rewards: {
            gold: rwGold,
            formattedGold: String(rw.formattedGold || formatEndlessNumber(rwGold)),
            astralShards: Math.max(0, Math.floor(Number(rw.astralShards) || 0)),
            forgeDust: Math.max(0, Math.floor(Number(rw.forgeDust) || 0))
          }
        };
      }

      const activeBuffs = Array.isArray(rawEvents.activeBuffs)
        ? rawEvents.activeBuffs
            .filter((bf) => bf && typeof bf === 'object')
            .map((bf, idx) => {
              const durationSec = Math.max(0.1, Number(bf.durationSec) || 20);
              const remainingSec = Math.max(0, Number(bf.remainingSec) || 0);
              const ratio = Number.isFinite(Number(bf.ratio))
                ? Math.max(0, Math.min(1, Number(bf.ratio)))
                : Math.max(0, Math.min(1, remainingSec / durationSec));
              return {
                id: String(bf.id || `${bf.source || 'buff'}_${idx}`),
                source: String(bf.source || 'shrine'),
                name: String(bf.name || bf.shortLabel || 'BLESSING').toUpperCase(),
                shortLabel: String(bf.shortLabel || bf.name || 'BUFF').toUpperCase(),
                accentHex: String(bf.accentHex || '#facc15'),
                remainingSec,
                durationSec,
                ratio
              };
            })
        : [];

      let merchantOffer = null;
      if (rawEvents.merchantOffer && typeof rawEvents.merchantOffer === 'object') {
        const m = rawEvents.merchantOffer;
        const costGold = Math.max(0, Number(m.costGold) || 0);
        const durationSec = Math.max(0.1, Number(m.durationSec) || 25);
        const remainingSec = Math.max(0, Number(m.remainingSec) || 0);
        const ratio = Number.isFinite(Number(m.ratio))
          ? Math.max(0, Math.min(1, Number(m.ratio)))
          : Math.max(0, Math.min(1, remainingSec / durationSec));
        merchantOffer = {
          uid: String(m.uid || m.offerType || 'merchant'),
          offerType: String(m.offerType || ''),
          title: String(m.title || 'ARCANE OFFER').toUpperCase(),
          subtitle: String(m.subtitle || '').toUpperCase(),
          accentHex: String(m.accentHex || '#c084fc'),
          costGold,
          formattedCost: String(m.formattedCost || formatEndlessNumber(costGold)),
          canAfford: m.canAfford !== undefined ? Boolean(m.canAfford) : gold >= costGold,
          remainingSec,
          durationSec,
          ratio
        };
      }

      events = {
        bounty,
        completedBounties: Math.max(0, Math.floor(Number(rawEvents.completedBounties) || 0)),
        activeBuffs,
        merchantOffer
      };
    }

    const rawEvo = (snap && typeof snap.companionEvo === 'object' && snap.companionEvo)
      ? snap.companionEvo
      : (typeof mgr?.companionEvo?.getEvoSnapshot === 'function'
        ? mgr.companionEvo.getEvoSnapshot(econ, mgr?.gear || null, activeSlotsCount)
        : null);

    const evoFormationId = String(rawEvo?.formationId || rawEvo?.formation?.id || 'balanced_phalanx');
    const evoFormations = includeDrawerTabs
      ? ((Array.isArray(rawEvo?.formations) && rawEvo.formations.length > 0)
          ? rawEvo.formations.map((f, idx) => ({
              id: String(f?.id || `formation_${idx}`),
              name: String(f?.name || f?.shortLabel || `FORMATION ${idx + 1}`).toUpperCase(),
              shortLabel: String(f?.shortLabel || f?.name || `F${idx + 1}`).toUpperCase(),
              accentHex: String(f?.accentHex || '#facc15'),
              desc: String(f?.desc || '').toUpperCase()
            }))
          : DEFAULT_SQUAD_FORMATIONS)
      : DEFAULT_SQUAD_FORMATIONS;
    const activeFormation = includeDrawerTabs
      ? ((rawEvo?.formation && typeof rawEvo.formation === 'object')
          ? {
              id: String(rawEvo.formation.id || evoFormationId),
              name: String(rawEvo.formation.name || rawEvo.formation.shortLabel || 'BALANCED PHALANX').toUpperCase(),
              shortLabel: String(rawEvo.formation.shortLabel || rawEvo.formation.name || 'PHALANX').toUpperCase(),
              accentHex: String(rawEvo.formation.accentHex || '#facc15'),
              desc: String(rawEvo.formation.desc || '').toUpperCase()
            }
          : (evoFormations.find((f) => f.id === evoFormationId) || evoFormations[1] || evoFormations[0]))
      : DEFAULT_SQUAD_FORMATIONS[1];
    const overdriveCharge = Math.max(0, Math.min(100, Number(rawEvo?.overdriveCharge) || 0));
    const overdriveRatio = Number.isFinite(Number(rawEvo?.overdriveRatio))
      ? Math.max(0, Math.min(1, Number(rawEvo.overdriveRatio)))
      : Math.max(0, Math.min(1, overdriveCharge / 100));
    const overdriveActiveTimer = Math.max(0, Number(rawEvo?.overdriveActiveTimer) || 0);
    const overdriveActive = Boolean(rawEvo?.overdriveActive ?? (overdriveActiveTimer > 0));
    const overdriveReady = Boolean(
      rawEvo?.overdriveReady !== undefined
        ? rawEvo.overdriveReady
        : (!overdriveActive && overdriveCharge >= 100 && activeCompanionUnits.length > 0)
    );
    const companionEvo = {
      formationId: activeFormation.id,
      formation: activeFormation,
      formations: evoFormations,
      overdriveCharge,
      overdriveRatio,
      overdriveReady,
      overdriveActive,
      overdriveActiveTimer,
      totalOverdrives: Math.max(0, Math.floor(Number(rawEvo?.totalOverdrives) || 0)),
      totalPromotions: Math.max(0, Math.floor(Number(rawEvo?.totalPromotions) || 0)),
      starsById: (rawEvo?.starsById && typeof rawEvo.starsById === 'object') ? rawEvo.starsById : {}
    };

    const rawTrials = (snap && typeof snap.trials === 'object' && snap.trials)
      ? snap.trials
      : (typeof mgr?.trials?.getTrialsSnapshot === 'function'
        ? mgr.trials.getTrialsSnapshot(stage)
        : null);

    let trialsActiveTrial = null;
    if (rawTrials?.activeTrial && typeof rawTrials.activeTrial === 'object') {
      const at = rawTrials.activeTrial;
      const durationSec = Math.max(0.1, Number(at.durationSec) || 30);
      const remainingSec = Math.max(0, Number(at.remainingSec) || 0);
      const ratio = Number.isFinite(Number(at.ratio))
        ? Math.max(0, Math.min(1, Number(at.ratio)))
        : Math.max(0, Math.min(1, remainingSec / durationSec));
      const goldEarned = Math.max(0, Number(at.goldEarned) || 0);
      const damageDealt = Math.max(0, Number(at.damageDealt) || 0);
      const nextTierThreshold = Math.max(0, Number(at.nextTierThreshold) || 0);
      trialsActiveTrial = {
        id: String(at.id || 'gold_vault'),
        name: String(at.name || at.shortName || 'CHALLENGE TRIAL').toUpperCase(),
        shortName: String(at.shortName || at.name || 'TRIAL').toUpperCase(),
        accentHex: String(at.accentHex || '#facc15'),
        remainingSec,
        durationSec,
        ratio,
        kills: Math.max(0, Math.floor(Number(at.kills) || 0)),
        goblinsSlain: Math.max(0, Math.floor(Number(at.goblinsSlain) || 0)),
        chestsCracked: Math.max(0, Math.floor(Number(at.chestsCracked) || 0)),
        goldEarned,
        formattedGoldEarned: String(at.formattedGoldEarned || formatEndlessNumber(goldEarned)),
        damageDealt,
        formattedDamageDealt: String(at.formattedDamageDealt || formatEndlessNumber(damageDealt)),
        currentTier: Math.max(0, Math.floor(Number(at.currentTier) || 0)),
        nextTierThreshold,
        formattedNextTier: String(at.formattedNextTier || formatEndlessNumber(nextTierThreshold))
      };
    }
    const trialsIsActive = Boolean(rawTrials?.isActive && trialsActiveTrial);

    const rawTrialList = (Array.isArray(rawTrials?.trials) && rawTrials.trials.length > 0)
      ? rawTrials.trials
      : DEFAULT_TRIAL_DEFS;
    let anyTrialReady = false;
    let trialsList = [];
    if (includeDrawerTabs) {
      trialsList = rawTrialList.map((t, idx) => {
        const def = DEFAULT_TRIAL_DEFS.find((d) => d.id === t?.id) || DEFAULT_TRIAL_DEFS[idx] || DEFAULT_TRIAL_DEFS[0];
        const cooldownLeft = Math.max(0, Number(t?.cooldownLeft) || 0);
        const bestScore = Math.max(0, Number(t?.bestScore) || 0);
        const canEnter = t?.canEnter !== undefined
          ? Boolean(t.canEnter)
          : (!trialsIsActive && cooldownLeft <= 0);
        if (canEnter) anyTrialReady = true;
        return {
          id: String(t?.id || def.id),
          name: String(t?.name || def.name).toUpperCase(),
          shortName: String(t?.shortName || def.shortName).toUpperCase(),
          durationSec: Math.max(1, Math.round(Number(t?.durationSec ?? def.durationSec) || 30)),
          cooldownSec: Math.max(0, Math.round(Number(t?.cooldownSec ?? def.cooldownSec) || 30)),
          accentHex: String(t?.accentHex || def.accentHex || '#facc15'),
          glowHex: String(t?.glowHex || def.glowHex || '#fef08a'),
          rewardTag: String(t?.rewardTag || def.rewardTag).toUpperCase(),
          desc: String(t?.desc || def.desc),
          cooldownLeft,
          canEnter,
          bestScore,
          formattedBestScore: String(t?.formattedBestScore || formatEndlessNumber(bestScore))
        };
      });
    } else if (!trialsIsActive) {
      for (let i = 0; i < rawTrialList.length; i++) {
        const t = rawTrialList[i];
        const cd = Math.max(0, Number(t?.cooldownLeft) || 0);
        const canEnter = t?.canEnter !== undefined ? Boolean(t.canEnter) : cd <= 0;
        if (canEnter) {
          anyTrialReady = true;
          break;
        }
      }
    }

    let trialsLastResult = null;
    if (rawTrials?.lastResult && typeof rawTrials.lastResult === 'object') {
      const lr = rawTrials.lastResult;
      const goldAwarded = Math.max(0, Number(lr.goldAwarded) || 0);
      const damageDealt = Math.max(0, Number(lr.damageDealt) || 0);
      const fmtDmg = String(
        lr.formattedDamageDealt || lr.formattedDamage || formatEndlessNumber(damageDealt)
      );
      const gearAwarded = Array.isArray(lr.gearAwarded)
        ? lr.gearAwarded
            .filter((g) => g && typeof g === 'object')
            .map((g, gi) => {
              const rarity = String(g.rarity || 'heroic').toLowerCase();
              const color = g.rarityMeta?.color || TRIAL_RARITY_COLORS[rarity] || '#c084fc';
              const label = String(g.rarityMeta?.label || rarity).toUpperCase();
              return {
                uid: String(g.uid || `trial_gear_${gi}`),
                name: String(g.name || 'RELIC GEAR').toUpperCase(),
                rarity,
                slot: String(g.slot || 'weapon').toLowerCase(),
                rarityMeta: { label, color }
              };
            })
        : [];
      trialsLastResult = {
        uid: String(lr.uid || `${lr.trialId || 'trial'}_${lr.durationUsedSec || 0}`),
        trialId: String(lr.trialId || 'gold_vault'),
        trialName: String(lr.trialName || 'CHALLENGE TRIAL').toUpperCase(),
        accentHex: String(lr.accentHex || '#facc15'),
        durationUsedSec: Math.max(0, Number(lr.durationUsedSec) || 0),
        kills: Math.max(0, Math.floor(Number(lr.kills) || 0)),
        goblinsSlain: Math.max(0, Math.floor(Number(lr.goblinsSlain) || 0)),
        chestsCracked: Math.max(0, Math.floor(Number(lr.chestsCracked) || 0)),
        damageDealt,
        formattedDamageDealt: fmtDmg,
        formattedDamage: fmtDmg,
        tierReached: Math.max(0, Math.floor(Number(lr.tierReached) || 0)),
        goldAwarded,
        formattedGold: String(lr.formattedGold || formatEndlessNumber(goldAwarded)),
        shardsAwarded: Math.max(0, Math.floor(Number(lr.shardsAwarded) || 0)),
        dustAwarded: Math.max(0, Math.floor(Number(lr.dustAwarded) || 0)),
        gearAwarded,
        completedFull: Boolean(lr.completedFull)
      };
    }

    const trials = {
      isActive: trialsIsActive,
      activeTrial: trialsActiveTrial,
      trials: trialsList,
      lastResult: trialsLastResult,
      totalTrialsCompleted: Math.max(0, Math.floor(Number(rawTrials?.totalTrialsCompleted) || 0))
    };

    const tabFlags = {
      items: itemsActionable,
      gear: hasGearAction,
      allies: alliesActionable,
      alliesUpgrade: alliesUpgradeAffordable,
      ascend: Boolean(ascension.canAscend || anyArtifactAffordable),
      trialsActive: trialsIsActive,
      trialsReady: Boolean(!trialsIsActive && anyTrialReady)
    };

    return {
      stage,
      bestStage,
      waveInStage,
      wavesPerStage,
      realmName,
      realmAccent,
      ascendedLoop,
      isBossEncounter,
      bossFarmMode,
      bossTimer,
      bossTimerMax,
      gold,
      totalGoldEarned,
      astralShards: resolvedAstralShards,
      autoBoss,
      bulkMode,
      tapFever,
      tapFeverTimer,
      tapFeverLevel,
      feverTier,
      feverGoldMult,
      totalKills,
      bossesSlain,
      totalTaps,
      dpsMetrics,
      stats,
      relicsView,
      companions,
      activeCompanionUnits,
      activeSynergies,
      activeSlotsCount,
      maxActiveSlots,
      companionEvo,
      ascension,
      pendingOfflineLoot,
      realmModifier,
      bestStageTrophies,
      relicSets,
      relicMilestones,
      gear,
      forgeDust,
      formattedForgeDust,
      hasGearAction,
      events,
      trials,
      tabFlags
    };
  }

  _computeDpsBreakdown(state) {
    const m = state?.dpsMetrics || {};
    const heroDps = Math.max(0, Number(m.heroDps) || 0);
    const tapDps = Math.max(0, Number(m.tapDps) || 0);
    const partyDps = Math.max(0, Number(m.companionDps) || 0);
    const goldPerSec = Math.max(0, Number(m.goldPerSec) || 0);
    const totalDps = heroDps + tapDps + partyDps;

    let heroWidth = 0;
    let tapWidth = 0;
    let partyWidth = 0;
    let heroPct = 0;
    let tapPct = 0;
    let partyPct = 0;

    if (totalDps > 0) {
      heroWidth = (heroDps / totalDps) * 100;
      tapWidth = (tapDps / totalDps) * 100;
      partyWidth = Math.max(0, 100 - heroWidth - tapWidth);

      heroPct = Math.round(heroWidth);
      tapPct = Math.round(tapWidth);
      partyPct = Math.max(0, 100 - heroPct - tapPct);
      if (partyDps > 0 && partyPct === 0) {
        partyPct = 1;
        if (heroPct >= tapPct && heroPct > 1) heroPct -= 1;
        else if (tapPct > 1) tapPct -= 1;
      }
    }

    return {
      heroDps,
      tapDps,
      partyDps,
      totalDps,
      goldPerSec,
      heroWidth,
      tapWidth,
      partyWidth,
      heroPct,
      tapPct,
      partyPct
    };
  }

  _syncActivePartyHud(state) {
    const partyHud = this._refs.partyHud;
    if (!partyHud) return;

    const units = state.activeCompanionUnits || [];
    const hasUnits = units.length > 0;
    const synergies = state.activeSynergies || [];
    partyHud.classList.toggle('hidden', !hasUnits);
    if (this.root) {
      this.root.classList.toggle('has-active-party', hasUnits);
      this.root.classList.toggle('has-active-synergies', hasUnits && synergies.length > 0);
    }
    if (!hasUnits) {
      if (this._refs.overdriveBtn) {
        this._refs.overdriveBtn.classList.add('hidden');
      }
      if (this._refs.partySynChip) {
        this._refs.partySynChip.classList.add('hidden');
      }
      return;
    }

    for (let i = 0; i < this._partySlotRefs.length; i++) {
      const slot = this._partySlotRefs[i];
      const u = units[i];
      if (!u) {
        slot.card.classList.add('hidden');
        slot.card.classList.remove('is-casting-ult', 'is-ex-evolved', 'is-aura-3', 'is-aura-4', 'is-aura-5');
        continue;
      }

      const star = Math.max(1, Math.min(5, Math.floor(Number(u.star) || 1)));
      const auraMeta = resolveCompanionAuraMeta(star, u.auraTier || null);
      const hasAura = star >= 3;

      slot.card.classList.remove('hidden');
      slot.card.classList.toggle('is-casting-ult', u.isCastingUlt);
      slot.card.classList.toggle('is-ex-evolved', hasAura);
      slot.card.classList.toggle('is-aura-3', star === 3);
      slot.card.classList.toggle('is-aura-4', star === 4);
      slot.card.classList.toggle('is-aura-5', star >= 5);
      const portBorder = u.isCastingUlt
        ? '#fef08a'
        : (star >= 5 ? '#f43f5e' : (star === 4 ? '#c084fc' : (star === 3 ? '#38bdf8' : u.color)));
      setStyleIfChanged(slot.portWrap, 'borderColor', portBorder);

      this._blitCompanionPortrait(
        slot.portCanvas,
        u.activeHeroKey || u.heroKey,
        u.color,
        u.shortName || u.name
      );

      if (slot.starBadge && slot.starTxt) {
        slot.starBadge.classList.remove('hidden');
        slot.starBadge.classList.toggle('is-ex', hasAura);
        slot.starBadge.classList.toggle('is-aura-3', star === 3);
        slot.starBadge.classList.toggle('is-aura-4', star === 4);
        slot.starBadge.classList.toggle('is-aura-5', star >= 5);
        setTextIfChanged(slot.starTxt, String(star));
      }

      setTextIfChanged(slot.nameEl, u.shortName || u.name);
      setTextIfChanged(slot.lvEl, `LV.${u.level}`);

      const ultPct = Math.max(0, Math.min(100, Number(u.ultPct) || 0));
      setStyleIfChanged(slot.ultFill, 'width', `${ultPct.toFixed(1)}%`);
      setTextIfChanged(slot.ultTag, u.isCastingUlt ? 'ULT!' : `${Math.round(ultPct)}%`);

      const starTag = hasAura ? ` | ${star}-STAR ${auraMeta.title}` : ` | ${star}-STAR EX`;
      const tip =
        `${u.name} (${u.role}) LV.${u.level}${starTag} | DPS ${formatEndlessNumber(u.dpsEstimate)} | ULT ${Math.round(ultPct)}%` +
        (u.lastCallout ? ` | ${u.lastCallout}` : '') +
        ' - Click to manage party';
      if (slot.card.title !== tip) {
        slot.card.title = tip;
      }
    }

    // Wave 12: Compact Mobile Synergy Chip (inline in single-row Mobile Party Strip)
    if (this._refs.partySynChip && this._refs.partySynChipTxt) {
      const hasSyn = synergies.length > 0;
      this._refs.partySynChip.classList.toggle('hidden', !hasSyn);
      if (hasSyn) {
        setTextIfChanged(this._refs.partySynChipTxt, `${synergies.length} SYN`);
        const synTip = synergies.map((s) => (s.desc ? `${s.name}: ${s.desc}` : s.name)).join(' | ');
        if (this._refs.partySynChip.title !== synTip) {
          this._refs.partySynChip.title = synTip;
        }
      }
    }

    // Wave 9/12: Squad Overdrive Charge Meter & Activation Button
    const overdriveBtn = this._refs.overdriveBtn;
    const overdriveFill = this._refs.overdriveFill;
    const overdriveLabel = this._refs.overdriveLabel;
    const overdriveLabelShort = this._refs.overdriveLabelShort;
    if (overdriveBtn && overdriveFill && overdriveLabel) {
      const evo = state.companionEvo || {};
      const odRatio = Number.isFinite(Number(evo.overdriveRatio))
        ? Number(evo.overdriveRatio)
        : ((Number(evo.overdriveCharge) || 0) / 100);
      const odPct = Math.max(0, Math.min(100, Math.round(odRatio * 100)));
      const odActive = Boolean(evo.overdriveActive);
      const odReady = Boolean(!odActive && evo.overdriveReady);

      overdriveBtn.classList.remove('hidden');
      overdriveBtn.classList.toggle('is-active', odActive);
      overdriveBtn.classList.toggle('is-ready', odReady);
      overdriveBtn.disabled = !odReady;

      if (odActive) {
        const timer = Math.max(0, Number(evo.overdriveActiveTimer) || 0);
        const remPct = timer > 0 ? Math.max(6, Math.min(100, (timer / 2.4) * 100)) : 100;
        setStyleIfChanged(overdriveFill, 'width', `${remPct.toFixed(1)}%`);
        setTextIfChanged(overdriveLabel, 'SURGE ACTIVE!');
        setTextIfChanged(overdriveLabelShort, 'SURGE!');
        const odTip = 'SQUAD OVERDRIVE SURGE ACTIVE (+35% DMG & +25% HASTE)';
        if (overdriveBtn.title !== odTip) overdriveBtn.title = odTip;
      } else if (odReady) {
        setStyleIfChanged(overdriveFill, 'width', '100%');
        setTextIfChanged(overdriveLabel, 'OVERDRIVE!');
        setTextIfChanged(overdriveLabelShort, 'READY!');
        const odTip = 'SQUAD OVERDRIVE READY - CLICK TO UNLEASH SYNCHRONIZED ULTIMATES!';
        if (overdriveBtn.title !== odTip) overdriveBtn.title = odTip;
      } else {
        setStyleIfChanged(overdriveFill, 'width', `${odPct}%`);
        setTextIfChanged(overdriveLabel, `OVERDRIVE ${odPct}%`);
        setTextIfChanged(overdriveLabelShort, `OD ${odPct}%`);
        const odTip = `SQUAD OVERDRIVE CHARGING (${odPct}%) - ALLY ATTACKS & SKILLS CHARGE THE METER`;
        if (overdriveBtn.title !== odTip) overdriveBtn.title = odTip;
      }
    }

    // Active Synergy Badges right underneath/beside the party strip
    const synHud = this._refs.synergyHud;
    if (!synHud) return;
    synHud.classList.toggle('hidden', synergies.length === 0);
    const sig = synergies.map((s) => `${s.id}|${s.shortLabel}|${s.name}|${s.desc}|${s.color}`).join('||');
    if (sig === this._lastHudSynergySig) return;
    this._lastHudSynergySig = sig;
    synHud.textContent = '';

    for (let i = 0; i < synergies.length; i++) {
      const s = synergies[i];
      const badge = document.createElement('div');
      badge.className = 'endless-synergy-badge';
      badge.style.borderColor = s.color;
      badge.style.color = s.color;
      badge.title = s.desc ? `${s.name}: ${s.desc}` : s.name;

      const iconWrap = document.createElement('span');
      iconWrap.innerHTML = SYNERGY_DIAMOND_SVG;
      const textSpan = document.createElement('span');
      textSpan.className = 'endless-synergy-badge-text';
      textSpan.style.color = '#fef08a';
      textSpan.textContent = s.shortLabel || s.name;

      badge.appendChild(iconWrap);
      badge.appendChild(textSpan);
      synHud.appendChild(badge);
    }
  }

  _syncDrawerTelemetry(state, breakdown = null) {
    const b = breakdown || this._computeDpsBreakdown(state);
    setTextIfChanged(this._refs.telemDpsVal, formatEndlessNumber(b.totalDps));
    setTextIfChanged(this._refs.telemGoldVal, `${formatEndlessNumber(b.goldPerSec)}/S`);

    if (this._refs.telemSegHero) this._refs.telemSegHero.style.width = `${b.heroWidth.toFixed(2)}%`;
    if (this._refs.telemSegTap) this._refs.telemSegTap.style.width = `${b.tapWidth.toFixed(2)}%`;
    if (this._refs.telemSegParty) this._refs.telemSegParty.style.width = `${b.partyWidth.toFixed(2)}%`;

    setTextIfChanged(this._refs.telemHeroVal, `${formatEndlessNumber(b.heroDps)} (${b.heroPct}%)`);
    setTextIfChanged(this._refs.telemTapVal, `${formatEndlessNumber(b.tapDps)} (${b.tapPct}%)`);
    setTextIfChanged(this._refs.telemPartyVal, `${formatEndlessNumber(b.partyDps)} (${b.partyPct}%)`);
  }

  sync(snapshot = null, forceRebuild = false) {
    this._syncCounter++;
    if (snapshot !== null && snapshot !== undefined) {
      this._lastSnapshot = snapshot;
    }
    if (!this.mounted || !this._hasDom() || !this.root) return;
    this.root.classList.toggle('is-drawer-open', Boolean(this.drawerOpen));

    const includeDrawer = Boolean(this.drawerOpen || forceRebuild);
    const state = this._resolveState(snapshot ?? this._lastSnapshot, includeDrawer);

    // Ensure icon canvases pick up endless_crusade_vfx.png as soon as it finishes loading
    this._blitAllIcons(Boolean(forceRebuild));

    // 1. Top Status Bar (in-place DOM text & bar updates)
    setTextIfChanged(this._refs.stageText, `STAGE ${state.stage} • ${state.realmName}`);
    setStyleIfChanged(this._refs.stageBadge, 'borderLeftColor', state.realmAccent);
    if (this._refs.loopPill) {
      const showLoop = state.ascendedLoop > 1;
      this._refs.loopPill.classList.toggle('hidden', !showLoop);
      if (showLoop) {
        setTextIfChanged(this._refs.loopPill, `LOOP ${state.ascendedLoop}`);
      }
    }

    // Wave 4: Rotating Realm Modifier Pill (Row 9 Col 0..3)
    if (this._refs.modPill && this._refs.modName) {
      const mod = state.realmModifier;
      const showMod = Boolean(mod && mod.name);
      this._refs.modPill.classList.toggle('hidden', !showMod);
      if (showMod) {
        const modColor = mod.accentHex || '#f43f5e';
        setTextIfChanged(this._refs.modName, mod.name);
        setStyleIfChanged(this._refs.modPill, 'borderColor', modColor);
        setStyleIfChanged(this._refs.modPill, 'color', modColor);
        const modTip = mod.shortDesc ? `${mod.name}: ${mod.shortDesc}` : mod.name;
        if (this._refs.modPill.title !== modTip) {
          this._refs.modPill.title = modTip;
        }
        const sigilCol = Number.isFinite(Number(mod.sigilCol))
          ? Math.max(0, Math.min(11, Math.floor(Number(mod.sigilCol))))
          : 0;
        if (this._modifierIconEntry) {
          const changed =
            this._modifierIconEntry.col !== sigilCol ||
            this._modifierIconEntry.accentHex !== modColor;
          this._modifierIconEntry.col = sigilCol;
          this._modifierIconEntry.accentHex = modColor;
          if (changed && this._refs.modIcon) {
            this._blitIconCanvas(this._refs.modIcon, sigilCol, modColor, true, ENDLESS_SIGIL_ROW);
          }
        }
      }
    }

    if (this._refs.waveMeter && this._refs.waveFill && this._refs.waveLabel) {
      this._refs.waveMeter.classList.toggle('is-boss', state.isBossEncounter);
      this._refs.waveMeter.classList.toggle('is-farm', !state.isBossEncounter && state.bossFarmMode);
      if (state.isBossEncounter) {
        const pct = Math.max(0, Math.min(100, (state.bossTimer / state.bossTimerMax) * 100));
        setStyleIfChanged(this._refs.waveFill, 'width', `${pct.toFixed(1)}%`);
        setTextIfChanged(this._refs.waveLabel, `BOSS ${state.bossTimer.toFixed(1)}S`);
      } else if (state.bossFarmMode) {
        setStyleIfChanged(this._refs.waveFill, 'width', '100%');
        setTextIfChanged(this._refs.waveLabel, `FARMING W${state.waveInStage}`);
      } else {
        const pct = Math.max(8, Math.min(100, (state.waveInStage / state.wavesPerStage) * 100));
        setStyleIfChanged(this._refs.waveFill, 'width', `${pct.toFixed(1)}%`);
        setTextIfChanged(this._refs.waveLabel, `WAVE ${state.waveInStage}/${state.wavesPerStage}`);
      }
    }

    setTextIfChanged(this._refs.goldVal, formatEndlessNumber(state.gold));
    setTextIfChanged(this._refs.shardVal, formatEndlessNumber(state.astralShards));

    if (this._refs.feverMeter && this._refs.feverFill && this._refs.feverLabel) {
      const feverActive = state.tapFeverTimer > 0;
      const tier2 = feverActive && (state.feverTier >= 2 || state.tapFeverLevel >= 2);
      this._refs.feverMeter.classList.toggle('is-active', feverActive);
      this._refs.feverMeter.classList.toggle('is-tier2', tier2);
      setStyleIfChanged(this._refs.feverFill, 'width', `${Math.round(state.tapFever)}%`);
      if (tier2) {
        setTextIfChanged(this._refs.feverLabel, `FEVER X3 ${state.tapFeverTimer.toFixed(1)}S`);
      } else if (feverActive) {
        setTextIfChanged(this._refs.feverLabel, `FEVER X2 ${state.tapFeverTimer.toFixed(1)}S`);
      } else {
        setTextIfChanged(this._refs.feverLabel, `FEVER ${Math.round(state.tapFever)}%`);
      }
    }

    // 2. Boss Control Action Pill (Desktop Top-Stack + Armory Header Toggle)
    const autoBossLabel = state.autoBoss ? 'AUTO-BOSS: ON' : 'AUTO-BOSS: OFF';
    if (this._refs.autoBossBtn) {
      this._refs.autoBossBtn.classList.toggle('is-on', state.autoBoss);
      setTextIfChanged(this._refs.autoBossBtn, autoBossLabel);
    }
    if (this._refs.drawerAutoBossBtn) {
      this._refs.drawerAutoBossBtn.classList.toggle('is-on', state.autoBoss);
      setTextIfChanged(this._refs.drawerAutoBossBtn, autoBossLabel);
    }
    const showChallenge = state.bossFarmMode && !state.isBossEncounter;
    if (this._refs.challengeBtn) {
      this._refs.challengeBtn.classList.toggle('hidden', !showChallenge);
    }
    if (this._refs.bossControls) {
      this._refs.bossControls.classList.toggle('has-challenge', showChallenge);
    }
    if (this.root) {
      this.root.classList.toggle('has-challenge-boss', showChallenge);
    }

    // 2B. Live Active Companion Mini-HUD & Synergy Badges (always synced, even when drawer closed)
    this._syncActivePartyHud(state);

    // 2B2. Wave 8 Desktop Events Dock + Wave 12 Mobile Compact Strip & Pop-Cards
    this._syncEventsDock(state);
    this._mobileHud?.sync(state, this.drawerOpen);

    // 2B3. Wave 10 Active Trial Live Countdown HUD Strip (always synced, even when drawer closed)
    this._syncTrialHud(state);

    // 2C. Welcome Back Offline Loot Modal (always synced, even when drawer closed)
    this._syncOfflineLootModal(state);

    // 2D. Wave 10 Trial Reward Summary Modal (always synced, even when drawer closed)
    this._syncTrialResultModal(state);

    // 3. Smart Actionable Notification Pips on ALL 5 Actionable Tabs + Shop Toggle
    const flags = state.tabFlags || {};
    const itemsNotify = Boolean(flags.items);
    const gearNotify = Boolean(flags.gear);
    const alliesNotify = Boolean(flags.allies);
    const ascendNotify = Boolean(flags.ascend);
    const trialsActive = Boolean(flags.trialsActive);
    const trialsReady = Boolean(flags.trialsReady);
    const trialsNotify = trialsActive || trialsReady;

    if (this._refs.itemsTabDot) {
      this._refs.itemsTabDot.classList.toggle('hidden', !itemsNotify);
    }
    if (this._refs.gearTabDot) {
      this._refs.gearTabDot.classList.toggle('hidden', !gearNotify);
    }
    if (this._refs.companionsTabDot) {
      this._refs.companionsTabDot.classList.toggle('hidden', !alliesNotify);
    }
    if (this._refs.ascendTabDot) {
      this._refs.ascendTabDot.classList.toggle('hidden', !ascendNotify);
    }
    if (this._refs.trialsTabDot) {
      this._refs.trialsTabDot.classList.toggle('hidden', !trialsNotify);
      this._refs.trialsTabDot.classList.toggle('is-trials-active', trialsActive);
      this._refs.trialsTabDot.classList.toggle('is-trials-ready', !trialsActive && trialsReady);
    }

    const anyAffordable = Boolean(
      itemsNotify || gearNotify || alliesNotify || flags.alliesUpgrade || ascendNotify
    );
    if (this._refs.affordableDot) {
      this._refs.affordableDot.classList.toggle('hidden', !anyAffordable);
    }

    // Skip heavy drawer patching while drawer is closed (unless forceRebuild)
    if (!this.drawerOpen && !forceRebuild) return;

    const dpsBreakdown = this._computeDpsBreakdown(state);
    this._syncDrawerTelemetry(state, dpsBreakdown);

    // 4. Sync Active Tab Contents In-Place
    if (this.activeTab === 'items' || forceRebuild) {
      this._syncItemsTab(state);
    }
    if (this.activeTab === 'gear' || forceRebuild) {
      this._syncGearPanel(state, forceRebuild);
    }
    if (this.activeTab === 'companions' || forceRebuild) {
      this._syncCompanionsTab(state);
    }
    if (this.activeTab === 'ascend' || forceRebuild) {
      this._syncAscendTab(state);
    }
    if (this.activeTab === 'trials' || forceRebuild) {
      this._syncTrialsPanel(state);
    }
    if (this.activeTab === 'stats' || forceRebuild) {
      this._syncStatsTab(state, dpsBreakdown);
    }

    // Sync any custom registered tabs
    for (let i = 0; i < this.tabs.length; i++) {
      const t = this.tabs[i];
      if (!t.builtIn && typeof t.syncContent === 'function' && (this.activeTab === t.id || forceRebuild)) {
        const panel = this._tabPanelRefs.get(t.id);
        if (panel) t.syncContent(panel, state, this);
      }
    }
  }

  _syncEventsDock(state) {
    const dock = this._refs.eventsDock;
    if (!dock) return;

    const events = state?.events || null;
    const bounty = events?.bounty || null;
    const activeBuffs = Array.isArray(events?.activeBuffs) ? events.activeBuffs : [];
    const merchantOffer = events?.merchantOffer || null;

    const hasAny = Boolean(bounty || activeBuffs.length > 0 || merchantOffer);
    dock.classList.toggle('hidden', !hasAny);
    dock.classList.toggle('has-merchant', Boolean(merchantOffer));

    if (this.root) {
      this.root.classList.toggle('has-event-alert', Boolean(bounty?.completed || merchantOffer));
    }

    // Widget A: Compact Bounty Tracker Pill
    const bountyPill = this._refs.bountyPill;
    if (bountyPill) {
      const showBounty = Boolean(bounty);
      bountyPill.classList.toggle('hidden', !showBounty);
      if (showBounty) {
        const shownProg = Math.min(bounty.progress, bounty.target);
        const completed = Boolean(bounty.completed);
        this._lastBountyCompleted = completed;
        bountyPill.classList.toggle('is-claimable', completed);
        bountyPill.setAttribute('aria-disabled', completed ? 'false' : 'true');
        setStyleIfChanged(
          bountyPill,
          'borderLeftColor',
          completed ? '#fef08a' : (bounty.accentHex || '#facc15')
        );

        setTextIfChanged(this._refs.bountyLabel, `${bounty.shortLabel} ${shownProg}/${bounty.target}`);

        if (completed) {
          setTextIfChanged(this._refs.bountyCta, 'CLAIM!');
        } else {
          const rw = bounty.rewards || {};
          let hintText = '+0G';
          if (rw.gold > 0 || (rw.formattedGold && rw.formattedGold !== '0')) {
            hintText = `+${formatGoldTag(rw.formattedGold, rw.gold)}`;
          } else if (rw.forgeDust > 0) {
            hintText = `+${rw.forgeDust}D`;
          } else if (rw.astralShards > 0) {
            hintText = `+${rw.astralShards}S`;
          }
          setTextIfChanged(this._refs.bountyCta, hintText);
        }

        if (this._refs.bountyFill) {
          const pct = Math.max(0, Math.min(100, (Number(bounty.ratio) || 0) * 100));
          setStyleIfChanged(this._refs.bountyFill, 'width', `${pct.toFixed(1)}%`);
          setStyleIfChanged(
            this._refs.bountyFill,
            'backgroundColor',
            completed ? '#facc15' : (bounty.accentHex || '#facc15')
          );
        }

        const rw = bounty.rewards || {};
        const rwParts = [];
        if (rw.gold > 0) rwParts.push(`+${formatGoldTag(rw.formattedGold, rw.gold)}`);
        if (rw.astralShards > 0) rwParts.push(`+${rw.astralShards} SHARDS`);
        if (rw.forgeDust > 0) rwParts.push(`+${rw.forgeDust} DUST`);
        const rewardSummary = rwParts.length > 0 ? ` | REWARD: ${rwParts.join(' ')}` : '';
        const tip = `${bounty.title} (${shownProg}/${bounty.target})${rewardSummary}${completed ? ' | CLICK TO CLAIM!' : ''}`;
        if (bountyPill.title !== tip) {
          bountyPill.title = tip;
        }
      } else {
        this._lastBountyCompleted = false;
        bountyPill.classList.remove('is-claimable');
        bountyPill.setAttribute('aria-disabled', 'true');
      }
    }

    // Widget B: Active Shrine / Elixir Buff Timer Strip (keyed in-place DOM updates)
    const buffStrip = this._refs.buffStrip;
    if (buffStrip) {
      const hasBuffs = activeBuffs.length > 0;
      buffStrip.classList.toggle('hidden', !hasBuffs);

      const seenKeys = new Set();
      for (let i = 0; i < activeBuffs.length; i++) {
        const bf = activeBuffs[i];
        const key = String(bf.id || `${bf.source || 'buff'}_${i}`);
        seenKeys.add(key);

        let ref = this._buffPillRefs.get(key);
        if (!ref) {
          const pill = document.createElement('div');
          pill.className = 'endless-buff-pill';
          pill.dataset.buffId = key;
          stopEventLeak(pill);

          const row = document.createElement('div');
          row.className = 'endless-buff-row';

          const iconEl = document.createElement('span');
          iconEl.className = 'endless-buff-icon';
          iconEl.innerHTML = SHRINE_SVG;

          const textEl = document.createElement('span');
          textEl.className = 'endless-buff-text';

          row.appendChild(iconEl);
          row.appendChild(textEl);

          const track = document.createElement('div');
          track.className = 'endless-buff-bar-track';
          const fillEl = document.createElement('div');
          fillEl.className = 'endless-buff-bar-fill';
          track.appendChild(fillEl);

          pill.appendChild(row);
          pill.appendChild(track);
          buffStrip.appendChild(pill);

          ref = { pill, iconEl, textEl, fillEl, lastAccent: '' };
          this._buffPillRefs.set(key, ref);
        }

        const accent = bf.accentHex || '#facc15';
        if (ref.lastAccent !== accent) {
          ref.pill.style.borderColor = accent;
          ref.iconEl.style.color = accent;
          ref.fillEl.style.backgroundColor = accent;
          ref.lastAccent = accent;
        }

        const secLeft = Math.max(0, Math.ceil(Number(bf.remainingSec) || 0));
        setTextIfChanged(ref.textEl, `${bf.shortLabel} ${secLeft}S`);
        const pct = Math.max(0, Math.min(100, (Number(bf.ratio) || 0) * 100));
        setStyleIfChanged(ref.fillEl, 'width', `${pct.toFixed(1)}%`);

        const tip = `${bf.name} (${secLeft}S LEFT)`;
        if (ref.pill.title !== tip) {
          ref.pill.title = tip;
        }

        if (
          buffStrip.children &&
          typeof buffStrip.insertBefore === 'function' &&
          buffStrip.children[i] !== ref.pill
        ) {
          buffStrip.insertBefore(ref.pill, buffStrip.children[i] || null);
        }
      }

      for (const [key, ref] of this._buffPillRefs.entries()) {
        if (!seenKeys.has(key)) {
          if (ref.pill && ref.pill.parentNode === buffStrip) {
            buffStrip.removeChild(ref.pill);
          }
          this._buffPillRefs.delete(key);
        }
      }
    }

    // Widget C: Wandering Merchant Pop-Offer Card
    const merchantCard = this._refs.merchantCard;
    if (merchantCard) {
      const showOffer = Boolean(merchantOffer);
      merchantCard.classList.toggle('hidden', !showOffer);
      if (showOffer) {
        const accent = merchantOffer.accentHex || '#c084fc';
        this._lastMerchantUid = merchantOffer.uid;
        this._lastMerchantOfferType = merchantOffer.offerType;
        setStyleIfChanged(merchantCard, 'borderLeftColor', accent);
        setTextIfChanged(this._refs.merchantTitle, merchantOffer.title);
        const secLeft = Math.max(0, Math.ceil(Number(merchantOffer.remainingSec) || 0));
        setTextIfChanged(this._refs.merchantTimer, `${secLeft}S`);
        setTextIfChanged(this._refs.merchantSub, merchantOffer.subtitle || 'ARCANE LIMITED OFFER');

        if (this._refs.merchantFill) {
          const pct = Math.max(0, Math.min(100, (Number(merchantOffer.ratio) || 0) * 100));
          setStyleIfChanged(this._refs.merchantFill, 'width', `${pct.toFixed(1)}%`);
        }
        if (this._refs.merchantBuyBtn) {
          const costTag = formatGoldTag(merchantOffer.formattedCost, merchantOffer.costGold);
          setTextIfChanged(this._refs.merchantBuyBtn, `BUY ${costTag}`);
          this._refs.merchantBuyBtn.disabled = !merchantOffer.canAfford;
          this._refs.merchantBuyBtn.classList.toggle('is-affordable', Boolean(merchantOffer.canAfford));
        }
      } else {
        this._lastMerchantUid = null;
        this._lastMerchantOfferType = '';
      }
    }
  }

  _syncOfflineLootModal(state) {
    const modal = this._refs.offlineModal;
    if (!modal) return;
    const loot = state.pendingOfflineLoot;
    const show = Boolean(loot);
    modal.classList.toggle('hidden', !show);
    if (!show) return;

    setTextIfChanged(this._refs.offlineAwayBadge, `AWAY: ${loot.formattedTime}`);

    const isCapped = loot.cappedSec > 0 && loot.awaySec > loot.cappedSec;
    if (this._refs.offlineCapBadge) {
      this._refs.offlineCapBadge.classList.toggle('hidden', !isCapped);
      if (isCapped) {
        const capHrs = Math.max(1, Math.round(loot.cappedSec / 3600));
        setTextIfChanged(this._refs.offlineCapBadge, `${capHrs}H MAX CAP`);
      }
    }

    if (this._refs.offlineStagesBadge) {
      const showStages = loot.stagesSimulated > 0;
      this._refs.offlineStagesBadge.classList.toggle('hidden', !showStages);
      if (showStages) {
        const unit = loot.stagesSimulated === 1 ? 'STAGE' : 'STAGES';
        setTextIfChanged(
          this._refs.offlineStagesBadge,
          `${formatEndlessNumber(loot.stagesSimulated)} ${unit} SIMULATED`
        );
      }
    }

    setTextIfChanged(this._refs.offlineGoldVal, `+${formatEndlessNumber(loot.gold)} GOLD`);
    if (this._refs.offlineGoldPlaque) {
      this._refs.offlineGoldPlaque.classList.toggle('is-empty', loot.gold <= 0);
    }

    setTextIfChanged(this._refs.offlineShardVal, `+${formatEndlessNumber(loot.astralShards)} SHARDS`);
    if (this._refs.offlineShardPlaque) {
      this._refs.offlineShardPlaque.classList.toggle('is-empty', loot.astralShards <= 0);
    }
  }

  _syncTrialHud(state) {
    const hud = this._refs.trialHud;
    if (!hud) return;
    const trials = state?.trials || null;
    const active = trials?.isActive && trials?.activeTrial ? trials.activeTrial : null;
    const show = Boolean(active);

    hud.classList.toggle('hidden', !show);
    if (this.root) {
      this.root.classList.toggle('is-trial-active', show);
    }
    if (!show) {
      hud.classList.remove('is-urgent');
      return;
    }

    const accent = active.accentHex || '#facc15';
    const remSec = Math.max(0, Number(active.remainingSec) || 0);
    const durSec = Math.max(0.1, Number(active.durationSec) || 30);
    const ratio = Number.isFinite(Number(active.ratio))
      ? Math.max(0, Math.min(1, Number(active.ratio)))
      : Math.max(0, Math.min(1, remSec / durSec));
    const urgent = remSec <= 5;

    hud.classList.toggle('is-urgent', urgent);
    setStyleIfChanged(hud, 'borderColor', urgent ? '#f43f5e' : accent);

    if (this._refs.trialHudIcon) {
      setStyleIfChanged(this._refs.trialHudIcon, 'borderColor', accent);
      if (this._lastTrialHudIconId !== active.id) {
        this._refs.trialHudIcon.innerHTML = getTrialSvg(active.id);
        this._lastTrialHudIconId = active.id;
      }
    }

    setTextIfChanged(this._refs.trialHudName, active.name || active.shortName || 'CHALLENGE TRIAL');
    setStyleIfChanged(this._refs.trialHudName, 'color', accent);
    setTextIfChanged(this._refs.trialHudTimer, `${remSec.toFixed(1)}S`);
    setTextIfChanged(this._refs.trialHudScore, formatTrialHudScore(active));

    if (this._refs.trialHudFill) {
      setStyleIfChanged(this._refs.trialHudFill, 'width', `${(ratio * 100).toFixed(1)}%`);
      setStyleIfChanged(this._refs.trialHudFill, 'backgroundColor', urgent ? '#f43f5e' : accent);
    }

    let tip = `${active.name} (${remSec.toFixed(1)}S LEFT) | ${formatTrialHudScore(active)}`;
    if (active.id === 'malphas_gauntlet' && active.formattedNextTier && active.currentTier < 12) {
      tip += ` | NEXT TIER AT ${active.formattedNextTier}`;
    }
    if (hud.title !== tip) {
      hud.title = tip;
    }
  }

  _syncTrialResultModal(state) {
    const modal = this._refs.trialModal;
    if (!modal) return;
    const res = state?.trials?.lastResult || null;
    const show = Boolean(res);
    modal.classList.toggle('hidden', !show);
    if (!show) {
      this._lastTrialResultSig = '';
      return;
    }

    const gearList = Array.isArray(res.gearAwarded) ? res.gearAwarded : [];
    const sig = [
      res.uid || '',
      res.trialId || '',
      res.completedFull ? 1 : 0,
      res.goldAwarded || 0,
      res.shardsAwarded || 0,
      res.dustAwarded || 0,
      res.kills || 0,
      res.damageDealt || 0,
      res.tierReached || 0,
      gearList.map((g) => `${g.uid || ''}:${g.rarity || ''}:${g.name || ''}`).join(',')
    ].join('|');
    if (sig === this._lastTrialResultSig) return;
    this._lastTrialResultSig = sig;

    const accent = res.accentHex || '#facc15';
    if (this._refs.trialModalCard) {
      this._refs.trialModalCard.style.borderColor = accent;
    }
    if (this._refs.trialModalStatus) {
      const done = Boolean(res.completedFull);
      this._refs.trialModalStatus.classList.toggle('is-exited', !done);
      setTextIfChanged(this._refs.trialModalStatus, done ? 'TRIAL COMPLETE!' : 'TRIAL EXITED');
    }
    if (this._refs.trialModalIcon) {
      this._refs.trialModalIcon.innerHTML = getTrialSvg(res.trialId);
    }
    if (this._refs.trialModalTitle) {
      setTextIfChanged(this._refs.trialModalTitle, res.trialName || 'CHALLENGE TRIAL');
      this._refs.trialModalTitle.style.color = accent;
    }
    setTextIfChanged(this._refs.trialModalPerf, formatTrialResultPerf(res));

    const goldAmt = Math.max(0, Number(res.goldAwarded) || 0);
    const goldStr = String(res.formattedGold || formatEndlessNumber(goldAmt)).toUpperCase();
    setTextIfChanged(this._refs.trialModalGoldVal, `+${goldStr}`);
    if (this._refs.trialModalGoldPlaque) {
      this._refs.trialModalGoldPlaque.classList.toggle('is-empty', goldAmt <= 0);
    }

    const shardsAmt = Math.max(0, Math.floor(Number(res.shardsAwarded) || 0));
    setTextIfChanged(this._refs.trialModalShardVal, `+${formatEndlessNumber(shardsAmt)}`);
    if (this._refs.trialModalShardPlaque) {
      this._refs.trialModalShardPlaque.classList.toggle('is-empty', shardsAmt <= 0);
    }

    const dustAmt = Math.max(0, Math.floor(Number(res.dustAwarded) || 0));
    setTextIfChanged(this._refs.trialModalDustVal, `+${formatEndlessNumber(dustAmt)}`);
    if (this._refs.trialModalDustPlaque) {
      this._refs.trialModalDustPlaque.classList.toggle('is-empty', dustAmt <= 0);
    }

    const gearBox = this._refs.trialModalGearBox;
    const gearContainer = this._refs.trialModalGearList;
    if (gearBox && gearContainer) {
      const hasGear = gearList.length > 0;
      gearBox.classList.toggle('hidden', !hasGear);
      gearContainer.textContent = '';
      if (hasGear) {
        for (let i = 0; i < gearList.length; i++) {
          const g = gearList[i];
          const rarity = String(g.rarity || 'heroic').toLowerCase();
          const color = g.rarityMeta?.color || TRIAL_RARITY_COLORS[rarity] || '#c084fc';
          const label = String(g.rarityMeta?.label || rarity).toUpperCase();

          const pill = document.createElement('div');
          pill.className = 'endless-trial-gear-pill';
          pill.style.borderColor = color;

          const ico = document.createElement('span');
          ico.className = 'endless-trial-gear-pill-ico';
          ico.innerHTML = getGearSlotSvg(g.slot);

          const rar = document.createElement('span');
          rar.className = 'endless-trial-gear-pill-rarity';
          rar.style.color = color;
          rar.textContent = label;

          const nm = document.createElement('span');
          nm.className = 'endless-trial-gear-pill-name';
          nm.textContent = String(g.name || 'RELIC GEAR').toUpperCase();

          pill.appendChild(ico);
          pill.appendChild(rar);
          pill.appendChild(nm);
          gearContainer.appendChild(pill);
        }
      }
    }
  }

  _syncTrialsPanel(snapOrState) {
    if (!this._refs.trialsHeader) return;
    const raw = (snapOrState && typeof snapOrState.trials === 'object' && snapOrState.trials)
      ? snapOrState.trials
      : null;

    const isActive = Boolean(raw?.isActive);
    const activeId = isActive ? String(raw?.activeTrial?.id || '') : '';
    const totalCleared = Math.max(0, Math.floor(Number(raw?.totalTrialsCompleted) || 0));
    setTextIfChanged(this._refs.trialsCleared, `CLEARED: ${formatEndlessNumber(totalCleared)}`);

    const list = (Array.isArray(raw?.trials) && raw.trials.length > 0)
      ? raw.trials
      : DEFAULT_TRIAL_DEFS.map((d) => ({
          ...d,
          cooldownLeft: 0,
          canEnter: !isActive,
          bestScore: 0,
          formattedBestScore: '0'
        }));

    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const ref = this._ensureTrialCard(t);
      const accent = String(t.accentHex || '#facc15');
      const durSec = Math.max(1, Math.round(Number(t.durationSec) || 30));
      const cdLeft = Math.max(0, Number(t.cooldownLeft) || 0);
      const isThisActive = isActive && activeId === t.id;
      const canEnter = Boolean(!isActive && (t.canEnter !== undefined ? t.canEnter : cdLeft <= 0));

      if (ref.lastAccent !== accent) {
        ref.card.style.borderLeftColor = accent;
        ref.iconWrap.style.borderColor = accent;
        ref.rewardPill.style.borderColor = accent;
        ref.rewardPill.style.color = accent;
        ref.lastAccent = accent;
      }

      ref.card.classList.toggle('is-ready', canEnter);
      ref.card.classList.toggle('is-running', isThisActive);
      ref.card.classList.toggle('is-cooldown', !isActive && cdLeft > 0);

      setTextIfChanged(ref.nameEl, String(t.name || t.id).toUpperCase());
      setTextIfChanged(ref.durPill, `${durSec}S`);
      setTextIfChanged(ref.rewardPill, String(t.rewardTag || 'TRIAL REWARD').toUpperCase());
      setTextIfChanged(ref.descEl, String(t.desc || ''));
      setTextIfChanged(ref.bestEl, formatTrialBestScore(t));

      ref.enterBtn.classList.toggle('is-active-trial', isThisActive);
      if (isActive) {
        setTextIfChanged(ref.enterBtn, 'IN TRIAL');
        ref.enterBtn.disabled = true;
        ref.enterBtn.style.borderColor = isThisActive ? accent : '';
      } else if (cdLeft > 0 || !canEnter) {
        const secs = Math.max(1, Math.ceil(cdLeft));
        setTextIfChanged(ref.enterBtn, `COOLDOWN ${secs}S`);
        ref.enterBtn.disabled = true;
        ref.enterBtn.style.borderColor = '';
      } else {
        setTextIfChanged(ref.enterBtn, 'ENTER TRIAL');
        ref.enterBtn.disabled = false;
        ref.enterBtn.style.borderColor = accent;
      }
    }
  }

  _syncAscendTab(state) {
    const asc = state.ascension;
    if (!asc) return;
    this._lastResolvedAscension = asc;

    setTextIfChanged(this._refs.ascendCount, `ASCENSIONS: ${formatEndlessNumber(asc.totalAscensions)}`);
    setTextIfChanged(this._refs.ascendCurShards, formatEndlessNumber(asc.astralShards));
    setTextIfChanged(
      this._refs.ascendPendingShards,
      `+${formatEndlessNumber(asc.pendingShards)} ASTRAL SHARDS`
    );
    if (this._refs.ascendPendingShards) {
      this._refs.ascendPendingShards.classList.toggle('is-locked', !asc.canAscend || asc.pendingShards <= 0);
    }

    if (this._refs.ascendBtn && this._refs.ascendBtnLabel) {
      if (!asc.canAscend) {
        if (this._ascendArmed) {
          this._disarmAscendConfirm();
        }
        this._refs.ascendBtn.disabled = true;
        this._refs.ascendBtn.classList.remove('is-armed');
        setTextIfChanged(this._refs.ascendBtnLabel, `REACH STAGE ${asc.unlockStage} TO ASCEND`);
      } else {
        this._refs.ascendBtn.disabled = false;
        if (this._ascendArmed) {
          this._refs.ascendBtn.classList.add('is-armed');
          setTextIfChanged(
            this._refs.ascendBtnLabel,
            `CONFIRM ASCEND? (+${formatEndlessNumber(asc.pendingShards)} SHARDS)`
          );
        } else {
          this._refs.ascendBtn.classList.remove('is-armed');
          setTextIfChanged(this._refs.ascendBtnLabel, 'ASCEND NOW');
        }
      }
    }

    const list = Array.isArray(asc.artifacts) ? asc.artifacts : [];
    if (this._refs.artifactEmpty) {
      this._refs.artifactEmpty.classList.toggle('hidden', list.length > 0);
    }
    if (this._refs.artifactSectionSub) {
      const ownedCount = list.filter((a) => a.level > 0).length;
      setTextIfChanged(
        this._refs.artifactSectionSub,
        list.length > 0 ? `${ownedCount} / ${list.length} OWNED` : 'PERMANENT BOOSTS'
      );
    }

    for (let i = 0; i < list.length; i++) {
      const art = list[i];
      const ref = this._ensureArtifactRow(art);
      const isMaxed = Boolean(art.isMaxed);
      const canAfford = Boolean(!isMaxed && art.canAfford);

      ref.row.classList.toggle('is-affordable', canAfford);
      ref.row.classList.toggle('is-maxed', isMaxed);
      setTextIfChanged(ref.nameEl, art.name);
      setTextIfChanged(ref.lvEl, `LV.${art.level} / ${art.maxLevel}`);
      setTextIfChanged(ref.effectEl, art.effectSummary || '');
      setTextIfChanged(ref.descEl, art.desc || '');

      ref.buyBtn.classList.toggle('is-maxed', isMaxed);
      if (isMaxed) {
        setTextIfChanged(ref.buyBtn, 'MAXED');
        ref.buyBtn.disabled = true;
      } else {
        setTextIfChanged(ref.buyBtn, `${formatEndlessNumber(art.cost)} SHARDS`);
        ref.buyBtn.disabled = !canAfford;
      }
    }
  }

  _syncItemsTab(state) {
    for (const [mode, btn] of this._bulkBtnRefs.entries()) {
      btn.classList.toggle('is-active', mode === state.bulkMode);
    }

    // Wave 4: Sync Relic Set Synergies strip
    const relicSets = Array.isArray(state.relicSets) ? state.relicSets : [];
    for (let i = 0; i < relicSets.length; i++) {
      const s = relicSets[i];
      const setRef = this._relicSetPillRefs?.get?.(s.id);
      if (!setRef) continue;
      setRef.pill.classList.toggle('is-active', Boolean(s.active));
      setRef.pill.style.borderColor = s.active ? s.color || '#facc15' : '#334155';
      setTextIfChanged(setRef.tierSpan, s.tierLabel || (s.active ? `TIER ${s.tier}` : 'LOCKED'));
      const lvLabel = s.nextTierLevel ? `${s.minLevel}/${s.nextTierLevel}` : `LV.${s.minLevel}+`;
      setTextIfChanged(setRef.lvSpan, lvLabel);
      const setTip = `${s.name} (${s.tierLabel || 'LOCKED'}): ${s.bonusDesc || ''}`;
      if (setRef.pill.title !== setTip) {
        setRef.pill.title = setTip;
      }
    }

    const milestonesMap = state.relicMilestones || {};
    for (let i = 0; i < state.relicsView.length; i++) {
      const item = state.relicsView[i];
      const ref = this._relicRowRefs.get(item.id);
      if (!ref) continue;
      const relicDef = RELIC_DEF_BY_ID.get(item.id);
      const lv = Math.max(0, Math.floor(Number(item.level) || 0));
      const count = Math.max(1, Math.floor(Number(item.count ?? item.quote?.count) || 1));
      const cost = Number(item.totalCost ?? item.cost ?? item.quote?.totalCost ?? item.nextCost ?? item.quote?.nextCost ?? 0) || 0;
      const canAfford = Boolean(item.canAfford ?? item.quote?.canAfford ?? false);

      ref.row.classList.toggle('is-affordable', canAfford);
      setTextIfChanged(ref.lvEl, `LV.${lv}`);
      if (ref.milestoneEl) {
        const ms = milestonesMap[item.id];
        if (ms) {
          const reached = ms.reachedCount > 0;
          ref.milestoneEl.classList.toggle('is-reached', reached);
          const tagText = reached
            ? (ms.nextLevel ? `X${ms.activeMult} -> ${ms.nextLevel}` : `MAX X${ms.activeMult}`)
            : `LV.${ms.nextLevel || 10} X1.5`;
          setTextIfChanged(ref.milestoneEl, tagText);
        }
      }
      setTextIfChanged(
        ref.bonusEl,
        item.bonusText || (relicDef ? relicDef.formatBonus(lv) : '')
      );
      setTextIfChanged(ref.countSpan, `+${count}`);
      setTextIfChanged(ref.costSpan, `${formatEndlessNumber(cost)}G`);
      ref.buyBtn.disabled = !canAfford;
    }
  }

  _syncGearPanel(snapOrState, forceRebuild = false) {
    if (!this._refs.gearHeader) return;
    const gear = snapOrState && typeof snapOrState.gear === 'object' ? snapOrState.gear : null;

    // 1. Header Strip: Forge Dust, Gear Power, Equip Best, Salvage Lower
    const dustNum = Math.max(0, Math.floor(Number(gear?.forgeDust ?? snapOrState?.forgeDust ?? 0) || 0));
    const dustFormatted = String(
      gear?.formattedForgeDust ?? snapOrState?.formattedForgeDust ?? formatEndlessNumber(dustNum)
    );
    const totalPower = Math.max(0, Math.floor(Number(gear?.totalPower) || 0));
    setTextIfChanged(this._refs.gearDustVal, dustFormatted);
    setTextIfChanged(this._refs.gearPowerVal, formatEndlessNumber(totalPower));

    if (this._refs.gearEquipBestBtn) {
      this._refs.gearEquipBestBtn.classList.toggle('is-highlight', Boolean(gear?.hasUpgradeAvailable));
    }
    if (this._refs.gearSalvageLowerBtn) {
      this._refs.gearSalvageLowerBtn.disabled = !Boolean(gear?.hasSalvageableLower);
    }

    // 2. 4 Equipped Slots Grid (in-place patching with per-slot signature diffing)
    const equippedMap = gear?.equipped && typeof gear.equipped === 'object' ? gear.equipped : null;
    for (let i = 0; i < GEAR_SLOT_ORDER.length; i++) {
      const slotId = GEAR_SLOT_ORDER[i];
      const slotRef = this._gearSlotRefs.get(slotId);
      if (!slotRef) continue;
      const item = equippedMap ? equippedMap[slotId] || null : null;
      const sig = computeGearItemSignature(item);
      if (!forceRebuild && this._lastGearEquipSigs.get(slotId) === sig) {
        continue;
      }
      this._lastGearEquipSigs.set(slotId, sig);

      const slotDef = GEAR_SLOT_DEFAULTS[slotId];
      if (!item) {
        slotRef.currentUid = null;
        slotRef.currentItem = null;
        slotRef.card.classList.add('is-empty');
        slotRef.card.style.borderColor = '';
        slotRef.card.style.boxShadow = '';
        slotRef.iconWrap.style.borderColor = '';
        slotRef.rarityPill.style.borderColor = '';
        slotRef.rarityPill.style.color = '';
        setTextIfChanged(slotRef.rarityPill, slotDef.label);
        slotRef.enhLvEl.classList.add('hidden');
        setTextIfChanged(slotRef.nameEl, 'EMPTY SLOT');
        setTextIfChanged(slotRef.statsEl, 'NO ITEM EQUIPPED');
        slotRef.enhBtn.disabled = true;
        slotRef.enhBtn.classList.remove('is-maxed');
        const emptyTip = `${slotDef.label}: Empty Slot`;
        if (slotRef.card.title !== emptyTip) {
          slotRef.card.title = emptyTip;
        }
        continue;
      }

      slotRef.currentUid = String(item.uid || '');
      slotRef.currentItem = item;
      slotRef.card.classList.remove('is-empty');

      const rarityColor = item.rarityMeta?.color || '#94a3b8';
      const rarityLabel = item.rarityMeta?.label || String(item.rarity || 'COMMON').toUpperCase();
      const slotLabel = item.slotMeta?.label || slotDef.label;
      const lv = Math.max(0, Math.floor(Number(item.enhanceLevel) || 0));

      slotRef.card.style.borderColor = rarityColor;
      if (item.rarity === 'mythic' || item.rarity === 'sovereign') {
        slotRef.card.style.boxShadow = `inset 0 0 12px ${rarityColor}33, 0 0 8px ${rarityColor}33`;
      } else {
        slotRef.card.style.boxShadow = '';
      }
      slotRef.iconWrap.style.borderColor = rarityColor;
      slotRef.rarityPill.style.borderColor = rarityColor;
      slotRef.rarityPill.style.color = rarityColor;
      setTextIfChanged(slotRef.rarityPill, rarityLabel);

      slotRef.enhLvEl.classList.toggle('hidden', lv <= 0);
      if (lv > 0) {
        setTextIfChanged(slotRef.enhLvEl, `+${lv}`);
      }

      setTextIfChanged(slotRef.nameEl, item.name || `${rarityLabel} ${slotLabel}`);

      const bonuses = item.effectiveBonuses || item.bonuses;
      const topStats = formatGearBonuses(bonuses, 2) || `PWR ${formatEndlessNumber(item.power || 0)}`;
      setTextIfChanged(slotRef.statsEl, topStats);

      if (item.setMeta && item.setMeta.name) {
        const setAccent = item.setMeta.accentHex || '#facc15';
        slotRef.setTagEl.classList.remove('is-pwr', 'hidden');
        slotRef.setTagEl.style.borderColor = setAccent;
        slotRef.setTagEl.style.color = setAccent;
        setTextIfChanged(slotRef.setTagEl, item.setMeta.name);
      } else {
        slotRef.setTagEl.classList.add('is-pwr');
        slotRef.setTagEl.classList.remove('hidden');
        slotRef.setTagEl.style.borderColor = '';
        slotRef.setTagEl.style.color = '';
        setTextIfChanged(slotRef.setTagEl, `PWR ${formatEndlessNumber(item.power || 0)}`);
      }

      const isMax = Boolean(item.isMaxEnhanced || lv >= 20);
      slotRef.enhBtn.classList.toggle('is-maxed', isMax);
      if (isMax) {
        setTextIfChanged(slotRef.enhBtn, 'MAX');
        slotRef.enhBtn.disabled = true;
      } else {
        const cost = Math.max(0, Math.floor(Number(item.enhanceCost) || 0));
        setTextIfChanged(slotRef.enhBtn, `+1 • ${formatEndlessNumber(cost)}D`);
        slotRef.enhBtn.disabled = !item.canEnhance;
      }

      const fullStats = formatGearBonuses(bonuses, 0);
      const tip =
        `${item.name || slotLabel}${lv > 0 ? ` +${lv}` : ''} [${rarityLabel} ${slotLabel}] ` +
        `STG ${item.stage || 1} | PWR ${formatEndlessNumber(item.power || 0)}` +
        (fullStats ? ` | ${fullStats}` : '') +
        (item.setMeta?.name ? ` | SET: ${item.setMeta.name}` : '');
      if (slotRef.card.title !== tip) {
        slotRef.card.title = tip;
      }
    }

    // 3. Mythic Set Passives Strip (3 compact pills)
    const activeSets = Array.isArray(gear?.activeSets) && gear.activeSets.length > 0
      ? gear.activeSets
      : DEFAULT_MYTHIC_SETS;
    const setSig = activeSets
      .map((s) => `${s.id}:${s.pieces || 0}:${s.requiredPieces || 2}:${s.active ? 1 : 0}:${s.empowered ? 1 : 0}:${s.shortDesc || ''}`)
      .join('|');
    if (forceRebuild || setSig !== this._lastGearSetSig) {
      this._lastGearSetSig = setSig;
      for (let i = 0; i < activeSets.length; i++) {
        const s = activeSets[i];
        const ref = this._gearSetPillRefs.get(s.id);
        if (!ref) continue;
        const pieces = Math.max(0, Math.floor(Number(s.pieces) || 0));
        const req = Math.max(1, Math.floor(Number(s.requiredPieces) || 2));
        const active = Boolean(s.active);
        const empowered = Boolean(s.empowered);
        const accent = s.accentHex || ref.def.accentHex || '#facc15';
        const statusText = empowered ? 'EMPOWERED' : (active ? 'ACTIVE' : `${pieces}/${req}`);

        ref.pill.classList.toggle('is-active', active);
        ref.pill.classList.toggle('is-empowered', empowered);
        ref.pill.style.borderColor = (active || empowered) ? accent : '#334155';
        ref.pill.style.boxShadow = empowered
          ? `inset 0 0 12px ${accent}40, 0 0 8px ${accent}55`
          : active
            ? `inset 0 0 10px ${accent}30, 0 0 6px ${accent}38`
            : '';
        ref.nameEl.style.color = (active || empowered) ? accent : '#cbd5e1';
        ref.statusEl.style.borderColor = (active || empowered) ? accent : '#334155';
        ref.statusEl.style.color = empowered ? '#ffffff' : active ? accent : '#94a3b8';

        setTextIfChanged(ref.nameEl, s.name || ref.def.name);
        setTextIfChanged(ref.statusEl, statusText);
        setTextIfChanged(ref.descEl, s.shortDesc || ref.def.shortDesc || '');

        const setTip = `${s.name || ref.def.name} (${statusText}): ${s.fullDesc || s.shortDesc || ref.def.fullDesc} [${pieces}/${req}]`;
        if (ref.pill.title !== setTip) {
          ref.pill.title = setTip;
        }
      }
    }

    // 4. Inventory Bag List (smart signature diff + in-place keyed reconciliation so clicks NEVER drop)
    const inventory = Array.isArray(gear?.inventory) ? gear.inventory : [];
    const invCount = Number.isFinite(Number(gear?.inventoryCount))
      ? Math.max(0, Math.floor(Number(gear.inventoryCount)))
      : inventory.length;
    const maxInv = Math.max(1, Math.floor(Number(gear?.maxInventory) || 24));
    setTextIfChanged(this._refs.gearBagCount, `BAG ${invCount}/${maxInv}`);
    if (this._refs.gearBagHint) {
      const dropped = Math.max(0, Math.floor(Number(gear?.totalDropped) || 0));
      setTextIfChanged(
        this._refs.gearBagHint,
        dropped > 0 ? `${formatEndlessNumber(dropped)} FOUND` : 'LOOT INVENTORY'
      );
    }

    if (this._refs.gearBagEmpty) {
      this._refs.gearBagEmpty.classList.toggle('hidden', inventory.length > 0);
    }

    const container = this._refs.gearBagItems;
    if (!container) return;

    const invSig = inventory.map((it) => computeGearItemSignature(it, equippedMap)).join('|');
    if (!forceRebuild && invSig === this._lastGearInvSig) {
      return;
    }
    this._lastGearInvSig = invSig;

    const seenUids = new Set();
    for (let i = 0; i < inventory.length; i++) {
      const it = inventory[i];
      if (!it || !it.uid) continue;
      seenUids.add(String(it.uid));
    }

    // Remove rows for items no longer in bag
    for (const [uid, rowRef] of this._gearBagRowRefs.entries()) {
      if (!seenUids.has(uid)) {
        if (rowRef.row.parentNode === container) {
          container.removeChild(rowRef.row);
        }
        this._gearBagRowRefs.delete(uid);
      }
    }

    // Create or patch in-place and preserve exact inventory order without detaching unchanged rows
    for (let i = 0; i < inventory.length; i++) {
      const it = inventory[i];
      if (!it || !it.uid) continue;
      const uid = String(it.uid);
      let rowRef = this._gearBagRowRefs.get(uid);
      if (!rowRef) {
        rowRef = this._createGearBagRow(it);
        this._gearBagRowRefs.set(uid, rowRef);
      }
      this._patchGearBagRow(rowRef, it, equippedMap);
      const currentAtIdx = container.children[i] || null;
      if (currentAtIdx !== rowRef.row) {
        container.insertBefore(rowRef.row, currentAtIdx);
      }
    }
  }

  _syncCompanionsTab(state) {
    setTextIfChanged(
      this._refs.partyCounter,
      `ACTIVE PARTY ${state.activeSlotsCount} / ${state.maxActiveSlots}`
    );

    // Wave 9: Sync Squad Formation Selector Bar in-place
    const evo = state.companionEvo;
    if (evo && this._refs.formationBtns) {
      const formations = Array.isArray(evo.formations) && evo.formations.length > 0
        ? evo.formations
        : DEFAULT_SQUAD_FORMATIONS;
      const activeId = evo.formationId || evo.formation?.id || 'balanced_phalanx';
      for (let i = 0; i < formations.length; i++) {
        const f = formations[i];
        let btn = this._formationBtnRefs.get(f.id);
        if (!btn) {
          btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'endless-formation-btn';
          btn.dataset.formationId = f.id;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleSetSquadFormation(f.id);
          });
          this._refs.formationBtns.appendChild(btn);
          this._formationBtnRefs.set(f.id, btn);
        }
        const isActive = f.id === activeId;
        const accent = f.accentHex || '#facc15';
        btn.classList.toggle('is-active', isActive);
        setTextIfChanged(btn, f.shortLabel || f.name || f.id);
        btn.style.borderColor = isActive ? accent : '';
        btn.style.color = isActive ? accent : '';
        const glowTint = /^#[0-9a-fA-F]{6}$/.test(accent)
          ? `${accent}55`
          : 'rgba(250, 204, 21, 0.34)';
        btn.style.boxShadow = isActive
          ? `inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 0 8px ${glowTint}`
          : '';
        const fTip = f.desc ? `${f.name}: ${f.desc}` : f.name;
        if (btn.title !== fTip) btn.title = fTip;
      }

      if (this._refs.formationDesc) {
        const activeForm = evo.formation || formations.find((f) => f.id === activeId) || formations[0];
        const summary = activeForm?.desc || '';
        setTextIfChanged(this._refs.formationDesc, summary);
        this._refs.formationDesc.style.color = activeForm?.accentHex || '#cbd5e1';
        const descTip = activeForm ? `${activeForm.name}: ${summary}` : '';
        if (this._refs.formationDesc.title !== descTip) {
          this._refs.formationDesc.title = descTip;
        }
      }
    }

    // Sync active Party Synergies header list
    const synergies = state.activeSynergies || [];
    if (this._refs.partySynCount) {
      setTextIfChanged(this._refs.partySynCount, `${synergies.length} ACTIVE`);
      this._refs.partySynCount.classList.toggle('is-active', synergies.length > 0);
    }
    if (this._refs.partySynList) {
      const sig = synergies.map((s) => `${s.id}|${s.name}|${s.shortLabel}|${s.desc}|${s.color}`).join('||');
      if (sig !== this._lastDrawerSynergySig) {
        this._lastDrawerSynergySig = sig;
        this._refs.partySynList.textContent = '';
        if (synergies.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'endless-party-syn-empty';
          empty.textContent = 'DEPLOY COMPATIBLE ALLIES TO UNLOCK SQUAD BONUSES';
          this._refs.partySynList.appendChild(empty);
        } else {
          for (let i = 0; i < synergies.length; i++) {
            const s = synergies[i];
            const pill = document.createElement('div');
            pill.className = 'endless-party-syn-pill';
            pill.style.borderLeftColor = s.color;
            pill.title = s.desc ? `${s.name}: ${s.desc}` : s.name;

            const nameRow = document.createElement('div');
            nameRow.className = 'endless-party-syn-name';
            nameRow.style.color = s.color;
            const iconWrap = document.createElement('span');
            iconWrap.innerHTML = SYNERGY_DIAMOND_SVG;
            const titleTxt = document.createElement('span');
            titleTxt.style.color = '#fef08a';
            titleTxt.textContent = s.name;
            nameRow.appendChild(iconWrap);
            nameRow.appendChild(titleTxt);

            const descRow = document.createElement('div');
            descRow.className = 'endless-party-syn-desc';
            descRow.textContent = s.desc || s.shortLabel;

            pill.appendChild(nameRow);
            pill.appendChild(descRow);
            this._refs.partySynList.appendChild(pill);
          }
        }
      }
    }

    const list = state.companions || [];
    if (this._refs.companionEmpty) {
      this._refs.companionEmpty.classList.toggle('hidden', list.length > 0);
    }

    for (let i = 0; i < list.length; i++) {
      const comp = list[i];
      const ref = this._ensureCompanionCard(comp);
      const unlocked = Boolean(comp.unlocked);
      const deployed = Boolean(comp.deployed);
      const lv = Math.max(0, Math.floor(Number(comp.level) || 0));
      const star = Math.max(1, Math.min(5, Math.floor(Number(comp.star) || 1)));
      const maxStars = Math.max(1, Math.floor(Number(comp.maxStars) || 5));
      const promoteQuote = (comp.promoteQuote && typeof comp.promoteQuote === 'object')
        ? comp.promoteQuote
        : null;
      const auraMeta = resolveCompanionAuraMeta(star, comp.auraTier || promoteQuote?.auraTier || null);
      const hasAura = star >= 3;
      const unlockStage = Math.max(1, Math.floor(Number(comp.unlockStage) || 1));
      const stageLocked = Boolean(!unlocked && comp.stageLocked);

      ref.card.classList.toggle('is-unlocked', unlocked);
      ref.card.classList.toggle('is-deployed', deployed);
      ref.card.classList.toggle('is-ex-evolved', hasAura);
      ref.card.classList.toggle('is-aura-3', star === 3);
      ref.card.classList.toggle('is-aura-4', star === 4);
      ref.card.classList.toggle('is-aura-5', star >= 5);
      ref.card.classList.toggle('is-stage-locked', stageLocked);

      if (ref.portWrap) {
        ref.portWrap.style.borderColor = star >= 5
          ? '#f43f5e'
          : (star === 4 ? '#c084fc' : (star === 3 ? '#38bdf8' : (comp.accentHex || '#d4af37')));
      }

      this._blitCompanionPortrait(
        ref.portCanvas,
        comp.activeHeroKey || comp.heroKey,
        comp.accentHex,
        comp.shortName || comp.name
      );

      // Keyed in-place 5-star pixel SVG row
      if (Array.isArray(ref.starEls)) {
        for (let s = 0; s < ref.starEls.length; s++) {
          const starEl = ref.starEls[s];
          const isLit = s < star;
          if (starEl._lit !== isLit) {
            starEl.innerHTML = isLit ? STAR_ON_SVG : STAR_OFF_SVG;
            starEl._lit = isLit;
          }
        }
      }

      // All 12 companions display glowing EX badge from 1-STAR; Star 3..5 add escalating Aura Tier badge
      if (ref.exBadge) {
        ref.exBadge.classList.add('is-evolved');
        setTextIfChanged(ref.exBadge, 'EX');
        const exTip = `NEXT-GEN EX (${star}/${maxStars} STARS)`;
        if (ref.exBadge.title !== exTip) ref.exBadge.title = exTip;
      }

      if (ref.auraBadge) {
        ref.auraBadge.classList.toggle('hidden', !hasAura);
        ref.auraBadge.classList.toggle('is-tier-3', star === 3);
        ref.auraBadge.classList.toggle('is-tier-4', star === 4);
        ref.auraBadge.classList.toggle('is-tier-5', star >= 5);
        if (hasAura) {
          setTextIfChanged(ref.auraBadge, auraMeta.shortLabel);
          const auraTip = `${auraMeta.label} (${star}/${maxStars} STARS)`;
          if (ref.auraBadge.title !== auraTip) ref.auraBadge.title = auraTip;
        }
      }

      setTextIfChanged(
        ref.lvEl,
        unlocked ? `LV.${lv}` : (stageLocked ? `STAGE ${unlockStage}+` : 'LOCKED')
      );
      setTextIfChanged(ref.dpsEl, `DPS ${formatEndlessNumber(comp.dpsEstimate || 0)}`);

      if (!unlocked) {
        if (stageLocked) {
          setTextIfChanged(ref.primaryBtn, `REACH STAGE ${unlockStage}`);
          ref.primaryBtn.disabled = true;
          ref.primaryBtn.classList.add('is-stage-locked');
        } else {
          const cost = Number(comp.recruitCost ?? 0) || 0;
          setTextIfChanged(ref.primaryBtn, `RECRUIT ${formatEndlessNumber(cost)}G`);
          ref.primaryBtn.disabled = !comp.canAffordRecruit;
          ref.primaryBtn.classList.remove('is-stage-locked');
        }
        ref.deployBtn.classList.add('hidden');
        if (ref.promoteBtn) {
          ref.promoteBtn.classList.add('hidden');
          ref.promoteBtn.classList.remove('is-ex-ready', 'is-max-star');
        }
      } else {
        const cost = Number(comp.upgradeCost ?? 0) || 0;
        setTextIfChanged(ref.primaryBtn, `UPGRADE ${formatEndlessNumber(cost)}G`);
        ref.primaryBtn.disabled = !comp.canAffordUpgrade;
        ref.primaryBtn.classList.remove('is-stage-locked');
        ref.deployBtn.classList.remove('hidden');
        ref.deployBtn.classList.toggle('is-deployed', deployed);
        setTextIfChanged(ref.deployBtn, deployed ? 'BENCH' : 'DEPLOY');

        if (ref.promoteBtn) {
          if (promoteQuote) {
            ref.promoteBtn.classList.remove('hidden');
            const isMax = Boolean(promoteQuote.isMaxStar);
            const nextStar = Math.max(star + 1, Math.min(maxStars, Math.floor(Number(promoteQuote.nextStar) || (star + 1))));
            const unlocksAura = Boolean(!isMax && (Number(promoteQuote.unlocksAuraTier) >= 3 || nextStar >= 3));
            const canPromote = Boolean(!isMax && promoteQuote.canPromote);
            ref.promoteBtn.classList.toggle('is-max-star', isMax);
            ref.promoteBtn.classList.toggle('is-ex-ready', unlocksAura);
            ref.promoteBtn.disabled = isMax || !canPromote;

            if (isMax) {
              setTextIfChanged(ref.promoteBtn, `MAX ${maxStars}-STAR`);
              ref.promoteBtn.title = `${comp.name || comp.id} REACHED MAXIMUM ${maxStars}-STAR MYTHIC CROWN`;
            } else {
              const isDust = promoteQuote.payMode === 'dust';
              const costText = isDust
                ? `${formatEndlessNumber(promoteQuote.dustCost || 0)} DUST`
                : `${formatEndlessNumber(promoteQuote.shardsCost || 0)} SHARDS`;
              const cta = resolvePromoteCta(nextStar, promoteQuote);
              setTextIfChanged(ref.promoteBtn, `${cta} (${costText})`);
              const nextAura = resolveCompanionAuraMeta(nextStar, promoteQuote.nextAuraTier || null);
              const auraSuffix = unlocksAura ? ` - UNLOCKS ${nextAura.label}` : '';
              const altTip = `${cta}${auraSuffix} (${formatEndlessNumber(promoteQuote.shardsCost || 0)} SHARDS OR ${formatEndlessNumber(promoteQuote.dustCost || 0)} FORGE DUST)`;
              if (ref.promoteBtn.title !== altTip) ref.promoteBtn.title = altTip;
            }
          } else {
            ref.promoteBtn.classList.add('hidden');
            ref.promoteBtn.classList.remove('is-ex-ready', 'is-max-star');
          }
        }
      }
    }
  }

  _syncStatsTab(state, breakdown = null) {
    const b = breakdown || this._computeDpsBreakdown(state);
    const s = state.stats;

    // Live DPS Breakdown Card
    if (this._refs.dpsFeverPill) {
      const showFever = state.feverGoldMult > 1;
      this._refs.dpsFeverPill.classList.toggle('hidden', !showFever);
      if (showFever) {
        setTextIfChanged(this._refs.dpsFeverPill, `FEVER X${Math.round(state.feverGoldMult)}`);
      }
    }
    if (this._refs.dpsSegHero) this._refs.dpsSegHero.style.width = `${b.heroWidth.toFixed(2)}%`;
    if (this._refs.dpsSegTap) this._refs.dpsSegTap.style.width = `${b.tapWidth.toFixed(2)}%`;
    if (this._refs.dpsSegParty) this._refs.dpsSegParty.style.width = `${b.partyWidth.toFixed(2)}%`;

    setTextIfChanged(this._refs.dpsHeroVal, formatEndlessNumber(b.heroDps));
    setTextIfChanged(this._refs.dpsHeroPct, `${b.heroPct}%`);
    setTextIfChanged(this._refs.dpsTapVal, formatEndlessNumber(b.tapDps));
    setTextIfChanged(this._refs.dpsTapPct, `${b.tapPct}%`);
    setTextIfChanged(this._refs.dpsPartyVal, formatEndlessNumber(b.partyDps));
    setTextIfChanged(this._refs.dpsPartyPct, `${b.partyPct}%`);
    setTextIfChanged(this._refs.dpsTotalVal, formatEndlessNumber(b.totalDps));
    setTextIfChanged(this._refs.dpsGoldSecVal, `${formatEndlessNumber(b.goldPerSec)}/S`);

    // Wave 4: Best-Stage Trophies Card
    const tr = state.bestStageTrophies;
    if (tr && this._refs.trophyBonus) {
      setTextIfChanged(this._refs.trophyBonus, `+${tr.totalBonusPct || 0}% DMG & GOLD`);
      setTextIfChanged(
        this._refs.trophyRank,
        tr.highestTrophy ? `RANK: ${tr.highestTrophy.name}` : `UNLOCKED: 0 (BEST STG ${tr.bestStage})`
      );
      setTextIfChanged(
        this._refs.trophyNext,
        tr.nextTrophy ? `NEXT STG ${tr.nextMilestoneStage}` : 'MAX RANK'
      );
      if (this._refs.trophyList && Array.isArray(tr.trophies)) {
        const displayTrophies = tr.trophies.slice(0, 8);
        const sig = displayTrophies.map((t) => `${t.id}:${t.unlocked ? 1 : 0}`).join('|');
        if (sig !== this._lastTrophySig) {
          this._lastTrophySig = sig;
          this._refs.trophyList.textContent = '';
          for (let i = 0; i < displayTrophies.length; i++) {
            const t = displayTrophies[i];
            const bEl = document.createElement('span');
            bEl.className = t.unlocked ? 'endless-trophy-badge is-unlocked' : 'endless-trophy-badge';
            if (t.unlocked && t.accentHex) {
              bEl.style.borderColor = t.accentHex;
            }
            bEl.textContent = `STG ${t.stage} ${t.name.split(' ')[0]}`;
            bEl.title = `${t.name} (Stage ${t.stage}): ${t.bonusDesc}`;
            this._refs.trophyList.appendChild(bEl);
          }
        }
      }
    }

    setTextIfChanged(this._statRefs.get('stage'), `${state.stage} / BEST ${state.bestStage}`);
    setTextIfChanged(this._statRefs.get('goldPerSec'), `${formatEndlessNumber(b.goldPerSec)}/S`);
    setTextIfChanged(this._statRefs.get('heroDps'), formatEndlessNumber(b.heroDps));
    setTextIfChanged(this._statRefs.get('tapDps'), formatEndlessNumber(b.tapDps));
    setTextIfChanged(this._statRefs.get('companionDps'), formatEndlessNumber(b.partyDps));
    setTextIfChanged(this._statRefs.get('totalDps'), formatEndlessNumber(b.totalDps));
    setTextIfChanged(this._statRefs.get('totalKills'), formatEndlessNumber(state.totalKills));
    setTextIfChanged(this._statRefs.get('bossesSlain'), formatEndlessNumber(state.bossesSlain));
    setTextIfChanged(this._statRefs.get('totalTaps'), formatEndlessNumber(state.totalTaps));
    setTextIfChanged(this._statRefs.get('totalGold'), `${formatEndlessNumber(state.totalGoldEarned)}G`);

    if (s) {
      setTextIfChanged(
        this._statRefs.get('critInfo'),
        `${(s.critChance * 100).toFixed(1)}% / X${s.critMult.toFixed(2)}`
      );
      setTextIfChanged(
        this._statRefs.get('goldMult'),
        `X${s.goldMult.toFixed(2)} / X${s.bossGoldMult.toFixed(2)}`
      );
      const discPct = Math.max(0, (1 - s.costDiscountMult) * 100);
      setTextIfChanged(this._statRefs.get('discountInfo'), `-${discPct.toFixed(1)}%`);
      setTextIfChanged(
        this._statRefs.get('sustainInfo'),
        `${(s.lifestealPct * 100).toFixed(1)}% / +${s.bossTimerBonusSec.toFixed(1)}S`
      );
    }
  }

  unmount() {
    this._clearTransientUiState();
    this._mobileHud?.unmount();
    this._mobileHud = null;
    if (this.root) {
      this.root.textContent = '';
      this.root.classList.add('hidden');
      this.root.classList.remove(
        'is-drawer-open',
        'has-active-party',
        'has-active-synergies',
        'is-trial-active',
        'has-event-alert',
        'has-challenge-boss',
        'has-mobile-popcard'
      );
      if (this._createdRoot && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
    }
    this.root = null;
    this.mounted = false;
    this._iconCanvases = [];
    this._modifierIconEntry = null;
    this._partySlotRefs = [];
    this._formationBtnRefs.clear();
    this._relicRowRefs.clear();
    this._relicSetPillRefs?.clear?.();
    this._companionCardRefs.clear();
    this._artifactRowRefs.clear();
    this._gearSlotRefs.clear();
    this._gearSetPillRefs.clear();
    this._gearBagRowRefs.clear();
    this._buffPillRefs.clear();
    this._trialCardRefs.clear();
    this._tabBtnRefs.clear();
    this._tabPanelRefs.clear();
    this._bulkBtnRefs.clear();
    this._statRefs.clear();
    this._lastHudSynergySig = '';
    this._lastDrawerSynergySig = '';
    this._lastGearInvSig = '';
    this._lastGearSetSig = '';
    this._lastGearEquipSigs.clear();
    this._lastTrophySig = '';
    this._lastResolvedAscension = null;
    this._lastBountyCompleted = false;
    this._lastMerchantUid = null;
    this._lastMerchantOfferType = '';
    this._lastTrialHudIconId = '';
    this._lastTrialResultSig = '';
    this._refs = {};
  }

  destroy() {
    this.setVisible(false);
    this.unmount();
    if (this._vfxFallbackImg) {
      this._vfxFallbackImg.onload = null;
      this._vfxFallbackImg.onerror = null;
      this._vfxFallbackImg = null;
    }
    this._lastSnapshot = null;
    this.manager = null;
  }
}
