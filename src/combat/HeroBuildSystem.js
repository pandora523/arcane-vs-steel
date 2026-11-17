/**
 * Sovereign Loadouts — Per-Hero Custom Skill/Loadout Build System (Batch 1)
 *
 * Supports 3 independent customizable slots per EX hero in Versus Mode (`1v1`, `2v2_tag`, `2v2_brawl`):
 *   - `aspect`: `0 | 1 | 2` (Slot 0: Auto + Passive Aspect)
 *   - `skill`:  `0 | 1 | 2` (Slot 1: Signature Skill)
 *   - `ult`:    `0 | 1 | 2` (Slot 2: Overdrive Art)
 * Plus 3 named Preset Archetypes (`[I]`, `[II]`, `[III]`) and an `RNG` option, stored
 * independently for `p1` (P1 Lead), `p1b` (P1B Partner), `p2` (P2 Lead), and `p2b` (P2B Partner)
 * in `localStorage` (`avs_sovereign_loadouts_v1`), with optional random challenger builds in Auto-Tourney.
 *
 * Invariants:
 *   - `0/0/0` (`[I] Sovereign Standard`) is 100% identical to baseline.
 *   - Legacy champions (`!heroId.endsWith('_ex')`) and Adventure Mode are strictly isolated (`0/0/0`).
 */

export const SOVEREIGN_STORAGE_KEY = 'avs_sovereign_loadouts_v1';

export const SOVEREIGN_SLOT_KEYS = ['p1', 'p1b', 'p2', 'p2b'];

export const SOVEREIGN_BUILD_HERO_IDS = [
  'priestess_ex',
  'warrior_ex',
  'mage_ex',
  'nyx_ex',
  'ronin_ex',
  'reaper_ex'
];

const SOVEREIGN_BUILD_HERO_SET = new Set(SOVEREIGN_BUILD_HERO_IDS);

const ROMAN_TIERS = ['I', 'II', 'III'];

