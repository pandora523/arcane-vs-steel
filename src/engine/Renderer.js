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
    this.hitStop = 0;
    this.ultDim = 0;
    this.ultZoomTimer = 0;
    this.camX = this.worldWidth * 0.5;
    this.camY = this.groundY - 90;
    this.zoom = 1;
    this.time = 0;

    this.pillars = [0.1, 0.3, 0.5, 0.7, 0.9];
    this.stars = Array.from({ length: 36 }, () => ({
      x: Math.random() * 1600 - 200,
      y: Math.random() * 480 - 360,
      s: Math.random() < 0.3 ? 3 : 2,
      phase: Math.random() * Math.PI * 2
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
      g.addColorStop(0.45, rgbaMid);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      gCtx.fillStyle = g;
      gCtx.fillRect(0, 0, 128, 128);
      return c;
    };
    this.glowCyan = makeGlow('rgba(186,230,253,0.9)', 'rgba(56,189,248,0.4)');
    this.glowOrange = makeGlow('rgba(254,240,138,0.95)', 'rgba(251,146,60,0.45)');
    this.glowGold = makeGlow('rgba(254,240,138,0.9)', 'rgba(234,179,8,0.4)');
    this.shadowTex = makeGlow('rgba(0,0,0,0.75)', 'rgba(0,0,0,0.35)');
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isMobile = this.width < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.25 : 1.75);
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

  triggerHitStop() {
    // Disabled freeze-frames so combat movement stays 100% smooth
  }

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
      const dist = Math.abs(f1.x - f2.x) + 320;

      const fitScaleX = this.width / Math.max(600, Math.min(this.worldWidth, dist));
      const fitScaleY = this.height / 720;
      let targetZoom = Math.min(fitScaleX, fitScaleY * 1.15);
      targetZoom = Math.max(0.42, Math.min(this.isMobile ? 0.85 : 1.15, targetZoom));

      let targetX = midX;
      let targetY = this.groundY - 85;

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

    const screenAnchorY = this.height * (this.isMobile ? 0.62 : 0.66);
    ctx.translate(this.width * 0.5 + sx, screenAnchorY + sy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // 1. Gothic Citadel Sky & Architecture
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
    ctx.scale(1, -0.45);
    ctx.globalAlpha = 0.24;

    for (const f of fighters) f.draw(ctx, true);
    vfx.renderMainPass(ctx, true, this);
    ctx.restore();

    // Tiled Obsidian Floor Overlay
    this.drawObsidianFloor(ctx, ww, gy);

    // 4. Dynamic Ground Light Pools & Drop Shadows (Using pre-baked textures)
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
    ctx.fillStyle = '#070c18';
    ctx.fillRect(-600, -700, ww + 1200, gy + 700);

    for (const st of this.stars) {
      ctx.fillStyle = '#cbd5e1';
      ctx.globalAlpha = 0.25 + Math.sin(this.time * 2.5 + st.phase) * 0.18;
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
    ctx.globalAlpha = 1;

    // Giant Center Eclipse Medallion
    const cx = ww * 0.5;
    const cy = gy - 250;
    ctx.drawImage(this.glowGold, cx - 180, cy - 180, 360, 360);
    ctx.fillStyle = '#060912';
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Distant Battlement Wall
    ctx.fillStyle = '#080d18';
    ctx.fillRect(-600, gy - 125, ww + 1200, 125);
    for (let x = -400; x < ww + 400; x += 48) {
      ctx.fillRect(x, gy - 140, 28, 16);
    }

    // Gothic Pillars & Pre-baked Brazier Glows
    ctx.save();
    for (let i = 0; i < this.pillars.length; i++) {
      const px = ww * this.pillars[i];
      const pw = 58;
      ctx.fillStyle = '#0b111e';
      ctx.fillRect(px - pw * 0.5, -360, pw, gy + 360);
      ctx.fillStyle = '#141e30';
      ctx.fillRect(px - pw * 0.5 + 8, -360, 10, gy + 360);
      ctx.fillRect(px - pw * 0.5 - 6, gy - 24, pw + 12, 24);

      const by = gy - 175;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px - 16, by, 32, 10);

      const flicker = Math.sin(this.time * 8 + i * 2.1) * 10;
      const r = 105 + flicker;
      const tex = i < 2 ? this.glowCyan : i === 2 ? this.glowGold : this.glowOrange;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(tex, px - r, by - 6 - r, r * 2, r * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px - 5, by - 12, 10, 10);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  drawObsidianFloor(ctx, ww, gy) {
    ctx.fillStyle = 'rgba(8, 12, 22, 0.72)';
    ctx.fillRect(-600, gy, ww + 1200, 700);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -200; x <= ww + 200; x += 120) {
      ctx.moveTo(x, gy);
      ctx.lineTo(ww * 0.5 + (x - ww * 0.5) * 2.4, gy + 450);
    }
    for (let r = 1; r <= 5; r++) {
      const y = gy + r * r * 16;
      ctx.moveTo(-600, y);
      ctx.lineTo(ww + 600, y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-600, gy);
    ctx.lineTo(ww + 600, gy);
    ctx.stroke();
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
      const rx = 44 * scale;
      const ry = 12 * scale;
      ctx.drawImage(this.shadowTex, f.x + shiftX - rx, gy + 2 - ry, rx * 2, ry * 2);
    }
  }
}
