/**
 * Adventure3DObjects — True 3D Camera-Perspective HD-2D Stage Architecture & Relics
 *
 * Brings genuine Octopath-style 3D polyhedral & extruded stage geometry into the 9600px
 * 4-Realm Adventure Mode while preserving 100% crisp pixel-art aesthetics & lossless 60fps:
 *  - Real pinhole 3D perspective projection (`F = 920`) relative to `(camX, eyeY)`:
 *    left (`-X`) and right (`+X`) masonry walls, bevels, and capitals physically swing into
 *    and out of view via 3D backface culling as the player runs across each realm.
 *  - Dynamic 3D Lambertian face-normal lighting reacting to realm light + stage overrides
 *    (`inferno`, `glacial`, `shogunate`) + Boss Phase overdrive.
 *  - Articulated 3D rotating setpieces per Realm (Brass Armillary Octahedrons, Sylvan Emerald
 *    Monolith Prisms, Swinging 3D Iron Soul-Cages, Chained Obsidian Boss Sanctuary Pylons &
 *    Rotating 3D Hellfire Sovereign Gyro-Seal).
 *  - Zero per-frame heap allocations (pre-allocated vertex & painter-sorted face pools),
 *    strict camera frustum culling, `1px` `#0d0f1c` Selout outlines, integer pixel snapping,
 *    and ZERO `ctx.rotate` or `quadraticCurveTo` calls.
 */

const SELOUT = '#0d0f1c';
const FOCAL_LEN = 920;
const MAX_POOL_FACES = 192;

// Pre-allocated face pool for zero-GC painter's depth sorting
const FACE_POOL = Array.from({ length: MAX_POOL_FACES }, () => ({
  n: 0,
  x0: 0,
  y0: 0,
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
  x3: 0,
  y3: 0,
  zDepth: 0,
  fill: '#1e293b',
  stroke: SELOUT
}));
const FACE_SORT_REFS = new Array(MAX_POOL_FACES);

// Reusable 8-vertex scratch buffer for extruded 3D boxes / frustums
const V_WX = new Float64Array(16);
const V_WY = new Float64Array(16);
const V_WZ = new Float64Array(16);
const V_SX = new Int32Array(16);
const V_SY = new Int32Array(16);

const ZONE_THEMES = [
  // Zone 0: Eclipse Cathedral (`0..2400`) — Moonlit Slate Stone, Gilded Brass & Astral Cyan
  {
    stoneBase: [38, 50, 74],
    stoneCap: [54, 70, 102],
    stoneTrim: [184, 142, 46],
    crystalBase: [28, 152, 224],
    crystalCore: '#bae6fd',
    glowHex: '#38bdf8',
    lightDir: [-0.38, -0.68, 0.62]
  },
  // Zone 1: Cursed Starwood (`2400..4800`) — Mossy Jade Basalt, Ancient Timber & Sylvan Emerald
  {
    stoneBase: [26, 56, 54],
    stoneCap: [38, 78, 74],
    stoneTrim: [122, 92, 54],
    crystalBase: [24, 188, 138],
    crystalCore: '#a7f3d0',
    glowHex: '#34d399',
    lightDir: [-0.32, -0.74, 0.59]
  },
  // Zone 2: Bone-Bridge Necropolis (`4800..7200`) — Obsidian Violet Ashlar, Iron & Necrotic Amethyst
  {
    stoneBase: [40, 30, 62],
    stoneCap: [58, 44, 88],
    stoneTrim: [126, 134, 156],
    crystalBase: [168, 72, 238],
    crystalCore: '#f5d0fe',
    glowHex: '#c084fc',
    lightDir: [-0.42, -0.66, 0.62]
  },
  // Zone 3: Throne of the Black Pit (`7200..9600`) — Chained Volcanic Obsidian, Bronze & Molten Magma
  {
    stoneBase: [46, 22, 26],
    stoneCap: [68, 32, 36],
    stoneTrim: [196, 112, 34],
    crystalBase: [239, 88, 36],
    crystalCore: '#fef08a',
    glowHex: '#fb923c',
    lightDir: [0.44, -0.62, 0.65]
  }
];

