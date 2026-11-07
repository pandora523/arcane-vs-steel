import { PixelFont } from './PixelFont.js';
import { PixelForge } from './PixelForge.js';

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
    this.crystalSpikes = [];
    this.supernovas = [];
    this.castAuras = [];
    this.hitImpacts = [];
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
    this.crystalSpikes.length = 0;
    this.supernovas.length = 0;
    this.castAuras.length = 0;
    this.hitImpacts.length = 0;
    this.glyphs.length = 0;
    this.texts.length = 0;
  }

  spawnHitImpact(x, y, attacker, isCrit = false) {
    const heroId = attacker?.heroId || 'warrior';
    const theme = attacker?.theme || 'steel';
    const dir = attacker ? Math.sign(x - attacker.x) || 1 : 1;
    if (this.hitImpacts.length > 18) this.hitImpacts.shift();
    this.hitImpacts.push({
      x,
      y,
      heroId,
      theme,
      dir,
      isCrit,
      rot: (Math.random() - 0.5) * 0.45,
      life: 0,
      maxLife: isCrit ? 0.42 : 0.3
    });
    this.spawnGlyphBurst(x, y - 8, isCrit ? 6 : 3, theme);
    if (theme !== 'abyssal' && theme !== 'chrono') {
      this.spawnShockwave(
        x,
        y,
        isCrit ? 92 : 64,
        attacker?.primaryColor || '#38bdf8',
        isCrit ? 0.3 : 0.22,
        false
      );
    }
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
      steel: { shape: 'rune', col: '#38bdf8', core: '#e0f2fe' },
      arcane: { shape: 'star', col: '#fb923c', core: '#fef08a' },
      emerald: { shape: 'feather', col: '#10b981', core: '#fef08a' },
      radiant: { shape: 'cross', col: '#fde047', core: '#ffffff' },
      abyssal: { shape: 'skull', col: '#c084fc', core: '#f43f5e' },
      chrono: { shape: 'cog', col: '#2dd4bf', core: '#facc15' },
      heal: { shape: 'cross', col: '#4ade80', core: '#fef08a' }
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
        shape: cfg.shape,
        variant: i % 3,
        color: cfg.col,
        coreColor: cfg.core,
        theme,
        rot: (Math.random() - 0.5) * 0.8,
        vRot: (Math.random() - 0.5) * 4.5,
        size: 12 + Math.floor(Math.random() * 4),
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

  spawnBeam(optsOrX1, y1, x2, y2, color = '#c084fc', width = 24, maxLife = 0.45) {
    const opts =
      typeof optsOrX1 === 'object'
        ? optsOrX1
        : { x1: optsOrX1, y1, x2, y2, color, coreColor: '#f43f5e', width, maxLife };
    this.beams.push({
      x1: opts.x1,
      y1: opts.y1,
      x2: opts.x2,
      y2: opts.y2,
      width: opts.width || 44,
      color: opts.color || '#10b981',
      coreColor: opts.coreColor || '#fef08a',
      life: 0,
      maxLife: opts.maxLife || 0.62
    });
  }

  spawnCrystalSpike(opts) {
    this.crystalSpikes.push({
      x: opts.x,
      groundY: opts.groundY || 520,
      height: opts.height || 135,
      width: opts.width || 38,
      tilt: opts.tilt || 0,
      color: opts.color || '#38bdf8',
      coreColor: opts.coreColor || '#e0f2fe',
      owner: opts.owner || null,
      target: opts.target || null,
      damage: opts.damage || 28,
      delay: opts.delay || 0,
      erupted: false,
      life: 0,
      maxLife: opts.maxLife || 0.88
    });
  }

  spawnEclipseSupernova(opts) {
    this.supernovas.push({
      x: opts.x,
      y: opts.y || 185,
      groundY: opts.groundY || 520,
      maxRadius: opts.maxRadius || 96,
      color: opts.color || '#fb923c',
      coreColor: opts.coreColor || '#fef08a',
      life: 0,
      maxLife: opts.maxLife || 1.25
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
      type: opts.type || 'starfall_arrow', // 'starfall_arrow' | 'runeblade' | 'solar_lance' | 'holy_spear'
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

  spawnSpecialCastAura(fighter, title, tag = '✦ SPECIAL SKILL ✦', theme = 'steel', isUltimate = false) {
    if (!fighter) return;
    // Replace any existing cast aura on the same fighter so head banners never overlap
    for (let i = this.castAuras.length - 1; i >= 0; i--) {
      if (this.castAuras[i].fighter === fighter) {
        this.castAuras.splice(i, 1);
      }
    }
    const palette =
      theme === 'arcane'
        ? { main: '#fb923c', core: '#fef08a', border: '#ea580c' }
        : theme === 'emerald'
          ? { main: '#34d399', core: '#fef08a', border: '#10b981' }
          : theme === 'radiant'
            ? { main: '#facc15', core: '#fef9c3', border: '#eab308' }
            : theme === 'abyssal'
              ? { main: '#c084fc', core: '#f43f5e', border: '#9333ea' }
              : theme === 'chrono'
                ? { main: '#2dd4bf', core: '#facc15', border: '#0d9488' }
                : { main: '#38bdf8', core: '#e0f2fe', border: '#0284c7' };

    this.castAuras.push({
      fighter,
      title: (title || 'SPECIAL MOVE').toUpperCase(),
      tag: tag.toUpperCase(),
      theme,
      isUltimate,
      mainColor: palette.main,
      coreColor: palette.core,
      borderColor: palette.border,
      life: 0,
      maxLife: isUltimate ? 1.65 : 1.15
    });

    // Immediate special-cast burst around the head & shoulders (skip circular shockwave ring for abyssal Reaper & chrono)
    if (theme !== 'abyssal' && theme !== 'chrono') {
      this.spawnShockwave(fighter.x, fighter.y - 105, isUltimate ? 145 : 95, palette.main, isUltimate ? 0.48 : 0.34, false);
    }
    this.spawnBurst(fighter.x, fighter.y - 105, isUltimate ? 22 : 12, palette.core, isUltimate ? 250 : 175, {
      upBias: 90,
      size: isUltimate ? 7 : 5
    });
    this.spawnGlyphBurst(fighter.x, fighter.y - 115, isUltimate ? 8 : 5, theme);
  }

  update(dt, groundY, renderer, audio = null) {
    for (let i = this.castAuras.length - 1; i >= 0; i--) {
      const ca = this.castAuras[i];
      ca.life += dt;
      if (!ca.fighter || ca.fighter.isDead || ca.life >= ca.maxLife) {
        this.castAuras.splice(i, 1);
        continue;
      }
      if (Math.random() < (ca.isUltimate ? 0.85 : 0.55)) {
        this.spawnParticle({
          x: ca.fighter.x + (Math.random() - 0.5) * 92,
          y: ca.fighter.y - 24 - Math.random() * 110,
          vx: (Math.random() - 0.5) * 40,
          vy: -135 - Math.random() * 95,
          size: ca.isUltimate ? 6 : 4,
          color: Math.random() > 0.4 ? ca.mainColor : ca.coreColor,
          maxLife: 0.34,
          gravity: -60
        });
      }
    }

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
    stepList(this.supernovas);
    stepList(this.hitImpacts);

    for (let i = this.crystalSpikes.length - 1; i >= 0; i--) {
      const cs = this.crystalSpikes[i];
      if (cs.delay > 0) {
        cs.delay -= dt;
        continue;
      }
      cs.life += dt;
      if (!cs.erupted) {
        cs.erupted = true;
        this.spawnShockwave(cs.x, cs.groundY, 68, cs.color, 0.28, true);
        this.spawnBurst(cs.x, cs.groundY - 12, 10, '#bae6fd', 190, { upBias: 95, size: 5 });
        this.spawnGlyphBurst(cs.x, cs.groundY - 45, 3, 'steel');
        if (cs.target && !cs.target.isDead && Math.abs(cs.target.x - cs.x) < 76) {
          cs.target.takeDamage(cs.damage, cs.owner, false, 65, -90);
        }
      }
      if (cs.life >= cs.maxLife) {
        this.crystalSpikes.splice(i, 1);
      }
    }

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
          if (audio) {
            audio.play(
              s.type === 'runeblade'
                ? 'clang'
                : s.type === 'holy_spear'
                  ? 'holy_hit'
                  : 'arrow_hit',
              s.x
            );
          }
          this.spawnShockwave(s.x, s.groundY, s.type === 'runeblade' ? 115 : 78, s.color, 0.34, true);
          this.spawnBurst(s.x, s.groundY - 8, s.type === 'runeblade' ? 14 : 9, s.color, 210, {
            upBias: 110,
            size: 6
          });
          this.spawnDecal(s.x, s.type === 'runeblade' ? 76 : 48, 'fissure', s.color, 3.8);
          if (renderer && s.type === 'runeblade') renderer.triggerShake(6, 0.14);
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
        if (renderer && pil.scaleWidth >= 0.95) renderer.triggerShake(8, 0.2);
        if (audio && pil.scaleWidth >= 0.95) {
          audio.play(pil.theme === 'radiant' ? 'holy_hit' : 'fire_hit', pil.x);
        }
        const col =
          pil.theme === 'emerald'
            ? '#10b981'
            : pil.theme === 'steel'
              ? '#38bdf8'
              : pil.theme === 'radiant'
                ? '#fde047'
                : '#fb923c';
        this.spawnDecal(pil.x, 110 * pil.scaleWidth, 'fissure', col, 4.8);
        this.spawnShockwave(pil.x, groundY, 135 * pil.scaleWidth, '#facc15', 0.44, true);
        this.spawnGlyphBurst(pil.x, groundY - 40, 6, pil.theme);
      }
      if (pil.erupted && pil.life < pil.maxLife - 0.12) {
        const colMain =
          pil.theme === 'emerald'
            ? '#10b981'
            : pil.theme === 'steel'
              ? '#38bdf8'
              : pil.theme === 'radiant'
                ? '#fde047'
                : '#fb923c';
        for (let k = 0; k < 3; k++) {
          const spiral = Math.sin(pil.life * 22 + k * 2) * 42 * pil.scaleWidth;
          this.spawnParticle({
            x: pil.x + spiral,
            y: groundY - Math.random() * 28,
            vx: (Math.random() - 0.5) * 44,
            vy: -300 - Math.random() * 210,
            size: (12 + Math.random() * 8) * pil.scaleWidth,
            color: k % 2 === 0 ? colMain : '#fef9c3',
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
        f.primaryColor === '#38bdf8'
          ? 'cyan'
          : f.primaryColor === '#10b981'
            ? 'emerald'
            : f.primaryColor === '#c084fc'
              ? 'violet'
              : 'orange';
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
        p.color === '#38bdf8'
          ? 'cyan'
          : p.color === '#10b981' || p.color === '#34d399'
            ? 'emerald'
            : p.color === '#c084fc'
              ? 'violet'
              : 'orange';
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
    ctx.imageSmoothingEnabled = false;
    const assets = PixelForge.initAssets();

    // 1. TORNADOS: Authentic 16-bit HD-2D Emerald Whirlwind Vortex & Glacial Cyclone Columns
    for (const tor of this.tornados) {
      const fade = Math.min(1, (tor.maxLife - tor.life) * 3.5, tor.life * 5.0);
      const pxSize = 5;
      const baseX = Math.round(tor.x / pxSize) * pxSize;
      const baseY = Math.round(tor.groundY / pxSize) * pxSize;
      const rows = Math.round(tor.height / pxSize);
      const isSteel = tor.color === '#38bdf8';

      ctx.save();
      if (renderer && !isReflection) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.36;
        const glow = isSteel ? renderer.glowCyan : renderer.glowEmerald || renderer.glowCyan;
        ctx.drawImage(glow, baseX - 150, baseY - tor.height, 300, tor.height + 36);
      }

      const archerVfx = assets.archer?.vfx;
      const warriorVfx = assets.warrior?.vfx;
      if (!isSteel && archerVfx && archerVfx.complete && archerVfx.naturalWidth) {
        ctx.save();
        ctx.translate(baseX, baseY - tor.height * 0.48);
        const flipSpin = Math.floor(tor.life * 14) % 2 === 0 ? 1 : -1;
        const swayX = Math.sin(tor.life * 16) * 8;
        ctx.scale(flipSpin, 1);
        ctx.globalAlpha = fade * (isReflection ? 0.38 : 0.92);
        const sprW = Math.round(tor.radius * 3.1);
        const sprH = Math.round(tor.height * 1.06);
        ctx.drawImage(
          archerVfx,
          320,
          56,
          208,
          208,
          Math.round(-sprW * 0.5 + swayX),
          Math.round(-sprH * 0.5),
          sprW,
          sprH
        );
        ctx.restore();
      } else if (isSteel && warriorVfx && warriorVfx.complete && warriorVfx.naturalWidth) {
        ctx.save();
        ctx.translate(baseX, baseY - 92);
        const flipSpin = Math.floor(tor.life * 16) % 2 === 0 ? 1 : -1;
        ctx.scale(flipSpin, 1);
        ctx.globalAlpha = fade * (isReflection ? 0.38 : 0.92);
        ctx.drawImage(warriorVfx, 320, 56, 208, 208, -104, -104, 208, 208);
        ctx.restore();
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * (isReflection ? 0.28 : 0.62);
      for (let r = 0; r < rows; r += 3) {
        const hFrac = r / rows;
        const coneR = tor.radius * (0.42 + Math.pow(hFrac, 0.85) * 0.95);
        const sway = Math.sin(tor.life * 16 - hFrac * 7) * 14 * hFrac;
        const rot = tor.life * 20 - hFrac * 11;
        for (let strand = 0; strand < 2; strand++) {
          const a = rot + strand * Math.PI;
          const rx = Math.round((baseX + sway + Math.cos(a) * coneR) / 4) * 4;
          const ry = Math.round((baseY - r * pxSize + Math.sin(a) * coneR * 0.22) / 4) * 4;
          const wBand = Math.max(6, Math.round((10 + hFrac * 14) / 4) * 4);
          ctx.fillStyle = strand === 0 ? tor.coreColor : tor.color;
          ctx.fillRect(rx - wBand * 0.5, ry - 2, wBand, 4);
        }
      }
      ctx.restore();
    }

    // 2. FLAME & ELEMENTAL PILLARS: Authentic 16-bit HD-2D Hellfire Magma Pillar & Sacred Cathedral Pillars
    for (const pil of this.pillars) {
      const p = Math.min(1, pil.life / Math.max(0.15, pil.delay));
      const pxSize = 6;
      const baseX = Math.round(pil.x / pxSize) * pxSize;
      const baseY = Math.round(pil.groundY / pxSize) * pxSize;
      const isEmerald = pil.theme === 'emerald';
      const isSteel = pil.theme === 'steel';
      const isRadiant = pil.theme === 'radiant';
      const sigilCol = isEmerald ? '#34d399' : isSteel ? '#38bdf8' : isRadiant ? '#fef08a' : '#facc15';

      // Ground Pixel Octagram Sigil
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rX = 82 * p * pil.scaleWidth;
      const rY = 24 * p * pil.scaleWidth;
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
        const pop = Math.min(1, (pil.life - pil.delay) / 0.14);
        ctx.save();
        if (renderer && !isReflection) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.78;
          const glow = isEmerald
            ? renderer.glowEmerald || renderer.glowCyan
            : isSteel
              ? renderer.glowCyan
              : isRadiant
                ? renderer.glowGold || renderer.glowOrange
                : renderer.glowOrange;
          ctx.drawImage(glow, baseX - 165, baseY - 310, 330, 340);
        }

        const mageVfx = assets.mage?.vfx;
        const priestVfx = assets.priestess?.vfx;
        const flipWave = Math.floor(pil.life * 15) % 2 === 0 ? 1 : -1;

        if (!isRadiant && !isEmerald && !isSteel && mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
          const pilW = Math.round(236 * pil.scaleWidth);
          const pilH = Math.round(316 * pil.scaleWidth * (0.35 + 0.65 * pop));
          ctx.save();
          ctx.translate(baseX, baseY + 12);
          ctx.scale(flipWave, 1);
          ctx.globalAlpha = fade * (isReflection ? 0.48 : 0.98);
          ctx.drawImage(
            mageVfx,
            320,
            56,
            208,
            208,
            Math.round(-pilW * 0.5),
            Math.round(-pilH),
            pilW,
            pilH
          );
          ctx.restore();
        } else if (isRadiant && priestVfx && priestVfx.complete && priestVfx.naturalWidth) {
          const haloSz = Math.round(210 * pil.scaleWidth);
          const spearSz = Math.round(220 * pil.scaleWidth * pop);
          ctx.save();
          ctx.translate(baseX, baseY - 140 * pil.scaleWidth);
          ctx.rotate(pil.life * 2.4);
          ctx.globalAlpha = fade * (isReflection ? 0.45 : 0.92);
          ctx.drawImage(
            priestVfx,
            0,
            0,
            320,
            320,
            Math.round(-haloSz * 0.5),
            Math.round(-haloSz * 0.5),
            haloSz,
            haloSz
          );
          ctx.restore();
          ctx.save();
          ctx.translate(baseX, baseY - 115 * pil.scaleWidth);
          ctx.globalAlpha = fade * (isReflection ? 0.48 : 0.98);
          ctx.drawImage(
            priestVfx,
            320,
            56,
            208,
            208,
            Math.round(-spearSz * 0.5),
            Math.round(-spearSz * 0.5),
            spearSz,
            spearSz
          );
          ctx.restore();
        }

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * (isReflection ? 0.35 : 0.75);
        const rows = Math.round(42 * pil.scaleWidth);
        const halfSpan = Math.max(2, Math.round(5 * pil.scaleWidth));
        for (let row = 0; row < rows; row += 2) {
          const ribCol = Math.round(Math.sin(pil.life * 24 - row * 0.38) * (halfSpan + 2));
          ctx.fillStyle = row % 4 === 0 ? '#ffffff' : sigilCol;
          ctx.fillRect(baseX + ribCol * pxSize, baseY - (row + 1) * pxSize, pxSize, pxSize);
        }
        ctx.restore();
      }
    }

    // 3. SKY STRIKES: Authentic 16-bit HD-2D Heavenly Runeblades, Valkyrie Spears & Starfall Arrows
    for (const s of this.skyStrikes) {
      if (s.delay > 0) continue;
      const fade = s.impacted ? Math.max(0, 1 - s.linger / s.maxLinger) : 1;
      const sx = Math.round(s.x / 2) * 2;
      const sy = Math.round(s.y / 2) * 2;

      ctx.save();
      ctx.globalAlpha = fade * (isReflection ? 0.5 : 0.98);

      if (s.type === 'runeblade') {
        const warriorVfx = assets.warrior?.vfx;
        if (renderer && !isReflection) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.65;
          ctx.drawImage(renderer.glowCyan, sx - 110, sy - 190, 220, 220);
          ctx.restore();
        }
        if (warriorVfx && warriorVfx.complete && warriorVfx.naturalWidth) {
          const bladeSz = 216;
          ctx.drawImage(
            warriorVfx,
            0,
            0,
            320,
            320,
            Math.round(sx - bladeSz * 0.5),
            Math.round(sy - bladeSz + 14),
            bladeSz,
            bladeSz
          );
        }
      } else if (s.type === 'holy_spear') {
        const priestVfx = assets.priestess?.vfx;
        if (renderer && !isReflection) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.65;
          ctx.drawImage(renderer.glowGold || renderer.glowOrange, sx - 96, sy - 170, 192, 192);
          ctx.restore();
        }
        if (priestVfx && priestVfx.complete && priestVfx.naturalWidth) {
          const spearSz = 188;
          ctx.drawImage(
            priestVfx,
            320,
            56,
            208,
            208,
            Math.round(sx - spearSz * 0.5),
            Math.round(sy - spearSz + 12),
            spearSz,
            spearSz
          );
        }
      } else {
        const archerVfx = assets.archer?.vfx;
        const ang = Math.atan2(s.vy, s.vx || 0.01);
        ctx.translate(sx, sy);
        ctx.rotate(ang);
        if (archerVfx && archerVfx.complete && archerVfx.naturalWidth) {
          const arrSz = 116;
          ctx.drawImage(
            archerVfx,
            528,
            56,
            208,
            208,
            Math.round(-arrSz * 0.72),
            Math.round(-arrSz * 0.5),
            arrSz,
            arrSz
          );
        }
      }
      ctx.restore();
    }

    // 4. TAPERED COILING WIND-DRAGON ARROW PIERCER & CELESTIAL / SUPERNOVA BEAMS
    for (const b of this.beams) {
      const t = b.life / b.maxLife;
      const env = Math.sin(t * Math.PI);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - t * 0.35) * (isReflection ? 0.42 : 0.95);

      const dx = b.x2 - b.x1;
      const dy = b.y2 - b.y1;
      const dist = Math.hypot(dx, dy) || 1;
      const ang = Math.atan2(dy, dx);

      ctx.translate(b.x1, b.y1);
      ctx.rotate(ang);

      const headX = Math.min(dist, dist * Math.min(1, t / 0.28));
      const tailX = Math.max(0, dist * Math.max(0, (t - 0.38) / 0.62));
      const spanLen = Math.max(40, headX - tailX);
      const stepPx = 8;

      for (let x = tailX; x <= headX; x += stepPx) {
        const u = (x - tailX) / spanLen;
        const taper = Math.sin(Math.pow(u, 0.65) * Math.PI);
        const hOuter = Math.max(4, Math.round(((b.width * 0.58 * taper * env) / 4)) * 4);
        const hInner = Math.max(2, Math.round((hOuter * 0.45) / 2) * 2);
        const undulate = Math.round((Math.sin(x * 0.032 - b.life * 32) * 8 * (1 - u * 0.5)) / 2) * 2;

        ctx.fillStyle = b.color;
        ctx.fillRect(x, undulate - hOuter * 0.5, stepPx, hOuter);
        ctx.fillStyle = b.coreColor;
        ctx.fillRect(x, undulate - hInner * 0.5, stepPx, hInner);
        if (hOuter >= 8) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, undulate - 2, stepPx, 4);
        }

        const helix1 = Math.round((Math.sin(x * 0.055 - b.life * 36) * (hOuter * 1.15 + 10)) / 4) * 4;
        const helix2 = Math.round((-Math.sin(x * 0.055 - b.life * 36) * (hOuter * 1.15 + 10)) / 4) * 4;
        ctx.fillStyle = b.coreColor;
        ctx.fillRect(x, undulate + helix1 - 3, 8, 6);
        ctx.fillStyle = b.color;
        ctx.fillRect(x, undulate + helix2 - 3, 8, 6);
      }

      const isEmeraldBeam = b.color === '#10b981' || b.color === '#34d399';
      const isHolyBeam = b.color === '#fde047' || b.color === '#facc15' || b.color === '#fef08a';
      const archerVfx = assets.archer?.vfx;
      const priestVfx = assets.priestess?.vfx;
      const mageVfx = assets.mage?.vfx;

      ctx.globalCompositeOperation = 'source-over';
      if (isEmeraldBeam && archerVfx && archerVfx.complete && archerVfx.naturalWidth) {
        const dragSz = 264;
        ctx.drawImage(
          archerVfx,
          0,
          0,
          320,
          320,
          Math.round(headX - dragSz * 0.62),
          Math.round(-dragSz * 0.5),
          dragSz,
          dragSz
        );
      } else if (isHolyBeam && priestVfx && priestVfx.complete && priestVfx.naturalWidth) {
        const starSz = 136;
        ctx.drawImage(
          priestVfx,
          528,
          56,
          208,
          208,
          Math.round(headX - starSz * 0.5),
          Math.round(-starSz * 0.5),
          starSz,
          starSz
        );
      } else if (mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
        const meteorSz = 148;
        ctx.drawImage(
          mageVfx,
          528,
          56,
          208,
          208,
          Math.round(headX - meteorSz * 0.5),
          Math.round(-meteorSz * 0.5),
          meteorSz,
          meteorSz
        );
      }

      ctx.restore();
    }

    // 4B. GLACIAL FROST-CRYSTAL SPIRES (Authentic 16-bit HD-2D Ice Spire Cluster from warrior_vfx.png)
    for (const cs of this.crystalSpikes) {
      if (cs.delay > 0) continue;
      const t = cs.life / cs.maxLife;
      const pop = Math.min(1, cs.life / 0.12);
      const fade = Math.min(1, (1 - t) * 2.5);
      const bx = Math.round(cs.x / 2) * 2;
      const by = Math.round(cs.groundY / 2) * 2;
      const warriorVfx = assets.warrior?.vfx;

      ctx.save();
      ctx.globalAlpha = fade * (isReflection ? 0.45 : 0.98);
      if (warriorVfx && warriorVfx.complete && warriorVfx.naturalWidth) {
        const spireW = Math.round(cs.width * 3.8);
        const spireH = Math.round(cs.height * 1.38 * pop);
        ctx.translate(bx, by + 8);
        ctx.rotate(cs.tilt * 0.18);
        ctx.drawImage(
          warriorVfx,
          320,
          56,
          208,
          208,
          Math.round(-spireW * 0.5),
          Math.round(-spireH),
          spireW,
          spireH
        );
      }
      ctx.restore();
    }

    // 4C. BLACK-GOLD SOLAR ECLIPSE SUPERNOVA SPHERE (Authentic 16-bit HD-2D Eclipse Sun from mage_vfx.png)
    for (const sn of this.supernovas) {
      const t = sn.life / sn.maxLife;
      const env = Math.sin(Math.min(1, t * 1.15) * Math.PI);
      const rad = Math.max(24, Math.round((sn.maxRadius * (0.45 + 0.55 * env)) / 4) * 4);
      const sx = Math.round(sn.x / 2) * 2;
      const sy = Math.round(sn.y / 2) * 2;
      const mageVfx = assets.mage?.vfx;

      ctx.save();
      if (renderer && !isReflection) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = env * 0.9;
        ctx.drawImage(renderer.glowOrange, sx - rad * 2.5, sy - rad * 2.5, rad * 5.0, rad * 5.0);
      }

      if (mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
        const eclipseSz = Math.round(rad * 2.65);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(sn.life * 0.55);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = env * (isReflection ? 0.48 : 0.98);
        ctx.drawImage(
          mageVfx,
          0,
          0,
          320,
          320,
          Math.round(-eclipseSz * 0.5),
          Math.round(-eclipseSz * 0.5),
          eclipseSz,
          eclipseSz
        );
        ctx.restore();
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

    // 6. SLASHES: Authentic 16-bit HD-2D Crescent Blade, Scythe & Whirlwind Waves + Stepped Arcs
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.slashes) {
      const t = s.life / s.maxLife;
      const alpha = 1 - t;
      const isFullCircle = Math.abs(s.endAngle - s.startAngle) > Math.PI * 1.8;
      const steps = isFullCircle ? 32 : 28;
      ctx.globalAlpha = alpha * (isReflection ? 0.35 : isFullCircle ? 0.52 : 0.88);
      const isCyan = s.color === '#38bdf8' || s.color === '#7dd3fc' || s.color === '#0284c7';
      const isEmerald = s.color === '#10b981' || s.color === '#34d399' || s.color === '#6ee7b7';
      const isAbyssal =
        s.color === '#c084fc' ||
        s.color === '#9333ea' ||
        s.color === '#7e22ce' ||
        s.color === '#f43f5e' ||
        s.color === '#e879f9';
      const isRadiant = s.color === '#fde047' || s.color === '#facc15' || s.color === '#f59e0b';
      const isChrono = s.color === '#2dd4bf' || s.color === '#99f6e4';
      const outerTone = isCyan ? '#0284c7' : isEmerald ? '#059669' : isAbyssal ? '#4c1d95' : '#ea580c';
      const midTone = s.color;
      const innerTone = isCyan ? '#bae6fd' : isEmerald ? '#a7f3d0' : isAbyssal ? '#f5d0fe' : '#fef08a';

      // Draw 16-bit HD-2D Slash Wave Sprite at the arc apex
      if (!isReflection) {
        const midAng = (s.startAngle + s.endAngle) * 0.5 + (isFullCircle ? t * 8 : 0);
        const rad = s.radius + t * 14;
        const sx = Math.round(s.x + Math.cos(midAng) * rad * 0.72);
        const sy = Math.round(s.y + Math.sin(midAng) * (isFullCircle ? rad * 0.25 : rad * 0.72));
        const slashSize = Math.round(Math.min(185, Math.max(96, s.radius * 1.25)) * (1.05 - t * 0.18));

        let sheet = null;
        let cropX = 528;
        if (isCyan) {
          sheet = assets.warrior?.vfx;
          cropX = 528;
        } else if (isAbyssal) {
          sheet = assets.reaper?.vfx;
          cropX = 736;
        } else if (isEmerald) {
          sheet = assets.archer?.vfx;
          cropX = 320;
        } else if (isRadiant) {
          sheet = assets.priestess?.vfx;
          cropX = 528;
        } else if (isChrono) {
          sheet = assets.chronomancer?.vfx;
          cropX = 528;
        } else {
          sheet = assets.mage?.vfx;
          cropX = 528;
        }

        if (sheet && sheet.complete && sheet.naturalWidth) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, alpha * 1.15);
          ctx.translate(sx, sy);
          ctx.rotate(midAng);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            sheet,
            cropX,
            56,
            208,
            208,
            Math.round(-slashSize * 0.5),
            Math.round(-slashSize * 0.5),
            slashSize,
            slashSize
          );
          ctx.restore();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * (isFullCircle ? 0.52 : 0.88);
        }
      }

      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const ang = s.startAngle + (s.endAngle - s.startAngle) * u;
        const env = isFullCircle ? 0.55 : Math.sin(u * Math.PI);
        const rad = s.radius + t * 14;
        const rx = rad;
        const ry = isFullCircle ? rad * 0.28 : rad;
        const px = Math.round((s.x + Math.cos(ang) * rx) / 4) * 4;
        const py = Math.round((s.y + Math.sin(ang) * ry) / 4) * 4;
        const sz = Math.max(4, Math.round((env * (isFullCircle ? 12 : 16) * (1 - t * 0.45)) / 4) * 4);

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

    // 8. PROJECTILES: Authentic 16-bit HD-2D Astral Arrows, Frost Blade-Waves, Phantom Scythes, Clockwork Saw-Gears, Holy Orbs & Solar Fireballs
    ctx.globalAlpha = 1;
    for (const proj of this.projectiles) {
      const r = proj.radius * 3.1;
      const px = Math.round(proj.x / 4) * 4;
      const py = Math.round(proj.y / 4) * 4;
      if (renderer) {
        const tex =
          proj.color === '#38bdf8' || proj.color === '#c084fc' || proj.color === '#2dd4bf'
            ? renderer.glowCyan
            : proj.color === '#10b981' || proj.color === '#34d399'
              ? renderer.glowEmerald || renderer.glowCyan
              : renderer.glowOrange;
        ctx.drawImage(tex, px - r, py - r, r * 2, r * 2);
      }

      if (proj.isMeteor) {
        const mageVfx = assets.mage?.vfx;
        const ang = Math.atan2(proj.vy, proj.vx || 1);
        const dirX = -proj.vx / (Math.hypot(proj.vx, proj.vy) || 1);
        const dirY = -proj.vy / (Math.hypot(proj.vx, proj.vy) || 1);
        const pSize = 6;
        for (let wStep = 10; wStep >= 1; wStep--) {
          const wx = Math.round((px + dirX * wStep * 9) / pSize) * pSize;
          const wy = Math.round((py + dirY * wStep * 9) / pSize) * pSize;
          const span = Math.max(1, Math.round((1 - wStep / 11) * 4));
          for (let c = -span; c <= span; c++) {
            ctx.fillStyle = wStep < 4 ? '#fef08a' : wStep < 7 ? '#fb923c' : '#dc2626';
            ctx.fillRect(wx + c * pSize, wy - c * pSize * 0.5, pSize, pSize);
          }
        }
        if (mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
          const mSize = 148;
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.translate(px, py);
          ctx.rotate(ang);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            mageVfx,
            528,
            56,
            208,
            208,
            Math.round(-mSize * 0.5),
            Math.round(-mSize * 0.5),
            mSize,
            mSize
          );
          ctx.restore();
          ctx.globalCompositeOperation = 'lighter';
        }
      } else if (proj.type === 'clock_gear') {
        // Authentic 16-bit HD-2D Spinning Brass & Celestial-Teal Clockwork Saw-Gear (from chronomancer_vfx.png)
        const vfxSheet = assets.chronomancer?.vfx;
        const dir = Math.sign(proj.vx) || 1;
        const spin = (proj.age || 0) * 18 * dir;
        ctx.save();
        ctx.translate(px, py);
        for (let tStep = 1; tStep <= 6; tStep++) {
          const tx = -dir * tStep * 11;
          const ty = Math.sin((proj.age || 0) * 32 - tStep * 0.9) * 8;
          ctx.fillStyle = tStep % 2 === 0 ? '#facc15' : '#2dd4bf';
          ctx.fillRect(tx - 3, ty - 2, 6, 4);
        }
        ctx.rotate(spin);
        if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
          const gearSize = 84;
          ctx.globalCompositeOperation = 'source-over';
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            vfxSheet,
            528,
            56,
            208,
            208,
            Math.round(-gearSize * 0.5),
            Math.round(-gearSize * 0.5),
            gearSize,
            gearSize
          );
        } else {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(-16, -16, 32, 32);
        }
        ctx.restore();
      } else if (proj.type === 'phantom_scythe') {
        // Authentic 16-bit HD-2D Spinning Skull-Crescent Phantom Scythe Wave (from reaper_vfx.png)
        const reaperVfx = assets.reaper?.vfx;
        const dir = Math.sign(proj.vx) || 1;
        const spin = (proj.age || 0) * 22 * dir;
        ctx.save();
        ctx.translate(px, py);
        for (let tStep = 1; tStep <= 5; tStep++) {
          const tx = -dir * tStep * 12;
          const ty = Math.cos((proj.age || 0) * 28 - tStep) * 10;
          ctx.fillStyle = tStep % 2 === 0 ? '#f43f5e' : '#c084fc';
          ctx.fillRect(tx - 3, ty - 3, 6, 6);
        }
        ctx.rotate(spin);
        if (reaperVfx && reaperVfx.complete && reaperVfx.naturalWidth && reaperVfx.naturalWidth >= 944) {
          const scytheSize = 112;
          ctx.globalCompositeOperation = 'source-over';
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            reaperVfx,
            736,
            56,
            208,
            208,
            Math.round(-scytheSize * 0.5),
            Math.round(-scytheSize * 0.5),
            scytheSize,
            scytheSize
          );
          ctx.rotate(Math.PI);
          ctx.globalAlpha = 0.72;
          ctx.drawImage(
            reaperVfx,
            736,
            56,
            208,
            208,
            Math.round(-scytheSize * 0.45),
            Math.round(-scytheSize * 0.45),
            Math.round(scytheSize * 0.9),
            Math.round(scytheSize * 0.9)
          );
        }
        ctx.restore();
      } else if (proj.type === 'blade_wave') {
        // Authentic 16-bit HD-2D Glacial Crescent Sword-Wave (from warrior_vfx.png)
        const warriorVfx = assets.warrior?.vfx;
        const dir = Math.sign(proj.vx) || 1;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(dir, 1);
        for (let trail = 1; trail <= 5; trail++) {
          const tx = -trail * 14;
          const ty = ((trail * 17) % 36) - 18;
          ctx.fillStyle = trail % 2 === 0 ? '#ffffff' : '#38bdf8';
          ctx.fillRect(tx - 4, ty - 2, 8, 4);
        }
        if (warriorVfx && warriorVfx.complete && warriorVfx.naturalWidth) {
          const waveSize = 132;
          ctx.globalCompositeOperation = 'source-over';
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            warriorVfx,
            528,
            56,
            208,
            208,
            Math.round(-waveSize * 0.5),
            Math.round(-waveSize * 0.5),
            waveSize,
            waveSize
          );
        }
        ctx.restore();
      } else if (proj.type === 'arrow') {
        // Authentic 16-bit HD-2D Elven Starlight-Gold & Emerald Astral Arrow (from archer_vfx.png)
        const archerVfx = assets.archer?.vfx;
        const ang = Math.atan2(proj.vy, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);

        // Corkscrew emerald wind spiral trailing behind arrow
        for (let w = 1; w <= 7; w++) {
          const wx = -w * 10;
          const wy = Math.sin((proj.age || 0) * 36 - w * 0.9) * 10;
          ctx.fillStyle = w % 2 === 0 ? '#fef08a' : '#34d399';
          ctx.fillRect(wx - 4, wy - 2, 8, 4);
        }

        if (archerVfx && archerVfx.complete && archerVfx.naturalWidth) {
          const arrSize = 112;
          ctx.globalCompositeOperation = 'source-over';
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            archerVfx,
            528,
            56,
            208,
            208,
            Math.round(-arrSize * 0.5),
            Math.round(-arrSize * 0.5),
            arrSize,
            arrSize
          );
        } else {
          ctx.fillStyle = '#34d399';
          ctx.fillRect(-32, -4, 62, 8);
        }
        ctx.restore();
      } else if (proj.type === 'holy_light') {
        // Authentic 16-bit HD-2D Seraphic 8-Point Golden-White Holy Star-Cross Orb (from priestess_vfx.png)
        const priestessVfx = assets.priestess?.vfx;
        ctx.save();
        ctx.translate(px, py);
        for (let sat = 0; sat < 4; sat++) {
          const sa = (proj.age || 0) * 14 + (sat * Math.PI) / 2;
          const sx = Math.round((Math.cos(sa) * 28) / 2) * 2;
          const sy = Math.round((Math.sin(sa) * 28) / 2) * 2;
          ctx.fillStyle = sat % 2 === 0 ? '#ffffff' : '#fde047';
          ctx.fillRect(sx - 3, sy - 3, 6, 6);
        }
        ctx.rotate((proj.age || 0) * 6);
        if (priestessVfx && priestessVfx.complete && priestessVfx.naturalWidth) {
          const orbSize = 92;
          ctx.globalCompositeOperation = 'source-over';
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            priestessVfx,
            528,
            56,
            208,
            208,
            Math.round(-orbSize * 0.5),
            Math.round(-orbSize * 0.5),
            orbSize,
            orbSize
          );
        }
        ctx.restore();
      } else {
        // Authentic 16-bit HD-2D Blazing Solar Comet Fireball (from mage_vfx.png)
        const mageVfx = assets.mage?.vfx;
        const ang = Math.atan2(proj.vy, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        for (let sat = 0; sat < 3; sat++) {
          const sa = (proj.age || 0) * 16 + (sat * Math.PI * 2) / 3;
          const sx = Math.round((Math.cos(sa) * 26) / 2) * 2;
          const sy = Math.round((Math.sin(sa) * 26) / 2) * 2;
          ctx.fillStyle = sat === 0 ? '#ffffff' : proj.coreColor;
          ctx.fillRect(sx - 3, sy - 3, 6, 6);
        }
        ctx.rotate(ang);
        if (mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
          const fbSize = 96;
          ctx.globalCompositeOperation = 'source-over';
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            mageVfx,
            528,
            56,
            208,
            208,
            Math.round(-fbSize * 0.5),
            Math.round(-fbSize * 0.5),
            fbSize,
            fbSize
          );
        } else {
          ctx.fillStyle = proj.color;
          ctx.fillRect(-16, -12, 32, 24);
        }
        ctx.restore();
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

    // 10. PURE PIXEL-ART RUNIC CRYSTALS, SOLAR STARS, SACRED CROSSES, NECROTIC SKULLS, CLOCKWORK COGS & ASTRAL FEATHERS
    if (!isReflection) {
      for (const g of this.glyphs) {
        const p = g.life / g.maxLife;
        const gx = Math.round(g.x / 2) * 2;
        const gy = Math.round(g.y / 2) * 2;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, (1 - p) * 1.6);

        if (g.shape === 'cog') {
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 8, gy - 2, 16, 4);
          ctx.fillRect(gx - 2, gy - 8, 4, 16);
          ctx.fillRect(gx - 6, gy - 6, 12, 12);
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 4, gy - 4, 8, 8);
          ctx.fillStyle = '#090d16';
          ctx.fillRect(gx - 2, gy - 2, 4, 4);
        } else if (g.shape === 'skull') {
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 6, gy - 8, 12, 10);
          ctx.fillRect(gx - 4, gy + 2, 8, 4);
          ctx.fillStyle = '#090514';
          ctx.fillRect(gx - 4, gy - 4, 3, 3);
          ctx.fillRect(gx + 1, gy - 4, 3, 3);
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 3, gy - 3, 2, 2);
          ctx.fillRect(gx + 2, gy - 3, 2, 2);
        } else if (g.shape === 'rune') {
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 2, gy - 8, 4, 16);
          ctx.fillRect(gx - 6, gy - 2, 12, 4);
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 2, gy - 4, 4, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(gx - 1, gy - 1, 2, 2);
        } else if (g.shape === 'cross') {
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 3, gy - 9, 6, 18);
          ctx.fillRect(gx - 9, gy - 3, 18, 6);
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 2, gy - 7, 4, 14);
          ctx.fillRect(gx - 7, gy - 2, 14, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(gx - 2, gy - 2, 4, 4);
        } else if (g.shape === 'star') {
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 8, gy - 1, 16, 2);
          ctx.fillRect(gx - 1, gy - 8, 2, 16);
          ctx.fillRect(gx - 4, gy - 4, 8, 8);
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 2, gy - 2, 4, 4);
        } else {
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 6, gy + 2, 4, 4);
          ctx.fillRect(gx - 3, gy - 1, 6, 4);
          ctx.fillRect(gx + 1, gy - 4, 5, 4);
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 2, gy, 4, 2);
          ctx.fillRect(gx + 1, gy - 3, 3, 2);
        }
        ctx.restore();
      }

      // 11. SPECIAL MOVE & ULTIMATE RISING ENERGY STREAMERS FLANKING CASTER
      for (const ca of this.castAuras) {
        if (!ca.fighter || ca.fighter.isDead) continue;
        const t = ca.life / ca.maxLife;
        const env = t < 0.14 ? t / 0.14 : Math.max(0, 1 - (t - 0.14) / 0.86);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = env * 0.92;

        // Rising Vertical Pixel-Art Energy Streamers framing the character's left & right silhouette
        const streamCount = ca.isUltimate ? 6 : 4;
        for (let s = 0; s < streamCount; s++) {
          const side = s % 2 === 0 ? -1 : 1;
          const lane = Math.floor(s / 2) + 1;
          const sx = Math.round((ca.fighter.x + side * (46 + lane * 16)) / 4) * 4;
          const phase = (ca.life * 260 + s * 42) % 140;
          const sy = Math.round((ca.fighter.y - 16 - phase) / 4) * 4;
          const sh = ca.isUltimate ? 28 : 20;
          ctx.fillStyle = ca.mainColor;
          ctx.fillRect(sx - 2, sy - sh, 4, sh);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - 2, sy - sh, 4, 6);
        }

        ctx.restore();
      }

      // 12. ON-HIT ELEMENTAL 16-BIT HD-2D IMPACT BURSTS (Triggered on Every Landed Attack & Skill)
      for (const imp of this.hitImpacts) {
        const t = imp.life / imp.maxLife;
        const env = t < 0.18 ? t / 0.18 : Math.max(0, 1 - (t - 0.18) / 0.82);
        const popScale = t < 0.22 ? 0.55 + (t / 0.22) * 0.65 : 1.2 - (t - 0.22) * 0.35;
        const baseSize = (imp.isCrit ? 112 : 84) * popScale;
        const ix = Math.round(imp.x / 2) * 2;
        const iy = Math.round(imp.y / 2) * 2;

        let sheet = null;
        let sx = 528;
        let sy = 56;
        let sw = 208;
        let sh = 208;

        if (imp.theme === 'steel') {
          sheet = assets.warrior?.vfx;
          sx = imp.isCrit ? 320 : 528;
        } else if (imp.theme === 'emerald') {
          sheet = assets.archer?.vfx;
          sx = 320;
        } else if (imp.theme === 'arcane') {
          sheet = assets.mage?.vfx;
          sx = 528;
        } else if (imp.theme === 'radiant') {
          sheet = assets.priestess?.vfx;
          sx = 528;
        } else if (imp.theme === 'abyssal') {
          sheet = assets.reaper?.vfx;
          sx = sheet && sheet.naturalWidth >= 944 ? 736 : 528;
        } else if (imp.theme === 'chrono') {
          sheet = assets.chronomancer?.vfx;
          sx = 528;
        }

        if (sheet && sheet.complete && sheet.naturalWidth) {
          ctx.save();
          ctx.translate(ix, iy);
          ctx.scale(imp.dir, 1);
          ctx.rotate(imp.rot + t * 1.4);
          ctx.imageSmoothingEnabled = false;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, env * 0.82);
          const drawS = Math.round(baseSize);
          ctx.drawImage(
            sheet,
            sx,
            sy,
            sw,
            sh,
            Math.round(-drawS * 0.5),
            Math.round(-drawS * 0.5),
            drawS,
            drawS
          );
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  renderBackgroundCastSeals(ctx, renderer = null) {
    const assets = PixelForge.initAssets();
    for (const ca of this.castAuras) {
      if (!ca.fighter || ca.fighter.isDead) continue;
      const t = ca.life / ca.maxLife;
      const env = t < 0.14 ? t / 0.14 : Math.max(0, 1 - (t - 0.14) / 0.86);
      const hx = Math.round(ca.fighter.x / 4) * 4;
      const hy = Math.round((ca.fighter.y - 128) / 4) * 4;
      const baseR = (ca.isUltimate ? 78 : 62) * (0.94 + Math.sin(t * Math.PI) * 0.14);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = env * 0.85;

      if (renderer) {
        const glowTex =
          ca.theme === 'arcane'
            ? renderer.glowOrange
            : ca.theme === 'emerald'
              ? renderer.glowEmerald || renderer.glowCyan
              : ca.theme === 'abyssal'
                ? renderer.glowViolet || renderer.glowCyan
                : renderer.glowCyan;
        ctx.drawImage(glowTex, hx - baseR * 1.9, hy - baseR * 1.9, baseR * 3.8, baseR * 3.8);
      }

      // Authentic 16-bit HD-2D Champion Crest Sprite Manifestation BEHIND the caster
      const crestSize = Math.round(baseR * 2.75);
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = env * (ca.isUltimate ? 0.92 : 0.82);
      ctx.translate(hx, hy);

      if (ca.theme === 'steel' && assets.warrior?.vfx?.complete) {
        ctx.drawImage(
          assets.warrior.vfx,
          0,
          0,
          320,
          320,
          Math.round(-crestSize * 0.5),
          Math.round(-crestSize * 0.62),
          crestSize,
          crestSize
        );
      } else if (ca.theme === 'emerald' && assets.archer?.vfx?.complete) {
        ctx.drawImage(
          assets.archer.vfx,
          0,
          0,
          320,
          320,
          Math.round(-crestSize * 0.56),
          Math.round(-crestSize * 0.58),
          Math.round(crestSize * 1.12),
          Math.round(crestSize * 1.12)
        );
      } else if (ca.theme === 'arcane' && assets.mage?.vfx?.complete) {
        ctx.rotate(ca.life * 1.4);
        ctx.drawImage(
          assets.mage.vfx,
          0,
          0,
          320,
          320,
          Math.round(-crestSize * 0.5),
          Math.round(-crestSize * 0.5),
          crestSize,
          crestSize
        );
      } else if (ca.theme === 'radiant' && assets.priestess?.vfx?.complete) {
        ctx.rotate(ca.life * 0.8);
        ctx.drawImage(
          assets.priestess.vfx,
          0,
          0,
          320,
          320,
          Math.round(-crestSize * 0.52),
          Math.round(-crestSize * 0.52),
          Math.round(crestSize * 1.04),
          Math.round(crestSize * 1.04)
        );
      } else if (ca.theme === 'abyssal' && assets.reaper?.vfx?.complete && assets.reaper.vfx.naturalWidth >= 944) {
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(side * 48, -8);
          ctx.scale(side, 1);
          ctx.rotate(-0.35 + ca.life * 1.8);
          const scSize = Math.round(crestSize * 0.72);
          ctx.drawImage(
            assets.reaper.vfx,
            736,
            56,
            208,
            208,
            Math.round(-scSize * 0.5),
            Math.round(-scSize * 0.5),
            scSize,
            scSize
          );
          ctx.restore();
        }
      } else if (ca.theme === 'chrono' && assets.chronomancer?.vfx?.complete) {
        ctx.rotate(-ca.life * 1.2);
        ctx.drawImage(
          assets.chronomancer.vfx,
          0,
          0,
          320,
          320,
          Math.round(-crestSize * 0.52),
          Math.round(-crestSize * 0.52),
          Math.round(crestSize * 1.04),
          Math.round(crestSize * 1.04)
        );
      }
      ctx.restore();
      ctx.restore();
    }
  }

  renderFloatingTexts(ctx) {
    // 1. OVERHEAD SPECIAL MOVE & ULTIMATE ART CALLOUT PLATES ABOVE CHARACTER HEAD (100% Crisp Pixel Font)
    for (const ca of this.castAuras) {
      if (!ca.fighter || ca.fighter.isDead) continue;
      const t = ca.life / ca.maxLife;
      const alpha = t < 0.08 ? t / 0.08 : t > 0.78 ? Math.max(0, (1 - t) / 0.22) : 1.0;

      // Anchor cleanly above the caster's helmet/hat/hood so their head stays 100% visible
      const headX = Math.max(165, Math.min(1035, Math.round(ca.fighter.x / 2) * 2));
      const floatLift = Math.round(Math.min(12, t * 18) / 2) * 2;
      const headY = Math.max(52, Math.round((ca.fighter.y - 216 - floatLift) / 2) * 2);

      ctx.save();
      ctx.globalAlpha = alpha;

      const titleScale = 2; // 10x14 crisp pixel characters
      const tagScale = 1; // 5x7 crisp micro-pixel header
      const titleW = PixelFont.measureWidth(ca.title, titleScale);
      const tagW = PixelFont.measureWidth(ca.tag, tagScale);
      const plateW = Math.max(ca.isUltimate ? 196 : 164, Math.round((Math.max(titleW, tagW) + 28) / 4) * 4);
      const plateH = ca.isUltimate ? 40 : 36;
      const halfW = plateW / 2;
      const halfH = plateH / 2;

      // Outer stepped pixel-art elemental glow border
      ctx.fillStyle = ca.mainColor;
      ctx.fillRect(headX - halfW - 4, headY - halfH, plateW + 8, plateH);
      ctx.fillRect(headX - halfW, headY - halfH - 4, plateW, plateH + 8);

      // Inner dark obsidian pixel plate
      ctx.fillStyle = 'rgba(7, 10, 19, 0.94)';
      ctx.fillRect(headX - halfW, headY - halfH, plateW, plateH);

      // Inner crisp accent frame + corner studs
      ctx.fillStyle = ca.coreColor;
      ctx.fillRect(headX - halfW + 2, headY - halfH + 2, plateW - 4, 2);
      ctx.fillRect(headX - halfW + 2, headY + halfH - 4, plateW - 4, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(headX - halfW - 2, headY - halfH - 2, 6, 6);
      ctx.fillRect(headX + halfW - 4, headY - halfH - 2, 6, 6);
      ctx.fillRect(headX - halfW - 2, headY + halfH - 4, 6, 6);
      ctx.fillRect(headX + halfW - 4, headY + halfH - 4, 6, 6);

      // Downward pixel pointer chevron aimed at the character's head
      ctx.fillStyle = ca.mainColor;
      ctx.fillRect(headX - 8, headY + halfH + 2, 16, 4);
      ctx.fillStyle = ca.coreColor;
      ctx.fillRect(headX - 4, headY + halfH + 6, 8, 4);

      // Top micro-tag (★ ULTIMATE ART ★ / ✦ SPECIAL SKILL ✦) in 1px bitmap font
      PixelFont.drawCentered(ctx, ca.tag, headX, headY - 9, tagScale, ca.coreColor, '#ffffff', true);

      // Main ability name in 2px bitmap font with 2-tone pixel highlight
      PixelFont.drawCentered(ctx, ca.title, headX, headY + 7, titleScale, ca.coreColor, '#ffffff', true);

      ctx.restore();
    }

    // 2. DAMAGE & DODGE/DASH FLOATING TEXTS (100% Crisp Pixel Font)
    for (const t of this.texts) {
      const p = t.life / t.maxLife;
      const isLabel = /[A-Z]/.test(t.text);
      const pxScale = t.isCrit ? 3 : isLabel ? 2 : 2;
      const tx = Math.round(t.x / 2) * 2;
      const ty = Math.round(t.y / 2) * 2;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - p) * 2);
      PixelFont.drawCentered(
        ctx,
        t.text,
        tx,
        ty,
        pxScale,
        t.color,
        '#ffffff',
        true
      );
      ctx.restore();
    }
  }
}