export const HERO_BUILD_CATALOG = {
  priestess_ex: {
    heroId: 'priestess_ex',
    presets: [
      { index: 0, roman: 'I', shortName: 'SOVEREIGN', name: 'SOVEREIGN STANDARD', aspect: 0, skill: 0, ult: 0 },
      { index: 1, roman: 'II', shortName: 'INQUISITOR', name: 'CRIMSON INQUISITOR', aspect: 1, skill: 1, ult: 1 },
      { index: 2, roman: 'III', shortName: 'SANCTUARY', name: 'ETERNAL SANCTUARY', aspect: 2, skill: 2, ult: 2 }
    ],
    aspect: [
      null,
      {
        trait: 'ASPECT II: CRIMSON INQUISITOR (ZERO-HEAL BURST & SPEAR-ROOT)',
        name: 'INQUISITOR SPEAR-VERDICT',
        type: 'ZERO-HEAL SPEAR BURST',
        desc: 'Forfeits self-heals for +14% crimson spear velocity, judgment burst & 0.36s Spear-Pin root on Pillar casts.'
      },
      {
        trait: 'ASPECT III: ASTRAL SERAPH (WINGED AERIAL KITE & TWIN BOLTS)',
        name: 'ASTRAL SERAPH PINIONS',
        type: 'AERIAL GLIDE KITE',
        desc: 'Enhanced -54px Astral Seraph glide retreat & faster 3.0s Winged Vault loosing twin starlight bolts (-10% bolt dmg).'
      }
    ],
    skill: [
      null,
      {
        name: 'CRIMSON SPEAR-TRIBUNAL',
        type: 'SKILL • 4.7S CD',
        cooldown: 4.7,
        desc: 'Zero self-heal; rains 5 Crimson Inquisitor Sky-Spears onto the foe, inflicting a 0.46s Spear-Root & high burst.'
      },
      {
        name: 'ETERNAL SANCTUARY AEGIS',
        type: 'SKILL • 5.5S CD',
        cooldown: 5.5,
        desc: 'Grants Radiant Sanctuary Barrier + enhanced Sanctuary & Tag-Partner heal (+34 ally HP), firing 1 purifying ray.'
      }
    ],
    ult: [
      null,
      {
        name: 'CRIMSON INQUISITOR CRUCIBLE',
        type: 'OVERDRIVE ULT',
        desc: 'Zero Miracle heal; rains 7 rapid Crimson Valkyrie Sky-Lances into a high-crit Inquisitor Supernova (+20% burst).'
      },
      {
        name: 'CHOIR OF ETERNAL SANCTUARY',
        type: 'OVERDRIVE ULT',
        desc: 'Consecrates an Eternal Choir Dome restoring +60 HP (+46 Tag-Partner HP) & 110 HP Barrier (-20% pillar burst).'
      }
    ]
  },

  warrior_ex: {
    heroId: 'warrior_ex',
    presets: [
      { index: 0, roman: 'I', shortName: 'SOVEREIGN', name: 'SOVEREIGN STANDARD', aspect: 0, skill: 0, ult: 0 },
      { index: 1, roman: 'II', shortName: 'DRAGOON', name: 'TEMPEST DRAGOON', aspect: 1, skill: 1, ult: 1 },
      { index: 2, roman: 'III', shortName: 'BULWARK', name: 'SANCTUARY BULWARK', aspect: 2, skill: 2, ult: 2 }
    ],
    aspect: [
      null,
      {
        trait: 'ASPECT II: TEMPEST DRAGOON (HIGH-SPEED GALE WAVES)',
        name: 'TEMPEST GALE-BREAKER',
        type: 'HIGH-TEMPO GALE BLADE',
        desc: '+9% stride speed & piercing Golden Blade-Waves on Beat 1 + Beat 4; forfeits Parry heal (-5% max HP).'
      },
      {
        trait: 'ASPECT III: SANCTUARY BULWARK (AEGIS BARRIER & POISE)',
        name: 'SANCTUARY AEGIS VANGUARD',
        type: 'POISE + AEGIS BARRIER',
        desc: 'Unstoppable poise on heavy cuts & 75 HP Runic Barrier on Aegis Parry; -8% stride speed & -8% slash dmg.'
      }
    ],
    skill: [
      null,
      {
        name: 'HEAVENSFALL DRAGOON DIVE',
        type: 'SKILL • 4.4S CD',
        cooldown: 4.4,
        desc: 'Zero seal heal; high-arcing aerial Runeblade dive onto the foe unleashing twin outward Dawn Blade-Waves.'
      },
      {
        name: 'AEGIS CATHEDRAL BASTION',
        type: 'SKILL • 5.5S CD',
        cooldown: 5.5,
        desc: 'Fortifies a Runic Bastion granting Aegis Barrier + Vow Heal, Tag-Ally Grace & guardian crystal spires (-26% rush).'
      }
    ],
    ult: [
      null,
      {
        name: 'ASTRAEA SEVEN-STAR BLITZ',
        type: 'OVERDRIVE ULT',
        desc: 'Zero plunge heal; executes a blistering cross-arena golden star-blitz with +16% crit burst & +12 Ult gauge.'
      },
      {
        name: 'JUDGMENT OF THE BASTION',
        type: 'OVERDRIVE ULT',
        desc: 'Erupts a 5-spire Runic Monolith Sanctuary granting 110 HP Aegis Barrier & +44 HP Grace (-18% slash dmg).'
      }
    ]
  },

  mage_ex: {
    heroId: 'mage_ex',
    presets: [
      { index: 0, roman: 'I', shortName: 'SOVEREIGN', name: 'SOVEREIGN STANDARD', aspect: 0, skill: 0, ult: 0 },
      { index: 1, roman: 'II', shortName: 'SUPERNOVA', name: 'SUPERNOVA BOMBARDIER', aspect: 1, skill: 1, ult: 1 },
      { index: 2, roman: 'III', shortName: 'CORONA', name: 'CORONA CHRONO-WEAVER', aspect: 2, skill: 2, ult: 2 }
    ],
    aspect: [
      null,
      {
        trait: 'ASPECT II: SUPERNOVA BOMBARDIER (HEAVY CALDERA SIEGE)',
        name: 'CALDERA MORTAR SORCERY',
        type: 'HEAVY SOLAR SIEGE',
        desc: 'Heavy-caliber Solar Mortar Comets & wider Prominence Pillars (+14% hit dmg, slower 1.08s cast cadence, 0 ward heal).'
      },
      {
        trait: 'ASPECT III: CORONA CHRONO-WEAVER (RAPID KITE & SOLAR WARD)',
        name: 'CORONA RAPID-RAY KITE',
        type: 'RAPID BLINK ARTILLERY',
        desc: 'Faster 0.88s high-velocity Corona Rays, 2.45s Arcane Blink & 60 HP Solar Barrier on Parry (-13% bolt dmg).'
      }
    ],
    skill: [
      null,
      {
        name: 'DREADNOUGHT METEOR TRIAD',
        type: 'SKILL • 4.5S CD',
        cooldown: 4.5,
        desc: 'Zero Helios heal; calls down 3 diagonal Solar Lances & crashing caldera shockwaves onto enemy position.'
      },
      {
        name: 'CORONA AEGIS CONVERGENCE',
        type: 'SKILL • 4.8S CD',
        cooldown: 4.8,
        desc: 'Grants Solar Barrier + Helios heal & Tag-Ally Grace while back-stepping melee pressure & firing a 3-bolt Corona fan.'
      }
    ],
    ult: [
      null,
      {
        name: 'HELIOS EXTINCTION CALDERA',
        type: 'OVERDRIVE ULT',
        desc: 'Zero Eclipse heal; rains high-caliber Solar Lances & meteoric impacts into an Extinction Caldera (+18% burst).'
      },
      {
        name: 'ASTRAL CORONA SINGULARITY',
        type: 'OVERDRIVE ULT',
        desc: 'Intensified gravity vortex pull + 95 HP Corona Barrier, +42 HP heal & +12 Ult gauge (-18% explosion dmg).'
      }
    ]
  },

  nyx_ex: {
    heroId: 'nyx_ex',
    presets: [
      { index: 0, roman: 'I', shortName: 'SOVEREIGN', name: 'SOVEREIGN STANDARD', aspect: 0, skill: 0, ult: 0 },
      { index: 1, roman: 'II', shortName: 'OVERCLOCK', name: 'KERNEL OVERCLOCK', aspect: 1, skill: 1, ult: 1 },
      { index: 2, roman: 'III', shortName: 'FIREWALL', name: 'FIREWALL SANDBOX', aspect: 2, skill: 2, ult: 2 }
    ],
    aspect: [
      null,
      {
        trait: 'ASPECT II: KERNEL OVERCLOCK (DDOS PACKETS & HYPER-LASER)',
        name: 'OVERCLOCKED DDOS QUARTET',
        type: 'HIGH-TOKEN LASER BURST',
        desc: '3-packet DDoS Beat 1 & +35% Context-Token Beat 4 Neko-Laser burst; reduces passive Holo-Patch shields by 50%.'
      },
      {
        trait: 'ASPECT III: FIREWALL SANDBOX (HOLO-SHIELD & CTRL+Z MATRIX)',
        name: 'SANDBOX FIREWALL QUARTET',
        type: 'BARRIER + DECOY KITE',
        desc: 'Faster 3.6s Ctrl+Z Blink & +34 HP micro Holo-Shield on Beat 2 cast (-12% packet & laser dmg).'
      }
    ],
    skill: [
      null,
      {
        name: 'BSOD FATAL EXCEPTION',
        type: 'SKILL • 4.3S CD',
        cooldown: 4.3,
        desc: 'Zero heal & zero Holo-Shield; slams rapid 404 Glitch Pop-Ups inflicting a 0.36s System-Pin root & twin rail-packets.'
      },
      {
        name: 'AUTO-PATCH FIREWALL V2.0',
        type: 'SKILL • 5.0S CD',
        cooldown: 5.0,
        desc: 'Deploys fortified Holo-Patch Shield + self & Tag-Ally HP restore & repelling Cob Seal (-25% strike dmg).'
      }
    ],
    ult: [
      null,
      {
        name: 'ROOT-ACCESS: HYPER-LASER',
        type: 'OVERDRIVE ULT',
        desc: 'Overclocks all 6 Terminal Drones into a rapid zero-shield Nebula Hyper-Beam (+18% climax burst & +12 Ult gauge).'
      },
      {
        name: 'COB-OS: SANCTUARY RESTORE',
        type: 'OVERDRIVE ULT',
        desc: 'Projects a 6-Drone Firewall Dome restoring +52 HP (+36 Tag-Ally HP) & 130 HP Holo-Patch Shield (-18% burst).'
      }
    ]
  },

  ronin_ex: {
    heroId: 'ronin_ex',
    presets: [
      { index: 0, roman: 'I', shortName: 'SOVEREIGN', name: 'SOVEREIGN STANDARD', aspect: 0, skill: 0, ult: 0 },
      { index: 1, roman: 'II', shortName: 'ASHURA', name: 'CRIMSON ASHURA', aspect: 1, skill: 1, ult: 1 },
      { index: 2, roman: 'III', shortName: 'KENSHIN', name: 'SERENE KENSHIN', aspect: 2, skill: 2, ult: 2 }
    ],
    aspect: [
      null,
      {
        trait: 'ASPECT II: CRIMSON ASHURA (TWIN STORM-WAVES & BLITZ)',
        name: 'ASHURA BATTOJUTSU RUSH',
        type: 'RELENTLESS IAIDO RUSH',
        desc: '+8% sprint speed & launches piercing Storm-Waves on Beat 1 + Beat 4; forfeits Serene Mind counter heal (-4% HP).'
      },
      {
        trait: 'ASPECT III: SERENE KENSHIN (MASTER PARRY & RAIJIN WARD)',
        name: 'KENSHIN SERENE IAIDO',
        type: 'COUNTER-PARRY + WARD',
        desc: 'Shorter 2.2s Serene Mind CD & +72 HP Storm Barrier on Counter-Blink / Parry (-10% auto slash dmg).'
      }
    ],
    skill: [
      null,
      {
        name: 'ASHURA TEN-FOLD SEVER',
        type: 'SKILL • 4.5S CD',
        cooldown: 4.5,
        desc: 'Zero Raijin heal; executes a cross-through lightning sever + piercing Odachi wave & +16% Saya-Click burst.'
      },
      {
        name: 'NARUKAMI SANCTUARY GATE',
        type: 'SKILL • 5.1S CD',
        cooldown: 5.1,
        desc: 'Grants Storm Barrier + Raijin Focus & Tag-Ally heal on Saya-Click (-22% Saya-Click burst).'
      }
    ],
    ult: [
      null,
      {
        name: 'TAKEMIKAZUCHI BLOOD-BLITZ',
        type: 'OVERDRIVE ULT',
        desc: 'Zero Susanoo heal; unleashes high-voltage crimson-gold omnislash cuts & +18% Heaven-Split execution burst.'
      },
      {
        name: 'RAIJIN AEGIS JUDGEMENT',
        type: 'OVERDRIVE ULT',
        desc: 'Restores +48 HP + 96 HP Storm Barrier & inflicts a 0.40s Thunder-Bind root on Heaven-Split (-18% slash dmg).'
      }
    ]
  },

  reaper_ex: {
    heroId: 'reaper_ex',
    presets: [
      { index: 0, roman: 'I', shortName: 'SOVEREIGN', name: 'SOVEREIGN STANDARD', aspect: 0, skill: 0, ult: 0 },
      { index: 1, roman: 'II', shortName: 'EXECUTIONER', name: 'BLOOD EXECUTIONER', aspect: 1, skill: 1, ult: 1 },
      { index: 2, roman: 'III', shortName: 'NECROPOLIS', name: 'NECROPOLIS COVENANT', aspect: 2, skill: 2, ult: 2 }
    ],
    aspect: [
      null,
      {
        trait: 'ASPECT II: BLOOD EXECUTIONER (ZERO-LEECH EXECUTE BURST)',
        name: 'CRIMSON GUILLOTINE QUARTET',
        type: 'ZERO-LEECH EXECUTE',
        desc: 'Forfeits auto life-leech; empowers Crimson Reap at 3+ Souls & deals up to +20% Execute bonus vs wounded foes.'
      },
      {
        trait: 'ASPECT III: NECROPOLIS COVENANT (SOUL-LEECH & GRAVE WARD)',
        name: 'COVENANT SOUL-HARVEST',
        type: 'HEAVY LEECH + GRAVE WARD',
        desc: '+42% Soul-Leech sustain, faster 7.8s Shadow Burrow & extended Grave-Ward damage reduction (-11% scythe dmg).'
      }
    ],
    skill: [
      null,
      {
        name: 'CRIMSON EXECUTIONER HOOK',
        type: 'SKILL • 4.6S CD',
        cooldown: 4.6,
        desc: 'Zero life-leech; high-velocity chain yank into a Twin-Obelisk Crimson Guillotine (+18% execute burst).'
      },
      {
        name: 'SOUL-LANTERN FEAST',
        type: 'SKILL • 5.5S CD',
        cooldown: 5.5,
        desc: 'Siphons Soul-Feast (+22 Tag-Ally HP) & grants Grave-Ward Barrier around the effigy (-26% guillotine dmg).'
      }
    ],
    ult: [
      null,
      {
        name: 'BLOOD-MOON ANNIHILATION',
        type: 'OVERDRIVE ULT',
        desc: 'Zero leech; manifests a Crimson Thanatos Stand & 5-spire Guillotine fault-line for +18% execution burst.'
      },
      {
        name: 'UNDYING LEGION PACT',
        type: 'OVERDRIVE ULT',
        desc: 'Drains +42 HP Soul-Feast (+26 Tag-Ally HP) & grants 96 HP Grave-Ward Barrier (-18% three-scythe reap dmg).'
      }
    ]
  }
};

