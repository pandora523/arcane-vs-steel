// Endless Crusade Companion Star Promotion, EX Sprite Evolution, Squad Formations & Squad Overdrive
// Node-safe (zero browser globals required), zero external deps, 100% pure ASCII (zero Unicode emojis or dingbats).

import { formatEndlessNumber } from './EndlessEconomy.js?v=30fps205';

export const COMPANION_MAX_STARS = 5;
export const COMPANION_EX_UNLOCK_STAR = 1;
export const COMPANION_AURA_UNLOCK_STAR = 3;
export const OVERDRIVE_MAX_CHARGE = 100;

const DEFAULT_FORMATION_ID = 'balanced_phalanx';
const OVERDRIVE_DURATION_SEC = 2.4;
const OVERDRIVE_SURGE_DMG_MULT = 1.35;
const OVERDRIVE_SURGE_HASTE_MULT = 1.25;
const MAX_COUNTER = 1e9;

export const COMPANION_AURA_TIERS = Object.freeze([
  Object.freeze({
    tier: 0,
    id: 'base_ex',
    label: 'EX',
    shortLabel: 'EX',
    title: 'NEXT-GEN EX',
    ultVfxMult: 1.0
  }),
  Object.freeze({
    tier: 1,
    id: 'sovereign_aura',
    label: '3-STAR SOVEREIGN AURA',
    shortLabel: 'SOVEREIGN',
    title: 'SOVEREIGN AURA',
    ultVfxMult: 1.25
  }),
  Object.freeze({
    tier: 2,
    id: 'ascended_halo',
    label: '4-STAR ASCENDED HALO',
    shortLabel: 'ASCENDED',
    title: 'ASCENDED HALO',
    ultVfxMult: 1.50
  }),
  Object.freeze({
    tier: 3,
    id: 'mythic_crown',
    label: '5-STAR MYTHIC CROWN',
    shortLabel: 'MYTHIC',
    title: 'MYTHIC CROWN',
    ultVfxMult: 1.85
  })
]);

export function getAuraTier(star) {
  const s = clampInt(star, 1, COMPANION_MAX_STARS, 1);
  if (s >= 5) return COMPANION_AURA_TIERS[3];
  if (s === 4) return COMPANION_AURA_TIERS[2];
  if (s === 3) return COMPANION_AURA_TIERS[1];
  return COMPANION_AURA_TIERS[0];
}

export const COMPANION_STAR_TIERS = Object.freeze([
  Object.freeze({
    star: 1,
    title: 'NEXT-GEN EX',
    dpsMult: 1.0,
    ultMult: 1.0,
    promoteShards: 0,
    promoteDust: 0,
    isExForm: true,
    isExEvolved: true,
    auraTier: 0
  }),
  Object.freeze({
    star: 2,
    title: 'VETERAN EX',
    dpsMult: 1.45,
    ultMult: 1.25,
    promoteShards: 3,
    promoteDust: 20,
    isExForm: true,
    isExEvolved: true,
    auraTier: 0
  }),
  Object.freeze({
    star: 3,
    title: 'SOVEREIGN AURA',
    dpsMult: 2.25,
    ultMult: 1.65,
    promoteShards: 8,
    promoteDust: 60,
    isExForm: true,
    isExEvolved: true,
    auraTier: 1
  }),
  Object.freeze({
    star: 4,
    title: 'ASCENDED HALO',
    dpsMult: 3.5,
    ultMult: 2.2,
    promoteShards: 18,
    promoteDust: 140,
    isExForm: true,
    isExEvolved: true,
    auraTier: 2
  }),
  Object.freeze({
    star: 5,
    title: 'MYTHIC CROWN',
    dpsMult: 5.5,
    ultMult: 3.0,
    promoteShards: 36,
    promoteDust: 300,
    isExForm: true,
    isExEvolved: true,
    auraTier: 3
  })
]);

