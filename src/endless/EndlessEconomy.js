// Endless Crusade Economy, Infinitely Scalable Relics, Tap-Smite Fever & Persistence
// Node-safe (all browser storage access strictly guarded), zero external deps, zero Unicode emojis.

export const ENDLESS_SAVE_STORAGE_KEY = 'avs_endless_crusade_v1';

const MAX_BULK_BUY_CAP = 250;
const ROLLING_METRIC_WINDOW_SEC = 5.0;
const FEVER_DURATION_SEC = 7.5;
const FEVER_TIER2_THRESHOLD_TAPS = 10;
const FEVER_DECAY_PER_SEC = 6.5;

export const RELIC_MILESTONE_BREAKPOINTS = Object.freeze([
  Object.freeze({ level: 10, mult: 1.5, tag: 'LV.10 X1.5' }),
  Object.freeze({ level: 25, mult: 2.25, tag: 'LV.25 X2.25' }),
  Object.freeze({ level: 50, mult: 3.5, tag: 'LV.50 X3.5' }),
  Object.freeze({ level: 100, mult: 6.0, tag: 'LV.100 X6.0' })
]);

export const ENDLESS_RELIC_SETS = Object.freeze([
  Object.freeze({
    id: 'warlords_wrath',
    name: "WARLORD'S WRATH",
    color: '#ef4444',
    sigilCol: 4,
    relicIds: Object.freeze(['sovereign_blade', 'executioner_crit', 'boss_breaker']),
    tiers: Object.freeze([
      Object.freeze({
        tier: 1,
        minLevel: 5,
        tierLabel: 'TIER I',
        bonusDesc: '+25% HERO & BOSS DMG',
        bonuses: Object.freeze({ heroDmgMult: 1.25, bossDmgMult: 1.25 })
      }),
      Object.freeze({
        tier: 2,
        minLevel: 15,
        tierLabel: 'TIER II',
        bonusDesc: '+65% HERO & BOSS DMG',
        bonuses: Object.freeze({ heroDmgMult: 1.65, bossDmgMult: 1.65 })
      }),
      Object.freeze({
        tier: 3,
        minLevel: 30,
        tierLabel: 'TIER III',
        bonusDesc: '+140% HERO & BOSS DMG',
        bonuses: Object.freeze({ heroDmgMult: 2.40, bossDmgMult: 2.40 })
      })
    ])
  }),
  Object.freeze({
    id: 'sovereigns_greed',
    name: "SOVEREIGN'S GREED",
    color: '#facc15',
    sigilCol: 5,
    relicIds: Object.freeze(['avarice_magnet', 'merchant_crest', 'soul_siphon']),
    tiers: Object.freeze([
      Object.freeze({
        tier: 1,
        minLevel: 5,
        tierLabel: 'TIER I',
        bonusDesc: '+35% GOLD & +30PX MAGNET',
        bonuses: Object.freeze({ goldMult: 1.35, coinMagnetBonus: 30 })
      }),
      Object.freeze({
        tier: 2,
        minLevel: 15,
        tierLabel: 'TIER II',
        bonusDesc: '+85% GOLD & +65PX MAGNET',
        bonuses: Object.freeze({ goldMult: 1.85, coinMagnetBonus: 65 })
      }),
      Object.freeze({
        tier: 3,
        minLevel: 30,
        tierLabel: 'TIER III',
        bonusDesc: '+180% GOLD & +120PX MAGNET',
        bonuses: Object.freeze({ goldMult: 2.80, coinMagnetBonus: 120 })
      })
    ])
  }),
  Object.freeze({
    id: 'arcane_tempest',
    name: 'ARCANE TEMPEST',
    color: '#38bdf8',
    sigilCol: 6,
    relicIds: Object.freeze(['arcane_tap_sigil', 'tempest_haste', 'companion_banner']),
    tiers: Object.freeze([
      Object.freeze({
        tier: 1,
        minLevel: 5,
        tierLabel: 'TIER I',
        bonusDesc: '+30% TAP & ALLY DMG / +8% HASTE',
        bonuses: Object.freeze({ tapDmgMult: 1.30, companionDmgMult: 1.30, hasteMult: 1.08 })
      }),
      Object.freeze({
        tier: 2,
        minLevel: 15,
        tierLabel: 'TIER II',
        bonusDesc: '+75% TAP & ALLY DMG / +16% HASTE',
        bonuses: Object.freeze({ tapDmgMult: 1.75, companionDmgMult: 1.75, hasteMult: 1.16 })
      }),
      Object.freeze({
        tier: 3,
        minLevel: 30,
        tierLabel: 'TIER III',
        bonusDesc: '+160% TAP & ALLY DMG / +25% HASTE',
        bonuses: Object.freeze({ tapDmgMult: 2.60, companionDmgMult: 2.60, hasteMult: 1.25 })
      })
    ])
  })
]);

