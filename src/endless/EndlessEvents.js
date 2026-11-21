// Endless Crusade Dynamic Events: Rotating Mini-Bounties, World Shrines & Wandering Merchant
// Node-safe (zero browser globals required), zero external deps, pure ASCII (zero Unicode emojis).

import { formatEndlessNumber } from './EndlessEconomy.js?v=30fps203';

const MAX_ACTIVE_BUFFS = 6;
const MAX_STAGE_FOR_SCALING = 100000;
const MAX_REWARD_GOLD = 1e15;
const MAX_FORGE_DUST = 1e12;
const MAX_COUNTER = 1e9;
const MERCHANT_OFFER_DURATION_SEC = 22;
const ELIXIR_DURATION_SEC = 30;

export const ENDLESS_BOUNTY_TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'slay_monsters',
    title: 'SLAY MONSTERS',
    shortLabel: 'SLAY',
    baseTarget: 15,
    targetGrowth: 5,
    metric: 'kills',
    accentHex: '#f43f5e'
  }),
  Object.freeze({
    id: 'tap_smites',
    title: 'LAND TAP-SMITES',
    shortLabel: 'SMITES',
    baseTarget: 12,
    targetGrowth: 4,
    metric: 'taps',
    accentHex: '#38bdf8'
  }),
  Object.freeze({
    id: 'defeat_bosses',
    title: 'DEFEAT STAGE BOSSES',
    shortLabel: 'BOSSES',
    baseTarget: 1,
    targetGrowth: 1,
    metric: 'bosses',
    accentHex: '#facc15'
  }),
  Object.freeze({
    id: 'collect_coins',
    title: 'COLLECT GOLD COINS',
    shortLabel: 'COINS',
    baseTarget: 20,
    targetGrowth: 8,
    metric: 'coins',
    accentHex: '#fbbf24'
  }),
  Object.freeze({
    id: 'trigger_fever',
    title: 'TRIGGER TAP FEVER',
    shortLabel: 'FEVER',
    baseTarget: 1,
    targetGrowth: 1,
    metric: 'fevers',
    accentHex: '#c084fc'
  })
]);

const BOUNTY_TEMPLATE_BY_ID = Object.freeze({
  slay_monsters: ENDLESS_BOUNTY_TEMPLATES[0],
  tap_smites: ENDLESS_BOUNTY_TEMPLATES[1],
  defeat_bosses: ENDLESS_BOUNTY_TEMPLATES[2],
  collect_coins: ENDLESS_BOUNTY_TEMPLATES[3],
  trigger_fever: ENDLESS_BOUNTY_TEMPLATES[4]
});

export const ENDLESS_SHRINE_TYPES = Object.freeze([
  Object.freeze({
    id: 'greed',
    name: 'ALTAR OF GREED',
    shortLabel: '3X GOLD',
    desc: '3X GOLD GAIN (20S)',
    accentHex: '#facc15',
    glowHex: '#fef08a',
    durationSec: 20,
    modifiers: Object.freeze({
      goldMult: 3.0
    })
  }),
  Object.freeze({
    id: 'tempest',
    name: 'ALTAR OF TEMPEST',
    shortLabel: 'AUTO-LIGHTNING',
    desc: 'AUTO SKY-LIGHTNING (20S)',
    accentHex: '#38bdf8',
    glowHex: '#7dd3fc',
    durationSec: 20,
    modifiers: Object.freeze({
      autoLightningIntervalSec: 1.1,
      tapDmgMult: 1.35
    })
  }),
  Object.freeze({
    id: 'fury',
    name: 'ALTAR OF FURY',
    shortLabel: '2X CRIT/HASTE',
    desc: '2X CRIT & +50% HASTE (20S)',
    accentHex: '#f43f5e',
    glowHex: '#fda4af',
    durationSec: 20,
    modifiers: Object.freeze({
      critBonus: 0.35,
      critDmgMult: 2.0,
      hasteMult: 1.5,
      heroDmgMult: 1.25
    })
  }),
  Object.freeze({
    id: 'sanctuary',
    name: 'SANCTUARY SHRINE',
    shortLabel: 'HEAL + SHIELD',
    desc: 'FULL HEAL + AEGIS SHIELD (20S)',
    accentHex: '#34d399',
    glowHex: '#6ee7b7',
    durationSec: 20,
    modifiers: Object.freeze({
      maxHpMult: 1.35,
      damageReduction: 0.5,
      instantFullHeal: true
    })
  })
]);

