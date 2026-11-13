import { PixelForge } from '../engine/PixelForge.js?v=30fps86';

/**
 * Dedicated 2.5D Dungeon Action-RPG Skill Sets for All 11 Champions (`AdventureSkillSets`)
 *
 * Strictly isolated to Adventure Mode (`adventure.active === true`):
 *  - Zero modifications to VS Mode (`1v1`, `2v2_brawl`, `2v2_tag`) skills, stats, ranges, or class files.
 *  - Zero modifications to Protected Champion files (`FireMage.js`, `Warrior.js`, `Valkyrie.js`,
 *    `Priestess.js`, `Ronin.js`, `Chronomancer.js`).
 *  - Every champion receives a custom 2.5D Beat-'Em-Up / Action-RPG moveset built specifically for:
 *      • 3D multi-lane monster packs (`groundY: 442..680`),
 *      • Wave-locked 1200px encounter zones (`adventure.getActiveStageBounds()`),
 *      • Left-Side Colossal Raid Boss `BEHEMOTH MALPHAS` (`x = 3865`),
 *      • Zero `ctx.rotate()` / zero canvas shearing, stamping authentic `<hero>_vfx.png` `208x208` 30fps cells.
 */

export const ADVENTURE_HERO_KITS = {
  warrior: {
    id: 'warrior',
    heroName: 'AETHELGARD',
    kitTitle: 'ADVENTURE KIT • RUNIC VANGUARD',
    role: '2.5D CLEAVE PALADIN • PACK BREAKER',
    style: 'ADVENTURE KIT: WIDE RUNE CLEAVES • CYCLONE PULL • SANCTUARY CONSECRATION',
    trait: 'ADV PASSIVE: 3RD CLEAVE LAUNCHES A FROST-STEEL WAVE & AEGIS GUARD VAPORIZES BOLTS',
    skillName: 'CYCLONE VANGUARD',
    ultName: 'GLACIAL EARTHSHATTER',
    trueUltName: 'SANCTUARY JUDGMENT',
    trueUltDesc:
      'Consecrates the entire 3D zone in Golden Sanctuary Light (+16% HP), rains 6 Celestial Runeblades on all monsters, and detonates a Heavens-Cleave shockwave!',
    attackRange: 205,
    autoCd: 0.42,
    autoDuration: 0.48,
    skillCooldownMax: 4.4,
    skillDuration: 0.92,
    ultDuration: 1.48,
    trueUltDuration: 2.35,
    crouchDuration: 0.68,
    dashDuration: 0.42,
    tags: {
      attack: 'CLEAVE',
      dodge: 'STEP',
      skill: 'CYCLONE',
      overdrive: 'SHATTER',
      ultimate: 'JUSTICE',
      crouch: 'AEGIS',
      jump: 'PLUNGE'
    },
    skills: [
      {
        name: 'CYCLONE VANGUARD',
        type: '3D VACUUM CLEAVE',
        desc: 'Surges forward in a 360° Runeblade whirlwind that pulls multi-lane monsters inward before shattering frost-steel spires.'
      },
      {
        name: 'GLACIAL EARTHSHATTER',
        type: 'OVERDRIVE WAVE',
        desc: 'Sky-leap Claymore slam erupting 5 cascading Glacial Runeblade Pillars across the 3D road (0.75s Pack Stun).'
      },
      {
        name: 'AEGIS BULWARK & PLUNGE',
        type: 'WARD & AERIAL SLAM',
        desc: 'Plants a Runic Aegis Dome that vaporizes nearby projectiles (+20 Spirit) or leaps for a heavy Claymore Plunge.'
      }
    ]
  },

  mage: {
    id: 'mage',
    heroName: 'IGNIS SOL',
    kitTitle: 'ADVENTURE KIT • HELIOS PYROMANCER',
    role: '2.5D SOLAR ARTILLERY • ZONE INCINERATOR',
    style: 'ADVENTURE KIT: SPREAD SOLAR VOLLEY • MARCHING PILLARS • ECLIPSE VORTEX',
    trait: 'ADV PASSIVE: EVERY 3RD CAST DETONATES A WIDE EMBER NOVA ACROSS 3D LANES',
    skillName: 'MAGMA PILLAR SURGE',
    ultName: 'SOLAR ECLIPSE VORTEX',
    trueUltName: 'HEAVENSFALL CATACLYSM',
    trueUltDesc:
      'Tears open a Heavensfall Sky Breach over the realm, raining scorching solar meteors across every lane before crashing a Colossal Limit-Break Star-Meteor!',
    attackRange: 470,
    autoCd: 0.44,
    autoDuration: 0.48,
    skillCooldownMax: 4.5,
    skillDuration: 0.90,
    ultDuration: 1.52,
    trueUltDuration: 2.45,
    crouchDuration: 0.66,
    dashDuration: 0.40,
    tags: {
      attack: 'SOLAR',
      dodge: 'BLINK',
      skill: 'PILLARS',
      overdrive: 'ECLIPSE',
      ultimate: 'METEOR',
      crouch: 'WARD',
      jump: 'VAULT'
    },
    skills: [
      {
        name: 'MAGMA PILLAR SURGE',
        type: '3-LANE ERUPTION',
        desc: 'Summons 3 marching Molten Hellfire Pillars across monster lanes that launch & scorch entire packs.'
      },
      {
        name: 'SOLAR ECLIPSE VORTEX',
        type: 'GRAVITY SUPERNOVA',
        desc: 'Conjures a Black-Sun Solar Eclipse Sphere that vacuums monsters across 3D depth into a twin-ring detonation.'
      },
      {
        name: 'HELIOS FLAME WARD',
        type: 'SOLAR BARRIER',
        desc: 'Erupts a Helios Sun-Crest ring that incinerates incoming projectiles, repels melee rushers, and restores Spirit.'
      }
    ]
  },

  archer: {
    id: 'archer',
    heroName: 'SYLVARA',
    kitTitle: 'ADVENTURE KIT • STARWOOD RANGER',
    role: '2.5D MULTI-SHOT HUNTRESS • GALE CONTROLLER',
    style: 'ADVENTURE KIT: 3-LANE FAN ARROWS • STARWOOD RAIN • DRAGON-PIERCER BEAM',
    trait: 'ADV PASSIVE: AGILE RUN-AND-SHOOT VOLLEYS + 3RD SHOT FIRES A 3-ARROW 3D SPREAD',
    skillName: 'STARWOOD ARROW RAIN',
    ultName: 'TEMPEST GALE VORTEX',
    trueUltName: 'YGGDRASIL DRAGON-PIERCER',
    trueUltDesc:
      'Binds all monsters in Yggdrasil World-Tree Roots, draws the Celestial Greatbow inside the active zone, and fires a zone-spanning Supernova Dragon-Arrow!',
    attackRange: 495,
    autoCd: 0.38,
    autoDuration: 0.45,
    skillCooldownMax: 4.3,
    skillDuration: 0.88,
    ultDuration: 1.46,
    trueUltDuration: 2.35,
    crouchDuration: 0.64,
    dashDuration: 0.42,
    tags: {
      attack: 'BARRAGE',
      dodge: 'GALE',
      skill: 'RAIN',
      overdrive: 'TEMPEST',
      ultimate: 'DRAGON',
      crouch: 'SNARE',
      jump: 'VAULT'
    },
    skills: [
      {
        name: 'STARWOOD ARROW RAIN',
        type: '3D VOLLEY & ROOT',
        desc: 'Fires an emerald sky-salvo raining 7 Starfall Arrows over monster clusters and rooting survivors (0.65s).'
      },
      {
        name: 'TEMPEST GALE VORTEX',
        type: 'SWEEPING TORNADO',
        desc: 'Launches a sweeping Wind-Dragon Tornado down the 3D causeway that pulls and multi-hits every foe in its path.'
      },
      {
        name: 'VERDANT BRAMBLE SNARE',
        type: 'TRAP & EVADE',
        desc: 'Drops a Bramble-Star Sigil trap on the road that detonates & snares pursuers while Sylvara back-steps cleanly.'
      }
    ]
  },

  priestess: {
    id: 'priestess',
    heroName: 'SERAPHINA',
    kitTitle: 'ADVENTURE KIT • SERAPHIC ORACLE',
    role: '2.5D HOLY SANCTUM • RADIANT SUSTAIN & BEAM',
    style: 'ADVENTURE KIT: HALO SPLASH BOLTS • CONSECRATED CIRCLE • FINAL GRACE LASER',
    trait: 'ADV PASSIVE: SANCTUARY SKILLS MEND VITALITY WHILE SMITING ALL FOES IN THE HALO',
    skillName: 'CATHEDRAL SANCTUARY',
    ultName: 'VALKYRIE SPEAR CHORUS',
    trueUltName: 'FINAL GRACE DAWNBREAKER',
    trueUltDesc:
      'Ascends in Archangel radiance (+20% HP Grace), illuminates the Rose Mandala, and fires a full-zone horizontal Final Grace Prismatic Cannon!',
    attackRange: 465,
    autoCd: 0.44,
    autoDuration: 0.48,
    skillCooldownMax: 4.8,
    skillDuration: 0.92,
    ultDuration: 1.50,
    trueUltDuration: 2.40,
    crouchDuration: 0.68,
    dashDuration: 0.44,
    tags: {
      attack: 'SMITE',
      dodge: 'GRACE',
      skill: 'SANCTUM',
      overdrive: 'CHORUS',
      ultimate: 'BEAM',
      crouch: 'AEGIS',
      jump: 'ASCEND'
    },
    skills: [
      {
        name: 'CATHEDRAL SANCTUARY',
        type: 'HEAL & SMITE ZONE',
        desc: 'Consecrates a wide 2.5D Stained-Glass Rose Circle that heals Seraphina (+10% HP) and pulses 3 Holy Smites on foes.'
      },
      {
        name: 'VALKYRIE SPEAR CHORUS',
        type: 'SKY JUDGMENT',
        desc: 'Calls down 6 Descending Holy Spears & Cathedral Star Geysers directly onto every living monster across 3D lanes.'
      },
      {
        name: 'ROSE MANDALA AEGIS',
        type: 'RADIANT SHIELD',
        desc: 'Unfurls a Sacred Star-Cross barrier that blocks incoming hits, purges nearby bolts, and restores Solar Spirit.'
      }
    ]
  },

  reaper: {
    id: 'reaper',
    heroName: 'MALAKOR',
    kitTitle: 'ADVENTURE KIT • ABYSSAL HARVESTER',
    role: '2.5D WIDE SCYTHE REAPER • CHAIN HOOK & SOUL DRAIN',
    style: 'ADVENTURE KIT: MULTI-LANE REAP • GRAVE-CHAIN GATHER • GUILLOTINE ECLIPSE',
    trait: 'ADV PASSIVE: 3RD SCYTHE REAP SIPHONS LIFE FROM EVERY MONSTER CLEAVED',
    skillName: 'ABYSSAL CHAIN GATHER',
    ultName: 'OSSUARY BONE-OBELISKS',
    trueUltName: 'MEMENTO MORI GUILLOTINE',
    trueUltDesc:
      'Raises the Twin Obsidian Gates of the Necropolis, binds the entire zone in Grave-Chains, and drops a colossal Death-God Guillotine (+Soul Siphon)!',
    attackRange: 225,
    autoCd: 0.43,
    autoDuration: 0.50,
    skillCooldownMax: 4.5,
    skillDuration: 0.92,
    ultDuration: 1.52,
    trueUltDuration: 2.40,
    crouchDuration: 0.68,
    dashDuration: 0.44,
    tags: {
      attack: 'REAP',
      dodge: 'WRAITH',
      skill: 'CHAINS',
      overdrive: 'OSSUARY',
      ultimate: 'MORI',
      crouch: 'SHROUD',
      jump: 'DIVE'
    },
    skills: [
      {
        name: 'ABYSSAL CHAIN GATHER',
        type: '3D HOOK & CLEAVE',
        desc: 'Lashes Grave-Chains across 3D lanes, yanking scattered monsters together into a crushing Crimson-Violet Scythe Reap.'
      },
      {
        name: 'OSSUARY BONE-OBELISKS',
        type: 'ZONE ERUPTION',
        desc: 'Erupts 5 Ossuary Bone-Spires & Soul-Wisps across the road, stunning packs (0.8s) and draining vitality.'
      },
      {
        name: 'GRAVE WRAITH SHROUD',
        type: 'PHASE COUNTER',
        desc: 'Dissolves into untargetable Necropolis mist, phasing through enemy strikes and erupting with a Soul-Slash ring.'
      }
    ]
  },

  chronomancer: {
    id: 'chronomancer',
    heroName: 'CHRONOS',
    kitTitle: 'ADVENTURE KIT • HOROLOGICAL SOVEREIGN',
    role: '2.5D TIME-STOP TACTICIAN • CLOCKWORK VORTEX',
    style: 'ADVENTURE KIT: PIERCING GLAIVE WAVES • TIME-SLOW GEARS • ETERNAL ZERO FREEZE',
    trait: 'ADV PASSIVE: 3RD GLAIVE STRIKE HURLS A PIERCING MINUTE-BLADE SONIC WAVE',
    skillName: 'CHRONO GEAR ANOMALY',
    ultName: 'HOROLOGIUM TIME-STOP',
    trueUltName: 'TWELFTH BELL PARADOX',
    trueUltDesc:
      'Freezes all monsters in Stopped Time across the zone, fires converging Golden-Brass Clock-Hand Spears, and shatters the Grand XII Clockface!',
    attackRange: 255,
    autoCd: 0.40,
    autoDuration: 0.47,
    skillCooldownMax: 4.4,
    skillDuration: 0.90,
    ultDuration: 1.50,
    trueUltDuration: 2.40,
    crouchDuration: 0.66,
    dashDuration: 0.40,
    tags: {
      attack: 'GLAIVE',
      dodge: 'WARP',
      skill: 'GEARS',
      overdrive: 'STASIS',
      ultimate: 'XII BELL',
      crouch: 'REWIND',
      jump: 'SHIFT'
    },
    skills: [
      {
        name: 'CHRONO GEAR ANOMALY',
        type: '3D VORTEX & HASTE',
        desc: 'Deploys a spinning Brass-Cyan Astrolabe Gear field on the road that pulls & ticks Aether damage while hasting Dodge/Vault.'
      },
      {
        name: 'HOROLOGIUM TIME-STOP',
        type: 'ZONE TIME-FREEZE',
        desc: 'Unfurls the XII Clockface, locking all monsters in 1.5s Stopped Time before shattering a Temporal Star-Burst.'
      },
      {
        name: 'TEMPORAL REWIND GUARD',
        type: 'PARRY & MEND',
        desc: 'Spins Twin Hands of Fate to negate incoming hits, rewind +6% HP, and fire an X-Scissor shockwave.'
      }
    ]
  },

  titan: {
    id: 'titan',
    heroName: 'TORGAR',
    kitTitle: 'ADVENTURE KIT • WORLD-FORGE JUGGERNAUT',
    role: '2.5D POISE COLOSSUS • SEISMIC SIEGE BREAKER',
    style: 'ADVENTURE KIT: UNSTOPPABLE MAUL • CRUCIBLE ANVIL SLAM • CONTINENTAL SUNDER',
    trait: 'ADV PASSIVE: FORGE-POISE ARMOR DURING HEAVY SWINGS & TECTONIC WAVE FINISHERS',
    skillName: 'CRUCIBLE ANVIL CRASH',
    ultName: 'WORLD-BREAKER SHOCKBAT',
    trueUltName: 'CONTINENTAL SUNDER',
    trueUltDesc:
      'Expands into a 1.85x Forge-Avatar inside the active zone, leaps skyward, and meteor-smashes Mjolnir to erupt Volcanic Rune Geysers across every lane!',
    attackRange: 215,
    autoCd: 0.46,
    autoDuration: 0.52,
    skillCooldownMax: 4.6,
    skillDuration: 0.94,
    ultDuration: 1.52,
    trueUltDuration: 2.45,
    crouchDuration: 0.70,
    dashDuration: 0.44,
    tags: {
      attack: 'MAUL',
      dodge: 'BULLRUSH',
      skill: 'ANVIL',
      overdrive: 'SHOCKBAT',
      ultimate: 'SUNDER',
      crouch: 'BULWARK',
      jump: 'METEOR'
    },
    skills: [
      {
        name: 'CRUCIBLE ANVIL CRASH',
        type: '3-LANE MAGMA SLAM',
        desc: 'Charges forward with Forge-Armor and drops a Runic Iron Anvil, erupting Magma-Jade Rune Pillars & stunning foes (0.7s).'
      },
      {
        name: 'WORLD-BREAKER SHOCKBAT',
        type: 'ZONE KNOCKBACK WAVE',
        desc: 'Winds up Mjolnir and unleashes a colossal Tectonic Magma Wave across 3D lanes, blasting packs & cracking Boss armor.'
      },
      {
        name: 'FORGE-IRON BULWARK',
        type: 'SUPER-ARMOR GUARD',
        desc: 'Plants the World-Forge Seal to shrug off blows, crush incoming bolts, and detonate a Molten Hammer Shock-Ring.'
      }
    ]
  },

  ronin: {
    id: 'ronin',
    heroName: 'KAZE-MARU',
    kitTitle: 'ADVENTURE KIT • RAIJIN IAIDO MASTER',
    role: '2.5D HIGH-SPEED BLADE • LINE-PIERCING TEMPEST',
    style: 'ADVENTURE KIT: GALE IAIDO CUTS • THUNDER DASH-THROUGH • THOUSAND JUDGMENTS',
    trait: 'ADV PASSIVE: LIGHTNING-FAST IAIDO RECOVERY & ELECTRIC WIND-WAVE ON 3RD CUT',
    skillName: 'RAIJIN THUNDER-THROUGH',
    ultName: 'JUDGMENT-CUT TEMPEST',
    trueUltName: 'AMAKAKERU STORMHORIZON',
    trueUltDesc:
      'Unleashes rapid spatial Judgment-Cut rifts across every monster in the active zone before splitting the heavens with a Raijin Dragon-Pillar!',
    attackRange: 215,
    autoCd: 0.36,
    autoDuration: 0.44,
    skillCooldownMax: 4.1,
    skillDuration: 0.86,
    ultDuration: 1.46,
    trueUltDuration: 2.35,
    crouchDuration: 0.64,
    dashDuration: 0.38,
    tags: {
      attack: 'IAIDO',
      dodge: 'SURIASHI',
      skill: 'RAIJIN',
      overdrive: 'TEMPEST',
      ultimate: 'AMAKAKR',
      crouch: 'PARRY',
      jump: 'SWALLOW'
    },
    skills: [
      {
        name: 'RAIJIN THUNDER-THROUGH',
        type: 'LINE PIERCE & SHEATH',
        desc: 'High-speed Iaido dash-slash safely inside active zone bounds, leaving delayed Lightning Dragon bursts on every foe crossed.'
      },
      {
        name: 'JUDGMENT-CUT TEMPEST',
        type: 'ZONE SPATIAL SLASHES',
        desc: 'Carves 5 rapid Spatial Judgment-Cut Rifts across all living monsters before a synchronized Noto Sheathe detonation!'
      },
      {
        name: 'SERENE MIND IAIDO PARRY',
        type: 'COUNTER SLASH',
        desc: 'Brief invulnerable Saya-glint stance that slices projectiles in half and fires a wide Electric Katana Crescent.'
      }
    ]
  },

  valkyrie: {
    id: 'valkyrie',
    heroName: 'FREYJA',
    kitTitle: 'ADVENTURE KIT • VALHALLA SKY-LANCER',
    role: '2.5D AERIAL LANCER • JAVELIN & DRAGONFIRE RAID',
    style: 'ADVENTURE KIT: SWEEPING GUNGNIR THRUSTS • SKY-LANCE CRATER • BIFROST DIVE',
    trait: 'ADV PASSIVE: WIDE 235PX SPEAR REACH + 3RD THRUST FIRES A WYVERN LANCE-WAVE',
    skillName: 'GUNGNIR SKY-JAVELIN',
    ultName: 'VALHALLA DRAGON RAID',
    trueUltName: 'TWILIGHT OF RAGNAROK',
    trueUltDesc:
      'Summons the Valhalla Winged Dragon Crest, locks Bifrost Einherjar Seals on all foes, and plunges down in a Gungnir Ragnarok Dragon-Pillar (+12% HP)!',
    attackRange: 235,
    autoCd: 0.40,
    autoDuration: 0.47,
    skillCooldownMax: 4.3,
    skillDuration: 0.90,
    ultDuration: 1.48,
    trueUltDuration: 2.40,
    crouchDuration: 0.66,
    dashDuration: 0.42,
    tags: {
      attack: 'LANCE',
      dodge: 'GLIDE',
      skill: 'JAVELIN',
      overdrive: 'RAID',
      ultimate: 'BIFROST',
      crouch: 'AEGIS',
      jump: 'SKY-DIVE'
    },
    skills: [
      {
        name: 'GUNGNIR SKY-JAVELIN',
        type: 'CLUSTER SPEAR CRATER',
        desc: 'Leaps on Crimson-Gold wings and hurls Gungnir into the monster pack, erupting a Dragonfire Obelisk Crater.'
      },
      {
        name: 'VALHALLA DRAGON RAID',
        type: '3-BEAT AERIAL SWEEP',
        desc: 'Soars across the active zone unleashing 3 rapid Dragonfire Crescent Slashes & Sky-Lance strikes across all lanes.'
      },
      {
        name: 'EINHERJAR WING GUARD',
        type: 'DEFLECT & VAULT',
        desc: 'Wraps in golden-crimson Valkyrie pinions to deflect blows, blast back nearby foes, and recharge Solar Spirit.'
      }
    ]
  },

  icemage: {
    id: 'icemage',
    heroName: 'LYRA',
    kitTitle: 'ADVENTURE KIT • BOREALIS WINTER EMPRESS',
    role: '2.5D CRYO SKATER • PERMAFROST FREEZE & SWORD RAIN',
    style: 'ADVENTURE KIT: 4-FORM SKATING CRYO-ARTS • GLACIAL JAWS • CORONATION GREATSWORD HAIL',
    trait: 'ADV PASSIVE: GRACEFUL 4-STAGE SKATING CRYO COMBO CHILLS & SHATTERS PACKS',
    skillName: 'GLACIAL ICEBERG JAWS',
    ultName: 'CORONATION ICE-CLAYMORES',
    trueUltName: 'ABSOLUTE ZERO BOREALIS',
    trueUltDesc:
      'Flash-freezes the entire 3D zone inside an Aurora Snowflake Mandala (1.4s Solid Freeze) and shatters a Colossal Diamond-Coffin Monolith!',
    attackRange: 465,
    autoCd: 0.40,
    autoDuration: 0.46,
    skillCooldownMax: 4.4,
    skillDuration: 0.90,
    ultDuration: 1.50,
    trueUltDuration: 2.42,
    crouchDuration: 0.66,
    dashDuration: 0.42,
    tags: {
      attack: 'CRYO',
      dodge: 'SKATE',
      skill: 'GLACIER',
      overdrive: 'SWORDS',
      ultimate: '0.00 K',
      crouch: 'PRISM',
      jump: 'AXEL'
    },
    skills: [
      {
        name: 'GLACIAL ICEBERG JAWS',
        type: '3D FREEZE CRUSH',
        desc: 'Erupts twin Jagged Glacier Walls on the monster cluster that chomp inward, dealing heavy Cryo splash & 0.8s Freeze.'
      },
      {
        name: 'CORONATION ICE-CLAYMORES',
        type: '7-SWORD HAIL',
        desc: 'Summons a Winter Sovereign Crest that rains 7 Giant Celestial Ice-Claymores across every monster in the zone.'
      },
      {
        name: 'DIAMOND DUST PRISM',
        type: 'CRYO MIRROR',
        desc: 'Spins a 6-Bladed Snowflake Halo shield that shatters incoming bolts, chills rushers, and glides clear.'
      }
    ]
  },

  android: {
    id: 'android',
    heroName: 'VEX-09',
    kitTitle: 'ADVENTURE KIT • PROJECT GUNG-09 CYBER-VALKYRIE',
    role: '2.5D MECHA SABER & FUNNELS • ORBITAL HYPER-BEAM',
    style: 'ADVENTURE KIT: PLASMA SABER + DRONES • EMP GRAVITY DOME • SATELLITE BUSTER',
    trait: 'ADV PASSIVE: AUTONOMOUS FIN-FUNNEL DRONES FIRE COVERING LASERS ON COMBO FINISHERS',
    skillName: 'EMP SINGULARITY DOME',
    ultName: 'ALL-RANGE FUNNEL CONVERGENCE',
    trueUltName: 'ORBITAL GUNG-09 BUSTER',
    trueUltDesc:
      'Locks an Orbital Hex Reticle onto the zone & Boss Core, firing All-Range Funnel Lasers before calling down the Project GUNG-09 Satellite Buster Column!',
    attackRange: 255,
    autoCd: 0.38,
    autoDuration: 0.45,
    skillCooldownMax: 4.2,
    skillDuration: 0.88,
    ultDuration: 1.48,
    trueUltDuration: 2.40,
    crouchDuration: 0.64,
    dashDuration: 0.38,
    tags: {
      attack: 'PLASMA',
      dodge: 'THRUST',
      skill: 'EMP',
      overdrive: 'FUNNELS',
      ultimate: 'ORBITAL',
      crouch: 'HEXSHLD',
      jump: 'BOOST'
    },
    skills: [
      {
        name: 'EMP SINGULARITY DOME',
        type: '3D VACUUM & STUN',
        desc: 'Deploys an EMP Gravity Spire & Cyber Singularity Core that pulls surrounding monsters across lanes into a 0.75s Stun.'
      },
      {
        name: 'ALL-RANGE FUNNEL CONVERGENCE',
        type: 'MULTI-VECTOR LASERS',
        desc: 'Deploys 6 Fin-Funnel Drone Pods around the zone, sweeping synchronized Cyan-Magenta Hyper-Beams through every monster.'
      },
      {
        name: 'HEX-MATRIX DEFLECTOR',
        type: 'OPTICAL COUNTER',
        desc: 'Projects a Hex-Glitch barrier that vaporizes projectiles, triggers a Cross-Slash pulse, and overclocks +22 Spirit.'
      }
    ]
  }
};

