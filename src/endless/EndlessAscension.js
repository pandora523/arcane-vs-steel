// Endless Crusade Astral Ascension Prestige, Eternal Artifacts & Offline Crusade Loot
// Node-safe (zero browser globals required), zero external deps, zero Unicode emojis.

import { formatEndlessNumber } from './EndlessEconomy.js?v=30fps201';

export const ASCENSION_UNLOCK_STAGE = 5;
export const OFFLINE_MIN_AWAY_SEC = 60;
export const OFFLINE_MAX_AWAY_SEC = 12 * 3600;

const OFFLINE_EFFICIENCY_RATE = 0.38;
const ACTIVE_WAVE_MONSTER_GOLD_PER_SEC = 0.65;
const OFFLINE_SHARD_INTERVAL_SEC = 1200;
const OFFLINE_MAX_SHARDS = 36;
const OFFLINE_SEC_PER_SIM_STAGE = 90;

export const ETERNAL_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'eternal_blade',
    name: 'ETERNAL WARBLADE',
    baseCost: 4,
    costGrowth: 1.45,
    maxLevel: 50,
    iconCol: 0,
    accentHex: '#fbbf24',
    desc: '+25% Global Hero & Tap DPS / lv',
    formatEffect(level) {
      const lv = Math.max(0, Math.floor(Number(level) || 0));
      return `+${Math.round(lv * 25)}% HERO & TAP DPS`;
    }
  }),
  Object.freeze({
    id: 'sovereign_vault',
    name: 'SOVEREIGN VAULT',
    baseCost: 4,
    costGrowth: 1.48,
    maxLevel: 40,
    iconCol: 1,
    accentHex: '#facc15',
    desc: '+500 Starting Gold & +15% Gold Mult / lv',
    formatEffect(level) {
      const lv = Math.max(0, Math.floor(Number(level) || 0));
      return `+${formatEndlessNumber(lv * 500)} START GOLD / +${Math.round(lv * 15)}% GOLD`;
    }
  }),
  Object.freeze({
    id: 'banner_of_oaths',
    name: 'BANNER OF OATHS',
    baseCost: 5,
    costGrowth: 1.48,
    maxLevel: 40,
    iconCol: 2,
    accentHex: '#c084fc',
    desc: '+30% Companion Mastery DMG & Heal / lv',
    formatEffect(level) {
      const lv = Math.max(0, Math.floor(Number(level) || 0));
      return `+${Math.round(lv * 30)}% ALLY DMG & HEAL`;
    }
  }),
  Object.freeze({
    id: 'astral_spark',
    name: 'ASTRAL FEVER PRISM',
    baseCost: 5,
    costGrowth: 1.50,
    maxLevel: 25,
    iconCol: 3,
    accentHex: '#38bdf8',
    desc: '+20% Tap Crit DMG & +1.2s Fever / lv',
    formatEffect(level) {
      const lv = Math.max(0, Math.floor(Number(level) || 0));
      return `+${Math.round(lv * 20)}% CRIT DMG / +${(lv * 1.2).toFixed(1)}S FEVER`;
    }
  }),
  Object.freeze({
    id: 'chronos_hourglass',
    name: 'CHRONOS HOURGLASS',
    baseCost: 6,
    costGrowth: 1.55,
    maxLevel: 15,
    iconCol: 4,
    accentHex: '#2dd4bf',
    desc: '+4.0s Boss Timer / lv',
    formatEffect(level) {
      const lv = Math.max(0, Math.floor(Number(level) || 0));
      return `+${(lv * 4).toFixed(1)}S BOSS TIMER`;
    }
  }),
  Object.freeze({
    id: 'gilded_ledger',
    name: 'GILDED LEDGER',
    baseCost: 7,
    costGrowth: 1.60,
    maxLevel: 10,
    iconCol: 5,
    accentHex: '#fde047',
    desc: '-5% Relic & Ally Cost / lv (max -40%)',
    formatEffect(level) {
      const lv = Math.max(0, Math.floor(Number(level) || 0));
      return `-${Math.round(Math.min(40, lv * 5))}% RELIC & ALLY COST`;
    }
  })
]);

const ARTIFACT_BY_ID = new Map(ETERNAL_ARTIFACTS.map((art) => [art.id, art]));

function makeEmptyArtifactMap() {
  const map = {};
  for (let i = 0; i < ETERNAL_ARTIFACTS.length; i++) {
    map[ETERNAL_ARTIFACTS[i].id] = 0;
  }
  return map;
}

