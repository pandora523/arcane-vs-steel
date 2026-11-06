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
    this.particles.push({
      x: opts.x,
      y: opts.y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      size: opts.size || 6,
      endSize: opts.endSize ?? 0,
      color: opts.color || '#38bdf8',
      life: 0,
      maxLife: opts.maxLife || 0.6,
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
        maxLife: (opts.life || 0.5) * (0.6 + Math.random() * 0.6),
        gravity: opts.gravity ?? 260,
        additive: opts.additive !== false
      });
    }
  }

  spawnSlash(x, y, radius, startAngle, endAngle, color = '#38bdf8', duration = 0.22) {
    this.slashes.push({ x, y, radius, startAngle, endAngle, color, life: 0, maxLife: duration });
  }

  spawnShockwave(x, y, maxRadius, color = '#38bdf8', duration = 0.45, flat = false) {
    this.shockwaves.push({ x, y, maxRadius, color, life: 0, maxLife: duration, flat });
  }

  spawnDecal(x, width, type = 'scorch', color = '#fb923c', duration = 5.0) {
    this.decals.push({ x, width, type, color, life: 0, maxLife: duration, seed: Math.random() * 100 });
  }

  spawnLightning(x, topY, bottomY, color = '#fde047') {
    const pts = [{ x, y: topY }];
    const steps = 10;
    for (let i = 1; i < steps; i++) {
      pts.push({
        x: x + (Math.random() - 0.5) * 70,
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
      damage: opts.damage || 45,
      isMeteor: !!opts.isMeteor,
      trail: [],
      dead: false
    });
  }

  spawnDamageText(x, y, amount, isCrit = false, label = '') {
    this.texts.push({
      x: x + (Math.random() - 0.5) * 26,
      y: y - 20,
      vy: isCrit ? -95 : -65,
      text: label || `${Math.round(amount)}${isCrit ? '!' : ''}`,
      isCrit,
      color: label ? '#38bdf8' : isCrit ? '#facc15' : '#f8fafc',
      life: 0,
      maxLife: isCrit ? 1.1 : 0.85
    });
  }

  update(dt, groundY, renderer) {
    // Update Particles
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

    // Update Slashes, Shockwaves, Decals, Lightnings
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

    // Update Flame Pillars
    for (let i = this.pillars.length - 1; i >= 0; i--) {
      const pil = this.pillars[i];
      pil.life += dt;
      if (pil.life >= 0.55 && !pil.erupted) {
        pil.erupted = true;
        renderer.triggerShake(9, 0.35);
        this.spawnDecal(pil.x, 95, 'scorch', '#fb923c', 4.5);
        this.spawnShockwave(pil.x, groundY, 95, '#fb923c', 0.4, true);
      }
      if (pil.erupted && pil.life < pil.maxLife - 0.15) {
        for (let k = 0; k < 3; k++) {
          this.spawnParticle({
            x: pil.x + (Math.random() - 0.5) * 58,
            y: groundY - Math.random() * 25,
            vx: (Math.random() - 0.5) * 45,
            vy: -240 - Math.random() * 190,
            size: 14 + Math.random() * 12,
            color: Math.random() > 0.35 ? '#fb923c' : '#fef08a',
            maxLife: 0.48,
            gravity: -90
          });
        }
        pil.tickTimer += dt;
        if (pil.tickTimer >= 0.22 && pil.target && !pil.target.isDead) {
          pil.tickTimer = 0;
          if (Math.abs(pil.target.x - pil.x) < 68 && groundY - pil.target.y < 140) {
            pil.target.takeDamage(28, pil.owner, false, 70, -110);
          }
        }
      }
      if (pil.life >= pil.maxLife) this.pillars.splice(i, 1);
    }

    // Update Floating Texts
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
        radius: f.state === 'ULTIMATE' ? 230 : 125,
        color: f.lightColor,
        intensity: f.state === 'ULTIMATE' ? 1.5 : 0.85
      });
    }
    for (const p of this.projectiles) {
      lights.push({
        x: p.x,
        y: p.y,
        radius: p.isMeteor ? 320 : 145,
        color: 'rgba(251, 146, 60, 1)',
        intensity: p.isMeteor ? 1.8 : 1.15
      });
    }
    for (const pil of this.pillars) {
      lights.push({
        x: pil.x,
        y: gy - 60,
        radius: pil.erupted ? 210 : 120,
        color: 'rgba(251, 146, 60, 1)',
        intensity: pil.erupted ? 1.4 : 0.7
      });
    }
    return lights;
  }

  renderGroundDecals(ctx, gy) {
    for (const d of this.decals) {
      const alpha = Math.min(1, (1 - d.life / d.maxLife) * 1.5);
      ctx.save();
      ctx.translate(d.x, gy);
      ctx.fillStyle = `rgba(5, 5, 8, ${0.65 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 2, d.width, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      if (d.type === 'fissure') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = d.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = -3; i <= 3; i++) {
          ctx.moveTo(i * 18, 0);
          ctx.lineTo(i * 26 + Math.sin(d.seed + i) * 12, (i % 2 === 0 ? 1 : -1) * 10);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  renderMainPass(ctx, isReflection = false) {
    ctx.save();
    // 1. Rune circles / Pillars base
    for (const pil of this.pillars) {
      const p = Math.min(1, pil.life / 0.55);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(pil.x, pil.groundY);
      ctx.scale(1, 0.26);
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 62 * p, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Particles
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const r = Math.max(0.5, p.size * (1 - t) + p.endSize * t);
      ctx.save();
      if (p.additive) ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - t) * (isReflection ? 0.65 : 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Ribbon Sword Slashes
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.slashes) {
      const t = s.life / s.maxLife;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = (1 - t) * 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, s.radius, s.startAngle, s.endAngle);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Shockwave Rings
    for (const sw of this.shockwaves) {
      const t = sw.life / sw.maxLife;
      const r = sw.maxRadius * (1 - Math.pow(1 - t, 3));
      ctx.save();
      ctx.translate(sw.x, sw.y);
      if (sw.flat) ctx.scale(1, 0.28);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = Math.max(1.5, (1 - t) * 10);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Projectiles (Fireballs & Meteors)
    for (const proj of this.projectiles) {
      ctx.save();
      const g = ctx.createRadialGradient(proj.x, proj.y, 2, proj.x, proj.y, proj.radius * 2.4);
      g.addColorStop(0, proj.coreColor);
      g.addColorStop(0.4, proj.color);
      g.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Lightning Bolts
    for (const l of this.lightnings) {
      const t = l.life / l.maxLife;
      ctx.save();
      ctx.strokeStyle = l.color;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = (1 - t) * 9;
      ctx.beginPath();
      l.pts.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.stroke();
      ctx.restore();
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
      ctx.font = `${t.isCrit ? '800 22px' : '700 15px'} Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      ctx.fillText(t.text, 1.5, 1.5);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
  }
}