export const COMPANION_BASE_TO_EX_KEY = Object.freeze({
  aethelgard: Object.freeze({ baseHeroKey: 'warrior_ex', exHeroKey: 'warrior_ex', isNativeEx: true }),
  seraphina: Object.freeze({ baseHeroKey: 'priestess_ex', exHeroKey: 'priestess_ex', isNativeEx: true }),
  ignis_sol: Object.freeze({ baseHeroKey: 'mage_ex', exHeroKey: 'mage_ex', isNativeEx: true }),
  sylvanis: Object.freeze({ baseHeroKey: 'archer_ex', exHeroKey: 'archer_ex', isNativeEx: true }),
  freyja: Object.freeze({ baseHeroKey: 'valkyrie_ex', exHeroKey: 'valkyrie_ex', isNativeEx: true }),
  kaze_maru: Object.freeze({ baseHeroKey: 'ronin_ex', exHeroKey: 'ronin_ex', isNativeEx: true }),
  chronos: Object.freeze({ baseHeroKey: 'chronomancer_ex', exHeroKey: 'chronomancer_ex', isNativeEx: true }),
  raijin_ex: Object.freeze({ baseHeroKey: 'brawler_ex', exHeroKey: 'brawler_ex', isNativeEx: true }),
  nyx_ex: Object.freeze({ baseHeroKey: 'nyx_ex', exHeroKey: 'nyx_ex', isNativeEx: true }),
  reaper_ex: Object.freeze({ baseHeroKey: 'reaper_ex', exHeroKey: 'reaper_ex', isNativeEx: true }),
  icemage_ex: Object.freeze({ baseHeroKey: 'icemage_ex', exHeroKey: 'icemage_ex', isNativeEx: true }),
  android_ex: Object.freeze({ baseHeroKey: 'android_ex', exHeroKey: 'android_ex', isNativeEx: true })
});

export const ELITE_EX_COMPANION_DEFS = Object.freeze([
  Object.freeze({
    id: 'nyx_ex',
    heroKey: 'nyx_ex',
    name: 'NYX EX',
    shortName: 'NYX',
    role: 'ASSASSIN',
    accentHex: '#e879f9',
    unlockStage: 4,
    recruitCost: 2200,
    upgradeBaseCost: 1350,
    costGrowth: 1.31,
    baseDps: 168,
    attackRange: 210,
    attackInterval: 0.68,
    skillCooldown: 4.8,
    abilityName: 'VOID PHANTOM',
    ultName: 'ECLIPSE REQUIEM!',
    ultSfx: 'raijin_slash',
    ultDmgMult: 7.2,
    ultColor: '#e879f9',
    ultSubColor: '#38bdf8',
    isEliteEx: true,
    desc: 'Stage 4+ Elite EX: Blinking shadow assassin shredding bosses.'
  }),
  Object.freeze({
    id: 'reaper_ex',
    heroKey: 'reaper_ex',
    name: 'MALAKOR EX',
    shortName: 'REAPER',
    role: 'REAPER',
    accentHex: '#f43f5e',
    unlockStage: 6,
    recruitCost: 3800,
    upgradeBaseCost: 2300,
    costGrowth: 1.32,
    baseDps: 230,
    attackRange: 190,
    attackInterval: 0.84,
    skillCooldown: 5.4,
    abilityName: 'SOUL SCYTHE',
    ultName: 'ABYSSAL HARVEST!',
    ultSfx: 'reaper_ult',
    ultDmgMult: 7.6,
    ultColor: '#f43f5e',
    ultSubColor: '#c084fc',
    isEliteEx: true,
    desc: 'Stage 6+ Elite EX: Soul-reaping cleave with lethal bursts.'
  }),
  Object.freeze({
    id: 'icemage_ex',
    heroKey: 'icemage_ex',
    name: 'LYRA EX',
    shortName: 'LYRA',
    role: 'CRYO MAGE',
    accentHex: '#67e8f9',
    unlockStage: 8,
    recruitCost: 6500,
    upgradeBaseCost: 3900,
    costGrowth: 1.33,
    baseDps: 315,
    attackRange: 440,
    attackInterval: 0.94,
    skillCooldown: 5.6,
    abilityName: 'GLACIAL SPIRE',
    ultName: 'ABSOLUTE ZERO!',
    ultSfx: 'prism_beam',
    ultDmgMult: 7.8,
    ultColor: '#67e8f9',
    ultSubColor: '#e0f2fe',
    isEliteEx: true,
    desc: 'Stage 8+ Elite EX: Chilling glacial barrages freezing packs.'
  }),
  Object.freeze({
    id: 'android_ex',
    heroKey: 'android_ex',
    name: 'AEGIS-09 EX',
    shortName: 'ANDROID',
    role: 'VANGUARD',
    accentHex: '#22d3ee',
    unlockStage: 10,
    recruitCost: 11000,
    upgradeBaseCost: 6500,
    costGrowth: 1.34,
    baseDps: 440,
    attackRange: 340,
    attackInterval: 0.74,
    skillCooldown: 5.2,
    abilityName: 'ORBITAL FUNNELS',
    ultName: 'OMEGA RAILCANNON!',
    ultSfx: 'cyber_beam',
    ultDmgMult: 8.4,
    ultColor: '#22d3ee',
    ultSubColor: '#facc15',
    isEliteEx: true,
    desc: 'Stage 10+ Elite EX: Cybernetic funnel barrage and railcannon.'
  })
]);

