import { PixelForge } from '../engine/PixelForge.js?v=30fps92';

/**
 * Seamless Multi-Plane HD-2D Adventure World Panorama Renderer (`AdventureMapRenderer`)
 *
 * Renders the bespoke "Abyssal Eclipse Pilgrimage" 5-plane panoramic stage across
 * the continuous 4800px 2.5D campaign (`X: -∞..+∞`, walkable depth `Z/Y: 442..680`):
 *   - Plane 0 (`0.14x`): Upper Abyssal Star-Cosmos & Nebula Vault (`viewTop .. -240`)
 *   - Plane 1 (`0.38x`): `advVistaPano` (`1176x272`) — Continuous Abyssal Solar Eclipse,
 *                        Gothic Viaducts, Cursed Starwood Waterfalls, Sunken Violet
 *                        Bone-Viaduct Citadel & Smoldering Black Pit Magma Volcanoes
 *   - Plane 1.5 (`0.62x`): Mid-Chasm Drifting Canyon Mist & Atmospheric Depth Veils
 *   - Plane 2 (`0.86x`): `advArchPano` (`2358x272` RGBA) — Organic Sky-Keyed Ruined Gothic
 *                        Eclipse Colonnade, Overgrown Spirit-Trees & Crystal Lanterns,
 *                        Ossuary Gargoyle Portcullis Gate & Scorched Black Pit Obsidian Arch
 *   - Plane 3 (`1.00x`): `advFloorPano` (`2742x96`) — Grounded Wet Carved Rune, Elven,
 *                        Ossuary & Molten-Cracked Obsidian Causeway + Shattered Caldera Boss Chasm
 *   - Plane 4 (`1.24x`): Near-Camera Foreground Vault Spandrels, Hanging Chains & Cliff Buttresses
 *
 * Strictly zero canvas rotation calls, crisp integer pixel coordinates, subtle additive
 * bloom (`alpha <= 0.18`), and seamless periodic wrap tiling.
 */

export const ADVENTURE_ROAD_TOP_Y = 436;
export const ADVENTURE_ROAD_BOT_Y = 686;

const SELOUT = '#0d0f1c';
const CALDERA_CHASM_MIN_X = 3650;
const CALDERA_CHASM_MAX_X = 3935;

const PANO_SCALE = 2.625;
const PANO_ORIGIN_WORLD_X = -840.0;
const ARCH_WORLD_TOP_Y = Math.round(ADVENTURE_ROAD_TOP_Y - 264 * PANO_SCALE); // -257
const ARCH_WORLD_H = Math.round(272 * PANO_SCALE); // 714 (`-257 .. +457`)
const FLOOR_WORLD_H = Math.round(96 * PANO_SCALE); // 252 (`436 .. 688`)

// Retained landmark metadata for campaign zone queries & tooling
export const ADVENTURE_LANDMARKS = [
  { id: 'eclipse_gatehouse', zone: 0, x: 210, halfW: 148, height: 274, isArtifact: false },
  { id: 'astral_orrery', zone: 0, x: 585, halfW: 106, height: 236, isArtifact: true },
  { id: 'reliquary_chapel', zone: 0, x: 965, halfW: 134, height: 248, isArtifact: false },
  { id: 'elven_moonwell', zone: 1, x: 1410, halfW: 150, height: 268, isArtifact: false },
  { id: 'yggdrasil_waygate', zone: 1, x: 1805, halfW: 114, height: 250, isArtifact: true },
  { id: 'starwood_scriptorium', zone: 1, x: 2195, halfW: 128, height: 260, isArtifact: false },
  { id: 'ossuary_mausoleum', zone: 2, x: 2610, halfW: 145, height: 264, isArtifact: false },
  { id: 'soul_reliquary_spire', zone: 2, x: 3005, halfW: 112, height: 258, isArtifact: true },
  { id: 'bone_gate_bastion', zone: 2, x: 3405, halfW: 154, height: 282, isArtifact: false },
  { id: 'caldera_boss_chasm', zone: 3, x: 3792, halfW: 146, height: 214, isChasm: true },
  { id: 'demon_forge_citadel', zone: 3, x: 4165, halfW: 154, height: 284, isArtifact: false },
  { id: 'hellfire_crucible_monoliths', zone: 3, x: 4565, halfW: 140, height: 270, isArtifact: true }
];

