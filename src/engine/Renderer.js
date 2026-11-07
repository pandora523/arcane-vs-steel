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

      if (this.ultZoomTimer > 0) {
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

    // 1. HD-2D Pixel-Art Cathedral Diorama + Live Animated Stage Flames
    this.drawHD2DArena(ctx, ww, gy);

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

    // 5. Main Pass: Background 16-bit HD-2D Cast Seals + Normal-Lit Fighters + Live Weapon Glow
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
          ? 0.42
          : 0.64
        : f.state === 'IDLE' || f.state === 'WALK'
          ? 0.24
          : 0.40;
      ctx.globalAlpha = baseAlpha * deathFade;
      const glow = this.getGlowForColor(f.primaryColor);
      ctx.drawImage(glow, f.x - 140, f.y - (f.isDead ? 115 : 205), 280, 280);
      if (isChrono && !f.isDead) {
        ctx.globalAlpha = (f.state === 'IDLE' || f.state === 'WALK' ? 0.30 : 0.48) * deathFade;
        ctx.drawImage(this.glowGold, f.x - 115, f.y - 190, 230, 230);
      }
      ctx.restore();

      if (f.heroId !== 'reaper') {
        this.drawCharacterGroundHalo(ctx, f);
      }
      f.draw(ctx, false, this);
      this.drawCharacterPixelFlames(ctx, f);
    }
    for (const f of sorted) {
      if (typeof f.drawForegroundOverlay === 'function') {
        f.drawForegroundOverlay(ctx, this);
      }
    }
    vfx.renderMainPass(ctx, false, this);

    // 6. Volumetric Crepuscular God-Rays & Illuminated Dust Motes
    this.drawVolumetricGodRays(ctx, ww, gy);

    // 7. Floating Combat Text
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

    for (const b of braziers) {
      const pal = b.isBlue ? CYAN_FIRE_PAL : SOLAR_FIRE_PAL;
      const glow = b.isBlue ? this.glowCyan : this.glowOrange;
      const worldCx = drawX + drawW * b.cx;
      const worldTop = drawY + drawH * b.top;
      const worldBot = drawY + drawH * b.bot;
      const worldMidY = (worldTop + worldBot) * 0.52;
      const flameH = worldBot - worldTop;
      const flameW = drawW * b.w;

      // 1. Real-Time Heat-Wave Slice Animation using the Isolated Transparent Flame Layer (Zero rectangular wall artifact!)
      if (flameLayer) {
        const strips = 14;
        const srcX = (b.cx - b.w * 0.5) * bgW;
        const srcW = b.w * bgW;
        const srcTop = b.top * bgH;
        const srcH = (b.bot - b.top) * bgH;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42 + 0.18 * Math.sin(t * 11 + b.seed);
        for (let s = 0; s < strips; s++) {
          const ratio = 1 - s / strips;
          const sy = srcTop + (s / strips) * srcH;
          const sh = srcH / strips + 0.5;
          const dy = worldTop + (s / strips) * flameH;
          const dh = flameH / strips + 1;

          const wave = Math.round(
            Math.sin(t * 10.5 + s * 0.6 + b.seed) * (ratio * 5.0 * b.scale)
          );
          ctx.drawImage(
            flameLayer,
            srcX,
            sy,
            srcW,
            sh,
            Math.round(worldCx - flameW * 0.5 + wave),
            Math.round(dy - ratio * 4 * b.scale),
            Math.round(flameW),
            Math.round(dh)
          );
        }
        ctx.restore();
      }

      // 2. Volumetric Saturated Point-Light Halo & Wet Stone Floor Reflection Pool
      const pulse = Math.sin(t * 7.5 + b.seed) * 14 * b.scale;
      const glowR = 125 * b.scale + pulse;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34;
      ctx.drawImage(glow, worldCx - glowR, worldMidY - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 0.22;
      ctx.drawImage(glow, worldCx - glowR * 0.68, gy - 24, glowR * 1.36, 90 * b.scale);
      ctx.restore();

      // 3. Crisp Dancing Saturated Pixel Embers & Tongues Detaching from the Flame Crest
      ctx.save();
      const emberCount = 8;
      for (let e = 0; e < emberCount; e++) {
        const life = (t * (1.2 + (e % 3) * 0.3) + b.seed + e * 1.37) % 1;
        const spread = (((e * 29) % 11) - 5) * 0.11 * flameW;
        const sway = Math.sin(t * 8.5 + e * 1.9 + b.seed) * (7 * b.scale * life);
        const ex = worldCx + spread * (1 - life * 0.55) + sway;
        const ey = worldBot - flameH * (0.28 + life * 0.88);
        const pxSz = life < 0.35 ? 4 : life < 0.72 ? 3 : 2;
        ctx.globalAlpha = Math.max(0, 0.95 - life * 0.85);
        ctx.fillStyle = life < 0.28 ? pal[3] : life < 0.65 ? pal[2] : pal[1];
        ctx.fillRect(Math.round(ex / 2) * 2, Math.round(ey / 2) * 2, pxSz, pxSz);
      }
      ctx.restore();
    }

    // 4. Central Solar Eclipse Rose Window Pixel Corona & Volumetric Pulse
    const eclipseX = drawX + drawW * 0.504;
    const eclipseY = drawY + drawH * 0.352;
    const eclipseR = 54;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.30 + 0.08 * Math.sin(t * 4);
    ctx.drawImage(this.glowGold, eclipseX - 230, eclipseY - 230, 460, 460);
    ctx.restore();

    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + t * 0.6;
      const flare = Math.sin(t * 9 + i * 1.7) * 5;
      const r = eclipseR + flare;
      const fx = Math.round((eclipseX + Math.cos(a) * r) / 4) * 4;
      const fy = Math.round((eclipseY + Math.sin(a) * r) / 4) * 4;
      ctx.fillStyle = i % 3 === 0 ? SOLAR_FIRE_PAL[3] : SOLAR_FIRE_PAL[2];
      ctx.fillRect(fx, fy, 4, 4);
    }
  }

  drawSylvanStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    const t = this.time;

    // 1. Colossal Glowing Crescent Moon Corona & Orbiting Astral Starlight Motes
    const moonX = drawX + drawW * 0.50;
    const moonY = drawY + drawH * 0.25;
    const moonR = 96;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.30 + 0.08 * Math.sin(t * 3.2);
    ctx.drawImage(this.glowEmerald, moonX - 250, moonY - 250, 500, 500);
    ctx.globalAlpha = 0.24 + 0.06 * Math.cos(t * 2.5);
    ctx.drawImage(this.glowCyan, moonX - 190, moonY - 190, 380, 380);
    ctx.restore();

    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + t * 0.45;
      const r = moonR + Math.sin(t * 6 + i * 1.9) * 8;
      const fx = Math.round((moonX + Math.cos(a) * r) / 4) * 4;
      const fy = Math.round((moonY + Math.sin(a) * r) / 4) * 4;
      ctx.fillStyle = i % 4 === 0 ? '#facc15' : i % 2 === 0 ? '#34d399' : '#38bdf8';
      ctx.fillRect(fx - 2, fy - 2, 4, 4);
    }

    // 2. Live Cascading Pixel Waterfall Streams & Bioluminescent Splash Mist (x: 0.415..0.595, y: 0.52..0.72)
    const fallsLeft = drawX + drawW * 0.418;
    const fallsW = drawW * 0.168;
    const fallsTop = drawY + drawH * 0.515;
    const fallsBot = drawY + drawH * 0.725;
    const fallsH = fallsBot - fallsTop;

    ctx.save();
    for (let s = 0; s < 14; s++) {
      const streamX = fallsLeft + (s / 13) * fallsW + Math.sin(s * 2.3) * 4;
      for (let d = 0; d < 6; d++) {
        const dropPhase = (t * (1.65 + (s % 3) * 0.25) + d / 6 + s * 0.19) % 1;
        const dx = Math.round((streamX + Math.sin(t * 8 + d + s) * 2) / 4) * 4;
        const dy = Math.round((fallsTop + dropPhase * fallsH) / 4) * 4;
        ctx.globalAlpha = 0.72 * (1 - Math.abs(dropPhase - 0.5) * 0.8);
        ctx.fillStyle = (s + d) % 3 === 0 ? '#34d399' : (s + d) % 2 === 0 ? '#38bdf8' : '#0284c7';
        ctx.fillRect(dx, dy, 4, 10);
      }
      // Rising bioluminescent foam & mist at the waterfall pool base
      const mistCycle = (t * 1.4 + s * 0.37) % 1;
      const mx = Math.round((streamX + Math.sin(t * 4 + s) * 8) / 4) * 4;
      const my = Math.round((fallsBot - mistCycle * 26) / 4) * 4;
      ctx.globalAlpha = (1 - mistCycle) * 0.65;
      ctx.fillStyle = s % 2 === 0 ? '#38bdf8' : '#10b981';
      ctx.fillRect(mx - 4, my - 2, 8, 4);
    }
    ctx.restore();

    // 3. 6 Hanging Bioluminescent Crystal Lanterns & Floating Spore Sparks
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
      const glowR = (115 + Math.sin(t * 5.5 + l.seed) * 14) * l.scale;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34;
      ctx.drawImage(glow, lx - glowR, ly - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 0.22;
      ctx.drawImage(glow, lx - glowR * 0.65, gy - 22, glowR * 1.3, 82 * l.scale);
      ctx.restore();

      // Pulsing crystal core & detaching bioluminescent spores
      ctx.save();
      const pulseSz = Math.sin(t * 7 + l.seed) > 0 ? 8 : 6;
      ctx.fillStyle = pal[2];
      ctx.fillRect(Math.round(lx) - pulseSz, Math.round(ly) - pulseSz, pulseSz * 2, pulseSz * 2);
      ctx.fillStyle = pal[3];
      ctx.fillRect(Math.round(lx) - 3, Math.round(ly) - 3, 6, 6);

      for (let e = 0; e < 7; e++) {
        const life = (t * (0.9 + (e % 3) * 0.22) + l.seed + e * 1.19) % 1;
        const sx = lx + Math.sin(t * 4.5 + e * 2.1 + l.seed) * (24 * l.scale);
        const sy = ly + 18 - life * (75 * l.scale);
        ctx.globalAlpha = Math.max(0, 0.92 - life * 0.85);
        ctx.fillStyle = e % 3 === 0 ? '#facc15' : life < 0.45 ? pal[3] : pal[1];
        ctx.fillRect(Math.round(sx / 3) * 3, Math.round(sy / 3) * 3, 4, 4);
      }
      ctx.restore();
    }

    // 4. Glowing Sanctuary Stone Floor Rune Ring & Drifting Forest Fireflies
    ctx.save();
    const runeCx = drawX + drawW * 0.50;
    const runeCy = gy + 16;
    for (let r = 0; r < 20; r++) {
      const ra = (r / 20) * Math.PI * 2 + t * 0.35;
      const rx = Math.round((runeCx + Math.cos(ra) * 235) / 4) * 4;
      const ry = Math.round((runeCy + Math.sin(ra) * 26) / 4) * 4;
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t * 4 + r);
      ctx.fillStyle = r % 2 === 0 ? '#10b981' : '#0ea5e9';
      ctx.fillRect(rx - 3, ry - 2, 6, 4);
    }
    ctx.restore();
  }

  drawBoneyardStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    const t = this.time;

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
        ctx.globalAlpha = 0.44 + 0.18 * Math.sin(t * 10 + b.seed);
        for (let s = 0; s < strips; s++) {
          const ratio = 1 - s / strips;
          const sy = srcTop + (s / strips) * srcH;
          const sh = srcH / strips + 0.5;
          const dy = worldTop + (s / strips) * flameH;
          const dh = flameH / strips + 1;
          const wave = Math.round(Math.sin(t * 11 + s * 0.65 + b.seed) * (ratio * 5.5 * b.scale));
          ctx.drawImage(
            flameLayer,
            srcX,
            sy,
            srcW,
            sh,
            Math.round(worldCx - flameW * 0.5 + wave),
            Math.round(dy - ratio * 4 * b.scale),
            Math.round(flameW),
            Math.round(dh)
          );
        }
        ctx.restore();
      }

      const glowR = (128 + Math.sin(t * 7 + b.seed) * 15) * b.scale;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.36;
      ctx.drawImage(this.glowViolet, worldCx - glowR, worldMidY - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 0.24;
      ctx.drawImage(this.glowViolet, worldCx - glowR * 0.7, gy - 24, glowR * 1.4, 92 * b.scale);
      ctx.restore();

      // Dancing Crimson-Violet Soul-Fire Pixel Embers & Tongues
      ctx.save();
      for (let e = 0; e < 9; e++) {
        const life = (t * (1.25 + (e % 3) * 0.28) + b.seed + e * 1.31) % 1;
        const spread = (((e * 23) % 11) - 5) * 0.11 * flameW;
        const sway = Math.sin(t * 8.8 + e * 1.7 + b.seed) * (8 * b.scale * life);
        const ex = worldCx + spread * (1 - life * 0.5) + sway;
        const ey = worldBot - flameH * (0.25 + life * 0.92);
        const pxSz = life < 0.38 ? 5 : life < 0.72 ? 4 : 3;
        ctx.globalAlpha = Math.max(0, 0.95 - life * 0.85);
        ctx.fillStyle =
          life < 0.25
            ? ABYSSAL_FIRE_PAL[3]
            : life < 0.58
              ? ABYSSAL_FIRE_PAL[2]
              : ABYSSAL_FIRE_PAL[1];
        ctx.fillRect(Math.round(ex / 3) * 3, Math.round(ey / 3) * 3, pxSz, pxSz);
      }
      ctx.restore();
    }

    // 2. Colossal Blood-Crimson & Royal-Purple Eclipse Moon Corona (cx: 0.50, cy: 0.24)
    const moonX = drawX + drawW * 0.50;
    const moonY = drawY + drawH * 0.24;
    const moonR = 96;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.34 + 0.08 * Math.sin(t * 3.8);
    ctx.drawImage(this.glowViolet, moonX - 240, moonY - 240, 480, 480);
    ctx.restore();

    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 - t * 0.55;
      const flare = Math.sin(t * 8.5 + i * 1.5) * 7;
      const r = moonR + flare;
      const fx = Math.round((moonX + Math.cos(a) * r) / 4) * 4;
      const fy = Math.round((moonY + Math.sin(a) * r) / 4) * 4;
      ctx.fillStyle = i % 3 === 0 ? '#e11d48' : i % 2 === 0 ? '#a855f7' : '#7e22ce';
      ctx.fillRect(fx - 2, fy - 2, 5, 5);
    }

    // 3. Rising Spectral Wraith Wisps & Rolling Low-Lying Purple Grave Mist across the Floor
    ctx.save();
    for (let w = 0; w < 12; w++) {
      const life = (t * (0.48 + (w % 3) * 0.14) + w * 0.83) % 1;
      const wx = drawX + drawW * (0.14 + (w / 11) * 0.72) + Math.sin(t * 3.2 + w * 1.9) * 26;
      const wy = gy + 12 - life * 240;
      const rx = Math.round(wx / 4) * 4;
      const ry = Math.round(wy / 4) * 4;
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.78;
      ctx.fillStyle = w % 3 === 0 ? '#e11d48' : '#9333ea';
      ctx.fillRect(rx - 4, ry - 4, 8, 8);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(rx - 2, ry + 4, 4, 6);
    }

    // Pixel-stepped rolling purple grave mist ribbons on the obsidian bridge
    for (let m = 0; m < 10; m++) {
      const mx =
        drawX +
        drawW * 0.12 +
        ((m * 165 + t * (28 + (m % 3) * 10)) % (drawW * 0.76));
      const my = gy - 8 + (m % 4) * 11;
      ctx.globalAlpha = 0.22 + 0.10 * Math.sin(t * 2.5 + m);
      ctx.fillStyle = m % 2 === 0 ? '#581c87' : '#881337';
      ctx.fillRect(Math.round(mx / 4) * 4, Math.round(my / 4) * 4, 64, 6);
    }
    ctx.restore();
  }

  drawClocktowerStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    const t = this.time;

    // 1. Central Astronomical Stained-Glass Clock Dial with Live Rotating Pixel Clock Hands & Gear Ring (cx: 0.50, cy: 0.31)
    const clockX = drawX + drawW * 0.50;
    const clockY = drawY + drawH * 0.31;
    const clockR = 102;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.30 + 0.08 * Math.sin(t * 3.6);
    ctx.drawImage(this.glowTeal, clockX - 240, clockY - 240, 480, 480);
    ctx.globalAlpha = 0.22 + 0.06 * Math.cos(t * 2.8);
    ctx.drawImage(this.glowGold, clockX - 180, clockY - 180, 360, 360);
    ctx.restore();

    // Counter-rotating outer escapement gear teeth & celestial numeral nodes
    ctx.save();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + t * 0.42;
      const gx = Math.round((clockX + Math.cos(a) * clockR) / 4) * 4;
      const gy2 = Math.round((clockY + Math.sin(a) * clockR) / 4) * 4;
      ctx.fillStyle = i % 2 === 0 ? '#eab308' : '#14b8a6';
      ctx.fillRect(gx - 3, gy2 - 3, 6, 6);
    }

    // Live sweeping pixel-art astronomical clock hands (Hour hand = Imperial Gold, Minute hand = Celestial Teal)
    const minAngle = t * 0.85 - Math.PI * 0.5;
    const hourAngle = t * 0.18 - Math.PI * 0.25;
    for (let step = 1; step <= 18; step++) {
      const r = step * 4.6;
      const mx = Math.round((clockX + Math.cos(minAngle) * r) / 4) * 4;
      const my = Math.round((clockY + Math.sin(minAngle) * r) / 4) * 4;
      ctx.fillStyle = step > 14 ? '#2dd4bf' : '#0d9488';
      ctx.fillRect(mx - 2, my - 2, 5, 5);
    }
    for (let step = 1; step <= 12; step++) {
      const r = step * 4.6;
      const hx = Math.round((clockX + Math.cos(hourAngle) * r) / 4) * 4;
      const hy = Math.round((clockY + Math.sin(hourAngle) * r) / 4) * 4;
      ctx.fillStyle = step > 9 ? '#facc15' : '#ca8a04';
      ctx.fillRect(hx - 3, hy - 3, 6, 6);
    }
    // Central clockwork pivot boss
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(Math.round(clockX) - 6, Math.round(clockY) - 6, 12, 12);
    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(Math.round(clockX) - 3, Math.round(clockY) - 3, 6, 6);
    ctx.restore();

    // 2. 6 Pulsing Aether-Teal & Imperial-Gold Observatory Lanterns + Crackling Gearwork Lightning
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
      const glowR = (112 + Math.sin(t * 6.5 + l.seed) * 14) * l.scale;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32;
      ctx.drawImage(glow, lx - glowR, ly - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 0.22;
      ctx.drawImage(glow, lx - glowR * 0.65, gy - 22, glowR * 1.3, 84 * l.scale);
      ctx.restore();

      ctx.save();
      for (let e = 0; e < 6; e++) {
        const life = (t * (1.1 + (e % 3) * 0.25) + l.seed + e * 1.4) % 1;
        const ex = lx + Math.sin(t * 6 + e * 2.1 + l.seed) * (16 * l.scale);
        const ey = ly + 10 - life * (62 * l.scale);
        ctx.globalAlpha = Math.max(0, 0.92 - life * 0.85);
        ctx.fillStyle = life < 0.35 ? pal[3] : life < 0.7 ? pal[2] : pal[1];
        ctx.fillRect(Math.round(ex / 3) * 3, Math.round(ey / 3) * 3, 4, 4);
      }
      ctx.restore();
    }

    // 3. Crackling Pixel Aether-Lightning Arcs across the Bronze Side Gears & Floor Astrolabe Ring
    ctx.save();
    for (let side = -1; side <= 1; side += 2) {
      const gearCx = drawX + drawW * (side < 0 ? 0.14 : 0.86);
      const gearCy = drawY + drawH * 0.56;
      for (let k = 0; k < 5; k++) {
        const ka = t * 3.5 * side + k * 1.25;
        const kx = Math.round((gearCx + Math.cos(ka) * 58) / 4) * 4;
        const ky = Math.round((gearCy + Math.sin(ka) * 58) / 4) * 4;
        ctx.fillStyle = k % 2 === 0 ? '#14b8a6' : '#eab308';
        ctx.fillRect(kx - 2, ky - 2, 5, 5);
      }
    }

    // Illuminated Golden-Teal Floor Astrolabe Nodes
    const floorCx = drawX + drawW * 0.50;
    const floorCy = gy + 18;
    for (let n = 0; n < 22; n++) {
      const na = (n / 22) * Math.PI * 2 - t * 0.45;
      const nx = Math.round((floorCx + Math.cos(na) * 255) / 4) * 4;
      const ny = Math.round((floorCy + Math.sin(na) * 28) / 4) * 4;
      ctx.globalAlpha = 0.5 + 0.35 * Math.sin(t * 5 + n);
      ctx.fillStyle = n % 2 === 0 ? '#eab308' : '#14b8a6';
      ctx.fillRect(nx - 3, ny - 2, 6, 4);
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
    const t = this.time;
    const isAction = f.state === 'SKILL' || f.state === 'ULTIMATE' || f.state === 'AUTO_ATTACK';
    const rX = isAction ? 66 : 48;
    const rY = isAction ? 17 : 12;
    const nodes = isChrono ? 12 : isAction ? 20 : 14;

    ctx.save();
    ctx.globalAlpha = isAction ? 0.85 : 0.55;
    const gy = f.groundY || this.groundY;

    for (let i = 0; i < nodes; i++) {
      const a = (i / nodes) * Math.PI * 2 + t * (isAction ? 3.6 : 1.6) * f.facing;
      const rx = Math.round((f.x + Math.cos(a) * rX) / 3) * 3;
      const ry = Math.round((gy - 2 + Math.sin(a) * rY) / 3) * 3;
      ctx.fillStyle = i % 3 === 0 ? pal[3] : i % 2 === 0 ? pal[2] : pal[1];
      ctx.fillRect(rx - 2, ry - 1, 4, 3);
    }
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
    const t = this.time;

    ctx.save();

    // 1. Emit live saturated pixel-art fire / rune / wind / wraith / clockwork sparks along the weapon & aura
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
      ctx.fillStyle = cycle < 0.28 ? pal[3] : cycle < 0.62 ? pal[2] : pal[1];
      ctx.fillRect(px, py, sz, sz);
    }

    // 2. Character-Specific Signature Aura Overlay (Rich saturated jewel tones, no whitewash)
    if (!f.isDead) {
      if (isBlue) {
        // AETHELGARD: Runic Frost-Steel Greatsword Shimmer + Aegis Hexagonal Shield Barrier when deflecting
        if (f.isDeflecting) {
          ctx.globalAlpha = 0.85;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + t * 8;
            const hx = Math.round((f.x + Math.cos(a) * 68) / 4) * 4;
            const hy = Math.round((f.y - 68 + Math.sin(a) * 68) / 4) * 4;
            ctx.fillStyle = i % 2 === 0 ? '#e0f2fe' : '#38bdf8';
            ctx.fillRect(hx - 3, hy - 3, 6, 6);
          }
        }
      } else if (isEmerald) {
        // SYLVARA: Swirling Emerald Wind Ribbon & Starlight Feathers Orbiting Her Cloak
        ctx.globalAlpha = 0.88;
        for (let w = 0; w < 4; w++) {
          const wa = t * 4.8 + (w * Math.PI) / 2;
          const wyOff = ((t * 48 + w * 28) % 110) - 10;
          const wx = Math.round((f.x + Math.cos(wa) * (36 + w * 4)) / 3) * 3;
          const wy = Math.round((f.y - 18 - wyOff + Math.sin(wa) * 8) / 3) * 3;
          ctx.fillStyle = w % 2 === 0 ? '#10b981' : '#059669';
          ctx.fillRect(wx - 4, wy - 2, 8, 3);
          ctx.fillStyle = '#34d399';
          ctx.fillRect(wx - 1, wy - 1, 2, 2);
        }
      } else if (isRadiant) {
        // SERAPHINA: Gentle Imperial-Gold Sanctuary Crown Motes
        ctx.globalAlpha = 0.85;
        for (let m = 0; m < 3; m++) {
          const ma = t * 2.6 + (m * Math.PI * 2) / 3;
          const mx = Math.round((f.x + Math.cos(ma) * 38) / 3) * 3;
          const my = Math.round((f.y - 115 + Math.sin(ma * 2) * 8) / 3) * 3;
          ctx.fillStyle = '#eab308';
          ctx.fillRect(mx - 3, my - 3, 6, 6);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(mx - 1, my - 1, 2, 2);
        }
      } else if (isAbyssal) {
        // MALAKOR: Creeping Floor Shadow Mist & Drifting Crimson-Violet Soul Wisps
        ctx.globalAlpha = 0.86;
        for (let s = 0; s < 3; s++) {
          const phase = (t * 0.9 + s * 0.33) % 1;
          const sx = Math.round((f.x - f.facing * (18 + s * 14) + Math.sin(t * 4 + s) * 10) / 4) * 4;
          const sy = Math.round((f.y - 24 - phase * 92) / 4) * 4;
          ctx.fillStyle = s % 2 === 0 ? '#9333ea' : '#e11d48';
          ctx.fillRect(sx - 4, sy - 4, 8, 6);
          ctx.fillStyle = '#090514';
          ctx.fillRect(sx - 3, sy - 2, 2, 2);
          ctx.fillRect(sx + 1, sy - 2, 2, 2);
        }
      } else if (isChrono) {
        // ZEPHYROS: Ticking Golden-Teal Hourglass Sand Grains around his levitating Astrolabe
        ctx.globalAlpha = 0.88;
        for (let g = 0; g < 4; g++) {
          const ga = t * 5.2 + (g * Math.PI) / 2;
          const gx = Math.round((f.x + f.facing * 42 + Math.cos(ga) * 18) / 2) * 2;
          const gy = Math.round((f.y - 102 + Math.sin(ga) * 18) / 2) * 2;
          ctx.fillStyle = g % 2 === 0 ? '#eab308' : '#14b8a6';
          ctx.fillRect(gx - 2, gy - 2, 4, 4);
        }
      } else {
        // IGNIS SOL: 3 Orbiting Miniature Solar Fire-Orbs Circling His Arcane Robes
        ctx.globalAlpha = 0.90;
        for (let orb = 0; orb < 3; orb++) {
          const oa = t * 3.4 + (orb * Math.PI * 2) / 3;
          const ox = Math.round((f.x + Math.cos(oa) * 48) / 3) * 3;
          const oy = Math.round((f.y - 74 + Math.sin(oa) * 16) / 3) * 3;
          ctx.fillStyle = '#c2410c';
          ctx.fillRect(ox - 5, oy - 5, 10, 10);
          ctx.fillStyle = '#f97316';
          ctx.fillRect(ox - 3, oy - 3, 6, 6);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(ox - 1, oy - 1, 2, 2);
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
        { xTop: ww * 0.5 - 60, xBot: ww * 0.5 - 240, w: 130, col: 'rgba(234, 179, 8, 0.045)' },
        { xTop: ww * 0.5 + 20, xBot: ww * 0.5 - 70, w: 165, col: 'rgba(249, 115, 22, 0.055)' },
        { xTop: ww * 0.5 + 95, xBot: ww * 0.5 + 140, w: 120, col: 'rgba(14, 165, 233, 0.045)' }
      ],
      sylvan: [
        { xTop: ww * 0.5 - 70, xBot: ww * 0.5 - 250, w: 140, col: 'rgba(16, 185, 129, 0.05)' },
        { xTop: ww * 0.5 + 10, xBot: ww * 0.5 - 60, w: 170, col: 'rgba(14, 165, 233, 0.05)' },
        { xTop: ww * 0.5 + 90, xBot: ww * 0.5 + 150, w: 130, col: 'rgba(52, 211, 153, 0.045)' }
      ],
      boneyard: [
        { xTop: ww * 0.5 - 65, xBot: ww * 0.5 - 235, w: 135, col: 'rgba(147, 51, 234, 0.055)' },
        { xTop: ww * 0.5 + 15, xBot: ww * 0.5 - 65, w: 165, col: 'rgba(225, 29, 72, 0.05)' },
        { xTop: ww * 0.5 + 95, xBot: ww * 0.5 + 145, w: 125, col: 'rgba(168, 85, 247, 0.05)' }
      ],
      clocktower: [
        { xTop: ww * 0.5 - 60, xBot: ww * 0.5 - 240, w: 130, col: 'rgba(20, 184, 166, 0.05)' },
        { xTop: ww * 0.5 + 20, xBot: ww * 0.5 - 70, w: 165, col: 'rgba(234, 179, 8, 0.055)' },
        { xTop: ww * 0.5 + 95, xBot: ww * 0.5 + 140, w: 120, col: 'rgba(45, 212, 191, 0.045)' }
      ]
    };

    const rays = rayPalettes[this.stageId] || rayPalettes.cathedral;
    for (const r of rays) {
      const sway = Math.sin(this.time * 0.9 + r.xTop) * 18;
      ctx.fillStyle = r.col;
      ctx.beginPath();
      ctx.moveTo(r.xTop, gy - 560);
      ctx.lineTo(r.xTop + r.w * 0.6, gy - 560);
      ctx.lineTo(r.xBot + r.w + sway, gy + 40);
      ctx.lineTo(r.xBot + sway, gy + 40);
      ctx.closePath();
      ctx.fill();
    }

    const moteColors =
      this.stageId === 'sylvan'
        ? ['#10b981', '#38bdf8']
        : this.stageId === 'boneyard'
          ? ['#a855f7', '#e11d48']
          : this.stageId === 'clocktower'
            ? ['#14b8a6', '#eab308']
            : ['#0ea5e9', '#f59e0b'];

    for (const m of this.motes) {
      const my = gy + 20 - ((m.y + this.time * m.spdY) % 520);
      const mx = m.x + Math.sin(this.time * 1.4 + m.phase) * 22;
      const alpha = 0.42 + 0.38 * Math.sin(this.time * 3 + m.phase);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = m.isBlue ? moteColors[0] : moteColors[1];
      const s = m.size;
      ctx.fillRect(Math.round(mx / 2) * 2, Math.round(my / 2) * 2, s, s);
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
