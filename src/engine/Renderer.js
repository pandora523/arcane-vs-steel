import { PixelForge } from './PixelForge.js';

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
    this.ultDim = 0;
    this.ultZoomTimer = 0;
    this.camX = this.worldWidth * 0.5;
    this.camY = this.groundY - 90;
    this.zoom = 1;
    this.time = 0;

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
      g.addColorStop(0.45, rgbaMid);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      gCtx.fillStyle = g;
      gCtx.fillRect(0, 0, 128, 128);
      return c;
    };
    this.glowCyan = makeGlow('rgba(186,230,253,0.9)', 'rgba(56,189,248,0.4)');
    this.glowOrange = makeGlow('rgba(254,240,138,0.95)', 'rgba(251,146,60,0.45)');
    this.glowGold = makeGlow('rgba(254,240,138,0.9)', 'rgba(234,179,8,0.4)');
    this.shadowTex = makeGlow('rgba(0,0,0,0.8)', 'rgba(0,0,0,0.38)');
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

  triggerHitStop() {}

  triggerUltimateCamera(focusX, focusY) {
    this.ultFocusX = focusX;
    this.ultFocusY = focusY;
    this.ultZoomTimer = 0.8;
    this.ultDim = 0.75;
  }

  update(rawDt, fighters) {
    this.time += rawDt;
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - rawDt);
      if (this.shakeTime === 0) this.shakeIntensity = 0;
    }
    if (this.aberration > 0) this.aberration = Math.max(0, this.aberration - rawDt * 28);
    if (this.ultDim > 0) this.ultDim = Math.max(0, this.ultDim - rawDt * 0.7);
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

    ctx.fillStyle = '#04060b';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();

    const sx = this.shakeTime > 0 ? (Math.random() - 0.5) * 2 * this.shakeIntensity : 0;
    const sy = this.shakeTime > 0 ? (Math.random() - 0.5) * 2 * this.shakeIntensity : 0;

    const screenAnchorY = this.height * (this.isMobile ? 0.64 : 0.68);
    ctx.translate(this.width * 0.5 + sx, screenAnchorY + sy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // 1. Hand-Painted Gothic Cathedral Arena Stage
    this.drawArenaBackground(ctx, ww, gy);

    if (this.ultDim > 0.01) {
      ctx.fillStyle = `rgba(2, 3, 8, ${this.ultDim * 0.78})`;
      ctx.fillRect(-600, -800, ww + 1200, 2000);
    }

    // 2. Ground Scorch & Fissures
    vfx.renderGroundDecals(ctx, gy);

    // 3. Real-Time Floor Reflections Pass
    ctx.save();
    ctx.beginPath();
    ctx.rect(-600, gy, ww + 1200, 700);
    ctx.clip();

    ctx.translate(0, gy * 2);
    ctx.scale(1, -0.42);
    ctx.globalAlpha = 0.24;

    for (const f of fighters) f.draw(ctx, true);
    vfx.renderMainPass(ctx, true, this);
    ctx.restore();

    // 4. Dynamic Ground Light Pools & Drop Shadows
    const lights = vfx.getActiveLights(fighters, gy);
    this.drawFloorLightPools(ctx, lights, gy);
    this.drawDynamicShadows(ctx, fighters, lights, gy);

    // 5. Main Pass: Fighters & Particles
    const sorted = [...fighters].sort((a, b) => a.y - b.y);
    for (const f of sorted) f.draw(ctx, false);
    vfx.renderMainPass(ctx, false, this);

    // 6. Floating Combat Text
    vfx.renderFloatingTexts(ctx);

    ctx.restore();
  }

  drawArenaBackground(ctx, ww, gy) {
    const assets = PixelForge.initAssets();
    const bg = assets.arenaBg;

    if (bg && bg.complete && bg.naturalWidth > 0) {
      // Align painted stage floor (at ~76% of image height) with gy
      const drawW = 1680;
      const drawH = 945;
      const drawX = (ww - drawW) * 0.5;
      const drawY = gy - drawH * 0.77;
      ctx.drawImage(bg, drawX, drawY, drawW, drawH);

      // Animated flickering brazier light blooms over the painted braziers
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const f1 = Math.sin(this.time * 7) * 12;
      const f2 = Math.cos(this.time * 8.5) * 12;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(this.glowCyan, 40 - f1, gy - 320, 240 + f1 * 2, 240 + f1 * 2);
      ctx.drawImage(this.glowCyan, 240 - f2, gy - 260, 190 + f2 * 2, 190 + f2 * 2);
      ctx.drawImage(this.glowOrange, ww - 280 - f2, gy - 320, 240 + f2 * 2, 240 + f2 * 2);
      ctx.drawImage(this.glowOrange, ww - 430 - f1, gy - 260, 190 + f1 * 2, 190 + f1 * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#070c18';
      ctx.fillRect(-600, -700, ww + 1200, gy + 1400);
    }
  }

  drawFloorLightPools(ctx, lights, gy) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const distY = Math.max(0, gy - l.y);
      const atten = Math.max(0, 1 - distY / 360);
      if (atten <= 0.02) continue;
      const rx = l.radius * (1 + distY * 0.002);
      const ry = rx * 0.24;
      const tex = l.isBlue ? this.glowCyan : this.glowOrange;
      ctx.globalAlpha = Math.min(0.65, 0.42 * atten * l.intensity);
      ctx.drawImage(tex, l.x - rx, gy + 4 - ry, rx * 2, ry * 2);
    }
    ctx.restore();
  }

  drawDynamicShadows(ctx, fighters, lights, gy) {
    for (const f of fighters) {
      const jumpH = Math.max(0, gy - f.y);
      const scale = Math.max(0.25, 1 - jumpH / 320);
      let shiftX = 0;
      for (const l of lights) {
        const dx = f.x - l.x;
        const dist = Math.hypot(dx, f.y - l.y) + 1;
        if (dist < 380) shiftX += (dx / dist) * (1 - dist / 380) * 24 * l.intensity;
      }
      shiftX = Math.max(-35, Math.min(35, shiftX));
      const rx = 56 * scale;
      const ry = 15 * scale;
      ctx.drawImage(this.shadowTex, f.x + shiftX - rx, gy + 2 - ry, rx * 2, ry * 2);
    }
  }
}
