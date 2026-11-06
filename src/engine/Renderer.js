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

    // Pre-generate floating HD-2D volumetric dust motes / bokeh
    this.motes = Array.from({ length: 34 }, (_, i) => ({
      x: (i * 137) % 1300 - 50,
      y: (i * 89) % 520 + 20,
      spdY: 8 + (i % 5) * 4,
      phase: i * 0.7,
      size: i % 4 === 0 ? 4 : 2,
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
    this.glowCyan = makeGlow('rgba(186,230,253,0.92)', 'rgba(56,189,248,0.42)');
    this.glowOrange = makeGlow('rgba(254,240,138,0.95)', 'rgba(251,146,60,0.46)');
    this.glowGold = makeGlow('rgba(254,240,138,0.92)', 'rgba(234,179,8,0.38)');
    this.shadowTex = makeGlow('rgba(0,0,0,0.86)', 'rgba(0,0,0,0.42)');
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

    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();

    const sx = this.shakeTime > 0 ? Math.round((Math.random() - 0.5) * 2 * this.shakeIntensity) : 0;
    const sy = this.shakeTime > 0 ? Math.round((Math.random() - 0.5) * 2 * this.shakeIntensity) : 0;

    const screenAnchorY = this.height * (this.isMobile ? 0.64 : 0.68);
    ctx.translate(this.width * 0.5 + sx, screenAnchorY + sy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // 1. HD-2D Pixel-Art Cathedral Diorama & 3D Perspective Stone Floor
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
    ctx.rect(-600, gy, ww + 1200, 700);
    ctx.clip();
    ctx.translate(0, gy * 2);
    ctx.scale(1, -0.44);
    ctx.globalAlpha = 0.28;
    for (const f of fighters) f.draw(ctx, true);
    vfx.renderMainPass(ctx, true, this);
    ctx.restore();

    // 4. Unreal HD-2D Dynamic Point-Light Floor Pools & Contact Shadows
    const lights = vfx.getActiveLights(fighters, gy);
    this.drawFloorLightPools(ctx, lights, gy);
    this.drawDynamicShadows(ctx, fighters, lights, gy);

    // 5. Main Pass: Fighters with HD-2D Volumetric Point-Light Rim Bloom
    const sorted = [...fighters].sort((a, b) => a.y - b.y);
    for (const f of sorted) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = f.state === 'IDLE' || f.state === 'WALK' ? 0.26 : 0.48;
      const glow = f.primaryColor === '#38bdf8' ? this.glowCyan : this.glowOrange;
      ctx.drawImage(glow, f.x - 125, f.y - 195, 250, 250);
      ctx.restore();
      f.draw(ctx, false);
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

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (bg && bg.complete && bg.naturalWidth > 0) {
      const drawW = 1680;
      const drawH = 945;
      const drawX = Math.round((ww - drawW) * 0.5);
      const drawY = Math.round(gy - drawH * 0.77);
      ctx.drawImage(bg, drawX, drawY, drawW, drawH);
    } else {
      ctx.fillStyle = '#070a14';
      ctx.fillRect(-600, -700, ww + 1200, gy + 1400);
    }

    // 3D Perspective Pixel-Art Cobblestone Mortar Grid & Arcane Arena Circle on Floor
    ctx.strokeStyle = 'rgba(12, 16, 28, 0.75)';
    ctx.lineWidth = 3;
    const vx = ww * 0.5;
    const vy = gy - 175;
    for (let i = -9; i <= 9; i++) {
      ctx.beginPath();
      ctx.moveTo(vx + i * 52, gy - 4);
      ctx.lineTo(vx + i * 195, gy + 260);
      ctx.stroke();
    }
    for (let r = 0; r < 6; r++) {
      const ry = gy + r * r * 11;
      ctx.fillStyle = r === 0 ? 'rgba(148, 174, 212, 0.22)' : 'rgba(8, 10, 18, 0.65)';
      ctx.fillRect(-300, ry, ww + 600, 3);
    }

    // Glowing Pixelated Arcane Duel Sigil inlaid in center floor
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(ww * 0.5, gy + 14);
    ctx.scale(1, 0.22);
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.24)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 185, 0, Math.PI * 2);
    ctx.arc(0, 0, 145, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Animated Pixel-Art Braziers + Volumetric Light Blooms
    ctx.globalCompositeOperation = 'lighter';
    const f1 = Math.sin(this.time * 7) * 14;
    const f2 = Math.cos(this.time * 8.5) * 14;
    ctx.globalAlpha = 0.46;
    ctx.drawImage(this.glowCyan, 30 - f1, gy - 330, 260 + f1 * 2, 260 + f1 * 2);
    ctx.drawImage(this.glowCyan, 235 - f2, gy - 265, 200 + f2 * 2, 200 + f2 * 2);
    ctx.drawImage(this.glowOrange, ww - 290 - f2, gy - 330, 260 + f2 * 2, 260 + f2 * 2);
    ctx.drawImage(this.glowOrange, ww - 435 - f1, gy - 265, 200 + f1 * 2, 200 + f1 * 2);
    ctx.globalAlpha = 0.32;
    ctx.drawImage(this.glowGold, ww * 0.5 - 220, gy - 540, 440, 440);
    ctx.restore();
  }

  drawVolumetricGodRays(ctx, ww, gy) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Diagonal Volumetric Light Shafts from Rose Window & Arches
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

    // Crisp Pixel-Art Floating Illuminated Dust Motes
    for (const m of this.motes) {
      const my = gy + 20 - ((m.y + this.time * m.spdY) % 520);
      const mx = m.x + Math.sin(this.time * 1.4 + m.phase) * 22;
      const alpha = 0.35 + 0.35 * Math.sin(this.time * 3 + m.phase);
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

    // Foreground Out-of-Focus Parallax Gothic Pillars (HD-2D Diorama Framing)
    const pShift = (this.camX - this.worldWidth * 0.5) * 0.18;
    ctx.fillStyle = 'rgba(3, 4, 8, 0.88)';
    const pilW = this.isMobile ? 22 : 54;
    ctx.fillRect(-10 - pShift * 0.3, 0, pilW, h);
    ctx.fillRect(w - pilW + 10 - pShift * 0.3, 0, pilW + 20, h);

    // Top & Bottom Tilt-Shift Depth-of-Field Darkening Gradients
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