export class AdventureSkillSets {
  constructor(adventure) {
    this.adventure = adventure;
    this.vfxStamps = [];
    this.zones = [];
    this.delayedStrikes = [];
  }

  resetEffects() {
    this.vfxStamps.length = 0;
    this.zones.length = 0;
    this.delayedStrikes.length = 0;
  }

  getBounds(pad = 24) {
    const raw = this.adventure?.getActiveStageBounds?.() || { minX: 80, maxX: 4720 };
    const minX = raw.minX + pad;
    const maxX = Math.max(minX + 40, raw.maxX - pad);
    return { minX, maxX };
  }

  clampX(x, pad = 24) {
    const { minX, maxX } = this.getBounds(pad);
    return Math.max(minX, Math.min(maxX, x));
  }

  clampGy(gy) {
    const minGy = (this.adventure?.depthMinY || 442) + 10;
    const maxGy = (this.adventure?.depthMaxY || 680) - 10;
    return Math.max(minGy, Math.min(maxGy, Number.isFinite(gy) ? gy : 561));
  }

  getLivingMonsters() {
    return this.adventure?.getLivingMonsters?.() || [];
  }

  /**
   * Computes the densest monster cluster center `(x, groundY)` or Colossal Boss core impact spot!
   */
  getBestClusterPoint(player, fallbackDist = 220) {
    const living = this.getLivingMonsters();
    const pGy = this.clampGy(player.groundY || player.y || 561);
    if (!living.length) {
      return {
        x: this.clampX(player.x + player.facing * fallbackDist, 30),
        groundY: pGy,
        primary: null
      };
    }
    const colossal = living.find((m) => m.isColossalBoss);
    if (colossal && living.length === 1) {
      return {
        x: colossal.anchorX + 128,
        groundY: colossal.anchorGroundY || 561,
        primary: colossal
      };
    }
    let bestM = living[0];
    let bestScore = -Infinity;
    for (const m of living) {
      let score = m.isBoss ? 2.5 : m.isElite ? 1.6 : 1.0;
      for (const other of living) {
        if (other === m) continue;
        const d = Math.hypot(other.x - m.x, ((other.groundY || 561) - (m.groundY || 561)) * 1.4);
        if (d <= 220) score += 1.0;
      }
      const distToPlayer = Math.abs(m.x - player.x);
      score -= distToPlayer * 0.0012;
      if (score > bestScore) {
        bestScore = score;
        bestM = m;
      }
    }
    return {
      x: bestM.isColossalBoss ? bestM.anchorX + 128 : this.clampX(bestM.x, 20),
      groundY: this.clampGy(bestM.groundY || bestM.y || pGy),
      primary: bestM
    };
  }

  /**
   * Stamps a crisp 30fps `208x208` pixel-art cell sequence from `assets[heroId].vfx` (`row 0..7`)
   * with ZERO `ctx.rotate()` and subtle controlled bloom (`<= 0.18`).
   */
  spawnVfxStamp(opts) {
    if (!opts || !Number.isFinite(opts.x) || !Number.isFinite(opts.y)) return;
    if (this.vfxStamps.length > 48) this.vfxStamps.shift();
    this.vfxStamps.push({
      heroId: opts.heroId || 'mage',
      row: Math.max(0, Math.min(7, opts.row ?? 0)),
      startCol: Math.max(0, Math.min(29, opts.startCol ?? 0)),
      endCol: Math.max(0, Math.min(29, opts.endCol ?? 29)),
      x: opts.x,
      y: opts.y,
      groundY: Number.isFinite(opts.groundY) ? opts.groundY : opts.y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      scale: opts.scale || 1.0,
      scaleEnd: opts.scaleEnd ?? (opts.scale || 1.0),
      flip: opts.flip || 1,
      layer: opts.layer || 'mid', // 'floor' | 'mid' | 'fg'
      alpha: opts.alpha ?? 0.96,
      bloomAlpha: Math.min(0.20, opts.bloomAlpha ?? 0.14),
      squashY: opts.squashY || 1.0,
      life: 0,
      maxLife: Math.max(0.12, opts.maxLife || 0.52),
      delay: opts.delay || 0
    });
  }