const INFERNO_THEME = {
  stoneBase: [56, 22, 22],
  stoneCap: [82, 34, 30],
  stoneTrim: [224, 128, 32],
  crystalBase: [249, 105, 28],
  crystalCore: '#fef08a',
  glowHex: '#fb923c',
  lightDir: [0.35, -0.66, 0.66]
};

const GLACIAL_THEME = {
  stoneBase: [28, 56, 86],
  stoneCap: [48, 92, 134],
  stoneTrim: [148, 212, 246],
  crystalBase: [56, 198, 248],
  crystalCore: '#ffffff',
  glowHex: '#67e8f9',
  lightDir: [-0.30, -0.74, 0.60]
};

const SHOGUNATE_THEME = {
  stoneBase: [48, 34, 52],
  stoneCap: [72, 48, 76],
  stoneTrim: [212, 152, 68],
  crystalBase: [244, 96, 132],
  crystalCore: '#ffe4e6',
  glowHex: '#fda4af',
  lightDir: [-0.36, -0.70, 0.61]
};

function shadeRgb(rgb, factor, warmBoost = 0) {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0] * factor + warmBoost * 28)));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1] * factor + warmBoost * 10)));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2] * factor)));
  return `rgb(${r},${g},${b})`;
}

function resolveThemeForX(wx, renderer, infernoAlpha = 0) {
  const perm = renderer?.permanentStageOverride;
  if (perm === 'glacial' || perm === 'shogunate_glacial') return GLACIAL_THEME;
  if (infernoAlpha > 0.55 || perm === 'inferno' || perm === 'shogunate_inferno') return INFERNO_THEME;
  if (perm === 'shogunate') return SHOGUNATE_THEME;
  if (wx >= 7200) return ZONE_THEMES[3];
  if (wx >= 4800) return ZONE_THEMES[2];
  if (wx >= 2400) return ZONE_THEMES[1];
  return ZONE_THEMES[0];
}

function projectVerts(count, camX, eyeY) {
  for (let i = 0; i < count; i++) {
    const denom = Math.max(220, FOCAL_LEN - V_WZ[i]);
    const scale = FOCAL_LEN / denom;
    V_SX[i] = Math.round(camX + (V_WX[i] - camX) * scale);
    V_SY[i] = Math.round(eyeY + (V_WY[i] - eyeY) * scale);
  }
}

function pushQuadFace(
  faceCount,
  i0,
  i1,
  i2,
  i3,
  rgb,
  lightDir,
  warmBoost = 0,
  stroke = SELOUT
) {
  if (faceCount >= MAX_POOL_FACES) return faceCount;
  const x0 = V_SX[i0];
  const y0 = V_SY[i0];
  const x1 = V_SX[i1];
  const y1 = V_SY[i1];
  const x2 = V_SX[i2];
  const y2 = V_SY[i2];
  const x3 = V_SX[i3];
  const y3 = V_SY[i3];

  // Screen-space signed area backface cull (clockwise in Y-down screen coords = front-facing)
  const area2 = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (area2 <= 1) return faceCount;

  // 3D surface normal via world-space cross product `(V1 - V0) x (V2 - V0)`
  const ux = V_WX[i1] - V_WX[i0];
  const uy = V_WY[i1] - V_WY[i0];
  const uz = V_WZ[i1] - V_WZ[i0];
  const vx = V_WX[i2] - V_WX[i0];
  const vy = V_WY[i2] - V_WY[i0];
  const vz = V_WZ[i2] - V_WZ[i0];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const nLen = Math.hypot(nx, ny, nz) || 1;
  nx /= nLen;
  ny /= nLen;
  nz /= nLen;

  // Cel-stepped 4-band HD-2D Lambertian lighting so faces look crisp 16-bit rather than smooth gouraud
  const ndotl = nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2];
  const raw = 0.68 + Math.max(-0.28, Math.min(0.68, ndotl * 0.72));
  const cel = Math.round(raw * 6) / 6;

  const f = FACE_POOL[faceCount];
  f.n = 4;
  f.x0 = x0;
  f.y0 = y0;
  f.x1 = x1;
  f.y1 = y1;
  f.x2 = x2;
  f.y2 = y2;
  f.x3 = x3;
  f.y3 = y3;
  f.zDepth = (V_WZ[i0] + V_WZ[i1] + V_WZ[i2] + V_WZ[i3]) * 0.25;
  f.fill = shadeRgb(rgb, cel, warmBoost);
  f.stroke = stroke;
  FACE_SORT_REFS[faceCount] = f;
  return faceCount + 1;
}

