export class VFXManager {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
    this.slashes = [];
    this.decals = [];
    this.projectiles = [];
    this.pillars = [];
    this.lightnings = [];
    this.texts = [];
  }

  clear() {
    this.particles.length = 0;
    this.shockwaves.length = 0;
    this.slashes.length = 0;
    this.decals.length = 0;
    this.projectiles.length = 0;
    this.pillars.length = 0;
    this.lightnings.length = 0;
    this.texts.length = 0;
  }

  spawnParticle(opts) {
    if (this.particles.length > 160) this.particles.shift();
    this.particles.push({
      x: opts.x,
      y: opts.y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      size: opts.size || 6,
      endSize: opts.endSize ?? 0,
      color: opts.color || '#38bdf8',
      life: 0,
      maxLife: opts.maxLife || 0.55,
      gravity: opts.gravity || 0,
      additive: opts.additive !== false,
      drag: opts.drag || 0.98
    });
  }

  spawnBurst(x, y, count, color, speed = 180, opts = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.3 + Math.random() * 0.7) * speed;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (opts.upBias || 0),
        size: (opts.size || 6) * (0.6 + Math.random() * 0.7),
        color,
        maxLife: (opts.life || 0.45) * (0.6 + Math.random() * 0.6),
        gravity: opts.gravity ?? 260,
        additive: opts.additive !== false
      });
    }
  }

  spawnSlash(x, y, radius, startAngle, endAngle, color = '#38bdf8', duration = 0.2) {
    this.slashes.push({ x, y, radius, startAngle, endAngle, color, life: 0, maxLife: duration });
  }

  spawnShockwave(x, y, maxRadius, color = '#38bdf8', duration = 0.4, flat = false) {
    this.shockwaves.push({ x, y, maxRadius, color, life: 0, maxLife: duration, flat });
  }

  spawnDecal(x, width, type = 'scorch', color = '#fb923c', duration = 5.0) {
    if (this.decals.length > 8) this.decals.shift();
    this.decals.push({ x, width, type, color, life: 0, maxLife: duration, seed: Math.random() * 100 });
  }

  spawnLightning(x, topY, bottomY, color = '#fde08a') {
    const pts = [{ x, y: topY }];
    const steps = 10;
    for (let i = 1; i < steps; i++) {
      pts.push({
        x: x + (Math.random() - 0.5) * 80,
        y: topY + ((bottomY - topY) * i) / steps
      });
    }
    pts.push({ x, y: bottomY });
    this.lightnings.push({ pts, color, life: 0, maxLife: 0.28 });
  }

  spawnFlamePillar(x, groundY, owner, target) {
    this.pillars.push({
      x,
      groundY,
      owner,
      target,
      life: 0,
      maxLife: 1.5,
      erupted: false,
      tickTimer: 0
    });
  }

  spawnProjectile(opts) {
    this.projectiles.push({
      x: opts.x,
      y: opts.y,
      vx: opts.vx,
      vy: opts.vy,
      radius: opts.radius || 14,
      color: opts.color || '#fb923c',
      coreColor: opts.coreColor || '#fef08a',
      owner: opts.owner,
      damage: opts.damage || 60,
      isMeteor: !!opts.isMeteor
    });
  }

  spawnDamageText(x, y, amount, isCrit = false, label = '') {
    this.texts.push({
      x: x + (Math.random() - 0.5) * 26,
      y: y - 24,
      vy: isCrit ? -105 : -70,
      text: label || `${Math.round(amount)}${isCrit ? '!' : ''}`,
      isCrit,
      color: label ? '#38bdf8' : isCrit ? '#facc15' : '#f8fafc',
      life: 0,
      maxLife: isCrit ? 1.0 : 0.8
    });
  }

  update(dt, groundY, renderer) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > groundY && p.gravity > 0) {
        p.y = groundY;
        p.vy *= -0.45;
        p.vx *= 0.7;
      }
    }

    const stepList = (arr) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        arr[i].life += dt;
        if (arr[i].life >= arr[i].maxLife) arr.splice(i, 1);
      }
    };
    stepList(this.slashes);
    stepList(this.shockwaves);
    stepList(this.decals);
    stepList(this.lightnings);

    for (let i = this.pillars.length - 1; i >= 0; i--) {
      const pil = this.pillars[i];
      pil.life += dt;
      // Track target slightly before eruption so Warrior can't trivially walk out
      if (!pil.erupted && pil.target) {
        pil.x += (pil.target.x - pil.x) * 3.5 * dt;
      }
      if (pil.life >= 0.42 && !pil.erupted) {
        pil.erupted = true;
        renderer.triggerShake(10, 0.35);
        this.spawnDecal(pil.x, 105, 'scorch', '#fb923c', 4.5);
        this.spawnShockwave(pil.x, groundY, 120, '#facc15', 0.4, true);
      }
      if (pil.erupted && pil.life < pil.maxLife - 0.15) {
        for (let k = 0; k < 3; k++) {
          const spiral = Math.sin(pil.life * 22 + k * 2) * 38;
          this.spawnParticle({
            x: pil.x + spiral,
            y: groundY - Math.random() * 25,
            vx: (Math.random() - 0.5) * 40,
            vy: -290 - Math.random() * 200,
            size: 13 + Math.random() * 9,
            color: k % 2 === 0 ? '#fb923c' : '#fef08a',
            maxLife: 0.42,
            gravity: -110
          });
        }
        pil.tickTimer += dt;
        if (pil.tickTimer >= 0.25 && pil.target && !pil.target.isDead) {
          pil.tickTimer = 0;
          if (Math.abs(pil.target.x - pil.x) < 82 && groundY - pil.target.y < 155) {
            pil.target.takeDamage(28, pil.owner, false, 35, -55);
          }
        }
      }
      if (pil.life >= pil.maxLife) this.pillars.splice(i, 1);
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life += dt;
      t.y += t.vy * dt;
      t.vy *= 0.94;
      if (t.life >= t.maxLife) this.texts.splice(i, 1);
    }
  }

  getActiveLights(fighters, gy) {
    const lights = [];
    for (const f of fighters) {
      lights.push({
        x: f.x,
        y: f.y - 45,
        radius: f.state === 'ULTIMATE' ? 240 : 130,
        isBlue: f.primaryColor === '#38bdf8',
        intensity: f.state === 'ULTIMATE' ? 1.5 : 0.85
      });
    }
    for (const p of this.projectiles) {
      lights.push({
        x: p.x,
        y: p.y,
        radius: p.isMeteor ? 340 : 155,
        isBlue: p.color === '#38bdf8',
        intensity: p.isMeteor ? 1.8 : 1.15
      });
    }
    for (const pil of this.pillars) {
      lights.push({
        x: pil.x,
        y: gy - 60,
        radius: pil.erupted ? 225 : 135,
        isBlue: false,
        intensity: pil.erupted ? 1.45 : 0.8
      });
    }
    return lights;
  }

  renderGroundDecals(ctx, gy) {
    for (const d of this.decals) {
      const alpha = Math.min(1, (1 - d.life / d.maxLife) * 1.5);
      ctx.save();
      ctx.translate(d.x, gy);
      ctx.fillStyle = `rgba(4, 5, 8, ${0.72 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 2, d.width, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      if (d.type === 'fissure') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = d.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = -4; i <= 4; i++) {
          ctx.moveTo(i * 18, 0);
          ctx.lineTo(i * 25 + Math.sin(d.seed + i) * 14, (i % 2 === 0 ? 1 : -1) * 12);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  renderMainPass(ctx, isReflection = false, renderer = null) {
    ctx.save();
    for (const pil of this.pillars) {
      const p = Math.min(1, pil.life / 0.42);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(pil.x, pil.groundY);
      ctx.scale(1, 0.28);
      ctx.rotate(pil.life * 3.5);
      const r = 78 * p;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      for (let i = 0; i < 6; i++) {
        const a1 = (i * Math.PI) / 3;
        const a2 = ((i + 2) * Math.PI) / 3;
        ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
        ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
      }
      ctx.stroke();
      ctx.restore();

      if (pil.erupted && pil.life < pil.maxLife - 0.1) {
        const fade = Math.min(1, (pil.maxLife - pil.life) * 3.2);
        const pxSize = 6;
        const cols = 9;
        const rows = 26;
        const baseX = Math.round(pil.x / pxSize) * pxSize;
        const baseY = Math.round(pil.groundY / pxSize) * pxSize;
        ctx.save();
        ctx.globalAlpha = fade * (isReflection ? 0.45 : 0.92);
        for (let row = 0; row < rows; row++) {
          const hFrac = row / rows;
          const sway = Math.round(Math.sin(pil.life * 18 - row * 0.55) * (1 + hFrac * 2.2));
          const halfSpan = Math.max(1, Math.round((1 - hFrac * 0.72) * 4));
          for (let col = -halfSpan; col <= halfSpan; col++) {
            const edge = Math.abs(col) / (halfSpan + 0.5);
            const n = Math.sin(pil.life * 24 - row * 1.1 + col * 1.7);
            if (hFrac + edge * 0.45 + n * 0.16 > 0.96) continue;
            const heat = 1 - hFrac * 0.72 - edge * 0.35;
            ctx.fillStyle =
              heat > 0.72 ? '#ffffff' : heat > 0.48 ? '#fef08a' : heat > 0.24 ? '#fb923c' : '#dc2626';
            ctx.fillRect(
              baseX + (col + sway) * pxSize - pxSize * 0.5,
              baseY - (row + 1) * pxSize,
              pxSize,
              pxSize
            );
          }
        }
        ctx.restore();
      }
    }

    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const s = Math.max(2, Math.round((p.size * (1 - t) + p.endSize * t) / 2) * 2);
      if (p.additive) ctx.globalCompositeOperation = 'lighter';
      else ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (1 - t) * (isReflection ? 0.65 : 1);
      const px = Math.round(p.x / 2) * 2;
      const py = Math.round(p.y / 2) * 2;
      ctx.fillStyle = p.color;
      ctx.fillRect(px - s * 0.5, py - s * 0.5, s, s);
      if (p.additive && s >= 4) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }

    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.slashes) {
      const t = s.life / s.maxLife;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = (1 - t) * 18;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(0, 0, s.radius, s.startAngle, s.endAngle);
      ctx.stroke();
      ctx.restore();
    }

    for (const sw of this.shockwaves) {
      const t = sw.life / sw.maxLife;
      const r = sw.maxRadius * (1 - Math.pow(1 - t, 3));
      ctx.save();
      ctx.translate(sw.x, sw.y);
      if (sw.flat) ctx.scale(1, 0.28);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = Math.max(2, (1 - t) * 10);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    for (const proj of this.projectiles) {
      const r = proj.radius * 2.8;
      const px = Math.round(proj.x / 2) * 2;
      const py = Math.round(proj.y / 2) * 2;
      if (renderer) {
        const tex = proj.color === '#38bdf8' ? renderer.glowCyan : renderer.glowOrange;
        ctx.drawImage(tex, px - r, py - r, r * 2, r * 2);
      }
      // HD-2D Pixel-Art Stepped Core + Anamorphic Lens Flare Cross
      const cs = Math.max(4, Math.round(proj.radius * 0.9));
      ctx.fillStyle = proj.color;
      ctx.fillRect(px - cs, py - cs * 0.6, cs * 2, cs * 1.2);
      ctx.fillRect(px - cs * 0.6, py - cs, cs * 1.2, cs * 2);
      ctx.fillStyle = proj.coreColor;
      ctx.fillRect(px - cs * 0.5, py - cs * 0.5, cs, cs);
      if (!isReflection) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(px - cs * 2.2, py - 1, cs * 4.4, 2);
      }
    }

    for (const l of this.lightnings) {
      const t = l.life / l.maxLife;
      ctx.strokeStyle = l.color;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = (1 - t) * 10;
      ctx.beginPath();
      l.pts.forEach((pt, idx) =>
        idx === 0
          ? ctx.moveTo(Math.round(pt.x / 3) * 3, Math.round(pt.y / 3) * 3)
          : ctx.lineTo(Math.round(pt.x / 3) * 3, Math.round(pt.y / 3) * 3)
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  renderFloatingTexts(ctx) {
    for (const t of this.texts) {
      const p = t.life / t.maxLife;
      const scale = t.isCrit ? 1.35 - p * 0.25 : 1.0;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.min(1, (1 - p) * 2);
      ctx.font = `${t.isCrit ? '900 22px' : '700 16px'} "Cinzel", serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      ctx.fillText(t.text, 2, 2);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
  }
}
