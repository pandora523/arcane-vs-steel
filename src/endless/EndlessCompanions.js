import { PixelForge } from '../engine/PixelForge.js?v=30fps205';
import { PixelFont } from '../engine/PixelFont.js?v=30fps205';
import {
  COMPANION_BASE_TO_EX_KEY,
  COMPANION_AURA_TIERS,
  ELITE_EX_COMPANION_DEFS,
  COMPANION_MAX_STARS,
  getAuraTier
} from './EndlessCompanionEvo.js?v=30fps205';
import { EndlessCompanionVfx } from './EndlessCompanionVfx.js?v=30fps205';
import {
  EndlessCompanionAI,
  COMPANION_ENGAGE_SIGHTLINE,
  isTargetAlive
} from './EndlessCompanionAI.js?v=30fps205';

export const ENDLESS_MAX_ACTIVE_SLOTS = 3;

export const ENDLESS_COMPANION_ROSTER = [
  {
    id: 'aethelgard',
    heroKey: 'warrior_ex',
    name: 'AETHELGARD',
    shortName: 'AETHEL',
    role: 'TANK',
    accentHex: '#38bdf8',
    recruitCost: 60,
    upgradeBaseCost: 45,
    costGrowth: 1.24,
    baseDps: 24,
    attackRange: 138,
    attackInterval: 0.95,
    skillCooldown: 7.5,
    abilityName: 'AEGIS BASTION',
    ultName: 'AEGIS CATACLYSM!',
    ultSfx: 'earthshatter',
    ultDmgMult: 5.4,
    ultColor: '#38bdf8',
    ultSubColor: '#fef08a',
    desc: 'Frontline vanguard that taunts foes and shields the hero.'
  },
  {
    id: 'seraphina',
    heroKey: 'priestess_ex',
    name: 'SERAPHINA',
    shortName: 'SERAPH',
    role: 'HEALER',
    accentHex: '#fde047',
    recruitCost: 95,
    upgradeBaseCost: 65,
    costGrowth: 1.25,
    baseDps: 18,
    attackRange: 380,
    attackInterval: 1.15,
    skillCooldown: 6.5,
    abilityName: 'SERAPHIC MEND',
    ultName: 'SERAPHIC NOVA!',
    ultSfx: 'holy_hit',
    ultDmgMult: 4.8,
    ultColor: '#fde047',
    ultSubColor: '#4ade80',
    desc: 'Restores hero HP and smites foes with radiant light.'
  },
  {
    id: 'ignis_sol',
    heroKey: 'mage_ex',
    name: 'IGNIS SOL',
    shortName: 'IGNIS',
    role: 'BLASTER',
    accentHex: '#fb923c',
    recruitCost: 140,
    upgradeBaseCost: 95,
    costGrowth: 1.25,
    baseDps: 36,
    attackRange: 420,
    attackInterval: 1.05,
    skillCooldown: 5.8,
    abilityName: 'SOLAR FLARE',
    ultName: 'SOLAR APOCALYPSE!',
    ultSfx: 'meteor_impact',
    ultDmgMult: 6.4,
    ultColor: '#fb923c',
    ultSubColor: '#fde047',
    desc: 'Unleashes scorching AoE flame bursts across monster packs.'
  },
  {
    id: 'sylvanis',
    heroKey: 'archer_ex',
    name: 'SYLVANIS',
    shortName: 'SYLVAN',
    role: 'ARCHER',
    accentHex: '#34d399',
    recruitCost: 210,
    upgradeBaseCost: 135,
    costGrowth: 1.26,
    baseDps: 44,
    attackRange: 465,
    attackInterval: 0.82,
    skillCooldown: 5.2,
    abilityName: 'STARFALL VOLLEY',
    ultName: 'STARFALL VOLLEY!',
    ultSfx: 'archer_ult',
    ultDmgMult: 5.8,
    ultColor: '#34d399',
    ultSubColor: '#fef08a',
    desc: 'Rapid piercing arrows and multi-target starfall volleys.'
  },
  {
    id: 'freyja',
    heroKey: 'valkyrie_ex',
    name: 'FREYJA',
    shortName: 'FREYJA',
    role: 'LANCER',
    accentHex: '#facc15',
    recruitCost: 340,
    upgradeBaseCost: 210,
    costGrowth: 1.27,
    baseDps: 58,
    attackRange: 195,
    attackInterval: 0.92,
    skillCooldown: 6.0,
    abilityName: 'VALKYRIE DIVE',
    ultName: 'VALKYRIE VALHALLA!',
    ultSfx: 'dragon_dive',
    ultDmgMult: 6.2,
    ultColor: '#facc15',
    ultSubColor: '#38bdf8',
    desc: 'High-impact sky-lance thrusts with heavy boss stagger.'
  },
  {
    id: 'kaze_maru',
    heroKey: 'ronin_ex',
    name: 'KAZE-MARU',
    shortName: 'KAZE',
    role: 'STRIKER',
    accentHex: '#22d3ee',
    recruitCost: 520,
    upgradeBaseCost: 320,
    costGrowth: 1.28,
    baseDps: 76,
    attackRange: 165,
    attackInterval: 0.72,
    skillCooldown: 5.0,
    abilityName: 'IAIDO FLASH',
    ultName: 'SHOGUN TEMPEST!',
    ultSfx: 'raijin_slash',
    ultDmgMult: 6.6,
    ultColor: '#22d3ee',
    ultSubColor: '#fef08a',
    desc: 'Blistering iaido critical slashes that shred single targets.'
  },
  {
    id: 'chronos',
    heroKey: 'chronomancer_ex',
    name: 'CHRONOS',
    shortName: 'CHRONOS',
    role: 'WEAVER',
    accentHex: '#c084fc',
    recruitCost: 840,
    upgradeBaseCost: 500,
    costGrowth: 1.29,
    baseDps: 94,
    attackRange: 395,
    attackInterval: 1.0,
    skillCooldown: 8.0,
    abilityName: 'CHRONO HASTE',
    ultName: 'CHRONO RIFT!',
    ultSfx: 'chrono_ult',
    ultDmgMult: 5.2,
    ultColor: '#c084fc',
    ultSubColor: '#38bdf8',
    desc: 'Slows monsters in a temporal field and accelerates allies.'
  },
  {
    id: 'raijin_ex',
    heroKey: 'brawler_ex',
    name: 'RAIJIN EX',
    shortName: 'RAIJIN',
    role: 'BRAWLER',
    accentHex: '#fbbf24',
    recruitCost: 1350,
    upgradeBaseCost: 820,
    costGrowth: 1.30,
    baseDps: 124,
    attackRange: 148,
    attackInterval: 0.76,
    skillCooldown: 5.5,
    abilityName: 'THUNDER BARRAGE',
    ultName: 'RAIJIN THUNDERCLAP!',
    ultSfx: 'thunder_slam',
    ultDmgMult: 6.8,
    ultColor: '#fbbf24',
    ultSubColor: '#38bdf8',
    desc: 'Relentless lightning-fist barrages and thunder shockwaves.'
  },
  ...(Array.isArray(ELITE_EX_COMPANION_DEFS) ? ELITE_EX_COMPANION_DEFS : [])
];

const ROSTER_BY_ID = Object.create(null);
for (const cfg of ENDLESS_COMPANION_ROSTER) {
  if (cfg && cfg.id) {
    ROSTER_BY_ID[cfg.id] = cfg;
  }
}

export const ENDLESS_PARTY_SYNERGIES = Object.freeze([
  Object.freeze({
    id: 'fortress_regen',
    name: 'FORTRESS REGEN',
    shortLabel: 'FORTRESS',
    desc: 'Aethelgard + Seraphina: +1.8% HP/s Regen & +18% Max HP',
    color: '#34d399',
    bonuses: Object.freeze({
      hpRegenBonus: 0.018,
      maxHpMult: 1.18
    })
  }),
  Object.freeze({
    id: 'arcane_overload',
    name: 'ARCANE OVERLOAD',
    shortLabel: 'ARCANE',
    desc: '2+ Arcane (Ignis/Chronos/Seraphina/Lyra): +28% Hero & Companion DMG',
    color: '#c084fc',
    bonuses: Object.freeze({
      heroDmgMult: 1.28,
      companionDmgMult: 1.28
    })
  }),
  Object.freeze({
    id: 'vanguard_blitz',
    name: 'VANGUARD BLITZ',
    shortLabel: 'VANGUARD',
    desc: '2+ Vanguard (Aethelgard/Freyja/Kaze-Maru/Raijin/Elite EX): +20% Haste & +8% Crit',
    color: '#22d3ee',
    bonuses: Object.freeze({
      hasteMult: 1.20,
      critBonus: 0.08
    })
  }),
  Object.freeze({
    id: 'tempest_volley',
    name: 'TEMPEST VOLLEY',
    shortLabel: 'TEMPEST',
    desc: 'Sylvanis + Raijin/Freyja: +35% Tap-Smite & +35% Crit DMG',
    color: '#facc15',
    bonuses: Object.freeze({
      tapDmgMult: 1.35,
      critDmgMult: 1.35
    })
  }),
  Object.freeze({
    id: 'tri_sovereign',
    name: 'TRI-SOVEREIGN PACT',
    shortLabel: 'TRI-PACT',
    desc: '3 Deployed Companions: +25% Companion DMG & +20% Gold',
    color: '#fbbf24',
    bonuses: Object.freeze({
      companionDmgMult: 1.25,
      goldMult: 1.20
    })
  })
]);

const ARCANE_SYNERGY_MEMBERS = new Set(['ignis_sol', 'chronos', 'seraphina', 'icemage_ex']);
const VANGUARD_SYNERGY_MEMBERS = new Set([
  'aethelgard',
  'freyja',
  'kaze_maru',
  'raijin_ex',
  'nyx_ex',
  'reaper_ex',
  'android_ex'
]);
const TEMPEST_PARTNER_MEMBERS = new Set(['raijin_ex', 'freyja']);

export function normalizeCompanionId(rawId) {
  if (typeof rawId !== 'string') return '';
  const k = rawId.trim().toLowerCase();
  if (k === 'ignis' || k === 'ignis_sol' || k === 'ignis-sol') return 'ignis_sol';
  if (k === 'kazemaru' || k === 'kaze_maru' || k === 'kaze-maru') return 'kaze_maru';
  if (k === 'raijin' || k === 'raijin_ex' || k === 'raijin-ex' || k === 'brawler_ex') return 'raijin_ex';
  if (k === 'nyx' || k === 'nyx_ex' || k === 'nyx-ex') return 'nyx_ex';
  if (k === 'reaper' || k === 'reaper_ex' || k === 'reaper-ex' || k === 'malakor' || k === 'malakor_ex') return 'reaper_ex';
  if (k === 'icemage' || k === 'icemage_ex' || k === 'icemage-ex' || k === 'lyra' || k === 'lyra_ex') return 'icemage_ex';
  if (k === 'android' || k === 'android_ex' || k === 'android-ex' || k === 'aegis_09' || k === 'aegis-09' || k === 'aegis09') return 'android_ex';
  return k;
}

function normalizeSynergyMemberId(rawId) {
  return normalizeCompanionId(rawId);
}

const ULT_FLASH_DURATION = 0.95;

const SKILL_DAMAGE_MULTIPLIER_BY_ROLE = {
  TANK: 2.2,
  HEALER: 2.0,
  BLASTER: 3.1,
  ARCHER: 2.8,
  LANCER: 3.4,
  STRIKER: 3.6,
  WEAVER: 2.4,
  BRAWLER: 3.3,
  ASSASSIN: 3.8,
  REAPER: 3.7,
  'CRYO MAGE': 3.5,
  VANGUARD: 3.9
};

const ULT_DAMAGE_MULTIPLIER_BY_ROLE = {
  TANK: 5.4,
  HEALER: 4.8,
  BLASTER: 6.4,
  ARCHER: 5.8,
  LANCER: 6.2,
  STRIKER: 6.6,
  WEAVER: 5.2,
  BRAWLER: 6.8,
  ASSASSIN: 7.2,
  REAPER: 7.6,
  'CRYO MAGE': 7.8,
  VANGUARD: 8.4
};

const SKILL_SFX_BY_ROLE = Object.freeze({
  TANK: 'parry_clang',
  HEALER: 'holy_heal',
  BLASTER: 'flame_pillar',
  ARCHER: 'arrow_rain',
  LANCER: 'holy_spear',
  STRIKER: 'blade_wave',
  WEAVER: 'hourglass_trap',
  BRAWLER: 'storm_leap',
  ASSASSIN: 'blink',
  REAPER: 'scythe_reap',
  'CRYO MAGE': 'ice_shatter',
  VANGUARD: 'cyber_slash'
});
const COMPANION_SKILL_SFX_COOLDOWN_SEC = 0.35;

const COMPANION_DRAW_SCALE = 0.88;
const COMPANION_ENGAGE_RANGE = COMPANION_ENGAGE_SIGHTLINE;
const FORMATION_LANE_OFFSETS = [-62, 60, -8];
const SPAWN_X_OFFSETS = [-102, -124, -138];
const SPAWN_LANE_Y = [492, 622, 558];
const ROLE_ULT_IMPACT_BEAT_SEC = 0.42;

const FLOOR_RIPPLE_MAX_COUNT = 24;
const COMPANION_STRIKES_MAX_COUNT = 16;
const COMPANION_PROJECTILES_MAX_COUNT = 24;
const ULT_EFFECTS_MAX_COUNT = 36;
const ENDLESS_COMPANION_MAX_STAT = 1e15;

function clampNum(v, lo, hi) {
  if (!Number.isFinite(v)) return lo;
  return v < lo ? lo : v > hi ? hi : v;
}

function safeBoundedInt(v, minVal = 1, maxVal = ENDLESS_COMPANION_MAX_STAT, fallback = minVal) {
  const n = Number(v);
  if (n === Infinity) return maxVal;
  if (!Number.isFinite(n)) return fallback;
  const r = Math.round(n);
  if (r < minVal) return minVal;
  if (r > maxVal) return maxVal;
  return r;
}

function safeBoundedFloat(v, minVal = 0, maxVal = ENDLESS_COMPANION_MAX_STAT, fallback = minVal) {
  const n = Number(v);
  if (n === Infinity) return maxVal;
  if (!Number.isFinite(n)) return fallback;
  if (n < minVal) return minVal;
  if (n > maxVal) return maxVal;
  return n;
}

function safeEnsureHeroLoaded(heroKey) {
  if (!heroKey) return;
  if (typeof Image === 'undefined' && !PixelForge.assets) return;
  try {
    // Load ONLY sprite sheet + portrait for Endless companions (avoid eager wings/meteor/companions VRAM waste on mobile)
    const assets = PixelForge.assets || PixelForge.initAssets?.();
    const entry = assets?.[heroKey];
    if (entry) {
      if (entry.sheet) PixelForge.ensureImage?.(entry.sheet);
      if (entry.portrait) PixelForge.ensureImage?.(entry.portrait);
      return;
    }
    PixelForge.ensureHeroLoaded?.(heroKey);
  } catch {
    // Ignore asset preload errors in headless/test contexts
  }
}

function getSafePixelForgeAssets() {
  if (PixelForge.assets) return PixelForge.assets;
  if (typeof Image === 'undefined') return null;
  try {
    return PixelForge.initAssets?.() || null;
  } catch {
    return null;
  }
}

function isSheetReady(sheet) {
  if (!sheet || !sheet.complete) return false;
  if (typeof sheet.naturalWidth === 'number') {
    return sheet.naturalWidth > 0;
  }
  return (sheet.width || 0) > 0;
}

function drawSteppedPixelAuraRing(ctx, cx, cy, rx, ry, outerColor, innerColor, alpha) {
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const rX = Math.max(12, Math.round(rx));
  const rY = Math.max(6, Math.round(ry));
  const step = 3;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = clampNum(alpha, 0, 1);

  for (let dy = -rY; dy <= rY; dy += step) {
    const normY = dy / rY;
    const spanSq = 1 - normY * normY;
    if (spanSq <= 0) continue;
    const halfW = Math.max(step, Math.round((Math.sqrt(spanSq) * rX) / step) * step);
    const bandY = iy + dy;
    const isTopOrBottom = Math.abs(dy) >= rY - step;

    ctx.fillStyle = outerColor;
    if (isTopOrBottom) {
      ctx.fillRect(ix - halfW, bandY, halfW * 2, step);
    } else {
      ctx.fillRect(ix - halfW, bandY, step * 2, step);
      ctx.fillRect(ix + halfW - step * 2, bandY, step * 2, step);
    }

    const innerHalfW = Math.max(step, halfW - step * 2);
    ctx.fillStyle = innerColor;
    if (Math.abs(dy) >= rY - step * 2 && Math.abs(dy) < rY - step) {
      ctx.fillRect(ix - innerHalfW, bandY, innerHalfW * 2, step);
    } else if (!isTopOrBottom && innerHalfW > step * 2) {
      ctx.fillRect(ix - innerHalfW, bandY, step, step);
      ctx.fillRect(ix + innerHalfW - step, bandY, step, step);
    }
  }
  ctx.restore();
}

