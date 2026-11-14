import { PixelForge } from '../engine/PixelForge.js?v=30fps101';

/**
 * Seamless Multi-Plane HD-2D Adventure World Panorama Renderer (`AdventureMapRenderer`)
 *
 * Renders the bespoke "Abyssal Eclipse Pilgrimage" 5-plane panoramic stage across
 * the expanded 9600px (`4 x 2400px` Realms) 2.5D campaign (`X: -inf..+inf`, walkable depth `Z/Y: 442..680`):
 *   - Plane 0 (`0.14x`): Upper Abyssal Star-Cosmos & Nebula Vault (`viewTop .. -240`)
 *   - Plane 1 (`0.26x`): `advVistaPano` (`1620x272`) + Animated Coarse Pixel-Grid Emissive Bloom
 *                        & Stepped Pixel Corona/Waterfall/Viaduct/Magma Shimmer
 *   - Plane 1.5 (`0.70x`): Mid-Chasm Drifting Canyon Mist & Stepped Pixel-Band Atmospheric Veils
 *   - Plane 2 (`0.86x`): `advArchPano` (`3930x272` RGBA, 10 bays) + Multi-Tier Stepped Pixel-Art
 *                        Bloom Halos, Pixel-Staircase Light Rays & Crisp Pixel Cross-Glints
 *                        directly over the painted braziers, lanterns, crystals & sconces
 *                        (zero pasted flame sprites, zero floating wisp orbs, zero radial circles)
 *   - Plane 3 (`1.00x`): `advFloorPano` (`4570x96`, 10 bays) + Emissive Pixel-Grid Floor Bloom
 *                        & Stepped Rune/Reflection/Fissure Pixel Glints across all 9600px
 *   - Plane 4 (`1.24x`): Near-Camera Foreground Vault Spandrels, Hanging Chains & Pixel Motes
 *
 * Strictly zero canvas rotation calls, crisp integer pixel coordinates, subtle additive
 * `'lighter'` pixel-grid bloom (`alpha <= 0.16`), and seamless periodic wrap tiling.
 */

export const ADVENTURE_ROAD_TOP_Y = 436;
export const ADVENTURE_ROAD_BOT_Y = 686;

const SELOUT = '#0d0f1c';

const PANO_SCALE = 2.625;
const PANO_ORIGIN_WORLD_X = -840.0;
const ARCH_WORLD_TOP_Y = Math.round(ADVENTURE_ROAD_TOP_Y - 264 * PANO_SCALE); // -257
const ARCH_WORLD_H = Math.round(272 * PANO_SCALE); // 714 (`-257 .. +457`)
const FLOOR_WORLD_H = Math.round(96 * PANO_SCALE); // 252 (`436 .. 688`)

// Landmark metadata across the expanded 9600px (`4 x 2400px`) campaign
export const ADVENTURE_LANDMARKS = [
  { id: 'eclipse_gatehouse', zone: 0, x: 420, halfW: 148, height: 274, isArtifact: false },
  { id: 'astral_orrery', zone: 0, x: 1180, halfW: 106, height: 236, isArtifact: true },
  { id: 'reliquary_chapel', zone: 0, x: 1940, halfW: 134, height: 248, isArtifact: false },
  { id: 'elven_moonwell', zone: 1, x: 2820, halfW: 150, height: 268, isArtifact: false },
  { id: 'yggdrasil_waygate', zone: 1, x: 3610, halfW: 114, height: 250, isArtifact: true },
  { id: 'starwood_scriptorium', zone: 1, x: 4390, halfW: 128, height: 260, isArtifact: false },
  { id: 'ossuary_mausoleum', zone: 2, x: 5220, halfW: 145, height: 264, isArtifact: false },
  { id: 'soul_reliquary_spire', zone: 2, x: 6010, halfW: 112, height: 258, isArtifact: true },
  { id: 'bone_gate_bastion', zone: 2, x: 6810, halfW: 154, height: 282, isArtifact: false },
  { id: 'demon_forge_citadel', zone: 3, x: 7740, halfW: 154, height: 284, isArtifact: false },
  { id: 'hellfire_crucible_monoliths', zone: 3, x: 8540, halfW: 140, height: 270, isArtifact: true },
  { id: 'abyssal_throne_sanctuary', zone: 3, x: 9335, halfW: 175, height: 296, isArtifact: false }
];

// Stepped pixel-bloom color ramps per Realm light family (`[outerHex, midHex, coreHex]`)
const PIXEL_BLOOM_PALETTES = {
  cyan: ['#0284c7', '#38bdf8', '#e0f2fe'],
  gold: ['#d97706', '#facc15', '#fef9c3'],
  aqua: ['#0d9488', '#2dd4bf', '#ccfbf1'],
  emerald: ['#059669', '#34d399', '#d1fae5'],
  violet: ['#7e22ce', '#c084fc', '#f3e8ff'],
  ember: ['#dc2626', '#fb923c', '#fef08a']
};

// Exact measured emissive light centroids in `adv_arch_pano.png` (`3930x272` art px):
// `[artX, artY, paletteKey, tierSize]` — 0.0px locked onto the painted braziers, lanterns & crystals!
const ARCH_EMISSIVE_ANCHORS = [
  // Zone I: Eclipse Cathedral Braziers & Astral Sconces
  [5, 219, 'cyan', 2],
  [255, 220, 'gold', 2],
  [299, 207, 'gold', 2],
  [344, 206, 'cyan', 2],
  [392, 220, 'cyan', 2],
  [648, 220, 'gold', 2],
  [692, 207, 'gold', 2],
  [737, 206, 'cyan', 2],
  [785, 220, 'cyan', 2],
  [1044, 218, 'gold', 2],
  // Zone II: Cursed Starwood Hanging Crystal Lanterns (`y=113..115`), Painted Spirit Flames & Base Crystals
  [1128, 115, 'aqua', 2],
  [1129, 224, 'emerald', 3],
  [1198, 237, 'aqua', 2],
  [1301, 258, 'emerald', 3],
  [1477, 114, 'aqua', 2],
  [1480, 226, 'emerald', 2],
  [1517, 113, 'aqua', 2],
  [1519, 223, 'aqua', 3],
  [1591, 237, 'aqua', 2],
  [1694, 258, 'emerald', 3],
  [1870, 114, 'aqua', 2],
  [1873, 225, 'aqua', 2],
  // Zone III: Sunken Bone-Gate Violet Crypt Braziers
  [1914, 225, 'violet', 3],
  [2267, 225, 'violet', 3],
  [2311, 226, 'violet', 3],
  // Zone IV: Black Pit Obsidian Cauldrons & Hellfire Sconces
  [2697, 208, 'ember', 3],
  [2749, 221, 'ember', 2],
  [3008, 220, 'ember', 2],
  [3052, 209, 'ember', 2],
  [3090, 207, 'ember', 3],
  [3142, 221, 'ember', 2],
  [3401, 220, 'ember', 2],
  [3445, 209, 'ember', 2],
  [3483, 207, 'ember', 3],
  [3535, 221, 'ember', 2],
  [3792, 221, 'ember', 2],
  // Periodic wrap bridge back to Zone I
  [3879, 206, 'cyan', 2],
  [3922, 221, 'cyan', 2]
];

// Lazy cache for coarse pixel-grid emissive bloom canvases extracted from the painted panoramas
const PIXEL_BLOOM_CACHE = new Map();

