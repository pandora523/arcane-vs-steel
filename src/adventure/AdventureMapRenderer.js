import { PixelForge } from '../engine/PixelForge.js?v=30fps126';

const CTX_GRAD_CACHE = new WeakMap();

function getCachedVerticalGrad(ctx, slot, y0, y1, stopsKey, buildStops) {
  let map = CTX_GRAD_CACHE.get(ctx);
  if (!map) {
    map = Object.create(null);
    CTX_GRAD_CACHE.set(ctx, map);
  }
  const fullKey = `${slot}|${y0}|${y1}|${stopsKey}`;
  let entry = map[slot];
  if (!entry || entry.key !== fullKey) {
    const grad = ctx.createLinearGradient(0, y0, 0, y1);
    buildStops(grad);
    entry = { key: fullKey, grad };
    map[slot] = entry;
  }
  return entry.grad;
}

/**
 * Seamless Multi-Plane HD-2D Adventure World Panorama Renderer (`AdventureMapRenderer`)
 *
 * Renders the bespoke "Abyssal Eclipse Pilgrimage" 5-plane panoramic stage across
 * the expanded 9600px (`4 x 2400px` Realms) 2.5D campaign (`X: -inf..+inf`, walkable depth `Z/Y: 442..680`):
 *   - Plane 0: Biome-Weighted Darkforge Vault Shadow Fade (`viewTop .. -257`, `0` stars!)
 *   - Plane 1 (`0.26x`): `advVistaPano` (`1620x272`) + `ArcaneShaderFX`-crafted Pixel Overlay
 *                        Eclipse Corona Flares, Cascading Waterfall Foam, Spire Lightning & Volcano Vents
 *   - Plane 1.5 (`0.70x`): Mid-Chasm Drifting Canyon Mist & Stepped Pixel-Band Atmospheric Veils
 *   - Plane 2 (`0.86x`): `advArchPano` (`3930x272` RGBA, 10 bays) + Character-Style `adv_stage_vfx.png`
 *                        Pixel-Art Brazier Flames, Starwood Spirit Plumes, Necrotic Soul-Pyres,
 *                        Hellfire Cauldrons, Sweeping Pixel Wind-Wisps & Rising Pixel Ember Trails
 *   - Plane 3 (`1.00x`): `advFloorPano` (`4570x96`, 10 bays) + Pixel-Grid Floor Bloom, Rune/Wind
 *                        Slipstreams, Ossuary Crypt-Mist Coils, Molten Lava-Fissure Surges & Pixel Boss Seal
 *   - Plane 4 (`1.24x`): Near-Camera Foreground Pixel Wind-Wisps, Hanging Chains & Pixel Motes
 *
 * Strictly zero 3D polygon boxes, zero canvas rotation calls, crisp integer pixel coordinates,
 * subtle additive `'lighter'` pixel-grid bloom (`alpha <= 0.16`), and seamless periodic wrap tiling.
 */

export const ADVENTURE_ROAD_TOP_Y = 436;
export const ADVENTURE_ROAD_BOT_Y = 686;

const SELOUT = '#0d0f1c';

const PANO_SCALE = 2.625;
const PANO_ORIGIN_WORLD_X = -840.0;
const ARCH_WORLD_TOP_Y = Math.round(ADVENTURE_ROAD_TOP_Y - 264 * PANO_SCALE); // -257
const ARCH_WORLD_H = Math.round(272 * PANO_SCALE); // 714 (`-257 .. +457`)
const FLOOR_WORLD_H = Math.round(96 * PANO_SCALE); // 252 (`436 .. 688`)

const STAGE_VFX_CELL = 128;
const STAGE_VFX_COLS = 16;

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