function drawPixelFourPointStar(ctx, cx, cy, armLen, outerColor, coreColor = '#ffffff') {
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const arm = Math.max(3, Math.round(armLen));
  // 1px dark selout behind the 4-point star
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

function drawFloorRuneTicks(ctx, cx, cy, rx, ry, outerColor, coreColor, phase = 0, count = 4) {
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const n = Math.max(4, Math.floor(count));
  for (let i = 0; i < n; i++) {
    const ang = phase + (i * Math.PI * 2) / n;
    const tx = Math.round(ix + Math.cos(ang) * rx);
    const ty = Math.round(iy + Math.sin(ang) * ry);
    ctx.fillStyle = '#0d0f1c';
    ctx.fillRect(tx - 2, ty - 2, 4, 4);
    ctx.fillStyle = i % 2 === 0 ? outerColor : coreColor;
    ctx.fillRect(tx - 1, ty - 1, 2, 2);
  }
}

function drawSteppedDiamondHalo(ctx, cx, cy, rx, ry, outerHex, midHex, coreHex, alpha = 0.78, phase = 0) {
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const rX = Math.max(16, Math.round(rx));
  const rY = Math.max(16, Math.round(ry));
  const step = 3;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = clampNum(alpha, 0, 1);

  for (let dy = -rY; dy <= rY; dy += step) {
    const t = Math.abs(dy) / rY;
    const halfW = Math.max(step, Math.round(((1 - t) * rX) / step) * step);
    const y = iy + dy;
    const isApex = Math.abs(dy) >= rY - step;

    // Dark selout pass
    ctx.fillStyle = '#0d0f1c';
    if (isApex) {
      ctx.fillRect(ix - halfW - 1, y - 1, halfW * 2 + 2, step + 2);
    } else {
      ctx.fillRect(ix - halfW - 1, y - 1, step + 3, step + 2);
      ctx.fillRect(ix + halfW - step - 2, y - 1, step + 3, step + 2);
    }

    // Primary stepped halo diamond rim
    ctx.fillStyle = outerHex || '#facc15';
    if (isApex) {
      ctx.fillRect(ix - halfW, y, halfW * 2, step);
    } else {
      ctx.fillRect(ix - halfW, y, step + 1, step);
      ctx.fillRect(ix + halfW - step - 1, y, step + 1, step);
    }

    // Inner bright filigree step
    const innerHalfW = Math.max(step, halfW - step - 1);
    if (!isApex && innerHalfW > step) {
      ctx.fillStyle = midHex || '#fef08a';
      ctx.fillRect(ix - innerHalfW, y, 2, step);
      ctx.fillRect(ix + innerHalfW - 2, y, 2, step);
    }
  }

  // 4 cardinal diamond crown jewels along the stepped halo crest
  const twinkle = 0.75 + 0.25 * Math.sin(phase * 4.5);
  ctx.globalAlpha = clampNum(alpha * twinkle, 0, 1);
  const nodes = [
    [ix, iy - rY],
    [ix + rX, iy],
    [ix, iy + rY],
    [ix - rX, iy]
  ];
  for (let n = 0; n < nodes.length; n++) {
    const nx = nodes[n][0];
    const ny = nodes[n][1];
    ctx.fillStyle = '#0d0f1c';
    ctx.fillRect(nx - 3, ny - 3, 6, 6);
    ctx.fillStyle = n === 0 ? coreHex || '#ffffff' : outerHex || '#facc15';
    ctx.fillRect(nx - 2, ny - 2, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(nx - 1, ny - 1, 2, 2);
  }

  ctx.restore();
}

function drawRisingAuraFilaments(ctx, cx, groundY, outerHex, coreHex, time, slotIndex, count = 4, heightSpan = 132) {
  const ix = Math.round(cx);
  const gy = Math.round(groundY);
  const n = Math.max(2, Math.floor(count));

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < n; i++) {
    const cycle = (time * (0.72 + (i % 3) * 0.14) + i * (1 / n) + slotIndex * 0.23) % 1;
    const side = i % 2 === 0 ? -1 : 1;
    const laneOffset = 18 + ((i * 11) % 24);
    const fx = ix + side * laneOffset;
    const fy = gy - 14 - Math.round(cycle * heightSpan);
    const segH = 10 + (i % 3) * 4;
    const fade = cycle < 0.18 ? cycle / 0.18 : clampNum(1 - (cycle - 0.18) / 0.82, 0, 1);
    if (fade <= 0.05) continue;

    ctx.globalAlpha = clampNum(0.76 * fade, 0, 0.82);
    ctx.fillStyle = '#0d0f1c';
    ctx.fillRect(fx - 2, fy - segH - 1, 4, segH + 2);
    ctx.fillStyle = i % 2 === 0 ? outerHex || '#facc15' : coreHex || '#fef08a';
    ctx.fillRect(fx - 1, fy - segH, 2, segH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx - 1, fy - segH, 2, 3);
  }
  ctx.restore();
}

function drawFloatingMythicCrown(ctx, cx, cy, primaryHex, time, slotIndex) {
  const bob = Math.round(Math.sin(time * 4.2 + slotIndex * 1.3) * 2);
  const ix = Math.round(cx);
  const iy = Math.round(cy + bob);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Crisp 1px dark selout behind the 22x12 miniature sovereign pixel crown
  ctx.fillStyle = '#0d0f1c';
  ctx.fillRect(ix - 11, iy - 1, 22, 6);
  ctx.fillRect(ix - 11, iy - 7, 5, 7);
  ctx.fillRect(ix + 6, iy - 7, 5, 7);
  ctx.fillRect(ix - 3, iy - 10, 6, 10);
  ctx.fillRect(ix - 7, iy - 4, 14, 5);

  // Crown base band (deep gold shadow -> royal gold -> upper specular rim)
  ctx.fillStyle = '#b45309';
  ctx.fillRect(ix - 10, iy + 2, 20, 2);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(ix - 10, iy, 20, 2);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(ix - 9, iy - 1, 18, 1);

  // Three sovereign crown spires (left, tall center, right)
  ctx.fillStyle = '#facc15';
  ctx.fillRect(ix - 10, iy - 6, 3, 6);
  ctx.fillRect(ix + 7, iy - 6, 3, 6);
  ctx.fillRect(ix - 2, iy - 9, 4, 9);
  ctx.fillRect(ix - 6, iy - 3, 12, 3);

  // Specular gold-white tips on all 3 spires
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(ix - 10, iy - 6, 2, 2);
  ctx.fillRect(ix + 8, iy - 6, 2, 2);
  ctx.fillRect(ix - 1, iy - 9, 2, 3);

  // Center crimson sovereign ruby + twin flanking arcane gems
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(ix - 1, iy - 2, 2, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ix - 1, iy - 2, 1, 1);

  ctx.fillStyle = primaryHex || '#38bdf8';
  ctx.fillRect(ix - 7, iy, 2, 2);
  ctx.fillRect(ix + 5, iy, 2, 2);

  // Subtle orbiting twin 4-point pixel glints flanking the Mythic Crown
  const glintA = 0.55 + 0.45 * Math.sin(time * 5.6 + slotIndex);
  ctx.globalAlpha = clampNum(glintA, 0.25, 1);
  drawPixelFourPointStar(ctx, ix - 16, iy - 4, 3, '#fef08a', '#ffffff');
  ctx.globalAlpha = clampNum(1.25 - glintA, 0.25, 1);
  drawPixelFourPointStar(ctx, ix + 16, iy - 5, 3, '#f43f5e', '#ffffff');

  ctx.restore();
}

export class EndlessCompanionEntity {
  constructor(
    cfg,
    { x = 260, groundY = 558, facing = 1, level = 1, slotIndex = 0, heroKey = null, star = 1, isExEvolved = true } = {}
  ) {
    this.cfg = cfg;
    this.isEndlessCompanion = true;
    this.isMonster = false;
    this.isDead = false;
    this.isBenched = false;
    this.team = 1;
    const exMapping =
      cfg?.id && Object.prototype.hasOwnProperty.call(COMPANION_BASE_TO_EX_KEY, cfg.id)
        ? COMPANION_BASE_TO_EX_KEY[cfg.id]
        : null;
    const resolvedExKey = heroKey || exMapping?.exHeroKey || cfg.heroKey;
    this.heroId = resolvedExKey;
    this.baseHeroId = exMapping?.exHeroKey || cfg.heroKey;
    this._lastReadyHeroId = null;
    this._squad = null;
    this.isEx = true;
    this.isExForm = true;
    this.star = clampNum(Math.floor(Number(star) || 1), 1, COMPANION_MAX_STARS || 5);
    this.auraTier = getAuraTier(this.star);
    this.isExEvolved = Boolean(isExEvolved !== false);
    this.companionId = cfg.id;
    this.name = cfg.name;
    this.shortName = cfg.shortName || cfg.name;
    this.role = cfg.role;
    this.primaryColor = cfg.accentHex;
    this.slotIndex = slotIndex;
    this.isRanged = cfg.attackRange >= 300;
    this.attackRange = cfg.attackRange;

    this.x = Number.isFinite(x) ? x : 260;
    this.groundY = clampNum(groundY, 465, 655);
    this.y = this.groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing < 0 ? -1 : 1;
    this.moveDir = 1;

    this.state = 'IDLE';
    this.stateTimer = 0;
    this.animFrame = (slotIndex * 7) % 30;
    this.walkPhase = slotIndex * 1.1;
    this.level = Math.max(1, Math.floor(Number(level) || 1));

    this.autoDuration = clampNum(cfg.attackInterval * 0.64, 0.40, 0.68);
    this.skillDuration = 0.84;
    this.ultDuration = 1.15;
    this.dashDuration = 0.42;

    this.attackCooldown = 0.25 + slotIndex * 0.12;
    this.skillMaxCooldown = cfg.skillCooldown;
    this.skillCooldown = Math.max(1.2, cfg.skillCooldown * (0.35 + slotIndex * 0.14));
    this.ultCharge = 0;
    this.ultFlashTimer = 0;
    this.isCastingUlt = false;
    this._castingUltState = false;
    this._pendingRoleUlt = null;

    this.auraRingTimer = 1.35;
    this.auraRingMax = 1.35;
    this.auraRingKind = 'summon';

    this.activeProjectiles = [];
    this.activeStrikes = [];
    this.didActionHit = false;
    this.didSkillHit = false;
    this.skillBeatMask = 0;
    this.targetMonster = null;

    // Compatibility fields for Fighter / Monster / Renderer shared pipelines
    this.mana = 0;
    this.maxMana = 100;
    this.finisherGauge = 0;
    this.maxFinisherGauge = 100;
    this.hurtTimer = 0;
    this.hitFlash = 0;
    this.stunTimer = 0;
    this.deathTimer = 0;
    this.calloutText = '';
    this.lastCallout = '';
    this.calloutTimer = 0;
    this.calloutColor = cfg.accentHex;
    this.calloutIsUlt = false;
    this.stats = {
      damageDealt: 0,
      critsLanded: 0,
      biggestHit: 0,
      clashes: 0,
      counters: 0
    };
  }

  setState(newState, force = false) {
    if (force || this.state !== newState) {
      this.state = newState;
      this.stateTimer = 0;
      this.didActionHit = false;
      this.didSkillHit = false;
      this.skillBeatMask = 0;
      if (
        newState === 'AUTO_ATTACK' ||
        newState === 'SKILL' ||
        newState === 'ULTIMATE' ||
        newState === 'DASH'
      ) {
        this.animFrame = 0;
      }
    }
  }

  gainMana(amount) {
    const amt = Math.max(0, Number(amount) || 0);
    this.mana = Math.min(this.maxMana, this.mana + amt);
    if (!this.isCastingUlt) {
      this.ultCharge = clampNum(this.ultCharge + amt * 0.65, 0, 100);
    }
  }

  gainFinisher(amount) {
    const amt = Math.max(0, Number(amount) || 0);
    this.finisherGauge = Math.min(this.maxFinisherGauge, this.finisherGauge + amt);
    if (!this.isCastingUlt) {
      this.ultCharge = clampNum(this.ultCharge + amt * 0.5, 0, 100);
    }
  }

  takeDamage() {
    // Endless companions are immortal party aides so combat flow never breaks.
    this.hitFlash = Math.max(this.hitFlash, 0.08);
  }

  triggerAuraRing(kind = 'summon', duration = 1.25) {
    this.auraRingKind = kind === 'heal' || kind === 'buff' ? kind : 'summon';
    const dur = Math.max(0.35, Number(duration) || 1.25);
    this.auraRingTimer = Math.max(this.auraRingTimer, dur);
    this.auraRingMax = Math.max(dur, this.auraRingMax || dur);
  }

  triggerCallout(text, color = null, duration = 1.15, isUlt = false) {
    const clean = String(text || '');
    this.calloutText = clean;
    if (clean) {
      this.lastCallout = clean;
    }
    this.calloutColor = color || this.primaryColor;
    this.calloutTimer = Math.max(0.25, duration);
    this.calloutIsUlt = Boolean(isUlt);
  }

  getAnimRowAndCol() {
    let row = 0;
    let col = 0;
    if (this.state === 'WALK') {
      row = 1;
      col = Math.floor(Math.abs(this.animFrame)) % 30;
    } else if (this.state === 'AUTO_ATTACK') {
      row = 2;
      col = clampNum(Math.floor((this.stateTimer / Math.max(0.1, this.autoDuration)) * 30), 0, 29);
    } else if (this.state === 'SKILL') {
      row = 3;
      col = clampNum(Math.floor((this.stateTimer / Math.max(0.1, this.skillDuration)) * 30), 0, 29);
    } else if (this.state === 'ULTIMATE') {
      row = 4;
      col = clampNum(Math.floor((this.stateTimer / Math.max(0.1, this.ultDuration || 1.15)) * 30), 0, 29);
    } else if (this.state === 'DASH') {
      row = 6;
      col = clampNum(Math.floor((this.stateTimer / Math.max(0.1, this.dashDuration)) * 30), 0, 29);
    } else {
      row = 0;
      col = Math.floor(Math.abs(this.animFrame)) % 30;
    }
    return { row, col };
  }

  _drawSilhouetteFallback(ctx, scale) {
    const px = 3;
    const h = Math.round(138 * scale);
    const w = Math.round(48 * scale);
    const halfW = Math.round(w * 0.5);
    const head = Math.round(24 * scale);
    const accent = this.primaryColor || '#38bdf8';

    ctx.fillStyle = accent;
    ctx.fillRect(-halfW - 6, -px, (halfW + 6) * 2, px);

    ctx.fillStyle = '#0d0f1c';
    ctx.fillRect(-Math.round(head * 0.5) - 2, -h - 2, head + 4, head + 4);
    ctx.fillRect(-halfW - 2, -h + head, w + 4, Math.round(h * 0.48) + 4);
    ctx.fillRect(-halfW + 2, -Math.round(h * 0.34), Math.round(w * 0.38), Math.round(h * 0.34));
    ctx.fillRect(Math.round(w * 0.1), -Math.round(h * 0.34), Math.round(w * 0.38), Math.round(h * 0.34));

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-Math.round(head * 0.5), -h, head, head);
    ctx.fillRect(-halfW, -h + head + 2, w, Math.round(h * 0.46));

    ctx.fillStyle = accent;
    ctx.fillRect(-halfW + 4, -h + head + 6, w - 8, 6);
    ctx.fillRect(Math.round(halfW * 0.45), -h + head + 4, 8, Math.round(h * 0.42));
  }

  _drawBehindAura(ctx, drawX, drawY, auraTime) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;
    const starCount = clampNum(Math.floor(Number(this.star) || 1), 1, COMPANION_MAX_STARS || 5);
    const tier = getAuraTier(starCount).tier;
    if (tier < 2) return;

    const slot = Number.isFinite(this.slotIndex) ? this.slotIndex : 0;
    const pulse = 0.94 + 0.06 * Math.sin(auraTime * 4.4 + slot * 1.1);

    if (tier >= 3) {
      // 5-STAR MYTHIC CROWN: rising gilded filaments + radiant gilded-crimson behind-shoulder diamond halo
      drawRisingAuraFilaments(
        ctx,
        drawX,
        drawY,
        '#facc15',
        this.primaryColor || '#f43f5e',
        auraTime,
        slot,
        6,
        152
      );
      drawSteppedDiamondHalo(
        ctx,
        drawX,
        drawY - 114,
        Math.round(40 * pulse),
        Math.round(35 * pulse),
        '#facc15',
        '#f43f5e',
        '#ffffff',
        0.84,
        auraTime + slot * 0.7
      );
    } else {
      // 4-STAR ASCENDED HALO: rising vertical pixel filaments + crisp behind-shoulder stepped diamond halo crest
      drawRisingAuraFilaments(
        ctx,
        drawX,
        drawY,
        this.primaryColor || '#38bdf8',
        '#fef08a',
        auraTime,
        slot,
        4,
        134
      );
      drawSteppedDiamondHalo(
        ctx,
        drawX,
        drawY - 112,
        Math.round(33 * pulse),
        Math.round(29 * pulse),
        '#facc15',
        this.primaryColor || '#38bdf8',
        '#fef9c3',
        0.74,
        auraTime + slot * 0.7
      );
    }
  }

  _drawForegroundAura(ctx, drawX, drawY, auraTime) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;
    const starCount = clampNum(Math.floor(Number(this.star) || 1), 1, COMPANION_MAX_STARS || 5);
    const tier = getAuraTier(starCount).tier;
    if (tier < 3) return;

    const slot = Number.isFinite(this.slotIndex) ? this.slotIndex : 0;
    // 5-STAR MYTHIC CROWN: crisp floating miniature pixel Mythic Crown above the ally's crest
    drawFloatingMythicCrown(ctx, drawX, drawY - 164, this.primaryColor, auraTime, slot);
  }

  _drawRoleOverheadUI(ctx) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;
    const layout = this._squad?.getOverheadLayoutFor?.(this) || null;
    const cx = Math.round(this.x);
    const starCount = clampNum(Math.floor(Number(this.star) || 1), 1, COMPANION_MAX_STARS || 5);
    const auraTier = getAuraTier(starCount);
    const headY = Math.round(this.y - (starCount >= 5 ? 182 : 166));
    const castingUlt = Boolean(this.isCastingUlt || this.ultFlashTimer > 0);
    const suppressNameplate = Boolean(layout?.suppressNameplate);
    const suppressMicroBar = Boolean(layout?.suppressMicroBar);

    const roleLabel = `${this.role} LV.${this.level}`;
    const textW = PixelFont.measureWidth(roleLabel, 1, 1);
    const pillW = Math.max(44, textW + 8);
    const pillH = 12;
    const pillX = Math.round(cx - pillW * 0.5);
    const pillY = Number.isFinite(layout?.pillY) ? layout.pillY : headY - pillH;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (!suppressNameplate) {
      // Minimal obsidian nameplate with escalating Sovereign / Ascended / Mythic rim accent
      const isHighAura = auraTier.tier >= 1;
      const isMythic = auraTier.tier >= 3;
      ctx.fillStyle = castingUlt
        ? 'rgba(28, 20, 6, 0.92)'
        : isMythic
          ? 'rgba(22, 12, 24, 0.90)'
          : isHighAura
            ? 'rgba(12, 16, 30, 0.88)'
            : 'rgba(7, 10, 20, 0.82)';
      ctx.fillRect(pillX, pillY, pillW, pillH);
      ctx.fillStyle = castingUlt ? '#facc15' : isMythic ? '#f43f5e' : isHighAura ? '#f59e0b' : '#05070e';
      ctx.fillRect(pillX - 1, pillY, 1, pillH);
      ctx.fillRect(pillX + pillW, pillY, 1, pillH);
      ctx.fillRect(pillX, pillY + pillH, pillW, 1);
      ctx.fillStyle = castingUlt ? '#fef08a' : isHighAura ? '#facc15' : this.primaryColor || '#38bdf8';
      ctx.fillRect(pillX, pillY - 1, pillW, 2);

      // Crisp pixel star pips centered above nameplate for Star 2..4 (Star 5 displays the Mythic Crown)
      if (starCount >= 2 && starCount < 5) {
        const pipSpan = starCount * 5 - 2;
        const pipStartX = Math.round(cx - pipSpan * 0.5);
        const pipY = pillY - 5;
        for (let s = 0; s < starCount; s++) {
          const px = pipStartX + s * 5;
          ctx.fillStyle = '#05070e';
          ctx.fillRect(px - 1, pipY - 1, 5, 5);
          ctx.fillStyle = starCount >= 4 ? '#facc15' : starCount >= 3 ? '#fbbf24' : '#fde047';
          ctx.fillRect(px, pipY, 3, 3);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px + 1, pipY, 1, 1);
        }
      }

      PixelFont.drawCentered(
        ctx,
        roleLabel,
        cx,
        pillY + 6,
        1,
        castingUlt ? '#fef08a' : '#f8fafc',
        castingUlt ? '#facc15' : this.primaryColor,
        true
      );

      // Compact skill readiness bar & golden Ult charge strip directly beneath minimal tag
      const barW = 34;
      const barH = 2;
      const barX = Math.round(cx - barW * 0.5);
      const barY = pillY + pillH + 2;
      const cdMax = Math.max(0.5, this.skillMaxCooldown || 6);
      const skillRatio =
        this.state === 'SKILL' ? 1 : clampNum(1 - this.skillCooldown / cdMax, 0, 1);
      const fillW = Math.round(barW * skillRatio);
      const isSkillReady = skillRatio >= 0.98 || this.state === 'SKILL';

      ctx.fillStyle = '#05070e';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = '#141a2b';
      ctx.fillRect(barX, barY, barW, barH);
      if (fillW > 0) {
        ctx.fillStyle = isSkillReady ? '#facc15' : '#34d399';
        ctx.fillRect(barX, barY, fillW, barH);
      }

      const ultY = barY + barH + 2;
      const ultBarH = 2;
      const ultRatio = castingUlt
        ? clampNum(this.ultFlashTimer / ULT_FLASH_DURATION, 0, 1)
        : clampNum((Number(this.ultCharge) || 0) / 100, 0, 1);
      const ultFillW = Math.round(barW * ultRatio);

      ctx.fillStyle = '#05070e';
      ctx.fillRect(barX - 1, ultY - 1, barW + 2, ultBarH + 2);
      ctx.fillStyle = '#171522';
      ctx.fillRect(barX, ultY, barW, ultBarH);
      if (ultFillW > 0) {
        ctx.fillStyle = castingUlt ? '#fef08a' : '#f59e0b';
        ctx.fillRect(barX, ultY, ultFillW, ultBarH);
      }

      if (isSkillReady) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(barX + barW + 2, barY, 2, 2);
      }
      if (this.ultCharge >= 100 || castingUlt) {
        ctx.fillStyle = castingUlt ? '#fef08a' : '#38bdf8';
        ctx.fillRect(barX - 4, ultY, 2, 2);
      }
    } else if (!suppressMicroBar) {
      // Whisper-thin micro Ult readiness hairline when static ROLE LV.X box is suppressed for clustered allies
      const microW = 24;
      const microH = 2;
      const microX = Math.round(cx - microW * 0.5);
      const microY = headY - 4;
      const ultRatio = castingUlt
        ? clampNum(this.ultFlashTimer / ULT_FLASH_DURATION, 0, 1)
        : clampNum((Number(this.ultCharge) || 0) / 100, 0, 1);
      const ultFillW = Math.round(microW * ultRatio);

      ctx.globalAlpha = 0.78;
      ctx.fillStyle = '#05070e';
      ctx.fillRect(microX - 1, microY - 1, microW + 2, microH + 2);
      ctx.fillStyle = '#141a2b';
      ctx.fillRect(microX, microY, microW, microH);
      if (ultFillW > 0) {
        ctx.fillStyle = castingUlt ? '#fef08a' : this.primaryColor || '#f59e0b';
        ctx.fillRect(microX, microY, ultFillW, microH);
      }
      ctx.globalAlpha = 1;
    }

    // Crisp ability or bold gilded Ultimate / OVERDRIVE! callout flash (staggered & de-overlapped)
    if (this.calloutTimer > 0 && this.calloutText && !layout?.suppressCallout) {
      const calloutCx = Number.isFinite(layout?.calloutX) ? layout.calloutX : cx;
      if (this.calloutIsUlt) {
        const fade = clampNum(this.calloutTimer / 0.32, 0, 1);
        const lift = Math.round((1.55 - Math.min(1.55, this.calloutTimer)) * 22);
        const ultScale = 1;
        const cW = PixelFont.measureWidth(this.calloutText, ultScale, 1);
        const plaqueW = Math.max(76, cW + 16);
        const plaqueH = 16;
        const px = Math.round(calloutCx - plaqueW * 0.5);
        const py = Number.isFinite(layout?.calloutY)
          ? layout.calloutY
          : headY - 26 - lift - (this.slotIndex || 0) * 3;

        ctx.globalAlpha = fade;
        ctx.fillStyle = '#050712';
        ctx.fillRect(px - 2, py - 2, plaqueW + 4, plaqueH + 4);
        ctx.fillStyle = 'rgba(20, 14, 6, 0.94)';
        ctx.fillRect(px, py, plaqueW, plaqueH);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(px, py - 1, plaqueW, 2);
        ctx.fillRect(px, py + plaqueH - 1, plaqueW, 2);
        ctx.fillStyle = this.calloutColor || '#fef08a';
        ctx.fillRect(px - 1, py + 2, 2, plaqueH - 4);
        ctx.fillRect(px + plaqueW - 1, py + 2, 2, plaqueH - 4);
        PixelFont.drawCentered(
          ctx,
          this.calloutText,
          calloutCx,
          py + 8,
          ultScale,
          '#fef9c3',
          this.calloutColor || '#facc15',
          true
        );
      } else {
        const fade = clampNum(this.calloutTimer / 0.35, 0, 1);
        const lift = Math.round((1.15 - Math.min(1.15, this.calloutTimer)) * 16);
        const textCenterY = Number.isFinite(layout?.calloutY)
          ? layout.calloutY + 6
          : headY - 12 - lift - (this.slotIndex || 0) * 3;
        ctx.globalAlpha = fade;
        PixelFont.drawCentered(
          ctx,
          this.calloutText,
          calloutCx,
          textCenterY,
          1,
          '#fef9c3',
          this.calloutColor,
          true
        );
      }
    }

    ctx.restore();
  }

  draw(ctx, isReflection = false, _renderer = null) {
    if (!ctx) return;

    const assets = getSafePixelForgeAssets();
    let charSet = assets?.[this.heroId] || null;
    const rawSheet = charSet?.sheet || null;
    let sheet = rawSheet;
    let hasSheet = isSheetReady(sheet);

    if (!hasSheet) {
      safeEnsureHeroLoaded(this.heroId);
      if (rawSheet) {
        sheet = PixelForge.ensureImage?.(rawSheet) || rawSheet;
        hasSheet = isSheetReady(sheet);
      }
    }
    if (!isReflection && this._preloadedVfxHeroId !== this.heroId) {
      this._preloadedVfxHeroId = this.heroId;
      this._squad?.vfx?.preload?.(this.heroId);
    }
    if (_renderer && typeof _renderer.isMobile === 'boolean') {
      this._squad?.vfx?.setMobileMode?.(_renderer.isMobile);
    }

    if (hasSheet) {
      this._lastReadyHeroId = this.heroId;
    } else if (assets && this._lastReadyHeroId && this._lastReadyHeroId !== this.heroId) {
      const fbSet = assets[this._lastReadyHeroId] || null;
      const fbSheet = fbSet?.sheet || null;
      if (isSheetReady(fbSheet)) {
        charSet = fbSet;
        sheet = fbSheet;
        hasSheet = true;
      }
    }

    const drawX = Math.round(this.x);
    const drawY = Math.round((Number.isFinite(this.y) ? this.y : this.groundY) + 4);
    const scale = COMPANION_DRAW_SCALE;
    const auraTime = Number.isFinite(this._squad?._time) ? this._squad._time : (this.animFrame || 0) / 12;
    const auraTier = getAuraTier(this.star);
    const ultVfxMult = clampNum(Number(auraTier?.ultVfxMult) || 1.0, 1.0, 2.2);
    const castingUlt = !isReflection && Boolean(this.isCastingUlt || this.ultFlashTimer > 0);

    if (!isReflection) {
      this._drawBehindAura(ctx, drawX, drawY, auraTime);
    }

    if (castingUlt) {
      const vfxRenderer = this._squad?.vfx || null;
      if (vfxRenderer && typeof vfxRenderer.drawCasterUltOverlay === 'function') {
        vfxRenderer.drawCasterUltOverlay(ctx, this, auraTime);
      } else if (typeof ctx.fillRect === 'function') {
        // Minimal crisp 4-point spark glints fallback ONLY when vfx renderer is absent (no vertical slab)
        const u = clampNum(this.ultFlashTimer / ULT_FLASH_DURATION, 0, 1);
        const flareScale = 1 + (ultVfxMult - 1) * 0.45;
        const sparkRad = Math.max(3, Math.round(3.5 * flareScale));
        const colAccent = this.cfg?.ultColor || this.primaryColor || '#facc15';
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = clampNum(0.35 + u * 0.55, 0, 0.9);
        for (let k = -1; k <= 1; k += 2) {
          const sparkX = drawX + k * Math.round((28 + (1 - u) * 16) * flareScale);
          const sparkY = drawY - Math.round(36 + ((1 - u) * 124 + (k > 0 ? 44 : 0)) % 140);
          drawPixelFourPointStar(
            ctx,
            sparkX,
            sparkY,
            auraTier.tier >= 3 ? sparkRad + 1 : sparkRad,
            colAccent,
            '#ffffff'
          );
        }
        ctx.restore();
      }
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(drawX, drawY);
    ctx.scale(this.facing < 0 ? -1 : 1, 1);

    if (hasSheet && typeof ctx.drawImage === 'function') {
      const natW = sheet.naturalWidth || sheet.width;
      const natH = sheet.naturalHeight || sheet.height;
      let cellW = charSet?.cellW || 320;
      let cellH = charSet?.cellH || 240;
      let anchorX = charSet?.anchorX ?? 112;
      let anchorY = charSet?.anchorY ?? 230;

      if (
        natW > 0 &&
        natH > 0 &&
        (natW % cellW !== 0 || natH % cellH !== 0) &&
        natW % 30 === 0 &&
        natH % 10 === 0
      ) {
        const nextCellW = natW / 30;
        const nextCellH = natH / 10;
        anchorX = Math.round(anchorX * (nextCellW / cellW));
        anchorY = Math.round(anchorY * (nextCellH / cellH));
        cellW = nextCellW;
        cellH = nextCellH;
      }

      const cols = Math.max(1, Math.round(natW / cellW));
      const rows = Math.max(1, Math.round(natH / cellH));
      const anim = this.getAnimRowAndCol();
      const row = clampNum(anim.row, 0, rows - 1);
      const col = clampNum(anim.col, 0, cols - 1);
      const sx = col * cellW;
      const sy = row * cellH;

      const drawW = Math.round(cellW * scale);
      const drawH = Math.round(cellH * scale);
      const baseX = Math.round(-anchorX * scale);
      const baseY = Math.round(-anchorY * scale);

      if (!isReflection && this.state === 'DASH') {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = prevAlpha * 0.34;
        ctx.drawImage(sheet, sx, sy, cellW, cellH, baseX - 18, baseY, drawW, drawH);
        ctx.globalAlpha = prevAlpha;
      }

      ctx.drawImage(sheet, sx, sy, cellW, cellH, baseX, baseY, drawW, drawH);
    } else if (!isReflection && typeof ctx.fillRect === 'function') {
      this._drawSilhouetteFallback(ctx, scale);
    }

    ctx.restore();

    if (!isReflection) {
      this._drawForegroundAura(ctx, drawX, drawY, auraTime);
      this._drawRoleOverheadUI(ctx);
    }
  }
}

