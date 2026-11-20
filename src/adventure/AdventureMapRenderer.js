import { PixelForge } from '../engine/PixelForge.js?v=30fps194';

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
const SOFT_ATMO_TEX_CACHE = new Map();
const CUSTOM_PANO_CACHE = new Map();
let ACTIVE_CAMPAIGN_PACK = null;

// Soft feathered offscreen atmospheric mist / floor-light-pool / smoke texture specs (`128x128`, 0 vector arc/ellipse)
const SOFT_ATMO_SPECS = {
  gold: ['rgba(254,240,138,0.68)', 'rgba(234,179,8,0.34)', 'rgba(161,98,7,0.08)'],
  cyan: ['rgba(125,211,252,0.64)', 'rgba(14,165,233,0.30)', 'rgba(7,89,133,0.07)'],
  aqua: ['rgba(94,234,212,0.62)', 'rgba(20,184,166,0.28)', 'rgba(13,148,136,0.07)'],
  emerald: ['rgba(110,231,183,0.62)', 'rgba(16,185,129,0.28)', 'rgba(5,150,105,0.07)'],
  violet: ['rgba(216,180,254,0.64)', 'rgba(147,51,234,0.30)', 'rgba(88,28,135,0.07)'],
  ember: ['rgba(253,186,116,0.68)', 'rgba(234,88,12,0.34)', 'rgba(153,27,27,0.08)'],
  crimson: ['rgba(251,113,133,0.62)', 'rgba(225,29,72,0.28)', 'rgba(136,19,55,0.07)'],
  mistCyan: ['rgba(125,211,252,0.44)', 'rgba(56,189,248,0.20)', 'rgba(14,116,144,0.05)'],
  mistTeal: ['rgba(94,234,212,0.44)', 'rgba(20,184,166,0.19)', 'rgba(15,118,110,0.05)'],
  mistViolet: ['rgba(192,132,252,0.44)', 'rgba(126,34,206,0.20)', 'rgba(59,7,100,0.05)'],
  mistEmber: ['rgba(251,146,60,0.46)', 'rgba(194,65,12,0.20)', 'rgba(124,45,18,0.05)'],
  mistRose: ['rgba(251,164,185,0.42)', 'rgba(244,114,182,0.18)', 'rgba(136,19,55,0.05)'],
  smokeDark: ['rgba(20,10,12,0.74)', 'rgba(15,8,10,0.40)', 'rgba(10,5,8,0.10)'],
  bossHaze: ['rgba(127,29,29,0.56)', 'rgba(69,10,10,0.28)', 'rgba(24,6,12,0.07)']
};

function getSoftAtmoTex(key) {
  const k = Object.prototype.hasOwnProperty.call(SOFT_ATMO_SPECS, key) ? key : 'cyan';
  if (SOFT_ATMO_TEX_CACHE.has(k)) return SOFT_ATMO_TEX_CACHE.get(k);
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  try {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const gCtx = c.getContext && c.getContext('2d');
    if (!gCtx || typeof gCtx.createRadialGradient !== 'function') {
      SOFT_ATMO_TEX_CACHE.set(k, null);
      return null;
    }
    const [hot, mid, outer] = SOFT_ATMO_SPECS[k];
    const grad = gCtx.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, hot);
    grad.addColorStop(0.34, mid);
    grad.addColorStop(0.70, outer);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 128, 128);
    SOFT_ATMO_TEX_CACHE.set(k, c);
    return c;
  } catch {
    SOFT_ATMO_TEX_CACHE.set(k, null);
    return null;
  }
}

function drawSoftAtmoPool(ctx, wx, wy, w, h, texKey, alpha, composite = 'lighter') {
  if (alpha <= 0.004) return false;
  const tex = getSoftAtmoTex(texKey);
  if (!tex || !ctx.drawImage) return false;
  const maxA = composite === 'lighter' ? 0.16 : 0.72;
  const prevComp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = composite;
  ctx.globalAlpha = Math.min(maxA, alpha);
  ctx.drawImage(
    tex,
    Math.round(wx - w * 0.5),
    Math.round(wy - h * 0.5),
    Math.max(4, Math.round(w)),
    Math.max(4, Math.round(h))
  );
  ctx.globalCompositeOperation = prevComp;
  ctx.globalAlpha = prevAlpha;
  return true;
}

function drawSteppedPixelLine(ctx, x0, y0, x1, y1, color, pxUnit = 2) {
  const u = Math.max(2, pxUnit | 0);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / u));
  ctx.fillStyle = color;
  for (let s = 0; s <= steps; s++) {
    const f = s / steps;
    const px = snapPx(x0 + dx * f, u);
    const py = snapPx(y0 + dy * f, u);
    ctx.fillRect(px, py, u, u);
  }
}

/**
 * Zone I Eclipse Corona: Draws a razor-thin curved tangential pixel filament hugging the eclipse rim
 * strictly via quantized 2px pixel steps (zero vector arcs, ellipses, or canvas rotations!).
 */
function drawCoronaFilamentArc(ctx, cx, cy, radius, angStart, angEnd, rimHex, coreHex, alpha) {
  if (alpha <= 0.01) return;
  const segs = 7;
  const prevComp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  const prevFill = ctx.fillStyle;
  for (let s = 0; s < segs; s++) {
    const f0 = s / segs;
    const f1 = (s + 1) / segs;
    const midF = (f0 + f1) * 0.5;
    const env = Math.sin(midF * Math.PI);
    if (env <= 0.08) continue;
    const a0 = angStart + (angEnd - angStart) * f0;
    const a1 = angStart + (angEnd - angStart) * f1;
    // Slight outward parabolic bow along the tangential filament
    const bow0 = Math.sin(f0 * Math.PI) * 4.5;
    const bow1 = Math.sin(f1 * Math.PI) * 4.5;
    const x0 = cx + Math.cos(a0) * (radius + bow0);
    const y0 = cy + Math.sin(a0) * (radius + bow0);
    const x1 = cx + Math.cos(a1) * (radius + bow1);
    const y1 = cy + Math.sin(a1) * (radius + bow1);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.66, alpha * env);
    drawSteppedPixelLine(ctx, x0, y0, x1, y1, rimHex, 2);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.15, alpha * 0.24 * env);
    drawSteppedPixelLine(ctx, x0, y0, x1, y1, coreHex, 2);
  }
  ctx.globalCompositeOperation = prevComp;
  ctx.globalAlpha = prevAlpha;
  ctx.fillStyle = prevFill;
}

const BIOME_SLOT_BY_ID = {
  cathedral: 0,
  sanctuary: 0,
  sylvan: 1,
  starwood: 1,
  boneyard: 2,
  ossuary: 2,
  abyssal: 3,
  forge: 3,
  clocktower: 3
};

function getBiomeSlotForId(id) {
  if (!id || typeof id !== 'string') return 0;
  const key = id.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(BIOME_SLOT_BY_ID, key) ? BIOME_SLOT_BY_ID[key] : 0;
}

function getCampaignZoneAtX(wx) {
  const zones = ACTIVE_CAMPAIGN_PACK?.zones;
  if (!Array.isArray(zones) || zones.length === 0) return null;
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    if (wx < z.maxX || i === zones.length - 1) return z;
  }
  return zones[zones.length - 1];
}

function getBiomeSlotAtX(wx) {
  if (!ACTIVE_CAMPAIGN_PACK?.zones?.length) {
    return wx >= 7100 ? 3 : wx >= 4700 ? 2 : wx >= 2300 ? 1 : 0;
  }
  const z = getCampaignZoneAtX(wx);
  return getBiomeSlotForId(z?.biome || z?.stageId);
}

function resolveCustomPanoSpec(rawSpec) {
  if (!rawSpec) return null;
  if (typeof rawSpec === 'string') {
    const trimmed = rawSpec.trim();
    if (!trimmed) return null;
    return { url: trimmed, key: trimmed.slice(0, 96), texW: 0 };
  }
  if (typeof rawSpec === 'object') {
    const url =
      rawSpec.dataUrl ||
      rawSpec.src ||
      rawSpec.assetPath ||
      (rawSpec.filename ? `assets/sprites/${rawSpec.filename}` : '');
    if (typeof url === 'string' && url.trim()) {
      const cleanUrl = url.trim();
      const key = String(rawSpec.sha256 || rawSpec.filename || cleanUrl).slice(0, 96);
      return {
        url: cleanUrl,
        key,
        texW: Number.isFinite(rawSpec.width) && rawSpec.width > 0 ? Math.round(rawSpec.width) : 0
      };
    }
    if (isImageReadyForBlit(rawSpec)) {
      return {
        img: rawSpec,
        key: 'direct_img',
        texW: rawSpec.naturalWidth || rawSpec.width || 0
      };
    }
  }
  return null;
}

function getCustomPanoImage(resolved) {
  if (!resolved) return null;
  if (resolved.img) return isImageReadyForBlit(resolved.img) ? resolved.img : null;
  const { url } = resolved;
  if (!url) return null;
  let img = CUSTOM_PANO_CACHE.get(url);
  if (!img && typeof Image !== 'undefined') {
    img = new Image();
    img.decoding = 'async';
    img.src = url;
    CUSTOM_PANO_CACHE.set(url, img);
  }
  return isImageReadyForBlit(img) ? img : null;
}

function resolveActivePanorama(planeField, zoneField, camX, fallbackImg, fallbackBloomKey, fallbackTexW) {
  if (ACTIVE_CAMPAIGN_PACK) {
    const curZone = getCampaignZoneAtX(camX);
    const rawCandidate =
      curZone?.customPanoramas?.[zoneField] ?? ACTIVE_CAMPAIGN_PACK.customPanoramas?.[planeField] ?? null;
    const spec = resolveCustomPanoSpec(rawCandidate);
    const customImg = getCustomPanoImage(spec);
    if (customImg) {
      const texW = customImg.naturalWidth || customImg.width || spec.texW || fallbackTexW;
      return {
        img: customImg,
        bloomKey: `custom_${planeField}_${spec.key}`,
        texW,
        isCustom: true
      };
    }
  }
  return {
    img: fallbackImg,
    bloomKey: fallbackBloomKey,
    texW: fallbackTexW,
    isCustom: false
  };
}

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
 * Renders a warm, flickering soft feathered light pool (never a chunky `+` stamp!)
 * using cached offscreen radial light textures (`alpha <= 0.14`) plus a subtle 2px core glint.
 */
