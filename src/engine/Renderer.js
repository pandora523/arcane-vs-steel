import { PixelForge } from './PixelForge.js';

const CYAN_FIRE_PAL = ['#0369a1', '#0284c7', '#0ea5e9', '#38bdf8'];
const SOLAR_FIRE_PAL = ['#9a3412', '#ea580c', '#f97316', '#facc15'];
const EMERALD_FIRE_PAL = ['#065f46', '#059669', '#10b981', '#34d399'];
const RADIANT_FIRE_PAL = ['#a16207', '#ca8a04', '#eab308', '#facc15'];
const ABYSSAL_FIRE_PAL = ['#4c1d95', '#7e22ce', '#a855f7', '#e11d48'];
const CHRONO_FIRE_PAL = ['#115e59', '#0d9488', '#14b8a6', '#eab308'];

export const STAGE_ROSTER = [
  { id: 'cathedral', name: 'ECLIPSE CATHEDRAL NAVE', assetKey: 'arenaBg' },
  { id: 'sylvan', name: 'MOONLIT ASTRAL SANCTUARY', assetKey: 'arenaSylvan' },
  { id: 'boneyard', name: 'ABYSSAL NECROPOLIS CITADEL', assetKey: 'arenaBoneyard' },
  { id: 'clocktower', name: 'CELESTIAL CLOCKTOWER OBSERVATORY', assetKey: 'arenaClocktower' }
];

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isMobile = this.width < 768;

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
    this.zoom = 1;
    this.time = 0;

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

  pickRandomStage(forcedStage = null) {
    if (forcedStage && STAGE_ROSTER.some((s) => s.id === forcedStage)) {
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
    this.shadowTex = makeGlow('rgba(0,0,0,0.92)', 'rgba(0,0,0,0.52)', 'rgba(0,0,0,0.18)');
  }

  getGlowForColor(col) {
    if (!col) return this.glowCyan;
    if (col === 'emerald' || col === '#10b981' || col === '#34d399' || col === '#6ee7b7' || col === '#a7f3d0') {
      return this.glowEmerald;
    }
    if (col === 'arcane' || col === '#f97316' || col === '#fb923c' || col === '#dc2626' || col === '#ea580c') {
      return this.glowOrange;
    }
    if (col === 'radiant' || col === '#fde047' || col === '#facc15' || col === '#eab308' || col === '#fef08a') {
      return this.glowGold;
    }
    if (
      col === 'abyssal' ||
      col === '#c084fc' ||
      col === '#9333ea' ||
      col === '#7e22ce' ||
      col === '#f43f5e' ||
      col === '#e879f9'
    ) {
      return this.glowViolet;
    }
    if (col === 'chrono' || col === '#2dd4bf' || col === '#99f6e4' || col === '#14b8a6') {
      return this.glowTeal;
    }
    return this.glowCyan;
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isMobile = this.width < 768;
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

  triggerUltimateCutIn(caster) {
    this.cutInTimer = 1.05;
    this.cutInMaxTimer = 1.05;
    this.cutInHeroId = caster.heroId || 'warrior';
    this.cutInName = caster.name || 'CHAMPION';
    this.cutInUltName = caster.ultName || 'ULTIMATE ART';
    this.cutInColor = caster.primaryColor || '#38bdf8';
    this.cutInFacing = caster.facing || 1;
  }

  triggerKOFinisher(x, y, color = '#facc15', winnerName = '', winnerHeroId = 'warrior') {
    this.koFocusX = x;
    this.koFocusY = y;
    this.koZoomTimer = 1.35;
    this.koMaxTimer = 1.35;
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
    this.stageEventBannerTimer = 2.8;
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

    if (fighters && fighters.length === 2) {
      const f1 = fighters[0];
      const f2 = fighters[1];
      const midX = (f1.x + f2.x) * 0.5;
      const dist = Math.abs(f1.x - f2.x) + 340;

      const fitScaleX = this.width / Math.max(620, Math.min(this.worldWidth, dist));
      const fitScaleY = this.height / 720;
      let targetZoom = Math.min(fitScaleX, fitScaleY * 1.15);
      targetZoom = Math.max(0.52, Math.min(this.isMobile ? 0.85 : 1.15, targetZoom));

      let targetX = midX;
      let targetY = this.groundY - 95;

      if (this.koZoomTimer > 0) {
        // Dramatic K.O. Finisher zoom toward the fatal impact
        targetZoom *= 1.12;
        if (this.koFocusX !== undefined) {
          targetX = midX * 0.45 + this.koFocusX * 0.55;
        }
      } else if (this.clashZoomTimer > 0) {
        targetZoom *= 1.045;
      } else if (this.ultZoomTimer > 0) {
        // Gentle 2.5% cinematic breathe without jerking the camera away from the arena center
        targetZoom *= 1.025;
      }

      // Clamp camera X so the viewport stays comfortably inside the 1680-wide cathedral diorama
      const halfViewW = (this.width * 0.5) / targetZoom;
      const bgLeft = (this.worldWidth - 1680) * 0.5 + 16;
      const bgRight = (this.worldWidth + 1680) * 0.5 - 16;
      if (bgRight - bgLeft > halfViewW * 2) {
        targetX = Math.max(bgLeft + halfViewW, Math.min(bgRight - halfViewW, targetX));
      } else {
        targetX = this.worldWidth * 0.5;
      }

      this.zoom += (targetZoom - this.zoom) * Math.min(1, rawDt * 6);
      this.camX += (targetX - this.camX) * Math.min(1, rawDt * 6);
      this.camY += (targetY - this.camY) * Math.min(1, rawDt * 6);
    }
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

    const screenAnchorY = this.height * (this.isMobile ? 0.64 : 0.68);
    ctx.translate(this.width * 0.5 + sx, screenAnchorY + sy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // 1. HD-2D Pixel-Art Cathedral Diorama + Live Animated Stage Flames & Volumetric God-Rays
    this.drawHD2DArena(ctx, ww, gy);
    this.drawVolumetricGodRays(ctx, ww, gy);
    if (this.stageEventTimer > 0) {
      this.drawStagePhenomenonWorld(ctx, ww, gy);
    }

    if (this.ultDim > 0.01) {
      ctx.fillStyle = `rgba(2, 3, 8, ${this.ultDim * 0.82})`;
      ctx.fillRect(-600, -800, ww + 1200, 2000);
    }

    // 2. Ground Scorch & Fissures
    vfx.renderGroundDecals(ctx, gy);

    // 3. Real-Time Pixel-Art Wet Stone Floor Reflections
    ctx.save();
    ctx.beginPath();
    ctx.rect(-600, gy + 2, ww + 1200, 700);
    ctx.clip();
    ctx.translate(0, (gy + 2) * 2);
    ctx.scale(1, -0.42);
    ctx.globalAlpha = 0.26;
    for (const f of fighters) f.draw(ctx, true, this);
    vfx.renderMainPass(ctx, true, this);
    ctx.restore();

    // 4. Unreal HD-2D Dynamic Point-Light Floor Pools, 4-Step Normal Map Lights & Grounded Contact Shadows
    const lights = vfx.getActiveLights(fighters, gy);
    this.activePointLights = lights;
    this.drawFloorLightPools(ctx, lights, gy);
    this.drawDynamicShadows(ctx, fighters, lights, gy);

    // 5. Skill & Aura Pass (Rendered BEHIND the character bodies so skills never obscure characters or glow over their faces!)
    if (typeof vfx.renderBackgroundCastSeals === 'function') {
      vfx.renderBackgroundCastSeals(ctx, this);
    }
    const sorted = [...fighters].sort((a, b) => a.y - b.y);
    for (const f of sorted) {
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
      ctx.globalAlpha = baseAlpha * deathFade;
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
      this.drawCharacterPixelFlames(ctx, f);
    }
    for (const f of sorted) {
      if (typeof f.drawForegroundOverlay === 'function') {
        f.drawForegroundOverlay(ctx, this);
      }
    }
    vfx.renderMainPass(ctx, false, this, false);

    // 6. Character Pass: Crisp Inked Champions drawn IN FRONT of normal skills & auto-attacks
    // so characters and their faces are NEVER buried under regular combat VFX or washed out by additive skill bloom!
    for (const f of sorted) {
      f.draw(ctx, false, this);
    }

    // 7. Foreground Ultimate Attack Pass: Ultimate Attacks, Clashes & K.O. Finishers blaze IN FRONT of the characters!
    for (const f of sorted) {
      if (typeof f.drawUltimateForeground === 'function') {
        f.drawUltimateForeground(ctx, this);
      }
    }
    vfx.renderMainPass(ctx, false, this, true);
    if (this.clashZoomTimer > 0) {
      this.drawClashWorld(ctx, gy);
    }
    if (this.koZoomTimer > 0) {
      this.drawKOFinisherWorld(ctx, gy);
    }

    // 8. Ultimate Callout Plates & Floating Combat Text
    vfx.renderFloatingTexts(ctx);

    ctx.restore();

    // 8. Screen-Space Unreal HD-2D Soft Tilt-Shift Vignette (Zero hard vertical bars)
    this.drawHD2DPostProcess(ctx);
  }

  drawHD2DArena(ctx, ww, gy) {
    const assets = PixelForge.initAssets();
    const stageMeta = this.getCurrentStageMeta();
    const bg = (stageMeta && assets[stageMeta.assetKey]) || assets.arenaBg;
    const drawW = 1680;
    const drawH = 945;
    const drawX = Math.round((ww - drawW) * 0.5);
    const drawY = Math.round(gy - drawH * 0.82);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (bg && bg.complete && bg.naturalWidth > 0) {
      // Seamless mirrored side wings for ultra-wide viewports or extreme camera shake so no vertical cutoff ever appears
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(bg, 0, 0, drawW, drawH);
      ctx.restore();

      ctx.save();
      ctx.translate(drawX + drawW * 2, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(bg, 0, 0, drawW, drawH);
      ctx.restore();

      // Main 16-bit HD-2D Stage Diorama
      ctx.drawImage(bg, drawX, drawY, drawW, drawH);
    } else {
      ctx.fillStyle = '#070a14';
      ctx.fillRect(-1200, -700, ww + 2400, gy + 1400);
    }

    // Subtle Pixel-Stepped Flagstone Seams & Specular Trim
    for (let r = 0; r < 5; r++) {
      const ry = Math.round((gy - 22 + r * r * 12) / 3) * 3;
      ctx.fillStyle = r === 1 ? 'rgba(148, 174, 212, 0.11)' : 'rgba(8, 11, 20, 0.34)';
      ctx.fillRect(-800, ry, ww + 1600, 3);
    }

    // Dispatch Bespoke Live Animated Pixel-Art Stage Effects Above Each Stage Image!
    if (this.stageId === 'sylvan') {
      this.drawSylvanStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy);
    } else if (this.stageId === 'boneyard') {
      this.drawBoneyardStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy);
    } else if (this.stageId === 'clocktower') {
      this.drawClocktowerStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy);
    } else {
      this.drawStagePixelFlames(ctx, bg, drawX, drawY, drawW, drawH, gy);
    }
    ctx.restore();
  }

  getFlameOnlyLayer(bg) {
    if (this.flameOnlyCanvas) return this.flameOnlyCanvas;
    if (!bg || !bg.complete || !bg.naturalWidth) return null;

    const w = bg.naturalWidth;
    const h = bg.naturalHeight;
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

    const w = bg.naturalWidth;
    const h = bg.naturalHeight;
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

    // 0. Flickering Stained-Glass Lancet Window Backlights & Floating Cathedral Sanctuary Censer Sparks
    const eclipseX = drawX + drawW * 0.504;
    const eclipseY = drawY + drawH * 0.352;
    const eclipseR = 56;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Pulsing golden-solar & frost-cyan stained-glass window shafts
    ctx.globalAlpha = 0.42 + 0.12 * Math.sin(t * 4.2);
    ctx.drawImage(this.glowGold, eclipseX - 280, eclipseY - 280, 560, 560);
    ctx.globalAlpha = 0.26 + 0.08 * Math.cos(t * 3.1);
    ctx.drawImage(this.glowOrange, eclipseX - 210, eclipseY - 210, 420, 420);
    ctx.restore();

    // Rising Golden & Frost Sanctuary Censer Sparks below the Rose Window (Zero dotted circles!)
    ctx.save();
    for (let j = 0; j < 14; j++) {
      const life = (t * (0.45 + (j % 3) * 0.12) + j * 0.41) % 1;
      const ox = Math.round((eclipseX + (j - 6.5) * 26 + Math.sin(t * 3.2 + j) * 10) / 4) * 4;
      const oy = Math.round((eclipseY + 95 - life * 165) / 4) * 4;
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.85;
      ctx.fillStyle = j % 3 === 0 ? '#ffffff' : j % 2 === 0 ? '#fde047' : '#fb923c';
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
      ctx.globalAlpha = 0.28;
      ctx.drawImage(glow, worldCx - glowR * 0.72, gy - 26, glowR * 1.44, 98 * b.scale);
      ctx.restore();

      // 3. Roaring Pixel-Art Flame Tongues & High-Rising Glowing Embers with Micro-Halos
      ctx.save();
      const emberCount = 16;
      for (let e = 0; e < emberCount; e++) {
        const life = (t * (1.15 + (e % 4) * 0.28) + b.seed + e * 1.17) % 1;
        const spread = (((e * 29) % 13) - 6) * 0.095 * flameW;
        const sway = Math.sin(t * 8.5 + e * 1.9 + b.seed) * (9 * b.scale * life);
        const ex = Math.round((worldCx + spread * (1 - life * 0.45) + sway) / 4) * 4;
        const ey = Math.round((worldBot - flameH * (0.22 + life * 1.35)) / 4) * 4;
        const pxSz = life < 0.28 ? 8 : life < 0.62 ? 6 : 4;
        const fade = Math.max(0, 1 - life * 0.88);

        if (e % 2 === 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.38;
          ctx.drawImage(glow, ex - 18, ey - 18, 36, 36);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.95;
        ctx.fillStyle = life < 0.25 ? '#ffffff' : life < 0.55 ? pal[3] : life < 0.8 ? pal[2] : pal[1];
        ctx.fillRect(ex - pxSz * 0.5, ey - pxSz * 0.5, pxSz, pxSz);
      }
      ctx.restore();
    }

    // 4. Shimmering Dual-Elemental (Frost-Cyan vs Solar-Gold) Cathedral Floor Light Strips (Zero circles!)
    ctx.save();
    const altarCx = drawX + drawW * 0.50;
    for (let r = 0; r < 12; r++) {
      const rx = Math.round((altarCx + (r - 5.5) * 44) / 4) * 4;
      const ry = gy + 8 + (r % 2) * 8;
      const isLeft = r < 6;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 4.5 + r);
      ctx.fillStyle = isLeft ? '#38bdf8' : '#fb923c';
      ctx.fillRect(rx - 10, ry, 20, 3);
    }
    ctx.restore();
  }

  drawSylvanStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    const t = this.time;

    // 0. Shimmering Celestial Aurora Borealis Curtains Waving Across the Night Sky + Shooting Astral Stars!
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let band = 0; band < 28; band++) {
      const u = band / 27;
      const ax = Math.round((drawX + drawW * (0.16 + u * 0.68)) / 8) * 8;
      const waveY =
        Math.sin(t * 1.6 + band * 0.35) * 18 + Math.cos(t * 0.9 - band * 0.22) * 10;
      const ay = Math.round((drawY + drawH * 0.14 + waveY) / 4) * 4;
      const ah = Math.round((64 + Math.sin(t * 2.2 + band * 0.5) * 24) / 4) * 4;
      const col = band % 3 === 0 ? '#34d399' : band % 2 === 0 ? '#38bdf8' : '#2dd4bf';
      ctx.globalAlpha = (0.18 + 0.06 * Math.sin(t * 3 + band)) * (1 - Math.abs(u - 0.5) * 1.3);
      ctx.fillStyle = col;
      ctx.fillRect(ax, ay, 12, ah);
    }

    // Periodic Shooting Astral Stars across the Sylvan night sky
    for (let star = 0; star < 2; star++) {
      const cycle = (t * 0.42 + star * 0.5) % 1;
      if (cycle < 0.36) {
        const p = cycle / 0.36;
        const sx = drawX + drawW * (0.22 + star * 0.32 + p * 0.24);
        const sy = drawY + drawH * (0.08 + star * 0.05 + p * 0.16);
        for (let tail = 0; tail < 7; tail++) {
          const tx = Math.round((sx - tail * 10) / 4) * 4;
          const ty = Math.round((sy - tail * 6) / 4) * 4;
          ctx.globalAlpha = (1 - tail / 7) * (1 - p) * 0.85;
          ctx.fillStyle = tail === 0 ? '#ffffff' : tail < 3 ? '#fef08a' : '#34d399';
          const sz = tail === 0 ? 6 : 4;
          ctx.fillRect(tx, ty, sz, sz);
        }
      }
    }
    ctx.restore();

    // 1. Soft Crescent Moon Volumetric Glow (No dotted circle covering the moon!)
    const moonX = drawX + drawW * 0.50;
    const moonY = drawY + drawH * 0.25;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.34 + 0.08 * Math.sin(t * 3.2);
    ctx.drawImage(this.glowEmerald, moonX - 240, moonY - 240, 480, 480);
    ctx.globalAlpha = 0.24 + 0.06 * Math.cos(t * 2.5);
    ctx.drawImage(this.glowCyan, moonX - 180, moonY - 180, 360, 360);
    ctx.restore();

    // 2. Live Cascading Pixel Waterfall Streams, Glowing Plunge Pool & Bioluminescent Splash Mist
    const fallsLeft = drawX + drawW * 0.415;
    const fallsW = drawW * 0.172;
    const fallsTop = drawY + drawH * 0.512;
    const fallsBot = drawY + drawH * 0.728;
    const fallsH = fallsBot - fallsTop;

    // Glowing Bioluminescent Waterfall Plunge Pool Halo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.34 + 0.08 * Math.sin(t * 5);
    ctx.drawImage(this.glowCyan, fallsLeft - 30, fallsBot - 65, fallsW + 60, 130);
    ctx.globalAlpha = 0.28;
    ctx.drawImage(this.glowEmerald, fallsLeft - 10, fallsTop - 20, fallsW + 20, fallsH + 40);
    ctx.restore();

    ctx.save();
    for (let s = 0; s < 20; s++) {
      const streamX = fallsLeft + (s / 19) * fallsW + Math.sin(s * 2.3) * 3;
      for (let d = 0; d < 8; d++) {
        const dropPhase = (t * (1.85 + (s % 4) * 0.24) + d / 8 + s * 0.17) % 1;
        const dx = Math.round((streamX + Math.sin(t * 9 + d + s) * 2) / 4) * 4;
        const dy = Math.round((fallsTop + dropPhase * fallsH) / 4) * 4;
        ctx.globalAlpha = 0.82 * (1 - Math.abs(dropPhase - 0.5) * 0.7);
        ctx.fillStyle =
          (s + d) % 4 === 0
            ? '#e0f2fe'
            : (s + d) % 3 === 0
              ? '#34d399'
              : (s + d) % 2 === 0
                ? '#38bdf8'
                : '#0284c7';
        ctx.fillRect(dx, dy, 4, 12);
      }
      // Rising bioluminescent foam, splash droplets & expanding pool ripples at the waterfall base
      const mistCycle = (t * 1.55 + s * 0.31) % 1;
      const mx = Math.round((streamX + Math.sin(t * 4.5 + s) * 10) / 4) * 4;
      const my = Math.round((fallsBot - mistCycle * 34) / 4) * 4;
      ctx.globalAlpha = (1 - mistCycle) * 0.78;
      ctx.fillStyle = s % 3 === 0 ? '#fef9c3' : s % 2 === 0 ? '#38bdf8' : '#34d399';
      ctx.fillRect(mx - 4, my - 2, 8, 4);
    }
    ctx.restore();

    // 3. 6 Hanging Bioluminescent Crystal Lanterns & Swarming Glowing Forest Fireflies
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

      // Pulsing crystal core & detaching bioluminescent spores with micro-glow halos
      ctx.save();
      const pulseSz = Math.sin(t * 7 + l.seed) > 0 ? 8 : 6;
      ctx.fillStyle = pal[2];
      ctx.fillRect(Math.round(lx) - pulseSz, Math.round(ly) - pulseSz, pulseSz * 2, pulseSz * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(lx) - 3, Math.round(ly) - 3, 6, 6);

      for (let e = 0; e < 10; e++) {
        const life = (t * (0.85 + (e % 3) * 0.22) + l.seed + e * 1.19) % 1;
        const sx = Math.round((lx + Math.sin(t * 4.2 + e * 2.1 + l.seed) * (32 * l.scale)) / 4) * 4;
        const sy = Math.round((ly + 22 - life * (95 * l.scale)) / 4) * 4;
        const fade = Math.max(0, 1 - life * 0.85);
        if (e % 2 === 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.36;
          ctx.drawImage(glow, sx - 16, sy - 16, 32, 32);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.94;
        ctx.fillStyle = e % 3 === 0 ? '#fef08a' : life < 0.45 ? pal[3] : pal[1];
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      }
      ctx.restore();
    }

    // 4. Drifting Wind-Swept Luminous Sylvan Blossom Petals & Horizontal Plunge-Pool Water Ripples (Zero circles!)
    ctx.save();
    for (let p = 0; p < 18; p++) {
      const u = (t * (0.14 + (p % 3) * 0.04) + p * 0.17) % 1;
      const px = Math.round((drawX + drawW * (0.10 + u * 0.80)) / 4) * 4;
      const py =
        Math.round(
          (drawY +
            drawH * (0.24 + ((p * 0.19 + u * 0.55) % 0.56)) +
            Math.sin(t * 3.5 + p * 1.7) * 18) /
            4
        ) * 4;
      const gTex = p % 2 === 0 ? this.glowEmerald : this.glowCyan;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32;
      ctx.drawImage(gTex, px - 14, py - 14, 28, 28);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = p % 3 === 0 ? '#fef08a' : p % 2 === 0 ? '#6ee7b7' : '#7dd3fc';
      ctx.fillRect(px - 3, py - 2, 6, 4);
    }

    const poolCx = drawX + drawW * 0.50;
    for (let r = 0; r < 10; r++) {
      const rx = Math.round((poolCx + (r - 4.5) * 48 + Math.sin(t * 3 + r) * 12) / 4) * 4;
      const ry = gy + 6 + (r % 3) * 6;
      ctx.globalAlpha = 0.48 + 0.28 * Math.sin(t * 4.5 + r);
      ctx.fillStyle = r % 2 === 0 ? '#34d399' : '#38bdf8';
      ctx.fillRect(rx - 14, ry, 28, 3);
    }
    ctx.restore();
  }

  drawBoneyardStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    const t = this.time;

    // 0. Breathing Blood-Moon Atmospheric Horizon Pulse Behind the Gothic Spires
    const moonPulse = 0.22 + 0.12 * Math.sin(t * 2.1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = moonPulse;
    ctx.drawImage(this.glowViolet, drawX + drawW * 0.25, drawY + drawH * 0.02, drawW * 0.5, drawH * 0.45);
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

      // Dancing Crimson-Violet Soul-Fire Pixel Embers & Tongues with Micro-Halos
      ctx.save();
      for (let e = 0; e < 14; e++) {
        const life = (t * (1.2 + (e % 3) * 0.28) + b.seed + e * 1.31) % 1;
        const spread = (((e * 23) % 11) - 5) * 0.11 * flameW;
        const sway = Math.sin(t * 8.8 + e * 1.7 + b.seed) * (9 * b.scale * life);
        const ex = Math.round((worldCx + spread * (1 - life * 0.5) + sway) / 4) * 4;
        const ey = Math.round((worldBot - flameH * (0.22 + life * 1.25)) / 4) * 4;
        const pxSz = life < 0.35 ? 6 : life < 0.72 ? 4 : 3;
        const fade = Math.max(0, 0.96 - life * 0.85);
        if (e % 2 === 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.36;
          ctx.drawImage(this.glowViolet, ex - 16, ey - 16, 32, 32);
        }
        ctx.globalCompositeOperation = 'source-over';
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

    // 2. Soft Blood-Crimson & Royal-Purple Eclipse Moon Glow (Zero dotted circles covering the moon!)
    const moonX = drawX + drawW * 0.50;
    const moonY = drawY + drawH * 0.24;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.38 + 0.10 * Math.sin(t * 3.8);
    ctx.drawImage(this.glowViolet, moonX - 250, moonY - 250, 500, 500);
    ctx.restore();

    // 3. Rising Spectral Wraith Wisps with Glowing Comet Tails & Rolling Multi-Layer Graveyard Mist
    ctx.save();
    for (let w = 0; w < 18; w++) {
      const life = (t * (0.44 + (w % 3) * 0.14) + w * 0.67) % 1;
      const wx = drawX + drawW * (0.10 + (w / 17) * 0.80) + Math.sin(t * 3.4 + w * 1.9) * 32;
      const wy = gy + 14 - life * 290;
      const rx = Math.round(wx / 4) * 4;
      const ry = Math.round(wy / 4) * 4;
      const fade = Math.sin(life * Math.PI);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.42;
      ctx.drawImage(this.glowViolet, rx - 22, ry - 22, 44, 44);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * 0.90;
      ctx.fillStyle = w % 3 === 0 ? '#e11d48' : '#a855f7';
      ctx.fillRect(rx - 4, ry - 4, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 2, ry - 2, 4, 4);
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(rx - 2, ry + 4, 4, 8);
    }

    // Pixel-stepped rolling purple-crimson grave mist ribbons across the obsidian bridge
    for (let m = 0; m < 16; m++) {
      const mx =
        drawX +
        drawW * 0.08 +
        ((m * 135 + t * (34 + (m % 4) * 12)) % (drawW * 0.84));
      const my = gy - 12 + (m % 5) * 9;
      ctx.globalAlpha = 0.26 + 0.12 * Math.sin(t * 2.8 + m);
      ctx.fillStyle = m % 3 === 0 ? '#a855f7' : m % 2 === 0 ? '#581c87' : '#9f1239';
      ctx.fillRect(Math.round(mx / 4) * 4, Math.round(my / 4) * 4, 76, 6);
    }
    ctx.restore();
  }

  drawClocktowerStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    const t = this.time;

    // 1. Central Astronomical Stained-Glass Clock Dial with Live Sweeping Clock Hands (No dotted circle rings!)
    const clockX = drawX + drawW * 0.50;
    const clockY = drawY + drawH * 0.31;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.38 + 0.10 * Math.sin(t * 3.6);
    ctx.drawImage(this.glowTeal, clockX - 250, clockY - 250, 500, 500);
    ctx.globalAlpha = 0.28 + 0.08 * Math.cos(t * 2.8);
    ctx.drawImage(this.glowGold, clockX - 190, clockY - 190, 380, 380);
    ctx.restore();

    ctx.save();
    // Live sweeping pixel-art astronomical clock hands (Hour = Imperial Gold, Minute = Aether Teal, Second = Ticking White-Gold)
    const secAngle = Math.floor(t * 6) * ((Math.PI * 2) / 24) - Math.PI * 0.5;
    const minAngle = t * 0.85 - Math.PI * 0.5;
    const hourAngle = t * 0.18 - Math.PI * 0.25;
    for (let step = 1; step <= 20; step++) {
      const r = step * 4.6;
      const sx = Math.round((clockX + Math.cos(secAngle) * r) / 4) * 4;
      const sy = Math.round((clockY + Math.sin(secAngle) * r) / 4) * 4;
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
    }
    for (let step = 1; step <= 18; step++) {
      const r = step * 4.6;
      const mx = Math.round((clockX + Math.cos(minAngle) * r) / 4) * 4;
      const my = Math.round((clockY + Math.sin(minAngle) * r) / 4) * 4;
      ctx.fillStyle = step > 14 ? '#5eead4' : '#14b8a6';
      ctx.fillRect(mx - 3, my - 3, 6, 6);
    }
    for (let step = 1; step <= 12; step++) {
      const r = step * 4.6;
      const hx = Math.round((clockX + Math.cos(hourAngle) * r) / 4) * 4;
      const hy = Math.round((clockY + Math.sin(hourAngle) * r) / 4) * 4;
      ctx.fillStyle = step > 9 ? '#fef08a' : '#eab308';
      ctx.fillRect(hx - 3, hy - 3, 6, 6);
    }
    // Central clockwork pivot boss
    ctx.fillStyle = '#fde047';
    ctx.fillRect(Math.round(clockX) - 7, Math.round(clockY) - 7, 14, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(clockX) - 3, Math.round(clockY) - 3, 6, 6);
    ctx.restore();

    // 2. 6 Pulsing Aether-Teal & Imperial-Gold Observatory Lanterns + Anti-Gravity Time-Sand Streams
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
        const ex = Math.round((lx + Math.sin(t * 6 + e * 2.1 + l.seed) * (20 * l.scale)) / 4) * 4;
        const ey = Math.round((ly + 14 - life * (84 * l.scale)) / 4) * 4;
        const fade = Math.max(0, 0.95 - life * 0.85);
        if (e % 2 === 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.35;
          ctx.drawImage(glow, ex - 15, ey - 15, 30, 30);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade;
        ctx.fillStyle = life < 0.3 ? '#ffffff' : life < 0.65 ? pal[3] : pal[2];
        ctx.fillRect(ex - 2, ey - 2, 5, 5);
      }
      ctx.restore();
    }

    // 3. Crackling Pixel Aether-Lightning Arcs Jumping Between the Side Bronze Gears & Central Clock Dial (No circles!)
    ctx.save();
    for (let side = -1; side <= 1; side += 2) {
      const gearCx = drawX + drawW * (side < 0 ? 0.14 : 0.86);
      const gearCy = drawY + drawH * 0.56;
      // Periodic Tesla Aether-Arc from side gear toward upper observatory
      if (Math.sin(t * 7 + side * 2) > 0.15) {
        const tx = gearCx + side * -95;
        const ty = gearCy - 110;
        for (let s = 0; s <= 10; s++) {
          const u = s / 10;
          const jx =
            Math.round(
              (gearCx + (tx - gearCx) * u + Math.sin(u * Math.PI * 3 + t * 28) * 14) / 4
            ) * 4;
          const jy =
            Math.round(
              (gearCy + (ty - gearCy) * u + Math.cos(u * Math.PI * 2 + t * 24) * 10) / 4
            ) * 4;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = s % 2 === 0 ? '#2dd4bf' : '#fde047';
          ctx.fillRect(jx - 4, jy - 4, 8, 8);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.92;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(jx - 2, jy - 2, 4, 4);
        }
      }
    }

    // Rising Anti-Gravity Golden & Teal Time-Sand Streams from the Belfry Floor (No floor oval!)
    const floorCx = drawX + drawW * 0.50;
    for (let n = 0; n < 14; n++) {
      const life = (t * (0.55 + (n % 3) * 0.15) + n * 0.37) % 1;
      const nx = Math.round((floorCx + (n - 6.5) * 42) / 4) * 4;
      const ny = Math.round((gy + 12 - life * 85) / 4) * 4;
      ctx.globalAlpha = (1 - life) * 0.78;
      ctx.fillStyle = n % 2 === 0 ? '#fde047' : '#2dd4bf';
      ctx.fillRect(nx - 2, ny - 4, 4, 8);
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
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const rayPalettes = {
      cathedral: [
        { xTop: ww * 0.5 - 110, xBot: ww * 0.5 - 340, w: 115, col: 'rgba(56, 189, 248, 0.055)' },
        { xTop: ww * 0.5 - 55, xBot: ww * 0.5 - 220, w: 135, col: 'rgba(234, 179, 8, 0.065)' },
        { xTop: ww * 0.5 + 15, xBot: ww * 0.5 - 65, w: 175, col: 'rgba(249, 115, 22, 0.075)' },
        { xTop: ww * 0.5 + 85, xBot: ww * 0.5 + 125, w: 130, col: 'rgba(14, 165, 233, 0.060)' },
        { xTop: ww * 0.5 + 135, xBot: ww * 0.5 + 290, w: 110, col: 'rgba(250, 204, 21, 0.055)' }
      ],
      sylvan: [
        { xTop: ww * 0.5 - 115, xBot: ww * 0.5 - 350, w: 120, col: 'rgba(52, 211, 153, 0.060)' },
        { xTop: ww * 0.5 - 65, xBot: ww * 0.5 - 235, w: 145, col: 'rgba(16, 185, 129, 0.070)' },
        { xTop: ww * 0.5 + 10, xBot: ww * 0.5 - 60, w: 175, col: 'rgba(56, 189, 248, 0.070)' },
        { xTop: ww * 0.5 + 85, xBot: ww * 0.5 + 145, w: 135, col: 'rgba(52, 211, 153, 0.065)' },
        { xTop: ww * 0.5 + 140, xBot: ww * 0.5 + 310, w: 115, col: 'rgba(250, 204, 21, 0.050)' }
      ],
      boneyard: [
        { xTop: ww * 0.5 - 110, xBot: ww * 0.5 - 340, w: 115, col: 'rgba(168, 85, 247, 0.060)' },
        { xTop: ww * 0.5 - 60, xBot: ww * 0.5 - 225, w: 140, col: 'rgba(147, 51, 234, 0.075)' },
        { xTop: ww * 0.5 + 15, xBot: ww * 0.5 - 65, w: 170, col: 'rgba(225, 29, 72, 0.070)' },
        { xTop: ww * 0.5 + 90, xBot: ww * 0.5 + 140, w: 130, col: 'rgba(168, 85, 247, 0.065)' },
        { xTop: ww * 0.5 + 140, xBot: ww * 0.5 + 305, w: 110, col: 'rgba(244, 63, 94, 0.055)' }
      ],
      clocktower: [
        { xTop: ww * 0.5 - 110, xBot: ww * 0.5 - 340, w: 115, col: 'rgba(45, 212, 191, 0.060)' },
        { xTop: ww * 0.5 - 55, xBot: ww * 0.5 - 230, w: 135, col: 'rgba(20, 184, 166, 0.070)' },
        { xTop: ww * 0.5 + 20, xBot: ww * 0.5 - 70, w: 170, col: 'rgba(234, 179, 8, 0.075)' },
        { xTop: ww * 0.5 + 90, xBot: ww * 0.5 + 135, w: 125, col: 'rgba(45, 212, 191, 0.065)' },
        { xTop: ww * 0.5 + 135, xBot: ww * 0.5 + 295, w: 110, col: 'rgba(250, 204, 21, 0.055)' }
      ]
    };

    const rays = rayPalettes[this.stageId] || rayPalettes.cathedral;
    for (const r of rays) {
      const sway = Math.sin(this.time * 1.1 + r.xTop) * 24;
      ctx.fillStyle = r.col;
      ctx.beginPath();
      ctx.moveTo(r.xTop, gy - 580);
      ctx.lineTo(r.xTop + r.w * 0.65, gy - 580);
      ctx.lineTo(r.xBot + r.w + sway, gy + 45);
      ctx.lineTo(r.xBot + sway, gy + 45);
      ctx.closePath();
      ctx.fill();
    }

    const moteColors =
      this.stageId === 'sylvan'
        ? ['#34d399', '#38bdf8']
        : this.stageId === 'boneyard'
          ? ['#c084fc', '#e11d48']
          : this.stageId === 'clocktower'
            ? ['#2dd4bf', '#fde047']
            : ['#38bdf8', '#fb923c'];

    for (const m of this.motes) {
      const my = gy + 20 - ((m.y + this.time * m.spdY * 1.25) % 540);
      const mx = m.x + Math.sin(this.time * 1.6 + m.phase) * 26;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3.8 + m.phase);
      const alpha = 0.38 + 0.52 * pulse;
      const col = m.isBlue ? moteColors[0] : moteColors[1];
      const glowTex = this.getGlowForColor(col);
      const s = m.size;
      const sx = Math.round(mx / 2) * 2;
      const sy = Math.round(my / 2) * 2;

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.42;
      ctx.drawImage(glowTex, sx - 16, sy - 16, 32, 32);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.fillRect(sx, sy, s, s);
      if (pulse > 0.72) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 1, sy - 2, 2, s + 4);
        ctx.fillRect(sx - 2, sy + 1, s + 4, 2);
      }
    }
    ctx.restore();
  }

  drawStagePhenomenonWorld(ctx, ww, gy) {
    const t = this.time;
    const fade = Math.min(1, this.stageEventTimer / 1.5);
    ctx.save();

    // Helper for drawing a multi-layered glowing HD-2D pixel particle with optional tail
    const drawGlowingPixel = (px, py, size, coreCol, midCol, glowTex, glowR, alpha, tailDx = 0, tailDy = 0) => {
      const rx = Math.round(px / 3) * 3;
      const ry = Math.round(py / 3) * 3;
      if (glowTex && glowR > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.42;
        ctx.drawImage(glowTex, rx - glowR, ry - glowR, glowR * 2, glowR * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      if (tailDx !== 0 || tailDy !== 0) {
        for (let step = 3; step >= 1; step--) {
          const tx = Math.round((rx + tailDx * step) / 3) * 3;
          const ty = Math.round((ry + tailDy * step) / 3) * 3;
          const tSz = Math.max(2, size - step);
          ctx.globalAlpha = alpha * (1 - step * 0.24);
          ctx.fillStyle = midCol;
          ctx.fillRect(tx - tSz * 0.5, ty - tSz * 0.5, tSz, tSz);
        }
      }
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = midCol;
      ctx.fillRect(rx - size * 0.5 - 1, ry - size * 0.5 - 1, size + 2, size + 2);
      ctx.fillStyle = coreCol;
      ctx.fillRect(rx - size * 0.5 + 1, ry - size * 0.5 + 1, Math.max(2, size - 2), Math.max(2, size - 2));
    };

    if (this.stageId === 'cathedral') {
      // ★ CATHEDRAL PHENOMENON: SOLAR ECLIPSE EMBER RAIN & SANCTUARY SUNBEAMS (100% Pure Particles & Light!)
      // 1. Soft Diagonal Volumetric Sunbeam Shafts slanting from the Rose Window across the Nave
      const originX = ww * 0.504;
      const originY = gy - 380;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.38 * fade;
      ctx.drawImage(this.glowGold, originX - 260, originY - 220, 520, 440);

      const shafts = [-380, -210, -60, 90, 250, 410];
      for (let i = 0; i < shafts.length; i++) {
        const botX = originX + shafts[i] + Math.sin(t * 1.4 + i) * 22;
        const pulse = 0.65 + 0.35 * Math.sin(t * 3.8 + i * 1.2);
        const grad = ctx.createLinearGradient(originX, originY, botX, gy);
        const isGold = i % 2 === 0;
        grad.addColorStop(0, isGold ? 'rgba(250, 204, 21, 0.16)' : 'rgba(56, 189, 248, 0.14)');
        grad.addColorStop(0.7, isGold ? 'rgba(249, 115, 22, 0.08)' : 'rgba(14, 165, 233, 0.07)');
        grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.globalAlpha = fade * pulse;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(originX - 18, originY);
        ctx.lineTo(originX + 18, originY);
        ctx.lineTo(botX + 54, gy + 10);
        ctx.lineTo(botX - 54, gy + 10);
        ctx.closePath();
        ctx.fill();
      }

      // 2. 64 Cascading Solar-Gold & Frost-Cyan Incandescent Ember Particles & Twinkling Sanctuary Cross-Sparks
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

        drawGlowingPixel(px, py, sz, '#ffffff', midCol, glow, 22, pAlpha, 0, -5);

        // Twinkling 1-pixel diamond cross-glint on larger embers
        if (p % 5 === 0 && Math.sin(t * 9 + p) > 0.2) {
          const rx = Math.round(px / 3) * 3;
          const ry = Math.round(py / 3) * 3;
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = pAlpha;
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(rx - 7, ry - 1, 14, 2);
          ctx.fillRect(rx - 1, ry - 7, 2, 14);
        }
      }
    } else if (this.stageId === 'sylvan') {
      // ★ SYLVAN PHENOMENON: ASTRAL STARFALL METEOR SHOWER & BIOLUMINESCENT FIREFLY SWARM (100% Pure Particles!)
      // 1. 18 Diagonal Shooting Starfall Meteors with Tapered Pixel Comet Tails & Starlight Flares
      for (let s = 0; s < 18; s++) {
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

        // 8-segment pixel comet tail
        for (let tail = 7; tail >= 1; tail--) {
          const tx = Math.round((sx - tail * 7) / 3) * 3;
          const ty = Math.round((sy - tail * 11) / 3) * 3;
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = sAlpha * (1 - tail / 8) * 0.85;
          ctx.fillStyle = tail < 3 ? '#fef08a' : col;
          const tSz = tail < 3 ? 4 : 3;
          ctx.fillRect(tx, ty, tSz, tSz);
        }

        // Glowing meteor head + 4-pointed starlight pixel flare
        drawGlowingPixel(sx, sy, 5, '#ffffff', '#fef08a', glow, 26, sAlpha);
        const hx = Math.round(sx / 3) * 3;
        const hy = Math.round(sy / 3) * 3;
        ctx.globalAlpha = sAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - 8, hy - 1, 16, 2);
        ctx.fillRect(hx - 1, hy - 8, 2, 16);
      }

      // 2. 48 Swirling Bioluminescent Forest Fireflies & Floating Emerald Wind-Sparks
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
        drawGlowingPixel(fx, fy, 4, '#ffffff', midCol, glow, 20, fAlpha, -4, 3);
      }
    } else if (this.stageId === 'boneyard') {
      // ★ BONEYARD PHENOMENON: BLOOD MOON VOLUMETRIC SHAFTS & ABYSSAL SOUL-EMBER ASCENSION (100% Pure Particles & Light!)
      // 1. 5 Volumetric Crimson-Violet Blood-Moon Light Shafts Streaming from the Necropolis Sky
      ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 5; b++) {
        const topX = ww * 0.5 + (b - 2) * 95;
        const botX = ww * (0.14 + b * 0.18) + Math.sin(t * 1.6 + b * 1.3) * 42;
        const beamW = 85 + (b % 2) * 30;
        const bAlpha = fade * (0.12 + 0.05 * Math.sin(t * 2.8 + b));
        const grad = ctx.createLinearGradient(topX, gy - 540, botX, gy + 15);
        grad.addColorStop(0, `rgba(225, 29, 72, ${bAlpha * 1.35})`);
        grad.addColorStop(0.55, `rgba(168, 85, 247, ${bAlpha})`);
        grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(topX - beamW * 0.32, gy - 540);
        ctx.lineTo(topX + beamW * 0.32, gy - 540);
        ctx.lineTo(botX + beamW * 0.95, gy + 15);
        ctx.lineTo(botX - beamW * 0.95, gy + 15);
        ctx.closePath();
        ctx.fill();
      }

      // 2. 84 Rising Crimson & Violet Abyssal Soul-Flame Wisps & Twinkling Diamond Embers
      for (let w = 0; w < 84; w++) {
        const cycle = (t * (0.38 + (w % 5) * 0.07) + w * 0.23) % 1;
        const baseX = 90 + ((w * 79) % (ww - 180));
        const swirlX = Math.sin(cycle * Math.PI * 3 + t * 3.8 + w) * (22 + (w % 3) * 10);
        const wx = baseX + swirlX;
        const wy = gy + 8 - cycle * 490;
        const wAlpha = fade * Math.sin(cycle * Math.PI);
        const isCrimson = w % 3 === 0;
        const midCol = isCrimson ? '#f43f5e' : w % 2 === 0 ? '#e879f9' : '#a855f7';
        const sz = w % 4 === 0 ? 6 : 4;

        drawGlowingPixel(wx, wy, sz, '#ffffff', midCol, this.glowViolet, 26, wAlpha, -swirlX * 0.1, 7);

        // Twinkling 4-point diamond soul-glint on every 5th ember
        if (w % 5 === 0 && Math.sin(t * 9 + w) > 0.25) {
          const rx = Math.round(wx / 3) * 3;
          const ry = Math.round(wy / 3) * 3;
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = wAlpha;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(rx - 6, ry - 1, 12, 2);
          ctx.fillRect(rx - 1, ry - 6, 2, 12);
        }
      }
    } else if (this.stageId === 'clocktower') {
      // ★ CLOCKTOWER PHENOMENON: CELESTIAL OBSERVATORY SHAFTS & ANTI-GRAVITY TIME-SAND VORTEX (100% Pure Particles & Light!)
      // 1. 5 Volumetric Golden & Aether-Teal Observatory Light Shafts from the Great Clock Dial
      ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 5; b++) {
        const topX = ww * 0.5 + (b - 2) * 85;
        const botX = ww * (0.15 + b * 0.175) + Math.cos(t * 1.5 + b * 1.2) * 38;
        const beamW = 80 + (b % 2) * 28;
        const bAlpha = fade * (0.12 + 0.05 * Math.sin(t * 3.0 + b));
        const grad = ctx.createLinearGradient(topX, gy - 530, botX, gy + 15);
        if (b % 2 === 0) {
          grad.addColorStop(0, `rgba(253, 224, 71, ${bAlpha * 1.3})`);
          grad.addColorStop(0.55, `rgba(45, 212, 191, ${bAlpha})`);
          grad.addColorStop(1, 'rgba(45, 212, 191, 0)');
        } else {
          grad.addColorStop(0, `rgba(45, 212, 191, ${bAlpha * 1.3})`);
          grad.addColorStop(0.55, `rgba(253, 224, 71, ${bAlpha})`);
          grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(topX - beamW * 0.3, gy - 530);
        ctx.lineTo(topX + beamW * 0.3, gy - 530);
        ctx.lineTo(botX + beamW * 0.9, gy + 15);
        ctx.lineTo(botX - beamW * 0.9, gy + 15);
        ctx.closePath();
        ctx.fill();
      }

      // 2. 84 Levitating Golden & Aether-Teal Time-Sand Particles Rising in Helical Streams
      for (let p = 0; p < 84; p++) {
        const cycle = (t * (0.40 + (p % 4) * 0.08) + p * 0.21) % 1;
        const streamX = 100 + ((p * 73) % (ww - 200));
        const helix = Math.sin(cycle * Math.PI * 3.5 + t * 4.5 + p) * 24;
        const px = streamX + helix;
        const py = gy + 6 - cycle * 505;
        const pAlpha = fade * Math.sin(cycle * Math.PI);
        const isGold = p % 2 === 0;
        const midCol = isGold ? '#fde047' : '#2dd4bf';
        const glow = isGold ? this.glowGold : this.glowTeal;
        const sz = p % 3 === 0 ? 6 : 4;

        drawGlowingPixel(px, py, sz, '#ffffff', midCol, glow, 24, pAlpha, 0, 7);

        // Twinkling 4-point diamond star-glint on every 4th time-sand grain
        if (p % 4 === 0 && Math.cos(t * 10 + p) > 0.22) {
          const rx = Math.round(px / 3) * 3;
          const ry = Math.round(py / 3) * 3;
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = pAlpha;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(rx - 6, ry - 1, 12, 2);
          ctx.fillRect(rx - 1, ry - 6, 2, 12);
        }
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

    // 1. Borderless Feathered Stage Phenomenon Callout (Upper Sky below HUD)
    if (this.stageEventBannerTimer > 0 && !(this.cutInTimer > 0)) {
      const p = 1 - this.stageEventBannerTimer / 2.8;
      const alpha = p < 0.12 ? p / 0.12 : p > 0.82 ? (1 - p) / 0.18 : 1;
      const cx = Math.round(w * 0.5);
      const cy = Math.round(h * 0.16);
      const rx = Math.min(w * 0.44, 340);
      const ry = 38;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Soft radial feathered shadow veil (fades smoothly to 0 on all edges, zero box!)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      const veil = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1.0);
      veil.addColorStop(0, 'rgba(4, 7, 15, 0.78)');
      veil.addColorStop(0.65, 'rgba(4, 7, 15, 0.42)');
      veil.addColorStop(1, 'rgba(4, 7, 15, 0)');
      ctx.fillStyle = veil;
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Tapered 2px elemental light filament between title and subtitle
      const lineGrad = ctx.createLinearGradient(cx - rx * 0.75, cy, cx + rx * 0.75, cy);
      lineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      lineGrad.addColorStop(0.25, this.stageEventColor || '#facc15');
      lineGrad.addColorStop(0.5, '#ffffff');
      lineGrad.addColorStop(0.75, this.stageEventColor || '#facc15');
      lineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(cx - rx * 0.75, cy + 1, rx * 1.5, 2);

      ctx.textAlign = 'center';
      ctx.font = `${this.isMobile ? 8 : 11}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(this.stageEventTitle || '★ STAGE PHENOMENON ★', cx + 2, cy - 7);
      ctx.fillStyle = this.stageEventColor || '#facc15';
      ctx.fillText(this.stageEventTitle || '★ STAGE PHENOMENON ★', cx, cy - 9);

      ctx.font = `${this.isMobile ? 6 : 8}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(this.stageEventSubtitle || '', cx + 2, cy + 19);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(this.stageEventSubtitle || '', cx, cy + 17);
      ctx.restore();
    }

    // 2. Borderless HD-2D Ultimate Cut-In Light Ribbon (Feathered Aura + Soft-Masked Portrait + Floating Typography)
    if (this.cutInTimer > 0) {
      const p = 1 - this.cutInTimer / (this.cutInMaxTimer || 1.05);
      const alpha = p < 0.08 ? p / 0.08 : p > 0.82 ? (1 - p) / 0.18 : 1;
      const stripH = this.isMobile ? 96 : 144;
      const stripY = Math.round(h * 0.125);
      const stripW = Math.min(w - 16, 1080);
      const stripX = Math.round((w - stripW) * 0.5);
      const cy = stripY + Math.round(stripH * 0.5);
      const cx = Math.round(w * 0.5);
      const assets = PixelForge.initAssets();
      const heroAsset = assets[this.cutInHeroId];
      const portImg = heroAsset?.portrait;
      const sheetImg = heroAsset?.sheet;
      const elemCol = this.cutInColor || '#38bdf8';

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Soft-feathered elliptical dark & elemental light wash (fades to 0 alpha on top, bottom, left, right—NO BOX!)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(stripW * 0.54, stripH * 0.62);
      const ribbonVeil = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1.0);
      ribbonVeil.addColorStop(0, 'rgba(3, 6, 14, 0.84)');
      ribbonVeil.addColorStop(0.58, 'rgba(6, 11, 24, 0.52)');
      ribbonVeil.addColorStop(1, 'rgba(3, 6, 14, 0)');
      ctx.fillStyle = ribbonVeil;
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Soft-feathered elliptical elemental aura (zero rectangular top/bottom band edges!)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(stripW * 0.44, stripH * 0.38);
      const elemAura = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1.0);
      elemAura.addColorStop(0, elemCol);
      elemAura.addColorStop(0.55, elemCol);
      elemAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = alpha * 0.20;
      ctx.fillStyle = elemAura;
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Single 2px tapered horizontal light filament between subtitle and ultimate title
      const glowStream = ctx.createLinearGradient(stripX + 80, cy, stripX + stripW - 80, cy);
      glowStream.addColorStop(0, 'rgba(255, 255, 255, 0)');
      glowStream.addColorStop(0.25, elemCol);
      glowStream.addColorStop(0.5, '#fde047');
      glowStream.addColorStop(0.75, elemCol);
      glowStream.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.save();
      ctx.globalAlpha = alpha * 0.78;
      ctx.fillStyle = glowStream;
      ctx.fillRect(stripX + 80, cy - 2, stripW - 160, 2);
      ctx.restore();

      // Blazing High-Velocity Elemental Speedlines (concentrated toward vertical center, fading at edges)
      for (let s = 0; s < 22; s++) {
        const lineW = 70 + (s % 4) * 48;
        const sx = stripX + 60 + ((s * 97 + Math.round(this.time * 1450)) % Math.max(120, stripW - lineW - 120));
        const syOffset = ((s * 13) % Math.round(stripH * 0.64)) - Math.round(stripH * 0.32);
        const sy = cy + syOffset;
        const edgeFade = 1 - Math.abs(syOffset) / (stripH * 0.36);
        ctx.fillStyle = s % 3 === 0 ? '#ffffff' : s % 2 === 0 ? elemCol : '#facc15';
        ctx.globalAlpha = Math.max(0, alpha * edgeFade * (s % 3 === 0 ? 0.55 : 0.32));
        ctx.fillRect(sx, sy, lineW, s % 3 === 0 ? 3 : 2);
      }

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      const portSize = stripH - 8;
      const isLeft = this.cutInFacing >= 0;
      const portX = isLeft ? stripX + 24 : stripX + stripW - portSize - 24;
      const portY = cy - Math.round(portSize * 0.5);
      const portCx = portX + Math.round(portSize * 0.5);
      const portCy = portY + Math.round(portSize * 0.5);
      const portR = Math.round(portSize * 0.48);

      // 1) Borderless Circular-Masked HD-2D Portrait with Soft Elemental Halo (NO SQUARE BOX!)
      if (portImg && portImg.complete && portImg.naturalWidth) {
        ctx.save();
        const halo = ctx.createRadialGradient(portCx, portCy, portR * 0.4, portCx, portCy, portR * 1.32);
        halo.addColorStop(0, elemCol);
        halo.addColorStop(0.6, 'rgba(250, 204, 21, 0.35)');
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(portCx, portCy, portR * 1.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(portCx, portCy, portR, 0, Math.PI * 2);
        ctx.clip();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(portImg, portX, portY, portSize, portSize);
        ctx.restore();
      }

      // 2) Giant Action-Pose Character Sprite on Opposite Side (with soft radial backlight, no box!)
      if (!this.isMobile && sheetImg && sheetImg.complete && sheetImg.naturalWidth) {
        const cell = Math.round(sheetImg.naturalWidth / 8) || 208;
        const actionSize = Math.round(stripH * 1.42);
        const actionX = isLeft ? stripX + stripW - actionSize - 24 : stripX + 24;
        const actionY = cy - Math.round(actionSize * 0.5) - 6;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheetImg, 2 * cell, 2 * cell, cell, cell, actionX, actionY, actionSize, actionSize);
      }

      // 3) Floating Arcade Ultimate Callout Typography with Deep Pixel Drop-Shadow
      ctx.textAlign = 'center';
      const textCx = Math.round(w * 0.5);
      const topTy = cy - (this.isMobile ? 12 : 18);
      const botTy = cy + (this.isMobile ? 20 : 30);

      ctx.font = `${this.isMobile ? 8 : 11}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(`★ ${this.cutInName} • OVERDRIVE UNLEASHED ★`, textCx + 2, topTy + 2);
      ctx.fillStyle = '#fde047';
      ctx.fillText(`★ ${this.cutInName} • OVERDRIVE UNLEASHED ★`, textCx, topTy);

      ctx.font = `${this.isMobile ? 13 : 22}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(this.cutInUltName, textCx + 3, botTy + 3);
      ctx.fillText(this.cutInUltName, textCx - 2, botTy + 2);
      ctx.fillStyle = elemCol;
      ctx.fillText(this.cutInUltName, textCx + 1, botTy + 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.cutInUltName, textCx, botTy);
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
      const distY = Math.max(0, gy - l.y);
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
                  : this.glowOrange;
      ctx.globalAlpha = Math.min(0.38, 0.28 * atten * l.intensity);
      ctx.drawImage(tex, l.x - rx, gy + 2 - ry, rx * 2, ry * 2);
    }
    ctx.restore();
  }

  drawDynamicShadows(ctx, fighters, lights, gy) {
    for (const f of fighters) {
      const jumpH = Math.max(0, gy - f.y);
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
      ctx.drawImage(this.shadowTex, f.x + shiftX - rx, gy - ry + 4, rx * 2, ry * 2);
      if (jumpH < 8) {
        ctx.drawImage(
          this.shadowTex,
          f.x - 46 * deadStretch,
          gy - 8,
          92 * deadStretch,
          18
        );
      }
    }
  }
}