function clampTier(val) {
  const n = Number(val);
  if (n === 1 || n === 2) return n;
  return 0;
}

function normalizeSlotKey(slotKey) {
  if (slotKey === 1 || slotKey === 'p1') return 'p1';
  if (slotKey === 3 || slotKey === 'p1b') return 'p1b';
  if (slotKey === 2 || slotKey === 'p2') return 'p2';
  if (slotKey === 4 || slotKey === 'p2b') return 'p2b';
  return 'p1';
}

function getStorageHandle() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (_) {
    // Restricted storage environment fallback
  }
  return null;
}

function makeFreshState() {
  return {
    version: 1,
    challengerRng: true,
    slots: {
      p1: {},
      p1b: {},
      p2: {},
      p2b: {}
    }
  };
}

class SovereignBuildStore {
  constructor() {
    this._state = makeFreshState();
    this._tourneyOverrides = {
      p2: {},
      p2b: {}
    };
    this.reloadFromStorage();
  }

  reloadFromStorage() {
    this._state = makeFreshState();
    const store = getStorageHandle();
    if (!store || typeof store.getItem !== 'function') return this._state;
    try {
      const raw = store.getItem(SOVEREIGN_STORAGE_KEY);
      if (!raw) return this._state;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return this._state;
      if (typeof parsed.challengerRng === 'boolean') {
        this._state.challengerRng = parsed.challengerRng;
      }
      if (parsed.slots && typeof parsed.slots === 'object') {
        for (const sk of SOVEREIGN_SLOT_KEYS) {
          const srcSlot = parsed.slots[sk];
          if (!srcSlot || typeof srcSlot !== 'object') continue;
          for (const [heroId, entry] of Object.entries(srcSlot)) {
            if (!SOVEREIGN_BUILD_HERO_SET.has(heroId) || !entry || typeof entry !== 'object') continue;
            this._state.slots[sk][heroId] = {
              aspect: clampTier(entry.aspect),
              skill: clampTier(entry.skill),
              ult: clampTier(entry.ult),
              rng: Boolean(entry.rng)
            };
          }
        }
      }
    } catch (_) {
      this._state = makeFreshState();
    }
    return this._state;
  }