function roundTo(value, decimals = 4) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatAwayDuration(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (sec >= 3600) {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return mins > 0 ? `${hours}H ${mins}M` : `${hours}H`;
  }
  if (sec >= 60) {
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return remSec > 0 ? `${mins}M ${remSec}S` : `${mins}M`;
  }
  return `${sec}S`;
}

export class EndlessAscension {
  constructor() {
    this.totalAscensions = 0;
    this.artifactLevels = makeEmptyArtifactMap();
    this.lifetimeShardsEarned = 0;
  }

  reset() {
    this.totalAscensions = 0;
    this.artifactLevels = makeEmptyArtifactMap();
    this.lifetimeShardsEarned = 0;
  }

  canAscend(stage) {
    return Math.floor(Number(stage) || 1) >= ASCENSION_UNLOCK_STAGE;
  }

  previewAscensionShards(stage, bossesSlain = 0) {
    const s = Math.floor(Number(stage) || 1);
    if (s < ASCENSION_UNLOCK_STAGE) return 0;
    const bosses = Math.max(0, Math.floor(Number(bossesSlain) || 0));
    const raw = Math.pow(s - 3, 1.55) * 4 + Math.min(40, bosses) * 2;
    if (!Number.isFinite(raw)) return 6;
    return Math.max(6, Math.floor(raw));
  }

  getArtifactLevel(id) {
    const art = ARTIFACT_BY_ID.get(id);
    if (!art) return 0;
    const raw = Math.floor(Number(this.artifactLevels[id]) || 0);
    return Math.max(0, Math.min(art.maxLevel, raw));
  }

  getArtifactCost(id, availableShards = 0) {
    const art = ARTIFACT_BY_ID.get(id);
    if (!art) {
      return {
        id,
        level: 0,
        maxLevel: 0,
        cost: 0,
        isMaxed: true,
        canAfford: false
      };
    }

    const level = this.getArtifactLevel(id);
    const isMaxed = level >= art.maxLevel;
    const shards = Math.max(0, Math.floor(Number(availableShards) || 0));

    if (isMaxed) {
      return {
        id: art.id,
        level,
        maxLevel: art.maxLevel,
        cost: 0,
        isMaxed: true,
        canAfford: false
      };
    }

    const rawCost = art.baseCost * Math.pow(art.costGrowth, level);
    const cost = Number.isFinite(rawCost)
      ? Math.max(1, Math.floor(rawCost))
      : Number.MAX_SAFE_INTEGER;

    return {
      id: art.id,
      level,
      maxLevel: art.maxLevel,
      cost,
      isMaxed: false,
      canAfford: shards >= cost
    };
  }

  buyArtifact(id, economy) {
    const currentShards = Math.max(0, Math.floor(Number(economy?.astralShards) || 0));
    if (!economy || typeof economy !== 'object' || !ARTIFACT_BY_ID.has(id)) {
      return {
        ok: false,
        artifactId: id,
        level: this.getArtifactLevel(id),
        cost: 0,
        remainingShards: currentShards
      };
    }

    const quote = this.getArtifactCost(id, currentShards);
    if (quote.isMaxed || !quote.canAfford || quote.cost <= 0) {
      return {
        ok: false,
        artifactId: id,
        level: quote.level,
        cost: quote.cost,
        remainingShards: currentShards
      };
    }

    const remainingShards = Math.max(0, currentShards - quote.cost);
    economy.astralShards = remainingShards;
    const nextLevel = quote.level + 1;
    this.artifactLevels[id] = nextLevel;

    return {
      ok: true,
      artifactId: id,
      level: nextLevel,
      cost: quote.cost,
      remainingShards: economy.astralShards
    };
  }

  getPermanentModifiers() {
    const lvBlade = this.getArtifactLevel('eternal_blade');
    const lvVault = this.getArtifactLevel('sovereign_vault');
    const lvBanner = this.getArtifactLevel('banner_of_oaths');
    const lvSpark = this.getArtifactLevel('astral_spark');
    const lvHourglass = this.getArtifactLevel('chronos_hourglass');
    const lvLedger = this.getArtifactLevel('gilded_ledger');

    const heroDmgMult = roundTo(1 + lvBlade * 0.25, 4);
    const tapDmgMult = roundTo(1 + lvBlade * 0.25, 4);
    const companionDmgMult = roundTo(1 + lvBanner * 0.30, 4);
    const goldMult = roundTo(1 + lvVault * 0.15, 4);
    const startingGold = lvVault * 500;
    const critDmgBonus = roundTo(lvSpark * 0.20, 4);
    const feverDurationBonusSec = roundTo(lvSpark * 1.2, 2);
    const bossTimerBonusSec = roundTo(lvHourglass * 4.0, 2);
    const relicDiscountMult = roundTo(Math.max(0.60, 1 - Math.min(0.40, lvLedger * 0.05)), 4);

    return {
      heroDmgMult,
      tapDmgMult,
      companionDmgMult,
      goldMult,
      startingGold,
      critDmgBonus,
      feverDurationBonusSec,
      bossTimerBonusSec,
      relicDiscountMult
    };
  }

