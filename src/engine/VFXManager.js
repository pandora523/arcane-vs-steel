import { PixelFont } from './PixelFont.js?v=30fps66';
import { PixelForge } from './PixelForge.js?v=30fps66';

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
                : theme === 'forge'
                  ? '#10b981'
                  : theme === 'storm'
                    ? '#38bdf8'
                    : theme === 'crimson'
                      ? '#fbbf24'
                      : theme === 'glacial'
                        ? '#e879f9'
                        : theme === 'cyber'
                          ? '#ff2e93'
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
    if (!opts || !Number.isFinite(opts.x) || !Number.isFinite(opts.y)) return;
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
      forge: { shape: 'rune', col: '#d97706', core: '#10b981' },
      storm: { shape: 'rune', col: '#6366f1', core: '#38bdf8' },
      crimson: { shape: 'star', col: '#e11d48', core: '#fbbf24' },
      glacial: { shape: 'star', col: '#0284c7', core: '#67e8f9' },
      cyber: { shape: 'cog', col: '#ff2e93', core: '#00f0ff' },
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
      flightTime: 0,
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
                : theme === 'forge'
                  ? { main: '#f59e0b', core: '#34d399', border: '#d97706' }
                  : theme === 'storm'
                    ? { main: '#818cf8', core: '#38bdf8', border: '#6366f1' }
                    : theme === 'crimson'
                      ? { main: '#f43f5e', core: '#fbbf24', border: '#e11d48' }
                      : theme === 'glacial'
                        ? { main: '#67e8f9', core: '#e879f9', border: '#0284c7' }
                        : theme === 'cyber'
                          ? { main: '#00f0ff', core: '#ff2e93', border: '#0068e6' }
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
        const u = Math.random();
        const bx =
          Number.isFinite(b.x1) && Number.isFinite(b.x2)
            ? b.x1 + (b.x2 - b.x1) * u
            : Number.isFinite(b.x)
              ? b.x
              : 800;
        const by =
          Number.isFinite(b.y1) && Number.isFinite(b.y2)
            ? b.y1 + (b.y2 - b.y1) * u
            : (Number.isFinite(b.groundY) ? b.groundY : groundY) - Math.random() * 240;
        this.spawnParticle({
          x: bx + (Math.random() - 0.5) * (b.width || 24),
          y: by + (Math.random() - 0.5) * 18,
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
        const csEnemies =
          cs.owner?.game?.getEnemiesOf ? cs.owner.game.getEnemiesOf(cs.owner) : cs.target ? [cs.target] : [];
        for (const foe of csEnemies) {
          if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - cs.x) < 76) {
            foe.takeDamage(cs.damage, cs.owner, false, 65, -90);
          }
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
      const isEmeraldTor = tor.color === '#10b981' || tor.color === '#34d399';
      if (!isEmeraldTor || Math.random() < 0.35) {
        const count = isEmeraldTor ? 1 : 2;
        for (let k = 0; k < count; k++) {
          const h = Math.random() * tor.height;
          const r = tor.radius * (0.45 + (h / tor.height) * 0.85);
          const a = tor.life * 18 + h * 0.05 + k * Math.PI;
          this.spawnParticle({
            x: tor.x + Math.cos(a) * r,
            y: tor.groundY - h,
            vx: -Math.sin(a) * 145,
            vy: -115 - Math.random() * 75,
            size: isEmeraldTor ? 4 : 7,
            color: Math.random() > 0.35 ? tor.color : tor.coreColor,
            maxLife: isEmeraldTor ? 0.24 : 0.36
          });
        }
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
        s.flightTime = (s.flightTime || 0) + dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const isHeavyWeapon =
          s.type === 'runeblade' ||
          s.type === 'runic_anvil' ||
          s.type === 'raijin_odachi' ||
          s.type === 'gungnir_lance';
        this.spawnParticle({
          x: s.x + (Math.random() - 0.5) * 16,
          y: s.y - 18,
          vx: -s.vx * 0.12 + (Math.random() - 0.5) * 35,
          vy: -75,
          size: isHeavyWeapon ? 8 : 6,
          color: Math.random() > 0.35 ? s.color : s.coreColor,
          maxLife: 0.32
        });
        if (s.y >= s.groundY) {
          s.y = s.groundY;
          s.impacted = true;
          if (audio) {
            audio.play(
              s.type === 'runic_anvil' || s.type === 'raijin_odachi'
                ? 'thunder_slam'
                : s.type === 'runeblade' || s.type === 'gungnir_lance'
                  ? 'clang'
                  : s.type === 'holy_spear'
                    ? 'holy_hit'
                    : 'arrow_hit',
              s.x
            );
          }
          this.spawnShockwave(s.x, s.groundY, isHeavyWeapon ? 115 : 78, s.color, 0.34, true);
          this.spawnBurst(s.x, s.groundY - 8, isHeavyWeapon ? 14 : 9, s.color, 210, {
            upBias: 110,
            size: 6
          });
          this.spawnDecal(s.x, isHeavyWeapon ? 76 : 48, 'fissure', s.color, 3.8);
          if (renderer && isHeavyWeapon) renderer.triggerShake(6, 0.14);
          if (s.damage > 0) {
            const strikeEnemies =
              s.owner?.game?.getEnemiesOf ? s.owner.game.getEnemiesOf(s.owner) : s.target ? [s.target] : [];
            for (const foe of strikeEnemies) {
              if (foe && !foe.isDead && !foe.isBenched && Math.abs(foe.x - s.x) < 92) {
                foe.takeDamage(s.damage, s.owner, isHeavyWeapon, 55, -60);
              }
            }
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
          const sfx =
            pil.theme === 'radiant'
              ? 'holy_hit'
              : pil.theme === 'abyssal'
                ? 'soul_drain'
                : 'fire_hit';
          audio.play(sfx, pil.x);
        }
        const col =
          pil.theme === 'emerald'
            ? '#10b981'
            : pil.theme === 'steel'
              ? '#38bdf8'
              : pil.theme === 'radiant'
                ? '#fde047'
                : pil.theme === 'abyssal'
                  ? '#c084fc'
                  : '#fb923c';
        const shockCol =
          pil.theme === 'abyssal'
            ? '#f43f5e'
            : pil.theme === 'emerald'
              ? '#34d399'
              : pil.theme === 'steel'
                ? '#38bdf8'
                : '#facc15';
        this.spawnDecal(pil.x, 110 * pil.scaleWidth, 'fissure', col, 4.8);
        this.spawnShockwave(pil.x, groundY, 135 * pil.scaleWidth, shockCol, 0.44, true);
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
                : pil.theme === 'abyssal'
                  ? '#c084fc'
                  : '#fb923c';
        const colCore = pil.theme === 'abyssal' ? '#f43f5e' : '#fef9c3';
        for (let k = 0; k < 3; k++) {
          const spiral = Math.sin(pil.life * 22 + k * 2) * 42 * pil.scaleWidth;
          this.spawnParticle({
            x: pil.x + spiral,
            y: groundY - Math.random() * 28,
            vx: (Math.random() - 0.5) * 44,
            vy: -300 - Math.random() * 210,
            size: (12 + Math.random() * 8) * pil.scaleWidth,
            color: k % 2 === 0 ? colMain : colCore,
            maxLife: 0.44,
            gravity: -110
          });
        }
        pil.tickTimer += dt;
        if (pil.tickTimer >= 0.25) {
          pil.tickTimer = 0;
          const pilEnemies =
            pil.owner?.game?.getEnemiesOf ? pil.owner.game.getEnemiesOf(pil.owner) : pil.target ? [pil.target] : [];
          for (const foe of pilEnemies) {
            if (
              foe &&
              !foe.isDead &&
              !foe.isBenched &&
              Math.abs(foe.x - pil.x) < 88 * pil.scaleWidth &&
              groundY - foe.y < 155
            ) {
              foe.takeDamage(Math.round(28 * pil.scaleWidth), pil.owner, false, 35, -55);
            }
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
      if (type === 'indigo') return { nr: 0.51, ng: 0.55, nb: 0.98 };
      if (type === 'crimson') return { nr: 0.96, ng: 0.25, nb: 0.37 };
      if (type === 'teal') return { nr: 0.18, ng: 0.86, nb: 0.78 };
      if (type === 'gold') return { nr: 1.0, ng: 0.88, nb: 0.28 };
      return { nr: 1.0, ng: 0.52, nb: 0.16 };
    };
    const typeForHex = (col) => {
      if (!col) return 'cyan';
      if (col === '#10b981' || col === '#34d399' || col === '#6ee7b7' || col === '#a7f3d0' || col === '#4ade80') {
        return 'emerald';
      }
      if (col === '#818cf8' || col === '#6366f1' || col === '#a5b4fc' || col === '#4f46e5') {
        return 'indigo';
      }
      if (col === '#f43f5e' || col === '#e11d48' || col === '#be123c' || col === '#fda4af') {
        return 'crimson';
      }
      if (
        col === '#c084fc' ||
        col === '#9333ea' ||
        col === '#7e22ce' ||
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
        col === '#f59e0b' ||
        col === '#d97706' ||
        col === '#fbbf24' ||
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
      // Torgar's World-Breaker War-Hammer & Ragnarok World-Forge emit Molten Gold + Emerald Jade Runic light!
      if (f.heroId === 'titan' && (f.state === 'SKILL' || f.state === 'ULTIMATE' || f.isBulwarkActive)) {
        pushLight(f.x, f.y - 110, f.state === 'ULTIMATE' ? 390 : 300, 'gold', f.state === 'ULTIMATE' ? 1.95 : 1.70, 88);
        pushLight(f.x + f.facing * 32, f.y - 82, 235, 'emerald', 1.40, 74);
      }
      // Kaze-Maru's Thunder-Odachi & Susanoo Storm-God Avatar emit Electric Indigo + Thunder-Cyan light!
      if (f.heroId === 'ronin' && (f.state === 'SKILL' || f.state === 'ULTIMATE' || f.isDeflecting)) {
        pushLight(f.x, f.y - 115, f.state === 'ULTIMATE' ? 395 : 305, 'indigo', f.state === 'ULTIMATE' ? 1.95 : 1.72, 88);
        pushLight(f.x + f.facing * 34, f.y - 84, 240, 'cyan', 1.45, 76);
      }
      // Freyja's Gungnir Dragon-Lance & Bahamut Cataclysm emit Dragonfire Crimson + Imperial Gold light!
      if (f.heroId === 'valkyrie' && (f.state === 'SKILL' || f.state === 'ULTIMATE' || f.isDeflecting)) {
        pushLight(f.x, f.y - 118, f.state === 'ULTIMATE' ? 395 : 305, 'crimson', f.state === 'ULTIMATE' ? 1.95 : 1.72, 88);
        pushLight(f.x + f.facing * 34, f.y - 84, 245, 'gold', 1.48, 76);
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
      if (f.worldForgeAvatar) {
        pushLight(f.worldForgeAvatar.x, f.worldForgeAvatar.y - 150, 380, 'gold', 1.88, 88);
        pushLight(f.worldForgeAvatar.x, f.worldForgeAvatar.y - 110, 280, 'emerald', 1.45, 78);
      }
      if (f.susanooAvatar) {
        pushLight(f.susanooAvatar.x, f.susanooAvatar.y - 145, 385, 'indigo', 1.92, 88);
        pushLight(f.susanooAvatar.x, f.susanooAvatar.y - 105, 285, 'cyan', 1.50, 78);
      }
      if (f.bahamutAvatar) {
        pushLight(f.bahamutAvatar.x, f.bahamutAvatar.y - 148, 390, 'crimson', 1.94, 88);
        pushLight(f.bahamutAvatar.x, f.bahamutAvatar.y - 108, 290, 'gold', 1.52, 78);
      }
      if (f.borealisCathedral) {
        pushLight(f.borealisCathedral.x, f.borealisCathedral.y - 135, 395, 'cyan', 1.95, 90);
        pushLight(f.borealisCathedral.x, f.borealisCathedral.y - 95, 290, 'violet', 1.55, 78);
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
      const torCol = Math.floor(tor.life * 30) % 30;
      const torSx = torCol * 208;
      const torSy = 416;

      // A. 30fps Conical S-Curving Pixel-Art Tornado Funnel Sprite (Row 2 of archer_vfx.png: 30 cols x 208x208)
      const spriteW = Math.round((tor.radius * 2.55) / 4) * 4;
      if (!isSteel && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          vfxSheet,
          torSx,
          torSy,
          208,
          208,
          Math.round(baseX - spriteW * 0.5),
          Math.round(baseY - totalH),
          spriteW,
          totalH,
          '#10b981',
          fade * (isReflection ? 0.42 : 0.98),
          isReflection
        );
      } else {
        for (let b = 0; b < bands; b++) {
          const hFrac = b / (bands - 1);
          const coneProfile = 0.16 + Math.pow(hFrac, 0.85) * 0.70 + Math.pow(hFrac, 2.2) * 0.36;
          const halfW = Math.max(10, Math.round((tor.radius * coneProfile) / 4) * 4);
          const spineSway = Math.round(
            (Math.sin(tor.life * 13 - hFrac * 4.8) * (4 + Math.sin(hFrac * Math.PI) * 18)) / 4
          ) * 4;
          const cx = baseX + spineSway;
          const cy = Math.round((baseY - hFrac * totalH) / 4) * 4;
          const spinPhase = tor.life * 22 - hFrac * 12;

          if (b % 2 === 0) {
            for (let seg = 0; seg < 5; seg++) {
              const a = spinPhase + (seg / 5) * Math.PI * 2;
              const sinA = Math.sin(a);
              const wx = Math.round((cx + Math.cos(a) * halfW * 0.88) / 4) * 4;
              const wy = Math.round((cy + sinA * 6) / 4) * 4;
              const segW = Math.max(8, Math.round((halfW * 0.42) / 4) * 4);
              ctx.globalCompositeOperation = sinA > 0 ? 'lighter' : 'source-over';
              ctx.globalAlpha = fade * (sinA > 0 ? 0.55 : 0.65) * (isReflection ? 0.4 : 1);
              ctx.fillStyle = sinA > 0.4 ? '#fef08a' : sinA > 0 ? '#38bdf8' : '#0284c7';
              ctx.fillRect(wx - segW * 0.5, wy - 2, segW, 4);
            }
          }
        }

        // C. Outer Helical Wind Ribbons for Steel Tornado
        const ribbonTurns = 18;
        for (let i = 0; i < ribbonTurns; i++) {
          const hFrac = ((i / ribbonTurns) + tor.life * 1.8) % 1;
          const coneProfile = 0.18 + Math.pow(hFrac, 0.85) * 0.82 + Math.pow(hFrac, 2.4) * 0.45;
          const orbitR = tor.radius * coneProfile * 1.16;
          const spineSway = Math.sin(tor.life * 13 - hFrac * 4.8) * (4 + Math.sin(hFrac * Math.PI) * 22);
          const angle = tor.life * 22 - hFrac * 11 + (i % 2) * Math.PI;
          const sinA = Math.sin(angle);
          if (sinA < -0.2 && !isReflection) continue;

          const rx = Math.round((baseX + spineSway + Math.cos(angle) * orbitR) / 4) * 4;
          const ry = Math.round((baseY - hFrac * totalH + sinA * orbitR * 0.20) / 4) * 4;
          const w = Math.max(8, Math.round((14 + hFrac * 20) / 4) * 4);

          if (!isReflection) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = fade * 0.42;
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(rx - w * 0.6, ry - 4, w * 1.2, 8);
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade * 0.95;
          ctx.fillStyle = i % 3 === 0 ? '#fef08a' : '#bae6fd';
          ctx.fillRect(rx - w * 0.5, ry - 2, w, 4);
        }

        // D. Ground Dust-Devil Debris Ring
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * (isReflection ? 0.35 : 0.94);
        for (let g = 0; g < 14; g++) {
          const ga = (g / 14) * Math.PI * 2 + tor.life * 25;
          const grx = tor.radius * 0.48;
          const gry = grx * 0.28;
          const gx = Math.round((baseX + Math.cos(ga) * grx) / 4) * 4;
          const gy = Math.round((baseY - 4 + Math.sin(ga) * gry) / 4) * 4;
          ctx.fillStyle = g % 2 === 0 ? '#7dd3fc' : '#0284c7';
          ctx.fillRect(gx - 6, gy - 3, 12, 6);
        }
      }
      ctx.restore();
    }

    // 2. FLAME & ELEMENTAL PILLARS: Saturated Pixel Glowing Hellfire Magma Pillar, Sacred Cathedral Pillar & Abyssal Soul-Geyser
    for (const pil of this.pillars) {
      const isUltPil = !!pil.isUltimate;
      if (!isReflection && isUltPil !== ultimateOnly) continue;
      const p = Math.min(1, pil.life / Math.max(0.15, pil.delay));
      const pxSize = 4;
      const baseX = Math.round(pil.x / pxSize) * pxSize;
      const baseY = Math.round(pil.groundY / pxSize) * pxSize;
      const isEmerald = pil.theme === 'emerald';
      const isSteel = pil.theme === 'steel';
      const isRadiant = pil.theme === 'radiant';
      const isAbyssal = pil.theme === 'abyssal';
      const sigilCol = isEmerald
        ? '#10b981'
        : isSteel
          ? '#0ea5e9'
          : isRadiant
            ? '#eab308'
            : isAbyssal
              ? '#9333ea'
              : '#ea580c';
      const accentCol = isEmerald
        ? '#34d399'
        : isSteel
          ? '#38bdf8'
          : isRadiant
            ? '#facc15'
            : isAbyssal
              ? '#f43f5e'
              : '#f97316';

      // Ground Pixel Octagram Sigil (stepped 4x4 pixel grid)
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
        ctx.fillRect(sx - 4, sy - 2, 8, 4);
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
        const reaperVfx = assets.reaper?.vfx;
        const flipWave = Math.floor(pil.life * 15) % 2 === 0 ? 1 : -1;
        const pilFrac = Math.min(1, Math.max(0, (pil.life - pil.delay) / Math.max(0.1, pil.maxLife - pil.delay)));
        const pilCol = Math.min(29, Math.floor(pilFrac * 30));

        if (!isRadiant && !isEmerald && !isSteel && !isAbyssal && mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
          const pilW = Math.round((252 * pil.scaleWidth) / 4) * 4;
          const pilH = Math.round((344 * pil.scaleWidth * (0.38 + 0.62 * pop)) / 4) * 4;
          const pilDir = Math.round(pil.x / 8) % 2 === 0 ? 1 : -1;
          ctx.save();
          ctx.translate(baseX, baseY - Math.round(pilH * (36 / 104)));
          ctx.scale(pilDir, 1);
          this.drawBloomedSprite(
            ctx,
            renderer,
            mageVfx,
            pilCol * 208,
            208,
            208,
            208,
            Math.round(-pilW * 0.5),
            Math.round(-pilH * 0.5),
            pilW,
            pilH,
            '#fb923c',
            fade * (isReflection ? 0.48 : 0.98),
            isReflection
          );
          ctx.restore();

          // Rising 4x4 Pixel-Art Crown Flame Tongues & Solar Star-Embers ascending above the pillar crest
          if (!isReflection && fade > 0.2) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.globalAlpha = fade * 0.92;
            for (let k = 0; k < 5; k++) {
              const uC = ((pil.life * 2.1 + k * 0.2) % 1);
              const spreadX = (k - 2) * 18 * pil.scaleWidth + Math.sin(pil.life * 9 + k * 1.7) * 8;
              const cxC = Math.round((baseX + spreadX) / 4) * 4;
              const cyC = Math.round((baseY - pilH * (0.84 + uC * 0.24)) / 4) * 4;
              const hFlame = uC < 0.55 ? 12 : 8;
              ctx.fillStyle = '#ea580c';
              ctx.fillRect(cxC - 2, cyC - hFlame, 4, hFlame);
              ctx.fillStyle = uC < 0.4 ? '#ffffff' : '#fef08a';
              ctx.fillRect(cxC - 2, cyC - 4, 4, 4);
            }
            ctx.restore();
          }
        } else if (isRadiant && priestVfx && priestVfx.complete && priestVfx.naturalWidth) {
          const pilW = Math.round((236 * pil.scaleWidth) / 4) * 4;
          const pilH = Math.round((344 * pil.scaleWidth * (0.38 + 0.62 * pop)) / 4) * 4;
          const haloSz = Math.round((216 * pil.scaleWidth) / 4) * 4;
          const haloCol = Math.floor(pil.life * 30) % 30;
          ctx.save();
          ctx.translate(baseX, Math.round(baseY - 148 * pil.scaleWidth));
          this.drawBloomedSprite(
            ctx,
            renderer,
            priestVfx,
            haloCol * 208,
            624,
            208,
            208,
            Math.round(-haloSz * 0.5),
            Math.round(-haloSz * 0.5),
            haloSz,
            haloSz,
            '#fde047',
            fade * (isReflection ? 0.45 : 0.92),
            isReflection
          );
          ctx.restore();
          ctx.save();
          ctx.translate(baseX, baseY + 14);
          this.drawBloomedSprite(
            ctx,
            renderer,
            priestVfx,
            pilCol * 208,
            416,
            208,
            208,
            Math.round(-pilW * 0.5),
            Math.round(-pilH),
            pilW,
            pilH,
            '#fde047',
            fade * (isReflection ? 0.48 : 0.98),
            isReflection
          );
          ctx.restore();

          // Rising 4x4 Pixel-Art Cathedral Starlight Motes & Golden Feathers ascending above the 7 Gothic Light-Spires
          if (!isReflection && fade > 0.2) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.globalAlpha = fade * 0.92;
            for (let k = 0; k < 5; k++) {
              const uC = (pil.life * 2.0 + k * 0.2) % 1;
              const spreadX = (k - 2) * 18 * pil.scaleWidth + Math.sin(pil.life * 8.5 + k * 1.6) * 7;
              const cxC = Math.round((baseX + spreadX) / 4) * 4;
              const cyC = Math.round((baseY - pilH * (0.84 + uC * 0.24)) / 4) * 4;
              const hSpire = uC < 0.55 ? 12 : 8;
              ctx.fillStyle = k % 2 === 0 ? '#fde047' : '#38bdf8';
              ctx.fillRect(cxC - 2, cyC - hSpire, 4, hSpire);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(cxC - 2, cyC - 6, 4, 4);
            }
            ctx.restore();
          }
        } else if (isAbyssal && reaperVfx && reaperVfx.complete && reaperVfx.naturalWidth) {
          const pilW = Math.round((236 * pil.scaleWidth) / 4) * 4;
          const pilH = Math.round((312 * pil.scaleWidth * (0.38 + 0.62 * pop)) / 4) * 4;
          const sealSz = Math.round((212 * pil.scaleWidth) / 4) * 4;
          const geyserCol = Math.min(29, 14 + Math.floor(pilFrac * 15));
          ctx.save();
          ctx.translate(baseX, Math.round(baseY - 120 * pil.scaleWidth));
          this.drawBloomedSprite(
            ctx,
            renderer,
            reaperVfx,
            pilCol * 208,
            832,
            208,
            208,
            Math.round(-sealSz * 0.5),
            Math.round(-sealSz * 0.5),
            sealSz,
            sealSz,
            '#f43f5e',
            fade * (isReflection ? 0.42 : 0.88),
            isReflection
          );
          ctx.restore();
          ctx.save();
          ctx.translate(baseX, baseY + 14);
          ctx.scale(flipWave, 1);
          this.drawBloomedSprite(
            ctx,
            renderer,
            reaperVfx,
            geyserCol * 208,
            416,
            208,
            208,
            Math.round(-pilW * 0.5),
            Math.round(-pilH),
            pilW,
            pilH,
            '#c084fc',
            fade * (isReflection ? 0.48 : 0.98),
            isReflection
          );
          ctx.restore();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * (isReflection ? 0.35 : 0.85);
        const rows = Math.round(56 * pil.scaleWidth);
        const halfSpan = Math.max(2, Math.round(7 * pil.scaleWidth));
        for (let row = 0; row < rows; row += 3) {
          const ribCol = Math.round(Math.sin(pil.life * 24 - row * 0.28) * (halfSpan + 2));
          ctx.fillStyle = row % 6 === 0 ? accentCol : sigilCol;
          ctx.fillRect(baseX + ribCol * pxSize, baseY - (row + 1) * pxSize, pxSize, pxSize);
        }
        ctx.restore();
      }
    }

    // 3. SKY STRIKES: 30fps Heavenly Runeblades, Valkyrie Spears, Runic Anvils & Starfall Arrows (F00..F11 Flight + F12..F29 Ground Impact)
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
        const bladeSz = s.impacted ? 236 : 220;
        const col = !s.impacted
          ? Math.floor((s.flightTime || 0) * 30) % 12
          : Math.min(29, 12 + Math.floor(Math.min(1, s.linger / Math.max(0.01, s.maxLinger)) * 18));
        this.drawBloomedSprite(
          ctx,
          renderer,
          warriorVfx,
          col * 208,
          208,
          208,
          208,
          Math.round(sx - bladeSz * 0.5),
          Math.round(sy - bladeSz * 0.85),
          bladeSz,
          bladeSz,
          '#38bdf8',
          fade * (isReflection ? 0.5 : 0.98),
          isReflection
        );
      } else if (s.type === 'runic_anvil') {
        const titanVfx = assets.titan?.vfx;
        const anvilSz = s.impacted ? 232 : 212;
        const col = !s.impacted
          ? Math.floor((s.flightTime || 0) * 30) % 12
          : Math.min(29, 12 + Math.floor(Math.min(1, s.linger / Math.max(0.01, s.maxLinger)) * 18));
        this.drawBloomedSprite(
          ctx,
          renderer,
          titanVfx,
          col * 208,
          208,
          208,
          208,
          Math.round(sx - anvilSz * 0.5),
          Math.round(sy - anvilSz * 0.84),
          anvilSz,
          anvilSz,
          '#f59e0b',
          fade * (isReflection ? 0.5 : 0.98),
          isReflection
        );
      } else if (s.type === 'holy_spear') {
        const priestVfx = assets.priestess?.vfx;
        const spearSz = s.impacted ? 212 : 196;
        const col = !s.impacted
          ? Math.floor((s.flightTime || 0) * 30) % 12
          : Math.min(29, 12 + Math.floor(Math.min(1, s.linger / Math.max(0.01, s.maxLinger)) * 18));
        this.drawBloomedSprite(
          ctx,
          renderer,
          priestVfx,
          col * 208,
          208,
          208,
          208,
          Math.round(sx - spearSz * 0.5),
          Math.round(sy - spearSz * 0.82),
          spearSz,
          spearSz,
          '#fde047',
          fade * (isReflection ? 0.5 : 0.98),
          isReflection
        );
      } else if (s.type === 'raijin_odachi') {
        const roninVfx = assets.ronin?.vfx;
        const odachiSz = s.impacted ? 236 : 216;
        const col = !s.impacted
          ? Math.floor((s.flightTime || 0) * 30) % 12
          : Math.min(29, 12 + Math.floor(Math.min(1, s.linger / Math.max(0.01, s.maxLinger)) * 18));
        this.drawBloomedSprite(
          ctx,
          renderer,
          roninVfx,
          col * 208,
          208,
          208,
          208,
          Math.round(sx - odachiSz * 0.5),
          Math.round(sy - odachiSz * 0.84),
          odachiSz,
          odachiSz,
          '#818cf8',
          fade * (isReflection ? 0.5 : 0.98),
          isReflection
        );
      } else if (s.type === 'gungnir_lance') {
        const valkVfx = assets.valkyrie?.vfx;
        const lanceSz = s.impacted ? 238 : 218;
        const col = !s.impacted
          ? Math.floor((s.flightTime || 0) * 30) % 12
          : Math.min(29, 12 + Math.floor(Math.min(1, s.linger / Math.max(0.01, s.maxLinger)) * 18));
        this.drawBloomedSprite(
          ctx,
          renderer,
          valkVfx,
          col * 208,
          208,
          208,
          208,
          Math.round(sx - lanceSz * 0.5),
          Math.round(sy - lanceSz * 0.84),
          lanceSz,
          lanceSz,
          '#f43f5e',
          fade * (isReflection ? 0.5 : 0.98),
          isReflection
        );
      } else {
        const archerVfx = assets.archer?.vfx;
        if (!s.impacted) {
          // Row 1 F00..F11: 30fps Descending Starfall Comet-Arrow
          const col = Math.floor((s.flightTime || 0) * 30) % 12;
          const ang = Math.atan2(s.vy, s.vx || 0.01);
          ctx.translate(sx, sy);
          ctx.rotate(ang);
          const arrSz = 148;
          this.drawBloomedSprite(
            ctx,
            renderer,
            archerVfx,
            col * 208,
            208,
            208,
            208,
            Math.round(-arrSz * 0.78),
            Math.round(-arrSz * 0.5),
            arrSz,
            arrSz,
            '#10b981',
            fade * (isReflection ? 0.5 : 0.98),
            isReflection
          );
        } else {
          // Row 1 F12..F29: 18-Frame Upright Ground Runic Star-Sigil & Helical Wind Geyser Eruption!
          const impFrac = Math.min(1, s.linger / Math.max(0.01, s.maxLinger));
          const col = Math.min(29, 12 + Math.floor(impFrac * 18));
          const impSz = 176;
          this.drawBloomedSprite(
            ctx,
            renderer,
            archerVfx,
            col * 208,
            208,
            208,
            208,
            Math.round(sx - impSz * 0.5),
            Math.round(sy - impSz * 0.81),
            impSz,
            impSz,
            '#10b981',
            Math.min(1, fade * (isReflection ? 0.5 : 1.12)),
            isReflection
          );
        }
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

      const isEmeraldCheck = b.color === '#10b981' || b.color === '#34d399';
      const headX = Math.min(dist, dist * Math.min(1, t / (isEmeraldCheck ? 0.62 : 0.28)));
      const tailX = Math.max(0, dist * Math.max(0, (t - (isEmeraldCheck ? 0.45 : 0.38)) / (isEmeraldCheck ? 0.55 : 0.62)));
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

      // 2. Authentic Stepped 4x4 Pixel-Art Tapered Energy Lance & Pixel Helical Motes
      const hMax = Math.max(8, b.width * 0.65 * env);
      const pxStep = 4;
      const startCol = Math.floor(tailX / pxStep) * pxStep;
      const endCol = Math.ceil(headX / pxStep) * pxStep;

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = beamAlpha * (isReflection ? 0.36 : 0.78);
      ctx.fillStyle = b.color;
      for (let x = startCol; x <= endCol; x += pxStep) {
        const u = Math.max(0, Math.min(1, (x - tailX) / Math.max(1, spanLen)));
        const taper = Math.sin(Math.pow(u, 0.75) * Math.PI);
        const halfH = Math.max(4, Math.round((hMax * 0.95 * taper) / pxStep) * pxStep);
        ctx.fillRect(x, -halfH, pxStep, halfH * 2);
      }

      // Mid-tone Radiant/Arcane Pixel Band
      ctx.globalAlpha = beamAlpha * (isReflection ? 0.45 : 0.88);
      ctx.fillStyle = b.coreColor || '#fef08a';
      for (let x = startCol + pxStep * 2; x <= endCol; x += pxStep) {
        const u = Math.max(0, Math.min(1, (x - tailX) / Math.max(1, spanLen)));
        const taper = Math.sin(Math.pow(u, 0.75) * Math.PI);
        const halfH = Math.max(4, Math.round((hMax * 0.52 * taper) / pxStep) * pxStep);
        ctx.fillRect(x, -halfH, pxStep, halfH * 2);
      }

      // White-Hot 4x4 Pixel Core Lance
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = beamAlpha;
      ctx.fillStyle = '#ffffff';
      for (let x = startCol + pxStep * 3; x <= endCol + pxStep; x += pxStep) {
        const u = Math.max(0, Math.min(1, (x - tailX) / Math.max(1, spanLen)));
        const taper = Math.sin(Math.pow(u, 0.75) * Math.PI);
        const halfH = Math.max(2, Math.round((hMax * 0.24 * taper) / 2) * 2);
        ctx.fillRect(x, -halfH, pxStep, halfH * 2);
      }

      // Stepped 4x4 Pixel-Art Dual-Helix Energy Motes wrapping the beam
      for (const sign of [-1, 1]) {
        ctx.fillStyle = sign > 0 ? b.coreColor || '#fef08a' : b.color;
        ctx.globalAlpha = beamAlpha * 0.9;
        for (let x = startCol; x <= endCol; x += pxStep * 2) {
          const u = Math.max(0, Math.min(1, (x - tailX) / Math.max(1, spanLen)));
          const taper = Math.sin(u * Math.PI);
          const rawY = sign * Math.sin(x * 0.045 - b.life * 34) * (hMax * 0.95 * taper);
          const py = Math.round(rawY / pxStep) * pxStep;
          ctx.fillRect(x, py - 2, pxStep + 2, pxStep);
        }
      }

      const isEmeraldBeam = b.color === '#10b981' || b.color === '#34d399';
      const isHolyBeam =
        b.color === '#fde047' ||
        b.color === '#facc15' ||
        b.color === '#fef08a' ||
        b.color === '#ca8a04' ||
        b.color === '#eab308';
      const isAbyssalBeam =
        b.color === '#c084fc' ||
        b.color === '#9333ea' ||
        b.color === '#f43f5e';
      const isFireBeam = b.color === '#fb923c' || b.color === '#ea580c' || b.color === '#f97316';
      const archerVfx = assets.archer?.vfx;
      const priestVfx = assets.priestess?.vfx;
      const reaperVfx = assets.reaper?.vfx;
      const mageVfx = assets.mage?.vfx;
      const bCol = Math.min(29, Math.floor(t * 30));

      if (isEmeraldBeam && archerVfx) {
        const flipY = Math.cos(ang) < 0 ? -1 : 1;
        // 30fps Coiling Supersonic Wind-Wake Segments along the beam body (Row 0)
        for (let wIdx = 1; wIdx <= 3; wIdx++) {
          const uWake = wIdx / 4;
          const wx = tailX + spanLen * uWake;
          const wCol = (bCol + wIdx * 7) % 30;
          const wakeSz = 164;
          ctx.save();
          ctx.translate(Math.round(wx), Math.round(Math.sin(b.life * 28 - wIdx * 1.6) * 14));
          ctx.scale(1, flipY);
          this.drawBloomedSprite(
            ctx,
            null,
            archerVfx,
            wCol * 208,
            0,
            208,
            208,
            Math.round(-wakeSz * 0.5),
            Math.round(-wakeSz * 0.5),
            wakeSz,
            wakeSz,
            '#34d399',
            (1 - t * 0.35) * 0.82,
            isReflection
          );
          ctx.restore();
        }
        // Colossal 30fps Roaring Astral Wind-Dragon Head leading the beam (Row 3, sy=624)
        const dragSz = 268;
        ctx.save();
        ctx.translate(Math.round(headX - dragSz * 0.12), 0);
        ctx.scale(1, flipY);
        this.drawBloomedSprite(
          ctx,
          renderer,
          archerVfx,
          bCol * 208,
          624,
          208,
          208,
          Math.round(-dragSz * 0.5),
          Math.round(-dragSz * 0.5),
          dragSz,
          dragSz,
          '#10b981',
          1 - t * 0.25,
          isReflection
        );
        ctx.restore();
      } else if (isHolyBeam && priestVfx) {
        const starSz = 176;
        ctx.save();
        ctx.translate(Math.round(headX), 0);
        this.drawBloomedSprite(
          ctx,
          renderer,
          priestVfx,
          bCol * 208,
          0,
          208,
          208,
          Math.round(-starSz * 0.5),
          Math.round(-starSz * 0.5),
          starSz,
          starSz,
          '#fde047',
          1 - t * 0.25,
          isReflection
        );
        ctx.restore();
      } else if (isAbyssalBeam && reaperVfx) {
        const scytheSz = 168;
        ctx.save();
        ctx.translate(Math.round(headX), 0);
        this.drawBloomedSprite(
          ctx,
          renderer,
          reaperVfx,
          bCol * 208,
          0,
          208,
          208,
          Math.round(-scytheSz * 0.5),
          Math.round(-scytheSz * 0.5),
          scytheSz,
          scytheSz,
          '#c084fc',
          1 - t * 0.25,
          isReflection
        );
        ctx.restore();
      } else if (isFireBeam && mageVfx) {
        const meteorSz = 168;
        this.drawBloomedSprite(
          ctx,
          renderer,
          mageVfx,
          bCol * 208,
          624,
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

    // 4B. GLACIAL FROST-CRYSTAL SPIRES & TITAN VOLCANIC BASALT-JADE MONOLITHS (30fps Row 2 of warrior_vfx.png / titan_vfx.png)
    for (const cs of this.crystalSpikes) {
      const isUltSpike = !!cs.isUltimate || cs.maxLife >= 0.9;
      if (!isReflection && isUltSpike !== ultimateOnly) continue;
      if (cs.delay > 0) continue;
      const t = cs.life / cs.maxLife;
      const pop = Math.min(1, cs.life / 0.12);
      const fade = Math.min(1, (1 - t) * 2.5);
      const bx = Math.round(cs.x / 2) * 2;
      const by = Math.round(cs.groundY / 2) * 2;
      const isTitanMonolith =
        cs.heroId === 'titan' ||
        cs.owner?.heroId === 'titan' ||
        cs.color === '#f59e0b' ||
        cs.color === '#10b981' ||
        cs.color === '#d97706';
      const isRoninPillar =
        cs.heroId === 'ronin' ||
        cs.owner?.heroId === 'ronin' ||
        cs.color === '#818cf8' ||
        cs.color === '#6366f1';
      const isValkyrieObelisk =
        cs.heroId === 'valkyrie' ||
        cs.owner?.heroId === 'valkyrie' ||
        cs.color === '#f43f5e' ||
        cs.color === '#be123c' ||
        (cs.color === '#fbbf24' && cs.owner?.heroId === 'valkyrie');
      const spireVfx = isRoninPillar
        ? assets.ronin?.vfx
        : isValkyrieObelisk
          ? assets.valkyrie?.vfx
          : isTitanMonolith
            ? assets.titan?.vfx
            : assets.warrior?.vfx;
      const spireGlowCol = isRoninPillar
        ? '#818cf8'
        : isValkyrieObelisk
          ? '#f43f5e'
          : isTitanMonolith
            ? '#f59e0b'
            : '#38bdf8';

      ctx.save();
      if (spireVfx && spireVfx.complete && spireVfx.naturalWidth) {
        const spireW = Math.round(cs.width * 3.95);
        const spireH = Math.round(cs.height * 1.44 * pop);
        const spCol = Math.min(29, Math.floor(t * 30));
        ctx.translate(bx, by + 10);
        ctx.rotate(cs.tilt * 0.18);
        this.drawBloomedSprite(
          ctx,
          renderer,
          spireVfx,
          spCol * 208,
          416,
          208,
          208,
          Math.round(-spireW * 0.5),
          Math.round(-spireH),
          spireW,
          spireH,
          spireGlowCol,
          fade * (isReflection ? 0.45 : 0.98),
          isReflection
        );
      }
      ctx.restore();
    }

    // 4C. BLACK-GOLD SOLAR ECLIPSE SUPERNOVA SPHERE (30fps Row 2 of mage_vfx.png — Always Ultimate!)
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
        const snCol = Math.min(29, Math.floor(t * 30));
        ctx.translate(sx, sy);
        this.drawBloomedSprite(
          ctx,
          renderer,
          mageVfx,
          snCol * 208,
          416,
          208,
          208,
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

    // 5. PARTICLES: Luminous HD-2D Embers with Smooth Radial Glow Halos & Crisp Cores (Zero oversized +6px squares!)
    for (const p of !ultimateOnly ? this.particles : []) {
      const t = p.life / p.maxLife;
      const fade = 1 - t;
      const s = Math.max(2, Math.min(5, Math.round(p.size * fade + p.endSize * t)));
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      const pCol = p.color === '#ffffff' ? '#fef9c3' : p.color;

      if (renderer && !isReflection) {
        const glowTex = renderer.getGlowForColor ? renderer.getGlowForColor(pCol) : renderer.glowCyan;
        const glowR = Math.max(16, s * 4.5);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.44;
        ctx.drawImage(glowTex, px - glowR, py - glowR, glowR * 2, glowR * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade * (isReflection ? 0.65 : 0.95);
      ctx.fillStyle = pCol;
      ctx.fillRect(px - Math.ceil(s * 0.5), py - Math.ceil(s * 0.5), s, s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 1, py - 1, Math.max(1, s - 2), Math.max(1, s - 2));
    }

    // 6. SLASHES: Deeply Saturated Chunky-Pixel Crescent Blade, Scythe, War-Hammer, Odachi, Dragon-Lance & Whirlwind Waves
    ctx.globalCompositeOperation = 'source-over';
    for (const s of this.slashes) {
      const isUltSlash = s.radius >= 118;
      if (!isReflection && isUltSlash !== ultimateOnly) continue;
      const t = s.life / s.maxLife;
      const alpha = 1 - t;
      const isFullCircle = Math.abs(s.endAngle - s.startAngle) > Math.PI * 1.8;
      ctx.globalAlpha = alpha * (isReflection ? 0.35 : isFullCircle ? 0.58 : 0.92);
      const isRoninSlash =
        s.heroId === 'ronin' ||
        s.color === '#818cf8' ||
        s.color === '#6366f1' ||
        s.color === '#a5b4fc';
      const isValkyrieSlash =
        s.heroId === 'valkyrie' ||
        s.color === '#f43f5e' ||
        s.color === '#be123c' ||
        s.color === '#e11d48';
      const isTitanSlash =
        s.heroId === 'titan' ||
        s.color === '#f59e0b' ||
        s.color === '#d97706' ||
        s.color === '#b45309' ||
        (s.color === '#fbbf24' && assets.titan?.vfx?.complete);
      const isEmerald = s.color === '#10b981' || s.color === '#34d399' || s.color === '#6ee7b7';
      const isAbyssal =
        s.color === '#c084fc' ||
        s.color === '#9333ea' ||
        s.color === '#7e22ce' ||
        s.color === '#e879f9';
      const isRadiant = s.color === '#fde047' || s.color === '#facc15';
      const isChrono = s.color === '#2dd4bf' || s.color === '#99f6e4';

      // Draw Saturated Chunky-Pixel Slash Wave Sprite at the arc apex
      if (!isReflection) {
        const midAng = (s.startAngle + s.endAngle) * 0.5 + (isFullCircle ? t * 8 : 0);
        const rad = s.radius + t * 14;
        const sx = Math.round(s.x + Math.cos(midAng) * rad * 0.72);
        const sy = Math.round(s.y + Math.sin(midAng) * (isFullCircle ? rad * 0.25 : rad * 0.72));
        const slashSize = Math.round(Math.min(196, Math.max(106, s.radius * 1.32)) * (1.06 - t * 0.18));

        let sheet = assets.warrior?.vfx;
        const slashCol = Math.min(29, Math.floor(t * 30));
        const cropX = slashCol * 208;
        const cropY = 832;
        if (isRoninSlash && assets.ronin?.vfx?.complete) {
          sheet = assets.ronin.vfx;
        } else if (isValkyrieSlash && assets.valkyrie?.vfx?.complete) {
          sheet = assets.valkyrie.vfx;
        } else if (isTitanSlash && assets.titan?.vfx?.complete) {
          sheet = assets.titan.vfx;
        } else if (isAbyssal) {
          sheet = assets.reaper?.vfx;
        } else if (isEmerald) {
          sheet = assets.archer?.vfx;
        } else if (isRadiant) {
          sheet = assets.priestess?.vfx;
        } else if (isChrono) {
          sheet = assets.chronomancer?.vfx;
        } else if (
          s.color === '#fb923c' ||
          s.color === '#ea580c' ||
          s.color === '#f97316' ||
          s.color === '#dc2626'
        ) {
          sheet = assets.mage?.vfx;
        } else {
          sheet = assets.warrior?.vfx;
        }

        if (sheet && sheet.complete && sheet.naturalWidth) {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(midAng);
          this.drawBloomedSprite(
            ctx,
            renderer,
            sheet,
            cropX,
            cropY,
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

      const sparkCount = 14;
      for (let i = 0; i < sparkCount; i++) {
        const a = i * 2.39996 + t * (i % 2 === 0 ? 1.4 : -1.1);
        const distMult = 0.28 + ((i * 7 + 3) % 11) * 0.085;
        const curR = r * distMult;
        const px = Math.round(sw.x + Math.cos(a) * curR * xScale);
        const py = Math.round(sw.y + Math.sin(a) * curR * yScale - (sw.flat ? t * (12 + (i % 5) * 9) : 0));

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * (isReflection ? 0.42 : 0.92);
        ctx.fillStyle = sw.color;
        ctx.fillRect(px - 2, py - 2, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }

    // 8. PROJECTILES: 30fps Astral Arrows, Frost Blade-Waves, Forge-Waves, Phantom Scythes, Clockwork Saw-Gears, Holy Orbs & Solar Fireballs
    ctx.globalAlpha = 1;
    for (const proj of this.projectiles) {
      const isUltProj = !!proj.isMeteor || !!proj.isUltimate;
      if (!isReflection && isUltProj !== ultimateOnly) continue;
      const r = proj.radius * 3.8;
      const px = Math.round(proj.x / 4) * 4;
      const py = Math.round(proj.y / 4) * 4;
      const pCol = Math.floor((proj.age || 0) * 30) % 30;
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
        if (mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
          const mSize = 156;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(ang);
          this.drawBloomedSprite(
            ctx,
            renderer,
            mageVfx,
            pCol * 208,
            624,
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
      } else if (proj.type === 'forge_wave') {
        const titanVfx = assets.titan?.vfx;
        const dir = Math.sign(proj.vx) || 1;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(dir, 1);
        if (titanVfx && titanVfx.complete && titanVfx.naturalWidth) {
          const waveSize = Math.max(136, Math.round(proj.radius * 4.5));
          this.drawBloomedSprite(
            ctx,
            renderer,
            titanVfx,
            pCol * 208,
            0,
            208,
            208,
            -waveSize * 0.5,
            -waveSize * 0.5,
            waveSize,
            waveSize,
            '#f59e0b',
            0.98,
            isReflection
          );
        } else {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-18, -14, 36, 28);
        }
        ctx.restore();
      } else if (proj.type === 'clock_gear') {
        const vfxSheet = assets.chronomancer?.vfx;
        const dir = Math.sign(proj.vx) || 1;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(dir, 1);
        if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
          const gearSize = 108;
          this.drawBloomedSprite(
            ctx,
            renderer,
            vfxSheet,
            pCol * 208,
            0,
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
        } else {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-16, -16, 32, 32);
        }
        ctx.restore();
      } else if (proj.type === 'phantom_scythe') {
        const reaperVfx = assets.reaper?.vfx;
        const dir = Math.sign(proj.vx) || 1;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(dir, 1);
        if (reaperVfx && reaperVfx.complete && reaperVfx.naturalWidth) {
          const scytheSize = 124;
          this.drawBloomedSprite(
            ctx,
            renderer,
            reaperVfx,
            pCol * 208,
            0,
            208,
            208,
            -scytheSize * 0.5,
            -scytheSize * 0.5,
            scytheSize,
            scytheSize,
            '#c084fc',
            0.98,
            isReflection
          );
        }
        ctx.restore();
      } else if (proj.type === 'blade_wave') {
        const warriorVfx = assets.warrior?.vfx;
        const ang = Math.atan2(proj.vy || 0, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        if (warriorVfx && warriorVfx.complete && warriorVfx.naturalWidth) {
          const waveSize = 138;
          this.drawBloomedSprite(
            ctx,
            renderer,
            warriorVfx,
            pCol * 208,
            0,
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
      } else if (proj.type === 'storm_wave') {
        const roninVfx = assets.ronin?.vfx;
        const ang = Math.atan2(proj.vy || 0, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        if (roninVfx && roninVfx.complete && roninVfx.naturalWidth) {
          const waveSize = 140;
          this.drawBloomedSprite(
            ctx,
            renderer,
            roninVfx,
            pCol * 208,
            0,
            208,
            208,
            -waveSize * 0.5,
            -waveSize * 0.5,
            waveSize,
            waveSize,
            '#818cf8',
            0.98,
            isReflection
          );
        } else {
          ctx.fillStyle = '#818cf8';
          ctx.fillRect(-18, -14, 36, 28);
        }
        ctx.restore();
      } else if (proj.type === 'dragon_lance') {
        const valkVfx = assets.valkyrie?.vfx;
        const ang = Math.atan2(proj.vy || 0, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        if (valkVfx && valkVfx.complete && valkVfx.naturalWidth) {
          const lanceSize = 142;
          this.drawBloomedSprite(
            ctx,
            renderer,
            valkVfx,
            pCol * 208,
            0,
            208,
            208,
            -lanceSize * 0.5,
            -lanceSize * 0.5,
            lanceSize,
            lanceSize,
            '#f43f5e',
            0.98,
            isReflection
          );
        } else {
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(-20, -10, 40, 20);
        }
        ctx.restore();
      } else if (proj.type === 'cryo_shard') {
        const iceVfx = assets.icemage?.vfx;
        const dir = (proj.vx || 1) >= 0 ? 1 : -1;
        const qx = Math.round(px / 4) * 4;
        const qy = Math.round(py / 4) * 4;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        // Stepped 4x4 pixel-art frost slipstream blocks trailing behind the shard (skipped when ArcaneShaderFX renders trail)
        if (!isReflection && !proj.owner?.fx) {
          for (let tStep = 1; tStep <= 4; tStep++) {
            const tx = qx - dir * tStep * 12;
            const ty = qy + ((tStep % 2 === 0 ? -1 : 1) * 4);
            ctx.fillStyle = '#0c1226';
            ctx.fillRect(tx - 6, ty - 6, 12, 12);
            ctx.fillStyle = tStep % 2 === 0 ? '#38bdf8' : '#c084fc';
            ctx.fillRect(tx - 4, ty - 4, 8, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(tx - 2, ty - 2, 4, 4);
          }
        }
        ctx.translate(qx, qy);
        ctx.scale(dir, 1);
        if (iceVfx && iceVfx.complete && iceVfx.naturalWidth) {
          // Exact 2x logical scale of 52x52 -> 104x104 so every pixel block is razor-sharp
          const shardSize = 104;
          this.drawBloomedSprite(
            ctx,
            renderer,
            iceVfx,
            pCol * 208,
            0,
            208,
            208,
            -shardSize * 0.5,
            -shardSize * 0.5,
            shardSize,
            shardSize,
            '#67e8f9',
            0.98,
            isReflection
          );
        } else {
          ctx.fillStyle = '#0c1226';
          ctx.fillRect(-20, -12, 40, 24);
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(-16, -8, 32, 16);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-12, -4, 24, 8);
        }
        ctx.restore();
      } else if (proj.type === 'cyber_disc') {
        const androidVfx = assets.android?.vfx;
        const dir = proj.vx >= 0 ? 1 : -1;
        const qx = Math.round(px / 4) * 4;
        const qy = Math.round(py / 4) * 4;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(qx, qy);
        ctx.scale(dir, 1);
        if (androidVfx && androidVfx.complete && androidVfx.naturalWidth) {
          const discSize = 132;
          this.drawBloomedSprite(
            ctx,
            renderer,
            androidVfx,
            pCol * 208,
            0,
            208,
            208,
            -discSize * 0.5,
            -discSize * 0.5,
            discSize,
            discSize,
            '#00f0ff',
            0.98,
            isReflection
          );
        } else {
          ctx.fillStyle = '#ff2e93';
          ctx.fillRect(-18, -10, 36, 20);
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(-14, -6, 28, 12);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-10, -3, 20, 6);
        }
        ctx.restore();
      } else if (proj.type === 'arrow') {
        const archerVfx = assets.archer?.vfx;
        const ang = Math.atan2(proj.vy, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);

        if (archerVfx && archerVfx.complete && archerVfx.naturalWidth) {
          // Row 0 F00..F29: 30fps Supersonic Tempest Arrow (spinning fletching, double-helix wind ribbon & Mach cone)
          const arrSize = 136;
          this.drawBloomedSprite(
            ctx,
            renderer,
            archerVfx,
            pCol * 208,
            0,
            208,
            208,
            -arrSize * 0.5,
            -arrSize * 0.5,
            arrSize,
            arrSize,
            '#10b981',
            0.98,
            isReflection
          );
        } else {
          ctx.fillStyle = '#34d399';
          ctx.fillRect(-32, -4, 62, 8);
        }
        ctx.restore();
      } else if (proj.type === 'holy_light') {
        const priestessVfx = assets.priestess?.vfx;
        const ang = Math.atan2(proj.vy, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        if (priestessVfx && priestessVfx.complete && priestessVfx.naturalWidth) {
          const orbSize = 114;
          this.drawBloomedSprite(
            ctx,
            renderer,
            priestessVfx,
            pCol * 208,
            0,
            208,
            208,
            -orbSize * 0.5,
            -orbSize * 0.5,
            orbSize,
            orbSize,
            '#facc15',
            0.98,
            isReflection
          );
        }
        ctx.restore();
      } else {
        const mageVfx = assets.mage?.vfx;
        const ang = Math.atan2(proj.vy, proj.vx || 1);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        if (mageVfx && mageVfx.complete && mageVfx.naturalWidth) {
          const fbSize = 116;
          this.drawBloomedSprite(
            ctx,
            renderer,
            mageVfx,
            pCol * 208,
            0,
            208,
            208,
            -fbSize * 0.5,
            -fbSize * 0.5,
            fbSize,
            fbSize,
            '#fb923c',
            0.98,
            isReflection
          );
        } else {
          ctx.fillStyle = proj.color;
          ctx.fillRect(-16, -12, 32, 24);
        }
        ctx.restore();
      }
    }

    // 9. LIGHTNINGS: Authentic Stepped 4x4 Pixel-Art Skyward Thunderbolts with Radial Light Glow
    for (const l of isReflection || ultimateOnly ? this.lightnings : []) {
      if (!l.pts || l.pts.length < 2) continue;
      const t = l.life / l.maxLife;
      const fade = 1 - t;
      const glowTex = renderer && renderer.getGlowForColor ? renderer.getGlowForColor(l.color) : null;

      ctx.save();
      if (glowTex && !isReflection) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.46;
        for (let idx = 0; idx < l.pts.length; idx += 2) {
          const p0 = l.pts[idx];
          ctx.drawImage(glowTex, p0.x - 44, p0.y - 44, 88, 88);
        }
      }

      const outerCol = l.color === '#ffffff' ? '#38bdf8' : l.color;
      for (let idx = 0; idx < l.pts.length - 1; idx++) {
        const p0 = l.pts[idx];
        const p1 = l.pts[idx + 1];
        const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const steps = Math.max(1, Math.ceil(segLen / 4));
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const px = Math.round((p0.x + (p1.x - p0.x) * u) / 4) * 4;
          const py = Math.round((p0.y + (p1.y - p0.y) * u) / 4) * 4;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.78;
          ctx.fillStyle = outerCol;
          ctx.fillRect(px - 6, py - 2, 12, 8);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - 2, py, 4, 4);
        }
      }
      ctx.restore();
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
          ctx.fillRect(gx - 6, gy - 2, 12, 4);
          ctx.fillRect(gx - 2, gy - 6, 4, 12);
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 4, gy - 4, 8, 8);
          ctx.fillStyle = '#090d16';
          ctx.fillRect(gx - 2, gy - 2, 4, 4);
        } else if (g.shape === 'skull') {
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 5, gy - 6, 10, 8);
          ctx.fillRect(gx - 3, gy + 2, 6, 3);
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 3, gy - 3, 2, 2);
          ctx.fillRect(gx + 1, gy - 3, 2, 2);
        } else if (g.shape === 'rune') {
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 2, gy - 6, 4, 12);
          ctx.fillRect(gx - 5, gy - 2, 10, 4);
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 1, gy - 3, 2, 6);
        } else if (g.shape === 'cross') {
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 2, gy - 7, 4, 14);
          ctx.fillRect(gx - 7, gy - 2, 14, 4);
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 1, gy - 5, 2, 10);
          ctx.fillRect(gx - 5, gy - 1, 10, 2);
        } else {
          ctx.fillStyle = g.color;
          ctx.fillRect(gx - 6, gy - 1, 12, 2);
          ctx.fillRect(gx - 1, gy - 6, 2, 12);
          ctx.fillStyle = g.coreColor;
          ctx.fillRect(gx - 2, gy - 2, 4, 4);
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
        const streamCount = ca.isUltimate ? 6 : 4;
        for (let s = 0; s < streamCount; s++) {
          const side = s % 2 === 0 ? -1 : 1;
          const lane = Math.floor(s / 2) + 1;
          const sx = Math.round(ca.fighter.x + side * (46 + lane * 16));
          const phase = (ca.life * 260 + s * 42) % 140;
          const sy = Math.round(ca.fighter.y - 16 - phase);
          const sh = ca.isUltimate ? 22 : 16;
          if (glowTex) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = env * 0.42;
            ctx.drawImage(glowTex, sx - 22, sy - sh - 14, 44, sh + 28);
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = env * 0.90;
          ctx.fillStyle = ca.mainColor;
          ctx.fillRect(sx - 1, sy - sh, 3, sh);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx, sy - sh + 2, 1, sh - 4);
        }
        ctx.restore();
      }

      // 12. ON-HIT ELEMENTAL DIAMOND STAR-FLARES (Sleek Tapered Impact Flares — Zero Stepped Square Chains!)
      for (const imp of this.hitImpacts) {
        const t = imp.life / imp.maxLife;
        const env = t < 0.18 ? t / 0.18 : Math.max(0, 1 - (t - 0.18) / 0.82);
        const ix = Math.round(imp.x);
        const iy = Math.round(imp.y);
        const rInner = 14 + t * 28;
        const rOuter = (imp.isCrit ? 64 : 46) + t * 38;
        const glowTex = renderer && renderer.getGlowForColor ? renderer.getGlowForColor(imp.color) : null;

        ctx.save();
        if (glowTex) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, env * 0.56);
          ctx.drawImage(glowTex, ix - 85, iy - 85, 170, 170);
        }
        ctx.translate(ix, iy);
        const rayCount = imp.isCrit ? 8 : 6;
        for (let r = 0; r < rayCount; r++) {
          const a = imp.rot + (r / rayCount) * Math.PI * 2;
          ctx.save();
          ctx.rotate(a);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, env * 0.9);
          ctx.fillStyle = imp.color;
          ctx.beginPath();
          ctx.moveTo(rInner, 0);
          ctx.lineTo((rInner + rOuter) * 0.45, -3.5);
          ctx.lineTo(rOuter, 0);
          ctx.lineTo((rInner + rOuter) * 0.45, 3.5);
          ctx.closePath();
          ctx.fill();

          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(rInner + 4, 0);
          ctx.lineTo((rInner + rOuter) * 0.48, -1.5);
          ctx.lineTo(rOuter * 0.88, 0);
          ctx.lineTo((rInner + rOuter) * 0.48, 1.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }

  renderBackgroundCastSeals(ctx, renderer = null) {
    const assets = PixelForge.initAssets();
    for (const ca of this.castAuras) {
      if (!ca.fighter || ca.fighter.isDead || ca.isUltimate) continue;
      const t = ca.life / ca.maxLife;
      const env = t < 0.14 ? t / 0.14 : Math.max(0, 1 - (t - 0.14) / 0.86);
      const hx = Math.round(ca.fighter.x / 4) * 4;
      const hy = Math.round((ca.fighter.y - 128) / 4) * 4;
      const baseR = (ca.isUltimate ? 82 : 64) * (0.94 + Math.sin(t * Math.PI) * 0.14);

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // 30fps Glowing Champion Crest Sprite Manifestation BEHIND the caster
      const crestSize = Math.round(baseR * 2.8);
      const alpha = env * (ca.isUltimate ? 0.94 : 0.86);
      const sealCol = Math.floor(ca.life * 30) % 30;
      ctx.translate(hx, hy);

      if (ca.theme === 'steel' && assets.warrior?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.warrior.vfx,
          sealCol * 208,
          624,
          208,
          208,
          -crestSize * 0.5,
          -crestSize * 0.62,
          crestSize,
          crestSize,
          '#38bdf8',
          alpha,
          false
        );
      } else if (ca.theme === 'emerald' && assets.archer?.vfx?.complete) {
        ctx.scale(ca.fighter.facing || 1, 1);
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.archer.vfx,
          sealCol * 208,
          832,
          208,
          208,
          -crestSize * 0.56,
          -crestSize * 0.58,
          crestSize * 1.12,
          crestSize * 1.12,
          '#10b981',
          alpha,
          false
        );
      } else if (ca.theme === 'arcane' && assets.mage?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.mage.vfx,
          sealCol * 208,
          832,
          208,
          208,
          -crestSize * 0.5,
          -crestSize * 0.5,
          crestSize,
          crestSize,
          '#fb923c',
          alpha,
          false
        );
      } else if (ca.theme === 'radiant' && assets.priestess?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.priestess.vfx,
          sealCol * 208,
          624,
          208,
          208,
          -crestSize * 0.52,
          -crestSize * 0.52,
          crestSize * 1.04,
          crestSize * 1.04,
          '#facc15',
          alpha,
          false
        );
      } else if (ca.theme === 'abyssal' && assets.reaper?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.reaper.vfx,
          sealCol * 208,
          832,
          208,
          208,
          -crestSize * 0.52,
          -crestSize * 0.52,
          crestSize * 1.04,
          crestSize * 1.04,
          '#c084fc',
          alpha,
          false
        );
      } else if (ca.theme === 'chrono' && assets.chronomancer?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.chronomancer.vfx,
          sealCol * 208,
          624,
          208,
          208,
          -crestSize * 0.52,
          -crestSize * 0.52,
          crestSize * 1.04,
          crestSize * 1.04,
          '#2dd4bf',
          alpha,
          false
        );
      } else if (ca.theme === 'forge' && assets.titan?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.titan.vfx,
          sealCol * 208,
          624,
          208,
          208,
          -crestSize * 0.54,
          -crestSize * 0.58,
          crestSize * 1.08,
          crestSize * 1.08,
          '#f59e0b',
          alpha,
          false
        );
      } else if (ca.theme === 'storm' && assets.ronin?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.ronin.vfx,
          sealCol * 208,
          624,
          208,
          208,
          -crestSize * 0.54,
          -crestSize * 0.56,
          crestSize * 1.08,
          crestSize * 1.08,
          '#818cf8',
          alpha,
          false
        );
      } else if (ca.theme === 'crimson' && assets.valkyrie?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.valkyrie.vfx,
          sealCol * 208,
          624,
          208,
          208,
          -crestSize * 0.54,
          -crestSize * 0.56,
          crestSize * 1.08,
          crestSize * 1.08,
          '#f43f5e',
          alpha,
          false
        );
      } else if (ca.theme === 'glacial' && assets.icemage?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.icemage.vfx,
          sealCol * 208,
          624,
          208,
          208,
          -crestSize * 0.54,
          -crestSize * 0.56,
          crestSize * 1.08,
          crestSize * 1.08,
          '#67e8f9',
          alpha,
          false
        );
      } else if (ca.theme === 'cyber' && assets.android?.vfx?.complete) {
        this.drawBloomedSprite(
          ctx,
          renderer,
          assets.android.vfx,
          sealCol * 208,
          624,
          208,
          208,
          -crestSize * 0.54,
          -crestSize * 0.56,
          crestSize * 1.08,
          crestSize * 1.08,
          '#00f0ff',
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
