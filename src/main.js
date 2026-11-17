import { Renderer } from './engine/Renderer.js?v=30fps127';
import { VFXManager } from './engine/VFXManager.js?v=30fps127';
import { PixelForge } from './engine/PixelForge.js?v=30fps127';
import { AudioManager } from './engine/AudioManager.js?v=30fps127';
import { ArcaneShaderFX } from './engine/ArcaneShaderFX.js?v=30fps127';
import { Fighter } from './entities/Fighter.js?v=30fps127';
import { Warrior } from './entities/Warrior.js?v=30fps127';
import { WarriorEx } from './entities/WarriorEx.js?v=30fps127';
import { FireMage } from './entities/FireMage.js?v=30fps127';
import { FireMageEx } from './entities/FireMageEx.js?v=30fps127';
import { Archer } from './entities/Archer.js?v=30fps127';
import { ArcherEx } from './entities/ArcherEx.js?v=30fps127';
import { Priestess } from './entities/Priestess.js?v=30fps127';
import { PriestessEx } from './entities/PriestessEx.js?v=30fps127';
import { Reaper } from './entities/Reaper.js?v=30fps127';
import { ReaperEx } from './entities/ReaperEx.js?v=30fps127';
import { Chronomancer } from './entities/Chronomancer.js?v=30fps127';
import { ChronomancerEx } from './entities/ChronomancerEx.js?v=30fps127';
import { Titan } from './entities/Titan.js?v=30fps127';
import { TitanEx } from './entities/TitanEx.js?v=30fps127';
import { Ronin } from './entities/Ronin.js?v=30fps127';
import { RoninEx } from './entities/RoninEx.js?v=30fps127';
import { Valkyrie } from './entities/Valkyrie.js?v=30fps127';
import { ValkyrieEx } from './entities/ValkyrieEx.js?v=30fps127';
import { IceMage } from './entities/IceMage.js?v=30fps127';
import { IceMageEx } from './entities/IceMageEx.js?v=30fps127';
import { Android } from './entities/Android.js?v=30fps127';
import { AndroidEx } from './entities/AndroidEx.js?v=30fps127';
import { NyxEx } from './entities/NyxEx.js?v=30fps127';
import { AdventureManager } from './adventure/AdventureManager.js?v=30fps127';
import { ADVENTURE_HERO_KITS } from './adventure/AdventureSkillSets.js?v=30fps127';

export const EX_HERO_KEYS = [
  'warrior_ex',
  'mage_ex',
  'priestess_ex',
  'chronomancer_ex',
  'valkyrie_ex',
  'ronin_ex',
  'archer_ex',
  'reaper_ex',
  'titan_ex',
  'icemage_ex',
  'android_ex',
  'nyx_ex'
];

export const LEGACY_HERO_KEYS = [
  'warrior',
  'mage',
  'priestess',
  'chronomancer',
  'valkyrie',
  'ronin',
  'archer',
  'reaper',
  'titan',
  'icemage',
  'android'
];

export const CHAMPION_ROSTER = {
  warrior: {
    id: 'warrior',
    name: 'AETHELGARD',
    role: 'SOVEREIGN RUNE PALADIN',
    style: 'RUNIC VANGUARD',
    trait: 'PASSIVE: AEGIS SPELL DEFLECT',
    cls: Warrior,
    theme: 'steel',
    color: '#38bdf8',
    selectSfx: 'slash',
    victoryLine: 'Sacred Seraphim steel consecrates the arena in celestial frost!',
    trueUltName: 'CELESTIAL JUSTICE: SWORD OF THE SANCTUARY',
    trueUltDesc:
      'Ascends on Seraphim wings, consecrates the Radiant Sanctuary, locks a pixel reticle & cleaves from the heavens!',
    skills: [
      {
        name: 'FROST CRESCENT',
        type: 'AUTO + PASSIVE',
        vfxCell: 0,
        desc: 'Cleaves with 2H Celestial Claymore frost waves & raises an Aegis spell-reflect barrier.'
      },
      {
        name: 'TEMPEST VANGUARD',
        type: 'SKILL • 5.1S CD',
        vfxCell: 1,
        desc: '360° spinning Runeblade cyclone rush that pulls foes in before a grounded crystal slam.'
      },
      {
        name: 'HEAVENLY EARTHSHATTER',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Leaps skyward and slams a colossal Runeblade monolith, erupting 5 glacial spires across the stage.'
      }
    ]
  },
  warrior_ex: {
    id: 'warrior_ex',
    name: 'AETHELGARD EX',
    role: 'EXVIUS SOVEREIGN',
    style: 'NEO-VISION DAWN VANGUARD',
    trait: 'PASSIVE: DAWN-BREAKER HIT-STOP & PARRY',
    cls: WarriorEx,
    theme: 'steel',
    color: '#38bdf8',
    selectSfx: 'heavy_cleave',
    victoryLine: 'The Dawn-Breaker cleaves fate itself in Exvius light!',
    trueUltName: 'EXVIUS DAWN: CATHEDRAL OF SEVEN SWORDS',
    trueUltDesc:
      'Unfurls pixel Seraphim Dawn-Wings, consecrates a Stained-Glass Runic Sanctuary & drops 6 Celestial Greatswords into a Sovereign Dawn-Pillar!',
    skills: [
      {
        name: 'DAWN-BREAKER SMEAR',
        type: 'AUTO + PASSIVE',
        vfxCell: 0,
        desc: '4-beat grounded FFBE smear chain with crunchy hit-stop, cross-rip & Heavensplitter wave.'
      },
      {
        name: 'DAWN-BREAKER TRINITY RUSH',
        type: 'SKILL • 4.6S CD',
        vfxCell: 1,
        desc: 'Consecrates a Runic Sword-Seal underfoot for a 3-beat advancing Dawn-Breaker combo into a Sovereign Sky-Pillar Uppercut.'
      },
      {
        name: 'CELESTIAL PENTAGRAM OMNISLASH',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Locks foes in a 5-point Star-Sanctuary sigil, flashing through 5 Neo-Vision silhouettes before plunging a Runic Monolith Greatsword.'
      }
    ]
  },
  mage_ex: {
    id: 'mage_ex',
    name: 'IGNIS SOL EX',
    role: 'SOLAR ARCHMAGE',
    style: 'NEO-VISION SOLAR ARCHMAGE',
    trait: 'PASSIVE: HELIOS SOLAR SORCERY & ARCANE BLINK',
    cls: FireMageEx,
    theme: 'arcane',
    color: '#fb923c',
    selectSfx: 'fireball',
    victoryLine: 'Helios Solar Sorcery ignites the heavens in sovereign solar flame!',
    trueUltName: 'CATACLYSM: GRAND HELIOS APOCALYPSE',
    trueUltDesc:
      'Consecrates a Golden Astrolabe Seal, tears open a jagged Celestial Rift & crashes a Colossal Dreadnought Sun-Meteor into a Laywaste of Inferno!',
    skills: [
      {
        name: 'HELIOS SOLAR SORCERY',
        type: '4-BEAT SOLAR ARTILLERY',
        vfxCell: 0,
        desc: '4-beat Crescent-Sun Staff magic circles launching blazing Solar Comets, remote Prominence Pillars & Arcane Blink kiting.'
      },
      {
        name: 'SOLAR TRINITY CATACLYSM',
        type: 'SKILL • 4.2S CD',
        vfxCell: 1,
        desc: 'Stamps 3 cascading Heliacal Rune Seals beneath the enemy that erupt braided Corona Pillars & astral star-glints.'
      },
      {
        name: 'BLACK-SUN ECLIPSE SINGULARITY',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Ignites a pixel-dithered Black-Sun Eclipse Ring overhead, raining 7 diagonal Solar Lances into a supernova shock-ring.'
      }
    ]
  },
  priestess_ex: {
    id: 'priestess_ex',
    name: 'SERAPHINA EX',
    role: 'SERAPHIC SOVEREIGN',
    style: 'SIX-WINGED CATHEDRAL ARCHPRIESTESS',
    trait: 'PASSIVE: SERAPHIM PINIONS & SANCTUARY AEGIS',
    cls: PriestessEx,
    theme: 'radiant',
    color: '#fde047',
    selectSfx: 'holy_heal',
    victoryLine: 'Six Seraphim pinions unfurl — every shadow bows before Final Grace!',
    trueUltName: 'FINAL GRACE: GENESIS LUMEN',
    trueUltDesc:
      'Consecrates a Stained-Glass Celestial Dome (+30% Max HP miracle) and fires a prismatic Horizon Purification Beam of Final Grace!',
    skills: [
      {
        name: 'CATHEDRAL SANCTUM SORCERY',
        type: '4-BEAT RADIANT SORCERY',
        vfxCell: 0,
        desc: '4-beat Cathedral Sanctum Sorcery firing Purifying Light Rays, Stained-Glass Rose Wards & winged grace kiting.'
      },
      {
        name: 'STAINED-GLASS BENEDICTION',
        type: 'SKILL • 4.8S CD',
        vfxCell: 1,
        desc: 'Consecrates a Rose-Cathedral floor prism that restores vitality while erupting 3 purifying judgment rays under the foe.'
      },
      {
        name: 'SERAPHIC ORGAN OF LIGHT',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Unfurls radiant Seraphim pinions to summon a 5-pillar Golden Cathedral Organ-of-Light & Descending Halo.'
      }
    ]
  },
  chronomancer_ex: {
    id: 'chronomancer_ex',
    name: 'CHRONOS EX',
    role: 'PARADOX SOVEREIGN',
    style: 'HOROLOGICAL GLAIVE DUELIST',
    trait: 'PASSIVE: TWELFTH-BELL ECHOES & REWIND',
    cls: ChronomancerEx,
    theme: 'chrono',
    color: '#2dd4bf',
    selectSfx: 'clock_gear',
    victoryLine: 'Past, present, and future kneel before the Paradox Sovereign!',
    trueUltName: 'ETERNAL ZERO: CATHEDRAL OF THE TWELFTH BELL',
    trueUltDesc:
      'Freezes foes in stopped time inside a Grand XII Astronomic Clockface & 8 Clock-Hand Spears, shattering time on the Twelfth Bell!',
    skills: [
      {
        name: 'CHRONO-GLAIVE QUARTET',
        type: '4-BEAT PARADOX SMEAR',
        vfxCell: 0,
        desc: '4-beat Twin-Hand Glaive cuts summoning Future-Clone pincer strikes & temporal shock-rings.'
      },
      {
        name: 'PARADOX HOURGLASS SCHISM',
        type: 'SKILL • 4.5S CD',
        vfxCell: 1,
        desc: 'Stamps a glowing Roman-Numeral XII Floor Dial, executes a Twin-Blade + Future-Clone pincer slice & rewinds through a temporal prism.'
      },
      {
        name: 'TRINITY OF BROKEN TIMELINES',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Splits into Past, Present & Future Chronos mirages around a giant Escapement Pendulum Seal for a 3-timeline shatter.'
      }
    ]
  },
  valkyrie_ex: {
    id: 'valkyrie_ex',
    name: 'FREYJA EX',
    role: 'RAGNAROK SOVEREIGN',
    style: 'VALHALLA SKY-JAVELIN SOVEREIGN',
    trait: 'PASSIVE: SIX-PINION GLIDE & GUNGNIR VOLLEY',
    cls: ValkyrieEx,
    theme: 'crimson',
    color: '#f43f5e',
    selectSfx: 'holy_spear',
    victoryLine: 'Behold the Ragnarok Sovereign — Gungnir cleaves the heavens asunder!',
    trueUltName: 'TWILIGHT OF RAGNAROK: BIFROST GUNGNIR',
    trueUltDesc:
      'Opens a multi-band Bifrost Sky-Gate, pins the arena with 8 Einherjar Runic Lances & executes a supersonic Valkyrie Falcon Dive!',
    skills: [
      {
        name: 'GUNGNIR LIGHTNING JAVELINS',
        type: '4-BEAT SKY-JAVELIN',
        vfxCell: 0,
        desc: '4-beat supersonic Gungnir Lightning Javelins, remote Valhalla Sky-Spears & 6-wing backstep-vault kiting.'
      },
      {
        name: 'VALHALLA LIGHTNING JAVELINS',
        type: 'SKILL • 4.7S CD',
        vfxCell: 1,
        desc: 'Winged sky-hop hurling 3 Crimson-Gold Gungnir Javelins that link with lightning chains and detonate.'
      },
      {
        name: 'BAHAMUT VALKYRIE SANCTUARY',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Ascends on 6 crimson-gold wings to summon the Bahamut Dragon-Crest & rain 5 converging Sky-Lances.'
      }
    ]
  },
  ronin_ex: {
    id: 'ronin_ex',
    name: 'KAZE-MARU EX',
    role: 'RAIJIN BLADE-GOD',
    style: 'NARUKAMI IAIDO SOVEREIGN',
    trait: 'PASSIVE: RAIJIN COUNTER-BLINK & SHEATH DETONATION',
    cls: RoninEx,
    theme: 'storm',
    color: '#60a5fa',
    selectSfx: 'slash',
    victoryLine: 'Thunder tolls only after the Raijin Odachi clicks home!',
    trueUltName: 'AMAKAKERU: REALM-SLICING SHOGUNATE',
    trueUltDesc:
      'Consecrates a Crimson-Moon Torii Sanctuary, carves a horizon Iaido fault-line & clicks his Odachi home to unleash Shogunate Judgement!',
    skills: [
      {
        name: 'NARUKAMI IAIDO QUARTET',
        type: '4-BEAT STORM IAIDO',
        vfxCell: 0,
        desc: '4-beat grounded Suriashi Odachi cuts launching crescent storm waves & Serene Mind counter-blinks.'
      },
      {
        name: 'NARUKAMI THUNDER-GATE FLASH',
        type: 'SKILL • 4.6S CD',
        vfxCell: 1,
        desc: 'Ignites 5 Raijin Taiko drums for a 5-point Shunpo lightning zig-zag & Torii thunder-pillars detonating on sheath-click.'
      },
      {
        name: 'TAKEMIKAZUCHI STORM-GOD CAGE',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Manifests an Indigo-Gold Raijin War-Mask & 8-drum Thunder Ring while flashing across 8 storm-pillar angles.'
      }
    ]
  },
  archer_ex: {
    id: 'archer_ex',
    name: 'SYLVARA EX',
    role: 'YGGDRASIL SOVEREIGN',
    style: 'YGGDRASIL STAR-HUNTRESS',
    trait: 'PASSIVE: WORLD-TREE ZEPHYR VAULT & SEEKERS',
    cls: ArcherEx,
    theme: 'emerald',
    color: '#34d399',
    selectSfx: 'arrow_shoot',
    victoryLine: 'Every star in Yggdrasil’s canopy bends to my bowstring!',
    trueUltName: 'ARROW OF YGGDRASIL: ASTRAL SUPERNOVA',
    trueUltDesc:
      'Manifests a luminous World-Tree Canopy & Zodiac Target Astrolabe before loosing a horizon-piercing Starlight Dragon-Lance!',
    skills: [
      {
        name: 'YGGDRASIL GREATBOW VOLLEY',
        type: '4-BEAT ASTRAL VOLLEY',
        vfxCell: 0,
        desc: '4-beat Yggdrasil Astral Greatbow volleys, homing emerald comet-shafts & Dragon-Piercer backstep-hop kiting.'
      },
      {
        name: 'STARWOOD CONSTELLATION VOLLEY',
        type: 'SKILL • 4.1S CD',
        vfxCell: 1,
        desc: 'Erupts an Emerald World-Tree Root Seal beneath foes while loosing 5 arcing Constellation Seeker Arrows.'
      },
      {
        name: 'ZEPHYR STARLOCK: TWELVE-STAR RAIN',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Vaults skyward on inverted Astral Light-Wings to rain 12 staggered Starlight Lance-Arrows across the arena.'
      }
    ]
  },
  reaper_ex: {
    id: 'reaper_ex',
    name: 'MALAKOR EX',
    role: 'THANATOS SOVEREIGN',
    style: 'ABYSSAL GREATSCYTHE & DEATH-STAND',
    trait: 'PASSIVE: SHADOW BURROW & THANATOS COVENANT',
    cls: ReaperEx,
    theme: 'abyssal',
    color: '#d946ef',
    selectSfx: 'scythe_reap',
    victoryLine: 'Kneel before the Thanatos Sovereign — Oblivion claims its tithe!',
    trueUltName: 'MEMENTO MORI: CATHEDRAL OF OBLIVION',
    trueUltDesc:
      'Unseals Twin Gothic Oblivion Gates, summons his 12.5s Death-Mage & Soul-Healer Covenant & drops a 6-Pillar Scythe Guillotine!',
    skills: [
      {
        name: 'THANATOS SCYTHE QUARTET',
        type: '4-BEAT STAND & BURROW',
        vfxCell: 0,
        desc: '4-beat violet-crimson Greatscythe reaps with Shadow-Burrow ambushes & Thanatos Stand strikes.'
      },
      {
        name: 'ABYSSAL SOUL-GUILLOTINE',
        type: 'SKILL • 4.5S CD',
        vfxCell: 1,
        desc: 'Tears a resonant Soul-Lantern Effigy out of the foe linked by a soul-chain before shadow-stepping into a Bone-Obelisk Guillotine.'
      },
      {
        name: 'LEGION OF THANATOS',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Rises beneath a Blood-Moon Eclipse Seal while the skeletal Thanatos Sovereign Stand & twin wraiths execute a 3-Scythe Reap.'
      }
    ]
  },
  titan_ex: {
    id: 'titan_ex',
    name: 'TORGAR EX',
    role: 'WORLD-BREAKER KING',
    style: 'KHAZAD GOD-FORGE MONARCH',
    trait: 'PASSIVE: MOLTEN POISE & CRUCIBLE CORES',
    cls: TitanEx,
    theme: 'forge',
    color: '#f59e0b',
    selectSfx: 'thunder_slam',
    victoryLine: 'Crowned in molten adamant — the World-Breaker King shatters mountains!',
    trueUltName: 'MJOLNIR GENESIS: CONTINENTAL SUNDER',
    trueUltDesc:
      'Awakens as a colossal World-Forge God-King — Sky-Uppercut into a Meteoric Mjolnir Ground-Anvil Smash & 5 Jade-Gold Lava Geysers!',
    skills: [
      {
        name: 'MJOLNIR KINGSMASH',
        type: '4-BEAT FORGE MAUL',
        vfxCell: 0,
        desc: '4-beat blunt 2H God-Hammer slams erupting tectonic fissures, molten slag sparks & unstoppable magma poise.'
      },
      {
        name: 'TECTONIC FORGE-ANVIL RICOCHET',
        type: 'SKILL • 4.7S CD',
        vfxCell: 1,
        desc: 'Slams a glowing Runic Dwarven Anvil Monolith that ricochets off the arena wall with molten fissures & jade shock-rings.'
      },
      {
        name: 'RAGNAROK GRAND-SLAM CRUSHER',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Ignites his Crucible Back-Halo for a seismic Maul eruption & World-Breaker Home-Run concussion blast into a wall-shatter stun.'
      }
    ]
  },
  icemage_ex: {
    id: 'icemage_ex',
    name: 'LYRA EX',
    role: 'BOREALIS SOVEREIGN',
    style: 'BOREALIS SCEPTER CRYOMANCER',
    trait: 'PASSIVE: 4-STACK CRYSTAL FREEZE & SKATE KITE',
    cls: IceMageEx,
    theme: 'glacial',
    color: '#67e8f9',
    selectSfx: 'frost_cast',
    victoryLine: 'Beneath the Borealis Crown, every heartbeat crystallizes at 0.00 Kelvin!',
    trueUltName: 'ETERNAL BOREALIS: ZERO KELVIN CATHEDRAL',
    trueUltDesc:
      'Unfurls the Northern Lights & 6-pillar Borealis Snowflake Sanctuary, entombs foes in a Diamond Monolith & shatters space at 0.00 K!',
    skills: [
      {
        name: 'BOREALIS SCEPTER SORCERY',
        type: '4-BEAT CRYO ARTILLERY',
        vfxCell: 0,
        desc: '4-beat Borealis Scepter Cryo-Comets, returning Snowflake Chakrams, marching Glacier Spires & Axel skate kiting.'
      },
      {
        name: 'BOREALIS PRISM JAWS',
        type: 'SKILL • 4.6S CD',
        vfxCell: 1,
        desc: 'Summons twin towering Aurora-Orchid & Cyan Ice-Monoliths flanking the foe that slam inward into a Diamond-Lotus Nova.'
      },
      {
        name: 'CORONATION OF NINE ICE-SWORDS',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Suspends 9 Celestial Diamond-Claymores in an Aurora Crown Halo, caging the foe in 8 outer blades before plunging the 9th Sovereign Blade.'
      }
    ]
  },
  android_ex: {
    id: 'android_ex',
    name: 'VEX-09 EX',
    role: 'SINGULARITY VALKYRIE',
    style: 'SERAPH-FRAME CYBER SOVEREIGN',
    trait: 'PASSIVE: QUANTUM HEX-AEGIS & FIN-FUNNELS',
    cls: AndroidEx,
    theme: 'cyber',
    color: '#00f0ff',
    selectSfx: 'cyber_slash',
    victoryLine: 'Singularity Frame VEX-09 EX online — orbital annihilation complete!',
    trueUltName: 'PROJECT GUNG-09: ORBITAL SINGULARITY BUSTER',
    trueUltDesc:
      'Locks foes inside an 8-Drone Hexagonal Cyber-Matrix Cage, opens an Orbital Relay Gate & fires a full-column Singularity Buster!',
    skills: [
      {
        name: 'POSITRON MURAMASA-09',
        type: '4-BEAT RAIL-ODACHI',
        vfxCell: 0,
        desc: '4-beat thruster-boosted Rail-Odachi cuts with Fin-Funnel plasma crossfire & Hex-Matrix parry.'
      },
      {
        name: 'SINGULARITY FUNNEL OVERDRIVE',
        type: 'SKILL • 4.3S CD',
        vfxCell: 1,
        desc: 'Deploys 4 Cyber Fin-Funnels in a diamond lock-on grid firing converging plasma beams into an EMP Odachi cross-cut (+32 HP shield).'
      },
      {
        name: 'VALKYRIE HYPER-PRISM BARRAGE',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Hovers on twin plasma wing-thrusters with a HUD target reticle, sweeping a Neon-Cyan & Hot-Magenta Visor Hyper-Laser + 6 Funnel strikes.'
      }
    ]
  },
  nyx_ex: {
    id: 'nyx_ex',
    name: 'NYX EX',
    role: 'NEBULA AI ASSISTANT',
    style: 'HOLO-UI & COB CREATOR SEAL',
    trait: 'PASSIVE: CTRL+Z GLITCH BLINK & AUTO-PATCH',
    cls: NyxEx,
    theme: 'nebula',
    color: '#c084fc',
    selectSfx: 'clock_gear',
    victoryLine: 'Prompt executed — Nyx & the Cob Creator Core render victory across the cosmos!',
    trueUltName: 'GENESIS PROMPT: POWERED BY COB',
    trueUltDesc:
      'Boots a colossal Cob Creator Core & cosmic sanctuary overhead before firing a horizon-piercing Nebula Supernova Beam!',
    skills: [
      {
        name: 'HOLO-PROMPT QUARTET',
        type: '4-BEAT HOLO ARTILLERY',
        vfxCell: 0,
        desc: '4-beat Star-Packet tap, Holo-Window fling, Pose-B 404 pop-up & [ENTER] Neko-AI Orb Nebula Laser + Ctrl+Z AFK Blink.'
      },
      {
        name: '404 POP-UP CASCADE',
        type: 'SKILL • 4.4S CD',
        vfxCell: 1,
        desc: 'Drags a Selection Box stacking 3 404 Pop-Up Windows, then stamps a glowing Cob Creator Seal (+Auto-Patch Holo-Shield).'
      },
      {
        name: 'COB-OS: STARLIGHT OVERCLOCK',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Summons a 6-Window Orbital Hologram Ring firing converging prism lasers into a central Cob Creator Holo-Crest burst.'
      }
    ]
  },
  archer: {
    id: 'archer',
    name: 'SYLVARA',
    role: 'STAR-HUNTRESS',
    style: 'RANGED MARKSMAN',
    trait: 'PASSIVE: ZEPHYR VAULT EVASION',
    cls: Archer,
    theme: 'emerald',
    color: '#34d399',
    selectSfx: 'arrow_shoot',
    victoryLine: 'Supersonic astral arrows pierce through the tempest!',
    trueUltName: 'ARROW OF YGGDRASIL: SUPERNOVA PIERCE',
    trueUltDesc:
      'Roots all enemies in Elder-Wood Yggdrasil Thorn-Cages, flip-jumps to the farthest edge of the stage, and fires a full-screen Supernova Dragon-Arrow!',
    skills: [
      {
        name: 'ASTRAL LONGBOW',
        type: 'AUTO + ZEPHYR VAULT',
        vfxCell: 0,
        desc: 'Fires Mach-ring piercing arrows, cloaks in a 2.5D Leaf-Veil Dome & vaults over foes.'
      },
      {
        name: 'VERDANT SNARE & SEEKERS',
        type: 'SKILL • 4.1S CD',
        vfxCell: 1,
        desc: 'Binds foes in sylvan starlight roots while launching homing astral seeker volleys from above.'
      },
      {
        name: 'ZEPHYR VAULT: 180° STARLOCK',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Charges into the enemy, vaults in a 180° overhead somersault flip, and fires 7 radial lock-on homing arrows around the 180° arc!'
      }
    ]
  },
  mage: {
    id: 'mage',
    name: 'IGNIS SOL',
    role: 'SOLAR ARCHMAGE',
    style: 'ARCANE ARTILLERY',
    trait: 'PASSIVE: ARCANE BLINK WARP',
    cls: FireMage,
    theme: 'arcane',
    color: '#fb923c',
    selectSfx: 'fireball',
    victoryLine: 'Cataclysmic solar fire reduces the arena to a Laywaste of Inferno!',
    trueUltName: 'CATACLYSM: LAYWASTE OF INFERNO',
    trueUltDesc:
      'Calls down a planetary extinction meteor with impact frame & scorches the arena into a Laywaste of Inferno!',
    skills: [
      {
        name: 'SOLAR FIREBALL',
        type: 'AUTO + PASSIVE',
        vfxCell: 2,
        desc: 'Launches explosive solar plasma orbs & teleports away from melee threats.'
      },
      {
        name: 'TRIPLE SOLAR PILLAR',
        type: 'SKILL • 4.1S CD',
        vfxCell: 1,
        desc: 'Erupts 3 sequential columns of molten hellfire beneath the enemy.'
      },
      {
        name: 'ASTRAL METEOR CATACLYSM',
        type: 'OVERDRIVE ULT',
        vfxCell: 0,
        desc: 'Ignites a Black-Sun Supernova overhead and hurls a colossal burning meteor into the arena.'
      }
    ]
  },
  priestess: {
    id: 'priestess',
    name: 'SERAPHINA',
    role: 'HIGH PRIESTESS',
    style: 'SANCTUARY WEAVER',
    trait: 'PASSIVE: SERAPHIC FLIGHT & GRACE COUNTER',
    cls: Priestess,
    theme: 'radiant',
    color: '#fde047',
    selectSfx: 'holy_heal',
    victoryLine: 'Sacred light and Final Grace purify the sanctuary!',
    trueUltName: 'FINAL GRACE',
    trueUltDesc:
      'Invulnerable 3s winged bloom charge (+30% Max HP heal) unleashing all absorbed damage in one purifying beam of Final Grace!',
    skills: [
      {
        name: 'SACRED STARLIGHT',
        type: 'AUTO + WING FLIGHT',
        vfxCell: 0,
        desc: 'Grounded star-cross casts, 2.5D Stained-Glass Rose Ward & winged cross-stage flight.'
      },
      {
        name: 'DIVINE SANCTUARY',
        type: 'SKILL • 5.0S CD',
        vfxCell: 1,
        desc: 'Consecrates a 2.5D Cathedral Seal, healing HP & smiting foes with Sanctum spires & Valkyrie spears.'
      },
      {
        name: 'SERAPHIC CATHEDRAL',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Ascends on radiant Seraphim wings, restoring sanctuary vitality while raining pillars of holy judgment.'
      }
    ]
  },
  reaper: {
    id: 'reaper',
    name: 'MALAKOR',
    role: 'ARCH-REAPER SOVEREIGN',
    style: 'SHADOW-BURROW & NECRO-COVENANT',
    trait: 'PASSIVE: ABYSSAL SHADOW BURROW & SURPRISE AMBUSH',
    cls: Reaper,
    theme: 'abyssal',
    color: '#d946ef',
    selectSfx: 'scythe_reap',
    victoryLine: 'From the pitch-black abyss, my Death Covenant claims your soul!',
    trueUltName: 'MEMENTO MORI: OBLIVION GUILLOTINE',
    trueUltDesc:
      'Unseals Twin Oblivion Gates to summon a 12.5s Death-Mage & Soul-Healer with Soul-Ward shields, ascends & cleaves reality!',
    skills: [
      {
        name: 'TRINITY & SHADOW BURROW',
        type: '3-HIT STAND & BURROW AMBUSH',
        vfxCell: 0,
        desc: 'Burrows 100% underground as a pitch-black shadow pool to erupt in a Surprise Attack + Grave-Ward poise, plus 3-hit Stand!'
      },
      {
        name: 'SOUL SEVER',
        type: 'SKILL • 4.5S CD',
        vfxCell: 1,
        desc: 'Rips a captive Soul Effigy from the foe that echoes resonance damage, then shadow-lunges for an X-Guillotine!'
      },
      {
        name: "DEATH'S SOVEREIGNTY",
        type: 'THANATOS OVERDRIVE',
        vfxCell: 3,
        desc: 'Unleashes Blood-Moon Thanatos Stand, vaults into a Sky-Lock suspension with Wraith Clones & slams a 5-spire Guillotine!'
      }
    ]
  },
  chronomancer: {
    id: 'chronomancer',
    name: 'CHRONOS',
    role: 'CLOCK-BLADE SOVEREIGN',
    style: 'TEMPORAL PARADOX BLADE',
    trait: 'PASSIVE: PARADOX CLONES & TIME REWIND',
    cls: Chronomancer,
    theme: 'chrono',
    color: '#2dd4bf',
    selectSfx: 'clock_gear',
    victoryLine: 'The Twelfth Bell tolls—every timeline converges in Eternal Zero!',
    trueUltName: 'ETERNAL ZERO: TWELFTH BELL',
    trueUltDesc:
      'Freezes all enemies in stopped time, surrounds them with 6 Clock-Hand Spears & shatters the timeline on the Twelfth Bell!',
    skills: [
      {
        name: 'TWIN HANDS OF FATE',
        type: '3-HIT BLADE & CLONE',
        vfxCell: 0,
        desc: 'Minute-Glaive sonic wave, Future-Clone pincer back-slash & XII-Chime scissor detonation!'
      },
      {
        name: 'CHRONO-SCHISM REWIND',
        type: 'SKILL • 4.6S CD',
        vfxCell: 1,
        desc: 'Drops a Past Anchor, warps in to carve an X-Rift & Stasis Field, then rewinds back restoring lost HP!'
      },
      {
        name: 'GRAND HOROLOGIUM',
        type: 'OVERDRIVE ULT',
        vfxCell: 3,
        desc: 'Manifests the Astral Clocktower dial & paradox echoes to cleave across converging timelines.'
      }
    ]
  },
  titan: {
    id: 'titan',
    name: 'TORGAR',
    role: 'SOVEREIGN OF THE WORLD-FORGE',
    style: 'COLOSSAL ANVIL JUGGERNAUT',
    trait: 'PASSIVE: MOLTEN CRUCIBLE CORES & MAGMA BULWARK',
    cls: Titan,
    theme: 'forge',
    color: '#f59e0b',
    selectSfx: 'thunder_slam',
    victoryLine: 'Tempered on the World-Anvil — God-Hammer Mjolnir sunders stone and steel alike!',
    trueUltName: 'GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER',
    trueUltDesc:
      'Grows colossal, hammers foes high into the sky, teleports to the top directly above them, and meteor-smashes them into the arena floor with a heavy stun!',
    skills: [
      {
        name: 'TRINITY OF THE WORLD-MAUL',
        type: '3-ANIMATION AUTO + ANCESTOR SLAM',
        vfxCell: 0,
        desc: '1: Overhead Earth-Splitter & Magnetic Fissure • 2: Leaping Sky-Breaker Uppercut • 3: Pivoting Battering-Ram Ancestor Slam!'
      },
      {
        name: 'WORLD-ANVIL CATACLYSM',
        type: 'SKILL • 4.8S CD',
        vfxCell: 1,
        desc: 'Plants a Gravity-Pulsing World-Anvil Altar, then hammers a Ricocheting Anvil Cannonball that rebounds off the arena wall!'
      },
      {
        name: 'WORLD-BREAKER HOME RUN',
        type: 'OVERDRIVE ULT',
        vfxCell: 4,
        desc: 'Swings his 2H World-Maul like a colossal baseball bat, blasting the enemy to the farthest side of the stage and stunning them for 0.8s!'
      }
    ]
  },
  ronin: {
    id: 'ronin',
    name: 'KAZE-MARU',
    role: 'STORMBLADE RONIN',
    style: 'IAIDO BLINK ASSASSIN',
    trait: 'PASSIVE: SERENE MIND COUNTER-BLINK',
    cls: Ronin,
    theme: 'storm',
    color: '#60a5fa',
    selectSfx: 'slash',
    victoryLine: 'You were already cut before the Odachi clicked back into its scabbard!',
    trueUltName: 'AMAKAKERU: THOUSAND THUNDER JUDGMENTS',
    trueUltDesc:
      'Draws the storm-odachi across reality in a thousand instantaneous thunder-cuts that detonate on the scabbard click!',
    skills: [
      {
        name: 'SANDAN IAIDO & COUNTER',
        type: 'AUTO + COUNTER-BLINK',
        vfxCell: 0,
        desc: 'Dashes through foes with Delayed Judgment-Cuts & teleports behind attackers on incoming strikes!'
      },
      {
        name: 'ZANTETSUKEN 5-FOLD FLASH',
        type: 'SKILL • 4.8S CD',
        vfxCell: 2,
        desc: 'Zig-zags across the enemy 5 times leaving suspended lightning lines that detonate on sheath-click!'
      },
      {
        name: 'SUSANOO OMNISLASH',
        type: 'OVERDRIVE ULT',
        vfxCell: 3,
        desc: 'Teleports around the airborne target for an 8-hit omnidirectional storm-slash cage.'
      }
    ]
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'FREYJA',
    role: 'DRAGON-LANCE VALKYRIE',
    style: 'VALHALLA SKY-SOVEREIGN',
    trait: 'PASSIVE: VALKYRIE WINGS & AERIAL BACKFLIP',
    cls: Valkyrie,
    theme: 'crimson',
    color: '#f43f5e',
    selectSfx: 'holy_spear',
    victoryLine: 'From the skies of Valhalla, Gungnir pierces the realm in Twilight of Ragnarok!',
    trueUltName: 'TWILIGHT OF RAGNAROK: GUNGNIR',
    trueUltDesc:
      'Ascends above Asgard on blazing Valkyrie wings and hurls the divine World-Spear Gungnir to sunder the realm!',
    skills: [
      {
        name: 'GUNGNIR LANCE & BACKFLIP',
        type: 'AUTO + AERIAL VAULT',
        vfxCell: 0,
        desc: 'Hurls curving Gungnir light-javelins & executes a -360° aerial backflip firing twin counter-spears.'
      },
      {
        name: 'GUNGNIR JAVELIN BARRAGE',
        type: 'SKILL • 5.0S CD',
        vfxCell: 1,
        desc: 'Skims across the arena unleashing a 6-javelin halo volley before erupting a Dragonfire Obelisk!'
      },
      {
        name: 'VALHALLA SKY-SANCTUARY',
        type: 'OVERDRIVE ULT',
        vfxCell: 3,
        desc: 'Sweeps across the heavens raining 12 Gungnir Light-Javelins before 5 Sovereign Judgment Obelisks!'
      }
    ]
  },
  icemage: {
    id: 'icemage',
    name: 'LYRA',
    role: 'WINTER EMPRESS',
    style: 'ROYAL BALLET CRYOMANCER',
    trait: 'PASSIVE: 4-STACK SOLID CRYSTAL FREEZE & SKY-STAIR',
    cls: IceMage,
    theme: 'glacial',
    color: '#67e8f9',
    selectSfx: 'frost_cast',
    victoryLine: 'At Absolute Zero, even reality shatters like stained glass into Diamond Dust!',
    trueUltName: 'ABSOLUTE ZERO: DIAMOND DUST ETERNITY',
    trueUltDesc:
      'Summons the Polar Night & Northern Lights, freezes reality to 0.00 K (-273.15°C) inside a Diamond-Lotus Monolith, and shatters space into 28 stained-glass ice shards!',
    skills: [
      {
        name: 'ROYAL BALLET OF RIME',
        type: '3-VARIANT AUTO + SKY-STAIR',
        vfxCell: 1,
        desc: '1: Rime-Lance Comet • 2: Returning 6-Bladed Snowflake Chakram • 3: 3-Spire Glacier Stalagmite March!'
      },
      {
        name: 'GLACIAL JAWS: ICEBERG CRUSH',
        type: 'SKILL • 4.7S CD',
        vfxCell: 2,
        desc: 'Erupts TWO towering flanking Glacier Iceberg Walls around the enemy and slams both icebergs inward together!'
      },
      {
        name: 'WINTER CORONATION',
        type: 'OVERDRIVE ULT',
        vfxCell: 4,
        desc: 'Rains 6 Giant Celestial Ice-Claymores to cage the foe in a sword palisade before a colossal 7th Sovereign Crown-Sword shatters all 7!'
      }
    ]
  },
  android: {
    id: 'android',
    name: 'VEX-09',
    role: 'CYBER VALKYRIE',
    style: 'CYBERNETIC VALKYRIE • SKIRMISHER',
    trait: 'PASSIVE: HEX MATRIX DEFLECT',
    cls: Android,
    theme: 'cyber',
    color: '#00f0ff',
    selectSfx: 'cyber_slash',
    victoryLine: 'Project GUNG-09 orbital lock confirmed — target eradicated at maximum output!',
    trueUltName: 'PROJECT GUNG-09: ORBITAL SATELLITE BUSTER',
    trueUltDesc:
      'Paints the arena with an orbital targeting matrix and calls down a full-stage Project GUNG-09 satellite plasma beam!',
    skills: [
      {
        name: 'MURAMASA-09 ODACHI',
        type: 'AUTO + HEX DEFLECT',
        vfxCell: 0,
        desc: 'Thruster-steps into point-blank contact with a 3-form Split-Lunge, High-Knee Dragon Slash & Fang Slam combo.'
      },
      {
        name: 'EMP OVERLOAD BLITZ',
        type: 'SKILL • 4.3S CD',
        vfxCell: 1,
        desc: 'Locks onto foes with a holographic scanner, jetpack-rushes through, and detonates a scanline EMP dome.'
      },
      {
        name: 'VALKYRIE VISOR HYPER-LASER',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Boosts backward away from danger, deploys a 4-Funnel Optical Ring around her head, and fires a searing Face-Visor Laser!'
      }
    ]
  }
};