  applyModifiersToEconomy(economy) {
    const mods = this.getPermanentModifiers();
    if (!economy || typeof economy.setExternalModifiers !== 'function') {
      return mods;
    }

    const prev =
      economy._externalModifiers && typeof economy._externalModifiers === 'object'
        ? economy._externalModifiers
        : {};
    const heroScale = mods.heroDmgMult > 0 ? mods.heroDmgMult : 1.0;

    economy.setExternalModifiers({
      ...prev,
      globalDpsMult: heroScale,
      tapMult: roundTo(mods.tapDmgMult / heroScale, 4),
      companionMult: roundTo(mods.companionDmgMult / heroScale, 4),
      goldMult: mods.goldMult,
      startingGold: mods.startingGold,
      critDmgMult: roundTo(1 + mods.critDmgBonus, 4),
      feverDurationBonusSec: mods.feverDurationBonusSec,
      bossTimerBonusSec: mods.bossTimerBonusSec,
      relicDiscountMult: mods.relicDiscountMult
    });

    return mods;
  }

  getAscensionView(stage, economy = null) {
    const resolvedStage = Math.max(1, Math.floor(Number(stage ?? economy?.stage) || 1));
    const bossesSlain = Math.max(0, Math.floor(Number(economy?.bossesSlain) || 0));
    const astralShards = Math.max(0, Math.floor(Number(economy?.astralShards) || 0));
    const totalAstralShards = Math.max(
      astralShards,
      Math.floor(Number(economy?.totalAstralShards) || 0)
    );
    const canAscend = this.canAscend(resolvedStage);
    const pendingShards = this.previewAscensionShards(resolvedStage, bossesSlain);
    const modifiers = this.getPermanentModifiers();

    const artifacts = ETERNAL_ARTIFACTS.map((art) => {
      const quote = this.getArtifactCost(art.id, astralShards);
      return {
        id: art.id,
        name: art.name,
        desc: art.desc,
        level: quote.level,
        maxLevel: art.maxLevel,
        cost: quote.cost,
        isMaxed: quote.isMaxed,
        canAfford: quote.canAfford,
        effectSummary: art.formatEffect(quote.level),
        iconCol: art.iconCol,
        accentHex: art.accentHex
      };
    });

    return {
      canAscend,
      unlockStage: ASCENSION_UNLOCK_STAGE,
      currentStage: resolvedStage,
      pendingShards,
      totalAscensions: this.totalAscensions,
      astralShards,
      totalAstralShards,
      lifetimeShardsEarned: this.lifetimeShardsEarned,
      modifiers,
      artifacts
    };
  }

  performAscension(economy, companions = null) {
    const mods = this.getPermanentModifiers();
    if (!economy || typeof economy !== 'object') {
      return {
        ok: false,
        shardsGained: 0,
        totalAscensions: this.totalAscensions,
        startingGold: mods.startingGold
      };
    }

    const stage = Math.max(1, Math.floor(Number(economy.stage) || 1));
    if (!this.canAscend(stage)) {
      return {
        ok: false,
        shardsGained: 0,
        totalAscensions: this.totalAscensions,
        startingGold: mods.startingGold
      };
    }

    const bossesSlain = Math.max(0, Math.floor(Number(economy.bossesSlain) || 0));
    const shardsGained = this.previewAscensionShards(stage, bossesSlain);

    if (typeof economy.addAstralShards === 'function') {
      economy.addAstralShards(shardsGained);
    } else {
      economy.astralShards =
        Math.max(0, Math.floor(Number(economy.astralShards) || 0)) + shardsGained;
      economy.totalAstralShards =
        Math.max(0, Math.floor(Number(economy.totalAstralShards) || 0)) + shardsGained;
    }

    economy.bestStage = Math.max(
      Math.max(1, Math.floor(Number(economy.bestStage) || 1)),
      stage
    );

    this.totalAscensions += 1;
    this.lifetimeShardsEarned += shardsGained;

    this.applyModifiersToEconomy(economy);

    if (typeof economy.resetRunState === 'function') {
      economy.resetRunState({ keepMeta: true });
    } else {
      economy.gold = mods.startingGold;
      economy.stage = 1;
      economy.waveInStage = 1;
      economy.bossesSlain = 0;
    }

    companions?.reset?.();

    return {
      ok: true,
      shardsGained,
      totalAscensions: this.totalAscensions,
      startingGold: mods.startingGold
    };
  }