function computeRelicMilestoneInfo(relicId, rawLevel) {
  const level = Math.max(0, Math.floor(Number(rawLevel) || 0));
  let reachedCount = 0;
  for (let i = 0; i < RELIC_MILESTONE_BREAKPOINTS.length; i++) {
    if (level >= RELIC_MILESTONE_BREAKPOINTS[i].level) {
      reachedCount = i + 1;
    } else {
      break;
    }
  }
  const activeBp = reachedCount > 0 ? RELIC_MILESTONE_BREAKPOINTS[reachedCount - 1] : null;
  const nextBp = reachedCount < RELIC_MILESTONE_BREAKPOINTS.length
    ? RELIC_MILESTONE_BREAKPOINTS[reachedCount]
    : null;

  let progressPct = 100;
  if (nextBp) {
    const prevLevel = activeBp ? activeBp.level : 0;
    const span = Math.max(1, nextBp.level - prevLevel);
    const rawPct = ((level - prevLevel) / span) * 100;
    progressPct = Math.max(0, Math.min(100, Math.round(rawPct * 10) / 10));
  }

  return {
    relicId: typeof relicId === 'string' ? relicId : '',
    level,
    reachedCount,
    activeMult: activeBp ? activeBp.mult : 1.0,
    nextLevel: nextBp ? nextBp.level : null,
    nextTag: nextBp ? nextBp.tag : '',
    progressPct,
    activeTag: activeBp ? activeBp.tag : ''
  };
}

function getMilestoneMultForLevel(level) {
  const lv = Math.max(0, Math.floor(Number(level) || 0));
  let mult = 1.0;
  for (let i = 0; i < RELIC_MILESTONE_BREAKPOINTS.length; i++) {
    if (lv >= RELIC_MILESTONE_BREAKPOINTS[i].level) {
      mult = RELIC_MILESTONE_BREAKPOINTS[i].mult;
    } else {
      break;
    }
  }
  return mult;
}

export const ENDLESS_RELICS = Object.freeze([
  Object.freeze({
    id: 'sovereign_blade',
    name: 'SOVEREIGN BLADE',
    baseCost: 15,
    costGrowth: 1.15,
    iconCol: 2,
    accentHex: '#fbbf24',
    shortDesc: '+18% HERO DMG / LV',
    formatBonus(level) {
      const lv = Math.max(0, Math.floor(level || 0));
      const mult = getMilestoneMultForLevel(lv);
      return `+${Math.round(lv * 18 * mult)}% HERO DMG`;
    }
  }),
  Object.freeze({
    id: 'arcane_tap_sigil',
    name: 'ARCANE TAP SIGIL',
    baseCost: 12,
    costGrowth: 1.14,
    iconCol: 3,
    accentHex: '#38bdf8',
    shortDesc: '+8 BASE & +28% TAP DMG / LV',
    formatBonus(level) {
      const lv = Math.max(0, Math.floor(level || 0));
      const mult = getMilestoneMultForLevel(lv);
      return `+${lv * 8} BASE / +${Math.round(lv * 28 * mult)}% TAP`;
    }
  }),
  Object.freeze({
    id: 'avarice_magnet',
    name: 'AVARICE MAGNET',
    baseCost: 22,
    costGrowth: 1.16,
    iconCol: 4,
    accentHex: '#facc15',
    shortDesc: '+16% GOLD & +22PX MAGNET / LV',
    formatBonus(level) {
      const lv = Math.max(0, Math.floor(level || 0));
      const mult = getMilestoneMultForLevel(lv);
      return `+${Math.round(lv * 16 * mult)}% GOLD / +${Math.round(lv * 22 * mult)}PX`;
    }
  }),
  Object.freeze({
    id: 'executioner_crit',
    name: 'EXECUTIONER CRIT',
    baseCost: 30,
    costGrowth: 1.17,
    iconCol: 5,
    accentHex: '#f43f5e',
    shortDesc: '+2.2% CRIT (75% CAP) & +14% CDMG',
    formatBonus(level) {
      const lv = Math.max(0, Math.floor(level || 0));
      const mult = getMilestoneMultForLevel(lv);
      const chancePct = Math.min(75, 5 + lv * 2.2 * mult);
      const dmgPct = Math.round((1.75 + lv * 0.14 * mult) * 100);
      return `${chancePct.toFixed(1)}% CRIT / ${dmgPct}% DMG`;
    }
  }),
  Object.freeze({
    id: 'tempest_haste',
    name: 'TEMPEST HASTE',
    baseCost: 40,
    costGrowth: 1.18,
    iconCol: 6,
    accentHex: '#2dd4bf',
    shortDesc: '+6% HASTE & +4% MOVE SPD / LV',
    formatBonus(level) {
      const lv = Math.max(0, Math.floor(level || 0));
      const mult = getMilestoneMultForLevel(lv);
      return `+${Math.round(lv * 6 * mult)}% HASTE / +${Math.round(Math.min(160, lv * 4 * mult))}% SPD`;
    }
  }),
  Object.freeze({
    id: 'aegis_vitality',
    name: 'AEGIS VITALITY',
    baseCost: 25,
    costGrowth: 1.15,
    iconCol: 7,
    accentHex: '#34d399',
    shortDesc: '+20% MAX HP & +3% HP/S REGEN',
    formatBonus(level) {
      const lv = Math.max(0, Math.floor(level || 0));
      const mult = getMilestoneMultForLevel(lv);
      return `+${Math.round(lv * 20 * mult)}% HP / +${Math.round(lv * 3 * mult)}% REGEN`;
    }
  }),
  Object.freeze({
    id: 'companion_banner',
    name: 'COMPANION BANNER',
    baseCost: 55,
    costGrowth: 1.17,
    iconCol: 8,
    accentHex: '#c084fc',
    shortDesc: '+24% COMPANION DMG & HEAL / LV',
    formatBonus(level) {
      const lv = Math.max(0, Math.floor(level || 0));
      const mult = getMilestoneMultForLevel(lv);
      return `+${Math.round(lv * 24 * mult)}% ALLY PWR`;
    }
  }),
  Object.freeze({
    id: 'boss_breaker',
    name: 'BOSS BREAKER',
    baseCost: 75,
    costGrowth: 1.18,
    iconCol: 9,
    accentHex: '#fb923c',
    shortDesc: '+22% BOSS DMG & +1.5S / 2LV (+20S)',
    formatBonus(level) {
      const lv = Math.max(0, Math.floor(level || 0));
      const mult = getMilestoneMultForLevel(lv);
      const bonusSec = Math.min(20, Math.floor(lv / 2) * 1.5 * mult);
      return `+${Math.round(lv * 22 * mult)}% BOSS / +${bonusSec.toFixed(1)}S`;
    }
  }),
  Object.freeze({
    id: 'soul_siphon',
    name: 'SOUL SIPHON',
    baseCost: 90,
    costGrowth: 1.19,
    iconCol: 10,
    accentHex: '#4ade80',
    shortDesc: '+1.5% LEECH (25%) & +10% ULT GAIN',
    formatBonus(level) {
      const lv = Math.max(0, Math.floor(level || 0));
      const mult = getMilestoneMultForLevel(lv);
      const leech = Math.min(25, lv * 1.5 * mult);
      return `${leech.toFixed(1)}% LEECH / +${Math.round(lv * 10 * mult)}% ULT`;
    }
  }),
  Object.freeze({
    id: 'merchant_crest',
    name: 'MERCHANT CREST',
    baseCost: 120,
    costGrowth: 1.21,
    iconCol: 11,
    accentHex: '#fde047',
    shortDesc: '-2.5% COST (50% CAP) & +10% BGOLD',
    formatBonus(level) {
      const lv = Math.max(0, Math.floor(level || 0));
      const mult = getMilestoneMultForLevel(lv);
      const discPct = 50 * (1 - Math.pow(0.95, lv * mult));
      return `-${discPct.toFixed(1)}% COST / +${Math.round(lv * 10 * mult)}% BGOLD`;
    }
  })
]);

