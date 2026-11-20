import { PixelForge } from '../engine/PixelForge.js?v=30fps170';

/**
 * Interactive Front-Facing Orthogonal 16-Bit HD-2D Destructible Shrines & Braziers (`AdventureDestructibles`)
 *
 * Features:
 *  - 20 curated, grounded arcade-proportioned (`drawScale: 1.10..1.18`, `halfW: 31..36`,
 *    `height: 94..112`) front-facing orthogonal vessels and shrines across the 9600px
 *    (`4 x 2400px`) campaign, anchored cleanly along the upper colonnade sanctuary recesses
 *    (`groundY: 450..454`, right at the foot of the `y = 436` horizontal stone curb) so the
 *    walkable causeway and lower parapet sightlines stay 100% open.
 *  - Baked offscreen 16-bit HD-2D orthogonal pixel-art atlas (`getOrBakeOrthogonalPropsSheet()`,
 *    `9 cols x 4 rows` of `128x128` cells rendered on a `64x64` `2px` logical grid with `#0d0f1c`
 *    Selout outlines, 5-to-6-shade cel-stepped masonry/brass/heartwood/crystal/bone/obsidian ramps,
 *    and 100% flat `0 deg` horizontal plinth bases parallel to the causeway stone courses), paired
 *    with `assets/sprites/adv_props_sheet.png` Row 4 (`sy = 512`) for 64x64 ballistic pixel shards
 *    and a clean procedural fallback when `typeof document === 'undefined'`.
 *  - Controlled RPG economy: 12/20 braziers, coffers & shrine lanterns infuse direct Spirit & XP
 *    on shatter (`dropType: null`, zero floor clutter), leaving strictly 2 single-item caches
 *    (`1` Astral Relic + `1` Solar Elixir) per 2400px Realm (`8` total across the campaign).
 */

const SELOUT = '#0d0f1c';
const PROP_CELL = 128;
const PROP_GRID = 64;
const PROP_PX = 2;
const PROP_COLS = 9;
const PROP_ROWS = 4;
const PROP_BASE_Y_IN_CELL = 121;

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
];

const PROP_ARCHETYPES = {
  eclipse_brazier: {
    sheetCol: 0,
    shardCol: 6,
    drawScale: 1.10,
    hasGlow: true,
    label: 'CATHEDRAL SANCTUM BRAZIER',
    maxHp: 115,
    halfW: 31,
    height: 94,
    primaryColor: '#38bdf8',
    accentColor: '#eab308',
    debrisCols: ['#334155', '#64748b', '#38bdf8', '#eab308'],
    hitSfx: 'clang',
    breakSfx: 'earthshatter',
    breakCallout: 'BRAZIER SHATTERED! +SPIRIT',
    calloutColor: '#7dd3fc'
  },
  eclipse_reliquary: {
    sheetCol: 1,
    shardCol: 6,
    drawScale: 1.10,
    hasGlow: true,
    label: 'ECLIPSE RELIQUARY COFFER',
    maxHp: 110,
    halfW: 33,
    height: 94,
    primaryColor: '#eab308',
    accentColor: '#fde047',
    debrisCols: ['#334155', '#94a3b8', '#eab308', '#fef08a'],
    hitSfx: 'clang',
    breakSfx: 'parry_clang',
    breakCallout: 'RELIQUARY UNSEALED!',
    calloutColor: '#fde047'
  },
  eclipse_astrolabe: {
    sheetCol: 2,
    shardCol: 6,
    drawScale: 1.16,
    hasGlow: true,
    label: 'ECLIPSE ASTRAL ORRERY',
    maxHp: 135,
    halfW: 35,
    height: 110,
    isArtifact: true,
    primaryColor: '#38bdf8',
    accentColor: '#fde047',
    debrisCols: ['#d97706', '#fde047', '#38bdf8', '#334155'],
    hitSfx: 'reflect',
    breakSfx: 'time_shatter',
    breakCallout: 'ANCIENT ORRERY UNSEALED!',
    calloutColor: '#fde047'
  },
  starwood_lantern: {
    sheetCol: 3,
    shardCol: 7,
    drawScale: 1.10,
    hasGlow: true,
    label: 'STARWOOD SHRINE LANTERN',
    maxHp: 105,
    halfW: 31,
    height: 96,
    primaryColor: '#34d399',
    accentColor: '#67e8f9',
    debrisCols: ['#3f2a1d', '#065f46', '#34d399', '#67e8f9'],
    hitSfx: 'clang',
    breakSfx: 'ice_shatter',
    breakCallout: 'SHRINE LANTERN SUNDERED! +SPIRIT',
    calloutColor: '#34d399'
  },
  starwood_crystal: {
    sheetCol: 4,
    shardCol: 7,
    drawScale: 1.16,
    hasGlow: true,
    label: 'STARWOOD CRYSTAL CAIRN',
    maxHp: 130,
    halfW: 35,
    height: 110,
    isArtifact: true,
    primaryColor: '#34d399',
    accentColor: '#67e8f9',
    debrisCols: ['#059669', '#34d399', '#38bdf8', '#ecfeff'],
    hitSfx: 'frost_cast',
    breakSfx: 'ice_shatter',
    breakCallout: 'SYLVAN CAIRN UNSEALED!',
    calloutColor: '#67e8f9'
  },
  soul_brazier: {
    sheetCol: 5,
    shardCol: 7,
    drawScale: 1.12,
    hasGlow: true,
    label: 'NECROPOLIS SOUL-BRAZIER',
    maxHp: 115,
    halfW: 32,
    height: 96,
    primaryColor: '#c084fc',
    accentColor: '#f43f5e',
    debrisCols: ['#1e293b', '#6b21a8', '#c084fc', '#cbd5e1'],
    hitSfx: 'chain_hook',
    breakSfx: 'thunder_slam',
    breakCallout: 'SOUL-BRAZIER BANISHED! +SPIRIT',
    calloutColor: '#d8b4fe'
  },
  ossuary_obelisk: {
    sheetCol: 6,
    shardCol: 7,
    drawScale: 1.16,
    hasGlow: true,
    label: 'OSSUARY RELIQUARY ALTAR',
    maxHp: 135,
    halfW: 35,
    height: 110,
    isArtifact: true,
    primaryColor: '#c084fc',
    accentColor: '#f43f5e',
    debrisCols: ['#2e1065', '#9333ea', '#cbd5e1', '#f43f5e'],
    hitSfx: 'clang',
    breakSfx: 'time_shatter',
    breakCallout: 'NECROPOLIS RELIC UNSEALED!',
    calloutColor: '#e879f9'
  },
  blackpit_brazier: {
    sheetCol: 7,
    shardCol: 8,
    drawScale: 1.12,
    hasGlow: true,
    label: 'BLACK PIT HELLFIRE CAULDRON',
    maxHp: 120,
    halfW: 32,
    height: 96,
    primaryColor: '#ef4444',
    accentColor: '#fb923c',
    debrisCols: ['#271215', '#7f1d1d', '#fb923c', '#fde047'],
    hitSfx: 'heavy_cleave',
    breakSfx: 'meteor_impact',
    breakCallout: 'HELLFIRE CAULDRON SMASHED! +SPIRIT',
    calloutColor: '#fb923c'
  },
  hellfire_pylon: {
    sheetCol: 8,
    shardCol: 8,
    drawScale: 1.18,
    hasGlow: true,
    label: 'INFERNAL SOUL-CRUCIBLE',
    maxHp: 140,
    halfW: 36,
    height: 112,
    isArtifact: true,
    primaryColor: '#ef4444',
    accentColor: '#fde047',
    debrisCols: ['#271215', '#b45309', '#ef4444', '#fde047'],
    hitSfx: 'clang',
    breakSfx: 'meteor_impact',
    breakCallout: 'SOUL-CRUCIBLE SHATTERED!',
    calloutColor: '#fde047'
  }
};

// Curated 20-shrine architectural layout (`5` per 2400px Realm):
//  - All 20 props sit cleanly along the upper colonnade sanctuary wall (`groundY: 450..454`, right at
//    the foot of `ADVENTURE_ROAD_TOP_Y = 436`) with ZERO road-blocking `y = 660` foreground clutter.
//  - Every `x` coordinate clears all sub-wave arcane barrier gates (`1184/1236`, `2376/2404`,
//    `3584/3596`, `4776/4804`, `5984/5996`, `7176/7204`, `8364/8376`) and keeps `max x <= 8800`
//    clear of Behemoth Malphas (`9335`) & Boss Sanctuary Seal (`8920`).
//  - Preserves exact RPG drop economy: `4` `'relic'` caches (`0` `'hp'` cures) + `12` Spirit braziers.
const CURATED_PROP_LAYOUT = [
  // Zone I: Eclipse Cathedral Outskirts (`0..2400`) — Gothic Pedestal Braziers, Reliquary Coffers & Astral Orrery
  { kind: 'eclipse_brazier', zone: 0, x: 360, groundY: 452, dropType: null },
  { kind: 'eclipse_reliquary', zone: 0, x: 780, groundY: 450, dropType: null },
  { kind: 'eclipse_astrolabe', zone: 0, x: 1320, groundY: 454, dropType: 'relic', relicAmt: 12 },
  { kind: 'eclipse_brazier', zone: 0, x: 1740, groundY: 452, dropType: null },
  { kind: 'eclipse_reliquary', zone: 0, x: 2140, groundY: 450, dropType: null },

  // Zone II: Cursed Starwood Crossing (`2400..4800`) — Symmetrical Sylvan Shrine Lanterns & Moon-Crystal Cairns
  { kind: 'starwood_lantern', zone: 1, x: 2640, groundY: 452, dropType: null },
  { kind: 'starwood_lantern', zone: 1, x: 3060, groundY: 450, dropType: null },
  { kind: 'starwood_crystal', zone: 1, x: 3440, groundY: 454, dropType: 'relic', relicAmt: 12 },
  { kind: 'starwood_lantern', zone: 1, x: 4020, groundY: 452, dropType: null },
  { kind: 'starwood_crystal', zone: 1, x: 4480, groundY: 454, dropType: null },

  // Zone III: Abyssal Bone-Gate (`4800..7200`) — Necropolis Soul-Braziers & Ossuary Reliquary Altars
  { kind: 'soul_brazier', zone: 2, x: 5040, groundY: 452, dropType: null },
  { kind: 'soul_brazier', zone: 2, x: 5460, groundY: 450, dropType: null },
  { kind: 'ossuary_obelisk', zone: 2, x: 5840, groundY: 454, dropType: 'relic', relicAmt: 14 },
  { kind: 'soul_brazier', zone: 2, x: 6420, groundY: 452, dropType: null },
  { kind: 'ossuary_obelisk', zone: 2, x: 6880, groundY: 454, dropType: null },

  // Zone IV: Throne of the Black Pit (`7200..9600`, Boss at `9335`) — Obsidian Cauldrons & Chained Soul-Crucibles
  { kind: 'blackpit_brazier', zone: 3, x: 7420, groundY: 452, dropType: null },
  { kind: 'blackpit_brazier', zone: 3, x: 7780, groundY: 450, dropType: null },
  { kind: 'hellfire_pylon', zone: 3, x: 8160, groundY: 454, dropType: 'relic', relicAmt: 14 },
  { kind: 'blackpit_brazier', zone: 3, x: 8520, groundY: 452, dropType: null },
  { kind: 'hellfire_pylon', zone: 3, x: 8800, groundY: 454, dropType: null }
];

// =============================================================================
// 16-BIT FRONT-FACING ORTHOGONAL PIXEL-ART ATLAS BAKER (`9 cols x 4 rows`)
// =============================================================================

