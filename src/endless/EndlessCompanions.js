import { PixelForge } from '../engine/PixelForge.js?v=30fps201';
import { PixelFont } from '../engine/PixelFont.js?v=30fps201';
import {
  COMPANION_BASE_TO_EX_KEY,
  ELITE_EX_COMPANION_DEFS,
  COMPANION_MAX_STARS
} from './EndlessCompanionEvo.js?v=30fps201';

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
const COMPANION_ENGAGE_RANGE = 640;
const FORMATION_LANE_OFFSETS = [-62, 60, -8];
const SPAWN_X_OFFSETS = [-102, -124, -138];
const SPAWN_LANE_Y = [492, 622, 558];

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

function drawPixelDiamond(ctx, cx, cy, halfSize, color) {
  const s = Math.max(2, Math.round(halfSize));
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  ctx.fillStyle = color;
  for (let row = -s; row <= s; row += 2) {
    const span = Math.max(2, (s - Math.abs(row)) * 2);
    ctx.fillRect(ix - Math.round(span * 0.5), iy + row, span, 2);
  }
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

function drawSteppedLightningArc(ctx, x0, y0, x1, y1, color, coreColor, seed = 1) {
  const segs = 10;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const bx = x0 + (x1 - x0) * t;
    const by = y0 + (y1 - y0) * t;
    const jitter =
      i === 0 || i === segs
        ? 0
        : Math.round(Math.sin(i * 2.7 + seed * 4.3) * 18 + Math.cos(i * 5.1 + seed) * 8);
    pts.push({ x: Math.round(bx), y: Math.round(by + jitter) });
  }

  const drawPass = (fillColor, thickness) => {
    ctx.fillStyle = fillColor;
    const half = Math.floor(thickness * 0.5);
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const steps = Math.max(4, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / 6));
      for (let s = 0; s <= steps; s++) {
        const frac = s / steps;
        const px = Math.round(a.x + (b.x - a.x) * frac);
        const py = Math.round(a.y + (b.y - a.y) * frac);
        ctx.fillRect(px - half, py - half, thickness, thickness);
      }
    }
  };

  drawPass('#0d0f1c', 7);
  drawPass(color || '#38bdf8', 5);
  drawPass(coreColor || '#ffffff', 2);
}

export class EndlessCompanionEntity {
  constructor(
    cfg,
    { x = 260, groundY = 558, facing = 1, level = 1, slotIndex = 0, heroKey = null, star = 1, isExEvolved = false } = {}
  ) {
    this.cfg = cfg;
    this.isEndlessCompanion = true;
    this.isMonster = false;
    this.isDead = false;
    this.isBenched = false;
    this.team = 1;
    this.heroId = heroKey || cfg.heroKey;
    const baseMapping =
      cfg?.id && Object.prototype.hasOwnProperty.call(COMPANION_BASE_TO_EX_KEY, cfg.id)
        ? COMPANION_BASE_TO_EX_KEY[cfg.id]
        : null;
    this.baseHeroId = baseMapping?.baseHeroKey || cfg.heroKey;
    this._lastReadyHeroId = null;
    this._squad = null;
    this.isEx = Boolean(this.heroId && this.heroId.endsWith('_ex'));
    this.star = clampNum(Math.floor(Number(star) || 1), 1, COMPANION_MAX_STARS || 5);
    this.isExEvolved = Boolean(isExEvolved || this.star >= 3);
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

  _drawRoleOverheadUI(ctx) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;
    const layout = this._squad?.getOverheadLayoutFor?.(this) || null;
    const cx = Math.round(this.x);
    const headY = Math.round(this.y - 164);

    const roleLabel = this.isExEvolved
      ? `EX ${this.role} LV.${this.level}`
      : `${this.role} LV.${this.level}`;
    const textW = PixelFont.measureWidth(roleLabel, 1, 1);
    const pillW = Math.max(46, textW + 10);
    const pillH = 13;
    const pillX = Math.round(cx - pillW * 0.5);
    const pillY = Number.isFinite(layout?.pillY) ? layout.pillY : headY - pillH;
    const castingUlt = Boolean(this.isCastingUlt || this.ultFlashTimer > 0);
    const starCount = clampNum(Math.floor(Number(this.star) || 1), 1, COMPANION_MAX_STARS || 5);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Compact obsidian nameplate with companion role accent rim (flares gold during Ult Assist or Sovereign EX)
    ctx.fillStyle = castingUlt
      ? 'rgba(28, 20, 6, 0.92)'
      : this.isExEvolved
        ? 'rgba(12, 16, 30, 0.90)'
        : 'rgba(7, 10, 20, 0.84)';
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.fillStyle = castingUlt ? '#facc15' : this.isExEvolved ? '#f59e0b' : '#05070e';
    ctx.fillRect(pillX - 1, pillY, 1, pillH);
    ctx.fillRect(pillX + pillW, pillY, 1, pillH);
    ctx.fillRect(pillX, pillY + pillH, pillW, 1);
    ctx.fillStyle = castingUlt ? '#fef08a' : this.isExEvolved ? '#facc15' : this.primaryColor || '#38bdf8';
    ctx.fillRect(pillX, pillY - 1, pillW, 2);

    // Crisp pixel star pips centered above nameplate for Star 2+ companions (fillRect only)
    if (starCount >= 2) {
      const pipSpan = starCount * 5 - 2;
      const pipStartX = Math.round(cx - pipSpan * 0.5);
      const pipY = pillY - 5;
      for (let s = 0; s < starCount; s++) {
        const px = pipStartX + s * 5;
        ctx.fillStyle = '#05070e';
        ctx.fillRect(px - 1, pipY - 1, 5, 5);
        ctx.fillStyle = starCount >= 5 ? '#f43f5e' : starCount >= 3 ? '#facc15' : '#fde047';
        ctx.fillRect(px, pipY, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 1, pipY, 1, 1);
      }
    }

    PixelFont.drawCentered(
      ctx,
      roleLabel,
      cx,
      pillY + 7,
      1,
      castingUlt ? '#fef08a' : '#f8fafc',
      castingUlt ? '#facc15' : this.primaryColor,
      true
    );

    // Subtle green-to-gold skill readiness bar & golden Ult charge bar directly beneath nameplate
    const barW = 38;
    const barH = 3;
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
      ctx.fillStyle = isSkillReady ? '#fef9c3' : '#a7f3d0';
      ctx.fillRect(barX, barY, fillW, 1);
    }