  computeOfflineLoot(savedAtMs, nowMs, stage, economy = null) {
    const saved = Number(savedAtMs);
    const now = Number(nowMs);
    if (!Number.isFinite(saved) || saved <= 0 || !Number.isFinite(now)) {
      return null;
    }

    const awaySec = Math.floor((now - saved) / 1000);
    if (awaySec < OFFLINE_MIN_AWAY_SEC) {
      return null;
    }

    const cappedSec = Math.min(OFFLINE_MAX_AWAY_SEC, awaySec);
    const resolvedStage = Math.max(1, Math.floor(Number(stage ?? economy?.stage) || 1));

    const monsterBaseGold =
      economy && typeof economy.computeMonsterGoldReward === 'function'
        ? economy.computeMonsterGoldReward(resolvedStage)
        : Math.max(1, Math.round(7 * Math.pow(1.25, resolvedStage - 1)));

    const permMods = this.getPermanentModifiers();
    let goldMult = permMods.goldMult;
    if (economy && typeof economy.getComputedStats === 'function') {
      const stats = economy.getComputedStats();
      const hasExtGold =
        Number.isFinite(economy._externalModifiers?.goldMult) &&
        economy._externalModifiers.goldMult > 0;
      const statsGoldMult =
        Number.isFinite(stats?.goldMult) && stats.goldMult > 0 ? stats.goldMult : 1.0;
      goldMult = hasExtGold ? statsGoldMult : statsGoldMult * permMods.goldMult;
    } else if (economy && Number.isFinite(economy.goldMult) && economy.goldMult > 0) {
      goldMult = economy.goldMult * permMods.goldMult;
    }

    const activeWaveGoldPerSec = monsterBaseGold * ACTIVE_WAVE_MONSTER_GOLD_PER_SEC;
    const rawGold = activeWaveGoldPerSec * OFFLINE_EFFICIENCY_RATE * goldMult * cappedSec;
    const gold = Number.isFinite(rawGold)
      ? Math.max(1, Math.round(rawGold))
      : Number.MAX_SAFE_INTEGER;

    const astralShards =
      resolvedStage >= ASCENSION_UNLOCK_STAGE
        ? Math.min(OFFLINE_MAX_SHARDS, Math.floor(cappedSec / OFFLINE_SHARD_INTERVAL_SEC))
        : 0;

    return {
      awaySec,
      cappedSec,
      gold,
      astralShards,
      stagesSimulated: Math.max(1, Math.floor(cappedSec / OFFLINE_SEC_PER_SIM_STAGE)),
      formattedTime: formatAwayDuration(awaySec)
    };
  }

  exportSnapshot() {
    const levels = makeEmptyArtifactMap();
    for (let i = 0; i < ETERNAL_ARTIFACTS.length; i++) {
      const id = ETERNAL_ARTIFACTS[i].id;
      levels[id] = this.getArtifactLevel(id);
    }

    return {
      version: 1,
      totalAscensions: Math.max(0, Math.floor(Number(this.totalAscensions) || 0)),
      lifetimeShardsEarned: Math.max(0, Math.floor(Number(this.lifetimeShardsEarned) || 0)),
      artifactLevels: levels
    };
  }

  importSnapshot(snap) {
    if (!snap || typeof snap !== 'object') return false;

    const safeNonNeg = (v, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
    };

    this.totalAscensions = safeNonNeg(snap.totalAscensions, 0);
    this.lifetimeShardsEarned = safeNonNeg(snap.lifetimeShardsEarned, 0);

    const nextLevels = makeEmptyArtifactMap();
    if (snap.artifactLevels && typeof snap.artifactLevels === 'object') {
      for (let i = 0; i < ETERNAL_ARTIFACTS.length; i++) {
        const art = ETERNAL_ARTIFACTS[i];
        const raw = safeNonNeg(snap.artifactLevels[art.id], 0);
        nextLevels[art.id] = Math.min(art.maxLevel, raw);
      }
    }
    this.artifactLevels = nextLevels;
    return true;
  }
}