  _persist() {
    const store = getStorageHandle();
    if (!store || typeof store.setItem !== 'function') return;
    try {
      store.setItem(SOVEREIGN_STORAGE_KEY, JSON.stringify(this._state));
    } catch (_) {
      // Ignore quota / privacy errors gracefully
    }
  }

  resetAllBuilds(persist = true) {
    this._state = makeFreshState();
    this._tourneyOverrides = { p2: {}, p2b: {} };
    if (persist) {
      const store = getStorageHandle();
      if (store && typeof store.removeItem === 'function') {
        try {
          store.removeItem(SOVEREIGN_STORAGE_KEY);
        } catch (_) {
          // Ignore
        }
      }
    }
  }

  hasCustomBuilds(heroId) {
    return typeof heroId === 'string' && SOVEREIGN_BUILD_HERO_SET.has(heroId);
  }

  isExHero(heroId) {
    return typeof heroId === 'string' && heroId.endsWith('_ex');
  }

  getHeroCatalog(heroId) {
    return HERO_BUILD_CATALOG[heroId] || null;
  }

  isChallengerRngEnabled() {
    return Boolean(this._state.challengerRng);
  }

  setChallengerRngEnabled(enabled) {
    this._state.challengerRng = Boolean(enabled);
    this._persist();
  }

