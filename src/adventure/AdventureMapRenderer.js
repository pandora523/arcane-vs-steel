import { PixelForge } from '../engine/PixelForge.js?v=30fps93';

/**
 * Seamless Multi-Plane HD-2D Adventure World Panorama Renderer (`AdventureMapRenderer`)
 *
 * Renders the bespoke "Abyssal Eclipse Pilgrimage" 5-plane panoramic stage across
 * the expanded 9600px (`4 x 2400px` Realms) 2.5D campaign (`X: -inf..+inf`, walkable depth `Z/Y: 442..680`):
 *   - Plane 0 (`0.14x`): Upper Abyssal Star-Cosmos & Nebula Vault (`viewTop .. -240`)
 *   - Plane 1 (`0.26x`): `advVistaPano` (`1620x272`) - Continuous Abyssal Solar Eclipse,
 *                        Gothic Viaducts, Cursed Starwood Waterfalls, Sunken Violet
 *                        Bone-Viaduct Citadel & Smoldering Black Pit Magma Volcanoes
 *   - Plane 1.5 (`0.70x`): Mid-Chasm Drifting Canyon Mist & Atmospheric Depth Veils
 *   - Plane 2 (`0.86x`): `advArchPano` (`3930x272` RGBA, 10 bays) - Organic Sky-Keyed Ruined Gothic
 *                        Eclipse Colonnade, Overgrown Spirit-Trees & Crystal Lanterns,
 *                        Ossuary Gargoyle Portcullis Gate & Scorched Black Pit Obsidian Arch
 *   - Plane 3 (`1.00x`): `advFloorPano` (`4570x96`, 10 bays) - Unbroken Grounded Wet Carved Rune,
 *                        Elven, Ossuary & Molten-Cracked Obsidian Causeway across all 9600px
 *   - Plane 4 (`1.24x`): Near-Camera Foreground Vault Spandrels, Hanging Chains & Cliff Buttresses
 *
 * Strictly zero canvas rotation calls, crisp integer pixel coordinates, subtle additive
 * bloom (`alpha <= 0.18`), and seamless periodic wrap tiling.
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

function hash2D(ix, iy) {
  let n = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
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

function drawSubtleGlow(ctx, glowTex, cx, cy, rx, ry, alpha) {
  if (!glowTex || alpha <= 0.004) return;
  const capped = Math.min(0.18, alpha);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = capped;
  ctx.drawImage(
    glowTex,
    Math.round(cx - rx),
    Math.round(cy - ry),
    Math.round(rx * 2),
    Math.round(ry * 2)
  );
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

export class AdventureMapRenderer {
  static getBiomeWeights(wx) {
    const t01 = smoothstep(1920, 2880, wx);
    const t12 = smoothstep(4320, 5280, wx);
    const t23 = smoothstep(6720, 7680, wx);
    return [1 - t01, t01 * (1 - t12), t12 * (1 - t23), t23];
  }

  // ===========================================================================
  // LIVE SYNCHRONIZED STAGE ATMOSPHERICS ON PLANE 2 (`0.86x`, 10 BAYS = 9600px)
  // ===========================================================================
  static renderLiveArchEffects(ctx, renderer, camX, viewLeft, viewRight, t, infernoAlpha) {
    const archAnchor = PANO_ORIGIN_WORLD_X + (1 - 0.86) * camX;
    const periodWorld = 3930 * PANO_SCALE; // 10316.25

    // 10 bay centers in art px on `adv_arch_pano.png` (`3930px`, `393px` step = `1200px` camX):
    const bayDefs = [
      { centerPx: 124, zone: 0 },
      { centerPx: 517, zone: 0 },
      { centerPx: 910, zone: 0 },
      { centerPx: 1303, zone: 1 },
      { centerPx: 1696, zone: 1 },
      { centerPx: 2089, zone: 2 },
      { centerPx: 2482, zone: 2 },
      { centerPx: 2875, zone: 3 },
      { centerPx: 3268, zone: 3 },
      { centerPx: 3661, zone: 3 }
    ];

    const firstK = Math.floor((viewLeft - archAnchor) / periodWorld) - 1;
    const lastK = Math.ceil((viewRight - archAnchor) / periodWorld) + 1;

    for (let k = firstK; k <= lastK; k++) {
      const baseWx = archAnchor + k * periodWorld;
      for (let b = 0; b < bayDefs.length; b++) {
        const bay = bayDefs[b];
        const cx = baseWx + bay.centerPx * PANO_SCALE;
        if (cx + 820 < viewLeft || cx - 820 > viewRight) continue;

        const z = infernoAlpha > 0.65 ? 3 : bay.zone;
        const flickA = 0.78 + 0.22 * Math.sin(t * 7.4 + b * 1.9);
        const flickB = 0.78 + 0.22 * Math.cos(t * 6.8 + b * 2.3);

        if (z === 0) {
          drawSubtleGlow(ctx, renderer.glowCyan, cx - 540, 175, 130, 130, 0.14 * flickA);
          drawSubtleGlow(ctx, renderer.glowCyan, cx - 350, 225, 95, 95, 0.12 * flickB);
          drawSubtleGlow(ctx, renderer.glowOrange, cx + 350, 230, 95, 95, 0.12 * flickA);
          drawSubtleGlow(ctx, renderer.glowGold || renderer.glowOrange, cx + 545, 180, 130, 130, 0.14 * flickB);
        } else if (z === 1) {
          drawSubtleGlow(ctx, renderer.glowEmerald || renderer.glowCyan, cx - 350, 35, 110, 110, 0.13 * flickA);
          drawSubtleGlow(ctx, renderer.glowCyan, cx - 355, 235, 95, 95, 0.12 * flickB);
          drawSubtleGlow(ctx, renderer.glowEmerald || renderer.glowCyan, cx + 350, 35, 110, 110, 0.13 * flickB);
          drawSubtleGlow(ctx, renderer.glowCyan, cx + 360, 235, 95, 95, 0.12 * flickA);

          for (let s = 0; s < 6; s++) {
            const cyc = (t * (0.24 + (s % 3) * 0.07) + s * 0.31 + b) % 1;
            const sx = Math.round(cx - 260 + s * 104 + Math.sin(t * 1.9 + s) * 18);
            const sy = Math.round(395 - cyc * 360);
            ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.72;
            ctx.fillStyle = s % 2 === 0 ? '#5eead4' : '#34d399';
            ctx.fillRect(sx, sy, 3, 3);
          }
          ctx.globalAlpha = 1;
        } else if (z === 2) {
          drawSubtleGlow(ctx, renderer.glowViolet, cx - 560, 210, 125, 125, 0.15 * flickA);
          drawSubtleGlow(ctx, renderer.glowViolet, cx - 355, 250, 90, 90, 0.12 * flickB);
          drawSubtleGlow(ctx, renderer.glowViolet, cx + 355, 250, 90, 90, 0.12 * flickA);
          drawSubtleGlow(ctx, renderer.glowViolet, cx + 560, 210, 125, 125, 0.15 * flickB);

          for (let w = 0; w < 6; w++) {
            const cyc = (t * (0.32 + (w % 2) * 0.09) + w * 0.27 + b) % 1;
            const wx = Math.round(cx - 250 + w * 100 + Math.cos(t * 2.4 + w) * 16);
            const wy = Math.round(415 - cyc * 340);
            ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.76;
            ctx.fillStyle = w % 2 === 0 ? '#d8b4fe' : '#a855f7';
            ctx.fillRect(wx, wy, 3, 4);
          }
          ctx.globalAlpha = 1;
        } else {
          const hotGlow = renderer.glowCrimson || renderer.glowOrange;
          drawSubtleGlow(ctx, hotGlow, cx - 545, 190, 135, 135, 0.16 * flickA);
          drawSubtleGlow(ctx, renderer.glowOrange, cx - 355, 235, 95, 95, 0.13 * flickB);
          drawSubtleGlow(ctx, renderer.glowOrange, cx + 355, 235, 95, 95, 0.13 * flickA);
          drawSubtleGlow(ctx, hotGlow, cx + 545, 190, 135, 135, 0.16 * flickB);

          for (let e = 0; e < 7; e++) {
            const cyc = (t * (0.46 + (e % 3) * 0.11) + e * 0.23 + b) % 1;
            const ex = Math.round(cx - 270 + e * 90 + Math.sin(t * 3.1 + e) * 20);
            const ey = Math.round(420 - cyc * 390);
            ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.82;
            ctx.fillStyle = e % 2 === 0 ? '#fde047' : '#fb923c';
            ctx.fillRect(ex, ey, 3, 3);
          }
          ctx.globalAlpha = 1;
        }
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

    const isInfernoPerm = renderer.permanentStageOverride === 'inferno';
    const infernoAlpha = isInfernoPerm
      ? 1.0
      : renderer.trueUltStageOverride === 'inferno'
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
    skyGrad.addColorStop(0, infernoAlpha > 0.5 ? '#0c0507' : '#04060e');
    skyGrad.addColorStop(0.55, infernoAlpha > 0.5 ? '#1a0a0d' : '#080c1a');
    skyGrad.addColorStop(1, infernoAlpha > 0.5 ? '#261012' : '#0d1326');
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

    // Top edge feather blending `advVistaPano` (`ARCH_WORLD_TOP_Y = -257`) into Plane 0 sky vault
    const topBlendGrad = ctx.createLinearGradient(0, ARCH_WORLD_TOP_Y - 6, 0, ARCH_WORLD_TOP_Y + 56);
    topBlendGrad.addColorStop(0, infernoAlpha > 0.5 ? '#15080b' : '#070a16');
    topBlendGrad.addColorStop(1, 'rgba(7, 10, 22, 0)');
    ctx.fillStyle = topBlendGrad;
    ctx.fillRect(viewLeft, ARCH_WORLD_TOP_Y - 8, viewW, 66);

    // =========================================================================
    // PLANE 1.5 (`0.70x`): MID-CHASM DRIFTING CANYON MIST VEIL (`y: 165 .. 446`)
    // =========================================================================
    const mistR = Math.round(
      26 * camWeights[0] + 18 * camWeights[1] + 54 * camWeights[2] + 78 * camWeights[3] + infernoAlpha * 55
    );
    const mistG = Math.round(
      38 * camWeights[0] + 64 * camWeights[1] + 28 * camWeights[2] + 24 * camWeights[3]
    );
    const mistB = Math.round(
      62 * camWeights[0] + 68 * camWeights[1] + 76 * camWeights[2] + 30 * camWeights[3]
    );
    const canyonMist = ctx.createLinearGradient(0, 175, 0, ADVENTURE_ROAD_TOP_Y + 8);
    canyonMist.addColorStop(0, `rgba(${mistR},${mistG},${mistB},0)`);
    canyonMist.addColorStop(0.62, `rgba(${mistR},${mistG},${mistB},0.16)`);
    canyonMist.addColorStop(1, 'rgba(8, 11, 20, 0.34)');
    ctx.fillStyle = canyonMist;
    ctx.fillRect(viewLeft, 175, viewW, ADVENTURE_ROAD_TOP_Y - 167);

    const mistAnchor = (1 - 0.70) * camX - t * 18;
    const mistStep = 420;
    const mStart = Math.floor((viewLeft - mistAnchor) / mistStep) - 1;
    const mEnd = Math.ceil((viewRight - mistAnchor) / mistStep) + 1;
    for (let m = mStart; m <= mEnd; m++) {
      const mx = Math.round(mistAnchor + m * mistStep + Math.sin(t * 0.9 + m) * 24);
      const my = 295 + (Math.abs(m) % 3) * 34;
      const mGlow =
        infernoAlpha > 0.45 || camWeights[3] > 0.45
          ? renderer.glowCrimson || renderer.glowOrange
          : camWeights[2] > 0.45
            ? renderer.glowViolet
            : camWeights[1] > 0.45
              ? renderer.glowEmerald || renderer.glowCyan
              : renderer.glowCyan;
      drawSubtleGlow(ctx, mGlow, mx, my, 195, 44, 0.08);
    }

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

    AdventureMapRenderer.renderLiveArchEffects(ctx, renderer, camX, viewLeft, viewRight, t, infernoAlpha);

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
  // PLANE 4 (`1.24x`): NEAR-CAMERA FOREGROUND PARALLAX FRAMING (Rendered AFTER fighters!)
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

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let f = firstFg; f <= lastFg; f++) {
      const fx = Math.round(fgAnchor + f * fgPeriod);

      // 1. Near-Camera Foreground Abyssal Cliff Buttress Silhouette (`y = 690 .. viewBot`)
      const buttW = 92;
      const buttH = Math.max(90, viewBot - 688);
      ctx.fillStyle = 'rgba(5, 7, 14, 0.86)';
      ctx.fillRect(fx - 46, 692, buttW, buttH);
      ctx.fillStyle = 'rgba(22, 30, 48, 0.55)';
      ctx.fillRect(fx - 42, 690, buttW - 8, 5);

      // 2. High Overhead Vaulted Chain Silhouette (`y = viewTop .. -56`, visible on high aerial leaps!)
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

    ctx.restore();
  }
}