function pushTriFace(faceCount, i0, i1, i2, rgb, lightDir, warmBoost = 0, stroke = SELOUT) {
  if (faceCount >= MAX_POOL_FACES) return faceCount;
  const x0 = V_SX[i0];
  const y0 = V_SY[i0];
  const x1 = V_SX[i1];
  const y1 = V_SY[i1];
  const x2 = V_SX[i2];
  const y2 = V_SY[i2];

  const area2 = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (area2 <= 1) return faceCount;

  const ux = V_WX[i1] - V_WX[i0];
  const uy = V_WY[i1] - V_WY[i0];
  const uz = V_WZ[i1] - V_WZ[i0];
  const vx = V_WX[i2] - V_WX[i0];
  const vy = V_WY[i2] - V_WY[i0];
  const vz = V_WZ[i2] - V_WZ[i0];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const nLen = Math.hypot(nx, ny, nz) || 1;
  nx /= nLen;
  ny /= nLen;
  nz /= nLen;

  const ndotl = nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2];
  const raw = 0.74 + Math.max(-0.24, Math.min(0.72, ndotl * 0.78));
  const cel = Math.round(raw * 6) / 6;

  const f = FACE_POOL[faceCount];
  f.n = 3;
  f.x0 = x0;
  f.y0 = y0;
  f.x1 = x1;
  f.y1 = y1;
  f.x2 = x2;
  f.y2 = y2;
  f.zDepth = (V_WZ[i0] + V_WZ[i1] + V_WZ[i2]) / 3;
  f.fill = shadeRgb(rgb, cel, warmBoost);
  f.stroke = stroke;
  FACE_SORT_REFS[faceCount] = f;
  return faceCount + 1;
}

/**
 * Adds a 3D tapered box / architectural frustum centered at `(cx, _, cz)` spanning `yTop..yBot`.
 * Vertex winding guarantees outward normals in right-handed `(X right, Y down, Z toward viewer)`:
 *   Top (`0..3`):    `(-x,-z), (+x,-z), (+x,+z), (-x,+z)` at `yTop`
 *   Bottom (`4..7`): `(-x,-z), (+x,-z), (+x,+z), (-x,+z)` at `yBot`
 */
function emitTapered3DBox(
  faceCount,
  cx,
  yTop,
  yBot,
  cz,
  topHalfW,
  botHalfW,
  topHalfD,
  botHalfD,
  camX,
  eyeY,
  rgb,
  lightDir,
  warmBoost = 0,
  tiltX = 0
) {
  const tx = cx + tiltX;
  V_WX[0] = tx - topHalfW; V_WY[0] = yTop; V_WZ[0] = cz - topHalfD;
  V_WX[1] = tx + topHalfW; V_WY[1] = yTop; V_WZ[1] = cz - topHalfD;
  V_WX[2] = tx + topHalfW; V_WY[2] = yTop; V_WZ[2] = cz + topHalfD;
  V_WX[3] = tx - topHalfW; V_WY[3] = yTop; V_WZ[3] = cz + topHalfD;

  V_WX[4] = cx - botHalfW; V_WY[4] = yBot; V_WZ[4] = cz - botHalfD;
  V_WX[5] = cx + botHalfW; V_WY[5] = yBot; V_WZ[5] = cz - botHalfD;
  V_WX[6] = cx + botHalfW; V_WY[6] = yBot; V_WZ[6] = cz + botHalfD;
  V_WX[7] = cx - botHalfW; V_WY[7] = yBot; V_WZ[7] = cz + botHalfD;

  projectVerts(8, camX, eyeY);

  // Front face (+Z): 3 -> 2 -> 6 -> 7
  faceCount = pushQuadFace(faceCount, 3, 2, 6, 7, rgb, lightDir, warmBoost);
  // Left face (-X):  0 -> 3 -> 7 -> 4
  faceCount = pushQuadFace(faceCount, 0, 3, 7, 4, rgb, lightDir, warmBoost);
  // Right face (+X): 2 -> 1 -> 5 -> 6
  faceCount = pushQuadFace(faceCount, 2, 1, 5, 6, rgb, lightDir, warmBoost);
  // Top face (-Y):   0 -> 1 -> 2 -> 3
  faceCount = pushQuadFace(faceCount, 0, 1, 2, 3, rgb, lightDir, warmBoost);
  // Bottom face (+Y, visible on floating capitals / overhead lintels): 7 -> 6 -> 5 -> 4
  faceCount = pushQuadFace(faceCount, 7, 6, 5, 4, rgb, lightDir, warmBoost);
  return faceCount;
}