export const SQUAD_FORMATIONS = Object.freeze([
  Object.freeze({
    id: 'vanguard_wall',
    name: 'VANGUARD WALL',
    shortLabel: 'VANGUARD',
    accentHex: '#38bdf8',
    desc: '+30% MAX HP, +2% HP/S REGEN, +15% HERO DMG',
    slotOffsets: Object.freeze([
      Object.freeze({ dx: 82, dy: -46 }),
      Object.freeze({ dx: 96, dy: 0 }),
      Object.freeze({ dx: 82, dy: 46 })
    ]),
    modifiers: Object.freeze({
      maxHpMult: 1.30,
      hpRegenBonus: 0.02,
      heroDmgMult: 1.15,
      companionDmgMult: 1.0,
      goldMult: 1.0,
      critBonus: 0,
      hasteMult: 1.0,
      bossDmgMult: 1.0
    })
  }),
  Object.freeze({
    id: 'balanced_phalanx',
    name: 'BALANCED PHALANX',
    shortLabel: 'PHALANX',
    accentHex: '#facc15',
    desc: '+18% ALLY DMG, +15% GOLD, +10% HERO DMG',
    slotOffsets: Object.freeze([
      Object.freeze({ dx: 54, dy: -44 }),
      Object.freeze({ dx: -72, dy: 0 }),
      Object.freeze({ dx: 54, dy: 44 })
    ]),
    modifiers: Object.freeze({
      maxHpMult: 1.10,
      hpRegenBonus: 0,
      heroDmgMult: 1.10,
      companionDmgMult: 1.18,
      goldMult: 1.15,
      critBonus: 0.05,
      hasteMult: 1.05,
      bossDmgMult: 1.08
    })
  }),
  Object.freeze({
    id: 'all_out_blitz',
    name: 'ALL-OUT BLITZ',
    shortLabel: 'BLITZ',
    accentHex: '#f43f5e',
    desc: '+35% ALLY DMG, +18% CRIT, +22% BOSS DMG',
    slotOffsets: Object.freeze([
      Object.freeze({ dx: 108, dy: -52 }),
      Object.freeze({ dx: 122, dy: 8 }),
      Object.freeze({ dx: -44, dy: 48 })
    ]),
    modifiers: Object.freeze({
      maxHpMult: 1.0,
      hpRegenBonus: 0,
      heroDmgMult: 1.12,
      companionDmgMult: 1.35,
      goldMult: 1.0,
      critBonus: 0.18,
      hasteMult: 1.18,
      bossDmgMult: 1.22
    })
  })
]);

export const SQUAD_FORMATION_BY_ID = Object.freeze({
  vanguard_wall: SQUAD_FORMATIONS[0],
  balanced_phalanx: SQUAD_FORMATIONS[1],
  all_out_blitz: SQUAD_FORMATIONS[2]
});

