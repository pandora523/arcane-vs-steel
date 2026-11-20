/**
 * Arcane vs Steel — Runtime Sprite-Pixel Deconstruction & 12 Bespoke Death Choreographies
 *
 * Strictly Web-native, 100% nearest-neighbor pixel-pure (`imageSmoothingEnabled = false`,
 * `0` `arc`, `0` `ellipse`, `0` `rotate`, `0` `stroke`). Captures each fallen champion's
 * live upright/kneeling sprite pixels onto a tiny cached offscreen buffer (never flopping
 * flat onto the floor!) and deconstructs their real pixel art through 12 iconic sequences.
 */

export const CHAMPION_DEATH_STYLES = Object.freeze({
  icemage: Object.freeze({
    id: 'glacial_shatter',
    label: 'GLACIAL PETRIFACTION & SHATTER',
    duration: 3.85,
    startCol: 2,
    holdCol: 4,
    kneelEnd: 0.72,
    primary: '#38bdf8',
    accent: '#e0f2fe',
    dark: '#0c4a6e'
  }),
  priestess: Object.freeze({
    id: 'golden_ascension',
    label: 'ASCENSION INTO GOLDEN LIGHT-DUST',
    duration: 3.85,
    startCol: 3,
    holdCol: 10,
    kneelEnd: 1.08,
    primary: '#fde047',
    accent: '#fffbeb',
    dark: '#a16207'
  }),
  mage: Object.freeze({
    id: 'solar_cinder',
    label: 'SOLAR CINDER BURN-OUT',
    duration: 3.85,
    startCol: 2,
    holdCol: 9,
    kneelEnd: 1.0,
    primary: '#f97316',
    accent: '#fef08a',
    dark: '#7c2d12'
  }),
  chronomancer: Object.freeze({
    id: 'temporal_unravel',
    label: 'TEMPORAL UNRAVEL',
    duration: 3.85,
    startCol: 2,
    holdCol: 7,
    kneelEnd: 0.88,
    primary: '#2dd4bf',
    accent: '#facc15',
    dark: '#115e59'
  }),
  warrior: Object.freeze({
    id: 'knights_last_stand',
    label: "KNIGHT'S LAST STAND",
    duration: 3.85,
    startCol: 3,
    holdCol: 12,
    kneelEnd: 1.05,
    primary: '#38bdf8',
    accent: '#e0f2fe',
    dark: '#1e3a8a'
  }),
  ronin: Object.freeze({
    id: 'bushido_sakura',
    label: 'BUSHIDO SHEATHE & SAKURA WIND',
    duration: 3.85,
    startCol: 1,
    holdCol: 11,
    kneelDelay: 1.18,
    kneelEnd: 1.9,
    primary: '#f472b6',
    accent: '#fdf2f8',
    dark: '#881337'
  }),
  valkyrie: Object.freeze({
    id: 'phoenix_pyre',
    label: 'PHOENIX FEATHER PYRE',
    duration: 3.85,
    startCol: 2,
    holdCol: 9,
    kneelEnd: 1.12,
    primary: '#f43f5e',
    accent: '#fde047',
    dark: '#881337'
  }),
  titan: Object.freeze({
    id: 'obsidian_petrifaction',
    label: 'OBSIDIAN PETRIFACTION',
    duration: 3.85,
    startCol: 2,
    holdCol: 10,
    kneelEnd: 0.96,
    primary: '#f97316',
    accent: '#71717a',
    dark: '#18181b'
  }),
  archer: Object.freeze({
    id: 'starwood_return',
    label: 'STARWOOD RETURN',
    duration: 3.85,
    startCol: 2,
    holdCol: 8,
    kneelEnd: 1.06,
    primary: '#34d399',
    accent: '#d1fae5',
    dark: '#065f46'
  }),
  reaper: Object.freeze({
    id: 'abyssal_rift',
    label: 'ABYSSAL RIFT DRAG-DOWN',
    duration: 3.85,
    startCol: 2,
    holdCol: 6,
    kneelEnd: 0.85,
    primary: '#d946ef',
    accent: '#f43f5e',
    dark: '#1e062c'
  }),
  android: Object.freeze({
    id: 'holographic_crash',
    label: 'HOLOGRAPHIC SYSTEM-CRASH',
    duration: 3.85,
    startCol: 2,
    holdCol: 5,
    kneelEnd: 0.72,
    primary: '#00f0ff',
    accent: '#ff2a85',
    dark: '#0f172a'
  }),
  nyx: Object.freeze({
    id: 'cob_os_eject',
    label: 'COB-OS EMERGENCY EJECT',
    duration: 3.85,
    startCol: 3,
    holdCol: 8,
    kneelEnd: 0.85,
    primary: '#f472b6',
    accent: '#22d3ee',
    dark: '#1e1b4b'
  })
});

const BAYER_4X4 = [
  0 / 16, 8 / 16, 2 / 16, 10 / 16,
  12 / 16, 4 / 16, 14 / 16, 6 / 16,
  3 / 16, 11 / 16, 1 / 16, 9 / 16,
  15 / 16, 7 / 16, 13 / 16, 5 / 16
];

// 7x6 pixel-art heart bitmap (zero arcs!)
const HEART_7X6 = [
  0, 1, 1, 0, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1,
  0, 1, 1, 1, 1, 1, 0,
  0, 0, 1, 1, 1, 0, 0,
  0, 0, 0, 1, 0, 0, 0
];

function normalizeBaseHeroId(heroId) {
  if (!heroId || typeof heroId !== 'string') return 'warrior';
  const base = heroId.endsWith('_ex') ? heroId.slice(0, -3) : heroId;
  return CHAMPION_DEATH_STYLES[base] ? base : 'warrior';
}

export function getDeathStyleForHero(heroId) {
  const base = normalizeBaseHeroId(heroId);
  return CHAMPION_DEATH_STYLES[base] || CHAMPION_DEATH_STYLES.warrior;
}

function clamp01(v) {
  return v <= 0 ? 0 : v >= 1 ? 1 : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function hash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function pxRect(ctx, x, y, w, h) {
  const iw = Math.max(1, Math.round(w));
  const ih = Math.max(1, Math.round(h));
  ctx.fillRect(Math.round(x), Math.round(y), iw, ih);
}

function drawPixelLine(ctx, x0, y0, x1, y1, size, color) {
  let ix0 = Math.round(x0);
  let iy0 = Math.round(y0);
  const ix1 = Math.round(x1);
  const iy1 = Math.round(y1);
  const dx = Math.abs(ix1 - ix0);
  const dy = Math.abs(iy1 - iy0);
  const sx = ix0 < ix1 ? 1 : -1;
  const sy = iy0 < iy1 ? 1 : -1;
  const step = Math.max(1, Math.round(size));
  let err = dx - dy;
  let guard = 0;
  ctx.fillStyle = color;
  while (guard++ < 360) {
    ctx.fillRect(ix0, iy0, step, step);
    if (Math.abs(ix0 - ix1) <= step && Math.abs(iy0 - iy1) <= step) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      ix0 += sx * step;
    }
    if (e2 < dx) {
      err += dx;
      iy0 += sy * step;
    }
  }
}

function drawPixelRing(ctx, cx, cy, rx, ry, pxSize, color, steps = 40) {
  const s = Math.max(1, Math.round(pxSize));
  ctx.fillStyle = color;
  let prevX = 99999;
  let prevY = 99999;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = Math.round((cx + Math.cos(a) * rx) / s) * s;
    const y = Math.round((cy + Math.sin(a) * ry) / s) * s;
    if (x === prevX && y === prevY) continue;
    ctx.fillRect(x, y, s, s);
    prevX = x;
    prevY = y;
  }
}

function drawPixelSpark4(ctx, cx, cy, arm, color, coreColor = '#ffffff') {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const a = Math.max(2, Math.round(arm));
  ctx.fillStyle = color;
  ctx.fillRect(x - a, y - 1, a * 2 + 1, 2);
  ctx.fillRect(x - 1, y - a, 2, a * 2 + 1);
  ctx.fillStyle = coreColor;
  ctx.fillRect(x - 1, y - 1, 2, 2);
}

function drawPixelHeart(ctx, cx, cy, scale, fillCol, hiCol = '#ffffff') {
  const s = Math.max(1, Math.round(scale));
  const ox = Math.round(cx - 3.5 * s);
  const oy = Math.round(cy - 3 * s);
  ctx.fillStyle = fillCol;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      if (HEART_7X6[r * 7 + c]) {
        ctx.fillRect(ox + c * s, oy + r * s, s, s);
      }
    }
  }
  ctx.fillStyle = hiCol;
  ctx.fillRect(ox + s, oy + s, s, s);
}

function drawPixelFeather(ctx, cx, cy, variant, bodyCol, tipCol = '#ffffff') {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const flip = (variant & 1) === 0 ? 1 : -1;
  ctx.fillStyle = bodyCol;
  ctx.fillRect(x - 4 * flip, y - 2, 4, 2);
  ctx.fillRect(x - 2 * flip, y - 1, 5, 2);
  ctx.fillRect(x + 1 * flip, y + 1, 4, 2);
  ctx.fillStyle = tipCol;
  ctx.fillRect(x - 1 * flip, y - 1, 2, 2);
}

function drawPixelPetal(ctx, cx, cy, variant, fillCol, hiCol) {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const w = (variant & 1) === 0 ? 5 : 4;
  ctx.fillStyle = fillCol;
  ctx.fillRect(x - 2, y - 1, w, 2);
  ctx.fillRect(x - 1, y + 1, Math.max(2, w - 2), 2);
  if (hiCol) {
    ctx.fillStyle = hiCol;
    ctx.fillRect(x - 1, y - 1, 2, 1);
  }
}

function drawPixelCog(ctx, cx, cy, r, tick, col, hiCol) {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const rad = Math.max(4, Math.round(r));
  ctx.fillStyle = col;
  // Pixelated hollow ring
  ctx.fillRect(x - rad, y - rad + 2, 2, rad * 2 - 4);
  ctx.fillRect(x + rad - 2, y - rad + 2, 2, rad * 2 - 4);
  ctx.fillRect(x - rad + 2, y - rad, rad * 2 - 4, 2);
  ctx.fillRect(x - rad + 2, y + rad - 2, rad * 2 - 4, 2);
  // Alternating stepped gear teeth (zero ctx.rotate!)
  if ((tick & 1) === 0) {
    ctx.fillRect(x - 1, y - rad - 2, 3, 2);
    ctx.fillRect(x - 1, y + rad, 3, 2);
    ctx.fillRect(x - rad - 2, y - 1, 2, 3);
    ctx.fillRect(x + rad, y - 1, 2, 3);
  } else {
    ctx.fillRect(x - rad - 1, y - rad - 1, 3, 3);
    ctx.fillRect(x + rad - 2, y - rad - 1, 3, 3);
    ctx.fillRect(x - rad - 1, y + rad - 2, 3, 3);
    ctx.fillRect(x + rad - 2, y + rad - 2, 3, 3);
  }
  ctx.fillStyle = hiCol;
  ctx.fillRect(x - 1, y - 1, 2, 2);
}

