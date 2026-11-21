// Endless Crusade Gear Drops, Equipment Slots, Forge Dust Enhancement & Mythic Set Passives
// Node-safe (zero browser globals required), zero external deps, pure ASCII (zero Unicode emojis).

import { formatEndlessNumber } from './EndlessEconomy.js?v=30fps202';

export const GEAR_SLOTS = Object.freeze(['weapon', 'armor', 'amulet', 'ring']);

export const GEAR_SLOT_META = Object.freeze({
  weapon: Object.freeze({
    id: 'weapon',
    label: 'WEAPON',
    shortLabel: 'WPN',
    primaryStat: 'heroDmgPct',
    sigilCol: 0,
    iconCol: 0
  }),
  armor: Object.freeze({
    id: 'armor',
    label: 'ARMOR',
    shortLabel: 'ARM',
    primaryStat: 'maxHpPct',
    sigilCol: 1,
    iconCol: 1
  }),
  amulet: Object.freeze({
    id: 'amulet',
    label: 'AMULET',
    shortLabel: 'AMU',
    primaryStat: 'tapDmgPct',
    sigilCol: 2,
    iconCol: 2
  }),
  ring: Object.freeze({
    id: 'ring',
    label: 'RELIC RING',
    shortLabel: 'RNG',
    primaryStat: 'goldPct',
    sigilCol: 3,
    iconCol: 3
  })
});

export const GEAR_RARITIES = Object.freeze([
  Object.freeze({
    id: 'common',
    tier: 0,
    label: 'COMMON',
    color: '#94a3b8',
    glowHex: '#cbd5e1',
    statMult: 1.0,
    salvageDust: 3,
    beamHeight: 112
  }),
  Object.freeze({
    id: 'arcane',
    tier: 1,
    label: 'ARCANE',
    color: '#38bdf8',
    glowHex: '#7dd3fc',
    statMult: 1.55,
    salvageDust: 8,
    beamHeight: 138
  }),
  Object.freeze({
    id: 'heroic',
    tier: 2,
    label: 'HEROIC',
    color: '#c084fc',
    glowHex: '#e9d5ff',
    statMult: 2.4,
    salvageDust: 20,
    beamHeight: 168
  }),
  Object.freeze({
    id: 'sovereign',
    tier: 3,
    label: 'SOVEREIGN',
    color: '#facc15',
    glowHex: '#fef08a',
    statMult: 3.8,
    salvageDust: 50,
    beamHeight: 204
  }),
  Object.freeze({
    id: 'mythic',
    tier: 4,
    label: 'MYTHIC',
    color: '#f43f5e',
    glowHex: '#fda4af',
    statMult: 6.2,
    salvageDust: 140,
    beamHeight: 248
  })
]);

export const GEAR_RARITY_BY_ID = Object.freeze({
  common: GEAR_RARITIES[0],
  arcane: GEAR_RARITIES[1],
  heroic: GEAR_RARITIES[2],
  sovereign: GEAR_RARITIES[3],
  mythic: GEAR_RARITIES[4]
});

export const GEAR_MAX_ENHANCE_LEVEL = 20;
export const GEAR_MAX_INVENTORY = 24;

export const MYTHIC_SET_PASSIVES = Object.freeze([
  Object.freeze({
    id: 'stormcaller',
    name: 'STORMCALLER',
    accentHex: '#38bdf8',
    shortDesc: 'TAP CHAIN-LIGHTNING (+3 JUMPS, 1.35X DMG)',
    fullDesc: 'Taps arc extra Chain-Lightning bolts to 3 foes even outside Fever.',
    empoweredDesc: 'EMPOWERED 4PC: +4 JUMPS, 1.65X CHAIN DMG'
  }),
  Object.freeze({
    id: 'blood_reaver',
    name: 'BLOOD-REAVER',
    accentHex: '#f43f5e',
    shortDesc: 'KILL NOVA + 8% LIFESTEAL ON SLAY',
    fullDesc: 'Slaying foes unleashes a crimson shockwave (45% AoE) and heals 8% max HP.',
    empoweredDesc: 'EMPOWERED 4PC: 65% KILL NOVA + 12% LIFESTEAL'
  }),
  Object.freeze({
    id: 'titan_slayer',
    name: 'TITAN-SLAYER',
    accentHex: '#facc15',
    shortDesc: 'BOSS EXECUTE <15% HP (+30% BOSS DMG)',
    fullDesc: 'Executes bosses below 15% HP instantly and grants +30% Boss Damage.',
    empoweredDesc: 'EMPOWERED 4PC: BOSS EXECUTE <20% HP (+50% BOSS DMG)'
  })
]);

export const MYTHIC_SET_BY_ID = Object.freeze({
  stormcaller: MYTHIC_SET_PASSIVES[0],
  blood_reaver: MYTHIC_SET_PASSIVES[1],
  titan_slayer: MYTHIC_SET_PASSIVES[2]
});

const MYTHIC_SET_REQUIRED_PIECES = 2;
const MYTHIC_SET_EMPOWERED_PIECES = 4;

const MAX_STAGE_FOR_SCALING = 100000;
const MAX_FORGE_DUST = 1e12;
const MAX_STAT_BONUS = 1e6;
const MAX_ITEM_CRIT_BONUS = 0.25;
const MAX_TOTAL_CRIT_BONUS = 0.45;
const MAX_GEAR_MULT = 1e6;
const MAX_ITEM_POWER = 1e9;

const ENHANCE_BASE_COST_BY_TIER = Object.freeze([4, 7, 12, 20, 32]);
const ENHANCE_SALVAGE_REFUND_RATE = 0.6;

