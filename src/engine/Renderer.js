import { PixelForge } from './PixelForge.js?v=30fps90';
import { AdventureMapRenderer } from '../adventure/AdventureMapRenderer.js?v=30fps90';

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

export const STAGE_ROSTER = [
  { id: 'cathedral', name: 'ECLIPSE CATHEDRAL NAVE', assetKey: 'arenaBg' },
  { id: 'sylvan', name: 'MOONLIT ASTRAL SANCTUARY', assetKey: 'arenaSylvan' },
  { id: 'boneyard', name: 'ABYSSAL NECROPOLIS CITADEL', assetKey: 'arenaBoneyard' },
  { id: 'clocktower', name: 'CELESTIAL CLOCKTOWER OBSERVATORY', assetKey: 'arenaClocktower' }
];

export const ULTIMATE_STAGE_MAP = {
  sanctuary: { id: 'sanctuary', name: 'CELESTIAL SANCTUARY OF JUSTICE', assetKey: 'arenaSanctuary' },
  inferno: { id: 'inferno', name: 'LAYWASTE OF INFERNO', assetKey: 'arenaInferno' }
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

    // Supreme Finisher Stage Transformation, Impact Frame & White-Out Deletion State
    this.trueUltStageOverride = null;
    this.trueUltStageAlpha = 0;
    this.trueUltStageTimer = 0;
    this.permanentStageOverride = null;
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

    this.stageId = 'cathedral';
    this.pickRandomStage();

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

  resetStageOverrides() {
    this.trueUltStageOverride = null;
    this.trueUltStageAlpha = 0;
    this.trueUltStageTimer = 0;
    this.permanentStageOverride = null;
    this.impactFrameTimer = 0;
    this.whiteoutTimer = 0;
  }

  setStageTransformation(stageKey, alpha = 1.0, permanent = false, holdDuration = 0) {
    if (permanent && ULTIMATE_STAGE_MAP[stageKey]) {
      this.permanentStageOverride = stageKey;
      this.trueUltStageOverride = stageKey;
      this.trueUltStageAlpha = 1.0;
      this.trueUltStageTimer = Math.max(this.trueUltStageTimer, holdDuration);
      return;
    }
    if (!stageKey) {
      this.trueUltStageOverride = null;
      this.trueUltStageAlpha = 0;
      this.trueUltStageTimer = 0;
      return;
    }
    this.trueUltStageOverride = stageKey;
    this.trueUltStageAlpha = Math.max(0, Math.min(1, alpha));
    if (holdDuration > 0) {
      this.trueUltStageTimer = Math.max(this.trueUltStageTimer, holdDuration);
    }
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
      return this.stageId;
    }
    const candidates = STAGE_ROSTER.filter((s) => s.id !== this.stageId);
    const pool = candidates.length > 0 ? candidates : STAGE_ROSTER;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.stageId = chosen.id;
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
    if (col === 'cyber' || col === '#00f0ff' || col === '#ff2e93' || col === '#7df9ff') {
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
      col === '#e879f9'
    ) {
      return this.glowViolet;
    }
    if (col === 'chrono' || col === '#2dd4bf' || col === '#99f6e4' || col === '#14b8a6') {
      return this.glowTeal;
    }
    return this.glowCyan;
  }

  getMobileLandscapeFixedZoom(colossalBoss = false) {
    const fullStageW = this.adventureMode ? 1420 : 1360;
    const fullStageH = this.adventureMode ? 710 : 690;
    const baseWide = Math.max(0.46, Math.min(this.width / fullStageW, this.height / fullStageH));
    return colossalBoss ? Math.min(baseWide, 0.52) : baseWide;
  }

  resize() {
    const isCssRotated =
      typeof document !== 'undefined' &&
      Boolean(document.documentElement?.classList?.contains('is-css-rotated-landscape'));
    this.width = isCssRotated ? window.innerHeight : window.innerWidth;
    this.height = isCssRotated ? window.innerWidth : window.innerHeight;
    this.isMobile = this.width < 768 || this.height < 540;
    this.isMobileLandscape = this.isMobile && this.width > this.height;
    if (this.isMobileLandscape) {
      this.zoom = this.getMobileLandscapeFixedZoom(false);
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
    this.cutInTimer = isTrueUlt ? 1.45 : 1.05;
    this.cutInMaxTimer = isTrueUlt ? 1.45 : 1.05;
    this.cutInHeroId = caster.heroId || 'warrior';
    this.cutInName = caster.name || 'CHAMPION';
    this.cutInUltName = isTrueUlt
      ? caster.trueUltName || 'CELESTIAL SWORD OF JUSTICE'
      : caster.ultName || 'ULTIMATE ART';
    this.cutInEyebrow = isTrueUlt
      ? `★ ${(caster.name || 'CHAMPION').toUpperCase()} • SUPREME ULTIMATE FINISHER ★`
      : `★ ${(caster.name || 'CHAMPION').toUpperCase()} • OVERDRIVE ART ★`;
    this.cutInColor = caster.primaryColor || '#38bdf8';
    this.cutInFacing = caster.facing || 1;
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

    const validFighters = Array.isArray(fighters)
      ? fighters.filter((f) => f && Number.isFinite(f.x) && Number.isFinite(f.y))
      : [];

    if (validFighters.length >= 1) {
      const activePool = validFighters.filter(
        (f) => !f.isBenched && (!f.isDead || (f.deathTimer || 0) < 2.8)
      );
      const pool = activePool.length > 0 ? activePool : validFighters;
      const player = this.adventureMode ? pool.find((f) => f.team === 1) || pool[0] : null;
      const framePool =
        this.adventureMode && player
          ? pool.filter((f) => f === player || f.isColossalBoss || Math.abs(f.x - player.x) <= 920)
          : pool;
      const colossalBoss = this.adventureMode
        ? framePool.find((f) => f.isColossalBoss && !f.isDead)
        : null;

      let minX = framePool[0].x;
      let maxX = framePool[0].x;
      let maxAirLift = 0;
      let maxSkyFocus = 0;
      for (const f of framePool) {
        if (f.x < minX) minX = f.x;
        if (f.x > maxX) maxX = f.x;
        const fGy = Number.isFinite(f.groundY) ? f.groundY : this.groundY;
        const lift = Math.max(0, fGy - f.y);
        if (lift > maxAirLift) maxAirLift = lift;
        const skyFocus = Math.max(0, f.cameraAirLift || 0);
        if (skyFocus > maxSkyFocus) maxSkyFocus = skyFocus;
      }
      if (colossalBoss) {
        const bossLeftEdge = (colossalBoss.anchorX || colossalBoss.x) - 195;
        if (bossLeftEdge < minX) minX = bossLeftEdge;
        const rightEdge = Math.max(player ? player.x + 110 : 4380, 4380);
        if (rightEdge > maxX) maxX = rightEdge;
      }
      const midX =
        this.adventureMode && player
          ? colossalBoss
            ? ((colossalBoss.anchorX || colossalBoss.x) - 185 + (player.x + 95)) * 0.5
            : framePool.length > 1
              ? player.x * 0.56 + ((minX + maxX) * 0.5) * 0.44
              : player.x + player.facing * 95
          : (minX + maxX) * 0.5;
      const rawHorizSpan =
        Math.abs(maxX - minX) + (colossalBoss ? 180 : validFighters.length > 2 ? 380 : 340);
      const horizSpan = this.adventureMode ? Math.min(1220, Math.max(820, rawHorizSpan)) : rawHorizSpan;
      const dist = Math.max(horizSpan, maxAirLift * 1.48 + 340);

      let targetZoom;
      if (this.isMobileLandscape) {
        // Mobile Landscape: ZERO camera zoom-in — constant wide full-stage viewport fit
        targetZoom = this.getMobileLandscapeFixedZoom(false);
      } else {
        const maxSpanW = this.adventureMode ? 1280 : this.worldWidth;
        const fitScaleX = this.width / Math.max(620, Math.min(maxSpanW, dist));
        const fitScaleY = this.height / (this.adventureMode ? 760 : 720);
        targetZoom = Math.min(fitScaleX, fitScaleY * 1.15);
        const minZoomCap = colossalBoss ? 0.44 : 0.52;
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
        if (!this.isMobileLandscape) {
          const skyZoom = Math.max(0.66, (this.height * 0.80) / Math.max(500, maxSkyFocus + 165));
          targetZoom = Math.min(targetZoom, skyZoom);
        }
        const skyTargetY = anchorGroundY - Math.min(242, 95 + maxSkyFocus * 0.22);
        targetY = Math.min(targetY, skyTargetY);
      }

      if (this.koZoomTimer > 0) {
        // Dramatic K.O. Finisher focus (skip zoom-in on mobile landscape)
        if (!this.isMobileLandscape) {
          targetZoom *= 1.12;
        }
        if (Number.isFinite(this.koFocusX)) {
          targetX = midX * 0.45 + this.koFocusX * 0.55;
        }
      } else if (this.clashZoomTimer > 0 && !this.isMobileLandscape) {
        targetZoom *= 1.045;
      } else if (this.ultZoomTimer > 0 && maxSkyFocus <= 0 && !this.isMobileLandscape) {
        // Gentle 2.5% cinematic breathe without jerking the camera away from the arena center
        targetZoom *= 1.025;
      }

      // Cinematic Winner Camera Framing during Victory Pose (`f.state === 'VICTORY'`)
      const victoryFighters = pool.filter(
        (f) => !f.isBenched && !f.isDead && f.state === 'VICTORY'
      );
      if (victoryFighters.length > 0 && (this.koZoomTimer || 0) <= 0.85) {
        const winMidX =
          victoryFighters.reduce((sum, f) => sum + f.x, 0) / victoryFighters.length;
        targetX = targetX * 0.20 + winMidX * 0.80;
        if (!this.isMobileLandscape) {
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
        // Clamp camera X so the viewport stays comfortably inside the 1680-wide cathedral diorama
        const bgLeft = (this.worldWidth - 1680) * 0.5 + 16;
        const bgRight = (this.worldWidth + 1680) * 0.5 - 16;
        if (bgRight - bgLeft > halfViewW * 2) {
          targetX = Math.max(bgLeft + halfViewW, Math.min(bgRight - halfViewW, targetX));
        } else {
          targetX = this.worldWidth * 0.5;
        }
      }

      const camSpeed = maxSkyFocus > 0 ? 7.5 : this.adventureMode ? 7.0 : 6;
      const lerpFactor = Math.min(1, Math.max(0, rawDt * camSpeed));
      if (this.isMobileLandscape) {
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

    const screenAnchorY =
      this.height *
      (this.isMobileLandscape
        ? this.adventureMode
          ? 0.63
          : 0.67
        : this.adventureMode && this.isMobile
          ? 0.58
          : this.isMobile
            ? 0.64
            : 0.68);
    ctx.translate(this.width * 0.5 + sx, screenAnchorY + sy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

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
    vfx.renderGroundDecals(ctx, gy);

    // 3. Real-Time Pixel-Art Stage-Aware Floor Reflections
    const activeStageForRefl = this.getActiveStageId();
    const reflAlpha =
      activeStageForRefl === 'inferno'
        ? 0.16
        : activeStageForRefl === 'sylvan' ||
            activeStageForRefl === 'sanctuary' ||
            activeStageForRefl === 'cathedral'
          ? 0.30
          : 0.24;
    if (this.adventureMode) {
      // Per-fighter local stone-road sheen anchored to each entity's own 2.5D depth `f.groundY`
      for (const f of fighters) {
        if (f.isBenched || f.isFullyBurrowed || f.isColossalBoss) continue;
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
    const sorted = [...fighters].sort((a, b) => {
      if (a.isBenched !== b.isBenched) return a.isBenched ? -1 : 1;
      const aGy = Number.isFinite(a.groundY) ? a.groundY : a.y;
      const bGy = Number.isFinite(b.groundY) ? b.groundY : b.y;
      return aGy - bGy || a.y - b.y;
    });
    for (const f of sorted) {
      if (f.isBenched && !f.isDead) {
        this.drawTagPedestalWorld(ctx, f);
      }
      if (f.isFullyBurrowed) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const deathFade = f.isDead ? Math.min(1, Math.max(0.08, 1 - (f.deathTimer || 0) * 0.65)) : 1;
      const isChrono = f.heroId === 'chronomancer';
      const baseAlpha = isChrono
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

      if (f.heroId !== 'reaper') {
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

    // 6. Character Pass: Crisp Champions drawn IN FRONT of normal skills & auto-attacks
    // so characters and their faces are NEVER buried under regular combat VFX or washed out by additive skill bloom!
    for (const f of sorted) {
      if (f.isBenched) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.scale(0.8, 0.8);
        ctx.translate(-f.x, -f.y);
        f.draw(ctx, false, this);
        ctx.restore();
      } else if (this.adventureMode && Number.isFinite(f.groundY)) {
        const depthT = Math.max(0, Math.min(1, (f.groundY - 442) / 238));
        const dScale = 0.93 + depthT * 0.12;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.scale(dScale, dScale);
        ctx.translate(-f.x, -f.y);
        f.draw(ctx, false, this);
        ctx.restore();
      } else {
        f.draw(ctx, false, this);
      }
    }

    // 7. Foreground Ultimate Attack Pass: Ultimate Attacks, Clashes & K.O. Finishers blaze IN FRONT of the characters!
    for (const f of sorted) {
      if (!f.isBenched && typeof f.drawUltimateForeground === 'function') {
        f.drawUltimateForeground(ctx, this);
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

    // 7.15. Near-Camera 1.22x Parallax Atmospheric Stage Foreground Depth Layer
    this.drawStageForeground(ctx, ww, gy);

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

    // 9. Adventure Mode Screen-Space Progress Strip, Flashing "GO! ➔" Arrow & Boss Warning Banner
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
          : '★P1'
        : f.slotRole === 'partner'
          ? 'P2B'
          : '★P2';
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

  drawHD2DArena(ctx, ww, gy) {
    if (this.adventureMode && ww > 1600) {
      AdventureMapRenderer.render(ctx, this, ww);
      return;
    }

    const assets = PixelForge.initAssets();

    const stageMeta = this.getCurrentStageMeta();
    const bg = (stageMeta && assets[stageMeta.assetKey]) || assets.arenaBg;
    const drawW = 1680;
    const drawH = 945;
    const drawX = Math.round((ww - drawW) * 0.5);
    const drawY = Math.round(gy - drawH * 0.82);

    const drawStageImageWithWings = (img, alpha = 1.0) => {
      if (!img || !img.complete || img.naturalWidth <= 0 || alpha <= 0.005) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Seamless upper-sky vertical mirror above `drawY` (`gy - 775`) for high-cosmos camera shots
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(-1, -1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();

      ctx.save();
      ctx.translate(drawX + drawW * 2, drawY);
      ctx.scale(-1, -1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();

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
    const overrideImg = overrideMeta ? assets[overrideMeta.assetKey] : null;
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
      if (seamStage === 'inferno') {
        ctx.fillStyle = 'rgba(15, 6, 4, 0.44)';
        ctx.fillRect(-800, ry, ww + 1600, 3);
        const lavaSeamAlpha = (0.12 + 0.08 * Math.sin(this.time * 5.2 + r * 1.3)).toFixed(3);
        ctx.fillStyle = `rgba(251, 146, 60, ${lavaSeamAlpha})`;
        ctx.fillRect(-800, ry + 1, ww + 1600, 2);
        // Segmented incandescent ember-lit basalt fault cracks
        const coreAlpha = (0.16 + 0.10 * Math.sin(this.time * 6.8 + r * 1.9)).toFixed(3);
        ctx.fillStyle = `rgba(254, 215, 170, ${coreAlpha})`;
        for (let seg = -3; seg <= 6; seg++) {
          const sx = Math.round((seg * 195 + r * 47) / 3) * 3;
          const sw = 48 + ((seg * 17 + r * 11) & 31);
          ctx.fillRect(sx, ry + 1, sw, 1);
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
      } else if (this.trueUltStageOverride === 'sanctuary') {
        this.drawSanctuaryStageEffects(ctx, drawX, drawY, drawW, drawH, gy, this.trueUltStageAlpha);
      }
    }
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
          // Right side: isolate only the bright solar/orange brazier flames (zero stone wall pixels)
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
    for (let i = -2; i <= 2; i++) {
      const topX = sanctuaryCx - 80 + i * 105;
      const botX = sanctuaryCx + 40 + i * 165 + Math.sin(t * 1.8 + i) * 18;
      const rayW = i === 0 ? 92 : 64;
      const rayGrad = ctx.createLinearGradient(topX, drawY + 30, botX, gy + 12);
      rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      rayGrad.addColorStop(0.22, i === 0 ? 'rgba(255, 255, 255, 0.28)' : 'rgba(125, 211, 252, 0.20)');
      rayGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.10)');
      rayGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
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
      cyber: { accent: '#00f0ff', alt: '#f43f5e', bg: '#02060c' }
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
    const isBlue = f.primaryColor === '#38bdf8';
    const isEmerald = f.primaryColor === '#10b981' || f.primaryColor === '#34d399';
    const isRadiant = f.primaryColor === '#fde047';
    const isAbyssal = f.primaryColor === '#c084fc';
    const isChrono = f.primaryColor === '#2dd4bf';
    const isForge = f.primaryColor === '#f59e0b';
    const isStorm = f.primaryColor === '#818cf8';
    const isCrimson = f.primaryColor === '#f43f5e';
    const isGlacial = f.primaryColor === '#67e8f9';
    const pal = isBlue
      ? CYAN_FIRE_PAL
      : isEmerald
        ? EMERALD_FIRE_PAL
        : isRadiant
          ? RADIANT_FIRE_PAL
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
    const isAction = f.state === 'SKILL' || f.state === 'ULTIMATE' || f.state === 'AUTO_ATTACK';
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
    const isBlue = f.primaryColor === '#38bdf8';
    const isEmerald = f.primaryColor === '#10b981' || f.primaryColor === '#34d399';
    const isRadiant = f.primaryColor === '#fde047';
    const isAbyssal = f.primaryColor === '#c084fc';
    const isChrono = f.primaryColor === '#2dd4bf';
    const isForge = f.primaryColor === '#f59e0b';
    const isStorm = f.primaryColor === '#818cf8';
    const isCrimson = f.primaryColor === '#f43f5e';
    const isGlacial = f.primaryColor === '#67e8f9';
    const pal = isBlue
      ? CYAN_FIRE_PAL
      : isEmerald
        ? EMERALD_FIRE_PAL
        : isRadiant
          ? RADIANT_FIRE_PAL
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
            : activeStage === 'sanctuary'
              ? this.glowCyan
              : activeStage === 'inferno'
                ? this.glowOrange
                : this.glowGold;
    if (skyGlow) {
      ctx.drawImage(skyGlow, viewCenterX - 390 + parX * 0.4, gy - 540, 780, 480);
    }
    if (activeStage === 'inferno' && this.glowCrimson) {
      ctx.globalAlpha = 0.16 + 0.04 * Math.cos(t * 2.1);
      ctx.drawImage(this.glowCrimson, viewCenterX - 320 + parX * 0.3, gy - 480, 640, 420);
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

      if (activeStage === 'inferno') {
        topX = viewCenterX + idx * 145 - 35 + parX;
        botX = viewCenterX + idx * 195 + 45 + sway + parX * 1.15;
        topRgb = s % 2 === 0 ? '251, 146, 60' : '250, 204, 21';
        midRgb = s % 3 === 0 ? '239, 68, 68' : '234, 88, 12';
        baseAlpha = 0.095;
      } else if (activeStage === 'sanctuary') {
        topX = viewCenterX - 95 + idx * 118 + parX;
        botX = viewCenterX + 35 + idx * 172 + sway + parX * 1.15;
        topRgb = s === 2 ? '254, 240, 138' : '125, 211, 252';
        midRgb = s % 2 === 0 ? '56, 189, 248' : '250, 204, 21';
        baseAlpha = 0.095;
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
      const grad = ctx.createLinearGradient(topX, topY, botX, botY);
      grad.addColorStop(0, `rgba(${topRgb}, 0)`);
      grad.addColorStop(0.24, `rgba(${topRgb}, 1)`);
      grad.addColorStop(0.68, `rgba(${midRgb}, 0.52)`);
      grad.addColorStop(1, `rgba(${midRgb}, 0)`);

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

    // 3. Stage-Specific Rising / Drifting Depth Motes for ALL 6 Stages
    const moteColors =
      activeStage === 'inferno'
        ? ['#fb923c', '#fde047']
        : activeStage === 'sanctuary'
          ? ['#7dd3fc', '#fef08a']
          : activeStage === 'sylvan'
            ? ['#34d399', '#fde047']
            : activeStage === 'boneyard'
              ? ['#c084fc', '#f43f5e']
              : activeStage === 'clocktower'
                ? ['#2dd4bf', '#fde047']
                : ['#38bdf8', '#fb923c'];
    const spdMult = activeStage === 'inferno' ? 1.85 : activeStage === 'sanctuary' ? 1.05 : 1.25;
    const windBias = activeStage === 'inferno' ? 28 : 0;

    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      const riseSpan = 540;
      const u = ((m.y + t * m.spdY * spdMult) % riseSpan) / riseSpan;
      const my = gy + 20 - u * riseSpan;
      const moteParallax = (this.camParallaxX || 0) * (0.08 + (i % 3) * 0.04);
      const rawDriftX =
        m.x +
        Math.sin(t * (activeStage === 'inferno' ? 2.8 : 1.6) + m.phase) * 26 +
        u * windBias;
      const mx = this.adventureMode
        ? this.camX - 760 + ((((rawDriftX - (this.camX - 760)) % 1520) + 1520) % 1520)
        : rawDriftX + moteAnchorOffset + moteParallax;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.8 + m.phase);
      const alpha = 0.36 + 0.50 * pulse;
      const col =
        activeStage === 'inferno' && i % 5 === 0
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

    if (activeStage === 'inferno') {
      // ★ INFERNO PHENOMENON: PYROCLASTIC CINDER STORM & SOLAR FLARE
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
        const midCol = p % 4 === 0 ? '#ef4444' : p % 2 === 0 ? '#fb923c' : '#fde047';
        const glow = p % 4 === 0 ? this.glowCrimson : p % 2 === 0 ? this.glowOrange : this.glowGold;
        const sz = p % 3 === 0 ? 5 : 4;
        drawGlowingParticle(px, py, sz, '#ffffff', midCol, glow, 24, pAlpha, tailDx, tailDy);
      }
    } else if (activeStage === 'sanctuary') {
      // ★ SANCTUARY PHENOMENON: RADIANT SERAPHIM FEATHER & HALO SHOWER
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
      // ★ CATHEDRAL PHENOMENON: SOLAR ECLIPSE EMBER RAIN
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
      // ★ SYLVAN PHENOMENON: ASTRAL STARFALL METEOR SHOWER & BIOLUMINESCENT FIREFLY SWARM
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
      // ★ BONEYARD PHENOMENON: ABYSSAL SOUL-EMBER ASCENSION
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
      // ★ CLOCKTOWER PHENOMENON: ANTI-GRAVITY TIME-SAND VORTEX
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

    ctx.restore();
  }

  /**
   * Near-Camera 1.22x Parallax Foreground Depth Layer (`14` sparse edge-biased particles at modest alpha
   * so fighter faces & silhouettes stay 100% clear!).
   */
  drawStageForeground(ctx, ww, gy) {
    const activeStage = this.getActiveStageId();
    const t = this.time;
    const fgShiftX = -(this.camParallaxX || 0) * 0.22;
    const fgShiftY = -(this.camParallaxY || 0) * 0.10;
    const viewSpanW = this.adventureMode ? 1200 : ww;
    const viewLeftX = this.adventureMode ? this.camX - viewSpanW * 0.5 : 0;
    const count = 14;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < count; i++) {
      const isLeftFlank = i % 2 === 0;
      const slot = Math.floor(i / 2); // 0..6
      const speed =
        activeStage === 'inferno'
          ? 0.34 + (i % 3) * 0.08
          : activeStage === 'sanctuary' || activeStage === 'sylvan'
            ? 0.16 + (i % 3) * 0.04
            : 0.22 + (i % 3) * 0.05;
      const cycle = (t * speed + i * 0.19) % 1;
      const flankSpan = viewSpanW * 0.28;
      const baseX = isLeftFlank
        ? viewLeftX - 35 + ((slot * 67) % Math.round(flankSpan))
        : viewLeftX + viewSpanW - flankSpan + ((slot * 71) % Math.round(flankSpan)) + 35;
      const swayX = Math.sin(t * 2.2 + i * 1.3) * 22 + (activeStage === 'inferno' ? cycle * 38 : 0);
      const px = Math.round((baseX + swayX + fgShiftX) / 3) * 3;

      const isFalling = activeStage === 'sanctuary' || (activeStage === 'sylvan' && i % 3 !== 0);
      const rawY = isFalling
        ? gy - 340 + cycle * 435
        : gy + 92 - cycle * 410;
      const py = Math.round((rawY + fgShiftY) / 3) * 3;
      const alpha = Math.sin(cycle * Math.PI) * 0.44;
      if (alpha <= 0.02) continue;

      if (activeStage === 'inferno') {
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
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(px - 3, py + 1, 5, 2);
        } else {
          ctx.fillStyle = '#fb923c';
          ctx.fillRect(px - 3, py - 3, 6, 6);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(px - 1, py - 1, 3, 3);
        }
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

    // Soft radial HD-2D optical vignette (no vertical side bars!)
    const rad = Math.hypot(w * 0.5, h * 0.5);
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, rad * 0.52, w * 0.5, h * 0.5, rad * 1.02);
    vig.addColorStop(0, 'rgba(2, 3, 7, 0)');
    vig.addColorStop(1, 'rgba(2, 3, 7, 0.62)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    const topG = ctx.createLinearGradient(0, 0, 0, h * 0.18);
    topG.addColorStop(0, 'rgba(2, 3, 7, 0.72)');
    topG.addColorStop(1, 'rgba(2, 3, 7, 0)');
    ctx.fillStyle = topG;
    ctx.fillRect(0, 0, w, h * 0.18);

    const botG = ctx.createLinearGradient(0, h * 0.80, 0, h);
    botG.addColorStop(0, 'rgba(2, 3, 7, 0)');
    botG.addColorStop(1, 'rgba(2, 3, 7, 0.80)');
    ctx.fillStyle = botG;
    ctx.fillRect(0, h * 0.80, w, h * 0.20);

    // 1. High-Impact Stage Phenomenon & Blessing Announcement (Upper Center Sky — Crystal-Clear Blessing Callout!)
    if (this.stageEventBannerTimer > 0 && !(this.cutInTimer > 0)) {
      const maxT = 3.8;
      const p = Math.max(0, Math.min(1, 1 - this.stageEventBannerTimer / maxT));
      const alpha = p < 0.08 ? p / 0.08 : p > 0.84 ? (1 - p) / 0.16 : 1;
      const slamScale = 1 + Math.max(0, 1 - p / 0.12) * 0.28;
      const cx = Math.round(w * 0.5);
      const cy = Math.round(h * 0.185);
      const rx = Math.min(w * 0.48, 490);
      const ry = this.isMobile ? 48 : 66;
      const evCol = this.stageEventColor || '#facc15';

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.translate(cx, cy);
      ctx.scale(slamScale, slamScale);

      // Soft radial feathered obsidian-elemental veil (fades smoothly to 0 on all edges, zero box!)
      ctx.save();
      ctx.scale(rx, ry);
      const veil = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1.0);
      veil.addColorStop(0, 'rgba(3, 6, 15, 0.90)');
      veil.addColorStop(0.62, 'rgba(5, 9, 22, 0.64)');
      veil.addColorStop(1, 'rgba(3, 6, 15, 0)');
      ctx.fillStyle = veil;
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
      ctx.textAlign = 'center';
      ctx.font = `${this.isMobile ? 9 : 13}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(this.stageEventTitle || '★ STAGE PHENOMENON ★', 2, -14);
      ctx.fillText(this.stageEventTitle || '★ STAGE PHENOMENON ★', -2, -14);
      ctx.fillStyle = evCol;
      ctx.fillText(this.stageEventTitle || '★ STAGE PHENOMENON ★', 0, -16);

      // Bottom Line: HUGE, Unmistakable Active Blessing Headline
      const blessText = this.stageEventSubtitle || '';
      ctx.font = `${this.isMobile ? 11 : 18}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(blessText, 3, 27);
      ctx.fillText(blessText, -2, 26);
      ctx.fillText(blessText, 0, 28);
      ctx.fillStyle = evCol;
      ctx.fillText(blessText, 1, 25);
      ctx.fillStyle = '#fef08a';
      ctx.fillText(blessText, 0, 24);
      ctx.restore();
    }

    // 2. Clean Top-Center Overdrive Awakening Callout with Circular Hero Medallion Portrait (Tucked cleanly under the VS Diamond!)
    if (this.cutInTimer > 0) {
      const p = 1 - this.cutInTimer / (this.cutInMaxTimer || 1.05);
      const alpha = p < 0.07 ? p / 0.07 : p > 0.80 ? (1 - p) / 0.20 : 1;
      const slamScale = 1 + Math.max(0, 1 - p / 0.12) * 0.24;
      const cx = Math.round(w * 0.5);
      const cy = this.isMobile ? 64 : 92;
      const rx = this.isMobile ? 235 : 365;
      const ry = this.isMobile ? 30 : 40;
      const elemCol = this.cutInColor || '#38bdf8';
      const assets = PixelForge.initAssets();
      const cutPort = assets[this.cutInHeroId || 'warrior']?.portrait;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.translate(cx, cy);
      ctx.scale(slamScale, slamScale);

      // Subtle feathered obsidian backdrop cushion strictly behind the text for 100% legibility (Zero screen wash-out!)
      ctx.save();
      ctx.scale(rx, ry);
      const veil = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1.0);
      veil.addColorStop(0, 'rgba(3, 6, 15, 0.88)');
      veil.addColorStop(0.62, 'rgba(5, 9, 22, 0.52)');
      veil.addColorStop(1, 'rgba(3, 6, 15, 0)');
      ctx.fillStyle = veil;
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Razor-thin 2px tapered elemental divider glint
      const lineG = ctx.createLinearGradient(-rx * 0.76, 0, rx * 0.76, 0);
      lineG.addColorStop(0, 'rgba(255, 255, 255, 0)');
      lineG.addColorStop(0.28, elemCol);
      lineG.addColorStop(0.5, '#ffffff');
      lineG.addColorStop(0.72, elemCol);
      lineG.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = lineG;
      ctx.fillRect(-rx * 0.76, -3, rx * 1.52, 2);

      // Circular Hero Portrait Medallion on the left of the Cut-In Callout
      const pR = this.isMobile ? 18 : 24;
      const pCx = -rx * 0.56;
      const pCy = 2;
      if (cutPort && cutPort.complete && cutPort.naturalWidth) {
        ctx.save();
        const pGlow = ctx.createRadialGradient(pCx, pCy, pR * 0.35, pCx, pCy, pR * 1.32);
        pGlow.addColorStop(0, '#fde047');
        pGlow.addColorStop(0.65, elemCol);
        pGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = pGlow;
        ctx.beginPath();
        ctx.arc(pCx, pCy, pR * 1.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pCx, pCy, pR, 0, Math.PI * 2);
        ctx.clip();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cutPort, pCx - pR, pCy - pR, pR * 2, pR * 2);
        ctx.restore();
      }

      const textShiftX = cutPort ? Math.round(pR * 0.55) : 0;
      ctx.textAlign = 'center';
      ctx.font = `${this.isMobile ? 7 : 10}px "Press Start 2P", monospace`;
      const eyebrow =
        this.cutInEyebrow || `★ ${(this.cutInName || 'CHAMPION').toUpperCase()} • OVERDRIVE ART ★`;
      ctx.fillStyle = '#020617';
      ctx.fillText(eyebrow, textShiftX + 2, -9);
      ctx.fillText(eyebrow, textShiftX - 2, -9);
      ctx.fillStyle = '#fde047';
      ctx.fillText(eyebrow, textShiftX, -11);

      ctx.font = `${this.isMobile ? 12 : 19}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(this.cutInUltName, textShiftX + 3, 21);
      ctx.fillText(this.cutInUltName, textShiftX - 2, 20);
      ctx.fillText(this.cutInUltName, textShiftX, 22);
      ctx.fillStyle = elemCol;
      ctx.fillText(this.cutInUltName, textShiftX + 2, 19);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.cutInUltName, textShiftX, 18);

      ctx.restore();
    }

    // 3. Borderless Decisive K.O. Finisher Emblem (Feathered Golden Flare + Circular Medallion Portrait + Floating Typography)
    if (this.koZoomTimer > 0) {
      const p = 1 - this.koZoomTimer / (this.koMaxTimer || 1.35);
      const alpha = p < 0.08 ? p / 0.08 : Math.max(0, 1 - (p - 0.08) / 0.92);
      const assets = PixelForge.initAssets();
      const winPort = assets[this.koWinnerHeroId || 'warrior']?.portrait;

      ctx.save();
      const kw = Math.min(w - 24, 680);
      const kh = this.isMobile ? 72 : 96;
      const kx = Math.round((w - kw) * 0.5);
      const ky = Math.round(h * 0.135);
      const kcx = Math.round(w * 0.5);
      const kcy = ky + Math.round(kh * 0.5);
      const koCol = this.koColor || '#facc15';

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Feathered elliptical golden-obsidian light veil (fades smoothly to 0 on all sides—ZERO BOX BORDER!)
      ctx.save();
      ctx.translate(kcx, kcy);
      ctx.scale(kw * 0.55, kh * 0.65);
      const koVeil = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1.0);
      koVeil.addColorStop(0, 'rgba(4, 7, 15, 0.84)');
      koVeil.addColorStop(0.6, 'rgba(8, 12, 24, 0.48)');
      koVeil.addColorStop(1, 'rgba(4, 7, 15, 0)');
      ctx.fillStyle = koVeil;
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
      ctx.fillRect(kx + 30, kcy + 3, kw - 60, 2);

      const pSz = kh - 12;
      const pCx = kx + 28 + Math.round(pSz * 0.5);
      const pCy = kcy;
      const pR = Math.round(pSz * 0.48);
      if (winPort && winPort.complete && winPort.naturalWidth) {
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

      ctx.textAlign = 'center';
      const kTextX = Math.round(kcx + pSz * 0.28);
      ctx.font = `${this.isMobile ? 12 : 19}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText('★ DECISIVE FINISH • K.O.! ★', kTextX + 3, kcy - 8 + 3);
      ctx.fillText('★ DECISIVE FINISH • K.O.! ★', kTextX - 2, kcy - 8 + 2);
      ctx.fillStyle = '#fde047';
      ctx.fillText('★ DECISIVE FINISH • K.O.! ★', kTextX, kcy - 8);

      ctx.font = `${this.isMobile ? 8 : 11}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(
        `${(this.koWinnerName || 'CHAMPION').toUpperCase()} CLAIMS THE SANCTUARY!`,
        kTextX + 2,
        kcy + (this.isMobile ? 18 : 24) + 2
      );
      ctx.fillStyle = '#ffffff';
      ctx.fillText(
        `${(this.koWinnerName || 'CHAMPION').toUpperCase()} CLAIMS THE SANCTUARY!`,
        kTextX,
        kcy + (this.isMobile ? 18 : 24)
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
    for (const f of fighters) {
      if (f.isFullyBurrowed) continue;
      const fGy = Number.isFinite(f.groundY) ? f.groundY : gy;
      const jumpH = Math.max(0, fGy - f.y);
      const scale = Math.max(0.25, 1 - jumpH / 320);
      const deadStretch = f.isDead ? 1 + Math.min(0.45, (f.deathTimer || 0) * 0.38) : 1;
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
}
