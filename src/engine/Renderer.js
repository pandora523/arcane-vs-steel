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
      targetZoom = Math.max(0.42, Math.min(this.isMobile ? 0.85 : 1.15, targetZoom));

      let targetX = midX;
      let targetY = this.groundY - 95;

      if (this.ultZoomTimer > 0) {
        targetZoom *= 1.15;
        targetX = this.ultFocusX;
        targetY = this.ultFocusY;
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

    // 1. HD-2D Pixel-Art Cathedral Diorama + Live Glowing Pixel-Art Stage Flames
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

    // 8. Screen-Space Unreal HD-2D Tilt-Shift DoF Vignette & Foreground Silhouette Pillars
    this.drawHD2DPostProcess(ctx);
  }

  drawHD2DArena(ctx, ww, gy) {
    const assets = PixelForge.initAssets();
    const bg = assets.arenaBg;
    const drawW = 1680;
    const drawH = 945;
    const drawX = Math.round((ww - drawW) * 0.5);
    // Align floor surface so gy is firmly on the stone flagstones (not floating near the back wall)
    const drawY = Math.round(gy - drawH * 0.82);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (bg && bg.complete && bg.naturalWidth > 0) {
      ctx.drawImage(bg, drawX, drawY, drawW, drawH);
    } else {
      ctx.fillStyle = '#070a14';
      ctx.fillRect(-600, -700, ww + 1200, gy + 1400);
    }

    // Subtle Pixel-Stepped Obsidian Flagstone Seams & Specular Trim
    for (let r = 0; r < 5; r++) {
      const ry = Math.round((gy - 22 + r * r * 12) / 3) * 3;
      ctx.fillStyle = r === 1 ? 'rgba(148, 174, 212, 0.11)' : 'rgba(8, 11, 20, 0.34)';
      ctx.fillRect(-300, ry, ww + 600, 3);
    }

    // Live Animated Glowing Pixel-Art Flames on all 6 Cathedral Braziers & Eclipse Rose Window
    this.drawStagePixelFlames(ctx, drawX, drawY, drawW, drawH, gy);
    ctx.restore();
  }

  drawStagePixelFlames(ctx, drawX, drawY, drawW, drawH, gy) {
    const braziers = [
      { x: drawX + drawW * 0.105, y: drawY + drawH * 0.585, scale: 1.35, isBlue: true, seed: 1.1 },
      { x: drawX + drawW * 0.233, y: drawY + drawH * 0.635, scale: 1.05, isBlue: true, seed: 2.7 },
      { x: drawX + drawW * 0.314, y: drawY + drawH * 0.665, scale: 0.82, isBlue: true, seed: 4.3 },
      { x: drawX + drawW * 0.697, y: drawY + drawH * 0.665, scale: 0.82, isBlue: false, seed: 5.9 },
      { x: drawX + drawW * 0.778, y: drawY + drawH * 0.635, scale: 1.05, isBlue: false, seed: 7.4 },
      { x: drawX + drawW * 0.908, y: drawY + drawH * 0.585, scale: 1.35, isBlue: false, seed: 9.0 }
    ];

    const t = this.time;

    for (const b of braziers) {
      const pal = b.isBlue ? CYAN_FIRE_PAL : SOLAR_FIRE_PAL;
      const glow = b.isBlue ? this.glowCyan : this.glowOrange;
      const pulse = Math.sin(t * 8 + b.seed) * 14 * b.scale;
      const glowR = 135 * b.scale + pulse;

      // 1. Volumetric Additive Halo around Brazier & Wet Floor Reflection Glow
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.52;
      ctx.drawImage(glow, b.x - glowR, b.y - glowR * 1.15, glowR * 2, glowR * 2);
      ctx.globalAlpha = 0.28;
      ctx.drawImage(glow, b.x - glowR * 0.7, gy - 25, glowR * 1.4, 95 * b.scale);
      ctx.restore();

      // 2. Crisp Pixel-Art Animated Fire Column (4px integer pixel blocks)
      const pxSize = Math.max(4, Math.round(5 * b.scale));
      const rows = 14;
      for (let r = 0; r < rows; r++) {
        const ratio = r / (rows - 1); // 0 = base bowl, 1 = high tip
        const halfW = Math.max(1, Math.round((1 - ratio * 0.82) * 5 * b.scale));
        const sway = Math.round(Math.sin(t * 11 - r * 0.65 + b.seed) * (ratio * 3.2 * b.scale));
        const py = Math.round((b.y - r * pxSize * 0.95) / pxSize) * pxSize;

        for (let c = -halfW; c <= halfW; c++) {
          const edgeRatio = Math.abs(c) / (halfW + 0.5);
          // Flicker cutout near top and edges for authentic jagged pixel flame silhouette
          const noise = Math.sin(t * 16 + r * 1.9 + c * 2.3 + b.seed);
          if (ratio > 0.65 && noise < -0.15) continue;
          if (edgeRatio > 0.75 && noise < 0.1) continue;

          const shadeIdx =
            ratio < 0.28 && edgeRatio < 0.45
              ? 3
              : edgeRatio < 0.42 && ratio < 0.65
                ? 2
                : edgeRatio < 0.78
                  ? 1
                  : 0;
          ctx.fillStyle = pal[shadeIdx];
          const px = Math.round((b.x + (c + sway) * pxSize) / pxSize) * pxSize;
          ctx.fillRect(px, py, pxSize, pxSize);
        }
      }

      // 3. Rising Pixel Sparks detaching from Brazier Flame Tip
      for (let s = 0; s < 4; s++) {
        const sparkLife = (t * (1.4 + s * 0.25) + b.seed + s * 1.7) % 1;
        const sx = b.x + Math.sin(t * 6 + s * 2.1 + b.seed) * 22 * b.scale;
        const sy = b.y - 55 * b.scale - sparkLife * 75 * b.scale;
        const spSize = sparkLife < 0.5 ? pxSize : Math.max(2, pxSize >> 1);
        ctx.fillStyle = sparkLife < 0.35 ? pal[3] : sparkLife < 0.7 ? pal[2] : pal[1];
        ctx.fillRect(Math.round(sx / 2) * 2, Math.round(sy / 2) * 2, spSize, spSize);
      }
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

    const pShift = (this.camX - this.worldWidth * 0.5) * 0.18;
    const pilW = this.isMobile ? 22 : 52;
    const leftX = Math.round(-10 - pShift * 0.3);
    const rightX = Math.round(w - pilW + 10 - pShift * 0.3);

    // Foreground HD-2D Parallax Gothic Columns with Pixel Rim-Lighting
    ctx.fillStyle = 'rgba(4, 6, 12, 0.92)';
    ctx.fillRect(leftX, 0, pilW, h);
    ctx.fillRect(rightX, 0, pilW + 20, h);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.fillRect(leftX + pilW - 4, 0, 4, h);
    ctx.fillStyle = 'rgba(251, 146, 60, 0.14)';
    ctx.fillRect(rightX, 0, 4, h);

    for (let y = 24; y < h; y += 48) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.fillRect(leftX + pilW - 12, y, 8, 4);
      ctx.fillRect(rightX + 4, y, 8, 4);
    }

    const topG = ctx.createLinearGradient(0, 0, 0, h * 0.22);
    topG.addColorStop(0, 'rgba(2, 3, 7, 0.78)');
    topG.addColorStop(1, 'rgba(2, 3, 7, 0)');
    ctx.fillStyle = topG;
    ctx.fillRect(0, 0, w, h * 0.22);

    const botG = ctx.createLinearGradient(0, h * 0.78, 0, h);
    botG.addColorStop(0, 'rgba(2, 3, 7, 0)');
    botG.addColorStop(1, 'rgba(2, 3, 7, 0.85)');
    ctx.fillStyle = botG;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);

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