  /**
   * Spawns a persistent 2.5D ground / orbital Adventure Zone (Sanctuary Halo, Gear Vortex, Bramble Trap, etc.)
   */
  spawnZone(opts) {
    if (this.zones.length > 10) this.zones.shift();
    this.zones.push({
      owner: opts.owner,
      heroId: opts.heroId || opts.owner?.heroId || 'mage',
      x: opts.x,
      groundY: this.clampGy(opts.groundY),
      radX: opts.radX || 155,
      radZ: opts.radZ || 76,
      color: opts.color || '#38bdf8',
      coreColor: opts.coreColor || '#fef08a',
      vfxRow: opts.vfxRow ?? 3,
      vfxScale: opts.vfxScale || 1.18,
      tickInterval: opts.tickInterval || 0.42,
      tickTimer: opts.fireImmediate ? (opts.tickInterval || 0.42) : 0.12,
      damage: opts.damage || 46,
      healPct: opts.healPct || 0,
      pullStrength: opts.pullStrength || 0,
      stunOnFirst: opts.stunOnFirst || 0,
      didFirstPulse: false,
      hasteMobility: Boolean(opts.hasteMobility),
      sfx: opts.sfx || null,
      life: 0,
      maxLife: opts.maxLife || 1.65
    });
  }

  /**
   * Schedules a delayed strike (e.g., Raining Spears / Meteors / Ice-Claymores / Raijin Sheathe Detonations)
   */
  scheduleStrike(delay, fn) {
    if (typeof fn !== 'function') return;
    this.delayedStrikes.push({ timer: Math.max(0, delay), fn });
  }

  /**
   * Vaporizes nearby hostile projectiles within `(radX, radY)` around `player` during Ward / Parry / EMP!
   */
  purgeHostileProjectiles(player, game, radX = 185, radY = 145) {
    if (!game?.vfx?.projectiles?.length) return 0;
    let purged = 0;
    for (let i = game.vfx.projectiles.length - 1; i >= 0; i--) {
      const p = game.vfx.projectiles[i];
      if (!p || p.owner === player || (p.owner && p.owner.team === player.team)) continue;
      if (Math.abs(p.x - player.x) <= radX && Math.abs(p.y - (player.y - 96)) <= radY) {
        game.vfx.spawnBurst?.(p.x, p.y, 8, player.primaryColor || '#fde047', 175, {
          upBias: 60,
          size: 5
        });
        game.vfx.projectiles.splice(i, 1);
        purged++;
      }
    }
    if (purged > 0) {
      this.adventure?.progression?.gainSpirit?.(12 * purged);
      game.vfx?.spawnDamageText?.(
        player.x,
        player.y - 186,
        0,
        false,
        '★ WARD PURGE! ★',
        player.primaryColor || '#fde047'
      );
    }
    return purged;
  }

  /**
   * 2.5D Elliptical Multi-Monster & Colossal-Boss Hit Resolver!
   * Hits every living monster within `(radX, radZ)` in 3D `(x, groundY)` space, plus seamlessly registers
   * against Left-Side Colossal Boss `BEHEMOTH MALPHAS` (`anchorX = 3865`) when the strike overlaps his cliff!
   */
  hitEllipticalAoE(player, cx, cGy, radX, radZ, rawDamage, opts = {}) {
    const game = player?.game || this.adventure?.game;
    const living = this.getLivingMonsters();
    let hitCount = 0;
    const bounds = this.getBounds(24);

    for (const m of living) {
      if (!m || m.isDead) continue;
      let inHit = false;
      if (m.isColossalBoss) {
        const bossCenterX = (m.anchorX || 3865) + 122;
        inHit = Math.abs(cx - bossCenterX) <= radX + 148;
      } else {
        const mGy = Number.isFinite(m.groundY) ? m.groundY : m.y;
        const nx = (m.x - cx) / Math.max(24, radX);
        const nz = (mGy - cGy) / Math.max(20, radZ);
        inHit = nx * nx + nz * nz <= 1.0;
      }
      if (!inHit) continue;

      hitCount++;

      // Optional 2.5D Vacuum Pull toward `(cx, cGy)` for non-colossal monsters
      if (opts.pull && !m.isColossalBoss) {
        const pullT = Math.min(0.68, Math.max(0.15, opts.pull));
        const nextX = m.x + (cx - m.x) * pullT;
        m.x = Math.max(bounds.minX, Math.min(bounds.maxX, nextX));
        const curGy = Number.isFinite(m.groundY) ? m.groundY : m.y;
        const dz = (cGy - curGy) * pullT;
        if (typeof m.shiftMonsterDepth === 'function') {
          m.shiftMonsterDepth(dz, game);
        } else {
          this.adventure?.shiftEntityDepth?.(m, dz);
        }
      }

      if (opts.timeStopDur > 0 && !m.isColossalBoss) {
        m.chronoTimeStopTimer = Math.max(m.chronoTimeStopTimer || 0, opts.timeStopDur);
        m._timeStopLockX = m.x;
        m._timeStopLockY = m.y;
      }

      if (opts.stunDur > 0) {
        if (!m.isColossalBoss) {
          m.stunTimer = Math.max(m.stunTimer || 0, opts.stunDur);
        } else if (opts.exposeBossCore && (m.vulnerableTimer || 0) <= 0 && opts.stunDur >= 1.0) {
          m.vulnerableTimer = Math.max(m.vulnerableTimer || 0, 1.35);
        }
      }

      const isCrit = Boolean(opts.isCrit || Math.random() < (opts.critChance ?? 0.22));
      const dmg = isCrit && !opts.isCrit ? Math.round(rawDamage * 1.28) : rawDamage;
      const knockDir = m.x >= player.x ? 1 : -1;
      const kx = (opts.knockX ?? 85) * knockDir * (opts.pull ? 0.15 : 1);
      const ky = opts.knockY ?? -45;
      m.takeDamage(dmg, player, isCrit, Math.abs(kx), ky);
    }

    if (hitCount > 0) {
      if (opts.leechPerHit > 0 && !player.isDead) {
        player.heal(Math.min(opts.maxLeech || 65, hitCount * opts.leechPerHit), opts.leechLabel || 'SOUL LEECH');
      }
      if (opts.hitStop && game?.renderer) {
        game.renderer.triggerHitStop(opts.hitStop);
      }
      if (opts.shake && game?.renderer) {
        game.renderer.triggerShake(opts.shake, opts.shakeDur || 0.18);
      }
      if (opts.sfx && game?.audio) {
        game.audio.play(opts.sfx, cx);
      }
    }
    return hitCount;
  }

  /**
   * Fires a 2.5D-aimed projectile from `player` toward `target` (or along `player.facing` + `vyOffset`)
   */
  fireAdvProjectile(player, game, target, opts = {}) {
    if (!game?.vfx) return;
    const sx = player.x + player.facing * (opts.muzzleX ?? 48);
    const sy = player.y - (opts.muzzleY ?? 104);
    const speed = opts.speed || 760;
    let vx = player.facing * speed;
    let vy = opts.vyOffset || 0;

    if (target && !target.isDead && opts.aimAtTarget !== false) {
      const tx = target.isColossalBoss ? (target.anchorX || 3865) + 110 : target.x;
      const ty = target.isColossalBoss ? target.y - 142 : target.y - 104;
      const dx = tx - sx;
      const dy = ty - sy;
      // Only lock onto target if in front of player (or within close pack range)
      if (dx * player.facing > -35) {
        const len = Math.hypot(dx, dy) || 1;
        vx = (dx / len) * speed;
        vy = (dy / len) * speed + (opts.vyOffset || 0);
      }
    }

    game.vfx.spawnProjectile({
      x: sx,
      y: sy,
      vx,
      vy,
      radius: opts.radius || 18,
      color: opts.color || player.primaryColor || '#fb923c',
      coreColor: opts.coreColor || '#fef08a',
      owner: player,
      damage: opts.damage || 78,
      type: opts.type || 'fireball',
      isMeteor: Boolean(opts.isMeteor),
      isUltimate: Boolean(opts.isUltimate),
      pierce: Boolean(opts.pierce)
    });
  }

  attachToFighter(player) {
    if (!player) return;
    const heroId = player.heroId || 'mage';
    const kit = ADVENTURE_HERO_KITS[heroId] || ADVENTURE_HERO_KITS.mage;
    this.resetEffects();

    if (!player._advSkillOrig) {
      const methodNames = [
        'updateAutoAttack',
        'updateSkill',
        'updateUltimate',
        'updateTrueUltimate',
        'startCrouch',
        'updateCrouch',
        'onStartDodge',
        'startJump',
        'updateDashOrDodge'
      ];
      const methods = {};
      for (const m of methodNames) {
        methods[m] = {
          hasOwn: Object.prototype.hasOwnProperty.call(player, m),
          fn: player[m]
        };
      }
      player._advSkillOrig = {
        methods,
        props: {
          skillName: player.skillName,
          ultName: player.ultName,
          trueUltName: player.trueUltName,
          hasTrueUltimate: player.hasTrueUltimate,
          attackRange: player.attackRange,
          autoInterval: player.autoInterval,
          autoDuration: player.autoDuration,
          skillMaxCooldown: player.skillMaxCooldown,
          skillDuration: player.skillDuration,
          ultDuration: player.ultDuration,
          trueUltDuration: player.trueUltDuration,
          crouchDuration: player.crouchDuration,
          dashDuration: player.dashDuration,
          dodgeMaxCooldown: player.dodgeMaxCooldown
        }
      };
    }

    player._advKitActive = true;
    player._advKitId = kit.id;
    player._advComboStep = 0;
    player._advComboResetTimer = 0;
    player._advBeatMask = 0;

    player.skillName = kit.skillName;
    player.ultName = kit.ultName;
    player.trueUltName = kit.trueUltName;
    player.hasTrueUltimate = true;
    player.attackRange = kit.attackRange;
    player.autoInterval = kit.autoCd;
    player.autoDuration = kit.autoDuration;
    player.skillMaxCooldown = kit.skillCooldownMax;
    player.skillDuration = kit.skillDuration;
    player.ultDuration = kit.ultDuration;
    player.trueUltDuration = kit.trueUltDuration;
    player.crouchDuration = kit.crouchDuration;
    player.dashDuration = kit.dashDuration;

    const self = this;

    // =========================================================================
    // 1. SHARED ADVENTURE DODGE & AERIAL VAULT PLUNGE (`Row 6` & `Row 8`)
    // =========================================================================
    player.onStartDodge = function (_enemy, game, dir) {
      const d = dir || this.facing || 1;
      this.dashDir = d;
      this.dashDuration = kit.dashDuration;
      this.isInvulnerable = true;
      this.isFlipVault = false;
      this._advIsJumpPlunge = false;
      this._advBeatMask = 0;
      this._advDashStartX = this.x;
      this._advDashGoalX = self.clampX(this.x + d * (kit.attackRange >= 320 ? 185 : 165), 24);
      if (game?.audio) game.audio.play('dash_whoosh', this.x);
      game?.vfx?.spawnShockwave?.(this.x, this.groundY - 6, 72, this.primaryColor, 0.24, true);
      self.spawnVfxStamp({
        heroId,
        row: 0,
        startCol: 0,
        endCol: 14,
        x: this.x,
        y: this.y - 88,
        groundY: this.groundY,
        flip: d,
        scale: 0.78,
        maxLife: 0.28,
        bloomAlpha: 0.12
      });
    };

    player.startJump = function (_enemy, game, dir) {
      const d = dir || this.facing || 1;
      this.facing = d;
      this.dashDir = d;
      this.dashDuration = 0.56;
      this.setState('JUMP');
      this.isInvulnerable = true;
      this.isFlipVault = true;
      this._advIsJumpPlunge = true;
      this._advBeatMask = 0;
      this._advDashStartX = this.x;
      this._advDashGoalX = self.clampX(this.x + d * 215, 24);
      if (game?.audio) game.audio.play('dash_whoosh', this.x);
      game?.vfx?.spawnShockwave?.(this.x, this.groundY - 4, 84, this.primaryColor, 0.28, true);
    };

    player.updateDashOrDodge = function (_dt, _enemy, game) {
      const dur = this.dashDuration || 0.44;
      const u = Math.max(0, Math.min(1, this.stateTimer / dur));
      const ease = 1 - Math.pow(1 - u, 2);
      if (Number.isFinite(this._advDashStartX) && Number.isFinite(this._advDashGoalX)) {
        this.x = self.clampX(
          this._advDashStartX + (this._advDashGoalX - this._advDashStartX) * ease,
          24
        );
      }
      if (this.state === 'JUMP' || this._advIsJumpPlunge) {
        const arc = Math.sin(u * Math.PI);
        this.y = this.groundY - arc * 112;
        if (u >= 0.78 && !(this._advBeatMask & 1)) {
          this._advBeatMask |= 1;
          const impX = this.x + this.facing * 42;
          game?.vfx?.spawnShockwave?.(impX, this.groundY - 4, 118, this.primaryColor, 0.30, true);
          self.spawnVfxStamp({
            heroId,
            row: 4,
            startCol: 6,
            endCol: 24,
            x: impX,
            y: this.groundY - 82,
            groundY: this.groundY,
            flip: this.facing,
            scale: 0.92,
            maxLife: 0.32
          });
          self.hitEllipticalAoE(this, impX, this.groundY, 138, 72, 74, {
            knockX: 95,
            knockY: -70,
            sfx: 'heavy_cleave'
          });
        }
      }
      if (this.stateTimer >= dur) {
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.isInvulnerable = false;
        this.isFlipVault = false;
        this._advIsJumpPlunge = false;
        this.setState('IDLE');
      }
    };

    // =========================================================================
    // 2. SHARED ADVENTURE TACTICAL WARD / COUNTER (`CROUCH`, `Row 7`)
    // =========================================================================
    player.startCrouch = function (enemy, game) {
      this.crouchDuration = kit.crouchDuration;
      this.setState('CROUCH');
      this.isCrouching = true;
      this.isDeflecting = true;
      this.isInvulnerable = true;
      this._advBeatMask = 0;
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      self.adventure?.progression?.gainSpirit?.(16);
      if (game?.audio) game.audio.play('reflect', this.x);
      game?.vfx?.spawnSpecialCastAura?.(
        this,
        kit.tags.crouch || 'WARD',
        '✦ ADVENTURE WARD ✦',
        this.theme || 'steel',
        false
      );
      self.spawnVfxStamp({
        heroId,
        row: 3,
        startCol: 0,
        endCol: 26,
        x: this.x,
        y: this.y - 94,
        groundY: this.groundY,
        flip: this.facing,
        scale: 1.08,
        layer: 'fg',
        maxLife: 0.52,
        bloomAlpha: 0.16
      });
      // Sylvara drops a Bramble Snare Sigil & Chronos rewinds +6% HP!
      if (heroId === 'archer') {
        self.spawnZone({
          owner: this,
          heroId: 'archer',
          x: this.x + this.facing * 52,
          groundY: this.groundY,
          radX: 138,
          radZ: 74,
          color: '#10b981',
          coreColor: '#fef08a',
          vfxRow: 2,
          vfxScale: 1.12,
          tickInterval: 0.45,
          damage: 52,
          stunOnFirst: 0.65,
          maxLife: 1.55,
          fireImmediate: true
        });
      } else if (heroId === 'chronomancer') {
        this.heal(Math.round(this.maxHp * 0.06), 'TIME REWIND');
      } else if (heroId === 'priestess' || heroId === 'warrior') {
        this.heal(Math.round(this.maxHp * 0.05), 'SANCTUM AEGIS');
      }
    };

    player.updateCrouch = function (dt, _enemy, game) {
      const dur = this.crouchDuration || 0.66;
      const t = this.stateTimer;
      self.purgeHostileProjectiles(this, game, 195, 150);

      if (
        (heroId === 'archer' || heroId === 'icemage' || heroId === 'mage') &&
        t < dur * 0.55
      ) {
        this.x = self.clampX(this.x - this.facing * 145 * dt, 24);
      }

      if (t >= 0.18 && !(this._advBeatMask & 1)) {
        this._advBeatMask |= 1;
        game?.vfx?.spawnShockwave?.(this.x, this.groundY - 8, 150, this.primaryColor, 0.34, true);
        self.hitEllipticalAoE(this, this.x + this.facing * 26, this.groundY, 168, 86, 68, {
          knockX: 145,
          knockY: -65,
          stunDur: heroId === 'icemage' || heroId === 'android' ? 0.55 : 0.3,
          sfx: heroId === 'icemage' ? 'ice_shatter' : 'clang'
        });
        if (heroId === 'ronin' || heroId === 'chronomancer' || heroId === 'warrior') {
          self.fireAdvProjectile(this, game, null, {
            damage: 74,
            speed: 780,
            radius: 22,
            type: heroId === 'chronomancer' ? 'clock_gear' : 'blade_wave',
            pierce: true
          });
        }
      }

      if (t >= dur) {
        this.isCrouching = false;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
    };

    // =========================================================================
    // 3. BESPOKE 2.5D BASIC ATTACK COMBO (`AUTO_ATTACK`, `Row 2`: `60..89`)
    // =========================================================================
    player.updateAutoAttack = function (dt, enemy, game) {
      const dur = this.autoDuration || 0.48;
      const t = this.stateTimer;
      if (t <= dt * 1.1) {
        this._advBeatMask = 0;
        const maxSteps = heroId === 'icemage' ? 4 : 3;
        if ((this._advComboResetTimer || 0) <= 0) {
          this._advComboStep = 0;
        }
        this._advActiveStep = this._advComboStep % maxSteps;
        this._advComboStep = (this._advComboStep + 1) % maxSteps;
        this._advComboResetTimer = 1.45;
      }

      const stepIdx = this._advActiveStep || 0;
      const totalSteps = heroId === 'icemage' ? 4 : 3;
      const segLen = Math.floor(30 / totalSteps);
      const segStart = stepIdx * segLen;
      const segFrames = stepIdx === totalSteps - 1 ? 30 - segStart : segLen;
      const subFrame = Math.min(segFrames - 1, Math.max(0, Math.floor((t / dur) * segFrames)));
      this.trueUltFrameOverride = 60 + segStart + subFrame;

      const isFinisher = stepIdx === totalSteps - 1;
      const isRanged = kit.attackRange >= 320;

      if (heroId === 'titan' || heroId === 'warrior') {
        this.unstoppablePoise = t < dur * 0.78;
      }

      // Crisp forward melee micro-step so Beat-'Em-Up melee combos naturally close gaps inside bounds
      if (!isRanged && t >= 0.05 && t <= 0.24) {
        const lungeSpd = heroId === 'ronin' || heroId === 'valkyrie' ? 175 : 135;
        this.x = self.clampX(this.x + this.facing * lungeSpd * dt, 22);
      }

      if (t >= dur * 0.34 && !this.didActionFrame) {
        this.didActionFrame = true;
        self.executeHeroBasicStrike(this, enemy, game, heroId, stepIdx, isFinisher);
      }

      if (t >= dur) {
        this.unstoppablePoise = false;
        this.trueUltFrameOverride = null;
        this.vx = 0;
        this.setState('IDLE');
      }
    };

    // =========================================================================
    // 4. BESPOKE 2.5D ADVENTURE SKILL (`SKILL`, `Row 3`: `90..119`)
    // =========================================================================
    player.updateSkill = function (dt, enemy, game) {
      const dur = this.skillDuration || 0.90;
      const t = this.stateTimer;
      if (t <= dt * 1.1) {
        this._advBeatMask = 0;
        this._advSkillStartX = this.x;
        this._advSkillCluster = self.getBestClusterPoint(this, 210);
        game?.vfx?.spawnSpecialCastAura?.(
          this,
          kit.skillName,
          '✦ ADVENTURE SKILL ✦',
          this.theme || 'steel',
          false
        );
      }
      self.updateHeroAdventureSkill(this, dt, t, dur, enemy, game, heroId);
      if (this.state === 'SKILL' && t >= dur) {
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.unstoppablePoise = false;
        this.trueUltFrameOverride = null;
        this.setState('IDLE');
      }
    };

    // =========================================================================
    // 5. BESPOKE 2.5D OVERDRIVE ULTIMATE (`ULTIMATE`, `Row 4`: `120..149`)
    // =========================================================================
    player.updateUltimate = function (dt, enemy, game) {
      const dur = this.ultDuration || 1.50;
      const t = this.stateTimer;
      if (t <= dt * 1.1) {
        this._advBeatMask = 0;
        this._advUltStartX = this.x;
        this._advUltCluster = self.getBestClusterPoint(this, 240);
        this.isInvulnerable = true;
      }
      self.updateHeroAdventureOverdrive(this, dt, t, dur, enemy, game, heroId);
      if (this.state === 'ULTIMATE' && t >= dur) {
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.isInvulnerable = false;
        this.unstoppablePoise = false;
        this.trueUltFrameOverride = null;
        this.setState('IDLE');
      }
    };

    // =========================================================================
    // 6. BESPOKE 2.5D SUPREME CATACLYSM (`TRUE_ULTIMATE`, `Row 4` + `Row 8`)
    // =========================================================================
    player.updateTrueUltimate = function (dt, enemy, game) {
      const dur = this.trueUltDuration || 2.40;
      const t = this.stateTimer;
      if (t <= dt * 1.1) {
        this._advBeatMask = 0;
        this._advTrueStartX = this.x;
        this._advTrueCluster = self.getBestClusterPoint(this, 260);
        this.isInvulnerable = true;
        if (game?.renderer) {
          game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, 0.55);
        }
      }
      self.updateHeroAdventureCataclysm(this, dt, t, dur, enemy, game, heroId);
      if (this.state === 'TRUE_ULTIMATE' && t >= dur) {
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.spriteScale = 1.0;
        this.isInvulnerable = false;
        this.unstoppablePoise = false;
        this.trueUltFrameOverride = null;
        if (game?.renderer) {
          game.renderer.trueUltStageAlpha = 0;
          game.renderer.trueUltStageOverride = null;
        }
        this.setState('IDLE');
      }
    };
  }