const PALETTES = {
  // 5-to-6-step dark-to-light cel ramps matched to `adv_arch_pano.png` & `adv_floor_pano.png`
  cathStone: ['#12192b', '#1c2740', '#2b3b5c', '#41567d', '#647ea8', '#8ea6cc'],
  cathBrass: ['#3b200a', '#6b3d14', '#a3621f', '#d48c2e', '#f2bd4b', '#fef08a'],
  cathCyan: ['#075985', '#0284c7', '#38bdf8', '#7dd3fc', '#e0f2fe', '#ffffff'],
  sylvStone: ['#101b1c', '#192b2b', '#274240', '#3a5e58', '#568278', '#7ba89b'],
  sylvWood: ['#1b110b', '#2e1d13', '#492e1e', '#69432b', '#8c5c3c', '#b07a54'],
  sylvMoss: ['#064e3b', '#047857', '#10b981', '#34d399', '#6ee7b7', '#d1fae5'],
  sylvAqua: ['#0e7490', '#06b6d4', '#22d3ee', '#67e8f9', '#cffafe', '#ffffff'],
  cryptStone: ['#120e21', '#1e1836', '#2f2552', '#463873', '#645399', '#8a78bf'],
  cryptBone: ['#403738', '#665959', '#91827d', '#bdb0a6', '#dfd6cc', '#f7f2eb'],
  cryptIron: ['#141521', '#232538', '#383b54', '#525675', '#757a9e'],
  cryptSoul: ['#4c1d95', '#7e22ce', '#a855f7', '#d8b4fe', '#fae8ff', '#fb7185'],
  pitBasalt: ['#110a0d', '#1f1217', '#331c23', '#4d2b34', '#6b3e49', '#8c5663'],
  pitIron: ['#1c110f', '#36201a', '#573429', '#7d4d3b', '#a66b53'],
  pitChain: ['#381f0d', '#663916', '#995822', '#cc7e2e', '#f5ab47', '#fde68a'],
  pitFire: ['#7f1d1d', '#dc2626', '#ea580c', '#f97316', '#facc15', '#fef9c3']
};

let _cachedOrthoPropsCanvas = null;
let _cachedCellRuns = null;

function setGridPx(g, x, y, hex) {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < 2 || ix >= PROP_GRID - 2 || iy < 2 || iy >= 60) return;
  g[iy * PROP_GRID + ix] = hex;
}

function clearGridPx(g, x, y) {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < 0 || ix >= PROP_GRID || iy < 0 || iy >= PROP_GRID) return;
  g[iy * PROP_GRID + ix] = null;
}

function fillGridRect(g, x0, y0, w, h, hex) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setGridPx(g, x0 + dx, y0 + dy, hex);
    }
  }
}

/**
 * Paints a 100% horizontal front-facing carved ashlar stone slab/step (`0 deg` isometric tilt)
 * centered around `x = 31.5`, with top catchlight bevel, Bayer-textured stone body, staggered
 * vertical masonry joints, and dark grounded bottom crease.
 */
function paintHorizontalStoneStep(g, y0, width, height, pal, jointSeed = 0, topCrease = false) {
  const w = width | 0;
  const h = height | 0;
  const x0 = 32 - (w >> 1);
  const half = (w - 1) * 0.5;

  for (let dy = 0; dy < h; dy++) {
    const py = y0 + dy;
    for (let dx = 0; dx < w; dx++) {
      const px = x0 + dx;
      const edgeDist = Math.abs(dx - half) / Math.max(1, half);
      const bayer = BAYER_4X4[((py & 3) << 2) | (px & 3)] / 16;

      let shade = 2;
      if (dy === 0) {
        shade = topCrease ? 0 : edgeDist < 0.52 ? 4 : edgeDist < 0.84 ? 3 : 2;
      } else if (dy === 1 && topCrease) {
        shade = edgeDist < 0.56 ? 4 : 3;
      } else if (dy === h - 1) {
        shade = 0;
      } else {
        const light = 1 - edgeDist * 0.82 - (dy / Math.max(2, h)) * 0.24 + (bayer - 0.5) * 0.22;
        shade = light > 0.72 ? 3 : light > 0.40 ? 2 : 1;
      }

      // Staggered ashlar vertical mortar seams
      if (dy > 0 && dy < h - 1) {
        const course = dy >= (h >> 1) && h >= 5 ? 1 : 0;
        const seamPeriod = 9;
        const seamOff = (jointSeed * 3 + course * 5) % seamPeriod;
        if (dx > 2 && dx < w - 3 && (dx + seamOff) % seamPeriod === 0) {
          shade = Math.max(0, shade - 2);
        }
        if (h >= 6 && dy === (h >> 1) && (px + py) % 3 !== 0) {
          shade = Math.max(0, shade - 1);
        }
      }

      setGridPx(g, px, py, pal[Math.max(0, Math.min(pal.length - 1, shade))]);
    }
  }
}

/**
 * Paints a front-facing symmetrical vertical masonry shaft or coffer body with cel-stepped
 * frontal cylindrical/planar shading and optional horizontal mortar courses.
 */
function paintOrthogonalBody(g, x0, y0, w, h, pal, courseStep = 5) {
  const half = (w - 1) * 0.5;
  for (let dy = 0; dy < h; dy++) {
    const py = y0 + dy;
    const isCourse = courseStep > 0 && dy > 0 && dy < h - 1 && dy % courseStep === 0;
    for (let dx = 0; dx < w; dx++) {
      const px = x0 + dx;
      const normX = (dx - half) / Math.max(1, half); // -1..+1
      const bayer = BAYER_4X4[((py & 3) << 2) | (px & 3)] / 16;
      // Slightly upper-left front keylight matching `adv_arch_pano.png`
      let val = 0.68 - Math.abs(normX + 0.12) * 0.52 - (dy / Math.max(1, h)) * 0.14 + (bayer - 0.5) * 0.16;
      if (dx === 0 || dx === w - 1) val -= 0.24;
      if (isCourse) val -= 0.22;
      const idx = val > 0.66 ? 4 : val > 0.48 ? 3 : val > 0.28 ? 2 : val > 0.12 ? 1 : 0;
      setGridPx(g, px, py, pal[Math.min(pal.length - 1, idx)]);
    }
  }
}

/**
 * Paints a horizontal forged-metal / carved-bone band with specular catchlight & optional rivets.
 */
function paintHorizontalTrimBand(g, y0, width, height, pal, rivets = true) {
  const x0 = 32 - (width >> 1);
  const half = (width - 1) * 0.5;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const dist = Math.abs(dx - half) / Math.max(1, half);
      let s = dy === 0 ? (dist < 0.45 ? 4 : 3) : dy === height - 1 ? 1 : dist < 0.38 ? 4 : dist < 0.75 ? 3 : 2;
      if (dx === 0 || dx === width - 1) s = 1;
      if (rivets && height >= 2 && dy === (height >> 1) && dx >= 3 && dx <= width - 4 && dx % 6 === 3) {
        s = Math.min(pal.length - 1, 5);
      }
      setGridPx(g, x0 + dx, y0 + dy, pal[Math.min(pal.length - 1, s)]);
    }
  }
}

/**
 * Paints an organic multi-tongue HD-2D pixel fire / soul-pyre seated on a 100% horizontal basin lip
 * (tall S-curved central tongue + twin flanking curl tongues + floating pixel embers, zero triangle roof!).
 */
function paintBasinFlame(g, lipY, halfSpan, flameH, fPal, phaseB, isDamaged = false) {
  const effH = isDamaged ? Math.max(5, Math.round(flameH * 0.68)) : flameH;
  // Horizontal glowing coal & ember bed inside basin lip (`y = lipY - 1 .. lipY`)
  for (let dx = -halfSpan; dx <= halfSpan; dx++) {
    const px = 32 + dx;
    const r = Math.abs(dx) / Math.max(1, halfSpan);
    if (r > 0.94) continue;
    const cIdx = r < 0.36 ? 5 : r < 0.68 ? 4 : 3;
    setGridPx(g, px, lipY, fPal[Math.min(fPal.length - 1, cIdx)]);
    if (r < 0.84) {
      setGridPx(g, px, lipY - 1, fPal[Math.min(fPal.length - 1, Math.max(2, cIdx - 1))]);
    }
  }

  // Sculpt 5 organic overlapping flame tongues (`center`, `inner-L/R`, `outer-L/R`)
  const dir = phaseB ? -1 : 1;
  const tongues = [
    { cx: 31.5, w0: halfSpan * 0.46, h: effH, sway: 1.1 * dir },
    { cx: 31.5 - halfSpan * 0.44, w0: halfSpan * 0.34, h: Math.round(effH * 0.74), sway: -0.8 * dir },
    { cx: 31.5 + halfSpan * 0.44, w0: halfSpan * 0.34, h: Math.round(effH * 0.78), sway: 0.9 * dir },
    { cx: 31.5 - halfSpan * 0.76, w0: halfSpan * 0.22, h: Math.round(effH * 0.46), sway: 0.6 * dir },
    { cx: 31.5 + halfSpan * 0.76, w0: halfSpan * 0.22, h: Math.round(effH * 0.44), sway: -0.6 * dir }
  ];

  const heatBuf = new Float32Array(PROP_GRID * PROP_GRID);
  for (let tIdx = 0; tIdx < tongues.length; tIdx++) {
    const tg = tongues[tIdx];
    for (let row = 1; row <= tg.h; row++) {
      const u = row / Math.max(1, tg.h);
      const py = lipY - row;
      if (py < 4) continue;
      const curveX = tg.cx + Math.sin(u * Math.PI * 1.25 + tIdx) * tg.sway;
      const halfW = Math.max(0.75, tg.w0 * Math.pow(1 - u, 0.72));
      const xMin = Math.floor(curveX - halfW - 1);
      const xMax = Math.ceil(curveX + halfW + 1);
      for (let px = xMin; px <= xMax; px++) {
        if (px < 4 || px >= PROP_GRID - 4) continue;
        const dist = Math.abs(px - curveX) / halfW;
        if (dist > 1.0) continue;
        const hVal = (1 - dist * 0.78) * (1 - u * 0.58) * (tIdx === 0 ? 1.08 : 0.94);
        const idx = py * PROP_GRID + px;
        if (hVal > heatBuf[idx]) heatBuf[idx] = hVal;
      }
    }
  }

  for (let py = lipY - effH - 1; py < lipY; py++) {
    if (py < 4) continue;
    for (let px = 12; px <= 51; px++) {
      const hv = heatBuf[py * PROP_GRID + px];
      if (hv <= 0.14) continue;
      const idx = hv > 0.78 ? 5 : hv > 0.60 ? 4 : hv > 0.42 ? 3 : hv > 0.26 ? 2 : 1;
      setGridPx(g, px, py, fPal[Math.min(fPal.length - 1, idx)]);
    }
  }

  // Rising detached 1-logical-px ember sparks
  if (!isDamaged) {
    setGridPx(g, phaseB ? 27 : 28, lipY - effH + 1, fPal[4]);
    setGridPx(g, phaseB ? 36 : 35, lipY - Math.round(effH * 0.85), fPal[3]);
    setGridPx(g, phaseB ? 32 : 31, lipY - effH - 1, fPal[5] || fPal[4]);
  }
}

/**
 * Paints a shattered low horizontal stone plinth (`Row 3`, `y = 48..59`) when a prop is destroyed:
 * 100% flat horizontal bottom (`y = 59` + `SELOUT` `y = 60`), varied fractured masonry teeth per
 * archetype, residual biome ember/crystal glints, and flat stone rubble chunks beside the base.
 */
