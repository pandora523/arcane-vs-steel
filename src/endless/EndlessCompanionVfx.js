// Endless Crusade 30fps Next-Gen EX Companion VFX Renderer (`*_ex_vfx.png`, 6240x1664 = 8x30 @ 208x208)
// 100% lossless nearest-neighbor pixel purity, Node-safe, zero-leak ring pool, pure ASCII.

import { PixelForge } from '../engine/PixelForge.js?v=30fps207';

export const COMPANION_VFX_CELL_SIZE = 208;
export const COMPANION_VFX_COLS = 30;
export const COMPANION_VFX_ROWS = 8;

const VFX_ASSET_QUERY = '?v=30fps207';
const MAX_BLOOM_ALPHA = 0.18;
const DEFAULT_MAX_INSTANCES = 76;
const MAX_DT_STEP = 0.1;

function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const val = obj[keys[i]];
    if (val && typeof val === 'object') {
      deepFreeze(val);
    }
  }
  return Object.freeze(obj);
}

function makeManifestEntry({
  heroKey,
  companionId,
  role,
  palette,
  auto,
  projectile,
  skill,
  ult
}) {
  return deepFreeze({
    heroKey,
    companionId,
    role,
    sheetPath: `assets/sprites/${heroKey}_vfx.png`,
    cellW: COMPANION_VFX_CELL_SIZE,
    cellH: COMPANION_VFX_CELL_SIZE,
    cols: COMPANION_VFX_COLS,
    rows: COMPANION_VFX_ROWS,
    palette,
    auto,
    projectile,
    skill,
    ult
  });
}

/**
 * Authentic 8-row VFX manifest for all 12 Endless Crusade EX companions.
 * Every row index (0..7) and split-col range matches the verified 6240x1664
 * `assets/sprites/<heroKey>_vfx.png` sheet and `src/entities/*Ex.js` contract.
 */