  detachFromFighter(player) {
    this.resetEffects();
    if (!player || !player._advSkillOrig) return;
    const { methods, props } = player._advSkillOrig;
    for (const [m, info] of Object.entries(methods)) {
      if (info.hasOwn) {
        player[m] = info.fn;
      } else {
        delete player[m];
      }
    }
    Object.assign(player, props);
    player.trueUltFrameOverride = null;
    player._overrideFrameIdx = null;
    player.isInvulnerable = false;
    player.isDeflecting = false;
    player.isCrouching = false;
    player.unstoppablePoise = false;
    player.spriteScale = 1.0;
    delete player._advSkillOrig;
    delete player._advKitActive;
    delete player._advKitId;
    delete player._advComboStep;
    delete player._advComboResetTimer;
    delete player._advBeatMask;
  }

  // ===========================================================================
  // PER-HERO 2.5D BASIC ATTACK COMBO EXECUTION (ALL 11 CHAMPIONS)
  // ===========================================================================
  executeHeroBasicStrike(player, enemy, game, heroId, stepIdx, isFinisher) {
    const f = player.facing || 1;
    const gy = player.groundY || player.y;

    switch (heroId) {
      case 'warrior': {
        const cx = player.x + f * 96;
        selfSlash(this, player, game, 'warrior', 0, cx, gy, isFinisher ? 1.18 : 0.96);
        this.hitEllipticalAoE(player, cx, gy, isFinisher ? 165 : 138, 76, isFinisher ? 108 : 84, {
          knockX: isFinisher ? 125 : 65,
          sfx: isFinisher ? 'heavy_cleave' : 'slash',
          hitStop: isFinisher ? 0.04 : 0
        });
        if (isFinisher) {
          this.fireAdvProjectile(player, game, enemy, {
            damage: 86,
            speed: 740,
            radius: 22,
            color: '#38bdf8',
            coreColor: '#fef08a',
            type: 'blade_wave',
            pierce: true
          });
        }
        break;
      }

      case 'mage': {
        if (game?.audio) game.audio.play('fireball', player.x);
        this.spawnVfxStamp({
          heroId: 'mage',
          row: 0,
          startCol: 0,
          endCol: 18,
          x: player.x + f * 52,
          y: player.y - 106,
          groundY: gy,
          flip: f,
          scale: 0.78,
          maxLife: 0.26
        });
        this.fireAdvProjectile(player, game, enemy, {
          damage: isFinisher ? 104 : 82,
          speed: 770,
          radius: isFinisher ? 22 : 16,
          color: '#fb923c',
          coreColor: '#fef08a',
          type: 'fireball',
          pierce: isFinisher
        });
        if (stepIdx === 1) {
          this.fireAdvProjectile(player, game, enemy, {
            damage: 54,
            speed: 740,
            vyOffset: -65,
            radius: 13,
            color: '#facc15',
            type: 'fireball'
          });
        } else if (isFinisher) {
          const cluster = this.getBestClusterPoint(player, 260);
          game?.vfx?.spawnShockwave?.(cluster.x, cluster.groundY - 6, 125, '#fb923c', 0.30, true);
          this.hitEllipticalAoE(player, cluster.x, cluster.groundY, 138, 74, 68, {
            sfx: 'fire_hit'
          });
        }
        break;
      }

      case 'archer': {
        if (game?.audio) game.audio.play('arrow_shoot', player.x);
        const angles = isFinisher ? [-85, 0, 85] : stepIdx === 1 ? [-38, 38] : [0];
        for (const vyOff of angles) {
          this.fireAdvProjectile(player, game, enemy, {
            damage: isFinisher ? 68 : stepIdx === 1 ? 62 : 84,
            speed: 860,
            vyOffset: vyOff,
            radius: 15,
            color: '#34d399',
            coreColor: '#fef08a',
            type: 'arrow',
            pierce: stepIdx === 1
          });
        }
        this.spawnVfxStamp({
          heroId: 'archer',
          row: 0,
          startCol: 0,
          endCol: 16,
          x: player.x + f * 58,
          y: player.y - 102,
          groundY: gy,
          flip: f,
          scale: 0.80,
          maxLife: 0.24
        });
        break;
      }

      case 'priestess': {
        if (game?.audio) game.audio.play('skill_cast', player.x);
        this.fireAdvProjectile(player, game, enemy, {
          damage: isFinisher ? 96 : 80,
          speed: 760,
          radius: 18,
          color: '#fde047',
          coreColor: '#ffffff',
          type: 'holy_light',
          pierce: isFinisher
        });
        if (isFinisher) {
          const cl = this.getBestClusterPoint(player, 250);
          this.spawnVfxStamp({
            heroId: 'priestess',
            row: 4,
            startCol: 4,
            endCol: 24,
            x: cl.x,
            y: cl.groundY - 88,
            groundY: cl.groundY,
            flip: f,
            scale: 1.02,
            maxLife: 0.34
          });
          this.hitEllipticalAoE(player, cl.x, cl.groundY, 145, 78, 72, { sfx: 'holy_hit' });
        }
        break;
      }

      case 'reaper': {
        const cx = player.x + f * 102;
        selfSlash(this, player, game, 'reaper', 4, cx, gy, isFinisher ? 1.24 : 1.02);
        this.hitEllipticalAoE(player, cx, gy, isFinisher ? 178 : 150, 84, isFinisher ? 110 : 86, {
          knockX: isFinisher ? 115 : 55,
          leechPerHit: isFinisher ? 14 : 0,
          maxLeech: 48,
          sfx: 'scythe_reap',
          hitStop: isFinisher ? 0.04 : 0
        });
        break;
      }

      case 'chronomancer': {
        const cx = player.x + f * 98;
        selfSlash(this, player, game, 'chronomancer', stepIdx === 1 ? 5 : 0, cx, gy, 1.06);
        this.hitEllipticalAoE(player, cx, gy, 155, 76, isFinisher ? 102 : 82, {
          sfx: 'chrono_hit'
        });
        if (isFinisher) {
          this.fireAdvProjectile(player, game, enemy, {
            damage: 80,
            speed: 800,
            radius: 20,
            color: '#2dd4bf',
            coreColor: '#facc15',
            type: 'clock_gear',
            pierce: true
          });
        }
        break;
      }

      case 'titan': {
        const cx = player.x + f * 94;
        this.spawnVfxStamp({
          heroId: 'titan',
          row: isFinisher ? 0 : 4,
          startCol: 2,
          endCol: 24,
          x: cx,
          y: gy - 78,
          groundY: gy,
          flip: f,
          scale: isFinisher ? 1.18 : 0.96,
          maxLife: 0.34
        });
        game?.vfx?.spawnShockwave?.(cx, gy - 6, isFinisher ? 145 : 95, '#f59e0b', 0.28, true);
        this.hitEllipticalAoE(player, cx, gy, isFinisher ? 172 : 144, 82, isFinisher ? 124 : 94, {
          knockX: isFinisher ? 155 : 85,
          stunDur: isFinisher ? 0.35 : 0,
          sfx: 'thunder_slam',
          shake: isFinisher ? 8 : 4,
          hitStop: isFinisher ? 0.045 : 0
        });
        if (isFinisher) {
          this.fireAdvProjectile(player, game, enemy, {
            damage: 84,
            speed: 680,
            radius: 24,
            color: '#f59e0b',
            coreColor: '#34d399',
            type: 'forge_wave',
            pierce: true
          });
        }
        break;
      }

      case 'ronin': {
        const cx = player.x + f * 98;
        selfSlash(this, player, game, 'ronin', 0, cx, gy, isFinisher ? 1.15 : 0.94);
        this.hitEllipticalAoE(player, cx, gy, 152, 74, isFinisher ? 104 : 80, {
          knockX: 60,
          sfx: 'slash'
        });
        if (isFinisher) {
          this.fireAdvProjectile(player, game, enemy, {
            damage: 82,
            speed: 850,
            radius: 20,
            color: '#818cf8',
            coreColor: '#38bdf8',
            type: 'storm_wave',
            pierce: true
          });
        }
        break;
      }

      case 'valkyrie': {
        const cx = player.x + f * 108;
        selfSlash(this, player, game, 'valkyrie', stepIdx === 1 ? 4 : 0, cx, gy, 1.08);
        this.hitEllipticalAoE(player, cx, gy, 168, 78, isFinisher ? 108 : 84, {
          knockX: isFinisher ? 120 : 65,
          sfx: 'heavy_cleave'
        });
        if (isFinisher) {
          this.fireAdvProjectile(player, game, enemy, {
            damage: 82,
            speed: 810,
            radius: 20,
            color: '#f43f5e',
            coreColor: '#fbbf24',
            type: 'dragon_lance',
            pierce: true
          });
        }
        break;
      }

      case 'icemage': {
        if (game?.audio) game.audio.play('ice_shatter', player.x);
        // Lyra's 4-Variant Figure-Skating Cryo Combo!
        if (stepIdx === 0 || stepIdx === 1) {
          const spread = stepIdx === 1 ? [-42, 42] : [0];
          for (const vyOff of spread) {
            this.fireAdvProjectile(player, game, enemy, {
              damage: stepIdx === 1 ? 62 : 84,
              speed: 810,
              vyOffset: vyOff,
              radius: 16,
              color: '#67e8f9',
              coreColor: '#ffffff',
              type: 'cryo_shard',
              pierce: stepIdx === 1
            });
          }
          this.spawnVfxStamp({
            heroId: 'icemage',
            row: stepIdx === 1 ? 1 : 0,
            startCol: 0,
            endCol: 18,
            x: player.x + f * 58,
            y: player.y - 102,
            groundY: gy,
            flip: f,
            scale: 0.84,
            maxLife: 0.26
          });
        } else if (stepIdx === 2) {
          const cl = this.getBestClusterPoint(player, 235);
          this.spawnVfxStamp({
            heroId: 'icemage',
            row: 2,
            startCol: 2,
            endCol: 22,
            x: cl.x,
            y: cl.groundY - 86,
            groundY: cl.groundY,
            flip: f,
            scale: 1.0,
            maxLife: 0.36
          });
          this.hitEllipticalAoE(player, cl.x, cl.groundY, 138, 74, 88, {
            stunDur: 0.35,
            sfx: 'ice_shatter'
          });
        } else {
          const cl = this.getBestClusterPoint(player, 260);
          game?.vfx?.spawnCrystalSpike?.({
            x: cl.x,
            groundY: cl.groundY,
            height: 145,
            width: 42,
            color: '#38bdf8',
            coreColor: '#e0f2fe',
            owner: player,
            target: cl.primary,
            damage: 42
          });
          this.fireAdvProjectile(player, game, enemy, {
            damage: 88,
            speed: 840,
            radius: 20,
            color: '#67e8f9',
            coreColor: '#e879f9',
            type: 'cryo_shard',
            pierce: true
          });
        }
        break;
      }

      case 'android': {
        const cx = player.x + f * 98;
        selfSlash(this, player, game, 'android', stepIdx === 1 ? 4 : 0, cx, gy, 1.04);
        this.hitEllipticalAoE(player, cx, gy, 156, 76, isFinisher ? 98 : 80, {
          sfx: 'slash'
        });
        // Autonomous Fin-Funnel Drone cover laser!
        if (stepIdx >= 1) {
          this.spawnVfxStamp({
            heroId: 'android',
            row: 1,
            startCol: 0,
            endCol: 20,
            x: player.x - f * 36,
            y: player.y - 148,
            groundY: gy,
            flip: f,
            scale: 0.78,
            maxLife: 0.32
          });
          this.fireAdvProjectile(player, game, enemy, {
            muzzleX: -24,
            muzzleY: 146,
            damage: isFinisher ? 72 : 52,
            speed: 900,
            radius: 14,
            color: '#00f0ff',
            coreColor: '#ff2e93',
            type: 'cyber_disc',
            pierce: isFinisher
          });
        }
        break;
      }

      default:
        break;
    }
  }

