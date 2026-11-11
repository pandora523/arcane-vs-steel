/**
 * ArcaneShaderFX — First-Party Dual-Buffer HD-2D Pixel Shader & Particle Simulation Engine
 * Designed natively for Arcane vs. Steel (1280x720 arena, 208x208 cel-shaded champions).
 *
 * Architecture:
 *  - Dual 32-bit pixel planes (`albedo` for crisp palette-stepped pixels + `emissive` for additive HDR bloom)
 *  - 4x4 Bayer ordered stipple dithering so fading slashes and trails dissolve into crisp retro pixel clusters
 *  - Local-space pixel-cell coordinate transforms (`mirrorX`, `angleRad`) that snap onto integer pixel cells
 *  - True 2.5D depth split (`back` pass behind fighters + `front` pass in front of fighters)
 *  - Deterministic 120Hz fixed-timestep particle & midpoint-lightning simulation
 */

const BAYER_THRESHOLD_4X4 = new Float32Array([
  0.03125, 0.53125, 0.15625, 0.65625,
  0.78125, 0.28125, 0.90625, 0.40625,
  0.21875, 0.71875, 0.09375, 0.59375,
  0.96875, 0.46875, 0.84375, 0.34375
]);

export const PURE_WHITE = 0xffffffff >>> 0;

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function clampRange(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function mixScalar(a, b, t) {
  return a + (b - a) * t;
}

export function smoothStep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
}

export const Easing = {
  outCubic: (t) => 1 - Math.pow(1 - clamp01(t), 3),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(t))),
  inQuad: (t) => {
    const u = clamp01(t);
    return u * u;
  },
  outBack: (t, overshoot = 1.7) => {
    const u = clamp01(t) - 1;
    return 1 + u * u * ((overshoot + 1) * u + overshoot);
  }
};

/** Parse `#rrggbb` or `#rgb` into packed ABGR 32-bit uint (`0xffbbggrr`) for fast little-endian ImageData writes. */
export function packHexColor(hexStr) {
  if (typeof hexStr === 'number') return hexStr >>> 0;
  const s = String(hexStr || '#ffffff').replace('#', '');
  let r = 255;
  let g = 255;
  let b = 255;
  if (s.length === 3) {
    r = parseInt(s[0] + s[0], 16);
    g = parseInt(s[1] + s[1], 16);
    b = parseInt(s[2] + s[2], 16);
  } else if (s.length >= 6) {
    r = parseInt(s.slice(0, 2), 16);
    g = parseInt(s.slice(2, 4), 16);
    b = parseInt(s.slice(4, 6), 16);
  }
  return ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
}