export const COMPANION_EX_VFX_MANIFEST = Object.freeze({
  warrior_ex: makeManifestEntry({
    heroKey: 'warrior_ex',
    companionId: 'aethelgard',
    role: 'TANK',
    palette: { primary: '#38bdf8', secondary: '#fef08a', core: '#ffffff' },
    // R0: Dawn-Breaker Crescent Wave, R1: Sky-Strike (0..11) / Aegis Crest (12..29),
    // R2: Dawn-Blade Spire Pillar, R3: Celestial Pentagram Floor Seal,
    // R4: Omnislash Cross-Cleave Nova, R5: Rose-Sanctuary Great-Slash,
    // R6: Cathedral Light-Column & Monolith Greatsword, R7: Seraphim Dawn-Feather
    auto: {
      row: 0,
      scale: 0.92,
      duration: 0.28,
      offsetX: 34,
      offsetY: -78,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 0,
      impactRow: 4,
      scale: 0.66,
      impactScale: 0.80,
      duration: 0.28,
      offsetY: -74,
      flipWithVel: true
    },
    skill: {
      groundRow: 3,
      casterRow: 1,
      casterStartCol: 12,
      casterEndCol: 29,
      targetRow: 2,
      secondaryRow: 4,
      scale: 1.08,
      groundScale: 1.18,
      groundAspect: 0.52,
      duration: 0.56,
      targetOffsetY: 0,
      anchorBottom: true,
      multiCount: 2
    },
    ult: {
      castRow: 1,
      castStartCol: 12,
      castEndCol: 29,
      groundRow: 3,
      mainRow: 6,
      accentRow: 2,
      burstRow: 4,
      scale: 1.46,
      groundScale: 1.46,
      groundAspect: 0.52,
      accentScale: 1.14,
      mainTall: 1.16,
      duration: 0.78,
      castDuration: 0.62,
      anchorBottom: true,
      pattern: 'cataclysm'
    }
  }),

  priestess_ex: makeManifestEntry({
    heroKey: 'priestess_ex',
    companionId: 'seraphina',
    role: 'HEALER',
    palette: { primary: '#fde047', secondary: '#4ade80', core: '#ffffff' },
    // R0: Sanctum Diamond Star-Cross Ray Orb, R1: Purifying Sky-Ray & Star Geyser,
    // R2: Golden Cathedral Organ-of-Light Column, R3: Cathedral Rose Window Mandala,
    // R4: Rose-Window Magic Circle & Starburst Seal, R5: Genesis Lumen Celestial Dome,
    // R6: Prismatic Scepter Muzzle, R7: Prismatic Horizon Spindle Beam
    auto: {
      row: 4,
      scale: 0.76,
      duration: 0.28,
      offsetX: 28,
      offsetY: -82,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 0,
      impactRow: 4,
      scale: 0.64,
      impactScale: 0.80,
      duration: 0.30,
      offsetY: -78,
      flipWithVel: true
    },
    skill: {
      groundRow: 4,
      casterRow: 3,
      targetRow: 2,
      secondaryRow: 1,
      scale: 1.06,
      groundScale: 1.14,
      groundAspect: 0.44,
      duration: 0.54,
      targetOffsetY: 0,
      anchorBottom: true,
      multiCount: 2
    },
    ult: {
      castRow: 5,
      groundRow: 4,
      mainRow: 2,
      accentRow: 3,
      beamRow: 7,
      scale: 1.38,
      groundScale: 1.42,
      groundAspect: 0.44,
      accentScale: 1.14,
      mainTall: 1.18,
      duration: 0.80,
      castDuration: 0.64,
      anchorBottom: true,
      pattern: 'sanctuary'
    }
  }),

  mage_ex: makeManifestEntry({
    heroKey: 'mage_ex',
    companionId: 'ignis_sol',
    role: 'BLASTER',
    palette: { primary: '#fb923c', secondary: '#fde047', core: '#ffffff' },
    // R0: Helios Solar Comet, R1: Braided Heliacal Corona Pillar,
    // R2: Black-Sun Eclipse Singularity Ring, R3: Grand Helios Astrolabe & Solar Core,
    // R4: Golden Solar Astrolabe Magic Circle, R5: Heavensfall Sky Breach Portal (2.5D),
    // R6: Colossal Dreadnought Voronoi Sun-Meteor, R7: Volcanic Comet Wake & Mach Rings
    auto: {
      row: 4,
      scale: 0.76,
      duration: 0.28,
      offsetX: 28,
      offsetY: -84,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 0,
      impactRow: 3,
      scale: 0.66,
      impactScale: 0.84,
      duration: 0.30,
      offsetY: -80,
      flipWithVel: true
    },
    skill: {
      groundRow: 4,
      casterRow: 4,
      targetRow: 1,
      secondaryRow: 2,
      scale: 1.14,
      groundScale: 1.18,
      groundAspect: 0.46,
      duration: 0.56,
      targetOffsetY: 0,
      anchorBottom: true,
      multiCount: 2
    },
    ult: {
      castRow: 3,
      groundRow: 5,
      mainRow: 6,
      accentRow: 1,
      wakeRow: 7,
      burstRow: 2,
      scale: 1.42,
      groundScale: 1.44,
      groundAspect: 0.74,
      accentScale: 1.18,
      duration: 0.84,
      castDuration: 0.64,
      anchorBottom: false,
      pattern: 'meteor_triple'
    }
  }),

  archer_ex: makeManifestEntry({
    heroKey: 'archer_ex',
    companionId: 'sylvanis',
    role: 'ARCHER',
    palette: { primary: '#34d399', secondary: '#fef08a', core: '#ffffff' },
    // R0: Piercing Emerald-Gold Astral Wind-Arrow,
    // R1: Descending Starfall Comet-Arrow (0..11) & Ground Wind Geyser (12..29),
    // R2: Verdant Yggdrasil Root-Star Snare Sigil, R3: Tempest Wind-Dragon Vortex,
    // R4: Emerald-Gold Star-Cross Impact Burst, R5: Yggdrasil Constellation Seal,
    // R6: Drawn Celestial Greatbow Muzzle, R7: Supernova Dragon-Arrow Beam Segment
    auto: {
      row: 3,
      scale: 0.74,
      duration: 0.26,
      offsetX: 34,
      offsetY: -82,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 0,
      impactRow: 4,
      scale: 0.68,
      impactScale: 0.80,
      duration: 0.28,
      offsetY: -78,
      flipWithVel: true
    },
    skill: {
      groundRow: 2,
      casterRow: 6,
      targetRow: 1,
      secondaryRow: 4,
      scale: 1.06,
      groundScale: 1.14,
      groundAspect: 0.50,
      duration: 0.56,
      targetOffsetY: 0,
      anchorBottom: true,
      multiCount: 3
    },
    ult: {
      castRow: 6,
      groundRow: 5,
      mainRow: 7,
      accentRow: 1,
      burstRow: 4,
      beamRow: 7,
      scale: 1.34,
      groundScale: 1.38,
      groundAspect: 0.50,
      accentScale: 1.14,
      duration: 0.80,
      castDuration: 0.62,
      anchorBottom: false,
      pattern: 'starfall_volley'
    }
  }),

  valkyrie_ex: makeManifestEntry({
    heroKey: 'valkyrie_ex',
    companionId: 'freyja',
    role: 'LANCER',
    palette: { primary: '#facc15', secondary: '#38bdf8', core: '#ffffff' },
    // R0: Winged Gungnir Lightning War-Lance (+X),
    // R1: Split Descending Gungnir Spear (0..11) & Blazing Valhalla Crater (12..29),
    // R2: Erupting Dragonfire Obelisk Spire, R3: Sovereign Winged Dragon Crest,
    // R4: Valhalla Dragonfire Lightning Burst & Crescent, R5: Bifrost Target Seal,
    // R6: Colossal Einherjar Winged Sky-Spear, R7: Gungnir Ragnarok Dragon-Pillar
    auto: {
      row: 4,
      scale: 0.94,
      duration: 0.28,
      offsetX: 38,
      offsetY: -82,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 0,
      impactRow: 4,
      scale: 0.72,
      impactScale: 0.84,
      duration: 0.28,
      offsetY: -80,
      flipWithVel: true
    },
    skill: {
      groundRow: 5,
      casterRow: 3,
      targetRow: 2,
      secondaryRow: 4,
      scale: 1.12,
      groundScale: 1.16,
      groundAspect: 0.46,
      duration: 0.56,
      targetOffsetY: 0,
      anchorBottom: true,
      multiCount: 2
    },
    ult: {
      castRow: 3,
      groundRow: 5,
      mainRow: 7,
      accentRow: 6,
      flankRow: 2,
      burstRow: 4,
      scale: 1.44,
      groundScale: 1.44,
      groundAspect: 0.46,
      accentScale: 1.18,
      mainTall: 1.18,
      duration: 0.82,
      castDuration: 0.64,
      anchorBottom: true,
      pattern: 'valhalla_spear'
    }
  }),

  ronin_ex: makeManifestEntry({
    heroKey: 'ronin_ex',
    companionId: 'kaze_maru',
    role: 'STRIKER',
    palette: { primary: '#22d3ee', secondary: '#fef08a', core: '#ffffff' },
    // R0: Storm-Katana Crescent Wave, R1: Zantetsuken Twin-Odachi Flash & Saya Burst,
    // R2: Raijin Sky-Lightning Judgment Pillar, R3: Susanoo 8-Drum Mitsudomoe Crest,
    // R4: Susanoo Sixfold Storm-Blade Slash Ring, R5: Indigo-Cyan Thunder-Drum Eye Seal,
    // R6: Blood-Moon Raijin Thunder-Drum Sanctuary, R7: Surgical Iaido Dimensional Rift
    auto: {
      row: 0,
      scale: 0.94,
      duration: 0.26,
      offsetX: 34,
      offsetY: -78,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 0,
      impactRow: 1,
      scale: 0.66,
      impactScale: 0.82,
      duration: 0.26,
      offsetY: -76,
      flipWithVel: true
    },
    skill: {
      groundRow: 5,
      casterRow: 7,
      targetRow: 1,
      secondaryRow: 7,
      scale: 1.10,
      groundScale: 1.14,
      groundAspect: 0.50,
      duration: 0.52,
      targetOffsetY: -82,
      anchorBottom: false,
      multiCount: 3
    },
    ult: {
      castRow: 6,
      groundRow: 3,
      mainRow: 4,
      accentRow: 2,
      riftRow: 7,
      burstRow: 1,
      scale: 1.44,
      groundScale: 1.42,
      groundAspect: 0.50,
      accentScale: 1.18,
      duration: 0.80,
      castDuration: 0.60,
      anchorBottom: false,
      pattern: 'iaido_cross'
    }
  }),

  chronomancer_ex: makeManifestEntry({
    heroKey: 'chronomancer_ex',
    companionId: 'chronos',
    role: 'WEAVER',
    palette: { primary: '#c084fc', secondary: '#38bdf8', core: '#fef08a' },
    // R0: Minute-Glaive Temporal Wave, R1: Spinning Escapement Astrolabe Wheel,
    // R2: Paradox Hourglass Temporal Monolith, R3: Grand XII Roman Astrolabe Clockface,
    // R4: Temporal Glass Starburst & Shock-Ring, R5: Twin Hands Pincer X-Slice,
    // R6: Astronomic Clock-Hand Spear Crest, R7: Twelfth-Bell Eternal Zero Shatter Nova
    auto: {
      row: 0,
      scale: 0.86,
      duration: 0.28,
      offsetX: 30,
      offsetY: -82,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 1,
      impactRow: 4,
      scale: 0.64,
      impactScale: 0.82,
      duration: 0.28,
      offsetY: -78,
      flipWithVel: true
    },
    skill: {
      groundRow: 3,
      casterRow: 1,
      targetRow: 5,
      secondaryRow: 4,
      scale: 1.10,
      groundScale: 1.24,
      groundAspect: 0.50,
      duration: 0.60,
      targetOffsetY: -84,
      anchorBottom: false,
      multiCount: 2
    },
    ult: {
      castRow: 3,
      groundRow: 3,
      mainRow: 7,
      accentRow: 2,
      sliceRow: 5,
      wheelRow: 1,
      scale: 1.46,
      groundScale: 1.54,
      groundAspect: 0.50,
      accentScale: 1.18,
      duration: 0.84,
      castDuration: 0.64,
      anchorBottom: false,
      pattern: 'chrono_astrolabe'
    }
  }),

  brawler_ex: makeManifestEntry({
    heroKey: 'brawler_ex',
    companionId: 'raijin_ex',
    role: 'BRAWLER',
    palette: { primary: '#fbbf24', secondary: '#38bdf8', core: '#ffffff' },
    // R0: Thunderclap Crescent Arc, R1: Twin-Helix Sky-Breaker Lightning Vortex,
    // R2: Horizontal Thunderstep Lightning Wind-Streaks, R3: Sculpted Giant Punch-Fists,
    // R4: Heaven-Splitting Raijin Sky-Bolt Pillar, R5: Shattered Thunder-Crater Shockwave,
    // R6: 4-Point Iron-Guard Parry Starburst, R7: Spinning Raijin Tomoe Drum Mandala
    auto: {
      row: 0,
      scale: 0.90,
      duration: 0.26,
      offsetX: 38,
      offsetY: -82,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 2,
      impactRow: 6,
      scale: 0.68,
      impactScale: 0.80,
      duration: 0.26,
      offsetY: -78,
      flipWithVel: true
    },
    skill: {
      groundRow: 5,
      casterRow: 2,
      targetRow: 1,
      secondaryRow: 3,
      scale: 1.14,
      groundScale: 1.24,
      groundAspect: 0.56,
      duration: 0.56,
      targetOffsetY: 0,
      anchorBottom: true,
      multiCount: 2
    },
    ult: {
      castRow: 7,
      groundRow: 5,
      mainRow: 4,
      accentRow: 3,
      vortexRow: 1,
      burstRow: 6,
      scale: 1.46,
      groundScale: 1.48,
      groundAspect: 0.54,
      accentScale: 1.18,
      mainTall: 1.20,
      duration: 0.82,
      castDuration: 0.62,
      anchorBottom: true,
      pattern: 'thunder_barrage'
    }
  }),

  nyx_ex: makeManifestEntry({
    heroKey: 'nyx_ex',
    companionId: 'nyx_ex',
    role: 'ASSASSIN',
    palette: { primary: '#e879f9', secondary: '#38bdf8', core: '#fef08a' },
    // R0: 3D-Spinning Neon Star-Prism Window & Starburst Trail,
    // R1: Translucent Neon "404" Hologram Alert Window,
    // R2: Rotating "Cob" Creator Astrolabe Seal,
    // R3: 2.5D Cosmic Floor Mandala & Dashed Marquee Ring,
    // R4: Expanding 3-Arm Cosmic Supernova Galaxy Vortex,
    // R5: Animated Cyber-Neko Orbital Terminal Drone,
    // R6: Glowing "AFK" Holographic Neko Decoy,
    // R7: Colossal Grand "Cob" Creator Genesis Solar-Astrolabe Core
    auto: {
      row: 0,
      scale: 0.86,
      duration: 0.26,
      offsetX: 34,
      offsetY: -82,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 0,
      impactRow: 4,
      scale: 0.64,
      impactScale: 0.82,
      duration: 0.28,
      offsetY: -80,
      flipWithVel: true
    },
    skill: {
      groundRow: 3,
      casterRow: 6,
      targetRow: 4,
      secondaryRow: 1,
      scale: 1.10,
      groundScale: 1.22,
      groundAspect: 0.44,
      duration: 0.54,
      targetOffsetY: -88,
      anchorBottom: false,
      multiCount: 3
    },
    ult: {
      castRow: 2,
      groundRow: 3,
      mainRow: 7,
      accentRow: 4,
      droneRow: 5,
      popupRow: 1,
      scale: 1.46,
      groundScale: 1.48,
      groundAspect: 0.44,
      accentScale: 1.16,
      duration: 0.82,
      castDuration: 0.62,
      anchorBottom: false,
      pattern: 'void_phantom'
    }
  }),

  reaper_ex: makeManifestEntry({
    heroKey: 'reaper_ex',
    companionId: 'reaper_ex',
    role: 'REAPER',
    palette: { primary: '#f43f5e', secondary: '#c084fc', core: '#fef08a' },
    // R0: Tattered Crimson-Violet Soul-Scythe Wave,
    // R1: Homing Abyssal Soul-Lantern & Skull Wisp,
    // R2: Erupting Ossuary Necrotic Bone-Spire,
    // R3: Thanatos Sovereign Rift Halo & Spectral Death-Avatar Aura,
    // R4: Blood-Moon Abyssal Reap Starburst Nova,
    // R5: Twin Obsidian Gothic Gates of the Necropolis,
    // R6: Blood-Moon Eclipse & Grave-Chain Covenant Seal,
    // R7: Memento Mori Death-God Guillotine Crescent
    auto: {
      row: 0,
      scale: 0.96,
      duration: 0.28,
      offsetX: 36,
      offsetY: -82,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 1,
      impactRow: 4,
      scale: 0.74,
      impactScale: 0.86,
      duration: 0.28,
      offsetY: -78,
      flipWithVel: true
    },
    skill: {
      groundRow: 6,
      casterRow: 1,
      targetRow: 7,
      secondaryRow: 2,
      scale: 1.16,
      groundScale: 1.24,
      groundAspect: 0.50,
      duration: 0.56,
      targetOffsetY: -88,
      anchorBottom: false,
      multiCount: 2
    },
    ult: {
      castRow: 3,
      groundRow: 6,
      mainRow: 7,
      accentRow: 5,
      spireRow: 2,
      burstRow: 4,
      scale: 1.50,
      groundScale: 1.50,
      groundAspect: 0.50,
      accentScale: 1.24,
      duration: 0.84,
      castDuration: 0.64,
      anchorBottom: false,
      pattern: 'soul_harvest'
    }
  }),

  icemage_ex: makeManifestEntry({
    heroKey: 'icemage_ex',
    companionId: 'icemage_ex',
    role: 'CRYO MAGE',
    palette: { primary: '#67e8f9', secondary: '#e0f2fe', core: '#ffffff' },
    // R0: Faceted Borealis Cryo-Lance Comet,
    // R1: Spinning 6-Bladed Borealis Snowflake Chakram Halo,
    // R2: Erupting Refractive Borealis Glacier Prism Monolith,
    // R3: Stained-Glass Borealis Rose Permafrost Lotus Crest,
    // R4: Giant Celestial Coronation Ice-Claymore,
    // R5: Aurora Borealis Sovereign Snowflake Mandala,
    // R6: Zero-Kelvin Refractive Diamond-Coffin Monolith,
    // R7: Diamond Dust Borealis Starburst Shatter
    auto: {
      row: 3,
      scale: 0.78,
      duration: 0.28,
      offsetX: 30,
      offsetY: -82,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 0,
      impactRow: 7,
      scale: 0.72,
      impactScale: 0.84,
      duration: 0.28,
      offsetY: -80,
      flipWithVel: true
    },
    skill: {
      groundRow: 5,
      casterRow: 1,
      targetRow: 2,
      secondaryRow: 7,
      scale: 1.14,
      groundScale: 1.22,
      groundAspect: 0.44,
      duration: 0.58,
      targetOffsetY: 0,
      anchorBottom: true,
      multiCount: 2
    },
    ult: {
      castRow: 5,
      groundRow: 5,
      mainRow: 6,
      accentRow: 2,
      bladeRow: 4,
      burstRow: 7,
      scale: 1.46,
      groundScale: 1.48,
      groundAspect: 0.44,
      accentScale: 1.18,
      mainTall: 1.15,
      duration: 0.84,
      castDuration: 0.64,
      anchorBottom: true,
      pattern: 'absolute_zero'
    }
  }),

  android_ex: makeManifestEntry({
    heroKey: 'android_ex',
    companionId: 'android_ex',
    role: 'VANGUARD',
    palette: { primary: '#22d3ee', secondary: '#facc15', core: '#ffffff' },
    // R0: Muramasa-09 HF-Plasma Odachi Crescent Wave & Chakram Disc,
    // R1: Autonomous Cyber Fin-Funnel Drone Pod & Hex Aegis Prism,
    // R2: Singularity EMP Gravity Tether Spire,
    // R3: Valkyrie Holo Target-Lock Hex Reticle,
    // R4: Hex-Glitch Cross-Slash & Cyber Impact Starburst,
    // R5: Cyber Singularity Reactor Sphere & Orbital Relay Core,
    // R6: Fin-Funnel All-Range Convergence Laser Node,
    // R7: Overdrive Orbital Satellite Buster / Railgun Column
    auto: {
      row: 0,
      scale: 0.88,
      duration: 0.26,
      offsetX: 34,
      offsetY: -82,
      layer: 'foreground',
      anchorBottom: false,
      startCol: 0,
      endCol: 29
    },
    projectile: {
      row: 6,
      impactRow: 4,
      scale: 0.70,
      impactScale: 0.84,
      duration: 0.26,
      offsetY: -78,
      flipWithVel: true
    },
    skill: {
      groundRow: 3,
      casterRow: 1,
      targetRow: 2,
      secondaryRow: 4,
      scale: 1.10,
      groundScale: 1.18,
      groundAspect: 0.52,
      duration: 0.56,
      targetOffsetY: 0,
      anchorBottom: true,
      multiCount: 3
    },
    ult: {
      castRow: 5,
      groundRow: 3,
      mainRow: 7,
      accentRow: 6,
      podRow: 1,
      burstRow: 4,
      beamRow: 6,
      scale: 1.48,
      groundScale: 1.44,
      groundAspect: 0.52,
      accentScale: 1.16,
      mainTall: 1.24,
      duration: 0.84,
      castDuration: 0.62,
      anchorBottom: true,
      pattern: 'orbital_rail'
    }
  })
});