function paintShatteredPlinthRow(g, stonePal, trimPal, glowPal, wide = false, seedCol = 0) {
  const baseW = wide ? 40 : 36;
  const stepW = wide ? 32 : 28;
  paintHorizontalStoneStep(g, 54, baseW, 6, stonePal, 1 + seedCol, false);
  paintHorizontalStoneStep(g, 50, stepW, 4, stonePal, 3 + seedCol, true);

  // Asymmetric flat-topped sheared stone block stubs per column (`y = 46..49`, zero sawtooth spikes!)
  const xStart = 32 - (stepW >> 1) + 2;
  const span = stepW - 4;
  const patterns = [
    [3, 3, 3, 3, 2, 2, 2, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 2, 2, 2, 3, 3, 3, 1],
    [2, 2, 3, 3, 3, 3, 1, 1, 0, 0, 0, 0, 0, 2, 2, 2, 1, 1, 0, 0, 3, 3, 2, 2],
    [3, 3, 3, 1, 1, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 1, 1, 3, 3, 3, 3, 2, 2, 1],
    [2, 2, 2, 2, 3, 3, 3, 0, 0, 0, 1, 1, 1, 0, 0, 0, 2, 2, 3, 3, 3, 3, 1, 1]
  ];
  const pat = patterns[seedCol & 3];
  for (let i = 0; i < span; i++) {
    const th = pat[Math.min(pat.length - 1, Math.floor((i * pat.length) / span))];
    for (let dy = 1; dy <= th; dy++) {
      const sh = dy === th ? 4 : dy === th - 1 ? 3 : 2;
      setGridPx(g, xStart + i, 50 - dy, stonePal[sh]);
    }
  }

  // Dark fracture crater in center with faint residual biome glow dust
  fillGridRect(g, 28 + (seedCol % 2), 49, 6, 2, SELOUT);
  setGridPx(g, 29 + (seedCol % 2), 50, glowPal[2]);
  setGridPx(g, 33, 50, glowPal[3]);
  setGridPx(g, 24 + (seedCol % 3), 53, trimPal[2]);
  setGridPx(g, 39 - (seedCol % 2), 53, trimPal[3]);

  // Flat detached stone fragments resting flush on ground course `y = 57..59`
  fillGridRect(g, 32 - (baseW >> 1) - 4, 57, 3, 3, stonePal[2]);
  setGridPx(g, 32 - (baseW >> 1) - 4, 57, stonePal[4]);
  fillGridRect(g, 32 + (baseW >> 1) + 1, 58, 3, 2, trimPal[2]);
}

/**
 * Applies genuine zig-zagging masonry fracture cracks and battle-chipped rims for `Row 2`
 * (`0 < hp <= 55%`) without disturbing the flat horizontal stone plinth (`y >= 54`).
 */
function applyCrackedDamagePass(g, crackGlowHex, crackCoreHex, seedCol) {
  // Carve asymmetric battle chips on upper-left & mid-right rims (`y = 14..30`)
  const chipCenters = [
    [15 + (seedCol % 4), 28],
    [46 - (seedCol % 3), 20 + (seedCol % 5)]
  ];
  for (const [ccx, ccy] of chipCenters) {
    clearGridPx(g, ccx, ccy);
    clearGridPx(g, ccx + 1, ccy);
    clearGridPx(g, ccx, ccy - 1);
  }

  // Zig-zagging stone fissure (`y = 23..53`) with secondary side-branch crack
  const zigOffsets = [0, 0, -1, -2, -2, -1, 0, 1, 2, 2, 1, 1, 0, -1, -2, -1, 0, 1];
  const baseCx = 30 + (seedCol % 4);
  for (let y = 23; y <= 53; y++) {
    const zIdx = (y - 23 + seedCol * 3) % zigOffsets.length;
    const cx = Math.max(20, Math.min(43, baseCx + zigOffsets[zIdx]));
    if (g[y * PROP_GRID + cx]) {
      setGridPx(g, cx, y, SELOUT);
      if (y % 2 === 0 && g[y * PROP_GRID + (cx + 1)]) {
        setGridPx(g, cx + 1, y, y % 6 === 0 ? crackCoreHex : crackGlowHex);
      }
      // Forked side fissures at two heights
      if (y === 33 || y === 44) {
        const dir = y === 33 ? -1 : 1;
        for (let b = 1; b <= 4; b++) {
          const bx = cx + dir * b;
          const by = y + ((b + 1) >> 1);
          if (by <= 53 && g[by * PROP_GRID + bx]) {
            setGridPx(g, bx, by, b === 2 ? crackGlowHex : SELOUT);
          }
        }
      }
    }
  }
}