/** Resample an array of hex/packed colors into an exact `targetSteps` packed-ABGR ramp. */
export function buildColorRamp(colors, targetSteps = 8) {
  const packed = (colors && colors.length ? colors : ['#090b1c', '#00d8ff', '#ffffff']).map(packHexColor);
  if (packed.length === targetSteps) return packed;
  const out = new Array(targetSteps);
  const maxIdx = packed.length - 1;
  for (let i = 0; i < targetSteps; i++) {
    const pos = (i / Math.max(1, targetSteps - 1)) * maxIdx;
    const i0 = Math.floor(pos);
    const i1 = Math.min(maxIdx, i0 + 1);
    const f = pos - i0;
    const c0 = packed[i0];
    const c1 = packed[i1];
    const r = Math.round((c0 & 255) + ((c1 & 255) - (c0 & 255)) * f);
    const g = Math.round(((c0 >>> 8) & 255) + (((c1 >>> 8) & 255) - ((c0 >>> 8) & 255)) * f);
    const b = Math.round(((c0 >>> 16) & 255) + (((c1 >>> 16) & 255) - ((c0 >>> 16) & 255)) * f);
    out[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  return out;
}

/** Deterministic integer hash -> [0, 1) float for frame-coherent procedural noise & scanline tears. */
export function hashFloat(seed, a = 0, b = 0, c = 0) {
  let h = (seed | 0) ^ Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 2D value noise in [-1, 1] for plasma boil and thruster exhaust turbulence. */
export function valueNoise2D(x, y, seed = 1) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = hashFloat(seed, xi, yi);
  const n10 = hashFloat(seed, xi + 1, yi);
  const n01 = hashFloat(seed, xi, yi + 1);
  const n11 = hashFloat(seed, xi + 1, yi + 1);
  const nx0 = n00 + (n10 - n00) * u;
  const nx1 = n01 + (n11 - n01) * u;
  return (nx0 + (nx1 - nx0) * v) * 2 - 1;
}

export function fbmNoise2D(x, y, seed = 1, octaves = 2) {
  let sum = 0;
  let amp = 0.65;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2D(x * freq, y * freq, seed + i * 31) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.02;
  }
  return sum / (norm || 1);
}

/** Fast deterministic XorShift32 PRNG for repeatable 120Hz particle & lightning sims. */
export class DeterministicRng {
  constructor(seed = 1) {
    this.state = ((seed | 0) ^ 0x6d2b79f5) >>> 0 || 1;
  }

  nextFloat() {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0 || 1;
    return this.state / 4294967296;
  }

  between(min, max) {
    return min + (max - min) * this.nextFloat();
  }

  intBetween(min, max) {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  chance(prob) {
    return this.nextFloat() < prob;
  }

  sign() {
    return this.nextFloat() < 0.5 ? -1 : 1;
  }

  pick(arr) {
    return arr[Math.floor(this.nextFloat() * arr.length) % arr.length];
  }
}

/** Recursive midpoint-displacement jagged electric arc between `(x0, y0)` and `(x1, y1)`. */
export function buildLightningChain(rng, x0, y0, x1, y1, jitter = 0.3, subdivisions = 3) {
  let pts = [
    [x0, y0],
    [x1, y1]
  ];
  let disp = Math.hypot(x1 - x0, y1 - y0) * jitter;
  for (let step = 0; step < subdivisions; step++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mx = (a[0] + b[0]) * 0.5;
      const my = (a[1] + b[1]) * 0.5;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const offset = (rng.nextFloat() * 2 - 1) * disp;
      next.push([mx + nx * offset, my + ny * offset], b);
    }
    pts = next;
    disp *= 0.52;
  }
  return pts;
}

/** Dual-buffer pixel surface (`albedo` + additive `emissive`). */
export function createPixelSurface(width, height) {
  return {
    width,
    height,
    albedo: new Uint32Array(width * height),
    emissive: new Uint32Array(width * height)
  };
}

export function clearPixelSurface(surface) {
  surface.albedo.fill(0);
  surface.emissive.fill(0);
}

/** Merge `albedo` + additive `emissive` into unpremultiplied RGBA bytes for Canvas `putImageData` or PNG export. */
export function resolveSurfaceToRGBA(surface, outRgba, emissiveGain = 1.08) {
  const total = surface.width * surface.height;
  const alb = surface.albedo;
  const emi = surface.emissive;
  for (let i = 0; i < total; i++) {
    const c = alb[i];
    const l = emi[i] & 0xffffff;
    const o = i * 4;
    if (!c && !l) {
      outRgba[o] = 0;
      outRgba[o + 1] = 0;
      outRgba[o + 2] = 0;
      outRgba[o + 3] = 0;
      continue;
    }
    const ca = c >>> 24;
    let r = c & 255;
    let g = (c >>> 8) & 255;
    let b = (c >>> 16) & 255;
    let a = ca;

    if (l) {
      const lr = (l & 255) * emissiveGain;
      const lg = ((l >>> 8) & 255) * emissiveGain;
      const lb = ((l >>> 16) & 255) * emissiveGain;
      if (a === 255) {
        r = Math.min(255, r + lr);
        g = Math.min(255, g + lg);
        b = Math.min(255, b + lb);
      } else {
        const baseA = a / 255;
        const pr = r * baseA + lr;
        const pg = g * baseA + lg;
        const pb = b * baseA + lb;
        const glowA = Math.min(1, Math.max(lr, lg, lb) / 255);
        const finalA = Math.min(1, baseA + glowA * (1 - baseA));
        if (finalA > 0.004) {
          r = Math.min(255, pr / finalA);
          g = Math.min(255, pg / finalA);
          b = Math.min(255, pb / finalA);
          a = Math.round(finalA * 255);
        }
      }
    }

    outRgba[o] = r | 0;
    outRgba[o + 1] = g | 0;
    outRgba[o + 2] = b | 0;
    outRgba[o + 3] = a | 0;
  }
  return outRgba;
}

/**
 * Resolve `surface` into TWO separate multi-layer RGBA buffers:
 *  1. `outAlbedoRgba`: Crisp palette-indexed pixel art (`source-over`)
 *  2. `outEmissiveRgba`: Pure additive HDR bloom + specular core (`lighter`)
 */
export function resolveSurfaceToSplitRGBA(surface, outAlbedoRgba, outEmissiveRgba, emissiveGain = 1.18) {
  const total = surface.width * surface.height;
  const alb = surface.albedo;
  const emi = surface.emissive;
  for (let i = 0; i < total; i++) {
    const c = alb[i];
    const l = emi[i] & 0xffffff;
    const o = i * 4;

    if (!c) {
      outAlbedoRgba[o] = 0;
      outAlbedoRgba[o + 1] = 0;
      outAlbedoRgba[o + 2] = 0;
      outAlbedoRgba[o + 3] = 0;
    } else {
      outAlbedoRgba[o] = c & 255;
      outAlbedoRgba[o + 1] = (c >>> 8) & 255;
      outAlbedoRgba[o + 2] = (c >>> 16) & 255;
      outAlbedoRgba[o + 3] = c >>> 24;
    }

    if (!l && !c) {
      outEmissiveRgba[o] = 0;
      outEmissiveRgba[o + 1] = 0;
      outEmissiveRgba[o + 2] = 0;
      outEmissiveRgba[o + 3] = 0;
      continue;
    }

    let lr = (l & 255) * emissiveGain;
    let lg = ((l >>> 8) & 255) * emissiveGain;
    let lb = ((l >>> 16) & 255) * emissiveGain;

    if (c) {
      const cr = c & 255;
      const cg = (c >>> 8) & 255;
      const cb = (c >>> 16) & 255;
      const ca = (c >>> 24) / 255;
      const peak = Math.max(cr, cg, cb);
      if (peak > 150) {
        const boost = ((peak - 150) / 105) * 0.42 * ca;
        lr += cr * boost;
        lg += cg * boost;
        lb += cb * boost;
      }
    }

    const maxL = Math.max(lr, lg, lb);
    if (maxL < 2) {
      outEmissiveRgba[o] = 0;
      outEmissiveRgba[o + 1] = 0;
      outEmissiveRgba[o + 2] = 0;
      outEmissiveRgba[o + 3] = 0;
    } else {
      const aEmi = Math.min(255, Math.round(maxL));
      const scale = 255 / Math.max(1, aEmi);
      outEmissiveRgba[o] = Math.min(255, Math.round(lr * scale));
      outEmissiveRgba[o + 1] = Math.min(255, Math.round(lg * scale));
      outEmissiveRgba[o + 2] = Math.min(255, Math.round(lb * scale));
      outEmissiveRgba[o + 3] = aEmi;
    }
  }
}

const PIXEL_OUT = { color: 0, alpha: 1, glowColor: 0, glowStrength: 0 };

/**
 * ShaderPen — Draws crisp palette-indexed shapes, Bayer-dithered fades, and radial emissive lights
 * in local effect coordinates (`(0, 0)` at anchor), automatically mirroring and rotating onto integer cells.
 */
export class ShaderPen {
  constructor(surface) {
    this.surface = surface;
    this.w = surface.width;
    this.h = surface.height;
    this.albedo = surface.albedo;
    this.emissive = surface.emissive;
    this.originX = 0;
    this.originY = 0;
    this.mirrorSign = 1;
    this.cosA = 1;
    this.sinA = 0;
    this.masterFade = 1;
    this.bloomScale = 1;
    this.pass = 'front';
  }

  configure(x, y, mirror = false, angleRad = 0, fade = 1, bloomScale = 1) {
    this.originX = x;
    this.originY = y;
    this.mirrorSign = mirror ? -1 : 1;
    this.cosA = Math.cos(angleRad);
    this.sinA = Math.sin(angleRad);
    this.masterFade = fade;
    this.bloomScale = bloomScale;
    return this;
  }

  toScreenX(lx, ly) {
    return this.originX + lx * this.mirrorSign * this.cosA - ly * this.sinA;
  }

  toScreenY(lx, ly) {
    return this.originY + lx * this.mirrorSign * this.sinA + ly * this.cosA;
  }

  toLocalX(sx, sy) {
    const dx = sx - this.originX;
    const dy = sy - this.originY;
    return (dx * this.cosA + dy * this.sinA) * this.mirrorSign;
  }

  toLocalY(sx, sy) {
    const dx = sx - this.originX;
    const dy = sy - this.originY;
    return -dx * this.sinA + dy * this.cosA;
  }

  gridX(lx, ly) {
    return Math.floor(this.toScreenX(Math.floor(lx) + 0.5, Math.floor(ly) + 0.5));
  }

  gridY(lx, ly) {
    return Math.floor(this.toScreenY(Math.floor(lx) + 0.5, Math.floor(ly) + 0.5));
  }

  writeRawStipple(sx, sy, color, alpha = 1) {
    if (!color) return;
    const a = alpha * this.masterFade;
    if (a <= 0) return;
    if (a < 1 && a <= BAYER_THRESHOLD_4X4[((sy & 3) << 2) | (sx & 3)]) return;
    if (sx < 0 || sy < 0 || sx >= this.w || sy >= this.h) return;
    this.albedo[sy * this.w + sx] = color >>> 0;
  }

  writeRawGlow(sx, sy, color, intensity = 1) {
    const k = intensity * this.masterFade * this.bloomScale;
    if (!color || k <= 0.004) return;
    if (sx < 0 || sy < 0 || sx >= this.w || sy >= this.h) return;
    const idx = sy * this.w + sx;
    const cur = this.emissive[idx];
    const r = Math.min(255, (cur & 255) + (color & 255) * k) | 0;
    const g = Math.min(255, ((cur >>> 8) & 255) + ((color >>> 8) & 255) * k) | 0;
    const b = Math.min(255, ((cur >>> 16) & 255) + ((color >>> 16) & 255) * k) | 0;
    this.emissive[idx] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }

  writeRawBlend(sx, sy, color, alpha) {
    const a = clamp01(alpha * this.masterFade);
    if (!color || a <= 0.004) return;
    if (sx < 0 || sy < 0 || sx >= this.w || sy >= this.h) return;
    const idx = sy * this.w + sx;
    const dst = this.albedo[idx];
    const dstA = (dst >>> 24) / 255;
    const outA = a + dstA * (1 - a);
    const wSrc = a / (outA || 1);
    const r = ((color & 255) * wSrc + (dst & 255) * (1 - wSrc)) & 255;
    const g = (((color >>> 8) & 255) * wSrc + ((dst >>> 8) & 255) * (1 - wSrc)) & 255;
    const b = (((color >>> 16) & 255) * wSrc + ((dst >>> 16) & 255) * (1 - wSrc)) & 255;
    this.albedo[idx] = (((Math.round(outA * 255) & 255) << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }

  pixel(lx, ly, color) {
    this.writeRawStipple(this.gridX(lx, ly), this.gridY(lx, ly), color, 1);
  }

  stipple(lx, ly, color, alpha = 1) {
    this.writeRawStipple(this.gridX(lx, ly), this.gridY(lx, ly), color, alpha);
  }

  blend(lx, ly, color, alpha = 0.5) {
    this.writeRawBlend(this.gridX(lx, ly), this.gridY(lx, ly), color, alpha);
  }

  rect(lx, ly, rw, rh, color, alpha = 1) {
    const xEnd = lx + rw;
    const yEnd = ly + rh;
    for (let y = Math.floor(ly); y < yEnd; y++) {
      for (let x = Math.floor(lx); x < xEnd; x++) {
        this.stipple(x, y, color, alpha);
      }
    }
  }

  line(x0, y0, x1, y1, color, alpha = 1) {
    let sx = this.gridX(x0, y0);
    let sy = this.gridY(x0, y0);
    const ex = this.gridX(x1, y1);
    const ey = this.gridY(x1, y1);
    const dx = Math.abs(ex - sx);
    const dy = -Math.abs(ey - sy);
    const stepX = sx < ex ? 1 : -1;
    const stepY = sy < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.writeRawStipple(sx, sy, color, alpha);
      if (sx === ex && sy === ey) break;
      const e2 = err * 2;
      if (e2 >= dy) {
        err += dy;
        sx += stepX;
      }
      if (e2 <= dx) {
        err += dx;
        sy += stepY;
      }
    }
  }

  polyline(pts, color, alpha = 1) {
    for (let i = 1; i < pts.length; i++) {
      this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], color, alpha);
    }
  }

  scanBounds(x0, y0, x1, y1, visitor) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let c = 0; c < 4; c++) {
      const lx = c & 1 ? x1 : x0;
      const ly = c & 2 ? y1 : y0;
      const sx = this.toScreenX(lx, ly);
      const sy = this.toScreenY(lx, ly);
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
    }
    const ix0 = Math.max(0, Math.floor(minX));
    const ix1 = Math.min(this.w - 1, Math.ceil(maxX));
    const iy0 = Math.max(0, Math.floor(minY));
    const iy1 = Math.min(this.h - 1, Math.ceil(maxY));
    for (let sy = iy0; sy <= iy1; sy++) {
      for (let sx = ix0; sx <= ix1; sx++) {
        const cx = sx + 0.5;
        const cy = sy + 0.5;
        visitor(this.toLocalX(cx, cy), this.toLocalY(cx, cy), sx, sy);
      }
    }
  }

  shadeBox(x0, y0, x1, y1, shaderFn) {
    this.scanBounds(x0, y0, x1, y1, (lx, ly, sx, sy) => {
      PIXEL_OUT.color = 0;
      PIXEL_OUT.alpha = 1;
      PIXEL_OUT.glowColor = 0;
      PIXEL_OUT.glowStrength = 0;
      const ret = shaderFn(lx, ly, PIXEL_OUT);
      const col = ret || PIXEL_OUT.color;
      if (col) {
        this.writeRawStipple(sx, sy, col, PIXEL_OUT.alpha);
      }
      if (PIXEL_OUT.glowStrength > 0) {
        this.writeRawGlow(sx, sy, PIXEL_OUT.glowColor || col, PIXEL_OUT.glowStrength);
      }
    });
  }

  fillCircle(cx, cy, radius, color, alpha = 1) {
    if (radius <= 0.4) return;
    if (radius < 1.1) {
      this.stipple(cx, cy, color, alpha);
      return;
    }
    const r2 = radius * radius;
    this.scanBounds(cx - radius - 1, cy - radius - 1, cx + radius + 1, cy + radius + 1, (lx, ly, sx, sy) => {
      const dx = lx - cx;
      const dy = ly - cy;
      if (dx * dx + dy * dy <= r2) {
        this.writeRawStipple(sx, sy, color, alpha);
      }
    });
  }

  strokeRing(cx, cy, radius, thickness, color, alpha = 1) {
    if (radius <= 0.5 || thickness <= 0.1) return;
    const half = Math.max(0.55, thickness * 0.5);
    const rOuter = radius + half;
    const rInner = Math.max(0, radius - half);
    const ro2 = rOuter * rOuter;
    const ri2 = rInner * rInner;
    this.scanBounds(cx - rOuter - 1, cy - rOuter - 1, cx + rOuter + 1, cy + rOuter + 1, (lx, ly, sx, sy) => {
      const dx = lx - cx;
      const dy = ly - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= ri2 && d2 <= ro2) {
        this.writeRawStipple(sx, sy, color, alpha);
      }
    });
  }

  radialGlow(lx, ly, radius, color, strength = 0.5) {
    if (radius <= 0.5 || strength <= 0.005) return;
    const cx = this.toScreenX(lx, ly);
    const cy = this.toScreenY(lx, ly);
    const r = Math.ceil(radius);
    const ix0 = Math.max(0, Math.floor(cx - r));
    const ix1 = Math.min(this.w - 1, Math.ceil(cx + r));
    const iy0 = Math.max(0, Math.floor(cy - r));
    const iy1 = Math.min(this.h - 1, Math.ceil(cy + r));
    const invR = 1 / radius;
    for (let sy = iy0; sy <= iy1; sy++) {
      for (let sx = ix0; sx <= ix1; sx++) {
        const d = Math.hypot(sx + 0.5 - cx, sy + 0.5 - cy) * invR;
        if (d >= 1) continue;
        const falloff = (1 - d) * (1 - d);
        this.writeRawGlow(sx, sy, color, strength * falloff);
      }
    }
  }

  glowRing(cx, cy, radius, bandWidth, color, strength = 0.35) {
    if (radius <= 1 || strength <= 0.005) return;
    const outer = radius + bandWidth;
    const inner = Math.max(0, radius - bandWidth);
    this.scanBounds(cx - outer - 1, cy - outer - 1, cx + outer + 1, cy + outer + 1, (lx, ly, sx, sy) => {
      const d = Math.hypot(lx - cx, ly - cy);
      const distFromRim = Math.abs(d - radius);
      if (distFromRim >= bandWidth || d < inner) return;
      const k = 1 - distFromRim / bandWidth;
      this.writeRawGlow(sx, sy, color, strength * k * k);
    });
  }
}

