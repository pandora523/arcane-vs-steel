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

    // 1. HD-2D Pixel-Art Cathedral Diorama + Live Animated Stage Flames & Volumetric God-Rays
    this.drawHD2DArena(ctx, ww, gy);
    this.drawVolumetricGodRays(ctx, ww, gy);

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

    // 7. Foreground Ultimate Attack Pass: Ultimate Attacks blaze IN FRONT of the characters!
    for (const f of sorted) {
      if (typeof f.drawUltimateForeground === 'function') {
        f.drawUltimateForeground(ctx, this);
      }
    }
    vfx.renderMainPass(ctx, false, this, true);

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

    // Counter-rotating dual pixel solar corona rings & radial prominence flares on the Rose Window
    ctx.save();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + t * 0.65;
      const flare = Math.sin(t * 9.5 + i * 1.7) * 8;
      const r = eclipseR + flare + (i % 3 === 0 ? 8 : 0);
      const fx = Math.round((eclipseX + Math.cos(a) * r) / 4) * 4;
      const fy = Math.round((eclipseY + Math.sin(a) * r) / 4) * 4;
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? SOLAR_FIRE_PAL[3] : SOLAR_FIRE_PAL[2];
      ctx.fillRect(fx - 2, fy - 2, i % 3 === 0 ? 6 : 4, i % 3 === 0 ? 6 : 4);
    }
    // Outer orbiting golden cathedral astrolabe sparks around the Rose Window
    for (let j = 0; j < 18; j++) {
      const a2 = -(j / 18) * Math.PI * 2 - t * 0.38;
      const r2 = eclipseR + 36 + Math.sin(t * 5 + j) * 6;
      const ox = Math.round((eclipseX + Math.cos(a2) * r2) / 4) * 4;
      const oy = Math.round((eclipseY + Math.sin(a2) * r2) / 4) * 4;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 6 + j);
      ctx.fillStyle = j % 2 === 0 ? '#fde047' : '#fb923c';
      ctx.fillRect(ox - 2, oy - 2, 4, 4);
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

    // 4. Drifting Dual-Elemental (Frost-Cyan vs Solar-Gold) Sanctuary Floor Rune Ring & Rising Censer Sparks
    ctx.save();
    const altarCx = drawX + drawW * 0.50;
    const altarCy = gy + 16;
    for (let r = 0; r < 24; r++) {
      const ra = (r / 24) * Math.PI * 2 + t * 0.42;
      const rx = Math.round((altarCx + Math.cos(ra) * 250) / 4) * 4;
      const ry = Math.round((altarCy + Math.sin(ra) * 26) / 4) * 4;
      const isLeft = Math.cos(ra) < 0;
      const col = isLeft ? '#38bdf8' : '#fb923c';
      const gTex = isLeft ? this.glowCyan : this.glowOrange;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.28 + 0.18 * Math.sin(t * 5 + r);
      ctx.drawImage(gTex, rx - 16, ry - 16, 32, 32);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.65 + 0.30 * Math.sin(t * 5 + r);
      ctx.fillStyle = col;
      ctx.fillRect(rx - 3, ry - 2, 6, 4);
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
      ctx.globalAlpha = (0.22 + 0.08 * Math.sin(t * 3 + band)) * (1 - Math.abs(u - 0.5) * 1.3);
      ctx.fillStyle = col;
      ctx.fillRect(ax, ay, 16, ah);
      ctx.globalAlpha *= 1.5;
      ctx.fillRect(ax, ay + ah - 12, 16, 8);
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

    // 1. Colossal Glowing Crescent Moon Corona & Orbiting Astral Starlight Motes
    const moonX = drawX + drawW * 0.50;
    const moonY = drawY + drawH * 0.25;
    const moonR = 98;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.38 + 0.10 * Math.sin(t * 3.2);
    ctx.drawImage(this.glowEmerald, moonX - 270, moonY - 270, 540, 540);
    ctx.globalAlpha = 0.30 + 0.08 * Math.cos(t * 2.5);
    ctx.drawImage(this.glowCyan, moonX - 210, moonY - 210, 420, 420);
    ctx.restore();

    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + t * 0.48;
      const r = moonR + Math.sin(t * 6.5 + i * 1.9) * 10;
      const fx = Math.round((moonX + Math.cos(a) * r) / 4) * 4;
      const fy = Math.round((moonY + Math.sin(a) * r) / 4) * 4;
      ctx.fillStyle = i % 4 === 0 ? '#fef9c3' : i % 2 === 0 ? '#34d399' : '#38bdf8';
      ctx.fillRect(fx - 2, fy - 2, i % 4 === 0 ? 6 : 4, i % 4 === 0 ? 6 : 4);
    }

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
        ctx.fillStyle = e % 3 === 0 ? '#fde047' : life < 0.45 ? pal[3] : pal[1];
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      }
      ctx.restore();
    }

    // 4. Drifting Wind-Swept Luminous Sylvan Blossom Petals & Glowing Floor Rune Ring
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

    const runeCx = drawX + drawW * 0.50;
    const runeCy = gy + 16;
    for (let r = 0; r < 24; r++) {
      const ra = (r / 24) * Math.PI * 2 + t * 0.38;
      const rx = Math.round((runeCx + Math.cos(ra) * 245) / 4) * 4;
      const ry = Math.round((runeCy + Math.sin(ra) * 26) / 4) * 4;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 4.5 + r);
      ctx.fillStyle = r % 2 === 0 ? '#34d399' : '#38bdf8';
      ctx.fillRect(rx - 3, ry - 2, 6, 4);
    }
    ctx.restore();
  }

  drawBoneyardStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy) {
    const t = this.time;

    // 0. Periodic Forked Crimson-Violet Blood-Moon Sky Lightning Bolts Behind the Gothic Spires!
    const boltCycle = (t * 0.55) % 1;
    if (boltCycle < 0.18) {
      const boltFade = 1 - boltCycle / 0.18;
      const boltSide = Math.floor(t * 0.55) % 2 === 0 ? 0.31 : 0.69;
      let bx = drawX + drawW * boltSide;
      let by = drawY + drawH * 0.06;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = boltFade * 0.35;
      ctx.drawImage(this.glowViolet, bx - 180, by - 40, 360, 360);
      for (let seg = 0; seg < 14; seg++) {
        const nx = bx + Math.sin(seg * 2.7 + t * 30) * 18;
        const ny = by + 22;
        const sx = Math.round(bx / 4) * 4;
        const sy = Math.round(by / 4) * 4;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = boltFade * 0.55;
        ctx.fillStyle = seg % 2 === 0 ? '#e11d48' : '#c084fc';
        ctx.fillRect(sx - 6, sy - 4, 12, 24);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = boltFade * 0.95;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 2, sy - 2, 4, 22);
        bx = nx;
        by = ny;
      }
      ctx.restore();
    }

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

    // 2. Colossal Blood-Crimson & Royal-Purple Eclipse Moon Corona (cx: 0.50, cy: 0.24)
    const moonX = drawX + drawW * 0.50;
    const moonY = drawY + drawH * 0.24;
    const moonR = 98;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.42 + 0.10 * Math.sin(t * 3.8);
    ctx.drawImage(this.glowViolet, moonX - 270, moonY - 270, 540, 540);
    ctx.restore();

    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 - t * 0.58;
      const flare = Math.sin(t * 8.5 + i * 1.5) * 9;
      const r = moonR + flare;
      const fx = Math.round((moonX + Math.cos(a) * r) / 4) * 4;
      const fy = Math.round((moonY + Math.sin(a) * r) / 4) * 4;
      ctx.fillStyle = i % 4 === 0 ? '#fecdd3' : i % 3 === 0 ? '#e11d48' : i % 2 === 0 ? '#c084fc' : '#7e22ce';
      ctx.fillRect(fx - 2, fy - 2, i % 4 === 0 ? 6 : 5, i % 4 === 0 ? 6 : 5);
    }

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

    // 1. Central Astronomical Stained-Glass Clock Dial with 3 Counter-Rotating Astrolabe Rings & Live Clock Hands
    const clockX = drawX + drawW * 0.50;
    const clockY = drawY + drawH * 0.31;
    const clockR = 102;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.40 + 0.10 * Math.sin(t * 3.6);
    ctx.drawImage(this.glowTeal, clockX - 270, clockY - 270, 540, 540);
    ctx.globalAlpha = 0.30 + 0.08 * Math.cos(t * 2.8);
    ctx.drawImage(this.glowGold, clockX - 210, clockY - 210, 420, 420);
    ctx.restore();

    // Outer & Inner Counter-Rotating Escapement Gear Rings & Celestial Numeral Nodes
    ctx.save();
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2 + t * 0.45;
      const gx = Math.round((clockX + Math.cos(a) * clockR) / 4) * 4;
      const gy2 = Math.round((clockY + Math.sin(a) * clockR) / 4) * 4;
      ctx.fillStyle = i % 4 === 0 ? '#fef9c3' : i % 2 === 0 ? '#fde047' : '#2dd4bf';
      ctx.fillRect(gx - 3, gy2 - 3, i % 4 === 0 ? 8 : 6, i % 4 === 0 ? 8 : 6);
    }
    for (let j = 0; j < 20; j++) {
      const a2 = -(j / 20) * Math.PI * 2 - t * 0.72;
      const r2 = 66;
      const gx2 = Math.round((clockX + Math.cos(a2) * r2) / 4) * 4;
      const gy3 = Math.round((clockY + Math.sin(a2) * r2) / 4) * 4;
      ctx.fillStyle = j % 2 === 0 ? '#2dd4bf' : '#facc15';
      ctx.fillRect(gx2 - 2, gy3 - 2, 4, 4);
    }

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

    // 3. Crackling Pixel Aether-Lightning Arcs Jumping Between the Side Bronze Gears & Central Clock Dial!
    ctx.save();
    for (let side = -1; side <= 1; side += 2) {
      const gearCx = drawX + drawW * (side < 0 ? 0.14 : 0.86);
      const gearCy = drawY + drawH * 0.56;
      for (let k = 0; k < 10; k++) {
        const ka = t * 3.8 * side + (k * Math.PI * 2) / 10;
        const kx = Math.round((gearCx + Math.cos(ka) * 62) / 4) * 4;
        const ky = Math.round((gearCy + Math.sin(ka) * 62) / 4) * 4;
        ctx.fillStyle = k % 2 === 0 ? '#2dd4bf' : '#fde047';
        ctx.fillRect(kx - 3, ky - 3, 6, 6);
      }
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

    // Illuminated Golden-Teal Floor Astrolabe Ring & Rising Anti-Gravity Sand Streams
    const floorCx = drawX + drawW * 0.50;
    const floorCy = gy + 18;
    for (let n = 0; n < 26; n++) {
      const na = (n / 26) * Math.PI * 2 - t * 0.48;
      const nx = Math.round((floorCx + Math.cos(na) * 260) / 4) * 4;
      const ny = Math.round((floorCy + Math.sin(na) * 28) / 4) * 4;
      ctx.globalAlpha = 0.6 + 0.35 * Math.sin(t * 5 + n);
      ctx.fillStyle = n % 2 === 0 ? '#fde047' : '#2dd4bf';
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
    const glowTex = this.getGlowForColor(f.primaryColor);
    const t = this.time;
    const isAction = f.state === 'SKILL' || f.state === 'ULTIMATE' || f.state === 'AUTO_ATTACK';
    const rX = isAction ? 66 : 48;
    const rY = isAction ? 17 : 12;
    const nodes = isChrono ? 12 : isAction ? 20 : 14;

    ctx.save();
    const gy = f.groundY || this.groundY;

    for (let i = 0; i < nodes; i++) {
      const a = (i / nodes) * Math.PI * 2 + t * (isAction ? 3.6 : 1.6) * f.facing;
      const rx = Math.round((f.x + Math.cos(a) * rX) / 3) * 3;
      const ry = Math.round((gy - 2 + Math.sin(a) * rY) / 3) * 3;
      if (glowTex && i % 2 === 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = isAction ? 0.34 : 0.24;
        ctx.drawImage(glowTex, rx - 18, ry - 12, 36, 24);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = isAction ? 0.92 : 0.72;
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