function paintOrthogonalPropGrid(col, row) {
  const g = new Array(PROP_GRID * PROP_GRID).fill(null);
  const phaseB = row === 1;
  const isCracked = row === 2;
  const isRubble = row === 3;

  switch (col) {
    case 0: {
      // 0: `eclipse_brazier` — Front-facing carved Gothic stone pedestal brazier w/ wide horizontal basin
      const st = PALETTES.cathStone;
      const br = PALETTES.cathBrass;
      const cy = PALETTES.cathCyan;
      if (isRubble) {
        paintShatteredPlinthRow(g, st, br, cy, false, col);
        break;
      }
      paintHorizontalStoneStep(g, 55, 34, 5, st, 1, false);
      paintHorizontalStoneStep(g, 50, 28, 5, st, 4, true);
      paintHorizontalTrimBand(g, 49, 24, 1, br, false);

      // Fluted Gothic shaft (`x: 22..41, y: 37..48`) + pointed sanctum niche
      paintOrthogonalBody(g, 22, 37, 20, 12, st, 6);
      fillGridRect(g, 25, 38, 1, 10, st[1]);
      fillGridRect(g, 38, 38, 1, 10, st[0]);
      fillGridRect(g, 29, 41, 6, 7, SELOUT);
      fillGridRect(g, 30, 40, 4, 8, st[0]);
      fillGridRect(g, 31, 42, 2, 3, phaseB ? cy[4] : cy[2]);
      paintHorizontalTrimBand(g, 36, 24, 2, br, true);

      // Corbelled wide 100% horizontal stone & brass basin (`y: 28..35`, lip at `y_64 = 28`)
      paintHorizontalStoneStep(g, 33, 28, 3, st, 2, false);
      paintHorizontalStoneStep(g, 30, 34, 3, st, 5, false);
      paintHorizontalTrimBand(g, 28, 38, 3, br, true);
      // 4 symmetrical vertical Gothic brass rim finials
      for (const fx of [14, 24, 38, 48]) {
        fillGridRect(g, fx, 25, 2, 5, br[3]);
        setGridPx(g, fx, 25, br[5]);
      }

      // Dual Solar-Gold + Astral-Cyan roaring flame (`y = 16..27`)
      paintBasinFlame(g, 27, 13, 11, cy, phaseB, isCracked);
      paintBasinFlame(g, 27, 8, 8, [br[2], br[3], br[4], br[4], br[5], '#ffffff'], phaseB, isCracked);

      if (isCracked) applyCrackedDamagePass(g, cy[2], cy[4], col);
      break;
    }

    case 1: {
      // 1: `eclipse_reliquary` — Front-facing gilded Cathedral reliquary coffer on flat stone step
      const st = PALETTES.cathStone;
      const br = PALETTES.cathBrass;
      const cy = PALETTES.cathCyan;
      if (isRubble) {
        paintShatteredPlinthRow(g, st, br, br, false, col);
        break;
      }
      paintHorizontalStoneStep(g, 55, 38, 5, st, 2, false);
      paintHorizontalStoneStep(g, 50, 34, 5, st, 5, true);
      // Twin forged-brass altar feet sitting flat on `y = 50`
      fillGridRect(g, 16, 48, 5, 3, br[3]);
      fillGridRect(g, 43, 48, 5, 3, br[2]);

      // Rectangular front-facing reliquary chest (`x: 15..48, y: 29..48`, 0 deg tilt!)
      paintOrthogonalBody(g, 15, 29, 34, 20, st, 0);
      // Brass corner pilasters & horizontal bands
      fillGridRect(g, 15, 29, 3, 20, br[3]);
      fillGridRect(g, 16, 29, 1, 19, br[4]);
      fillGridRect(g, 46, 29, 3, 20, br[2]);
      paintHorizontalTrimBand(g, 28, 36, 2, br, true);
      paintHorizontalTrimBand(g, 47, 34, 2, br, true);

      // Twin Gothic lancet side panels
      for (const px of [20, 39]) {
        fillGridRect(g, px, 33, 5, 12, SELOUT);
        fillGridRect(g, px + 1, 34, 3, 10, st[0]);
        fillGridRect(g, px + 2, 35, 1, 8, br[2]);
      }

      // Central Eclipse Sun-Rose Clasp Seal (`x: 27..36, y: 33..42`, `cellY = 75`)
      fillGridRect(g, 27, 33, 10, 10, SELOUT);
      fillGridRect(g, 28, 34, 8, 8, br[3]);
      fillGridRect(g, 29, 35, 6, 6, cy[1]);
      fillGridRect(g, 30, 36, 4, 4, phaseB ? cy[5] : cy[3]);
      fillGridRect(g, 31, 37, 2, 2, br[5]);

      // Stepped horizontal shrine gable lid & cross finial (`y: 16..27`)
      paintHorizontalStoneStep(g, 25, 32, 3, st, 3, false);
      paintHorizontalTrimBand(g, 23, 26, 2, br, false);
      paintHorizontalStoneStep(g, 21, 18, 2, st, 1, false);
      fillGridRect(g, 31, 16, 2, 5, br[4]);
      fillGridRect(g, 29, 17, 6, 2, br[4]);
      setGridPx(g, 31, 16, br[5]);

      if (isCracked) applyCrackedDamagePass(g, br[4], cy[3], col);
      break;
    }

    case 2: {
      // 2: `eclipse_astrolabe` — Front-facing brass Astral Sanctum Orrery on flat stepped plinth (`isArtifact`)
      const st = PALETTES.cathStone;
      const br = PALETTES.cathBrass;
      const cy = PALETTES.cathCyan;
      if (isRubble) {
        paintShatteredPlinthRow(g, st, br, cy, true, col);
        break;
      }
      paintHorizontalStoneStep(g, 54, 40, 6, st, 1, false);
      paintHorizontalStoneStep(g, 48, 32, 6, st, 4, true);
      // Inlaid astral cyan pips on flat front frieze
      for (const rx of [20, 26, 31, 37, 43]) {
        setGridPx(g, rx, 50, phaseB ? cy[4] : cy[2]);
        setGridPx(g, rx, 51, cy[1]);
      }
      paintHorizontalTrimBand(g, 46, 26, 2, br, true);

      // Central turned brass pedestal (`x: 28..35, y: 40..45`)
      paintOrthogonalBody(g, 28, 40, 8, 6, br, 0);

      // Front-facing concentric forged-brass Armillary Sphere (`cx = 31.5, cy = 26`)
      const cx0 = 31.5;
      const cy0 = 26.0;
      for (let y = 11; y <= 43; y++) {
        for (let x = 14; x <= 49; x++) {
          const dx = x - cx0;
          const dy = y - cy0;
          const r = Math.hypot(dx, dy);
          // Outer cradle yoke (`y >= 26`, `r` in `15..16.8`)
          if (dy >= -1 && r >= 14.8 && r <= 16.6) {
            setGridPx(g, x, y, dx < 0 ? br[3] : br[1]);
          }
          // Outer engraved meridian ring (`r` in `11.6..14.0`)
          if (r >= 11.6 && r <= 14.0) {
            const lit = dx < -2 && dy < 2 ? 4 : dx > 3 && dy > 3 ? 1 : 3;
            setGridPx(g, x, y, br[lit]);
          }
          // Inner celestial ring (`r` in `6.8..8.6`)
          if (r >= 6.8 && r <= 8.6) {
            setGridPx(g, x, y, dy < 0 ? br[4] : br[2]);
          }
          // Blazing Astral-Solar Core (`r <= 4.3`)
          if (r <= 4.3) {
            const cIdx = r < 1.6 ? 5 : r < 2.9 ? (phaseB ? 4 : 3) : 2;
            setGridPx(g, x, y, cy[cIdx]);
          }
        }
      }
      // Horizontal equatorial brass bar + vertical axis spire (`0 deg` orthogonal cross!)
      paintHorizontalTrimBand(g, 25, 38, 2, br, false);
      fillGridRect(g, 31, 9, 2, 33, br[3]);
      setGridPx(g, 31, 9, br[5]);
      setGridPx(g, 30, 10, br[4]);
      setGridPx(g, 33, 10, br[4]);
      // Re-stamp glowing astral sun core over axis intersection
      fillGridRect(g, 29, 24, 6, 5, cy[2]);
      fillGridRect(g, 30, 25, 4, 3, phaseB ? cy[5] : cy[4]);
      fillGridRect(g, 31, 25, 2, 2, br[5]);
      // Orbiting celestial pearls
      setGridPx(g, phaseB ? 23 : 24, 21, cy[4]);
      setGridPx(g, phaseB ? 40 : 39, 31, br[5]);

      if (isCracked) applyCrackedDamagePass(g, cy[3], br[5], col);
      break;
    }

    case 3: {
      // 3: `starwood_lantern` — Symmetrical twin-bracket Sylvan stone & root shrine lantern pedestal
      const st = PALETTES.sylvStone;
      const wd = PALETTES.sylvWood;
      const ms = PALETTES.sylvMoss;
      const aq = PALETTES.sylvAqua;
      if (isRubble) {
        paintShatteredPlinthRow(g, st, wd, aq, false, col);
        break;
      }
      paintHorizontalStoneStep(g, 54, 36, 6, st, 2, false);
      paintHorizontalStoneStep(g, 49, 28, 5, st, 5, true);
      // Horizontal lush emerald moss drape along plinth ledges
      for (const mx of [16, 17, 18, 25, 26, 38, 39, 45, 46]) {
        setGridPx(g, mx, 54, ms[3]);
        setGridPx(g, mx, 55, ms[1]);
      }
      fillGridRect(g, 28, 48, 8, 2, ms[2]);
      fillGridRect(g, 30, 48, 4, 1, aq[3]);

      // Symmetrical twin ancient heartwood & stone brackets (`x: 17..21` and `x: 42..46`, `y: 22..48`)
      paintOrthogonalBody(g, 17, 22, 5, 27, wd, 7);
      paintOrthogonalBody(g, 42, 22, 5, 27, wd, 7);
      // Symmetrical root knees gripping the flat stone plinth
      fillGridRect(g, 15, 45, 3, 4, wd[2]);
      fillGridRect(g, 46, 45, 3, 4, wd[1]);
      fillGridRect(g, 22, 23, 3, 3, wd[3]);
      fillGridRect(g, 39, 23, 3, 3, wd[2]);
      // Climbing emerald moss vines on both posts
      for (let vy = 26; vy <= 44; vy += 5) {
        setGridPx(g, 19, vy, ms[3]);
        setGridPx(g, 20, vy + 1, ms[2]);
        setGridPx(g, 44, vy + 1, ms[2]);
      }

      // Horizontal mossy Sylvan shrine lintel & pitched gable cap (`y: 14..22`)
      paintHorizontalStoneStep(g, 20, 36, 3, st, 1, false);
      paintHorizontalStoneStep(g, 17, 26, 3, st, 3, false);
      fillGridRect(g, 26, 15, 12, 2, ms[2]);
      fillGridRect(g, 30, 13, 4, 3, st[4]);
      setGridPx(g, 31, 13, aq[3]);

      // Centered suspended Sylvan Spirit Lantern (`x: 26..37, y: 23..40`, core `(31.5, 31)` -> `cellY = 62`)
      fillGridRect(g, 31, 23, 2, 3, wd[4]);
      paintHorizontalTrimBand(g, 26, 14, 2, wd, false);
      fillGridRect(g, 26, 28, 12, 9, SELOUT);
      // Faceted glowing aqua/emerald lantern glass panes
      fillGridRect(g, 27, 28, 10, 8, ms[2]);
      fillGridRect(g, 28, 29, 8, 6, aq[2]);
      fillGridRect(g, 29, 30, 6, 4, phaseB ? aq[5] : aq[3]);
      fillGridRect(g, 31, 28, 2, 8, wd[1]); // Central vertical mullion bar
      // Re-light central crystal spark behind mullion
      fillGridRect(g, 30, 31, 4, 2, aq[5]);
      paintHorizontalTrimBand(g, 36, 12, 2, wd, false);
      fillGridRect(g, 31, 38, 2, 3, aq[3]);

      if (isCracked) applyCrackedDamagePass(g, aq[3], ms[4], col);
      break;
    }

    case 4: {
      // 4: `starwood_crystal` — Symmetrical Starwood Moon-Crystal Cairn wrapped in roots (`isArtifact`)
      const st = PALETTES.sylvStone;
      const wd = PALETTES.sylvWood;
      const ms = PALETTES.sylvMoss;
      const aq = PALETTES.sylvAqua;
      if (isRubble) {
        paintShatteredPlinthRow(g, st, wd, aq, true, col);
        break;
      }
      paintHorizontalStoneStep(g, 54, 40, 6, st, 3, false);
      paintHorizontalStoneStep(g, 48, 32, 6, st, 6, true);
      // Glowing sylvan runes along horizontal stone riser
      for (const rx of [21, 27, 32, 36, 42]) {
        setGridPx(g, rx, 50, phaseB ? aq[4] : aq[2]);
        setGridPx(g, rx, 51, ms[3]);
      }

      // Symmetrical flanking crystal shards (`x: 19..25` & `x: 38..44`, `y: 23..46`)
      for (let y = 23; y <= 46; y++) {
        const wSide = Math.min(7, Math.max(2, Math.floor((y - 21) * 0.42)));
        for (let dx = 0; dx < wSide; dx++) {
          const lx = 26 - wSide + dx;
          const rx = 38 + dx;
          setGridPx(g, lx, y, dx < (wSide >> 1) ? aq[3] : ms[2]);
          setGridPx(g, rx, y, dx < (wSide >> 1) ? aq[2] : ms[1]);
        }
      }

      // Towering central faceted Moon-Crystal Monolith (`x: 25..38, y: 10..47`)
      for (let y = 10; y <= 47; y++) {
        const halfW = y < 18 ? Math.max(1, Math.floor((y - 8) * 0.7)) : 7;
        for (let sx = -halfW; sx < halfW; sx++) {
          const px = 32 + sx;
          let colHex;
          if (sx === -halfW || sx === 0) {
            colHex = phaseB ? aq[5] : aq[4]; // Razor facet ridge highlight
          } else if (sx < 0) {
            colHex = y < 22 ? aq[4] : aq[3]; // Lit left-front crystal plane
          } else if (sx < halfW - 2) {
            colHex = (px + y) % 7 === 0 ? aq[3] : ms[3]; // Mid-emerald translucent plane
          } else {
            colHex = ms[1]; // Deep right facet
          }
          setGridPx(g, px, y, colHex);
        }
      }
      // Internal diamond heart core at `(31.5, 28)` (`cellY = 56`)
      fillGridRect(g, 30, 25, 4, 7, aq[4]);
      fillGridRect(g, 31, 26, 2, 5, aq[5]);

      // Sinuous gnarled heartwood root collar & moss tufts hugging crystal onto flat slab
      const rootOffsets = [1, 1, 2, 2, 3, 4, 4, 5, 6, 7, 8, 9, 9];
      for (let i = 0; i < rootOffsets.length; i++) {
        const ry = 37 + i;
        const off = rootOffsets[i] + Math.round(Math.sin(i * 0.9) * 1);
        fillGridRect(g, 25 - off, ry, 3, 2, i % 2 === 0 ? wd[3] : wd[2]);
        fillGridRect(g, 36 + off, ry, 3, 2, i % 2 === 0 ? wd[2] : wd[1]);
        if (i % 3 === 1) {
          setGridPx(g, 26 - off, ry, ms[3]);
          setGridPx(g, 36 + off, ry, ms[2]);
        }
      }
      // Central knotted root & emerald moss cradle (`y: 43..47`)
      fillGridRect(g, 25, 45, 14, 3, wd[2]);
      fillGridRect(g, 27, 44, 10, 2, wd[3]);
      fillGridRect(g, 28, 43, 8, 2, ms[2]);
      setGridPx(g, 30, 43, ms[4]);
      setGridPx(g, 34, 44, ms[3]);

      if (isCracked) applyCrackedDamagePass(g, aq[4], '#ffffff', col);
      break;
    }

    case 5: {
      // 5: `soul_brazier` — Front-facing iron-and-bone Necropolis Soul Urn / Pyre on crypt plinth
      const st = PALETTES.cryptStone;
      const bn = PALETTES.cryptBone;
      const ir = PALETTES.cryptIron;
      const sl = PALETTES.cryptSoul;
      if (isRubble) {
        paintShatteredPlinthRow(g, st, bn, sl, false, col);
        break;
      }
      paintHorizontalStoneStep(g, 54, 36, 6, st, 2, false);
      paintHorizontalStoneStep(g, 49, 28, 5, st, 5, true);
      paintHorizontalTrimBand(g, 48, 26, 2, bn, false);

      // Symmetrical wrought-iron & rib-bone pedestal stem (`x: 20..43, y: 36..47`)
      paintOrthogonalBody(g, 24, 36, 16, 12, ir, 4);
      // Symmetrical outer bone rib-struts
      for (let ry = 37; ry <= 47; ry++) {
        const curve = ry < 41 ? 20 : ry < 45 ? 21 : 22;
        fillGridRect(g, curve, ry, 3, 1, bn[3]);
        fillGridRect(g, 63 - curve - 2, ry, 3, 1, bn[2]);
      }
      // Sculpted Gothic Skull clasp (`x: 28..35, y: 38..46`: rounded cranium + narrower jaw!)
      fillGridRect(g, 29, 38, 6, 1, bn[5]);
      fillGridRect(g, 28, 39, 8, 4, bn[4]);
      fillGridRect(g, 30, 43, 4, 3, bn[3]);
      fillGridRect(g, 29, 40, 2, 2, SELOUT);
      fillGridRect(g, 33, 40, 2, 2, SELOUT);
      setGridPx(g, 29, 40, phaseB ? sl[5] : sl[3]);
      setGridPx(g, 34, 40, phaseB ? sl[5] : sl[3]);
      setGridPx(g, 31, 42, SELOUT);
      setGridPx(g, 31, 45, SELOUT);
      setGridPx(g, 33, 45, SELOUT);

      // Wide 100% horizontal wrought-iron & bone-crowned Pyre Basin (`y: 29..35`, lip at `y_64 = 29`)
      paintHorizontalStoneStep(g, 33, 30, 3, ir, 1, false);
      paintHorizontalTrimBand(g, 29, 38, 4, ir, true);
      // 4 symmetrical bone horns rising along the horizontal rim
      for (const hx of [14, 23, 39, 48]) {
        fillGridRect(g, hx, 25, 2, 5, bn[4]);
        setGridPx(g, hx, 24, bn[5]);
      }

      // Necrotic violet & crimson-rose soul pyre (`y = 16..28`, `Row 4` socket at `cellY = 58`)
      paintBasinFlame(g, 28, 14, 11, [sl[0], sl[1], sl[2], sl[3], sl[4], '#ffffff'], phaseB, isCracked);

      if (isCracked) applyCrackedDamagePass(g, sl[3], sl[5], col);
      break;
    }

    case 6: {
      // 6: `ossuary_obelisk` — Symmetrical Ossuary Reliquary Altar / Crypt Stele (`isArtifact`)
      const st = PALETTES.cryptStone;
      const bn = PALETTES.cryptBone;
      const sl = PALETTES.cryptSoul;
      if (isRubble) {
        paintShatteredPlinthRow(g, st, bn, sl, true, col);
        break;
      }
      paintHorizontalStoneStep(g, 54, 40, 6, st, 1, false);
      paintHorizontalStoneStep(g, 48, 34, 6, st, 4, true);
      // Small bone skulls inset horizontally along second step
      for (const sx of [20, 31, 42]) {
        fillGridRect(g, sx, 50, 3, 2, bn[3]);
        setGridPx(g, sx + 1, 50, bn[5]);
      }

      // Front-facing Crypt Reliquary Shrine body (`x: 17..46, y: 20..47`)
      paintOrthogonalBody(g, 17, 20, 30, 28, st, 6);
      // Fluted outer pilasters (`x: 17..21` & `x: 42..46`)
      paintOrthogonalBody(g, 17, 21, 5, 26, st, 0);
      paintOrthogonalBody(g, 42, 21, 5, 26, st, 0);
      fillGridRect(g, 18, 21, 2, 2, bn[3]);
      fillGridRect(g, 44, 21, 2, 2, bn[2]);

      // Horizontal entablature cornice + Gothic triangular pediment (`y: 10..20`)
      paintHorizontalTrimBand(g, 18, 34, 3, bn, false);
      paintHorizontalStoneStep(g, 15, 26, 3, st, 2, false);
      paintHorizontalStoneStep(g, 12, 16, 3, st, 5, false);
      fillGridRect(g, 29, 10, 6, 2, bn[4]);
      fillGridRect(g, 16, 15, 2, 3, bn[4]);
      fillGridRect(g, 46, 15, 2, 3, bn[3]);

      // Deep recessed sanctum alcove (`x: 23..40, y: 23..46`)
      fillGridRect(g, 23, 23, 18, 24, SELOUT);
      fillGridRect(g, 24, 24, 16, 22, st[0]);
      // Sculpted Crowned Sovereign Skull Reliquary inside niche (`x: 27..36, y: 25..35`)
      fillGridRect(g, 28, 25, 8, 1, bn[3]);
      setGridPx(g, 28, 24, sl[5]);
      setGridPx(g, 31, 24, sl[4]);
      setGridPx(g, 35, 24, sl[5]);
      fillGridRect(g, 28, 26, 8, 2, bn[5]);
      fillGridRect(g, 27, 28, 10, 4, bn[4]);
      fillGridRect(g, 29, 32, 6, 3, bn[3]);
      fillGridRect(g, 28, 29, 3, 2, SELOUT);
      fillGridRect(g, 33, 29, 3, 2, SELOUT);
      setGridPx(g, 29, 29, phaseB ? sl[5] : sl[3]);
      setGridPx(g, 34, 29, phaseB ? sl[5] : sl[3]);
      fillGridRect(g, 31, 31, 2, 1, SELOUT);
      setGridPx(g, 30, 34, SELOUT);
      setGridPx(g, 32, 34, SELOUT);
      setGridPx(g, 34, 34, SELOUT);

      // Glowing necrotic rune tablet & mist vent (`y: 37..44`, `cellY = 68` for `Row 8` mist!)
      for (let ry = 37; ry <= 43; ry += 2) {
        fillGridRect(g, 27, ry, 10, 1, ry === 39 ? sl[4] : sl[2]);
        setGridPx(g, 31, ry, phaseB ? '#ffffff' : sl[4]);
      }

      if (isCracked) applyCrackedDamagePass(g, sl[3], sl[5], col);
      break;
    }

    case 7: {
      // 7: `blackpit_brazier` — Front-facing spiked Obsidian Hellfire Cauldron on flat iron/basalt base
      const bs = PALETTES.pitBasalt;
      const ir = PALETTES.pitIron;
      const ch = PALETTES.pitChain;
      const fi = PALETTES.pitFire;
      if (isRubble) {
        paintShatteredPlinthRow(g, bs, ch, fi, false, col);
        break;
      }
      paintHorizontalStoneStep(g, 54, 36, 6, bs, 2, false);
      paintHorizontalStoneStep(g, 49, 30, 5, ir, 4, true);
      // Glowing ember vents in flat basalt seam
      for (const vx of [22, 31, 41]) {
        fillGridRect(g, vx, 55, 2, 1, phaseB ? fi[4] : fi[2]);
      }

      // Twin heavy vertical demon-iron claw supports planted flat on `y = 49`
      fillGridRect(g, 19, 44, 4, 5, ir[2]);
      fillGridRect(g, 20, 44, 2, 5, ir[4]);
      fillGridRect(g, 41, 44, 4, 5, ir[1]);
      fillGridRect(g, 42, 44, 2, 5, ir[3]);

      // Curved rounded-belly Obsidian Cauldron silhouette (`y: 32..46`, neck -> wide belly -> rounded base)
      const bellyWidths = [30, 32, 34, 36, 36, 36, 36, 34, 34, 32, 30, 26, 22];
      for (let dy = 0; dy < bellyWidths.length; dy++) {
        const bw = bellyWidths[dy];
        paintOrthogonalBody(g, 32 - (bw >> 1), 32 + dy, bw, 1, bs, 0);
      }
      paintHorizontalTrimBand(g, 34, 34, 2, ch, true);
      paintHorizontalTrimBand(g, 41, 32, 2, ch, true);
      // Side iron cauldron ring handles (`x: 12..14` & `x: 49..51`, `y: 35..39`)
      fillGridRect(g, 12, 35, 2, 4, ch[3]);
      fillGridRect(g, 50, 35, 2, 4, ch[2]);

      // Barred molten furnace grate in center of cauldron belly (`x: 27..36, y: 36..40`)
      fillGridRect(g, 27, 36, 10, 5, SELOUT);
      fillGridRect(g, 28, 37, 8, 3, phaseB ? fi[4] : fi[3]);
      fillGridRect(g, 30, 37, 4, 3, fi[5]);
      fillGridRect(g, 30, 36, 1, 5, ir[1]);
      fillGridRect(g, 33, 36, 1, 5, ir[1]);

      // Wide 100% horizontal spiked Obsidian & Iron Cauldron Rim (`y: 29..32`, lip at `y_64 = 29`)
      paintHorizontalTrimBand(g, 29, 38, 3, ir, true);
      for (const sx of [13, 22, 40, 49]) {
        fillGridRect(g, sx, 25, 2, 5, ch[3]);
        setGridPx(g, sx, 24, ch[5]);
      }

      // Roaring Black Pit Hellfire (`y = 16..28`, `Row 6` socket at `cellY = 58`)
      paintBasinFlame(g, 28, 14, 11, fi, phaseB, isCracked);

      if (isCracked) applyCrackedDamagePass(g, fi[3], fi[5], col);
      break;
    }

    case 8:
    default: {
      // 8: `hellfire_pylon` — Chained Infernal Soul-Crucible Shrine on flat obsidian plinth (`isArtifact`)
      const bs = PALETTES.pitBasalt;
      const ir = PALETTES.pitIron;
      const ch = PALETTES.pitChain;
      const fi = PALETTES.pitFire;
      if (isRubble) {
        paintShatteredPlinthRow(g, bs, ch, fi, true, col);
        break;
      }
      paintHorizontalStoneStep(g, 54, 40, 6, bs, 1, false);
      paintHorizontalStoneStep(g, 48, 34, 6, bs, 4, true);
      // Glowing horizontal magma channels (`y = 49..51`, synced with lower `Row 9` socket `cellY = 96`)
      fillGridRect(g, 22, 50, 20, 2, fi[2]);
      fillGridRect(g, 26, 50, 12, 2, phaseB ? fi[5] : fi[4]);

      // Symmetrical obsidian buttress piers (`x: 16..47, y: 18..47`)
      paintOrthogonalBody(g, 16, 19, 32, 29, bs, 6);
      paintOrthogonalBody(g, 16, 18, 7, 30, bs, 0);
      paintOrthogonalBody(g, 41, 18, 7, 30, bs, 0);

      // Blazing barred Infernal Furnace Chamber (`x: 23..40, y: 28..45`)
      fillGridRect(g, 23, 28, 18, 18, SELOUT);
      fillGridRect(g, 24, 29, 16, 16, fi[1]);
      fillGridRect(g, 26, 31, 12, 12, fi[3]);
      fillGridRect(g, 28, 33, 8, 8, phaseB ? fi[5] : fi[4]);
      // 3 vertical demon-iron prison bars across furnace
      for (const bx of [27, 31, 36]) {
        fillGridRect(g, bx, 28, bx === 31 ? 2 : 1, 18, ir[1]);
      }

      // Horizontal & crossed scorched-brass chains binding the shrine
      paintHorizontalTrimBand(g, 26, 34, 2, ch, true);
      paintHorizontalTrimBand(g, 45, 34, 2, ch, true);
      for (let t = 0; t < 12; t++) {
        const lx = 18 + Math.round(t * 2.3);
        const rx = 45 - Math.round(t * 2.3);
        const cy = 29 + Math.round(t * 1.25);
        setGridPx(g, lx, cy, t % 2 === 0 ? ch[4] : ch[2]);
        setGridPx(g, rx, cy, t % 2 === 0 ? ch[3] : ch[1]);
      }

      // Twin-horned Obsidian Summit Crucible Maw (`y: 10..25`, crater lip at `y_64 = 22` -> `cellY = 44`)
      paintHorizontalStoneStep(g, 21, 30, 5, bs, 3, false);
      // Symmetrical obsidian horns rising on left & right (`x: 16..21` & `x: 42..47`, `y: 10..20`)
      for (let hy = 10; hy <= 20; hy++) {
        const hw = Math.min(5, Math.max(2, Math.floor((hy - 8) * 0.45)));
        fillGridRect(g, 17, hy, hw, 1, hy < 14 ? ch[3] : bs[3]);
        fillGridRect(g, 47 - hw, hy, hw, 1, hy < 14 ? ch[2] : bs[2]);
      }
      // Open molten summit crater (`x: 24..39, y: 18..22`)
      fillGridRect(g, 24, 19, 16, 3, fi[2]);
      fillGridRect(g, 26, 18, 12, 3, fi[4]);
      fillGridRect(g, 29, 17, 6, 3, phaseB ? '#ffffff' : fi[5]);

      if (isCracked) applyCrackedDamagePass(g, fi[3], fi[5], col);
      break;
    }
  }

  // Automatic 1-logical-px (`2px` cell) `#0d0f1c` Selout pass + guaranteed flat horizontal base at `y = 60`
  const out = g.slice();
  for (let y = 1; y <= 60; y++) {
    for (let x = 1; x <= PROP_GRID - 2; x++) {
      if (out[y * PROP_GRID + x] !== null) continue;
      const hasN = y > 0 && g[(y - 1) * PROP_GRID + x] !== null;
      const hasS = y < PROP_GRID - 1 && g[(y + 1) * PROP_GRID + x] !== null;
      const hasW = x > 0 && g[y * PROP_GRID + (x - 1)] !== null;
      const hasE = x < PROP_GRID - 1 && g[y * PROP_GRID + (x + 1)] !== null;
      if (hasN || hasS || hasW || hasE) {
        out[y * PROP_GRID + x] = SELOUT;
      }
    }
  }

  // Convert `64x64` logical grid into horizontal RLE runs `[x, y, runW, hex]`
  const runs = [];
  for (let y = 0; y < PROP_GRID; y++) {
    let x = 0;
    while (x < PROP_GRID) {
      const hex = out[y * PROP_GRID + x];
      if (hex === null) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < PROP_GRID && out[y * PROP_GRID + (x + w)] === hex) {
        w++;
      }
      runs.push(x, y, w, hex);
      x += w;
    }
  }
  return runs;
}