export class Game {
  constructor() {
    this.canvas = document.getElementById('arena-canvas');
    this.renderer = new Renderer(this.canvas);
    this.vfx = new VFXManager();
    this.audio = new AudioManager();
    PixelForge.initAssets();
    this.adventure = new AdventureManager(this);

    this.userSlowMo = false;
    this.autoTourney = true;
    this.winStreak = 0;
    this.reigningHero = null;
    this.ultSlowTimer = 0;
    this.koSlowTimer = 0;
    this.clashCooldown = 0;
    this.stageEventTriggered = false;
    this.stageEventTimer = 0;
    this.stageEventTickTimer = 0;
    this.team1TagCd = 2.5;
    this.team2TagCd = 2.5;
    this.team1AssistCd = 3.2;
    this.team2AssistCd = 3.8;
    this.matchTime = 0;
    this.hudTimer = 0;
    this.isMatchOver = false;
    this.victoryRevealPending = false;
    this.deadMatchFighter = null;
    this.postDeathHoldTimer = 0;
    this.matchOverSafetyTimer = 0;
    this.fighters = [];
    this.leftFighter = null;
    this.rightFighter = null;
    this.leftPartner = null;
    this.rightPartner = null;
    this._pausedFrameRendered = false;
    this._lastPreviewMs = 0;

    // Default Versus Mode (`1v1` Sovereign Duel; `2v2_tag` = Tag VS; `adventure` = Solo Campaign):
    this.rosterVersion = 'ex'; // 'ex' (Neo-Vision 11) | 'legacy' (Classic 11)
    this.gameMode = '1v1'; // '1v1' | '2v2_tag' | '2v2_brawl' | 'adventure'
    this.slot1Hero = 'warrior_ex';
    this.slot1PartnerHero = 'titan_ex';
    this.slot2Hero = 'reaper_ex';
    this.slot2PartnerHero = 'mage_ex';
    this.inspectLeftRole = 'lead'; // 'lead' | 'partner'
    this.inspectRightRole = 'lead'; // 'partner' | 'lead'
    this.activeAssignSlot = 2; // 1 = P1 Lead, 2 = P2 Lead, 3 = P1B Partner, 4 = P2B Partner
    this.isLandingOpen = true;
    this.isPaused = false;
    this.landingStep = 'title'; // 'title' | 'mode' | 'roster'

    const params = new URLSearchParams(window.location.search);
    const versionParam = params.get('version');
    if (versionParam === 'legacy') {
      this.rosterVersion = 'legacy';
      this.slot1Hero = 'warrior';
      this.slot1PartnerHero = 'titan';
      this.slot2Hero = 'reaper';
      this.slot2PartnerHero = 'mage';
    } else if (versionParam === 'ex') {
      this.rosterVersion = 'ex';
    }
    const stepParam = params.get('step');
    if (stepParam === 'title' || stepParam === 'mode' || stepParam === 'roster') {
      this.landingStep = stepParam;
    } else if (params.get('roster')) {
      this.landingStep = 'roster';
    }
    const testModeParam = params.get('testmode');
    this.explicitAdvUnlimitedHp = testModeParam === '1' || testModeParam === 'true';
    this.testModeUnlimitedHp = testModeParam === '1' || testModeParam === 'true';
    this.vsTestModeUnlimitedHp = this.testModeUnlimitedHp;
    this.forcedStage = params.get('stage') || null;
    const modeParam = params.get('mode');
    if (modeParam === '1v1' || modeParam === 'duel') {
      this.gameMode = '1v1';
    } else if (modeParam === '2v2_tag' || modeParam === 'tag') {
      this.gameMode = '2v2_tag';
    } else if (modeParam === '2v2_brawl' || modeParam === '2v2' || modeParam === 'brawl') {
      this.gameMode = '2v2_brawl';
    } else if (modeParam === 'adventure' || modeParam === 'campaign') {
      this.gameMode = 'adventure';
      this.slot1Hero = this.rosterVersion === 'legacy' ? 'mage' : 'warrior_ex';
      this.activeAssignSlot = 1;
      this.testModeUnlimitedHp = Boolean(this.explicitAdvUnlimitedHp);
    }
    if (params.get('autoplay') === '1') {
      this.adventure.setAutoPlay(true, false);
    }

    const p1 = params.get('p1');
    const p1b = params.get('p1b');
    const p2 = params.get('p2');
    const p2b = params.get('p2b');
    const urlHero = params.get('hero');
    const rosterHero = params.get('roster');
    if (rosterHero && CHAMPION_ROSTER[rosterHero]) {
      this.slot1Hero = rosterHero;
      if (!versionParam) {
        this.rosterVersion = rosterHero.endsWith('_ex') ? 'ex' : 'legacy';
      }
    }
    if (p1 && CHAMPION_ROSTER[p1]) this.slot1Hero = p1;
    if (p1b && CHAMPION_ROSTER[p1b]) this.slot1PartnerHero = p1b;
    if (p2 && CHAMPION_ROSTER[p2]) this.slot2Hero = p2;
    if (p2b && CHAMPION_ROSTER[p2b]) this.slot2PartnerHero = p2b;
    if (urlHero && CHAMPION_ROSTER[urlHero]) {
      this.slot1Hero = urlHero;
      this.slot2Hero = urlHero.endsWith('_ex')
        ? urlHero === 'archer_ex'
          ? 'mage_ex'
          : 'archer_ex'
        : urlHero === 'archer'
          ? 'mage'
          : 'archer';
    }
    const landscapeParam = params.get('landscape');
    this.forceMobileLandscapeParam = landscapeParam === '1' || landscapeParam === 'true';
    // Portrait / native device orientation is the default; Landscape is opt-in via button or ?landscape=1
    this.mobileLandscapeEnabled = Boolean(this.forceMobileLandscapeParam);

    this.ensureDistinctTeamPartners();

    this.syncMobileLandscapeViewport();
    this.bindUI();
    this.setLandingStep(this.landingStep, false);
    this.syncRosterSelectionUI(false);

    const simSec = Number(params.get('sim') || 0);
    const killTarget = params.get('kill');
    const ultParam = params.get('ult');
    const forceUlt = ultParam === '1' || ultParam === 'both';
    const forceTrueUlt = params.get('trueult') === '1';
    const skillParam = params.get('skill');
    const forceSkill = skillParam === '1' || skillParam === 'both';
    const forceCrouch = params.get('crouch') === '1';
    const forceJump = params.get('jump') === '1';
    const forceWalk = params.get('walk') === '1';
    const forceAttack = params.get('attack') === '1';
    const forceCorner = params.get('corner') === '1';
    const forceClash = params.get('clash') === '1';
    const forceEvent = params.get('event') === '1';
    const forceTagSwap = params.get('tagswap') === '1';
    const forceAssist = params.get('assist') === '1';
    const startArena = params.get('battle') === '1';
    this.isSimPaused = params.get('pause') === '1';
    if (
      (modeParam && this.isAdventureMode()) ||
      p1 ||
      p1b ||
      p2 ||
      p2b ||
      urlHero ||
      startArena ||
      this.forcedStage ||
      simSec > 0 ||
      killTarget ||
      forceUlt ||
      forceTrueUlt ||
      forceSkill ||
      forceCrouch ||
      forceJump ||
      forceWalk ||
      forceAttack ||
      forceCorner ||
      forceClash ||
      forceEvent ||
      forceTagSwap ||
      forceAssist
    ) {
      this.syncRosterSelectionUI(false);
      this.startDuel(false);
    }

    if (forceWalk) {
      this.leftFighter.x = 220;
      this.rightFighter.x = 960;
      this.leftFighter.dashCooldown = 10;
      this.leftFighter.skillCooldown = 10;
      this.leftFighter.autoCooldown = 10;
      this.rightFighter.dashCooldown = 10;
      this.rightFighter.skillCooldown = 10;
      this.rightFighter.autoCooldown = 10;
      this.leftFighter.setState('WALK');
      this.rightFighter.setState('WALK');
    }

    if (forceCrouch && this.leftFighter.startCrouch) {
      this.leftFighter.x = 340;
      this.rightFighter.x = 760;
      this.leftFighter.startCrouch(this.rightFighter, this);
    }

    if (forceJump && this.leftFighter.startJump) {
      this.leftFighter.x = 360;
      this.rightFighter.x = 680;
      this.leftFighter.startJump(this.rightFighter, this, 1);
    }

    if (forceAttack) {
      this.leftFighter.x = 360;
      this.rightFighter.x = 740;
      this.leftFighter.setState('AUTO_ATTACK');
    }

    if (forceEvent) {
      this.triggerStagePhenomenon();
    }

    if (forceTagSwap) {
      this.triggerTeamTagSwap(1, true);
    }

    if (forceAssist) {
      this.triggerTeamAssist(1, true);
    }

    if (forceClash) {
      this.leftFighter.x = 340;
      this.rightFighter.x = 860;
      this.vfx.spawnProjectile({
        x: 565,
        y: this.renderer.groundY - 105,
        vx: 520,
        vy: 0,
        radius: 26,
        color: this.leftFighter.primaryColor,
        damage: 90,
        owner: this.leftFighter,
        type: 'blade_wave'
      });
      this.vfx.spawnProjectile({
        x: 635,
        y: this.renderer.groundY - 105,
        vx: -520,
        vy: 0,
        radius: 26,
        color: this.rightFighter.primaryColor,
        damage: 90,
        owner: this.rightFighter,
        type: 'fireball'
      });
    }

    if (forceCorner) {
      this.leftFighter.x = 105;
      this.leftFighter.dodgeCooldown = 0;
      this.leftFighter.wallWingCooldown = 0;
      this.rightFighter.x = 265;
      this.rightFighter.setState('AUTO_ATTACK');
    }

    if (forceSkill) {
      this.leftFighter.x = 390;
      this.rightFighter.x = 690;
      this.leftFighter.skillCooldown = 0;
      this.leftFighter.setState('SKILL');
      if (skillParam === 'both') {
        this.rightFighter.skillCooldown = 0;
        this.rightFighter.setState('SKILL');
        if (this.leftPartner && !this.leftPartner.isBenched) {
          this.leftPartner.skillCooldown = 0;
          this.leftPartner.setState('AUTO_ATTACK');
        }
        if (this.rightPartner && !this.rightPartner.isBenched) {
          this.rightPartner.skillCooldown = 0;
          this.rightPartner.setState('AUTO_ATTACK');
        }
      }
    }

    if (forceUlt) {
      this.leftFighter.x = 410;
      this.rightFighter.x = 710;
      this.leftFighter.mana = this.leftFighter.maxMana;
      if (ultParam === 'both') {
        this.rightFighter.mana = this.rightFighter.maxMana;
      }
    }

    if (forceTrueUlt && this.leftFighter) {
      this.leftFighter.x = 380;
      this.rightFighter.x = 740;
      this.leftFighter.finisherGauge = this.leftFighter.maxFinisherGauge;
    }

    if (simSec > 0) {
      const steps = Math.round(simSec / 0.02);
      for (let i = 0; i < steps; i++) {
        this.ultSlowTimer = 0;
        this.renderer.hitStopTimer = 0;
        this.stepSimulation(0.02);
      }
      this.updateHUD();
    }
    if (killTarget) {
      const victim =
        killTarget === 'left' || killTarget === this.slot1Hero ? this.leftFighter : this.rightFighter;
      const attacker = victim === this.leftFighter ? this.rightFighter : this.leftFighter;
      victim.takeDamage(9999, attacker, true, 120, 0);
      if (this.is2v2Mode()) {
        const partnerVictim = victim === this.leftFighter ? this.leftPartner : this.rightPartner;
        if (partnerVictim && !partnerVictim.isDead) {
          partnerVictim.isBenched = false;
          partnerVictim.takeDamage(9999, attacker, true, 120, 0);
        }
      }
      const dtSec = Number(params.get('dt') || 1.2);
      const steps = Math.floor(dtSec / 0.02);
      for (let i = 0; i < steps; i++) {
        this.renderer.hitStopTimer = 0;
        this.stepSimulation(0.02);
      }
      if (params.get('victory') === '1') {
        this.victoryOverlay.classList.remove('hidden');
      }
      this.updateHUD();
    }

    this._boundLoop = (t) => this.loop(t);
    this._rafId = 0;
    this._lastPacedTime = 0;
    this._appSuspended = false;
    this._autoNextRemainingMs = 0;
    this._autoNextDeadlineMs = 0;
    this._activeFightersScratch = [];
    this._lastActiveVsStageId = null;
    this._wasAdventureMatch = false;
    this._matchAssetGateUntil = 0;
    this.installVisibilityAndThermalLifecycle();

    this.lastTime = 0;
    this.startLoop();
    if (typeof window !== 'undefined' && typeof HTMLImageElement !== 'undefined' && !this.simMode) {
      setTimeout(() => this.prewarmSelectedAssets(), 160);
    }
  }