  // ===========================================================================
  // PER-HERO 2.5D ADVENTURE SKILL (`SKILL`, `Row 3`)
  // ===========================================================================
  updateHeroAdventureSkill(player, dt, t, _dur, enemy, game, heroId) {
    const f = player.facing || 1;
    const gy = player.groundY || player.y;
    const cl = player._advSkillCluster || { x: player.x + f * 200, groundY: gy };

    switch (heroId) {
      case 'warrior': {
        // CYCLONE VANGUARD: Advancing 360° Runeblade Whirlwind pulling multi-lane foes + Frost Shatter!
        this.unstoppableOn(player);
        if (t >= 0.08 && t <= 0.66) {
          player.x = this.clampX(player.x + f * 240 * dt, 26);
        }
        if (t >= 0.18 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          selfSlash(this, player, game, 'warrior', 4, player.x + f * 36, gy, 1.22);
          this.hitEllipticalAoE(player, player.x + f * 36, gy, 195, 108, 76, {
            pull: 0.42,
            sfx: 'slash'
          });
        }
        if (t >= 0.48 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          const sx = player.x + f * 72;
          this.spawnVfxStamp({
            heroId: 'warrior',
            row: 2,
            startCol: 0,
            endCol: 26,
            x: sx,
            y: gy - 92,
            groundY: gy,
            flip: f,
            scale: 1.24,
            maxLife: 0.48
          });
          game?.vfx?.spawnShockwave?.(sx, gy - 6, 175, '#38bdf8', 0.36, true);
          this.hitEllipticalAoE(player, sx, gy, 195, 104, 122, {
            pull: 0.25,
            stunDur: 0.55,
            knockY: -110,
            sfx: 'heavy_cleave',
            shake: 9
          });
        }
        break;
      }

      case 'mage': {
        // MAGMA PILLAR SURGE: 3 Marching Molten Hellfire Pillars across 3D lanes!
        const beats = [
          { bit: 1, at: 0.16, dx: 135, dz: -46 },
          { bit: 2, at: 0.34, dx: 245, dz: 0 },
          { bit: 4, at: 0.52, dx: 355, dz: 46 }
        ];
        for (const b of beats) {
          if (t >= b.bit * 0 + b.at && !(player._advBeatMask & b.bit)) {
            player._advBeatMask |= b.bit;
            const px =
              b.bit === 2 && enemy && !enemy.isDead
                ? enemy.isColossalBoss
                  ? enemy.anchorX + 122
                  : this.clampX(enemy.x, 20)
                : this.clampX(player.x + f * b.dx, 20);
            const pGy =
              b.bit === 2 && enemy && !enemy.isDead
                ? this.clampGy(enemy.groundY || gy)
                : this.clampGy(gy + b.dz);
            this.spawnVfxStamp({
              heroId: 'mage',
              row: 1,
              startCol: 0,
              endCol: 28,
              x: px,
              y: pGy - 96,
              groundY: pGy,
              flip: f,
              scale: 1.22,
              maxLife: 0.56
            });
            game?.vfx?.spawnShockwave?.(px, pGy - 6, 138, '#fb923c', 0.34, true);
            game?.vfx?.spawnDecal?.(px, 92, 'fissure', '#fb923c', 4.2, pGy);
            this.hitEllipticalAoE(player, px, pGy, 148, 86, 86, {
              knockY: -115,
              sfx: 'fire_hit',
              shake: 6
            });
          }
        }
        break;
      }

      case 'archer': {
        // STARWOOD ARROW RAIN: 7 Emerald Sky-Arrows raining over the monster pack + Root!
        if (t < 0.28) {
          player.x = this.clampX(player.x - f * 120 * dt, 24);
        }
        if (t >= 0.24 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          if (game?.audio) game.audio.play('arrow_shoot', player.x);
          this.spawnZone({
            owner: player,
            heroId: 'archer',
            x: cl.x,
            groundY: cl.groundY,
            radX: 185,
            radZ: 96,
            color: '#10b981',
            coreColor: '#fef08a',
            vfxRow: 2,
            vfxScale: 1.26,
            tickInterval: 0.34,
            damage: 64,
            stunOnFirst: 0.65,
            maxLife: 1.15,
            fireImmediate: true
          });
          for (let i = 0; i < 6; i++) {
            const ox = cl.x + (i - 2.5) * 46;
            const oGy = this.clampGy(cl.groundY + ((i % 3) - 1) * 38);
            game?.vfx?.spawnSkyStrike?.({
              x: ox,
              targetX: ox,
              groundY: oGy,
              vy: 1280,
              type: 'starfall_arrow',
              color: '#34d399',
              coreColor: '#fef08a',
              owner: player,
              damage: 30,
              delay: i * 0.055
            });
          }
        }
        break;
      }

      case 'priestess': {
        // CATHEDRAL SANCTUARY: Golden Rose Healing & Holy Smite Zone!
        if (t >= 0.24 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          player.heal(Math.round(player.maxHp * 0.10), 'SANCTUARY GRACE');
          const zx = enemy && !enemy.isDead ? cl.x : this.clampX(player.x + f * 130, 24);
          const zGy = enemy && !enemy.isDead ? cl.groundY : gy;
          this.spawnVfxStamp({
            heroId: 'priestess',
            row: 2,
            startCol: 0,
            endCol: 27,
            x: zx,
            y: zGy - 96,
            groundY: zGy,
            flip: f,
            scale: 1.26,
            maxLife: 0.62
          });
          this.spawnZone({
            owner: player,
            heroId: 'priestess',
            x: zx,
            groundY: zGy,
            radX: 190,
            radZ: 102,
            color: '#facc15',
            coreColor: '#fef9c3',
            vfxRow: 3,
            vfxScale: 1.32,
            tickInterval: 0.42,
            damage: 68,
            sfx: 'holy_hit',
            maxLife: 1.45,
            fireImmediate: true
          });
        }
        break;
      }

      case 'reaper': {
        // ABYSSAL CHAIN GATHER: Hooks multi-lane monsters inward + Heavy Guillotine Reap!
        if (t >= 0.20 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          const hookX = player.x + f * 165;
          this.spawnVfxStamp({
            heroId: 'reaper',
            row: 6,
            startCol: 0,
            endCol: 22,
            x: hookX,
            y: gy - 84,
            groundY: gy,
            flip: f,
            scale: 1.25,
            maxLife: 0.42
          });
          this.hitEllipticalAoE(player, hookX, gy, 240, 125, 68, {
            pull: 0.58,
            stunDur: 0.45,
            sfx: 'soul_drain'
          });
        }
        if (t >= 0.52 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          const rx = player.x + f * 112;
          this.spawnVfxStamp({
            heroId: 'reaper',
            row: 7,
            startCol: 4,
            endCol: 26,
            x: rx,
            y: gy - 92,
            groundY: gy,
            flip: f,
            scale: 1.26,
            maxLife: 0.44
          });
          this.hitEllipticalAoE(player, rx, gy, 195, 102, 128, {
            leechPerHit: 16,
            maxLeech: 56,
            knockY: -105,
            sfx: 'scythe_reap',
            shake: 9
          });
        }
        break;
      }

      case 'chronomancer': {
        // CHRONO GEAR ANOMALY: Spinning Astrolabe Vortex + Mobility Cooldown Shave!
        if (t >= 0.22 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          player.dodgeCooldown = Math.max(0, (player.dodgeCooldown || 0) - 1.1);
          if (this.adventure) {
            this.adventure.jumpCd = Math.max(0, (this.adventure.jumpCd || 0) - 1.1);
          }
          this.spawnVfxStamp({
            heroId: 'chronomancer',
            row: 2,
            startCol: 0,
            endCol: 26,
            x: cl.x,
            y: cl.groundY - 94,
            groundY: cl.groundY,
            flip: f,
            scale: 1.22,
            maxLife: 0.55
          });
          this.spawnZone({
            owner: player,
            heroId: 'chronomancer',
            x: cl.x,
            groundY: cl.groundY,
            radX: 185,
            radZ: 98,
            color: '#2dd4bf',
            coreColor: '#facc15',
            vfxRow: 1,
            vfxScale: 1.28,
            tickInterval: 0.36,
            damage: 62,
            pullStrength: 0.28,
            stunOnFirst: 0.45,
            sfx: 'clock_gear',
            maxLife: 1.50,
            fireImmediate: true
          });
        }
        break;
      }

      case 'titan': {
        // CRUCIBLE ANVIL CRASH: Poise Bull-Charge + 3-Lane Magma-Jade Pillar Eruption!
        this.unstoppableOn(player);
        if (t >= 0.08 && t <= 0.42) {
          player.x = this.clampX(player.x + f * 265 * dt, 26);
        }
        if (t >= 0.42 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          const ax = player.x + f * 92;
          this.spawnVfxStamp({
            heroId: 'titan',
            row: 1,
            startCol: 0,
            endCol: 26,
            x: ax,
            y: gy - 94,
            groundY: gy,
            flip: f,
            scale: 1.28,
            maxLife: 0.50
          });
          for (const dz of [-48, 0, 48]) {
            const pGy = this.clampGy(gy + dz);
            this.spawnVfxStamp({
              heroId: 'titan',
              row: 2,
              startCol: 2,
              endCol: 26,
              x: ax + (dz === 0 ? f * 48 : 0),
              y: pGy - 88,
              groundY: pGy,
              flip: f,
              scale: 1.06,
              maxLife: 0.46
            });
          }
          game?.vfx?.spawnShockwave?.(ax, gy - 6, 190, '#f59e0b', 0.38, true);
          this.hitEllipticalAoE(player, ax + f * 20, gy, 205, 118, 198, {
            stunDur: 0.70,
            knockX: 150,
            knockY: -120,
            sfx: 'thunder_slam',
            shake: 12,
            hitStop: 0.05
          });
        }
        break;
      }

      case 'ronin': {
        // RAIJIN THUNDER-THROUGH: Clamped High-Speed Iaido Line-Pierce + Delayed Lightning Dragon Bursts!
        if (t >= 0.14 && t <= 0.44) {
          const startX = player._advSkillStartX ?? player.x;
          const goalX = this.clampX(startX + f * 310, 26);
          const u = (t - 0.14) / 0.30;
          player.x = this.clampX(startX + (goalX - startX) * u, 26);
          if (!(player._advBeatMask & 1)) {
            player._advBeatMask |= 1;
            const midX = (startX + goalX) * 0.5;
            if (game?.audio) game.audio.play('dash_whoosh', midX);
            game?.vfx?.spawnBeam?.(startX, gy - 92, goalX, gy - 92, '#818cf8', 22, 0.32);
            this.hitEllipticalAoE(player, midX, gy, 210, 92, 88, {
              stunDur: 0.45,
              sfx: 'slash'
            });
          }
        }
        if (t >= 0.54 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          const living = this.getLivingMonsters();
          const targets = living.length ? living.slice(0, 4) : [{ x: cl.x, groundY: cl.groundY }];
          for (const m of targets) {
            const tx = m.isColossalBoss ? m.anchorX + 122 : m.x;
            const tGy = this.clampGy(m.groundY || gy);
            game?.vfx?.spawnLightning?.(tx, tGy - 340, tGy, '#fef08a', '#818cf8');
            this.spawnVfxStamp({
              heroId: 'ronin',
              row: 2,
              startCol: 0,
              endCol: 25,
              x: tx,
              y: tGy - 94,
              groundY: tGy,
              flip: f,
              scale: 1.12,
              maxLife: 0.44
            });
            this.hitEllipticalAoE(player, tx, tGy, 118, 72, 108, {
              sfx: 'thunder_slam',
              shake: 7
            });
          }
        }
        break;
      }

      case 'valkyrie': {
        // GUNGNIR SKY-JAVELIN: Winged Hop + Blazing Dragonfire Spear Crater on Cluster!
        const hopU = Math.min(1, t / 0.72);
        player.y = gy - Math.sin(hopU * Math.PI) * 78;
        if (t >= 0.30 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          game?.vfx?.spawnBeam?.(
            player.x + f * 30,
            player.y - 96,
            cl.x,
            cl.groundY - 24,
            '#f43f5e',
            20,
            0.30
          );
          this.spawnVfxStamp({
            heroId: 'valkyrie',
            row: 1,
            startCol: 0,
            endCol: 27,
            x: cl.x,
            y: cl.groundY - 94,
            groundY: cl.groundY,
            flip: f,
            scale: 1.28,
            maxLife: 0.52
          });
          this.spawnVfxStamp({
            heroId: 'valkyrie',
            row: 2,
            startCol: 2,
            endCol: 26,
            x: cl.x,
            y: cl.groundY - 92,
            groundY: cl.groundY,
            flip: f,
            scale: 1.16,
            maxLife: 0.50
          });
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 6, 175, '#f43f5e', 0.36, true);
          this.hitEllipticalAoE(player, cl.x, cl.groundY, 195, 102, 194, {
            stunDur: 0.60,
            knockY: -115,
            sfx: 'thunder_slam',
            shake: 10
          });
        }
        break;
      }

      case 'icemage': {
        // GLACIAL ICEBERG JAWS: Twin Glacier Walls chomping inward + 0.8s Permafrost Freeze!
        if (t >= 0.24 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          for (const side of [-1, 1]) {
            this.spawnVfxStamp({
              heroId: 'icemage',
              row: 2,
              startCol: 0,
              endCol: 27,
              x: cl.x + side * 62,
              y: cl.groundY - 92,
              groundY: cl.groundY,
              vx: -side * 110,
              flip: -side,
              scale: 1.24,
              maxLife: 0.52
            });
          }
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 6, 180, '#67e8f9', 0.36, true);
          this.hitEllipticalAoE(player, cl.x, cl.groundY, 195, 105, 188, {
            pull: 0.45,
            stunDur: 0.80,
            sfx: 'ice_shatter',
            shake: 9
          });
        }
        break;
      }

