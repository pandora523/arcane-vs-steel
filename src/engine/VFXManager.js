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

  drawBloomedSprite(
    ctx,
    renderer,
    sheet,
    sx,
    sy,
    sw,
    sh,
    dx,
    dy,
    dw,
    dh,
    glowCol = '#38bdf8',
    alpha = 1.0,
    isReflection = false
  ) {
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const prevSmooth = ctx.imageSmoothingEnabled;
    const prevComp = ctx.globalCompositeOperation;
    const prevAlpha = ctx.globalAlpha;

    // Keep NEAREST-neighbor crispness on our chunky 44x44 / 64x64 pixelated VFX sprites
    ctx.imageSmoothingEnabled = false;
    const cx = dx + dw * 0.5;
    const cy = dy + dh * 0.5;

    // 1. Saturated Radial Jewel-Tone Bloom Halo behind the chunky pixel VFX sprite
    if (renderer && !isReflection) {
      const glowTex = renderer.getGlowForColor ? renderer.getGlowForColor(glowCol) : renderer.glowCyan;
      const haloW = dw * 2.05;
      const haloH = dh * 2.05;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.44);
      ctx.drawImage(glowTex, cx - haloW * 0.5, cy - haloH * 0.5, haloW, haloH);
    }

    // 2. Stepped Chunky-Pixel Outer Bloom Fringe (balanced 0.28 lighter pass so outer pixels glow warmly)
    if (!isReflection) {
      const auraW = Math.round((dw * 1.14) / 4) * 4;
      const auraH = Math.round((dh * 1.14) / 4) * 4;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.28);
      ctx.drawImage(sheet, sx, sy, sw, sh, Math.round(cx - auraW * 0.5), Math.round(cy - auraH * 0.5), auraW, auraH);
    }

    // 3. Main Chunky-Pixel Sprite Body Pass (100% rich saturated pixel blocks)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha * 0.96);
    ctx.drawImage(sheet, sx, sy, sw, sh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));

    // 4. Balanced Inner Luminous Bloom Pass (0.24 alpha: lush HD-2D bloom without blowing out to white)
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * (isReflection ? 0.12 : 0.24));
    const coreW = Math.round((dw * 0.96) / 4) * 4;
    const coreH = Math.round((dh * 0.96) / 4) * 4;
    ctx.drawImage(sheet, sx, sy, sw, sh, Math.round(cx - coreW * 0.5), Math.round(cy - coreH * 0.5), coreW, coreH);

    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.globalCompositeOperation = prevComp;
    ctx.globalAlpha = prevAlpha;
  }

  spawnHitImpact(x, y, attacker, isCrit = false) {
    const heroId = attacker?.heroId || 'warrior';
    const theme = attacker?.theme || 'steel';
    const col = attacker?.primaryColor || '#38bdf8';
    const accentCol =
      theme === 'steel'
        ? '#0284c7'
        : theme === 'emerald'
          ? '#059669'
          : theme === 'radiant'
            ? '#eab308'
            : theme === 'abyssal'
              ? '#e11d48'
              : theme === 'chrono'
                ? '#eab308'
                : '#ea580c';
    const dir = attacker ? Math.sign(x - attacker.x) || 1 : 1;
    if (this.hitImpacts.length > 22) this.hitImpacts.shift();
    this.hitImpacts.push({
      x: x - dir * 26,
      y: y - 6,
      heroId,
      theme,
      color: col,
      accentColor: accentCol,
      dir,
      isCrit,
      rot: (Math.random() - 0.5) * 0.45,
      life: 0,
      maxLife: isCrit ? 0.44 : 0.32
    });
    // Dense saturated particle shower + elemental glyphs spraying outward around the impact!
    this.spawnBurst(x, y, isCrit ? 24 : 15, col, isCrit ? 290 : 220, {
      upBias: 85,
      size: isCrit ? 8 : 6,
      life: isCrit ? 0.52 : 0.38,
      spread: 26,
      additive: true
    });
    this.spawnBurst(x, y, isCrit ? 12 : 7, accentCol, isCrit ? 240 : 170, {
      upBias: 60,
      size: 6,
      life: 0.34,
      spread: 22,
      additive: true
    });
    this.spawnGlyphBurst(x, y - 8, isCrit ? 7 : 4, theme);
    if (theme !== 'abyssal' && theme !== 'chrono') {
      this.spawnShockwave(x, y, isCrit ? 98 : 68, col, isCrit ? 0.32 : 0.24, false);
    }
  }

  spawnParticle(opts) {
    if (this.particles.length > 750) this.particles.shift();
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
    const baseSpread = opts.spread ?? 16;
    for (let i = 0; i < count; i++) {
      const a = (i / Math.max(1, count)) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const s = (0.35 + Math.random() * 0.75) * speed;
      const r0 = baseSpread * (0.45 + Math.random() * 0.85);
      this.spawnParticle({
        x: x + Math.cos(a) * r0,
        y: y + Math.sin(a) * r0 * 0.8,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (opts.upBias || 0),
        size: (opts.size || 7) * (0.75 + Math.random() * 0.65),
        color,
        maxLife: (opts.life || 0.48) * (0.65 + Math.random() * 0.65),
        gravity: opts.gravity ?? 240,
        additive: opts.additive !== false
      });
    }
  }

  spawnGlyphBurst(x, y, count = 6, theme = 'steel') {
    const sets = {
      steel: { shape: 'rune', col: '#0284c7', core: '#38bdf8' },
      arcane: { shape: 'star', col: '#ea580c', core: '#facc15' },
      emerald: { shape: 'feather', col: '#059669', core: '#34d399' },
      radiant: { shape: 'cross', col: '#ca8a04', core: '#facc15' },
      abyssal: { shape: 'skull', col: '#7e22ce', core: '#e11d48' },
      chrono: { shape: 'cog', col: '#0d9488', core: '#eab308' },
      heal: { shape: 'cross', col: '#16a34a', core: '#facc15' }
    };
    const cfg = sets[theme] || sets.steel;
    for (let i = 0; i < count; i++) {
      if (this.glyphs.length > 72) this.glyphs.shift();
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd = 105 + Math.random() * 145;
      const r0 = 32 + Math.random() * 32;
      this.glyphs.push({
        x: x + Math.cos(ang) * r0,
        y: y + Math.sin(ang) * r0 * 0.75,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 55,
        shape: cfg.shape,
        variant: i % 3,
        color: cfg.col,
        coreColor: cfg.core,
        theme,
        rot: (Math.random() - 0.5) * 0.8,
        vRot: (Math.random() - 0.5) * 4.5,
        size: 12 + Math.floor(Math.random() * 5),
        life: 0,
        maxLife: 0.68 + Math.random() * 0.38
      });
    }
  }

  spawnSlash(x, y, radius, startAngle, endAngle, color = '#38bdf8', duration = 0.28) {
    this.slashes.push({ x, y, radius, startAngle, endAngle, color, life: 0, maxLife: duration });
    // Emit glowing arc sparks along the slash wave!
    for (let i = 0; i < 8; i++) {
      const u = i / 7;
      const a = startAngle + (endAngle - startAngle) * u;
      this.spawnParticle({
        x: x + Math.cos(a) * radius * 0.85,
        y: y + Math.sin(a) * radius * 0.85,
        vx: Math.cos(a) * (110 + Math.random() * 90),
        vy: Math.sin(a) * (110 + Math.random() * 90) - 35,
        size: 6 + Math.random() * 4,
        color,
        maxLife: 0.32 + Math.random() * 0.16,
        gravity: 90,
        additive: true
      });
    }
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
      tickTimer: 0,
      isUltimate: !!opts.isUltimate
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
      maxLife: opts.maxLife || 1.25,
      isUltimate: !!opts.isUltimate
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
      maxLife: opts.maxLife || 0.88,
      isUltimate: !!opts.isUltimate
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
      damage: opts.damage ?? 28,
      delay: opts.delay || 0,
      impacted: false,
      linger: 0,
      maxLinger: opts.maxLinger || 0.48,
      isUltimate: !!opts.isUltimate
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
      isUltimate: !!opts.isUltimate,
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
      const pCount = ca.isUltimate ? 2 : 1;
      for (let k = 0; k < pCount; k++) {
        this.spawnParticle({
          x: ca.fighter.x + (Math.random() - 0.5) * 105,
          y: ca.fighter.y - 18 - Math.random() * 120,
          vx: (Math.random() - 0.5) * 55,
          vy: -145 - Math.random() * 115,
          size: ca.isUltimate ? 8 : 6,
          color: Math.random() > 0.35 ? ca.mainColor : ca.coreColor,
          maxLife: 0.42,
          gravity: -75
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

    // Emit solar flare pixel particles from active supernovas
    for (const sn of this.supernovas) {
      for (let k = 0; k < 2; k++) {
        const ang = Math.random() * Math.PI * 2;
        const r = 30 + Math.random() * (sn.maxRadius * 0.65);
        this.spawnParticle({
          x: sn.x + Math.cos(ang) * r,
          y: sn.y + Math.sin(ang) * r * 0.65,
          vx: Math.cos(ang) * (80 + Math.random() * 90),
          vy: Math.sin(ang) * 60 - 70,
          size: 7 + Math.random() * 5,
          color: k === 0 ? sn.color : sn.coreColor,
          maxLife: 0.38,
          gravity: -40
        });
      }
    }

    // Emit rising radiant/arcane particles along active beams
    for (const b of this.beams) {
      if (Math.random() < 0.85) {
        this.spawnParticle({
          x: b.x + (Math.random() - 0.5) * b.width,
          y: b.groundY - Math.random() * 240,
          vx: (Math.random() - 0.5) * 65,
          vy: -180 - Math.random() * 140,
          size: 7,
          color: Math.random() > 0.4 ? b.color : b.coreColor,
          maxLife: 0.36,
          gravity: -60
        });
      }
    }

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
        this.spawnBurst(cs.x, cs.groundY - 12, 16, '#bae6fd', 220, { upBias: 115, size: 7 });
        this.spawnGlyphBurst(cs.x, cs.groundY - 45, 5, 'steel');
        if (cs.target && !cs.target.isDead && Math.abs(cs.target.x - cs.x) < 76) {
          cs.target.takeDamage(cs.damage, cs.owner, false, 65, -90);
        }
      } else if (Math.random() < 0.65) {
        this.spawnParticle({
          x: cs.x + (Math.random() - 0.5) * cs.width * 0.8,
          y: cs.groundY - Math.random() * cs.height * 0.85,
          vx: (Math.random() - 0.5) * 50,
          vy: -90 - Math.random() * 80,
          size: 6,
          color: Math.random() > 0.4 ? cs.color : '#ffffff',
          maxLife: 0.32,
          gravity: -35
        });
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
      for (let k = 0; k < 2; k++) {
        const h = Math.random() * tor.height;
        const r = tor.radius * (0.35 + (h / tor.height) * 0.85);
        const a = tor.life * 18 + h * 0.05 + k * Math.PI;
        this.spawnParticle({
          x: tor.x + Math.cos(a) * r,
          y: tor.groundY - h,
          vx: -Math.sin(a) * 165,
          vy: -135 - Math.random() * 95,
          size: 7,
          color: Math.random() > 0.35 ? tor.color : tor.coreColor,
          maxLife: 0.36
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
        this.spawnParticle({
          x: s.x + (Math.random() - 0.5) * 16,
          y: s.y - 18,
          vx: -s.vx * 0.12 + (Math.random() - 0.5) * 35,
          vy: -75,
          size: s.type === 'runeblade' ? 8 : 6,
          color: Math.random() > 0.35 ? s.color : s.coreColor,
          maxLife: 0.32
        });
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
          if (s.damage > 0 && s.target && !s.target.isDead && Math.abs(s.target.x - s.x) < 92) {
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
    const rgbForType = (type) => {
      if (type === 'cyan') return { nr: 0.22, ng: 0.74, nb: 0.98 };
      if (type === 'emerald') return { nr: 0.16, ng: 0.85, nb: 0.58 };
      if (type === 'violet') return { nr: 0.78, ng: 0.36, nb: 0.98 };
      if (type === 'teal') return { nr: 0.18, ng: 0.86, nb: 0.78 };
      if (type === 'gold') return { nr: 1.0, ng: 0.88, nb: 0.28 };
      return { nr: 1.0, ng: 0.52, nb: 0.16 };
    };
    const typeForHex = (col) => {
      if (!col) return 'cyan';
      if (col === '#10b981' || col === '#34d399' || col === '#6ee7b7' || col === '#a7f3d0' || col === '#4ade80') {
        return 'emerald';
      }
      if (
        col === '#c084fc' ||
        col === '#9333ea' ||
        col === '#7e22ce' ||
        col === '#e11d48' ||
        col === '#f43f5e' ||
        col === '#e879f9'
      ) {
        return 'violet';
      }
      if (col === '#2dd4bf' || col === '#99f6e4' || col === '#14b8a6' || col === '#5eead4') {
        return 'teal';
      }
      if (
        col === '#fde047' ||
        col === '#facc15' ||
        col === '#eab308' ||
        col === '#fef08a' ||
        col === '#fef9c3' ||
        col === '#ca8a04'
      ) {
        return 'gold';
      }
      if (col === '#fb923c' || col === '#f97316' || col === '#ea580c' || col === '#dc2626') {
        return 'orange';
      }
      return 'cyan';
    };
    const pushLight = (x, y, radius, colorType, intensity, z = 68) => {
      const { nr, ng, nb } = rgbForType(colorType);
      lights.push({ x, y, z, radius, colorType, intensity, nr, ng, nb });
    };

    for (const f of fighters) {
      const colorType = typeForHex(f.primaryColor);
      pushLight(
        f.x + f.facing * 24,
        f.y - 68,
        f.state === 'ULTIMATE' ? 295 : f.state === 'SKILL' ? 235 : 175,
        colorType,
        f.state === 'ULTIMATE' ? 1.85 : f.state === 'SKILL' ? 1.50 : 1.12,
        64
      );
      // Seraphina's active Cathedral Rose Halo & Seraphim Wings emit intense Celestial Gold + Emerald Grace light!
      if (f.heroId === 'priestess' && (f.state === 'SKILL' || f.state === 'ULTIMATE' || f.isAngelicAscent)) {
        pushLight(f.x, f.y - 124, f.state === 'ULTIMATE' ? 385 : 310, 'gold', f.state === 'ULTIMATE' ? 1.98 : 1.75, 90);
        pushLight(f.x, f.y - 95, 240, 'emerald', 1.35, 76);
      }
      // Chronomancer's active Colossal Doomsday Clock & Stasis Hourglass emit intense dual Teal + Gold light!
      if (f.doomsdayClock) {
        pushLight(f.doomsdayClock.x, f.doomsdayClock.y, 410, 'teal', 1.95, 92);
        pushLight(f.doomsdayClock.x, f.doomsdayClock.y + 40, 340, 'gold', 1.75, 84);
      }
      if (f.stasisHourglass) {
        pushLight(f.stasisHourglass.x, f.stasisHourglass.y - 95, 295, 'gold', 1.80, 76);
        pushLight(f.stasisHourglass.x, f.stasisHourglass.y - 95, 250, 'teal', 1.65, 76);
      }
      if (f.deathAvatar) {
        pushLight(f.deathAvatar.x, f.deathAvatar.y - 140, 340, 'violet', 1.75, 85);
      }
    }
    for (const p of this.projectiles) {
      const colorType = typeForHex(p.color);
      pushLight(
        p.x,
        p.y,
        p.isMeteor ? 360 : p.type === 'clock_gear' ? 225 : 205,
        colorType,
        p.isMeteor ? 1.85 : p.type === 'clock_gear' ? 1.55 : 1.42,
        72
      );
    }
    for (const b of this.beams) {
      const colorType = typeForHex(b.color);
      const midX = (b.x1 + b.x2) * 0.5;
      const midY = (b.y1 + b.y2) * 0.5;
      pushLight(midX, midY, 310, colorType, 1.85, 86);
      pushLight(b.x2, b.y2, 295, colorType, 1.90, 82);
    }
    for (const s of this.slashes) {
      const midA = (s.startAngle + s.endAngle) * 0.5;
      const sx = s.x + Math.cos(midA) * s.radius * 0.65;
      const sy = s.y + Math.sin(midA) * s.radius * 0.65;
      pushLight(sx, sy, 215, typeForHex(s.color), 1.48, 72);
    }
    for (const ss of this.skyStrikes) {
      if (ss.delay <= 0) {
        pushLight(ss.x, ss.y, 195, typeForHex(ss.color), 1.42, 74);
      }
    }
    for (const pil of this.pillars) {
      const colorType =
        pil.theme === 'emerald'
          ? 'emerald'
          : pil.theme === 'steel'
            ? 'cyan'
            : pil.theme === 'radiant'
              ? 'gold'
              : 'orange';
      pushLight(
        pil.x,
        gy - 85,
        pil.erupted ? 285 : 175,
        colorType,
        pil.erupted ? 1.8 : 1.1,
        75
      );
    }
    for (const tor of this.tornados) {
      pushLight(
        tor.x,
        gy - 110,
        295,
        tor.color === '#38bdf8' ? 'cyan' : 'emerald',
        1.75,
        82
      );
    }
    for (const sn of this.supernovas) {
      pushLight(sn.x, sn.y, 380, 'orange', 1.95, 90);
    }
    for (const sp of this.crystalSpikes) {
      if (sp.life >= 0) {
        pushLight(sp.x, sp.groundY - sp.height * 0.5, 175, 'cyan', 1.25, 62);
      }
    }
    // Sample active character particles & glyphs so swirling particle bursts cast real 3D normal-mapped light!
    const pLen = this.particles.length;
    if (pLen > 0) {
      const stride = Math.max(1, Math.floor(pLen / 8));
      for (let i = 0; i < pLen && lights.length < 34; i += stride) {
        const pt = this.particles[i];
        const fade = 1 - pt.life / pt.maxLife;
        if (fade > 0.25) {
          pushLight(pt.x, pt.y, 135, typeForHex(pt.color), 0.95 * fade, 62);
        }
      }
    }
    const gLen = this.glyphs.length;
    if (gLen > 0) {
      const gStride = Math.max(1, Math.floor(gLen / 5));
      for (let i = 0; i < gLen && lights.length < 38; i += gStride) {
        const gl = this.glyphs[i];
        const fade = 1 - gl.life / gl.maxLife;
        if (fade > 0.25) {
          pushLight(gl.x, gl.y, 145, typeForHex(gl.color), 1.05 * fade, 64);
        }
      }
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

  renderMainPass(ctx, isReflection = false, renderer = null, ultimateOnly = false) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const assets = PixelForge.initAssets();

    // 1. TORNADOS: Unmistakable Conical S-Curving Pixel-Art Tornado Funnel with Swirling Horizontal Wind Bands & Top Vortex Eye
    for (const tor of this.tornados) {
      const isUltTor = !!tor.isUltimate || tor.radius >= 95;
      if (!isReflection && isUltTor !== ultimateOnly) continue;
      const fade = Math.min(1, (tor.maxLife - tor.life) * 3.2, tor.life * 5.5);
      const pxSize = 4;
      const baseX = Math.round(tor.x / pxSize) * pxSize;
      const baseY = Math.round(tor.groundY / pxSize) * pxSize;
      const isSteel = tor.color === '#38bdf8';

      ctx.save();
      if (renderer && !isReflection) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.42;
        const glow = isSteel ? renderer.glowCyan : renderer.glowEmerald || renderer.glowCyan;
        ctx.drawImage(glow, baseX - 210, baseY - tor.height - 30, 420, tor.height + 80);
      }

      const bands = 32;
      const totalH = Math.round(tor.height * 1.04);
      const bandH = Math.max(6, Math.ceil(totalH / bands));
      const vfxSheet = isSteel ? assets.warrior?.vfx : assets.archer?.vfx;

      // A. Conical S-Curving Pixel-Art Tornado Funnel Sprite (sliced from archer_vfx.png Cell 1: x=256, y=0, w=256, h=256)
      const spriteW = Math.round((tor.radius * 2.55) / 4) * 4;
      for (let b = 0; b < bands; b++) {
        const hFrac = b / (bands - 1); // 0.0 at narrow ground tip -> 1.0 at wide top mouth
        const coneProfile = 0.16 + Math.pow(hFrac, 0.85) * 0.70 + Math.pow(hFrac, 2.2) * 0.36;
        const halfW = Math.max(10, Math.round((tor.radius * coneProfile) / 4) * 4);
        const spineSway = Math.round(
          (Math.sin(tor.life * 13 - hFrac * 4.8) * (4 + Math.sin(hFrac * Math.PI) * 18)) / 4
        ) * 4;
        const cx = baseX + spineSway;
        const cy = Math.round((baseY - hFrac * totalH) / 4) * 4;
        const spinPhase = tor.life * 22 - hFrac * 12;

        // 1. Slice-warped bespoke tornado sprite pass from archer_vfx.png (preserves natural tapered silhouette & transparency!)
        if (!isSteel && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
          const srcY = Math.round(240 - hFrac * 224);
          const wobbleW = Math.round((spriteW * (0.94 + 0.08 * Math.sin(spinPhase))) / 4) * 4;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade * (isReflection ? 0.35 : 0.92);
          ctx.drawImage(vfxSheet, 256, srcY, 256, 9, -wobbleW * 0.5, -bandH * 0.6, wobbleW, bandH + 3);
          ctx.restore();
        }

        // 2. Airy Swirling Elliptical Wind-Ring Arcs (open ring segments, never a solid opaque wall!)
        if (b % 2 === 0) {
          for (let seg = 0; seg < 5; seg++) {
            const a = spinPhase + (seg / 5) * Math.PI * 2;
            const sinA = Math.sin(a);
            const wx = Math.round((cx + Math.cos(a) * halfW * 0.88) / 4) * 4;
            const wy = Math.round((cy + sinA * 6) / 4) * 4;
            const segW = Math.max(8, Math.round((halfW * 0.42) / 4) * 4);
            ctx.globalCompositeOperation = sinA > 0 ? 'lighter' : 'source-over';
            ctx.globalAlpha = fade * (sinA > 0 ? 0.55 : 0.65) * (isReflection ? 0.4 : 1);
            ctx.fillStyle =
              sinA > 0.4
                ? '#fef08a'
                : isSteel
                  ? sinA > 0
                    ? '#38bdf8'
                    : '#0284c7'
                  : sinA > 0
                    ? '#34d399'
                    : '#059669';
            ctx.fillRect(wx - segW * 0.5, wy - 2, segW, 4);
          }
        }
      }

      // C. Outer Helical Wind Ribbons & Orbiting Razor Leaves Spiraling Up Outside the Funnel Cone
      const ribbonTurns = 18;
      for (let i = 0; i < ribbonTurns; i++) {
        const hFrac = ((i / ribbonTurns) + tor.life * 1.8) % 1;
        const coneProfile = 0.18 + Math.pow(hFrac, 0.85) * 0.82 + Math.pow(hFrac, 2.4) * 0.45;
        const orbitR = tor.radius * coneProfile * 1.16;
        const spineSway = Math.sin(tor.life * 13 - hFrac * 4.8) * (4 + Math.sin(hFrac * Math.PI) * 22);
        const angle = tor.life * 22 - hFrac * 11 + (i % 2) * Math.PI;
        const sinA = Math.sin(angle);
        if (sinA < -0.2 && !isReflection) continue; // Only draw front/side wrapping wind ribbons over the cone

        const rx = Math.round((baseX + spineSway + Math.cos(angle) * orbitR) / 4) * 4;
        const ry = Math.round((baseY - hFrac * totalH + sinA * orbitR * 0.20) / 4) * 4;
        const w = Math.max(8, Math.round((14 + hFrac * 20) / 4) * 4);

        if (!isReflection) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.42;
          ctx.fillStyle = isSteel ? '#38bdf8' : '#34d399';
          ctx.fillRect(rx - w * 0.6, ry - 4, w * 1.2, 8);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.95;
        ctx.fillStyle = i % 3 === 0 ? '#fef08a' : isSteel ? '#bae6fd' : '#6ee7b7';
        ctx.fillRect(rx - w * 0.5, ry - 2, w, 4);
      }

      // D. Ground Dust-Devil Debris Ring at the Narrow Funnel Tip
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * (isReflection ? 0.35 : 0.94);
      for (let g = 0; g < 14; g++) {
        const ga = (g / 14) * Math.PI * 2 + tor.life * 25;
        const grx = tor.radius * 0.48;
        const gry = grx * 0.28;
        const gx = Math.round((baseX + Math.cos(ga) * grx) / 4) * 4;
        const gy = Math.round((baseY - 4 + Math.sin(ga) * gry) / 4) * 4;
        ctx.fillStyle = g % 2 === 0 ? (isSteel ? '#7dd3fc' : '#6ee7b7') : isSteel ? '#0284c7' : '#047857';
        ctx.fillRect(gx - 6, gy - 3, 12, 6);
      }
      ctx.restore();
    }

    // 2. FLAME & ELEMENTAL PILLARS: Saturated Pixel Glowing Hellfire Magma Pillar & Sacred Cathedral Pillars
    for (const pil of this.pillars) {
      const isUltPil = !!pil.isUltimate;
      if (!isReflection && isUltPil !== ultimateOnly) continue;
      const p = Math.min(1, pil.life / Math.max(0.15, pil.delay));
      const pxSize = 6;
      const baseX = Math.round(pil.x / pxSize) * pxSize;
      const baseY = Math.round(pil.groundY / pxSize) * pxSize;
      const isEmerald = pil.theme === 'emerald';
      const isSteel = pil.theme === 'steel';
      const isRadiant = pil.theme === 'radiant';
      const sigilCol = isEmerald ? '#10b981' : isSteel ? '#0ea5e9' : isRadiant ? '#eab308' : '#ea580c';
      const accentCol = isEmerald ? '#34d399' : isSteel ? '#38bdf8' : isRadiant ? '#facc15' : '#f97316';

      // Ground Pixel Octagram Sigil
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.9;
      const rX = 82 * p * pil.scaleWidth;
      const rY = 24 * p * pil.scaleWidth;
      const rot = pil.life * 4.2;
      for (let deg = 0; deg < 360; deg += 15) {
        const a = (deg * Math.PI) / 180 + rot;
        const sx = Math.round((baseX + Math.cos(a) * rX) / 4) * 4;
        const sy = Math.round((baseY + Math.sin(a) * rY) / 4) * 4;
        ctx.fillStyle = deg % 45 === 0 ? accentCol : sigilCol;
        ctx.fillRect(sx - 3, sy - 2, 6, 4);
      }
      ctx.restore();

      if (pil.erupted && pil.life < pil.maxLife - 0.08) {
        const fade = Math.min(1, (pil.maxLife - pil.life) * 3.2);
        const pop = Math.min(1, (pil.life - pil.delay) / 0.14);
        ctx.save();
        if (renderer && !isReflection) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.42;
          const glow = renderer.getGlowForColor(sigilCol);
          ctx.drawImage(glow, baseX - 190, baseY - 340, 380, 380);
        }

        const mageVfx = assets.mage?.vfx;
        const priestVfx = assets.priestess?.vfx;
        const flipWave = Math.floor(pil.life * 15) % 2 === 0 ? 1 : -1;

        if (!isRadiant && !isEmerald && !isSteel && mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
          const pilW = Math.round(248 * pil.scaleWidth);
          const pilH = Math.round(328 * pil.scaleWidth * (0.35 + 0.65 * pop));
          ctx.save();
          ctx.translate(baseX, baseY + 14);
          ctx.scale(flipWave, 1);
          this.drawBloomedSprite(
            ctx,
            renderer,
            mageVfx,
            320,
            56,
            208,
            208,
            Math.round(-pilW * 0.5),
            Math.round(-pilH),
            pilW,
            pilH,
            '#fb923c',
            fade * (isReflection ? 0.48 : 0.98),
            isReflection
          );
          ctx.restore();
        } else if (isRadiant && priestVfx && priestVfx.complete && priestVfx.naturalWidth) {
          const haloSz = Math.round(224 * pil.scaleWidth);
          const spearSz = Math.round(232 * pil.scaleWidth * pop);
          ctx.save();
          ctx.translate(baseX, baseY - 140 * pil.scaleWidth);
          ctx.rotate(pil.life * 2.4);
          this.drawBloomedSprite(
            ctx,
            renderer,
            priestVfx,
            0,
            0,
            320,
            320,
            Math.round(-haloSz * 0.5),
            Math.round(-haloSz * 0.5),
            haloSz,
            haloSz,
            '#fde047',
            fade * (isReflection ? 0.45 : 0.94),
            isReflection
          );
          ctx.restore();
          ctx.save();
          ctx.translate(baseX, baseY - 115 * pil.scaleWidth);
          this.drawBloomedSprite(
            ctx,
            renderer,
            priestVfx,
            320,
            56,
            208,
            208,
            Math.round(-spearSz * 0.5),
            Math.round(-spearSz * 0.5),
            spearSz,
            spearSz,
            '#fde047',
            fade * (isReflection ? 0.48 : 0.98),
            isReflection
          );
          ctx.restore();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * (isReflection ? 0.35 : 0.85);
        const rows = Math.round(42 * pil.scaleWidth);
        const halfSpan = Math.max(2, Math.round(5 * pil.scaleWidth));
        for (let row = 0; row < rows; row += 2) {
          const ribCol = Math.round(Math.sin(pil.life * 24 - row * 0.38) * (halfSpan + 2));
          ctx.fillStyle = row % 4 === 0 ? accentCol : sigilCol;
          ctx.fillRect(baseX + ribCol * pxSize, baseY - (row + 1) * pxSize, pxSize, pxSize);
        }
        ctx.restore();
      }
    }

    // 3. SKY STRIKES: Saturated Chunky-Pixel Heavenly Runeblades, Valkyrie Spears & Starfall Arrows
    for (const s of this.skyStrikes) {
      const isUltStrike = !!s.isUltimate;
      if (!isReflection && isUltStrike !== ultimateOnly) continue;
      if (s.delay > 0) continue;
      const fade = s.impacted ? Math.max(0, 1 - s.linger / s.maxLinger) : 1;
      const sx = Math.round(s.x / 2) * 2;
      const sy = Math.round(s.y / 2) * 2;

      ctx.save();
      if (s.type === 'runeblade') {
        const warriorVfx = assets.warrior?.vfx;
        const bladeSz = 228;
        this.drawBloomedSprite(
          ctx,
          renderer,
          warriorVfx,
          0,
          0,
          320,
          320,
          Math.round(sx - bladeSz * 0.5),
          Math.round(sy - bladeSz + 16),
          bladeSz,
          bladeSz,
          '#38bdf8',
          fade * (isReflection ? 0.5 : 0.98),
          isReflection
        );
      } else if (s.type === 'holy_spear') {
        const priestVfx = assets.priestess?.vfx;
        const spearSz = 200;
        this.drawBloomedSprite(
          ctx,
          renderer,
          priestVfx,
          320,
          56,
          208,
          208,
          Math.round(sx - spearSz * 0.5),
          Math.round(sy - spearSz + 14),
          spearSz,
          spearSz,
          '#fde047',
          fade * (isReflection ? 0.5 : 0.98),
          isReflection
        );
      } else {
        const archerVfx = assets.archer?.vfx;
        const ang = Math.atan2(s.vy, s.vx || 0.01);
        ctx.translate(sx, sy);
        ctx.rotate(ang);
        const arrSz = 124;
        this.drawBloomedSprite(
          ctx,
          renderer,
          archerVfx,
          528,
          56,
          208,
          208,
          Math.round(-arrSz * 0.72),
          Math.round(-arrSz * 0.5),
          arrSz,
          arrSz,
          '#10b981',
          fade * (isReflection ? 0.5 : 0.98),
          isReflection
        );
      }
      ctx.restore();
    }

    // 4. TAPERED COILING WIND-DRAGON ARROW PIERCER & CELESTIAL / SUPERNOVA BEAMS (Always Ultimate -> render in front!)
    for (const b of isReflection || ultimateOnly ? this.beams : []) {
      const t = b.life / b.maxLife;
      const env = Math.sin(t * Math.PI);
      const beamAlpha = (1 - t * 0.32) * (isReflection ? 0.42 : 0.96);

      ctx.save();
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

      // 1. Emit large radial light halos along the beam shaft so beams visibly illuminate the stage!
      if (renderer && !isReflection && renderer.getGlowForColor) {
        const bGlow = renderer.getGlowForColor(b.color);
        if (bGlow) {
          ctx.globalCompositeOperation = 'lighter';
          const gR = Math.max(95, b.width * 2.4);
          for (let gStep = 0; gStep <= 4; gStep++) {
            const gx = tailX + (spanLen * gStep) / 4;
            ctx.globalAlpha = beamAlpha * 0.42;
            ctx.drawImage(bGlow, gx - gR, -gR * 0.65, gR * 2, gR * 1.3);
          }
        }
      }

      for (let x = tailX; x <= headX; x += stepPx) {
        const u = (x - tailX) / spanLen;
        const taper = Math.sin(Math.pow(u, 0.65) * Math.PI);
        const hOuter = Math.max(4, Math.round(((b.width * 0.68 * taper * env) / 4)) * 4);
        const hInner = Math.max(4, Math.round((hOuter * 0.52) / 2) * 2);
        const undulate = Math.round((Math.sin(x * 0.032 - b.life * 32) * 8 * (1 - u * 0.5)) / 2) * 2;

        // Additive outer beam glow sheath in lighter mode
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = beamAlpha * (isReflection ? 0.24 : 0.48);
        ctx.fillStyle = b.color;
        ctx.fillRect(x - 2, undulate - hOuter * 1.05, stepPx + 4, hOuter * 2.1);

        // Saturated beam body + incandescent white-hot inner core
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = beamAlpha;
        ctx.fillStyle = b.color;
        ctx.fillRect(x, undulate - hOuter * 0.5, stepPx, hOuter);
        ctx.fillStyle = b.coreColor;
        ctx.fillRect(x, undulate - hInner * 0.5, stepPx, hInner);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, undulate - Math.max(2, hInner * 0.25), stepPx, Math.max(4, hInner * 0.5));

        const helix1 = Math.round((Math.sin(x * 0.055 - b.life * 36) * (hOuter * 1.15 + 10)) / 4) * 4;
        const helix2 = Math.round((-Math.sin(x * 0.055 - b.life * 36) * (hOuter * 1.15 + 10)) / 4) * 4;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = beamAlpha * 0.55;
        ctx.fillStyle = b.color;
        ctx.fillRect(x - 2, undulate + helix1 - 5, 12, 10);
        ctx.fillRect(x - 2, undulate + helix2 - 5, 12, 10);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = beamAlpha;
        ctx.fillStyle = b.coreColor;
        ctx.fillRect(x, undulate + helix1 - 3, 8, 6);
        ctx.fillStyle = b.color;
        ctx.fillRect(x, undulate + helix2 - 3, 8, 6);
      }

      const isEmeraldBeam = b.color === '#10b981' || b.color === '#34d399';
      const isHolyBeam =
        b.color === '#fde047' ||
        b.color === '#facc15' ||
        b.color === '#fef08a' ||
        b.color === '#ca8a04' ||
        b.color === '#eab308';
      const isFireBeam = b.color === '#fb923c' || b.color === '#ea580c' || b.color === '#f97316';
      const archerVfx = assets.archer?.vfx;
      const priestVfx = assets.priestess?.vfx;
      const mageVfx = assets.mage?.vfx;

      if (isEmeraldBeam && archerVfx) {
        const dragSz = 276;
        this.drawBloomedSprite(
          ctx,
          renderer,
          archerVfx,
          0,
          0,
          320,
          320,
          Math.round(headX - dragSz * 0.62),
          Math.round(-dragSz * 0.5),
          dragSz,
          dragSz,
          '#10b981',
          1 - t * 0.3,
          isReflection
        );
      } else if (isHolyBeam && priestVfx) {
        const starSz = 164;
        this.drawBloomedSprite(
          ctx,
          renderer,
          priestVfx,
          528,
          56,
          208,
          208,
          Math.round(headX - starSz * 0.5),
          Math.round(-starSz * 0.5),
          starSz,
          starSz,
          '#fde047',
          1 - t * 0.25,
          isReflection
        );
      } else if (isFireBeam && mageVfx) {
        const meteorSz = 158;
        this.drawBloomedSprite(
          ctx,
          renderer,
          mageVfx,
          528,
          56,
          208,
          208,
          Math.round(headX - meteorSz * 0.5),
          Math.round(-meteorSz * 0.5),
          meteorSz,
          meteorSz,
          '#fb923c',
          1 - t * 0.3,
          isReflection
        );
      }

      ctx.restore();
    }

    // 4B. GLACIAL FROST-CRYSTAL SPIRES (Saturated Chunky-Pixel Ice Spire Cluster from warrior_vfx.png)
    for (const cs of this.crystalSpikes) {
      const isUltSpike = !!cs.isUltimate || cs.maxLife >= 0.9;
      if (!isReflection && isUltSpike !== ultimateOnly) continue;
      if (cs.delay > 0) continue;
      const t = cs.life / cs.maxLife;
      const pop = Math.min(1, cs.life / 0.12);
      const fade = Math.min(1, (1 - t) * 2.5);
      const bx = Math.round(cs.x / 2) * 2;
      const by = Math.round(cs.groundY / 2) * 2;
      const warriorVfx = assets.warrior?.vfx;

      ctx.save();
      if (warriorVfx && warriorVfx.complete && warriorVfx.naturalWidth) {
        const spireW = Math.round(cs.width * 3.95);
        const spireH = Math.round(cs.height * 1.44 * pop);
        ctx.translate(bx, by + 10);
        ctx.rotate(cs.tilt * 0.18);
        this.drawBloomedSprite(
          ctx,
          renderer,
          warriorVfx,
          320,
          56,
          208,
          208,
          Math.round(-spireW * 0.5),
          Math.round(-spireH),
          spireW,
          spireH,
          '#38bdf8',
          fade * (isReflection ? 0.45 : 0.98),
          isReflection
        );
      }
      ctx.restore();
    }

    // 4C. BLACK-GOLD SOLAR ECLIPSE SUPERNOVA SPHERE (Saturated Chunky-Pixel Eclipse Sun from mage_vfx.png — Always Ultimate!)
    for (const sn of isReflection || ultimateOnly ? this.supernovas : []) {
      const t = sn.life / sn.maxLife;
      const env = Math.sin(Math.min(1, t * 1.15) * Math.PI);
      const rad = Math.max(24, Math.round((sn.maxRadius * (0.45 + 0.55 * env)) / 4) * 4);
      const sx = Math.round(sn.x / 2) * 2;
      const sy = Math.round(sn.y / 2) * 2;
      const mageVfx = assets.mage?.vfx;

      ctx.save();
      if (mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
        const eclipseSz = Math.round(rad * 2.75);
        ctx.translate(sx, sy);
        ctx.rotate(sn.life * 0.55);
        this.drawBloomedSprite(
          ctx,
          renderer,
          mageVfx,
          0,
          0,
          320,
          320,
          Math.round(-eclipseSz * 0.5),
          Math.round(-eclipseSz * 0.5),
          eclipseSz,
          eclipseSz,
          '#fb923c',
          env * (isReflection ? 0.48 : 0.98),
          isReflection
        );
      }
      ctx.restore();
    }

    // 5. PARTICLES: Deeply Saturated 4px-Aligned Chunky Pixel Blocks with Radiant Light Emission & Incandescent Cores!
    for (const p of !ultimateOnly ? this.particles : []) {
      const t = p.life / p.maxLife;
      const fade = 1 - t;
      const s = Math.max(4, Math.round(((p.size * fade + p.endSize * t) / 4)) * 4);
      const px = Math.round(p.x / 4) * 4;
      const py = Math.round(p.y / 4) * 4;
      const pCol = p.color === '#ffffff' ? '#fef9c3' : p.color;

      // 1. Radiant radial jewel-tone light halo around every chunky pixel particle so every particle visibly emits light!
      if (renderer && !isReflection && s >= 4) {
        const glowTex = renderer.getGlowForColor ? renderer.getGlowForColor(pCol) : renderer.glowCyan;
        const glowR = Math.max(22, s * 4.2);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.46;
        ctx.drawImage(glowTex, px - glowR, py - glowR, glowR * 2, glowR * 2);
      }
      // 2. Stepped chunky outer pixel bloom block (+6px) in lighter mode
      ctx.globalCompositeOperation = 'lighter';
      const outerS = s + 6;
      ctx.globalAlpha = fade * (isReflection ? 0.22 : 0.42);
      ctx.fillStyle = pCol;
      ctx.fillRect(px - outerS * 0.5, py - outerS * 0.5, outerS, outerS);
      // 3. Richly saturated main chunky pixel block + incandescent white-gold core pixel in source-over
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * (isReflection ? 0.70 : 0.98);
      ctx.fillStyle = pCol;
      ctx.fillRect(px - s * 0.5, py - s * 0.5, s, s);
      const coreS = Math.max(2, Math.round(s * 0.45));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - coreS * 0.5, py - coreS * 0.5, coreS, coreS);
    }

    // 6. SLASHES: Deeply Saturated Chunky-Pixel Crescent Blade, Scythe & Whirlwind Waves + Stepped Arcs
    ctx.globalCompositeOperation = 'source-over';
    for (const s of this.slashes) {
      const isUltSlash = s.radius >= 118;
      if (!isReflection && isUltSlash !== ultimateOnly) continue;
      const t = s.life / s.maxLife;
      const alpha = 1 - t;
      const isFullCircle = Math.abs(s.endAngle - s.startAngle) > Math.PI * 1.8;
      const steps = isFullCircle ? 32 : 28;
      ctx.globalAlpha = alpha * (isReflection ? 0.35 : isFullCircle ? 0.58 : 0.92);
      const isCyan =
        s.color === '#38bdf8' ||
        s.color === '#7dd3fc' ||
        s.color === '#0284c7' ||
        s.color === '#bae6fd' ||
        s.color === '#e0f2fe' ||
        s.color === '#ffffff' ||
        s.color === '#0ea5e9' ||
        s.color === '#0369a1';
      const isEmerald = s.color === '#10b981' || s.color === '#34d399' || s.color === '#6ee7b7';
      const isAbyssal =
        s.color === '#c084fc' ||
        s.color === '#9333ea' ||
        s.color === '#7e22ce' ||
        s.color === '#f43f5e' ||
        s.color === '#e879f9';
      const isRadiant = s.color === '#fde047' || s.color === '#facc15' || s.color === '#f59e0b';
      const isChrono = s.color === '#2dd4bf' || s.color === '#99f6e4';
      const outerTone = isCyan
        ? '#0369a1'
        : isEmerald
          ? '#047857'
          : isAbyssal
            ? '#4c1d95'
            : isRadiant
              ? '#a16207'
              : isChrono
                ? '#0f766e'
                : '#0369a1';
      const midTone = isCyan
        ? '#0284c7'
        : isEmerald
          ? '#059669'
          : isAbyssal
            ? '#7e22ce'
            : isRadiant
              ? '#ca8a04'
              : isChrono
                ? '#0d9488'
                : '#0284c7';
      const innerTone = isCyan
        ? '#38bdf8'
        : isEmerald
          ? '#34d399'
          : isAbyssal
            ? '#e11d48'
            : isRadiant
              ? '#facc15'
              : isChrono
                ? '#2dd4bf'
                : '#38bdf8';

      // Draw Saturated Chunky-Pixel Slash Wave Sprite at the arc apex (NEVER use mage_vfx solar fireball for slashes!)
      if (!isReflection) {
        const midAng = (s.startAngle + s.endAngle) * 0.5 + (isFullCircle ? t * 8 : 0);
        const rad = s.radius + t * 14;
        const sx = Math.round(s.x + Math.cos(midAng) * rad * 0.72);
        const sy = Math.round(s.y + Math.sin(midAng) * (isFullCircle ? rad * 0.25 : rad * 0.72));
        const slashSize = Math.round(Math.min(196, Math.max(106, s.radius * 1.32)) * (1.06 - t * 0.18));

        let sheet = assets.warrior?.vfx;
        let cropX = 528;
        if (isAbyssal) {
          sheet = assets.reaper?.vfx;
          cropX = 736;
        } else if (isEmerald) {
          sheet = assets.archer?.vfx;
          cropX = 528;
        } else if (isRadiant) {
          sheet = assets.priestess?.vfx;
          cropX = 528;
        } else if (isChrono) {
          sheet = assets.chronomancer?.vfx;
          cropX = 528;
        } else {
          sheet = assets.warrior?.vfx;
          cropX = 528;
        }

        if (sheet && sheet.complete && sheet.naturalWidth) {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(isChrono ? Math.floor(t * 8) * (Math.PI * 0.5) : midAng);
          this.drawBloomedSprite(
            ctx,
            renderer,
            sheet,
            cropX,
            56,
            208,
            208,
            Math.round(-slashSize * 0.5),
            Math.round(-slashSize * 0.5),
            slashSize,
            slashSize,
            s.color,
            Math.min(1, alpha * 1.05),
            isReflection
          );
          ctx.restore();
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

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * (isReflection ? 0.18 : 0.34);
        ctx.fillStyle = midTone;
        ctx.fillRect(px - sz * 0.85, py - sz * 0.85, sz * 1.7, sz * 1.7);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * (isReflection ? 0.35 : isFullCircle ? 0.58 : 0.94);
        ctx.fillStyle = outerTone;
        ctx.fillRect(px - sz * 0.65, py - sz * 0.65, sz * 1.3, sz * 1.3);
        ctx.fillStyle = midTone;
        ctx.fillRect(px - sz * 0.45, py - sz * 0.45, sz * 0.9, sz * 0.9);
        if (sz >= 8) {
          ctx.fillStyle = innerTone;
          ctx.fillRect(px - sz * 0.25, py - sz * 0.25, sz * 0.5, sz * 0.5);
        }
      }
    }

    // 7. SHOCKWAVES: HD-2D Volumetric Light Bloom & Staggered Radial Particle Sparks (Zero Dotted Circles!)
    for (const sw of this.shockwaves) {
      const isUltSw = sw.maxRadius >= 155;
      if (!isReflection && isUltSw !== ultimateOnly) continue;
      const t = sw.life / sw.maxLife;
      const alpha = Math.max(0, 1 - t);
      const r = sw.maxRadius * (1 - Math.pow(1 - t, 3));
      const xScale = sw.vertical ? 0.42 : 1.0;
      const yScale = sw.flat ? 0.35 : 0.85;
      const glowTex =
        renderer && renderer.getGlowForColor ? renderer.getGlowForColor(sw.color) : null;

      if (glowTex && !isReflection) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.45;
        const glowW = Math.max(80, r * 2.1 * xScale);
        const glowH = Math.max(60, r * 2.1 * yScale);
        ctx.drawImage(glowTex, sw.x - glowW * 0.5, sw.y - glowH * 0.5, glowW, glowH);
      }

      const sparkCount = 16;
      for (let i = 0; i < sparkCount; i++) {
        // Golden-angle + staggered radial distance so particles form an organic burst, never a ring!
        const a = i * 2.39996 + t * (i % 2 === 0 ? 1.4 : -1.1);
        const distMult = 0.28 + ((i * 7 + 3) % 11) * 0.085;
        const curR = r * distMult;
        const px = Math.round((sw.x + Math.cos(a) * curR * xScale) / 3) * 3;
        const py = Math.round((sw.y + Math.sin(a) * curR * yScale - (sw.flat ? t * (12 + (i % 5) * 9) : 0)) / 3) * 3;
        const block = i % 3 === 0 ? 6 : 4;

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * (isReflection ? 0.42 : 0.92);
        ctx.fillStyle = sw.color;
        ctx.fillRect(px - block * 0.5, py - block * 0.5, block, block);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }

    // 8. PROJECTILES: Deeply Saturated Chunky-Pixel Astral Arrows, Frost Blade-Waves, Phantom Scythes, Clockwork Saw-Gears, Holy Orbs & Solar Fireballs
    ctx.globalAlpha = 1;
    for (const proj of this.projectiles) {
      const isUltProj = !!proj.isMeteor || !!proj.isUltimate;
      if (!isReflection && isUltProj !== ultimateOnly) continue;
      const r = proj.radius * 3.8;
      const px = Math.round(proj.x / 4) * 4;
      const py = Math.round(proj.y / 4) * 4;
      if (renderer) {
        const tex = renderer.getGlowForColor
          ? renderer.getGlowForColor(proj.color)
          : renderer.glowOrange;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = proj.type === 'clock_gear' ? 0.68 : 0.50;
        ctx.drawImage(tex, px - r * 1.15, py - r * 1.15, r * 2.3, r * 2.3);
        if (proj.type === 'clock_gear' && renderer.glowGold) {
          ctx.globalAlpha = 0.52;
          ctx.drawImage(renderer.glowGold, px - r * 0.9, py - r * 0.9, r * 1.8, r * 1.8);
        }
        ctx.restore();
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
            ctx.fillStyle = wStep < 4 ? '#facc15' : wStep < 7 ? '#ea580c' : '#9a3412';
            ctx.fillRect(wx + c * pSize, wy - c * pSize * 0.5, pSize, pSize);
          }
        }
        if (mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
          const mSize = 156;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(ang);
          this.drawBloomedSprite(
            ctx,
            renderer,
            mageVfx,
            528,
            56,
            208,
            208,
            -mSize * 0.5,
            -mSize * 0.5,
            mSize,
            mSize,
            '#fb923c',
            0.98,
            isReflection
          );
          ctx.restore();
        }
      } else if (proj.type === 'clock_gear') {
        const vfxSheet = assets.chronomancer?.vfx;
        const dir = Math.sign(proj.vx) || 1;
        // 90-degree stepped escapement rotation so every pixel of the clockwork saw-gear stays 100% orthogonal!
        const spin = Math.floor((proj.age || 0) * 10) * (Math.PI * 0.5) * dir;
        ctx.save();
        ctx.translate(px, py);
        for (let tStep = 1; tStep <= 6; tStep++) {
          const tx = -dir * tStep * 12;
          const ty = Math.round((Math.sin((proj.age || 0) * 32 - tStep * 0.9) * 8) / 4) * 4;
          ctx.fillStyle = tStep % 2 === 0 ? '#facc15' : '#2dd4bf';
          ctx.fillRect(tx - 4, ty - 4, 8, 8);
        }
        ctx.rotate(spin);
        if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
          const gearSize = 104;
          this.drawBloomedSprite(
            ctx,
            renderer,
            vfxSheet,
            528,
            56,
            208,
            208,
            -gearSize * 0.5,
            -gearSize * 0.5,
            gearSize,
            gearSize,
            '#2dd4bf',
            0.98,
            isReflection
          );
          if (!isReflection) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.36;
            ctx.drawImage(vfxSheet, 528, 56, 208, 208, -gearSize * 0.5, -gearSize * 0.5, gearSize, gearSize);
          }
        } else {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-16, -16, 32, 32);
        }
        ctx.restore();
      } else if (proj.type === 'phantom_scythe') {
        const reaperVfx = assets.reaper?.vfx;
        const dir = Math.sign(proj.vx) || 1;
        const spin = (proj.age || 0) * 22 * dir;
        ctx.save();
        ctx.translate(px, py);
        for (let tStep = 1; tStep <= 5; tStep++) {
          const tx = -dir * tStep * 12;
          const ty = Math.cos((proj.age || 0) * 28 - tStep) * 10;
          ctx.fillStyle = tStep % 2 === 0 ? '#e11d48' : '#7e22ce';
          ctx.fillRect(tx - 4, ty - 4, 8, 8);
        }
        ctx.rotate(spin);
        if (reaperVfx && reaperVfx.complete && reaperVfx.naturalWidth && reaperVfx.naturalWidth >= 944) {
          const scytheSize = 118;
          this.drawBloomedSprite(
            ctx,
            renderer,
            reaperVfx,
            736,
            56,
            208,
            208,
            -scytheSize * 0.5,
            -scytheSize * 0.5,
            scytheSize,
            scytheSize,
            '#c084fc',
            0.96,
            isReflection
          );
          ctx.rotate(Math.PI);
          this.drawBloomedSprite(
            ctx,
            null,
            reaperVfx,
            736,
            56,
            208,
            208,
            -scytheSize * 0.45,
            -scytheSize * 0.45,
            scytheSize * 0.9,
            scytheSize * 0.9,
            '#f43f5e',
            0.78,
            isReflection
          );
        }
        ctx.restore();
      } else if (proj.type === 'blade_wave') {
        const warriorVfx = assets.warrior?.vfx;
        const dir = Math.sign(proj.vx) || 1;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(dir, 1);
        for (let trail = 1; trail <= 5; trail++) {
          const tx = -trail * 14;
          const ty = ((trail * 17) % 36) - 18;
          ctx.fillStyle = trail % 2 === 0 ? '#0284c7' : '#38bdf8';
          ctx.fillRect(tx - 5, ty - 3, 10, 6);
        }
        if (warriorVfx && warriorVfx.complete && warriorVfx.naturalWidth) {
          const waveSize = 138;
          this.drawBloomedSprite(
            ctx,
            renderer,
            warriorVfx,
            528,
            56,
            208,
            208,
            -waveSize * 0.5,
            -waveSize * 0.5,
            waveSize,
            waveSize,
            '#38bdf8',
            0.96,
            isReflection
          );
        }
        ctx.restore();
      } else if (proj.type === 'arrow') {
        const archerVfx = assets.archer?.vfx;
        const ang = Math.atan2(proj.vy, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);

        for (let w = 1; w <= 7; w++) {
          const wx = -w * 10;
          const wy = Math.sin((proj.age || 0) * 36 - w * 0.9) * 10;
          ctx.fillStyle = w % 2 === 0 ? '#059669' : '#34d399';
          ctx.fillRect(wx - 5, wy - 3, 10, 6);
        }

        if (archerVfx && archerVfx.complete && archerVfx.naturalWidth) {
          const arrSize = 118;
          this.drawBloomedSprite(
            ctx,
            renderer,
            archerVfx,
            528,
            56,
            208,
            208,
            -arrSize * 0.5,
            -arrSize * 0.5,
            arrSize,
            arrSize,
            '#10b981',
            0.96,
            isReflection
          );
        } else {
          ctx.fillStyle = '#34d399';
          ctx.fillRect(-32, -4, 62, 8);
        }
        ctx.restore();
      } else if (proj.type === 'holy_light') {
        const priestessVfx = assets.priestess?.vfx;
        ctx.save();
        ctx.translate(px, py);
        for (let sat = 0; sat < 4; sat++) {
          const sa = (proj.age || 0) * 14 + (sat * Math.PI) / 2;
          const sx = Math.round((Math.cos(sa) * 28) / 2) * 2;
          const sy = Math.round((Math.sin(sa) * 28) / 2) * 2;
          ctx.fillStyle = sat % 2 === 0 ? '#ca8a04' : '#facc15';
          ctx.fillRect(sx - 4, sy - 4, 8, 8);
        }
        ctx.rotate((proj.age || 0) * 6);
        if (priestessVfx && priestessVfx.complete && priestessVfx.naturalWidth) {
          const orbSize = 98;
          this.drawBloomedSprite(
            ctx,
            renderer,
            priestessVfx,
            528,
            56,
            208,
            208,
            -orbSize * 0.5,
            -orbSize * 0.5,
            orbSize,
            orbSize,
            '#facc15',
            0.96,
            isReflection
          );
        }
        ctx.restore();
      } else {
        const mageVfx = assets.mage?.vfx;
        const ang = Math.atan2(proj.vy, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        for (let sat = 0; sat < 3; sat++) {
          const sa = (proj.age || 0) * 16 + (sat * Math.PI * 2) / 3;
          const sx = Math.round((Math.cos(sa) * 26) / 2) * 2;
          const sy = Math.round((Math.sin(sa) * 26) / 2) * 2;
          ctx.fillStyle = sat === 0 ? '#facc15' : '#ea580c';
          ctx.fillRect(sx - 4, sy - 4, 8, 8);
        }
        ctx.rotate(ang);
        if (mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
          const fbSize = 104;
          this.drawBloomedSprite(
            ctx,
            renderer,
            mageVfx,
            528,
            56,
            208,
            208,
            -fbSize * 0.5,
            -fbSize * 0.5,
            fbSize,
            fbSize,
            '#fb923c',
            0.96,
            isReflection
          );
        } else {
          ctx.fillStyle = proj.color;
          ctx.fillRect(-16, -12, 32, 24);
        }
        ctx.restore();
      }
    }

    // 9. LIGHTNINGS: Stepped Saturated Pixel-Art Skyward Thunderbolts with Radial Light Glow
    for (const l of isReflection || ultimateOnly ? this.lightnings : []) {
      const t = l.life / l.maxLife;
      const fade = 1 - t;
      const glowTex = renderer && renderer.getGlowForColor ? renderer.getGlowForColor(l.color) : null;
      for (let idx = 0; idx < l.pts.length - 1; idx++) {
        const p0 = l.pts[idx];
        const p1 = l.pts[idx + 1];
        const steps = 6;
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const lx = Math.round((p0.x + (p1.x - p0.x) * u) / 4) * 4;
          const ly = Math.round((p0.y + (p1.y - p0.y) * u) / 4) * 4;
          const wOuter = Math.max(4, Math.round((fade * 18) / 4) * 4);
          if (glowTex && !isReflection && s % 2 === 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = fade * 0.42;
            ctx.drawImage(glowTex, lx - 36, ly - 36, 72, 72);
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade;
          ctx.fillStyle = l.mainColor || '#0284c7';
          ctx.fillRect(lx - wOuter * 0.5, ly - 4, wOuter, 8);
          ctx.fillStyle = l.color === '#ffffff' ? '#38bdf8' : l.color;
          ctx.fillRect(lx - wOuter * 0.25, ly - 4, wOuter * 0.5, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(lx - 2, ly - 2, 4, 4);
        }
      }
    }

    // 10. PURE PIXEL-ART RUNIC CRYSTALS, SOLAR STARS, SACRED CROSSES, NECROTIC SKULLS, CLOCKWORK COGS & ASTRAL FEATHERS
    if (!isReflection && !ultimateOnly) {
      for (const g of this.glyphs) {
        const p = g.life / g.maxLife;
        const gx = Math.round(g.x / 2) * 2;
        const gy = Math.round(g.y / 2) * 2;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, (1 - p) * 1.45);

        if (renderer && renderer.getGlowForColor) {
          const glowTex = renderer.getGlowForColor(g.color);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, (1 - p) * 0.52);
          ctx.drawImage(glowTex, gx - 34, gy - 34, 68, 68);
          ctx.restore();
        }

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
        } else if (g.shape === 'cross') {
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 3, gy - 9, 6, 18);
          ctx.fillRect(gx - 9, gy - 3, 18, 6);
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 2, gy - 7, 4, 14);
          ctx.fillRect(gx - 7, gy - 2, 14, 4);
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
        const glowTex = renderer && renderer.getGlowForColor ? renderer.getGlowForColor(ca.mainColor) : null;

        ctx.save();
        // Rising Vertical Pixel-Art Energy Streamers framing the character's left & right silhouette
        const streamCount = ca.isUltimate ? 6 : 4;
        for (let s = 0; s < streamCount; s++) {
          const side = s % 2 === 0 ? -1 : 1;
          const lane = Math.floor(s / 2) + 1;
          const sx = Math.round((ca.fighter.x + side * (46 + lane * 16)) / 4) * 4;
          const phase = (ca.life * 260 + s * 42) % 140;
          const sy = Math.round((ca.fighter.y - 16 - phase) / 4) * 4;
          const sh = ca.isUltimate ? 28 : 20;
          if (glowTex) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = env * 0.42;
            ctx.drawImage(glowTex, sx - 26, sy - sh - 18, 52, sh + 36);
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = env * 0.94;
          ctx.fillStyle = ca.borderColor;
          ctx.fillRect(sx - 3, sy - sh - 2, 6, sh + 4);
          ctx.fillStyle = ca.mainColor;
          ctx.fillRect(sx - 2, sy - sh, 4, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - 1, sy - sh + 2, 2, 4);
        }

        ctx.restore();
      }

      // 12. ON-HIT ELEMENTAL CHUNKY-PIXEL IMPACT RAYS (Radiating Outward Around the Victim in Saturated Jewel Tones)
      for (const imp of this.hitImpacts) {
        const t = imp.life / imp.maxLife;
        const env = t < 0.18 ? t / 0.18 : Math.max(0, 1 - (t - 0.18) / 0.82);
        const ix = Math.round(imp.x / 4) * 4;
        const iy = Math.round(imp.y / 4) * 4;
        const rInner = Math.round((24 + t * 38) / 4) * 4;
        const rOuter = Math.round(((imp.isCrit ? 76 : 58) + t * 46) / 4) * 4;
        const glowTex = renderer && renderer.getGlowForColor ? renderer.getGlowForColor(imp.color) : null;

        ctx.save();
        if (glowTex) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, env * 0.56);
          ctx.drawImage(glowTex, ix - 95, iy - 95, 190, 190);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, env * 0.94);
        const rayCount = imp.isCrit ? 8 : 6;
        for (let r = 0; r < rayCount; r++) {
          const a = imp.rot + (r / rayCount) * Math.PI * 2;
          for (let step = 0; step <= 4; step++) {
            const u = step / 4;
            const d = rInner + (rOuter - rInner) * u;
            const rx = Math.round((ix + Math.cos(a) * d) / 4) * 4;
            const ry = Math.round((iy + Math.sin(a) * d) / 4) * 4;
            const sz = step < 2 ? 8 : 4;
            ctx.fillStyle = imp.accentColor || '#0284c7';
            ctx.fillRect(rx - sz, ry - sz, sz * 2, sz * 2);
            ctx.fillStyle = imp.color;
            ctx.fillRect(rx - sz * 0.5, ry - sz * 0.5, sz, sz);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(rx - 2, ry - 2, 4, 4);
          }
        }
        ctx.restore();
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
      const baseR = (ca.isUltimate ? 82 : 64) * (0.94 + Math.sin(t * Math.PI) * 0.14);

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // Authentic Chunky-Pixel Glowing Champion Crest Sprite Manifestation BEHIND the caster
      const crestSize = Math.round(baseR * 2.8);
      const alpha = env * (ca.isUltimate ? 0.94 : 0.86);
      ctx.translate(hx, hy);

      if (ca.theme === 'steel' && assets.warrior?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.warrior.vfx,
          0,
          0,
          320,
          320,
          -crestSize * 0.5,
          -crestSize * 0.62,
          crestSize,
          crestSize,
          '#38bdf8',
          alpha,
          false
        );
      } else if (ca.theme === 'emerald' && assets.archer?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.archer.vfx,
          0,
          0,
          320,
          320,
          -crestSize * 0.56,
          -crestSize * 0.58,
          crestSize * 1.12,
          crestSize * 1.12,
          '#10b981',
          alpha,
          false
        );
      } else if (ca.theme === 'arcane' && assets.mage?.vfx?.complete) {
        ctx.rotate(ca.life * 1.4);
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.mage.vfx,
          0,
          0,
          320,
          320,
          -crestSize * 0.5,
          -crestSize * 0.5,
          crestSize,
          crestSize,
          '#fb923c',
          alpha,
          false
        );
      } else if (ca.theme === 'radiant' && assets.priestess?.vfx?.complete) {
        ctx.rotate(ca.life * 0.8);
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.priestess.vfx,
          0,
          0,
          320,
          320,
          -crestSize * 0.52,
          -crestSize * 0.52,
          crestSize * 1.04,
          crestSize * 1.04,
          '#facc15',
          alpha,
          false
        );
      } else if (ca.theme === 'abyssal' && assets.reaper?.vfx?.complete && assets.reaper.vfx.naturalWidth >= 944) {
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(side * 48, -8);
          ctx.scale(side, 1);
          ctx.rotate(-0.35 + ca.life * 1.8);
          const scSize = Math.round(crestSize * 0.74);
          this.drawBloomedSprite(
            ctx,
            renderer,
            assets.reaper.vfx,
            736,
            56,
            208,
            208,
            -scSize * 0.5,
            -scSize * 0.5,
            scSize,
            scSize,
            '#c084fc',
            alpha,
            false
          );
          ctx.restore();
        }
      } else if (ca.theme === 'chrono' && assets.chronomancer?.vfx?.complete) {
        ctx.rotate(-ca.life * 1.2);
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.chronomancer.vfx,
          0,
          0,
          320,
          320,
          -crestSize * 0.52,
          -crestSize * 0.52,
          crestSize * 1.04,
          crestSize * 1.04,
          '#2dd4bf',
          alpha,
          false
        );
      }
      ctx.restore();
    }
  }

  renderFloatingTexts(ctx) {
    // 1. BORDERLESS OVERHEAD SPECIAL MOVE & ULTIMATE ART FLOATING CALLOUTS ABOVE CHARACTER HEAD
    const activeBanners = [];
    for (let idx = 0; idx < this.castAuras.length; idx++) {
      const ca = this.castAuras[idx];
      if (!ca.fighter || ca.fighter.isDead) continue;
      // When the full-width Ultimate Cut-In is active, skip redundant overhead text so the screen stays clean
      if (ca.isUltimate) continue;
      const t = ca.life / ca.maxLife;
      const alpha = t < 0.08 ? t / 0.08 : t > 0.78 ? Math.max(0, (1 - t) / 0.22) : 1.0;

      // Anchor high above the caster's head/wings so their character and face stay 100% unobstructed
      let headX = Math.max(165, Math.min(1035, Math.round(ca.fighter.x / 2) * 2));
      const floatLift = Math.round(Math.min(14, t * 20) / 2) * 2;
      let headY = Math.round((ca.fighter.y - 238 - floatLift) / 2) * 2;

      for (const prev of activeBanners) {
        if (Math.abs(headX - prev.x) < 210 && Math.abs(headY - prev.y) < 42) {
          headY = prev.y - 44;
        }
      }
      activeBanners.push({ x: headX, y: headY });

      const heroLabel = (ca.fighter.name || ca.fighter.heroId || '').toUpperCase();
      const headerTag = heroLabel ? `* ${heroLabel} *` : ca.tag;

      ctx.save();
      ctx.globalAlpha = alpha;

      const titleScale = 2; // 10x14 crisp pixel characters
      const tagScale = 1; // 5x7 crisp micro-pixel header
      const titleW = PixelFont.measureWidth(ca.title, titleScale);
      const tagW = PixelFont.measureWidth(headerTag, tagScale);
      const halfW = Math.max(76, Math.round(Math.max(titleW, tagW) * 0.58));

      // Soft feathered elliptical shadow veil behind floating pixel text (ZERO rectangular box or border!)
      ctx.save();
      ctx.translate(headX, headY);
      ctx.scale(halfW, 20);
      const veil = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1.0);
      veil.addColorStop(0, 'rgba(3, 6, 14, 0.65)');
      veil.addColorStop(0.65, 'rgba(3, 6, 14, 0.28)');
      veil.addColorStop(1, 'rgba(3, 6, 14, 0)');
      ctx.fillStyle = veil;
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Top micro-tag showing Champion Name in 1px bitmap font
      PixelFont.drawCentered(ctx, headerTag, headX, headY - 10, tagScale, ca.coreColor, '#ffffff', true);

      // Main ability name in 2px bitmap font with 2-tone pixel highlight & drop-shadow
      PixelFont.drawCentered(ctx, ca.title, headX, headY + 6, titleScale, ca.coreColor, '#ffffff', true);

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
