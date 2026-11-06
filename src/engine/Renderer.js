export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
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
    this.stars = Array.from({ length: 45 }, () => ({
      x: Math.random() * 1600 - 200,
      y: Math.random() * 520 - 380,
      s: Math.random() < 0.3 ? 3 : 2,
      phase: Math.random() * Math.PI * 2
    }));

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
    if (this.aberration > 0) this.aberration = Math.max(0, this.aberration - rawDt * 28);
    if (this.ultDim > 0) this.ultDim = Math.max(0, this.ultDim - rawDt * 0.65);
    if (this.ultZoomTimer > 0) this.ultZoomTimer = Math.max(0, this.ultZoomTimer - rawDt);

    if (fighters && fighters.length === 2) {
      const f1 = fighters[0];
      const f2 = fighters[1];
      const midX = (f1.x + f2.x) * 0.5;
      const dist = Math.abs(f1.x - f2.x) + 310;

      const fitScaleX = this.width / Math.max(600, Math.min(this.worldWidth, dist));
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
    ctx.rect(-600, gy, ww + 1200, 900);
    ctx.clip();

    ctx.translate(0, gy * 2);
    ctx.scale(1, -0.45);
    ctx.globalAlpha = 0.25;

    for (const f of fighters) f.draw(ctx, true);
    vfx.renderMainPass(ctx, true);
    ctx.restore();

    // Tiled Obsidian Floor Overlay & Center Duel Sigil
    this.drawObsidianFloor(ctx, ww, gy);

    // 4. Dynamic Ground Light Pools & Drop Shadows
    const lights = vfx.getActiveLights(fighters, gy);
    this.drawFloorLightPools(ctx, lights, gy);
    this.drawDynamicShadows(ctx, fighters, lights, gy);

    // 5. Main Pass: Fighters & Particles
    const sorted = [...fighters].sort((a, b) => a.y - b.y);
    for (const f of sorted) f.draw(ctx, false);
    vfx.renderMainPass(ctx, false);

    // 6. Chromatic Aberration Ghost Pass
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

    // 7. Floating Combat Text
    vfx.renderFloatingTexts(ctx);

    ctx.restore();
  }

  drawArenaBackground(ctx, ww, gy) {
    const bgGrad = ctx.createLinearGradient(0, -500, 0, gy);
    bgGrad.addColorStop(0, '#03050a');
    bgGrad.addColorStop(0.55, '#0a1020');
    bgGrad.addColorStop(1, '#161f33');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-600, -700, ww + 1200, gy + 700);

    // Twinkling pixel stars
    for (const st of this.stars) {
      ctx.fillStyle = `rgba(226, 232, 240, ${0.25 + Math.sin(this.time * 2.5 + st.phase) * 0.2})`;
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }

    // Giant Center Eclipse / Astral Rose Window
    const cx = ww * 0.5;
    const cy = gy - 250;
    const moonGrad = ctx.createRadialGradient(cx, cy, 42, cx, cy, 185);
    moonGrad.addColorStop(0, 'rgba(250, 204, 21, 0.32)');
    moonGrad.addColorStop(0.45, 'rgba(234, 88, 12, 0.12)');
    moonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 185, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#070a14';
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

    // Gothic Pillars, Arches & Braziers
    for (let i = 0; i < this.pillars.length; i++) {
      const px = ww * this.pillars[i];
      const pw = 58;
      ctx.fillStyle = '#0b111e';
      ctx.fillRect(px - pw * 0.5, -360, pw, gy + 360);
      ctx.fillStyle = '#141e30';
      ctx.fillRect(px - pw * 0.5 + 8, -360, 10, gy + 360);
      ctx.fillRect(px - pw * 0.5 - 6, gy - 24, pw + 12, 24);

      const flicker = Math.sin(this.time * 8 + i * 2.1) * 7;
      const by = gy - 175;
      const color = i < 2 ? '56, 189, 248' : i === 2 ? '250, 204, 21' : '251, 146, 60';

      // Iron Brazier Bowl
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px - 16, by, 32, 10);

      const rad = ctx.createRadialGradient(px, by - 6, 2, px, by - 6, 105 + flicker);
      rad.addColorStop(0, `rgba(${color}, 0.5)`);
      rad.addColorStop(1, `rgba(${color}, 0)`);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(px, by - 6, 105 + flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px - 6, by - 12, 12, 12);
      ctx.restore();
    }
  }

  drawObsidianFloor(ctx, ww, gy) {
    const floorGrad = ctx.createLinearGradient(0, gy, 0, gy + 550);
    floorGrad.addColorStop(0, 'rgba(24, 34, 52, 0.42)');
    floorGrad.addColorStop(0.1, 'rgba(9, 13, 22, 0.55)');
    floorGrad.addColorStop(1, 'rgba(3, 5, 10, 0.96)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(-600, gy, ww + 1200, 900);

    // Perspective stone tile lines
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

    // Horizon border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.32)';
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
      const ry = rx * 0.22;
      ctx.save();
      ctx.translate(l.x, gy + 4);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, rx);
      g.addColorStop(0, l.color.replace('1)', `${0.34 * atten * l.intensity})`));
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
      const rx = 42 * scale;
      const ry = 11 * scale;
      ctx.save();
      ctx.translate(f.x + shiftX, gy + 2);
      ctx.scale(1, ry / rx);
      const sg = ctx.createRadialGradient(0, 0, 4, 0, 0, rx);
      sg.addColorStop(0, `rgba(0, 0, 0, ${0.72 * scale})`);
      sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
