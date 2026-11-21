// Endless Crusade Replayable Challenge Trials: Gold Vault, Malphas Gauntlet & Abyssal Horde
// Node-safe (zero browser globals required), zero external deps, 100% pure ASCII (zero emojis or dingbats).

import { formatEndlessNumber } from './EndlessEconomy.js?v=30fps204';
import { GEAR_RARITY_BY_ID } from './EndlessGear.js?v=30fps204';

const MAX_STAGE_FOR_SCALING = 100000;
const MAX_STAGE_EXPONENT = 160;
const MAX_TRIAL_TIER = 12;
const MAX_GOLD_VALUE = 1e15;
const MAX_DAMAGE_VALUE = 1e24;
const MAX_SCORE_VALUE = 1e24;
const MAX_FORGE_DUST = 1e12;
const MAX_COUNTER = 1e9;

export const ENDLESS_TRIAL_DEFS = Object.freeze([
  Object.freeze({
    id: 'gold_vault',
    name: 'GILDED VAULT SPRINT',
    shortName: 'GOLD VAULT',
    durationSec: 30,
    cooldownSec: 30,
    accentHex: '#facc15',
    glowHex: '#fef08a',
    rewardTag: 'MASSIVE GOLD JACKPOT',
    desc: '30S non-stop Treasure Goblins and Gold Chests for huge Gold jackpots.'
  }),
  Object.freeze({
    id: 'malphas_gauntlet',
    name: 'COLOSSAL MALPHAS GAUNTLET',
    shortName: 'MALPHAS RUSH',
    durationSec: 45,
    cooldownSec: 30,
    accentHex: '#f43f5e',
    glowHex: '#fda4af',
    rewardTag: 'ASTRAL SHARDS + MYTHIC DUST',
    desc: '45S pure DPS check vs Behemoth Malphas paying Shards and Forge Dust per damage tier.'
  }),
  Object.freeze({
    id: 'abyssal_horde',
    name: 'ABYSSAL HORDE SURVIVAL',
    shortName: 'HORDE SURVIVAL',
    durationSec: 45,
    cooldownSec: 30,
    accentHex: '#c084fc',
    glowHex: '#e9d5ff',
    rewardTag: 'GUARANTEED HEROIC+ GEAR',
    desc: '45S dense monster swarm awarding guaranteed Heroic, Sovereign or Mythic Gear.'
  })
]);

export const ENDLESS_TRIAL_BY_ID = Object.freeze({
  gold_vault: ENDLESS_TRIAL_DEFS[0],
  malphas_gauntlet: ENDLESS_TRIAL_DEFS[1],
  abyssal_horde: ENDLESS_TRIAL_DEFS[2]
});

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