export class EndlessCompanions {
  constructor(endlessManager = null) {
    this.manager = endlessManager || null;
    this.rosterState = {};
    this.activeSlots = [];
    this.entities = [];
    this.activeBuffTimers = { shieldTimer: 0, hasteTimer: 0 };
    this._floorRipples = [];
    this._ultEffects = [];
    this._time = 0;
    this._formationShiftTimer = 0;
    this._lastSkillSfxTime = -1;
    this._activeUltVfxMult = 1.0;
    this.vfx = new EndlessCompanionVfx({ maxInstances: 76 });
    this.ai = new EndlessCompanionAI();
    this.reset();
  }

  normalizeId(rawId) {
    return ROSTER_BY_ID[rawId] ? rawId : normalizeCompanionId(rawId);
  }

  _getEvo() {
    return this.manager?.companionEvo || null;
  }

  _resolveActiveHeroKey(cfg) {
    if (!cfg) return '';
    const evo = this._getEvo();
    if (evo && typeof evo.getSpriteHeroKey === 'function') {
      return evo.getSpriteHeroKey(cfg.id, cfg.heroKey) || cfg.heroKey;
    }
    return cfg.heroKey;
  }

  _getStarInfo(id) {
    const evo = this._getEvo();
    if (evo && typeof evo.getStarMultipliers === 'function') {
      const info = evo.getStarMultipliers(id);
      if (info && typeof info === 'object') return info;
    }
    const auraTier = getAuraTier(1);
    return {
      star: 1,
      title: 'NEXT-GEN EX',
      dpsMult: 1.0,
      ultMult: 1.0,
      isExForm: true,
      isExEvolved: true,
      isExSprite: true,
      auraTier,
      nextAuraTier: getAuraTier(2),
      ultVfxMult: auraTier.ultVfxMult,
      nextStar: 2,
      promoteShards: 3,
      promoteDust: 20,
      isMaxStar: false
    };
  }

  onFormationChanged() {
    this._formationShiftTimer = 0.85;
    for (const ent of this.entities) {
      if (ent) {
        ent.triggerAuraRing('buff', 0.72);
      }
    }
  }

  clearTransientFX() {
    this._floorRipples.length = 0;
    this._ultEffects.length = 0;
    this._formationShiftTimer = 0;
    this._lastSkillSfxTime = -1;
    this.vfx?.clear?.();
    this.ai?.reset?.();
    if (Array.isArray(this.entities)) {
      for (let i = 0; i < this.entities.length; i++) {
        const ent = this.entities[i];
        if (!ent) continue;
        if (Array.isArray(ent.activeProjectiles)) ent.activeProjectiles.length = 0;
        if (Array.isArray(ent.activeStrikes)) ent.activeStrikes.length = 0;
        ent.targetMonster = null;
        ent._pendingRoleUlt = null;
      }
    }
  }

  getOverheadLayoutFor(entity) {
    if (!entity || !Array.isArray(this.entities) || this.entities.length === 0) return null;
    const ents = this.entities;
    // Reuse per-frame layout calculation across all 3 companions (1x/frame instead of 3x/frame)
    if (
      this._overheadLayoutMap &&
      this._overheadCacheTime === this._time &&
      this._overheadCacheCount === ents.length &&
      this._overheadLayoutMap.has(entity)
    ) {
      return this._overheadLayoutMap.get(entity);
    }
    const items = [];
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (!e) continue;
      const cx = Math.round(Number.isFinite(e.x) ? e.x : 0);
      const ey = Number.isFinite(e.y) ? e.y : Number.isFinite(e.groundY) ? e.groundY : 558;
      const starCount = clampNum(Math.floor(Number(e.star) || 1), 1, COMPANION_MAX_STARS || 5);
      const headY = Math.round(ey - (starCount >= 5 ? 182 : 166));
      const roleLabel = `${e.role} LV.${e.level}`;
      const textW = PixelFont.measureWidth(roleLabel, 1, 1);
      const pillW = Math.max(44, textW + 8);
      const pillH = 12;
      items.push({
        entity: e,
        slotIndex: Number.isFinite(e.slotIndex) ? e.slotIndex : i,
        cx,
        headY,
        pillW,
        pillH,
        pillY: headY - pillH,
        topPad: starCount >= 2 && starCount < 5 ? 6 : 2,
        botPad: 9,
        calloutX: cx,
        calloutY: null,
        calloutW: 0,
        calloutH: 0,
        suppressCallout: false,
        suppressNameplate: false,
        suppressMicroBar: false,
        isClustered: false
      });
    }
    if (items.length === 0) return null;