  clearTourneyOverrides(slotKey = null) {
    if (slotKey) {
      const sk = normalizeSlotKey(slotKey);
      if (this._tourneyOverrides[sk]) this._tourneyOverrides[sk] = {};
    } else {
      this._tourneyOverrides = { p2: {}, p2b: {} };
    }
  }

  rollChallengerBuild(slotKey, heroId, rngFn = Math.random) {
    const sk = normalizeSlotKey(slotKey);
    if (!this.hasCustomBuilds(heroId)) {
      if (this._tourneyOverrides[sk]) delete this._tourneyOverrides[sk][heroId];
      return this.getSlotBuild(sk, heroId);
    }
    // 60% chance of a cohesive named archetype ([I], [II], [III]), 40% mixed Sovereign hybrid
    const pick = rngFn();
    let rolled;
    if (pick < 0.6) {
      const pIdx = Math.min(2, Math.floor(rngFn() * 3));
      rolled = { aspect: pIdx, skill: pIdx, ult: pIdx, rng: false, isTourneyRolled: true };
    } else {
      rolled = {
        aspect: Math.min(2, Math.floor(rngFn() * 3)),
        skill: Math.min(2, Math.floor(rngFn() * 3)),
        ult: Math.min(2, Math.floor(rngFn() * 3)),
        rng: false,
        isTourneyRolled: true
      };
    }
    if (!this._tourneyOverrides[sk]) this._tourneyOverrides[sk] = {};
    this._tourneyOverrides[sk][heroId] = rolled;
    return this.getSlotBuild(sk, heroId);
  }