/** Draw a 2.5D tilted elliptical shock/aura ring, filtering `anglePred(theta)` for `back` vs `front` pass. */
export function drawTiltedOrbitBand(pen, cx, cy, rx, aspectY, thickness, alpha, ramp4, anglePred, flashHot = false) {
  if (rx <= 1 || alpha <= 0.02) return;
  const ry = Math.max(1.2, rx * aspectY);
  const pad = thickness + 2;
  pen.shadeBox(cx - rx - pad, cy - ry - pad, cx + rx + pad, cy + ry + pad, (lx, ly, out) => {
    const dx = lx - cx;
    const dy = (ly - cy) / aspectY;
    const dist = Math.hypot(dx, dy);
    const delta = Math.abs(dist - rx);
    if (delta > thickness) return 0;
    const theta = Math.atan2(ly - cy, dx);
    if (anglePred && !anglePred(theta)) return 0;
    const q = 1 - delta / Math.max(0.6, thickness);
    const turb = fbmNoise2D(lx * 0.14, ly * 0.14, 19, 2);
    if (q < 0.36 && q + turb * 0.18 < 0.24) return 0;
    out.alpha = 1;
    out.glowStrength = 0.28 * q * alpha;
    out.glowColor = ramp4[2];
    if (flashHot && q > 0.48) return PURE_WHITE;
    return q > 0.72 ? ramp4[3] : q > 0.44 ? ramp4[2] : q > 0.22 ? ramp4[1] : ramp4[0];
  });
}

