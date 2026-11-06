export class VFXManager {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
    this.slashes = [];
    this.decals = [];
    this.projectiles = [];
    this.pillars = [];
    this.lightnings = [];
    this.skyStrikes = [];
    this.tornados = [];
    this.beams = [];
    this.glyphs = [];
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
    this.skyStrikes.length = 0;
    this.tornados.length = 0;
    this.beams.length = 0;
    this.glyphs.length = 0;
    this.texts.length = 0;
  }

  spawnParticle(opts) {
    if (this.particles.length > 320) this.particles.shift();
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

  spawnGlyphBurst(x, y, count = 6, theme = 'steel') {
    const sets = {
      steel: { chars: ['ᚦ', 'ᚱ', 'ᛉ', 'ᛋ', 'ᛏ', 'ᛟ'], col: '#38bdf8', core: '#e0f2fe' },
      arcane: { chars: ['☉', '✦', '✴', '☼', '🜂', '❖'], col: '#fb923c', core: '#fef08a' },
      emerald: { chars: ['✦', '❖', '⟡', '🍃', '✧', '✵'], col: '#10b981', core: '#fef08a' }
    };
    const cfg = sets[theme] || sets.steel;
    for (let i = 0; i < count; i++) {
      if (this.glyphs.length > 48) this.glyphs.shift();
      const ang = -Math.PI * 0.85 + (i / Math.max(1, count - 1)) * Math.PI * 0.7 + (Math.random() - 0.5) * 0.35;
      const spd = 90 + Math.random() * 130;
      this.glyphs.push({
        x: x + (Math.random() - 0.5) * 28,
        y: y + (Math.random() - 0.5) * 24,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 45,
        char: cfg.chars[i % cfg.chars.length],
        color: cfg.col,
        coreColor: cfg.core,
        theme,
        rot: (Math.random() - 0.5) * 0.8,
        vRot: (Math.random() - 0.5) * 4.5,
        size: 13 + Math.floor(Math.random() * 6),
        life: 0,
        maxLife: 0.65 + Math.random() * 0.35
      });
    }
  }

  spawnSlash(x, y, radius, startAngle, endAngle, color = '#38bdf8', duration = 0.28) {
    this.slashes.push({ x, y, radius, startAngle, endAngle, color, life: 0, maxLife: duration });
  }

  spawnShockwave(x, y, maxRadius, color = '#38bdf8', duration = 0.42, flat = false, vertical = false) {
    this.shockwaves.push({ x, y, maxRadius, color, life: 0, maxLife: duration, flat, vertical });
  }

  spawnDecal(x, width, type = 'scorch', color = '#fb923c', duration = 5.5) {
    if (this.decals.length > 12) this.decals.shift();
    this.decals.push({ x, width, type, color, life: 0, maxLife: duration, seed: Math.random() * 100 });
  }

  spawnLightning(x, topY, bottomY, color = '#fde08a', mainColor = '#38bdf8') {
    const pts = [{ x, y: topY }];
    const steps = 12;
    for (let i = 1; i < steps; i++) {
      pts.push({
        x: x + (Math.random() - 0.5) * 86,
        y: topY + ((bottomY - topY) * i) / steps
      });
    }
    pts.push({ x, y: bottomY });
    this.lightnings.push({ pts, color, mainColor, life: 0, maxLife: 0.38 });
  }

  spawnFlamePillar(x, groundY, owner, target, opts = {}) {
    this.pillars.push({
      x,
      groundY,
      owner,
      target,
      life: 0,
      maxLife: opts.maxLife || 1.55,
      delay: opts.delay || 0.38,
      scaleWidth: opts.scaleWidth || 1.0,
      theme: opts.theme || 'arcane',
      erupted: false,
      tickTimer: 0
    });
  }

  spawnTornado(opts) {
    this.tornados.push({
      x: opts.x,
      groundY: opts.groundY,
      vx: opts.vx || 0,
      followFighter: opts.followFighter || null,
      radius: opts.radius || 68,
      height: opts.height || 260,
      color: opts.color || '#10b981',
      coreColor: opts.coreColor || '#fef08a',
      life: 0,
      maxLife: opts.maxLife || 1.25
    });
  }

  spawnBeam(opts) {
    this.beams.push({
      x1: opts.x1,
      y1: opts.y1,
      x2: opts.x2,
      y2: opts.y2,
      width: opts.width || 46,
      color: opts.color || '#10b981',
      coreColor: opts.coreColor || '#fef08a',
      life: 0,
      maxLife: opts.maxLife || 0.58
    });
  }

  spawnSkyStrike(opts) {
    this.skyStrikes.push({
      x: opts.x,
      y: opts.y ?? -180,
      targetX: opts.targetX ?? opts.x,
      groundY: opts.groundY || 520,
      vx: opts.vx || 0,
      vy: opts.vy || 1150,
      type: opts.type || 'starfall_arrow', // 'starfall_arrow' | 'runeblade' | 'solar_lance'
      color: opts.color || '#10b981',
      coreColor: opts.coreColor || '#fef08a',
      owner: opts.owner || null,
      target: opts.target || null,
      damage: opts.damage || 28,
      delay: opts.delay || 0,
      impacted: false,
      linger: 0,
      maxLinger: opts.maxLinger || 0.48
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
      type: opts.type || (opts.isMeteor ? 'meteor' : 'fireball'),
      isMeteor: !!opts.isMeteor,
      pierce: !!opts.pierce,
      age: 0,
      ringTimer: 0
    });
  }

  spawnDamageText(x, y, amount, isCrit = false, label = '', customColor = '') {
    this.texts.push({
      x: x + (Math.random() - 0.5) * 26,
      y: y - 24,
      vy: isCrit ? -105 : -70,
      text: label || `${Math.round(amount)}${isCrit ? '!' : ''}`,
      isCrit,
      color: customColor || (label ? '#38bdf8' : isCrit ? '#facc15' : '#f8fafc'),
      life: 0,
      maxLife: isCrit ? 1.0 : 0.8
    });
  }

  update(dt, groundY, renderer, audio = null) {
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

    for (let i = this.glyphs.length - 1; i >= 0; i--) {
      const g = this.glyphs[i];
      g.life += dt;
      if (g.life >= g.maxLife) {
        this.glyphs.splice(i, 1);
        continue;
      }
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= 0.95;
      g.vy = g.vy * 0.95 - 28 * dt;
      g.rot += g.vRot * dt;
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
    stepList(this.beams);

    for (let i = this.tornados.length - 1; i >= 0; i--) {
      const tor = this.tornados[i];
      tor.life += dt;
      if (tor.followFighter && !tor.followFighter.isDead) {
        tor.x = tor.followFighter.x;
      } else {
        tor.x += tor.vx * dt;
      }
      if (Math.random() < 0.65) {
        const h = Math.random() * tor.height;
        const r = tor.radius * (0.35 + (h / tor.height) * 0.85);
        const a = tor.life * 18 + h * 0.05;
        this.spawnParticle({
          x: tor.x + Math.cos(a) * r,
          y: tor.groundY - h,
          vx: -Math.sin(a) * 140,
          vy: -120 - Math.random() * 90,
          size: 5,
          color: Math.random() > 0.35 ? tor.color : tor.coreColor,
          maxLife: 0.32
        });
      }
      if (tor.life >= tor.maxLife) this.tornados.splice(i, 1);
    }

    for (let i = this.skyStrikes.length - 1; i >= 0; i--) {
      const s = this.skyStrikes[i];
      if (s.delay > 0) {
        s.delay -= dt;
        continue;
      }
      if (!s.impacted) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (Math.random() < 0.7) {
          this.spawnParticle({
            x: s.x + (Math.random() - 0.5) * 12,
            y: s.y - 18,
            vx: -s.vx * 0.1,
            vy: -60,
            size: s.type === 'runeblade' ? 7 : 5,
            color: Math.random() > 0.4 ? s.color : s.coreColor,
            maxLife: 0.26
          });
        }
        if (s.y >= s.groundY) {
          s.y = s.groundY;
          s.impacted = true;
          this.spawnShockwave(s.x, s.groundY, s.type === 'runeblade' ? 115 : 78, s.color, 0.34, true);
          this.spawnBurst(s.x, s.groundY - 8, s.type === 'runeblade' ? 14 : 9, s.color, 210, {
            upBias: 110,
            size: 6
          });
          this.spawnDecal(s.x, s.type === 'runeblade' ? 76 : 48, 'fissure', s.color, 3.8);
          if (renderer) renderer.triggerShake(s.type === 'runeblade' ? 9 : 5, 0.18);
          if (s.target && !s.target.isDead && Math.abs(s.target.x - s.x) < 92) {
            s.target.takeDamage(s.damage, s.owner, s.type === 'runeblade', 55, -60);
          }
        }
      } else {
        s.linger += dt;
        if (s.linger >= s.maxLinger) {
          this.skyStrikes.splice(i, 1);
        }
      }
    }

    for (let i = this.pillars.length - 1; i >= 0; i--) {
      const pil = this.pillars[i];
      pil.life += dt;
      if (!pil.erupted && pil.target && pil.scaleWidth >= 0.95) {
        pil.x += (pil.target.x - pil.x) * 3.5 * dt;
      }
      if (pil.life >= pil.delay && !pil.erupted) {
        pil.erupted = true;
        if (renderer) renderer.triggerShake(12 * pil.scaleWidth, 0.38);
        const col = pil.theme === 'emerald' ? '#10b981' : pil.theme === 'steel' ? '#38bdf8' : '#fb923c';
        this.spawnDecal(pil.x, 110 * pil.scaleWidth, 'fissure', col, 4.8);
        this.spawnShockwave(pil.x, groundY, 135 * pil.scaleWidth, '#facc15', 0.44, true);
        this.spawnGlyphBurst(pil.x, groundY - 40, 6, pil.theme);
      }
      if (pil.erupted && pil.life < pil.maxLife - 0.12) {
        const colMain = pil.theme === 'emerald' ? '#10b981' : pil.theme === 'steel' ? '#38bdf8' : '#fb923c';
        for (let k = 0; k < 3; k++) {
          const spiral = Math.sin(pil.life * 22 + k * 2) * 42 * pil.scaleWidth;
          this.spawnParticle({
            x: pil.x + spiral,
            y: groundY - Math.random() * 28,
            vx: (Math.random() - 0.5) * 44,
            vy: -300 - Math.random() * 210,
            size: (12 + Math.random() * 8) * pil.scaleWidth,
            color: k % 2 === 0 ? colMain : '#fef08a',
            maxLife: 0.44,
            gravity: -110
          });
        }
        pil.tickTimer += dt;
        if (pil.tickTimer >= 0.25 && pil.target && !pil.target.isDead) {
          pil.tickTimer = 0;
          if (Math.abs(pil.target.x - pil.x) < 88 * pil.scaleWidth && groundY - pil.target.y < 155) {
            pil.target.takeDamage(Math.round(28 * pil.scaleWidth), pil.owner, false, 35, -55);
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
      const colorType =
        f.primaryColor === '#38bdf8' ? 'cyan' : f.primaryColor === '#10b981' ? 'emerald' : 'orange';
      lights.push({
        x: f.x,
        y: f.y - 45,
        radius: f.state === 'ULTIMATE' ? 270 : f.state === 'SKILL' ? 205 : 148,
        colorType,
        intensity: f.state === 'ULTIMATE' ? 1.65 : f.state === 'SKILL' ? 1.3 : 0.95
      });
    }
    for (const p of this.projectiles) {
      const colorType =
        p.color === '#38bdf8' ? 'cyan' : p.color === '#10b981' || p.color === '#34d399' ? 'emerald' : 'orange';
      lights.push({
        x: p.x,
        y: p.y,
        radius: p.isMeteor ? 360 : 175,
        colorType,
        intensity: p.isMeteor ? 1.85 : 1.25
      });
    }
    for (const pil of this.pillars) {
      lights.push({
        x: pil.x,
        y: gy - 70,
        radius: pil.erupted ? 255 : 150,
        colorType: pil.theme === 'emerald' ? 'emerald' : pil.theme === 'steel' ? 'cyan' : 'orange',
        intensity: pil.erupted ? 1.6 : 0.9
      });
    }
    for (const tor of this.tornados) {
      lights.push({
        x: tor.x,
        y: gy - 90,
        radius: 260,
        colorType: tor.color === '#38bdf8' ? 'cyan' : 'emerald',
        intensity: 1.55
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

      const wSteps = Math.max(4, Math.round(d.width / 8));
      for (let i = -wSteps; i <= wSteps; i++) {
        const frac = 1 - Math.abs(i) / (wSteps + 1);
        const hSpan = Math.max(4, Math.round((frac * 12) / 4) * 4);
        ctx.fillStyle = 'rgba(4, 5, 10, 0.78)';
        ctx.fillRect(bx + i * 8 - 4, by - hSpan * 0.5, 8, hSpan);
      }

      if (d.type === 'fissure') {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = -5; i <= 5; i++) {
          const fx = bx + i * 16 + Math.round((Math.sin(d.seed + i) * 6) / 4) * 4;
          const fy = by + (i % 2 === 0 ? 1 : -1) * 4;
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

    // 1. TORNADOS: Swirling 3D-Perspective HD-2D Pixel Vortex Columns (Whirlwind & Astral Hurricane)
    for (const tor of this.tornados) {
      const fade = Math.min(1, (tor.maxLife - tor.life) * 3.5, tor.life * 5.0);
      const pxSize = 5;
      const baseX = Math.round(tor.x / pxSize) * pxSize;
      const baseY = Math.round(tor.groundY / pxSize) * pxSize;
      const rows = Math.round(tor.height / pxSize);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * (isReflection ? 0.42 : 0.88);
      if (renderer && !isReflection) {
        const glow = tor.color === '#38bdf8' ? renderer.glowCyan : renderer.glowEmerald || renderer.glowCyan;
        ctx.drawImage(glow, baseX - 160, baseY - tor.height, 320, tor.height + 40);
      }

      for (let r = 0; r < rows; r++) {
        const hFrac = r / rows;
        const coneR = tor.radius * (0.32 + Math.pow(hFrac, 0.85) * 0.95);
        const sway = Math.sin(tor.life * 16 - hFrac * 7) * 14 * hFrac;
        const rot = tor.life * 20 - hFrac * 11;
        for (let strand = 0; strand < 3; strand++) {
          const a = rot + (strand * Math.PI * 2) / 3;
          const rx = Math.round((baseX + sway + Math.cos(a) * coneR) / 4) * 4;
          const ry = Math.round((baseY - r * pxSize + Math.sin(a) * coneR * 0.22) / 4) * 4;
          const wBand = Math.max(8, Math.round((14 + hFrac * 18) / 4) * 4);
          ctx.fillStyle = strand === 0 ? '#ffffff' : strand === 1 ? tor.coreColor : tor.color;
          ctx.fillRect(rx - wBand * 0.5, ry - 2, wBand, 4);
        }
      }
      ctx.restore();
    }

    // 2. FLAME & ELEMENTAL PILLARS: Pixel-Art Sacred Sigil + Spiraling 5-Tone Tornado
    for (const pil of this.pillars) {
      const p = Math.min(1, pil.life / Math.max(0.15, pil.delay));
      const pxSize = 6;
      const baseX = Math.round(pil.x / pxSize) * pxSize;
      const baseY = Math.round(pil.groundY / pxSize) * pxSize;
      const isEmerald = pil.theme === 'emerald';
      const isSteel = pil.theme === 'steel';
      const sigilCol = isEmerald ? '#34d399' : isSteel ? '#38bdf8' : '#facc15';

      // Ground Pixel Octagram Sigil + Overhead Matching Sky Sigil
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rX = 76 * p * pil.scaleWidth;
      const rY = 22 * p * pil.scaleWidth;
      const rot = pil.life * 4.2;
      for (let deg = 0; deg < 360; deg += 15) {
        const a = (deg * Math.PI) / 180 + rot;
        const sx = Math.round((baseX + Math.cos(a) * rX) / 4) * 4;
        const sy = Math.round((baseY + Math.sin(a) * rY) / 4) * 4;
        ctx.fillStyle = deg % 45 === 0 ? '#ffffff' : sigilCol;
        ctx.fillRect(sx - 3, sy - 2, 6, 4);
      }
      ctx.restore();

      if (pil.erupted && pil.life < pil.maxLife - 0.08) {
        const fade = Math.min(1, (pil.maxLife - pil.life) * 3.2);
        const rows = Math.round(48 * pil.scaleWidth);
        ctx.save();
        if (renderer && !isReflection) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.68;
          const glow = isEmerald
            ? renderer.glowEmerald || renderer.glowCyan
            : isSteel
              ? renderer.glowCyan
              : renderer.glowOrange;
          ctx.drawImage(glow, baseX - 150, baseY - 290, 300, 320);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * (isReflection ? 0.45 : 0.95);

        const maxCols = Math.max(2, Math.round(6 * pil.scaleWidth));
        for (let row = 0; row < rows; row++) {
          const hFrac = row / rows;
          const sway = Math.round(Math.sin(pil.life * 20 - row * 0.42) * (1 + hFrac * 3.0));
          const halfSpan = Math.max(1, Math.round((1 - hFrac * 0.55) * maxCols));
          for (let col = -halfSpan; col <= halfSpan; col++) {
            const edge = Math.abs(col) / (halfSpan + 0.5);
            const n = Math.sin(pil.life * 26 - row * 1.15 + col * 1.6);
            if (hFrac + edge * 0.42 + n * 0.16 > 0.98) continue;
            const heat = 1 - hFrac * 0.68 - edge * 0.35;
            if (isEmerald) {
              ctx.fillStyle =
                heat > 0.72
                  ? '#ffffff'
                  : heat > 0.5
                    ? '#fef08a'
                    : heat > 0.28
                      ? '#34d399'
                      : heat > 0.12
                        ? '#059669'
                        : '#064e3b';
            } else if (isSteel) {
              ctx.fillStyle =
                heat > 0.72
                  ? '#ffffff'
                  : heat > 0.5
                    ? '#bae6fd'
                    : heat > 0.28
                      ? '#38bdf8'
                      : heat > 0.12
                        ? '#0284c7'
                        : '#0c4a6e';
            } else {
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
            }
            ctx.fillRect(
              baseX + (col + sway) * pxSize - pxSize * 0.5,
              baseY - (row + 1) * pxSize,
              pxSize,
              pxSize
            );
          }

          const ribCol = Math.round(Math.sin(pil.life * 24 - row * 0.38) * (halfSpan + 2));
          ctx.fillStyle = row % 2 === 0 ? '#fef08a' : sigilCol;
          ctx.fillRect(baseX + ribCol * pxSize, baseY - (row + 1) * pxSize, pxSize, pxSize);
        }
        ctx.restore();
      }
    }

    // 3. SKY STRIKES: Spectral Runeblades, Starfall Astral Arrows & Solar Lances
    for (const s of this.skyStrikes) {
      if (s.delay > 0) continue;
      const fade = s.impacted ? Math.max(0, 1 - s.linger / s.maxLinger) : 1;
      const sx = Math.round(s.x / 4) * 4;
      const sy = Math.round(s.y / 4) * 4;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * (isReflection ? 0.5 : 0.95);

      if (s.type === 'runeblade') {
        // Colossal Spectral Runeblade of Pure Cyan-White Light Impaling the Ground
        const bladeH = 136;
        // Outer cyan aura blade
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(sx - 14, sy - bladeH, 28, bladeH - 8);
        // Inner bright blade
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx - 9, sy - bladeH + 4, 18, bladeH - 12);
        // White-hot fuller core
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 4, sy - bladeH + 8, 8, bladeH - 12);
        // Ornate Gold-Cyan Crossguard & Pommel
        ctx.fillStyle = '#facc15';
        ctx.fillRect(sx - 28, sy - bladeH + 18, 56, 8);
        ctx.fillRect(sx - 8, sy - bladeH - 22, 16, 14);
      } else {
        // Starfall Emerald-Gold Arrow or Solar Lance
        const ang = Math.atan2(s.vy, s.vx || 0.01);
        ctx.translate(sx, sy);
        ctx.rotate(ang - Math.PI * 0.5);
        // Glowing shaft
        ctx.fillStyle = s.color;
        ctx.fillRect(-4, -68, 8, 68);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -64, 4, 62);
        // Broadhead tip
        ctx.fillStyle = s.coreColor;
        ctx.fillRect(-8, -14, 16, 10);
        ctx.fillRect(-4, -6, 8, 8);
        // Radiant fletching feathers
        ctx.fillStyle = s.color;
        ctx.fillRect(-10, -72, 20, 12);
        ctx.fillStyle = s.coreColor;
        ctx.fillRect(-6, -70, 12, 8);
      }
      ctx.restore();
    }

    // 4. COLOSSAL BEAMS: Astral Dragon-Arrow Beam & Orbital Solar Laser
    for (const b of this.beams) {
      const t = b.life / b.maxLife;
      const env = Math.sin(t * Math.PI);
      const wOuter = Math.max(8, Math.round((b.width * env) / 4) * 4);
      const wMid = Math.max(4, Math.round((wOuter * 0.65) / 4) * 4);
      const wCore = Math.max(4, Math.round((wOuter * 0.35) / 4) * 4);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - t * 0.4) * (isReflection ? 0.45 : 0.95);

      const dx = b.x2 - b.x1;
      const dy = b.y2 - b.y1;
      const dist = Math.hypot(dx, dy) || 1;
      const ang = Math.atan2(dy, dx);

      ctx.translate(b.x1, b.y1);
      ctx.rotate(ang);

      ctx.fillStyle = b.color;
      ctx.fillRect(0, -wOuter * 0.5, dist, wOuter);
      ctx.fillStyle = b.coreColor;
      ctx.fillRect(0, -wMid * 0.5, dist, wMid);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -wCore * 0.5, dist, wCore);

      // Double-helix energy ribbons wrapping along the beam length
      const stepPx = 16;
      for (let x = 0; x < dist; x += stepPx) {
        const wave = Math.sin(x * 0.045 - b.life * 28) * (wOuter * 0.85);
        ctx.fillStyle = b.coreColor;
        ctx.fillRect(x, wave - 4, 12, 8);
        ctx.fillStyle = b.color;
        ctx.fillRect(x, -wave - 4, 12, 8);
      }
      ctx.restore();
    }

    // 5. PARTICLES: Stepped Pixel-Art Embers & Sparks
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const s = Math.max(2, Math.round(((p.size * (1 - t) + p.endSize * t) / 2)) * 2);
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

    // 6. SLASHES: Multi-Tone Stepped HD-2D Pixel-Art Crescent Blade & Wind Waves
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.slashes) {
      const t = s.life / s.maxLife;
      const alpha = 1 - t;
      const isFullCircle = Math.abs(s.endAngle - s.startAngle) > Math.PI * 1.8;
      const steps = isFullCircle ? 42 : 28;
      ctx.globalAlpha = alpha * (isReflection ? 0.5 : 0.95);
      const isCyan = s.color === '#38bdf8' || s.color === '#7dd3fc' || s.color === '#0284c7';
      const isEmerald = s.color === '#10b981' || s.color === '#34d399' || s.color === '#6ee7b7';
      const outerTone = isCyan ? '#0284c7' : isEmerald ? '#059669' : '#ea580c';
      const midTone = s.color;
      const innerTone = isCyan ? '#bae6fd' : isEmerald ? '#a7f3d0' : '#fef08a';

      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const ang = s.startAngle + (s.endAngle - s.startAngle) * u;
        const env = isFullCircle ? 0.85 : Math.sin(u * Math.PI);
        const rad = s.radius + t * 14;
        const rx = rad;
        const ry = isFullCircle ? rad * 0.34 : rad;
        const px = Math.round((s.x + Math.cos(ang) * rx) / 4) * 4;
        const py = Math.round((s.y + Math.sin(ang) * ry) / 4) * 4;
        const sz = Math.max(4, Math.round((env * 18 * (1 - t * 0.45)) / 4) * 4);

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

    // 7. SHOCKWAVES: 3D Perspective Pixel-Art Expanding Rune & Sonic Boom Rings
    for (const sw of this.shockwaves) {
      const t = sw.life / sw.maxLife;
      const r = sw.maxRadius * (1 - Math.pow(1 - t, 3));
      const xScale = sw.vertical ? 0.34 : 1.0;
      const yScale = sw.flat ? 0.28 : 1.0;
      const nodes = 28;
      ctx.globalAlpha = (1 - t) * (isReflection ? 0.5 : 0.92);

      for (let i = 0; i < nodes; i++) {
        const a = (i / nodes) * Math.PI * 2 + t * 1.5;
        const px = Math.round((sw.x + Math.cos(a) * r * xScale) / 4) * 4;
        const py = Math.round((sw.y + Math.sin(a) * r * yScale) / 4) * 4;
        const block = Math.max(4, Math.round(((1 - t) * 10) / 2) * 2);
        ctx.fillStyle = sw.color;
        ctx.fillRect(px - block * 0.5, py - block * 0.5, block, block);
        if (i % 4 === 0 && sw.flat) {
          const toothH = Math.max(4, Math.round(((1 - t) * 22) / 4) * 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py - toothH, 4, toothH);
        }
      }
    }

    // 8. PROJECTILES: Astral Wind Arrows, Orbiting Solar Fireballs & Molten Meteors
    ctx.globalAlpha = 1;
    for (const proj of this.projectiles) {
      const r = proj.radius * 2.9;
      const px = Math.round(proj.x / 4) * 4;
      const py = Math.round(proj.y / 4) * 4;
      if (renderer) {
        const tex =
          proj.color === '#38bdf8'
            ? renderer.glowCyan
            : proj.color === '#10b981' || proj.color === '#34d399'
              ? renderer.glowEmerald || renderer.glowCyan
              : renderer.glowOrange;
        ctx.drawImage(tex, px - r, py - r, r * 2, r * 2);
      }

      if (proj.isMeteor) {
        const dirX = -proj.vx / (Math.hypot(proj.vx, proj.vy) || 1);
        const dirY = -proj.vy / (Math.hypot(proj.vx, proj.vy) || 1);
        const pSize = 6;
        for (let wStep = 14; wStep >= 1; wStep--) {
          const wx = Math.round((px + dirX * wStep * 9) / pSize) * pSize;
          const wy = Math.round((py + dirY * wStep * 9) / pSize) * pSize;
          const span = Math.max(1, Math.round((1 - wStep / 15) * 5));
          for (let c = -span; c <= span; c++) {
            ctx.fillStyle = wStep < 4 ? '#fef08a' : wStep < 9 ? '#fb923c' : '#dc2626';
            ctx.fillRect(wx + c * pSize, wy - c * pSize * 0.5, pSize, pSize);
          }
        }
        for (let my = -5; my <= 5; my++) {
          for (let mx = -5; mx <= 5; mx++) {
            const d = Math.hypot(mx, my);
            if (d > 5.2) continue;
            ctx.fillStyle =
              d < 2.0 ? '#ffffff' : d < 3.4 ? '#fef08a' : (mx + my) % 2 === 0 ? '#ea580c' : '#292524';
            ctx.fillRect(px + mx * pSize - pSize * 0.5, py + my * pSize - pSize * 0.5, pSize, pSize);
          }
        }
      } else if (proj.type === 'arrow') {
        // High-Velocity Emerald-Gold Astral Arrow + Corkscrew Wind Wake
        const ang = Math.atan2(proj.vy, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);

        // Corkscrew emerald wind spiral trailing behind arrow
        for (let w = 1; w <= 7; w++) {
          const wx = -w * 10;
          const wy = Math.sin(proj.age * 36 - w * 0.9) * 10;
          ctx.fillStyle = w % 2 === 0 ? '#fef08a' : '#34d399';
          ctx.fillRect(wx - 4, wy - 2, 8, 4);
        }

        // Outer emerald energy envelope
        ctx.fillStyle = '#059669';
        ctx.fillRect(-36, -6, 68, 12);
        // Golden-emerald shaft
        ctx.fillStyle = '#34d399';
        ctx.fillRect(-32, -4, 62, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-26, -2, 54, 4);
        // Starlight Arrowhead
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(18, -10, 14, 20);
        ctx.fillRect(28, -6, 12, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(34, -3, 10, 6);
        // Jade Fletching
        ctx.fillStyle = '#6ee7b7';
        ctx.fillRect(-38, -10, 14, 20);
        ctx.restore();
      } else {
        // Stepped 4-Tone Pixel-Art Solar Fireball + Orbiting Ember Satellites
        const cs = Math.max(4, Math.round((proj.radius * 0.95) / 2) * 2);
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

        // 3 Orbiting mini plasma satellites around fireball
        for (let sat = 0; sat < 3; sat++) {
          const sa = (proj.age || 0) * 16 + (sat * Math.PI * 2) / 3;
          const sx = Math.round((px + Math.cos(sa) * (cs * 1.8)) / 2) * 2;
          const sy = Math.round((py + Math.sin(sa) * (cs * 1.8)) / 2) * 2;
          ctx.fillStyle = sat === 0 ? '#ffffff' : proj.coreColor;
          ctx.fillRect(sx - 3, sy - 3, 6, 6);
        }
      }
    }

    // 9. LIGHTNINGS: Stepped Pixel-Art Skyward Thunderbolts
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
          const wOuter = Math.max(4, Math.round(((1 - t) * 16) / 4) * 4);
          ctx.fillStyle = l.mainColor || '#38bdf8';
          ctx.fillRect(lx - wOuter * 0.5, ly - 4, wOuter, 8);
          ctx.fillStyle = l.color;
          ctx.fillRect(lx - wOuter * 0.25, ly - 4, wOuter * 0.5, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(lx - 2, ly - 4, 4, 8);
        }
      }
    }

    // 10. RUNIC GLYPHS, SOLAR SIGILS & ASTRAL FEATHERS
    if (!isReflection) {
      for (const g of this.glyphs) {
        const p = g.life / g.maxLife;
        ctx.save();
        ctx.translate(Math.round(g.x / 2) * 2, Math.round(g.y / 2) * 2);
        ctx.rotate(g.rot);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, (1 - p) * 1.8);
        // Pixelated diamond rune backing + glyph symbol
        ctx.fillStyle = g.color;
        ctx.fillRect(-6, -6, 12, 12);
        ctx.fillStyle = g.coreColor;
        ctx.fillRect(-3, -3, 6, 6);
        ctx.font = `900 ${g.size}px "Cinzel", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(g.char, 0, 0);
        ctx.restore();
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