function drawSteppedPixelBloom(ctx, wx, wy, palKey, pxUnit, tierSize, alpha, isFloorPool = false) {
  if (alpha <= 0.004) return;
  const pal = PIXEL_BLOOM_PALETTES[palKey] || PIXEL_BLOOM_PALETTES.cyan;
  const capped = Math.min(0.14, alpha);
  const wPool = isFloorPool
    ? tierSize >= 3
      ? 148
      : 108
    : tierSize >= 3
      ? 112
      : 82;
  const hPool = isFloorPool
    ? tierSize >= 3
      ? 42
      : 32
    : tierSize >= 3
      ? 96
      : 70;

  const drewSoft = drawSoftAtmoPool(ctx, wx, wy, wPool, hPool, palKey, capped, 'lighter');
  if (drewSoft && !isFloorPool) {
    drawSoftAtmoPool(ctx, wx, wy, wPool * 0.45, hPool * 0.45, palKey, capped * 0.65, 'lighter');
  }

  // Tiny crisp 2px jewel-core sparkle (keeps pixel-art focal sparkle crisp without blocky `+` slabs)
  const u = Math.max(2, Math.min(4, pxUnit | 0));
  const cx = snapPx(wx, u);
  const cy = snapPx(wy, u);
  const prevComp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  const prevFill = ctx.fillStyle;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = pal[1];
  ctx.globalAlpha = Math.min(0.13, capped * (drewSoft ? 0.55 : 0.72));
  ctx.fillRect(cx - u, cy - (u >> 1), u * 2, u);
  ctx.fillStyle = pal[2];
  ctx.globalAlpha = Math.min(0.15, capped * (drewSoft ? 0.72 : 0.88));
  ctx.fillRect(cx - (u >> 1), cy - (u >> 1), u, u);
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
  ctx.globalAlpha = Math.min(0.16, alpha);
  ctx.fillRect(cx, cy, u, u);
  ctx.globalCompositeOperation = prevComp;
  ctx.globalAlpha = prevAlpha;
  ctx.fillStyle = prevFill;
}

/**
 * Renders an angled volumetric feathered light shaft (`0` blocky stair-step rectangles, `0` ctx.rotate)
 * by compositing overlapping soft feathered light ellipses along the diagonal beam axis.
 */
function drawPixelStaircaseRay(ctx, topX, topY, stepDx, stepDy, widthPx, steps, colHex, alpha) {
  if (alpha <= 0.004) return;
  const texKey =
    colHex === '#fde047' || colHex === '#facc15'
      ? 'gold'
      : colHex === '#2dd4bf' || colHex === '#34d399'
        ? 'mistTeal'
        : colHex === '#c084fc' || colHex === '#a855f7'
          ? 'mistViolet'
          : colHex === '#fb923c' || colHex === '#ef4444'
            ? 'mistEmber'
            : 'mistCyan';
  const tex = getSoftAtmoTex(texKey);
  const prevComp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  const prevFill = ctx.fillStyle;
  ctx.globalCompositeOperation = 'lighter';
  const beamSteps = Math.max(5, steps + 2);
  for (let s = 0; s < beamSteps; s++) {
    const f = (s + 0.5) / beamSteps;
    const fade = Math.sin(f * Math.PI);
    const bx = topX + f * steps * stepDx;
    const by = topY + f * steps * stepDy;
    const bw = widthPx * (1.55 + f * 0.95);
    const bh = Math.max(76, Math.abs(stepDy) * 1.95);
    if (tex && ctx.drawImage) {
      ctx.globalAlpha = Math.min(0.062, alpha * 1.15 * fade);
      ctx.drawImage(tex, Math.round(bx - bw * 0.5), Math.round(by - bh * 0.5), Math.round(bw), Math.round(bh));
    } else {
      ctx.fillStyle = colHex;
      ctx.globalAlpha = Math.min(0.045, alpha * fade);
      ctx.fillRect(snapPx(bx - widthPx * 0.4, 4), snapPx(by - 20, 4), snapPx(widthPx * 0.8, 4), 40);
    }
  }
  ctx.globalCompositeOperation = prevComp;
  ctx.globalAlpha = prevAlpha;
  ctx.fillStyle = prevFill;
}

/**
 * Zone 1: Gently swaying tattered royal cathedral banner suspended beneath Gothic arches (`Plane 2`, `0` rotate).
 */
function drawSwayingRoyalBanner(ctx, x, topY, t, seed, isWarm = false, isGlacial = false) {
  const bx = Math.round(x);
  const ty = Math.round(topY);
  const bw = 26;
  const mainCol = isWarm ? '#7f1d1d' : isGlacial ? '#0c4a6e' : '#6b1224';
  const hiCol = isWarm ? '#b91c1c' : isGlacial ? '#0284c7' : '#9f1239';
  const shadowCol = isWarm ? '#450a0a' : isGlacial ? '#082f49' : '#3b0716';
  const trimCol = isGlacial ? '#7dd3fc' : '#d4af37';
  const crestCol = isGlacial ? '#e0f2fe' : '#fde047';

  // Twin vertical iron suspension chains anchoring the banner cleanly up into the Gothic vault masonry
  for (const chainOff of [-12, 10]) {
    const chX = bx + chainOff;
    for (let cy = ty - 76; cy < ty - 2; cy += 6) {
      ctx.fillStyle = SELOUT;
      ctx.fillRect(chX - 1, cy, 4, 5);
      ctx.fillStyle = (cy & 2) === 0 ? '#64748b' : '#334155';
      ctx.fillRect(chX, cy + 1, 2, 3);
    }
  }

  // Forged horizontal iron mounting rod
  ctx.fillStyle = SELOUT;
  ctx.fillRect(bx - 18, ty - 2, 36, 6);
  ctx.fillStyle = '#475569';
  ctx.fillRect(bx - 17, ty - 1, 34, 3);
  ctx.fillStyle = trimCol;
  ctx.fillRect(bx - 18, ty - 1, 4, 4);
  ctx.fillRect(bx + 14, ty - 1, 4, 4);

  // 6 vertical cloth strips swaying smoothly with phase lag down the banner (`y: ty+4 .. ty+82`)
  const stripH = 12;
  for (let s = 0; s < 6; s++) {
    const u = (s + 1) / 6;
    const sway = Math.round(Math.sin(t * 2.1 + seed - s * 0.52) * (1.2 + u * 4.8));
    const sx = bx - (bw >> 1) + sway;
    const sy = ty + 3 + s * stripH;
    const curH = s === 5 ? 10 : stripH + 1;

    ctx.fillStyle = SELOUT;
    ctx.fillRect(sx - 2, sy, bw + 4, curH);
    ctx.fillStyle = mainCol;
    ctx.fillRect(sx, sy, bw, curH);
    // Fabric fold highlight & shadow
    ctx.fillStyle = hiCol;
    ctx.fillRect(sx + 4, sy, 6, curH);
    ctx.fillStyle = shadowCol;
    ctx.fillRect(sx + bw - 6, sy, 5, curH);
    // Gold edge trim stripes
    ctx.fillStyle = trimCol;
    ctx.fillRect(sx + 1, sy, 2, curH);
    ctx.fillRect(sx + bw - 3, sy, 2, curH);

    // Royal eclipse diamond crest on mid strips (`s === 2 || s === 3`)
    if (s === 2) {
      ctx.fillStyle = crestCol;
      ctx.fillRect(sx + 11, sy + 2, 4, 8);
      ctx.fillRect(sx + 9, sy + 5, 8, 4);
      ctx.fillStyle = trimCol;
      ctx.fillRect(sx + 12, sy + 4, 2, 4);
    } else if (s === 3) {
      ctx.fillStyle = trimCol;
      ctx.fillRect(sx + 11, sy, 4, 4);
      ctx.fillRect(sx + 7, sy + 7, 12, 2);
    }
  }

  // Tattered notched swallowtail hem (`s === 6`)
  const hemSway = Math.round(Math.sin(t * 2.1 + seed - 3.3) * 6.2);
  const hx = bx - (bw >> 1) + hemSway;
  const hy = ty + 3 + 6 * stripH;
  ctx.fillStyle = SELOUT;
  ctx.fillRect(hx - 1, hy, 9, 10);
  ctx.fillRect(hx + 10, hy, 6, 7);
  ctx.fillRect(hx + 18, hy, 9, 12);
  ctx.fillStyle = mainCol;
  ctx.fillRect(hx, hy, 7, 8);
  ctx.fillRect(hx + 11, hy, 4, 5);
  ctx.fillRect(hx + 19, hy, 7, 10);
  ctx.fillStyle = trimCol;
  ctx.fillRect(hx + 1, hy + 6, 4, 2);
  ctx.fillRect(hx + 21, hy + 8, 4, 2);
}

/**
 * Zone 2: Shimmering moonlit moss & rainwater puddle nestled into causeway flagstones (`0` arc/ellipse).
 */
function drawMoonlitRoadPuddle(ctx, cx, cy, halfW, halfH, t, seed) {
  const rx = snapPx(cx, 2);
  const ry = snapPx(cy, 2);
  const hw = Math.max(24, snapPx(halfW, 4));
  const hh = Math.max(8, snapPx(halfH, 2));

  // Stepped pixel oval basin with deep moonlit teal water & mossy flagstone rim
  for (let dy = -hh; dy <= hh; dy += 2) {
    const ny = dy / Math.max(2, hh);
    const span = snapPx(Math.sqrt(Math.max(0, 1 - ny * ny)) * hw, 2);
    if (span < 4) continue;
    ctx.fillStyle = 'rgba(5, 16, 22, 0.56)';
    ctx.fillRect(rx - span - 2, ry + dy, span * 2 + 4, 2);
    ctx.fillStyle = dy < 0 ? 'rgba(13, 56, 66, 0.52)' : 'rgba(8, 36, 48, 0.56)';
    ctx.fillRect(rx - span, ry + dy, span * 2, 2);
  }

  // Mossy emerald edge tufts along top stone seam
  ctx.fillStyle = 'rgba(16, 185, 129, 0.48)';
  ctx.fillRect(rx - Math.round(hw * 0.65), ry - hh, 10, 2);
  ctx.fillRect(rx + Math.round(hw * 0.28), ry - hh + 2, 12, 2);
  ctx.fillStyle = 'rgba(52, 211, 153, 0.45)';
  ctx.fillRect(rx - Math.round(hw * 0.55), ry + hh - 2, 8, 2);

  // Gently drifting moonlit aqua shimmer ripples across water surface
  const ripShift = Math.round(Math.sin(t * 2.2 + seed) * 10);
  const shimA = 0.24 + 0.18 * Math.sin(t * 3.4 + seed * 1.7);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(0.14, shimA * 0.36);
  ctx.fillStyle = '#5eead4';
  ctx.fillRect(rx - Math.round(hw * 0.42) + ripShift, ry - 2, Math.round(hw * 0.46), 2);
  ctx.fillStyle = '#ccfbf1';
  ctx.fillRect(rx - Math.round(hw * 0.14) - Math.round(ripShift * 0.6), ry + 2, Math.round(hw * 0.32), 2);
  ctx.restore();

  drawSoftAtmoPool(ctx, rx, ry, hw * 2.1, hh * 2.6, 'aqua', 0.055 + 0.025 * Math.sin(t * 2.6 + seed), 'lighter');
}

/**
 * Zone 3: Rising jagged violet soul-flames emerging from cracked ossuary flagstones (`0` rotate/arc).
 */
