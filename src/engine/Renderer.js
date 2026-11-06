export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.groundY = Math.floor(this.height * 0.74);

    // Camera & Cinematic FX state
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.aberration = 0;
    this.hitStop = 0;
    this.ultDim = 0;
    this.targetZoom = 1;
    this.zoom = 1;
    this.focusX = this.width * 0.5;
    this.focusY = this.groundY - 80;
    this.time = 0;

    // Ambient background pillars & torches
    this.pillars = [0.14, 0.32, 0.5, 0.68, 0.86];

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.groundY = Math.floor(this.height * 0.74);
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
    this.focusX = focusX;
    this.focusY = focusY;
    this.targetZoom = 1.16;
    this.ultDim = 0.75;
  }

  update(rawDt) {
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
    this.targetZoom += (1 - this.targetZoom) * Math.min(1, rawDt * 2.5);
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, rawDt * 8);
  }

  render(fighters, vfx) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const gy = this.groundY;

    ctx.save();

    // Camera Zoom & Shake Transform
    const sx = this.shakeTime > 0 ? (Math.random() - 0.5) * 2 * this.shakeIntensity : 0;
    const sy = this.shakeTime > 0 ? (Math.random() - 0.5) * 2 * this.shakeIntensity : 0;

    ctx.translate(w * 0.5 + sx, gy - 80 + sy);
    ctx.scale(this.zoom, this.zoom);
    const camOffsetX = (this.focusX - w * 0.5) * (this.zoom - 1);
    const camOffsetY = (this.focusY - (gy - 80)) * (this.zoom - 1);
    ctx.translate(-w * 0.5 - camOffsetX, -(gy - 80) - camOffsetY);

    // 1. Arena Sky & Architecture
    this.drawArenaBackground(ctx, w, h, gy);

    // Dim background during Ultimate
    if (this.ultDim > 0.01) {
      ctx.fillStyle = `rgba(2, 4, 10, ${this.ultDim * 0.75})`;
      ctx.fillRect(-200, -200, w + 400, h + 400);
    }

    // 2. Ground Scorch & Fissures
    vfx.renderGroundDecals(ctx, gy);

    // 3. Real-Time Floor Reflections Pass (Vertically Flipped & Squashed)
    ctx.save();
    ctx.beginPath();
    ctx.rect(-100, gy, w + 200, h - gy + 200);
    ctx.clip();

    ctx.translate(0, gy * 2);
    ctx.scale(1, -0.45);
    ctx.globalAlpha = 0.25;

    for (const f of fighters) {
      f.draw(ctx, true);
    }
    vfx.renderMainPass(ctx, true);
    ctx.restore();

    // Floor specular horizon sheen & depth gradient
    const floorGrad = ctx.createLinearGradient(0, gy, 0, h);
    floorGrad.addColorStop(0, 'rgba(30, 41, 59, 0.38)');
    floorGrad.addColorStop(0.08, 'rgba(10, 14, 24, 0.45)');
    floorGrad.addColorStop(1, 'rgba(3, 5, 10, 0.92)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(-100, gy, w + 200, h - gy + 200);

    // Glowing floor horizon line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-100, gy);
    ctx.lineTo(w + 100, gy);
    ctx.stroke();

    // 4. Dynamic Ground Light Pools & Dynamic Drop Shadows
    const lights = vfx.getActiveLights(fighters, gy);
    this.drawFloorLightPools(ctx, lights, gy);
    this.drawDynamicShadows(ctx, fighters, lights, gy);

    // 5. Main Pass: Fighters & Particles
    const sorted = [...fighters].sort((a, b) => a.y - b.y);
    for (const f of sorted) {
      f.draw(ctx, false);
    }
    vfx.renderMainPass(ctx, false);

    // 6. Chromatic Aberration Ghost Pass on Heavy Hits
    if (this.aberration > 0.4) {
      const off = this.aberration;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.35, off * 0.04);
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

  drawArenaBackground(ctx, w, h, gy) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, gy);
    bgGrad.addColorStop(0, '#05070d');
    bgGrad.addColorStop(0.55, '#0b111e');
    bgGrad.addColorStop(1, '#131c2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-200, -200, w + 400, gy + 200);

    // Polished obsidian floor base
    ctx.fillStyle = '#080c14';
    ctx.fillRect(-200, gy, w + 400, h - gy + 200);

    // Stone pillars & flickering braziers
    for (let i = 0; i < this.pillars.length; i++) {
      const px = w * this.pillars[i];
      const pw = 46;
      ctx.fillStyle = '#090e18';
      ctx.fillRect(px - pw * 0.5, 40, pw, gy - 40);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(px - pw * 0.5, 40, pw, gy - 40);

      // Brazier glow
      const flicker = Math.sin(this.time * 7 + i * 2.1) * 6;
      const by = gy - 165;
      const isLeft = i < 2;
      const color = isLeft ? '56, 189, 248' : i === 2 ? '168, 85, 247' : '251, 146, 60';
      const rad = ctx.createRadialGradient(px, by, 2, px, by, 85 + flicker);
      rad.addColorStop(0, `rgba(${color}, 0.45)`);
      rad.addColorStop(1, `rgba(${color}, 0)`);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(px, by, 85 + flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFloorLightPools(ctx, lights, gy) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const distY = Math.max(0, gy - l.y);
      const atten = Math.max(0, 1 - distY / 340);
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
      // Calculate shadow shift from brightest nearby light source
      let shiftX = 0;
      for (const l of lights) {
        const dx = f.x - l.x;
        const dist = Math.hypot(dx, f.y - l.y) + 1;
        if (dist < 360) {
          shiftX += (dx / dist) * (1 - dist / 360) * 26 * l.intensity;
        }
      }
      shiftX = Math.max(-35, Math.min(35, shiftX));

      const rx = 38 * scale;
      const ry = 10 * scale;
      const sx = f.x + shiftX;
      ctx.save();
      ctx.translate(sx, gy + 2);
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
