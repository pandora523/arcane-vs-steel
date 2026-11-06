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
    if (this.particles.length > 220) this.particles.shift();
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

  spawnSlash(x, y, radius, startAngle, endAngle, color = '#38bdf8', duration = 0.28) {
    this.slashes.push({ x, y, radius, startAngle, endAngle, color, life: 0, maxLife: duration });
  }

  spawnShockwave(x, y, maxRadius, color = '#38bdf8', duration = 0.42, flat = false) {
    this.shockwaves.push({ x, y, maxRadius, color, life: 0, maxLife: duration, flat });
  }

  spawnDecal(x, width, type = 'scorch', color = '#fb923c', duration = 5.5) {
    if (this.decals.length > 8) this.decals.shift();
    this.decals.push({ x, width, type, color, life: 0, maxLife: duration, seed: Math.random() * 100 });
  }

  spawnLightning(x, topY, bottomY, color = '#fde08a') {
    const pts = [{ x, y: topY }];
    const steps = 12;
    for (let i = 1; i < steps; i++) {
      pts.push({
        x: x + (Math.random() - 0.5) * 86,
        y: topY + ((bottomY - topY) * i) / steps
      });
    }
    pts.push({ x, y: bottomY });
    this.lightnings.push({ pts, color, life: 0, maxLife: 0.36 });
  }

  spawnFlamePillar(x, groundY, owner, target) {
    this.pillars.push({
      x,
      groundY,
      owner,
      target,
      life: 0,
      maxLife: 1.55,
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
      if (!pil.erupted && pil.target) {
        pil.x += (pil.target.x - pil.x) * 3.5 * dt;
      }
      if (pil.life >= 0.42 && !pil.erupted) {
        pil.erupted = true;
        renderer.triggerShake(12, 0.38);
        this.spawnDecal(pil.x, 110, 'scorch', '#fb923c', 4.8);
        this.spawnShockwave(pil.x, groundY, 135, '#facc15', 0.44, true);
      }
      if (pil.erupted && pil.life < pil.maxLife - 0.12) {
        for (let k = 0; k < 3; k++) {
          const spiral = Math.sin(pil.life * 22 + k * 2) * 42;
          this.spawnParticle({
            x: pil.x + spiral,
            y: groundY - Math.random() * 28,
            vx: (Math.random() - 0.5) * 44,
            vy: -300 - Math.random() * 210,
            size: 12 + Math.random() * 8,
            color: k % 2 === 0 ? '#fb923c' : '#fef08a',
            maxLife: 0.44,
            gravity: -110
          });
        }
        pil.tickTimer += dt;
        if (pil.tickTimer >= 0.25 && pil.target && !pil.target.isDead) {
          pil.tickTimer = 0;
          if (Math.abs(pil.target.x - pil.x) < 84 && groundY - pil.target.y < 155) {
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
        radius: f.state === 'ULTIMATE' ? 250 : 140,
        isBlue: f.primaryColor === '#38bdf8',
        intensity: f.state === 'ULTIMATE' ? 1.55 : 0.9
      });
    }
    for (const p of this.projectiles) {
      lights.push({
        x: p.x,
        y: p.y,
        radius: p.isMeteor ? 360 : 165,
        isBlue: p.color === '#38bdf8',
        intensity: p.isMeteor ? 1.85 : 1.2
      });
    }
    for (const pil of this.pillars) {
      lights.push({
        x: pil.x,
        y: gy - 70,
        radius: pil.erupted ? 245 : 145,
        isBlue: false,
        intensity: pil.erupted ? 1.55 : 0.85
      });
    }
    return lights;
  }

  renderGroundDecals(ctx, gy) {
    for (const d of this.decals) {
      const alpha = Math.min(1, (1 - d.life / d.maxLife) * 1.5);
      ctx.save();
      const bx = Math.round(d.x / 4) * 4;
      const by = Math.round(gy / 4) * 4;
      ctx.globalAlpha = alpha;

      // Pixel-stepped scorch crater
      const wSteps = Math.max(4, Math.round(d.width / 8));
      for (let i = -wSteps; i <= wSteps; i++) {
        const frac = 1 - Math.abs(i) / (wSteps + 1);
        const hSpan = Math.max(4, Math.round(frac * 12 / 4) * 4);
        ctx.fillStyle = 'rgba(4, 5, 10, 0.78)';
        ctx.fillRect(bx + i * 8 - 4, by - hSpan * 0.5, 8, hSpan);
      }

      if (d.type === 'fissure') {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = -5; i <= 5; i++) {
          const fx = bx + i * 16 + Math.round(Math.sin(d.seed + i) * 6 / 4) * 4;
          const fy = by + ((i % 2 === 0 ? 1 : -1) * 4);
          ctx.fillStyle = d.color;
          ctx.fillRect(fx - 6, fy - 2, 12, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(fx - 2, fy - 1, 4, 2);
        }
      }
      ctx.restore();
    }
  }

  renderMainPass(ctx, isReflection = false, renderer = null) {
    ctx.save();

    // 1. FLAME PILLARS: Pixel-Art Solar Sigil + Spiraling 5-Tone Hellfire Tornado
    for (const pil of this.pillars) {
      const p = Math.min(1, pil.life / 0.42);
      const pxSize = 6;
      const baseX = Math.round(pil.x / pxSize) * pxSize;
      const baseY = Math.round(pil.groundY / pxSize) * pxSize;

      // Ground Pixel Solar Octagram Sigil
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rX = 76 * p;
      const rY = 22 * p;
      const rot = pil.life * 3.8;
      for (let deg = 0; deg < 360; deg += 15) {
        const a = (deg * Math.PI) / 180 + rot;
        const sx = Math.round((baseX + Math.cos(a) * rX) / 4) * 4;
        const sy = Math.round((baseY + Math.sin(a) * rY) / 4) * 4;
        ctx.fillStyle = deg % 45 === 0 ? '#ffffff' : '#facc15';
        ctx.fillRect(sx - 3, sy - 2, 6, 4);
      }
      ctx.restore();

      if (pil.erupted && pil.life < pil.maxLife - 0.08) {
        const fade = Math.min(1, (pil.maxLife - pil.life) * 3.2);
        const rows = 46;
        ctx.save();
        if (renderer && !isReflection) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.65;
          ctx.drawImage(renderer.glowOrange, baseX - 150, baseY - 290, 300, 320);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * (isReflection ? 0.45 : 0.95);

        for (let row = 0; row < rows; row++) {
          const hFrac = row / rows;
          const sway = Math.round(Math.sin(pil.life * 20 - row * 0.42) * (1 + hFrac * 3.0));
          const halfSpan = Math.max(1, Math.round((1 - hFrac * 0.58) * 6));
          for (let col = -halfSpan; col <= halfSpan; col++) {
            const edge = Math.abs(col) / (halfSpan + 0.5);
            const n = Math.sin(pil.life * 26 - row * 1.15 + col * 1.6);
            if (hFrac + edge * 0.42 + n * 0.16 > 0.98) continue;
            const heat = 1 - hFrac * 0.68 - edge * 0.35;
            ctx.fillStyle =
              heat > 0.72
                ? '#ffffff'
                : heat > 0.5
                  ? '#fef08a'
                  : heat > 0.28
                    ? '#fb923c'
                    : heat > 0.12
                      ? '#dc2626'
                      : '#7c2d12';
            ctx.fillRect(
              baseX + (col + sway) * pxSize - pxSize * 0.5,
              baseY - (row + 1) * pxSize,
              pxSize,
              pxSize
            );
          }

          // Spiraling outer pixel-fire ribbon
          const ribCol = Math.round(Math.sin(pil.life * 24 - row * 0.38) * (halfSpan + 2));
          ctx.fillStyle = row % 2 === 0 ? '#fef08a' : '#fb923c';
          ctx.fillRect(baseX + ribCol * pxSize, baseY - (row + 1) * pxSize, pxSize, pxSize);
        }
        ctx.restore();
      }
    }

    // 2. PARTICLES: Stepped Pixel-Art Embers & Sparks
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const s = Math.max(2, Math.round((p.size * (1 - t) + p.endSize * t) / 2) * 2);
      ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
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

    // 3. SLASHES: Multi-Tone Stepped HD-2D Pixel-Art Crescent Blade Waves
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.slashes) {
      const t = s.life / s.maxLife;
      const alpha = 1 - t;
      const isFullCircle = Math.abs(s.endAngle - s.startAngle) > Math.PI * 1.8;
      const steps = isFullCircle ? 42 : 28;
      ctx.globalAlpha = alpha * (isReflection ? 0.5 : 0.95);
      const outerTone = s.color === '#38bdf8' || s.color === '#7dd3fc' ? '#0284c7' : '#ea580c';
      const midTone = s.color;
      const innerTone = s.color === '#38bdf8' || s.color === '#7dd3fc' ? '#bae6fd' : '#fef08a';

      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const ang = s.startAngle + (s.endAngle - s.startAngle) * u;
        const env = isFullCircle ? 0.85 : Math.sin(u * Math.PI);
        const rad = s.radius + t * 14;
        const rx = rad;
        const ry = isFullCircle ? rad * 0.34 : rad;
        const px = Math.round((s.x + Math.cos(ang) * rx) / 4) * 4;
        const py = Math.round((s.y + Math.sin(ang) * ry) / 4) * 4;
        const sz = Math.max(4, Math.round(env * 18 * (1 - t * 0.45) / 4) * 4);

        ctx.fillStyle = outerTone;
        ctx.fillRect(px - sz * 0.65, py - sz * 0.65, sz * 1.3, sz * 1.3);
        ctx.fillStyle = midTone;
        ctx.fillRect(px - sz * 0.45, py - sz * 0.45, sz * 0.9, sz * 0.9);
        if (sz >= 8) {
          ctx.fillStyle = innerTone;
          ctx.fillRect(px - sz * 0.3, py - sz * 0.3, sz * 0.6, sz * 0.6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }
    }

    // 4. SHOCKWAVES: 3D Perspective Pixel-Art Expanding Rune Rings
    for (const sw of this.shockwaves) {
      const t = sw.life / sw.maxLife;
      const r = sw.maxRadius * (1 - Math.pow(1 - t, 3));
      const yScale = sw.flat ? 0.28 : 1.0;
      const nodes = 28;
      ctx.globalAlpha = (1 - t) * (isReflection ? 0.5 : 0.92);

      for (let i = 0; i < nodes; i++) {
        const a = (i / nodes) * Math.PI * 2 + t * 1.5;
        const px = Math.round((sw.x + Math.cos(a) * r) / 4) * 4;
        const py = Math.round((sw.y + Math.sin(a) * r * yScale) / 4) * 4;
        const block = Math.max(4, Math.round((1 - t) * 10 / 2) * 2);
        ctx.fillStyle = sw.color;
        ctx.fillRect(px - block * 0.5, py - block * 0.5, block, block);
        if (i % 4 === 0 && sw.flat) {
          // Rising pixel-art energy tooth on ground shockwaves
          const toothH = Math.max(4, Math.round((1 - t) * 22 / 4) * 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py - toothH, 4, toothH);
        }
      }
    }

    // 5. PROJECTILES: Stepped Pixel-Art Solar Fireballs & Molten Meteor Cataclysm
    ctx.globalAlpha = 1;
    for (const proj of this.projectiles) {
      const r = proj.radius * 2.8;
      const px = Math.round(proj.x / 4) * 4;
      const py = Math.round(proj.y / 4) * 4;
      if (renderer) {
        const tex = proj.color === '#38bdf8' ? renderer.glowCyan : renderer.glowOrange;
        ctx.drawImage(tex, px - r, py - r, r * 2, r * 2);
      }

      if (proj.isMeteor) {
        // Colossal Molten Pixel-Art Asteroid + Roaring Pixel-Fire Wake
        const dirX = -proj.vx / (Math.hypot(proj.vx, proj.vy) || 1);
        const dirY = -proj.vy / (Math.hypot(proj.vx, proj.vy) || 1);
        const pSize = 6;
        for (let wStep = 12; wStep >= 1; wStep--) {
          const wx = Math.round((px + dirX * wStep * 9) / pSize) * pSize;
          const wy = Math.round((py + dirY * wStep * 9) / pSize) * pSize;
          const span = Math.max(1, Math.round((1 - wStep / 13) * 5));
          for (let c = -span; c <= span; c++) {
            ctx.fillStyle = wStep < 4 ? '#fef08a' : wStep < 8 ? '#fb923c' : '#dc2626';
            ctx.fillRect(wx + c * pSize, wy - c * pSize * 0.5, pSize, pSize);
          }
        }
        // Stepped Pixel Meteor Head
        for (let my = -5; my <= 5; my++) {
          for (let mx = -5; mx <= 5; mx++) {
            const d = Math.hypot(mx, my);
            if (d > 5.2) continue;
            ctx.fillStyle =
              d < 2.0 ? '#ffffff' : d < 3.4 ? '#fef08a' : (mx + my) % 2 === 0 ? '#ea580c' : '#292524';
            ctx.fillRect(px + mx * pSize - pSize * 0.5, py + my * pSize - pSize * 0.5, pSize, pSize);
          }
        }
      } else {
        // Stepped 4-Tone Pixel-Art Fireball / Reflected Arcane Orb
        const cs = Math.max(4, Math.round(proj.radius * 0.95 / 2) * 2);
        const outerCol = proj.color === '#38bdf8' ? '#0284c7' : '#dc2626';
        ctx.fillStyle = outerCol;
        ctx.fillRect(px - cs * 1.3, py - cs * 0.8, cs * 2.6, cs * 1.6);
        ctx.fillRect(px - cs * 0.8, py - cs * 1.3, cs * 1.6, cs * 2.6);
        ctx.fillStyle = proj.color;
        ctx.fillRect(px - cs, py - cs * 0.6, cs * 2, cs * 1.2);
        ctx.fillRect(px - cs * 0.6, py - cs, cs * 1.2, cs * 2);
        ctx.fillStyle = proj.coreColor;
        ctx.fillRect(px - cs * 0.6, py - cs * 0.6, cs * 1.2, cs * 1.2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - cs * 0.3, py - cs * 0.3, cs * 0.6, cs * 0.6);
        if (!isReflection) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(px - cs * 2.4, py - 1, cs * 4.8, 2);
        }
      }
    }

    // 6. LIGHTNINGS: Stepped Pixel-Art Skyward Thunderbolts
    for (const l of this.lightnings) {
      const t = l.life / l.maxLife;
      ctx.globalAlpha = 1 - t;
      for (let idx = 0; idx < l.pts.length - 1; idx++) {
        const p0 = l.pts[idx];
        const p1 = l.pts[idx + 1];
        const steps = 6;
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const lx = Math.round((p0.x + (p1.x - p0.x) * u) / 4) * 4;
          const ly = Math.round((p0.y + (p1.y - p0.y) * u) / 4) * 4;
          const wOuter = Math.max(4, Math.round((1 - t) * 16 / 4) * 4);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(lx - wOuter * 0.5, ly - 4, wOuter, 8);
          ctx.fillStyle = l.color;
          ctx.fillRect(lx - wOuter * 0.25, ly - 4, wOuter * 0.5, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(lx - 2, ly - 4, 4, 8);
        }
      }
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