// Exact 1px-ruler-verified emissive light, bowl-lip, lantern & crystal coordinates in `adv_arch_pano.png` (`3930x272`):
// `[centerArtX, glowArtY, paletteKey, tierSize, vfxRow, anchorArtY, worldW, worldH, mode]`
//   - `mode === 'brazier'`: wide-basin roaring flame (`lipRatio = 0.844` = `y_128 = 108`), covers 100% of bowl rim & painted flame!
//   - `mode === 'prism'`:   centered `Row 11` radial crystal/glass-lantern prism pulse (`0` upward fire tongue!)
//   - `mode === 'moonwell'`: skimming `Row 7` luminous water-surface wisp across Starwood Moonwell basins
const ARCH_EMISSIVE_ANCHORS = [
  // Zone I: Eclipse Cathedral Wide-Basin Golden Solar (`Row 0`), Astral Cyan (`Row 1`) & Tall Dual Gold+Cyan (`Row 10`) Braziers
  [5.5, 214, 'cyan', 2, 1, 233, 158, 166, 'brazier'],
  [253.0, 214, 'gold', 2, 0, 233, 158, 166, 'brazier'],
  [302.0, 202, 'gold', 3, 0, 223, 172, 184, 'brazier'],
  [349.0, 202, 'cyan', 3, 10, 223, 172, 184, 'brazier'],
  [398.0, 214, 'cyan', 2, 1, 233, 158, 166, 'brazier'],
  [646.0, 214, 'gold', 2, 0, 233, 158, 166, 'brazier'],
  [695.0, 202, 'gold', 3, 0, 223, 172, 184, 'brazier'],
  [742.0, 202, 'cyan', 3, 10, 223, 172, 184, 'brazier'],
  [791.0, 214, 'cyan', 2, 1, 233, 158, 166, 'brazier'],
  [1039.5, 214, 'gold', 2, 0, 233, 160, 168, 'brazier'],

  // Zone II: Cursed Starwood Closed Hanging Glass Lanterns (`Row 11` prism), Open Spirit Bowls (`Row 2`), Root Crystals (`Row 11`) & Moonwells (`Row 7`)
  [1085.5, 151, 'emerald', 2, 11, 151, 68, 68, 'prism'],
  [1110.5, 107, 'aqua', 2, 11, 107, 52, 52, 'prism'],
  [1125.5, 116, 'aqua', 2, 11, 116, 76, 76, 'prism'],
  [1133.5, 218, 'emerald', 3, 2, 236, 166, 178, 'brazier'],
  [1193.0, 237, 'aqua', 2, 11, 237, 92, 92, 'prism'],
  [1302.0, 260, 'emerald', 3, 7, 266, 160, 78, 'moonwell'],
  [1476.0, 116, 'aqua', 2, 11, 116, 76, 76, 'prism'],
  [1478.5, 220, 'emerald', 2, 2, 236, 156, 166, 'brazier'],
  [1492.0, 106, 'aqua', 2, 11, 106, 52, 52, 'prism'],
  [1504.0, 106, 'aqua', 2, 11, 106, 52, 52, 'prism'],
  [1519.0, 116, 'aqua', 2, 11, 116, 76, 76, 'prism'],
  [1526.5, 218, 'aqua', 3, 2, 236, 166, 178, 'brazier'],
  [1586.0, 237, 'aqua', 2, 11, 237, 92, 92, 'prism'],
  [1695.0, 260, 'emerald', 3, 7, 266, 160, 78, 'moonwell'],
  [1869.0, 116, 'aqua', 2, 11, 116, 76, 76, 'prism'],
  [1872.0, 220, 'aqua', 2, 2, 236, 156, 166, 'brazier'],

  // Zone III: Abyssal Bone-Gate Wide Necrotic Violet Crypt Soul-Pyres (`Row 4`)
  [1915.5, 218, 'violet', 3, 4, 237, 170, 182, 'brazier'],
  [2264.5, 218, 'violet', 3, 4, 237, 168, 180, 'brazier'],
  [2311.5, 218, 'violet', 3, 4, 237, 168, 180, 'brazier'],

  // Zone IV: Black Pit Wide Obsidian Hellfire Cauldrons (`Row 6`, false wall-column anchors removed!)
  [2705.5, 202, 'ember', 3, 6, 223, 174, 186, 'brazier'],
  [2754.5, 214, 'ember', 2, 6, 233, 160, 168, 'brazier'],
  [3004.5, 214, 'ember', 2, 6, 233, 160, 168, 'brazier'],
  [3052.0, 202, 'ember', 3, 6, 223, 174, 186, 'brazier'],
  [3098.5, 202, 'ember', 3, 6, 223, 174, 186, 'brazier'],
  [3147.5, 214, 'ember', 2, 6, 233, 160, 168, 'brazier'],
  [3397.5, 214, 'ember', 2, 6, 233, 160, 168, 'brazier'],
  [3445.0, 202, 'ember', 3, 6, 223, 174, 186, 'brazier'],
  [3491.5, 202, 'ember', 3, 6, 223, 174, 186, 'brazier'],
  [3540.5, 214, 'ember', 2, 6, 233, 160, 168, 'brazier'],
  [3790.5, 214, 'ember', 2, 6, 233, 160, 168, 'brazier'],

  // Periodic Wrap Bridge back to Zone I (tall dual Solar+Cyan Cathedral brazier)
  [3888.5, 202, 'cyan', 3, 10, 223, 172, 184, 'brazier']
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

  const prevComp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  const prevFill = ctx.fillStyle;
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

  ctx.globalCompositeOperation = prevComp;
  ctx.globalAlpha = prevAlpha;
  ctx.fillStyle = prevFill;
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

  const prevComp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  const prevFill = ctx.fillStyle;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = colHex;
  ctx.globalAlpha = Math.min(0.16, alpha * 0.68);
  ctx.fillRect(cx - arm, cy, arm * 2 + u, u);
  ctx.fillRect(cx, cy - arm, u, arm * 2 + u);

  ctx.fillStyle = coreHex;
  ctx.globalAlpha = Math.min(0.18, alpha);
  ctx.fillRect(cx, cy, u, u);
  ctx.globalCompositeOperation = prevComp;
  ctx.globalAlpha = prevAlpha;
  ctx.fillStyle = prevFill;
}

/**
 * Renders a diagonal quantized pixel-staircase light shaft (`pxUnit`-snapped steps) above the background.
 */
function drawPixelStaircaseRay(ctx, topX, topY, stepDx, stepDy, widthPx, steps, colHex, alpha) {
  if (alpha <= 0.004) return;
  const u = 6;
  const rw = snapPx(widthPx, u);
  const rh = snapPx(stepDy + u, u);
  const prevComp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  const prevFill = ctx.fillStyle;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = colHex;
  for (let s = 0; s < steps; s++) {
    const fade = Math.sin(((s + 0.5) / steps) * Math.PI);
    ctx.globalAlpha = Math.min(0.065, alpha * fade);
    const sx = snapPx(topX + s * stepDx, u);
    const sy = snapPx(topY + s * stepDy, u);
    ctx.fillRect(sx, sy, rw, rh);
  }
  ctx.globalCompositeOperation = prevComp;
  ctx.globalAlpha = prevAlpha;
  ctx.fillStyle = prevFill;
}

function isImageReadyForBlit(img) {
  if (!img) return false;
  if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
    return Boolean(img.complete && img.naturalWidth > 0);
  }
  return true;
}

/**
 * Blits a 128x128 `ArcaneShaderFX`-crafted pixel overlay cell from `adv_stage_vfx.png` using the
 * exact dual-pass character VFX technique (`source-over` cel-pixels + `<= 0.16` `'lighter'` bloom,
 * `imageSmoothingEnabled = false`, integer coordinates, `0` `ctx.rotate`!).
 */
function blitStageOverlayPixelCell(
  ctx,
  vfxImg,
  row,
  frameCol,
  dx,
  dy,
  dw,
  dh,
  albedoAlpha = 0.72,
  glowAlpha = 0.14
) {
  if (!isImageReadyForBlit(vfxImg)) return false;
  const col = ((frameCol | 0) % STAGE_VFX_COLS + STAGE_VFX_COLS) % STAGE_VFX_COLS;
  const sx = col * STAGE_VFX_CELL;
  const sy = (row | 0) * STAGE_VFX_CELL;
  const rx = Math.round(dx);
  const ry = Math.round(dy);
  const rw = Math.max(2, Math.round(dw));
  const rh = Math.max(2, Math.round(dh));

  const prevSmooth = ctx.imageSmoothingEnabled;
  const prevComp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  ctx.imageSmoothingEnabled = false;
  if (albedoAlpha > 0.008) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.94, albedoAlpha);
    ctx.drawImage(vfxImg, sx, sy, STAGE_VFX_CELL, STAGE_VFX_CELL, rx, ry, rw, rh);
  }
  if (glowAlpha > 0.006) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.16, glowAlpha);
    ctx.drawImage(vfxImg, sx, sy, STAGE_VFX_CELL, STAGE_VFX_CELL, rx, ry, rw, rh);
  }
  ctx.imageSmoothingEnabled = prevSmooth;
  ctx.globalCompositeOperation = prevComp;
  ctx.globalAlpha = prevAlpha;
  return true;
}

/**
 * Renders a crisp character-VFX-style 2-step rising pixel ember/spore particle (`source-over`
 * integer pixel core + trailing wake block) without smooth radial blurs.
 */
