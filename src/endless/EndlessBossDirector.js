// Endless Crusade Boss Director, Rotating Realm Modifiers, Ascended Boss Variants & Best-Stage Trophies
// Node-safe (zero browser globals required), zero external deps, pure ASCII (0 Unicode emojis).

export const TROPHY_STAGE_STEP = 5;
export const TROPHY_BONUS_PER_UNLOCK = 0.08;
export const TROPHY_SIGIL_COL = 7;
export const BOSS_SKULL_SIGIL_COL = 10;

const MAX_RENDERED_DYNAMIC_TROPHIES = 24;

export const ENDLESS_REALM_MODIFIERS = Object.freeze([
  Object.freeze({
    id: 'blood_moon',
    name: 'BLOOD MOON',
    sigilCol: 0,
    accentHex: '#f43f5e',
    shortDesc: '+60% GOLD & +8% CRIT',
    modifiers: Object.freeze({
      goldMult: 1.60,
      critBonus: 0.08,
      monsterHpMult: 1.08
    })
  }),
  Object.freeze({
    id: 'tempest_surge',
    name: 'TEMPEST SURGE',
    sigilCol: 1,
    accentHex: '#38bdf8',
    shortDesc: 'TAP CHAIN LIGHTNING & +40% TAP DMG',
    modifiers: Object.freeze({
      tapDmgMult: 1.40,
      alwaysTapChain: true,
      extraChainTargets: 1
    })
  }),
  Object.freeze({
    id: 'titan_horde',
    name: 'TITAN HORDE',
    sigilCol: 2,
    accentHex: '#f59e0b',
    shortDesc: '+ELITE SPAWNS & 2X ELITE GOLD',
    modifiers: Object.freeze({
      eliteChanceBonus: 0.35,
      eliteGoldMult: 2.0,
      bossDmgMult: 1.15
    })
  }),
  Object.freeze({
    id: 'eclipse_frenzy',
    name: 'ECLIPSE FRENZY',
    sigilCol: 3,
    accentHex: '#a855f7',
    shortDesc: '+35% HASTE & +50% HERO/PARTY DMG',
    modifiers: Object.freeze({
      hasteMult: 1.35,
      heroDmgMult: 1.50,
      companionDmgMult: 1.50
    })
  })
]);

const FALLBACK_REALM_WARDENS = Object.freeze([
  Object.freeze({
    name: 'ECLIPSE SANCTUM',
    wardenName: 'ECLIPSE GRAND WARDEN',
    accentHex: '#38bdf8'
  }),
  Object.freeze({
    name: 'CURSED STARWOOD',
    wardenName: 'ELDER STARWOOD TITAN',
    accentHex: '#34d399'
  }),
  Object.freeze({
    name: 'OSSUARY NECROPOLIS',
    wardenName: 'DREAD OSSUARY REAPER',
    accentHex: '#c084fc'
  }),
  Object.freeze({
    name: 'THE BLACK PIT',
    wardenName: 'INFERNAL PIT OVERLORD',
    accentHex: '#fb923c'
  })
]);