const COMPANION_ID_ALIASES = Object.freeze({
  ignis: 'ignis_sol',
  'ignis-sol': 'ignis_sol',
  kazemaru: 'kaze_maru',
  'kaze-maru': 'kaze_maru',
  raijin: 'raijin_ex',
  'raijin-ex': 'raijin_ex',
  brawler: 'raijin_ex',
  brawler_ex: 'raijin_ex',
  nyx: 'nyx_ex',
  'nyx-ex': 'nyx_ex',
  reaper: 'reaper_ex',
  'reaper-ex': 'reaper_ex',
  malakor: 'reaper_ex',
  malakor_ex: 'reaper_ex',
  icemage: 'icemage_ex',
  'icemage-ex': 'icemage_ex',
  lyra: 'icemage_ex',
  lyra_ex: 'icemage_ex',
  android: 'android_ex',
  'android-ex': 'android_ex',
  'aegis-09': 'android_ex',
  aegis_09: 'android_ex',
  aegis09: 'android_ex'
});

const KNOWN_COMPANION_IDS = Object.freeze(Object.keys(COMPANION_BASE_TO_EX_KEY));

function normalizeCompanionId(rawId) {
  if (typeof rawId !== 'string') return '';
  const cleaned = rawId.trim().toLowerCase();
  if (!cleaned) return '';
  if (Object.prototype.hasOwnProperty.call(COMPANION_BASE_TO_EX_KEY, cleaned)) {
    return cleaned;
  }
  if (Object.prototype.hasOwnProperty.call(COMPANION_ID_ALIASES, cleaned)) {
    return COMPANION_ID_ALIASES[cleaned];
  }
  return cleaned;
}

function clampInt(value, min, max, fallback = min) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

function clampFloat(value, min, max, fallback = min) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function roundTo(value, decimals = 4) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

function makeDefaultStarsMap() {
  const map = {};
  for (let i = 0; i < KNOWN_COMPANION_IDS.length; i++) {
    map[KNOWN_COMPANION_IDS[i]] = 1;
  }
  return map;
}

function readAvailableShards(economy) {
  if (!economy || typeof economy !== 'object') return 0;
  if (economy.astralShards !== undefined) {
    return Math.max(0, Math.floor(Number(economy.astralShards) || 0));
  }
  if (economy.shards !== undefined) {
    return Math.max(0, Math.floor(Number(economy.shards) || 0));
  }
  return 0;
}

function readAvailableDust(gear) {
  if (!gear || typeof gear !== 'object') return 0;
  if (gear.forgeDust !== undefined) {
    return Math.max(0, Math.floor(Number(gear.forgeDust) || 0));
  }
  if (gear.dust !== undefined) {
    return Math.max(0, Math.floor(Number(gear.dust) || 0));
  }
  return 0;
}

function deductShards(economy, cost) {
  if (!economy || typeof economy !== 'object' || cost <= 0) return false;
  if (economy.astralShards !== undefined) {
    const cur = Math.max(0, Math.floor(Number(economy.astralShards) || 0));
    if (cur < cost) return false;
    economy.astralShards = Math.max(0, cur - cost);
    return true;
  }
  if (economy.shards !== undefined) {
    const cur = Math.max(0, Math.floor(Number(economy.shards) || 0));
    if (cur < cost) return false;
    economy.shards = Math.max(0, cur - cost);
    return true;
  }
  return false;
}

function deductDust(gear, cost) {
  if (!gear || typeof gear !== 'object' || cost <= 0) return false;
  if (gear.forgeDust !== undefined) {
    const cur = Math.max(0, Math.floor(Number(gear.forgeDust) || 0));
    if (cur < cost) return false;
    gear.forgeDust = Math.max(0, cur - cost);
    return true;
  }
  if (gear.dust !== undefined) {
    const cur = Math.max(0, Math.floor(Number(gear.dust) || 0));
    if (cur < cost) return false;
    gear.dust = Math.max(0, cur - cost);
    return true;
  }
  return false;
}