  getPresetIndex(aspect, skill, ult, rng = false) {
    if (rng) return -1;
    const a = clampTier(aspect);
    const s = clampTier(skill);
    const u = clampTier(ult);
    if (a === s && s === u) return a;
    return -1;
  }

  formatBuildCode(aspect, skill, ult) {
    return `${ROMAN_TIERS[clampTier(aspect)]}-${ROMAN_TIERS[clampTier(skill)]}-${ROMAN_TIERS[clampTier(ult)]}`;
  }

  getSlotBuild(slotKey, heroId) {
    const sk = normalizeSlotKey(slotKey);
    if (!this.hasCustomBuilds(heroId)) {
      return {
        slotKey: sk,
        heroId,
        aspect: 0,
        skill: 0,
        ult: 0,
        rng: false,
        presetIndex: 0,
        code: 'I-I-I',
        hasCustomBuilds: false
      };
    }

    const tourneyOverride = this._tourneyOverrides[sk]?.[heroId];
    const saved = tourneyOverride || this._state.slots[sk]?.[heroId];
    const aspect = clampTier(saved?.aspect);
    const skill = clampTier(saved?.skill);
    const ult = clampTier(saved?.ult);
    const rng = Boolean(saved?.rng);
    const presetIndex = this.getPresetIndex(aspect, skill, ult, rng);
    return {
      slotKey: sk,
      heroId,
      aspect,
      skill,
      ult,
      rng,
      isTourneyRolled: Boolean(tourneyOverride),
      presetIndex,
      code: rng ? 'RNG' : this.formatBuildCode(aspect, skill, ult),
      hasCustomBuilds: true
    };
  }

  setSlotBuild(slotKey, heroId, nextBuild, persist = true) {
    const sk = normalizeSlotKey(slotKey);
    if (!this.hasCustomBuilds(heroId)) return this.getSlotBuild(sk, heroId);
    if (this._tourneyOverrides[sk]) delete this._tourneyOverrides[sk][heroId];
    const entry = {
      aspect: clampTier(nextBuild?.aspect),
      skill: clampTier(nextBuild?.skill),
      ult: clampTier(nextBuild?.ult),
      rng: Boolean(nextBuild?.rng)
    };
    this._state.slots[sk][heroId] = entry;
    if (persist) this._persist();
    return this.getSlotBuild(sk, heroId);
  }

  setSlotCategoryTier(slotKey, heroId, category, tier, persist = true) {
    const sk = normalizeSlotKey(slotKey);
    if (!this.hasCustomBuilds(heroId)) return this.getSlotBuild(sk, heroId);
    const cur = this.getSlotBuild(sk, heroId);
    const next = {
      aspect: cur.aspect,
      skill: cur.skill,
      ult: cur.ult,
      rng: false
    };
    if (category === 'aspect' || category === 0 || category === '0') next.aspect = clampTier(tier);
    else if (category === 'skill' || category === 1 || category === '1') next.skill = clampTier(tier);
    else if (category === 'ult' || category === 2 || category === '2') next.ult = clampTier(tier);
    return this.setSlotBuild(sk, heroId, next, persist);
  }