      case 'android': {
        // EMP SINGULARITY DOME: Thruster surge + 360° Cyber Singularity Vacuum & Stun!
        if (t >= 0.06 && t <= 0.28) {
          player.x = this.clampX(player.x + f * 180 * dt, 24);
        }
        if (t >= 0.26 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          this.purgeHostileProjectiles(player, game, 220, 160);
          const ex = player.x + f * 64;
          this.spawnVfxStamp({
            heroId: 'android',
            row: 2,
            startCol: 0,
            endCol: 26,
            x: ex,
            y: gy - 92,
            groundY: gy,
            flip: f,
            scale: 1.22,
            maxLife: 0.52
          });
          this.spawnVfxStamp({
            heroId: 'android',
            row: 3,
            startCol: 0,
            endCol: 27,
            x: ex,
            y: gy - 96,
            groundY: gy,
            flip: f,
            scale: 1.26,
            layer: 'fg',
            maxLife: 0.54
          });
          game?.vfx?.spawnShockwave?.(ex, gy - 6, 195, '#00f0ff', 0.38, true);
          this.hitEllipticalAoE(player, ex, gy, 210, 112, 186, {
            pull: 0.50,
            stunDur: 0.75,
            sfx: 'thunder_slam',
            shake: 9
          });
        }
        break;
      }