const COMPANION_ALIAS_TO_HERO_KEY = Object.freeze({
  // Direct heroKeys
  warrior_ex: 'warrior_ex',
  priestess_ex: 'priestess_ex',
  mage_ex: 'mage_ex',
  archer_ex: 'archer_ex',
  valkyrie_ex: 'valkyrie_ex',
  ronin_ex: 'ronin_ex',
  chronomancer_ex: 'chronomancer_ex',
  brawler_ex: 'brawler_ex',
  nyx_ex: 'nyx_ex',
  reaper_ex: 'reaper_ex',
  icemage_ex: 'icemage_ex',
  android_ex: 'android_ex',
  // Base hero keys
  warrior: 'warrior_ex',
  priestess: 'priestess_ex',
  mage: 'mage_ex',
  archer: 'archer_ex',
  valkyrie: 'valkyrie_ex',
  ronin: 'ronin_ex',
  chronomancer: 'chronomancer_ex',
  brawler: 'brawler_ex',
  nyx: 'nyx_ex',
  reaper: 'reaper_ex',
  icemage: 'icemage_ex',
  android: 'android_ex',
  // Companion IDs & common aliases
  aethelgard: 'warrior_ex',
  seraphina: 'priestess_ex',
  ignis_sol: 'mage_ex',
  ignis: 'mage_ex',
  'ignis-sol': 'mage_ex',
  sylvanis: 'archer_ex',
  freyja: 'valkyrie_ex',
  kaze_maru: 'ronin_ex',
  kazemaru: 'ronin_ex',
  'kaze-maru': 'ronin_ex',
  chronos: 'chronomancer_ex',
  raijin_ex: 'brawler_ex',
  raijin: 'brawler_ex',
  'raijin-ex': 'brawler_ex',
  'nyx-ex': 'nyx_ex',
  'reaper-ex': 'reaper_ex',
  malakor: 'reaper_ex',
  malakor_ex: 'reaper_ex',
  'icemage-ex': 'icemage_ex',
  lyra: 'icemage_ex',
  lyra_ex: 'icemage_ex',
  'android-ex': 'android_ex',
  aegis_09: 'android_ex',
  'aegis-09': 'android_ex',
  aegis09: 'android_ex'
});

const ROLE_TO_HERO_KEY = Object.freeze({
  TANK: 'warrior_ex',
  HEALER: 'priestess_ex',
  BLASTER: 'mage_ex',
  ARCHER: 'archer_ex',
  LANCER: 'valkyrie_ex',
  STRIKER: 'ronin_ex',
  WEAVER: 'chronomancer_ex',
  BRAWLER: 'brawler_ex',
  ASSASSIN: 'nyx_ex',
  REAPER: 'reaper_ex',
  'CRYO MAGE': 'icemage_ex',
  VANGUARD: 'android_ex'
});

const MELEE_ROLES = new Set(['TANK', 'LANCER', 'STRIKER', 'BRAWLER', 'ASSASSIN', 'REAPER']);
const ALL_HERO_KEYS = Object.freeze(Object.keys(COMPANION_EX_VFX_MANIFEST));

function clampNum(v, lo, hi) {
  if (!Number.isFinite(v)) return lo;
  return v < lo ? lo : v > hi ? hi : v;
}

function clampInt(v, lo, hi, fallback = lo) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i < lo ? lo : i > hi ? hi : i;
}

function resolveHeroKeyFromString(raw) {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return '';
  if (Object.prototype.hasOwnProperty.call(COMPANION_EX_VFX_MANIFEST, cleaned)) {
    return cleaned;
  }
  if (Object.prototype.hasOwnProperty.call(COMPANION_ALIAS_TO_HERO_KEY, cleaned)) {
    return COMPANION_ALIAS_TO_HERO_KEY[cleaned];
  }
  return '';
}

function resolveHeroKey(heroKeyOrEntity) {
  if (!heroKeyOrEntity) return '';
  if (typeof heroKeyOrEntity === 'string') {
    return resolveHeroKeyFromString(heroKeyOrEntity);
  }
  if (typeof heroKeyOrEntity === 'object') {
    const candidates = [
      heroKeyOrEntity.heroId,
      heroKeyOrEntity.heroKey,
      heroKeyOrEntity.baseHeroId,
      heroKeyOrEntity.companionId,
      heroKeyOrEntity.id,
      heroKeyOrEntity.cfg?.heroKey,
      heroKeyOrEntity.cfg?.id
    ];
    for (let i = 0; i < candidates.length; i++) {
      const key = resolveHeroKeyFromString(candidates[i]);
      if (key) return key;
    }
    if (typeof heroKeyOrEntity.role === 'string') {
      const byRole = ROLE_TO_HERO_KEY[heroKeyOrEntity.role.trim().toUpperCase()];
      if (byRole) return byRole;
    }
  }
  return '';
}

export function getCompanionVfxProfile(heroKeyOrCompanionId) {
  const key = resolveHeroKey(heroKeyOrCompanionId);
  return key ? COMPANION_EX_VFX_MANIFEST[key] || null : null;
}

export function getCompanionVfxSheetPath(heroKeyOrCompanionId) {
  const profile = getCompanionVfxProfile(heroKeyOrCompanionId);
  return profile ? profile.sheetPath : '';
}

function isValidVfxImage(img) {
  if (!img) return false;
  if (img.__avsPending || img.__avsFailed || img._loadFailed) return false;
  if (img.complete === false) return false;
  const nw = Number(img.naturalWidth) || 0;
  const nh = Number(img.naturalHeight) || 0;
  return nw >= COMPANION_VFX_CELL_SIZE && nh >= COMPANION_VFX_CELL_SIZE;
}

function createEmptyPoolSlot() {
  return {
    active: false,
    seq: 0,
    heroKey: '',
    row: 0,
    startCol: 0,
    endCol: COMPANION_VFX_COLS - 1,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    scale: 1,
    aspectY: 1,
    layer: 'foreground',
    anchorBottom: false,
    age: 0,
    duration: 0.35,
    delay: 0,
    alpha: 0.96,
    bloom: 0.14,
    color: '#38bdf8',
    secondaryColor: '#fef08a',
    coreColor: '#ffffff',
    fadeInFrac: 0.12,
    fadeOutFrac: 0.72,
    followEntity: null,
    followOffsetX: 0,
    followOffsetY: 0,
    priority: 1
  };
}

function drawFourPointPixelGlint(ctx, cx, cy, armLen, outerColor, coreColor = '#ffffff') {
  if (typeof ctx.fillRect !== 'function') return;
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const arm = Math.max(3, Math.round(armLen));

  // Crisp 1px dark selout behind the 4-point pixel star
  ctx.fillStyle = '#0d0f1c';
  ctx.fillRect(ix - arm - 1, iy - 2, (arm + 1) * 2, 4);
  ctx.fillRect(ix - 2, iy - arm - 1, 4, (arm + 1) * 2);
  ctx.fillRect(ix - 3, iy - 3, 6, 6);

  // Colored pixel arms
  ctx.fillStyle = outerColor || '#fef08a';
  ctx.fillRect(ix - arm, iy - 1, arm * 2, 2);
  ctx.fillRect(ix - 1, iy - arm, 2, arm * 2);
  ctx.fillRect(ix - 2, iy - 2, 4, 4);

  // Incandescent pixel core
  ctx.fillStyle = coreColor || '#ffffff';
  ctx.fillRect(ix - 1, iy - 1, 2, 2);
}

function drawCompactFloorSealFallback(ctx, cx, cy, radiusX, radiusY, primary, secondary, alpha) {
  if (typeof ctx.fillRect !== 'function') return;
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const rx = Math.max(14, Math.round(radiusX));
  const ry = Math.max(6, Math.round(radiusY));
  const step = 3;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = clampNum(alpha, 0, 0.85);

  for (let dy = -ry; dy <= ry; dy += step) {
    const t = Math.abs(dy) / ry;
    const span = Math.max(step, Math.round((1 - t) * rx));
    const y = iy + dy;
    const isApex = Math.abs(dy) >= ry - step;
    ctx.fillStyle = primary || '#38bdf8';
    if (isApex) {
      ctx.fillRect(ix - span, y, span * 2, 2);
    } else {
      ctx.fillRect(ix - span, y, 4, 2);
      ctx.fillRect(ix + span - 4, y, 4, 2);
    }
  }

  drawFourPointPixelGlint(ctx, ix - rx, iy, 3, secondary || '#fef08a', '#ffffff');
  drawFourPointPixelGlint(ctx, ix + rx, iy, 3, secondary || '#fef08a', '#ffffff');
  ctx.restore();
}

function drawCompactBurstFallback(ctx, cx, cy, armLen, primary, secondary, core, alpha) {
  if (typeof ctx.fillRect !== 'function') return;
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const arm = clampInt(armLen, 6, 22, 10);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = clampNum(alpha, 0, 0.9);
  drawFourPointPixelGlint(ctx, ix, iy, arm, primary || '#38bdf8', core || '#ffffff');
  const diag = Math.max(4, Math.round(arm * 0.55));
  drawFourPointPixelGlint(ctx, ix - diag, iy - diag, 3, secondary || '#fef08a', core || '#ffffff');
  drawFourPointPixelGlint(ctx, ix + diag, iy + diag, 3, secondary || '#fef08a', core || '#ffffff');
  ctx.restore();
}

function drawCompactNeedleProjectileFallback(ctx, px, py, vx, vy, primary, core) {
  if (typeof ctx.fillRect !== 'function') return;
  const speed = Math.hypot(vx, vy) || 1;
  const nx = vx / speed;
  const ny = vy / speed;
  const ix = Math.round(px);
  const iy = Math.round(py);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.96;

  // Sleek 3-step tapered pixel needle (dark selout -> colored dart -> bright tip)
  const offsets = [0, 7, 14];
  const sizes = [6, 4, 2];

  ctx.fillStyle = '#0d0f1c';
  for (let i = 0; i < offsets.length; i++) {
    const bx = Math.round(ix - nx * offsets[i]);
    const by = Math.round(iy - ny * offsets[i]);
    const sz = sizes[i] + 2;
    const half = Math.floor(sz * 0.5);
    ctx.fillRect(bx - half, by - half, sz, sz);
  }

  ctx.fillStyle = primary || '#38bdf8';
  for (let i = 0; i < offsets.length; i++) {
    const bx = Math.round(ix - nx * offsets[i]);
    const by = Math.round(iy - ny * offsets[i]);
    const sz = sizes[i];
    const half = Math.floor(sz * 0.5);
    ctx.fillRect(bx - half, by - half, sz, sz);
  }

  // Crisp 4-point tip glint
  ctx.fillStyle = core || '#ffffff';
  ctx.fillRect(ix - 4, iy - 1, 8, 2);
  ctx.fillRect(ix - 1, iy - 4, 2, 8);
  ctx.restore();
}

function getEntityCoords(entity) {
  const x = Number.isFinite(entity?.x) ? entity.x : 300;
  const groundY = Number.isFinite(entity?.groundY)
    ? entity.groundY
    : Number.isFinite(entity?.y)
      ? entity.y
      : 558;
  const y = Number.isFinite(entity?.y) ? entity.y : groundY;
  const facing = (Number(entity?.facing) || 1) < 0 ? -1 : 1;
  return { x, y, groundY, facing };
}

function getTargetCoords(target, fallbackX, fallbackGroundY) {
  const x = Number.isFinite(target?.x) ? target.x : fallbackX;
  const groundY = Number.isFinite(target?.groundY)
    ? target.groundY
    : Number.isFinite(target?.y)
      ? target.y
      : fallbackGroundY;
  return { x, groundY };
}

function extractLivingTargets(targets, primaryTarget, maxCount = 4) {
  const out = [];
  const seen = new Set();
  const pushValid = (t) => {
    if (!t || typeof t !== 'object') return;
    if (t.isDead || (Number.isFinite(t.hp) && t.hp <= 0)) return;
    if (seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  if (primaryTarget) pushValid(primaryTarget);
  if (Array.isArray(targets)) {
    for (let i = 0; i < targets.length && out.length < maxCount; i++) {
      pushValid(targets[i]);
    }
  }
  return out;
}

const COMPANION_VFX_BAKED_COLS = 15;

function collectProfileUsedRows(profile) {
  const rows = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    for (const key of Object.keys(node)) {
      const val = node[key];
      if ((key === 'row' || key.endsWith('Row')) && Number.isInteger(val) && val >= 0 && val < COMPANION_VFX_ROWS) {
        rows.add(val);
      } else if (val && typeof val === 'object') {
        walk(val);
      }
    }
  };
  walk(profile);
  if (rows.size === 0) {
    return [0, 1, 2, 3, 4, 5, 6, 7];
  }
  return Array.from(rows).sort((a, b) => a - b);
}

function disposeBakedCanvas(entry) {
  if (!entry || !entry.canvas) return;
  try {
    entry.canvas.width = 0;
    entry.canvas.height = 0;
  } catch {
    // ignore
  }
}

function detectMobileViewport() {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof document !== 'undefined' && document.documentElement?.classList?.contains('is-mobile-device')) {
      return true;
    }
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 800;
    return w < 768 || h < 540;
  } catch {
    return false;
  }
}