  setSlotPreset(slotKey, heroId, presetKey, persist = true) {
    const sk = normalizeSlotKey(slotKey);
    if (!this.hasCustomBuilds(heroId)) return this.getSlotBuild(sk, heroId);
    if (presetKey === 'rng' || presetKey === 'RNG') {
      const cur = this.getSlotBuild(sk, heroId);
      return this.setSlotBuild(
        sk,
        heroId,
        {
          aspect: cur.aspect,
          skill: cur.skill,
          ult: cur.ult,
          rng: !cur.rng
        },
        persist
      );
    }
    const pIdx = clampTier(presetKey);
    return this.setSlotBuild(sk, heroId, { aspect: pIdx, skill: pIdx, ult: pIdx, rng: false }, persist);
  }

  parseBuildShorthand(str) {
    if (typeof str !== 'string') return null;
    const clean = str.trim().toLowerCase();
    if (clean === 'rng' || clean === 'random') {
      return { aspect: 0, skill: 0, ult: 0, rng: true };
    }
    const digits = clean.replace(/[^012]/g, '');
    if (digits.length === 1) {
      const t = clampTier(Number(digits[0]));
      return { aspect: t, skill: t, ult: t, rng: false };
    }
    if (digits.length >= 3) {
      return {
        aspect: clampTier(Number(digits[0])),
        skill: clampTier(Number(digits[1])),
        ult: clampTier(Number(digits[2])),
        rng: false
      };
    }
    return null;
  }

  resolveMatchBuild(slotKey, heroId, opts = {}) {
    const isAdventure = Boolean(opts.isAdventure);
    const rngFn = typeof opts.rngFn === 'function' ? opts.rngFn : Math.random;
    const explicit = opts.explicitBuild || null;

    if (isAdventure || !this.hasCustomBuilds(heroId)) {
      return {
        heroId,
        aspect: 0,
        skill: 0,
        ult: 0,
        isRng: false,
        isDefault: true,
        presetIndex: 0,
        presetShort: 'SOVEREIGN',
        presetName: 'SOVEREIGN STANDARD',
        code: 'I-I-I',
        hudLabel: 'I • SOVEREIGN',
        hudCompact: 'I-I-I'
      };
    }

    const base = explicit
      ? {
          aspect: clampTier(explicit.aspect),
          skill: clampTier(explicit.skill),
          ult: clampTier(explicit.ult),
          rng: Boolean(explicit.rng)
        }
      : this.getSlotBuild(slotKey, heroId);

    const isRng = Boolean(base.rng);
    const aspect = isRng ? Math.min(2, Math.floor(rngFn() * 3)) : clampTier(base.aspect);
    const skill = isRng ? Math.min(2, Math.floor(rngFn() * 3)) : clampTier(base.skill);
    const ult = isRng ? Math.min(2, Math.floor(rngFn() * 3)) : clampTier(base.ult);

    return this.describeConcreteBuild(heroId, aspect, skill, ult, isRng);
  }

  describeConcreteBuild(heroId, aspect, skill, ult, isRng = false) {
    const a = clampTier(aspect);
    const s = clampTier(skill);
    const u = clampTier(ult);
    const code = this.formatBuildCode(a, s, u);
    const cat = HERO_BUILD_CATALOG[heroId];
    const pIdx = a === s && s === u ? a : -1;
    const preset = pIdx >= 0 && cat?.presets?.[pIdx] ? cat.presets[pIdx] : null;
    const presetShort = preset ? preset.shortName : 'CUSTOM';
    const presetName = preset ? preset.name : `CUSTOM (${code})`;
    const hudLabel = isRng
      ? `RNG • ${code}`
      : preset
        ? `${preset.roman} • ${preset.shortName}`
        : `BLD • ${code}`;
    const hudCompact = isRng ? `R:${code}` : code;

    return {
      heroId,
      aspect: a,
      skill: s,
      ult: u,
      isRng: Boolean(isRng),
      isDefault: a === 0 && s === 0 && u === 0,
      presetIndex: pIdx,
      presetShort,
      presetName,
      code,
      hudLabel,
      hudCompact
    };
  }