const RELIC_BY_ID = new Map(ENDLESS_RELICS.map((r) => [r.id, r]));

const MEMORY_STORAGE_FALLBACK = new Map();

export function formatEndlessNumber(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num === 0) return '0';
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);

  if (abs < 1000) {
    return `${sign}${Math.floor(abs)}`;
  }

  const tiers = [
    { limit: 1e12, suffix: 'T' },
    { limit: 1e9, suffix: 'B' },
    { limit: 1e6, suffix: 'M' },
    { limit: 1e3, suffix: 'K' }
  ];

  if (abs >= 1e15) {
    return `${sign}${abs.toExponential(2).replace('+', '')}`;
  }

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (abs >= tier.limit) {
      const scaled = abs / tier.limit;
      if (scaled >= 999.995) {
        if (i === 0) {
          return `${sign}${abs.toExponential(2).replace('+', '')}`;
        }
        const nextTier = tiers[i - 1];
        return `${sign}${(abs / nextTier.limit).toFixed(2)}${nextTier.suffix}`;
      }
      return `${sign}${scaled.toFixed(2)}${tier.suffix}`;
    }
  }

  return `${sign}${Math.floor(abs)}`;
}

function makeEmptyRelicMap() {
  const map = {};
  for (let i = 0; i < ENDLESS_RELICS.length; i++) {
    map[ENDLESS_RELICS[i].id] = 0;
  }
  return map;
}

function resolveBrowserStorage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (_err) {
    return null;
  }
  return null;
}

export class EndlessEconomy {
  constructor({ storageOverride = null } = {}) {
    this._storage = storageOverride || null;
    this.gold = 0;
    this.totalGoldEarned = 0;
    this.astralShards = 0;
    this.totalAstralShards = 0;
    this.stage = 1;
    this.bestStage = 1;
    this.waveInStage = 1;
    this.totalKills = 0;
    this.bossesSlain = 0;
    this.totalTaps = 0;
    this.relicLevels = makeEmptyRelicMap();
    this.bulkMode = 'x1';
    this.autoBoss = true;
    this.tapFever = 0;
    this.tapFeverTimer = 0;
    this.tapFeverLevel = 0;
    this.dpsMetrics = {
      heroDps: 0,
      tapDps: 0,
      companionDps: 0,
      goldPerSec: 0
    };
    this.lastSavedAt = 0;
    this.activeHeroId = null;
    this._externalModifiers = {};

    this._clock = 0;
    this._feverTapCount = 0;
    this._damageSamples = {
      hero: [],
      tap: [],
      companion: []
    };
    this._goldSamples = [];
  }