function formatPromoteCta(nextStar, isMaxStar) {
  if (isMaxStar || !nextStar) return `MAX ${COMPANION_MAX_STARS}-STAR`;
  if (nextStar === 2) return 'PROMOTE 2-STAR';
  if (nextStar === 3) return 'ASCEND 3-STAR';
  if (nextStar === 4) return 'ASCEND 4-STAR';
  return 'ASCEND 5-STAR';
}

export class EndlessCompanionEvo {
  constructor() {
    this.starsById = makeDefaultStarsMap();
    this.formationId = DEFAULT_FORMATION_ID;
    this.overdriveCharge = 0;
    this.overdriveActiveTimer = 0;
    this.totalOverdrives = 0;
    this.totalPromotions = 0;
  }

  reset() {
    this.starsById = makeDefaultStarsMap();
    this.formationId = DEFAULT_FORMATION_ID;
    this.overdriveCharge = 0;
    this.overdriveActiveTimer = 0;
    this.totalOverdrives = 0;
    this.totalPromotions = 0;
  }

  getStar(id) {
    const normId = normalizeCompanionId(id);
    if (!normId) return 1;
    const raw = Object.prototype.hasOwnProperty.call(this.starsById, normId)
      ? this.starsById[normId]
      : 1;
    return clampInt(raw, 1, COMPANION_MAX_STARS, 1);
  }

  getAuraTier(starOrId) {
    if (typeof starOrId === 'string') {
      return getAuraTier(this.getStar(starOrId));
    }
    return getAuraTier(starOrId);
  }

  isExForm(_id) {
    return true;
  }

  isExEvolved(_id) {
    return true;
  }

  isExSprite(_id) {
    return true;
  }

  getSpriteHeroKey(id, fallbackKey = '') {
    const normId = normalizeCompanionId(id);
    const mapping = normId && Object.prototype.hasOwnProperty.call(COMPANION_BASE_TO_EX_KEY, normId)
      ? COMPANION_BASE_TO_EX_KEY[normId]
      : null;
    if (mapping) {
      return mapping.exHeroKey;
    }
    if (typeof fallbackKey === 'string' && fallbackKey.trim()) {
      return fallbackKey.trim();
    }
    return normId;
  }

  getStarMultipliers(id) {
    const normId = normalizeCompanionId(id);
    const star = this.getStar(normId);
    const tier = COMPANION_STAR_TIERS[star - 1] || COMPANION_STAR_TIERS[0];
    const isMaxStar = star >= COMPANION_MAX_STARS;
    const nextStar = isMaxStar ? null : star + 1;
    const nextTier = isMaxStar ? null : COMPANION_STAR_TIERS[nextStar - 1];
    const auraTier = getAuraTier(star);
    const nextAuraTier = isMaxStar ? null : getAuraTier(nextStar);

    return {
      star,
      title: tier.title,
      dpsMult: tier.dpsMult,
      ultMult: tier.ultMult,
      isExForm: true,
      isExEvolved: true,
      isExSprite: true,
      auraTier,
      nextAuraTier,
      ultVfxMult: auraTier.ultVfxMult,
      nextStar,
      promoteShards: nextTier ? nextTier.promoteShards : 0,
      promoteDust: nextTier ? nextTier.promoteDust : 0,
      isMaxStar
    };
  }

