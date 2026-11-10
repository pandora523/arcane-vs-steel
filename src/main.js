import { Renderer } from './engine/Renderer.js?v=30fps42';
import { VFXManager } from './engine/VFXManager.js?v=30fps42';
import { PixelForge } from './engine/PixelForge.js?v=30fps41';
import { AudioManager } from './engine/AudioManager.js?v=30fps42';
import { Warrior } from './entities/Warrior.js?v=30fps41';
import { FireMage } from './entities/FireMage.js?v=30fps41';
import { Archer } from './entities/Archer.js?v=30fps46';
import { Priestess } from './entities/Priestess.js?v=30fps48';
import { Reaper } from './entities/Reaper.js?v=30fps41';
import { Chronomancer } from './entities/Chronomancer.js?v=30fps41';
import { Titan } from './entities/Titan.js?v=30fps41';
import { Ronin } from './entities/Ronin.js?v=30fps41';
import { Valkyrie } from './entities/Valkyrie.js?v=30fps47';
import { IceMage } from './entities/IceMage.js?v=30fps41';
import { Android } from './entities/Android.js?v=30fps46';

const CHAMPION_ROSTER = {
  warrior: {
    id: 'warrior',
    name: 'AETHELGARD',
    role: 'ELDER RUNE KNIGHT',
    style: 'RUNIC VANGUARD',
    trait: 'PASSIVE: AEGIS SPELL DEFLECT',
    cls: Warrior,
    theme: 'steel',
    color: '#38bdf8',
    selectSfx: 'slash',
    victoryLine: 'Elder runes blaze as Frost-Runeblade steel cleaves the tempest!',
    skills: [
      {
        name: 'FROST CRESCENT',
        type: 'AUTO + PASSIVE',
        vfxCell: 0,
        desc: 'Cleaves with runic frost waves & raises an Aegis barrier that deflects spells.'
      },
      {
        name: 'TEMPEST VANGUARD',
        type: 'SKILL • 5.4S CD',
        vfxCell: 1,
        desc: '360° spinning Runeblade cyclone rush that pulls foes in before a thunderous slam.'
      },
      {
        name: 'HEAVENLY EARTHSHATTER',
        type: '★ OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Rune-blinks left and right in an omnislash blitz, then teleports overhead to cleave straight down!'
      }
    ]
  },
  archer: {
    id: 'archer',
    name: 'SYLVARA',
    role: 'TEMPEST BOWMASTER',
    style: 'RANGED MARKSMAN',
    trait: 'PASSIVE: ZEPHYR VAULT EVASION',
    cls: Archer,
    theme: 'emerald',
    color: '#34d399',
    selectSfx: 'arrow_shoot',
    victoryLine: 'Supersonic astral arrows pierce through the tempest!',
    skills: [
      {
        name: 'ASTRAL LONGBOW',
        type: 'AUTO + ZEPHYR VAULT',
        vfxCell: 0,
        desc: 'Fires Mach-ring piercing arrows, cloaks in a 2.5D Leaf-Veil Dome & vaults over foes.'
      },
      {
        name: 'STARFALL VOLLEY',
        type: 'SKILL • 4.2S CD',
        vfxCell: 1,
        desc: 'Locks an elven astrolabe seal, trapping foes in a 2.5D Tempest Cyclone under 5 starfall arrows.'
      },
      {
        name: 'ASTRAL HURRICANE',
        type: '★ OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Unfurls 6-pinion Astral Light-Wings to fire a Wind-Dragon Hurricane Lance & 10-beam starfall.'
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
    victoryLine: 'Solar cataclysm reduces all opposition to molten ash!',
    skills: [
      {
        name: 'SOLAR FIREBALL',
        type: 'AUTO + PASSIVE',
        vfxCell: 2,
        desc: 'Launches explosive solar plasma orbs & teleports away from melee threats.'
      },
      {
        name: 'TRIPLE SOLAR PILLAR',
        type: 'SKILL • 4.8S CD',
        vfxCell: 1,
        desc: 'Erupts 3 sequential columns of molten hellfire beneath the enemy.'
      },
      {
        name: 'ECLIPSE SUPERNOVA',
        type: '★ OVERDRIVE ULT',
        vfxCell: 0,
        desc: 'Summons the Black-Sun Eclipse, raining meteors before a cataclysmic solar beam.'
      }
    ]
  },
  priestess: {
    id: 'priestess',
    name: 'SERAPHINA',
    role: 'HIGH PRIESTESS',
    style: 'SANCTUARY WEAVER',
    trait: 'PASSIVE: HIGH SERAPHIC WING FLIGHT',
    cls: Priestess,
    theme: 'radiant',
    color: '#fde047',
    selectSfx: 'holy_heal',
    victoryLine: 'Sacred light and divine grace purify the sanctuary!',
    skills: [
      {
        name: 'SACRED STARLIGHT',
        type: 'AUTO + BENEDICTION',
        vfxCell: 0,
        desc: 'Fires Mach-ring star-cross bolts, raises a 2.5D Stained-Glass Rose Ward & soars across the stage.'
      },
      {
        name: 'DIVINE SANCTUARY',
        type: 'SKILL • 5.5S CD',
        vfxCell: 1,
        desc: 'Consecrates a 2.5D Cathedral Seal, healing HP & smiting foes with Sanctum spires & Valkyrie spears.'
      },
      {
        name: 'SERAPHIC APOTHEOSIS',
        type: '★ OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Ascends in full Archangel form inside a 2.5D Ophanim Chakram Wheel to rain 3 Cathedral Sanctum spires.'
      }
    ]
  },
  reaper: {
    id: 'reaper',
    name: 'MALAKOR',
    role: 'ABYSSAL SOULREAPER',
    style: 'NECROTIC HOOK HARVESTER',
    trait: 'PASSIVE: GRAVE-SUBMERGE & SOUL HOOK',
    cls: Reaper,
    theme: 'abyssal',
    color: '#c084fc',
    selectSfx: 'scythe_reap',
    victoryLine: 'The Abyssal Scythe hooks every soul into the graveyard!',
    skills: [
      {
        name: 'SOUL HOOK & BOOMERANG',
        type: 'AUTO + GRAVE SUBMERGE',
        vfxCell: 0,
        desc: 'Hooks foes inward with scythe pulls, hurls returning boomerang scythes & submerges underground to erupt!'
      },
      {
        name: 'SPECTRAL CHAIN PRISON',
        type: 'SKILL • 4.8S CD',
        vfxCell: 1,
        desc: 'Drags ranged foes into melee with a bone-claw chain & cages them between two Haunted Tombstones.'
      },
      {
        name: 'GRIM HARVEST',
        type: '★ OVERDRIVE ULT',
        vfxCell: 3,
        desc: 'Summons the colossal Death-Avatar & gothic tombstones to execute a cross-reap blitz.'
      }
    ]
  },
  chronomancer: {
    id: 'chronomancer',
    name: 'ZEPHYROS',
    role: 'GRAND CHRONOMANCER',
    style: 'TEMPORAL TACTICIAN',
    trait: 'PASSIVE: CHRONO PORTAL WARP & REWIND',
    cls: Chronomancer,
    theme: 'chrono',
    color: '#2dd4bf',
    selectSfx: 'clock_gear',
    victoryLine: 'The Grand Astral Clocktower locks all timelines in stasis!',
    skills: [
      {
        name: 'ESCAPEMENT SAW-GEAR',
        type: 'AUTO + PASSIVE',
        vfxCell: 1,
        desc: 'Hurls clockwork saw-gears & warps to the far side leaving a Stasis Time-Mine when cornered.'
      },
      {
        name: 'HOURGLASS STASIS',
        type: 'SKILL • 4.6S CD',
        vfxCell: 0,
        desc: 'Materializes a golden hourglass prison that freezes the enemy in time.'
      },
      {
        name: 'DOOMSDAY MIDNIGHT',
        type: '★ OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Manifests the Celestial Astrolabe Clock, striking 12 chimes of temporal judgment.'
      }
    ]
  },
  titan: {
    id: 'titan',
    name: 'TORGAR',
    role: 'RUNIC TITAN-FORGER',
    style: 'UNSTOPPABLE JUGGERNAUT',
    trait: 'PASSIVE: SUPER-ARMOR & MAGMA SHELL',
    cls: Titan,
    theme: 'forge',
    color: '#f59e0b',
    selectSfx: 'thunder_slam',
    victoryLine: 'The World-Breaker War-Hammer crushes the arena under molten iron and stone!',
    skills: [
      {
        name: 'TECTONIC EARTH-SHAKER',
        type: 'AUTO + MAGMA FORTIFY',
        vfxCell: 0,
        desc: 'Slams ground fissures that suck foes inward & encases himself in 62% Damage-Reduction Magma Armor.'
      },
      {
        name: 'ANVIL CANNONBALL SMASH',
        type: 'SKILL • 4.7S CD',
        vfxCell: 1,
        desc: 'Summons a physical Iron Anvil obstacle, then batters it horizontally across the stage for a Wall-Crush!'
      },
      {
        name: 'WORLD-FORGE RAGNAROK',
        type: '★ OVERDRIVE ULT',
        vfxCell: 3,
        desc: 'Grows to 1.25x Giant Size and marches forward with 3 unstoppable volcanic hammer slams.'
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
    color: '#818cf8',
    selectSfx: 'slash',
    victoryLine: 'You were already cut before the Odachi clicked back into its scabbard!',
    skills: [
      {
        name: 'SANDAN IAIDO & COUNTER',
        type: 'AUTO + COUNTER-BLINK',
        vfxCell: 0,
        desc: 'Dashes through foes with Delayed Judgment-Cuts & teleports behind attackers on incoming strikes!'
      },
      {
        name: 'ZANTETSUKEN 5-FOLD FLASH',
        type: 'SKILL • 4.2S CD',
        vfxCell: 2,
        desc: 'Zig-zags across the enemy 5 times leaving suspended lightning lines that detonate on sheath-click!'
      },
      {
        name: 'SUSANOO OMNISLASH',
        type: '★ OVERDRIVE ULT',
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
    victoryLine: 'From the skies of Valhalla, the Gungnir War-Lance pierces the earth!',
    skills: [
      {
        name: 'GUNGNIR LANCE & BACKFLIP',
        type: 'AUTO + AERIAL VAULT',
        vfxCell: 0,
        desc: 'Hurls curving Gungnir light-javelins & executes a -360° aerial backflip firing twin counter-spears.'
      },
      {
        name: 'GUNGNIR JAVELIN BARRAGE',
        type: 'SKILL • 4.75S CD',
        vfxCell: 1,
        desc: 'Skims across the arena unleashing a 6-javelin halo volley before erupting a Dragonfire Obelisk!'
      },
      {
        name: 'VALHALLA SKY-SANCTUARY',
        type: '★ OVERDRIVE ULT',
        vfxCell: 3,
        desc: 'Sweeps across the heavens raining 12 Gungnir Light-Javelins before 5 Sovereign Judgment Obelisks!'
      }
    ]
  },
  icemage: {
    id: 'icemage',
    name: 'GLACIA',
    role: 'CRYO-PRISM SOVEREIGN',
    style: 'REFRACTIVE FROST WEAVER',
    trait: 'PASSIVE: CRYO-PRISMS & PERMAFROST SKATE',
    cls: IceMage,
    theme: 'glacial',
    color: '#67e8f9',
    selectSfx: 'frost_cast',
    victoryLine: 'Refracted through the Borealis Prisms, absolute zero shatters all resistance!',
    skills: [
      {
        name: 'CRYO-PRISM REFRACTION',
        type: 'AUTO + ICE STATUE DECOY',
        vfxCell: 0,
        desc: 'Deploys floating Hexagonal Cryo-Prisms that refract laser chains & leaves an exploding Ice-Statue Decoy on dodge.'
      },
      {
        name: 'TRI-BEAM PRISM MATRIX',
        type: 'SKILL • 5.1S CD',
        vfxCell: 1,
        desc: 'Surrounds the enemy with 3 Cryo-Prisms in a laser triangle that bounces around them before shattering Brittle Frost!'
      },
      {
        name: 'BOREALIS CATHEDRAL',
        type: '★ OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Encases the enemy in a Diamond Iceberg beneath the Northern Lights and slices it with a 7-Prism Orbital Laser Array!'
      }
    ]
  },
  android: {
    id: 'android',
    name: 'VEX-09',
    role: 'CYBER VALKYRIE ANDROID',
    style: 'CYBERNETIC VALKYRIE • SKIRMISHER',
    trait: 'PASSIVE: HEX MATRIX DEFLECT',
    cls: Android,
    theme: 'cyber',
    color: '#00f0ff',
    selectSfx: 'cyber_slash',
    victoryLine: 'Singularity Protocol complete — VEX-09 plasma harmonics achieve total target lock!',
    skills: [
      {
        name: 'HF PLASMA KATANA',
        type: 'AUTO + HEX DEFLECT',
        vfxCell: 0,
        desc: '3-step cyan-magenta plasma katana combo that hurls Cyber Chakram discs & raises a hexagonal force-field.'
      },
      {
        name: 'EMP OVERLOAD BLITZ',
        type: 'SKILL • 4.6S CD',
        vfxCell: 1,
        desc: 'Locks onto foes with a holographic scanner, jetpack-rushes through, and detonates a scanline EMP dome.'
      },
      {
        name: 'SINGULARITY PROTOCOL',
        type: '★ OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Ascends on twin aero-thrusters, deploys a laser-grid Cyber Singularity Core, and fires 3 orbital plasma sweeps!'
      }
    ]
  }
};

class Game {
  constructor() {
    this.canvas = document.getElementById('arena-canvas');
    this.renderer = new Renderer(this.canvas);
    this.vfx = new VFXManager();
    this.audio = new AudioManager();
    PixelForge.initAssets();

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

    // Default Mode & 4-Slot Team Lineup:
    // Team 1 (Arcane & Sanctuary): Torgar (Titan-Forger) + Seraphina (High Priestess)
    // Team 2 (Challenger Duo): Sylvara (Tempest Bowmaster) + Malakor (Abyssal Soulreaper)
    this.gameMode = '2v2_brawl'; // '1v1' | '2v2_brawl' | '2v2_tag'
    this.slot1Hero = 'titan';
    this.slot1PartnerHero = 'priestess';
    this.slot2Hero = 'archer';
    this.slot2PartnerHero = 'reaper';
    this.inspectLeftRole = 'lead'; // 'lead' | 'partner'
    this.inspectRightRole = 'lead'; // 'lead' | 'partner'
    this.activeAssignSlot = 2; // 1 = P1 Lead, 2 = P2 Lead, 3 = P1B Partner, 4 = P2B Partner
    this.isLandingOpen = true;

    const params = new URLSearchParams(window.location.search);
    this.forcedStage = params.get('stage') || null;
    const modeParam = params.get('mode');
    if (modeParam === '1v1' || modeParam === 'duel') {
      this.gameMode = '1v1';
    } else if (modeParam === '2v2_tag' || modeParam === 'tag') {
      this.gameMode = '2v2_tag';
    } else if (modeParam === '2v2_brawl' || modeParam === '2v2' || modeParam === 'brawl') {
      this.gameMode = '2v2_brawl';
    }

    const p1 = params.get('p1');
    const p1b = params.get('p1b');
    const p2 = params.get('p2');
    const p2b = params.get('p2b');
    const urlHero = params.get('hero');
    const rosterHero = params.get('roster');
    if (rosterHero && CHAMPION_ROSTER[rosterHero]) {
      this.slot1Hero = rosterHero;
    }
    if (p1 && CHAMPION_ROSTER[p1]) this.slot1Hero = p1;
    if (p1b && CHAMPION_ROSTER[p1b]) this.slot1PartnerHero = p1b;
    if (p2 && CHAMPION_ROSTER[p2]) this.slot2Hero = p2;
    if (p2b && CHAMPION_ROSTER[p2b]) this.slot2PartnerHero = p2b;
    if (urlHero && CHAMPION_ROSTER[urlHero]) {
      this.slot1Hero = urlHero;
      this.slot2Hero = urlHero === 'archer' ? 'mage' : 'archer';
    }
    this.ensureDistinctTeamPartners();

    this.bindUI();
    this.syncRosterSelectionUI(false);
    this.resetMatch();

    const simSec = Number(params.get('sim') || 0);
    const killTarget = params.get('kill');
    const ultParam = params.get('ult');
    const forceUlt = ultParam === '1' || ultParam === 'both';
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

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  is2v2Mode() {
    return this.gameMode === '2v2_brawl' || this.gameMode === '2v2_tag';
  }

  ensureDistinctTeamPartners() {
    const keys = Object.keys(CHAMPION_ROSTER);
    if (this.slot1PartnerHero === this.slot1Hero) {
      this.slot1PartnerHero = keys.find((k) => k !== this.slot1Hero && k !== this.slot2Hero) || 'priestess';
    }
    if (this.slot2PartnerHero === this.slot2Hero) {
      this.slot2PartnerHero = keys.find((k) => k !== this.slot2Hero && k !== this.slot1Hero) || 'reaper';
    }
  }

  setGameMode(mode, playSound = true) {
    if (!['1v1', '2v2_brawl', '2v2_tag'].includes(mode)) return;
    this.gameMode = mode;
    if (!this.is2v2Mode()) {
      this.inspectLeftRole = 'lead';
      this.inspectRightRole = 'lead';
      if (this.activeAssignSlot > 2) this.activeAssignSlot = 1;
    } else {
      this.ensureDistinctTeamPartners();
    }
    this.syncRosterSelectionUI(playSound);
    this.resetMatch();
  }

  cycleGameMode() {
    const order = ['2v2_brawl', '2v2_tag', '1v1'];
    const next = order[(order.indexOf(this.gameMode) + 1) % order.length];
    this.setGameMode(next, true);
  }

  bindUI() {
    this.btnSfx = document.getElementById('btn-sfx');
    this.sfxLabel = document.getElementById('sfx-label');
    this.btnSlowMo = document.getElementById('btn-slowmo');
    this.btnModeCycle = document.getElementById('btn-mode-cycle');
    this.modeCycleLabel = document.getElementById('mode-cycle-label');
    this.btnTagAssist = document.getElementById('btn-tag-assist');
    this.tagAssistLabel = document.getElementById('tag-assist-label');
    this.btnAutoTourney = document.getElementById('btn-auto-tourney');
    this.btnNextChallenger = document.getElementById('btn-next-challenger');
    this.btnReset = document.getElementById('btn-reset');
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.btnOpenSelect = document.getElementById('btn-open-select');
    this.btnVictorySelect = document.getElementById('btn-victory-select');
    this.victoryOverlay = document.getElementById('victory-overlay');
    this.landingOverlay = document.getElementById('landing-overlay');
    this.timerEl = document.getElementById('match-timer');

    this.modeBtns = {
      '1v1': document.getElementById('mode-btn-1v1'),
      '2v2_brawl': document.getElementById('mode-btn-2v2-brawl'),
      '2v2_tag': document.getElementById('mode-btn-2v2-tag')
    };
    Object.entries(this.modeBtns).forEach(([modeKey, btn]) => {
      if (!btn) return;
      btn.addEventListener('click', () => this.setGameMode(modeKey, true));
    });

    this.stageBtns = document.querySelectorAll('[data-stage]');
    this.stageBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const stg = btn.getAttribute('data-stage');
        this.forcedStage = stg === 'auto' ? null : stg;
        this.syncRosterSelectionUI(true);
        this.resetMatch();
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
        this.inspectLeftRole = 'partner';
        this.setActiveSlot(3);
      });
    }
    if (this.p2TabLead) {
      this.p2TabLead.addEventListener('click', () => {
        this.inspectRightRole = 'lead';
        this.setActiveSlot(2);
      });
    }
    if (this.p2TabPartner) {
      this.p2TabPartner.addEventListener('click', () => {
        this.inspectRightRole = 'partner';
        this.setActiveSlot(4);
      });
    }

    this.cards = {
      warrior: document.getElementById('card-warrior'),
      archer: document.getElementById('card-archer'),
      mage: document.getElementById('card-mage'),
      priestess: document.getElementById('card-priestess'),
      reaper: document.getElementById('card-reaper'),
      chronomancer: document.getElementById('card-chronomancer'),
      titan: document.getElementById('card-titan'),
      ronin: document.getElementById('card-ronin'),
      valkyrie: document.getElementById('card-valkyrie'),
      icemage: document.getElementById('card-icemage'),
      android: document.getElementById('card-android')
    };
    this.ribbons = {
      warrior: document.getElementById('ribbon-warrior'),
      archer: document.getElementById('ribbon-archer'),
      mage: document.getElementById('ribbon-mage'),
      priestess: document.getElementById('ribbon-priestess'),
      reaper: document.getElementById('ribbon-reaper'),
      chronomancer: document.getElementById('ribbon-chronomancer'),
      titan: document.getElementById('ribbon-titan'),
      ronin: document.getElementById('ribbon-ronin'),
      valkyrie: document.getElementById('ribbon-valkyrie'),
      icemage: document.getElementById('ribbon-icemage'),
      android: document.getElementById('ribbon-android')
    };
    this.previewCanvases = {
      warrior: document.getElementById('preview-warrior'),
      archer: document.getElementById('preview-archer'),
      mage: document.getElementById('preview-mage'),
      priestess: document.getElementById('preview-priestess'),
      reaper: document.getElementById('preview-reaper'),
      chronomancer: document.getElementById('preview-chronomancer'),
      titan: document.getElementById('preview-titan'),
      ronin: document.getElementById('preview-ronin'),
      valkyrie: document.getElementById('preview-valkyrie'),
      icemage: document.getElementById('preview-icemage'),
      android: document.getElementById('preview-android')
    };

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
    this.hudEls = {
      left: cacheHUD('left'),
      right: cacheHUD('right'),
      crestVs: document.getElementById('crest-vs-text'),
      modeBadge: document.getElementById('hud-mode-badge'),
      stageBadge: document.getElementById('hud-stage-badge')
    };

    if (this.slotBtnLeft) {
      this.slotBtnLeft.addEventListener('click', () => {
        this.inspectLeftRole = 'lead';
        this.setActiveSlot(1);
      });
    }
    if (this.slotBtnLeftPartner) {
      this.slotBtnLeftPartner.addEventListener('click', () => {
        this.inspectLeftRole = 'partner';
        this.setActiveSlot(3);
      });
    }
    if (this.slotBtnRight) {
      this.slotBtnRight.addEventListener('click', () => {
        this.inspectRightRole = 'lead';
        this.setActiveSlot(2);
      });
    }
    if (this.slotBtnRightPartner) {
      this.slotBtnRightPartner.addEventListener('click', () => {
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
          this.setActiveSlot(this.is2v2Mode() ? 3 : 2);
        }
      });
    });
    document.querySelectorAll('[data-assign-p2]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
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
    if (this.btnRandomDuel) {
      this.btnRandomDuel.addEventListener('click', () => {
        const keys = [...Object.keys(CHAMPION_ROSTER)].sort(() => Math.random() - 0.5);
        this.slot1Hero = keys[0];
        this.slot2Hero = keys[1];
        this.slot1PartnerHero = keys[2];
        this.slot2PartnerHero = keys[3];
        this.syncRosterSelectionUI(true);
        this.startDuel(true);
      });
    }
    if (this.btnOpenSelect) {
      this.btnOpenSelect.addEventListener('click', () => this.openLanding());
    }
    if (this.btnVictorySelect) {
      this.btnVictorySelect.addEventListener('click', () => this.openLanding());
    }

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
        if (this.gameMode === '2v2_tag') {
          this.triggerTeamTagSwap(1, true);
        } else if (this.gameMode === '2v2_brawl') {
          this.triggerTeamAssist(1, true);
        }
      });
    }

    if (this.btnAutoTourney) {
      this.btnAutoTourney.addEventListener('click', () => {
        this.autoTourney = !this.autoTourney;
        this.btnAutoTourney.setAttribute('aria-pressed', String(this.autoTourney));
        const autoLabel = document.getElementById('victory-auto-next');
        if (autoLabel) {
          autoLabel.textContent = this.autoTourney
            ? 'AUTO-TOURNEY: NEXT CHALLENGER IN 4S...'
            : 'AUTO-TOURNEY PAUSED • SELECT NEXT ACTION';
        }
        if (!this.autoTourney) {
          clearTimeout(this.autoNextTimeout);
        }
      });
    }

    if (this.btnNextChallenger) {
      this.btnNextChallenger.addEventListener('click', () => this.advanceTourneyChallenger());
    }

    this.btnReset.addEventListener('click', () => this.resetMatch());
    this.btnPlayAgain.addEventListener('click', () => this.resetMatch());
  }

  advanceTourneyChallenger() {
    clearTimeout(this.autoNextTimeout);
    const keys = Object.keys(CHAMPION_ROSTER);
    if (this.is2v2Mode()) {
      const keepLead = this.reigningHero || this.slot1Hero;
      const keepPartner =
        this.slot1PartnerHero !== keepLead
          ? this.slot1PartnerHero
          : keys.find((k) => k !== keepLead) || 'priestess';
      const pool = keys
        .filter((k) => k !== keepLead && k !== keepPartner)
        .sort(() => Math.random() - 0.5);
      this.slot1Hero = keepLead;
      this.slot1PartnerHero = keepPartner;
      this.slot2Hero = pool[0] || 'archer';
      this.slot2PartnerHero = pool[1] || 'reaper';
    } else {
      const keepHero = this.reigningHero || this.slot1Hero;
      const pool = keys.filter((k) => k !== keepHero && k !== this.slot2Hero);
      const candidates = pool.length > 0 ? pool : keys.filter((k) => k !== keepHero);
      const nextChallenger = candidates[Math.floor(Math.random() * candidates.length)] || 'archer';
      this.slot1Hero = keepHero;
      this.slot2Hero = nextChallenger;
    }
    this.syncRosterSelectionUI(false);
    this.resetMatch();
  }

  setActiveSlot(slotNum) {
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
    if (this.isLandingOpen && this.renderer) {
      this.resetMatch();
    }
  }

  syncRosterSelectionUI(playSound = false, soundHeroKey = null) {
    const is2v2 = this.is2v2Mode();
    const c1 = CHAMPION_ROSTER[this.slot1Hero] || CHAMPION_ROSTER.titan;
    const c1b = CHAMPION_ROSTER[this.slot1PartnerHero] || CHAMPION_ROSTER.priestess;
    const c2 = CHAMPION_ROSTER[this.slot2Hero] || CHAMPION_ROSTER.archer;
    const c2b = CHAMPION_ROSTER[this.slot2PartnerHero] || CHAMPION_ROSTER.reaper;

    // 1. Mode Selector Bar, Stage Selector Bar & Bottom Bar Mode/Assist Controls
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
        const active = btn.getAttribute('data-stage') === currentStageKey;
        btn.classList.toggle('active-stage', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }
    if (this.modeCycleLabel) {
      this.modeCycleLabel.textContent =
        this.gameMode === '2v2_brawl'
          ? 'MODE: 2V2 BRAWL'
          : this.gameMode === '2v2_tag'
            ? 'MODE: 2V2 TAG'
            : 'MODE: 1V1 DUEL';
    }
    if (this.btnTagAssist) {
      this.btnTagAssist.classList.toggle('hidden', !is2v2);
      if (this.tagAssistLabel) {
        this.tagAssistLabel.textContent =
          this.gameMode === '2v2_tag' ? '⚡ TAG SWAP' : '⚡ TWIN ASSIST';
      }
    }

    // 2. Matchup Banner 4-Slot Names & Active Slot Highlight
    if (this.slotLeftName) this.slotLeftName.textContent = c1.name;
    if (this.slotLeftPartnerName) this.slotLeftPartnerName.textContent = c1b.name;
    if (this.slotRightName) this.slotRightName.textContent = c2.name;
    if (this.slotRightPartnerName) this.slotRightPartnerName.textContent = c2b.name;

    if (this.slotBtnLeftPartner) this.slotBtnLeftPartner.classList.toggle('hidden', !is2v2);
    if (this.slotBtnRightPartner) this.slotBtnRightPartner.classList.toggle('hidden', !is2v2);
    if (this.p1DuoTabs) this.p1DuoTabs.classList.toggle('hidden', !is2v2);
    if (this.p2DuoTabs) this.p2DuoTabs.classList.toggle('hidden', !is2v2);

    if (this.slotBtnLeft) this.slotBtnLeft.classList.toggle('active-slot', this.activeAssignSlot === 1);
    if (this.slotBtnLeftPartner)
      this.slotBtnLeftPartner.classList.toggle('active-slot', this.activeAssignSlot === 3);
    if (this.slotBtnRight) this.slotBtnRight.classList.toggle('active-slot', this.activeAssignSlot === 2);
    if (this.slotBtnRightPartner)
      this.slotBtnRightPartner.classList.toggle('active-slot', this.activeAssignSlot === 4);

    if (this.p1TabLead) {
      this.p1TabLead.textContent = `★ P1: ${c1.name}`;
      this.p1TabLead.classList.toggle('active-duo-tab', this.inspectLeftRole === 'lead');
    }
    if (this.p1TabPartner) {
      this.p1TabPartner.textContent = `P1B: ${c1b.name}`;
      this.p1TabPartner.classList.toggle('active-duo-tab', this.inspectLeftRole === 'partner');
    }
    if (this.p2TabLead) {
      this.p2TabLead.textContent = `★ P2: ${c2.name}`;
      this.p2TabLead.classList.toggle('active-duo-tab', this.inspectRightRole === 'lead');
    }
    if (this.p2TabPartner) {
      this.p2TabPartner.textContent = `P2B: ${c2b.name}`;
      this.p2TabPartner.classList.toggle('active-duo-tab', this.inspectRightRole === 'partner');
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
      const isP1B = is2v2 && this.slot1PartnerHero === key;
      const isP2 = this.slot2Hero === key;
      const isP2B = is2v2 && this.slot2PartnerHero === key;
      if (card) {
        card.classList.toggle('selected-p1', isP1);
        card.classList.toggle('selected-p1b', isP1B);
        card.classList.toggle('selected-p2', isP2);
        card.classList.toggle('selected-p2b', isP2B);
      }
      if (ribbon) {
        ribbon.textContent = isP1
          ? '★ P1 LEAD'
          : isP1B
            ? '★ P1B ALLY'
            : isP2
              ? '★ P2 LEAD'
              : isP2B
                ? '★ P2B ALLY'
                : slotPrompts[this.activeAssignSlot] || 'SET P1';
      }
    });

    document.querySelectorAll('[data-assign-p1]').forEach((btn) => {
      const k = btn.getAttribute('data-assign-p1');
      const isP1 = this.slot1Hero === k;
      const isP1B = is2v2 && this.slot1PartnerHero === k;
      btn.classList.toggle('active-p1', isP1 || isP1B);
      btn.textContent = isP1 ? '★ P1' : isP1B ? '★ P1B' : this.activeAssignSlot === 3 && is2v2 ? '+P1B' : 'P1';
    });
    document.querySelectorAll('[data-assign-p2]').forEach((btn) => {
      const k = btn.getAttribute('data-assign-p2');
      const isP2 = this.slot2Hero === k;
      const isP2B = is2v2 && this.slot2PartnerHero === k;
      btn.classList.toggle('active-p2', isP2 || isP2B);
      btn.textContent = isP2 ? '★ P2' : isP2B ? '★ P2B' : this.activeAssignSlot === 4 && is2v2 ? '+P2B' : 'P2';
    });

    // 4. Populate Left (P1 / P1B) and Right (P2 / P2B) Fighter Profile & Skill Breakdown Panels
    const syncProfilePanel = (prefix, cfg, partnerCfg) => {
      if (!cfg) return;
      const nameEl = document.getElementById(`${prefix}-profile-name`);
      const roleEl = document.getElementById(`${prefix}-profile-role`);
      const styleEl = document.getElementById(`${prefix}-profile-style`);
      const traitEl = document.getElementById(`${prefix}-profile-trait`);
      const haloEl = document.getElementById(`${prefix}-halo`);
      if (nameEl) nameEl.textContent = cfg.name;
      if (roleEl) {
        roleEl.textContent =
          is2v2 && partnerCfg ? `${cfg.role} • DUO WITH ${partnerCfg.name}` : cfg.role;
      }
      if (styleEl) styleEl.textContent = cfg.style;
      if (traitEl) traitEl.textContent = cfg.trait;
      if (haloEl) haloEl.className = `stage-halo halo-${cfg.theme}`;

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

    const leftInspected = is2v2 && this.inspectLeftRole === 'partner' ? c1b : c1;
    const leftOther = is2v2 && this.inspectLeftRole === 'partner' ? c1 : c1b;
    const rightInspected = is2v2 && this.inspectRightRole === 'partner' ? c2b : c2;
    const rightOther = is2v2 && this.inspectRightRole === 'partner' ? c2 : c2b;

    syncProfilePanel('p1', leftInspected, leftOther);
    syncProfilePanel('p2', rightInspected, rightOther);

    if (this.startDuelText) {
      if (this.gameMode === '2v2_brawl') {
        this.startDuelText.textContent = `LAUNCH 2V2 CHAOS BRAWL: ${c1.name} + ${c1b.name} VS. ${c2.name} + ${c2b.name}`;
      } else if (this.gameMode === '2v2_tag') {
        this.startDuelText.textContent = `LAUNCH 2V2 TAG RELAY: ${c1.name} + ${c1b.name} VS. ${c2.name} + ${c2b.name}`;
      } else {
        this.startDuelText.textContent = `WATCH DUEL: ${c1.name} VS. ${c2.name}`;
      }
    }

    if (playSound && this.audio) {
      const sfxHero = CHAMPION_ROSTER[soundHeroKey || this.slot1Hero];
      if (sfxHero) this.audio.play(sfxHero.selectSfx, 600);
    }
  }

  startDuel(playSound = true) {
    this.isLandingOpen = false;
    if (this.landingOverlay) this.landingOverlay.classList.add('hidden');
    this.resetMatch();
    if (playSound && this.audio) {
      this.audio.play('ult_cast', 600);
    }
  }

  openLanding() {
    this.isLandingOpen = true;
    clearTimeout(this.autoNextTimeout);
    this.victoryOverlay.classList.add('hidden');
    if (this.landingOverlay) this.landingOverlay.classList.remove('hidden');
  }

  renderChampionPreviews(now) {
    if (!this.isLandingOpen) return;
    const assets = PixelForge.initAssets();
    const t = now * 0.001;
    const is2v2 = this.is2v2Mode();

    // 1. Render the 7 Center Portrait Selector Tiles from crisp pixel portraits
    Object.keys(CHAMPION_ROSTER).forEach((heroKey) => {
      const canvas = this.previewCanvases[heroKey];
      const port = assets[heroKey]?.portrait;
      if (!canvas || !port || !port.complete || !port.naturalWidth) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(port, 0, 0, canvas.width, canvas.height);
    });

    const drawAnimatedHeroOnStage = (sctx, heroKey, flipX, destX, destY, destSize, phaseOffset = 0, alpha = 1, drawBadge = false) => {
      const sheet = assets[heroKey]?.sheet;
      const cfg = CHAMPION_ROSTER[heroKey];
      if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
      const cell = 208;
      const cols = Math.max(1, Math.round(sheet.naturalWidth / cell));
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
          if (heroKey === 'priestess') wingEnv = Math.sin(u * Math.PI) * 0.88;
        } else if (cycle < 3.8) {
          row = heroKey === 'priestess' ? 3 : 7;
          const u = (cycle - 2.8) / 1.0;
          col = Math.min(29, Math.floor(u * 30));
          stateTag = 'SKILL • 30FPS';
          if (heroKey === 'priestess') wingEnv = Math.min(1, Math.sin(u * Math.PI) * 1.55);
        } else if (cycle < 4.8) {
          row = heroKey === 'priestess' ? 4 : 8;
          const u = (cycle - 3.8) / 1.0;
          col = Math.min(29, Math.floor(u * 30));
          stateTag = '★ OVERDRIVE ULT';
          if (heroKey === 'priestess') wingEnv = Math.min(1, Math.sin(u * Math.PI) * 1.7);
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
        heroKey === 'priestess'
          ? wingEnv > 0.02
            ? -Math.round(wingEnv * (row === 4 ? 14 : row === 3 ? 10 : 5))
            : Math.round(Math.sin((t + phaseOffset) * 3.2) * 2)
          : 0;

      // Grounded HD-2D Elemental Pedestal Rim & Rising Embers
      const primaryCol = cfg?.color || '#38bdf8';
      const footCx = Math.round(destX + destSize * 0.5);
      const footY = Math.min(204, Math.round(destY + destSize * 0.91));
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

      const wingSheet = heroKey === 'priestess' ? assets.priestess?.wings : null;
      const drawHeroWithWings = () => {
        if (wingEnv > 0.02 && wingSheet && wingSheet.complete && wingSheet.naturalWidth > 0) {
          const sf = destSize / cell;
          const wScale = (0.72 + 0.10 * wingEnv) * sf;
          const wW = Math.round(320 * wScale);
          const wH = Math.round(232 * wScale);
          const sx = 98 * sf;
          const sy = 74 * sf;
          const wdx = Math.round(sx - wW * 0.5);
          const wdy = Math.round(sy - wH * (88 / 232));
          const wCol = Math.floor((t + phaseOffset) * 30) % 30;
          sctx.save();
          sctx.globalAlpha = alpha * Math.min(1, wingEnv * 0.98);
          sctx.drawImage(wingSheet, wCol * 320, 0, 320, 232, wdx, wdy, wW, wH);
          sctx.restore();
        }
        sctx.drawImage(sheet, col * cell, row * cell, cell, cell, 0, 0, destSize, destSize);
      };

      sctx.save();
      sctx.globalAlpha = alpha;
      if (flipX) {
        sctx.translate(destX + destSize, destY + hover);
        sctx.scale(-1, 1);
        drawHeroWithWings();
      } else {
        sctx.translate(destX, destY + hover);
        drawHeroWithWings();
      }
      sctx.restore();

      if (drawBadge) {
        sctx.save();
        sctx.font = '7px "Press Start 2P", monospace';
        sctx.textAlign = flipX ? 'right' : 'left';
        const tx = flipX ? 264 : 8;
        sctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        sctx.fillText(stateTag, tx + 1, 13);
        sctx.fillStyle = stateTag === '★ OVERDRIVE ULT' ? '#facc15' : primaryCol;
        sctx.fillText(stateTag, tx, 12);
        sctx.restore();
      }
    };

    // 2. Render Live Animated Fighter Sprites & 3 Bespoke VFX Skill Icons on Left (P1) and Right (P2) Profile Panels
    const drawSideProfileVisuals = (prefix, primaryKey, secondaryKey, flipX) => {
      const cfg = CHAMPION_ROSTER[primaryKey];
      if (!cfg) return;

      const spriteCanvas = document.getElementById(`${prefix}-sprite-canvas`);
      if (spriteCanvas) {
        const cw = 272;
        const ch = 208;
        if (spriteCanvas.width !== cw || spriteCanvas.height !== ch) {
          spriteCanvas.width = cw;
          spriteCanvas.height = ch;
        }
        const sctx = spriteCanvas.getContext('2d');
        sctx.clearRect(0, 0, cw, ch);
        sctx.imageSmoothingEnabled = false;

        if (is2v2 && secondaryKey && CHAMPION_ROSTER[secondaryKey]) {
          // Draw partner slightly behind & clearly separated horizontally to showcase the 2v2 Duo on the stage pedestal
          const backSize = 164;
          const frontSize = 186;
          const backX = flipX ? 112 : -4;
          const frontX = flipX ? 4 : 84;
          drawAnimatedHeroOnStage(sctx, secondaryKey, flipX, backX, 26, backSize, 2.1, 0.92, false);
          drawAnimatedHeroOnStage(sctx, primaryKey, flipX, frontX, 16, frontSize, 0, 1.0, true);
        } else {
          drawAnimatedHeroOnStage(sctx, primaryKey, flipX, 32, 0, 208, 0, 1.0, true);
        }
      }

      if (Array.isArray(cfg.skills)) {
        cfg.skills.forEach((_sk, idx) => {
          const iconCanvas = document.getElementById(`${prefix}-skill-icon-${idx}`);
          if (!iconCanvas) return;
          const ictx = iconCanvas.getContext('2d');
          PixelForge.drawSkillIcon(ictx, primaryKey, idx, iconCanvas.width, iconCanvas.height, t);
        });
      }
    };

    const p1Front = is2v2 && this.inspectLeftRole === 'partner' ? this.slot1PartnerHero : this.slot1Hero;
    const p1Back = is2v2 && this.inspectLeftRole === 'partner' ? this.slot1Hero : this.slot1PartnerHero;
    const p2Front = is2v2 && this.inspectRightRole === 'partner' ? this.slot2PartnerHero : this.slot2Hero;
    const p2Back = is2v2 && this.inspectRightRole === 'partner' ? this.slot2Hero : this.slot2PartnerHero;

    drawSideProfileVisuals('p1', p1Front, p1Back, false);
    drawSideProfileVisuals('p2', p2Front, p2Back, true);
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
    const fallback = fighter.team === 1 ? this.rightFighter : this.leftFighter;
    return fallback ? [fallback] : [];
  }

  getTargetFor(fighter) {
    const enemies = this.getEnemiesOf(fighter);
    if (enemies.length <= 1) {
      return enemies[0] || (fighter.team === 1 ? this.rightFighter : this.leftFighter);
    }
    // Dynamic 2v2 targeting: pick nearest enemy, with a tactical bias toward low-HP targets or cross-comboing
    let best = enemies[0];
    let bestScore = Infinity;
    for (const e of enemies) {
      const dist = Math.abs(e.x - fighter.x);
      const hpRatio = e.hp / Math.max(1, e.maxHp);
      const roleBias = fighter.slotRole === 'partner' && e.slotRole === 'partner' ? -55 : 0;
      const score = dist + hpRatio * 95 + roleBias;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
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
    const port = assets[heroId]?.portrait;
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
    this.vfx.clear();
    clearTimeout(this.victoryTimeout);
    clearTimeout(this.autoNextTimeout);
    clearTimeout(this.ultBannerTimeout);
    if (this.renderer && typeof this.renderer.pickRandomStage === 'function') {
      this.renderer.pickRandomStage(this.forcedStage);
      this.renderer.stageEventTimer = 0;
      this.renderer.stageEventBannerTimer = 0;
      this.renderer.koZoomTimer = 0;
      this.renderer.cutInTimer = 0;
    }
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;
    const is2v2 = this.is2v2Mode();
    this.ensureDistinctTeamPartners();

    const c1 = CHAMPION_ROSTER[this.slot1Hero] || CHAMPION_ROSTER.titan;
    const c1b = CHAMPION_ROSTER[this.slot1PartnerHero] || CHAMPION_ROSTER.priestess;
    const c2 = CHAMPION_ROSTER[this.slot2Hero] || CHAMPION_ROSTER.archer;
    const c2b = CHAMPION_ROSTER[this.slot2PartnerHero] || CHAMPION_ROSTER.reaper;

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
      this.hudEls.modeBadge.textContent =
        this.gameMode === '2v2_brawl'
          ? 'CHAOS BRAWL'
          : this.gameMode === '2v2_tag'
            ? 'TAG RELAY'
            : '1V1 DUEL';
    }
    if (this.hudEls.stageBadge) {
      const stgNames = {
        cathedral: 'GOTHIC SANCTUARY',
        sylvan: 'SYLVAN GLADE',
        boneyard: 'NECROPOLIS',
        clocktower: 'ASTRAL CLOCKTOWER'
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
    this.victoryOverlay.classList.add('hidden');
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

    this[cdKey] = 6.2;
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
      `★ ${reserve.name} ENTERS! ★`,
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

    this[cdKey] = 6.5;
    const target = this.getTargetFor(point);
    if (!target || target.isDead) return false;

    if (this.gameMode === '2v2_tag' && ally.isBenched) {
      // Reserve Partner fires a Cross-Arena Tag Assist Barrage from the Sanctuary Pedestal!
      const dir = target.x >= ally.x ? 1 : -1;
      ally.facing = dir;
      this.vfx.spawnSpecialCastAura(
        ally,
        'TAG ASSIST!',
        `★ ${ally.name} COVER FIRE ★`,
        ally.theme || 'steel',
        false
      );
      this.vfx.spawnProjectile({
        x: ally.x + dir * 48,
        y: ally.y - 102,
        vx: dir * 740,
        vy: 0,
        radius: 26,
        color: ally.primaryColor,
        coreColor: '#ffffff',
        damage: 78,
        owner: ally,
        type:
          ally.heroId === 'archer'
            ? 'arrow'
            : ally.heroId === 'priestess'
              ? 'holy_light'
              : ally.heroId === 'reaper'
                ? 'phantom_scythe'
                : ally.heroId === 'chronomancer'
                  ? 'clock_gear'
                  : ally.heroId === 'titan'
                    ? 'forge_wave'
                    : ally.heroId === 'ronin'
                      ? 'storm_wave'
                      : ally.heroId === 'valkyrie'
                        ? 'dragon_lance'
                        : ally.heroId === 'icemage'
                          ? 'cryo_shard'
                          : ally.heroId === 'android'
                            ? 'cyber_disc'
                            : ally.heroId === 'warrior'
                              ? 'blade_wave'
                              : 'fireball'
      });
      if (!point.isDead) {
        point.heal(42, 'TAG GRACE');
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
      `★ ${point.name} × ${ally.name} ★`,
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
      this.renderer.triggerUltimateCutIn(caster);
    }

    this.vfx.spawnSpecialCastAura(
      caster,
      caster.ultName,
      '★ ULTIMATE ART ★',
      caster.theme || 'steel',
      true
    );
  }

  triggerStagePhenomenon() {
    this.stageEventTriggered = true;
    this.stageEventTimer = 10.0;
    this.stageEventTickTimer = 0;
    const stageId = this.renderer?.stageId || 'cathedral';
    const ww = this.renderer?.worldWidth || 1200;

    if (stageId === 'cathedral') {
      this.renderer.triggerStageEvent(
        '★ SOLAR ECLIPSE PHENOMENON ★',
        'BLESSING: +55% OVERDRIVE CHARGE!',
        '#facc15',
        10.0
      );
    } else if (stageId === 'sylvan') {
      this.renderer.triggerStageEvent(
        '★ STARLIGHT MONSOON PHENOMENON ★',
        'BLESSING: +180 HP SANCTUARY REGEN!',
        '#34d399',
        10.0
      );
    } else if (stageId === 'boneyard') {
      this.renderer.triggerStageEvent(
        '★ BLOOD MOON FRENZY PHENOMENON ★',
        'BLESSING: +18% ABYSSAL ATTACK DAMAGE!',
        '#f43f5e',
        10.0
      );
    } else {
      this.renderer.triggerStageEvent(
        '★ MIDNIGHT OVERCLOCK PHENOMENON ★',
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
        '★ AVENGER OVERDRIVE! ★',
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
      autoLabel.textContent = this.autoTourney
        ? 'AUTO-TOURNEY: NEXT CHALLENGER IN 4S...'
        : 'AUTO-TOURNEY PAUSED • SELECT NEXT ACTION';
    }

    clearTimeout(this.victoryTimeout);
    clearTimeout(this.autoNextTimeout);
  }

  revealVictoryOverlay() {
    if (!this.isMatchOver || !this.victoryRevealPending) return;
    this.victoryRevealPending = false;
    this.victoryOverlay.classList.remove('hidden');
    if (this.audio) this.audio.play('victory_fanfare');
    if (this.autoTourney && !this.isSimPaused) {
      clearTimeout(this.autoNextTimeout);
      this.autoNextTimeout = setTimeout(() => {
        if (this.isMatchOver && this.autoTourney && !this.isLandingOpen && !this.isSimPaused) {
          this.advanceTourneyChallenger();
        }
      }, 4200);
    }
  }

  triggerClashSpark(cx, cy, col1, col2, label = '★ CLASH! ★') {
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
          this.triggerClashSpark(cx, cy, p.color, q.color, '★ ARCANE CLASH! ★');
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
      p.age = (p.age || 0) + dt;
      p.ringTimer = (p.ringTimer || 0) + dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

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

      const enemies = p.owner ? this.getEnemiesOf(p.owner) : [this.rightFighter];
      let hitTarget = null;
      for (const cand of enemies) {
        if (
          cand &&
          !cand.isDead &&
          !cand.isBenched &&
          Math.abs(p.x - cand.x) < p.radius + 36 &&
          Math.abs(p.y - (cand.y - 108)) < p.radius + 68
        ) {
          hitTarget = cand;
          break;
        }
      }
      const hitGround = p.y >= gy - 4;

      if (hitTarget || hitGround) {
        if (p.isMeteor) {
          if (this.audio) this.audio.play('meteor_impact', p.x);
          this.renderer.triggerShake(22, 0.52);
          this.renderer.triggerAberration(14);
          if (typeof p.owner?.onProjectileHit === 'function') {
            p.owner.onProjectileHit(p, hitTarget, true, this);
          }
          this.vfx.spawnShockwave(p.x, gy, 290, '#fb923c', 0.6, true);
          this.vfx.spawnShockwave(p.x, gy - 35, 220, '#fef08a', 0.46, false);
          this.vfx.spawnDecal(p.x, 165, 'fissure', '#fb923c', 6.0);
          this.vfx.spawnBurst(p.x, gy - 15, 30, '#fb923c', 380, { upBias: 165, size: 9 });
          this.vfx.spawnBurst(p.x, gy - 15, 20, '#fef08a', 310, { upBias: 130, size: 8 });
          this.vfx.spawnGlyphBurst(p.x, gy - 50, 8, 'arcane');

          for (const cand of enemies) {
            if (cand && !cand.isDead && !cand.isBenched && Math.abs(cand.x - p.x) < 230) {
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
        this.vfx.projectiles.splice(i, 1);
      } else if (p.x < -300 || p.x > ww + 300) {
        this.vfx.projectiles.splice(i, 1);
      }
    }
  }

  updateHUD() {
    const sync = (els, f, partner) => {
      if (!els || !f) return;
      const hpPct = Math.max(0, (f.hp / f.maxHp) * 100);
      const manaPct = Math.min(100, (f.mana / f.maxMana) * 100);
      els.hpBar.style.width = `${hpPct}%`;
      els.hpDmg.style.width = `${hpPct}%`;
      els.hpText.textContent = `${Math.ceil(f.hp)}`;
      els.state.textContent = f.isDead ? 'DEFEATED' : f.state;

      els.manaBar.style.width = `${manaPct}%`;
      els.ultLabel.textContent = `OVERDRIVE ${Math.floor(manaPct)}%`;

      const cdPct = Math.max(0, (f.skillCooldown / f.skillMaxCooldown) * 100);
      els.skillCd.style.width = `${cdPct}%`;
      els.skillText.textContent =
        f.skillCooldown > 0.05 ? `${f.skillName} ${f.skillCooldown.toFixed(1)}s` : `${f.skillName} READY`;

      if (this.is2v2Mode() && partner && els.partnerWing) {
        const pHpPct = Math.max(0, (partner.hp / partner.maxHp) * 100);
        const pManaPct = Math.min(100, (partner.mana / partner.maxMana) * 100);
        if (els.partnerHpBar) els.partnerHpBar.style.width = `${pHpPct}%`;
        if (els.partnerManaBar) els.partnerManaBar.style.width = `${pManaPct}%`;
        if (els.partnerHpText) els.partnerHpText.textContent = `${Math.ceil(partner.hp)}`;
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
    sync(this.hudEls.right, rightPoint, rightPartner);

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

    const activeFighters = this.fighters.filter((f) => f && !f.isDead && !f.isBenched);

    // Trigger Autonomous Mid-Match Stage Phenomenon at 11.5s or when any active fighter drops below 58% HP
    if (
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
        if (this.renderer?.stageId === 'sylvan' && !this.isMatchOver) {
          activeFighters.forEach((f) => f.heal(26, 'STARLIGHT'));
        } else if (this.renderer?.stageId === 'boneyard' && !this.isMatchOver) {
          const midX =
            activeFighters.reduce((acc, f) => acc + f.x, 0) / Math.max(1, activeFighters.length);
          this.vfx.spawnBurst(midX, this.renderer.groundY - 40, 20, '#e11d48', 260, {
            upBias: 160,
            size: 6
          });
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
            (pointHpRatio <= 0.48 && reserveHpRatio > pointHpRatio + 0.08) ||
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

    // Update all fighters with dynamic 2v2 target acquisition
    for (const f of this.fighters) {
      if (!f) continue;
      const target = this.getTargetFor(f);
      f.update(dt, target, this);
    }

    // Reveal the Victory / Rematch plaque ONLY after all 30 death frames (F00..F29) have finished
    // AND the fallen champion has rested cleanly on the arena floor for ~0.95s!
    if (this.isMatchOver && this.victoryRevealPending && !this.isSimPaused) {
      const fallen = this.deadMatchFighter || this.fighters.find((f) => f && f.isDead);
      const fullDeathDur = PixelForge.DEATH_DURATION || 1.55;
      const onFloor = !fallen || fallen.y >= this.renderer.groundY - 2;
      if (!fallen || ((fallen.deathTimer || 0) >= fullDeathDur && onFloor)) {
        this.postDeathHoldTimer = (this.postDeathHoldTimer || 0) + rawDt;
        if (this.postDeathHoldTimer >= 0.95) {
          this.revealVictoryOverlay();
        }
      }
    }

    // Check Simultaneous Melee / Skill Blade Clash across opposing active fighters
    if (!this.isMatchOver && this.clashCooldown <= 0) {
      const team1Active = activeFighters.filter((f) => f.team === 1);
      const team2Active = activeFighters.filter((f) => f.team === 2);
      let clashed = false;
      for (const f1 of team1Active) {
        if (clashed) break;
        const f1Swinging =
          (f1.state === 'AUTO_ATTACK' || f1.state === 'SKILL') &&
          f1.stateTimer >= 0.14 &&
          f1.stateTimer <= 0.42;
        if (!f1Swinging) continue;
        for (const f2 of team2Active) {
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
            this.triggerClashSpark(cx, cy, f1.primaryColor, f2.primaryColor, '★ PARRY CLASH! ★');
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

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));

    const rawDt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (this.isLandingOpen) {
      this.renderer.update(rawDt, this.fighters);
      this.vfx.update(rawDt * 0.4, this.renderer.groundY, this.renderer, this.audio);
      this.renderChampionPreviews(now);
    } else if (!this.isSimPaused) {
      this.stepSimulation(rawDt);
    }
    this.renderer.render(this.fighters, this.vfx);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