/** Crisp 4-point tapered star-flare + diagonal micro-rays for blade tips, beam muzzles, and reactor bursts. */
export function drawStarburstFlare(pen, cx, cy, radius, alpha, ramp) {
  if (radius <= 0.8 || alpha <= 0.02) return;
  const coreCol = PURE_WHITE;
  const midCol = ramp[Math.min(ramp.length - 1, ramp.length - 2)];
  const outerCol = ramp[Math.max(0, ramp.length - 4)];
  const rInt = Math.ceil(radius);

  for (let i = -rInt; i <= rInt; i++) {
    const u = 1 - Math.abs(i) / radius;
    if (u <= 0) continue;
    const col = u > 0.65 ? coreCol : u > 0.3 ? midCol : outerCol;
    pen.stipple(cx + i, cy, col, alpha * u);
    pen.stipple(cx, cy + i, col, alpha * u);
  }

  const diagR = Math.ceil(radius * 0.52);
  for (let i = -diagR; i <= diagR; i++) {
    const u = 1 - Math.abs(i) / (radius * 0.52);
    if (u <= 0) continue;
    pen.stipple(cx + i, cy + i, midCol, alpha * u * 0.85);
    pen.stipple(cx + i, cy - i, midCol, alpha * u * 0.85);
  }

  pen.fillCircle(cx, cy, Math.max(1.2, radius * 0.16), coreCol, alpha);
  pen.radialGlow(cx, cy, radius * 0.95, midCol, 0.42 * alpha);
}

/**
 * Multi-Layer Procedural ArcaneShaderFX Crescent Slash & Vortex Arc (`drawMultiLayerCrescentArc`).
 * Renders 3 distinct layered passes in a single sweep:
 *  - Layer 1 (Outer Elemental Shroud): FBM-eroded organic elemental wake & outer aura
 *  - Layer 2 (Secondary Echo Smear): Offset inner trailing ribbon that gives depth & motion-blur weight
 *  - Layer 3 (Primary Razor Blade Core): 8-step palette-quantized crescent with pure-white hot rim & FBM tail dissolution
 */