const ITEM_NAME_POOLS = Object.freeze({
  weapon: Object.freeze({
    common: Object.freeze(['IRON LONGSWORD', 'STEEL BROADSWORD', 'ASHEN CLAYMORE']),
    arcane: Object.freeze(['RUNE-ETCHED BLADE', 'STARLIGHT SABER', 'AETHER FALCHION']),
    heroic: Object.freeze(['DREADKNIGHT GREATSWORD', 'VALKYRIE WARBLADE', 'ECLIPSE REAVER']),
    sovereign: Object.freeze(['SOVEREIGN SUNBLADE', 'CROWNBREAKER EDGE', 'GILDED JUDICATOR']),
    mythic: Object.freeze(['APOCALYPSE ECLIPSEBLADE', 'WORLDENDER CLAYMORE', 'GODSLAYER RELIQUARY'])
  }),
  armor: Object.freeze({
    common: Object.freeze(['IRON BREASTPLATE', 'VANGUARD BRIGANDINE', 'ASHEN CHAINMAIL']),
    arcane: Object.freeze(['RUNEFORGED CUIRASS', 'ASTRAL WARDPLATE', 'SPELLWEAVE HAUBERK']),
    heroic: Object.freeze(['SANCTUM AEGIS PLATE', 'DREADLORD CARAPACE', 'VALKYRIE BULWARK']),
    sovereign: Object.freeze(['SOVEREIGN WARPLATE', 'IMPERIAL SUN-AEGIS', 'GILDED BASTION']),
    mythic: Object.freeze(['IMMORTAL ECLIPSE AEGIS', 'TITANFORGED CITADEL', 'CATACLYSM SOVEREIGNMAIL'])
  }),
  amulet: Object.freeze({
    common: Object.freeze(['BRONZE TALISMAN', 'TRAVELER CHARM', 'QUARTZ PENDANT']),
    arcane: Object.freeze(['ARCANE FOCUS LOCKET', 'STARSHARD MEDALLION', 'MANASPRING AMULET']),
    heroic: Object.freeze(['TEMPEST EYE PENDANT', 'BLOODMOON CHOKER', 'ECLIPSE RELIC CORE']),
    sovereign: Object.freeze(['SOVEREIGN SUN-SIGIL', 'CROWNHEART MEDALLION', 'IMPERIAL ASTRAL CORE']),
    mythic: Object.freeze(['HEART OF THE ECLIPSE', 'PRIMORDIAL STAR-AMULET', 'ETERNAL CATACLYSM SEAL'])
  }),
  ring: Object.freeze({
    common: Object.freeze(['COPPER SIGNET', 'IRON WARBAND', 'MERCHANT LOOP']),
    arcane: Object.freeze(['RUNED SIGNET RING', 'AETHER COIL BAND', 'SAPPHIRE SEAL']),
    heroic: Object.freeze(['REAPER OATH RING', 'GOLDHOARD SIGNET', 'DREADCROWN BAND']),
    sovereign: Object.freeze(['SOVEREIGN VAULT SIGNET', 'EMPEROR GILDED RING', 'SUNKING HEIRLOOM']),
    mythic: Object.freeze(['RING OF ETERNAL RUIN', 'MYTHIC SOVEREIGN HALO', 'ASTRAL OVERLORD SEAL'])
  })
});

function clampInt(value, min, max, fallback = min) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

function roundTo(value, decimals = 4) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

function safeRand01(rng) {
  const fn = typeof rng === 'function' ? rng : Math.random;
  const raw = Number(fn());
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(0.9999999, raw));
}

function makeEmptyBonuses() {
  return {
    heroDmgPct: 0,
    tapDmgPct: 0,
    companionDmgPct: 0,
    goldPct: 0,
    critBonus: 0,
    bossDmgPct: 0,
    maxHpPct: 0
  };
}

function makeEmptyEquipped() {
  return {
    weapon: null,
    armor: null,
    amulet: null,
    ring: null
  };
}

function sanitizeBonuses(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const cleanPct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return roundTo(Math.min(MAX_STAT_BONUS, n), 4);
  };
  const rawCrit = Number(src.critBonus);
  const critBonus = Number.isFinite(rawCrit) && rawCrit > 0
    ? roundTo(Math.min(MAX_ITEM_CRIT_BONUS, rawCrit), 4)
    : 0;
  return {
    heroDmgPct: cleanPct(src.heroDmgPct),
    tapDmgPct: cleanPct(src.tapDmgPct),
    companionDmgPct: cleanPct(src.companionDmgPct),
    goldPct: cleanPct(src.goldPct),
    critBonus,
    bossDmgPct: cleanPct(src.bossDmgPct),
    maxHpPct: cleanPct(src.maxHpPct)
  };
}

function compareItemsDesc(a, b) {
  const powerDiff = (Number(b?.power) || 0) - (Number(a?.power) || 0);
  if (powerDiff !== 0) return powerDiff;
  const tierA = GEAR_RARITY_BY_ID[a?.rarity]?.tier ?? 0;
  const tierB = GEAR_RARITY_BY_ID[b?.rarity]?.tier ?? 0;
  if (tierB !== tierA) return tierB - tierA;
  const stageDiff = (Number(b?.stage) || 1) - (Number(a?.stage) || 1);
  if (stageDiff !== 0) return stageDiff;
  const uidA = typeof a?.uid === 'string' ? a.uid : '';
  const uidB = typeof b?.uid === 'string' ? b.uid : '';
  return uidA < uidB ? -1 : uidA > uidB ? 1 : 0;
}