export const ASCENDED_BOSS_ARCHETYPES = Object.freeze({
  wardens: Object.freeze([
    Object.freeze({
      id: 'bloodforged_warden',
      prefix: 'BLOODFORGED',
      title: 'CRIMSON SENTINEL',
      accentHex: '#f43f5e',
      hpMult: 1.04,
      goldMult: 1.25,
      baseBonusShards: 1,
      heraldSubText: 'A BLOODFORGED WARDEN BARS THE ROAD'
    }),
    Object.freeze({
      id: 'stormcaller_warden',
      prefix: 'STORMCALLER',
      title: 'TEMPEST HERALD',
      accentHex: '#38bdf8',
      hpMult: 1.00,
      goldMult: 1.20,
      baseBonusShards: 1,
      heraldSubText: 'LIGHTNING CRACKLES AROUND THE WARDEN'
    }),
    Object.freeze({
      id: 'dreadbound_warden',
      prefix: 'DREADBOUND',
      title: 'ABYSSAL EXECUTIONER',
      accentHex: '#a855f7',
      hpMult: 1.08,
      goldMult: 1.30,
      baseBonusShards: 1,
      heraldSubText: 'SHADOW CHAINS SURGE FROM THE CRYPT'
    }),
    Object.freeze({
      id: 'gilded_warden',
      prefix: 'GILDED',
      title: 'SOVEREIGN VAULTKEEPER',
      accentHex: '#facc15',
      hpMult: 1.06,
      goldMult: 1.45,
      baseBonusShards: 2,
      heraldSubText: 'A TREASURE-LADEN WARDEN EMERGES'
    }),
    Object.freeze({
      id: 'ashen_warden',
      prefix: 'ASHEN',
      title: 'CATACLYSM JUGGERNAUT',
      accentHex: '#f59e0b',
      hpMult: 1.12,
      goldMult: 1.35,
      baseBonusShards: 2,
      heraldSubText: 'MOLTEN ARMOR BLAZES AT THE GATE'
    }),
    Object.freeze({
      id: 'astral_warden',
      prefix: 'ASTRAL-CROWNED',
      title: 'ECLIPSE ARBITER',
      accentHex: '#c084fc',
      hpMult: 1.10,
      goldMult: 1.40,
      baseBonusShards: 2,
      heraldSubText: 'STARLIGHT WARPS AROUND THE ARBITER'
    })
  ]),
  colossal: Object.freeze([
    Object.freeze({
      id: 'malphas_infernal_sovereign',
      name: 'BEHEMOTH MALPHAS',
      title: 'INFERNAL SOVEREIGN',
      accentHex: '#ef4444',
      hpMult: 1.00,
      goldMult: 1.50,
      baseBonusShards: 2,
      heraldSubText: 'COLOSSAL ARCHFIEND AWAKENS'
    }),
    Object.freeze({
      id: 'malphas_blood_eclipse',
      name: 'BLOOD-ECLIPSE MALPHAS',
      title: 'CRIMSON ARCHFIEND',
      accentHex: '#f43f5e',
      hpMult: 1.08,
      goldMult: 1.75,
      baseBonusShards: 4,
      heraldSubText: 'CRIMSON CORONA IGNITES THE SKY'
    }),
    Object.freeze({
      id: 'malphas_storm_cataclysm',
      name: 'STORM-CATACLYSM MALPHAS',
      title: 'TEMPEST TYRANT',
      accentHex: '#38bdf8',
      hpMult: 1.12,
      goldMult: 2.00,
      baseBonusShards: 6,
      heraldSubText: 'ABYSSAL THUNDER SHATTERS THE GATE'
    }),
    Object.freeze({
      id: 'malphas_gilded_behemoth',
      name: 'GILDED BEHEMOTH MALPHAS',
      title: 'SOVEREIGN DEVOURER',
      accentHex: '#f59e0b',
      hpMult: 1.16,
      goldMult: 2.35,
      baseBonusShards: 8,
      heraldSubText: 'MOLTEN GOLD POURS FROM THE ABYSS'
    }),
    Object.freeze({
      id: 'malphas_void_ascendant',
      name: 'VOID-ASCENDANT MALPHAS',
      title: 'ECLIPSE EMPEROR',
      accentHex: '#a855f7',
      hpMult: 1.22,
      goldMult: 2.65,
      baseBonusShards: 11,
      heraldSubText: 'ASTRAL RIFT TEARS OPEN THE REALM'
    }),
    Object.freeze({
      id: 'malphas_celestial_ruin',
      name: 'CELESTIAL RUIN MALPHAS',
      title: 'ETERNAL CALAMITY',
      accentHex: '#facc15',
      hpMult: 1.28,
      goldMult: 3.00,
      baseBonusShards: 14,
      heraldSubText: 'THE ETERNAL CALAMITY DESCENDS'
    })
  ])
});