function roundTo(value, decimals = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

function clampStage(stage) {
  return clampInt(stage, 1, MAX_STAGE_FOR_SCALING, 1);
}

function makeEmptyTrialMap() {
  return {
    gold_vault: 0,
    malphas_gauntlet: 0,
    abyssal_horde: 0
  };
}

function computeTierThreshold(stage, tier) {
  const s = clampStage(stage);
  const t = clampInt(tier, 1, MAX_TRIAL_TIER, 1);
  const exp = Math.min(200, Math.max(0, s - 1));
  const base = Math.max(800, 1200 * Math.pow(1.22, exp));
  const raw = base * Math.pow(1.65, t - 1);
  if (!Number.isFinite(raw)) return MAX_DAMAGE_VALUE;
  return Math.max(1, Math.min(MAX_DAMAGE_VALUE, Math.round(raw)));
}

function computeFirstThreshold(stage) {
  return computeTierThreshold(stage, 1);
}

function computeGoldVaultBonus(stage, goblinsSlain, chestsCracked, completedFull, economy) {
  const s = clampStage(stage);
  const goblins = clampInt(goblinsSlain, 0, MAX_COUNTER, 0);
  const chests = clampInt(chestsCracked, 0, MAX_COUNTER, 0);
  const stageExp = Math.min(MAX_STAGE_EXPONENT, Math.max(0, s - 1));

  let stageUnit = Math.round(98 * Math.pow(1.25, stageExp));
  if (economy && typeof economy.computeMonsterGoldReward === 'function') {
    const econUnit = Number(economy.computeMonsterGoldReward(s, { isColossalBoss: true }));
    if (Number.isFinite(econUnit) && econUnit > 0) {
      stageUnit = econUnit;
    }
  }
  if (!Number.isFinite(stageUnit) || stageUnit <= 0) {
    stageUnit = MAX_GOLD_VALUE;
  } else {
    stageUnit = Math.min(MAX_GOLD_VALUE, stageUnit);
  }

  const baseUnits = completedFull ? 3.5 : 1.0;
  const activityUnits = goblins * 0.85 + chests * 0.65;
  const completionMult = completedFull ? 1.5 : 0.65;
  const rawBonus = Math.round(stageUnit * (baseUnits + activityUnits) * completionMult);
  const minFloor = completedFull ? 150 : 50;

  if (!Number.isFinite(rawBonus)) return MAX_GOLD_VALUE;
  return Math.max(minFloor, Math.min(MAX_GOLD_VALUE, rawBonus));
}

function buildHordeDropRarities(kills, completedFull) {
  const k = clampInt(kills, 0, MAX_COUNTER, 0);
  const primaryRarity = k >= 28 ? 'mythic' : k >= 12 ? 'sovereign' : 'heroic';
  const rarities = [primaryRarity];

  if (k >= 20) {
    rarities.push(k >= 28 ? 'sovereign' : 'heroic');
  }
  if (k >= 36 && completedFull) {
    rarities.push('heroic');
  }
  return rarities;
}

export class EndlessTrials {
  constructor() {
    this.activeTrial = null;
    this.lastResult = null;
    this.cooldowns = makeEmptyTrialMap();
    this.bestScores = makeEmptyTrialMap();
    this.totalTrialsCompleted = 0;
    this._uidSeq = 0;
  }

  reset() {
    this.activeTrial = null;
    this.lastResult = null;
    this.cooldowns = makeEmptyTrialMap();
    this.bestScores = makeEmptyTrialMap();
    this.totalTrialsCompleted = 0;
    this._uidSeq = 0;
  }

  _nextUid(prefix, tag) {
    this._uidSeq = clampInt(this._uidSeq + 1, 1, MAX_COUNTER, 1);
    return `${prefix}_${this._uidSeq}_${tag}`;
  }

  isActive() {
    return Boolean(this.activeTrial);
  }

  canEnter(trialId) {
    if (typeof trialId !== 'string' || !ENDLESS_TRIAL_BY_ID[trialId]) {
      return { ok: false, reason: 'invalid_trial', cooldownLeft: 0 };
    }
    const cooldownLeft = roundTo(Math.max(0, Number(this.cooldowns[trialId]) || 0), 2);
    if (this.activeTrial) {
      return { ok: false, reason: 'trial_active', cooldownLeft };
    }
    if (cooldownLeft > 0) {
      return { ok: false, reason: 'cooldown', cooldownLeft };
    }
    return { ok: true, reason: '', cooldownLeft: 0 };
  }

  startTrial(trialId, savedMainState = null, { stage = 1, ignoreCooldown = false } = {}) {
    if (typeof trialId !== 'string' || !ENDLESS_TRIAL_BY_ID[trialId]) {
      return { ok: false, reason: 'invalid_trial', trial: null };
    }
    if (this.activeTrial) {
      return { ok: false, reason: 'trial_active', trial: null };
    }

    const check = this.canEnter(trialId);
    if (!check.ok && !ignoreCooldown) {
      return {
        ok: false,
        reason: check.reason,
        cooldownLeft: check.cooldownLeft,
        trial: null
      };
    }

    const def = ENDLESS_TRIAL_BY_ID[trialId];
    const s = clampStage(stage);
    this.lastResult = null;

    const uid = this._nextUid('trial', def.id);
    this.activeTrial = {
      uid,
      id: def.id,
      def,
      remainingSec: def.durationSec,
      durationSec: def.durationSec,
      elapsedSec: 0,
      kills: 0,
      goblinsSlain: 0,
      chestsCracked: 0,
      goldEarned: 0,
      damageDealt: 0,
      currentTier: 0,
      nextTierThreshold: computeFirstThreshold(s),
      startedAtStage: s,
      savedMainState: savedMainState !== undefined ? savedMainState : null
    };

    return { ok: true, trial: this.activeTrial };
  }

  recordTrialGold(amount) {
    if (!this.activeTrial) return 0;
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) {
      return this.activeTrial.goldEarned;
    }
    const next = this.activeTrial.goldEarned + val;
    this.activeTrial.goldEarned = Number.isFinite(next)
      ? Math.min(MAX_GOLD_VALUE, next)
      : MAX_GOLD_VALUE;
    return this.activeTrial.goldEarned;
  }

  recordTrialKill({ isGoblin = false, isChest = false } = {}) {
    if (!this.activeTrial) {
      return { kills: 0, goblinsSlain: 0, chestsCracked: 0 };
    }
    this.activeTrial.kills = clampInt(
      this.activeTrial.kills + 1,
      0,
      MAX_COUNTER,
      this.activeTrial.kills
    );
    if (isGoblin) {
      this.activeTrial.goblinsSlain = clampInt(
        this.activeTrial.goblinsSlain + 1,
        0,
        MAX_COUNTER,
        this.activeTrial.goblinsSlain
      );
    }
    if (isChest) {
      this.activeTrial.chestsCracked = clampInt(
        this.activeTrial.chestsCracked + 1,
        0,
        MAX_COUNTER,
        this.activeTrial.chestsCracked
      );
    }
    return {
      kills: this.activeTrial.kills,
      goblinsSlain: this.activeTrial.goblinsSlain,
      chestsCracked: this.activeTrial.chestsCracked
    };
  }

  recordTrialBossDamage(amount, stage = null) {
    if (!this.activeTrial) {
      return {
        damageDealt: 0,
        tierReached: 0,
        tierUp: false,
        nextTierThreshold: 0
      };
    }

    const effStage = stage !== null && stage !== undefined
      ? clampStage(stage)
      : clampStage(this.activeTrial.startedAtStage);
    const val = Number(amount);
    if (Number.isFinite(val) && val > 0) {
      const nextDmg = this.activeTrial.damageDealt + val;
      this.activeTrial.damageDealt = Number.isFinite(nextDmg)
        ? Math.min(MAX_DAMAGE_VALUE, nextDmg)
        : MAX_DAMAGE_VALUE;
    }

    const prevTier = clampInt(this.activeTrial.currentTier, 0, MAX_TRIAL_TIER, 0);
    let nextTier = prevTier;
    while (nextTier < MAX_TRIAL_TIER) {
      const threshold = computeTierThreshold(effStage, nextTier + 1);
      if (this.activeTrial.damageDealt >= threshold) {
        nextTier += 1;
      } else {
        break;
      }
    }

    this.activeTrial.currentTier = nextTier;
    this.activeTrial.nextTierThreshold = nextTier < MAX_TRIAL_TIER
      ? computeTierThreshold(effStage, nextTier + 1)
      : 0;

    return {
      damageDealt: this.activeTrial.damageDealt,
      tierReached: nextTier,
      tierUp: nextTier > prevTier,
      nextTierThreshold: this.activeTrial.nextTierThreshold
    };
  }

  update(dt) {
    const delta = Number.isFinite(dt) && dt > 0 ? dt : 0;

    if (!this.activeTrial) {
      if (delta > 0) {
        for (let i = 0; i < ENDLESS_TRIAL_DEFS.length; i++) {
          const id = ENDLESS_TRIAL_DEFS[i].id;
          const cur = Number(this.cooldowns[id]) || 0;
          this.cooldowns[id] = cur > delta ? cur - delta : 0;
        }
      }
      return { expired: false, remainingSec: 0 };
    }

    if (delta > 0) {
      const prevRem = Math.max(0, Number(this.activeTrial.remainingSec) || 0);
      const used = Math.min(prevRem, delta);
      this.activeTrial.remainingSec = Math.max(0, prevRem - delta);
      this.activeTrial.elapsedSec = Math.min(
        this.activeTrial.durationSec,
        (Number(this.activeTrial.elapsedSec) || 0) + used
      );
    }

    const remainingSec = Math.max(0, Number(this.activeTrial.remainingSec) || 0);
    return {
      expired: remainingSec <= 0,
      remainingSec
    };
  }

  completeTrial(
    economy,
    gear = null,
    { completedFull = true, earlyExit = false, completed = undefined } = {}
  ) {
    const trial = this.activeTrial;
    if (!trial) {
      return { ok: false, result: null, savedMainState: null };
    }

    const def = trial.def || ENDLESS_TRIAL_BY_ID[trial.id] || ENDLESS_TRIAL_DEFS[0];
    const stage = clampStage(trial.startedAtStage);
    const isFull = earlyExit
      ? false
      : (completed !== undefined ? Boolean(completed) : Boolean(completedFull));
    const savedMainState = trial.savedMainState;

    const elapsedSec = clampFloat(trial.elapsedSec, 0, trial.durationSec, 0);
    const kills = clampInt(trial.kills, 0, MAX_COUNTER, 0);
    const goblinsSlain = clampInt(trial.goblinsSlain, 0, MAX_COUNTER, 0);
    const chestsCracked = clampInt(trial.chestsCracked, 0, MAX_COUNTER, 0);
    const damageDealt = Math.min(
      MAX_DAMAGE_VALUE,
      Math.round(Math.max(0, Number(trial.damageDealt) || 0))
    );
    const tierReached = clampInt(trial.currentTier, 0, MAX_TRIAL_TIER, 0);

    const hasProgress =
      elapsedSec >= 5 ||
      kills > 0 ||
      goblinsSlain > 0 ||
      chestsCracked > 0 ||
      damageDealt > 0;
    const aborted = (!isFull || elapsedSec < 5) && !hasProgress;

    const prevBest = Math.round(Number(this.bestScores[trial.id]) || 0);
    let isNewBest = false;

    let goldAwarded = aborted
      ? 0
      : Math.min(MAX_GOLD_VALUE, Math.round(Math.max(0, Number(trial.goldEarned) || 0)));
    let shardsAwarded = 0;
    let dustAwarded = 0;
    const gearAwarded = [];

    if (!aborted) {
      if (trial.id === 'gold_vault') {
        const bonusGold = computeGoldVaultBonus(stage, goblinsSlain, chestsCracked, isFull, economy);
        let bonusCredited = 0;
        if (economy && typeof economy.addGold === 'function') {
          const added = Number(economy.addGold(bonusGold));
          bonusCredited = Number.isFinite(added) && added > 0
            ? Math.min(MAX_GOLD_VALUE, Math.round(added))
            : 0;
        } else if (economy && typeof economy === 'object') {
          bonusCredited = bonusGold;
          const prevGold = Number.isFinite(Number(economy.gold)) ? Number(economy.gold) : 0;
          economy.gold = Math.min(MAX_GOLD_VALUE, Math.max(0, prevGold + bonusGold));
          if (economy.totalGoldEarned !== undefined) {
            const prevTotal = Number.isFinite(Number(economy.totalGoldEarned))
              ? Number(economy.totalGoldEarned)
              : prevGold;
            economy.totalGoldEarned = Math.min(
              MAX_GOLD_VALUE,
              Math.max(economy.gold, prevTotal + bonusGold)
            );
          }
        } else {
          bonusCredited = bonusGold;
        }
        goldAwarded = Math.min(MAX_GOLD_VALUE, goldAwarded + bonusCredited);
        if (goldAwarded > prevBest) {
          this.bestScores.gold_vault = goldAwarded;
          isNewBest = true;
        }
      } else if (trial.id === 'malphas_gauntlet') {
        shardsAwarded = Math.max(isFull ? 2 : 1, tierReached * 3);
        dustAwarded = Math.max(isFull ? 15 : 8, tierReached * 28);

        if (economy && typeof economy === 'object' && shardsAwarded > 0) {
          if (typeof economy.addAstralShards === 'function') {
            economy.addAstralShards(shardsAwarded);
          } else {
            const prevShards = Math.max(0, Math.floor(Number(economy.astralShards) || 0));
            const prevTotal = Math.max(
              prevShards,
              Math.floor(Number(economy.totalAstralShards) || 0)
            );
            economy.astralShards = prevShards + shardsAwarded;
            economy.totalAstralShards = prevTotal + shardsAwarded;
          }
        }

        if (gear && typeof gear === 'object' && dustAwarded > 0) {
          const prevDust = Math.max(0, Math.floor(Number(gear.forgeDust) || 0));
          gear.forgeDust = clampInt(prevDust + dustAwarded, 0, MAX_FORGE_DUST, prevDust);
        }

        if (damageDealt > prevBest) {
          this.bestScores.malphas_gauntlet = damageDealt;
          isNewBest = true;
        }
      } else if (trial.id === 'abyssal_horde') {
        const dropRarities = buildHordeDropRarities(kills, isFull);
        if (gear && typeof gear.rollDrop === 'function') {
          for (let i = 0; i < dropRarities.length; i++) {
            const forcedRarity = dropRarities[i];
            const rolled = gear.rollDrop({
              stage,
              source: 'chest',
              forcedRarity
            });
            if (!rolled) continue;
            let collectedItem = rolled;
            if (typeof gear.collectDrop === 'function') {
              const collectRes = gear.collectDrop(rolled, { autoEquipEmpty: true });
              if (collectRes && collectRes.item) {
                collectedItem = collectRes.item;
              }
            }
            const rarityKey = typeof collectedItem.rarity === 'string' && GEAR_RARITY_BY_ID[collectedItem.rarity]
              ? collectedItem.rarity
              : forcedRarity;
            gearAwarded.push({
              uid: typeof collectedItem.uid === 'string' ? collectedItem.uid : '',
              name: typeof collectedItem.name === 'string' && collectedItem.name
                ? collectedItem.name
                : 'TRIAL RELIC',
              rarity: rarityKey,
              slot: typeof collectedItem.slot === 'string' && collectedItem.slot
                ? collectedItem.slot
                : 'weapon',
              rarityMeta: GEAR_RARITY_BY_ID[rarityKey] || GEAR_RARITY_BY_ID.heroic
            });
          }
        }

        dustAwarded = clampInt(12 + kills * 2, 12, MAX_FORGE_DUST, 12);
        if (gear && typeof gear === 'object' && dustAwarded > 0) {
          const prevDust = Math.max(0, Math.floor(Number(gear.forgeDust) || 0));
          gear.forgeDust = clampInt(prevDust + dustAwarded, 0, MAX_FORGE_DUST, prevDust);
        }

        if (kills > prevBest) {
          this.bestScores.abyssal_horde = kills;
          isNewBest = true;
        }
      }

      this.totalTrialsCompleted = clampInt(
        this.totalTrialsCompleted + 1,
        0,
        MAX_COUNTER,
        this.totalTrialsCompleted + 1
      );
    }

    this.cooldowns[trial.id] = def.cooldownSec;

    const durationUsedSec = roundTo(elapsedSec, 2);
    const formattedDamage = formatEndlessNumber(damageDealt);
    const formattedGold = formatEndlessNumber(goldAwarded);

    this.lastResult = {
      uid: trial.uid,
      trialId: trial.id,
      trialName: def.name,
      accentHex: def.accentHex,
      durationUsedSec,
      kills,
      goblinsSlain,
      chestsCracked,
      damageDealt,
      formattedDamage,
      formattedDamageDealt: formattedDamage,
      tierReached,
      goldAwarded,
      formattedGold,
      shardsAwarded,
      dustAwarded,
      gearAwarded,
      completedFull: isFull && !aborted,
      aborted,
      isNewBest
    };

    this.activeTrial = null;

    return {
      ok: true,
      result: this.lastResult,
      savedMainState
    };
  }

  dismissResult() {
    const hadResult = Boolean(this.lastResult);
    this.lastResult = null;
    return hadResult;
  }

  getTrialsSnapshot(stage = 1) {
    const fallbackStage = clampStage(stage);
    const active = this.activeTrial;
    let activeSnap = null;

    if (active) {
      const def = active.def || ENDLESS_TRIAL_BY_ID[active.id] || ENDLESS_TRIAL_DEFS[0];
      const durationSec = Math.max(0.1, Number(active.durationSec) || def.durationSec || 30);
      const remainingSec = clampFloat(active.remainingSec, 0, durationSec, 0);
      const ratio = roundTo(clampFloat(remainingSec / durationSec, 0, 1, 0), 4);
      const goldEarned = Math.min(
        MAX_GOLD_VALUE,
        Math.round(Math.max(0, Number(active.goldEarned) || 0))
      );
      const damageDealt = Math.min(
        MAX_DAMAGE_VALUE,
        Math.round(Math.max(0, Number(active.damageDealt) || 0))
      );
      const currentTier = clampInt(active.currentTier, 0, MAX_TRIAL_TIER, 0);
      const activeStage = clampStage(active.startedAtStage || fallbackStage);
      const nextTierThreshold = currentTier >= MAX_TRIAL_TIER
        ? 0
        : Math.max(
          1,
          Math.round(Number(active.nextTierThreshold) || computeTierThreshold(activeStage, currentTier + 1))
        );

      activeSnap = {
        id: active.id,
        name: def.name,
        shortName: def.shortName,
        accentHex: def.accentHex,
        remainingSec: roundTo(remainingSec, 2),
        durationSec: roundTo(durationSec, 2),
        ratio,
        kills: clampInt(active.kills, 0, MAX_COUNTER, 0),
        goblinsSlain: clampInt(active.goblinsSlain, 0, MAX_COUNTER, 0),
        chestsCracked: clampInt(active.chestsCracked, 0, MAX_COUNTER, 0),
        goldEarned,
        formattedGoldEarned: formatEndlessNumber(goldEarned),
        damageDealt,
        formattedDamageDealt: formatEndlessNumber(damageDealt),
        currentTier,
        nextTierThreshold,
        formattedNextTier: currentTier >= MAX_TRIAL_TIER
          ? 'MAX'
          : formatEndlessNumber(nextTierThreshold)
      };
    }

    const trials = [];
    for (let i = 0; i < ENDLESS_TRIAL_DEFS.length; i++) {
      const def = ENDLESS_TRIAL_DEFS[i];
      const entryCheck = this.canEnter(def.id);
      const bestScore = Math.min(
        MAX_SCORE_VALUE,
        Math.round(Math.max(0, Number(this.bestScores[def.id]) || 0))
      );
      trials.push({
        id: def.id,
        name: def.name,
        shortName: def.shortName,
        durationSec: def.durationSec,
        cooldownSec: def.cooldownSec,
        accentHex: def.accentHex,
        glowHex: def.glowHex,
        rewardTag: def.rewardTag,
        desc: def.desc,
        cooldownLeft: entryCheck.cooldownLeft,
        canEnter: entryCheck.ok,
        bestScore,
        formattedBestScore: formatEndlessNumber(bestScore)
      });
    }

    const lastResult = this.lastResult
      ? {
          ...this.lastResult,
          gearAwarded: Array.isArray(this.lastResult.gearAwarded)
            ? this.lastResult.gearAwarded.map((entry) => ({ ...entry }))
            : []
        }
      : null;

    return {
      isActive: Boolean(activeSnap),
      activeTrial: activeSnap,
      trials,
      lastResult,
      totalTrialsCompleted: clampInt(this.totalTrialsCompleted, 0, MAX_COUNTER, 0)
    };
  }

  exportSnapshot() {
    const now = Date.now();
    const bestScores = makeEmptyTrialMap();
    const cooldownEndsAt = makeEmptyTrialMap();
    for (let i = 0; i < ENDLESS_TRIAL_DEFS.length; i++) {
      const def = ENDLESS_TRIAL_DEFS[i];
      const id = def.id;
      const raw = Number(this.bestScores[id]);
      bestScores[id] = Number.isFinite(raw) && raw > 0
        ? Math.min(MAX_SCORE_VALUE, Math.round(raw))
        : 0;
      const remSec = clampFloat(this.cooldowns[id], 0, def.cooldownSec, 0);
      cooldownEndsAt[id] = remSec > 0 ? Math.round(now + remSec * 1000) : 0;
    }

    return {
      version: 1,
      bestScores,
      cooldownEndsAt,
      totalTrialsCompleted: clampInt(this.totalTrialsCompleted, 0, MAX_COUNTER, 0),
      uidSeq: clampInt(this._uidSeq, 0, MAX_COUNTER, 0)
    };
  }

  importSnapshot(data) {
    if (!data || typeof data !== 'object') return false;

    const now = Date.now();
    const nextBest = makeEmptyTrialMap();
    if (data.bestScores && typeof data.bestScores === 'object') {
      for (let i = 0; i < ENDLESS_TRIAL_DEFS.length; i++) {
        const id = ENDLESS_TRIAL_DEFS[i].id;
        const raw = Number(data.bestScores[id]);
        nextBest[id] = Number.isFinite(raw) && raw > 0
          ? Math.min(MAX_SCORE_VALUE, Math.round(raw))
          : 0;
      }
    }

    const restoredCooldowns = makeEmptyTrialMap();
    if (data.cooldownEndsAt && typeof data.cooldownEndsAt === 'object') {
      for (let i = 0; i < ENDLESS_TRIAL_DEFS.length; i++) {
        const def = ENDLESS_TRIAL_DEFS[i];
        const id = def.id;
        const endsAt = Number(data.cooldownEndsAt[id]);
        if (Number.isFinite(endsAt) && endsAt > now) {
          const remSec = Math.max(0, (endsAt - now) / 1000);
          restoredCooldowns[id] = roundTo(Math.min(def.cooldownSec, remSec), 2);
        }
      }
    }

    this.bestScores = nextBest;
    this.totalTrialsCompleted = clampInt(data.totalTrialsCompleted, 0, MAX_COUNTER, 0);
    this._uidSeq = clampInt(data.uidSeq, 0, MAX_COUNTER, 0);

    // Never restore an active trial across page reloads
    this.activeTrial = null;
    this.lastResult = null;
    this.cooldowns = restoredCooldowns;

    return true;
  }
}
