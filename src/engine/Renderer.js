import { PixelForge } from './PixelForge.js?v=30fps152';
import { AdventureMapRenderer } from '../adventure/AdventureMapRenderer.js?v=30fps152';
import {
  drawExBayerHalo,
  getExHeroPalette,
  releaseExHaloCache
} from './shaders/exNextGenFX.js?v=30fps152';

const CYAN_FIRE_PAL = ['#0369a1', '#0284c7', '#0ea5e9', '#38bdf8'];
const SOLAR_FIRE_PAL = ['#9a3412', '#ea580c', '#f97316', '#facc15'];
const EMERALD_FIRE_PAL = ['#065f46', '#059669', '#10b981', '#34d399'];
const RADIANT_FIRE_PAL = ['#a16207', '#ca8a04', '#eab308', '#facc15'];
const ABYSSAL_FIRE_PAL = ['#4c1d95', '#7e22ce', '#a855f7', '#e11d48'];
const CHRONO_FIRE_PAL = ['#115e59', '#0d9488', '#14b8a6', '#eab308'];
const FORGE_FIRE_PAL = ['#78350f', '#d97706', '#f59e0b', '#34d399'];
const STORM_FIRE_PAL = ['#312e81', '#4f46e5', '#818cf8', '#38bdf8'];
const CRIMSON_FIRE_PAL = ['#881337', '#be123c', '#f43f5e', '#fbbf24'];
const GLACIAL_FIRE_PAL = ['#0369a1', '#0284c7', '#67e8f9', '#e879f9'];
const NEBULA_FIRE_PAL = ['#3b1f6e', '#a855f7', '#d946ef', '#22d3ee'];
const GLACIAL_WIPE_BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];
const GLACIAL_WIPE_TOOTH_L = [3, 1, 4, 2, 5, 1, 3, 0, 2, 4, 1, 5, 2, 3, 0, 2];
const GLACIAL_WIPE_TOOTH_R = [2, 4, 1, 5, 2, 3, 0, 4, 1, 3, 5, 2, 4, 1, 3, 0];

export const STAGE_ROSTER = [
  { id: 'cathedral', name: 'ECLIPSE CATHEDRAL NAVE', assetKey: 'arenaBg' },
  { id: 'sylvan', name: 'MOONLIT ASTRAL SANCTUARY', assetKey: 'arenaSylvan' },
  { id: 'boneyard', name: 'ABYSSAL NECROPOLIS CITADEL', assetKey: 'arenaBoneyard' },
  { id: 'clocktower', name: 'CELESTIAL CLOCKTOWER OBSERVATORY', assetKey: 'arenaClocktower' }
];

export const ULTIMATE_STAGE_MAP = {
  sanctuary: { id: 'sanctuary', name: 'CELESTIAL SANCTUARY OF JUSTICE', assetKey: 'arenaSanctuary' },
  inferno: { id: 'inferno', name: 'LAYWASTE OF INFERNO', assetKey: 'arenaInferno' },
  shogunate: { id: 'shogunate', name: 'MOONLIT SHOGUNATE CASTLE', assetKey: 'arenaShogunate' },
  shogunate_inferno: {
    id: 'shogunate_inferno',
    name: 'BURNING SHOGUNATE INFERNO',
    assetKey: 'arenaShogunateInferno'
  },
  glacial: {
    id: 'glacial',
    name: 'PERMAFROST AURORA SANCTUM',
    assetKey: 'arenaGlacial'
  },
  shogunate_glacial: {
    id: 'shogunate_glacial',
    name: 'FROZEN SAKURA SHOGUNATE',
    assetKey: 'arenaShogunateGlacial'
  },
  cob_monitor: {
    id: 'cob_monitor',
    name: 'COB-OS: FOURTH WALL TERMINAL',
    assetKey: 'arenaCobMonitor'
  },
  cob_monitor_inferno: {
    id: 'cob_monitor_inferno',
    name: 'COB-OS: OVERHEATED INFERNO TERMINAL',
    assetKey: 'arenaCobMonitorInferno'
  },
  cob_monitor_glacial: {
    id: 'cob_monitor_glacial',
    name: 'COB-OS: CRYO-LOCKED BOREALIS TERMINAL',
    assetKey: 'arenaCobMonitorGlacial'
  }
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    const isCssRotated =
      typeof document !== 'undefined' &&
      Boolean(document.documentElement?.classList?.contains('is-css-rotated-landscape'));
    this.width = isCssRotated ? window.innerHeight : window.innerWidth;
    this.height = isCssRotated ? window.innerWidth : window.innerHeight;
    this.isMobile = this.width < 768 || this.height < 540;
    this.isMobileLandscape = this.isMobile && this.width > this.height;
    this.isMobilePortrait = this.isMobile && !this.isMobileLandscape;

    let savedFullZoom = true;
    let savedZoomMode = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawMode = window.localStorage.getItem('avs_camera_zoom_mode');
        if (rawMode === 'full' || rawMode === 'mid' || rawMode === 'auto') {
          savedZoomMode = rawMode;
        }
        const raw = window.localStorage.getItem('avs_mobile_full_zoom_out');
        if (raw === '0' || raw === 'false') savedFullZoom = false;
      }
    } catch {
      // Ignore storage access errors in restricted webviews
    }
    if (savedZoomMode) {
      this.zoomMode = savedZoomMode;
      this.mobileFullZoomOut = savedZoomMode === 'full';
    } else {
      this.mobileFullZoomOut = savedFullZoom;
      this.zoomMode = this.isMobile ? (savedFullZoom ? 'full' : 'auto') : 'auto';
    }
    this._stageUpperVaultCache = new Map();
    this._cachedHudBottomY = 0;
    this._hudBottomCacheAt = -1;

    this.worldWidth = 1200;
    this.groundY = 520;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.aberration = 0;
    this.hitStopTimer = 0;
    this.ultDim = 0;
    this.ultZoomTimer = 0;
    this.camX = this.worldWidth * 0.5;
    this.camY = this.groundY - 90;
    this.camParallaxX = 0;
    this.camParallaxY = 0;
    this.zoom = 1;
    this.time = 0;
    this._validFighters = [];
    this._activePool = [];
    this._framePool = [];
    this._victoryPool = [];

    // Supreme Finisher Stage Transformation, Whole-Stage Katana Slice, Impact Frame & White-Out Deletion State
    this.trueUltStageOverride = null;
    this.trueUltStageAlpha = 0;
    this.trueUltStageTimer = 0;
    this.permanentStageOverride = null;
    this.cutInSide = 'left';
    this.stageSliceTimer = 0;
    this.stageSliceMaxTimer = 1.08;
    this.stageSliceFromId = null;
    this.stageSliceToId = null;
    this.stageSliceFocusX = 600;
    this.stageSliceFocusY = 420;
    this.stageSliceDir = 1;
    this.glacialWipeTimer = 0;
    this.glacialWipeMaxTimer = 1.38;
    this.glacialWipeFromId = null;
    this.glacialWipeFocusX = 600;
    this.cobWipeTimer = 0;
    this.cobWipeMaxTimer = 1.28;
    this.cobWipeFromId = null;
    this.cobWipeFocusX = 600;
    this.cobAssistTimer = 0;
    this.cobAssistMaxTimer = 0.90;
    this.cobAssistNyxX = 400;
    this.cobAssistTargetX = 800;
    this.impactFrameTimer = 0;
    this.impactFrameMaxTimer = 0.15;
    this.impactFrameFocusX = 600;
    this.impactFrameFocusY = 420;
    this.impactFrameStyle = 'inferno';
    this.whiteoutTimer = 0;
    this.whiteoutMaxTimer = 1.35;
    this.whiteoutFocusX = 600;
    this.whiteoutFocusY = 420;
    this.whiteoutStyle = 'inferno';

    // Select a random default stage ID WITHOUT triggering a stage PNG download on Title boot!
    const initStage = STAGE_ROSTER[Math.floor(Math.random() * STAGE_ROSTER.length)];
    this.stageId = initStage ? initStage.id : 'cathedral';

    this.motes = Array.from({ length: 42 }, (_, i) => ({
      x: (i * 137) % 1300 - 50,
      y: (i * 89) % 520 + 20,
      spdY: 12 + (i % 5) * 4,
      phase: i * 0.7,
      size: i % 3 === 0 ? 4 : 3,
      isBlue: i % 2 === 0
    }));

    this.bakeLightTextures();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _releaseCanvas(c) {
    if (c) {
      c.width = 0;
      c.height = 0;
    }
  }

  releaseStageCutoutCaches(includeAdventure = true) {
    this._releaseCanvas(this.flameOnlyCanvas);
    this._releaseCanvas(this.boneyardFlameCanvas);
    this._releaseCanvas(this.sylvanWaterfallCanvas);
    this._releaseCanvas(this.infernoMagmaCanvas);
    this._releaseCanvas(this.shogunateInfernoFlameCanvas);
    this.flameOnlyCanvas = null;
    this.boneyardFlameCanvas = null;
    this.sylvanWaterfallCanvas = null;
    this.infernoMagmaCanvas = null;
    this.shogunateInfernoFlameCanvas = null;
    if (this._stageUpperVaultCache) {
      for (const c of this._stageUpperVaultCache.values()) {
        this._releaseCanvas(c);
      }
      this._stageUpperVaultCache.clear();
    }
    if (this._stageWingCompositeCache) {
      for (const entry of this._stageWingCompositeCache.values()) {
        this._releaseCanvas(entry?.canvas);
      }
      this._stageWingCompositeCache.clear();
    }
    if (this._avsStageMosaic?.canvas) {
      this._releaseCanvas(this._avsStageMosaic.canvas);
      this._avsStageMosaic = null;
    }
    if (this._avsGodRayCanvas?.canvas) {
      this._releaseCanvas(this._avsGodRayCanvas.canvas);
      this._avsGodRayCanvas = null;
    }
    if (this._godRayGradCache) this._godRayGradCache.clear();
    if (this._sanctuaryRayGradCache) this._sanctuaryRayGradCache.clear();
    releaseExHaloCache();
    if (includeAdventure) {
      AdventureMapRenderer.clearBloomCache?.();
    }
  }

  resetStageOverrides() {
    this.trueUltStageOverride = null;
    this.trueUltStageAlpha = 0;
    this.trueUltStageTimer = 0;
    this.permanentStageOverride = null;
    this.cutInSide = 'left';
    this.stageSliceTimer = 0;
    this.stageSliceFromId = null;
    this.stageSliceToId = null;
    this.glacialWipeTimer = 0;
    this.glacialWipeFromId = null;
    this.cobWipeTimer = 0;
    this.cobWipeFromId = null;
    this.cobAssistTimer = 0;
    this.impactFrameTimer = 0;
    this.whiteoutTimer = 0;
  }

  setStageTransformation(stageKey, alpha = 1.0, permanent = false, holdDuration = 0) {
    let resolvedKey = stageKey;
    const isCurShogunate =
      this.permanentStageOverride === 'shogunate' ||
      this.permanentStageOverride === 'shogunate_inferno' ||
      this.permanentStageOverride === 'shogunate_glacial' ||
      this.stageId === 'shogunate' ||
      this.stageId === 'shogunate_inferno' ||
      this.stageId === 'shogunate_glacial';
    const isCurCobMonitor =
      this.permanentStageOverride === 'cob_monitor' ||
      this.permanentStageOverride === 'cob_monitor_inferno' ||
      this.permanentStageOverride === 'cob_monitor_glacial' ||
      this.stageId === 'cob_monitor' ||
      this.stageId === 'cob_monitor_inferno' ||
      this.stageId === 'cob_monitor_glacial';
    const isCurInferno =
      this.permanentStageOverride === 'inferno' ||
      this.permanentStageOverride === 'shogunate_inferno' ||
      this.permanentStageOverride === 'cob_monitor_inferno' ||
      this.trueUltStageOverride === 'inferno' ||
      this.stageId === 'inferno' ||
      this.stageId === 'shogunate_inferno' ||
      this.stageId === 'cob_monitor_inferno';
    const isCurGlacial =
      this.permanentStageOverride === 'glacial' ||
      this.permanentStageOverride === 'shogunate_glacial' ||
      this.permanentStageOverride === 'cob_monitor_glacial' ||
      this.trueUltStageOverride === 'glacial' ||
      this.stageId === 'glacial' ||
      this.stageId === 'shogunate_glacial' ||
      this.stageId === 'cob_monitor_glacial';

    // Bidirectional 3-Way Elemental Stage Domain Synergy (Ignis Sol <-> Kaze-Maru <-> Lyra <-> Nyx EX Cob):
    // - Ignis Sol's Inferno inside any Shogunate or Cob realm -> `shogunate_inferno` / `cob_monitor_inferno`
    // - Lyra's Glacial inside any Shogunate or Cob realm -> `shogunate_glacial` / `cob_monitor_glacial`
    // - Kaze-Maru's Shogunate slice or Nyx EX's Cob Terminal deploy inside Inferno/Glacial -> fused realm!
    // - Direct Thermal Clash inside fused domains: `inferno` <-> `glacial` melts/refreezes cleanly!
    if (resolvedKey === 'inferno' && isCurShogunate) {
      resolvedKey = 'shogunate_inferno';
    } else if (resolvedKey === 'glacial' && isCurShogunate) {
      resolvedKey = 'shogunate_glacial';
    } else if (resolvedKey === 'inferno' && isCurCobMonitor) {
      resolvedKey = 'cob_monitor_inferno';
    } else if (resolvedKey === 'glacial' && isCurCobMonitor) {
      resolvedKey = 'cob_monitor_glacial';
    } else if (resolvedKey === 'shogunate' && isCurInferno) {
      resolvedKey = 'shogunate_inferno';
    } else if (resolvedKey === 'shogunate' && isCurGlacial) {
      resolvedKey = 'shogunate_glacial';
    } else if (resolvedKey === 'cob_monitor' && isCurInferno) {
      resolvedKey = 'cob_monitor_inferno';
    } else if (resolvedKey === 'cob_monitor' && isCurGlacial) {
      resolvedKey = 'cob_monitor_glacial';
    }

    if (resolvedKey) {
      PixelForge.ensureStageLoaded?.(resolvedKey);
    }
    if (permanent && ULTIMATE_STAGE_MAP[resolvedKey]) {
      this.permanentStageOverride = resolvedKey;
      this.trueUltStageOverride = resolvedKey;
      this.trueUltStageAlpha = 1.0;
      this.trueUltStageTimer = Math.max(this.trueUltStageTimer, holdDuration);
      if (!this.adventureMode && typeof document !== 'undefined') {
        const badgeEl = document.getElementById('hud-stage-badge');
        if (badgeEl) badgeEl.textContent = ULTIMATE_STAGE_MAP[resolvedKey].name;
      }
      if (!this.adventureMode && typeof this.onStageDomainBgm === 'function') {
        const domainBgmKey =
          stageKey === 'inferno'
            ? 'bgm_inferno'
            : String(stageKey).startsWith('shogunate')
              ? 'bgm_shogunate'
              : String(stageKey).startsWith('cob_monitor')
                ? 'bgm_cob_monitor'
                : stageKey === 'glacial' && !isCurShogunate && !isCurCobMonitor
                  ? 'bgm_sanctuary'
                  : null;
        if (domainBgmKey) {
          this.onStageDomainBgm(domainBgmKey, stageKey, resolvedKey);
        }
      }
      return;
    }
    if (!resolvedKey) {
      this.trueUltStageOverride = null;
      this.trueUltStageAlpha = 0;
      this.trueUltStageTimer = 0;
      return;
    }
    this.trueUltStageOverride = resolvedKey;
    this.trueUltStageAlpha = Math.max(0, Math.min(1, alpha));
    if (holdDuration > 0) {
      this.trueUltStageTimer = Math.max(this.trueUltStageTimer, holdDuration);
    }
  }

  triggerDimensionalStageSlice(opts = {}) {
    this.stageSliceFromId = opts.fromStageId || this.getActiveStageId() || this.stageId || 'cathedral';
    this.stageSliceToId = opts.toStageId || 'shogunate';
    PixelForge.ensureStageLoaded?.(this.stageSliceFromId);
    PixelForge.ensureStageLoaded?.(this.stageSliceToId);
    this.stageSliceFocusX = Number.isFinite(opts.focusX) ? opts.focusX : this.worldWidth * 0.5;
    this.stageSliceFocusY = Number.isFinite(opts.focusY) ? opts.focusY : this.groundY - 92;
    this.stageSliceDir = opts.dir === -1 ? -1 : 1;
    this.stageSliceMaxTimer = Math.max(0.35, opts.duration || 1.08);
    this.stageSliceTimer = this.stageSliceMaxTimer;
  }

  triggerGlacialStageTransition(opts = {}) {
    const rawFrom =
      typeof opts.fromStageId === 'string' && opts.fromStageId ? opts.fromStageId : null;
    this.glacialWipeFromId = rawFrom || this.getActiveStageId() || this.stageId || 'cathedral';
    PixelForge.ensureStageLoaded?.(this.glacialWipeFromId);
    const activeDestId = this.getActiveStageId?.();
    if (activeDestId) PixelForge.ensureStageLoaded?.(activeDestId);
    this.glacialWipeFocusX = Number.isFinite(opts.focusX) ? opts.focusX : this.worldWidth * 0.5;
    this.glacialWipeMaxTimer = Math.max(0.35, opts.duration || 1.38);
    this.glacialWipeTimer = this.glacialWipeMaxTimer;
  }

  triggerCobMonitorTransition(opts = {}) {
    const rawFrom =
      typeof opts.fromStageId === 'string' && opts.fromStageId ? opts.fromStageId : null;
    this.cobWipeFromId = rawFrom || this.getActiveStageId() || this.stageId || 'cathedral';
    PixelForge.ensureStageLoaded?.(this.cobWipeFromId);
    const activeDestId = this.getActiveStageId?.();
    PixelForge.ensureStageLoaded?.(activeDestId || 'cob_monitor');
    this.cobWipeFocusX = Number.isFinite(opts.focusX) ? opts.focusX : this.worldWidth * 0.5;
    this.cobWipeMaxTimer = Math.max(0.35, opts.duration || 1.28);
    this.cobWipeTimer = this.cobWipeMaxTimer;
  }

  triggerCobAssistPulse(nyxX, targetX, duration = 0.90) {
    this.cobAssistNyxX = Number.isFinite(nyxX) ? nyxX : this.worldWidth * 0.4;
    this.cobAssistTargetX = Number.isFinite(targetX) ? targetX : this.worldWidth * 0.65;
    this.cobAssistMaxTimer = Math.max(0.25, duration);
    this.cobAssistTimer = this.cobAssistMaxTimer;
  }

  getStageMetaById(id) {
    if (!id) return STAGE_ROSTER[0];
    if (ULTIMATE_STAGE_MAP[id]) return ULTIMATE_STAGE_MAP[id];
    return STAGE_ROSTER.find((s) => s.id === id) || STAGE_ROSTER[0];
  }

  triggerImpactFrame(x, y, duration = 0.15, style = 'inferno') {
    this.impactFrameFocusX = Number.isFinite(x) ? x : this.worldWidth * 0.5;
    this.impactFrameFocusY = Number.isFinite(y) ? y : this.groundY - 95;
    this.impactFrameMaxTimer = Math.max(0.06, duration);
    this.impactFrameTimer = this.impactFrameMaxTimer;
    this.impactFrameStyle = style;
  }

  triggerWhiteoutDeletion(x, y, duration = 1.35, style = 'inferno') {
    this.whiteoutFocusX = Number.isFinite(x) ? x : this.worldWidth * 0.5;
    this.whiteoutFocusY = Number.isFinite(y) ? y : this.groundY - 60;
    this.whiteoutMaxTimer = Math.max(0.25, duration);
    this.whiteoutTimer = this.whiteoutMaxTimer;
    this.whiteoutStyle = style;
  }

  getActiveStageId() {
    if (this.permanentStageOverride) return this.permanentStageOverride;
    if (this.trueUltStageAlpha > 0.35 && this.trueUltStageOverride) return this.trueUltStageOverride;
    if (this.adventureMode) {
      if (this.camX >= 3600) return 'inferno';
      if (this.camX >= 2400) return 'boneyard';
      if (this.camX >= 1200) return 'sylvan';
      return 'cathedral';
    }
    return this.stageId;
  }

  pickRandomStage(forcedStage = null) {
    this.resetStageOverrides();
    if (
      forcedStage &&
      (STAGE_ROSTER.some((s) => s.id === forcedStage) || Boolean(ULTIMATE_STAGE_MAP[forcedStage]))
    ) {
      this.stageId = forcedStage;
      PixelForge.ensureStageLoaded?.(this.stageId);
      return this.stageId;
    }
    const candidates = STAGE_ROSTER.filter((s) => s.id !== this.stageId);
    const pool = candidates.length > 0 ? candidates : STAGE_ROSTER;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.stageId = chosen.id;
    PixelForge.ensureStageLoaded?.(this.stageId);
    return this.stageId;
  }

  getCurrentStageMeta() {
    if (this.permanentStageOverride && ULTIMATE_STAGE_MAP[this.permanentStageOverride]) {
      return ULTIMATE_STAGE_MAP[this.permanentStageOverride];
    }
    if (ULTIMATE_STAGE_MAP[this.stageId]) {
      return ULTIMATE_STAGE_MAP[this.stageId];
    }
    return STAGE_ROSTER.find((s) => s.id === this.stageId) || STAGE_ROSTER[0];
  }

  bakeLightTextures() {
    const makeGlow = (rgbaHot, rgbaMid, rgbaOuter) => {
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = 160;
      const gCtx = c.getContext('2d');
      const g = gCtx.createRadialGradient(80, 80, 2, 80, 80, 80);
      g.addColorStop(0, rgbaHot);
      g.addColorStop(0.32, rgbaMid);
      g.addColorStop(0.68, rgbaOuter);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      gCtx.fillStyle = g;
      gCtx.fillRect(0, 0, 160, 160);
      return c;
    };
    // Rich, deeply saturated jewel-tone radial bloom textures (no white center stop so additive passes never wash out!)
    this.glowWhite = makeGlow(
      'rgba(255,255,255,0.92)',
      'rgba(224,242,254,0.62)',
      'rgba(56,189,248,0.24)'
    );
    this.glowCyan = makeGlow(
      'rgba(56,189,248,0.85)',
      'rgba(14,165,233,0.56)',
      'rgba(2,132,199,0.22)'
    );
    this.glowOrange = makeGlow(
      'rgba(251,146,60,0.86)',
      'rgba(234,88,12,0.58)',
      'rgba(180,83,9,0.24)'
    );
    this.glowEmerald = makeGlow(
      'rgba(52,211,153,0.85)',
      'rgba(16,185,129,0.56)',
      'rgba(5,150,105,0.22)'
    );
    this.glowGold = makeGlow(
      'rgba(250,204,21,0.85)',
      'rgba(234,179,8,0.56)',
      'rgba(161,98,7,0.22)'
    );
    this.glowViolet = makeGlow(
      'rgba(192,132,252,0.86)',
      'rgba(147,51,234,0.58)',
      'rgba(107,33,168,0.24)'
    );
    this.glowTeal = makeGlow(
      'rgba(45,212,191,0.85)',
      'rgba(20,184,166,0.56)',
      'rgba(13,148,136,0.22)'
    );
    this.glowIndigo = makeGlow(
      'rgba(129,140,248,0.86)',
      'rgba(99,102,241,0.58)',
      'rgba(67,56,202,0.24)'
    );
    this.glowCrimson = makeGlow(
      'rgba(244,63,94,0.86)',
      'rgba(225,29,72,0.58)',
      'rgba(159,18,57,0.24)'
    );
    this.glowGlacial = makeGlow(
      'rgba(103,232,249,0.88)',
      'rgba(56,189,248,0.58)',
      'rgba(168,85,247,0.26)'
    );
    this.glowCyber = makeGlow(
      'rgba(0,240,255,0.88)',
      'rgba(255,46,147,0.56)',
      'rgba(22,34,86,0.26)'
    );
    this.shadowTex = makeGlow('rgba(0,0,0,0.92)', 'rgba(0,0,0,0.52)', 'rgba(0,0,0,0.18)');
  }

  getGlowForColor(col) {
    if (!col) return this.glowCyan;
    if (
      col === 'cyber' ||
      col === '#00f0ff' ||
      col === '#22d3ee' ||
      col === '#ff2e93' ||
      col === '#7df9ff'
    ) {
      return this.glowCyber || this.glowCyan;
    }
    if (col === 'glacial' || col === '#67e8f9' || col === '#a5f3fc') {
      return this.glowGlacial || this.glowCyan;
    }
    if (col === 'emerald' || col === '#10b981' || col === '#34d399' || col === '#6ee7b7' || col === '#a7f3d0') {
      return this.glowEmerald;
    }
    if (col === 'storm' || col === '#818cf8' || col === '#6366f1' || col === '#a5b4fc') {
      return this.glowIndigo || this.glowCyan;
    }
    if (col === 'crimson' || col === '#f43f5e' || col === '#be123c' || col === '#e11d48' || col === '#fda4af') {
      return this.glowCrimson || this.glowOrange;
    }
    if (col === 'arcane' || col === '#f97316' || col === '#fb923c' || col === '#dc2626' || col === '#ea580c') {
      return this.glowOrange;
    }
    if (
      col === 'radiant' ||
      col === 'forge' ||
      col === '#fde047' ||
      col === '#facc15' ||
      col === '#eab308' ||
      col === '#f59e0b' ||
      col === '#fbbf24' ||
      col === '#d97706' ||
      col === '#fef08a'
    ) {
      return this.glowGold;
    }
    if (
      col === 'abyssal' ||
      col === '#c084fc' ||
      col === '#9333ea' ||
      col === '#7e22ce' ||
      col === '#e879f9' ||
      col === '#d946ef' ||
      col === '#a855f7'
    ) {
      return this.glowViolet;
    }
    if (col === 'chrono' || col === '#2dd4bf' || col === '#99f6e4' || col === '#14b8a6') {
      return this.glowTeal;
    }
    return this.glowCyan;
  }

  getDesktopFixedZoom(colossalBoss = false) {
    if (this.adventureMode) {
      const minSafe = Math.max(this.width / 2200, this.height / 1180, 0.52);
      const fit = Math.min(
        this.width / (colossalBoss ? 2040 : 1880),
        this.height / (colossalBoss ? 1120 : 1040)
      );
      return Math.max(minSafe, Math.min(0.72, fit));
    }
    const minSafe = Math.max(this.width / 1888, (this.height * 0.68) / 760, 0.68);
    const fit = Math.min(this.width / 1680, this.height / 940);
    return Math.max(minSafe, Math.min(0.84, fit));
  }

  getDesktopMidZoom(colossalBoss = false) {
    const full = this.getDesktopFixedZoom(colossalBoss);
    if (this.adventureMode) {
      const fit = Math.min(this.width / 1720, this.height / 975);
      return Math.max(full + 0.04, Math.min(0.76, fit));
    }
    const fit = Math.min(this.width / 1450, this.height / 810);
    return Math.max(full + 0.08, Math.min(1.02, fit));
  }

  getMobileLandscapeFixedZoom(colossalBoss = false) {
    if (this.adventureMode) {
      const fullStageW = 1760;
      const fullStageH = 880;
      const baseWide = Math.max(0.38, Math.min(this.width / fullStageW, this.height / fullStageH));
      return colossalBoss ? Math.min(baseWide, 0.44) : baseWide;
    }
    const fullStageW = 1360;
    const fullStageH = 690;
    const baseWide = Math.max(0.46, Math.min(this.width / fullStageW, this.height / fullStageH));
    return colossalBoss ? Math.min(baseWide, 0.52) : baseWide;
  }

  getMobilePortraitFixedZoom(colossalBoss = false) {
    if (this.adventureMode) {
      const fullStageW = colossalBoss ? 1720 : 1600;
      return Math.max(0.21, Math.min(0.46, this.width / fullStageW));
    }
    return Math.max(0.26, Math.min(0.46, this.width / 1260));
  }

  getMobileMidZoom(colossalBoss = false) {
    if (this.isMobileLandscape) {
      if (this.adventureMode) {
        const baseMid = Math.max(0.46, Math.min(0.60, Math.min(this.width / 1580, this.height / 750)));
        return colossalBoss ? Math.min(baseMid, 0.49) : baseMid;
      }
      const baseMid = Math.max(0.58, Math.min(0.76, Math.min(this.width / 1240, this.height / 580)));
      return colossalBoss ? Math.min(baseMid, 0.62) : baseMid;
    }
    if (this.adventureMode) {
      const midW = colossalBoss ? 1240 : 1145;
      return Math.max(0.28, Math.min(0.40, this.width / midW));
    }
    return Math.max(0.35, Math.min(0.50, this.width / 925));
  }

  getFixedZoomForMode(mode = this.zoomMode, colossalBoss = false) {
    if (mode === 'full') {
      if (this.isMobileLandscape) return this.getMobileLandscapeFixedZoom(colossalBoss);
      if (this.isMobilePortrait) return this.getMobilePortraitFixedZoom(colossalBoss);
      return this.getDesktopFixedZoom(colossalBoss);
    }
    if (mode === 'mid') {
      if (this.isMobile) return this.getMobileMidZoom(colossalBoss);
      return this.getDesktopMidZoom(colossalBoss);
    }
    return null;
  }

  getInitialMatchZoom() {
    const fixed = this.getFixedZoomForMode(this.zoomMode, false);
    if (fixed !== null) return fixed;
    if (this.adventureMode) {
      return this.isMobile ? Math.max(0.46, Math.min(0.68, this.width / 980)) : 0.76;
    }
    return this.isMobile ? Math.max(0.58, Math.min(0.85, this.width / 780)) : 1.0;
  }

  setZoomMode(mode, persist = true) {
    const next = mode === 'full' || mode === 'mid' || mode === 'auto' ? mode : 'auto';
    this.zoomMode = next;
    this.mobileFullZoomOut = next === 'full';
    if (persist) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('avs_camera_zoom_mode', next);
          if (this.isMobile) {
            window.localStorage.setItem('avs_mobile_full_zoom_out', this.mobileFullZoomOut ? '1' : '0');
          }
        }
      } catch {
        // Ignore storage access errors in restricted webviews
      }
    }
    this.zoom = this.getInitialMatchZoom();
    return this.zoomMode;
  }

  cycleZoomMode(persist = true) {
    const order = ['full', 'mid', 'auto'];
    const idx = order.indexOf(this.zoomMode);
    const next = order[(idx + 1) % order.length];
    return this.setZoomMode(next, persist);
  }

  setMobileFullZoomOut(enabled) {
    this.mobileFullZoomOut = Boolean(enabled);
    this.zoomMode = this.mobileFullZoomOut ? 'full' : 'auto';
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('avs_mobile_full_zoom_out', this.mobileFullZoomOut ? '1' : '0');
        if (window.localStorage.getItem('avs_camera_zoom_mode') !== null) {
          window.localStorage.setItem('avs_camera_zoom_mode', this.zoomMode);
        }
      }
    } catch {
      // Ignore storage access errors in restricted webviews
    }
    this.zoom = this.getInitialMatchZoom();
  }

  getHudBottomY() {
    const fallback = this.isMobilePortrait ? 142 : this.isMobileLandscape ? 84 : 104;
    const nowSec =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now() * 0.001
        : this.time || 0;
    if (this._hudBottomCacheAt >= 0 && nowSec - this._hudBottomCacheAt < 0.25) {
      return this._cachedHudBottomY > 20 ? this._cachedHudBottomY : fallback;
    }
    let measured = 0;
    try {
      if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
        const el = document.querySelector('.hud-top');
        if (el) {
          const val = (Number(el.offsetTop) || 0) + (Number(el.offsetHeight) || 0);
          if (Number.isFinite(val) && val > 20) {
            measured = Math.round(val);
          }
        }
      }
    } catch {
      // Ignore DOM measurement errors in headless environments
    }
    this._cachedHudBottomY = measured;
    this._hudBottomCacheAt = nowSec;
    return measured > 20 ? measured : fallback;
  }

  resize() {
    this._cachedHudBottomY = 0;
    this._hudBottomCacheAt = -1;
    const isCssRotated =
      typeof document !== 'undefined' &&
      Boolean(document.documentElement?.classList?.contains('is-css-rotated-landscape'));
    this.width = isCssRotated ? window.innerHeight : window.innerWidth;
    this.height = isCssRotated ? window.innerWidth : window.innerHeight;
    const wasMobile = this.isMobile;
    this.isMobile = this.width < 768 || this.height < 540;
    this.isMobileLandscape = this.isMobile && this.width > this.height;
    this.isMobilePortrait = this.isMobile && !this.isMobileLandscape;
    if (wasMobile !== this.isMobile) {
      let hasExplicitMode = false;
      try {
        hasExplicitMode =
          typeof window !== 'undefined' &&
          Boolean(window.localStorage?.getItem('avs_camera_zoom_mode'));
      } catch {
        hasExplicitMode = false;
      }
      if (!hasExplicitMode) {
        this.zoomMode = this.isMobile ? (this.mobileFullZoomOut ? 'full' : 'auto') : 'auto';
      }
    }
    const fixedOnResize = this.getFixedZoomForMode(this.zoomMode, false);
    if (fixedOnResize !== null) {
      this.zoom = fixedOnResize;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  triggerShake(intensity = 4, duration = 0.14) {
    // Scale down and cap at a subtle 3.2px micro-thud so the screen never jitters violently
    const scaled = Math.min(3.2, intensity * 0.14);
    this.shakeIntensity = Math.min(3.2, Math.max(this.shakeIntensity, scaled));
    this.shakeTime = Math.min(0.22, Math.max(this.shakeTime, duration * 0.45));
  }

  triggerAberration(amount = 4) {
    if (!this.isMobile) this.aberration = Math.min(4, Math.max(this.aberration, amount * 0.35));
  }

  triggerHitStop(duration = 0.04) {
    this.hitStopTimer = Math.max(this.hitStopTimer, Math.min(0.05, duration));
  }

  triggerUltimateCamera(focusX, focusY) {
    this.ultFocusX = focusX;
    this.ultFocusY = focusY;
    this.ultZoomTimer = 0.75;
    this.ultDim = 0.65;
  }

  triggerUltimateCutIn(caster, isTrueUlt = false) {
    const isEx = Boolean(caster?.heroId && String(caster.heroId).endsWith('_ex'));
    this.cutInTimer = isTrueUlt ? 2.10 : 1.55;
    this.cutInMaxTimer = isTrueUlt ? 2.10 : 1.55;
    this.cutInHeroId = caster.heroId || 'warrior';
    this.cutInIsEx = isEx;
    this.cutInIsTrueUlt = Boolean(isTrueUlt);
    this.cutInName = caster.name || 'CHAMPION';
    this.cutInUltName = isTrueUlt
      ? caster.trueUltName || 'CELESTIAL SWORD OF JUSTICE'
      : caster.ultName || 'ULTIMATE ART';
    this.cutInEyebrow = isEx
      ? isTrueUlt
        ? `${(caster.name || 'CHAMPION').toUpperCase()} • EX SUPREME FINISHER`
        : `${(caster.name || 'CHAMPION').toUpperCase()} • NEO-VISION AWAKENING`
      : isTrueUlt
        ? `${(caster.name || 'CHAMPION').toUpperCase()} • SUPREME ULTIMATE FINISHER`
        : `${(caster.name || 'CHAMPION').toUpperCase()} • OVERDRIVE ART`;
    this.cutInColor = caster.primaryColor || '#38bdf8';
    this.cutInFacing = caster.facing || 1;
    this.cutInSide =
      caster?.team === 2 ||
      caster?.team === 'right' ||
      (!caster?.team && (caster?.facing || 1) < 0)
        ? 'right'
        : 'left';
  }

  triggerKOFinisher(x, y, color = '#facc15', winnerName = '', winnerHeroId = 'warrior') {
    this.koFocusX = x;
    this.koFocusY = y;
    this.koZoomTimer = 1.95;
    this.koMaxTimer = 1.95;
    this.koColor = color;
    this.koWinnerName = winnerName;
    this.koWinnerHeroId = winnerHeroId;
    this.ultDim = Math.max(this.ultDim, 0.56);
  }

  triggerClashCamera(x, y, hero1 = 'warrior', hero2 = 'mage', col1 = '#38bdf8', col2 = '#fb923c') {
    this.clashFocusX = x;
    this.clashFocusY = y;
    this.clashZoomTimer = 0.55;
    this.clashMaxTimer = 0.55;
    this.clashHero1 = hero1;
    this.clashHero2 = hero2;
    this.clashCol1 = col1;
    this.clashCol2 = col2;
    this.triggerAberration(5);
    this.triggerShake(6, 0.16);
  }

  triggerStageEvent(title, subtitle, color = '#facc15', duration = 10.0) {
    this.stageEventTimer = duration;
    this.stageEventBannerTimer = 3.8;
    this.stageEventMaxBannerTimer = 3.8;
    this.stageEventTitle = title;
    this.stageEventSubtitle = subtitle;
    this.stageEventColor = color;
  }

  update(rawDt, fighters) {
    this.time += rawDt;
    if (this.hitStopTimer > 0) this.hitStopTimer = Math.max(0, this.hitStopTimer - rawDt);
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - rawDt);
      // Fast exponential decay so shake settles almost immediately instead of lingering
      this.shakeIntensity *= Math.exp(-rawDt * 22);
      if (this.shakeTime === 0 || this.shakeIntensity < 0.15) {
        this.shakeTime = 0;
        this.shakeIntensity = 0;
      }
    }
    if (this.aberration > 0) this.aberration = Math.max(0, this.aberration - rawDt * 28);
    if (this.ultDim > 0) this.ultDim = Math.max(0, this.ultDim - rawDt * 0.75);
    if (this.ultZoomTimer > 0) this.ultZoomTimer = Math.max(0, this.ultZoomTimer - rawDt);
    if (this.cutInTimer > 0) this.cutInTimer = Math.max(0, this.cutInTimer - rawDt);
    if (this.koZoomTimer > 0) this.koZoomTimer = Math.max(0, this.koZoomTimer - rawDt);
    if (this.clashZoomTimer > 0) this.clashZoomTimer = Math.max(0, this.clashZoomTimer - rawDt);
    if (this.stageEventTimer > 0) this.stageEventTimer = Math.max(0, this.stageEventTimer - rawDt);
    if (this.stageEventBannerTimer > 0) {
      this.stageEventBannerTimer = Math.max(0, this.stageEventBannerTimer - rawDt);
    }
    if (this.impactFrameTimer > 0) {
      this.impactFrameTimer = Math.max(0, this.impactFrameTimer - rawDt);
    }
    if (this.whiteoutTimer > 0) {
      this.whiteoutTimer = Math.max(0, this.whiteoutTimer - rawDt);
    }
    if (this.stageSliceTimer > 0) {
      this.stageSliceTimer = Math.max(0, this.stageSliceTimer - rawDt);
    }
    if (this.glacialWipeTimer > 0) {
      this.glacialWipeTimer = Math.max(0, this.glacialWipeTimer - rawDt);
      if (this.glacialWipeTimer === 0) {
        this.glacialWipeFromId = null;
      }
    }
    if (this.cobWipeTimer > 0) {
      this.cobWipeTimer = Math.max(0, this.cobWipeTimer - rawDt);
      if (this.cobWipeTimer === 0) {
        this.cobWipeFromId = null;
      }
    }
    if (this.cobAssistTimer > 0) {
      this.cobAssistTimer = Math.max(0, this.cobAssistTimer - rawDt);
    }
    if (this.trueUltStageTimer > 0) {
      this.trueUltStageTimer = Math.max(0, this.trueUltStageTimer - rawDt);
      if (!this.permanentStageOverride) {
        if (this.trueUltStageTimer < 0.85) {
          this.trueUltStageAlpha = Math.min(this.trueUltStageAlpha, Math.max(0, this.trueUltStageTimer / 0.85));
        }
        if (this.trueUltStageTimer === 0) {
          this.trueUltStageOverride = null;
          this.trueUltStageAlpha = 0;
        }
      }
    }

    if (!Number.isFinite(this.zoom) || this.zoom <= 0) this.zoom = 1;
    if (!Number.isFinite(this.camX)) this.camX = this.worldWidth * 0.5;
    if (!Number.isFinite(this.camY)) this.camY = this.groundY - 95;

    const validFighters = this._validFighters;
    validFighters.length = 0;
    if (Array.isArray(fighters)) {
      for (let i = 0; i < fighters.length; i++) {
        const f = fighters[i];
        if (f && Number.isFinite(f.x) && Number.isFinite(f.y)) {
          validFighters.push(f);
        }
      }
    }

    if (validFighters.length >= 1) {
      const activePool = this._activePool;
      activePool.length = 0;
      for (let i = 0; i < validFighters.length; i++) {
        const f = validFighters[i];
        if (!f.isBenched && (!f.isDead || (f.deathTimer || 0) < 2.8)) {
          activePool.push(f);
        }
      }
      const pool = activePool.length > 0 ? activePool : validFighters;
      let player = null;
      if (this.adventureMode) {
        for (let i = 0; i < pool.length; i++) {
          if (pool[i].team === 1) {
            player = pool[i];
            break;
          }
        }
        if (!player) player = pool[0];
      }
      let framePool = pool;
      if (this.adventureMode && player) {
        framePool = this._framePool;
        framePool.length = 0;
        for (let i = 0; i < pool.length; i++) {
          const f = pool[i];
          if (f === player || f.isColossalBoss || Math.abs(f.x - player.x) <= 920) {
            framePool.push(f);
          }
        }
        if (framePool.length === 0) framePool = pool;
      }
      let colossalBoss = null;
      if (this.adventureMode) {
        for (let i = 0; i < framePool.length; i++) {
          const f = framePool[i];
          if (f.isColossalBoss && (!f.isDead || (f.deathTimer || 0) < 2.38)) {
            colossalBoss = f;
            break;
          }
        }
      }

      let minX = framePool[0].x;
      let maxX = framePool[0].x;
      let maxAirLift = 0;
      let maxSkyFocus = 0;
      for (let i = 0; i < framePool.length; i++) {
        const f = framePool[i];
        if (f.x < minX) minX = f.x;
        if (f.x > maxX) maxX = f.x;
        const fGy = Number.isFinite(f.groundY) ? f.groundY : this.groundY;
        const lift = Math.max(0, fGy - f.y);
        if (lift > maxAirLift) maxAirLift = lift;
        const skyFocus = Math.max(0, f.cameraAirLift || 0);
        if (skyFocus > maxSkyFocus) maxSkyFocus = skyFocus;
      }
      if (colossalBoss) {
        const bossRightEdge = (colossalBoss.anchorX || colossalBoss.x) + 195;
        if (bossRightEdge > maxX) maxX = bossRightEdge;
        const leftEdge = Math.min(player ? player.x - 110 : 8820, 8820);
        if (leftEdge < minX) minX = leftEdge;
      }
      const midX =
        this.adventureMode && player
          ? colossalBoss
            ? ((colossalBoss.anchorX || colossalBoss.x) + 185 + (player.x - 95)) * 0.5
            : framePool.length > 1
              ? player.x * 0.56 + ((minX + maxX) * 0.5) * 0.44
              : player.x + player.facing * 95
          : (minX + maxX) * 0.5;
      const rawHorizSpan =
        Math.abs(maxX - minX) + (colossalBoss ? 180 : validFighters.length > 2 ? 380 : 340);
      const horizSpan = this.adventureMode
        ? Math.min(1680, Math.max(1160, rawHorizSpan + 240))
        : rawHorizSpan;
      const dist = Math.max(horizSpan, maxAirLift * 1.48 + 340);

      const fixedZoomVal = this.getFixedZoomForMode(this.zoomMode, Boolean(colossalBoss));
      const isFixedZoomMode = fixedZoomVal !== null;
      let targetZoom;
      if (isFixedZoomMode) {
        targetZoom = fixedZoomVal;
      } else if (this.adventureMode) {
        const maxSpanW = 1740;
        const fitScaleX = this.width / Math.max(620, Math.min(maxSpanW, dist));
        const fitScaleY = this.isMobileLandscape ? this.height / 575 : this.height / 940;
        targetZoom = Math.min(fitScaleX, fitScaleY);
        const minZoomCap = colossalBoss ? 0.42 : this.isMobileLandscape ? 0.58 : 0.44;
        const maxZoomCap = this.isMobile ? 0.68 : 0.80;
        targetZoom = Math.max(minZoomCap, Math.min(maxZoomCap, targetZoom));
      } else {
        const maxSpanW = this.worldWidth;
        const fitScaleX = this.width / Math.max(620, Math.min(maxSpanW, dist));
        const fitScaleY = this.isMobileLandscape ? this.height / 470 : this.height / 720;
        targetZoom = Math.min(fitScaleX, fitScaleY * 1.15);
        const minZoomCap = colossalBoss ? 0.48 : this.isMobileLandscape ? 0.74 : 0.52;
        const maxZoomCap = this.isMobile ? 0.85 : 1.12;
        targetZoom = Math.max(minZoomCap, Math.min(maxZoomCap, targetZoom));
      }

      const anchorGroundY =
        this.adventureMode && player && Number.isFinite(player.groundY)
          ? player.groundY * 0.46 + 561 * 0.54
          : this.adventureMode
            ? 561
            : this.groundY;
      let targetX = midX;
      let targetY =
        anchorGroundY - (colossalBoss ? 112 : 95) - Math.min(285, maxAirLift * 0.62);

      // Wide-cosmos framing for grounded celestial finishers (e.g. Ignis Sol's Heavensfall Meteor)
      // Keeps the arena floor (`groundY`) visible near the bottom while revealing `groundY - 720+` high in the sky!
      if (maxSkyFocus > 0) {
        if (!isFixedZoomMode) {
          const skyZoom = Math.max(0.66, (this.height * 0.80) / Math.max(500, maxSkyFocus + 165));
          targetZoom = Math.min(targetZoom, skyZoom);
        }
        const skyTargetY = anchorGroundY - Math.min(242, 95 + maxSkyFocus * 0.22);
        targetY = Math.min(targetY, skyTargetY);
      }

      if (this.koZoomTimer > 0) {
        // Dramatic K.O. Finisher focus (skip zoom-in when Zoom Mode is fixed at FULL or MID)
        if (!isFixedZoomMode) {
          targetZoom *= 1.12;
        }
        if (Number.isFinite(this.koFocusX)) {
          targetX = midX * 0.45 + this.koFocusX * 0.55;
        }
      } else if (this.clashZoomTimer > 0 && !isFixedZoomMode) {
        targetZoom *= 1.045;
      } else if (this.ultZoomTimer > 0 && maxSkyFocus <= 0 && !isFixedZoomMode) {
        // Gentle 2.5% cinematic breathe without jerking the camera away from the arena center
        targetZoom *= 1.025;
      }

      // Cinematic Winner Camera Framing during Victory Pose (`f.state === 'VICTORY'`)
      const victoryFighters = this._victoryPool;
      victoryFighters.length = 0;
      for (let i = 0; i < pool.length; i++) {
        const f = pool[i];
        if (!f.isBenched && !f.isDead && f.state === 'VICTORY') {
          victoryFighters.push(f);
        }
      }
      const holdColossalDeath = Boolean(
        colossalBoss && colossalBoss.isDead && (colossalBoss.deathTimer || 0) < 2.38
      );
      if (victoryFighters.length > 0 && (this.koZoomTimer || 0) <= 0.85 && !holdColossalDeath) {
        let winSumX = 0;
        for (let i = 0; i < victoryFighters.length; i++) winSumX += victoryFighters[i].x;
        const winMidX = winSumX / victoryFighters.length;
        targetX = targetX * 0.20 + winMidX * 0.80;
        if (!isFixedZoomMode) {
          const winZoomCap = this.isMobile ? 0.88 : 1.15;
          targetZoom = Math.max(0.52, Math.min(winZoomCap, targetZoom * 1.08));
        }
      }

      const halfViewW = (this.width * 0.5) / targetZoom;
      if (this.adventureMode && colossalBoss && player) {
        targetX = Math.max(targetX, player.x + 85 - halfViewW);
      }
      if (this.adventureMode) {
        const camMin = Number.isFinite(this.adventureCamMinX) ? this.adventureCamMinX : 0;
        const camMax = Number.isFinite(this.adventureCamMaxX)
          ? this.adventureCamMaxX
          : this.worldWidth;
        if (camMax - camMin > halfViewW * 2) {
          targetX = Math.max(camMin + halfViewW, Math.min(camMax - halfViewW, targetX));
        } else {
          targetX = (camMin + camMax) * 0.5;
        }
      } else {
        // Clamp camera X & Y so the viewport stays strictly inside the enlarged 1920-wide (3x integer) arena diorama
        const bgLeft = (this.worldWidth - 1920) * 0.5 + 16;
        const bgRight = (this.worldWidth + 1920) * 0.5 - 16;
        if (bgRight - bgLeft > halfViewW * 2) {
          targetX = Math.max(bgLeft + halfViewW, Math.min(bgRight - halfViewW, targetX));
        } else {
          targetX = this.worldWidth * 0.5;
        }
        const anchorFrac = this.isMobileLandscape
          ? 0.67
          : this.isMobilePortrait
            ? 0.56
            : this.isMobile
              ? 0.64
              : 0.68;
        const topSpan = (this.height * anchorFrac) / targetZoom;
        const botSpan = (this.height * (1 - anchorFrac)) / targetZoom;
        const minCamY = this.groundY - 1180 + topSpan;
        const maxCamY = this.groundY + 690 - botSpan;
        if (maxCamY >= minCamY) {
          targetY = Math.max(minCamY, Math.min(maxCamY, targetY));
        }
      }

      const camSpeed = maxSkyFocus > 0 ? 7.5 : this.adventureMode ? 7.0 : 6;
      const lerpFactor = Math.min(1, Math.max(0, rawDt * camSpeed));
      if (isFixedZoomMode) {
        this.zoom = targetZoom;
      } else {
        this.zoom += (targetZoom - this.zoom) * lerpFactor;
      }
      this.camX += (targetX - this.camX) * lerpFactor;
      this.camY += (targetY - this.camY) * lerpFactor;
    }

    this.camParallaxX = this.adventureMode
      ? Math.sin(this.camX * (Math.PI / 900)) * 220
      : this.camX - this.worldWidth * 0.5;
    this.camParallaxY = this.camY - (this.groundY - 95);
  }

  render(fighters, vfx) {
    const ctx = this.ctx;
    const ww = this.worldWidth;
    const gy = this.groundY;

    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();

    const sx =
      this.shakeTime > 0 ? Math.round(Math.sin(this.time * 45) * this.shakeIntensity * 0.6) : 0;
    const sy =
      this.shakeTime > 0 ? Math.round(Math.cos(this.time * 38) * this.shakeIntensity) : 0;

    const screenAnchorY = Math.round(
      this.height *
        (this.isMobileLandscape
          ? this.adventureMode
            ? 0.63
            : 0.67
          : this.isMobilePortrait
            ? this.adventureMode
              ? 0.54
              : 0.56
            : this.adventureMode && this.isMobile
              ? 0.58
              : this.isMobile
                ? 0.64
                : 0.68)
    );
    const safeZoom = Math.max(0.1, this.zoom || 1);
    const snappedCamX = Math.round(this.camX * safeZoom) / safeZoom;
    const snappedCamY = Math.round(this.camY * safeZoom) / safeZoom;
    ctx.translate(Math.round(this.width * 0.5) + sx, screenAnchorY + sy);
    ctx.scale(safeZoom, safeZoom);
    ctx.translate(-snappedCamX, -snappedCamY);

    // 1. HD-2D Pixel-Art Cathedral Diorama + Live Animated Stage Flames & Atmospheric Blooms
    this.drawHD2DArena(ctx, ww, gy);
    this.drawVolumetricGodRays(ctx, ww, gy);
    if (this.stageEventTimer > 0) {
      this.drawStagePhenomenonWorld(ctx, ww, gy);
    }

    if (this.ultDim > 0.01) {
      ctx.fillStyle = `rgba(2, 3, 10, ${this.ultDim * 0.78})`;
      ctx.fillRect(-4000, -3000, ww + 8000, 6000);
      this.drawUltimateAwakeningWorld(ctx, gy);
    }

    // 2. Ground Scorch & Fissures
    vfx.renderGroundDecals(ctx, gy, this);

    // 3. Real-Time Pixel-Art Stage-Aware Floor Reflections
    const activeStageForRefl = this.getActiveStageId();
    const reflAlpha =
      activeStageForRefl === 'inferno' || activeStageForRefl === 'shogunate_inferno'
        ? 0.16
        : activeStageForRefl === 'cob_monitor_inferno'
          ? 0.20
          : activeStageForRefl === 'glacial' || activeStageForRefl === 'shogunate_glacial'
            ? 0.32
            : activeStageForRefl === 'cob_monitor_glacial'
              ? 0.33
              : activeStageForRefl === 'cob_monitor'
                ? 0.30
                : activeStageForRefl === 'sylvan' ||
                    activeStageForRefl === 'sanctuary' ||
                    activeStageForRefl === 'cathedral' ||
                    activeStageForRefl === 'shogunate'
                  ? 0.28
                  : 0.24;
    if (this.adventureMode) {
      // Per-fighter local stone-road sheen anchored to each entity's own 2.5D depth `f.groundY` (frustum-culled!)
      const reflHalfW = (this.width * 0.5) / safeZoom + 260;
      for (const f of fighters) {
        if (f.isBenched || f.isFullyBurrowed || f.isColossalBoss) continue;
        if (Number.isFinite(this.camX) && Math.abs(f.x - this.camX) > reflHalfW) continue;
        const fGy = Number.isFinite(f.groundY) ? f.groundY : gy;
        ctx.save();
        ctx.beginPath();
        ctx.rect(f.x - 160, fGy + 2, 320, Math.max(0, 686 - fGy));
        ctx.clip();
        ctx.translate(0, (fGy + 2) * 2);
        ctx.scale(1, -0.34);
        ctx.globalAlpha = 0.14;
        f.draw(ctx, true, this);
        ctx.restore();
      }
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-600, gy + 2, ww + 1200, 700);
      ctx.clip();
      ctx.translate(0, (gy + 2) * 2);
      ctx.scale(1, -0.42);
      ctx.globalAlpha = reflAlpha;
      for (const f of fighters) {
        if (f.isBenched || f.isFullyBurrowed) continue;
        f.draw(ctx, true, this);
      }
      vfx.renderMainPass(ctx, true, this);
      ctx.restore();
    }

    // 4. Unreal HD-2D Dynamic Point-Light Floor Pools, 4-Step Normal Map Lights & Grounded Contact Shadows
    const lights = vfx.getActiveLights(fighters, gy);
    this.activePointLights = lights;
    this.drawFloorLightPools(ctx, lights, gy);
    this.drawDynamicShadows(ctx, fighters, lights, gy);

    // 4.5. Adventure Mode Floor Telegraph Rings, Wave-Lock Gates & Arcade Pickups
    if (this.adventureMode && this.adventureHook) {
      this.adventureHook.renderWorldFloor(ctx, this);
    }

    // Sync 120Hz ArcaneShaderFX viewport center to scrolling camera in Adventure Mode (zero FireMage.js edits!)
    for (const f of fighters) {
      if (f && f.fx) {
        f.fx.overrideCenterWorldX = this.adventureMode ? this.camX : null;
      }
    }

    // 5. Skill & Aura Pass (Rendered BEHIND the character bodies so skills never obscure characters or glow over their faces!)
    if (typeof vfx.renderBackgroundCastSeals === 'function') {
      vfx.renderBackgroundCastSeals(ctx, this);
    }
    const depthCmp =
      this._depthSortCmp ||
      (this._depthSortCmp = (a, b) => {
        if (Boolean(a.isBenched) !== Boolean(b.isBenched)) return a.isBenched ? -1 : 1;
        if (Boolean(a.isColossalBoss) !== Boolean(b.isColossalBoss)) {
          return a.isColossalBoss ? -1 : 1;
        }
        const aGy = Number.isFinite(a.groundY) ? a.groundY : a.y;
        const bGy = Number.isFinite(b.groundY) ? b.groundY : b.y;
        return aGy - bGy || a.y - b.y;
      });
    const sorted = this._sortedFighters || (this._sortedFighters = []);
    sorted.length = fighters.length;
    for (let i = 0; i < fighters.length; i++) sorted[i] = fighters[i];
    if (sorted.length > 1) sorted.sort(depthCmp);
    for (const f of sorted) {
      if (f.isBenched && !f.isDead) {
        this.drawTagPedestalWorld(ctx, f);
      }
      if (f.isFullyBurrowed) continue;
      if (f.isColossalBoss) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const bossFade = f.isDead
          ? Math.max(0, 1 - Math.max(0, (f.deathTimer || 0) - 1.6) * 1.2)
          : 1;
        ctx.globalAlpha = 0.16 * bossFade;
        const bossGlow = this.getGlowForColor(f.primaryColor || '#ef4444');
        const bx = Math.round((f.anchorX || f.x) - 250);
        ctx.drawImage(bossGlow, bx, 360, 560, 340);
        ctx.restore();
        continue;
      }
      const isExHero = Boolean(f.heroId && f.heroId.endsWith('_ex'));
      if (isExHero) {
        const exPal = getExHeroPalette(f.heroId, f.primaryColor);
        const deathFade = f.isDead
          ? Math.min(1, Math.max(0.06, 1 - (f.deathTimer || 0) * 0.7))
          : 1;
        const benchScale = f.isBenched ? 0.55 : 1;
        const isUltAct = f.state === 'ULTIMATE' || f.state === 'TRUE_ULTIMATE';
        const isSkillAct = f.state === 'SKILL' || f.state === 'AUTO_ATTACK';
        const fGy = Math.round(Number.isFinite(f.groundY) ? f.groundY : gy);
        const airRatio = Math.max(0.32, 1 - Math.max(0, fGy - f.y) / 280);
        const floorAlpha =
          (isUltAct ? 0.30 : isSkillAct ? 0.22 : 0.15) * deathFade * benchScale * airRatio;
        if (f.heroId !== 'reaper_ex') {
          drawExBayerHalo(
            ctx,
            f.x,
            fGy + 2,
            isUltAct ? 88 : 68,
            isUltAct ? 18 : 13,
            exPal.primary,
            exPal.core,
            floorAlpha
          );
        } else {
          drawExBayerHalo(
            ctx,
            f.x,
            fGy + 2,
            isUltAct ? 82 : 62,
            12,
            '#6b21a8',
            '#d946ef',
            floorAlpha * 0.85
          );
        }
        if (!f.isDead && !f.isBenched) {
          this.drawExGroundRimReflection(ctx, f, fGy, exPal, airRatio);
        }
        if (!f.isDead) {
          const rimAlpha = (isUltAct ? 0.20 : isSkillAct ? 0.13 : 0.08) * benchScale;
          drawExBayerHalo(
            ctx,
            f.x,
            f.y - 78,
            isUltAct ? 66 : 48,
            isUltAct ? 64 : 48,
            exPal.accent,
            exPal.core,
            rimAlpha
          );
        }
        if (f._exParticles && typeof f._exParticles.renderBack === 'function') {
          f._exParticles.renderBack(ctx);
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const deathFade = f.isDead ? Math.min(1, Math.max(0.08, 1 - (f.deathTimer || 0) * 0.65)) : 1;
      const isChrono = f.heroId === 'chronomancer' || f.heroId === 'chronomancer_ex';
      const isExUlt = f.state === 'ULTIMATE' || f.state === 'TRUE_ULTIMATE';
      const isExSkillOrAuto = f.state === 'SKILL' || f.state === 'AUTO_ATTACK';
      const baseAlpha = isExHero
        ? isExUlt
          ? 0.42
          : isExSkillOrAuto
            ? 0.30
            : 0.18
        : isChrono
          ? f.state === 'IDLE' || f.state === 'WALK'
            ? 0.28
            : 0.42
          : f.state === 'IDLE' || f.state === 'WALK'
            ? 0.16
            : 0.26;
      ctx.globalAlpha = baseAlpha * deathFade * (f.isBenched ? 0.65 : 1);
      const glow = this.getGlowForColor(f.primaryColor);
      ctx.drawImage(glow, f.x - 125, f.y - (f.isDead ? 95 : 175), 250, 250);
      if (isChrono && !f.isDead) {
        ctx.globalAlpha = (f.state === 'IDLE' || f.state === 'WALK' ? 0.22 : 0.34) * deathFade;
        ctx.drawImage(this.glowGold, f.x - 105, f.y - 165, 210, 210);
      }
      ctx.restore();

      if (f.heroId !== 'reaper' && f.heroId !== 'reaper_ex') {
        this.drawCharacterGroundHalo(ctx, f);
      }
      if (!f.isMonster) {
        this.drawCharacterPixelFlames(ctx, f);
      }
    }
    for (const f of sorted) {
      if (!f.isBenched && typeof f.drawForegroundOverlay === 'function') {
        f.drawForegroundOverlay(ctx, this);
      }
    }
    vfx.renderMainPass(ctx, false, this, false);
    if (this.adventureMode && this.adventureHook?.renderWorldMid) {
      this.adventureHook.renderWorldMid(ctx, this);
    }

    // 6. Character & 2.5D Standing Prop Pass: Crisp Champions + Destructible Terrain/Artifacts
    // interleaved by 2.5D groundY depth IN FRONT of normal skills & auto-attacks!
    const standingProps =
      this.adventureMode && typeof this.adventureHook?.getStandingProps === 'function'
        ? this.adventureHook.getStandingProps()
        : [];
    let charPassList = sorted;
    if (standingProps.length > 0) {
      charPassList = this._charPassList || (this._charPassList = []);
      charPassList.length = sorted.length + standingProps.length;
      for (let i = 0; i < sorted.length; i++) charPassList[i] = sorted[i];
      for (let j = 0; j < standingProps.length; j++) charPassList[sorted.length + j] = standingProps[j];
      charPassList.sort(depthCmp);
    }
    for (const f of charPassList) {
      if (f.isBenched) {
        const rx = Math.round(f.x);
        const ry = Math.round(f.y);
        ctx.save();
        ctx.translate(rx, ry);
        ctx.scale(0.8, 0.8);
        ctx.translate(-rx, -ry);
        f.draw(ctx, false, this);
        ctx.restore();
      } else if (this.adventureMode && Number.isFinite(f.groundY) && !f.isColossalBoss) {
        const depthT = Math.max(0, Math.min(1, (f.groundY - 442) / 238));
        const dScale = Math.round((0.93 + depthT * 0.12) * 32) / 32;
        const rx = Math.round(f.x);
        const ry = Math.round(f.y);
        ctx.save();
        ctx.translate(rx, ry);
        ctx.scale(dScale, dScale);
        ctx.translate(-rx, -ry);
        if (!f.isDead && typeof f.drawAdventureDodgeFX === 'function') {
          f.drawAdventureDodgeFX(ctx, 'back');
        }
        f.draw(ctx, false, this);
        if (!f.isDead && typeof f.drawAdventureDodgeFX === 'function') {
          f.drawAdventureDodgeFX(ctx, 'front');
        }
        if (!f.isDead && typeof f.drawHackAndSlashStreaks === 'function') {
          f.drawHackAndSlashStreaks(ctx);
        }
        ctx.restore();
      } else {
        if (!f.isDead && typeof f.drawAdventureDodgeFX === 'function') {
          f.drawAdventureDodgeFX(ctx, 'back');
        }
        f.draw(ctx, false, this);
        if (!f.isDead && typeof f.drawAdventureDodgeFX === 'function') {
          f.drawAdventureDodgeFX(ctx, 'front');
        }
        if (!f.isDead && typeof f.drawHackAndSlashStreaks === 'function') {
          f.drawHackAndSlashStreaks(ctx);
        }
      }
    }

    // 7. Foreground Ultimate Attack Pass: Ultimate Attacks, Clashes & K.O. Finishers blaze IN FRONT of the characters!
    for (const f of sorted) {
      if (!f.isBenched && typeof f.drawUltimateForeground === 'function') {
        f.drawUltimateForeground(ctx, this);
      }
      if (!f.isBenched && f.heroId?.endsWith('_ex') && f._exParticles?.renderFront) {
        f._exParticles.renderFront(ctx);
      }
    }
    vfx.renderMainPass(ctx, false, this, true);
    if (this.adventureMode && this.adventureHook?.renderWorldForeground) {
      this.adventureHook.renderWorldForeground(ctx, this);
    }
    if (this.clashZoomTimer > 0) {
      this.drawClashWorld(ctx, gy);
    }
    if (this.koZoomTimer > 0) {
      this.drawKOFinisherWorld(ctx, gy);
    }

    // 7.15. Near-Camera 1.24x Parallax Atmospheric Stage Foreground Depth Layer
    if (this.adventureMode && ww > 1600) {
      AdventureMapRenderer.renderForegroundDepth(ctx, this);
    }
    this.drawStageForeground(ctx, ww, gy);

    // 7.18. Translucent Neon Creator Strike from Cob + Twin Cob-Coordinated Flying Command Drones
    const activeStage718 = this.getActiveStageId?.();
    const isCobStageActive =
      activeStage718 === 'cob_monitor' ||
      activeStage718 === 'cob_monitor_inferno' ||
      activeStage718 === 'cob_monitor_glacial';
    if (this.cobAssistTimer > 0 && !this.adventureMode) {
      this.drawCobCreatorStrikeWorld(ctx, ww, gy);
    }
    if (!this.adventureMode && (isCobStageActive || this.cobAssistTimer > 0)) {
      this.drawCobFlyingDronesWorld(ctx, ww, gy);
    }

    // 7.20. Whole-Stage Dimensional Katana Rift Seam & Petal/Ember Burst
    if (this.stageSliceTimer > 0) {
      this.drawDimensionalStageSliceWorld(ctx, ww, gy);
    }
    // 7.22. Sweeping Crystalline Freeze-Wave Frozen Stage Transition
    if (this.glacialWipeTimer > 0) {
      this.drawGlacialFreezeWaveWorld(ctx, ww, gy);
    }
    // 7.23. Sweeping Fourth-Wall Cyber Digital Wipe Transition (`cob_monitor`)
    if (this.cobWipeTimer > 0) {
      this.drawCobDigitalWipeWorld(ctx, ww, gy);
    }

    // 7.25. Supreme Finisher High-Contrast Anime Impact Frame & Full-Stage White-Out Deletion Screen!
    if (this.impactFrameTimer > 0) {
      this.drawImpactFrameWorld(ctx, sorted, ww, gy);
    }
    if (this.whiteoutTimer > 0) {
      this.drawWhiteoutDeletionWorld(ctx, sorted, ww, gy);
    }

    // 7.4. Overhead Orbiting Pixel Stun Stars for Stunned Fighters (`stunTimer > 0`)
    for (const f of sorted) {
      if (!f.isDead && !f.isBenched && f.stunTimer > 0) {
        this.drawFighterStunStars(ctx, f);
      }
    }

    // 7.5. In-World 2v2 Overhead Team & Mini-HP Badges (when 4 fighters are present in 2v2 modes)
    if (fighters.length > 2 && !this.adventureMode) {
      for (const f of sorted) {
        this.drawFighter2v2OverheadBadge(ctx, f);
      }
    }

    // 8. Ultimate Callout Plates & Floating Combat Text
    vfx.renderFloatingTexts(ctx);

    ctx.restore();

    // 8. Screen-Space Unreal HD-2D Soft Tilt-Shift Vignette (Zero hard vertical bars)
    this.drawHD2DPostProcess(ctx);

    // 9. Adventure Mode Screen-Space Progress Strip, Flashing "GO!" Pixel Arrow & Boss Warning Banner
    if (this.adventureMode && this.adventureHook) {
      this.adventureHook.renderScreenHUD(ctx, this);
    }
  }

  drawTagPedestalWorld(ctx, f) {
    const px = Math.round(f.x);
    const py = Math.round(f.y);
    const pulse = 0.72 + Math.sin(this.time * 5.2) * 0.22;
    const isLeft = f.team === 'left' || f.team === 1;
    const teamCol = isLeft ? '#38bdf8' : '#facc15';
    ctx.save();
    ctx.fillStyle = '#090d18';
    ctx.fillRect(px - 44, py - 4, 88, 12);
    ctx.strokeStyle = teamCol;
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 44, py - 4, 88, 12);
    ctx.globalAlpha = 0.55 * pulse;
    ctx.fillStyle = f.primaryColor || teamCol;
    ctx.fillRect(px - 36, py - 8, 72, 4);
    ctx.restore();
  }

  drawFighterStunStars(ctx, f) {
    if (!ctx?.fillRect || !f || f.stunTimer <= 0) return;
    const cx = Math.round(f.x);
    const cy = Math.round(f.y - 168);
    const rx = 28;
    const ry = 9;
    const phase = (this.time || 0) * 8.5;

    ctx.save();
    for (let i = 0; i < 4; i++) {
      const ang = phase + (i * Math.PI) / 2;
      const sx = Math.round(cx + Math.cos(ang) * rx);
      const sy = Math.round(cy + Math.sin(ang) * ry);
      // Crisp 16-bit 4-point pixel star
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(sx - 5, sy - 2, 10, 4);
      ctx.fillRect(sx - 2, sy - 5, 4, 10);
      ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#10b981';
      ctx.fillRect(sx - 4, sy - 1, 8, 2);
      ctx.fillRect(sx - 1, sy - 4, 2, 8);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
    ctx.restore();
  }

  drawFighter2v2OverheadBadge(ctx, f) {
    if (!f || (f.isDead && (f.deathTimer || 0) > 0.6)) return;
    const bx = Math.round(f.x);
    const by = Math.round(f.y - (f.isBenched ? 168 : 206));
    const isLeft = f.team === 'left' || f.team === 1;
    const tagLabel = f.isBenched
      ? 'STANDBY'
      : isLeft
        ? f.slotRole === 'partner'
          ? 'P1B'
          : 'P1'
        : f.slotRole === 'partner'
          ? 'P2B'
          : 'P2';
    const borderCol = isLeft
      ? f.slotRole === 'partner'
        ? '#2dd4bf'
        : '#38bdf8'
      : f.slotRole === 'partner'
        ? '#fb923c'
        : '#facc15';
    const hpPct = Math.max(0, Math.min(1, f.hp / Math.max(1, f.maxHp)));
    const manaPct = Math.max(0, Math.min(1, f.mana / Math.max(1, f.maxMana)));

    ctx.save();
    const barW = 54;
    const barH = 6;
    const x0 = bx - Math.floor(barW / 2);
    const y0 = by;

    // Role Pill Tag above mini HP bar
    ctx.font = '8px "ArcanePixel", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#050811';
    ctx.fillRect(bx - 24, y0 - 13, 48, 11);
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 24, y0 - 13, 48, 11);
    ctx.fillStyle = '#fef9c3';
    ctx.fillText(tagLabel, bx, y0 - 4);

    // Mini HP bar & Overdrive strip
    ctx.fillStyle = '#05070e';
    ctx.fillRect(x0 - 1, y0 - 1, barW + 2, barH + 4);
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 1, y0 - 1, barW + 2, barH + 4);

    ctx.fillStyle = f.primaryColor || borderCol;
    ctx.fillRect(x0, y0, Math.round(barW * hpPct), barH - 1);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(x0, y0 + barH, Math.round(barW * manaPct), 2);
    ctx.restore();
  }

  getOrBakeStageUpperVault(img) {
    if (!img || !img.complete || img.naturalWidth <= 0 || typeof document === 'undefined') {
      return null;
    }
    if (!this._stageUpperVaultCache) {
      this._stageUpperVaultCache = new Map();
    }
    const cacheKey = img.src || img;
    const cached = this._stageUpperVaultCache.get(cacheKey);
    if (cached) return cached;

    const srcW = img.naturalWidth || 640;
    const srcH = img.naturalHeight || 360;
    const sampleH = Math.min(24, srcH);
    const vaultH = 280;

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = srcW;
    sampleCanvas.height = sampleH;
    const sctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sctx) return null;
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(img, 0, 0, srcW, sampleH, 0, 0, srcW, sampleH);
    const srcData = sctx.getImageData(0, 0, srcW, sampleH).data;
    sampleCanvas.width = 0;
    sampleCanvas.height = 0;

    // Guard against premature WebKit/Safari race ticks where drawImage(img) produces all-zero pixels
    let hasValidPixels = false;
    for (let i = 0; i < srcData.length; i += 16) {
      if (srcData[i + 3] > 0 && (srcData[i] > 0 || srcData[i + 1] > 0 || srcData[i + 2] > 0)) {
        hasValidPixels = true;
        break;
      }
    }
    if (!hasValidPixels) {
      return null;
    }

    const vaultCanvas = document.createElement('canvas');
    vaultCanvas.width = srcW;
    vaultCanvas.height = vaultH;
    const vctx = vaultCanvas.getContext('2d');
    if (!vctx) return null;
    vctx.imageSmoothingEnabled = false;
    const outImg = vctx.getImageData(0, 0, srcW, vaultH);
    const out = outImg.data;

    // 1. Extract stage-authentic muted upper vault palette (`x in [0.33..0.67]`, `y in [0..19]`)
    const xStart = Math.floor(srcW * 0.33);
    const xEnd = Math.ceil(srcW * 0.67);
    const skySamples = [];
    for (let sy = 0; sy < Math.min(20, sampleH); sy += 2) {
      for (let sx = xStart; sx < xEnd; sx += 2) {
        const idx = (sy * srcW + sx) * 4;
        const r = srcData[idx];
        const g = srcData[idx + 1];
        const b = srcData[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        skySamples.push({ r, g, b, lum });
      }
    }
    skySamples.sort((a, b) => a.lum - b.lum);
    const pickPct = (p, fb) =>
      skySamples.length > 0
        ? skySamples[Math.min(skySamples.length - 1, Math.max(0, Math.floor(skySamples.length * p)))]
        : fb;
    const p20 = pickPct(0.20, { r: 8, g: 12, b: 24, lum: 12 });

    const skyUpper = [
      Math.round(p20.r * 0.44 + 4 * 0.56),
      Math.round(p20.g * 0.44 + 5 * 0.56),
      Math.round(p20.b * 0.44 + 10 * 0.56)
    ];
    const skyZenith = [4, 5, 10];

    // 2. Build smoothed horizon envelope from `y = 0..3` so vault colors diffuse without vertical stripes
    const colHorizonR = new Float32Array(srcW);
    const colHorizonG = new Float32Array(srcW);
    const colHorizonB = new Float32Array(srcW);
    const blurRadius = 18;
    for (let x = 0; x < srcW; x++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let cnt = 0;
      const lo = Math.max(0, x - blurRadius);
      const hi = Math.min(srcW - 1, x + blurRadius);
      for (let kx = lo; kx <= hi; kx++) {
        for (let ky = 0; ky < Math.min(4, sampleH); ky++) {
          const kIdx = (ky * srcW + kx) * 4;
          sr += srcData[kIdx];
          sg += srcData[kIdx + 1];
          sb += srcData[kIdx + 2];
          cnt++;
        }
      }
      colHorizonR[x] = sr / Math.max(1, cnt);
      colHorizonG[x] = sg / Math.max(1, cnt);
      colHorizonB[x] = sb / Math.max(1, cnt);
    }

    const BAYER_4X4 = [
      0 / 16, 8 / 16, 2 / 16, 10 / 16,
      12 / 16, 4 / 16, 14 / 16, 6 / 16,
      3 / 16, 11 / 16, 1 / 16, 9 / 16,
      15 / 16, 7 / 16, 13 / 16, 5 / 16
    ];
    const hash2 = (ix, iy) => {
      let n = (ix * 374761393 + iy * 668265263) | 0;
      n = ((n ^ (n >>> 13)) * 1274126177) | 0;
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    };
    const valueNoise2D = (fx, fy) => {
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const ux = tx * tx * (3 - 2 * tx);
      const uy = ty * ty * (3 - 2 * ty);
      const v00 = hash2(x0, y0);
      const v10 = hash2(x0 + 1, y0);
      const v01 = hash2(x0, y0 + 1);
      const v11 = hash2(x0 + 1, y0 + 1);
      const a = v00 + (v10 - v00) * ux;
      const b = v01 + (v11 - v01) * ux;
      return a + (b - a) * uy;
    };

    const halfW = srcW * 0.5;
    for (let vy = 0; vy < vaultH; vy++) {
      const h = vaultH - 1 - vy; // 0 right at seam `drawY`, 279 at top of vault
      for (let x = 0; x < srcW; x++) {
        const outIdx = (vy * srcW + x) * 4;
        if (h === 0) {
          // Exact 0.0px pixel-identical join with `y = 0` of the stage PNG
          const s0 = x * 4;
          out[outIdx] = srcData[s0];
          out[outIdx + 1] = srcData[s0 + 1];
          out[outIdx + 2] = srcData[s0 + 2];
          out[outIdx + 3] = 255;
          continue;
        }

        const bayer = BAYER_4X4[(vy & 3) * 4 + (x & 3)] - 0.5;
        const nx = (x - halfW) / halfW; // -1..+1
        const absNx = Math.abs(nx);

        // Organic inward-arching canopy/vault crown strictly on outer framing columns (`|nx| > 0.28`)
        const crownNoise =
          valueNoise2D(x * 0.055, h * 0.045) * 0.65 + valueNoise2D(x * 0.13 + 17.3, h * 0.11) * 0.35;
        const outerFactor = Math.max(0, (absNx - 0.28) / 0.72);
        const archReach =
          outerFactor > 0
            ? 4 + Math.pow(outerFactor, 1.15) * 56 + (crownNoise - 0.35) * 24 * outerFactor
            : 3;

        // Exponentially diffuse `colHorizon[x]` upward into `#04050a` (`[4, 5, 10]`) darkforge vignette shadow (`0` stars!)
        const horizonKeep = Math.exp(-h / 34);
        const baseSkyR = skyUpper[0] * 0.68 + skyZenith[0] * 0.32;
        const baseSkyG = skyUpper[1] * 0.68 + skyZenith[1] * 0.32;
        const baseSkyB = skyUpper[2] * 0.68 + skyZenith[2] * 0.32;
        const seamR = colHorizonR[x] * horizonKeep + baseSkyR * (1 - horizonKeep);
        const seamG = colHorizonG[x] * horizonKeep + baseSkyG * (1 - horizonKeep);
        const seamB = colHorizonB[x] * horizonKeep + baseSkyB * (1 - horizonKeep);

        const skyT = Math.min(1, Math.max(0, (h + bayer * 14) / (vaultH - 12)));
        const zenithMix = Math.pow(skyT, 0.80);
        let sr = seamR + (skyZenith[0] - seamR) * zenithMix;
        let sg = seamG + (skyZenith[1] - seamG) * zenithMix;
        let sb = seamB + (skyZenith[2] - seamB) * zenithMix;

        // Blend organic inward-arching canopy / pillar stone clumps near the lower seam (`h < archReach`)
        if (h < archReach) {
          const archDir = nx >= 0 ? -1 : 1;
          const lateralDrift =
            outerFactor > 0
              ? archDir * Math.round(h * (0.48 + 0.34 * absNx)) + Math.round((crownNoise - 0.5) * 11)
              : 0;
          const sxSample = Math.max(0, Math.min(srcW - 1, x + lateralDrift));
          const sySample =
            h <= 2
              ? 0
              : Math.min(
                  sampleH - 1,
                  Math.floor(valueNoise2D(x * 0.19 + 5.7, h * 0.21) * Math.min(10, sampleH))
                );
          const cIdx = (sySample * srcW + sxSample) * 4;
          const cr = srcData[cIdx];
          const cg = srcData[cIdx + 1];
          const cb = srcData[cIdx + 2];
          const dissolve = Math.max(0, Math.min(1, 1 - (h + bayer * 6) / Math.max(4, archReach)));
          const useCanopy = h <= 2 || dissolve > 0.42;
          if (useCanopy) {
            const shade = 1 - Math.min(0.40, h * 0.0052);
            sr = cr * shade * dissolve + sr * (1 - dissolve);
            sg = cg * shade * dissolve + sg * (1 - dissolve);
            sb = cb * shade * dissolve + sb * (1 - dissolve);
          }
        }

        // 4x4 Bayer dithering + quantized 6-bit cel steps anchored cleanly onto `#04050a` (`[4, 5, 10]`)
        const ditherAmt = (1 - zenithMix) * 2.2;
        out[outIdx] = Math.max(0, Math.min(255, 4 + Math.round((sr + bayer * ditherAmt - 4) / 3) * 3));
        out[outIdx + 1] = Math.max(0, Math.min(255, 5 + Math.round((sg + bayer * ditherAmt - 5) / 3) * 3));
        out[outIdx + 2] = Math.max(0, Math.min(255, 10 + Math.round((sb + bayer * ditherAmt - 10) / 3) * 3));
        out[outIdx + 3] = 255;
      }
    }

    vctx.putImageData(outImg, 0, 0);
    if (this._stageUpperVaultCache.size >= 4) {
      const oldestKey = this._stageUpperVaultCache.keys().next().value;
      this._releaseCanvas(this._stageUpperVaultCache.get(oldestKey));
      this._stageUpperVaultCache.delete(oldestKey);
    }
    this._stageUpperVaultCache.set(cacheKey, vaultCanvas);
    return vaultCanvas;
  }

  getOrBakeStageWingComposite(img) {
    if (!img || !img.complete || img.naturalWidth <= 0 || typeof document === 'undefined') {
      return null;
    }
    if (!this._stageWingCompositeCache) {
      this._stageWingCompositeCache = new Map();
    }
    const cacheKey = img.src || img;
    const existing = this._stageWingCompositeCache.get(cacheKey);
    if (existing && existing.canvas && existing.canvas.width > 0) {
      return existing;
    }

    const srcW = img.naturalWidth || 640;
    const srcH = img.naturalHeight || 360;
    const upperVault = this.getOrBakeStageUpperVault(img);
    if (!upperVault) {
      return null;
    }
    const vaultH = upperVault.height;
    const floorSrcH = Math.min(srcH, Math.ceil((520 * srcH) / 1080) + 2);
    const compW = srcW * 3;
    const compH = vaultH + srcH + floorSrcH;

    const compCanvas = document.createElement('canvas');
    compCanvas.width = compW;
    compCanvas.height = compH;
    const cctx = compCanvas.getContext('2d');
    if (!cctx) {
      this._releaseCanvas(compCanvas);
      return null;
    }
    cctx.imageSmoothingEnabled = false;

    if (upperVault && vaultH > 0) {
      cctx.save();
      cctx.translate(srcW, 0);
      cctx.scale(-1, 1);
      cctx.drawImage(upperVault, 0, 0, srcW, vaultH);
      cctx.restore();

      cctx.drawImage(upperVault, srcW, 0, srcW, vaultH);

      cctx.save();
      cctx.translate(srcW * 3, 0);
      cctx.scale(-1, 1);
      cctx.drawImage(upperVault, 0, 0, srcW, vaultH);
      cctx.restore();
    }

    cctx.save();
    cctx.translate(srcW, vaultH);
    cctx.scale(-1, 1);
    cctx.drawImage(img, 0, 0, srcW, srcH);
    cctx.restore();

    cctx.drawImage(img, srcW, vaultH, srcW, srcH);

    cctx.save();
    cctx.translate(srcW * 3, vaultH);
    cctx.scale(-1, 1);
    cctx.drawImage(img, 0, 0, srcW, srcH);
    cctx.restore();

    const mirrorBottomY = vaultH + srcH * 2;
    cctx.save();
    cctx.translate(srcW, mirrorBottomY);
    cctx.scale(-1, -1);
    cctx.drawImage(img, 0, 0, srcW, srcH);
    cctx.restore();

    cctx.save();
    cctx.translate(srcW, mirrorBottomY);
    cctx.scale(1, -1);
    cctx.drawImage(img, 0, 0, srcW, srcH);
    cctx.restore();

    cctx.save();
    cctx.translate(srcW * 3, mirrorBottomY);
    cctx.scale(-1, -1);
    cctx.drawImage(img, 0, 0, srcW, srcH);
    cctx.restore();

    const fadeTop = vaultH + srcH - (12 * srcH) / 1080;
    const fadeBot = vaultH + srcH + (520 * srcH) / 1080;
    const floorFade = cctx.createLinearGradient(0, fadeTop, 0, fadeBot);
    floorFade.addColorStop(0, 'rgba(4, 5, 10, 0)');
    floorFade.addColorStop(0.46, 'rgba(4, 5, 10, 0.84)');
    floorFade.addColorStop(1, '#04050a');
    cctx.fillStyle = floorFade;
    cctx.fillRect(0, fadeTop, compW, compH - fadeTop + 1);

    if (this._stageWingCompositeCache.size >= 2) {
      const oldestKey = this._stageWingCompositeCache.keys().next().value;
      const evicted = this._stageWingCompositeCache.get(oldestKey);
      this._releaseCanvas(evicted?.canvas);
      this._stageWingCompositeCache.delete(oldestKey);
    }

    const entry = {
      canvas: compCanvas,
      srcW,
      srcH,
      vaultH,
      floorSrcH
    };
    this._stageWingCompositeCache.set(cacheKey, entry);
    return entry;
  }

  drawHD2DArena(ctx, ww, gy) {
    if (this.adventureMode && ww > 1600) {
      AdventureMapRenderer.render(ctx, this, ww);
      return;
    }

    const assets = PixelForge.initAssets();

    const stageMeta = this.getCurrentStageMeta();
    const bg = PixelForge.ensureImage(
      (stageMeta && assets[stageMeta.assetKey]) || assets.arenaBg
    );
    // Exact 3.0x integer pixel scale of 640x360 (`1920x1080`) for larger, razor-crisp VS arenas
    const drawW = 1920;
    const drawH = 1080;
    const drawX = Math.round((ww - drawW) * 0.5);
    const drawY = Math.round(gy - drawH * 0.82);

    const drawStageImageWithWings = (img, alpha = 1.0) => {
      if (!img || !img.complete || img.naturalWidth <= 0 || alpha <= 0.005) return;
      const bottomY = drawY + drawH;
      const baked = this.getOrBakeStageWingComposite(img);
      if (baked && baked.canvas && baked.canvas.width > 0) {
        const scaleY = drawH / baked.srcH;
        const vaultDrawH = Math.round(baked.vaultH * scaleY);
        const floorDrawH = Math.round(baked.floorSrcH * scaleY);
        const compDrawH = vaultDrawH + drawH + floorDrawH;
        const compTopY = drawY - vaultDrawH;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = '#04050a';
        ctx.fillRect(drawX - drawW, compTopY - 960, drawW * 3, 964);
        ctx.drawImage(baked.canvas, drawX - drawW, compTopY, drawW * 3, compDrawH);
        if (bottomY + drawH + 4 > compTopY + compDrawH) {
          ctx.fillRect(
            drawX - drawW,
            compTopY + compDrawH - 3,
            drawW * 3,
            bottomY + drawH + 8 - (compTopY + compDrawH)
          );
        }
        ctx.restore();
        return;
      }

      const upperVault = this.getOrBakeStageUpperVault(img);
      const srcH = img.naturalHeight || 360;
      const vaultDrawH = upperVault
        ? Math.round(drawH * (upperVault.height / srcH))
        : 0;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Seamless HD-2D pixel-art upper sky/vault continuation above `drawY` (ZERO upside-down top mirror!)
      if (upperVault && vaultDrawH > 0) {
        const vaultTopY = drawY - vaultDrawH;
        ctx.fillStyle = '#04050a';
        ctx.fillRect(drawX - drawW, vaultTopY - 960, drawW * 3, 964);

        ctx.save();
        ctx.translate(drawX, vaultTopY);
        ctx.scale(-1, 1);
        ctx.drawImage(upperVault, 0, 0, drawW, vaultDrawH);
        ctx.restore();

        ctx.save();
        ctx.translate(drawX + drawW * 2, vaultTopY);
        ctx.scale(-1, 1);
        ctx.drawImage(upperVault, 0, 0, drawW, vaultDrawH);
        ctx.restore();

        ctx.drawImage(upperVault, drawX, vaultTopY, drawW, vaultDrawH);
      } else {
        ctx.fillStyle = '#04050a';
        ctx.fillRect(drawX - drawW, drawY - 1200, drawW * 3, 1204);
      }

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();

      ctx.save();
      ctx.translate(drawX + drawW * 2, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Seamless lower-floor vertical mirror below `bottomY` + darkforge floor vignette (100% preserved!)
      ctx.save();
      ctx.translate(drawX, bottomY + drawH);
      ctx.scale(-1, -1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();

      ctx.save();
      ctx.translate(drawX + drawW * 2, bottomY + drawH);
      ctx.scale(-1, -1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();

      ctx.save();
      ctx.translate(drawX, bottomY + drawH);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();

      if (this._floorFadeGradBottomY !== bottomY || !this._floorFadeGrad) {
        const floorFade = ctx.createLinearGradient(0, bottomY - 12, 0, bottomY + 520);
        floorFade.addColorStop(0, 'rgba(4, 5, 10, 0)');
        floorFade.addColorStop(0.46, 'rgba(4, 5, 10, 0.84)');
        floorFade.addColorStop(1, '#04050a');
        this._floorFadeGrad = floorFade;
        this._floorFadeGradBottomY = bottomY;
      }
      ctx.fillStyle = this._floorFadeGrad;
      ctx.fillRect(drawX - drawW, bottomY - 12, drawW * 3, drawH + 16);

      ctx.restore();
    };

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (bg && bg.complete && bg.naturalWidth > 0) {
      drawStageImageWithWings(bg, 1.0);
    } else {
      ctx.fillStyle = '#070a14';
      ctx.fillRect(-1200, -700, ww + 2400, gy + 1400);
    }

    // Dynamic or Permanent Supreme Ultimate Stage Transformation Overlay (`arenaSanctuary` / `arenaInferno`)
    const overrideKey = this.trueUltStageOverride;
    const overrideMeta = overrideKey ? ULTIMATE_STAGE_MAP[overrideKey] : null;
    const overrideImg = overrideMeta ? PixelForge.ensureImage(assets[overrideMeta.assetKey]) : null;
    if (
      overrideImg &&
      overrideImg !== bg &&
      this.trueUltStageAlpha > 0.01 &&
      overrideImg.complete &&
      overrideImg.naturalWidth > 0
    ) {
      drawStageImageWithWings(overrideImg, this.trueUltStageAlpha);
    }

    // Stage-Aware Pixel-Stepped Flagstone Seams & Elemental Specular Trim
    const seamStage = this.getActiveStageId();
    const seamPulse = 0.5 + 0.5 * Math.sin(this.time * 3.8);
    for (let r = 0; r < 5; r++) {
      const ry = Math.round((gy - 22 + r * r * 12) / 3) * 3;
      if (seamStage === 'inferno' || seamStage === 'shogunate_inferno') {
        ctx.fillStyle = seamStage === 'shogunate_inferno' ? 'rgba(18, 7, 6, 0.46)' : 'rgba(15, 6, 4, 0.44)';
        ctx.fillRect(-800, ry, ww + 1600, 3);
        const lavaSeamAlpha = (0.12 + 0.08 * Math.sin(this.time * 5.2 + r * 1.3)).toFixed(3);
        ctx.fillStyle =
          seamStage === 'shogunate_inferno'
            ? `rgba(244, 63, 94, ${lavaSeamAlpha})`
            : `rgba(251, 146, 60, ${lavaSeamAlpha})`;
        ctx.fillRect(-800, ry + 1, ww + 1600, 2);
        // Segmented incandescent ember-lit stone fault cracks
        const coreAlpha = (0.16 + 0.10 * Math.sin(this.time * 6.8 + r * 1.9)).toFixed(3);
        ctx.fillStyle = `rgba(254, 215, 170, ${coreAlpha})`;
        for (let seg = -3; seg <= 6; seg++) {
          const sx = Math.round((seg * 195 + r * 47) / 3) * 3;
          const sw = 48 + ((seg * 17 + r * 11) & 31);
          ctx.fillRect(sx, ry + 1, sw, 1);
        }
      } else if (seamStage === 'glacial' || seamStage === 'shogunate_glacial') {
        ctx.fillStyle = 'rgba(6, 14, 30, 0.36)';
        ctx.fillRect(-800, ry, ww + 1600, 3);
        const iceSeamAlpha = (0.14 + 0.07 * Math.sin(this.time * 4.2 + r * 1.4)).toFixed(3);
        ctx.fillStyle =
          r % 2 === 0
            ? `rgba(103, 232, 249, ${iceSeamAlpha})`
            : `rgba(232, 121, 249, ${iceSeamAlpha})`;
        ctx.fillRect(-800, ry + 1, ww + 1600, 2);
      } else if (
        seamStage === 'cob_monitor' ||
        seamStage === 'cob_monitor_inferno' ||
        seamStage === 'cob_monitor_glacial'
      ) {
        const isCobInf = seamStage === 'cob_monitor_inferno';
        const isCobGlac = seamStage === 'cob_monitor_glacial';
        ctx.fillStyle = isCobInf ? 'rgba(18, 6, 4, 0.46)' : isCobGlac ? 'rgba(4, 14, 28, 0.42)' : 'rgba(6, 8, 22, 0.44)';
        ctx.fillRect(-800, ry, ww + 1600, 3);
        const pulseAlpha = (0.14 + 0.07 * Math.sin(this.time * 5.0 + r * 1.6)).toFixed(3);
        ctx.fillStyle = isCobInf
          ? r % 2 === 0
            ? `rgba(251, 146, 60, ${pulseAlpha})`
            : `rgba(239, 68, 68, ${pulseAlpha})`
          : isCobGlac
            ? r % 2 === 0
              ? `rgba(103, 232, 249, ${pulseAlpha})`
              : `rgba(232, 121, 249, ${pulseAlpha})`
            : r % 2 === 0
              ? `rgba(34, 211, 238, ${pulseAlpha})`
              : `rgba(217, 70, 239, ${pulseAlpha})`;
        ctx.fillRect(-800, ry + 1, ww + 1600, 2);
        const busX = Math.round((((this.time * (260 + r * 40) + r * 320) % 1800) - 300) / 4) * 4;
        ctx.fillStyle = isCobInf
          ? r % 2 === 0
            ? 'rgba(253, 224, 71, 0.42)'
            : 'rgba(251, 146, 60, 0.38)'
          : isCobGlac
            ? r % 2 === 0
              ? 'rgba(186, 230, 253, 0.44)'
              : 'rgba(245, 208, 254, 0.36)'
            : r % 2 === 0
              ? 'rgba(165, 243, 252, 0.42)'
              : 'rgba(253, 224, 71, 0.36)';
        ctx.fillRect(busX, ry, 52, 2);
        ctx.fillRect(busX - 240, ry, 28, 2);
      } else if (seamStage === 'shogunate') {
        ctx.fillStyle = 'rgba(8, 12, 26, 0.36)';
        ctx.fillRect(-800, ry, ww + 1600, 3);
        if (r === 1 || r === 3) {
          const moonAlpha = (0.11 + 0.05 * seamPulse).toFixed(3);
          ctx.fillStyle =
            r === 1 ? `rgba(125, 211, 252, ${moonAlpha})` : `rgba(251, 113, 133, ${moonAlpha})`;
          ctx.fillRect(-800, ry + 1, ww + 1600, 2);
        }
      } else if (seamStage === 'sylvan') {
        ctx.fillStyle = 'rgba(4, 16, 14, 0.34)';
        ctx.fillRect(-800, ry, ww + 1600, 3);
        if (r === 1 || r === 3) {
          const leyAlpha = (0.11 + 0.05 * seamPulse).toFixed(3);
          ctx.fillStyle = r === 1 ? `rgba(52, 211, 153, ${leyAlpha})` : `rgba(56, 189, 248, ${leyAlpha})`;
          ctx.fillRect(-800, ry + 1, ww + 1600, 2);
        }
      } else if (seamStage === 'boneyard') {
        ctx.fillStyle = 'rgba(10, 5, 18, 0.40)';
        ctx.fillRect(-800, ry, ww + 1600, 3);
        if (r === 1 || r === 2) {
          const cryptAlpha = (0.10 + 0.05 * seamPulse).toFixed(3);
          ctx.fillStyle = r === 1 ? `rgba(168, 85, 247, ${cryptAlpha})` : 'rgba(225, 29, 72, 0.09)';
          ctx.fillRect(-800, ry + 1, ww + 1600, 2);
        }
      } else if (seamStage === 'clocktower') {
        ctx.fillStyle = 'rgba(6, 12, 20, 0.34)';
        ctx.fillRect(-800, ry, ww + 1600, 3);
        if (r === 1 || r === 3) {
          ctx.fillStyle = r === 1 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(45, 212, 191, 0.10)';
          ctx.fillRect(-800, ry + 1, ww + 1600, 2);
        }
      } else if (seamStage === 'sanctuary') {
        ctx.fillStyle = 'rgba(12, 24, 48, 0.24)';
        ctx.fillRect(-800, ry, ww + 1600, 3);
        if (r === 1 || r === 2) {
          ctx.fillStyle = r === 1 ? 'rgba(125, 211, 252, 0.16)' : 'rgba(250, 204, 21, 0.14)';
          ctx.fillRect(-800, ry + 1, ww + 1600, 2);
        }
      } else {
        ctx.fillStyle = 'rgba(8, 11, 20, 0.34)';
        ctx.fillRect(-800, ry, ww + 1600, 3);
        if (r === 1) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.11)';
          ctx.fillRect(-800, ry, ww * 0.5 + 720, 2);
          ctx.fillStyle = 'rgba(251, 146, 60, 0.11)';
          ctx.fillRect(ww * 0.5 + 80, ry, ww * 0.5 + 720, 2);
          ctx.fillStyle = 'rgba(148, 174, 212, 0.11)';
          ctx.fillRect(ww * 0.5 - 120, ry, 240, 2);
        }
      }
    }

    // Dispatch Bespoke Live Animated Pixel-Art Stage Effects Above Each Stage Image!
    const baseStageId = this.permanentStageOverride || this.stageId;
    if (baseStageId === 'inferno') {
      this.drawInfernoStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
    } else if (baseStageId === 'glacial') {
      this.drawGlacialStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
    } else if (baseStageId === 'shogunate') {
      this.drawShogunateStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
    } else if (baseStageId === 'shogunate_inferno') {
      this.drawShogunateInfernoStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
    } else if (baseStageId === 'shogunate_glacial') {
      this.drawShogunateGlacialStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
    } else if (baseStageId === 'cob_monitor') {
      this.drawCobMonitorStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0, 'normal');
    } else if (baseStageId === 'cob_monitor_inferno') {
      this.drawCobMonitorStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0, 'inferno');
    } else if (baseStageId === 'cob_monitor_glacial') {
      this.drawCobMonitorStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0, 'glacial');
    } else if (baseStageId === 'sanctuary') {
      this.drawSanctuaryStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
    } else if (baseStageId === 'sylvan') {
      this.drawSylvanStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy);
    } else if (baseStageId === 'boneyard') {
      this.drawBoneyardStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy);
    } else if (baseStageId === 'clocktower') {
      this.drawClocktowerStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy);
    } else {
      this.drawStagePixelFlames(ctx, bg, drawX, drawY, drawW, drawH, gy);
    }

    // Crossfade Ultimate Stage Transformation Effects when transitioning onto a base stage
    if (
      this.trueUltStageOverride &&
      this.trueUltStageOverride !== baseStageId &&
      this.trueUltStageAlpha > 0.12
    ) {
      if (this.trueUltStageOverride === 'inferno') {
        this.drawInfernoStageEffects(ctx, drawX, drawY, drawW, drawH, gy, this.trueUltStageAlpha);
      } else if (this.trueUltStageOverride === 'glacial') {
        this.drawGlacialStageEffects(ctx, drawX, drawY, drawW, drawH, gy, this.trueUltStageAlpha);
      } else if (this.trueUltStageOverride === 'shogunate') {
        this.drawShogunateStageEffects(ctx, drawX, drawY, drawW, drawH, gy, this.trueUltStageAlpha);
      } else if (this.trueUltStageOverride === 'shogunate_inferno') {
        this.drawShogunateInfernoStageEffects(ctx, drawX, drawY, drawW, drawH, gy, this.trueUltStageAlpha);
      } else if (this.trueUltStageOverride === 'shogunate_glacial') {
        this.drawShogunateGlacialStageEffects(ctx, drawX, drawY, drawW, drawH, gy, this.trueUltStageAlpha);
      } else if (this.trueUltStageOverride === 'cob_monitor') {
        this.drawCobMonitorStageEffects(ctx, drawX, drawY, drawW, drawH, gy, this.trueUltStageAlpha, 'normal');
      } else if (this.trueUltStageOverride === 'cob_monitor_inferno') {
        this.drawCobMonitorStageEffects(ctx, drawX, drawY, drawW, drawH, gy, this.trueUltStageAlpha, 'inferno');
      } else if (this.trueUltStageOverride === 'cob_monitor_glacial') {
        this.drawCobMonitorStageEffects(ctx, drawX, drawY, drawW, drawH, gy, this.trueUltStageAlpha, 'glacial');
      } else if (this.trueUltStageOverride === 'sanctuary') {
        this.drawSanctuaryStageEffects(ctx, drawX, drawY, drawW, drawH, gy, this.trueUltStageAlpha);
      }
    }

    // Sweeping Crystalline Freeze-Wave Wipe: clips out the expanding central frozen radius across 16 jagged crystal bands!
    if (this.glacialWipeTimer > 0 && this.glacialWipeFromId && !this.adventureMode) {
      const fromMeta = this.getStageMetaById(this.glacialWipeFromId);
      const fromImg = PixelForge.ensureImage(
        (fromMeta && assets[fromMeta.assetKey]) || assets.arenaBg
      );
      const maxDur = Math.max(0.1, this.glacialWipeMaxTimer || 1.38);
      const p = Math.max(0, Math.min(1, 1 - this.glacialWipeTimer / maxDur));
      const easeP = 1 - Math.pow(1 - p, 2.15);
      const frontRadius = Math.round((easeP * 1460) / 4) * 4;
      const fadeAlpha = p < 0.78 ? 1.0 : Math.max(0, 1 - (p - 0.78) / 0.22);
      if (fadeAlpha > 0.01 && fromImg && fromImg.complete && fromImg.naturalWidth > 0) {
        const originX =
          Math.round(
            (Number.isFinite(this.glacialWipeFocusX) ? this.glacialWipeFocusX : ww * 0.5) / 4
          ) * 4;
        const leftBound = drawX - drawW - 600;
        const rightBound = drawX + drawW * 2 + 600;
        const bandTop = Math.round(gy - 1020);
        const bandBot = Math.round(gy + 420);
        const stepH = Math.round((bandBot - bandTop) / 16);

        ctx.save();
        ctx.beginPath();
        let hasClipRect = false;
        for (let b = 0; b < 16; b++) {
          const y0 = b === 0 ? -2600 : bandTop + b * stepH;
          const y1 = b === 15 ? gy + 2200 : bandTop + (b + 1) * stepH;
          const bh = Math.max(1, y1 - y0);
          const cutL = originX - (frontRadius + GLACIAL_WIPE_TOOTH_L[b] * 16);
          const cutR = originX + (frontRadius + GLACIAL_WIPE_TOOTH_R[b] * 16);
          if (cutL > leftBound) {
            ctx.rect(leftBound, y0, cutL - leftBound, bh);
            hasClipRect = true;
          }
          if (rightBound > cutR) {
            ctx.rect(cutR, y0, rightBound - cutR, bh);
            hasClipRect = true;
          }
        }
        if (hasClipRect) {
          ctx.clip();
          drawStageImageWithWings(fromImg, fadeAlpha);
        }
        ctx.restore();
      }
    }

    // Sweeping Cyber Digital Wipe for Fourth-Wall `cob_monitor` Stage Transition (`0` ctx.rotate!)
    if (this.cobWipeTimer > 0 && this.cobWipeFromId && !this.adventureMode) {
      const fromMeta = this.getStageMetaById(this.cobWipeFromId);
      const fromImg = PixelForge.ensureImage(
        (fromMeta && assets[fromMeta.assetKey]) || assets.arenaBg
      );
      const maxDur = Math.max(0.1, this.cobWipeMaxTimer || 1.28);
      const p = Math.max(0, Math.min(1, 1 - this.cobWipeTimer / maxDur));
      const easeP = 1 - Math.pow(1 - p, 2.2);
      const frontRadius = Math.round((easeP * 1460) / 4) * 4;
      const fadeAlpha = p < 0.78 ? 1.0 : Math.max(0, 1 - (p - 0.78) / 0.22);
      if (fadeAlpha > 0.01 && fromImg && fromImg.complete && fromImg.naturalWidth > 0) {
        const originX =
          Math.round(
            (Number.isFinite(this.cobWipeFocusX) ? this.cobWipeFocusX : ww * 0.5) / 4
          ) * 4;
        const leftBound = drawX - drawW - 600;
        const rightBound = drawX + drawW * 2 + 600;
        const bandTop = Math.round(gy - 1020);
        const bandBot = Math.round(gy + 420);
        const stepH = Math.round((bandBot - bandTop) / 16);

        ctx.save();
        ctx.beginPath();
        let hasClipRect = false;
        for (let b = 0; b < 16; b++) {
          const y0 = b === 0 ? -2600 : bandTop + b * stepH;
          const y1 = b === 15 ? gy + 2200 : bandTop + (b + 1) * stepH;
          const bh = Math.max(1, y1 - y0);
          const staggerL = ((b * 3 + 1) % 6) * 18;
          const staggerR = ((b * 5 + 2) % 6) * 18;
          const cutL = originX - (frontRadius + staggerL);
          const cutR = originX + (frontRadius + staggerR);
          if (cutL > leftBound) {
            ctx.rect(leftBound, y0, cutL - leftBound, bh);
            hasClipRect = true;
          }
          if (rightBound > cutR) {
            ctx.rect(cutR, y0, rightBound - cutR, bh);
            hasClipRect = true;
          }
        }
        if (hasClipRect) {
          ctx.clip();
          drawStageImageWithWings(fromImg, fadeAlpha);
        }
        ctx.restore();
      }
    }

    // Whole-Stage Diagonal Katana Slice Split: shears & separates the previous stage in two polygon-clipped halves!
    if (this.stageSliceTimer > 0) {
      const fromMeta = this.getStageMetaById(this.stageSliceFromId);
      const fromImg = PixelForge.ensureImage(
        (fromMeta && assets[fromMeta.assetKey]) || assets.arenaBg
      );
      const p = Math.max(
        0,
        Math.min(1, 1 - this.stageSliceTimer / Math.max(0.1, this.stageSliceMaxTimer || 1.08))
      );
      const halfAlpha = p < 0.58 ? 1.0 : Math.max(0, 1 - (p - 0.58) / 0.42);
      if (halfAlpha > 0.01 && fromImg && fromImg.complete && fromImg.naturalWidth > 0) {
        const sliceCx = Number.isFinite(this.stageSliceFocusX) ? this.stageSliceFocusX : ww * 0.5;
        const sliceCy = Number.isFinite(this.stageSliceFocusY) ? this.stageSliceFocusY : gy - 92;
        const dir = this.stageSliceDir === -1 ? -1 : 1;
        const slope = -0.26 * dir;
        const invLen = 1 / Math.hypot(1, slope);
        const tx = invLen * dir;
        const ty = slope * invLen * dir;
        const nx = -slope * invLen;
        const ny = invLen;

        const shear = p < 0.16 ? (p / 0.16) * 52 : 52 + ((p - 0.16) / 0.84) * 195;
        const sep = p < 0.16 ? 3 : 3 + Math.pow((p - 0.16) / 0.84, 2.05) * 610;
        const x0 = -2400;
        const x1 = ww + 2400;
        const cutY0 = sliceCy + (x0 - sliceCx) * slope;
        const cutY1 = sliceCy + (x1 - sliceCx) * slope;
        const isInfernoSlice = this.stageSliceToId === 'shogunate_inferno';
        const isGlacialSlice = this.stageSliceToId === 'shogunate_glacial';
        const rimOuter = isInfernoSlice ? '#f97316' : isGlacialSlice ? '#e879f9' : '#38bdf8';
        const rimInner = isInfernoSlice ? '#fef08a' : isGlacialSlice ? '#67e8f9' : '#ecfeff';

        for (let half = 0; half < 2; half++) {
          const sign = half === 0 ? -1 : 1;
          const shiftX = Math.round(sign * (tx * shear + nx * sep));
          const shiftY = Math.round(sign * (ty * shear + ny * sep));

          ctx.save();
          ctx.beginPath();
          if (half === 0) {
            ctx.moveTo(x0, -2600);
            ctx.lineTo(x1, -2600);
            ctx.lineTo(x1, cutY1 + shiftY);
            ctx.lineTo(x0, cutY0 + shiftY);
          } else {
            ctx.moveTo(x0, cutY0 + shiftY);
            ctx.lineTo(x1, cutY1 + shiftY);
            ctx.lineTo(x1, gy + 2200);
            ctx.lineTo(x0, gy + 2200);
          }
          ctx.closePath();
          ctx.clip();

          ctx.save();
          ctx.translate(shiftX, shiftY);
          drawStageImageWithWings(fromImg, halfAlpha);
          ctx.restore();

          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = halfAlpha * 0.82;
          ctx.strokeStyle = rimOuter;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(x0, cutY0 + shiftY);
          ctx.lineTo(x1, cutY1 + shiftY);
          ctx.stroke();

          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = halfAlpha * 0.96;
          ctx.strokeStyle = rimInner;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x0, cutY0 + shiftY);
          ctx.lineTo(x1, cutY1 + shiftY);
          ctx.stroke();

          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  getFlameOnlyLayer(bg) {
    if (this.flameOnlyCanvas) return this.flameOnlyCanvas;
    if (!bg || !bg.complete || !bg.naturalWidth) return null;

    const w = Math.min(bg.naturalWidth || 640, 640);
    const h = Math.min(bg.naturalHeight || 360, 360);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cCtx = c.getContext('2d');
    cCtx.drawImage(bg, 0, 0, w, h);

    const imgData = cCtx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        let alpha = 0;
        if (x < w * 0.42) {
          // Left side: isolate only the bright cyan/blue brazier flames (zero stone wall pixels)
          if (b > 165 && g > 125 && b - r > 55) {
            alpha = Math.min(255, Math.max(0, (b - 155) * 3.0));
          }
        } else if (x > w * 0.58) {
          // Left/Right solar brazier flames
          if (r > 180 && g > 105 && r - b > 65) {
            alpha = Math.min(255, Math.max(0, (r - 165) * 3.0));
          }
        }
        d[i + 3] = alpha;
      }
    }
    cCtx.putImageData(imgData, 0, 0);
    this.flameOnlyCanvas = c;
    return c;
  }

  getBoneyardFlameLayer(bg) {
    if (this.boneyardFlameCanvas) return this.boneyardFlameCanvas;
    if (!bg || !bg.complete || !bg.naturalWidth) return null;

    const w = Math.min(bg.naturalWidth || 640, 640);
    const h = Math.min(bg.naturalHeight || 360, 360);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cCtx = c.getContext('2d');
    cCtx.drawImage(bg, 0, 0, w, h);

    const imgData = cCtx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        let alpha = 0;
        // Isolate violet/magenta soul-fire flames on the 4 bone braziers
        if ((x < w * 0.28 || x > w * 0.72) && y > h * 0.30 && y < h * 0.58) {
          if (r > 145 && b > 155 && r + b - g * 2 > 110) {
            alpha = Math.min(255, Math.max(0, (Math.max(r, b) - 140) * 2.8));
          }
        }
        d[i + 3] = alpha;
      }
    }
    cCtx.putImageData(imgData, 0, 0);
    this.boneyardFlameCanvas = c;
    return c;
  }

  getSylvanWaterfallLayer(bg) {
    if (this.sylvanWaterfallCanvas) return this.sylvanWaterfallCanvas;
    if (!bg || !bg.complete || !bg.naturalWidth) return null;

    const w = Math.min(bg.naturalWidth || 640, 640);
    const h = Math.min(bg.naturalHeight || 360, 360);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cCtx = c.getContext('2d');
    cCtx.drawImage(bg, 0, 0, w, h);

    const imgData = cCtx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        let alpha = 0;
        if (x > w * 0.39 && x < w * 0.61 && y > h * 0.48 && y < h * 0.75) {
          if (g > 150 && b > 140 && g + b - r * 1.8 > 115) {
            alpha = Math.min(255, Math.max(0, (Math.max(g, b) - 145) * 2.4));
          }
        }
        d[i + 3] = alpha;
      }
    }
    cCtx.putImageData(imgData, 0, 0);
    this.sylvanWaterfallCanvas = c;
    return c;
  }

  getInfernoMagmaLayer(bg) {
    if (this.infernoMagmaCanvas) return this.infernoMagmaCanvas;
    if (!bg || !bg.complete || !bg.naturalWidth) return null;

    const w = Math.min(bg.naturalWidth || 640, 640);
    const h = Math.min(bg.naturalHeight || 360, 360);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cCtx = c.getContext('2d');
    cCtx.drawImage(bg, 0, 0, w, h);

    const imgData = cCtx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        let alpha = 0;
        if (r > 175 && g > 70 && r > b * 1.45) {
          alpha = Math.min(255, Math.max(0, (r - 165) * 2.8));
        }
        d[i + 3] = alpha;
      }
    }
    cCtx.putImageData(imgData, 0, 0);
    this.infernoMagmaCanvas = c;
    return c;
  }

  getShogunateInfernoFlameLayer(bg) {
    if (this.shogunateInfernoFlameCanvas) return this.shogunateInfernoFlameCanvas;
    if (!bg || !bg.complete || !bg.naturalWidth) return null;

    const w = Math.min(bg.naturalWidth || 640, 640);
    const h = Math.min(bg.naturalHeight || 360, 360);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cCtx = c.getContext('2d');
    cCtx.drawImage(bg, 0, 0, w, h);

    const imgData = cCtx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        let alpha = 0;
        if (r > 175 && g > 65 && r > b * 1.4) {
          alpha = Math.min(255, Math.max(0, (r - 165) * 2.7));
        }
        d[i + 3] = alpha;
      }
    }
    cCtx.putImageData(imgData, 0, 0);
    this.shogunateInfernoFlameCanvas = c;
    return c;
  }

  drawStagePixelFlames(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    // Exact measured brazier flame bounding boxes in arena_bg.png (normalized 0..1 coordinates)
    const braziers = [
      { cx: 0.0969, top: 0.415, bot: 0.618, w: 0.082, scale: 1.32, isBlue: true, seed: 1.1 },
      { cx: 0.2203, top: 0.525, bot: 0.655, w: 0.062, scale: 1.02, isBlue: true, seed: 2.7 },
      { cx: 0.3070, top: 0.588, bot: 0.690, w: 0.044, scale: 0.80, isBlue: true, seed: 4.3 },
      { cx: 0.7086, top: 0.602, bot: 0.690, w: 0.044, scale: 0.80, isBlue: false, seed: 5.9 },
      { cx: 0.7883, top: 0.545, bot: 0.660, w: 0.054, scale: 1.02, isBlue: false, seed: 7.4 },
      { cx: 0.9156, top: 0.445, bot: 0.620, w: 0.082, scale: 1.32, isBlue: false, seed: 9.0 }
    ];

    const t = this.time;
    const flameLayer = this.getFlameOnlyLayer(bg);
    const bgW = flameLayer ? flameLayer.width : 640;
    const bgH = flameLayer ? flameLayer.height : 360;

    // 0. Eclipse Rose-Window Corona Rays, Pulsing Solar Rim & Stained-Glass Lancet Backlights
    const eclipseX = drawX + drawW * 0.498;
    const eclipseY = drawY + drawH * 0.367;
    const eclipseR = 54;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.42 + 0.12 * Math.sin(t * 4.2);
    ctx.drawImage(this.glowGold, eclipseX - 280, eclipseY - 280, 560, 560);
    ctx.globalAlpha = 0.26 + 0.08 * Math.cos(t * 3.1);
    ctx.drawImage(this.glowOrange, eclipseX - 210, eclipseY - 210, 420, 420);
    // Cool stained-glass lancet wash on upper-left & warm solar wash on upper-right
    ctx.globalAlpha = 0.16 + 0.05 * Math.sin(t * 2.3);
    ctx.drawImage(this.glowCyan, drawX + drawW * 0.22 - 180, drawY + drawH * 0.18 - 140, 360, 280);
    ctx.drawImage(this.glowOrange, drawX + drawW * 0.78 - 180, drawY + drawH * 0.18 - 140, 360, 280);

    // Subtle rotating 12-spoke Eclipse Corona Rays & Baily's-Bead Rim Glints
    for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * Math.PI * 2 + t * 0.18;
      const spokePulse = 0.5 + 0.5 * Math.sin(t * 4.6 + k * 1.3);
      const inner = eclipseR - 2;
      const outer = eclipseR + 18 + spokePulse * 24;
      ctx.strokeStyle = k % 2 === 0 ? '#fde047' : '#fb923c';
      ctx.lineWidth = k % 3 === 0 ? 2.5 : 1.5;
      ctx.globalAlpha = 0.14 + 0.12 * spokePulse;
      ctx.beginPath();
      ctx.moveTo(eclipseX + Math.cos(ang) * inner, eclipseY + Math.sin(ang) * inner);
      ctx.lineTo(eclipseX + Math.cos(ang) * outer, eclipseY + Math.sin(ang) * outer);
      ctx.stroke();

      const bx = Math.round(eclipseX + Math.cos(ang + 0.12) * eclipseR);
      const by = Math.round(eclipseY + Math.sin(ang + 0.12) * eclipseR);
      ctx.globalAlpha = 0.35 + 0.35 * spokePulse;
      ctx.fillStyle = spokePulse > 0.7 ? '#ffffff' : '#fde047';
      ctx.fillRect(bx - 2, by - 2, 4, 4);
    }
    ctx.restore();

    // Rising Golden & Frost Sanctuary Censer Sparks below the Rose Window
    ctx.save();
    for (let j = 0; j < 16; j++) {
      const life = (t * (0.45 + (j % 3) * 0.12) + j * 0.41) % 1;
      const ox = Math.round((eclipseX + (j - 7.5) * 24 + Math.sin(t * 3.2 + j) * 10) / 4) * 4;
      const oy = Math.round((eclipseY + 95 - life * 170) / 4) * 4;
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.85;
      ctx.fillStyle = j % 4 === 0 ? '#7dd3fc' : j % 3 === 0 ? '#ffffff' : j % 2 === 0 ? '#fde047' : '#fb923c';
      ctx.fillRect(ox - 2, oy - 4, 4, 8);
      ctx.fillRect(ox - 4, oy - 2, 8, 4);
    }
    ctx.restore();

    for (const b of braziers) {
      const pal = b.isBlue ? CYAN_FIRE_PAL : SOLAR_FIRE_PAL;
      const glow = b.isBlue ? this.glowCyan : this.glowOrange;
      const worldCx = drawX + drawW * b.cx;
      const worldTop = drawY + drawH * b.top;
      const worldBot = drawY + drawH * b.bot;
      const worldMidY = (worldTop + worldBot) * 0.52;
      const flameH = worldBot - worldTop;
      const flameW = drawW * b.w;

      // 1. Real-Time Heat-Wave Slice Animation using the Isolated Transparent Flame Layer
      if (flameLayer) {
        const strips = 14;
        const srcX = (b.cx - b.w * 0.5) * bgW;
        const srcW = b.w * bgW;
        const srcTop = b.top * bgH;
        const srcH = (b.bot - b.top) * bgH;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.52 + 0.22 * Math.sin(t * 11 + b.seed);
        for (let s = 0; s < strips; s++) {
          const ratio = 1 - s / strips;
          const sy = srcTop + (s / strips) * srcH;
          const sh = srcH / strips + 0.5;
          const dy = worldTop + (s / strips) * flameH;
          const dh = flameH / strips + 1;

          const wave = Math.round(
            Math.sin(t * 11.5 + s * 0.65 + b.seed) * (ratio * 6.5 * b.scale)
          );
          ctx.drawImage(
            flameLayer,
            srcX,
            sy,
            srcW,
            sh,
            Math.round(worldCx - flameW * 0.5 + wave),
            Math.round(dy - ratio * 6 * b.scale),
            Math.round(flameW),
            Math.round(dh)
          );
        }
        ctx.restore();
      }

      // 2. Volumetric Saturated Point-Light Halo & Wet Stone Floor Reflection Pool
      const pulse = Math.sin(t * 7.5 + b.seed) * 18 * b.scale;
      const glowR = 145 * b.scale + pulse;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.44;
      ctx.drawImage(glow, worldCx - glowR, worldMidY - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 0.30;
      ctx.drawImage(glow, worldCx - glowR * 0.76, gy - 28, glowR * 1.52, 104 * b.scale);
      ctx.restore();

      // 3. Roaring Pixel-Art Flame Tongues & High-Rising Glowing Ember Trails
      ctx.save();
      const emberCount = 18;
      for (let e = 0; e < emberCount; e++) {
        const life = (t * (1.15 + (e % 4) * 0.28) + b.seed + e * 1.17) % 1;
        const spread = (((e * 29) % 13) - 6) * 0.095 * flameW;
        const sway = Math.sin(t * 8.5 + e * 1.9 + b.seed) * (9 * b.scale * life);
        const ex = Math.round((worldCx + spread * (1 - life * 0.45) + sway) / 4) * 4;
        const ey = Math.round((worldBot - flameH * (0.22 + life * 1.42)) / 4) * 4;
        const pxSz = life < 0.28 ? 8 : life < 0.62 ? 6 : 4;
        const fade = Math.max(0, 1 - life * 0.88);

        if (e % 2 === 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.38;
          ctx.drawImage(glow, ex - 18, ey - 18, 36, 36);
        }
        ctx.globalCompositeOperation = 'source-over';
        // Rising 2-step pixel ember wake
        ctx.globalAlpha = fade * 0.48;
        ctx.fillStyle = pal[1];
        ctx.fillRect(ex - 2, ey + pxSz * 0.5, 4, 6);
        ctx.globalAlpha = fade * 0.95;
        ctx.fillStyle = life < 0.25 ? '#ffffff' : life < 0.55 ? pal[3] : life < 0.8 ? pal[2] : pal[1];
        ctx.fillRect(ex - pxSz * 0.5, ey - pxSz * 0.5, pxSz, pxSz);
      }
      ctx.restore();
    }

    // 4. Rich Warm/Cool Dual-Elemental (Frost-Cyan vs Solar-Gold) Cathedral Floor Reflection Pools
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const altarCx = drawX + drawW * 0.50;
    ctx.globalAlpha = 0.26 + 0.08 * Math.sin(t * 3.8);
    ctx.drawImage(this.glowCyan, altarCx - 420, gy - 22, 390, 68);
    ctx.drawImage(this.glowGold, altarCx + 30, gy - 22, 390, 68);
    ctx.globalAlpha = 0.16 + 0.05 * Math.cos(t * 3.1);
    ctx.drawImage(this.glowOrange, altarCx + 180, gy + 12, 340, 72);
    ctx.drawImage(this.glowCyan, altarCx - 520, gy + 12, 340, 72);
    ctx.restore();
  }

  drawSylvanStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    const t = this.time;
    const waterfallLayer = this.getSylvanWaterfallLayer(bg);

    // 0. Smooth Volumetric Aurora Borealis Sky Veil
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let lobe = 0; lobe < 5; lobe++) {
      const u = lobe / 4;
      const ax = drawX + drawW * (0.20 + u * 0.60) + Math.sin(t * 1.1 + lobe * 1.4) * 28;
      const ay = drawY + drawH * 0.14 + Math.cos(t * 0.9 + lobe * 1.1) * 12;
      const glow = lobe % 2 === 0 ? this.glowEmerald : this.glowCyan;
      ctx.globalAlpha = 0.22 + 0.07 * Math.sin(t * 2.4 + lobe);
      ctx.drawImage(glow, ax - 190, ay - 75, 380, 150);
    }
    ctx.restore();

    // 1. Soft Crescent Moon Volumetric Glow
    const moonX = drawX + drawW * 0.50;
    const moonY = drawY + drawH * 0.25;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.34 + 0.08 * Math.sin(t * 3.2);
    ctx.drawImage(this.glowEmerald, moonX - 240, moonY - 240, 480, 480);
    ctx.globalAlpha = 0.24 + 0.06 * Math.cos(t * 2.5);
    ctx.drawImage(this.glowCyan, moonX - 180, moonY - 180, 360, 360);
    ctx.restore();

    // 2. Animated Waterfall Shimmer Strips, Plunge-Pool Mist Spray Halo & Foaming Cascade Droplets
    const fallsLeft = drawX + drawW * 0.405;
    const fallsW = drawW * 0.192;
    const fallsTop = drawY + drawH * 0.505;
    const fallsBot = drawY + drawH * 0.732;
    const fallsH = fallsBot - fallsTop;

    if (waterfallLayer) {
      const wfW = waterfallLayer.width;
      const wfH = waterfallLayer.height;
      const strips = 14;
      const srcX = wfW * 0.405;
      const srcW = wfW * 0.192;
      const srcTop = wfH * 0.505;
      const srcH = wfH * 0.227;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.36 + 0.10 * Math.sin(t * 6.4);
      for (let s = 0; s < strips; s++) {
        const flow = (s / strips + t * 0.55) % 1;
        const sy = srcTop + ((s / strips) * srcH);
        const sh = srcH / strips + 0.6;
        const dy = fallsTop + (s / strips) * fallsH;
        const dh = fallsH / strips + 1.2;
        const shimmerX = Math.round(Math.sin(t * 8.5 + s * 0.9) * 3);
        const dropY = Math.round(Math.sin(flow * Math.PI * 2) * 3);
        ctx.drawImage(
          waterfallLayer,
          srcX,
          sy,
          srcW,
          sh,
          Math.round(fallsLeft + shimmerX),
          Math.round(dy + dropY),
          Math.round(fallsW),
          Math.round(dh)
        );
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.36 + 0.09 * Math.sin(t * 5);
    ctx.drawImage(this.glowCyan, fallsLeft - 45, fallsBot - 68, fallsW + 90, 138);
    ctx.globalAlpha = 0.26 + 0.06 * Math.cos(t * 4.2);
    ctx.drawImage(this.glowEmerald, fallsLeft - 14, fallsTop - 20, fallsW + 28, fallsH + 44);
    // Drifting Mist Spray Cloud Puffs rising from plunge pool
    for (let m = 0; m < 5; m++) {
      const mx = fallsLeft + (m / 4) * fallsW + Math.sin(t * 1.9 + m * 1.6) * 20;
      const my = fallsBot - 8 - Math.abs(Math.sin(t * 1.4 + m)) * 18;
      ctx.globalAlpha = 0.18 + 0.06 * Math.sin(t * 3.1 + m);
      ctx.drawImage(m % 2 === 0 ? this.glowCyan : this.glowWhite, mx - 58, my - 26, 116, 52);
    }

    for (let s = 0; s < 18; s++) {
      const streamX = fallsLeft + (s / 17) * fallsW + Math.sin(t * 3.2 + s * 1.9) * 5;
      const dropPhase = (t * (1.25 + (s % 4) * 0.18) + s * 0.21) % 1;
      const dx = Math.round(streamX);
      const dy = Math.round(fallsTop + dropPhase * fallsH);
      const fade = Math.sin(dropPhase * Math.PI);
      const glow = s % 2 === 0 ? this.glowCyan : this.glowEmerald;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.35;
      ctx.drawImage(glow, dx - 14, dy - 18, 28, 36);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.85;
      ctx.fillStyle = s % 3 === 0 ? '#ffffff' : s % 2 === 0 ? '#7dd3fc' : '#6ee7b7';
      ctx.fillRect(dx - 1, dy - 3, 3, 6);
    }
    ctx.restore();

    // 2.5. Glowing Floor Rune Pulse Rings & Ley-Band Shimmer on the Wet Sanctuary Flagstones
    ctx.save();
    const runeCx = drawX + drawW * 0.50;
    const runePulse = 0.5 + 0.5 * Math.sin(t * 3.0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.16 + 0.10 * runePulse;
    ctx.beginPath();
    ctx.ellipse(runeCx, gy + 30, 210 + runePulse * 8, 22 + runePulse * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#38bdf8';
    ctx.globalAlpha = 0.14 + 0.08 * (1 - runePulse);
    ctx.beginPath();
    ctx.ellipse(runeCx, gy + 30, 145, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let r = 0; r < 10; r++) {
      const rx = Math.round(runeCx + (r - 4.5) * 92);
      const ry = gy + (r % 2 === 0 ? 12 : 48);
      const rFade = 0.35 + 0.45 * Math.sin(t * 4.2 + r * 1.1);
      ctx.globalAlpha = rFade * 0.36;
      ctx.fillStyle = r % 2 === 0 ? '#6ee7b7' : '#7dd3fc';
      ctx.fillRect(rx - 4, ry, 8, 2);
    }
    ctx.restore();

    // 3. 6 Hanging Bioluminescent Crystal Lanterns & Swarming Glowing Forest Fireflies with Trails
    const lanterns = [
      { cx: 0.064, cy: 0.33, scale: 1.25, isCyan: false, seed: 1.1 },
      { cx: 0.150, cy: 0.41, scale: 1.05, isCyan: true, seed: 2.4 },
      { cx: 0.223, cy: 0.31, scale: 0.90, isCyan: false, seed: 3.8 },
      { cx: 0.775, cy: 0.31, scale: 0.90, isCyan: true, seed: 5.2 },
      { cx: 0.848, cy: 0.41, scale: 1.05, isCyan: false, seed: 6.7 },
      { cx: 0.935, cy: 0.33, scale: 1.25, isCyan: true, seed: 8.1 }
    ];

    for (const l of lanterns) {
      const lx = drawX + drawW * l.cx;
      const ly = drawY + drawH * l.cy;
      const pal = l.isCyan ? CYAN_FIRE_PAL : EMERALD_FIRE_PAL;
      const glow = l.isCyan ? this.glowCyan : this.glowEmerald;
      const glowR = (130 + Math.sin(t * 5.5 + l.seed) * 16) * l.scale;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.42;
      ctx.drawImage(glow, lx - glowR, ly - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 0.26;
      ctx.drawImage(glow, lx - glowR * 0.68, gy - 24, glowR * 1.36, 88 * l.scale);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = pal[2];
      ctx.fillRect(Math.round(lx) - 4, Math.round(ly) - 4, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(lx) - 2, Math.round(ly) - 2, 4, 4);

      for (let e = 0; e < 8; e++) {
        const life = (t * (0.85 + (e % 3) * 0.22) + l.seed + e * 1.19) % 1;
        const sx = Math.round(lx + Math.sin(t * 4.2 + e * 2.1 + l.seed) * (32 * l.scale));
        const sy = Math.round(ly + 22 - life * (95 * l.scale));
        const prevSx = Math.round(lx + Math.sin((t - 0.06) * 4.2 + e * 2.1 + l.seed) * (32 * l.scale));
        const prevSy = sy + 5;
        const fade = Math.max(0, 1 - life * 0.85);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.36;
        ctx.drawImage(glow, sx - 14, sy - 14, 28, 28);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.45;
        ctx.fillStyle = pal[2];
        ctx.fillRect(prevSx - 1, prevSy - 1, 2, 2);
        ctx.globalAlpha = fade * 0.92;
        ctx.fillStyle = e % 3 === 0 ? '#fef08a' : life < 0.45 ? pal[3] : pal[1];
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      }
      ctx.restore();
    }

    // 4. Drifting Wind-Swept Bioluminescent Star-Petals
    ctx.save();
    for (let p = 0; p < 22; p++) {
      const u = (t * (0.14 + (p % 3) * 0.04) + p * 0.17) % 1;
      const px = Math.round(drawX + drawW * (0.08 + u * 0.84));
      const py = Math.round(
        drawY +
          drawH * (0.22 + ((p * 0.19 + u * 0.55) % 0.58)) +
          Math.sin(t * 3.5 + p * 1.7) * 18
      );
      const gTex = p % 3 === 0 ? this.glowGold : p % 2 === 0 ? this.glowEmerald : this.glowCyan;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32;
      ctx.drawImage(gTex, px - 14, py - 14, 28, 28);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.90;
      ctx.fillStyle = p % 3 === 0 ? '#fef08a' : p % 2 === 0 ? '#6ee7b7' : '#7dd3fc';
      ctx.fillRect(px - 3, py - 1, 5, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
    ctx.restore();
  }

  drawBoneyardStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    const t = this.time;

    // 0. Breathing Blood-Moon Atmospheric Horizon Pulse & Distant Spire Lightning Glint
    const moonPulse = 0.22 + 0.12 * Math.sin(t * 2.1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = moonPulse;
    ctx.drawImage(this.glowViolet, drawX + drawW * 0.25, drawY + drawH * 0.02, drawW * 0.5, drawH * 0.45);

    // Occasional Distant Necropolis Spire Lightning Glint (upper sky only, zero fighter washout)
    const boltCycle = (t * 0.24) % 1;
    if (boltCycle > 0.925) {
      const flash = Math.sin(((boltCycle - 0.925) / 0.075) * Math.PI);
      const isRightSpire = Math.floor(t * 0.24) % 2 === 1;
      const bx = drawX + drawW * (isRightSpire ? 0.68 : 0.31);
      const by = drawY + drawH * 0.08;
      ctx.globalAlpha = flash * 0.28;
      ctx.drawImage(this.glowViolet, bx - 160, by - 40, 320, 240);
      ctx.strokeStyle = '#f5d0fe';
      ctx.lineWidth = 2;
      ctx.globalAlpha = flash * 0.55;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - 12, by + 42);
      ctx.lineTo(bx + 8, by + 76);
      ctx.lineTo(bx - 6, by + 128);
      ctx.stroke();
    }
    ctx.restore();

    // 1. 4 Flickering Abyssal Soul-Fire Braziers on the Necropolis Bone Pillars
    const braziers = [
      { cx: 0.075, top: 0.36, bot: 0.50, w: 0.065, scale: 1.25, seed: 1.2 },
      { cx: 0.198, top: 0.43, bot: 0.54, w: 0.052, scale: 0.95, seed: 2.8 },
      { cx: 0.798, top: 0.43, bot: 0.54, w: 0.052, scale: 0.95, seed: 4.5 },
      { cx: 0.922, top: 0.36, bot: 0.50, w: 0.065, scale: 1.25, seed: 6.1 }
    ];

    const flameLayer = this.getBoneyardFlameLayer(bg);
    const bgW = flameLayer ? flameLayer.width : 640;
    const bgH = flameLayer ? flameLayer.height : 360;

    for (const b of braziers) {
      const worldCx = drawX + drawW * b.cx;
      const worldTop = drawY + drawH * b.top;
      const worldBot = drawY + drawH * b.bot;
      const worldMidY = (worldTop + worldBot) * 0.52;
      const flameH = worldBot - worldTop;
      const flameW = drawW * b.w;

      if (flameLayer) {
        const strips = 12;
        const srcX = (b.cx - b.w * 0.5) * bgW;
        const srcW = b.w * bgW;
        const srcTop = b.top * bgH;
        const srcH = (b.bot - b.top) * bgH;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.54 + 0.20 * Math.sin(t * 10 + b.seed);
        for (let s = 0; s < strips; s++) {
          const ratio = 1 - s / strips;
          const sy = srcTop + (s / strips) * srcH;
          const sh = srcH / strips + 0.5;
          const dy = worldTop + (s / strips) * flameH;
          const dh = flameH / strips + 1;
          const wave = Math.round(Math.sin(t * 11 + s * 0.65 + b.seed) * (ratio * 6.5 * b.scale));
          ctx.drawImage(
            flameLayer,
            srcX,
            sy,
            srcW,
            sh,
            Math.round(worldCx - flameW * 0.5 + wave),
            Math.round(dy - ratio * 5 * b.scale),
            Math.round(flameW),
            Math.round(dh)
          );
        }
        ctx.restore();
      }

      const glowR = (145 + Math.sin(t * 7 + b.seed) * 18) * b.scale;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.44;
      ctx.drawImage(this.glowViolet, worldCx - glowR, worldMidY - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 0.28;
      ctx.drawImage(this.glowViolet, worldCx - glowR * 0.72, gy - 26, glowR * 1.44, 96 * b.scale);
      ctx.restore();

      // Dancing Crimson-Violet Soul-Fire Pixel Embers & Curling Wisps
      ctx.save();
      for (let e = 0; e < 16; e++) {
        const life = (t * (1.2 + (e % 3) * 0.28) + b.seed + e * 1.31) % 1;
        const spread = (((e * 23) % 11) - 5) * 0.11 * flameW;
        const sway = Math.sin(t * 8.8 + e * 1.7 + b.seed) * (10 * b.scale * life);
        const ex = Math.round(worldCx + spread * (1 - life * 0.5) + sway);
        const ey = Math.round(worldBot - flameH * (0.22 + life * 1.35));
        const pxSz = life < 0.35 ? 5 : life < 0.72 ? 4 : 3;
        const fade = Math.max(0, 0.96 - life * 0.85);
        if (e % 2 === 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.36;
          ctx.drawImage(this.glowViolet, ex - 16, ey - 16, 32, 32);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.45;
        ctx.fillStyle = ABYSSAL_FIRE_PAL[1];
        ctx.fillRect(ex - 1, ey + pxSz * 0.5, 2, 5);
        ctx.globalAlpha = fade;
        ctx.fillStyle =
          life < 0.22
            ? '#ffffff'
            : life < 0.52
              ? ABYSSAL_FIRE_PAL[3]
              : life < 0.78
                ? ABYSSAL_FIRE_PAL[2]
                : ABYSSAL_FIRE_PAL[1];
        ctx.fillRect(ex - pxSz * 0.5, ey - pxSz * 0.5, pxSz, pxSz);
      }
      ctx.restore();
    }

    // 2. Blood-Crimson & Royal-Purple Eclipse Moon Corona Ring
    const moonX = drawX + drawW * 0.498;
    const moonY = drawY + drawH * 0.264;
    const moonR = Math.round(drawW * 0.101);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.38 + 0.10 * Math.sin(t * 3.8);
    ctx.drawImage(this.glowViolet, moonX - 250, moonY - 250, 500, 500);
    if (this.glowCrimson) {
      ctx.globalAlpha = 0.26 + 0.08 * Math.cos(t * 3.1);
      ctx.drawImage(this.glowCrimson, moonX - 220, moonY - 220, 440, 440);
    }
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 4.4);
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.22 + 0.08 * Math.cos(t * 3.6);
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2.5. Low-Rolling Violet & Crimson Crypt Ground-Mist Ribbons along `gy`
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let m = 0; m < 7; m++) {
      const drift = ((t * 28 + m * 210) % (drawW * 0.92)) - drawW * 0.46;
      const mx = drawX + drawW * 0.5 + drift;
      const my = gy - 8 + (m % 3) * 14 + Math.sin(t * 1.8 + m) * 5;
      const mistGlow = m % 3 === 0 && this.glowCrimson ? this.glowCrimson : this.glowViolet;
      ctx.globalAlpha = 0.12 + 0.05 * Math.sin(t * 2.2 + m * 1.3);
      ctx.drawImage(mistGlow, mx - 185, my - 26, 370, 52);
    }
    ctx.restore();

    // 3. Rising Spectral Wraith Wisps with Soft Volumetric Glow Halos
    ctx.save();
    for (let w = 0; w < 18; w++) {
      const life = (t * (0.44 + (w % 3) * 0.14) + w * 0.67) % 1;
      const wx = drawX + drawW * (0.10 + (w / 17) * 0.80) + Math.sin(t * 3.4 + w * 1.9) * 32;
      const wy = gy + 14 - life * 290;
      const rx = Math.round(wx);
      const ry = Math.round(wy);
      const fade = Math.sin(life * Math.PI);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.44;
      ctx.drawImage(this.glowViolet, rx - 22, ry - 22, 44, 44);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.90;
      ctx.fillStyle = w % 3 === 0 ? '#e11d48' : '#a855f7';
      ctx.fillRect(rx - 2, ry - 2, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 1, ry - 1, 3, 3);
    }
    ctx.restore();
  }

  drawClocktowerStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    const t = this.time;

    // 0. Occasional Shooting Stars streaking across the Upper Starry Observatory Arches (`y = 0.08..0.28`)
    ctx.save();
    for (let s = 0; s < 2; s++) {
      const period = (t * (0.28 + s * 0.09) + s * 0.53) % 1;
      if (period < 0.24) {
        const u = period / 0.24;
        const archBaseX = s === 0 ? drawX + drawW * 0.25 : drawX + drawW * 0.64;
        const sx = archBaseX + u * (drawW * 0.10);
        const sy = drawY + drawH * (0.10 + s * 0.05) + u * (drawH * 0.11);
        const sFade = Math.sin(u * Math.PI);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = s === 0 ? '#5eead4' : '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = sFade * 0.72;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 28, sy - 18);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = sFade * 0.95;
        ctx.fillRect(Math.round(sx) - 2, Math.round(sy) - 2, 4, 4);
      }
    }
    ctx.restore();

    // 1. Central Astronomical Stained-Glass Clock Dial with Counter-Rotating Celestial Astrolabe Rings & Tapered Hands
    const clockX = drawX + drawW * 0.502;
    const clockY = drawY + drawH * 0.315;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.38 + 0.10 * Math.sin(t * 3.6);
    ctx.drawImage(this.glowTeal, clockX - 250, clockY - 250, 500, 500);
    ctx.globalAlpha = 0.28 + 0.08 * Math.cos(t * 2.8);
    ctx.drawImage(this.glowGold, clockX - 190, clockY - 190, 380, 380);

    // Counter-Rotating Astrolabe Rings & Orbiting Celestial Nodes
    for (let ring = 0; ring < 2; ring++) {
      const rAst = ring === 0 ? 112 : 154;
      const rot = ring === 0 ? t * 0.32 : -t * 0.21;
      ctx.strokeStyle = ring === 0 ? '#2dd4bf' : '#facc15';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.26 + 0.08 * Math.sin(t * 3.0 + ring);
      for (let arcIdx = 0; arcIdx < 4; arcIdx++) {
        const a0 = rot + (arcIdx * Math.PI) / 2 + 0.14;
        ctx.beginPath();
        ctx.arc(clockX, clockY, rAst, a0, a0 + Math.PI * 0.34);
        ctx.stroke();
        const nx = Math.round(clockX + Math.cos(a0 - 0.07) * rAst);
        const ny = Math.round(clockY + Math.sin(a0 - 0.07) * rAst);
        ctx.fillStyle = ring === 0 ? '#99f6e4' : '#fef08a';
        ctx.fillRect(nx - 2, ny - 2, 4, 4);
      }
    }
    ctx.restore();

    ctx.save();
    const secAngle = Math.floor(t * 6) * ((Math.PI * 2) / 24) - Math.PI * 0.5;
    const minAngle = t * 0.85 - Math.PI * 0.5;
    const hourAngle = t * 0.18 - Math.PI * 0.25;

    const drawTaperedHand = (angle, len, baseW, col, coreCol) => {
      ctx.save();
      ctx.translate(clockX, clockY);
      ctx.rotate(angle);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(0, -baseW);
      ctx.lineTo(len, 0);
      ctx.lineTo(0, baseW);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = coreCol;
      ctx.beginPath();
      ctx.moveTo(0, -baseW * 0.45);
      ctx.lineTo(len * 0.88, 0);
      ctx.lineTo(0, baseW * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    drawTaperedHand(hourAngle, 58, 4.5, '#eab308', '#fef08a');
    drawTaperedHand(minAngle, 84, 3.5, '#14b8a6', '#5eead4');
    drawTaperedHand(secAngle, 92, 2.0, '#fde047', '#ffffff');

    // Central clockwork pivot boss
    ctx.fillStyle = '#fde047';
    ctx.fillRect(Math.round(clockX) - 5, Math.round(clockY) - 5, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(clockX) - 2, Math.round(clockY) - 2, 4, 4);
    ctx.restore();

    // 2. 6 Pulsing Aether-Teal & Imperial-Gold Observatory Lanterns + Anti-Gravity Time-Sand Motes
    const lanterns = [
      { cx: 0.075, cy: 0.36, scale: 1.20, isTeal: true, seed: 1.3 },
      { cx: 0.176, cy: 0.42, scale: 1.00, isTeal: false, seed: 2.6 },
      { cx: 0.254, cy: 0.38, scale: 0.90, isTeal: false, seed: 3.9 },
      { cx: 0.745, cy: 0.38, scale: 0.90, isTeal: false, seed: 5.1 },
      { cx: 0.822, cy: 0.42, scale: 1.00, isTeal: true, seed: 6.4 },
      { cx: 0.922, cy: 0.36, scale: 1.20, isTeal: false, seed: 7.8 }
    ];

    for (const l of lanterns) {
      const lx = drawX + drawW * l.cx;
      const ly = drawY + drawH * l.cy;
      const glow = l.isTeal ? this.glowTeal : this.glowGold;
      const pal = l.isTeal ? CHRONO_FIRE_PAL : RADIANT_FIRE_PAL;
      const glowR = (132 + Math.sin(t * 6.5 + l.seed) * 16) * l.scale;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.42;
      ctx.drawImage(glow, lx - glowR, ly - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 0.26;
      ctx.drawImage(glow, lx - glowR * 0.68, gy - 24, glowR * 1.36, 90 * l.scale);
      ctx.restore();

      ctx.save();
      for (let e = 0; e < 10; e++) {
        const life = (t * (1.15 + (e % 3) * 0.25) + l.seed + e * 1.4) % 1;
        const ex = Math.round(lx + Math.sin(t * 6 + e * 2.1 + l.seed) * (20 * l.scale));
        const ey = Math.round(ly + 14 - life * (84 * l.scale));
        const fade = Math.max(0, 0.95 - life * 0.85);
        if (e % 2 === 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.35;
          ctx.drawImage(glow, ex - 15, ey - 15, 30, 30);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade;
        ctx.fillStyle = life < 0.3 ? '#ffffff' : life < 0.65 ? pal[3] : pal[2];
        ctx.fillRect(ex - 2, ey - 2, 4, 4);
      }
      ctx.restore();
    }

    // 3. Glowing Zodiac Floor Ticks & Rising Anti-Gravity Golden Chrono-Dust
    ctx.save();
    const floorCx = drawX + drawW * 0.50;
    const floorCy = gy + 44;
    const activeHour = Math.floor(t * 3) % 12;
    for (let z = 0; z < 12; z++) {
      const za = (z / 12) * Math.PI * 2 + t * 0.08;
      const zx = Math.round(floorCx + Math.cos(za) * 245);
      const zy = Math.round(floorCy + Math.sin(za) * 34);
      const isLit = z === activeHour || z === (activeHour + 6) % 12;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = isLit ? 0.55 : 0.22;
      ctx.fillStyle = z % 2 === 0 ? '#fde047' : '#2dd4bf';
      ctx.fillRect(zx - 3, zy - 1, 6, 3);
    }

    for (let n = 0; n < 18; n++) {
      const life = (t * (0.55 + (n % 3) * 0.15) + n * 0.37) % 1;
      const nx = Math.round(floorCx + (n - 8.5) * 38 + Math.sin(t * 2.5 + n) * 10);
      const ny = Math.round(gy + 16 - life * 105);
      const fade = Math.sin(life * Math.PI);
      const glow = n % 2 === 0 ? this.glowGold : this.glowTeal;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.34;
      ctx.drawImage(glow, nx - 12, ny - 12, 24, 24);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.88;
      ctx.fillStyle = n % 2 === 0 ? '#fde047' : '#2dd4bf';
      ctx.fillRect(nx - 2, ny - 2, 3, 4);
    }
    ctx.restore();
  }

  /**
   * Live HD-2D Stage Effects for "CELESTIAL SANCTUARY OF JUSTICE" (`arena_sanctuary.png`)
   */
  drawSanctuaryStageEffects(ctx, drawX, drawY, drawW, drawH, gy, alpha = 1.0) {
    const t = this.time;
    const sanctuaryCx = drawX + drawW * 0.50;
    const roseY = drawY + drawH * 0.32;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 0. High-Altitude Drifting Cloud-Sea Wisps past the Flanking Marble Colonnades
    ctx.globalCompositeOperation = 'lighter';
    for (let c = 0; c < 6; c++) {
      const isLeft = c < 3;
      const localIdx = c % 3;
      const drift = Math.sin(t * 0.65 + c * 1.4) * 26;
      const cloudX =
        drawX + drawW * (isLeft ? 0.08 + localIdx * 0.08 : 0.76 + localIdx * 0.08) + drift;
      const cloudY = drawY + drawH * (0.54 + (localIdx % 2) * 0.08);
      const cGlow = localIdx % 2 === 0 ? this.glowWhite : this.glowCyan;
      if (cGlow) {
        ctx.globalAlpha = (0.16 + 0.05 * Math.sin(t * 1.6 + c)) * alpha;
        ctx.drawImage(cGlow, cloudX - 150, cloudY - 48, 300, 96);
      }
    }

    // 1. Radiant Celestial Rose-Window & Sapphire-Gold Sky Halo
    ctx.globalAlpha = (0.46 + 0.12 * Math.sin(t * 3.8)) * alpha;
    if (this.glowCyan) ctx.drawImage(this.glowCyan, sanctuaryCx - 360, roseY - 260, 720, 520);
    ctx.globalAlpha = (0.36 + 0.10 * Math.cos(t * 3.1)) * alpha;
    if (this.glowWhite) ctx.drawImage(this.glowWhite, sanctuaryCx - 260, roseY - 200, 520, 400);
    ctx.globalAlpha = (0.28 + 0.08 * Math.sin(t * 2.4)) * alpha;
    if (this.glowGold) ctx.drawImage(this.glowGold, sanctuaryCx - 210, roseY - 160, 420, 320);

    // 2. 5 Soft Diagonal Heavenly Sanctuary God-Ray Shafts Streaming Down from the Sky Breach
    if (!this._sanctuaryRayGradCache) this._sanctuaryRayGradCache = new Map();
    for (let i = -2; i <= 2; i++) {
      const topX = sanctuaryCx - 80 + i * 105;
      const midBotX = sanctuaryCx + 40 + i * 165;
      const botX = midBotX + Math.sin(t * 1.8 + i) * 18;
      const rayW = i === 0 ? 92 : 64;
      const gradKey = `${sanctuaryCx}:${drawY}:${gy}:${i}`;
      let rayGrad = this._sanctuaryRayGradCache.get(gradKey);
      if (!rayGrad) {
        if (this._sanctuaryRayGradCache.size >= 15) this._sanctuaryRayGradCache.clear();
        rayGrad = ctx.createLinearGradient(topX, drawY + 30, midBotX, gy + 12);
        rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        rayGrad.addColorStop(0.22, i === 0 ? 'rgba(255, 255, 255, 0.28)' : 'rgba(125, 211, 252, 0.20)');
        rayGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.10)');
        rayGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        this._sanctuaryRayGradCache.set(gradKey, rayGrad);
      }
      ctx.globalAlpha = alpha * (0.72 + 0.22 * Math.sin(t * 3.2 + i * 1.3));
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(topX - rayW * 0.45, drawY + 30);
      ctx.lineTo(topX + rayW * 0.45, drawY + 30);
      ctx.lineTo(botX + rayW * 0.85, gy + 12);
      ctx.lineTo(botX - rayW * 0.85, gy + 12);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Consecrated Sapphire & Imperial-Gold Runic Floor Seal Circles across the Marble Floor
    const sealPulse = 0.5 + 0.5 * Math.sin(t * 3.4);
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.globalAlpha = (0.20 + 0.10 * sealPulse) * alpha;
    ctx.beginPath();
    ctx.ellipse(sanctuaryCx, gy + 34, 290, 32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = (0.18 + 0.08 * (1 - sealPulse)) * alpha;
    ctx.beginPath();
    ctx.ellipse(sanctuaryCx, gy + 34, 185, 20, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (let k = -2; k <= 2; k++) {
      const poolX = sanctuaryCx + k * 210;
      const glow = k % 2 === 0 ? this.glowCyan : this.glowGold;
      if (glow) {
        ctx.globalAlpha = (0.30 + 0.09 * Math.sin(t * 4.5 + k)) * alpha;
        ctx.drawImage(glow, poolX - 160, gy - 26, 320, 68);
      }
    }

    // 4. Gentle Falling Pixel Seraphic Feathers & Ascending Sacred Censer Motes
    for (let f = 0; f < 18; f++) {
      const fall = (t * (0.18 + (f % 4) * 0.04) + f * 0.23) % 1;
      const fx = Math.round(
        (sanctuaryCx + (f - 8.5) * 62 + Math.sin(t * 2.1 + f * 1.5) * 26) / 2
      ) * 2;
      const fy = Math.round((drawY + drawH * 0.18 + fall * (gy - drawY - drawH * 0.14)) / 2) * 2;
      const fFade = Math.sin(fall * Math.PI) * alpha;
      const tilt = Math.sin(t * 3.0 + f) > 0 ? 1 : -1;
      if (f % 2 === 0 && this.glowCyan) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fFade * 0.28;
        ctx.drawImage(this.glowCyan, fx - 14, fy - 14, 28, 28);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fFade * 0.90;
      ctx.fillStyle = f % 3 === 0 ? '#fef08a' : '#bae6fd';
      ctx.fillRect(fx - 3 * tilt, fy - 2, 6, 3);
      ctx.fillRect(fx - 1 * tilt, fy + 1, 5, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fx - 2 * tilt, fy - 1, 4, 2);
    }

    for (let m = 0; m < 18; m++) {
      const life = (t * (0.65 + (m % 4) * 0.16) + m * 0.29) % 1;
      const mx = Math.round((sanctuaryCx + (m - 8.5) * 54 + Math.sin(t * 3.4 + m) * 14) / 3) * 3;
      const my = Math.round((gy - 8 - life * 360) / 3) * 3;
      const fade = Math.sin(life * Math.PI) * alpha;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.88;
      ctx.fillStyle = m % 3 === 0 ? '#fef08a' : m % 2 === 0 ? '#ffffff' : '#7dd3fc';
      ctx.fillRect(mx - 1, my - 3, 2, 6);
      ctx.fillRect(mx - 3, my - 1, 6, 2);
    }

    ctx.restore();
  }

  /**
   * Live HD-2D Stage Effects for Ignis Sol's Supreme Finisher Stage Transformation:
   * "LAYWASTE OF INFERNO" (`arena_inferno.png`) — Shattered Volcanic Caldera Wasteland!
   */
  drawInfernoStageEffects(ctx, drawX, drawY, drawW, drawH, gy, alpha = 1.0) {
    const t = this.time;
    const assets = PixelForge.initAssets();
    const bg = assets ? assets.arenaInferno : null;
    const magmaLayer = this.getInfernoMagmaLayer(bg);

    const calderaCx = drawX + drawW * 0.495;
    const calderaCy = drawY + drawH * 0.42;
    const leftPeakCx = drawX + drawW * 0.268;
    const leftPeakCy = drawY + drawH * 0.25;
    const rightPeakCx = drawX + drawW * 0.748;
    const rightPeakCy = drawY + drawH * 0.22;
    const parallaxSmokeX = (this.camParallaxX || 0) * 0.08;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 0. Billowing Dark-Rimmed Volcanic Ash & Pyroclastic Smoke Plumes behind the Central Caldera & Twin Peaks
    const smokeVents = [
      { x: calderaCx, y: calderaCy - 36, scale: 1.35, count: 7, seed: 0.4 },
      { x: leftPeakCx, y: leftPeakCy - 12, scale: 0.72, count: 4, seed: 2.1 },
      { x: rightPeakCx, y: rightPeakCy - 14, scale: 0.78, count: 4, seed: 3.9 }
    ];
    ctx.globalCompositeOperation = 'source-over';
    for (const vent of smokeVents) {
      for (let p = 0; p < vent.count; p++) {
        const u = (t * (0.16 + (p % 3) * 0.04) + vent.seed + p * 0.27) % 1;
        const driftX = (u * 78 + Math.sin(t * 1.4 + p + vent.seed) * 16) * vent.scale + parallaxSmokeX;
        const riseY = u * 165 * vent.scale;
        const px = Math.round((vent.x + driftX) / 4) * 4;
        const py = Math.round((vent.y - riseY) / 4) * 4;
        const pw = Math.round((44 + u * 64) * vent.scale);
        const ph = Math.round((20 + u * 28) * vent.scale);
        const sFade = Math.sin(u * Math.PI) * 0.38 * alpha;
        // Dark pyroclastic ash body
        ctx.globalAlpha = sFade;
        ctx.fillStyle = '#180c09';
        ctx.fillRect(px - (pw >> 1), py - (ph >> 1), pw, ph);
        // Scorching magma-lit underbelly rim facing the caldera below
        ctx.globalAlpha = sFade * (1 - u * 0.55) * 0.85;
        ctx.fillStyle = u < 0.45 ? '#c2410c' : '#7c2d12';
        ctx.fillRect(px - Math.round(pw * 0.38), py + Math.round(ph * 0.22), Math.round(pw * 0.76), 4);
      }
    }

    // 1. Pulsing Caldera & Twin-Peak Solar-Corona Halos (`glowOrange` + `glowCrimson` + `glowGold`)
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.50 + 0.14 * Math.sin(t * 4.2)) * alpha;
    if (this.glowOrange) ctx.drawImage(this.glowOrange, calderaCx - 430, calderaCy - 270, 860, 540);
    ctx.globalAlpha = (0.36 + 0.10 * Math.cos(t * 3.5)) * alpha;
    if (this.glowCrimson) ctx.drawImage(this.glowCrimson, calderaCx - 350, calderaCy - 220, 700, 440);
    ctx.globalAlpha = (0.34 + 0.10 * Math.sin(t * 5.3)) * alpha;
    if (this.glowGold) ctx.drawImage(this.glowGold, calderaCx - 240, calderaCy - 155, 480, 310);

    // Twin Volcanic Peak Eruption Coronas
    if (this.glowOrange) {
      ctx.globalAlpha = (0.30 + 0.10 * Math.sin(t * 4.8 + 1.2)) * alpha;
      ctx.drawImage(this.glowOrange, leftPeakCx - 125, leftPeakCy - 95, 250, 190);
      ctx.globalAlpha = (0.32 + 0.10 * Math.cos(t * 4.5 + 2.4)) * alpha;
      ctx.drawImage(this.glowOrange, rightPeakCx - 135, rightPeakCy - 100, 270, 200);
    }

    // 2. Live Animated `getInfernoMagmaLayer(bg)` Heat-Shimmer & Downward Lava Cascade Wave-Strips
    if (magmaLayer) {
      const mw = magmaLayer.width;
      const mh = magmaLayer.height;

      // 2A. Central Caldera & Twin Peaks Horizontal Heat-Shimmer Wave-Strips
      const shimmerZones = [
        { x0: 0.35, y0: 0.30, w: 0.30, h: 0.34, strips: 14, amp: 4.5, seed: 0.5 },
        { x0: 0.22, y0: 0.19, w: 0.10, h: 0.16, strips: 6, amp: 2.5, seed: 2.2 },
        { x0: 0.70, y0: 0.17, w: 0.10, h: 0.17, strips: 6, amp: 2.5, seed: 3.8 }
      ];
      ctx.globalCompositeOperation = 'lighter';
      for (const z of shimmerZones) {
        ctx.globalAlpha = (0.44 + 0.16 * Math.sin(t * 7.2 + z.seed)) * alpha;
        for (let s = 0; s < z.strips; s++) {
          const u = s / z.strips;
          const sy = (z.y0 + u * z.h) * mh;
          const sh = (z.h / z.strips) * mh + 0.6;
          const dy = drawY + (z.y0 + u * z.h) * drawH;
          const dh = (z.h / z.strips) * drawH + 1.2;
          const waveX = Math.round(Math.sin(t * 9.6 + s * 0.8 + z.seed) * z.amp * (1 - u * 0.4));
          const liftY = Math.round(Math.cos(t * 7.4 + s * 0.9) * 1.5);
          ctx.drawImage(
            magmaLayer,
            z.x0 * mw,
            sy,
            z.w * mw,
            sh,
            Math.round(drawX + z.x0 * drawW + waveX),
            Math.round(dy - liftY),
            Math.round(z.w * drawW),
            Math.round(dh)
          );
        }
      }

      // 2B. Flank Lava Falls (`(0.10, 0.66)` & `(0.92, 0.65)`) Downward Cascade Wave-Strips
      const lavaFalls = [
        { x0: 0.04, y0: 0.56, w: 0.12, h: 0.20, poolCx: 0.10, poolCy: 0.72, seed: 1.1 },
        { x0: 0.85, y0: 0.56, w: 0.13, h: 0.20, poolCx: 0.92, poolCy: 0.71, seed: 4.3 }
      ];
      for (const lf of lavaFalls) {
        const strips = 10;
        ctx.globalAlpha = (0.48 + 0.16 * Math.sin(t * 8.4 + lf.seed)) * alpha;
        for (let s = 0; s < strips; s++) {
          const u = s / strips;
          const flowPhase = (u - ((t * 0.85) % 1) + 1) % 1;
          const sy = (lf.y0 + u * lf.h) * mh;
          const sh = (lf.h / strips) * mh + 0.6;
          const dy = drawY + (lf.y0 + u * lf.h) * drawH;
          const dh = (lf.h / strips) * drawH + 1.5;
          const cascadeDrop = Math.round(Math.sin(flowPhase * Math.PI * 2) * 3.5);
          const swayX = Math.round(Math.sin(t * 7.5 + s * 1.1 + lf.seed) * 2.5);
          ctx.drawImage(
            magmaLayer,
            lf.x0 * mw,
            sy,
            lf.w * mw,
            sh,
            Math.round(drawX + lf.x0 * drawW + swayX),
            Math.round(dy + cascadeDrop),
            Math.round(lf.w * drawW),
            Math.round(dh)
          );
        }
        if (this.glowOrange) {
          ctx.globalAlpha = (0.34 + 0.10 * Math.sin(t * 6.0 + lf.seed)) * alpha;
          ctx.drawImage(
            this.glowOrange,
            drawX + lf.poolCx * drawW - 95,
            drawY + lf.poolCy * drawH - 55,
            190,
            110
          );
        }
      }

      // 2C. Floor Lava Rivers (`y = 0.72..0.98`) Flowing Molten Undulation Strips
      const riverStrips = 12;
      const rY0 = 0.72;
      const rH = 0.26;
      ctx.globalAlpha = (0.34 + 0.12 * Math.sin(t * 5.4)) * alpha;
      for (let s = 0; s < riverStrips; s++) {
        const u = s / riverStrips;
        const sy = (rY0 + u * rH) * mh;
        const sh = (rH / riverStrips) * mh + 0.6;
        const dy = drawY + (rY0 + u * rH) * drawH;
        const dh = (rH / riverStrips) * drawH + 1.2;
        const driftX = Math.round(Math.sin(t * 5.8 + s * 0.95) * (2.5 + u * 2.5));
        ctx.drawImage(
          magmaLayer,
          0.04 * mw,
          sy,
          0.92 * mw,
          sh,
          Math.round(drawX + 0.04 * drawW + driftX),
          Math.round(dy),
          Math.round(0.92 * drawW),
          Math.round(dh)
        );
      }
    }

    // 3. Glowing Branching Molten Floor Fissures (`gy - 6 .. gy + 110`) & Periodic Magma-Bubble / Spark Pops
    const centerCx = drawX + drawW * 0.50;
    const fissures = [-480, -340, -195, -60, 85, 225, 365, 500];
    for (let i = 0; i < fissures.length; i++) {
      const fx = centerCx + fissures[i];
      const fy = gy - 4 + ((i * 31) % 5) * 22;
      const pulse = 0.72 + 0.28 * Math.sin(t * 6.2 + i * 1.4);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.36 * pulse * alpha;
      if (this.glowOrange) ctx.drawImage(this.glowOrange, fx - 135, fy - 28, 270, 64);
      if (i % 2 === 0 && this.glowGold) {
        ctx.globalAlpha = 0.26 * pulse * alpha;
        ctx.drawImage(this.glowGold, fx - 90, fy - 18, 180, 44);
      }

      // Stepped Branching Pixel-Art Glowing Lava Vein + Diagonal Fork
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.90 * alpha;
      const crackW = Math.round((58 + (i % 3) * 22) * pulse);
      const branchDir = i % 2 === 0 ? 1 : -1;
      ctx.fillStyle = '#431407';
      ctx.fillRect(Math.round(fx - crackW * 0.62), fy - 2, Math.round(crackW * 1.24), 6);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(Math.round(fx - crackW * 0.48), fy - 1, Math.round(crackW * 0.96), 4);
      ctx.fillRect(Math.round(fx + branchDir * 12), fy + 3, Math.round(crackW * 0.42), 3);
      ctx.fillRect(Math.round(fx + branchDir * 24), fy + 6, Math.round(crackW * 0.28), 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(Math.round(fx - crackW * 0.26), fy, Math.round(crackW * 0.52), 2);

      // Periodic Mini Magma-Bubble Blister & Crisp Pixel Spark Pop
      const popCycle = (t * (0.72 + (i % 3) * 0.14) + i * 0.39) % 1;
      const bx = Math.round((fx + branchDir * 10) / 2) * 2;
      const by = fy;
      if (popCycle > 0.45 && popCycle < 0.72) {
        const swell = (popCycle - 0.45) / 0.27;
        const bSz = swell > 0.6 ? 6 : 4;
        ctx.fillStyle = '#f97316';
        ctx.fillRect(bx - (bSz >> 1), by - bSz + 1, bSz, bSz);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(bx - 1, by - bSz + 2, 2, 2);
      } else if (popCycle >= 0.72) {
        const burst = (popCycle - 0.72) / 0.28;
        ctx.globalAlpha = (1 - burst) * 0.92 * alpha;
        for (let sp = -1; sp <= 1; sp++) {
          const sx = Math.round(bx + sp * (6 + burst * 18));
          const sy = Math.round(by - Math.sin(burst * Math.PI) * (14 + Math.abs(sp) * 6));
          ctx.fillStyle = sp === 0 ? '#ffffff' : '#fb923c';
          ctx.fillRect(sx - 1, sy - 1, 3, 3);
        }
      }
    }

    // 4. 52 Wind-Swept Rising Spiral Embers & Cinders across the Laywaste of Inferno!
    for (let e = 0; e < 52; e++) {
      const life = (t * (0.88 + (e % 5) * 0.21) + e * 0.29) % 1;
      const baseLaneX = drawX + drawW * (0.06 + ((e * 37) % 100) * 0.0088);
      const windDrift = life * (42 + (e % 3) * 18);
      const spiralX = Math.sin(life * Math.PI * 4 + t * 5.2 + e * 1.7) * (14 + (e % 4) * 5);
      const ex = Math.round((baseLaneX + windDrift + spiralX) / 3) * 3;
      const ey = Math.round((gy + 24 - life * 510) / 3) * 3;
      const fade = Math.sin(life * Math.PI) * alpha;
      const sz = life < 0.30 ? 5 : life < 0.70 ? 4 : 3;

      if (e % 2 === 0 && this.glowOrange) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.34;
        ctx.drawImage(
          e % 6 === 0 && this.glowCrimson ? this.glowCrimson : this.glowOrange,
          ex - 16,
          ey - 16,
          32,
          32
        );
      }
      ctx.globalCompositeOperation = 'source-over';
      // Trailing cooling cinder wake
      ctx.globalAlpha = fade * 0.50;
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(ex - 2, ey + 2, 3, 4);
      ctx.globalAlpha = fade * 0.95;
      ctx.fillStyle =
        life < 0.20
          ? '#ffffff'
          : life < 0.48
            ? '#fef08a'
            : life < 0.76
              ? '#fb923c'
              : '#dc2626';
      ctx.fillRect(ex - (sz >> 1), ey - (sz >> 1), sz, sz);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Moonlit Feudal Japanese Castle (`arena_shogunate.png`):
   *   - Silver-cyan full moon halo at `(0.583, 0.184)` + subtle pixel-stepped rim glints
   *   - Warm amber stone Tōrō lantern glow & flagstone reflections at `(0.057, 0.600)`, `(0.270, 0.587)`, `(0.731, 0.574)`, `(0.939, 0.599)`
   *   - Drifting indigo castle-courtyard night mist & 34 wind-swept pixel sakura petals
   */
  drawShogunateStageEffects(ctx, drawX, drawY, drawW, drawH, gy, alpha = 1.0) {
    if (alpha <= 0.01) return;
    const t = this.time;
    const moonCx = drawX + drawW * 0.583;
    const moonCy = drawY + drawH * 0.184;
    const lanterns = [
      { cx: 0.057, cy: 0.600, seed: 0.7 },
      { cx: 0.270, cy: 0.587, seed: 2.1 },
      { cx: 0.731, cy: 0.574, seed: 3.6 },
      { cx: 0.939, cy: 0.599, seed: 5.2 }
    ];

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Silver-Cyan Full Moon Halo (`'lighter'` capped <= 0.18)
    ctx.globalCompositeOperation = 'lighter';
    if (this.glowCyan) {
      ctx.globalAlpha = (0.14 + 0.03 * Math.sin(t * 2.1)) * alpha;
      ctx.drawImage(this.glowCyan, moonCx - 290, moonCy - 210, 580, 420);
    }
    if (this.glowIndigo) {
      ctx.globalAlpha = (0.11 + 0.03 * Math.cos(t * 1.7)) * alpha;
      ctx.drawImage(this.glowIndigo, moonCx - 220, moonCy - 165, 440, 330);
    }

    // 2. 4 Stone Tōrō Lantern Warm Pixel-Stepped Halos & Courtyard Reflections
    for (let i = 0; i < lanterns.length; i++) {
      const l = lanterns[i];
      const lx = Math.round(drawX + drawW * l.cx);
      const ly = Math.round(drawY + drawH * l.cy);
      const flick = 0.72 + 0.28 * Math.sin(t * 6.4 + l.seed) * Math.cos(t * 3.9 + l.seed);

      ctx.globalCompositeOperation = 'lighter';
      if (this.glowGold) {
        ctx.globalAlpha = Math.min(0.17, 0.14 * flick) * alpha;
        ctx.drawImage(this.glowGold, lx - 72, ly - 64, 144, 128);
      }
      if (this.glowOrange) {
        ctx.globalAlpha = Math.min(0.14, 0.11 * flick) * alpha;
        ctx.drawImage(this.glowOrange, lx - 86, gy - 10, 172, 46);
      }

      // Crisp pixel-art paper-shoji lantern flame heart
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.88 * alpha;
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(lx - 4, ly - 5, 8, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(lx - 2, ly - 3, 4, 6);
    }

    // 3. Stepped Indigo Courtyard Night-Mist Ribbons
    ctx.globalCompositeOperation = 'lighter';
    for (let m = 0; m < 4; m++) {
      const mDrift = Math.sin(t * 0.85 + m * 1.7) * 58;
      const mx = Math.round((drawX + drawW * (0.20 + m * 0.20) + mDrift) / 4) * 4;
      const my = Math.round((gy - 34 + (m % 2) * 14) / 4) * 4;
      ctx.globalAlpha = (0.05 + 0.02 * Math.sin(t * 1.6 + m)) * alpha;
      ctx.fillStyle = m % 2 === 0 ? '#7dd3fc' : '#fda4af';
      ctx.fillRect(mx - 110, my, 220, 6);
      ctx.fillRect(mx - 70, my - 6, 140, 6);
    }

    // 4. 76 Continuous Diagonal Raining Cherry Blossoms (`Sakura Fubuki`) + 18 Courtyard-Skittering Petals (`0` ctx.rotate!)
    const petalCols = ['#fda4af', '#fb7185', '#fbcfe8', '#fff1f2', '#f472b6'];
    const spanH = Math.max(240, gy - drawY + 64);
    for (let p = 0; p < 76; p++) {
      const cyc = (t * (0.20 + (p % 5) * 0.042) + p * 0.137) % 1;
      const startX = drawX - 90 + (((p * 53) % 116) / 116) * (drawW + 140);
      const breezeX = cyc * (215 + (p % 4) * 38) + Math.sin(t * 2.7 + p * 1.31) * 26;
      const flutterY = Math.cos(t * 3.9 + p * 1.73) * 8;
      const px = Math.round((startX + breezeX) / 2) * 2;
      const py = Math.round((drawY - 24 + cyc * spanH + flutterY) / 2) * 2;
      const fade = Math.sin(cyc * Math.PI) * alpha;
      if (fade <= 0.03) continue;

      if (p % 5 === 0 && this.glowCrimson) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.13, fade * 0.11);
        ctx.drawImage(this.glowCrimson, px - 12, py - 12, 24, 24);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.94;
      const tumblePhase = Math.floor(t * (4.8 + (p % 3) * 1.1) + p) & 3;
      const pScale = p % 6 === 0 ? 1.5 : 1;
      this.drawSakuraPetalPixel(
        ctx,
        px,
        py,
        tumblePhase,
        pScale,
        petalCols[p % petalCols.length],
        '#ffffff'
      );
    }

    // Courtyard flagstone breeze: 18 petals skittering low along the moonlit stone floor
    ctx.globalCompositeOperation = 'source-over';
    for (let s = 0; s < 18; s++) {
      const cyc = (t * (0.26 + (s % 3) * 0.05) + s * 0.19) % 1;
      const baseX = drawX + ((s * 67) % Math.max(200, Math.round(drawW - 140)));
      const sx = Math.round((baseX + cyc * 190) / 2) * 2;
      const sy = Math.round((gy - 6 + ((s * 9) % 34) - Math.abs(Math.sin(t * 4.4 + s)) * 7) / 2) * 2;
      const sFade = Math.sin(cyc * Math.PI) * alpha * 0.86;
      if (sFade <= 0.03) continue;
      ctx.globalAlpha = sFade;
      this.drawSakuraPetalPixel(
        ctx,
        sx,
        sy,
        (s + Math.floor(t * 5)) & 3,
        1,
        petalCols[(s + 1) % petalCols.length],
        '#fff1f2'
      );
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Crisp 4-Phase Tumbling Pixel-Art Cherry Blossom Petal (`0` `ctx.rotate`!).
   * Renders a notched HD-2D sakura petal cluster snapped cleanly to integer pixels.
   */
  drawSakuraPetalPixel(ctx, px, py, phase4 = 0, scale = 1, bodyCol = '#fda4af', hiCol = '#ffffff') {
    const s = scale >= 1.8 ? 2 : 1;
    const x = Math.round(px);
    const y = Math.round(py);
    const ph = phase4 & 3;

    // Subtle dark crimson-plum selout shadow pixel for crisp readability against moonlit stone & sky
    ctx.fillStyle = '#881337';
    if (ph === 0) {
      // Wide notched horizontal blossom petal
      ctx.fillRect(x - 4 * s, y, 8 * s, 2 * s);
      ctx.fillStyle = bodyCol;
      ctx.fillRect(x - 4 * s, y - 2 * s, 3 * s, 3 * s);
      ctx.fillRect(x + 1 * s, y - 2 * s, 3 * s, 3 * s);
      ctx.fillRect(x - 2 * s, y - 1 * s, 4 * s, 3 * s);
      ctx.fillStyle = hiCol;
      ctx.fillRect(x - 3 * s, y - 2 * s, 2 * s, 1 * s);
      ctx.fillRect(x + 1 * s, y - 1 * s, 2 * s, 1 * s);
    } else if (ph === 1) {
      // Diagonal-right tumbling petal
      ctx.fillRect(x - 2 * s, y + 1 * s, 5 * s, 2 * s);
      ctx.fillStyle = bodyCol;
      ctx.fillRect(x - 3 * s, y - 3 * s, 4 * s, 3 * s);
      ctx.fillRect(x - 1 * s, y - 1 * s, 4 * s, 3 * s);
      ctx.fillStyle = hiCol;
      ctx.fillRect(x - 2 * s, y - 2 * s, 2 * s, 2 * s);
    } else if (ph === 2) {
      // Edge-on slender fluttering petal
      ctx.fillRect(x - 3 * s, y + 1 * s, 6 * s, 1 * s);
      ctx.fillStyle = bodyCol;
      ctx.fillRect(x - 3 * s, y - 1 * s, 6 * s, 2 * s);
      ctx.fillStyle = hiCol;
      ctx.fillRect(x - 1 * s, y - 1 * s, 3 * s, 1 * s);
    } else {
      // Diagonal-left cupped sakura petal
      ctx.fillRect(x - 3 * s, y + 1 * s, 5 * s, 2 * s);
      ctx.fillStyle = bodyCol;
      ctx.fillRect(x - 1 * s, y - 3 * s, 4 * s, 3 * s);
      ctx.fillRect(x - 3 * s, y - 1 * s, 4 * s, 3 * s);
      ctx.fillStyle = hiCol;
      ctx.fillRect(x, y - 2 * s, 2 * s, 2 * s);
    }
  }

  /**
   * Burning Feudal Japanese Stage (`arena_shogunate_inferno.png` — Kaze-Maru vs Ignis Sol Synergy!):
   *   - Pyroclastic smoke plumes rising from the burning Tenshu roofs, 5-story pagoda & right pavilion
   *   - Solar Eclipse Corona at `(0.574, 0.206)` + `getShogunateInfernoFlameLayer` heat-shimmer wave strips
   *   - Blazing stone Tōrō lanterns, incandescent courtyard fissures & 44 burning sakura petals / cinders
   */
  drawShogunateInfernoStageEffects(ctx, drawX, drawY, drawW, drawH, gy, alpha = 1.0) {
    if (alpha <= 0.01) return;
    const t = this.time;
    const assets = PixelForge.initAssets();
    const bg = assets.arenaShogunateInferno;
    const flameLayer = this.getShogunateInfernoFlameLayer(bg);
    const eclipseCx = drawX + drawW * 0.574;
    const eclipseCy = drawY + drawH * 0.206;
    const parallaxSmokeX = -(this.camParallaxX || 0) * 0.06;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 0. Dark Pyroclastic Smoke Plumes rising from the Burning Tenshu, Pagoda & Right Pavilion
    const smokeVents = [
      { x: drawX + drawW * 0.48, y: drawY + drawH * 0.23, count: 6, scale: 1.05, seed: 0.4 },
      { x: drawX + drawW * 0.63, y: drawY + drawH * 0.27, count: 4, scale: 0.80, seed: 1.9 },
      { x: drawX + drawW * 0.72, y: drawY + drawH * 0.39, count: 4, scale: 0.78, seed: 3.4 }
    ];
    ctx.globalCompositeOperation = 'source-over';
    for (const vent of smokeVents) {
      for (let p = 0; p < vent.count; p++) {
        const u = (t * (0.17 + (p % 3) * 0.04) + vent.seed + p * 0.25) % 1;
        const driftX = (u * 72 + Math.sin(t * 1.5 + p + vent.seed) * 14) * vent.scale + parallaxSmokeX;
        const riseY = u * 150 * vent.scale;
        const px = Math.round((vent.x + driftX) / 4) * 4;
        const py = Math.round((vent.y - riseY) / 4) * 4;
        const pw = Math.round((42 + u * 58) * vent.scale);
        const ph = Math.round((18 + u * 26) * vent.scale);
        const sFade = Math.sin(u * Math.PI) * 0.34 * alpha;
        ctx.globalAlpha = sFade;
        ctx.fillStyle = '#180a09';
        ctx.fillRect(px - (pw >> 1), py - (ph >> 1), pw, ph);
        ctx.globalAlpha = sFade * (1 - u * 0.52) * 0.84;
        ctx.fillStyle = u < 0.45 ? '#ea580c' : '#9a3412';
        ctx.fillRect(px - Math.round(pw * 0.36), py + Math.round(ph * 0.22), Math.round(pw * 0.72), 4);
      }
    }

    // 1. Solar Eclipse Corona (`'lighter'` capped <= 0.18)
    ctx.globalCompositeOperation = 'lighter';
    if (this.glowOrange) {
      ctx.globalAlpha = (0.16 + 0.02 * Math.sin(t * 4.1)) * alpha;
      ctx.drawImage(this.glowOrange, eclipseCx - 320, eclipseCy - 220, 640, 440);
    }
    if (this.glowCrimson) {
      ctx.globalAlpha = (0.14 + 0.03 * Math.cos(t * 3.4)) * alpha;
      ctx.drawImage(this.glowCrimson, eclipseCx - 260, eclipseCy - 180, 520, 360);
    }

    // 2. Live Heat-Shimmer Wave Strips on the Burning Tenshu Keep, 5-Story Pagoda & Pavilion
    if (flameLayer) {
      const mw = flameLayer.width;
      const mh = flameLayer.height;
      const fireZones = [
        { x0: 0.35, y0: 0.14, w: 0.25, h: 0.28, strips: 12, amp: 3.5, seed: 0.6 },
        { x0: 0.59, y0: 0.24, w: 0.08, h: 0.13, strips: 6, amp: 2.5, seed: 2.1 },
        { x0: 0.68, y0: 0.36, w: 0.09, h: 0.11, strips: 5, amp: 2.5, seed: 3.7 }
      ];
      ctx.globalCompositeOperation = 'lighter';
      for (const z of fireZones) {
        ctx.globalAlpha = Math.min(0.18, 0.15 + 0.03 * Math.sin(t * 7.6 + z.seed)) * alpha;
        for (let s = 0; s < z.strips; s++) {
          const u = s / z.strips;
          const sy = (z.y0 + u * z.h) * mh;
          const sh = (z.h / z.strips) * mh + 0.6;
          const dy = drawY + (z.y0 + u * z.h) * drawH;
          const dh = (z.h / z.strips) * drawH + 1.2;
          const waveX = Math.round(Math.sin(t * 9.2 + s * 0.85 + z.seed) * z.amp);
          const liftY = Math.round(Math.cos(t * 7.8 + s * 0.9) * 1.5);
          ctx.drawImage(
            flameLayer,
            z.x0 * mw,
            sy,
            z.w * mw,
            sh,
            Math.round(drawX + z.x0 * drawW + waveX),
            Math.round(dy - liftY),
            Math.round(z.w * drawW),
            Math.round(dh)
          );
        }
      }
    }

    // 3. Blazing Stone Tōrō Lanterns & Incandescent Courtyard Ember Seams
    const lanterns = [
      { cx: 0.057, cy: 0.600, seed: 0.7 },
      { cx: 0.270, cy: 0.587, seed: 2.1 },
      { cx: 0.731, cy: 0.574, seed: 3.6 },
      { cx: 0.939, cy: 0.599, seed: 5.2 }
    ];
    for (let i = 0; i < lanterns.length; i++) {
      const l = lanterns[i];
      const lx = Math.round(drawX + drawW * l.cx);
      const ly = Math.round(drawY + drawH * l.cy);
      const flick = 0.74 + 0.26 * Math.sin(t * 8.2 + l.seed);
      ctx.globalCompositeOperation = 'lighter';
      if (this.glowOrange) {
        ctx.globalAlpha = Math.min(0.18, 0.16 * flick) * alpha;
        ctx.drawImage(this.glowOrange, lx - 84, ly - 74, 168, 148);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.92 * alpha;
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(lx - 5, ly - 7, 10, 13);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(lx - 2, ly - 4, 4, 8);
    }

    // 4. 44 Wind-Swept Burning Sakura Petals & Rising Spiral Cinders (`0` ctx.rotate!)
    for (let e = 0; e < 44; e++) {
      const isBurningPetal = e % 2 === 0;
      const life = (t * (isBurningPetal ? 0.28 + (e % 3) * 0.06 : 0.76 + (e % 4) * 0.16) + e * 0.23) % 1;
      const laneX = drawX + drawW * (0.05 + ((e * 39) % 94) * 0.0096);
      const driftX = life * (isBurningPetal ? 195 : 58) + Math.sin(t * 3.8 + e * 1.5) * 20;
      const ex = Math.round((laneX + driftX) / 2) * 2;
      const ey = isBurningPetal
        ? Math.round((drawY + 75 + life * (gy - drawY + 45)) / 2) * 2
        : Math.round((gy + 22 - life * 485) / 2) * 2;
      const fade = Math.sin(life * Math.PI) * alpha;
      if (fade <= 0.03) continue;

      if (e % 3 === 0 && this.glowOrange) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.17, fade * 0.16);
        ctx.drawImage(
          isBurningPetal && this.glowCrimson ? this.glowCrimson : this.glowOrange,
          ex - 14,
          ey - 14,
          28,
          28
        );
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.94;
      if (isBurningPetal) {
        // Charred dark sakura petal with glowing ember-lit edge!
        ctx.fillStyle = '#291510';
        ctx.fillRect(ex - 3, ey - 2, 6, 4);
        ctx.fillStyle = e % 4 === 0 ? '#f43f5e' : '#fb923c';
        ctx.fillRect(ex - 2, ey - 1, 4, 2);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(ex + 1, ey - 1, 2, 2);
      } else {
        const sz = life < 0.35 ? 4 : 3;
        ctx.fillStyle = life < 0.25 ? '#ffffff' : life < 0.55 ? '#fef08a' : '#fb923c';
        ctx.fillRect(ex - (sz >> 1), ey - (sz >> 1), sz, sz);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Crisp 2-Phase Pixel-Art Diamond-Dust Snowflake Crystal (`0` `ctx.rotate`!).
   */
  drawDiamondCrystalPixel(
    ctx,
    px,
    py,
    phase2 = 0,
    scale = 1,
    bodyCol = '#67e8f9',
    hiCol = '#ffffff',
    rimCol = '#0c4a6e'
  ) {
    const s = scale >= 1.6 ? 2 : 1;
    const x = Math.round(px);
    const y = Math.round(py);
    ctx.fillStyle = rimCol;
    if ((phase2 & 1) === 0) {
      ctx.fillRect(x - 3 * s, y, 6 * s, 1 * s);
      ctx.fillRect(x, y - 3 * s, 1 * s, 6 * s);
      ctx.fillStyle = bodyCol;
      ctx.fillRect(x - 2 * s, y - 1 * s, 5 * s, 2 * s);
      ctx.fillRect(x - 1 * s, y - 2 * s, 2 * s, 5 * s);
      ctx.fillStyle = hiCol;
      ctx.fillRect(x - 1 * s, y - 1 * s, 2 * s, 2 * s);
    } else {
      ctx.fillRect(x - 2 * s, y - 2 * s, 5 * s, 5 * s);
      ctx.fillStyle = bodyCol;
      ctx.fillRect(x - 1 * s, y - 2 * s, 3 * s, 5 * s);
      ctx.fillRect(x - 2 * s, y - 1 * s, 5 * s, 3 * s);
      ctx.fillStyle = hiCol;
      ctx.fillRect(x, y - 1 * s, 1 * s, 3 * s);
      ctx.fillRect(x - 1 * s, y, 3 * s, 1 * s);
    }
  }

  /**
   * Permafrost Aurora Sanctum (`arena_glacial.png` — Lyra Supreme Ultimate Domain!):
   *   - Polar Crescent Moon & Borealis Ribbon shimmer at `(0.589, 0.155)` (`'lighter'` <= 0.15)
   *   - Flanking Sapphire Glacier Spire glints & stepped Borealis sky curtains
   *   - Drifting permafrost floor mist & 56 sparkling Diamond-Dust Snowflakes (`0` ctx.rotate!)
   */
  drawGlacialStageEffects(ctx, drawX, drawY, drawW, drawH, gy, alpha = 1.0) {
    if (alpha <= 0.01) return;
    const t = this.time;
    const moonCx = drawX + drawW * 0.589;
    const moonCy = drawY + drawH * 0.155;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Polar Crescent Moon & Borealis Sky Shimmer (`'lighter'` capped <= 0.15)
    ctx.globalCompositeOperation = 'lighter';
    if (this.glowCyan) {
      ctx.globalAlpha = (0.12 + 0.03 * Math.sin(t * 1.9)) * alpha;
      ctx.drawImage(this.glowCyan, moonCx - 260, moonCy - 165, 520, 330);
    }
    if (this.glowViolet) {
      ctx.globalAlpha = (0.10 + 0.03 * Math.cos(t * 1.5)) * alpha;
      ctx.drawImage(this.glowViolet, drawX + drawW * 0.36 - 240, drawY + drawH * 0.18 - 140, 480, 280);
    }

    // Stepped vertical Aurora Borealis pixel curtains gently undulating in the upper sky
    const auroraCols = ['#67e8f9', '#2dd4bf', '#38bdf8', '#e879f9', '#c084fc'];
    for (let a = 0; a < 14; a++) {
      const ax = Math.round((drawX + drawW * (0.18 + a * 0.046) + Math.sin(t * 1.4 + a * 0.8) * 14) / 4) * 4;
      const ay = Math.round((drawY + drawH * (0.04 + (a % 3) * 0.03) + Math.cos(t * 1.8 + a) * 8) / 4) * 4;
      const ah = Math.round(drawH * (0.14 + (a % 4) * 0.035));
      ctx.globalAlpha = (0.045 + 0.025 * Math.sin(t * 2.4 + a * 1.1)) * alpha;
      ctx.fillStyle = auroraCols[a % auroraCols.length];
      ctx.fillRect(ax, ay, 8, ah);
    }

    // 2. Flanking Sapphire Glacier Spire Specular Glints & Mirror-Ice Mist
    const spires = [
      { cx: 0.235, cy: 0.48, seed: 0.8 },
      { cx: 0.765, cy: 0.48, seed: 2.9 }
    ];
    for (const sp of spires) {
      const sx = Math.round(drawX + drawW * sp.cx);
      const sy = Math.round(drawY + drawH * sp.cy);
      const pulse = 0.65 + 0.35 * Math.sin(t * 3.1 + sp.seed);
      if (this.glowCyan) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.14, 0.11 * pulse) * alpha;
        ctx.drawImage(this.glowCyan, sx - 90, sy - 110, 180, 220);
      }
    }

    for (let m = 0; m < 4; m++) {
      const mDrift = Math.sin(t * 0.78 + m * 1.6) * 56;
      const mx = Math.round((drawX + drawW * (0.20 + m * 0.20) + mDrift) / 4) * 4;
      const my = Math.round((gy - 28 + (m % 2) * 12) / 4) * 4;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.055 + 0.02 * Math.sin(t * 1.7 + m)) * alpha;
      ctx.fillStyle = m % 2 === 0 ? '#67e8f9' : '#e879f9';
      ctx.fillRect(mx - 116, my, 232, 6);
      ctx.fillRect(mx - 72, my - 6, 144, 6);
    }

    // 3. 56 Drifting Diamond-Dust Snowflakes (`0` ctx.rotate!)
    const flakeCols = ['#bae6fd', '#67e8f9', '#e0f2fe', '#f5d0fe', '#38bdf8'];
    const spanH = Math.max(240, gy - drawY + 56);
    ctx.globalCompositeOperation = 'source-over';
    for (let p = 0; p < 56; p++) {
      const cyc = (t * (0.16 + (p % 5) * 0.036) + p * 0.149) % 1;
      const startX = drawX - 60 + (((p * 59) % 120) / 120) * (drawW + 120);
      const breezeX = cyc * 92 + Math.sin(t * 2.1 + p * 1.37) * 24;
      const px = Math.round((startX + breezeX) / 2) * 2;
      const py = Math.round((drawY - 20 + cyc * spanH) / 2) * 2;
      const fade = Math.sin(cyc * Math.PI) * alpha;
      if (fade <= 0.03) continue;
      ctx.globalAlpha = fade * 0.90;
      this.drawDiamondCrystalPixel(
        ctx,
        px,
        py,
        (Math.floor(t * 4.2 + p) + p) & 1,
        p % 7 === 0 ? 1.7 : 1,
        flakeCols[p % flakeCols.length],
        '#ffffff',
        '#0c4a6e'
      );
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Frozen Sakura Shogunate (`arena_shogunate_glacial.png` — Kaze-Maru <-> Lyra Synergy!):
   *   - Ice-Blue Full Moon & Borealis Ribbons at `(0.584, 0.200)` (`'lighter'` <= 0.15)
   *   - 4 Cold Spirit-Ice Stone Tōrō Lanterns at `(0.058, 0.590)`, `(0.263, 0.596)`, `(0.737, 0.597)`, `(0.940, 0.588)`
   *   - 64 Raining Frost-Crystallized Sakura Petals & Diamond-Dust Flakes (`0` ctx.rotate!)
   */
  drawShogunateGlacialStageEffects(ctx, drawX, drawY, drawW, drawH, gy, alpha = 1.0) {
    if (alpha <= 0.01) return;
    const t = this.time;
    const moonCx = drawX + drawW * 0.584;
    const moonCy = drawY + drawH * 0.200;
    const lanterns = [
      { cx: 0.058, cy: 0.590, seed: 0.7 },
      { cx: 0.263, cy: 0.596, seed: 2.1 },
      { cx: 0.737, cy: 0.597, seed: 3.6 },
      { cx: 0.940, cy: 0.588, seed: 5.2 }
    ];

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Ice-Blue Full Moon & Borealis Halo (`'lighter'` capped <= 0.15)
    ctx.globalCompositeOperation = 'lighter';
    if (this.glowCyan) {
      ctx.globalAlpha = (0.13 + 0.03 * Math.sin(t * 2.0)) * alpha;
      ctx.drawImage(this.glowCyan, moonCx - 280, moonCy - 200, 560, 400);
    }
    if (this.glowViolet) {
      ctx.globalAlpha = (0.10 + 0.025 * Math.cos(t * 1.6)) * alpha;
      ctx.drawImage(this.glowViolet, moonCx - 230, moonCy - 160, 460, 320);
    }

    // 2. 4 Cold Spirit-Ice Stone Tōrō Lantern Halos & Mirror-Ice Reflections
    for (let i = 0; i < lanterns.length; i++) {
      const l = lanterns[i];
      const lx = Math.round(drawX + drawW * l.cx);
      const ly = Math.round(drawY + drawH * l.cy);
      const flick = 0.74 + 0.26 * Math.sin(t * 5.8 + l.seed) * Math.cos(t * 3.4 + l.seed);

      ctx.globalCompositeOperation = 'lighter';
      if (this.glowCyan) {
        ctx.globalAlpha = Math.min(0.15, 0.13 * flick) * alpha;
        ctx.drawImage(this.glowCyan, lx - 72, ly - 64, 144, 128);
        ctx.globalAlpha = Math.min(0.12, 0.10 * flick) * alpha;
        ctx.drawImage(this.glowCyan, lx - 84, gy - 8, 168, 44);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.90 * alpha;
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(lx - 4, ly - 5, 8, 10);
      ctx.fillStyle = '#ecfeff';
      ctx.fillRect(lx - 2, ly - 3, 4, 6);
    }

    // 3. Stepped Borealis Courtyard Frost-Mist Ribbons
    ctx.globalCompositeOperation = 'lighter';
    for (let m = 0; m < 4; m++) {
      const mDrift = Math.sin(t * 0.82 + m * 1.7) * 56;
      const mx = Math.round((drawX + drawW * (0.20 + m * 0.20) + mDrift) / 4) * 4;
      const my = Math.round((gy - 32 + (m % 2) * 14) / 4) * 4;
      ctx.globalAlpha = (0.05 + 0.02 * Math.sin(t * 1.6 + m)) * alpha;
      ctx.fillStyle = m % 2 === 0 ? '#67e8f9' : '#f5d0fe';
      ctx.fillRect(mx - 110, my, 220, 6);
      ctx.fillRect(mx - 70, my - 6, 140, 6);
    }

    // 4. 64 Raining Frost-Crystallized Sakura Petals & Diamond-Dust Flakes + 14 Skittering Ice Petals (`0` ctx.rotate!)
    const frostPetalCols = ['#bae6fd', '#67e8f9', '#f5d0fe', '#e9d5ff', '#fbcfe8'];
    const spanH = Math.max(240, gy - drawY + 64);
    ctx.globalCompositeOperation = 'source-over';
    for (let p = 0; p < 64; p++) {
      const cyc = (t * (0.19 + (p % 5) * 0.04) + p * 0.137) % 1;
      const startX = drawX - 90 + (((p * 53) % 116) / 116) * (drawW + 140);
      const breezeX = cyc * (185 + (p % 4) * 32) + Math.sin(t * 2.5 + p * 1.31) * 24;
      const flutterY = Math.cos(t * 3.6 + p * 1.73) * 7;
      const px = Math.round((startX + breezeX) / 2) * 2;
      const py = Math.round((drawY - 24 + cyc * spanH + flutterY) / 2) * 2;
      const fade = Math.sin(cyc * Math.PI) * alpha;
      if (fade <= 0.03) continue;

      ctx.globalAlpha = fade * 0.92;
      if (p % 3 === 0) {
        this.drawDiamondCrystalPixel(
          ctx,
          px,
          py,
          (Math.floor(t * 4.4 + p) + p) & 1,
          p % 9 === 0 ? 1.7 : 1,
          frostPetalCols[p % frostPetalCols.length],
          '#ffffff',
          '#0c4a6e'
        );
      } else {
        this.drawSakuraPetalPixel(
          ctx,
          px,
          py,
          Math.floor(t * (4.6 + (p % 3)) + p) & 3,
          p % 6 === 0 ? 1.5 : 1,
          frostPetalCols[p % frostPetalCols.length],
          '#ffffff'
        );
      }
    }

    for (let s = 0; s < 14; s++) {
      const cyc = (t * (0.24 + (s % 3) * 0.05) + s * 0.19) % 1;
      const baseX = drawX + ((s * 67) % Math.max(200, Math.round(drawW - 140)));
      const sx = Math.round((baseX + cyc * 175) / 2) * 2;
      const sy = Math.round((gy - 6 + ((s * 9) % 34) - Math.abs(Math.sin(t * 4.2 + s)) * 6) / 2) * 2;
      const sFade = Math.sin(cyc * Math.PI) * alpha * 0.84;
      if (sFade <= 0.03) continue;
      ctx.globalAlpha = sFade;
      this.drawSakuraPetalPixel(
        ctx,
        sx,
        sy,
        (s + Math.floor(t * 4.6)) & 3,
        1,
        frostPetalCols[(s + 1) % frostPetalCols.length],
        '#ecfeff'
      );
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * COB-OS: FOURTH WALL TERMINAL (`arena_cob_monitor*.png` + 4-row `cob_creator_anim.png`):
   *   - Animates Creator Cob beyond the monitor glass (`Row 0` Idle, `Row 1` Active Command Attack, `Row 2` Inferno, `Row 3` Glacial)
   *   - Scrolls neon code lines, thermal/cryo bars & bouncing equalizer bars inside both flanking `COB-OS` hologram windows
   *   - Renders translucent glass HUD telemetry nodes, CRT glitch ripples, perspective floor circuit waves,
   *     plus volcanic embers (`inferno`) and Aurora Borealis curtains + icicles + snowflakes (`glacial`) (`0` ctx.rotate!)
   */
  drawCobMonitorStageEffects(ctx, drawX, drawY, drawW, drawH, gy, alpha = 1.0, variant = 'normal') {
    if (alpha <= 0.01) return;
    const t = this.time;
    const assets = PixelForge.initAssets();
    const animSheet = PixelForge.ensureImage?.(assets?.cobCreatorAnim);
    const assistActive = this.cobAssistTimer > 0;
    const assistProg = assistActive
      ? Math.max(0, Math.min(1, 1 - this.cobAssistTimer / Math.max(0.1, this.cobAssistMaxTimer || 0.9)))
      : 0;
    const assistEnv = assistActive ? Math.sin(assistProg * Math.PI) : 0;
    const isInferno = variant === 'inferno';
    const isGlacial = variant === 'glacial';

    const cPrim = isInferno ? '#fb923c' : isGlacial ? '#67e8f9' : '#22d3ee';
    const cSec = isInferno ? '#ef4444' : isGlacial ? '#e879f9' : '#d946ef';
    const cAcc = isInferno ? '#fde047' : isGlacial ? '#bae6fd' : '#fde047';

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Undulating Background Phenomena Behind/Along Glass (`inferno` heat shimmer / `glacial` Aurora Borealis)
    if (isGlacial) {
      const auroraCols = ['#67e8f9', '#2dd4bf', '#38bdf8', '#e879f9', '#c084fc'];
      ctx.globalCompositeOperation = 'lighter';
      for (let a = 0; a < 12; a++) {
        const ax = Math.round((drawX + drawW * (0.24 + a * 0.044) + Math.sin(t * 1.6 + a * 0.85) * 14) / 4) * 4;
        const ay = Math.round((drawY + drawH * (0.40 + (a % 3) * 0.025) + Math.cos(t * 1.9 + a) * 6) / 4) * 4;
        const ah = Math.round(drawH * (0.10 + (a % 3) * 0.028));
        ctx.globalAlpha = Math.min(0.07, (0.042 + 0.024 * Math.sin(t * 2.5 + a * 1.1)) * alpha);
        ctx.fillStyle = auroraCols[a % auroraCols.length];
        ctx.fillRect(ax, ay, 8, ah);
      }
    } else if (isInferno) {
      ctx.globalCompositeOperation = 'lighter';
      for (let h = 0; h < 6; h++) {
        const hy = Math.round((drawY + drawH * (0.42 + h * 0.052) - ((t * 36 + h * 18) % 22)) / 4) * 4;
        const hx = Math.round((drawX + drawW * (0.24 + (h % 3) * 0.16) + Math.sin(t * 3.8 + h) * 16) / 4) * 4;
        ctx.globalAlpha = Math.min(0.07, (0.04 + 0.025 * Math.sin(t * 5.2 + h)) * alpha);
        ctx.fillStyle = h % 2 === 0 ? '#fb923c' : '#ef4444';
        ctx.fillRect(hx, hy, 92, 4);
      }
    }

    // 2. Live 4-Row 8-Frame Animated Cob Beyond the Glass Monitor (`0.3125, 0.2833, 0.3750, 0.5000`)
    if (animSheet && animSheet.complete && animSheet.naturalWidth >= 1920) {
      const frame = Math.floor(t * (assistActive ? 10.0 : 6.2)) % 8;
      const rowIdx =
        animSheet.naturalHeight >= 720
          ? isInferno
            ? 2
            : isGlacial
              ? 3
              : assistActive
                ? 1
                : 0
          : 0;
      const destX = Math.round(drawX + drawW * 0.3125);
      const destY = Math.round(drawY + drawH * 0.2833);
      const destW = Math.round(drawW * 0.3750);
      const destH = Math.round(drawH * 0.5000);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.drawImage(animSheet, frame * 240, rowIdx * 180, 240, 180, destX, destY, destW, destH);
    }

    // 3. Crimson Eye Glow & Variant Monitor Ambient Light (`'lighter'` capped <= 0.14)
    const eyeX = Math.round(drawX + drawW * 0.4734);
    const eyeY = Math.round(drawY + drawH * 0.5083);
    const eyePulse = 0.72 + 0.28 * Math.sin(t * 4.8);
    if (this.glowCrimson) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.14, (0.08 * eyePulse + 0.06 * assistEnv) * alpha);
      const er = Math.round(120 + 55 * assistEnv);
      ctx.drawImage(this.glowCrimson, eyeX - er, eyeY - er, er * 2, er * 2);
    }
    const priGlow = isInferno ? this.glowOrange : this.glowCyan;
    const secGlow = isInferno ? this.glowCrimson : this.glowViolet;
    if (priGlow) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.14, (0.09 + 0.04 * assistEnv) * alpha);
      ctx.drawImage(priGlow, drawX + drawW * 0.50 - 300, drawY + drawH * 0.54 - 180, 600, 360);
    }
    if (secGlow) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.12, 0.08 * alpha);
      ctx.drawImage(secGlow, drawX + drawW * 0.50 - 340, drawY + drawH * 0.49 - 160, 680, 320);
    }

    // 4. Visible Inner Monitor Pillar Pulsing Status LEDs (`x = 0.256` & `0.744`, + outer wing pillars)
    for (const pxNorm of [0.163, 0.256, 0.744, 0.837]) {
      const lx = Math.round(drawX + drawW * pxNorm);
      const ledA = (0.58 + 0.42 * Math.sin(t * 6.0 + pxNorm * 11)) * alpha;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = ledA;
      ctx.fillStyle = assistActive ? cAcc : cPrim;
      ctx.fillRect(lx - 3, Math.round(drawY + drawH * 0.555), 6, 18);
      ctx.fillStyle = cSec;
      ctx.fillRect(lx - 3, Math.round(drawY + drawH * 0.638), 6, 11);
    }

    // 5. Two Animated Visible Flanking `COB-OS` Code, Telemetry & Waveform Windows (`0.290..0.346` & `0.652..0.708`)
    const scrollTick = Math.floor(t * 8.0);
    const codeCols = [cPrim, cSec, cAcc, '#ffffff'];
    for (let wIdx = 0; wIdx < 2; wIdx++) {
      const winL = Math.round(drawX + drawW * (wIdx === 0 ? 0.290 : 0.652));
      const winR = Math.round(drawX + drawW * (wIdx === 0 ? 0.346 : 0.708));
      const winT = Math.round(drawY + drawH * 0.485);
      const winW = Math.max(44, winR - winL);

      // Animated header bar (pulses thermal orange/red or cryo cyan!)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (0.54 + 0.34 * assistEnv) * alpha;
      ctx.fillStyle = assistActive ? cAcc : cPrim;
      ctx.fillRect(winL, winT - 11, Math.round(winW * (0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3.5 + wIdx)))), 4);

      // Scrolling live pixel code lines inside visible glass window (`y = 0.485..0.580`)
      for (let ln = 0; ln < 6; ln++) {
        const lineSeed = ln + scrollTick + wIdx * 11;
        const barW = 14 + ((lineSeed * 23) % Math.max(16, winW - 20));
        const indent = (ln % 3) * 7;
        const ly = winT + ln * 12;
        ctx.globalAlpha = (0.42 + (ln % 3 === 0 ? 0.22 : 0) + 0.28 * assistEnv) * alpha;
        ctx.fillStyle = assistActive && ln % 2 === 0 ? cAcc : codeCols[lineSeed % codeCols.length];
        ctx.fillRect(winL + indent, ly, Math.min(winW - indent, barW), 4);
      }

      // Blinking cursor
      if (Math.floor(t * 5) % 2 === 0) {
        ctx.globalAlpha = 0.84 * alpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(winL + 8, winT + 6 * 12 + 2, 7, 4);
      }

      // Bouncing 7-bar uplink waveform equalizer at bottom of monitor window (`y = 0.642`)
      const eqBaseY = Math.round(drawY + drawH * 0.642);
      for (let b = 0; b < 7; b++) {
        const barH =
          4 +
          Math.round(
            Math.abs(Math.sin(t * (assistActive ? 15.0 : 7.0) + b * 0.95 + wIdx * 2.1)) *
              (assistActive ? 20 : 13)
          );
        const bx = winL + b * Math.max(7, Math.floor(winW / 8));
        ctx.globalAlpha = (0.58 + 0.32 * assistEnv) * alpha;
        ctx.fillStyle = assistActive ? (b % 2 === 0 ? cAcc : cPrim) : b % 2 === 0 ? cPrim : cSec;
        ctx.fillRect(bx, eqBaseY - barH, 5, barH);
      }
    }

    // 6. Dual CRT Scan-Bars, Horizontal Cyber-Glitch Ripples & Drifting Glass Telemetry Nodes
    const scanY = Math.round((drawY + drawH * (0.39 + ((t * 0.22) % 0.36))) / 4) * 4;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.11, 0.08 * alpha);
    ctx.fillStyle = cPrim;
    ctx.fillRect(drawX + Math.round(drawW * 0.22), scanY, Math.round(drawW * 0.56), 4);

    // Subtle periodic horizontal glass glitch shimmer
    const glitchTick = Math.floor(t * 9.0);
    if (glitchTick % 7 === 0 || assistActive) {
      for (let g = 0; g < 3; g++) {
        const gyLine = Math.round((drawY + drawH * (0.42 + ((glitchTick * 19 + g * 11) % 30) * 0.01)) / 4) * 4;
        const gxLine = Math.round(drawX + drawW * (0.28 + ((glitchTick + g * 7) % 5) * 0.085));
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (assistActive ? 0.26 : 0.16) * alpha;
        ctx.fillStyle = g % 2 === 0 ? cPrim : cSec;
        ctx.fillRect(gxLine, gyLine, 60 + g * 16, 2);
      }
    }

    // Drifting translucent HUD crosshairs & pixel nodes across the glass backdrop
    ctx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 6; k++) {
      const cyc = (t * (0.24 + (k % 3) * 0.07) + k * 0.17) % 1;
      const nx = Math.round((drawX + drawW * (0.27 + k * 0.09) + Math.sin(t * 2.2 + k) * 16) / 2) * 2;
      const ny = Math.round((drawY + drawH * (0.71 - cyc * 0.28)) / 2) * 2;
      const nA = Math.sin(cyc * Math.PI) * 0.36 * alpha;
      if (nA <= 0.02) continue;
      ctx.globalAlpha = nA;
      ctx.fillStyle = k % 2 === 0 ? cPrim : cSec;
      ctx.fillRect(nx - 5, ny - 1, 10, 2);
      ctx.fillRect(nx - 1, ny - 5, 2, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(nx - 1, ny - 1, 2, 2);
    }

    // 7. Animated Variant-Specific Stage Phenomena Across the Glass & Floor
    if (isGlacial) {
      // Crystal Icicle Tip Glints along top bezel (`y = 0.402`) & falling pixel snowflakes
      ctx.globalCompositeOperation = 'source-over';
      for (let ic = 0; ic < 16; ic++) {
        const ix = Math.round((drawX + drawW * (0.23 + ic * 0.034)) / 2) * 2;
        const iy = Math.round((drawY + drawH * 0.405 + (ic % 3) * 4) / 2) * 2;
        const glint = 0.45 + 0.55 * Math.max(0, Math.sin(t * 4.5 + ic * 1.4));
        ctx.globalAlpha = glint * 0.85 * alpha;
        ctx.fillStyle = ic % 2 === 0 ? '#ffffff' : '#67e8f9';
        ctx.fillRect(ix - 1, iy - 1, 3, 4);
      }
      const spanH = Math.max(200, gy - (drawY + drawH * 0.38));
      for (let s = 0; s < 32; s++) {
        const cyc = (t * (0.18 + (s % 4) * 0.04) + s * 0.13) % 1;
        const fx = Math.round((drawX + drawW * (0.20 + ((s * 29) % 60) * 0.01) + cyc * 72 + Math.sin(t * 2.4 + s) * 18) / 2) * 2;
        const fy = Math.round((drawY + drawH * 0.38 + cyc * spanH) / 2) * 2;
        const fA = Math.sin(cyc * Math.PI) * 0.88 * alpha;
        if (fA <= 0.03) continue;
        ctx.globalAlpha = fA;
        this.drawDiamondCrystalPixel(
          ctx,
          fx,
          fy,
          (Math.floor(t * 4.4 + s) + s) & 1,
          s % 5 === 0 ? 1.6 : 1,
          s % 3 === 0 ? '#f5d0fe' : '#67e8f9',
          '#ffffff',
          '#0c4a6e'
        );
      }
    } else if (isInferno) {
      // 36 Rising Volcanic Embers & Magma Cinders across glass + floor
      ctx.globalCompositeOperation = 'source-over';
      for (let e = 0; e < 36; e++) {
        const cyc = (t * (0.28 + (e % 4) * 0.07) + e * 0.14) % 1;
        const ex = Math.round((drawX + drawW * (0.20 + ((e * 31) % 60) * 0.01) + Math.sin(t * 3.8 + e * 1.7) * 20) / 2) * 2;
        const ey = Math.round((gy + 34 - cyc * 300) / 2) * 2;
        const eA = Math.sin(cyc * Math.PI) * 0.88 * alpha;
        if (eA <= 0.03) continue;
        ctx.globalAlpha = eA;
        ctx.fillStyle = e % 3 === 0 ? '#fde047' : e % 2 === 0 ? '#fb923c' : '#ef4444';
        ctx.fillRect(ex - 2, ey - 2, 5, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ex - 1, ey - 1, 2, 2);
      }
    }

    // 8. Expanding Perspective Floor Circuit Wave-Bars & Traveling Data-Packets (`y = gy - 20..gy + 95`)
    ctx.globalCompositeOperation = 'source-over';
    for (let wv = 0; wv < 2; wv++) {
      const cyc = (t * 0.55 + wv * 0.5) % 1;
      const wy = Math.round((gy - 16 + cyc * 112) / 2) * 2;
      const wSpan = Math.round((240 + cyc * 580) / 4) * 4;
      const wxMid = Math.round(drawX + drawW * 0.50);
      ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.28 * alpha;
      ctx.fillStyle = cPrim;
      ctx.fillRect(wxMid - wSpan, wy, wSpan * 2, 2);
    }
    for (let p = 0; p < 12; p++) {
      const cyc = (t * (0.56 + (p % 3) * 0.14) + p * 0.083) % 1;
      const laneFrac = -0.38 + (p / 11) * 0.76;
      const px = Math.round((drawX + drawW * 0.50 + laneFrac * (360 + cyc * 640)) / 4) * 4;
      const py = Math.round((gy - 18 + cyc * 114) / 2) * 2;
      ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.78 * alpha;
      ctx.fillStyle = p % 2 === 0 ? cPrim : cSec;
      ctx.fillRect(px - 8, py, 16, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 2, py, 4, 2);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Computes crisp pixel-snapped patrol & firing coordinates for Cob's twin Flying Command Drones.
   *   - Patrols smoothly inside Cob stage airspace (`cob_monitor*`) when idle
   *   - Banks into flanking aerial firing perches around `cobAssistTargetX` when `cobAssistTimer > 0`
   */
  _getCobDronePositions(ww, gy) {
    const t = this.time || 0;
    const drawW = 1920;
    const drawH = 1080;
    const drawX = Math.round((ww - drawW) * 0.5);
    const drawY = Math.round(gy - drawH * 0.82);
    const eyeX = Math.round(drawX + drawW * 0.4734);
    const eyeY = Math.round(drawY + drawH * 0.5083);

    let lockBlend = 0;
    if (this.cobAssistTimer > 0) {
      const dur = Math.max(0.1, this.cobAssistMaxTimer || 1.12);
      const prog = Math.max(0, Math.min(1, 1 - this.cobAssistTimer / dur));
      lockBlend =
        prog < 0.14
          ? 0.45 + 0.55 * (prog / 0.14)
          : prog <= 0.78
            ? 1.0
            : Math.max(0, (1 - prog) / 0.22);
    }

    const patrolX0 = ww * 0.30 + Math.sin(t * 1.65) * 68;
    const patrolY0 = (gy - 320) + Math.cos(t * 2.55) * 14;
    const patrolX1 = ww * 0.70 + Math.cos(t * 1.52 + 1.1) * 68;
    const patrolY1 = (gy - 330) + Math.sin(t * 2.40 + 0.8) * 14;

    const tgtX = Math.max(
      180,
      Math.min(ww - 180, Number.isFinite(this.cobAssistTargetX) ? this.cobAssistTargetX : ww * 0.65)
    );
    const atkX0 = Math.max(140, Math.min(ww - 280, tgtX - 188));
    const atkY0 = gy - 334 + Math.sin(t * 9.0) * 3;
    const atkX1 = Math.max(280, Math.min(ww - 140, tgtX + 188));
    const atkY1 = gy - 344 + Math.cos(t * 9.0) * 3;

    const minY = gy - 364;
    const maxY = gy - 286;
    const specs = [
      { id: 0, px: patrolX0, py: patrolY0, ax: atkX0, ay: atkY0 },
      { id: 1, px: patrolX1, py: patrolY1, ax: atkX1, ay: atkY1 }
    ];

    return specs.map((sp) => {
      const rawX = sp.px + (sp.ax - sp.px) * lockBlend;
      const rawY = sp.py + (sp.ay - sp.py) * lockBlend;
      const clampedX = Math.max(132, Math.min(ww - 132, rawX));
      const clampedY = Math.max(minY, Math.min(maxY, rawY));
      const x = Math.round(clampedX / 2) * 2;
      const y = Math.round(clampedY / 2) * 2;
      const aimDir = tgtX >= x ? 1 : -1;
      return {
        id: sp.id,
        x,
        y,
        muzzleX: x + aimDir * 16,
        muzzleY: y + 22,
        antennaX: x,
        antennaY: y - 32,
        aimDir,
        lockBlend,
        eyeX,
        eyeY
      };
    });
  }

  /**
   * Animated Pixel-by-Pixel Flying Cob Command Drones (`assets/sprites/cob_drone_anim.png`):
   *   - 8x4 sprite atlas of 96x96 sculpted mecha-seraph drones (`Row 0` Idle Patrol, `Row 1` Strike Lock,
   *     `Row 2` Inferno, `Row 3` Glacial) facing `+X` & mirrored cleanly via `ctx.scale(aimDir, 1)` (`0` ctx.rotate!)
   */
  drawCobFlyingDronesWorld(ctx, ww, gy) {
    const drones = this._getCobDronePositions(ww, gy);
    if (!drones || !drones.length) return;

    const t = this.time || 0;
    const activeStage = this.getActiveStageId?.() || 'cob_monitor';
    const isInf = activeStage === 'cob_monitor_inferno';
    const isGlac = activeStage === 'cob_monitor_glacial';
    const colRed = isInf ? '#ff2a55' : '#ff2a6d';
    const droneCols = [
      isInf ? '#fde047' : '#05ffa1',
      isInf ? '#fb923c' : '#22d3ee'
    ];
    const assistActive = this.cobAssistTimer > 0;
    const glowBase = isInf ? this.glowOrange : this.glowCyan;
    const droneSheet = PixelForge.ensureImage?.(PixelForge.initAssets()?.cobDroneAnim);
    const hasSheet = Boolean(
      droneSheet && droneSheet.complete && droneSheet.naturalWidth >= 768 && droneSheet.naturalHeight >= 384
    );
    const rowIdx = assistActive ? 1 : isInf ? 2 : isGlac ? 3 : 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const d of drones) {
      const trimCol = droneCols[d.id % droneCols.length];
      const dir = d.aimDir;
      const dx = d.x;
      const dy = d.y;

      // Subtle localized drone aura (`'lighter'` capped <= 0.10)
      if (glowBase) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.10, 0.05 + d.lockBlend * 0.04);
        ctx.drawImage(glowBase, dx - 40, dy - 40, 80, 80);
      }

      if (hasSheet) {
        const frame = (Math.floor(t * (assistActive ? 16 : 11)) + d.id * 4) % 8;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.scale(dir, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.98;
        ctx.drawImage(droneSheet, frame * 96, rowIdx * 96, 96, 96, -48, -48, 96, 96);
        ctx.restore();
        continue;
      }

      // Compact fallback if sheet image is still streaming
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.96;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(dx - 12, dy - 8, 24, 16);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(dx - 22, dy - 4, 10, 4);
      ctx.fillRect(dx + 12, dy - 4, 10, 4);
      ctx.fillStyle = colRed;
      ctx.fillRect(dx + dir * 2 - 2, dy - 2, 5, 3);
      ctx.fillStyle = trimCol;
      ctx.fillRect(d.muzzleX - 2, d.muzzleY - 2, 4, 4);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * World-Space Foreground "COB HELPING NYX" Coordinated Tri-Beam Strike (`this.cobAssistTimer > 0`):
   *   - Fires Cob's signature Crimson-Red Eye Beam (`#ff2a6d`/`#ff2a55`) directly from Cob's eye on the monitor
   *   - Sends visible neon command uplink tethers from Cob to his Twin Flying Command Drones (`d0`, `d1`)
   *   - Both Flying Command Drones bank into flanking perches & fire the 2 secondary neon beams onto `cobAssistTargetX`
   *   - Keeps ALL beams & HUD overlays translucent (`source-over <= 0.44`, `'lighter' <= 0.14`) (`0` ctx.rotate!)
   */
  drawCobCreatorStrikeWorld(ctx, ww, gy) {
    const dur = Math.max(0.1, this.cobAssistMaxTimer || 1.12);
    const prog = Math.max(0, Math.min(1, 1 - this.cobAssistTimer / dur));
    const env =
      prog < 0.07
        ? 0.65 + 0.35 * (prog / 0.07)
        : prog < 0.74
          ? 1.0
          : Math.max(0, (1 - prog) / 0.26);
    if (env <= 0.02) return;

    const t = this.time;
    const activeStage = this.getActiveStageId?.() || 'cob_monitor';
    const isInf = activeStage === 'cob_monitor_inferno';

    // Cob Eye stays Crimson-Red across ALL variants; Twin Drones fire complementary neon beams!
    const colPri = isInf ? '#ff2a55' : '#ff2a6d';
    const colSec = isInf ? '#fde047' : '#05ffa1';
    const colAcc = isInf ? '#fb923c' : '#22d3ee';

    const drawW = 1920;
    const drawH = 1080;
    const drawX = Math.round((ww - drawW) * 0.5);
    const drawY = Math.round(gy - drawH * 0.82);

    // Cob origin coordinates behind the glass (`0.56x` re-framed monitor!)
    const eyeX = Math.round(drawX + drawW * 0.4734);
    const eyeY = Math.round(drawY + drawH * 0.5083);
    const wingLX = Math.round(drawX + drawW * 0.494);
    const wingRX = Math.round(drawX + drawW * 0.574);
    const wingY = Math.round(drawY + drawH * 0.642);

    const drones = this._getCobDronePositions(ww, gy);
    const d0 = drones[0];
    const d1 = drones[1];

    const tgtX = Math.round((Number.isFinite(this.cobAssistTargetX) ? this.cobAssistTargetX : ww * 0.65) / 2) * 2;
    const tgtY = Math.round(gy - 94);
    const nyxX = Math.round((Number.isFinite(this.cobAssistNyxX) ? this.cobAssistNyxX : ww * 0.35) / 2) * 2;
    const nyxY = Math.round(gy - 96);

    const drawTranslucentNeonBeam = (x0, y0, x1, y1, col, beamEnv, seedOffset = 0) => {
      if (beamEnv <= 0.03) return;
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(24, Math.min(220, Math.round(dist / 4)));
      // Continuous gap-free 4px-stepped translucent outer glow + mid neon ribbon (`alpha <= 0.34`, fighters crystal-clear underneath!)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(0.14, beamEnv * 0.14);
      ctx.fillStyle = col;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const bx = Math.round((x0 + (x1 - x0) * u) / 2) * 2;
        const by = Math.round((y0 + (y1 - y0) * u) / 2) * 2;
        ctx.fillRect(bx - 7, by - 7, 14, 14);
      }
      ctx.globalAlpha = Math.min(0.32, beamEnv * 0.32);
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const bx = Math.round((x0 + (x1 - x0) * u) / 2) * 2;
        const by = Math.round((y0 + (y1 - y0) * u) / 2) * 2;
        ctx.fillRect(bx - 3, by - 3, 6, 6);
      }
      ctx.globalAlpha = Math.min(0.44, beamEnv * 0.44);
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s <= steps; s += 2) {
        const u = s / steps;
        const bx = Math.round((x0 + (x1 - x0) * u) / 2) * 2;
        const by = Math.round((y0 + (y1 - y0) * u) / 2) * 2;
        ctx.fillRect(bx - 1, by - 1, 2, 2);
      }
      // Subtle additive sheen (`<= 0.12`)
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.12, beamEnv * 0.12);
      ctx.fillStyle = col;
      for (let s = 0; s <= steps; s += 2) {
        const u = s / steps;
        const bx = Math.round((x0 + (x1 - x0) * u) / 2) * 2;
        const by = Math.round((y0 + (y1 - y0) * u) / 2) * 2;
        ctx.fillRect(bx - 4, by - 4, 8, 8);
      }
      // 8 spiraling animated neon diamond packets shooting down into target (`0` solid opaque blob!)
      ctx.globalCompositeOperation = 'source-over';
      for (let p = 0; p < 8; p++) {
        const pu = (prog * 1.9 + p / 8 + seedOffset) % 1;
        const sway = Math.sin(pu * Math.PI * 5 + p) * 6;
        const px = Math.round((x0 + (x1 - x0) * pu + sway) / 2) * 2;
        const py = Math.round((y0 + (y1 - y0) * pu) / 2) * 2;
        ctx.globalAlpha = Math.min(0.52, beamEnv * Math.sin(pu * Math.PI) * 0.52);
        ctx.fillStyle = p % 2 === 0 ? '#ffffff' : colAcc;
        ctx.fillRect(px - 3, py - 3, 6, 6);
      }
    };

    const drawCommandUplink = (x0, y0, x1, y1, col, seedOffset = 0) => {
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(16, Math.min(120, Math.round(dist / 6)));
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(0.24, env * 0.24);
      ctx.fillStyle = col;
      for (let s = 0; s <= steps; s += 2) {
        const u = s / steps;
        const ux = Math.round((x0 + (x1 - x0) * u) / 2) * 2;
        const uy = Math.round((y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 18) / 2) * 2;
        ctx.fillRect(ux - 1, uy - 1, 3, 3);
      }
      for (let p = 0; p < 5; p++) {
        const pu = (prog * 2.8 + p / 5 + seedOffset) % 1;
        const px = Math.round((x0 + (x1 - x0) * pu) / 2) * 2;
        const py = Math.round((y0 + (y1 - y0) * pu - Math.sin(pu * Math.PI) * 18) / 2) * 2;
        ctx.globalAlpha = Math.min(0.46, env * Math.sin(pu * Math.PI) * 0.46);
        ctx.fillStyle = p % 2 === 0 ? '#ffffff' : col;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    };

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Translucent Neon Crimson-Gold 4-Point Command Eye Glare at `(eyeX, eyeY)`
    const starSpan = Math.round((16 + 14 * env) / 2) * 2;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.46, env * 0.46);
    ctx.fillStyle = colPri;
    ctx.fillRect(eyeX - starSpan, eyeY - 2, starSpan * 2, 4);
    ctx.fillRect(eyeX - 2, eyeY - starSpan, 4, starSpan * 2);
    ctx.fillStyle = colAcc;
    ctx.fillRect(eyeX - Math.round(starSpan * 0.5), eyeY - 2, starSpan, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(eyeX - 3, eyeY - 3, 6, 6);

    // Translucent neon wing-chevron surge arcs flanking Cob's shoulders behind monitor glass (`alpha <= 0.36`)
    for (let wv = 0; wv < 3; wv++) {
      const cyc = (prog * 1.6 + wv * 0.33) % 1;
      const arcA = Math.min(0.36, env * Math.sin(cyc * Math.PI) * 0.36);
      const dyOff = Math.round(-cyc * 36);
      ctx.globalAlpha = arcA;
      ctx.fillStyle = wv % 2 === 0 ? colSec : colPri;
      for (let d = 0; d < 5; d++) {
        ctx.fillRect(wingLX - 18 - d * 6, wingY + dyOff - d * 4, 5, 3);
        ctx.fillRect(wingRX + 14 + d * 6, wingY + dyOff - d * 4, 5, 3);
      }
    }

    // 2. Translucent Pop-Out Command Prompt Window beside Cob (`> COB_ASSIST.EXE`, `alpha <= 0.42`)
    const cmdX = Math.round(eyeX + 46);
    const cmdY = Math.round(eyeY - 14);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.36, env * 0.36);
    ctx.fillStyle = '#090b1a';
    ctx.fillRect(cmdX, cmdY, 132, 34);
    ctx.globalAlpha = Math.min(0.44, env * 0.44);
    ctx.fillStyle = colSec;
    ctx.fillRect(cmdX, cmdY, 132, 3);
    ctx.fillRect(cmdX, cmdY + 31, 132, 3);
    ctx.fillRect(cmdX, cmdY, 3, 34);
    ctx.fillRect(cmdX + 129, cmdY, 3, 34);
    ctx.fillStyle = colPri;
    ctx.fillRect(cmdX + 8, cmdY + 8, 56, 4);
    ctx.fillStyle = colAcc;
    ctx.fillRect(cmdX + 8, cmdY + 16, Math.round(36 + 72 * env), 4);
    ctx.fillStyle = colSec;
    ctx.fillRect(cmdX + 8, cmdY + 23, 88, 3);

    // 2B. Cob-to-Drone Command Uplink Tethers + Antenna Pulse Node (`0` square brackets!)
    drawCommandUplink(eyeX, eyeY, d0.antennaX, d0.antennaY, colSec, 0.05);
    drawCommandUplink(eyeX, eyeY, d1.antennaX, d1.antennaY, colAcc, 0.42);
    for (const dr of [d0, d1]) {
      const drCol = dr.id === 0 ? colSec : colAcc;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(0.42, env * 0.42);
      ctx.fillStyle = drCol;
      ctx.fillRect(dr.antennaX - 5, dr.antennaY - 1, 10, 2);
      ctx.fillRect(dr.antennaX - 1, dr.antennaY - 5, 2, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dr.antennaX - 1, dr.antennaY - 1, 2, 2);
    }

    // 3. Coordinated Tri-Beam Attack: Cob's Crimson-Red Eye Beam + Twin Flying Drone Beams onto Target!
    const envA = env;
    const envB = prog < 0.05 ? 0.55 + 0.45 * (prog / 0.05) : env;
    const envC = prog < 0.09 ? 0.50 + 0.50 * (prog / 0.09) : env;
    drawTranslucentNeonBeam(d0.muzzleX, d0.muzzleY, tgtX - 22, tgtY + 6, colSec, envA, 0.10);
    drawTranslucentNeonBeam(d1.muzzleX, d1.muzzleY, tgtX + 22, tgtY + 6, colAcc, envB, 0.35);
    drawTranslucentNeonBeam(eyeX, eyeY, tgtX, tgtY - 6, colPri, envC, 0.65);

    // 4. Subtle Cyber-Mint Sustain Arc onto Nyx from Nearest Command Drone (`alpha <= 0.24`)
    const relayDrone = Math.abs(d0.x - nyxX) <= Math.abs(d1.x - nyxX) ? d0 : d1;
    ctx.globalCompositeOperation = 'source-over';
    for (let s = 0; s < 10; s++) {
      const uStep = (s / 9 + t * 2.8) % 1;
      const arcLift = -28 * Math.sin(uStep * Math.PI);
      const px = Math.round((relayDrone.x + (nyxX - relayDrone.x) * uStep) / 2) * 2;
      const py = Math.round((relayDrone.y + (nyxY - relayDrone.y) * uStep + arcLift) / 2) * 2;
      ctx.globalAlpha = Math.min(0.24, env * Math.sin(uStep * Math.PI) * 0.24);
      ctx.fillStyle = s % 2 === 0 ? colSec : colAcc;
      ctx.fillRect(px - 2, py - 2, 5, 5);
    }

    // 5. Target Translucent Neon Reticle, Cyber-Octagon Lock Ring, X-Slash (`step=3px`), & Floor Pulse at `cobAssistTargetX`
    const lockPad = Math.round(48 + (1 - env) * 16);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.44, env * 0.44);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const bx = tgtX + sx * lockPad;
        const by = tgtY + sy * lockPad;
        ctx.fillStyle = colSec;
        ctx.fillRect(sx < 0 ? bx : bx - 20, by - 2, 20, 4);
        ctx.fillRect(bx - 2, sy < 0 ? by : by - 20, 4, 20);
        ctx.fillStyle = colAcc;
        ctx.fillRect(bx - 2, by - 2, 4, 4);
      }
    }
    // Cyber-Octagon Lock Ring + 4 Cardinal Star-Pings around target (`alpha <= 0.38`)
    ctx.globalAlpha = Math.min(0.38, env * 0.38);
    for (let k = 0; k < 24; k++) {
      const th = (k / 24) * Math.PI * 2 + prog * 3.0;
      const ox = Math.round((tgtX + Math.cos(th) * 62) / 2) * 2;
      const oy = Math.round((tgtY + Math.sin(th) * 62) / 2) * 2;
      ctx.fillStyle = k % 2 === 0 ? colPri : colSec;
      ctx.fillRect(ox - 2, oy - 2, 4, 4);
      if (k % 6 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox - 4, oy - 1, 8, 2);
        ctx.fillRect(ox - 1, oy - 4, 2, 8);
      }
    }
    // Crisp continuous Translucent Neon Diagonal X-Slash centered over target (`step = 3px`, `alpha <= 0.42`)
    const slashHalf = Math.round(44 + 24 * prog);
    ctx.globalAlpha = Math.min(0.42, env * 0.42);
    for (let k = -slashHalf; k <= slashHalf; k += 3) {
      ctx.fillStyle = (k & 4) === 0 ? colPri : colSec;
      ctx.fillRect(tgtX + k - 3, tgtY + Math.round(k * 0.68) - 3, 6, 6);
      ctx.fillStyle = (k & 4) === 0 ? colSec : colPri;
      ctx.fillRect(tgtX + k - 3, tgtY - Math.round(k * 0.68) - 3, 6, 6);
    }
    // Translucent expanding neon ground pulse at `tgtX`
    ctx.fillStyle = colPri;
    ctx.globalAlpha = Math.min(0.38, env * 0.38);
    ctx.fillRect(tgtX - Math.round(lockPad * 1.15), gy - 6, Math.round(lockPad * 2.3), 4);
    ctx.fillStyle = colSec;
    ctx.fillRect(tgtX - Math.round(lockPad * 0.65), gy - 5, Math.round(lockPad * 1.3), 2);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * World-Space Full-Viewport Diagonal Katana Dimensional Rift Seam (`this.stageSliceTimer > 0`):
   *   - Blazing diagonal katana cut line across the entire viewport (`0` ctx.rotate!)
   *   - High-voltage jagged lightning surge bolts racing along & branching off the dimensional seam
   *   - 40 sakura petals (or blazing solar cinders for `shogunate_inferno` / frost sakura for `shogunate_glacial`) bursting from the cut
   */
  drawDimensionalStageSliceWorld(ctx, ww, gy) {
    const p = Math.max(
      0,
      Math.min(1, 1 - this.stageSliceTimer / Math.max(0.1, this.stageSliceMaxTimer || 1.08))
    );
    const fade = Math.max(0, 1 - p);
    if (fade <= 0.01) return;

    const sliceCx = Number.isFinite(this.stageSliceFocusX) ? this.stageSliceFocusX : ww * 0.5;
    const sliceCy = Number.isFinite(this.stageSliceFocusY) ? this.stageSliceFocusY : gy - 92;
    const dir = this.stageSliceDir === -1 ? -1 : 1;
    const slope = -0.26 * dir;
    const x0 = -2400;
    const x1 = ww + 2400;
    const y0 = sliceCy + (x0 - sliceCx) * slope;
    const y1 = sliceCy + (x1 - sliceCx) * slope;
    const isInfernoSlice = this.stageSliceToId === 'shogunate_inferno';
    const isGlacialSlice = this.stageSliceToId === 'shogunate_glacial';

    const outerCol = isInfernoSlice ? '#ea580c' : isGlacialSlice ? '#a855f7' : '#4f46e5';
    const midCol = isInfernoSlice ? '#fb923c' : isGlacialSlice ? '#67e8f9' : '#38bdf8';
    const petalCols = isInfernoSlice
      ? ['#fef08a', '#fb923c', '#f43f5e', '#ffffff']
      : isGlacialSlice
        ? ['#bae6fd', '#67e8f9', '#f5d0fe', '#ffffff']
        : ['#fda4af', '#fb7185', '#fbcfe8', '#ffffff'];

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const halfSpanX =
      Number.isFinite(this.width) && this.width > 0
        ? Math.ceil((this.width * 0.5) / Math.max(0.18, this.zoom || 1)) + 240
        : 1200;
    const refCamX = Number.isFinite(this.camX) ? this.camX : sliceCx;
    const minVisX = Math.floor(Math.max(x0, refCamX - halfSpanX) / 4) * 4;
    const maxVisX = Math.ceil(Math.min(x1, refCamX + halfSpanX) / 4) * 4;

    const drawSteppedSeg = (ax, ay, bx, by, pxW, pxH) => {
      const dx = bx - ax;
      const dy = by - ay;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2));
      const ox = pxW >> 1;
      const oy = pxH >> 1;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const sx = Math.round((ax + dx * u) * 0.5) * 2;
        const sy = Math.round((ay + dy * u) * 0.5) * 2;
        ctx.fillRect(sx - ox, sy - oy, pxW, pxH);
      }
    };

    // 1. Surgical Anime Hairline Katana Seam (`outer <= 5.5px` at `alpha <= 0.42`, `mid <= 2.2px` sheath, `core 1.2px` `#ffffff`; `0` vector stroke!)
    const seamFade = p < 0.22 ? 1.0 : Math.max(0, 1 - (p - 0.22) / 0.78);
    if (seamFade > 0.01) {
      const outerH = Math.max(2, Math.min(5, Math.round((1 - p * 0.65) * 5)));
      const midH = Math.max(1, Math.min(2, Math.round((1 - p * 0.5) * 2)));
      const outerOff = outerH >> 1;
      const midOff = midH >> 1;

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = seamFade * 0.38;
      ctx.fillStyle = outerCol;
      for (let sx = minVisX; sx <= maxVisX; sx += 4) {
        const sy = Math.round(sliceCy + (sx + 2 - sliceCx) * slope);
        ctx.fillRect(sx, sy - outerOff, 4, outerH);
      }

      ctx.globalAlpha = seamFade * 0.72;
      ctx.fillStyle = midCol;
      for (let sx = minVisX; sx <= maxVisX; sx += 4) {
        const sy = Math.round(sliceCy + (sx + 2 - sliceCx) * slope);
        ctx.fillRect(sx, sy - midOff, 4, midH);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = seamFade * 0.98;
      ctx.fillStyle = '#ffffff';
      for (let sx = minVisX; sx <= maxVisX; sx += 4) {
        const sy = Math.round(sliceCy + (sx + 2 - sliceCx) * slope);
        ctx.fillRect(sx, sy, 4, 1);
      }
    }

    // 2. 6 Stepped `2x2` Pixel-Grid Jagged Lightning Surge Arcs + Forking Branches along the Katana Rift (`0` vector stroke!)
    const tick = Math.floor(this.time * 24);
    const jHash = (n) => {
      const s = Math.sin(n * 91.7 + tick * 271.3) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };
    const seamStartX = sliceCx - 760;
    const seamEndX = sliceCx + 760;
    for (let b = 0; b < 6; b++) {
      const segs = 18;
      const pts = [];
      for (let s = 0; s <= segs; s++) {
        const u = s / segs;
        const bx = seamStartX + (seamEndX - seamStartX) * u;
        const baseBy = sliceCy + (bx - sliceCx) * slope;
        const spread = (b % 2 === 0 ? 1 : -1) * (10 + (b >> 1) * 14) * (0.4 + 0.6 * p);
        const jit = jHash(b * 37 + s * 13) * (22 - p * 8);
        pts.push([Math.round(bx / 2) * 2, Math.round((baseBy + spread + jit) / 2) * 2]);
      }

      // Pass 1: Outer additive pixel sheath
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.56;
      ctx.fillStyle = b % 2 === 0 ? midCol : outerCol;
      const sheathSz = b < 2 ? 4 : 3;
      for (let s = 1; s < pts.length; s++) {
        drawSteppedSeg(pts[s - 1][0], pts[s - 1][1], pts[s][0], pts[s][1], sheathSz, sheathSz);
      }

      // Pass 2: Crisp `#ffffff` pixel core
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.92;
      ctx.fillStyle = '#ffffff';
      for (let s = 1; s < pts.length; s++) {
        drawSteppedSeg(pts[s - 1][0], pts[s - 1][1], pts[s][0], pts[s][1], 2, 2);
      }

      // Forking lightning tendrils leaping vertically off the dimensional cut (`2x2` pixel steps)
      for (let fk = 2; fk < segs; fk += 4) {
        const anchor = pts[fk];
        const fSign = (fk + b) % 2 === 0 ? -1 : 1;
        const mx = anchor[0] + Math.round((jHash(b * 71 + fk) * 34) / 2) * 2;
        const my = anchor[1] + fSign * (Math.round((44 + Math.abs(jHash(b * 53 + fk)) * 48) / 2) * 2);
        const ex = mx + Math.round((jHash(b * 97 + fk) * 38) / 2) * 2;
        const ey = my + fSign * (Math.round((40 + Math.abs(jHash(b * 113 + fk)) * 52) / 2) * 2);

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.52;
        ctx.fillStyle = midCol;
        drawSteppedSeg(anchor[0], anchor[1], mx, my, 3, 3);
        drawSteppedSeg(mx, my, ex, ey, 2, 2);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.88;
        ctx.fillStyle = '#ffffff';
        drawSteppedSeg(anchor[0], anchor[1], mx, my, 2, 1);
        drawSteppedSeg(mx, my, ex, ey, 1, 1);
      }
    }

    // 3. 40 Dimensional Cherry Blossoms / Blazing Cinders bursting outward along the katana cut!
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 40; i++) {
      const laneX = -80 + ((i * 39) % (ww + 160));
      const baseCutY = sliceCy + (laneX - sliceCx) * slope;
      const side = i % 2 === 0 ? -1 : 1;
      const burstDist = (32 + (i % 5) * 28) * Math.pow(p, 0.72);
      const windX = p * dir * (48 + (i % 4) * 22);
      const px = Math.round((laneX + windX + side * slope * burstDist) / 2) * 2;
      const py = Math.round((baseCutY + side * burstDist) / 2) * 2;

      ctx.globalAlpha = fade * 0.94;
      if (isInfernoSlice) {
        ctx.fillStyle = petalCols[i % petalCols.length];
        ctx.fillRect(px - 3, py - 2, 6, 3);
        ctx.fillRect(px - 1, py + 1, 3, 2);
      } else {
        this.drawSakuraPetalPixel(
          ctx,
          px,
          py,
          (i + tick) & 3,
          1,
          petalCols[i % petalCols.length],
          '#ffffff'
        );
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * World-Space Advancing Crystalline Freeze-Wave Wall & Borealis Curtain (`this.glacialWipeTimer > 0`):
   *   - Advancing left & right jagged stepped-pixel Glacier Prism Walls & Sapphire/Cyan Borealis Curtains
   *   - Sweeping ground frost-rime wake across the stage floor
   *   - 48 wind-whipped pixel snowflakes & diamond-prism shards
   *   - Subtle 4x4 Bayer frost edge flash (`0` ctx.rotate / arc / ellipse / stroke!)
   */
  drawGlacialFreezeWaveWorld(ctx, ww, gy) {
    const maxDur = Math.max(0.1, this.glacialWipeMaxTimer || 1.38);
    const p = Math.max(0, Math.min(1, 1 - this.glacialWipeTimer / maxDur));
    const fade = p < 0.72 ? 1.0 : Math.max(0, 1 - (p - 0.72) / 0.28);
    if (fade <= 0.01) return;

    const easeP = 1 - Math.pow(1 - p, 2.15);
    const frontRadius = Math.round((easeP * 1460) / 4) * 4;
    const originX =
      Math.round(
        (Number.isFinite(this.glacialWipeFocusX) ? this.glacialWipeFocusX : ww * 0.5) / 4
      ) * 4;
    const bandTop = Math.round(gy - 1020);
    const bandBot = Math.round(gy + 420);
    const stepH = Math.round((bandBot - bandTop) / 16);
    const subH = Math.max(4, Math.round(stepH / 3));
    const tick = Math.floor((this.time || 0) * 18);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Advancing Left & Right Jagged Stepped-Pixel Glacier Prism Walls & Sapphire/Cyan Borealis Curtains
    for (let side = -1; side <= 1; side += 2) {
      const teeth = side < 0 ? GLACIAL_WIPE_TOOTH_L : GLACIAL_WIPE_TOOTH_R;
      const inward = -side;

      for (let b = 0; b < 16; b++) {
        const baseY = bandTop + b * stepH;
        const wallX = Math.round(originX + side * (frontRadius + teeth[b] * 16));

        for (let sub = 0; sub < 3; sub++) {
          const sy = baseY + sub * subH;
          const sh = sub === 2 ? bandTop + (b + 1) * stepH - sy : subH;
          const notch = ((b + sub) % 2 === 0 ? 4 : -4) * side;
          const edgeX = wallX + notch;

          // Deep Sapphire outer curtain (#1d4ed8)
          const wSapphire = 56;
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade * 0.34;
          ctx.fillStyle = '#1d4ed8';
          ctx.fillRect(inward > 0 ? edgeX : edgeX - wSapphire, sy, wSapphire, sh);

          // Electric Cerulean borealis sheath (#38bdf8)
          const wCerulean = 32;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.54;
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(inward > 0 ? edgeX : edgeX - wCerulean, sy, wCerulean, sh);

          // Faceted Glacier Aqua prism wall (#67e8f9)
          const wAqua = 16;
          ctx.globalAlpha = fade * 0.80;
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(inward > 0 ? edgeX - 2 : edgeX - wAqua + 2, sy, wAqua, sh);

          // Razor-crisp Frost Crest highlight (#ffffff)
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade * 0.94;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(edgeX - 2, sy, 4, sh);
        }

        // Tall vertical Borealis Curtain ribbons rippling behind the advancing freeze front
        if (b >= 3 && b <= 11 && b % 2 === 0) {
          const curDrift = Math.round(Math.sin((this.time || 0) * 5.2 + b) * 6);
          const curX = wallX + inward * (24 + (b % 3) * 16) + curDrift;
          const curH = 64 + (b % 3) * 28;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.36;
          ctx.fillStyle = b % 4 === 0 ? '#1d4ed8' : '#38bdf8';
          ctx.fillRect(curX - 4, baseY, 8, curH);
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(curX - 2, baseY + 8, 4, Math.max(12, curH - 16));
        }
      }

      // Subtle 4x4 Bayer frost edge flash along advancing crystal wall
      const bayerCenterY = Math.round((gy - 220) / 4) * 4;
      const wallMidX = Math.round((originX + side * (frontRadius + teeth[8] * 16)) / 4) * 4;
      const edgeFlashBoost = p < 0.18 ? 1.35 : 1.0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.18, 0.14 * fade * edgeFlashBoost);
      for (let dy = -260; dy <= 220; dy += 4) {
        const ny = Math.abs(dy) / 260;
        const by = (dy >> 2) & 3;
        for (let dx = -16; dx <= 16; dx += 4) {
          const nx = Math.abs(dx) / 20;
          const falloff = Math.max(0, 1 - (nx * nx * 0.72 + ny * ny * 0.36));
          if (falloff <= 0.1) continue;
          const bx = (dx >> 2) & 3;
          if (falloff * 16.0 > GLACIAL_WIPE_BAYER_4X4[by][bx]) {
            ctx.fillStyle = Math.abs(dx) <= 4 ? '#ffffff' : '#67e8f9';
            ctx.fillRect(wallMidX + dx, bayerCenterY + dy, 4, 4);
          }
        }
      }
    }

    // 2. Sweeping Ground Frost-Rime Wake across the Arena Floor
    const wakeLeft = Math.round((originX - frontRadius - 32) / 4) * 4;
    const wakeRight = Math.round((originX + frontRadius + 32) / 4) * 4;
    const clampedWakeL = Math.max(-1200, wakeLeft);
    const clampedWakeR = Math.min(ww + 1200, wakeRight);
    const wakeW = Math.max(0, clampedWakeR - clampedWakeL);
    if (wakeW > 8) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.42;
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(clampedWakeL, gy - 4, wakeW, 14);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.56;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(clampedWakeL, gy - 2, wakeW, 6);

      const shardStep = 36;
      const startShardX = Math.ceil(clampedWakeL / shardStep) * shardStep;
      for (let sx = startShardX; sx <= clampedWakeR; sx += shardStep) {
        const distRatio = Math.min(1, Math.abs(sx - originX) / Math.max(1, frontRadius));
        const frontBoost = distRatio > 0.72 ? 2 : 1;
        const hSpike = (6 + ((Math.abs(sx) * 7) % 14)) * frontBoost;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.88;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx - 4, gy - hSpike, 8, hSpike + 4);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(sx - 2, gy - hSpike + 2, 4, hSpike);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 2, gy - hSpike, 2, 4);
      }
    }

    // 3. 48 Wind-Whipped Pixel Snowflakes & Diamond-Prism Shards riding both freeze fronts
    const shardCols = ['#bae6fd', '#67e8f9', '#38bdf8', '#ffffff'];
    for (let i = 0; i < 48; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      const bandOffset = (i % 16);
      const wallTooth = (dir < 0 ? GLACIAL_WIPE_TOOTH_L : GLACIAL_WIPE_TOOTH_R)[bandOffset];
      const baseFrontX = originX + dir * (frontRadius + wallTooth * 16);
      const trailJitter = -dir * ((i * 23) % 120) + Math.sin(p * 9.5 + i * 1.7) * 20;
      const px = Math.round((baseFrontX + trailJitter) / 2) * 2;
      const py = Math.round((gy - 490 + ((i * 73) % 520)) / 2) * 2;
      const sFade = fade * (0.68 + 0.32 * Math.sin(p * 12 + i));
      if (sFade <= 0.03) continue;

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = sFade;
      if (i % 2 === 0) {
        this.drawDiamondCrystalPixel(
          ctx,
          px,
          py,
          (tick + i) & 1,
          i % 4 === 0 ? 1.8 : 1,
          shardCols[i % shardCols.length],
          '#ffffff',
          '#1d4ed8'
        );
      } else {
        const dxStep = dir * 2;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(px, py, 4, 2);
        ctx.fillRect(px + dxStep, py + 2, 4, 2);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(px + dxStep, py + 2, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + dxStep * 2, py + 4, 2, 2);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * World-Space Fourth-Wall Cyber Digital Curtain Wipe (`this.cobWipeTimer > 0`):
   *   - Expanding cyan/magenta/gold pixel shutter walls revealing `COB-OS: FOURTH WALL TERMINAL` (`0` ctx.rotate!)
   */
  drawCobDigitalWipeWorld(ctx, ww, gy) {
    const maxDur = Math.max(0.1, this.cobWipeMaxTimer || 1.28);
    const p = Math.max(0, Math.min(1, 1 - this.cobWipeTimer / maxDur));
    const fade = p < 0.72 ? 1.0 : Math.max(0, 1 - (p - 0.72) / 0.28);
    if (fade <= 0.01) return;

    const easeP = 1 - Math.pow(1 - p, 2.2);
    const frontRadius = Math.round((easeP * 1460) / 4) * 4;
    const originX =
      Math.round(
        (Number.isFinite(this.cobWipeFocusX) ? this.cobWipeFocusX : ww * 0.5) / 4
      ) * 4;
    const bandTop = Math.round(gy - 1020);
    const bandBot = Math.round(gy + 420);
    const stepH = Math.round((bandBot - bandTop) / 16);

    const destStage = this.getActiveStageId?.() || 'cob_monitor';
    const isInfWipe = destStage === 'cob_monitor_inferno';
    const isGlacWipe = destStage === 'cob_monitor_glacial';
    const wipeCols = isInfWipe
      ? ['#fb923c', '#ef4444', '#fde047']
      : isGlacWipe
        ? ['#67e8f9', '#38bdf8', '#e879f9']
        : ['#22d3ee', '#d946ef', '#fde047'];

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let side = -1; side <= 1; side += 2) {
      for (let b = 0; b < 16; b++) {
        const y0 = bandTop + b * stepH;
        const stagger = side < 0 ? ((b * 3 + 1) % 6) * 18 : ((b * 5 + 2) % 6) * 18;
        const edgeX = Math.round(originX + side * (frontRadius + stagger));
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.72;
        ctx.fillStyle = b % 2 === 0 ? wipeCols[0] : wipeCols[1];
        ctx.fillRect(side < 0 ? edgeX - 18 : edgeX, y0, 18, stepH);
        ctx.globalAlpha = fade * 0.94;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(edgeX - 2, y0, 4, stepH);
      }
    }
    for (let i = 0; i < 36; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      const stagger = ((i * 5 + 1) % 6) * 18;
      const px = Math.round((originX + dir * (frontRadius + stagger) - dir * ((i * 29) % 110)) / 4) * 4;
      const py = Math.round((gy - 480 + ((i * 67) % 500)) / 4) * 4;
      ctx.globalAlpha = fade * 0.88;
      ctx.fillStyle = i % 3 === 0 ? wipeCols[2] : i % 2 === 0 ? wipeCols[0] : wipeCols[1];
      ctx.fillRect(px - 3, py - 3, 6, 6);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Renders a High-Contrast Anime / FF14 Limit Break 3 Impact Frame (`this.impactFrameTimer > 0`):
   *   - Alternates stark inverted White-on-Black / Black-on-White high-contrast flash
   *   - 48 razor-sharp radial speed-spikes bursting from `(impactFrameFocusX, impactFrameFocusY)`
   *   - Stark high-contrast silhouettes of every active fighter on the stage!
   */
  drawImpactFrameWorld(ctx, fighters, ww, gy) {
    const p = 1 - this.impactFrameTimer / (this.impactFrameMaxTimer || 0.15);
    const cx = Math.round((this.impactFrameFocusX ?? ww * 0.5) / 4) * 4;
    const cy = Math.round((this.impactFrameFocusY ?? gy - 90) / 4) * 4;
    const isInverted = p < 0.42;
    const IMPACT_STYLE_PALETTES = {
      inferno: { accent: '#fb923c', alt: '#fde047', bg: '#090302' },
      justice: { accent: '#38bdf8', alt: '#fde047', bg: '#03060d' },
      radiant: { accent: '#fde047', alt: '#38bdf8', bg: '#0a0702' },
      chrono: { accent: '#2dd4bf', alt: '#fde047', bg: '#02090d' },
      crimson: { accent: '#f43f5e', alt: '#fde047', bg: '#0c0205' },
      storm: { accent: '#818cf8', alt: '#38bdf8', bg: '#03040e' },
      emerald: { accent: '#34d399', alt: '#fde047', bg: '#020a06' },
      abyssal: { accent: '#c084fc', alt: '#f43f5e', bg: '#08020d' },
      forge: { accent: '#f59e0b', alt: '#34d399', bg: '#0b0502' },
      glacial: { accent: '#67e8f9', alt: '#ecfeff', bg: '#082f49' },
      cyber: { accent: '#00f0ff', alt: '#f43f5e', bg: '#02060c' },
      nebula: { accent: '#22d3ee', alt: '#d946ef', bg: '#050214' }
    };
    const pal = IMPACT_STYLE_PALETTES[this.impactFrameStyle] || IMPACT_STYLE_PALETTES.inferno;
    const accentCol = pal.accent;
    const invertedFlashCol = this.impactFrameStyle === 'glacial' ? '#ecfeff' : '#ffffff';

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Full-Arena Stark High-Contrast Backdrop Flash
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = isInverted ? invertedFlashCol : pal.bg;
    ctx.fillRect(-4000, -3000, ww + 8000, 6000);

    // 2. 48 Pixel-Stepped Radial Anime Impact Speed-Rays bursting from `(cx, cy)`
    const spikeCount = 48;
    const pxGrid = 6;
    for (let i = 0; i < spikeCount; i++) {
      const a = (i / spikeCount) * Math.PI * 2 + (i % 2 === 0 ? 0.03 : -0.02);
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const innerR = 32 + (i % 5) * 18 + p * 48;
      ctx.fillStyle =
        i % 4 === 0
          ? pal.accent
          : i % 4 === 2
            ? pal.alt
            : isInverted
              ? pal.bg
              : '#ffffff';

      for (let r = innerR; r <= 960; r += 18) {
        const bx = Math.round((cx + cosA * r) / pxGrid) * pxGrid;
        const by = Math.round((cy + sinA * r) / pxGrid) * pxGrid;
        const bw = r > 360 ? 18 : 12;
        const bh = r > 360 ? 12 : 6;
        ctx.fillRect(bx - (bw >> 1), by - (bh >> 1), bw, bh);
      }
    }

    // 3. Pixel-Stepped Octagonal Block Shock-Ring at `(cx, cy)`
    const ringR = 56 + p * 260;
    const ringSteps = 64;
    ctx.fillStyle = isInverted ? '#03040a' : '#ffffff';
    for (let s = 0; s < ringSteps; s++) {
      const a = (s / ringSteps) * Math.PI * 2;
      const rx = Math.round((cx + Math.cos(a) * ringR) / pxGrid) * pxGrid;
      const ry = Math.round((cy + Math.sin(a) * ringR) / pxGrid) * pxGrid;
      ctx.fillRect(rx - 6, ry - 6, 12, 12);
    }

    // 4. Stark High-Contrast Fighter Silhouettes (so every character stands out in dramatic anime impact silhouette!)
    const assets = PixelForge.initAssets();
    for (const f of fighters) {
      if (!f || f.isBenched) continue;
      const sprites = assets[f.heroId || 'warrior'];
      if (!sprites || !sprites.sheet || !sprites.sheet.complete) continue;
      const frameIdx = PixelForge.getFrameIndex(f, f.walkPhase || f.runeOrbit || 0);
      const groundPlantOffset = 4;

      // Chromatic Offset Rim Silhouette
      ctx.save();
      ctx.translate(
        Math.round(f.x + (f.x >= cx ? 8 : -8)),
        Math.round(f.y + groundPlantOffset)
      );
      ctx.scale(f.facing, 1);
      ctx.globalAlpha = 0.88;
      PixelForge.drawSilhouetteFrame(ctx, sprites, frameIdx, 208, 208, accentCol);
      ctx.restore();

      // Primary Stark Black or White Impact Silhouette
      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y + groundPlantOffset));
      ctx.scale(f.facing, 1);
      ctx.globalAlpha = 1.0;
      PixelForge.drawSilhouetteFrame(
        ctx,
        sprites,
        frameIdx,
        208,
        208,
        isInverted ? '#03040a' : '#ffffff'
      );
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Renders the FF14 Black Mage Limit Break 3 Full-Stage White-Out Deletion Screen (`this.whiteoutTimer > 0`):
   *   - Stepped cel-banded pixel-art thermonuclear white dome swallows the entire stage into pure blinding white light
   *   - Every fighter on the stage appears to get vaporized / deleted in dissolving high-contrast pixel ash silhouettes
   *     with horizontal pixel disintegration strips before vanishing into the pure white screen
   *   - Smoothly clears over the final 0.55s to reveal the transformed "LAYWASTE OF INFERNO" stage!
   */
  drawWhiteoutDeletionWorld(ctx, fighters, ww, gy) {
    const maxT = this.whiteoutMaxTimer || 1.35;
    const p = Math.max(0, Math.min(1, 1 - this.whiteoutTimer / maxT));
    const cx = Math.round((this.whiteoutFocusX ?? ww * 0.5) / 8) * 8;
    const cy = Math.round((this.whiteoutFocusY ?? gy - 60) / 8) * 8;

    // Envelope: rapid expansion (0..0.16), blinding total whiteout hold (0.16..0.58), smooth clearing reveal (0.58..1.0)
    const whiteAlpha =
      p < 0.14
        ? p / 0.14
        : p < 0.58
          ? 1.0
          : Math.max(0, 1 - (p - 0.58) / 0.42);
    if (whiteAlpha <= 0.005) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, whiteAlpha);

    // 1. Stepped Cel-Banded Pixel-Art Thermonuclear Cataclysm Dome (Horizontal Pixel Scanline Spans)
    const domeRadius = p < 0.22 ? 140 + (p / 0.22) * 1450 : 1600;
    const stepH = 12;
    const bands = [
      { scale: 1.0, col: '#ea580c' },
      { scale: 0.92, col: '#fb923c' },
      { scale: 0.82, col: '#fef08a' },
      { scale: 0.68, col: '#ffffff' }
    ];
    for (const band of bands) {
      const rBand = domeRadius * band.scale;
      ctx.fillStyle = band.col;
      const minY = Math.max(-2400, Math.floor((cy - rBand) / stepH) * stepH);
      const maxY = Math.min(gy + 1200, Math.ceil((cy + rBand) / stepH) * stepH);
      for (let sy = minY; sy <= maxY; sy += stepH) {
        const dy = sy - cy;
        if (Math.abs(dy) >= rBand) continue;
        const halfW = Math.round(Math.sqrt(rBand * rBand - dy * dy) / stepH) * stepH;
        ctx.fillRect(cx - halfW, sy, halfW * 2, stepH);
      }
    }

    // Full-Stage Pure White Screen Veil during peak deletion (`0.12 <= p <= 0.68`)
    if (p >= 0.10) {
      ctx.globalAlpha = Math.min(1, whiteAlpha * 0.98);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4000, -3000, ww + 8000, 6000);
    }

    // 2. "Everyone Looks Like They Get Deleted" — Dissolving Vaporized Fighter Silhouettes & Pixel Ash Disintegration!
    if (p < 0.54) {
      const deleteProg = Math.min(1, p / 0.50);
      const silhouetteAlpha = Math.max(0, 1 - deleteProg * deleteProg);
      const assets = PixelForge.initAssets();

      for (const f of fighters) {
        if (!f || f.isBenched) continue;
        const sprites = assets[f.heroId || 'warrior'];
        if (!sprites || !sprites.sheet || !sprites.sheet.complete) continue;
        const frameIdx = PixelForge.getFrameIndex(f, f.walkPhase || f.runeOrbit || 0);
        const groundPlantOffset = 4;
        const pushDir = f.x >= cx ? 1 : -1;
        const vaporShiftX = Math.round((pushDir * deleteProg * 28) / 4) * 4;

        ctx.save();
        ctx.translate(
          Math.round(f.x + vaporShiftX),
          Math.round(f.y + groundPlantOffset)
        );
        ctx.scale(f.facing, 1);
        ctx.globalAlpha = silhouetteAlpha * 0.92;
        PixelForge.drawSilhouetteFrame(ctx, sprites, frameIdx, 208, 208, '#090d16');
        ctx.restore();

        // Horizontal White-Hot Pixel Deletion Scanline Slices cutting through the fighter's silhouette
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.min(1, 0.55 + deleteProg * 0.45);
        const sliceCount = 12;
        for (let s = 0; s < sliceCount; s++) {
          const sy = Math.round((f.y - 185 + s * 15 + ((s * 7) % 5)) / 4) * 4;
          const sw = Math.round((130 + deleteProg * 90) / 4) * 4;
          const sh = Math.round((2 + deleteProg * 11) / 2) * 2;
          ctx.fillRect(Math.round(f.x - sw * 0.5), sy, sw, sh);
        }

        // Streaming Vaporized Pixel-Ash Blocks tearing away from the fighter's body into the white-out!
        ctx.fillStyle = '#1e293b';
        ctx.globalAlpha = silhouetteAlpha * 0.85;
        for (let a = 0; a < 22; a++) {
          const ax =
            Math.round(
              (f.x + pushDir * (14 + deleteProg * (48 + (a % 6) * 24)) + ((a % 5) - 2) * 12) / 4
            ) * 4;
          const ay = Math.round((f.y - 24 - (a / 22) * 155 - deleteProg * 36) / 4) * 4;
          const asz = a % 3 === 0 ? 8 : 4;
          ctx.fillRect(ax, ay, asz, asz);
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }

  drawCharacterGroundHalo(ctx, f) {
    if (f.isDead && (f.deathTimer || 0) > 0.6) return;
    const isStorm = f.primaryColor === '#818cf8' || f.heroId === 'ronin' || f.heroId === 'ronin_ex';
    const isCyber =
      f.heroId === 'android' ||
      f.heroId === 'android_ex' ||
      f.primaryColor === '#00f0ff' ||
      f.primaryColor === '#22d3ee';
    const isBlue = !isStorm && (f.primaryColor === '#38bdf8' || isCyber);
    const isEmerald = f.primaryColor === '#10b981' || f.primaryColor === '#34d399';
    const isRadiant = f.primaryColor === '#fde047';
    const isNebula = f.heroId === 'nyx_ex' || f.theme === 'nebula';
    const isAbyssal =
      !isNebula &&
      (f.primaryColor === '#c084fc' ||
        f.primaryColor === '#d946ef' ||
        f.heroId === 'reaper' ||
        f.heroId === 'reaper_ex');
    const isChrono = f.primaryColor === '#2dd4bf';
    const isForge = f.primaryColor === '#f59e0b';
    const isCrimson = f.primaryColor === '#f43f5e';
    const isGlacial = f.primaryColor === '#67e8f9';
    const pal = isBlue
      ? CYAN_FIRE_PAL
      : isEmerald
        ? EMERALD_FIRE_PAL
        : isRadiant
          ? RADIANT_FIRE_PAL
          : isNebula
            ? NEBULA_FIRE_PAL
            : isAbyssal
            ? ABYSSAL_FIRE_PAL
            : isChrono
              ? CHRONO_FIRE_PAL
              : isForge
                ? FORGE_FIRE_PAL
                : isStorm
                  ? STORM_FIRE_PAL
                  : isCrimson
                    ? CRIMSON_FIRE_PAL
                    : isGlacial
                      ? GLACIAL_FIRE_PAL
                      : SOLAR_FIRE_PAL;
    const glowTex = this.getGlowForColor(f.primaryColor);
    const isAction =
      f.state === 'SKILL' ||
      f.state === 'ULTIMATE' ||
      f.state === 'TRUE_ULTIMATE' ||
      f.state === 'AUTO_ATTACK';
    const gy = f.groundY || this.groundY;

    // Crisp HD-2D Horizontal Floor Rim Reflection (Zero dotted circles under characters!)
    ctx.save();
    if (glowTex) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = isAction ? 0.36 : 0.22;
      ctx.drawImage(glowTex, f.x - 64, gy - 14, 128, 28);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = isAction ? 0.85 : 0.55;
    ctx.fillStyle = pal[2];
    const barW = isAction ? 76 : 52;
    ctx.fillRect(Math.round(f.x - barW * 0.5), gy + 1, barW, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(f.x - barW * 0.22), gy + 1, Math.round(barW * 0.44), 2);
    ctx.restore();
  }

  drawCharacterPixelFlames(ctx, f) {
    if (f.isDead && (f.deathTimer || 0) > 0.9) return;
    const isStorm = f.primaryColor === '#818cf8' || f.heroId === 'ronin' || f.heroId === 'ronin_ex';
    const isCyber =
      f.heroId === 'android' ||
      f.heroId === 'android_ex' ||
      f.primaryColor === '#00f0ff' ||
      f.primaryColor === '#22d3ee';
    const isBlue = !isStorm && (f.primaryColor === '#38bdf8' || isCyber);
    const isEmerald = f.primaryColor === '#10b981' || f.primaryColor === '#34d399';
    const isRadiant = f.primaryColor === '#fde047';
    const isNebula = f.heroId === 'nyx_ex' || f.theme === 'nebula';
    const isAbyssal =
      !isNebula &&
      (f.primaryColor === '#c084fc' ||
        f.primaryColor === '#d946ef' ||
        f.heroId === 'reaper' ||
        f.heroId === 'reaper_ex');
    const isChrono = f.primaryColor === '#2dd4bf';
    const isForge = f.primaryColor === '#f59e0b';
    const isCrimson = f.primaryColor === '#f43f5e';
    const isGlacial = f.primaryColor === '#67e8f9';
    const pal = isBlue
      ? CYAN_FIRE_PAL
      : isEmerald
        ? EMERALD_FIRE_PAL
        : isRadiant
          ? RADIANT_FIRE_PAL
          : isNebula
            ? NEBULA_FIRE_PAL
            : isAbyssal
            ? ABYSSAL_FIRE_PAL
            : isChrono
              ? CHRONO_FIRE_PAL
              : isForge
                ? FORGE_FIRE_PAL
                : isStorm
                  ? STORM_FIRE_PAL
                  : isCrimson
                    ? CRIMSON_FIRE_PAL
                    : isGlacial
                      ? GLACIAL_FIRE_PAL
                      : SOLAR_FIRE_PAL;
    const glowTex = this.getGlowForColor(f.primaryColor);
    const t = this.time;

    ctx.save();

    // Helper so every character particle emits a true radial light halo + stepped pixel bloom + incandescent core
    const emitGlowingParticle = (px, py, w, h, mainCol, coreCol, glowRadius = 22, glowAlpha = 0.42, customGlow = null) => {
      const gTex = customGlow || glowTex;
      if (gTex) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = glowAlpha;
        ctx.drawImage(gTex, px - glowRadius, py - glowRadius, glowRadius * 2, glowRadius * 2);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.36;
      ctx.fillStyle = mainCol;
      ctx.fillRect(px - w * 0.5 - 2, py - h * 0.5 - 2, w + 4, h + 4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.96;
      ctx.fillStyle = mainCol;
      ctx.fillRect(px - w * 0.5, py - h * 0.5, w, h);
      if (coreCol) {
        ctx.fillStyle = coreCol;
        ctx.fillRect(px - 1, py - 1, Math.max(2, w - 4), Math.max(2, h - 4));
      }
    };

    // 1. Emit live glowing pixel-art fire / rune / wind / wraith / clockwork sparks along the weapon & aura
    const count = f.isDead ? 4 : f.state === 'IDLE' || f.state === 'WALK' ? 9 : 16;
    const fallDrop = f.isDead ? Math.min(48, (f.deathTimer || 0) * 55) : 0;
    for (let i = 0; i < count; i++) {
      const cycle = (t * (1.8 + (i % 3) * 0.4) + i * 0.62) % 1;
      const spreadX = isBlue
        ? f.facing * (16 + (i % 5) * 12) + Math.sin(t * 8 + i) * 8
        : isEmerald
          ? f.facing * (14 + (i % 5) * 11) + Math.cos(t * 9 + i) * 12
          : f.facing * (18 + (i % 4) * 12) + Math.cos(t * 7 + i) * 10;
      const baseY = (isBlue ? f.y - 64 - (i % 4) * 18 : f.y - 76 - (i % 4) * 15) + fallDrop;
      const px = Math.round((f.x + spreadX) / 3) * 3;
      const py = Math.round((baseY - cycle * 38) / 3) * 3;
      const sz = cycle < 0.45 ? 4 : 3;
      const fade = 1 - cycle * 0.65;
      const mainCol = cycle < 0.28 ? pal[3] : cycle < 0.62 ? pal[2] : pal[1];
      emitGlowingParticle(
        px,
        py,
        sz,
        sz,
        mainCol,
        cycle < 0.4 ? '#ffffff' : pal[3],
        20,
        0.38 * fade
      );
    }

    // Low-HP Desperation Overdrive (Berserk): Rising Crimson-Gold Body Lightning & Aura Flames (No Floor Circle!)
    if (f.isBerserk && !f.isDead) {
      for (let b = 0; b < 8; b++) {
        const bCycle = (t * 2.6 + b * 0.37) % 1;
        const bx = Math.round((f.x + ((b % 2 === 0 ? 1 : -1) * (14 + (b % 4) * 9)) + Math.sin(t * 14 + b) * 6) / 3) * 3;
        const by = Math.round((f.y - 16 - bCycle * 128) / 3) * 3;
        emitGlowingParticle(
          bx,
          by,
          4,
          12,
          b % 2 === 0 ? '#facc15' : '#f43f5e',
          '#ffffff',
          24,
          0.48 * (1 - bCycle * 0.5),
          this.glowGold
        );
      }
    }

    // 2. Character-Specific Signature Aura Particles (Every single orbiting mote/wisp/orb emits light!)
    if (!f.isDead) {
      if (isBlue) {
        // AETHELGARD: Runic Frost-Steel Greatsword Shimmer + Aegis Hexagonal Shield Barrier when deflecting
        if (f.isDeflecting) {
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + t * 8;
            const hx = Math.round((f.x + Math.cos(a) * 68) / 4) * 4;
            const hy = Math.round((f.y - 68 + Math.sin(a) * 68) / 4) * 4;
            emitGlowingParticle(
              hx,
              hy,
              6,
              6,
              i % 2 === 0 ? '#38bdf8' : '#0ea5e9',
              '#e0f2fe',
              24,
              0.44,
              this.glowCyan
            );
          }
        }
      } else if (isForge) {
        // TORGAR: Orbiting Molten-Gold & Runic-Jade Forge Sparks + Iron-Anvil Bulwark Ring when deflecting
        for (let r = 0; r < 4; r++) {
          const ra = t * 4.2 + (r * Math.PI) / 2;
          const rx = Math.round((f.x + f.facing * 24 + Math.cos(ra) * 38) / 3) * 3;
          const ry = Math.round((f.y - 82 + Math.sin(ra * 2) * 14) / 3) * 3;
          const isJade = r % 2 === 1;
          emitGlowingParticle(
            rx,
            ry,
            6,
            6,
            isJade ? '#10b981' : '#f59e0b',
            '#fef08a',
            26,
            0.48,
            isJade ? this.glowEmerald : this.glowGold
          );
        }
        if (f.isDeflecting) {
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + t * 7.5;
            const hx = Math.round((f.x + Math.cos(a) * 70) / 4) * 4;
            const hy = Math.round((f.y - 68 + Math.sin(a) * 70) / 4) * 4;
            emitGlowingParticle(
              hx,
              hy,
              6,
              6,
              i % 2 === 0 ? '#f59e0b' : '#10b981',
              '#fef08a',
              24,
              0.46,
              i % 2 === 0 ? this.glowGold : this.glowEmerald
            );
          }
        }
      } else if (isStorm) {
        // KAZE-MARU: Orbiting Raijin Thunder-Drum Sparks + Spinning Raijin Wheel Ring when deflecting
        for (let r = 0; r < 4; r++) {
          const ra = t * 5.0 + (r * Math.PI) / 2;
          const rx = Math.round((f.x + f.facing * 22 + Math.cos(ra) * 36) / 3) * 3;
          const ry = Math.round((f.y - 84 + Math.sin(ra * 2) * 14) / 3) * 3;
          const isCyan = r % 2 === 1;
          emitGlowingParticle(
            rx,
            ry,
            6,
            6,
            isCyan ? '#38bdf8' : '#818cf8',
            '#e0f2fe',
            26,
            0.48,
            isCyan ? this.glowCyan : this.glowIndigo
          );
        }
        if (f.isDeflecting) {
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + t * 9.0;
            const hx = Math.round((f.x + Math.cos(a) * 68) / 4) * 4;
            const hy = Math.round((f.y - 70 + Math.sin(a) * 68) / 4) * 4;
            emitGlowingParticle(
              hx,
              hy,
              6,
              6,
              i % 2 === 0 ? '#818cf8' : '#38bdf8',
              '#ffffff',
              24,
              0.46,
              i % 2 === 0 ? this.glowIndigo : this.glowCyan
            );
          }
        }
      } else if (isCrimson) {
        // FREYJA: Orbiting Crimson-Gold Dragonfire Feathers + Phalanx Greatshield Ring when deflecting
        for (let r = 0; r < 4; r++) {
          const ra = t * 4.5 + (r * Math.PI) / 2;
          const rx = Math.round((f.x + f.facing * 24 + Math.cos(ra) * 38) / 3) * 3;
          const ry = Math.round((f.y - 86 + Math.sin(ra * 2) * 14) / 3) * 3;
          const isGold = r % 2 === 1;
          emitGlowingParticle(
            rx,
            ry,
            6,
            6,
            isGold ? '#fbbf24' : '#f43f5e',
            '#fef08a',
            26,
            0.48,
            isGold ? this.glowGold : this.glowCrimson
          );
        }
        if (f.isDeflecting) {
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + t * 8.0;
            const hx = Math.round((f.x + Math.cos(a) * 70) / 4) * 4;
            const hy = Math.round((f.y - 70 + Math.sin(a) * 70) / 4) * 4;
            emitGlowingParticle(
              hx,
              hy,
              6,
              6,
              i % 2 === 0 ? '#f43f5e' : '#fbbf24',
              '#fef08a',
              24,
              0.46,
              i % 2 === 0 ? this.glowCrimson : this.glowGold
            );
          }
        }
      } else if (isEmerald) {
        // SYLVARA: Swirling Emerald Wind Ribbon & Starlight Feathers Orbiting Her Cloak
        for (let w = 0; w < 4; w++) {
          const wa = t * 4.8 + (w * Math.PI) / 2;
          const wyOff = ((t * 48 + w * 28) % 110) - 10;
          const wx = Math.round((f.x + Math.cos(wa) * (36 + w * 4)) / 3) * 3;
          const wy = Math.round((f.y - 18 - wyOff + Math.sin(wa) * 8) / 3) * 3;
          emitGlowingParticle(
            wx,
            wy,
            8,
            4,
            w % 2 === 0 ? '#10b981' : '#34d399',
            '#fef08a',
            26,
            0.46,
            this.glowEmerald
          );
        }
      } else if (isRadiant) {
        // SERAPHINA: Luminous Imperial-Gold Sanctuary Crown Motes
        for (let m = 0; m < 4; m++) {
          const ma = t * 2.6 + (m * Math.PI * 2) / 4;
          const mx = Math.round((f.x + Math.cos(ma) * 40) / 3) * 3;
          const my = Math.round((f.y - 115 + Math.sin(ma * 2) * 8) / 3) * 3;
          emitGlowingParticle(
            mx,
            my,
            6,
            6,
            '#fde047',
            '#ffffff',
            28,
            0.52,
            this.glowGold
          );
        }
      } else if (isAbyssal) {
        // MALAKOR: Creeping Floor Shadow Mist & Drifting Crimson-Violet Soul Wisps
        for (let s = 0; s < 3; s++) {
          const phase = (t * 0.9 + s * 0.33) % 1;
          const sx = Math.round((f.x - f.facing * (18 + s * 14) + Math.sin(t * 4 + s) * 10) / 4) * 4;
          const sy = Math.round((f.y - 24 - phase * 92) / 4) * 4;
          emitGlowingParticle(
            sx,
            sy,
            8,
            6,
            s % 2 === 0 ? '#a855f7' : '#e11d48',
            '#f43f5e',
            28,
            0.48,
            this.glowViolet
          );
          ctx.fillStyle = '#090514';
          ctx.fillRect(sx - 3, sy - 2, 2, 2);
          ctx.fillRect(sx + 1, sy - 2, 2, 2);
        }
      } else if (isChrono) {
        // ZEPHYROS: Ticking Golden-Teal Hourglass Sand Grains around his levitating Astrolabe
        for (let g = 0; g < 4; g++) {
          const ga = t * 5.2 + (g * Math.PI) / 2;
          const gx = Math.round((f.x + f.facing * 42 + Math.cos(ga) * 18) / 2) * 2;
          const gy = Math.round((f.y - 102 + Math.sin(ga) * 18) / 2) * 2;
          const isGold = g % 2 === 0;
          emitGlowingParticle(
            gx,
            gy,
            5,
            5,
            isGold ? '#facc15' : '#2dd4bf',
            '#ffffff',
            26,
            0.52,
            isGold ? this.glowGold : this.glowTeal
          );
        }
      } else if (isGlacial) {
        // GLACIA: Orbiting Borealis Diamond Snowflakes & Cryo-Prism Shimmer around her Star-Prism Catalyst
        for (let c = 0; c < 4; c++) {
          const ca = t * 4.4 + (c * Math.PI) / 2;
          const cx = Math.round((f.x + f.facing * 36 + Math.cos(ca) * 24) / 2) * 2;
          const cy = Math.round((f.y - 98 + Math.sin(ca * 2) * 16) / 2) * 2;
          const isLilac = c % 2 === 1;
          emitGlowingParticle(
            cx,
            cy,
            6,
            6,
            isLilac ? '#e879f9' : '#67e8f9',
            '#ffffff',
            26,
            0.52,
            this.glowGlacial
          );
        }
      } else if (isNebula) {
        // NYX EX: 3 Orbiting Cosmic Cyan & Magenta Holo-Star Sparks around her galaxy hoodie
        for (let orb = 0; orb < 3; orb++) {
          const oa = t * 3.8 + (orb * Math.PI * 2) / 3;
          const ox = Math.round((f.x + Math.cos(oa) * 44) / 2) * 2;
          const oy = Math.round((f.y - 84 + Math.sin(oa) * 16) / 2) * 2;
          const isCyan = orb % 2 === 0;
          emitGlowingParticle(
            ox,
            oy,
            6,
            6,
            isCyan ? '#22d3ee' : '#d946ef',
            '#ffffff',
            24,
            0.46,
            isCyan ? this.glowCyan : this.glowViolet
          );
        }
      } else {
        // IGNIS SOL: 3 Orbiting Miniature Solar Fire-Orbs Circling His Arcane Robes
        for (let orb = 0; orb < 3; orb++) {
          const oa = t * 3.4 + (orb * Math.PI * 2) / 3;
          const ox = Math.round((f.x + Math.cos(oa) * 48) / 3) * 3;
          const oy = Math.round((f.y - 74 + Math.sin(oa) * 16) / 3) * 3;
          emitGlowingParticle(
            ox,
            oy,
            8,
            8,
            '#f97316',
            '#fef08a',
            30,
            0.52,
            this.glowOrange
          );
        }
      }
    }

    ctx.restore();
  }

  drawVolumetricGodRays(ctx, ww, gy) {
    const activeStage = this.getActiveStageId();
    const t = this.time;
    const parX = (this.camParallaxX || 0) * 0.18;
    const viewCenterX = this.adventureMode ? this.camX : ww * 0.5;
    const moteAnchorOffset = this.adventureMode ? this.camX - 600 : 0;
    ctx.save();

    // 1. Soft Ambient Radial Sky-Glow per Active Stage
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22 + 0.05 * Math.sin(t * 1.4);
    const skyGlow =
      activeStage === 'sylvan'
        ? this.glowEmerald
        : activeStage === 'boneyard'
          ? this.glowViolet
          : activeStage === 'clocktower'
            ? this.glowTeal
            : activeStage === 'sanctuary' ||
                activeStage === 'shogunate' ||
                activeStage === 'glacial' ||
                activeStage === 'shogunate_glacial' ||
                activeStage === 'cob_monitor' ||
                activeStage === 'cob_monitor_glacial'
              ? this.glowCyan
              : activeStage === 'inferno' ||
                  activeStage === 'shogunate_inferno' ||
                  activeStage === 'cob_monitor_inferno'
                ? this.glowOrange
                : this.glowGold;
    if (skyGlow) {
      ctx.drawImage(skyGlow, viewCenterX - 390 + parX * 0.4, gy - 540, 780, 480);
    }
    if (
      (activeStage === 'inferno' ||
        activeStage === 'shogunate_inferno' ||
        activeStage === 'cob_monitor_inferno') &&
      this.glowCrimson
    ) {
      ctx.globalAlpha = 0.16 + 0.04 * Math.cos(t * 2.1);
      ctx.drawImage(this.glowCrimson, viewCenterX - 320 + parX * 0.3, gy - 480, 640, 420);
    } else if (
      (activeStage === 'glacial' ||
        activeStage === 'shogunate_glacial' ||
        activeStage === 'cob_monitor_glacial') &&
      this.glowViolet
    ) {
      ctx.globalAlpha = 0.12 + 0.03 * Math.cos(t * 1.7);
      ctx.drawImage(this.glowViolet, viewCenterX - 300 + parX * 0.3, gy - 510, 600, 420);
    } else if (activeStage === 'shogunate' && this.glowIndigo) {
      ctx.globalAlpha = 0.14 + 0.03 * Math.cos(t * 1.8);
      ctx.drawImage(this.glowIndigo, viewCenterX - 280 + parX * 0.3, gy - 510, 560, 420);
    } else if (activeStage === 'sanctuary' && this.glowGold) {
      ctx.globalAlpha = 0.16 + 0.04 * Math.cos(t * 1.9);
      ctx.drawImage(this.glowGold, viewCenterX - 280 + parX * 0.3, gy - 510, 560, 420);
    }

    // 2. 5 Diagonal Volumetric Parallax Light-Shafts (`0.06..0.12` alpha in `'lighter'` — zero fighter washout!)
    const shaftCount = 5;
    for (let s = 0; s < shaftCount; s++) {
      const idx = s - 2; // -2..+2
      const sway = Math.sin(t * (0.9 + s * 0.17) + s * 1.4) * 22;
      let topX;
      let botX;
      let topRgb;
      let midRgb;
      let baseAlpha = 0.085;

      if (activeStage === 'inferno' || activeStage === 'shogunate_inferno') {
        topX = viewCenterX + idx * 145 - 35 + parX;
        botX = viewCenterX + idx * 195 + 45 + sway + parX * 1.15;
        topRgb =
          activeStage === 'shogunate_inferno' && s % 2 === 1
            ? '244, 63, 94'
            : s % 2 === 0
              ? '251, 146, 60'
              : '250, 204, 21';
        midRgb = s % 3 === 0 ? '239, 68, 68' : '234, 88, 12';
        baseAlpha = 0.095;
      } else if (activeStage === 'glacial' || activeStage === 'shogunate_glacial') {
        topX = viewCenterX + 20 + idx * 132 + parX;
        botX = viewCenterX - 18 + idx * 178 + sway + parX * 1.15;
        topRgb = s % 2 === 0 ? '103, 232, 249' : '232, 121, 249';
        midRgb = s % 2 === 0 ? '56, 189, 248' : '192, 132, 252';
        baseAlpha = 0.078;
      } else if (activeStage === 'shogunate') {
        topX = viewCenterX + 45 + idx * 128 + parX;
        botX = viewCenterX - 25 + idx * 176 + sway + parX * 1.15;
        topRgb = s % 2 === 0 ? '125, 211, 252' : '253, 164, 175';
        midRgb = s % 2 === 0 ? '56, 189, 248' : '244, 63, 94';
        baseAlpha = 0.082;
      } else if (activeStage === 'sanctuary') {
        topX = viewCenterX - 95 + idx * 118 + parX;
        botX = viewCenterX + 35 + idx * 172 + sway + parX * 1.15;
        topRgb = s === 2 ? '254, 240, 138' : '125, 211, 252';
        midRgb = s % 2 === 0 ? '56, 189, 248' : '250, 204, 21';
        baseAlpha = 0.095;
      } else if (
        activeStage === 'cob_monitor' ||
        activeStage === 'cob_monitor_inferno' ||
        activeStage === 'cob_monitor_glacial'
      ) {
        topX = viewCenterX + idx * 124 + parX;
        botX = viewCenterX + idx * 178 + sway + parX * 1.15;
        if (activeStage === 'cob_monitor_inferno') {
          topRgb = s % 2 === 0 ? '251, 146, 60' : '244, 63, 94';
          midRgb = s % 2 === 0 ? '234, 88, 12' : '250, 204, 21';
        } else if (activeStage === 'cob_monitor_glacial') {
          topRgb = s % 2 === 0 ? '103, 232, 249' : '232, 121, 249';
          midRgb = s % 2 === 0 ? '56, 189, 248' : '192, 132, 252';
        } else {
          topRgb = s % 2 === 0 ? '34, 211, 238' : '217, 70, 239';
          midRgb = s % 2 === 0 ? '168, 85, 247' : '56, 189, 248';
        }
        baseAlpha = 0.072;
      } else if (activeStage === 'sylvan') {
        topX = viewCenterX - 40 + idx * 135 + parX;
        botX = viewCenterX + 30 + idx * 178 + sway + parX * 1.15;
        topRgb = s % 2 === 0 ? '52, 211, 153' : '253, 224, 71';
        midRgb = s % 2 === 0 ? '16, 185, 129' : '56, 189, 248';
        baseAlpha = 0.085;
      } else if (activeStage === 'boneyard') {
        topX = viewCenterX + idx * 125 + parX;
        botX = viewCenterX + idx * 185 + sway + parX * 1.15;
        topRgb = s % 2 === 0 ? '244, 63, 94' : '192, 132, 252';
        midRgb = s % 2 === 0 ? '159, 18, 57' : '126, 34, 206';
        baseAlpha = 0.075;
      } else if (activeStage === 'clocktower') {
        topX = viewCenterX + idx * 130 + parX;
        botX = viewCenterX + idx * 182 + sway + parX * 1.15;
        topRgb = s % 2 === 0 ? '45, 212, 191' : '250, 204, 21';
        midRgb = s % 2 === 0 ? '20, 184, 166' : '202, 138, 4';
        baseAlpha = 0.085;
      } else {
        // Cathedral: frost-cyan shafts on left, eclipse-solar shafts on center/right
        topX = viewCenterX + idx * 118 + parX;
        botX = viewCenterX + idx * 188 + sway + parX * 1.15;
        const isCool = idx < 0;
        topRgb = isCool ? '56, 189, 248' : idx === 0 ? '253, 224, 71' : '251, 146, 60';
        midRgb = isCool ? '14, 165, 233' : '234, 88, 12';
        baseAlpha = 0.088;
      }

      const topY = gy - 545;
      const botY = this.adventureMode ? 684 : gy + 16;
      const beamAlpha = baseAlpha + 0.025 * Math.sin(t * 2.1 + s * 1.3);
      if (!this._godRayGradCache) this._godRayGradCache = new Map();
      const gradKey = `${topY}:${botY}:${topRgb}:${midRgb}`;
      let grad = this._godRayGradCache.get(gradKey);
      if (!grad) {
        if (this._godRayGradCache.size >= 64) this._godRayGradCache.clear();
        grad = ctx.createLinearGradient(0, topY, 0, botY);
        grad.addColorStop(0, `rgba(${topRgb}, 0)`);
        grad.addColorStop(0.24, `rgba(${topRgb}, 1)`);
        grad.addColorStop(0.68, `rgba(${midRgb}, 0.52)`);
        grad.addColorStop(1, `rgba(${midRgb}, 0)`);
        this._godRayGradCache.set(gradKey, grad);
      }

      ctx.fillStyle = grad;
      const wTop = s === 2 ? 78 : 58;
      const wBot = s === 2 ? 132 : 98;
      // Soft outer volumetric envelope
      ctx.globalAlpha = beamAlpha * 0.58;
      ctx.beginPath();
      ctx.moveTo(topX - wTop * 0.5, topY);
      ctx.lineTo(topX + wTop * 0.5, topY);
      ctx.lineTo(botX + wBot * 0.5, botY);
      ctx.lineTo(botX - wBot * 0.5, botY);
      ctx.closePath();
      ctx.fill();

      // Soft inner core shaft
      ctx.globalAlpha = beamAlpha * 0.44;
      ctx.beginPath();
      ctx.moveTo(topX - wTop * 0.24, topY);
      ctx.lineTo(topX + wTop * 0.24, topY);
      ctx.lineTo(botX + wBot * 0.26, botY);
      ctx.lineTo(botX - wBot * 0.26, botY);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Stage-Specific Rising / Drifting Depth Motes for ALL Stages
    const moteColors =
      activeStage === 'inferno' ||
      activeStage === 'shogunate_inferno' ||
      activeStage === 'cob_monitor_inferno'
        ? ['#fb923c', '#fde047']
        : activeStage === 'glacial' ||
            activeStage === 'shogunate_glacial' ||
            activeStage === 'cob_monitor_glacial'
          ? ['#67e8f9', '#e879f9']
          : activeStage === 'cob_monitor'
            ? ['#22d3ee', '#d946ef']
            : activeStage === 'shogunate'
              ? ['#fda4af', '#fbcfe8']
              : activeStage === 'sanctuary'
                ? ['#7dd3fc', '#fef08a']
                : activeStage === 'sylvan'
                  ? ['#34d399', '#fde047']
                  : activeStage === 'boneyard'
                    ? ['#c084fc', '#f43f5e']
                    : activeStage === 'clocktower'
                      ? ['#2dd4bf', '#fde047']
                      : ['#38bdf8', '#fb923c'];
    const isInfernoFamily =
      activeStage === 'inferno' ||
      activeStage === 'shogunate_inferno' ||
      activeStage === 'cob_monitor_inferno';
    const isGlacialFamily =
      activeStage === 'glacial' ||
      activeStage === 'shogunate_glacial' ||
      activeStage === 'cob_monitor_glacial';
    const isShogunateRain = activeStage === 'shogunate' || activeStage === 'shogunate_glacial';
    const isFallingMotes =
      isShogunateRain || activeStage === 'glacial' || activeStage === 'cob_monitor_glacial';
    const spdMult = isInfernoFamily
      ? 1.85
      : isShogunateRain
        ? 1.18
        : isGlacialFamily
          ? 0.96
          : activeStage === 'sanctuary'
            ? 1.05
            : 1.25;
    const windBias = isInfernoFamily ? 28 : isShogunateRain ? 145 : isGlacialFamily ? 68 : 0;

    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      const riseSpan = 540;
      const u = ((m.y + t * m.spdY * spdMult) % riseSpan) / riseSpan;
      const my = isFallingMotes ? gy - 510 + u * 545 : gy + 20 - u * riseSpan;
      const moteParallax = (this.camParallaxX || 0) * (0.08 + (i % 3) * 0.04);
      const rawDriftX =
        m.x +
        Math.sin(t * (isInfernoFamily ? 2.8 : isFallingMotes ? 2.1 : 1.6) + m.phase) * 26 +
        u * windBias;
      const mx = this.adventureMode
        ? this.camX - 760 + ((((rawDriftX - (this.camX - 760)) % 1520) + 1520) % 1520)
        : rawDriftX + moteAnchorOffset + moteParallax;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.8 + m.phase);
      const alpha = isFallingMotes ? Math.sin(u * Math.PI) * 0.88 : 0.36 + 0.50 * pulse;
      if (alpha <= 0.02) continue;

      if (isShogunateRain) {
        const pCol =
          activeStage === 'shogunate_glacial'
            ? i % 3 === 0
              ? '#67e8f9'
              : m.isBlue
                ? '#bae6fd'
                : '#f5d0fe'
            : i % 3 === 0
              ? '#fb7185'
              : m.isBlue
                ? '#fda4af'
                : '#fbcfe8';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;
        this.drawSakuraPetalPixel(
          ctx,
          mx,
          my,
          Math.floor(t * 5.0 + m.phase + i) & 3,
          i % 5 === 0 ? 1.8 : 1,
          pCol,
          '#ffffff'
        );
        continue;
      }

      if (activeStage === 'glacial' || activeStage === 'cob_monitor_glacial') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;
        this.drawDiamondCrystalPixel(
          ctx,
          mx,
          my,
          (Math.floor(t * 4.2 + i) + i) & 1,
          i % 6 === 0 ? 1.7 : 1,
          m.isBlue ? '#67e8f9' : '#f5d0fe',
          '#ffffff',
          '#0c4a6e'
        );
        continue;
      }

      const col =
        isInfernoFamily && i % 5 === 0
          ? '#ef4444'
          : m.isBlue
            ? moteColors[0]
            : moteColors[1];
      const glowTex = this.getGlowForColor(col);
      const s = m.size;

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.42;
      ctx.drawImage(glowTex, mx - 16, my - 16, 32, 32);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.fillRect(mx, my, s, s);
      if (pulse > 0.76) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx + 1, my + 1, Math.max(1, s - 2), Math.max(1, s - 2));
      }
    }

    // Continuous Mid-World Cherry Blossom / Frost Sakura Rain (`24` extra petals drifting around fighters)
    if (isShogunateRain) {
      const sakuraPalette =
        activeStage === 'shogunate_glacial'
          ? ['#bae6fd', '#67e8f9', '#f5d0fe', '#ecfeff']
          : ['#fda4af', '#fb7185', '#fbcfe8', '#fff1f2'];
      ctx.globalCompositeOperation = 'source-over';
      for (let k = 0; k < 24; k++) {
        const cyc = (t * (0.23 + (k % 4) * 0.045) + k * 0.17) % 1;
        const rawX = -90 + ((k * 61) % (ww + 140)) + cyc * 185 + Math.sin(t * 2.5 + k) * 20;
        const kx = this.adventureMode
          ? this.camX - 760 + ((((rawX - (this.camX - 760)) % 1520) + 1520) % 1520)
          : rawX;
        const ky = gy - 505 + cyc * 540;
        const kAlpha = Math.sin(cyc * Math.PI) * 0.88;
        if (kAlpha <= 0.03) continue;
        ctx.globalAlpha = kAlpha;
        this.drawSakuraPetalPixel(
          ctx,
          kx,
          ky,
          (Math.floor(t * 4.6 + k * 1.3) + k) & 3,
          k % 7 === 0 ? 1.8 : 1,
          sakuraPalette[k % sakuraPalette.length],
          '#ffffff'
        );
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawStagePhenomenonWorld(ctx, ww, gy) {
    const activeStage = this.getActiveStageId();
    const t = this.time;
    const fade = Math.min(1, this.stageEventTimer / 1.5);
    ctx.save();

    // Helper for drawing a luminous HD-2D particle with a smooth tapered streak (zero stepped square tails!)
    const drawGlowingParticle = (px, py, size, coreCol, midCol, glowTex, glowR, alpha, tailDx = 0, tailDy = 0) => {
      if (glowTex && glowR > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.46;
        ctx.drawImage(glowTex, px - glowR, py - glowR, glowR * 2, glowR * 2);
      }
      if (tailDx !== 0 || tailDy !== 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.55;
        ctx.strokeStyle = midCol;
        ctx.lineWidth = Math.max(1.5, size * 0.55);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + tailDx * 3.2, py + tailDy * 3.2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = midCol;
      ctx.fillRect(px - size * 0.5, py - size * 0.5, size, size);
      ctx.fillStyle = coreCol;
      ctx.fillRect(px - size * 0.25, py - size * 0.25, Math.max(2, size * 0.5), Math.max(2, size * 0.5));
    };

    if (activeStage === 'inferno' || activeStage === 'shogunate_inferno') {
      // INFERNO / SHOGUNATE INFERNO PHENOMENON: PYROCLASTIC CINDER STORM & SOLAR FLARE
      const calderaX = ww * 0.495;
      const calderaY = gy - 355;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.44 + 0.10 * Math.sin(t * 5.2)) * fade;
      if (this.glowOrange) ctx.drawImage(this.glowOrange, calderaX - 440, calderaY - 260, 880, 520);
      ctx.globalAlpha = 0.30 * fade;
      if (this.glowCrimson) ctx.drawImage(this.glowCrimson, ww * 0.5 - 500, gy - 260, 1000, 300);
      ctx.globalAlpha = 0.28 * fade;
      if (this.glowGold) ctx.drawImage(this.glowGold, calderaX - 260, calderaY - 170, 520, 340);

      for (let p = 0; p < 72; p++) {
        const speed = 0.62 + (p % 5) * 0.11;
        const cycle = (t * speed + p * 0.19) % 1;
        const isUpdraft = p % 3 === 0;
        let px;
        let py;
        let tailDx;
        let tailDy;
        if (isUpdraft) {
          const baseX = 70 + ((p * 83) % (ww - 140));
          const spiral = Math.sin(cycle * Math.PI * 4 + t * 5 + p) * 24;
          px = baseX + cycle * 95 + spiral;
          py = gy + 12 - cycle * 520;
          tailDx = -4;
          tailDy = 7;
        } else {
          const startX = -40 + ((p * 97) % (ww + 40));
          px = startX + cycle * 240;
          py = gy - 540 + cycle * 555 + Math.sin(t * 4.2 + p) * 14;
          tailDx = -8;
          tailDy = -14;
        }
        const pAlpha = fade * Math.sin(cycle * Math.PI);
        const midCol =
          activeStage === 'shogunate_inferno' && p % 3 === 0
            ? '#f43f5e'
            : p % 4 === 0
              ? '#ef4444'
              : p % 2 === 0
                ? '#fb923c'
                : '#fde047';
        const glow = p % 4 === 0 ? this.glowCrimson : p % 2 === 0 ? this.glowOrange : this.glowGold;
        const sz = p % 3 === 0 ? 5 : 4;
        drawGlowingParticle(px, py, sz, '#ffffff', midCol, glow, 24, pAlpha, tailDx, tailDy);
      }
    } else if (activeStage === 'glacial' || activeStage === 'shogunate_glacial') {
      // GLACIAL / FROZEN SHOGUNATE PHENOMENON: BOREALIS DIAMOND-DUST BLIZZARD (`0` ctx.rotate!)
      const originX = ww * 0.54;
      const originY = gy - 385;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.20 * fade;
      if (this.glowCyan) ctx.drawImage(this.glowCyan, originX - 380, originY - 220, 760, 440);
      ctx.globalAlpha = 0.15 * fade;
      if (this.glowViolet) ctx.drawImage(this.glowViolet, ww * 0.5 - 420, gy - 320, 840, 340);

      for (let f = 0; f < 68; f++) {
        const cycle = (t * (0.31 + (f % 4) * 0.06) + f * 0.17) % 1;
        const baseX = -60 + ((f * 89) % (ww + 80));
        const breezeX = cycle * 235 + Math.sin(t * 2.6 + f * 1.4) * 26;
        const fx = Math.round(baseX + breezeX);
        const fy = Math.round(gy - 530 + cycle * 555);
        const fAlpha = fade * Math.sin(cycle * Math.PI);
        const pCol = f % 3 === 0 ? '#f5d0fe' : f % 2 === 0 ? '#67e8f9' : '#bae6fd';

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fAlpha * 0.94;
        if (activeStage === 'shogunate_glacial' && f % 2 === 0) {
          this.drawSakuraPetalPixel(
            ctx,
            fx,
            fy,
            (Math.floor(t * 5.2 + f) + f) & 3,
            f % 6 === 0 ? 2 : 1,
            pCol,
            '#ffffff'
          );
        } else {
          this.drawDiamondCrystalPixel(
            ctx,
            fx,
            fy,
            (Math.floor(t * 4.8 + f) + f) & 1,
            f % 5 === 0 ? 1.8 : 1,
            pCol,
            '#ffffff',
            '#0c4a6e'
          );
        }
      }
    } else if (activeStage === 'shogunate') {
      // SHOGUNATE PHENOMENON: MOONLIT SAKURA FUBUKI GALE & ASTRAL BLADE BREEZE
      const originX = ww * 0.56;
      const originY = gy - 385;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22 * fade;
      if (this.glowCyan) ctx.drawImage(this.glowCyan, originX - 380, originY - 220, 760, 440);
      ctx.globalAlpha = 0.18 * fade;
      if (this.glowCrimson) ctx.drawImage(this.glowCrimson, ww * 0.5 - 420, gy - 310, 840, 340);

      for (let f = 0; f < 72; f++) {
        const cycle = (t * (0.34 + (f % 4) * 0.07) + f * 0.17) % 1;
        const baseX = -60 + ((f * 89) % (ww + 80));
        const breezeX = cycle * 275 + Math.sin(t * 2.9 + f * 1.4) * 28;
        const fx = Math.round(baseX + breezeX);
        const fy = Math.round(gy - 530 + cycle * 555);
        const fAlpha = fade * Math.sin(cycle * Math.PI);
        const isMoon = f % 6 === 0;
        const glow = isMoon ? this.glowCyan : this.glowCrimson;

        if (glow && f % 3 === 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fAlpha * 0.18;
          ctx.drawImage(glow, fx - 14, fy - 14, 28, 28);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fAlpha * 0.95;
        const pCol = isMoon ? '#bae6fd' : f % 3 === 0 ? '#fbcfe8' : f % 2 === 0 ? '#fda4af' : '#fb7185';
        this.drawSakuraPetalPixel(
          ctx,
          fx,
          fy,
          (Math.floor(t * 5.6 + f) + f) & 3,
          f % 5 === 0 ? 2 : 1,
          pCol,
          '#ffffff'
        );
      }
    } else if (
      activeStage === 'cob_monitor' ||
      activeStage === 'cob_monitor_inferno' ||
      activeStage === 'cob_monitor_glacial'
    ) {
      // COB-OS FOURTH WALL TERMINAL PHENOMENON (Normal, Inferno & Glacial Variants, `0` ctx.rotate!)
      const isCobInf = activeStage === 'cob_monitor_inferno';
      const isCobGlac = activeStage === 'cob_monitor_glacial';
      const originX = ww * 0.50;
      const originY = gy - 320;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18 * fade;
      const gTop = isCobInf ? this.glowOrange : this.glowCyan;
      const gBot = isCobInf ? this.glowCrimson : this.glowViolet;
      if (gTop) ctx.drawImage(gTop, originX - 380, originY - 220, 760, 440);
      ctx.globalAlpha = 0.14 * fade;
      if (gBot) ctx.drawImage(gBot, ww * 0.5 - 440, gy - 300, 880, 320);

      for (let d = 0; d < 42; d++) {
        const cyc = (t * (0.28 + (d % 4) * 0.06) + d * 0.17) % 1;
        const baseX = 75 + ((d * 83) % Math.max(240, ww - 150));
        const dx = Math.round((baseX + Math.sin(t * 2.8 + d * 1.4) * 18) / 2) * 2;
        const dy = isCobGlac
          ? Math.round((gy - 490 + cyc * 505) / 2) * 2
          : Math.round((gy + 8 - cyc * 490) / 2) * 2;
        const dAlpha = fade * Math.sin(cyc * Math.PI);
        if (dAlpha <= 0.03) continue;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = dAlpha * 0.88;
        if (isCobGlac && d % 2 === 0) {
          this.drawDiamondCrystalPixel(
            ctx,
            dx,
            dy,
            (Math.floor(t * 5.0 + d) + d) & 1,
            d % 6 === 0 ? 1.8 : 1,
            d % 4 === 0 ? '#f5d0fe' : '#67e8f9',
            '#ffffff',
            '#0c4a6e'
          );
        } else if (isCobInf) {
          ctx.fillStyle = d % 3 === 0 ? '#fde047' : d % 2 === 0 ? '#fb923c' : '#ef4444';
          ctx.fillRect(dx - 3, dy - 3, 6, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(dx - 1, dy - 1, 2, 2);
        } else if (d % 3 === 0) {
          this.drawDiamondCrystalPixel(
            ctx,
            dx,
            dy,
            (Math.floor(t * 5.0 + d) + d) & 1,
            d % 6 === 0 ? 1.8 : 1,
            d % 6 === 0 ? '#fde047' : '#22d3ee',
            '#ffffff',
            '#3b1f6e'
          );
        } else {
          ctx.fillStyle = d % 2 === 0 ? '#22d3ee' : '#d946ef';
          ctx.fillRect(dx - 2, dy - 4, 4, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(dx - 1, dy - 2, 2, 4);
        }
      }
    } else if (activeStage === 'sanctuary') {
      // SANCTUARY PHENOMENON: RADIANT SERAPHIM FEATHER & HALO SHOWER
      const originX = ww * 0.50;
      const originY = gy - 390;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.38 * fade;
      if (this.glowCyan) ctx.drawImage(this.glowCyan, originX - 420, originY - 240, 840, 480);
      ctx.globalAlpha = 0.28 * fade;
      if (this.glowGold) ctx.drawImage(this.glowGold, originX - 300, originY - 190, 600, 380);

      // Descending Consecrated Golden-Sapphire Halo Ripples on the Marble Floor
      for (let h = 0; h < 3; h++) {
        const hProg = (t * 0.42 + h * 0.33) % 1;
        const hAlpha = fade * Math.sin(hProg * Math.PI) * 0.34;
        ctx.strokeStyle = h % 2 === 0 ? '#fde047' : '#7dd3fc';
        ctx.lineWidth = 2;
        ctx.globalAlpha = hAlpha;
        ctx.beginPath();
        ctx.ellipse(originX, gy + 24, 110 + hProg * 260, 12 + hProg * 28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let f = 0; f < 56; f++) {
        const cycle = (t * (0.30 + (f % 4) * 0.06) + f * 0.23) % 1;
        const baseX = 80 + ((f * 89) % (ww - 160));
        const sway = Math.sin(t * 2.6 + f * 1.5) * 28;
        const fx = Math.round(baseX + sway);
        const fy = Math.round(gy - 530 + cycle * 545);
        const fAlpha = fade * Math.sin(cycle * Math.PI);
        const isGold = f % 3 === 0;
        const glow = isGold ? this.glowGold : this.glowCyan;
        const tilt = Math.cos(t * 2.6 + f * 1.5) >= 0 ? 1 : -1;

        if (glow) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fAlpha * 0.38;
          ctx.drawImage(glow, fx - 18, fy - 18, 36, 36);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fAlpha * 0.94;
        ctx.fillStyle = isGold ? '#fef08a' : '#bae6fd';
        ctx.fillRect(fx - 3 * tilt, fy - 2, 7, 3);
        ctx.fillRect(fx - 1 * tilt, fy + 1, 5, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx - 2 * tilt, fy - 1, 4, 2);
      }
    } else if (activeStage === 'cathedral') {
      // CATHEDRAL PHENOMENON: SOLAR ECLIPSE EMBER RAIN
      const originX = ww * 0.504;
      const originY = gy - 380;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.42 * fade;
      ctx.drawImage(this.glowGold, originX - 320, originY - 240, 640, 480);
      ctx.globalAlpha = 0.28 * fade;
      ctx.drawImage(this.glowOrange, ww * 0.5 - 480, gy - 220, 960, 260);

      for (let p = 0; p < 64; p++) {
        const seed = p * 1.37;
        const cycle = (t * (0.38 + (p % 5) * 0.07) + seed) % 1;
        const lane = ((p * 73) % 980) + 110;
        const driftX = (cycle - 0.5) * ((lane - originX) * 0.35) + Math.sin(t * 3.2 + seed) * 16;
        const px = lane + driftX;
        const py = gy - 520 + cycle * 525;
        const pAlpha = fade * Math.sin(cycle * Math.PI);
        const isFrost = p % 4 === 0;
        const midCol = isFrost ? '#38bdf8' : p % 2 === 0 ? '#facc15' : '#fb923c';
        const glow = isFrost ? this.glowCyan : p % 2 === 0 ? this.glowGold : this.glowOrange;
        const sz = p % 3 === 0 ? 5 : 4;

        drawGlowingParticle(px, py, sz, '#ffffff', midCol, glow, 22, pAlpha, 0, -5);
      }
    } else if (activeStage === 'sylvan') {
      // SYLVAN PHENOMENON: ASTRAL STARFALL METEOR SHOWER & BIOLUMINESCENT FIREFLY SWARM
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34 * fade;
      ctx.drawImage(this.glowEmerald, ww * 0.5 - 460, gy - 420, 920, 440);

      for (let s = 0; s < 16; s++) {
        const speed = 0.55 + (s % 4) * 0.12;
        const prog = (t * speed + s * 0.19) % 1;
        const startX = 60 + ((s * 139) % 960);
        const startY = gy - 540 + (s % 3) * 45;
        const sx = startX + prog * 280;
        const sy = startY + prog * 460;
        const sAlpha = fade * Math.sin(prog * Math.PI);
        const isCyan = s % 2 === 0;
        const col = isCyan ? '#38bdf8' : '#34d399';
        const glow = isCyan ? this.glowCyan : this.glowEmerald;

        drawGlowingParticle(sx, sy, 5, '#ffffff', col, glow, 26, sAlpha, -12, -19);
      }

      for (let f = 0; f < 48; f++) {
        const life = (t * (0.28 + (f % 4) * 0.06) + f * 0.31) % 1;
        const fx =
          100 +
          ((f * 97 + t * 85) % (ww - 200)) +
          Math.sin(t * 3.6 + f * 1.7) * 28;
        const fy = gy - 16 - life * 360 + Math.cos(t * 2.8 + f) * 14;
        const fAlpha = fade * Math.sin(life * Math.PI) * (0.65 + 0.35 * Math.sin(t * 8 + f));
        const isGold = f % 4 === 0;
        const midCol = isGold ? '#fde047' : f % 2 === 0 ? '#34d399' : '#38bdf8';
        const glow = isGold ? this.glowGold : f % 2 === 0 ? this.glowEmerald : this.glowCyan;
        drawGlowingParticle(fx, fy, 4, '#ffffff', midCol, glow, 20, fAlpha, -3, 2);
      }
    } else if (activeStage === 'boneyard') {
      // BONEYARD PHENOMENON: ABYSSAL SOUL-EMBER ASCENSION
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.36 * fade;
      ctx.drawImage(this.glowViolet, ww * 0.5 - 480, gy - 320, 960, 360);

      for (let w = 0; w < 72; w++) {
        const cycle = (t * (0.38 + (w % 5) * 0.07) + w * 0.23) % 1;
        const baseX = 90 + ((w * 79) % (ww - 180));
        const swirlX = Math.sin(cycle * Math.PI * 3 + t * 3.8 + w) * (22 + (w % 3) * 10);
        const wx = baseX + swirlX;
        const wy = gy + 8 - cycle * 490;
        const wAlpha = fade * Math.sin(cycle * Math.PI);
        const isCrimson = w % 3 === 0;
        const midCol = isCrimson ? '#f43f5e' : w % 2 === 0 ? '#e879f9' : '#a855f7';
        const sz = w % 4 === 0 ? 5 : 4;

        drawGlowingParticle(wx, wy, sz, '#ffffff', midCol, this.glowViolet, 24, wAlpha, -swirlX * 0.08, 6);
      }
    } else if (activeStage === 'clocktower') {
      // CLOCKTOWER PHENOMENON: ANTI-GRAVITY TIME-SAND VORTEX
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.36 * fade;
      ctx.drawImage(this.glowTeal, ww * 0.5 - 460, gy - 420, 920, 440);

      for (let p = 0; p < 72; p++) {
        const cycle = (t * (0.40 + (p % 4) * 0.08) + p * 0.21) % 1;
        const streamX = 100 + ((p * 73) % (ww - 200));
        const helix = Math.sin(cycle * Math.PI * 3.5 + t * 4.5 + p) * 24;
        const px = streamX + helix;
        const py = gy + 6 - cycle * 505;
        const pAlpha = fade * Math.sin(cycle * Math.PI);
        const isGold = p % 2 === 0;
        const midCol = isGold ? '#fde047' : '#2dd4bf';
        const glow = isGold ? this.glowGold : this.glowTeal;
        const sz = p % 3 === 0 ? 5 : 4;

        drawGlowingParticle(px, py, sz, '#ffffff', midCol, glow, 22, pAlpha, 0, 6);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Near-Camera 1.22x Parallax Foreground Depth Layer (`14` sparse edge-biased particles — or `22` raining
   * cherry blossoms on `shogunate` / frost sakura on `shogunate_glacial` / diamond flakes on `glacial` — at modest alpha!).
   */
  drawStageForeground(ctx, ww, gy) {
    const activeStage = this.getActiveStageId();
    const t = this.time;
    const fgShiftX = -(this.camParallaxX || 0) * 0.22;
    const fgShiftY = -(this.camParallaxY || 0) * 0.10;
    const viewSpanW = this.adventureMode ? 1200 : ww;
    const viewLeftX = this.adventureMode ? this.camX - viewSpanW * 0.5 : 0;
    const isShogFg = activeStage === 'shogunate' || activeStage === 'shogunate_glacial';
    const isGlacFg = activeStage === 'glacial' || activeStage === 'cob_monitor_glacial';
    const count = isShogFg ? 22 : isGlacFg ? 18 : 14;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < count; i++) {
      const isLeftFlank = i % 2 === 0;
      const slot = Math.floor(i / 2);
      const speed =
        activeStage === 'inferno' || activeStage === 'shogunate_inferno'
          ? 0.34 + (i % 3) * 0.08
          : isShogFg || isGlacFg
            ? 0.20 + (i % 4) * 0.045
            : activeStage === 'sanctuary' || activeStage === 'sylvan'
              ? 0.16 + (i % 3) * 0.04
              : 0.22 + (i % 3) * 0.05;
      const cycle = (t * speed + i * 0.19) % 1;
      const flankSpan = viewSpanW * 0.28;
      const baseX =
        isShogFg || isGlacFg
          ? viewLeftX - 70 + ((i * 73) % Math.max(240, Math.round(viewSpanW + 80)))
          : isLeftFlank
            ? viewLeftX - 35 + ((slot * 67) % Math.round(flankSpan))
            : viewLeftX + viewSpanW - flankSpan + ((slot * 71) % Math.round(flankSpan)) + 35;
      const swayX =
        Math.sin(t * 2.2 + i * 1.3) * 22 +
        (isShogFg
          ? cycle * 165
          : isGlacFg
            ? cycle * 92
            : activeStage === 'inferno' || activeStage === 'shogunate_inferno'
              ? cycle * 38
              : 0);
      const px = Math.round((baseX + swayX + fgShiftX) / 2) * 2;

      const isFalling =
        activeStage === 'sanctuary' ||
        isShogFg ||
        isGlacFg ||
        (activeStage === 'sylvan' && i % 3 !== 0);
      const rawY =
        isShogFg || isGlacFg
          ? gy - 470 + cycle * 555
          : isFalling
            ? gy - 340 + cycle * 435
            : gy + 92 - cycle * 410;
      const py = Math.round((rawY + fgShiftY) / 2) * 2;
      const alpha = Math.sin(cycle * Math.PI) * (isShogFg ? 0.62 : isGlacFg ? 0.54 : 0.44);
      if (alpha <= 0.02) continue;

      if (activeStage === 'inferno' || activeStage === 'shogunate_inferno') {
        const isAshFlake = i % 3 === 1;
        if (!isAshFlake && this.glowOrange) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * 0.36;
          ctx.drawImage(this.glowOrange, px - 20, py - 20, 40, 40);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * 0.92;
        if (isAshFlake) {
          ctx.fillStyle = '#291510';
          ctx.fillRect(px - 4, py - 2, 8, 5);
          ctx.fillStyle = activeStage === 'shogunate_inferno' ? '#f43f5e' : '#ea580c';
          ctx.fillRect(px - 3, py + 1, 5, 2);
        } else {
          ctx.fillStyle = activeStage === 'shogunate_inferno' && i % 2 === 0 ? '#fb7185' : '#fb923c';
          ctx.fillRect(px - 3, py - 3, 6, 6);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(px - 1, py - 1, 3, 3);
        }
      } else if (isShogFg) {
        if (activeStage === 'shogunate' && this.glowCrimson && i % 4 === 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.14, alpha * 0.16);
          ctx.drawImage(this.glowCrimson, px - 16, py - 16, 32, 32);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * 0.92;
        const fgPetalCol =
          activeStage === 'shogunate_glacial'
            ? i % 3 === 0
              ? '#f5d0fe'
              : i % 2 === 0
                ? '#bae6fd'
                : '#67e8f9'
            : i % 3 === 0
              ? '#fbcfe8'
              : i % 2 === 0
                ? '#fda4af'
                : '#fb7185';
        this.drawSakuraPetalPixel(
          ctx,
          px,
          py,
          (Math.floor(t * 4.4 + i * 1.1) + i) & 3,
          2,
          fgPetalCol,
          '#ffffff'
        );
      } else if (isGlacFg) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * 0.90;
        this.drawDiamondCrystalPixel(
          ctx,
          px,
          py,
          (Math.floor(t * 4.0 + i) + i) & 1,
          2,
          i % 3 === 0 ? '#f5d0fe' : '#67e8f9',
          '#ffffff',
          '#0c4a6e'
        );
      } else if (activeStage === 'sylvan') {
        const gTex = i % 2 === 0 ? this.glowEmerald : this.glowCyan;
        if (gTex) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * 0.34;
          ctx.drawImage(gTex, px - 18, py - 18, 36, 36);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * 0.88;
        ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#6ee7b7' : '#7dd3fc';
        ctx.fillRect(px - 3, py - 2, 6, 4);
      } else if (activeStage === 'boneyard') {
        if (this.glowViolet) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * 0.34;
          ctx.drawImage(this.glowViolet, px - 18, py - 18, 36, 36);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * 0.88;
        ctx.fillStyle = i % 3 === 0 ? '#f43f5e' : '#c084fc';
        ctx.fillRect(px - 3, py - 2, 5, 5);
      } else if (activeStage === 'clocktower') {
        const gTex = i % 2 === 0 ? this.glowGold : this.glowTeal;
        if (gTex) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * 0.34;
          ctx.drawImage(gTex, px - 16, py - 16, 32, 32);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * 0.90;
        ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#5eead4';
        ctx.fillRect(px - 3, py - 1, 6, 2);
        ctx.fillRect(px - 1, py - 3, 2, 6);
      } else if (
        activeStage === 'cob_monitor' ||
        activeStage === 'cob_monitor_inferno' ||
        activeStage === 'cob_monitor_glacial'
      ) {
        if (activeStage === 'cob_monitor_inferno') {
          if (this.glowOrange) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(0.16, alpha * 0.28);
            ctx.drawImage(this.glowOrange, px - 18, py - 18, 36, 36);
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha * 0.90;
          ctx.fillStyle = i % 3 === 0 ? '#fde047' : i % 2 === 0 ? '#fb923c' : '#ef4444';
          ctx.fillRect(px - 3, py - 3, 6, 6);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(px - 1, py - 1, 2, 2);
        } else if (activeStage === 'cob_monitor_glacial') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha * 0.90;
          this.drawDiamondCrystalPixel(
            ctx,
            px,
            py,
            (Math.floor(t * 4.0 + i) + i) & 1,
            2,
            i % 3 === 0 ? '#f5d0fe' : '#67e8f9',
            '#ffffff',
            '#0c4a6e'
          );
        } else {
          const gTex = i % 2 === 0 ? this.glowCyan : this.glowViolet;
          if (gTex) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(0.16, alpha * 0.24);
            ctx.drawImage(gTex, px - 16, py - 16, 32, 32);
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha * 0.90;
          ctx.fillStyle = i % 3 === 0 ? '#fde047' : i % 2 === 0 ? '#22d3ee' : '#d946ef';
          ctx.fillRect(px - 3, py - 1, 6, 2);
          ctx.fillRect(px - 1, py - 3, 2, 6);
        }
      } else if (activeStage === 'sanctuary') {
        if (this.glowCyan) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * 0.32;
          ctx.drawImage(this.glowCyan, px - 18, py - 18, 36, 36);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * 0.90;
        ctx.fillStyle = i % 3 === 0 ? '#fef08a' : '#e0f2fe';
        ctx.fillRect(px - 4, py - 2, 8, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 2, py - 1, 4, 2);
      } else {
        // Cathedral: left frost-cyan & right solar-gold censer sparks
        const gTex = isLeftFlank ? this.glowCyan : this.glowOrange;
        if (gTex) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * 0.34;
          ctx.drawImage(gTex, px - 18, py - 18, 36, 36);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * 0.88;
        ctx.fillStyle = isLeftFlank ? '#7dd3fc' : '#fde047';
        ctx.fillRect(px - 2, py - 3, 4, 6);
        ctx.fillRect(px - 3, py - 1, 6, 2);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawClashWorld(ctx, gy) {
    const p = 1 - this.clashZoomTimer / (this.clashMaxTimer || 0.55);
    const alpha = Math.max(0, 1 - p);
    const cx = this.clashFocusX || this.worldWidth * 0.5;
    const cy = this.clashFocusY || gy - 105;
    const col1 = this.clashCol1 || '#38bdf8';
    const col2 = this.clashCol2 || '#fb923c';
    const glow1 = this.getGlowForColor(col1);
    const glow2 = this.getGlowForColor(col2);

    ctx.save();

    // 1. Dual-Elemental Volumetric Impact Bloom at the Clash Point & Floor Reflection
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.62;
    if (glow1) ctx.drawImage(glow1, cx - 210, cy - 180, 360, 360);
    if (glow2) ctx.drawImage(glow2, cx - 150, cy - 180, 360, 360);
    ctx.globalAlpha = alpha * 0.48;
    ctx.drawImage(this.glowGold, cx - 140, cy - 140, 280, 280);

    // 2. Crisp Pixel-Art 4-Point Diamond Starflare at the Clash Core (Zero boxy crescents or circles!)
    const flareSpan = Math.round((46 * (1 - p * 0.45)) / 3) * 3;
    const fcx = Math.round(cx / 3) * 3;
    const fcy = Math.round(cy / 3) * 3;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.95;
    ctx.fillStyle = '#fde047';
    ctx.fillRect(fcx - flareSpan, fcy - 2, flareSpan * 2, 4);
    ctx.fillRect(fcx - 2, fcy - flareSpan, 4, flareSpan * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fcx - Math.round(flareSpan * 0.65), fcy - 1, Math.round(flareSpan * 1.3), 2);
    ctx.fillRect(fcx - 1, fcy - Math.round(flareSpan * 0.65), 2, Math.round(flareSpan * 1.3));
    ctx.fillRect(fcx - 5, fcy - 5, 10, 10);

    // 3. 48 High-Velocity Radial Pixel Sparks & Tapered Comet Streaks Bursting from the Clash
    for (let i = 0; i < 48; i++) {
      const seed = i * 2.39996;
      const angle = seed + Math.sin(i * 1.7) * 0.25;
      const speed = 65 + (i % 6) * 38;
      const dist = 10 + p * speed;
      const gravityDrop = p * p * 26;
      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + Math.sin(angle) * dist * 0.85 + gravityDrop;
      const sCol = i % 3 === 0 ? '#fde047' : i % 2 === 0 ? col1 : col2;
      const sGlow = i % 2 === 0 ? glow1 : glow2;

      // 3-step pixel motion trail pointing back toward (cx, cy)
      for (let tStep = 3; tStep >= 1; tStep--) {
        const tailDist = Math.max(0, dist - tStep * 8);
        const tx = Math.round((cx + Math.cos(angle) * tailDist) / 3) * 3;
        const ty = Math.round((cy + Math.sin(angle) * tailDist * 0.85 + gravityDrop * 0.8) / 3) * 3;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * (1 - tStep * 0.25) * 0.88;
        ctx.fillStyle = sCol;
        ctx.fillRect(tx - 2, ty - 2, 4, 4);
      }

      const rx = Math.round(sx / 3) * 3;
      const ry = Math.round(sy / 3) * 3;
      if (i % 2 === 0 && sGlow) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.36;
        ctx.drawImage(sGlow, rx - 18, ry - 18, 36, 36);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = sCol;
      const sz = i % 3 === 0 ? 6 : 4;
      ctx.fillRect(rx - sz * 0.5, ry - sz * 0.5, sz, sz);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 1, ry - 1, 3, 3);
    }

    ctx.restore();
  }

  drawKOFinisherWorld(ctx, gy) {
    const p = 1 - this.koZoomTimer / (this.koMaxTimer || 1.35);
    const alpha = Math.max(0, 1 - p * 0.85);
    const kx = this.koFocusX || this.worldWidth * 0.5;
    const ky = this.koFocusY || gy - 95;
    const koCol = this.koColor || '#facc15';
    const koGlow = this.getGlowForColor(koCol);

    ctx.save();

    // 1. Volumetric Golden & Winner-Elemental Light Bloom at the K.O. Point
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.55;
    if (koGlow) ctx.drawImage(koGlow, kx - 220, ky - 200, 440, 400);
    ctx.globalAlpha = alpha * 0.45;
    ctx.drawImage(this.glowGold, kx - 170, ky - 170, 340, 340);

    // 2. 52 Ascending & Radial Finisher Pixel Embers with Comet Tails (Zero reused VFX sprites, zero blocky wedges!)
    for (let i = 0; i < 52; i++) {
      const seed = i * 1.732;
      const isRising = i % 2 === 0;
      let sx;
      let sy;
      if (isRising) {
        const riseProg = (p * (1.1 + (i % 4) * 0.25) + (i / 52) * 0.35) % 1;
        const spread = ((i % 9) - 4) * 18 + Math.sin(this.time * 7 + seed) * 14;
        sx = kx + spread;
        sy = gy - 8 - riseProg * 380;
      } else {
        const angle = seed;
        const speed = 75 + (i % 6) * 42;
        const dist = 12 + p * speed;
        sx = kx + Math.cos(angle) * dist;
        sy = ky + Math.sin(angle) * dist * 0.75 + p * p * 35;
      }

      const rx = Math.round(sx / 3) * 3;
      const ry = Math.round(sy / 3) * 3;
      const eCol = i % 3 === 0 ? '#fde047' : i % 2 === 0 ? koCol : '#ffffff';

      if (i % 3 === 0 && koGlow) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.35;
        ctx.drawImage(koGlow, rx - 18, ry - 18, 36, 36);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.92;
      ctx.fillStyle = eCol;
      const sz = i % 4 === 0 ? 6 : 4;
      ctx.fillRect(rx - sz * 0.5, ry - sz * 0.5, sz, sz);
      if (isRising) {
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillRect(rx - 1, ry + sz * 0.5, 3, 8);
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 1, ry - 1, 2, 2);
    }

    ctx.restore();
  }

  drawUltimateAwakeningWorld(ctx, gy) {
    const spotX = Math.round(this.ultFocusX ?? this.worldWidth * 0.5);
    const spotY = Math.round((this.ultFocusY ?? gy) - 100);
    const elemCol = this.cutInColor || '#facc15';
    const spotGlow = this.getGlowForColor(elemCol);
    const dim = Math.min(1, this.ultDim);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Soft Volumetric Backlight Halo Behind the Caster
    if (spotGlow) {
      ctx.globalAlpha = dim * 0.58;
      ctx.drawImage(spotGlow, spotX - 280, spotY - 280, 560, 560);
      ctx.globalAlpha = dim * 0.36;
      ctx.drawImage(this.glowGold, spotX - 190, spotY - 190, 380, 380);
    }

    // 2. Soft 2D Radial-Elliptical Skyward Light Plumes Rising from the Stone Floor (fades to 0 in all 4 directions — zero rectangular cutoff!)
    const colW = 148;
    const pillarGlow = spotGlow || this.glowGold || this.glowWhite;
    if (pillarGlow) {
      ctx.globalAlpha = dim * 0.32;
      ctx.drawImage(pillarGlow, spotX - colW * 1.35, gy - 640, colW * 2.7, 740);
      ctx.globalAlpha = dim * 0.22;
      ctx.drawImage(this.glowWhite || pillarGlow, spotX - colW * 0.65, gy - 580, colW * 1.3, 660);
    }

    // 3. High-Velocity Ascending Elemental Embers & Speed Filaments Flanking the Caster (Zero Floor Circles!)
    for (let i = 0; i < 14; i++) {
      const u = (this.time * (2.2 + (i % 4) * 0.35) + i * 0.29) % 1;
      const side = i % 2 === 0 ? -1 : 1;
      const lane = 24 + ((i * 19) % 115);
      const ex = Math.round(spotX + side * lane);
      const ey = Math.round(gy - u * 440);
      const eAlpha = Math.sin(u * Math.PI) * dim;
      const len = 18 + (i % 3) * 10;

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = eAlpha * 0.75;
      ctx.fillStyle = i % 3 === 0 ? '#fde047' : elemCol;
      ctx.fillRect(ex - 2, ey - len, 4, len);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex - 1, ey - len + 3, 2, len - 6);
    }

    ctx.restore();
  }

  drawHD2DPostProcess(ctx) {
    const w = this.width;
    const h = this.height;
    ctx.save();

    // Soft radial HD-2D optical vignette + top/bottom letterbox (cached offscreen in browser: 1 blit vs 3 full-screen gradients!)
    const canCacheVignette =
      typeof HTMLCanvasElement !== 'undefined' &&
      this.canvas instanceof HTMLCanvasElement &&
      typeof document !== 'undefined' &&
      w > 0 &&
      h > 0;
    if (canCacheVignette) {
      if (!this._vignetteCanvas || this._vigW !== w || this._vigH !== h) {
        this._vignetteCanvas = this._vignetteCanvas || document.createElement('canvas');
        this._vignetteCanvas.width = w;
        this._vignetteCanvas.height = h;
        this._vigW = w;
        this._vigH = h;
        const vCtx = this._vignetteCanvas.getContext('2d');
        if (vCtx) {
          vCtx.clearRect(0, 0, w, h);
          const rad = Math.hypot(w * 0.5, h * 0.5);
          const vig = vCtx.createRadialGradient(
            w * 0.5,
            h * 0.5,
            rad * 0.52,
            w * 0.5,
            h * 0.5,
            rad * 1.02
          );
          vig.addColorStop(0, 'rgba(2, 3, 7, 0)');
          vig.addColorStop(1, 'rgba(2, 3, 7, 0.62)');
          vCtx.fillStyle = vig;
          vCtx.fillRect(0, 0, w, h);

          const topG = vCtx.createLinearGradient(0, 0, 0, h * 0.18);
          topG.addColorStop(0, 'rgba(2, 3, 7, 0.72)');
          topG.addColorStop(1, 'rgba(2, 3, 7, 0)');
          vCtx.fillStyle = topG;
          vCtx.fillRect(0, 0, w, h * 0.18);

          const botG = vCtx.createLinearGradient(0, h * 0.80, 0, h);
          botG.addColorStop(0, 'rgba(2, 3, 7, 0)');
          botG.addColorStop(1, 'rgba(2, 3, 7, 0.80)');
          vCtx.fillStyle = botG;
          vCtx.fillRect(0, h * 0.80, w, h * 0.20);
        }
      }
      ctx.drawImage(this._vignetteCanvas, 0, 0, w, h);
    } else {
      if (!this._fallbackVigGrads || this._fbVigW !== w || this._fbVigH !== h) {
        const rad = Math.hypot(w * 0.5, h * 0.5);
        const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, rad * 0.52, w * 0.5, h * 0.5, rad * 1.02);
        vig.addColorStop(0, 'rgba(2, 3, 7, 0)');
        vig.addColorStop(1, 'rgba(2, 3, 7, 0.62)');

        const topG = ctx.createLinearGradient(0, 0, 0, h * 0.18);
        topG.addColorStop(0, 'rgba(2, 3, 7, 0.72)');
        topG.addColorStop(1, 'rgba(2, 3, 7, 0)');

        const botG = ctx.createLinearGradient(0, h * 0.80, 0, h);
        botG.addColorStop(0, 'rgba(2, 3, 7, 0)');
        botG.addColorStop(1, 'rgba(2, 3, 7, 0.80)');

        this._fallbackVigGrads = { vig, topG, botG };
        this._fbVigW = w;
        this._fbVigH = h;
      }
      ctx.fillStyle = this._fallbackVigGrads.vig;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = this._fallbackVigGrads.topG;
      ctx.fillRect(0, 0, w, h * 0.18);
      ctx.fillStyle = this._fallbackVigGrads.botG;
      ctx.fillRect(0, h * 0.80, w, h * 0.20);
    }

    const hudBottomY = this.getHudBottomY();
    const safeTopY = hudBottomY + (this.adventureMode && this.adventureHook?.active ? 46 : 14);

    // 1. High-Impact Stage Phenomenon & Blessing Announcement (Lowered cleanly below `.hud-top` / Adventure Strip!)
    if (this.stageEventBannerTimer > 0 && !(this.cutInTimer > 0)) {
      const maxT = 3.8;
      const p = Math.max(0, Math.min(1, 1 - this.stageEventBannerTimer / maxT));
      const alpha = p < 0.08 ? p / 0.08 : p > 0.84 ? (1 - p) / 0.16 : 1;
      const slamScale = 1 + Math.max(0, 1 - p / 0.12) * 0.28;
      const cx = Math.round(w * 0.5);
      const ry = this.isMobileLandscape ? 34 : this.isMobile ? 42 : 56;
      const cy = Math.max(
        Math.round(safeTopY + ry * 1.18),
        Math.round(h * (this.isMobileLandscape ? 0.34 : 0.25))
      );
      const rx = Math.min(Math.round(w * 0.48), 490);
      const maxWidth = Math.max(180, Math.round((w - 24) / slamScale));
      const evCol = this.stageEventColor || '#facc15';

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.translate(cx, cy);
      ctx.scale(slamScale, slamScale);

      // Soft radial feathered obsidian-elemental veil (fades smoothly to 0 on all edges, zero box!)
      ctx.save();
      ctx.scale(rx, ry);
      if (!ctx.__avsEventVeilGrad) {
        const veil = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1.0);
        veil.addColorStop(0, 'rgba(3, 6, 15, 0.90)');
        veil.addColorStop(0.62, 'rgba(5, 9, 22, 0.64)');
        veil.addColorStop(1, 'rgba(3, 6, 15, 0)');
        ctx.__avsEventVeilGrad = veil;
      }
      ctx.fillStyle = ctx.__avsEventVeilGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Anamorphic elemental light wash behind the Blessing headline
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.scale(rx * 0.82, ry * 0.48);
      const blessAura = ctx.createRadialGradient(0, 0.2, 0.05, 0, 0.2, 1.0);
      blessAura.addColorStop(0, evCol);
      blessAura.addColorStop(0.55, evCol);
      blessAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = alpha * 0.28;
      ctx.fillStyle = blessAura;
      ctx.beginPath();
      ctx.arc(0, 0.2, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Tapered 3px elemental horizon flare between Phenomenon Title and Blessing Callout
      const lineGrad = ctx.createLinearGradient(-rx * 0.85, 0, rx * 0.85, 0);
      lineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      lineGrad.addColorStop(0.2, evCol);
      lineGrad.addColorStop(0.5, '#ffffff');
      lineGrad.addColorStop(0.8, evCol);
      lineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(-rx * 0.85, -3, rx * 1.7, 3);

      // Center diamond star-glint on the divider
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(9, -1.5);
      ctx.lineTo(0, 6);
      ctx.lineTo(-9, -1.5);
      ctx.closePath();
      ctx.fill();

      // Top Line: Phenomenon Title
      const titleText = String(this.stageEventTitle || 'STAGE PHENOMENON');
      const baseTitlePx = this.isMobile ? 9 : 13;
      const titlePx = Math.max(
        7,
        Math.min(baseTitlePx, Math.floor(maxWidth / Math.max(1, titleText.length * 1.02)))
      );
      ctx.textAlign = 'center';
      ctx.font = `${titlePx}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(titleText, 2, -13, maxWidth);
      ctx.fillText(titleText, -2, -13, maxWidth);
      ctx.fillStyle = evCol;
      ctx.fillText(titleText, 0, -15, maxWidth);

      // Bottom Line: HUGE, Unmistakable Active Blessing Headline
      const blessText = String(this.stageEventSubtitle || '');
      const baseBlessPx = this.isMobile ? 11 : 18;
      const blessPx =
        blessText.length > 0
          ? Math.max(
              8,
              Math.min(baseBlessPx, Math.floor(maxWidth / Math.max(1, blessText.length * 1.02)))
            )
          : baseBlessPx;
      ctx.font = `${blessPx}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(blessText, 3, 25, maxWidth);
      ctx.fillText(blessText, -2, 24, maxWidth);
      ctx.fillText(blessText, 0, 26, maxWidth);
      ctx.fillStyle = evCol;
      ctx.fillText(blessText, 1, 23, maxWidth);
      ctx.fillStyle = '#fef08a';
      ctx.fillText(blessText, 0, 22, maxWidth);
      ctx.restore();
    }

    // 2. Portrait-Free, Caster-Side Anchored Overdrive / Supreme Callout (Below `.hud-top` / Strip!)
    if (this.cutInTimer > 0) {
      if (this.cutInIsEx) {
        this.drawExUltimateCutIn(ctx, w, safeTopY);
      } else {
        const p = 1 - this.cutInTimer / (this.cutInMaxTimer || 1.05);
        const alpha = p < 0.07 ? p / 0.07 : p > 0.80 ? (1 - p) / 0.20 : 1;
        const clampedAlpha = Math.max(0, Math.min(1, alpha));
        if (clampedAlpha > 0.01) {
          const isTrue = Boolean(this.cutInIsTrueUlt);
          const slamScale =
            p < 0.10
              ? 1 + Math.pow(1 - p / 0.10, 2) * (isTrue ? 0.54 : 0.40)
              : p < 0.18
                ? 1 - Math.sin(((p - 0.10) / 0.08) * Math.PI) * 0.05
                : 1;
          const shakeMag = p >= 0.02 && p < 0.16 ? (1 - p / 0.16) * 4 : 0;
          const shakeDx = shakeMag > 0.2 ? Math.round(Math.sin(p * 190) * shakeMag) : 0;
          const shakeDy = shakeMag > 0.2 ? Math.round(Math.cos(p * 230) * shakeMag * 0.7) : 0;
          const floatDy = p >= 0.18 && p <= 0.82 ? Math.round(Math.sin(p * 14) * 2) : 0;
          const elemCol = this.cutInColor || '#38bdf8';
          const accCol = isTrue ? '#fde047' : '#fbbf24';
          const { side, slideDir, halfW, halfH, cx, cy, slidePx } = this._getCutInLayout(
            w,
            safeTopY,
            p
          );

          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.globalAlpha = clampedAlpha;
          ctx.translate(cx + slidePx + shakeDx, cy + shakeDy + floatDy);
          ctx.scale(slamScale, slamScale);

          // Subtle soft shadow aura (100% borderless & preserves Suite 30.4 HUD clearance probe)
          ctx.save();
          ctx.scale(halfW, halfH);
          if (!ctx.__avsCutInVeilGrad) {
            const veil = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1.0);
            veil.addColorStop(0, 'rgba(2, 6, 23, 0.34)');
            veil.addColorStop(0.55, 'rgba(2, 6, 23, 0.14)');
            veil.addColorStop(1, 'rgba(2, 6, 23, 0)');
            ctx.__avsCutInVeilGrad = veil;
          }
          ctx.fillStyle = ctx.__avsCutInVeilGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          this._drawCutInCalloutContent(ctx, {
            p,
            alpha: clampedAlpha,
            isTrue,
            elemCol,
            accCol,
            halfW,
            halfH,
            side,
            slideDir,
            eyebrowFallback: isTrue ? 'SUPREME ULTIMATE FINISHER' : 'OVERDRIVE ART'
          });

          ctx.restore();
        }
      }
    }

    // 3. Borderless Decisive K.O. Finisher Emblem (Lowered cleanly below `.hud-top` / Adventure Strip!)
    if (this.koZoomTimer > 0) {
      const p = 1 - this.koZoomTimer / (this.koMaxTimer || 1.35);
      const alpha = p < 0.08 ? p / 0.08 : Math.max(0, 1 - (p - 0.08) / 0.92);
      const assets = PixelForge.initAssets();
      const winPort = PixelForge.ensureImage(assets[this.koWinnerHeroId || 'warrior']?.portrait);

      ctx.save();
      const kw = Math.min(w - 20, 680);
      const kh = this.isMobileLandscape ? 58 : this.isMobile ? 68 : 92;
      const kx = Math.round((w - kw) * 0.5);
      const ky = Math.max(
        Math.round(safeTopY + 8),
        Math.round(h * (this.isMobileLandscape ? 0.25 : 0.19))
      );
      const kcx = Math.round(w * 0.5);
      const kcy = ky + Math.round(kh * 0.5);
      const koCol = this.koColor || '#facc15';

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Feathered elliptical golden-obsidian light veil (fades smoothly to 0 on all sides—ZERO BOX BORDER!)
      ctx.save();
      ctx.translate(kcx, kcy);
      ctx.scale(kw * 0.55, kh * 0.65);
      if (!ctx.__avsKoVeilGrad) {
        const koVeil = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1.0);
        koVeil.addColorStop(0, 'rgba(4, 7, 15, 0.84)');
        koVeil.addColorStop(0.6, 'rgba(8, 12, 24, 0.48)');
        koVeil.addColorStop(1, 'rgba(4, 7, 15, 0)');
        ctx.__avsKoVeilGrad = koVeil;
      }
      ctx.fillStyle = ctx.__avsKoVeilGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Tapered golden horizontal light flare
      const koFlare = ctx.createLinearGradient(kx, kcy, kx + kw, kcy);
      koFlare.addColorStop(0, 'rgba(250, 204, 21, 0)');
      koFlare.addColorStop(0.25, koCol);
      koFlare.addColorStop(0.5, '#fef08a');
      koFlare.addColorStop(0.75, koCol);
      koFlare.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = koFlare;
      ctx.fillRect(kx + 24, kcy + 3, Math.max(40, kw - 48), 2);

      const hasWinPort = Boolean(winPort && winPort.complete && winPort.naturalWidth);
      const pSz = this.isMobilePortrait ? Math.min(46, kh - 18) : kh - 12;
      const pPadLeft = this.isMobile ? 12 : 28;
      const pCx = kx + pPadLeft + Math.round(pSz * 0.5);
      const pCy = kcy;
      const pR = Math.round(pSz * 0.48);
      if (hasWinPort) {
        ctx.save();
        const pGlow = ctx.createRadialGradient(pCx, pCy, pR * 0.4, pCx, pCy, pR * 1.28);
        pGlow.addColorStop(0, '#fde047');
        pGlow.addColorStop(0.65, koCol);
        pGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = pGlow;
        ctx.beginPath();
        ctx.arc(pCx, pCy, pR * 1.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pCx, pCy, pR, 0, Math.PI * 2);
        ctx.clip();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(winPort, pCx - pR, pCy - pR, pR * 2, pR * 2);
        ctx.restore();
      }

      const leftLimit = hasWinPort ? pCx + pR + 8 : kx + 8;
      const rightLimit = kx + kw - 8;
      const koMaxTextW = Math.max(140, rightLimit - leftLimit);
      const kTextX = hasWinPort ? Math.round((leftLimit + rightLimit) * 0.5) : kcx;
      const koTitleText = 'DECISIVE FINISH • K.O.!';
      const koSubText = `${(this.koWinnerName || 'CHAMPION').toUpperCase()} CLAIMS THE SANCTUARY!`;
      const koTitlePx = Math.max(
        9,
        Math.min(this.isMobile ? 12 : 19, Math.floor(koMaxTextW / (koTitleText.length * 1.02)))
      );
      const koSubPx = Math.max(
        7,
        Math.min(this.isMobile ? 8 : 11, Math.floor(koMaxTextW / Math.max(1, koSubText.length * 1.02)))
      );

      ctx.textAlign = 'center';
      ctx.font = `${koTitlePx}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(koTitleText, kTextX + 3, kcy - 7 + 3, koMaxTextW);
      ctx.fillText(koTitleText, kTextX - 2, kcy - 7 + 2, koMaxTextW);
      ctx.fillStyle = '#fde047';
      ctx.fillText(koTitleText, kTextX, kcy - 7, koMaxTextW);

      ctx.font = `${koSubPx}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(
        koSubText,
        kTextX + 2,
        kcy + (this.isMobile ? 16 : 22) + 2,
        koMaxTextW
      );
      ctx.fillStyle = '#ffffff';
      ctx.fillText(
        koSubText,
        kTextX,
        kcy + (this.isMobile ? 16 : 22),
        koMaxTextW
      );
      ctx.restore();
    }

    ctx.restore();
  }

  drawFloorLightPools(ctx, lights, gy) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const lGy = Number.isFinite(l.groundY) ? l.groundY : gy;
      const distY = Math.max(0, lGy - l.y);
      const atten = Math.max(0, 1 - distY / 360);
      if (atten <= 0.02) continue;
      const rx = l.radius * (1 + distY * 0.002);
      const ry = rx * 0.25;
      const tex =
        l.colorType === 'cyan'
          ? this.glowCyan
          : l.colorType === 'emerald'
            ? this.glowEmerald
            : l.colorType === 'violet'
              ? this.glowViolet
              : l.colorType === 'gold'
                ? this.glowGold
                : l.colorType === 'teal'
                  ? this.glowTeal
                  : l.colorType === 'indigo'
                    ? this.glowIndigo
                    : l.colorType === 'crimson'
                      ? this.glowCrimson
                      : this.glowOrange;
      ctx.globalAlpha = Math.min(0.38, 0.28 * atten * l.intensity);
      ctx.drawImage(tex, l.x - rx, lGy + 2 - ry, rx * 2, ry * 2);
    }
    ctx.restore();
  }

  drawDynamicShadows(ctx, fighters, lights, gy) {
    const assets = PixelForge.initAssets();
    for (const f of fighters) {
      if (f.isFullyBurrowed || f.isColossalBoss) continue;
      const fGy = Number.isFinite(f.groundY) ? f.groundY : gy;
      const jumpH = Math.max(0, fGy - f.y);
      const scale = Math.max(0.25, 1 - jumpH / 320);
      const deadStretch = f.isDead ? 1 + Math.min(0.45, (f.deathTimer || 0) * 0.38) : 1;

      // 1. Real-Time Ray-Projected Ground Silhouette Cast Shadows (up to 2 strongest nearby dynamic lights)
      const sprites = f.heroId ? assets[f.heroId] : null;
      const sheetImg = sprites?.sheet ? PixelForge.ensureImage(sprites.sheet) : null;
      if (
        sheetImg?.complete &&
        sheetImg.naturalWidth > 0 &&
        Array.isArray(lights) &&
        lights.length > 0 &&
        typeof ctx.transform === 'function'
      ) {
        let bestL1 = null;
        let bestS1 = 0;
        let bestL2 = null;
        let bestS2 = 0;
        for (let li = 0; li < lights.length; li++) {
          const L = lights[li];
          if (!L || L.intensity < 1.25 || (L.isSelfPassive && L.owner === f)) continue;
          const dx = f.x - L.x;
          const dy = f.y - 70 - L.y;
          if (Math.abs(dx) > 520 || Math.abs(dy) > 520) continue;
          const dist = Math.hypot(dx, dy);
          if (dist > 520) continue;
          const atten = 1 - dist / 520;
          const s = atten * L.intensity;
          if (s > bestS1) {
            bestS2 = bestS1;
            bestL2 = bestL1;
            bestS1 = s;
            bestL1 = L;
          } else if (s > bestS2) {
            bestS2 = s;
            bestL2 = L;
          }
        }
        if (bestL1) {
          const frameIdx = PixelForge.getFrameIndex(f, f.walkPhase || f.runeOrbit || 0);
          const castForLight = (L) => {
            const dist = Math.hypot(f.x - L.x, f.y - 70 - L.y);
            const atten = Math.max(0, 1 - dist / 520);
            const alpha =
              Math.max(0, Math.min(0.36, 0.14 + 0.16 * atten * (L.intensity - 1.0))) *
              scale *
              (f.isBenched ? 0.5 : 1);
            if (alpha <= 0.015) return;
            // Note: sprite local Y is negative (-198..-230 at head, 0 at boots), so shear c=(L.x-f.x)/260
            // projects the head shadow AWAY from light L while keeping the boots pinned at (f.x, fGy + 2).
            const shearX = Math.max(-0.85, Math.min(0.85, (L.x - f.x) / 260));
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = alpha;
            ctx.translate(Math.round(f.x), Math.round(fGy + 2));
            ctx.transform(1, 0, shearX, -0.30 * scale, 0, 0);
            ctx.scale(f.facing || 1, 1);
            PixelForge.drawSilhouetteFrame(ctx, sprites, frameIdx, 208, 208, '#03050c');
            ctx.restore();
          };
          castForLight(bestL1);
          if (bestL2) castForLight(bestL2);
        }
      }

      // 2. Crisp Grounded Contact Shadow Under Fighter Boots
      let shiftX = 0;
      for (const l of lights) {
        const dx = f.x - l.x;
        const dist = Math.hypot(dx, f.y - l.y) + 1;
        if (dist < 380) shiftX += (dx / dist) * (1 - dist / 380) * 18 * l.intensity;
      }
      shiftX = Math.max(-24, Math.min(24, shiftX));
      const rx = 68 * scale * deadStretch;
      const ry = 17 * scale;
      ctx.drawImage(this.shadowTex, f.x + shiftX - rx, fGy - ry + 4, rx * 2, ry * 2);
      if (jumpH < 8) {
        ctx.drawImage(
          this.shadowTex,
          f.x - 46 * deadStretch,
          fGy - 8,
          92 * deadStretch,
          18
        );
      }
    }
  }

  drawExGroundRimReflection(ctx, f, fGy, exPal, airRatio = 1) {
    const cx = Math.round(f.x);
    const cy = Math.round(fGy + 3);
    const pulse = 0.88 + 0.12 * Math.sin(this.time * 6.5 + (f.team || 1) * 1.7);
    const isAct = f.state === 'SKILL' || f.state === 'ULTIMATE' || f.state === 'TRUE_ULTIMATE';
    const halfW = Math.round((isAct ? 46 : 34) * pulse);
    const a = Math.max(0.04, Math.min(0.22, (isAct ? 0.2 : 0.13) * airRatio));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = a * 0.72;
    ctx.fillStyle = exPal.primary || '#38bdf8';
    ctx.fillRect(cx - halfW, cy, halfW * 2, 2);
    ctx.fillRect(cx - Math.round(halfW * 0.68), cy + 2, Math.round(halfW * 1.36), 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = exPal.accent || '#fde047';
    ctx.fillRect(cx - Math.round(halfW * 0.56), cy, Math.round(halfW * 1.12), 2);
    ctx.fillStyle = exPal.core || '#ffffff';
    ctx.fillRect(cx - Math.round(halfW * 0.26), cy, Math.round(halfW * 0.52), 2);
    ctx.restore();
  }

  _getCutInLayout(w, safeTopY, p) {
    const side =
      this.cutInSide === 'right'
        ? 'right'
        : !this.cutInSide && (this.cutInFacing || 1) < 0
          ? 'right'
          : 'left';
    const slideDir = side === 'right' ? 1 : -1;
    const ch = this.height || 720;
    const halfH = this.isMobileLandscape ? 48 : this.isMobile ? 56 : 80;
    const halfW = Math.min(
      Math.floor((w - 20) * 0.5),
      this.isMobileLandscape ? 276 : w <= 440 ? 178 : this.isMobile ? 216 : 410
    );
    const rawCx =
      side === 'right'
        ? Math.min(w - halfW - 14, Math.round(w * 0.665))
        : Math.max(halfW + 14, Math.round(w * 0.335));
    const cx = Math.max(halfW + 10, Math.min(w - halfW - 10, rawCx));
    // Lowered right into the visceral mid-arena combat sightline above the caster's shoulders!
    const cy = Math.max(
      Math.round(safeTopY + halfH + 22),
      Math.round(ch * (this.isMobileLandscape ? 0.46 : this.isMobile ? 0.43 : 0.46))
    );
    const slidePx = p < 0.14 ? Math.round(Math.pow(1 - p / 0.14, 2) * 86) * slideDir : 0;
    return { side, slideDir, halfW, halfH, cx, cy, slidePx };
  }

  _getCutInHeroTypography(baseHero, elemCol, accCol) {
    switch (baseHero) {
      case 'nyx':
        return {
          top: '#ffffff',
          mid: '#67e8f9',
          bot: '#f472b6',
          subMid: '#a5f3fc',
          subBot: '#22d3ee',
          bevel: '#7e22ce',
          rim: '#d946ef',
          tag: '#67e8f9'
        };
      case 'warrior':
        return {
          top: '#ffffff',
          mid: '#fef08a',
          bot: '#38bdf8',
          subMid: '#fde047',
          subBot: '#f59e0b',
          bevel: '#1d4ed8',
          rim: '#fbbf24',
          tag: '#fef08a'
        };
      case 'mage':
        return {
          top: '#ffffff',
          mid: '#fde047',
          bot: '#f97316',
          subMid: '#fef08a',
          subBot: '#fb923c',
          bevel: '#991b1b',
          rim: '#ef4444',
          tag: '#fde047'
        };
      case 'priestess':
        return {
          top: '#ffffff',
          mid: '#fef9c3',
          bot: '#facc15',
          subMid: '#ffffff',
          subBot: '#fde047',
          bevel: '#b45309',
          rim: '#f59e0b',
          tag: '#fef9c3'
        };
      case 'chronomancer':
        return {
          top: '#ffffff',
          mid: '#5eead4',
          bot: '#fbbf24',
          subMid: '#99f6e4',
          subBot: '#2dd4bf',
          bevel: '#0f766e',
          rim: '#eab308',
          tag: '#5eead4'
        };
      case 'valkyrie':
        return {
          top: '#ffffff',
          mid: '#fde047',
          bot: '#fb7185',
          subMid: '#fef08a',
          subBot: '#f59e0b',
          bevel: '#be123c',
          rim: '#f43f5e',
          tag: '#fde047'
        };
      case 'ronin':
        return {
          top: '#ffffff',
          mid: '#fbcfe8',
          bot: '#f43f5e',
          subMid: '#e2e8f0',
          subBot: '#38bdf8',
          bevel: '#9f1239',
          rim: '#ec4899',
          tag: '#fbcfe8'
        };
      case 'archer':
        return {
          top: '#ffffff',
          mid: '#bef264',
          bot: '#10b981',
          subMid: '#fef08a',
          subBot: '#34d399',
          bevel: '#065f46',
          rim: '#4ade80',
          tag: '#bef264'
        };
      case 'reaper':
        return {
          top: '#ffffff',
          mid: '#f0abfc',
          bot: '#e11d48',
          subMid: '#e879f9',
          subBot: '#a855f7',
          bevel: '#4c1d95',
          rim: '#db2777',
          tag: '#f0abfc'
        };
      case 'titan':
        return {
          top: '#ffffff',
          mid: '#fde047',
          bot: '#ea580c',
          subMid: '#fed7aa',
          subBot: '#f97316',
          bevel: '#7c2d12',
          rim: '#dc2626',
          tag: '#fde047'
        };
      case 'icemage':
        return {
          top: '#ffffff',
          mid: '#bae6fd',
          bot: '#818cf8',
          subMid: '#e0f2fe',
          subBot: '#38bdf8',
          bevel: '#1e3a8a',
          rim: '#60a5fa',
          tag: '#bae6fd'
        };
      default:
        return {
          top: '#ffffff',
          mid: '#67e8f9',
          bot: '#fb7185',
          subMid: '#a5f3fc',
          subBot: '#22d3ee',
          bevel: '#0369a1',
          rim: elemCol || '#f43f5e',
          tag: accCol || '#67e8f9'
        };
    }
  }

  _splitUltCalloutLines(rawText) {
    const clean = String(rawText || 'ULTIMATE ART').trim().toUpperCase();
    const colonIdx = clean.indexOf(':');
    if (colonIdx > 1 && colonIdx < clean.length - 2) {
      return [clean.slice(0, colonIdx + 1).trim(), clean.slice(colonIdx + 1).trim()];
    }
    if (clean.length <= 15) {
      return [null, clean];
    }
    const mid = clean.length >> 1;
    let bestIdx = -1;
    let bestDist = 999;
    for (let i = 3; i < clean.length - 3; i++) {
      if (clean[i] === ' ') {
        const d = Math.abs(i - mid);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
    }
    if (bestIdx !== -1) {
      return [clean.slice(0, bestIdx).trim(), clean.slice(bestIdx + 1).trim()];
    }
    return [null, clean];
  }

  _drawCutInHeroThemeFX(ctx, cfg) {
    const { baseHero, p, alpha, isTrue, elemCol, accCol, halfW, halfH, slideDir } = cfg;
    const popT = Math.min(1, p / 0.16);
    const popScale =
      popT < 1
        ? 0.35 + 0.82 * (1 - Math.pow(1 - popT, 3))
        : p < 0.24
          ? 1.17 - ((p - 0.16) / 0.08) * 0.17
          : 1.0;
    const sc = (v) => Math.round(v * popScale);

    const drawSteppedDiag = (x0, y0, dx, dy, steps, wPx, hPx, col) => {
      ctx.fillStyle = col;
      for (let i = 0; i < steps; i++) {
        ctx.fillRect(x0 + i * dx, y0 + i * dy, wPx, hPx);
      }
    };

    const drawStar4 = (gx, gy, arm, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(gx - arm, gy - 1, arm * 2 + 2, 3);
      ctx.fillRect(gx - 1, gy - arm, 3, arm * 2 + 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx - 2, gy - 2, 5, 5);
    };

    const drawPixelDisc = (cx, cy, r, col) => {
      ctx.fillStyle = col;
      for (let dy = -r; dy <= r; dy += 3) {
        const span = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
        ctx.fillRect(cx - span, cy + dy, span * 2, 3);
      }
    };

    ctx.globalAlpha = alpha * 0.96;

    if (baseHero === 'nyx') {
      // NYX: Colossal 88x52 Pixel-Art COB Cyber-Neko Monitor Mascot + 4 Wing-Bit Drones + `>_` Prompt & Hearts!
      const bob = Math.round(Math.sin(p * 15) * 4);
      const cobY = -halfH - 36 + bob;
      const cobW = sc(84);
      const cobH = sc(38);
      const halfCobW = cobW >> 1;

      // Tall sculpted cyan/magenta pixel cat ears on COB!
      for (let e = 0; e < 7; e++) {
        const ew = (7 - e) * 4;
        ctx.fillStyle = '#020617';
        ctx.fillRect(-halfCobW - 2 + e * 2, cobY - e * 4 - 2, ew + 4, 5);
        ctx.fillRect(halfCobW - ew - 2 - e * 2, cobY - e * 4 - 2, ew + 4, 5);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(-halfCobW + e * 2, cobY - e * 4, ew, 4);
        ctx.fillRect(halfCobW - ew - e * 2, cobY - e * 4, ew, 4);
        if (e >= 1 && e <= 4) {
          const pw = Math.max(4, ew - 8);
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(-halfCobW + 4 + e * 2, cobY - e * 4 + 2, pw, 3);
          ctx.fillRect(halfCobW - pw - 4 - e * 2, cobY - e * 4 + 2, pw, 3);
        }
      }
      // Cob Monitor Chassis + Neon Cyan Bezel + Dark Screen
      ctx.fillStyle = '#020617';
      ctx.fillRect(-halfCobW - 4, cobY - 2, cobW + 8, cobH + 6);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(-halfCobW - 2, cobY, cobW + 4, cobH + 2);
      ctx.fillStyle = '#090d1f';
      ctx.fillRect(-halfCobW + 3, cobY + 4, cobW - 6, cobH - 6);
      // Expressive Cyber-Neko Eyes + Blush + `w` Kitty Smile inside Cob's screen!
      const wink = Math.floor(p * 9) % 5 === 3;
      ctx.fillStyle = '#67e8f9';
      if (wink) {
        ctx.fillRect(-20, cobY + 15, 12, 3);
        ctx.fillRect(8, cobY + 12, 10, 10);
      } else {
        ctx.fillRect(-20, cobY + 11, 10, 11);
        ctx.fillRect(10, cobY + 11, 10, 11);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-18, cobY + 12, 4, 4);
        ctx.fillRect(12, cobY + 12, 4, 4);
      }
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(-26, cobY + 23, 8, 3);
      ctx.fillRect(18, cobY + 23, 8, 3);
      // Kitty `w` mouth
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-6, cobY + 25, 4, 3);
      ctx.fillRect(-2, cobY + 23, 4, 3);
      ctx.fillRect(2, cobY + 25, 4, 3);

      // 4 Hovering Wing-Bit Prisms flanking Cob
      for (const sx of [-1, 1]) {
        for (let b = 0; b < 2; b++) {
          const bx = sx * (halfCobW + sc(22 + b * 24));
          const by = cobY + 8 + b * 12 - bob * (b === 0 ? 1 : -1);
          ctx.fillStyle = '#020617';
          ctx.fillRect(bx - 9, by - 5, 18, 10);
          ctx.fillStyle = (sx < 0) === (b === 0) ? '#22d3ee' : '#f472b6';
          ctx.fillRect(bx - 7, by - 3, 14, 6);
          ctx.fillRect(bx - 3, by - 7, 6, 14);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx - 2, by - 1, 4, 3);
        }
      }

      // Giant blinking `>_` Holo-Prompt Chevron + Pixel Hearts & RGB Glitch Ribbons!
      const promptX = -sc(Math.round(halfW * 0.78));
      drawSteppedDiag(promptX, -18, 4, 4, 5, 6, 4, '#22d3ee');
      drawSteppedDiag(promptX, 14, 4, -4, 5, 6, 4, '#22d3ee');
      if (Math.floor(p * 14) % 2 === 0) {
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(promptX + 24, 12, 18, 5);
      }
      // Pixel `<3` hearts
      for (const [hx, hy, hc] of [
        [sc(Math.round(halfW * 0.72)), -22 + bob, '#f472b6'],
        [-sc(Math.round(halfW * 0.66)), halfH - 8 - bob, '#22d3ee']
      ]) {
        ctx.fillStyle = hc;
        ctx.fillRect(hx - 6, hy, 5, 4);
        ctx.fillRect(hx + 1, hy, 5, 4);
        ctx.fillRect(hx - 8, hy + 3, 16, 4);
        ctx.fillRect(hx - 5, hy + 7, 10, 3);
        ctx.fillRect(hx - 2, hy + 10, 4, 3);
      }
      for (let g = 0; g < 9; g++) {
        const gx = Math.round(Math.sin(p * 24 + g * 1.6) * halfW * 0.74);
        const gy = ((g * 19) % (halfH * 2)) - halfH + 6;
        const gw = 24 + (g % 3) * 18;
        ctx.fillStyle = g % 3 === 0 ? '#fde047' : g % 2 === 0 ? '#22d3ee' : '#f472b6';
        ctx.fillRect(gx - (gw >> 1), gy, gw, 3);
      }
    } else if (baseHero === 'warrior') {
      // AETHELGARD: Giant 320px Crossed Dawn-Breaker Greatswords + 6-Feather Ascending Seraph Wings + Sovereign Crown!
      const steps = 20;
      const sx0 = -steps * 8;
      const sy0 = -steps * 3 - 4;
      drawSteppedDiag(sx0, sy0, 8, 3, steps * 2, 14, 6, '#020617');
      drawSteppedDiag(sx0 + 2, sy0 + 1, 8, 3, steps * 2, 10, 4, '#38bdf8');
      drawSteppedDiag(sx0 + 4, sy0 + 2, 8, 3, steps * 2, 6, 2, '#ffffff');
      drawSteppedDiag(sx0, -sy0, 8, -3, steps * 2, 14, 6, '#020617');
      drawSteppedDiag(sx0 + 2, -sy0 - 1, 8, -3, steps * 2, 10, 4, '#fbbf24');
      drawSteppedDiag(sx0 + 4, -sy0 - 2, 8, -3, steps * 2, 6, 2, '#fef9c3');
      // Sculpted Winged Crossguards & Sapphire Pommels
      for (const gySign of [1, -1]) {
        const hy = gySign > 0 ? sy0 : -sy0;
        ctx.fillStyle = '#020617';
        ctx.fillRect(sx0 - 10, hy - 14, 20, 28);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(sx0 - 8, hy - 12, 16, 24);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx0 - 3, hy - 3, 6, 6);
      }
      // Large Sovereign Paladin Sun-Crown above eyebrow
      const crownY = -halfH - 22;
      ctx.fillStyle = '#020617';
      ctx.fillRect(-30, crownY - 12, 60, 22);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-28, crownY + 2, 56, 6);
      ctx.fillRect(-6, crownY - 10, 12, 16);
      ctx.fillRect(-22, crownY - 6, 10, 12);
      ctx.fillRect(12, crownY - 6, 10, 12);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-3, crownY - 2, 6, 6);
      // Ascending 5-Tier Golden Paladin Wings
      for (let wIdx = 0; wIdx < 5; wIdx++) {
        const fx = sc(Math.round(halfW * 0.48)) + wIdx * 10;
        const fy = -14 + wIdx * 11;
        const fCol = wIdx % 2 === 0 ? '#fbbf24' : '#fef08a';
        drawSteppedDiag(-fx, fy, -9, -4, 6 - (wIdx >> 1), 14, 5, fCol);
        drawSteppedDiag(fx, fy, 9, -4, 6 - (wIdx >> 1), 14, 5, fCol);
      }
      drawStar4(0, crownY - 10, 14, '#38bdf8');
    } else if (baseHero === 'mage') {
      // IGNIS SOL: Radiant Black-Sun Eclipse Corona + Overlapping Roaring Hellfire Bonfire!
      const sunY = -halfH - 22;
      const rOuter = sc(24);
      // 8 outward solar corona flare spikes (radiating OUTSIDE the dark eclipse core, zero crosshair!)
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-rOuter - 16, sunY - 2, 14, 4);
      ctx.fillRect(rOuter + 2, sunY - 2, 14, 4);
      ctx.fillRect(-2, sunY - rOuter - 14, 4, 12);
      ctx.fillRect(-2, sunY + rOuter + 2, 4, 12);
      drawSteppedDiag(-rOuter - 8, sunY - rOuter - 8, 3, 3, 4, 4, 4, '#f97316');
      drawSteppedDiag(rOuter + 4, sunY - rOuter - 8, -3, 3, 4, 4, 4, '#f97316');
      drawPixelDisc(0, sunY, rOuter, '#ef4444');
      drawPixelDisc(0, sunY, sc(19), '#fde047');
      drawPixelDisc(0, sunY, sc(14), '#090d1f');

      const flameSpec = [
        [-154, 24], [-132, 38], [-108, 28], [-82, 46], [-56, 32], [-28, 52],
        [0, 36], [28, 50], [56, 30], [82, 44], [108, 26], [132, 38], [154, 22]
      ];
      for (let idx = 0; idx < flameSpec.length; idx++) {
        const [offX, baseH] = flameSpec[idx];
        const fx = sc(offX) + Math.round(Math.sin(p * 20 + idx * 1.7) * 4);
        const fh = baseH + ((idx * 11 + Math.round(p * 38)) % 16);
        const baseY = halfH + 18;
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(fx - 13, baseY - Math.round(fh * 0.48), 26, Math.round(fh * 0.48));
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(fx - 9, baseY - Math.round(fh * 0.74), 18, Math.round(fh * 0.50));
        ctx.fillStyle = '#f97316';
        ctx.fillRect(fx - 6, baseY - fh + 2, 12, Math.round(fh * 0.46));
        ctx.fillStyle = '#fde047';
        ctx.fillRect(fx - 3, baseY - fh - 5, 6, Math.round(fh * 0.34));
        if (idx % 2 === 0) {
          const emberY = baseY - fh - 12 - ((Math.round(p * 54) + idx * 9) % 20);
          ctx.fillRect(fx - 2, emberY, 4, 4);
        }
      }
    } else if (baseHero === 'priestess') {
      // SERAPHINA: Towering Cathedral Cross-Staff Halo + Giant 6-Wing Unfurling Seraphim Wingspan!
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-4, -halfH - 30, 8, halfH * 2 + 52);
      ctx.fillRect(-sc(165), -halfH - 14, sc(330), 6);
      drawPixelDisc(0, -halfH - 14, sc(16), '#fef08a');
      drawStar4(0, -halfH - 14, 18, '#ffffff');
      for (let tier = 0; tier < 6; tier++) {
        const flap = Math.round(Math.sin(p * 13 + tier * 0.55) * 6);
        const ox = sc(Math.round(halfW * 0.44)) + tier * 8;
        const oy = -18 + tier * 11 + flap;
        const fCol = tier % 2 === 0 ? '#ffffff' : '#fde047';
        drawSteppedDiag(-ox, oy, -10, -4 + tier, 6, 14, 5, fCol);
        drawSteppedDiag(ox, oy, 10, -4 + tier, 6, 14, 5, fCol);
      }
    } else if (baseHero === 'chronomancer') {
      // CHRONOS: Giant 12-Point Astral Clockwork Seal + Sweeping Gold/Teal Clock Hands!
      const radX = sc(124);
      const radY = sc(64);
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2 + p * 0.8;
        const tx = Math.round(Math.cos(ang) * radX);
        const ty = Math.round(Math.sin(ang) * radY);
        ctx.fillStyle = '#020617';
        ctx.fillRect(tx - 6, ty - 6, 12, 12);
        ctx.fillStyle = k % 3 === 0 ? '#fde047' : '#2dd4bf';
        ctx.fillRect(tx - 4, ty - 4, 8, 8);
      }
      const handAng = p * 10.0;
      const hx = Math.round(Math.cos(handAng) * 6);
      const hy = Math.round(Math.sin(handAng) * 4);
      drawSteppedDiag(0, 0, hx, hy, 14, 6, 5, '#fde047');
      drawSteppedDiag(0, 0, -hy, hx, 10, 5, 5, '#2dd4bf');
      drawStar4(0, -halfH - 18, 16, '#fde047');
    } else if (baseHero === 'valkyrie') {
      // FREYJA: Colossal 380px Blazing Winged Gungnir Great-Spear + Jagged Ragnarok Lightning!
      const spearW = sc(Math.round(halfW * 1.92));
      ctx.fillStyle = '#020617';
      ctx.fillRect(-(spearW >> 1), -12, spearW, 11);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-(spearW >> 1) + 2, -10, spearW - 4, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-(spearW >> 1) + 22, -8, spearW - 44, 3);
      const tipX = slideDir < 0 ? (spearW >> 1) : -(spearW >> 1);
      for (let t = 0; t < 8; t++) {
        ctx.fillStyle = t % 2 === 0 ? '#fde047' : '#fb7185';
        ctx.fillRect(tipX - slideDir * t * 7, -10 - t * 3, 10, 7 + t * 6);
      }
      drawSteppedDiag(-sc(150), -halfH - 12, 12, 8, 16, 8, 4, '#fde047');
      drawSteppedDiag(sc(150), -halfH - 12, -12, 8, 16, 8, 4, '#f43f5e');
    } else if (baseHero === 'ronin') {
      // KAZE-MARU: Giant 68px Crimson Blood-Moon Sliced by Razor-White Iaijutsu Flash + 20 Sakura Blossoms!
      const moonY = -halfH - 14;
      drawPixelDisc(0, moonY, sc(28), '#e11d48');
      drawPixelDisc(6, moonY - 4, sc(20), '#fb7185');
      // Razor-white horizontal Iaijutsu moon-severance cut!
      ctx.fillStyle = '#020617';
      ctx.fillRect(-sc(92), moonY - 3, sc(184), 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-sc(96), moonY - 1, sc(192), 3);

      drawSteppedDiag(-sc(160), -halfH + 4, 18, 6, 18, 16, 4, '#e2e8f0');
      drawSteppedDiag(-sc(142), halfH - 4, 18, -7, 17, 14, 4, '#f43f5e');
      for (let pet = 0; pet < 20; pet++) {
        const px = Math.round(((pet * 83 + p * 290 * -slideDir) % (halfW * 2) + halfW * 2) % (halfW * 2) - halfW);
        const py = Math.round(((pet * 41 + p * 130) % (halfH * 2 + 24)) - halfH - 12);
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(px, py, 8, 5);
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(px + 2, py - 2, 5, 4);
      }
    } else if (baseHero === 'archer') {
      // SYLVARA: Sculpted Yggdrasil Greatbow Arc + 320px Streaking Golden Star-Arrow & Wind-Leaf Swirl!
      const bowX = slideDir < 0 ? -sc(Math.round(halfW * 0.68)) : sc(Math.round(halfW * 0.68));
      for (let b = -6; b <= 6; b++) {
        const bx = bowX - slideDir * (36 - Math.abs(b) * 5);
        ctx.fillStyle = Math.abs(b) <= 2 ? '#fde047' : '#10b981';
        ctx.fillRect(bx - 4, b * 9, 9, 8);
      }
      const arrowX = Math.round((p * 2.0 - 0.35) * halfW * 1.35) * -slideDir;
      ctx.fillStyle = '#34d399';
      ctx.fillRect(arrowX - 110, -8, 220, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(arrowX - 96, -6, 192, 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(arrowX + (slideDir < 0 ? 104 : -122), -14, 20, 18);
      for (let lf = 0; lf < 16; lf++) {
        const lx = Math.round(Math.sin(p * 9 + lf) * halfW * 0.80);
        const ly = ((lf * 27) % (halfH * 2)) - halfH;
        ctx.fillStyle = lf % 2 === 0 ? '#4ade80' : '#bef264';
        ctx.fillRect(lx, ly, 9, 4);
        ctx.fillRect(lx + 2, ly - 2, 5, 3);
      }
    } else if (baseHero === 'reaper') {
      // MALAKOR: Twin Colossal Curved Soul-Scythe Blades + 9 Roaring Abyssal Wraith-Fire Pillars!
      drawSteppedDiag(-sc(164), -halfH - 8, 16, 7, 18, 16, 5, '#a855f7');
      drawSteppedDiag(sc(164), -halfH - 8, -16, 7, 18, 16, 5, '#e11d48');
      drawPixelDisc(0, -halfH - 18, sc(18), '#4c1d95');
      drawStar4(0, -halfH - 18, 16, '#f0abfc');
      const wOffsets = [-152, -114, -76, -38, 0, 38, 76, 114, 152];
      for (let i = 0; i < wOffsets.length; i++) {
        const wx = sc(wOffsets[i]);
        const wh = 22 + ((i * 13 + Math.round(p * 36)) % 28);
        ctx.fillStyle = '#581c87';
        ctx.fillRect(wx - 7, halfH + 18 - Math.round(wh * 0.65), 14, Math.round(wh * 0.65));
        ctx.fillStyle = i % 2 === 0 ? '#d946ef' : '#f43f5e';
        ctx.fillRect(wx - 4, halfH + 16 - wh, 8, Math.round(wh * 0.58));
      }
    } else if (baseHero === 'titan') {
      // GUNNAR: Giant Mjolnir War-Hammer Crest Slamming Above + 8 Erupting Magma Crag Spires!
      const hamY = -halfH - 26;
      ctx.fillStyle = '#020617';
      ctx.fillRect(-34, hamY - 10, 68, 28);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-32, hamY - 8, 64, 24);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-26, hamY + 1, 52, 6);
      ctx.fillRect(-5, hamY - 22, 10, 16);
      const crags = [-156, -114, -72, -32, 32, 72, 114, 156];
      for (let i = 0; i < crags.length; i++) {
        const cxCrag = sc(crags[i]);
        const chCrag = 22 + (i % 3) * 10;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(cxCrag - 10, halfH + 18 - Math.round(chCrag * 0.6), 20, Math.round(chCrag * 0.6));
        ctx.fillRect(cxCrag - 6, halfH + 18 - chCrag, 12, chCrag);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(cxCrag - 3, halfH + 20 - chCrag, 6, chCrag - 4);
      }
    } else if (baseHero === 'icemage') {
      // LYRA: Giant 8-Point Crystalline Borealis Snowflake Crest + Hanging Diamond Icicle Spires!
      const snowY = -halfH - 20;
      drawStar4(0, snowY, sc(26), '#38bdf8');
      drawSteppedDiag(-18, snowY - 14, 6, 5, 7, 5, 4, '#e0f2fe');
      drawSteppedDiag(-18, snowY + 14, 6, -5, 7, 5, 4, '#e0f2fe');
      for (let ic = -4; ic <= 4; ic++) {
        const ix = ic * sc(38);
        const ih = 16 + (Math.abs(ic) % 3) * 10;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(ix - 4, halfH + 6, 8, Math.round(ih * 0.55));
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(ix - 2, halfH + 6, 4, ih);
      }
      for (let s = 0; s < 12; s++) {
        const sx = ((s * 71) % (halfW * 2)) - halfW;
        const sy = Math.round(((s * 43 + p * 110) % (halfH * 2)) - halfH);
        drawStar4(sx, sy, 6, '#bae6fd');
      }
    } else {
      // UNIT-07 (ANDROID): Large Diamond AI Visor Core + 4 Floating GUNG-09 Funnel Fin-Cannons & Lasers!
      const coreY = -halfH - 20;
      drawPixelDisc(0, coreY, sc(18), '#090d1f');
      drawStar4(0, coreY, sc(24), '#22d3ee');
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-7, coreY - 7, 14, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, coreY - 3, 6, 6);
      for (let f = 0; f < 4; f++) {
        const fx = sc(Math.round(halfW * 0.52)) + f * 14;
        const fy = -16 + f * 12;
        const fCol = f % 2 === 0 ? '#22d3ee' : '#f43f5e';
        drawSteppedDiag(-fx, fy, -10, -4, 6, 12, 4, fCol);
        drawSteppedDiag(fx, fy, 10, -4, 6, 12, 4, fCol);
      }
    }

    // Supreme Ultimate Sovereign Horizon Lightning Rails!
    if (isTrue) {
      const railW = sc(Math.round(halfW * 1.68));
      ctx.fillStyle = accCol;
      ctx.fillRect(-(railW >> 1), -halfH + 2, Math.round(railW * 0.28), 3);
      ctx.fillRect((railW >> 1) - Math.round(railW * 0.28), -halfH + 2, Math.round(railW * 0.28), 3);
      drawStar4(-sc(Math.round(halfW * 0.82)), -4, 14, accCol);
      drawStar4(sc(Math.round(halfW * 0.82)), -4, 14, elemCol);
    }
    ctx.globalAlpha = alpha;
  }

  _drawCutInCalloutContent(ctx, cfg) {
    const { p, alpha, isTrue, elemCol, accCol, halfW, halfH, slideDir, eyebrowFallback } = cfg;
    const baseHero = String(this.cutInHeroId || 'warrior').replace(/_ex$/, '');
    const typo = this._getCutInHeroTypography(baseHero, elemCol, accCol);

    const drawStar4 = (gx, gy, arm, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(gx - arm, gy - 1, arm * 2 + 2, 3);
      ctx.fillRect(gx - 1, gy - arm, 3, arm * 2 + 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx - 2, gy - 2, 5, 5);
    };

    // Thick 8-way pixel ink-stroke + 3D extrusion + Hero-Specific 3-Stop Elemental Gradient Face!
    const drawBorderlessHeroGradLine = (
      txt,
      ox,
      ty,
      fontPx,
      maxW,
      bevelCol,
      rimCol,
      topCol,
      midCol,
      botCol
    ) => {
      const stroke = Math.max(2, Math.round(fontPx * 0.09));
      const dDeep = Math.max(2, Math.round(fontPx * 0.14));
      const dMid = Math.max(1, Math.round(fontPx * 0.08));
      const rimOff = fontPx <= 16 ? 1 : 2;
      ctx.font = `bold ${fontPx}px "Press Start 2P", monospace`;

      // 8-way crisp pixel ink outline + proportional 3D block shadow (#020617)
      ctx.fillStyle = '#020617';
      ctx.fillText(txt, ox - stroke, ty, maxW);
      ctx.fillText(txt, ox + stroke, ty, maxW);
      ctx.fillText(txt, ox, ty - stroke, maxW);
      ctx.fillText(txt, ox, ty + stroke, maxW);
      ctx.fillText(txt, ox - stroke, ty - stroke, maxW);
      ctx.fillText(txt, ox + stroke, ty - stroke, maxW);
      ctx.fillText(txt, ox - stroke, ty + stroke, maxW);
      ctx.fillText(txt, ox + stroke, ty + stroke, maxW);
      ctx.fillText(txt, ox + dDeep, ty + dDeep, maxW);

      // Vivid Hero Elemental 3D Bevel + Rim + 3-Stop Metallic/Elemental Gradient Face!
      ctx.fillStyle = bevelCol;
      ctx.fillText(txt, ox + dMid, ty + dMid, maxW);
      ctx.fillStyle = rimCol;
      ctx.fillText(txt, ox + rimOff, ty + rimOff, maxW);

      if (typeof ctx.createLinearGradient === 'function') {
        const lg = ctx.createLinearGradient(0, ty - Math.round(fontPx * 0.62), 0, ty + Math.round(fontPx * 0.62));
        if (lg && typeof lg.addColorStop === 'function') {
          lg.addColorStop(0, topCol);
          lg.addColorStop(0.46, midCol);
          lg.addColorStop(1, botCol);
          ctx.fillStyle = lg;
        } else {
          ctx.fillStyle = midCol;
        }
      } else {
        ctx.fillStyle = midCol;
      }
      ctx.fillText(txt, ox, ty, maxW);
    };

    // 1. Seamless Feather-Edge Radial Elemental Mist (`lighter` <= 0.19 alpha, ZERO rectangular edges, ZERO `arc`!)
    if (typeof ctx.createRadialGradient === 'function') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * (isTrue ? 0.19 : 0.14);
      ctx.scale(1, 0.38);
      const rad = Math.max(56, Math.round(halfW * 0.94));
      const rg = ctx.createRadialGradient(0, 14, 4, 0, 14, rad);
      rg.addColorStop(0, typo.mid);
      rg.addColorStop(0.45, typo.rim);
      rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rg;
      ctx.fillRect(-rad, 14 - rad, rad * 2, rad * 2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;

    // 2. Beat 1 (`p < 0.22`): Explosive Cross-Slash Detonation Starburst!
    if (p < 0.22) {
      const flashT = 1 - p / 0.22;
      const beamH = Math.max(3, Math.round(flashT * 20));
      const beamW = Math.round(halfW * (2.2 + flashT * 0.4));
      ctx.globalAlpha = alpha * flashT * 0.92;
      ctx.fillStyle = typo.rim;
      ctx.fillRect(-(beamW >> 1), 6 - beamH, beamW, beamH * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-(beamW >> 1) + 24, 3, Math.max(24, beamW - 48), 6);
      ctx.fillRect(-4, -Math.round(halfH * (1.3 + flashT * 0.6)), 8, Math.round(halfH * (2.6 + flashT)));
      ctx.globalAlpha = alpha;
    }

    // 3. Colossal Sculpted Character-Themed Set-Piece & Live Animated VFX!
    this._drawCutInHeroThemeFX(ctx, {
      baseHero,
      p,
      alpha,
      isTrue,
      elemCol: typo.rim,
      accCol: typo.mid,
      halfW,
      halfH,
      slideDir
    });

    // 4. Outward-Flying Elemental Pixel Sparks
    const sparkCount = isTrue ? 16 : 10;
    for (let s = 0; s < sparkCount; s++) {
      const cyc = (p * 2.5 + s * 0.15) % 1;
      const dir = s % 2 === 0 ? -1 : 1;
      const sx = dir * Math.round(36 + cyc * (halfW * 0.98) + ((s * 31) % 36));
      const sy = ((s % 5) - 2) * Math.round(halfH * 0.36);
      ctx.globalAlpha = alpha * (1 - cyc * 0.82);
      ctx.fillStyle = s % 3 === 0 ? '#ffffff' : s % 2 === 0 ? typo.mid : typo.bot;
      ctx.fillRect(sx - 8, sy, 16, 3);
      ctx.fillRect(sx + dir * 9, sy - 1, 4, 4);
    }
    ctx.globalAlpha = alpha;

    // 5. 4-Beat Staggered Kinetic Whip-In (`p < 0.26`) & Katana Split-Slice Exit (`p > 0.82`)
    const l1InT = Math.min(1, p / 0.18);
    const l1Ease = 1 - Math.pow(1 - l1InT, 3);
    const l2InT = Math.max(0, Math.min(1, (p - 0.04) / 0.22));
    const l2Ease = 1 - Math.pow(1 - l2InT, 3);
    const outShear = p > 0.82 ? Math.round(Math.pow((p - 0.82) / 0.18, 2) * 110) : 0;

    if (p > 0.82 && p < 0.92) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-halfW, 6, halfW * 2, 3);
    }

    const ox1 = Math.round((1 - l1Ease) * -118 * slideDir) + outShear * slideDir;
    const ox2 = Math.round((1 - l2Ease) * 104 * slideDir) - outShear * slideDir;

    const eyebrow = String(
      this.cutInEyebrow || `${(this.cutInName || 'CHAMPION').toUpperCase()} • ${eyebrowFallback}`
    );
    const ultStr = String(this.cutInUltName || this.cutInText || 'ULTIMATE ART');
    const [line1, line2] = this._splitUltCalloutLines(ultStr);
    const cutMaxTextW = Math.max(204, halfW * 2 - 12);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Eyebrow Crest
    const eyeMaxPx = this.isMobileLandscape ? 10 : this.isMobile ? 10 : 13;
    const eyeFontPx = Math.max(
      7,
      Math.min(eyeMaxPx, Math.floor(cutMaxTextW / Math.max(1, eyebrow.length * 0.92)))
    );
    const eyeY = -Math.round(halfH * 0.66);
    drawBorderlessHeroGradLine(
      eyebrow,
      ox1,
      eyeY,
      eyeFontPx,
      cutMaxTextW,
      '#0f172a',
      typo.bevel,
      '#ffffff',
      typo.tag,
      typo.rim
    );

    const maxMainPx = this.isMobileLandscape
      ? isTrue ? 28 : 24
      : this.isMobile
        ? isTrue ? 23 : 20
        : isTrue ? 48 : 38;
    const minMainPx = this.isMobileLandscape ? 17 : this.isMobile ? 15 : isTrue ? 30 : 26;

    if (line1) {
      const maxSubPx = this.isMobileLandscape ? 17 : this.isMobile ? 14 : isTrue ? 26 : 22;
      const minSubPx = this.isMobileLandscape ? 11 : this.isMobile ? 10 : 17;
      const line1Px = Math.max(
        minSubPx,
        Math.min(maxSubPx, Math.floor(cutMaxTextW / Math.max(1, line1.length * 0.92)))
      );
      const line2Px = Math.max(
        minMainPx,
        Math.min(maxMainPx, Math.floor(cutMaxTextW / Math.max(1, line2.length * 0.92)))
      );
      const y1 = -Math.round(halfH * 0.16);
      const y2 = Math.round(halfH * 0.46);

      if (l2InT > 0 && l2InT < 1) {
        const ghostSpread = Math.round((1 - l2Ease) * 56);
        ctx.font = `bold ${line2Px}px "Press Start 2P", monospace`;
        ctx.globalAlpha = alpha * (1 - l2Ease) * 0.62;
        ctx.fillStyle = typo.mid;
        ctx.fillText(line2, ox2 - ghostSpread, y2 - 5, cutMaxTextW);
        ctx.fillStyle = typo.bot;
        ctx.fillText(line2, ox2 + ghostSpread, y2 + 5, cutMaxTextW);
        ctx.globalAlpha = alpha;
      }

      drawBorderlessHeroGradLine(
        line1,
        ox1,
        y1,
        line1Px,
        cutMaxTextW,
        typo.bevel,
        typo.rim,
        '#ffffff',
        typo.subMid,
        typo.subBot
      );
      drawBorderlessHeroGradLine(
        line2,
        ox2,
        y2,
        line2Px,
        cutMaxTextW,
        typo.bevel,
        typo.rim,
        typo.top,
        typo.mid,
        typo.bot
      );

      const sweepSpan = Math.min(cutMaxTextW, Math.max(64, line2.length * Math.round(line2Px * 0.85)));
      const glintX = ox2 + Math.round(((p * 2.6) % 1 - 0.5) * sweepSpan);
      const glintY = y2 - Math.round(line2Px * 0.46);
      drawStar4(glintX, glintY, 9, typo.mid);
    } else {
      const singleMaxPx = this.isMobileLandscape ? 30 : this.isMobile ? 25 : isTrue ? 52 : 42;
      const singlePx = Math.max(
        minMainPx,
        Math.min(singleMaxPx, Math.floor(cutMaxTextW / Math.max(1, line2.length * 0.92)))
      );
      const yMid = Math.round(halfH * 0.24);

      if (l2InT > 0 && l2InT < 1) {
        const ghostSpread = Math.round((1 - l2Ease) * 56);
        ctx.font = `bold ${singlePx}px "Press Start 2P", monospace`;
        ctx.globalAlpha = alpha * (1 - l2Ease) * 0.62;
        ctx.fillStyle = typo.mid;
        ctx.fillText(line2, ox2 - ghostSpread, yMid - 5, cutMaxTextW);
        ctx.fillStyle = typo.bot;
        ctx.fillText(line2, ox2 + ghostSpread, yMid + 5, cutMaxTextW);
        ctx.globalAlpha = alpha;
      }

      drawBorderlessHeroGradLine(
        line2,
        ox2,
        yMid,
        singlePx,
        cutMaxTextW,
        typo.bevel,
        typo.rim,
        typo.top,
        typo.mid,
        typo.bot
      );
      const sweepSpan = Math.min(cutMaxTextW, Math.max(64, line2.length * Math.round(singlePx * 0.85)));
      const glintX = ox2 + Math.round(((p * 2.6) % 1 - 0.5) * sweepSpan);
      const glintY = yMid - Math.round(singlePx * 0.46);
      drawStar4(glintX, glintY, 9, typo.mid);
    }
  }

  drawExUltimateCutIn(ctx, w, safeTopY) {
    const p = 1 - this.cutInTimer / (this.cutInMaxTimer || 1.05);
    const alpha = p < 0.05 ? p / 0.05 : p > 0.82 ? (1 - p) / 0.18 : 1;
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    if (clampedAlpha <= 0.01) return;

    const isTrue = Boolean(this.cutInIsTrueUlt);
    const slamScale =
      p < 0.10
        ? 1 + Math.pow(1 - p / 0.10, 2) * (isTrue ? 0.56 : 0.42)
        : p < 0.18
          ? 1 - Math.sin(((p - 0.10) / 0.08) * Math.PI) * 0.05
          : 1;
    const shakeMag = p >= 0.02 && p < 0.16 ? (1 - p / 0.16) * 4 : 0;
    const shakeDx = shakeMag > 0.2 ? Math.round(Math.sin(p * 190) * shakeMag) : 0;
    const shakeDy = shakeMag > 0.2 ? Math.round(Math.cos(p * 230) * shakeMag * 0.7) : 0;
    const floatDy = p >= 0.18 && p <= 0.82 ? Math.round(Math.sin(p * 14) * 2) : 0;
    const exPal = getExHeroPalette(this.cutInHeroId, this.cutInColor);
    const elemCol = exPal.primary || this.cutInColor || '#38bdf8';
    const accCol = isTrue ? '#fde047' : exPal.accent || '#fde047';
    const { side, slideDir, halfW, halfH, cx, cy, slidePx } = this._getCutInLayout(w, safeTopY, p);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = clampedAlpha;
    ctx.translate(cx + slidePx + shakeDx, cy + shakeDy + floatDy);
    ctx.scale(slamScale, slamScale);

    this._drawCutInCalloutContent(ctx, {
      p,
      alpha: clampedAlpha,
      isTrue,
      elemCol,
      accCol,
      halfW,
      halfH,
      side,
      slideDir,
      eyebrowFallback: isTrue ? 'EX SUPREME FINISHER' : 'NEO-VISION AWAKENING'
    });

    ctx.restore();
  }
}