export const BEST_STAGE_TROPHIES = Object.freeze([
  Object.freeze({
    id: 'bronze_vanguard',
    stage: 5,
    tier: 1,
    name: 'BRONZE VANGUARD',
    accentHex: '#cd7f32',
    sigilCol: TROPHY_SIGIL_COL,
    bonusDesc: '+8% HERO/TAP DMG & +8% GOLD'
  }),
  Object.freeze({
    id: 'silver_crusader',
    stage: 10,
    tier: 2,
    name: 'SILVER CRUSADER',
    accentHex: '#cbd5e1',
    sigilCol: TROPHY_SIGIL_COL,
    bonusDesc: '+8% HERO/TAP DMG & +8% GOLD'
  }),
  Object.freeze({
    id: 'gold_sovereign',
    stage: 15,
    tier: 3,
    name: 'GOLD SOVEREIGN',
    accentHex: '#facc15',
    sigilCol: TROPHY_SIGIL_COL,
    bonusDesc: '+8% HERO/TAP DMG & +8% GOLD'
  }),
  Object.freeze({
    id: 'astral_conqueror',
    stage: 20,
    tier: 4,
    name: 'ASTRAL CONQUEROR',
    accentHex: '#38bdf8',
    sigilCol: TROPHY_SIGIL_COL,
    bonusDesc: '+8% HERO/TAP DMG & +8% GOLD'
  }),
  Object.freeze({
    id: 'eclipse_immortal',
    stage: 25,
    tier: 5,
    name: 'ECLIPSE IMMORTAL',
    accentHex: '#a855f7',
    sigilCol: TROPHY_SIGIL_COL,
    bonusDesc: '+8% HERO/TAP DMG & +8% GOLD'
  }),
  Object.freeze({
    id: 'celestial_warlord',
    stage: 30,
    tier: 6,
    name: 'CELESTIAL WARLORD',
    accentHex: '#fb923c',
    sigilCol: TROPHY_SIGIL_COL,
    bonusDesc: '+8% HERO/TAP DMG & +8% GOLD'
  })
]);

const DYNAMIC_TROPHY_COLORS = Object.freeze([
  '#f43f5e',
  '#38bdf8',
  '#facc15',
  '#a855f7'
]);

function normalizeStage(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(1, Math.floor(num));
}

function roundTo(value, decimals = 4) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function toRoman(num) {
  const n = Math.floor(Number(num) || 0);
  if (n <= 0) return 'I';
  if (n > 3999) return `#${n}`;
  const numerals = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ];
  let rem = n;
  let out = '';
  for (let i = 0; i < numerals.length; i++) {
    const [val, sym] = numerals[i];
    while (rem >= val) {
      out += sym;
      rem -= val;
    }
  }
  return out;
}

function buildTrophyDefForTier(tier) {
  const t = Math.max(1, Math.floor(Number(tier) || 1));
  if (t <= BEST_STAGE_TROPHIES.length) {
    return BEST_STAGE_TROPHIES[t - 1];
  }
  const stage = t * TROPHY_STAGE_STEP;
  const infRank = t - BEST_STAGE_TROPHIES.length;
  return {
    id: `eternal_paragon_${stage}`,
    stage,
    tier: t,
    name: `ETERNAL PARAGON ${toRoman(infRank)}`,
    accentHex: DYNAMIC_TROPHY_COLORS[(infRank - 1) % DYNAMIC_TROPHY_COLORS.length],
    sigilCol: TROPHY_SIGIL_COL,
    bonusDesc: '+8% HERO/TAP DMG & +8% GOLD',
    isDynamic: true
  };
}