function drawCrackedSoulFlame(ctx, cx, cy, t, seed) {
  const rx = snapPx(cx, 2);
  const ry = snapPx(cy, 2);
  const flick = 0.65 + 0.35 * Math.sin(t * 7.2 + seed * 2.1);

  // Jagged dark basalt flagstone fissure
  drawSteppedPixelLine(ctx, rx - 22, ry + 2, rx - 6, ry - 2, '#070412', 2);
  drawSteppedPixelLine(ctx, rx - 6, ry - 2, rx + 8, ry + 2, '#070412', 2);
  drawSteppedPixelLine(ctx, rx + 8, ry + 2, rx + 24, ry - 2, '#070412', 2);
  drawSteppedPixelLine(ctx, rx - 4, ry, rx + 10, ry, '#7e22ce', 2);

  // Soft feathered violet ground glow around fissure
  drawSoftAtmoPool(ctx, rx, ry - 4, 86, 30, 'violet', 0.095 * flick, 'lighter');

  // 3 rising jagged pixel soul-flame tongues (`source-over` crisp pixels + restrained top highlight)
  const tongues = [
    { ox: -8, h: 20 + Math.round(Math.sin(t * 9.0 + seed) * 5), w: 6 },
    { ox: 1, h: 28 + Math.round(Math.cos(t * 10.4 + seed * 1.4) * 6), w: 8 },
    { ox: 10, h: 17 + Math.round(Math.sin(t * 8.2 + seed * 2.3) * 4), w: 6 }
  ];
  for (let i = 0; i < tongues.length; i++) {
    const tg = tongues[i];
    const segs = 5;
    for (let s = 0; s < segs; s++) {
      const u = s / segs;
      const sway = Math.round(Math.sin(t * 7.5 + seed + i * 1.7 + u * 3.8) * (2 + u * 4));
      const sw = Math.max(2, Math.round(tg.w * (1 - u * 0.72)));
      const sh = Math.max(3, Math.ceil(tg.h / segs) + 1);
      const px = rx + tg.ox + sway - (sw >> 1);
      const py = ry - Math.round(u * tg.h) - sh;
      ctx.fillStyle = s === 0 ? '#581c87' : s <= 2 ? '#a855f7' : s === 3 ? '#e879f9' : '#fae8ff';
      ctx.globalAlpha = 0.86 - u * 0.25;
      ctx.fillRect(px, py, sw, sh);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Zone 3 Horizon: Occasional distant crimson eclipse lightning fork on `Plane 1` (`0` vector stroke).
 */
function drawHorizonEclipseLightning(ctx, topX, topY, botY, t, seed) {
  const win = (t * 0.42 + seed * 0.37) % 1;
  if (win > 0.14) return;
  const flash = Math.sin((win / 0.14) * Math.PI);
  if (flash <= 0.06) return;

  // Brief subtle crimson horizon cloud flash
  drawSoftAtmoPool(ctx, topX, topY + 24, 240, 120, 'crimson', 0.12 * flash, 'lighter');

  // Jagged multi-segment pixel lightning bolt
  const segs = 6;
  const dy = (botY - topY) / segs;
  let px = topX;
  let py = topY;
  const stepSeed = Math.floor(t * 14 + seed * 7);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let s = 0; s < segs; s++) {
    const nx = px + (((hash2D(stepSeed + s, Math.round(seed * 10)) - 0.5) * 46) | 0);
    const ny = py + dy;
    ctx.globalAlpha = 0.75 * flash;
    drawSteppedPixelLine(ctx, px, py, nx, ny, '#f43f5e', 4);
    ctx.globalAlpha = 0.92 * flash;
    drawSteppedPixelLine(ctx, px, py, nx, ny, '#ffe4e6', 2);
    if (s === 2 || s === 4) {
      const dir = s === 2 ? -1 : 1;
      ctx.globalAlpha = 0.58 * flash;
      drawSteppedPixelLine(ctx, nx, ny, nx + dir * 24, ny + dy * 0.85, '#fb7185', 2);
    }
    px = nx;
    py = ny;
  }
  ctx.restore();
}

/**
 * Zone 4: Organic jagged animated pixel magma fissure pulsing along the obsidian causeway (`0` stiff horizontal bars!).
 */
function drawOrganicMagmaCrack(ctx, fx, fy, len, dir, pulse, t, seed, isGlacial = false) {
  const x0 = snapPx(fx - len * 0.52, 2);
  const y0 = snapPx(fy + dir * 2, 2);
  const x1 = snapPx(fx - len * 0.18, 2);
  const y1 = snapPx(fy - dir * 4, 2);
  const x2 = snapPx(fx + len * 0.16, 2);
  const y2 = snapPx(fy + dir * 4, 2);
  const x3 = snapPx(fx + len * 0.50, 2);
  const y3 = snapPx(fy - dir * 2, 2);
  const bx = snapPx(x1 + len * 0.14, 2);
  const by = snapPx(y1 + dir * 14, 2);
  const bx2 = snapPx(x2 + len * 0.12, 2);
  const by2 = snapPx(y2 - dir * 12, 2);

  // Restrained warm soft ember floor light pool (`<= 0.12`)
  drawSoftAtmoPool(ctx, fx, fy, len * 1.45, 36, isGlacial ? 'cyan' : 'ember', 0.11 * pulse, 'lighter');

  // Deep obsidian fissure edge (`4px`) + glowing molten core (`2px`) + traveling hot pulse knot
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.78;
  const edgeCol = isGlacial ? '#082f49' : '#1f0706';
  drawSteppedPixelLine(ctx, x0, y0 + 1, x1, y1 + 1, edgeCol, 4);
  drawSteppedPixelLine(ctx, x1, y1 + 1, x2, y2 + 1, edgeCol, 4);
  drawSteppedPixelLine(ctx, x2, y2 + 1, x3, y3 + 1, edgeCol, 4);
  drawSteppedPixelLine(ctx, x1, y1 + 1, bx, by + 1, edgeCol, 2);
  drawSteppedPixelLine(ctx, x2, y2 + 1, bx2, by2 + 1, edgeCol, 2);

  ctx.globalAlpha = 0.62 + 0.30 * pulse;
  const midCol = isGlacial ? '#38bdf8' : '#ea580c';
  const hotCol = isGlacial ? '#e0f2fe' : '#fde047';
  drawSteppedPixelLine(ctx, x0, y0, x1, y1, midCol, 2);
  drawSteppedPixelLine(ctx, x1, y1, x2, y2, midCol, 2);
  drawSteppedPixelLine(ctx, x2, y2, x3, y3, midCol, 2);
  drawSteppedPixelLine(ctx, x1, y1, bx, by, midCol, 2);
  drawSteppedPixelLine(ctx, x2, y2, bx2, by2, midCol, 2);

  // Animated traveling incandescent vein surge along the fissure
  const surgeU = (t * 0.55 + seed * 0.31) % 1;
  const sx = snapPx(x0 + (x3 - x0) * surgeU, 2);
  const sy = snapPx(fy + Math.sin(surgeU * Math.PI * 3) * 3 * dir, 2);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(0.15, 0.13 * pulse);
  ctx.fillStyle = hotCol;
  ctx.fillRect(sx - 6, sy - 1, 12, 2);
  ctx.fillRect(sx - 2, sy - 2, 4, 4);
  ctx.restore();
}

/**
 * Zone 4: Multi-lobe feathered volcanic smoke & ember plume rising organically (`0` dark boxes!).
 */
function drawVolcanicSmokePlume(ctx, baseX, baseY, t, seed, heightPx = 150, scale = 1.0) {
  for (let p = 0; p < 4; p++) {
    const cyc = (t * (0.22 + (p % 2) * 0.05) + seed + p * 0.25) % 1;
    const px = baseX + Math.sin(t * 1.4 + seed * 3 + p * 1.8) * (10 + cyc * 24) - cyc * 14;
    const py = baseY - cyc * heightPx;
    const sz = (36 + cyc * 68) * scale;
    const env = Math.sin(cyc * Math.PI);
    drawSoftAtmoPool(ctx, px, py, sz * 1.35, sz * 0.92, 'smokeDark', 0.42 * env, 'source-over');
    if (cyc < 0.42) {
      drawSoftAtmoPool(ctx, px, py + 8, sz * 0.85, sz * 0.55, 'ember', 0.095 * (1 - cyc / 0.42), 'lighter');
    }
  }
}

/**
 * Zone 2 Foreground (`1.24x`): Gently swaying hanging Starwood willow vines anchored strictly above combat lane.
 */
function drawHangingWillowVine(ctx, anchorX, topY, lengthPx, t, seed) {
  const segs = Math.max(5, Math.floor(lengthPx / 16));
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let s = 0; s < segs; s++) {
    const u = s / segs;
    const sway = Math.round(Math.sin(t * 1.55 + seed - u * 2.1) * (2 + u * 11));
    const vx = snapPx(anchorX + sway, 2);
    const vy = Math.round(topY + s * 16);
    const topFade = Math.min(1, (s + 1) / 3);
    ctx.globalAlpha = 0.78 * topFade;
    // Main hanging vine stem
    ctx.fillStyle = '#061a14';
    ctx.fillRect(vx - 2, vy, 4, 17);
    ctx.fillStyle = '#0f3d32';
    ctx.fillRect(vx - 1, vy, 2, 16);
    // Alternating stepped willow leaf clusters
    const side = s % 2 === 0 ? -1 : 1;
    ctx.fillStyle = '#052e2b';
    ctx.fillRect(vx + side * 2, vy + 3, 6, 8);
    ctx.fillStyle = s % 3 === 0 ? '#10b981' : '#047857';
    ctx.fillRect(vx + side * 3, vy + 4, 4, 6);
    if (s === segs - 1 || s % 4 === 2) {
      ctx.fillStyle = '#5eead4';
      ctx.globalAlpha = (0.45 + 0.35 * Math.sin(t * 3.2 + seed + s)) * topFade;
      ctx.fillRect(vx + side * 4, vy + 6, 2, 2);
    }
  }
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
  static setActiveCampaign(pack = null) {
    ACTIVE_CAMPAIGN_PACK = pack && typeof pack === 'object' ? pack : null;
    if (!ACTIVE_CAMPAIGN_PACK) {
      for (const img of CUSTOM_PANO_CACHE.values()) {
        if (img && typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
          img.src = '';
        }
      }
      CUSTOM_PANO_CACHE.clear();
    }
    AdventureMapRenderer.clearBloomCache();
  }

  static getActiveCampaign() {
    return ACTIVE_CAMPAIGN_PACK;
  }

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
    for (const tex of SOFT_ATMO_TEX_CACHE.values()) {
      if (tex && typeof tex === 'object' && 'width' in tex) {
        tex.width = 0;
        tex.height = 0;
      }
    }
    SOFT_ATMO_TEX_CACHE.clear();
  }

  static getBiomeWeights(wx) {
    const customZones = ACTIVE_CAMPAIGN_PACK?.zones;
    if (Array.isArray(customZones) && customZones.length > 0) {
      const weights = [0, 0, 0, 0];
      if (customZones.length === 1) {
        weights[getBiomeSlotForId(customZones[0].biome || customZones[0].stageId)] = 1;
        return weights;
      }
      let remaining = 1;
      for (let i = 0; i < customZones.length; i++) {
        const z = customZones[i];
        const slot = getBiomeSlotForId(z.biome || z.stageId);
        if (i === customZones.length - 1) {
          weights[slot] += remaining;
        } else {
          const seamX = Number.isFinite(z.maxX) ? z.maxX : (i + 1) * 2400;
          const blend = smoothstep(seamX - 480, seamX + 480, wx);
          const share = remaining * (1 - blend);
          weights[slot] += share;
          remaining -= share;
        }
      }
      return weights;
    }
    if (wx > 9600) {
      const w = ((wx % 9600) + 9600) % 9600;
      const t01 = smoothstep(1920, 2880, w);
      const t12 = smoothstep(4320, 5280, w);
      const t23 = smoothstep(6720, 7680, w);
      let w0 = 1 - t01;
      let w1 = t01 * (1 - t12);
      let w2 = t12 * (1 - t23);
      let w3 = t23;
      // Seamless wrap seam blending Black Pit (9120..9600) -> Eclipse Sanctum (0..480) on Ascended Loops
      if (w >= 9120) {
        const wrapBlend = smoothstep(9120, 9600, w) * 0.5;
        w3 *= 1 - wrapBlend;
        w0 += wrapBlend;
      } else if (w <= 480) {
        const wrapBlend = (1 - smoothstep(0, 480, w)) * 0.5;
        w0 *= 1 - wrapBlend;
        w3 += wrapBlend;
      }
      return [w0, w1, w2, w3];
    }
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
    isGlacialPerm = false,
    vistaResolved = null,
    archTopY = ARCH_WORLD_TOP_Y
  ) {
    const vfxSheet = stageVfx || PixelForge.ensureImage(assets?.advStageVfx);
    const vistaInfo =
      vistaResolved ||
      resolveActivePanorama('vistaPano', 'vistaPng', camX, assets?.advVistaPano, 'advVistaPano_0_272', 1620);

    // 1. Coarse Pixel-Grid Panorama Bloom extracted directly from active Vista panorama (`1620x272`)
    const vistaBloom = getEmissivePixelBloomSet(
      vistaInfo.img,
      vistaInfo.bloomKey,
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
        archTopY,
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
        archTopY,
        ARCH_WORLD_H,
        camX,
        viewLeft,
        viewRight,
        0.12 * breathTight
      );
    }
    if (vistaInfo.isCustom) return;

    // 2. Synchronized Per-Feature Stepped Pixel-Grid Shimmer & `ArcaneShaderFX` Pixel Overlays (`0.26x`)
    const vistaAnchor = PANO_ORIGIN_WORLD_X + (1 - 0.26) * camX;
    const vistaPeriod = 1620 * PANO_SCALE; // 4252.5
    const firstK = Math.floor((viewLeft - vistaAnchor) / vistaPeriod) - 1;
    const lastK = Math.ceil((viewRight - vistaAnchor) / vistaPeriod) + 1;

    for (let k = firstK; k <= lastK; k++) {
      const baseWx = vistaAnchor + k * vistaPeriod;

      // A. Zone I: Cohesive Celestial Solar Eclipse Corona (`artX = 407.5, artY = 73`, `rimR = 45.5 * PANO_SCALE`)
      //    Softly pulsing volumetric corona halo, tangential razor-thin rim filaments, drifting celestial motes,
      //    subtle breathing diagonal gold/cyan god-rays & crisp forked corona crest arcs (`Row 5`) — ZERO upright torch candles!
      const eclipseX = baseWx + 407.5 * PANO_SCALE;
      const eclipseY = archTopY + 73 * PANO_SCALE;
      if (eclipseX + 420 >= viewLeft && eclipseX - 420 <= viewRight) {
        const rimPal = infernoAlpha > 0.5 ? 'ember' : isGlacialPerm ? 'cyan' : 'gold';
        const secPal = infernoAlpha > 0.5 ? 'gold' : 'cyan';
        const rimR = 45.5 * PANO_SCALE; // ~119.4px ruler-verified eclipse ring!
        const coronaBreath = 0.78 + 0.22 * Math.sin(t * 1.45 + k);
        const rimShimmer = 0.76 + 0.24 * Math.cos(t * 2.25 + k * 1.3);

        // 1. Softly pulsing volumetric corona halo (`SOFT_ATMO_TEX_CACHE`, strictly <= 0.16 lighter alpha)
        drawSoftAtmoPool(ctx, eclipseX, eclipseY, 464, 428, rimPal, 0.105 * coronaBreath, 'lighter');
        drawSoftAtmoPool(ctx, eclipseX, eclipseY, 316, 298, secPal, 0.088 * rimShimmer, 'lighter');

        // 2. Tangential curved razor-thin corona filaments hugging the dark eclipse rim (6 slowly orbiting arcs)
        const goldRimHex = infernoAlpha > 0.5 ? '#fb923c' : isGlacialPerm ? '#38bdf8' : '#facc15';
        const cyanRimHex = infernoAlpha > 0.5 ? '#fde047' : '#7dd3fc';
        const coreWhiteHex = infernoAlpha > 0.5 ? '#fef08a' : '#fef9c3';
        for (let fIdx = 0; fIdx < 6; fIdx++) {
          const driftDir = fIdx % 2 === 0 ? 1 : -1;
          const baseAng = (fIdx / 6) * Math.PI * 2 + t * 0.16 * driftDir + k * 0.9;
          const span = 0.52 + (fIdx % 3) * 0.12;
          const radOff = 3 + (fIdx % 3) * 4.5 + Math.sin(t * 2.1 + fIdx * 1.7) * 2.0;
          const fPulse = 0.54 + 0.46 * Math.sin(t * 2.4 + fIdx * 1.45 + k);
          drawCoronaFilamentArc(
            ctx,
            eclipseX,
            eclipseY,
            rimR + radOff,
            baseAng - span * 0.5,
            baseAng + span * 0.5,
            fIdx % 2 === 0 ? goldRimHex : cyanRimHex,
            fIdx % 2 === 0 ? coreWhiteHex : '#e0f2fe',
            0.74 * fPulse
          );
        }

        // 3. Twin subtle "Bailey's Beads" rim diamond-ring flares + gentle perimeter radiance
        const beadAngles = [-0.62 + Math.sin(t * 0.45) * 0.14, 2.52 + Math.cos(t * 0.40) * 0.14];
        for (let bIdx = 0; bIdx < beadAngles.length; bIdx++) {
          const bAng = beadAngles[bIdx];
          const bx = eclipseX + Math.cos(bAng) * (rimR + 1);
          const by = eclipseY + Math.sin(bAng) * (rimR + 1);
          const bPulse = 0.62 + 0.38 * Math.sin(t * 3.1 + bIdx * 2.3 + k);
          drawSoftAtmoPool(ctx, bx, by, 78, 78, bIdx === 0 ? rimPal : secPal, 0.11 * bPulse, 'lighter');
          drawPixelCrossGlint(
            ctx,
            bx,
            by,
            bIdx === 0 ? goldRimHex : cyanRimHex,
            '#ffffff',
            3,
            3,
            0.15 * bPulse
          );
        }

        // 4. Smooth drifting celestial spark motes peeling gently outward from the corona rim
        for (let m = 0; m < 10; m++) {
          const cyc = (t * (0.14 + (m % 3) * 0.04) + m * 0.113 + Math.abs(k) * 0.27) % 1;
          const env = Math.sin(cyc * Math.PI);
          if (env <= 0.12) continue;
          const mAng = (m / 10) * Math.PI * 2 + cyc * 0.36 * (m % 2 === 0 ? 1 : -1) + k * 0.7;
          const mRad = rimR + 5 + cyc * (58 + (m % 3) * 18);
          const mx = snapPx(eclipseX + Math.cos(mAng) * mRad, 2);
          const my = snapPx(eclipseY + Math.sin(mAng) * mRad, 2);
          const mCol = m % 3 === 0 ? cyanRimHex : goldRimHex;
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.72 * env;
          ctx.fillStyle = mCol;
          ctx.fillRect(mx, my, 2, 2);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.14, 0.13 * env);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mx, my, 2, 2);
          ctx.restore();
        }

        // 5. Refined crisp forked celestial corona crest arcs (`Row 5`) with smooth breathing fade
        const crestWin = (t * 0.62 + Math.abs(k) * 0.31) % 1;
        if (crestWin < 0.58) {
          const crestEnv = Math.sin((crestWin / 0.58) * Math.PI);
          const arcCol = Math.floor(t * 15 + k * 5);
          const crestSide = Math.floor(t * 0.62 + Math.abs(k) * 0.31) % 2 === 0 ? -1 : 1;
          const arcX = eclipseX + crestSide * 66;
          const arcY = eclipseY - rimR + 12;
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            5,
            arcCol,
            arcX - 36,
            arcY - 46,
            72,
            82,
            0.54 * crestEnv,
            0.12 * crestEnv
          );
        }

        // 6. Subtle breathing diagonal golden & celestial-cyan god-ray shafts radiating from behind the eclipse
        const rayPulseA = 0.68 + 0.32 * Math.sin(t * 1.35 + k);
        const rayPulseB = 0.68 + 0.32 * Math.cos(t * 1.65 + k + 1.1);
        drawPixelStaircaseRay(ctx, eclipseX - 118, eclipseY + 56, -20, 46, 40, 6, '#fde047', 0.044 * rayPulseA);
        drawPixelStaircaseRay(ctx, eclipseX - 42, eclipseY + 96, -8, 48, 34, 6, '#fde047', 0.036 * rayPulseB);
        drawPixelStaircaseRay(ctx, eclipseX + 54, eclipseY + 92, 12, 46, 36, 6, '#38bdf8', 0.040 * rayPulseB);
        drawPixelStaircaseRay(ctx, eclipseX + 116, eclipseY + 52, 22, 46, 38, 6, '#38bdf8', 0.036 * rayPulseA);
      }

      // B. Zone II: Starwood Ravine Cascading Cliff Waterfalls (ruler-verified chutes `447, 492, 547, 569, 644, 638`!)
      //    Blended multi-strand falling cascades (`Row 3`) + feathered plunge-basin spray mist (`SOFT_ATMO_TEX_CACHE` + `Row 7`)
      //    + subtle bouncing water droplets at each cliff chute base (zero stiff pasted cyan boxes!).
      const wfChutes = [
        [447, 196, 36, 98, false, 0.40],
        [492, 214, 42, 136, true, 0.58],
        [547, 204, 46, 152, true, 0.60],
        [569, 214, 38, 138, true, 0.54],
        [644, 136, 40, 212, false, 0.58],
        [638, 196, 60, 168, true, 0.64]
      ];
      for (let wf = 0; wf < wfChutes.length; wf++) {
        const [wfArtX, wfArtY, wfW, wfH, hasPlunge, baseAlpha] = wfChutes[wf];
        const wfX = snapPx(baseWx + wfArtX * PANO_SCALE, 2);
        if (wfX + 180 < viewLeft || wfX - 180 > viewRight) continue;
        const wfTopY = archTopY + wfArtY * PANO_SCALE;
        const p = 0.78 + 0.22 * Math.sin(t * 2.8 + wf * 1.5);

        // Soft vertical aqua-silver atmospheric water sheen hugging the dark mossy cliff
        drawSoftAtmoPool(
          ctx,
          wfX,
          wfTopY + wfH * 0.52,
          wfW * 1.85,
          wfH * 1.06,
          wf % 2 === 0 ? 'mistCyan' : 'mistTeal',
          0.068 * p,
          'lighter'
        );

        // Single continuous, unbroken multi-strand falling water cascade (`Row 3`, zero mid-cliff seams!)
        const fCol = Math.floor(t * (14 + (wf % 3)) + wf * 5);
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          3,
          fCol,
          wfX - wfW * 0.5,
          wfTopY - 8,
          wfW,
          wfH,
          baseAlpha,
          0.10
        );

        if (hasPlunge) {
          const plungeY = wfTopY + wfH - 14;
          // 1. Feathered volumetric plunge-basin spray mist (`SOFT_ATMO_TEX_CACHE`)
          drawSoftAtmoPool(ctx, wfX, plungeY + 4, wfW * 2.75, 48, 'mistCyan', 0.105 * p, 'lighter');
          drawSoftAtmoPool(ctx, wfX + 6, plungeY + 8, wfW * 2.1, 34, 'mistTeal', 0.082 * p, 'lighter');

          // 2. Refined airy drifting pixel spray & mist curls (`Row 7`) at plunge base
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            7,
            Math.floor(t * 10 + wf * 6),
            wfX - wfW * 1.28,
            plungeY - 26,
            wfW * 2.56,
            56,
            0.52,
            0.08
          );

          // 3. Subtle bouncing 2px silver-white/aqua water droplets leaping out of each cliff chute base
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          for (let d = 0; d < 4; d++) {
            const cyc = (t * (0.72 + (d % 2) * 0.18) + d * 0.25 + wf * 0.37) % 1;
            const arc = Math.sin(cyc * Math.PI);
            if (arc <= 0.18) continue;
            const side = d % 2 === 0 ? 1 : -1;
            const dx = snapPx(wfX + side * (5 + (d % 3) * 4 + cyc * (18 + wf * 2)), 2);
            const dy = snapPx(plungeY - arc * (14 + (d % 2) * 8), 2);
            ctx.globalAlpha = 0.76 * arc;
            ctx.fillStyle = d % 2 === 0 ? '#e6fbfe' : '#8be0ed';
            ctx.fillRect(dx, dy, 2, 2);
          }
          ctx.restore();
        }
      }

      // C. Zone III: Sunken Violet Necropolis Viaduct & Cathedral Spires (`artX = 823..927`)
      //    Clean atmospheric necrotic haze, layered curling crypt mist (`Row 8`), smooth-enveloped razor-thin
      //    spire lightning (`Row 5`) & ascending pale soul-motes.
      const cryptVistaPts = [
        [823, 166],
        [848, 174],
        [876, 152],
        [906, 180],
        [927, 182]
      ];
      for (let sp = 0; sp < cryptVistaPts.length; sp++) {
        const spX = baseWx + cryptVistaPts[sp][0] * PANO_SCALE;
        if (spX + 180 < viewLeft || spX - 180 > viewRight) continue;
        const spY = archTopY + cryptVistaPts[sp][1] * PANO_SCALE;
        const p = 0.72 + 0.28 * Math.sin(t * 2.4 + sp * 1.6);

        // Soft layered necrotic atmospheric haze cradling the broken viaduct & cathedral spire
        drawSoftAtmoPool(ctx, spX, spY + 6, 136, 86, sp === 2 ? 'mistRose' : 'mistViolet', 0.088 * p, 'lighter');

        if (sp === 0 || sp === 2 || sp === 4) {
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            8,
            Math.floor(t * 9 + sp * 4),
            spX - 66,
            spY - 24,
            132,
            72,
            0.48,
            0.09
          );
        }

        if (sp === 0 || sp === 2) {
          // Smooth-enveloped razor-thin spire storm lightning (`Row 5`, zero harsh pop-in/pop-out!)
          const strikeWindow = (t * 0.72 + sp * 0.43 + Math.abs(k) * 0.23) % 1;
          if (strikeWindow < 0.38) {
            const env = Math.sin((strikeWindow / 0.38) * Math.PI);
            drawSoftAtmoPool(ctx, spX, spY - 122, 168, 92, 'mistViolet', 0.11 * env, 'lighter');
            blitStageOverlayPixelCell(
              ctx,
              vfxSheet,
              5,
              Math.floor(t * 16 + sp * 5),
              spX - 42,
              spY - 148,
              84,
              122,
              0.66 * env,
              0.13 * env
            );
          }
          drawHorizonEclipseLightning(ctx, spX + 38, archTopY + 46, spY - 6, t, sp * 1.9 + k * 0.7);
        }

        // Ascending ghostly pale-lavender soul motes above the sunken cathedral nave
        if (sp === 1 || sp === 2 || sp === 3) {
          const cyc = (t * (0.22 + sp * 0.04) + sp * 0.31 + Math.abs(k) * 0.19) % 1;
          const env = Math.sin(cyc * Math.PI);
          if (env > 0.18) {
            const mx = snapPx(spX + Math.sin(t * 1.9 + sp * 2.1) * 14, 2);
            const my = snapPx(spY + 18 - cyc * 96, 2);
            drawPixelCrossGlint(ctx, mx, my, '#c084fc', '#f5d0fe', 2, 1, 0.14 * env);
          }
        }
      }

      // D. Zone IV: Black Pit Volcano Caldera Cones (`artX = 1103..1542`) & Valley Magma Rivers (`artY = 228`)
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
        if (crX + 140 < viewLeft || crX - 140 > viewRight) continue;
        const crY = archTopY + volcanoCraters[cr][1] * PANO_SCALE;
        const crPulse = 0.72 + 0.28 * Math.sin(t * 3.2 + cr * 1.4);

        // Warm caldera heat glow + feathered volcanic ash plume + refined molten lip shimmer (`Row 9`)
        drawSoftAtmoPool(ctx, crX, crY - 4, 82, 44, 'ember', 0.088 * crPulse, 'lighter');
        drawVolcanicSmokePlume(ctx, crX, crY - 12, t, cr * 0.67 + k * 0.4, 146, 0.88);
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          9,
          Math.floor(t * 11 + cr * 3),
          crX - 22,
          crY - 17,
          44,
          30,
          0.52,
          0.09
        );
        // Subtle rising volcanic crater embers
        const eCyc = (t * (0.34 + (cr % 3) * 0.08) + cr * 0.29) % 1;
        const eEnv = Math.sin(eCyc * Math.PI);
        if (eEnv > 0.20) {
          const ex = snapPx(crX + Math.sin(t * 2.5 + cr) * 10 - eCyc * 12, 2);
          const ey = snapPx(crY - 14 - eCyc * 74, 2);
          drawRisingPixelSparkWake(ctx, ex, ey, 2, '#fef08a', '#fb923c', 0.76 * eEnv);
        }
      }

      const magmaPts = [1152, 1316, 1482];
      for (let vc = 0; vc < magmaPts.length; vc++) {
        const vcX = baseWx + magmaPts[vc] * PANO_SCALE;
        if (vcX + 190 < viewLeft || vcX - 190 > viewRight) continue;
        const vcY = archTopY + 228 * PANO_SCALE;
        const p = 0.74 + 0.26 * Math.sin(t * 3.8 + vc * 1.9);

        // Layered molten valley heat-shimmer glow (`SOFT_ATMO_TEX_CACHE`)
        drawSoftAtmoPool(ctx, vcX, vcY - 2, 216, 74, 'mistEmber', 0.095 * p, 'lighter');
        drawSoftAtmoPool(ctx, vcX, vcY + 4, 138, 42, 'ember', 0.092 * p, 'lighter');

        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          9,
          Math.floor(t * 12 + vc * 5),
          vcX - 68,
          vcY - 37,
          136,
          66,
          0.62,
          0.11
        );

        // Smooth-enveloped razor-thin volcanic dry-lightning above the peaks (`Row 5`)
        const volWin = (t * 0.58 + vc * 0.37 + Math.abs(k) * 0.19) % 1;
        if (volWin < 0.32) {
          const vEnv = Math.sin((volWin / 0.32) * Math.PI);
          drawSoftAtmoPool(ctx, vcX, vcY - 182, 160, 88, 'mistEmber', 0.09 * vEnv, 'lighter');
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            5,
            Math.floor(t * 16 + vc * 6),
            vcX - 38,
            vcY - 224,
            76,
            106,
            0.54 * vEnv,
            0.11 * vEnv
          );
        }

        for (let c = 0; c < 4; c++) {
          const cyc = (t * (0.30 + (c % 2) * 0.10) + c * 0.25 + vc * 0.4) % 1;
          const env = Math.sin(cyc * Math.PI);
          if (env <= 0.18) continue;
          const ex = snapPx(vcX - 30 + c * 20 + Math.sin(t * 2.2 + c) * 9, 2);
          const ey = snapPx(vcY - 6 - cyc * 138, 2);
          drawRisingPixelSparkWake(ctx, ex, ey, c % 2 === 0 ? 4 : 2, '#fef08a', '#fb923c', 0.72 * env);
          drawPixelCrossGlint(ctx, ex, ey, '#fb923c', '#fde047', 2, 1, env * 0.14);
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
    isGlacialPerm = false,
    archResolved = null,
    archTopY = ARCH_WORLD_TOP_Y
  ) {
    const vfxSheet = stageVfx || PixelForge.ensureImage(assets?.advStageVfx);
    const archInfo =
      archResolved ||
      resolveActivePanorama('archPano', 'archPng', camX, assets?.advArchPano, 'advArchPano_0_272', 3930);

    // 1. Coarse Pixel-Grid Emissive Panorama Bloom extracted directly from active Arch panorama (`3930x272`)
    const archBloom = getEmissivePixelBloomSet(
      archInfo.img,
      archInfo.bloomKey,
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
        archTopY,
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
        archTopY + riseStepY,
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
          archTopY,
          ARCH_WORLD_H,
          camX,
          viewLeft,
          viewRight,
          0.13 * Math.min(1, infernoAlpha)
        );
      }
    }

    // 1.5. Custom Stage Pack Authored World-Space Emissive Anchors (`zones[].emissiveAnchors`)
    //      Active whenever a custom `archPano` PNG is loaded (when `adv_arch_pano.png` is used,
    //      flames lock 0.0px onto its painted stone bowls below, tinted by `zone.bloomPalette`).
    if (archInfo.isCustom && Array.isArray(ACTIVE_CAMPAIGN_PACK?.zones)) {
      let emGlobalIdx = 0;
      for (let zi = 0; zi < ACTIVE_CAMPAIGN_PACK.zones.length; zi++) {
        const z = ACTIVE_CAMPAIGN_PACK.zones[zi];
        const zoneBloomPal = PIXEL_BLOOM_PALETTES[z?.bloomPalette] ? z.bloomPalette : 'cyan';
        const anchors = z?.emissiveAnchors;
        if (!Array.isArray(anchors)) continue;
        for (let ai = 0; ai < anchors.length; ai++) {
          const em = anchors[ai];
          emGlobalIdx++;
          if (!em || !Number.isFinite(em.x)) continue;
          const wx = em.x;
          const worldW = Number.isFinite(em.worldW) && em.worldW > 0 ? em.worldW : 156;
          const worldH = Number.isFinite(em.worldH) && em.worldH > 0 ? em.worldH : 164;
          if (wx + worldW < viewLeft || wx - worldW > viewRight) continue;

          const artY = Number.isFinite(em.artY) ? em.artY : 214;
          const wy = archTopY + artY * PANO_SCALE;
          const mode = em.mode === 'prism' || em.mode === 'moonwell' ? em.mode : 'brazier';
          const basePalKey = PIXEL_BLOOM_PALETTES[em.paletteKey] ? em.paletteKey : zoneBloomPal;
          const palKey = infernoAlpha > 0.65 ? 'ember' : isGlacialPerm ? 'cyan' : basePalKey;
          const tierSize = em.tierSize === 3 ? 3 : 2;
          const flick =
            0.68 +
            0.20 * Math.sin(t * (5.2 + (emGlobalIdx % 3) * 1.1) + emGlobalIdx * 1.73) +
            0.12 * Math.cos(t * 8.4 + emGlobalIdx * 2.41);

          drawSteppedPixelBloom(ctx, wx, wy, palKey, 5, tierSize, 0.11 * flick);

          const fps = 13 + (emGlobalIdx % 4) * 1.25;
          const frameCol = Math.floor(t * fps + emGlobalIdx * 3);
          if (mode === 'moonwell') {
            const mwRow = infernoAlpha > 0.55 ? 9 : Number.isFinite(em.vfxRow) ? em.vfxRow : 7;
            blitStageOverlayPixelCell(
              ctx,
              vfxSheet,
              mwRow,
              frameCol,
              wx - worldW * 0.5,
              wy - worldH * 0.5,
              worldW,
              worldH,
              0.66,
              0.12
            );
          } else if (mode === 'prism') {
            const prRow = infernoAlpha > 0.65 ? 9 : Number.isFinite(em.vfxRow) ? em.vfxRow : 11;
            blitStageOverlayPixelCell(
              ctx,
              vfxSheet,
              prRow,
              frameCol,
              wx - worldW * 0.5,
              wy - worldH * 0.5,
              worldW,
              worldH,
              0.68,
              0.13
            );
          } else {
            const baseRow = Number.isFinite(em.vfxRow) ? em.vfxRow : 0;
            const vfxRow = infernoAlpha > 0.55 ? 6 : isGlacialPerm ? 1 : baseRow;
            blitStageOverlayPixelCell(
              ctx,
              vfxSheet,
              vfxRow,
              frameCol,
              wx - worldW * 0.5,
              wy - worldH * 0.844,
              worldW,
              worldH,
              0.90,
              0.14
            );
            const pal = PIXEL_BLOOM_PALETTES[palKey] || PIXEL_BLOOM_PALETTES.gold;
            for (let sp = 0; sp < 3; sp++) {
              const sCyc = (t * (0.56 + sp * 0.19) + emGlobalIdx * 0.31 + sp * 0.33) % 1;
              const sx =
                wx +
                (sp - 1) * 16 +
                Math.sin(t * 3.4 + emGlobalIdx + sp * 2.2) * (10 + sCyc * 12);
              const sy = wy - 26 - sCyc * 98;
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

          const tw = 0.5 + 0.5 * Math.sin(t * 6.2 + emGlobalIdx * 2.1);
          if (tw > 0.45) {
            const pal = PIXEL_BLOOM_PALETTES[palKey] || PIXEL_BLOOM_PALETTES.cyan;
            const glintLift = mode === 'prism' ? 0 : -18;
            drawPixelCrossGlint(ctx, wx, wy + glintLift, pal[1], pal[2], 4, 2, 0.13 * tw);
          }
        }
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

      if (!archInfo.isCustom) {
        for (let i = 0; i < ARCH_EMISSIVE_ANCHORS.length; i++) {
          const [artX, artY, basePalKey, tierSize, baseVfxRow, anchorArtY, worldW, worldH, mode] =
            ARCH_EMISSIVE_ANCHORS[i];
          const wx = baseWx + artX * PANO_SCALE;
          if (wx + 160 < viewLeft || wx - 160 > viewRight) continue;

          const wy = archTopY + artY * PANO_SCALE;
          const wyAnchor = archTopY + anchorArtY * PANO_SCALE;
          const customZoneAtWx = ACTIVE_CAMPAIGN_PACK ? getCampaignZoneAtX(wx) : null;
          const zonePalOverride =
            customZoneAtWx?.bloomPalette && PIXEL_BLOOM_PALETTES[customZoneAtWx.bloomPalette]
              ? customZoneAtWx.bloomPalette
              : null;
          const effectiveBasePal =
            zonePalOverride && i % 2 === 0 ? zonePalOverride : basePalKey;
          const palKey = infernoAlpha > 0.65 ? 'ember' : isGlacialPerm ? 'cyan' : effectiveBasePal;
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
            // Warm flickering soft light pool cast onto the upper 2.5D road beneath each standing brazier
            drawSteppedPixelBloom(ctx, wx, ADVENTURE_ROAD_TOP_Y + 18, palKey, 3, tierSize, 0.088 * flick, true);
          }

          const tw = 0.5 + 0.5 * Math.sin(t * 6.2 + i * 2.1);
          if (tw > 0.45) {
            const pal = PIXEL_BLOOM_PALETTES[palKey] || PIXEL_BLOOM_PALETTES.cyan;
            const glintLift = mode === 'prism' ? 0 : -18;
            drawPixelCrossGlint(ctx, wx, wy + glintLift, pal[1], pal[2], 4, 2, 0.13 * tw);
          }
        }
      }

      // 3. Per-Bay Angled Volumetric Cathedral Sunbeams, Swaying Royal Banners & Realm Animations
      for (let b = 0; b < 10; b++) {
        const bayCenterPx = 124 + b * 393;
        const cx = baseWx + bayCenterPx * PANO_SCALE;
        if (cx + 760 < viewLeft || cx - 760 > viewRight) continue;

        const z =
          infernoAlpha > 0.65
            ? 3
            : ACTIVE_CAMPAIGN_PACK?.zones?.length
              ? getBiomeSlotAtX(cx)
              : b <= 2
                ? 0
                : b <= 4
                  ? 1
                  : b <= 6
                    ? 2
                    : 3;
        const rayBreath = 0.72 + 0.28 * Math.sin(t * 1.85 + b * 1.4);

        if (z === 0) {
          // Zone I (Eclipse Sanctuary): Angled volumetric golden sunbeams + arch-anchored swaying royal banners + incense embers
          drawPixelStaircaseRay(ctx, cx - 108, -76, 26, 72, 48, 7, '#fde047', 0.056 * rayBreath);
          drawPixelStaircaseRay(ctx, cx + 44, -58, 22, 68, 40, 6, '#7dd3fc', 0.044 * rayBreath);
          drawSwayingRoyalBanner(ctx, cx - 228, 34, t, b * 1.7 + k, infernoAlpha > 0.4, isGlacialPerm);
          drawSwayingRoyalBanner(ctx, cx + 344, 34, t, b * 1.7 + k + 2.3, infernoAlpha > 0.4, isGlacialPerm);
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
            0.40,
            0.08
          );
          for (let m = 0; m < 6; m++) {
            const cyc = (t * (0.15 + (m % 3) * 0.05) + m * 0.23 + b) % 1;
            const mx = snapPx(cx - 220 + m * 92 + cyc * 34 + Math.sin(t * 1.6 + m) * 14, 2);
            const my = snapPx(406 - cyc * 346, 2);
            const col = m % 3 === 0 ? '#7dd3fc' : '#fde047';
            drawPixelCrossGlint(ctx, mx, my, col, '#ffffff', 3, 1, Math.sin(cyc * Math.PI) * 0.14);
          }
        } else if (z === 1) {
          // Zone II (Cursed Starwood): Moonlit volumetric shafts + drifting bioluminescent teal/emerald fireflies
          drawPixelStaircaseRay(ctx, cx - 96, -66, 18, 64, 44, 7, '#2dd4bf', 0.048 * rayBreath);
          drawPixelStaircaseRay(ctx, cx + 64, -48, 18, 64, 38, 6, '#34d399', 0.042 * rayBreath);
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
              0.46,
              0.09
            );
          }
          for (let s = 0; s < 8; s++) {
            const cyc = (t * (0.14 + (s % 3) * 0.04) + s * 0.27 + b) % 1;
            const sx = snapPx(cx - 260 + s * 74 + Math.sin(t * 1.8 + s * 1.9 + b) * 32, 2);
            const sy = snapPx(140 + ((s * 53) % 240) + Math.cos(t * 2.4 + s * 1.4) * 26, 2);
            const blink = 0.45 + 0.55 * Math.sin(t * 4.6 + s * 2.1 + b);
            const env = Math.sin(cyc * Math.PI) * blink;
            const col = s % 2 === 0 ? '#2dd4bf' : '#34d399';
            drawSoftAtmoPool(ctx, sx, sy, 22, 22, s % 2 === 0 ? 'aqua' : 'emerald', 0.11 * env, 'lighter');
            drawPixelCrossGlint(ctx, sx, sy, col, '#ecfeff', 2, 1, env * 0.15);
          }
        } else if (z === 2) {
          // Zone III (Abyssal Necropolis): Spectral shafts + drifting bone ash + crypt wraith wisps
          drawPixelStaircaseRay(ctx, cx - 64, -60, 12, 66, 44, 7, '#c084fc', 0.044 * rayBreath);
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
              0.48,
              0.10
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
              0.52,
              0.12
            );
          }
          // Drifting pale bone ash flakes + rising violet soul sparks
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          for (let a = 0; a < 7; a++) {
            const cyc = (t * (0.14 + (a % 3) * 0.04) + a * 0.19 + b * 0.37) % 1;
            const ax = snapPx(cx - 250 + a * 80 - cyc * 58 + Math.sin(t * 1.9 + a * 2.1) * 18, 2);
            const ay = snapPx(64 + cyc * 348, 2);
            ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.56;
            ctx.fillStyle = a % 2 === 0 ? '#cbd5e1' : '#94a3b8';
            ctx.fillRect(ax, ay, a % 3 === 0 ? 4 : 2, 2);
          }
          ctx.restore();
          for (let w = 0; w < 5; w++) {
            const cyc = (t * (0.26 + (w % 2) * 0.08) + w * 0.27 + b) % 1;
            const wxM = snapPx(cx - 230 + w * 108 + Math.cos(t * 2.1 + w) * 16, 4);
            const wyM = snapPx(412 - cyc * 332, 4);
            drawPixelCrossGlint(ctx, wxM, wyM, '#c084fc', '#f3e8ff', 3, 1, Math.sin(cyc * Math.PI) * 0.15);
          }
        } else {
          // Zone IV (Throne of the Black Pit): Molten heat haze + volcanic smoke plumes + rising cinders
          drawPixelStaircaseRay(ctx, cx - 72, 42, -10, 58, 44, 6, '#fb923c', 0.046 * rayBreath);
          drawVolcanicSmokePlume(ctx, cx - 140, 412, t, b * 1.1 + k, 195, 0.95);
          blitStageOverlayPixelCell(
            ctx,
            vfxSheet,
            9,
            Math.floor(t * 13 + b * 4),
            cx - 72,
            396,
            144,
            68,
            0.54,
            0.10
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
    isGlacialPerm = false,
    floorResolved = null,
    roadTopY = ADVENTURE_ROAD_TOP_Y,
    floorWorldH = FLOOR_WORLD_H
  ) {
    const vfxSheet = stageVfx || PixelForge.ensureImage(assets?.advStageVfx);
    const floorInfo =
      floorResolved ||
      resolveActivePanorama('floorPano', 'floorPng', camX, assets?.advFloorPano, 'advFloorPano_0_96', 4570);

    // 1. Coarse Pixel-Grid Emissive Floor Bloom extracted directly from active Floor panorama (`4570x96`)
    const floorBloom = getEmissivePixelBloomSet(
      floorInfo.img,
      floorInfo.bloomKey,
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
        roadTopY,
        floorWorldH,
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
        roadTopY,
        floorWorldH,
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
      const z = infernoAlpha > 0.6 ? 3 : getBiomeSlotAtX(midX);
      const pulse = 0.58 + 0.42 * Math.sin(t * 3.4 + s * 1.3);

      if (z === 0) {
        // Zone I (Eclipse Sanctuary): Soft warm sunlit & astral floor light pools + gentle breeze wisps (0 rigid 44x3 bars!)
        drawSteppedPixelBloom(ctx, baseX + 146, 484, s % 2 === 0 ? 'gold' : 'cyan', 4, 2, 0.075 * pulse, true);
        drawSteppedPixelBloom(ctx, baseX + 332, 558, s % 2 === 0 ? 'cyan' : 'gold', 4, 2, 0.068 * pulse, true);
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
          0.38,
          0.07
        );
        drawSoftAtmoPool(ctx, baseX + 240, 514, 180, 44, s % 2 === 0 ? 'gold' : 'cyan', 0.068 * pulse, 'lighter');
      } else if (z === 1) {
        // Zone II (Cursed Starwood): Shimmering moonlit moss/water puddles + soft aqua pools + gentle sylvan wisps
        drawMoonlitRoadPuddle(ctx, baseX + 132, 488, 52, 12, t, s * 1.7);
        drawMoonlitRoadPuddle(ctx, baseX + 344, 636, 58, 13, t, s * 1.7 + 2.4);
        drawSteppedPixelBloom(ctx, baseX + 112, 483, 'emerald', 4, 2, 0.070 * pulse, true);
        drawSteppedPixelBloom(ctx, baseX + 356, 650, 'aqua', 4, 2, 0.070 * pulse, true);
        const slipX = baseX + ((t * 38 + Math.abs(s) * 163) % segSpan);
        const sylvY = s % 3 === 0 ? 483 : s % 3 === 1 ? 551 : 656;
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          7,
          Math.floor(t * 11 + Math.abs(s) * 5),
          slipX - 76,
          sylvY - 32,
          152,
          64,
          0.44,
          0.08
        );
      } else if (z === 2) {
        // Zone III (Abyssal Necropolis): Rising jagged violet soul-flames from cracked flagstones + feathered crypt ground mist (0 168x6 / 108x6 slabs!)
        const driftX = baseX + ((t * 24 + Math.abs(s) * 97) % segSpan);
        const mistY = 492 + (Math.abs(s) % 3) * 44;
        drawCrackedSoulFlame(ctx, baseX + 148, 496 + (Math.abs(s) % 2) * 32, t, s * 1.9);
        drawCrackedSoulFlame(ctx, baseX + 356, 616 - (Math.abs(s) % 2) * 28, t, s * 1.9 + 3.1);
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          8,
          Math.floor(t * 10 + Math.abs(s) * 4),
          driftX - 84,
          mistY - 34,
          168,
          72,
          0.46,
          0.09
        );
        drawSoftAtmoPool(ctx, driftX, mistY, 240, 48, 'mistViolet', 0.095 * pulse, 'lighter');
        drawSoftAtmoPool(ctx, driftX + 52, mistY + 12, 176, 36, 'mistRose', 0.065 * pulse, 'lighter');
      } else {
        // Zone IV (Throne of the Black Pit): Organic jagged animated pixel magma cracks pulsing along the road + volcanic ember surge!
        const hotPulse = 0.64 + 0.36 * Math.sin(t * 5.0 + s * 1.9);
        const isGlacialRoad = isGlacialPerm && infernoAlpha <= 0.5;
        drawOrganicMagmaCrack(ctx, baseX + 142, 567, 134, s % 2 === 0 ? 1 : -1, hotPulse, t, s * 1.7, isGlacialRoad);
        const secVeinY = s % 2 === 0 ? 496 : 622;
        drawOrganicMagmaCrack(ctx, baseX + 346, secVeinY, 118, s % 2 === 0 ? -1 : 1, hotPulse * 0.92, t, s * 1.7 + 2.3, isGlacialRoad);
        drawSteppedPixelBloom(ctx, baseX + 140, 567, isGlacialRoad ? 'cyan' : 'ember', 4, 2, 0.080 * hotPulse, true);

        const surgeRow = isGlacialRoad ? 1 : 9;
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
          0.60,
          0.11
        );
        blitStageOverlayPixelCell(
          ctx,
          vfxSheet,
          surgeRow,
          Math.floor(t * 13 + Math.abs(s) * 3 + 7),
          baseX + 286,
          secVeinY - 36,
          128,
          64,
          0.56,
          0.10
        );

        const cyc = (t * 0.72 + (Math.abs(s) % 5) * 0.2) % 1;
        drawPixelCrossGlint(
          ctx,
          baseX + 140,
          567 - cyc * 38,
          isGlacialRoad ? '#38bdf8' : '#fb923c',
          isGlacialRoad ? '#e0f2fe' : '#fde047',
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

    const wc = ACTIVE_CAMPAIGN_PACK?.walkableCauseway;
    const roadTopY = Number.isFinite(wc?.roadTopY) ? wc.roadTopY : ADVENTURE_ROAD_TOP_Y;
    const roadBotY = Number.isFinite(wc?.roadBotY) ? wc.roadBotY : ADVENTURE_ROAD_BOT_Y;
    const roadMidY = Number.isFinite(wc?.midY) ? wc.midY : 561;
    const archTopY = Math.round(roadTopY - 264 * PANO_SCALE);
    const floorWorldH = Math.max(FLOOR_WORLD_H, roadBotY - roadTopY + 2);

    const vistaInfo = resolveActivePanorama(
      'vistaPano',
      'vistaPng',
      camX,
      assets?.advVistaPano,
      'advVistaPano_0_272',
      1620
    );
    const archInfo = resolveActivePanorama(
      'archPano',
      'archPng',
      camX,
      assets?.advArchPano,
      'advArchPano_0_272',
      3930
    );
    const floorInfo = resolveActivePanorama(
      'floorPano',
      'floorPng',
      camX,
      assets?.advFloorPano,
      'advFloorPano_0_96',
      4570
    );

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

    const skySpan = Math.max(1, roadTopY - skyTopY);
    const darkCeilStop = Math.max(
      0.04,
      Math.min(0.70, (archTopY - 76 - skyTopY) / skySpan)
    );
    const archSeamStop = Math.max(
      darkCeilStop + 0.02,
      Math.min(0.80, (archTopY - 6 - skyTopY) / skySpan)
    );
    const midVaultStop = Math.max(
      archSeamStop + 0.04,
      Math.min(0.94, (archTopY + 320 - skyTopY) / skySpan)
    );
    const skyGradKey = `${ambR},${ambG},${ambB}`;
    const skyGrad = getCachedVerticalGrad(
      ctx,
      'sky',
      skyTopY,
      roadTopY,
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
    ctx.fillRect(viewLeft, skyTopY, viewW, roadTopY - skyTopY + 16);

    // =========================================================================
    // PLANE 1 (`0.26x`): FAR ABYSSAL ECLIPSE CANYON VISTA (`advVistaPano`, `1620x272`)
    // =========================================================================
    drawWrappedPanorama(
      ctx,
      vistaInfo.img,
      0,
      272,
      0.26,
      archTopY,
      ARCH_WORLD_H,
      camX,
      viewLeft,
      viewRight,
      vistaInfo.texW
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
      isGlacialPerm,
      vistaInfo,
      archTopY
    );

    // Top edge feather blending `advVistaPano` (`archTopY = -257`) into Plane 0 darkforge vault shadow
    const topBlendKey = `${seamR},${seamG},${seamB}`;
    const topBlendGrad = getCachedVerticalGrad(
      ctx,
      'topBlend',
      archTopY - 8,
      archTopY + 58,
      topBlendKey,
      (g) => {
        g.addColorStop(0, `rgb(${seamR},${seamG},${seamB})`);
        g.addColorStop(0.40, `rgba(${seamR},${seamG},${seamB},0.56)`);
        g.addColorStop(1, `rgba(${seamR},${seamG},${seamB},0)`);
      }
    );
    ctx.fillStyle = topBlendGrad;
    ctx.fillRect(viewLeft, archTopY - 8, viewW, 66);

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
      roadTopY + 8,
      `${mistR},${mistG},${mistB}`,
      (g) => {
        g.addColorStop(0, `rgba(${mistR},${mistG},${mistB},0)`);
        g.addColorStop(0.62, `rgba(${mistR},${mistG},${mistB},0.16)`);
        g.addColorStop(1, 'rgba(8, 11, 20, 0.34)');
      }
    );
    ctx.fillStyle = canyonMist;
    ctx.fillRect(viewLeft, 175, viewW, roadTopY - 167);

    // Soft feathered drifting canyon mist banks (`0` blocky horizontal `216x6`/`144x6` fillRect slabs!)
    const mistAnchor = (1 - 0.70) * camX - t * 18;
    const mistStep = 380;
    const mStart = Math.floor((viewLeft - mistAnchor) / mistStep) - 1;
    const mEnd = Math.ceil((viewRight - mistAnchor) / mistStep) + 1;
    const activeZone = getCampaignZoneAtX(camX);
    const customZonePal = activeZone?.bloomPalette || null;
    const mistKeyA =
      infernoAlpha > 0.45 || (camWeights[3] > 0.45 && !isGlacialPerm)
        ? 'mistEmber'
        : isGlacialPerm
          ? 'mistCyan'
          : isShogunatePerm
            ? 'mistRose'
            : customZonePal === 'violet'
              ? 'mistViolet'
              : customZonePal === 'emerald' || customZonePal === 'aqua'
                ? 'mistTeal'
                : customZonePal === 'ember'
                  ? 'mistEmber'
                  : camWeights[2] > 0.45
                    ? 'mistViolet'
                    : camWeights[1] > 0.45
                      ? 'mistTeal'
                      : 'mistCyan';
    const mistKeyB =
      mistKeyA === 'mistEmber'
        ? 'mistRose'
        : mistKeyA === 'mistViolet'
          ? 'mistRose'
          : mistKeyA === 'mistTeal'
            ? 'mistCyan'
            : 'gold';
    for (let m = mStart; m <= mEnd; m++) {
      const mx = mistAnchor + m * mistStep + Math.sin(t * 0.75 + m * 1.4) * 32;
      const my = 296 + (Math.abs(m) % 3) * 36 + Math.cos(t * 0.9 + m) * 8;
      const mw = 310 + (Math.abs(m) % 3) * 56;
      const mh = 72 + (Math.abs(m) % 2) * 22;
      const mp = 0.055 + 0.025 * Math.sin(t * 1.4 + m * 1.3);
      drawSoftAtmoPool(ctx, mx, my, mw, mh, m % 2 === 0 ? mistKeyA : mistKeyB, mp, 'lighter');
    }

    // =========================================================================
    // PLANE 2 (`0.86x`): GOTHIC PILGRIMAGE COLONNADE (`advArchPano`, `3930x272` RGBA)
    // =========================================================================
    drawWrappedPanorama(
      ctx,
      archInfo.img,
      0,
      272,
      0.86,
      archTopY,
      ARCH_WORLD_H,
      camX,
      viewLeft,
      viewRight,
      archInfo.texW
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
        archTopY,
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
      isGlacialPerm,
      archInfo,
      archTopY
    );

    // =========================================================================
    // PLANE 3 (`1.00x`): UNBROKEN WALKABLE STONE CAUSEWAY (`advFloorPano`, `4570x96`)
    // =========================================================================
    const floorDrawn = drawWrappedPanorama(
      ctx,
      floorInfo.img,
      0,
      96,
      1.0,
      roadTopY,
      floorWorldH,
      camX,
      viewLeft,
      viewRight,
      floorInfo.texW
    );
    if (!floorDrawn) {
      ctx.fillStyle = '#141926';
      ctx.fillRect(viewLeft, roadTopY, viewW, roadBotY - roadTopY);
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
        roadTopY,
        floorWorldH,
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
      isGlacialPerm,
      floorInfo,
      roadTopY,
      floorWorldH
    );

    // Subtle grounded contact occlusion right under the stone curb (`alpha <= 0.24`)
    const curbShadow = getCachedVerticalGrad(
      ctx,
      'curbShadow',
      roadTopY - 2,
      roadTopY + 14,
      'curb',
      (g) => {
        g.addColorStop(0, 'rgba(4, 6, 12, 0.24)');
        g.addColorStop(0.45, 'rgba(4, 6, 12, 0.14)');
        g.addColorStop(1, 'rgba(4, 6, 12, 0)');
      }
    );
    ctx.fillStyle = curbShadow;
    ctx.fillRect(viewLeft, roadTopY - 2, viewW, 16);

    // Pixel-Stepped Boss Sanctuary Runic Floor Seal (`x: 8920` default, dynamic for Stage Packs) & Fissure Surges
    const bossCfg = ACTIVE_CAMPAIGN_PACK?.finalBoss;
    const bossSealEnabled = bossCfg ? bossCfg.enabled !== false : true;
    const bossAnchorX = Number.isFinite(bossCfg?.anchorX) ? bossCfg.anchorX : 9335;
    const bossSealX = bossAnchorX - 415;
    const bossSealY = Number.isFinite(bossCfg?.groundY) ? bossCfg.groundY : roadMidY;
    if (bossSealEnabled && bossSealX + 520 > viewLeft && bossSealX - 420 < viewRight) {
      const sealPulse = 0.65 + 0.35 * Math.sin(t * 3.1);
      const runeHex = isGlacialPerm && infernoAlpha <= 0.4 ? '#38bdf8' : infernoAlpha > 0.4 ? '#fb923c' : '#ef4444';
      const coreHex = isGlacialPerm && infernoAlpha <= 0.4 ? '#e0f2fe' : '#fef08a';

      // Ominous abyssal boss haze framing BEHEMOTH MALPHAS along the eastern throne parapet (combat lane stays razor-sharp!)
      drawSoftAtmoPool(ctx, bossAnchorX - 40, 418, 520, 320, 'bossHaze', 0.42 + 0.12 * sealPulse, 'source-over');
      drawSoftAtmoPool(ctx, bossAnchorX - 70, 560, 420, 210, isGlacialPerm && infernoAlpha <= 0.4 ? 'cyan' : 'ember', 0.095 * sealPulse, 'lighter');
      drawVolcanicSmokePlume(ctx, bossAnchorX - 180, roadTopY + 12, t, 4.2, 210, 1.15);
      drawVolcanicSmokePlume(ctx, bossAnchorX + 35, roadTopY + 26, t, 7.9, 240, 1.25);

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
    const curbY = roadBotY;
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
      const bSlot = getBiomeSlotAtX(cx);
      const isWarm = infernoAlpha > 0.45 || bSlot === 3;
      const isBone = !isWarm && bSlot === 2;
      const isSylv = !isWarm && !isBone && bSlot === 1;
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

    const wcFg = ACTIVE_CAMPAIGN_PACK?.walkableCauseway;
    const fgRoadBotY = Number.isFinite(wcFg?.roadBotY) ? wcFg.roadBotY : ADVENTURE_ROAD_BOT_Y;
    const fgArchTopY = Math.round(
      (Number.isFinite(wcFg?.roadTopY) ? wcFg.roadTopY : ADVENTURE_ROAD_TOP_Y) - 264 * PANO_SCALE
    );

    for (let f = firstFg; f <= lastFg; f++) {
      const fx = Math.round(fgAnchor + f * fgPeriod);
      const z = isInferno ? 3 : getBiomeSlotAtX(fx);

      // 1. Near-Camera Foreground Abyssal Cliff Buttress Silhouette (`y = 690 .. viewBot`, strictly below combat lane!)
      const buttW = 88;
      const buttH = Math.max(90, viewBot - (fgRoadBotY + 2));
      const rimCol =
        z === 3
          ? 'rgba(92, 34, 28, 0.52)'
          : z === 2
            ? 'rgba(72, 48, 108, 0.50)'
            : z === 1
              ? 'rgba(24, 72, 66, 0.52)'
              : 'rgba(34, 48, 76, 0.52)';
      ctx.fillStyle = 'rgba(5, 7, 14, 0.88)';
      ctx.fillRect(fx - 44, fgRoadBotY + 8, buttW, buttH);
      ctx.fillRect(fx - 36, fgRoadBotY + 4, buttW - 16, 6);
      ctx.fillStyle = rimCol;
      ctx.fillRect(fx - 34, fgRoadBotY + 4, buttW - 20, 3);

      // 2. Near-Camera `1.24x` Parallax Pixel Wind-Wisp / Crypt-Mist / Volcanic Plumes (`adv_stage_vfx.png`)
      const fgWispRow = isGlacial ? 7 : z === 3 ? 9 : z === 2 ? 8 : 7;
      const fgDriftX = fx - 210 + ((t * 54 + Math.abs(f) * 173) % 420);
      blitStageOverlayPixelCell(
        ctx,
        stageVfx,
        fgWispRow,
        Math.floor(t * 12 + Math.abs(f) * 5),
        fgDriftX - 82,
        fgRoadBotY - 46,
        164,
        74,
        0.38,
        0.07
      );
      if (z === 3) {
        // Rising volcanic ember/smoke plumes along the lower Black Pit abyssal parapet
        drawVolcanicSmokePlume(ctx, fx + 84, fgRoadBotY + 12, t, Math.abs(f) * 1.37, 155, 0.85);
      }

      // 3. Drifting Near-Camera Foreground Bioluminescent Fireflies / Bone Ash / Embers / Sakura (`1.24x` depth)
      const moteCount = isShogunate || isGlacial ? 8 : z === 1 ? 6 : 5;
      for (let m = 0; m < moteCount; m++) {
        const cyc = (t * (0.18 + (m % 3) * 0.05) + m * 0.17 + Math.abs(f) * 0.19) % 1;
        const mx = snapPx(
          fx -
            220 +
            m * (isShogunate || isGlacial ? 68 : 104) +
            (isShogunate || isGlacial ? cyc * 135 : z === 2 ? -cyc * 64 : 0) +
            Math.sin(t * 1.8 + m + f) * 26,
          2
        );
        const my = snapPx(isShogunate || isGlacial || z === 1 || z === 2 ? 96 + cyc * 540 : 648 - cyc * 450, 2);
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
        if (z === 2 && !isGlacial && m % 2 === 0) {
          // Zone III Foreground Drifting Bone Ash flake
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.62;
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(mx - 1, my - 1, 5, 4);
          ctx.fillStyle = m % 4 === 0 ? '#e2e8f0' : '#94a3b8';
          ctx.fillRect(mx, my, 3, 2);
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
                ? m % 2 === 0
                  ? '#2dd4bf'
                  : '#34d399'
                : '#fde047';
        if (z === 1 && !isGlacial) {
          const ffEnv = Math.sin(cyc * Math.PI) * (0.48 + 0.52 * Math.sin(t * 4.4 + m * 2.1 + f));
          drawSoftAtmoPool(ctx, mx, my, 24, 24, m % 2 === 0 ? 'aqua' : 'emerald', 0.11 * ffEnv, 'lighter');
          drawPixelCrossGlint(ctx, mx, my, col, '#ecfeff', 2, 1, ffEnv * 0.15);
        } else {
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
      }

      // 4. Overhead Framing Silhouettes strictly above playable road (`y <= 110`, NEVER blocking combat lane!):
      //    - Zone II (Starwood): Swaying hanging willow vines in foreground parallax (`1.24x`)
      //    - Zones I / III / IV: Overhead vaulted iron chains (`y = fgArchTopY + 10 .. -56`)
      if (z === 1 && viewTop < 115) {
        const vineTop = Math.max(viewTop, fgArchTopY + 12);
        const maxVineLen = Math.min(250, Math.max(88, 108 - vineTop));
        if (maxVineLen >= 72) {
          drawHangingWillowVine(ctx, fx - 120, vineTop, maxVineLen * 0.85, t, f * 1.9);
          drawHangingWillowVine(ctx, fx + 46, vineTop, maxVineLen, t, f * 1.9 + 2.2);
          drawHangingWillowVine(ctx, fx + 178, vineTop, maxVineLen * 0.72, t, f * 1.9 + 4.1);
        }
      } else if (viewTop < -48 && z !== 1) {
        const sway = Math.round(Math.sin(t * 1.4 + f * 1.7) * 4);
        const chainTop = Math.max(viewTop, fgArchTopY + 10);
        for (let ly = chainTop; ly < -56; ly += 14) {
          const u = (ly - chainTop) / Math.max(1, -56 - chainTop);
          const topFade = Math.min(1, (ly - (fgArchTopY + 6)) / 42);
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