function hash2D(ix, iy) {
  let n = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function snapPx(v, unit = 4) {
  return Math.round(v / unit) * unit;
}

function seloutBlock(ctx, x, y, w, h, bodyCol, topCol = null, botCol = null) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 2 || rh <= 2) return;
  ctx.fillStyle = SELOUT;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.fillStyle = bodyCol;
  ctx.fillRect(rx + 1, ry + 1, rw - 2, rh - 2);
  if (topCol && rh >= 5) {
    ctx.fillStyle = topCol;
    ctx.fillRect(rx + 1, ry + 1, rw - 2, 2);
  }
  if (botCol && rh >= 6) {
    ctx.fillStyle = botCol;
    ctx.fillRect(rx + 1, ry + rh - 3, rw - 2, 2);
  }
}

/**
 * Renders a crisp stepped HD-2D pixel-grid diamond/octagonal bloom cluster using integer
 * `fillRect` blocks and `'lighter'` additive blending (zero smooth radial circles/orbs).
 */
function drawSteppedPixelBloom(ctx, wx, wy, palKey, pxUnit, tierSize, alpha) {
  if (alpha <= 0.004) return;
  const pal = PIXEL_BLOOM_PALETTES[palKey] || PIXEL_BLOOM_PALETTES.cyan;
  const u = Math.max(2, pxUnit | 0);
  const cx = snapPx(wx, u);
  const cy = snapPx(wy, u);
  const capped = Math.min(0.14, alpha);

  const rCore = u * (tierSize >= 3 ? 2 : 1);
  const rMid = u * (tierSize >= 3 ? 4 : 3);
  const rOuter = u * (tierSize >= 3 ? 7 : 5);
  const rDiag = u * (tierSize >= 3 ? 5 : 4);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 1. Stepped outer pixel cross + octagonal shoulder blocks
  ctx.fillStyle = pal[0];
  ctx.globalAlpha = capped * 0.42;
  ctx.fillRect(cx - rOuter, cy - rCore, rOuter * 2, rCore * 2);
  ctx.fillRect(cx - rCore, cy - rOuter, rCore * 2, rOuter * 2);
  ctx.fillRect(cx - rDiag, cy - rMid, rDiag * 2, rMid * 2);
  ctx.fillRect(cx - rMid, cy - rDiag, rMid * 2, rDiag * 2);

  // 2. Stepped mid-tier pixel diamond
  ctx.fillStyle = pal[1];
  ctx.globalAlpha = capped * 0.62;
  ctx.fillRect(cx - rMid, cy - rCore, rMid * 2, rCore * 2);
  ctx.fillRect(cx - rCore, cy - rMid, rCore * 2, rMid * 2);
  ctx.fillRect(cx - (rMid - u), cy - (rMid - u), (rMid - u) * 2, (rMid - u) * 2);

  // 3. Crisp bright pixel core block
  ctx.fillStyle = pal[2];
  ctx.globalAlpha = capped * 0.85;
  ctx.fillRect(cx - rCore, cy - u, rCore * 2, u * 2);
  ctx.fillRect(cx - u, cy - rCore, u * 2, rCore * 2);

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Renders a crisp pixel-art `+` cross sparkle (never a round orb) snapped to `pxUnit`.
 */
function drawPixelCrossGlint(ctx, wx, wy, colHex, coreHex, pxUnit, armSteps, alpha) {
  if (alpha <= 0.01) return;
  const u = Math.max(2, pxUnit | 0);
  const cx = snapPx(wx, u);
  const cy = snapPx(wy, u);
  const arm = u * Math.max(1, armSteps | 0);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = colHex;
  ctx.globalAlpha = Math.min(0.16, alpha * 0.68);
  ctx.fillRect(cx - arm, cy, arm * 2 + u, u);
  ctx.fillRect(cx, cy - arm, u, arm * 2 + u);

  ctx.fillStyle = coreHex;
  ctx.globalAlpha = Math.min(0.18, alpha);
  ctx.fillRect(cx, cy, u, u);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Renders a diagonal quantized pixel-staircase light shaft (`pxUnit`-snapped steps) above the background.
 */
function drawPixelStaircaseRay(ctx, topX, topY, stepDx, stepDy, widthPx, steps, colHex, alpha) {
  if (alpha <= 0.004) return;
  const u = 6;
  const rw = snapPx(widthPx, u);
  const rh = snapPx(stepDy + u, u);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = colHex;
  for (let s = 0; s < steps; s++) {
    const fade = Math.sin(((s + 0.5) / steps) * Math.PI);
    ctx.globalAlpha = Math.min(0.065, alpha * fade);
    const sx = snapPx(topX + s * stepDx, u);
    const sy = snapPx(topY + s * stepDy, u);
    ctx.fillRect(sx, sy, rw, rh);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
}

function isImageReadyForBlit(img) {
  if (!img) return false;
  if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
    return Boolean(img.complete && img.naturalWidth > 0);
  }
  return true;
}

/**
 * Extracts and caches a two-tier coarse pixel-grid emissive bloom set (`tight` 1/2-res + `wide` 1/4-res)
 * directly from the painted panorama's bright emissive pixels using a stepped Manhattan pixel kernel
 * (periodic X-wrap, zero Gaussian blur, blitted with `imageSmoothingEnabled = false` so bloom renders
 * as authentic stepped HD-2D pixel blocks hugging the painted background art).
 */
function getEmissivePixelBloomSet(img, cacheKey, srcY, srcH, minLum = 180, minSat = 45, hiLum = 220) {
  if (!isImageReadyForBlit(img)) return null;
  if (PIXEL_BLOOM_CACHE.has(cacheKey)) return PIXEL_BLOOM_CACHE.get(cacheKey);
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;

  const texW = img.naturalWidth || img.width || 0;
  const texH = img.naturalHeight || img.height || 0;
  if (texW <= 0 || texH <= 0 || srcY + srcH > texH) return null;

  try {
    const buildCoarseLayer = (cellDiv, radius, alphaSteps) => {
      const bw = Math.max(1, Math.floor(texW / cellDiv));
      const bh = Math.max(1, Math.floor(srcH / cellDiv));
      const work = document.createElement('canvas');
      work.width = bw;
      work.height = bh;
      const wCtx = work.getContext && work.getContext('2d');
      if (!wCtx || typeof wCtx.getImageData !== 'function' || typeof wCtx.putImageData !== 'function') {
        return null;
      }
      wCtx.imageSmoothingEnabled = false;
      wCtx.drawImage(img, 0, srcY, texW, srcH, 0, 0, bw, bh);

      const srcData = wCtx.getImageData(0, 0, bw, bh).data;
      const emR = new Uint8Array(bw * bh);
      const emG = new Uint8Array(bw * bh);
      const emB = new Uint8Array(bw * bh);
      const emMask = new Uint8Array(bw * bh);

      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const idx = y * bw + x;
          const p = idx * 4;
          const a = srcData[p + 3];
          if (a < 175) continue;
          const r = srcData[p];
          const g = srcData[p + 1];
          const b = srcData[p + 2];
          const lum = Math.max(r, g, b);
          const sat = lum - Math.min(r, g, b);
          if ((lum >= minLum && sat >= minSat) || lum >= hiLum) {
            emMask[idx] = 1;
            emR[idx] = Math.min(255, Math.round(r * 1.16 + 26));
            emG[idx] = Math.min(255, Math.round(g * 1.16 + 26));
            emB[idx] = Math.min(255, Math.round(b * 1.16 + 26));
          }
        }
      }

      const outImg = wCtx.createImageData(bw, bh);
      const out = outImg.data;

      // Stepped Manhattan pixel-diamond dilation with periodic X-wrap (`0` seam discontinuity!)
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const srcIdx = y * bw + x;
          if (!emMask[srcIdx]) continue;
          const sr = emR[srcIdx];
          const sg = emG[srcIdx];
          const sb = emB[srcIdx];

          for (let dy = -radius; dy <= radius; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= bh) continue;
            const ady = dy < 0 ? -dy : dy;
            for (let dx = -radius; dx <= radius; dx++) {
              const adx = dx < 0 ? -dx : dx;
              const manhattan = adx + ady;
              if (manhattan > radius + 1) continue;
              const tier = Math.min(alphaSteps.length - 1, manhattan);
              const candA = alphaSteps[tier];
              if (candA <= 0) continue;

              const nx = (x + dx + bw) % bw;
              const dstP = (ny * bw + nx) * 4;
              if (candA > out[dstP + 3]) {
                out[dstP] = sr;
                out[dstP + 1] = sg;
                out[dstP + 2] = sb;
                out[dstP + 3] = candA;
              } else if (candA === out[dstP + 3]) {
                if (sr > out[dstP]) out[dstP] = sr;
                if (sg > out[dstP + 1]) out[dstP + 1] = sg;
                if (sb > out[dstP + 2]) out[dstP + 2] = sb;
              }
            }
          }
        }
      }

      wCtx.putImageData(outImg, 0, 0);
      return { canvas: work, bw, bh, cellDiv };
    };

    const tight = buildCoarseLayer(2, 3, [255, 182, 116, 62, 28]);
    const wide = buildCoarseLayer(4, 3, [224, 152, 92, 46, 20]);
    const result = tight && wide ? { tight, wide, texW } : null;
    if (result) PIXEL_BLOOM_CACHE.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Seamlessly blits a periodic wrap-around panoramic strip across `[viewLeft .. viewRight]`
 * using synchronized parallax mapping `lx_world = wx - (1 - p) * camX`.
 * Zero seams, zero mirror flips, crisp integer destination coordinates.
 */