function resolveRealmWardenName(stage, realm) {
  if (realm && typeof realm === 'object') {
    if (typeof realm.wardenName === 'string' && realm.wardenName.trim()) {
      return realm.wardenName.trim().toUpperCase();
    }
    if (typeof realm.name === 'string' && realm.name.trim()) {
      return `${realm.name.trim().toUpperCase()} WARDEN`;
    }
  } else if (typeof realm === 'string' && realm.trim()) {
    return realm.trim().toUpperCase();
  }
  const fallback = FALLBACK_REALM_WARDENS[(stage - 1) % FALLBACK_REALM_WARDENS.length];
  return fallback.wardenName;
}

export class EndlessBossDirector {
  constructor() {
    this.modifierCount = ENDLESS_REALM_MODIFIERS.length;
    this.trophyStep = TROPHY_STAGE_STEP;
    this.trophyBonusPerUnlock = TROPHY_BONUS_PER_UNLOCK;
  }

  getModifierForStage(stage) {
    const s = normalizeStage(stage);
    return ENDLESS_REALM_MODIFIERS[(s - 1) % ENDLESS_REALM_MODIFIERS.length];
  }

  getBossProfileForStage(stage, realm = null) {
    const s = normalizeStage(stage);
    const modifier = this.getModifierForStage(s);
    const isColossal = s % 5 === 0;

    if (isColossal) {
      const colossalPool = ASCENDED_BOSS_ARCHETYPES.colossal;
      const colossalTier = Math.floor(s / 5);
      const loop = Math.floor((colossalTier - 1) / colossalPool.length);
      const arch = colossalPool[(colossalTier - 1) % colossalPool.length];
      const name = loop > 0 ? `${arch.name} ${toRoman(loop + 1)}` : arch.name;
      const title =
        loop > 0
          ? `ASCENDED ${toRoman(loop + 1)} ${arch.title}`
          : `TIER ${colossalTier} ${arch.title}`;
      const hpMult = roundTo(Math.min(2.5, arch.hpMult + loop * 0.30), 3);
      const goldMult = roundTo(arch.goldMult + loop * 1.75, 3);
      const bonusShards = arch.baseBonusShards + loop * 15;
      const accentHex = arch.accentHex || '#ef4444';

      return {
        stage: s,
        archetypeId: arch.id,
        name,
        title,
        isColossal: true,
        tier: colossalTier,
        loop,
        hpMult,
        goldMult,
        bonusShards,
        accentHex,
        heraldText: `STAGE ${s} COLOSSAL BOSS: ${name}`,
        heraldSubText: `${arch.heraldSubText} • ${modifier.name}`,
        sigilCol: BOSS_SKULL_SIGIL_COL,
        modifier
      };
    }

    const wardenPool = ASCENDED_BOSS_ARCHETYPES.wardens;
    const wardenOrdinal = s - Math.floor(s / 5) - 1;
    const tier = Math.floor((s - 1) / 5);
    const loop = Math.floor(wardenOrdinal / wardenPool.length);
    const arch = wardenPool[wardenOrdinal % wardenPool.length];
    const baseWardenName = resolveRealmWardenName(s, realm);
    const name =
      loop > 0
        ? `${arch.prefix} ${baseWardenName} ${toRoman(loop + 1)}`
        : `${arch.prefix} ${baseWardenName}`;
    const title =
      loop > 0
        ? `ASCENDED ${toRoman(loop + 1)} ${arch.title}`
        : `STAGE ${s} ${arch.title}`;
    const hpMult = roundTo(Math.min(1.65, arch.hpMult + tier * 0.04), 3);
    const goldMult = roundTo(arch.goldMult + tier * 0.15 + loop * 0.25, 3);
    const bonusShards = arch.baseBonusShards + tier + loop;
    const accentHex = arch.accentHex || (realm && realm.accentHex) || modifier.accentHex;

    return {
      stage: s,
      archetypeId: arch.id,
      name,
      title,
      isColossal: false,
      tier: tier + 1,
      loop,
      hpMult,
      goldMult,
      bonusShards,
      accentHex,
      heraldText: `STAGE ${s} WARDEN: ${name}`,
      heraldSubText: `${arch.heraldSubText} • ${modifier.name}`,
      sigilCol: modifier.sigilCol,
      modifier
    };
  }