function drawRisingPixelSparkWake(ctx, wx, wy, szPx, coreHex, wakeHex, alpha) {
  if (alpha <= 0.03) return;
  const rx = snapPx(wx, 2);
  const ry = snapPx(wy, 2);
  const sz = Math.max(2, snapPx(szPx, 2));
  const prevComp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  const prevFill = ctx.fillStyle;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = Math.min(0.55, alpha * 0.52);
  ctx.fillStyle = wakeHex;
  ctx.fillRect(rx - 1, ry + sz, Math.max(2, sz - 2), sz + 2);
  ctx.globalAlpha = Math.min(0.92, alpha);
  ctx.fillStyle = coreHex;
  ctx.fillRect(rx - (sz >> 1), ry - (sz >> 1), sz, sz);
  ctx.globalCompositeOperation = prevComp;
  ctx.globalAlpha = prevAlpha;
  ctx.fillStyle = prevFill;
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
      const wCtx =
        work.getContext &&
        (work.getContext('2d', { willReadFrequently: true }) || work.getContext('2d'));
      if (
        !wCtx ||
        typeof wCtx.getImageData !== 'function' ||
        typeof wCtx.createImageData !== 'function' ||
        typeof wCtx.putImageData !== 'function'
      ) {
        work.width = 0;
        work.height = 0;
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
    PIXEL_BLOOM_CACHE.set(cacheKey, result);
    return result;
  } catch {
    PIXEL_BLOOM_CACHE.set(cacheKey, null);
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
  static clearBloomCache() {
    for (const entry of PIXEL_BLOOM_CACHE.values()) {
      if (entry?.tight?.canvas) {
        entry.tight.canvas.width = 0;
        entry.tight.canvas.height = 0;
      }
      if (entry?.wide?.canvas) {
        entry.wide.canvas.width = 0;
        entry.wide.canvas.height = 0;
      }
    }
    PIXEL_BLOOM_CACHE.clear();
  }

  static getBiomeWeights(wx) {
    const t01 = smoothstep(1920, 2880, wx);
    const t12 = smoothstep(4320, 5280, wx);
    const t23 = smoothstep(6720, 7680, wx);
    return [1 - t01, t01 * (1 - t12), t12 * (1 - t23), t23];
  }

  // ===========================================================================
  // PIXEL-GRID BLOOM & CHARACTER-STYLE PIXEL OVERLAYS ON PLANE 1 (`0.26x` VISTA)
  // ===========================================================================
  static renderLiveVistaEffects(
    ctx,
    assets,
    camX,
    viewLeft,
    viewRight,
    t,
    infernoAlpha,
    stageVfx = null,
    isGlacialPerm = false
  ) {
    const vfxSheet = stageVfx || PixelForge.ensureImage(assets?.advStageVfx);

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

    // 2. Synchronized Per-Feature Stepped Pixel-Grid Shimmer & `ArcaneShaderFX` Pixel Overlays (`0.26x`)
    const vistaAnchor = PANO_ORIGIN_WORLD_X + (1 - 0.26) * camX;
    const vistaPeriod = 1620 * PANO_SCALE; // 4252.5
    const firstK = Math.floor((viewLeft - vistaAnchor) / vistaPeriod) - 1;
    const lastK = Math.ceil((viewRight - vistaAnchor) / vistaPeriod) + 1;

    for (let k = firstK; k <= lastK; k++) {
      const baseWx = vistaAnchor + k * vistaPeriod;

      // A. Zone I: Solar Eclipse Stepped Pixel-Rim Corona (`artX = 406, artY = 70, rimR = 44 * PANO_SCALE`)
      const eclipseX = baseWx + 406 * PANO_SCALE;
      const eclipseY = ARCH_WORLD_TOP_Y + 70 * PANO_SCALE; // -73
      if (eclipseX + 380 >= viewLeft && eclipseX - 380 <= viewRight) {
        const rimPal = infernoAlpha > 0.5 ? 'ember' : isGlacialPerm ? 'cyan' : 'gold';
        const rimR = 44 * PANO_SCALE; // 115.5px exact ruler-measured eclipse ring!
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
        // Character-shader pixel prominence tongues hugging the painted eclipse crown (`rimR - 4`)
        const promRow = infernoAlpha > 0.5 ? 6 : isGlacialPerm ? 1 : 0;
        const promAngles = [-2.22, -1.76, -1.38, -0.92];
        for (let pIdx = 0; pIdx < promAngles.length; pIdx++) {
          const ang = promAngles[pIdx];
          const px = eclipseX + Math.cos(ang) * (rimR - 4);
          const py = eclipseY + Math.sin(ang) * (rimR - 4);
          const pRow = pIdx % 2 === 1 && infernoAlpha <= 0.5 ? 10 : promRow;
          const fCol = Math.floor(t * 12 + pIdx * 4 + k * 3);
          blitStageOverlayPixelCell(ctx, vfxSheet, pRow, fCol, px - 36, py - 58, 72, 74, 0.58, 0.12);
        }
        // Periodic pixel lightning corona arc across the eclipse crest (`Row 5`)
        if ((Math.floor(t * 2.4 + Math.abs(k)) % 3) !== 2) {
          const arcCol = Math.floor(t * 16 + k * 5);
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            5,
            arcCol,
            eclipseX - 42,
            eclipseY - rimR - 40,
            84,
            88,
            0.52,
            0.12
          );
        }
        // Stepped pixel-staircase diagonal eclipse god-rays
        const rayPulse = 0.7 + 0.3 * Math.sin(t * 1.9 + k);
        drawPixelStaircaseRay(ctx, eclipseX - 96, eclipseY + 86, -14, 42, 36, 6, '#fde047', 0.042 * rayPulse);
        drawPixelStaircaseRay(ctx, eclipseX + 62, eclipseY + 86, 14, 42, 36, 6, '#38bdf8', 0.038 * rayPulse);
      }

      // B. Zone II: Starwood Ravine Cascading Cliff Waterfalls (exact ruler-verified chutes `447, 493, 552, 642`!)
      const wfChutes = [
        [447, 196, 46, 112],
        [493, 214, 52, 112],
        [552, 226, 56, 104],
        [642, 130, 60, 176],
        [638, 210, 72, 140]
      ];
      for (let wf = 0; wf < wfChutes.length; wf++) {
        const [wfArtX, wfArtY, wfW, wfH] = wfChutes[wf];
        const wfX = snapPx(baseWx + wfArtX * PANO_SCALE, 4);
        if (wfX + 160 < viewLeft || wfX - 160 > viewRight) continue;
        const wfTopY = ARCH_WORLD_TOP_Y + wfArtY * PANO_SCALE;
        const p = 0.72 + 0.28 * Math.sin(t * 3.6 + wf * 1.7);
        drawSteppedPixelBloom(
          ctx,
          wfX,
          wfTopY + wfH * 0.55,
          wf % 2 === 0 ? 'cyan' : 'emerald',
          6,
          3,
          0.08 * p
        );
        // `Row 3` (`WATERFALL_CASCADE_FOAM`) locked 0.0px onto each painted cliff waterfall chute
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          3,
          Math.floor(t * 15 + wf * 5),
          wfX - wfW * 0.5,
          wfTopY - 6,
          wfW,
          wfH,
          0.62,
          0.12
        );
        if (wf !== 3) {
          // Plunge-basin rising pixel mist wisp (`Row 7`) at base of each chute
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            7,
            Math.floor(t * 10 + wf * 7),
            wfX - 58,
            wfTopY + wfH - 34,
            116,
            56,
            0.44,
            0.08
          );
        }
      }

      // C. Zone III: Sunken Violet Necropolis Viaduct Windows & Spire Storm Lightning (`artX = 823..927`)
      const cryptVistaPts = [
        [823, 168],
        [848, 177],
        [906, 183],
        [927, 184]
      ];
      for (let sp = 0; sp < cryptVistaPts.length; sp++) {
        const spX = baseWx + cryptVistaPts[sp][0] * PANO_SCALE;
        if (spX + 140 < viewLeft || spX - 140 > viewRight) continue;
        const spY = ARCH_WORLD_TOP_Y + cryptVistaPts[sp][1] * PANO_SCALE;
        const p = 0.68 + 0.32 * Math.sin(t * 3.1 + sp * 1.8);
        drawSteppedPixelBloom(ctx, spX, spY, 'violet', 5, 2, 0.095 * p);
        if (sp % 2 === 0) {
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            8,
            Math.floor(t * 10 + sp * 4),
            spX - 56,
            spY - 22,
            116,
            70,
            0.52,
            0.10
          );
          const strikeWindow = (t * 0.85 + sp * 0.37 + Math.abs(k) * 0.23) % 1;
          if (strikeWindow < 0.46) {
            blitStageOverlayPixelCell(
              ctx,
              vfxSheet,
              5,
              Math.floor(t * 18 + sp * 5),
              spX - 44,
              spY - 142,
              88,
              118,
              0.62,
              0.14
            );
          }
        }
      }

      // D. Zone IV: Black Pit Volcano Smoking Cones (`artX = 1103..1542`) & Valley Lava Pools (`artY = 228`)
      const volcanoCraters = [
        [1103, 103],
        [1198, 106],
        [1263, 103],
        [1358, 106],
        [1447, 103],
        [1542, 106]
      ];
      for (let cr = 0; cr < volcanoCraters.length; cr++) {
        const crX = baseWx + volcanoCraters[cr][0] * PANO_SCALE;
        if (crX + 90 < viewLeft || crX - 90 > viewRight) continue;
        const crY = ARCH_WORLD_TOP_Y + volcanoCraters[cr][1] * PANO_SCALE;
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          9,
          Math.floor(t * 11 + cr * 3),
          crX - 20,
          crY - 17,
          40,
          30,
          0.58,
          0.10
        );
      }

      const magmaPts = [1152, 1316, 1482];
      for (let vc = 0; vc < magmaPts.length; vc++) {
        const vcX = baseWx + magmaPts[vc] * PANO_SCALE;
        if (vcX + 170 < viewLeft || vcX - 170 > viewRight) continue;
        const vcY = ARCH_WORLD_TOP_Y + 228 * PANO_SCALE;
        const p = 0.72 + 0.28 * Math.sin(t * 4.6 + vc * 1.9);
        drawSteppedPixelBloom(ctx, vcX, vcY, 'ember', 6, 3, 0.10 * p);
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          9,
          Math.floor(t * 13 + vc * 5),
          vcX - 66,
          vcY - 37,
          132,
          66,
          0.66,
          0.12
        );
        if (((t * 0.72 + vc * 0.41) % 1) < 0.34) {
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            5,
            Math.floor(t * 17 + vc * 6),
            vcX - 40,
            vcY - 216,
            80,
            98,
            0.48,
            0.10
          );
        }
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
  // CHARACTER-STYLE PIXEL BRAZIERS, PYRES & WIND OVERLAYS ON PLANE 2 (`0.86x`)
  // ===========================================================================
  static renderLiveArchEffects(
    ctx,
    assets,
    camX,
    viewLeft,
    viewRight,
    t,
    infernoAlpha,
    stageVfx = null,
    isGlacialPerm = false
  ) {
    const vfxSheet = stageVfx || PixelForge.ensureImage(assets?.advStageVfx);

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

    // 2. Per-Fixture `ArcaneShaderFX` Wide-Basin Flames, Prism Lanterns & Moonwells
    //    locked 0.0px onto the ruler-verified coordinates of `adv_arch_pano.png`!
    const archAnchor = PANO_ORIGIN_WORLD_X + (1 - 0.86) * camX;
    const periodWorld = 3930 * PANO_SCALE; // 10316.25
    const firstK = Math.floor((viewLeft - archAnchor) / periodWorld) - 1;
    const lastK = Math.ceil((viewRight - archAnchor) / periodWorld) + 1;

    for (let k = firstK; k <= lastK; k++) {
      const baseWx = archAnchor + k * periodWorld;

      for (let i = 0; i < ARCH_EMISSIVE_ANCHORS.length; i++) {
        const [artX, artY, basePalKey, tierSize, baseVfxRow, anchorArtY, worldW, worldH, mode] =
          ARCH_EMISSIVE_ANCHORS[i];
        const wx = baseWx + artX * PANO_SCALE;
        if (wx + 160 < viewLeft || wx - 160 > viewRight) continue;

        const wy = ARCH_WORLD_TOP_Y + artY * PANO_SCALE;
        const wyAnchor = ARCH_WORLD_TOP_Y + anchorArtY * PANO_SCALE;
        const palKey = infernoAlpha > 0.65 ? 'ember' : isGlacialPerm ? 'cyan' : basePalKey;
        const flick =
          0.68 +
          0.20 * Math.sin(t * (5.2 + (i % 3) * 1.1) + i * 1.73) +
          0.12 * Math.cos(t * 8.4 + i * 2.41);

        drawSteppedPixelBloom(ctx, wx, wy, palKey, 5, tierSize, 0.11 * flick);

        const fps = 13 + (i % 4) * 1.25;
        const frameCol = Math.floor(t * fps + i * 3 + k * 5);

        if (mode === 'moonwell') {
          const mwRow = infernoAlpha > 0.55 ? 9 : 7;
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            mwRow,
            frameCol,
            wx - worldW * 0.5,
            wyAnchor - worldH * 0.58,
            worldW,
            worldH,
            0.66,
            0.12
          );
        } else if (mode === 'prism') {
          // Closed hanging glass lantern or solid root crystal (`Row 11` centered, NO upward flame tongue!)
          const prRow = infernoAlpha > 0.65 ? 9 : 11;
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            prRow,
            frameCol,
            wx - worldW * 0.5,
            wyAnchor - worldH * 0.50,
            worldW,
            worldH,
            0.68,
            0.13
          );
        } else {
          // Wide-Basin Standing Brazier / Spirit Bowl / Soul-Pyre / Hellfire Cauldron (`lip = 0.844`!)
          const vfxRow =
            infernoAlpha > 0.55 ? 6 : isGlacialPerm ? 1 : baseVfxRow;
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            vfxRow,
            frameCol,
            wx - worldW * 0.5,
            wyAnchor - worldH * 0.844,
            worldW,
            worldH,
            0.90,
            0.14
          );

          // 3 character-VFX-style rising pixel sparks/embers across the full basin width
          const pal = PIXEL_BLOOM_PALETTES[palKey] || PIXEL_BLOOM_PALETTES.gold;
          for (let sp = 0; sp < 3; sp++) {
            const sCyc = (t * (0.56 + sp * 0.19) + i * 0.31 + sp * 0.33) % 1;
            const sx =
              wx +
              (sp - 1) * 16 +
              Math.sin(t * 3.4 + i + sp * 2.2) * (10 + sCyc * 12);
            const sy = wyAnchor - 26 - sCyc * 98;
            drawRisingPixelSparkWake(
              ctx,
              sx,
              sy,
              sCyc < 0.45 ? 4 : 2,
              pal[2],
              pal[1],
              Math.sin(sCyc * Math.PI) * 0.86
            );
          }
        }

        const tw = 0.5 + 0.5 * Math.sin(t * 6.2 + i * 2.1);
        if (tw > 0.45) {
          const pal = PIXEL_BLOOM_PALETTES[palKey] || PIXEL_BLOOM_PALETTES.cyan;
          const glintLift = mode === 'prism' ? 0 : -18;
          drawPixelCrossGlint(ctx, wx, wy + glintLift, pal[1], pal[2], 4, 2, 0.13 * tw);
        }
      }

      // 3. Per-Bay Stepped Pixel-Staircase Light Rays & Midground Atmospheric Pixel Streams
      for (let b = 0; b < 10; b++) {
        const bayCenterPx = 124 + b * 393;
        const cx = baseWx + bayCenterPx * PANO_SCALE;
        if (cx + 760 < viewLeft || cx - 760 > viewRight) continue;

        const z = infernoAlpha > 0.65 ? 3 : b <= 2 ? 0 : b <= 4 ? 1 : b <= 6 ? 2 : 3;
        const rayBreath = 0.72 + 0.28 * Math.sin(t * 1.85 + b * 1.4);

        if (z === 0) {
          drawPixelStaircaseRay(ctx, cx - 84, -72, 18, 66, 42, 7, '#7dd3fc', 0.046 * rayBreath);
          drawPixelStaircaseRay(ctx, cx + 48, -54, 18, 66, 36, 6, '#fde047', 0.038 * rayBreath);
          const windX = cx - 220 + ((t * 42 + b * 170) % 440);
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            7,
            Math.floor(t * 11 + b * 3),
            windX - 72,
            216 + (b % 2) * 44,
            144,
            82,
            0.46,
            0.09
          );
          for (let m = 0; m < 5; m++) {
            const cyc = (t * (0.17 + (m % 3) * 0.05) + m * 0.29 + b) % 1;
            const mx = snapPx(cx - 220 + m * 108 + Math.sin(t * 1.5 + m) * 16, 4);
            const my = snapPx(398 - cyc * 336, 4);
            const col = m % 2 === 0 ? '#7dd3fc' : '#fde047';
            drawPixelCrossGlint(ctx, mx, my, col, '#ffffff', 3, 1, Math.sin(cyc * Math.PI) * 0.14);
          }
        } else if (z === 1) {
          drawPixelStaircaseRay(ctx, cx - 96, -66, 16, 64, 42, 7, '#2dd4bf', 0.045 * rayBreath);
          drawPixelStaircaseRay(ctx, cx + 64, -48, 16, 64, 36, 6, '#34d399', 0.040 * rayBreath);
          for (let wIdx = 0; wIdx < 2; wIdx++) {
            const windX = cx - 260 + ((t * (36 + wIdx * 12) + b * 140 + wIdx * 230) % 520);
            blitStageOverlayPixelCell(
              ctx,
              vfxSheet,
              7,
              Math.floor(t * 12 + b * 4 + wIdx * 6),
              windX - 78,
              186 + wIdx * 96,
              156,
              88,
              0.54,
              0.10
            );
          }
          for (let s = 0; s < 6; s++) {
            const cyc = (t * (0.21 + (s % 3) * 0.06) + s * 0.31 + b) % 1;
            const sx = snapPx(cx - 250 + s * 98 + cyc * 48 + Math.sin(t * 2.0 + s) * 16, 4);
            const sy = snapPx(84 + cyc * 326, 4);
            const col = s % 2 === 0 ? '#2dd4bf' : '#34d399';
            drawPixelCrossGlint(ctx, sx, sy, col, '#ecfeff', 3, 1, Math.sin(cyc * Math.PI) * 0.15);
          }
        } else if (z === 2) {
          drawPixelStaircaseRay(ctx, cx - 64, -60, 12, 66, 42, 7, '#c084fc', 0.042 * rayBreath);
          for (let mIdx = 0; mIdx < 2; mIdx++) {
            const mistX = cx - 250 + ((t * (28 + mIdx * 9) + b * 160 + mIdx * 260) % 500);
            blitStageOverlayPixelCell(
              ctx,
              vfxSheet,
              8,
              Math.floor(t * 11 + b * 5 + mIdx * 7),
              mistX - 82,
              256 + mIdx * 68,
              164,
              94,
              0.56,
              0.11
            );
          }
          if (((t * 0.65 + b * 0.41) % 1) < 0.36) {
            blitStageOverlayPixelCell(
              ctx,
              vfxSheet,
              5,
              Math.floor(t * 17 + b * 3),
              cx - 48,
              18,
              96,
              112,
              0.56,
              0.12
            );
          }
          for (let w = 0; w < 5; w++) {
            const cyc = (t * (0.26 + (w % 2) * 0.08) + w * 0.27 + b) % 1;
            const wxM = snapPx(cx - 230 + w * 108 + Math.cos(t * 2.1 + w) * 16, 4);
            const wyM = snapPx(412 - cyc * 332, 4);
            drawPixelCrossGlint(ctx, wxM, wyM, '#c084fc', '#f3e8ff', 3, 1, Math.sin(cyc * Math.PI) * 0.15);
          }
        } else {
          // Zone IV: Molten forge heat-columns + colonnade curb magma surges (`y = 396..444`) + rising pixel cinders
          drawPixelStaircaseRay(ctx, cx - 72, 42, -10, 58, 42, 6, '#fb923c', 0.044 * rayBreath);
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            9,
            Math.floor(t * 13 + b * 4),
            cx - 72,
            396,
            144,
            68,
            0.58,
            0.11
          );
          for (let e = 0; e < 6; e++) {
            const cyc = (t * (0.42 + (e % 3) * 0.10) + e * 0.21 + b) % 1;
            const ex = snapPx(cx - 250 + e * 96 + Math.sin(t * 2.8 + e) * 18, 4);
            const ey = snapPx(422 - cyc * 376, 4);
            const col = e % 2 === 0 ? '#fb923c' : '#ef4444';
            drawPixelCrossGlint(ctx, ex, ey, col, '#fef08a', 3, 1, Math.sin(cyc * Math.PI) * 0.16);
            drawRisingPixelSparkWake(
              ctx,
              ex + 12,
              ey + 10,
              e % 2 === 0 ? 4 : 2,
              '#fef08a',
              col,
              Math.sin(cyc * Math.PI) * 0.78
            );
          }
        }
      }
    }
  }

  // ===========================================================================
  // PIXEL-GRID BLOOM & CHARACTER-STYLE PIXEL OVERLAYS ON PLANE 3 (`1.00x` ROAD)
  // ===========================================================================
  static renderLiveRoadEffects(
    ctx,
    assets,
    camX,
    viewLeft,
    viewRight,
    t,
    infernoAlpha,
    stageVfx = null,
    isGlacialPerm = false
  ) {
    const vfxSheet = stageVfx || PixelForge.ensureImage(assets?.advStageVfx);

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

    // 2. Ruler-Locked Causeway Rune Channels (`y = 483, 551, 663`) & Lava Veins (`y = 496, 567, 615`)!
    const segSpan = 480;
    const firstSeg = Math.floor(viewLeft / segSpan) - 1;
    const lastSeg = Math.ceil(viewRight / segSpan) + 1;

    for (let s = firstSeg; s <= lastSeg; s++) {
      const baseX = s * segSpan;
      const midX = baseX + 240;
      const z = infernoAlpha > 0.6 ? 3 : midX >= 7100 ? 3 : midX >= 4700 ? 2 : midX >= 2300 ? 1 : 0;
      const pulse = 0.58 + 0.42 * Math.sin(t * 3.4 + s * 1.3);

      if (z === 0) {
        drawSteppedPixelBloom(ctx, baseX + 146, 483, s % 2 === 0 ? 'cyan' : 'gold', 5, 2, 0.065 * pulse);
        const slipX = baseX + ((t * 46 + Math.abs(s) * 137) % segSpan);
        const runeY = s % 2 === 0 ? 483 : 551;
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          7,
          Math.floor(t * 12 + Math.abs(s) * 3),
          slipX - 72,
          runeY - 29,
          144,
          58,
          0.44,
          0.08
        );
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.16, 0.13 * pulse);
        ctx.fillStyle = s % 2 === 0 ? '#38bdf8' : '#eab308';
        ctx.fillRect(baseX + 116, 482, 44, 3);
        ctx.fillRect(baseX + 296, 550, 44, 3);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.restore();
      } else if (z === 1) {
        drawSteppedPixelBloom(ctx, baseX + 112, 483, 'emerald', 5, 2, 0.075 * pulse);
        drawSteppedPixelBloom(ctx, baseX + 356, 663, 'aqua', 5, 2, 0.075 * pulse);
        const slipX = baseX + ((t * 38 + Math.abs(s) * 163) % segSpan);
        const sylvY = s % 3 === 0 ? 483 : s % 3 === 1 ? 551 : 663;
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          7,
          Math.floor(t * 11 + Math.abs(s) * 5),
          slipX - 76,
          sylvY - 32,
          152,
          64,
          0.50,
          0.10
        );
      } else if (z === 2) {
        const driftX = snapPx(baseX + ((t * 26 + Math.abs(s) * 97) % segSpan), 6);
        const mistY = 492 + (Math.abs(s) % 3) * 44;
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          8,
          Math.floor(t * 10 + Math.abs(s) * 4),
          driftX - 84,
          mistY - 34,
          168,
          72,
          0.54,
          0.10
        );
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#a855f7';
        ctx.globalAlpha = Math.min(0.16, 0.055 * pulse);
        ctx.fillRect(driftX - 84, mistY, 168, 6);
        ctx.fillRect(driftX - 54, mistY - 6, 108, 6);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.restore();
      } else {
        // Locked 0.0px onto Zone IV's main horizontal lava vein (`y = 567`) & secondary cracks (`y = 496, 615`)!
        const hotPulse = 0.64 + 0.36 * Math.sin(t * 5.0 + s * 1.9);
        drawSteppedPixelBloom(ctx, baseX + 140, 567, 'ember', 5, 2, 0.085 * hotPulse);
        drawSteppedPixelBloom(ctx, baseX + 350, s % 2 === 0 ? 496 : 615, 'ember', 5, 2, 0.085 * hotPulse);

        const surgeRow = isGlacialPerm && infernoAlpha <= 0.5 ? 1 : 9;
        // Row 9 crack line sits at `0.5625` (`36/64`) of cell height -> `567 - 68 * 0.5625 = 529`!
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          surgeRow,
          Math.floor(t * 13 + Math.abs(s) * 3),
          baseX + 72,
          567 - 38,
          136,
          68,
          0.68,
          0.12
        );
        const secVeinY = s % 2 === 0 ? 496 : 615;
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          surgeRow,
          Math.floor(t * 13 + Math.abs(s) * 3 + 7),
          baseX + 286,
          secVeinY - 36,
          128,
          64,
          0.64,
          0.12
        );

        const cyc = (t * 0.72 + (Math.abs(s) % 5) * 0.2) % 1;
        drawPixelCrossGlint(
          ctx,
          baseX + 140,
          567 - cyc * 38,
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
    const zoom = Math.max(0.18, renderer.zoom || 1);
    const camX = Number.isFinite(renderer.camX) ? renderer.camX : 600;
    const camY = Number.isFinite(renderer.camY) ? renderer.camY : 445;
    const screenAnchorY =
      renderer.height *
      (renderer.isMobileLandscape
        ? 0.63
        : renderer.isMobilePortrait
          ? 0.54
          : renderer.isMobile
            ? 0.58
            : 0.68);

    const viewLeft = Math.floor(camX - (renderer.width * 0.5) / zoom - 300);
    const viewRight = Math.ceil(camX + (renderer.width * 0.5) / zoom + 300);
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
    const stageVfx = PixelForge.ensureImage(assets?.advStageVfx);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // =========================================================================
    // PLANE 0: BIOME-WEIGHTED DARKFORGE ATMOSPHERIC SHADOW FADE (`0` STARS!)
    // =========================================================================
    const skyTopY = Math.min(Math.floor(viewTop / 32) * 32, -928);
    let rawAmbR =
      13 * camWeights[0] + 9 * camWeights[1] + 20 * camWeights[2] + 28 * camWeights[3];
    let rawAmbG =
      18 * camWeights[0] + 24 * camWeights[1] + 13 * camWeights[2] + 12 * camWeights[3];
    let rawAmbB =
      32 * camWeights[0] + 24 * camWeights[1] + 30 * camWeights[2] + 14 * camWeights[3];
    if (isGlacialPerm) {
      rawAmbR = rawAmbR * 0.35 + 10 * 0.65;
      rawAmbG = rawAmbG * 0.35 + 26 * 0.65;
      rawAmbB = rawAmbB * 0.35 + 40 * 0.65;
    } else if (isShogunatePerm) {
      rawAmbR = rawAmbR * 0.45 + 14 * 0.55;
      rawAmbG = rawAmbG * 0.45 + 18 * 0.55;
      rawAmbB = rawAmbB * 0.45 + 34 * 0.55;
    }
    if (infernoAlpha > 0) {
      rawAmbR += (34 - rawAmbR) * infernoAlpha;
      rawAmbG += (12 - rawAmbG) * infernoAlpha;
      rawAmbB += (14 - rawAmbB) * infernoAlpha;
    }
    const ambR = Math.round(rawAmbR / 2) * 2;
    const ambG = Math.round(rawAmbG / 2) * 2;
    const ambB = Math.round(rawAmbB / 2) * 2;
    const seamR = Math.round(4 * 0.68 + ambR * 0.32);
    const seamG = Math.round(5 * 0.68 + ambG * 0.32);
    const seamB = Math.round(10 * 0.68 + ambB * 0.32);
    const midVaultR = Math.round(4 * 0.35 + ambR * 0.65);
    const midVaultG = Math.round(5 * 0.35 + ambG * 0.65);
    const midVaultB = Math.round(10 * 0.35 + ambB * 0.65);

    const skySpan = Math.max(1, ADVENTURE_ROAD_TOP_Y - skyTopY);
    const darkCeilStop = Math.max(
      0.04,
      Math.min(0.70, (ARCH_WORLD_TOP_Y - 76 - skyTopY) / skySpan)
    );
    const archSeamStop = Math.max(
      darkCeilStop + 0.02,
      Math.min(0.80, (ARCH_WORLD_TOP_Y - 6 - skyTopY) / skySpan)
    );
    const midVaultStop = Math.max(
      archSeamStop + 0.04,
      Math.min(0.94, (ARCH_WORLD_TOP_Y + 320 - skyTopY) / skySpan)
    );
    const skyGradKey = `${ambR},${ambG},${ambB}`;
    const skyGrad = getCachedVerticalGrad(
      ctx,
      'sky',
      skyTopY,
      ADVENTURE_ROAD_TOP_Y,
      skyGradKey,
      (g) => {
        g.addColorStop(0, '#04050a');
        g.addColorStop(darkCeilStop, '#04050a');
        g.addColorStop(archSeamStop, `rgb(${seamR},${seamG},${seamB})`);
        g.addColorStop(midVaultStop, `rgb(${midVaultR},${midVaultG},${midVaultB})`);
        g.addColorStop(1, `rgb(${ambR},${ambG},${ambB})`);
      }
    );
    ctx.fillStyle = skyGrad;
    ctx.fillRect(viewLeft, skyTopY, viewW, ADVENTURE_ROAD_TOP_Y - skyTopY + 16);

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
      infernoAlpha,
      stageVfx,
      isGlacialPerm
    );

    // Top edge feather blending `advVistaPano` (`ARCH_WORLD_TOP_Y = -257`) into Plane 0 darkforge vault shadow
    const topBlendKey = `${seamR},${seamG},${seamB}`;
    const topBlendGrad = getCachedVerticalGrad(
      ctx,
      'topBlend',
      ARCH_WORLD_TOP_Y - 8,
      ARCH_WORLD_TOP_Y + 58,
      topBlendKey,
      (g) => {
        g.addColorStop(0, `rgb(${seamR},${seamG},${seamB})`);
        g.addColorStop(0.40, `rgba(${seamR},${seamG},${seamB},0.56)`);
        g.addColorStop(1, `rgba(${seamR},${seamG},${seamB},0)`);
      }
    );
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
    const canyonMist = getCachedVerticalGrad(
      ctx,
      'canyonMist',
      175,
      ADVENTURE_ROAD_TOP_Y + 8,
      `${mistR},${mistG},${mistB}`,
      (g) => {
        g.addColorStop(0, `rgba(${mistR},${mistG},${mistB},0)`);
        g.addColorStop(0.62, `rgba(${mistR},${mistG},${mistB},0.16)`);
        g.addColorStop(1, 'rgba(8, 11, 20, 0.34)');
      }
    );
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
      infernoAlpha,
      stageVfx,
      isGlacialPerm
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
      infernoAlpha,
      stageVfx,
      isGlacialPerm
    );

    // Subtle grounded contact occlusion right under the `y = 436` stone curb (`alpha <= 0.24`)
    const curbShadow = getCachedVerticalGrad(
      ctx,
      'curbShadow',
      ADVENTURE_ROAD_TOP_Y - 2,
      ADVENTURE_ROAD_TOP_Y + 14,
      'curb',
      (g) => {
        g.addColorStop(0, 'rgba(4, 6, 12, 0.24)');
        g.addColorStop(0.45, 'rgba(4, 6, 12, 0.14)');
        g.addColorStop(1, 'rgba(4, 6, 12, 0)');
      }
    );
    ctx.fillStyle = curbShadow;
    ctx.fillRect(viewLeft, ADVENTURE_ROAD_TOP_Y - 2, viewW, 16);

    // Pixel-Stepped Boss Sanctuary Runic Floor Seal (`x: 8920`) & Fissure Surges (`0` 3D polygons / vector ellipses!)
    const bossSealX = 8920;
    const bossSealY = 561;
    if (bossSealX + 260 > viewLeft && bossSealX - 260 < viewRight) {
      const sealPulse = 0.65 + 0.35 * Math.sin(t * 3.1);
      const runeHex = isGlacialPerm && infernoAlpha <= 0.4 ? '#38bdf8' : infernoAlpha > 0.4 ? '#fb923c' : '#ef4444';
      const coreHex = isGlacialPerm && infernoAlpha <= 0.4 ? '#e0f2fe' : '#fef08a';

      // Continuous quantized 4px pixel-stepped inlaid rune rings carved into the obsidian causeway
      ctx.save();
      for (let ring = 0; ring < 2; ring++) {
        const rxR = ring === 0 ? 168 : 112;
        const ryR = ring === 0 ? 54 : 36;
        const segs = ring === 0 ? 64 : 44;
        for (let sIdx = 0; sIdx < segs; sIdx++) {
          const ang = (sIdx / segs) * Math.PI * 2;
          const px = snapPx(bossSealX + Math.cos(ang) * rxR, 4);
          const py = snapPx(bossSealY + Math.sin(ang) * ryR, 4);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.52;
          ctx.fillStyle = SELOUT;
          ctx.fillRect(px - 4, py - 2, 8, 5);
          ctx.globalAlpha = 0.36 + 0.22 * sealPulse;
          ctx.fillStyle = runeHex;
          ctx.fillRect(px - 3, py - 1, 6, 3);
          if ((sIdx + Math.floor(t * 6)) % 4 === 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(0.13, 0.09 * sealPulse);
            ctx.fillStyle = coreHex;
            ctx.fillRect(px - 2, py - 1, 4, 2);
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();

      // Foreshortened horizontal pixel fissure surges (`Row 9`) erupting along the inlaid floor seal cracks
      const sealSurgeRow = isGlacialPerm && infernoAlpha <= 0.4 ? 1 : 9;
      blitStageOverlayPixelCell(
        ctx,
        stageVfx,
        sealSurgeRow,
        Math.floor(t * 14),
        bossSealX - 64,
        bossSealY - 32,
        128,
        62,
        0.64,
        0.12
      );
      blitStageOverlayPixelCell(
        ctx,
        stageVfx,
        sealSurgeRow,
        Math.floor(t * 14 + 5),
        bossSealX - 196,
        bossSealY - 26,
        104,
        52,
        0.54,
        0.10
      );
      blitStageOverlayPixelCell(
        ctx,
        stageVfx,
        sealSurgeRow,
        Math.floor(t * 14 + 11),
        bossSealX + 92,
        bossSealY - 26,
        104,
        52,
        0.54,
        0.10
      );
    }

    // Lower cliffside stone coping & abyssal escarpment below walkable road (`y: 686 .. viewBot`)
    const curbY = ADVENTURE_ROAD_BOT_Y;
    const cliffH = Math.max(140, viewBot - curbY + 40);
    const cliffTopHex = infernoAlpha > 0.45 || camWeights[3] > 0.5 ? '#1c0f14' : '#111625';
    const cliffGradEnd = curbY + Math.min(480, cliffH);
    const cliffGrad = getCachedVerticalGrad(ctx, 'cliff', curbY, cliffGradEnd, cliffTopHex, (g) => {
      g.addColorStop(0, cliffTopHex);
      g.addColorStop(0.28, '#080b14');
      g.addColorStop(1, '#03050a');
    });
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
  // PLANE 4 (`1.24x`): NEAR-CAMERA FOREGROUND PARALLAX FRAMING & PIXEL OVERLAYS
  // ===========================================================================
  static renderForegroundDepth(ctx, renderer) {
    const zoom = Math.max(0.18, renderer.zoom || 1);
    const camX = Number.isFinite(renderer.camX) ? renderer.camX : 600;
    const camY = Number.isFinite(renderer.camY) ? renderer.camY : 445;
    const screenAnchorY =
      renderer.height *
      (renderer.isMobileLandscape
        ? 0.63
        : renderer.isMobilePortrait
          ? 0.54
          : renderer.isMobile
            ? 0.58
            : 0.68);

    const viewLeft = Math.floor(camX - (renderer.width * 0.5) / zoom - 220);
    const viewRight = Math.ceil(camX + (renderer.width * 0.5) / zoom + 220);
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

    const assets = PixelForge.initAssets();
    const stageVfx = PixelForge.ensureImage(assets?.advStageVfx);

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

      // 2. Near-Camera `1.24x` Parallax Pixel Wind-Wisp / Crypt-Mist / Chasm-Ember Overlay (`adv_stage_vfx.png`)
      const fgWispRow = isGlacial ? 7 : z === 3 ? 9 : z === 2 ? 8 : 7;
      const fgDriftX = fx - 210 + ((t * 54 + Math.abs(f) * 173) % 420);
      blitStageOverlayPixelCell(
        ctx,
        stageVfx,
        fgWispRow,
        Math.floor(t * 12 + Math.abs(f) * 5),
        fgDriftX - 82,
        636,
        164,
        78,
        0.44,
        0.08
      );

      // 3. Drifting Near-Camera Foreground Pixel Cross-Motes / Raining Shogunate Cherry Blossoms (`1.24x` depth)
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

      // 4. Overhead Vaulted Chain Silhouette anchored strictly under `ARCH_WORLD_TOP_Y` (`y = -248 .. -56`)
      if (viewTop < -48 && z !== 1) {
        const sway = Math.round(Math.sin(t * 1.4 + f * 1.7) * 4);
        const chainTop = Math.max(viewTop, ARCH_WORLD_TOP_Y + 10);
        for (let ly = chainTop; ly < -56; ly += 14) {
          const u = (ly - chainTop) / Math.max(1, -56 - chainTop);
          const topFade = Math.min(1, (ly - (ARCH_WORLD_TOP_Y + 6)) / 42);
          const lx = fx + Math.round(sway * u);
          ctx.globalAlpha = 0.82 * topFade;
          ctx.fillStyle = '#070912';
          ctx.fillRect(lx - 4, ly, 8, 11);
          ctx.globalAlpha = 0.34 * topFade;
          ctx.fillStyle = '#384866';
          ctx.fillRect(lx - 2, ly + 2, 2, 6);
        }
        ctx.globalAlpha = 1;
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