export const ENDLESS_SHRINE_BY_ID = Object.freeze({
  greed: ENDLESS_SHRINE_TYPES[0],
  tempest: ENDLESS_SHRINE_TYPES[1],
  fury: ENDLESS_SHRINE_TYPES[2],
  sanctuary: ENDLESS_SHRINE_TYPES[3]
});

export const MERCHANT_OFFER_TYPES = Object.freeze({
  gear_chest: Object.freeze({
    id: 'gear_chest',
    title: 'DISCOUNT GEAR CHEST',
    subtitle: 'HEROIC / SOVEREIGN / MYTHIC GEAR',
    accentHex: '#facc15',
    durationSec: MERCHANT_OFFER_DURATION_SEC
  }),
  dps_elixir: Object.freeze({
    id: 'dps_elixir',
    title: '3X DPS ELIXIR',
    subtitle: '3X HERO, TAP & ALLY DMG (30S)',
    accentHex: '#c084fc',
    durationSec: MERCHANT_OFFER_DURATION_SEC
  })
});

const DPS_ELIXIR_BUFF_DEF = Object.freeze({
  id: 'dps_elixir',
  source: 'elixir',
  name: 'ARCANE DPS ELIXIR',
  shortLabel: '3X DPS',
  accentHex: '#c084fc',
  durationSec: ELIXIR_DURATION_SEC,
  modifiers: Object.freeze({
    heroDmgMult: 3.0,
    tapDmgMult: 3.0,
    companionDmgMult: 3.0
  })
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

function extractUidNumber(uid) {
  if (typeof uid !== 'string') return 0;
  const match = /^[a-z]+_(\d+)_/.exec(uid);
  if (!match) return 0;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export class EndlessEvents {
  constructor() {
    this.completedBounties = 0;
    this.bountyCycleIndex = 0;
    this.activeBounty = null;
    this.activeBuffs = [];
    this.activeMerchantOffer = null;
    this.totalShrinesActivated = 0;
    this.totalMerchantPurchases = 0;
    this._uidSeq = 0;

    this.ensureActiveBounty(1);
  }

  reset(stage = 1, economy = null) {
    this.completedBounties = 0;
    this.bountyCycleIndex = 0;
    this.activeBounty = null;
    this.activeBuffs = [];
    this.activeMerchantOffer = null;
    this.totalShrinesActivated = 0;
    this.totalMerchantPurchases = 0;
    this._uidSeq = 0;

    this.ensureActiveBounty(stage, economy);
  }

  resetRunEvents(stage = 1, economy = null) {
    const s = clampInt(stage, 1, MAX_STAGE_FOR_SCALING, 1);
    this.activeBuffs = [];
    this.activeMerchantOffer = null;
    this.activeBounty = null;
    return this.ensureActiveBounty(s, economy);
  }

  _nextUid(prefix, tag) {
    this._uidSeq += 1;
    return `${prefix}_${this._uidSeq}_${tag}`;
  }

  _upsertBuff(buff) {
    if (!buff || typeof buff !== 'object' || !buff.id) return null;
    const existingIdx = this.activeBuffs.findIndex((entry) => entry && entry.id === buff.id);
    if (existingIdx >= 0) {
      this.activeBuffs[existingIdx] = buff;
      return buff;
    }
    while (this.activeBuffs.length >= MAX_ACTIVE_BUFFS) {
      this.activeBuffs.shift();
    }
    this.activeBuffs.push(buff);
    return buff;
  }

  _computeBountyTarget(tpl) {
    const cycleTier = Math.min(
      6,
      Math.floor(Math.max(0, this.completedBounties) / ENDLESS_BOUNTY_TEMPLATES.length)
    );
    const maxTarget = tpl.baseTarget <= 2 ? 4 : tpl.baseTarget + tpl.targetGrowth * 6;
    const rawTarget = tpl.baseTarget + tpl.targetGrowth * cycleTier;
    return clampInt(rawTarget, 1, maxTarget, tpl.baseTarget);
  }

  _computeBountyRewards(stage, economy = null) {
    const s = clampInt(stage, 1, MAX_STAGE_FOR_SCALING, 1);
    const cycleTier = Math.min(
      6,
      Math.floor(Math.max(0, this.completedBounties) / ENDLESS_BOUNTY_TEMPLATES.length)
    );

    const bossGoldRaw = typeof economy?.computeMonsterGoldReward === 'function'
      ? Number(economy.computeMonsterGoldReward(s, { isWarden: true }))
      : NaN;
    const fallbackGold = Math.round(53 * Math.pow(1.25, Math.min(160, s - 1)));
    const baseGold = Number.isFinite(bossGoldRaw) && bossGoldRaw > 0
      ? Math.round(bossGoldRaw)
      : (Number.isFinite(fallbackGold) && fallbackGold > 0 ? fallbackGold : MAX_REWARD_GOLD);
    const rewardScale = 1 + cycleTier * 0.15;
    const scaledGold = Math.round(baseGold * rewardScale);
    const gold = Number.isFinite(scaledGold)
      ? Math.max(50, Math.min(MAX_REWARD_GOLD, scaledGold))
      : MAX_REWARD_GOLD;

    const astralShards = clampInt(
      1 + Math.floor((s - 1) / 4) + Math.floor(cycleTier / 2),
      1,
      4,
      1
    );
    const forgeDust = clampInt(
      10 + Math.floor((s - 1) * 2.5) + cycleTier * 5,
      10,
      45,
      10
    );

    return {
      gold,
      astralShards,
      forgeDust
    };
  }

  ensureActiveBounty(stage = 1, economy = null) {
    if (this.activeBounty && typeof this.activeBounty === 'object' && !this.activeBounty.claimed) {
      return this.activeBounty;
    }

    const s = clampInt(stage, 1, MAX_STAGE_FOR_SCALING, 1);
    const len = ENDLESS_BOUNTY_TEMPLATES.length;
    const idx = ((clampInt(this.bountyCycleIndex, 0, MAX_COUNTER, 0) % len) + len) % len;
    this.bountyCycleIndex = idx;

    const tpl = ENDLESS_BOUNTY_TEMPLATES[idx] || ENDLESS_BOUNTY_TEMPLATES[0];
    const target = this._computeBountyTarget(tpl);
    const rewards = this._computeBountyRewards(s, economy);

    this.activeBounty = {
      uid: this._nextUid('bounty', tpl.id),
      templateId: tpl.id,
      title: tpl.title,
      shortLabel: tpl.shortLabel,
      accentHex: tpl.accentHex,
      metric: tpl.metric,
      progress: 0,
      target,
      completed: false,
      claimed: false,
      stage: s,
      rewards
    };

    return this.activeBounty;
  }

  recordProgress(metric, amount = 1, stage = 1, economy = null) {
    const bounty = this.ensureActiveBounty(stage, economy);
    if (typeof metric !== 'string' || !metric) {
      return { progressed: false, justCompleted: false, bounty };
    }
    const delta = Math.floor(Number(amount));
    if (!Number.isFinite(delta) || delta <= 0) {
      return { progressed: false, justCompleted: false, bounty };
    }
    if (!bounty || bounty.metric !== metric || bounty.completed || bounty.claimed) {
      return { progressed: false, justCompleted: false, bounty };
    }

    const prev = bounty.progress;
    bounty.progress = Math.min(bounty.target, prev + delta);
    const progressed = bounty.progress > prev;
    let justCompleted = false;
    if (bounty.progress >= bounty.target) {
      bounty.completed = true;
      justCompleted = true;
    }

    return {
      progressed,
      justCompleted,
      bounty
    };
  }

  claimBounty(economy, gear = null, stage = 1) {
    const current = this.activeBounty;
    if (!current || !current.completed || current.claimed) {
      return {
        ok: false,
        rewards: null,
        completedBounties: this.completedBounties,
        nextBounty: current
      };
    }

    current.claimed = true;
    const rewards = {
      gold: Math.max(0, Math.floor(Number(current.rewards?.gold) || 0)),
      astralShards: Math.max(0, Math.floor(Number(current.rewards?.astralShards) || 0)),
      forgeDust: Math.max(0, Math.floor(Number(current.rewards?.forgeDust) || 0))
    };

    if (economy && typeof economy === 'object') {
      if (rewards.gold > 0) {
        if (typeof economy.addGold === 'function') {
          economy.addGold(rewards.gold, { applyMult: false });
        } else {
          const prevGold = Number.isFinite(Number(economy.gold)) ? Number(economy.gold) : 0;
          economy.gold = Math.max(0, prevGold + rewards.gold);
          if (economy.totalGoldEarned !== undefined) {
            const prevTotal = Number.isFinite(Number(economy.totalGoldEarned))
              ? Number(economy.totalGoldEarned)
              : prevGold;
            economy.totalGoldEarned = Math.max(economy.gold, prevTotal + rewards.gold);
          }
        }
      }
      if (rewards.astralShards > 0) {
        if (typeof economy.addAstralShards === 'function') {
          economy.addAstralShards(rewards.astralShards);
        } else {
          const prevShards = Math.max(0, Math.floor(Number(economy.astralShards) || 0));
          const prevTotalShards = Math.max(
            prevShards,
            Math.floor(Number(economy.totalAstralShards) || 0)
          );
          economy.astralShards = prevShards + rewards.astralShards;
          economy.totalAstralShards = prevTotalShards + rewards.astralShards;
        }
      }
    }

    if (gear && typeof gear === 'object' && rewards.forgeDust > 0) {
      const prevDust = Math.max(0, Math.floor(Number(gear.forgeDust) || 0));
      gear.forgeDust = clampInt(prevDust + rewards.forgeDust, 0, MAX_FORGE_DUST, prevDust);
    }

    this.completedBounties = clampInt(this.completedBounties + 1, 0, MAX_COUNTER, this.completedBounties + 1);
    this.bountyCycleIndex = (this.bountyCycleIndex + 1) % ENDLESS_BOUNTY_TEMPLATES.length;
    this.activeBounty = null;
    const nextBounty = this.ensureActiveBounty(stage, economy);

    return {
      ok: true,
      rewards: {
        gold: rewards.gold,
        formattedGold: formatEndlessNumber(rewards.gold),
        astralShards: rewards.astralShards,
        forgeDust: rewards.forgeDust
      },
      completedBounties: this.completedBounties,
      nextBounty
    };
  }

  activateShrine(shrineId) {
    const shrine = typeof shrineId === 'string' ? ENDLESS_SHRINE_BY_ID[shrineId] : null;
    if (!shrine) {
      return {
        ok: false,
        shrine: null,
        buff: null,
        instantFullHeal: false
      };
    }

    const buff = {
      id: shrine.id,
      source: 'shrine',
      name: shrine.name,
      shortLabel: shrine.shortLabel,
      accentHex: shrine.accentHex,
      remainingSec: shrine.durationSec,
      durationSec: shrine.durationSec,
      modifiers: { ...shrine.modifiers }
    };

    this._upsertBuff(buff);
    this.totalShrinesActivated = clampInt(
      this.totalShrinesActivated + 1,
      0,
      MAX_COUNTER,
      this.totalShrinesActivated + 1
    );

    return {
      ok: true,
      shrine,
      buff,
      instantFullHeal: Boolean(shrine.modifiers.instantFullHeal)
    };
  }

  rollMerchantOffer(stage = 1, economy = null, forcedType = null, rng = Math.random) {
    const s = clampInt(stage, 1, MAX_STAGE_FOR_SCALING, 1);
    const offerType = typeof forcedType === 'string' && MERCHANT_OFFER_TYPES[forcedType]
      ? forcedType
      : (safeRand01(rng) < 0.5 ? 'gear_chest' : 'dps_elixir');
    const def = MERCHANT_OFFER_TYPES[offerType] || MERCHANT_OFFER_TYPES.gear_chest;

    const monsterGoldRaw = typeof economy?.computeMonsterGoldReward === 'function'
      ? Number(economy.computeMonsterGoldReward(s))
      : NaN;
    const fallbackMonsterGold = 20 * Math.pow(1.18, Math.min(180, s - 1));
    const baseMonsterGold = Number.isFinite(monsterGoldRaw) && monsterGoldRaw > 0
      ? monsterGoldRaw
      : fallbackMonsterGold;
    const rawCost = Math.round(baseMonsterGold * 4.5);
    const costGold = Number.isFinite(rawCost)
      ? Math.max(45, Math.min(MAX_REWARD_GOLD, rawCost))
      : MAX_REWARD_GOLD;

    this.activeMerchantOffer = {
      uid: this._nextUid('merchant', offerType),
      offerType,
      title: def.title,
      subtitle: def.subtitle,
      accentHex: def.accentHex,
      costGold,
      formattedCost: formatEndlessNumber(costGold),
      stage: s,
      remainingSec: MERCHANT_OFFER_DURATION_SEC,
      durationSec: MERCHANT_OFFER_DURATION_SEC,
      purchased: false
    };

    return this.activeMerchantOffer;
  }

  purchaseMerchantOffer(economy, gear = null, stage = 1, rng = Math.random) {
    const offer = this.activeMerchantOffer;
    if (!offer || offer.purchased || offer.remainingSec <= 0) {
      return {
        ok: false,
        offerType: null,
        costGold: 0,
        item: null,
        collectRes: null,
        buff: null
      };
    }

    const costGold = Math.max(0, Math.floor(Number(offer.costGold) || 0));
    const availableGold = Number(economy?.gold);
    if (!economy || !Number.isFinite(availableGold) || availableGold < costGold) {
      return {
        ok: false,
        offerType: offer.offerType,
        costGold,
        item: null,
        collectRes: null,
        buff: null
      };
    }

    if (typeof economy.spendGold === 'function') {
      if (!economy.spendGold(costGold)) {
        return {
          ok: false,
          offerType: offer.offerType,
          costGold,
          item: null,
          collectRes: null,
          buff: null
        };
      }
    } else {
      economy.gold = Math.max(0, availableGold - costGold);
    }

    offer.purchased = true;
    this.activeMerchantOffer = null;
    this.totalMerchantPurchases = clampInt(
      this.totalMerchantPurchases + 1,
      0,
      MAX_COUNTER,
      this.totalMerchantPurchases + 1
    );

    const s = clampInt(
      stage !== undefined && stage !== null ? stage : offer.stage,
      1,
      MAX_STAGE_FOR_SCALING,
      offer.stage || 1
    );

    if (offer.offerType === 'gear_chest') {
      const roll = safeRand01(rng);
      const forcedRarity = roll < 0.16 ? 'mythic' : roll < 0.5 ? 'sovereign' : 'heroic';
      const item = typeof gear?.rollDrop === 'function'
        ? gear.rollDrop({ stage: s, source: 'chest', forcedRarity, rng })
        : null;
      const collectRes = item && typeof gear?.collectDrop === 'function'
        ? gear.collectDrop(item, { autoEquipEmpty: true })
        : null;
      return {
        ok: true,
        offerType: 'gear_chest',
        costGold,
        item,
        collectRes
      };
    }

    const buff = {
      id: DPS_ELIXIR_BUFF_DEF.id,
      source: DPS_ELIXIR_BUFF_DEF.source,
      name: DPS_ELIXIR_BUFF_DEF.name,
      shortLabel: DPS_ELIXIR_BUFF_DEF.shortLabel,
      accentHex: DPS_ELIXIR_BUFF_DEF.accentHex,
      remainingSec: DPS_ELIXIR_BUFF_DEF.durationSec,
      durationSec: DPS_ELIXIR_BUFF_DEF.durationSec,
      modifiers: { ...DPS_ELIXIR_BUFF_DEF.modifiers }
    };
    this._upsertBuff(buff);

    return {
      ok: true,
      offerType: 'dps_elixir',
      costGold,
      buff
    };
  }

  dismissMerchantOffer() {
    const hadOffer = Boolean(this.activeMerchantOffer);
    this.activeMerchantOffer = null;
    return hadOffer;
  }

  update(dt) {
    const delta = Number.isFinite(dt) && dt > 0 ? dt : 0;
    let buffsChanged = false;
    let offerExpired = false;

    if (delta > 0 && this.activeBuffs.length > 0) {
      const nextBuffs = [];
      for (let i = 0; i < this.activeBuffs.length; i++) {
        const buff = this.activeBuffs[i];
        if (!buff) {
          buffsChanged = true;
          continue;
        }
        buff.remainingSec = Math.max(0, (Number(buff.remainingSec) || 0) - delta);
        if (buff.remainingSec > 0) {
          nextBuffs.push(buff);
        } else {
          buffsChanged = true;
        }
      }
      this.activeBuffs = nextBuffs;
    }

    if (delta > 0 && this.activeMerchantOffer) {
      this.activeMerchantOffer.remainingSec = Math.max(
        0,
        (Number(this.activeMerchantOffer.remainingSec) || 0) - delta
      );
      if (this.activeMerchantOffer.remainingSec <= 0) {
        this.activeMerchantOffer = null;
        offerExpired = true;
      }
    }

    let tempestActive = false;
    for (let i = 0; i < this.activeBuffs.length; i++) {
      const buff = this.activeBuffs[i];
      if (!buff || buff.remainingSec <= 0) continue;
      const interval = Number(buff.modifiers?.autoLightningIntervalSec);
      if (Number.isFinite(interval) && interval > 0) {
        tempestActive = true;
        break;
      }
    }

    return {
      buffsChanged,
      offerExpired,
      tempestActive
    };
  }

  getEventModifiers() {
    let heroDmgMult = 1.0;
    let tapDmgMult = 1.0;
    let companionDmgMult = 1.0;
    let goldMult = 1.0;
    let critBonus = 0;
    let critDmgMult = 1.0;
    let hasteMult = 1.0;
    let maxHpMult = 1.0;
    let damagePassThrough = 1.0;
    let autoLightningIntervalSec = 0;

    for (let i = 0; i < this.activeBuffs.length; i++) {
      const buff = this.activeBuffs[i];
      if (!buff || !(Number(buff.remainingSec) > 0) || !buff.modifiers) continue;
      const m = buff.modifiers;

      if (Number.isFinite(m.heroDmgMult) && m.heroDmgMult > 0) {
        heroDmgMult *= m.heroDmgMult;
      }
      if (Number.isFinite(m.tapDmgMult) && m.tapDmgMult > 0) {
        tapDmgMult *= m.tapDmgMult;
      }
      if (Number.isFinite(m.companionDmgMult) && m.companionDmgMult > 0) {
        companionDmgMult *= m.companionDmgMult;
      }
      if (Number.isFinite(m.goldMult) && m.goldMult > 0) {
        goldMult *= m.goldMult;
      }
      if (Number.isFinite(m.critBonus) && m.critBonus > 0) {
        critBonus += m.critBonus;
      }
      if (Number.isFinite(m.critDmgMult) && m.critDmgMult > 0) {
        critDmgMult *= m.critDmgMult;
      }
      if (Number.isFinite(m.hasteMult) && m.hasteMult > 0) {
        hasteMult *= m.hasteMult;
      }
      if (Number.isFinite(m.maxHpMult) && m.maxHpMult > 0) {
        maxHpMult *= m.maxHpMult;
      }
      if (Number.isFinite(m.damageReduction) && m.damageReduction > 0) {
        const dr = Math.min(0.75, m.damageReduction);
        damagePassThrough *= (1 - dr);
      }
      if (Number.isFinite(m.autoLightningIntervalSec) && m.autoLightningIntervalSec > 0) {
        const clampedInterval = Math.max(0.25, m.autoLightningIntervalSec);
        if (autoLightningIntervalSec <= 0 || clampedInterval < autoLightningIntervalSec) {
          autoLightningIntervalSec = clampedInterval;
        }
      }
    }

    const damageReduction = clampFloat(1 - damagePassThrough, 0, 0.75, 0);

    return {
      heroDmgMult: roundTo(clampFloat(heroDmgMult, 1.0, 20.0, 1.0), 4),
      tapDmgMult: roundTo(clampFloat(tapDmgMult, 1.0, 20.0, 1.0), 4),
      companionDmgMult: roundTo(clampFloat(companionDmgMult, 1.0, 20.0, 1.0), 4),
      goldMult: roundTo(clampFloat(goldMult, 1.0, 20.0, 1.0), 4),
      critBonus: roundTo(clampFloat(critBonus, 0, 0.65, 0), 4),
      critDmgMult: roundTo(clampFloat(critDmgMult, 1.0, 6.0, 1.0), 4),
      hasteMult: roundTo(clampFloat(hasteMult, 1.0, 4.0, 1.0), 4),
      maxHpMult: roundTo(clampFloat(maxHpMult, 1.0, 4.0, 1.0), 4),
      damageReduction: roundTo(damageReduction, 4),
      autoLightningIntervalSec: autoLightningIntervalSec > 0 ? roundTo(autoLightningIntervalSec, 4) : 0
    };
  }

  getEventsSnapshot(economy = null) {
    const b = this.ensureActiveBounty(economy?.stage || 1, economy);
    const target = Math.max(1, Math.floor(Number(b.target) || 1));
    const progress = clampInt(b.progress, 0, target, 0);
    const ratio = roundTo(clampFloat(progress / target, 0, 1, 0), 4);
    const rewardGold = Math.max(0, Math.floor(Number(b.rewards?.gold) || 0));

    const bountySnap = {
      uid: b.uid,
      templateId: b.templateId,
      title: b.title,
      shortLabel: b.shortLabel,
      accentHex: b.accentHex,
      metric: b.metric,
      progress,
      target,
      ratio,
      completed: Boolean(b.completed),
      rewards: {
        gold: rewardGold,
        formattedGold: formatEndlessNumber(rewardGold),
        astralShards: Math.max(0, Math.floor(Number(b.rewards?.astralShards) || 0)),
        forgeDust: Math.max(0, Math.floor(Number(b.rewards?.forgeDust) || 0))
      }
    };

    const activeBuffsSnap = [];
    for (let i = 0; i < this.activeBuffs.length; i++) {
      const buff = this.activeBuffs[i];
      if (!buff || !(Number(buff.remainingSec) > 0)) continue;
      const durationSec = Math.max(0.1, Number(buff.durationSec) || 1);
      const remainingSec = clampFloat(buff.remainingSec, 0, durationSec, 0);
      activeBuffsSnap.push({
        id: buff.id,
        source: buff.source,
        name: buff.name,
        shortLabel: buff.shortLabel,
        accentHex: buff.accentHex,
        remainingSec: roundTo(remainingSec, 2),
        durationSec: roundTo(durationSec, 2),
        ratio: roundTo(clampFloat(remainingSec / durationSec, 0, 1, 0), 4)
      });
    }

    let merchantOfferSnap = null;
    const offer = this.activeMerchantOffer;
    if (offer && !offer.purchased && Number(offer.remainingSec) > 0) {
      const durationSec = Math.max(0.1, Number(offer.durationSec) || MERCHANT_OFFER_DURATION_SEC);
      const remainingSec = clampFloat(offer.remainingSec, 0, durationSec, 0);
      const currentGold = Number(economy?.gold);
      const canAfford = Number.isFinite(currentGold) && currentGold >= offer.costGold;
      merchantOfferSnap = {
        uid: offer.uid,
        offerType: offer.offerType,
        title: offer.title,
        subtitle: offer.subtitle,
        accentHex: offer.accentHex,
        costGold: offer.costGold,
        formattedCost: formatEndlessNumber(offer.costGold),
        canAfford,
        stage: offer.stage,
        remainingSec: roundTo(remainingSec, 2),
        durationSec: roundTo(durationSec, 2),
        ratio: roundTo(clampFloat(remainingSec / durationSec, 0, 1, 0), 4)
      };
    }

    return {
      bounty: bountySnap,
      completedBounties: this.completedBounties,
      activeBuffs: activeBuffsSnap,
      merchantOffer: merchantOfferSnap,
      totalShrinesActivated: this.totalShrinesActivated,
      totalMerchantPurchases: this.totalMerchantPurchases
    };
  }

  exportSnapshot() {
    const b = this.activeBounty;
    const serializedBounty = b && typeof b === 'object'
      ? {
          uid: b.uid,
          templateId: b.templateId,
          stage: clampInt(b.stage, 1, MAX_STAGE_FOR_SCALING, 1),
          progress: clampInt(b.progress, 0, Math.max(1, b.target || 1), 0),
          target: clampInt(b.target, 1, 1000, 1),
          completed: Boolean(b.completed),
          claimed: Boolean(b.claimed),
          rewards: {
            gold: clampInt(b.rewards?.gold, 0, MAX_REWARD_GOLD, 90),
            astralShards: clampInt(b.rewards?.astralShards, 1, 4, 1),
            forgeDust: clampInt(b.rewards?.forgeDust, 10, 45, 10)
          }
        }
      : null;

    const serializedBuffs = [];
    for (let i = 0; i < this.activeBuffs.length && serializedBuffs.length < MAX_ACTIVE_BUFFS; i++) {
      const buff = this.activeBuffs[i];
      if (!buff || !(Number(buff.remainingSec) > 0)) continue;
      serializedBuffs.push({
        id: buff.id,
        source: buff.source,
        remainingSec: roundTo(Math.max(0, Number(buff.remainingSec) || 0), 2),
        durationSec: roundTo(Math.max(0.1, Number(buff.durationSec) || 20), 2)
      });
    }

    return {
      version: 1,
      completedBounties: clampInt(this.completedBounties, 0, MAX_COUNTER, 0),
      bountyCycleIndex: clampInt(this.bountyCycleIndex, 0, ENDLESS_BOUNTY_TEMPLATES.length - 1, 0),
      totalShrinesActivated: clampInt(this.totalShrinesActivated, 0, MAX_COUNTER, 0),
      totalMerchantPurchases: clampInt(this.totalMerchantPurchases, 0, MAX_COUNTER, 0),
      uidSeq: clampInt(this._uidSeq, 0, MAX_COUNTER, 0),
      activeBounty: serializedBounty,
      activeBuffs: serializedBuffs
    };
  }

  importSnapshot(data) {
    if (!data || typeof data !== 'object') return false;

    const len = ENDLESS_BOUNTY_TEMPLATES.length;
    this.completedBounties = clampInt(data.completedBounties, 0, MAX_COUNTER, 0);
    const rawIdx = clampInt(data.bountyCycleIndex, 0, MAX_COUNTER, 0);
    this.bountyCycleIndex = ((rawIdx % len) + len) % len;
    this.totalShrinesActivated = clampInt(data.totalShrinesActivated, 0, MAX_COUNTER, 0);
    this.totalMerchantPurchases = clampInt(data.totalMerchantPurchases, 0, MAX_COUNTER, 0);
    this._uidSeq = clampInt(data.uidSeq, 0, MAX_COUNTER, 0);
    this.activeMerchantOffer = null;

    let restoredBounty = null;
    const rawBounty = data.activeBounty;
    if (rawBounty && typeof rawBounty === 'object' && !rawBounty.claimed) {
      const tpl = typeof rawBounty.templateId === 'string'
        ? BOUNTY_TEMPLATE_BY_ID[rawBounty.templateId]
        : null;
      if (tpl) {
        const stage = clampInt(rawBounty.stage, 1, MAX_STAGE_FOR_SCALING, 1);
        const fallbackTarget = this._computeBountyTarget(tpl);
        const target = clampInt(rawBounty.target, 1, 1000, fallbackTarget);
        const progress = clampInt(rawBounty.progress, 0, target, 0);
        const completed = Boolean(rawBounty.completed) || progress >= target;
        const fallbackRewards = this._computeBountyRewards(stage, null);
        const rawRewards = rawBounty.rewards && typeof rawBounty.rewards === 'object'
          ? rawBounty.rewards
          : {};
        const uid = typeof rawBounty.uid === 'string' && rawBounty.uid.trim()
          ? rawBounty.uid.trim()
          : this._nextUid('bounty', tpl.id);
        const seqNum = extractUidNumber(uid);
        if (seqNum > this._uidSeq) {
          this._uidSeq = seqNum;
        }
        restoredBounty = {
          uid,
          templateId: tpl.id,
          title: tpl.title,
          shortLabel: tpl.shortLabel,
          accentHex: tpl.accentHex,
          metric: tpl.metric,
          progress: completed ? target : progress,
          target,
          completed,
          claimed: false,
          stage,
          rewards: {
            gold: clampInt(rawRewards.gold, 50, MAX_REWARD_GOLD, fallbackRewards.gold),
            astralShards: clampInt(rawRewards.astralShards, 1, 4, fallbackRewards.astralShards),
            forgeDust: clampInt(rawRewards.forgeDust, 10, 45, fallbackRewards.forgeDust)
          }
        };
      }
    }

    this.activeBounty = restoredBounty;
    if (!this.activeBounty) {
      this.ensureActiveBounty(1);
    }

    const restoredBuffs = [];
    const seenBuffIds = new Set();
    if (Array.isArray(data.activeBuffs)) {
      for (let i = 0; i < data.activeBuffs.length && restoredBuffs.length < MAX_ACTIVE_BUFFS; i++) {
        const rawBuff = data.activeBuffs[i];
        if (!rawBuff || typeof rawBuff !== 'object' || typeof rawBuff.id !== 'string') continue;
        if (seenBuffIds.has(rawBuff.id)) continue;

        let def = null;
        let source = 'shrine';
        if (ENDLESS_SHRINE_BY_ID[rawBuff.id]) {
          def = ENDLESS_SHRINE_BY_ID[rawBuff.id];
          source = 'shrine';
        } else if (rawBuff.id === DPS_ELIXIR_BUFF_DEF.id) {
          def = DPS_ELIXIR_BUFF_DEF;
          source = 'elixir';
        }
        if (!def) continue;

        const durationSec = def.durationSec;
        const remainingSec = clampFloat(rawBuff.remainingSec, 0, durationSec, 0);
        if (remainingSec <= 0) continue;

        seenBuffIds.add(def.id);
        restoredBuffs.push({
          id: def.id,
          source,
          name: def.name,
          shortLabel: def.shortLabel,
          accentHex: def.accentHex,
          remainingSec: roundTo(remainingSec, 2),
          durationSec,
          modifiers: { ...def.modifiers }
        });
      }
    }
    this.activeBuffs = restoredBuffs;

    return true;
  }
}