function getOrBuildAllPropCellRuns() {
  if (_cachedCellRuns) return _cachedCellRuns;
  const cells = new Array(PROP_COLS * PROP_ROWS);
  for (let row = 0; row < PROP_ROWS; row++) {
    for (let col = 0; col < PROP_COLS; col++) {
      cells[row * PROP_COLS + col] = paintOrthogonalPropGrid(col, row);
    }
  }
  _cachedCellRuns = cells;
  return cells;
}

/**
 * Lazily bakes and caches the `1152x512` (`9 cols x 4 rows` @ `128x128`) front-facing orthogonal
 * 16-bit HD-2D destructibles sprite sheet onto an offscreen `<canvas>` (`2px` pixel blocks,
 * `imageSmoothingEnabled = false`, `#0d0f1c` Selout, `0 deg` flat horizontal plinth bases).
 * Returns `null` cleanly in headless Node environments without `document.createElement`.
 */
export function getOrBakeOrthogonalPropsSheet() {
  if (_cachedOrthoPropsCanvas) return _cachedOrthoPropsCanvas;
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }

  const canvas = document.createElement('canvas');
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  canvas.width = PROP_COLS * PROP_CELL;
  canvas.height = PROP_ROWS * PROP_CELL;

  const bCtx = canvas.getContext('2d');
  if (!bCtx) return null;

  bCtx.imageSmoothingEnabled = false;
  bCtx.clearRect?.(0, 0, canvas.width, canvas.height);

  const cells = getOrBuildAllPropCellRuns();
  for (let row = 0; row < PROP_ROWS; row++) {
    const oy = row * PROP_CELL;
    for (let col = 0; col < PROP_COLS; col++) {
      const ox = col * PROP_CELL;
      const runs = cells[row * PROP_COLS + col];
      for (let i = 0; i < runs.length; i += 4) {
        bCtx.fillStyle = runs[i + 3];
        bCtx.fillRect(
          ox + runs[i] * PROP_PX,
          oy + runs[i + 1] * PROP_PX,
          runs[i + 2] * PROP_PX,
          PROP_PX
        );
      }
    }
  }

  _cachedOrthoPropsCanvas = canvas;
  return canvas;
}