function extractUidNumber(uid) {
  if (typeof uid !== 'string') return 0;
  const match = /^gear_(\d+)_/.exec(uid);
  if (!match) return 0;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getEnhanceStepCost(rarityTier, enhanceLevel) {
  const tier = clampInt(rarityTier, 0, GEAR_RARITIES.length - 1, 0);
  const lv = clampInt(enhanceLevel, 0, GEAR_MAX_ENHANCE_LEVEL, 0);
  if (lv >= GEAR_MAX_ENHANCE_LEVEL) return 0;
  const base = ENHANCE_BASE_COST_BY_TIER[tier] || 4;
  const raw = base * (1 + lv * 0.45 + lv * lv * 0.04);
  if (!Number.isFinite(raw)) return Number.MAX_SAFE_INTEGER;
  return Math.max(1, Math.round(raw));
}

function rollWeightedRarity(stage, source, rng) {
  const s = clampInt(stage, 1, MAX_STAGE_FOR_SCALING, 1);
  let wCommon = Math.max(4, 56 - s * 2.4);
  let wArcane = Math.max(12, 32 - Math.max(0, s - 8) * 0.9);
  let wHeroic = Math.min(34, 9 + s * 1.4);
  let wSovereign = s >= 2 ? Math.min(28, 2.5 + (s - 1) * 1.1) : 2.5;
  let wMythic = s >= 3 ? Math.min(18, 0.8 + (s - 2) * 0.65) : 0.4;

  if (source === 'colossal') {
    wCommon = 0;
    wArcane *= 0.65;
    wHeroic *= 1.25;
    wSovereign *= 1.8;
    wMythic *= 2.4;
  } else if (source === 'chest') {
    wCommon = 0;
    wArcane *= 0.7;
    wHeroic *= 1.3;
    wSovereign *= 1.75;
    wMythic *= 2.2;
  } else if (source === 'goblin') {
    wCommon *= 0.5;
    wArcane *= 1.1;
    wHeroic *= 1.2;
    wSovereign *= 1.35;
    wMythic *= 1.5;
  } else if (source === 'boss') {
    wCommon *= 0.75;
    wHeroic *= 1.15;
    wSovereign *= 1.25;
    wMythic *= 1.35;
  }

  const weights = [wCommon, wArcane, wHeroic, wSovereign, wMythic];
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    total += Math.max(0, weights[i]);
  }
  if (total <= 0) return 'common';

  let roll = safeRand01(rng) * total;
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i]);
    if (roll < w) {
      return GEAR_RARITIES[i].id;
    }
    roll -= w;
  }
  return GEAR_RARITIES[GEAR_RARITIES.length - 1].id;
}

function rollItemBonuses(slot, rarityMeta, stage, rng) {
  const bonuses = makeEmptyBonuses();
  const s = clampInt(stage, 1, MAX_STAGE_FOR_SCALING, 1);
  const stageScale = 1 + Math.min(200, s - 1) * 0.08;
  const rarityMult = Number(rarityMeta?.statMult) || 1.0;
  const tier = clampInt(rarityMeta?.tier, 0, GEAR_RARITIES.length - 1, 0);

  const rollPct = (base) => {
    const variance = 0.92 + safeRand01(rng) * 0.16;
    const raw = base * stageScale * rarityMult * variance;
    return roundTo(Math.min(MAX_STAT_BONUS, Math.max(0.01, raw)), 4);
  };

  const rollCrit = (base) => {
    const variance = 0.92 + safeRand01(rng) * 0.16;
    const rarityCritScale = 0.65 + 0.35 * Math.sqrt(rarityMult);
    const stageCritScale = 1 + Math.min(200, s - 1) * 0.004;
    const raw = base * rarityCritScale * stageCritScale * variance;
    return roundTo(Math.min(0.15, Math.max(0.005, raw)), 4);
  };

  if (slot === 'weapon') {
    bonuses.heroDmgPct = rollPct(0.14);
    const useTapSecondary = safeRand01(rng) < 0.5;
    if (useTapSecondary) {
      bonuses.tapDmgPct = rollPct(0.09);
    } else {
      bonuses.bossDmgPct = rollPct(0.10);
    }
    if (tier >= 1) {
      bonuses.critBonus = rollCrit(0.016);
    }
    if (tier >= 3) {
      if (useTapSecondary) {
        bonuses.bossDmgPct = rollPct(0.08);
      } else {
        bonuses.tapDmgPct = rollPct(0.08);
      }
    }
  } else if (slot === 'armor') {
    bonuses.maxHpPct = rollPct(0.18);
    const useHeroSecondary = safeRand01(rng) < 0.5;
    if (useHeroSecondary) {
      bonuses.heroDmgPct = rollPct(0.08);
    } else {
      bonuses.companionDmgPct = rollPct(0.10);
    }
    if (tier >= 1) {
      if (useHeroSecondary) {
        bonuses.companionDmgPct = rollPct(0.07);
      } else {
        bonuses.heroDmgPct = rollPct(0.06);
      }
    }
    if (tier >= 3) {
      bonuses.bossDmgPct = rollPct(0.08);
    }
  } else if (slot === 'amulet') {
    bonuses.tapDmgPct = rollPct(0.16);
    bonuses.companionDmgPct = rollPct(0.11);
    if (tier >= 1) {
      bonuses.critBonus = rollCrit(0.018);
    }
    if (tier >= 3) {
      bonuses.bossDmgPct = rollPct(0.09);
    }
  } else {
    bonuses.goldPct = rollPct(0.15);
    const useBossSecondary = safeRand01(rng) < 0.5;
    if (useBossSecondary) {
      bonuses.bossDmgPct = rollPct(0.11);
    } else {
      bonuses.tapDmgPct = rollPct(0.09);
    }
    if (tier >= 1) {
      bonuses.critBonus = rollCrit(0.016);
    }
    if (tier >= 3) {
      bonuses.companionDmgPct = rollPct(0.09);
    }
  }

  return bonuses;
}

function pickItemName(slot, rarityId, rng) {
  const slotPool = ITEM_NAME_POOLS[slot] || ITEM_NAME_POOLS.weapon;
  const names = slotPool[rarityId] || slotPool.common;
  const idx = Math.floor(safeRand01(rng) * names.length);
  return names[Math.max(0, Math.min(names.length - 1, idx))];
}

function serializeItem(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    uid: item.uid,
    slot: item.slot,
    rarity: item.rarity,
    name: item.name,
    stage: item.stage,
    enhanceLevel: item.enhanceLevel,
    setId: item.setId || null,
    power: item.power,
    bonuses: { ...item.bonuses }
  };
}

export class EndlessGear {
  constructor() {
    this.forgeDust = 0;
    this.equipped = makeEmptyEquipped();
    this.inventory = [];
    this.totalDropped = 0;
    this.totalSalvaged = 0;
    this.totalEnhanced = 0;
    this._uidSeq = 0;
  }