    // 1. Suppress redundant static ROLE LV.X boxes whenever allies are clustered within 110px horizontally
    //    OR whenever an OVERDRIVE! / nearby skill callout is active so stacked allies never crowd the left battlefield.
    const anyOverdriveCallout = items.some(
      (it) => it.entity.calloutTimer > 0 && it.entity.calloutText === 'OVERDRIVE!'
    );
    let minSquadX = items[0].cx;
    let maxSquadX = items[0].cx;
    let minSquadHeadY = items[0].headY;
    for (let i = 0; i < items.length; i++) {
      const cur = items[i];
      if (cur.cx < minSquadX) minSquadX = cur.cx;
      if (cur.cx > maxSquadX) maxSquadX = cur.cx;
      if (cur.headY < minSquadHeadY) minSquadHeadY = cur.headY;

      let clustered = false;
      let nearbyCallout = anyOverdriveCallout || (cur.entity.calloutTimer > 0 && Boolean(cur.entity.calloutText));
      let overlappingMicro = false;
      for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const other = items[j];
        const dx = Math.abs(cur.cx - other.cx);
        if (dx <= 110) {
          clustered = true;
        }
        if (
          !nearbyCallout &&
          other.entity.calloutTimer > 0 &&
          Boolean(other.entity.calloutText) &&
          dx <= 130
        ) {
          nearbyCallout = true;
        }
        if (dx <= 30 && Math.abs(cur.headY - other.headY) <= 14 && other.slotIndex < cur.slotIndex) {
          overlappingMicro = true;
        }
      }
      cur.isClustered = clustered;
      cur.suppressNameplate = clustered || nearbyCallout;
      cur.suppressMicroBar =
        anyOverdriveCallout ||
        (cur.entity.calloutTimer > 0 && Boolean(cur.entity.calloutText)) ||
        overlappingMicro;
    }

    // 2. De-overlap only visible (non-suppressed) minimal nameplates bottom-up
    const bottomUp = items
      .map((_, idx) => idx)
      .filter((idx) => !items[idx].suppressNameplate)
      .sort((a, b) => items[b].pillY - items[a].pillY || items[b].slotIndex - items[a].slotIndex);
    const placedPills = [];
    for (let k = 0; k < bottomUp.length; k++) {
      const cur = items[bottomUp[k]];
      let guard = 0;
      let shifted = true;
      while (shifted && guard < 4) {
        shifted = false;
        guard++;
        const curTop = cur.pillY - cur.topPad;
        const curBot = cur.pillY + cur.pillH + cur.botPad;
        for (let p = 0; p < placedPills.length; p++) {
          const obs = placedPills[p];
          if (Math.abs(cur.cx - obs.cx) >= (cur.pillW + obs.pillW) * 0.5 + 8) continue;
          const obsTop = obs.pillY - obs.topPad;
          const obsBot = obs.pillY + obs.pillH + obs.botPad;
          if (curBot > obsTop - 4 && curTop < obsBot + 4) {
            cur.pillY = obsTop - 4 - cur.pillH - cur.botPad;
            shifted = true;
          }
        }
      }
      cur.pillY = Math.max(88, cur.pillY);
      placedPills.push(cur);
    }

    // 3. Deduplicate OVERDRIVE! (render once cleanly centered above the squad) and de-overlap active callouts
    const calloutOrder = items
      .map((_, idx) => idx)
      .filter((idx) => items[idx].entity.calloutTimer > 0 && Boolean(items[idx].entity.calloutText))
      .sort((a, b) => {
        const ea = items[a].entity;
        const eb = items[b].entity;
        const aOd = ea.calloutText === 'OVERDRIVE!' ? 1 : 0;
        const bOd = eb.calloutText === 'OVERDRIVE!' ? 1 : 0;
        if (bOd !== aOd) return bOd - aOd;
        if (Boolean(eb.calloutIsUlt) !== Boolean(ea.calloutIsUlt)) {
          return eb.calloutIsUlt ? 1 : -1;
        }
        return items[a].headY - items[b].headY || items[a].slotIndex - items[b].slotIndex;
      });

    const squadMidX = Math.round((minSquadX + maxSquadX) * 0.5);
    const placedCallouts = [];
    let placedOverdrive = false;
    for (let k = 0; k < calloutOrder.length; k++) {
      const cur = items[calloutOrder[k]];
      const e = cur.entity;
      const isOverdrive = e.calloutText === 'OVERDRIVE!';

      if (isOverdrive) {
        if (placedOverdrive) {
          cur.suppressCallout = true;
          continue;
        }
        placedOverdrive = true;
      } else {
        let duplicate = false;
        for (let p = 0; p < placedCallouts.length; p++) {
          const prev = placedCallouts[p];
          if (prev.entity.calloutText === e.calloutText && Math.abs(cur.cx - prev.cx) <= 280) {
            duplicate = true;
            break;
          }
        }
        if (duplicate) {
          cur.suppressCallout = true;
          continue;
        }
      }

      const cW = PixelFont.measureWidth(e.calloutText, 1, 1);
      if (isOverdrive) {
        const lift = Math.round((1.4 - Math.min(1.4, e.calloutTimer)) * 18);
        cur.calloutX = squadMidX;
        cur.calloutW = Math.max(82, cW + 18) + 4;
        cur.calloutH = 20;
        cur.calloutY = Math.max(66, minSquadHeadY - 26 - lift);
      } else if (e.calloutIsUlt) {
        const lift = Math.round((1.55 - Math.min(1.55, e.calloutTimer)) * 22);
        cur.calloutX = cur.cx;
        cur.calloutW = Math.max(76, cW + 16) + 4;
        cur.calloutH = 20;
        cur.calloutY = cur.headY - 24 - lift - cur.slotIndex * 3;
      } else {
        const lift = Math.round((1.15 - Math.min(1.15, e.calloutTimer)) * 16);
        cur.calloutX = cur.cx;
        cur.calloutW = Math.max(44, cW + 8);
        cur.calloutH = 12;
        cur.calloutY = cur.headY - 14 - lift - cur.slotIndex * 3;
      }

      let guard = 0;
      let shifted = true;
      while (shifted && guard < 6) {
        shifted = false;
        guard++;
        // Avoid colliding with any visible (non-suppressed) ally nameplate
        for (let j = 0; j < placedPills.length; j++) {
          const tag = placedPills[j];
          if (Math.abs(cur.calloutX - tag.cx) >= (cur.calloutW + tag.pillW) * 0.5 + 8) continue;
          const tagTop = tag.pillY - tag.topPad;
          const tagBot = tag.pillY + tag.pillH + tag.botPad;
          if (cur.calloutY + cur.calloutH > tagTop - 4 && cur.calloutY < tagBot + 4) {
            cur.calloutY = tagTop - 4 - cur.calloutH;
            shifted = true;
          }
        }
        // Avoid colliding with already-placed sibling callouts
        for (let p = 0; p < placedCallouts.length; p++) {
          const prev = placedCallouts[p];
          if (Math.abs(cur.calloutX - prev.calloutX) >= (cur.calloutW + prev.calloutW) * 0.5 + 8) continue;
          const prevTop = prev.calloutY;
          const prevBot = prev.calloutY + prev.calloutH;
          if (cur.calloutY + cur.calloutH > prevTop - 4 && cur.calloutY < prevBot + 4) {
            cur.calloutY = prevTop - 4 - cur.calloutH;
            shifted = true;
          }
        }
      }
      cur.calloutY = Math.max(66, cur.calloutY);
      placedCallouts.push(cur);
    }

    if (!this._overheadLayoutMap) {
      this._overheadLayoutMap = new Map();
    } else {
      this._overheadLayoutMap.clear();
    }
    this._overheadCacheTime = this._time;
    this._overheadCacheCount = ents.length;

    let result = null;
    for (let i = 0; i < items.length; i++) {
      const entry = {
        pillY: items[i].pillY,
        calloutX: items[i].calloutX,
        calloutY: items[i].calloutY,
        suppressCallout: items[i].suppressCallout,
        suppressNameplate: items[i].suppressNameplate,
        suppressMicroBar: items[i].suppressMicroBar,
        isClustered: items[i].isClustered
      };
      this._overheadLayoutMap.set(items[i].entity, entry);
      if (items[i].entity === entity) {
        result = entry;
      }
    }
    return result;
  }

  _playSkillSfx(role, worldX, game) {
    const now = Number.isFinite(this._time) ? this._time : 0;
    if (now - (Number.isFinite(this._lastSkillSfxTime) ? this._lastSkillSfxTime : -1) < COMPANION_SKILL_SFX_COOLDOWN_SEC) {
      return false;
    }
    const audio = game?.audio || this.manager?.game?.audio || null;
    if (!audio) return false;
    const playFn =
      typeof audio.play === 'function'
        ? audio.play
        : typeof audio.playSFX === 'function'
          ? audio.playSFX
          : null;
    if (!playFn) return false;
    const sfxKey = SKILL_SFX_BY_ROLE[role] || 'skill_cast';
    this._lastSkillSfxTime = now;
    playFn.call(audio, sfxKey, Number.isFinite(worldX) ? worldX : null);
    return true;
  }

  reset() {
    this.clearTransientFX();
    this.rosterState = {};
    for (const cfg of ENDLESS_COMPANION_ROSTER) {
      this.rosterState[cfg.id] = { unlocked: false, level: 0 };
    }
    this.activeSlots = [];
    this.entities = [];
    this.activeBuffTimers = { shieldTimer: 0, hasteTimer: 0 };
    this._floorRipples = [];
    this._ultEffects = [];
    this._time = 0;
    this._formationShiftTimer = 0;
    this._lastSkillSfxTime = -1;
  }

  _getDiscountMult(economy) {
    const raw =
      typeof economy?.getCostDiscountMult === 'function' ? economy.getCostDiscountMult() : 1;
    return clampNum(Number(raw) || 1, 0.1, 1);
  }

  getRecruitCost(id, economy = null) {
    const normId = this.normalizeId(id);
    const cfg = ROSTER_BY_ID[normId];
    if (!cfg) return Infinity;
    const discount = this._getDiscountMult(economy);
    return safeBoundedInt(cfg.recruitCost * discount, 1, ENDLESS_COMPANION_MAX_STAT);
  }

  getUpgradeCost(id, economy = null) {
    const normId = this.normalizeId(id);
    const cfg = ROSTER_BY_ID[normId];
    if (!cfg) return Infinity;
    const st = this.rosterState[normId];
    const currentLv = Math.max(1, Math.floor(Number(st?.level) || 1));
    const discount = this._getDiscountMult(economy);
    return safeBoundedInt(
      cfg.upgradeBaseCost * Math.pow(cfg.costGrowth, Math.min(320, currentLv - 1)) * discount,
      1,
      ENDLESS_COMPANION_MAX_STAT
    );
  }

  getActiveSynergies() {
    const deployedSet = new Set();
    if (Array.isArray(this.activeSlots)) {
      for (const rawId of this.activeSlots) {
        const norm = normalizeSynergyMemberId(rawId);
        if (norm) deployedSet.add(norm);
      }
    }
    if (deployedSet.size === 0) return [];

    let arcaneCount = 0;
    let vanguardCount = 0;
    let hasTempestPartner = false;
    for (const id of deployedSet) {
      if (ARCANE_SYNERGY_MEMBERS.has(id)) arcaneCount++;
      if (VANGUARD_SYNERGY_MEMBERS.has(id)) vanguardCount++;
      if (TEMPEST_PARTNER_MEMBERS.has(id)) hasTempestPartner = true;
    }

    const activeIds = new Set();
    if (deployedSet.has('aethelgard') && deployedSet.has('seraphina')) {
      activeIds.add('fortress_regen');
    }
    if (arcaneCount >= 2) {
      activeIds.add('arcane_overload');
    }
    if (vanguardCount >= 2) {
      activeIds.add('vanguard_blitz');
    }
    if (deployedSet.has('sylvanis') && hasTempestPartner) {
      activeIds.add('tempest_volley');
    }
    if (deployedSet.size >= ENDLESS_MAX_ACTIVE_SLOTS) {
      activeIds.add('tri_sovereign');
    }

    const result = [];
    for (const syn of ENDLESS_PARTY_SYNERGIES) {
      if (activeIds.has(syn.id)) {
        result.push({
          id: syn.id,
          name: syn.name,
          shortLabel: syn.shortLabel,
          desc: syn.desc,
          color: syn.color,
          bonuses: { ...syn.bonuses }
        });
      }
    }
    return result;
  }

  getPartySynergyModifiers() {
    const mods = {
      heroDmgMult: 1.0,
      companionDmgMult: 1.0,
      goldMult: 1.0,
      tapDmgMult: 1.0,
      hasteMult: 1.0,
      critBonus: 0,
      critDmgMult: 1.0,
      hpRegenBonus: 0,
      maxHpMult: 1.0
    };

    const active = this.getActiveSynergies();
    for (const syn of active) {
      const b = syn.bonuses || {};
      if (Number.isFinite(b.heroDmgMult) && b.heroDmgMult > 0) {
        mods.heroDmgMult *= b.heroDmgMult;
      }
      if (Number.isFinite(b.companionDmgMult) && b.companionDmgMult > 0) {
        mods.companionDmgMult *= b.companionDmgMult;
      }
      if (Number.isFinite(b.goldMult) && b.goldMult > 0) {
        mods.goldMult *= b.goldMult;
      }
      if (Number.isFinite(b.tapDmgMult) && b.tapDmgMult > 0) {
        mods.tapDmgMult *= b.tapDmgMult;
      }
      if (Number.isFinite(b.hasteMult) && b.hasteMult > 0) {
        mods.hasteMult *= b.hasteMult;
      }
      if (Number.isFinite(b.critBonus)) {
        mods.critBonus += b.critBonus;
      }
      if (Number.isFinite(b.critDmgMult) && b.critDmgMult > 0) {
        mods.critDmgMult *= b.critDmgMult;
      }
      if (Number.isFinite(b.hpRegenBonus)) {
        mods.hpRegenBonus += b.hpRegenBonus;
      }
      if (Number.isFinite(b.maxHpMult) && b.maxHpMult > 0) {
        mods.maxHpMult *= b.maxHpMult;
      }
    }

    mods.heroDmgMult = Math.round(mods.heroDmgMult * 10000) / 10000;
    mods.companionDmgMult = Math.round(mods.companionDmgMult * 10000) / 10000;
    mods.goldMult = Math.round(mods.goldMult * 10000) / 10000;
    mods.tapDmgMult = Math.round(mods.tapDmgMult * 10000) / 10000;
    mods.hasteMult = Math.round(mods.hasteMult * 10000) / 10000;
    mods.critBonus = Math.round(mods.critBonus * 10000) / 10000;
    mods.critDmgMult = Math.round(mods.critDmgMult * 10000) / 10000;
    mods.hpRegenBonus = Math.round(mods.hpRegenBonus * 10000) / 10000;
    mods.maxHpMult = Math.round(mods.maxHpMult * 10000) / 10000;
    return mods;
  }

  getActiveHudUnits(economy = null) {
    const eco = economy || this.manager?.economy || null;
    const stats = typeof eco?.getComputedStats === 'function' ? eco.getComputedStats() : null;
    const synMods = this.getPartySynergyModifiers();
    const entityById = new Map();
    for (const ent of this.entities) {
      entityById.set(ent.companionId, ent);
    }

    const units = [];
    const slots = Array.isArray(this.activeSlots)
      ? this.activeSlots.slice(0, ENDLESS_MAX_ACTIVE_SLOTS)
      : [];

    for (const rawId of slots) {
      const id = this.normalizeId(rawId);
      const cfg = ROSTER_BY_ID[id];
      if (!cfg) continue;

      const st = this.rosterState[id] || { unlocked: true, level: 1 };
      const ent = entityById.get(id) || null;
      const level = Math.max(1, Math.floor(Number(ent?.level || st.level) || 1));
      const power = this.computeCompanionPower(id, level, eco, stats, synMods);
      const starInfo = this._getStarInfo(id);
      const activeHeroKey = ent?.heroId || this._resolveActiveHeroKey(cfg);

      const rawUlt = clampNum(Number(ent?.ultCharge) || 0, 0, 100);
      const isCastingUlt = Boolean(ent && (ent.isCastingUlt || ent.ultFlashTimer > 0));
      const flashPct = isCastingUlt
        ? Math.round(clampNum((ent.ultFlashTimer || 0) / ULT_FLASH_DURATION, 0, 1) * 100)
        : 0;
      const ultPct = isCastingUlt ? Math.max(Math.round(rawUlt), flashPct) : Math.round(rawUlt);

      const cdMax = Math.max(0.5, ent?.skillMaxCooldown || cfg.skillCooldown || 6);
      const skillCdRatio = ent
        ? ent.state === 'SKILL'
          ? 1
          : clampNum(1 - (Number(ent.skillCooldown) || 0) / cdMax, 0, 1)
        : 0;

      const auraTier = starInfo.auraTier || getAuraTier(starInfo.star);
      units.push({
        id: cfg.id,
        heroKey: cfg.heroKey,
        activeHeroKey,
        name: cfg.name,
        shortName: cfg.shortName || cfg.name,
        role: cfg.role,
        color: cfg.accentHex,
        level,
        star: starInfo.star,
        isExForm: true,
        isExEvolved: true,
        isExSprite: true,
        auraTier,
        ultVfxMult: auraTier.ultVfxMult,
        ultCharge: Math.round(rawUlt * 10) / 10,
        ultPct: clampNum(ultPct, 0, 100),
        isCastingUlt,
        skillCdRatio: Math.round(skillCdRatio * 1000) / 1000,
        dpsEstimate: power.dpsEstimate,
        lastCallout: ent ? ent.lastCallout || ent.calloutText || '' : ''
      });
    }

    return units;
  }

  computeCompanionPower(id, level = 1, economy = null, precomputedStats = null, precomputedSynMods = null) {
    const normId = this.normalizeId(id);
    const cfg = ROSTER_BY_ID[normId];
    if (!cfg) {
      return { attackDmg: 0, skillDmg: 0, ultDmg: 0, healAmount: 0, dpsEstimate: 0 };
    }
    const lv = Math.max(1, Math.min(1e6, Math.floor(Number(level) || 1)));
    const stats =
      precomputedStats && typeof precomputedStats === 'object'
        ? precomputedStats
        : typeof economy?.getComputedStats === 'function'
          ? economy.getComputedStats()
          : null;
    const synMods =
      precomputedSynMods && typeof precomputedSynMods === 'object'
        ? precomputedSynMods
        : this.getPartySynergyModifiers();

    // Avoid double-multiplying if EndlessManager already folded synergy modifiers into economy._externalModifiers
    const extMod = economy?._externalModifiers;
    const rawExtComp = Number(extMod?.companionMult);
    const rawExtGlobal = Number(extMod?.globalDpsMult);
    const extAppliedComp =
      (Number.isFinite(rawExtComp) && rawExtComp > 0 ? rawExtComp : 1) *
      (Number.isFinite(rawExtGlobal) && rawExtGlobal > 0 ? rawExtGlobal : 1);
    const economyHasSynergyComp = Boolean(
      synMods.companionDmgMult > 1.0001 && extAppliedComp >= synMods.companionDmgMult - 0.001
    );
    const synCompMult = economyHasSynergyComp ? 1.0 : safeBoundedFloat(synMods.companionDmgMult, 0.1, 1e6, 1);
    const rawEcoComp = Number(stats?.companionDmgMult);
    const ecoCompMult = Number.isFinite(rawEcoComp) && rawEcoComp > 0 ? rawEcoComp : 1;
    const compMult = safeBoundedFloat(ecoCompMult * synCompMult, 0.1, 1e9, 1);

    const starInfo = this._getStarInfo(normId);
    const starDpsMult = safeBoundedFloat(starInfo?.dpsMult, 0.5, 100, 1.0);
    const starUltMult = safeBoundedFloat(starInfo?.ultMult, 0.5, 100, 1.0);

    const milestoneMult = Math.pow(1.45, Math.min(120, Math.floor(lv / 10)));
    const levelScale = Math.pow(1.16, Math.min(300, lv - 1)) * (1 + (lv - 1) * 0.12) * milestoneMult;
    const scaledBaseDps = cfg.baseDps * levelScale * compMult * starDpsMult;

    const attackDmg = safeBoundedInt(scaledBaseDps * cfg.attackInterval, 1, ENDLESS_COMPANION_MAX_STAT);
    const roleSkillMult = SKILL_DAMAGE_MULTIPLIER_BY_ROLE[cfg.role] || 2.5;
    const skillDmg = safeBoundedInt(attackDmg * roleSkillMult, 2, ENDLESS_COMPANION_MAX_STAT);
    const roleUltMult = cfg.ultDmgMult || ULT_DAMAGE_MULTIPLIER_BY_ROLE[cfg.role] || 5.5;
    const ultDmg = safeBoundedInt(attackDmg * roleUltMult * starUltMult, 4, ENDLESS_COMPANION_MAX_STAT);

    const healAmount =
      cfg.role === 'HEALER'
        ? safeBoundedInt(
            (75 + (lv - 1) * 28) * Math.pow(1.10, Math.min(40, lv - 1)) * compMult * starDpsMult,
            45,
            ENDLESS_COMPANION_MAX_STAT
          )
        : 0;

    const autoDps = attackDmg / Math.max(0.25, cfg.attackInterval);
    const skillDps = skillDmg / Math.max(1.5, cfg.skillCooldown);
    const rawEcoHaste = Number(stats?.hasteMult);
    const ecoHasteMult = Number.isFinite(rawEcoHaste) && rawEcoHaste > 0 ? rawEcoHaste : 1;
    const safeHaste = safeBoundedFloat(ecoHasteMult * synMods.hasteMult, 0.25, 25, 1);
    const dpsEstimate = safeBoundedInt((autoDps + skillDps) * safeHaste, 1, ENDLESS_COMPANION_MAX_STAT);

    return { attackDmg, skillDmg, ultDmg, healAmount, dpsEstimate };
  }

  getRosterView(economy = null) {
    const eco = economy || this.manager?.economy || null;
    const stats = typeof eco?.getComputedStats === 'function' ? eco.getComputedStats() : null;
    const synMods = this.getPartySynergyModifiers();
    const evo = this._getEvo();
    const gear = this.manager?.gear || null;
    const gold = Number.isFinite(eco?.gold) ? eco.gold : 0;
    const reachedStage = Math.max(
      Math.floor(Number(this.manager?.stage) || 1),
      Math.floor(Number(this.manager?.bestStage) || 1),
      Math.floor(Number(eco?.bestStage) || 1)
    );
    return ENDLESS_COMPANION_ROSTER.map((cfg) => {
      const st = this.rosterState[cfg.id] || { unlocked: false, level: 0 };
      const unlocked = Boolean(st.unlocked);
      const level = unlocked ? Math.max(1, Math.floor(Number(st.level) || 1)) : 0;
      const activeSlotIndex = this.activeSlots.indexOf(cfg.id);
      const deployed = activeSlotIndex !== -1;
      const unlockStage = Math.max(1, Math.floor(Number(cfg.unlockStage) || 1));
      const stageLocked = !unlocked && reachedStage < unlockStage;
      const recruitCost = this.getRecruitCost(cfg.id, eco);
      const upgradeCost = this.getUpgradeCost(cfg.id, eco);
      const power = this.computeCompanionPower(cfg.id, Math.max(1, level), eco, stats, synMods);
      const starInfo = this._getStarInfo(cfg.id);
      const activeHeroKey = this._resolveActiveHeroKey(cfg);
      const promoteQuote =
        evo && typeof evo.getPromoteQuote === 'function'
          ? evo.getPromoteQuote(cfg.id, eco, gear) || null
          : null;
      const auraTier = starInfo.auraTier || getAuraTier(starInfo.star);
      const nextAuraTier =
        starInfo.nextAuraTier !== undefined
          ? starInfo.nextAuraTier
          : starInfo.star >= COMPANION_MAX_STARS
            ? null
            : getAuraTier(starInfo.star + 1);
      return {
        id: cfg.id,
        heroKey: cfg.heroKey,
        activeHeroKey,
        name: cfg.name,
        shortName: cfg.shortName || cfg.name,
        role: cfg.role,
        accentHex: cfg.accentHex,
        abilityName: cfg.abilityName,
        ultName: cfg.ultName || cfg.abilityName,
        desc: cfg.desc,
        unlocked,
        level,
        deployed,
        activeSlotIndex,
        unlockStage,
        stageLocked,
        isEliteEx: Boolean(cfg.isEliteEx),
        star: starInfo.star,
        maxStars: COMPANION_MAX_STARS || 5,
        starTitle: starInfo.title || 'NEXT-GEN EX',
        isExForm: true,
        isExEvolved: true,
        isExSprite: true,
        auraTier,
        nextAuraTier,
        ultVfxMult: auraTier.ultVfxMult,
        starDpsMult: safeBoundedFloat(starInfo.dpsMult, 0.5, 100, 1.0),
        promoteQuote,
        recruitCost,
        canAffordRecruit: !unlocked && !stageLocked && gold >= recruitCost,
        upgradeCost,
        canAffordUpgrade: unlocked && gold >= upgradeCost,
        dpsEstimate: power.dpsEstimate
      };
    });
  }

  recruit(id, economy = null) {
    const normId = this.normalizeId(id);
    const cfg = ROSTER_BY_ID[normId];
    if (!cfg) {
      return { ok: false, spent: 0, autoDeployed: false, reason: 'UNKNOWN_COMPANION' };
    }
    const st = this.rosterState[normId] || (this.rosterState[normId] = { unlocked: false, level: 0 });
    if (st.unlocked) {
      return { ok: false, spent: 0, autoDeployed: false, reason: 'ALREADY_UNLOCKED' };
    }

    const unlockStage = Math.max(1, Math.floor(Number(cfg.unlockStage) || 1));
    const reachedStage = Math.max(
      Math.floor(Number(this.manager?.stage) || 1),
      Math.floor(Number(this.manager?.bestStage) || 1),
      Math.floor(Number(economy?.bestStage) || 1)
    );
    if (reachedStage < unlockStage) {
      return { ok: false, spent: 0, autoDeployed: false, reason: 'stage_locked', unlockStage };
    }

    const cost = this.getRecruitCost(normId, economy);
    if (economy && typeof economy.spendGold === 'function') {
      if (!economy.spendGold(cost)) {
        return { ok: false, spent: 0, autoDeployed: false, reason: 'INSUFFICIENT_GOLD' };
      }
    }

    st.unlocked = true;
    st.level = 1;

    let autoDeployed = false;
    if (this.activeSlots.length < ENDLESS_MAX_ACTIVE_SLOTS && !this.activeSlots.includes(normId)) {
      this.activeSlots.push(normId);
      autoDeployed = true;
    }

    const activeKey = this._resolveActiveHeroKey(cfg);
    safeEnsureHeroLoaded(activeKey);
    this.vfx?.preload?.(activeKey);
    if (autoDeployed && this.manager?.player) {
      this.syncEntitiesWithWorld(this.manager.player);
    }

    return { ok: true, spent: cost, autoDeployed };
  }

  upgrade(id, economy = null) {
    const normId = this.normalizeId(id);
    const cfg = ROSTER_BY_ID[normId];
    if (!cfg) {
      return { ok: false, spent: 0, newLevel: 0, reason: 'UNKNOWN_COMPANION' };
    }
    const st = this.rosterState[normId];
    if (!st || !st.unlocked) {
      return { ok: false, spent: 0, newLevel: 0, reason: 'NOT_UNLOCKED' };
    }

    const cost = this.getUpgradeCost(normId, economy);
    if (economy && typeof economy.spendGold === 'function') {
      if (!economy.spendGold(cost)) {
        return { ok: false, spent: 0, newLevel: st.level, reason: 'INSUFFICIENT_GOLD' };
      }
    }

    st.level = Math.max(1, Math.floor(Number(st.level) || 1)) + 1;
    const entity = this.entities.find((e) => e.companionId === normId);
    if (entity) {
      entity.level = st.level;
      entity.triggerAuraRing('buff', 0.95);
      entity.triggerCallout(`LV.${st.level}`, '#facc15', 0.9);
    }

    return { ok: true, spent: cost, newLevel: st.level };
  }

  toggleDeploy(id) {
    const normId = this.normalizeId(id);
    const cfg = ROSTER_BY_ID[normId];
    if (!cfg) {
      return {
        ok: false,
        deployed: false,
        activeSlots: [...this.activeSlots],
        reason: 'UNKNOWN_COMPANION'
      };
    }
    const st = this.rosterState[normId];
    if (!st || !st.unlocked) {
      return {
        ok: false,
        deployed: false,
        activeSlots: [...this.activeSlots],
        reason: 'NOT_UNLOCKED'
      };
    }

    const idx = this.activeSlots.indexOf(normId);
    if (idx !== -1) {
      this.activeSlots.splice(idx, 1);
      if (this.manager?.player) {
        this.syncEntitiesWithWorld(this.manager.player);
      } else {
        this.entities = this.entities.filter((e) => e.companionId !== normId);
      }
      return { ok: true, deployed: false, activeSlots: [...this.activeSlots] };
    }

    if (this.activeSlots.length >= ENDLESS_MAX_ACTIVE_SLOTS) {
      return {
        ok: false,
        deployed: false,
        activeSlots: [...this.activeSlots],
        reason: 'SLOTS_FULL'
      };
    }

    this.activeSlots.push(normId);
    const activeKey = this._resolveActiveHeroKey(cfg);
    safeEnsureHeroLoaded(activeKey);
    this.vfx?.preload?.(activeKey);
    if (this.manager?.player) {
      this.syncEntitiesWithWorld(this.manager.player);
    }

    return { ok: true, deployed: true, activeSlots: [...this.activeSlots] };
  }

  syncEntitiesWithWorld(player = null) {
    const existingById = new Map();
    for (const ent of this.entities) {
      existingById.set(ent.companionId, ent);
    }

    const evo = this._getEvo();
    const px = Number.isFinite(player?.x) ? player.x : 360;
    const py = clampNum(Number.isFinite(player?.groundY) ? player.groundY : 561, 475, 645);
    const pFacing = (player?.facing || 1) < 0 ? -1 : 1;
    const bounds = this.manager?.getActiveStageBounds?.() || null;

    const keptIds = new Set();
    const nextEntities = [];
    const newlyCreated = [];
    for (let i = 0; i < this.activeSlots.length && nextEntities.length < ENDLESS_MAX_ACTIVE_SLOTS; i++) {
      const id = this.normalizeId(this.activeSlots[i]);
      const cfg = ROSTER_BY_ID[id];
      const st = this.rosterState[id];
      if (!cfg || !st?.unlocked) continue;

      keptIds.add(id);
      const level = Math.max(1, Math.floor(Number(st.level) || 1));
      const starInfo = this._getStarInfo(id);
      const activeHeroKey = this._resolveActiveHeroKey(cfg);
      let ent = existingById.get(id);
      if (ent) {
        const prevStar = ent.star || 1;
        ent._squad = this;
        ent.level = level;
        ent.slotIndex = i;
        ent.star = starInfo.star;
        ent.auraTier = starInfo.auraTier || getAuraTier(starInfo.star);
        ent.isExForm = true;
        ent.isExEvolved = true;
        if (activeHeroKey && ent.heroId !== activeHeroKey) {
          ent.heroId = activeHeroKey;
          ent.isEx = true;
          safeEnsureHeroLoaded(activeHeroKey);
          ent.triggerAuraRing('buff', 1.45);
        } else if (starInfo.star > prevStar && starInfo.star >= 3) {
          ent.triggerAuraRing('buff', 1.45);
        }
        this.vfx?.preload?.(activeHeroKey);
        if (bounds && Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX)) {
          ent.x = clampNum(ent.x, bounds.minX + 28, bounds.maxX - 28);
        }
        nextEntities.push(ent);
      } else {
        const slotOff = evo && typeof evo.getSlotOffset === 'function' ? evo.getSlotOffset(i) : null;
        const offsetX =
          slotOff && Number.isFinite(slotOff.dx)
            ? slotOff.dx
            : SPAWN_X_OFFSETS[i % SPAWN_X_OFFSETS.length];
        let spawnX = px + offsetX * pFacing;
        if (bounds && Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX)) {
          spawnX = clampNum(spawnX, bounds.minX + 36, bounds.maxX - 36);
        }
        const rawSpawnY =
          slotOff && Number.isFinite(slotOff.dy)
            ? py + slotOff.dy
            : SPAWN_LANE_Y[i % SPAWN_LANE_Y.length];
        const spawnY = clampNum(rawSpawnY, 475, 645);
        ent = new EndlessCompanionEntity(cfg, {
          x: spawnX,
          groundY: spawnY,
          facing: pFacing,
          level,
          slotIndex: i,
          heroKey: activeHeroKey,
          star: starInfo.star,
          isExEvolved: true
        });
        ent.auraTier = starInfo.auraTier || getAuraTier(starInfo.star);
        ent._squad = this;
        ent.triggerAuraRing('summon', 1.35);
        safeEnsureHeroLoaded(activeHeroKey);
        this.vfx?.preload?.(activeHeroKey);
        nextEntities.push(ent);
        newlyCreated.push(ent);
      }
    }

    if (newlyCreated.length > 0 && this.ai && typeof this.ai.computeFormationAnchors === 'function') {
      const minLaneY = Math.max(475, (this.manager?.depthMinY || 442) + 33);
      const maxLaneY = Math.min(645, (this.manager?.depthMaxY || 680) - 35);
      const anchors = this.ai.computeFormationAnchors(
        nextEntities,
        player,
        this._getFormationOffsets(evo),
        { minX: bounds?.minX, maxX: bounds?.maxX, minLaneY, maxLaneY },
        0
      );
      for (const created of newlyCreated) {
        const anc = anchors.get(created);
        if (!anc) continue;
        created.x = anc.x;
        created.groundY = created.isRanged ? anc.independentLaneY : anc.y;
        created.y = created.groundY;
        created.facing = anc.squadFacing || pFacing;
      }
    }

    let removedAny = false;
    for (const [oldId, oldEnt] of existingById.entries()) {
      if (!keptIds.has(oldId) && oldEnt) {
        removedAny = true;
        if (Array.isArray(oldEnt.activeProjectiles)) oldEnt.activeProjectiles.length = 0;
        if (Array.isArray(oldEnt.activeStrikes)) oldEnt.activeStrikes.length = 0;
        oldEnt.targetMonster = null;
        oldEnt._pendingRoleUlt = null;
      }
    }

    this.entities = nextEntities;
    if (this._overheadLayoutMap) {
      this._overheadLayoutMap.clear();
      this._overheadCacheTime = -1;
    }

    if (removedAny) {
      const activeHeroKeys = nextEntities.map((e) => e.heroId).filter(Boolean);
      const playerHeroKey = player?.heroId || this.manager?.game?.slot1Hero || null;
      const keepAll = playerHeroKey ? [playerHeroKey, ...activeHeroKeys] : activeHeroKeys;
      this.vfx?.pruneInactiveSheets?.(keepAll);
      try {
        PixelForge.releaseInactiveAssets?.(keepAll, [], true);
      } catch {
        // ignore in headless/test environments
      }
    }
    return this.entities;
  }

  getActiveEntities() {
    return this.entities;
  }

  getActiveHeroKeys() {
    const keys = [];
    for (const rawId of this.activeSlots) {
      const cfg = ROSTER_BY_ID[this.normalizeId(rawId)];
      if (cfg) keys.push(this._resolveActiveHeroKey(cfg));
    }
    return keys;
  }

  getPartyBuffs() {
    return {
      damageReduction: this.activeBuffTimers.shieldTimer > 0 ? 0.16 : 0,
      hasteBonus: this.activeBuffTimers.hasteTimer > 0 ? 0.20 : 0
    };
  }

  _spawnFloorRipple(x, y, kind = 'buff', maxAge = 0.72, scaleMult = 1.0) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    while (this._floorRipples.length >= FLOOR_RIPPLE_MAX_COUNT) {
      this._floorRipples.shift();
    }
    this._floorRipples.push({
      x: Math.round(x),
      y: Math.round(y),
      kind,
      age: 0,
      maxAge: clampNum(Number(maxAge) || 0.72, 0.25, 4.0),
      scaleMult: clampNum(Number(scaleMult) || 1.0, 0.35, 3.0)
    });
  }

  _spawnStrikeFX(entity, kind, x, y, color, facing = 1, maxAge = 0.26, scale = 1) {
    if (!entity || !Array.isArray(entity.activeStrikes)) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    while (entity.activeStrikes.length >= COMPANION_STRIKES_MAX_COUNT) {
      entity.activeStrikes.shift();
    }
    entity.activeStrikes.push({
      kind,
      x: Math.round(x),
      y: Math.round(y),
      color: color || entity.primaryColor,
      facing: facing < 0 ? -1 : 1,
      age: 0,
      maxAge: clampNum(Number(maxAge) || 0.26, 0.1, 3.0),
      scale: clampNum(Number(scale) || 1, 0.35, 3.0)
    });
  }

  _spawnProjectile(entity, target, dmg, isCrit, opts = {}) {
    if (!entity || !Array.isArray(entity.activeProjectiles)) return;
    while (entity.activeProjectiles.length >= COMPANION_PROJECTILES_MAX_COUNT) {
      const evicted = entity.activeProjectiles.shift();
      if (evicted) evicted.target = null;
    }
    const startX = (Number.isFinite(entity.x) ? entity.x : 260) + entity.facing * 28;
    const startY = (Number.isFinite(entity.y) ? entity.y : entity.groundY || 558) - 76;
    const targetX = Number.isFinite(target?.x) ? target.x : startX + entity.facing * 260;
    const targetY = (Number.isFinite(target?.groundY) ? target.groundY : entity.groundY) - 68;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = clampNum(Number(opts.speed) || 760, 120, 2200);

    entity.activeProjectiles.push({
      x: startX,
      y: startY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      target,
      dmg: safeBoundedInt(dmg, 1, ENDLESS_COMPANION_MAX_STAT),
      isCrit: Boolean(isCrit),
      knockX: Number.isFinite(opts.knockX) ? opts.knockX : 42,
      color: opts.color || entity.primaryColor,
      coreColor: opts.coreColor || '#ffffff',
      style: opts.style || 'bolt',
      splashRadius: opts.splashRadius || 0,
      fromUlt: Boolean(opts.fromUlt),
      overdriveGain: Number.isFinite(Number(opts.overdriveGain)) ? Number(opts.overdriveGain) : 0,
      life: 0,
      maxLife: clampNum(Number(opts.maxLife) || 0.85, 0.15, 3.0)
    });
  }

  _spawnUltEffect(effect, multOverride = null) {
    if (!effect) return;
    while (this._ultEffects.length >= ULT_EFFECTS_MAX_COUNT) {
      this._ultEffects.shift();
    }
    const vfxMult = clampNum(
      multOverride !== null && multOverride !== undefined && Number.isFinite(Number(multOverride))
        ? Number(multOverride)
        : Number(this._activeUltVfxMult) || 1.0,
      1.0,
      2.2
    );
    const sizeGrow = 1 + (vfxMult - 1) * 0.58;
    const ageGrow = 1 + (vfxMult - 1) * 0.22;
    const next = {
      age: 0,
      ...effect,
      ultVfxMult: vfxMult
    };
    next.maxAge = clampNum((Number(effect.maxAge) || 0.72) * ageGrow, 0.25, 4.0);
    if (Number.isFinite(Number(effect.scale))) {
      next.scale = Math.round(Number(effect.scale) * sizeGrow * 100) / 100;
    }
    if (Number.isFinite(Number(effect.width))) {
      next.width = Math.round(Number(effect.width) * sizeGrow);
    }
    if (Number.isFinite(Number(effect.thickness))) {
      next.thickness = Math.round(Number(effect.thickness) * sizeGrow);
    }
    if (Number.isFinite(Number(effect.span))) {
      next.span = Math.round(Number(effect.span) * sizeGrow);
    }
    this._ultEffects.push(next);
  }

  _applyCompanionDamage(entity, target, rawDmg, isCrit, knockX, economy, game, opts = {}) {
    if (!target || target.isDead) return 0;
    if (Number.isFinite(target.hp) && target.hp <= 0) return 0;

    const dmg = safeBoundedInt(rawDmg, 1, ENDLESS_COMPANION_MAX_STAT);
    const prevHp = Number.isFinite(target.hp) ? target.hp : dmg;

    // Detect real Monster.takeDamage -> EndlessManager.progression.onPlayerHitMonster path
    const willProgRecord = Boolean(
      typeof target.takeDamage === 'function' &&
        typeof target.spawnElementalDeathBurst === 'function' &&
        target.game?.isAdventureMode?.() &&
        typeof target.game?.adventure?.progression?.onPlayerHitMonster === 'function'
    );
    const recordDirectly = Boolean(economy && typeof economy.recordDamageSample === 'function');

    if (typeof target.takeDamage === 'function') {
      const prevRecordedFlag = Boolean(entity._companionDpsAlreadyRecorded);
      if (recordDirectly && willProgRecord) {
        entity._companionDpsAlreadyRecorded = true;
      }
      try {
        target.takeDamage(dmg, entity, Boolean(isCrit), knockX, 0);
      } finally {
        entity._companionDpsAlreadyRecorded = prevRecordedFlag;
      }
    } else {
      target.hp = Math.max(0, prevHp - dmg);
      if (target.hp <= 0) {
        target.isDead = true;
      }
    }

    let dealt = Number.isFinite(target.hp) ? Math.max(0, prevHp - target.hp) : dmg;
    dealt = safeBoundedInt(dealt, 0, ENDLESS_COMPANION_MAX_STAT, 0);

    if (dealt > 0) {
      if (recordDirectly) {
        economy.recordDamageSample('companion', dealt);
      }
      if (!opts.skipEntityStats && entity?.stats) {
        entity.stats.damageDealt = safeBoundedInt(
          (entity.stats.damageDealt || 0) + dealt,
          0,
          ENDLESS_COMPANION_MAX_STAT,
          0
        );
        if (isCrit) entity.stats.critsLanded += 1;
        if (dealt > entity.stats.biggestHit) entity.stats.biggestHit = dealt;
      }

      if (!opts.fromUlt && !entity.isCastingUlt) {
        const gaugeMult = clampNum(Number(opts.gaugeMult) || 1, 0.5, 25);
        entity.ultCharge = clampNum(
          entity.ultCharge + (isCrit ? 9.5 : 6.5) * gaugeMult,
          0,
          100
        );
        const odGain = Number(opts.overdriveGain) || 0;
        if (odGain > 0) {
          this._getEvo()?.addOverdriveCharge?.(odGain, this.activeSlots.length);
        }
      }

      if (!willProgRecord && game?.vfx?.spawnDamageText) {
        game.vfx.spawnDamageText(
          target.x,
          (target.y || target.groundY || entity.groundY) - 148,
          dealt,
          Boolean(isCrit)
        );
      }
    }

    return dealt;
  }

  _isBossTarget(monster) {
    return Boolean(monster && (monster.isBoss || monster.isMiniBoss || monster.isColossalBoss));
  }

  _scaleHit(baseDmg, target, stats, forceCrit = false, economy = null) {
    const safeBase = safeBoundedFloat(baseDmg, 1, ENDLESS_COMPANION_MAX_STAT, 1);
    const synMods = this.getPartySynergyModifiers();
    const extMod = economy?._externalModifiers;
    const extCritChance = Number.isFinite(Number(extMod?.critChanceBonus)) ? Number(extMod.critChanceBonus) : 0;
    const extCritDmg = Number.isFinite(Number(extMod?.critDmgMult)) ? Number(extMod.critDmgMult) : 1;
    const extraCritBonus =
      synMods.critBonus > 0 && extCritChance < synMods.critBonus - 0.0001 ? synMods.critBonus : 0;
    const extraCritDmgMult =
      synMods.critDmgMult > 1.0001 && extCritDmg < synMods.critDmgMult - 0.0001
        ? synMods.critDmgMult
        : 1.0;

    const feverMult = safeBoundedFloat(stats?.feverDmgMult, 1, 100, 1);
    const bossMult = this._isBossTarget(target) ? safeBoundedFloat(stats?.bossDmgMult, 1, 1e6, 1) : 1;
    const critChance = clampNum((Number(stats?.critChance) || 0.08) + extraCritBonus, 0, 0.85);
    const rawCritMult = Number(stats?.critMult);
    const baseCritMult = Number.isFinite(rawCritMult) && rawCritMult > 0 ? rawCritMult : 1.5;
    const critMult = safeBoundedFloat(baseCritMult * extraCritDmgMult, 1.25, 1e4, 1.5);
    const isCrit = forceCrit || Math.random() < critChance;
    const total = safeBoundedInt(safeBase * feverMult * bossMult * (isCrit ? critMult : 1), 1, ENDLESS_COMPANION_MAX_STAT);
    return { dmg: total, isCrit };
  }

  _getFormationOffsets(evo) {
    if (!evo) return null;
    const form = typeof evo.getFormation === 'function' ? evo.getFormation() : null;
    if (Array.isArray(form?.slotOffsets) && form.slotOffsets.length > 0) {
      return form.slotOffsets;
    }
    if (typeof evo.getSlotOffset === 'function') {
      const list = [];
      for (let i = 0; i < ENDLESS_MAX_ACTIVE_SLOTS; i++) {
        const off = evo.getSlotOffset(i);
        if (off && Number.isFinite(off.dx) && Number.isFinite(off.dy)) {
          list.push(off);
        }
      }
      if (list.length > 0) return list;
    }
    return null;
  }

  _findTarget(entity, player, aliveMonsters) {
    if (!entity || !Array.isArray(aliveMonsters) || !aliveMonsters.length) return null;
    if (this.ai && typeof this.ai.assignSquadTargets === 'function') {
      return this.ai.assignSquadTargets([entity], player, aliveMonsters, 0).get(entity) || null;
    }
    const refX = Number.isFinite(player?.x) ? player.x : entity.x;
    let best = null;
    let bestScore = Infinity;

    for (const m of aliveMonsters) {
      const mx = Number.isFinite(m.x) ? m.x : refX;
      const my = Number.isFinite(m.groundY) ? m.groundY : Number.isFinite(m.y) ? m.y : 561;
      const dxComp = Math.abs(mx - entity.x);
      const dxPlayer = Math.abs(mx - refX);
      if (dxComp > COMPANION_ENGAGE_RANGE && dxPlayer > COMPANION_ENGAGE_RANGE) continue;
      const dy = Math.abs(my - entity.groundY);
      const score = dxComp + dy * 0.45 - (this._isBossTarget(m) ? 35 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }

    return best;
  }

  _executeRoleSkill(entity, player, target, aliveMonsters, power, stats, economy, game) {
    const role = entity.role;
    const tx = Number.isFinite(target?.x) ? target.x : entity.x + entity.facing * 140;
    const ty = Number.isFinite(target?.groundY) ? target.groundY : entity.groundY;
    const gaugeMult = Math.max(0.5, Number(stats?.gaugeGainMult) || 1);

    if (!entity.isCastingUlt) {
      entity.ultCharge = clampNum(entity.ultCharge + 18 * gaugeMult, 0, 100);
    }
    this._getEvo()?.addOverdriveCharge?.(14, this.activeSlots.length);
    entity.triggerCallout(entity.cfg.abilityName, entity.primaryColor, 1.15, false);
    this._playSkillSfx(role, tx, game);

    if (role === 'TANK') {
      // Aethelgard: AEGIS BASTION - party shield + nearby monster taunt & bastion shockwave
      this.activeBuffTimers.shieldTimer = Math.max(this.activeBuffTimers.shieldTimer, 5.5);
      entity.triggerAuraRing('buff', 1.45);
      if (player) {
        this._spawnFloorRipple(player.x, player.groundY || 561, 'buff', 1.15, 1.12);
      }

      const hitTargets = [];
      for (const m of aliveMonsters) {
        const dx = Math.abs((m.x || 0) - entity.x);
        const dy = Math.abs((m.groundY || m.y || 561) - entity.groundY);
        if (dx <= 270 && dy <= 145) {
          hitTargets.push(m);
          m._tauntedTimer = Math.max(m._tauntedTimer || 0, 3.5);
          m._tauntTarget = entity;
          if (!m.isColossalBoss && Math.abs((m.x || 0) - entity.x) > 12) {
            m.facing = entity.x >= m.x ? 1 : -1;
          }
          const hit = this._scaleHit(power.skillDmg * 0.85, m, stats, false, economy);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 55, economy, game, { gaugeMult });
          if (typeof m.addStagger === 'function') {
            m.addStagger(22, entity, game);
          }
        }
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: hitTargets.length > 0 ? hitTargets : target ? [target] : [],
        tx: entity.x,
        ty: entity.groundY,
        scaleMult: 1.0
      });
      return;
    }

    if (role === 'HEALER') {
      // Seraphina: SERAPHIC MEND - restores hero HP + radiant smite burst
      entity.triggerAuraRing('heal', 1.5);
      if (player && !player.isDead && Number.isFinite(player.hp) && Number.isFinite(player.maxHp)) {
        const pctFloor = Math.round(player.maxHp * 0.14);
        const healAmt = Math.max(power.healAmount, pctFloor);
        const before = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        const actualHeal = Math.max(0, Math.round(player.hp - before));
        this._spawnFloorRipple(player.x, player.groundY || 561, 'heal', 1.25, 1.18);
        if (actualHeal > 0 && game?.vfx?.spawnDamageText) {
          game.vfx.spawnDamageText(
            player.x,
            (player.y || player.groundY || 561) - 178,
            0,
            false,
            `+${actualHeal} MEND`,
            '#4ade80'
          );
        }
      }
      if (target) {
        const hit = this._scaleHit(power.skillDmg, target, stats, false, economy);
        this._applyCompanionDamage(entity, target, hit.dmg, hit.isCrit, 48, economy, game, { gaugeMult });
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: target ? [target] : [],
        tx,
        ty,
        scaleMult: 1.0
      });
      return;
    }

    if (role === 'BLASTER') {
      // Ignis Sol: SOLAR FLARE - scorching AoE flame burst across monster pack
      entity.triggerAuraRing('buff', 1.15);
      this._spawnFloorRipple(tx, ty, 'buff', 0.8, 1.25);

      const hitTargets = [];
      let hitCount = 0;
      for (const m of aliveMonsters) {
        if (hitCount >= 6) break;
        const dx = Math.abs((m.x || 0) - tx);
        const dy = Math.abs((m.groundY || m.y || 561) - ty);
        if (m === target || (dx <= 215 && dy <= 130)) {
          hitTargets.push(m);
          const splashMult = m === target ? 1.0 : 0.82;
          const hit = this._scaleHit(power.skillDmg * splashMult, m, stats, false, economy);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 72, economy, game, { gaugeMult });
          hitCount++;
        }
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: hitTargets.length > 0 ? hitTargets : target ? [target] : [],
        tx,
        ty,
        scaleMult: 1.05
      });
      return;
    }

    if (role === 'ARCHER') {
      // Sylvanis: STARFALL VOLLEY - 3-bolt piercing salvo across up to 3 targets
      entity.triggerAuraRing('buff', 1.05);
      const sortedTargets = [...aliveMonsters].sort((a, b) => {
        const da = Math.abs((a.x || 0) - entity.x);
        const db = Math.abs((b.x || 0) - entity.x);
        return da - db;
      });
      const salvoTargets = sortedTargets.length > 0 ? sortedTargets : target ? [target] : [];
      if (salvoTargets.length > 0) {
        for (let i = 0; i < 3; i++) {
          const tMon = salvoTargets[i % salvoTargets.length];
          const hit = this._scaleHit(power.skillDmg * 0.46, tMon, stats, i === 2, economy);
          this._spawnProjectile(entity, tMon, hit.dmg, hit.isCrit, {
            speed: 880 + i * 55,
            color: '#34d399',
            coreColor: '#fef08a',
            style: 'arrow',
            knockX: 38
          });
        }
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: salvoTargets.slice(0, 3),
        tx,
        ty,
        scaleMult: 1.0
      });
      return;
    }

    if (role === 'LANCER') {
      // Freyja: VALKYRIE DIVE - lunging sky-lance thrust with heavy boss stagger
      entity.triggerAuraRing('buff', 1.15);
      if (target) {
        const lungeDist = clampNum((tx - entity.x) * 0.45, -110, 110);
        entity.x += lungeDist;
        entity.groundY = clampNum(entity.groundY + (ty - entity.groundY) * 0.5, 465, 655);
        entity.y = entity.groundY;
        const hit = this._scaleHit(power.skillDmg, target, stats, false, economy);
        this._applyCompanionDamage(entity, target, hit.dmg, hit.isCrit, 110, economy, game, { gaugeMult });
        if (typeof target.addStagger === 'function') {
          target.addStagger(55, entity, game);
        } else if (!this._isBossTarget(target)) {
          target.stunTimer = Math.max(target.stunTimer || 0, 0.45);
        }
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: target ? [target] : [],
        tx,
        ty,
        scaleMult: 1.05
      });
      return;
    }

    if (role === 'STRIKER') {
      // Kaze-Maru: IAIDO FLASH - guaranteed-crit rapid 3-slash single-target shredder
      entity.triggerAuraRing('buff', 1.05);
      if (target) {
        const dashDx = clampNum((tx - entity.x) * 0.55, -135, 135);
        entity.x += dashDx;
        entity.groundY = clampNum(ty, 465, 655);
        entity.y = entity.groundY;
        for (let s = 0; s < 3; s++) {
          const hit = this._scaleHit(power.skillDmg * 0.42, target, stats, true, economy);
          this._applyCompanionDamage(entity, target, hit.dmg, true, s === 2 ? 90 : 28, economy, game, { gaugeMult });
        }
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: target ? [target] : [],
        tx,
        ty,
        scaleMult: 1.05
      });
      return;
    }

    if (role === 'WEAVER') {
      // Chronos: CHRONO HASTE - temporal slow field on monsters + party haste acceleration
      this.activeBuffTimers.hasteTimer = Math.max(this.activeBuffTimers.hasteTimer, 6.0);
      entity.triggerAuraRing('buff', 1.45);
      if (player) {
        this._spawnFloorRipple(player.x, player.groundY || 561, 'buff', 1.2, 1.15);
      }
      this._spawnFloorRipple(tx, ty, 'summon', 1.1, 1.35);

      const hitTargets = [];
      for (const m of aliveMonsters) {
        const dx = Math.abs((m.x || 0) - entity.x);
        if (dx <= 440) {
          hitTargets.push(m);
          m._chillTimer = Math.max(m._chillTimer || 0, 4.5);
          const hit = this._scaleHit(power.skillDmg * 0.72, m, stats, false, economy);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 35, economy, game, { gaugeMult });
        }
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: hitTargets.length > 0 ? hitTargets : target ? [target] : [],
        tx,
        ty,
        scaleMult: 1.0
      });
      return;
    }

    if (role === 'ASSASSIN') {
      // Nyx EX: VOID PHANTOM - shadow blink + 3 guaranteed-crit phantom slashes
      entity.triggerAuraRing('buff', 1.15);
      if (target) {
        const dashDx = clampNum((tx - entity.x) * 0.65, -165, 165);
        entity.x += dashDx;
        entity.groundY = clampNum(ty, 465, 655);
        entity.y = entity.groundY;
        for (let s = 0; s < 3; s++) {
          const hit = this._scaleHit(power.skillDmg * 0.44, target, stats, true, economy);
          this._applyCompanionDamage(entity, target, hit.dmg, true, s === 2 ? 84 : 26, economy, game, { gaugeMult });
        }
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: target ? [target] : [],
        tx,
        ty,
        scaleMult: 1.05
      });
      return;
    }

    if (role === 'REAPER') {
      // Malakor EX: SOUL SCYTHE - crimson reaping cleave + hero soul siphon heal
      entity.triggerAuraRing('buff', 1.25);
      const hitTargets = [];
      let cleaved = 0;
      for (const m of aliveMonsters) {
        if (cleaved >= 6) break;
        const dx = Math.abs((m.x || 0) - tx);
        const dy = Math.abs((m.groundY || m.y || 561) - ty);
        if (m === target || (dx <= 230 && dy <= 135)) {
          hitTargets.push(m);
          const hit = this._scaleHit(power.skillDmg * (m === target ? 1.0 : 0.84), m, stats, m === target, economy);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 82, economy, game, { gaugeMult });
          cleaved++;
        }
      }
      if (cleaved > 0 && player && !player.isDead && Number.isFinite(player.hp) && Number.isFinite(player.maxHp)) {
        const healAmt = Math.max(20, Math.round(player.maxHp * 0.06));
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: hitTargets.length > 0 ? hitTargets : target ? [target] : [],
        tx,
        ty,
        scaleMult: 1.1
      });
      return;
    }

    if (role === 'CRYO MAGE') {
      // Lyra EX: GLACIAL SPIRE - chilling cryo burst freezing monster pack
      entity.triggerAuraRing('buff', 1.2);
      this._spawnFloorRipple(tx, ty, 'summon', 0.9, 1.3);
      const hitTargets = [];
      let hitCount = 0;
      for (const m of aliveMonsters) {
        if (hitCount >= 7) break;
        const dx = Math.abs((m.x || 0) - tx);
        const dy = Math.abs((m.groundY || m.y || 561) - ty);
        if (m === target || (dx <= 235 && dy <= 135)) {
          hitTargets.push(m);
          m._chillTimer = Math.max(m._chillTimer || 0, 4.5);
          const hit = this._scaleHit(power.skillDmg * (m === target ? 1.0 : 0.84), m, stats, false, economy);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 62, economy, game, { gaugeMult });
          hitCount++;
        }
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: hitTargets.length > 0 ? hitTargets : target ? [target] : [],
        tx,
        ty,
        scaleMult: 1.05
      });
      return;
    }

    if (role === 'VANGUARD') {
      // Aegis-09 EX: ORBITAL FUNNELS - 4-bolt high-velocity cybernetic salvo
      entity.triggerAuraRing('buff', 1.2);
      const sortedTargets = [...aliveMonsters].sort((a, b) => {
        const da = Math.abs((a.x || 0) - entity.x);
        const db = Math.abs((b.x || 0) - entity.x);
        return da - db;
      });
      const salvoTargets = sortedTargets.length > 0 ? sortedTargets : target ? [target] : [];
      for (let i = 0; i < 4 && salvoTargets.length > 0; i++) {
        const tMon = salvoTargets[i % salvoTargets.length];
        const hit = this._scaleHit(power.skillDmg * 0.42, tMon, stats, i === 3, economy);
        this._spawnProjectile(entity, tMon, hit.dmg, hit.isCrit, {
          speed: 920 + i * 50,
          color: i % 2 === 0 ? '#22d3ee' : '#facc15',
          coreColor: '#ffffff',
          style: 'bolt',
          knockX: 46
        });
      }
      this.vfx?.spawnRoleSkill?.(entity, {
        player,
        target,
        targets: salvoTargets.slice(0, 4),
        tx,
        ty,
        scaleMult: 1.0
      });
      return;
    }

    // BRAWLER (Raijin EX): THUNDER BARRAGE - lightning-fist shockwave barrage
    entity.triggerAuraRing('buff', 1.2);
    const hitTargets = [];
    for (const m of aliveMonsters) {
      const dx = Math.abs((m.x || 0) - tx);
      const dy = Math.abs((m.groundY || m.y || 561) - ty);
      if (m === target || (dx <= 200 && dy <= 125)) {
        hitTargets.push(m);
        const hit = this._scaleHit(power.skillDmg * (m === target ? 1.0 : 0.78), m, stats, false, economy);
        this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 88, economy, game, { gaugeMult });
        if (typeof m.addStagger === 'function') {
          m.addStagger(36, entity, game);
        }
      }
    }
    this.vfx?.spawnRoleSkill?.(entity, {
      player,
      target,
      targets: hitTargets.length > 0 ? hitTargets : target ? [target] : [],
      tx,
      ty,
      scaleMult: 1.05
    });
  }

  _beginRoleUltimate(entity, player, leadTarget, aliveMonsters, _power, _stats, _economy, game) {
    if (!entity || !Array.isArray(aliveMonsters) || !aliveMonsters.length) return false;

    const cfg = entity.cfg || ROSTER_BY_ID[entity.companionId] || {};
    const role = entity.role;
    const target = leadTarget && isTargetAlive(leadTarget) ? leadTarget : aliveMonsters[0];
    const tx = Number.isFinite(target?.x) ? target.x : entity.x + entity.facing * 180;
    const ty = Number.isFinite(target?.groundY) ? target.groundY : entity.groundY;
    const ultColor = cfg.ultColor || entity.primaryColor || '#facc15';
    const callout = cfg.ultName || `${entity.name} OVERDRIVE!`;
    const auraTier = getAuraTier(entity.star);
    const ultVfxMult = clampNum(Number(auraTier?.ultVfxMult) || 1.0, 1.0, 2.2);

    if (Math.abs(tx - entity.x) > 4) {
      entity.facing = tx >= entity.x ? 1 : -1;
    }

    entity.ultCharge = 0;
    entity.ultFlashTimer = ULT_FLASH_DURATION;
    entity.isCastingUlt = true;
    entity._castingUltState = true;
    entity.setState('ULTIMATE', true);
    entity.didSkillHit = true;

    this._getEvo()?.addOverdriveCharge?.(14, this.activeSlots.length);
    entity.triggerAuraRing(role === 'HEALER' ? 'heal' : 'buff', 1.45);
    entity.triggerCallout(callout, ultColor, 1.55, true);

    game?.audio?.play?.('ult_cast', entity.x);
    this.vfx?.spawnUltCastAura?.(entity, { ultVfxMult });

    entity._pendingRoleUlt = {
      target,
      tx,
      ty,
      ultVfxMult,
      resolved: false
    };
    return true;
  }

  _executeRoleUltimateImpact(entity, player, leadTarget, aliveMonsters, power, stats, economy, game, opts = {}) {
    if (!entity) return 0;

    const living = Array.isArray(aliveMonsters) ? aliveMonsters.filter(isTargetAlive) : [];
    const cfg = entity.cfg || ROSTER_BY_ID[entity.companionId] || {};
    const role = entity.role;
    const fallbackTx = Number.isFinite(opts.fallbackTx) ? opts.fallbackTx : entity.x + entity.facing * 180;
    const fallbackTy = Number.isFinite(opts.fallbackTy) ? opts.fallbackTy : entity.groundY;

    let target = leadTarget && isTargetAlive(leadTarget) ? leadTarget : null;
    if (!target && living.length > 0) {
      // Cleanly retarget to the nearest living foe if original target died during the 0.42s wind-up
      let bestDist = Infinity;
      for (const m of living) {
        const d = Math.abs((m.x || 0) - fallbackTx) + Math.abs((m.groundY || m.y || fallbackTy) - fallbackTy) * 0.35;
        if (d < bestDist) {
          bestDist = d;
          target = m;
        }
      }
    }

    const tx = Number.isFinite(target?.x) ? target.x : fallbackTx;
    const ty = Number.isFinite(target?.groundY) ? target.groundY : fallbackTy;
    if (Math.abs(tx - entity.x) > 4) {
      entity.facing = tx >= entity.x ? 1 : -1;
    }

    if (cfg.ultSfx && cfg.ultSfx !== 'ult_cast') {
      game?.audio?.play?.(cfg.ultSfx, tx);
    }

    const sortedTargets = [...living].sort((a, b) => {
      const da = Math.abs((a.x || 0) - tx) + Math.abs((a.groundY || a.y || 561) - ty) * 0.3;
      const db = Math.abs((b.x || 0) - tx) + Math.abs((b.groundY || b.y || 561) - ty) * 0.3;
      return da - db;
    });

    const baseUltDmg = safeBoundedInt(
      power?.ultDmg || Math.round((power?.skillDmg || 10) * 2.1),
      4,
      ENDLESS_COMPANION_MAX_STAT
    );
    let totalDealt = 0;
    const auraTier = getAuraTier(entity.star);
    const ultVfxMult = clampNum(
      Number.isFinite(Number(opts.ultVfxMult)) ? Number(opts.ultVfxMult) : Number(auraTier?.ultVfxMult) || 1.0,
      1.0,
      2.2
    );
    const affectedTargets = [];

    if (role === 'TANK') {
      // Aethelgard: AEGIS CATACLYSM! - fortress shield + bastion shatter across lane
      this.activeBuffTimers.shieldTimer = Math.max(this.activeBuffTimers.shieldTimer, 7.5);
      if (player) {
        this._spawnFloorRipple(player.x, player.groundY || 561, 'buff', 1.35, 1.35);
      }
      this._spawnFloorRipple(tx, ty, 'summon', 1.15, 1.55);

      const targets = sortedTargets.slice(0, 8);
      for (const m of targets) {
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 640) continue;
        affectedTargets.push(m);
        m._tauntedTimer = Math.max(m._tauntedTimer || 0, 5.5);
        m._tauntTarget = entity;
        const mult = m === target ? 1.0 : 0.84;
        const hit = this._scaleHit(baseUltDmg * mult, m, stats, m === target, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 125, economy, game, {
          fromUlt: true
        });
        if (typeof m.addStagger === 'function') {
          m.addStagger(85, entity, game);
        }
      }
    } else if (role === 'HEALER') {
      // Seraphina: SERAPHIC NOVA! - massive hero sanctuary heal + celestial judgment across battlefield
      if (player && !player.isDead && Number.isFinite(player.hp) && Number.isFinite(player.maxHp)) {
        const pctHeal = Math.round(player.maxHp * 0.32);
        const healAmt = Math.max(Math.round((power?.healAmount || 60) * 2.2), pctHeal);
        const before = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        const actualHeal = Math.max(0, Math.round(player.hp - before));
        this._spawnFloorRipple(player.x, player.groundY || 561, 'heal', 1.45, 1.48);
        if (actualHeal > 0 && game?.vfx?.spawnDamageText) {
          game.vfx.spawnDamageText(
            player.x,
            (player.y || player.groundY || 561) - 186,
            0,
            false,
            `+${actualHeal} NOVA`,
            '#4ade80'
          );
        }
      }

      const targets = sortedTargets.slice(0, 8);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 720) continue;
        affectedTargets.push(m);
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.0 : 0.82), m, stats, i === 0, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 82, economy, game, {
          fromUlt: true
        });
      }
    } else if (role === 'BLASTER') {
      // Ignis Sol: SOLAR APOCALYPSE! - scorching solar cataclysm across monster pack
      this._spawnFloorRipple(tx, ty, 'buff', 1.05, 1.45);
      const targets = sortedTargets.slice(0, 10);
      for (const m of targets) {
        if (m !== target && Math.abs((m.x || 0) - tx) > 380) continue;
        affectedTargets.push(m);
        const mult = m === target ? 1.05 : 0.88;
        const hit = this._scaleHit(baseUltDmg * mult, m, stats, m === target, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 118, economy, game, {
          fromUlt: true
        });
      }
    } else if (role === 'ARCHER') {
      // Sylvanis: STARFALL VOLLEY! - piercing starlight volley + tracer arrows across all monsters
      const targets = sortedTargets.slice(0, 8);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 780) continue;
        affectedTargets.push(m);
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.0 : 0.82), m, stats, i < 2, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 68, economy, game, {
          fromUlt: true
        });
      }
      if (targets.length > 0) {
        for (let a = 0; a < Math.min(5, Math.max(3, targets.length)); a++) {
          const tMon = targets[a % targets.length];
          const boltHit = this._scaleHit(baseUltDmg * 0.22, tMon, stats, a === 0, economy);
          this._spawnProjectile(entity, tMon, boltHit.dmg, boltHit.isCrit, {
            speed: 980 + a * 60,
            color: '#34d399',
            coreColor: '#fef08a',
            style: 'arrow',
            knockX: 46,
            fromUlt: true
          });
        }
      }
    } else if (role === 'LANCER') {
      // Freyja: VALKYRIE VALHALLA! - sky-lance judgment & valkyrie shockwave across lane
      const targets = sortedTargets.slice(0, 8);
      for (const m of targets) {
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 660) continue;
        affectedTargets.push(m);
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.05 : 0.85), m, stats, m === target, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 145, economy, game, {
          fromUlt: true
        });
        if (typeof m.addStagger === 'function') {
          m.addStagger(110, entity, game);
        } else if (!this._isBossTarget(m)) {
          m.stunTimer = Math.max(m.stunTimer || 0, 0.75);
        }
      }
    } else if (role === 'STRIKER') {
      // Kaze-Maru: SHOGUN TEMPEST! - guaranteed-crit razor iaido cyclone
      const targets = sortedTargets.slice(0, 8);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 640) continue;
        affectedTargets.push(m);
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.05 : 0.82), m, stats, true, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, true, 108, economy, game, {
          fromUlt: true
        });
      }
    } else if (role === 'WEAVER') {
      // Chronos: CHRONO RIFT! - party overdrive haste + temporal rift freeze across lane
      this.activeBuffTimers.hasteTimer = Math.max(this.activeBuffTimers.hasteTimer, 8.5);
      if (player) {
        this._spawnFloorRipple(player.x, player.groundY || 561, 'buff', 1.4, 1.35);
      }
      this._spawnFloorRipple(tx, ty, 'summon', 1.35, 1.65);

      const targets = sortedTargets.slice(0, 10);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 740) continue;
        affectedTargets.push(m);
        m._chillTimer = Math.max(m._chillTimer || 0, 6.5);
        if (!this._isBossTarget(m)) {
          m.stunTimer = Math.max(m.stunTimer || 0, 0.7);
        }
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.0 : 0.82), m, stats, i === 0, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 65, economy, game, {
          fromUlt: true
        });
      }
    } else if (role === 'ASSASSIN') {
      // Nyx EX: ECLIPSE REQUIEM! - void cross-slash barrage across living foes
      const targets = sortedTargets.slice(0, 8);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 680) continue;
        affectedTargets.push(m);
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.08 : 0.85), m, stats, true, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, true, 112, economy, game, {
          fromUlt: true
        });
      }
    } else if (role === 'REAPER') {
      // Malakor EX: ABYSSAL HARVEST! - crimson soul cataclysm + hero siphon heal
      this._spawnFloorRipple(tx, ty, 'buff', 1.25, 1.55);
      const targets = sortedTargets.slice(0, 10);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 680) continue;
        affectedTargets.push(m);
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.08 : 0.86), m, stats, i < 2, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 124, economy, game, {
          fromUlt: true
        });
      }
      if (player && !player.isDead && Number.isFinite(player.hp) && Number.isFinite(player.maxHp)) {
        const healAmt = Math.max(40, Math.round(player.maxHp * 0.12));
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
      }
    } else if (role === 'CRYO MAGE') {
      // Lyra EX: ABSOLUTE ZERO! - glacial cataclysm + deep cryo freeze across lane
      this._spawnFloorRipple(tx, ty, 'summon', 1.1, 1.45);
      const targets = sortedTargets.slice(0, 10);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 740) continue;
        affectedTargets.push(m);
        m._chillTimer = Math.max(m._chillTimer || 0, 6.5);
        if (!this._isBossTarget(m)) {
          m.stunTimer = Math.max(m.stunTimer || 0, 0.85);
        }
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.05 : 0.86), m, stats, i < 2, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 96, economy, game, {
          fromUlt: true
        });
      }
    } else if (role === 'VANGUARD') {
      // Aegis-09 EX: OMEGA RAILCANNON! - orbital railcannon surge across lane
      const targets = sortedTargets.slice(0, 10);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 760) continue;
        affectedTargets.push(m);
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.1 : 0.88), m, stats, i < 2, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 140, economy, game, {
          fromUlt: true
        });
        if (typeof m.addStagger === 'function') {
          m.addStagger(115, entity, game);
        }
      }
    } else {
      // BRAWLER (Raijin EX): RAIJIN THUNDERCLAP! - cascading thunderclap barrage
      this._spawnFloorRipple(tx, ty, 'buff', 1.2, 1.55);
      const targets = sortedTargets.slice(0, 8);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 680) continue;
        affectedTargets.push(m);
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.05 : 0.86), m, stats, i < 2, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 132, economy, game, {
          fromUlt: true
        });
        if (typeof m.addStagger === 'function') {
          m.addStagger(95, entity, game);
        }
      }
    }

    this.vfx?.spawnRoleUltimate?.(entity, {
      player,
      target,
      targets: affectedTargets.length > 0 ? affectedTargets : sortedTargets.slice(0, 6),
      tx,
      ty,
      ultVfxMult,
      isSquadOverdrive: false
    });

    return totalDealt;
  }

  _triggerRoleUltimate(entity, player, leadTarget, aliveMonsters, power, stats, economy, game) {
    if (!this._beginRoleUltimate(entity, player, leadTarget, aliveMonsters, power, stats, economy, game)) {
      return 0;
    }
    const pending = entity._pendingRoleUlt;
    if (pending) pending.resolved = true;
    return this._executeRoleUltimateImpact(
      entity,
      player,
      pending?.target || leadTarget,
      aliveMonsters,
      power,
      stats,
      economy,
      game,
      {
        fallbackTx: pending?.tx,
        fallbackTy: pending?.ty,
        ultVfxMult: pending?.ultVfxMult
      }
    );
  }

  triggerSquadOverdrive(player = null, aliveMonsters = null, economy = null, game = null) {
    const evo = this._getEvo();
    const eco = economy || this.manager?.economy || null;
    const p = player || this.manager?.player || this.manager?.game?.leftFighter || null;
    const g = game || this.manager?._getEntityGameView?.() || this.manager?.game || null;

    if (
      this.activeSlots.length > 0 &&
      (this.entities.length !== this.activeSlots.length ||
        this.entities.some((e, idx) => e.companionId !== this.activeSlots[idx]))
    ) {
      this.syncEntitiesWithWorld(p);
    }

    const activeCount = this.entities.length > 0 ? this.entities.length : this.activeSlots.length;
    if (activeCount <= 0 || !evo || typeof evo.consumeOverdrive !== 'function') {
      return { ok: false, reason: 'no_companions', hitCount: 0, totalDamage: 0, activeCount: 0 };
    }

    const rawTargets = Array.isArray(aliveMonsters)
      ? aliveMonsters
      : this.manager?.getLivingMonsters?.() || [];
    const livingTargets = rawTargets.filter(
      (m) => m && !m.isDead && !(Number.isFinite(m.hp) && m.hp <= 0)
    );
    if (livingTargets.length === 0) {
      return {
        ok: false,
        reason: 'no_targets',
        hitCount: 0,
        totalDamage: 0,
        activeCount
      };
    }

    const consumed = evo.consumeOverdrive(activeCount);
    if (!consumed?.ok) {
      return {
        ok: false,
        reason: consumed?.reason || 'not_ready',
        hitCount: 0,
        totalDamage: 0,
        activeCount
      };
    }

    const burstMult = safeBoundedFloat(consumed.burstMult, 1.5, 50, 4.0);
    const stats = typeof eco?.getComputedStats === 'function' ? eco.getComputedStats() : null;
    const synMods = this.getPartySynergyModifiers();
    let combinedPartyDps = 0;
    const entityDpsShares = [];
    let totalEntityDps = 0;
    if (this.entities.length > 0) {
      for (const ent of this.entities) {
        const pow = this.computeCompanionPower(ent.companionId, ent.level, eco, stats, synMods);
        const dps = Math.max(1, Number(pow.dpsEstimate) || 0);
        combinedPartyDps += pow.dpsEstimate || 0;
        entityDpsShares.push(dps);
        totalEntityDps += dps;
      }
    } else {
      for (const rawId of this.activeSlots) {
        const id = this.normalizeId(rawId);
        const lv = Math.max(1, Math.floor(Number(this.rosterState[id]?.level) || 1));
        const pow = this.computeCompanionPower(id, lv, eco, stats, synMods);
        combinedPartyDps += pow.dpsEstimate || 0;
      }
    }
    combinedPartyDps = safeBoundedFloat(Math.max(40, combinedPartyDps), 40, ENDLESS_COMPANION_MAX_STAT, 40);
    const baseBurst = safeBoundedInt(burstMult * combinedPartyDps, 25, ENDLESS_COMPANION_MAX_STAT);

    const leadTarget = livingTargets[0] || null;
    const pFacing = (p?.facing || 1) < 0 ? -1 : 1;
    const fxOriginX = Number.isFinite(p?.x) ? p.x : this.entities[0]?.x || 360;
    const fxOriginY = Number.isFinite(p?.groundY) ? p.groundY : this.entities[0]?.groundY || 561;

    // Pick topmost ally (smallest groundY) to display the single crisp OVERDRIVE! plaque so labels never pile up
    let calloutLeaderIdx = 0;
    for (let i = 1; i < this.entities.length; i++) {
      const a = this.entities[i];
      const b = this.entities[calloutLeaderIdx];
      const ay = Number.isFinite(a?.groundY) ? a.groundY : 558;
      const by = Number.isFinite(b?.groundY) ? b.groundY : 558;
      if (ay < by) {
        calloutLeaderIdx = i;
      }
    }

    // Synchronize all deployed allies into heroic Row 4 ULTIMATE pose + authentic EX VFX bursts
    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      if (leadTarget && Math.abs((leadTarget.x || 0) - ent.x) > 4) {
        ent.facing = leadTarget.x >= ent.x ? 1 : -1;
      } else {
        ent.facing = pFacing;
      }
      ent.ultFlashTimer = Math.max(Number(ent.ultFlashTimer) || 0, 1.25);
      ent.isCastingUlt = true;
      ent._castingUltState = true;
      ent._pendingRoleUlt = null;
      ent.setState('ULTIMATE', true);
      ent.didSkillHit = true;
      ent.triggerAuraRing('buff', 1.55);
      if (i === calloutLeaderIdx) {
        ent.triggerCallout('OVERDRIVE!', '#facc15', 1.4, true);
      } else {
        ent.lastCallout = 'OVERDRIVE!';
        ent.calloutText = '';
        ent.calloutTimer = 0;
        ent.calloutIsUlt = false;
      }
    }

    this.vfx?.spawnSquadOverdriveBurst?.(this.entities, {
      leadTarget,
      targets: livingTargets
    });

    const leadEnt =
      this.entities[0] || {
        isEndlessCompanion: true,
        x: fxOriginX,
        groundY: fxOriginY,
        facing: pFacing,
        primaryColor: '#facc15',
        isCastingUlt: true,
        stats: { damageDealt: 0, critsLanded: 0, biggestHit: 0 }
      };
    const distributeStats = this.entities.length > 1 && totalEntityDps > 0;

    let hitCount = 0;
    let totalDamage = 0;
    for (let i = 0; i < livingTargets.length; i++) {
      const m = livingTargets[i];
      const isBoss = this._isBossTarget(m);
      const bossBonus = isBoss ? 1.45 : 1.0;
      const hit = this._scaleHit(baseBurst * bossBonus, m, stats, true, eco);
      const dealt = this._applyCompanionDamage(leadEnt, m, hit.dmg, true, 140, eco, g, {
        fromUlt: true,
        skipEntityStats: distributeStats
      });
      if (dealt > 0) {
        hitCount++;
        totalDamage = safeBoundedInt(totalDamage + dealt, 0, ENDLESS_COMPANION_MAX_STAT, totalDamage);
        if (distributeStats) {
          let remaining = dealt;
          for (let k = 0; k < this.entities.length; k++) {
            const ally = this.entities[k];
            if (!ally || !ally.stats) continue;
            const isLast = k === this.entities.length - 1;
            const share = isLast
              ? Math.max(0, remaining)
              : Math.max(
                  0,
                  Math.min(remaining, Math.round((dealt * entityDpsShares[k]) / totalEntityDps))
                );
            remaining = Math.max(0, remaining - share);
            if (share > 0) {
              ally.stats.damageDealt = safeBoundedInt(
                (ally.stats.damageDealt || 0) + share,
                0,
                ENDLESS_COMPANION_MAX_STAT,
                0
              );
              ally.stats.critsLanded = (ally.stats.critsLanded || 0) + 1;
              if (share > (ally.stats.biggestHit || 0)) {
                ally.stats.biggestHit = share;
              }
            }
          }
        }
      }
      if (isBoss && typeof m.addStagger === 'function') {
        m.addStagger(120, leadEnt, g);
      }
      if (i < 6) {
        const mx = Number.isFinite(m.x) ? m.x : fxOriginX + pFacing * 240;
        const my = Number.isFinite(m.groundY) ? m.groundY : fxOriginY;
        this._spawnFloorRipple(mx, my, 'buff', 1.1, 1.5);
      }
    }

    // Screen shake, crisp dual SFX, callout & banner
    const renderer = this.manager?.game?.renderer || g?.renderer || null;
    renderer?.triggerShake?.(10, 0.36);
    const audio = this.manager?.game?.audio || g?.audio || null;
    audio?.play?.('meteor_impact', fxOriginX);
    audio?.play?.('raijin_slash', fxOriginX);

    this.manager?.spawnFloatingCallout?.(
      fxOriginX,
      fxOriginY - 165,
      'SQUAD OVERDRIVE!',
      '#facc15',
      2,
      1.6,
      { kind: 'crit' }
    );
    this.manager?.showBanner?.(
      'SQUAD OVERDRIVE!',
      `${activeCount}-ALLY SYNCHRONIZED SURGE - +35% DMG!`,
      '#facc15',
      2.0
    );
    this.manager?._syncExternalModifiers?.(undefined, { preserveBase: true });

    return { ok: true, hitCount, totalDamage, activeCount, burstMult };
  }

  _updateProjectilesAndStrikes(entity, safeDt, aliveMonsters, economy, game, gaugeMult = 1) {
    for (let i = entity.activeStrikes.length - 1; i >= 0; i--) {
      const st = entity.activeStrikes[i];
      if (!st || !Number.isFinite(st.age) || !Number.isFinite(st.maxAge)) {
        entity.activeStrikes.splice(i, 1);
        continue;
      }
      st.age += safeDt;
      if (st.age >= st.maxAge) {
        entity.activeStrikes.splice(i, 1);
      }
    }
    while (entity.activeStrikes.length > COMPANION_STRIKES_MAX_COUNT) {
      entity.activeStrikes.shift();
    }

    for (let i = entity.activeProjectiles.length - 1; i >= 0; i--) {
      const p = entity.activeProjectiles[i];
      if (
        !p ||
        !Number.isFinite(p.life) ||
        !Number.isFinite(p.maxLife) ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        !Number.isFinite(p.vx) ||
        !Number.isFinite(p.vy)
      ) {
        if (p) p.target = null;
        entity.activeProjectiles.splice(i, 1);
        continue;
      }
      p.life += safeDt;
      p.x += p.vx * safeDt;
      p.y += p.vy * safeDt;

      let hitMonster = null;
      if (p.target) {
        if (p.target.isDead || (Number.isFinite(p.target.hp) && p.target.hp <= 0)) {
          p.target = null;
        } else {
          const ty = (Number.isFinite(p.target.groundY) ? p.target.groundY : entity.groundY) - 68;
          if (Math.hypot(p.x - p.target.x, p.y - ty) <= 52) {
            hitMonster = p.target;
          }
        }
      }
      if (!hitMonster) {
        for (const m of aliveMonsters) {
          const ty = (Number.isFinite(m.groundY) ? m.groundY : entity.groundY) - 68;
          if (Math.hypot(p.x - m.x, p.y - ty) <= 44) {
            hitMonster = m;
            break;
          }
        }
      }

      if (hitMonster) {
        this._applyCompanionDamage(entity, hitMonster, p.dmg, p.isCrit, p.knockX, economy, game, {
          fromUlt: Boolean(p.fromUlt),
          gaugeMult,
          overdriveGain: p.overdriveGain || 0
        });
        this.vfx?.spawnProjectileImpact?.(
          entity,
          hitMonster.x,
          (hitMonster.groundY || entity.groundY) - 70,
          {
            facing: p.vx < 0 ? -1 : 1,
            isCrit: Boolean(p.isCrit),
            scaleMult: p.isCrit ? 1.15 : 0.92
          }
        );
        p.target = null;
        entity.activeProjectiles.splice(i, 1);
        continue;
      }

      if (p.life >= p.maxLife) {
        p.target = null;
        entity.activeProjectiles.splice(i, 1);
      }
    }
    while (entity.activeProjectiles.length > COMPANION_PROJECTILES_MAX_COUNT) {
      const evicted = entity.activeProjectiles.shift();
      if (evicted) evicted.target = null;
    }
  }

  update(dt, player = null, monsters = [], economy = null, game = null) {
    const safeDt = clampNum(Number(dt) || 0, 0, 0.1);
    this._time = Number.isFinite(this._time) ? this._time + safeDt : safeDt;
    this._formationShiftTimer = Math.max(0, (Number(this._formationShiftTimer) || 0) - safeDt);

    this.activeBuffTimers.shieldTimer = Math.max(0, this.activeBuffTimers.shieldTimer - safeDt);
    this.activeBuffTimers.hasteTimer = Math.max(0, this.activeBuffTimers.hasteTimer - safeDt);
    this.vfx?.update?.(safeDt);

    for (let i = this._floorRipples.length - 1; i >= 0; i--) {
      const r = this._floorRipples[i];
      if (!r || !Number.isFinite(r.age) || !Number.isFinite(r.maxAge)) {
        this._floorRipples.splice(i, 1);
        continue;
      }
      r.age += safeDt;
      if (r.age >= r.maxAge) {
        this._floorRipples.splice(i, 1);
      }
    }
    while (this._floorRipples.length > FLOOR_RIPPLE_MAX_COUNT) {
      this._floorRipples.shift();
    }

    for (let i = this._ultEffects.length - 1; i >= 0; i--) {
      const ef = this._ultEffects[i];
      if (!ef || !Number.isFinite(ef.age) || !Number.isFinite(ef.maxAge)) {
        this._ultEffects.splice(i, 1);
        continue;
      }
      ef.age += safeDt;
      if (ef.age >= ef.maxAge) {
        this._ultEffects.splice(i, 1);
      }
    }
    while (this._ultEffects.length > ULT_EFFECTS_MAX_COUNT) {
      this._ultEffects.shift();
    }

    // Keep live entities aligned with activeSlots automatically
    if (
      this.entities.length !== this.activeSlots.length ||
      this.entities.some((e, idx) => e.companionId !== this.activeSlots[idx])
    ) {
      this.syncEntitiesWithWorld(player);
    }

    if (this.entities.length === 0) return;

    const aliveMonsters = Array.isArray(monsters) ? monsters.filter(isTargetAlive) : [];

    const stats = typeof economy?.getComputedStats === 'function' ? economy.getComputedStats() : null;
    const synMods = this.getPartySynergyModifiers();
    const gaugeMult = clampNum(Number(stats?.gaugeGainMult) || 1, 0.5, 25);
    const hasteMult = clampNum(
      (Number(stats?.hasteMult) || 1) * synMods.hasteMult +
        (this.activeBuffTimers.hasteTimer > 0 ? 0.20 : 0),
      0.5,
      25
    );
    const moveBoost = clampNum(Number(stats?.moveSpeedMult) || 1, 0.8, 4.0);
    const bounds = this.manager?.getActiveStageBounds?.() || null;
    const minLaneY = Math.max(475, (this.manager?.depthMinY || 442) + 33);
    const maxLaneY = Math.min(645, (this.manager?.depthMaxY || 680) - 35);

    const px = Number.isFinite(player?.x) ? player.x : 360;
    const py = clampNum(Number.isFinite(player?.groundY) ? player.groundY : 561, minLaneY, maxLaneY);
    const pFacing = (player?.facing || 1) < 0 ? -1 : 1;
    const evo = this._getEvo();

    const aiBounds = {
      minX: bounds?.minX,
      maxX: bounds?.maxX,
      minLaneY,
      maxLaneY
    };
    const formationOffsets = this._getFormationOffsets(evo);
    const anchors = this.ai.computeFormationAnchors(
      this.entities,
      player,
      formationOffsets,
      aiBounds,
      safeDt
    );
    const assignedTargets = this.ai.assignSquadTargets(
      this.entities,
      player,
      aliveMonsters,
      safeDt
    );

    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      const st = this.rosterState[ent.companionId];
      if (st?.unlocked) {
        ent.level = Math.max(1, Math.floor(Number(st.level) || 1));
      }

      // Dynamic Star & Sovereign EX Aura Tier synchronization (all 12 allies use EX sprites from 1-STAR)
      const starInfo = this._getStarInfo(ent.companionId);
      const prevStar = ent.star || 1;
      ent.star = starInfo.star;
      ent.auraTier = starInfo.auraTier || getAuraTier(starInfo.star);
      ent.isExForm = true;
      ent.isExEvolved = true;
      const activeKey = this._resolveActiveHeroKey(ent.cfg);
      if (activeKey && ent.heroId !== activeKey) {
        ent.heroId = activeKey;
        ent.isEx = true;
        safeEnsureHeroLoaded(activeKey);
        this.vfx?.preload?.(activeKey);
        ent.triggerAuraRing('buff', 1.45);
      } else if (starInfo.star > prevStar && starInfo.star >= 3) {
        ent.triggerAuraRing('buff', 1.45);
      }

      ent.stateTimer += safeDt;
      ent.attackCooldown = Math.max(0, ent.attackCooldown - safeDt * hasteMult);
      ent.skillCooldown = Math.max(0, ent.skillCooldown - safeDt * hasteMult);
      ent.auraRingTimer = Math.max(0, ent.auraRingTimer - safeDt);
      ent.hitFlash = Math.max(0, ent.hitFlash - safeDt);
      ent.calloutTimer = Math.max(0, ent.calloutTimer - safeDt);
      ent.ultFlashTimer = Math.max(0, (Number(ent.ultFlashTimer) || 0) - safeDt);
      ent.isCastingUlt = ent.ultFlashTimer > 0;

      // Passive combat uptime Ultimate Assist charging whenever monsters are active
      if (aliveMonsters.length > 0 && !ent.isCastingUlt) {
        ent.ultCharge = clampNum(ent.ultCharge + 2.4 * safeDt * gaugeMult, 0, 100);
      }

      this._updateProjectilesAndStrikes(ent, safeDt, aliveMonsters, economy, game, gaugeMult);

      const anchor = anchors.get(ent) || {
        x: px,
        y: py,
        independentLaneY: py,
        squadFacing: pFacing
      };
      const formX = anchor.x;
      const formY = anchor.y;

      // Emergency teleport clamp for extreme stage warps (> 1250px) or non-finite coords
      if (this.ai.shouldEmergencyTeleport(ent, player)) {
        ent.x = formX;
        ent.groundY = formY;
        ent.y = formY;
        ent.facing = anchor.squadFacing || pFacing;
        ent._castingUltState = false;
        ent._pendingRoleUlt = null;
        ent.targetMonster = null;
        ent.setState('IDLE');
        ent.triggerAuraRing('summon', 1.0);
        continue;
      }

      const target = assignedTargets.get(ent) || null;
      ent.targetMonster = target;

      // Begin signature Role Ultimate Assist (Row 4 wind-up -> synchronized impact at 0.42s)
      if (ent.ultCharge >= 100 && aliveMonsters.length > 0 && !ent.isCastingUlt && ent.state !== 'ULTIMATE') {
        const power = this.computeCompanionPower(ent.companionId, ent.level, economy, stats, synMods);
        const ultLead = target || aliveMonsters[0];
        this._beginRoleUltimate(ent, player, ultLead, aliveMonsters, power, stats, economy, game);
      }

      // Smart rubber-band DASH ONLY when truly left behind (> 680px AND no active target within 360px)
      if (
        ent.state !== 'SKILL' &&
        ent.state !== 'ULTIMATE' &&
        ent.state !== 'AUTO_ATTACK' &&
        ent.state !== 'DASH' &&
        this.ai.shouldRubberBandDash(ent, player, aliveMonsters)
      ) {
        ent.setState('DASH');
      }

      if (ent.state === 'DASH') {
        const dx = formX - ent.x;
        const dy = formY - ent.groundY;
        const dist = Math.hypot(dx, dy);
        if (dist <= 36 || ent.stateTimer >= ent.dashDuration) {
          ent.setState('IDLE');
        } else {
          const dashSpeed = 480 * moveBoost;
          ent.x += (dx / dist) * dashSpeed * safeDt;
          ent.groundY = clampNum(ent.groundY + (dy / dist) * (dashSpeed * 0.55) * safeDt, minLaneY, maxLaneY);
          ent.facing = dx < -4 ? -1 : 1;
          ent.animFrame = (ent.animFrame + safeDt * 30) % 30;
        }
      } else if (ent.state === 'ULTIMATE') {
        const liveFocus =
          ent._pendingRoleUlt?.target && isTargetAlive(ent._pendingRoleUlt.target)
            ? ent._pendingRoleUlt.target
            : target;
        if (liveFocus && Math.abs((liveFocus.x || 0) - ent.x) > 4) {
          ent.facing = liveFocus.x >= ent.x ? 1 : -1;
        }
        if (
          ent._pendingRoleUlt &&
          !ent._pendingRoleUlt.resolved &&
          ent.stateTimer >= ROLE_ULT_IMPACT_BEAT_SEC
        ) {
          ent._pendingRoleUlt.resolved = true;
          const pending = ent._pendingRoleUlt;
          const liveTargets = aliveMonsters.filter(isTargetAlive);
          const supportSelfUlt =
            ent.role === 'HEALER' || ent.role === 'TANK' || ent.role === 'WEAVER';
          if (liveTargets.length > 0 || supportSelfUlt) {
            const resolvedLead =
              pending.target && isTargetAlive(pending.target)
                ? pending.target
                : target && isTargetAlive(target)
                  ? target
                  : liveTargets[0] || null;
            const power = this.computeCompanionPower(ent.companionId, ent.level, economy, stats, synMods);
            this._executeRoleUltimateImpact(
              ent,
              player,
              resolvedLead,
              liveTargets,
              power,
              stats,
              economy,
              game,
              {
                fallbackTx: pending.tx,
                fallbackTy: pending.ty,
                ultVfxMult: pending.ultVfxMult
              }
            );
          }
        }
        if (ent.stateTimer >= (ent.ultDuration || 1.15)) {
          ent._pendingRoleUlt = null;
          ent._castingUltState = false;
          ent.setState('IDLE');
        }
      } else if (ent.state === 'SKILL') {
        if (target && Math.abs((target.x || 0) - ent.x) > 4) {
          ent.facing = target.x >= ent.x ? 1 : -1;
        }
        if (!ent.didSkillHit && ent.stateTimer >= ent.skillDuration * 0.40) {
          ent.didSkillHit = true;
          const power = this.computeCompanionPower(ent.companionId, ent.level, economy, stats, synMods);
          this._executeRoleSkill(ent, player, target, aliveMonsters, power, stats, economy, game);
        }
        if (ent.stateTimer >= ent.skillDuration) {
          if (ent._castingUltState) {
            ent._castingUltState = false;
          } else {
            ent.skillCooldown = ent.skillMaxCooldown;
          }
          ent.setState('IDLE');
        }
      } else if (ent.state === 'AUTO_ATTACK') {
        if (target && Math.abs((target.x || 0) - ent.x) > 4) {
          ent.facing = target.x >= ent.x ? 1 : -1;
        }
        if (!ent.didActionHit && ent.stateTimer >= ent.autoDuration * 0.42) {
          ent.didActionHit = true;
          if (target && isTargetAlive(target)) {
            const power = this.computeCompanionPower(ent.companionId, ent.level, economy, stats, synMods);
            const hit = this._scaleHit(power.attackDmg, target, stats, false, economy);
            const distToTarget = Math.abs((target.x || 0) - ent.x);
            if (ent.isRanged && distToTarget > 95) {
              this._spawnProjectile(ent, target, hit.dmg, hit.isCrit, {
                speed: ent.role === 'ARCHER' ? 860 : 740,
                color: ent.primaryColor,
                coreColor: '#ffffff',
                style: ent.role === 'ARCHER' ? 'arrow' : 'bolt',
                knockX: 36,
                overdriveGain: 4
              });
              this.vfx?.spawnAutoAttack?.(ent, target, {
                x: ent.x + ent.facing * 26,
                y: ent.groundY - 76,
                facing: ent.facing,
                isCrit: Boolean(hit.isCrit),
                scaleMult: hit.isCrit ? 1.05 : 0.9
              });
            } else {
              this._applyCompanionDamage(ent, target, hit.dmg, hit.isCrit, 48, economy, game, {
                gaugeMult,
                overdriveGain: 4
              });
              this.vfx?.spawnAutoAttack?.(ent, target, {
                x: target.x,
                y: (target.groundY || ent.groundY) - 76,
                facing: ent.facing,
                isCrit: Boolean(hit.isCrit),
                scaleMult: hit.isCrit ? 1.18 : 0.95
              });
            }
          }
        }
        if (ent.stateTimer >= ent.autoDuration) {
          ent.attackCooldown = Math.max(0.16, ent.cfg.attackInterval - ent.autoDuration * 0.45);
          ent.setState('IDLE');
        }
      } else {
        // Tactical AI IDLE / WALK / KITE / SKILL / AUTO_ATTACK decision pass
        const step = this.ai.computeMovementStep(ent, {
          player,
          target,
          targets: aliveMonsters,
          entities: this.entities,
          anchor,
          bounds: aiBounds,
          dt: safeDt,
          moveBoost,
          formationShiftActive: this._formationShiftTimer > 0
        });

        const playerNeedsHeal = Boolean(
          ent.role === 'HEALER' &&
            player &&
            !player.isDead &&
            Number.isFinite(player.hp) &&
            Number.isFinite(player.maxHp) &&
            player.hp < player.maxHp * 0.88
        );
        const targetDistX = target ? Math.abs((target.x || 0) - ent.x) : Infinity;
        const skillRange = Math.max(ent.attackRange + 55, 220);
        const canCastSkill =
          this._formationShiftTimer <= 0 &&
          ent.skillCooldown <= 0 &&
          (playerNeedsHeal ||
            (target &&
              (targetDistX <= skillRange ||
                ((ent.role === 'TANK' || ent.role === 'WEAVER') && targetDistX <= 460))));

        if (canCastSkill) {
          if (target && Math.abs((target.x || 0) - ent.x) > 4) {
            ent.facing = target.x >= ent.x ? 1 : -1;
          }
          ent.setState('SKILL');
        } else if (step.action === 'IN_RANGE' && target) {
          ent.x = step.nextX;
          ent.groundY = step.nextGroundY;
          ent.facing = step.facing;
          if (ent.attackCooldown <= 0) {
            ent.setState('AUTO_ATTACK');
          } else if (step.moved) {
            ent.moveDir = step.moveDir;
            ent.setState('WALK');
            ent.walkPhase += safeDt * 3.8;
            ent.animFrame = (ent.animFrame + safeDt * 20) % 30;
          } else {
            ent.setState('IDLE');
            ent.animFrame = (ent.animFrame + safeDt * 12) % 30;
          }
        } else if (step.action === 'KITE' || step.action === 'WALK') {
          ent.x = step.nextX;
          ent.groundY = step.nextGroundY;
          ent.facing = step.facing;
          ent.moveDir = step.moveDir;
          ent.setState('WALK');
          ent.walkPhase += safeDt * (step.isKiting ? 5.2 : 4.4);
          ent.animFrame = (ent.animFrame + safeDt * (step.isKiting ? 28 : 24)) % 30;
        } else {
          ent.x = step.nextX;
          ent.groundY = step.nextGroundY;
          ent.facing = step.facing;
          ent.setState('IDLE');
          ent.animFrame = (ent.animFrame + safeDt * 11) % 30;
        }
      }

      if (bounds && Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX)) {
        ent.x = clampNum(ent.x, bounds.minX + 28, bounds.maxX - 28);
      }
      ent.groundY = clampNum(ent.groundY, minLaneY, maxLaneY);
      ent.y = ent.groundY;
    }

    // Auto-trigger synchronized Squad Overdrive when AUTO PLAY is enabled & monsters exist
    const activeCount = this.entities.length;
    if (
      this.manager?.autoPlay &&
      activeCount > 0 &&
      aliveMonsters.length > 0 &&
      evo &&
      typeof evo.isOverdriveReady === 'function' &&
      evo.isOverdriveReady(activeCount)
    ) {
      this.triggerSquadOverdrive(player, aliveMonsters, economy, game);
    }
  }

  _drawAuraRingInstance(ctx, vfxImg, hasVfx, cx, cy, kind, alpha, scaleMult, phaseTime) {
    const a = clampNum(alpha, 0, 1);
    if (a <= 0.02) return;

    if (hasVfx && typeof ctx.drawImage === 'function') {
      const colBase = kind === 'heal' ? 4 : kind === 'buff' ? 8 : 0;
      const frame = Math.floor(Math.max(0, phaseTime) * 10) % 4;
      const sx = (colBase + frame) * 128;
      const sy = 5 * 128;
      const drawW = Math.round(134 * scaleMult);
      const drawH = Math.round(92 * scaleMult);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = a;
      ctx.drawImage(
        vfxImg,
        sx,
        sy,
        128,
        128,
        Math.round(cx - drawW * 0.5),
        Math.round(cy - drawH * 0.52),
        drawW,
        drawH
      );
      ctx.restore();
      return;
    }

    const outerCol = kind === 'heal' ? '#34d399' : kind === 'buff' ? '#fb923c' : '#38bdf8';
    const innerCol = kind === 'heal' ? '#fef08a' : kind === 'buff' ? '#facc15' : '#bae6fd';
    drawSteppedPixelAuraRing(ctx, cx, cy, 48 * scaleMult, 16 * scaleMult, outerCol, innerCol, a);
  }

  renderFloorAuras(ctx, _renderer = null) {
    if (!ctx) return;
    const isMobile = Boolean(_renderer?.isMobile);
    if (_renderer && typeof _renderer.isMobile === 'boolean') {
      this.vfx?.setMobileMode?.(isMobile);
    }
    const assets = getSafePixelForgeAssets();
    const rawVfx = assets?.endlessVfx || null;
    const vfxImg = rawVfx && rawVfx.complete ? rawVfx : rawVfx ? PixelForge.ensureImage?.(rawVfx) || rawVfx : null;
    const hasVfx = Boolean(
      vfxImg &&
        vfxImg.complete &&
        (vfxImg.naturalWidth || vfxImg.width) >= 1536 &&
        (vfxImg.naturalHeight || vfxImg.height) >= 768
    );

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const ent of this.entities) {
      // Escalating 100% pixel-pure Sovereign EX floor rune seals for 3-STAR / 4-STAR / 5-STAR allies (fillRect only)
      const entAura = getAuraTier(ent.star);
      if (entAura.tier >= 1 && typeof ctx.fillRect === 'function') {
        const slot = Number.isFinite(ent.slotIndex) ? ent.slotIndex : 0;
        const pulse = 0.95 + 0.06 * Math.sin(this._time * 4.8 + slot * 1.1);
        const cy = Math.round(ent.groundY + 2);
        const cx = Math.round(ent.x);
        const phase = this._time * 1.4 + slot * 0.9;
        const primaryHex = ent.primaryColor || '#38bdf8';

        if (entAura.tier === 1) {
          // 3-STAR SOVEREIGN AURA: stepped isometric pixel floor rune seal + orbiting 2x2 accent mana motes
          const rx = Math.round(48 * pulse);
          const ry = Math.round(16 * pulse);
          drawSteppedPixelAuraRing(ctx, cx, cy, rx, ry, primaryHex, '#fef08a', 0.56);
          drawFloorRuneTicks(ctx, cx, cy, rx - 4, ry - 2, primaryHex, '#fef08a', 0, 4);
          for (let k = 0; k < 4; k++) {
            const ang = phase + (k * Math.PI) / 2;
            const ox = Math.round(cx + Math.cos(ang) * (rx + 2));
            const oy = Math.round(cy + Math.sin(ang) * (ry + 1));
            ctx.fillStyle = '#0d0f1c';
            ctx.fillRect(ox - 2, oy - 2, 4, 4);
            ctx.fillStyle = k % 2 === 0 ? primaryHex : '#fef08a';
            ctx.fillRect(ox - 1, oy - 1, 2, 2);
          }
        } else if (entAura.tier === 2) {
          // 4-STAR ASCENDED HALO: double concentric stepped floor rune seal + orbiting mana motes
          const outerRx = Math.round(56 * pulse);
          const outerRy = Math.round(19 * pulse);
          const innerRx = Math.round(35 * pulse);
          const innerRy = Math.round(12 * pulse);
          drawSteppedPixelAuraRing(ctx, cx, cy, outerRx, outerRy, '#facc15', '#fef08a', 0.62);
          drawSteppedPixelAuraRing(ctx, cx, cy, innerRx, innerRy, primaryHex, '#ffffff', 0.54);
          drawFloorRuneTicks(ctx, cx, cy, outerRx - 3, outerRy - 1, '#facc15', primaryHex, Math.PI * 0.25, 4);
          for (let k = 0; k < 6; k++) {
            const ang = phase * 1.15 + (k * Math.PI * 2) / 6;
            const ox = Math.round(cx + Math.cos(ang) * (outerRx + 2));
            const oy = Math.round(cy + Math.sin(ang) * (outerRy + 1));
            ctx.fillStyle = '#0d0f1c';
            ctx.fillRect(ox - 2, oy - 2, 4, 4);
            ctx.fillStyle = k % 2 === 0 ? '#facc15' : primaryHex;
            ctx.fillRect(ox - 1, oy - 1, 2, 2);
          }
        } else {
          // 5-STAR MYTHIC CROWN: radiant gilded sovereign floor seal + orbiting 4-point pixel stars
          const outerRx = Math.round(62 * pulse);
          const outerRy = Math.round(21 * pulse);
          const innerRx = Math.round(40 * pulse);
          const innerRy = Math.round(13 * pulse);

          if (!isMobile) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.14;
            ctx.fillStyle = '#facc15';
            ctx.fillRect(cx - innerRx, cy - Math.round(innerRy * 0.55), innerRx * 2, Math.max(4, Math.round(innerRy * 1.1)));
            ctx.restore();
          }

          drawSteppedPixelAuraRing(ctx, cx, cy, outerRx, outerRy, '#facc15', '#fef08a', 0.72);
          drawSteppedPixelAuraRing(ctx, cx, cy, innerRx, innerRy, '#f43f5e', '#fef9c3', 0.64);
          // Cardinal sovereign rune cross bars on the floor seal
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cx - outerRx - 4, cy - 1, 8, 2);
          ctx.fillRect(cx + outerRx - 4, cy - 1, 8, 2);
          ctx.fillRect(cx - 1, cy - outerRy - 3, 2, 6);
          ctx.fillRect(cx - 1, cy + outerRy - 3, 2, 6);
          drawFloorRuneTicks(ctx, cx, cy, outerRx - 3, outerRy - 1, '#f43f5e', '#fef08a', Math.PI * 0.25, 4);

          for (let k = 0; k < 6; k++) {
            const ang = phase * 1.28 + (k * Math.PI * 2) / 6;
            const ox = Math.round(cx + Math.cos(ang) * (outerRx + 4));
            const oy = Math.round(cy + Math.sin(ang) * (outerRy + 2));
            drawPixelFourPointStar(
              ctx,
              ox,
              oy,
              k % 2 === 0 ? 4 : 3,
              k % 2 === 0 ? '#fef08a' : '#f43f5e',
              '#ffffff'
            );
          }
        }
      }

      if (ent.isCastingUlt || ent.ultFlashTimer > 0) {
        const u = clampNum((ent.ultFlashTimer || 0) / ULT_FLASH_DURATION, 0, 1);
        const ultAuraGrow = 1 + ((Number(entAura?.ultVfxMult) || 1.0) - 1) * 0.32;
        const burstScale = (1.24 + (1 - u) * 0.24) * ultAuraGrow;
        this._drawAuraRingInstance(
          ctx,
          vfxImg,
          hasVfx,
          ent.x,
          ent.groundY + 2,
          ent.role === 'HEALER' ? 'heal' : 'buff',
          0.92 * Math.max(0.35, u),
          burstScale,
          this._time * 1.6 + ent.slotIndex * 0.25
        );
      } else if (ent.auraRingTimer > 0) {
        const fade = clampNum(ent.auraRingTimer / 0.35, 0, 1);
        const pulse = 0.94 + 0.08 * Math.sin(this._time * 9 + ent.slotIndex);
        this._drawAuraRingInstance(
          ctx,
          vfxImg,
          hasVfx,
          ent.x,
          ent.groundY + 2,
          ent.auraRingKind,
          0.82 * fade,
          pulse,
          this._time + ent.slotIndex * 0.25
        );
      } else if (ent.state === 'SKILL') {
        this._drawAuraRingInstance(
          ctx,
          vfxImg,
          hasVfx,
          ent.x,
          ent.groundY + 2,
          ent.role === 'HEALER' ? 'heal' : 'buff',
          0.62,
          1.05,
          this._time
        );
      } else if (this.activeBuffTimers.hasteTimer > 0) {
        this._drawAuraRingInstance(
          ctx,
          vfxImg,
          hasVfx,
          ent.x,
          ent.groundY + 2,
          'buff',
          0.26,
          0.86,
          this._time + ent.slotIndex * 0.2
        );
      }
    }

    for (const r of this._floorRipples) {
      const u = clampNum(r.age / r.maxAge, 0, 1);
      const fade = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
      const grow = r.scaleMult * (0.85 + u * 0.32);
      this._drawAuraRingInstance(ctx, vfxImg, hasVfx, r.x, r.y + 2, r.kind, 0.78 * fade, grow, r.age * 1.4);
    }

    this.vfx?.renderGroundLayer?.(ctx);

    ctx.restore();
  }

  renderForegroundFX(ctx, _renderer = null) {
    if (!ctx) return;
    const vfx = this.vfx || null;
    if (_renderer && typeof _renderer.isMobile === 'boolean') {
      vfx?.setMobileMode?.(_renderer.isMobile);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const ent of this.entities) {
      ctx.globalAlpha = 1;
      for (const p of ent.activeProjectiles) {
        if (vfx && typeof vfx.drawProjectile === 'function') {
          vfx.drawProjectile(ctx, ent, p, this._time);
        } else if (typeof ctx.fillRect === 'function') {
          // Compact 3-step pixel needle fallback ONLY when vfx renderer is absent
          const px = Math.round(p.x);
          const py = Math.round(p.y);
          const dir = (p.vx || 1) < 0 ? -1 : 1;
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(px - (dir > 0 ? 11 : 3), py - 3, 14, 6);
          ctx.fillStyle = p.color || ent.primaryColor || '#38bdf8';
          ctx.fillRect(px - (dir > 0 ? 9 : 2), py - 2, 11, 4);
          ctx.fillStyle = p.coreColor || '#ffffff';
          ctx.fillRect(px - 2, py - 1, 4, 2);
        }
      }
    }

    vfx?.renderForegroundLayer?.(ctx);

    ctx.restore();
  }

  exportSnapshot() {
    const rosterState = {};
    for (const cfg of ENDLESS_COMPANION_ROSTER) {
      const st = this.rosterState[cfg.id] || { unlocked: false, level: 0 };
      rosterState[cfg.id] = {
        unlocked: Boolean(st.unlocked),
        level: st.unlocked ? Math.max(1, Math.floor(Number(st.level) || 1)) : 0
      };
    }
    return {
      rosterState,
      activeSlots: [...this.activeSlots]
    };
  }

  importSnapshot(snap) {
    this.reset();
    if (!snap || typeof snap !== 'object') return;

    const srcRoster = snap.rosterState && typeof snap.rosterState === 'object' ? snap.rosterState : {};
    for (const cfg of ENDLESS_COMPANION_ROSTER) {
      const entry = srcRoster[cfg.id];
      if (entry && entry.unlocked) {
        this.rosterState[cfg.id] = {
          unlocked: true,
          level: Math.max(1, Math.floor(Number(entry.level) || 1))
        };
      }
    }

    const srcSlots = Array.isArray(snap.activeSlots) ? snap.activeSlots : [];
    const seen = new Set();
    for (const rawId of srcSlots) {
      if (this.activeSlots.length >= ENDLESS_MAX_ACTIVE_SLOTS) break;
      if (typeof rawId !== 'string') continue;
      const id = this.normalizeId(rawId);
      if (!id || seen.has(id)) continue;
      if (!ROSTER_BY_ID[id] || !this.rosterState[id]?.unlocked) continue;
      seen.add(id);
      this.activeSlots.push(id);
      const activeKey = this._resolveActiveHeroKey(ROSTER_BY_ID[id]);
      safeEnsureHeroLoaded(activeKey);
      this.vfx?.preload?.(activeKey);
    }

    if (this.manager?.player) {
      this.syncEntitiesWithWorld(this.manager.player);
    }
  }
}
