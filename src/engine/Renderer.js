export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isMobile = this.width < 768;

    // Virtual Arena Coordinate System (1200 units wide so fighters have huge room on mobile)
    this.worldWidth = 1200;
    this.groundY = 520;

    // Camera & Cinematic FX state
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

    this.pillars = [0.12, 0.31, 0.5, 0.69, 0.88];

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isMobile = this.width < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 2);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  triggerShake(intensity = 10, duration = 0.28) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  triggerAberration(amount = 8) {
    this.aberration = Math.max(this.aberration, amount);
  }

  triggerHitStop(duration = 0.055) {
    this.hitStop = Math.max(this.hitStop, duration);
  }

  triggerUltimateCamera(focusX, focusY) {
    this.ultFocusX = focusX;
    this.ultFocusY = focusY;
    this.ultZoomTimer = 0.85;
    this.ultDim = 0.78;
  }

  update(rawDt, fighters) {
    this.time += rawDt;
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - rawDt);
      if (this.shakeTime === 0) this.shakeIntensity = 0;
    }
    if (this.aberration > 0) {
      this.aberration = Math.max(0, this.aberration - rawDt * 28);
    }
    if (this.ultDim > 0) {
      this.ultDim = Math.max(0, this.ultDim - rawDt * 0.65);
    }
    if (this.ultZoomTimer > 0) {
      this.ultZoomTimer = Math.max(0, this.ultZoomTimer - rawDt);
    }

    // Dynamic Fighting-Game Camera Framing
    if (fighters && fighters.length === 2) {
      const f1 = fighters[0];
      const f2 = fighters[1];
      const midX = (f1.x + f2.x) * 0.5;
      const dist = Math.abs(f1.x - f2.x) + 280;

      const fitScaleX = this.width / Math.max(580, Math.min(this.worldWidth, dist));
      const fitScaleY = this.height / 720;
      let targetZoom = Math.min(fitScaleX, fitScaleY * 1.15);
      targetZoom = Math.max(0.42, Math.min(this.isMobile ? 0.85 : 1.15, targetZoom));

      let targetX = midX;
      let targetY = this.groundY - 85;

      if (this.ultZoomTimer > 0) {
        targetZoom *= 1.18;
        targetX = this.ultFocusX;
        targetY = this.ultFocusY;
      }

      this.zoom += (targetZoom - this.zoom) * Math.min(1, rawDt * 6);
      this.camX += (targetX - this.camX) * Math.min(1, rawDt * 7);
      this.camY += (targetY - this.camY) * Math.min(1, rawDt * 7);
    }
  }

  render(fighters, vfx) {
    const ctx = this.ctx;
    const ww = this.worldWidth;
    const gy = this.groundY;

    // Clear full viewport
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();

    // Screen Shake + Dynamic World Camera Transform
    const sx = this.shakeTime > 0 ? (Math.random() - 0.5) * 2 * this.shakeIntensity : 0;
    const sy = this.shakeTime > 0 ? (Math.random() - 0.5) * 2 * this.shakeIntensity : 0;

    const screenAnchorY = this.height * (this.isMobile ? 0.62 : 0.66);
    ctx.translate(this.width * 0.5 + sx, screenAnchorY + sy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // 1. Arena Sky & Architecture
    this.drawArenaBackground(ctx, ww, gy);

    // Dim background during Ultimate
    if (this.ultDim > 0.01) {
      ctx.fillStyle = `rgba(2, 4, 10, ${this.ultDim * 0.75})`;
      ctx.fillRect(-600, -800, ww + 1200, 2000);
    }

    // 2. Ground Scorch & Fissures
    vfx.renderGroundDecals(ctx, gy);

    // 3. Real-Time Floor Reflections Pass (Vertically Flipped & Squashed)
    ctx.save();
    ctx.beginPath();
    ctx.rect(-600, gy, ww + 1200, 900);
    ctx.clip();

    ctx.translate(0, gy * 2);
    ctx.scale(1, -0.45);
    ctx.globalAlpha = 0.25;

    for (const f of fighters) f.draw(ctx, true);
    vfx.renderMainPass(ctx, true);
    ctx.restore();

    // Floor specular horizon sheen & depth gradient
    const floorGrad = ctx.createLinearGradient(0, gy, 0, gy + 550);
    floorGrad.addColorStop(0, 'rgba(30, 41, 59, 0.38)');
    floorGrad.addColorStop(0.08, 'rgba(10, 14, 24, 0.48)');
    floorGrad.addColorStop(1, 'rgba(3, 5, 10, 0.96)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(-600, gy, ww + 1200, 900);

    // Glowing floor horizon line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-600, gy);
    ctx.lineTo(ww + 600, gy);
    ctx.stroke();

    // 4. Dynamic Ground Light Pools & Dynamic Drop Shadows
    const lights = vfx.getActiveLights(fighters, gy);
    this.drawFloorLightPools(ctx, lights, gy);
    this.drawDynamicShadows(ctx, fighters, lights, gy);

    // 5. Main Pass: Fighters & Particles
    const sorted = [...fighters].sort((a, b) => a.y - b.y);
    for (const f of sorted) f.draw(ctx, false);
    vfx.renderMainPass(ctx, false);

    // 6. Chromatic Aberration Ghost Pass on Heavy Hits
    if (this.aberration > 0.4) {
      const off = this.aberration;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.32, off * 0.04);
      ctx.translate(-off, 0);
      for (const f of sorted) f.draw(ctx, false);
      ctx.translate(off * 2, 0);
      for (const f of sorted) f.draw(ctx, false);
      ctx.restore();
    }

    // 7. Floating Combat Text (Damage & Crits)
    vfx.renderFloatingTexts(ctx);

    ctx.restore();
  }

  drawArenaBackground(ctx, ww, gy) {
    const bgGrad = ctx.createLinearGradient(0, -500, 0, gy);
    bgGrad.addColorStop(0, '#04060b');
    bgGrad.addColorStop(0.6, '#0b111e');
    bgGrad.addColorStop(1, '#131c2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-600, -700, ww + 1200, gy + 700);

    ctx.fillStyle = '#070a12';
    ctx.fillRect(-600, gy, ww + 1200, 900);

    for (let i = 0; i < this.pillars.length; i++) {
      const px = ww * this.pillars[i];
      const pw = 52;
      ctx.fillStyle = '#090e18';
      ctx.fillRect(px - pw * 0.5, -350, pw, gy + 350);
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.strokeRect(px - pw * 0.5, -350, pw, gy + 350);

      const flicker = Math.sin(this.time * 7 + i * 2.1) * 6;
      const by = gy - 175;
      const color = i < 2 ? '56, 189, 248' : i === 2 ? '234, 179, 8' : '251, 146, 60';
      const rad = ctx.createRadialGradient(px, by, 2, px, by, 95 + flicker);
      rad.addColorStop(0, `rgba(${color}, 0.42)`);
      rad.addColorStop(1, `rgba(${color}, 0)`);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(px, by, 95 + flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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
      const ry = rx * 0.22;
      ctx.save();
      ctx.translate(l.x, gy + 4);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, rx);
      g.addColorStop(0, l.color.replace('1)', `${0.32 * atten * l.intensity})`));
      g.addColorStop(1, l.color.replace('1)', '0)'));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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
        if (dist < 380) shiftX += (dx / dist) * (1 - dist / 380) * 26 * l.intensity;
      }
      shiftX = Math.max(-35, Math.min(35, shiftX));
      const rx = 38 * scale;
      const ry = 10 * scale;
      ctx.save();
      ctx.translate(f.x + shiftX, gy + 2);
      ctx.scale(1, ry / rx);
      const sg = ctx.createRadialGradient(0, 0, 4, 0, 0, rx);
      sg.addColorStop(0, `rgba(0, 0, 0, ${0.68 * scale})`);
      sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