export function drawMultiLayerCrescentArc(
  pen,
  {
    cx = 0,
    cy = 0,
    radius = 28,
    width = 11,
    eccentricity = 0.68,
    headAngle = 0,
    tailAngle = -2.2,
    fade = 1,
    ramp = [],
    seed = 17,
    t = 0,
    flashHot = false
  } = {}
) {
  if (fade <= 0.02 || radius <= 2 || width <= 1 || !ramp.length) return;
  const maxR = radius + width * 1.25 + 4;
  const minY = Math.max(8, maxR * eccentricity + 4);
  const sweepSpan = headAngle - tailAngle;
  if (Math.abs(sweepSpan) < 0.05) return;
  const dir = sweepSpan >= 0 ? 1 : -1;
  const absSpan = Math.abs(sweepSpan);

  const normalizeAngleDelta = (ang, ref) => {
    let d = (ang - ref) * dir;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };

  pen.shadeBox(cx - maxR, cy - minY, cx + maxR, cy + minY, (lx, ly, out) => {
    const dx = lx - cx;
    const dy = (ly - cy) / Math.max(0.22, eccentricity);
    const r = Math.hypot(dx, dy);
    if (r < Math.max(1, radius - width * 1.35) || r > radius + width * 1.15) return 0;

    const ang = Math.atan2(dy, dx);
    // Distance behind headAngle along the sweep direction: `0` at leading tip, `1` at tail
    const behindHead = normalizeAngleDelta(headAngle, ang);
    if (behindHead < 0 || behindHead > absSpan) return 0;
    const uAlong = clamp01(behindHead / Math.max(0.08, absSpan));

    // Pointed blade tip at `uAlong = 0`, widest around `uAlong = 0.22`, tapering to a sharp tail at `uAlong = 1`
    const tipTaper = Math.min(1, uAlong / 0.14);
    const tailTaper = Math.pow(1 - uAlong, 0.78);
    const bladeProfile = tipTaper * tailTaper;
    if (bladeProfile <= 0.04) return 0;

    // Angular streak noise creates serrated pixel-art sword-wind teeth along the arc
    const streakNoise = fbmNoise2D(ang * 7.5 - t * 8, r * 0.12, seed, 2);
    const detailNoise = fbmNoise2D(lx * 0.18 + t * 6, ly * 0.18 - t * 5, seed + 37, 2);

    const halfW = Math.max(0.9, width * 0.44 * bladeProfile * (1 + streakNoise * 0.28));
    const centerShift = streakNoise * 1.35 * uAlong;
    const signedRadial = r - (radius + centerShift);
    const distFromBlade = Math.abs(signedRadial);

    // Layer 3: Primary Razor Crescent Core (biased toward the outer leading rim)
    if (distFromBlade <= halfW) {
      const qCross = 1 - distFromBlade / halfW;
      const serration = (streakNoise * 0.5 + 0.5) * 0.48 + (detailNoise * 0.5 + 0.5) * 0.25;
      if (qCross + serration > uAlong * 0.85) {
        const isOuterEdge = signedRadial >= -halfW * 0.15 && signedRadial <= halfW * 0.55;
        const heat = clamp01(qCross * (1 - uAlong * 0.48) + (isOuterEdge ? 0.26 : 0) + detailNoise * 0.12);
        out.alpha = 1;
        out.glowColor = ramp[Math.min(ramp.length - 1, 5)];
        out.glowStrength = (0.18 + 0.28 * heat) * fade;
        if ((flashHot && heat > 0.62) || (heat > 0.84 && uAlong < 0.32)) return PURE_WHITE;
        const idx = Math.min(ramp.length - 1, Math.max(2, Math.floor(heat * ramp.length)));
        return ramp[idx];
      }
    }

    // Layer 2: Secondary Inner Sonic-Wind Echo Ribbon (separated by a clean gap from the outer blade!)
    const echoRadius = radius - width * 0.58;
    const echoHalfW = Math.max(0.7, width * 0.22 * bladeProfile);
    const distFromEcho = Math.abs(r - echoRadius + streakNoise * 1.2);
    if (uAlong > 0.12 && uAlong < 0.82 && distFromEcho <= echoHalfW) {
      const qEcho = 1 - distFromEcho / echoHalfW;
      if (qEcho + streakNoise * 0.35 > uAlong * 0.65) {
        out.alpha = 1;
        out.glowColor = ramp[Math.min(ramp.length - 1, 4)];
        out.glowStrength = 0.16 * qEcho * fade;
        return qEcho > 0.65 ? ramp[Math.min(ramp.length - 1, 5)] : ramp[Math.min(ramp.length - 1, 3)];
      }
    }

    // Layer 1: Jagged Elemental Slipstream Teeth & Detached Pixel Shards
    const shroudHalfW = width * 0.78 * bladeProfile;
    if (distFromBlade <= shroudHalfW && streakNoise > 0.18) {
      const qShroud = 1 - distFromBlade / shroudHalfW;
      if (qShroud + streakNoise * 0.45 > 0.58 + uAlong * 0.25) {
        out.alpha = 1;
        out.glowColor = ramp[Math.min(ramp.length - 1, 3)];
        out.glowStrength = 0.12 * qShroud * fade;
        return ramp[Math.min(ramp.length - 1, 2)];
      }
    }

    return 0;
  });
}

/**
 * Fixed-timestep particle pool supporting velocity-streaks (`streak`), floor-bouncing sparks (`spark`),
 * glowing plasma orbs (`orb`), and twinkling 4-pixel cross glints (`glint`).
 */
export class MotePool {
  constructor({ rng, sparkRamp, floorY = null } = {}) {
    this.rng = rng || new DeterministicRng(1);
    this.sparkRamp = sparkRamp || [PURE_WHITE];
    this.floorY = floorY;
    this.items = [];
  }

  emit(kind, x, y, vx, vy, maxLife, color = PURE_WHITE, scale = 1, gravity = 280) {
    if (this.items.length >= 180) this.items.shift();
    this.items.push({
      kind,
      x,
      y,
      px: x,
      py: y,
      vx,
      vy,
      age: 0,
      maxLife: Math.max(0.05, maxLife),
      color: typeof color === 'string' ? packHexColor(color) : color,
      scale,
      gravity: kind === 'streak' || kind === 'glint' ? 0 : gravity,
      layer: 'front'
    });
  }