  installVisibilityAndThermalLifecycle() {
    if (typeof window !== 'undefined') {
      window.__avsGame = this;
      window.__avsSetAppActive = (active) => this.setAppForegroundState(Boolean(active));
      window.addEventListener('pagehide', () => this.setAppForegroundState(false));
      window.addEventListener('pageshow', () => {
        const hidden = typeof document !== 'undefined' && Boolean(document.hidden);
        if (!hidden) {
          this.setAppForegroundState(true);
        }
      });
      window.addEventListener('focus', () => {
        const hidden = typeof document !== 'undefined' && Boolean(document.hidden);
        if (!hidden) {
          this.setAppForegroundState(true);
        }
      });
      const isTouchMobile =
        Boolean(this.renderer?.isMobile) ||
        (typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0);
      if (isTouchMobile) {
        window.addEventListener('blur', () => {
          // Only suspend if the document is actually hidden/backgrounded (never on transient iOS overlays!)
          if (typeof document !== 'undefined' && Boolean(document.hidden)) {
            this.setAppForegroundState(false);
          }
        });
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.setAppForegroundState(false);
        } else {
          this.setAppForegroundState(true);
        }
      });
      if (document.hidden) {
        this._appSuspended = true;
        this.audio?.suspendForBackground?.();
      }
    }
  }

  startLoop() {
    if (this._appSuspended || this._rafId) return;
    if (typeof requestAnimationFrame === 'function') {
      this._rafId = requestAnimationFrame(this._boundLoop);
    }
  }

  stopLoop() {
    if (this._rafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
    }
    this._rafId = 0;
  }

  _scheduleAutoNext(delayMs = 4200) {
    clearTimeout(this.autoNextTimeout);
    this._autoNextRemainingMs = 0;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._autoNextDeadlineMs = nowMs + delayMs;
    this.autoNextTimeout = setTimeout(() => {
      this.autoNextTimeout = null;
      this._autoNextDeadlineMs = 0;
      if (
        !this._appSuspended &&
        this.isMatchOver &&
        this.autoTourney &&
        !this.isAdventureMode() &&
        !this.isLandingOpen &&
        !this.isSimPaused
      ) {
        this.advanceTourneyChallenger();
      }
    }, delayMs);
  }

  setAppForegroundState(active) {
    const nextActive = Boolean(active);
    if (!nextActive) {
      if (this._appSuspended) {
        this.audio?.suspendForBackground?.();
        return;
      }
      this._appSuspended = true;
      this.stopLoop();
      this.adventure?.clearHeldInputs?.();
      this.audio?.suspendForBackground?.();
      if (this.autoNextTimeout) {
        const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this._autoNextRemainingMs = Math.max(250, (this._autoNextDeadlineMs || nowMs + 1000) - nowMs);
        clearTimeout(this.autoNextTimeout);
        this.autoNextTimeout = null;
      }
      return;
    }

    if (!this._appSuspended) {
      this.audio?.resumeFromBackground?.();
      this.startLoop();
      return;
    }
    this._appSuspended = false;
    this.lastTime = 0;
    this._lastPacedTime = 0;
    this._pausedFrameRendered = false;
    this.audio?.resumeFromBackground?.();
    if (
      this._autoNextRemainingMs > 0 &&
      this.isMatchOver &&
      this.autoTourney &&
      !this.isAdventureMode() &&
      !this.isLandingOpen &&
      !this.isSimPaused
    ) {
      const resumeDelay = this._autoNextRemainingMs;
      this._autoNextRemainingMs = 0;
      this._scheduleAutoNext(resumeDelay);
    } else {
      this._autoNextRemainingMs = 0;
    }
    this.startLoop();
  }

  is2v2Mode() {
    return this.gameMode === '2v2_brawl' || this.gameMode === '2v2_tag';
  }

  isAdventureMode() {
    return this.gameMode === 'adventure';
  }

  getActiveRosterPool() {
    return this.rosterVersion === 'legacy' ? LEGACY_HERO_KEYS : EX_HERO_KEYS;
  }

  syncRosterVersionTabs() {
    const activeVer = this.rosterVersion === 'legacy' ? 'legacy' : 'ex';
    if (this.btnRosterVersionEx) {
      const isEx = activeVer === 'ex';
      this.btnRosterVersionEx.classList.toggle('active-version-tab', isEx);
      this.btnRosterVersionEx.setAttribute('aria-selected', String(isEx));
    }
    if (this.btnRosterVersionLegacy) {
      const isLegacy = activeVer === 'legacy';
      this.btnRosterVersionLegacy.classList.toggle('active-version-tab', isLegacy);
      this.btnRosterVersionLegacy.setAttribute('aria-selected', String(isLegacy));
    }
    if (this.cards) {
      Object.entries(this.cards).forEach(([heroKey, cardEl]) => {
        if (!cardEl) return;
        const cardGroup =
          cardEl.getAttribute?.('data-roster-group') ||
          (heroKey.endsWith('_ex') ? 'ex' : 'legacy');
        const visible = cardGroup === activeVer;
        cardEl.classList.toggle('roster-group-hidden', !visible);
        cardEl.hidden = !visible;
      });
    }
  }

  setRosterVersion(version, playSound = true) {
    const nextVer = version === 'legacy' ? 'legacy' : 'ex';
    this.rosterVersion = nextVer;
    this.syncRosterVersionTabs();
    if (this.landingStep === 'roster') {
      PixelForge.ensureAllPortraitsLoaded?.(this.rosterVersion);
    }
    this.syncRosterSelectionUI(false);
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
  }

  ensureDistinctTeamPartners() {
    const keys = this.getActiveRosterPool();
    if (this.slot1PartnerHero === this.slot1Hero) {
      this.slot1PartnerHero =
        keys.find((k) => k !== this.slot1Hero && k !== this.slot2Hero) ||
        (this.rosterVersion === 'legacy' ? 'priestess' : 'priestess_ex');
    }
    if (this.slot2PartnerHero === this.slot2Hero) {
      this.slot2PartnerHero =
        keys.find((k) => k !== this.slot2Hero && k !== this.slot1Hero) ||
        (this.rosterVersion === 'legacy' ? 'reaper' : 'reaper_ex');
    }
  }

  syncMobileFullZoomUI() {
    const active = Boolean(this.renderer?.mobileFullZoomOut ?? true);
    if (this.btnPauseFullZoom) {
      this.btnPauseFullZoom.classList.toggle('active-zoom-toggle', active);
      this.btnPauseFullZoom.setAttribute('aria-pressed', String(active));
    }
    if (this.pauseFullZoomLabel) {
      this.pauseFullZoomLabel.textContent = active ? 'FULL ZOOM: ON' : 'FULL ZOOM: OFF';
    }
  }

  setMobileFullZoomOut(enabled, playSound = true) {
    const nextVal = Boolean(enabled);
    this.renderer?.setMobileFullZoomOut?.(nextVal);
    if (this.fighters && this.renderer) {
      this.renderer.update(0, this.fighters);
    }
    this._pausedFrameRendered = false;
    this.syncMobileFullZoomUI();
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
  }

  toggleMobileFullZoomOut(playSound = true) {
    const cur = Boolean(this.renderer?.mobileFullZoomOut ?? true);
    this.setMobileFullZoomOut(!cur, playSound);
  }

  syncPauseMenuUI() {
    const isAdv = this.isAdventureMode();
    const subtitleEl = document.getElementById('pause-mode-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = isAdv
        ? 'SOLO ADVENTURE CAMPAIGN'
        : this.gameMode === '2v2_brawl'
          ? '2V2 CHAOS BRAWL'
          : this.gameMode === '2v2_tag'
            ? 'TAG VS'
            : '1V1 SOVEREIGN DUEL';
    }
    this.pauseVsSection?.classList.toggle('hidden', isAdv);
    this.pauseAdvSection?.classList.toggle('hidden', !isAdv);
    this.syncMobileFullZoomUI();
    const showPause = Boolean(this.isPaused && !this.isLandingOpen);
    this.pauseModal?.classList.toggle('hidden', !showPause);
    this.btnGamePause?.setAttribute('aria-expanded', String(showPause));
    this.appEl?.classList.toggle('is-game-paused', showPause);
  }

  setPaused(paused, playSound = true) {
    let nextPaused = Boolean(paused);
    const victoryOpen = Boolean(
      this.victoryOverlay && !this.victoryOverlay.classList.contains('hidden')
    );
    if (nextPaused && (this.isLandingOpen || victoryOpen)) {
      nextPaused = false;
    }
    if (nextPaused && this.isAdventureMode() && this.adventure?.isSkillTreeOpen) {
      this.adventure.closeSkillTree(false);
    }
    const changed = this.isPaused !== nextPaused;
    this.isPaused = nextPaused;
    if (changed) {
      this._pausedFrameRendered = false;
    }
    if (nextPaused) {
      this.adventure?.clearHeldInputs();
    }
    this.syncPauseMenuUI();
    if (changed && playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
  }

  togglePause(playSound = true) {
    this.setPaused(!this.isPaused, playSound);
  }

  disposeActiveFighterResources() {
    if (Array.isArray(this.fighters)) {
      for (const f of this.fighters) {
        f?.fx?.dispose?.();
      }
    }
    this.leftFighter?.fx?.dispose?.();
    this.rightFighter?.fx?.dispose?.();
    this.leftPartner?.fx?.dispose?.();
    this.rightPartner?.fx?.dispose?.();
  }

  teardownActiveMatch(releaseMemory = false) {
    clearTimeout(this.victoryTimeout);
    clearTimeout(this.autoNextTimeout);
    clearTimeout(this.ultBannerTimeout);
    this.autoNextTimeout = null;
    this._autoNextRemainingMs = 0;
    this._autoNextDeadlineMs = 0;
    if (this.adventure?.active) {
      this.adventure.stopCampaign();
    } else {
      this.adventure?.clearHeldInputs?.();
    }
    this.disposeActiveFighterResources();
    this.vfx?.clear?.();
    this.fighters = [];
    this.leftFighter = null;
    this.rightFighter = null;
    this.leftPartner = null;
    this.rightPartner = null;
    this.isMatchOver = false;
    this.victoryRevealPending = false;
    this.deadMatchFighter = null;
    this.postDeathHoldTimer = 0;
    this.matchOverSafetyTimer = 0;
    this._pausedFrameRendered = false;
    this.victoryOverlay?.classList.remove('is-defeat-plaque');
    this.victoryOverlay?.classList.add('hidden');
    if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'ROSTER SELECT';
    if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';
    if (this.ultBanner) this.ultBanner.classList.add('hidden');
    this.appEl?.classList?.toggle('is-adventure-active', Boolean(this.isAdventureMode() && !this.isLandingOpen));
    this.updateAdventureBossHUD?.();
    if (releaseMemory) {
      this._matchAssetGateUntil = 0;
      this.renderer?.releaseStageCutoutCaches?.(true);
      PixelForge.releaseInactiveAssets?.([], [], false);
      ArcaneShaderFX.releaseSharedCanvases?.();
      this._lastActiveVsStageId = null;
      this._wasAdventureMatch = false;
    }
  }

  goToTitleScreen(playSound = true) {
    this.setPaused(false, false);
    this.teardownActiveMatch(true);
    this.openLanding('title');
    if (typeof window !== 'undefined' && typeof HTMLImageElement !== 'undefined' && !this.simMode) {
      setTimeout(() => this.prewarmSelectedAssets(), 150);
    }
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
  }

  _getActiveMatchAssetOpts() {
    if (this.isAdventureMode()) {
      return {
        heroIds: [this.slot1Hero || 'mage'],
        stageId: null,
        isAdventure: true,
        zoneIdx: this.adventure?.zoneIndex || 0
      };
    }
    const heroIds = [this.slot1Hero, this.slot2Hero];
    if (this.is2v2Mode()) {
      heroIds.push(this.slot1PartnerHero, this.slot2PartnerHero);
    }
    return {
      heroIds: heroIds.filter(Boolean),
      stageId: this.renderer?.stageId || this.forcedStage || 'cathedral',
      isAdventure: false,
      zoneIdx: 0
    };
  }

  prewarmSelectedAssets() {
    if (typeof HTMLImageElement === 'undefined') return;
    if (this.isAdventureMode()) {
      PixelForge.ensureHeroLoaded?.(this.slot1Hero || 'warrior_ex');
      PixelForge.ensureAdventureLoaded?.(0);
      return;
    }
    PixelForge.ensureStageLoaded?.(this.forcedStage || this.renderer?.stageId || 'cathedral');
    PixelForge.ensureHeroLoaded?.(this.slot1Hero);
    PixelForge.ensureHeroLoaded?.(this.slot2Hero);
    if (this.is2v2Mode()) {
      PixelForge.ensureHeroLoaded?.(this.slot1PartnerHero);
      PixelForge.ensureHeroLoaded?.(this.slot2PartnerHero);
    }
  }

  syncLandingBranchUI() {
    const isAdv = this.isAdventureMode();
    const onTitle = this.landingStep === 'title';
    const branch = onTitle ? 'title' : isAdv ? 'adventure' : 'vs';
    if (this.landingOverlay) {
      this.landingOverlay.setAttribute('data-branch', isAdv ? 'adventure' : 'vs');
    }
    const navEl = document.querySelector('.arcade-step-nav');
    if (navEl) {
      navEl.setAttribute('data-branch', branch);
    }

    const stepDividerMode = document.getElementById('step-divider-mode');
    const stepTabMode = document.getElementById('step-tab-mode');
    const stepDividerRoster = document.getElementById('step-divider-roster');
    const stepTabRoster = document.getElementById('step-tab-roster');
    if (stepDividerMode) stepDividerMode.hidden = onTitle || isAdv;
    if (stepTabMode) stepTabMode.hidden = onTitle || isAdv;
    if (stepDividerRoster) stepDividerRoster.hidden = onTitle;
    if (stepTabRoster) stepTabRoster.hidden = onTitle;

    const stepNumRoster = document.getElementById('step-num-roster');
    const stepLabelRoster = document.getElementById('step-label-roster');
    if (stepNumRoster) stepNumRoster.textContent = isAdv ? '01' : '02';
    if (stepLabelRoster) stepLabelRoster.textContent = isAdv ? 'HERO SELECT' : 'CHAMPION SELECT';

    const btnNavCommence = document.getElementById('btn-nav-commence');
    const navCommenceLabel = document.getElementById('nav-commence-label');
    if (btnNavCommence) btnNavCommence.classList.toggle('hidden', onTitle);
    if (navCommenceLabel) {
      navCommenceLabel.textContent = isAdv ? 'START CAMPAIGN' : 'START MATCH';
    }

    const rosterBackLabel = document.getElementById('roster-back-label');
    if (rosterBackLabel) {
      rosterBackLabel.textContent = isAdv ? 'TITLE SCREEN' : 'VS SETUP';
    }
    const ctaHeadline = document.getElementById('cta-headline-text');
    if (ctaHeadline) {
      ctaHeadline.textContent = isAdv ? 'EMBARK ON CAMPAIGN' : 'COMMENCE BATTLE';
    }
    const rosterConfigBadge = document.getElementById('btn-roster-config-badge');
    if (rosterConfigBadge) {
      rosterConfigBadge.disabled = isAdv;
      rosterConfigBadge.setAttribute('aria-disabled', String(isAdv));
    }
  }

  setGameMode(mode, playSound = true) {
    if (!['1v1', '2v2_brawl', '2v2_tag', 'adventure'].includes(mode)) return;
    this.setPaused(false, false);
    this.gameMode = mode;
    this.testModeUnlimitedHp =
      mode === 'adventure'
        ? Boolean(this.explicitAdvUnlimitedHp)
        : Boolean(this.vsTestModeUnlimitedHp);
    if (mode === 'adventure') {
      if (!CHAMPION_ROSTER[this.slot1Hero]) {
        this.slot1Hero = this.rosterVersion === 'legacy' ? 'mage' : 'warrior_ex';
      }
      this.inspectLeftRole = 'lead';
      this.inspectRightRole = 'lead';
      this.activeAssignSlot = 1;
    } else if (!this.is2v2Mode()) {
      this.inspectLeftRole = 'lead';
      this.inspectRightRole = 'lead';
      if (this.activeAssignSlot > 2) this.activeAssignSlot = 1;
    } else {
      this.ensureDistinctTeamPartners();
    }
    this.syncLandingBranchUI();
    this.syncRosterSelectionUI(playSound);
    this.prewarmSelectedAssets();
    if (!this.isLandingOpen) {
      this.resetMatch();
    }
    this.adventure?.syncControlDeckUI();
    this.syncPauseMenuUI();
  }

  cycleGameMode() {
    const order = ['1v1', '2v2_tag'];
    const curIdx = order.indexOf(this.gameMode);
    const next = order[(curIdx >= 0 ? curIdx + 1 : 0) % order.length];
    this.setPaused(false, false);
    this.setGameMode(next, true);
  }

  formatModeBadgeText() {
    const base =
      this.gameMode === 'adventure'
        ? 'ADVENTURE'
        : this.gameMode === '2v2_brawl'
          ? 'CHAOS BRAWL'
          : this.gameMode === '2v2_tag'
            ? 'TAG VS'
            : '1V1 DUEL';
    return this.testModeUnlimitedHp && !this.isAdventureMode() ? `${base} • UNLIMITED HP` : base;
  }

  syncTestModeUI() {
    const active = Boolean(this.isAdventureMode() ? this.testModeUnlimitedHp : this.vsTestModeUnlimitedHp);
    if (this.landingBtnTestMode) {
      this.landingBtnTestMode.classList.toggle('active-test-mode', active);
      this.landingBtnTestMode.setAttribute('aria-pressed', String(active));
    }
    if (this.landingTestModeLabel) {
      this.landingTestModeLabel.textContent = active
        ? 'TEST SANDBOX: UNLIMITED HP ON'
        : 'TEST SANDBOX: UNLIMITED HP OFF';
    }
    if (this.landingTestModeTag) {
      this.landingTestModeTag.textContent = active ? 'ON' : 'OFF';
    }
    if (this.btnTestMode) {
      this.btnTestMode.setAttribute('aria-pressed', String(active));
    }
    if (this.hudTestModeLabel) {
      this.hudTestModeLabel.textContent = active ? 'UNLIMITED HP: ON' : 'UNLIMITED HP: OFF';
    }
    if (this.hudEls?.modeBadge) {
      if (this.isAdventureMode() && this.adventure?.active) {
        this.adventure.syncRightHUD();
      } else {
        this.hudEls.modeBadge.textContent = this.formatModeBadgeText();
      }
    }
  }

  setTestModeUnlimitedHp(enabled, playSound = true) {
    const nextVal = Boolean(enabled);
    if (!this.isAdventureMode()) {
      this.vsTestModeUnlimitedHp = nextVal;
      this.testModeUnlimitedHp = nextVal;
    } else {
      this.explicitAdvUnlimitedHp = nextVal;
      this.testModeUnlimitedHp = nextVal;
    }
    if (this.testModeUnlimitedHp && Array.isArray(this.fighters)) {
      for (const f of this.fighters) {
        if (f && !f.isDead && !f.isMonster) {
          f.hp = f.maxHp;
          f.isBerserk = false;
        }
      }
    }
    this.syncTestModeUI();
    this.syncRosterSelectionUI(false);
    if (playSound && this.audio) {
      this.audio.play(this.testModeUnlimitedHp ? 'reflect' : 'slash', 600);
    }
    if (this.fighters && this.hudEls) {
      this.updateHUD();
    }
  }

  toggleTestModeUnlimitedHp(playSound = true) {
    this.setTestModeUnlimitedHp(!this.testModeUnlimitedHp, playSound);
  }

  bindUI() {
    this.btnGamePause = document.getElementById('btn-game-pause');
    this.pauseSpBadge = document.getElementById('pause-sp-badge');
    this.pauseModal = document.getElementById('pause-modal');
    this.btnPauseResume = document.getElementById('btn-pause-resume');
    this.btnPauseTitle = document.getElementById('btn-pause-title');
    this.btnPauseFullZoom = document.getElementById('btn-pause-full-zoom');
    this.pauseFullZoomLabel = document.getElementById('pause-full-zoom-label');
    this.pauseVsSection = document.getElementById('pause-vs-section');
    this.pauseAdvSection = document.getElementById('pause-adv-section');
    this.btnVsPauseLandscape = document.getElementById('btn-vs-pause-landscape');

    this.btnSfx = document.getElementById('btn-sfx');
    this.sfxLabel = document.getElementById('sfx-label');
    this.btnSlowMo = document.getElementById('btn-slowmo');
    this.btnModeCycle = document.getElementById('btn-mode-cycle');
    this.modeCycleLabel = document.getElementById('mode-cycle-label');
    this.btnTagAssist = document.getElementById('btn-tag-assist');
    this.tagAssistLabel = document.getElementById('tag-assist-label');
    this.btnTestMode = document.getElementById('btn-test-mode');
    this.hudTestModeLabel = document.getElementById('hud-test-mode-label');
    this.landingBtnTestMode = document.getElementById('landing-btn-test-mode');
    this.landingTestModeLabel = document.getElementById('landing-test-mode-label');
    this.landingTestModeTag = document.getElementById('landing-test-mode-tag');
    this.btnAutoTourney = document.getElementById('btn-auto-tourney');
    this.btnNextChallenger = document.getElementById('btn-next-challenger');
    this.btnReset = document.getElementById('btn-reset');
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.btnOpenSelect = document.getElementById('btn-open-select');
    this.btnVictorySelect = document.getElementById('btn-victory-select');
    this.btnVictoryTitle = document.getElementById('btn-victory-title');
    this.victoryOverlay = document.getElementById('victory-overlay');
    this.landingOverlay = document.getElementById('landing-overlay');
    this.timerEl = document.getElementById('match-timer');

    if (this.btnGamePause) {
      this.btnGamePause.addEventListener('click', () => this.togglePause(true));
    }
    if (this.btnPauseResume) {
      this.btnPauseResume.addEventListener('click', () => this.setPaused(false, true));
    }
    if (this.btnPauseTitle) {
      this.btnPauseTitle.addEventListener('click', () => this.goToTitleScreen(true));
    }
    if (this.btnPauseFullZoom) {
      this.btnPauseFullZoom.addEventListener('click', () => this.toggleMobileFullZoomOut(true));
    }
    this.syncMobileFullZoomUI();
    if (this.btnVictoryTitle) {
      this.btnVictoryTitle.addEventListener('click', () => this.goToTitleScreen(true));
    }
    if (this.pauseModal) {
      this.pauseModal.addEventListener('click', (e) => {
        if (e.target === this.pauseModal) {
          this.setPaused(false, true);
        }
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;
      if (this.isLandingOpen) return;
      if (this.victoryOverlay && !this.victoryOverlay.classList.contains('hidden')) return;
      if (this.isAdventureMode() && this.adventure?.isSkillTreeOpen) {
        e.preventDefault();
        this.adventure.closeSkillTree(true);
        return;
      }
      e.preventDefault();
      this.togglePause(true);
    });

    if (this.btnTestMode) {
      this.btnTestMode.addEventListener('click', () => this.toggleTestModeUnlimitedHp(true));
    }
    if (this.landingBtnTestMode) {
      this.landingBtnTestMode.addEventListener('click', () => this.toggleTestModeUnlimitedHp(true));
    }
    this.syncTestModeUI();

    this.modeBtns = {
      '1v1': document.getElementById('mode-btn-1v1'),
      '2v2_brawl': document.getElementById('mode-btn-2v2-brawl'),
      '2v2_tag': document.getElementById('mode-btn-2v2-tag'),
      adventure: document.getElementById('mode-btn-adventure')
    };
    Object.entries(this.modeBtns).forEach(([modeKey, btn]) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (modeKey === 'adventure' || modeKey === '2v2_brawl') return;
        this.setGameMode(modeKey, true);
      });
    });

    this.stageBtns = document.querySelectorAll('[data-stage]');
    this.stageBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.isAdventureMode()) return;
        const stg = btn.getAttribute('data-stage');
        this.forcedStage = stg === 'auto' ? null : stg;
        PixelForge.ensureStageLoaded?.(this.forcedStage || this.renderer?.stageId || 'cathedral');
        this.syncRosterSelectionUI(true);
        if (!this.isLandingOpen) {
          this.resetMatch();
        }
      });
    });

    this.slotBtnLeft = document.getElementById('slot-btn-left');
    this.slotBtnLeftPartner = document.getElementById('slot-btn-left-partner');
    this.slotBtnRight = document.getElementById('slot-btn-right');
    this.slotBtnRightPartner = document.getElementById('slot-btn-right-partner');
    this.slotLeftName = document.getElementById('slot-left-name');
    this.slotLeftPartnerName = document.getElementById('slot-left-partner-name');
    this.slotRightName = document.getElementById('slot-right-name');
    this.slotRightPartnerName = document.getElementById('slot-right-partner-name');

    this.p1DuoTabs = document.getElementById('p1-duo-tabs');
    this.p2DuoTabs = document.getElementById('p2-duo-tabs');
    this.p1TabLead = document.getElementById('p1-tab-lead');
    this.p1TabPartner = document.getElementById('p1-tab-partner');
    this.p2TabLead = document.getElementById('p2-tab-lead');
    this.p2TabPartner = document.getElementById('p2-tab-partner');

    if (this.p1TabLead) {
      this.p1TabLead.addEventListener('click', () => {
        this.inspectLeftRole = 'lead';
        this.setActiveSlot(1);
      });
    }
    if (this.p1TabPartner) {
      this.p1TabPartner.addEventListener('click', () => {
        if (this.isAdventureMode()) return;
        this.inspectLeftRole = 'partner';
        this.setActiveSlot(3);
      });
    }
    if (this.p2TabLead) {
      this.p2TabLead.addEventListener('click', () => {
        if (this.isAdventureMode()) {
          this.inspectLeftRole = 'lead';
          this.setActiveSlot(1);
          return;
        }
        this.inspectRightRole = 'lead';
        this.setActiveSlot(2);
      });
    }
    if (this.p2TabPartner) {
      this.p2TabPartner.addEventListener('click', () => {
        if (this.isAdventureMode()) return;
        this.inspectRightRole = 'partner';
        this.setActiveSlot(4);
      });
    }

    this.rosterVersionBar = document.getElementById('roster-version-bar');
    this.btnRosterVersionEx = document.getElementById('btn-roster-version-ex');
    this.btnRosterVersionLegacy = document.getElementById('btn-roster-version-legacy');
    if (this.btnRosterVersionEx) {
      this.btnRosterVersionEx.addEventListener('click', () => this.setRosterVersion('ex', true));
    }
    if (this.btnRosterVersionLegacy) {
      this.btnRosterVersionLegacy.addEventListener('click', () =>
        this.setRosterVersion('legacy', true)
      );
    }

    this.cards = {
      warrior_ex: document.getElementById('card-warrior_ex'),
      mage_ex: document.getElementById('card-mage_ex'),
      priestess_ex: document.getElementById('card-priestess_ex'),
      chronomancer_ex: document.getElementById('card-chronomancer_ex'),
      valkyrie_ex: document.getElementById('card-valkyrie_ex'),
      ronin_ex: document.getElementById('card-ronin_ex'),
      archer_ex: document.getElementById('card-archer_ex'),
      reaper_ex: document.getElementById('card-reaper_ex'),
      titan_ex: document.getElementById('card-titan_ex'),
      icemage_ex: document.getElementById('card-icemage_ex'),
      android_ex: document.getElementById('card-android_ex'),
      nyx_ex: document.getElementById('card-nyx_ex'),
      warrior: document.getElementById('card-warrior'),
      mage: document.getElementById('card-mage'),
      priestess: document.getElementById('card-priestess'),
      chronomancer: document.getElementById('card-chronomancer'),
      valkyrie: document.getElementById('card-valkyrie'),
      ronin: document.getElementById('card-ronin'),
      archer: document.getElementById('card-archer'),
      reaper: document.getElementById('card-reaper'),
      titan: document.getElementById('card-titan'),
      icemage: document.getElementById('card-icemage'),
      android: document.getElementById('card-android')
    };
    this.ribbons = {
      warrior_ex: document.getElementById('ribbon-warrior_ex'),
      mage_ex: document.getElementById('ribbon-mage_ex'),
      priestess_ex: document.getElementById('ribbon-priestess_ex'),
      chronomancer_ex: document.getElementById('ribbon-chronomancer_ex'),
      valkyrie_ex: document.getElementById('ribbon-valkyrie_ex'),
      ronin_ex: document.getElementById('ribbon-ronin_ex'),
      archer_ex: document.getElementById('ribbon-archer_ex'),
      reaper_ex: document.getElementById('ribbon-reaper_ex'),
      titan_ex: document.getElementById('ribbon-titan_ex'),
      icemage_ex: document.getElementById('ribbon-icemage_ex'),
      android_ex: document.getElementById('ribbon-android_ex'),
      nyx_ex: document.getElementById('ribbon-nyx_ex'),
      warrior: document.getElementById('ribbon-warrior'),
      mage: document.getElementById('ribbon-mage'),
      priestess: document.getElementById('ribbon-priestess'),
      chronomancer: document.getElementById('ribbon-chronomancer'),
      valkyrie: document.getElementById('ribbon-valkyrie'),
      ronin: document.getElementById('ribbon-ronin'),
      archer: document.getElementById('ribbon-archer'),
      reaper: document.getElementById('ribbon-reaper'),
      titan: document.getElementById('ribbon-titan'),
      icemage: document.getElementById('ribbon-icemage'),
      android: document.getElementById('ribbon-android')
    };
    this.previewCanvases = {
      warrior_ex: document.getElementById('preview-warrior_ex'),
      mage_ex: document.getElementById('preview-mage_ex'),
      priestess_ex: document.getElementById('preview-priestess_ex'),
      chronomancer_ex: document.getElementById('preview-chronomancer_ex'),
      valkyrie_ex: document.getElementById('preview-valkyrie_ex'),
      ronin_ex: document.getElementById('preview-ronin_ex'),
      archer_ex: document.getElementById('preview-archer_ex'),
      reaper_ex: document.getElementById('preview-reaper_ex'),
      titan_ex: document.getElementById('preview-titan_ex'),
      icemage_ex: document.getElementById('preview-icemage_ex'),
      android_ex: document.getElementById('preview-android_ex'),
      nyx_ex: document.getElementById('preview-nyx_ex'),
      warrior: document.getElementById('preview-warrior'),
      mage: document.getElementById('preview-mage'),
      priestess: document.getElementById('preview-priestess'),
      chronomancer: document.getElementById('preview-chronomancer'),
      valkyrie: document.getElementById('preview-valkyrie'),
      ronin: document.getElementById('preview-ronin'),
      archer: document.getElementById('preview-archer'),
      reaper: document.getElementById('preview-reaper'),
      titan: document.getElementById('preview-titan'),
      icemage: document.getElementById('preview-icemage'),
      android: document.getElementById('preview-android')
    };
    this.syncRosterVersionTabs();

    this.btnStartDuel = document.getElementById('btn-start-duel');
    this.startDuelText = document.getElementById('start-duel-text');
    this.btnRandomDuel = document.getElementById('btn-random-duel');

    const cacheHUD = (side) => ({
      name: document.getElementById(`${side}-name`),
      portraitFrame: document.getElementById(`${side}-portrait-frame`),
      hpBar: document.getElementById(`${side}-hp-bar`),
      hpDmg: document.getElementById(`${side}-hp-dmg`),
      hpText: document.getElementById(`${side}-hp-text`),
      state: document.getElementById(`${side}-state`),
      manaBar: document.getElementById(`${side}-mana-bar`),
      ultLabel: document.getElementById(`${side}-ult-label`),
      finisherFrame: document.getElementById(`${side}-finisher-frame`),
      finisherBar: document.getElementById(`${side}-finisher-bar`),
      finisherLabel: document.getElementById(`${side}-finisher-label`),
      skillCd: document.getElementById(`${side}-skill-cd`),
      skillText: document.getElementById(`${side}-skill-text`),
      partnerWing: document.getElementById(`${side}-partner-wing`),
      partnerPortrait: document.getElementById(`${side}-partner-portrait`),
      partnerName: document.getElementById(`${side}-partner-name`),
      partnerStatus: document.getElementById(`${side}-partner-badge`),
      partnerHpText: document.getElementById(`${side}-partner-hp-text`),
      partnerHpBar: document.getElementById(`${side}-partner-hp-bar`),
      partnerManaBar: document.getElementById(`${side}-partner-mana-bar`)
    });
    this.appEl = document.getElementById('app');
    this.hudEls = {
      left: cacheHUD('left'),
      right: cacheHUD('right'),
      crestVs: document.getElementById('crest-vs-text'),
      modeBadge: document.getElementById('hud-mode-badge'),
      stageBadge: document.getElementById('hud-stage-badge')
    };
    this.advBossEls = {
      root: document.getElementById('adv-boss-raid-hud'),
      portrait: document.getElementById('adv-boss-raid-portrait'),
      name: document.getElementById('adv-boss-raid-name'),
      phase: document.getElementById('adv-boss-raid-phase'),
      bar: document.getElementById('adv-boss-raid-bar'),
      ghost: document.getElementById('adv-boss-raid-ghost'),
      hp: document.getElementById('adv-boss-raid-hp')
    };
    this.btnTestUlt = document.getElementById('btn-test-ult');
    this._testUltRoundRobinIdx = 0;
    if (this.btnTestUlt) {
      this.btnTestUlt.addEventListener('click', () => {
        this.setPaused(false, false);
        const readyPool = this.fighters.filter(
          (f) => f && !f.isDead && !f.isBenched && f.hasTrueUltimate && f.state !== 'TRUE_ULTIMATE'
        );
        const fallbackPool = this.fighters.filter(
          (f) => f && !f.isDead && f.hasTrueUltimate && f.state !== 'TRUE_ULTIMATE'
        );
        const pool = readyPool.length > 0 ? readyPool : fallbackPool;
        if (pool.length > 0) {
          const candidate = pool[this._testUltRoundRobinIdx % pool.length];
          this._testUltRoundRobinIdx = (this._testUltRoundRobinIdx + 1) % pool.length;
          if (candidate && typeof candidate.updateTrueUltimate === 'function') {
            if (candidate.isBenched) candidate.isBenched = false;
            candidate.finisherGauge = 0;
            if (candidate.stats) candidate.stats.ultsUsed++;
            candidate.setState('TRUE_ULTIMATE');
            this.triggerTrueUltimateCinematic(candidate);
            this.updateHUD();
          }
        }
      });
    }

    if (this.slotBtnLeft) {
      this.slotBtnLeft.addEventListener('click', () => {
        this.inspectLeftRole = 'lead';
        this.setActiveSlot(1);
      });
    }
    if (this.slotBtnLeftPartner) {
      this.slotBtnLeftPartner.addEventListener('click', () => {
        if (this.isAdventureMode()) return;
        this.inspectLeftRole = 'partner';
        this.setActiveSlot(3);
      });
    }
    if (this.slotBtnRight) {
      this.slotBtnRight.addEventListener('click', () => {
        if (this.isAdventureMode()) {
          this.inspectLeftRole = 'lead';
          this.setActiveSlot(1);
          return;
        }
        this.inspectRightRole = 'lead';
        this.setActiveSlot(2);
      });
    }
    if (this.slotBtnRightPartner) {
      this.slotBtnRightPartner.addEventListener('click', () => {
        if (this.isAdventureMode()) return;
        this.inspectRightRole = 'partner';
        this.setActiveSlot(4);
      });
    }

    // Direct P1 / P2 slot buttons on each roster card
    document.querySelectorAll('[data-assign-p1]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const heroKey = btn.getAttribute('data-assign-p1');
        if (this.is2v2Mode() && this.activeAssignSlot === 3) {
          this.assignHeroToSlot(3, heroKey, true);
          this.setActiveSlot(1);
        } else {
          this.assignHeroToSlot(1, heroKey, true);
          this.setActiveSlot(this.is2v2Mode() ? 3 : this.isAdventureMode() ? 1 : 2);
        }
      });
    });
    document.querySelectorAll('[data-assign-p2]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isAdventureMode()) return;
        const heroKey = btn.getAttribute('data-assign-p2');
        if (this.is2v2Mode() && this.activeAssignSlot === 4) {
          this.assignHeroToSlot(4, heroKey, true);
          this.setActiveSlot(2);
        } else {
          this.assignHeroToSlot(2, heroKey, true);
          this.setActiveSlot(this.is2v2Mode() ? 4 : 1);
        }
      });
    });

    Object.entries(this.cards).forEach(([heroKey, cardEl]) => {
      if (!cardEl) return;
      cardEl.addEventListener('click', () => {
        if (this.isAdventureMode()) {
          this.assignHeroToSlot(1, heroKey, true);
          this.setActiveSlot(1);
          return;
        }
        if (this.slot1Hero === heroKey) {
          this.inspectLeftRole = 'lead';
          this.setActiveSlot(1);
          if (this.audio) this.audio.play(CHAMPION_ROSTER[heroKey].selectSfx, 350);
        } else if (this.is2v2Mode() && this.slot1PartnerHero === heroKey) {
          this.inspectLeftRole = 'partner';
          this.setActiveSlot(3);
          if (this.audio) this.audio.play(CHAMPION_ROSTER[heroKey].selectSfx, 350);
        } else if (this.slot2Hero === heroKey) {
          this.inspectRightRole = 'lead';
          this.setActiveSlot(2);
          if (this.audio) this.audio.play(CHAMPION_ROSTER[heroKey].selectSfx, 850);
        } else if (this.is2v2Mode() && this.slot2PartnerHero === heroKey) {
          this.inspectRightRole = 'partner';
          this.setActiveSlot(4);
          if (this.audio) this.audio.play(CHAMPION_ROSTER[heroKey].selectSfx, 850);
        } else {
          this.assignHeroToSlot(this.activeAssignSlot, heroKey, true);
          if (this.is2v2Mode()) {
            const nextOrder = { 1: 3, 3: 2, 2: 4, 4: 1 };
            this.setActiveSlot(nextOrder[this.activeAssignSlot] || 1);
          } else {
            this.setActiveSlot(this.activeAssignSlot === 1 ? 2 : 1);
          }
        }
      });
    });

    if (this.btnStartDuel) {
      this.btnStartDuel.addEventListener('click', () => this.startDuel(true));
    }
    const triggerRandomizeAndStart = () => {
      const keys = [...this.getActiveRosterPool()].sort(() => Math.random() - 0.5);
      this.slot1Hero = keys[0];
      this.slot2Hero = keys[1];
      this.slot1PartnerHero = keys[2];
      this.slot2PartnerHero = keys[3];
      this.syncRosterSelectionUI(true);
      this.startDuel(true);
    };
    if (this.btnRandomDuel) {
      this.btnRandomDuel.addEventListener('click', () => {
        if (this.isAdventureMode()) {
          const keys = this.getActiveRosterPool();
          const pool = keys.filter((k) => k !== this.slot1Hero);
          const pickPool = pool.length > 0 ? pool : keys;
          this.slot1Hero = pickPool[Math.floor(Math.random() * pickPool.length)];
          this.activeAssignSlot = 1;
          this.inspectLeftRole = 'lead';
          this.syncRosterSelectionUI(true);
          this.startDuel(true);
          return;
        }
        triggerRandomizeAndStart();
      });
    }
    if (this.btnOpenSelect) {
      this.btnOpenSelect.addEventListener('click', () => {
        this.setPaused(false, false);
        this.teardownActiveMatch(false);
        this.openLanding('roster');
      });
    }
    if (this.btnVictorySelect) {
      this.btnVictorySelect.addEventListener('click', () => {
        this.setPaused(false, false);
        this.teardownActiveMatch(false);
        this.openLanding('roster');
      });
    }

    // Separated Arcade Flow Navigation (Title Screen -> Dedicated VS Branch OR Dedicated Adventure Branch)
    this.stepTabBtns = document.querySelectorAll('.step-tab[data-landing-step]');
    this.stepPanels = {
      title: document.getElementById('landing-step-title'),
      mode: document.getElementById('landing-step-mode'),
      roster: document.getElementById('landing-step-roster')
    };
    this.stepTabBtns.forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const targetStep = tabBtn.getAttribute('data-landing-step');
        if (targetStep === 'title') {
          this.goToTitleScreen(true);
          return;
        }
        if (this.landingStep === 'title') return;
        if (targetStep === 'mode' && this.isAdventureMode()) return;
        this.setLandingStep(targetStep, true);
      });
    });

    const stepNavBrand = document.getElementById('step-nav-brand');
    if (stepNavBrand) {
      stepNavBrand.addEventListener('click', () => this.goToTitleScreen(true));
    }
    const btnNavCommence = document.getElementById('btn-nav-commence');
    if (btnNavCommence) {
      btnNavCommence.addEventListener('click', () => {
        if (this.landingStep === 'title') return;
        this.startDuel(true);
      });
    }
    const btnGoMode = document.getElementById('btn-go-mode');
    if (btnGoMode) {
      btnGoMode.addEventListener('click', () => {
        if (this.isAdventureMode() || this.gameMode === '2v2_brawl') {
          this.setGameMode('1v1', false);
        }
        this.setLandingStep('mode', true);
      });
    }
    const btnTitleAdventure = document.getElementById('btn-title-adventure');
    if (btnTitleAdventure) {
      btnTitleAdventure.addEventListener('click', () => {
        this.setGameMode('adventure', false);
        this.setLandingStep('roster', true);
      });
    }
    const btnModeBack = document.getElementById('btn-mode-back');
    if (btnModeBack) {
      btnModeBack.addEventListener('click', () => this.goToTitleScreen(true));
    }
    const btnModeNext = document.getElementById('btn-mode-next');
    if (btnModeNext) {
      btnModeNext.addEventListener('click', () => this.setLandingStep('roster', true));
    }
    const btnRosterBackMode = document.getElementById('btn-roster-back-mode');
    if (btnRosterBackMode) {
      btnRosterBackMode.addEventListener('click', () => {
        if (this.isAdventureMode()) {
          this.goToTitleScreen(true);
        } else {
          this.setLandingStep('mode', true);
        }
      });
    }
    const btnRosterConfigBadge = document.getElementById('btn-roster-config-badge');
    if (btnRosterConfigBadge) {
      btnRosterConfigBadge.addEventListener('click', () => {
        if (!this.isAdventureMode()) {
          this.setLandingStep('mode', true);
        }
      });
    }

    this.landingBtnAutoTourney = document.getElementById('landing-btn-auto-tourney');
    this.landingAutoTourneyTag = document.getElementById('landing-auto-tourney-tag');

    if (this.btnSfx) {
      this.btnSfx.addEventListener('click', () => {
        const on = this.audio.toggle();
        this.btnSfx.setAttribute('aria-pressed', String(on));
        this.sfxLabel.textContent = on ? 'SFX' : 'MUTE';
      });
    }

    this.btnSlowMo.addEventListener('click', () => {
      this.userSlowMo = !this.userSlowMo;
      this.btnSlowMo.setAttribute('aria-pressed', String(this.userSlowMo));
    });

    if (this.btnModeCycle) {
      this.btnModeCycle.addEventListener('click', () => this.cycleGameMode());
    }

    if (this.btnTagAssist) {
      this.btnTagAssist.addEventListener('click', () => {
        this.setPaused(false, false);
        if (this.gameMode === '2v2_tag') {
          this.triggerTeamTagSwap(1, true);
        } else if (this.gameMode === '2v2_brawl') {
          this.triggerTeamAssist(1, true);
        }
      });
    }

    const toggleAutoTourney = () => {
      this.autoTourney = !this.autoTourney;
      if (this.btnAutoTourney) {
        this.btnAutoTourney.setAttribute('aria-pressed', String(this.autoTourney));
      }
      if (this.landingBtnAutoTourney) {
        this.landingBtnAutoTourney.classList.toggle('active-rule-card', this.autoTourney);
        this.landingBtnAutoTourney.setAttribute('aria-pressed', String(this.autoTourney));
      }
      if (this.landingAutoTourneyTag) {
        this.landingAutoTourneyTag.textContent = this.autoTourney ? 'ON' : 'OFF';
      }
      if (!this.isAdventureMode()) {
        const autoLabel = document.getElementById('victory-auto-next');
        if (autoLabel) {
          autoLabel.textContent = this.autoTourney
            ? 'AUTO-TOURNEY: NEXT CHALLENGER IN 4S...'
            : 'AUTO-TOURNEY PAUSED • SELECT NEXT ACTION';
        }
      }
      if (!this.autoTourney) {
        clearTimeout(this.autoNextTimeout);
      }
      if (this.audio) {
        this.audio.play('reflect', 600);
      }
    };

    if (this.btnAutoTourney) {
      this.btnAutoTourney.addEventListener('click', toggleAutoTourney);
    }
    if (this.landingBtnAutoTourney) {
      this.landingBtnAutoTourney.addEventListener('click', toggleAutoTourney);
    }

    if (this.btnNextChallenger) {
      this.btnNextChallenger.addEventListener('click', () => this.advanceTourneyChallenger());
    }

    this.btnReset.addEventListener('click', () => {
      this.setPaused(false, false);
      this.resetMatch();
    });
    this.btnPlayAgain.addEventListener('click', () => this.resetMatch());

    // Adventure Mode Mobile Action-RPG HUD: Independent Multi-Touch Joystick + Simultaneous Right-Side Skill Cluster
    const joyZone = document.getElementById('adv-joystick-zone');
    const joyBase = document.getElementById('adv-joystick-base');
    if (joyZone) {
      let activeJoyTouchId = null;
      let activeJoyPointerId = null;
      const updateJoyFromCoords = (clientX, clientY) => {
        const refEl = joyBase || joyZone;
        const rect = refEl.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const maxRadius = Math.max(36, Math.min(rect.width, rect.height) * 0.44);
        const rawDx = clientX - cx;
        const rawDy = clientY - cy;
        const isCssRotated = document.documentElement.classList.contains('is-css-rotated-landscape');
        const dx = (isCssRotated ? rawDy : rawDx) / maxRadius;
        const dy = (isCssRotated ? -rawDx : rawDy) / maxRadius;
        this.adventure?.setJoystickVector(dx, dy, true);
      };

      // Dedicated TouchEvent multi-touch tracking by touch.identifier (zero interference with right-hand Attack/Skills!)
      joyZone.addEventListener(
        'touchstart',
        (e) => {
          if (activeJoyTouchId !== null) return;
          const t = e.changedTouches?.[0];
          if (!t) return;
          e.preventDefault();
          activeJoyTouchId = t.identifier;
          updateJoyFromCoords(t.clientX, t.clientY);
        },
        { passive: false }
      );
      joyZone.addEventListener(
        'touchmove',
        (e) => {
          if (activeJoyTouchId === null) return;
          const touches = e.changedTouches || [];
          for (let i = 0; i < touches.length; i++) {
            if (touches[i].identifier === activeJoyTouchId) {
              e.preventDefault();
              updateJoyFromCoords(touches[i].clientX, touches[i].clientY);
              break;
            }
          }
        },
        { passive: false }
      );
      const releaseJoyTouch = (e) => {
        if (activeJoyTouchId === null) return;
        const touches = e.changedTouches || [];
        for (let i = 0; i < touches.length; i++) {
          if (touches[i].identifier === activeJoyTouchId) {
            activeJoyTouchId = null;
            activeJoyPointerId = null;
            this.adventure?.setJoystickVector(0, 0, false);
            break;
          }
        }
      };
      joyZone.addEventListener('touchend', releaseJoyTouch, { passive: false });
      joyZone.addEventListener('touchcancel', releaseJoyTouch, { passive: false });

      // PointerEvent fallback for desktop mouse/pen/synthetic pointers
      const releaseJoyPointer = (e) => {
        if (e?.pointerType === 'touch' && activeJoyTouchId !== null) return;
        if (
          e &&
          activeJoyPointerId !== null &&
          e.pointerId !== undefined &&
          e.pointerId !== activeJoyPointerId
        ) {
          return;
        }
        activeJoyPointerId = null;
        this.adventure?.setJoystickVector(0, 0, false);
      };
      joyZone.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        if (activeJoyPointerId !== null && activeJoyPointerId !== e.pointerId) return;
        e.preventDefault();
        activeJoyPointerId = e.pointerId;
        try {
          joyZone.setPointerCapture?.(e.pointerId);
        } catch (_) {
          // Pointer capture optional in synthetic/headless environments
        }
        updateJoyFromCoords(e.clientX, e.clientY);
      });
      joyZone.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch' || e.pointerId !== activeJoyPointerId) return;
        e.preventDefault();
        updateJoyFromCoords(e.clientX, e.clientY);
      });
      joyZone.addEventListener('pointerup', releaseJoyPointer);
      joyZone.addEventListener('pointercancel', releaseJoyPointer);
      joyZone.addEventListener('lostpointercapture', releaseJoyPointer);
    }

    // Primary Anchor Attack Button (independent multi-touch Set — works seamlessly while dragging left joystick!)
    const advAttackBtn = document.getElementById('adv-btn-attack');
    if (advAttackBtn) {
      const activeAttackTouchIds = new Set();
      const activeAttackPointerIds = new Set();
      const syncAttackHeldState = () => {
        const held = activeAttackTouchIds.size > 0 || activeAttackPointerIds.size > 0;
        advAttackBtn.classList.toggle('is-pressed', held);
        this.adventure?.setAttackHeld(held);
      };

      advAttackBtn.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          const touches = e.changedTouches || [];
          for (let i = 0; i < touches.length; i++) {
            activeAttackTouchIds.add(touches[i].identifier);
          }
          syncAttackHeldState();
          this.adventure?.triggerAction('attack');
        },
        { passive: false }
      );
      const endAttackTouch = (e) => {
        const touches = e.changedTouches || [];
        for (let i = 0; i < touches.length; i++) {
          activeAttackTouchIds.delete(touches[i].identifier);
        }
        syncAttackHeldState();
      };
      advAttackBtn.addEventListener('touchend', endAttackTouch, { passive: false });
      advAttackBtn.addEventListener('touchcancel', endAttackTouch, { passive: false });

      advAttackBtn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        e.preventDefault();
        activeAttackPointerIds.add(e.pointerId ?? 'mouse');
        try {
          advAttackBtn.setPointerCapture?.(e.pointerId);
        } catch (_) {
          // Optional pointer capture
        }
        syncAttackHeldState();
        this.adventure?.triggerAction('attack');
      });
      const endAttackPointer = (e) => {
        if (e?.pointerType === 'touch') return;
        activeAttackPointerIds.delete(e?.pointerId ?? 'mouse');
        syncAttackHeldState();
      };
      advAttackBtn.addEventListener('pointerup', endAttackPointer);
      advAttackBtn.addEventListener('pointercancel', endAttackPointer);
      advAttackBtn.addEventListener('lostpointercapture', endAttackPointer);
      advAttackBtn.addEventListener('click', () => {
        this.adventure?.triggerAction('attack');
      });
    }

    // Right-Side Circular 5-Orb Skill Cluster (independent multi-touch — zero collision with left joystick!)
    const advActionMap = {
      'adv-btn-dodge': 'dodge',
      'adv-btn-skill': 'skill',
      'adv-btn-overdrive': 'overdrive',
      'adv-btn-ultimate': 'ultimate'
    };
    Object.entries(advActionMap).forEach(([id, act]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const clearPress = () => btn.classList.remove('is-pressed');
      btn.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          btn.classList.add('is-pressed');
          this.adventure?.triggerAction(act);
        },
        { passive: false }
      );
      btn.addEventListener('touchend', clearPress, { passive: false });
      btn.addEventListener('touchcancel', clearPress, { passive: false });
      btn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        e.preventDefault();
        btn.classList.add('is-pressed');
        this.adventure?.triggerAction(act);
      });
      btn.addEventListener('pointerup', clearPress);
      btn.addEventListener('pointercancel', clearPress);
      btn.addEventListener('click', () => {
        this.adventure?.triggerAction(act);
      });
    });

    const advBtnSkillTree = document.getElementById('adv-btn-skilltree');
    if (advBtnSkillTree) {
      advBtnSkillTree.addEventListener('click', () => {
        this.setPaused(false, false);
        this.adventure?.openSkillTree(true);
      });
    }
    const advStClose = document.getElementById('adv-st-close');
    if (advStClose) {
      advStClose.addEventListener('click', () => {
        this.adventure?.closeSkillTree(true);
      });
    }
    const advStRefund = document.getElementById('adv-st-refund');
    if (advStRefund) {
      advStRefund.addEventListener('click', () => {
        this.adventure?.refundSkillTree(true);
      });
    }

    const advBtnAutoPlay = document.getElementById('adv-btn-autoplay');
    if (advBtnAutoPlay) {
      advBtnAutoPlay.addEventListener('click', () => {
        this.adventure?.toggleAutoPlay(true);
      });
    }
    const advBtnAutoSkill = document.getElementById('adv-btn-auto');
    if (advBtnAutoSkill) {
      let lastAutoTouchMs = 0;
      advBtnAutoSkill.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          lastAutoTouchMs = performance.now();
          this.adventure?.toggleAutoPlay(true);
        },
        { passive: false }
      );
      advBtnAutoSkill.addEventListener('click', () => {
        if (performance.now() - lastAutoTouchMs < 420) return;
        this.adventure?.toggleAutoPlay(true);
      });
    }
    const advBtnRestart = document.getElementById('adv-btn-restart');
    if (advBtnRestart) {
      advBtnRestart.addEventListener('click', () => {
        this.setPaused(false, false);
        this.resetMatch();
      });
    }
    const advBtnMenu = document.getElementById('adv-btn-menu');
    if (advBtnMenu) {
      advBtnMenu.addEventListener('click', () => {
        this.setPaused(false, false);
        this.teardownActiveMatch(false);
        this.openLanding('roster');
      });
    }

    const btnMobileLandscape = document.getElementById('btn-mobile-landscape');
    if (btnMobileLandscape) {
      btnMobileLandscape.addEventListener('click', () => this.toggleMobileLandscape(true));
    }
    const advBtnLandscape = document.getElementById('adv-btn-landscape');
    if (advBtnLandscape) {
      advBtnLandscape.addEventListener('click', () => this.toggleMobileLandscape(true));
    }
    if (this.btnVsPauseLandscape) {
      this.btnVsPauseLandscape.addEventListener('click', () => this.toggleMobileLandscape(true));
    }

    const onViewportChange = () => this.syncMobileLandscapeViewport();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', () => {
      this.syncMobileLandscapeViewport();
      setTimeout(() => this.syncMobileLandscapeViewport(), 120);
    });
    document.addEventListener('fullscreenchange', onViewportChange);
  }

  isMobileViewportDevice() {
    const physW = window.innerWidth;
    const physH = window.innerHeight;
    const coarseTouch =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    return Boolean(coarseTouch || Math.min(physW, physH) <= 540 || this.forceMobileLandscapeParam);
  }

  syncMobileLandscapeViewport() {
    const physW = window.innerWidth;
    const physH = window.innerHeight;
    const root = document.documentElement;
    root.style.setProperty('--phys-w', `${physW}px`);
    root.style.setProperty('--phys-h', `${physH}px`);

    const isMobileDevice = this.isMobileViewportDevice();
    const cssRotated = Boolean(isMobileDevice && this.mobileLandscapeEnabled && physW < physH);
    const activeLandscape = Boolean(
      isMobileDevice && (this.mobileLandscapeEnabled || (physW >= physH && physH <= 540))
    );

    root.classList.toggle('is-mobile-device', isMobileDevice);
    root.classList.toggle('is-css-rotated-landscape', cssRotated);
    root.classList.toggle('is-mobile-landscape', activeLandscape);

    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    const labelText =
      physW < physH
        ? this.mobileLandscapeEnabled
          ? 'LANDSCAPE: ON'
          : 'LANDSCAPE: OFF'
        : isFs
          ? 'FULLSCREEN: ON'
          : 'FULLSCREEN';

    const navLbl = document.getElementById('mobile-landscape-label');
    const advLbl = document.getElementById('adv-landscape-label');
    const vsPauseLbl = document.getElementById('vs-pause-landscape-label');
    const navBtn = document.getElementById('btn-mobile-landscape');
    const advBtn = document.getElementById('adv-btn-landscape');
    const vsPauseBtn = document.getElementById('btn-vs-pause-landscape');
    if (navLbl) navLbl.textContent = labelText;
    if (advLbl) advLbl.textContent = labelText;
    if (vsPauseLbl) vsPauseLbl.textContent = labelText;
    if (navBtn) {
      navBtn.classList.toggle('is-landscape-on', activeLandscape || isFs);
      navBtn.setAttribute('aria-pressed', String(activeLandscape || isFs));
    }
    if (advBtn) {
      advBtn.classList.toggle('is-landscape-on', activeLandscape || isFs);
      advBtn.setAttribute('aria-pressed', String(activeLandscape || isFs));
    }
    if (vsPauseBtn) {
      vsPauseBtn.classList.toggle('is-landscape-on', activeLandscape || isFs);
      vsPauseBtn.setAttribute('aria-pressed', String(activeLandscape || isFs));
    }

    this._pausedFrameRendered = false;
    this.renderer?.resize();
  }

  toggleMobileLandscape(fromUserGesture = true) {
    const physW = window.innerWidth;
    const physH = window.innerHeight;
    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);

    if (physW < physH) {
      this.mobileLandscapeEnabled = !this.mobileLandscapeEnabled;
      if (this.mobileLandscapeEnabled && fromUserGesture) {
        const reqFs =
          document.documentElement.requestFullscreen ||
          document.documentElement.webkitRequestFullscreen;
        if (typeof reqFs === 'function' && !isFs) {
          Promise.resolve(reqFs.call(document.documentElement))
            .then(() => screen.orientation?.lock?.('landscape')?.catch(() => {}))
            .catch(() => {});
        } else {
          screen.orientation?.lock?.('landscape')?.catch(() => {});
        }
      } else if (!this.mobileLandscapeEnabled) {
        try {
          screen.orientation?.unlock?.();
        } catch (_) {
          // Orientation unlock optional
        }
        if (isFs && typeof document.exitFullscreen === 'function') {
          document.exitFullscreen().catch(() => {});
        }
      }
    } else if (fromUserGesture) {
      if (!isFs) {
        this.mobileLandscapeEnabled = true;
        const reqFs =
          document.documentElement.requestFullscreen ||
          document.documentElement.webkitRequestFullscreen;
        if (typeof reqFs === 'function') {
          Promise.resolve(reqFs.call(document.documentElement))
            .then(() => screen.orientation?.lock?.('landscape')?.catch(() => {}))
            .catch(() => {});
        }
      } else if (typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().catch(() => {});
      }
    }

    this.syncMobileLandscapeViewport();
    if (fromUserGesture && this.audio) {
      this.audio.play('reflect', 600);
    }
  }

  setLandingStep(step, playSound = true) {
    let validStep = step === 'mode' || step === 'roster' ? step : 'title';
    if (validStep === 'mode' && this.isAdventureMode()) {
      validStep = 'roster';
    }
    this.landingStep = validStep;
    if ((validStep === 'mode' || validStep === 'roster') && !this.isAdventureMode()) {
      PixelForge.ensureStageLoaded?.(this.forcedStage || this.renderer?.stageId || 'cathedral');
    }
    if (validStep === 'roster') {
      this.syncRosterVersionTabs();
      PixelForge.ensureAllPortraitsLoaded?.(this.rosterVersion);
    }
    if (this.landingOverlay) {
      this.landingOverlay.setAttribute('data-active-step', validStep);
    }
    if (this.appEl) {
      this.appEl.setAttribute('data-landing-step', validStep);
    }
    if (this.stepTabBtns) {
      this.stepTabBtns.forEach((btn) => {
        const active = btn.getAttribute('data-landing-step') === validStep;
        btn.classList.toggle('active-step-tab', active);
        btn.setAttribute('aria-selected', String(active));
      });
    }
    if (this.stepPanels) {
      Object.entries(this.stepPanels).forEach(([k, panel]) => {
        if (!panel) return;
        const active = k === validStep;
        panel.classList.toggle('is-active-step', active);
        panel.hidden = !active;
      });
    }
    this.syncLandingBranchUI();
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
  }

  advanceTourneyChallenger() {
    clearTimeout(this.autoNextTimeout);
    const keys = this.getActiveRosterPool();
    const fallbackA = this.rosterVersion === 'legacy' ? 'archer' : 'archer_ex';
    const fallbackB = this.rosterVersion === 'legacy' ? 'reaper' : 'reaper_ex';
    const fallbackP = this.rosterVersion === 'legacy' ? 'priestess' : 'priestess_ex';
    if (this.is2v2Mode()) {
      const keepLead = this.reigningHero || this.slot1Hero;
      const keepPartner =
        this.slot1PartnerHero !== keepLead
          ? this.slot1PartnerHero
          : keys.find((k) => k !== keepLead) || fallbackP;
      const pool = keys
        .filter((k) => k !== keepLead && k !== keepPartner)
        .sort(() => Math.random() - 0.5);
      this.slot1Hero = keepLead;
      this.slot1PartnerHero = keepPartner;
      this.slot2Hero = pool[0] || fallbackA;
      this.slot2PartnerHero = pool[1] || fallbackB;
    } else {
      const keepHero = this.reigningHero || this.slot1Hero;
      const pool = keys.filter((k) => k !== keepHero && k !== this.slot2Hero);
      const candidates = pool.length > 0 ? pool : keys.filter((k) => k !== keepHero);
      const nextChallenger =
        candidates[Math.floor(Math.random() * candidates.length)] || fallbackA;
      this.slot1Hero = keepHero;
      this.slot2Hero = nextChallenger;
    }
    this.syncRosterSelectionUI(false);
    this.resetMatch();
  }

  setActiveSlot(slotNum) {
    if (this.isAdventureMode()) {
      slotNum = 1;
    }
    this.activeAssignSlot = slotNum;
    if (slotNum === 1) this.inspectLeftRole = 'lead';
    if (slotNum === 3) this.inspectLeftRole = 'partner';
    if (slotNum === 2) this.inspectRightRole = 'lead';
    if (slotNum === 4) this.inspectRightRole = 'partner';
    this.syncRosterSelectionUI(false);
  }

  assignHeroToSlot(slotNum, heroKey, playSound = true) {
    if (!CHAMPION_ROSTER[heroKey]) return;
    const prevSlots = {
      1: this.slot1Hero,
      2: this.slot2Hero,
      3: this.slot1PartnerHero,
      4: this.slot2PartnerHero
    };
    const prevHero = prevSlots[slotNum];

    // If heroKey is already in another slot, swap cleanly so all 4 slots stay distinct
    if (slotNum !== 1 && this.slot1Hero === heroKey) this.slot1Hero = prevHero;
    if (slotNum !== 2 && this.slot2Hero === heroKey) this.slot2Hero = prevHero;
    if (slotNum !== 3 && this.slot1PartnerHero === heroKey) this.slot1PartnerHero = prevHero;
    if (slotNum !== 4 && this.slot2PartnerHero === heroKey) this.slot2PartnerHero = prevHero;

    if (slotNum === 1) {
      this.slot1Hero = heroKey;
      this.inspectLeftRole = 'lead';
    } else if (slotNum === 2) {
      this.slot2Hero = heroKey;
      this.inspectRightRole = 'lead';
    } else if (slotNum === 3) {
      this.slot1PartnerHero = heroKey;
      this.inspectLeftRole = 'partner';
    } else if (slotNum === 4) {
      this.slot2PartnerHero = heroKey;
      this.inspectRightRole = 'partner';
    }
    this.ensureDistinctTeamPartners();
    this.syncRosterSelectionUI(playSound, heroKey);
    this.prewarmSelectedAssets();
  }

  syncRosterSelectionUI(playSound = false, soundHeroKey = null) {
    const is2v2 = this.is2v2Mode();
    const isAdv = this.isAdventureMode();
    if (isAdv) {
      this.activeAssignSlot = 1;
      this.inspectLeftRole = 'lead';
    }
    this.syncRosterVersionTabs();
    const c1 = CHAMPION_ROSTER[this.slot1Hero] || CHAMPION_ROSTER.titan;
    const c1b = CHAMPION_ROSTER[this.slot1PartnerHero] || CHAMPION_ROSTER.priestess;
    const c2 = CHAMPION_ROSTER[this.slot2Hero] || CHAMPION_ROSTER.archer;
    const c2b = CHAMPION_ROSTER[this.slot2PartnerHero] || CHAMPION_ROSTER.reaper;

    // 1. Mode Selector Bar, Stage Selector Bar & Pause Menu VS Mode/Assist Controls
    if (this.modeBtns) {
      Object.entries(this.modeBtns).forEach(([modeKey, btn]) => {
        if (!btn) return;
        const active = this.gameMode === modeKey;
        btn.classList.toggle('active-mode', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }
    if (this.stageBtns) {
      const currentStageKey = this.forcedStage || 'auto';
      this.stageBtns.forEach((btn) => {
        const active = !isAdv && btn.getAttribute('data-stage') === currentStageKey;
        btn.classList.toggle('active-stage', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }

    // Step 02 (#landing-step-mode) Mode Isolation: hide VS Sandbox/Auto-Tourney & Stage Picker in Adventure Mode
    const setupRulesSection = document.getElementById('setup-section-rules');
    const stageGalleryGrid = document.getElementById('stage-gallery-grid');
    const advStageLockBanner = document.getElementById('adv-stage-lock-banner');
    const setupStageHeading = document.getElementById('setup-stage-heading');
    if (setupRulesSection) setupRulesSection.classList.toggle('hidden', isAdv);
    if (stageGalleryGrid) stageGalleryGrid.classList.toggle('hidden', isAdv);
    if (advStageLockBanner) advStageLockBanner.classList.toggle('hidden', !isAdv);
    if (setupStageHeading) {
      setupStageHeading.textContent = isAdv ? 'CAMPAIGN REALM PROGRESSION' : 'CHOOSE ARENA STAGE';
    }

    if (this.modeCycleLabel) {
      this.modeCycleLabel.textContent =
        this.gameMode === '2v2_brawl'
          ? 'MODE: 2V2 BRAWL'
          : this.gameMode === '2v2_tag'
            ? 'MODE: TAG VS'
            : 'MODE: 1V1 DUEL';
    }
    if (this.btnTagAssist) {
      this.btnTagAssist.classList.toggle('hidden', !is2v2);
      if (this.tagAssistLabel) {
        this.tagAssistLabel.textContent =
          this.gameMode === '2v2_tag' ? 'TAG SWAP' : 'TWIN ASSIST';
      }
    }
    this.syncTestModeUI();
    this.syncPauseMenuUI();

    const modeTitleStr =
      this.gameMode === 'adventure'
        ? 'ADVENTURE CAMPAIGN'
        : this.gameMode === '2v2_brawl'
          ? '2V2 CHAOS BRAWL'
          : this.gameMode === '2v2_tag'
            ? 'TAG VS'
            : '1V1 SOVEREIGN DUEL';
    const stageNames = {
      auto: 'AUTO REALM',
      cathedral: 'ECLIPSE CATHEDRAL',
      sanctuary: 'RADIANT SANCTUARY',
      sylvan: 'SYLVAN STARWOOD',
      boneyard: 'ABYSSAL NECROPOLIS',
      clocktower: 'ASTRAL CLOCKTOWER',
      shogunate: 'SHOGUNATE CITADEL',
      shogunate_inferno: 'INFERNO SHOGUNATE',
      glacial: 'BOREALIS SANCTUARY',
      shogunate_glacial: 'FROST SHOGUNATE'
    };
    const stageTitleStr = isAdv
      ? 'AUTO: 4-ZONE CAMPAIGN MAP'
      : stageNames[this.forcedStage || 'auto'] || 'AUTO REALM';
    const hpStr = this.vsTestModeUnlimitedHp ? 'SANDBOX UNLIMITED HP: ON' : 'MORTAL HP';
    const summaryStr = isAdv
      ? `${modeTitleStr} • ${stageTitleStr} • RPG PROGRESSION`
      : `${modeTitleStr} • ${stageTitleStr} • ${hpStr}`;

    const titleFooterEl = document.getElementById('title-status-footer');
    if (titleFooterEl) {
      titleFooterEl.textContent =
        'SEPARATED ARENA & CAMPAIGN REALMS • ZERO BACKGROUND LOAD • INSTANT READY';
    }
    const modeSummaryEl = document.getElementById('mode-step-summary');
    if (modeSummaryEl) modeSummaryEl.textContent = summaryStr;
    const rosterBadgeTextEl = document.getElementById('roster-config-badge-text');
    if (rosterBadgeTextEl) rosterBadgeTextEl.textContent = summaryStr;
    const matchupVsEl = document.getElementById('matchup-vs-text');
    if (matchupVsEl) matchupVsEl.textContent = isAdv ? 'SOLO' : is2v2 ? 'TAG VS' : '1V1';

    const slotLabelMap = {
      1: 'P1 LEAD',
      2: 'P2 LEAD',
      3: 'P1B ALLY',
      4: 'P2B ALLY'
    };
    const gridPromptEl = document.getElementById('portrait-grid-label');
    if (gridPromptEl) {
      gridPromptEl.textContent = isAdv
        ? 'SELECT ANY OF THE 22 CHAMPIONS (EX OR LEGACY) FOR YOUR 4-REALM CAMPAIGN'
        : `SELECT A CHAMPION FOR ${slotLabelMap[this.activeAssignSlot] || 'P1 LEAD'} — OR CLICK P1 / P2 ON ANY MEDALLION`;
    }

    // 2. Matchup Banner 4-Slot Names, Tags & Active Slot Highlight
    const slotLeftTagEl = document.getElementById('slot-left-tag');
    const slotRightTagEl = document.getElementById('slot-right-tag');
    if (slotLeftTagEl) slotLeftTagEl.textContent = isAdv ? 'CAMPAIGN HERO' : 'P1 LEAD';
    if (slotRightTagEl) slotRightTagEl.textContent = isAdv ? 'BOSS ENCOUNTER' : 'P2 LEAD';

    if (this.slotLeftName) this.slotLeftName.textContent = c1.name;
    if (this.slotLeftPartnerName) this.slotLeftPartnerName.textContent = c1b.name;
    if (this.slotRightName) this.slotRightName.textContent = isAdv ? 'BEHEMOTH MALPHAS' : c2.name;
    if (this.slotRightPartnerName) this.slotRightPartnerName.textContent = c2b.name;

    if (this.slotBtnLeftPartner) this.slotBtnLeftPartner.classList.toggle('hidden', !is2v2);
    if (this.slotBtnRightPartner) this.slotBtnRightPartner.classList.toggle('hidden', !is2v2);
    if (this.p1DuoTabs) this.p1DuoTabs.classList.toggle('hidden', !is2v2);
    if (this.p2DuoTabs) this.p2DuoTabs.classList.toggle('hidden', !is2v2);

    if (this.slotBtnLeft) this.slotBtnLeft.classList.toggle('active-slot', isAdv || this.activeAssignSlot === 1);
    if (this.slotBtnLeftPartner)
      this.slotBtnLeftPartner.classList.toggle('active-slot', !isAdv && this.activeAssignSlot === 3);
    if (this.slotBtnRight) {
      this.slotBtnRight.classList.toggle('active-slot', !isAdv && this.activeAssignSlot === 2);
      this.slotBtnRight.classList.toggle('is-boss-slot', isAdv);
      this.slotBtnRight.setAttribute('aria-disabled', String(isAdv));
    }
    if (this.slotBtnRightPartner)
      this.slotBtnRightPartner.classList.toggle('active-slot', !isAdv && this.activeAssignSlot === 4);

    const p1CornerTagEl = document.getElementById('p1-corner-tag');
    const p2CornerTagEl = document.getElementById('p2-corner-tag');
    const p2SkillsHeaderEl = document.getElementById('p2-skills-header');
    if (p1CornerTagEl) {
      p1CornerTagEl.textContent = isAdv ? 'SOLO HERO' : is2v2 ? 'TEAM 1' : 'CHAMPION • LEFT SIDE';
    }
    if (p2CornerTagEl) {
      p2CornerTagEl.textContent = isAdv
        ? 'COLOSSAL BOSS • ZONE IV'
        : is2v2
          ? 'TEAM 2'
          : 'CHALLENGER • RIGHT SIDE';
    }
    if (p2SkillsHeaderEl) {
      p2SkillsHeaderEl.textContent = isAdv
        ? '3-PHASE RAID MECHANICS & CATACLYSM'
        : '4-SLOT SOVEREIGN KIT & SUPREME ULTIMATE';
    }

    if (this.btnNextChallenger) {
      this.btnNextChallenger.classList.toggle('hidden', isAdv);
    }
    if (this.btnPlayAgain) {
      this.btnPlayAgain.textContent = isAdv ? 'RETRY CAMPAIGN' : 'REMATCH';
    }

    if (this.p1TabLead) {
      this.p1TabLead.textContent = `P1: ${c1.name}`;
      this.p1TabLead.classList.toggle('active-duo-tab', this.inspectLeftRole === 'lead');
      this.p1TabLead.classList.toggle('active-tab', this.inspectLeftRole === 'lead');
    }
    if (this.p1TabPartner) {
      this.p1TabPartner.textContent = `P1B: ${c1b.name}`;
      this.p1TabPartner.classList.toggle('active-duo-tab', this.inspectLeftRole === 'partner');
      this.p1TabPartner.classList.toggle('active-tab', this.inspectLeftRole === 'partner');
    }
    if (this.p2TabLead) {
      this.p2TabLead.textContent = `P2: ${c2.name}`;
      this.p2TabLead.classList.toggle('active-duo-tab', this.inspectRightRole === 'lead');
      this.p2TabLead.classList.toggle('active-tab', this.inspectRightRole === 'lead');
    }
    if (this.p2TabPartner) {
      this.p2TabPartner.textContent = `P2B: ${c2b.name}`;
      this.p2TabPartner.classList.toggle('active-duo-tab', this.inspectRightRole === 'partner');
      this.p2TabPartner.classList.toggle('active-tab', this.inspectRightRole === 'partner');
    }

    // 3. Roster Card Badges & Quick-Assign Buttons
    const slotPrompts = {
      1: 'SET P1',
      2: 'SET P2',
      3: 'SET P1B',
      4: 'SET P2B'
    };
    Object.keys(CHAMPION_ROSTER).forEach((key) => {
      const card = this.cards[key];
      const ribbon = this.ribbons[key];
      const isP1 = this.slot1Hero === key;
      const isP1B = !isAdv && is2v2 && this.slot1PartnerHero === key;
      const isP2 = !isAdv && this.slot2Hero === key;
      const isP2B = !isAdv && is2v2 && this.slot2PartnerHero === key;
      if (card) {
        card.classList.toggle('selected-p1', isP1);
        card.classList.toggle('selected-p1b', isP1B);
        card.classList.toggle('selected-p2', isP2);
        card.classList.toggle('selected-p2b', isP2B);
      }
      if (ribbon) {
        ribbon.textContent = isAdv
          ? isP1
            ? 'CAMPAIGN HERO'
            : 'SELECT HERO'
          : isP1
            ? 'P1 LEAD'
            : isP1B
              ? 'P1B ALLY'
              : isP2
                ? 'P2 LEAD'
                : isP2B
                  ? 'P2B ALLY'
                  : slotPrompts[this.activeAssignSlot] || 'SET P1';
      }
    });

    document.querySelectorAll('[data-assign-p1]').forEach((btn) => {
      const k = btn.getAttribute('data-assign-p1');
      const isP1 = this.slot1Hero === k;
      const isP1B = !isAdv && is2v2 && this.slot1PartnerHero === k;
      btn.classList.toggle('active-p1', isP1 || isP1B);
      btn.textContent = isAdv
        ? isP1
          ? 'HERO'
          : 'SELECT'
        : isP1
          ? 'P1'
          : isP1B
            ? 'P1B'
            : this.activeAssignSlot === 3 && is2v2
              ? '+P1B'
              : 'P1';
    });
    document.querySelectorAll('[data-assign-p2]').forEach((btn) => {
      const k = btn.getAttribute('data-assign-p2');
      const isP2 = !isAdv && this.slot2Hero === k;
      const isP2B = !isAdv && is2v2 && this.slot2PartnerHero === k;
      btn.classList.toggle('hidden', isAdv);
      btn.classList.toggle('active-p2', isP2 || isP2B);
      btn.textContent = isP2 ? 'P2' : isP2B ? 'P2B' : this.activeAssignSlot === 4 && is2v2 ? '+P2B' : 'P2';
    });

    // 4. Populate Left (P1 / P1B) and Right (P2 / P2B or Adventure Final Boss) Profile Panels
    const syncProfilePanel = (prefix, sideName, cfg, partnerCfg) => {
      if (!cfg) return;
      const asideEl = document.getElementById(`profile-${sideName}`);
      const nameEl = document.getElementById(`${prefix}-profile-name`);
      const roleEl = document.getElementById(`${prefix}-profile-role`);
      const styleEl = document.getElementById(`${prefix}-profile-style`);
      const traitEl = document.getElementById(`${prefix}-profile-trait`);
      const haloEl = document.getElementById(`${prefix}-halo`);
      const trueUltNameEl = document.getElementById(`${prefix}-true-ult-name`);
      const trueUltDescEl = document.getElementById(`${prefix}-true-ult-desc`);
      if (asideEl) asideEl.className = `fighter-profile profile-${cfg.theme}`;
      if (nameEl) nameEl.textContent = cfg.name;
      if (roleEl) {
        roleEl.textContent =
          is2v2 && partnerCfg ? `${cfg.role} • DUO WITH ${partnerCfg.name}` : cfg.role;
      }
      if (styleEl) styleEl.textContent = cfg.style;
      if (traitEl) traitEl.textContent = cfg.trait;
      if (haloEl) haloEl.className = `stage-halo halo-${cfg.theme}`;
      if (trueUltNameEl && cfg.trueUltName) trueUltNameEl.textContent = cfg.trueUltName;
      if (trueUltDescEl && cfg.trueUltDesc) trueUltDescEl.textContent = cfg.trueUltDesc;

      if (Array.isArray(cfg.skills)) {
        cfg.skills.forEach((sk, idx) => {
          const sName = document.getElementById(`${prefix}-skill-name-${idx}`);
          const sType = document.getElementById(`${prefix}-skill-type-${idx}`);
          const sDesc = document.getElementById(`${prefix}-skill-desc-${idx}`);
          if (sName) sName.textContent = sk.name;
          if (sType) sType.textContent = sk.type;
          if (sDesc) sDesc.textContent = sk.desc;
        });
      }
    };

    const baseLeftInspected = is2v2 && this.inspectLeftRole === 'partner' ? c1b : c1;
    const leftInspected = baseLeftInspected;
    const leftOther = is2v2 && this.inspectLeftRole === 'partner' ? c1 : c1b;
    const rightInspected = isAdv
      ? {
          name: 'BEHEMOTH MALPHAS',
          role: 'COLOSSAL ABYSSAL TITAN • ZONE IV FINAL BOSS',
          theme: 'abyssal',
          style: 'LEFT-CLIFF SIEGE COLOSSUS • 3-PHASE RAID BOSS',
          trait: 'TRAIT: EXPOSED HEART-CORE SLUMP (+45% PUNISH DMG)',
          trueUltName: 'PHASE III: HELLFIRE MAW CATACLYSM',
          trueUltDesc:
            'Inhales abyssal hellfire and scorches the central 3D lane while raining Brimstone Meteors across all 4 realms!',
          skills: [
            {
              name: 'CRUSHING METEOR FIST',
              type: 'COLOSSAL SLAM',
              desc: 'Locks a 3D floor impact ring onto your lane and slams an armored obsidian gauntlet from the heavens.'
            },
            {
              name: 'ABYSSAL RAZOR-CLAW SWEEP',
              type: 'LANE CLEAVE',
              desc: 'Rakes razor claws across the Upper or Lower 3D road — shift vertically with the joystick to evade!'
            },
            {
              name: 'HEART-CORE VULNERABILITY',
              type: 'PUNISH WINDOW',
              desc: 'After heavy slams, Malphas slumps forward exposing his molten chest core for +45% bonus damage!'
            }
          ]
        }
      : is2v2 && this.inspectRightRole === 'partner'
        ? c2b
        : c2;
    const rightOther = is2v2 && this.inspectRightRole === 'partner' ? c2 : c2b;

    syncProfilePanel('p1', 'left', leftInspected, leftOther);
    syncProfilePanel('p2', 'right', rightInspected, isAdv ? null : rightOther);

    if (this.startDuelText) {
      if (this.isAdventureMode()) {
        this.startDuelText.textContent = `START ADVENTURE • ${c1.name}`;
      } else if (this.gameMode === '2v2_brawl') {
        this.startDuelText.textContent = `${c1.name} + ${c1b.name} VS. ${c2.name} + ${c2b.name}`;
      } else if (this.gameMode === '2v2_tag') {
        this.startDuelText.textContent = `${c1.name} + ${c1b.name} VS. ${c2.name} + ${c2b.name}`;
      } else {
        this.startDuelText.textContent = `${c1.name} VS. ${c2.name}`;
      }
    }

    if (playSound && this.audio) {
      const sfxHero = CHAMPION_ROSTER[soundHeroKey || this.slot1Hero];
      if (sfxHero) this.audio.play(sfxHero.selectSfx, 600);
    }
  }

  startDuel(playSound = true) {
    this.isLandingOpen = false;
    this.setPaused(false, false);
    this._pausedFrameRendered = false;
    this.victoryOverlay?.classList.remove('is-defeat-plaque');
    if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'ROSTER SELECT';
    if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';
    if (this.landingOverlay) this.landingOverlay.classList.add('hidden');
    if (this.appEl) {
      this.appEl.classList.remove('is-landing-open');
      this.appEl.classList.toggle('is-adventure-active', Boolean(this.isAdventureMode()));
    }
    this.resetMatch();
    if (typeof window !== 'undefined' && typeof HTMLImageElement !== 'undefined' && !this.simMode) {
      setTimeout(() => this.audio?.ensureCombatWavFiles?.(), 120);
    } else {
      this.audio?.ensureCombatWavFiles?.();
    }
    this.adventure?.syncControlDeckUI();
    this.syncPauseMenuUI();
    if (playSound && this.audio) {
      this.audio.play('ult_cast', 600);
    }
  }

  openLanding(targetStep = 'roster') {
    this.setPaused(false, false);
    this.isLandingOpen = true;
    clearTimeout(this.autoNextTimeout);
    this.victoryOverlay.classList.add('hidden');
    if (this.landingOverlay) this.landingOverlay.classList.remove('hidden');
    if (this.appEl) {
      this.appEl.classList.add('is-landing-open');
      this.appEl.classList.remove('is-adventure-active');
    }
    this.updateAdventureBossHUD?.();
    this.adventure?.syncControlDeckUI();
    this.syncPauseMenuUI();
    if (targetStep) {
      this.setLandingStep(targetStep, false);
    }
    if (typeof window !== 'undefined' && typeof HTMLImageElement !== 'undefined' && !this.simMode) {
      setTimeout(() => this.prewarmSelectedAssets(), 80);
    }
  }

  renderChampionPreviews(now) {
    if (
      !this.isLandingOpen ||
      this.landingStep !== 'roster' ||
      this._appSuspended ||
      (typeof document !== 'undefined' && document.hidden)
    ) {
      return;
    }
    if (this.landingOverlay && this.landingOverlay.classList.contains('hidden')) {
      return;
    }
    const assets = PixelForge.initAssets();
    const t = now * 0.001;
    const is2v2 = this.is2v2Mode();

    // 1. Render ONLY the 11 currently visible Portrait Selector Tiles (`this.rosterVersion`) for locked 60 FPS!
    const visibleHeroKeys = this.getActiveRosterPool();
    for (let i = 0; i < visibleHeroKeys.length; i++) {
      const heroKey = visibleHeroKeys[i];
      const canvas = this.previewCanvases[heroKey];
      if (!canvas || (canvas.offsetParent === null && canvas.clientWidth === 0)) continue;
      const port = PixelForge.ensureImage(assets[heroKey]?.portrait);
      if (!port || !port.complete || !port.naturalWidth) continue;
      if (canvas._drawnPortraitImg === port) continue;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(port, 0, 0, canvas.width, canvas.height);
      canvas._drawnPortraitImg = port;
    }

    // Lossless 30fps cadence lock for animated 30fps showcase pedestals (cuts menu CPU/GPU load in half with zero visual change!)
    if (now - (this._lastPreviewMs || 0) < 30) return;
    this._lastPreviewMs = now;

    const iconsReady = Boolean(
      assets.mage?.icons?.complete &&
        assets.mage?.icons?.naturalWidth &&
        assets.heroIconsSheet?.complete &&
        assets.heroIconsSheet?.naturalWidth
    );

    const drawAnimatedHeroOnStage = (
      sctx,
      heroKey,
      flipX,
      destX,
      destY,
      destSize,
      phaseOffset = 0,
      alpha = 1,
      drawBadge = false,
      cw = 320,
      ch = 240
    ) => {
      PixelForge.ensureHeroLoaded?.(heroKey);
      const heroEntry = assets[heroKey];
      const sheet = heroEntry?.sheet;
      const cfg = CHAMPION_ROSTER[heroKey];
      if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
      const isClassic208 = sheet.naturalWidth === 6240 && sheet.naturalHeight === 2080;
      const cellW = isClassic208 ? 208 : heroEntry?.cellW || (sheet.naturalWidth === 9600 ? 320 : 208);
      const cellH = isClassic208 ? 208 : heroEntry?.cellH || (sheet.naturalHeight === 2400 ? 240 : 208);
      const anchorX = isClassic208 ? 104 : heroEntry?.anchorX ?? (cellW === 320 ? 112 : 104);
      const anchorY = isClassic208 ? 198 : heroEntry?.anchorY ?? (cellH === 240 ? 230 : 198);
      const isWideCell = !(cellW === 208 && cellH === 208);
      const cols = Math.max(1, Math.round(sheet.naturalWidth / cellW));
      const isExHero = heroKey.endsWith('_ex');
      const isSeraphim = heroKey === 'priestess' || heroKey === 'priestess_ex';
      let col = 0;
      let row = 0;
      let stateTag = 'IDLE';
      let wingEnv = 0;
      if (cols === 30) {
        const cycle = (t + phaseOffset + (flipX ? 1.4 : 0)) % 6.0;
        if (cycle < 1.8) {
          row = 0;
          col = Math.floor((t + phaseOffset) * 24) % 30;
          stateTag = 'IDLE • 30FPS';
        } else if (cycle < 2.8) {
          row = 2;
          const u = (cycle - 1.8) / 1.0;
          col = Math.min(29, Math.floor(u * 30));
          stateTag = 'ATTACK • 30FPS';
          if (isSeraphim) wingEnv = Math.sin(u * Math.PI) * 0.88;
        } else if (cycle < 3.8) {
          row = heroKey === 'priestess' || isExHero ? 3 : 7;
          const u = (cycle - 2.8) / 1.0;
          col = Math.min(29, Math.floor(u * 30));
          stateTag = 'SKILL • 30FPS';
          if (isSeraphim) wingEnv = Math.min(1, Math.sin(u * Math.PI) * 1.55);
        } else if (cycle < 4.8) {
          row = heroKey === 'priestess' || isExHero ? 4 : 8;
          const u = (cycle - 3.8) / 1.0;
          col = Math.min(29, Math.floor(u * 30));
          stateTag = 'OVERDRIVE ULT';
          if (isSeraphim) wingEnv = Math.min(1, Math.sin(u * Math.PI) * 1.7);
        } else {
          row = 1;
          col = Math.floor((t + phaseOffset) * 24) % 30;
          stateTag = 'STRIDE • 30FPS';
        }
      } else {
        let frameIdx = Math.floor((t + phaseOffset) * 6.5) % 8;
        const cycle = (t + phaseOffset + (flipX ? 1.4 : 0)) % 3.8;
        if (cycle > 2.2 && cycle < 3.2) {
          const atkStep = Math.min(7, Math.floor(((cycle - 2.2) / 1.0) * 8));
          frameIdx = 16 + atkStep;
        }
        col = frameIdx % cols;
        row = (frameIdx / cols) | 0;
      }
      const hover =
        isSeraphim
          ? wingEnv > 0.02
            ? -Math.round(wingEnv * (row === 4 ? 14 : row === 3 ? 10 : 5))
            : Math.round(Math.sin((t + phaseOffset) * 3.2) * 2)
          : 0;

      const sf = destSize / 208;
      const dw = isWideCell ? Math.round(cellW * sf) : destSize;
      const dh = isWideCell ? Math.round(cellH * sf) : destSize;
      const scaledAnchorX = Math.round(anchorX * sf);
      const scaledAnchorY = Math.round(anchorY * sf);
      let wideLeft = destX;
      let wideTop = destY;
      let footCx = Math.round(destX + destSize * 0.5);
      let footY = Math.min(ch - 6, Math.round(destY + destSize * (198 / 208)));

      if (isWideCell) {
        if (destSize === 208 && cw >= cellW && ch >= cellH) {
          // 1v1 full-size 320x240 showcase: exact 1:1 integer blit at (0, 0, 320, 240) with 0px clipping!
          wideLeft = Math.round((cw - cellW) * 0.5);
          wideTop = ch - cellH;
          footCx = flipX ? wideLeft + cellW - anchorX : wideLeft + anchorX;
          footY = Math.min(ch - 6, wideTop + anchorY);
        } else {
          // 2v2_tag duo showcase: align anchor to slot foot position and clamp inside [0..cw] x [0..ch]!
          const targetFootX = Math.round(destX + destSize * 0.5);
          const targetFootY = Math.round(destY + destSize * (198 / 208));
          const rawLeft = flipX ? targetFootX - (dw - scaledAnchorX) : targetFootX - scaledAnchorX;
          const rawTop = targetFootY - scaledAnchorY;
          wideLeft = Math.max(0, Math.min(cw - dw, rawLeft));
          wideTop = Math.max(0, Math.min(ch - dh, rawTop));
          footCx = flipX ? wideLeft + dw - scaledAnchorX : wideLeft + scaledAnchorX;
          footY = Math.min(ch - 6, wideTop + scaledAnchorY);
        }
      }

      // Grounded HD-2D Elemental Pedestal Rim & Rising Embers
      const primaryCol = cfg?.color || '#38bdf8';
      sctx.save();
      sctx.globalAlpha = alpha * 0.72;
      sctx.fillStyle = primaryCol;
      sctx.fillRect(footCx - 38, footY, 76, 3);
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(footCx - 18, footY, 36, 2);

      for (let m = 0; m < 5; m++) {
        const mLife = (t * (1.3 + m * 0.22) + phaseOffset + m * 0.41) % 1;
        const mx = Math.round(footCx + (m - 2) * 16 + Math.sin(t * 4.5 + m) * 5);
        const my = Math.round(footY - 4 - mLife * 54);
        sctx.globalAlpha = alpha * (1 - mLife) * 0.85;
        sctx.fillStyle = m % 2 === 0 ? primaryCol : '#fef08a';
        sctx.fillRect(mx - 1, my - 1, 3, 3);
      }
      sctx.restore();

      const wingSheet = isSeraphim ? assets[heroKey]?.wings || assets.priestess?.wings : null;
      const drawHeroWithWings = () => {
        if (wingEnv > 0.02 && wingSheet && wingSheet.complete && wingSheet.naturalWidth > 0) {
          const wScale = (0.72 + 0.10 * wingEnv) * sf;
          const wW = Math.round(320 * wScale);
          const wH = Math.round(232 * wScale);
          const sx = (isWideCell ? anchorX - 6 : 98) * sf;
          const sy = (isWideCell ? anchorY - 124 : 74) * sf;
          const wdx = Math.round(sx - wW * 0.5);
          const wdy = Math.round(sy - wH * (88 / 232));
          const wCol = Math.floor((t + phaseOffset) * 30) % 30;
          sctx.save();
          sctx.globalAlpha = alpha * Math.min(1, wingEnv * 0.98);
          sctx.drawImage(wingSheet, wCol * 320, 0, 320, 232, wdx, wdy, wW, wH);
          sctx.restore();
        }
        sctx.drawImage(sheet, col * cellW, row * cellH, cellW, cellH, 0, 0, dw, dh);
      };

      sctx.save();
      sctx.globalAlpha = alpha;
      const blitX = isWideCell ? wideLeft : destX;
      const blitY = (isWideCell ? wideTop : destY) + hover;
      if (flipX) {
        sctx.translate(blitX + dw, blitY);
        sctx.scale(-1, 1);
        drawHeroWithWings();
      } else {
        sctx.translate(blitX, blitY);
        drawHeroWithWings();
      }
      sctx.restore();

      if (drawBadge) {
        sctx.save();
        sctx.font = '7px "Press Start 2P", monospace';
        sctx.textAlign = flipX ? 'right' : 'left';
        const tx = flipX ? cw - 8 : 8;
        sctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        sctx.fillText(stateTag, tx + 1, 13);
        sctx.fillStyle = stateTag === 'OVERDRIVE ULT' ? '#facc15' : primaryCol;
        sctx.fillText(stateTag, tx, 12);
        sctx.restore();
      }
    };

    // 2. Render Live Animated Fighter Sprites & 3 Bespoke VFX Skill Icons on Left (P1) and Right (P2) Profile Panels
    const drawSideProfileVisuals = (prefix, primaryKey, secondaryKey, flipX) => {
      const cfg = CHAMPION_ROSTER[primaryKey];
      if (!cfg) return;

      const spriteCanvas = document.getElementById(`${prefix}-sprite-canvas`);
      if (spriteCanvas && (spriteCanvas.offsetParent !== null || spriteCanvas.clientWidth > 0)) {
        const cw = 320;
        const ch = 240;
        if (spriteCanvas.width !== cw || spriteCanvas.height !== ch) {
          spriteCanvas.width = cw;
          spriteCanvas.height = ch;
        }
        const sctx = spriteCanvas.getContext('2d');
        sctx.clearRect(0, 0, cw, ch);
        sctx.imageSmoothingEnabled = false;

        if (is2v2 && secondaryKey && CHAMPION_ROSTER[secondaryKey]) {
          // Draw partner slightly behind & clearly separated horizontally to showcase the 2v2 Duo on the 320x240 stage pedestal
          const backSize = 164;
          const frontSize = 186;
          const backX = flipX ? 140 : 16;
          const frontX = flipX ? 28 : 106;
          drawAnimatedHeroOnStage(sctx, secondaryKey, flipX, backX, 58, backSize, 2.1, 0.92, false, cw, ch);
          drawAnimatedHeroOnStage(sctx, primaryKey, flipX, frontX, 48, frontSize, 0, 1.0, true, cw, ch);
        } else {
          drawAnimatedHeroOnStage(sctx, primaryKey, flipX, 56, 32, 208, 0, 1.0, true, cw, ch);
        }
      }

      if (Array.isArray(cfg.skills)) {
        cfg.skills.forEach((_sk, idx) => {
          const iconCanvas = document.getElementById(`${prefix}-skill-icon-${idx}`);
          if (!iconCanvas) return;
          if (iconCanvas._drawnHeroKey === primaryKey && iconCanvas._iconsReady && iconsReady) return;
          const ictx = iconCanvas.getContext('2d');
          PixelForge.drawSkillIcon(ictx, primaryKey, idx, iconCanvas.width, iconCanvas.height, t);
          iconCanvas._drawnHeroKey = primaryKey;
          iconCanvas._iconsReady = iconsReady;
        });
      }

      const supIconCanvas = document.getElementById(`${prefix}-skill-icon-3`);
      const supBox = document.getElementById(`${prefix}-true-ult-box`);
      if (supIconCanvas) {
        const showSupIcon = Boolean(CHAMPION_ROSTER[primaryKey]);
        supIconCanvas.classList.toggle('hidden', !showSupIcon);
        if (supBox) supBox.classList.toggle('has-supreme-icon', showSupIcon);
        if (showSupIcon) {
          if (!(supIconCanvas._drawnHeroKey === primaryKey && supIconCanvas._iconsReady && iconsReady)) {
            const sictx = supIconCanvas.getContext('2d');
            PixelForge.drawSkillIcon(
              sictx,
              primaryKey,
              3,
              supIconCanvas.width,
              supIconCanvas.height,
              t
            );
            supIconCanvas._drawnHeroKey = primaryKey;
            supIconCanvas._iconsReady = iconsReady;
          }
        }
      }
    };

    const p1Front = is2v2 && this.inspectLeftRole === 'partner' ? this.slot1PartnerHero : this.slot1Hero;
    const p1Back = is2v2 && this.inspectLeftRole === 'partner' ? this.slot1Hero : this.slot1PartnerHero;
    const p2Front = is2v2 && this.inspectRightRole === 'partner' ? this.slot2PartnerHero : this.slot2Hero;
    const p2Back = is2v2 && this.inspectRightRole === 'partner' ? this.slot2Hero : this.slot2PartnerHero;

    drawSideProfileVisuals('p1', p1Front, p1Back, false);
    if (this.isAdventureMode()) {
      const bossCanvas = document.getElementById('p2-sprite-canvas');
      if (bossCanvas) {
        const cw = 320;
        const ch = 240;
        if (bossCanvas.width !== cw || bossCanvas.height !== ch) {
          bossCanvas.width = cw;
          bossCanvas.height = ch;
        }
        const bctx = bossCanvas.getContext('2d');
        bctx.clearRect(0, 0, cw, ch);
        bctx.imageSmoothingEnabled = false;
        const bossPort = PixelForge.ensureImage(
          assets.archfiend?.portrait || assets.boss_archfiend?.portrait
        );
        const pulse = 0.55 + 0.25 * Math.sin(t * 3.8);
        bctx.fillStyle = `rgba(220, 38, 38, ${(0.22 * pulse).toFixed(3)})`;
        bctx.fillRect(70, 204, 180, 18);
        if (bossPort?.complete && bossPort.naturalWidth) {
          const bob = Math.round(Math.sin(t * 2.4) * 3);
          bctx.drawImage(bossPort, 76, 32 + bob, 168, 168);
          bctx.strokeStyle = '#f97316';
          bctx.lineWidth = 2;
          bctx.strokeRect(76, 32 + bob, 168, 168);
        } else {
          drawAnimatedHeroOnStage(bctx, 'reaper', true, 56, 32, 208, 0, 1.0, false, cw, ch);
        }
        bctx.font = 'bold 10px monospace';
        bctx.fillStyle = '#09070d';
        bctx.fillText('ZONE IV COLOSSUS', 105, 15);
        bctx.fillStyle = '#fb923c';
        bctx.fillText('ZONE IV COLOSSUS', 104, 14);
      }
      const drawBossThreatIcon = (ictx, idx, iw, ih, timeSec) => {
        if (PixelForge.drawHeroSheetIcon?.(ictx, 'archfiend', idx, iw, ih, timeSec)) {
          return;
        }
        ictx.save();
        ictx.clearRect(0, 0, iw, ih);
        ictx.imageSmoothingEnabled = false;
        // Dark obsidian abyssal plaque background
        ictx.fillStyle = '#090612';
        ictx.fillRect(0, 0, iw, ih);
        const glow = 0.65 + 0.35 * Math.sin(timeSec * 4.2 + idx * 1.3);

        if (idx === 0) {
          // 0: CRUSHING METEOR FIST — 3D floor impact target ring + descending obsidian gauntlet
          ictx.fillStyle = `rgba(239, 68, 68, ${(0.28 * glow).toFixed(3)})`;
          ictx.fillRect(8, 44, 48, 12);
          ictx.strokeStyle = '#fb923c';
          ictx.lineWidth = 2;
          ictx.strokeRect(10, 46, 44, 8);
          ictx.fillStyle = '#f97316';
          ictx.fillRect(22, 6, 4, 14);
          ictx.fillRect(38, 8, 4, 12);
          ictx.fillStyle = '#1e1b2e';
          ictx.fillRect(18, 16, 28, 24);
          ictx.fillStyle = '#dc2626';
          ictx.fillRect(20, 18, 24, 6);
          ictx.fillStyle = '#fef08a';
          ictx.fillRect(22, 34, 6, 6);
          ictx.fillRect(30, 35, 6, 6);
          ictx.fillRect(38, 34, 6, 6);
        } else if (idx === 1) {
          // 1: ABYSSAL RAZOR-CLAW SWEEP — 3 diagonal molten crimson-gold claw rakes across 3D lanes
          ictx.fillStyle = 'rgba(127, 29, 29, 0.35)';
          ictx.fillRect(6, 16, 52, 12);
          ictx.fillRect(6, 36, 52, 12);
          for (let c = 0; c < 3; c++) {
            const ox = 10 + c * 14;
            ictx.fillStyle = '#ef4444';
            for (let s = 0; s < 9; s++) {
              ictx.fillRect(ox + s * 3, 10 + s * 5, 6, 4);
            }
            ictx.fillStyle = '#fef08a';
            for (let s = 1; s < 8; s++) {
              ictx.fillRect(ox + 1 + s * 3, 11 + s * 5, 3, 2);
            }
          }
        } else {
          // 2: HEART-CORE VULNERABILITY — parted obsidian rib-plates exposing pulsing molten core
          ictx.fillStyle = '#1e1b2e';
          ictx.fillRect(8, 12, 16, 40);
          ictx.fillRect(40, 12, 16, 40);
          ictx.fillStyle = '#475569';
          for (let r = 0; r < 3; r++) {
            ictx.fillRect(10, 16 + r * 12, 14, 4);
            ictx.fillRect(40, 16 + r * 12, 14, 4);
          }
          const rOuter = Math.round(11 + 2 * glow);
          ictx.fillStyle = '#ea580c';
          ictx.fillRect(32 - rOuter, 32 - rOuter, rOuter * 2, rOuter * 2);
          ictx.fillStyle = '#fde047';
          ictx.fillRect(25, 25, 14, 14);
          ictx.fillStyle = '#ffffff';
          ictx.fillRect(29, 29, 6, 6);
        }

        ictx.strokeStyle = '#991b1b';
        ictx.lineWidth = 2;
        ictx.strokeRect(1, 1, iw - 2, ih - 2);
        ictx.restore();
      };
      [0, 1, 2].forEach((idx) => {
        const iconCanvas = document.getElementById(`p2-skill-icon-${idx}`);
        if (iconCanvas) {
          drawBossThreatIcon(
            iconCanvas.getContext('2d'),
            idx,
            iconCanvas.width,
            iconCanvas.height,
            t
          );
        }
      });
      const supIconCanvas = document.getElementById('p2-skill-icon-3');
      const supBox = document.getElementById('p2-true-ult-box');
      if (supIconCanvas) {
        supIconCanvas.classList.remove('hidden');
        if (supBox) supBox.classList.add('has-supreme-icon');
        drawBossThreatIcon(
          supIconCanvas.getContext('2d'),
          3,
          supIconCanvas.width,
          supIconCanvas.height,
          t
        );
      }
    } else {
      drawSideProfileVisuals('p2', p2Front, p2Back, true);
    }
  }

  getTeamFighters(team) {
    if (!this.fighters) return [];
    return this.fighters.filter((f) => f && f.team === team);
  }

  getTeammateOf(fighter) {
    if (!fighter || !this.is2v2Mode() || !this.fighters) return null;
    return this.fighters.find((f) => f && f !== fighter && f.team === fighter.team) || null;
  }

  getEnemiesOf(fighter) {
    if (!fighter || !this.fighters) return [];
    const activeEnemies = this.fighters.filter(
      (f) => f && f.team !== fighter.team && !f.isDead && !f.isBenched
    );
    if (activeEnemies.length > 0) return activeEnemies;
    const anyLivingEnemies = this.fighters.filter((f) => f && f.team !== fighter.team && !f.isDead);
    if (anyLivingEnemies.length > 0) return anyLivingEnemies;
    if (typeof this.isAdventureMode === 'function' && this.isAdventureMode()) {
      return [];
    }
    const fallback = fighter.team === 1 ? this.rightFighter : this.leftFighter;
    return fallback && !fallback.isDead ? [fallback] : [];
  }

  getTargetFor(fighter) {
    if (!fighter || !this.fighters) return null;
    const myTeam = fighter.team;
    const myX = fighter.x;
    const isPartner = fighter.slotRole === 'partner';
    let bestActive = null;
    let bestActiveScore = Infinity;
    let bestAnyLiving = null;
    let bestAnyLivingScore = Infinity;

    for (let i = 0; i < this.fighters.length; i++) {
      const e = this.fighters[i];
      if (!e || e.team === myTeam || e.isDead) continue;
      const dist = Math.abs(e.x - myX);
      const hpRatio = e.hp / Math.max(1, e.maxHp);
      const roleBias = isPartner && e.slotRole === 'partner' ? -55 : 0;
      const score = dist + hpRatio * 95 + roleBias;
      if (!e.isBenched) {
        if (score < bestActiveScore) {
          bestActiveScore = score;
          bestActive = e;
        }
      } else if (score < bestAnyLivingScore) {
        bestAnyLivingScore = score;
        bestAnyLiving = e;
      }
    }

    if (bestActive) return bestActive;
    if (bestAnyLiving) return bestAnyLiving;
    if (typeof this.isAdventureMode === 'function' && this.isAdventureMode()) {
      return null;
    }
    return fighter.team === 1 ? this.rightFighter : this.leftFighter;
  }

  getPointFighter(team) {
    const members = this.getTeamFighters(team);
    const activePoint = members.find((f) => f.isPoint && !f.isDead && !f.isBenched);
    if (activePoint) return activePoint;
    const activeAny = members.find((f) => !f.isDead && !f.isBenched);
    if (activeAny) return activeAny;
    return members[0] || (team === 1 ? this.leftFighter : this.rightFighter);
  }

  getReserveFighter(team) {
    const point = this.getPointFighter(team);
    const members = this.getTeamFighters(team);
    return members.find((f) => f !== point) || null;
  }

  drawPartnerPortrait(canvas, heroId, accentColor) {
    if (!canvas) return;
    const assets = PixelForge.initAssets();
    const port = PixelForge.ensureImage(assets[heroId]?.portrait);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    if (port && port.complete && port.naturalWidth) {
      ctx.drawImage(port, 0, 0, canvas.width, canvas.height);
    } else if (port) {
      port.addEventListener(
        'load',
        () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(port, 0, 0, canvas.width, canvas.height);
        },
        { once: true }
      );
    }
    canvas.style.borderColor = accentColor || '#fbbf24';
  }

  resetMatch() {
    this.setPaused(false, false);
    this.disposeActiveFighterResources();
    this.vfx.clear();
    clearTimeout(this.victoryTimeout);
    clearTimeout(this.autoNextTimeout);
    clearTimeout(this.ultBannerTimeout);
    this.autoNextTimeout = null;
    this._autoNextRemainingMs = 0;
    this._autoNextDeadlineMs = 0;

    this.testModeUnlimitedHp = this.isAdventureMode()
      ? Boolean(this.explicitAdvUnlimitedHp)
      : Boolean(this.vsTestModeUnlimitedHp);

    if (this.isAdventureMode()) {
      if (this.renderer) {
        this.renderer.releaseStageCutoutCaches?.(false);
        this.renderer.stageEventTimer = 0;
        this.renderer.stageEventBannerTimer = 0;
        this.renderer.koZoomTimer = 0;
        this.renderer.cutInTimer = 0;
      }
      this._lastActiveVsStageId = null;
      this._wasAdventureMatch = true;
      if (this.btnNextChallenger) this.btnNextChallenger.classList.add('hidden');
      if (this.btnPlayAgain) this.btnPlayAgain.textContent = 'RETRY CAMPAIGN';

      const gy = this.renderer.groundY;
      const heroKey = CHAMPION_ROSTER[this.slot1Hero] ? this.slot1Hero : 'mage';
      PixelForge.releaseInactiveAssets?.([heroKey], [], true);
      PixelForge.ensureHeroLoaded?.(heroKey);
      PixelForge.ensureAdventureLoaded?.(0);
      const canAssetGate =
        typeof window !== 'undefined' &&
        typeof HTMLImageElement !== 'undefined' &&
        !this.simMode &&
        !this.isLandingOpen;
      this._matchAssetGateUntil =
        canAssetGate && !PixelForge.areMatchAssetsReady?.({ heroIds: [heroKey], isAdventure: true, zoneIdx: 0 })
          ? Date.now() + 1400
          : 0;
      const c1 = CHAMPION_ROSTER[heroKey];
      this.leftFighter = new c1.cls(240, gy, 1);
      if (!this.leftFighter.heroId) this.leftFighter.heroId = heroKey;
      this.leftFighter.game = this;
      this.leftFighter.team = 1;
      this.leftFighter.slotRole = 'lead';
      this.leftFighter.isPoint = true;
      this.leftFighter.isBenched = false;
      this.leftPartner = null;
      this.rightPartner = null;

      this.applySideHUDTheme(this.hudEls.left, c1, this.leftFighter, null);
      PixelForge.setHUDPortraits(c1.id, c1.color, 'archfiend', '#ef4444');

      this.matchTime = 0;
      this.ultSlowTimer = 0;
      this.koSlowTimer = 0;
      this.clashCooldown = 0;
      this.stageEventTriggered = false;
      this.stageEventTimer = 0;
      this.stageEventTickTimer = 0;
      this.isMatchOver = false;
      this.victoryRevealPending = false;
      this.deadMatchFighter = null;
      this.postDeathHoldTimer = 0;
      this.matchOverSafetyTimer = 0;
      this.victoryOverlay.classList.remove('is-defeat-plaque');
      this.victoryOverlay.classList.add('hidden');
      if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'ROSTER SELECT';
      if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';
      if (this.ultBanner) this.ultBanner.classList.add('hidden');

      this.syncTestModeUI();
      this.syncPauseMenuUI();
      this.adventure.startCampaign(this.leftFighter);
      this.updateHUD();
      return;
    }

    if (this.adventure?.active) {
      this.adventure.stopCampaign();
    }
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('hud-right')?.classList?.remove?.('hidden');
    }
    this.pauseSpBadge?.classList.add('hidden');
    if (this.btnNextChallenger) this.btnNextChallenger.classList.remove('hidden');
    if (this.btnPlayAgain) this.btnPlayAgain.textContent = 'REMATCH';
    if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'ROSTER SELECT';
    if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';

    if (this.renderer) {
      if (typeof this.renderer.pickRandomStage === 'function') {
        this.renderer.pickRandomStage(this.forcedStage);
      }
      if (this._wasAdventureMatch || this._lastActiveVsStageId !== this.renderer.stageId) {
        this.renderer.releaseStageCutoutCaches?.(true);
      }
      this._lastActiveVsStageId = this.renderer.stageId;
      this._wasAdventureMatch = false;
      this.renderer.stageEventTimer = 0;
      this.renderer.stageEventBannerTimer = 0;
      this.renderer.koZoomTimer = 0;
      this.renderer.cutInTimer = 0;
      this.renderer.camX = 600;
      this.renderer.camY = (this.renderer.groundY || 520) - 95;
      this.renderer.zoom =
        this.renderer.isMobileLandscape &&
        typeof this.renderer.getMobileLandscapeFixedZoom === 'function'
          ? this.renderer.getMobileLandscapeFixedZoom(false)
          : this.renderer.isMobilePortrait &&
              typeof this.renderer.getMobilePortraitFixedZoom === 'function'
            ? this.renderer.getMobilePortraitFixedZoom(false)
            : this.renderer.isMobile
              ? 0.72
              : 1.0;
    }
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;
    const is2v2 = this.is2v2Mode();
    this.ensureDistinctTeamPartners();

    const c1 = CHAMPION_ROSTER[this.slot1Hero] || CHAMPION_ROSTER.titan;
    const c1b = CHAMPION_ROSTER[this.slot1PartnerHero] || CHAMPION_ROSTER.priestess;
    const c2 = CHAMPION_ROSTER[this.slot2Hero] || CHAMPION_ROSTER.archer;
    const c2b = CHAMPION_ROSTER[this.slot2PartnerHero] || CHAMPION_ROSTER.reaper;
    const activeHeroIds = is2v2 ? [c1.id, c2.id, c1b.id, c2b.id] : [c1.id, c2.id];
    const activeStageId = this.renderer?.stageId || this.forcedStage || 'cathedral';
    const activeStageMeta = this.renderer?.getCurrentStageMeta?.();
    const activeStageKeys = activeStageMeta?.assetKey ? [activeStageMeta.assetKey] : ['arenaBg'];
    PixelForge.releaseInactiveAssets?.(activeHeroIds, activeStageKeys, false);
    PixelForge.ensureStageLoaded?.(activeStageId);
    PixelForge.ensureHeroLoaded?.(c1.id);
    PixelForge.ensureHeroLoaded?.(c2.id);
    if (is2v2) {
      PixelForge.ensureHeroLoaded?.(c1b.id);
      PixelForge.ensureHeroLoaded?.(c2b.id);
    }
    const canAssetGate =
      typeof window !== 'undefined' &&
      typeof HTMLImageElement !== 'undefined' &&
      !this.simMode &&
      !this.isLandingOpen;
    this._matchAssetGateUntil =
      canAssetGate &&
      !PixelForge.areMatchAssetsReady?.({
        heroIds: activeHeroIds,
        stageId: activeStageId,
        isAdventure: false
      })
        ? Date.now() + 1400
        : 0;

    this.leftFighter = new c1.cls(is2v2 ? ww * 0.25 : ww * 0.2, gy, 1);
    this.rightFighter = new c2.cls(is2v2 ? ww * 0.75 : ww * 0.8, gy, -1);
    this.leftFighter.game = this;
    this.rightFighter.game = this;
    this.leftFighter.team = 1;
    this.rightFighter.team = 2;
    this.leftFighter.slotRole = 'lead';
    this.rightFighter.slotRole = 'lead';
    this.leftFighter.isPoint = true;
    this.rightFighter.isPoint = true;
    this.leftFighter.isBenched = false;
    this.rightFighter.isBenched = false;
    this.leftFighter.benchX = 76;
    this.rightFighter.benchX = ww - 76;

    if (is2v2) {
      const isTag = this.gameMode === '2v2_tag';
      this.leftPartner = new c1b.cls(isTag ? 76 : ww * 0.14, gy, 1);
      this.rightPartner = new c2b.cls(isTag ? ww - 76 : ww * 0.86, gy, -1);
      this.leftPartner.game = this;
      this.rightPartner.game = this;
      this.leftPartner.team = 1;
      this.rightPartner.team = 2;
      this.leftPartner.slotRole = 'partner';
      this.rightPartner.slotRole = 'partner';
      this.leftPartner.isPoint = false;
      this.rightPartner.isPoint = false;
      this.leftPartner.isBenched = isTag;
      this.rightPartner.isBenched = isTag;
      this.leftPartner.benchX = 76;
      this.rightPartner.benchX = ww - 76;
      // Render partners slightly behind lead fighters
      this.fighters = [this.leftPartner, this.rightPartner, this.leftFighter, this.rightFighter];
    } else {
      this.leftPartner = null;
      this.rightPartner = null;
      this.fighters = [this.leftFighter, this.rightFighter];
    }

    // Configure dynamic HUD headers, bar themes, Partner Wings & portraits
    this.applySideHUDTheme(this.hudEls.left, c1, this.leftFighter, c1b);
    this.applySideHUDTheme(this.hudEls.right, c2, this.rightFighter, c2b);
    PixelForge.setHUDPortraits(c1.id, c1.color, c2.id, c2.color);

    if (this.hudEls.crestVs) {
      this.hudEls.crestVs.textContent = is2v2 ? '2V2' : 'VS';
    }
    if (this.hudEls.modeBadge) {
      this.hudEls.modeBadge.textContent = this.formatModeBadgeText();
    }
    this.syncTestModeUI();
    this.syncPauseMenuUI();
    if (this.hudEls.stageBadge) {
      const stgNames = {
        cathedral: 'GOTHIC SANCTUARY',
        sylvan: 'SYLVAN GLADE',
        boneyard: 'NECROPOLIS',
        clocktower: 'ASTRAL CLOCKTOWER',
        sanctuary: 'RADIANT SANCTUARY',
        inferno: 'LAYWASTE OF INFERNO',
        shogunate: 'SHOGUNATE CITADEL',
        shogunate_inferno: 'INFERNO SHOGUNATE',
        glacial: 'BOREALIS SANCTUARY',
        shogunate_glacial: 'FROST SHOGUNATE'
      };
      this.hudEls.stageBadge.textContent = stgNames[this.renderer?.stageId] || 'GOTHIC SANCTUARY';
    }

    this.matchTime = 0;
    this.ultSlowTimer = 0;
    this.koSlowTimer = 0;
    this.clashCooldown = 0;
    this.team1TagCd = 2.4;
    this.team2TagCd = 2.8;
    this.team1AssistCd = 2.8;
    this.team2AssistCd = 3.4;
    this.stageEventTriggered = false;
    this.stageEventTimer = 0;
    this.stageEventTickTimer = 0;
    this.isMatchOver = false;
    this.victoryRevealPending = false;
    this.deadMatchFighter = null;
    this.postDeathHoldTimer = 0;
    this.matchOverSafetyTimer = 0;
    this.victoryOverlay.classList.remove('is-defeat-plaque');
    this.victoryOverlay.classList.add('hidden');
    if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'ROSTER SELECT';
    if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';
    if (this.ultBanner) this.ultBanner.classList.add('hidden');
    this.updateHUD();
  }

  applySideHUDTheme(els, rosterCfg, fighter, partnerCfg = null) {
    if (!els || !rosterCfg || !fighter) return;
    if (els.name) els.name.textContent = rosterCfg.name;
    if (els.skillText) els.skillText.textContent = fighter.skillName;
    if (els.hpBar) {
      els.hpBar.className = `hp-fill fill-${rosterCfg.theme}`;
    }
    if (els.portraitFrame) {
      els.portraitFrame.className = `portrait-frame frame-${rosterCfg.theme}`;
    }
    if (els.partnerWing) {
      const showPartner = this.is2v2Mode() && Boolean(partnerCfg);
      els.partnerWing.classList.toggle('hidden', !showPartner);
      if (showPartner && partnerCfg) {
        if (els.partnerName) els.partnerName.textContent = partnerCfg.name;
        if (els.partnerHpBar) {
          els.partnerHpBar.className = `partner-hp-fill fill-${partnerCfg.theme}`;
        }
        this.drawPartnerPortrait(els.partnerPortrait, partnerCfg.id, partnerCfg.color);
      }
    }
  }

  triggerTeamTagSwap(team, manual = false) {
    if (this.gameMode !== '2v2_tag' || this.isMatchOver) return false;
    const cdKey = team === 1 ? 'team1TagCd' : 'team2TagCd';
    if (!manual && this[cdKey] > 0) return false;

    const point = this.getPointFighter(team);
    const reserve = this.getReserveFighter(team);
    if (!point || !reserve || reserve.isDead || !reserve.isBenched) return false;

    this[cdKey] = 11.0;
    const gy = this.renderer.groundY;
    const incomingX = Math.max(130, Math.min(this.renderer.worldWidth - 130, point.x + (team === 1 ? 34 : -34)));

    // Outgoing point fighter vaults to the Sanctuary Tag Pedestal
    if (!point.isDead) {
      point.isBenched = true;
      point.isPoint = false;
      point.x = point.benchX || (team === 1 ? 76 : this.renderer.worldWidth - 76);
      point.y = gy;
      point.vx = 0;
      point.vy = 0;
      point.setState('IDLE');
    }

    // Reserve partner leaps into the arena with a Tag-In Assault strike!
    reserve.isBenched = false;
    reserve.isPoint = true;
    reserve.x = incomingX;
    reserve.y = gy - 28;
    reserve.vx = (team === 1 ? 1 : -1) * 260;
    reserve.vy = -180;
    reserve.gainMana(18);
    reserve.skillCooldown = Math.min(reserve.skillCooldown, 0.35);
    reserve.setState('SKILL');

    // Refresh HUD primary/partner portraits for this side
    const sideKey = team === 1 ? 'left' : 'right';
    const pointCfg = CHAMPION_ROSTER[reserve.heroId];
    const partnerCfg = CHAMPION_ROSTER[point.heroId];
    this.applySideHUDTheme(this.hudEls[sideKey], pointCfg, reserve, partnerCfg);
    const leftPoint = this.getPointFighter(1);
    const rightPoint = this.getPointFighter(2);
    const lc = CHAMPION_ROSTER[leftPoint.heroId] || CHAMPION_ROSTER.titan;
    const rc = CHAMPION_ROSTER[rightPoint.heroId] || CHAMPION_ROSTER.archer;
    PixelForge.setHUDPortraits(lc.id, lc.color, rc.id, rc.color);

    this.vfx.spawnSpecialCastAura(
      reserve,
      'TAG-IN ASSAULT!',
      `${reserve.name} ENTERS!`,
      reserve.theme || 'steel',
      false
    );
    this.vfx.spawnShockwave(reserve.x, gy - 48, 150, reserve.primaryColor, 0.36, true);
    this.vfx.spawnBurst(reserve.x, gy - 68, 22, reserve.primaryColor, 260, { upBias: 110, size: 6 });
    if (this.audio) this.audio.play('dash_whoosh', reserve.x);
    this.renderer.triggerShake(8, 0.2);
    return true;
  }

  triggerTeamAssist(team, manual = false) {
    if (!this.is2v2Mode() || this.isMatchOver) return false;
    const cdKey = team === 1 ? 'team1AssistCd' : 'team2AssistCd';
    if (!manual && this[cdKey] > 0) return false;

    const point = this.getPointFighter(team);
    const ally = this.getReserveFighter(team);
    if (!point || !ally || ally.isDead) return false;

    this[cdKey] = 5.2;
    const target = this.getTargetFor(point);
    if (!target || target.isDead) return false;

    if (this.gameMode === '2v2_tag' && ally.isBenched) {
      // Reserve Partner fires a Cross-Arena Tag Assist Barrage from the Sanctuary Pedestal!
      const dir = target.x >= ally.x ? 1 : -1;
      const baseAllyId = ally.heroId?.endsWith('_ex') ? ally.heroId.slice(0, -3) : ally.heroId;
      ally.facing = dir;
      this.vfx.spawnSpecialCastAura(
        ally,
        'TAG ASSIST!',
        `${ally.name} COVER FIRE`,
        ally.theme || 'steel',
        false
      );
      this.vfx.spawnProjectile({
        x: ally.x + dir * 48,
        y: ally.y - 102,
        vx: dir * 780,
        vy: 0,
        radius: 28,
        color: ally.primaryColor,
        coreColor: '#ffffff',
        damage: 215,
        owner: ally,
        type:
          baseAllyId === 'archer'
            ? 'arrow'
            : baseAllyId === 'priestess'
              ? 'holy_light'
              : baseAllyId === 'reaper'
                ? 'phantom_scythe'
                : baseAllyId === 'chronomancer'
                  ? 'clock_gear'
                  : baseAllyId === 'titan'
                    ? 'forge_wave'
                    : ally.heroId === 'ronin_ex'
                      ? 'ronin_slash'
                      : baseAllyId === 'ronin'
                        ? 'storm_wave'
                        : baseAllyId === 'valkyrie'
                          ? 'dragon_lance'
                          : baseAllyId === 'icemage'
                            ? 'cryo_shard'
                            : baseAllyId === 'android'
                              ? 'cyber_disc'
                              : baseAllyId === 'nyx'
                                ? 'nebula_packet'
                                : baseAllyId === 'warrior'
                                  ? 'blade_wave'
                                  : 'fireball'
      });
      if (!point.isDead) {
        point.heal(35, 'TAG GRACE');
        point.gainMana(12);
      }
      if (this.audio) this.audio.play('skill_cast', ally.x);
      return true;
    }

    // In 2v2 Chaos Brawl: Synchronized Twin-Soul Assault Surge between both active teammates!
    point.gainMana(20);
    ally.gainMana(20);
    ally.skillCooldown = 0;
    if (ally.state === 'IDLE' || ally.state === 'WALK') {
      ally.setState('SKILL');
    }
    this.vfx.spawnSpecialCastAura(
      ally,
      'TWIN-SOUL ASSIST!',
      `${point.name} × ${ally.name}`,
      ally.theme || 'steel',
      false
    );
    this.vfx.spawnBeam(point.x, point.y - 96, ally.x, ally.y - 96, ally.primaryColor, 18, 0.34);
    this.vfx.spawnShockwave((point.x + ally.x) * 0.5, this.renderer.groundY - 70, 165, '#fbbf24', 0.35, true);
    if (this.audio) this.audio.play('skill_cast', ally.x);
    return true;
  }

  triggerUltimateCinematic(caster) {
    this.ultSlowTimer = 0.55;
    this.renderer.triggerUltimateCamera(caster.x, caster.y - 60);
    if (typeof this.renderer.triggerUltimateCutIn === 'function') {
      this.renderer.triggerUltimateCutIn(caster, false);
    }

    this.vfx.spawnSpecialCastAura(
      caster,
      caster.ultName,
      'OVERDRIVE ART',
      caster.theme || 'steel',
      true
    );
  }

  triggerTrueUltimateCinematic(caster) {
    this.ultSlowTimer = 0.42;
    this.renderer.triggerUltimateCamera(caster.x, caster.y - 68);
    if (typeof this.renderer.triggerUltimateCutIn === 'function') {
      this.renderer.triggerUltimateCutIn(caster, true);
    }

    this.vfx.spawnSpecialCastAura(
      caster,
      caster.trueUltName || 'CELESTIAL SWORD OF JUSTICE',
      'SUPREME ULTIMATE FINISHER',
      caster.theme || 'steel',
      true
    );
  }

  triggerStagePhenomenon() {
    this.stageEventTriggered = true;
    this.stageEventTimer = 10.0;
    this.stageEventTickTimer = 0;
    const stageId =
      this.renderer?.getActiveStageId?.() ||
      this.renderer?.permanentStageOverride ||
      this.renderer?.stageId ||
      'cathedral';
    const ww = this.renderer?.worldWidth || 1200;

    if (stageId === 'inferno') {
      this.renderer.triggerStageEvent(
        'CATACLYSMIC CALDERA ERUPTION',
        'BLESSING: +55% OVERDRIVE CHARGE!',
        '#fb923c',
        10.0
      );
    } else if (stageId === 'sanctuary') {
      this.renderer.triggerStageEvent(
        'SERAPHIC CHOIR BENEDICTION',
        'BLESSING: +420 HP SANCTUARY REGEN!',
        '#60a5fa',
        10.0
      );
    } else if (stageId === 'cathedral') {
      this.renderer.triggerStageEvent(
        'SOLAR ECLIPSE PHENOMENON',
        'BLESSING: +55% OVERDRIVE CHARGE!',
        '#facc15',
        10.0
      );
    } else if (stageId === 'sylvan') {
      this.renderer.triggerStageEvent(
        'STARLIGHT MONSOON PHENOMENON',
        'BLESSING: +420 HP SANCTUARY REGEN!',
        '#34d399',
        10.0
      );
    } else if (stageId === 'boneyard') {
      this.renderer.triggerStageEvent(
        'BLOOD MOON FRENZY PHENOMENON',
        'BLESSING: +18% ABYSSAL ATTACK DAMAGE!',
        '#f43f5e',
        10.0
      );
    } else {
      this.renderer.triggerStageEvent(
        'MIDNIGHT OVERCLOCK PHENOMENON',
        'BLESSING: +35% SKILL & ATTACK HASTE!',
        '#2dd4bf',
        10.0
      );
    }
    if (this.audio) this.audio.play('skill_cast', ww * 0.5);
  }

  onFighterDeath(deadFighter) {
    if (this.isMatchOver) return;

    if (this.audio && deadFighter.deathSfx) {
      this.audio.play(deadFighter.deathSfx, deadFighter.x);
    }

    if (this.isAdventureMode() && this.adventure?.active) {
      if (deadFighter.isMonster) {
        this.adventure.onMonsterDeath(deadFighter);
      } else {
        this.adventure.onPlayerDeath(deadFighter);
      }
      return;
    }

    // In 2v2 Modes: Check if the fallen fighter's teammate is still alive!
    const survivingAlly = this.getTeammateOf(deadFighter);
    if (survivingAlly && !survivingAlly.isDead) {
      deadFighter.isPoint = false;
      survivingAlly.isPoint = true;
      if (survivingAlly.isBenched) {
        // Reserve partner immediately leaps off the Tag Pedestal into the arena!
        survivingAlly.isBenched = false;
        survivingAlly.x = Math.max(
          130,
          Math.min(this.renderer.worldWidth - 130, deadFighter.x + (survivingAlly.team === 1 ? -40 : 40))
        );
        survivingAlly.y = this.renderer.groundY;
      }
      // Trigger AVENGER OVERDRIVE SURGE on the surviving teammate!
      survivingAlly.heal(Math.round(survivingAlly.maxHp * 0.18), 'AVENGER GRACE');
      survivingAlly.gainMana(48);
      survivingAlly.skillCooldown = 0;
      this.vfx.spawnSpecialCastAura(
        survivingAlly,
        'AVENGER OVERDRIVE!',
        `${deadFighter.name} FALLEN • FINAL STAND!`,
        survivingAlly.theme || 'steel',
        true
      );
      this.vfx.spawnShockwave(
        survivingAlly.x,
        this.renderer.groundY - 60,
        210,
        survivingAlly.primaryColor,
        0.48,
        true
      );
      this.renderer.triggerShake(15, 0.35);

      // Update Top HUD so the surviving partner becomes the primary HUD bar
      const sideKey = survivingAlly.team === 1 ? 'left' : 'right';
      const allyCfg = CHAMPION_ROSTER[survivingAlly.heroId];
      const fallenCfg = CHAMPION_ROSTER[deadFighter.heroId];
      this.applySideHUDTheme(this.hudEls[sideKey], allyCfg, survivingAlly, fallenCfg);
      const leftPoint = this.getPointFighter(1);
      const rightPoint = this.getPointFighter(2);
      const lc = CHAMPION_ROSTER[leftPoint.heroId] || CHAMPION_ROSTER.titan;
      const rc = CHAMPION_ROSTER[rightPoint.heroId] || CHAMPION_ROSTER.archer;
      PixelForge.setHUDPortraits(lc.id, lc.color, rc.id, rc.color);
      this.updateHUD();
      return;
    }

    this.isMatchOver = true;
    // Crisp 0.48s impact slow-motion (0.32x) without stacking ultSlowTimer, so all 30 death frames play smoothly!
    this.koSlowTimer = 0.48;
    this.ultSlowTimer = 0;
    this.deadMatchFighter = deadFighter;
    this.victoryRevealPending = true;
    this.postDeathHoldTimer = 0;
    this.matchOverSafetyTimer = 0;
    this.victoryOverlay?.classList.remove('is-defeat-plaque');
    this.updateHUD();

    const winningTeam = deadFighter.team === 1 ? 2 : 1;
    const winningFighters = this.getTeamFighters(winningTeam);
    const winner =
      winningFighters.find((f) => !f.isDead) ||
      winningFighters[0] ||
      (winningTeam === 1 ? this.leftFighter : this.rightFighter);
    const winnerCfg = CHAMPION_ROSTER[winner.heroId] || CHAMPION_ROSTER.warrior;
    if (typeof this.renderer.triggerKOFinisher === 'function') {
      this.renderer.triggerKOFinisher(
        deadFighter.x,
        deadFighter.y - 95,
        winner.primaryColor,
        winner.name,
        winner.heroId
      );
    }

    // Track King-of-the-Hill Win Streak
    const leadWinnerHero = winningTeam === 1 ? this.slot1Hero : this.slot2Hero;
    if (this.reigningHero === leadWinnerHero) {
      this.winStreak++;
    } else {
      this.reigningHero = leadWinnerHero;
      this.winStreak = 1;
    }

    const eyebrowEl = document.getElementById('victory-eyebrow');
    if (this.is2v2Mode() && winningFighters.length >= 2) {
      const fA = winningFighters[0];
      const fB = winningFighters[1];
      const duoTitle = `${fA.name.toUpperCase()} & ${fB.name.toUpperCase()}`;
      if (eyebrowEl) {
        eyebrowEl.textContent = `2V2 ${this.gameMode === '2v2_tag' ? 'TAG RELAY' : 'CHAOS BRAWL'} CONCLUDED • STREAK: ${this.winStreak} WIN${this.winStreak > 1 ? 'S' : ''}`;
      }
      document.getElementById('victory-winner').textContent = `${duoTitle} TRIUMPH`;
    } else {
      if (eyebrowEl) {
        eyebrowEl.textContent = `DUEL CONCLUDED • ${winner.name.toUpperCase()} STREAK: ${this.winStreak} WIN${this.winStreak > 1 ? 'S' : ''}`;
      }
      document.getElementById('victory-winner').textContent = `${winner.name.toUpperCase()} TRIUMPHS`;
    }
    document.getElementById('victory-stats').textContent = winnerCfg.victoryLine;

    // Restore VS Telemetry Headers & Victory Buttons (in case previous match was Adventure Mode)
    const telLeftExtraLbl = document.getElementById('tel-left-extra-label');
    const telRightSkillsLbl = document.getElementById('tel-right-skills-label');
    const telRightExtraLbl = document.getElementById('tel-right-extra-label');
    if (telLeftExtraLbl) telLeftExtraLbl.textContent = 'HEAL / CLASH';
    if (telRightSkillsLbl) telRightSkillsLbl.textContent = 'SKILLS / ULTS';
    if (telRightExtraLbl) telRightExtraLbl.textContent = 'HEAL / CLASH';
    if (this.btnNextChallenger) this.btnNextChallenger.classList.remove('hidden');
    if (this.btnPlayAgain) this.btnPlayAgain.textContent = 'REMATCH';
    if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'ROSTER SELECT';
    if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';

    // Populate Post-Match Combat Telemetry Card (aggregates team stats in 2v2!)
    const fillTel = (side, teamNum) => {
      const members = this.getTeamFighters(teamNum);
      const agg = {
        damageDealt: 0,
        skillsUsed: 0,
        ultsUsed: 0,
        biggestHit: 0,
        healingDone: 0,
        clashes: 0
      };
      members.forEach((m) => {
        if (!m || !m.stats) return;
        agg.damageDealt += m.stats.damageDealt || 0;
        agg.skillsUsed += m.stats.skillsUsed || 0;
        agg.ultsUsed += m.stats.ultsUsed || 0;
        agg.biggestHit = Math.max(agg.biggestHit, m.stats.biggestHit || 0);
        agg.healingDone += m.stats.healingDone || 0;
        agg.clashes += m.stats.clashes || 0;
      });
      const nameEl = document.getElementById(`tel-${side}-name`);
      const dmgEl = document.getElementById(`tel-${side}-dmg`);
      const skEl = document.getElementById(`tel-${side}-skills`);
      const maxEl = document.getElementById(`tel-${side}-max`);
      const exEl = document.getElementById(`tel-${side}-extra`);
      if (nameEl) {
        nameEl.textContent =
          members.length >= 2
            ? `${members[members.length - 1].name} + ${members[0].name}`
            : members[0]?.name || 'CHAMPION';
      }
      if (dmgEl) dmgEl.textContent = `${agg.damageDealt}`;
      if (skEl) skEl.textContent = `${agg.skillsUsed} / ${agg.ultsUsed}`;
      if (maxEl) maxEl.textContent = `${agg.biggestHit}`;
      if (exEl) exEl.textContent = `${agg.healingDone} / ${agg.clashes}`;
    };
    fillTel('left', 1);
    fillTel('right', 2);

    const autoLabel = document.getElementById('victory-auto-next');
    if (autoLabel) {
      autoLabel.classList.remove('hidden');
      autoLabel.textContent = this.autoTourney
        ? 'AUTO-TOURNEY: NEXT CHALLENGER IN 4S...'
        : 'AUTO-TOURNEY PAUSED • SELECT NEXT ACTION';
    }

    clearTimeout(this.victoryTimeout);
    clearTimeout(this.autoNextTimeout);
  }

  revealVictoryOverlay() {
    if (!this.isMatchOver || !this.victoryRevealPending) return;
    this.setPaused(false, false);
    this.victoryRevealPending = false;
    this.matchOverSafetyTimer = 0;
    this.victoryOverlay.classList.remove('hidden');
    if (this.audio) this.audio.play('victory_fanfare');
    if (this.autoTourney && !this.isAdventureMode() && !this.isSimPaused) {
      this._scheduleAutoNext(4200);
    }
  }

  triggerClashSpark(cx, cy, col1, col2, label = 'CLASH!') {
    if (this.audio) this.audio.play('clang', cx);
    this.renderer.triggerHitStop(0.065);
    const f1 = this.getPointFighter(1);
    const f2 = this.getPointFighter(2);
    const c1 = col1 || f1?.primaryColor || '#38bdf8';
    const c2 = col2 || f2?.primaryColor || '#fb923c';
    if (typeof this.renderer.triggerClashCamera === 'function') {
      this.renderer.triggerClashCamera(
        cx,
        cy,
        f1?.heroId || 'warrior',
        f2?.heroId || 'mage',
        c1,
        c2
      );
    }
    this.vfx.spawnDamageText(cx, cy - 68, 0, false, label, '#fef08a');
    this.vfx.spawnBurst(cx, cy, 24, '#fef08a', 320, { upBias: 115, size: 7 });
    this.vfx.spawnBurst(cx - 12, cy, 18, c1, 285, { upBias: 95, size: 6 });
    this.vfx.spawnBurst(cx + 12, cy, 18, c2, 285, { upBias: 95, size: 6 });
    if (f1 && !f1.isDead) {
      f1.gainMana(10);
      if (f1.stats) f1.stats.clashes++;
    }
    if (f2 && !f2.isDead) {
      f2.gainMana(10);
      if (f2.stats) f2.stats.clashes++;
    }
  }

  updateProjectiles(dt) {
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;

    // 1. Mid-Air Projectile vs. Projectile Clash Detection (ignore friendly projectiles!)
    for (let i = this.vfx.projectiles.length - 1; i >= 0; i--) {
      const p = this.vfx.projectiles[i];
      if (!p) continue;
      for (let j = i - 1; j >= 0; j--) {
        const q = this.vfx.projectiles[j];
        if (!q || p.owner === q.owner || (p.owner && q.owner && p.owner.team === q.owner.team)) continue;
        const dist = Math.hypot(p.x - q.x, p.y - q.y);
        if (dist < (p.radius || 18) + (q.radius || 18) + 28) {
          const cx = (p.x + q.x) * 0.5;
          const cy = (p.y + q.y) * 0.5;
          this.triggerClashSpark(cx, cy, p.color, q.color, 'ARCANE CLASH!');
          if (!p.isMeteor && !q.isMeteor) {
            this.vfx.projectiles.splice(i, 1);
            this.vfx.projectiles.splice(j, 1);
            break;
          } else if (p.isMeteor && !q.isMeteor) {
            this.vfx.projectiles.splice(j, 1);
            i--;
          } else if (!p.isMeteor && q.isMeteor) {
            this.vfx.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    for (let i = this.vfx.projectiles.length - 1; i >= 0; i--) {
      const p = this.vfx.projectiles[i];
      if (p.owner && p.owner.chronoTimeStopTimer > 0) continue;
      p.age = (p.age || 0) + dt;
      p.ringTimer = (p.ringTimer || 0) + dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.travelDist =
        Number.isFinite(p.startX) && Number.isFinite(p.startY)
          ? Math.hypot(p.x - p.startX, p.y - p.startY)
          : (p.travelDist || 0) + Math.hypot(p.vx || 0, p.vy || 0) * dt;
      if (p.maxRange > 0 && p.travelDist >= p.maxRange) {
        this.vfx.projectiles.splice(i, 1);
        continue;
      }

      const hasSylvanShaderFX = p.type === 'arrow' && Boolean(p.owner?.fx);
      const hasCustomShaderFX = typeof p.owner?.onProjectileTrail === 'function' && Boolean(p.owner?.fx);

      if (
        !hasSylvanShaderFX &&
        !hasCustomShaderFX &&
        (p.type === 'arrow' || p.type === 'blade_wave' || p.type === 'forge_wave' || p.type === 'holy_light') &&
        p.ringTimer >= 0.085
      ) {
        p.ringTimer = 0;
        this.vfx.spawnShockwave(
          p.x,
          p.y,
          p.type === 'forge_wave' ? 52 : p.type === 'blade_wave' ? 46 : p.type === 'holy_light' ? 38 : 34,
          p.type === 'forge_wave'
            ? '#f59e0b'
            : p.type === 'blade_wave'
              ? '#38bdf8'
              : p.type === 'holy_light'
                ? '#fde047'
                : '#34d399',
          0.22,
          false,
          true
        );
      }

      if (hasCustomShaderFX) {
        p.owner.onProjectileTrail(p, this);
      } else if (hasSylvanShaderFX) {
        if (p.ringTimer >= 0.045) {
          p.ringTimer = 0;
          p.owner.fx.burst?.(p.x - Math.sign(p.vx || 1) * 18, p.y, {
            count: 3,
            speedMin: 24,
            speedMax: 72,
            lifeMin: 0.16,
            lifeMax: 0.28,
            gravity: -16,
            spread: 1.1,
            angle: Math.atan2(-(p.vy || 0), -(p.vx || 1)),
            colors: ['#ffffff', '#a7f3d0', '#34d399', '#fef08a']
          });
        }
      } else {
        for (let k = 0; k < 2; k++) {
          this.vfx.spawnParticle({
            x: p.x + (Math.random() - 0.5) * p.radius * 1.25,
            y: p.y + (Math.random() - 0.5) * p.radius * 1.25,
            vx: -p.vx * 0.16 + (Math.random() - 0.5) * 55,
            vy: -p.vy * 0.16 - 28 + (Math.random() - 0.5) * 30,
            size: p.isMeteor ? 16 : 7,
            color: k === 0 ? p.color : p.coreColor || '#fef08a',
            maxLife: p.isMeteor ? 0.52 : 0.34
          });
        }
      }

      const isAdv = this.isAdventureMode();
      const enemies = p.owner ? this.getEnemiesOf(p.owner) : [this.rightFighter];
      let hitTarget = null;
      for (const cand of enemies) {
        if (!cand || cand.isDead || cand.isBenched) continue;
        if (p.ignoreTargets && p.ignoreTargets.has(cand)) continue;
        if ((isAdv || p.type === 'ronin_slash') && p.pierce && p._hitTargets && p._hitTargets.has(cand)) continue;
        if (
          isAdv &&
          !cand.isColossalBoss &&
          (p.type === 'forge_wave' || p.type === 'blade_wave' || p.type === 'ronin_slash') &&
          Math.abs(p.vy || 0) < 25 &&
          Math.abs((cand.groundY || cand.y) - (p.groundY || p.owner?.groundY || cand.groundY)) >
            (p.type === 'ronin_slash' ? 64 : 58)
        ) {
          continue;
        }
        const hitRadX = p.radius + (cand.isColossalBoss ? 115 : 36);
        const hitRadY = p.radius + (cand.isColossalBoss ? 225 : 68);
        const centerOffsetY = cand.isColossalBoss ? 148 : 108;
        if (
          Math.abs(p.x - cand.x) < hitRadX &&
          Math.abs(p.y - (cand.y - centerOffsetY)) < hitRadY
        ) {
          hitTarget = cand;
          break;
        }
      }
      const floorLim = isAdv ? (p.isMeteor ? (p.owner?.groundY || 561) - 4 : 692) : gy - 4;
      const hitGround = isAdv ? (p.vy || 0) > 0 && p.y >= floorLim : p.y >= floorLim;

      if (hitTarget || hitGround) {
        if (p.isMeteor) {
          const impGy = isAdv ? Math.min(680, Math.max(442, p.y)) : gy;
          if (this.audio) this.audio.play('meteor_impact', p.x);
          this.renderer.triggerShake(22, 0.52);
          this.renderer.triggerAberration(14);
          if (typeof p.owner?.onProjectileHit === 'function') {
            p.owner.onProjectileHit(p, hitTarget, true, this);
          }
          this.vfx.spawnShockwave(p.x, impGy, 290, '#fb923c', 0.6, true);
          this.vfx.spawnShockwave(p.x, impGy - 35, 220, '#fef08a', 0.46, false);
          this.vfx.spawnDecal(p.x, 165, 'fissure', '#fb923c', 6.0, impGy);
          this.vfx.spawnBurst(p.x, impGy - 15, 30, '#fb923c', 380, { upBias: 165, size: 9 });
          this.vfx.spawnBurst(p.x, impGy - 15, 20, '#fef08a', 310, { upBias: 130, size: 8 });
          this.vfx.spawnGlyphBurst(p.x, impGy - 50, 8, 'arcane');

          for (const cand of enemies) {
            const meteorRad = cand?.isColossalBoss ? 320 : 230;
            if (cand && !cand.isDead && !cand.isBenched && Math.abs(cand.x - p.x) < meteorRad) {
              cand.takeDamage(p.damage, p.owner, true, 160, -240);
              this.renderer.triggerHitStop(0.075);
            }
          }
        } else if (hitTarget) {
          const isCrit = Math.random() < 0.28;
          hitTarget.takeDamage(isCrit ? p.damage * 1.38 : p.damage, p.owner, isCrit, 100, 0);
          if (this.audio) {
            const impactSfx =
              p.type === 'arrow'
                ? 'arrow_hit'
                : p.type === 'phantom_scythe'
                  ? 'scythe_reap'
                  : p.type === 'clock_gear'
                    ? 'chrono_hit'
                    : p.type === 'cryo_shard'
                      ? 'ice_shatter'
                      : p.type === 'forge_wave'
                        ? 'thunder_slam'
                        : p.type === 'blade_wave'
                          ? isCrit
                            ? 'hit_crit'
                            : 'heavy_cleave'
                          : p.type === 'ronin_slash' || p.type === 'storm_wave'
                            ? isCrit
                              ? 'hit_crit'
                              : 'raijin_slash'
                            : p.type === 'holy_light'
                              ? 'holy_hit'
                              : 'fire_hit';
            this.audio.play(impactSfx, hitTarget.x);
          }
          this.renderer.triggerHitStop(0.055);
          // Preserve gameplay side-effects (leech / brittle frost) before visual impact handler
          if (p.type === 'phantom_scythe' && p.owner && typeof p.owner.leechLife === 'function') {
            p.owner.leechLife(18, hitTarget, this, 'SOUL LEECH');
          } else if (p.type === 'cryo_shard' && p.owner && typeof p.owner.applyBrittleFrost === 'function') {
            p.owner.applyBrittleFrost(hitTarget, 1, this, p.x, p.y);
          }

          if (typeof p.owner?.onProjectileHit === 'function' && p.owner.onProjectileHit(p, hitTarget, isCrit, this)) {
            // Handled by first-party ArcaneShaderFX impact shader & burst
          } else if (hasSylvanShaderFX) {
            p.owner.fx.spawn('sylvanArrowImpactBurst', p.x, p.y, {
              flip: false,
              light: isCrit ? 1.32 : 1.15,
              extra: {
                aimAngle: Math.atan2(p.vy || 0, p.vx || 1),
                isCrit
              }
            });
            p.owner.fx.burst?.(p.x, p.y, {
              count: isCrit ? 18 : 12,
              speedMin: 60,
              speedMax: isCrit ? 225 : 175,
              lifeMin: 0.2,
              lifeMax: 0.42,
              gravity: 95,
              colors: isCrit
                ? ['#ffffff', '#fef08a', '#6ee7b7', '#34d399']
                : ['#ffffff', '#a7f3d0', '#34d399', '#10b981']
            });
            this.vfx.spawnGlyphBurst(p.x, p.y, 4, 'emerald');
          } else {
            this.vfx.spawnShockwave(p.x, p.y, 76, p.color, 0.26);
            this.vfx.spawnBurst(p.x, p.y, 14, p.color, 220);
            if (p.type === 'arrow') {
              this.vfx.spawnSlash(p.x, p.y, 58, -0.9, 0.9, '#34d399', 0.22);
              this.vfx.spawnGlyphBurst(p.x, p.y, 5, 'emerald');
            } else if (p.type === 'phantom_scythe') {
              this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'abyssal');
            } else if (p.type === 'clock_gear') {
              this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'chrono');
            } else if (p.type === 'cryo_shard') {
              this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'glacial');
            } else if (p.type === 'cyber_disc') {
              this.vfx.spawnSlash(p.x, p.y, 70, -1.1, 1.1, '#00f0ff', 0.24);
              this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'cyber');
            } else if (p.type === 'nebula_packet') {
              this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'nebula');
            } else if (p.type === 'forge_wave') {
              this.vfx.spawnSlash(p.x, p.y, 78, -1.1, 1.1, '#f59e0b', 0.26);
              this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'forge');
            } else if (p.type === 'blade_wave') {
              this.vfx.spawnSlash(p.x, p.y, 72, -1.2, 1.2, '#38bdf8', 0.25);
              this.vfx.spawnGlyphBurst(p.x, p.y, 6, 'steel');
            } else if (p.type === 'holy_light') {
              this.vfx.spawnShockwave(p.x, p.y, 64, '#ffffff', 0.22);
              this.vfx.spawnGlyphBurst(p.x, p.y, 5, 'radiant');
            } else {
              this.vfx.spawnGlyphBurst(p.x, p.y, 4, 'arcane');
            }
          }
        } else {
          if (this.audio) {
            this.audio.play(
              p.type === 'arrow'
                ? 'arrow_hit'
                : p.type === 'holy_light'
                  ? 'holy_hit'
                  : p.type === 'phantom_scythe'
                    ? 'scythe_reap'
                    : p.type === 'clock_gear'
                      ? 'chrono_hit'
                      : p.type === 'cryo_shard'
                        ? 'ice_shatter'
                        : p.type === 'cyber_disc'
                          ? 'cyber_slash'
                          : p.type === 'nebula_packet'
                            ? 'clock_gear'
                            : p.type === 'forge_wave'
                            ? 'thunder_slam'
                            : p.type === 'blade_wave'
                              ? 'clang'
                              : 'fire_hit',
              p.x
            );
          }
          if (hasSylvanShaderFX) {
            p.owner.fx.spawn('sylvanArrowImpactBurst', p.x, gy - 6, {
              flip: false,
              light: 1.05,
              extra: { aimAngle: Math.atan2(p.vy || 0, p.vx || 1), isCrit: false }
            });
          } else {
            this.vfx.spawnDecal(p.x, 42, 'scorch', p.color, 3.5);
            this.vfx.spawnBurst(p.x, gy, 8, p.color, 150, { upBias: 70 });
          }
        }
        if ((isAdv || p.type === 'ronin_slash') && p.pierce && hitTarget && !hitGround && !p.isMeteor) {
          if (!p._hitTargets) p._hitTargets = new Set();
          p._hitTargets.add(hitTarget);
          if (p._hitTargets.size >= 5) {
            this.vfx.projectiles.splice(i, 1);
          }
        } else {
          this.vfx.projectiles.splice(i, 1);
        }
      } else if ((isAdv && !p.isMeteor && p.age > 1.45) || p.x < -300 || p.x > ww + 300) {
        this.vfx.projectiles.splice(i, 1);
      }
    }
  }

  updateAdventureBossHUD() {
    const els =
      this.advBossEls ||
      (typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? {
            root: document.getElementById('adv-boss-raid-hud'),
            portrait: document.getElementById('adv-boss-raid-portrait'),
            name: document.getElementById('adv-boss-raid-name'),
            phase: document.getElementById('adv-boss-raid-phase'),
            bar: document.getElementById('adv-boss-raid-bar'),
            ghost: document.getElementById('adv-boss-raid-ghost'),
            hp: document.getElementById('adv-boss-raid-hp')
          }
        : null);
    if (!els || !els.root) return;

    const adv = this.adventure;
    const boss = adv?.bossEntity || null;
    const warningActive = Boolean(adv && (adv.bossWarningTimer || 0) > 0);
    const bossAlive = Boolean(boss && !boss.isDead);
    const showBossHud = Boolean(
      adv?.active && !this.isLandingOpen && !this.isMatchOver && (warningActive || bossAlive)
    );

    els.root.classList?.toggle('hidden', !showBossHud);
    if (!showBossHud) {
      return;
    }

    const isWarningOnly = warningActive && !bossAlive;
    const maxHp = Math.max(1, Math.round(boss?.maxHp || 11800));
    const curHp = isWarningOnly ? maxHp : Math.max(0, Math.ceil(boss?.hp ?? maxHp));
    const hpRatio = isWarningOnly ? 1 : Math.max(0, Math.min(1, (boss?.hp ?? maxHp) / maxHp));
    const hpPctStr = `${(hpRatio * 100).toFixed(2)}%`;

    if (els.name) {
      const nextName = boss?.name || 'BEHEMOTH MALPHAS';
      if (els.name.textContent !== nextName) els.name.textContent = nextName;
    }

    const phaseNum = Math.max(1, Math.min(3, Number(boss?.bossPhase) || 1));
    const roman = phaseNum === 3 ? 'III' : phaseNum === 2 ? 'II' : 'I';
    const isCoreExposed = Boolean(!isWarningOnly && (boss?.vulnerableTimer || 0) > 0);
    let nextPhaseText = 'INCOMING SIEGE';
    if (!isWarningOnly) {
      let statusText = 'ABYSSAL SOVEREIGN';
      if (isCoreExposed) {
        statusText = 'CORE EXPOSED!';
      } else if ((boss?.telegraphTimer || 0) > 0 && boss?.telegraphLabel) {
        statusText = String(boss.telegraphLabel)
          .replace(/^!\s*|\s*!$/g, '')
          .replace(/^PHASE\s+[I]+:\s*/i, '')
          .trim();
      } else if ((boss?.emergeTimer || 0) > 0) {
        statusText = 'BLACK PIT RISING';
      }
      nextPhaseText = `PHASE ${roman} • ${statusText || 'ABYSSAL SOVEREIGN'}`;
    }
    if (els.phase && els.phase.textContent !== nextPhaseText) {
      els.phase.textContent = nextPhaseText;
    }

    if (els.bar?.style) els.bar.style.width = hpPctStr;
    if (els.ghost?.style) els.ghost.style.width = hpPctStr;

    const nextHpText = `${curHp.toLocaleString('en-US')} / ${maxHp.toLocaleString('en-US')}`;
    if (els.hp && els.hp.textContent !== nextHpText) {
      els.hp.textContent = nextHpText;
    }

    els.root.classList?.toggle('is-boss-warning', isWarningOnly);
    els.root.classList?.toggle('is-core-exposed', isCoreExposed);
    els.root.classList?.toggle('is-phase-2', !isWarningOnly && phaseNum === 2);
    els.root.classList?.toggle('is-phase-3', !isWarningOnly && phaseNum >= 3);

    // Keep Mobile Portrait Boss Plaque cleanly below Zone/Spirit/XP strip with 0 HUD overlap
    if (els.root.style?.setProperty) {
      const stripRect = adv?._hudStripRect;
      const portraitTop =
        stripRect && Number.isFinite(stripRect.y) && Number.isFinite(stripRect.h)
          ? Math.round(stripRect.y + stripRect.h + 6)
          : typeof this.renderer?.getHudBottomY === 'function'
            ? Math.round(this.renderer.getHudBottomY() + 42)
            : null;
      if (portraitTop && portraitTop > 40) {
        els.root.style.setProperty('--adv-boss-portrait-top', `${portraitTop}px`);
      }
    }

    const canvas = els.portrait;
    if (canvas && typeof canvas.getContext === 'function') {
      const assets = PixelForge.initAssets?.();
      const portImg = PixelForge.ensureImage?.(assets?.archfiend?.portrait) || assets?.archfiend?.portrait;
      if (portImg && portImg.complete && portImg.naturalWidth > 0) {
        const drawKey = `${portImg.src || 'mem'}:${portImg.naturalWidth}:${canvas.width || 44}`;
        if (canvas._lastBossPortraitKey !== drawKey) {
          const pctx = canvas.getContext('2d');
          if (pctx) {
            pctx.imageSmoothingEnabled = false;
            pctx.clearRect(0, 0, canvas.width || 44, canvas.height || 44);
            pctx.drawImage(portImg, 0, 0, canvas.width || 44, canvas.height || 44);
            canvas._lastBossPortraitKey = drawKey;
          }
        }
      } else if (portImg && typeof portImg.addEventListener === 'function' && !canvas._listeningPortraitLoad) {
        canvas._listeningPortraitLoad = true;
        portImg.addEventListener(
          'load',
          () => {
            canvas._listeningPortraitLoad = false;
            canvas._lastBossPortraitKey = null;
            const pctx = canvas.getContext('2d');
            if (pctx && portImg.naturalWidth > 0) {
              pctx.imageSmoothingEnabled = false;
              pctx.clearRect(0, 0, canvas.width || 44, canvas.height || 44);
              pctx.drawImage(portImg, 0, 0, canvas.width || 44, canvas.height || 44);
              canvas._lastBossPortraitKey = `${portImg.src || 'mem'}:${portImg.naturalWidth}:${canvas.width || 44}`;
            }
          },
          { once: true }
        );
      }
    }
  }

  updateHUD() {
    const isAdv = this.isAdventureMode();
    this.appEl?.classList?.toggle('is-adventure-active', Boolean(isAdv && !this.isLandingOpen));
    const advProg = isAdv ? this.adventure?.progression : null;
    const advStats = advProg ? advProg.getComputedStats() : null;
    if (!isAdv) {
      this.pauseSpBadge?.classList.add('hidden');
      if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
        document.getElementById('hud-right')?.classList?.remove?.('hidden');
      }
    }

    const sync = (els, f, partner) => {
      if (!els || !f) return;
      const advTags = isAdv ? ADVENTURE_HERO_KITS[f.heroId]?.tags : null;
      const hpPct = Math.max(0, (f.hp / f.maxHp) * 100);
      const manaPct = Math.min(100, (f.mana / f.maxMana) * 100);
      els.hpBar.style.width = `${hpPct}%`;
      els.hpDmg.style.width = `${hpPct}%`;
      els.hpText.textContent =
        this.testModeUnlimitedHp && !isAdv && !f.isMonster
          ? `MAX ${Math.ceil(f.hp)}`
          : `${Math.ceil(f.hp)}`;
      els.state.textContent = f.isDead ? 'DEFEATED' : f.state;

      const isMobilePortrait = Boolean(this.renderer?.isMobilePortrait);
      els.manaBar.style.width = `${manaPct}%`;
      els.ultLabel.textContent = f.isBoss
        ? `PHASE ${f.bossPhase || 1} / 3${(f.vulnerableTimer || 0) > 0 ? ' • CORE EXPOSED!' : ''}`
        : f.isMonster
          ? f.isElite
            ? 'ELITE MONSTER'
            : 'ABYSSAL HORDE'
          : isMobilePortrait
            ? isAdv
              ? `${advTags?.overdrive || 'DRIVE'} ${Math.floor(manaPct)}%`
              : `DRIVE ${Math.floor(manaPct)}%`
            : isAdv
              ? `${advTags?.overdrive || 'DRIVE'} ${Math.floor(manaPct)}% (EMBERS)`
              : `OVERDRIVE ${Math.floor(manaPct)}%`;

      if (els.finisherFrame && els.finisherBar && els.finisherLabel) {
        if (f.hasTrueUltimate) {
          els.finisherFrame.classList.remove('hidden');
          const finPct =
            f.state === 'TRUE_ULTIMATE'
              ? 100
              : Math.min(100, Math.max(0, (f.finisherGauge / Math.max(1, f.maxFinisherGauge)) * 100));
          els.finisherBar.style.width = `${finPct}%`;
          els.finisherFrame.classList.toggle('finisher-ready', finPct >= 99 || f.state === 'TRUE_ULTIMATE');
          const seals = Math.min(3, Math.floor((finPct + 0.5) / 33.33));
          els.finisherLabel.textContent =
            f.state === 'TRUE_ULTIMATE'
              ? `ULTIMATE: ${f.trueUltName || 'SWORD OF JUSTICE'}!`
              : isMobilePortrait
                ? isAdv
                  ? `${advTags?.ultimate || 'ULT'} ${Math.floor(finPct)}% (${seals}/3)`
                  : `ULT ${Math.floor(finPct)}% (${seals}/3)`
                : isAdv
                  ? `${advTags?.ultimate || 'CATACLYSM'} ${Math.floor(finPct)}% (${seals}/3 SEALS)`
                  : `ULTIMATE ${Math.floor(finPct)}% (${seals}/3 OD)`;
        } else {
          els.finisherFrame.classList.add('hidden');
        }
      }

      const cdPct = Math.max(0, (f.skillCooldown / f.skillMaxCooldown) * 100);
      els.skillCd.style.width = `${cdPct}%`;
      els.skillText.textContent = f.isMonster
        ? f.isBoss
          ? `PHASE ${f.bossPhase || 1} • ${f.skillName}`
          : this.adventure?.totalWaveLabel || f.skillName
        : f.skillCooldown > 0.05
          ? `${f.skillName} ${f.skillCooldown.toFixed(1)}s`
          : isAdv && advProg && advStats && advProg.spirit + 0.01 < advStats.skillSpiritCost
            ? `${f.skillName} (${Math.floor(advProg.spirit)}/${advStats.skillSpiritCost} SP)`
            : `${f.skillName} READY`;

      if (this.is2v2Mode() && partner && els.partnerWing) {
        const pHpPct = Math.max(0, (partner.hp / partner.maxHp) * 100);
        const pManaPct = Math.min(100, (partner.mana / partner.maxMana) * 100);
        if (els.partnerHpBar) els.partnerHpBar.style.width = `${pHpPct}%`;
        if (els.partnerManaBar) els.partnerManaBar.style.width = `${pManaPct}%`;
        if (els.partnerHpText) {
          els.partnerHpText.textContent = this.testModeUnlimitedHp
            ? `MAX ${Math.ceil(partner.hp)}`
            : `${Math.ceil(partner.hp)}`;
        }
        if (els.partnerStatus) {
          els.partnerStatus.textContent = partner.isDead
            ? 'FALLEN'
            : partner.isBenched
              ? 'STANDBY'
              : 'ALLY ACTIVE';
        }
      }
    };

    const leftPoint = this.getPointFighter(1);
    const leftPartner = this.getReserveFighter(1);
    const rightPoint = this.getPointFighter(2);
    const rightPartner = this.getReserveFighter(2);

    sync(this.hudEls.left, leftPoint, leftPartner);
    if (!isAdv) {
      sync(this.hudEls.right, rightPoint, rightPartner);
    }
    this.updateAdventureBossHUD();

    const mins = String(Math.floor(this.matchTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.matchTime % 60)).padStart(2, '0');
    this.timerEl.textContent = `${mins}:${secs}`;
  }

  stepSimulation(rawDt) {
    this.renderer.update(rawDt, this.fighters);

    if (this.renderer.hitStopTimer > 0) return;

    let timeScale = 1.0;
    if (this.koSlowTimer > 0) {
      this.koSlowTimer = Math.max(0, this.koSlowTimer - rawDt);
      timeScale = 0.32;
    } else if (this.ultSlowTimer > 0) {
      this.ultSlowTimer = Math.max(0, this.ultSlowTimer - rawDt);
      timeScale = 0.25;
    } else if (this.userSlowMo) {
      timeScale = 0.35;
    }

    const dt = rawDt * timeScale;
    if (!this.isMatchOver) {
      this.matchTime += dt;
    }
    if (this.clashCooldown > 0) {
      this.clashCooldown = Math.max(0, this.clashCooldown - dt);
    }
    if (this.team1TagCd > 0) this.team1TagCd = Math.max(0, this.team1TagCd - dt);
    if (this.team2TagCd > 0) this.team2TagCd = Math.max(0, this.team2TagCd - dt);
    if (this.team1AssistCd > 0) this.team1AssistCd = Math.max(0, this.team1AssistCd - dt);
    if (this.team2AssistCd > 0) this.team2AssistCd = Math.max(0, this.team2AssistCd - dt);

    const activeFighters =
      this._activeFightersScratch || (this._activeFightersScratch = []);
    activeFighters.length = 0;
    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      if (f && !f.isDead && !f.isBenched) activeFighters.push(f);
    }

    // Trigger Autonomous Mid-Match Stage Phenomenon at 11.5s or when any active fighter drops below 58% HP (Arena Duel/2v2 modes)
    if (
      !this.isAdventureMode() &&
      !this.isMatchOver &&
      !this.stageEventTriggered &&
      activeFighters.length >= 2 &&
      (this.matchTime >= 11.5 || activeFighters.some((f) => f.hp / f.maxHp <= 0.58))
    ) {
      this.triggerStagePhenomenon();
    }

    if (this.stageEventTimer > 0) {
      this.stageEventTimer = Math.max(0, this.stageEventTimer - dt);
      this.stageEventTickTimer += dt;
      if (this.stageEventTickTimer >= 2.0) {
        this.stageEventTickTimer = 0;
        const activeStg =
          this.renderer?.getActiveStageId?.() ||
          this.renderer?.permanentStageOverride ||
          this.renderer?.stageId;
        if ((activeStg === 'sylvan' || activeStg === 'sanctuary') && !this.isMatchOver) {
          activeFighters.forEach((f) => f.heal(84, 'STARLIGHT'));
        } else if ((activeStg === 'boneyard' || activeStg === 'inferno') && !this.isMatchOver) {
          const midX =
            activeFighters.reduce((acc, f) => acc + f.x, 0) / Math.max(1, activeFighters.length);
          this.vfx.spawnBurst(
            midX,
            this.renderer.groundY - 40,
            20,
            activeStg === 'inferno' ? '#fb923c' : '#e11d48',
            260,
            {
              upBias: 160,
              size: 6
            }
          );
        }
      }
    }

    // Autonomous 2v2 Tag Relay Swaps & Twin-Soul Assists
    if (this.is2v2Mode() && !this.isMatchOver) {
      for (const team of [1, 2]) {
        const point = this.getPointFighter(team);
        const reserve = this.getReserveFighter(team);
        if (!point || !reserve || point.isDead || reserve.isDead) continue;

        if (this.gameMode === '2v2_tag' && reserve.isBenched) {
          const pointHpRatio = point.hp / point.maxHp;
          const reserveHpRatio = reserve.hp / reserve.maxHp;
          if (
            (pointHpRatio <= 0.40 && reserveHpRatio > pointHpRatio + 0.08) ||
            (reserveHpRatio - pointHpRatio >= 0.28 && this.matchTime > 5.0)
          ) {
            this.triggerTeamTagSwap(team, false);
          } else {
            this.triggerTeamAssist(team, false);
          }
        } else if (this.gameMode === '2v2_brawl') {
          this.triggerTeamAssist(team, false);
        }
      }
    }

    // Update Adventure Campaign (manual/auto-play hero + active monster horde) OR Arena Duel/2v2 fighters
    if (this.isAdventureMode() && this.adventure?.active) {
      this.adventure.update(dt);
    } else {
      for (const f of this.fighters) {
        if (!f) continue;
        const target = this.getTargetFor(f);
        if (f.chronoTimeStopTimer > 0 && !f.isDead && f.state !== 'TRUE_ULTIMATE') {
          Fighter.prototype.update.call(f, dt, target, this);
        } else {
          f.update(dt, target, this);
        }
      }
    }

    // Reveal the Victory / Rematch / Defeat plaque ONLY after all 30 death frames (F00..F29) have finished
    // AND the winning champion has showcased their Row 9 VICTORY flourish & pose (snappier 0.65s hold on Adventure defeat)!
    if (this.isMatchOver && this.victoryRevealPending && !this.isSimPaused) {
      this.matchOverSafetyTimer = (this.matchOverSafetyTimer || 0) + rawDt;
      const fallen = this.deadMatchFighter || this.fighters.find((f) => f && f.isDead);
      const fullDeathDur = fallen?.isColossalBoss ? 2.4 : PixelForge.DEATH_DURATION || 1.55;
      const targetFloorY =
        this.isAdventureMode() && Number.isFinite(fallen?.groundY)
          ? fallen.groundY
          : this.renderer.groundY;
      const onFloor = !fallen || fallen.isColossalBoss || fallen.y >= targetFloorY - 4;
      const holdNeeded = this.isAdventureMode() && fallen && !fallen.isMonster ? 0.65 : 1.35;
      if (!fallen || ((fallen.deathTimer || 0) >= fullDeathDur && onFloor)) {
        this.postDeathHoldTimer = (this.postDeathHoldTimer || 0) + rawDt;
        if (this.postDeathHoldTimer >= holdNeeded) {
          this.revealVictoryOverlay();
        }
      }
      if (this.victoryRevealPending && this.matchOverSafetyTimer >= 3.4) {
        this.revealVictoryOverlay();
      }
    } else if (!this.isMatchOver || !this.victoryRevealPending) {
      this.matchOverSafetyTimer = 0;
    }

    // Check Simultaneous Melee / Skill Blade Clash across opposing active fighters
    if (!this.isMatchOver && this.clashCooldown <= 0) {
      let clashed = false;
      for (let i = 0; i < this.fighters.length; i++) {
        if (clashed) break;
        const f1 = this.fighters[i];
        if (!f1 || f1.isDead || f1.isBenched || f1.team !== 1) continue;
        const f1Swinging =
          (f1.state === 'AUTO_ATTACK' || f1.state === 'SKILL') &&
          f1.stateTimer >= 0.14 &&
          f1.stateTimer <= 0.42;
        if (!f1Swinging) continue;
        for (let j = 0; j < this.fighters.length; j++) {
          const f2 = this.fighters[j];
          if (!f2 || f2.isDead || f2.isBenched || f2.team !== 2) continue;
          const f2Swinging =
            (f2.state === 'AUTO_ATTACK' || f2.state === 'SKILL') &&
            f2.stateTimer >= 0.14 &&
            f2.stateTimer <= 0.42;
          if (f2Swinging && Math.abs(f1.x - f2.x) <= 185) {
            this.clashCooldown = 2.6;
            const cx = (f1.x + f2.x) * 0.5;
            const cy = this.renderer.groundY - 102;
            f1.vx = -155;
            f2.vx = 155;
            this.triggerClashSpark(cx, cy, f1.primaryColor, f2.primaryColor, 'PARRY CLASH!');
            clashed = true;
            break;
          }
        }
      }
    }

    this.updateProjectiles(dt);
    this.vfx.update(dt, this.renderer.groundY, this.renderer, this.audio);

    this.hudTimer += rawDt;
    if (this.hudTimer >= 0.05) {
      this.hudTimer = 0;
      this.updateHUD();
    }
  }

  _renderAssetSummoningOverlay(ctx) {
    if (!ctx?.fillRect || !ctx?.fillText) return;
    const cw = ctx.canvas?.width || 1280;
    const ch = ctx.canvas?.height || 720;
    const boxW = 296;
    const boxH = 54;
    const bx = Math.round((cw - boxW) * 0.5);
    const by = Math.round(ch * 0.16);
    const step = ((Date.now() / 110) | 0) % 8;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, boxW - 2, boxH - 2);
    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 13px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUMMONING CHAMPIONS...', bx + Math.round(boxW * 0.5), by + 20);
    for (let i = 0; i < 8; i++) {
      const active = i === step || i === (step + 7) % 8;
      ctx.fillStyle = active ? '#fbbf24' : '#1e3a5f';
      ctx.fillRect(bx + 54 + i * 24, by + 35, 16, 8);
    }
    ctx.restore();
  }

  loop(now) {
    this._rafId = 0;
    if (this._appSuspended || (typeof document !== 'undefined' && document.hidden)) {
      return;
    }
    this.startLoop();

    // Rock-solid 60.0 FPS VSync-aligned frame pacer:
    // - On 120Hz ProMotion (8.33ms ticks), odd ticks (~8.33ms < 15.2ms) return with zero CPU/GPU work
    //   and even ticks (~16.67ms >= 15.2ms) advance cleanly at locked 60.0 FPS without drift.
    // - On native 60Hz displays (16.67ms ticks, even with +-1.4ms VSync jitter), every tick runs!
    const TARGET_FRAME_MS = 1000 / 60;
    const PACE_THRESHOLD_MS = 15.2;
    if (this._lastPacedTime > 0) {
      const elapsed = now - this._lastPacedTime;
      if (elapsed < PACE_THRESHOLD_MS) {
        return;
      }
      if (elapsed > 50) {
        this._lastPacedTime = now;
      } else if (elapsed >= TARGET_FRAME_MS) {
        this._lastPacedTime = now - (elapsed % TARGET_FRAME_MS);
      } else {
        this._lastPacedTime += TARGET_FRAME_MS;
      }
    } else {
      this._lastPacedTime = now;
    }

    const rawDt =
      this.lastTime > 0
        ? Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000))
        : 1 / 60;
    this.lastTime = now;

    if (this.isLandingOpen) {
      if (this.landingStep === 'roster') {
        this.renderChampionPreviews(now);
      }
      return;
    }

    if (
      !this.isPaused &&
      !this.isSimPaused &&
      !(this.isAdventureMode() && this.adventure?.isSkillTreeOpen)
    ) {
      if (this._matchAssetGateUntil > 0) {
        const ready =
          typeof HTMLImageElement === 'undefined' ||
          this.simMode ||
          PixelForge.areMatchAssetsReady?.(this._getActiveMatchAssetOpts()) ||
          Date.now() >= this._matchAssetGateUntil;
        if (ready) {
          this._matchAssetGateUntil = 0;
        } else {
          this._pausedFrameRendered = false;
          this.renderer.render(this.fighters, this.vfx);
          this._renderAssetSummoningOverlay(this.renderer?.ctx);
          return;
        }
      }
      this._pausedFrameRendered = false;
      this.stepSimulation(rawDt);
      this.renderer.render(this.fighters, this.vfx);
    } else if (!this._pausedFrameRendered) {
      this.renderer.render(this.fighters, this.vfx);
      this._pausedFrameRendered = true;
    }
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
}