  /**
   * Builds the Roster Select display payload for `#profile-left` / `#profile-right`.
   * On `0/0/0` (or Legacy / Adventure / Batch-2 EX), preserves exact `baseCfg` strings.
   */
  getProfileDisplayKit(heroId, baseCfg, slotKey, isAdventure = false) {
    if (!baseCfg) return null;
    const isEx = this.isExHero(heroId);
    if (isAdventure || !isEx) {
      return {
        showBuildUI: false,
        hasCustomBuilds: false,
        trait: baseCfg.trait,
        skills: baseCfg.skills || [],
        slotBuild: null,
        presets: [],
        activeSummary: ''
      };
    }

    const cat = HERO_BUILD_CATALOG[heroId];
    if (!cat) {
      // Batch-2 EX Hero: show clean locked [I] SOVEREIGN STANDARD badge with 0 broken tabs
      return {
        showBuildUI: true,
        hasCustomBuilds: false,
        trait: baseCfg.trait,
        skills: baseCfg.skills || [],
        slotBuild: {
          aspect: 0,
          skill: 0,
          ult: 0,
          rng: false,
          presetIndex: 0,
          code: 'I-I-I'
        },
        presets: [
          { index: 0, roman: 'I', shortName: 'SOVEREIGN', name: 'SOVEREIGN STANDARD' }
        ],
        activeSummary: 'SOVEREIGN STD'
      };
    }

    const slotBuild = this.getSlotBuild(slotKey, heroId);
    const a = slotBuild.aspect;
    const s = slotBuild.skill;
    const u = slotBuild.ult;

    const baseSkills = Array.isArray(baseCfg.skills) ? baseCfg.skills : [];
    const aspectMeta = a > 0 ? cat.aspect[a] : null;
    const skillMeta = s > 0 ? cat.skill[s] : null;
    const ultMeta = u > 0 ? cat.ult[u] : null;

    const skills = [
      aspectMeta
        ? { ...baseSkills[0], name: aspectMeta.name, type: aspectMeta.type, desc: aspectMeta.desc }
        : baseSkills[0],
      skillMeta
        ? { ...baseSkills[1], name: skillMeta.name, type: skillMeta.type, desc: skillMeta.desc }
        : baseSkills[1],
      ultMeta
        ? { ...baseSkills[2], name: ultMeta.name, type: ultMeta.type, desc: ultMeta.desc }
        : baseSkills[2]
    ];

    const preset = slotBuild.presetIndex >= 0 ? cat.presets[slotBuild.presetIndex] : null;
    const activeSummary = slotBuild.rng
      ? 'RNG ROLL'
      : preset
        ? preset.shortName
        : `CUSTOM ${slotBuild.code}`;

    return {
      showBuildUI: true,
      hasCustomBuilds: true,
      trait: aspectMeta?.trait || baseCfg.trait,
      skills,
      slotBuild,
      presets: cat.presets,
      activeSummary
    };
  }

  /**
   * Attaches the resolved VS loadout to an instantiated EX fighter.
   * Strictly NO-OP in Adventure Mode, for Legacy champions, or when `0/0/0` (`[I] Sovereign Standard`)!
   */
  applyBuildToFighter(fighter, resolvedBuild, isAdventure = false) {
    if (!fighter) return null;
    const heroId = fighter.heroId || resolvedBuild?.heroId || '';
    if (isAdventure || !this.hasCustomBuilds(heroId)) {
      fighter.buildConfig = null;
      fighter.buildAspect = 0;
      fighter.buildSkill = 0;
      fighter.buildUlt = 0;
      return null;
    }

    const concrete =
      resolvedBuild && typeof resolvedBuild.aspect === 'number'
        ? this.describeConcreteBuild(
            heroId,
            resolvedBuild.aspect,
            resolvedBuild.skill,
            resolvedBuild.ult,
            resolvedBuild.isRng
          )
        : this.describeConcreteBuild(heroId, 0, 0, 0, false);

    fighter.buildConfig = concrete;
    fighter.buildAspect = concrete.aspect;
    fighter.buildSkill = concrete.skill;
    fighter.buildUlt = concrete.ult;

    // `0/0/0` ([I] Sovereign Standard): 100% untouched baseline stats, names & cooldowns!
    if (concrete.isDefault) {
      return concrete;
    }

    const cat = HERO_BUILD_CATALOG[heroId];
    if (concrete.skill > 0 && cat?.skill?.[concrete.skill]) {
      const skMeta = cat.skill[concrete.skill];
      fighter.skillName = skMeta.name;
      if (Number.isFinite(skMeta.cooldown)) {
        fighter.skillMaxCooldown = skMeta.cooldown;
      }
    }
    if (concrete.ult > 0 && cat?.ult?.[concrete.ult]) {
      fighter.ultName = cat.ult[concrete.ult].name;
    }

    if (typeof fighter.applySovereignAspectStats === 'function' && concrete.aspect > 0) {
      fighter.applySovereignAspectStats(concrete.aspect);
    }

    return concrete;
  }
}

export const HeroBuildSystem = new SovereignBuildStore();