function createOffscreenCanvas(w, h) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext ? canvas.getContext('2d', { willReadFrequently: true }) : null;
  if (!ctx || typeof ctx.getImageData !== 'function' || typeof ctx.putImageData !== 'function') {
    return null;
  }
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export class DeathFXManager {
  constructor() {
    this._states = new Map();
    this._tickCount = 0;
  }

  clear() {
    for (const inst of this._states.values()) {
      if (inst.srcCanvas) {
        inst.srcCanvas.width = 0;
        inst.srcCanvas.height = 0;
      }
      if (inst.workCanvas) {
        inst.workCanvas.width = 0;
        inst.workCanvas.height = 0;
      }
      if (inst.tintACanvas) {
        inst.tintACanvas.width = 0;
        inst.tintACanvas.height = 0;
      }
      if (inst.tintBCanvas) {
        inst.tintBCanvas.width = 0;
        inst.tintBCanvas.height = 0;
      }
    }
    this._states.clear();
  }

  getStyleForHero(heroId) {
    return getDeathStyleForHero(heroId);
  }

  isHandlingFighter(fighter) {
    if (!fighter || fighter.isMonster || !fighter.isDead) return false;
    return true;
  }

  trigger(fighter) {
    if (!fighter || fighter.isMonster) return null;
    const style = getDeathStyleForHero(fighter.heroId);
    const existing = this._states.get(fighter);
    if (existing && existing.style.id === style.id && existing.elapsed < 0.08) {
      return existing;
    }
    const inst = {
      fighter,
      heroId: fighter.heroId || 'warrior_ex',
      style,
      elapsed: 0,
      lastTick: this._tickCount,
      capturedFrameIdx: -1,
      capW: 0,
      capH: 0,
      srcCanvas: null,
      srcCtx: null,
      workCanvas: null,
      workCtx: null,
      workImgData: null,
      tintACanvas: null,
      tintACtx: null,
      tintBCanvas: null,
      tintBCtx: null,
      srcData: null,
      edgeDist: null,
      maxEdgeDist: 1,
      bounds: { minX: 40, maxX: 120, minY: 16, maxY: 114 },
      samples: [],
      shatterSpawned: false,
      shatterChunks: [],
      voxels: [],
      emittedSamples: new Set(),
      ambientParticles: [],
      lastWorkStep: -1,
      seed: ((fighter.x || 500) * 13.7 + (fighter.team || 1) * 97.3) % 1000
    };
    this._states.set(fighter, inst);
    return inst;
  }

  getInstance(fighter) {
    if (!fighter || fighter.isMonster || !fighter.isDead) return null;
    let inst = this._states.get(fighter);
    if (!inst) {
      inst = this.trigger(fighter);
      if (inst && Number.isFinite(fighter.deathTimer) && fighter.deathTimer > 0) {
        inst.elapsed = fighter.deathTimer;
      }
    }
    return inst;
  }

  getPoseFrameIndex(fighter) {
    if (!fighter || fighter.isMonster || !fighter.isDead) return 152;
    const inst = this.getInstance(fighter);
    if (!inst) return 152;
    const st = inst.style;
    const t = inst.elapsed;
    // Mid-air fatal drop: stay in crisp upright recoil while dropping to groundY
    if (Number.isFinite(fighter.groundY) && fighter.y < fighter.groundY - 4) {
      return 150 + Math.min(4, Math.max(1, st.startCol));
    }
    const delay = st.kneelDelay || 0;
    if (t <= delay) {
      return 150 + st.startCol;
    }
    const end = Math.max(delay + 0.08, st.kneelEnd || 0.65);
    const p = clamp01((t - delay) / (end - delay));
    const col = Math.round(st.startCol + (st.holdCol - st.startCol) * p);
    // Strict safety cap: NEVER enter flat prone frames (168..179)!
    return 150 + Math.min(13, Math.max(0, col));
  }

  getShadowAlpha(fighter) {
    const inst = this.getInstance(fighter);
    if (!inst) return 1;
    const t = inst.elapsed;
    switch (inst.style.id) {
      case 'knights_last_stand':
      case 'obsidian_petrifaction':
      case 'bushido_sakura':
        return 0.88;
      case 'glacial_shatter':
        return t < 2.35 ? 0.9 : Math.max(0, 1 - (t - 2.35) / 0.85);
      case 'abyssal_rift':
        return t < 1.05 ? 0.88 : Math.max(0, 0.88 * (1 - (t - 1.05) / 2.0));
      case 'cob_os_eject':
        return t < 2.7 ? Math.max(0.18, 0.9 - smoothstep(1.15, 2.7, t) * 0.72) : 0;
      default:
        return Math.max(0, 1 - smoothstep(1.35, 3.45, t));
    }
  }

  update(rawDt, fighters, isHitStop = false) {
    this._tickCount++;
    const dt = Math.min(0.05, Math.max(0, rawDt || 0));
    if (Array.isArray(fighters)) {
      for (let i = 0; i < fighters.length; i++) {
        const f = fighters[i];
        if (!f || f.isMonster) continue;
        if (f.isDead) {
          const inst = this.getInstance(f);
          if (inst) {
            inst.lastTick = this._tickCount;
            const stepDt = isHitStop ? dt * 0.12 : dt;
            inst.elapsed += stepDt;
            this._stepPhysics(inst, stepDt);
          }
        } else if (this._states.has(f)) {
          this._states.delete(f);
        }
      }
    }
  }

  _stepPhysics(inst, dt) {
    if (dt <= 0) return;
    // Update Lyra ice shatter chunks (dramatic low-gravity slow-mo tumble & settle)
    if (inst.shatterChunks.length > 0) {
      const floorY = 2;
      for (let i = 0; i < inst.shatterChunks.length; i++) {
        const c = inst.shatterChunks[i];
        c.age += dt;
        c.vy += 265 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > floorY) {
          c.y = floorY;
          if (!c.bounced && Math.abs(c.vy) > 35) {
            c.vy = -c.vy * 0.36;
            c.vx *= 0.6;
            c.bounced = true;
          } else {
            c.vy = 0;
            c.vx *= 0.84;
          }
        }
      }
    }
    // Update Vex-09 falling neon voxels (heavier cascading bounce & linger)
    if (inst.voxels.length > 0) {
      const floorY = 1;
      for (let i = 0; i < inst.voxels.length; i++) {
        const v = inst.voxels[i];
        v.age += dt;
        v.vy += 370 * dt;
        v.x += v.vx * dt;
        v.y += v.vy * dt;
        if (v.y > floorY) {
          v.y = floorY;
          if (!v.bounced) {
            v.vy = -58 - (v.seed % 42);
            v.vx *= 0.64;
            v.bounced = true;
          } else {
            v.vy = 0;
            v.vx *= 0.8;
          }
        }
      }
    }
  }

  _ensureCapturedSprite(inst, sheet, metrics) {
    const poseIdx = this.getPoseFrameIndex(inst.fighter);
    if (inst.capturedFrameIdx === poseIdx && (inst.srcData || inst.samples.length > 0)) {
      return;
    }

    const { cellW, cellH, cols, rows, drawW, drawH, baseX, baseY } = metrics;
    const capW = Math.min(160, Math.max(64, Math.round(cellW / 2)));
    const capH = Math.min(120, Math.max(64, Math.round(cellH / 2)));
    inst.capW = capW;
    inst.capH = capH;

    // Headless / mock environment fallback (no real ImageData): populate synthetic silhouette samples
    if (!sheet || !sheet.complete || !sheet.naturalWidth) {
      this._buildSyntheticSamples(inst, metrics);
      inst.capturedFrameIdx = poseIdx;
      return;
    }

    if (!inst.srcCanvas || inst.srcCanvas.width !== capW || inst.srcCanvas.height !== capH) {
      const sPair = createOffscreenCanvas(capW, capH);
      const wPair = createOffscreenCanvas(capW, capH);
      if (!sPair || !wPair) {
        this._buildSyntheticSamples(inst, metrics);
        inst.capturedFrameIdx = poseIdx;
        return;
      }
      inst.srcCanvas = sPair.canvas;
      inst.srcCtx = sPair.ctx;
      inst.workCanvas = wPair.canvas;
      inst.workCtx = wPair.ctx;
      inst.workImgData = wPair.ctx.createImageData(capW, capH);
    }

    const safeIdx = Math.max(0, poseIdx | 0);
    const col = safeIdx % cols;
    const row = Math.min(rows - 1, Math.max(0, (safeIdx / cols) | 0));
    const sx = col * cellW;
    const sy = row * cellH;

    const sCtx = inst.srcCtx;
    sCtx.imageSmoothingEnabled = false;
    sCtx.globalCompositeOperation = 'source-over';
    sCtx.clearRect(0, 0, capW, capH);
    sCtx.drawImage(sheet, sx, sy, cellW, cellH, 0, 0, capW, capH);

    let imgData;
    try {
      imgData = sCtx.getImageData(0, 0, capW, capH);
    } catch {
      this._buildSyntheticSamples(inst, metrics);
      inst.capturedFrameIdx = poseIdx;
      return;
    }
    const data = imgData.data;
    inst.srcData = data;
    inst.capturedFrameIdx = poseIdx;
    inst.lastWorkStep = -1;

    // Compute exact silhouette bounds + 2-pass Chamfer edge distance
    const total = capW * capH;
    const dist = new Uint8Array(total);
    let minX = capW;
    let maxX = 0;
    let minY = capH;
    let maxY = 0;
    for (let y = 0; y < capH; y++) {
      const rowOff = y * capW;
      for (let x = 0; x < capW; x++) {
        const idx = rowOff + x;
        if (data[idx * 4 + 3] > 28) {
          dist[idx] = 250;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) {
      minX = Math.round(capW * 0.25);
      maxX = Math.round(capW * 0.75);
      minY = Math.round(capH * 0.15);
      maxY = Math.round(capH * 0.94);
    }
    // Forward pass
    for (let y = 0; y < capH; y++) {
      const rowOff = y * capW;
      for (let x = 0; x < capW; x++) {
        const idx = rowOff + x;
        if (dist[idx] === 0) continue;
        let d = x === 0 || y === 0 ? 1 : dist[idx];
        if (x > 0) d = Math.min(d, dist[idx - 1] + 1);
        if (y > 0) d = Math.min(d, dist[idx - capW] + 1);
        dist[idx] = d;
      }
    }
    // Backward pass
    let maxD = 1;
    for (let y = capH - 1; y >= 0; y--) {
      const rowOff = y * capW;
      for (let x = capW - 1; x >= 0; x--) {
        const idx = rowOff + x;
        if (dist[idx] === 0) continue;
        let d = x === capW - 1 || y === capH - 1 ? 1 : dist[idx];
        if (x < capW - 1) d = Math.min(d, dist[idx + 1] + 1);
        if (y < capH - 1) d = Math.min(d, dist[idx + capW] + 1);
        dist[idx] = d;
        if (d > maxD) maxD = d;
      }
    }
    inst.edgeDist = dist;
    inst.maxEdgeDist = Math.max(1, maxD);
    inst.bounds = { minX, maxX, minY, maxY };

    // Sample up to 144 real sprite pixel blocks (preserving exact local sprite coords & colors)
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const step = Math.max(3, Math.round(Math.sqrt((spanX * spanY) / 145)));
    const samples = [];
    for (let y = minY; y <= maxY; y += step) {
      for (let x = minX; x <= maxX; x += step) {
        const idx = y * capW + x;
        const p = idx * 4;
        if (data[p + 3] <= 40) continue;
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        samples.push({
          gx: x,
          gy: y,
          lx: baseX + (x / capW) * drawW,
          ly: baseY + (y / capH) * drawH,
          normX: (x - minX) / spanX,
          normY: (y - minY) / spanY,
          edgeDist: dist[idx],
          normEdge: dist[idx] / Math.max(1, maxD),
          r,
          g,
          b,
          lum,
          hash: hash01(x * 17.3 + y * 31.7 + inst.seed)
        });
      }
    }
    inst.samples = samples.length > 0 ? samples : this._makeFallbackSamples(metrics, inst);

    // Prepare tinted copies for RGB glitch (Vex-09) & Temporal echoes (Chronos)
    if (inst.style.id === 'holographic_crash' || inst.style.id === 'temporal_unravel') {
      const colA = inst.style.id === 'holographic_crash' ? '#00f0ff' : '#2dd4bf';
      const colB = inst.style.id === 'holographic_crash' ? '#ff2a85' : '#facc15';
      if (!inst.tintACanvas || inst.tintACanvas.width !== capW) {
        const pA = createOffscreenCanvas(capW, capH);
        const pB = createOffscreenCanvas(capW, capH);
        if (pA && pB) {
          inst.tintACanvas = pA.canvas;
          inst.tintACtx = pA.ctx;
          inst.tintBCanvas = pB.canvas;
          inst.tintBCtx = pB.ctx;
        }
      }
      if (inst.tintACtx && inst.tintBCtx) {
        for (const [tCtx, colHex] of [
          [inst.tintACtx, colA],
          [inst.tintBCtx, colB]
        ]) {
          tCtx.imageSmoothingEnabled = false;
          tCtx.globalCompositeOperation = 'source-over';
          tCtx.clearRect(0, 0, capW, capH);
          tCtx.drawImage(inst.srcCanvas, 0, 0);
          tCtx.globalCompositeOperation = 'source-atop';
          tCtx.globalAlpha = 0.72;
          tCtx.fillStyle = colHex;
          tCtx.fillRect(0, 0, capW, capH);
          tCtx.globalAlpha = 1;
          tCtx.globalCompositeOperation = 'source-over';
        }
      }
    }
  }

  _makeFallbackSamples(metrics, inst) {
    const samples = [];
    const { drawW, drawH, baseX, baseY } = metrics;
    const cx = baseX + drawW * 0.42;
    const topY = baseY + drawH * 0.2;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 6; c++) {
        const nx = c / 5;
        const ny = r / 9;
        samples.push({
          gx: 40 + c * 8,
          gy: 24 + r * 9,
          lx: cx - 28 + c * 11,
          ly: topY + r * 16,
          normX: nx,
          normY: ny,
          edgeDist: Math.min(c + 1, 6 - c, r + 1, 10 - r),
          normEdge: Math.min(c + 1, 6 - c) / 3,
          r: 180,
          g: 210,
          b: 240,
          lum: 0.75,
          hash: hash01(r * 13 + c * 7 + (inst?.seed || 1))
        });
      }
    }
    return samples;
  }

  _buildSyntheticSamples(inst, metrics) {
    inst.bounds = { minX: 44, maxX: 112, minY: 20, maxY: 112 };
    inst.samples = this._makeFallbackSamples(metrics, inst);
  }

  /**
   * Mutates `inst.workCanvas` at 30fps from the captured live sprite pixels for each champion's
   * signature pixel-level transformation (frost creep, solar inward burn, obsidian cooling,
   * golden light-dust dissolve, temporal unravel, frost-drain, voxel decompile, heart-eject).
   */
  _updateWorkBuffer(inst) {
    if (!inst.srcData || !inst.workImgData || !inst.workCtx) return false;
    const step30 = Math.floor(inst.elapsed * 30);
    if (step30 === inst.lastWorkStep) return true;
    inst.lastWorkStep = step30;

    const t = inst.elapsed;
    const styleId = inst.style.id;
    const src = inst.srcData;
    const dst = inst.workImgData.data;
    const dist = inst.edgeDist;
    const maxEdge = inst.maxEdgeDist || 1;
    const capW = inst.capW;
    const capH = inst.capH;
    const { minX, maxX, minY, maxY } = inst.bounds;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    for (let y = 0; y < capH; y++) {
      const rowOff = y * capW;
      const by = (y & 3) * 4;
      const normY = clamp01((y - minY) / spanY);
      const fromBottom = 1 - normY;

      for (let x = 0; x < capW; x++) {
        const idx = rowOff + x;
        const p = idx * 4;
        const a = src[p + 3];
        if (a <= 20) {
          dst[p + 3] = 0;
          continue;
        }
        let r = src[p];
        let g = src[p + 1];
        let b = src[p + 2];
        let outA = a;
        const bayer = BAYER_4X4[by + (x & 3)];
        const ed = dist ? dist[idx] : 2;
        const normEdge = ed / maxEdge;
        const normX = clamp01((x - minX) / spanX);
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        if (styleId === 'glacial_shatter') {
          if (t >= 2.35) {
            outA = 0;
          } else {
            const frostProg = smoothstep(0.12, 1.55, t);
            const ridge = Math.sin(x * 0.35 + inst.seed) * 0.065;
            const threshold = fromBottom + ridge + (bayer - 0.5) * 0.12;
            if (threshold <= frostProg) {
              // Faceted pale-cyan crystal statue palette preserving silhouette shading
              const facet = lum + (((x ^ y) & 3) === 0 ? 0.11 : -0.04);
              if (facet > 0.72) {
                r = 240; g = 250; b = 255;
              } else if (facet > 0.52) {
                r = 186; g = 230; b = 253;
              } else if (facet > 0.34) {
                r = 86; g = 196; b = 248;
              } else if (facet > 0.18) {
                r = 24; g = 132; b = 204;
              } else {
                r = 12; g = 68; b = 114;
              }
              // Bright crystal frost-creep leading rim
              if (frostProg - threshold < 0.08 && frostProg < 0.99) {
                r = 255; g = 255; b = 255;
              } else if (t > 1.55 && ed <= 1) {
                r = 212; g = 246; b = 255;
              }
            }
          }
        } else if (styleId === 'golden_ascension') {
          const glowIntro = smoothstep(0.08, 1.25, t);
          if (ed <= 2) {
            r = Math.min(255, r + 95 * glowIntro);
            g = Math.min(255, g + 84 * glowIntro);
            b = Math.min(255, b + 28 * glowIntro);
          }
          if (t > 1.25) {
            const disP = smoothstep(1.25, 3.4, t);
            // Dissolve slowly upward from wingtips & hem edges
            const score = (1 - normEdge) * 0.44 + normY * 0.38 + bayer * 0.18;
            const cut = 1.08 - disP * 1.18;
            if (score > cut) {
              outA = 0;
            } else if (score > cut - 0.14) {
              r = 255; g = 246; b = 186;
            } else {
              r = Math.min(255, r + disP * 90);
              g = Math.min(255, g + disP * 76);
              b = Math.min(255, b + disP * 24);
            }
          }
        } else if (styleId === 'solar_cinder') {
          if (t < 1.32) {
            const heat = smoothstep(0.08, 1.3, t);
            const coreBoost = clamp01(normEdge * 1.45) * heat;
            r = Math.min(255, r + (255 - r) * (0.28 * heat + 0.68 * coreBoost));
            g = Math.min(255, g + (244 - g) * (0.16 * heat + 0.62 * coreBoost));
            b = Math.min(255, b + (190 - b) * (0.58 * coreBoost));
            if (ed <= 1 && heat > 0.3) {
              r = 251; g = 146; b = 60;
            }
          } else {
            const burnP = smoothstep(1.32, 3.48, t);
            // Slow smoldering inward burn from outer edges & hem into charcoal ash + glowing ember rim
            const score = normEdge * 0.62 + (1 - normY) * 0.18 + bayer * 0.2;
            const cut = burnP * 1.08;
            if (score < cut) {
              outA = 0;
            } else if (score < cut + 0.08) {
              r = 255; g = 244; b = 170; // white-hot burn rim
            } else if (score < cut + 0.16) {
              r = 249; g = 115; b = 22; // solar orange ember band
            } else if (score < cut + 0.24) {
              r = 185; g = 28; b = 28; // deep crimson char
            } else {
              // Dark glowing charcoal silhouette
              const charV = Math.max(18, Math.round(lum * 85));
              r = Math.min(255, charV + 34);
              g = Math.max(12, charV - 6);
              b = Math.max(14, charV - 12);
            }
          }
        } else if (styleId === 'temporal_unravel') {
          if (t < 1.12) {
            const flash = Math.sin(t * 20) > 0.35 ? 0.28 : 0.08;
            r = Math.min(255, r + (45 - r) * flash);
            g = Math.min(255, g + (212 - g) * flash);
            b = Math.min(255, b + (191 - b) * flash);
          } else {
            const unP = smoothstep(1.12, 3.38, t);
            // Stream slowly sideways as golden hourglass sand
            const wave = Math.sin(y * 0.26 + t * 4.5) * 0.07;
            const score = normX * 0.76 + bayer * 0.18 + wave;
            const cut = unP * 1.12;
            if (score < cut) {
              outA = 0;
            } else if (score < cut + 0.11) {
              r = 253; g = 224; b = 71;
            } else if (score < cut + 0.19) {
              r = 45; g = 212; b = 191;
            }
          }
        } else if (styleId === 'knights_last_stand') {
          // Frost glow drains slowly downward from greatsword/pauldrons into dignified moonlit steel
          const drainP = smoothstep(0.65, 2.95, t);
          const isGlowing = b > r + 28 || (g > 185 && b > 195);
          const wavePass = normY <= drainP * 1.25;
          if (wavePass) {
            const k = drainP * (isGlowing ? 0.78 : 0.48);
            const steel = Math.round(lum * 165);
            r = Math.round(r + (steel * 0.88 - r) * k);
            g = Math.round(g + (steel * 0.94 - g) * k);
            b = Math.round(b + (Math.min(255, steel * 1.08 + 14) - b) * k);
          }
          if (Math.abs(normY - drainP * 1.12) < 0.05 && drainP > 0.05 && drainP < 0.92) {
            r = Math.min(255, r + 60);
            g = Math.min(255, g + 110);
            b = Math.min(255, b + 145);
          }
        } else if (styleId === 'bushido_sakura') {
          // Crisp crimson slash flash at 0.22..0.58, then dignified cool moonlight tone
          if (t >= 0.22 && t <= 0.58 && Math.abs(normY - (0.34 + normX * 0.28)) < 0.05) {
            r = 255; g = 240; b = 245;
          } else if (t > 1.25) {
            const cool = smoothstep(1.25, 3.25, t) * 0.36;
            const moon = Math.round(lum * 170);
            r = Math.round(r + (moon * 0.88 - r) * cool);
            g = Math.round(g + (moon * 0.9 - g) * cool);
            b = Math.round(b + (Math.min(255, moon * 1.12 + 12) - b) * cool);
          }
        } else if (styleId === 'phoenix_pyre') {
          if (t < 1.32) {
            const flare = smoothstep(0.12, 1.32, t);
            if (ed <= 3) {
              r = Math.min(255, r + 135 * flare);
              g = Math.min(255, g + 80 * flare);
              b = Math.max(0, b - 35 * flare);
            }
          } else {
            const pyreP = smoothstep(1.32, 3.42, t);
            const score = (1 - normEdge) * 0.42 + (1 - normY) * 0.38 + bayer * 0.2;
            const cut = 1.08 - pyreP * 1.18;
            if (score > cut) {
              outA = 0;
            } else if (score > cut - 0.13) {
              r = 254; g = 226; b = 98;
            } else if (score > cut - 0.24) {
              r = 244; g = 63; b = 94;
            }
          }
        } else if (styleId === 'obsidian_petrifaction') {
          // Molten glow cools slowly to dull ember-red -> cracked dark basalt stone (stays solid & heroic!)
          const coolP = smoothstep(0.28, 3.15, t);
          const isMolten = r > b + 35 && r > 120;
          const isRunic = g > r + 20 && b > r + 15;
          const stone = Math.round(24 + lum * 78);
          const crackLine = ((x * 3 + y * 5) & 15) === 0 && ed >= 2 && ed <= 6;
          if (isMolten || isRunic) {
            if (coolP < 0.52) {
              const p1 = coolP / 0.52;
              r = Math.round(r + (175 - r) * p1);
              g = Math.round(g * (1 - p1 * 0.78));
              b = Math.round(b * (1 - p1 * 0.85));
            } else {
              const p2 = (coolP - 0.52) / 0.48;
              r = Math.round(175 + (stone + 12 - 175) * p2);
              g = Math.round(32 + (stone - 32) * p2);
              b = Math.round(24 + (stone + 4 - 24) * p2);
            }
          } else {
            r = Math.round(r + (stone - r) * (coolP * 0.86));
            g = Math.round(g + (stone - g) * (coolP * 0.86));
            b = Math.round(b + (stone + 6 - b) * (coolP * 0.86));
          }
          if (crackLine && t > 0.55 && t < 3.05) {
            const emberPulse = (1 - smoothstep(1.9, 3.05, t)) * (0.7 + 0.3 * Math.sin(t * 10));
            r = Math.min(255, Math.round(r + 185 * emberPulse));
            g = Math.min(255, Math.round(g + 64 * emberPulse));
          }
        } else if (styleId === 'starwood_return') {
          if (t < 1.25) {
            const vineGlow = smoothstep(0.2, 1.25, t) * fromBottom;
            g = Math.min(255, Math.round(g + 78 * vineGlow));
            b = Math.min(255, Math.round(b + 38 * vineGlow));
          } else {
            const retP = smoothstep(1.25, 3.42, t);
            const score = (1 - normEdge) * 0.35 + normY * 0.45 + bayer * 0.2;
            const cut = 1.08 - retP * 1.18;
            if (score > cut) {
              outA = 0;
            } else if (score > cut - 0.14) {
              r = 167; g = 243; b = 208;
            } else if (score > cut - 0.24) {
              r = 52; g = 211; b = 153;
            }
          }
        } else if (styleId === 'abyssal_rift') {
          // Dark violet-crimson abyssal corruption creeps up boots while dragged down into rift
          const dragP = smoothstep(0.85, 3.0, t);
          if (ed <= 2) {
            r = Math.min(255, Math.round(r + 95 * dragP));
            g = Math.max(0, Math.round(g - 35 * dragP));
            b = Math.min(255, Math.round(b + 125 * dragP));
          }
          if (fromBottom < dragP * 0.58) {
            r = Math.round(r * 0.45 + 48);
            g = Math.round(g * 0.22);
            b = Math.round(b * 0.55 + 72);
          }
        } else if (styleId === 'holographic_crash') {
          if (t < 1.12) {
            const glitchBand = ((y + step30 * 5) & 15) < 2;
            if (glitchBand && (step30 & 3) === 0) {
              r = 255; g = 48; b = 96;
            }
          } else {
            // Slow bottom-to-top voxel decompile scanline!
            const decP = smoothstep(1.18, 3.25, t);
            const scanRow = 1 - decP;
            const jitter = (bayer - 0.5) * 0.08;
            if (normY > scanRow + jitter) {
              outA = 0;
            } else if (normY > scanRow - 0.08) {
              r = 0; g = 240; b = 255; // neon cyan decompile edge
            } else if (((y + step30 * 3) & 7) === 0) {
              r = Math.min(255, r + 40);
              g = Math.min(255, g + 95);
              b = Math.min(255, b + 115);
            }
          }
        } else if (styleId === 'cob_os_eject') {
          if (t >= 2.72) {
            outA = 0;
          } else if (t > 1.15) {
            const digP = smoothstep(1.15, 2.7, t);
            const cxDist = Math.hypot((normX - 0.5) * 1.4, (normY - 0.5) * 1.2);
            const score = (1 - cxDist * 0.8) * 0.55 + bayer * 0.45;
            if (score < digP * 1.05) {
              outA = 0;
            } else if (score < digP * 1.05 + 0.16) {
              if (((x + y + step30) & 2) === 0) {
                r = 244; g = 114; b = 182; // pastel pink
              } else {
                r = 103; g = 232; b = 249; // cyber cyan
              }
            }
          }
        }

        dst[p] = r;
        dst[p + 1] = g;
        dst[p + 2] = b;
        dst[p + 3] = outA;
      }
    }

    inst.workCtx.putImageData(inst.workImgData, 0, 0);
    return true;
  }

  /**
   * Main pixel-pure render entry point called from `PixelForge.drawSheetFrame`.
   * Executes inside the fighter's local transform space `(x, y + groundPlantOffset)` with `scale(facing, 1)`.
   */
  renderFighterDeath(ctx, charSet, sheet, fighter, metrics, isReflection = false, renderer = null) {
    if (!ctx || !fighter || fighter.isMonster || !fighter.isDead) return false;
    const inst = this.getInstance(fighter);
    if (!inst) return false;

    // Fallback time sync for direct unit tests or URL snapshots that don't tick Renderer.update
    if (inst.lastTick !== this._tickCount && Number.isFinite(fighter.deathTimer)) {
      const targetT = Math.max(inst.elapsed, fighter.deathTimer);
      const diff = targetT - inst.elapsed;
      if (diff > 0) {
        inst.elapsed = targetT;
        this._stepPhysics(inst, Math.min(0.1, diff));
      }
    }

    this._ensureCapturedSprite(inst, sheet, metrics);
    const hasWork = this._updateWorkBuffer(inst);
    const styleId = inst.style.id;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    switch (styleId) {
      case 'glacial_shatter':
        this._renderGlacialShatter(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'golden_ascension':
        this._renderGoldenAscension(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'solar_cinder':
        this._renderSolarCinder(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'temporal_unravel':
        this._renderTemporalUnravel(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'knights_last_stand':
        this._renderKnightsLastStand(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'bushido_sakura':
        this._renderBushidoSakura(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'phoenix_pyre':
        this._renderPhoenixPyre(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'obsidian_petrifaction':
        this._renderObsidianPetrifaction(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'starwood_return':
        this._renderStarwoodReturn(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'abyssal_rift':
        this._renderAbyssalRift(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'holographic_crash':
        this._renderHolographicCrash(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      case 'cob_os_eject':
        this._renderCobOsEject(ctx, inst, sheet, metrics, hasWork, isReflection);
        break;
      default:
        this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, 0, 0);
        break;
    }

    ctx.restore();
    return true;
  }

  _getSpriteCenter(inst, metrics) {
    const { drawW, drawH, baseX, baseY } = metrics;
    const cw = inst.capW || 160;
    const ch = inst.capH || 120;
    const b = inst.bounds;
    const cx = baseX + (((b.minX + b.maxX) * 0.5) / cw) * drawW;
    const cy = baseY + (((b.minY + b.maxY) * 0.5) / ch) * drawH;
    const topY = baseY + (b.minY / ch) * drawH;
    const botY = baseY + (b.maxY / ch) * drawH;
    const leftX = baseX + (b.minX / cw) * drawW;
    const rightX = baseX + (b.maxX / cw) * drawW;
    return { cx, cy, topY, botY, leftX, rightX, w: Math.max(24, rightX - leftX), h: Math.max(48, botY - topY) };
  }

  _drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, ox = 0, oy = 0, scaleX = 1, scaleY = 1) {
    const { cellW, cellH, cols, rows, drawW, drawH, baseX, baseY } = metrics;
    const dw = Math.round(drawW * scaleX);
    const dh = Math.round(drawH * scaleY);
    const dx = Math.round(baseX + (drawW - dw) * 0.5 + ox);
    const dy = Math.round(baseY + (drawH - dh) + oy);
    if (hasWork && inst.workCanvas) {
      ctx.drawImage(inst.workCanvas, 0, 0, inst.capW, inst.capH, dx, dy, dw, dh);
      return;
    }
    if (sheet && sheet.complete && sheet.naturalWidth) {
      const poseIdx = this.getPoseFrameIndex(inst.fighter);
      const col = poseIdx % cols;
      const row = Math.min(rows - 1, Math.max(0, (poseIdx / cols) | 0));
      ctx.drawImage(sheet, col * cellW, row * cellH, cellW, cellH, dx, dy, dw, dh);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. LYRA (`icemage` / `icemage_ex`) — Glacial Petrifaction & Crystal Shatter
  // ---------------------------------------------------------------------------
  _renderGlacialShatter(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);

    if (t < 2.35) {
      const shiver = t > 1.55 ? (((Math.floor(t * 48) & 1) === 0 ? 1 : -1) * (t > 2.05 ? 2 : 1)) : 0;
      // Tapered faceted crystal spires crystallizing around boots (0.0..2.35s — pointed pixel peaks, zero boxy bars!)
      if (!isReflection) {
        const spikeP = smoothstep(0.12, 1.35, t);
        const spikes = [
          { cx: box.cx - 32, baseW: 12, h: 28 },
          { cx: box.cx - 14, baseW: 14, h: 42 },
          { cx: box.cx + 12, baseW: 14, h: 38 },
          { cx: box.cx + 30, baseW: 12, h: 24 }
        ];
        for (let i = 0; i < spikes.length; i++) {
          const sp = spikes[i];
          const curH = Math.round(sp.h * spikeP);
          if (curH < 4) continue;
          const tiers = Math.max(3, Math.floor(curH / 4));
          for (let k = 0; k < tiers; k++) {
            const u = k / tiers;
            const w = Math.max(2, Math.round(sp.baseW * (1 - u * 0.85)));
            const ty = -k * 4 - 4;
            ctx.fillStyle = '#0369a1';
            pxRect(ctx, sp.cx - (w >> 1) - 1, ty, w + 2, 4);
            ctx.fillStyle = u > 0.65 ? '#e0f2fe' : '#38bdf8';
            pxRect(ctx, sp.cx - (w >> 1), ty, w, 4);
            ctx.fillStyle = '#ffffff';
            pxRect(ctx, sp.cx - (w >> 1), ty, Math.max(1, Math.min(2, w >> 1)), 4);
          }
        }
      }

      this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, shiver, 0);

      // Suspenseful glowing white-cyan fissure cracks branching across frozen statue (1.55..2.35s)
      if (!isReflection && t >= 1.55) {
        const crackP = smoothstep(1.55, 2.28, t);
        const lines = [
          [box.cx - 6, box.cy - 18, box.cx + 24, box.cy - 44],
          [box.cx - 6, box.cy - 18, box.cx - 28, box.cy + 16],
          [box.cx + 2, box.cy - 4, box.cx + 26, box.cy + 34],
          [box.cx - 2, box.cy - 46, box.cx - 22, box.cy - 68],
          [box.cx + 4, box.cy + 14, box.cx - 16, box.cy + 58]
        ];
        for (let i = 0; i < lines.length; i++) {
          const [x0, y0, x1, y1] = lines[i];
          const lp = clamp01(crackP * 1.35 - i * 0.14);
          if (lp <= 0) continue;
          const ex = x0 + (x1 - x0) * lp;
          const ey = y0 + (y1 - y0) * lp;
          drawPixelLine(ctx, x0, y0, ex, ey, 4, '#0369a1');
          drawPixelLine(ctx, x0, y0, ex, ey, 3, '#38bdf8');
          drawPixelLine(ctx, x0, y0, ex, ey, 2, '#ffffff');
        }
        // Cold frost mist puffs
        for (let i = 0; i < 12; i++) {
          const u = (t * 1.1 + i * 0.17) % 1;
          ctx.globalAlpha = (1 - u) * 0.7;
          ctx.fillStyle = i % 2 === 0 ? '#e0f2fe' : '#7dd3fc';
          pxRect(ctx, box.cx + Math.sin(i * 4.1) * 34, box.cy - 30 + u * 55, 4, 4);
        }
        ctx.globalAlpha = 1;
      }
      return;
    }

    // 2.35..3.85s+: Dramatic slow-motion shatter of her ACTUAL sampled sprite pixel chunks (lingering glittering on floor!)
    const shatterT = t - 2.35;
    if (!inst.shatterSpawned) {
      inst.shatterSpawned = true;
      const samples = inst.samples;
      const iceCols = ['#f0f9ff', '#bae6fd', '#7dd3fc', '#38bdf8', '#0284c7'];
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const dx = s.lx - box.cx;
        const dy = s.ly - box.cy;
        const angle = Math.atan2(dy - 18, dx + (s.hash - 0.5) * 16);
        const speed = 42 + s.hash * 115;
        const colIdx = Math.min(4, Math.max(0, Math.floor((1 - s.lum) * 5)));
        inst.shatterChunks.push({
          x: s.lx,
          y: s.ly,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 58 - s.hash * 68,
          w: 4 + Math.floor(s.hash * 5),
          h: 4 + Math.floor(hash01(i * 3.7) * 5),
          color: iceCols[colIdx],
          dark: '#0c4a6e',
          age: 0,
          bounced: false,
          seed: i * 19.3
        });
      }
      if (shatterT > 0.03) {
        let rem = Math.min(1.6, shatterT);
        while (rem > 0.001) {
          const step = Math.min(0.025, rem);
          this._stepPhysics(inst, step);
          rem -= step;
        }
      }
    }
    // Brief crystalline burst cross right at shatter moment
    if (!isReflection && shatterT < 0.36) {
      const fA = 1 - shatterT / 0.36;
      ctx.globalAlpha = fA * 0.9;
      drawPixelSpark4(ctx, box.cx, box.cy - 8, Math.round(18 + shatterT * 90), '#7dd3fc', '#ffffff');
      ctx.globalAlpha = 1;
    }

    const fade = 1 - smoothstep(1.15, 1.85, shatterT);
    const chunks = inst.shatterChunks;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      if (isReflection && (i & 1) === 1) continue;
      ctx.globalAlpha = fade * (isReflection ? 0.55 : 0.96);
      // Tumbling aspect flip (pure discrete pixel swap, zero rotate!)
      const flip = (Math.floor(c.age * 8 + c.seed) & 1) === 0;
      const cw = flip ? c.w : c.h;
      const ch = flip ? c.h : c.w;
      ctx.fillStyle = c.dark;
      pxRect(ctx, c.x - 1, c.y - 1, cw + 2, ch + 2);
      ctx.fillStyle = c.color;
      pxRect(ctx, c.x, c.y, cw, ch);
      ctx.fillStyle = '#ffffff';
      pxRect(ctx, c.x, c.y, Math.max(1, cw >> 1), 2);
    }

    // Drifting diamond snow mist lingering softly
    if (!isReflection) {
      for (let i = 0; i < 26; i++) {
        const p = clamp01((shatterT + (i % 5) * 0.06) / 1.55);
        const sx = box.cx + (hash01(i * 7.1) - 0.5) * 160 + Math.sin(t * 3.2 + i) * 14;
        const sy = box.topY + hash01(i * 11.3) * box.h + p * 30;
        ctx.globalAlpha = (1 - p) * 0.85;
        ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#bae6fd';
        pxRect(ctx, sx, sy, 3, 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // 2. SERAPHINA (`priestess` / `priestess_ex`) — Ascension Into Golden Light-Dust
  // ---------------------------------------------------------------------------
  _renderGoldenAscension(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);

    // Feathered ascending sanctuary pixel light-filaments behind her (zero hard box cutoff!)
    if (!isReflection) {
      const beamA = smoothstep(0.08, 1.15, t) * (1 - smoothstep(2.9, 3.85, t));
      if (beamA > 0.01) {
        const rays = [-24, -14, -4, 6, 16, 24];
        for (let r = 0; r < rays.length; r++) {
          const rx = box.cx + rays[r];
          const rayH = 120 + (r === 2 || r === 3 ? 65 : r === 1 || r === 4 ? 38 : 12);
          const segs = 10;
          for (let s = 0; s < segs; s++) {
            const u = s / segs;
            const segA = beamA * (1 - u) * (r === 2 || r === 3 ? 0.14 : 0.085);
            if (segA <= 0.008) continue;
            ctx.globalAlpha = segA;
            ctx.fillStyle = s < 5 ? '#fde047' : '#fffbeb';
            pxRect(ctx, rx - 3, box.botY - (s + 1) * (rayH / segs), 6, Math.ceil(rayH / segs));
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    // Dissolving live kneeling prayer silhouette (stays clearly visible through slow ascension!)
    if (t < 3.45) {
      this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, 0, 0);
    }

    // Softly fading golden pixel halo lingering gently skyward
    const haloA = smoothstep(0.14, 0.95, t) * (1 - smoothstep(3.15, 3.85, t));
    if (!isReflection && haloA > 0.02) {
      const haloY = box.topY - 12 - smoothstep(1.25, 3.7, t) * 38;
      ctx.globalAlpha = haloA * 0.92;
      drawPixelRing(ctx, box.cx, haloY, 22, 6, 2, '#facc15', 30);
      drawPixelRing(ctx, box.cx, haloY, 18, 4, 1, '#fffbeb', 24);
      ctx.globalAlpha = 1;
    }

    // Rising warm golden light motes & drifting pixel feathers (1.2..3.85s — slow graceful drift!)
    if (!isReflection && t > 1.18) {
      const disP = clamp01((t - 1.18) / 2.65);
      const samples = inst.samples;
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const triggerP = (1 - s.normEdge) * 0.44 + s.normY * 0.38 + s.hash * 0.18;
        const startT = 1.22 + (1 - triggerP) * 1.98;
        if (t < startT) continue;
        const age = t - startT;
        const life = clamp01(1 - age / 1.85);
        if (life <= 0.02) continue;
        const sway = Math.sin(age * 3.1 + s.hash * 12) * (6 + age * 14);
        const mx = s.lx + sway;
        const my = s.ly - age * (34 + s.hash * 38);
        ctx.globalAlpha = life * 0.94;
        if (i % 6 === 0) {
          drawPixelFeather(ctx, mx, my, i, '#fde047', '#ffffff');
        } else if (i % 5 === 0) {
          drawPixelSpark4(ctx, mx, my, 3, '#facc15', '#ffffff');
        } else {
          ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#fffbeb';
          pxRect(ctx, mx, my, 3, 3);
        }
      }
      // Subtle extra rising sanctuary dust motes
      for (let k = 0; k < 16; k++) {
        const u = (disP * 1.15 + k * 0.13) % 1;
        ctx.globalAlpha = Math.sin(u * Math.PI) * (1 - disP * 0.35) * 0.78;
        ctx.fillStyle = k % 2 === 0 ? '#fde047' : '#ffffff';
        pxRect(ctx, box.cx + (hash01(k * 9.3) - 0.5) * 95, box.botY - u * 220, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. IGNIS SOL (`mage` / `mage_ex`) — Solar Cinder Burn-Out
  // ---------------------------------------------------------------------------
  _renderSolarCinder(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);

    // Subtle solar heat corona behind silhouette during 0.0..1.75s flare
    if (!isReflection && t < 1.8) {
      const flareA = smoothstep(0.08, 1.12, t) * (1 - smoothstep(1.28, 1.8, t));
      if (flareA > 0.02) {
        ctx.globalAlpha = flareA * 0.22;
        ctx.fillStyle = '#f97316';
        pxRect(ctx, box.leftX - 8, box.topY - 8, box.w + 16, box.h + 12);
        ctx.globalAlpha = flareA * 0.18;
        ctx.fillStyle = '#fef08a';
        pxRect(ctx, box.cx - 18, box.topY + 10, 36, box.h - 20);
        ctx.globalAlpha = 1;
      }
    }

    if (t < 3.52) {
      this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, 0, 0);
    }

    // Swirling orange embers & glowing charcoal ash lifting slowly on a heat draft
    if (!isReflection) {
      const samples = inst.samples;
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const score = s.normEdge * 0.62 + (1 - s.normY) * 0.18 + s.hash * 0.2;
        const burnT = 1.32 + score * 2.02;
        if (t < burnT) continue;
        const age = t - burnT;
        const life = clamp01(1 - age / 1.85);
        if (life <= 0.02) continue;
        const spiral = Math.sin(age * 4.6 + s.hash * 10) * (10 + age * 26);
        const ex = s.lx + spiral;
        const ey = s.ly - age * (46 + s.hash * 46);
        ctx.globalAlpha = life * 0.95;
        if (age < 0.42) {
          ctx.fillStyle = '#fef08a';
          pxRect(ctx, ex, ey, 4, 4);
          ctx.fillStyle = '#ffffff';
          pxRect(ctx, ex + 1, ey + 1, 2, 2);
        } else if (i % 3 === 0) {
          // Dark glowing charcoal ash flake
          ctx.fillStyle = '#292524';
          pxRect(ctx, ex, ey, 4, 3);
          ctx.fillStyle = '#ea580c';
          pxRect(ctx, ex, ey, 2, 1);
        } else {
          ctx.fillStyle = age < 0.95 ? '#f97316' : '#dc2626';
          pxRect(ctx, ex, ey, 3, 3);
        }
      }
      // Early flare sparks (0.0..1.55s)
      if (t < 1.65) {
        for (let k = 0; k < 18; k++) {
          const u = (t * 0.95 + k * 0.11) % 1;
          ctx.globalAlpha = Math.sin(u * Math.PI) * 0.85;
          ctx.fillStyle = k % 2 === 0 ? '#fef08a' : '#f97316';
          pxRect(ctx, box.cx + (hash01(k * 5.7) - 0.5) * box.w, box.botY - u * (box.h + 45), 3, 3);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. CHRONOS (`chronomancer` / `chronomancer_ex`) — Temporal Unravel
  // ---------------------------------------------------------------------------
  _renderTemporalUnravel(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);

    // Cracked pixel clock-dial flashing behind him (0.0..2.75s)
    if (!isReflection && t < 2.85) {
      const dialA = smoothstep(0.0, 0.28, t) * (1 - smoothstep(1.85, 2.85, t));
      const dCx = box.cx;
      const dCy = box.cy - 10;
      const dR = 54;
      ctx.globalAlpha = dialA * 0.85;
      drawPixelRing(ctx, dCx, dCy, dR, dR, 3, '#2dd4bf', 44);
      drawPixelRing(ctx, dCx, dCy, dR - 8, dR - 8, 2, '#facc15', 36);
      // 12 pixel hour ticks
      for (let h = 0; h < 12; h++) {
        const ang = (h / 12) * Math.PI * 2;
        const tx = dCx + Math.cos(ang) * (dR - 5);
        const ty = dCy + Math.sin(ang) * (dR - 5);
        ctx.fillStyle = h % 3 === 0 ? '#fef08a' : '#2dd4bf';
        pxRect(ctx, tx - 1, ty - 1, h % 3 === 0 ? 4 : 2, h % 3 === 0 ? 4 : 2);
      }
      // Clock hands + fracture cracks
      drawPixelLine(ctx, dCx, dCy, dCx, dCy - 38, 3, '#fef08a');
      drawPixelLine(ctx, dCx, dCy, dCx + 24, dCy - 14, 2, '#facc15');
      if (t > 0.45) {
        drawPixelLine(ctx, dCx - 36, dCy - 34, dCx + 38, dCy + 30, 2, '#ffffff');
        drawPixelLine(ctx, dCx + 24, dCy - 42, dCx - 22, dCy + 38, 2, '#5eead4');
      }
      ctx.globalAlpha = 1;
    }

    // 3 fading cyan-gold time-echo afterimages stuttering across (1.02..3.35s)
    if (!isReflection && t >= 1.02 && t < 3.4) {
      const unP = clamp01((t - 1.02) / 2.35);
      const stutter = (Math.floor(t * 11) & 1) === 0 ? 0 : 4;
      const echoes = [
        { ox: -44 - unP * 26 - stutter, a: 0.48, canvas: inst.tintACanvas },
        { ox: -22 - unP * 14 + stutter, a: 0.58, canvas: inst.tintBCanvas },
        { ox: 18 + unP * 18, a: 0.38, canvas: inst.tintACanvas }
      ];
      for (let i = 0; i < echoes.length; i++) {
        const ec = echoes[i];
        const ea = ec.a * (1 - unP * 0.9);
        if (ea <= 0.03) continue;
        ctx.globalAlpha = ea;
        if (ec.canvas) {
          ctx.drawImage(
            ec.canvas,
            0,
            0,
            inst.capW,
            inst.capH,
            Math.round(metrics.baseX + ec.ox),
            Math.round(metrics.baseY),
            metrics.drawW,
            metrics.drawH
          );
        } else {
          ctx.fillStyle = i === 1 ? '#facc15' : '#2dd4bf';
          pxRect(ctx, box.leftX + ec.ox, box.topY, box.w * 0.8, box.h);
        }
      }
      ctx.globalAlpha = 1;
    }

    // Main sprite streaming slowly sideways into sand
    if (t < 3.42) {
      this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, 0, 0);
    }

    // Sideways streaming golden hourglass sand & drifting pixel clock cogs (1.1..3.85s)
    if (!isReflection && t > 1.08) {
      const samples = inst.samples;
      const cogTick = Math.floor(t * 6);
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const startT = 1.12 + s.normX * 2.08;
        if (t < startT) continue;
        const age = t - startT;
        const life = clamp01(1 - age / 1.75);
        if (life <= 0.02) continue;
        const sx = s.lx - age * (68 + s.hash * 56);
        const sy = s.ly + Math.sin(age * 4.5 + s.hash * 9) * 8 - age * 12;
        ctx.globalAlpha = life * 0.94;
        if (i % 12 === 0) {
          drawPixelCog(ctx, sx, sy, 5 + (i % 3), cogTick + i, '#facc15', '#5eead4');
        } else {
          ctx.fillStyle = i % 3 === 0 ? '#2dd4bf' : i % 2 === 0 ? '#fde047' : '#f59e0b';
          pxRect(ctx, sx, sy, 3, 2);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. AETHELGARD (`warrior` / `warrior_ex`) — Knight's Last Stand
  // ---------------------------------------------------------------------------
  _renderKnightsLastStand(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);

    // Subtle celestial frost-rune ring beneath his kneeling stance that dims solemnly
    if (!isReflection) {
      const runeA = Math.max(0.08, 0.72 * (1 - smoothstep(0.95, 3.75, t)));
      ctx.globalAlpha = runeA;
      drawPixelRing(ctx, box.cx, -2, 46, 10, 2, '#38bdf8', 36);
      drawPixelRing(ctx, box.cx, -2, 30, 6, 2, '#bae6fd', 24);
      ctx.globalAlpha = 1;
    }

    // Heroic kneeling-on-greatsword silhouette stays firmly visible the entire time!
    this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, 0, 0);

    // Pale cyan & white-gold soul-sparks drifting solemnly upward off pauldrons & blade
    if (!isReflection) {
      for (let i = 0; i < 28; i++) {
        const cycle = (t * (0.3 + (i % 4) * 0.06) + i * 0.13) % 1;
        const fade = Math.sin(cycle * Math.PI) * (0.45 + 0.55 * (1 - smoothstep(2.7, 3.85, t)));
        const sx = box.cx + (hash01(i * 11.7) - 0.5) * (box.w * 0.95) + Math.sin(t * 2.0 + i) * 5;
        const sy = box.topY + 18 + hash01(i * 5.3) * (box.h * 0.6) - cycle * 95;
        ctx.globalAlpha = clamp01(fade);
        if (i % 5 === 0) {
          drawPixelSpark4(ctx, sx, sy, 3, '#38bdf8', '#ffffff');
        } else {
          ctx.fillStyle = i % 2 === 0 ? '#bae6fd' : '#38bdf8';
          pxRect(ctx, sx, sy, 3, 3);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // 6. KAZE-MARU (`ronin` / `ronin_ex`) — Bushido Sheathe & Sakura Wind
  // ---------------------------------------------------------------------------
  _renderBushidoSakura(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);

    // Dignified upright freeze (0.0..0.72s) -> graceful one-knee drop (0.72..2.6s), NEVER prone!
    this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, 0, 0);

    if (isReflection) return;

    // 0.20..0.62s: Crisp crimson-white iaijutsu slash glint across his haunting upright freeze
    if (t >= 0.2 && t <= 0.64) {
      const p = clamp01((t - 0.2) / 0.44);
      const a = Math.sin(p * Math.PI);
      ctx.globalAlpha = a * 0.95;
      drawPixelLine(ctx, box.leftX - 36, box.cy + 16, box.rightX + 38, box.cy - 28, 4, '#dc2626');
      drawPixelLine(ctx, box.leftX - 28, box.cy + 12, box.rightX + 30, box.cy - 24, 2, '#ffffff');
      ctx.globalAlpha = 1;
    }

    // 0.80..1.38s: Steel-white katana-sheathe cross-flash + lingering white breath-mist exhale
    if (t >= 0.78 && t <= 1.45) {
      const sp = clamp01((t - 0.78) / 0.36);
      if (sp < 1) {
        const a = Math.sin(sp * Math.PI);
        ctx.globalAlpha = a;
        drawPixelSpark4(ctx, box.cx - 8, box.cy + 10, Math.round(6 + a * 20), '#bae6fd', '#ffffff');
      }
      // Pale white breath-mist puff drifting forward from head/mouth height
      const mp = clamp01((t - 0.84) / 0.6);
      ctx.globalAlpha = (1 - mp) * 0.78;
      ctx.fillStyle = '#e2e8f0';
      pxRect(ctx, box.cx + 12 + mp * 32, box.topY + 22 - mp * 12, 6, 4);
      pxRect(ctx, box.cx + 18 + mp * 42, box.topY + 18 - mp * 16, 8, 4);
      ctx.fillStyle = '#ffffff';
      pxRect(ctx, box.cx + 14 + mp * 34, box.topY + 20 - mp * 12, 4, 2);
      ctx.globalAlpha = 1;
    }

    // 1.08..3.85s: Storm-lit gust of pixel sakura petals sweeping slowly across kneeling silhouette!
    if (t >= 1.08) {
      const windT = t - 1.08;
      const petalCols = ['#fbcfe8', '#f472b6', '#fda4af', '#ffffff'];
      for (let i = 0; i < 56; i++) {
        const delay = (i % 14) * 0.11;
        if (windT < delay) continue;
        const age = windT - delay;
        const life = clamp01(1 - age / 2.65);
        if (life <= 0.02) continue;
        const startX = box.cx - 125 + (hash01(i * 3.1) - 0.5) * 70;
        const startY = box.topY - 30 + hash01(i * 7.9) * (box.h * 0.95);
        const px = startX + age * (98 + hash01(i * 13.7) * 58);
        const py = Math.min(2, startY + age * (28 + (i % 4) * 10) + Math.sin(age * 5.2 + i) * 10);
        ctx.globalAlpha = Math.min(1, age * 3) * life * 0.96;
        drawPixelPetal(ctx, px, py, i, petalCols[i % petalCols.length], '#ffffff');
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // 7. FREYJA (`valkyrie` / `valkyrie_ex`) — Phoenix Feather Pyre
  // ---------------------------------------------------------------------------
  _renderPhoenixPyre(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);

    // Flaring phoenix wing embers behind her (0.0..2.05s)
    if (!isReflection && t < 2.15) {
      const flareA = smoothstep(0.1, 1.15, t) * (1 - smoothstep(1.4, 2.15, t));
      if (flareA > 0.02) {
        const wingSpread = Math.round(28 + flareA * 48);
        ctx.globalAlpha = flareA * 0.32;
        ctx.fillStyle = '#f43f5e';
        pxRect(ctx, box.cx - wingSpread, box.topY + 12, wingSpread * 2, 34);
        ctx.globalAlpha = flareA * 0.25;
        ctx.fillStyle = '#fde047';
        pxRect(ctx, box.cx - Math.round(wingSpread * 0.72), box.topY + 18, Math.round(wingSpread * 1.44), 22);
        ctx.globalAlpha = 1;
      }
    }

    if (t < 3.46) {
      this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, 0, 0);
    }

    // 1.25..3.85s: Crimson-gold burning pixel phoenix feathers bursting into a slow majestic upward spiral!
    if (!isReflection && t >= 1.22) {
      const pyreT = t - 1.22;
      const featherCols = ['#ef4444', '#f97316', '#facc15', '#fb7185'];
      for (let i = 0; i < 58; i++) {
        const delay = (i % 15) * 0.09;
        if (pyreT < delay) continue;
        const age = pyreT - delay;
        const life = clamp01(1 - age / 2.25);
        if (life <= 0.02) continue;
        const ang = i * 0.72 + age * 3.1;
        const rad = 14 + age * (38 + (i % 5) * 9);
        const fx = box.cx + Math.cos(ang) * rad;
        const fy = box.botY - 22 - age * (68 + (i % 6) * 18) + Math.sin(ang) * 10;
        ctx.globalAlpha = Math.min(1, age * 4) * life * 0.96;
        if (i % 3 !== 0) {
          drawPixelFeather(ctx, fx, fy, i, featherCols[i % featherCols.length], '#fef08a');
        } else {
          drawPixelSpark4(ctx, fx, fy, 3, '#f97316', '#ffffff');
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // 8. TORGAR (`titan` / `titan_ex`) — Obsidian Petrifaction
  // ---------------------------------------------------------------------------
  _renderObsidianPetrifaction(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);

    // Monumental braced titan silhouette stays solid & turns into cooling obsidian stone (NEVER flops flat!)
    this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, 0, 0);

    if (isReflection) return;

    // Pixel volcanic ash & dark-grey stepped smoke puffs venting continuously from his cracked armor
    for (let i = 0; i < 32; i++) {
      const cycle = (t * (0.34 + (i % 5) * 0.07) + i * 0.17) % 1;
      const alpha = Math.sin(cycle * Math.PI) * 0.8;
      const vx = box.cx + (hash01(i * 9.1) - 0.5) * (box.w * 0.9) + Math.sin(t * 1.8 + i) * 8;
      const vy = box.topY + 14 + hash01(i * 4.7) * (box.h * 0.65) - cycle * 110;
      ctx.globalAlpha = alpha;
      if (i % 4 === 0 && t < 2.65) {
        // Dying magma ember venting out early
        ctx.fillStyle = '#f97316';
        pxRect(ctx, vx, vy, 3, 3);
        ctx.fillStyle = '#fef08a';
        pxRect(ctx, vx, vy, 1, 1);
      } else if (i % 3 === 0) {
        // Stepped pixel volcanic smoke puff cluster
        ctx.fillStyle = '#3f3f46';
        pxRect(ctx, vx - 4, vy - 2, 10, 6);
        ctx.fillStyle = '#52525b';
        pxRect(ctx, vx - 2, vy - 4, 6, 4);
      } else {
        // Falling/drifting volcanic ash flake
        ctx.fillStyle = i % 2 === 0 ? '#71717a' : '#a1a1aa';
        pxRect(ctx, vx, vy, 3, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // 9. SYLVARA (`archer` / `archer_ex`) — Starwood Return
  // ---------------------------------------------------------------------------
  _renderStarwoodReturn(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);

    // Sinks to one knee & unravels slowly into glowing emerald leaves
    if (t < 3.46) {
      this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, 0, 0);
    }

    if (isReflection) return;

    // Pixel emerald vines sprouting underfoot & lingering warmly (0.0..3.85s)
    const vineP = smoothstep(0.08, 1.32, t);
    const vineFade = 1 - smoothstep(3.15, 3.85, t) * 0.38;
    const vineSeeds = [-34, -18, -4, 14, 30];
    ctx.globalAlpha = vineFade * 0.94;
    for (let v = 0; v < vineSeeds.length; v++) {
      const baseVx = box.cx + vineSeeds[v];
      const segs = Math.floor(vineP * (9 + (v % 3) * 3));
      for (let s = 0; s < segs; s++) {
        const vx = baseVx + Math.round(Math.sin(s * 0.7 + v * 1.4) * 5);
        const vy = -s * 5;
        ctx.fillStyle = s % 2 === 0 ? '#065f46' : '#10b981';
        pxRect(ctx, vx, vy - 4, 3, 5);
        if (s % 3 === 1) {
          ctx.fillStyle = '#34d399';
          pxRect(ctx, vx + (s % 2 === 0 ? 3 : -4), vy - 3, 4, 2);
        }
        if (s === segs - 1 && segs >= 5) {
          ctx.fillStyle = '#d1fae5';
          pxRect(ctx, vx - 1, vy - 6, 4, 3);
        }
      }
    }

    // 1.22..3.85s: Slow unraveling into drifting glowing emerald leaves & moonlit forest fireflies
    if (t >= 1.22) {
      const samples = inst.samples;
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const triggerP = (1 - s.normEdge) * 0.35 + s.normY * 0.45 + s.hash * 0.2;
        const startT = 1.25 + (1 - triggerP) * 1.98;
        if (t < startT) continue;
        const age = t - startT;
        const life = clamp01(1 - age / 1.95);
        if (life <= 0.02) continue;
        const lx = s.lx + age * (24 + s.hash * 22) + Math.sin(age * 3.2 + i) * 9;
        const ly = s.ly - age * (26 + s.hash * 24) + Math.cos(age * 2.4 + i) * 5;
        ctx.globalAlpha = life * 0.95;
        if (i % 4 === 0) {
          // Moonlit forest firefly
          const blink = 0.55 + 0.45 * Math.sin(t * 9 + i * 2.3);
          ctx.globalAlpha = life * blink;
          drawPixelSpark4(ctx, lx, ly, 2, '#67e8f9', '#fef08a');
        } else {
          drawPixelPetal(ctx, lx, ly, i, i % 2 === 0 ? '#34d399' : '#10b981', '#d1fae5');
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // 10. MALAKOR (`reaper` / `reaper_ex`) — Abyssal Rift Drag-Down
  // ---------------------------------------------------------------------------
  _renderAbyssalRift(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);
    const groundYLocal = Number.isFinite(inst.fighter.groundY)
      ? Math.max(0, inst.fighter.groundY - inst.fighter.y)
      : 0;

    // Rift width: tears open 0.08..1.05s, holds open 1.05..3.22s, snaps shut violently 3.22..3.62s
    const openP = smoothstep(0.08, 1.05, t);
    const closeP = smoothstep(3.22, 3.62, t);
    const riftFrac = clamp01(openP * (1 - closeP));
    const riftHalfW = Math.round(78 * riftFrac);
    const riftH = Math.max(4, Math.round(16 * riftFrac));

    // Back abyssal void & tapered jagged Hellpit fissure lip (pointed dimensional tear ends!)
    if (!isReflection && riftHalfW > 3) {
      const steps = Math.max(4, Math.floor((riftHalfW * 2) / 5));
      for (let i = 0; i < steps; i++) {
        const u = (i + 0.5) / steps; // 0..1 across fissure
        const taper = Math.sin(u * Math.PI); // 0 at tips -> 1 at center
        const x = box.cx - riftHalfW + i * 5;
        const localH = Math.max(2, Math.round(riftH * taper));
        const jag = ((i * 5) % 5) - 2;
        ctx.fillStyle = '#04010a';
        pxRect(ctx, x, groundYLocal - (localH >> 1) + jag, 5, localH);
        ctx.fillStyle = (i & 1) === 0 ? '#d946ef' : '#e11d48';
        pxRect(ctx, x, groundYLocal - (localH >> 1) - 2 + jag, 5, 2);
        pxRect(ctx, x, groundYLocal + (localH >> 1) + jag, 5, 2);
        if (taper > 0.35) {
          ctx.fillStyle = '#fdf4ff';
          pxRect(ctx, x, groundYLocal - 1, 5, 2);
        }
      }
    }

    // Back abyssal tendrils (3 sinuous pixel tentacles reaching up behind him)
    const tendrilP = smoothstep(0.85, 1.5, t) * (1 - smoothstep(3.05, 3.45, t));
    if (!isReflection && tendrilP > 0.02) {
      this._drawAbyssalTendrils(ctx, box.cx, groundYLocal, tendrilP, t, [-32, 0, 32], false);
    }

    // Clipped sprite slowly dragged downward INTO the rift (1.08..3.22s, dramatic mid-drag resistance!)
    const rawSink = smoothstep(1.08, 3.22, t);
    const struggle = rawSink > 0.2 && rawSink < 0.7 ? Math.sin(rawSink * Math.PI * 5) * 0.018 : 0;
    const sinkP = clamp01(rawSink + struggle);
    const sinkOffset = Math.round(sinkP * (box.h + 46));
    if (sinkP < 0.995) {
      ctx.save();
      ctx.beginPath();
      // Clip strictly above the fissure floor lip so boots/legs/torso vanish cleanly INTO the rift!
      ctx.rect(
        Math.round(metrics.baseX - 40),
        Math.round(metrics.baseY - 40),
        Math.round(metrics.drawW + 80),
        Math.round(groundYLocal - (metrics.baseY - 40) + 2)
      );
      ctx.clip();
      this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, 0, sinkOffset);
      ctx.restore();
    }

    // Front abyssal tendrils wrapping around his body & pulling down!
    if (!isReflection && tendrilP > 0.02) {
      this._drawAbyssalTendrils(ctx, box.cx, groundYLocal, tendrilP, t, [-20, 14, -4], true);
    }

    // 3.20..3.85s: Rift snap-shut flash & burst of violet soul-sparks
    if (!isReflection && t >= 3.2) {
      const snapT = t - 3.2;
      if (snapT < 0.34) {
        const fa = 1 - snapT / 0.34;
        ctx.globalAlpha = fa;
        ctx.fillStyle = '#d946ef';
        pxRect(ctx, box.cx - 94 * fa, groundYLocal - 3, 188 * fa, 6);
        ctx.fillStyle = '#fdf4ff';
        pxRect(ctx, box.cx - 68 * fa, groundYLocal - 1, 136 * fa, 2);
      }
      for (let i = 0; i < 42; i++) {
        const ang = -Math.PI * (0.08 + hash01(i * 4.3) * 0.84);
        const spd = 72 + hash01(i * 9.7) * 165;
        const sx = box.cx + Math.cos(ang) * spd * snapT;
        const sy = groundYLocal + Math.sin(ang) * spd * snapT + snapT * snapT * 145;
        const life = clamp01(1 - snapT / 0.68);
        ctx.globalAlpha = life;
        if (i % 4 === 0) {
          drawPixelSpark4(ctx, sx, sy, 3, '#d946ef', '#fdf4ff');
        } else {
          ctx.fillStyle = i % 2 === 0 ? '#a855f7' : '#f43f5e';
          pxRect(ctx, sx, sy, 4, 4);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawAbyssalTendrils(ctx, cx, floorY, p, t, xOffsets, isFront) {
    for (let k = 0; k < xOffsets.length; k++) {
      const baseX = cx + xOffsets[k];
      const maxH = (isFront ? 105 : 138) * p;
      const segs = Math.max(2, Math.floor(maxH / 6));
      for (let s = 0; s < segs; s++) {
        const u = s / Math.max(1, segs);
        const sway = Math.sin(u * 5.2 - t * 7.5 + k * 2.1 + (isFront ? 1.4 : 0)) * (10 + u * 12);
        const pullIn = isFront ? -xOffsets[k] * u * 0.48 : 0;
        const w = Math.max(3, Math.round((1 - u * 0.65) * (isFront ? 9 : 11)));
        const tx = baseX + sway + pullIn;
        const ty = floorY - s * 6;
        ctx.fillStyle = isFront ? '#a855f7' : '#e11d48';
        pxRect(ctx, tx - (w >> 1) - 1, ty - 6, w + 2, 6);
        ctx.fillStyle = '#090214';
        pxRect(ctx, tx - (w >> 1), ty - 6, w, 6);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 11. VEX-09 (`android` / `android_ex`) — Holographic System-Crash
  // ---------------------------------------------------------------------------
  _renderHolographicCrash(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);
    const step30 = Math.floor(t * 30);

    // 0.0..1.12s: Red short-circuit sparks & error pixel blocks popping off her silhouette
    if (t < 1.12) {
      const jolt = (step30 % 4) === 0 ? ((step30 & 4) === 0 ? 3 : -3) : 0;
      this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, jolt, 0);
      if (!isReflection) {
        for (let i = 0; i < 16; i++) {
          const sx = box.cx + (hash01(i * 7.3 + (step30 >> 1)) - 0.5) * (box.w + 26);
          const sy = box.topY + hash01(i * 11.1 + (step30 >> 1)) * box.h;
          ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#ef4444';
          pxRect(ctx, sx, sy, i % 4 === 0 ? 12 : 4, 2);
          if (i % 5 === 0) {
            drawPixelLine(ctx, sx, sy, sx + (i % 2 === 0 ? 14 : -14), sy - 10, 2, '#f43f5e');
          }
        }
        // Crisp pixel crash bars near visor
        ctx.fillStyle = '#ef4444';
        pxRect(ctx, box.rightX + 4, box.topY + 12, 22, 5);
        ctx.fillStyle = '#ffffff';
        pxRect(ctx, box.rightX + 6, box.topY + 13, 12, 2);
      }
      return;
    }

    // 1.12..3.85s: Horizontal cyan/magenta RGB glitch scanline slices + slow bottom-to-top voxel decompile
    const decP = smoothstep(1.18, 3.25, t);
    const remainH = Math.max(0, 1 - decP);

    if (remainH > 0.01) {
      const slices = 12;
      const sliceSrcH = inst.capH / slices;
      const sliceDstH = metrics.drawH / slices;
      for (let s = 0; s < slices; s++) {
        const bandNorm = (s + 0.5) / slices;
        if (bandNorm > remainH + 0.08) continue;
        const jitSeed = hash01(s * 19.3 + step30 * 3.7);
        const glitchOff = jitSeed > 0.52 ? Math.round((jitSeed - 0.76) * 44) : 0;
        const rgbSplit = Math.round(5 + decP * 16 + (jitSeed > 0.7 ? 10 : 0));
        const sy = Math.round(s * sliceSrcH);
        const sh = Math.max(1, Math.round(sliceSrcH));
        const dy = Math.round(metrics.baseY + s * sliceDstH);
        const dh = Math.max(1, Math.round(sliceDstH));

        if (!isReflection && inst.tintACanvas && inst.tintBCanvas) {
          ctx.globalAlpha = 0.58;
          ctx.drawImage(
            inst.tintACanvas,
            0, sy, inst.capW, sh,
            Math.round(metrics.baseX + glitchOff - rgbSplit), dy, metrics.drawW, dh
          );
          ctx.drawImage(
            inst.tintBCanvas,
            0, sy, inst.capW, sh,
            Math.round(metrics.baseX + glitchOff + rgbSplit), dy, metrics.drawW, dh
          );
          ctx.globalAlpha = 1;
        }
        if (hasWork && inst.workCanvas) {
          ctx.drawImage(
            inst.workCanvas,
            0, sy, inst.capW, sh,
            Math.round(metrics.baseX + glitchOff), dy, metrics.drawW, dh
          );
        } else {
          ctx.fillStyle = (s & 1) === 0 ? '#00f0ff' : '#ff2a85';
          pxRect(ctx, box.leftX + glitchOff, dy, box.w, Math.max(2, dh - 2));
        }
      }
      // Glowing cyan decompile scan-cursor line sweeping bottom-to-top
      if (!isReflection) {
        const scanY = box.topY + remainH * box.h;
        ctx.fillStyle = '#00f0ff';
        pxRect(ctx, box.leftX - 18, scanY - 2, box.w + 36, 4);
        ctx.fillStyle = '#ffffff';
        pxRect(ctx, box.leftX - 10, scanY - 1, box.w + 20, 2);
      }
    }

    // Spawn falling neon pixel voxels as the decompile line passes each real sprite sample!
    const samples = inst.samples;
    for (let i = 0; i < samples.length; i++) {
      if (inst.emittedSamples.has(i)) continue;
      const s = samples[i];
      if (s.normY >= remainH) {
        inst.emittedSamples.add(i);
        const neonPick = i % 3 === 0 ? '#00f0ff' : i % 3 === 1 ? '#ff2a85' : `rgb(${s.r},${s.g},${s.b})`;
        const vox = {
          x: s.lx,
          y: s.ly,
          vx: (s.hash - 0.5) * 82,
          vy: -32 - s.hash * 48,
          size: 4 + (i % 3) * 2,
          color: neonPick,
          wire: i % 4 === 0,
          age: 0,
          bounced: false,
          seed: i * 17
        };
        const expectedSpawnT = 1.18 + (1 - s.normY) * 2.07;
        let catchup = Math.min(1.4, Math.max(0, t - expectedSpawnT));
        while (catchup > 0.03) {
          const step = Math.min(0.025, catchup);
          vox.age += step;
          vox.vy += 370 * step;
          vox.x += vox.vx * step;
          vox.y += vox.vy * step;
          if (vox.y > 1) {
            vox.y = 1;
            if (!vox.bounced) {
              vox.vy = -58 - (vox.seed % 42);
              vox.vx *= 0.64;
              vox.bounced = true;
            } else {
              vox.vy = 0;
              vox.vx *= 0.8;
            }
          }
          catchup -= step;
        }
        inst.voxels.push(vox);
      }
    }

    // Render falling neon pixel voxels (lingering & blinking out slowly on the floor!)
    if (!isReflection) {
      const voxels = inst.voxels;
      for (let i = 0; i < voxels.length; i++) {
        const v = voxels[i];
        const life = clamp01(1 - v.age / 1.75);
        if (life <= 0.02) continue;
        if (life < 0.25 && ((step30 + i) & 1) === 0) continue; // crisp digital blink-out
        ctx.globalAlpha = life * 0.96;
        if (v.wire) {
          ctx.fillStyle = '#00f0ff';
          pxRect(ctx, v.x, v.y, v.size, 1);
          pxRect(ctx, v.x, v.y + v.size - 1, v.size, 1);
          pxRect(ctx, v.x, v.y, 1, v.size);
          pxRect(ctx, v.x + v.size - 1, v.y, 1, v.size);
        } else {
          ctx.fillStyle = v.color;
          pxRect(ctx, v.x, v.y, v.size, v.size);
          ctx.fillStyle = '#ffffff';
          pxRect(ctx, v.x, v.y, 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // 12. NYX (`nyx_ex`) — Cob-OS Emergency Eject
  // ---------------------------------------------------------------------------
  _renderCobOsEject(ctx, inst, sheet, metrics, hasWork, isReflection) {
    const t = inst.elapsed;
    const box = this._getSpriteCenter(inst, metrics);

    // Mini Cob-OS neon glitch window frame behind her (0.06..3.65s)
    if (!isReflection && t >= 0.06 && t < 3.7) {
      const popP = smoothstep(0.06, 0.36, t);
      const shutP = smoothstep(2.92, 3.65, t);
      const winW = Math.round(146 * popP * (1 - smoothstep(3.32, 3.65, t)));
      const winH = Math.max(4, Math.round(166 * popP * (1 - smoothstep(2.92, 3.32, t))));
      const wx = Math.round(box.cx - winW * 0.5);
      const wy = Math.round(box.cy - winH * 0.5 - 4);
      if (winW > 4) {
        if (shutP > 0.55) {
          // Retro CRT horizontal shut-off neon flash line!
          ctx.globalAlpha = 1 - (shutP - 0.55) / 0.45;
          ctx.fillStyle = '#22d3ee';
          pxRect(ctx, wx, box.cy - 3, winW, 6);
          ctx.fillStyle = '#ffffff';
          pxRect(ctx, wx + 4, box.cy - 1, Math.max(4, winW - 8), 2);
        } else {
          ctx.globalAlpha = 0.84;
          ctx.fillStyle = '#080d1e';
          pxRect(ctx, wx, wy, winW, winH);
          // Neon pixel border & titlebar
          ctx.fillStyle = '#22d3ee';
          pxRect(ctx, wx, wy, winW, 2);
          pxRect(ctx, wx, wy + winH - 2, winW, 2);
          pxRect(ctx, wx, wy, 2, winH);
          pxRect(ctx, wx + winW - 2, wy, 2, winH);
          if (winH > 22) {
            ctx.fillStyle = '#f472b6';
            pxRect(ctx, wx + 2, wy + 2, winW - 4, 14);
            // Tiny pixel titlebar bars + pixel [X] close icon (0 emojis!)
            ctx.fillStyle = '#080d1e';
            pxRect(ctx, wx + 8, wy + 6, 28, 3);
            pxRect(ctx, wx + 40, wy + 6, 16, 3);
            const xb = wx + winW - 14;
            const yb = wy + 5;
            ctx.fillStyle = '#ffffff';
            pxRect(ctx, xb, yb, 8, 8);
            ctx.fillStyle = '#be185d';
            pxRect(ctx, xb + 1, yb + 1, 2, 2);
            pxRect(ctx, xb + 5, yb + 1, 2, 2);
            pxRect(ctx, xb + 3, yb + 3, 2, 2);
            pxRect(ctx, xb + 1, yb + 5, 2, 2);
            pxRect(ctx, xb + 5, yb + 5, 2, 2);
            // Subtle CRT scanlines inside mini window
            ctx.fillStyle = '#22d3ee';
            ctx.globalAlpha = 0.14;
            for (let sy = wy + 20; sy < wy + winH - 4; sy += 6) {
              pxRect(ctx, wx + 4, sy, winW - 8, 2);
            }
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    // Digitizing live sprite shrinking gently into poof at 2.72s
    if (t < 2.72) {
      const shrink = t > 1.65 ? 1 - smoothstep(1.65, 2.72, t) * 0.26 : 1;
      const jitX = t > 1.1 && (Math.floor(t * 22) & 3) === 0 ? 4 : 0;
      this._drawWorkOrPose(ctx, inst, sheet, metrics, hasWork, jitX, 0, shrink, shrink);
    }

    if (isReflection) return;

    // 1.05..3.15s: Swirling pastel pixel-hearts & neon glitch squares
    if (t >= 1.05 && t < 3.2) {
      const swT = t - 1.05;
      const fade = 1 - smoothstep(1.65, 2.15, swT);
      const cols = ['#f472b6', '#fda4af', '#67e8f9', '#fde047'];
      for (let i = 0; i < 20; i++) {
        const ang = i * 0.95 + swT * 3.6;
        const rad = 18 + swT * 38 + (i % 3) * 14;
        const hx = box.cx + Math.cos(ang) * rad;
        const hy = box.cy - 6 + Math.sin(ang) * (rad * 0.65) - swT * 18;
        ctx.globalAlpha = fade * 0.96;
        if (i % 2 === 0) {
          drawPixelHeart(ctx, hx, hy, i % 4 === 0 ? 2 : 1, cols[i % cols.length], '#ffffff');
        } else {
          ctx.fillStyle = cols[i % cols.length];
          pxRect(ctx, hx - 3, hy - 3, 6, 6);
          ctx.fillStyle = '#ffffff';
          pxRect(ctx, hx - 1, hy - 1, 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }

    // 2.70..3.85s: Joyful starry cyber-confetti POOF lingering softly!
    if (t >= 2.7) {
      const poofT = t - 2.7;
      const life = clamp01(1 - poofT / 1.25);
      const confettiCols = ['#f472b6', '#22d3ee', '#fde047', '#c084fc', '#ffffff'];
      if (poofT < 0.3) {
        const fa = 1 - poofT / 0.3;
        ctx.globalAlpha = fa;
        drawPixelSpark4(ctx, box.cx, box.cy - 6, Math.round(14 + poofT * 105), '#f472b6', '#ffffff');
      }
      for (let i = 0; i < 42; i++) {
        const ang = hash01(i * 5.1) * Math.PI * 2;
        const spd = 55 + hash01(i * 11.9) * 125;
        const cx = box.cx + Math.cos(ang) * spd * poofT;
        const cy = box.cy - 6 + Math.sin(ang) * spd * poofT + poofT * poofT * 58;
        ctx.globalAlpha = life;
        if (i % 5 === 0) {
          drawPixelHeart(ctx, cx, cy, 1, confettiCols[i % 4], '#ffffff');
        } else if (i % 3 === 0) {
          drawPixelSpark4(ctx, cx, cy, 3, confettiCols[i % confettiCols.length], '#ffffff');
        } else {
          ctx.fillStyle = confettiCols[i % confettiCols.length];
          pxRect(ctx, cx - 2, cy - 2, 4, 4);
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}