    // Compact golden Ult Assist charge strip right below the skill bar
    const ultY = barY + barH + 2;
    const ultBarH = 3;
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
      ctx.fillStyle = castingUlt ? '#ffffff' : '#fde047';
      ctx.fillRect(barX, ultY, ultFillW, 1);
    }

    // Gold pip on right edge when skill ready, bright cyan-gold pip on left when Ult full/casting
    if (isSkillReady) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(barX + barW + 2, barY, 3, 3);
    }
    if (this.ultCharge >= 100 || castingUlt) {
      ctx.fillStyle = castingUlt ? '#fef08a' : '#38bdf8';
      ctx.fillRect(barX - 5, ultY, 3, 3);
    }

    // Crisp ability or bold gilded Ultimate Assist callout flash (staggered & de-overlapped)
    if (this.calloutTimer > 0 && this.calloutText && !layout?.suppressCallout) {
      if (this.calloutIsUlt) {
        const fade = clampNum(this.calloutTimer / 0.32, 0, 1);
        const lift = Math.round((1.55 - Math.min(1.55, this.calloutTimer)) * 22);
        const ultScale = 1;
        const cW = PixelFont.measureWidth(this.calloutText, ultScale, 1);
        const plaqueW = Math.max(76, cW + 16);
        const plaqueH = 16;
        const px = Math.round(cx - plaqueW * 0.5);
        const py = Number.isFinite(layout?.calloutY)
          ? layout.calloutY
          : pillY - 26 - lift - (this.slotIndex || 0) * 3;

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
          cx,
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
          : pillY - 11 - lift - (this.slotIndex || 0) * 3;
        ctx.globalAlpha = fade;
        PixelFont.drawCentered(
          ctx,
          this.calloutText,
          cx,
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

    safeEnsureHeroLoaded(this.heroId);
    const assets = getSafePixelForgeAssets();
    let charSet = assets?.[this.heroId] || null;
    const rawSheet = charSet?.sheet || null;
    let sheet = rawSheet ? PixelForge.ensureImage?.(rawSheet) || rawSheet : null;
    let hasSheet = isSheetReady(sheet);

    if (hasSheet) {
      this._lastReadyHeroId = this.heroId;
    } else if (assets) {
      // Hold already-loaded base/previous sprite sheet while newly evolved *_ex_sheet.png downloads (zero silhouette flash)
      const fallbackKeys = [
        this._lastReadyHeroId,
        this.baseHeroId,
        COMPANION_BASE_TO_EX_KEY[this.companionId]?.baseHeroKey
      ];
      for (let f = 0; f < fallbackKeys.length; f++) {
        const fbKey = fallbackKeys[f];
        if (!fbKey || fbKey === this.heroId) continue;
        const fbSet = assets[fbKey] || null;
        const fbSheet = fbSet?.sheet || null;
        if (isSheetReady(fbSheet)) {
          charSet = fbSet;
          sheet = fbSheet;
          hasSheet = true;
          break;
        }
      }
    }

    const drawX = Math.round(this.x);
    const drawY = Math.round((Number.isFinite(this.y) ? this.y : this.groundY) + 3);
    const scale = COMPANION_DRAW_SCALE;
    const castingUlt = !isReflection && Boolean(this.isCastingUlt || this.ultFlashTimer > 0);

    if (castingUlt && typeof ctx.fillRect === 'function') {
      const u = clampNum(this.ultFlashTimer / ULT_FLASH_DURATION, 0, 1);
      const colAccent = this.cfg?.ultColor || this.primaryColor || '#facc15';
      const colSub = this.cfg?.ultSubColor || '#fef08a';
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = clampNum(0.28 + u * 0.55, 0, 0.85);
      const colW = Math.max(14, Math.round(34 * u + 12));
      const colH = Math.round(176 + (1 - u) * 34);
      ctx.fillStyle = colAccent;
      ctx.fillRect(drawX - colW, drawY - colH, colW * 2, colH);
      const coreW = Math.max(6, Math.round(colW * 0.45));
      ctx.fillStyle = colSub;
      ctx.fillRect(drawX - coreW, drawY - colH + 6, coreW * 2, colH - 6);
      // Rising crisp pixel spark diamonds flanking the caster
      for (let k = -1; k <= 1; k += 2) {
        const sparkX = drawX + k * Math.round(28 + (1 - u) * 18);
        const sparkY = drawY - Math.round(32 + ((1 - u) * 130 + (k > 0 ? 44 : 0)) % 148);
        drawPixelDiamond(ctx, sparkX, sparkY, 6, '#0d0f1c');
        drawPixelDiamond(ctx, sparkX, sparkY, 4, '#fef08a');
      }
      ctx.restore();
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

      if (natW === 6240 && natH === 2080) {
        cellW = 208;
        cellH = 208;
        anchorX = 104;
        anchorY = 198;
      } else if (
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
      const footRatio = cellH > 0 ? anchorY / cellH : 230 / 240;
      const baseX = Math.round(-anchorX * scale);
      const baseY = Math.round(-drawH * footRatio);

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
    const cfg = ROSTER_BY_ID[id];
    const isNativeEx = Boolean(cfg && (cfg.isEliteEx || cfg.id === 'raijin_ex'));
    return {
      star: 1,
      title: 'INITIATE',
      dpsMult: 1.0,
      ultMult: 1.0,
      isExEvolved: false,
      isExSprite: isNativeEx,
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
    if (Array.isArray(this.entities)) {
      for (let i = 0; i < this.entities.length; i++) {
        const ent = this.entities[i];
        if (!ent) continue;
        if (Array.isArray(ent.activeProjectiles)) ent.activeProjectiles.length = 0;
        if (Array.isArray(ent.activeStrikes)) ent.activeStrikes.length = 0;
        ent.targetMonster = null;
      }
    }
  }

  getOverheadLayoutFor(entity) {
    if (!entity || !Array.isArray(this.entities) || this.entities.length === 0) return null;
    const ents = this.entities;
    const items = [];
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (!e) continue;
      const cx = Math.round(Number.isFinite(e.x) ? e.x : 0);
      const ey = Number.isFinite(e.y) ? e.y : Number.isFinite(e.groundY) ? e.groundY : 558;
      const headY = Math.round(ey - 164);
      const roleLabel = e.isExEvolved
        ? `EX ${e.role} LV.${e.level}`
        : `${e.role} LV.${e.level}`;
      const textW = PixelFont.measureWidth(roleLabel, 1, 1);
      const pillW = Math.max(46, textW + 10);
      const pillH = 13;
      const starCount = clampNum(Math.floor(Number(e.star) || 1), 1, COMPANION_MAX_STARS || 5);
      items.push({
        entity: e,
        slotIndex: Number.isFinite(e.slotIndex) ? e.slotIndex : i,
        cx,
        pillW,
        pillH,
        pillY: headY - pillH,
        topPad: starCount >= 2 ? 7 : 2,
        botPad: 11,
        calloutY: null,
        calloutW: 0,
        calloutH: 0,
        suppressCallout: false
      });
    }
    if (items.length === 0) return null;

    // 1. De-overlap role nameplate clusters bottom-up so clustered foreground/background tags never collide
    const bottomUp = items
      .map((_, idx) => idx)
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

    // 2. Suppress duplicate simultaneous labels across clustered allies & de-overlap callouts vs nameplates/callouts
    const calloutOrder = items
      .map((_, idx) => idx)
      .filter((idx) => items[idx].entity.calloutTimer > 0 && Boolean(items[idx].entity.calloutText))
      .sort((a, b) => {
        const ea = items[a].entity;
        const eb = items[b].entity;
        if (Boolean(eb.calloutIsUlt) !== Boolean(ea.calloutIsUlt)) {
          return eb.calloutIsUlt ? 1 : -1;
        }
        return items[a].pillY - items[b].pillY || items[a].slotIndex - items[b].slotIndex;
      });

    const placedCallouts = [];
    for (let k = 0; k < calloutOrder.length; k++) {
      const cur = items[calloutOrder[k]];
      const e = cur.entity;
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

      const cW = PixelFont.measureWidth(e.calloutText, 1, 1);
      if (e.calloutIsUlt) {
        const lift = Math.round((1.55 - Math.min(1.55, e.calloutTimer)) * 22);
        cur.calloutW = Math.max(76, cW + 16) + 4;
        cur.calloutH = 20;
        cur.calloutY = cur.pillY - cur.topPad - 22 - lift - cur.slotIndex * 3;
      } else {
        const lift = Math.round((1.15 - Math.min(1.15, e.calloutTimer)) * 16);
        cur.calloutW = Math.max(44, cW + 8);
        cur.calloutH = 12;
        cur.calloutY = cur.pillY - cur.topPad - 12 - lift - cur.slotIndex * 3;
      }

      let guard = 0;
      let shifted = true;
      while (shifted && guard < 6) {
        shifted = false;
        guard++;
        // Avoid colliding with ANY ally's role nameplate + bars
        for (let j = 0; j < items.length; j++) {
          const tag = items[j];
          if (Math.abs(cur.cx - tag.cx) >= (cur.calloutW + tag.pillW) * 0.5 + 8) continue;
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
          if (Math.abs(cur.cx - prev.cx) >= (cur.calloutW + prev.calloutW) * 0.5 + 8) continue;
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

    for (let i = 0; i < items.length; i++) {
      if (items[i].entity === entity) {
        return {
          pillY: items[i].pillY,
          calloutY: items[i].calloutY,
          suppressCallout: items[i].suppressCallout
        };
      }
    }
    return null;
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
        isExEvolved: Boolean(starInfo.isExEvolved),
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
        starTitle: starInfo.title || 'INITIATE',
        isExEvolved: Boolean(starInfo.isExEvolved),
        isExSprite: Boolean(starInfo.isExSprite),
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

    safeEnsureHeroLoaded(this._resolveActiveHeroKey(cfg));
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
    safeEnsureHeroLoaded(this._resolveActiveHeroKey(cfg));
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
        ent._squad = this;
        ent.level = level;
        ent.slotIndex = i;
        ent.star = starInfo.star;
        ent.isExEvolved = Boolean(starInfo.isExEvolved);
        if (activeHeroKey && ent.heroId !== activeHeroKey) {
          ent.heroId = activeHeroKey;
          ent.isEx = Boolean(activeHeroKey.endsWith('_ex'));
          safeEnsureHeroLoaded(activeHeroKey);
          ent.triggerAuraRing('buff', 1.45);
        }
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
          isExEvolved: Boolean(starInfo.isExEvolved)
        });
        ent._squad = this;
        ent.triggerAuraRing('summon', 1.35);
        safeEnsureHeroLoaded(activeHeroKey);
        nextEntities.push(ent);
      }
    }

    for (const [oldId, oldEnt] of existingById.entries()) {
      if (!keptIds.has(oldId) && oldEnt) {
        if (Array.isArray(oldEnt.activeProjectiles)) oldEnt.activeProjectiles.length = 0;
        if (Array.isArray(oldEnt.activeStrikes)) oldEnt.activeStrikes.length = 0;
        oldEnt.targetMonster = null;
      }
    }

    this.entities = nextEntities;
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

  _spawnUltEffect(effect) {
    if (!effect) return;
    while (this._ultEffects.length >= ULT_EFFECTS_MAX_COUNT) {
      this._ultEffects.shift();
    }
    this._ultEffects.push({
      age: 0,
      maxAge: clampNum(Number(effect.maxAge) || 0.72, 0.25, 4.0),
      ...effect
    });
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

  _findTarget(entity, player, aliveMonsters) {
    if (!aliveMonsters.length) return null;
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
      // Aethelgard: AEGIS BASTION — party shield + nearby monster taunt & bastion shockwave
      this.activeBuffTimers.shieldTimer = Math.max(this.activeBuffTimers.shieldTimer, 5.5);
      entity.triggerAuraRing('buff', 1.45);
      if (player) {
        this._spawnFloorRipple(player.x, player.groundY || 561, 'buff', 1.15, 1.12);
      }
      this._spawnStrikeFX(entity, 'shockwave', entity.x, entity.groundY - 12, '#38bdf8', entity.facing, 0.34, 1.25);

      for (const m of aliveMonsters) {
        const dx = Math.abs((m.x || 0) - entity.x);
        const dy = Math.abs((m.groundY || m.y || 561) - entity.groundY);
        if (dx <= 270 && dy <= 145) {
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
      return;
    }

    if (role === 'HEALER') {
      // Seraphina: SERAPHIC MEND — restores hero HP + radiant smite burst
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
        this._spawnStrikeFX(entity, 'pillar', tx, ty, '#fde047', entity.facing, 0.34, 1.1);
        this._applyCompanionDamage(entity, target, hit.dmg, hit.isCrit, 48, economy, game, { gaugeMult });
      }
      return;
    }

    if (role === 'BLASTER') {
      // Ignis Sol: SOLAR FLARE — scorching AoE flame burst across monster pack
      entity.triggerAuraRing('buff', 1.15);
      this._spawnFloorRipple(tx, ty, 'buff', 0.8, 1.25);
      this._spawnStrikeFX(entity, 'pillar', tx, ty, '#fb923c', entity.facing, 0.38, 1.35);
      this._spawnStrikeFX(entity, 'burst', tx, ty - 68, '#fde047', entity.facing, 0.32, 1.3);

      let hitCount = 0;
      for (const m of aliveMonsters) {
        if (hitCount >= 6) break;
        const dx = Math.abs((m.x || 0) - tx);
        const dy = Math.abs((m.groundY || m.y || 561) - ty);
        if (m === target || (dx <= 215 && dy <= 130)) {
          const splashMult = m === target ? 1.0 : 0.82;
          const hit = this._scaleHit(power.skillDmg * splashMult, m, stats, false, economy);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 72, economy, game, { gaugeMult });
          hitCount++;
        }
      }
      return;
    }

    if (role === 'ARCHER') {
      // Sylvanis: STARFALL VOLLEY — 3-bolt piercing salvo across up to 3 targets
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
      return;
    }

    if (role === 'LANCER') {
      // Freyja: VALKYRIE DIVE — lunging sky-lance thrust with heavy boss stagger
      entity.triggerAuraRing('buff', 1.15);
      if (target) {
        const lungeDist = clampNum((tx - entity.x) * 0.45, -110, 110);
        entity.x += lungeDist;
        entity.groundY = clampNum(entity.groundY + (ty - entity.groundY) * 0.5, 465, 655);
        entity.y = entity.groundY;
        const hit = this._scaleHit(power.skillDmg, target, stats, false, economy);
        this._spawnStrikeFX(entity, 'slash', tx, ty - 76, '#facc15', entity.facing, 0.32, 1.35);
        this._spawnStrikeFX(entity, 'shockwave', tx, ty - 8, '#fde047', entity.facing, 0.30, 1.15);
        this._applyCompanionDamage(entity, target, hit.dmg, hit.isCrit, 110, economy, game, { gaugeMult });
        if (typeof target.addStagger === 'function') {
          target.addStagger(55, entity, game);
        } else if (!this._isBossTarget(target)) {
          target.stunTimer = Math.max(target.stunTimer || 0, 0.45);
        }
      }
      return;
    }

    if (role === 'STRIKER') {
      // Kaze-Maru: IAIDO FLASH — guaranteed-crit rapid 3-slash single-target shredder
      entity.triggerAuraRing('buff', 1.05);
      if (target) {
        const dashDx = clampNum((tx - entity.x) * 0.55, -135, 135);
        entity.x += dashDx;
        entity.groundY = clampNum(ty, 465, 655);
        entity.y = entity.groundY;
        for (let s = 0; s < 3; s++) {
          const hit = this._scaleHit(power.skillDmg * 0.42, target, stats, true, economy);
          this._spawnStrikeFX(
            entity,
            'slash',
            tx + (s - 1) * 18,
            ty - 88 + s * 14,
            s === 1 ? '#fde047' : '#22d3ee',
            s % 2 === 0 ? entity.facing : -entity.facing,
            0.28 + s * 0.05,
            1.2
          );
          this._applyCompanionDamage(entity, target, hit.dmg, true, s === 2 ? 90 : 28, economy, game, { gaugeMult });
        }
      }
      return;
    }

    if (role === 'WEAVER') {
      // Chronos: CHRONO HASTE — temporal slow field on monsters + party haste acceleration
      this.activeBuffTimers.hasteTimer = Math.max(this.activeBuffTimers.hasteTimer, 6.0);
      entity.triggerAuraRing('buff', 1.45);
      if (player) {
        this._spawnFloorRipple(player.x, player.groundY || 561, 'buff', 1.2, 1.15);
      }
      this._spawnFloorRipple(tx, ty, 'summon', 1.1, 1.35);

      for (const m of aliveMonsters) {
        const dx = Math.abs((m.x || 0) - entity.x);
        if (dx <= 440) {
          m._chillTimer = Math.max(m._chillTimer || 0, 4.5);
          const hit = this._scaleHit(power.skillDmg * 0.72, m, stats, false, economy);
          this._spawnStrikeFX(entity, 'burst', m.x || tx, (m.groundY || ty) - 74, '#c084fc', entity.facing, 0.28, 0.95);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 35, economy, game, { gaugeMult });
        }
      }
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
          this._spawnStrikeFX(
            entity,
            'slash',
            tx + (s - 1) * 20,
            ty - 86 + s * 12,
            s === 1 ? '#38bdf8' : '#e879f9',
            s % 2 === 0 ? entity.facing : -entity.facing,
            0.28 + s * 0.05,
            1.25
          );
          this._applyCompanionDamage(entity, target, hit.dmg, true, s === 2 ? 84 : 26, economy, game, { gaugeMult });
        }
      }
      return;
    }

    if (role === 'REAPER') {
      // Malakor EX: SOUL SCYTHE - crimson reaping cleave + hero soul siphon heal
      entity.triggerAuraRing('buff', 1.25);
      this._spawnStrikeFX(entity, 'slash', tx, ty - 76, '#f43f5e', entity.facing, 0.36, 1.45);
      this._spawnStrikeFX(entity, 'shockwave', tx, ty - 10, '#c084fc', entity.facing, 0.34, 1.3);
      let cleaved = 0;
      for (const m of aliveMonsters) {
        if (cleaved >= 6) break;
        const dx = Math.abs((m.x || 0) - tx);
        const dy = Math.abs((m.groundY || m.y || 561) - ty);
        if (m === target || (dx <= 230 && dy <= 135)) {
          const hit = this._scaleHit(power.skillDmg * (m === target ? 1.0 : 0.84), m, stats, m === target, economy);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 82, economy, game, { gaugeMult });
          cleaved++;
        }
      }
      if (cleaved > 0 && player && !player.isDead && Number.isFinite(player.hp) && Number.isFinite(player.maxHp)) {
        const healAmt = Math.max(20, Math.round(player.maxHp * 0.06));
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
      }
      return;
    }

    if (role === 'CRYO MAGE') {
      // Lyra EX: GLACIAL SPIRE - chilling cryo burst freezing monster pack
      entity.triggerAuraRing('buff', 1.2);
      this._spawnFloorRipple(tx, ty, 'summon', 0.9, 1.3);
      this._spawnStrikeFX(entity, 'pillar', tx, ty, '#67e8f9', entity.facing, 0.38, 1.35);
      this._spawnStrikeFX(entity, 'burst', tx, ty - 68, '#e0f2fe', entity.facing, 0.32, 1.25);
      let hitCount = 0;
      for (const m of aliveMonsters) {
        if (hitCount >= 7) break;
        const dx = Math.abs((m.x || 0) - tx);
        const dy = Math.abs((m.groundY || m.y || 561) - ty);
        if (m === target || (dx <= 235 && dy <= 135)) {
          m._chillTimer = Math.max(m._chillTimer || 0, 4.5);
          const hit = this._scaleHit(power.skillDmg * (m === target ? 1.0 : 0.84), m, stats, false, economy);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 62, economy, game, { gaugeMult });
          hitCount++;
        }
      }
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
      return;
    }

    // BRAWLER (Raijin EX): THUNDER BARRAGE - lightning-fist shockwave barrage
    entity.triggerAuraRing('buff', 1.2);
    this._spawnStrikeFX(entity, 'pillar', tx, ty, '#fbbf24', entity.facing, 0.34, 1.25);
    this._spawnStrikeFX(entity, 'shockwave', entity.x + entity.facing * 42, entity.groundY - 10, '#38bdf8', entity.facing, 0.34, 1.35);
    for (const m of aliveMonsters) {
      const dx = Math.abs((m.x || 0) - tx);
      const dy = Math.abs((m.groundY || m.y || 561) - ty);
      if (m === target || (dx <= 200 && dy <= 125)) {
        const hit = this._scaleHit(power.skillDmg * (m === target ? 1.0 : 0.78), m, stats, false, economy);
        this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 88, economy, game, { gaugeMult });
        if (typeof m.addStagger === 'function') {
          m.addStagger(36, entity, game);
        }
      }
    }
  }

  _triggerRoleUltimate(entity, player, leadTarget, aliveMonsters, power, stats, economy, game) {
    if (!entity || !aliveMonsters.length) return 0;

    const cfg = entity.cfg || ROSTER_BY_ID[entity.companionId] || {};
    const role = entity.role;
    const target = leadTarget || aliveMonsters[0];
    const tx = Number.isFinite(target?.x) ? target.x : entity.x + entity.facing * 180;
    const ty = Number.isFinite(target?.groundY) ? target.groundY : entity.groundY;
    const ultColor = cfg.ultColor || entity.primaryColor || '#facc15';
    const ultSubColor = cfg.ultSubColor || '#fef08a';
    const callout = cfg.ultName || `${entity.name} OVERDRIVE!`;

    if (Math.abs(tx - entity.x) > 4) {
      entity.facing = tx >= entity.x ? 1 : -1;
    }

    entity.ultCharge = 0;
    entity.ultFlashTimer = ULT_FLASH_DURATION;
    entity.isCastingUlt = true;
    if (entity.state === 'SKILL') {
      if (entity.didSkillHit && !entity._castingUltState) {
        entity.skillCooldown = entity.skillMaxCooldown;
      }
      entity.stateTimer = 0;
      entity.animFrame = 0;
      entity.didActionHit = false;
      entity.skillBeatMask = 0;
    } else {
      entity.setState('SKILL');
    }
    entity._castingUltState = true;
    entity.didSkillHit = true;

    this._getEvo()?.addOverdriveCharge?.(14, this.activeSlots.length);
    entity.triggerAuraRing(role === 'HEALER' ? 'heal' : 'buff', 1.45);
    entity.triggerCallout(callout, ultColor, 1.55, true);

    // Play crisp AudioManager SFX (verified WAV-backed keys)
    game?.audio?.play?.('ult_cast', entity.x);
    if (cfg.ultSfx && cfg.ultSfx !== 'ult_cast') {
      game?.audio?.play?.(cfg.ultSfx, tx);
    }

    // Sort living targets closest to impact/caster so multi-target Ultimates feel responsive
    const sortedTargets = [...aliveMonsters].sort((a, b) => {
      const da = Math.abs((a.x || 0) - tx) + Math.abs((a.groundY || a.y || 561) - ty) * 0.3;
      const db = Math.abs((b.x || 0) - tx) + Math.abs((b.groundY || b.y || 561) - ty) * 0.3;
      return da - db;
    });

    const baseUltDmg = safeBoundedInt(
      power.ultDmg || Math.round(power.skillDmg * 2.1),
      4,
      ENDLESS_COMPANION_MAX_STAT
    );
    let totalDealt = 0;

    // Signature gold/role starburst flare on caster
    this._spawnUltEffect({
      kind: 'atlas_burst',
      row: 4,
      x: entity.x,
      y: entity.groundY - 72,
      scale: 1.35,
      color: ultColor,
      subColor: ultSubColor,
      maxAge: 0.72
    });

    if (role === 'TANK') {
      // Aethelgard: AEGIS CATACLYSM! — fortress shield + massive sky-cathedral bastion shatter across lane
      this.activeBuffTimers.shieldTimer = Math.max(this.activeBuffTimers.shieldTimer, 7.5);
      if (player) {
        this._spawnFloorRipple(player.x, player.groundY || 561, 'buff', 1.35, 1.35);
      }
      this._spawnFloorRipple(tx, ty, 'summon', 1.15, 1.55);
      this._spawnUltEffect({
        kind: 'sky_cataclysm',
        x: tx,
        y: ty,
        width: 56,
        height: 360,
        color: '#38bdf8',
        subColor: '#fef08a',
        maxAge: 0.85
      });
      this._spawnUltEffect({
        kind: 'lane_beam',
        x0: entity.x - 160,
        x1: entity.x + entity.facing * 520,
        y: entity.groundY - 26,
        thickness: 22,
        color: '#38bdf8',
        subColor: '#fef08a',
        maxAge: 0.68
      });
      this._spawnUltEffect({
        kind: 'atlas_burst',
        row: 2,
        x: tx,
        y: ty - 62,
        scale: 1.75,
        color: '#38bdf8',
        subColor: '#fef08a',
        maxAge: 0.78
      });

      const targets = sortedTargets.slice(0, 8);
      for (const m of targets) {
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 640) continue;
        m._tauntedTimer = Math.max(m._tauntedTimer || 0, 5.5);
        m._tauntTarget = entity;
        const mult = m === target ? 1.0 : 0.84;
        const hit = this._scaleHit(baseUltDmg * mult, m, stats, m === target, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 125, economy, game, {
          fromUlt: true
        });
        this._spawnStrikeFX(entity, 'shockwave', m.x || tx, (m.groundY || ty) - 10, '#38bdf8', entity.facing, 0.42, 1.45);
        if (typeof m.addStagger === 'function') {
          m.addStagger(85, entity, game);
        }
      }
      return totalDealt;
    }

    if (role === 'HEALER') {
      // Seraphina: SERAPHIC NOVA! — massive hero sanctuary heal + celestial judgment columns across battlefield
      if (player && !player.isDead && Number.isFinite(player.hp) && Number.isFinite(player.maxHp)) {
        const pctHeal = Math.round(player.maxHp * 0.32);
        const healAmt = Math.max(Math.round(power.healAmount * 2.2), pctHeal);
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
        const mx = Number.isFinite(m.x) ? m.x : tx;
        const my = Number.isFinite(m.groundY) ? m.groundY : ty;
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.0 : 0.82), m, stats, i === 0, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 82, economy, game, {
          fromUlt: true
        });
        if (i < 4) {
          this._spawnUltEffect({
            kind: 'sky_cataclysm',
            x: mx,
            y: my,
            width: 44,
            height: 340,
            color: '#fde047',
            subColor: '#4ade80',
            maxAge: 0.78
          });
          this._spawnUltEffect({
            kind: 'atlas_burst',
            row: 3,
            x: mx,
            y: my - 72,
            scale: 1.5,
            color: '#fde047',
            subColor: '#ffffff',
            maxAge: 0.68
          });
        }
      }
      return totalDealt;
    }

    if (role === 'BLASTER') {
      // Ignis Sol: SOLAR APOCALYPSE! — triple colossal solar pillars + blazing ember shockwaves
      const targets = sortedTargets.slice(0, 10);
      for (let k = -1; k <= 1; k++) {
        const cx = tx + k * 115;
        this._spawnFloorRipple(cx, ty, 'buff', 1.05, 1.45);
        this._spawnUltEffect({
          kind: 'sky_cataclysm',
          x: cx,
          y: ty,
          width: k === 0 ? 64 : 44,
          height: 380,
          color: '#fb923c',
          subColor: '#fde047',
          maxAge: 0.88
        });
      }
      this._spawnUltEffect({
        kind: 'atlas_burst',
        row: 4,
        x: tx,
        y: ty - 84,
        scale: 1.85,
        color: '#fb923c',
        subColor: '#fde047',
        maxAge: 0.82
      });

      for (const m of targets) {
        if (m !== target && Math.abs((m.x || 0) - tx) > 380) continue;
        const mult = m === target ? 1.05 : 0.88;
        const hit = this._scaleHit(baseUltDmg * mult, m, stats, m === target, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 118, economy, game, {
          fromUlt: true
        });
        this._spawnStrikeFX(entity, 'burst', m.x || tx, (m.groundY || ty) - 70, '#fb923c', entity.facing, 0.42, 1.55);
      }
      return totalDealt;
    }

    if (role === 'ARCHER') {
      // Sylvanis: STARFALL VOLLEY! — piercing starlight lane beam + sky-arrow barrage across all monsters
      const targets = sortedTargets.slice(0, 8);
      this._spawnUltEffect({
        kind: 'lane_beam',
        x0: entity.x + entity.facing * 24,
        x1: entity.x + entity.facing * 640,
        y: ty - 74,
        thickness: 20,
        color: '#34d399',
        subColor: '#fef08a',
        maxAge: 0.72
      });

      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 780) continue;
        const mx = Number.isFinite(m.x) ? m.x : tx;
        const my = Number.isFinite(m.groundY) ? m.groundY : ty;
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.0 : 0.82), m, stats, i < 2, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 68, economy, game, {
          fromUlt: true
        });
        if (i < 4) {
          this._spawnUltEffect({
            kind: 'atlas_burst',
            row: 3,
            x: mx,
            y: my - 72,
            scale: 1.45,
            color: '#34d399',
            subColor: '#fef08a',
            maxAge: 0.65
          });
          this._spawnStrikeFX(entity, 'pillar', mx, my, '#34d399', entity.facing, 0.36, 1.25);
        }
      }
      // Bonus visual starfall tracer arrows flying down-lane
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
      return totalDealt;
    }

    if (role === 'LANCER') {
      // Freyja: VALKYRIE VALHALLA! — sky-lance judgment spear beam + gilded valkyrie shockwave across lane
      this._spawnUltEffect({
        kind: 'lane_beam',
        x0: entity.x - entity.facing * 40,
        x1: entity.x + entity.facing * 580,
        y: ty - 68,
        thickness: 28,
        color: '#facc15',
        subColor: '#38bdf8',
        maxAge: 0.78
      });
      this._spawnUltEffect({
        kind: 'sky_cataclysm',
        x: tx,
        y: ty,
        width: 50,
        height: 360,
        color: '#facc15',
        subColor: '#38bdf8',
        maxAge: 0.82
      });
      this._spawnUltEffect({
        kind: 'atlas_burst',
        row: 2,
        x: tx,
        y: ty - 66,
        scale: 1.75,
        color: '#facc15',
        subColor: '#38bdf8',
        maxAge: 0.78
      });

      const targets = sortedTargets.slice(0, 8);
      for (const m of targets) {
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 660) continue;
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.05 : 0.85), m, stats, m === target, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 145, economy, game, {
          fromUlt: true
        });
        this._spawnStrikeFX(entity, 'slash', m.x || tx, (m.groundY || ty) - 76, '#facc15', entity.facing, 0.42, 1.55);
        if (typeof m.addStagger === 'function') {
          m.addStagger(110, entity, game);
        } else if (!this._isBossTarget(m)) {
          m.stunTimer = Math.max(m.stunTimer || 0, 0.75);
        }
      }
      return totalDealt;
    }

    if (role === 'STRIKER') {
      // Kaze-Maru: SHOGUN TEMPEST! — guaranteed-crit razor iaido cyclone & twin cross-tempest slashes
      this._spawnUltEffect({
        kind: 'lane_beam',
        x0: entity.x - 100,
        x1: entity.x + entity.facing * 560,
        y: ty - 76,
        thickness: 18,
        color: '#22d3ee',
        subColor: '#fef08a',
        maxAge: 0.68
      });

      const targets = sortedTargets.slice(0, 8);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 640) continue;
        const mx = Number.isFinite(m.x) ? m.x : tx;
        const my = Number.isFinite(m.groundY) ? m.groundY : ty;
        // Guaranteed critical Shogun iaido cuts
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.05 : 0.82), m, stats, true, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, true, 108, economy, game, {
          fromUlt: true
        });
        if (i < 4) {
          this._spawnUltEffect({
            kind: 'cross_tempest',
            x: mx,
            y: my - 78,
            span: 68,
            color: '#22d3ee',
            subColor: '#fef08a',
            maxAge: 0.74
          });
          this._spawnUltEffect({
            kind: 'atlas_burst',
            row: 3,
            x: mx,
            y: my - 78,
            scale: 1.55,
            color: '#22d3ee',
            subColor: '#fef08a',
            maxAge: 0.66
          });
        }
      }
      return totalDealt;
    }

    if (role === 'WEAVER') {
      // Chronos: CHRONO RIFT! — party overdrive haste + temporal rift freeze & clockwork pillars across lane
      this.activeBuffTimers.hasteTimer = Math.max(this.activeBuffTimers.hasteTimer, 8.5);
      if (player) {
        this._spawnFloorRipple(player.x, player.groundY || 561, 'buff', 1.4, 1.35);
      }
      this._spawnFloorRipple(tx, ty, 'summon', 1.35, 1.65);
      this._spawnUltEffect({
        kind: 'cross_tempest',
        x: tx,
        y: ty - 84,
        span: 86,
        color: '#c084fc',
        subColor: '#38bdf8',
        maxAge: 0.86
      });
      this._spawnUltEffect({
        kind: 'sky_cataclysm',
        x: tx,
        y: ty,
        width: 54,
        height: 360,
        color: '#c084fc',
        subColor: '#38bdf8',
        maxAge: 0.84
      });

      const targets = sortedTargets.slice(0, 10);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 740) continue;
        m._chillTimer = Math.max(m._chillTimer || 0, 6.5);
        if (!this._isBossTarget(m)) {
          m.stunTimer = Math.max(m.stunTimer || 0, 0.7);
        }
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.0 : 0.82), m, stats, i === 0, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 65, economy, game, {
          fromUlt: true
        });
        if (i < 4) {
          this._spawnUltEffect({
            kind: 'atlas_burst',
            row: 3,
            x: m.x || tx,
            y: (m.groundY || ty) - 74,
            scale: 1.45,
            color: '#c084fc',
            subColor: '#38bdf8',
            maxAge: 0.70
          });
        }
      }
      return totalDealt;
    }

    if (role === 'ASSASSIN') {
      // Nyx EX: ECLIPSE REQUIEM! - void cross-slash barrage across living foes
      this._spawnUltEffect({
        kind: 'lane_beam',
        x0: entity.x - 90,
        x1: entity.x + entity.facing * 580,
        y: ty - 76,
        thickness: 20,
        color: '#e879f9',
        subColor: '#38bdf8',
        maxAge: 0.72
      });
      const targets = sortedTargets.slice(0, 8);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 680) continue;
        const mx = Number.isFinite(m.x) ? m.x : tx;
        const my = Number.isFinite(m.groundY) ? m.groundY : ty;
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.08 : 0.85), m, stats, true, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, true, 112, economy, game, {
          fromUlt: true
        });
        if (i < 4) {
          this._spawnUltEffect({
            kind: 'cross_tempest',
            x: mx,
            y: my - 78,
            span: 74,
            color: '#e879f9',
            subColor: '#38bdf8',
            maxAge: 0.76
          });
        }
      }
      return totalDealt;
    }

    if (role === 'REAPER') {
      // Malakor EX: ABYSSAL HARVEST! - crimson soul cataclysm + hero siphon heal
      this._spawnFloorRipple(tx, ty, 'buff', 1.25, 1.55);
      this._spawnUltEffect({
        kind: 'sky_cataclysm',
        x: tx,
        y: ty,
        width: 58,
        height: 380,
        color: '#f43f5e',
        subColor: '#c084fc',
        maxAge: 0.84
      });
      this._spawnUltEffect({
        kind: 'cross_tempest',
        x: tx,
        y: ty - 78,
        span: 84,
        color: '#f43f5e',
        subColor: '#c084fc',
        maxAge: 0.80
      });
      const targets = sortedTargets.slice(0, 10);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 680) continue;
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.08 : 0.86), m, stats, i < 2, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 124, economy, game, {
          fromUlt: true
        });
        if (i < 4) {
          this._spawnStrikeFX(entity, 'slash', m.x || tx, (m.groundY || ty) - 74, '#f43f5e', entity.facing, 0.4, 1.5);
        }
      }
      if (player && !player.isDead && Number.isFinite(player.hp) && Number.isFinite(player.maxHp)) {
        const healAmt = Math.max(40, Math.round(player.maxHp * 0.12));
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
      }
      return totalDealt;
    }

    if (role === 'CRYO MAGE') {
      // Lyra EX: ABSOLUTE ZERO! - triple glacial pillars + deep cryo freeze across lane
      for (let k = -1; k <= 1; k++) {
        const cx = tx + k * 118;
        this._spawnFloorRipple(cx, ty, 'summon', 1.1, 1.45);
        this._spawnUltEffect({
          kind: 'sky_cataclysm',
          x: cx,
          y: ty,
          width: k === 0 ? 60 : 44,
          height: 370,
          color: '#67e8f9',
          subColor: '#e0f2fe',
          maxAge: 0.86
        });
      }
      const targets = sortedTargets.slice(0, 10);
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 740) continue;
        m._chillTimer = Math.max(m._chillTimer || 0, 6.5);
        if (!this._isBossTarget(m)) {
          m.stunTimer = Math.max(m.stunTimer || 0, 0.85);
        }
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.05 : 0.86), m, stats, i < 2, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 96, economy, game, {
          fromUlt: true
        });
      }
      return totalDealt;
    }

    if (role === 'VANGUARD') {
      // Aegis-09 EX: OMEGA RAILCANNON! - heavy orbital lane beam + railgun lightning arcs
      this._spawnUltEffect({
        kind: 'lane_beam',
        x0: entity.x - entity.facing * 36,
        x1: entity.x + entity.facing * 720,
        y: ty - 74,
        thickness: 32,
        color: '#22d3ee',
        subColor: '#facc15',
        maxAge: 0.84
      });
      this._spawnUltEffect({
        kind: 'atlas_burst',
        row: 2,
        x: tx,
        y: ty - 70,
        scale: 1.9,
        color: '#22d3ee',
        subColor: '#facc15',
        maxAge: 0.82
      });
      const targets = sortedTargets.slice(0, 10);
      let prevX = entity.x + entity.facing * 24;
      let prevY = entity.groundY - 78;
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        if (m !== target && Math.abs((m.x || 0) - entity.x) > 760) continue;
        const mx = Number.isFinite(m.x) ? m.x : tx;
        const my = Number.isFinite(m.groundY) ? m.groundY : ty;
        const hit = this._scaleHit(baseUltDmg * (m === target ? 1.1 : 0.88), m, stats, i < 2, economy);
        totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 140, economy, game, {
          fromUlt: true
        });
        if (typeof m.addStagger === 'function') {
          m.addStagger(115, entity, game);
        }
        if (i < 5) {
          this._spawnUltEffect({
            kind: 'thunder_chain',
            x0: prevX,
            y0: prevY,
            x1: mx,
            y1: my - 72,
            color: i % 2 === 0 ? '#22d3ee' : '#facc15',
            subColor: '#ffffff',
            seed: i + 3 + Math.floor(this._time * 10),
            maxAge: 0.64
          });
          prevX = mx;
          prevY = my - 72;
        }
      }
      return totalDealt;
    }

    // BRAWLER (Raijin EX): RAIJIN THUNDERCLAP! - cascading gilded-cyan thunderbolts & sky-smite barrage
    this._spawnFloorRipple(tx, ty, 'buff', 1.2, 1.55);
    this._spawnUltEffect({
      kind: 'atlas_burst',
      row: 2,
      x: tx,
      y: ty - 68,
      scale: 1.9,
      color: '#fbbf24',
      subColor: '#38bdf8',
      maxAge: 0.84
    });
    this._spawnUltEffect({
      kind: 'sky_cataclysm',
      x: tx,
      y: ty,
      width: 58,
      height: 380,
      color: '#fbbf24',
      subColor: '#38bdf8',
      maxAge: 0.82
    });

    const targets = sortedTargets.slice(0, 8);
    let prevX = entity.x;
    let prevY = entity.groundY - 76;
    for (let i = 0; i < targets.length; i++) {
      const m = targets[i];
      if (m !== target && Math.abs((m.x || 0) - entity.x) > 680) continue;
      const mx = Number.isFinite(m.x) ? m.x : tx;
      const my = Number.isFinite(m.groundY) ? m.groundY : ty;
      const hit = this._scaleHit(baseUltDmg * (m === target ? 1.05 : 0.86), m, stats, i < 2, economy);
      totalDealt += this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 132, economy, game, {
        fromUlt: true
      });
      if (typeof m.addStagger === 'function') {
        m.addStagger(95, entity, game);
      }
      if (i < 5) {
        this._spawnUltEffect({
          kind: 'thunder_chain',
          x0: prevX,
          y0: prevY,
          x1: mx,
          y1: my - 72,
          color: i % 2 === 0 ? '#fbbf24' : '#38bdf8',
          subColor: '#ffffff',
          seed: i + 1 + Math.floor(this._time * 10),
          maxAge: 0.62
        });
        prevX = mx;
        prevY = my - 72;
      }
    }
    return totalDealt;
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

    // Synchronize all deployed allies into heroic Row 4 ULTIMATE pose + converging pixel beams
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

      const beamEndX = Number.isFinite(leadTarget?.x)
        ? leadTarget.x + ent.facing * 120
        : ent.x + ent.facing * 620;
      this._spawnUltEffect({
        kind: 'lane_beam',
        x0: ent.x,
        x1: beamEndX,
        y: ent.groundY - 72,
        thickness: 24,
        color: ent.primaryColor || '#facc15',
        subColor: '#fef08a',
        maxAge: 0.78
      });
      this._spawnUltEffect({
        kind: 'atlas_burst',
        row: 4,
        x: ent.x,
        y: ent.groundY - 72,
        scale: 1.45,
        color: '#facc15',
        subColor: '#ffffff',
        maxAge: 0.72
      });
    }

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
        this._spawnUltEffect({
          kind: i % 2 === 0 ? 'sky_cataclysm' : 'cross_tempest',
          x: mx,
          y: i % 2 === 0 ? my : my - 74,
          width: isBoss ? 68 : 52,
          height: 390,
          span: 86,
          color: '#f43f5e',
          subColor: '#facc15',
          maxAge: 0.86
        });
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
        this._spawnStrikeFX(
          entity,
          'burst',
          hitMonster.x,
          (hitMonster.groundY || entity.groundY) - 70,
          p.color,
          p.vx < 0 ? -1 : 1,
          0.22,
          p.isCrit ? 1.15 : 0.85
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

    const aliveMonsters = Array.isArray(monsters)
      ? monsters.filter((m) => m && !m.isDead && !(Number.isFinite(m.hp) && m.hp <= 0))
      : [];

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

    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      const st = this.rosterState[ent.companionId];
      if (st?.unlocked) {
        ent.level = Math.max(1, Math.floor(Number(st.level) || 1));
      }

      // Dynamic Star & EX Sprite hot-swap synchronization
      const starInfo = this._getStarInfo(ent.companionId);
      ent.star = starInfo.star;
      ent.isExEvolved = Boolean(starInfo.isExEvolved);
      const activeKey = this._resolveActiveHeroKey(ent.cfg);
      if (activeKey && ent.heroId !== activeKey) {
        ent.heroId = activeKey;
        ent.isEx = Boolean(activeKey.endsWith('_ex'));
        safeEnsureHeroLoaded(activeKey);
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

      // Squad Formation slot around the hero (falls back to role-aware offsets if evo absent)
      const slotOff = evo && typeof evo.getSlotOffset === 'function' ? evo.getSlotOffset(i) : null;
      const offsetX =
        slotOff && Number.isFinite(slotOff.dx)
          ? slotOff.dx
          : ent.role === 'TANK'
            ? 56
            : ent.isRanged
              ? -(98 + i * 20)
              : -(54 + i * 24);
      const offsetY =
        slotOff && Number.isFinite(slotOff.dy)
          ? slotOff.dy
          : FORMATION_LANE_OFFSETS[i % FORMATION_LANE_OFFSETS.length];
      const rawFormX = px + offsetX * pFacing;
      const formX =
        bounds && Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX)
          ? clampNum(rawFormX, bounds.minX + 28, bounds.maxX - 28)
          : rawFormX;
      const formY = clampNum(py + offsetY, minLaneY, maxLaneY);

      const distToPlayerX = Math.abs(px - ent.x);
      if (!Number.isFinite(ent.x) || !Number.isFinite(ent.groundY) || distToPlayerX > 960) {
        ent.x = formX;
        ent.groundY = formY;
        ent.y = formY;
        ent.facing = pFacing;
        ent._castingUltState = false;
        ent.targetMonster = null;
        ent.setState('IDLE');
        ent.triggerAuraRing('summon', 1.0);
        continue;
      }

      const target = this._findTarget(ent, player, aliveMonsters);
      ent.targetMonster = target;

      // Trigger signature Role Ultimate Assist burst immediately at 100% charge when monsters exist
      if (ent.ultCharge >= 100 && aliveMonsters.length > 0 && !ent.isCastingUlt && ent.state !== 'ULTIMATE') {
        const power = this.computeCompanionPower(ent.companionId, ent.level, economy, stats, synMods);
        const ultLead = target || aliveMonsters[0];
        this._triggerRoleUltimate(ent, player, ultLead, aliveMonsters, power, stats, economy, game);
      }

      // Rapid catch-up sprint whenever player surges far ahead
      if (distToPlayerX > 380 && ent.state !== 'SKILL' && ent.state !== 'ULTIMATE') {
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
        if (target && Math.abs((target.x || 0) - ent.x) > 4) {
          ent.facing = target.x >= ent.x ? 1 : -1;
        }
        if (ent.stateTimer >= (ent.ultDuration || 1.15)) {
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
          if (target) {
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
            } else {
              this._applyCompanionDamage(ent, target, hit.dmg, hit.isCrit, 48, economy, game, {
                gaugeMult,
                overdriveGain: 4
              });
              this._spawnStrikeFX(
                ent,
                ent.role === 'BRAWLER' ? 'burst' : 'slash',
                target.x,
                (target.groundY || ent.groundY) - 76,
                ent.primaryColor,
                ent.facing,
                0.24,
                hit.isCrit ? 1.15 : 0.9
              );
            }
          }
        }
        if (ent.stateTimer >= ent.autoDuration) {
          ent.attackCooldown = Math.max(0.16, ent.cfg.attackInterval - ent.autoDuration * 0.45);
          ent.setState('IDLE');
        }
      } else {
        // IDLE / WALK decision pass
        const shiftDx = formX - ent.x;
        const shiftDy = formY - ent.groundY;
        const shiftDist = Math.hypot(shiftDx, shiftDy);
        if (this._formationShiftTimer > 0 && shiftDist > 18) {
          const shiftSpd = 340 * moveBoost;
          ent.x += (shiftDx / shiftDist) * Math.min(shiftDist, shiftSpd * safeDt);
          ent.groundY = clampNum(
            ent.groundY + (shiftDy / shiftDist) * Math.min(Math.abs(shiftDy), shiftSpd * 0.72 * safeDt),
            minLaneY,
            maxLaneY
          );
          ent.facing = Math.abs(shiftDx) > 6 ? (shiftDx > 0 ? 1 : -1) : pFacing;
          ent.moveDir = 1;
          ent.setState('WALK');
          ent.walkPhase += safeDt * 5.0;
          ent.animFrame = (ent.animFrame + safeDt * 26) % 30;
        } else {
          const playerNeedsHeal = Boolean(
            ent.role === 'HEALER' &&
              player &&
              !player.isDead &&
              Number.isFinite(player.hp) &&
              Number.isFinite(player.maxHp) &&
              player.hp < player.maxHp * 0.88
          );
          const targetDistX = target ? Math.abs((target.x || 0) - ent.x) : Infinity;
          const targetDistY = target
            ? Math.abs((Number.isFinite(target.groundY) ? target.groundY : py) - ent.groundY)
            : Infinity;
          const skillRange = Math.max(ent.attackRange + 55, 220);

          if (
            ent.skillCooldown <= 0 &&
            (playerNeedsHeal ||
              (target &&
                (targetDistX <= skillRange ||
                  ((ent.role === 'TANK' || ent.role === 'WEAVER') && targetDistX <= 460))))
          ) {
            if (target && Math.abs((target.x || 0) - ent.x) > 4) {
              ent.facing = target.x >= ent.x ? 1 : -1;
            }
            ent.setState('SKILL');
          } else if (target) {
            const laneTol = ent.isRanged ? 120 : 54;
            if (targetDistX <= ent.attackRange && targetDistY <= laneTol) {
              if (Math.abs((target.x || 0) - ent.x) > 4) {
                ent.facing = target.x >= ent.x ? 1 : -1;
              }
              if (ent.attackCooldown <= 0) {
                ent.setState('AUTO_ATTACK');
              } else {
                ent.setState('IDLE');
                ent.animFrame = (ent.animFrame + safeDt * 12) % 30;
              }
            } else {
              const desiredStandX =
                target.x - Math.sign(target.x - ent.x || ent.facing || 1) * (ent.attackRange * 0.78);
              const desiredStandY = ent.isRanged
                ? formY
                : clampNum(Number.isFinite(target.groundY) ? target.groundY : formY, minLaneY, maxLaneY);
              const dx = desiredStandX - ent.x;
              const dy = desiredStandY - ent.groundY;
              const dist = Math.hypot(dx, dy) || 1;
              const walkSpd = (ent.isRanged ? 235 : 268) * moveBoost;
              ent.x += (dx / dist) * Math.min(dist, walkSpd * safeDt);
              ent.groundY = clampNum(
                ent.groundY + (dy / dist) * Math.min(Math.abs(dy), walkSpd * 0.62 * safeDt),
                minLaneY,
                maxLaneY
              );
              ent.facing = (target.x || 0) >= ent.x ? 1 : -1;
              ent.moveDir = dx * ent.facing >= 0 ? 1 : -1;
              ent.setState('WALK');
              ent.walkPhase += safeDt * 4.4;
              ent.animFrame = (ent.animFrame + safeDt * 24) % 30;
            }
          } else {
            // Follow tidy Squad Formation around player
            const dx = formX - ent.x;
            const dy = formY - ent.groundY;
            const dist = Math.hypot(dx, dy);
            if (dist > 14) {
              const followSpd = 255 * moveBoost;
              ent.x += (dx / dist) * Math.min(dist, followSpd * safeDt);
              ent.groundY = clampNum(
                ent.groundY + (dy / dist) * Math.min(Math.abs(dy), followSpd * 0.65 * safeDt),
                minLaneY,
                maxLaneY
              );
              ent.facing = Math.abs(dx) > 6 ? (dx > 0 ? 1 : -1) : pFacing;
              ent.moveDir = 1;
              ent.setState('WALK');
              ent.walkPhase += safeDt * 4.2;
              ent.animFrame = (ent.animFrame + safeDt * 24) % 30;
            } else {
              ent.facing = pFacing;
              ent.setState('IDLE');
              ent.animFrame = (ent.animFrame + safeDt * 11) % 30;
            }
          }
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
    const assets = getSafePixelForgeAssets();
    const rawVfx = assets?.endlessVfx || null;
    const vfxImg = rawVfx ? PixelForge.ensureImage?.(rawVfx) || rawVfx : null;
    const hasVfx = Boolean(
      vfxImg &&
        vfxImg.complete &&
        (vfxImg.naturalWidth || vfxImg.width) >= 1536 &&
        (vfxImg.naturalHeight || vfxImg.height) >= 768
    );

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const ent of this.entities) {
      // Sovereign EX stepped pixel ground aura under Star 3+ deployed companions (fillRect only)
      if ((ent.star >= 3 || ent.isExEvolved) && typeof ctx.fillRect === 'function') {
        const pulse = 0.94 + 0.08 * Math.sin(this._time * 5.2 + ent.slotIndex * 1.1);
        const outerHex =
          ent.star >= 5 ? '#f43f5e' : ent.star >= 4 ? '#facc15' : ent.primaryColor || '#38bdf8';
        const innerHex = ent.star >= 5 ? '#fef08a' : ent.star >= 4 ? '#ffffff' : '#fef08a';
        const rx = Math.round(52 * pulse);
        const ry = Math.round(17 * pulse);
        const cy = ent.groundY + 2;
        drawSteppedPixelAuraRing(ctx, ent.x, cy, rx, ry, outerHex, innerHex, 0.56);
        const phase = this._time * 1.45 + ent.slotIndex * 0.9;
        for (let k = 0; k < 4; k++) {
          const ang = phase + (k * Math.PI) / 2;
          const ox = Math.round(ent.x + Math.cos(ang) * rx);
          const oy = Math.round(cy + Math.sin(ang) * ry);
          drawPixelDiamond(ctx, ox, oy, 4, '#0d0f1c');
          drawPixelDiamond(ctx, ox, oy, 2, innerHex);
        }
      }

      if (ent.isCastingUlt || ent.ultFlashTimer > 0) {
        const u = clampNum((ent.ultFlashTimer || 0) / ULT_FLASH_DURATION, 0, 1);
        const burstScale = 1.24 + (1 - u) * 0.24;
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

    ctx.restore();
  }

  renderForegroundFX(ctx, _renderer = null) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;

    const assets = getSafePixelForgeAssets();
    const rawVfx = assets?.endlessVfx || null;
    const vfxImg = rawVfx ? PixelForge.ensureImage?.(rawVfx) || rawVfx : null;
    const hasVfx = Boolean(
      vfxImg &&
        vfxImg.complete &&
        (vfxImg.naturalWidth || vfxImg.width) >= 1536 &&
        (vfxImg.naturalHeight || vfxImg.height) >= 768
    );

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const ent of this.entities) {
      // 1. Crisp ranged pixel bolts & arrows (multi-pass dark selout -> accent -> white core)
      ctx.globalAlpha = 1;
      for (const p of ent.activeProjectiles) {
        const px = Math.round(p.x);
        const py = Math.round(p.y);
        const speed = Math.hypot(p.vx, p.vy) || 1;
        const nx = p.vx / speed;
        const ny = p.vy / speed;
        const tailLen = p.style === 'arrow' ? 28 : 22;

        // Pass 1: dark selout body & tail
        ctx.fillStyle = '#0d0f1c';
        for (let s = 0; s <= 4; s++) {
          const frac = s / 4;
          const bx = Math.round(px - nx * tailLen * frac);
          const by = Math.round(py - ny * tailLen * frac);
          const sz = Math.max(4, 10 - s * 2);
          ctx.fillRect(bx - Math.round(sz * 0.5) - 1, by - Math.round(sz * 0.5) - 1, sz + 2, sz + 2);
        }

        // Pass 2: colored energy streak
        ctx.fillStyle = p.color;
        for (let s = 0; s <= 4; s++) {
          const frac = s / 4;
          const bx = Math.round(px - nx * tailLen * frac);
          const by = Math.round(py - ny * tailLen * frac);
          const sz = Math.max(3, 8 - s * 1.5);
          const isz = Math.round(sz);
          ctx.fillRect(bx - Math.round(isz * 0.5), by - Math.round(isz * 0.5), isz, isz);
        }

        // Pass 3: incandescent white core + 4-pt pixel glint tip
        ctx.fillStyle = p.coreColor || '#ffffff';
        ctx.fillRect(px - 3, py - 3, 6, 6);
        ctx.fillRect(px - 7, py - 1, 14, 2);
        ctx.fillRect(px - 1, py - 7, 2, 14);
      }

      // 2. Crisp pixel melee slashes, starbursts, vertical pillars & ground shockwaves
      for (const st of ent.activeStrikes) {
        const u = clampNum(st.age / st.maxAge, 0, 1);
        const alpha = u < 0.25 ? 1 : clampNum(1 - (u - 0.25) / 0.75, 0, 1);
        if (alpha <= 0.03) continue;
        const sx = Math.round(st.x);
        const sy = Math.round(st.y);
        const sc = st.scale || 1;

        ctx.globalAlpha = alpha;

        if (st.kind === 'slash') {
          const steps = 7;
          const spanX = Math.round(32 * sc);
          const spanY = Math.round(28 * sc);
          // Separate full-geometry passes: dark selout -> accent -> white core
          ctx.fillStyle = '#0d0f1c';
          for (let k = -steps; k <= steps; k++) {
            const t = k / steps;
            const bx = sx + Math.round(t * spanX * st.facing);
            const by = sy + Math.round(t * spanY);
            ctx.fillRect(bx - 4, by - 4, 8, 8);
          }
          ctx.fillStyle = st.color;
          for (let k = -steps; k <= steps; k++) {
            const t = k / steps;
            const bx = sx + Math.round(t * spanX * st.facing);
            const by = sy + Math.round(t * spanY);
            ctx.fillRect(bx - 3, by - 3, 6, 6);
          }
          ctx.fillStyle = '#ffffff';
          for (let k = -steps + 1; k <= steps - 1; k++) {
            const t = k / steps;
            const bx = sx + Math.round(t * spanX * st.facing);
            const by = sy + Math.round(t * spanY);
            ctx.fillRect(bx - 1, by - 1, 3, 3);
          }
        } else if (st.kind === 'pillar') {
          const halfW = Math.max(6, Math.round((20 - u * 10) * sc));
          const beamH = Math.round(210 * sc);
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(sx - halfW - 2, sy - beamH, (halfW + 2) * 2, beamH);
          ctx.fillStyle = st.color;
          ctx.fillRect(sx - halfW, sy - beamH, halfW * 2, beamH);
          ctx.fillStyle = '#ffffff';
          const coreW = Math.max(4, Math.round(halfW * 0.45));
          ctx.fillRect(sx - coreW, sy - beamH, coreW * 2, beamH);
          drawPixelDiamond(ctx, sx, sy - Math.round(16 * sc), Math.round(18 * sc * (1 - u * 0.4)), '#fef08a');
        } else if (st.kind === 'shockwave') {
          const halfW = Math.round((26 + u * 78) * sc);
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(sx - halfW - 2, sy - 4, (halfW + 2) * 2, 8);
          ctx.fillStyle = st.color;
          ctx.fillRect(sx - halfW, sy - 3, halfW * 2, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - Math.round(halfW * 0.55), sy - 1, Math.round(halfW * 1.1), 2);
        } else {
          // 4-point pixel diamond starburst
          const r = Math.round((10 + u * 16) * sc);
          drawPixelDiamond(ctx, sx, sy, r + 2, '#0d0f1c');
          drawPixelDiamond(ctx, sx, sy, r, st.color);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - Math.round(r * 1.3), sy - 1, Math.round(r * 2.6), 2);
          ctx.fillRect(sx - 1, sy - Math.round(r * 1.3), 2, Math.round(r * 2.6));
        }
      }
    }

    // 3. Signature Companion Ultimate Assist Multi-Target & Lane Pixel VFX Bursts
    for (const ef of this._ultEffects) {
      const u = clampNum(ef.age / ef.maxAge, 0, 1);
      const alpha = u < 0.18 ? clampNum(u / 0.18, 0.25, 1) : clampNum(1 - (u - 0.18) / 0.82, 0, 1);
      if (alpha <= 0.03) continue;

      ctx.globalAlpha = alpha;

      if (ef.kind === 'atlas_burst') {
        const cx = Math.round(ef.x);
        const cy = Math.round(ef.y);
        const sc = ef.scale || 1.4;
        if (hasVfx && typeof ctx.drawImage === 'function') {
          const frame = clampNum(Math.floor(u * 12), 0, 11);
          const row = clampNum(Math.floor(ef.row ?? 3), 0, 7);
          const drawSize = Math.round(128 * sc);
          ctx.drawImage(
            vfxImg,
            frame * 128,
            row * 128,
            128,
            128,
            Math.round(cx - drawSize * 0.5),
            Math.round(cy - drawSize * 0.5),
            drawSize,
            drawSize
          );
        } else {
          const rad = Math.round((22 + u * 38) * sc);
          drawPixelDiamond(ctx, cx, cy, rad + 3, '#0d0f1c');
          drawPixelDiamond(ctx, cx, cy, rad, ef.color || '#facc15');
          drawPixelDiamond(ctx, cx, cy, Math.max(6, Math.round(rad * 0.52)), ef.subColor || '#ffffff');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - Math.round(rad * 1.35), cy - 2, Math.round(rad * 2.7), 4);
          ctx.fillRect(cx - 2, cy - Math.round(rad * 1.35), 4, Math.round(rad * 2.7));
        }
      } else if (ef.kind === 'lane_beam') {
        const left = Math.round(Math.min(ef.x0, ef.x1));
        const right = Math.round(Math.max(ef.x0, ef.x1));
        const len = Math.max(24, right - left);
        const cy = Math.round(ef.y);
        const halfH = Math.max(3, Math.round((ef.thickness || 22) * 0.5 * (1 - u * 0.55)));
        const midH = Math.max(2, Math.round(halfH * 0.62));
        const coreH = Math.max(2, Math.round(halfH * 0.3));

        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(left - 2, cy - halfH - 2, len + 4, (halfH + 2) * 2);
        ctx.fillStyle = ef.color || '#38bdf8';
        ctx.fillRect(left, cy - halfH, len, halfH * 2);
        ctx.fillStyle = ef.subColor || '#fef08a';
        ctx.fillRect(left, cy - midH, len, midH * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(left, cy - coreH, len, coreH * 2);

        // Marching crisp diamond pulse crests down the beam
        const crests = 5;
        for (let c = 0; c < crests; c++) {
          const frac = ((c / crests) + u * 0.65) % 1;
          const dx = Math.round(left + frac * len);
          drawPixelDiamond(ctx, dx, cy, Math.max(5, halfH + 4), '#0d0f1c');
          drawPixelDiamond(ctx, dx, cy, Math.max(3, halfH + 2), '#fef08a');
        }
      } else if (ef.kind === 'sky_cataclysm') {
        const cx = Math.round(ef.x);
        const groundY = Math.round(ef.y);
        const beamH = Math.round(ef.height || 360);
        const halfW = Math.max(6, Math.round((ef.width || 52) * 0.5 * (1 - u * 0.45)));
        const midW = Math.max(4, Math.round(halfW * 0.62));
        const coreW = Math.max(2, Math.round(halfW * 0.3));

        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(cx - halfW - 3, groundY - beamH, (halfW + 3) * 2, beamH);
        ctx.fillStyle = ef.color || '#fb923c';
        ctx.fillRect(cx - halfW, groundY - beamH, halfW * 2, beamH);
        ctx.fillStyle = ef.subColor || '#fde047';
        ctx.fillRect(cx - midW, groundY - beamH, midW * 2, beamH);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - coreW, groundY - beamH, coreW * 2, beamH);

        // Stepped ground shatter shockwave bars + rising pixel diamond sparks
        const shatterW = Math.round((halfW * 2.2) + u * 96);
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(cx - shatterW - 2, groundY - 8, (shatterW + 2) * 2, 12);
        ctx.fillStyle = ef.color || '#fb923c';
        ctx.fillRect(cx - shatterW, groundY - 6, shatterW * 2, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - Math.round(shatterW * 0.6), groundY - 3, Math.round(shatterW * 1.2), 3);

        for (let k = -1; k <= 1; k++) {
          const sx = cx + k * Math.round(halfW + 18 + u * 26);
          const sy = groundY - Math.round(28 + u * 185 + Math.abs(k) * 32);
          drawPixelDiamond(ctx, sx, sy, 8, '#0d0f1c');
          drawPixelDiamond(ctx, sx, sy, 6, ef.subColor || '#fef08a');
        }
      } else if (ef.kind === 'thunder_chain') {
        drawSteppedLightningArc(
          ctx,
          ef.x0,
          ef.y0,
          ef.x1,
          ef.y1,
          ef.color || '#fbbf24',
          ef.subColor || '#ffffff',
          ef.seed || 1
        );
        const rad = Math.round(14 + (1 - u) * 14);
        drawPixelDiamond(ctx, ef.x1, ef.y1, rad + 2, '#0d0f1c');
        drawPixelDiamond(ctx, ef.x1, ef.y1, rad, ef.color || '#38bdf8');
        drawPixelDiamond(ctx, ef.x1, ef.y1, Math.max(4, Math.round(rad * 0.45)), '#ffffff');
      } else if (ef.kind === 'cross_tempest') {
        const cx = Math.round(ef.x);
        const cy = Math.round(ef.y);
        const span = Math.round((ef.span || 72) * (0.7 + u * 0.45));
        const steps = 10;

        const drawXArm = (dirY, color, size) => {
          ctx.fillStyle = color;
          const half = Math.floor(size * 0.5);
          for (let k = -steps; k <= steps; k++) {
            const frac = k / steps;
            const bx = cx + Math.round(frac * span);
            const by = cy + Math.round(frac * span * 0.72 * dirY);
            ctx.fillRect(bx - half, by - half, size, size);
          }
        };

        drawXArm(1, '#0d0f1c', 10);
        drawXArm(-1, '#0d0f1c', 10);
        drawXArm(1, ef.color || '#22d3ee', 7);
        drawXArm(-1, ef.subColor || '#fef08a', 7);
        drawXArm(1, '#ffffff', 3);
        drawXArm(-1, '#ffffff', 3);

        const coreR = Math.round(16 * (1 - u * 0.35));
        drawPixelDiamond(ctx, cx, cy, coreR + 2, '#0d0f1c');
        drawPixelDiamond(ctx, cx, cy, coreR, ef.subColor || '#fef08a');
        drawPixelDiamond(ctx, cx, cy, Math.max(4, Math.round(coreR * 0.5)), '#ffffff');
      }
    }

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
      safeEnsureHeroLoaded(this._resolveActiveHeroKey(ROSTER_BY_ID[id]));
    }

    if (this.manager?.player) {
      this.syncEntitiesWithWorld(this.manager.player);
    }
  }
}