      default:
        break;
    }
  }

  // ===========================================================================
  // PER-HERO 2.5D OVERDRIVE ULTIMATE (`ULTIMATE`, `Row 4`)
  // ===========================================================================
  updateHeroAdventureOverdrive(player, dt, t, dur, _enemy, game, heroId) {
    const f = player.facing || 1;
    const gy = player.groundY || player.y;
    const cl = player._advUltCluster || { x: player.x + f * 220, groundY: gy };
    const bounds = this.getBounds(36);
    const zoneMidX = (bounds.minX + bounds.maxX) * 0.5;

    switch (heroId) {
      case 'warrior': {
        // GLACIAL EARTHSHATTER: Sky-Leap Slam + 5 Cascading Glacial Runeblade Pillars across 3D lanes!
        if (t < 0.52) {
          player.y = gy - Math.sin((t / 0.52) * Math.PI) * 118;
        } else {
          player.y = gy;
        }
        if (t >= 0.48 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          for (let i = 0; i < 5; i++) {
            const delay = i * 0.09;
            const px = this.clampX(player.x + f * (95 + i * 95), 20);
            const laneGy = this.clampGy(gy + ((i % 3) - 1) * 48);
            this.scheduleStrike(delay, () => {
              this.spawnVfxStamp({
                heroId: 'warrior',
                row: 2,
                startCol: 0,
                endCol: 27,
                x: px,
                y: laneGy - 96,
                groundY: laneGy,
                flip: f,
                scale: 1.35,
                layer: 'fg',
                maxLife: 0.56
              });
              game?.vfx?.spawnShockwave?.(px, laneGy - 6, 165, '#38bdf8', 0.36, true);
              this.hitEllipticalAoE(player, px, laneGy, 185, 118, 125, {
                stunDur: 0.75,
                knockY: -120,
                sfx: 'heavy_cleave',
                shake: 10
              });
            });
          }
        }
        break;
      }

      case 'mage': {
        // SOLAR ECLIPSE VORTEX: Levitates & detonates a Zone-Wide Black-Sun Gravity Supernova!
        player.y = gy - Math.sin(Math.min(1, t / dur) * Math.PI) * 58;
        if (t >= 0.24 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          game?.vfx?.spawnEclipseSupernova?.({
            x: cl.x,
            y: cl.groundY - 125,
            groundY: cl.groundY,
            maxRadius: 150,
            color: '#fb923c',
            coreColor: '#fef08a',
            maxLife: 1.15
          });
          this.spawnVfxStamp({
            heroId: 'mage',
            row: 2,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 115,
            groundY: cl.groundY,
            flip: f,
            scale: 1.55,
            layer: 'fg',
            maxLife: 0.95
          });
          this.hitEllipticalAoE(player, cl.x, cl.groundY, 320, 160, 195, {
            pull: 0.58,
            sfx: 'eclipse_charge',
            shake: 10
          });
        }
        if (t >= 0.92 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 290, '#fb923c', 0.48, true);
          this.hitEllipticalAoE(player, cl.x, cl.groundY, 340, 175, 295, {
            knockX: 165,
            knockY: -145,
            sfx: 'meteor_impact',
            shake: 16,
            hitStop: 0.06
          });
        }
        break;
      }

      case 'archer': {
        // TEMPEST GALE VORTEX: Sweeping Emerald Wind-Dragon Tornado down the 3D road!
        if (t >= 0.26 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          const startX = this.clampX(player.x + f * 70, 20);
          game?.vfx?.spawnTornado?.({
            x: startX,
            groundY: cl.groundY,
            vx: f * 310,
            radius: 92,
            height: 290,
            color: '#10b981',
            coreColor: '#fef08a',
            maxLife: 1.25,
            isUltimate: true
          });
          for (let i = 0; i < 4; i++) {
            this.scheduleStrike(i * 0.24, () => {
              const tx = this.clampX(startX + f * i * 105, 16);
              this.spawnVfxStamp({
                heroId: 'archer',
                row: 3,
                startCol: 0,
                endCol: 26,
                x: tx,
                y: cl.groundY - 102,
                groundY: cl.groundY,
                flip: f,
                scale: 1.38,
                layer: 'fg',
                maxLife: 0.46
              });
              this.hitEllipticalAoE(player, tx, cl.groundY, 245, 145, 128, {
                pull: 0.36,
                stunDur: 0.45,
                sfx: 'arrow_hit',
                shake: 7
              });
            });
          }
        }
        break;
      }

      case 'priestess': {
        // VALKYRIE SPEAR CHORUS: Ascends on golden wings & rains Holy Spears onto EVERY monster!
        player.y = gy - Math.sin(Math.min(1, t / dur) * Math.PI) * 76;
        player.isAngelicAscent = true;
        if (t >= 0.28 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          player.heal(Math.round(player.maxHp * 0.10), 'SERAPHIC CHORUS');
          const living = this.getLivingMonsters();
          const targets = living.length ? living : [{ x: cl.x, groundY: cl.groundY }];
          targets.forEach((m, idx) => {
            for (let w = 0; w < 2; w++) {
              this.scheduleStrike(idx * 0.08 + w * 0.34, () => {
                const tx = m.isColossalBoss ? m.anchorX + 122 + (w - 0.5) * 60 : m.x;
                const tGy = this.clampGy(m.groundY || gy);
                this.spawnVfxStamp({
                  heroId: 'priestess',
                  row: 1,
                  startCol: 0,
                  endCol: 27,
                  x: tx,
                  y: tGy - 98,
                  groundY: tGy,
                  flip: f,
                  scale: 1.34,
                  layer: 'fg',
                  maxLife: 0.54
                });
                game?.vfx?.spawnShockwave?.(tx, tGy - 6, 155, '#fde047', 0.34, true);
                this.hitEllipticalAoE(player, tx, tGy, 175, 110, 148, {
                  sfx: 'holy_hit',
                  shake: 8
                });
              });
            }
          });
        }
        break;
      }

      case 'reaper': {
        // OSSUARY BONE-OBELISKS: 5 Erupting Bone-Spires across the zone + Soul-Drain Shockwave!
        if (t >= 0.26 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          const living = this.getLivingMonsters();
          for (let i = 0; i < 5; i++) {
            this.scheduleStrike(i * 0.11, () => {
              const ref = living[i % Math.max(1, living.length)];
              const ox = ref
                ? ref.isColossalBoss
                  ? ref.anchorX + 125
                  : ref.x
                : this.clampX(bounds.minX + 120 + i * 175, 20);
              const oGy = ref ? this.clampGy(ref.groundY || gy) : this.clampGy(480 + (i % 3) * 75);
              this.spawnVfxStamp({
                heroId: 'reaper',
                row: 2,
                startCol: 0,
                endCol: 27,
                x: ox,
                y: oGy - 96,
                groundY: oGy,
                flip: f,
                scale: 1.34,
                layer: 'fg',
                maxLife: 0.56
              });
              this.hitEllipticalAoE(player, ox, oGy, 180, 110, 116, {
                stunDur: 0.80,
                leechPerHit: 10,
                maxLeech: 45,
                sfx: 'soul_drain',
                shake: 9
              });
            });
          }
        }
        break;
      }

      case 'chronomancer': {
        // HOROLOGIUM TIME-STOP: 1.5s Full-Zone Time-Freeze + Glass-Clock Shatter!
        if (t >= 0.22 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          this.spawnVfxStamp({
            heroId: 'chronomancer',
            row: 3,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 108,
            groundY: cl.groundY,
            flip: f,
            scale: 1.55,
            layer: 'fg',
            maxLife: 0.90
          });
          this.hitEllipticalAoE(player, zoneMidX, 561, 680, 220, 145, {
            timeStopDur: 1.50,
            sfx: 'clock_gear',
            shake: 8
          });
        }
        if (t >= 0.96 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          this.spawnVfxStamp({
            heroId: 'chronomancer',
            row: 4,
            startCol: 0,
            endCol: 27,
            x: cl.x,
            y: cl.groundY - 105,
            groundY: cl.groundY,
            flip: f,
            scale: 1.52,
            layer: 'fg',
            maxLife: 0.52
          });
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 280, '#2dd4bf', 0.44, true);
          this.hitEllipticalAoE(player, zoneMidX, 561, 680, 220, 315, {
            stunDur: 0.65,
            sfx: 'chrono_hit',
            shake: 14,
            hitStop: 0.06
          });
        }
        break;
      }

      case 'titan': {
        // WORLD-BREAKER SHOCKBAT: Massive Horizontal Tectonic Magma Sweep across all 3D lanes!
        this.unstoppableOn(player);
        if (t >= 0.44 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          const sx = player.x + f * 120;
          for (const dz of [-62, 0, 62]) {
            const lGy = this.clampGy(gy + dz);
            this.spawnVfxStamp({
              heroId: 'titan',
              row: 0,
              startCol: 0,
              endCol: 27,
              x: sx,
              y: lGy - 86,
              groundY: lGy,
              vx: f * 420,
              flip: f,
              scale: 1.32,
              layer: 'fg',
              maxLife: 0.62
            });
          }
          game?.vfx?.spawnShockwave?.(sx, gy - 8, 250, '#f59e0b', 0.44, true);
          this.hitEllipticalAoE(player, sx + f * 110, gy, 340, 165, 465, {
            stunDur: 1.05,
            exposeBossCore: true,
            knockX: 260,
            knockY: -135,
            sfx: 'thunder_slam',
            shake: 16,
            hitStop: 0.065
          });
        }
        break;
      }

      case 'ronin': {
        // JUDGMENT-CUT TEMPEST: 5 Rapid Spatial Judgment-Cut Rifts across all foes + Noto Sheathe!
        if (t >= 0.20 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          const living = this.getLivingMonsters();
          for (let i = 0; i < 5; i++) {
            this.scheduleStrike(i * 0.11, () => {
              const ref = living[i % Math.max(1, living.length)];
              const rx = ref ? (ref.isColossalBoss ? ref.anchorX + 125 : ref.x) : cl.x;
              const rGy = ref ? this.clampGy(ref.groundY || gy) : cl.groundY;
              this.spawnVfxStamp({
                heroId: 'ronin',
                row: i % 2 === 0 ? 6 : 4,
                startCol: 0,
                endCol: 26,
                x: rx,
                y: rGy - 96,
                groundY: rGy,
                flip: i % 2 === 0 ? 1 : -1,
                scale: 1.34,
                layer: 'fg',
                maxLife: 0.44
              });
              this.hitEllipticalAoE(player, rx, rGy, 195, 115, 92, {
                sfx: 'slash'
              });
            });
          }
        }
        if (t >= 1.02 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 260, '#818cf8', 0.42, true);
          this.hitEllipticalAoE(player, zoneMidX, 561, 650, 210, 210, {
            stunDur: 0.65,
            sfx: 'thunder_slam',
            shake: 14,
            hitStop: 0.055
          });
        }
        break;
      }

      case 'valkyrie': {
        // VALHALLA DRAGON RAID: 3 Clamped Aerial Dragonfire Sweeps across the active zone!
        player.y = gy - Math.sin(Math.min(1, t / dur) * Math.PI) * 96;
        const raidBeats = [
          { bit: 1, at: 0.24 },
          { bit: 2, at: 0.58 },
          { bit: 4, at: 0.92 }
        ];
        for (const rb of raidBeats) {
          if (t >= rb.at && !(player._advBeatMask & rb.bit)) {
            player._advBeatMask |= rb.bit;
            const curCl = this.getBestClusterPoint(player, 210);
            player.x = this.clampX(curCl.x - f * 95, 32);
            this.spawnVfxStamp({
              heroId: 'valkyrie',
              row: rb.bit === 4 ? 7 : 4,
              startCol: 0,
              endCol: 26,
              x: curCl.x,
              y: curCl.groundY - 96,
              groundY: curCl.groundY,
              flip: f,
              scale: 1.38,
              layer: 'fg',
              maxLife: 0.48
            });
            this.hitEllipticalAoE(player, curCl.x, curCl.groundY, 225, 125, 158, {
              stunDur: rb.bit === 4 ? 0.70 : 0.25,
              knockY: -105,
              sfx: rb.bit === 4 ? 'thunder_slam' : 'heavy_cleave',
              shake: rb.bit === 4 ? 12 : 7
            });
          }
        }
        break;
      }

      case 'icemage': {
        // CORONATION ICE-CLAYMORES: 7 Giant Celestial Ice-Claymores raining across every monster!
        if (t >= 0.22 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          this.spawnVfxStamp({
            heroId: 'icemage',
            row: 3,
            startCol: 0,
            endCol: 27,
            x: player.x,
            y: player.y - 135,
            groundY: gy,
            flip: f,
            scale: 1.35,
            layer: 'fg',
            maxLife: 0.85
          });
          const living = this.getLivingMonsters();
          for (let i = 0; i < 7; i++) {
            this.scheduleStrike(i * 0.11, () => {
              const ref = living[i % Math.max(1, living.length)];
              const sx = ref
                ? ref.isColossalBoss
                  ? ref.anchorX + 115 + ((i % 3) - 1) * 45
                  : ref.x
                : this.clampX(cl.x + (i - 3) * 58, 20);
              const sGy = ref ? this.clampGy(ref.groundY || gy) : this.clampGy(478 + (i % 3) * 78);
              this.spawnVfxStamp({
                heroId: 'icemage',
                row: 4,
                startCol: 0,
                endCol: 26,
                x: sx,
                y: sGy - 104,
                groundY: sGy,
                flip: f,
                scale: 1.36,
                layer: 'fg',
                maxLife: 0.48
              });
              this.hitEllipticalAoE(player, sx, sGy, 165, 102, 96, {
                stunDur: 0.65,
                sfx: 'ice_shatter',
                shake: 7
              });
            });
          }
        }
        break;
      }

      case 'android': {
        // ALL-RANGE FUNNEL CONVERGENCE: 6 Drone Pods firing Zone-Spanning Hyper-Beams!
        if (t >= 0.24 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          const beamEndX = f > 0 ? bounds.maxX + 60 : bounds.minX - 60;
          for (const laneOff of [-58, 0, 58]) {
            const bGy = this.clampGy(gy + laneOff);
            this.spawnVfxStamp({
              heroId: 'android',
              row: 6,
              startCol: 0,
              endCol: 26,
              x: player.x + f * 52,
              y: bGy - 96,
              groundY: bGy,
              flip: f,
              scale: 1.18,
              layer: 'fg',
              maxLife: 0.72
            });
            game?.vfx?.spawnBeam?.(
              player.x + f * 48,
              bGy - 96,
              beamEndX,
              bGy - 96,
              laneOff === 0 ? '#00f0ff' : '#ff2e93',
              laneOff === 0 ? 34 : 20,
              0.68
            );
          }
          for (let p = 0; p < 3; p++) {
            this.scheduleStrike(p * 0.20, () => {
              this.hitEllipticalAoE(player, zoneMidX, gy, 680, 175, 156, {
                stunDur: 0.45,
                sfx: p === 0 ? 'ult_cast' : 'thunder_slam',
                shake: 10
              });
            });
          }
        }
        break;
      }

      default:
        break;
    }
  }

  // ===========================================================================
  // PER-HERO 2.5D SUPREME CATACLYSM (`TRUE_ULTIMATE`, `Row 4` + `Row 8`)
  // ===========================================================================
  updateHeroAdventureCataclysm(player, _dt, t, dur, _enemy, game, heroId) {
    const f = player.facing || 1;
    const gy = player.groundY || player.y;
    const cl = player._advTrueCluster || { x: player.x + f * 240, groundY: gy };
    const bounds = this.getBounds(36);
    const zoneMidX = (bounds.minX + bounds.maxX) * 0.5;

    if (game?.renderer) {
      game.renderer.ultDim = t < dur - 0.35 ? 0.62 : Math.max(0, ((dur - t) / 0.35) * 0.62);
    }

    switch (heroId) {
      case 'warrior': {
        // SANCTUARY JUDGMENT: Golden Sanctuary Heal + 6 Celestial Swords of Justice + Heavens-Cleave!
        if (t >= 0.18 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          player.heal(Math.round(player.maxHp * 0.16), 'SANCTUARY VOW');
          this.spawnVfxStamp({
            heroId: 'warrior',
            row: 3,
            startCol: 0,
            endCol: 28,
            x: player.x,
            y: gy - 12,
            groundY: gy,
            scale: 1.85,
            squashY: 0.42,
            layer: 'floor',
            maxLife: 1.85
          });
          for (let i = 0; i < 6; i++) {
            this.scheduleStrike(i * 0.14, () => {
              const cur = this.getBestClusterPoint(player, 180 + i * 35);
              const sx = cur.x + ((i % 3) - 1) * 65;
              const sGy = this.clampGy(cur.groundY + ((i % 2) - 0.5) * 64);
              this.spawnVfxStamp({
                heroId: 'warrior',
                row: 6,
                startCol: 0,
                endCol: 27,
                x: sx,
                y: sGy - 108,
                groundY: sGy,
                flip: f,
                scale: 1.52,
                layer: 'fg',
                maxLife: 0.62
              });
              this.hitEllipticalAoE(player, sx, sGy, 210, 125, 115, {
                stunDur: 0.65,
                sfx: 'clang',
                shake: 9
              });
            });
          }
        }
        if (t >= 1.52 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          this.spawnVfxStamp({
            heroId: 'warrior',
            row: 5,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 115,
            groundY: cl.groundY,
            flip: f,
            scale: 1.85,
            layer: 'fg',
            maxLife: 0.72
          });
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 340, '#facc15', 0.55, true);
          this.hitEllipticalAoE(player, zoneMidX, 561, 720, 240, 480, {
            stunDur: 1.25,
            exposeBossCore: true,
            sfx: 'thunder_slam',
            shake: 20,
            hitStop: 0.08
          });
        }
        break;
      }

      case 'mage': {
        // HEAVENSFALL CATACLYSM: Permanent Inferno Awakening + Sky Breach + Colossal Star-Meteor!
        player.y = gy - Math.sin(Math.min(1, t / dur) * Math.PI) * 92;
        if (t >= 0.20 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          if (game?.renderer) {
            game.renderer.permanentStageOverride = 'inferno';
            this.adventure?.syncStageBadge?.();
          }
          this.spawnVfxStamp({
            heroId: 'mage',
            row: 5,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 255,
            groundY: cl.groundY,
            scale: 1.85,
            layer: 'fg',
            maxLife: 1.45
          });
          for (let i = 0; i < 4; i++) {
            this.scheduleStrike(i * 0.18, () => {
              const mx = this.clampX(cl.x + (i - 1.5) * 95, 16);
              const mGy = this.clampGy(cl.groundY + ((i % 2) - 0.5) * 72);
              this.spawnVfxStamp({
                heroId: 'mage',
                row: 3,
                startCol: 0,
                endCol: 26,
                x: mx,
                y: mGy - 105,
                groundY: mGy,
                scale: 1.38,
                layer: 'fg',
                maxLife: 0.52
              });
              this.hitEllipticalAoE(player, mx, mGy, 210, 120, 125, {
                sfx: 'fire_hit',
                shake: 9
              });
            });
          }
        }
        if (t >= 1.38 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          this.spawnVfxStamp({
            heroId: 'mage',
            row: 6,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 122,
            groundY: cl.groundY,
            scale: 1.95,
            layer: 'fg',
            maxLife: 0.85
          });
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 360, '#fb923c', 0.62, true);
          game?.vfx?.spawnDecal?.(cl.x, 185, 'fissure', '#fb923c', 6.5, cl.groundY);
          this.hitEllipticalAoE(player, zoneMidX, 561, 740, 240, 540, {
            stunDur: 1.30,
            exposeBossCore: true,
            knockY: -165,
            sfx: 'meteor_impact',
            shake: 22,
            hitStop: 0.085
          });
        }
        break;
      }

      case 'archer': {
        // YGGDRASIL DRAGON-PIERCER: World-Tree Root Bind + Clamped Greatbow Zone-Spanning Beam!
        if (t >= 0.16 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          const anchorX = f > 0 ? bounds.minX + 55 : bounds.maxX - 55;
          player.x = this.clampX(anchorX, 28);
          this.spawnVfxStamp({
            heroId: 'archer',
            row: 5,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 118,
            groundY: cl.groundY,
            scale: 1.75,
            layer: 'fg',
            maxLife: 1.35
          });
          this.hitEllipticalAoE(player, zoneMidX, 561, 700, 230, 185, {
            stunDur: 1.35,
            sfx: 'arrow_shoot',
            shake: 8
          });
        }
        if (t >= 1.25 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          this.spawnVfxStamp({
            heroId: 'archer',
            row: 6,
            startCol: 0,
            endCol: 27,
            x: player.x + f * 64,
            y: gy - 104,
            groundY: gy,
            flip: f,
            scale: 1.48,
            layer: 'fg',
            maxLife: 0.80
          });
          for (let seg = 1; seg <= 5; seg++) {
            this.spawnVfxStamp({
              heroId: 'archer',
              row: 7,
              startCol: 0,
              endCol: 27,
              x: player.x + f * (64 + seg * 175),
              y: gy - 104,
              groundY: gy,
              flip: f,
              scale: 1.35,
              layer: 'fg',
              maxLife: 0.78
            });
          }
          game?.vfx?.spawnBeam?.(
            player.x + f * 50,
            gy - 104,
            f > 0 ? bounds.maxX + 80 : bounds.minX - 80,
            gy - 104,
            '#10b981',
            54,
            0.78
          );
          this.hitEllipticalAoE(player, zoneMidX, 561, 760, 240, 680, {
            stunDur: 1.20,
            exposeBossCore: true,
            sfx: 'thunder_slam',
            shake: 20,
            hitStop: 0.08
          });
        }
        break;
      }

      case 'priestess': {
        // FINAL GRACE DAWNBREAKER: +20% HP Benediction + Rose Window + Full-Zone Horizontal Prismatic Beam!
        player.y = gy - Math.sin(Math.min(1, t / dur) * Math.PI) * 68;
        player.isAngelicAscent = true;
        if (t >= 0.20 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          const anchorX = f > 0 ? bounds.minX + 60 : bounds.maxX - 60;
          player.x = this.clampX(anchorX, 28);
          player.heal(Math.round(player.maxHp * 0.20), 'FINAL GRACE');
          this.spawnVfxStamp({
            heroId: 'priestess',
            row: 3,
            startCol: 0,
            endCol: 28,
            x: player.x,
            y: player.y - 115,
            groundY: gy,
            scale: 1.65,
            layer: 'fg',
            maxLife: 1.25
          });
          this.spawnVfxStamp({
            heroId: 'priestess',
            row: 5,
            startCol: 0,
            endCol: 26,
            x: player.x + f * 48,
            y: player.y - 102,
            groundY: gy,
            flip: f,
            scale: 1.35,
            layer: 'fg',
            maxLife: 1.05
          });
        }
        if (t >= 1.18 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          this.spawnVfxStamp({
            heroId: 'priestess',
            row: 6,
            startCol: 0,
            endCol: 27,
            x: player.x + f * 68,
            y: player.y - 102,
            groundY: gy,
            flip: f,
            scale: 1.45,
            layer: 'fg',
            maxLife: 0.85
          });
          for (let seg = 1; seg <= 5; seg++) {
            this.spawnVfxStamp({
              heroId: 'priestess',
              row: 7,
              startCol: 0,
              endCol: 27,
              x: player.x + f * (68 + seg * 175),
              y: player.y - 102,
              groundY: gy,
              flip: f,
              scale: 1.36,
              layer: 'fg',
              maxLife: 0.85
            });
          }
          game?.vfx?.spawnBeam?.(
            player.x + f * 52,
            player.y - 102,
            f > 0 ? bounds.maxX + 80 : bounds.minX - 80,
            player.y - 102,
            '#fde047',
            62,
            0.85
          );
          this.hitEllipticalAoE(player, zoneMidX, 561, 760, 240, 820, {
            stunDur: 1.15,
            exposeBossCore: true,
            sfx: 'holy_hit',
            shake: 20,
            hitStop: 0.08
          });
        }
        break;
      }

      case 'reaper': {
        // MEMENTO MORI GUILLOTINE: Twin Obsidian Necropolis Gates + Grave-Chains + Death-God Guillotine!
        if (t >= 0.20 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          this.spawnVfxStamp({
            heroId: 'reaper',
            row: 5,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 118,
            groundY: cl.groundY,
            scale: 1.80,
            layer: 'fg',
            maxLife: 1.45
          });
          this.spawnVfxStamp({
            heroId: 'reaper',
            row: 6,
            startCol: 0,
            endCol: 27,
            x: cl.x,
            y: cl.groundY - 88,
            groundY: cl.groundY,
            scale: 1.55,
            layer: 'fg',
            maxLife: 1.25
          });
          this.hitEllipticalAoE(player, cl.x, cl.groundY, 460, 200, 240, {
            pull: 0.55,
            stunDur: 1.25,
            sfx: 'soul_drain',
            shake: 10
          });
        }
        if (t >= 1.38 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          this.spawnVfxStamp({
            heroId: 'reaper',
            row: 7,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 115,
            groundY: cl.groundY,
            flip: f,
            scale: 1.92,
            layer: 'fg',
            maxLife: 0.82
          });
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 340, '#c084fc', 0.56, true);
          this.hitEllipticalAoE(player, zoneMidX, 561, 740, 240, 660, {
            leechPerHit: 28,
            maxLeech: 110,
            stunDur: 1.20,
            exposeBossCore: true,
            sfx: 'scythe_reap',
            shake: 21,
            hitStop: 0.085
          });
        }
        break;
      }

      case 'chronomancer': {
        // TWELFTH BELL PARADOX: Stopped Time + Converging Brass-Cyan Clock-Spears + Midnight Nova!
        if (t >= 0.18 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          this.spawnVfxStamp({
            heroId: 'chronomancer',
            row: 3,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 122,
            groundY: cl.groundY,
            scale: 1.85,
            layer: 'fg',
            maxLife: 1.45
          });
          this.hitEllipticalAoE(player, zoneMidX, 561, 740, 240, 190, {
            timeStopDur: 1.65,
            sfx: 'clock_gear'
          });
          for (let i = 0; i < 4; i++) {
            this.scheduleStrike(0.22 + i * 0.16, () => {
              const side = i % 2 === 0 ? 1 : -1;
              this.spawnVfxStamp({
                heroId: 'chronomancer',
                row: 6,
                startCol: 0,
                endCol: 26,
                x: cl.x - side * 140,
                y: cl.groundY - 96 - (i - 1.5) * 22,
                groundY: cl.groundY,
                vx: side * 290,
                flip: side,
                scale: 1.42,
                layer: 'fg',
                maxLife: 0.48
              });
              this.hitEllipticalAoE(player, cl.x, cl.groundY, 340, 175, 95, {
                sfx: 'chrono_hit'
              });
            });
          }
        }
        if (t >= 1.42 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          this.spawnVfxStamp({
            heroId: 'chronomancer',
            row: 7,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 118,
            groundY: cl.groundY,
            scale: 1.92,
            layer: 'fg',
            maxLife: 0.82
          });
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 350, '#facc15', 0.56, true);
          this.hitEllipticalAoE(player, zoneMidX, 561, 750, 240, 480, {
            stunDur: 1.25,
            exposeBossCore: true,
            sfx: 'thunder_slam',
            shake: 20,
            hitStop: 0.085
          });
        }
        break;
      }

      case 'titan': {
        // CONTINENTAL SUNDER: 1.85x Forge-Avatar Sky-Jump -> Meteor Mjolnir Smash & Volcanic Geysers!
        player.spriteScale = t < dur - 0.18 ? 1.85 : 1.0;
        if (t >= 0.35 && t < 1.22) {
          const jumpU = (t - 0.35) / 0.87;
          player.y = gy - Math.sin(jumpU * Math.PI) * 185;
          const goalX = this.clampX(cl.x, 42);
          player.x = this.clampX(
            player._advTrueStartX + (goalX - player._advTrueStartX) * jumpU,
            42
          );
          player.trueUltFrameOverride = 240 + Math.min(24, Math.floor(jumpU * 24));
        } else {
          player.y = gy;
          player.trueUltFrameOverride = null;
        }
        if (t >= 1.22 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          const impX = player.x + f * 48;
          this.spawnVfxStamp({
            heroId: 'titan',
            row: 5,
            startCol: 0,
            endCol: 28,
            x: impX,
            y: gy - 108,
            groundY: gy,
            scale: 1.75,
            layer: 'fg',
            maxLife: 0.85
          });
          for (let i = 0; i < 4; i++) {
            const gx = this.clampX(bounds.minX + 130 + i * 240, 16);
            const gGy = this.clampGy(478 + (i % 3) * 80);
            this.spawnVfxStamp({
              heroId: 'titan',
              row: 7,
              startCol: 0,
              endCol: 28,
              x: gx,
              y: gGy - 108,
              groundY: gGy,
              scale: 1.58,
              layer: 'fg',
              maxLife: 0.80
            });
          }
          game?.vfx?.spawnShockwave?.(impX, gy - 8, 370, '#f59e0b', 0.62, true);
          game?.vfx?.spawnDecal?.(impX, 195, 'fissure', '#f59e0b', 6.5, gy);
          this.hitEllipticalAoE(player, zoneMidX, 561, 760, 240, 920, {
            stunDur: 1.45,
            exposeBossCore: true,
            knockY: -180,
            sfx: 'meteor_impact',
            shake: 24,
            hitStop: 0.09
          });
        }
        break;
      }

      case 'ronin': {
        // AMAKAKERU STORMHORIZON: Clamped Rapid Afterimage Cuts across the Zone + Heaven-Splitting Cleave!
        if (t >= 0.16 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          this.spawnVfxStamp({
            heroId: 'ronin',
            row: 3,
            startCol: 0,
            endCol: 27,
            x: player.x,
            y: gy - 125,
            groundY: gy,
            scale: 1.55,
            layer: 'fg',
            maxLife: 1.05
          });
          for (let i = 0; i < 6; i++) {
            this.scheduleStrike(i * 0.15, () => {
              const cur = this.getBestClusterPoint(player, 200);
              player.x = this.clampX(cur.x + (i % 2 === 0 ? -72 : 72), 32);
              player.facing = i % 2 === 0 ? 1 : -1;
              this.spawnVfxStamp({
                heroId: 'ronin',
                row: 6,
                startCol: 0,
                endCol: 26,
                x: cur.x,
                y: cur.groundY - 98,
                groundY: cur.groundY,
                flip: player.facing,
                scale: 1.46,
                layer: 'fg',
                maxLife: 0.44
              });
              this.hitEllipticalAoE(player, cur.x, cur.groundY, 240, 135, 92, {
                sfx: 'slash'
              });
            });
          }
        }
        if (t >= 1.38 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          this.spawnVfxStamp({
            heroId: 'ronin',
            row: 7,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 118,
            groundY: cl.groundY,
            flip: f,
            scale: 1.92,
            layer: 'fg',
            maxLife: 0.82
          });
          game?.vfx?.spawnLightning?.(cl.x, cl.groundY - 420, cl.groundY, '#fef08a', '#818cf8');
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 350, '#818cf8', 0.56, true);
          this.hitEllipticalAoE(player, zoneMidX, 561, 750, 240, 495, {
            stunDur: 1.20,
            exposeBossCore: true,
            sfx: 'thunder_slam',
            shake: 20,
            hitStop: 0.085
          });
        }
        break;
      }

      case 'valkyrie': {
        // TWILIGHT OF RAGNAROK: Valhalla Dragon Crest + Bifrost Sky-Lances + Ragnarok Dragon-Pillar!
        if (t < 1.25) {
          player.y = gy - Math.sin((t / 1.25) * Math.PI) * 165;
          player.trueUltFrameOverride = 240 + Math.min(22, Math.floor((t / 1.25) * 22));
        } else {
          player.y = gy;
          player.trueUltFrameOverride = null;
        }
        if (t >= 0.18 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          player.heal(Math.round(player.maxHp * 0.12), 'VALHALLA VALOR');
          this.spawnVfxStamp({
            heroId: 'valkyrie',
            row: 3,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 165,
            groundY: cl.groundY,
            scale: 1.80,
            layer: 'fg',
            maxLife: 1.20
          });
          this.spawnVfxStamp({
            heroId: 'valkyrie',
            row: 5,
            startCol: 0,
            endCol: 27,
            x: cl.x,
            y: cl.groundY - 12,
            groundY: cl.groundY,
            scale: 1.75,
            squashY: 0.42,
            layer: 'floor',
            maxLife: 1.25
          });
          for (let i = 0; i < 4; i++) {
            this.scheduleStrike(0.20 + i * 0.18, () => {
              const lx = this.clampX(cl.x + (i - 1.5) * 90, 16);
              this.spawnVfxStamp({
                heroId: 'valkyrie',
                row: 6,
                startCol: 0,
                endCol: 26,
                x: lx,
                y: cl.groundY - 108,
                groundY: cl.groundY,
                scale: 1.44,
                layer: 'fg',
                maxLife: 0.50
              });
              this.hitEllipticalAoE(player, lx, cl.groundY, 210, 125, 108, {
                sfx: 'heavy_cleave',
                shake: 8
              });
            });
          }
        }
        if (t >= 1.25 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          player.x = this.clampX(cl.x - f * 55, 34);
          this.spawnVfxStamp({
            heroId: 'valkyrie',
            row: 7,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 118,
            groundY: cl.groundY,
            flip: f,
            scale: 1.92,
            layer: 'fg',
            maxLife: 0.85
          });
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 355, '#f43f5e', 0.58, true);
          this.hitEllipticalAoE(player, zoneMidX, 561, 750, 240, 520, {
            stunDur: 1.25,
            exposeBossCore: true,
            knockY: -160,
            sfx: 'meteor_impact',
            shake: 22,
            hitStop: 0.085
          });
        }
        break;
      }

      case 'icemage': {
        // ABSOLUTE ZERO BOREALIS: Aurora Mandala + Diamond-Coffin Freeze + Prismatic Reality Shatter!
        if (t >= 0.20 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          this.spawnVfxStamp({
            heroId: 'icemage',
            row: 5,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 14,
            groundY: cl.groundY,
            scale: 1.95,
            squashY: 0.44,
            layer: 'floor',
            maxLife: 1.55
          });
          this.spawnVfxStamp({
            heroId: 'icemage',
            row: 6,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 116,
            groundY: cl.groundY,
            scale: 1.80,
            layer: 'fg',
            maxLife: 1.25
          });
          this.hitEllipticalAoE(player, zoneMidX, 561, 740, 240, 260, {
            stunDur: 1.45,
            sfx: 'ice_shatter',
            shake: 10
          });
        }
        if (t >= 1.42 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          this.spawnVfxStamp({
            heroId: 'icemage',
            row: 7,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 118,
            groundY: cl.groundY,
            scale: 1.95,
            layer: 'fg',
            maxLife: 0.82
          });
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 360, '#67e8f9', 0.58, true);
          this.hitEllipticalAoE(player, zoneMidX, 561, 760, 240, 680, {
            stunDur: 1.25,
            exposeBossCore: true,
            sfx: 'thunder_slam',
            shake: 21,
            hitStop: 0.085
          });
        }
        break;
      }

      case 'android': {
        // ORBITAL GUNG-09 BUSTER: Hex Satellite Lock + Funnel Convergence + Orbital Buster Column!
        player.y = gy - Math.sin(Math.min(1, t / dur) * Math.PI) * 72;
        if (t >= 0.18 && !(player._advBeatMask & 1)) {
          player._advBeatMask |= 1;
          this.spawnVfxStamp({
            heroId: 'android',
            row: 5,
            startCol: 0,
            endCol: 28,
            x: cl.x,
            y: cl.groundY - 14,
            groundY: cl.groundY,
            scale: 1.90,
            squashY: 0.44,
            layer: 'floor',
            maxLife: 1.55
          });
          this.hitEllipticalAoE(player, cl.x, cl.groundY, 360, 175, 220, {
            pull: 0.52,
            stunDur: 1.15,
            sfx: 'clock_gear',
            shake: 8
          });
        }
        if (t >= 1.28 && !(player._advBeatMask & 2)) {
          player._advBeatMask |= 2;
          for (let h = 0; h < 3; h++) {
            this.spawnVfxStamp({
              heroId: 'android',
              row: 7,
              startCol: 0,
              endCol: 28,
              x: cl.x,
              y: cl.groundY - 108 - h * 170,
              groundY: cl.groundY,
              scale: 1.72,
              layer: 'fg',
              maxLife: 0.88
            });
          }
          game?.vfx?.spawnBeam?.(cl.x, cl.groundY - 520, cl.x, cl.groundY, '#00f0ff', 76, 0.85);
          game?.vfx?.spawnShockwave?.(cl.x, cl.groundY - 8, 360, '#ff2e93', 0.60, true);
          this.hitEllipticalAoE(player, zoneMidX, 561, 760, 240, 720, {
            stunDur: 1.30,
            exposeBossCore: true,
            sfx: 'meteor_impact',
            shake: 22,
            hitStop: 0.085
          });
        }
        break;
      }

      default:
        break;
    }
  }

  unstoppableOn(player) {
    if (player) player.unstoppablePoise = true;
  }

  // ===========================================================================
  // UPDATE & RENDER 2.5D ADVENTURE ZONES, DELAYED STRIKES & 30FPS VFX STAMPS
  // ===========================================================================
  update(dt, player) {
    if (player && (player._advComboResetTimer || 0) > 0) {
      player._advComboResetTimer = Math.max(0, player._advComboResetTimer - dt);
    }

    for (let i = this.delayedStrikes.length - 1; i >= 0; i--) {
      const ds = this.delayedStrikes[i];
      ds.timer -= dt;
      if (ds.timer <= 0) {
        this.delayedStrikes.splice(i, 1);
        if (this.adventure?.active && player && !player.isDead) {
          ds.fn();
        }
      }
    }

    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life += dt;
      z.tickTimer += dt;
      if (z.tickTimer >= z.tickInterval && z.owner && !z.owner.isDead) {
        z.tickTimer = 0;
        const stunDur = !z.didFirstPulse ? z.stunOnFirst || 0 : 0;
        z.didFirstPulse = true;
        this.spawnVfxStamp({
          heroId: z.heroId,
          row: z.vfxRow,
          startCol: 2,
          endCol: 25,
          x: z.x,
          y: z.groundY - 86,
          groundY: z.groundY,
          scale: z.vfxScale,
          maxLife: 0.42
        });
        this.hitEllipticalAoE(z.owner, z.x, z.groundY, z.radX, z.radZ, z.damage, {
          pull: z.pullStrength,
          stunDur,
          knockX: 25,
          knockY: -20,
          sfx: z.sfx
        });
      }
      if (z.life >= z.maxLife) {
        this.zones.splice(i, 1);
      }
    }

    for (let i = this.vfxStamps.length - 1; i >= 0; i--) {
      const s = this.vfxStamps[i];
      if (s.delay > 0) {
        s.delay -= dt;
        continue;
      }
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life >= s.maxLife) {
        this.vfxStamps.splice(i, 1);
      }
    }
  }

  renderFloor(ctx) {
    if (!ctx) return;
    if (this.zones.length > 0) {
      ctx.save();
      for (const z of this.zones) {
        const fade = z.life > z.maxLife - 0.25 ? Math.max(0, (z.maxLife - z.life) / 0.25) : 1;
        const pulse = 0.92 + Math.sin(z.life * 12) * 0.06;
        const rx = Math.round(z.x);
        const ry = Math.round(z.groundY - 4);
        const radX = Math.round(z.radX * pulse);
        const radY = Math.max(16, Math.round(z.radZ * 0.42 * pulse));

        ctx.globalAlpha = 0.18 * fade;
        ctx.fillStyle = z.color;
        ctx.beginPath();
        ctx.ellipse(rx, ry, radX, radY, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.78 * fade;
        ctx.strokeStyle = z.coreColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(rx, ry, radX, radY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    this.renderLayerStamps(ctx, 'floor');
  }

  renderMid(ctx) {
    this.renderLayerStamps(ctx, 'mid');
  }

  renderForeground(ctx) {
    this.renderLayerStamps(ctx, 'fg');
  }

  renderLayerStamps(ctx, layer) {
    if (!ctx || !this.vfxStamps.length) return;
    const assets = PixelForge.initAssets();
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const s of this.vfxStamps) {
      if (s.layer !== layer || s.delay > 0) continue;
      const sheet = assets?.[s.heroId]?.vfx;
      if (!sheet || !sheet.complete || !sheet.naturalWidth) continue;

      const u = Math.max(0, Math.min(1, s.life / s.maxLife));
      const span = Math.max(1, s.endCol - s.startCol + 1);
      const col = Math.min(29, s.startCol + Math.min(span - 1, Math.floor(u * span)));
      const sx = col * 208;
      const sy = s.row * 208;
      const curScale = s.scale + (s.scaleEnd - s.scale) * u;
      const drawW = Math.round(208 * curScale);
      const drawH = Math.round(208 * curScale * (s.squashY || 1));
      const fade = u > 0.78 ? (1 - u) / 0.22 : 1;

      ctx.save();
      ctx.translate(Math.round(s.x), Math.round(s.y));
      ctx.scale(s.flip >= 0 ? 1 : -1, 1);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha * fade));
      ctx.drawImage(sheet, sx, sy, 208, 208, -Math.round(drawW * 0.5), -Math.round(drawH * 0.5), drawW, drawH);

      if (s.bloomAlpha > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, Math.min(0.20, s.bloomAlpha * fade));
        ctx.drawImage(sheet, sx, sy, 208, 208, -Math.round(drawW * 0.5), -Math.round(drawH * 0.5), drawW, drawH);
      }
      ctx.restore();
    }
    ctx.restore();
  }
}

function selfSlash(mgr, player, game, heroId, vfxRow, cx, gy, scale = 1.0) {
  const f = player.facing || 1;
  mgr.spawnVfxStamp({
    heroId,
    row: vfxRow,
    startCol: 2,
    endCol: 22,
    x: cx,
    y: player.y - 92,
    groundY: gy,
    flip: f,
    scale,
    maxLife: 0.28,
    bloomAlpha: 0.14
  });
  const fAng = f === 1 ? 0 : Math.PI;
  game?.vfx?.spawnSlash?.(
    cx - f * 20,
    player.y - 94,
    74 * scale,
    fAng - 0.95,
    fAng + 0.95,
    player.primaryColor || '#38bdf8',
    0.22
  );
}