  resetRunState({ keepMeta = true } = {}) {
    const startGold = Math.max(
      0,
      Math.floor(Number(this._externalModifiers?.startingGold) || 0)
    );
    this.gold = startGold;
    this.totalGoldEarned = startGold;
    this.stage = 1;
    this.waveInStage = 1;
    this.totalKills = 0;
    this.bossesSlain = 0;
    this.totalTaps = 0;
    this.relicLevels = makeEmptyRelicMap();
    this.tapFever = 0;
    this.tapFeverTimer = 0;
    this.tapFeverLevel = 0;
    this._feverTapCount = 0;
    this._clock = 0;
    this._damageSamples.hero.length = 0;
    this._damageSamples.tap.length = 0;
    this._damageSamples.companion.length = 0;
    this._goldSamples.length = 0;
    this.dpsMetrics = {
      heroDps: 0,
      tapDps: 0,
      companionDps: 0,
      goldPerSec: 0
    };

    if (!keepMeta) {
      this.astralShards = 0;
      this.totalAstralShards = 0;
      this.bestStage = 1;
      this.bulkMode = 'x1';
      this.autoBoss = true;
      this.lastSavedAt = 0;
    }
  }

  setExternalModifiers(mods = {}) {
    if (!mods || typeof mods !== 'object') {
      this._externalModifiers = {};
      return;
    }
    const next = {};
    const keys = Object.keys(mods);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = Number(mods[k]);
      if (Number.isFinite(v)) {
        next[k] = v;
      }
    }
    this._externalModifiers = next;
  }

  _extMult(key, fallback = 1.0) {
    const v = this._externalModifiers?.[key];
    return Number.isFinite(v) && v > 0 ? v : fallback;
  }

  _extBonus(key, fallback = 0) {
    const v = this._externalModifiers?.[key];
    return Number.isFinite(v) ? v : fallback;
  }

  getRelicLevel(relicId) {
    if (!RELIC_BY_ID.has(relicId)) return 0;
    return Math.max(0, Math.floor(Number(this.relicLevels[relicId]) || 0));
  }

  getRelicMilestoneInfo(relicId) {
    const level = this.getRelicLevel(relicId);
    return computeRelicMilestoneInfo(relicId, level);
  }

  getRelicSetSynergies() {
    const result = [];
    for (let i = 0; i < ENDLESS_RELIC_SETS.length; i++) {
      const setDef = ENDLESS_RELIC_SETS[i];
      let minLevel = Infinity;
      for (let j = 0; j < setDef.relicIds.length; j++) {
        const lv = this.getRelicLevel(setDef.relicIds[j]);
        if (lv < minLevel) minLevel = lv;
      }
      if (!Number.isFinite(minLevel)) minLevel = 0;

      let activeTier = null;
      let nextTier = null;
      for (let t = 0; t < setDef.tiers.length; t++) {
        const tierDef = setDef.tiers[t];
        if (minLevel >= tierDef.minLevel) {
          activeTier = tierDef;
        } else {
          nextTier = tierDef;
          break;
        }
      }

      const tier = activeTier ? activeTier.tier : 0;
      const active = tier > 0;
      const firstTier = setDef.tiers[0];
      result.push({
        id: setDef.id,
        name: setDef.name,
        color: setDef.color,
        sigilCol: setDef.sigilCol,
        relicIds: setDef.relicIds.slice(),
        minLevel,
        tier,
        maxTier: setDef.tiers.length,
        nextTierLevel: nextTier ? nextTier.minLevel : null,
        active,
        tierLabel: activeTier ? activeTier.tierLabel : 'LOCKED',
        bonusDesc: activeTier
          ? activeTier.bonusDesc
          : `ALL LV.${firstTier.minLevel}: ${firstTier.bonusDesc}`,
        bonuses: activeTier ? { ...activeTier.bonuses } : {}
      });
    }
    return result;
  }

  getCostDiscountMult() {
    const lv = this.getRelicLevel('merchant_crest');
    const mMerchant = getMilestoneMultForLevel(lv);
    // -2.5% on Lv.1, smoothly diminishing toward strict 50% cap (0.50x floor); Lv.0..9 mMerchant === 1.0
    const relicDiscount = Math.max(0.5, 1 - 0.5 * (1 - Math.pow(0.95, lv * mMerchant)));
    const extDiscount = this._extMult('relicDiscountMult', 1.0);
    return Math.max(0.15, Math.min(1.5, relicDiscount * extDiscount));
  }

  _getSingleRelicCost(relic, level, discountMult) {
    const raw = relic.baseCost * Math.pow(relic.costGrowth, level) * discountMult;
    if (!Number.isFinite(raw)) return Number.MAX_SAFE_INTEGER;
    return Math.max(1, Math.floor(raw));
  }

  getRelicCost(relicId, bulkModeOverride = null) {
    const relic = RELIC_BY_ID.get(relicId);
    if (!relic) {
      return { count: 0, totalCost: 0, canAfford: false, nextCost: 0 };
    }
    const mode = bulkModeOverride !== null && bulkModeOverride !== undefined
      ? bulkModeOverride
      : (this.bulkMode || 'x1');
    const level = this.getRelicLevel(relicId);
    const discount = this.getCostDiscountMult();
    const nextCost = this._getSingleRelicCost(relic, level, discount);

    if (typeof mode === 'string' && mode.toUpperCase() === 'MAX') {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < MAX_BULK_BUY_CAP; i++) {
        const c = this._getSingleRelicCost(relic, level + i, discount);
        if (sum + c <= this.gold) {
          sum += c;
          count += 1;
        } else {
          break;
        }
      }
      if (count === 0) {
        return {
          count: 1,
          totalCost: nextCost,
          canAfford: false,
          nextCost
        };
      }
      return {
        count,
        totalCost: sum,
        canAfford: true,
        nextCost
      };
    }

    let targetCount = 1;
    if (typeof mode === 'number' && Number.isFinite(mode)) {
      targetCount = Math.max(1, Math.min(MAX_BULK_BUY_CAP, Math.floor(mode)));
    } else if (typeof mode === 'string') {
      const upper = mode.trim().toUpperCase();
      if (upper === 'X10') {
        targetCount = 10;
      } else if (/^X\d+$/.test(upper)) {
        targetCount = Math.max(1, Math.min(MAX_BULK_BUY_CAP, parseInt(upper.slice(1), 10)));
      } else if (/^\d+$/.test(upper)) {
        targetCount = Math.max(1, Math.min(MAX_BULK_BUY_CAP, parseInt(upper, 10)));
      }
    }

    let totalCost = 0;
    for (let i = 0; i < targetCount; i++) {
      totalCost += this._getSingleRelicCost(relic, level + i, discount);
    }
    return {
      count: targetCount,
      totalCost,
      canAfford: this.gold >= totalCost,
      nextCost
    };
  }

  buyRelic(relicId, bulkModeOverride = null) {
    if (!RELIC_BY_ID.has(relicId)) {
      return { ok: false, bought: 0, spent: 0, newLevel: 0, milestoneReached: null, setsUpgraded: [] };
    }
    const currentLv = this.getRelicLevel(relicId);
    const quote = this.getRelicCost(relicId, bulkModeOverride);
    if (!quote.canAfford || quote.count <= 0 || quote.totalCost <= 0) {
      return { ok: false, bought: 0, spent: 0, newLevel: currentLv, milestoneReached: null, setsUpgraded: [] };
    }
    const prevMilestoneCount = computeRelicMilestoneInfo(relicId, currentLv).reachedCount;
    const prevSetTiers = this.getRelicSetSynergies().map((s) => s.tier);
    if (!this.spendGold(quote.totalCost)) {
      return { ok: false, bought: 0, spent: 0, newLevel: currentLv, milestoneReached: null, setsUpgraded: [] };
    }
    const newLevel = currentLv + quote.count;
    this.relicLevels[relicId] = newLevel;
    const nextMilestone = this.getRelicMilestoneInfo(relicId);
    const milestoneReached = nextMilestone.reachedCount > prevMilestoneCount
      ? RELIC_MILESTONE_BREAKPOINTS[nextMilestone.reachedCount - 1]
      : null;
    const nextSets = this.getRelicSetSynergies();
    const setsUpgraded = [];
    for (let i = 0; i < nextSets.length; i++) {
      if (nextSets[i].tier > prevSetTiers[i]) {
        setsUpgraded.push(nextSets[i]);
      }
    }
    return {
      ok: true,
      bought: quote.count,
      spent: quote.totalCost,
      newLevel,
      milestoneReached,
      setsUpgraded
    };
  }

  getComputedStats() {
    const lvBlade = this.getRelicLevel('sovereign_blade');
    const lvTap = this.getRelicLevel('arcane_tap_sigil');
    const lvMagnet = this.getRelicLevel('avarice_magnet');
    const lvCrit = this.getRelicLevel('executioner_crit');
    const lvHaste = this.getRelicLevel('tempest_haste');
    const lvVitality = this.getRelicLevel('aegis_vitality');
    const lvBanner = this.getRelicLevel('companion_banner');
    const lvBoss = this.getRelicLevel('boss_breaker');
    const lvSiphon = this.getRelicLevel('soul_siphon');
    const lvMerchant = this.getRelicLevel('merchant_crest');

    const mBlade = getMilestoneMultForLevel(lvBlade);
    const mTap = getMilestoneMultForLevel(lvTap);
    const mMagnet = getMilestoneMultForLevel(lvMagnet);
    const mCrit = getMilestoneMultForLevel(lvCrit);
    const mHaste = getMilestoneMultForLevel(lvHaste);
    const mVitality = getMilestoneMultForLevel(lvVitality);
    const mBanner = getMilestoneMultForLevel(lvBanner);
    const mBoss = getMilestoneMultForLevel(lvBoss);
    const mSiphon = getMilestoneMultForLevel(lvSiphon);
    const mMerchant = getMilestoneMultForLevel(lvMerchant);

    const relicSets = this.getRelicSetSynergies();
    let setHeroDmgMult = 1.0;
    let setBossDmgMult = 1.0;
    let setGoldMult = 1.0;
    let setCoinMagnetBonus = 0;
    let setTapDmgMult = 1.0;
    let setCompanionDmgMult = 1.0;
    let setHasteMult = 1.0;

    for (let i = 0; i < relicSets.length; i++) {
      const s = relicSets[i];
      if (!s.active || !s.bonuses) continue;
      const b = s.bonuses;
      if (Number.isFinite(b.heroDmgMult) && b.heroDmgMult > 0) setHeroDmgMult *= b.heroDmgMult;
      if (Number.isFinite(b.bossDmgMult) && b.bossDmgMult > 0) setBossDmgMult *= b.bossDmgMult;
      if (Number.isFinite(b.goldMult) && b.goldMult > 0) setGoldMult *= b.goldMult;
      if (Number.isFinite(b.coinMagnetBonus) && b.coinMagnetBonus > 0) setCoinMagnetBonus += b.coinMagnetBonus;
      if (Number.isFinite(b.tapDmgMult) && b.tapDmgMult > 0) setTapDmgMult *= b.tapDmgMult;
      if (Number.isFinite(b.companionDmgMult) && b.companionDmgMult > 0) setCompanionDmgMult *= b.companionDmgMult;
      if (Number.isFinite(b.hasteMult) && b.hasteMult > 0) setHasteMult *= b.hasteMult;
    }

    const extGlobalDps = this._extMult('globalDpsMult', 1.0);
    const extGold = this._extMult('goldMult', 1.0);
    const extTap = this._extMult('tapMult', 1.0);
    const extCompanion = this._extMult('companionMult', 1.0);
    const extCritChance = this._extBonus('critChanceBonus', 0);
    const extCritDmg = this._extMult('critDmgMult', 1.0);
    const extBossTimer = Math.max(0, this._extBonus('bossTimerBonusSec', 0));

    const feverActive = this.tapFeverTimer > 0;
    const feverGoldMult = feverActive ? (this.tapFeverLevel >= 2 ? 3.0 : 2.0) : 1.0;
    const feverDmgMult = feverActive ? (this.tapFeverLevel >= 2 ? 1.85 : 1.45) : 1.0;

    return {
      heroDmgMult: (1 + lvBlade * 0.18 * mBlade) * setHeroDmgMult * extGlobalDps,
      tapBaseDmg: 12 + lvTap * 8,
      tapDmgMult: (1 + lvTap * 0.28 * mTap) * setTapDmgMult * extTap * extGlobalDps,
      goldMult: (1 + lvMagnet * 0.16 * mMagnet) * setGoldMult * extGold,
      bossGoldMult: 1 + lvMerchant * 0.10 * mMerchant,
      coinMagnetRadius: 150 + Math.round(lvMagnet * 22 * mMagnet) + setCoinMagnetBonus,
      critChance: Math.min(0.75, Math.max(0, 0.05 + lvCrit * 0.022 * mCrit + extCritChance)),
      critMult: (1.75 + lvCrit * 0.14 * mCrit) * extCritDmg,
      hasteMult: (1 + lvHaste * 0.06 * mHaste) * setHasteMult,
      moveSpeedMult: Math.min(2.6, 1 + lvHaste * 0.04 * mHaste),
      maxHpMult: 1 + lvVitality * 0.20 * mVitality,
      hpRegenPct: lvVitality * 0.03 * mVitality,
      companionDmgMult: (1 + lvBanner * 0.24 * mBanner) * setCompanionDmgMult * extCompanion * extGlobalDps,
      bossDmgMult: (1 + lvBoss * 0.22 * mBoss) * setBossDmgMult,
      bossTimerBonusSec: Math.min(20, Math.floor(lvBoss / 2) * 1.5 * mBoss) + extBossTimer,
      lifestealPct: Math.min(0.25, lvSiphon * 0.015 * mSiphon),
      gaugeGainMult: 1 + lvSiphon * 0.10 * mSiphon,
      feverGoldMult,
      feverDmgMult,
      costDiscountMult: this.getCostDiscountMult(),
      relicSets
    };
  }

  addGold(rawAmount, { isBoss = false, applyMult = true } = {}) {
    const raw = Number(rawAmount);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    let added = raw;
    if (applyMult) {
      const stats = this.getComputedStats();
      const mult = stats.goldMult * stats.feverGoldMult * (isBoss ? stats.bossGoldMult : 1.0);
      added = Math.max(1, Math.round(raw * mult));
    } else {
      added = Math.max(0, Math.round(raw));
    }
    if (added <= 0) return 0;
    this.gold += added;
    this.totalGoldEarned += added;
    this._goldSamples.push({ t: this._clock, v: added });
    this._recomputeRollingMetrics();
    return added;
  }

  spendGold(amount) {
    const cost = Number(amount);
    if (!Number.isFinite(cost) || cost < 0) return false;
    if (this.gold < cost) return false;
    this.gold = Math.max(0, this.gold - cost);
    return true;
  }

  addAstralShards(amount) {
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) return 0;
    this.astralShards += amt;
    this.totalAstralShards += amt;
    return amt;
  }

  computeMonsterGoldReward(stage, { isElite = false, isWarden = false, isColossalBoss = false } = {}) {
    const s = Math.max(1, Math.floor(Number(stage) || 1));
    const base = 7 * Math.pow(1.25, s - 1);
    let mult = 1.0;
    if (isColossalBoss) {
      mult = 14.0;
    } else if (isWarden) {
      mult = 7.5;
    } else if (isElite) {
      mult = 2.2;
    }
    return Math.max(1, Math.round(base * mult));
  }

  computeTapSmiteHit(stage, { isBoss = false, rng = Math.random } = {}) {
    const s = Math.max(1, Math.floor(Number(stage) || 1));
    const rand = typeof rng === 'function' ? rng : Math.random;
    this.totalTaps += 1;

    let feverTriggered = false;
    if (this.tapFeverTimer <= 0) {
      const feverGain = 7 + Math.floor(Math.max(0, Math.min(0.999999, rand())) * 4);
      this.tapFever = Math.min(100, this.tapFever + feverGain);
      if (this.tapFever >= 100) {
        this.tapFever = 100;
        this.tapFeverTimer = FEVER_DURATION_SEC;
        this.tapFeverLevel = 1;
        this._feverTapCount = 0;
        feverTriggered = true;
      }
    } else {
      this._feverTapCount += 1;
      this.tapFever = 100;
      if (this.tapFeverLevel === 1 && this._feverTapCount >= FEVER_TIER2_THRESHOLD_TAPS) {
        this.tapFeverLevel = 2;
        this.tapFeverTimer = Math.min(9.5, this.tapFeverTimer + 2.5);
        feverTriggered = true;
      }
    }

    const stats = this.getComputedStats();
    const stageScale = Math.pow(1.16, s - 1);
    let rawDmg = stats.tapBaseDmg * stats.tapDmgMult * stageScale * stats.feverDmgMult;
    if (isBoss) {
      rawDmg *= stats.bossDmgMult;
    }

    const isCrit = rand() < stats.critChance;
    if (isCrit) {
      rawDmg *= stats.critMult;
    }

    const damage = Math.max(1, Math.round(rawDmg));
    this.recordDamageSample('tap', damage);

    const feverActive = this.tapFeverTimer > 0;
    let goldBonus = 0;
    if (feverTriggered) {
      goldBonus = Math.max(2, Math.round(this.computeMonsterGoldReward(s) * (this.tapFeverLevel >= 2 ? 0.8 : 0.45)));
    } else if (feverActive) {
      goldBonus = Math.max(1, Math.round(this.computeMonsterGoldReward(s) * (this.tapFeverLevel >= 2 ? 0.32 : 0.16)));
    }

    return {
      damage,
      isCrit,
      feverActive,
      feverTier: this.tapFeverLevel,
      feverTriggered,
      goldBonus
    };
  }

  recordDamageSample(source, amount) {
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) return;
    const bucket = this._damageSamples[source];
    if (!bucket) return;
    bucket.push({ t: this._clock, v: val });
    this._recomputeRollingMetrics();
  }

  _pruneAndSum(queue, cutoff) {
    let writeIdx = 0;
    let sum = 0;
    for (let i = 0; i < queue.length; i++) {
      const entry = queue[i];
      if (entry.t >= cutoff) {
        queue[writeIdx++] = entry;
        sum += entry.v;
      }
    }
    queue.length = writeIdx;
    return sum;
  }

  _recomputeRollingMetrics() {
    const cutoff = this._clock - ROLLING_METRIC_WINDOW_SEC;
    const windowSec = Math.max(1.0, Math.min(ROLLING_METRIC_WINDOW_SEC, this._clock || 1.0));
    const heroSum = this._pruneAndSum(this._damageSamples.hero, cutoff);
    const tapSum = this._pruneAndSum(this._damageSamples.tap, cutoff);
    const compSum = this._pruneAndSum(this._damageSamples.companion, cutoff);
    const goldSum = this._pruneAndSum(this._goldSamples, cutoff);

    this.dpsMetrics.heroDps = heroSum / windowSec;
    this.dpsMetrics.tapDps = tapSum / windowSec;
    this.dpsMetrics.companionDps = compSum / windowSec;
    this.dpsMetrics.goldPerSec = goldSum / windowSec;
  }

  update(dt) {
    const delta = Number.isFinite(dt) && dt > 0 ? dt : 0;
    this._clock += delta;

    if (this.tapFeverTimer > 0) {
      this.tapFeverTimer = Math.max(0, this.tapFeverTimer - delta);
      if (this.tapFeverTimer <= 0) {
        this.tapFever = 0;
        this.tapFeverLevel = 0;
        this._feverTapCount = 0;
      } else {
        this.tapFever = Math.max(0, Math.min(100, (this.tapFeverTimer / FEVER_DURATION_SEC) * 100));
      }
    } else if (this.tapFever > 0) {
      this.tapFever = Math.max(0, this.tapFever - delta * FEVER_DECAY_PER_SEC);
    }

    this._recomputeRollingMetrics();
  }

  exportSaveSnapshot(companionSnapshot = null, metaSnapshot = null) {
    const savedAt = Date.now();
    const relics = makeEmptyRelicMap();
    for (let i = 0; i < ENDLESS_RELICS.length; i++) {
      const id = ENDLESS_RELICS[i].id;
      relics[id] = this.getRelicLevel(id);
    }
    return {
      version: 1,
      savedAt,
      activeHeroId: this.activeHeroId || null,
      gold: Math.max(0, Math.floor(this.gold)),
      totalGoldEarned: Math.max(0, Math.floor(this.totalGoldEarned)),
      astralShards: Math.max(0, Math.floor(this.astralShards)),
      totalAstralShards: Math.max(0, Math.floor(this.totalAstralShards)),
      stage: Math.max(1, Math.floor(this.stage)),
      bestStage: Math.max(1, Math.floor(Math.max(this.bestStage, this.stage))),
      waveInStage: Math.max(1, Math.floor(this.waveInStage)),
      totalKills: Math.max(0, Math.floor(this.totalKills)),
      bossesSlain: Math.max(0, Math.floor(this.bossesSlain)),
      totalTaps: Math.max(0, Math.floor(this.totalTaps)),
      bulkMode: this.bulkMode === 'x10' || this.bulkMode === 'MAX' ? this.bulkMode : 'x1',
      autoBoss: Boolean(this.autoBoss),
      relicLevels: relics,
      companions: companionSnapshot || null,
      meta: metaSnapshot || null
    };
  }

  importSaveSnapshot(data) {
    if (!data || typeof data !== 'object') return false;
    const safeNonNeg = (v, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
    };
    const safeStage = (v, fallback = 1) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
    };

    this.gold = safeNonNeg(data.gold, 0);
    this.totalGoldEarned = Math.max(this.gold, safeNonNeg(data.totalGoldEarned, this.gold));
    this.astralShards = safeNonNeg(data.astralShards, 0);
    this.totalAstralShards = Math.max(this.astralShards, safeNonNeg(data.totalAstralShards, this.astralShards));
    this.stage = safeStage(data.stage, 1);
    this.bestStage = Math.max(this.stage, safeStage(data.bestStage, this.stage));
    this.waveInStage = safeStage(data.waveInStage, 1);
    this.totalKills = safeNonNeg(data.totalKills, 0);
    this.bossesSlain = safeNonNeg(data.bossesSlain, 0);
    this.totalTaps = safeNonNeg(data.totalTaps, 0);
    this.bulkMode = data.bulkMode === 'x10' || data.bulkMode === 'MAX' ? data.bulkMode : 'x1';
    this.autoBoss = data.autoBoss !== undefined ? Boolean(data.autoBoss) : true;
    this.activeHeroId = typeof data.activeHeroId === 'string' && data.activeHeroId ? data.activeHeroId : null;
    this.lastSavedAt = safeNonNeg(data.savedAt, 0);

    const nextRelics = makeEmptyRelicMap();
    if (data.relicLevels && typeof data.relicLevels === 'object') {
      for (let i = 0; i < ENDLESS_RELICS.length; i++) {
        const id = ENDLESS_RELICS[i].id;
        nextRelics[id] = safeNonNeg(data.relicLevels[id], 0);
      }
    }
    this.relicLevels = nextRelics;

    // Reset transient combat fever / rolling buffers on load
    this.tapFever = 0;
    this.tapFeverTimer = 0;
    this.tapFeverLevel = 0;
    this._feverTapCount = 0;
    this._clock = 0;
    this._damageSamples.hero.length = 0;
    this._damageSamples.tap.length = 0;
    this._damageSamples.companion.length = 0;
    this._goldSamples.length = 0;
    this.dpsMetrics = {
      heroDps: 0,
      tapDps: 0,
      companionDps: 0,
      goldPerSec: 0
    };

    return true;
  }

  _getStorageBackend() {
    if (this._storage) return this._storage;
    return resolveBrowserStorage();
  }

  saveToStorage(companionSnapshot = null, metaSnapshot = null) {
    const snap = this.exportSaveSnapshot(companionSnapshot, metaSnapshot);
    this.lastSavedAt = snap.savedAt;
    const serialized = JSON.stringify(snap);
    const backend = this._getStorageBackend();
    if (backend && typeof backend.setItem === 'function') {
      try {
        backend.setItem(ENDLESS_SAVE_STORAGE_KEY, serialized);
        if (!this._storage) {
          MEMORY_STORAGE_FALLBACK.set(ENDLESS_SAVE_STORAGE_KEY, serialized);
        }
        return true;
      } catch (_err) {
        if (this._storage) return false;
      }
    }
    if (!this._storage) {
      MEMORY_STORAGE_FALLBACK.set(ENDLESS_SAVE_STORAGE_KEY, serialized);
      return true;
    }
    return false;
  }

  loadFromStorage() {
    const backend = this._getStorageBackend();
    let raw = null;
    if (backend && typeof backend.getItem === 'function') {
      try {
        raw = backend.getItem(ENDLESS_SAVE_STORAGE_KEY);
      } catch (_err) {
        raw = null;
      }
    }
    if (!raw && !this._storage && MEMORY_STORAGE_FALLBACK.has(ENDLESS_SAVE_STORAGE_KEY)) {
      raw = MEMORY_STORAGE_FALLBACK.get(ENDLESS_SAVE_STORAGE_KEY);
    }
    if (!raw || typeof raw !== 'string') return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_err) {
      return null;
    }
  }

  clearStorage() {
    const backend = this._getStorageBackend();
    if (backend && typeof backend.removeItem === 'function') {
      try {
        backend.removeItem(ENDLESS_SAVE_STORAGE_KEY);
      } catch (_err) {
        // Ignore restricted storage removal errors
      }
    }
    if (!this._storage) {
      MEMORY_STORAGE_FALLBACK.delete(ENDLESS_SAVE_STORAGE_KEY);
    }
  }
}