  getBestStageTrophies(bestStage) {
    const best = normalizeStage(bestStage);
    const unlockedCount = Math.floor(best / TROPHY_STAGE_STEP);
    const nextTier = unlockedCount + 1;
    const nextMilestoneStage = nextTier * TROPHY_STAGE_STEP;

    const highestDef = unlockedCount > 0 ? buildTrophyDefForTier(unlockedCount) : null;
    const highestTrophy = highestDef
      ? { ...highestDef, unlocked: true }
      : null;

    const nextDef = buildTrophyDefForTier(nextTier);
    const nextTrophy = { ...nextDef, unlocked: false };

    const trophies = [];
    const baseCount = BEST_STAGE_TROPHIES.length;
    for (let i = 0; i < baseCount; i++) {
      const def = BEST_STAGE_TROPHIES[i];
      trophies.push({
        ...def,
        unlocked: best >= def.stage
      });
    }

    if (nextTier > baseCount) {
      const totalDynamicNeeded = nextTier - baseCount;
      const startTier =
        totalDynamicNeeded > MAX_RENDERED_DYNAMIC_TROPHIES
          ? nextTier - MAX_RENDERED_DYNAMIC_TROPHIES + 1
          : baseCount + 1;
      for (let t = startTier; t <= nextTier; t++) {
        const def = buildTrophyDefForTier(t);
        trophies.push({
          ...def,
          unlocked: best >= def.stage
        });
      }
    }

    const passiveMult = roundTo(1 + unlockedCount * TROPHY_BONUS_PER_UNLOCK, 4);
    const trophyModifiers = {
      heroDmgMult: passiveMult,
      tapDmgMult: passiveMult,
      goldMult: passiveMult
    };

    return {
      bestStage: best,
      unlockedCount,
      highestTrophy,
      nextMilestoneStage,
      nextTrophy,
      totalBonusPct: unlockedCount * Math.round(TROPHY_BONUS_PER_UNLOCK * 100),
      trophies,
      trophyModifiers
    };
  }

  getDirectorSnapshot(stage, bestStage = undefined, realm = null) {
    const s = normalizeStage(stage);
    const resolvedBest =
      bestStage === undefined || bestStage === null ? s : normalizeStage(bestStage);
    const modifier = this.getModifierForStage(s);
    const bossProfile = this.getBossProfileForStage(s, realm);
    const trophies = this.getBestStageTrophies(resolvedBest);

    const mod = modifier.modifiers || {};
    const tMod = trophies.trophyModifiers;

    const combinedModifiers = {
      heroDmgMult: roundTo((mod.heroDmgMult || 1.0) * tMod.heroDmgMult, 4),
      tapDmgMult: roundTo((mod.tapDmgMult || 1.0) * tMod.tapDmgMult, 4),
      companionDmgMult: roundTo(mod.companionDmgMult || 1.0, 4),
      goldMult: roundTo((mod.goldMult || 1.0) * tMod.goldMult, 4),
      critBonus: roundTo(mod.critBonus || 0, 4),
      hasteMult: roundTo(mod.hasteMult || 1.0, 4),
      monsterHpMult: roundTo(mod.monsterHpMult || 1.0, 4),
      bossDmgMult: roundTo(mod.bossDmgMult || 1.0, 4),
      eliteChanceBonus: roundTo(mod.eliteChanceBonus || 0, 4),
      eliteGoldMult: roundTo(mod.eliteGoldMult || 1.0, 4),
      alwaysTapChain: Boolean(mod.alwaysTapChain),
      extraChainTargets: Math.max(0, Math.floor(Number(mod.extraChainTargets) || 0))
    };

    return {
      stage: s,
      modifier,
      bossProfile,
      trophies,
      combinedModifiers
    };
  }
}