  getPromoteQuote(id, economy = null, gear = null) {
    const normId = normalizeCompanionId(id);
    const star = this.getStar(normId);
    const isMaxStar = star >= COMPANION_MAX_STARS;
    const nextStar = isMaxStar ? null : star + 1;
    const nextTier = isMaxStar ? null : COMPANION_STAR_TIERS[nextStar - 1];
    const auraTier = getAuraTier(star);
    const nextAuraTier = isMaxStar ? null : getAuraTier(nextStar);

    const shardsCost = nextTier ? nextTier.promoteShards : 0;
    const dustCost = nextTier ? nextTier.promoteDust : 0;

    const availableShards = readAvailableShards(economy);
    const availableDust = readAvailableDust(gear);

    const canAffordShards = !isMaxStar && shardsCost > 0 && availableShards >= shardsCost;
    const canAffordDust = !isMaxStar && dustCost > 0 && availableDust >= dustCost;
    const canPromote = !isMaxStar && (canAffordShards || canAffordDust);

    let payMode = 'shards';
    if (canAffordShards) {
      payMode = 'shards';
    } else if (canAffordDust) {
      payMode = 'dust';
    } else if (!economy && gear) {
      payMode = 'dust';
    }

    let formattedCost = 'MAX';
    if (!isMaxStar) {
      formattedCost = payMode === 'dust'
        ? `${formatEndlessNumber(dustCost)} DUST`
        : `${formatEndlessNumber(shardsCost)} SHARDS`;
    }

    const promoteCta = formatPromoteCta(nextStar, isMaxStar);
    const unlocksAuraTier = !isMaxStar && nextStar >= COMPANION_AURA_UNLOCK_STAR ? nextStar : 0;

    return {
      id: normId,
      star,
      nextStar,
      isMaxStar,
      isExForm: true,
      shardsCost,
      dustCost,
      canAffordShards,
      canAffordDust,
      canPromote,
      payMode,
      formattedCost,
      promoteCta,
      auraTier,
      nextAuraTier,
      unlocksAuraTier,
      unlocksExForm: false
    };
  }

  promoteCompanion(id, economy, gear = null) {
    const normId = normalizeCompanionId(id);
    if (!normId) {
      const baseAura = getAuraTier(1);
      return {
        ok: false,
        id: '',
        prevStar: 1,
        star: 1,
        isExForm: true,
        unlockedEx: false,
        unlockedAuraTier: 0,
        auraTier: baseAura,
        auraTierName: baseAura.label,
        payMode: 'shards',
        cost: 0,
        dpsMult: COMPANION_STAR_TIERS[0].dpsMult,
        ultMult: COMPANION_STAR_TIERS[0].ultMult,
        heroKey: ''
      };
    }

    const quote = this.getPromoteQuote(normId, economy, gear);
    const prevStar = quote.star;
    const currentTier = COMPANION_STAR_TIERS[prevStar - 1] || COMPANION_STAR_TIERS[0];
    const currentAura = getAuraTier(prevStar);

    if (quote.isMaxStar || !quote.canPromote) {
      return {
        ok: false,
        id: normId,
        prevStar,
        star: prevStar,
        isExForm: true,
        unlockedEx: false,
        unlockedAuraTier: 0,
        auraTier: currentAura,
        auraTierName: currentAura.label,
        payMode: quote.payMode,
        cost: quote.payMode === 'dust' ? quote.dustCost : quote.shardsCost,
        dpsMult: currentTier.dpsMult,
        ultMult: currentTier.ultMult,
        heroKey: this.getSpriteHeroKey(normId)
      };
    }

    let payMode = 'shards';
    let cost = 0;
    let paid = false;

    if (quote.canAffordShards) {
      payMode = 'shards';
      cost = quote.shardsCost;
      paid = deductShards(economy, cost);
    } else if (quote.canAffordDust) {
      payMode = 'dust';
      cost = quote.dustCost;
      paid = deductDust(gear, cost);
    }

    if (!paid) {
      return {
        ok: false,
        id: normId,
        prevStar,
        star: prevStar,
        isExForm: true,
        unlockedEx: false,
        unlockedAuraTier: 0,
        auraTier: currentAura,
        auraTierName: currentAura.label,
        payMode,
        cost,
        dpsMult: currentTier.dpsMult,
        ultMult: currentTier.ultMult,
        heroKey: this.getSpriteHeroKey(normId)
      };
    }

    const nextStar = Math.min(COMPANION_MAX_STARS, prevStar + 1);
    this.starsById[normId] = nextStar;
    this.totalPromotions = clampInt(this.totalPromotions + 1, 0, MAX_COUNTER, this.totalPromotions + 1);

    const nextTier = COMPANION_STAR_TIERS[nextStar - 1] || COMPANION_STAR_TIERS[COMPANION_STAR_TIERS.length - 1];
    const auraTier = getAuraTier(nextStar);
    const unlockedAuraTier = nextStar >= COMPANION_AURA_UNLOCK_STAR ? nextStar : 0;
    const auraTierName = auraTier.label;
    const heroKey = this.getSpriteHeroKey(normId);

    return {
      ok: true,
      id: normId,
      prevStar,
      star: nextStar,
      isExForm: true,
      unlockedEx: false,
      unlockedAuraTier,
      auraTier,
      auraTierName,
      payMode,
      cost,
      dpsMult: nextTier.dpsMult,
      ultMult: nextTier.ultMult,
      heroKey
    };
  }