export class EndlessCompanionVfx {
  constructor({ maxInstances = DEFAULT_MAX_INSTANCES, isMobile = null } = {}) {
    this.maxInstances = clampInt(maxInstances, 8, 256, DEFAULT_MAX_INSTANCES);
    this.isMobile = typeof isMobile === 'boolean' ? isMobile : detectMobileViewport();
    this._pool = new Array(this.maxInstances);
    for (let i = 0; i < this.maxInstances; i++) {
      this._pool[i] = createEmptyPoolSlot();
    }
    this._activeCount = 0;
    this._seqCounter = 0;
    this._sheetCache = Object.create(null);
    this._readySheetCache = Object.create(null);
    this._bakedAtlasCache = Object.create(null);
    this._mainHeroKey = null;
  }

  setMobileMode(isMobile) {
    this.isMobile = Boolean(isMobile);
  }

  setMainHeroKey(heroKey) {
    this._mainHeroKey = resolveHeroKey(heroKey) || null;
  }

  getEffectiveMaxInstances() {
    return this.isMobile ? Math.min(this.maxInstances, 30) : this.maxInstances;
  }

  _tryBakeCompactAtlas(heroKey, rawImg) {
    if (!heroKey || !rawImg) return null;
    const existing = this._bakedAtlasCache[heroKey];
    if (existing && existing.canvas && existing.canvas.width > 0) {
      return existing;
    }
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return null;
    }
    if (!isValidVfxImage(rawImg)) return null;
    const natW = Number(rawImg.naturalWidth) || 0;
    const natH = Number(rawImg.naturalHeight) || 0;
    if (natW < 4000 || natH < COMPANION_VFX_CELL_SIZE * 2) {
      return null;
    }

    const srcCell = COMPANION_VFX_CELL_SIZE;
    const srcCols = Math.max(1, Math.floor(natW / srcCell));
    const srcRows = Math.max(1, Math.floor(natH / srcCell));
    const profile = COMPANION_EX_VFX_MANIFEST[heroKey] || null;
    const usedRows = collectProfileUsedRows(profile).filter((r) => r >= 0 && r < srcRows);
    if (usedRows.length === 0) return null;

    const dstCols = Math.min(srcCols, COMPANION_VFX_BAKED_COLS);
    const dstCell = this.isMobile ? 104 : 156;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = dstCols * dstCell;
      canvas.height = usedRows.length * dstCell;
      const bctx = canvas.getContext('2d');
      if (!bctx) return null;
      bctx.imageSmoothingEnabled = false;

      const rowMap = Object.create(null);
      for (let rIdx = 0; rIdx < usedRows.length; rIdx++) {
        const srcRow = usedRows[rIdx];
        rowMap[srcRow] = rIdx;
        const sy = srcRow * srcCell;
        const dy = rIdx * dstCell;
        for (let c = 0; c < dstCols; c++) {
          const srcCol = Math.min(srcCols - 1, Math.floor((c * srcCols) / dstCols));
          bctx.drawImage(
            rawImg,
            srcCol * srcCell,
            sy,
            srcCell,
            srcCell,
            c * dstCell,
            dy,
            dstCell,
            dstCell
          );
        }
      }

      const baked = {
        canvas,
        cellW: dstCell,
        cellH: dstCell,
        cols: dstCols,
        rows: usedRows.length,
        rowMap,
        isBaked: true
      };
      this._bakedAtlasCache[heroKey] = baked;

      // Immediately release the raw 39.6 MB PNG now that the compact GPU-resident atlas is baked
      const owned = this._sheetCache[heroKey];
      if (owned) {
        try {
          owned.onload = null;
          owned.onerror = null;
          if (typeof owned.removeAttribute === 'function') {
            owned.removeAttribute('src');
          } else {
            owned.src = '';
          }
        } catch {
          // ignore
        }
        delete this._sheetCache[heroKey];
      }
      delete this._readySheetCache[heroKey];