function pxFill(ctx, x, y, w, h, col) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;
  if (col) ctx.fillStyle = col;
  ctx.fillRect(rx, ry, rw, rh);
}

function seloutRect(ctx, x, y, w, h, baseCol, litCol = null) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 2 || rh <= 2) {
    pxFill(ctx, rx, ry, rw, rh, baseCol);
    return;
  }
  ctx.fillStyle = SELOUT;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.fillStyle = baseCol;
  ctx.fillRect(rx + 1, ry + 1, rw - 2, rh - 2);
  if (litCol && rw > 4 && rh > 4) {
    ctx.fillStyle = litCol;
    ctx.fillRect(rx + 1, ry + 1, rw - 3, 2);
  }
}

/**
 * Clean procedural front-facing fallback used ONLY when `typeof document === 'undefined'`
 * (headless Node environments without an offscreen `<canvas>`).
 */
function drawHeadlessOrthogonalPropFallback(ctx, cx, by, halfW, height, primaryCol, accentCol, isRubble) {
  if (isRubble) {
    seloutRect(ctx, cx - halfW, by - 12, halfW * 2, 12, '#1e293b', '#475569');
    seloutRect(ctx, cx - Math.round(halfW * 0.75), by - 18, Math.round(halfW * 1.5), 7, '#334155', accentCol);
    return;
  }
  const baseW = halfW * 2;
  const bodyW = Math.max(16, Math.round(baseW * 0.72));
  seloutRect(ctx, cx - halfW, by - 12, baseW, 12, '#1e293b', '#475569');
  seloutRect(ctx, cx - Math.round(halfW * 0.84), by - 22, Math.round(baseW * 0.84), 11, '#334155', '#64748b');
  seloutRect(ctx, cx - (bodyW >> 1), by - height + 10, bodyW, Math.max(16, height - 30), primaryCol, accentCol);
  seloutRect(ctx, cx - halfW + 2, by - height, baseW - 4, 12, '#475569', accentCol);
}

function drawSteppedPropPixelBloom(ctx, primaryCol, accentCol, cx, cy, rx, ry, alpha) {
  if (alpha <= 0.004) return;
  const u = 4;
  const sx = Math.round(cx / u) * u;
  const sy = Math.round(cy / u) * u;
  const hw = Math.max(u * 2, Math.round(rx / u) * u);
  const hh = Math.max(u, Math.round(ry / u) * u);
  const capped = Math.max(0, Math.min(0.14, alpha));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = primaryCol || '#38bdf8';
  ctx.globalAlpha = capped * 0.48;
  ctx.fillRect(sx - hw, sy - Math.max(u, hh >> 1), hw * 2, Math.max(u * 2, hh));
  ctx.fillRect(sx - Math.max(u, hw >> 1), sy - hh, Math.max(u * 2, hw), hh * 2);

  ctx.fillStyle = accentCol || primaryCol || '#fde047';
  ctx.globalAlpha = capped * 0.78;
  ctx.fillRect(sx - Math.max(u, hw >> 1), sy - Math.max(u, hh >> 1), Math.max(u * 2, hw), Math.max(u * 2, hh));
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
}

function isPropSheetReady(img) {
  if (!img) return false;
  if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
    return Boolean(img.complete && img.naturalWidth > 0);
  }
  return true;
}