  setFormation(formationId) {
    const key = typeof formationId === 'string' ? formationId.trim().toLowerCase() : '';
    const target = Object.prototype.hasOwnProperty.call(SQUAD_FORMATION_BY_ID, key)
      ? SQUAD_FORMATION_BY_ID[key]
      : null;

    if (!target) {
      return {
        ok: false,
        formationId: this.formationId,
        formation: this.getFormation(),
        changed: false
      };
    }

    const changed = this.formationId !== target.id;
    this.formationId = target.id;
    return {
      ok: true,
      formationId: this.formationId,
      formation: target,
      changed
    };
  }

  getFormation() {
    if (Object.prototype.hasOwnProperty.call(SQUAD_FORMATION_BY_ID, this.formationId)) {
      return SQUAD_FORMATION_BY_ID[this.formationId];
    }
    return SQUAD_FORMATION_BY_ID[DEFAULT_FORMATION_ID];
  }

  getSlotOffset(slotIndex) {
    const formation = this.getFormation();
    const offsets = formation.slotOffsets;
    const idx = Math.max(0, Math.floor(Number(slotIndex) || 0)) % offsets.length;
    const off = offsets[idx];
    return { dx: off.dx, dy: off.dy };
  }

  getFormationModifiers() {
    const formation = this.getFormation();
    const m = formation.modifiers;
    const surgeActive = this.overdriveActiveTimer > 0;
    const dmgSurge = surgeActive ? OVERDRIVE_SURGE_DMG_MULT : 1.0;
    const hasteSurge = surgeActive ? OVERDRIVE_SURGE_HASTE_MULT : 1.0;

    return {
      maxHpMult: m.maxHpMult,
      hpRegenBonus: m.hpRegenBonus,
      heroDmgMult: roundTo(m.heroDmgMult * dmgSurge, 4),
      companionDmgMult: roundTo(m.companionDmgMult * dmgSurge, 4),
      goldMult: m.goldMult,
      critBonus: m.critBonus,
      hasteMult: roundTo(m.hasteMult * hasteSurge, 4),
      bossDmgMult: m.bossDmgMult,
      overdriveActive: surgeActive
    };
  }

  addOverdriveCharge(amount, activeCount = 1) {
    const count = Math.max(0, Math.floor(Number(activeCount) || 0));
    const delta = Number(amount);
    if (count <= 0 || !Number.isFinite(delta) || delta <= 0) {
      return this.overdriveCharge;
    }
    if (this.overdriveActiveTimer > 0) {
      return this.overdriveCharge;
    }
    this.overdriveCharge = roundTo(
      Math.min(OVERDRIVE_MAX_CHARGE, Math.max(0, this.overdriveCharge + delta)),
      2
    );
    return this.overdriveCharge;
  }

  isOverdriveReady(activeCount = 1) {
    const count = Math.max(0, Math.floor(Number(activeCount) || 0));
    return count > 0 && this.overdriveActiveTimer <= 0 && this.overdriveCharge >= OVERDRIVE_MAX_CHARGE;
  }

  consumeOverdrive(activeCount = 1) {
    const count = Math.max(0, Math.floor(Number(activeCount) || 0));
    if (!this.isOverdriveReady(count)) {
      return {
        ok: false,
        burstMult: 0,
        activeCount: count
      };
    }

    const burstMult = roundTo(Math.min(14.0, 5.0 + count * 1.5), 2);
    this.overdriveCharge = 0;
    this.overdriveActiveTimer = OVERDRIVE_DURATION_SEC;
    this.totalOverdrives = clampInt(this.totalOverdrives + 1, 0, MAX_COUNTER, this.totalOverdrives + 1);

    return {
      ok: true,
      burstMult,
      activeCount: count
    };
  }