/**
 * Emits a 3D rotating 6-vertex / 8-face Arcane Octahedron Crystal at `(cx, cy, cz)`.
 */
function emitRotating3DOctahedron(
  faceCount,
  cx,
  cy,
  cz,
  radiusX,
  halfH,
  yawRad,
  camX,
  eyeY,
  rgb,
  lightDir,
  warmBoost = 0
) {
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);

  // 0: Top apex, 1: Bottom apex, 2..5: Equatorial ring rotated by yawRad
  V_WX[0] = cx; V_WY[0] = cy - halfH; V_WZ[0] = cz;
  V_WX[1] = cx; V_WY[1] = cy + halfH; V_WZ[1] = cz;

  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI * 0.5;
    const lx = Math.cos(a) * radiusX;
    const lz = Math.sin(a) * radiusX;
    V_WX[2 + k] = cx + lx * cosY - lz * sinY;
    V_WY[2 + k] = cy;
    V_WZ[2 + k] = cz + lx * sinY + lz * cosY;
  }

  projectVerts(6, camX, eyeY);

  for (let k = 0; k < 4; k++) {
    const cur = 2 + k;
    const nxt = 2 + ((k + 1) & 3);
    // Upper pyramid facet: 0 -> nxt -> cur
    faceCount = pushTriFace(faceCount, 0, nxt, cur, rgb, lightDir, warmBoost);
    // Lower pyramid facet: 1 -> cur -> nxt
    faceCount = pushTriFace(faceCount, 1, cur, nxt, rgb, lightDir, warmBoost);
  }
  return faceCount;
}

/**
 * Insertion-sorts `FACE_SORT_REFS[0..faceCount-1]` back-to-front (`zDepth` ascending) with 0 allocations,
 * then rasterizes crisp integer-snapped polygons with `1px` `#0d0f1c` Selout borders.
 */
function flushSortedFaces(ctx, faceCount) {
  for (let i = 1; i < faceCount; i++) {
    const key = FACE_SORT_REFS[i];
    const kz = key.zDepth;
    let j = i - 1;
    while (j >= 0 && FACE_SORT_REFS[j].zDepth > kz) {
      FACE_SORT_REFS[j + 1] = FACE_SORT_REFS[j];
      j--;
    }
    FACE_SORT_REFS[j + 1] = key;
  }

  ctx.lineWidth = 1;
  ctx.lineJoin = 'miter';
  for (let i = 0; i < faceCount; i++) {
    const f = FACE_SORT_REFS[i];
    ctx.beginPath();
    ctx.moveTo(f.x0, f.y0);
    ctx.lineTo(f.x1, f.y1);
    ctx.lineTo(f.x2, f.y2);
    if (f.n === 4) {
      ctx.lineTo(f.x3, f.y3);
    }
    ctx.closePath();
    ctx.fillStyle = f.fill;
    ctx.fill();
    ctx.strokeStyle = f.stroke;
    ctx.stroke();
  }
}

