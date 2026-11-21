import { Fighter } from '../entities/Fighter.js?v=30fps201';
import { Monster, ArchfiendBoss } from '../entities/Monster.js?v=30fps201';
import { PixelForge } from '../engine/PixelForge.js?v=30fps201';
import { PixelFont } from '../engine/PixelFont.js?v=30fps201';
import { AdventureSkillSets, ADVENTURE_HERO_KITS } from '../adventure/AdventureSkillSets.js?v=30fps201';
import { EndlessEconomy, formatEndlessNumber } from './EndlessEconomy.js?v=30fps201';
import { EndlessCompanions } from './EndlessCompanions.js?v=30fps201';
import { EndlessShopUI } from './EndlessShopUI.js?v=30fps201';
import { EndlessAscension } from './EndlessAscension.js?v=30fps201';
import { EndlessBossDirector } from './EndlessBossDirector.js?v=30fps201';
import { EndlessGear, GEAR_RARITY_BY_ID, GEAR_SLOT_META } from './EndlessGear.js?v=30fps201';
import { EndlessEvents, ENDLESS_SHRINE_TYPES, ENDLESS_SHRINE_BY_ID } from './EndlessEvents.js?v=30fps201';
import { EndlessCompanionEvo } from './EndlessCompanionEvo.js?v=30fps201';
import { EndlessTrials, ENDLESS_TRIAL_DEFS, ENDLESS_TRIAL_BY_ID } from './EndlessTrials.js?v=30fps201';

export const ENDLESS_REALMS = [
  {
    id: 'eclipse',
    stageId: 'cathedral',
    name: 'ECLIPSE SANCTUM',
    accentHex: '#38bdf8',
    monsters: ['templar', 'astrologer'],
    warden: 'templar',
    wardenName: 'ECLIPSE GRAND WARDEN'
  },
  {
    id: 'starwood',
    stageId: 'sylvan',
    name: 'CURSED STARWOOD',
    accentHex: '#34d399',
    monsters: ['treant', 'dryad'],
    warden: 'treant',
    wardenName: 'ELDER STARWOOD TITAN'
  },
  {
    id: 'necropolis',
    stageId: 'boneyard',
    name: 'OSSUARY NECROPOLIS',
    accentHex: '#c084fc',
    monsters: ['ghoul', 'cultist'],
    warden: 'ghoul',
    wardenName: 'DREAD OSSUARY REAPER'
  },
  {
    id: 'blackpit',
    stageId: 'cathedral',
    name: 'THE BLACK PIT',
    accentHex: '#fb923c',
    monsters: ['brute', 'fiend'],
    warden: 'brute',
    wardenName: 'INFERNAL PIT OVERLORD'
  }
];

const ENDLESS_DEPTH_MIN_Y = 442;
const ENDLESS_DEPTH_MAX_Y = 680;
const ENDLESS_DEPTH_MID_Y = 561;
const ENDLESS_BASE_HERO_HP = 1400;
const ENDLESS_CORRIDOR_STEP_X = 400;
const ENDLESS_CORRIDOR_WIDTH = 1420;
const ENDLESS_VFX_CELL = 128;

const COIN_STREAK_DECAY_SEC = 0.85;
const COIN_CHIME_THROTTLE_MS = 45;
const COIN_PENTATONIC_HZ = Object.freeze([
  1046.5,
  1174.66,
  1318.51,
  1567.98,
  1760.0,
  2093.0,
  2349.32,
  2637.02,
  3135.96,
  3520.0
]);

const FEVER_CHAIN_MAX_RANGE = 360;
const FEVER_CHAIN_MAX_TARGETS = 2;
const FEVER_CHAIN_SPLASH_RATIO = 0.45;
const FEVER_CHAIN_MAX_COUNT = 16;
const FEVER_CHAIN_LIFE = 0.28;

const COINS_MAX_COUNT = 64;
const TAP_SMITE_MAX_COUNT = 24;
const FEVER_BURST_MAX_COUNT = 8;
const WAVE4_BURST_MAX_COUNT = 10;
const PORTAL_MAX_COUNT = 18;
const MONSTER_PLUME_MAX_COUNT = 24;
const FLOATING_CALLOUT_MAX_COUNT = 32;

const ENDLESS_MAX_STAT = 1e15;
const ENDLESS_MAX_DMG_SCALE = 1e11;
const ENDLESS_MAX_MULT = 1e9;

function safeBoundedInt(val, minVal = 1, maxVal = ENDLESS_MAX_STAT, fallback = minVal) {
  const n = Number(val);
  if (n === Infinity) return maxVal;
  if (!Number.isFinite(n)) return fallback;
  const r = Math.round(n);
  if (r < minVal) return minVal;
  if (r > maxVal) return maxVal;
  return r;
}

function safeBoundedFloat(val, minVal = 0, maxVal = ENDLESS_MAX_STAT, fallback = minVal) {
  const n = Number(val);
  if (n === Infinity) return maxVal;
  if (!Number.isFinite(n)) return fallback;
  if (n < minVal) return minVal;
  if (n > maxVal) return maxVal;
  return n;
}

const ENDLESS_DRAWER_TAB_KEYS = Object.freeze([
  'items',
  'gear',
  'companions',
  'ascend',
  'trials',
  'stats'
]);

const COMBINED_EXT_KEYS = Object.freeze([
  'globalDpsMult',
  'goldMult',
  'tapMult',
  'companionMult',
  'critChanceBonus',
  'critDmgMult',
  'startingGold',
  'bossTimerBonusSec',
  'relicDiscountMult',
  'feverDurationBonusSec',
  'hasteMult',
  'bossDmgMult'
]);

const GOBLIN_MAX_ACTIVE = 2;
const GOBLIN_SPAWN_MIN_SEC = 34;
const GOBLIN_SPAWN_MAX_SEC = 46;
const GOBLIN_ESCAPE_SEC = 11.5;
const GOBLIN_TAP_RADIUS = 96;
const GOBLIN_WAVE_PROC_CHANCE = 0.22;

const CHEST_MAX_ACTIVE = 3;
const CHEST_TAPS_REQUIRED = 3;
const CHEST_AUTO_CRACK_SEC = 7.5;
const CHEST_TAP_RADIUS = 98;

const LOOT_BEAM_MAX_ACTIVE = 12;
const GEAR_NOVA_FX_MAX_COUNT = 12;
const LOOT_BEAM_VACUUM_RADIUS = 108;
const LOOT_BEAM_AUTO_COLLECT_SEC = 12.0;
const LOOT_BEAM_MAX_AGE = 28;
const LOOT_BEAM_TAP_HALF_X = 92;
const LOOT_BEAM_TAP_HEIGHT_Y = 140;
const BLOOD_REAVER_NOVA_RADIUS = 220;

const WORLD_SHRINE_MAX_ACTIVE = 2;
const WANDERING_MERCHANT_MAX_ACTIVE = 1;
const WORLD_SHRINE_SPAWN_MIN_SEC = 24;
const WORLD_SHRINE_SPAWN_MAX_SEC = 38;
const WANDERING_MERCHANT_SPAWN_MIN_SEC = 48;
const WANDERING_MERCHANT_SPAWN_MAX_SEC = 70;
const WORLD_SHRINE_MAX_AGE = 34;
const WANDERING_MERCHANT_MAX_AGE = 32;
const WORLD_EVENT_PROXIMITY_RADIUS = 96;
const WORLD_EVENT_TAP_RADIUS = 88;

const TRIAL_GOLD_VAULT_REFILL_SEC = 2.4;
const TRIAL_ABYSSAL_HORDE_REFILL_SEC = 2.0;
const TRIAL_ABYSSAL_HORDE_MIN_LIVING = 7;
const TRIAL_ABYSSAL_HORDE_TARGET_LIVING = 8;
const TRIAL_MALPHAS_MAX_HP = 1e11;

const ENDLESS_MONSTER_BASE_HP = {
  templar: 320,
  astrologer: 260,
  treant: 440,
  dryad: 270,
  ghoul: 310,
  cultist: 265,
  brute: 460,
  fiend: 340
};

const RANGED_EX_LV1_PROJECTILES = {
  mage_ex: { type: 'fireball', color: '#fb923c', coreColor: '#fef08a', radius: 14, pierce: false, speed: 715 },
  priestess_ex: { type: 'holy_light', color: '#fde047', coreColor: '#ffffff', radius: 14, pierce: true, speed: 725 },
  icemage_ex: { type: 'cryo_shard', color: '#67e8f9', coreColor: '#ffffff', radius: 14, pierce: true, speed: 720 },
  valkyrie_ex: { type: 'dragon_lance', color: '#f43f5e', coreColor: '#fde047', radius: 15, pierce: true, speed: 760 },
  archer_ex: { type: 'arrow', color: '#34d399', coreColor: '#ffffff', radius: 13, pierce: true, speed: 790 }
};

function isImgReady(img) {
  if (!img) return false;
  if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
    return Boolean(img.complete && img.naturalWidth > 0);
  }
  return Boolean(img.width > 0 || img.naturalWidth > 0);
}

/**
 * Lightweight Endless Progression Adapter compatible with `Monster.takeDamage`,
 * `ArchfiendBoss`, `AdventureSkillSets`, and `main.js` HUD readouts.
 */
class EndlessProgressionAdapter {
  constructor(endless) {
    this.endless = endless;
    this.spirit = 100;
    this.maxSpirit = 100;
    this.ultCharge = 0;
    this.astralCharge = 0;
    this.skillPoints = 0;
    this.comboHits = 0;
    this.comboTimer = 0;
    this._lifestealFrac = 0;
    this._skillCdShaveThrottle = 0;
    this._seekerShotCounter = 0;
  }

  get level() {
    return Math.max(1, Math.floor(this.endless?.stage || 1));
  }

  get damageReduction() {
    const buffs = this.endless?.companions?.getPartyBuffs?.();
    const shieldDr = Number.isFinite(buffs?.damageReduction) ? buffs.damageReduction : 0;
    const baseDr = Math.min(0.45, 0.06 + shieldDr);
    const eventMods = this.endless?.events?.getEventModifiers?.() || null;
    const evDr =
      Number.isFinite(eventMods?.damageReduction) && eventMods.damageReduction > 0
        ? Math.min(0.75, eventMods.damageReduction)
        : 0;
    if (evDr <= 0) return baseDr;
    return Math.min(0.80, 1 - (1 - baseDr) * (1 - evDr));
  }

  resetForRun() {
    this.spirit = 100;
    this.ultCharge = 0;
    this.astralCharge = 0;
    this.comboHits = 0;
    this.comboTimer = 0;
    this._lifestealFrac = 0;
    this._skillCdShaveThrottle = 0;
    this._seekerShotCounter = 0;
  }

  getComputedStats() {
    const ecoStats = this.endless?.economy?.getComputedStats?.() || {};
    const partyBuffs = this.endless?.companions?.getPartyBuffs?.() || {};
    const synMods =
      this.endless?._activeSynergyMods ||
      this.endless?.companions?.getPartySynergyModifiers?.() ||
      null;
    const gearMods = this.endless?.gear?.getGearModifiers?.() || null;
    const eventMods = this.endless?.events?.getEventModifiers?.() || null;
    const evoMods = this.endless?.companionEvo?.getFormationModifiers?.() || null;
    const synHaste =
      Number.isFinite(synMods?.hasteMult) && synMods.hasteMult > 0 ? synMods.hasteMult : 1;
    const synMaxHp =
      Number.isFinite(synMods?.maxHpMult) && synMods.maxHpMult > 0 ? synMods.maxHpMult : 1;
    const gearMaxHp =
      Number.isFinite(gearMods?.maxHpMult) && gearMods.maxHpMult > 0 ? gearMods.maxHpMult : 1;
    const evMaxHp =
      Number.isFinite(eventMods?.maxHpMult) && eventMods.maxHpMult > 0 ? eventMods.maxHpMult : 1;
    const evoMaxHp =
      Number.isFinite(evoMods?.maxHpMult) && evoMods.maxHpMult > 0 ? evoMods.maxHpMult : 1;
    const evoHpRegen =
      Number.isFinite(evoMods?.hpRegenBonus) && evoMods.hpRegenBonus > 0 ? evoMods.hpRegenBonus : 0;
    const synHpRegen =
      Number.isFinite(synMods?.hpRegenBonus) && synMods.hpRegenBonus > 0
        ? Math.min(0.25, synMods.hpRegenBonus)
        : 0;
    const hasteMult = safeBoundedFloat(
      (Number.isFinite(ecoStats.hasteMult) && ecoStats.hasteMult > 0 ? ecoStats.hasteMult : 1) *
        (1 + (Number.isFinite(partyBuffs.hasteBonus) ? partyBuffs.hasteBonus : 0)) *
        synHaste,
      0.25,
      25,
      1
    );
    const cdDiv = Math.max(0.45, 1 / Math.max(0.5, hasteMult));
    const rawEcoMaxHp = Number.isFinite(ecoStats.maxHpMult) && ecoStats.maxHpMult > 0 ? ecoStats.maxHpMult : 1;
    const maxHpMult = safeBoundedFloat(rawEcoMaxHp * synMaxHp * gearMaxHp * evMaxHp * evoMaxHp, 1, ENDLESS_MAX_MULT, 1);
    const maxHp = safeBoundedInt(
      ENDLESS_BASE_HERO_HP * maxHpMult,
      ENDLESS_BASE_HERO_HP,
      ENDLESS_MAX_STAT
    );
    const baseRegenPct =
      Number.isFinite(ecoStats.hpRegenPct) && ecoStats.hpRegenPct > 0 ? ecoStats.hpRegenPct : 0;
    const hpRegenPct = safeBoundedFloat(baseRegenPct + evoHpRegen + synHpRegen, 0, 0.5, 0);
    return {
      ...ecoStats,
      maxHp,
      maxHpMult,
      hpRegenPct,
      hasteMult,
      moveSpeedMult: safeBoundedFloat(ecoStats.moveSpeedMult, 0.5, 4.0, 1),
      skillSpiritCost: 28,
      skillCdMult: Math.max(0.38, cdDiv),
      mobilityCdMult: Math.max(0.42, cdDiv),
      ultResonanceAstral: 24,
      wardReduction: this.damageReduction,
      basicDmgMult: 1
    };
  }

  attachToFighter(player) {
    if (!player) return;
    if (!player._endlessOrig) {
      player._endlessOrig = {
        maxHp: player.maxHp,
        hp: player.hp,
        gainMana: typeof player.gainMana === 'function' ? player.gainMana.bind(player) : null,
        gainFinisher: typeof player.gainFinisher === 'function' ? player.gainFinisher.bind(player) : null,
        takeDamage: typeof player.takeDamage === 'function' ? player.takeDamage.bind(player) : null,
        heal: typeof player.heal === 'function' ? player.heal.bind(player) : null
      };
    }

    const stats = this.getComputedStats();
    player.maxHp = stats.maxHp;
    player.hp = stats.maxHp;
    player.isDead = false;
    player.mana = this.ultCharge;
    player.finisherGauge = this.astralCharge;

    player.gainMana = (amt) => {
      if (!Number.isFinite(amt) || amt <= 0) return;
      const gMult = this.endless?.economy?.getComputedStats?.()?.gaugeGainMult || 1;
      this.ultCharge = Math.min(100, this.ultCharge + amt * 0.45 * gMult);
      this.syncGaugesToPlayer(player);
    };

    player.gainFinisher = (amt) => {
      if (!Number.isFinite(amt) || amt <= 0) return;
      const gMult = this.endless?.economy?.getComputedStats?.()?.gaugeGainMult || 1;
      this.astralCharge = Math.min(100, this.astralCharge + amt * 0.45 * gMult);
      this.syncGaugesToPlayer(player);
    };

    player.heal = (amount, label = '') => {
      if (player.isDead || !Number.isFinite(amount) || amount <= 0) return 0;
      const safeHeal = safeBoundedInt(amount, 1, ENDLESS_MAX_STAT);
      const origHeal = player._endlessOrig?.heal;
      if (origHeal) {
        return origHeal(safeHeal, label);
      }
      const prev = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + safeHeal);
      return Math.max(0, player.hp - prev);
    };

    player.takeDamage = (amount, attacker, isCrit = false, knockX = 95, knockY = 0) => {
      if (player.isDead || player.isBenched) return;
      if ((this.endless?._phoenixInvulnTimer || 0) > 0 || player.isInvulnerable) return;
      const dr = this.damageReduction;
      const safeRaw = safeBoundedFloat(amount, 1, ENDLESS_MAX_STAT, 1);
      const mitigated = safeBoundedInt(safeRaw * (1 - dr), 1, ENDLESS_MAX_STAT);
      if (player._endlessOrig?.takeDamage) {
        player._endlessOrig.takeDamage(mitigated, attacker, isCrit, knockX, knockY);
      } else {
        player.hp = Math.max(0, player.hp - mitigated);
      }
      if (player.hp <= 0 || player.isDead) {
        this.endless?.handlePlayerZeroHp?.(player);
      }
      this.syncGaugesToPlayer(player);
    };

    this.syncGaugesToPlayer(player);
  }

  detachFromFighter(player) {
    if (!player || !player._endlessOrig) return;
    player.maxHp = player._endlessOrig.maxHp;
    player.hp = Math.min(player.maxHp, Math.max(1, player.hp || player.maxHp));
    if (player._endlessOrig.gainMana) player.gainMana = player._endlessOrig.gainMana;
    if (player._endlessOrig.gainFinisher) player.gainFinisher = player._endlessOrig.gainFinisher;
    if (player._endlessOrig.takeDamage) player.takeDamage = player._endlessOrig.takeDamage;
    if (player._endlessOrig.heal) player.heal = player._endlessOrig.heal;
    delete player._endlessOrig;
  }

  syncMaxHpWithEconomy(player) {
    if (!player) return;
    const stats = this.getComputedStats();
    const targetMax = stats.maxHp;
    if (player.maxHp !== targetMax) {
      const delta = Math.max(0, targetMax - (player.maxHp || targetMax));
      player.maxHp = targetMax;
      if (!player.isDead) {
        player.hp = Math.min(player.maxHp, (player.hp || 0) + delta);
      }
    }
  }

  syncGaugesToPlayer(player) {
    if (!player) return;
    player.mana = Math.max(0, Math.min(player.maxMana || 100, this.ultCharge));
    player.finisherGauge = Math.max(0, Math.min(player.maxFinisherGauge || 100, this.astralCharge));
  }

  gainSpirit(amount) {
    if (!Number.isFinite(amount) || amount === 0) return;
    this.spirit = Math.max(0, Math.min(this.maxSpirit, this.spirit + amount));
  }

  trySpendSkillSpirit() {
    const cost = this.getComputedStats().skillSpiritCost;
    if (this.spirit + 0.01 < cost) return false;
    this.spirit = Math.max(0, this.spirit - cost);
    return true;
  }

  gainAdventureUlt(amount, player = null) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const gMult = this.endless?.economy?.getComputedStats?.()?.gaugeGainMult || 1;
    this.ultCharge = Math.max(0, Math.min(100, this.ultCharge + amount * gMult));
    if (player) this.syncGaugesToPlayer(player);
  }

  gainAstralRelic(amount, player = null) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const gMult = this.endless?.economy?.getComputedStats?.()?.gaugeGainMult || 1;
    this.astralCharge = Math.max(0, Math.min(100, this.astralCharge + amount * gMult));
    if (player) this.syncGaugesToPlayer(player);
  }

  resolveOutgoingCastTier(amount, attacker, castSource = null) {
    if (attacker && (attacker.isTapSmite || attacker.isGearNova || attacker.isEndlessCompanion)) {
      return 'auto';
    }
    const explicit = castSource || attacker?._advActiveCastSource || null;
    if (explicit === 'true_ult') return 'true_ult';
    if (explicit === 'ult') return 'ult';
    if (explicit === 'skill') return 'skill';
    if (explicit === 'auto') {
      return amount >= 420 ? 'true_ult' : 'auto';
    }

    const st = attacker?.state;
    const hitTier = attacker?._activeHitTier;
    if (st === 'TRUE_ULTIMATE' || hitTier === 'TRUE_ULTIMATE' || amount >= 420) {
      return 'true_ult';
    }
    if (st === 'ULTIMATE' || hitTier === 'ULTIMATE') {
      return 'ult';
    }
    if (st === 'SKILL' || hitTier === 'SKILL') {
      return 'skill';
    }
    if (st === 'AUTO_ATTACK') {
      return 'auto';
    }
    if (
      attacker?._advRecentCastSource &&
      (attacker._advRecentCastTimer || 0) > 0 &&
      (attacker._advRecentCastSource === 'true_ult' ||
        attacker._advRecentCastSource === 'ult' ||
        attacker._advRecentCastSource === 'skill')
    ) {
      return attacker._advRecentCastSource;
    }
    if (amount >= 22 && amount <= 44) {
      return 'skill';
    }
    return 'auto';
  }

  scaleOutgoingDamage(amount, attacker, monster, isCrit = false, castSource = null) {
    if (!attacker || attacker.isMonster) return amount;
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const safeAmount = safeBoundedFloat(amount, 1, ENDLESS_MAX_STAT, 1);

    // Tap-Smite hits are pre-scaled & crit-rolled inside EndlessEconomy.computeTapSmiteHit
    if (attacker.isTapSmite || attacker.isGearNova) {
      return safeBoundedInt(safeAmount, 1, ENDLESS_MAX_STAT);
    }

    // Companions already compute their own scaled power via EndlessCompanions + companionDmgMult
    // so never double-multiply by heroDmgMult or companionDmgMult here!
    if (attacker.isEndlessCompanion) {
      let compMult = 1.0;
      if ((monster?.staggerBreakTimer || 0) > 0) {
        compMult *= 1.55;
      } else if (monster?.isBoss && (monster.vulnerableTimer || 0) > 0) {
        compMult *= 1.45;
      }
      return safeBoundedInt(safeAmount * compMult, 1, ENDLESS_MAX_STAT);
    }

    const stats = this.endless?.economy?.getComputedStats?.() || {};
    const tier = this.resolveOutgoingCastTier(safeAmount, attacker, castSource);
    let tierMult = 1.0;
    if (tier === 'true_ult') tierMult = 2.15;
    else if (tier === 'ult') tierMult = 1.65;
    else if (tier === 'skill') tierMult = 1.32;

    const heroDmgMult = safeBoundedFloat(stats.heroDmgMult, 0.1, ENDLESS_MAX_MULT, 1.0);
    const feverDmgMult = safeBoundedFloat(stats.feverDmgMult, 1.0, 100, 1.0);
    let mult = heroDmgMult * feverDmgMult * tierMult;

    if (monster && (monster.isBoss || monster.isMiniBoss || monster.isEndlessStageBoss)) {
      mult *= safeBoundedFloat(stats.bossDmgMult, 1.0, ENDLESS_MAX_MULT, 1.0);
    }

    const critChance = safeBoundedFloat(stats.critChance, 0, 0.95, 0.08);
    const critMult = safeBoundedFloat(stats.critMult, 1.2, 1e4, 1.65);
    const rolledCrit = Boolean(isCrit) || Math.random() < critChance;
    if (rolledCrit) {
      mult *= critMult;
    }

    if ((monster?.staggerBreakTimer || 0) > 0) {
      mult *= 1.55;
    } else if (monster?.isBoss && (monster.vulnerableTimer || 0) > 0) {
      mult *= 1.45;
    }

    return safeBoundedInt(safeAmount * mult, 4, ENDLESS_MAX_STAT);
  }

  onPlayerHitMonster(attacker, monster, dealt) {
    if (!attacker || !Number.isFinite(dealt) || dealt <= 0) return;
    if (attacker.isTapSmite) return;

    const eco = this.endless?.economy;
    if (attacker.isGearNova) {
      eco?.recordDamageSample?.('hero', dealt);
      return;
    }
    if (attacker.isEndlessCompanion) {
      if (!attacker._companionDpsAlreadyRecorded) {
        eco?.recordDamageSample?.('companion', dealt);
      }
      return;
    }

    eco?.recordDamageSample?.('hero', dealt);

    const stats = eco?.getComputedStats?.() || {};
    const gaugeMult = stats.gaugeGainMult || 1.0;
    this.comboHits++;
    this.comboTimer = 3.2;

    // Lifesteal sustain from Soul Siphon Relic
    const lsPct = stats.lifestealPct || 0;
    const player = this.endless?.game?.leftFighter || attacker;
    if (lsPct > 0 && player && !player.isDead && player.hp < player.maxHp) {
      this._lifestealFrac += dealt * lsPct;
      if (this._lifestealFrac >= 1) {
        const healAmt = Math.min(
          Math.max(1, Math.round(player.maxHp * 0.08)),
          Math.floor(this._lifestealFrac)
        );
        this._lifestealFrac -= healAmt;
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
      }
    }

    // Boost Spirit, Overdrive (mana) & Supreme Ultimate (finisherGauge) by gaugeGainMult
    const tier = this.resolveOutgoingCastTier(dealt, attacker, attacker._advActiveCastSource || null);
    if (tier === 'skill') {
      this.ultCharge = Math.min(100, this.ultCharge + (monster?.isBoss ? 5.5 : 4.2) * gaugeMult);
      this.astralCharge = Math.min(100, this.astralCharge + 2.4 * gaugeMult);
    } else if (tier === 'auto') {
      this.gainSpirit(11 * gaugeMult);
      const comboBoost = this.comboHits >= 8 ? 1.35 : this.comboHits >= 4 ? 1.15 : 1.0;
      this.ultCharge = Math.min(100, this.ultCharge + 3.6 * comboBoost * gaugeMult);
      this.astralCharge = Math.min(100, this.astralCharge + 1.8 * gaugeMult);
      if (attacker.skillCooldown > 0 && this._skillCdShaveThrottle <= 0) {
        attacker.skillCooldown = Math.max(0, attacker.skillCooldown - 0.14 * (stats.hasteMult || 1));
        this._skillCdShaveThrottle = 0.30;
      }
    }
    this.syncGaugesToPlayer(attacker);
  }

  onPlayerCastBasicAttack(player, target, game, opts = {}) {
    if (!player || !game?.vfx) return;
    const dir = (player.facing || 1) >= 0 ? 1 : -1;
    const isFreeAim = Boolean(this.endless?.skillSets?.isManualFreeAim?.());

    const rangedExCfg = RANGED_EX_LV1_PROJECTILES[player.heroId];
    if (rangedExCfg && !opts.heroAlreadySpawnedProjectile) {
      const sx = player.x + dir * 48;
      const sy = (player.y || player.groundY) - 106;
      const speed = rangedExCfg.speed;
      let vx = dir * speed;
      let vy = 0;

      if (
        !isFreeAim &&
        target &&
        !target.isDead &&
        !target.isDummyFocal &&
        (target.x - player.x) * dir > 12
      ) {
        const dx = target.x - sx;
        const ty = target.isColossalBoss ? target.y - 135 : (target.y || target.groundY) - 96;
        const rawDy = ty - sy;
        const absDx = Math.max(90, Math.abs(dx));
        const clampedSlope = Math.max(-0.24, Math.min(0.24, rawDy / absDx));
        const mag = Math.hypot(1, clampedSlope) || 1;
        vx = (dir * speed) / mag;
        vy = (clampedSlope * speed) / mag;
      }

      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        groundY: player.groundY || player.y,
        vx,
        vy,
        radius: rangedExCfg.radius,
        color: rangedExCfg.color,
        coreColor: rangedExCfg.coreColor,
        owner: player,
        damage: Math.max(48, Math.round(player.attackDamage || 56)),
        type: rangedExCfg.type,
        pierce: rangedExCfg.pierce,
        maxRange: 680,
        isMeteor: false,
        advCastSource: 'auto'
      });
      return;
    }

    if (player.heroId === 'ronin' || player.heroId === 'ronin_ex') {
      this._seekerShotCounter++;
      const variant = (((player._autoVariant ?? 0) % 4) + 4) % 4;
      if (this._seekerShotCounter % 2 !== 0 && variant !== 1 && variant !== 3) return;
      const sx = player.x + dir * 52;
      const sy = (player.y || player.groundY) - 76;
      const speed = 780;
      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        groundY: player.groundY || player.y,
        vx: dir * speed,
        vy: 0,
        radius: 18,
        color: '#38bdf8',
        coreColor: '#ffffff',
        owner: player,
        damage: 48,
        type: 'ronin_slash',
        isMeteor: false,
        pierce: true,
        maxRange: 640,
        ignoreTargets: player._lastAutoMeleeHitFoes || null,
        advCastSource: 'auto'
      });
    }
  }

  update(dt, player) {
    if (this._skillCdShaveThrottle > 0) {
      this._skillCdShaveThrottle = Math.max(0, this._skillCdShaveThrottle - dt);
    }
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer <= 0) this.comboHits = 0;
    }
    if (player && !player.isDead) {
      const stats = this.getComputedStats();
      this.syncMaxHpWithEconomy(player);
      // Natural Spirit focus regeneration
      if (this.spirit < this.maxSpirit) {
        this.gainSpirit(8.5 * (stats.hasteMult || 1) * dt);
      }
      // Passive HP/s Regen from Aegis Vitality Relic
      const regenPct = stats.hpRegenPct || 0;
      if (regenPct > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * regenPct * dt);
      }
      this.syncGaugesToPlayer(player);
    }
  }
}

/**
 * Endless Crusade Mode Coordinator (`EndlessManager`)
 *
 * Infinite forward-scrolling 2.5D clicker/idle action-RPG loop:
 * - 4 cycling Realms (`Eclipse Sanctum`, `Cursed Starwood`, `Ossuary Necropolis`, `The Black Pit`) -> Ascended Loop II+
 * - 5 escalating Waves per Stage + 40s Timed Stage Boss (Crowned Warden or every 5th stage Colossal Behemoth Malphas)
 * - Zero-Punishment Boss Retreat -> continuous Wave Farming Loop until player clicks `CHALLENGE BOSS`
 * - Tap/Click Anywhere -> Arcane Tap-Smite Sky-Bolt + Magnetic Coin Scoop + Tap-Fever Overdrive
 * - AUTO ON by default with seamless manual 360-degree controls + 5 action orbs + up to 3 HD-2D Companions
 */
export class EndlessManager {
  constructor(game) {
    this.game = game;
    this.economy = new EndlessEconomy();
    this.companionEvo = new EndlessCompanionEvo();
    this.companions = new EndlessCompanions(this);
    this.shopUI = new EndlessShopUI(this);
    this.skillSets = new AdventureSkillSets(this);
    this.progression = new EndlessProgressionAdapter(this);

    this.active = false;
    this.autoPlay = true; // AUTO ON by default in Endless Crusade
    this.manualTargetLock = false;
    this.lockedMonster = null;

    this.depthMinY = ENDLESS_DEPTH_MIN_Y;
    this.depthMaxY = ENDLESS_DEPTH_MAX_Y;
    this.depthMidY = ENDLESS_DEPTH_MID_Y;

    this.stage = 1;
    this.bestStage = 1;
    this.waveInStage = 1;
    this.wavesPerStage = 5;

    this.isBossEncounter = false;
    this.bossFarmMode = false;
    this.bossTimer = 0;
    this.bossTimerMax = 40;
    this.bossEntity = null;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;

    this.corridorOriginX = 240;
    this.corridorMinX = 60;
    this.corridorMaxX = 1480;
    this.lockActive = true;
    this.lockMinX = 60;
    this.lockMaxX = 1480;

    this.coins = [];
    this.tapSmites = [];
    this.feverBursts = [];
    this.feverChains = [];
    this.wave4Bursts = [];
    this.portals = [];
    this.monsterPlumes = [];
    this.floatingCallouts = [];

    // Wave 3: Astral Ascension prestige, Offline Loot, Gilded Goblins & Milestone Chests
    this.ascension = new EndlessAscension();
    this.bossDirector = new EndlessBossDirector();
    this.gear = new EndlessGear();
    this.events = new EndlessEvents();
    this.trials = new EndlessTrials();
    this._trialSpawnTimer = 0;
    this._trialBossPrevHp = 0;
    this._trialHordeWaveIdx = 0;
    this._activeDirectorSnap = null;
    this._activeDirectorMods = null;
    this.pendingOfflineLoot = null;
    this.treasureGoblins = [];
    this.treasureChests = [];
    this.lootBeams = [];
    this._gearNovaFx = [];
    this._inBloodReaverNova = false;
    this.worldShrines = [];
    this.wanderingMerchants = [];
    this._shrineSpawnTimer = 26;
    this._merchantSpawnTimer = 50;
    this._tempestBoltTimer = 0;
    this._goblinSpawnTimer = GOBLIN_SPAWN_MIN_SEC + Math.random() * (GOBLIN_SPAWN_MAX_SEC - GOBLIN_SPAWN_MIN_SEC);
    this._heroGoblinHitCd = 0;
    this._encounterSeq = 0;

    this._coinStreak = 0;
    this._coinStreakTimer = 0;
    this._lastCoinChimeMs = -1000;
    this._lastFeverTier = 0;
    this._feverStampPopTimer = 0;
    this._activeSynergyMods = null;
    this._baseExternalModifiers = {};
    this._lastWrittenSynergyExt = null;

    this.bannerText = '';
    this.bannerSubText = '';
    this.bannerColor = '#facc15';
    this.bannerTimer = 0;
    this.zoneIndex = 0;

    // Input state
    this.keys = {};
    this.joyVec = { x: 0, y: 0, active: false };
    this.attackHeld = false;
    this.smoothVelX = 0;
    this.smoothVelY = 0;
    this.queuedAction = null;
    this.queuedActionTimer = 0;
    this.comboResetTimer = 0;
    this._comboLockTarget = null;

    // Adventure HUD & cooldown compatibility fields
    this.isSkillTreeOpen = false;
    this.isRelicDraftOpen = false;
    this.totalWaveLabel = 'STAGE 1 • WAVE 1/5';
    this.monstersKilled = 0;
    this.score = 0;
    this.goPromptActive = false;
    this.goBlinkTimer = 0;
    this.autoCdMax = 0.44;
    this.skillCdMax = 4.2;
    this.dodgeCdMax = 1.25;
    this._renderedIconHero = null;
    this._renderedMageIconsReady = false;
    this._renderedHeroIconsReady = false;

    // Internal flow & timers
    this._waveAdvancePending = false;
    this._waveAdvanceTargetX = 240;
    this._waveAdvanceElapsed = 0;
    this._waveSpawnDelay = 0;
    this._pendingSpawnKind = 'wave'; // 'wave' | 'boss'
    this._farmWaveCount = 0;
    this._phoenixInvulnTimer = 0;
    this._bossPortalX = 0;
    this._bossPortalActive = false;
    this._autoSaveAccum = 0;
    this._uiSyncAccum = 0;
    this._hudSyncAccum = 0;
    this._extModsDirty = true;
    this._extModsSyncAccum = 0;
    this._pendingSaveDelay = -1;
    this._deckDomRefs = null;
    this._deckOrbCdCache = {};
    this._lastPortraitKey = '';
    this._lastPortraitCol = '';
    this._lastCompanionSyncSig = '';
    this._clock = 0;
    this._hudClearanceCache = null;
    this._hudClearanceCachedAt = -1;

    this._boundKeyDown = (e) => this.onKeyDown(e);
    this._boundKeyUp = (e) => this.onKeyUp(e);
    this._boundBlur = () => this.clearHeldInputs();
    this._boundPageHide = () => {
      if (this.active) this.saveNow();
    };
    this._listenersAttached = false;
  }

  attachListeners() {
    if (this._listenersAttached || typeof window === 'undefined') return;
    this._listenersAttached = true;
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    window.addEventListener('blur', this._boundBlur);
    window.addEventListener('pagehide', this._boundPageHide);
  }

  clearHeldInputs() {
    this.keys = {};
    this.joyVec = { x: 0, y: 0, active: false };
    this.attackHeld = false;
    this.smoothVelX = 0;
    this.smoothVelY = 0;
    this.queuedAction = null;
    this.queuedActionTimer = 0;
    this._comboLockTarget = null;
    this.syncJoystickKnobUI();
  }

  isBlockingModalOpen() {
    return Boolean(
      this.pendingOfflineLoot ||
        this.offlineLootModal ||
        this.trials?.lastResult ||
        this.trialResult
    );
  }

  dismissActiveModal() {
    if (this.trials?.lastResult || this.trialResult) {
      this.trialResult = null;
      return this.dismissTrialResult();
    }
    if (this.pendingOfflineLoot || this.offlineLootModal) {
      this.offlineLootModal = null;
      return this.claimOfflineLoot();
    }
    return false;
  }

  onKeyDown(e) {
    if (
      !this.active ||
      this.game?.isLandingOpen ||
      this.game?.isMatchOver ||
      this.game?.isPaused ||
      this.isBlockingModalOpen()
    ) {
      return;
    }
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.keys.left = true;
      this.syncJoystickKnobUI();
      e.preventDefault?.();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.keys.right = true;
      this.syncJoystickKnobUI();
      e.preventDefault?.();
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      this.keys.up = true;
      this.syncJoystickKnobUI();
      e.preventDefault?.();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.keys.down = true;
      this.syncJoystickKnobUI();
      e.preventDefault?.();
    } else if (code === 'KeyJ') {
      this.attackHeld = true;
      this.triggerAction('attack');
      e.preventDefault?.();
    } else if (code === 'KeyK' || code === 'KeyX') {
      this.triggerAction('skill');
      e.preventDefault?.();
    } else if (
      code === 'KeyL' ||
      code === 'KeyC' ||
      code === 'Space' ||
      code === 'ShiftLeft' ||
      code === 'ShiftRight'
    ) {
      this.triggerAction('dodge');
      e.preventDefault?.();
    } else if (code === 'KeyU' || code === 'KeyQ') {
      this.triggerAction('overdrive');
      e.preventDefault?.();
    } else if (code === 'KeyI' || code === 'KeyE') {
      this.triggerAction('ultimate');
      e.preventDefault?.();
    } else if (code === 'KeyO') {
      if (!e.repeat) {
        this.triggerSquadOverdrive();
      }
      e.preventDefault?.();
    } else if (code === 'KeyP') {
      if (!e.repeat) {
        this.toggleAutoPlay(true);
      }
      e.preventDefault?.();
    } else if (!this.autoPlay && (code === 'Tab' || code === 'KeyR')) {
      if (!e.repeat) {
        this.toggleTargetLock(true);
      }
      e.preventDefault?.();
    } else if (code === 'KeyB' && this.bossFarmMode && !this.isBossEncounter && !this.trials?.isActive?.()) {
      if (!e.repeat) {
        this.challengeBoss();
      }
      e.preventDefault?.();
    } else if (code === 'KeyT') {
      if (!e.repeat) {
        this.shopUI?.toggleDrawer?.();
      }
      e.preventDefault?.();
    } else if (
      !e.repeat &&
      this.shopUI?.isDrawerOpen?.() &&
      code &&
      code.length === 6 &&
      code.startsWith('Digit')
    ) {
      const tabIdx = code.charCodeAt(5) - 49;
      const tabId = ENDLESS_DRAWER_TAB_KEYS[tabIdx];
      if (tabId && typeof this.shopUI.setActiveTab === 'function') {
        this.shopUI.setActiveTab(tabId);
        e.preventDefault?.();
      }
    }
  }

  onKeyUp(e) {
    if (!this.active) return;
    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.keys.left = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.keys.right = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      this.keys.up = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.keys.down = false;
      this.syncJoystickKnobUI();
    } else if (code === 'KeyJ') {
      this.attackHeld = false;
    }
  }

  get player() {
    return this.game?.leftFighter || null;
  }

  get enemies() {
    return this.getLivingMonsters();
  }

  _getEntityGameView() {
    const baseGame = this.game;
    if (!baseGame) return baseGame;
    if (this._entityGameView && this._entityGameViewTarget === baseGame) {
      return this._entityGameView;
    }
    const endlessMgr = this;
    const isAdvTrue = () => true;
    const isSideTrue = () => true;
    const getSideMgr = () => endlessMgr;
    const boundMethods = new Map();
    this._entityGameViewTarget = baseGame;
    this._entityGameView = new Proxy(baseGame, {
      get(target, prop) {
        if (prop === 'adventure') return endlessMgr;
        if (prop === 'isAdventureMode') return isAdvTrue;
        if (prop === 'isSideScrollMode') return isSideTrue;
        if (prop === 'getActiveSideScrollManager') return getSideMgr;
        const val = target[prop];
        if (typeof val === 'function') {
          let bound = boundMethods.get(prop);
          if (!bound) {
            bound = val.bind(target);
            boundMethods.set(prop, bound);
          }
          return bound;
        }
        return val;
      }
    });
    return this._entityGameView;
  }

  getWorldWidth() {
    const safeMax = Number.isFinite(this.corridorMaxX) ? this.corridorMaxX : 1480;
    return Math.max(9600, safeMax + 2400);
  }

  _syncCorridorBounds({ lockToCorridor = false, syncCamera = true } = {}) {
    if (!Number.isFinite(this.corridorOriginX) || this.corridorOriginX < 240) {
      this.corridorOriginX = 240;
    }
    this.corridorMinX = Math.max(60, Math.round(this.corridorOriginX - 240));
    this.corridorMaxX = Math.round(this.corridorOriginX + ENDLESS_CORRIDOR_WIDTH - 180);

    if (lockToCorridor || this.lockActive) {
      this.lockMinX = this.corridorMinX;
      this.lockMaxX = this.corridorMaxX;
    } else {
      if (!Number.isFinite(this.lockMinX) || this.corridorMinX - this.lockMinX > ENDLESS_CORRIDOR_STEP_X * 3) {
        this.lockMinX = this.corridorMinX;
      }
      if (!Number.isFinite(this.lockMaxX) || this.lockMaxX < this.corridorMaxX) {
        this.lockMaxX = this.corridorMaxX;
      }
    }

    if (this.lockMaxX < this.lockMinX + 400) {
      this.lockMaxX = this.lockMinX + ENDLESS_CORRIDOR_WIDTH;
    }

    if (syncCamera && this.game?.renderer) {
      const renderer = this.game.renderer;
      const neededW = this.getWorldWidth();
      if (!Number.isFinite(renderer.worldWidth) || renderer.worldWidth < neededW) {
        renderer.worldWidth = neededW;
      }
      const camMin = Math.max(0, this.lockMinX - 60);
      const camMax = this.lockMaxX + 180;
      renderer.adventureCamMinX = camMin;
      renderer.adventureCamMaxX = camMax;
      if (
        !Number.isFinite(renderer.camX) ||
        renderer.camX < camMin - 480 ||
        renderer.camX > camMax + 480
      ) {
        renderer.camX = Math.round((camMin + camMax) * 0.5);
      }
    }
  }

  _evictOverflowCoins() {
    while (this.coins.length >= COINS_MAX_COUNT) {
      const oldest = this.coins.shift();
      if (oldest && oldest.kind === 'gold' && Number.isFinite(oldest.rawGold) && oldest.rawGold > 0) {
        const added = this.economy.addGold(safeBoundedInt(oldest.rawGold, 1, ENDLESS_MAX_STAT), {
          isBoss: Boolean(oldest.isBoss),
          applyMult: Boolean(oldest.applyMult)
        });
        if (added > 0 && this.trials?.isActive?.()) {
          this.trials.recordTrialGold(added);
        }
      }
    }
  }

  _pushTapSmite(entry) {
    if (!entry) return;
    while (this.tapSmites.length >= TAP_SMITE_MAX_COUNT) {
      this.tapSmites.shift();
    }
    this.tapSmites.push(entry);
  }

  _pushFeverBurst(entry) {
    if (!entry) return;
    while (this.feverBursts.length >= FEVER_BURST_MAX_COUNT) {
      this.feverBursts.shift();
    }
    this.feverBursts.push(entry);
  }

  getActiveStageBounds() {
    const minX = Number.isFinite(this.lockMinX) ? this.lockMinX : this.corridorMinX || 60;
    const maxX = Number.isFinite(this.lockMaxX) ? this.lockMaxX : this.corridorMaxX || 1480;
    const colossalAlive = Boolean(
      this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
    );
    if (colossalAlive) {
      const anchorX = Number.isFinite(this.bossEntity.anchorX) ? this.bossEntity.anchorX : maxX - 180;
      return {
        minX,
        maxX: Math.max(minX + 240, anchorX - 85)
      };
    }
    return { minX, maxX: Math.max(minX + 240, maxX) };
  }

  getBossAnchorX() {
    return this.bossEntity?.anchorX || Math.round(this.lockMaxX - 180);
  }

  getBossMaxWalkX() {
    return this.getBossAnchorX() - 85;
  }

  getBossMinWalkX() {
    return Math.max(60, this.lockMinX);
  }

  getCurrentRealm() {
    const safeStage = Math.max(1, Math.floor(this.stage || 1));
    const realmIndex = (safeStage - 1) % ENDLESS_REALMS.length;
    const ascendedLoop = Math.floor((safeStage - 1) / ENDLESS_REALMS.length) + 1;
    return {
      ...ENDLESS_REALMS[realmIndex],
      realmIndex,
      ascendedLoop
    };
  }

  _prewarmRealmAssets(realmIndex = 0) {
    if (typeof HTMLImageElement === 'undefined') return;
    const idx = ((realmIndex | 0) % ENDLESS_REALMS.length + ENDLESS_REALMS.length) % ENDLESS_REALMS.length;
    PixelForge.ensureAdventureLoaded?.(idx);
    PixelForge.ensureEndlessLoaded?.();
    const realm = ENDLESS_REALMS[idx];
    if (realm) {
      for (const mk of realm.monsters) {
        PixelForge.ensureMonsterLoaded?.(mk);
      }
      PixelForge.ensureMonsterLoaded?.(realm.warden);
    }
    if (this.stage % 5 === 0 || (this.stage + 1) % 5 === 0) {
      PixelForge.ensureHeroLoaded?.('archfiend');
      PixelForge.ensureMonsterLoaded?.('fiend');
    }
    const assets = PixelForge.initAssets?.();
    if (assets?.endlessVfx) {
      PixelForge.ensureImage?.(assets.endlessVfx);
    }
    const compKeys = this.companions?.getActiveHeroKeys?.() || [];
    for (const hk of compKeys) {
      PixelForge.ensureHeroLoaded?.(hk);
    }
  }

  showBanner(text, subText = '', color = '#facc15', duration = 2.4) {
    this.bannerText = String(text || '').replace(/\|/g, '•').toUpperCase();
    this.bannerSubText = String(subText || '').replace(/\|/g, '•').toUpperCase();
    this.bannerColor = color || '#facc15';
    this.bannerTimer = Math.max(0.5, duration || 2.4);
  }

  spawnFloatingCallout(x, y, text, color = '#facc15', scale = 1, maxLife = 0.95, opts = {}) {
    if (!text) return;
    const safeX = Number.isFinite(x) ? Math.round(x) : Math.round(this.corridorOriginX || 240);
    let safeY = Number.isFinite(y) ? Math.round(y) : Math.round(this.depthMidY - 100);
    while (this.floatingCallouts.length >= FLOATING_CALLOUT_MAX_COUNT) {
      this.floatingCallouts.shift();
    }
    const minGapY = scale >= 2 ? 26 : 18;
    for (let pass = 0; pass < 4; pass++) {
      let shifted = false;
      for (let i = 0; i < this.floatingCallouts.length; i++) {
        const fc = this.floatingCallouts[i];
        if (!fc || (fc.age || 0) > 0.35) continue;
        if (Math.abs((fc.x || 0) - safeX) <= 84 && Math.abs((fc.y || 0) - safeY) < minGapY) {
          safeY -= minGapY;
          shifted = true;
          break;
        }
      }
      if (!shifted) break;
    }
    const label = String(text).toUpperCase();
    let kind = opts?.kind || null;
    if (!kind) {
      if (label.startsWith('CRIT ')) kind = 'crit';
      else if (label.includes('FEVER') || label.includes('OVERDRIVE')) kind = 'fever';
      else if (label.includes('SHARD')) kind = 'shard';
      else if (label.startsWith('+') && label.endsWith('G')) kind = 'gold';
      else kind = 'callout';
    }
    const isPunchy = kind === 'crit' || kind === 'fever';
    const isGold = kind === 'gold' || kind === 'shard';
    const initVy = Number.isFinite(opts?.vy)
      ? opts.vy
      : isPunchy
        ? -96
        : isGold
          ? -78
          : -68;
    const initVx = Number.isFinite(opts?.vx)
      ? opts.vx
      : kind === 'gold' || kind === 'crit'
        ? (Math.random() - 0.5) * 28
        : 0;
    const topColor =
      opts?.topColor ||
      (kind === 'gold'
        ? '#ffffff'
        : kind === 'crit'
          ? '#fef08a'
          : kind === 'fever'
            ? '#fef9c3'
            : kind === 'shard'
              ? '#e0f2fe'
              : '#ffffff');

    this.floatingCallouts.push({
      x: safeX,
      y: safeY,
      vx: initVx,
      vy: initVy,
      text: label,
      color: color || '#facc15',
      topColor,
      kind,
      scale: scale >= 2 ? 2 : 1,
      popPeak: isPunchy ? 1.34 : isGold ? 1.22 : 1.14,
      age: 0,
      maxLife: Math.max(0.35, Number.isFinite(maxLife) ? maxLife : 0.95)
    });
  }

  attachAscension(ascensionInstance) {
    this.ascension = ascensionInstance || null;
    const synMods = this.companions?.getPartySynergyModifiers?.() || null;
    this._syncExternalModifiers(synMods, { preserveBase: true });
    const player = this.game?.leftFighter;
    if (this.active && player) {
      this.progression.syncMaxHpWithEconomy(player);
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return this.ascension;
  }

  _markExternalModifiersDirty() {
    this._extModsDirty = true;
  }

  _clearSynergyFromEconomy() {
    if (this._lastWrittenSynergyExt && this.economy?.setExternalModifiers) {
      const cur = this.economy._externalModifiers || {};
      const restored = {};
      for (const k of Object.keys(cur)) {
        if (!COMBINED_EXT_KEYS.includes(k)) {
          restored[k] = cur[k];
        } else if (
          this._baseExternalModifiers &&
          Object.prototype.hasOwnProperty.call(this._baseExternalModifiers, k)
        ) {
          restored[k] = this._baseExternalModifiers[k];
        }
      }
      this.economy.setExternalModifiers(restored);
    }
    this._activeSynergyMods = null;
    this._lastWrittenSynergyExt = null;
    this._extModsDirty = false;
    this._extModsSyncAccum = 0;
  }

  _syncExternalModifiers(synModsOverride = undefined, { preserveBase = false } = {}) {
    const synMods =
      synModsOverride !== undefined
        ? synModsOverride
        : this.companions?.getPartySynergyModifiers?.() || null;
    const ascMods =
      this.ascension && typeof this.ascension.getPermanentModifiers === 'function'
        ? this.ascension.getPermanentModifiers() || null
        : null;
    const dirSnap =
      this.bossDirector && typeof this.bossDirector.getDirectorSnapshot === 'function'
        ? this.bossDirector.getDirectorSnapshot(this.stage, this.bestStage, this.getCurrentRealm())
        : null;
    const dirMods = dirSnap?.combinedModifiers || null;
    const gearMods =
      this.gear && typeof this.gear.getGearModifiers === 'function'
        ? this.gear.getGearModifiers() || null
        : null;
    const eventMods =
      this.events && typeof this.events.getEventModifiers === 'function'
        ? this.events.getEventModifiers() || null
        : null;
    const evoMods =
      this.companionEvo && typeof this.companionEvo.getFormationModifiers === 'function'
        ? this.companionEvo.getFormationModifiers() || null
        : null;
    this._activeDirectorSnap = dirSnap;
    this._activeDirectorMods = dirMods;

    if (!this.economy || typeof this.economy.setExternalModifiers !== 'function') {
      this._activeSynergyMods = synMods || null;
      this._extModsDirty = false;
      this._extModsSyncAccum = 0;
      return synMods || null;
    }

    const hasSyn = Boolean(synMods && typeof synMods === 'object');
    const hasAsc = Boolean(ascMods && typeof ascMods === 'object');
    const hasDir = Boolean(dirMods && typeof dirMods === 'object');
    const hasGear = Boolean(gearMods && typeof gearMods === 'object');
    const hasEv = Boolean(eventMods && typeof eventMods === 'object');
    const hasEvo = Boolean(evoMods && typeof evoMods === 'object');
    if (!hasSyn && !hasAsc && !hasDir && !hasGear && !hasEv && !hasEvo) {
      if (this._lastWrittenSynergyExt) {
        this._clearSynergyFromEconomy();
      } else {
        this._activeSynergyMods = null;
        this._extModsDirty = false;
        this._extModsSyncAccum = 0;
      }
      return null;
    }

    const cur = this.economy._externalModifiers || {};
    if (!this._baseExternalModifiers) this._baseExternalModifiers = {};
    const prevWritten = this._lastWrittenSynergyExt;

    if (!preserveBase) {
      for (let i = 0; i < COMBINED_EXT_KEYS.length; i++) {
        const k = COMBINED_EXT_KEYS[i];
        const hasCur = Object.prototype.hasOwnProperty.call(cur, k) && Number.isFinite(cur[k]);
        const prevVal =
          prevWritten && Object.prototype.hasOwnProperty.call(prevWritten, k)
            ? prevWritten[k]
            : undefined;
        if (hasCur && (prevVal === undefined || Math.abs(cur[k] - prevVal) > 1e-9)) {
          this._baseExternalModifiers[k] = cur[k];
        } else if (!hasCur && prevVal !== undefined) {
          delete this._baseExternalModifiers[k];
        }
      }
    }

    const merged = {};
    for (const k of Object.keys(cur)) {
      if (!COMBINED_EXT_KEYS.includes(k)) {
        merged[k] = cur[k];
      }
    }

    const synHero =
      hasSyn && Number.isFinite(synMods.heroDmgMult) && synMods.heroDmgMult > 0
        ? synMods.heroDmgMult
        : 1.0;
    const synComp =
      hasSyn && Number.isFinite(synMods.companionDmgMult) && synMods.companionDmgMult > 0
        ? synMods.companionDmgMult
        : 1.0;
    const synGold =
      hasSyn && Number.isFinite(synMods.goldMult) && synMods.goldMult > 0 ? synMods.goldMult : 1.0;
    const synTap =
      hasSyn && Number.isFinite(synMods.tapDmgMult) && synMods.tapDmgMult > 0
        ? synMods.tapDmgMult
        : 1.0;
    const synCritChance = hasSyn && Number.isFinite(synMods.critBonus) ? synMods.critBonus : 0;
    const synCritDmg =
      hasSyn && Number.isFinite(synMods.critDmgMult) && synMods.critDmgMult > 0
        ? synMods.critDmgMult
        : hasSyn && Number.isFinite(synMods.critDmgBonus) && synMods.critDmgBonus > 0
          ? 1 + synMods.critDmgBonus
          : 1.0;

    const ascHero =
      hasAsc && Number.isFinite(ascMods.heroDmgMult) && ascMods.heroDmgMult > 0
        ? ascMods.heroDmgMult
        : hasAsc && Number.isFinite(ascMods.globalDpsMult) && ascMods.globalDpsMult > 0
          ? ascMods.globalDpsMult
          : 1.0;
    const ascTap =
      hasAsc && Number.isFinite(ascMods.tapDmgMult) && ascMods.tapDmgMult > 0
        ? ascMods.tapDmgMult
        : hasAsc && Number.isFinite(ascMods.tapMult) && ascMods.tapMult > 0
          ? ascMods.tapMult * ascHero
          : ascHero;
    const ascComp =
      hasAsc && Number.isFinite(ascMods.companionDmgMult) && ascMods.companionDmgMult > 0
        ? ascMods.companionDmgMult
        : hasAsc && Number.isFinite(ascMods.companionMult) && ascMods.companionMult > 0
          ? ascMods.companionMult * ascHero
          : 1.0;
    const ascGold =
      hasAsc && Number.isFinite(ascMods.goldMult) && ascMods.goldMult > 0 ? ascMods.goldMult : 1.0;
    const ascCritChance =
      hasAsc && Number.isFinite(ascMods.critChanceBonus) ? ascMods.critChanceBonus : 0;
    const ascCritDmg =
      hasAsc && Number.isFinite(ascMods.critDmgMult) && ascMods.critDmgMult > 0
        ? ascMods.critDmgMult
        : hasAsc && Number.isFinite(ascMods.critDmgBonus) && ascMods.critDmgBonus > 0
          ? 1 + ascMods.critDmgBonus
          : 1.0;
    const ascStartingGold =
      hasAsc && Number.isFinite(ascMods.startingGold) && ascMods.startingGold > 0
        ? ascMods.startingGold
        : 0;
    const ascBossTimer =
      hasAsc && Number.isFinite(ascMods.bossTimerBonusSec) && ascMods.bossTimerBonusSec > 0
        ? ascMods.bossTimerBonusSec
        : 0;
    const ascRelicDiscount =
      hasAsc && Number.isFinite(ascMods.relicDiscountMult) && ascMods.relicDiscountMult > 0
        ? ascMods.relicDiscountMult
        : 1.0;
    const ascFeverBonus =
      hasAsc && Number.isFinite(ascMods.feverDurationBonusSec) && ascMods.feverDurationBonusSec > 0
        ? ascMods.feverDurationBonusSec
        : 0;

    const baseGlobal =
      Number.isFinite(this._baseExternalModifiers.globalDpsMult) &&
      this._baseExternalModifiers.globalDpsMult > 0
        ? this._baseExternalModifiers.globalDpsMult
        : 1.0;
    const baseGold =
      Number.isFinite(this._baseExternalModifiers.goldMult) &&
      this._baseExternalModifiers.goldMult > 0
        ? this._baseExternalModifiers.goldMult
        : 1.0;
    const baseTap =
      Number.isFinite(this._baseExternalModifiers.tapMult) &&
      this._baseExternalModifiers.tapMult > 0
        ? this._baseExternalModifiers.tapMult
        : 1.0;
    const baseComp =
      Number.isFinite(this._baseExternalModifiers.companionMult) &&
      this._baseExternalModifiers.companionMult > 0
        ? this._baseExternalModifiers.companionMult
        : 1.0;
    const baseCritChance = Number.isFinite(this._baseExternalModifiers.critChanceBonus)
      ? this._baseExternalModifiers.critChanceBonus
      : 0;
    const baseCritDmg =
      Number.isFinite(this._baseExternalModifiers.critDmgMult) &&
      this._baseExternalModifiers.critDmgMult > 0
        ? this._baseExternalModifiers.critDmgMult
        : 1.0;
    const baseStartingGold =
      Number.isFinite(this._baseExternalModifiers.startingGold) &&
      this._baseExternalModifiers.startingGold > 0
        ? this._baseExternalModifiers.startingGold
        : 0;
    const baseBossTimer =
      Number.isFinite(this._baseExternalModifiers.bossTimerBonusSec) &&
      this._baseExternalModifiers.bossTimerBonusSec > 0
        ? this._baseExternalModifiers.bossTimerBonusSec
        : 0;
    const baseRelicDiscount =
      Number.isFinite(this._baseExternalModifiers.relicDiscountMult) &&
      this._baseExternalModifiers.relicDiscountMult > 0
        ? this._baseExternalModifiers.relicDiscountMult
        : 1.0;
    const baseFeverBonus =
      Number.isFinite(this._baseExternalModifiers.feverDurationBonusSec) &&
      this._baseExternalModifiers.feverDurationBonusSec > 0
        ? this._baseExternalModifiers.feverDurationBonusSec
        : 0;

    const dirHero =
      hasDir && Number.isFinite(dirMods.heroDmgMult) && dirMods.heroDmgMult > 0
        ? dirMods.heroDmgMult
        : 1.0;
    const dirTap =
      hasDir && Number.isFinite(dirMods.tapDmgMult) && dirMods.tapDmgMult > 0
        ? dirMods.tapDmgMult
        : 1.0;
    const dirComp =
      hasDir && Number.isFinite(dirMods.companionDmgMult) && dirMods.companionDmgMult > 0
        ? dirMods.companionDmgMult
        : 1.0;
    const dirGold =
      hasDir && Number.isFinite(dirMods.goldMult) && dirMods.goldMult > 0 ? dirMods.goldMult : 1.0;
    const dirCritChance = hasDir && Number.isFinite(dirMods.critBonus) ? dirMods.critBonus : 0;
    const dirHaste =
      hasDir && Number.isFinite(dirMods.hasteMult) && dirMods.hasteMult > 0 ? dirMods.hasteMult : 1.0;
    const dirBossDmg =
      hasDir && Number.isFinite(dirMods.bossDmgMult) && dirMods.bossDmgMult > 0
        ? dirMods.bossDmgMult
        : 1.0;

    const baseHaste =
      Number.isFinite(this._baseExternalModifiers.hasteMult) &&
      this._baseExternalModifiers.hasteMult > 0
        ? this._baseExternalModifiers.hasteMult
        : 1.0;
    const baseBossDmg =
      Number.isFinite(this._baseExternalModifiers.bossDmgMult) &&
      this._baseExternalModifiers.bossDmgMult > 0
        ? this._baseExternalModifiers.bossDmgMult
        : 1.0;

    const gearHero =
      hasGear && Number.isFinite(gearMods.heroDmgMult) && gearMods.heroDmgMult > 0
        ? gearMods.heroDmgMult
        : 1.0;
    const gearTap =
      hasGear && Number.isFinite(gearMods.tapDmgMult) && gearMods.tapDmgMult > 0
        ? gearMods.tapDmgMult
        : 1.0;
    const gearComp =
      hasGear && Number.isFinite(gearMods.companionDmgMult) && gearMods.companionDmgMult > 0
        ? gearMods.companionDmgMult
        : 1.0;
    const gearGold =
      hasGear && Number.isFinite(gearMods.goldMult) && gearMods.goldMult > 0
        ? gearMods.goldMult
        : 1.0;
    const gearCritChance =
      hasGear && Number.isFinite(gearMods.critBonus) ? gearMods.critBonus : 0;
    const gearBossDmg =
      hasGear && Number.isFinite(gearMods.bossDmgMult) && gearMods.bossDmgMult > 0
        ? gearMods.bossDmgMult
        : 1.0;

    const evHero =
      hasEv && Number.isFinite(eventMods.heroDmgMult) && eventMods.heroDmgMult > 0
        ? eventMods.heroDmgMult
        : 1.0;
    const evTap =
      hasEv && Number.isFinite(eventMods.tapDmgMult) && eventMods.tapDmgMult > 0
        ? eventMods.tapDmgMult
        : 1.0;
    const evComp =
      hasEv && Number.isFinite(eventMods.companionDmgMult) && eventMods.companionDmgMult > 0
        ? eventMods.companionDmgMult
        : 1.0;
    const evGold =
      hasEv && Number.isFinite(eventMods.goldMult) && eventMods.goldMult > 0
        ? eventMods.goldMult
        : 1.0;
    const evCritChance =
      hasEv && Number.isFinite(eventMods.critBonus) ? eventMods.critBonus : 0;
    const evCritDmg =
      hasEv && Number.isFinite(eventMods.critDmgMult) && eventMods.critDmgMult > 0
        ? eventMods.critDmgMult
        : 1.0;
    const evHaste =
      hasEv && Number.isFinite(eventMods.hasteMult) && eventMods.hasteMult > 0
        ? eventMods.hasteMult
        : 1.0;

    const evoHero =
      hasEvo && Number.isFinite(evoMods.heroDmgMult) && evoMods.heroDmgMult > 0
        ? evoMods.heroDmgMult
        : 1.0;
    const evoComp =
      hasEvo && Number.isFinite(evoMods.companionDmgMult) && evoMods.companionDmgMult > 0
        ? evoMods.companionDmgMult
        : 1.0;
    const evoGold =
      hasEvo && Number.isFinite(evoMods.goldMult) && evoMods.goldMult > 0 ? evoMods.goldMult : 1.0;
    const evoCritChance =
      hasEvo && Number.isFinite(evoMods.critBonus) ? evoMods.critBonus : 0;
    const evoHaste =
      hasEvo && Number.isFinite(evoMods.hasteMult) && evoMods.hasteMult > 0
        ? evoMods.hasteMult
        : 1.0;
    const evoBossDmg =
      hasEvo && Number.isFinite(evoMods.bossDmgMult) && evoMods.bossDmgMult > 0
        ? evoMods.bossDmgMult
        : 1.0;

    merged.globalDpsMult = safeBoundedFloat(
      baseGlobal * ascHero * synHero * dirHero * gearHero * evHero * evoHero,
      0.1,
      ENDLESS_MAX_MULT,
      1.0
    );
    merged.goldMult = safeBoundedFloat(
      baseGold * ascGold * synGold * dirGold * gearGold * evGold * evoGold,
      0.1,
      ENDLESS_MAX_MULT,
      1.0
    );
    merged.tapMult = safeBoundedFloat(
      baseTap *
        (ascTap / ascHero) *
        (synTap / synHero) *
        (dirTap / dirHero) *
        (gearTap / gearHero) *
        (evTap / evHero) *
        (1.0 / evoHero),
      1e-6,
      ENDLESS_MAX_MULT,
      1.0
    );
    merged.companionMult = safeBoundedFloat(
      baseComp *
        (ascComp / ascHero) *
        (synComp / synHero) *
        (dirComp / dirHero) *
        (gearComp / gearHero) *
        (evComp / evHero) *
        (evoComp / evoHero),
      1e-6,
      ENDLESS_MAX_MULT,
      1.0
    );
    merged.critChanceBonus = safeBoundedFloat(
      baseCritChance + ascCritChance + synCritChance + dirCritChance + gearCritChance + evCritChance + evoCritChance,
      0,
      0.95,
      0
    );
    merged.critDmgMult = safeBoundedFloat(baseCritDmg * ascCritDmg * synCritDmg * evCritDmg, 0.5, 1e4, 1.0);
    const totalHaste = safeBoundedFloat(baseHaste * dirHaste * evHaste * evoHaste, 0.25, 25, 1.0);
    const totalBossDmg = safeBoundedFloat(baseBossDmg * dirBossDmg * gearBossDmg * evoBossDmg, 0.1, ENDLESS_MAX_MULT, 1.0);
    if (
      Math.abs(totalHaste - 1.0) > 1e-9 ||
      Object.prototype.hasOwnProperty.call(this._baseExternalModifiers, 'hasteMult')
    ) {
      merged.hasteMult = totalHaste;
    }
    if (
      Math.abs(totalBossDmg - 1.0) > 1e-9 ||
      Object.prototype.hasOwnProperty.call(this._baseExternalModifiers, 'bossDmgMult')
    ) {
      merged.bossDmgMult = totalBossDmg;
    }

    const totalStartingGold = safeBoundedInt(baseStartingGold + ascStartingGold, 0, ENDLESS_MAX_STAT, 0);
    const totalBossTimer = safeBoundedFloat(baseBossTimer + ascBossTimer, 0, 120, 0);
    const totalRelicDiscount = safeBoundedFloat(baseRelicDiscount * ascRelicDiscount, 0.15, 1.5, 1.0);
    const totalFeverBonus = safeBoundedFloat(baseFeverBonus + ascFeverBonus, 0, 30, 0);

    if (totalStartingGold > 0 || Object.prototype.hasOwnProperty.call(this._baseExternalModifiers, 'startingGold')) {
      merged.startingGold = totalStartingGold;
    }
    if (totalBossTimer > 0 || Object.prototype.hasOwnProperty.call(this._baseExternalModifiers, 'bossTimerBonusSec')) {
      merged.bossTimerBonusSec = totalBossTimer;
    }
    if (
      Math.abs(totalRelicDiscount - 1.0) > 1e-9 ||
      Object.prototype.hasOwnProperty.call(this._baseExternalModifiers, 'relicDiscountMult')
    ) {
      merged.relicDiscountMult = totalRelicDiscount;
    }
    if (totalFeverBonus > 0 || Object.prototype.hasOwnProperty.call(this._baseExternalModifiers, 'feverDurationBonusSec')) {
      merged.feverDurationBonusSec = totalFeverBonus;
    }

    const written = {};
    for (let i = 0; i < COMBINED_EXT_KEYS.length; i++) {
      const k = COMBINED_EXT_KEYS[i];
      if (Object.prototype.hasOwnProperty.call(merged, k)) {
        written[k] = merged[k];
      }
    }
    this._lastWrittenSynergyExt = written;
    this._activeSynergyMods = hasSyn ? synMods : null;
    this._extModsDirty = false;
    this._extModsSyncAccum = 0;
    this.economy.setExternalModifiers(merged);
    return synMods;
  }

  _applyPartySynergyToEconomy(synMods) {
    return this._syncExternalModifiers(synMods);
  }

  _autoOpenUnopenedChests({ creditGold = true } = {}) {
    if (!Array.isArray(this.treasureChests) || this.treasureChests.length === 0) {
      return 0;
    }
    let openedCount = 0;
    const inTrial = Boolean(this.trials?.isActive?.());
    for (let i = 0; i < this.treasureChests.length; i++) {
      const ch = this.treasureChests[i];
      if (!ch || ch.opened) continue;
      ch.opened = true;
      ch.isDead = true;
      ch.tapsLeft = 0;
      ch.hp = 0;
      openedCount++;

      const stg = Math.max(1, Math.floor(Number(ch.stage || this.stage) || 1));
      if (creditGold) {
        const stageGold = safeBoundedInt(
          this.economy.computeMonsterGoldReward(stg),
          1,
          ENDLESS_MAX_STAT
        );
        const chestGold = safeBoundedInt(stageGold * 10, 16, ENDLESS_MAX_STAT);
        const added = this.economy.addGold(chestGold, { isBoss: true, applyMult: true });
        if (inTrial && added > 0) {
          this.trials.recordTrialGold(added);
        }
      }
      if (stg % 5 === 0) {
        this.economy.addAstralShards(2);
      }
      if (
        this.gear &&
        typeof this.gear.rollDrop === 'function' &&
        typeof this.gear.collectDrop === 'function'
      ) {
        const canDrop =
          typeof this.gear.shouldDropFromSource !== 'function' ||
          this.gear.shouldDropFromSource('chest', stg);
        if (canDrop) {
          const item = this.gear.rollDrop({ stage: stg, source: 'chest' });
          if (item) {
            this.gear.collectDrop(item, { autoEquipEmpty: true });
          }
        }
      }
    }
    this.treasureChests = [];
    if (openedCount > 0) {
      this._markExternalModifiersDirty();
    }
    return openedCount;
  }

  _clearTransientWorldState({
    clearTrials = true,
    resetSpawnTimers = true,
    clearOfflineLoot = false,
    resetPlayerState = true,
    resetStreaks = true,
    playerOverride = null
  } = {}) {
    this._clearEnemyProjectiles();
    this.coins = [];
    this.tapSmites = [];
    this.feverBursts = [];
    this.feverChains = [];
    this.wave4Bursts = [];
    this.portals = [];
    this.monsterPlumes = [];
    this.floatingCallouts = [];
    this.treasureGoblins = [];
    this.treasureChests = [];
    this.lootBeams = [];
    this._gearNovaFx = [];
    this._inBloodReaverNova = false;
    this.worldShrines = [];
    this.wanderingMerchants = [];
    this._tempestBoltTimer = 0;
    this._heroGoblinHitCd = 0;
    this._phoenixInvulnTimer = 0;
    this.events?.dismissMerchantOffer?.();
    this.companions?.clearTransientFX?.();

    if (resetSpawnTimers) {
      this._shrineSpawnTimer = 26;
      this._merchantSpawnTimer = 50;
      this._goblinSpawnTimer =
        GOBLIN_SPAWN_MIN_SEC + Math.random() * (GOBLIN_SPAWN_MAX_SEC - GOBLIN_SPAWN_MIN_SEC);
    }

    if (clearTrials) {
      this._trialSpawnTimer = 0;
      this._trialBossPrevHp = 0;
      this._trialHordeWaveIdx = 0;
      if (this.trials) {
        this.trials.activeTrial = null;
        this.trials.lastResult = null;
      }
      this.trialResult = null;
    }

    if (clearOfflineLoot) {
      this.pendingOfflineLoot = null;
      this.offlineLootModal = null;
    }

    if (resetStreaks) {
      this._coinStreak = 0;
      this._coinStreakTimer = 0;
      this._lastCoinChimeMs = -1000;
      this._lastFeverTier = 0;
      this._feverStampPopTimer = 0;
    }

    if (resetPlayerState) {
      const player = playerOverride || this.game?.leftFighter;
      if (player) {
        if (player._advPureDodge || player.state === 'DODGE') {
          this.finishHeroAdventureDodge(player, false);
        }
        player.isInvulnerable = false;
        player.stunTimer = 0;
        player.isRooted = false;
        player.hurtTimer = 0;
        player._grabbedByBoss = false;
        player._grabbedByBossTimer = 0;
        player.vx = 0;
        player.vy = 0;
      }
    }
  }

  _scheduleSave(delayMs = 2000) {
    if (!this.economy || typeof this.economy.saveToStorage !== 'function') return;
    if (this.game?.simMode || this.game?.urlAutoPlay) return;
    const sec = Math.max(0.1, (Number(delayMs) || 2000) * 0.001);
    if (this._pendingSaveDelay < 0 || sec < this._pendingSaveDelay) {
      this._pendingSaveDelay = sec;
    }
  }

  // =========================================================================
  // LIFECYCLE: START, STOP, SAVE, RESET
  // =========================================================================

  startRun(playerFighter, { resumeSaved = true } = {}) {
    this.attachListeners();
    this.active = true;
    this.isSkillTreeOpen = false;
    this.isRelicDraftOpen = false;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this.clearHeldInputs();

    this._clearTransientWorldState({
      clearTrials: true,
      resetSpawnTimers: true,
      clearOfflineLoot: true,
      resetPlayerState: true,
      resetStreaks: true,
      playerOverride: playerFighter
    });

    this._activeSynergyMods = null;
    this._baseExternalModifiers = {};
    this._lastWrittenSynergyExt = null;
    this._extModsDirty = true;
    this._extModsSyncAccum = 0;
    this._pendingSaveDelay = -1;
    this._hudSyncAccum = 0;
    this._lastPortraitKey = '';
    this._lastPortraitCol = '';
    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerSubText = '';

    this.isBossEncounter = false;
    this.bossEntity = null;
    this.bossTimer = 0;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this._bossPortalActive = false;
    this._waveAdvancePending = false;
    this._waveAdvanceElapsed = 0;
    this._waveSpawnDelay = 0;
    this._farmWaveCount = 0;
    this._autoSaveAccum = 0;
    this._uiSyncAccum = 0;
    this._clock = 0;
    this.monstersKilled = 0;
    this.score = 0;

    // Load or initialize persistent Endless Crusade save state
    const canResume = Boolean(
      resumeSaved && !this.game?.simMode && !this.game?.urlAutoPlay
    );
    let loadedSnap = null;
    if (canResume && typeof this.economy.loadFromStorage === 'function') {
      loadedSnap = this.economy.loadFromStorage();
    }
    if (loadedSnap) {
      this.economy.importSaveSnapshot(loadedSnap);
      if (this.companionEvo) {
        if (loadedSnap?.meta?.companionEvo && typeof this.companionEvo.importSnapshot === 'function') {
          this.companionEvo.importSnapshot(loadedSnap.meta.companionEvo);
        } else if (typeof this.companionEvo.reset === 'function') {
          this.companionEvo.reset();
        }
      }
      const compSnap = loadedSnap.companions || loadedSnap.companionSnapshot || null;
      if (compSnap) {
        this.companions.importSnapshot(compSnap);
      } else {
        this.companions.reset();
      }
      this.stage = Math.max(1, Math.floor(this.economy.stage || 1));
      this.bestStage = Math.max(this.stage, Math.floor(this.economy.bestStage || this.stage));
      this.waveInStage = Math.max(
        1,
        Math.min(this.wavesPerStage, Math.floor(this.economy.waveInStage || 1))
      );
      this.bossFarmMode = Boolean(loadedSnap.meta?.bossFarmMode);
      if (typeof loadedSnap.meta?.autoPlay === 'boolean') {
        this.autoPlay = loadedSnap.meta.autoPlay;
      } else {
        this.autoPlay = true;
      }
      if (this.gear) {
        if (loadedSnap?.meta?.gear && typeof this.gear.importSnapshot === 'function') {
          this.gear.importSnapshot(loadedSnap.meta.gear);
        } else if (typeof this.gear.reset === 'function') {
          this.gear.reset();
        }
      }
      if (this.events) {
        if (loadedSnap?.meta?.events && typeof this.events.importSnapshot === 'function') {
          this.events.importSnapshot(loadedSnap.meta.events);
        } else if (typeof this.events.reset === 'function') {
          this.events.reset(this.stage);
        }
      }
      if (this.trials) {
        if (loadedSnap?.meta?.trials && typeof this.trials.importSnapshot === 'function') {
          this.trials.importSnapshot(loadedSnap.meta.trials);
        } else if (typeof this.trials.reset === 'function') {
          this.trials.reset();
        }
        this.trials.activeTrial = null;
        this.trials.lastResult = null;
      }
      if (this.ascension) {
        if (loadedSnap?.meta?.ascension && typeof this.ascension.importSnapshot === 'function') {
          this.ascension.importSnapshot(loadedSnap.meta.ascension);
        }
        const loadedSyn = this.companions?.getPartySynergyModifiers?.() || null;
        this._syncExternalModifiers(loadedSyn, { preserveBase: true });
        if (loadedSnap?.savedAt && typeof this.ascension.computeOfflineLoot === 'function') {
          const statsGoldMult = Number(this.economy?.getComputedStats?.()?.goldMult) || 1;
          const evGoldMult = Number(this.events?.getEventModifiers?.()?.goldMult) || 1;
          const permanentGoldMult = safeBoundedFloat(
            evGoldMult > 0 ? statsGoldMult / evGoldMult : statsGoldMult,
            0.1,
            ENDLESS_MAX_MULT,
            1.0
          );
          this.pendingOfflineLoot =
            this.ascension.computeOfflineLoot(
              loadedSnap.savedAt,
              Date.now(),
              this.stage,
              this.economy,
              { permanentGoldMult }
            ) || null;
        }
      } else if (this.gear || this.events || this.companionEvo) {
        const loadedSyn = this.companions?.getPartySynergyModifiers?.() || null;
        this._syncExternalModifiers(loadedSyn, { preserveBase: true });
      }
    } else {
      if (this.gear && typeof this.gear.reset === 'function') {
        this.gear.reset();
      }
      if (this.events && typeof this.events.reset === 'function') {
        this.events.reset(1);
      }
      if (this.companionEvo && typeof this.companionEvo.reset === 'function') {
        this.companionEvo.reset();
      }
      if (this.trials && typeof this.trials.reset === 'function') {
        this.trials.reset();
      }
      if (this.ascension || this.gear || this.events || this.companionEvo) {
        this._syncExternalModifiers(null, { preserveBase: true });
      }
      this.economy.resetRunState({ keepMeta: !resumeSaved });
      this.companions.reset();
      this.stage = Math.max(1, Math.floor(this.economy.stage || 1));
      this.bestStage = Math.max(this.stage, Math.floor(this.economy.bestStage || this.stage));
      this.waveInStage = 1;
      this.bossFarmMode = false;
      this.autoPlay = true;
      if (this.events && typeof this.events.reset === 'function' && this.stage !== 1) {
        this.events.reset(this.stage);
      }
    }

    this.economy.stage = this.stage;
    this.economy.bestStage = this.bestStage;
    this.economy.waveInStage = this.waveInStage;
    this.events?.ensureActiveBounty?.(this.stage, this.economy);
    this.economy.activeHeroId =
      playerFighter?.heroId || this.game?.slot1Hero || this.economy.activeHeroId || 'mage_ex';

    const realm = this.getCurrentRealm();
    this.zoneIndex = realm.realmIndex;
    this._prewarmRealmAssets(this.zoneIndex);
    this._prewarmRealmAssets((this.zoneIndex + 1) % ENDLESS_REALMS.length);

    // Initialize infinite corridor origin aligned cleanly to the active Realm's 2400px biome band
    const resumeWaveOffset = Math.max(0, Math.min(this.wavesPerStage - 1, this.waveInStage - 1)) * ENDLESS_CORRIDOR_STEP_X;
    this.corridorOriginX = realm.realmIndex * 2400 + 240 + resumeWaveOffset;
    this.corridorMinX = Math.max(60, this.corridorOriginX - 180);
    this.corridorMaxX = this.corridorOriginX + ENDLESS_CORRIDOR_WIDTH - 180;
    this.lockMinX = this.corridorMinX;
    this.lockMaxX = this.corridorMaxX;
    this.lockActive = true;

    this.progression.resetForRun();
    if (playerFighter) {
      playerFighter.game = this._getEntityGameView();
      this.skillSets.attachToFighter(playerFighter);
      this.progression.attachToFighter(playerFighter);

      playerFighter.x = this.corridorOriginX;
      playerFighter.groundY = this.depthMidY;
      playerFighter.y = this.depthMidY;
      playerFighter.facing = 1;
      playerFighter.team = 1;
      playerFighter.isPlayerControlled = true;
      playerFighter.isManualAdventureControl = true;
      playerFighter.adventureAutoPlay = this.autoPlay;
      playerFighter._manualWalkActive = false;
      playerFighter._manualSpeedRatio = 0;
      playerFighter._advPureDodge = false;
      playerFighter._advPureDodgeTimer = 0;
      playerFighter._advDodgeFrameOverride = null;
      playerFighter._advRecentCastSource = null;
      playerFighter._advRecentCastTimer = 0;
      playerFighter._advActiveCastSource = null;
      playerFighter._advAiVelX = 0;
      playerFighter._advAiVelZ = 0;
      playerFighter._advAiStuckTimer = 0;
      playerFighter._advAiUnstickTimer = 0;
      if (Array.isArray(playerFighter.capeNodes)) {
        playerFighter.capeNodes.forEach((n, i) => {
          if (n) {
            n.x = playerFighter.x - playerFighter.facing * i * 9;
            n.y = playerFighter.y - 52 + i * 9;
          }
        });
      }

      this.autoCdMax = playerFighter.autoInterval || 0.44;
      this.skillCdMax = Math.max(3.6, (playerFighter.skillMaxCooldown || 4.5) * 1.1);
      this.dodgeCdMax = 1.25;
      this.game.fighters = [playerFighter];
    } else {
      this.game.fighters = [];
    }

    this._renderedIconHero = null;
    this._renderedMageIconsReady = false;
    this._renderedHeroIconsReady = false;

    const renderer = this.game?.renderer;
    if (renderer) {
      renderer.worldWidth = this.getWorldWidth();
      renderer.adventureMode = true;
      renderer.adventureHook = this;
      renderer.stageId = realm.stageId;
      renderer.permanentStageOverride = null;
      renderer.trueUltStageOverride = null;
      renderer.trueUltStageAlpha = 0;
      renderer.adventureCamMinX = Math.max(0, this.corridorMinX - 60);
      renderer.adventureCamMaxX = this.corridorMaxX + 180;
      renderer.camX = this.corridorOriginX + 240;
      renderer.camY = this.depthMidY - 95;
      renderer.zoom =
        typeof renderer.getInitialMatchZoom === 'function'
          ? renderer.getInitialMatchZoom()
          : renderer.isMobileLandscape && typeof renderer.getMobileLandscapeFixedZoom === 'function'
            ? renderer.getMobileLandscapeFixedZoom(false)
            : renderer.isMobilePortrait && typeof renderer.getMobilePortraitFixedZoom === 'function'
              ? renderer.getMobilePortraitFixedZoom(false)
              : renderer.isMobile
                ? 0.64
                : 0.76;
    }

    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('victory-overlay')?.classList?.remove('is-defeat-plaque');
      document.getElementById('hud-right')?.classList?.add?.('hidden');
    }

    this._prewarmRealmAssets(this.zoneIndex);
    if (playerFighter) {
      this.companions.syncEntitiesWithWorld(playerFighter);
      this._lastCompanionSyncSig = this._computeCompanionSyncSig();
      const initSyn = this.companions?.getPartySynergyModifiers?.() || null;
      this._syncExternalModifiers(initSyn, { preserveBase: true });
      this.progression.syncMaxHpWithEconomy(playerFighter);
      this.refreshActionIcons(playerFighter.heroId || 'mage_ex');
    } else if (this.ascension || this.gear || this.events || this.companionEvo) {
      this._syncExternalModifiers(null, { preserveBase: true });
    }

    this.shopUI?.mount?.();
    this.shopUI?.setVisible?.(true);

    this._spawnWaveMonsters();
    this.showBanner(
      `STAGE ${this.stage} • ${realm.name}`,
      realm.ascendedLoop > 1
        ? `ASCENDED LOOP ${realm.ascendedLoop} • TAP TO SMITE!`
        : 'AUTO CRUSADE ACTIVE • TAP TO SMITE!',
      realm.accentHex,
      2.4
    );

    if (!this.game?.isLandingOpen && !this.game?.simMode) {
      this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
    }

    this.syncStageBadge();
    this.syncRightHUD();
    this.syncControlDeckUI();
    this.shopUI?.sync?.(this.getUiSnapshot(), true);
  }

  stopRun({ save = true } = {}) {
    // Scoop any floating coins, uncollected loot beams & unopened milestone chests before exiting
    if (this.coins.length > 0) {
      this._scoopAllCoinsInstant();
    }
    if (this.lootBeams.length > 0) {
      this._collectAllLootBeamsSilent();
    }
    // If exiting mid-Trial, restore exact paused main-stage state & clear activeTrial BEFORE saving/exiting
    if (this.trials?.isActive?.()) {
      const savedMain = this.trials.activeTrial?.savedMainState || null;
      this.trials.activeTrial = null;
      this.trials.lastResult = null;
      this._trialSpawnTimer = 0;
      this._trialBossPrevHp = 0;
      this._trialHordeWaveIdx = 0;
      this.treasureGoblins = [];
      this.treasureChests = [];
      this._restoreSavedMainState(savedMain, { respawnWave: false, restoreRenderer: false });
    }
    if (save && this.treasureChests.length > 0) {
      this._autoOpenUnopenedChests({ creditGold: true });
    }
    if (save && this.active) {
      this.saveNow();
    }

    const player = this.game?.leftFighter;
    if (player) {
      if (player._advPureDodge || player.state === 'DODGE') {
        this.finishHeroAdventureDodge(player, false);
      }
      player._advDodgeFrameOverride = null;
      player._advDodgeTrails = [];
      player._hnsStreaks = [];
      player.isManualAdventureControl = false;
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      player._advPureDodge = false;
      player._advPureDodgeTimer = 0;
      player._advRecentCastSource = null;
      player._advRecentCastTimer = 0;
      player._advActiveCastSource = null;
      player._grabbedByBoss = false;
      player._grabbedByBossTimer = 0;
      player.isInvulnerable = false;
      player.game = this.game;
      this.progression.detachFromFighter(player);
      this.skillSets.detachFromFighter(player);
    }

    this.bossEntity?.releaseGrabbedTarget?.();
    this.active = false;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this.isBossEncounter = false;
    this.bossEntity = null;
    this.bossTimer = 0;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this._bossPortalActive = false;
    this._waveAdvancePending = false;
    this.lockActive = false;
    this._pendingSaveDelay = -1;
    this._clearTransientWorldState({
      clearTrials: true,
      resetSpawnTimers: false,
      clearOfflineLoot: true,
      resetPlayerState: false,
      resetStreaks: true
    });

    this._clearSynergyFromEconomy();
    this._baseExternalModifiers = {};
    this.clearHeldInputs();

    this.shopUI?.setVisible?.(false);

    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('hud-right')?.classList?.remove?.('hidden');
    }

    const renderer = this.game?.renderer;
    if (renderer) {
      renderer.worldWidth = 1200;
      renderer.adventureMode = false;
      renderer.adventureHook = null;
      renderer.adventureCamMinX = null;
      renderer.adventureCamMaxX = null;
      renderer.camX = 600;
      renderer.camY = (renderer.groundY || 520) - 95;
      renderer.zoom =
        typeof renderer.getInitialMatchZoom === 'function'
          ? renderer.getInitialMatchZoom()
          : renderer.isMobile
            ? 0.72
            : 1.0;
    }

    this.syncControlDeckUI();
  }

  saveNow() {
    this._pendingSaveDelay = -1;
    if (!this.economy || typeof this.economy.saveToStorage !== 'function') return null;
    if (this.game?.simMode || this.game?.urlAutoPlay) return null;
    const savedMain = this.trials?.isActive?.() ? this.trials.activeTrial?.savedMainState : null;
    const saveStage =
      savedMain && Number.isFinite(savedMain.stage)
        ? Math.max(1, Math.floor(savedMain.stage))
        : this.stage;
    const saveBestStage = Math.max(
      this.economy.bestStage || 1,
      this.bestStage,
      savedMain && Number.isFinite(savedMain.bestStage) ? Math.floor(savedMain.bestStage) : 1
    );
    const saveWave =
      savedMain && Number.isFinite(savedMain.waveInStage)
        ? Math.max(1, Math.min(this.wavesPerStage, Math.floor(savedMain.waveInStage)))
        : this.waveInStage;
    const saveBossFarm = savedMain ? Boolean(savedMain.bossFarmMode) : this.bossFarmMode;
    this.economy.stage = saveStage;
    this.economy.bestStage = saveBestStage;
    this.economy.waveInStage = saveWave;
    const compSnap = this.companions?.exportSnapshot?.() || null;
    const metaSnap = {
      autoPlay: this.autoPlay,
      bossFarmMode: saveBossFarm,
      stage: saveStage,
      bestStage: saveBestStage,
      waveInStage: saveWave,
      ascension: this.ascension?.exportSnapshot?.() || null,
      gear: this.gear?.exportSnapshot?.() || null,
      events: this.events?.exportSnapshot?.() || null,
      companionEvo: this.companionEvo?.exportSnapshot?.() || null,
      trials: this.trials?.exportSnapshot?.() || null
    };
    return this.economy.saveToStorage(compSnap, metaSnap);
  }

  resetEndlessRun() {
    this._clearSynergyFromEconomy();
    this.gear?.reset?.();
    this.events?.reset?.(1);
    this.companionEvo?.reset?.();
    this.trials?.reset?.();
    this._trialSpawnTimer = 0;
    this._trialBossPrevHp = 0;
    this._trialHordeWaveIdx = 0;
    if (this.ascension || this.gear || this.events || this.companionEvo) {
      this._syncExternalModifiers(null, { preserveBase: true });
    }
    this.economy.resetRunState({ keepMeta: true });
    this.companions.reset();
    this.stage = 1;
    this.bestStage = Math.max(1, this.economy.bestStage || 1);
    this.waveInStage = 1;
    this.isBossEncounter = false;
    this.bossFarmMode = false;
    this.bossTimer = 0;
    this.bossEntity?.releaseGrabbedTarget?.();
    this.bossEntity = null;
    this._bossPortalActive = false;
    this._waveAdvancePending = false;
    this._farmWaveCount = 0;
    this._clearTransientWorldState({
      clearTrials: true,
      resetSpawnTimers: true,
      clearOfflineLoot: true,
      resetPlayerState: true,
      resetStreaks: true
    });

    this._activeSynergyMods = null;
    this._baseExternalModifiers = {};
    this._lastWrittenSynergyExt = null;
    if (this.ascension || this.gear || this.events || this.companionEvo) {
      this._syncExternalModifiers(null, { preserveBase: true });
    }

    this.economy.stage = 1;
    this.economy.waveInStage = 1;
    this.events?.ensureActiveBounty?.(1, this.economy);
    const realm = this.getCurrentRealm();
    this.zoneIndex = realm.realmIndex;

    this.corridorOriginX = 240;
    this.corridorMinX = 60;
    this.corridorMaxX = this.corridorOriginX + ENDLESS_CORRIDOR_WIDTH - 180;
    this.lockMinX = this.corridorMinX;
    this.lockMaxX = this.corridorMaxX;
    this.lockActive = true;

    const player = this.game?.leftFighter;
    if (player) {
      this.progression.resetForRun();
      this.progression.syncMaxHpWithEconomy(player);
      player.hp = player.maxHp;
      player.isDead = false;
      player.x = this.corridorOriginX;
      player.groundY = this.depthMidY;
      player.y = this.depthMidY;
      player.facing = 1;
      player.setState('IDLE');
      this.game.fighters = [player];
      this.companions.syncEntitiesWithWorld(player);
    }

    if (this.game?.renderer) {
      this.game.renderer.worldWidth = this.getWorldWidth();
      this.game.renderer.stageId = realm.stageId;
      this.game.renderer.adventureCamMinX = Math.max(0, this.corridorMinX - 60);
      this.game.renderer.adventureCamMaxX = this.corridorMaxX + 180;
      this.game.renderer.camX = this.corridorOriginX + 240;
    }

    if (!this.game?.isLandingOpen && !this.game?.simMode) {
      this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
    }

    this._spawnWaveMonsters();
    this.showBanner('CRUSADE RESET', 'STAGE 1 • ECLIPSE SANCTUM', '#38bdf8', 2.2);
    this.saveNow();
    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return true;
  }

  // =========================================================================
  // WAVE 3: ASTRAL ASCENSION PRESTIGE & OFFLINE LOOT ACTIONS
  // =========================================================================

  performAscension() {
    if (!this.ascension || typeof this.ascension.performAscension !== 'function') {
      return { ok: false, reason: 'no_ascension' };
    }
    const wasInTrial = Boolean(this.trials?.isActive?.());
    const savedMain = wasInTrial ? this.trials.activeTrial?.savedMainState : null;
    const effStage =
      savedMain && Number.isFinite(savedMain.stage)
        ? Math.max(1, Math.floor(savedMain.stage))
        : this.stage;
    const effBest = Math.max(
      this.economy.bestStage || 1,
      this.bestStage,
      savedMain && Number.isFinite(savedMain.bestStage) ? Math.floor(savedMain.bestStage) : 1
    );
    const effWave =
      savedMain && Number.isFinite(savedMain.waveInStage)
        ? Math.max(1, Math.min(this.wavesPerStage, Math.floor(savedMain.waveInStage)))
        : this.waveInStage;

    this.economy.stage = effStage;
    this.economy.bestStage = effBest;
    this.economy.waveInStage = effWave;

    if (typeof this.ascension.canAscend === 'function' && !this.ascension.canAscend(effStage)) {
      return this.ascension.performAscension(this.economy, this.companions) || { ok: false };
    }

    // Cancel any active Trial cleanly first while preserving bestScores & totalTrialsCompleted across Ascension
    if (wasInTrial) {
      this.trials.activeTrial = null;
      this.trials.lastResult = null;
      this._trialSpawnTimer = 0;
      this._trialBossPrevHp = 0;
      this._trialHordeWaveIdx = 0;
      this.stage = effStage;
      this.bestStage = effBest;
      this.waveInStage = effWave;
    }

    const res = this.ascension.performAscension(this.economy, this.companions);
    if (!res?.ok) {
      return res || { ok: false };
    }

    // Auto-collect any uncollected world loot beams & unopened main-stage milestone chests
    // BEFORE clearing so permanent Stage 5n Astral Shards & Gear are never lost!
    if (this.lootBeams.length > 0) {
      this._collectAllLootBeamsSilent();
    }
    if (!wasInTrial && this.treasureChests.length > 0) {
      this._autoOpenUnopenedChests({ creditGold: false });
    }

    this._despawnAllMonsters();
    this.stage = 1;
    this.bestStage = Math.max(1, this.bestStage, this.economy.bestStage || 1);
    this.waveInStage = 1;
    this.isBossEncounter = false;
    this.bossFarmMode = false;
    this.bossTimer = 0;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this._bossPortalActive = false;
    this._waveAdvancePending = false;
    this._waveSpawnDelay = 0;
    this._farmWaveCount = 0;
    this.manualTargetLock = false;
    this.lockedMonster = null;

    this._clearTransientWorldState({
      clearTrials: true,
      resetSpawnTimers: true,
      clearOfflineLoot: false,
      resetPlayerState: true,
      resetStreaks: true
    });
    if (this.companionEvo) {
      this.companionEvo.overdriveCharge = 0;
      this.companionEvo.overdriveActiveTimer = 0;
    }

    // Reset transient run events (Stage 10+ Shrine buffs & Stage 10 Bounty) cleanly onto Stage 1
    if (this.events) {
      if (typeof this.events.resetRunEvents === 'function') {
        this.events.resetRunEvents(1, this.economy);
      } else {
        this.events.activeBuffs = [];
        this.events.activeMerchantOffer = null;
        this.events.activeBounty = null;
        this.events.ensureActiveBounty?.(1, this.economy);
      }
    }

    this._activeSynergyMods = null;
    this._lastWrittenSynergyExt = null;
    this._syncExternalModifiers(null, { preserveBase: true });

    this.economy.stage = 1;
    this.economy.bestStage = Math.max(this.economy.bestStage || 1, this.bestStage);
    this.economy.waveInStage = 1;
    this.events?.ensureActiveBounty?.(this.stage, this.economy);

    const realm = this.getCurrentRealm();
    this.zoneIndex = realm.realmIndex;
    this._prewarmRealmAssets(this.zoneIndex);

    this.corridorOriginX = 240;
    this.corridorMinX = 60;
    this.corridorMaxX = this.corridorOriginX + ENDLESS_CORRIDOR_WIDTH - 180;
    this.lockMinX = this.corridorMinX;
    this.lockMaxX = this.corridorMaxX;
    this.lockActive = true;

    const player = this.game?.leftFighter;
    if (player) {
      this.progression.resetForRun();
      this.progression.syncMaxHpWithEconomy(player);
      player.hp = player.maxHp;
      player.isDead = false;
      player.x = this.corridorOriginX;
      player.groundY = this.depthMidY;
      player.y = this.depthMidY;
      player.facing = 1;
      player.setState('IDLE');
      this.game.fighters = [player];
      this.companions.syncEntitiesWithWorld(player);
      this._lastCompanionSyncSig = this._computeCompanionSyncSig();
    }

    if (this.game?.renderer) {
      this.game.renderer.worldWidth = this.getWorldWidth();
      this.game.renderer.stageId = realm.stageId;
      this.game.renderer.permanentStageOverride = null;
      this.game.renderer.trueUltStageOverride = null;
      this.game.renderer.adventureCamMinX = Math.max(0, this.corridorMinX - 60);
      this.game.renderer.adventureCamMaxX = this.corridorMaxX + 180;
      this.game.renderer.camX = this.corridorOriginX + 240;
      this.game.renderer.triggerShake?.(10, 0.34);
    }

    if (!this.game?.isLandingOpen && !this.game?.simMode) {
      this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
    }

    if (this.active) {
      this._spawnWaveMonsters();
    }

    const shardsGained = Math.max(0, Math.floor(Number(res.shardsGained) || 0));
    const totalAsc = Math.max(1, Math.floor(Number(res.totalAscensions ?? this.ascension.totalAscensions) || 1));
    this.showBanner(
      `ASCENDED! +${shardsGained} SHARDS`,
      `ASCENSION #${totalAsc} • STAGE 1 • PERMANENT POWER BOOSTED!`,
      '#facc15',
      3.2
    );
    const fxX = player?.x ?? this.corridorOriginX;
    const fxY = player?.groundY ?? this.depthMidY;
    this._spawnWave4Burst(fxX, fxY - 64, 'ascension', 2.05);
    this.spawnFloatingCallout(fxX, fxY - 155, `ASCENDED! +${shardsGained} SHARDS`, '#facc15', 2, 1.55, {
      kind: 'shard'
    });
    if (this.game?.vfx) {
      this.game.vfx.spawnShockwave(fxX, fxY - 14, 240, '#facc15', 0.44, true);
      this.game.vfx.spawnBurst(fxX, fxY - 64, 26, '#c084fc', 240, { upBias: 165, size: 6 });
    }
    this.game?.audio?.play?.('victory_fanfare', fxX);

    this.saveNow();
    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return res;
  }

  buyEternalArtifact(artifactId) {
    if (!this.ascension || typeof this.ascension.buyArtifact !== 'function') {
      return { ok: false, reason: 'no_ascension' };
    }
    const res = this.ascension.buyArtifact(artifactId, this.economy);
    if (res?.ok) {
      const synMods = this.companions?.getPartySynergyModifiers?.() || null;
      this._syncExternalModifiers(synMods, { preserveBase: true });
      const player = this.game?.leftFighter;
      if (player) {
        this.progression.syncMaxHpWithEconomy(player);
      }
      this.game?.audio?.play?.('holy_hit', player?.x || 600);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return res || { ok: false };
  }

  claimOfflineLoot() {
    if (!this.pendingOfflineLoot) {
      return { ok: false, gold: 0, astralShards: 0 };
    }
    const loot = this.pendingOfflineLoot;
    this.pendingOfflineLoot = null;

    const goldAmt = safeBoundedInt(loot.gold, 0, ENDLESS_MAX_STAT, 0);
    const shardAmt = safeBoundedInt(loot.astralShards, 0, 1e9, 0);
    if (goldAmt > 0) {
      this.economy.addGold(goldAmt, { isBoss: false, applyMult: false });
    }
    if (shardAmt > 0) {
      this.economy.addAstralShards(shardAmt);
    }

    const player = this.game?.leftFighter;
    const px = player?.x ?? this.corridorOriginX;
    const pGy = player?.groundY ?? this.depthMidY;
    const parts = [];
    if (goldAmt > 0) parts.push(`+${formatEndlessNumber(goldAmt)} GOLD`);
    if (shardAmt > 0) parts.push(`+${shardAmt} ASTRAL SHARD${shardAmt === 1 ? '' : 'S'}`);
    this.showBanner(
      'OFFLINE LOOT CLAIMED!',
      parts.length > 0 ? parts.join(' • ') : 'WELCOME BACK, CRUSADER!',
      '#facc15',
      2.8
    );
    if (goldAmt > 0) {
      this.spawnFloatingCallout(px, pGy - 146, `+${formatEndlessNumber(goldAmt)} G`, '#fde047', 2, 1.35, {
        kind: 'gold'
      });
    }
    if (shardAmt > 0) {
      this._spawnAstralShardVisuals(px, pGy, Math.min(6, shardAmt));
    }
    this.game?.audio?.play?.('victory_fanfare', px);
    this.saveNow();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return { ok: true, gold: goldAmt, astralShards: shardAmt };
  }

  dismissOfflineLoot() {
    this.pendingOfflineLoot = null;
    this.offlineLootModal = null;
    this.saveNow();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return true;
  }

  // =========================================================================
  // WAVE 10: REPLAYABLE CHALLENGE TRIAL PORTALS
  // =========================================================================

  _clearEnemyProjectiles() {
    const projs = this.game?.vfx?.projectiles;
    if (!Array.isArray(projs) || projs.length === 0) return;
    const player = this.game?.leftFighter;
    for (let i = 0; i < projs.length; i++) {
      const p = projs[i];
      if (!p) continue;
      if (p.owner && p.owner !== player && !p.owner.isEndlessCompanion) {
        p.dead = true;
      }
    }
  }

  _repositionCompanionsNearHero(player) {
    if (!player) return;
    this.companions?.syncEntitiesWithWorld?.(player);
    this._lastCompanionSyncSig = this._computeCompanionSyncSig();
    const ents = this.companions?.entities;
    if (!Array.isArray(ents) || ents.length === 0) return;
    const px = Number.isFinite(player.x) ? player.x : this.corridorOriginX;
    const pGy = Number.isFinite(player.groundY) ? player.groundY : this.depthMidY;
    for (let i = 0; i < ents.length; i++) {
      const ent = ents[i];
      if (!ent) continue;
      if (!Number.isFinite(ent.x) || Math.abs(ent.x - px) > 420) {
        const offset = (i + 1) * 58;
        ent.x = Math.max(this.lockMinX + 24, Math.min(this.lockMaxX - 24, px - offset));
        ent.groundY = Math.max(this.depthMinY + 24, Math.min(this.depthMaxY - 24, pGy + (i - 1) * 28));
        ent.y = ent.groundY;
      }
    }
  }

  _restoreSavedMainState(savedMain, { respawnWave = true, restoreRenderer = true } = {}) {
    if (savedMain && typeof savedMain === 'object') {
      if (Number.isFinite(savedMain.stage)) {
        this.stage = Math.max(1, Math.floor(savedMain.stage));
      }
      if (Number.isFinite(savedMain.bestStage)) {
        this.bestStage = Math.max(this.stage, this.bestStage, Math.floor(savedMain.bestStage));
      }
      if (Number.isFinite(savedMain.waveInStage)) {
        this.waveInStage = Math.max(1, Math.min(this.wavesPerStage, Math.floor(savedMain.waveInStage)));
      }
      this.bossFarmMode = Boolean(savedMain.bossFarmMode);
      if (Number.isFinite(savedMain.bossTimerMax) && savedMain.bossTimerMax > 0) {
        this.bossTimerMax = savedMain.bossTimerMax;
      }
      if (Number.isFinite(savedMain.corridorOriginX)) {
        this.corridorOriginX = savedMain.corridorOriginX;
      }
      if (Number.isFinite(savedMain.corridorMinX)) {
        this.corridorMinX = savedMain.corridorMinX;
      }
      if (Number.isFinite(savedMain.corridorMaxX)) {
        this.corridorMaxX = savedMain.corridorMaxX;
      }
      if (Number.isFinite(savedMain.lockMinX)) {
        this.lockMinX = savedMain.lockMinX;
      }
      if (Number.isFinite(savedMain.lockMaxX)) {
        this.lockMaxX = savedMain.lockMaxX;
      }
      if (Number.isFinite(savedMain.zoneIndex)) {
        this.zoneIndex = savedMain.zoneIndex;
      }
    }

    this.isBossEncounter = false;
    this.bossEntity = null;
    this.bossTimer = 0;
    this._bossPortalActive = false;
    this._waveAdvancePending = false;
    this._waveAdvanceElapsed = 0;
    this._waveSpawnDelay = 0;
    this.lockActive = true;

    const realm = this.getCurrentRealm();
    if (!savedMain || !Number.isFinite(savedMain.zoneIndex)) {
      this.zoneIndex = realm.realmIndex;
    }

    this.economy.stage = this.stage;
    this.economy.bestStage = Math.max(this.economy.bestStage || 1, this.bestStage);
    this.economy.waveInStage = this.waveInStage;

    this._syncExternalModifiers(undefined, { preserveBase: true });

    const player = this.game?.leftFighter;
    if (player) {
      this.progression.syncMaxHpWithEconomy(player);
      player.isDead = false;
      player.hurtTimer = 0;
      player.stunTimer = 0;
      player.isRooted = false;
      player._grabbedByBoss = false;
      player._grabbedByBossTimer = 0;
      player.vx = 0;
      player.vy = 0;
      if (savedMain && Number.isFinite(savedMain.playerX)) {
        player.x = Math.max(this.lockMinX, Math.min(this.lockMaxX, savedMain.playerX));
      }
      if (savedMain && Number.isFinite(savedMain.playerGroundY)) {
        const gy = Math.max(this.depthMinY, Math.min(this.depthMaxY, savedMain.playerGroundY));
        player.groundY = gy;
        player.y = gy;
      }
      const savedHp = savedMain && Number.isFinite(savedMain.playerHp) ? savedMain.playerHp : player.maxHp;
      player.hp = Math.min(player.maxHp, Math.max(1, savedHp));
      if (typeof player.setState === 'function') {
        player.setState('IDLE');
      }
      this._repositionCompanionsNearHero(player);
    }

    if (restoreRenderer && this.game?.renderer) {
      const renderer = this.game.renderer;
      renderer.worldWidth = this.getWorldWidth();
      if (!renderer.permanentStageOverride) {
        renderer.stageId = realm.stageId;
      }
      renderer.adventureCamMinX = Math.max(0, this.lockMinX - 60);
      renderer.adventureCamMaxX = this.lockMaxX + 180;
      renderer.camX = Math.round(
        Math.max(
          renderer.adventureCamMinX,
          Math.min(renderer.adventureCamMaxX, (player?.x ?? this.corridorOriginX) + 180)
        )
      );
    }

    if (respawnWave && this.active) {
      const restoreBoss = Boolean(savedMain?.isBossEncounter);
      if (restoreBoss) {
        this.startBossEncounter();
        if (Number.isFinite(savedMain.bossTimerMax) && savedMain.bossTimerMax > 0) {
          this.bossTimerMax = savedMain.bossTimerMax;
        }
        if (Number.isFinite(savedMain.bossTimer) && savedMain.bossTimer > 0) {
          this.bossTimer = Math.min(this.bossTimerMax, Math.max(1, savedMain.bossTimer));
        }
        if (savedMain && typeof savedMain === 'object') {
          if (Number.isFinite(savedMain.corridorMinX)) this.corridorMinX = savedMain.corridorMinX;
          if (Number.isFinite(savedMain.corridorMaxX)) this.corridorMaxX = savedMain.corridorMaxX;
          if (Number.isFinite(savedMain.lockMinX)) this.lockMinX = savedMain.lockMinX;
          if (Number.isFinite(savedMain.lockMaxX)) this.lockMaxX = savedMain.lockMaxX;
        }
        if (player) {
          const bBounds = this.getActiveStageBounds();
          if (Number.isFinite(savedMain.playerX)) {
            player.x = Math.max(bBounds.minX, Math.min(bBounds.maxX, savedMain.playerX));
          }
          if (Number.isFinite(savedMain.playerGroundY)) {
            const gy = Math.max(this.depthMinY, Math.min(this.depthMaxY, savedMain.playerGroundY));
            player.groundY = gy;
            player.y = gy;
          }
          if (Number.isFinite(savedMain.playerHp)) {
            player.hp = Math.min(player.maxHp, Math.max(1, savedMain.playerHp));
          }
          this._repositionCompanionsNearHero(player);
        }
      } else {
        this._spawnWaveMonsters();
        if (savedMain && typeof savedMain === 'object') {
          if (Number.isFinite(savedMain.corridorMinX)) this.corridorMinX = savedMain.corridorMinX;
          if (Number.isFinite(savedMain.corridorMaxX)) this.corridorMaxX = savedMain.corridorMaxX;
          if (Number.isFinite(savedMain.lockMinX)) this.lockMinX = savedMain.lockMinX;
          if (Number.isFinite(savedMain.lockMaxX)) this.lockMaxX = savedMain.lockMaxX;
        }
      }
    }
  }

  _getNearestLivingGoblin(player) {
    if (!this.treasureGoblins.length) return null;
    let best = null;
    let bestDist = Infinity;
    const px = Number.isFinite(player?.x) ? player.x : this.corridorOriginX;
    const pGy = Number.isFinite(player?.groundY) ? player.groundY : this.depthMidY;
    for (let i = 0; i < this.treasureGoblins.length; i++) {
      const g = this.treasureGoblins[i];
      if (!g || g.isDead) continue;
      const d = Math.hypot(g.x - px, (g.groundY - pGy) * 1.4);
      if (d < bestDist) {
        bestDist = d;
        best = g;
      }
    }
    return best;
  }

  _getNearestUnopenedChest(player) {
    if (!this.treasureChests.length) return null;
    let best = null;
    let bestDist = Infinity;
    const px = Number.isFinite(player?.x) ? player.x : this.corridorOriginX;
    const pGy = Number.isFinite(player?.groundY) ? player.groundY : this.depthMidY;
    for (let i = 0; i < this.treasureChests.length; i++) {
      const ch = this.treasureChests[i];
      if (!ch || ch.opened || ch.isDead) continue;
      const d = Math.hypot(ch.x - px, (ch.groundY - pGy) * 1.4);
      if (d < bestDist) {
        bestDist = d;
        best = ch;
      }
    }
    return best;
  }

  _spawnTrialHordePack(targetCount = TRIAL_ABYSSAL_HORDE_MIN_LIVING) {
    const currentLiving = this.getLivingMonsters().length;
    const needed = Math.max(0, Math.min(10, targetCount - currentLiving));
    if (needed <= 0) return 0;

    const curRealm = this.getCurrentRealm();
    const nextIdx = (curRealm.realmIndex + 1) % ENDLESS_REALMS.length;
    const nextRealm = ENDLESS_REALMS[nextIdx] || curRealm;
    this._prewarmRealmAssets(nextIdx);

    const kindPool = [
      ...(Array.isArray(curRealm.monsters) ? curRealm.monsters : ['templar']),
      ...(Array.isArray(nextRealm.monsters) ? nextRealm.monsters : ['ghoul'])
    ];
    const lanes = [476, 518, 561, 604, 646];
    const minX = (this.lockMinX || this.corridorMinX || 60) + 100;
    const maxX = Math.max(minX + 200, (this.lockMaxX || this.corridorMaxX || 1480) - 100);
    const span = Math.max(180, maxX - minX);
    const playerX = Number.isFinite(this.game?.leftFighter?.x)
      ? this.game.leftFighter.x
      : (minX + maxX) * 0.5;

    for (let i = 0; i < needed; i++) {
      this._trialHordeWaveIdx = (this._trialHordeWaveIdx || 0) + 1;
      const kind = kindPool[(this._trialHordeWaveIdx + i) % kindPool.length] || 'templar';
      const frac = needed > 1 ? i / (needed - 1) : 0.5;
      let sx = Math.round(minX + frac * span + (Math.random() * 64 - 32));
      if (Math.abs(sx - playerX) < 110) {
        sx = sx >= playerX ? playerX + 125 : playerX - 125;
      }
      sx = Math.max(minX, Math.min(maxX, Math.round(sx)));
      const gy = lanes[(this._trialHordeWaveIdx + i) % lanes.length];
      const isElite = this._trialHordeWaveIdx % 4 === 0;
      this._spawnEndlessMonster(kind, sx, { groundY: gy, isElite });
    }
    return needed;
  }

  enterTrial(trialId, opts = {}) {
    if (!this.active) {
      return { ok: false, reason: 'inactive' };
    }
    if (!this.trials || typeof this.trials.startTrial !== 'function') {
      return { ok: false, reason: 'no_trials' };
    }
    if (this.trials.isActive?.()) {
      return { ok: false, reason: 'already_active' };
    }
    const trialDef =
      ENDLESS_TRIAL_BY_ID?.[trialId] ||
      (Array.isArray(ENDLESS_TRIAL_DEFS) ? ENDLESS_TRIAL_DEFS.find((d) => d?.id === trialId) : null) ||
      null;
    if (!trialDef) {
      return { ok: false, reason: 'invalid_trial' };
    }
    const ignoreCooldown = Boolean(opts?.ignoreCooldown);
    if (!ignoreCooldown && typeof this.trials.canEnter === 'function') {
      const check = this.trials.canEnter(trialId);
      if (check && !check.ok) {
        return check;
      }
    }

    // Auto-collect ground loot beams, unopened milestone chests & coins silently BEFORE entering so zero main-stage loot/shards/gear is lost
    if (this.lootBeams.length > 0) {
      this._collectAllLootBeamsSilent();
    }
    if (this.treasureChests.length > 0) {
      this._autoOpenUnopenedChests({ creditGold: true });
    }
    if (this.coins.length > 0) {
      this._scoopAllCoinsInstant();
    }

    const player = this.game?.leftFighter || null;
    const savedMainState = {
      stage: this.stage,
      bestStage: this.bestStage,
      waveInStage: this.waveInStage,
      isBossEncounter: this.isBossEncounter,
      wasColossalBoss: Boolean(this.bossEntity?.isColossalBoss),
      bossFarmMode: this.bossFarmMode,
      bossTimer: this.bossTimer,
      bossTimerMax: this.bossTimerMax,
      corridorOriginX: this.corridorOriginX,
      corridorMinX: this.corridorMinX,
      corridorMaxX: this.corridorMaxX,
      lockMinX: this.lockMinX,
      lockMaxX: this.lockMaxX,
      zoneIndex: this.zoneIndex,
      playerHp: player?.hp,
      playerMaxHp: player?.maxHp,
      playerX: player?.x,
      playerGroundY: player?.groundY
    };

    const startRes = this.trials.startTrial(trialId, savedMainState, {
      stage: this.stage,
      ignoreCooldown
    });
    if (!startRes?.ok) {
      return startRes || { ok: false, reason: 'start_failed' };
    }
    const trial = startRes.trial || this.trials.activeTrial;

    // Despawn current stage entities & transient world FX cleanly without altering this.stage / this.waveInStage
    this._despawnAllMonsters();
    this.isBossEncounter = false;
    this.bossEntity = null;
    this.bossTimer = 0;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this._bossPortalActive = false;
    this._waveAdvancePending = false;
    this._waveAdvanceElapsed = 0;
    this._waveSpawnDelay = 0;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this._clearTransientWorldState({
      clearTrials: false,
      resetSpawnTimers: false,
      clearOfflineLoot: false,
      resetPlayerState: true,
      resetStreaks: false
    });

    this.lockActive = true;
    this._syncCorridorBounds({ lockToCorridor: true, syncCamera: true });

    // Position hero cleanly in Trial arena at full HP & close shop drawer
    if (player) {
      this.progression.syncMaxHpWithEconomy(player);
      player.hp = player.maxHp;
      player.isDead = false;
      player.hurtTimer = 0;
      player.stunTimer = 0;
      player.isRooted = false;
      player._grabbedByBoss = false;
      player._grabbedByBossTimer = 0;
      player.vx = 0;
      player.vy = 0;
      const arenaHeroX =
        trialId === 'malphas_gauntlet'
          ? Math.max(this.lockMinX + 120, Math.round(this.lockMinX + 260))
          : Math.round((this.lockMinX + this.lockMaxX) * 0.5 - 120);
      player.x = Math.max(this.lockMinX + 40, Math.min(this.lockMaxX - 240, arenaHeroX));
      player.groundY = this.depthMidY;
      player.y = this.depthMidY;
      player.facing = 1;
      if (typeof player.setState === 'function') {
        player.setState('IDLE');
      }
      this._repositionCompanionsNearHero(player);
    }

    this.shopUI?.setDrawerOpen?.(false);
    this._trialSpawnTimer = 0;
    this._trialBossPrevHp = 0;
    this._trialHordeWaveIdx = 0;

    // Spawn the Trial's encounter
    const durSec = Math.round(trial?.durationSec || trialDef.durationSec || 30);
    let bannerSub = `${durSec}S CHALLENGE ACTIVE!`;

    if (trialId === 'gold_vault') {
      const midX = Math.round((this.lockMinX + this.lockMaxX) * 0.5);
      this.spawnTreasureGoblin(Math.round(this.lockMinX + 220));
      this.spawnTreasureGoblin(Math.round(this.lockMaxX - 220));
      this.spawnStageTreasureChest(midX + 110, this.depthMidY, this.stage);
      if (!this.game?.isLandingOpen && !this.game?.simMode) {
        this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
      }
      bannerSub = `${durSec}S • SMITE GOBLINS & CHESTS FOR JACKPOT GOLD!`;
    } else if (trialId === 'malphas_gauntlet') {
      PixelForge.ensureHeroLoaded?.('archfiend');
      const bossX = Math.round(this.lockMaxX - 180);
      this._bossPortalX = bossX;
      this._bossPortalActive = true;
      // Keep isBossEncounter = false during Trials so Top Boss Raid HUD never collides with Active Trial HUD!
      this.isBossEncounter = false;
      this.bossTimerMax = trial?.durationSec || trialDef.durationSec || 45;
      this.bossTimer = this.bossTimerMax;
      const bossDmgMult = safeBoundedFloat(
        0.52 * Math.pow(1.12, Math.min(300, Math.max(0, this.stage - 1))),
        0.1,
        ENDLESS_MAX_DMG_SCALE,
        0.52
      );
      const boss = this._spawnEndlessMonster('archfiend', bossX, {
        groundY: this.depthMidY,
        name: 'BEHEMOTH MALPHAS',
        maxHp: TRIAL_MALPHAS_MAX_HP,
        dmgScale: bossDmgMult,
        bossDmgMult,
        soulTitheBaseCd: 9999,
        skipPortal: true,
        isEndlessStageBoss: true
      });
      if (boss) {
        boss.maxHp = TRIAL_MALPHAS_MAX_HP;
        boss.hp = TRIAL_MALPHAS_MAX_HP;
        boss.isTrialBoss = true;
        // Suppress ABYSSAL SIEGE GRAB & HELLPIT SOUL-TITHE on the 45s pure DPS dummy boss!
        boss.soulTitheBaseCd = 9999;
        boss.soulTitheCooldown = 9999;
        boss.soulTitheWindupTimer = 0;
        boss.triggerUnavoidableSoulTithe = () => 0;
        const origNeutralAI =
          typeof boss.runMonsterNeutralAI === 'function' ? boss.runMonsterNeutralAI.bind(boss) : null;
        if (origNeutralAI) {
          boss.runMonsterNeutralAI = (aiDt, aiEnemy, aiGame) => {
            if ((boss.skillCooldown || 0) <= 0 && boss.skillVariant === 1) {
              boss.skillVariant = 2;
            }
            return origNeutralAI(aiDt, aiEnemy, aiGame);
          };
        }
        this.bossEntity = boss;
        this._trialBossPrevHp = boss.maxHp;
      }
      if (!this.game?.isLandingOpen && !this.game?.simMode) {
        this.game?.audio?.playBgm?.('bgm_boss_malphas');
      }
      bannerSub = `${durSec}S PURE DPS CHECK • SHARDS & MYTHIC DUST!`;
    } else if (trialId === 'abyssal_horde') {
      this._spawnTrialHordePack(TRIAL_ABYSSAL_HORDE_MIN_LIVING);
      if (!this.game?.isLandingOpen && !this.game?.simMode) {
        this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
      }
      bannerSub = `${durSec}S SWARM SURVIVAL • GUARANTEED HEROIC+ GEAR!`;
    }

    this.totalWaveLabel = `TRIAL • ${trialDef.shortName || trialDef.name}`;
    this.showBanner(`${trialDef.name}!`, bannerSub, trialDef.accentHex || '#facc15', 2.6);

    const sfxX = player?.x ?? this.corridorOriginX;
    if (!this.game?.isLandingOpen) {
      this.game?.audio?.play?.('eclipse_charge', sfxX);
      this.game?.audio?.play?.('thunder_slam', sfxX);
    }
    this.game?.renderer?.triggerShake?.(8, 0.30);

    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return { ok: true, trial };
  }

  exitTrial({ completedFull = false } = {}) {
    if (!this.trials?.isActive?.()) {
      return { ok: false, reason: 'no_active_trial' };
    }

    const wasMalphas = this.trials.activeTrial?.id === 'malphas_gauntlet';

    // Flush current frame's malphas_gauntlet boss damage delta BEFORE despawning monsters!
    if (wasMalphas && this.bossEntity) {
      const curHp = Number.isFinite(this.bossEntity.hp) ? Math.max(0, this.bossEntity.hp) : 0;
      const prevHp = Number.isFinite(this._trialBossPrevHp) ? this._trialBossPrevHp : this.bossEntity.maxHp;
      const delta = prevHp - curHp;
      if (delta > 0) {
        this.trials.recordTrialBossDamage(delta, this.stage);
      }
      this._trialBossPrevHp = curHp;
    }

    // Auto-collect remaining trial coins & loot beams BEFORE finalizing rewards
    if (this.coins.length > 0) {
      this._scoopAllCoinsInstant();
    }
    if (this.lootBeams.length > 0) {
      this._collectAllLootBeamsSilent();
    }

    // Despawn Trial monsters/boss/goblins/chests & transient FX cleanly
    this._despawnAllMonsters();
    this.isBossEncounter = false;
    this.bossEntity = null;
    this.bossTimer = 0;
    this._bossPortalActive = false;
    this._waveAdvancePending = false;
    this._waveAdvanceElapsed = 0;
    this._waveSpawnDelay = 0;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this._trialSpawnTimer = 0;
    this._trialBossPrevHp = 0;
    this._trialHordeWaveIdx = 0;
    this._clearTransientWorldState({
      clearTrials: false,
      resetSpawnTimers: false,
      clearOfflineLoot: false,
      resetPlayerState: true,
      resetStreaks: false
    });

    const done = this.trials.completeTrial(this.economy, this.gear, {
      completedFull: Boolean(completedFull)
    });
    const savedMain = done?.savedMainState || null;

    this._restoreSavedMainState(savedMain, {
      respawnWave: true,
      restoreRenderer: true
    });

    if (!this.game?.isLandingOpen && !this.game?.simMode) {
      const nextBgm =
        this.isBossEncounter && this.bossEntity?.isColossalBoss
          ? 'bgm_boss_malphas'
          : 'bgm_adventure_pilgrimage';
      this.game?.audio?.playBgm?.(nextBgm);
    }

    this.saveNow();
    const player = this.game?.leftFighter;
    this.game?.audio?.play?.('victory_fanfare', player?.x ?? this.corridorOriginX);
    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return done;
  }

  dismissTrialResult() {
    this.trialResult = null;
    this.trials?.dismissResult?.();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return true;
  }

  _updateActiveTrial(dt, _player) {
    const active = this.trials?.activeTrial;
    if (!active) return;

    if (active.id === 'gold_vault') {
      this._trialSpawnTimer += dt;
      if (this._trialSpawnTimer >= TRIAL_GOLD_VAULT_REFILL_SEC) {
        this._trialSpawnTimer = 0;
        const minX = Math.max(84, (this.lockMinX || this.corridorMinX || 60) + 96);
        const maxX = Math.max(minX + 180, (this.lockMaxX || this.corridorMaxX || 1480) - 96);
        const span = Math.max(120, maxX - minX);
        let guard = 0;
        while (this.treasureGoblins.length < 2 && guard < 4) {
          guard++;
          const gx = Math.round(minX + Math.random() * span);
          this.spawnTreasureGoblin(gx);
        }
        guard = 0;
        while (this.treasureChests.length < 2 && guard < 4) {
          guard++;
          const cx = Math.round(minX + 80 + Math.random() * Math.max(80, span - 160));
          const lanePool = [492, 561, 622];
          const cy = lanePool[(this._encounterSeq + guard) % lanePool.length];
          this.spawnStageTreasureChest(cx, cy, this.stage);
        }
      }
      return;
    }

    if (active.id === 'malphas_gauntlet') {
      const boss = this.bossEntity;
      if (boss) {
        // Keep DPS dummy boss free of stun-lock grab & soul-tithe attrition
        boss.soulTitheCooldown = 9999;
        boss.soulTitheWindupTimer = 0;
        if (boss.grabbedTarget || boss.bossAction === 'claw_grab') {
          boss.releaseGrabbedTarget?.();
        }
        const curHp = Number.isFinite(boss.hp) ? Math.max(0, boss.hp) : 0;
        const prevHp = Number.isFinite(this._trialBossPrevHp) ? this._trialBossPrevHp : boss.maxHp;
        const delta = prevHp - curHp;
        if (delta > 0) {
          const dmgRes = this.trials.recordTrialBossDamage(delta, this.stage);
          if (dmgRes?.tierUp) {
            const bx = (Number.isFinite(boss.anchorX) ? boss.anchorX : boss.x) - 105;
            const bGy = boss.anchorGroundY || boss.groundY || this.depthMidY;
            this.spawnFloatingCallout(
              bx,
              bGy - 190,
              `TIER ${dmgRes.tierReached}!`,
              '#f43f5e',
              2,
              1.35,
              { kind: 'fever', topColor: '#fef08a' }
            );
            this.game?.audio?.play?.('holy_hit', bx);
            this.game?.renderer?.triggerShake?.(6, 0.22);
          }
        }
        if (boss.isDead || curHp < boss.maxHp * 0.5) {
          boss.isDead = false;
          boss._endlessDeathHandled = false;
          boss.hp = boss.maxHp;
        }
        this._trialBossPrevHp = boss.hp;
      }
      return;
    }

    if (active.id === 'abyssal_horde') {
      this._trialSpawnTimer += dt;
      const livingCount = this.getLivingMonsters().length;
      if (
        this._trialSpawnTimer >= TRIAL_ABYSSAL_HORDE_REFILL_SEC ||
        (livingCount === 0 && this._trialSpawnTimer >= 0.35)
      ) {
        this._trialSpawnTimer = 0;
        if (livingCount < TRIAL_ABYSSAL_HORDE_MIN_LIVING) {
          this._spawnTrialHordePack(TRIAL_ABYSSAL_HORDE_TARGET_LIVING);
        }
      }
    }
  }

  // =========================================================================
  // SHOP & COMPANION ACTION HELPERS (CALLED BY UI OR DIRECTLY)
  // =========================================================================

  _spawnWave4Burst(x, groundY, kind = 'goblin', scale = 1.65) {
    while (this.wave4Bursts.length >= WAVE4_BURST_MAX_COUNT) {
      this.wave4Bursts.shift();
    }
    const safeX = Number.isFinite(x) ? Math.round(x) : Math.round(this.corridorOriginX || 240);
    const safeGy = Number.isFinite(groundY) ? Math.round(groundY) : this.depthMidY;
    this.wave4Bursts.push({
      x: safeX,
      groundY: safeGy,
      kind: kind === 'ascension' ? 'ascension' : 'goblin',
      age: 0,
      maxLife: kind === 'ascension' ? 0.62 : 0.48,
      scale: Number.isFinite(scale) && scale > 0 ? scale : 1.65
    });
  }

  buyRelic(relicId, bulkModeOverride = null) {
    if (!this.economy || typeof this.economy.buyRelic !== 'function') {
      return { ok: false, bought: 0, spent: 0, newLevel: 0 };
    }
    const res = this.economy.buyRelic(relicId, bulkModeOverride);
    if (res?.ok) {
      const player = this.game?.leftFighter;
      if (player) {
        this.progression.syncMaxHpWithEconomy(player);
        if (res.milestoneReached) {
          this.spawnFloatingCallout(
            player.x,
            (player.groundY || player.y) - 148,
            `MILESTONE ${res.milestoneReached.tag}!`,
            '#fde047',
            2,
            1.35,
            { kind: 'fever' }
          );
        }
        if (Array.isArray(res.setsUpgraded) && res.setsUpgraded.length > 0) {
          const upgradedSet = res.setsUpgraded[0];
          this.spawnFloatingCallout(
            player.x,
            (player.groundY || player.y) - 182,
            `${upgradedSet.name} ${upgradedSet.tierLabel}!`,
            upgradedSet.color || '#38bdf8',
            2,
            1.45,
            { kind: 'shard' }
          );
        }
      }
      this._markExternalModifiersDirty();
      const hitMilestoneOrSet = Boolean(
        res.milestoneReached || (Array.isArray(res.setsUpgraded) && res.setsUpgraded.length > 0)
      );
      this.game?.audio?.play?.(hitMilestoneOrSet ? 'victory_fanfare' : 'holy_hit', player?.x || 600);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return res;
  }

  setBulkMode(mode) {
    if (mode === 'x1' || mode === 'x10' || mode === 'MAX') {
      this.economy.bulkMode = mode;
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return this.economy.bulkMode;
  }

  recruitCompanion(id) {
    const res = this.companions?.recruit?.(id, this.economy);
    if (res?.ok) {
      const player = this.game?.leftFighter;
      if (player) this.companions.syncEntitiesWithWorld(player);
      this._lastCompanionSyncSig = this._computeCompanionSyncSig();
      const synMods = this.companions?.getPartySynergyModifiers?.() || null;
      this._applyPartySynergyToEconomy(synMods);
      if (player) this.progression.syncMaxHpWithEconomy(player);
      this.game?.audio?.play?.('holy_hit', player?.x || 600);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return res || { ok: false };
  }

  upgradeCompanion(id) {
    const res = this.companions?.upgrade?.(id, this.economy);
    if (res?.ok) {
      const player = this.game?.leftFighter;
      if (player) this.companions.syncEntitiesWithWorld(player);
      this._lastCompanionSyncSig = this._computeCompanionSyncSig();
      this._markExternalModifiersDirty();
      this.game?.audio?.play?.('clock_gear', player?.x || 600);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return res || { ok: false };
  }

  toggleCompanionDeploy(id) {
    const res = this.companions?.toggleDeploy?.(id);
    if (res?.ok) {
      const player = this.game?.leftFighter;
      if (player) this.companions.syncEntitiesWithWorld(player);
      this._lastCompanionSyncSig = this._computeCompanionSyncSig();
      const synMods = this.companions?.getPartySynergyModifiers?.() || null;
      this._applyPartySynergyToEconomy(synMods);
      if (player) this.progression.syncMaxHpWithEconomy(player);
      this.game?.audio?.play?.('clock_gear', player?.x || 600);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return res || { ok: false };
  }

  promoteCompanion(id) {
    if (!this.companionEvo || typeof this.companionEvo.promoteCompanion !== 'function') {
      return { ok: false, reason: 'no_companion_evo' };
    }
    const normId = this.companions?.normalizeId?.(id) || id;
    const rosterEntry = this.companions?.rosterState?.[normId];
    if (!rosterEntry || !rosterEntry.unlocked) {
      return { ok: false, reason: 'not_unlocked' };
    }
    const res = this.companionEvo.promoteCompanion(normId, this.economy, this.gear);
    if (res?.ok) {
      const player = this.game?.leftFighter;
      if (player) this.companions?.syncEntitiesWithWorld?.(player);
      this._lastCompanionSyncSig = this._computeCompanionSyncSig();
      this._syncExternalModifiers(undefined, { preserveBase: true });
      if (player) this.progression.syncMaxHpWithEconomy(player);
      const ent = this.companions?.entities?.find?.((e) => e.companionId === normId) || null;
      const fxX = ent?.x ?? player?.x ?? this.corridorOriginX;
      const fxY = ent?.groundY ?? player?.groundY ?? this.depthMidY;
      if (res.unlockedEx) {
        ent?.triggerAuraRing?.('buff', 1.65);
        ent?.triggerCallout?.('EX ASCENDED!', '#38bdf8', 1.5, true);
        this.spawnFloatingCallout(fxX, fxY - 155, 'EX EVOLVED!', '#38bdf8', 2, 1.45, { kind: 'shard' });
        this.showBanner(
          `${ent?.name || normId.toUpperCase()} EX EVOLVED!`,
          `${res.star}-STAR SOVEREIGN FORM UNLOCKED!`,
          '#38bdf8',
          2.2
        );
        this.game?.audio?.play?.('victory_fanfare', fxX);
      } else {
        ent?.triggerAuraRing?.('buff', 1.15);
        ent?.triggerCallout?.(`${res.star}-STAR!`, '#facc15', 1.15, false);
        this.spawnFloatingCallout(fxX, fxY - 140, `+1 STAR (${res.star}-STAR)`, '#facc15', 1, 1.15, { kind: 'shard' });
        this.game?.audio?.play?.('holy_hit', fxX);
      }
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return res || { ok: false };
  }

  setSquadFormation(formationId) {
    if (!this.companionEvo || typeof this.companionEvo.setFormation !== 'function') {
      return { ok: false, reason: 'no_companion_evo' };
    }
    const res = this.companionEvo.setFormation(formationId);
    const ok = Boolean(res?.ok ?? res);
    if (ok) {
      this.companions?.onFormationChanged?.();
      this._syncExternalModifiers(undefined, { preserveBase: true });
      const player = this.game?.leftFighter;
      if (player) {
        this.progression.syncMaxHpWithEconomy(player);
      }
      const form = this.companionEvo.getFormation?.() || null;
      if (form?.name && player) {
        this.spawnFloatingCallout(
          player.x,
          (player.groundY || this.depthMidY) - 150,
          form.name,
          form.accentHex || '#facc15',
          1,
          1.15
        );
      }
      this.game?.audio?.play?.('clock_gear', player?.x || 600);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return typeof res === 'object' && res !== null ? res : { ok, formationId: this.companionEvo.formationId };
  }

  triggerSquadOverdrive() {
    const player = this.game?.leftFighter || null;
    const targets =
      this.treasureGoblins.length > 0
        ? [...this.getLivingMonsters(), ...this.treasureGoblins.filter((tg) => tg && !tg.isDead)]
        : this.getLivingMonsters();
    const entityGame = this._getEntityGameView();
    const res = this.companions?.triggerSquadOverdrive?.(player, targets, this.economy, entityGame);
    if (res?.ok) {
      this._syncExternalModifiers(undefined, { preserveBase: true });
      if (player) this.progression.syncMaxHpWithEconomy(player);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return res || { ok: false, hitCount: 0, totalDamage: 0, activeCount: 0 };
  }

  // =========================================================================
  // WAVE 7: GEAR ARMORY ACTIONS (DELEGATED TO EndlessGear)
  // =========================================================================

  _afterGearMutation(playSfx = 'clock_gear') {
    this._syncExternalModifiers(undefined, { preserveBase: true });
    const player = this.game?.leftFighter;
    if (player) {
      this.progression.syncMaxHpWithEconomy(player);
    }
    if (playSfx) {
      this.game?.audio?.play?.(playSfx, player?.x || 600);
    }
    this.saveNow();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
  }

  equipGearItem(uid) {
    if (!this.gear || typeof this.gear.equipItem !== 'function') {
      return { ok: false, reason: 'no_gear' };
    }
    const res = this.gear.equipItem(uid);
    if (res?.ok) {
      this._afterGearMutation('clock_gear');
    }
    return res || { ok: false };
  }

  equipBestGear() {
    if (!this.gear || typeof this.gear.equipBest !== 'function') {
      return { ok: false, changedCount: 0 };
    }
    const res = this.gear.equipBest();
    if (res?.ok) {
      this._afterGearMutation((res.changedCount || 0) > 0 ? 'holy_hit' : null);
    }
    return res || { ok: false, changedCount: 0 };
  }

  enhanceGearItem(uid) {
    if (!this.gear || typeof this.gear.enhanceItem !== 'function') {
      return { ok: false, reason: 'no_gear' };
    }
    const res = this.gear.enhanceItem(uid);
    if (res?.ok) {
      this._afterGearMutation('holy_hit');
    }
    return res || { ok: false };
  }

  salvageGearItem(uid) {
    if (!this.gear || typeof this.gear.salvageItem !== 'function') {
      return { ok: false, reason: 'no_gear' };
    }
    const res = this.gear.salvageItem(uid);
    if (res?.ok) {
      this._afterGearMutation('clock_gear');
    }
    return res || { ok: false };
  }

  salvageAllLowerGear() {
    if (!this.gear || typeof this.gear.salvageAllLower !== 'function') {
      return { ok: false, count: 0, dustGained: 0 };
    }
    const res = this.gear.salvageAllLower();
    if (res?.ok) {
      this._afterGearMutation((res.count || 0) > 0 ? 'clock_gear' : null);
    }
    return res || { ok: false, count: 0, dustGained: 0 };
  }

  // =========================================================================
  // WAVE 8: BOUNTIES, SHRINES & WANDERING MERCHANT ACTIONS
  // =========================================================================

  _recordBounty(metric, amount = 1) {
    if (!this.events || typeof this.events.recordProgress !== 'function') {
      return { progressed: false, justCompleted: false, bounty: null };
    }
    const res = this.events.recordProgress(metric, amount, this.stage, this.economy);
    if (res?.justCompleted) {
      const player = this.game?.leftFighter;
      const fxX = Number.isFinite(player?.x) ? player.x : this.corridorOriginX || 240;
      const fxY = Number.isFinite(player?.groundY || player?.y)
        ? player.groundY || player.y
        : this.depthMidY;
      this.spawnFloatingCallout(fxX, fxY - 156, 'BOUNTY COMPLETE!', '#facc15', 2, 1.4, {
        kind: 'fever',
        topColor: '#ffffff'
      });
      this.game?.audio?.play?.('holy_hit', fxX);
      this._playCoinPickupChime(fxX, true);
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return res || { progressed: false, justCompleted: false, bounty: null };
  }

  claimActiveBounty() {
    if (!this.events || typeof this.events.claimBounty !== 'function') {
      return { ok: false, reason: 'no_events' };
    }
    const res = this.events.claimBounty(this.economy, this.gear, this.stage);
    if (!res?.ok) {
      return res || { ok: false };
    }

    this._syncExternalModifiers(undefined, { preserveBase: true });
    const player = this.game?.leftFighter;
    if (player) {
      this.progression.syncMaxHpWithEconomy(player);
    }
    const fxX = Number.isFinite(player?.x) ? player.x : this.corridorOriginX || 240;
    const fxY = Number.isFinite(player?.groundY || player?.y)
      ? player.groundY || player.y
      : this.depthMidY;

    this.spawnFloatingCallout(fxX, fxY - 154, 'BOUNTY CLAIMED!', '#facc15', 2, 1.4, {
      kind: 'fever',
      topColor: '#ffffff'
    });
    const rw = res.rewards || {};
    const parts = [];
    if ((rw.gold || 0) > 0) parts.push(`+${formatEndlessNumber(rw.gold)}G`);
    if ((rw.astralShards || 0) > 0) parts.push(`+${rw.astralShards} SHARDS`);
    if ((rw.forgeDust || 0) > 0) parts.push(`+${rw.forgeDust} DUST`);
    if (parts.length > 0) {
      this.spawnFloatingCallout(fxX, fxY - 122, parts.join(' '), '#fde047', 1, 1.2, {
        kind: 'gold',
        topColor: '#ffffff'
      });
    }
    if (this.game?.vfx) {
      this.game.vfx.spawnShockwave(fxX, fxY - 16, 160, '#facc15', 0.34, true);
      this.game.vfx.spawnBurst(fxX, fxY - 58, 18, '#fde047', 210, { upBias: 145, size: 5 });
    }
    this.game?.audio?.play?.('victory_fanfare', fxX);
    this._playCoinPickupChime(fxX, true);
    this.saveNow();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return res;
  }

  buyMerchantOffer() {
    if (!this.events || typeof this.events.purchaseMerchantOffer !== 'function') {
      return { ok: false, reason: 'no_events' };
    }
    const res = this.events.purchaseMerchantOffer(this.economy, this.gear, this.stage);
    if (!res?.ok) {
      return res || { ok: false };
    }

    this._syncExternalModifiers(undefined, { preserveBase: true });
    const player = this.game?.leftFighter;
    if (player) {
      this.progression.syncMaxHpWithEconomy(player);
    }
    const fxX = Number.isFinite(player?.x) ? player.x : this.corridorOriginX || 240;
    const fxY = Number.isFinite(player?.groundY || player?.y)
      ? player.groundY || player.y
      : this.depthMidY;

    if (res.offerType === 'dps_elixir') {
      this.spawnFloatingCallout(fxX, fxY - 154, 'ELIXIR ACTIVE!', '#c084fc', 2, 1.45, {
        kind: 'fever',
        topColor: '#f5d0fe'
      });
      if (this.game?.vfx) {
        this.game.vfx.spawnShockwave(fxX, fxY - 16, 170, '#c084fc', 0.36, true);
        this.game.vfx.spawnBurst(fxX, fxY - 58, 18, '#c084fc', 210, { upBias: 140, size: 5 });
      }
      this.game?.audio?.play?.('victory_fanfare', fxX);
    } else {
      const item = res.item || null;
      const rm = (item && GEAR_RARITY_BY_ID?.[item.rarity]) || {};
      const sm = (item && GEAR_SLOT_META?.[item.slot]) || {};
      const rarityLabel = String(rm.label || item?.rarity || 'ARCANE').toUpperCase();
      const slotLabel = String(sm.label || item?.slot || 'GEAR').toUpperCase();
      const col = rm.color || '#facc15';
      const topCol = rm.glowHex || '#ffffff';
      const toastText = item ? `${rarityLabel} ${slotLabel}!` : 'MERCHANT CHEST!';
      this.spawnFloatingCallout(fxX, fxY - 154, toastText, col, 2, 1.45, {
        kind: 'fever',
        topColor: topCol
      });
      if (this.game?.vfx) {
        this.game.vfx.spawnShockwave(fxX, fxY - 16, 165, col, 0.34, true);
        this.game.vfx.spawnBurst(fxX, fxY - 56, 16, topCol, 200, { upBias: 135, size: 5 });
      }
      const isHigh = item?.rarity === 'mythic' || item?.rarity === 'sovereign';
      this.game?.audio?.play?.(isHigh ? 'victory_fanfare' : 'holy_hit', fxX);
    }

    this._playCoinPickupChime(fxX, true);
    this.saveNow();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return res;
  }

  dismissMerchantOffer() {
    this.events?.dismissMerchantOffer?.();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return true;
  }

  _computeCompanionSyncSig() {
    const slots = this.companions?.activeSlots || [];
    const rs = this.companions?.rosterState || {};
    const evo = this.companionEvo;
    return slots.map((id) => `${id}:${rs[id]?.level || 0}:${evo?.getStar?.(id) || 1}`).join('|');
  }

  // =========================================================================
  // WAVE & BOSS ENCOUNTER ENGINE
  // =========================================================================

  _despawnAllMonsters() {
    if (!Array.isArray(this.game?.fighters)) return;
    const player = this.game.leftFighter;
    for (const f of this.game.fighters) {
      if (f && f.isColossalBoss) {
        f.releaseGrabbedTarget?.();
      }
    }
    this.game.fighters = player ? [player] : [];
    this.bossEntity = null;
  }

  _spawnEndlessMonster(kind, x, opts = {}) {
    const lanePool = [480, 526, 561, 604, 646];
    const count = this.game?.fighters ? this.game.fighters.length : 0;
    const rawGy = Number.isFinite(opts.groundY) ? opts.groundY : lanePool[count % lanePool.length];
    const gy = Math.max(this.depthMinY + 12, Math.min(this.depthMaxY - 12, rawGy));
    const safeX = Number.isFinite(x) ? Math.round(x) : Math.round((this.lockMinX + this.lockMaxX) * 0.5);
    const player = this.game?.leftFighter;
    const facing = opts.isColossalBoss ? -1 : player && player.x > safeX ? 1 : -1;

    const stageNum = Math.max(1, Math.floor(Number.isFinite(this.stage) ? this.stage : 1));
    const stageIdx = Math.max(0, stageNum - 1);
    const waveIdx = Math.max(0, Math.min(this.wavesPerStage, Math.floor(Number.isFinite(this.waveInStage) ? this.waveInStage : 1) - 1));
    const baseHp = ENDLESS_MONSTER_BASE_HP[kind] || 320;
    const dirHpMult =
      this._activeDirectorMods && Number.isFinite(this._activeDirectorMods.monsterHpMult) && this._activeDirectorMods.monsterHpMult > 0
        ? this._activeDirectorMods.monsterHpMult
        : 1.0;
    const defaultScaledHp = safeBoundedInt(
      baseHp *
        Math.pow(1.28, Math.min(200, stageIdx)) *
        (1 + waveIdx * 0.08) *
        (opts.isElite ? 1.45 : 1.0) *
        dirHpMult,
      40,
      ENDLESS_MAX_STAT
    );
    const defaultDmgScale = safeBoundedFloat(
      0.56 * Math.pow(1.14, Math.min(300, stageIdx)) * (opts.isElite ? 1.12 : 1.0),
      0.1,
      ENDLESS_MAX_DMG_SCALE,
      0.56
    );

    const spawnOpts = {
      ...opts,
      maxHp:
        Number.isFinite(opts.maxHp) && opts.maxHp > 0
          ? safeBoundedInt(opts.maxHp, 1, ENDLESS_MAX_STAT)
          : defaultScaledHp,
      dmgScale:
        Number.isFinite(opts.dmgScale) && opts.dmgScale > 0
          ? safeBoundedFloat(opts.dmgScale, 0.1, ENDLESS_MAX_DMG_SCALE, defaultDmgScale)
          : defaultDmgScale
    };

    const m =
      kind === 'archfiend'
        ? new ArchfiendBoss(safeX, gy, -1, spawnOpts)
        : new Monster(kind, safeX, gy, facing, spawnOpts);

    m.game = this._getEntityGameView();
    m.team = 2;
    m.groundY = gy;
    m.y = gy;
    if (kind === 'archfiend') {
      m.anchorX = safeX;
      m.anchorGroundY = gy;
      m.x = safeX;
      m.facing = -1;
      m.isBoss = true;
      m.isColossalBoss = true;
      m.isEndlessStageBoss = true;
    } else if (opts.isEndlessStageBoss) {
      m.isEndlessStageBoss = true;
    }

    if (this.game?.fighters) {
      this.game.fighters.push(m);
    }
    if (!this.game.rightFighter || this.game.rightFighter.isDead || m.isEndlessStageBoss) {
      this.game.rightFighter = m;
    }

    // Back-wall dimensional summoning portal (y = 446, adv_fx_sheet.png)
    if (!opts.skipPortal && kind !== 'archfiend') {
      while (this.portals.length >= PORTAL_MAX_COUNT) {
        this.portals.shift();
      }
      const portalZone = this.zoneIndex;
      const portalX = Math.max(this.lockMinX + 86, Math.min(this.lockMaxX - 86, safeX));
      this.portals.push({
        x: portalX,
        groundY: 446,
        targetGroundY: gy,
        zone: portalZone,
        facing,
        age: 0,
        maxLife: 1.55,
        isElite: Boolean(opts.isElite),
        primaryColor: m.primaryColor || '#38bdf8',
        seed: (this.portals.length * 1.7 + portalX * 0.01) % 6.28
      });
      m.portalEmergeFromX = portalX;
      m.portalEmergeFromY = 450;
    }

    if (this.game?.vfx) {
      const fxX = Number.isFinite(m.portalEmergeFromX) ? m.portalEmergeFromX : safeX;
      const fxY = Number.isFinite(m.portalEmergeFromY) ? m.portalEmergeFromY - 56 : gy - 24;
      this.game.vfx.spawnShockwave(fxX, fxY, m.isEndlessStageBoss ? 220 : 92, m.primaryColor, 0.34, true);
      this.game.vfx.spawnBurst(fxX, fxY - 10, m.isEndlessStageBoss ? 24 : 12, m.primaryColor, 200, {
        upBias: 115,
        size: 5
      });
    }

    return m;
  }

  _spawnWaveMonsters() {
    this._syncCorridorBounds({ lockToCorridor: true, syncCamera: true });
    const realm = this.getCurrentRealm();
    const waveNum = Math.max(1, Math.min(this.wavesPerStage, this.waveInStage));
    const count = this.bossFarmMode ? 4 : waveNum <= 2 ? 3 : waveNum <= 4 ? 4 : 5;
    const lanes = [480, 561, 642, 514, 608];

    const playerX = Number.isFinite(this.game?.leftFighter?.x)
      ? this.game.leftFighter.x
      : this.corridorOriginX;
    const hardMinX = this.lockMinX + 120;
    const hardMaxX = Math.max(hardMinX + 180, this.lockMaxX - 90);
    const maxSpawnX = Math.max(hardMinX + 180, this.lockMaxX - 110);
    const rawMinSpawnX = Math.max(this.lockMinX + 380, playerX + 260);
    const minSpawnX = Math.max(hardMinX, Math.min(maxSpawnX - 180, rawMinSpawnX));
    const span = Math.max(180, maxSpawnX - minSpawnX);

    const dirMods =
      this._activeDirectorMods ||
      this.bossDirector?.getDirectorSnapshot?.(this.stage, this.bestStage, realm)?.combinedModifiers ||
      null;
    const eliteChanceBonus = Math.max(0, Number(dirMods?.eliteChanceBonus) || 0);

    for (let i = 0; i < count; i++) {
      const kind = realm.monsters[i % realm.monsters.length] || 'templar';
      const frac = count > 1 ? i / (count - 1) : 0.5;
      const sx = Math.max(hardMinX, Math.min(hardMaxX, Math.round(minSpawnX + frac * span)));
      const gy = lanes[(i + waveNum + this._farmWaveCount) % lanes.length];
      const isElite =
        (this.bossFarmMode && i === count - 1) ||
        (waveNum >= 3 && i === count - 1) ||
        (waveNum >= 5 && i === 1) ||
        (eliteChanceBonus > 0 && Math.random() < eliteChanceBonus);
      this._spawnEndlessMonster(kind, sx, { groundY: gy, isElite });
    }

    // Wave 3: 22% chance to spawn a Gilded Treasure Goblin at Wave 3 or Wave 5 start
    if (
      !this.isBossEncounter &&
      !this.bossFarmMode &&
      (waveNum === 3 || waveNum === 5) &&
      this.treasureGoblins.length < GOBLIN_MAX_ACTIVE &&
      Math.random() < GOBLIN_WAVE_PROC_CHANCE
    ) {
      this.spawnTreasureGoblin();
    }

    this.totalWaveLabel = this.bossFarmMode
      ? `STAGE ${this.stage} • FARMING`
      : `STAGE ${this.stage} • WAVE ${this.waveInStage}/${this.wavesPerStage}`;
    this.syncStageBadge();
    this.syncRightHUD();
  }

  startBossEncounter() {
    if (!this.active) return false;
    this._despawnAllMonsters();
    this._waveAdvancePending = false;
    this._waveSpawnDelay = 0;

    const stageNum = Math.max(1, Math.floor(Number.isFinite(this.stage) ? this.stage : 1));
    this.stage = stageNum;
    const realm = this.getCurrentRealm();
    const stats = this.economy.getComputedStats();
    this.isBossEncounter = true;
    this.bossFarmMode = false;
    this.bossTimerMax = safeBoundedFloat(
      40 + (Number.isFinite(stats?.bossTimerBonusSec) ? stats.bossTimerBonusSec : 0),
      10,
      180,
      40
    );
    this.bossTimer = this.bossTimerMax;

    this.lockActive = true;
    this._syncCorridorBounds({ lockToCorridor: true, syncCamera: true });

    const bossX = Math.round(this.lockMaxX - 180);
    this._bossPortalX = bossX;
    this._bossPortalActive = true;

    const player = this.game?.leftFighter;
    const bossProfile =
      this.bossDirector && typeof this.bossDirector.getBossProfileForStage === 'function'
        ? this.bossDirector.getBossProfileForStage(stageNum, realm)
        : null;
    const isColossal = Boolean(bossProfile ? bossProfile.isColossal : stageNum % 5 === 0);
    if (player) {
      const safeRight = isColossal ? bossX - 165 : bossX - 240;
      if (!Number.isFinite(player.x) || player.x > safeRight) player.x = Math.max(this.lockMinX + 60, safeRight);
      if (player.x < this.lockMinX + 40) player.x = this.lockMinX + 80;
      player.facing = 1;
    }

    if (isColossal) {
      PixelForge.ensureHeroLoaded?.('archfiend');
      const profileHpMult =
        Number.isFinite(bossProfile?.hpMult) && bossProfile.hpMult > 0 ? bossProfile.hpMult : 1.0;
      const colossalHp = safeBoundedInt(
        11800 * Math.pow(1.30, Math.min(200, Math.max(0, stageNum - 5))) * profileHpMult,
        11800,
        ENDLESS_MAX_STAT
      );
      const bossDmgMult = safeBoundedFloat(
        0.72 * Math.pow(1.14, Math.min(300, Math.max(0, stageNum - 1))),
        0.1,
        ENDLESS_MAX_DMG_SCALE,
        0.72
      );
      const tierNum = Math.floor(stageNum / 5);
      const bossName =
        bossProfile?.name || (tierNum > 1 ? `BEHEMOTH MALPHAS MK-${tierNum}` : 'BEHEMOTH MALPHAS');
      this.bossEntity = this._spawnEndlessMonster('archfiend', bossX, {
        groundY: this.depthMidY,
        name: bossName,
        maxHp: colossalHp,
        dmgScale: bossDmgMult,
        bossDmgMult,
        skipPortal: true,
        isEndlessStageBoss: true
      });
      if (this.bossEntity && bossProfile) {
        this.bossEntity._bossProfile = bossProfile;
      }
      this.totalWaveLabel = `STAGE ${stageNum} • COLOSSAL BOSS`;
      this.showBanner(
        bossProfile?.heraldText || `STAGE ${stageNum} COLOSSAL BOSS`,
        bossProfile?.heraldSubText
          ? `${bossProfile.heraldSubText} • ${Math.round(this.bossTimerMax)}S`
          : `${bossName} • ${Math.round(this.bossTimerMax)}S TIMER!`,
        bossProfile?.accentHex || '#ef4444',
        2.8
      );
      if (!this.game?.isLandingOpen) {
        this.game?.audio?.play?.('eclipse_charge', bossX);
        this.game?.audio?.play?.('thunder_slam', bossX);
        if (!this.game?.simMode) {
          this.game?.audio?.playBgm?.('bgm_boss_malphas');
        }
      }
      this.game?.renderer?.triggerShake?.(14, 0.55);
    } else {
      const baseHp = ENDLESS_MONSTER_BASE_HP[realm.warden] || 360;
      const profileHpMult =
        Number.isFinite(bossProfile?.hpMult) && bossProfile.hpMult > 0 ? bossProfile.hpMult : 1.0;
      const wardenHp = safeBoundedInt(
        baseHp * Math.pow(1.28, Math.min(200, Math.max(0, stageNum - 1))) * 4.8 * profileHpMult,
        200,
        ENDLESS_MAX_STAT
      );
      const wardenDmgScale = safeBoundedFloat(
        0.65 * Math.pow(1.14, Math.min(300, Math.max(0, stageNum - 1))),
        0.1,
        ENDLESS_MAX_DMG_SCALE,
        0.65
      );
      const wardenName = bossProfile?.name || realm.wardenName;
      const wardenTitle = bossProfile?.title || `STAGE ${stageNum} WARDEN`;
      this.bossEntity = this._spawnEndlessMonster(realm.warden, bossX, {
        groundY: this.depthMidY,
        isMiniBoss: true,
        isElite: true,
        isEndlessStageBoss: true,
        wardenName,
        wardenTitle,
        maxHp: wardenHp,
        dmgScale: wardenDmgScale,
        spriteScale: realm.warden === 'treant' || realm.warden === 'brute' ? 1.38 : 1.28,
        skipPortal: true
      });
      if (this.bossEntity && bossProfile) {
        this.bossEntity._bossProfile = bossProfile;
      }
      this.totalWaveLabel = `STAGE ${stageNum} • WARDEN BOSS`;
      this.showBanner(
        bossProfile?.heraldText || `STAGE ${stageNum} BOSS: ${wardenName}`,
        bossProfile?.heraldSubText
          ? `${bossProfile.heraldSubText} • ${Math.round(this.bossTimerMax)}S`
          : `SLAY WITHIN ${Math.round(this.bossTimerMax)}S TO ADVANCE!`,
        bossProfile?.accentHex || realm.accentHex,
        2.6
      );
      if (!this.game?.isLandingOpen) {
        this.game?.audio?.play?.('eclipse_charge', bossX);
        this.game?.audio?.play?.('thunder_slam', bossX);
      }
      this.game?.renderer?.triggerShake?.(8, 0.32);
    }

    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return true;
  }

  challengeBoss() {
    if (!this.active || this.isBossEncounter || this.trials?.isActive?.()) return false;
    for (let i = 0; i < this.coins.length; i++) {
      if (this.coins[i]) this.coins[i].magnetForced = true;
    }
    return this.startBossEncounter();
  }

  toggleAutoBoss(val = undefined) {
    this.economy.autoBoss = val === undefined ? !this.economy.autoBoss : Boolean(val);
    this.saveNow();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return this.economy.autoBoss;
  }

  _advanceCorridorForNextWave(nextSpawnKind = 'wave') {
    if (!Number.isFinite(this.corridorOriginX) || this.corridorOriginX < 240) {
      this.corridorOriginX = 240;
    }
    if (this.bossFarmMode && nextSpawnKind === 'wave') {
      // Keep farming waves inside the current stage's 2400px biome band so visual biome stays synced to stage
      const biomeBandStart = Math.floor(this.corridorOriginX / 2400) * 2400;
      const maxFarmOrigin = biomeBandStart + 1840;
      if (this.corridorOriginX + ENDLESS_CORRIDOR_STEP_X <= maxFarmOrigin) {
        this.corridorOriginX += ENDLESS_CORRIDOR_STEP_X;
      }
    } else {
      this.corridorOriginX += ENDLESS_CORRIDOR_STEP_X;
    }
    this.lockActive = false;
    this._syncCorridorBounds({ lockToCorridor: false, syncCamera: true });

    // Smoothly unlock right side so hero & companions march forward into the new arena
    this.lockMaxX = this.corridorMaxX;
    this._waveAdvancePending = true;
    this._waveAdvanceTargetX = this.corridorOriginX + 80;
    this._waveAdvanceElapsed = 0;
    this._pendingSpawnKind = nextSpawnKind;

    // Pull dropped wave coins smoothly to the marching hero so high-coordinate scrolling never strands gold
    for (let i = 0; i < this.coins.length; i++) {
      if (this.coins[i]) this.coins[i].magnetForced = true;
    }

    // Nudge any active Treasure Goblins forward with the advancing corridor
    for (let i = 0; i < this.treasureGoblins.length; i++) {
      const g = this.treasureGoblins[i];
      if (g && !g.isDead && g.x < this.corridorMinX + 90) {
        g.runDir = 1;
        g.facing = 1;
      }
    }
  }

  _handleBossDefeated(boss) {
    // Banish any remaining adds cleanly
    for (const m of this.getLivingMonsters()) {
      if (m !== boss && !m.isDead) {
        m.hp = 0;
        m.isDead = true;
        m.setState('DEATH');
      }
    }

    const clearedStage = Math.max(1, Math.floor(Number.isFinite(this.stage) ? this.stage : 1));
    const isColossal = Boolean(boss?.isColossalBoss || clearedStage % 5 === 0);
    const rawBx = boss?.isColossalBoss
      ? (Number.isFinite(boss.anchorX) ? boss.anchorX : boss.x) - 110
      : Number.isFinite(boss?.x)
        ? boss.x
        : this.corridorOriginX + 420;
    const bx = Math.max(this.lockMinX + 72, Math.min(this.lockMaxX - 72, Math.round(rawBx)));
    const bGy = Number.isFinite(boss?.groundY) ? boss.groundY : this.depthMidY;

    // Huge Sovereign Gold Coin shower + Astral Shards!
    const bossProfile =
      boss?._bossProfile ||
      this.bossDirector?.getBossProfileForStage?.(clearedStage, this.getCurrentRealm()) ||
      null;
    const profileGoldMult =
      Number.isFinite(bossProfile?.goldMult) && bossProfile.goldMult > 0 ? bossProfile.goldMult : 1.0;
    const baseBossGold = safeBoundedInt(
      this.economy.computeMonsterGoldReward(clearedStage, {
        isElite: true,
        isWarden: !isColossal,
        isColossalBoss: isColossal
      }),
      1,
      ENDLESS_MAX_STAT
    );
    const rawBossGold = safeBoundedInt(baseBossGold * profileGoldMult, 1, ENDLESS_MAX_STAT);
    const instantGold = safeBoundedInt(Math.round(rawBossGold * 0.35), 0, rawBossGold, 0);
    const showerGold = safeBoundedInt(Math.max(1, rawBossGold - instantGold), 1, ENDLESS_MAX_STAT);
    if (instantGold > 0) {
      this.economy.addGold(instantGold, { isBoss: true, applyMult: true });
    }
    this.spawnGoldCoins(bx, bGy, showerGold, {
      count: isColossal ? 18 : 12,
      isBoss: true,
      applyMult: true
    });

    const baseShards = clearedStage % 5 === 0 ? Math.max(2, Math.floor(clearedStage / 2)) : 1;
    const profileBonusShards = Math.max(0, Math.floor(Number(bossProfile?.bonusShards) || 0));
    const shardCount = safeBoundedInt(Math.max(baseShards, profileBonusShards), 1, 1e9);
    this.economy.addAstralShards(shardCount);
    this._spawnAstralShardVisuals(bx, bGy, Math.min(6, shardCount));

    // Wave 3: Spawn interactive Milestone Stage Treasure Chest on the corridor road!
    this.spawnStageTreasureChest(bx, bGy, clearedStage);
    // Wave 7: Spawn guaranteed Boss / Colossal Boss Gear Loot Beam beside the chest
    this.spawnGearLootBeam(bx - 42, bGy, isColossal ? 'colossal' : 'boss', { stage: clearedStage });

    this.economy.bossesSlain = (this.economy.bossesSlain || 0) + 1;
    this._recordBounty('bosses', 1);
    this.isBossEncounter = false;
    this.bossTimer = 0;
    this._bossPortalActive = false;
    this.bossEntity = null;

    // Advance Stage & cycle Realm seamlessly
    this.stage = clearedStage + 1;
    this.bestStage = Math.max(this.bestStage, this.stage);
    this.waveInStage = 1;
    this.bossFarmMode = false;
    this._farmWaveCount = 0;
    this.economy.stage = this.stage;
    this.economy.bestStage = Math.max(this.economy.bestStage || 1, this.bestStage);
    this.economy.waveInStage = 1;

    const nextRealm = this.getCurrentRealm();
    this.zoneIndex = nextRealm.realmIndex;
    this._prewarmRealmAssets(this.zoneIndex);

    if (this.game?.renderer && !this.game.renderer.permanentStageOverride) {
      this.game.renderer.stageId = nextRealm.stageId;
    }

    if (isColossal && !this.game?.isLandingOpen && !this.game?.simMode) {
      this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
    }
    this.game?.audio?.play?.('victory_fanfare', bx);
    this.game?.renderer?.triggerShake?.(isColossal ? 12 : 7, 0.34);

    this.spawnFloatingCallout(
      bx,
      bGy - 165,
      `+${shardCount} ASTRAL SHARD${shardCount === 1 ? '' : 'S'}!`,
      '#38bdf8',
      2,
      1.45
    );
    this.showBanner(
      `STAGE ${clearedStage} CLEAR!`,
      `+${shardCount} ASTRAL SHARD${shardCount === 1 ? '' : 'S'} • ENTERING ${nextRealm.name}`,
      '#facc15',
      2.8
    );

    this.saveNow();
    this._advanceCorridorForNextWave('wave');
    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
  }

  _handleBossRetreat(reason = 'timeout') {
    if (!this.isBossEncounter) return;
    const player = this.game?.leftFighter;
    this.bossEntity?.releaseGrabbedTarget?.();
    this._despawnAllMonsters();

    this.isBossEncounter = false;
    this.bossTimer = 0;
    this._bossPortalActive = false;
    this.bossFarmMode = true;
    this._farmWaveCount = 0;

    // Zero-punishment full revive + 2.0s golden invulnerability (100% Gold/Relics/Companions/Stage kept!)
    if (player) {
      this._revivePlayerPhoenix(player, false);
    }

    if (!this.game?.isLandingOpen && !this.game?.simMode) {
      this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
    }

    this.showBanner(
      'BOSS RETREATED • FARMING WAVE',
      reason === 'hp'
        ? 'HERO RESTORED 100% HP • UPGRADE & CLICK CHALLENGE BOSS!'
        : 'TIME UP • 100% GOLD KEPT • FARM & CLICK CHALLENGE BOSS!',
      '#fb923c',
      3.2
    );

    this._waveSpawnDelay = 0.55;
    this.totalWaveLabel = `STAGE ${this.stage} • FARMING`;
    this.saveNow();
    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
  }

  _revivePlayerPhoenix(player, showPhoenixBanner = true) {
    if (!player) return;
    player.isDead = false;
    player.hp = player.maxHp;
    player.deathTimer = 0;
    player.hurtTimer = 0;
    player.stunTimer = 0;
    player.isRooted = false;
    player._grabbedByBoss = false;
    player._grabbedByBossTimer = 0;
    player._advPureDodge = false;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY || this.depthMidY;
    player.setState('IDLE');
    player.isInvulnerable = true;
    this._phoenixInvulnTimer = 2.0;

    if (this.game) {
      this.game.isMatchOver = false;
      this.game.victoryRevealPending = false;
      this.game.deadMatchFighter = null;
    }

    this.game?.audio?.play?.('holy_hit', player.x);
    this.game?.vfx?.spawnShockwave?.(player.x, (player.groundY || player.y) - 12, 220, '#facc15', 0.42, true);
    this.game?.vfx?.spawnBurst?.(player.x, player.y - 72, 24, '#fef08a', 240, { upBias: 155, size: 6 });

    // Knock back nearby regular monsters to give safe breathing room
    for (const m of this.getLivingMonsters()) {
      if (m.isColossalBoss) continue;
      const dx = m.x - player.x;
      if (Math.abs(dx) <= 280) {
        const pushDir = dx >= 0 ? 1 : -1;
        m.x = Math.max(this.lockMinX + 24, Math.min(this.lockMaxX - 24, m.x + pushDir * 140));
        m.vx = pushDir * 220;
      }
    }

    if (showPhoenixBanner) {
      this.spawnFloatingCallout(player.x, player.y - 165, 'PHOENIX SURGE! 100% HP', '#facc15', 2, 1.3);
      this.showBanner('PHOENIX SURGE!', '100% HP RESTORED • 0 GOLD LOST', '#facc15', 1.8);
    }
  }

  handlePlayerZeroHp(player) {
    if (!this.active) return;
    if (this.isBossEncounter && !this.trials?.isActive?.()) {
      this._handleBossRetreat('hp');
    } else {
      this._revivePlayerPhoenix(player || this.game?.leftFighter, true);
    }
  }

  onPlayerDeath(player) {
    this.handlePlayerZeroHp(player);
  }

  onBossPhaseShift(boss, phase) {
    if (!this.active || !boss) return;
    if (this.trials?.activeTrial?.id === 'malphas_gauntlet') return;
    const anchorX = boss.anchorX || this.getBossAnchorX();
    if (phase === 2) {
      this._spawnEndlessMonster('fiend', Math.max(this.lockMinX + 120, anchorX - 620), { groundY: 486 });
      this._spawnEndlessMonster('fiend', Math.max(this.lockMinX + 160, anchorX - 480), { groundY: 636 });
    }
  }

  onMonsterGuardBroken(monster, _attacker = null) {
    if (!this.active || !monster) return;
    const sx = monster.isColossalBoss ? (monster.anchorX || monster.x) - 110 : monster.x;
    const sy = (monster.groundY || monster.y || 561) - 140;
    this.spawnFloatingCallout(sx, sy, 'GUARD BREAK! 1.55X', '#facc15', 2, 1.1);
    this.game?.audio?.play?.('parry_clang', sx);
  }

  onMonsterDeath(deadMonster) {
    if (!this.active || !deadMonster || deadMonster._endlessDeathHandled) return;
    if (
      this.trials?.activeTrial?.id === 'malphas_gauntlet' &&
      (deadMonster === this.bossEntity || deadMonster.isTrialBoss)
    ) {
      const prevHp = Number.isFinite(this._trialBossPrevHp) ? this._trialBossPrevHp : deadMonster.maxHp;
      if (prevHp > 0) {
        const dmgRes = this.trials.recordTrialBossDamage(prevHp, this.stage);
        if (dmgRes?.tierUp) {
          const bx = (Number.isFinite(deadMonster.anchorX) ? deadMonster.anchorX : deadMonster.x) - 105;
          const bGy = deadMonster.anchorGroundY || deadMonster.groundY || this.depthMidY;
          this.spawnFloatingCallout(bx, bGy - 190, `TIER ${dmgRes.tierReached}!`, '#f43f5e', 2, 1.35, {
            kind: 'fever',
            topColor: '#fef08a'
          });
        }
      }
      deadMonster.isDead = false;
      deadMonster._endlessDeathHandled = false;
      deadMonster.hp = deadMonster.maxHp;
      this._trialBossPrevHp = deadMonster.hp;
      return;
    }
    deadMonster._endlessDeathHandled = true;
    this.monstersKilled++;
    this.economy.totalKills = (this.economy.totalKills || 0) + 1;
    this._recordBounty('kills', 1);
    if (this.trials?.isActive?.()) {
      this.trials.recordTrialKill({ isGoblin: false, isChest: false });
    }
    this.score += deadMonster.scoreValue || 250;

    if (
      deadMonster === this.bossEntity ||
      deadMonster.isEndlessStageBoss ||
      deadMonster.isBoss
    ) {
      this._triggerBloodReaverKillNova(deadMonster, { splashDamage: false });
      this._handleBossDefeated(deadMonster);
      return;
    }

    // Normal / Elite monster gold drop + plume VFX
    const baseMonsterGold = safeBoundedInt(
      this.economy.computeMonsterGoldReward(this.stage, {
        isElite: Boolean(deadMonster.isElite),
        isWarden: false,
        isColossalBoss: false
      }),
      1,
      ENDLESS_MAX_STAT
    );
    const eliteGoldMult =
      deadMonster.isElite &&
      this._activeDirectorMods &&
      Number.isFinite(this._activeDirectorMods.eliteGoldMult) &&
      this._activeDirectorMods.eliteGoldMult > 0
        ? this._activeDirectorMods.eliteGoldMult
        : 1.0;
    const rawGold = safeBoundedInt(baseMonsterGold * eliteGoldMult, 1, ENDLESS_MAX_STAT);
    this.spawnGoldCoins(deadMonster.x, deadMonster.groundY || this.depthMidY, rawGold, {
      count: deadMonster.isElite ? 6 : 3,
      isBoss: false,
      applyMult: true
    });

    if (deadMonster.isElite) {
      this.spawnGearLootBeam(deadMonster.x, deadMonster.groundY || this.depthMidY, 'elite', {
        stage: this.stage
      });
    }

    // Wave 7: Blood-Reaver Mythic Set Kill Nova + Lifesteal (re-entrancy guarded)
    this._triggerBloodReaverKillNova(deadMonster, { splashDamage: true });

    const vfxRow = deadMonster.getMonsterStageVfxRow?.() ?? 10;
    this.spawnMonsterPlume(
      deadMonster.x,
      deadMonster.groundY,
      vfxRow,
      deadMonster.primaryColor || '#38bdf8',
      deadMonster.isElite ? 1.9 : 1.5,
      0.46,
      deadMonster.isElite ? 7 : 5
    );

    const player = this.game?.leftFighter;
    if (player && !player.isDead) {
      this.progression.gainAdventureUlt(7, player);
      this.progression.gainSpirit(10);
    }

    this.syncRightHUD();
  }

  // =========================================================================
  // COINS, ASTRAL SHARDS & ARCANE TAP-SMITE
  // =========================================================================

  spawnGoldCoins(x, groundY, totalRawGold, { count = 4, isBoss = false, applyMult = true } = {}) {
    const numGold = Number(totalRawGold);
    if (Number.isNaN(numGold) || numGold <= 0) return;
    const roundedTotal = safeBoundedInt(numGold, 1, ENDLESS_MAX_STAT);
    const n = Math.max(1, Math.min(20, Math.min(roundedTotal, count | 0)));
    const basePerCoin = Math.floor(roundedTotal / n);
    const remainder = roundedTotal - basePerCoin * n;
    const safeX = Number.isFinite(x) ? x : this.corridorOriginX || 240;
    const gy = Math.max(
      this.depthMinY + 12,
      Math.min(this.depthMaxY - 12, Number.isFinite(groundY) ? groundY : this.depthMidY)
    );

    for (let i = 0; i < n; i++) {
      this._evictOverflowCoins();
      const spread = (i - (n - 1) * 0.5) * 26 + (Math.random() * 18 - 9);
      const laneOff = (Math.random() - 0.5) * 34;
      const targetGy = Math.max(this.depthMinY + 12, Math.min(this.depthMaxY - 12, gy + laneOff));
      this.coins.push({
        kind: 'gold',
        x: safeX + spread * 0.35,
        y: targetGy - 18,
        groundY: targetGy,
        vx: spread * 2.2,
        vy: -(180 + Math.random() * 110),
        rawGold: basePerCoin + (i === 0 ? remainder : 0),
        isBoss: Boolean(isBoss),
        applyMult: Boolean(applyMult),
        magnetForced: false,
        age: 0,
        frameOffset: (i * 2) % 12
      });
    }
  }

  _spawnAstralShardVisuals(x, groundY, count = 2) {
    const n = Math.max(1, Math.min(8, count | 0));
    const safeX = Number.isFinite(x) ? x : this.corridorOriginX || 240;
    const gy = Math.max(
      this.depthMinY + 12,
      Math.min(this.depthMaxY - 12, Number.isFinite(groundY) ? groundY : this.depthMidY)
    );
    for (let i = 0; i < n; i++) {
      this._evictOverflowCoins();
      const spread = (i - (n - 1) * 0.5) * 32;
      this.coins.push({
        kind: 'shard',
        x: safeX + spread * 0.4,
        y: gy - 26,
        groundY: gy,
        vx: spread * 2.0,
        vy: -(230 + Math.random() * 90),
        rawGold: 0,
        isBoss: true,
        applyMult: false,
        magnetForced: true,
        age: 0,
        frameOffset: (i * 3) % 12
      });
    }
  }

  _scoopAllCoinsInstant() {
    let totalAdded = 0;
    const inTrial = Boolean(this.trials?.isActive?.());
    for (const c of this.coins) {
      if (c && c.kind === 'gold' && Number.isFinite(c.rawGold) && c.rawGold > 0) {
        const added = this.economy.addGold(safeBoundedInt(c.rawGold, 1, ENDLESS_MAX_STAT), {
          isBoss: c.isBoss,
          applyMult: c.applyMult
        });
        totalAdded += added;
        if (inTrial && added > 0) {
          this.trials.recordTrialGold(added);
        }
      }
    }
    this.coins = [];
    return totalAdded;
  }

  _updateCoins(dt, player) {
    if (!this.coins.length) return;
    const stats = this.economy.getComputedStats();
    const baseRadius = Math.max(180, Number.isFinite(stats.coinMagnetRadius) ? stats.coinMagnetRadius : 210);
    const px = Number.isFinite(player?.x) ? player.x : this.corridorOriginX;
    const pGy = player && Number.isFinite(player.groundY || player.y)
      ? player.groundY || player.y
      : this.depthMidY;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (!c || !Number.isFinite(c.age) || !Number.isFinite(c.x) || !Number.isFinite(c.groundY)) {
        if (c && c.kind === 'gold' && Number.isFinite(c.rawGold) && c.rawGold > 0) {
          const gained = this.economy.addGold(safeBoundedInt(c.rawGold, 1, ENDLESS_MAX_STAT), {
            isBoss: Boolean(c.isBoss),
            applyMult: Boolean(c.applyMult)
          });
          if (gained > 0 && this.trials?.isActive?.()) {
            this.trials.recordTrialGold(gained);
          }
        }
        this.coins.splice(i, 1);
        continue;
      }
      c.age += dt;

      // Arc physics before settling on road
      if (c.y < c.groundY || c.vy < 0) {
        c.vy += 680 * dt;
        c.y += c.vy * dt;
        c.x += (c.vx || 0) * dt;
        c.vx *= Math.max(0, 1 - dt * 3.5);
        if (c.y >= c.groundY) {
          c.y = c.groundY;
          c.vy = 0;
          c.vx = 0;
        }
      }

      // Magnetic vacuum pull (auto-pulls after 0.85s or immediately when magnetForced / within radius / far behind)
      const dx = px - c.x;
      const dz = pGy - c.groundY;
      const dist = Math.hypot(dx, dz * 1.25);
      if (Math.abs(dx) > 1800 && c.age >= 0.45) {
        c.magnetForced = true;
      }
      const shouldPull =
        player &&
        (c.magnetForced || c.age >= 0.85 || (c.age >= 0.20 && dist <= baseRadius));

      if (shouldPull && dist > 6) {
        const pullSpeed = (c.magnetForced ? 760 : 460 + Math.min(340, c.age * 240)) * dt;
        c.x += (dx / dist) * pullSpeed;
        c.groundY += (dz / dist) * pullSpeed * 0.9;
        if (c.vy === 0) c.y = c.groundY;
      }

      if (dist <= 62 || c.age >= 3.2) {
        this.coins.splice(i, 1);
        this._coinStreak = Math.min(12, (this._coinStreak || 0) + 1);
        this._coinStreakTimer = COIN_STREAK_DECAY_SEC;

        if (c.kind === 'gold' && Number.isFinite(c.rawGold) && c.rawGold > 0) {
          const gained = this.economy.addGold(safeBoundedInt(c.rawGold, 1, ENDLESS_MAX_STAT), {
            isBoss: c.isBoss,
            applyMult: c.applyMult
          });
          if (gained > 0 && this.trials?.isActive?.()) {
            this.trials.recordTrialGold(gained);
          }
          this._recordBounty('coins', 1);
          if (gained > 0 && (c.isBoss || this.floatingCallouts.length < 22 || Math.random() < 0.55)) {
            this.spawnFloatingCallout(
              px + (Math.random() * 28 - 14),
              pGy - 134,
              `+${formatEndlessNumber(gained)} G`,
              '#fde047',
              1,
              0.84,
              { kind: 'gold', topColor: '#ffffff' }
            );
          }
        }
        this._playCoinPickupChime(px, c.kind === 'shard');
      }
    }
  }

  _playCoinPickupChime(worldX, isShard = false) {
    const audio = this.game?.audio;
    if (!audio) return;
    if (audio.enabled === false || audio.sfxEnabled === false || audio._bgSuspended) return;

    const nowMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    if (nowMs - (this._lastCoinChimeMs ?? -1000) < COIN_CHIME_THROTTLE_MS) return;
    this._lastCoinChimeMs = nowMs;

    const ctx = audio.ctx;
    const canOscSynth =
      Boolean(audio.sfxEnabled) &&
      !this.game?.simMode &&
      ctx &&
      ctx.state === 'running' &&
      typeof ctx.createOscillator === 'function' &&
      typeof ctx.createGain === 'function';

    if (canOscSynth) {
      try {
        const dest = audio.sfxBus || audio.master || ctx.destination;
        if (dest) {
          const t0 = Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0;
          const noteIdx = Math.max(
            0,
            Math.min(COIN_PENTATONIC_HZ.length - 1, Math.max(0, (this._coinStreak || 1) - 1))
          );
          const baseFreq = COIN_PENTATONIC_HZ[noteIdx] * (isShard ? 1.25 : 1.0);
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const env = ctx.createGain();
          const shimmerGain = ctx.createGain();
          const peak = isShard ? 0.15 : 0.115;
          const decaySec = isShard ? 0.19 : 0.135;

          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(baseFreq, t0);
          osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.03, t0 + 0.045);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(baseFreq * 2.0, t0);
          osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.025, t0 + 0.085);

          shimmerGain.gain.setValueAtTime(0.36, t0);
          env.gain.setValueAtTime(0.0001, t0);
          env.gain.linearRampToValueAtTime(peak, t0 + 0.007);
          env.gain.exponentialRampToValueAtTime(0.0008, t0 + decaySec);

          let panner = null;
          if (Number.isFinite(worldX) && typeof ctx.createStereoPanner === 'function') {
            panner = ctx.createStereoPanner();
            const camX = this.game?.renderer?.camX ?? 600;
            panner.pan.value = Math.max(-0.42, Math.min(0.42, (worldX - camX) / 650));
            env.connect(panner);
            panner.connect(dest);
          } else {
            env.connect(dest);
          }

          osc1.connect(env);
          osc2.connect(shimmerGain);
          shimmerGain.connect(env);

          const stopAt = t0 + decaySec + 0.02;
          osc1.onended = () => {
            osc1.onended = null;
            try { osc1.disconnect(); } catch (_) {}
            try { osc2.disconnect(); } catch (_) {}
            try { shimmerGain.disconnect(); } catch (_) {}
            try { env.disconnect(); } catch (_) {}
            try { panner?.disconnect(); } catch (_) {}
          };
          osc1.start(t0);
          osc2.start(t0);
          osc1.stop(stopAt);
          osc2.stop(stopAt);
          return;
        }
      } catch (_) {
        // Fall through cleanly to throttled reflect fallback
      }
    }

    // Soft throttled fallback when no unlocked Web Audio ctx
    audio.play?.('reflect', worldX);
  }

  _buildPixelChainPoints(x1, y1, x2, y2, tier = 1) {
    const sx = Math.round(x1);
    const sy = Math.round(y1);
    const ex = Math.round(x2);
    const ey = Math.round(y2);
    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / dist;
    const ny = dx / dist;
    const segs = Math.max(5, Math.min(9, Math.round(dist / 42)));
    const amp = Math.min(28, Math.max(12, dist * 0.11)) * (tier >= 2 ? 1.18 : 1.0);

    const main = [{ x: sx, y: sy }];
    for (let i = 1; i < segs; i++) {
      const frac = i / segs;
      const env = Math.sin(frac * Math.PI);
      const side = i % 2 === 0 ? 1 : -1;
      const jag = side * (0.45 + Math.random() * 0.65) * amp * env;
      main.push({
        x: Math.round((sx + dx * frac + nx * jag) / 2) * 2,
        y: Math.round((sy + dy * frac + ny * jag) / 2) * 2
      });
    }
    main.push({ x: ex, y: ey });

    const midNode = main[Math.floor(main.length * 0.5)] || main[0];
    const forkDir = Math.random() < 0.5 ? 1 : -1;
    const forkLen = 22 + Math.random() * 16;
    const forkMidX = Math.round((midNode.x + dx * 0.08 + nx * forkDir * forkLen * 0.55) / 2) * 2;
    const forkMidY = Math.round((midNode.y + dy * 0.08 + ny * forkDir * forkLen * 0.55) / 2) * 2;
    const forkEndX = Math.round((midNode.x + dx * 0.18 + nx * forkDir * forkLen) / 2) * 2;
    const forkEndY = Math.round((midNode.y + dy * 0.18 + ny * forkDir * forkLen) / 2) * 2;

    return {
      main,
      branch: [
        { x: midNode.x, y: midNode.y },
        { x: forkMidX, y: forkMidY },
        { x: forkEndX, y: forkEndY }
      ]
    };
  }

  // =========================================================================
  // WAVE 3: GILDED TREASURE GOBLINS & MILESTONE STAGE TREASURE CHESTS
  // =========================================================================

  spawnTreasureGoblin(xOverride = null) {
    if (this.treasureGoblins.length >= GOBLIN_MAX_ACTIVE) return null;

    const minX = Math.max(84, (this.lockMinX || this.corridorMinX || 60) + 42);
    const maxX = Math.max(minX + 180, (this.lockMaxX || this.corridorMaxX || 1480) - 42);
    let sx;
    let runDir;
    if (Number.isFinite(xOverride)) {
      sx = Math.max(minX, Math.min(maxX, Math.round(xOverride)));
      runDir = sx > (minX + maxX) * 0.5 ? -1 : 1;
    } else {
      const spawnFromLeft = (this._encounterSeq & 1) === 0;
      sx = spawnFromLeft ? minX + 24 : maxX - 24;
      runDir = spawnFromLeft ? 1 : -1;
    }

    const lanes = [492, 550, 610];
    const rawGy = lanes[this._encounterSeq % lanes.length];
    const gy = Math.max(this.depthMinY + 26, Math.min(this.depthMaxY - 24, rawGy));

    const realm = this.getCurrentRealm();
    const baseKindHp = ENDLESS_MONSTER_BASE_HP[realm.monsters?.[0]] || 320;
    const stageNum = Math.max(1, Math.floor(Number.isFinite(this.stage) ? this.stage : 1));
    const stageIdx = Math.max(0, stageNum - 1);
    const maxHp = safeBoundedInt(
      baseKindHp * Math.pow(1.28, Math.min(200, stageIdx)) * 2.4,
      120,
      ENDLESS_MAX_STAT
    );
    const speed = safeBoundedFloat(138 + Math.min(54, stageIdx * 4), 60, 260, 140);

    const manager = this;
    const goblin = {
      id: `goblin_${++this._encounterSeq}`,
      isTreasureGoblin: true,
      isMonster: false,
      isBoss: false,
      isColossalBoss: false,
      isDead: false,
      stage: stageNum,
      x: sx,
      y: gy,
      groundY: gy,
      runDir,
      facing: runDir,
      speed,
      hp: maxHp,
      maxHp,
      escapeTimer: GOBLIN_ESCAPE_SEC,
      maxEscapeTimer: GOBLIN_ESCAPE_SEC,
      age: 0,
      walkPhase: 0,
      hitFlash: 0,
      hopPhase: 0,
      stunTimer: 0,
      _chillTimer: 0,
      _tauntedTimer: 0,
      takeDamage(amount, attacker = null, isCrit = false, _knockX = 0, _knockY = 0) {
        return manager._damageTreasureGoblin(goblin, amount, attacker, isCrit);
      }
    };

    this.treasureGoblins.push(goblin);
    this._goblinSpawnTimer =
      GOBLIN_SPAWN_MIN_SEC + Math.random() * (GOBLIN_SPAWN_MAX_SEC - GOBLIN_SPAWN_MIN_SEC);

    this.spawnFloatingCallout(sx, gy - 114, 'GILDED GOBLIN!', '#facc15', 2, 1.35, {
      kind: 'gold',
      topColor: '#ffffff'
    });
    if (this.bannerTimer <= 0 && !this.trials?.isActive?.()) {
      this.showBanner(
        'GILDED TREASURE GOBLIN!',
        'TAP TO SMITE FOR DOUBLE COIN SPRAYS & SHARDS!',
        '#facc15',
        2.3
      );
    }
    this.game?.audio?.play?.('clock_gear', sx);
    if (this.game?.vfx) {
      this.game.vfx.spawnBurst(sx, gy - 44, 14, '#facc15', 180, { upBias: 115, size: 4 });
    }
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return goblin;
  }

  _damageTreasureGoblin(
    goblin,
    rawDamage,
    attacker = null,
    isCrit = false,
    { isTap = false, doubleGoldSpray = false } = {}
  ) {
    if (!goblin || goblin.isDead || goblin.hp <= 0) return 0;
    const dmg = safeBoundedInt(rawDamage, 1, ENDLESS_MAX_STAT);
    goblin.hp = Math.max(0, goblin.hp - dmg);
    goblin.hitFlash = 0.14;
    goblin.hopPhase = 1.0;

    if (!isTap && attacker && attacker === this.game?.leftFighter) {
      this.economy.recordDamageSample('hero', dmg);
    }

    // Drop instant shimmering coin sprays every time the goblin takes damage!
    const baseMonsterGold = safeBoundedInt(
      this.economy.computeMonsterGoldReward(goblin.stage || this.stage),
      1,
      ENDLESS_MAX_STAT
    );
    const sprayGold = safeBoundedInt(
      baseMonsterGold * (doubleGoldSpray ? 0.85 : 0.42),
      1,
      ENDLESS_MAX_STAT
    );
    this.spawnGoldCoins(goblin.x, goblin.groundY, sprayGold, {
      count: doubleGoldSpray ? 4 : 2,
      isBoss: false,
      applyMult: true
    });

    if (this.game?.vfx) {
      this.game.vfx.spawnBurst(goblin.x, goblin.groundY - 46, doubleGoldSpray ? 10 : 6, '#fde047', 175, {
        upBias: 115,
        size: 4
      });
    }

    if (goblin.hp <= 0) {
      this._slayTreasureGoblin(goblin, attacker);
    }
    return dmg;
  }

  _slayTreasureGoblin(goblin, _attacker = null) {
    if (!goblin || goblin.isDead) return;
    goblin.isDead = true;
    goblin.hp = 0;

    const idx = this.treasureGoblins.indexOf(goblin);
    if (idx !== -1) {
      this.treasureGoblins.splice(idx, 1);
    }

    const baseMonsterGold = safeBoundedInt(
      this.economy.computeMonsterGoldReward(goblin.stage || this.stage),
      1,
      ENDLESS_MAX_STAT
    );
    const jackpotGold = safeBoundedInt(baseMonsterGold * 8, 14, ENDLESS_MAX_STAT);
    this.spawnGoldCoins(goblin.x, goblin.groundY, jackpotGold, {
      count: 14,
      isBoss: false,
      applyMult: true
    });

    const shards = 1 + Math.floor(Math.random() * 3);
    this.economy.addAstralShards(shards);
    this._spawnAstralShardVisuals(goblin.x, goblin.groundY, shards);
    this._spawnWave4Burst(goblin.x, goblin.groundY - 42, 'goblin', 1.75);
    this.spawnGearLootBeam(goblin.x, goblin.groundY, 'goblin', { stage: goblin.stage || this.stage });

    this.monstersKilled++;
    this.economy.totalKills = (this.economy.totalKills || 0) + 1;
    this._recordBounty('kills', 1);
    if (this.trials?.isActive?.()) {
      this.trials.recordTrialKill({ isGoblin: true, isChest: false });
    }

    if (!this.trials?.isActive?.()) {
      this.showBanner(
        `GILDED GOBLIN SLAIN! +${shards} SHARD${shards === 1 ? '' : 'S'}`,
        `+${formatEndlessNumber(jackpotGold)} BASE GOLD LOOT EXPLOSION!`,
        '#facc15',
        2.7
      );
    }
    this.spawnFloatingCallout(
      goblin.x,
      goblin.groundY - 134,
      `+${shards} SHARD${shards === 1 ? '' : 'S'}!`,
      '#38bdf8',
      2,
      1.4,
      { kind: 'shard' }
    );

    this.game?.audio?.play?.('victory_fanfare', goblin.x);
    this.game?.audio?.play?.('holy_hit', goblin.x);
    this.game?.renderer?.triggerShake?.(8, 0.26);
    if (this.game?.vfx) {
      this.game.vfx.spawnShockwave(goblin.x, goblin.groundY - 22, 185, '#facc15', 0.38, true);
      this.game.vfx.spawnBurst(goblin.x, goblin.groundY - 48, 22, '#fde047', 240, {
        upBias: 155,
        size: 5
      });
    }

    this._scheduleSave(2000);
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
  }

  _updateTreasureGoblins(dt, player) {
    if (this._heroGoblinHitCd > 0) {
      this._heroGoblinHitCd = Math.max(0, this._heroGoblinHitCd - dt);
    }
    if (!this.treasureGoblins.length) return;

    const minX = Math.max(76, (this.lockMinX || this.corridorMinX || 60) + 28);
    const maxX = Math.max(minX + 180, (this.lockMaxX || this.corridorMaxX || 1480) - 28);

    // 1. Move goblins across the corridor & handle escape timer
    for (let i = this.treasureGoblins.length - 1; i >= 0; i--) {
      const g = this.treasureGoblins[i];
      if (!g || g.isDead || !Number.isFinite(g.x) || !Number.isFinite(g.escapeTimer)) {
        this.treasureGoblins.splice(i, 1);
        continue;
      }
      g.age += dt;
      g.hitFlash = Math.max(0, g.hitFlash - dt);
      g.hopPhase = Math.max(0, g.hopPhase - dt * 3.8);
      g.stunTimer = Math.max(0, (g.stunTimer || 0) - dt);
      g._chillTimer = Math.max(0, (g._chillTimer || 0) - dt);
      g._tauntedTimer = Math.max(0, (g._tauntedTimer || 0) - dt);
      g.escapeTimer -= dt;

      const slowMult = g.stunTimer > 0 ? 0.45 : g._chillTimer > 0 ? 0.65 : 1.0;
      const panicMult = g.escapeTimer <= 2.2 ? 1.28 : 1.0;
      g.walkPhase += dt * (15 * slowMult * panicMult);
      g.x += g.runDir * g.speed * slowMult * panicMult * dt;

      if (g.escapeTimer > 1.8) {
        if (g.x <= minX) {
          g.x = minX;
          g.runDir = 1;
        } else if (g.x >= maxX) {
          g.x = maxX;
          g.runDir = -1;
        }
      }
      g.facing = g.runDir;
      const hopLift = g.hopPhase > 0 ? Math.round(Math.sin(Math.min(1, g.hopPhase) * Math.PI) * 18) : 0;
      const strideBob = Math.abs(Math.round(Math.sin(g.walkPhase) * 3));
      g.y = g.groundY - hopLift - strideBob;

      if (g.escapeTimer <= 0) {
        this.treasureGoblins.splice(i, 1);
        this.spawnFloatingCallout(g.x, g.groundY - 96, 'GOBLIN ESCAPED!', '#fb923c', 1, 1.05, {
          kind: 'callout'
        });
        this.game?.audio?.play?.('blink', g.x);
        if (this.game?.vfx) {
          this.game.vfx.spawnBurst(g.x, g.groundY - 38, 12, '#c084fc', 165, { upBias: 95, size: 4 });
        }
      }
    }

    if (!this.treasureGoblins.length || !player || player.isDead) return;

    // 2. Allow Hero attacks near a living goblin to hit it safely
    const isHeroSwing =
      (player.state === 'AUTO_ATTACK' && player.didActionFrame) ||
      player.state === 'SKILL' ||
      player.state === 'ULTIMATE' ||
      player.state === 'TRUE_ULTIMATE';
    if (isHeroSwing && this._heroGoblinHitCd <= 0) {
      const baseReach = Math.max(210, player.getEffectiveAttackRange?.() || player.attackRange || 190);
      const isCast = player.state !== 'AUTO_ATTACK';
      const reachX = isCast ? Math.max(420, baseReach + 160) : baseReach + 72;
      const reachZ = isCast ? 190 : 128;
      const pGy = player.groundY || player.y || this.depthMidY;
      let hitAny = false;
      for (let i = this.treasureGoblins.length - 1; i >= 0; i--) {
        const g = this.treasureGoblins[i];
        if (!g || g.isDead) continue;
        if (Math.abs(g.x - player.x) <= reachX && Math.abs(g.groundY - pGy) <= reachZ) {
          const baseHeroDmg = Math.max(40, Math.round(player.attackDamage || 54));
          const castTier =
            player.state === 'TRUE_ULTIMATE'
              ? 'true_ult'
              : player.state === 'ULTIMATE'
                ? 'ult'
                : player.state === 'SKILL'
                  ? 'skill'
                  : 'auto';
          const scaled = this.progression.scaleOutgoingDamage(baseHeroDmg, player, g, false, castTier);
          this._damageTreasureGoblin(g, scaled, player, false);
          hitAny = true;
        }
      }
      if (hitAny) {
        this._heroGoblinHitCd = isCast ? 0.28 : 0.34;
      }
    }

    // 3. Allow active Hero projectiles to hit nearby goblins cleanly
    const projs = this.game?.vfx?.projectiles;
    if (Array.isArray(projs) && projs.length > 0 && this.treasureGoblins.length > 0) {
      for (let pi = 0; pi < projs.length; pi++) {
        const p = projs[pi];
        if (!p || p.dead || p.owner !== player) continue;
        const pRad = (p.radius || 16) + 34;
        for (let gi = this.treasureGoblins.length - 1; gi >= 0; gi--) {
          const g = this.treasureGoblins[gi];
          if (!g || g.isDead) continue;
          if (p._hitGoblins && p._hitGoblins.has(g.id)) continue;
          const pGy = Number.isFinite(p.groundY) ? p.groundY : p.y;
          if (Math.abs(p.x - g.x) <= pRad && Math.abs(pGy - g.groundY) <= 84) {
            if (!p._hitGoblins) p._hitGoblins = new Set();
            p._hitGoblins.add(g.id);
            const scaled = this.progression.scaleOutgoingDamage(
              Math.max(36, Math.round(p.damage || player.attackDamage || 52)),
              player,
              g,
              false,
              p.advCastSource || 'auto'
            );
            this._damageTreasureGoblin(g, scaled, player, false);
            if (!p.pierce) {
              p.dead = true;
              break;
            }
          }
        }
      }
    }
  }

  spawnStageTreasureChest(x, groundY, stageNum = null) {
    // Enforce cap 3: auto-collect oldest chest cleanly so milestone loot is never lost
    let guard = 0;
    while (this.treasureChests.length >= CHEST_MAX_ACTIVE && guard < 16) {
      guard++;
      const oldest = this.treasureChests[0];
      if (oldest && !oldest.opened) {
        this._openTreasureChest(oldest);
      } else {
        this.treasureChests.shift();
      }
      if (this.treasureChests[0] === oldest) {
        this.treasureChests.shift();
      }
    }

    const minX = (this.lockMinX || this.corridorMinX || 60) + 72;
    const maxX = Math.max(minX + 120, (this.lockMaxX || this.corridorMaxX || 1480) - 72);
    const rawCx = Number.isFinite(x) ? Math.round(x) : Math.round(this.corridorOriginX + 340);
    const cx = Math.max(minX, Math.min(maxX, rawCx));
    const cy = Math.max(
      this.depthMinY + 26,
      Math.min(this.depthMaxY - 24, Number.isFinite(groundY) ? Math.round(groundY) : this.depthMidY)
    );
    const stg = Math.max(1, Math.floor(Number(stageNum ?? this.stage) || 1));

    const manager = this;
    const chest = {
      id: `chest_${++this._encounterSeq}`,
      isTreasureChest: true,
      isMonster: false,
      isBoss: false,
      isColossalBoss: false,
      isDead: false,
      x: cx,
      y: cy,
      groundY: cy,
      stage: stg,
      hp: CHEST_TAPS_REQUIRED,
      maxHp: CHEST_TAPS_REQUIRED,
      tapsLeft: CHEST_TAPS_REQUIRED,
      maxTaps: CHEST_TAPS_REQUIRED,
      autoCrackTimer: CHEST_AUTO_CRACK_SEC,
      maxAutoCrackTimer: CHEST_AUTO_CRACK_SEC,
      shakeTimer: 0.22,
      age: 0,
      opened: false,
      _aiHitCd: 0,
      takeDamage(_amount, _attacker = null) {
        if (chest.opened || chest.isDead || (chest._aiHitCd || 0) > 0) return 0;
        chest._aiHitCd = 0.42;
        manager._crackTreasureChest(chest, false);
        chest.hp = Math.max(0, chest.tapsLeft || 0);
        if (chest.opened) chest.isDead = true;
        return 1;
      }
    };
    this.treasureChests.push(chest);

    if (this.game?.vfx) {
      this.game.vfx.spawnShockwave(cx, cy - 12, 110, '#facc15', 0.28, true);
      this.game.vfx.spawnBurst(cx, cy - 32, 12, '#fef08a', 170, { upBias: 120, size: 4 });
    }
    this.game?.audio?.play?.('clang', cx);
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return chest;
  }

  _crackTreasureChest(chest, isManualTap = true) {
    if (!chest || chest.opened) return { opened: false, tapsLeft: 0 };
    chest.tapsLeft = Math.max(0, (chest.tapsLeft || 1) - 1);
    chest.hp = chest.tapsLeft;
    chest.shakeTimer = 0.24;

    if (this.game?.vfx) {
      this.game.vfx.spawnBurst(chest.x, chest.groundY - 38, isManualTap ? 10 : 6, '#facc15', 165, {
        upBias: 115,
        size: 4
      });
    }

    if (chest.tapsLeft <= 0) {
      this._openTreasureChest(chest);
      return { opened: true, tapsLeft: 0 };
    }

    this.game?.audio?.play?.(chest.tapsLeft === 1 ? 'holy_hit' : 'clang', chest.x);
    this.spawnFloatingCallout(
      chest.x,
      chest.groundY - 98,
      `CRACK! ${chest.tapsLeft} LEFT`,
      '#fde047',
      1,
      0.72,
      { kind: 'gold' }
    );
    return { opened: false, tapsLeft: chest.tapsLeft };
  }

  _openTreasureChest(chest) {
    if (!chest || chest.opened) return false;
    chest.opened = true;
    chest.isDead = true;
    chest.tapsLeft = 0;
    chest.hp = 0;

    const idx = this.treasureChests.indexOf(chest);
    if (idx !== -1) {
      this.treasureChests.splice(idx, 1);
    }

    const stg = Math.max(1, Math.floor(Number(chest.stage || this.stage) || 1));
    const stageGold = safeBoundedInt(
      this.economy.computeMonsterGoldReward(stg),
      1,
      ENDLESS_MAX_STAT
    );
    const chestGold = safeBoundedInt(stageGold * 10, 16, ENDLESS_MAX_STAT);
    this.spawnGoldCoins(chest.x, chest.groundY, chestGold, {
      count: 16,
      isBoss: true,
      applyMult: true
    });

    const bonusShards = stg % 5 === 0 ? 2 : 0;
    if (bonusShards > 0) {
      this.economy.addAstralShards(bonusShards);
      this._spawnAstralShardVisuals(chest.x, chest.groundY, bonusShards);
    }
    this.spawnGearLootBeam(chest.x, chest.groundY, 'chest', { stage: stg });
    if (this.trials?.isActive?.()) {
      this.trials.recordTrialKill({ isGoblin: false, isChest: true });
    }

    this.spawnFloatingCallout(
      chest.x,
      chest.groundY - 122,
      'TREASURE CHEST CRACKED!',
      '#facc15',
      2,
      1.4,
      { kind: 'gold', topColor: '#ffffff' }
    );
    if (bonusShards > 0) {
      this.spawnFloatingCallout(
        chest.x,
        chest.groundY - 154,
        `+${bonusShards} ASTRAL SHARDS!`,
        '#38bdf8',
        2,
        1.45,
        { kind: 'shard' }
      );
    }

    this.game?.audio?.play?.('holy_hit', chest.x);
    this.game?.audio?.play?.('victory_fanfare', chest.x);
    this.game?.renderer?.triggerShake?.(7, 0.24);
    if (this.game?.vfx) {
      this.game.vfx.spawnShockwave(chest.x, chest.groundY - 18, 170, '#facc15', 0.36, true);
      this.game.vfx.spawnBurst(chest.x, chest.groundY - 40, 20, '#fef08a', 235, {
        upBias: 160,
        size: 5
      });
    }

    this._scheduleSave(2000);
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return true;
  }

  _updateTreasureChests(dt, player = null) {
    if (!this.treasureChests.length) return;
    const minActiveX = (this.lockMinX || this.corridorMinX || 60) - 180;
    for (let i = this.treasureChests.length - 1; i >= 0; i--) {
      const ch = this.treasureChests[i];
      if (!ch || ch.opened || !Number.isFinite(ch.x) || !Number.isFinite(ch.autoCrackTimer)) {
        this.treasureChests.splice(i, 1);
        continue;
      }
      ch.age += dt;
      ch.shakeTimer = Math.max(0, ch.shakeTimer - dt);
      ch._aiHitCd = Math.max(0, (ch._aiHitCd || 0) - dt);
      const prevTimer = ch.autoCrackTimer;
      ch.autoCrackTimer = Math.max(0, ch.autoCrackTimer - dt);

      // Gentle anticipatory wiggle ticks for AUTO/idle players before auto-open
      if (
        (prevTimer > 5.0 && ch.autoCrackTimer <= 5.0) ||
        (prevTimer > 2.5 && ch.autoCrackTimer <= 2.5)
      ) {
        ch.shakeTimer = Math.max(ch.shakeTimer, 0.18);
      }
      if (ch.autoCrackTimer <= 0 || ch.x < minActiveX) {
        this._openTreasureChest(ch);
      }
    }

    // In Gold Vault Trial, allow Hero swings & projectiles to crack Treasure Chests directly!
    if (
      this.trials?.activeTrial?.id !== 'gold_vault' ||
      !this.treasureChests.length ||
      !player ||
      player.isDead
    ) {
      return;
    }

    const isHeroSwing =
      (player.state === 'AUTO_ATTACK' && player.didActionFrame) ||
      player.state === 'SKILL' ||
      player.state === 'ULTIMATE' ||
      player.state === 'TRUE_ULTIMATE';
    if (isHeroSwing) {
      const baseReach = Math.max(210, player.getEffectiveAttackRange?.() || player.attackRange || 190);
      const isCast = player.state !== 'AUTO_ATTACK';
      const reachX = isCast ? Math.max(420, baseReach + 160) : baseReach + 72;
      const reachZ = isCast ? 190 : 128;
      const pGy = player.groundY || player.y || this.depthMidY;
      for (let i = this.treasureChests.length - 1; i >= 0; i--) {
        const ch = this.treasureChests[i];
        if (!ch || ch.opened || ch.isDead) continue;
        if (Math.abs(ch.x - player.x) <= reachX && Math.abs(ch.groundY - pGy) <= reachZ) {
          ch.takeDamage(1, player);
        }
      }
    }

    const projs = this.game?.vfx?.projectiles;
    if (Array.isArray(projs) && projs.length > 0 && this.treasureChests.length > 0) {
      for (let pi = 0; pi < projs.length; pi++) {
        const p = projs[pi];
        if (!p || p.dead || p.owner !== player) continue;
        const pRad = (p.radius || 16) + 34;
        for (let ci = this.treasureChests.length - 1; ci >= 0; ci--) {
          const ch = this.treasureChests[ci];
          if (!ch || ch.opened || ch.isDead) continue;
          if (p._hitChests && p._hitChests.has(ch.id)) continue;
          const pGy = Number.isFinite(p.groundY) ? p.groundY : p.y;
          if (Math.abs(p.x - ch.x) <= pRad && Math.abs(pGy - ch.groundY) <= 84) {
            if (!p._hitChests) p._hitChests = new Set();
            p._hitChests.add(ch.id);
            ch.takeDamage(1, player);
            if (!p.pierce) {
              p.dead = true;
              break;
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // WAVE 7: GEAR LOOT BEAMS & MYTHIC SET PASSIVES
  // =========================================================================

  spawnGearLootBeam(worldX, worldY, source = 'boss', opts = {}) {
    if (!this.gear || typeof this.gear.rollDrop !== 'function') return null;
    const stageNum = Math.max(1, Math.floor(Number(opts.stage ?? this.stage) || 1));
    if (!opts.force && typeof this.gear.shouldDropFromSource === 'function') {
      if (!this.gear.shouldDropFromSource(source, stageNum)) return null;
    }

    const item = this.gear.rollDrop({
      stage: stageNum,
      source,
      forcedRarity: opts.forcedRarity || null,
      forcedSlot: opts.forcedSlot || null,
      forcedSetId: opts.forcedSetId || null
    });
    if (!item) return null;

    // Enforce bounded cap BEFORE pushing: auto-collect oldest beam so no loot is ever lost
    while (this.lootBeams.length >= LOOT_BEAM_MAX_ACTIVE) {
      const oldest = this.lootBeams.shift();
      if (oldest && !oldest.collected && oldest.item) {
        this.collectLootBeam(oldest, { silent: true });
      }
    }

    const minX = (this.lockMinX || this.corridorMinX || 60) + 44;
    const maxX = Math.max(minX + 120, (this.lockMaxX || this.corridorMaxX || 1480) - 44);
    const rawX = Number.isFinite(worldX) ? Math.round(worldX) : Math.round((this.corridorOriginX || 240) + 240);
    let bx = Math.max(minX, Math.min(maxX, rawX));
    for (let i = 0; i < this.lootBeams.length; i++) {
      if (Math.abs((this.lootBeams[i]?.x || 0) - bx) < 26) {
        bx = Math.max(minX, Math.min(maxX, bx + (i % 2 === 0 ? 34 : -34)));
      }
    }
    const bGy = Math.max(
      this.depthMinY + 20,
      Math.min(this.depthMaxY - 18, Number.isFinite(worldY) ? Math.round(worldY) : this.depthMidY)
    );
    const rarityMeta = GEAR_RARITY_BY_ID?.[item.rarity] || {
      id: item.rarity || 'common',
      tier: 0,
      label: String(item.rarity || 'COMMON').toUpperCase(),
      color: '#94a3b8',
      glowHex: '#cbd5e1',
      beamHeight: 112
    };

    const beam = {
      uid: item.uid || `beam_${++this._encounterSeq}`,
      x: bx,
      groundY: bGy,
      item,
      rarityMeta,
      age: 0,
      maxAge: LOOT_BEAM_MAX_AGE,
      bobPhase: (++this._encounterSeq * 1.37) % (Math.PI * 2),
      collected: false
    };
    this.lootBeams.push(beam);

    const isHighRarity = item.rarity === 'sovereign' || item.rarity === 'mythic';
    if (this.game?.vfx) {
      this.game.vfx.spawnShockwave(bx, bGy - 8, isHighRarity ? 132 : 82, rarityMeta.color || '#facc15', 0.3, true);
      this.game.vfx.spawnBurst(bx, bGy - 36, isHighRarity ? 16 : 8, rarityMeta.glowHex || rarityMeta.color || '#facc15', 180, {
        upBias: 140,
        size: isHighRarity ? 5 : 4
      });
    }
    if (item.rarity === 'mythic') {
      this.game?.audio?.play?.('victory_fanfare', bx);
      this.game?.renderer?.triggerShake?.(6, 0.22);
    } else if (item.rarity === 'sovereign') {
      this.game?.audio?.play?.('holy_hit', bx);
    } else if (item.rarity === 'heroic') {
      this.game?.audio?.play?.('holy_smite', bx);
    } else {
      this.game?.audio?.play?.('reflect', bx);
    }
    return beam;
  }

  collectLootBeam(beam, { silent = false } = {}) {
    if (!beam || beam.collected || !beam.item || !this.gear) return null;
    beam.collected = true;
    const idx = this.lootBeams.indexOf(beam);
    if (idx !== -1) {
      this.lootBeams.splice(idx, 1);
    }

    const res = this.gear.collectDrop(beam.item, { autoEquipEmpty: true });
    if (!res?.ok) return res || null;

    this._syncExternalModifiers(undefined, { preserveBase: true });
    const player = this.game?.leftFighter;
    if (player) {
      this.progression.syncMaxHpWithEconomy(player);
    }

    if (!silent) {
      const rarityMeta = beam.rarityMeta || GEAR_RARITY_BY_ID?.[beam.item.rarity] || {};
      const slotMeta = GEAR_SLOT_META?.[beam.item.slot] || {};
      const rarityLabel = String(rarityMeta.label || beam.item.rarity || 'GEAR').toUpperCase();
      const slotLabel = String(slotMeta.label || beam.item.slot || 'ITEM').toUpperCase();
      const toastText = res.autoEquipped
        ? `EQUIPPED ${rarityLabel} ${slotLabel}!`
        : `${rarityLabel} ${slotLabel}!`;
      const col = rarityMeta.color || '#facc15';
      const topCol = rarityMeta.glowHex || '#ffffff';
      const isHighRarity = beam.item.rarity === 'sovereign' || beam.item.rarity === 'mythic';
      const fxX = Number.isFinite(beam.x) ? beam.x : player?.x ?? this.corridorOriginX;
      const fxY = Number.isFinite(beam.groundY) ? beam.groundY : player?.groundY ?? this.depthMidY;

      this.spawnFloatingCallout(
        fxX,
        fxY - 124,
        toastText,
        col,
        isHighRarity ? 2 : 1,
        isHighRarity ? 1.4 : 1.12,
        { kind: isHighRarity ? 'fever' : 'shard', topColor: topCol }
      );
      if ((res.autoSalvagedDust || 0) > 0) {
        this.spawnFloatingCallout(
          fxX,
          fxY - 96,
          `+${res.autoSalvagedDust} FORGE DUST`,
          '#fde047',
          1,
          0.92,
          { kind: 'gold' }
        );
      }
      if (this.game?.vfx) {
        this.game.vfx.spawnBurst(fxX, fxY - 38, isHighRarity ? 14 : 8, col, 185, {
          upBias: 125,
          size: isHighRarity ? 5 : 4
        });
      }
      this._playCoinPickupChime(fxX, true);
      if (isHighRarity) {
        this.game?.audio?.play?.('holy_hit', fxX);
      }
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }

    return res;
  }

  _collectAllLootBeamsSilent() {
    if (!this.lootBeams.length) return 0;
    let count = 0;
    for (let i = 0; i < this.lootBeams.length; i++) {
      const b = this.lootBeams[i];
      if (!b || b.collected || !b.item) continue;
      b.collected = true;
      if (this.gear && typeof this.gear.collectDrop === 'function') {
        const res = this.gear.collectDrop(b.item, { autoEquipEmpty: true });
        if (res?.ok) count++;
      }
    }
    this.lootBeams = [];
    return count;
  }

  _updateLootBeams(dt, player) {
    if (!this.lootBeams.length) return;
    const px = Number.isFinite(player?.x) ? player.x : null;
    const pGy = player && Number.isFinite(player.groundY || player.y)
      ? player.groundY || player.y
      : this.depthMidY;
    const minActiveX = (this.lockMinX || this.corridorMinX || 60) - 240;

    for (let i = this.lootBeams.length - 1; i >= 0; i--) {
      const b = this.lootBeams[i];
      if (!b || b.collected || !b.item || !Number.isFinite(b.age) || !Number.isFinite(b.x)) {
        this.lootBeams.splice(i, 1);
        continue;
      }
      b.age += dt;
      const withinVacuum =
        px !== null && Math.hypot(px - b.x, pGy - b.groundY) <= LOOT_BEAM_VACUUM_RADIUS;
      const idleAutoCollect =
        b.age >= LOOT_BEAM_AUTO_COLLECT_SEC || b.age >= (b.maxAge || LOOT_BEAM_MAX_AGE);
      const leftBehind = b.x < minActiveX && b.age >= 0.4;

      if (withinVacuum || idleAutoCollect || leftBehind) {
        this.collectLootBeam(b, { silent: false });
      }
    }
  }

  _updateGearNovaFx(dt) {
    if (!this._gearNovaFx.length) return;
    for (let i = this._gearNovaFx.length - 1; i >= 0; i--) {
      const fx = this._gearNovaFx[i];
      if (!fx || !Number.isFinite(fx.age) || !Number.isFinite(fx.maxLife)) {
        this._gearNovaFx.splice(i, 1);
        continue;
      }
      fx.age += dt;
      if (fx.age >= fx.maxLife) {
        this._gearNovaFx.splice(i, 1);
      }
    }
  }

  _triggerBloodReaverKillNova(deadMonster, { splashDamage = true } = {}) {
    if (this._inBloodReaverNova || !deadMonster || !this.gear) return false;
    const gearMods = this.gear.getGearModifiers?.();
    const br = gearMods?.activeSets?.blood_reaver;
    if (!br || !br.active) return false;

    const novaPct = safeBoundedFloat(br.novaPct, 0.05, 2.0, 0.45);
    const lifestealPct = safeBoundedFloat(br.lifestealPct, 0, 0.5, 0.08);
    const ox = deadMonster.isColossalBoss
      ? (deadMonster.anchorX || deadMonster.x) - 105
      : Number.isFinite(deadMonster.x)
        ? deadMonster.x
        : this.corridorOriginX;
    const oy = deadMonster.isColossalBoss
      ? deadMonster.anchorGroundY || this.depthMidY
      : Number.isFinite(deadMonster.groundY || deadMonster.y)
        ? deadMonster.groundY || deadMonster.y
        : this.depthMidY;

    this._inBloodReaverNova = true;
    try {
      const player = this.game?.leftFighter;
      if (player && !player.isDead && lifestealPct > 0 && player.maxHp > 0) {
        const healAmt = safeBoundedInt(player.maxHp * lifestealPct, 1, ENDLESS_MAX_STAT);
        if (typeof player.heal === 'function') {
          player.heal(healAmt, 'BLOOD-REAVER');
        } else {
          player.hp = Math.min(player.maxHp, (player.hp || 0) + healAmt);
        }
      }

      while (this._gearNovaFx.length >= GEAR_NOVA_FX_MAX_COUNT) {
        this._gearNovaFx.shift();
      }
      this._gearNovaFx.push({
        x: Math.round(ox),
        groundY: Math.round(oy),
        maxRadius: BLOOD_REAVER_NOVA_RADIUS,
        empowered: Boolean(br.empowered),
        age: 0,
        maxLife: 0.42
      });

      let hitAny = false;
      if (splashDamage) {
        const baseRefHp = safeBoundedFloat(deadMonster.maxHp, 10, ENDLESS_MAX_STAT, 100);
        const novaDmg = safeBoundedInt(baseRefHp * novaPct, 1, ENDLESS_MAX_STAT);
        const novaAttacker = {
          isGearNova: true,
          isMonster: false,
          team: 1,
          x: ox,
          y: oy,
          groundY: oy,
          facing: 1,
          heroId: 'blood_reaver_nova',
          gainMana() {},
          gainFinisher() {}
        };
        const living = this.getLivingMonsters();
        for (let i = 0; i < living.length; i++) {
          const m = living[i];
          if (!m || m === deadMonster || m.isDead || m.hp <= 0) continue;
          const mx = m.isColossalBoss ? (m.anchorX || m.x) - 105 : m.x;
          const mGy = m.isColossalBoss
            ? m.anchorGroundY || this.depthMidY
            : m.groundY || m.y || this.depthMidY;
          if (Math.hypot(mx - ox, mGy - oy) <= BLOOD_REAVER_NOVA_RADIUS) {
            const knockDir = m.isColossalBoss ? 0 : mx >= ox ? 1 : -1;
            m.takeDamage(novaDmg, novaAttacker, false, knockDir * 36, 0);
            hitAny = true;
            if ((m.isDead || m.hp <= 0) && !m._endlessDeathHandled) {
              m.isDead = true;
              this.onMonsterDeath(m);
            } else if (m === this.bossEntity) {
              this._tryTitanSlayerExecute(m);
            }
          }
        }
      }

      if (hitAny) {
        this.spawnFloatingCallout(ox, oy - 116, 'BLOOD NOVA!', '#f43f5e', 1, 0.85, {
          kind: 'crit',
          topColor: '#fda4af'
        });
      }
      this.game?.audio?.play?.('soul_drain', ox);
      if (this.game?.vfx) {
        this.game.vfx.spawnBurst(ox, oy - 44, br.empowered ? 14 : 9, '#f43f5e', 210, {
          upBias: 95,
          size: 4
        });
      }
      return true;
    } finally {
      this._inBloodReaverNova = false;
    }
  }

  _tryTitanSlayerExecute(boss = this.bossEntity) {
    if (!this.active || !this.isBossEncounter || !boss || boss !== this.bossEntity) return false;
    if (this.trials?.activeTrial?.id === 'malphas_gauntlet') return false;
    if (boss.isDead || boss._endlessDeathHandled || !Number.isFinite(boss.hp) || boss.hp <= 0) {
      return false;
    }
    const gearMods = this.gear?.getGearModifiers?.();
    const ts = gearMods?.activeSets?.titan_slayer;
    if (!ts || !ts.active) return false;

    const threshold = safeBoundedFloat(ts.executeThreshold, 0.05, 0.5, 0.15);
    const maxHp = Math.max(1, Number(boss.maxHp) || 1);
    if (boss.hp / maxHp >= threshold) return false;

    const exX = boss.isColossalBoss
      ? (Number.isFinite(boss.anchorX) ? boss.anchorX : boss.x) - 105
      : Number.isFinite(boss.x)
        ? boss.x
        : this.corridorOriginX + 420;
    const exY = boss.isColossalBoss
      ? boss.anchorGroundY || this.depthMidY
      : boss.groundY || boss.y || this.depthMidY;

    const remainingHp = safeBoundedInt(boss.hp, 1, ENDLESS_MAX_STAT);
    boss.hp = 0;
    boss.isDead = true;
    if (typeof boss.setState === 'function') {
      boss.setState('DEATH');
    }
    this.economy.recordDamageSample('hero', remainingHp);

    this.spawnFloatingCallout(exX, exY - 196, 'TITAN EXECUTE!', '#facc15', 2, 1.55, {
      kind: 'fever',
      topColor: '#ffffff'
    });
    this.game?.renderer?.triggerShake?.(12, 0.36);
    this.game?.audio?.play?.('thunder_slam', exX);
    if (this.game?.vfx) {
      this.game.vfx.spawnShockwave(exX, exY - 24, 230, '#facc15', 0.42, true);
      this.game.vfx.spawnBurst(exX, exY - 72, 24, '#fef08a', 260, { upBias: 150, size: 6 });
    }

    this.onMonsterDeath(boss);
    return true;
  }

  // =========================================================================
  // WAVE 8: INTERACTIVE SHRINES, WANDERING MERCHANT & TEMPEST AUTO-LIGHTNING
  // =========================================================================

  spawnWorldShrine(shrineId = null, x = null, y = null) {
    if (this.worldShrines.length >= WORLD_SHRINE_MAX_ACTIVE) return null;
    let def = shrineId ? ENDLESS_SHRINE_BY_ID?.[shrineId] || null : null;
    if (!def && Array.isArray(ENDLESS_SHRINE_TYPES) && ENDLESS_SHRINE_TYPES.length > 0) {
      def = ENDLESS_SHRINE_TYPES[Math.floor(Math.random() * ENDLESS_SHRINE_TYPES.length)];
    }
    if (!def) return null;

    const minBoundX = this.lockMinX || this.corridorMinX || 60;
    const maxBoundX = Math.max(minBoundX + 180, this.lockMaxX || this.corridorMaxX || 1480);
    const sx = Number.isFinite(x)
      ? Math.max(minBoundX, Math.min(maxBoundX, Math.round(x)))
      : Math.max(
          minBoundX + 72,
          Math.min(
            maxBoundX - 72,
            Math.round((this.corridorOriginX || 240) + 300 + Math.random() * 260)
          )
        );
    const lanePool = [524, 561, 598];
    const rawGy = Number.isFinite(y)
      ? Math.round(y)
      : lanePool[this._encounterSeq % lanePool.length];
    const gy = Math.max(this.depthMinY + 20, Math.min(this.depthMaxY - 20, rawGy));

    const seq = ++this._encounterSeq;
    const shrine = {
      uid: `shrine_${seq}`,
      shrineId: def.id,
      def,
      x: sx,
      groundY: gy,
      age: 0,
      maxAge: WORLD_SHRINE_MAX_AGE,
      pulsePhase: (seq * 1.13) % (Math.PI * 2)
    };
    this.worldShrines.push(shrine);

    if (this.game?.vfx) {
      this.game.vfx.spawnShockwave(sx, gy - 10, 112, def.accentHex || '#facc15', 0.32, true);
      this.game.vfx.spawnBurst(sx, gy - 44, 10, def.glowHex || def.accentHex || '#fef08a', 170, {
        upBias: 120,
        size: 4
      });
    }
    this.spawnFloatingCallout(sx, gy - 118, def.name || 'ARCANE SHRINE', def.accentHex || '#facc15', 1, 1.25, {
      kind: 'shard',
      topColor: def.glowHex || '#ffffff'
    });
    this.game?.audio?.play?.('holy_heal', sx);
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return shrine;
  }

  activateWorldShrine(shrine) {
    if (!shrine || shrine.activated || !this.events || typeof this.events.activateShrine !== 'function') {
      return { ok: false };
    }
    shrine.activated = true;
    const idx = this.worldShrines.indexOf(shrine);
    if (idx !== -1) {
      this.worldShrines.splice(idx, 1);
    }

    const res = this.events.activateShrine(shrine.shrineId);
    if (!res?.ok) {
      return res || { ok: false };
    }

    this._syncExternalModifiers(undefined, { preserveBase: true });
    const player = this.game?.leftFighter;
    if (player) {
      this.progression.syncMaxHpWithEconomy(player);
      if (res.instantFullHeal && !player.isDead && player.maxHp > 0) {
        player.hp = player.maxHp;
      }
    }
    if (shrine.shrineId === 'tempest') {
      this._tempestBoltTimer = 0.25;
    }

    const def = shrine.def || res.shrine || ENDLESS_SHRINE_BY_ID?.[shrine.shrineId] || {};
    const fxX = Number.isFinite(shrine.x) ? shrine.x : player?.x ?? this.corridorOriginX;
    const fxY = Number.isFinite(shrine.groundY) ? shrine.groundY : player?.groundY ?? this.depthMidY;
    const callout = `${def.name || 'SHRINE'} • ${def.shortLabel || 'BLESSING'}!`;

    this.spawnFloatingCallout(fxX, fxY - 134, callout, def.accentHex || '#facc15', 2, 1.45, {
      kind: 'fever',
      topColor: def.glowHex || '#ffffff'
    });
    if (this.game?.vfx) {
      this.game.vfx.spawnShockwave(fxX, fxY - 14, 185, def.accentHex || '#facc15', 0.38, true);
      this.game.vfx.spawnBurst(fxX, fxY - 52, 18, def.glowHex || def.accentHex || '#fef08a', 220, {
        upBias: 150,
        size: 5
      });
    }
    this.game?.audio?.play?.('holy_hit', fxX);
    this.game?.audio?.play?.('victory_fanfare', fxX);
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return res;
  }

  spawnWanderingMerchant(x = null, y = null) {
    if (this.wanderingMerchants.length >= WANDERING_MERCHANT_MAX_ACTIVE) return null;

    const minBoundX = this.lockMinX || this.corridorMinX || 60;
    const maxBoundX = Math.max(minBoundX + 180, this.lockMaxX || this.corridorMaxX || 1480);
    const mx = Number.isFinite(x)
      ? Math.max(minBoundX, Math.min(maxBoundX, Math.round(x)))
      : Math.max(
          minBoundX + 80,
          Math.min(
            maxBoundX - 80,
            Math.round((this.corridorOriginX || 240) + 340 + Math.random() * 240)
          )
        );
    const rawGy = Number.isFinite(y) ? Math.round(y) : this.depthMidY + 18;
    const gy = Math.max(this.depthMinY + 20, Math.min(this.depthMaxY - 20, rawGy));

    const seq = ++this._encounterSeq;
    const merchant = {
      uid: `merchant_${seq}`,
      x: mx,
      groundY: gy,
      age: 0,
      maxAge: WANDERING_MERCHANT_MAX_AGE,
      bobPhase: (seq * 1.27) % (Math.PI * 2),
      interacted: false
    };
    this.wanderingMerchants.push(merchant);

    if (this.game?.vfx) {
      this.game.vfx.spawnShockwave(mx, gy - 10, 108, '#facc15', 0.32, true);
      this.game.vfx.spawnBurst(mx, gy - 44, 12, '#fde047', 165, { upBias: 115, size: 4 });
    }
    this.spawnFloatingCallout(mx, gy - 122, 'ARCANE MERCHANT!', '#fde047', 1, 1.3, {
      kind: 'gold',
      topColor: '#ffffff'
    });
    this.game?.audio?.play?.('clock_gear', mx);
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return merchant;
  }

  interactWanderingMerchant(merchant) {
    if (
      !merchant ||
      merchant.interacted ||
      !this.events ||
      typeof this.events.rollMerchantOffer !== 'function'
    ) {
      return null;
    }
    merchant.interacted = true;
    const idx = this.wanderingMerchants.indexOf(merchant);
    if (idx !== -1) {
      this.wanderingMerchants.splice(idx, 1);
    }

    const offer = this.events.rollMerchantOffer(this.stage, this.economy);
    const fxX = Number.isFinite(merchant.x) ? merchant.x : this.corridorOriginX || 240;
    const fxY = Number.isFinite(merchant.groundY) ? merchant.groundY : this.depthMidY;

    this.spawnFloatingCallout(fxX, fxY - 128, 'ARCANE MERCHANT!', '#facc15', 2, 1.35, {
      kind: 'gold',
      topColor: '#fef08a'
    });
    if (this.game?.vfx) {
      this.game.vfx.spawnBurst(fxX, fxY - 52, 14, '#fde047', 180, { upBias: 120, size: 4 });
    }
    this._playCoinPickupChime(fxX, true);
    this.game?.audio?.play?.('clock_gear', fxX);
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return offer;
  }

  _strikeTempestAutoBolt(target) {
    if (!target || target.isDead || target.hp <= 0) return false;
    const stats = this.economy?.getComputedStats?.() || {};
    const s = Math.max(1, Math.floor(Number(this.stage) || 1));
    const stageScale = Math.pow(1.16, Math.min(200, s - 1));
    const isBoss = Boolean(
      target.isBoss || target.isMiniBoss || target.isEndlessStageBoss || target === this.bossEntity
    );
    let rawDmg =
      (stats.tapBaseDmg || 12) *
      (stats.tapDmgMult || 1) *
      stageScale *
      (stats.feverDmgMult || 1);
    if (isBoss) {
      rawDmg *= stats.bossDmgMult || 1;
    }
    const isCrit = Math.random() < (stats.critChance || 0);
    if (isCrit) {
      rawDmg *= stats.critMult || 1.75;
    }
    const dmg = safeBoundedInt(rawDmg, 1, ENDLESS_MAX_STAT, 10);

    const tx = target.isColossalBoss ? (target.anchorX || target.x) - 105 : target.x;
    const tGy = target.isColossalBoss
      ? target.anchorGroundY || this.depthMidY
      : target.groundY || target.y || this.depthMidY;

    const boltAttacker = {
      isTapSmite: true,
      isMonster: false,
      team: 1,
      x: tx,
      y: tGy,
      groundY: tGy,
      facing: 1,
      heroId: 'tempest_bolt',
      gainMana() {},
      gainFinisher() {}
    };
    const knockDir = target.isColossalBoss ? 0 : target.x >= (this.game?.leftFighter?.x || 0) ? 1 : -1;
    target.takeDamage(dmg, boltAttacker, isCrit, knockDir * 28, 0);
    this.economy.recordDamageSample('tap', dmg);

    if ((target.isDead || target.hp <= 0) && !target._endlessDeathHandled) {
      target.isDead = true;
      this.onMonsterDeath(target);
    } else if (target === this.bossEntity) {
      this._tryTitanSlayerExecute(target);
    }

    this._pushTapSmite({
      x: tx,
      groundY: tGy,
      kind: 'bolt',
      age: 0,
      maxLife: 0.36,
      scale: isCrit ? 1.5 : 1.3
    });
    if (isCrit) {
      this._pushTapSmite({
        x: tx,
        groundY: tGy - 60,
        kind: 'crit',
        age: 0,
        maxLife: 0.34,
        scale: 1.38
      });
    }

    while (this.feverChains.length >= FEVER_CHAIN_MAX_COUNT) {
      this.feverChains.shift();
    }
    const skyY = Math.round(tGy - 250);
    const hitY = Math.round(tGy - 48);
    const boltPts = this._buildPixelChainPoints(tx, skyY, tx, hitY, 2);
    this.feverChains.push({
      x1: Math.round(tx),
      y1: skyY,
      x2: Math.round(tx),
      y2: hitY,
      tier: 2,
      age: 0,
      maxLife: FEVER_CHAIN_LIFE,
      main: boltPts.main,
      branch: boltPts.branch
    });

    this.spawnFloatingCallout(
      tx + (Math.random() * 18 - 9),
      tGy - 116,
      isCrit ? `CRIT ${formatEndlessNumber(dmg)}!` : formatEndlessNumber(dmg),
      isCrit ? '#67e8f9' : '#38bdf8',
      isCrit ? 2 : 1,
      0.82,
      { kind: isCrit ? 'crit' : 'damage', topColor: '#ffffff' }
    );
    if (this.game?.vfx) {
      this.game.vfx.spawnBurst(tx, tGy - 52, isCrit ? 10 : 6, '#38bdf8', 175, {
        upBias: 110,
        size: 4
      });
    }
    this.game?.audio?.play?.(isCrit ? 'raijin_slash' : 'holy_bolt', tx);
    return true;
  }

  _updateWorldEvents(dt, player) {
    const px = Number.isFinite(player?.x) ? player.x : null;
    const pGy =
      player && Number.isFinite(player.groundY || player.y)
        ? player.groundY || player.y
        : this.depthMidY;
    const minActiveX = (this.lockMinX || this.corridorMinX || 60) - 360;

    for (let i = this.worldShrines.length - 1; i >= 0; i--) {
      const s = this.worldShrines[i];
      if (!s || s.activated || !Number.isFinite(s.x) || !Number.isFinite(s.age)) {
        this.worldShrines.splice(i, 1);
        continue;
      }
      s.age += dt;
      s.pulsePhase = (s.pulsePhase || 0) + dt * 4.2;
      if (px !== null && Math.hypot(px - s.x, pGy - s.groundY) <= WORLD_EVENT_PROXIMITY_RADIUS) {
        this.activateWorldShrine(s);
        continue;
      }
      if (s.age >= (s.maxAge || WORLD_SHRINE_MAX_AGE) || (s.x < minActiveX && s.age >= 1.5)) {
        this.worldShrines.splice(i, 1);
      }
    }

    for (let i = this.wanderingMerchants.length - 1; i >= 0; i--) {
      const m = this.wanderingMerchants[i];
      if (!m || m.interacted || !Number.isFinite(m.x) || !Number.isFinite(m.age)) {
        this.wanderingMerchants.splice(i, 1);
        continue;
      }
      m.age += dt;
      m.bobPhase = (m.bobPhase || 0) + dt * 3.2;
      if (px !== null && Math.hypot(px - m.x, pGy - m.groundY) <= WORLD_EVENT_PROXIMITY_RADIUS) {
        this.interactWanderingMerchant(m);
        continue;
      }
      if (m.age >= (m.maxAge || WANDERING_MERCHANT_MAX_AGE) || (m.x < minActiveX && m.age >= 1.5)) {
        this.wanderingMerchants.splice(i, 1);
      }
    }

    // Altar of Tempest Auto-Lightning strikes a random living monster/boss every 1.1s
    const eventMods = this.events?.getEventModifiers?.() || null;
    const boltInterval =
      Number.isFinite(eventMods?.autoLightningIntervalSec) && eventMods.autoLightningIntervalSec > 0
        ? eventMods.autoLightningIntervalSec
        : 0;
    if (boltInterval > 0) {
      this._tempestBoltTimer -= dt;
      if (this._tempestBoltTimer <= 0) {
        const living = this.getLivingMonsters();
        if (living.length > 0) {
          this._tempestBoltTimer = boltInterval;
          const target = living[Math.floor(Math.random() * living.length)];
          this._strikeTempestAutoBolt(target);
        } else {
          this._tempestBoltTimer = 0.15;
        }
      }
    } else {
      this._tempestBoltTimer = 0;
    }
  }

  _computeTapSmiteWithPrism(isBoss = false) {
    const feverBonusSec = Math.max(
      0,
      Number(this.economy?._externalModifiers?.feverDurationBonusSec) || 0
    );
    const prevFeverTimer = Number(this.economy?.tapFeverTimer) || 0;
    const smite = this.economy.computeTapSmiteHit(this.stage, { isBoss, feverBonusSec }) || {
      damage: 12,
      isCrit: false,
      feverActive: false,
      feverTier: 0,
      feverTriggered: false,
      goldBonus: 0
    };
    // Safe fallback only when EndlessEconomy has not yet adopted tapFeverMaxDuration internally
    if (
      smite.feverTriggered &&
      feverBonusSec > 0 &&
      this.economy &&
      !Number.isFinite(this.economy.tapFeverMaxDuration)
    ) {
      if ((smite.feverTier || 0) >= 2) {
        const tier2Cap = 9.5 + feverBonusSec;
        this.economy.tapFeverTimer = Math.max(
          prevFeverTimer,
          Math.min(tier2Cap, prevFeverTimer + 2.5)
        );
      } else {
        this.economy.tapFeverTimer = Math.max(this.economy.tapFeverTimer || 0, 7.5 + feverBonusSec);
      }
    }
    return smite;
  }

  _registerChestTapSmite() {
    const feverBonusSec = Math.max(
      0,
      Number(this.economy?._externalModifiers?.feverDurationBonusSec) || 0
    );
    let res = {
      feverActive: (this.economy?.tapFeverTimer || 0) > 0,
      feverTier: this.economy?.tapFeverLevel || 0,
      feverTriggered: false
    };
    if (typeof this.economy?.registerTapSmite === 'function') {
      const reg = this.economy.registerTapSmite(feverBonusSec);
      if (reg && typeof reg === 'object') {
        res = {
          feverActive: Boolean(reg.feverActive ?? (this.economy.tapFeverTimer || 0) > 0),
          feverTier: Number(reg.feverTier ?? this.economy.tapFeverLevel) || 0,
          feverTriggered: Boolean(reg.feverTriggered)
        };
      }
    } else if (this.economy) {
      this.economy.totalTaps = (this.economy.totalTaps || 0) + 1;
      if ((this.economy.tapFeverTimer || 0) <= 0) {
        const gain = 7 + Math.floor(Math.random() * 4);
        this.economy.tapFever = Math.min(100, (this.economy.tapFever || 0) + gain);
        if (this.economy.tapFever >= 100) {
          this.economy.tapFever = 100;
          this.economy.tapFeverTimer = 7.5 + feverBonusSec;
          this.economy.tapFeverLevel = 1;
          this.economy._feverTapCount = 0;
          res = { feverActive: true, feverTier: 1, feverTriggered: true };
        }
      } else {
        this.economy._feverTapCount = (this.economy._feverTapCount || 0) + 1;
        this.economy.tapFever = 100;
        if (this.economy.tapFeverLevel === 1 && this.economy._feverTapCount >= 10) {
          this.economy.tapFeverLevel = 2;
          const cap = 9.5 + feverBonusSec;
          this.economy.tapFeverTimer = Math.max(
            this.economy.tapFeverTimer,
            Math.min(cap, this.economy.tapFeverTimer + 2.5)
          );
          res = { feverActive: true, feverTier: 2, feverTriggered: true };
        } else {
          res = {
            feverActive: true,
            feverTier: this.economy.tapFeverLevel || 1,
            feverTriggered: false
          };
        }
      }
    }
    this._recordBounty('taps', 1);
    return res;
  }

  _handleTapFeverTriggered(smite, fxX, fxGy) {
    this._recordBounty('fevers', 1);
    this._pushFeverBurst({
      x: fxX,
      groundY: fxGy - 36,
      age: 0,
      maxLife: 0.56,
      scale: 1.95
    });
    this._feverStampPopTimer = 0.28;
    const tier = Math.max(1, smite?.feverTier || this.economy?.tapFeverLevel || 1);
    this._lastFeverTier = tier;
    const tierLabel = tier >= 2 ? 'OVERDRIVE 3X GOLD!' : 'FEVER 2X GOLD!';
    const tierSub =
      tier >= 2 ? '3X GOLD & CHAIN LIGHTNING SURGE!' : '2X GOLD & CHAIN LIGHTNING!';
    this.showBanner(tierLabel, tierSub, tier >= 2 ? '#38bdf8' : '#facc15', 2.0);
    this.spawnFloatingCallout(
      fxX,
      fxGy - 156,
      tierLabel,
      tier >= 2 ? '#38bdf8' : '#facc15',
      2,
      1.25,
      { kind: 'fever', topColor: '#fef9c3' }
    );
    this.game?.renderer?.triggerShake?.(9, 0.24);
    this.game?.audio?.play?.('thunder_slam', fxX);
  }

  _applyTapSmiteChainLightning(primaryTarget, tx, tGy, dmg) {
    const feverActive = (this.economy?.tapFeverTimer || 0) > 0;
    const feverTier = feverActive ? ((this.economy?.tapFeverLevel || 0) >= 2 ? 2 : 1) : 0;
    const dirMods =
      this._activeDirectorMods ||
      this.bossDirector?.getDirectorSnapshot?.(this.stage, this.bestStage, this.getCurrentRealm())?.combinedModifiers ||
      null;
    const gearMods = this.gear?.getGearModifiers?.() || null;
    const stormSet = gearMods?.activeSets?.stormcaller || null;
    const stormActive = Boolean(stormSet?.active);
    const stormJumps = stormActive ? Math.max(1, Math.floor(Number(stormSet.extraJumps) || 3)) : 0;
    const stormDmgMult =
      stormActive && Number.isFinite(stormSet.dmgMult) && stormSet.dmgMult > 0
        ? stormSet.dmgMult
        : 1.0;

    const alwaysChain = Boolean(dirMods?.alwaysTapChain);
    const extraChainTargets = Math.max(0, Math.floor(Number(dirMods?.extraChainTargets) || 0));
    const effectiveChainTier = feverTier >= 1 ? feverTier : alwaysChain || stormActive ? 2 : 0;
    if (!((feverActive && feverTier >= 1) || alwaysChain || stormActive)) {
      return 0;
    }

    const candidates = [];
    const postLiving = this.getLivingMonsters();
    const chainRange = stormActive ? Math.max(FEVER_CHAIN_MAX_RANGE, 480) : FEVER_CHAIN_MAX_RANGE;
    for (let i = 0; i < postLiving.length; i++) {
      const m = postLiving[i];
      if (!m || m === primaryTarget || m.isDead) continue;
      const mx = m.isColossalBoss ? (m.anchorX || m.x) - 105 : m.x;
      const mGy = m.isColossalBoss
        ? m.anchorGroundY || this.depthMidY
        : m.groundY || m.y || this.depthMidY;
      const dist = Math.hypot(mx - tx, mGy - tGy);
      if (dist <= chainRange) {
        candidates.push({ target: m, isGoblin: false, mx, mGy, dist });
      }
    }
    for (let i = 0; i < this.treasureGoblins.length; i++) {
      const g = this.treasureGoblins[i];
      if (!g || g === primaryTarget || g.isDead) continue;
      const dist = Math.hypot(g.x - tx, g.groundY - tGy);
      if (dist <= chainRange) {
        candidates.push({ target: g, isGoblin: true, mx: g.x, mGy: g.groundY, dist });
      }
    }
    candidates.sort((a, b) => a.dist - b.dist);

    const baseTargets =
      (feverActive && feverTier >= 1) || alwaysChain
        ? FEVER_CHAIN_MAX_TARGETS + extraChainTargets
        : 0;
    const maxChainTargets = stormActive
      ? Math.max(stormJumps, baseTargets + (stormSet.empowered ? 2 : 1))
      : baseTargets;
    const chainCount = Math.min(maxChainTargets, candidates.length);
    const chainDmg = safeBoundedInt(
      dmg * FEVER_CHAIN_SPLASH_RATIO * stormDmgMult,
      1,
      ENDLESS_MAX_STAT
    );

    let chainedHits = 0;
    for (let ci = 0; ci < chainCount; ci++) {
      const entry = candidates[ci];
      const cm = entry.target;
      if (!cm || cm.isDead) continue;
      const chainAttacker = {
        isTapSmite: true,
        isMonster: false,
        team: 1,
        x: entry.mx,
        y: entry.mGy,
        groundY: entry.mGy,
        facing: entry.mx >= tx ? 1 : -1,
        heroId: 'tap_smite',
        gainMana() {},
        gainFinisher() {}
      };
      if (entry.isGoblin) {
        this._damageTreasureGoblin(cm, chainDmg, chainAttacker, false, {
          isTap: true,
          doubleGoldSpray: false
        });
      } else {
        const cKnockDir = cm.isColossalBoss ? 0 : entry.mx >= tx ? 1 : -1;
        cm.takeDamage(chainDmg, chainAttacker, false, cKnockDir * 24, 0);
        if ((cm.isDead || cm.hp <= 0) && !cm._endlessDeathHandled) {
          cm.isDead = true;
          this.onMonsterDeath(cm);
        } else if (cm === this.bossEntity) {
          this._tryTitanSlayerExecute(cm);
        }
      }
      this.economy.recordDamageSample('tap', chainDmg);
      chainedHits++;

      while (this.feverChains.length >= FEVER_CHAIN_MAX_COUNT) {
        this.feverChains.shift();
      }
      const boltPts = this._buildPixelChainPoints(
        tx,
        tGy - 62,
        entry.mx,
        entry.mGy - 62,
        effectiveChainTier
      );
      this.feverChains.push({
        x1: Math.round(tx),
        y1: Math.round(tGy - 62),
        x2: Math.round(entry.mx),
        y2: Math.round(entry.mGy - 62),
        tier: effectiveChainTier,
        age: 0,
        maxLife: FEVER_CHAIN_LIFE,
        main: boltPts.main,
        branch: boltPts.branch
      });

      this.spawnFloatingCallout(
        entry.mx + (Math.random() * 18 - 9),
        entry.mGy - 104,
        formatEndlessNumber(chainDmg),
        effectiveChainTier >= 2 ? '#67e8f9' : '#fde047',
        1,
        0.74,
        { kind: 'damage', topColor: '#ffffff' }
      );
      if (this.game?.vfx) {
        this.game.vfx.spawnBurst(
          entry.mx,
          entry.mGy - 56,
          6,
          effectiveChainTier >= 2 ? '#38bdf8' : '#facc15',
          155,
          { upBias: 95, size: 4 }
        );
      }
    }
    return chainedHits;
  }

  handleCanvasTap(worldX, worldY, _screenX = 0, _screenY = 0) {
    if (!this.active || this.game?.isPaused || this.game?.isLandingOpen || this.isBlockingModalOpen()) {
      return { hit: false };
    }

    const wx = Number.isFinite(worldX) ? worldX : this.game?.leftFighter?.x || this.corridorOriginX;
    const rawWy = Number.isFinite(worldY) ? worldY : this.depthMidY;
    const wy = Math.max(this.depthMinY, Math.min(this.depthMaxY, rawWy));

    // 1. Immediately magnetize Sovereign Gold Coins within 220px toward the hero!
    let scooped = 0;
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (!c) continue;
      const d = Math.hypot(c.x - wx, (c.groundY || c.y) - wy);
      if (d <= 220) {
        c.magnetForced = true;
        scooped++;
      }
    }

    // 1b. Snappy Gear Loot Beam tap-collect (92px horizontal x 140px vertical pillar window)
    let lootCollected = 0;
    if (this.lootBeams.length > 0) {
      for (let i = this.lootBeams.length - 1; i >= 0; i--) {
        const b = this.lootBeams[i];
        if (!b || b.collected) continue;
        const dxBeam = Math.abs(b.x - wx);
        const dyFromBase = b.groundY - rawWy;
        if (
          dxBeam <= LOOT_BEAM_TAP_HALF_X &&
          dyFromBase >= -48 &&
          dyFromBase <= LOOT_BEAM_TAP_HEIGHT_Y + 36
        ) {
          const colRes = this.collectLootBeam(b, { silent: false });
          if (colRes?.ok) lootCollected++;
        }
      }
    }

    // 1c. Wave 8 Interactive World Shrines (88px tap radius)
    if (this.worldShrines.length > 0) {
      let bestShrine = null;
      let bestShrineDist = WORLD_EVENT_TAP_RADIUS + 0.001;
      for (let i = 0; i < this.worldShrines.length; i++) {
        const s = this.worldShrines[i];
        if (!s || s.activated) continue;
        const dBody = Math.hypot(s.x - wx, (s.groundY - 42) - rawWy);
        const dFeet = Math.hypot(s.x - wx, s.groundY - rawWy);
        const d = Math.min(dBody, dFeet);
        if (d <= WORLD_EVENT_TAP_RADIUS && d < bestShrineDist) {
          bestShrineDist = d;
          bestShrine = s;
        }
      }
      if (bestShrine) {
        const shrineResult = this.activateWorldShrine(bestShrine);
        return {
          hit: true,
          hitKind: 'shrine',
          shrine: bestShrine,
          shrineResult,
          lootCollected,
          scooped
        };
      }
    }

    // 1d. Wave 8 Wandering Arcane Merchant (88px tap radius)
    if (this.wanderingMerchants.length > 0) {
      let bestMerchant = null;
      let bestMerchantDist = WORLD_EVENT_TAP_RADIUS + 0.001;
      for (let i = 0; i < this.wanderingMerchants.length; i++) {
        const m = this.wanderingMerchants[i];
        if (!m || m.interacted) continue;
        const dBody = Math.hypot(m.x - wx, (m.groundY - 42) - rawWy);
        const dFeet = Math.hypot(m.x - wx, m.groundY - rawWy);
        const d = Math.min(dBody, dFeet);
        if (d <= WORLD_EVENT_TAP_RADIUS && d < bestMerchantDist) {
          bestMerchantDist = d;
          bestMerchant = m;
        }
      }
      if (bestMerchant) {
        const merchantOffer = this.interactWanderingMerchant(bestMerchant);
        return {
          hit: true,
          hitKind: 'merchant',
          merchant: bestMerchant,
          merchantOffer,
          lootCollected,
          scooped
        };
      }
    }

    // 2. PRIORITY FIRST: Check living Gilded Treasure Goblins (generous 96px tap radius)
    if (this.treasureGoblins.length > 0) {
      let bestGoblin = null;
      let bestGoblinDist = GOBLIN_TAP_RADIUS + 0.001;
      for (let i = 0; i < this.treasureGoblins.length; i++) {
        const g = this.treasureGoblins[i];
        if (!g || g.isDead) continue;
        const dBody = Math.hypot(g.x - wx, (g.groundY - 38) - rawWy);
        const dFeet = Math.hypot(g.x - wx, g.groundY - rawWy);
        const d = Math.min(dBody, dFeet);
        if (d <= GOBLIN_TAP_RADIUS && d < bestGoblinDist) {
          bestGoblinDist = d;
          bestGoblin = g;
        }
      }
      if (bestGoblin) {
        const smite = this._computeTapSmiteWithPrism(false);
        this._recordBounty('taps', 1);
        const dmg = safeBoundedInt(smite.damage, 1, ENDLESS_MAX_STAT, 10);
        const gx = bestGoblin.x;
        const gGy = bestGoblin.groundY;
        const tapAttacker = {
          isTapSmite: true,
          isMonster: false,
          team: 1,
          x: gx,
          y: gGy,
          groundY: gGy,
          facing: 1,
          heroId: 'tap_smite',
          gainMana() {},
          gainFinisher() {}
        };
        this._damageTreasureGoblin(bestGoblin, dmg, tapAttacker, Boolean(smite.isCrit), {
          isTap: true,
          doubleGoldSpray: true
        });
        const chainedHits = this._applyTapSmiteChainLightning(bestGoblin, gx, gGy, dmg);

        this._pushTapSmite({
          x: gx,
          groundY: gGy,
          kind: 'bolt',
          age: 0,
          maxLife: 0.38,
          scale: smite.isCrit ? 1.55 : 1.32
        });
        if (smite.isCrit) {
          this._pushTapSmite({
            x: gx,
            groundY: gGy - 52,
            kind: 'crit',
            age: 0,
            maxLife: 0.36,
            scale: 1.45
          });
        }
        if (smite.feverTriggered) {
          this._handleTapFeverTriggered(smite, gx, gGy);
        } else {
          this.game?.renderer?.triggerShake?.(smite.isCrit ? 6 : 3.5, 0.14);
          this.game?.audio?.play?.(smite.isCrit ? 'raijin_slash' : 'holy_bolt', gx);
        }
        if ((smite.goldBonus || 0) > 0) {
          this.spawnGoldCoins(gx, gGy, safeBoundedInt(smite.goldBonus, 1, ENDLESS_MAX_STAT), {
            count: smite.feverTier >= 2 ? 3 : 1,
            isBoss: false,
            applyMult: true
          });
        }
        const dmgLabel = smite.isCrit ? `CRIT ${formatEndlessNumber(dmg)}!` : formatEndlessNumber(dmg);
        this.spawnFloatingCallout(
          gx + (Math.random() * 20 - 10),
          gGy - 108,
          dmgLabel,
          smite.isCrit ? '#fb923c' : '#fde047',
          smite.isCrit ? 2 : 1,
          0.9,
          { kind: smite.isCrit ? 'crit' : 'gold', topColor: '#ffffff' }
        );
        return {
          hit: true,
          hitKind: 'goblin',
          goblin: bestGoblin,
          goblinSlain: Boolean(bestGoblin.isDead),
          target: bestGoblin,
          damage: dmg,
          isCrit: Boolean(smite.isCrit),
          feverActive: Boolean(smite.feverActive),
          feverTriggered: Boolean(smite.feverTriggered),
          chainedHits,
          lootCollected,
          scooped
        };
      }
    }

    // 3. PRIORITY SECOND: Check active Milestone Stage Treasure Chests (98px tap radius)
    if (this.treasureChests.length > 0) {
      let bestChest = null;
      let bestChestDist = CHEST_TAP_RADIUS + 0.001;
      for (let i = 0; i < this.treasureChests.length; i++) {
        const ch = this.treasureChests[i];
        if (!ch || ch.opened) continue;
        const dBody = Math.hypot(ch.x - wx, (ch.groundY - 34) - rawWy);
        const dFeet = Math.hypot(ch.x - wx, ch.groundY - rawWy);
        const d = Math.min(dBody, dFeet);
        if (d <= CHEST_TAP_RADIUS && d < bestChestDist) {
          bestChestDist = d;
          bestChest = ch;
        }
      }
      if (bestChest) {
        const chestTap = this._registerChestTapSmite();
        const crackRes = this._crackTreasureChest(bestChest, true);
        this._pushTapSmite({
          x: bestChest.x,
          groundY: bestChest.groundY,
          kind: 'bolt',
          age: 0,
          maxLife: 0.30,
          scale: 1.18
        });
        if (chestTap.feverTriggered) {
          this._handleTapFeverTriggered(chestTap, bestChest.x, bestChest.groundY);
        } else {
          this.game?.renderer?.triggerShake?.(3.5, 0.12);
        }
        return {
          hit: true,
          hitKind: 'chest',
          chest: bestChest,
          chestOpened: Boolean(crackRes.opened),
          tapsLeft: crackRes.tapsLeft,
          feverActive: Boolean(chestTap.feverActive),
          feverTriggered: Boolean(chestTap.feverTriggered),
          lootCollected,
          scooped
        };
      }
    }

    // 4. Find nearest alive monster within 260px of tap, else nearest alive monster on screen
    const living = this.getLivingMonsters();
    let target = null;
    let bestNearDist = 260;
    let fallbackTarget = null;
    let bestFallbackDist = Infinity;

    const camX = this.game?.renderer?.camX ?? wx;
    const halfView =
      this.game?.renderer && this.game.renderer.width > 0
        ? (this.game.renderer.width * 0.5) / Math.max(0.25, this.game.renderer.zoom || 0.76) + 120
        : 900;

    for (let i = 0; i < living.length; i++) {
      const m = living[i];
      if (!m || m.isDead) continue;
      const mx = m.isColossalBoss ? (m.anchorX || m.x) - 105 : m.x;
      const my = m.isColossalBoss ? (m.anchorGroundY || this.depthMidY) - 85 : (m.groundY || m.y) - 54;
      const d = Math.hypot(mx - wx, my - wy);
      const nearCap = m.isColossalBoss ? 340 : 260;
      if (d <= nearCap && d < bestNearDist) {
        bestNearDist = d;
        target = m;
      }
      if (Math.abs(mx - camX) <= halfView && d < bestFallbackDist) {
        bestFallbackDist = d;
        fallbackTarget = m;
      }
    }
    if (!target) {
      target = fallbackTarget || living[0] || null;
    }

    if (!target) {
      if (lootCollected > 0) {
        return { hit: true, hitKind: 'loot', lootCollected, scooped };
      }
      // Visual sky-bolt tap spark on empty ground
      this._pushTapSmite({
        x: wx,
        groundY: wy,
        kind: 'bolt',
        age: 0,
        maxLife: 0.34,
        scale: 1.05
      });
      this.game?.audio?.play?.('holy_bolt', wx);
      return { hit: false, lootCollected: 0, scooped };
    }

    const isBoss = Boolean(
      target.isBoss || target.isMiniBoss || target.isEndlessStageBoss || target === this.bossEntity
    );
    const smite = this._computeTapSmiteWithPrism(isBoss);
    this._recordBounty('taps', 1);
    const dmg = safeBoundedInt(smite.damage, 1, ENDLESS_MAX_STAT, 10);
    const tx = target.isColossalBoss ? (target.anchorX || target.x) - 105 : target.x;
    const tGy = target.isColossalBoss ? target.anchorGroundY || this.depthMidY : target.groundY || target.y || this.depthMidY;

    const tapAttacker = {
      isTapSmite: true,
      isMonster: false,
      team: 1,
      x: tx,
      y: tGy,
      groundY: tGy,
      facing: 1,
      heroId: 'tap_smite',
      gainMana() {},
      gainFinisher() {}
    };

    const knockDir = target.isColossalBoss ? 0 : target.x >= (this.game?.leftFighter?.x || 0) ? 1 : -1;
    target.takeDamage(dmg, tapAttacker, Boolean(smite.isCrit), knockDir * 42, 0);
    if ((target.isDead || target.hp <= 0) && !target._endlessDeathHandled) {
      target.isDead = true;
      this.onMonsterDeath(target);
    } else if (target === this.bossEntity) {
      this._tryTitanSlayerExecute(target);
    }

    // Tap-Fever Overdrive, Tempest Surge & Mythic Stormcaller Chain Lightning
    const chainedHits = this._applyTapSmiteChainLightning(target, tx, tGy, dmg);

    // Spawn TAP_SMITE_SKYBOLT (Row 2)
    this._pushTapSmite({
      x: tx,
      groundY: tGy,
      kind: 'bolt',
      age: 0,
      maxLife: 0.38,
      scale: smite.isCrit ? 1.55 : 1.32
    });

    // Spawn CRIT_STARBURST (Row 3) when critical hit
    if (smite.isCrit) {
      this._pushTapSmite({
        x: tx,
        groundY: tGy - 62,
        kind: 'crit',
        age: 0,
        maxLife: 0.36,
        scale: 1.45
      });
    }

    // Spawn GOLD_FEVER_BURST (Row 4) when Tap-Fever Overdrive triggers!
    if (smite.feverTriggered) {
      this._handleTapFeverTriggered(smite, tx, tGy);
    } else {
      this.game?.audio?.play?.(smite.isCrit ? 'raijin_slash' : 'holy_bolt', tx);
    }

    // Fever Bonus Gold Coins!
    if ((smite.goldBonus || 0) > 0) {
      this.spawnGoldCoins(tx, tGy, safeBoundedInt(smite.goldBonus, 1, ENDLESS_MAX_STAT), {
        count: smite.feverTier >= 2 ? 3 : 1,
        isBoss: false,
        applyMult: true
      });
    }

    const dmgLabel = smite.isCrit
      ? `CRIT ${formatEndlessNumber(dmg)}!`
      : formatEndlessNumber(dmg);
    this.spawnFloatingCallout(
      tx + (Math.random() * 24 - 12),
      tGy - 118,
      dmgLabel,
      smite.isCrit ? '#fb923c' : '#38bdf8',
      smite.isCrit ? 2 : 1,
      smite.isCrit ? 0.96 : 0.80,
      {
        kind: smite.isCrit ? 'crit' : 'damage',
        topColor: smite.isCrit ? '#fef08a' : '#e0f2fe'
      }
    );

    if (this.game?.vfx) {
      this.game.vfx.spawnBurst(tx, tGy - 58, smite.isCrit ? 12 : 6, smite.isCrit ? '#facc15' : '#38bdf8', 180, {
        upBias: 110,
        size: 4
      });
    }

    return {
      hit: true,
      target,
      damage: dmg,
      isCrit: Boolean(smite.isCrit),
      feverActive: Boolean(smite.feverActive),
      feverTriggered: Boolean(smite.feverTriggered),
      chainedHits,
      lootCollected,
      scooped
    };
  }

  // =========================================================================
  // CONTROLS, AUTO-PLAY AI & PURE 3D DODGE
  // =========================================================================

  setJoystickVector(dx, dy, active = true) {
    if (!active) {
      this.joyVec = { x: 0, y: 0, active: false };
    } else {
      const mag = Math.hypot(dx || 0, dy || 0);
      const scale = mag > 1 ? 1 / mag : 1;
      this.joyVec = { x: (dx || 0) * scale, y: (dy || 0) * scale, active: true };
    }
    this.syncJoystickKnobUI();
  }

  setMoveInput(dir, pressed) {
    if (dir < 0) this.keys.uiLeft = Boolean(pressed);
    if (dir > 0) this.keys.uiRight = Boolean(pressed);
    this.syncJoystickKnobUI();
  }

  setDepthInput(dir, pressed) {
    if (dir < 0) this.keys.uiUp = Boolean(pressed);
    if (dir > 0) this.keys.uiDown = Boolean(pressed);
    this.syncJoystickKnobUI();
  }

  setAttackHeld(held) {
    this.attackHeld = Boolean(held);
  }

  triggerAction(action) {
    if (!this.active || this.game?.isMatchOver) return;
    this.queuedAction = action;
    this.queuedActionTimer = action === 'attack' ? 0.62 : 0.48;
  }

  setAutoPlay(val, playSound = false) {
    this.autoPlay = Boolean(val);
    const player = this.game?.leftFighter;
    if (player) {
      player.adventureAutoPlay = this.autoPlay;
      if (this.autoPlay) {
        player._manualWalkActive = false;
      }
    }
    this.syncControlDeckUI();
    if (playSound && this.game?.audio) {
      this.game.audio.play('clock_gear', player ? player.x : 600);
    }
  }

  toggleAutoPlay(playSound = true) {
    this.setAutoPlay(!this.autoPlay, playSound);
  }

  setTargetLock(enabled, playSound = false) {
    this.manualTargetLock = Boolean(enabled);
    const player = this.game?.leftFighter;
    if (this.manualTargetLock) {
      this.lockedMonster = this.getNearestLivingMonster(player);
    } else {
      this.lockedMonster = null;
      this._comboLockTarget = null;
    }
    this.syncControlDeckUI();
    if (playSound && this.game?.audio) {
      this.game.audio.play('clock_gear', player ? player.x : 600);
    }
  }

  toggleTargetLock(playSound = true) {
    this.setTargetLock(!this.manualTargetLock, playSound);
  }

  getActiveLockedMonster(player = this.game?.leftFighter) {
    if (!this.manualTargetLock) {
      this.lockedMonster = null;
      return null;
    }
    if (
      this.lockedMonster &&
      !this.lockedMonster.isDead &&
      (!this.game?.fighters || this.game.fighters.includes(this.lockedMonster))
    ) {
      return this.lockedMonster;
    }
    this.lockedMonster = this.getNearestLivingMonster(player);
    return this.lockedMonster;
  }

  shiftEntityDepth(entity, dz) {
    if (!entity || !Number.isFinite(dz) || dz === 0) return 0;
    const prevGy = Number.isFinite(entity.groundY) ? entity.groundY : this.depthMidY;
    const nextGy = Math.max(this.depthMinY, Math.min(this.depthMaxY, prevGy + dz));
    const applied = nextGy - prevGy;
    if (applied === 0) return 0;
    entity.groundY = nextGy;
    entity.y += applied;
    if (Array.isArray(entity.capeNodes)) {
      for (const n of entity.capeNodes) {
        if (n) n.y += applied;
      }
    }
    return applied;
  }

  getLivingMonsters() {
    if (!Array.isArray(this.game?.fighters)) return [];
    return this.game.fighters.filter((f) => f && f.team === 2 && !f.isDead);
  }

  getNearestLivingMonster(player) {
    const living = this.getLivingMonsters();
    if (!living.length) return null;
    if (!player) return living[0];
    const pGy = player.groundY || player.y || this.depthMidY;
    let best = living[0];
    let bestScore = Infinity;
    for (let i = 0; i < living.length; i++) {
      const m = living[i];
      const mGy = m.groundY || m.y || this.depthMidY;
      const depthDist = m.isColossalBoss ? 0 : (mGy - pGy) * 1.5;
      const score = Math.hypot(m.x - player.x, depthDist) - (m.isEndlessStageBoss ? 48 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  finishHeroAdventureDodge(player, returnToIdle = true) {
    if (!player) return;
    player._advPureDodge = false;
    player._advDodgeFrameOverride = null;
    player._advDodgeGhostStep = 0;
    player.isInvulnerable = (this._phoenixInvulnTimer || 0) > 0;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY;
    player.isAngelicAscent = false;
    player.wraithAlpha = 1.0;
    if (returnToIdle && !player.isDead && player.state === 'DODGE') {
      player.setState('IDLE');
    }
  }

  startHeroAdventureDodge(player, evadeX, evadeZ, stats) {
    if (!player) return;
    if (Math.abs(evadeX) > 0.15) {
      player.facing = evadeX > 0 ? 1 : -1;
    }
    this.dodgeCdMax = Math.max(0.45, 1.25 * (stats?.mobilityCdMult ?? 1));
    player.dodgeCooldown = this.dodgeCdMax;
    player.dashDir = evadeX >= 0 ? 1 : -1;
    player._advPureDodge = true;
    player._advPureDodgeTimer = 0;
    player._advPureDodgeDur = 0.26;
    player._advPureDodgeDirX = evadeX;
    player._advPureDodgeDirZ = evadeZ;
    player._advDodgeFrameOverride = 183;
    player.setState('DODGE');
    player._advPureDodge = true;
    player.dashDuration = 0.26;
    player.isInvulnerable = true;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY;
    this.progression.gainSpirit(16);
    this.game?.audio?.play?.('dash_whoosh', player.x);
    this.game?.vfx?.spawnShockwave?.(player.x, player.groundY - 6, 54, '#38bdf8', 0.18, true);
  }

  updateHeroAdventureDodge(dt, player) {
    player._manualWalkActive = false;
    player._manualSpeedRatio = 0;
    if (player.isDead || player.state !== 'DODGE') {
      this.finishHeroAdventureDodge(player, false);
      return false;
    }
    player._advPureDodgeTimer = (player._advPureDodgeTimer || 0) + dt;
    const dur = player._advPureDodgeDur || 0.26;
    const u = Math.min(1, player._advPureDodgeTimer / dur);
    const speedScale = 1.38 * (1 - 0.52 * u * u);
    player.x += (player._advPureDodgeDirX || 0) * 580 * speedScale * dt;
    this.shiftEntityDepth(player, (player._advPureDodgeDirZ || 0) * 340 * speedScale * dt);
    player._advDodgeFrameOverride = 182 + Math.min(24, Math.floor(u * 25));
    const liftY = Math.sin(u * Math.PI) * 14;
    player.isInvulnerable = true;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY - liftY;

    this.skillSets.beginPlayerStep(dt, player, null, true, player._advPureDodgeDirZ || 0);
    player.update(dt, null, this.game);
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY - liftY;

    if (player._advPureDodgeTimer >= dur) {
      this.finishHeroAdventureDodge(player, true);
    }
    return true;
  }

  _hasManualDirectionalInput() {
    if (this.joyVec.active && Math.hypot(this.joyVec.x, this.joyVec.y) > 0.08) return true;
    return Boolean(
      this.keys.left ||
        this.keys.right ||
        this.keys.up ||
        this.keys.down ||
        this.keys.uiLeft ||
        this.keys.uiRight ||
        this.keys.uiUp ||
        this.keys.uiDown
    );
  }

  _processPlayerStep(dt, player, target) {
    player.isPlayerControlled = true;
    player.isManualAdventureControl = true;
    player.adventureAutoPlay = this.autoPlay;

    if (this.queuedActionTimer > 0) {
      this.queuedActionTimer = Math.max(0, this.queuedActionTimer - dt);
      if (this.queuedActionTimer <= 0) this.queuedAction = null;
    }

    if (player.state === 'AUTO_ATTACK') {
      this.comboResetTimer = 1.85;
    } else if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
      if (this.comboResetTimer <= 0) {
        this._comboLockTarget = null;
        if (player.hasHackAndSlashCombo?.()) player.comboStep = 0;
      }
    }

    const stats = this.progression.getComputedStats();

    // Respect Boss Siege Grab lock
    if (player._grabbedByBoss && (player._grabbedByBossTimer || 0) > 0) {
      player._grabbedByBossTimer = Math.max(0, player._grabbedByBossTimer - dt);
      this.queuedAction = null;
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      if (player._grabbedByBossTimer <= 0) {
        player._grabbedByBoss = false;
        player.y = player.groundY;
      }
      player.update(dt, target, this.game);
      this.progression.syncGaugesToPlayer(player);
      return;
    }

    if (player._advPureDodge) {
      if (this.updateHeroAdventureDodge(dt, player)) {
        this.progression.syncGaugesToPlayer(player);
        return;
      }
    }

    const manualOverrideActive =
      !this.autoPlay ||
      this._hasManualDirectionalInput() ||
      this.attackHeld ||
      Boolean(this.queuedAction);

    if (!manualOverrideActive && this.autoPlay) {
      this._stepAutoPlayHero(dt, player, target, stats);
      return;
    }

    this._stepManualHero(dt, player, target, stats);
  }

  _stepAutoPlayHero(dt, player, target, stats) {
    const bounds = this.getActiveStageBounds();
    const minWalkX = bounds.minX;
    const maxWalkX = bounds.maxX;
    const depthMin = this.depthMinY + 12;
    const depthMax = this.depthMaxY - 12;
    const pGy = Number.isFinite(player.groundY) ? player.groundY : this.depthMidY;
    const bossAnchorX = this.getBossAnchorX();

    const hid = player.heroId || '';
    const isRangedEx = Boolean(RANGED_EX_LV1_PROJECTILES[hid]);
    const rawEffRange = player.getEffectiveAttackRange
      ? player.getEffectiveAttackRange()
      : player.attackRange || 180;
    const isRanged =
      isRangedEx ||
      ['mage', 'priestess', 'icemage', 'valkyrie', 'archer'].includes(hid) ||
      rawEffRange >= 290;
    const effRange = isRangedEx ? Math.max(500, rawEffRange) : isRanged ? Math.max(380, rawEffRange) : rawEffRange;
    const maxAutoVx = 295 * (stats.moveSpeedMult || 1);
    const maxAutoVz = 175 * (stats.moveSpeedMult || 1);

    const steerToward = (goalX, goalGy, stopDist = 18, faceOverride = null) => {
      const cx = Math.max(minWalkX + 14, Math.min(maxWalkX - 14, goalX));
      const cz = Math.max(depthMin, Math.min(depthMax, goalGy));
      const dx = cx - player.x;
      const dz = cz - pGy;
      const dist = Math.hypot(dx, dz * 1.25);
      if (dist > stopDist) {
        const inv = 1 / Math.max(1, Math.hypot(dx, dz));
        const vx = dx * inv * maxAutoVx;
        const vz = dz * inv * maxAutoVz;
        player.x = Math.max(minWalkX, Math.min(maxWalkX, player.x + vx * dt));
        this.shiftEntityDepth(player, vz * dt);
        player._manualWalkActive = true;
        player._manualSpeedRatio = 1.0;
        player.moveDir = 1;
        player.state = 'WALK';
        player.facing = faceOverride !== null ? faceOverride : vx >= 0 ? 1 : -1;
        return true;
      }
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      player.moveDir = 0;
      player.state = 'IDLE';
      if (faceOverride !== null) player.facing = faceOverride;
      return false;
    };

    // 1. Between-wave forward advance march
    if (!target) {
      if (!player.isDead && !(player.stunTimer > 0) && !player.isRooted && (player.state === 'IDLE' || player.state === 'WALK')) {
        const marchX = this._waveAdvancePending ? this._waveAdvanceTargetX : this.corridorOriginX + 120;
        const marchGy = this.depthMidY + Math.sin(this._clock * 2.1) * 32;
        steerToward(marchX, marchGy, 20, 1);
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
      }
      this.skillSets.beginPlayerStep(dt, player, null, Boolean(player._manualWalkActive), 0);
      player.update(dt, null, this.game);
      this.progression.syncGaugesToPlayer(player);
      return;
    }

    // 2. Active Combat Auto-Play (4-beat combos, Skills, Overdrive, Supreme Ultimates)
    const targetGy = target.isColossalBoss ? pGy : Number.isFinite(target.groundY) ? target.groundY : this.depthMidY;
    const absDx = Math.abs(target.x - player.x);
    const absDz = target.isColossalBoss ? 0 : Math.abs(targetGy - pGy);
    const isHackSlash = Boolean(player.hasHackAndSlashCombo?.());
    let isMovingCombat = false;

    if (!player.isDead && !(player.stunTimer > 0) && !player.isRooted) {
      if (player.state === 'IDLE' || player.state === 'WALK') {
        if (
          player.hasTrueUltimate &&
          this.progression.astralCharge >= 99.9 &&
          typeof player.updateTrueUltimate === 'function'
        ) {
          player._manualWalkActive = false;
          player.facing = target.x >= player.x ? 1 : -1;
          this.progression.astralCharge = 0;
          this.progression.syncGaugesToPlayer(player);
          if (player.stats) player.stats.ultsUsed++;
          player.setState('TRUE_ULTIMATE');
          this.game?.triggerTrueUltimateCinematic?.(player);
        } else if (
          this.progression.ultCharge >= 99.9 &&
          (target.isColossalBoss || (absDx <= Math.max(360, effRange * 1.35) && absDz <= 115))
        ) {
          player._manualWalkActive = false;
          player.facing = target.x >= player.x ? 1 : -1;
          this.progression.ultCharge = 0;
          this.progression.gainAstralRelic(stats.ultResonanceAstral || 24, player);
          this.progression.syncGaugesToPlayer(player);
          if (player.stats) player.stats.ultsUsed++;
          player.setState('ULTIMATE');
          this.game?.triggerUltimateCinematic?.(player);
        } else if (
          player.skillCooldown <= 0 &&
          (target.isColossalBoss || (absDx <= Math.max(255, effRange * 1.35) && absDz <= (isRanged ? 98 : 76))) &&
          this.progression.trySpendSkillSpirit()
        ) {
          player._manualWalkActive = false;
          player.facing = target.x >= player.x ? 1 : -1;
          this.skillCdMax = Math.max(2.2, (player.skillMaxCooldown || 4.2) * (stats.skillCdMult || 1));
          player.skillCooldown = this.skillCdMax;
          if (player.stats) player.stats.skillsUsed++;
          player.setState('SKILL');
        } else if (
          player.autoCooldown <= 0 &&
          (target.isColossalBoss
            ? isRanged
              ? player.x >= bossAnchorX - 850
              : player.x >= bossAnchorX - 195
            : absDx <= effRange * 0.96 && absDz <= (isRanged ? 96 : 52))
        ) {
          player._manualWalkActive = false;
          player.facing = target.x >= player.x ? 1 : -1;
          this._comboLockTarget = target;
          this.comboResetTimer = 1.85;
          player.setState('AUTO_ATTACK');
          const hasteDiv = Math.max(0.55, 1 / Math.max(0.5, stats.hasteMult || 1));
          if (isHackSlash) {
            if ((player.comboStep || 0) !== 0) {
              this.autoCdMax = 0.34 * hasteDiv;
              player.autoCooldown = player.heroId?.endsWith('_ex') ? 0.015 : 0.03;
            } else {
              this.autoCdMax = 0.50 * hasteDiv;
              player.autoCooldown = this.autoCdMax;
              this._comboLockTarget = null;
            }
          } else {
            this.autoCdMax = Math.max(0.24, (player.autoInterval || 0.44) * hasteDiv);
            player.autoCooldown = this.autoCdMax;
          }
        } else if (target.isColossalBoss) {
          const goalX = isRanged ? bossAnchorX - 450 : bossAnchorX - 118;
          const goalGy = this.depthMidY + Math.sin(this._clock * 1.8) * 42;
          isMovingCombat = steerToward(goalX, goalGy, 20, 1);
        } else {
          const idealDist = isRanged ? Math.min(320, effRange * 0.72) : Math.max(82, Math.min(126, effRange * 0.68));
          const goalX = player.x <= target.x ? target.x - idealDist : target.x + idealDist;
          const clampedGoalX = Math.max(minWalkX + 36, Math.min(maxWalkX - 36, goalX));
          isMovingCombat = steerToward(clampedGoalX, targetGy, 18, target.x >= player.x ? 1 : -1);
        }
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
      }
    }

    if (player.state !== 'AUTO_ATTACK' || (player.stateTimer || 0) < 0.04) {
      player._advLv1FallbackShot = false;
    }
    const entityGame = this._getEntityGameView();
    const prevDidAction = Boolean(player.didActionFrame);
    const prevProjLen = this.game?.vfx?.projectiles?.length || 0;
    const combatTarget = this.skillSets.resolveTarget(player, target);
    this.skillSets.beginPlayerStep(dt, player, combatTarget, isMovingCombat, 0);
    player.update(dt, combatTarget, entityGame);

    let heroAlreadySpawnedProjectile = false;
    const curProjs = this.game?.vfx?.projectiles;
    if (Array.isArray(curProjs) && curProjs.length > prevProjLen) {
      for (let pi = prevProjLen; pi < curProjs.length; pi++) {
        if (curProjs[pi]?.owner === player) {
          heroAlreadySpawnedProjectile = true;
          break;
        }
      }
    }
    if (player.state === 'AUTO_ATTACK' && !prevDidAction && player.didActionFrame) {
      player._advLv1FallbackShot = true;
      this.progression.onPlayerCastBasicAttack(player, combatTarget || target, entityGame, {
        heroAlreadySpawnedProjectile
      });
    } else if (
      isRangedEx &&
      player.state === 'AUTO_ATTACK' &&
      !player.didActionFrame &&
      !player._advLv1FallbackShot &&
      (player.stateTimer || 0) >= 0.16
    ) {
      player._advLv1FallbackShot = true;
      this.progression.onPlayerCastBasicAttack(player, combatTarget || target, entityGame, {
        heroAlreadySpawnedProjectile
      });
    }

    this.progression.syncGaugesToPlayer(player);
  }

  _stepManualHero(dt, player, nearestMonster, stats) {
    const maxSpeedX = 320 * (stats.moveSpeedMult || 1);
    const maxSpeedZ = 195 * (stats.moveSpeedMult || 1);
    let rawDirX = 0;
    let rawDirY = 0;
    let targetVx = 0;
    let targetVy = 0;

    if (this.joyVec.active) {
      const mag = Math.hypot(this.joyVec.x, this.joyVec.y);
      if (mag > 0.06) {
        const u = Math.min(1, (mag - 0.06) / 0.72);
        const curved = Math.pow(u, 0.72);
        rawDirX = (this.joyVec.x / mag) * curved;
        rawDirY = (this.joyVec.y / mag) * curved;
        targetVx = rawDirX * maxSpeedX;
        targetVy = rawDirY * maxSpeedZ;
      }
    } else {
      const kbX = (this.keys.right || this.keys.uiRight ? 1 : 0) - (this.keys.left || this.keys.uiLeft ? 1 : 0);
      const kbY = (this.keys.down || this.keys.uiDown ? 1 : 0) - (this.keys.up || this.keys.uiUp ? 1 : 0);
      const mag = Math.hypot(kbX, kbY);
      if (mag > 0) {
        const inv = mag > 1 ? 1 / mag : 1;
        rawDirX = kbX * inv;
        rawDirY = kbY * inv;
        targetVx = rawDirX * maxSpeedX;
        targetVy = rawDirY * maxSpeedZ;
      }
    }

    const alpha = Math.min(1, dt * 38);
    this.smoothVelX += (targetVx - this.smoothVelX) * alpha;
    this.smoothVelY += (targetVy - this.smoothVelY) * alpha;
    if (Math.abs(targetVx) < 0.01 && Math.abs(this.smoothVelX) < 2) this.smoothVelX = 0;
    if (Math.abs(targetVy) < 0.01 && Math.abs(this.smoothVelY) < 2) this.smoothVelY = 0;

    const moveDirX = Math.abs(rawDirX) > 0.06 ? (rawDirX > 0 ? 1 : -1) : 0;
    player.manualMoveAxis = rawDirX;
    const isMoving3D = Math.hypot(this.smoothVelX, this.smoothVelY) > 1.2 || Math.hypot(rawDirX, rawDirY) > 0.015;

    if (!this.queuedAction && this.attackHeld) {
      this.queuedAction = 'attack';
      this.queuedActionTimer = 0.56;
    }

    const lockTarget = this.manualTargetLock
      ? this.getActiveLockedMonster(player)
      : this.autoPlay
        ? nearestMonster
        : null;

    const isInstantDodgeCancel =
      player.state === 'AUTO_ATTACK' && this.queuedAction === 'dodge' && player.dodgeCooldown <= 0;
    const isAttackRecoveryCancel =
      player.state === 'AUTO_ATTACK' &&
      player.didActionFrame &&
      this.queuedAction &&
      (this.queuedAction !== 'attack' || player.autoCooldown <= 0);
    const canAct =
      !player.isDead &&
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      !player._advPureDodge &&
      (player.state === 'IDLE' || player.state === 'WALK' || isInstantDodgeCancel || isAttackRecoveryCancel);

    if (canAct && this.queuedAction) {
      const act = this.queuedAction;
      if (
        act === 'ultimate' &&
        player.hasTrueUltimate &&
        this.progression.astralCharge >= 99.9 &&
        typeof player.updateTrueUltimate === 'function'
      ) {
        this.queuedAction = null;
        if (lockTarget) player.facing = lockTarget.x >= player.x ? 1 : -1;
        else if (moveDirX !== 0) player.facing = moveDirX;
        this.progression.astralCharge = 0;
        this.progression.syncGaugesToPlayer(player);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('TRUE_ULTIMATE');
        this.game?.triggerTrueUltimateCinematic?.(player);
      } else if (act === 'overdrive' && this.progression.ultCharge >= 99.9) {
        this.queuedAction = null;
        if (lockTarget) player.facing = lockTarget.x >= player.x ? 1 : -1;
        else if (moveDirX !== 0) player.facing = moveDirX;
        this.progression.ultCharge = 0;
        this.progression.gainAstralRelic(stats.ultResonanceAstral || 24, player);
        this.progression.syncGaugesToPlayer(player);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('ULTIMATE');
        this.game?.triggerUltimateCinematic?.(player);
      } else if (act === 'skill' && player.skillCooldown <= 0) {
        if (this.progression.trySpendSkillSpirit()) {
          this.queuedAction = null;
          if (lockTarget) player.facing = lockTarget.x >= player.x ? 1 : -1;
          else if (moveDirX !== 0) player.facing = moveDirX;
          this.skillCdMax = Math.max(2.2, (player.skillMaxCooldown || 4.2) * (stats.skillCdMult || 1));
          player.skillCooldown = this.skillCdMax;
          if (player.stats) player.stats.skillsUsed++;
          player.setState('SKILL');
        } else {
          this.queuedAction = null;
        }
      } else if (act === 'dodge' && player.dodgeCooldown <= 0) {
        this.queuedAction = null;
        const mag = Math.hypot(rawDirX, rawDirY);
        const evX = mag > 0.08 ? rawDirX / mag : player.facing || 1;
        const evZ = mag > 0.08 ? rawDirY / mag : 0;
        this.startHeroAdventureDodge(player, evX, evZ, stats);
        return;
      } else if (act === 'attack' && player.autoCooldown <= 0) {
        this.queuedAction = null;
        if (lockTarget) player.facing = lockTarget.x >= player.x ? 1 : -1;
        else if (moveDirX !== 0) player.facing = moveDirX;
        this.comboResetTimer = 1.85;
        player.setState('AUTO_ATTACK');
        const hasteDiv = Math.max(0.55, 1 / Math.max(0.5, stats.hasteMult || 1));
        if (player.hasHackAndSlashCombo?.()) {
          this.autoCdMax = 0.34 * hasteDiv;
          player.autoCooldown = (player.comboStep || 0) !== 0 ? 0.02 : this.autoCdMax;
        } else {
          this.autoCdMax = Math.max(0.24, (player.autoInterval || 0.44) * hasteDiv);
          player.autoCooldown = this.autoCdMax;
        }
      } else {
        this.queuedAction = null;
      }
    }

    if (!player.isDead && !(player.stunTimer > 0) && !player.isRooted && (player.state === 'IDLE' || player.state === 'WALK')) {
      if (isMoving3D) {
        player._manualWalkActive = true;
        player._manualSpeedRatio = 1.0;
        if (moveDirX !== 0) player.facing = moveDirX;
        player.moveDir = 1;
        player.state = 'WALK';
        player.x += this.smoothVelX * dt;
        this.shiftEntityDepth(player, this.smoothVelY * dt);
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
        player.moveDir = 0;
        player.state = 'IDLE';
      }
      const entityGame = this._getEntityGameView();
      this.skillSets.beginPlayerStep(dt, player, null, isMoving3D, rawDirY);
      player.update(dt, null, entityGame);
    } else {
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      if (player.state === 'AUTO_ATTACK' && isMoving3D && !player.isHackAndSlashMelee?.()) {
        player.x += this.smoothVelX * 0.78 * dt;
        this.shiftEntityDepth(player, this.smoothVelY * 0.85 * dt);
      }
      const entityGame = this._getEntityGameView();
      const prevDidAction = Boolean(player.didActionFrame);
      const prevProjLen = this.game?.vfx?.projectiles?.length || 0;
      const combatTarget = this.skillSets.resolveTarget(player, lockTarget);
      this.skillSets.beginPlayerStep(dt, player, combatTarget, isMoving3D, rawDirY);
      player.update(dt, combatTarget, entityGame);

      let heroAlreadySpawnedProjectile = false;
      const curProjs = this.game?.vfx?.projectiles;
      if (Array.isArray(curProjs) && curProjs.length > prevProjLen) {
        for (let pi = prevProjLen; pi < curProjs.length; pi++) {
          if (curProjs[pi]?.owner === player) {
            heroAlreadySpawnedProjectile = true;
            break;
          }
        }
      }
      if (player.state === 'AUTO_ATTACK' && !prevDidAction && player.didActionFrame) {
        this.progression.onPlayerCastBasicAttack(player, lockTarget || combatTarget, entityGame, {
          heroAlreadySpawnedProjectile
        });
      }
    }

    this.progression.syncGaugesToPlayer(player);
  }

  // =========================================================================
  // MAIN FIXED-STEP UPDATE LOOP
  // =========================================================================

  update(dt) {
    if (!this.active) return;
    const g = this.game;
    const player = g?.leftFighter;
    if (!player) return;

    const effDt = Math.min(0.05, Math.max(0, Number.isFinite(dt) ? dt : 0));

    // Pause main-stage combat ticks, monster AI/attacks, Boss timer, Trial timer & Shrine/Fever decay
    // while Offline Loot or Trial Reward modal is open (visual render continues cleanly!)
    if (this.isBlockingModalOpen()) {
      this._syncCorridorBounds({ lockToCorridor: false, syncCamera: true });
      this._uiSyncAccum += effDt;
      if (this._uiSyncAccum >= 0.15) {
        this._uiSyncAccum = 0;
        this.shopUI?.sync?.(this.getUiSnapshot(), false);
      }
      return;
    }

    this._clock = Number.isFinite(this._clock) ? this._clock + effDt : effDt;
    this.goBlinkTimer += effDt;
    this._syncCorridorBounds({ lockToCorridor: false, syncCamera: true });

    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - effDt);
    }
    if (this._coinStreakTimer > 0) {
      this._coinStreakTimer = Math.max(0, this._coinStreakTimer - effDt);
      if (this._coinStreakTimer <= 0) {
        this._coinStreak = 0;
      }
    }
    if (this._feverStampPopTimer > 0) {
      this._feverStampPopTimer = Math.max(0, this._feverStampPopTimer - effDt);
    }
    if (this._phoenixInvulnTimer > 0) {
      this._phoenixInvulnTimer = Math.max(0, this._phoenixInvulnTimer - effDt);
      if (this._phoenixInvulnTimer <= 0 && !player._advPureDodge) {
        player.isInvulnerable = false;
      } else {
        player.isInvulnerable = true;
      }
    }

    // Keep companions synced if user recruited/deployed/upgraded directly via ShopUI
    const compSig = this._computeCompanionSyncSig();
    const compSigChanged = compSig !== this._lastCompanionSyncSig;
    if (compSigChanged) {
      this.companions.syncEntitiesWithWorld(player);
      this._lastCompanionSyncSig = compSig;
      this._extModsDirty = true;
    }

    // 1. Tick Wave 8 Events, Wave 9 Companion Evo & Wave 10 Trials; dirty-flagged external modifier sync (<=4Hz fallback)
    const evTick = this.events?.update?.(effDt) || null;
    const evoTick = this.companionEvo?.update?.(effDt) || null;
    const tTick = this.trials?.update?.(effDt) || { expired: false, remainingSec: 0 };
    const inTrial = Boolean(this.trials?.isActive?.());
    this._extModsSyncAccum += effDt;
    const modsChanged = Boolean(evTick?.buffsChanged || evoTick?.overdriveEnded);
    if (this._extModsDirty || modsChanged || this._extModsSyncAccum >= 0.25) {
      const synMods = this.companions?.getPartySynergyModifiers?.() || null;
      this._syncExternalModifiers(synMods, { preserveBase: modsChanged });
      if (modsChanged) {
        this.progression.syncMaxHpWithEconomy(player);
        this.shopUI?.sync?.(this.getUiSnapshot(), false);
      }
    }
    if (!modsChanged && evTick?.offerExpired) {
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }

    this.economy.update(effDt);
    this.progression.update(effDt, player);
    this.skillSets.update(effDt, player);

    const curFeverTier =
      (this.economy?.tapFeverTimer || 0) > 0
        ? (this.economy?.tapFeverLevel || 0) >= 2
          ? 2
          : 1
        : 0;
    if (curFeverTier > this._lastFeverTier) {
      this._feverStampPopTimer = 0.28;
    }
    this._lastFeverTier = curFeverTier;

    // 2. Boss Encounter Countdown, Titan-Slayer Execute & Zero-Punishment Boss Fail
    if (inTrial) {
      if (this.trials.activeTrial?.id === 'malphas_gauntlet') {
        this.bossTimer = Math.max(0, Number(tTick?.remainingSec) || 0);
      }
      if (player.isDead || player.hp <= 0) {
        this._revivePlayerPhoenix(player, true);
      }
    } else if (this.isBossEncounter) {
      if (this.bossEntity) {
        this._tryTitanSlayerExecute(this.bossEntity);
      }
      if (this.isBossEncounter) {
        this.bossTimer = Math.max(0, this.bossTimer - effDt);
        if (player.isDead || player.hp <= 0) {
          this._handleBossRetreat('hp');
        } else if (this.bossTimer <= 0) {
          this._handleBossRetreat('timeout');
        }
      }
    } else if (player.isDead || player.hp <= 0) {
      this._revivePlayerPhoenix(player, true);
    }

    // 3. Ensure any newly fallen monsters trigger death rewards once, then prune decayed corpses
    if (Array.isArray(g.fighters)) {
      for (let i = g.fighters.length - 1; i >= 0; i--) {
        const f = g.fighters[i];
        if (!f || !f.isMonster) continue;
        if ((f.isDead || f.hp <= 0) && !f._endlessDeathHandled) {
          f.isDead = true;
          this.onMonsterDeath(f);
        }
        if (f.isDead) {
          f._endlessDeadAge = (f._endlessDeadAge || 0) + effDt;
          if ((f.deathTimer || 0) >= 1.55 || f._endlessDeadAge >= 2.2) {
            g.fighters.splice(i, 1);
          }
        }
      }
    }

    // 4. Wave Clear, Forward Corridor March & Boss Trigger (suppressed while inside a Trial Portal)
    const livingMonsters = this.getLivingMonsters();
    if (!inTrial) {
      if (this._waveSpawnDelay > 0) {
        this._waveSpawnDelay = Math.max(0, this._waveSpawnDelay - effDt);
        if (this._waveSpawnDelay <= 0 && livingMonsters.length === 0 && !this.isBossEncounter) {
          this._spawnWaveMonsters();
        }
      } else if (this._waveAdvancePending) {
        this._waveAdvanceElapsed += effDt;
        const reachedTarget = player.x >= this._waveAdvanceTargetX - 64;
        const timedOut = this._waveAdvanceElapsed >= (this.autoPlay ? 1.15 : 1.55);
        if (reachedTarget || timedOut) {
          this._waveAdvancePending = false;
          this._waveAdvanceElapsed = 0;
          this.lockMinX = this.corridorMinX;
          this.lockMaxX = this.corridorMaxX;
          this.lockActive = true;
          if (player.x < this.lockMinX + 40) player.x = this.lockMinX + 60;
          if (g.renderer) {
            g.renderer.worldWidth = this.getWorldWidth();
            g.renderer.adventureCamMinX = Math.max(0, this.lockMinX - 60);
            g.renderer.adventureCamMaxX = this.lockMaxX + 180;
          }
          if (this._pendingSpawnKind === 'boss') {
            this.startBossEncounter();
          } else {
            this._spawnWaveMonsters();
          }
        }
      } else if (!this.isBossEncounter && this.lockActive && livingMonsters.length === 0) {
        if (this.bossFarmMode) {
          this._farmWaveCount++;
          this._advanceCorridorForNextWave('wave');
        } else if (this.waveInStage < this.wavesPerStage) {
          this.waveInStage++;
          this.economy.waveInStage = this.waveInStage;
          this._advanceCorridorForNextWave('wave');
        } else if (this.economy.autoBoss) {
          this._advanceCorridorForNextWave('boss');
        } else {
          this.bossFarmMode = true;
          this._farmWaveCount++;
          this._advanceCorridorForNextWave('wave');
        }
      }
    }

    // 5. Update Player (AUTO or Manual) + Clamp Corridor Bounds
    const syncCastGrace = (isPost) => {
      if (player.state === 'TRUE_ULTIMATE') {
        player._advRecentCastSource = 'true_ult';
        player._advRecentCastTimer = 0.45;
      } else if (player.state === 'ULTIMATE') {
        player._advRecentCastSource = 'ult';
        player._advRecentCastTimer = 0.45;
      } else if (player.state === 'SKILL') {
        player._advRecentCastSource = 'skill';
        player._advRecentCastTimer = 0.45;
      } else if (isPost && (player._advRecentCastTimer || 0) > 0) {
        player._advRecentCastTimer = Math.max(0, player._advRecentCastTimer - effDt);
        if (player._advRecentCastTimer <= 0) player._advRecentCastSource = null;
      }
    };
    syncCastGrace(false);
    const nearestMonster =
      this.getNearestLivingMonster(player) ||
      (this.trials?.activeTrial?.id === 'gold_vault'
        ? this._getNearestLivingGoblin(player) || this._getNearestUnopenedChest(player)
        : null);
    this._processPlayerStep(effDt, player, nearestMonster);
    syncCastGrace(true);

    const colossalAlive = Boolean(
      this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
    );
    const bounds = this.getActiveStageBounds();
    this.skillSets.endPlayerStep(effDt, player, bounds.minX, bounds.maxX, colossalAlive);
    if (player.x < bounds.minX) player.x = bounds.minX;
    if (player.x > bounds.maxX) player.x = bounds.maxX;

    // 6. Update Active Monsters
    const entityGame = this._getEntityGameView();
    if (Array.isArray(g.fighters)) {
      for (const f of g.fighters) {
        if (!f || f === player) continue;
        f.update(effDt, player, entityGame);
        if (this.lockActive && f.isMonster && !f.isDead && !f.isColossalBoss) {
          const mMin = bounds.minX + 18;
          const mMax = Math.max(mMin, bounds.maxX - 18);
          if (f.x < mMin) f.x = mMin;
          if (f.x > mMax) f.x = mMax;
        }
      }
    }

    // 7. Update Autonomous HD-2D Companions (include Treasure Goblins, plus Chests in Gold Vault!)
    let companionTargets = this.getLivingMonsters();
    if (this.treasureGoblins.length > 0) {
      companionTargets = [
        ...companionTargets,
        ...this.treasureGoblins.filter((tg) => tg && !tg.isDead)
      ];
    }
    if (this.trials?.activeTrial?.id === 'gold_vault' && this.treasureChests.length > 0) {
      companionTargets = [
        ...companionTargets,
        ...this.treasureChests.filter((ch) => ch && !ch.opened && !ch.isDead)
      ];
    }
    this.companions.update(effDt, player, companionTargets, this.economy, entityGame);

    // 7a. Wave 7 Titan-Slayer Boss Execute check after hero/monster/companion damage
    if (!inTrial && this.isBossEncounter && this.bossEntity) {
      this._tryTitanSlayerExecute(this.bossEntity);
    }

    // 7b. Wave 3 Gilded Goblin + Wave 8 Organic Shrine & Wandering Merchant timers (active non-boss waves)
    if (!inTrial && !this.isBossEncounter && !this._waveAdvancePending && livingMonsters.length > 0) {
      this._goblinSpawnTimer -= effDt;
      if (this._goblinSpawnTimer <= 0) {
        this._goblinSpawnTimer =
          GOBLIN_SPAWN_MIN_SEC + Math.random() * (GOBLIN_SPAWN_MAX_SEC - GOBLIN_SPAWN_MIN_SEC);
        if (this.treasureGoblins.length < GOBLIN_MAX_ACTIVE) {
          this.spawnTreasureGoblin();
        }
      }

      this._shrineSpawnTimer -= effDt;
      if (this._shrineSpawnTimer <= 0) {
        this._shrineSpawnTimer =
          WORLD_SHRINE_SPAWN_MIN_SEC +
          Math.random() * (WORLD_SHRINE_SPAWN_MAX_SEC - WORLD_SHRINE_SPAWN_MIN_SEC);
        if (this.worldShrines.length < WORLD_SHRINE_MAX_ACTIVE) {
          this.spawnWorldShrine();
        }
      }

      this._merchantSpawnTimer -= effDt;
      if (this._merchantSpawnTimer <= 0) {
        this._merchantSpawnTimer =
          WANDERING_MERCHANT_SPAWN_MIN_SEC +
          Math.random() * (WANDERING_MERCHANT_SPAWN_MAX_SEC - WANDERING_MERCHANT_SPAWN_MIN_SEC);
        if (
          this.wanderingMerchants.length < WANDERING_MERCHANT_MAX_ACTIVE &&
          !this.events?.activeMerchantOffer
        ) {
          this.spawnWanderingMerchant();
        }
      }
    }

    // 8. Update Goblins, Milestone Chests, Loot Beams, World Shrines & Merchants, Tempest Auto-Lightning, Gear Nova FX, Magnetic Coins, Tap-Smites, Fever Bursts, Fever Chains, Portals, Plumes & Floating Callouts
    this._updateTreasureGoblins(effDt, player);
    this._updateTreasureChests(effDt, player);
    this._updateLootBeams(effDt, player);
    this._updateWorldEvents(effDt, player);
    this._updateGearNovaFx(effDt);
    this._updateCoins(effDt, player);
    for (let i = this.tapSmites.length - 1; i >= 0; i--) {
      const it = this.tapSmites[i];
      if (!it || !Number.isFinite(it.age) || !Number.isFinite(it.maxLife)) {
        this.tapSmites.splice(i, 1);
        continue;
      }
      it.age += effDt;
      if (it.age >= it.maxLife) this.tapSmites.splice(i, 1);
    }
    for (let i = this.feverBursts.length - 1; i >= 0; i--) {
      const it = this.feverBursts[i];
      if (!it || !Number.isFinite(it.age) || !Number.isFinite(it.maxLife)) {
        this.feverBursts.splice(i, 1);
        continue;
      }
      it.age += effDt;
      if (it.age >= it.maxLife) this.feverBursts.splice(i, 1);
    }
    for (let i = this.feverChains.length - 1; i >= 0; i--) {
      const it = this.feverChains[i];
      if (!it || !Number.isFinite(it.age) || !Number.isFinite(it.maxLife)) {
        this.feverChains.splice(i, 1);
        continue;
      }
      it.age += effDt;
      if (it.age >= it.maxLife) this.feverChains.splice(i, 1);
    }
    for (let i = this.wave4Bursts.length - 1; i >= 0; i--) {
      const it = this.wave4Bursts[i];
      if (!it || !Number.isFinite(it.age) || !Number.isFinite(it.maxLife)) {
        this.wave4Bursts.splice(i, 1);
        continue;
      }
      it.age += effDt;
      if (it.age >= it.maxLife) this.wave4Bursts.splice(i, 1);
    }
    for (let i = this.portals.length - 1; i >= 0; i--) {
      const it = this.portals[i];
      if (!it || !Number.isFinite(it.age) || !Number.isFinite(it.maxLife)) {
        this.portals.splice(i, 1);
        continue;
      }
      it.age += effDt;
      if (it.age >= it.maxLife) this.portals.splice(i, 1);
    }
    for (let i = this.monsterPlumes.length - 1; i >= 0; i--) {
      const it = this.monsterPlumes[i];
      if (!it || !Number.isFinite(it.age) || !Number.isFinite(it.maxLife)) {
        this.monsterPlumes.splice(i, 1);
        continue;
      }
      it.age += effDt;
      if (it.age >= it.maxLife) this.monsterPlumes.splice(i, 1);
    }
    const decelY = Math.exp(-3.8 * effDt);
    const decelX = Math.exp(-5.0 * effDt);
    for (let i = this.floatingCallouts.length - 1; i >= 0; i--) {
      const fc = this.floatingCallouts[i];
      if (!fc || !Number.isFinite(fc.age) || !Number.isFinite(fc.maxLife)) {
        this.floatingCallouts.splice(i, 1);
        continue;
      }
      fc.age += effDt;
      fc.x += (fc.vx || 0) * effDt;
      fc.y += fc.vy * effDt;
      fc.vx = (fc.vx || 0) * decelX;
      fc.vy *= decelY;
      if (fc.age >= fc.maxLife) this.floatingCallouts.splice(i, 1);
    }

    // 8b. Wave 10 Active Trial encounter tick & clean auto-completion on expiry
    if (inTrial && this.trials?.isActive?.()) {
      this._updateActiveTrial(effDt, player);
      if (tTick?.expired) {
        this.exitTrial({ completedFull: true });
        this.syncControlDeckUI();
        return;
      }
    }

    // 9. Debounced rapid-event save + periodic 10s auto-save + throttled UI (~10Hz) & HUD (~15Hz) sync
    if (this._pendingSaveDelay >= 0) {
      this._pendingSaveDelay -= effDt;
      if (this._pendingSaveDelay <= 0) {
        this._pendingSaveDelay = -1;
        this._autoSaveAccum = 0;
        this.saveNow();
      }
    }
    this._autoSaveAccum += effDt;
    if (this._autoSaveAccum >= 10.0) {
      this._autoSaveAccum = 0;
      this.saveNow();
    }

    this._uiSyncAccum += effDt;
    if (this._uiSyncAccum >= 0.10) {
      this._uiSyncAccum = 0;
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }

    this._hudSyncAccum += effDt;
    if (this._hudSyncAccum >= 0.066) {
      this._hudSyncAccum = 0;
      this.syncStageBadge();
      this.syncRightHUD();
      this.syncControlDeckUI();
    }
  }

  // =========================================================================
  // COMPATIBILITY HOOKS FOR MONSTER, RENDERER & MAIN.JS
  // =========================================================================

  spawnMonsterPlume(
    x,
    groundY,
    vfxRow = 10,
    color = '#38bdf8',
    scale = 1.6,
    maxLife = 0.48,
    essenceSparks = 6
  ) {
    while (this.monsterPlumes.length >= MONSTER_PLUME_MAX_COUNT) this.monsterPlumes.shift();
    const safeX = Number.isFinite(x) ? x : this.corridorOriginX || 240;
    const gy = Number.isFinite(groundY) ? groundY : this.depthMidY;
    this.monsterPlumes.push({
      x: safeX,
      groundY: gy,
      vfxRow: Math.max(0, Math.min(11, vfxRow | 0)),
      color: color || '#38bdf8',
      scale: Number.isFinite(scale) ? scale : 1.6,
      age: 0,
      maxLife: Math.max(0.18, Number.isFinite(maxLife) ? maxLife : 0.48),
      essenceSparks: Math.max(0, Math.min(14, essenceSparks | 0)),
      seed: (Math.abs(safeX) * 0.13) % 6.28
    });
  }

  onPlayerHitMonsterRelicProc(_attacker, _monster, _dealt, _isCrit = false, _procOpts = {}) {
    // Reserved hook for Monster.takeDamage compatibility (Endless relics scale cleanly in progression)
  }

  getStandingProps() {
    if (!this.active) return [];
    const list = this.companions?.getActiveEntities?.();
    return Array.isArray(list) ? list : [];
  }

  // =========================================================================
  // RENDERING HOOKS (100% NEAREST-NEIGHBOR, 0 ROTATE / ELLIPSE / ARC, 0 EMOJIS)
  // =========================================================================

  renderWorldFloor(ctx, renderer) {
    if (!this.active || !ctx) return;
    const t = renderer?.time || this._clock || 0;
    const roadTop = 438;
    const roadBot = 684;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Back-wall Summoning Portal 2.5D Ground Rune Seals (`adv_fx_sheet.png`)
    if (this.portals.length > 0) {
      const assets = PixelForge.initAssets?.();
      const fxSheet = PixelForge.ensureImage?.(assets?.advFxSheet) || assets?.advFxSheet;
      const fxReady = isImgReady(fxSheet);
      for (const p of this.portals) {
        const u = Math.max(0, Math.min(1, p.age / p.maxLife));
        const openScale = p.age < 0.24 ? 0.3 + 0.7 * (p.age / 0.24) : u > 0.78 ? 1 - 0.55 * ((u - 0.78) / 0.22) : 1;
        const alpha = p.age < 0.14 ? p.age / 0.14 : u > 0.76 ? (1 - u) / 0.24 : 1;
        if (alpha <= 0.01) continue;
        const px = Math.round(p.x);
        const py = Math.round(p.groundY);
        const sealW = Math.round((p.isElite ? 192 : 172) * openScale);
        const sealH = Math.round((p.isElite ? 50 : 44) * openScale);
        const sealY = Math.round(Math.max(roadTop + Math.ceil(sealH * 0.5) + 1, py + 18));
        const z = Math.max(0, Math.min(3, p.zone | 0));

        ctx.globalAlpha = 0.48 * alpha;
        ctx.fillStyle = '#05070e';
        ctx.fillRect(Math.round(px - sealW * 0.45), py - 3, Math.round(sealW * 0.9), 6);

        ctx.globalAlpha = Math.min(0.92, alpha);
        if (fxReady && sealW >= 8 && sealH >= 6 && ctx.drawImage) {
          ctx.drawImage(
            fxSheet,
            (4 + z) * 128,
            512,
            128,
            128,
            Math.round(px - sealW * 0.5),
            Math.round(sealY - sealH * 0.5),
            sealW,
            sealH
          );
        } else {
          ctx.fillStyle = p.primaryColor || '#38bdf8';
          ctx.fillRect(Math.round(px - sealW * 0.4), sealY - 4, Math.round(sealW * 0.8), 8);
        }
      }
    }

    // 2. Boss Gate Portal Floor Aura (`endless_crusade_vfx.png` Row 6)
    if ((this.isBossEncounter || this.trials?.activeTrial?.id === 'malphas_gauntlet') && this._bossPortalActive) {
      const bx = Math.round(this._bossPortalX || this.lockMaxX - 180);
      const bGy = this.depthMidY;
      const pulse = 0.72 + 0.22 * Math.sin(t * 5.2);
      ctx.globalAlpha = 0.46 * pulse;
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(bx - 96, bGy - 12, 192, 24);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(bx - 84, bGy - 8, 168, 16);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bx - 64, bGy - 4, 128, 8);
    }

    ctx.restore();

    // 3. SkillSet floor zones + Companion Floor Contact Shadows & Isometric Aura Rings
    this.skillSets.renderFloor(ctx);

    const compList = this.companions?.getActiveEntities?.() || [];
    if (compList.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = 'rgba(5, 7, 14, 0.46)';
      for (const comp of compList) {
        if (!comp) continue;
        const cx = Math.round(comp.x);
        const cGy = Math.round(comp.groundY || this.depthMidY);
        ctx.fillRect(cx - 26, cGy - 4, 52, 8);
        ctx.fillRect(cx - 20, cGy - 6, 40, 12);
      }
      ctx.restore();
    }
    this.companions?.renderFloorAuras?.(ctx, renderer);

    // 4. Monster 3D Floor Telegraph Rings
    if (Array.isArray(this.game?.fighters)) {
      for (const f of this.game.fighters) {
        if (f && f.isMonster && !f.isDead && typeof f.drawTelegraphRings === 'function') {
          f.drawTelegraphRings(ctx);
        }
      }
    }

    // 5. Wave-Gate Arcane Runes when locked
    if (this.lockActive) {
      const realm = this.getCurrentRealm();
      const pulse = 0.44 + 0.22 * Math.sin(t * 6.5);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const gateX of [this.lockMinX - 16, this.lockMaxX + 16]) {
        if (gateX <= 50) continue;
        const gx = Math.round(gateX);
        ctx.globalAlpha = pulse * 0.24;
        ctx.fillStyle = this.isBossEncounter ? '#ef4444' : realm.accentHex || '#facc15';
        ctx.fillRect(gx - 6, roadTop, 12, roadBot - roadTop);
        ctx.globalAlpha = pulse * 0.80;
        ctx.fillStyle = '#fef08a';
        for (let seg = 0; seg < 8; seg++) {
          const sy = Math.round(roadTop + ((seg * 32 + t * 52) % (roadBot - roadTop - 12)));
          ctx.fillRect(gx - 2, sy, 4, 14);
        }
        for (const pyY of [roadTop + 4, roadBot - 4]) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#0d0f1a';
          ctx.fillRect(gx - 7, pyY - 38, 14, 40);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(gx - 5, pyY - 36, 10, 36);
          ctx.fillStyle = this.isBossEncounter ? '#ef4444' : realm.accentHex || '#fb923c';
          ctx.fillRect(gx - 3, pyY - 30, 6, 18);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(gx - 1, pyY - 26, 2, 10);
        }
      }
      ctx.restore();
    }
  }

  renderWorldMid(ctx, renderer) {
    if (!this.active || !ctx) return;
    const t = renderer?.time || this._clock || 0;

    // 1. Standing Back-Wall Summoning Portals (`adv_fx_sheet.png` Rows 0..3)
    if (this.portals.length > 0) {
      const assets = PixelForge.initAssets?.();
      const fxSheet = PixelForge.ensureImage?.(assets?.advFxSheet) || assets?.advFxSheet;
      const fxReady = isImgReady(fxSheet);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const p of this.portals) {
        const u = Math.max(0, Math.min(1, p.age / p.maxLife));
        let scaleX = 1.0;
        let scaleY = 1.0;
        let alpha = 1.0;
        if (p.age < 0.24) {
          const k = p.age / 0.24;
          const ease = 1 - Math.pow(1 - k, 3);
          scaleX = 0.2 + 0.8 * ease;
          scaleY = 0.82 + 0.18 * ease;
          alpha = Math.min(1, k * 1.45);
        } else if (u >= 0.78) {
          const k = (u - 0.78) / 0.22;
          scaleX = Math.max(0.12, 1 - 0.86 * k * k);
          alpha = Math.max(0, 1 - k);
        }
        if (alpha <= 0.01) continue;
        const px = Math.round(p.x);
        const py = Math.round(p.groundY);
        const dw = Math.max(8, Math.round((p.isElite ? 210 : 190) * scaleX));
        const dh = Math.max(16, Math.round((p.isElite ? 218 : 198) * scaleY));
        const dx = Math.round(px - dw * 0.5);
        const dy = Math.round(py - (122 / 128) * dh);
        const z = Math.max(0, Math.min(3, p.zone | 0));
        const frame = Math.floor(p.age * 10.5 + p.seed) & 3;
        ctx.globalAlpha = alpha;
        if (fxReady && ctx.drawImage) {
          ctx.drawImage(fxSheet, frame * 128, z * 128, 128, 128, dx, dy, dw, dh);
        } else {
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(dx, dy, dw, dh);
          ctx.fillStyle = p.primaryColor || '#38bdf8';
          ctx.fillRect(dx + 4, dy + 4, Math.max(2, dw - 8), Math.max(2, dh - 8));
        }
      }
      ctx.restore();
    }

    // 2. Boss Gate Portal Arch behind active Boss (`endless_crusade_vfx.png` Row 6, 12f loop)
    if ((this.isBossEncounter || this.trials?.activeTrial?.id === 'malphas_gauntlet') && this._bossPortalActive) {
      const vfxImg = PixelForge.assets?.endlessVfx;
      const bx = Math.round(this._bossPortalX || this.lockMaxX - 180);
      const bGy = this.depthMidY;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (isImgReady(vfxImg) && ctx.drawImage) {
        const frame = Math.floor(t * 14) % 12;
        const drawSz = 264;
        const dx = Math.round(bx - drawSz * 0.5);
        const dy = Math.round(bGy - drawSz * 0.88);
        ctx.globalAlpha = 0.92;
        ctx.drawImage(
          vfxImg,
          frame * ENDLESS_VFX_CELL,
          6 * ENDLESS_VFX_CELL,
          ENDLESS_VFX_CELL,
          ENDLESS_VFX_CELL,
          dx,
          dy,
          drawSz,
          drawSz
        );
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.16;
        ctx.drawImage(
          vfxImg,
          frame * ENDLESS_VFX_CELL,
          6 * ENDLESS_VFX_CELL,
          ENDLESS_VFX_CELL,
          ENDLESS_VFX_CELL,
          dx,
          dy,
          drawSz,
          drawSz
        );
      } else {
        // Stepped gothic crimson-gold portal fallback
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(bx - 64, bGy - 210, 128, 210);
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(bx - 54, bGy - 198, 108, 194);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx - 42, bGy - 184, 84, 174);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(bx - 64, bGy - 210, 128, 6);
      }
      ctx.restore();
    }

    // 3. Monster Plumes (`adv_stage_vfx.png`)
    if (this.monsterPlumes.length > 0) {
      const assets = PixelForge.initAssets?.();
      const stageVfx = PixelForge.ensureImage?.(assets?.advStageVfx) || assets?.advStageVfx;
      const stageReady = isImgReady(stageVfx);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const p of this.monsterPlumes) {
        const u = Math.max(0, Math.min(1, p.age / Math.max(0.05, p.maxLife || 0.48)));
        const alpha = u < 0.15 ? u / 0.15 : Math.max(0, 1 - (u - 0.15) / 0.85);
        if (alpha <= 0.01) continue;
        if (stageReady && ctx.drawImage) {
          const frame = Math.min(15, Math.max(0, Math.floor(u * 16)));
          const drawSz = Math.round(128 * (p.scale || 1.6));
          const dx = Math.round(p.x - drawSz * 0.5);
          const dy = Math.round(p.groundY - drawSz * 0.844);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(0.90, alpha * 0.86);
          ctx.drawImage(stageVfx, frame * 128, (p.vfxRow | 0) * 128, 128, 128, dx, dy, drawSz, drawSz);
        }
        const sparkCnt = p.essenceSparks || 0;
        if (sparkCnt > 0 && ctx.fillRect) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(0.95, alpha * 0.92);
          const spreadR = 24 * (p.scale || 1.5);
          for (let s = 0; s < sparkCnt; s++) {
            const ang = p.seed + ((s + 0.5) / sparkCnt) * Math.PI * 2 + u * 1.4;
            const lift = u * (50 + (s % 3) * 16);
            const sx = Math.round((p.x + Math.cos(ang) * spreadR * (0.35 + u * 0.65)) / 2) * 2;
            const sy = Math.round((p.groundY - 10 - lift) / 2) * 2;
            ctx.fillStyle = '#0d0f1c';
            ctx.fillRect(sx - 3, sy - 3, 6, 6);
            ctx.fillStyle = p.color || '#38bdf8';
            ctx.fillRect(sx - 2, sy - 2, 4, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 1, sy - 1, 2, 2);
          }
        }
      }
      ctx.restore();
    }

    // 4. Wave 3: Milestone Stage Treasure Chests & Gilded Treasure Goblins (100% lossless nearest-neighbor)
    if (this.treasureChests.length > 0) {
      this._renderTreasureChests(ctx, t);
    }
    if (this.treasureGoblins.length > 0) {
      this._renderTreasureGoblins(ctx, t);
    }

    this.skillSets.renderMid(ctx);
  }

  _renderTreasureChests(ctx, t) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;
    const vfxImg = PixelForge.assets?.endlessVfx;
    const vfxReady = isImgReady(vfxImg);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.treasureChests.length; i++) {
      const ch = this.treasureChests[i];
      if (!ch || ch.opened) continue;

      const shakeX = ch.shakeTimer > 0 ? Math.round(Math.sin(t * 72 + i) * 5) : 0;
      const bobY = Math.round(Math.sin(t * 5.2 + i * 1.7) * 2);
      const cx = Math.round(ch.x) + shakeX;
      const gY = Math.round(ch.groundY);
      const pulse = 0.55 + 0.35 * Math.sin(t * 6.5 + i);

      // 1. Shimmering golden vertical pixel light rays behind chest (0 rotate/ellipse/arc)
      const rayOffsets = [-22, -8, 6, 20];
      for (let r = 0; r < rayOffsets.length; r++) {
        const rx = cx + rayOffsets[r];
        const rayH = Math.round(54 + 26 * Math.sin(t * 5.4 + r * 1.45 + i));
        const rayW = r === 1 || r === 2 ? 6 : 4;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.24 * pulse;
        ctx.fillStyle = '#facc15';
        ctx.fillRect(rx - Math.floor(rayW * 0.5), gY - 26 - rayH, rayW, rayH);
        ctx.globalAlpha = 0.36 * pulse;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(rx - 1, gY - 24 - Math.round(rayH * 0.78), 2, Math.round(rayH * 0.78));
      }

      // 2. Ground contact shadow + subtle golden floor glow
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.52;
      ctx.fillStyle = '#05070e';
      ctx.fillRect(cx - 34, gY - 4, 68, 8);
      ctx.fillRect(cx - 26, gY - 6, 52, 12);
      ctx.globalAlpha = 0.32 * pulse;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 28, gY - 2, 56, 4);

      // 3. Chest sprite (`endless_crusade_vfx.png` Row 7 Col 11 Gothic Chest, or crisp pixel fallback)
      ctx.globalAlpha = 1;
      if (vfxReady && ctx.drawImage) {
        const sz = 76;
        const dx = Math.round(cx - sz * 0.5);
        const dy = Math.round(gY - sz + 8 + bobY);
        ctx.drawImage(
          vfxImg,
          11 * ENDLESS_VFX_CELL,
          7 * ENDLESS_VFX_CELL,
          ENDLESS_VFX_CELL,
          ENDLESS_VFX_CELL,
          dx,
          dy,
          sz,
          sz
        );
        if (ch.shakeTimer > 0 || pulse > 0.72) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = ch.shakeTimer > 0 ? 0.18 : 0.12;
          ctx.drawImage(
            vfxImg,
            11 * ENDLESS_VFX_CELL,
            7 * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            sz,
            sz
          );
          ctx.globalCompositeOperation = 'source-over';
        }
      } else {
        // Crisp gothic obsidian-gold pixel treasure chest fallback
        const bx = cx - 28;
        const by = gY - 46 + bobY;
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(bx - 2, by - 2, 60, 48);
        ctx.fillRect(bx + 2, by - 6, 52, 6);
        // Lid
        ctx.fillStyle = '#312e4a';
        ctx.fillRect(bx + 2, by - 4, 52, 16);
        ctx.fillStyle = '#4c3f6e';
        ctx.fillRect(bx + 4, by - 2, 48, 8);
        // Body
        ctx.fillStyle = '#1e1b2e';
        ctx.fillRect(bx, by + 12, 56, 32);
        // Burnished gold frame & vertical iron-gold straps
        ctx.fillStyle = '#d97706';
        ctx.fillRect(bx, by + 10, 56, 4);
        ctx.fillRect(bx, by + 40, 56, 4);
        ctx.fillRect(bx + 2, by - 2, 6, 44);
        ctx.fillRect(bx + 48, by - 2, 6, 44);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(bx + 4, by + 10, 48, 2);
        ctx.fillRect(bx + 3, by, 3, 40);
        ctx.fillRect(bx + 49, by, 3, 40);
        // Central gold lock clasp
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(cx - 7, by + 6, 14, 16);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(cx - 5, by + 8, 10, 12);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - 3, by + 10, 6, 4);
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(cx - 1, by + 14, 2, 4);
      }

      // 4. Crack progress pips (3 crisp pixel diamonds) + auto-crack fuse bar
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const pipY = gY - 68 + bobY;
      const totalPips = Math.max(1, ch.maxTaps || CHEST_TAPS_REQUIRED);
      for (let p = 0; p < totalPips; p++) {
        const px = cx + (p - (totalPips - 1) * 0.5) * 14;
        const intact = p < (ch.tapsLeft || 0);
        ctx.fillStyle = '#050712';
        ctx.fillRect(Math.round(px - 4), pipY - 4, 8, 8);
        ctx.fillStyle = intact ? '#facc15' : '#475569';
        ctx.fillRect(Math.round(px - 3), pipY - 3, 6, 6);
        if (intact) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(px - 1), pipY - 2, 2, 2);
        }
      }

      const fuseRatio = Math.max(
        0,
        Math.min(1, (ch.autoCrackTimer || 0) / Math.max(0.1, ch.maxAutoCrackTimer || CHEST_AUTO_CRACK_SEC))
      );
      ctx.fillStyle = '#050712';
      ctx.fillRect(cx - 24, gY + 6, 48, 4);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 23, gY + 7, Math.max(2, Math.round(46 * fuseRatio)), 2);

      // 5. Crisp `[TAP TO CRACK!]` floating pixel label
      const labelY = gY - 84 + Math.round(Math.sin(t * 7.5 + i) * 2);
      this._drawOutlinedPixelCallout(ctx, '[TAP TO CRACK!]', cx, labelY, 1, '#fde047', '#ffffff');
    }

    ctx.restore();
  }

  _renderTreasureGoblins(ctx, t) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.treasureGoblins.length; i++) {
      const g = this.treasureGoblins[i];
      if (!g || g.isDead) continue;

      const gx = Math.round(g.x);
      const gy = Math.round(g.y || g.groundY);
      const groundY = Math.round(g.groundY);
      const dir = (g.facing || g.runDir || 1) >= 0 ? 1 : -1;
      const stride = Math.sin(g.walkPhase || 0);
      const legA = Math.round(stride * 7);
      const legB = -legA;
      const sackPulse = Math.round(Math.sin(t * 14 + i * 2) * 2);
      const flash = g.hitFlash > 0;

      // Helper draws a mirrored local pixel rectangle (0 rotate/ellipse/arc)
      const r = (lx, ly, w, h, col) => {
        ctx.fillStyle = col;
        const rx = dir > 0 ? gx + lx : gx - lx - w;
        ctx.fillRect(Math.round(rx), Math.round(gy + ly), Math.round(w), Math.round(h));
      };

      // 1. Crisp ground contact shadow
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#05070e';
      ctx.fillRect(gx - 28, groundY - 4, 56, 8);
      ctx.fillRect(gx - 20, groundY - 6, 40, 12);
      ctx.globalAlpha = 1;

      // 2. Trailing golden sparkle motes behind the loot sack
      for (let s = 0; s < 3; s++) {
        const phase = (t * 3.8 + s * 0.33 + i * 0.5) % 1;
        const sx = Math.round(gx - dir * (22 + phase * 36));
        const sy = Math.round(gy - 36 - phase * 22 + Math.sin(t * 11 + s * 2) * 4);
        ctx.globalAlpha = Math.max(0.15, 1 - phase);
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(sx - 3, sy - 3, 6, 6);
        ctx.fillStyle = s === 1 ? '#38bdf8' : '#facc15';
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
      ctx.globalAlpha = 1;

      // 3. Giant Pulsing Golden Treasure Sack slung over back
      const sw = 32 + sackPulse;
      const sh = 36 + sackPulse;
      const sx0 = -34 - Math.floor(sackPulse * 0.5);
      const sy0 = -58 - Math.floor(sackPulse * 0.5);
      // Dark selout outline
      r(sx0 - 2, sy0 - 2, sw + 4, sh + 4, '#0d0f1c');
      r(sx0 + 2, sy0 - 6, sw - 4, 6, '#0d0f1c');
      // Bronze shadow + rich gold body + bright gleaming highlight
      r(sx0, sy0, sw, sh, flash ? '#ffffff' : '#92400e');
      r(sx0 + 2, sy0 + 2, sw - 4, sh - 6, flash ? '#fef9c3' : '#d97706');
      r(sx0 + 4, sy0 + 4, sw - 10, sh - 12, flash ? '#ffffff' : '#facc15');
      r(sx0 + 6, sy0 + 6, Math.max(6, sw - 20), Math.max(6, sh - 22), '#fef08a');
      // Tied crimson-gold sack neck + peeking coins & astral gem!
      r(sx0 + sw - 12, sy0 - 4, 10, 6, '#b91c1c');
      r(sx0 + sw - 10, sy0 - 10, 6, 6, '#facc15');
      r(sx0 + sw - 4, sy0 - 8, 5, 5, '#38bdf8');
      r(sx0 + sw - 14, sy0 - 8, 4, 4, '#ef4444');
      r(sx0 + sw - 9, sy0 - 9, 2, 2, '#ffffff');

      // 4. Sprinting goblin legs & leather boots
      r(-8 + legA, -16, 10, 16, '#0d0f1c');
      r(-6 + legA, -14, 6, 10, '#16a34a');
      r(-6 + legA, -6, 8, 6, '#78350f');
      r(4 + legB, -16, 10, 16, '#0d0f1c');
      r(6 + legB, -14, 6, 10, '#15803d');
      r(6 + legB, -6, 8, 6, '#92400e');

      // 5. Goblin hunched body & tattered crimson-violet bandit tunic
      r(-8, -42, 24, 28, '#0d0f1c');
      r(-6, -40, 20, 24, flash ? '#ffffff' : '#7f1d1d');
      r(-4, -38, 16, 18, flash ? '#fef08a' : '#b91c1c');
      r(-6, -24, 20, 4, '#451a03');
      r(2, -25, 6, 6, '#facc15');
      r(4, -24, 2, 2, '#ffffff');

      // 6. Goblin head, pointed ears, golden-trimmed hood & greedy glowing eyes
      r(-2, -62, 22, 22, '#0d0f1c');
      r(0, -60, 18, 18, flash ? '#ffffff' : '#16a34a');
      r(2, -58, 14, 12, flash ? '#fef9c3' : '#22c55e');
      r(6, -56, 8, 6, '#4ade80');
      // Long pointed rear goblin ear
      r(-12, -56, 12, 8, '#0d0f1c');
      r(-10, -54, 10, 4, '#22c55e');
      r(-6, -54, 6, 2, '#4ade80');
      // Bandit hood with gold band
      r(-4, -66, 22, 10, '#0d0f1c');
      r(-2, -64, 18, 6, '#3b0764');
      r(-2, -60, 18, 3, '#facc15');
      // Greedy glowing yellow eye + toothy grin
      r(10, -54, 5, 4, '#0d0f1c');
      r(11, -53, 3, 2, '#fef08a');
      r(12, -46, 6, 4, '#0d0f1c');
      r(13, -45, 2, 2, '#ffffff');
      r(16, -45, 2, 2, '#ffffff');

      // 7. Front arm clutching the heavy gold sack strap
      r(2, -38, 14, 8, '#0d0f1c');
      r(4, -36, 10, 4, '#22c55e');
      r(-2, -40, 8, 4, '#d97706');

      // 8. Crisp pixel HP bar + escape countdown bar + pulsing `TAP LOOT!` tag
      const hpRatio = Math.max(0, Math.min(1, g.hp / Math.max(1, g.maxHp)));
      const escRatio = Math.max(0, Math.min(1, g.escapeTimer / Math.max(0.1, g.maxEscapeTimer || GOBLIN_ESCAPE_SEC)));
      const barW = 54;
      const barX = gx - Math.floor(barW * 0.5);
      const barY = gy - 82;

      ctx.fillStyle = '#050712';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, 11);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(barX, barY, barW, 5);
      ctx.fillStyle = hpRatio > 0.4 ? '#facc15' : '#fb923c';
      ctx.fillRect(barX, barY, Math.max(2, Math.round(barW * hpRatio)), 5);
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(barX, barY, Math.max(2, Math.round(barW * hpRatio)), 2);

      // Escape countdown hairline directly under HP bar
      ctx.fillStyle = escRatio < 0.28 ? '#ef4444' : '#38bdf8';
      ctx.fillRect(barX, barY + 6, Math.max(1, Math.round(barW * escRatio)), 2);

      const tagY = barY - 12 + Math.round(Math.sin(t * 10 + i) * 2);
      this._drawOutlinedPixelCallout(ctx, 'TAP LOOT!', gx, tagY, 1, '#fde047', '#ffffff');
    }

    ctx.restore();
  }

  renderWorldForeground(ctx, renderer) {
    if (!this.active || !ctx) return;
    const t = renderer?.time || this._clock || 0;
    const vfxImg = PixelForge.assets?.endlessVfx;
    const vfxReady = isImgReady(vfxImg);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Spinning Magnetic Sovereign Gold Coins (Row 0) & Astral Shards (Row 1)
    if (this.coins.length > 0) {
      for (let i = 0; i < this.coins.length; i++) {
        const c = this.coins[i];
        const cx = Math.round(c.x);
        const cy = Math.round(c.y - 18 + Math.sin(t * 7 + c.frameOffset) * 3);
        const gY = Math.round(c.groundY);
        const isShard = c.kind === 'shard';

        // Crisp ground contact shadow
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#05070e';
        ctx.fillRect(cx - 10, gY - 2, 20, 4);

        ctx.globalAlpha = 1;
        if (vfxReady && ctx.drawImage) {
          const frame = (Math.floor(t * 16) + c.frameOffset) % 12;
          const row = isShard ? 1 : 0;
          const sz = isShard ? 46 : 40;
          ctx.drawImage(
            vfxImg,
            frame * ENDLESS_VFX_CELL,
            row * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            Math.round(cx - sz * 0.5),
            Math.round(cy - sz * 0.5),
            sz,
            sz
          );
        } else if (isShard) {
          // Crisp pixel diamond fallback for Astral Shard
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(cx - 7, cy - 11, 14, 22);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(cx - 5, cy - 9, 10, 18);
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(cx - 3, cy - 5, 6, 10);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 1, cy - 7, 2, 6);
        } else {
          // Crisp pixel coin fallback
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(cx - 8, cy - 8, 16, 16);
          ctx.fillStyle = '#d97706';
          ctx.fillRect(cx - 6, cy - 6, 12, 12);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cx - 4, cy - 4, 8, 8);
          ctx.fillStyle = '#fef9c3';
          ctx.fillRect(cx - 2, cy - 4, 4, 4);
        }
      }
    }

    // 2. Arcane Tap-Smite Sky-Bolts (Row 2) & Crit Starbursts (Row 3)
    if (this.tapSmites.length > 0) {
      for (let i = 0; i < this.tapSmites.length; i++) {
        const s = this.tapSmites[i];
        const u = Math.max(0, Math.min(1, s.age / Math.max(0.05, s.maxLife)));
        const frame = Math.min(11, Math.floor(u * 12));
        const sx = Math.round(s.x);
        const sy = Math.round(s.groundY);
        const isCrit = s.kind === 'crit';
        const alpha = u > 0.72 ? Math.max(0, 1 - (u - 0.72) / 0.28) : 1;

        if (vfxReady && ctx.drawImage) {
          const row = isCrit ? 3 : 2;
          const dw = Math.round((isCrit ? 128 : 144) * (s.scale || 1.3));
          const dh = Math.round((isCrit ? 128 : 220) * (s.scale || 1.3));
          const dx = Math.round(sx - dw * 0.5);
          const dy = isCrit ? Math.round(sy - dh * 0.5) : Math.round(sy - dh * 0.88);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            vfxImg,
            frame * ENDLESS_VFX_CELL,
            row * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            dw,
            dh
          );
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.16, alpha * 0.16);
          ctx.drawImage(
            vfxImg,
            frame * ENDLESS_VFX_CELL,
            row * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            dw,
            dh
          );
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha;
          if (isCrit) {
            const r = Math.round(14 + u * 34);
            ctx.fillStyle = '#fb923c';
            ctx.fillRect(sx - r, sy - 3, r * 2, 6);
            ctx.fillRect(sx - 3, sy - r, 6, r * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 6, sy - 6, 12, 12);
          } else {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(sx - 6, sy - 260, 12, 260);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(sx - 2, sy - 260, 4, 260);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 18, sy - 8, 36, 10);
          }
        }
      }
    }

    // 3. Gold Fever Overdrive Bursts (Row 4)
    if (this.feverBursts.length > 0) {
      for (let i = 0; i < this.feverBursts.length; i++) {
        const fb = this.feverBursts[i];
        const u = Math.max(0, Math.min(1, fb.age / Math.max(0.05, fb.maxLife)));
        const frame = Math.min(11, Math.floor(u * 12));
        const fx = Math.round(fb.x);
        const fy = Math.round(fb.groundY);
        const alpha = u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1;

        if (vfxReady && ctx.drawImage) {
          const sz = Math.round(140 * (fb.scale || 1.8));
          const dx = Math.round(fx - sz * 0.5);
          const dy = Math.round(fy - sz * 0.5);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            vfxImg,
            frame * ENDLESS_VFX_CELL,
            4 * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            sz,
            sz
          );
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.16, alpha * 0.16);
          ctx.drawImage(
            vfxImg,
            frame * ENDLESS_VFX_CELL,
            4 * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            sz,
            sz
          );
        } else {
          const r = Math.round(28 + u * 86);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha * 0.85;
          ctx.fillStyle = '#facc15';
          ctx.fillRect(fx - r, fy - 4, r * 2, 8);
          ctx.fillRect(fx - 4, fy - r, 8, r * 2);
          ctx.fillStyle = '#fef9c3';
          ctx.fillRect(fx - 12, fy - 12, 24, 24);
        }
      }
    }

    // 3b. Tap-Fever Overdrive Stepped Pixel Chain Lightning Bolts (100% fillRect)
    if (this.feverChains.length > 0 && typeof ctx.fillRect === 'function') {
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < this.feverChains.length; i++) {
        const bolt = this.feverChains[i];
        const u = Math.max(0, Math.min(1, bolt.age / Math.max(0.04, bolt.maxLife || FEVER_CHAIN_LIFE)));
        const baseAlpha = u < 0.55 ? 1 : Math.max(0, 1 - (u - 0.55) / 0.45);
        const flicker = u > 0.45 && Math.floor(bolt.age * 42) % 3 === 0 ? 0.55 : 1.0;
        const alpha = baseAlpha * flicker;
        if (alpha <= 0.02) continue;

        const isTier2 = (bolt.tier || 1) >= 2;
        const glowCol = isTier2 ? '#38bdf8' : '#d97706';
        const midCol = isTier2 ? '#facc15' : '#fde047';
        const mainPts = bolt.main || [
          { x: bolt.x1, y: bolt.y1 },
          { x: bolt.x2, y: bolt.y2 }
        ];

        // Outer electric halo -> bright lightning body -> crisp white core
        ctx.globalAlpha = alpha * 0.58;
        this._drawPixelPolyline(ctx, mainPts, isTier2 ? 8 : 6, glowCol);
        ctx.globalAlpha = alpha * 0.94;
        this._drawPixelPolyline(ctx, mainPts, 4, midCol);
        ctx.globalAlpha = alpha;
        this._drawPixelPolyline(ctx, mainPts, 2, '#ffffff');

        // Crisp stepped sub-branch fork
        if (Array.isArray(bolt.branch) && bolt.branch.length >= 2) {
          ctx.globalAlpha = alpha * 0.52;
          this._drawPixelPolyline(ctx, bolt.branch, 4, glowCol);
          ctx.globalAlpha = alpha * 0.9;
          this._drawPixelPolyline(ctx, bolt.branch, 2, '#fef9c3');
        }

        // Stepped pixel diamond flash at chained target impact point
        const ix = Math.round(bolt.x2);
        const iy = Math.round(bolt.y2);
        const r = Math.round(10 + (1 - u) * 8);
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = '#050712';
        ctx.fillRect(ix - r - 1, iy - 3, (r + 1) * 2, 6);
        ctx.fillRect(ix - 3, iy - r - 1, 6, (r + 1) * 2);
        ctx.fillStyle = glowCol;
        ctx.fillRect(ix - r, iy - 2, r * 2, 4);
        ctx.fillRect(ix - 2, iy - r, 4, r * 2);
        ctx.fillStyle = midCol;
        ctx.fillRect(ix - 5, iy - 5, 10, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ix - 2, iy - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
    }

    // 3c. Wave 4 Bursts: Treasure Goblin Coin Burst (Row 8 Cols 0..5) & Astral Ascension Starburst (Row 8 Cols 6..11)
    if (this.wave4Bursts.length > 0) {
      const hasRow8 = Boolean(vfxReady && (vfxImg.naturalHeight || vfxImg.height || 0) >= ENDLESS_VFX_CELL * 9);
      for (let i = 0; i < this.wave4Bursts.length; i++) {
        const wb = this.wave4Bursts[i];
        const u = Math.max(0, Math.min(1, wb.age / Math.max(0.05, wb.maxLife)));
        const localFrame = Math.min(5, Math.floor(u * 6));
        const col = wb.kind === 'ascension' ? 6 + localFrame : localFrame;
        const wx = Math.round(wb.x);
        const wy = Math.round(wb.groundY);
        const alpha = u > 0.72 ? Math.max(0, 1 - (u - 0.72) / 0.28) : 1;

        if (hasRow8 && ctx.drawImage) {
          const sz = Math.round(136 * (wb.scale || 1.65));
          const dx = Math.round(wx - sz * 0.5);
          const dy = Math.round(wy - sz * 0.5);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            vfxImg,
            col * ENDLESS_VFX_CELL,
            8 * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            sz,
            sz
          );
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.18, alpha * 0.18);
          ctx.drawImage(
            vfxImg,
            col * ENDLESS_VFX_CELL,
            8 * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            sz,
            sz
          );
        } else if (typeof ctx.fillRect === 'function') {
          const r = Math.round(24 + u * 72);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha * 0.9;
          ctx.fillStyle = wb.kind === 'ascension' ? '#c084fc' : '#facc15';
          ctx.fillRect(wx - r, wy - 4, r * 2, 8);
          ctx.fillRect(wx - 4, wy - r, 8, r * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(wx - 10, wy - 10, 20, 20);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // 4. Companions foreground projectiles/strikes, SkillSets foreground, Blood-Reaver Nova, Gear Loot Beams & Wave 8 Shrines/Merchant
    this.companions?.renderForegroundFX?.(ctx, renderer);
    this.skillSets.renderForeground(ctx);
    if (this._gearNovaFx.length > 0) {
      this._renderGearNovaFx(ctx);
    }
    if (this.lootBeams.length > 0) {
      this._renderLootBeams(ctx, t);
    }
    if (this.worldShrines.length > 0) {
      this._renderWorldShrines(ctx, t);
    }
    if (this.wanderingMerchants.length > 0) {
      this._renderWanderingMerchants(ctx, t);
    }
    this._renderSanctuaryShieldAura(ctx, t);

    // 5. Crisp PixelFont Floating World Callouts (Pop-In Scale + #050712 2px Pixel Outline)
    if (this.floatingCallouts.length > 0 && typeof ctx.fillRect === 'function') {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < this.floatingCallouts.length; i++) {
        const fc = this.floatingCallouts[i];
        const u = Math.max(0, Math.min(1, fc.age / Math.max(0.1, fc.maxLife)));
        const fade = u > 0.65 ? Math.max(0, 1 - (u - 0.65) / 0.35) : 1;
        if (fade <= 0.02) continue;

        const popDur = 0.14;
        let popScale = 1;
        if (fc.age < popDur) {
          const k = fc.age / popDur;
          const peak = fc.popPeak || 1.2;
          if (k < 0.45) {
            const tIn = k / 0.45;
            popScale = 0.58 + (peak - 0.58) * (1 - (1 - tIn) * (1 - tIn));
          } else {
            const tOut = (k - 0.45) / 0.55;
            popScale = peak - (peak - 1) * (tOut * tOut * (3 - 2 * tOut));
          }
        }

        const drawX = Math.round(fc.x);
        const drawY = Math.round(fc.y);
        const topCol = fc.topColor || '#ffffff';

        ctx.globalAlpha = fade;
        if (
          Math.abs(popScale - 1) > 0.01 &&
          typeof ctx.translate === 'function' &&
          typeof ctx.scale === 'function'
        ) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.translate(drawX, drawY);
          ctx.scale(popScale, popScale);
          this._drawOutlinedPixelCallout(ctx, fc.text, 0, 0, fc.scale, fc.color, topCol);
          ctx.restore();
        } else {
          this._drawOutlinedPixelCallout(ctx, fc.text, drawX, drawY, fc.scale, fc.color, topCol);
        }
      }
      ctx.restore();
    }

    // 6. Manual Target-Lock Reticle (pure stepped pixel brackets, 0 rotate/ellipse/arc)
    if (!this.autoPlay && this.manualTargetLock) {
      const locked = this.getActiveLockedMonster(this.game?.leftFighter);
      if (locked && !locked.isDead) {
        const pulse = Math.round(Math.sin(t * 8) * 3);
        const cx = Math.round(locked.isColossalBoss ? (locked.anchorX || locked.x) - 56 : locked.x);
        const cy = Math.round(
          locked.isColossalBoss
            ? (locked.anchorGroundY || this.depthMidY) - 148
            : (locked.y || locked.groundY || this.depthMidY) - 56
        );
        const hw = (locked.isColossalBoss ? 72 : 38) + pulse;
        const hh = (locked.isColossalBoss ? 82 : 48) + pulse;
        const arm = 12;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const bar = (x, y, w, h, col) => {
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
          ctx.fillStyle = col;
          ctx.fillRect(x, y, w, h);
        };
        bar(cx - hw, cy - hh, arm, 3, '#38bdf8');
        bar(cx - hw, cy - hh, 3, arm, '#38bdf8');
        bar(cx + hw - arm, cy - hh, arm, 3, '#38bdf8');
        bar(cx + hw - 3, cy - hh, 3, arm, '#38bdf8');
        bar(cx - hw, cy + hh - 3, arm, 3, '#38bdf8');
        bar(cx - hw, cy + hh - arm, 3, arm, '#38bdf8');
        bar(cx + hw - arm, cy + hh - 3, arm, 3, '#38bdf8');
        bar(cx + hw - 3, cy + hh - arm, 3, arm, '#38bdf8');
        PixelFont.drawCentered(ctx, 'LOCKED', cx, cy - hh - 10, 1, '#fde047', '#ffffff', true);
        ctx.restore();
      }
    }
  }

  _renderGearNovaFx(ctx) {
    if (!ctx || typeof ctx.fillRect !== 'function' || !this._gearNovaFx.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < this._gearNovaFx.length; i++) {
      const fx = this._gearNovaFx[i];
      if (!fx) continue;
      const u = Math.max(0, Math.min(1, fx.age / Math.max(0.05, fx.maxLife || 0.42)));
      const ease = 1 - Math.pow(1 - u, 2);
      const alpha = u < 0.18 ? u / 0.18 : Math.max(0, 1 - (u - 0.18) / 0.82);
      if (alpha <= 0.02) continue;

      const cx = Math.round(fx.x);
      const gy = Math.round(fx.groundY);
      const rx = Math.round((22 + ease * (fx.maxRadius || BLOOD_REAVER_NOVA_RADIUS)) / 2) * 2;
      const ry = Math.max(8, Math.round((rx * 0.34) / 2) * 2);
      const pts = 20;

      for (let p = 0; p < pts; p++) {
        const ang = (p / pts) * Math.PI * 2;
        const px = Math.round((cx + Math.cos(ang) * rx) / 2) * 2;
        const py = Math.round((gy + Math.sin(ang) * ry) / 2) * 2;
        ctx.globalAlpha = alpha * 0.72;
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(px - 4, py - 2, 8, 4);
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(px - 3, py - 2, 6, 4);
        if (p % 2 === 0 || fx.empowered) {
          ctx.fillStyle = fx.empowered ? '#ffffff' : '#fda4af';
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
      }

      const irx = Math.round(rx * 0.62);
      const iry = Math.max(4, Math.round(ry * 0.62));
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(cx - irx, gy - 2, irx * 2, 4);
      ctx.fillRect(cx - 2, gy - iry, 4, iry * 2);
    }

    ctx.restore();
  }

  _renderLootBeams(ctx, t) {
    if (!ctx || typeof ctx.fillRect !== 'function' || !this.lootBeams.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < this.lootBeams.length; i++) {
      const b = this.lootBeams[i];
      if (!b || b.collected || !b.item) continue;

      const bx = Math.round(b.x);
      const gY = Math.round(b.groundY);
      const rm = b.rarityMeta || GEAR_RARITY_BY_ID?.[b.item.rarity] || {};
      const col = rm.color || '#94a3b8';
      const glowCol = rm.glowHex || '#cbd5e1';
      const tier = Number.isFinite(rm.tier)
        ? rm.tier
        : b.item.rarity === 'mythic'
          ? 4
          : b.item.rarity === 'sovereign'
            ? 3
            : b.item.rarity === 'heroic'
              ? 2
              : b.item.rarity === 'arcane'
                ? 1
                : 0;
      const baseH = Number.isFinite(rm.beamHeight) ? rm.beamHeight : 112 + tier * 30;
      const spawnPop = b.age < 0.22 ? 0.25 + 0.75 * (1 - Math.pow(1 - b.age / 0.22, 3)) : 1.0;
      const beamH = Math.max(32, Math.round(baseH * spawnPop));
      const pulse = 0.72 + 0.28 * Math.sin(t * (5.5 + tier * 1.2) + (b.bobPhase || 0));
      const bobY = Math.round(Math.sin(t * 4.8 + (b.bobPhase || 0)) * 4);

      // 1. Stepped pixel diamond ground pedestal
      ctx.globalAlpha = 0.56;
      ctx.fillStyle = '#05070e';
      ctx.fillRect(bx - 22, gY - 2, 44, 4);
      ctx.fillRect(bx - 16, gY - 4, 32, 8);
      ctx.fillRect(bx - 10, gY - 6, 20, 12);

      ctx.globalAlpha = 0.92;
      ctx.fillStyle = col;
      ctx.fillRect(bx - 18, gY - 1, 36, 2);
      ctx.fillRect(bx - 12, gY - 3, 24, 6);
      ctx.fillRect(bx - 6, gY - 5, 12, 10);
      ctx.fillStyle = glowCol;
      ctx.fillRect(bx - 8, gY - 2, 16, 4);
      ctx.fillRect(bx - 4, gY - 3, 8, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 2, gY - 1, 4, 2);

      // 2. Stepped vertical rarity glow pillar + bright core shaft
      const outerW = 18 + tier * 4;
      const midW = 10 + tier * 2;
      const coreW = tier >= 4 ? 6 : 4;
      const hLow = Math.round(beamH * 0.42);
      const hMid = Math.round(beamH * 0.76);

      ctx.globalAlpha = (0.14 + tier * 0.025) * pulse;
      ctx.fillStyle = col;
      ctx.fillRect(bx - Math.floor(outerW * 0.5), gY - hLow, outerW, hLow);
      ctx.fillRect(bx - Math.floor((outerW - 4) * 0.5), gY - hMid, Math.max(4, outerW - 4), hMid - hLow);
      ctx.fillRect(bx - Math.floor((outerW - 8) * 0.5), gY - beamH, Math.max(2, outerW - 8), beamH - hMid);

      ctx.globalAlpha = (0.34 + tier * 0.05) * pulse;
      ctx.fillStyle = col;
      ctx.fillRect(bx - Math.floor(midW * 0.5), gY - hMid, midW, hMid);
      ctx.fillRect(bx - Math.floor((midW - 2) * 0.5), gY - beamH, Math.max(2, midW - 2), beamH - hMid);

      ctx.globalAlpha = Math.min(0.95, (0.64 + tier * 0.06) * pulse);
      ctx.fillStyle = glowCol;
      ctx.fillRect(bx - Math.floor(coreW * 0.5), gY - Math.round(beamH * 0.92), coreW, Math.round(beamH * 0.92));

      ctx.globalAlpha = Math.min(0.95, 0.78 * pulse);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 1, gY - Math.round(beamH * 0.74), 2, Math.round(beamH * 0.74));

      // Rising pixel sparkle motes
      const moteCount = 3 + tier;
      for (let m = 0; m < moteCount; m++) {
        const phase = (t * (0.55 + (m % 2) * 0.25) + m * 0.23 + (b.bobPhase || 0)) % 1;
        const my = Math.round(gY - 12 - phase * (beamH - 12));
        const mx = bx + ((m % 3) - 1) * (4 + tier) + Math.round(Math.sin(t * 4 + m * 2) * 2);
        ctx.globalAlpha = Math.max(0.15, (1 - phase) * 0.92);
        ctx.fillStyle = m % 2 === 0 ? '#ffffff' : glowCol;
        ctx.fillRect(mx - 1, my - 1, 2, 2);
      }

      // 3. Bobbing pixel relic/gem emblem
      const ey = gY - 34 + bobY;
      const slot = b.item.slot || 'weapon';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#050712';
      ctx.fillRect(bx - 10, ey - 10, 20, 20);
      ctx.fillRect(bx - 6, ey - 12, 12, 24);
      ctx.fillRect(bx - 12, ey - 6, 24, 12);
      ctx.fillStyle = '#14182a';
      ctx.fillRect(bx - 8, ey - 8, 16, 16);
      ctx.fillStyle = col;
      ctx.fillRect(bx - 8, ey - 8, 16, 2);
      ctx.fillRect(bx - 8, ey + 6, 16, 2);
      ctx.fillRect(bx - 8, ey - 8, 2, 16);
      ctx.fillRect(bx + 6, ey - 8, 2, 16);

      if (slot === 'weapon') {
        ctx.fillStyle = glowCol;
        ctx.fillRect(bx - 1, ey - 6, 2, 9);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - 1, ey - 6, 2, 4);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(bx - 4, ey + 2, 8, 2);
        ctx.fillRect(bx - 1, ey + 4, 2, 3);
      } else if (slot === 'armor') {
        ctx.fillStyle = col;
        ctx.fillRect(bx - 5, ey - 5, 10, 8);
        ctx.fillRect(bx - 3, ey + 3, 6, 3);
        ctx.fillStyle = glowCol;
        ctx.fillRect(bx - 3, ey - 3, 6, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - 1, ey - 3, 2, 6);
      } else if (slot === 'amulet') {
        ctx.fillStyle = glowCol;
        ctx.fillRect(bx - 4, ey - 2, 8, 6);
        ctx.fillRect(bx - 2, ey - 4, 4, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - 2, ey - 2, 2, 2);
      } else {
        ctx.fillStyle = glowCol;
        ctx.fillRect(bx - 4, ey - 3, 8, 8);
        ctx.fillStyle = '#14182a';
        ctx.fillRect(bx - 2, ey - 1, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - 2, ey - 5, 4, 2);
      }

      // 4. Crisp PixelFont rarity tag above pillar/emblem
      const slotMeta = GEAR_SLOT_META?.[slot] || {};
      const rarityLabel = String(rm.label || b.item.rarity || 'GEAR').toUpperCase();
      const slotShort = String(slotMeta.shortLabel || slot || '').toUpperCase();
      const tagText = slotShort ? `${rarityLabel} ${slotShort}` : rarityLabel;
      const tagY = gY - Math.min(beamH + 8, 122) + Math.round(bobY * 0.5);
      const tagW = PixelFont.measureWidth(tagText, 1) + 10;
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = '#050712';
      ctx.fillRect(Math.round(bx - tagW * 0.5), tagY - 6, tagW, 13);
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(bx - tagW * 0.5), tagY - 6, tagW, 1);
      ctx.fillRect(Math.round(bx - tagW * 0.5), tagY + 6, tagW, 1);
      ctx.globalAlpha = 1;
      this._drawOutlinedPixelCallout(ctx, tagText, bx, tagY, 1, glowCol, '#ffffff');
    }

    ctx.restore();
  }

  _renderWorldShrines(ctx, t) {
    if (!ctx || typeof ctx.fillRect !== 'function' || !this.worldShrines.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < this.worldShrines.length; i++) {
      const s = this.worldShrines[i];
      if (!s || s.activated) continue;
      const def = s.def || ENDLESS_SHRINE_BY_ID?.[s.shrineId] || {};
      const col = def.accentHex || '#facc15';
      const glowCol = def.glowHex || '#fef08a';
      const sx = Math.round(s.x);
      const gY = Math.round(s.groundY);
      const pulse = 0.68 + 0.32 * Math.sin(t * 5.2 + (s.pulsePhase || 0));
      const bobY = Math.round(Math.sin(t * 4.4 + (s.pulsePhase || 0)) * 3);

      // 1. Stepped ground contact shadow & glowing altar rune base
      ctx.globalAlpha = 0.56;
      ctx.fillStyle = '#05070e';
      ctx.fillRect(sx - 34, gY - 3, 68, 6);
      ctx.fillRect(sx - 26, gY - 5, 52, 10);
      ctx.globalAlpha = 0.42 * pulse;
      ctx.fillStyle = col;
      ctx.fillRect(sx - 30, gY - 2, 60, 4);
      ctx.globalAlpha = 0.62 * pulse;
      ctx.fillStyle = glowCol;
      ctx.fillRect(sx - 18, gY - 1, 36, 2);

      // 2. Soft vertical pixel glow pillar behind crystal obelisk
      ctx.globalAlpha = 0.16 * pulse;
      ctx.fillStyle = col;
      ctx.fillRect(sx - 14, gY - 118, 28, 104);
      ctx.globalAlpha = 0.24 * pulse;
      ctx.fillStyle = glowCol;
      ctx.fillRect(sx - 6, gY - 110, 12, 96);

      // 3. Stepped Gothic stone altar pedestal
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#050712';
      ctx.fillRect(sx - 26, gY - 12, 52, 14);
      ctx.fillRect(sx - 20, gY - 28, 40, 18);
      ctx.fillRect(sx - 24, gY - 34, 48, 8);
      // Slate stone base & bevels
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(sx - 24, gY - 10, 48, 10);
      ctx.fillRect(sx - 18, gY - 26, 36, 16);
      ctx.fillRect(sx - 22, gY - 32, 44, 6);
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx - 22, gY - 10, 44, 4);
      ctx.fillRect(sx - 16, gY - 26, 32, 12);
      ctx.fillRect(sx - 20, gY - 32, 40, 3);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(sx - 20, gY - 32, 40, 1);
      ctx.fillRect(sx - 22, gY - 10, 44, 1);
      // Carved glowing vertical rune channel in pedestal
      ctx.fillStyle = col;
      ctx.fillRect(sx - 3, gY - 26, 6, 18);
      ctx.fillStyle = glowCol;
      ctx.fillRect(sx - 1, gY - 24, 2, 14);

      // 4. Floating glowing colored crystal obelisk above altar
      const oy = gY - 68 + bobY;
      ctx.fillStyle = '#050712';
      ctx.fillRect(sx - 4, oy - 30, 8, 6);
      ctx.fillRect(sx - 8, oy - 24, 16, 10);
      ctx.fillRect(sx - 12, oy - 14, 24, 24);
      ctx.fillRect(sx - 8, oy + 10, 16, 10);
      ctx.fillRect(sx - 4, oy + 20, 8, 6);

      ctx.fillStyle = col;
      ctx.fillRect(sx - 2, oy - 28, 4, 6);
      ctx.fillRect(sx - 6, oy - 22, 12, 10);
      ctx.fillRect(sx - 10, oy - 12, 20, 20);
      ctx.fillRect(sx - 6, oy + 8, 12, 10);
      ctx.fillRect(sx - 2, oy + 18, 4, 6);

      ctx.fillStyle = glowCol;
      ctx.fillRect(sx - 4, oy - 20, 8, 8);
      ctx.fillRect(sx - 6, oy - 12, 12, 16);
      ctx.fillRect(sx - 4, oy + 4, 8, 8);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx - 2, oy - 18, 3, 20);
      ctx.fillRect(sx - 4, oy - 10, 2, 6);

      // 5. Floating pixel rune motes orbiting / rising around obelisk
      for (let m = 0; m < 4; m++) {
        const phase = (t * 0.65 + m * 0.25 + (s.pulsePhase || 0)) % 1;
        const mAngle = t * 2.6 + m * 1.57 + (s.pulsePhase || 0);
        const mx = Math.round(sx + Math.cos(mAngle) * 20);
        const my = Math.round(gY - 28 - phase * 76);
        ctx.globalAlpha = Math.max(0.18, (1 - phase) * 0.95);
        ctx.fillStyle = '#050712';
        ctx.fillRect(mx - 2, my - 2, 5, 5);
        ctx.fillStyle = m % 2 === 0 ? glowCol : col;
        ctx.fillRect(mx - 1, my - 1, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx, my, 1, 1);
      }

      // 6. Lifetime bar + Crisp PixelFont Shrine label pill
      ctx.globalAlpha = 1;
      const lifeRatio = Math.max(
        0,
        Math.min(1, 1 - (s.age || 0) / Math.max(1, s.maxAge || WORLD_SHRINE_MAX_AGE))
      );
      ctx.fillStyle = '#050712';
      ctx.fillRect(sx - 24, gY + 6, 48, 4);
      ctx.fillStyle = col;
      ctx.fillRect(sx - 23, gY + 7, Math.max(2, Math.round(46 * lifeRatio)), 2);

      const labelText = String(def.shortLabel || def.name || 'SHRINE').toUpperCase();
      const nameText = String(def.name || 'ARCANE SHRINE').toUpperCase();
      const tagY = oy - 42;
      const nameW = PixelFont.measureWidth(nameText, 1);
      const subW = PixelFont.measureWidth(labelText, 1);
      const pillW = Math.max(nameW, subW) + 12;
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = '#050712';
      ctx.fillRect(Math.round(sx - pillW * 0.5), tagY - 13, pillW, 23);
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(sx - pillW * 0.5), tagY - 13, pillW, 1);
      ctx.fillRect(Math.round(sx - pillW * 0.5), tagY + 9, pillW, 1);
      ctx.globalAlpha = 1;
      this._drawOutlinedPixelCallout(ctx, nameText, sx, tagY - 6, 1, glowCol, '#ffffff');
      this._drawOutlinedPixelCallout(ctx, labelText, sx, tagY + 4, 1, col, '#ffffff');
    }

    ctx.restore();
  }

  _renderWanderingMerchants(ctx, t) {
    if (!ctx || typeof ctx.fillRect !== 'function' || !this.wanderingMerchants.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < this.wanderingMerchants.length; i++) {
      const m = this.wanderingMerchants[i];
      if (!m || m.interacted) continue;

      const mx = Math.round(m.x);
      const gY = Math.round(m.groundY);
      const bobY = Math.round(Math.sin(t * 3.4 + (m.bobPhase || 0)) * 2);
      const lanternPulse = 0.72 + 0.28 * Math.sin(t * 7.8 + (m.bobPhase || 0));

      // 1. Contact shadow + warm golden lantern ground glow
      ctx.globalAlpha = 0.54;
      ctx.fillStyle = '#05070e';
      ctx.fillRect(mx - 30, gY - 3, 60, 6);
      ctx.fillRect(mx - 22, gY - 5, 44, 10);
      ctx.globalAlpha = 0.34 * lanternPulse;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(mx - 6, gY - 2, 42, 4);

      // 2. Bulging leather merchant pack behind cloak
      ctx.globalAlpha = 1;
      const py = gY - 52 + bobY;
      ctx.fillStyle = '#050712';
      ctx.fillRect(mx - 28, py - 2, 22, 30);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(mx - 26, py, 18, 26);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(mx - 24, py + 2, 14, 18);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(mx - 26, py + 8, 18, 2);
      ctx.fillRect(mx - 20, py + 6, 4, 6);
      // Peeking arcane scroll & violet elixir bottle on top of pack
      ctx.fillStyle = '#050712';
      ctx.fillRect(mx - 25, py - 10, 8, 10);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(mx - 24, py - 9, 6, 8);
      ctx.fillStyle = '#050712';
      ctx.fillRect(mx - 17, py - 12, 8, 12);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(mx - 16, py - 10, 6, 9);
      ctx.fillStyle = '#f5d0fe';
      ctx.fillRect(mx - 15, py - 9, 2, 4);

      // 3. Hooded Obsidian Cloak & Gold-Trimmed Robes
      const by = gY + bobY;
      ctx.fillStyle = '#050712';
      ctx.fillRect(mx - 18, by - 62, 36, 62);
      ctx.fillRect(mx - 14, by - 76, 28, 18);
      ctx.fillRect(mx - 10, by - 82, 20, 8);
      // Main deep obsidian cloak
      ctx.fillStyle = '#14182a';
      ctx.fillRect(mx - 16, by - 60, 32, 58);
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(mx - 12, by - 58, 24, 52);
      // Burnished gold cloak borders & mantle clasp
      ctx.fillStyle = '#d97706';
      ctx.fillRect(mx - 16, by - 6, 32, 4);
      ctx.fillRect(mx - 2, by - 58, 4, 54);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(mx - 14, by - 5, 28, 2);
      ctx.fillRect(mx - 4, by - 52, 8, 6);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(mx - 2, by - 50, 4, 2);

      // Shadowed Gothic Hood & Glowing Golden Eyes
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(mx - 12, by - 74, 24, 16);
      ctx.fillRect(mx - 8, by - 80, 16, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(mx - 12, by - 60, 24, 2);
      ctx.fillStyle = '#050712';
      ctx.fillRect(mx - 6, by - 71, 14, 11);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(mx - 3, by - 67, 3, 2);
      ctx.fillRect(mx + 3, by - 67, 3, 2);

      // 4. Extended Lantern Staff & Glowing Golden Pixel Lantern
      const lx = mx + 24;
      const ly = by - 50 + Math.round(Math.sin(t * 5.6 + (m.bobPhase || 0)) * 2);
      // Staff arm & iron hook
      ctx.fillStyle = '#050712';
      ctx.fillRect(mx + 12, by - 54, 14, 6);
      ctx.fillRect(lx - 2, by - 74, 4, 24);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(mx + 13, by - 53, 12, 4);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(lx - 1, by - 72, 2, 20);

      // Warm stepped lantern light halo
      ctx.globalAlpha = 0.22 * lanternPulse;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(lx - 16, ly - 14, 32, 30);
      ctx.globalAlpha = 0.34 * lanternPulse;
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(lx - 10, ly - 8, 20, 18);

      // Crisp iron & amber pixel lantern body
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#050712';
      ctx.fillRect(lx - 7, ly - 8, 14, 18);
      ctx.fillRect(lx - 5, ly - 10, 10, 22);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(lx - 5, ly - 6, 10, 14);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(lx - 3, ly - 4, 6, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lx - 1, ly - 2, 2, 6);

      // Floating golden motes around lantern
      for (let d = 0; d < 3; d++) {
        const phase = (t * 0.72 + d * 0.33 + (m.bobPhase || 0)) % 1;
        const dx = lx + Math.round(Math.sin(t * 4.5 + d * 2.1) * 10);
        const dy = Math.round(ly - 8 - phase * 28);
        ctx.globalAlpha = Math.max(0.15, (1 - phase) * 0.92);
        ctx.fillStyle = d === 0 ? '#ffffff' : '#fde047';
        ctx.fillRect(dx - 1, dy - 1, 2, 2);
      }

      // 5. Duration bar + Crisp PixelFont `MERCHANT` tag
      ctx.globalAlpha = 1;
      const lifeRatio = Math.max(
        0,
        Math.min(1, 1 - (m.age || 0) / Math.max(1, m.maxAge || WANDERING_MERCHANT_MAX_AGE))
      );
      ctx.fillStyle = '#050712';
      ctx.fillRect(mx - 22, gY + 6, 44, 4);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(mx - 21, gY + 7, Math.max(2, Math.round(42 * lifeRatio)), 2);

      const tagText = 'MERCHANT';
      const tagY = by - 94;
      const pillW = PixelFont.measureWidth(tagText, 1) + 12;
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = '#050712';
      ctx.fillRect(Math.round(mx - pillW * 0.5), tagY - 6, pillW, 13);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(Math.round(mx - pillW * 0.5), tagY - 6, pillW, 1);
      ctx.fillRect(Math.round(mx - pillW * 0.5), tagY + 6, pillW, 1);
      ctx.globalAlpha = 1;
      this._drawOutlinedPixelCallout(ctx, tagText, mx, tagY, 1, '#fde047', '#ffffff');
    }

    ctx.restore();
  }

  _renderSanctuaryShieldAura(ctx, t) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;
    const eventMods = this.events?.getEventModifiers?.() || null;
    if (!eventMods || !(eventMods.damageReduction > 0)) return;
    const player = this.game?.leftFighter;
    if (!player || player.isDead) return;

    const px = Math.round(player.x);
    const py = Math.round((player.groundY || player.y || this.depthMidY) - 48);
    const pulse = 0.62 + 0.32 * Math.sin(t * 7.2);
    const hw = 42;
    const hh = 52;
    const arm = 12;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.24 * pulse;
    ctx.fillStyle = '#34d399';
    ctx.fillRect(px - hw, py - hh, hw * 2, 2);
    ctx.fillRect(px - hw, py + hh - 2, hw * 2, 2);
    ctx.fillRect(px - hw, py - hh, 2, hh * 2);
    ctx.fillRect(px + hw - 2, py - hh, 2, hh * 2);

    ctx.globalAlpha = 0.86 * pulse;
    const drawCorner = (x, y, w, h) => {
      ctx.fillStyle = '#34d399';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#6ee7b7';
      ctx.fillRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2));
    };
    drawCorner(px - hw, py - hh, arm, 3);
    drawCorner(px - hw, py - hh, 3, arm);
    drawCorner(px + hw - arm, py - hh, arm, 3);
    drawCorner(px + hw - 3, py - hh, 3, arm);
    drawCorner(px - hw, py + hh - 3, arm, 3);
    drawCorner(px - hw, py + hh - arm, 3, arm);
    drawCorner(px + hw - arm, py + hh - 3, arm, 3);
    drawCorner(px + hw - 3, py + hh - arm, 3, arm);
    ctx.restore();
  }

  _drawPixelSegment(ctx, x0, y0, x1, y1, thickness, color) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const step = Math.max(2, Math.floor(thickness * 0.75));
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / step));
    const half = Math.floor(thickness * 0.5);
    ctx.fillStyle = color;
    for (let s = 0; s <= steps; s++) {
      const px = Math.round((x0 + (dx * s) / steps) / 2) * 2;
      const py = Math.round((y0 + (dy * s) / steps) / 2) * 2;
      ctx.fillRect(px - half, py - half, thickness, thickness);
    }
  }

  _drawPixelPolyline(ctx, pts, thickness, color) {
    if (!Array.isArray(pts) || pts.length < 2) return;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      this._drawPixelSegment(ctx, a.x, a.y, b.x, b.y, thickness, color);
    }
  }

  _drawOutlinedPixelCallout(ctx, text, cx, cy, pixelSize, mainColor, topColor = '#ffffff') {
    const p = Math.max(1, Math.round(pixelSize || 1));
    const ix = Math.round(cx);
    const iy = Math.round(cy);
    if (p === 1) {
      // Crisp 2px dark #050712 pixel ring around 1x glyphs + 1px bottom drop weight
      const ring = [
        [-2, 0],
        [2, 0],
        [0, -2],
        [0, 2],
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
        [0, 3]
      ];
      for (let i = 0; i < ring.length; i++) {
        PixelFont.drawCentered(ctx, text, ix + ring[i][0], iy + ring[i][1], 1, '#050712', '#050712', false);
      }
      PixelFont.drawCentered(ctx, text, ix, iy, 1, mainColor, topColor, true);
    } else {
      // 2x glyphs already have a 2px cardinal outline; add crisp diagonal corners & drop shadow in #050712
      const diag = [
        [-2, -2],
        [2, -2],
        [-2, 2],
        [2, 2],
        [0, 3],
        [2, 3]
      ];
      for (let i = 0; i < diag.length; i++) {
        PixelFont.drawCentered(ctx, text, ix + diag[i][0], iy + diag[i][1], p, '#050712', '#050712', false);
      }
      PixelFont.drawCentered(ctx, text, ix, iy, p, mainColor, topColor, true);
    }
  }

  _fitPixelText(text, pixelSize, maxPx) {
    const raw = String(text || '').toUpperCase();
    if (!raw || maxPx <= 0) return '';
    if (PixelFont.measureWidth(raw, pixelSize) <= maxPx) return raw;
    const ellipsis = '...';
    const ellW = PixelFont.measureWidth(ellipsis, pixelSize);
    if (ellW >= maxPx) return '';
    let lo = 0;
    let hi = raw.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) * 0.5);
      const cand = `${raw.slice(0, mid).trimEnd()}${ellipsis}`;
      if (PixelFont.measureWidth(cand, pixelSize) <= maxPx) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo > 0 ? `${raw.slice(0, lo).trimEnd()}${ellipsis}` : '';
  }

  _getHudClearance(w, h, hudBot, isNarrowLandscape, isCompactPortrait, renderer = null) {
    const isShort = h <= 500;
    const hasParty = (this.companions?.activeSlots?.length || 0) > 0;
    const drawerOpen = Boolean(this.shopUI?.isDrawerOpen?.());
    const trialActive = Boolean(this.trials?.isActive?.());
    const bossActive = Boolean(this.isBossEncounter || (this.bossEntity && !this.bossEntity.isDead));
    const eventsBuffCount = this.events?.activeBuffs?.length || 0;
    const hasMerchant = Boolean(this.events?.activeMerchantOffer);
    const cacheKey = `${w}x${h}:${isNarrowLandscape ? 1 : 0}:${isCompactPortrait ? 1 : 0}:${hasParty ? 1 : 0}:${drawerOpen ? 1 : 0}:${trialActive ? 1 : 0}:${bossActive ? 1 : 0}:${eventsBuffCount}:${hasMerchant ? 1 : 0}`;
    const nowSec =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now() * 0.001
        : this._clock || 0;
    if (
      this._hudClearanceCache &&
      this._hudClearanceCache.key === cacheKey &&
      this._hudClearanceCachedAt >= 0 &&
      nowSec - this._hudClearanceCachedAt < 0.25
    ) {
      return this._hudClearanceCache;
    }

    let domTopBottom = 0;
    let domPartyRight = 0;
    let domPartyBottom = 0;
    let domShopBottom = 0;
    let domDrawerLeft = 0;
    let domDrawerTop = 0;
    let domEventsLeft = 0;
    let domEventsBottom = 0;

    try {
      if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
        const rootEl = renderer?.canvas || document.getElementById?.('app') || null;
        const rootRect = rootEl && typeof rootEl.getBoundingClientRect === 'function'
          ? rootEl.getBoundingClientRect()
          : { left: 0, top: 0, width: w, height: h };
        const scaleX = rootRect.width > 0 ? w / rootRect.width : 1;
        const scaleY = rootRect.height > 0 ? h / rootRect.height : 1;

        const topEl = document.querySelector('.endless-top-stack');
        if (topEl && !topEl.classList?.contains?.('hidden')) {
          const r = topEl.getBoundingClientRect();
          if (r.height > 0) {
            domTopBottom = Math.ceil((r.bottom - rootRect.top) * scaleY);
          }
        }

        const trialEl = document.querySelector('.endless-trial-hud');
        if (trialEl && !trialEl.classList?.contains?.('hidden')) {
          const r = trialEl.getBoundingClientRect();
          if (r.height > 0) {
            domTopBottom = Math.max(domTopBottom, Math.ceil((r.bottom - rootRect.top) * scaleY));
          }
        }

        const bossHudEl = document.getElementById?.('adv-boss-raid-hud');
        if (bossHudEl && !bossHudEl.classList?.contains?.('hidden')) {
          const r = bossHudEl.getBoundingClientRect();
          if (r.width > 4 && r.height > 4) {
            domTopBottom = Math.max(domTopBottom, Math.ceil((r.bottom - rootRect.top) * scaleY));
          }
        }

        const partyEl = document.querySelector('.endless-party-hud');
        if (partyEl && !partyEl.classList?.contains?.('hidden')) {
          const r = partyEl.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            domPartyRight = Math.ceil((r.right - rootRect.left) * scaleX);
            domPartyBottom = Math.ceil((r.bottom - rootRect.top) * scaleY);
          }
        }

        const shopBtn = document.getElementById?.('endless-shop-toggle');
        if (shopBtn && !shopBtn.classList?.contains?.('hidden')) {
          const r = shopBtn.getBoundingClientRect();
          if (r.height > 0) {
            domShopBottom = Math.ceil((r.bottom - rootRect.top) * scaleY);
          }
        }

        const eventsEl = document.querySelector('.endless-events-dock');
        if (eventsEl && !eventsEl.classList?.contains?.('hidden')) {
          const r = eventsEl.getBoundingClientRect();
          if (r.width > 4 && r.height > 4) {
            domEventsLeft = Math.floor((r.left - rootRect.left) * scaleX);
            domEventsBottom = Math.ceil((r.bottom - rootRect.top) * scaleY);
          }
        }

        const drawerEl = document.querySelector('.endless-shop-shell');
        if (drawerEl && !drawerEl.classList?.contains?.('hidden')) {
          const r = drawerEl.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            if (isCompactPortrait) {
              domDrawerTop = Math.floor((r.top - rootRect.top) * scaleY);
            } else {
              domDrawerLeft = Math.floor((r.left - rootRect.left) * scaleX);
            }
          }
        }
      }
    } catch {
      // Ignore DOM measurement errors in headless/Node contexts
    }

    let topClearY;
    let safeLeft;
    let safeRight;

    if (isNarrowLandscape) {
      const clampedHudBot = isShort ? Math.min(hudBot, 64) : Math.min(hudBot, 84);
      const fallbackTop = isShort
        ? Math.max(116, Math.round(clampedHudBot + 56))
        : Math.max(138, Math.round(clampedHudBot + 62));
      topClearY = domTopBottom > 24 ? Math.max(clampedHudBot + 6, domTopBottom + 6) : fallbackTop;
      safeRight = domDrawerLeft > 260 ? Math.min(w - 12, domDrawerLeft - 8) : Math.max(240, w - 12);
      const partyFloor = hasParty && w >= 560 ? 220 : 12;
      const measuredParty = domPartyRight > 0 ? domPartyRight + 8 : 0;
      safeLeft = Math.min(Math.max(12, safeRight - 160), Math.max(partyFloor, measuredParty));
      if (domEventsBottom > topClearY && domEventsLeft > 0) {
        if (domEventsLeft - safeLeft >= 180) {
          safeRight = Math.min(safeRight, domEventsLeft - 8);
        } else {
          topClearY = Math.max(topClearY, domEventsBottom + 6);
        }
      }
    } else if (isCompactPortrait) {
      const fallbackTop = hasParty
        ? Math.max(248, Math.round(hudBot + 108))
        : Math.max(194, Math.round(hudBot + 88));
      const measuredMax = Math.max(
        domTopBottom > 0 ? domTopBottom + 6 : 0,
        domShopBottom > 0 ? domShopBottom + 6 : 0,
        domPartyBottom > 0 ? domPartyBottom + 6 : 0,
        domEventsBottom > 0 ? domEventsBottom + 8 : 0
      );
      topClearY = measuredMax > 24 ? Math.max(hudBot + 6, measuredMax) : fallbackTop;
      safeLeft = 10;
      safeRight = Math.max(180, w - 10);
      if (domDrawerTop > 120 && topClearY + 34 > domDrawerTop - 4) {
        const altTop = Math.max(
          hudBot + 6,
          domTopBottom > 0 ? domTopBottom + 6 : 0,
          domPartyBottom > 0 ? domPartyBottom + 6 : 0
        );
        if (domEventsLeft - safeLeft >= 164 && altTop + 34 <= domDrawerTop - 4) {
          topClearY = altTop;
          safeRight = Math.min(safeRight, domEventsLeft - 6);
        } else {
          topClearY = Math.max(hudBot + 6, Math.min(topClearY, domDrawerTop - 38));
        }
      }
    } else {
      const fallbackTop = Math.max(146, Math.round(hudBot + 66));
      topClearY = domTopBottom > 24 ? Math.max(hudBot + 8, domTopBottom + 8) : fallbackTop;
      safeRight = domDrawerLeft > 360 ? Math.min(w - 20, domDrawerLeft - 12) : Math.max(360, w - 20);
      const measuredParty = domPartyRight > 0 ? domPartyRight + 10 : 0;
      safeLeft = Math.min(Math.max(20, safeRight - 260), Math.max(hasParty ? 208 : 20, measuredParty));
      if (domEventsBottom > topClearY && domEventsLeft > 0) {
        if (domEventsLeft - safeLeft >= 248) {
          safeRight = Math.min(safeRight, domEventsLeft - 12);
        } else {
          topClearY = Math.max(topClearY, domEventsBottom + 8);
        }
      }
    }

    const result = { key: cacheKey, topClearY, safeLeft, safeRight };
    this._hudClearanceCache = result;
    this._hudClearanceCachedAt = nowSec;
    return result;
  }

  renderScreenHUD(ctx, renderer) {
    if (!this.active || !ctx || this.game?.isLandingOpen) return;
    if (typeof ctx.fillRect !== 'function') return;
    const w = renderer?.width || 1280;
    const h = renderer?.height || 720;
    const t = renderer?.time || this._clock || 0;
    const isNarrowLandscape = Boolean(
      renderer?.isMobileLandscape || (w <= 920 && w >= h) || (h <= 500 && w > h)
    );
    const isCompactPortrait = Boolean(
      !isNarrowLandscape && (renderer?.isMobilePortrait || w < 640)
    );
    const isCompactUi = isNarrowLandscape || isCompactPortrait;
    const isShort = h < 460;
    const hudBot =
      typeof renderer?.getHudBottomY === 'function' ? renderer.getHudBottomY() : isShort ? 56 : 82;

    const feverTimer = this.economy?.tapFeverTimer || 0;
    const feverTier = feverTimer > 0 ? ((this.economy?.tapFeverLevel || 0) >= 2 ? 2 : 1) : 0;
    const hasBanner = Boolean(this.bannerTimer > 0 && this.bannerText);
    const clearance =
      hasBanner || feverTier >= 1
        ? this._getHudClearance(w, h, hudBot, isNarrowLandscape, isCompactPortrait, renderer)
        : null;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Animated Pixel-Framed FEVER OVERDRIVE Border Aura (100% fillRect, 0 rotate/ellipse/arc)
    if (feverTier >= 1) {
      const isOverdrive = feverTier >= 2;
      const pulse = isOverdrive
        ? 0.56 + 0.28 * Math.sin(t * 16)
        : 0.44 + 0.24 * Math.sin(t * 10.5);
      const outerThick = isCompactUi ? (isOverdrive ? 5 : 4) : isOverdrive ? 7 : 5;
      const midThick = isCompactUi ? 2 : 3;
      const innerOffset = isCompactUi ? 2 : 3;
      const innerThick = isCompactUi ? 1 : 2;
      const trimCol = isOverdrive ? '#f59e0b' : '#b45309';
      const goldRailCol = isOverdrive ? '#facc15' : '#d4af37';
      const innerRailCol = isOverdrive ? '#38bdf8' : '#fef08a';

      // Dark #050712 hairline inner framing border so the aura stays razor crisp
      ctx.globalAlpha = Math.min(0.85, pulse * 1.1);
      ctx.fillStyle = '#050712';
      ctx.fillRect(0, outerThick, w, 1);
      ctx.fillRect(0, h - outerThick - 1, w, 1);
      ctx.fillRect(outerThick, 0, 1, h);
      ctx.fillRect(w - outerThick - 1, 0, 1, h);

      // Outer burnished / molten gold frame
      ctx.globalAlpha = pulse * 0.82;
      ctx.fillStyle = trimCol;
      ctx.fillRect(0, 0, w, outerThick);
      ctx.fillRect(0, h - outerThick, w, outerThick);
      ctx.fillRect(0, 0, outerThick, h);
      ctx.fillRect(w - outerThick, 0, outerThick, h);

      // Bright burnished gold mid rail
      ctx.globalAlpha = Math.min(0.92, pulse * 1.15);
      ctx.fillStyle = goldRailCol;
      ctx.fillRect(0, 0, w, midThick);
      ctx.fillRect(0, h - midThick, w, midThick);
      ctx.fillRect(0, 0, midThick, h);
      ctx.fillRect(w - midThick, 0, midThick, h);

      // Inner gleam rail (bright gold at 2x, electric cyan at 3x)
      ctx.globalAlpha = Math.min(0.96, pulse * 1.25);
      ctx.fillStyle = innerRailCol;
      ctx.fillRect(innerOffset, innerOffset, Math.max(0, w - innerOffset * 2), innerThick);
      ctx.fillRect(innerOffset, h - innerOffset - innerThick, Math.max(0, w - innerOffset * 2), innerThick);
      ctx.fillRect(innerOffset, innerOffset, innerThick, Math.max(0, h - innerOffset * 2));
      ctx.fillRect(w - innerOffset - innerThick, innerOffset, innerThick, Math.max(0, h - innerOffset * 2));

      // Animated marching pixel glint dashes gliding along edges
      const stride = 68;
      const shift = Math.floor(t * (isOverdrive ? 120 : 84)) % stride;
      const dashLen = isCompactUi ? (isOverdrive ? 14 : 10) : isOverdrive ? 18 : 14;
      ctx.globalAlpha = Math.min(0.95, pulse * 1.3);
      for (let gx = shift; gx < w - 24; gx += stride) {
        ctx.fillStyle = isOverdrive && ((gx / stride) | 0) % 2 === 0 ? '#bae6fd' : '#fef9c3';
        ctx.fillRect(gx, 1, dashLen, 2);
        const bx = w - gx - dashLen;
        if (bx > 12) ctx.fillRect(bx, h - 3, dashLen, 2);
      }
      for (let gy = shift; gy < h - 24; gy += stride) {
        ctx.fillStyle = isOverdrive && ((gy / stride) | 0) % 2 === 0 ? '#bae6fd' : '#fef9c3';
        ctx.fillRect(w - 3, gy, 2, dashLen);
        const ly = h - gy - dashLen;
        if (ly > 12) ctx.fillRect(1, ly, 2, dashLen);
      }

      // Stepped gothic corner L-brackets (sleeker on mobile so corner HUDs stay crystal clear)
      const arm = isCompactUi ? (isOverdrive ? 18 : 14) : isOverdrive ? 32 : 24;
      const armThick = isCompactUi ? 3 : 4;
      const corners = [
        { x: 0, y: 0, dx: 1, dy: 1 },
        { x: w, y: 0, dx: -1, dy: 1 },
        { x: 0, y: h, dx: 1, dy: -1 },
        { x: w, y: h, dx: -1, dy: -1 }
      ];
      ctx.globalAlpha = Math.min(1, 0.72 + 0.28 * Math.sin(t * (isOverdrive ? 18 : 10)));
      for (let ci = 0; ci < corners.length; ci++) {
        const cn = corners[ci];
        const hx = cn.dx > 0 ? cn.x + 2 : cn.x - 2 - arm;
        const hy = cn.dy > 0 ? cn.y + 2 : cn.y - 2 - armThick;
        const vx = cn.dx > 0 ? cn.x + 2 : cn.x - 2 - armThick;
        const vy = cn.dy > 0 ? cn.y + 2 : cn.y - 2 - arm;

        ctx.fillStyle = '#050712';
        ctx.fillRect(hx - 1, hy - 1, arm + 2, armThick + 2);
        ctx.fillRect(vx - 1, vy - 1, armThick + 2, arm + 2);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(hx, hy, arm, armThick);
        ctx.fillRect(vx, vy, armThick, arm);

        const studSz = isCompactUi ? 4 : 6;
        const studX = cn.dx > 0 ? cn.x + 3 : cn.x - 3 - studSz;
        const studY = cn.dy > 0 ? cn.y + 3 : cn.y - 3 - studSz;
        ctx.fillStyle = isOverdrive ? '#38bdf8' : '#fef9c3';
        ctx.fillRect(studX, studY, studSz, studSz);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(studX + 1, studY + 1, 2, 2);

        if (isOverdrive) {
          // Animated blazing cyan-gold stepped electric corner crackles
          const sparkPhase = (Math.floor(t * 20) + ci * 3) % 4;
          const spScale = isCompactUi ? 0.65 : 1.0;
          const ix = cn.dx > 0 ? cn.x + 6 : cn.x - 8;
          const iy = cn.dy > 0 ? cn.y + 6 : cn.y - 8;
          const s1x = Math.round(ix + cn.dx * (6 + sparkPhase * 2) * spScale);
          const s1y = Math.round(iy + cn.dy * (4 + ((sparkPhase + 1) % 3) * 2) * spScale);
          const s2x = Math.round(s1x + cn.dx * 8 * spScale);
          const s2y = Math.round(s1y + cn.dy * (sparkPhase % 2 === 0 ? 6 : 2) * spScale);
          const s3x = Math.round(s2x + cn.dx * (sparkPhase % 2 === 0 ? 4 : 8) * spScale);
          const s3y = Math.round(s2y + cn.dy * 6 * spScale);
          this._drawPixelPolyline(
            ctx,
            [
              { x: ix, y: iy },
              { x: s1x, y: s1y },
              { x: s2x, y: s2y },
              { x: s3x, y: s3y }
            ],
            isCompactUi ? 3 : 4,
            '#38bdf8'
          );
          this._drawPixelPolyline(
            ctx,
            [
              { x: ix, y: iy },
              { x: s1x, y: s1y },
              { x: s2x, y: s2y }
            ],
            2,
            '#ffffff'
          );
        }
      }
      ctx.globalAlpha = 1;
    }

    // 2. Phoenix Surge Golden Flash Rail
    if (this._phoenixInvulnTimer > 1.3) {
      const pAlpha = Math.min(0.45, (this._phoenixInvulnTimer - 1.3) * 0.65);
      ctx.globalAlpha = pAlpha;
      ctx.fillStyle = '#fde047';
      ctx.fillRect(0, 0, w, 4);
      ctx.fillRect(0, h - 4, w, 4);
      ctx.globalAlpha = 1;
    }

    // 3. Stage Clear / Boss Retreat / Gold Fever PixelFont Banner Ribbon
    //    Compact & HUD-aware on mobile landscape (w <= 920 / isMobileLandscape) so it
    //    NEVER overlaps the top status bar or the left-side Active Companion Mini-HUD (x <= 325).
    let activeBannerBottomY = 0;
    if (hasBanner && clearance) {
      const fade = this.bannerTimer < 0.35 ? this.bannerTimer / 0.35 : 1;
      const availLaneW = Math.max(140, clearance.safeRight - clearance.safeLeft);
      const padX = isNarrowLandscape ? 22 : isCompactPortrait ? 20 : 40;
      const maxBanW = isNarrowLandscape
        ? Math.min(availLaneW, 336)
        : isCompactPortrait
          ? Math.min(availLaneW, w - 20)
          : Math.min(availLaneW, Math.min(w - 420, 760));
      const mainSz =
        !isCompactUi && PixelFont.measureWidth(this.bannerText, 2) + padX <= maxBanW ? 2 : 1;
      const maxTextPx = Math.max(96, maxBanW - padX + 4);
      const fittedMain = this._fitPixelText(this.bannerText, mainSz, maxTextPx);
      const fittedSub = this.bannerSubText
        ? this._fitPixelText(this.bannerSubText, 1, maxTextPx)
        : '';
      const mainW = PixelFont.measureWidth(fittedMain, mainSz);
      const subW = fittedSub ? PixelFont.measureWidth(fittedSub, 1) : 0;
      const minBanW = isNarrowLandscape ? 168 : isCompactPortrait ? 184 : 240;
      const banW = Math.min(maxBanW, Math.max(minBanW, Math.max(mainW, subW) + padX));
      const banH = fittedSub
        ? mainSz === 2
          ? 46
          : isNarrowLandscape
            ? 30
            : 34
        : mainSz === 2
          ? 32
          : isNarrowLandscape
            ? 20
            : 24;
      const idealBanX = Math.round((w - banW) * 0.5);
      const banX = Math.max(
        clearance.safeLeft,
        Math.min(clearance.safeRight - banW, idealBanX)
      );
      const banY = Math.min(
        Math.max(44, h - banH - (isNarrowLandscape ? 48 : 84)),
        Math.round(clearance.topClearY)
      );
      const banCx = Math.round(banX + banW * 0.5);
      activeBannerBottomY = banY + banH;

      ctx.globalAlpha = fade;
      ctx.fillStyle = '#05070e';
      ctx.fillRect(banX - 2, banY - 2, banW + 4, banH + 4);
      ctx.fillStyle = 'rgba(10, 13, 24, 0.92)';
      ctx.fillRect(banX, banY, banW, banH);
      ctx.fillStyle = this.bannerColor || '#facc15';
      ctx.fillRect(banX, banY, banW, 2);
      ctx.fillRect(banX, banY + banH - 2, banW, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(banX, banY, 3, 3);
      ctx.fillRect(banX + banW - 3, banY, 3, 3);
      ctx.fillRect(banX, banY + banH - 3, 3, 3);
      ctx.fillRect(banX + banW - 3, banY + banH - 3, 3, 3);

      if (fittedSub) {
        PixelFont.drawCentered(
          ctx,
          fittedMain,
          banCx,
          banY + (mainSz === 2 ? 15 : isNarrowLandscape ? 10 : 12),
          mainSz,
          this.bannerColor || '#facc15',
          '#ffffff',
          true
        );
        PixelFont.drawCentered(
          ctx,
          fittedSub,
          banCx,
          banY + banH - (isNarrowLandscape ? 8 : 10),
          1,
          '#e2e8f0',
          '#ffffff',
          true
        );
      } else {
        PixelFont.drawCentered(
          ctx,
          fittedMain,
          banCx,
          banY + Math.floor(banH * 0.5),
          mainSz,
          this.bannerColor || '#facc15',
          '#ffffff',
          true
        );
      }
      ctx.globalAlpha = 1;
    }

    // 4. Compact Upper-Mid FEVER 2X GOLD! / OVERDRIVE 3X GOLD! Stamp (never collides with Top Bar or Party HUD)
    if (feverTier >= 1 && clearance) {
      const isOverdrive = feverTier >= 2;
      const stampText = isOverdrive ? 'OVERDRIVE 3X GOLD!' : 'FEVER 2X GOLD!';
      const textW = PixelFont.measureWidth(stampText, 1);
      const availLaneW = Math.max(120, clearance.safeRight - clearance.safeLeft);
      const stampW = Math.min(
        availLaneW,
        Math.max(isNarrowLandscape ? 118 : 132, textW + (isNarrowLandscape ? 20 : 26))
      );
      const stampH = isNarrowLandscape ? 20 : 22;
      const idealStampX = Math.round((w - stampW) * 0.5);
      const stampX = Math.max(
        clearance.safeLeft,
        Math.min(clearance.safeRight - stampW, idealStampX)
      );
      const stampCx = Math.round(stampX + stampW * 0.5);
      const baseStampY = Math.round(clearance.topClearY);
      const stampY = Math.min(
        Math.max(44, h - stampH - (isNarrowLandscape ? 42 : 84)),
        activeBannerBottomY > 0 ? activeBannerBottomY + 5 : baseStampY
      );
      const feverBonusSec = Number(this.economy?._externalModifiers?.feverDurationBonusSec) || 0;
      const maxFeverDur =
        Number.isFinite(this.economy?.tapFeverMaxDuration) && this.economy.tapFeverMaxDuration > 0
          ? this.economy.tapFeverMaxDuration
          : (isOverdrive ? 9.5 : 7.5) + feverBonusSec;
      const timerRatio = Math.max(0, Math.min(1, feverTimer / Math.max(1, maxFeverDur)));
      const fadeOut = feverTimer < 0.4 ? Math.max(0.2, feverTimer / 0.4) : 1;
      const popFrac = this._feverStampPopTimer > 0 ? this._feverStampPopTimer / 0.28 : 0;
      const stampScale = popFrac > 0 ? 1 + 0.16 * Math.sin(popFrac * Math.PI) : 1;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = fadeOut;
      if (
        stampScale > 1.005 &&
        typeof ctx.translate === 'function' &&
        typeof ctx.scale === 'function'
      ) {
        ctx.translate(stampCx, stampY + Math.floor(stampH * 0.5));
        ctx.scale(stampScale, stampScale);
        ctx.translate(-stampCx, -(stampY + Math.floor(stampH * 0.5)));
      }

      // Crisp dark #050712 2px pixel outline frame
      ctx.fillStyle = '#050712';
      ctx.fillRect(stampX - 2, stampY - 2, stampW + 4, stampH + 4);
      ctx.fillStyle = isOverdrive ? 'rgba(9, 14, 28, 0.94)' : 'rgba(14, 12, 22, 0.92)';
      ctx.fillRect(stampX, stampY, stampW, stampH);

      // Burnished gold / blazing gold-cyan border trim & corner studs
      ctx.fillStyle = isOverdrive ? '#38bdf8' : '#facc15';
      ctx.fillRect(stampX, stampY, stampW, 2);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(stampX, stampY + stampH - 2, stampW, 2);
      ctx.fillRect(stampX, stampY, 2, stampH);
      ctx.fillRect(stampX + stampW - 2, stampY, 2, stampH);

      ctx.fillStyle = isOverdrive ? '#bae6fd' : '#fef9c3';
      ctx.fillRect(stampX, stampY, 3, 3);
      ctx.fillRect(stampX + stampW - 3, stampY, 3, 3);
      ctx.fillRect(stampX, stampY + stampH - 3, 3, 3);
      ctx.fillRect(stampX + stampW - 3, stampY + stampH - 3, 3, 3);

      // Animated fever remaining fuel bar tucked neatly along bottom edge
      const barW = Math.max(4, Math.round((stampW - 8) * timerRatio));
      ctx.fillStyle = '#050712';
      ctx.fillRect(stampX + 4, stampY + stampH - 5, stampW - 8, 3);
      ctx.fillStyle = isOverdrive ? '#38bdf8' : '#facc15';
      ctx.fillRect(stampX + 4, stampY + stampH - 5, barW, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(stampX + 4, stampY + stampH - 5, barW, 1);

      // Crisp outlined stamp label
      PixelFont.drawCentered(
        ctx,
        stampText,
        stampCx,
        stampY + (isNarrowLandscape ? 8 : 9),
        1,
        isOverdrive ? '#67e8f9' : '#fde047',
        '#ffffff',
        true
      );
      ctx.restore();
    }

    ctx.restore();
  }

  // =========================================================================
  // HUD, CONTROL DECK & SHOP SNAPSHOT SYNC
  // =========================================================================

  _getDeckDomRefs() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') {
      return null;
    }
    const cached = this._deckDomRefs;
    if (
      cached &&
      (!cached.appEl || cached.appEl.isConnected !== false) &&
      (!cached.deck || cached.deck.isConnected !== false)
    ) {
      return cached;
    }
    const slots = ['attack', 'dodge', 'skill', 'overdrive', 'ultimate'];
    const orbs = {};
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      orbs[slot] = {
        btn: document.getElementById(`adv-btn-${slot}`),
        sweep: document.getElementById(`adv-cd-sweep-${slot}`),
        txt: document.getElementById(`adv-cd-text-${slot}`)
      };
    }
    const refs = {
      appEl: document.getElementById('app'),
      deck: document.getElementById('adventure-controls'),
      pauseSpBadge: document.getElementById('pause-sp-badge'),
      autoBtn: document.getElementById('adv-btn-autoplay'),
      autoLbl: document.getElementById('adv-autoplay-label'),
      skillAutoBtn: document.getElementById('adv-btn-auto'),
      lockBtn: document.getElementById('adv-btn-lock'),
      joyBase: document.getElementById('adv-joystick-base'),
      joyKnob: document.getElementById('adv-joystick-knob'),
      orbs
    };
    this._deckDomRefs = refs;
    return refs;
  }

  syncJoystickKnobUI() {
    const refs = this._getDeckDomRefs();
    const base = refs?.joyBase;
    const knob = refs?.joyKnob;
    if (!base || !knob) return;

    let vx = 0;
    let vy = 0;
    let maxPx = 32;
    if (this.joyVec.active) {
      vx = this.joyVec.x;
      vy = this.joyVec.y;
      maxPx = 40;
    } else {
      const kbX = (this.keys.right || this.keys.uiRight ? 1 : 0) - (this.keys.left || this.keys.uiLeft ? 1 : 0);
      const kbY = (this.keys.down || this.keys.uiDown ? 1 : 0) - (this.keys.up || this.keys.uiUp ? 1 : 0);
      const mag = Math.hypot(kbX, kbY);
      vx = mag > 1 ? kbX / mag : kbX;
      vy = mag > 1 ? kbY / mag : kbY;
    }

    if (knob.style) {
      const nextTransform = `translate3d(${Math.round(vx * maxPx)}px, ${Math.round(vy * maxPx)}px, 0px)`;
      if (knob.style.transform !== nextTransform) {
        knob.style.transform = nextTransform;
      }
    }
    base.classList?.toggle('is-active', Math.hypot(vx, vy) > 0.08);
  }

  refreshActionIcons(heroKey = 'mage_ex') {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const slots = ['attack', 'dodge', 'skill', 'overdrive', 'ultimate'];
    const heroTags = ADVENTURE_HERO_KITS[heroKey]?.tags || {
      attack: 'ATK',
      dodge: 'DASH',
      skill: 'SKILL',
      overdrive: 'DRIVE',
      ultimate: 'ULT'
    };

    for (const slot of slots) {
      const canvas = document.getElementById(`adv-icon-${slot}`);
      if (canvas && typeof canvas.getContext === 'function') {
        const ictx = canvas.getContext('2d');
        if (ictx) {
          PixelForge.drawAdventureActionIcon?.(ictx, heroKey, slot, canvas.width || 64, canvas.height || 64, 0);
        }
      }
      const tagEl = document.getElementById(`adv-tag-${slot}`);
      if (tagEl && heroTags[slot]) {
        tagEl.textContent = heroTags[slot];
      }
    }
    this._renderedIconHero = heroKey;
    const mageImg = PixelForge.assets?.mage?.icons;
    const heroSheet = PixelForge.assets?.heroIconsSheet;
    this._renderedMageIconsReady = isImgReady(mageImg);
    this._renderedHeroIconsReady = isImgReady(heroSheet);
  }

  syncStageBadge() {
    const badge = this.game?.hudEls?.stageBadge;
    if (!badge) return;
    const activeTrial = this.trials?.activeTrial || null;
    const realm = this.getCurrentRealm();
    const nextText = activeTrial
      ? `TRIAL • ${activeTrial.def?.shortName || activeTrial.def?.name || 'PORTAL'}`
      : `STAGE ${this.stage} • ${realm.name}`;
    if (badge.textContent !== nextText) {
      badge.textContent = nextText;
    }
  }

  syncRightHUD() {
    const g = this.game;
    if (!g) return;
    const leftHeroId = g.leftFighter?.heroId || g.slot1Hero || 'mage_ex';
    const leftCol = g.leftFighter?.primaryColor || '#fb923c';
    if (this._lastPortraitKey !== leftHeroId || this._lastPortraitCol !== leftCol) {
      this._lastPortraitKey = leftHeroId;
      this._lastPortraitCol = leftCol;
      PixelForge.setHUDPortraits?.(leftHeroId, leftCol, 'archfiend', '#ef4444');
    }

    const activeTrial = this.trials?.activeTrial || null;
    if (g.hudEls?.crestVs) {
      const nextCrest = activeTrial ? 'TRIAL' : this.isBossEncounter ? 'BOSS' : `S${this.stage}`;
      if (g.hudEls.crestVs.textContent !== nextCrest) {
        g.hudEls.crestVs.textContent = nextCrest;
      }
    }
    if (g.hudEls?.modeBadge) {
      const nextBadge = activeTrial
        ? `TRIAL • ${activeTrial.def?.shortName || 'PORTAL'} • ${Math.max(0, activeTrial.remainingSec || 0).toFixed(1)}S`
        : this.isBossEncounter
          ? `STAGE ${this.stage} • BOSS ${Math.max(0, this.bossTimer).toFixed(1)}S`
          : this.bossFarmMode
            ? `STAGE ${this.stage} • FARMING • ${formatEndlessNumber(this.economy.gold)}G`
            : `STAGE ${this.stage} • WAVE ${this.waveInStage}/${this.wavesPerStage}`;
      if (g.hudEls.modeBadge.textContent !== nextBadge) {
        g.hudEls.modeBadge.textContent = nextBadge;
      }
    }
    g.updateAdventureBossHUD?.();
  }

  syncControlDeckUI() {
    const refs = this._getDeckDomRefs();
    if (!refs) return;
    const visible = Boolean(this.active && !this.game?.isLandingOpen && !this.game?.isMatchOver);
    const preserveAdvDeck = Boolean(!this.active && this.game?.isAdventureMode?.());
    if (refs.appEl) {
      refs.appEl.classList?.toggle('is-endless-active', visible);
      if (!preserveAdvDeck) {
        refs.appEl.classList?.toggle('is-adventure-active', visible);
      }
    }
    if (refs.deck && !preserveAdvDeck) {
      refs.deck.classList?.toggle('hidden', !visible);
    }
    if (!visible) return;

    if (refs.pauseSpBadge) {
      refs.pauseSpBadge.classList?.add('hidden');
    }

    if (refs.autoBtn) {
      refs.autoBtn.setAttribute?.('aria-pressed', String(this.autoPlay));
      refs.autoBtn.classList?.toggle('is-autoplay-on', this.autoPlay);
    }
    const nextAutoLbl = this.autoPlay ? 'AI: ON' : 'AI: OFF';
    if (refs.autoLbl && refs.autoLbl.textContent !== nextAutoLbl) {
      refs.autoLbl.textContent = nextAutoLbl;
    }

    if (refs.skillAutoBtn) {
      refs.skillAutoBtn.setAttribute?.('aria-pressed', String(this.autoPlay));
      refs.skillAutoBtn.classList?.toggle('is-autoplay-on', this.autoPlay);
    }

    if (refs.lockBtn) {
      refs.lockBtn.setAttribute?.('aria-pressed', String(Boolean(this.manualTargetLock)));
      refs.lockBtn.classList?.toggle('is-lock-on', Boolean(this.manualTargetLock));
    }

    this.syncJoystickKnobUI();

    const player = this.game?.leftFighter;
    if (!player) return;

    const heroKey = player.heroId || this.game?.slot1Hero || 'mage_ex';
    const isMageIcon = heroKey === 'mage' || heroKey === 'mage_ex';
    if (
      this._renderedIconHero !== heroKey ||
      (isMageIcon && isImgReady(PixelForge.assets?.mage?.icons) && !this._renderedMageIconsReady) ||
      (!isMageIcon && isImgReady(PixelForge.assets?.heroIconsSheet) && !this._renderedHeroIconsReady)
    ) {
      this.refreshActionIcons(heroKey);
    }

    const updateOrbSlot = (slot, mode, sweepRatio, labelText, hidden = false) => {
      const orb = refs.orbs?.[slot];
      if (!orb) return;
      const { btn, sweep, txt } = orb;
      if (btn) {
        btn.classList?.toggle('hidden', Boolean(hidden));
        btn.classList?.toggle('is-ready', mode === 'ready');
        btn.classList?.toggle('is-on-cd', mode === 'cd');
        btn.classList?.toggle('is-charging', mode === 'charge');
        btn.classList?.toggle('is-low-spirit', mode === 'low_spirit');
      }
      if (sweep?.style?.setProperty) {
        const deg = Math.max(0, Math.min(360, (sweepRatio || 0) * 360));
        const degStr = `${deg.toFixed(1)}deg`;
        if (this._deckOrbCdCache[slot] !== degStr) {
          this._deckOrbCdCache[slot] = degStr;
          sweep.style.setProperty('--cd-deg', degStr);
        }
      }
      if (txt && txt.textContent !== labelText) {
        txt.textContent = labelText;
      }
    };

    const stats = this.progression.getComputedStats();
    const autoCd = Math.max(0, player.autoCooldown || 0);
    updateOrbSlot('attack', 'ready', autoCd > 0.03 ? autoCd / Math.max(0.24, this.autoCdMax) : 0, '');

    const dodgeCd = Math.max(0, player.dodgeCooldown || 0);
    if (dodgeCd > 0.05) {
      updateOrbSlot('dodge', 'cd', dodgeCd / Math.max(0.45, this.dodgeCdMax), `${dodgeCd.toFixed(1)}s`);
    } else {
      updateOrbSlot('dodge', 'ready', 0, '');
    }

    const skillCd = Math.max(0, player.skillCooldown || 0);
    if (skillCd > 0.05) {
      updateOrbSlot('skill', 'cd', skillCd / Math.max(0.5, this.skillCdMax), `${skillCd.toFixed(1)}s`);
    } else if (this.progression.spirit + 0.01 < stats.skillSpiritCost) {
      const spRatio = Math.max(0, Math.min(1, this.progression.spirit / Math.max(1, stats.skillSpiritCost)));
      updateOrbSlot('skill', 'low_spirit', 1 - spRatio, `${stats.skillSpiritCost} SP`);
    } else {
      updateOrbSlot('skill', 'ready', 0, '');
    }

    const ultRatio = Math.max(0, Math.min(1, this.progression.ultCharge / 100));
    if (ultRatio < 0.999) {
      updateOrbSlot('overdrive', 'charge', 1 - ultRatio, `${Math.floor(ultRatio * 100)}%`);
    } else {
      updateOrbSlot('overdrive', 'ready', 0, 'MAX');
    }

    const hasUlt = Boolean(player.hasTrueUltimate);
    const sealRatio = Math.max(0, Math.min(1, this.progression.astralCharge / 100));
    if (!hasUlt) {
      updateOrbSlot('ultimate', 'charge', 1, '', true);
    } else if (sealRatio < 0.999) {
      updateOrbSlot('ultimate', 'charge', 1 - sealRatio, `${Math.floor(sealRatio * 100)}%`, false);
    } else {
      updateOrbSlot('ultimate', 'ready', 0, 'ULT', false);
    }
  }

  getUiSnapshot() {
    const realm = this.getCurrentRealm();
    const stats = this.economy.getComputedStats();
    const companionsView = this.companions?.getRosterView?.(this.economy) || [];
    const activeSlots = this.companions?.activeSlots || [];

    const hasAffordableCompanion = companionsView.some(
      (c) =>
        (!c.unlocked && c.canAffordRecruit) ||
        (c.unlocked && (c.canAffordUpgrade || Boolean(c.promoteQuote?.canPromote)))
    );
    let hasAffordableRelic = false;
    if (typeof this.economy.getRelicCost === 'function' && this.economy.relicLevels) {
      for (const rid of Object.keys(this.economy.relicLevels)) {
        const quote = this.economy.getRelicCost(rid);
        if (quote?.canAfford) {
          hasAffordableRelic = true;
          break;
        }
      }
    }

    const boss = this.isBossEncounter && this.bossEntity && !this.bossEntity.isDead ? this.bossEntity : null;
    const directorSnap =
      this.bossDirector && typeof this.bossDirector.getDirectorSnapshot === 'function'
        ? this.bossDirector.getDirectorSnapshot(this.stage, this.bestStage, realm)
        : null;
    const relicSets =
      typeof this.economy.getRelicSetSynergies === 'function'
        ? this.economy.getRelicSetSynergies()
        : [];
    const relicMilestones = {};
    if (typeof this.economy.getRelicMilestoneInfo === 'function' && this.economy.relicLevels) {
      for (const rid of Object.keys(this.economy.relicLevels)) {
        relicMilestones[rid] = this.economy.getRelicMilestoneInfo(rid);
      }
    }
    const gearSnap =
      this.gear && typeof this.gear.getGearSnapshot === 'function'
        ? this.gear.getGearSnapshot()
        : null;
    const forgeDust = Number.isFinite(this.gear?.forgeDust) ? this.gear.forgeDust : 0;
    const formattedForgeDust =
      gearSnap?.formattedForgeDust || formatEndlessNumber(forgeDust);
    const hasGearAction = Boolean(
      gearSnap && (gearSnap.hasUpgradeAvailable || gearSnap.canEnhanceEquipped)
    );
    return {
      active: this.active,
      stage: this.stage,
      bestStage: this.bestStage,
      waveInStage: this.waveInStage,
      wavesPerStage: this.wavesPerStage,
      waveProgress: this.isBossEncounter
        ? Math.max(0, Math.min(1, this.bossTimer / Math.max(1, this.bossTimerMax)))
        : Math.max(0, Math.min(1, this.waveInStage / Math.max(1, this.wavesPerStage))),
      realm,
      realmName: realm.name,
      ascendedLoop: realm.ascendedLoop,
      accentHex: realm.accentHex,
      isBossEncounter: this.isBossEncounter,
      bossFarmMode: this.bossFarmMode,
      canChallengeBoss: Boolean(this.bossFarmMode && !this.isBossEncounter && !this.trials?.isActive?.()),
      bossTimer: this.bossTimer,
      bossTimerMax: this.bossTimerMax,
      bossName: boss ? boss.name : '',
      bossHp: boss ? safeBoundedInt(boss.hp, 0, ENDLESS_MAX_STAT, 0) : 0,
      bossMaxHp: boss ? safeBoundedInt(boss.maxHp, 1, ENDLESS_MAX_STAT, 1) : 0,
      isColossalBoss: Boolean(boss?.isColossalBoss),
      gold: Number.isFinite(this.economy.gold) ? this.economy.gold : 0,
      formattedGold: formatEndlessNumber(Number.isFinite(this.economy.gold) ? this.economy.gold : 0),
      totalGoldEarned: Number.isFinite(this.economy.totalGoldEarned) ? this.economy.totalGoldEarned : 0,
      astralShards: Number.isFinite(this.economy.astralShards) ? this.economy.astralShards : 0,
      formattedAstralShards: formatEndlessNumber(
        Number.isFinite(this.economy.astralShards) ? this.economy.astralShards : 0
      ),
      autoBoss: Boolean(this.economy.autoBoss),
      autoPlay: Boolean(this.autoPlay),
      bulkMode: this.economy.bulkMode || 'x1',
      tapFever: this.economy.tapFever || 0,
      tapFeverTimer: this.economy.tapFeverTimer || 0,
      tapFeverLevel: this.economy.tapFeverLevel || 0,
      feverActive: (this.economy.tapFeverTimer || 0) > 0,
      feverTier:
        (this.economy.tapFeverTimer || 0) > 0
          ? (this.economy.tapFeverLevel || 0) >= 2
            ? 2
            : 1
          : 0,
      feverGoldMult: stats?.feverGoldMult || 1,
      dpsMetrics: this.economy.dpsMetrics || { heroDps: 0, tapDps: 0, companionDps: 0, goldPerSec: 0 },
      totalKills: this.economy.totalKills || this.monstersKilled || 0,
      bossesSlain: this.economy.bossesSlain || 0,
      totalTaps: this.economy.totalTaps || 0,
      activeHeroId: this.economy.activeHeroId || this.game?.leftFighter?.heroId || 'mage_ex',
      stats,
      economy: this.economy,
      companions: companionsView,
      companionEvo:
        this.companionEvo?.getEvoSnapshot?.(this.economy, this.gear, activeSlots.length) || null,
      activeCompanionUnits: this.companions?.getActiveHudUnits?.() || [],
      activeSynergies: this.companions?.getActiveSynergies?.() || [],
      activeCompanionCount: activeSlots.length,
      maxCompanionSlots: 3,
      hasAffordableRelic,
      hasAffordableCompanion,
      hasGearAction,
      hasAffordableUpgrade: hasAffordableRelic || hasAffordableCompanion || hasGearAction,
      gear: gearSnap,
      forgeDust,
      formattedForgeDust,
      activeLootBeamCount: this.lootBeams.length,
      ascension: this.ascension?.getAscensionView?.(this.stage, this.economy) || null,
      pendingOfflineLoot: this.pendingOfflineLoot || null,
      activeGoblinCount: this.treasureGoblins.length,
      activeChestCount: this.treasureChests.length,
      events: this.events?.getEventsSnapshot?.(this.economy) || null,
      activeShrineCount: this.worldShrines.length,
      activeMerchantCount: this.wanderingMerchants.length,
      bossDirector: directorSnap,
      realmModifier: directorSnap?.modifier || null,
      bestStageTrophies: directorSnap?.trophies || null,
      relicSets,
      relicMilestones,
      trials: this.trials?.getTrialsSnapshot?.(this.stage) || null
    };
  }
}