  update(dt) {
    const delta = Number.isFinite(dt) && dt > 0 ? dt : 0;
    let overdriveEnded = false;

    if (this.overdriveActiveTimer > 0 && delta > 0) {
      const nextTimer = this.overdriveActiveTimer - delta;
      if (nextTimer <= 0) {
        this.overdriveActiveTimer = 0;
        overdriveEnded = true;
      } else {
        this.overdriveActiveTimer = roundTo(nextTimer, 4);
      }
    }

    return { overdriveEnded };
  }

  getEvoSnapshot(economy = null, gear = null, activeCompanionCount = 0) {
    const formation = this.getFormation();
    const activeCount = Math.max(0, Math.floor(Number(activeCompanionCount) || 0));
    const charge = roundTo(clampFloat(this.overdriveCharge, 0, OVERDRIVE_MAX_CHARGE, 0), 2);
    const ratio = roundTo(charge / OVERDRIVE_MAX_CHARGE, 4);
    const activeTimer = roundTo(Math.max(0, Number(this.overdriveActiveTimer) || 0), 3);
    const overdriveActive = activeTimer > 0;
    const overdriveReady = this.isOverdriveReady(activeCount);

    return {
      formationId: formation.id,
      formation,
      formations: SQUAD_FORMATIONS,
      auraTiers: COMPANION_AURA_TIERS,
      overdriveCharge: charge,
      overdriveRatio: ratio,
      overdriveReady,
      overdriveActive,
      overdriveActiveTimer: activeTimer,
      totalOverdrives: this.totalOverdrives,
      totalPromotions: this.totalPromotions,
      starsById: { ...this.starsById },
      availableShards: readAvailableShards(economy),
      availableDust: readAvailableDust(gear)
    };
  }

  exportSnapshot() {
    const stars = makeDefaultStarsMap();
    const keys = Object.keys(this.starsById || {});
    for (let i = 0; i < keys.length; i++) {
      const normId = normalizeCompanionId(keys[i]);
      if (!normId) continue;
      stars[normId] = clampInt(this.starsById[keys[i]], 1, COMPANION_MAX_STARS, 1);
    }

    return {
      version: 1,
      starsById: stars,
      formationId: this.getFormation().id,
      overdriveCharge: roundTo(clampFloat(this.overdriveCharge, 0, OVERDRIVE_MAX_CHARGE, 0), 2),
      totalOverdrives: clampInt(this.totalOverdrives, 0, MAX_COUNTER, 0),
      totalPromotions: clampInt(this.totalPromotions, 0, MAX_COUNTER, 0)
    };
  }

  importSnapshot(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return false;
    }

    const nextStars = makeDefaultStarsMap();
    if (data.starsById && typeof data.starsById === 'object' && !Array.isArray(data.starsById)) {
      const keys = Object.keys(data.starsById);
      for (let i = 0; i < keys.length; i++) {
        const rawKey = keys[i];
        const normId = normalizeCompanionId(rawKey);
        if (!normId) continue;
        const parsed = clampInt(data.starsById[rawKey], 1, COMPANION_MAX_STARS, 1);
        nextStars[normId] = Math.max(nextStars[normId] || 1, parsed);
      }
    }
    this.starsById = nextStars;

    const rawFormation = typeof data.formationId === 'string' ? data.formationId.trim().toLowerCase() : '';
    this.formationId = Object.prototype.hasOwnProperty.call(SQUAD_FORMATION_BY_ID, rawFormation)
      ? rawFormation
      : DEFAULT_FORMATION_ID;

    this.overdriveCharge = roundTo(
      clampFloat(data.overdriveCharge, 0, OVERDRIVE_MAX_CHARGE, 0),
      2
    );
    this.overdriveActiveTimer = 0;
    this.totalOverdrives = clampInt(data.totalOverdrives, 0, MAX_COUNTER, 0);
    this.totalPromotions = clampInt(data.totalPromotions, 0, MAX_COUNTER, 0);
    return true;
  }
}