function drawPixelStarGlint(ctx, x, y, coreHex, outerHex, armPx = 5, alpha = 0.14) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const bloomA = Math.max(0.02, Math.min(0.16, alpha));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = bloomA;
  ctx.fillStyle = outerHex;
  ctx.fillRect(rx - armPx, ry - 1, armPx * 2 + 1, 2);
  ctx.fillRect(rx - 1, ry - armPx, 2, armPx * 2 + 1);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = Math.min(0.86, bloomA * 4.8);
  ctx.fillStyle = coreHex;
  ctx.fillRect(rx - 2, ry - 2, 4, 4);
  ctx.restore();
}

export class Adventure3DObjects {
  /**
   * Renders True-3D Extruded Colonnade Buttress Piers, Rotating 3D Realm Relics & Boss Sanctuary
   * Obsidian Seal Pylons along the upper causeway wall (`y = 438`, `wz ∈ [-88, +16]`).
   */
  static renderUpperColonnade3D(ctx, renderer, opts = {}) {
    if (!ctx || !renderer) return;
    const camX = Number.isFinite(opts.camX) ? opts.camX : renderer.camX || 600;
    const camY = Number.isFinite(opts.camY) ? opts.camY : renderer.camY || 445;
    const viewLeft = Number.isFinite(opts.viewLeft) ? opts.viewLeft : camX - 720;
    const viewRight = Number.isFinite(opts.viewRight) ? opts.viewRight : camX + 720;
    const t = Number.isFinite(opts.t) ? opts.t : renderer.time || 0;
    const infernoAlpha = opts.infernoAlpha || 0;
    const eyeY = camY - 38;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Realm-Matched 3D Extruded Architectural Buttress Piers & Rotating 3D Relic Shrines (every 520px)
    const pierSpacing = 520;
    const firstIdx = Math.max(0, Math.floor((viewLeft - 180) / pierSpacing));
    const lastIdx = Math.min(17, Math.ceil((viewRight + 180) / pierSpacing));

    for (let idx = firstIdx; idx <= lastIdx; idx++) {
      const wx = 260 + idx * pierSpacing;
      // Leave clear breathing room right around Behemoth Malphas's parapet (`x >= 9120`)
      if (wx > 9100) continue;

      const theme = resolveThemeForX(wx, renderer, infernoAlpha);
      const zoneIdx = wx >= 7200 ? 3 : wx >= 4800 ? 2 : wx >= 2400 ? 1 : 0;
      const warmPulse =
        zoneIdx === 3 || infernoAlpha > 0.45 ? 0.14 + 0.10 * Math.sin(t * 3.4 + idx) : 0;

      // Grounded contact shadow on the upper road curb (`y = 435..445`)
      ctx.fillStyle = 'rgba(4, 6, 14, 0.34)';
      ctx.fillRect(Math.round(wx - 42), 435, 84, 9);

      let fc = 0;
      const baseZ = -26;

      // Stepped 3D Plinth Base -> Tapered 3D Ashlar Shaft -> Corbelled 3D Capital
      fc = emitTapered3DBox(
        fc, wx, 396, 438, baseZ, 30, 35, 24, 28, camX, eyeY, theme.stoneBase, theme.lightDir, warmPulse
      );
      fc = emitTapered3DBox(
        fc, wx, 248, 396, baseZ - 4, 21, 26, 18, 22, camX, eyeY, theme.stoneBase, theme.lightDir, warmPulse
      );
      fc = emitTapered3DBox(
        fc, wx, 224, 248, baseZ - 2, 31, 23, 25, 19, camX, eyeY, theme.stoneCap, theme.lightDir, warmPulse
      );
      // Gilded / Trim 3D Crown Collar
      fc = emitTapered3DBox(
        fc, wx, 214, 224, baseZ - 2, 26, 29, 21, 23, camX, eyeY, theme.stoneTrim, theme.lightDir, warmPulse
      );

      // Realm-Specific Floating / Swinging 3D Polyhedral Setpiece above or in front of each odd/even pier!
      const bobY = Math.sin(t * 2.2 + idx * 1.3) * 7;
      if (zoneIdx === 0) {
        // Zone I (Eclipse Cathedral): Rotating 3D Brass Armillary Ring-Box + Astral Cyan Octahedron
        const yaw = t * 1.15 + idx * 0.9;
        fc = emitRotating3DOctahedron(
          fc, wx, 174 + bobY, baseZ + 2, 16, 26, yaw, camX, eyeY, theme.crystalBase, theme.lightDir, 0
        );
        // 3D Orbiting Brass Cardinal Nodes around the octahedron
        for (let k = 0; k < 2; k++) {
          const oa = -t * 1.8 + k * Math.PI + idx;
          const ox = wx + Math.cos(oa) * 28;
          const oz = baseZ + 2 + Math.sin(oa) * 24;
          fc = emitTapered3DBox(
            fc, ox, 170 + bobY, 178 + bobY, oz, 4, 4, 4, 4, camX, eyeY, theme.stoneTrim, theme.lightDir, 0
          );
        }
      } else if (zoneIdx === 1) {
        // Zone II (Cursed Starwood): Timber-Crowned Shrine Lintels + Rotating 3D Sylvan Runestone Prism
        fc = emitTapered3DBox(
          fc, wx, 202, 214, baseZ - 2, 36, 30, 24, 20, camX, eyeY, theme.stoneTrim, theme.lightDir, 0
        );
        fc = emitRotating3DOctahedron(
          fc, wx, 164 + bobY, baseZ + 4, 18, 30, -t * 0.95 + idx, camX, eyeY, theme.crystalBase, theme.lightDir, 0
        );
      } else if (zoneIdx === 2) {
        // Zone III (Bone-Bridge Necropolis): Swinging 3D Iron Soul-Cage Pendulum + Amethyst Core
        const swing = Math.sin(t * 1.7 + idx * 1.1) * 14;
        const cageY = 166 + Math.abs(swing) * 0.18;
        fc = emitTapered3DBox(
          fc, wx + swing, cageY - 18, cageY + 18, baseZ + 8, 15, 13, 15, 13, camX, eyeY, theme.stoneTrim, theme.lightDir, 0
        );
        fc = emitRotating3DOctahedron(
          fc, wx + swing, cageY, baseZ + 8, 9, 13, t * 2.1 + idx, camX, eyeY, theme.crystalBase, theme.lightDir, 0
        );
      } else {
        // Zone IV (Throne of the Black Pit): Jagged Tilted Obsidian Spire Horn + Levitating Magma Core
        const tilt = idx % 2 === 0 ? -10 : 10;
        fc = emitTapered3DBox(
          fc, wx, 158, 214, baseZ - 2, 7, 22, 7, 18, camX, eyeY, theme.stoneCap, theme.lightDir, warmPulse, tilt
        );
        fc = emitRotating3DOctahedron(
          fc, wx + tilt * 0.7, 136 + bobY, baseZ + 4, 15, 22, t * 1.6 + idx, camX, eyeY, theme.crystalBase, theme.lightDir, 0.28
        );
      }

      flushSortedFaces(ctx, fc);

      // Crisp 1-pixel HD-2D emissive rune/glint accent on the projected 3D crystal apex
      V_WX[0] = wx;
      V_WY[0] = (zoneIdx === 3 ? 136 : 168) + bobY;
      V_WZ[0] = baseZ + 6;
      projectVerts(1, camX, eyeY);
      drawPixelStarGlint(
        ctx,
        V_SX[0],
        V_SY[0],
        theme.crystalCore,
        theme.glowHex,
        6,
        0.34 + 0.14 * Math.sin(t * 4.2 + idx)
      );
    }

    // 2. Right-Side Boss Sanctuary Grand 3D Obsidian Gate Pylons & Overhead Sovereign Gyro-Seal (`x = 8520..9080`)
    if (viewRight > 8420 && viewLeft < 9220) {
      const bossTheme = resolveThemeForX(8920, renderer, Math.max(0.55, infernoAlpha));
      const pulse = 0.20 + 0.14 * Math.sin(t * 4.5);

      // Twin Flanking 3D Tilted Obsidian Sanctuary Monoliths (`x = 8540` & `x = 9060`)
      const pylons = [
        { x: 8540, tilt: 16 },
        { x: 9060, tilt: -18 }
      ];
      for (let p = 0; p < pylons.length; p++) {
        const px = pylons[p].x;
        if (px < viewLeft - 140 || px > viewRight + 140) continue;
        let pfc = 0;
        pfc = emitTapered3DBox(
          pfc, px, 382, 438, -18, 36, 44, 28, 34, camX, eyeY, bossTheme.stoneBase, bossTheme.lightDir, pulse
        );
        pfc = emitTapered3DBox(
          pfc, px, 196, 382, -22, 18, 32, 16, 26, camX, eyeY, bossTheme.stoneCap, bossTheme.lightDir, pulse, pylons[p].tilt
        );
        pfc = emitTapered3DBox(
          pfc, px + pylons[p].tilt, 182, 198, -22, 24, 18, 20, 16, camX, eyeY, bossTheme.stoneTrim, bossTheme.lightDir, pulse
        );
        pfc = emitRotating3DOctahedron(
          pfc,
          px + pylons[p].tilt,
          148 + Math.sin(t * 2.8 + p) * 8,
          -14,
          18,
          28,
          t * 1.9 + p * 1.5,
          camX,
          eyeY,
          bossTheme.crystalBase,
          bossTheme.lightDir,
          0.32
        );
        flushSortedFaces(ctx, pfc);
      }

      // Overhead 3D Sovereign Abyssal Gyro-Crown (`x = 8920`, `y = 162`) above the Boss Runic Seal!
      const sealX = 8920;
      if (sealX > viewLeft - 180 && sealX < viewRight + 180) {
        let sfc = 0;
        const hoverY = 158 + Math.sin(t * 2.1) * 9;
        sfc = emitRotating3DOctahedron(
          sfc, sealX, hoverY, -32, 26, 40, t * 1.35, camX, eyeY, bossTheme.crystalBase, bossTheme.lightDir, 0.35
        );
        for (let k = 0; k < 4; k++) {
          const ga = -t * 1.65 + k * Math.PI * 0.5;
          const gx = sealX + Math.cos(ga) * 58;
          const gz = -32 + Math.sin(ga) * 44;
          const gy = hoverY + Math.sin(t * 3.2 + k) * 6;
          sfc = emitTapered3DBox(
            sfc, gx, gy - 9, gy + 9, gz, 7, 5, 7, 5, camX, eyeY, bossTheme.stoneTrim, bossTheme.lightDir, 0.25
          );
        }
        flushSortedFaces(ctx, sfc);

        V_WX[0] = sealX;
        V_WY[0] = hoverY;
        V_WZ[0] = -18;
        projectVerts(1, camX, eyeY);
        drawPixelStarGlint(ctx, V_SX[0], V_SY[0], bossTheme.crystalCore, bossTheme.glowHex, 9, 0.48);
      }
    }

    ctx.restore();
  }

