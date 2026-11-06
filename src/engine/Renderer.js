import { PixelForge } from './PixelForge.js';

const CYAN_FIRE_PAL = ['#0284c7', '#38bdf8', '#7dd3fc', '#f0f9ff'];
const SOLAR_FIRE_PAL = ['#c2410c', '#f97316', '#facc15', '#fef9c3'];

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

    this.motes = Array.from({ length: 36 }, (_, i) => ({
      x: (i * 137) % 1300 - 50,
      y: (i * 89) % 520 + 20,
      spdY: 10 + (i % 5) * 4,
      phase: i * 0.7,
      size: i % 3 === 0 ? 4 : 3,
      isBlue: i % 2 === 0
    }));

    this.bakeLightTextures();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  bakeLightTextures() {
    const makeGlow = (rgbaCenter, rgbaMid) => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const gCtx = c.getContext('2d');
      const g = gCtx.createRadialGradient(64, 64, 2, 64, 64, 64);
      g.addColorStop(0, rgbaCenter);
      g.addColorStop(0.42, rgbaMid);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      gCtx.fillStyle = g;
      gCtx.fillRect(0, 0, 128, 128);
      return c;
    };
    this.glowCyan = makeGlow('rgba(186,230,253,0.95)', 'rgba(56,189,248,0.45)');
    this.glowOrange = makeGlow('rgba(254,240,138,0.96)', 'rgba(251,146,60,0.48)');
    this.glowGold = makeGlow('rgba(254,240,138,0.92)', 'rgba(234,179,8,0.40)');
    this.shadowTex = makeGlow('rgba(0,0,0,0.92)', 'rgba(0,0,0,0.52)');
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isMobile = this.width < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.35 : 1.85);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  triggerShake(intensity = 10, duration = 0.25) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  triggerAberration(amount = 8) {
    if (!this.isMobile) this.aberration = Math.max(this.aberration, amount);
  }

  triggerHitStop(duration = 0.07) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  triggerUltimateCamera(focusX, focusY) {
    this.ultFocusX = focusX;
    this.ultFocusY = focusY;
    this.ultZoomTimer = 0.95;
    this.ultDim = 0.78;
  }

  update(rawDt, fighters) {
    this.time += rawDt;
    if (this.hitStopTimer > 0) this.hitStopTimer = Math.max(0, this.hitStopTimer - rawDt);
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - rawDt);
      if (this.shakeTime === 0) this.shakeIntensity = 0;
    }
    if (this.aberration > 0) this.aberration = Math.max(0, this.aberration - rawDt * 28);
    if (this.ultDim > 0) this.ultDim = Math.max(0, this.ultDim - rawDt * 0.65);
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
        targetZoom *= 1.15;
        targetX = this.ultFocusX;
        targetY = this.ultFocusY;
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

      this.zoom += (targetZoom - this.zoom) * Math.min(1, rawDt * 8);
      this.camX += (targetX - this.camX) * Math.min(1, rawDt * 9);
      this.camY += (targetY - this.camY) * Math.min(1, rawDt * 9);
    }
  }

  render(fighters, vfx) {
    const ctx = this.ctx;
    const ww = this.worldWidth;
    const gy = this.groundY;

    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();

    const sx = this.shakeTime > 0 ? Math.round((Math.random() - 0.5) * 2 * this.shakeIntensity) : 0;
    const sy = this.shakeTime > 0 ? Math.round((Math.random() - 0.5) * 2 * this.shakeIntensity) : 0;

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
    for (const f of fighters) f.draw(ctx, true);
    vfx.renderMainPass(ctx, true, this);
    ctx.restore();

    // 4. Unreal HD-2D Dynamic Point-Light Floor Pools & Grounded Contact Shadows
    const lights = vfx.getActiveLights(fighters, gy);
    this.drawFloorLightPools(ctx, lights, gy);
    this.drawDynamicShadows(ctx, fighters, lights, gy);

    // 5. Main Pass: Fighters + Live Pixel-Art Weapon Fire/Rune Glow
    const sorted = [...fighters].sort((a, b) => a.y - b.y);
    for (const f of sorted) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const deathFade = f.isDead ? Math.max(0.08, 1 - (f.deathTimer || 0) * 0.65) : 1;
      ctx.globalAlpha = (f.state === 'IDLE' || f.state === 'WALK' ? 0.25 : 0.48) * deathFade;
      const glow = f.primaryColor === '#38bdf8' ? this.glowCyan : this.glowOrange;
      ctx.drawImage(glow, f.x - 125, f.y - (f.isDead ? 115 : 190), 250, 250);
      ctx.restore();

      f.draw(ctx, false);
      this.drawCharacterPixelFlames(ctx, f);
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
    const bg = assets.arenaBg;
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

      // Main Cathedral Nave
      ctx.drawImage(bg, drawX, drawY, drawW, drawH);
    } else {
      ctx.fillStyle = '#070a14';
      ctx.fillRect(-1200, -700, ww + 2400, gy + 1400);
    }

    // Subtle Pixel-Stepped Obsidian Flagstone Seams & Specular Trim
    for (let r = 0; r < 5; r++) {
      const ry = Math.round((gy - 22 + r * r * 12) / 3) * 3;
      ctx.fillStyle = r === 1 ? 'rgba(148, 174, 212, 0.11)' : 'rgba(8, 11, 20, 0.34)';
      ctx.fillRect(-800, ry, ww + 1600, 3);
    }

    // Live Animated HD-2D Flames on all 6 Cathedral Braziers & Eclipse Rose Window
    this.drawStagePixelFlames(ctx, bg, drawX, drawY, drawW, drawH, gy);
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
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 11 + b.seed);
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

      // 2. Volumetric Additive Point-Light Halo & Wet Stone Floor Reflection Pool
      const pulse = Math.sin(t * 7.5 + b.seed) * 14 * b.scale;
      const glowR = 125 * b.scale + pulse;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.42;
      ctx.drawImage(glow, worldCx - glowR, worldMidY - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 0.26;
      ctx.drawImage(glow, worldCx - glowR * 0.68, gy - 24, glowR * 1.36, 90 * b.scale);

      // 3. Crisp Dancing Pixel Embers & Tongues Detaching from the Flame Crest
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
    ctx.globalAlpha = 0.36 + 0.08 * Math.sin(t * 4);
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

  drawCharacterPixelFlames(ctx, f) {
    if (f.isDead && (f.deathTimer || 0) > 0.9) return;
    const isBlue = f.primaryColor === '#38bdf8';
    const pal = isBlue ? CYAN_FIRE_PAL : SOLAR_FIRE_PAL;
    const t = this.time;

    ctx.save();
    // Emit live pixel-art fire / rune sparks along the weapon & aura
    const count = f.isDead ? 3 : f.state === 'IDLE' || f.state === 'WALK' ? 5 : 10;
    const fallDrop = f.isDead ? Math.min(48, (f.deathTimer || 0) * 55) : 0;
    for (let i = 0; i < count; i++) {
      const cycle = (t * (1.8 + (i % 3) * 0.4) + i * 0.62) % 1;
      const spreadX = isBlue
        ? f.facing * (18 + (i % 4) * 14) + Math.sin(t * 8 + i) * 6
        : f.facing * (22 + (i % 4) * 12) + Math.cos(t * 7 + i) * 8;
      const baseY = (isBlue ? f.y - 68 - (i % 4) * 16 : f.y - 82 - (i % 3) * 14) + fallDrop;
      const px = Math.round((f.x + spreadX) / 3) * 3;
      const py = Math.round((baseY - cycle * 34) / 3) * 3;
      const sz = cycle < 0.45 ? 4 : 3;
      ctx.fillStyle = cycle < 0.3 ? pal[3] : cycle < 0.7 ? pal[2] : pal[1];
      ctx.fillRect(px, py, sz, sz);
    }
    ctx.restore();
  }

  drawVolumetricGodRays(ctx, ww, gy) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const rays = [
      { xTop: ww * 0.5 - 60, xBot: ww * 0.5 - 240, w: 130, col: 'rgba(254, 240, 138, 0.055)' },
      { xTop: ww * 0.5 + 20, xBot: ww * 0.5 - 70, w: 165, col: 'rgba(251, 191, 36, 0.065)' },
      { xTop: ww * 0.5 + 95, xBot: ww * 0.5 + 140, w: 120, col: 'rgba(56, 189, 248, 0.05)' }
    ];
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

    for (const m of this.motes) {
      const my = gy + 20 - ((m.y + this.time * m.spdY) % 520);
      const mx = m.x + Math.sin(this.time * 1.4 + m.phase) * 22;
      const alpha = 0.38 + 0.38 * Math.sin(this.time * 3 + m.phase);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = m.isBlue ? '#7dd3fc' : '#fde047';
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
      const tex = l.isBlue ? this.glowCyan : this.glowOrange;
      ctx.globalAlpha = Math.min(0.72, 0.48 * atten * l.intensity);
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