function drawWrappedPanorama(
  ctx,
  img,
  srcY,
  srcH,
  parallaxP,
  destY,
  destH,
  camX,
  viewLeft,
  viewRight,
  fallbackTexW
) {
  if (!isImageReadyForBlit(img)) return false;
  const texW = img.naturalWidth || img.width || fallbackTexW;
  if (!texW || texW <= 0) return false;

  const tileWorldW = texW * PANO_SCALE;
  const anchorWorldX = PANO_ORIGIN_WORLD_X + (1 - parallaxP) * camX;
  const firstK = Math.floor((viewLeft - anchorWorldX) / tileWorldW);
  const lastK = Math.ceil((viewRight - anchorWorldX) / tileWorldW);

  const ry = Math.round(destY);
  const rh = Math.round(destH);

  for (let k = firstK; k <= lastK; k++) {
    const tileStartWorldX = anchorWorldX + k * tileWorldW;
    const tileEndWorldX = tileStartWorldX + tileWorldW;
    const clipL = Math.max(viewLeft, tileStartWorldX);
    const clipR = Math.min(viewRight, tileEndWorldX);
    if (clipR <= clipL) continue;

    // Snap source slice to integer art pixels so pixel-art masonry never shimmers!
    const sx0 = Math.max(0, Math.floor((clipL - tileStartWorldX) / PANO_SCALE));
    const sx1 = Math.min(texW, Math.ceil((clipR - tileStartWorldX) / PANO_SCALE));
    const sw = sx1 - sx0;
    if (sw <= 0) continue;

    const dx = Math.round(tileStartWorldX + sx0 * PANO_SCALE);
    const dxNext = Math.round(tileStartWorldX + sx1 * PANO_SCALE);
    const dw = Math.max(1, dxNext - dx);

    ctx.drawImage(img, sx0, srcY, sw, srcH, dx, ry, dw, rh);
  }
  return true;
}

/**
 * Blits a cached coarse pixel-grid bloom layer (`tight` or `wide`) above its matching panorama
 * using Nearest-Neighbor scaling + `'lighter'` additive blending (`alpha <= 0.16`).
 */