  /**
   * Renders True-3D Perspective-Extruded Parapet Coping Piers & Chasm Lantern Plinths along
   * `y = 684..748` (`wz ∈ [+28, +74]`). Because `y >= 684` sits strictly below the walkable
   * road (`442..680`), it never obstructs combat while giving unmistakable 3D floor thickness!
   */
  static renderParapetCurb3D(ctx, renderer, opts = {}) {
    if (!ctx || !renderer) return;
    const camX = Number.isFinite(opts.camX) ? opts.camX : renderer.camX || 600;
    const camY = Number.isFinite(opts.camY) ? opts.camY : renderer.camY || 445;
    const viewLeft = Number.isFinite(opts.viewLeft) ? opts.viewLeft : camX - 720;
    const viewRight = Number.isFinite(opts.viewRight) ? opts.viewRight : camX + 720;
    const t = Number.isFinite(opts.t) ? opts.t : renderer.time || 0;
    const infernoAlpha = opts.infernoAlpha || 0;
    const eyeY = camY - 38;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const curbPeriod = 380;
    const firstC = Math.max(0, Math.floor((viewLeft - 140) / curbPeriod));
    const lastC = Math.min(24, Math.ceil((viewRight + 140) / curbPeriod));

    for (let c = firstC; c <= lastC; c++) {
      const wx = 190 + c * curbPeriod;
      if (wx > 9180) continue;
      const theme = resolveThemeForX(wx, renderer, infernoAlpha);
      const warm = wx >= 7200 || infernoAlpha > 0.45 ? 0.14 : 0;

      let fc = 0;
      // 3D Jutting Bridge Buttress Cap (`y = 682..710`, `wz = +44`) + Deep Chasm Corbel (`y = 710..756`)
      fc = emitTapered3DBox(
        fc, wx, 682, 706, 42, 26, 28, 20, 22, camX, eyeY, theme.stoneCap, theme.lightDir, warm
      );
      fc = emitTapered3DBox(
        fc, wx, 706, 754, 38, 22, 14, 18, 12, camX, eyeY, theme.stoneBase, theme.lightDir, warm
      );
      // Small 3D Brass/Trim Tie-Block on the coping face
      fc = emitTapered3DBox(
        fc, wx, 686, 696, 63, 10, 10, 4, 4, camX, eyeY, theme.stoneTrim, theme.lightDir, warm
      );
      flushSortedFaces(ctx, fc);

      // Subtle animated 2x2 pixel rune/ember glint on every second 3D parapet cap
      if (c % 2 === 0) {
        V_WX[0] = wx;
        V_WY[0] = 691;
        V_WZ[0] = 68;
        projectVerts(1, camX, eyeY);
        drawPixelStarGlint(
          ctx,
          V_SX[0],
          V_SY[0],
          theme.crystalCore,
          theme.glowHex,
          4,
          0.26 + 0.10 * Math.sin(t * 3.6 + c)
        );
      }
    }

    ctx.restore();
  }