  step(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const m = this.items[i];
      m.age += dt;
      if (m.age >= m.maxLife) {
        this.items.splice(i, 1);
        continue;
      }
      m.px = m.x;
      m.py = m.y;
      m.vy += m.gravity * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.kind === 'spark') {
        m.vx *= 1 - 1.8 * dt;
      }
      if (this.floorY !== null && m.kind === 'spark' && m.y >= this.floorY && m.vy > 0) {
        m.y = this.floorY;
        m.vy = -m.vy * 0.42;
        m.vx *= 0.72;
      }
    }
  }

  render(pen, targetLayer = null) {
    for (let i = 0; i < this.items.length; i++) {
      const m = this.items[i];
      if (targetLayer && m.layer !== targetLayer) continue;
      const u = clamp01(m.age / m.maxLife);
      const fade = 1 - u;

      if (m.kind === 'spark') {
        const cIdx = Math.min(this.sparkRamp.length - 1, Math.floor(u * this.sparkRamp.length));
        const col = m.color || this.sparkRamp[cIdx];
        const tailX = m.x - m.vx * 0.022;
        const tailY = m.y - m.vy * 0.022;
        pen.line(tailX, tailY, m.x, m.y, u < 0.22 ? PURE_WHITE : col, fade);
        pen.radialGlow(m.x, m.y, 3.5, col, 0.22 * fade);
      } else if (m.kind === 'streak') {
        const tailX = m.x - m.vx * 0.032;
        const tailY = m.y - m.vy * 0.032;
        pen.line(tailX, tailY, m.x, m.y, u < 0.35 ? PURE_WHITE : m.color, fade * 0.95);
      } else if (m.kind === 'orb') {
        const r = Math.max(0.6, m.scale * (1 - u * 0.65));
        pen.fillCircle(m.x, m.y, r, u < 0.25 ? PURE_WHITE : m.color, fade);
        pen.radialGlow(m.x, m.y, 4.5 * m.scale, m.color, 0.28 * fade);
      } else if (m.kind === 'glint') {
        const pulse = Math.sin(u * Math.PI);
        pen.stipple(m.x, m.y, PURE_WHITE, pulse);
        pen.stipple(m.x - 1, m.y, m.color, pulse * 0.85);
        pen.stipple(m.x + 1, m.y, m.color, pulse * 0.85);
        pen.stipple(m.x, m.y - 1, m.color, pulse * 0.85);
        pen.stipple(m.x, m.y + 1, m.color, pulse * 0.85);
      }
    }
  }
}

/** Instantiate a shader effect definition `{ duration, loop, defaults, create }` with caller config. */
export function instantiateShaderEffect(def, userCfg = {}) {
  const cfg = { ...(def.defaults || {}), ...userCfg };
  const controller = def.create(cfg);
  const duration = def.duration ?? 1.0;
  const isLoop = Boolean(def.loop);
  const fadeOutWindow = 0.28;
  let elapsed = 0;
  let releaseTime = Infinity;

  return {
    def,
    cfg,
    step(dt) {
      elapsed += dt;
      if (!controller.step) return;
      const subSteps = Math.max(1, Math.ceil(dt * 120 - 1e-9));
      const subDt = dt / subSteps;
      for (let i = 0; i < subSteps; i++) {
        controller.step(subDt, cfg);
      }
    },
    render(pen, pass) {
      const fade = releaseTime === Infinity ? 1 : clamp01(1 - (elapsed - releaseTime) / fadeOutWindow);
      if (fade <= 0.005) return;
      pen.configure(
        cfg.x ?? 0,
        cfg.y ?? 0,
        Boolean(cfg.mirror),
        cfg.angle ?? 0,
        fade,
        cfg.bloom ?? 1.0
      );
      const localT = isLoop ? elapsed % duration : Math.min(elapsed, duration);
      if (pass !== 'front' && controller.renderBack) {
        pen.pass = 'back';
        controller.renderBack(pen, localT, cfg);
      }
      if (pass !== 'back' && controller.renderFront) {
        pen.pass = 'front';
        controller.renderFront(pen, localT, cfg);
      }
    },
    release() {
      if (releaseTime === Infinity) releaseTime = elapsed;
    },
    isFinished() {
      return elapsed - releaseTime >= fadeOutWindow || (!isLoop && elapsed >= duration);
    }
  };
}

/**
 * ArcaneShaderFX — Arena-wide 2.5D (`back` + `front`) pixel-shader VFX runtime for Arcane vs. Steel.
 */