      if (heroKey !== this._mainHeroKey) {
        try {
          const pfImg = PixelForge?.assets?.[heroKey]?.vfx || null;
          if (pfImg) {
            if (!pfImg._origSrc && pfImg.src) pfImg._origSrc = pfImg.src;
            PixelForge?.releaseImage?.(pfImg);
          }
        } catch {
          // ignore
        }
      }
      return baked;
    } catch {
      return null;
    }
  }

  _resolveDrawableSource(heroKeyOrId) {
    const profile = getCompanionVfxProfile(heroKeyOrId);
    if (!profile) return null;
    const key = profile.heroKey;

    const cachedBaked = this._bakedAtlasCache[key];
    if (cachedBaked && cachedBaked.canvas && cachedBaked.canvas.width > 0) {
      return {
        img: cachedBaked.canvas,
        cellW: cachedBaked.cellW,
        cellH: cachedBaked.cellH,
        cols: cachedBaked.cols,
        rows: cachedBaked.rows,
        rowMap: cachedBaked.rowMap,
        isBaked: true
      };
    }

    const sheet = this.getVfxSheet(key);
    const afterBaked = this._bakedAtlasCache[key];
    if (afterBaked && afterBaked.canvas && afterBaked.canvas.width > 0) {
      return {
        img: afterBaked.canvas,
        cellW: afterBaked.cellW,
        cellH: afterBaked.cellH,
        cols: afterBaked.cols,
        rows: afterBaked.rows,
        rowMap: afterBaked.rowMap,
        isBaked: true
      };
    }

    if (isValidVfxImage(sheet)) {
      const newlyBaked = this._tryBakeCompactAtlas(key, sheet);
      if (newlyBaked && newlyBaked.canvas && newlyBaked.canvas.width > 0) {
        return {
          img: newlyBaked.canvas,
          cellW: newlyBaked.cellW,
          cellH: newlyBaked.cellH,
          cols: newlyBaked.cols,
          rows: newlyBaked.rows,
          rowMap: newlyBaked.rowMap,
          isBaked: true
        };
      }
      return {
        img: sheet,
        cellW: COMPANION_VFX_CELL_SIZE,
        cellH: COMPANION_VFX_CELL_SIZE,
        cols: Math.max(1, Math.floor(sheet.naturalWidth / COMPANION_VFX_CELL_SIZE)),
        rows: Math.max(1, Math.floor(sheet.naturalHeight / COMPANION_VFX_CELL_SIZE)),
        rowMap: null,
        isBaked: false
      };
    }

    return null;
  }

  pruneInactiveSheets(keepHeroKeys = []) {
    const keep = new Set();
    if (Array.isArray(keepHeroKeys)) {
      for (let i = 0; i < keepHeroKeys.length; i++) {
        const prof = getCompanionVfxProfile(keepHeroKeys[i]);
        if (prof) keep.add(prof.heroKey);
      }
    }
    const releasedKeys = new Set();
    for (const key of Object.keys(this._sheetCache)) {
      if (keep.has(key)) continue;
      const img = this._sheetCache[key];
      if (img) {
        try {
          img.onload = null;
          img.onerror = null;
          if (typeof img.removeAttribute === 'function') {
            img.removeAttribute('src');
          } else {
            img.src = '';
          }
        } catch {
          // ignore
        }
      }
      delete this._sheetCache[key];
      delete this._readySheetCache[key];
      releasedKeys.add(key);
    }
    for (const key of Object.keys(this._bakedAtlasCache)) {
      if (keep.has(key)) continue;
      disposeBakedCanvas(this._bakedAtlasCache[key]);
      delete this._bakedAtlasCache[key];
      releasedKeys.add(key);
    }
    for (const key of Object.keys(this._readySheetCache)) {
      if (!keep.has(key)) {
        delete this._readySheetCache[key];
      }
    }
    return releasedKeys.size;
  }

  releaseAllSheets() {
    return this.pruneInactiveSheets([]);
  }

  preload(heroKeyOrId) {
    const profile = getCompanionVfxProfile(heroKeyOrId);
    if (!profile) return false;
    const baked = this._bakedAtlasCache[profile.heroKey];
    if (baked && baked.canvas && baked.canvas.width > 0) return true;
    const sheet = this.getVfxSheet(profile.heroKey);
    const bakedAfter = this._bakedAtlasCache[profile.heroKey];
    if (bakedAfter && bakedAfter.canvas && bakedAfter.canvas.width > 0) return true;
    return isValidVfxImage(sheet);
  }

  preloadAll(heroKeys = null) {
    const list = Array.isArray(heroKeys) && heroKeys.length > 0 ? heroKeys : ALL_HERO_KEYS;
    let readyCount = 0;
    for (let i = 0; i < list.length; i++) {
      if (this.preload(list[i])) {
        readyCount++;
      }
    }
    return readyCount;
  }

  getVfxSheet(heroKeyOrId) {
    const profile = getCompanionVfxProfile(heroKeyOrId);
    if (!profile) return null;
    const key = profile.heroKey;

    // 0a. Compact GPU-resident baked atlas takes absolute priority (never re-loads released 39.6 MB raw PNG!)
    const baked = this._bakedAtlasCache[key];
    if (baked && baked.canvas && baked.canvas.width > 0) {
      return baked.canvas;
    }

    // 0b. Fast O(1) path once verified ready (avoids PixelForge/ensureImage lookup overhead every slot/frame)
    const fastReady = this._readySheetCache[key];
    if (fastReady) {
      if (isValidVfxImage(fastReady)) {
        const bakedNow = this._tryBakeCompactAtlas(key, fastReady);
        return bakedNow ? bakedNow.canvas : fastReady;
      }
      delete this._readySheetCache[key];
    }

    // 1. Prefer already-loaded PixelForge VFX sheet (avoids duplicate GPU textures)
    let pfImg = null;
    try {
      pfImg = PixelForge?.assets?.[key]?.vfx || null;
      if (pfImg && !pfImg._loadFailed && !pfImg.__avsFailed) {
        PixelForge?.ensureImage?.(pfImg);
        if (isValidVfxImage(pfImg)) {
          const bakedNow = this._tryBakeCompactAtlas(key, pfImg);
          if (bakedNow) return bakedNow.canvas;
          this._readySheetCache[key] = pfImg;
          return pfImg;
        }
      }
    } catch {
      pfImg = null;
    }

    // 2. Check our dedicated lazy cache
    const cached = this._sheetCache[key] || null;
    if (cached) {
      if (isValidVfxImage(cached)) {
        const bakedNow = this._tryBakeCompactAtlas(key, cached);
        if (bakedNow) return bakedNow.canvas;
        this._readySheetCache[key] = cached;
        return cached;
      }
      if (cached._loadFailed && typeof Image !== 'undefined' && (cached._retries || 0) < 2) {
        const now = Date.now();
        if (now >= (cached._nextRetryAt || 0)) {
          cached._retries = (cached._retries || 0) + 1;
          cached._nextRetryAt = now + 800 * cached._retries;
          cached._loadFailed = false;
          cached.src = `${profile.sheetPath}${VFX_ASSET_QUERY}&retry=${cached._retries}`;
        }
      }
      return cached;
    }

    // 3. If PixelForge already initiated an in-flight load for this exact sheet, reuse it
    if (pfImg && !pfImg._loadFailed && !pfImg.__avsFailed && (pfImg._loadingInFlight || pfImg.src || pfImg._origSrc)) {
      return pfImg;
    }

    // 4. Node-safe guard: lazily allocate and cache an Image directly when in browser
    if (typeof Image === 'undefined') {
      return pfImg || null;
    }

    const img = new Image();
    img.decoding = 'async';
    img._loadFailed = false;
    img._retries = 0;
    img._nextRetryAt = 0;
    img.onload = () => {
      img._loadFailed = false;
      if (isValidVfxImage(img)) {
        const bakedNow = this._tryBakeCompactAtlas(key, img);
        if (!bakedNow) {
          this._readySheetCache[key] = img;
        }
      }
    };
    img.onerror = () => {
      img._loadFailed = true;
    };
    img.src = `${profile.sheetPath}${VFX_ASSET_QUERY}`;
    this._sheetCache[key] = img;
    return img;
  }

  isSheetReady(heroKeyOrId) {
    const profile = getCompanionVfxProfile(heroKeyOrId);
    if (!profile) return false;
    const baked = this._bakedAtlasCache[profile.heroKey];
    if (baked && baked.canvas && baked.canvas.width > 0) return true;
    const sheet = this.getVfxSheet(profile.heroKey);
    const bakedAfter = this._bakedAtlasCache[profile.heroKey];
    if (bakedAfter && bakedAfter.canvas && bakedAfter.canvas.width > 0) return true;
    return isValidVfxImage(sheet);
  }

  clear() {
    for (let i = 0; i < this._pool.length; i++) {
      const slot = this._pool[i];
      slot.active = false;
      slot.followEntity = null;
    }
    this._activeCount = 0;
  }

  getActiveCount() {
    return this._activeCount;
  }

  update(dt) {
    const safeDt = clampNum(Number(dt), 0, MAX_DT_STEP);
    if (safeDt <= 0) return;

    let active = 0;
    for (let i = 0; i < this._pool.length; i++) {
      const slot = this._pool[i];
      if (!slot.active) continue;

      if (slot.delay > 0) {
        slot.delay -= safeDt;
        if (slot.delay < 0) {
          slot.age = -slot.delay;
          slot.delay = 0;
        }
      } else {
        slot.age += safeDt;
        if (slot.vx !== 0) slot.x += slot.vx * safeDt;
        if (slot.vy !== 0) slot.y += slot.vy * safeDt;
      }

      if (slot.followEntity && Number.isFinite(slot.followEntity.x)) {
        const entY = Number.isFinite(slot.followEntity.groundY)
          ? slot.followEntity.groundY
          : Number.isFinite(slot.followEntity.y)
            ? slot.followEntity.y
            : slot.y;
        const dir = (Number(slot.followEntity.facing) || slot.facing || 1) < 0 ? -1 : 1;
        slot.x = slot.followEntity.x + slot.followOffsetX * dir;
        slot.y = entY + slot.followOffsetY;
      }

      if (slot.age >= slot.duration) {
        slot.active = false;
        slot.followEntity = null;
        continue;
      }

      active++;
    }

    this._activeCount = active;
  }

  _allocSlot() {
    const cap = this.getEffectiveMaxInstances();
    // 1. Grab any inactive slot within active mobile/desktop cap first
    for (let i = 0; i < cap; i++) {
      if (!this._pool[i].active) {
        return this._pool[i];
      }
    }

    // 2. Pool saturated: evict oldest lowest-priority active slot so GPU draw count stays strictly bounded
    let victim = this._pool[0];
    for (let i = 1; i < cap; i++) {
      const cand = this._pool[i];
      if (
        cand.priority < victim.priority ||
        (cand.priority === victim.priority && cand.seq < victim.seq)
      ) {
        victim = cand;
      }
    }
    if (victim.active) {
      this._activeCount = Math.max(0, this._activeCount - 1);
    }
    victim.active = false;
    victim.followEntity = null;
    return victim;
  }

  _spawnInstance(profile, cfg = {}) {
    if (!profile) return false;
    const slot = this._allocSlot();
    this._seqCounter++;

    slot.active = true;
    slot.seq = this._seqCounter;
    slot.heroKey = profile.heroKey;
    slot.row = clampInt(cfg.row ?? 0, 0, COMPANION_VFX_ROWS - 1, 0);
    slot.startCol = clampInt(cfg.startCol ?? 0, 0, COMPANION_VFX_COLS - 1, 0);
    slot.endCol = clampInt(cfg.endCol ?? COMPANION_VFX_COLS - 1, slot.startCol, COMPANION_VFX_COLS - 1, COMPANION_VFX_COLS - 1);
    slot.x = Number.isFinite(cfg.x) ? cfg.x : 0;
    slot.y = Number.isFinite(cfg.y) ? cfg.y : 0;
    slot.vx = Number.isFinite(cfg.vx) ? cfg.vx : 0;
    slot.vy = Number.isFinite(cfg.vy) ? cfg.vy : 0;
    slot.facing = (Number(cfg.facing) || 1) < 0 ? -1 : 1;
    slot.scale = clampNum(Number(cfg.scale) || 1, 0.25, 3.2);
    slot.aspectY = clampNum(Number(cfg.aspectY) || 1, 0.25, 2.2);
    slot.layer = cfg.layer === 'ground' ? 'ground' : 'foreground';
    slot.anchorBottom = Boolean(cfg.anchorBottom);
    slot.age = 0;
    slot.duration = clampNum(Number(cfg.duration) || 0.35, 0.08, 3.5);
    slot.delay = clampNum(Number(cfg.delay) || 0, 0, 1.5);
    slot.alpha = clampNum(Number(cfg.alpha) || 0.96, 0.05, 1.0);
    slot.bloom = clampNum(Number(cfg.bloom ?? 0.13), 0, MAX_BLOOM_ALPHA);
    slot.color = cfg.color || profile.palette.primary;
    slot.secondaryColor = cfg.secondaryColor || profile.palette.secondary;
    slot.coreColor = cfg.coreColor || profile.palette.core;
    slot.fadeInFrac = clampNum(Number(cfg.fadeInFrac ?? 0.12), 0.02, 0.4);
    slot.fadeOutFrac = clampNum(Number(cfg.fadeOutFrac ?? 0.72), 0.4, 0.95);
    slot.followEntity = cfg.followEntity || null;
    slot.followOffsetX = Number.isFinite(cfg.followOffsetX) ? cfg.followOffsetX : 0;
    slot.followOffsetY = Number.isFinite(cfg.followOffsetY) ? cfg.followOffsetY : 0;
    slot.priority = clampInt(cfg.priority ?? 1, 0, 4, 1);

    this._activeCount++;
    // Trigger lazy browser sheet loading when first effect spawns
    this.getVfxSheet(profile.heroKey);
    return true;
  }

  spawnAutoAttack(entity, target, opts = {}) {
    const profile = getCompanionVfxProfile(entity);
    if (!profile) return false;

    const ent = getEntityCoords(entity);
    const autoCfg = profile.auto;
    const facing = Number.isFinite(opts.facing) ? (opts.facing < 0 ? -1 : 1) : ent.facing;
    const scaleMult = clampNum(Number(opts.scaleMult) || 1, 0.4, 2.5);
    const isCrit = Boolean(opts.isCrit);
    const isMelee = MELEE_ROLES.has(profile.role);

    let spawnX = Number.isFinite(opts.x) ? opts.x : NaN;
    let spawnY = Number.isFinite(opts.y) ? opts.y : NaN;

    if (!Number.isFinite(spawnX)) {
      if (isMelee && Number.isFinite(target?.x)) {
        spawnX = target.x;
      } else {
        spawnX = ent.x + facing * (autoCfg.offsetX || 32);
      }
    }
    if (!Number.isFinite(spawnY)) {
      if (isMelee && Number.isFinite(target?.groundY)) {
        spawnY = target.groundY + (autoCfg.offsetY ?? -80);
      } else {
        spawnY = ent.y + (autoCfg.offsetY ?? -80);
      }
    }

    const baseScale = autoCfg.scale * scaleMult * (isCrit ? 1.18 : 1.0);
    this._spawnInstance(profile, {
      row: autoCfg.row,
      startCol: autoCfg.startCol ?? 0,
      endCol: autoCfg.endCol ?? COMPANION_VFX_COLS - 1,
      x: spawnX,
      y: spawnY,
      facing,
      scale: baseScale,
      layer: autoCfg.layer || 'foreground',
      anchorBottom: Boolean(autoCfg.anchorBottom),
      duration: autoCfg.duration,
      bloom: isCrit ? 0.16 : 0.12,
      priority: 1
    });

    if (
      isCrit &&
      !this.isMobile &&
      profile.projectile?.impactRow !== undefined &&
      profile.projectile.impactRow !== autoCfg.row
    ) {
      this._spawnInstance(profile, {
        row: profile.projectile.impactRow,
        x: spawnX,
        y: spawnY,
        facing,
        scale: baseScale * 0.86,
        layer: 'foreground',
        duration: autoCfg.duration * 0.92,
        delay: 0.04,
        bloom: 0.16,
        priority: 1
      });
    }

    return true;
  }

  spawnProjectileImpact(entity, x, y, opts = {}) {
    const profile = getCompanionVfxProfile(entity);
    if (!profile) return false;

    const projCfg = profile.projectile;
    const facing = Number.isFinite(opts.facing)
      ? opts.facing < 0 ? -1 : 1
      : (Number(entity?.facing) || 1) < 0 ? -1 : 1;
    const scaleMult = clampNum(Number(opts.scaleMult) || 1, 0.4, 2.5);
    const isCrit = Boolean(opts.isCrit);

    return this._spawnInstance(profile, {
      row: projCfg.impactRow,
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      facing,
      scale: projCfg.impactScale * scaleMult * (isCrit ? 1.18 : 1.0),
      layer: 'foreground',
      anchorBottom: false,
      duration: projCfg.duration,
      bloom: isCrit ? 0.16 : 0.13,
      priority: 1
    });
  }

  drawProjectile(ctx, entity, projectile, time = 0) {
    if (!ctx || !projectile) return false;

    const profile = getCompanionVfxProfile(entity);
    const px = Math.round(Number.isFinite(projectile.x) ? projectile.x : 0);
    const py = Math.round(Number.isFinite(projectile.y) ? projectile.y : 0);
    const vx = Number.isFinite(projectile.vx) ? projectile.vx : (Number(entity?.facing) || 1) * 760;
    const vy = Number.isFinite(projectile.vy) ? projectile.vy : 0;
    const dir = Math.abs(vx) > 1 ? (vx < 0 ? -1 : 1) : ((Number(entity?.facing) || 1) < 0 ? -1 : 1);

    const src = profile ? this._resolveDrawableSource(profile.heroKey) : null;
    if (profile && src && typeof ctx.drawImage === 'function') {
      const projCfg = profile.projectile;
      const animSec =
        Number.isFinite(projectile.life) && projectile.life >= 0
          ? projectile.life
          : Number.isFinite(time)
            ? time
            : 0;
      const rawCol = Math.abs(Math.floor(animSec * 30)) % COMPANION_VFX_COLS;
      const col = src.isBaked
        ? Math.min(src.cols - 1, Math.floor((rawCol / COMPANION_VFX_COLS) * src.cols))
        : rawCol % Math.max(1, src.cols);
      const rawRow = clampInt(projCfg.row, 0, COMPANION_VFX_ROWS - 1, 0);
      const row = src.rowMap
        ? (src.rowMap[rawRow] ?? clampInt(rawRow, 0, src.rows - 1, 0))
        : clampInt(rawRow, 0, src.rows - 1, 0);
      const sx = col * src.cellW;
      const sy = row * src.cellH;
      const scaleMult = projectile.fromUlt ? 1.24 : 1.0;
      const drawSize = Math.max(48, Math.round(COMPANION_VFX_CELL_SIZE * projCfg.scale * scaleMult));
      const half = Math.round(drawSize * 0.5);
      const flip = projCfg.flipWithVel !== false && dir < 0;

      const doBloom = !this.isMobile;
      if (flip) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 0.98;
        ctx.translate(px, py);
        ctx.scale(-1, 1);
        ctx.drawImage(src.img, sx, sy, src.cellW, src.cellH, -half, -half, drawSize, drawSize);
        if (doBloom) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.14;
          ctx.drawImage(src.img, sx, sy, src.cellW, src.cellH, -half, -half, drawSize, drawSize);
        }
        ctx.restore();
      } else if (doBloom) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 0.98;
        ctx.drawImage(
          src.img,
          sx,
          sy,
          src.cellW,
          src.cellH,
          px - half,
          py - half,
          drawSize,
          drawSize
        );
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.14;
        ctx.drawImage(
          src.img,
          sx,
          sy,
          src.cellW,
          src.cellH,
          px - half,
          py - half,
          drawSize,
          drawSize
        );
        ctx.restore();
      } else {
        ctx.globalAlpha = 0.98;
        ctx.drawImage(
          src.img,
          sx,
          sy,
          src.cellW,
          src.cellH,
          px - half,
          py - half,
          drawSize,
          drawSize
        );
      }
      return true;
    }

    drawCompactNeedleProjectileFallback(
      ctx,
      px,
      py,
      vx,
      vy,
      projectile.color || profile?.palette?.primary || '#38bdf8',
      projectile.coreColor || profile?.palette?.core || '#ffffff'
    );
    return false;
  }

  spawnRoleSkill(entity, { player = null, target = null, targets = null, tx, ty, scaleMult = 1 } = {}) {
    const profile = getCompanionVfxProfile(entity);
    if (!profile) return false;

    const ent = getEntityCoords(entity);
    const sk = profile.skill;
    const scMult = clampNum(Number(scaleMult) || 1, 0.45, 2.2);
    const tFallback = getTargetCoords(target, ent.x + ent.facing * 150, ent.groundY);
    const targetX = Number.isFinite(tx) ? tx : tFallback.x;
    const targetY = Number.isFinite(ty) ? ty : tFallback.groundY;
    const living = extractLivingTargets(targets, target, 4);

    // 1. Ground seal layer
    if (sk.groundRow !== undefined) {
      const groundAspect = sk.groundAspect || 0.48;
      const groundScale = (sk.groundScale || 1.15) * scMult;

      if (profile.role === 'TANK' || profile.role === 'HEALER' || profile.role === 'WEAVER') {
        if (player && Number.isFinite(player.x)) {
          this._spawnInstance(profile, {
            row: sk.groundRow,
            x: player.x,
            y: (Number.isFinite(player.groundY) ? player.groundY : ent.groundY) + 2,
            facing: ent.facing,
            scale: groundScale * 0.96,
            aspectY: groundAspect,
            layer: 'ground',
            duration: sk.duration * 1.15,
            bloom: 0.12,
            priority: 2
          });
        }
      }

      const sealX = profile.role === 'TANK' ? ent.x : targetX;
      const sealY = (profile.role === 'TANK' ? ent.groundY : targetY) + 2;
      this._spawnInstance(profile, {
        row: sk.groundRow,
        x: sealX,
        y: sealY,
        facing: ent.facing,
        scale: groundScale,
        aspectY: groundAspect,
        layer: 'ground',
        duration: sk.duration * 1.08,
        bloom: 0.13,
        priority: 2
      });
    }

    // 2. Caster crest / weapon invocation
    if (sk.casterRow !== undefined) {
      this._spawnInstance(profile, {
        row: sk.casterRow,
        startCol: sk.casterStartCol ?? 0,
        endCol: sk.casterEndCol ?? COMPANION_VFX_COLS - 1,
        x: ent.x + ent.facing * 16,
        y: ent.groundY - 84,
        facing: ent.facing,
        scale: 0.92 * scMult,
        layer: 'foreground',
        duration: sk.duration * 0.82,
        bloom: 0.14,
        priority: 2
      });
    }

    // 3. Primary target strike / pillar / volley / multi-slash
    const mainY = sk.anchorBottom ? targetY : targetY + (sk.targetOffsetY ?? -82);
    const rawMultiCount = clampInt(sk.multiCount ?? 1, 1, 3, 1);
    const multiCount = this.isMobile ? Math.min(2, rawMultiCount) : rawMultiCount;

    this._spawnInstance(profile, {
      row: sk.targetRow,
      x: targetX,
      y: mainY,
      facing: ent.facing,
      scale: sk.scale * scMult,
      aspectY: sk.anchorBottom ? 1.08 : 1.0,
      layer: 'foreground',
      anchorBottom: Boolean(sk.anchorBottom),
      duration: sk.duration,
      delay: 0.04,
      bloom: 0.15,
      priority: 2
    });

    if (multiCount > 1) {
      for (let i = 1; i < multiCount; i++) {
        const secTarget = living[i] || null;
        const spread = (i % 2 === 1 ? -1 : 1) * (42 + (i - 1) * 18);
        const sx = secTarget && Number.isFinite(secTarget.x) ? secTarget.x : targetX + spread;
        const sGroundY = secTarget && Number.isFinite(secTarget.groundY) ? secTarget.groundY : targetY;
        const sy = sk.anchorBottom ? sGroundY : sGroundY + (sk.targetOffsetY ?? -82) + (i % 2 === 1 ? -10 : 8);

        this._spawnInstance(profile, {
          row: sk.targetRow,
          x: sx,
          y: sy,
          facing: i % 2 === 1 ? -ent.facing : ent.facing,
          scale: sk.scale * scMult * 0.88,
          aspectY: sk.anchorBottom ? 1.04 : 1.0,
          layer: 'foreground',
          anchorBottom: Boolean(sk.anchorBottom),
          duration: sk.duration * 0.92,
          delay: 0.04 + i * 0.07,
          bloom: 0.14,
          priority: 2
        });
      }
    }

    // 4. Secondary accent detonation on target
    if (sk.secondaryRow !== undefined) {
      const secAnchorBottom =
        profile.heroKey === 'reaper_ex' && sk.secondaryRow === 2;
      this._spawnInstance(profile, {
        row: sk.secondaryRow,
        x: targetX,
        y: secAnchorBottom ? targetY : targetY - 82,
        facing: ent.facing,
        scale: sk.scale * scMult * 0.92,
        layer: 'foreground',
        anchorBottom: secAnchorBottom,
        duration: sk.duration * 0.85,
        delay: 0.10,
        bloom: 0.15,
        priority: 2
      });
    }

    return true;
  }

  spawnUltCastAura(entity, { ultVfxMult = 1.0 } = {}) {
    const profile = getCompanionVfxProfile(entity);
    if (!profile) return false;

    const ent = getEntityCoords(entity);
    const uCfg = profile.ult;
    const rawMult = Number.isFinite(Number(ultVfxMult)) && Number(ultVfxMult) > 0
      ? Number(ultVfxMult)
      : Number(entity?.auraTier?.ultVfxMult) || 1.0;
    const uMult = clampNum(rawMult, 1.0, 2.2);
    const sizeGrow = 1 + (uMult - 1) * 0.45;

    // Ground invocation seal following caster
    this._spawnInstance(profile, {
      row: uCfg.groundRow,
      x: ent.x,
      y: ent.groundY + 2,
      facing: ent.facing,
      scale: uCfg.groundScale * 0.82 * sizeGrow,
      aspectY: uCfg.groundAspect || 0.48,
      layer: 'ground',
      duration: uCfg.castDuration || 0.62,
      followEntity: entity,
      followOffsetX: 0,
      followOffsetY: 2,
      bloom: 0.14,
      priority: 3
    });

    // Caster crest / halo following caster during ULTIMATE windup
    this._spawnInstance(profile, {
      row: uCfg.castRow,
      startCol: uCfg.castStartCol ?? 0,
      endCol: uCfg.castEndCol ?? COMPANION_VFX_COLS - 1,
      x: ent.x,
      y: ent.groundY - 86,
      facing: ent.facing,
      scale: 0.96 * sizeGrow,
      layer: 'foreground',
      duration: uCfg.castDuration || 0.62,
      followEntity: entity,
      followOffsetX: 0,
      followOffsetY: -86,
      bloom: 0.16,
      priority: 3
    });

    return true;
  }

  spawnRoleUltimate(
    entity,
    { player = null, target = null, targets = null, tx, ty, ultVfxMult = 1.0, isSquadOverdrive = false } = {}
  ) {
    const profile = getCompanionVfxProfile(entity);
    if (!profile) return false;

    const ent = getEntityCoords(entity);
    const uCfg = profile.ult;
    const rawMult = Number.isFinite(Number(ultVfxMult)) && Number(ultVfxMult) > 0
      ? Number(ultVfxMult)
      : Number(entity?.auraTier?.ultVfxMult) || 1.0;
    const uMult = clampNum(rawMult, 1.0, 2.2);
    const overdriveScale = isSquadOverdrive ? 0.90 : 1.0;
    const sizeGrow = (1 + (uMult - 1) * 0.46) * overdriveScale;
    const durGrow = 1 + (uMult - 1) * 0.16;

    const tFallback = getTargetCoords(target, ent.x + ent.facing * 185, ent.groundY);
    const targetX = Number.isFinite(tx) ? tx : tFallback.x;
    const targetY = Number.isFinite(ty) ? ty : tFallback.groundY;
    const living = extractLivingTargets(targets, target, this.isMobile ? 2 : 4);
    const maxSec = this.isMobile ? (isSquadOverdrive ? 1 : 2) : (isSquadOverdrive ? 2 : 4);
    const dur = uCfg.duration * durGrow;

    // Universal Layer 1: Authentic Ground Mandala / Seal beneath impact
    this._spawnInstance(profile, {
      row: uCfg.groundRow,
      x: targetX,
      y: targetY + 2,
      facing: ent.facing,
      scale: uCfg.groundScale * sizeGrow,
      aspectY: uCfg.groundAspect || 0.48,
      layer: 'ground',
      duration: dur * 1.12,
      bloom: 0.15,
      priority: 4
    });

    // Pattern-specific multi-beat 30fps choreography
    switch (uCfg.pattern) {
      case 'cataclysm': {
        // Aethelgard EX: Monolith Greatsword Pillar (R6) + Flanking Dawn-Blade Spires (R2) + Player Sanctuary
        if (player && Number.isFinite(player.x)) {
          this._spawnInstance(profile, {
            row: uCfg.groundRow,
            x: player.x,
            y: (Number.isFinite(player.groundY) ? player.groundY : ent.groundY) + 2,
            facing: ent.facing,
            scale: uCfg.groundScale * 0.85 * sizeGrow,
            aspectY: uCfg.groundAspect,
            layer: 'ground',
            duration: dur * 1.15,
            bloom: 0.14,
            priority: 3
          });
        }
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: targetY,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          aspectY: uCfg.mainTall || 1.16,
          layer: 'foreground',
          anchorBottom: true,
          duration: dur,
          bloom: 0.16,
          priority: 4
        });
        const flanks = [-94, 94];
        for (let i = 0; i < flanks.length; i++) {
          this._spawnInstance(profile, {
            row: uCfg.accentRow,
            x: targetX + flanks[i],
            y: targetY,
            facing: ent.facing,
            scale: uCfg.accentScale * sizeGrow,
            aspectY: 1.08,
            layer: 'foreground',
            anchorBottom: true,
            duration: dur * 0.86,
            delay: 0.08 + i * 0.06,
            bloom: 0.15,
            priority: 3
          });
        }
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.burstRow ?? 4, uCfg.accentScale * 0.9 * sizeGrow, dur * 0.78, ent.facing, false);
        break;
      }

      case 'sanctuary': {
        // Seraphina EX: Sanctuary Rose Seal on Hero + Cathedral Organ-of-Light Columns (R2) + Rose Mandalas (R3)
        if (player && Number.isFinite(player.x)) {
          const py = Number.isFinite(player.groundY) ? player.groundY : ent.groundY;
          this._spawnInstance(profile, {
            row: uCfg.groundRow,
            x: player.x,
            y: py + 2,
            facing: ent.facing,
            scale: uCfg.groundScale * 0.92 * sizeGrow,
            aspectY: uCfg.groundAspect,
            layer: 'ground',
            duration: dur * 1.15,
            bloom: 0.15,
            priority: 3
          });
          this._spawnInstance(profile, {
            row: uCfg.accentRow,
            x: player.x,
            y: py - 92,
            facing: ent.facing,
            scale: 1.06 * sizeGrow,
            layer: 'foreground',
            duration: dur * 0.92,
            bloom: 0.14,
            priority: 3
          });
        }
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: targetY,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          aspectY: uCfg.mainTall || 1.18,
          layer: 'foreground',
          anchorBottom: true,
          duration: dur,
          bloom: 0.16,
          priority: 4
        });
        this._spawnInstance(profile, {
          row: uCfg.accentRow,
          x: targetX,
          y: targetY - 96,
          facing: ent.facing,
          scale: uCfg.accentScale * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.92,
          delay: 0.05,
          bloom: 0.15,
          priority: 3
        });
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.mainRow, uCfg.accentScale * sizeGrow, dur * 0.85, ent.facing, true);
        break;
      }

      case 'meteor_triple': {
        // Ignis Sol EX: Dreadnought Sun-Meteor (R6) + Comet Wake (R7) + Triple Heliacal Corona Pillars (R1)
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX - ent.facing * 24,
          y: targetY - 172,
          vx: ent.facing * 32,
          vy: 138,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.78,
          bloom: 0.16,
          priority: 4
        });
        this._spawnInstance(profile, {
          row: uCfg.wakeRow ?? 7,
          x: targetX - ent.facing * 42,
          y: targetY - 210,
          vx: ent.facing * 28,
          vy: 120,
          facing: ent.facing,
          scale: uCfg.scale * 0.9 * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.72,
          delay: 0.04,
          bloom: 0.15,
          priority: 3
        });
        const pillars = [-108, 0, 108];
        for (let i = 0; i < pillars.length; i++) {
          this._spawnInstance(profile, {
            row: uCfg.accentRow,
            x: targetX + pillars[i],
            y: targetY,
            facing: ent.facing,
            scale: (i === 1 ? uCfg.accentScale * 1.15 : uCfg.accentScale * 0.92) * sizeGrow,
            aspectY: 1.12,
            layer: 'foreground',
            anchorBottom: true,
            duration: dur * 0.88,
            delay: 0.10 + Math.abs(i - 1) * 0.06,
            bloom: 0.16,
            priority: 4
          });
        }
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.burstRow ?? 2, uCfg.accentScale * 0.88 * sizeGrow, dur * 0.76, ent.facing, false);
        break;
      }

      case 'starfall_volley': {
        // Sylvanis EX: Greatbow Muzzle (R6) + 3-Segment Supernova Dragon-Arrow Beam (R7) + Starfall Geysers (R1)
        this._spawnInstance(profile, {
          row: uCfg.castRow,
          x: ent.x + ent.facing * 36,
          y: ent.groundY - 84,
          facing: ent.facing,
          scale: 1.06 * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.72,
          bloom: 0.15,
          priority: 3
        });
        const beamSpan = clampNum(Math.abs(targetX - ent.x), 180, 520);
        const segs = 3;
        for (let s = 0; s < segs; s++) {
          const frac = (s + 0.5) / segs;
          this._spawnInstance(profile, {
            row: uCfg.mainRow,
            x: ent.x + ent.facing * (54 + beamSpan * frac),
            y: targetY - 82,
            facing: ent.facing,
            scale: uCfg.scale * 0.92 * sizeGrow,
            layer: 'foreground',
            duration: dur * 0.72,
            delay: s * 0.04,
            bloom: 0.16,
            priority: 4
          });
        }
        this._spawnInstance(profile, {
          row: uCfg.accentRow,
          x: targetX,
          y: targetY,
          facing: ent.facing,
          scale: uCfg.accentScale * 1.12 * sizeGrow,
          aspectY: 1.10,
          layer: 'foreground',
          anchorBottom: true,
          duration: dur * 0.90,
          delay: 0.08,
          bloom: 0.15,
          priority: 4
        });
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.burstRow ?? 4, uCfg.accentScale * 0.9 * sizeGrow, dur * 0.78, ent.facing, false);
        break;
      }

      case 'valhalla_spear': {
        // Freyja EX: Descending Einherjar Sky-Spear (R6) + Gungnir Ragnarok Dragon-Pillar (R7) + Flanking Obelisks (R2)
        this._spawnInstance(profile, {
          row: uCfg.accentRow,
          x: targetX - ent.facing * 18,
          y: targetY - 190,
          vx: ent.facing * 26,
          vy: 165,
          facing: ent.facing,
          scale: uCfg.accentScale * 1.08 * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.66,
          bloom: 0.16,
          priority: 4
        });
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: targetY,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          aspectY: uCfg.mainTall || 1.18,
          layer: 'foreground',
          anchorBottom: true,
          duration: dur,
          delay: 0.07,
          bloom: 0.16,
          priority: 4
        });
        const obelisks = [-88, 88];
        for (let i = 0; i < obelisks.length; i++) {
          this._spawnInstance(profile, {
            row: uCfg.flankRow ?? 2,
            x: targetX + obelisks[i],
            y: targetY,
            facing: ent.facing,
            scale: uCfg.accentScale * 0.92 * sizeGrow,
            aspectY: 1.10,
            layer: 'foreground',
            anchorBottom: true,
            duration: dur * 0.84,
            delay: 0.12 + i * 0.05,
            bloom: 0.15,
            priority: 3
          });
        }
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.burstRow ?? 4, uCfg.accentScale * 0.88 * sizeGrow, dur * 0.76, ent.facing, false);
        break;
      }

      case 'iaido_cross': {
        // Kaze-Maru EX: Sixfold Storm-Blade Slash Ring (R4) + Dimensional Rift Hairlines (R7) + Raijin Pillar (R2)
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: targetY - 84,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.88,
          bloom: 0.16,
          priority: 4
        });
        this._spawnInstance(profile, {
          row: uCfg.riftRow ?? 7,
          x: targetX,
          y: targetY - 88,
          facing: ent.facing,
          scale: uCfg.scale * 1.05 * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.82,
          delay: 0.05,
          bloom: 0.16,
          priority: 4
        });
        this._spawnInstance(profile, {
          row: uCfg.accentRow,
          x: targetX,
          y: targetY,
          facing: ent.facing,
          scale: uCfg.accentScale * sizeGrow,
          aspectY: 1.14,
          layer: 'foreground',
          anchorBottom: true,
          duration: dur * 0.88,
          delay: 0.13,
          bloom: 0.16,
          priority: 4
        });
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.burstRow ?? 1, uCfg.accentScale * 0.92 * sizeGrow, dur * 0.76, ent.facing, false);
        break;
      }

      case 'chrono_astrolabe': {
        // Chronos EX: Roman Clockface Floor + Paradox Hourglass Monolith (R2) + Eternal Zero Shatter Nova (R7) + Pincer X-Slices (R5)
        if (player && Number.isFinite(player.x)) {
          this._spawnInstance(profile, {
            row: uCfg.wheelRow ?? 1,
            x: player.x,
            y: (Number.isFinite(player.groundY) ? player.groundY : ent.groundY) + 2,
            facing: ent.facing,
            scale: 1.02 * sizeGrow,
            aspectY: uCfg.groundAspect,
            layer: 'ground',
            duration: dur * 1.10,
            bloom: 0.13,
            priority: 3
          });
        }
        this._spawnInstance(profile, {
          row: uCfg.accentRow,
          x: targetX,
          y: targetY,
          facing: ent.facing,
          scale: uCfg.accentScale * 1.08 * sizeGrow,
          aspectY: 1.12,
          layer: 'foreground',
          anchorBottom: true,
          duration: dur * 0.92,
          delay: 0.04,
          bloom: 0.15,
          priority: 4
        });
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: targetY - 90,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          layer: 'foreground',
          duration: dur,
          delay: 0.10,
          bloom: 0.16,
          priority: 4
        });
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.sliceRow ?? 5, uCfg.accentScale * 0.9 * sizeGrow, dur * 0.78, ent.facing, false);
        break;
      }

      case 'thunder_barrage': {
        // Raijin EX: Sculpted Giant Punch-Fists (R3) + Heaven-Splitting Sky-Bolt Pillar (R4) + Twin-Helix Vortex (R1)
        this._spawnInstance(profile, {
          row: uCfg.accentRow,
          x: targetX - ent.facing * 26,
          y: targetY - 86,
          facing: ent.facing,
          scale: uCfg.accentScale * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.62,
          delay: 0.02,
          bloom: 0.15,
          priority: 3
        });
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: targetY,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          aspectY: uCfg.mainTall || 1.20,
          layer: 'foreground',
          anchorBottom: true,
          duration: dur,
          delay: 0.09,
          bloom: 0.16,
          priority: 4
        });
        this._spawnInstance(profile, {
          row: uCfg.vortexRow ?? 1,
          x: targetX,
          y: targetY,
          facing: -ent.facing,
          scale: uCfg.accentScale * 1.04 * sizeGrow,
          aspectY: 1.10,
          layer: 'foreground',
          anchorBottom: true,
          duration: dur * 0.86,
          delay: 0.14,
          bloom: 0.15,
          priority: 4
        });
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.burstRow ?? 6, uCfg.accentScale * 0.88 * sizeGrow, dur * 0.74, ent.facing, false);
        break;
      }

      case 'void_phantom': {
        // Nyx EX: Grand "Cob" Genesis Solar-Astrolabe Core (R7) + Twin Orbital Terminal Drones (R5) + Supernova Vortices (R4)
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: targetY - 98,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          layer: 'foreground',
          duration: dur,
          bloom: 0.16,
          priority: 4
        });
        const droneOffsets = [-92, 92];
        for (let i = 0; i < droneOffsets.length; i++) {
          this._spawnInstance(profile, {
            row: uCfg.droneRow ?? 5,
            x: targetX + droneOffsets[i],
            y: targetY - 122,
            facing: i === 0 ? 1 : -1,
            scale: 0.86 * sizeGrow,
            layer: 'foreground',
            duration: dur * 0.90,
            delay: 0.04 + i * 0.04,
            bloom: 0.14,
            priority: 3
          });
        }
        this._spawnInstance(profile, {
          row: uCfg.accentRow,
          x: targetX,
          y: targetY - 84,
          facing: ent.facing,
          scale: uCfg.accentScale * 1.12 * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.88,
          delay: 0.10,
          bloom: 0.16,
          priority: 4
        });
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.popupRow ?? 1, uCfg.accentScale * 0.86 * sizeGrow, dur * 0.76, ent.facing, false);
        break;
      }

      case 'soul_harvest': {
        // Malakor EX: Twin Gothic Oblivion Gates (R5) + Colossal Memento Mori Guillotine Crescent (R7) + Necrotic Spires (R2)
        const gates = [-74, 74];
        for (let i = 0; i < gates.length; i++) {
          this._spawnInstance(profile, {
            row: uCfg.accentRow,
            x: targetX + gates[i],
            y: targetY,
            facing: i === 0 ? 1 : -1,
            scale: uCfg.accentScale * sizeGrow,
            aspectY: 1.12,
            layer: 'foreground',
            anchorBottom: true,
            duration: dur * 0.96,
            delay: 0.03,
            bloom: 0.14,
            priority: 3
          });
        }
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: targetY - 94,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          layer: 'foreground',
          duration: dur,
          delay: 0.09,
          bloom: 0.16,
          priority: 4
        });
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.spireRow ?? 2, uCfg.accentScale * 0.9 * sizeGrow, dur * 0.82, ent.facing, true);
        break;
      }

      case 'absolute_zero': {
        // Lyra EX: Zero-Kelvin Diamond-Coffin Monolith (R6) + Coronation Ice-Claymore (R4) + Flanking Glacier Monoliths (R2)
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: targetY,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          aspectY: uCfg.mainTall || 1.15,
          layer: 'foreground',
          anchorBottom: true,
          duration: dur,
          bloom: 0.16,
          priority: 4
        });
        this._spawnInstance(profile, {
          row: uCfg.bladeRow ?? 4,
          x: targetX,
          y: targetY - 178,
          vy: 140,
          facing: ent.facing,
          scale: uCfg.accentScale * 1.06 * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.68,
          delay: 0.04,
          bloom: 0.15,
          priority: 4
        });
        const glaciers = [-108, 108];
        for (let i = 0; i < glaciers.length; i++) {
          this._spawnInstance(profile, {
            row: uCfg.accentRow,
            x: targetX + glaciers[i],
            y: targetY,
            facing: ent.facing,
            scale: uCfg.accentScale * 0.94 * sizeGrow,
            aspectY: 1.10,
            layer: 'foreground',
            anchorBottom: true,
            duration: dur * 0.88,
            delay: 0.10 + i * 0.05,
            bloom: 0.15,
            priority: 3
          });
        }
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.burstRow ?? 7, uCfg.accentScale * 0.88 * sizeGrow, dur * 0.78, ent.facing, false);
        break;
      }

      case 'orbital_rail': {
        // Aegis-09 EX: Orbital Railgun Column (R7) + 3-Segment Fin-Funnel Laser (R6) + Funnel Pods (R1) + Cyber Starbursts (R4)
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: targetY,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          aspectY: uCfg.mainTall || 1.24,
          layer: 'foreground',
          anchorBottom: true,
          duration: dur,
          delay: 0.04,
          bloom: 0.16,
          priority: 4
        });
        const railSpan = clampNum(Math.abs(targetX - ent.x), 180, 520);
        for (let s = 0; s < 3; s++) {
          const frac = (s + 0.5) / 3;
          this._spawnInstance(profile, {
            row: uCfg.accentRow,
            x: ent.x + ent.facing * (48 + railSpan * frac),
            y: targetY - 82,
            facing: ent.facing,
            scale: uCfg.accentScale * 0.92 * sizeGrow,
            layer: 'foreground',
            duration: dur * 0.74,
            delay: s * 0.04,
            bloom: 0.16,
            priority: 4
          });
        }
        this._spawnInstance(profile, {
          row: uCfg.podRow ?? 1,
          x: ent.x - ent.facing * 42,
          y: ent.groundY - 128,
          facing: ent.facing,
          scale: 0.86 * sizeGrow,
          layer: 'foreground',
          duration: dur * 0.82,
          bloom: 0.14,
          priority: 3
        });
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.burstRow ?? 4, uCfg.accentScale * 0.9 * sizeGrow, dur * 0.76, ent.facing, false);
        break;
      }

      default: {
        this._spawnInstance(profile, {
          row: uCfg.mainRow,
          x: targetX,
          y: uCfg.anchorBottom ? targetY : targetY - 88,
          facing: ent.facing,
          scale: uCfg.scale * sizeGrow,
          layer: 'foreground',
          anchorBottom: Boolean(uCfg.anchorBottom),
          duration: dur,
          bloom: 0.16,
          priority: 4
        });
        this._spawnSecondaryTargetAccents(profile, living, maxSec, uCfg.accentRow, uCfg.accentScale * sizeGrow, dur * 0.80, ent.facing, false);
        break;
      }
    }

    return true;
  }

  _spawnSecondaryTargetAccents(profile, living, maxSec, row, scale, duration, facing, anchorBottom) {
    if (!Array.isArray(living) || living.length <= 1) return;
    const count = Math.min(maxSec, living.length);
    for (let i = 1; i < count; i++) {
      const m = living[i];
      if (!m || !Number.isFinite(m.x)) continue;
      const my = Number.isFinite(m.groundY) ? m.groundY : (Number.isFinite(m.y) ? m.y : 558);
      this._spawnInstance(profile, {
        row,
        x: m.x,
        y: anchorBottom ? my : my - 80,
        facing,
        scale,
        aspectY: anchorBottom ? 1.08 : 1.0,
        layer: 'foreground',
        anchorBottom,
        duration,
        delay: 0.06 * i,
        bloom: 0.15,
        priority: 3
      });
    }
  }

  spawnSquadOverdriveBurst(entities, { leadTarget = null, targets = null } = {}) {
    if (!Array.isArray(entities) || entities.length === 0) return 0;
    const living = extractLivingTargets(targets, leadTarget, 6);
    let spawned = 0;

    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      const profile = getCompanionVfxProfile(ent);
      if (!profile) continue;

      const uMult = clampNum(Number(ent?.auraTier?.ultVfxMult) || 1.0, 1.0, 2.2);
      const assignedTarget = living.length > 0 ? living[i % living.length] : leadTarget;
      const entPos = getEntityCoords(ent);
      const tPos = getTargetCoords(assignedTarget, entPos.x + entPos.facing * 200, entPos.groundY);

      this.spawnUltCastAura(ent, { ultVfxMult: uMult });
      this.spawnRoleUltimate(ent, {
        target: assignedTarget,
        targets: living,
        tx: tPos.x,
        ty: tPos.groundY,
        ultVfxMult: uMult,
        isSquadOverdrive: true
      });
      spawned++;
    }

    return spawned;
  }

  drawCasterUltOverlay(ctx, entity, time = 0) {
    if (!ctx || !entity) return false;
    const flashTimer = Number(entity.ultFlashTimer) || 0;
    const casting = Boolean(entity.isCastingUlt || flashTimer > 0);
    if (!casting) return false;

    const profile = getCompanionVfxProfile(entity);
    const ent = getEntityCoords(entity);
    const uMult = clampNum(Number(entity?.auraTier?.ultVfxMult) || 1.0, 1.0, 2.2);
    const flashFrac = flashTimer > 0 ? clampNum(flashTimer / 0.95, 0.28, 1.0) : 0.85;
    const cx = Math.round(ent.x);
    const cy = Math.round(ent.y - 82);

    const src = profile ? this._resolveDrawableSource(profile.heroKey) : null;
    if (profile && src && typeof ctx.drawImage === 'function') {
      const uCfg = profile.ult;
      const logicalCols = src.isBaked ? COMPANION_VFX_COLS : Math.max(1, src.cols);
      const cStart = clampInt(uCfg.castStartCol ?? 0, 0, logicalCols - 1, 0);
      const cEnd = clampInt(uCfg.castEndCol ?? logicalCols - 1, cStart, logicalCols - 1, logicalCols - 1);
      const span = Math.max(1, cEnd - cStart + 1);
      const animSec = Number.isFinite(time) ? time : 0;
      const rawCol = cStart + (Math.abs(Math.floor(animSec * 30)) % span);
      const col = src.isBaked
        ? Math.min(src.cols - 1, Math.floor((rawCol / COMPANION_VFX_COLS) * src.cols))
        : Math.min(src.cols - 1, rawCol);
      const rawRow = clampInt(uCfg.castRow, 0, COMPANION_VFX_ROWS - 1, 0);
      const row = src.rowMap
        ? (src.rowMap[rawRow] ?? clampInt(rawRow, 0, src.rows - 1, 0))
        : clampInt(rawRow, 0, src.rows - 1, 0);
      const sx = col * src.cellW;
      const sy = row * src.cellH;

      const sizeGrow = 1 + (uMult - 1) * 0.40;
      const drawSize = Math.round(COMPANION_VFX_CELL_SIZE * 0.92 * sizeGrow);
      const half = Math.round(drawSize * 0.5);
      const baseAlpha = clampNum(0.42 + flashFrac * 0.48, 0.25, 0.92);
      const bloomAlpha = this.isMobile ? 0 : clampNum(0.14 * flashFrac, 0, MAX_BLOOM_ALPHA);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = baseAlpha;
      if (ent.facing < 0) {
        ctx.translate(cx, cy);
        ctx.scale(-1, 1);
        ctx.drawImage(src.img, sx, sy, src.cellW, src.cellH, -half, -half, drawSize, drawSize);
        if (bloomAlpha > 0.01) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = bloomAlpha;
          ctx.drawImage(src.img, sx, sy, src.cellW, src.cellH, -half, -half, drawSize, drawSize);
        }
      } else {
        ctx.drawImage(
          src.img,
          sx,
          sy,
          src.cellW,
          src.cellH,
          cx - half,
          cy - half,
          drawSize,
          drawSize
        );
        if (bloomAlpha > 0.01) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = bloomAlpha;
          ctx.drawImage(
            src.img,
            sx,
            sy,
            src.cellW,
            src.cellH,
            cx - half,
            cy - half,
            drawSize,
            drawSize
          );
        }
      }
      ctx.restore();
      return true;
    }

    // Minimal compact 4-point pixel glints ONLY when sheet is not loaded yet (zero flat rectangle slabs)
    if (typeof ctx.fillRect === 'function') {
      const accent = profile?.palette?.primary || entity.primaryColor || '#facc15';
      const core = profile?.palette?.core || '#ffffff';
      const flareScale = 1 + (uMult - 1) * 0.35;
      const arm = Math.max(4, Math.round(5 * flareScale));
      const phase = Number.isFinite(time) ? time : 0;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = clampNum(0.45 + flashFrac * 0.45, 0.25, 0.9);
      for (let side = -1; side <= 1; side += 2) {
        const gx = cx + side * Math.round(32 * flareScale);
        const gy = cy + Math.round(Math.sin(phase * 8 + side) * 16);
        drawFourPointPixelGlint(ctx, gx, gy, arm, accent, core);
      }
      ctx.restore();
    }
    return false;
  }

  _renderSlot(ctx, slot) {
    const u = clampNum(slot.age / Math.max(0.01, slot.duration), 0, 0.9999);
    let env = 1;
    if (u < slot.fadeInFrac) {
      env = clampNum(u / Math.max(0.01, slot.fadeInFrac), 0.15, 1);
    } else if (u > slot.fadeOutFrac) {
      env = clampNum(1 - (u - slot.fadeOutFrac) / Math.max(0.01, 1 - slot.fadeOutFrac), 0, 1);
    }
    const finalAlpha = clampNum(slot.alpha * env, 0, 1);
    if (finalAlpha <= 0.02) return false;

    const src = this._resolveDrawableSource(slot.heroKey);
    const cx = Math.round(slot.x);
    const drawW = Math.max(24, Math.round(COMPANION_VFX_CELL_SIZE * slot.scale));
    const drawH = Math.max(16, Math.round(COMPANION_VFX_CELL_SIZE * slot.scale * slot.aspectY));

    if (src && typeof ctx.drawImage === 'function') {
      const logicalCols = src.isBaked ? COMPANION_VFX_COLS : Math.max(1, src.cols);
      const cStart = clampInt(slot.startCol, 0, logicalCols - 1, 0);
      const cEnd = clampInt(slot.endCol, cStart, logicalCols - 1, logicalCols - 1);
      const span = Math.max(1, cEnd - cStart + 1);
      const rawCol = cStart + Math.min(span - 1, Math.floor(u * span));
      const col = src.isBaked
        ? Math.min(src.cols - 1, Math.floor((rawCol / COMPANION_VFX_COLS) * src.cols))
        : Math.min(src.cols - 1, rawCol);
      const rawRow = clampInt(slot.row, 0, COMPANION_VFX_ROWS - 1, 0);
      const row = src.rowMap
        ? (src.rowMap[rawRow] ?? clampInt(rawRow, 0, src.rows - 1, 0))
        : clampInt(rawRow, 0, src.rows - 1, 0);
      const sx = col * src.cellW;
      const sy = row * src.cellH;

      const destY = slot.anchorBottom
        ? Math.round(slot.y - drawH * 0.90)
        : Math.round(slot.y - drawH * 0.5);
      const halfW = Math.round(drawW * 0.5);
      const bloomCap = slot.layer === 'ground' ? 0.16 : MAX_BLOOM_ALPHA;
      const bloomAlpha = this.isMobile ? 0 : clampNum(slot.bloom * finalAlpha, 0, bloomCap);

      if (slot.facing < 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = finalAlpha;
        ctx.translate(cx, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(src.img, sx, sy, src.cellW, src.cellH, -halfW, destY, drawW, drawH);
        if (bloomAlpha > 0.01) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = bloomAlpha;
          ctx.drawImage(src.img, sx, sy, src.cellW, src.cellH, -halfW, destY, drawW, drawH);
        }
        ctx.restore();
      } else if (bloomAlpha > 0.01) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = finalAlpha;
        ctx.drawImage(
          src.img,
          sx,
          sy,
          src.cellW,
          src.cellH,
          cx - halfW,
          destY,
          drawW,
          drawH
        );
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = bloomAlpha;
        ctx.drawImage(
          src.img,
          sx,
          sy,
          src.cellW,
          src.cellH,
          cx - halfW,
          destY,
          drawW,
          drawH
        );
        ctx.restore();
      } else {
        // Zero-save single-pass blit (used for all non-flipped mobile slots & non-bloom slots)
        ctx.globalAlpha = finalAlpha;
        ctx.drawImage(
          src.img,
          sx,
          sy,
          src.cellW,
          src.cellH,
          cx - halfW,
          destY,
          drawW,
          drawH
        );
      }
      return true;
    }

    // Minimal sprite-aligned fallback ONLY while sheet is still loading
    if (slot.layer === 'ground') {
      drawCompactFloorSealFallback(
        ctx,
        cx,
        Math.round(slot.y),
        Math.round(drawW * 0.34),
        Math.round(drawH * 0.24),
        slot.color,
        slot.secondaryColor,
        finalAlpha * 0.72
      );
    } else {
      const cy = slot.anchorBottom ? Math.round(slot.y - 68) : Math.round(slot.y);
      drawCompactBurstFallback(
        ctx,
        cx,
        cy,
        Math.round(10 * slot.scale),
        slot.color,
        slot.secondaryColor,
        slot.coreColor,
        finalAlpha * 0.84
      );
    }
    return false;
  }

  renderGroundLayer(ctx) {
    if (!ctx || this._activeCount <= 0) return 0;
    let drawn = 0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this._pool.length; i++) {
      const slot = this._pool[i];
      if (!slot.active || slot.delay > 0 || slot.layer !== 'ground') continue;
      this._renderSlot(ctx, slot);
      drawn++;
    }
    ctx.restore();
    return drawn;
  }

  renderForegroundLayer(ctx) {
    if (!ctx || this._activeCount <= 0) return 0;
    let drawn = 0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this._pool.length; i++) {
      const slot = this._pool[i];
      if (!slot.active || slot.delay > 0 || slot.layer === 'ground') continue;
      this._renderSlot(ctx, slot);
      drawn++;
    }
    ctx.restore();
    return drawn;
  }
}