  /**
   * Renders Near-Camera (`wz ∈ [+145, +185]`) 3D Perspective Chasm Spurs & High Vault Ribs
   * in Plane 4 (`renderForegroundDepth`), framing the viewport with authentic 3D depth parallax.
   */
  static renderForeground3D(ctx, renderer) {
    if (!ctx || !renderer) return;
    const zoom = Math.max(0.35, renderer.zoom || 1);
    const camX = Number.isFinite(renderer.camX) ? renderer.camX : 600;
    const camY = Number.isFinite(renderer.camY) ? renderer.camY : 445;
    const viewLeft = Math.floor(camX - (renderer.width * 0.5) / zoom - 200);
    const viewRight = Math.ceil(camX + (renderer.width * 0.5) / zoom + 200);
    const eyeY = camY - 38;
    const infernoAlpha =
      renderer.permanentStageOverride === 'inferno' ||
      renderer.permanentStageOverride === 'shogunate_inferno'
        ? 1
        : renderer.trueUltStageOverride === 'inferno'
          ? renderer.trueUltStageAlpha || 0
          : 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const spurPeriod = 760;
    const firstS = Math.max(0, Math.floor((viewLeft - 220) / spurPeriod));
    const lastS = Math.min(12, Math.ceil((viewRight + 220) / spurPeriod));

    for (let s = firstS; s <= lastS; s++) {
      const wx = 340 + s * spurPeriod;
      const theme = resolveThemeForX(wx, renderer, infernoAlpha);
      let fc = 0;
      // Near-camera 3D Abyssal Escarpment Spur (`y = 698..786`, `wz = +158`)
      fc = emitTapered3DBox(
        fc, wx, 698, 722, 156, 34, 38, 22, 26, camX, eyeY, theme.stoneBase, theme.lightDir, 0
      );
      fc = emitTapered3DBox(
        fc, wx, 722, 788, 152, 30, 18, 20, 14, camX, eyeY, [14, 18, 30], theme.lightDir, 0
      );
      flushSortedFaces(ctx, fc);
    }

    ctx.restore();
  }
}