export class ArcaneShaderFX {
  constructor(registry = {}, { pixelScale = 3, viewW = 640, viewH = 420, topRatio = 0.72 } = {}) {
    this.registry = registry;
    this.pixelScale = pixelScale;
    this.viewW = Math.max(640, viewW);
    this.viewH = Math.max(420, viewH);
    this.topRatio = Math.min(0.74, Math.max(0.68, topRatio));

    this.surfaceBack = createPixelSurface(this.viewW, this.viewH);
    this.surfaceFront = createPixelSurface(this.viewW, this.viewH);
    this.penBack = new ShaderPen(this.surfaceBack);
    this.penFront = new ShaderPen(this.surfaceFront);
    this.rgbaBack = new Uint8ClampedArray(this.viewW * this.viewH * 4);
    this.rgbaFront = new Uint8ClampedArray(this.viewW * this.viewH * 4);
    this.albedoRgbaBack = new Uint8ClampedArray(this.viewW * this.viewH * 4);
    this.emissiveRgbaBack = new Uint8ClampedArray(this.viewW * this.viewH * 4);
    this.albedoRgbaFront = new Uint8ClampedArray(this.viewW * this.viewH * 4);
    this.emissiveRgbaFront = new Uint8ClampedArray(this.viewW * this.viewH * 4);

    this.active = [];
    this.worldMotes = [];
    this.rng = new DeterministicRng(733);
    this.seedSeq = 211;
    this.arenaCenterX = 600;
    this.groundWorldY = 580;

    this.backCanvas = null;
    this.backCtx = null;
    this.backImageData = null;
    this.backGlowCanvas = null;
    this.backGlowCtx = null;
    this.backGlowImageData = null;

    this.frontCanvas = null;
    this.frontCtx = null;
    this.frontImageData = null;
    this.frontGlowCanvas = null;
    this.frontGlowCtx = null;
    this.frontGlowImageData = null;

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      this.backCanvas = document.createElement('canvas');
      this.backCanvas.width = this.viewW;
      this.backCanvas.height = this.viewH;
      this.backCtx = this.backCanvas.getContext('2d');
      if (this.backCtx?.createImageData) {
        this.backImageData = this.backCtx.createImageData(this.viewW, this.viewH);
      }

      this.backGlowCanvas = document.createElement('canvas');
      this.backGlowCanvas.width = this.viewW;
      this.backGlowCanvas.height = this.viewH;
      this.backGlowCtx = this.backGlowCanvas.getContext('2d');
      if (this.backGlowCtx?.createImageData) {
        this.backGlowImageData = this.backGlowCtx.createImageData(this.viewW, this.viewH);
      }

      this.frontCanvas = document.createElement('canvas');
      this.frontCanvas.width = this.viewW;
      this.frontCanvas.height = this.viewH;
      this.frontCtx = this.frontCanvas.getContext('2d');
      if (this.frontCtx?.createImageData) {
        this.frontImageData = this.frontCtx.createImageData(this.viewW, this.viewH);
      }

      this.frontGlowCanvas = document.createElement('canvas');
      this.frontGlowCanvas.width = this.viewW;
      this.frontGlowCanvas.height = this.viewH;
      this.frontGlowCtx = this.frontGlowCanvas.getContext('2d');
      if (this.frontGlowCtx?.createImageData) {
        this.frontGlowImageData = this.frontGlowCtx.createImageData(this.viewW, this.viewH);
      }
    }
  }

  computeViewport(centerWorldX = this.arenaCenterX, groundWorldY = this.groundWorldY) {
    const scale = this.pixelScale;
    const worldW = this.viewW * scale;
    const worldH = this.viewH * scale;
    const worldLeft = Math.round((centerWorldX - worldW * 0.5) / scale) * scale;
    const worldTop = Math.round((groundWorldY - worldH * this.topRatio) / scale) * scale;
    return { scale, worldW, worldH, worldLeft, worldTop };
  }

  spawn(effectKey, worldX, worldY, opts = {}) {
    const def = this.registry[effectKey];
    if (!def || !Number.isFinite(worldX) || !Number.isFinite(worldY)) return null;
    if (this.active.length >= 22) {
      this.active.shift();
    }

    const { scale, worldLeft, worldTop } = this.computeViewport();
    const lx = Math.round((worldX - worldLeft) / scale);
    const ly = Math.round((worldY - worldTop) / scale);

    const inst = instantiateShaderEffect(def, {
      x: lx,
      y: ly,
      mirror: Boolean(opts.flip ?? opts.mirror),
      angle: opts.angle ?? 0,
      bloom: opts.light ?? opts.bloom ?? 1.0,
      seed: opts.seed ?? this.seedSeq++,
      ...(opts.palette ? { palette: opts.palette } : {}),
      ...(opts.extra || {})
    });

    if (opts.warmup && opts.warmup > 0) {
      inst.step(opts.warmup);
    }

    const slot = {
      key: effectKey,
      inst,
      worldX,
      worldY,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      follow: opts.follow || null,
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      useGroundY: Boolean(opts.useGroundY),
      maxDuration: opts.maxDuration || null,
      age: 0
    };
    this.active.push(slot);
    return slot;
  }

  /**
   * Emit crisp world-space pixel sparks & star-glints onto the shader surface
   * (used for supersonic projectile wakes, deflections, and impact bursts).
   */
  burst(worldX, worldY, opts = {}) {
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return;
    const count = Math.max(1, Math.min(32, opts.count ?? 8));
    const speedMin = opts.speedMin ?? 40;
    const speedMax = opts.speedMax ?? 150;
    const lifeMin = opts.lifeMin ?? 0.16;
    const lifeMax = opts.lifeMax ?? 0.34;
    const gravity = opts.gravity ?? 90;
    const baseAngle = opts.angle ?? 0;
    const hasDir = typeof opts.angle === 'number';
    const spread = opts.spread ?? Math.PI * 2;
    const palette = Array.isArray(opts.colors) && opts.colors.length > 0 ? opts.colors : ['#ffffff'];

    for (let i = 0; i < count; i++) {
      if (this.worldMotes.length >= 140) {
        this.worldMotes.shift();
      }
      const ang = hasDir
        ? baseAngle + this.rng.between(-spread * 0.5, spread * 0.5)
        : this.rng.between(0, Math.PI * 2);
      const spd = this.rng.between(speedMin, speedMax);
      const rawCol = palette[i % palette.length];
      this.worldMotes.push({
        kind: i % 3 === 0 ? 'glint' : 'spark',
        worldX: worldX + this.rng.between(-4, 4),
        worldY: worldY + this.rng.between(-4, 4),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        age: 0,
        maxLife: Math.max(0.06, this.rng.between(lifeMin, lifeMax)),
        color: typeof rawCol === 'string' ? packHexColor(rawCol) : rawCol,
        gravity
      });
    }
  }

  stopByKey(effectKey) {
    for (let i = 0; i < this.active.length; i++) {
      if (this.active[i].key === effectKey) {
        this.active[i].inst.release();
      }
    }
  }

  clear() {
    this.active.length = 0;
    this.worldMotes.length = 0;
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const clampedDt = Math.min(0.05, dt);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i];
      s.age += clampedDt;
      if (s.follow) {
        const dir = s.follow.facing || 1;
        s.worldX = s.follow.x + s.offsetX * dir;
        s.worldY = (s.useGroundY ? s.follow.groundY : s.follow.y) + s.offsetY;
        s.inst.cfg.mirror = dir < 0;
      } else {
        s.worldX += s.vx * clampedDt;
        s.worldY += s.vy * clampedDt;
      }
      if (s.maxDuration && s.age >= s.maxDuration) {
        s.inst.release();
      }
      s.inst.step(clampedDt);
      if (s.inst.isFinished()) {
        this.active.splice(i, 1);
      }
    }

    for (let i = this.worldMotes.length - 1; i >= 0; i--) {
      const m = this.worldMotes[i];
      m.age += clampedDt;
      if (m.age >= m.maxLife) {
        this.worldMotes.splice(i, 1);
        continue;
      }
      m.vy += m.gravity * clampedDt;
      m.worldX += m.vx * clampedDt;
      m.worldY += m.vy * clampedDt;
      m.vx *= 1 - 1.5 * clampedDt;
    }
  }

  rasterizeLayer(passName, centerWorldX = 600, groundWorldY = 580) {
    this.arenaCenterX = centerWorldX;
    this.groundWorldY = groundWorldY;
    const isBack = passName === 'back';
    const surface = isBack ? this.surfaceBack : this.surfaceFront;
    const pen = isBack ? this.penBack : this.penFront;
    const rgba = isBack ? this.rgbaBack : this.rgbaFront;
    const albedoRgba = isBack ? this.albedoRgbaBack : this.albedoRgbaFront;
    const emissiveRgba = isBack ? this.emissiveRgbaBack : this.emissiveRgbaFront;
    const { scale, worldW, worldH, worldLeft, worldTop } = this.computeViewport(centerWorldX, groundWorldY);

    clearPixelSurface(surface);
    let drewAny = false;
    for (let i = 0; i < this.active.length; i++) {
      const s = this.active[i];
      const lx = Math.round((s.worldX - worldLeft) / scale);
      const ly = Math.round((s.worldY - worldTop) / scale);
      if (lx < -160 || lx > this.viewW + 160 || ly < -160 || ly > this.viewH + 160) continue;
      s.inst.cfg.x = lx;
      s.inst.cfg.y = ly;
      s.inst.render(pen, passName);
      drewAny = true;
    }

    if (!isBack && this.worldMotes.length > 0) {
      pen.configure(0, 0, false, 0, 1, 1.05);
      pen.pass = 'front';
      for (let i = 0; i < this.worldMotes.length; i++) {
        const m = this.worldMotes[i];
        const mx = (m.worldX - worldLeft) / scale;
        const my = (m.worldY - worldTop) / scale;
        if (mx < -8 || mx > this.viewW + 8 || my < -8 || my > this.viewH + 8) continue;
        const u = clamp01(m.age / m.maxLife);
        const fade = 1 - u;
        if (m.kind === 'glint') {
          const pulse = Math.sin(u * Math.PI);
          pen.stipple(mx, my, PURE_WHITE, pulse);
          pen.stipple(mx - 1, my, m.color, pulse * 0.85);
          pen.stipple(mx + 1, my, m.color, pulse * 0.85);
          pen.stipple(mx, my - 1, m.color, pulse * 0.85);
          pen.stipple(mx, my + 1, m.color, pulse * 0.85);
          pen.radialGlow(mx, my, 3.2, m.color, 0.28 * pulse);
        } else {
          const tx = mx - (m.vx * 0.022) / scale;
          const ty = my - (m.vy * 0.022) / scale;
          pen.line(tx, ty, mx, my, u < 0.25 ? PURE_WHITE : m.color, fade);
          pen.radialGlow(mx, my, 3.2, m.color, 0.24 * fade);
        }
        drewAny = true;
      }
    }

    if (drewAny) {
      resolveSurfaceToRGBA(surface, rgba, 1.15);
      resolveSurfaceToSplitRGBA(surface, albedoRgba, emissiveRgba, 1.22);
      const w = this.viewW;
      const h = this.viewH;
      const m = 16;
      for (let y = 0; y < h; y++) {
        const yEdge = Math.min(y, h - 1 - y);
        const fullRow = yEdge < m;
        for (let x = 0; x < w; x++) {
          if (!fullRow && x >= m && x < w - m) {
            x = w - m - 1;
            continue;
          }
          const d = Math.min(yEdge, x, w - 1 - x);
          const u = d <= 0 ? 0 : d / m;
          const k = u * u * (3 - 2 * u);
          const o = (y * w + x) * 4;
          rgba[o + 3] = (rgba[o + 3] * k) | 0;
          albedoRgba[o + 3] = (albedoRgba[o + 3] * k) | 0;
          emissiveRgba[o] = (emissiveRgba[o] * k) | 0;
          emissiveRgba[o + 1] = (emissiveRgba[o + 1] * k) | 0;
          emissiveRgba[o + 2] = (emissiveRgba[o + 2] * k) | 0;
          emissiveRgba[o + 3] = (emissiveRgba[o + 3] * k) | 0;
        }
      }
    }
    return { drewAny, worldLeft, worldTop, worldW, worldH, rgba, albedoRgba, emissiveRgba };
  }

  renderLayer(ctx, passName, centerWorldX = 600, groundWorldY = 580, alpha = 1.0) {
    if ((!this.active.length && !this.worldMotes.length) || !ctx) return;
    const isBack = passName === 'back';
    const canvasEl = isBack ? this.backCanvas : this.frontCanvas;
    const canvasCtx = isBack ? this.backCtx : this.frontCtx;
    const imgData = isBack ? this.backImageData : this.frontImageData;
    const glowCanvasEl = isBack ? this.backGlowCanvas : this.frontGlowCanvas;
    const glowCanvasCtx = isBack ? this.backGlowCtx : this.frontGlowCtx;
    const glowImgData = isBack ? this.backGlowImageData : this.frontGlowImageData;
    if (!canvasEl || !canvasCtx || !imgData) return;

    const { drewAny, worldLeft, worldTop, worldW, worldH, rgba, albedoRgba, emissiveRgba } = this.rasterizeLayer(
      passName,
      centerWorldX,
      groundWorldY
    );
    if (!drewAny) return;

    const prevSmooth = ctx.imageSmoothingEnabled;
    const prevAlpha = ctx.globalAlpha;
    const prevComp = ctx.globalCompositeOperation;
    ctx.imageSmoothingEnabled = false;

    if (glowCanvasEl && glowCanvasCtx && glowImgData) {
      imgData.data.set(albedoRgba);
      canvasCtx.putImageData(imgData, 0, 0);
      glowImgData.data.set(emissiveRgba);
      glowCanvasCtx.putImageData(glowImgData, 0, 0);

      // Multi-Layer Sub-Pass 1: Wide Additive Emissive Under-Bloom (`lighter`)
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = prevAlpha * alpha * 0.48;
      ctx.drawImage(glowCanvasEl, 0, 0, this.viewW, this.viewH, worldLeft - 4, worldTop - 4, worldW + 8, worldH + 8);

      // Multi-Layer Sub-Pass 2: Crisp Stepped Pixel-Art Albedo (`source-over`)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = prevAlpha * alpha;
      ctx.drawImage(canvasEl, 0, 0, this.viewW, this.viewH, worldLeft, worldTop, worldW, worldH);

      // Multi-Layer Sub-Pass 3: Pixel-Aligned Specular Emissive Over-Bloom (`lighter`)
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = prevAlpha * alpha * 0.76;
      ctx.drawImage(glowCanvasEl, 0, 0, this.viewW, this.viewH, worldLeft, worldTop, worldW, worldH);
    } else {
      imgData.data.set(rgba);
      canvasCtx.putImageData(imgData, 0, 0);
      ctx.globalAlpha = prevAlpha * alpha;
      ctx.drawImage(canvasEl, 0, 0, this.viewW, this.viewH, worldLeft, worldTop, worldW, worldH);
    }

    ctx.globalCompositeOperation = prevComp;
    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.globalAlpha = prevAlpha;
  }
}