function drawWrappedPixelBloomLayer(
  ctx,
  bloomLayer,
  texW,
  parallaxP,
  destY,
  destH,
  camX,
  viewLeft,
  viewRight,
  alpha
) {
  if (!bloomLayer || !bloomLayer.canvas || alpha <= 0.004) return false;
  const { canvas, bw, bh, cellDiv } = bloomLayer;
  const tileWorldW = texW * PANO_SCALE;
  const bloomWorldScale = (texW / bw) * PANO_SCALE || cellDiv * PANO_SCALE;
  const anchorWorldX = PANO_ORIGIN_WORLD_X + (1 - parallaxP) * camX;
  const firstK = Math.floor((viewLeft - anchorWorldX) / tileWorldW);
  const lastK = Math.ceil((viewRight - anchorWorldX) / tileWorldW);

  const ry = Math.round(destY);
  const rh = Math.round(destH);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(0.16, alpha);

  for (let k = firstK; k <= lastK; k++) {
    const tileStartWorldX = anchorWorldX + k * tileWorldW;
    const tileEndWorldX = tileStartWorldX + tileWorldW;
    const clipL = Math.max(viewLeft, tileStartWorldX);
    const clipR = Math.min(viewRight, tileEndWorldX);
    if (clipR <= clipL) continue;

    const sx0 = Math.max(0, Math.floor((clipL - tileStartWorldX) / bloomWorldScale));
    const sx1 = Math.min(bw, Math.ceil((clipR - tileStartWorldX) / bloomWorldScale));
    const sw = sx1 - sx0;
    if (sw <= 0) continue;

    const dx = Math.round(tileStartWorldX + sx0 * bloomWorldScale);
    const dxNext = Math.round(tileStartWorldX + sx1 * bloomWorldScale);
    const dw = Math.max(1, dxNext - dx);

    ctx.drawImage(canvas, sx0, 0, sw, bh, dx, ry, dw, rh);
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
  return true;
}

export class AdventureMapRenderer {
  static getBiomeWeights(wx) {
    const t01 = smoothstep(1920, 2880, wx);
    const t12 = smoothstep(4320, 5280, wx);
    const t23 = smoothstep(6720, 7680, wx);
    return [1 - t01, t01 * (1 - t12), t12 * (1 - t23), t23];
  }

  // ===========================================================================
  // PIXEL-GRID BLOOM & SHIMMER ON PLANE 1 (`0.26x`: Eclipse, Waterfalls, Viaduct & Magma)
  // ===========================================================================
  static renderLiveVistaEffects(ctx, assets, camX, viewLeft, viewRight, t, infernoAlpha) {
    // 1. Coarse Pixel-Grid Panorama Bloom extracted directly from `advVistaPano` (`1620x272`)
    const vistaBloom = getEmissivePixelBloomSet(
      assets?.advVistaPano,
      'advVistaPano_0_272',
      0,
      272,
      175,
      42,
      215
    );
    if (vistaBloom) {
      const breathWide = 0.78 + 0.22 * Math.sin(t * 2.1);
      const breathTight = 0.76 + 0.24 * Math.cos(t * 3.4);
      drawWrappedPixelBloomLayer(
        ctx,
        vistaBloom.wide,
        vistaBloom.texW,
        0.26,
        ARCH_WORLD_TOP_Y,
        ARCH_WORLD_H,
        camX,
        viewLeft,
        viewRight,
        0.10 * breathWide
      );
      drawWrappedPixelBloomLayer(
        ctx,
        vistaBloom.tight,
        vistaBloom.texW,
        0.26,
        ARCH_WORLD_TOP_Y,
        ARCH_WORLD_H,
        camX,
        viewLeft,
        viewRight,
        0.12 * breathTight
      );
    }

    // 2. Synchronized Per-Feature Stepped Pixel-Grid Shimmer & Pixel Cross-Glints (`0.26x` parallax)
    const vistaAnchor = PANO_ORIGIN_WORLD_X + (1 - 0.26) * camX;
    const vistaPeriod = 1620 * PANO_SCALE; // 4252.5
    const firstK = Math.floor((viewLeft - vistaAnchor) / vistaPeriod) - 1;
    const lastK = Math.ceil((viewRight - vistaAnchor) / vistaPeriod) + 1;

    for (let k = firstK; k <= lastK; k++) {
      const baseWx = vistaAnchor + k * vistaPeriod;

      // A. Zone I: Solar Eclipse Stepped Pixel-Rim Corona (`artX = 404, artY = 73`) & Pixel Solar Rays
      const eclipseX = baseWx + 404 * PANO_SCALE;
      const eclipseY = ARCH_WORLD_TOP_Y + 73 * PANO_SCALE; // -65
      if (eclipseX + 380 >= viewLeft && eclipseX - 380 <= viewRight) {
        const rimPal = infernoAlpha > 0.5 ? 'ember' : 'gold';
        const rimR = 57 * PANO_SCALE; // ~150px true painted eclipse rim
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + Math.floor(t * 2.0) * 0.196;
          const rx = eclipseX + Math.cos(ang) * rimR;
          const ry = eclipseY + Math.sin(ang) * rimR;
          const pulse = 0.58 + 0.42 * Math.sin(t * 3.8 + i * 1.3 + k);
          drawSteppedPixelBloom(ctx, rx, ry, i % 3 === 0 ? 'cyan' : rimPal, 5, 2, 0.09 * pulse);
          if ((i + Math.floor(t * 3)) % 2 === 0) {
            drawPixelCrossGlint(ctx, rx, ry, '#fde047', '#ffffff', 4, 2, 0.14 * pulse);
          }
        }
        // Stepped pixel-staircase diagonal eclipse god-rays
        const rayPulse = 0.7 + 0.3 * Math.sin(t * 1.9 + k);
        drawPixelStaircaseRay(ctx, eclipseX - 110, eclipseY + 96, -14, 42, 36, 6, '#fde047', 0.042 * rayPulse);
        drawPixelStaircaseRay(ctx, eclipseX + 74, eclipseY + 96, 14, 42, 36, 6, '#38bdf8', 0.038 * rayPulse);
      }

      // B. Zone II: Starwood Ravine Mist & Cascading Pixel-Stepped Waterfalls (`artX = 544, 652`)
      for (let wf = 0; wf < 2; wf++) {
        const wfArtX = wf === 0 ? 544 : 652;
        const wfX = snapPx(baseWx + wfArtX * PANO_SCALE, 4);
        if (wfX + 140 < viewLeft || wfX - 140 > viewRight) continue;
        const p = 0.72 + 0.28 * Math.sin(t * 3.6 + wf * 1.7);
        drawSteppedPixelBloom(
          ctx,
          wfX,
          ARCH_WORLD_TOP_Y + 201 * PANO_SCALE,
          wf === 0 ? 'cyan' : 'emerald',
          6,
          3,
          0.085 * p
        );
        for (let s = 0; s < 7; s++) {
          const cyc = (t * (0.62 + (s % 3) * 0.12) + s * 0.15 + wf * 0.4) % 1;
          const dx = wfX - 16 + (s % 4) * 10;
          const dy = snapPx(132 + cyc * 264, 4);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.15;
          ctx.fillStyle = s % 2 === 0 ? '#67e8f9' : '#6ee7b7';
          ctx.fillRect(dx, dy, 4, 12);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // C. Zone III: Sunken Violet Necropolis Viaduct Windows (`artX = 823, 848, 906, 927`)
      const cryptVistaPts = [
        [823, 168],
        [848, 177],
        [906, 183],
        [927, 184]
      ];
      for (let sp = 0; sp < cryptVistaPts.length; sp++) {
        const spX = baseWx + cryptVistaPts[sp][0] * PANO_SCALE;
        if (spX + 120 < viewLeft || spX - 120 > viewRight) continue;
        const spY = ARCH_WORLD_TOP_Y + cryptVistaPts[sp][1] * PANO_SCALE;
        const p = 0.68 + 0.32 * Math.sin(t * 3.1 + sp * 1.8);
        drawSteppedPixelBloom(ctx, spX, spY, 'violet', 5, 2, 0.095 * p);
      }

      // D. Zone IV: Black Pit Distant Magma Rivers (`artX = 1147, 1307, 1491, artY = 228`)
      const magmaPts = [1147, 1307, 1491];
      for (let vc = 0; vc < magmaPts.length; vc++) {
        const vcX = baseWx + magmaPts[vc] * PANO_SCALE;
        if (vcX + 160 < viewLeft || vcX - 160 > viewRight) continue;
        const vcY = ARCH_WORLD_TOP_Y + 228 * PANO_SCALE;
        const p = 0.72 + 0.28 * Math.sin(t * 4.6 + vc * 1.9);
        drawSteppedPixelBloom(ctx, vcX, vcY, 'ember', 6, 3, 0.11 * p);
        for (let c = 0; c < 4; c++) {
          const cyc = (t * (0.34 + (c % 2) * 0.11) + c * 0.25 + vc * 0.4) % 1;
          const ex = snapPx(vcX - 24 + c * 16 + Math.sin(t * 2.4 + c) * 8, 4);
          const ey = snapPx(vcY - 8 - cyc * 136, 4);
          drawPixelCrossGlint(ctx, ex, ey, '#fb923c', '#fde047', 3, 1, Math.sin(cyc * Math.PI) * 0.15);
        }
      }
    }
  }

  // ===========================================================================
  // PIXEL-GRID BLOOM, LIGHT RAYS & SHIMMER ABOVE PLANE 2 (`0.86x`, ZERO SPRITE FLAMES / ORBS!)
  // ===========================================================================
  static renderLiveArchEffects(ctx, assets, camX, viewLeft, viewRight, t, infernoAlpha) {
    // 1. Coarse Pixel-Grid Emissive Panorama Bloom extracted directly from `advArchPano` (`3930x272`)
    const archBloom = getEmissivePixelBloomSet(
      assets?.advArchPano,
      'advArchPano_0_272',
      0,
      272,
      182,
      50,
      222
    );
    if (archBloom) {
      const archBreath = 0.80 + 0.20 * Math.sin(t * 3.2);
      const archFlicker = 0.78 + 0.22 * Math.cos(t * 5.6);
      // Quantized 0 or -1 art-pixel upward heat-bloom step (`imageSmoothingEnabled = false`!)
      const riseStepY = Math.sin(t * 4.8) > 0.25 ? -Math.round(PANO_SCALE) : 0;

      drawWrappedPixelBloomLayer(
        ctx,
        archBloom.wide,
        archBloom.texW,
        0.86,
        ARCH_WORLD_TOP_Y,
        ARCH_WORLD_H,
        camX,
        viewLeft,
        viewRight,
        0.115 * archBreath
      );
      drawWrappedPixelBloomLayer(
        ctx,
        archBloom.tight,
        archBloom.texW,
        0.86,
        ARCH_WORLD_TOP_Y + riseStepY,
        ARCH_WORLD_H,
        camX,
        viewLeft,
        viewRight,
        0.135 * archFlicker
      );
    }

    if (infernoAlpha > 0.05 && assets?.advInfernoPano) {
      const infBloom = getEmissivePixelBloomSet(
        assets.advInfernoPano,
        'advInfernoPano_0_272',
        0,
        272,
        175,
        45,
        218
      );
      if (infBloom) {
        drawWrappedPixelBloomLayer(
          ctx,
          infBloom.wide,
          infBloom.texW,
          0.86,
          ARCH_WORLD_TOP_Y,
          ARCH_WORLD_H,
          camX,
          viewLeft,
          viewRight,
          0.13 * Math.min(1, infernoAlpha)
        );
      }
    }

    // 2. Per-Light Out-of-Phase Stepped Pixel-Grid Bloom Clusters & Pixel Cross-Glints
    //    locked onto the exact measured `(artX, artY)` coordinates of `adv_arch_pano.png`!
    const archAnchor = PANO_ORIGIN_WORLD_X + (1 - 0.86) * camX;
    const periodWorld = 3930 * PANO_SCALE; // 10316.25
    const firstK = Math.floor((viewLeft - archAnchor) / periodWorld) - 1;
    const lastK = Math.ceil((viewRight - archAnchor) / periodWorld) + 1;

    for (let k = firstK; k <= lastK; k++) {
      const baseWx = archAnchor + k * periodWorld;

      for (let i = 0; i < ARCH_EMISSIVE_ANCHORS.length; i++) {
        const [artX, artY, basePalKey, tierSize] = ARCH_EMISSIVE_ANCHORS[i];
        const wx = baseWx + artX * PANO_SCALE;
        if (wx + 120 < viewLeft || wx - 120 > viewRight) continue;

        const wy = ARCH_WORLD_TOP_Y + artY * PANO_SCALE;
        const palKey = infernoAlpha > 0.65 ? 'ember' : basePalKey;
        const flick =
          0.66 +
          0.22 * Math.sin(t * (5.2 + (i % 3) * 1.1) + i * 1.73) +
          0.12 * Math.cos(t * 8.4 + i * 2.41);

        // Stepped pixel-diamond bloom halo right over the painted light source
        drawSteppedPixelBloom(ctx, wx, wy, palKey, 5, tierSize, 0.115 * flick);

        // Periodic crisp pixel `+` glint at the heart/tip of the painted light
        const tw = 0.5 + 0.5 * Math.sin(t * 6.2 + i * 2.1);
        if (tw > 0.45) {
          const pal = PIXEL_BLOOM_PALETTES[palKey] || PIXEL_BLOOM_PALETTES.cyan;
          const glintLift = artY < 150 ? 0 : -6;
          drawPixelCrossGlint(ctx, wx, wy + glintLift, pal[1], pal[2], 4, 2, 0.13 * tw);
        }
      }

      // 3. Per-Bay Stepped Pixel-Staircase Volumetric Light Rays & Drifting Pixel Bloom Motes
      for (let b = 0; b < 10; b++) {
        const bayCenterPx = 124 + b * 393;
        const cx = baseWx + bayCenterPx * PANO_SCALE;
        if (cx + 760 < viewLeft || cx - 760 > viewRight) continue;

        const z = infernoAlpha > 0.65 ? 3 : b <= 2 ? 0 : b <= 4 ? 1 : b <= 6 ? 2 : 3;
        const rayBreath = 0.72 + 0.28 * Math.sin(t * 1.85 + b * 1.4);

        if (z === 0) {
          // Zone I: Pixel-stepped cathedral stained-glass rays + rising sanctuary pixel motes
          drawPixelStaircaseRay(ctx, cx - 84, -72, 18, 66, 42, 7, '#7dd3fc', 0.046 * rayBreath);
          drawPixelStaircaseRay(ctx, cx + 48, -54, 18, 66, 36, 6, '#fde047', 0.038 * rayBreath);
          for (let m = 0; m < 5; m++) {
            const cyc = (t * (0.17 + (m % 3) * 0.05) + m * 0.29 + b) % 1;
            const mx = snapPx(cx - 220 + m * 108 + Math.sin(t * 1.5 + m) * 16, 4);
            const my = snapPx(398 - cyc * 336, 4);
            const col = m % 2 === 0 ? '#7dd3fc' : '#fde047';
            drawPixelCrossGlint(ctx, mx, my, col, '#ffffff', 3, 1, Math.sin(cyc * Math.PI) * 0.14);
          }
        } else if (z === 1) {
          // Zone II: Pixel-stepped emerald/aqua Starwood canopy beams + drifting pixel glints
          drawPixelStaircaseRay(ctx, cx - 96, -66, 16, 64, 42, 7, '#2dd4bf', 0.045 * rayBreath);
          drawPixelStaircaseRay(ctx, cx + 64, -48, 16, 64, 36, 6, '#34d399', 0.040 * rayBreath);
          for (let s = 0; s < 6; s++) {
            const cyc = (t * (0.21 + (s % 3) * 0.06) + s * 0.31 + b) % 1;
            const sx = snapPx(cx - 250 + s * 98 + cyc * 48 + Math.sin(t * 2.0 + s) * 16, 4);
            const sy = snapPx(84 + cyc * 326, 4);
            const col = s % 2 === 0 ? '#2dd4bf' : '#34d399';
            drawPixelCrossGlint(ctx, sx, sy, col, '#ecfeff', 3, 1, Math.sin(cyc * Math.PI) * 0.15);
          }
        } else if (z === 2) {
          // Zone III: Amethyst pixel-stepped portcullis moonlight shafts + rising pixel soul-glints
          drawPixelStaircaseRay(ctx, cx - 64, -60, 12, 66, 42, 7, '#c084fc', 0.042 * rayBreath);
          for (let w = 0; w < 5; w++) {
            const cyc = (t * (0.26 + (w % 2) * 0.08) + w * 0.27 + b) % 1;
            const wxM = snapPx(cx - 230 + w * 108 + Math.cos(t * 2.1 + w) * 16, 4);
            const wyM = snapPx(412 - cyc * 332, 4);
            drawPixelCrossGlint(ctx, wxM, wyM, '#c084fc', '#f3e8ff', 3, 1, Math.sin(cyc * Math.PI) * 0.15);
          }
        } else {
          // Zone IV: Stepped molten heat-bloom columns + rising pixel cinders
          drawPixelStaircaseRay(ctx, cx - 72, 42, -10, 58, 42, 6, '#fb923c', 0.044 * rayBreath);
          for (let e = 0; e < 6; e++) {
            const cyc = (t * (0.42 + (e % 3) * 0.10) + e * 0.21 + b) % 1;
            const ex = snapPx(cx - 250 + e * 96 + Math.sin(t * 2.8 + e) * 18, 4);
            const ey = snapPx(422 - cyc * 376, 4);
            const col = e % 2 === 0 ? '#fb923c' : '#ef4444';
            drawPixelCrossGlint(ctx, ex, ey, col, '#fef08a', 3, 1, Math.sin(cyc * Math.PI) * 0.16);
          }
        }
      }
    }
  }

  // ===========================================================================
  // PIXEL-GRID BLOOM & SHIMMER ABOVE PLANE 3 (`1.00x`: Runes, Reflections & Magma Cracks)
  // ===========================================================================
  static renderLiveRoadEffects(ctx, assets, camX, viewLeft, viewRight, t, infernoAlpha) {
    // 1. Coarse Pixel-Grid Emissive Floor Bloom extracted directly from `advFloorPano` (`4570x96`)
    const floorBloom = getEmissivePixelBloomSet(
      assets?.advFloorPano,
      'advFloorPano_0_96',
      0,
      96,
      172,
      44,
      212
    );
    if (floorBloom) {
      const roadPulse = 0.78 + 0.22 * Math.sin(t * 2.9);
      drawWrappedPixelBloomLayer(
        ctx,
        floorBloom.wide,
        floorBloom.texW,
        1.0,
        ADVENTURE_ROAD_TOP_Y,
        FLOOR_WORLD_H,
        camX,
        viewLeft,
        viewRight,
        0.095 * roadPulse
      );
      drawWrappedPixelBloomLayer(
        ctx,
        floorBloom.tight,
        floorBloom.texW,
        1.0,
        ADVENTURE_ROAD_TOP_Y,
        FLOOR_WORLD_H,
        camX,
        viewLeft,
        viewRight,
        0.105 * (0.8 + 0.2 * Math.cos(t * 4.1))
      );
    }

    // 2. Crisp Stepped Pixel-Grid Causeway Specular & Rune Bloom Glints (`0` smooth radial circles!)
    const segSpan = 480;
    const firstSeg = Math.floor(viewLeft / segSpan) - 1;
    const lastSeg = Math.ceil(viewRight / segSpan) + 1;

    for (let s = firstSeg; s <= lastSeg; s++) {
      const baseX = s * segSpan;
      const midX = baseX + 240;
      const z = infernoAlpha > 0.6 ? 3 : midX >= 7100 ? 3 : midX >= 4700 ? 2 : midX >= 2300 ? 1 : 0;
      const pulse = 0.58 + 0.42 * Math.sin(t * 3.4 + s * 1.3);

      if (z === 0) {
        drawSteppedPixelBloom(ctx, baseX + 146, 468, s % 2 === 0 ? 'cyan' : 'gold', 5, 2, 0.065 * pulse);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.13 * pulse;
        ctx.fillStyle = s % 2 === 0 ? '#38bdf8' : '#eab308';
        ctx.fillRect(baseX + 128, 558, 36, 3);
        ctx.fillRect(baseX + 312, 562, 36, 3);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.restore();
      } else if (z === 1) {
        drawSteppedPixelBloom(ctx, baseX + 112, 468, 'emerald', 5, 2, 0.075 * pulse);
        drawSteppedPixelBloom(ctx, baseX + 356, 650, 'aqua', 5, 2, 0.075 * pulse);
      } else if (z === 2) {
        // Stepped pixel-band spectral crypt mist ribbon across the bone-bridge stones
        const driftX = snapPx(baseX + ((t * 26 + s * 97) % segSpan), 6);
        const mistY = 510 + (Math.abs(s) % 3) * 44;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#a855f7';
        ctx.globalAlpha = 0.055 * pulse;
        ctx.fillRect(driftX - 84, mistY, 168, 6);
        ctx.fillRect(driftX - 54, mistY - 6, 108, 6);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.restore();
      } else {
        // Stepped pixel-grid molten obsidian road-fissure bloom + rising pixel sparks
        const hotPulse = 0.64 + 0.36 * Math.sin(t * 5.0 + s * 1.9);
        drawSteppedPixelBloom(ctx, baseX + 132, 490, 'ember', 5, 2, 0.085 * hotPulse);
        drawSteppedPixelBloom(ctx, baseX + 342, 636, 'ember', 5, 2, 0.085 * hotPulse);

        const cyc = (t * 0.72 + (Math.abs(s) % 5) * 0.2) % 1;
        drawPixelCrossGlint(
          ctx,
          baseX + 132,
          488 - cyc * 36,
          '#fb923c',
          '#fde047',
          3,
          1,
          Math.sin(cyc * Math.PI) * 0.14
        );
      }
    }
  }

  // ===========================================================================
  // MAIN BACKGROUND & CAUSEWAY RENDER PASS (Planes 0, 1, 1.5, 2, and 3)
  // ===========================================================================
  static render(ctx, renderer, _ww) {
    const zoom = Math.max(0.35, renderer.zoom || 1);
    const camX = Number.isFinite(renderer.camX) ? renderer.camX : 600;
    const camY = Number.isFinite(renderer.camY) ? renderer.camY : 445;
    const screenAnchorY = renderer.height * (renderer.isMobile ? 0.58 : 0.68);

    const viewLeft = Math.floor(camX - (renderer.width * 0.5) / zoom - 240);
    const viewRight = Math.ceil(camX + (renderer.width * 0.5) / zoom + 240);
    const viewTop = Math.floor(camY - screenAnchorY / zoom - 260);
    const viewBot = Math.ceil(camY + (renderer.height - screenAnchorY) / zoom + 260);
    const viewW = viewRight - viewLeft;

    const isInfernoPerm =
      renderer.permanentStageOverride === 'inferno' ||
      renderer.permanentStageOverride === 'shogunate_inferno';
    const isGlacialPerm =
      renderer.permanentStageOverride === 'glacial' ||
      renderer.permanentStageOverride === 'shogunate_glacial';
    const isShogunatePerm =
      renderer.permanentStageOverride === 'shogunate' ||
      renderer.permanentStageOverride === 'shogunate_glacial';
    const infernoAlpha = isInfernoPerm
      ? 1.0
      : renderer.trueUltStageOverride === 'inferno' ||
          renderer.trueUltStageOverride === 'shogunate_inferno'
        ? Math.max(0, Math.min(1, renderer.trueUltStageAlpha || 0))
        : 0;

    const camWeights = AdventureMapRenderer.getBiomeWeights(camX);
    const t = renderer.time || 0;
    const assets = PixelForge.initAssets();

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // =========================================================================
    // PLANE 0 (`0.14x`): UPPER ABYSSAL COSMOS VAULT (`viewTop .. ARCH_WORLD_TOP_Y + 32`)
    // =========================================================================
    const skyTopY = Math.min(viewTop, -900);
    const skyGrad = ctx.createLinearGradient(0, skyTopY, 0, ADVENTURE_ROAD_TOP_Y);
    skyGrad.addColorStop(
      0,
      infernoAlpha > 0.5 ? '#0c0507' : isGlacialPerm ? '#030918' : isShogunatePerm ? '#050816' : '#04060e'
    );
    skyGrad.addColorStop(
      0.55,
      infernoAlpha > 0.5 ? '#1a0a0d' : isGlacialPerm ? '#071936' : isShogunatePerm ? '#0b1228' : '#080c1a'
    );
    skyGrad.addColorStop(
      1,
      infernoAlpha > 0.5 ? '#261012' : isGlacialPerm ? '#0c284e' : isShogunatePerm ? '#121d38' : '#0d1326'
    );
    ctx.fillStyle = skyGrad;
    ctx.fillRect(viewLeft, skyTopY, viewW, ADVENTURE_ROAD_TOP_Y - skyTopY + 16);

    // Subtle twinkling high-altitude stars above the colonnade (`y < -120`, `0.14x` parallax)
    const starAnchor = (1 - 0.14) * camX;
    const starSpan = 360;
    const firstStar = Math.floor((viewLeft - starAnchor) / starSpan);
    const lastStar = Math.ceil((viewRight - starAnchor) / starSpan);
    for (let sc = firstStar; sc <= lastStar; sc++) {
      for (let i = 0; i < 8; i++) {
        const sy = Math.round(-680 + hash2D(sc, i * 5 + 3) * 520);
        if (sy < viewTop || sy > ARCH_WORLD_TOP_Y + 40) continue;
        const sx = Math.round(starAnchor + sc * starSpan + hash2D(sc, i * 5 + 1) * starSpan);
        const tw = 0.4 + 0.6 * Math.sin(t * (2.1 + (i % 3) * 0.7) + sc + i);
        ctx.globalAlpha = tw * 0.72;
        ctx.fillStyle = i % 3 === 0 ? '#bae6fd' : '#f8fafc';
        ctx.fillRect(sx, sy, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
      }
    }
    ctx.globalAlpha = 1;

    // =========================================================================
    // PLANE 1 (`0.26x`): FAR ABYSSAL ECLIPSE CANYON VISTA (`advVistaPano`, `1620x272`)
    // =========================================================================
    drawWrappedPanorama(
      ctx,
      assets?.advVistaPano,
      0,
      272,
      0.26,
      ARCH_WORLD_TOP_Y,
      ARCH_WORLD_H,
      camX,
      viewLeft,
      viewRight,
      1620
    );

    AdventureMapRenderer.renderLiveVistaEffects(
      ctx,
      assets,
      camX,
      viewLeft,
      viewRight,
      t,
      infernoAlpha
    );

    // Top edge feather blending `advVistaPano` (`ARCH_WORLD_TOP_Y = -257`) into Plane 0 sky vault
    const topBlendGrad = ctx.createLinearGradient(0, ARCH_WORLD_TOP_Y - 6, 0, ARCH_WORLD_TOP_Y + 56);
    topBlendGrad.addColorStop(0, infernoAlpha > 0.5 ? '#15080b' : '#070a16');
    topBlendGrad.addColorStop(1, 'rgba(7, 10, 22, 0)');
    ctx.fillStyle = topBlendGrad;
    ctx.fillRect(viewLeft, ARCH_WORLD_TOP_Y - 8, viewW, 66);

    // =========================================================================
    // PLANE 1.5 (`0.70x`): MID-CHASM DRIFTING CANYON MIST & STEPPED PIXEL-BAND BLOOM VEILS
    // =========================================================================
    const mistR = Math.round(
      26 * camWeights[0] +
        18 * camWeights[1] +
        54 * camWeights[2] +
        78 * camWeights[3] +
        infernoAlpha * 55 +
        (isShogunatePerm ? 18 : 0)
    );
    const mistG = Math.round(
      38 * camWeights[0] +
        64 * camWeights[1] +
        28 * camWeights[2] +
        24 * camWeights[3] +
        (isGlacialPerm ? 28 : 0)
    );
    const mistB = Math.round(
      62 * camWeights[0] +
        68 * camWeights[1] +
        76 * camWeights[2] +
        30 * camWeights[3] +
        (isShogunatePerm ? 26 : 0) +
        (isGlacialPerm ? 42 : 0)
    );
    const canyonMist = ctx.createLinearGradient(0, 175, 0, ADVENTURE_ROAD_TOP_Y + 8);
    canyonMist.addColorStop(0, `rgba(${mistR},${mistG},${mistB},0)`);
    canyonMist.addColorStop(0.62, `rgba(${mistR},${mistG},${mistB},0.16)`);
    canyonMist.addColorStop(1, 'rgba(8, 11, 20, 0.34)');
    ctx.fillStyle = canyonMist;
    ctx.fillRect(viewLeft, 175, viewW, ADVENTURE_ROAD_TOP_Y - 167);

    // Stepped pixel-band atmospheric horizon shimmer (`0` circular radial gradients!)
    const mistAnchor = (1 - 0.70) * camX - t * 18;
    const mistStep = 420;
    const mStart = Math.floor((viewLeft - mistAnchor) / mistStep) - 1;
    const mEnd = Math.ceil((viewRight - mistAnchor) / mistStep) + 1;
    const mistHex =
      infernoAlpha > 0.45 || (camWeights[3] > 0.45 && !isGlacialPerm)
        ? '#fb923c'
        : isGlacialPerm
          ? '#67e8f9'
          : isShogunatePerm
            ? '#fda4af'
            : camWeights[2] > 0.45
              ? '#a855f7'
              : camWeights[1] > 0.45
                ? '#2dd4bf'
                : '#38bdf8';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = mistHex;
    for (let m = mStart; m <= mEnd; m++) {
      const mx = snapPx(mistAnchor + m * mistStep + Math.sin(t * 0.9 + m) * 24, 6);
      const my = snapPx(300 + (Math.abs(m) % 3) * 30, 6);
      const mp = 0.036 + 0.018 * Math.sin(t * 1.6 + m);
      ctx.globalAlpha = mp;
      ctx.fillRect(mx - 108, my, 216, 6);
      ctx.globalAlpha = mp * 0.65;
      ctx.fillRect(mx - 72, my - 6, 144, 6);
      ctx.fillRect(mx - 72, my + 6, 144, 6);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();

    // =========================================================================
    // PLANE 2 (`0.86x`): GOTHIC PILGRIMAGE COLONNADE (`advArchPano`, `3930x272` RGBA)
    // =========================================================================
    drawWrappedPanorama(
      ctx,
      assets?.advArchPano,
      0,
      272,
      0.86,
      ARCH_WORLD_TOP_Y,
      ARCH_WORLD_H,
      camX,
      viewLeft,
      viewRight,
      3930
    );

    if (infernoAlpha > 0.01 && assets?.advInfernoPano) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, infernoAlpha);
      drawWrappedPanorama(
        ctx,
        assets.advInfernoPano,
        0,
        272,
        0.86,
        ARCH_WORLD_TOP_Y,
        ARCH_WORLD_H,
        camX,
        viewLeft,
        viewRight,
        800
      );
      ctx.restore();
    }

    AdventureMapRenderer.renderLiveArchEffects(
      ctx,
      assets,
      camX,
      viewLeft,
      viewRight,
      t,
      infernoAlpha
    );

    // =========================================================================
    // PLANE 3 (`1.00x`): UNBROKEN WALKABLE STONE CAUSEWAY (`advFloorPano`, `4570x96`)
    // =========================================================================
    const floorDrawn = drawWrappedPanorama(
      ctx,
      assets?.advFloorPano,
      0,
      96,
      1.0,
      ADVENTURE_ROAD_TOP_Y,
      FLOOR_WORLD_H,
      camX,
      viewLeft,
      viewRight,
      4570
    );
    if (!floorDrawn) {
      ctx.fillStyle = '#141926';
      ctx.fillRect(viewLeft, ADVENTURE_ROAD_TOP_Y, viewW, ADVENTURE_ROAD_BOT_Y - ADVENTURE_ROAD_TOP_Y);
    }

    if (infernoAlpha > 0.01 && assets?.advInfernoPano) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, infernoAlpha);
      drawWrappedPanorama(
        ctx,
        assets.advInfernoPano,
        264,
        96,
        1.0,
        ADVENTURE_ROAD_TOP_Y,
        FLOOR_WORLD_H,
        camX,
        viewLeft,
        viewRight,
        800
      );
      ctx.restore();
    }

    AdventureMapRenderer.renderLiveRoadEffects(
      ctx,
      assets,
      camX,
      viewLeft,
      viewRight,
      t,
      infernoAlpha
    );

    // Subtle grounded contact occlusion right under the `y = 436` stone curb (`alpha <= 0.24`)
    const curbShadow = ctx.createLinearGradient(0, ADVENTURE_ROAD_TOP_Y - 2, 0, ADVENTURE_ROAD_TOP_Y + 14);
    curbShadow.addColorStop(0, 'rgba(4, 6, 12, 0.24)');
    curbShadow.addColorStop(0.45, 'rgba(4, 6, 12, 0.14)');
    curbShadow.addColorStop(1, 'rgba(4, 6, 12, 0)');
    ctx.fillStyle = curbShadow;
    ctx.fillRect(viewLeft, ADVENTURE_ROAD_TOP_Y - 2, viewW, 16);

    // Right-Side Boss Sanctuary Runic Floor Seal (`x: 8920`) in front of Behemoth Malphas (`x: 9335`)
    const bossSealX = 8920;
    const bossSealY = 561;
    if (bossSealX + 240 > viewLeft && bossSealX - 240 < viewRight) {
      const sealPulse = 0.65 + 0.35 * Math.sin(t * 3.1);
      ctx.save();
      ctx.globalAlpha = 0.22 + 0.08 * sealPulse;
      ctx.strokeStyle = infernoAlpha > 0.4 ? '#fb923c' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(bossSealX, bossSealY, 168, 56, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(bossSealX, bossSealY, 118, 40, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Lower cliffside stone coping & abyssal escarpment below walkable road (`y: 686 .. viewBot`)
    const curbY = ADVENTURE_ROAD_BOT_Y;
    const cliffH = Math.max(140, viewBot - curbY + 40);
    const cliffGrad = ctx.createLinearGradient(0, curbY, 0, curbY + Math.min(480, cliffH));
    cliffGrad.addColorStop(0, infernoAlpha > 0.45 || camWeights[3] > 0.5 ? '#1c0f14' : '#111625');
    cliffGrad.addColorStop(0.28, '#080b14');
    cliffGrad.addColorStop(1, '#03050a');
    ctx.fillStyle = cliffGrad;
    ctx.fillRect(viewLeft, curbY, viewW, cliffH);

    // Crisp continuous carved stone bridge coping lip along `y = 686..704`
    const copingW = 64;
    const cFirst = Math.floor(viewLeft / copingW) - 1;
    const cLast = Math.ceil(viewRight / copingW) + 1;
    for (let c = cFirst; c <= cLast; c++) {
      const cx = c * copingW;
      const isWarm = infernoAlpha > 0.45 || cx >= 7100;
      const isBone = !isWarm && cx >= 4700;
      const isSylv = !isWarm && !isBone && cx >= 2300;
      const topCol = isWarm ? '#5c2b29' : isBone ? '#3f3159' : isSylv ? '#244f4b' : '#2d3b55';
      const bodyCol = isWarm ? '#2b1417' : isBone ? '#211932' : isSylv ? '#142d2c' : '#182132';
      seloutBlock(ctx, cx, curbY, copingW, 20, bodyCol, topCol, '#080b14');
    }

    ctx.restore();
  }

  // ===========================================================================
  // PLANE 4 (`1.24x`): NEAR-CAMERA FOREGROUND PARALLAX FRAMING & PIXEL BLOOM MOTES
  // ===========================================================================
  static renderForegroundDepth(ctx, renderer) {
    const zoom = Math.max(0.35, renderer.zoom || 1);
    const camX = Number.isFinite(renderer.camX) ? renderer.camX : 600;
    const camY = Number.isFinite(renderer.camY) ? renderer.camY : 445;
    const screenAnchorY = renderer.height * (renderer.isMobile ? 0.58 : 0.68);

    const viewLeft = Math.floor(camX - (renderer.width * 0.5) / zoom - 180);
    const viewRight = Math.ceil(camX + (renderer.width * 0.5) / zoom + 180);
    const viewTop = Math.floor(camY - screenAnchorY / zoom - 120);
    const viewBot = Math.ceil(camY + (renderer.height - screenAnchorY) / zoom + 180);

    const fgAnchor = (1 - 1.24) * camX; // -0.24 * camX
    const fgPeriod = 520;
    const firstFg = Math.floor((viewLeft - fgAnchor) / fgPeriod) - 1;
    const lastFg = Math.ceil((viewRight - fgAnchor) / fgPeriod) + 1;
    const t = renderer.time || 0;
    const isInferno =
      renderer.permanentStageOverride === 'inferno' ||
      renderer.permanentStageOverride === 'shogunate_inferno' ||
      ((renderer.trueUltStageOverride === 'inferno' ||
        renderer.trueUltStageOverride === 'shogunate_inferno') &&
        (renderer.trueUltStageAlpha || 0) > 0.5);
    const isShogunate =
      renderer.permanentStageOverride === 'shogunate' ||
      renderer.permanentStageOverride === 'shogunate_glacial';
    const isGlacial =
      renderer.permanentStageOverride === 'glacial' ||
      renderer.permanentStageOverride === 'shogunate_glacial';

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let f = firstFg; f <= lastFg; f++) {
      const fx = Math.round(fgAnchor + f * fgPeriod);
      const z = isInferno ? 3 : fx >= 7100 ? 3 : fx >= 4700 ? 2 : fx >= 2300 ? 1 : 0;

      // 1. Near-Camera Foreground Abyssal Cliff Buttress Silhouette (`y = 690 .. viewBot`)
      const buttW = 92;
      const buttH = Math.max(90, viewBot - 688);
      ctx.fillStyle = 'rgba(5, 7, 14, 0.86)';
      ctx.fillRect(fx - 46, 692, buttW, buttH);
      ctx.fillStyle = 'rgba(22, 30, 48, 0.55)';
      ctx.fillRect(fx - 42, 690, buttW - 8, 5);

      // 2. Drifting Near-Camera Foreground Pixel Cross-Motes / Raining Shogunate Cherry Blossoms (`1.24x` depth)
      const moteCount = isShogunate || isGlacial ? 8 : 4;
      for (let m = 0; m < moteCount; m++) {
        const cyc = (t * (0.18 + (m % 3) * 0.05) + m * 0.17 + Math.abs(f) * 0.19) % 1;
        const mx = snapPx(
          fx -
            220 +
            m * (isShogunate || isGlacial ? 68 : 126) +
            (isShogunate || isGlacial ? cyc * 135 : 0) +
            Math.sin(t * 1.8 + m + f) * 26,
          2
        );
        const my = snapPx(isShogunate || isGlacial || z === 1 ? 80 + cyc * 560 : 640 - cyc * 460, 2);
        if (isShogunate) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.82;
          const ph = (Math.floor(t * 4.8 + m) + m) & 3;
          ctx.fillStyle = isGlacial ? '#0c4a6e' : '#881337';
          ctx.fillRect(mx - 4, my + 1, 7, 2);
          ctx.fillStyle = isGlacial
            ? m % 3 === 0
              ? '#f5d0fe'
              : m % 2 === 0
                ? '#bae6fd'
                : '#67e8f9'
            : m % 3 === 0
              ? '#fbcfe8'
              : m % 2 === 0
                ? '#fda4af'
                : '#fb7185';
          if (ph % 2 === 0) {
            ctx.fillRect(mx - 4, my - 2, 3, 3);
            ctx.fillRect(mx + 1, my - 2, 3, 3);
            ctx.fillRect(mx - 2, my - 1, 4, 3);
          } else {
            ctx.fillRect(mx - 3, my - 2, 6, 3);
            ctx.fillRect(mx - 1, my, 4, 2);
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mx - 2, my - 2, 2, 2);
          ctx.globalAlpha = 1;
          continue;
        }
        const col = isGlacial
          ? m % 3 === 0
            ? '#e879f9'
            : '#67e8f9'
          : z === 3
            ? m % 2 === 0
              ? '#fb923c'
              : '#fde047'
            : z === 2
              ? '#c084fc'
              : z === 1
                ? '#5eead4'
                : '#7dd3fc';
        drawPixelCrossGlint(
          ctx,
          mx,
          my,
          col,
          '#ffffff',
          3,
          1,
          Math.sin(cyc * Math.PI) * (isGlacial ? 0.34 : 0.16)
        );
      }

      // 3. High Overhead Vaulted Chain Silhouette (`y = viewTop .. -56`, visible on high aerial leaps!)
      if (viewTop < -48) {
        const sway = Math.round(Math.sin(t * 1.4 + f * 1.7) * 4);
        const chainTop = Math.min(viewTop, -240);
        for (let ly = chainTop; ly < -56; ly += 14) {
          const u = (ly - chainTop) / Math.max(1, -56 - chainTop);
          const lx = fx + Math.round(sway * u);
          ctx.fillStyle = 'rgba(7, 9, 18, 0.82)';
          ctx.fillRect(lx - 4, ly, 8, 11);
          ctx.fillStyle = 'rgba(56, 72, 102, 0.38)';
          ctx.fillRect(lx - 2, ly + 2, 2, 6);
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