  reset() {
    this.forgeDust = 0;
    this.equipped = makeEmptyEquipped();
    this.inventory = [];
    this.totalDropped = 0;
    this.totalSalvaged = 0;
    this.totalEnhanced = 0;
    this._uidSeq = 0;
  }

  _nextUid(slot, rarity) {
    this._uidSeq += 1;
    return `gear_${this._uidSeq}_${slot}_${rarity}`;
  }

  _hasUid(uid) {
    if (!uid) return false;
    for (let i = 0; i < GEAR_SLOTS.length; i++) {
      const eq = this.equipped[GEAR_SLOTS[i]];
      if (eq && eq.uid === uid) return true;
    }
    for (let i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i]?.uid === uid) return true;
    }
    return false;
  }

  _normalizeItem(raw, { forcedSlot = null, ensureUniqueUid = false } = {}) {
    if (!raw || typeof raw !== 'object') return null;
    const slot = forcedSlot && GEAR_SLOT_META[forcedSlot]
      ? forcedSlot
      : (typeof raw.slot === 'string' && GEAR_SLOT_META[raw.slot] ? raw.slot : null);
    if (!slot) return null;

    const rarity = typeof raw.rarity === 'string' && GEAR_RARITY_BY_ID[raw.rarity]
      ? raw.rarity
      : 'common';
    const stage = clampInt(raw.stage, 1, MAX_STAGE_FOR_SCALING, 1);
    const enhanceLevel = clampInt(raw.enhanceLevel, 0, GEAR_MAX_ENHANCE_LEVEL, 0);
    const setId = typeof raw.setId === 'string' && MYTHIC_SET_BY_ID[raw.setId]
      ? raw.setId
      : null;
    const rawName = typeof raw.name === 'string' ? raw.name.trim().toUpperCase() : '';
    const name = rawName || ITEM_NAME_POOLS[slot][rarity][0];
    const bonuses = sanitizeBonuses(raw.bonuses);

    let uid = typeof raw.uid === 'string' && raw.uid.trim() ? raw.uid.trim() : '';
    if (!uid || (ensureUniqueUid && this._hasUid(uid))) {
      uid = this._nextUid(slot, rarity);
    } else {
      const seqNum = extractUidNumber(uid);
      if (seqNum > this._uidSeq) {
        this._uidSeq = seqNum;
      }
    }

    const item = {
      uid,
      slot,
      rarity,
      name,
      stage,
      enhanceLevel,
      setId,
      power: 1,
      bonuses
    };
    item.power = this.computeItemPower(item);
    return item;
  }

  shouldDropFromSource(source, stage = 1, rng = Math.random) {
    const src = typeof source === 'string' ? source.trim().toLowerCase() : '';
    if (src === 'boss' || src === 'colossal' || src === 'chest') {
      return true;
    }
    if (src === 'goblin') {
      return safeRand01(rng) < 0.85;
    }
    if (src === 'elite') {
      return safeRand01(rng) < 0.38;
    }
    return false;
  }

  rollDrop({
    stage = 1,
    source = 'boss',
    forcedRarity = null,
    forcedSlot = null,
    forcedSetId = null,
    rng = Math.random
  } = {}) {
    const s = clampInt(stage, 1, MAX_STAGE_FOR_SCALING, 1);
    const src = typeof source === 'string' ? source.trim().toLowerCase() : 'boss';

    const slot = typeof forcedSlot === 'string' && GEAR_SLOT_META[forcedSlot]
      ? forcedSlot
      : GEAR_SLOTS[Math.floor(safeRand01(rng) * GEAR_SLOTS.length)];

    const rarity = typeof forcedRarity === 'string' && GEAR_RARITY_BY_ID[forcedRarity]
      ? forcedRarity
      : rollWeightedRarity(s, src, rng);
    const rarityMeta = GEAR_RARITY_BY_ID[rarity] || GEAR_RARITIES[0];

    let setId = null;
    if (typeof forcedSetId === 'string' && MYTHIC_SET_BY_ID[forcedSetId]) {
      setId = forcedSetId;
    } else if (rarity === 'mythic' || rarity === 'sovereign') {
      const setIdx = Math.floor(safeRand01(rng) * MYTHIC_SET_PASSIVES.length);
      setId = MYTHIC_SET_PASSIVES[setIdx].id;
    }

    const name = pickItemName(slot, rarity, rng);
    const bonuses = rollItemBonuses(slot, rarityMeta, s, rng);
    const uid = this._nextUid(slot, rarity);

    const item = {
      uid,
      slot,
      rarity,
      name,
      stage: s,
      enhanceLevel: 0,
      setId,
      power: 1,
      bonuses
    };
    item.power = this.computeItemPower(item);
    return item;
  }

  computeItemEffectiveBonuses(item) {
    if (!item || typeof item !== 'object') {
      return makeEmptyBonuses();
    }
    const enhanceLv = clampInt(item.enhanceLevel, 0, GEAR_MAX_ENHANCE_LEVEL, 0);
    const enhanceMult = 1 + enhanceLv * 0.12;
    const critEnhanceMult = 1 + enhanceLv * 0.04;
    const b = item.bonuses && typeof item.bonuses === 'object' ? item.bonuses : {};

    const scalePct = (val) => {
      const n = Number(val);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return roundTo(Math.min(MAX_STAT_BONUS, n * enhanceMult), 4);
    };
    const rawCrit = Number(b.critBonus);
    const critBonus = Number.isFinite(rawCrit) && rawCrit > 0
      ? roundTo(Math.min(MAX_ITEM_CRIT_BONUS, rawCrit * critEnhanceMult), 4)
      : 0;

    return {
      heroDmgPct: scalePct(b.heroDmgPct),
      tapDmgPct: scalePct(b.tapDmgPct),
      companionDmgPct: scalePct(b.companionDmgPct),
      goldPct: scalePct(b.goldPct),
      critBonus,
      bossDmgPct: scalePct(b.bossDmgPct),
      maxHpPct: scalePct(b.maxHpPct)
    };
  }

  computeItemPower(item) {
    if (!item || typeof item !== 'object') return 0;
    const eff = this.computeItemEffectiveBonuses(item);
    const rarityMeta = GEAR_RARITY_BY_ID[item.rarity] || GEAR_RARITIES[0];
    const enhanceLv = clampInt(item.enhanceLevel, 0, GEAR_MAX_ENHANCE_LEVEL, 0);

    const weighted =
      eff.heroDmgPct * 120 +
      eff.tapDmgPct * 105 +
      eff.companionDmgPct * 100 +
      eff.bossDmgPct * 95 +
      eff.goldPct * 85 +
      eff.maxHpPct * 80 +
      eff.critBonus * 600;

    const hasValidSet = typeof item.setId === 'string' && Boolean(MYTHIC_SET_BY_ID[item.setId]);
    const setWeight = hasValidSet
      ? (rarityMeta.tier >= 4 ? 18 : 8) * (1 + enhanceLv * 0.08)
      : 0;

    const raw = Math.round(weighted + setWeight + (rarityMeta.tier + 1) * 4);
    if (!Number.isFinite(raw)) return MAX_ITEM_POWER;
    return Math.max(1, Math.min(MAX_ITEM_POWER, raw));
  }

  getEnhanceCost(item) {
    if (!item || typeof item !== 'object') return 0;
    const lv = clampInt(item.enhanceLevel, 0, GEAR_MAX_ENHANCE_LEVEL, 0);
    if (lv >= GEAR_MAX_ENHANCE_LEVEL) return 0;
    const rarityMeta = GEAR_RARITY_BY_ID[item.rarity] || GEAR_RARITIES[0];
    return getEnhanceStepCost(rarityMeta.tier, lv);
  }

  getSalvageValue(item) {
    if (!item || typeof item !== 'object') return 0;
    const rarityMeta = GEAR_RARITY_BY_ID[item.rarity] || GEAR_RARITIES[0];
    const baseDust = Math.max(1, Math.floor(Number(rarityMeta.salvageDust) || 3));
    const lv = clampInt(item.enhanceLevel, 0, GEAR_MAX_ENHANCE_LEVEL, 0);
    let spentDust = 0;
    for (let i = 0; i < lv; i++) {
      spentDust += getEnhanceStepCost(rarityMeta.tier, i);
    }
    const refund = Math.floor(spentDust * ENHANCE_SALVAGE_REFUND_RATE);
    const total = baseDust + refund;
    return Number.isFinite(total) ? Math.max(1, Math.min(MAX_FORGE_DUST, total)) : baseDust;
  }

  collectDrop(item, { autoEquipEmpty = true } = {}) {
    const normalized = this._normalizeItem(item, { ensureUniqueUid: true });
    if (!normalized) {
      return {
        ok: false,
        item: null,
        autoEquipped: false,
        autoSalvagedCount: 0,
        autoSalvagedDust: 0
      };
    }

    this.totalDropped += 1;

    if (autoEquipEmpty && !this.equipped[normalized.slot]) {
      this.equipped[normalized.slot] = normalized;
      return {
        ok: true,
        item: normalized,
        autoEquipped: true,
        autoSalvagedCount: 0,
        autoSalvagedDust: 0
      };
    }

    this.inventory.push(normalized);
    this.inventory.sort(compareItemsDesc);

    let autoSalvagedCount = 0;
    let autoSalvagedDust = 0;
    while (this.inventory.length > GEAR_MAX_INVENTORY) {
      const weakest = this.inventory.pop();
      if (!weakest) break;
      const dust = this.getSalvageValue(weakest);
      this.forgeDust = clampInt(this.forgeDust + dust, 0, MAX_FORGE_DUST, this.forgeDust);
      this.totalSalvaged += 1;
      autoSalvagedCount += 1;
      autoSalvagedDust += dust;
    }

    return {
      ok: true,
      item: normalized,
      autoEquipped: false,
      autoSalvagedCount,
      autoSalvagedDust
    };
  }

  equipItem(uid) {
    if (typeof uid !== 'string' || !uid) {
      return { ok: false, equippedItem: null, previousItem: null };
    }
    const idx = this.inventory.findIndex((it) => it && it.uid === uid);
    if (idx < 0) {
      return { ok: false, equippedItem: null, previousItem: null };
    }

    const [target] = this.inventory.splice(idx, 1);
    const slot = target.slot;
    const previousItem = this.equipped[slot] || null;
    this.equipped[slot] = target;

    if (previousItem) {
      this.inventory.push(previousItem);
      this.inventory.sort(compareItemsDesc);
    }

    return {
      ok: true,
      equippedItem: target,
      previousItem
    };
  }

  unequipSlot(slot) {
    if (typeof slot !== 'string' || !GEAR_SLOT_META[slot]) {
      return { ok: false, item: null };
    }
    const current = this.equipped[slot];
    if (!current) {
      return { ok: false, item: null };
    }
    if (this.inventory.length >= GEAR_MAX_INVENTORY) {
      return { ok: false, item: null };
    }

    this.equipped[slot] = null;
    this.inventory.push(current);
    this.inventory.sort(compareItemsDesc);
    return { ok: true, item: current };
  }

  equipBest() {
    let changedCount = 0;
    for (let sIdx = 0; sIdx < GEAR_SLOTS.length; sIdx++) {
      const slot = GEAR_SLOTS[sIdx];
      const current = this.equipped[slot];
      const currentPower = current ? current.power : -1;

      let bestInvIdx = -1;
      let bestInvPower = currentPower;

      for (let i = 0; i < this.inventory.length; i++) {
        const cand = this.inventory[i];
        if (!cand || cand.slot !== slot) continue;
        if (cand.power > bestInvPower) {
          bestInvPower = cand.power;
          bestInvIdx = i;
        }
      }

      if (bestInvIdx >= 0) {
        const [winner] = this.inventory.splice(bestInvIdx, 1);
        this.equipped[slot] = winner;
        if (current) {
          this.inventory.push(current);
        }
        changedCount += 1;
      }
    }

    if (changedCount > 0) {
      this.inventory.sort(compareItemsDesc);
    }

    return {
      ok: changedCount > 0,
      changedCount,
      equippedBySlot: {
        weapon: this.equipped.weapon,
        armor: this.equipped.armor,
        amulet: this.equipped.amulet,
        ring: this.equipped.ring
      }
    };
  }

  enhanceItem(uid) {
    if (typeof uid !== 'string' || !uid) {
      return {
        ok: false,
        item: null,
        cost: 0,
        remainingDust: this.forgeDust,
        enhanceLevel: 0
      };
    }

    let target = null;
    let inInventory = false;
    for (let i = 0; i < GEAR_SLOTS.length; i++) {
      const eq = this.equipped[GEAR_SLOTS[i]];
      if (eq && eq.uid === uid) {
        target = eq;
        break;
      }
    }
    if (!target) {
      for (let i = 0; i < this.inventory.length; i++) {
        if (this.inventory[i] && this.inventory[i].uid === uid) {
          target = this.inventory[i];
          inInventory = true;
          break;
        }
      }
    }

    if (!target) {
      return {
        ok: false,
        item: null,
        cost: 0,
        remainingDust: this.forgeDust,
        enhanceLevel: 0
      };
    }

    const currentLv = clampInt(target.enhanceLevel, 0, GEAR_MAX_ENHANCE_LEVEL, 0);
    if (currentLv >= GEAR_MAX_ENHANCE_LEVEL) {
      return {
        ok: false,
        item: target,
        cost: 0,
        remainingDust: this.forgeDust,
        enhanceLevel: currentLv
      };
    }

    const cost = this.getEnhanceCost(target);
    if (cost <= 0 || this.forgeDust < cost) {
      return {
        ok: false,
        item: target,
        cost,
        remainingDust: this.forgeDust,
        enhanceLevel: currentLv
      };
    }

    this.forgeDust = Math.max(0, this.forgeDust - cost);
    target.enhanceLevel = currentLv + 1;
    target.power = this.computeItemPower(target);
    this.totalEnhanced += 1;

    if (inInventory) {
      this.inventory.sort(compareItemsDesc);
    }

    return {
      ok: true,
      item: target,
      cost,
      remainingDust: this.forgeDust,
      enhanceLevel: target.enhanceLevel
    };
  }

  salvageItem(uid) {
    if (typeof uid !== 'string' || !uid) {
      return { ok: false, uid: uid || '', dustGained: 0, totalDust: this.forgeDust };
    }
    const idx = this.inventory.findIndex((it) => it && it.uid === uid);
    if (idx < 0) {
      return { ok: false, uid, dustGained: 0, totalDust: this.forgeDust };
    }

    const [removed] = this.inventory.splice(idx, 1);
    const dustGained = this.getSalvageValue(removed);
    this.forgeDust = clampInt(this.forgeDust + dustGained, 0, MAX_FORGE_DUST, this.forgeDust);
    this.totalSalvaged += 1;

    return {
      ok: true,
      uid: removed.uid,
      dustGained,
      totalDust: this.forgeDust
    };
  }

  getSlotPowerDelta(item) {
    if (!item || typeof item !== 'object') return 0;
    const itemPower = Number.isFinite(Number(item.power))
      ? Math.round(Number(item.power))
      : this.computeItemPower(item);
    const eq = typeof item.slot === 'string' ? this.equipped[item.slot] : null;
    const equippedPower = eq && Number.isFinite(Number(eq.power))
      ? Math.round(Number(eq.power))
      : 0;
    return itemPower - equippedPower;
  }

  _partitionLowerInventory() {
    const sorted = this.inventory.slice().sort(compareItemsDesc);
    const keptForEmptySlot = {
      weapon: null,
      armor: null,
      amulet: null,
      ring: null
    };
    const kept = [];
    const salvageable = [];

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      if (!item) continue;
      const itemTier = GEAR_RARITY_BY_ID[item.rarity]?.tier ?? 0;
      const isProtectedRarity =
        item.rarity === 'sovereign' || item.rarity === 'mythic' || itemTier >= 3;
      const eq = this.equipped[item.slot];
      if (eq) {
        const eqTier = GEAR_RARITY_BY_ID[eq.rarity]?.tier ?? 0;
        const isHigherRarity = itemTier > eqTier;
        const eqStrictlyOutclassesHighRarity = eqTier >= itemTier && eq.power > item.power;
        const shouldKeep =
          item.power > eq.power ||
          isHigherRarity ||
          (isProtectedRarity && !eqStrictlyOutclassesHighRarity);
        if (shouldKeep) {
          kept.push(item);
        } else {
          salvageable.push(item);
        }
      } else if (!keptForEmptySlot[item.slot]) {
        keptForEmptySlot[item.slot] = item;
        kept.push(item);
      } else {
        const ref = keptForEmptySlot[item.slot];
        const refTier = GEAR_RARITY_BY_ID[ref.rarity]?.tier ?? 0;
        const isHigherRarity = itemTier > refTier;
        if (isHigherRarity || isProtectedRarity) {
          kept.push(item);
        } else {
          salvageable.push(item);
        }
      }
    }

    return { kept, salvageable };
  }

  salvageAllLower() {
    const { kept, salvageable } = this._partitionLowerInventory();
    if (salvageable.length === 0) {
      return { ok: false, count: 0, dustGained: 0, totalDust: this.forgeDust };
    }

    let dustGained = 0;
    for (let i = 0; i < salvageable.length; i++) {
      dustGained += this.getSalvageValue(salvageable[i]);
    }

    this.inventory = kept;
    this.forgeDust = clampInt(this.forgeDust + dustGained, 0, MAX_FORGE_DUST, this.forgeDust);
    this.totalSalvaged += salvageable.length;

    return {
      ok: true,
      count: salvageable.length,
      dustGained,
      totalDust: this.forgeDust
    };
  }

  getActiveMythicSets() {
    const counts = {
      stormcaller: 0,
      blood_reaver: 0,
      titan_slayer: 0
    };

    for (let i = 0; i < GEAR_SLOTS.length; i++) {
      const eq = this.equipped[GEAR_SLOTS[i]];
      if (!eq || !eq.setId || counts[eq.setId] === undefined) continue;
      const points = eq.rarity === 'mythic' ? 2 : 1;
      counts[eq.setId] += points;
    }

    const result = [];
    for (let i = 0; i < MYTHIC_SET_PASSIVES.length; i++) {
      const def = MYTHIC_SET_PASSIVES[i];
      const pieces = counts[def.id] || 0;
      const active = pieces >= MYTHIC_SET_REQUIRED_PIECES;
      const empowered = pieces >= MYTHIC_SET_EMPOWERED_PIECES;
      result.push({
        id: def.id,
        name: def.name,
        accentHex: def.accentHex,
        shortDesc: def.shortDesc,
        fullDesc: def.fullDesc,
        empoweredDesc: def.empoweredDesc || def.shortDesc,
        pieces,
        requiredPieces: MYTHIC_SET_REQUIRED_PIECES,
        empoweredPieces: MYTHIC_SET_EMPOWERED_PIECES,
        tierLabel: empowered
          ? '4PC EMPOWERED'
          : active
            ? '2PC ACTIVE'
            : `${pieces}/${MYTHIC_SET_REQUIRED_PIECES}PC`,
        active,
        empowered
      });
    }
    return result;
  }

  hasMythicPassive(setId) {
    if (typeof setId !== 'string' || !MYTHIC_SET_BY_ID[setId]) return false;
    const sets = this.getActiveMythicSets();
    for (let i = 0; i < sets.length; i++) {
      if (sets[i].id === setId) {
        return Boolean(sets[i].active);
      }
    }
    return false;
  }

  hasEmpoweredMythicPassive(setId) {
    if (typeof setId !== 'string' || !MYTHIC_SET_BY_ID[setId]) return false;
    const sets = this.getActiveMythicSets();
    for (let i = 0; i < sets.length; i++) {
      if (sets[i].id === setId) {
        return Boolean(sets[i].empowered);
      }
    }
    return false;
  }

  getGearModifiers() {
    let sumHero = 0;
    let sumTap = 0;
    let sumComp = 0;
    let sumGold = 0;
    let sumCrit = 0;
    let sumBoss = 0;
    let sumMaxHp = 0;
    let totalPower = 0;

    for (let i = 0; i < GEAR_SLOTS.length; i++) {
      const eq = this.equipped[GEAR_SLOTS[i]];
      if (!eq) continue;
      const eff = this.computeItemEffectiveBonuses(eq);
      sumHero += eff.heroDmgPct;
      sumTap += eff.tapDmgPct;
      sumComp += eff.companionDmgPct;
      sumGold += eff.goldPct;
      sumCrit += eff.critBonus;
      sumBoss += eff.bossDmgPct;
      sumMaxHp += eff.maxHpPct;
      totalPower += Math.max(0, Math.floor(Number(eq.power) || 0));
    }

    const sets = this.getActiveMythicSets();
    const setById = {};
    for (let i = 0; i < sets.length; i++) {
      setById[sets[i].id] = sets[i];
    }

    const storm = setById.stormcaller || { active: false, empowered: false };
    const blood = setById.blood_reaver || { active: false, empowered: false };
    const titan = setById.titan_slayer || { active: false, empowered: false };

    const titanBossBonus = titan.empowered ? 0.50 : titan.active ? 0.30 : 0;

    const boundMult = (sum) => {
      const raw = 1 + (Number.isFinite(sum) && sum > 0 ? sum : 0);
      return roundTo(Math.max(1.0, Math.min(MAX_GEAR_MULT, raw)), 4);
    };

    return {
      heroDmgMult: boundMult(sumHero),
      tapDmgMult: boundMult(sumTap),
      companionDmgMult: boundMult(sumComp),
      goldMult: boundMult(sumGold),
      critBonus: roundTo(Math.max(0, Math.min(MAX_TOTAL_CRIT_BONUS, Number.isFinite(sumCrit) ? sumCrit : 0)), 4),
      bossDmgMult: boundMult(sumBoss + titanBossBonus),
      maxHpMult: boundMult(sumMaxHp),
      totalPower: Math.max(0, Math.min(MAX_ITEM_POWER * 4, Math.floor(totalPower))),
      activeSets: {
        stormcaller: {
          active: Boolean(storm.active),
          empowered: Boolean(storm.empowered),
          extraJumps: storm.empowered ? 4 : storm.active ? 3 : 0,
          dmgMult: storm.empowered ? 1.65 : storm.active ? 1.35 : 1.0
        },
        blood_reaver: {
          active: Boolean(blood.active),
          empowered: Boolean(blood.empowered),
          novaPct: blood.empowered ? 0.65 : blood.active ? 0.45 : 0,
          lifestealPct: blood.empowered ? 0.12 : blood.active ? 0.08 : 0
        },
        titan_slayer: {
          active: Boolean(titan.active),
          empowered: Boolean(titan.empowered),
          executeThreshold: titan.empowered ? 0.20 : titan.active ? 0.15 : 0,
          bossDmgBonus: titanBossBonus
        }
      }
    };
  }

  _enrichItemForSnapshot(item, isEquipped) {
    if (!item) return null;
    const effectiveBonuses = this.computeItemEffectiveBonuses(item);
    const enhanceLevel = clampInt(item.enhanceLevel, 0, GEAR_MAX_ENHANCE_LEVEL, 0);
    const isMaxEnhanced = enhanceLevel >= GEAR_MAX_ENHANCE_LEVEL;
    const enhanceCost = this.getEnhanceCost(item);
    const canEnhance = !isMaxEnhanced && enhanceCost > 0 && this.forgeDust >= enhanceCost;
    const rarityMeta = GEAR_RARITY_BY_ID[item.rarity] || GEAR_RARITIES[0];
    const slotMeta = GEAR_SLOT_META[item.slot] || GEAR_SLOT_META.weapon;
    const setMeta = item.setId && MYTHIC_SET_BY_ID[item.setId] ? MYTHIC_SET_BY_ID[item.setId] : null;
    const salvageValue = this.getSalvageValue(item);
    const eqForSlot = this.equipped[item.slot] || null;
    const equippedPower = eqForSlot && Number.isFinite(Number(eqForSlot.power))
      ? Math.round(Number(eqForSlot.power))
      : 0;
    const powerDelta = isEquipped ? 0 : this.getSlotPowerDelta(item);
    const isUpgradeOverEquipped = isEquipped
      ? false
      : (!eqForSlot || item.power > eqForSlot.power);

    return {
      uid: item.uid,
      slot: item.slot,
      rarity: item.rarity,
      rarityOrder: rarityMeta.tier,
      name: item.name,
      stage: item.stage,
      enhanceLevel,
      setId: item.setId || null,
      power: item.power,
      equippedPower,
      powerDelta,
      bonuses: { ...item.bonuses },
      effectiveBonuses,
      enhanceCost,
      canEnhance,
      isMaxEnhanced,
      rarityMeta,
      slotMeta,
      setMeta,
      salvageValue,
      isUpgradeOverEquipped
    };
  }

  getGearSnapshot() {
    let totalPower = 0;
    let canEnhanceEquipped = false;
    const equippedSnap = makeEmptyEquipped();

    for (let i = 0; i < GEAR_SLOTS.length; i++) {
      const slot = GEAR_SLOTS[i];
      const eq = this.equipped[slot];
      const enriched = this._enrichItemForSnapshot(eq, true);
      equippedSnap[slot] = enriched;
      if (enriched) {
        totalPower += enriched.power;
        if (enriched.canEnhance) {
          canEnhanceEquipped = true;
        }
      }
    }

    let hasUpgradeAvailable = false;
    const inventorySnap = [];
    for (let i = 0; i < this.inventory.length; i++) {
      const enriched = this._enrichItemForSnapshot(this.inventory[i], false);
      if (!enriched) continue;
      if (enriched.isUpgradeOverEquipped) {
        hasUpgradeAvailable = true;
      }
      inventorySnap.push(enriched);
    }

    const { salvageable } = this._partitionLowerInventory();
    const activeSets = this.getActiveMythicSets();
    let empoweredSetCount = 0;
    for (let i = 0; i < activeSets.length; i++) {
      if (activeSets[i].empowered) empoweredSetCount += 1;
    }

    return {
      forgeDust: this.forgeDust,
      formattedForgeDust: formatEndlessNumber(this.forgeDust),
      totalPower,
      equipped: equippedSnap,
      inventory: inventorySnap,
      inventoryCount: inventorySnap.length,
      maxInventory: GEAR_MAX_INVENTORY,
      activeSets,
      empoweredSetCount,
      hasUpgradeAvailable,
      hasSalvageableLower: salvageable.length > 0,
      canEnhanceEquipped,
      totalDropped: this.totalDropped,
      totalSalvaged: this.totalSalvaged,
      totalEnhanced: this.totalEnhanced
    };
  }

  getSnapshot() {
    return this.getGearSnapshot();
  }

  exportSnapshot() {
    const equipped = makeEmptyEquipped();
    for (let i = 0; i < GEAR_SLOTS.length; i++) {
      const slot = GEAR_SLOTS[i];
      equipped[slot] = serializeItem(this.equipped[slot]);
    }
    const inventory = [];
    for (let i = 0; i < this.inventory.length; i++) {
      const serialized = serializeItem(this.inventory[i]);
      if (serialized) inventory.push(serialized);
    }

    return {
      version: 1,
      forgeDust: clampInt(this.forgeDust, 0, MAX_FORGE_DUST, 0),
      totalDropped: clampInt(this.totalDropped, 0, MAX_FORGE_DUST, 0),
      totalSalvaged: clampInt(this.totalSalvaged, 0, MAX_FORGE_DUST, 0),
      totalEnhanced: clampInt(this.totalEnhanced, 0, MAX_FORGE_DUST, 0),
      uidSeq: clampInt(this._uidSeq, 0, MAX_FORGE_DUST, 0),
      equipped,
      inventory
    };
  }

  importSnapshot(data) {
    if (!data || typeof data !== 'object') return false;

    this.forgeDust = clampInt(data.forgeDust, 0, MAX_FORGE_DUST, 0);
    this.totalDropped = clampInt(data.totalDropped, 0, MAX_FORGE_DUST, 0);
    this.totalSalvaged = clampInt(data.totalSalvaged, 0, MAX_FORGE_DUST, 0);
    this.totalEnhanced = clampInt(data.totalEnhanced, 0, MAX_FORGE_DUST, 0);
    this._uidSeq = clampInt(data.uidSeq, 0, MAX_FORGE_DUST, 0);

    const nextEquipped = makeEmptyEquipped();
    const seenUids = new Set();

    if (data.equipped && typeof data.equipped === 'object') {
      for (let i = 0; i < GEAR_SLOTS.length; i++) {
        const slot = GEAR_SLOTS[i];
        const rawItem = data.equipped[slot];
        if (!rawItem || typeof rawItem !== 'object') continue;
        const normalized = this._normalizeItem(rawItem, { forcedSlot: slot, ensureUniqueUid: false });
        if (!normalized) continue;
        if (seenUids.has(normalized.uid)) {
          normalized.uid = this._nextUid(normalized.slot, normalized.rarity);
        }
        seenUids.add(normalized.uid);
        nextEquipped[slot] = normalized;
      }
    }

    const nextInventory = [];
    if (Array.isArray(data.inventory)) {
      for (let i = 0; i < data.inventory.length; i++) {
        const rawItem = data.inventory[i];
        const normalized = this._normalizeItem(rawItem, { ensureUniqueUid: false });
        if (!normalized) continue;
        if (seenUids.has(normalized.uid)) {
          normalized.uid = this._nextUid(normalized.slot, normalized.rarity);
        }
        seenUids.add(normalized.uid);
        nextInventory.push(normalized);
      }
    }

    nextInventory.sort(compareItemsDesc);
    if (nextInventory.length > GEAR_MAX_INVENTORY) {
      nextInventory.length = GEAR_MAX_INVENTORY;
    }

    this.equipped = nextEquipped;
    this.inventory = nextInventory;
    return true;
  }
}