const ROAD_COURSES = (() => {
  const heights = [16, 18, 20, 22, 24, 26, 28, 30, 32, 34];
  const list = [];
  let curY = ADVENTURE_ROAD_TOP_Y;
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    list.push({ row: i, y: curY, h, t: i / (heights.length - 1) });
    curY += h;
  }
  return list;
})();

function hash2D(ix, iy) {
  let n = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function pxFill(ctx, x, y, w, h, color) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(rx, ry, rw, rh);
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

function drawPixelDisc(ctx, cx, cy, r, fillCol, rimCol = null) {
  const ir = Math.max(2, Math.round(r));
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  for (let dy = -ir; dy <= ir; dy += 2) {
    const span = Math.round(Math.sqrt(Math.max(0, ir * ir - dy * dy)));
    if (span <= 0) continue;
    ctx.fillStyle = SELOUT;
    ctx.fillRect(icx - span - 1, icy + dy, span * 2 + 2, 2);
    ctx.fillStyle = rimCol && Math.abs(dy) >= ir - 2 ? rimCol : fillCol;
    ctx.fillRect(icx - span, icy + dy, span * 2, 2);
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
  // World X where texture pixel `sx = 0` (`lx_world = PANO_ORIGIN_WORLD_X`) sits for current `camX`:
  // wx - (1 - p) * camX = PANO_ORIGIN_WORLD_X + k * tileWorldW
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
    const t01 = smoothstep(880, 1520, wx);
    const t12 = smoothstep(2080, 2720, wx);
    const t23 = smoothstep(3280, 3920, wx);
    return [1 - t01, t01 * (1 - t12), t12 * (1 - t23), t23];
  }

  // ===========================================================================
  // LEFT-SIDE SHATTERED CALDERA BOSS CHASM (`x: 3650..3935, y: 432..686`)
  // ===========================================================================
  static renderCalderaBossChasm(ctx, renderer, t, infernoAlpha) {
    const xL = CALDERA_CHASM_MIN_X;
    const xR = CALDERA_CHASM_MAX_X;
    const chasmW = xR - xL;
    const topY = 432;
    const botY = ADVENTURE_ROAD_BOT_Y;
    const pulse = 0.76 + 0.24 * Math.sin(t * 4.4);

    // 1. Deep Abyssal Pit Throat & Stepped Basalt Chasm Walls
    pxFill(ctx, xL + 18, topY, chasmW - 36, botY - topY + 28, '#05040a');
    pxFill(ctx, xL + 26, topY + 8, chasmW - 52, 82, '#160a0e');
    pxFill(ctx, xL + 32, topY + 34, chasmW - 64, 62, '#291116');

    for (let col = 0; col < 9; col++) {
      const rx = xL + 34 + col * 26;
      const rh = 68 + Math.round(hash2D(col, 901) * 44);
      seloutBlock(ctx, rx, topY + 6, 20, rh, '#241116', '#451d24', '#12070a');
      if (col % 2 === 1) {
        pxFill(ctx, rx + 8, topY + 18, 4, rh - 20, '#dc2626');
      }
    }

    // 2. Bubbling Incandescent Magma Pool (`y: 512..686`)
    const magmaTop = 512;
    pxFill(ctx, xL + 24, magmaTop, chasmW - 48, botY - magmaTop + 20, '#7f1d1d');
    pxFill(ctx, xL + 32, magmaTop + 10, chasmW - 64, botY - magmaTop + 8, '#b91c1c');

    for (let row = 0; row < 7; row++) {
      const my = magmaTop + 12 + row * 24;
      const drift = Math.round(Math.sin(t * 2.3 + row * 1.4) * 10);
      const bandW = chasmW - 84 - (row % 2) * 18;
      pxFill(ctx, xL + 42 + drift, my, bandW, 12, row % 2 === 0 ? '#ea580c' : '#dc2626');
      pxFill(ctx, xL + 58 - drift, my + 3, Math.round(bandW * 0.62), 6, '#fb923c');
      if (row % 2 === 0) {
        pxFill(ctx, xL + 84 + drift, my + 4, 54, 3, '#fde047');
      }
      const crustX = xL + 54 + ((row * 57) % 150);
      seloutBlock(ctx, crustX - drift * 0.5, my + 6, 34, 10, '#1f1014', '#3b1c22');
    }

    for (let b = 0; b < 8; b++) {
      const cyc = (t * (0.9 + (b % 3) * 0.32) + b * 0.37) % 1;
      const bx = xL + 56 + ((b * 43) % (chasmW - 112));
      const by = magmaTop + 24 + ((b * 29) % 132);
      if (cyc < 0.62) {
        const br = 3 + Math.round((cyc / 0.62) * 5);
        drawPixelDisc(ctx, bx, by, br, '#fb923c', '#fef08a');
      } else {
        const rise = Math.round(((cyc - 0.62) / 0.38) * 54);
        pxFill(ctx, bx - 2, by - rise, 4, 4, '#fde047');
        pxFill(ctx, bx + 6, by - Math.round(rise * 0.7), 3, 3, '#fb923c');
      }
    }

    const glowHot = renderer.glowCrimson || renderer.glowOrange;
    drawSubtleGlow(ctx, glowHot, (xL + xR) * 0.5, 585, 165, 98, 0.17 * pulse);
    drawSubtleGlow(ctx, renderer.glowOrange, 3845, 560, 125, 76, 0.14 * pulse);

    // 3. Heavy Pixel-Stepped Abyssal Chains Straining into the Pit
    const chainAnchors = [
      { ax: xL + 22, ay: 468, tx: 3826, ty: 562 },
      { ax: xL + 26, ay: 632, tx: 3828, ty: 590 },
      { ax: xR - 22, ay: 472, tx: 3864, ty: 558 },
      { ax: xR - 24, ay: 638, tx: 3862, ty: 594 }
    ];
    for (let c = 0; c < chainAnchors.length; c++) {
      const ch = chainAnchors[c];
      const links = 11;
      for (let k = 0; k <= links; k++) {
        const u = k / links;
        const sag = Math.sin(u * Math.PI) * 16;
        const lx = Math.round(ch.ax + (ch.tx - ch.ax) * u);
        const ly = Math.round(ch.ay + (ch.ty - ch.ay) * u + sag);
        seloutBlock(
          ctx,
          lx - 5,
          ly - 4,
          10,
          8,
          k % 2 === 0 ? '#334155' : '#1e293b',
          k > 7 ? '#fb923c' : '#64748b'
        );
        if (k > 6) {
          pxFill(ctx, lx - 2, ly - 1, 4, 2, '#fde047');
        }
      }
    }

    // 4. Sheared Broken Bridge Masonry & Obsidian Rim Crags
    for (let r = 0; r < ROAD_COURSES.length; r++) {
      const course = ROAD_COURSES[r];
      const cy = course.y;
      const ch = course.h;
      const jutL = 22 + Math.round(hash2D(r, 933) * 26);
      const jutR = 24 + Math.round(hash2D(r, 947) * 28);
      const stoneBase = infernoAlpha > 0.4 ? '#381914' : '#24151c';
      const stoneLit = infernoAlpha > 0.4 ? '#632c20' : '#462834';

      seloutBlock(ctx, xL - 10, cy, jutL + 10, ch, stoneBase, stoneLit, '#160b0e');
      pxFill(ctx, xL + jutL - 4, cy + ch - 2, 6, 12, SELOUT);
      if (r % 2 === 0) pxFill(ctx, xL + jutL - 8, cy + 4, 6, 3, '#fb923c');

      seloutBlock(ctx, xR - jutR, cy, jutR + 12, ch, stoneBase, stoneLit, '#160b0e');
      pxFill(ctx, xR - jutR - 2, cy + ch - 2, 6, 12, SELOUT);
      if (r % 2 === 1) pxFill(ctx, xR - jutR + 3, cy + 4, 6, 3, '#fb923c');
    }

    for (const bx of [xL + 16, xR - 16]) {
      seloutBlock(ctx, bx - 14, 448, 28, 30, '#271519', '#572e35', '#13090b');
      pxFill(ctx, bx - 8, 454, 16, 4, '#f59e0b');
      seloutBlock(ctx, bx - 14, 618, 28, 32, '#271519', '#572e35', '#13090b');
      pxFill(ctx, bx - 8, 624, 16, 4, '#f59e0b');
    }

    for (let k = 0; k < 7; k++) {
      const fx = xL + 26 + k * 38;
      const fh = 16 + (k % 3) * 6;
      seloutBlock(ctx, fx, botY - fh + 6, 26, fh + 18, '#1b0d11', '#3f1d24', '#0b0507');
      pxFill(ctx, fx + 8, botY - fh + 10, 6, 3, '#ef4444');
    }
  }

  // ===========================================================================
  // LIVE SYNCHRONIZED STAGE ATMOSPHERICS ON PLANE 1 (`0.38x`) & PLANE 2 (`0.86x`)
  // ===========================================================================
  static renderLiveArchEffects(ctx, renderer, camX, viewLeft, viewRight, t, infernoAlpha) {
    // Anchor in `0.86x` layer space (`step = 393 * 2.625 = 1031.625` world px per bay!)
    const archAnchor = PANO_ORIGIN_WORLD_X + (1 - 0.86) * camX;
    const periodWorld = 2358 * PANO_SCALE; // 6189.75

    // Bay centers in art px on `adv_arch_pano.png` (`2358px`):
    //   Bay 0: 124 (Eclipse bleed), Bay 1: 517 (Zone I Eclipse), Bay 2: 910 (Zone II Starwood),
    //   Bay 3: 1303 (Zone III Bone-Gate), Bay 4: 1696 (Zone IV Black Pit), Bay 5: 2089 (Black Pit bleed)
    const bayDefs = [
      { centerPx: 124, zone: 0 },
      { centerPx: 517, zone: 0 },
      { centerPx: 910, zone: 1 },
      { centerPx: 1303, zone: 2 },
      { centerPx: 1696, zone: 3 },
      { centerPx: 2089, zone: 3 }
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
          // Zone I Eclipse Outskirts: Cyan left braziers + Solar right braziers + rising sparks
          drawSubtleGlow(ctx, renderer.glowCyan, cx - 540, 175, 130, 130, 0.14 * flickA);
          drawSubtleGlow(ctx, renderer.glowCyan, cx - 350, 225, 95, 95, 0.12 * flickB);
          drawSubtleGlow(ctx, renderer.glowOrange, cx + 350, 230, 95, 95, 0.12 * flickA);
          drawSubtleGlow(ctx, renderer.glowGold || renderer.glowOrange, cx + 545, 180, 130, 130, 0.14 * flickB);
        } else if (z === 1) {
          // Zone II Cursed Starwood: Emerald/Cyan crystal lanterns & drifting bioluminescent spores
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
          // Zone III Abyssal Bone-Gate: Violet soul-fire braziers & rising spectral wraith wisps
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
          // Zone IV Throne of the Black Pit: Roaring crimson-amber obsidian braziers & spiral cinders
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
    // PLANE 1 (`0.52x`): FAR ABYSSAL ECLIPSE CANYON VISTA (`advVistaPano`, `1620x272`)
    // =========================================================================
    drawWrappedPanorama(
      ctx,
      assets?.advVistaPano,
      0,
      272,
      0.52,
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

    // Drifting `0.70x` mid-chasm mist wisps for visible motion between Vista (`0.52x`) and Arches (`0.86x`)
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
    // PLANE 2 (`0.86x`): GOTHIC PILGRIMAGE COLONNADE (`advArchPano`, `2358x272` RGBA)
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
      2358
    );

    // Seamless `LAYWASTE OF INFERNO` Supreme Ultimate Transformation Overlay (`advInfernoPano` upper `0..272`)
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

    // Live `0.86x`-locked flickering brazier/lantern light halos & rising embers
    AdventureMapRenderer.renderLiveArchEffects(ctx, renderer, camX, viewLeft, viewRight, t, infernoAlpha);

    // =========================================================================
    // PLANE 3 (`1.00x`): WALKABLE PERSPECTIVE STONE CAUSEWAY (`advFloorPano`, `2742x96`)
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
      2742
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

    // Subtle grounded contact occlusion right under the `y = 436` stone curb (`alpha <= 0.22`)
    const curbShadow = ctx.createLinearGradient(0, ADVENTURE_ROAD_TOP_Y - 2, 0, ADVENTURE_ROAD_TOP_Y + 14);
    curbShadow.addColorStop(0, 'rgba(4, 6, 12, 0.24)');
    curbShadow.addColorStop(0.45, 'rgba(4, 6, 12, 0.14)');
    curbShadow.addColorStop(1, 'rgba(4, 6, 12, 0)');
    ctx.fillStyle = curbShadow;
    ctx.fillRect(viewLeft, ADVENTURE_ROAD_TOP_Y - 2, viewW, 16);

    // Zone IV Left-Side Shattered Caldera Boss Chasm (`x: 3650..3935`) + Boss Sanctuary Seal (`x: 4340`)
    if (viewRight > CALDERA_CHASM_MIN_X - 80 && viewLeft < CALDERA_CHASM_MAX_X + 80) {
      AdventureMapRenderer.renderCalderaBossChasm(ctx, renderer, t, infernoAlpha);
    }

    const bossSealX = 4340;
    const bossSealY = 561;
    if (bossSealX + 220 > viewLeft && bossSealX - 220 < viewRight) {
      const sealPulse = 0.65 + 0.35 * Math.sin(t * 3.1);
      ctx.save();
      ctx.globalAlpha = 0.24 + 0.08 * sealPulse;
      ctx.strokeStyle = infernoAlpha > 0.4 ? '#fb923c' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(bossSealX, bossSealY, 148, 52, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(bossSealX, bossSealY, 108, 38, 0, 0, Math.PI * 2);
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

    // Crisp carved stone bridge coping lip along `y = 686..704` (broken cleanly at the Caldera Chasm)
    const copingW = 64;
    const cFirst = Math.floor(viewLeft / copingW) - 1;
    const cLast = Math.ceil(viewRight / copingW) + 1;
    for (let c = cFirst; c <= cLast; c++) {
      const cx = c * copingW;
      if (cx + copingW > CALDERA_CHASM_MIN_X + 20 && cx < CALDERA_CHASM_MAX_X - 20) continue;
      const isWarm = infernoAlpha > 0.45 || cx >= 3520;
      const isBone = !isWarm && cx >= 2350;
      const isSylv = !isWarm && !isBone && cx >= 1150;
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

    // `p = 1.24`: Foreground stone buttress silhouettes & upper hanging chains scroll 24% faster than `1.0x`!
    // Kept strictly below `y = 688` and above `y = -48` so characters (`y = 442..680`) are NEVER obstructed!
    const fgAnchor = (1 - 1.24) * camX; // -0.24 * camX
    const fgPeriod = 520;
    const firstFg = Math.floor((viewLeft - fgAnchor) / fgPeriod) - 1;
    const lastFg = Math.ceil((viewRight - fgAnchor) / fgPeriod) + 1;
    const t = renderer.time || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let f = firstFg; f <= lastFg; f++) {
      const fx = Math.round(fgAnchor + f * fgPeriod);
      if (fx > CALDERA_CHASM_MIN_X - 40 && fx < CALDERA_CHASM_MAX_X + 40) continue;

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