function blitMonumentVfxSocket(
  ctx,
  stageVfx,
  isCracked,
  fStep,
  propDx,
  propDy,
  propDw,
  propDh,
  vRow,
  cellX,
  cellY,
  cellW,
  cellH,
  anchorRatioY,
  albA,
  glwA,
  fOff = 0
) {
  const col = (fStep + fOff) & 15;
  const ow = Math.max(4, Math.round((cellW / PROP_CELL) * propDw));
  const oh = Math.max(4, Math.round((cellH / PROP_CELL) * propDh));
  const ox = Math.round(propDx + (cellX / PROP_CELL) * propDw - ow * 0.5);
  const oy = Math.round(propDy + (cellY / PROP_CELL) * propDh - oh * anchorRatioY);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = isCracked ? albA * 0.72 : albA;
  ctx.drawImage(stageVfx, col * 128, vRow * 128, 128, 128, ox, oy, ow, oh);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(0.14, glwA);
  ctx.drawImage(stageVfx, col * 128, vRow * 128, 128, 128, ox, oy, ow, oh);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

export class AdventureDestructibles {
  constructor(adventure) {
    this.adventure = adventure;
    this.customPropSpecs = null;
    this.props = [];
    this.debris = [];
    this._playerCastId = 0;
    this._prevPlayerState = 'IDLE';
    this._prevStateTimer = 0;
    this._prevComboStep = -1;
    this._prevAutoVariant = -1;
    this.resetForCampaign();
  }

  setCampaignProps(propSpecs = null) {
    this.customPropSpecs = Array.isArray(propSpecs)
      ? propSpecs.map((p) => (p && typeof p === 'object' ? { ...p } : {}))
      : null;
    this.resetForCampaign();
  }

  resetToDefaultProps() {
    this.customPropSpecs = null;
    this.resetForCampaign();
  }

  resetForCampaign(propSpecsOverride = undefined) {
    if (propSpecsOverride !== undefined) {
      this.customPropSpecs = Array.isArray(propSpecsOverride)
        ? propSpecsOverride.map((p) => (p && typeof p === 'object' ? { ...p } : {}))
        : null;
    }
    this.debris = [];
    this._playerCastId = 0;
    this._prevPlayerState = 'IDLE';
    this._prevStateTimer = 0;
    this._prevComboStep = -1;
    this._prevAutoVariant = -1;

    const self = this;
    const isCustom = Array.isArray(this.customPropSpecs);
    const sourceSpecs = isCustom ? this.customPropSpecs : CURATED_PROP_LAYOUT;
    this.props = sourceSpecs.map((spec, idx) => {
      const safeKind = PROP_ARCHETYPES[spec?.kind] ? spec.kind : 'eclipse_brazier';
      const arch = PROP_ARCHETYPES[safeKind];
      const px = Number.isFinite(spec?.x) ? Math.round(spec.x) : 440 + idx * 420;
      const pGy = Number.isFinite(spec?.groundY) ? Math.round(spec.groundY) : 561;
      const pZone = Number.isFinite(spec?.zone)
        ? Math.max(0, spec.zone | 0)
        : Math.max(0, Math.floor(px / 2400));
      const rawDrop =
        spec?.dropType === 'hp' ||
        spec?.dropType === 'ember' ||
        spec?.dropType === 'relic' ||
        spec?.dropType === 'mana' ||
        spec?.dropType === 'ult'
          ? spec.dropType
          : null;
      const propId =
        isCustom && typeof spec?.id === 'string' && spec.id.trim()
          ? spec.id.trim()
          : `adv_prop_${idx}_${safeKind}`;
      const prop = {
        id: propId,
        index: idx,
        kind: safeKind,
        sheetCol: arch.sheetCol,
        shardCol: arch.shardCol,
        drawScale: arch.drawScale || 1.12,
        hasGlow: Boolean(arch.hasGlow || arch.isArtifact),
        name: arch.label,
        zone: pZone,
        x: px,
        groundY: pGy,
        y: pGy,
        vx: 0,
        vy: 0,
        halfW: arch.halfW,
        height: arch.height,
        maxHp: Number.isFinite(spec?.maxHp) && spec.maxHp > 0 ? Math.round(spec.maxHp) : arch.maxHp,
        hp: Number.isFinite(spec?.maxHp) && spec.maxHp > 0 ? Math.round(spec.maxHp) : arch.maxHp,
        isArtifact: Boolean(arch.isArtifact || spec?.isArtifact),
        dropType: rawDrop,
        bonusDrop: spec?.bonusDrop ?? null,
        ultAmt: spec?.ultAmt || 20,
        relicAmt: spec?.relicAmt || (isCustom ? 14 : 28),
        primaryColor: arch.primaryColor,
        accentColor: arch.accentColor,
        debrisCols: arch.debrisCols,
        hitSfx: arch.hitSfx,
        breakSfx: arch.breakSfx,
        breakCallout: arch.breakCallout,
        calloutColor: arch.calloutColor,
        destroyed: false,
        isDead: false,
        isBenched: false,
        isFullyBurrowed: false,
        isColossalBoss: false,
        isMonster: true,
        isAdventureProp: true,
        isDummyFocal: true,
        hasPoise: true,
        unstoppablePoise: true,
        stunTimer: 0,
        state: 'IDLE',
        facing: -1,
        team: 2,
        attackRange: 80,
        moveSpeed: 0,
        hitShake: 0,
        hitFlash: 0,
        _lastHitCastId: -1,
        takeDamage() {
          return 0;
        },
        draw(ctx, isRefl = false, renderer = null) {
          self.renderProp(ctx, prop, renderer, isRefl);
        }
      };
      return prop;
    });
  }

  getStandingProps() {
    const out = this._standingBuf || (this._standingBuf = []);
    out.length = 0;
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (!p.destroyed) {
        p.y = p.groundY;
        out.push(p);
      }
    }
    return out;
  }

  getIntactTargetInFront(player, maxDist = 460) {
    if (!player) return null;
    const facing = player.facing || 1;
    const pGy = Number.isFinite(player.groundY) ? player.groundY : player.y || 561;
    let best = null;
    let bestScore = Infinity;

    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.destroyed) continue;
      const dx = (p.x - player.x) * facing;
      if (dx < -16 || dx > maxDist) continue;
      const dGy = Math.abs(p.groundY - pGy);
      if (dGy > 116) continue;
      const score = Math.max(0, dx) + dGy * 1.15 - (p.isArtifact ? 18 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  spawnPropDebris(prop, count = 8, isShatter = false) {
    const cols = prop.debrisCols || ['#475569', '#94a3b8', prop.accentColor];
    const shardCol = prop.shardCol ?? 6;
    for (let i = 0; i < count; i++) {
      if (this.debris.length > 180) this.debris.shift();
      const spreadA = ((i / Math.max(1, count)) - 0.5) * 2.2 + (Math.random() - 0.5) * 0.45;
      const speedX = (isShatter ? 105 : 60) + Math.random() * (isShatter ? 155 : 80);
      const drawSize = isShatter ? 28 + (i % 3) * 4 : 20 + (i % 2) * 4;
      const col = cols[i % cols.length];
      this.debris.push({
        x: prop.x + (Math.random() - 0.5) * prop.halfW * 1.3,
        y: prop.groundY - 14 - Math.random() * Math.max(20, prop.height * 0.72),
        groundY: prop.groundY + 4 + Math.random() * 14,
        vx: Math.sin(spreadA) * speedX,
        vy: -(isShatter ? 190 : 118) - Math.random() * (isShatter ? 170 : 90),
        size: drawSize,
        shardCol,
        quad: i & 3,
        color: col,
        hiColor: i % 3 === 0 ? prop.accentColor : '#f8fafc',
        bounces: 0,
        life: 0,
        maxLife: (isShatter ? 0.98 : 0.58) + Math.random() * 0.35
      });
    }
  }

  damageProp(prop, dmg, attacker, game, isCrit = false) {
    if (!prop || prop.destroyed || dmg <= 0) return false;

    const amount = Math.max(1, Math.round(dmg));
    prop.hp = Math.max(0, prop.hp - amount);
    prop.hitShake = 0.22;
    prop.hitFlash = 0.16;

    const vfx = game?.vfx || this.adventure?.game?.vfx;
    const audio = game?.audio || this.adventure?.game?.audio;
    const renderer = game?.renderer || this.adventure?.game?.renderer;
    const hero = attacker || game?.leftFighter || this.adventure?.game?.leftFighter;

    this.spawnPropDebris(prop, 6, false);
    vfx?.spawnDamageText?.(prop.x, prop.groundY - prop.height - 8, amount, isCrit);
    vfx?.spawnBurst?.(prop.x, prop.groundY - prop.height * 0.55, 6, prop.accentColor, 150, {
      upBias: 70,
      size: 4.5,
      life: 0.30
    });

    if (prop.hp > 0) {
      audio?.play?.(prop.hitSfx || 'clang', prop.x);
      return false;
    }

    // Shattered (`hp <= 0`)!
    prop.destroyed = true;
    prop.isDead = true;
    prop.hitShake = 0;
    prop.hitFlash = 0;

    this.spawnPropDebris(prop, 16, true);
    vfx?.spawnShockwave?.(
      prop.x,
      prop.groundY - 14,
      prop.isArtifact ? 118 : 88,
      prop.accentColor,
      0.34,
      true
    );
    vfx?.spawnBurst?.(
      prop.x,
      prop.groundY - prop.height * 0.5,
      prop.isArtifact ? 18 : 12,
      prop.accentColor,
      205,
      {
        upBias: 115,
        size: 5.5,
        life: 0.42
      }
    );
    audio?.play?.(prop.breakSfx || 'thunder_slam', prop.x);
    renderer?.triggerShake?.(prop.isArtifact ? 7 : 4, 0.16);

    if (this.adventure) {
      this.adventure.score = (this.adventure.score || 0) + (prop.isArtifact ? 220 : 95);
      this.adventure.progression?.gainXp?.(prop.isArtifact ? 24 : 10, hero);
      this.adventure.progression?.gainSpirit?.(prop.isArtifact ? 14 : 10);

      if (prop.dropType && typeof this.adventure.spawnPickup === 'function') {
        const hasBonus = Boolean(prop.bonusDrop);
        const dropGy = prop.groundY + 14;
        this.adventure.spawnPickup(
          prop.dropType,
          prop.x - (hasBonus ? 22 : 0),
          dropGy,
          {
            ultAmt: prop.ultAmt || 16,
            relicAmt: prop.relicAmt || 14
          }
        );
        if (hasBonus) {
          this.adventure.spawnPickup(prop.bonusDrop, prop.x + 24, dropGy, {
            ultAmt: prop.ultAmt || 16,
            relicAmt: prop.relicAmt || 14
          });
        }
      }
    }

    vfx?.spawnDamageText?.(
      prop.x,
      prop.groundY - prop.height - 24,
      0,
      true,
      prop.breakCallout ||
        (prop.isArtifact ? 'ANCIENT ARTIFACT UNSEALED!' : 'SHRINE SHATTERED!'),
      prop.calloutColor || (prop.isArtifact ? '#fde047' : '#fb923c')
    );

    return true;
  }

  update(dt, player, game) {
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      p.y = p.groundY;
      if (p.hitShake > 0) p.hitShake = Math.max(0, p.hitShake - dt);
      if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        this.debris.splice(i, 1);
        continue;
      }
      d.vy += 760 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y >= d.groundY && d.vy > 0) {
        d.y = d.groundY;
        if (d.bounces < 2) {
          d.vy *= -0.44;
          d.vx *= 0.72;
          d.bounces++;
        } else {
          d.vy = 0;
          d.vx *= 0.82;
        }
      }
    }

    if (player && !player.isDead) {
      const st = player.state || 'IDLE';
      const stTimer = Number(player.stateTimer) || 0;
      const comboStep = player.comboStep ?? 0;
      const autoVar = player._autoVariant ?? 0;
      const isAtkState =
        st === 'AUTO_ATTACK' ||
        st === 'SKILL' ||
        st === 'ULTIMATE' ||
        st === 'TRUE_ULTIMATE';

      if (
        isAtkState &&
        (st !== this._prevPlayerState ||
          comboStep !== this._prevComboStep ||
          autoVar !== this._prevAutoVariant ||
          stTimer < this._prevStateTimer - 0.001)
      ) {
        this._playerCastId++;
      }

      this._prevPlayerState = st;
      this._prevStateTimer = stTimer;
      this._prevComboStep = comboStep;
      this._prevAutoVariant = autoVar;

      if (isAtkState) {
        const stats = this.adventure?.progression?.getComputedStats?.();
        const atkMult = stats?.atkMult ?? 1.0;
        const skillMult = stats?.skillMult ?? 1.0;
        const playerGy = Number.isFinite(player.groundY) ? player.groundY : player.y || 561;
        const facing = player.facing || 1;
        const atkRange = player.attackRange || 180;

        if (st === 'AUTO_ATTACK' && stTimer >= 0.10) {
          const maxFwd = Math.min(276, atkRange + 64);
          const dmg = Math.max(38, Math.round(48 * atkMult));
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            const dx = (prop.x - player.x) * facing;
            if (dx >= -52 && dx <= maxFwd && Math.abs(prop.groundY - playerGy) <= 84) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, dmg, player, game, false);
            }
          }
        } else if (st === 'SKILL' && stTimer >= 0.14) {
          const maxFwd = Math.min(375, atkRange + 155);
          const dmg = Math.max(65, Math.round(82 * skillMult));
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            const dx = (prop.x - player.x) * facing;
            if (dx >= -92 && dx <= maxFwd && Math.abs(prop.groundY - playerGy) <= 122) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, dmg, player, game, false);
            }
          }
        } else if (st === 'ULTIMATE' && stTimer >= 0.20) {
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            if (
              Math.abs(prop.x - player.x) <= 380 &&
              Math.abs(prop.groundY - playerGy) <= 220
            ) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, 145, player, game, true);
            }
          }
        } else if (st === 'TRUE_ULTIMATE' && stTimer >= 0.65) {
          const centerX = Number.isFinite(game?.renderer?.camX)
            ? game.renderer.camX
            : player.x;
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            if (Math.abs(prop.x - centerX) <= 680) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, 999, player, game, true);
            }
          }
        }
      }
    }

    const vfx = game?.vfx;
    if (!vfx) return;

    if (Array.isArray(vfx.projectiles)) {
      for (let i = vfx.projectiles.length - 1; i >= 0; i--) {
        const p = vfx.projectiles[i];
        if (!p || !p.owner || p.owner.team !== 1) continue;
        const pr = p.radius || 14;
        const ownerGy = Number.isFinite(p.owner.groundY) ? p.owner.groundY : p.y;

        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed) continue;
          if (p._hitProps && p._hitProps.has(prop)) continue;
          if (!p.isMeteor && Math.abs(ownerGy - prop.groundY) > 92) continue;

          if (
            Math.abs(p.x - prop.x) <= pr + prop.halfW + 16 &&
            Math.abs(p.y - (prop.groundY - prop.height * 0.55)) <= pr + prop.height * 0.65 + 26
          ) {
            const dmg = p.isMeteor ? 999 : Math.max(42, Math.round(p.damage || 45));
            this.damageProp(prop, dmg, p.owner, game, Boolean(p.isUltimate || p.isMeteor));
            if (!p.pierce && !p.isMeteor) {
              vfx.spawnBurst?.(p.x, p.y, 8, p.color || '#fb923c', 165, {
                upBias: 60,
                size: 5,
                life: 0.28
              });
              vfx.projectiles.splice(i, 1);
              break;
            } else {
              if (!p._hitProps) p._hitProps = new Set();
              p._hitProps.add(prop);
            }
          }
        }
      }
    }

    if (Array.isArray(vfx.pillars)) {
      for (let i = 0; i < vfx.pillars.length; i++) {
        const pil = vfx.pillars[i];
        if (!pil || !pil.erupted || pil.owner?.team !== 1) continue;
        const reachX = 96 * (pil.scaleWidth || 1);
        const pilGy = pil.groundY || 561;
        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed || (pil._hitProps && pil._hitProps.has(prop))) continue;
          if (
            Math.abs(pil.x - prop.x) <= reachX &&
            Math.abs(pilGy - prop.groundY) <= 118
          ) {
            if (!pil._hitProps) pil._hitProps = new Set();
            pil._hitProps.add(prop);
            this.damageProp(
              prop,
              pil.isUltimate ? 135 : 78,
              pil.owner,
              game,
              Boolean(pil.isUltimate)
            );
          }
        }
      }
    }

    if (Array.isArray(vfx.skyStrikes)) {
      for (let i = 0; i < vfx.skyStrikes.length; i++) {
        const s = vfx.skyStrikes[i];
        if (!s || !s.impacted || s.owner?.team !== 1) continue;
        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed || (s._hitProps && s._hitProps.has(prop))) continue;
          if (Math.abs(s.x - prop.x) <= 96) {
            if (!s._hitProps) s._hitProps = new Set();
            s._hitProps.add(prop);
            this.damageProp(
              prop,
              Math.max(54, Math.round(s.damage || 62)),
              s.owner,
              game,
              Boolean(s.isUltimate)
            );
          }
        }
      }
    }

    if (Array.isArray(vfx.crystalSpikes)) {
      for (let i = 0; i < vfx.crystalSpikes.length; i++) {
        const cs = vfx.crystalSpikes[i];
        if (!cs || !cs.erupted || cs.owner?.team !== 1) continue;
        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed || (cs._hitProps && cs._hitProps.has(prop))) continue;
          if (Math.abs(cs.x - prop.x) <= 82) {
            if (!cs._hitProps) cs._hitProps = new Set();
            cs._hitProps.add(prop);
            this.damageProp(
              prop,
              Math.max(54, Math.round(cs.damage || 60)),
              cs.owner,
              game,
              Boolean(cs.isUltimate)
            );
          }
        }
      }
    }

    if (Array.isArray(vfx.beams)) {
      for (let i = 0; i < vfx.beams.length; i++) {
        const b = vfx.beams[i];
        if (!b || (b.owner && b.owner.team !== 1) || (b.life ?? 0) >= 0.25) continue;
        const minBx = Math.min(b.x1, b.x2) - 24;
        const maxBx = Math.max(b.x1, b.x2) + 24;
        const halfBw = (b.width || 44) * 0.5 + 36;
        const minBy = Math.min(b.y1, b.y2) - halfBw;
        const maxBy = Math.max(b.y1, b.y2) + halfBw;

        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed || (b._hitProps && b._hitProps.has(prop))) continue;
          const propTop = prop.groundY - prop.height - 16;
          const propBot = prop.groundY + 18;
          if (
            prop.x >= minBx &&
            prop.x <= maxBx &&
            propBot >= minBy &&
            propTop <= maxBy
          ) {
            if (!b._hitProps) b._hitProps = new Set();
            b._hitProps.add(prop);
            this.damageProp(prop, 95, player || b.owner, game, true);
          }
        }
      }
    }
  }

  // ===========================================================================
  // FLOOR SHADOWS & PERSISTENT ORTHOGONAL SHATTERED RUBBLE (`renderRubbleAndShadows`)
  // ===========================================================================
  renderRubbleAndShadows(ctx, renderer) {
    if (!ctx) return;
    const zoom = Math.max(0.18, renderer?.zoom || 1);
    const camX = Number.isFinite(renderer?.camX)
      ? renderer.camX
      : Number.isFinite(renderer?.cameraX)
        ? renderer.cameraX
        : 600;
    const halfView = ((renderer?.width || 1280) * 0.5) / zoom + 240;
    const viewLeft = camX - halfView;
    const viewRight = camX + halfView;
    const t = renderer?.time || 0;

    const orthoSheet = getOrBakeOrthogonalPropsSheet();

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.x + p.halfW + 52 < viewLeft || p.x - p.halfW - 52 > viewRight) continue;
      const cx = Math.round(p.x);
      const gy = Math.round(p.groundY);

      if (!p.destroyed) {
        // Crisp horizontal stepped contact shadow directly beneath the flat plinth
        ctx.fillStyle = 'rgba(3, 5, 12, 0.50)';
        ctx.fillRect(cx - p.halfW - 4, gy - 3, (p.halfW + 4) * 2, 7);
        ctx.fillStyle = 'rgba(3, 5, 12, 0.24)';
        ctx.fillRect(cx - p.halfW - 8, gy - 1, (p.halfW + 8) * 2, 6);

        if (p.hasGlow || p.isArtifact) {
          const pulse = 0.78 + 0.22 * Math.sin(t * 4.5 + p.index);
          drawSteppedPropPixelBloom(
            ctx,
            p.primaryColor,
            p.accentColor,
            cx,
            gy + 2,
            p.halfW + 10,
            8,
            0.10 * pulse
          );
        }
        continue;
      }

      // Persistent Low Shattered Horizontal Stone Plinth from `orthoSheet` Row 3 (`sy = 384`)
      ctx.fillStyle = 'rgba(3, 5, 12, 0.44)';
      ctx.fillRect(cx - p.halfW - 4, gy - 3, (p.halfW + 4) * 2, 7);

      if (orthoSheet) {
        const dw = Math.round(PROP_CELL * p.drawScale);
        const dh = Math.round(PROP_CELL * p.drawScale);
        const dx = Math.round(cx - dw * 0.5);
        const dy = Math.round(gy - (PROP_BASE_Y_IN_CELL / PROP_CELL) * dh);
        ctx.drawImage(
          orthoSheet,
          p.sheetCol * PROP_CELL,
          3 * PROP_CELL,
          PROP_CELL,
          PROP_CELL,
          dx,
          dy,
          dw,
          dh
        );
      } else {
        drawHeadlessOrthogonalPropFallback(
          ctx,
          cx,
          gy,
          p.halfW,
          p.height,
          p.primaryColor,
          p.accentColor,
          true
        );
      }
    }

    ctx.restore();
  }

  // ===========================================================================
  // BALLISTIC BOUNCING PIXEL DEBRIS (`renderDebris` — Row 4 Shards, zero rotation!)
  // ===========================================================================
  renderDebris(ctx, _renderer) {
    if (!ctx || this.debris.length === 0) return;
    const assets = PixelForge.initAssets();
    const sheet = assets?.advPropsSheet;
    const sheetReady = isPropSheetReady(sheet);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.debris.length; i++) {
      const d = this.debris[i];
      const rem = 1 - d.life / d.maxLife;
      const alpha = rem < 0.25 ? rem / 0.25 : 1;
      const sz = Math.round(d.size || 22);
      const dx = Math.round(d.x - sz * 0.5);
      const dy = Math.round(d.y - sz * 0.5);

      ctx.globalAlpha = alpha * 0.38;
      ctx.fillStyle = '#03050c';
      ctx.fillRect(Math.round(d.x) - 5, Math.round(d.groundY) - 1, 10, 3);

      ctx.globalAlpha = alpha;
      if (sheetReady) {
        const q = d.quad & 3;
        const sx = (d.shardCol || 6) * PROP_CELL + (q & 1) * 64;
        const sy = 4 * PROP_CELL + ((q >> 1) & 1) * 64;
        ctx.drawImage(sheet, sx, sy, 64, 64, dx, dy, sz, sz);
      } else {
        seloutRect(ctx, Math.round(d.x - 4), Math.round(d.y - 4), 8, 8, d.color, d.hiColor);
      }
    }

    ctx.restore();
  }

  // ===========================================================================
  // INDIVIDUAL FRONT-FACING ORTHOGONAL HD-2D SHRINE RENDERER (`0..8` x Rows `0..2`)
  // ===========================================================================
  renderProp(ctx, prop, renderer, isRefl = false) {
    if (!ctx || !prop || prop.destroyed) return;

    const zoom = Math.max(0.18, renderer?.zoom || 1);
    const camX = Number.isFinite(renderer?.camX)
      ? renderer.camX
      : Number.isFinite(renderer?.cameraX)
        ? renderer.cameraX
        : prop.x;
    const halfView = ((renderer?.width || 1280) * 0.5) / zoom + 260;
    if (prop.x + prop.halfW + 84 < camX - halfView || prop.x - prop.halfW - 84 > camX + halfView) {
      return;
    }

    const t = renderer?.time || 0;
    const shakeX =
      !isRefl && prop.hitShake > 0
        ? Math.round(Math.sin(t * 62 + prop.index * 2.1) * 3 * (prop.hitShake / 0.22))
        : 0;
    const cx = Math.round(prop.x + shakeX);
    const by = Math.round(prop.groundY);
    const isCracked = prop.hp <= prop.maxHp * 0.55;
    const flick = 0.78 + 0.22 * Math.sin(t * 6.4 + prop.index * 1.7);
    const bob = Math.round(Math.sin(t * 3.4 + prop.index) * 2);

    const orthoSheet = getOrBakeOrthogonalPropsSheet();
    const scale = prop.drawScale || 1.12;
    const propDw = Math.round(PROP_CELL * scale);
    const propDh = Math.round(PROP_CELL * scale);
    const propDx = Math.round(cx - propDw * 0.5);
    const propDy = Math.round(by - (PROP_BASE_Y_IN_CELL / PROP_CELL) * propDh);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (orthoSheet) {
      // Row 0: Intact Frame A, Row 1: Intact Shimmer B, Row 2: Cracked (`0 < hp <= 55%`)
      const gleamFrame = Math.floor(t * 2.8 + prop.index * 0.7) % 2;
      const sheetRow = isCracked ? 2 : gleamFrame;
      ctx.drawImage(
        orthoSheet,
        prop.sheetCol * PROP_CELL,
        sheetRow * PROP_CELL,
        PROP_CELL,
        PROP_CELL,
        propDx,
        propDy,
        propDw,
        propDh
      );
    } else {
      drawHeadlessOrthogonalPropFallback(
        ctx,
        cx,
        by,
        prop.halfW,
        prop.height,
        prop.primaryColor,
        prop.accentColor,
        false
      );
    }

    // Live 30fps `adv_stage_vfx.png` pixel flame / prism-aura / mist / surge overlays locked `0.0px`
    // onto each front-facing orthogonal shrine's centered horizontal bowl/core (`cellX = 64.0`)
    const assets = PixelForge.initAssets();
    const stageVfx = !isRefl
      ? PixelForge.ensureImage?.(assets?.advStageVfx) || assets?.advStageVfx
      : null;
    if (!isRefl && isPropSheetReady(stageVfx)) {
      const fStep = (Math.floor(t * 14 + prop.index * 3) % 16 + 16) % 16;

      switch (prop.sheetCol) {
        case 0: // eclipse_brazier: Dual Gold+Cyan flame (`Row 10`) on centered horizontal bowl lip `(64.0, 56.0)`
          blitMonumentVfxSocket(ctx, stageVfx, isCracked, fStep, propDx, propDy, propDw, propDh, 10, 64.0, 56.0, 68, 66, 0.844, 0.86, 0.13);
          break;
        case 1: // eclipse_reliquary: Astral Prism Aura (`Row 11`) on centered sun-rose clasp `(64.0, 75.0)`
          blitMonumentVfxSocket(ctx, stageVfx, isCracked, fStep, propDx, propDy, propDw, propDh, 11, 64.0, 75.0, 44, 44, 0.50, 0.64, 0.12);
          break;
        case 2: // eclipse_astrolabe: Astral Prism Aura (`Row 11`) on centered orrery sun-core `(64.0, 52.0)`
          blitMonumentVfxSocket(ctx, stageVfx, isCracked, fStep, propDx, propDy, propDw, propDh, 11, 64.0, 52.0, 58, 58, 0.50, 0.68, 0.13);
          break;
        case 3: // starwood_lantern: Prism Aura (`Row 11`) on centered twin-bracket lantern core `(64.0, 62.0)`
          blitMonumentVfxSocket(ctx, stageVfx, isCracked, fStep, propDx, propDy, propDw, propDh, 11, 64.0, 62.0, 50, 52, 0.50, 0.70, 0.13);
          break;
        case 4: // starwood_crystal: Prism Aura (`Row 11`) on centered moon-crystal cairn `(64.0, 56.0)`
          blitMonumentVfxSocket(ctx, stageVfx, isCracked, fStep, propDx, propDy, propDw, propDh, 11, 64.0, 56.0, 64, 68, 0.50, 0.66, 0.13);
          break;
        case 5: // soul_brazier: Necrotic Soul-Pyre (`Row 4`) on centered horizontal crypt urn lip `(64.0, 58.0)`
          blitMonumentVfxSocket(ctx, stageVfx, isCracked, fStep, propDx, propDy, propDw, propDh, 4, 64.0, 58.0, 74, 72, 0.844, 0.88, 0.13);
          break;
        case 6: // ossuary_obelisk: Spectral Mist Coil (`Row 8`) across centered crypt altar alcove `(64.0, 68.0)`
          blitMonumentVfxSocket(ctx, stageVfx, isCracked, fStep, propDx, propDy, propDw, propDh, 8, 64.0, 68.0, 76, 46, 0.50, 0.64, 0.11);
          break;
        case 7: // blackpit_brazier: Wide Hellfire Roar (`Row 6`) on centered spiked cauldron lip `(64.0, 58.0)`
          blitMonumentVfxSocket(ctx, stageVfx, isCracked, fStep, propDx, propDy, propDw, propDh, 6, 64.0, 58.0, 76, 74, 0.844, 0.88, 0.14);
          break;
        case 8: // hellfire_pylon: Molten Fissure Surge (`Row 9`) on summit crucible `(64.0, 44.0)` & base vent `(64.0, 98.0)`
          blitMonumentVfxSocket(ctx, stageVfx, isCracked, fStep, propDx, propDy, propDw, propDh, 9, 64.0, 44.0, 64, 44, 0.5625, 0.72, 0.12, 0);
          blitMonumentVfxSocket(ctx, stageVfx, isCracked, fStep, propDx, propDy, propDw, propDh, 9, 64.0, 98.0, 70, 42, 0.5625, 0.68, 0.11, 7);
          break;
        default:
          break;
      }
    }

    // Fallback stepped pixel-grid core bloom only while deferred `advStageVfx` is still loading
    if (!isRefl && !isPropSheetReady(stageVfx) && (prop.hasGlow || prop.isArtifact)) {
      drawSteppedPropPixelBloom(
        ctx,
        prop.primaryColor,
        prop.accentColor,
        cx,
        by - prop.height * 0.58,
        24,
        24,
        0.10 * flick
      );
    }

    // Crisp pixel impact-glint cross on strike
    if (!isRefl && prop.hitFlash > 0) {
      const fcy = Math.round(by - prop.height * 0.52);
      ctx.globalAlpha = Math.min(0.85, prop.hitFlash / 0.16);
      pxFill(ctx, cx - 14, fcy - 2, 28, 4, '#fef08a');
      pxFill(ctx, cx - 2, fcy - 14, 4, 28, '#fef08a');
      pxFill(ctx, cx - 5, fcy - 5, 10, 10, '#ffffff');
      ctx.globalAlpha = 1;
    }

    // Subtle Ancient Artifact overhead diamond beacon + damaged mini pixel HP bar
    if (!isRefl) {
      if (prop.isArtifact) {
        const ay = by - prop.height - 12 + bob;
        seloutRect(ctx, cx - 5, ay - 5, 10, 10, prop.accentColor, '#ffffff');
      }
      if (prop.hp < prop.maxHp) {
        const bw = 44;
        const bx = cx - (bw >> 1);
        const barY = by - prop.height - (prop.isArtifact ? 24 : 10);
        const ratio = Math.max(0, Math.min(1, prop.hp / prop.maxHp));
        pxFill(ctx, bx - 1, barY - 1, bw + 2, 6, SELOUT);
        pxFill(ctx, bx, barY, bw, 4, '#1e293b');
        pxFill(
          ctx,
          bx,
          barY,
          Math.max(2, Math.round(bw * ratio)),
          4,
          isCracked ? '#ef4444' : '#facc15'
        );
      }
    }

    ctx.restore();
  }
}
