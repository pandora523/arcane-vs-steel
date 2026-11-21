import { Renderer } from './engine/Renderer.js?v=30fps203';
import { VFXManager } from './engine/VFXManager.js?v=30fps203';
import { PixelForge } from './engine/PixelForge.js?v=30fps203';
import { AudioManager } from './engine/AudioManager.js?v=30fps203';
import { ArcaneShaderFX } from './engine/ArcaneShaderFX.js?v=30fps203';
import { Fighter } from './entities/Fighter.js?v=30fps203';
import { Warrior } from './entities/Warrior.js?v=30fps203';
import { WarriorEx } from './entities/WarriorEx.js?v=30fps203';
import { FireMage } from './entities/FireMage.js?v=30fps203';
import { FireMageEx } from './entities/FireMageEx.js?v=30fps203';
import { Archer } from './entities/Archer.js?v=30fps203';
import { ArcherEx } from './entities/ArcherEx.js?v=30fps203';
import { Priestess } from './entities/Priestess.js?v=30fps203';
import { PriestessEx } from './entities/PriestessEx.js?v=30fps203';
import { Reaper } from './entities/Reaper.js?v=30fps203';
import { ReaperEx } from './entities/ReaperEx.js?v=30fps203';
import { Chronomancer } from './entities/Chronomancer.js?v=30fps203';
import { ChronomancerEx } from './entities/ChronomancerEx.js?v=30fps203';
import { Titan } from './entities/Titan.js?v=30fps203';
import { TitanEx } from './entities/TitanEx.js?v=30fps203';
import { Ronin } from './entities/Ronin.js?v=30fps203';
import { RoninEx } from './entities/RoninEx.js?v=30fps203';
import { Valkyrie } from './entities/Valkyrie.js?v=30fps203';
import { ValkyrieEx } from './entities/ValkyrieEx.js?v=30fps203';
import { IceMage } from './entities/IceMage.js?v=30fps203';
import { IceMageEx } from './entities/IceMageEx.js?v=30fps203';
import { Android } from './entities/Android.js?v=30fps203';
import { AndroidEx } from './entities/AndroidEx.js?v=30fps203';
import { NyxEx } from './entities/NyxEx.js?v=30fps203';
import { BrawlerEx } from './entities/BrawlerEx.js?v=30fps203';
import {
  AdventureManager,
  ADVENTURE_DIFFICULTY_TIERS,
  ADVENTURE_TIER_STORAGE_KEY,
  DEFAULT_ADVENTURE_CAMPAIGN_ID,
  loadAdventureMedals,
  loadAdventureProgressMode,
  saveAdventureProgressMode,
  loadAllAdventureHeroProgress,
  normalizeAdventureCampaignPack,
  normalizeAdventureDifficultyId,
  normalizeAdventureProgressMode
} from './adventure/AdventureManager.js?v=30fps203';
import { ADVENTURE_HERO_KITS } from './adventure/AdventureSkillSets.js?v=30fps203';
import { EndlessManager } from './endless/EndlessManager.js?v=30fps203';
import { HeroBuildSystem } from './combat/HeroBuildSystem.js?v=30fps203';

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
  'nyx_ex',
  'brawler_ex'
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

export const ARCADE_TROPHY_STORAGE_KEY = 'avs_arcade_trophies_v1';
export const ARCADE_ARENA_STAGES = ['cathedral', 'sanctuary', 'sylvan', 'boneyard', 'clocktower'];

// Curated Stage 5 FINAL SOVEREIGN RIVAL matchup & dramatic arena per EX champion
export const ARCADE_FINAL_RIVAL_MAP = {
  warrior_ex: { rival: 'reaper_ex', stage: 'boneyard', title: 'OATH OF THE BLACK GATE' },
  mage_ex: { rival: 'icemage_ex', stage: 'cathedral', title: 'SOLSTICE VS ABSOLUTE ZERO' },
  priestess_ex: { rival: 'nyx_ex', stage: 'sanctuary', title: 'DIVINE LIGHT VS DIGITAL CHAOS' },
  chronomancer_ex: { rival: 'ronin_ex', stage: 'clocktower', title: 'THE TWELFTH STROKE' },
  valkyrie_ex: { rival: 'titan_ex', stage: 'cathedral', title: 'VALHALLA MEETS THE WORLD-FORGE' },
  ronin_ex: { rival: 'chronomancer_ex', stage: 'clocktower', title: 'BLADE THAT CUTS ETERNITY' },
  archer_ex: { rival: 'android_ex', stage: 'sylvan', title: 'STARWOOD VS POSITRON LOCK' },
  reaper_ex: { rival: 'warrior_ex', stage: 'sanctuary', title: 'SOUL REAPER AT THE SANCTUARY' },
  titan_ex: { rival: 'valkyrie_ex', stage: 'boneyard', title: 'TITANBREAKER SKY-LANCE' },
  icemage_ex: { rival: 'mage_ex', stage: 'cathedral', title: 'FROST CROWN VS SOLAR FLARE' },
  android_ex: { rival: 'nyx_ex', stage: 'clocktower', title: 'SINGULARITY PROTOCOL' },
  nyx_ex: { rival: 'priestess_ex', stage: 'sanctuary', title: 'COB-OS OVERRIDE: HOLY KERNEL' },
  brawler_ex: { rival: 'titan_ex', stage: 'cathedral', title: 'UNSTOPPABLE FIST VS UNBREAKABLE ANVIL' }
};

const ARCADE_RANK_ORDER = { A: 1, S: 2, 'S+': 3 };

export function normalizeArcadeRank(rawRank) {
  const s = String(rawRank || 'A').trim().toUpperCase();
  if (s.startsWith('S+')) return 'S+';
  if (s.startsWith('S')) return 'S';
  return 'A';
}

export function computeArcadeRank(continuesUsed = 0, totalTimeSec = 0) {
  const cont = Math.max(0, Math.floor(Number(continuesUsed) || 0));
  const sec = Math.max(0, Number(totalTimeSec) || 0);
  if (cont === 0 && sec <= 185) return 'S+';
  if (cont === 0) return 'S';
  return 'A';
}

export function getArcadeFinalRivalConfig(heroId) {
  const cleanId = String(heroId || 'warrior_ex');
  const exKey = cleanId.endsWith('_ex') ? cleanId : `${cleanId}_ex`;
  if (ARCADE_FINAL_RIVAL_MAP[exKey]) {
    return ARCADE_FINAL_RIVAL_MAP[exKey];
  }
  return { rival: 'reaper_ex', stage: 'boneyard', title: 'FINAL SOVEREIGN DUEL' };
}

function resolveArcadeStorage(storageOverride = null) {
  if (storageOverride) return storageOverride;
  try {
    if (typeof window !== 'undefined' && window && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadArcadeTrophies(storageOverride = null) {
  const store = resolveArcadeStorage(storageOverride);
  if (!store || typeof store.getItem !== 'function') return {};
  try {
    const raw = store.getItem(ARCADE_TROPHY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out = {};
    for (const [heroId, rec] of Object.entries(parsed)) {
      if (!heroId || !rec || typeof rec !== 'object') continue;
      out[heroId] = {
        rank: normalizeArcadeRank(rec.rank),
        clears: Math.max(1, Math.floor(Number(rec.clears) || 1)),
        bestTimeSec: Number.isFinite(rec.bestTimeSec) ? Math.max(0, Math.round(rec.bestTimeSec)) : 0,
        bestContinues: Number.isFinite(rec.bestContinues) ? Math.max(0, Math.floor(rec.bestContinues)) : 0
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveArcadeTrophy(heroId, record = {}, storageOverride = null) {
  if (!heroId || typeof heroId !== 'string') return loadArcadeTrophies(storageOverride);
  const store = resolveArcadeStorage(storageOverride);
  const current = loadArcadeTrophies(store);
  const prev = current[heroId];
  const nextRank = normalizeArcadeRank(record.rank);
  const nextTime = Math.max(0, Math.round(Number(record.totalTimeSec) || 0));
  const nextCont = Math.max(0, Math.floor(Number(record.continuesUsed) || 0));

  if (!prev) {
    current[heroId] = {
      rank: nextRank,
      clears: 1,
      bestTimeSec: nextTime,
      bestContinues: nextCont
    };
  } else {
    const bestRank =
      (ARCADE_RANK_ORDER[nextRank] || 1) >= (ARCADE_RANK_ORDER[prev.rank] || 1)
        ? nextRank
        : prev.rank;
    current[heroId] = {
      rank: bestRank,
      clears: (prev.clears || 1) + 1,
      bestTimeSec:
        prev.bestTimeSec > 0 && nextTime > 0
          ? Math.min(prev.bestTimeSec, nextTime)
          : nextTime || prev.bestTimeSec,
      bestContinues: Math.min(prev.bestContinues ?? nextCont, nextCont)
    };
  }

  if (store && typeof store.setItem === 'function') {
    try {
      store.setItem(ARCADE_TROPHY_STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Ignore quota / sandbox errors safely
    }
  }
  return current;
}

export function buildArcadeLadder(playerHeroId, rngFn = Math.random) {
  const cleanPlayer = String(playerHeroId || 'warrior_ex');
  const playerBaseEx = cleanPlayer.endsWith('_ex') ? cleanPlayer : `${cleanPlayer}_ex`;
  const finalCfg = getArcadeFinalRivalConfig(cleanPlayer);
  const finalRivalId = finalCfg.rival;

  // Build 4 distinct EX rivals excluding the player's champion (and EX counterpart) and the Stage 5 Final Rival
  const pool = EX_HERO_KEYS.filter(
    (k) => k !== cleanPlayer && k !== playerBaseEx && k !== finalRivalId
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const openingRivals = pool.slice(0, 4);

  // Cycle across all 4 non-final arenas in varied order, culminating on the curated Stage 5 arena
  const openingStages = ARCADE_ARENA_STAGES.filter((s) => s !== finalCfg.stage);
  for (let i = openingStages.length - 1; i > 0; i--) {
    const j = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (i + 1));
    const tmp = openingStages[i];
    openingStages[i] = openingStages[j];
    openingStages[j] = tmp;
  }

  const stages = openingRivals.map((heroId, idx) => ({
    stageNumber: idx + 1,
    heroId,
    stageId: openingStages[idx % openingStages.length] || 'cathedral',
    isFinalRival: false,
    hpMult: 1.0,
    rivalTitle: `STAGE ${idx + 1} CHALLENGER`,
    defeated: false
  }));

  stages.push({
    stageNumber: 5,
    heroId: finalRivalId,
    stageId: finalCfg.stage || 'boneyard',
    isFinalRival: true,
    hpMult: 1.18,
    rivalTitle: finalCfg.title || 'FINAL SOVEREIGN RIVAL',
    defeated: false
  });

  return {
    playerHeroId: cleanPlayer,
    stages,
    currentStageIndex: 0,
    continuesUsed: 0,
    totalTimeSec: 0,
    cleared: false,
    bestRank: null
  };
}

// Verbatim spoken match-intro subtitles for all 12 champions (shared across EX & Legacy personas, EN + JP)
export const INTRO_DIALOGUE_SUBTITLES = {
  warrior: {
    en: 'Raise your blade! Let celestial steel judge your resolve!',
    ja: '剣を取れ！聖なる鋼が、貴様の覚悟を裁く！'
  },
  mage: {
    en: 'Ash before my solar crown! The heavens burn!',
    ja: '太陽冠の前で灰となれ！天空よ燃えよ！'
  },
  priestess: {
    en: 'Step into the light... or be purified by it!',
    ja: '光へ進みなさい――さもなくば浄化します！'
  },
  chronomancer: {
    en: 'Your final second has already been inscribed in brass!',
    ja: '貴様の最期の秒針は、すでに黄金の歯車へ刻まれている！'
  },
  valkyrie: {
    en: 'Gungnir commands the Bifrost! Show your valour!',
    ja: '虹の橋は我が槍に！戦乙女に勇気を示せ！'
  },
  ronin: {
    en: 'One breath, one draw — show me your steel!',
    ja: '一息一閃――貴様の鋼、見せてみよ！'
  },
  archer: {
    en: 'Draw if you dare — the wind has already marked your heart!',
    ja: '構えるがいいわ――風はすでに、あなたの心臓を捉えている！'
  },
  reaper: {
    en: 'Hear the death knell — Oblivion claims your shadow!',
    ja: '死の鐘を聴け――忘却が貴様の影を呑む！'
  },
  titan: {
    en: 'Brace your spine! The World-Forge comes crashing down!',
    ja: '歯を食いしばれ！世界炉の鉄槌が真っ向から叩き潰すぞ！'
  },
  icemage: {
    en: 'Step onto my mirror ice — freeze where you stand!',
    ja: '鏡の氷へ踏み込みなさい――その場で凍てつくがいいわ！'
  },
  android: {
    en: 'Hostile signature acquired — initiating Positron purge!',
    ja: '敵性反応を捕捉――ポジトロン殲滅プロトコルを開始する！'
  },
  nyx: {
    en: 'Target locked! Combat prompt executing right now, nya!',
    ja: 'えへへ、ターゲットロック完了！バトルプロンプト、いっくよーっ！'
  },
  brawler: {
    en: 'Step into the storm! My iron fists answer only to thunder!',
    ja: '嵐へ踏み込め！俺の鉄拳に応えるのは雷鳴だけだ！'
  }
};

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
  brawler_ex: {
    id: 'brawler_ex',
    name: 'RAIJIN EX',
    role: 'THE TEMPEST FIST',
    style: 'CLOSE-RANGE THUNDER BRAWLER',
    trait: 'PASSIVE: IRON GUARD COUNTER & STATIC BARRIER',
    cls: BrawlerEx,
    theme: 'tempest',
    color: '#fbbf24',
    selectSfx: 'thunder_slam',
    victoryLine: 'Heaven and earth bow before the unstoppable fury of the Tempest Fist!',
    trueUltName: 'HEAVEN-SPLITTING RAIJIN CRASH',
    trueUltDesc:
      'Launches skyward inside a blazing storm pillar before diving straight down in a jagged golden-indigo lightning meteor-slam shattering the arena!',
    skills: [
      {
        name: 'TEMPEST FIST QUARTET',
        type: '4-BEAT THUNDER COMBO',
        vfxCell: 0,
        desc: 'Snappy stepping storm jab, spinning thunder backfist, rising sky-breaker uppercut & one-inch Thunderclap Palm shockwave finisher.'
      },
      {
        name: 'THUNDERSTEP BREAKER',
        type: 'SKILL • 4.2S CD',
        vfxCell: 1,
        desc: 'Coiled golden-indigo lightning dash-rush leaving afterimage arcs before detonating an explosive storm cross-punch.'
      },
      {
        name: 'TEMPEST HUNDRED FISTS',
        type: 'OVERDRIVE ULT',
        vfxCell: 2,
        desc: 'Opens a Raijin Storm-Crest seal and unleashes a blistering multi-hit golden-indigo phantom fist barrage capped by a sky-breaker uppercut.'
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
    this.renderer.onStageDomainBgm = (bgmKey) => {
      if (!this.isLandingOpen && !this.isSideScrollMode() && (!this.simMode || this._allowBgmInSim)) {
        this.audio?.playBgm?.(bgmKey);
      }
    };
    PixelForge.initAssets();
    this.adventure = new AdventureManager(this);
    this.endless = new EndlessManager(this);
    this._endlessResetConfirmUntil = 0;
    this._endlessResetConfirmTimer = null;
    this._lastEndlessBossHudH = '0px';
    this._lastBossPortraitTopStr = '';
    this._lastBossMeasureAt = 0;
    this._lastBossMeasureSig = '';
    this._wasBossHudVisible = false;

    this.userSlowMo = false;
    this.autoTourney = true;
    this.winStreak = 0;
    this.reigningHero = null;
    this.ultSlowTimer = 0;
    this.koSlowTimer = 0;
    this.koSlowMaxTimer = 0.85;
    this.clashCooldown = 0;
    this.vsControlMode = 'ai'; // '1p' | 'ai' (default 'ai' for full AI-vs-AI & automated test compatibility)
    this.p1SubMode = 'exhibition'; // 'exhibition' | 'arcade' | 'training' (strictly active in PLAYER VS AI)
    this.arcadeRun = null;
    const isCompactViewport =
      typeof window !== 'undefined' &&
      ((window.innerWidth || 1280) <= 960 || (window.innerHeight || 800) <= 560);
    this.trainingLab = {
      dummyMode: 'idle', // 'idle' | 'auto_guard' | 'fight'
      gaugeMode: 'instant', // 'instant' | 'normal'
      hpMode: 'auto_heal', // 'auto_heal' | 'mortal'
      collapsed: Boolean(isCompactViewport),
      idleGaugeTimer: 0,
      currentCombo: 0,
      comboDamage: 0,
      lastHit: 0,
      maxCombo: 0,
      comboDisplayTimer: 0
    };
    this.vsInput = {
      heldLeft: false,
      heldRight: false,
      heldUp: false,
      heldDown: false,
      heldAttack: false,
      uiHeldAttack: false,
      joyActive: false,
      joyX: 0,
      joyY: 0,
      joyFlickLockY: 0,
      queuedAction: null,
      queuedTimer: 0,
      keyHintTimer: 0,
      keyHintDismissed: false,
      keyHintHideTimeout: null,
      lastTouchHeroId: null
    };
    this.vsComboState = {
      left: { hits: 0, damage: 0, timer: 0 },
      right: { hits: 0, damage: 0, timer: 0 }
    };
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
    this.matchEndPhase = 'none'; // 'none' | 'defeat_spotlight' | 'winner_showcase' | 'overlay'
    this.matchEndElapsed = 0;
    this.winnerShowcaseTimer = 0;
    this.matchEndWinner = null;
    this.matchEndWinnerLabel = '';
    this._victoryAudioPlayedInShowcase = false;
    this._winnerVoiceWasBusy = false;
    this._postWinnerVoiceBreathRemaining = 0;
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
    this.activeAssignSlot = 1; // 1 = P1 Lead, 2 = P2 Lead, 3 = P1B Partner, 4 = P2B Partner
    this._kitDrawerSide = null; // null | 'p1' | 'p2'
    this.isLandingOpen = true;
    this.isPaused = false;
    this.landingStep = 'title'; // 'title' | 'mode' | 'roster'
    this.selectedCampaignId = DEFAULT_ADVENTURE_CAMPAIGN_ID;
    this.campaignIndexPacks = [];
    this.loadedCampaignPacks = new Map();
    this._pendingMatchPackId = null;

    const params = new URLSearchParams(window.location.search);
    const vlangParam = params.get('vlang');
    if (vlangParam === 'ja' || vlangParam === 'en') {
      this.audio?.setVoiceLang?.(vlangParam, false);
    }
    const vpaceParam = params.get('vpace');
    if (vpaceParam === 'snappy' || vpaceParam === 'full' || vpaceParam === 'fast') {
      this.audio?.setVoicePace?.(vpaceParam === 'fast' ? 'snappy' : vpaceParam, false);
    }
    const campaignParamRaw = params.get('campaign');
    const campaignParam =
      typeof campaignParamRaw === 'string' && campaignParamRaw.trim()
        ? campaignParamRaw.trim()
        : null;
    let savedAdvTier = 'normal';
    try {
      if (typeof window !== 'undefined' && window?.localStorage?.getItem) {
        savedAdvTier = normalizeAdventureDifficultyId(window.localStorage.getItem(ADVENTURE_TIER_STORAGE_KEY));
      }
    } catch {
      savedAdvTier = 'normal';
    }
    const tierParamRaw = params.get('tier') || params.get('ascension');
    this.selectedAdvDifficulty = tierParamRaw
      ? normalizeAdventureDifficultyId(tierParamRaw)
      : savedAdvTier;
    this.adventure?.setDifficultyTier?.(this.selectedAdvDifficulty);
    const testModeParam = params.get('testmode');
    this.explicitAdvUnlimitedHp = testModeParam === '1' || testModeParam === 'true';
    this.testModeUnlimitedHp = testModeParam === '1' || testModeParam === 'true';
    this.vsTestModeUnlimitedHp = this.testModeUnlimitedHp;
    this.urlAutoPlay = params.get('autoplay') === '1';

    const keepLvlParamRaw = params.get('keeplvl') || params.get('progress');
    const savedProgressMode = loadAdventureProgressMode();
    const keepLvlFromUrl =
      keepLvlParamRaw === '1' || keepLvlParamRaw === 'true' || keepLvlParamRaw === 'keep'
        ? 'keep'
        : keepLvlParamRaw === '0' || keepLvlParamRaw === 'false' || keepLvlParamRaw === 'fresh'
          ? 'fresh'
          : null;
    this.selectedAdvProgressMode = keepLvlFromUrl
      ? keepLvlFromUrl
      : this.simMode || this.testModeUnlimitedHp || this.urlAutoPlay
        ? 'fresh'
        : savedProgressMode;
    this.adventure?.setProgressMode?.(this.selectedAdvProgressMode);
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
    this.forcedStage = params.get('stage') || null;
    const modeParam = params.get('mode');
    if (modeParam === 'p1_vs_ai' || modeParam === 'player_vs_ai' || modeParam === 'p1') {
      this.gameMode = '1v1';
      this.vsControlMode = '1p';
    } else if (modeParam === 'arcade' || modeParam === 'arcade5' || modeParam === 'arcade_5') {
      this.gameMode = '1v1';
      this.vsControlMode = '1p';
      this.p1SubMode = 'arcade';
    } else if (modeParam === 'training' || modeParam === 'lab' || modeParam === 'training_lab') {
      this.gameMode = '1v1';
      this.vsControlMode = '1p';
      this.p1SubMode = 'training';
    } else if (modeParam === '1v1' || modeParam === 'duel') {
      this.gameMode = '1v1';
    } else if (modeParam === '2v2_tag' || modeParam === 'tag') {
      this.gameMode = '2v2_tag';
    } else if (modeParam === '2v2_brawl' || modeParam === '2v2' || modeParam === 'brawl') {
      this.gameMode = '2v2_brawl';
    } else if (
      modeParam === 'endless' ||
      modeParam === 'crusade' ||
      modeParam === 'endless_crusade'
    ) {
      this.gameMode = 'endless';
      this.slot1Hero = this.rosterVersion === 'legacy' ? 'mage' : 'warrior_ex';
      this.activeAssignSlot = 1;
      this.testModeUnlimitedHp = false;
    } else if (
      modeParam === 'adventure' ||
      modeParam === 'campaign' ||
      (!modeParam && campaignParam)
    ) {
      this.gameMode = 'adventure';
      this.slot1Hero = this.rosterVersion === 'legacy' ? 'mage' : 'warrior_ex';
      this.activeAssignSlot = 1;
      this.testModeUnlimitedHp = Boolean(this.explicitAdvUnlimitedHp);
    }
    const p1SubParam = (params.get('p1mode') || params.get('submode') || '').toLowerCase();
    if (p1SubParam === 'arcade' || p1SubParam === 'arcade5') {
      this.gameMode = '1v1';
      this.vsControlMode = '1p';
      this.p1SubMode = 'arcade';
    } else if (p1SubParam === 'training' || p1SubParam === 'lab') {
      this.gameMode = '1v1';
      this.vsControlMode = '1p';
      this.p1SubMode = 'training';
    } else if (p1SubParam === 'exhibition') {
      this.p1SubMode = 'exhibition';
    }
    if (campaignParam) {
      this.selectedCampaignId = campaignParam;
    }
    if (params.get('autoplay') === '1') {
      this.adventure.setAutoPlay(true, false);
    }
    const p1CtrlParam = params.get('p1ctrl') ?? params.get('play1p') ?? params.get('control');
    if (p1CtrlParam === '1' || p1CtrlParam === 'true' || p1CtrlParam === '1p') {
      this.vsControlMode = '1p';
    } else if (p1CtrlParam === '0' || p1CtrlParam === 'false' || p1CtrlParam === 'ai') {
      this.vsControlMode = 'ai';
    }

    this.crtMode = 'off';
    const crtParam = (params.get('crt') || '').toLowerCase();
    if (crtParam === 'off' || crtParam === '0' || crtParam === 'false') {
      this.crtMode = 'off';
    } else if (crtParam === 'subtle' || crtParam === 'pvm' || crtParam === 'soft') {
      this.crtMode = 'subtle';
    } else if (crtParam === 'arcade' || crtParam === '1' || crtParam === 'true' || crtParam === 'on') {
      this.crtMode = 'arcade';
    } else if (!this.simMode && typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedCrt = window.localStorage.getItem('avs_crt_mode');
        if (savedCrt === 'off' || savedCrt === 'subtle' || savedCrt === 'arcade') {
          this.crtMode = savedCrt;
        }
      } catch (_err) {}
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

    HeroBuildSystem.reloadFromStorage();
    HeroBuildSystem.clearTourneyOverrides();
    const tourneyBuildsParam = params.get('tourneybuilds');
    if (tourneyBuildsParam === '0' || tourneyBuildsParam === 'false') {
      HeroBuildSystem.setChallengerRngEnabled(false);
    } else if (tourneyBuildsParam === '1' || tourneyBuildsParam === 'true') {
      HeroBuildSystem.setChallengerRngEnabled(true);
    }
    const applyUrlBuildParam = (paramName, slotKey, heroKey) => {
      const val = params.get(paramName);
      if (!val || !heroKey) return;
      const parsed = HeroBuildSystem.parseBuildShorthand(val);
      if (parsed) HeroBuildSystem.setSlotBuild(slotKey, heroKey, parsed, false);
    };
    applyUrlBuildParam('p1build', 'p1', this.slot1Hero);
    applyUrlBuildParam('p1bbuild', 'p1b', this.slot1PartnerHero);
    applyUrlBuildParam('p2build', 'p2', this.slot2Hero);
    applyUrlBuildParam('p2bbuild', 'p2b', this.slot2PartnerHero);
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
      (!stepParam && (modeParam || campaignParam) && this.isSideScrollMode()) ||
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
      const arcadeStageParam = Number(params.get('arcadestage') || params.get('arcadeStage') || 0);
      if (this.isArcadeLadderActive() && arcadeStageParam >= 2 && arcadeStageParam <= 5) {
        for (let st = 0; st < arcadeStageParam - 1; st++) {
          this.arcadeRun.stages[st].defeated = true;
        }
        this.arcadeRun.currentStageIndex = arcadeStageParam - 1;
        this.slot2Hero = this.arcadeRun.stages[this.arcadeRun.currentStageIndex].heroId;
        this.resetMatch();
      }
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

    this._urlSimSec = simSec > 0 ? simSec : 0;
    this.initCampaignCatalog(campaignParam).catch(() => {});
    if (killTarget) {
      this.roundIntroTimer = 0;
      this._roundIntroQueue = [];
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
        this.victoryRevealPending = false;
        this.matchEndPhase = 'overlay';
        this.renderer?.setEndMatchSpotlight?.('overlay', victim, attacker, { canSkip: false });
        this.victoryOverlay.classList.remove('hidden');
        if (this.btnSwapSides) {
          this.btnSwapSides.classList.toggle(
            'hidden',
            Boolean(this.isSideScrollMode() || this.isArcadeLadderActive() || this.isP1TrainingMode())
          );
        }
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
    if (!this.simMode && this.isLandingOpen) {
      this.syncActiveBgm({ deferUntilGesture: true });
    }
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

  _clearAutoNextTimers() {
    clearTimeout(this.autoNextTimeout);
    this.autoNextTimeout = null;
    if (this._autoNextTickInterval) {
      clearInterval(this._autoNextTickInterval);
      this._autoNextTickInterval = null;
    }
  }

  _updateVictoryCountdownLabel() {
    if (this.isSideScrollMode() || typeof document === 'undefined') return;
    const autoLabel = document.getElementById('victory-auto-next');
    if (!autoLabel) return;
    if (!this.autoTourney) {
      autoLabel.textContent = 'AUTO-TOURNEY PAUSED • SELECT NEXT ACTION';
      return;
    }
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const remMs =
      this._autoNextDeadlineMs > nowMs
        ? this._autoNextDeadlineMs - nowMs
        : this._autoNextRemainingMs > 0
          ? this._autoNextRemainingMs
          : 9000;
    const secs = Math.max(1, Math.ceil(remMs / 1000));
    const nextText = `AUTO-TOURNEY: NEXT CHALLENGER IN ${secs}S...`;
    if (autoLabel.textContent !== nextText) {
      autoLabel.textContent = nextText;
    }
  }

  _scheduleAutoNext(delayMs = 9000) {
    clearTimeout(this.autoNextTimeout);
    this.autoNextTimeout = null;
    this._clearAutoNextTimers?.();
    this._autoNextRemainingMs = 0;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._autoNextDeadlineMs = nowMs + delayMs;
    this._updateVictoryCountdownLabel?.();
    if (typeof window !== 'undefined' && !this.simMode) {
      this._autoNextTickInterval = setInterval(() => {
        if (!this.isMatchOver || !this.autoTourney || this.isLandingOpen) {
          if (this._autoNextTickInterval) {
            clearInterval(this._autoNextTickInterval);
            this._autoNextTickInterval = null;
          }
          return;
        }
        this._updateVictoryCountdownLabel?.();
      }, 250);
      if (this._autoNextTickInterval && typeof this._autoNextTickInterval.unref === 'function') {
        this._autoNextTickInterval.unref();
      }
    }
    this.autoNextTimeout = setTimeout(() => {
      clearTimeout(this.autoNextTimeout);
      this.autoNextTimeout = null;
      this._clearAutoNextTimers?.();
      this._autoNextDeadlineMs = 0;
      if (
        !this._appSuspended &&
        this.isMatchOver &&
        this.autoTourney &&
        !this.isSideScrollMode() &&
        !this.isLandingOpen &&
        !this.isSimPaused
      ) {
        this.advanceTourneyChallenger();
      }
    }, delayMs);
    if (this.autoNextTimeout && typeof this.autoNextTimeout.unref === 'function') {
      this.autoNextTimeout.unref();
    }
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
      this.endless?.clearHeldInputs?.();
      if (this.isEndlessMode() && this.endless?.active) {
        this.endless.saveNow?.();
      }
      this.audio?.suspendForBackground?.();
      if (this.autoNextTimeout) {
        const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this._autoNextRemainingMs = Math.max(250, (this._autoNextDeadlineMs || nowMs + 1000) - nowMs);
        clearTimeout(this.autoNextTimeout);
        this.autoNextTimeout = null;
        this._clearAutoNextTimers?.();
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
      !this.isSideScrollMode() &&
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

  isEndlessMode() {
    return this.gameMode === 'endless';
  }

  isSideScrollMode() {
    return this.gameMode === 'adventure' || this.gameMode === 'endless';
  }

  getActiveSideScrollManager() {
    if (this.gameMode === 'endless') return this.endless;
    if (this.gameMode === 'adventure') return this.adventure;
    return null;
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
    const gridEl =
      this.championGridEl ||
      (typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById('champion-grid')
        : null);
    if (gridEl?.classList) {
      gridEl.classList.toggle('roster-group-ex', activeVer === 'ex');
      gridEl.classList.toggle('roster-group-legacy', activeVer === 'legacy');
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

  syncCameraZoomUI() {
    const mode =
      this.renderer?.zoomMode ||
      (this.renderer?.isMobile ? (this.renderer?.mobileFullZoomOut ?? true ? 'full' : 'auto') : 'auto');
    if (this.btnPauseFullZoom) {
      this.btnPauseFullZoom.classList.toggle('active-zoom-toggle', mode === 'full');
      this.btnPauseFullZoom.classList.toggle('mid-zoom-toggle', mode === 'mid');
      this.btnPauseFullZoom.setAttribute('aria-pressed', String(mode !== 'auto'));
    }
    if (this.pauseFullZoomLabel) {
      this.pauseFullZoomLabel.textContent =
        mode === 'full' ? 'ZOOM: FULL' : mode === 'mid' ? 'ZOOM: MID' : 'ZOOM: AUTO';
    }
  }

  syncCrtUI() {
    const mode = this.crtMode === 'subtle' || this.crtMode === 'arcade' ? this.crtMode : 'off';
    const rootEl = typeof document !== 'undefined' ? document.documentElement : null;
    if (rootEl?.dataset) {
      if (mode === 'off') {
        delete rootEl.dataset.crt;
      } else {
        rootEl.dataset.crt = mode;
      }
    }
    if (this.btnPauseCrt) {
      this.btnPauseCrt.classList.toggle('is-crt-subtle', mode === 'subtle');
      this.btnPauseCrt.classList.toggle('is-crt-arcade', mode === 'arcade');
      this.btnPauseCrt.setAttribute('aria-pressed', String(mode !== 'off'));
    }
    if (this.pauseCrtLabel) {
      this.pauseCrtLabel.textContent =
        mode === 'arcade' ? 'CRT: ARCADE' : mode === 'subtle' ? 'CRT: SUBTLE' : 'CRT: OFF';
    }
    if (Array.isArray(this.navCrtBtns)) {
      for (const btn of this.navCrtBtns) {
        if (!btn) continue;
        const active = btn.dataset?.crtMode === mode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      }
    }
  }

  setCrtMode(mode, opts = {}) {
    const { persist = true, playSound = false } = opts;
    const next = mode === 'subtle' || mode === 'arcade' ? mode : 'off';
    this.crtMode = next;
    if (persist && !this.simMode && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('avs_crt_mode', next);
      } catch (_err) {}
    }
    this.syncCrtUI();
    if (playSound && this.audio) {
      this.audio.play(next === 'off' ? 'clock_gear' : 'reflect', 600);
    }
    return this.crtMode;
  }

  cycleCrtMode(playSound = true) {
    const order = ['off', 'subtle', 'arcade'];
    const idx = order.indexOf(this.crtMode);
    const next = order[(idx + 1) % order.length];
    return this.setCrtMode(next, { persist: true, playSound });
  }

  syncMobileFullZoomUI() {
    this.syncCameraZoomUI();
  }

  setCameraZoomMode(mode, playSound = true) {
    const nextMode = this.renderer?.setZoomMode?.(mode, true) || mode;
    if (this.fighters && this.renderer) {
      this.renderer.update(0, this.fighters);
    }
    this._pausedFrameRendered = false;
    this.syncCameraZoomUI();
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
    return nextMode;
  }

  cycleCameraZoomMode(playSound = true) {
    const nextMode = this.renderer?.cycleZoomMode?.(true) || 'auto';
    if (this.fighters && this.renderer) {
      this.renderer.update(0, this.fighters);
    }
    this._pausedFrameRendered = false;
    this.syncCameraZoomUI();
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
    return nextMode;
  }

  setMobileFullZoomOut(enabled, playSound = true) {
    const nextVal = Boolean(enabled);
    this.renderer?.setMobileFullZoomOut?.(nextVal);
    if (this.fighters && this.renderer) {
      this.renderer.update(0, this.fighters);
    }
    this._pausedFrameRendered = false;
    this.syncCameraZoomUI();
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
  }

  toggleMobileFullZoomOut(playSound = true) {
    return this.cycleCameraZoomMode(playSound);
  }

  setNavAudioOpen(open, playSound = false) {
    const nextOpen = Boolean(open && this.isLandingOpen);
    this._navAudioOpen = nextOpen;
    this.navAudioPopover?.classList.toggle('hidden', !nextOpen);
    this.btnNavAudio?.setAttribute('aria-expanded', String(nextOpen));
    if (nextOpen) {
      this.syncAudioMixerUI();
    }
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
  }

  syncActiveBgm(opts = {}) {
    if (!this.audio?.playBgm) return false;
    if (this.simMode && !opts.forceInSim) return false;
    if (this.isLandingOpen) {
      return this.audio.playBgm('bgm_title_select', opts);
    }
    if (this.isSideScrollMode?.() ?? this.isAdventureMode?.()) {
      const sideMgr = this.getActiveSideScrollManager?.() || this.adventure;
      const inBossEncounter = Boolean(
        sideMgr?.bossWarningTimer > 0 ||
          sideMgr?.bossSpawnPending ||
          sideMgr?.isBossEncounter ||
          (sideMgr?.bossEntity && !sideMgr.bossEntity.isDead)
      );
      return this.audio.playBgm(
        inBossEncounter ? 'bgm_boss_malphas' : 'bgm_adventure_pilgrimage',
        opts
      );
    }
    const activeStage = this.renderer?.permanentStageOverride || this.renderer?.stageId || 'cathedral';
    return this.audio.playBgm(activeStage, opts);
  }

  syncAudioMixerUI() {
    const voiceVol = Math.max(0, Math.min(1, Number(this.audio?.getVoiceVolume?.() ?? 1)));
    const bgmVol = Math.max(0, Math.min(1, Number(this.audio?.getBgmVolume?.() ?? 0.38)));
    const sfxVol = Math.max(0, Math.min(1, Number(this.audio?.getSfxVolume?.() ?? 0.55)));
    const voicePct = Math.round(voiceVol * 100);
    const bgmPct = Math.round(bgmVol * 100);
    const sfxPct = Math.round(sfxVol * 100);
    const voiceOn = Boolean(this.audio?.enabled && this.audio?.voiceEnabled && voicePct > 0);
    const bgmOn = Boolean(this.audio?.enabled && this.audio?.bgmEnabled && bgmPct > 0);
    const sfxOn = Boolean(this.audio?.enabled && this.audio?.sfxEnabled && sfxPct > 0);

    const syncChan = (btnEl, lblEl, sliderEl, valEl, isOn, pct, activeText) => {
      if (btnEl) btnEl.setAttribute('aria-pressed', String(isOn));
      if (lblEl) lblEl.textContent = isOn ? activeText : 'MUTE';
      if (sliderEl && String(sliderEl.value) !== String(pct)) {
        sliderEl.value = String(pct);
      }
      if (valEl) valEl.textContent = isOn ? `${pct}%` : 'OFF';
    };

    syncChan(this.btnVoice, this.voiceLabel, this.inputVoiceVol, this.voiceVolVal, voiceOn, voicePct, 'VOICE');
    syncChan(this.btnBgm, this.bgmLabel, this.inputBgmVol, this.bgmVolVal, bgmOn, bgmPct, 'BGM');
    syncChan(this.btnSfx, this.sfxLabel, this.inputSfxVol, this.sfxVolVal, sfxOn, sfxPct, 'SFX');
    syncChan(
      this.btnNavVoice,
      this.navVoiceLabel,
      this.inputNavVoiceVol,
      this.navVoiceVolVal,
      voiceOn,
      voicePct,
      'VOICE'
    );
    syncChan(this.btnNavBgm, this.navBgmLabel, this.inputNavBgmVol, this.navBgmVolVal, bgmOn, bgmPct, 'BGM');
    syncChan(this.btnNavSfx, this.navSfxLabel, this.inputNavSfxVol, this.navSfxVolVal, sfxOn, sfxPct, 'SFX');

    const vLang = this.audio?.getVoiceLang?.() === 'ja' ? 'ja' : 'en';
    for (const langBtn of [this.btnVoiceLang, this.btnNavVoiceLang]) {
      if (!langBtn) continue;
      langBtn.setAttribute('data-voice-lang', vLang);
      langBtn.setAttribute('aria-pressed', String(vLang === 'ja'));
      if (typeof langBtn.querySelectorAll === 'function') {
        langBtn.querySelectorAll('.vlang-opt').forEach((optEl) => {
          optEl.classList.toggle('is-active', optEl.getAttribute('data-lang') === vLang);
        });
      }
    }

    const vPace = this.audio?.getVoicePace?.() === 'full' ? 'full' : 'snappy';
    for (const paceBtn of [this.btnVoicePace, this.btnNavVoicePace]) {
      if (!paceBtn) continue;
      paceBtn.setAttribute('data-voice-pace', vPace);
      paceBtn.setAttribute('aria-pressed', String(vPace === 'full'));
      if (typeof paceBtn.querySelectorAll === 'function') {
        paceBtn.querySelectorAll('.vpace-opt').forEach((optEl) => {
          optEl.classList.toggle('is-active', optEl.getAttribute('data-pace') === vPace);
        });
      }
    }
  }

  _clearEndlessResetConfirm() {
    if (this._endlessResetConfirmTimer) {
      clearTimeout(this._endlessResetConfirmTimer);
      this._endlessResetConfirmTimer = null;
    }
    this._endlessResetConfirmUntil = 0;
  }

  _syncAdvRestartButtonUI(isEndless = Boolean(this.isEndlessMode?.())) {
    const btn =
      this.advBtnRestart ||
      (typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById('adv-btn-restart')
        : null);
    if (!btn) return;
    if (isEndless) {
      const armed = Boolean(this._endlessResetConfirmUntil && Date.now() < this._endlessResetConfirmUntil);
      btn.textContent = armed ? 'CONFIRM RESET RUN?' : 'RESET RUN';
      btn.title = armed
        ? 'Click again within 4s to confirm resetting your Endless Crusade run'
        : 'Reset Endless Crusade Run (Click twice to confirm)';
      btn.classList?.toggle('is-confirm-danger', armed);
    } else {
      btn.textContent = 'RETRY';
      btn.title = 'Restart Campaign';
      btn.classList?.remove('is-confirm-danger');
    }
  }

  syncPauseMenuUI() {
    const isAdv = Boolean(this.isAdventureMode?.());
    const isEndless = Boolean(this.isEndlessMode?.());
    const isSideScroll = Boolean(isAdv || isEndless);
    const isP1 = this.isVsManualP1Active();
    const isArcade = this.isArcadeLadderActive();
    const isTraining = this.isP1TrainingMode();
    const curStage = this.getCurrentArcadeStage?.();
    const subtitleEl = document.getElementById('pause-mode-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = isEndless
        ? `ENDLESS CRUSADE • STAGE ${this.endless?.stage || 1}`
        : isAdv
        ? 'SOLO ADVENTURE CAMPAIGN'
        : isArcade && curStage
          ? curStage.isFinalRival
            ? 'ARCADE LADDER • FINAL RIVAL 5 / 5'
            : `ARCADE LADDER • STAGE ${curStage.stageNumber} / 5`
          : isTraining
            ? 'PLAYER VS AI • TRAINING LAB'
            : isP1
              ? this.gameMode === '2v2_tag'
                ? 'PLAYER VS AI • TAG VS'
                : 'PLAYER VS AI • 1V1 DUEL'
              : this.gameMode === '2v2_brawl'
                ? '2V2 CHAOS BRAWL'
                : this.gameMode === '2v2_tag'
                  ? 'TAG VS'
                  : '1V1 SOVEREIGN DUEL';
    }
    if (this.pauseVsSectionLabel) {
      this.pauseVsSectionLabel.textContent = isTraining
        ? 'TRAINING LAB • DUMMY & SANDBOX CONTROLS'
        : isArcade
          ? 'ARCADE LADDER • MATCH CONTROLS'
          : isP1
            ? 'PLAYER VS AI • MATCH CONTROLS'
            : 'ARENA SPECTATOR & SANDBOX CONTROLS';
    }
    const lockVsFormatToggles = Boolean(isArcade || isTraining);
    this.btnModeCycle?.classList?.toggle('hidden', lockVsFormatToggles);
    this.btnTestMode?.classList?.toggle('hidden', lockVsFormatToggles);
    this.btnAutoTourney?.classList?.toggle('hidden', lockVsFormatToggles);
    this.pauseTrainingBar?.classList?.toggle('hidden', !isTraining);
    if (isTraining) {
      this.syncTrainingLabUI?.();
    }
    this.pauseVsSection?.classList.toggle('hidden', isSideScroll);
    this.pauseAdvSection?.classList.toggle('hidden', !isSideScroll);
    this.pauseAdvSection?.setAttribute?.(
      'aria-label',
      isEndless ? 'Endless Crusade Controls' : 'Adventure Campaign Controls'
    );
    const pauseAdvLabel =
      this.pauseAdvSectionLabel ||
      (typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById('pause-adv-section-label')
        : null);
    if (pauseAdvLabel) {
      pauseAdvLabel.textContent = isEndless
        ? 'ENDLESS CRUSADE • RUN & AUTO-BATTLE DECK'
        : 'SOLO ADVENTURE CAMPAIGN & RPG DECK';
    }
    const pauseAdvRelics =
      this.pauseAdvRelics ||
      (typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById('pause-adv-relics')
        : null);
    if (pauseAdvRelics) {
      pauseAdvRelics.classList?.toggle('hidden', isEndless);
    }
    const advSkillTreeBtn =
      typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById('adv-btn-skilltree')
        : null;
    if (advSkillTreeBtn) {
      advSkillTreeBtn.classList?.toggle('hidden', isEndless);
    }
    const advMenuBtn =
      typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById('adv-btn-menu')
        : null;
    if (advMenuBtn) {
      advMenuBtn.title = isEndless ? 'Open Endless Hero Select' : 'Open Adventure Hero Select';
    }
    const pauseAdvHint =
      this.pauseAdvHint ||
      (typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById('pause-adv-hint')
        : null);
    if (pauseAdvHint) {
      const nextHintHtml = isEndless
        ? 'SHORTCUTS: <strong>[T]</strong> ARMORY • <strong>[P]</strong> AUTO-AI • <strong>[R/TAB]</strong> TARGET LOCK • <strong>[O]</strong> OVERDRIVE • <strong>[WASD]</strong> MOVE • <strong>[J/K/L/U/I]</strong> ACTIONS'
        : 'SHORTCUTS: <strong>[T]</strong> SKILL TREE • <strong>[P]</strong> AUTO-AI • <strong>[R/TAB]</strong> TARGET LOCK • <strong>[WASD]</strong> MOVE • <strong>[J/K/L/U/I]</strong> ACTIONS';
      if (pauseAdvHint.innerHTML !== nextHintHtml) {
        pauseAdvHint.innerHTML = nextHintHtml;
      }
    }
    if (isAdv) {
      this.adventure?.renderActiveRelicsInspector?.();
    }
    if (isEndless && typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      const autoOn = Boolean(this.endless?.autoPlay);
      const autoBtn = document.getElementById('adv-btn-autoplay');
      const autoLbl = document.getElementById('adv-autoplay-label');
      if (autoBtn) {
        autoBtn.setAttribute?.('aria-pressed', String(autoOn));
        autoBtn.classList?.toggle('is-autoplay-on', autoOn);
      }
      if (autoLbl) {
        autoLbl.textContent = autoOn ? 'AI: ON' : 'AI: OFF';
      }
      const lockOn = Boolean(this.endless?.manualTargetLock ?? this.endless?.autoLockEnabled);
      const pauseLockBtn = document.getElementById('adv-btn-pause-lock');
      const pauseLockLbl = document.getElementById('adv-pause-lock-label');
      if (pauseLockBtn) {
        pauseLockBtn.setAttribute?.('aria-pressed', String(lockOn));
        pauseLockBtn.classList?.toggle('is-lock-on', lockOn);
      }
      if (pauseLockLbl) {
        pauseLockLbl.textContent = lockOn ? 'LOCK: ON' : 'LOCK: OFF';
      }
    }
    this.syncMobileFullZoomUI?.();
    this.syncCrtUI?.();
    this.syncAudioMixerUI?.();
    const showPause = Boolean(this.isPaused && !this.isLandingOpen);
    if (!showPause || !isEndless) {
      this._clearEndlessResetConfirm?.();
    }
    this._syncAdvRestartButtonUI?.(isEndless);
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
    if (nextPaused && this.isAdventureMode() && this.adventure?.isRelicDraftOpen) {
      nextPaused = false;
    }
    const changed = this.isPaused !== nextPaused;
    this.isPaused = nextPaused;
    if (changed) {
      this._pausedFrameRendered = false;
    }
    if (nextPaused) {
      if (this.isAdventureMode() && this.adventure?.active) {
        this.adventure.persistHeroProgressIfEnabled?.({ force: true });
      }
      if (this.isEndlessMode() && this.endless?.active) {
        this.endless.saveNow?.();
        this.endless.clearHeldInputs?.();
      }
      this.adventure?.clearHeldInputs();
      this.clearVsManualInputs?.();
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
    if (this.endless?.active) {
      this.endless.stopRun({ save: true });
    } else {
      this.endless?.clearHeldInputs?.();
    }
    this.clearVsManualInputs?.();
    this.dismissVsKeyHintBar?.(true);
    if (this.vsComboState) {
      this.vsComboState.left.hits = 0;
      this.vsComboState.left.damage = 0;
      this.vsComboState.left.timer = 0;
      this.vsComboState.right.hits = 0;
      this.vsComboState.right.damage = 0;
      this.vsComboState.right.timer = 0;
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
    this.matchEndPhase = 'none'; // 'none' | 'defeat_spotlight' | 'winner_showcase' | 'overlay'
    this.matchEndElapsed = 0;
    this.winnerShowcaseTimer = 0;
    this.matchEndWinner = null;
    this.matchEndWinnerLabel = '';
    this._victoryAudioPlayedInShowcase = false;
    this._winnerVoiceWasBusy = false;
    this._postWinnerVoiceBreathRemaining = 0;
    this.renderer?.clearEndMatchSpotlight?.();
    this.renderer?.deathFX?.clear?.();
    this._pausedFrameRendered = false;
    this.victoryOverlay?.classList.remove('is-defeat-plaque');
    this.victoryOverlay?.classList.remove('is-arcade-champion-plaque');
    this.victoryOverlay?.classList.add('hidden');
    if (this.victoryArcadeStrip) this.victoryArcadeStrip.classList.add('hidden');
    if (this.btnNextChallenger) {
      this.btnNextChallenger.classList.remove('is-arcade-primary');
      this.btnNextChallenger.textContent = 'NEXT CHALLENGER';
    }
    if (this.rightRivalBadge) this.rightRivalBadge.classList.add('hidden');
    if (this.hudRightPlate) this.hudRightPlate.classList.remove('is-final-rival-plate');
    if (this.trainingLab) {
      this.trainingLab.idleGaugeTimer = 0;
      this.trainingLab.currentCombo = 0;
      this.trainingLab.comboDamage = 0;
      this.trainingLab.lastHit = 0;
      this.trainingLab.maxCombo = 0;
      this.trainingLab.comboDisplayTimer = 0;
    }
    if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'CHANGE HERO';
    if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';
    if (this.ultBanner) this.ultBanner.classList.add('hidden');
    this._clearEndlessResetConfirm?.();
    this.appEl?.classList?.toggle(
      'is-adventure-active',
      Boolean(this.isSideScrollMode() && !this.isLandingOpen)
    );
    this.appEl?.classList?.toggle(
      'is-endless-active',
      Boolean(this.isEndlessMode() && !this.isLandingOpen)
    );
    this.appEl?.classList?.remove('is-endless-boss-hud-visible');
    this.appEl?.classList?.remove('is-endless-drawer-open');
    this._wasBossHudVisible = false;
    this._lastBossMeasureSig = '';
    if (this.appEl?.style?.setProperty) {
      this._lastEndlessBossHudH = '0px';
      this.appEl.style.setProperty('--endless-boss-hud-h', '0px');
    }
    this.syncVsControlUI?.();
    this.syncTrainingLabUI?.();
    this.updateAdventureBossHUD?.();
    if (releaseMemory) {
      this.arcadeRun = null;
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
    this.arcadeRun = null;
    this.p1SubMode = 'exhibition';
    this.teardownActiveMatch(true);
    this.openLanding('title');
    this.syncP1SubModeUI?.();
    if (typeof window !== 'undefined' && typeof HTMLImageElement !== 'undefined' && !this.simMode) {
      setTimeout(() => this.prewarmSelectedAssets(), 150);
    }
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
  }

  _getActiveMatchAssetOpts() {
    if (this.isEndlessMode?.()) {
      const compHeroKeys = this.endless?.companions?.getActiveHeroKeys?.() || [];
      return {
        heroIds: [this.slot1Hero || 'mage', ...compHeroKeys],
        stageId: null,
        isAdventure: true,
        zoneIdx: this.endless?.zoneIndex || 0
      };
    }
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
    if (this.isLandingOpen) {
      const bootPrefix = this.audio?.getVoicePackPrefix?.(this.slot1Hero) || 'seraphina';
      this.audio?.loadVoiceKey?.(`${bootPrefix}_select`);
    }
    if (this.isSideScrollMode()) {
      const advHero = this.slot1Hero || 'warrior_ex';
      PixelForge.ensureHeroLoaded?.(advHero);
      PixelForge.ensureAdventureLoaded?.(0);
      if (this.isEndlessMode()) {
        PixelForge.ensureEndlessLoaded?.();
      }
      this.audio?.preloadHeroVoicePack?.(advHero);
      return;
    }
    PixelForge.ensureStageLoaded?.(this.forcedStage || this.renderer?.stageId || 'cathedral');
    PixelForge.ensureHeroLoaded?.(this.slot1Hero);
    PixelForge.ensureHeroLoaded?.(this.slot2Hero);
    this.audio?.preloadHeroVoicePack?.(this.slot1Hero);
    this.audio?.preloadHeroVoicePack?.(this.slot2Hero);
    if (this.is2v2Mode()) {
      PixelForge.ensureHeroLoaded?.(this.slot1PartnerHero);
      PixelForge.ensureHeroLoaded?.(this.slot2PartnerHero);
      this.audio?.preloadHeroVoicePack?.(this.slot1PartnerHero);
      this.audio?.preloadHeroVoicePack?.(this.slot2PartnerHero);
    }
  }

  syncLandingBranchUI() {
    const isAdv = Boolean(this.isAdventureMode?.());
    const isEndless = Boolean(this.isEndlessMode?.());
    const isSide = isAdv || isEndless;
    const onTitle = this.landingStep === 'title';
    const branch = onTitle ? 'title' : isSide ? 'adventure' : 'vs';
    if (this.landingOverlay) {
      this.landingOverlay.setAttribute('data-branch', isSide ? 'adventure' : 'vs');
      this.landingOverlay.setAttribute('data-sub-branch', isEndless ? 'endless' : isAdv ? 'adventure' : 'vs');
    }
    const navEl = document.querySelector('.arcade-step-nav');
    if (navEl) {
      navEl.setAttribute('data-branch', branch);
    }

    const stepDividerMode = document.getElementById('step-divider-mode');
    const stepTabMode = document.getElementById('step-tab-mode');
    const stepDividerRoster = document.getElementById('step-divider-roster');
    const stepTabRoster = document.getElementById('step-tab-roster');
    if (stepDividerMode) stepDividerMode.hidden = onTitle || isSide;
    if (stepTabMode) stepTabMode.hidden = onTitle || isSide;
    if (stepDividerRoster) stepDividerRoster.hidden = onTitle;
    if (stepTabRoster) stepTabRoster.hidden = onTitle;

    const stepNumRoster = document.getElementById('step-num-roster');
    const stepLabelRoster = document.getElementById('step-label-roster');
    if (stepNumRoster) stepNumRoster.textContent = isSide ? '01' : '02';
    if (stepLabelRoster) {
      stepLabelRoster.textContent = isEndless
        ? 'CRUSADER SELECT'
        : isAdv
          ? 'HERO SELECT'
          : 'CHAMPION SELECT';
    }

    const btnNavCommence = document.getElementById('btn-nav-commence');
    const navCommenceLabel = document.getElementById('nav-commence-label');
    if (btnNavCommence) btnNavCommence.classList.toggle('hidden', onTitle);
    if (navCommenceLabel) {
      navCommenceLabel.textContent = isEndless
        ? 'START CRUSADE'
        : isAdv
          ? 'START CAMPAIGN'
          : 'START MATCH';
    }

    const rosterBackLabel = document.getElementById('roster-back-label');
    if (rosterBackLabel) {
      rosterBackLabel.textContent = 'TITLE';
    }
    const ctaHeadline = document.getElementById('cta-headline-text');
    if (ctaHeadline) {
      ctaHeadline.textContent = isEndless
        ? 'START CRUSADE'
        : isAdv
          ? 'START CAMPAIGN'
          : 'START FIGHT';
    }
    const rosterConfigBadge = document.getElementById('btn-roster-config-badge');
    if (rosterConfigBadge) {
      rosterConfigBadge.disabled = isSide;
      rosterConfigBadge.setAttribute('aria-disabled', String(isSide));
    }
  }

  setGameMode(mode, playSound = true) {
    if (!['1v1', '2v2_brawl', '2v2_tag', 'adventure', 'endless'].includes(mode)) return;
    this.setPaused(false, false);
    this.closeKitDrawer?.(false);
    this.gameMode = mode;
    this.testModeUnlimitedHp =
      mode === 'adventure' || mode === 'endless'
        ? Boolean(this.explicitAdvUnlimitedHp)
        : Boolean(this.vsTestModeUnlimitedHp);
    if (mode === 'adventure' || mode === 'endless') {
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
    if (this.isEndlessMode()) {
      this.endless?.syncControlDeckUI?.();
    } else {
      this.appEl?.classList?.remove('is-endless-active');
      this.appEl?.classList?.remove('is-endless-boss-hud-visible');
      this.appEl?.classList?.remove('is-endless-drawer-open');
      if (this.appEl?.style?.setProperty) {
        this._lastEndlessBossHudH = '0px';
        this.appEl.style.setProperty('--endless-boss-hud-h', '0px');
      }
      this.adventure?.syncControlDeckUI?.();
    }
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
    const isP1 = this.vsControlMode === '1p' && !(this.isSideScrollMode?.() ?? this.isAdventureMode?.());
    if (isP1 && this.isArcadeLadderActive?.()) {
      const stage = this.getCurrentArcadeStage?.();
      if (stage?.isFinalRival) return 'ARCADE • FINAL 5 / 5';
      return `ARCADE • STAGE ${stage?.stageNumber || 1} / 5`;
    }
    if (isP1 && this.isP1TrainingMode?.()) {
      return 'TRAINING LAB';
    }
    const base =
      this.gameMode === 'endless'
        ? 'ENDLESS CRUSADE'
        : this.gameMode === 'adventure'
          ? 'ADVENTURE'
          : isP1
            ? this.gameMode === '2v2_tag'
              ? 'PLAYER VS AI • TAG'
              : 'PLAYER VS AI'
            : this.gameMode === '2v2_brawl'
              ? 'CHAOS BRAWL'
              : this.gameMode === '2v2_tag'
                ? 'TAG VS'
                : '1V1 DUEL';
    return this.testModeUnlimitedHp && !(this.isSideScrollMode?.() ?? this.isAdventureMode?.())
      ? `${base} • UNLIMITED HP`
      : base;
  }

  syncTestModeUI() {
    const active = Boolean(
      (this.isSideScrollMode?.() ?? this.isAdventureMode?.())
        ? this.testModeUnlimitedHp
        : this.vsTestModeUnlimitedHp
    );
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
    if (this.btnQuickHpMode) {
      this.btnQuickHpMode.classList.toggle('active-quick-hp', active);
      this.btnQuickHpMode.setAttribute('aria-pressed', String(active));
    }
    if (this.quickHpModeLabel) {
      this.quickHpModeLabel.textContent = active ? 'SANDBOX HP' : 'MORTAL HP';
    }
    if (this.hudEls?.modeBadge) {
      if (this.isEndlessMode() && this.endless?.active) {
        this.endless.syncRightHUD();
      } else if (this.isAdventureMode() && this.adventure?.active) {
        this.adventure.syncRightHUD();
      } else {
        this.hudEls.modeBadge.textContent = this.formatModeBadgeText();
      }
    }
  }

  setTestModeUnlimitedHp(enabled, playSound = true) {
    const nextVal = Boolean(enabled);
    if (!this.isSideScrollMode()) {
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

  // =========================================================================
  // PLAYABLE 1P VS MODE CONTROL TOGGLE, INPUT ROUTER, TOUCH DECK & COMBO HUD
  // =========================================================================
  isVsManualP1Active() {
    return Boolean(this.vsControlMode === '1p' && !(this.isSideScrollMode?.() ?? this.isAdventureMode?.()));
  }

  syncVsManualControlFlags() {
    if ((this.isSideScrollMode?.() ?? this.isAdventureMode?.()) || !Array.isArray(this.fighters)) return;
    const isManual = this.isVsManualP1Active();
    const leftPoint = this.getPointFighter(1);
    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      if (!f) continue;
      if (isManual && f === leftPoint && !f.isDead && !f.isBenched) {
        f.isPlayerControlled = true;
        f.adventureAutoPlay = false;
      } else {
        f.isPlayerControlled = false;
        f.adventureAutoPlay = false;
        f._manualWalkActive = false;
        f._manualSpeedRatio = 0;
        f.manualMoveAxis = 0;
      }
    }
  }

  setVsControlMode(mode, opts = {}) {
    const { playSound = false } = opts;
    const nextMode = mode === '1p' ? '1p' : 'ai';
    this.vsControlMode = nextMode;
    this.clearVsManualInputs();
    this.syncVsManualControlFlags();
    if (!this.isLandingOpen && !this.isSideScrollMode() && !this.isMatchOver) {
      if (nextMode === '1p') {
        this.showVsKeyHintBar(4.0);
      } else {
        this.dismissVsKeyHintBar(true);
      }
    } else {
      this.dismissVsKeyHintBar(true);
    }
    this.syncVsControlUI();
    if (playSound && this.audio) {
      this.audio.play(nextMode === '1p' ? 'reflect' : 'clock_gear', 600);
    }
    return this.vsControlMode;
  }

  syncVsControlUI() {
    const is1P = this.vsControlMode === '1p';
    const isAdv = Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.());
    const activeInMatch = Boolean(is1P && !isAdv && !this.isLandingOpen && !this.isMatchOver);
    const isTag = this.gameMode === '2v2_tag';
    const isArcade = this.isArcadeLadderActive?.();
    const isTraining = this.isP1TrainingMode?.();
    const curStage = this.getCurrentArcadeStage?.();

    if (this.vsModeOriginChip) {
      this.vsModeOriginChip.textContent = is1P ? 'PLAYER VS AI' : 'AI ARENA';
      this.vsModeOriginChip.classList.toggle('is-player-vs-ai', is1P);
      this.vsModeOriginChip.classList.toggle('is-ai-arena', !is1P);
    }
    const stepModeLabel =
      typeof document !== 'undefined' ? document.querySelector?.('#step-tab-mode .step-label') : null;
    if (stepModeLabel && !isAdv) {
      stepModeLabel.textContent = is1P ? 'P1 VS AI SETUP' : 'VS SETUP';
    }
    if (this.hudEls?.modeBadge && !isAdv) {
      this.hudEls.modeBadge.textContent = this.formatModeBadgeText();
      this.hudEls.modeBadge.classList.toggle('is-arcade-final', Boolean(isArcade && curStage?.isFinalRival));
      this.hudEls.modeBadge.classList.toggle('is-training-lab', Boolean(isTraining));
    }
    if (this.appEl) {
      this.appEl.classList.toggle('is-vs-manual-active', activeInMatch);
    }
    if (this.vsTouchControlsEl) {
      this.vsTouchControlsEl.classList.toggle('hidden', !activeInMatch);
    }
    if (this.vsBtnTag) {
      this.vsBtnTag.classList.toggle('hidden', !isTag);
    }
    if (this.vsKeyHintTextEl) {
      const baseHtml =
        '<kbd>A/D</kbd> MOVE • <kbd>W/SPC</kbd> JUMP • <kbd>S</kbd> PARRY • <kbd>J/Z</kbd> COMBO • <kbd>K/X</kbd> SKILL • <kbd>L/SHFT</kbd> DODGE • <kbd>U/Q</kbd> DRIVE • <kbd>I/E</kbd> ULT';
      this.vsKeyHintTextEl.innerHTML = isTraining
        ? `${baseHtml} • <kbd>BKSP</kbd> RESET`
        : isTag
          ? `${baseHtml} • <kbd>TAB</kbd> TAG`
          : baseHtml;
    }
    this.syncP1SubModeUI?.();
    this.syncTrainingLabUI?.();
    if (activeInMatch) {
      this.refreshVsTouchIcons();
      this.syncVsTouchDeckUI();
    }
  }

  _ensureVsManualState() {
    if (!this.vsInput) {
      this.vsInput = {
        heldLeft: false,
        heldRight: false,
        heldUp: false,
        heldDown: false,
        heldAttack: false,
        uiHeldAttack: false,
        joyActive: false,
        joyX: 0,
        joyY: 0,
        joyFlickLockY: 0,
        queuedAction: null,
        queuedTimer: 0,
        keyHintTimer: 0,
        keyHintDismissed: false,
        keyHintHideTimeout: null,
        lastTouchHeroId: null
      };
    }
    if (!this.vsComboState) {
      this.vsComboState = {
        left: { hits: 0, damage: 0, timer: 0 },
        right: { hits: 0, damage: 0, timer: 0 }
      };
    }
    return this.vsInput;
  }

  showVsKeyHintBar(duration = 4.0) {
    const inp = this._ensureVsManualState();
    if (!this.vsKeyHintBarEl) return;
    if (!this.isVsManualP1Active() || this.isLandingOpen || this.isMatchOver || this.simMode) {
      this.dismissVsKeyHintBar(true);
      return;
    }
    clearTimeout(inp.keyHintHideTimeout);
    inp.keyHintHideTimeout = null;
    inp.keyHintTimer = duration;
    inp.keyHintDismissed = false;
    this.vsKeyHintBarEl.classList.remove('hidden');
    this.vsKeyHintBarEl.classList.remove('is-fading');
  }

  dismissVsKeyHintBar(immediate = false) {
    if (this.vsInput) {
      clearTimeout(this.vsInput.keyHintHideTimeout);
      this.vsInput.keyHintHideTimeout = null;
      this.vsInput.keyHintTimer = 0;
      this.vsInput.keyHintDismissed = true;
    }
    if (!this.vsKeyHintBarEl) return;
    if (immediate) {
      this.vsKeyHintBarEl.classList.add('hidden');
      this.vsKeyHintBarEl.classList.remove('is-fading');
      return;
    }
    if (this.vsKeyHintBarEl.classList.contains('hidden')) return;
    this.vsKeyHintBarEl.classList.add('is-fading');
    const inp = this._ensureVsManualState();
    inp.keyHintHideTimeout = setTimeout(() => {
      inp.keyHintHideTimeout = null;
      if (inp.keyHintDismissed) {
        this.vsKeyHintBarEl?.classList?.add('hidden');
        this.vsKeyHintBarEl?.classList?.remove('is-fading');
      }
    }, 460);
  }

  clearVsManualInputs() {
    if (!this.vsInput) return;
    this.vsInput.heldLeft = false;
    this.vsInput.heldRight = false;
    this.vsInput.heldUp = false;
    this.vsInput.heldDown = false;
    this.vsInput.heldAttack = false;
    this.vsInput.uiHeldAttack = false;
    this.vsInput.joyActive = false;
    this.vsInput.joyX = 0;
    this.vsInput.joyY = 0;
    this.vsInput.joyFlickLockY = 0;
    this.vsInput.queuedAction = null;
    this.vsInput.queuedTimer = 0;
    this.syncVsStickKnobUI?.();
  }

  syncVsStickKnobUI() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const base = document.getElementById('vs-stick-base');
    const knob = document.getElementById('vs-stick-knob');
    if (!base || !knob) return;
    let vx = 0;
    let vy = 0;
    if (this.vsInput.joyActive) {
      vx = this.vsInput.joyX;
      vy = this.vsInput.joyY;
    } else {
      vx = (this.vsInput.heldRight ? 1 : 0) - (this.vsInput.heldLeft ? 1 : 0);
      vy = (this.vsInput.heldDown ? 1 : 0) - (this.vsInput.heldUp ? 1 : 0);
    }
    const maxPx = 30;
    if (knob.style) {
      knob.style.transform = `translate3d(${Math.round(vx * maxPx)}px, ${Math.round(vy * maxPx)}px, 0px)`;
    }
    base.classList?.toggle('is-active', Math.hypot(vx, vy) > 0.08);
    if (typeof base.querySelector === 'function') {
      base.querySelector('.adv-joy-n')?.classList?.toggle('is-lit', vy < -0.35);
      base.querySelector('.adv-joy-s')?.classList?.toggle('is-lit', vy > 0.35);
      base.querySelector('.adv-joy-w')?.classList?.toggle('is-lit', vx < -0.22);
      base.querySelector('.adv-joy-e')?.classList?.toggle('is-lit', vx > 0.22);
    }
  }

  refreshVsTouchIcons() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const inp = this._ensureVsManualState();
    const player = this.getPointFighter?.(1);
    const heroKey = player?.heroId || this.slot1Hero || 'warrior_ex';
    if (inp.lastTouchHeroId === heroKey) return;
    inp.lastTouchHeroId = heroKey;
    const slotMap = [
      ['vs-icon-attack', 'attack'],
      ['vs-icon-skill', 'skill'],
      ['vs-icon-dodge', 'dodge'],
      ['vs-icon-overdrive', 'overdrive'],
      ['vs-icon-ultimate', 'ultimate'],
      ['vs-icon-jump', 'jump'],
      ['vs-icon-guard', 'crouch']
    ];
    for (let i = 0; i < slotMap.length; i++) {
      const [id, actionType] = slotMap[i];
      const cvs = document.getElementById(id);
      if (!cvs || typeof cvs.getContext !== 'function') continue;
      const ictx = cvs.getContext('2d');
      if (ictx) {
        PixelForge.drawAdventureActionIcon(ictx, heroKey, actionType, cvs.width || 64, cvs.height || 64, 0);
      }
    }
  }

  syncVsTouchDeckUI() {
    if (!this.isVsManualP1Active() || this.isLandingOpen || this.isMatchOver) return;
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const player = this.getPointFighter?.(1);
    if (!player) return;
    this.refreshVsTouchIcons();

    const syncOrb = (slot, cd, maxCd, isCharge = false, chargePct = 0) => {
      const btn = document.getElementById(`vs-btn-${slot}`);
      const sweep = document.getElementById(`vs-cd-sweep-${slot}`);
      const txt = document.getElementById(`vs-cd-text-${slot}`);
      if (!btn) return;
      if (isCharge) {
        const pct = Math.max(0, Math.min(100, Math.floor(chargePct)));
        const ready = pct >= 100;
        btn.classList.toggle('is-ready', ready);
        btn.classList.toggle('is-charging', !ready);
        btn.classList.remove('is-on-cd');
        if (sweep?.style) sweep.style.setProperty('--cd-deg', `${Math.round((1 - pct / 100) * 360)}deg`);
        if (txt) txt.textContent = ready ? 'MAX' : `${pct}%`;
      } else {
        const onCd = cd > 0.05;
        btn.classList.toggle('is-on-cd', onCd);
        btn.classList.toggle('is-ready', !onCd);
        const frac = onCd && maxCd > 0 ? Math.min(1, cd / maxCd) : 0;
        if (sweep?.style) sweep.style.setProperty('--cd-deg', `${Math.round(frac * 360)}deg`);
        if (txt) txt.textContent = onCd ? `${cd.toFixed(1)}` : '';
      }
    };

    syncOrb('attack', 0, 1, false);
    syncOrb('skill', player.skillCooldown || 0, player.skillMaxCooldown || 5.0, false);
    syncOrb('dodge', player.dodgeCooldown || 0, player.dodgeMaxCooldown || 3.4, false);
    syncOrb('jump', player._vsManualJumpCd || 0, 0.85, false);
    syncOrb('guard', player._vsManualGuardCd || 0, 1.05, false);
    syncOrb('overdrive', 0, 1, true, ((player.mana || 0) / Math.max(1, player.maxMana || 100)) * 100);
    syncOrb(
      'ultimate',
      0,
      1,
      true,
      player.hasTrueUltimate
        ? ((player.finisherGauge || 0) / Math.max(1, player.maxFinisherGauge || 100)) * 100
        : 0
    );

    if (this.vsBtnTag && this.gameMode === '2v2_tag') {
      const reserve = this.getReserveFighter?.(1);
      const tagCd = this.team1TagCd || 0;
      const disabled = !reserve || reserve.isDead || tagCd > 0.05;
      this.vsBtnTag.classList.toggle('is-on-cd', disabled);
      if (this.vsTagBtnLabel) {
        this.vsTagBtnLabel.textContent =
          !reserve || reserve.isDead ? 'KO' : tagCd > 0.05 ? `${Math.ceil(tagCd)}S` : 'TAG';
      }
    }
  }

  triggerVsManualAction(actionName) {
    if (!this.isVsManualP1Active() || this.isLandingOpen || this.isPaused || this.isMatchOver) return false;
    if (this.roundIntroTimer > 0) return false;
    const inp = this._ensureVsManualState();
    if (!inp.keyHintDismissed) {
      this.dismissVsKeyHintBar(false);
    }
    const player = this.getPointFighter?.(1);
    if (
      actionName === 'attack' &&
      player &&
      !player.isDead &&
      player.state === 'AUTO_ATTACK' &&
      typeof player.queueNextComboBeat === 'function'
    ) {
      player.queueNextComboBeat();
    }
    inp.queuedAction = actionName;
    inp.queuedTimer = actionName === 'attack' ? 0.34 : 0.28;
    return true;
  }

  updateVsManualP1(dt) {
    if (!this.isVsManualP1Active() || this.isMatchOver) return;
    const inp = this._ensureVsManualState();
    const player = this.getPointFighter?.(1);
    if (!player || player.isDead || player.isBenched) return;
    this.syncVsManualControlFlags();

    if (inp.queuedTimer > 0) {
      inp.queuedTimer = Math.max(0, inp.queuedTimer - dt);
      if (inp.queuedTimer <= 0) {
        inp.queuedAction = null;
      }
    }

    const enemy = this.getTargetFor(player);
    let axisX = 0;
    if (this.vsInput.joyActive) {
      const absJx = Math.abs(this.vsInput.joyX);
      if (absJx > 0.06) {
        const u = Math.min(1, (absJx - 0.06) / 0.72);
        axisX = Math.sign(this.vsInput.joyX) * Math.pow(u, 0.72);
      }
    } else {
      axisX = (this.vsInput.heldRight ? 1 : 0) - (this.vsInput.heldLeft ? 1 : 0);
    }
    player.manualMoveAxis = axisX;

    // Hold-to-combo support (keyboard J/Z or Attack touch orb)
    const holdingAtk = Boolean(this.vsInput.heldAttack || this.vsInput.uiHeldAttack);
    if (holdingAtk) {
      if (player.state === 'AUTO_ATTACK' && typeof player.queueNextComboBeat === 'function') {
        if ((player._activeComboStage ?? 0) < 3) {
          player.queueNextComboBeat();
        }
      } else if (!this.vsInput.queuedAction) {
        this.vsInput.queuedAction = 'attack';
        this.vsInput.queuedTimer = 0.26;
      }
    }

    const hasExBeatQueue = typeof player.queueNextComboBeat === 'function';
    const act = this.vsInput.queuedAction;

    // Immediate EX 4-beat combo queuing inside AUTO_ATTACK without cutting swing frames short
    if (
      act === 'attack' &&
      player.state === 'AUTO_ATTACK' &&
      hasExBeatQueue &&
      (player._activeComboStage ?? 0) < 3
    ) {
      player.queueNextComboBeat();
      this.vsInput.queuedAction = null;
      this.vsInput.queuedTimer = 0;
    }

    const inNeutral = player.state === 'IDLE' || player.state === 'WALK';
    const isInstantDodgeCancel =
      player.state === 'AUTO_ATTACK' &&
      act === 'dodge' &&
      (player.dodgeCooldown || 0) <= 0;
    const isAttackRecoveryCancel =
      player.state === 'AUTO_ATTACK' &&
      player.didActionFrame &&
      act &&
      (act !== 'attack' ||
        (!hasExBeatQueue &&
          (player.autoCooldown || 0) <= 0 &&
          player.stateTimer >= Math.min(0.32, (player.autoDuration || 0.46) * 0.66)));
    const isGuardCancelUlt =
      player.state === 'CROUCH' &&
      (act === 'overdrive' || act === 'ultimate' || act === 'dodge');

    const canAct =
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      (inNeutral || isInstantDodgeCancel || isAttackRecoveryCancel || isGuardCancelUlt);

    const faceEnemyForAction = () => {
      if (enemy && !enemy.isDead && Math.abs(enemy.x - player.x) > 8) {
        player.facing = enemy.x >= player.x ? 1 : -1;
      } else if (Math.abs(axisX) > 0.14) {
        player.facing = axisX > 0 ? 1 : -1;
      }
    };

    if (canAct && this.vsInput.queuedAction) {
      const cmd = this.vsInput.queuedAction;
      if (cmd === 'tag') {
        this.vsInput.queuedAction = null;
        this.vsInput.queuedTimer = 0;
        if (this.gameMode === '2v2_tag') {
          const swapped = this.triggerTeamTagSwap(1, false);
          if (!swapped && (this.team1TagCd || 0) > 0.1 && this.vfx) {
            this.vfx.spawnDamageText(
              player.x,
              player.y - 190,
              0,
              false,
              `TAG CD ${this.team1TagCd.toFixed(1)}S`,
              '#94a3b8'
            );
          }
        }
      } else if (
        cmd === 'ultimate' &&
        player.hasTrueUltimate &&
        (player.finisherGauge || 0) >= (player.maxFinisherGauge || 100) - 0.1 &&
        typeof player.updateTrueUltimate === 'function'
      ) {
        this.vsInput.queuedAction = null;
        this.vsInput.queuedTimer = 0;
        faceEnemyForAction();
        player.finisherGauge = 0;
        if (player.stats) player.stats.ultsUsed++;
        player.setState('TRUE_ULTIMATE');
        if (typeof this.triggerTrueUltimateCinematic === 'function') {
          this.triggerTrueUltimateCinematic(player);
        } else {
          this.triggerUltimateCinematic(player);
        }
      } else if (cmd === 'overdrive' && (player.mana || 0) >= (player.maxMana || 100) - 0.1) {
        this.vsInput.queuedAction = null;
        this.vsInput.queuedTimer = 0;
        faceEnemyForAction();
        player.mana = 0;
        if (player.hasTrueUltimate) {
          // Match AI's 3-Overdrive Supreme Ultimate seal cadence (`0/3 -> 1/3 -> 2/3 -> 3/3 OD`)
          // even when a skilled 1P builds Overdrive quickly via combos/parries.
          player.gainFinisher(25.5);
        }
        if (player.stats) player.stats.ultsUsed++;
        player.setState('ULTIMATE');
        this.triggerUltimateCinematic(player);
      } else if (cmd === 'skill' && (player.skillCooldown || 0) <= 0) {
        this.vsInput.queuedAction = null;
        this.vsInput.queuedTimer = 0;
        faceEnemyForAction();
        player.skillCooldown = player.skillMaxCooldown || 5.0;
        if (player.stats) player.stats.skillsUsed++;
        player.setState('SKILL');
      } else if (cmd === 'dodge') {
        const wantsForwardDash =
          axisX * (player.facing || 1) > 0.25 &&
          (player.dashCooldown || 0) <= 0 &&
          typeof player.startDash === 'function' &&
          inNeutral;
        if (wantsForwardDash) {
          this.vsInput.queuedAction = null;
          this.vsInput.queuedTimer = 0;
          faceEnemyForAction();
          player.startDash(enemy, this);
        } else if ((player.dodgeCooldown || 0) <= 0 && typeof player.startDodge === 'function') {
          this.vsInput.queuedAction = null;
          this.vsInput.queuedTimer = 0;
          player.startDodge(enemy, this);
        }
      } else if (cmd === 'jump' && (player._vsManualJumpCd || 0) <= 0 && typeof player.startJump === 'function') {
        this.vsInput.queuedAction = null;
        this.vsInput.queuedTimer = 0;
        const jumpDir = Math.abs(axisX) > 0.15 ? Math.sign(axisX) : player.facing || 1;
        const prevDodgeCd = player.dodgeCooldown;
        player.startJump(enemy, this, jumpDir);
        player._vsManualJumpCd = 0.85;
        if (Number.isFinite(prevDodgeCd)) {
          player.dodgeCooldown = prevDodgeCd;
        }
      } else if (cmd === 'guard' && (player._vsManualGuardCd || 0) <= 0 && typeof player.startCrouch === 'function') {
        this.vsInput.queuedAction = null;
        this.vsInput.queuedTimer = 0;
        faceEnemyForAction();
        player.startCrouch(enemy, this);
        player._perfectParryWindow = 0.26;
        player._vsManualGuardCd = 1.05;
      } else if (cmd === 'attack' && ((player.autoCooldown || 0) <= 0 || hasExBeatQueue)) {
        this.vsInput.queuedAction = null;
        this.vsInput.queuedTimer = 0;
        faceEnemyForAction();
        player.setState('AUTO_ATTACK');
        if (hasExBeatQueue) {
          player.autoCooldown = 0.08;
        } else {
          player.autoCooldown = Math.min(player.autoInterval || 0.55, 0.34);
        }
      }
    }

    // Crisp 2D fighting-game neutral walk (auto-faces opponent in IDLE/WALK for authentic footsies!)
    if (
      !player.isDead &&
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      (player.state === 'IDLE' || player.state === 'WALK')
    ) {
      if (enemy && !enemy.isDead && Math.abs(enemy.x - player.x) > 16) {
        player.facing = enemy.x >= player.x ? 1 : -1;
      }
      if (Math.abs(axisX) > 0.08) {
        const ww = this.renderer?.worldWidth || 1200;
        const walkSpd = Math.max(210, (player.moveSpeed || 165) * 1.24);
        player.x = Math.max(72, Math.min(ww - 72, player.x + axisX * walkSpd * dt));
        player._manualWalkActive = true;
        player._manualSpeedRatio = Math.max(0.36, Math.min(1.2, Math.abs(axisX)));
        player.moveDir = axisX * (player.facing || 1) >= 0 ? 1 : -1;
        player.state = 'WALK';
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
        player.moveDir = 0;
        player.state = 'IDLE';
      }
    } else {
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
    }
  }

  onFighterHitCombo(attacker, victim, dealt, _isCrit = false) {
    if ((this.isSideScrollMode?.() ?? this.isAdventureMode?.()) || !attacker || !victim || dealt <= 0) return;
    const side = attacker.team === 2 ? 'right' : 'left';
    const otherSide = side === 'left' ? 'right' : 'left';
    const atkSlot = this.vsComboState?.[side];
    const vicSlot = this.vsComboState?.[otherSide];
    if (vicSlot && vicSlot.hits > 0) {
      vicSlot.hits = 0;
      vicSlot.damage = 0;
      vicSlot.timer = 0;
    }
    if (!atkSlot) return;
    atkSlot.hits = (atkSlot.hits || 0) + 1;
    atkSlot.damage = (atkSlot.damage || 0) + Math.round(dealt);
    atkSlot.timer = 1.75;
    if (attacker.stats) {
      attacker.stats.maxCombo = Math.max(attacker.stats.maxCombo || 0, atkSlot.hits);
    }
    if (this.isP1TrainingMode?.() && attacker.team === 1 && this.trainingLab) {
      this.trainingLab.currentCombo = atkSlot.hits;
      this.trainingLab.comboDamage = atkSlot.damage;
      this.trainingLab.lastHit = Math.round(dealt);
      this.trainingLab.maxCombo = Math.max(this.trainingLab.maxCombo || 0, atkSlot.hits);
      this.trainingLab.comboDisplayTimer = 2.4;
      this.syncTrainingLabTelemetryUI?.();
    }
  }

  // =========================================================================
  // PLAYER VS AI SUB-MODES (EXHIBITION / 5-STAGE ARCADE LADDER / TRAINING LAB)
  // =========================================================================
  isP1ArcadeMode() {
    return Boolean(this.isVsManualP1Active() && this.p1SubMode === 'arcade');
  }

  isArcadeLadderActive() {
    return Boolean(
      this.isP1ArcadeMode() &&
        this.arcadeRun &&
        Array.isArray(this.arcadeRun.stages) &&
        this.arcadeRun.stages.length === 5
    );
  }

  getCurrentArcadeStage() {
    if (!this.isArcadeLadderActive()) return null;
    const idx = Math.max(0, Math.min(4, this.arcadeRun.currentStageIndex || 0));
    return this.arcadeRun.stages[idx] || null;
  }

  isP1TrainingMode() {
    return Boolean(this.isVsManualP1Active() && this.p1SubMode === 'training');
  }

  isTrainingAutoHealActive() {
    return Boolean(
      this.isP1TrainingMode() &&
        !this.isLandingOpen &&
        (this.trainingLab?.hpMode || 'auto_heal') === 'auto_heal'
    );
  }

  setP1SubMode(subMode, playSound = true) {
    const valid = subMode === 'arcade' || subMode === 'training' ? subMode : 'exhibition';
    this.p1SubMode = valid;
    if (valid !== 'arcade') {
      this.arcadeRun = null;
    }
    if (valid === 'arcade' || valid === 'training') {
      this.gameMode = '1v1';
      this.inspectLeftRole = 'lead';
      this.inspectRightRole = 'lead';
      if (valid === 'arcade' || this.activeAssignSlot > 2) {
        this.activeAssignSlot = 1;
      }
    }
    this.syncP1SubModeUI();
    this.syncRosterSelectionUI(false);
    this.syncVsControlUI();
    this.syncPauseMenuUI();
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
    return this.p1SubMode;
  }

  syncP1SubModeUI() {
    const isAdv = Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.());
    const is1P = this.vsControlMode === '1p' && !isAdv;
    const sub = is1P ? this.p1SubMode || 'exhibition' : 'exhibition';
    const isArcade = is1P && sub === 'arcade';
    const isTraining = is1P && sub === 'training';

    if (this.landingOverlay) {
      this.landingOverlay.setAttribute('data-vs-control', is1P ? '1p' : 'ai');
      this.landingOverlay.setAttribute('data-p1-submode', sub);
    }
    this.p1SubmodeGroup?.classList?.toggle('hidden', !is1P);
    this.p1SubmodeSep?.classList?.toggle('hidden', !is1P);
    if (Array.isArray(this.p1SubmodeBtns)) {
      for (const btn of this.p1SubmodeBtns) {
        const key = btn.getAttribute('data-p1-submode') || 'exhibition';
        const active = is1P && key === sub;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      }
    }
    this.p1ArcadeSummaryChip?.classList?.toggle('hidden', !isArcade);

    const hideFormatMode = Boolean(isArcade || isTraining);
    const hideStageStrip = Boolean(isArcade);
    const hideRulesGroup = Boolean(isArcade || isTraining);
    this.quickModeGroupEl?.classList?.toggle('hidden', hideFormatMode);
    this.quickModeSepEl?.classList?.toggle('hidden', hideFormatMode);
    this.quickStageStripEl?.classList?.toggle('hidden', hideStageStrip);
    this.quickStageSepEl?.classList?.toggle('hidden', hideStageStrip || hideFormatMode);
    this.quickRulesGroupEl?.classList?.toggle('hidden', hideRulesGroup);
    this.quickRulesSepEl?.classList?.toggle('hidden', hideRulesGroup);
  }

  syncArcadeTrophyPipsUI() {
    if (!this.cards || typeof document === 'undefined') return;
    const showTrophies = Boolean(
      this.vsControlMode === '1p' && !(this.isSideScrollMode?.() ?? this.isAdventureMode?.())
    );
    const trophies = showTrophies ? loadArcadeTrophies() : {};
    Object.entries(this.cards).forEach(([heroKey, cardEl]) => {
      if (!cardEl) return;
      const btn = cardEl.querySelector?.('.champ-tile-btn') || cardEl;
      let pip = cardEl.querySelector?.('.p1-arcade-trophy-pip') || null;
      const rec = showTrophies ? trophies[heroKey] : null;
      if (!showTrophies || !rec) {
        if (pip) {
          pip.classList.add('hidden');
          pip.removeAttribute('data-trophy-rank');
        }
        return;
      }
      if (!pip && typeof document.createElement === 'function') {
        pip = document.createElement('span');
        pip.className = 'p1-arcade-trophy-pip';
        btn.appendChild(pip);
      }
      if (!pip) return;
      const rank = normalizeArcadeRank(rec.rank);
      pip.setAttribute('data-trophy-rank', rank);
      pip.innerHTML = `<svg width="8" height="7" viewBox="0 0 8 7" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="1" width="1" height="4" fill="#fef08a"/><rect x="3" y="0" width="2" height="5" fill="#fef08a"/><rect x="7" y="1" width="1" height="4" fill="#fef08a"/><rect x="1" y="3" width="6" height="2" fill="#facc15"/><rect x="0" y="5" width="8" height="2" fill="#d97706"/></svg><span>${rank}</span>`;
      const clearLabel = rec.clears === 1 ? '1 CLEAR' : `${rec.clears} CLEARS`;
      pip.title = `Arcade 5 Trophy: RANK ${rank} (${clearLabel})`;
      pip.classList.remove('hidden');
    });
  }

  startArcadeRun(playerHeroId = this.slot1Hero) {
    this.gameMode = '1v1';
    this.vsControlMode = '1p';
    this.p1SubMode = 'arcade';
    this.arcadeRun = buildArcadeLadder(playerHeroId);
    this.slot1Hero = this.arcadeRun.playerHeroId;
    this.slot2Hero = this.arcadeRun.stages[0].heroId;
    return this.arcadeRun;
  }

  advanceArcadeStage() {
    if (!this.isArcadeLadderActive()) return false;
    clearTimeout(this.autoNextTimeout);
    this.autoNextTimeout = null;
    this._clearAutoNextTimers?.();
    this.audio?.stopAllHeroVoices?.(0.03);
    if (this.arcadeRun.currentStageIndex >= 4) return false;
    this.arcadeRun.currentStageIndex += 1;
    const nextStage = this.getCurrentArcadeStage();
    if (!nextStage) return false;
    this.slot2Hero = nextStage.heroId;
    this.resetMatch();
    this.beginLiveRoundIntro?.({ preferChallenger: true });
    return true;
  }

  retryArcadeStage() {
    if (!this.isArcadeLadderActive()) return false;
    clearTimeout(this.autoNextTimeout);
    this.autoNextTimeout = null;
    this._clearAutoNextTimers?.();
    this.audio?.stopAllHeroVoices?.(0.03);
    this.arcadeRun.continuesUsed = (this.arcadeRun.continuesUsed || 0) + 1;
    this.resetMatch();
    this.beginLiveRoundIntro?.();
    return true;
  }

  renderVictoryArcadeStrip(isPlayerWin) {
    if (!this.victoryArcadeStrip || !this.victoryArcadeNodes) return;
    if (!this.isArcadeLadderActive()) {
      this.victoryArcadeStrip.classList.add('hidden');
      if (this.victoryArcadeRankBadge) this.victoryArcadeRankBadge.classList.add('hidden');
      return;
    }
    this.victoryArcadeStrip.classList.remove('hidden');
    const run = this.arcadeRun;
    const curIdx = run.currentStageIndex || 0;
    const nextIdx = isPlayerWin && curIdx < 4 ? curIdx + 1 : -1;

    if (this.victoryArcadeRankBadge) {
      if (run.cleared && run.bestRank) {
        this.victoryArcadeRankBadge.textContent = `ARCADE CHAMPION • RANK ${run.bestRank}`;
        this.victoryArcadeRankBadge.classList.remove('hidden');
      } else {
        this.victoryArcadeRankBadge.classList.add('hidden');
      }
    }

    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    this.victoryArcadeNodes.innerHTML = '';
    const assets = PixelForge.initAssets();

    run.stages.forEach((stg, idx) => {
      const node = document.createElement('div');
      node.className = 'arcade-node';
      if (stg.isFinalRival) node.classList.add('is-final-rival');
      if (stg.defeated && idx !== curIdx) node.classList.add('is-defeated');
      if (idx === curIdx) {
        node.classList.add(isPlayerWin ? 'is-current-win' : 'is-current-loss');
      } else if (idx === nextIdx) {
        node.classList.add('is-next');
      }

      const portWrap = document.createElement('div');
      portWrap.className = 'arcade-node-port-wrap';
      const cvs = document.createElement('canvas');
      cvs.className = 'arcade-node-port';
      cvs.width = 32;
      cvs.height = 32;
      const pctx = cvs.getContext?.('2d');
      const port = PixelForge.ensureImage?.(assets[stg.heroId]?.portrait) || assets[stg.heroId]?.portrait;
      if (pctx) {
        pctx.imageSmoothingEnabled = false;
        if (port && port.complete && port.naturalWidth > 0) {
          pctx.drawImage(port, 0, 0, 32, 32);
        } else if (port && typeof port.addEventListener === 'function') {
          port.addEventListener(
            'load',
            () => {
              pctx.imageSmoothingEnabled = false;
              pctx.clearRect(0, 0, 32, 32);
              pctx.drawImage(port, 0, 0, 32, 32);
            },
            { once: true }
          );
        }
      }
      portWrap.appendChild(cvs);

      let statusTxt = '';
      if (idx === curIdx) {
        statusTxt = isPlayerWin ? 'WIN' : 'KO';
      } else if (stg.defeated) {
        statusTxt = 'CLR';
      } else if (idx === nextIdx) {
        statusTxt = 'NEXT';
      }
      if (statusTxt) {
        const stEl = document.createElement('span');
        stEl.className = 'arcade-node-status';
        stEl.textContent = statusTxt;
        portWrap.appendChild(stEl);
      }

      const tag = document.createElement('span');
      tag.className = 'arcade-node-tag';
      tag.textContent = stg.isFinalRival ? 'FINAL' : `STG ${stg.stageNumber}`;

      node.appendChild(portWrap);
      node.appendChild(tag);
      this.victoryArcadeNodes.appendChild(node);
    });
  }

  _ensureTrainingLabState() {
    if (!this.trainingLab) {
      this.trainingLab = {
        dummyMode: 'idle',
        gaugeMode: 'instant',
        hpMode: 'auto_heal',
        collapsed: false,
        idleGaugeTimer: 0,
        currentCombo: 0,
        comboDamage: 0,
        lastHit: 0,
        maxCombo: 0,
        comboDisplayTimer: 0
      };
    }
    return this.trainingLab;
  }

  setTrainingDummyMode(mode, playSound = false) {
    const lab = this._ensureTrainingLabState();
    const valid = mode === 'auto_guard' || mode === 'fight' ? mode : 'idle';
    lab.dummyMode = valid;
    const dummy = this.getPointFighter?.(2) || this.rightFighter;
    if (dummy && !dummy.isDead && this.isP1TrainingMode()) {
      dummy.trainingDummyMode = valid;
      if (valid !== 'fight') {
        dummy.isCrouching = false;
        dummy.isDeflecting = false;
        dummy._trainingGuardHold = 0;
        if (dummy.state !== 'IDLE' && dummy.state !== 'HURT') {
          dummy.vx = 0;
          dummy.vy = 0;
          if (Number.isFinite(dummy.groundY)) dummy.y = dummy.groundY;
          dummy.setState('IDLE');
        }
      }
    }
    this.syncTrainingLabUI();
    if (playSound && this.audio) this.audio.play('clock_gear', 600);
    return lab.dummyMode;
  }

  cycleTrainingDummyMode(playSound = true) {
    const cur = this._ensureTrainingLabState().dummyMode;
    const next = cur === 'idle' ? 'auto_guard' : cur === 'auto_guard' ? 'fight' : 'idle';
    return this.setTrainingDummyMode(next, playSound);
  }

  setTrainingGaugeMode(mode, playSound = false) {
    const lab = this._ensureTrainingLabState();
    lab.gaugeMode = mode === 'normal' ? 'normal' : 'instant';
    lab.idleGaugeTimer = 0;
    if (lab.gaugeMode === 'instant' && this.isP1TrainingMode()) {
      const p1 = this.getPointFighter?.(1) || this.leftFighter;
      if (p1 && !p1.isDead) {
        p1.mana = p1.maxMana;
        if (p1.hasTrueUltimate) p1.finisherGauge = p1.maxFinisherGauge;
        p1.skillCooldown = 0;
      }
    }
    this.syncTrainingLabUI();
    if (this.fighters && this.hudEls) this.updateHUD();
    if (playSound && this.audio) this.audio.play('reflect', 600);
    return lab.gaugeMode;
  }

  toggleTrainingGaugeMode(playSound = true) {
    const cur = this._ensureTrainingLabState().gaugeMode;
    return this.setTrainingGaugeMode(cur === 'instant' ? 'normal' : 'instant', playSound);
  }

  setTrainingHpMode(mode, playSound = false) {
    const lab = this._ensureTrainingLabState();
    lab.hpMode = mode === 'mortal' ? 'mortal' : 'auto_heal';
    if (lab.hpMode === 'auto_heal' && this.isP1TrainingMode() && Array.isArray(this.fighters)) {
      for (const f of this.fighters) {
        if (f && !f.isDead && !f.isMonster) {
          f.hp = f.maxHp;
          f.isBerserk = false;
        }
      }
    }
    this.syncTrainingLabUI();
    if (this.fighters && this.hudEls) this.updateHUD();
    if (playSound && this.audio) this.audio.play('clock_gear', 600);
    return lab.hpMode;
  }

  toggleTrainingHpMode(playSound = true) {
    const cur = this._ensureTrainingLabState().hpMode;
    return this.setTrainingHpMode(cur === 'auto_heal' ? 'mortal' : 'auto_heal', playSound);
  }

  setTrainingLabCollapsed(collapsed, playSound = false) {
    const lab = this._ensureTrainingLabState();
    lab.collapsed = Boolean(collapsed);
    this.syncTrainingLabUI();
    if (playSound && this.audio) this.audio.play('clock_gear', 600);
    return lab.collapsed;
  }

  resetTrainingLabPositions(playSound = true) {
    if (!this.isP1TrainingMode()) return false;
    const lab = this._ensureTrainingLabState();
    const gy = this.renderer?.groundY || 520;
    const p1 = this.getPointFighter?.(1) || this.leftFighter;
    const p2 = this.getPointFighter?.(2) || this.rightFighter;

    const resetEntity = (f, targetX, facingDir, isDummy) => {
      if (!f) return;
      f.isDead = false;
      f.deathTimer = 0;
      f.x = targetX;
      f.y = gy;
      f.groundY = gy;
      f.vx = 0;
      f.vy = 0;
      f.facing = facingDir;
      f.hp = f.maxHp;
      f.stunTimer = 0;
      f.hurtTimer = 0;
      f.hitFlash = 0;
      f.isRooted = false;
      f.buildRootTimer = 0;
      f.chronoTimeStopTimer = 0;
      f.forgeArmorTimer = 0;
      f.isBerserk = false;
      f.buildShieldHp = 0;
      f.buildShieldTimer = 0;
      f.isCrouching = false;
      f.isDeflecting = false;
      f.isInvulnerable = false;
      f.unstoppablePoise = false;
      f.isFullyBurrowed = false;
      f._trainingGuardHold = 0;
      f.comboStep = 0;
      f._activeComboStage = 0;
      f._queuedNextBeat = false;
      f.skillCooldown = 0;
      f.dodgeCooldown = 0;
      f.dashCooldown = 0;
      f.autoCooldown = 0;
      f.crouchCooldown = 0;
      f.jumpCooldown = 0;
      f._vsManualJumpCd = 0;
      f._vsManualGuardCd = 0;
      f.timeSinceLastHit = 0;
      f.setState('IDLE');
      if (isDummy) {
        f.trainingDummyMode = lab.dummyMode;
        f.mana = 0;
        if (f.hasTrueUltimate) f.finisherGauge = 0;
      } else {
        f.trainingDummyMode = null;
        if (lab.gaugeMode === 'instant') {
          f.mana = f.maxMana;
          if (f.hasTrueUltimate) f.finisherGauge = f.maxFinisherGauge;
        }
      }
    };

    resetEntity(p1, 460, 1, false);
    resetEntity(p2, 740, -1, true);
    this.vfx?.clear?.();
    this.clearVsManualInputs?.();
    if (this.vsComboState) {
      this.vsComboState.left.hits = 0;
      this.vsComboState.left.damage = 0;
      this.vsComboState.left.timer = 0;
      this.vsComboState.right.hits = 0;
      this.vsComboState.right.damage = 0;
      this.vsComboState.right.timer = 0;
    }
    lab.currentCombo = 0;
    lab.comboDamage = 0;
    lab.comboDisplayTimer = 0;
    lab.idleGaugeTimer = 0;
    this.ultSlowTimer = 0;
    this.koSlowTimer = 0;
    this.isMatchOver = false;
    this.victoryRevealPending = false;
    this.victoryOverlay?.classList?.add('hidden');
    if (this.renderer) {
      this.renderer.hitStopTimer = 0;
      this.renderer.camX = 600;
      this.renderer.clearEndMatchSpotlight?.();
      this.renderer.deathFX?.clear?.();
    }
    this.syncVsManualControlFlags();
    this.syncTrainingLabUI();
    if (this.fighters && this.hudEls) this.updateHUD();
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
    return true;
  }

  updateTrainingLab(dt) {
    if (!this.isP1TrainingMode() || this.isMatchOver) return;
    const lab = this._ensureTrainingLabState();
    const p1 = this.getPointFighter?.(1) || this.leftFighter;
    const p2 = this.getPointFighter?.(2) || this.rightFighter;

    if (p2 && !p2.isDead) {
      p2.trainingDummyMode = lab.dummyMode;
    }

    // Instant Full Gauges: auto-refill Overdrive & Supreme Ult after 1.5s idle
    if (lab.gaugeMode === 'instant' && p1 && !p1.isDead) {
      const isNeutral = p1.state === 'IDLE' || p1.state === 'WALK';
      if (isNeutral) {
        lab.idleGaugeTimer = (lab.idleGaugeTimer || 0) + dt;
        if (lab.idleGaugeTimer >= 1.5) {
          if (p1.mana < p1.maxMana) p1.mana = p1.maxMana;
          if (p1.hasTrueUltimate && p1.finisherGauge < p1.maxFinisherGauge) {
            p1.finisherGauge = p1.maxFinisherGauge;
          }
          if ((p1.skillCooldown || 0) > 0) p1.skillCooldown = 0;
        }
      } else {
        lab.idleGaugeTimer = 0;
      }
    } else {
      lab.idleGaugeTimer = 0;
    }

    // Decay live combo display cleanly after combo drops
    if ((this.vsComboState?.left?.hits || 0) <= 0 && lab.comboDisplayTimer > 0) {
      lab.comboDisplayTimer = Math.max(0, lab.comboDisplayTimer - dt);
      if (lab.comboDisplayTimer <= 0) {
        lab.currentCombo = 0;
        lab.comboDamage = 0;
      }
    }
  }

  syncTrainingLabTelemetryUI() {
    if (!this.isP1TrainingMode()) return;
    const lab = this._ensureTrainingLabState();
    const p1 = this.getPointFighter?.(1) || this.leftFighter;
    const parries = (p1?.stats?.parries || 0) + (p1?.stats?.clashes || 0);
    const dodges = p1?.stats?.dodges || 0;
    const activeHits = this.vsComboState?.left?.hits || 0;
    const displayHits = activeHits > 0 ? activeHits : lab.comboDisplayTimer > 0 ? lab.currentCombo || 0 : 0;
    const displayDmg = activeHits > 0 ? this.vsComboState.left.damage || 0 : lab.comboDisplayTimer > 0 ? lab.comboDamage || 0 : 0;

    if (this.labTelComboEl) this.labTelComboEl.textContent = String(displayHits);
    if (this.labTelComboBadgeEl) {
      this.labTelComboBadgeEl.classList.toggle('is-hot', displayHits >= 2);
    }
    if (this.labTelComboDmgEl) this.labTelComboDmgEl.textContent = String(displayDmg);
    if (this.labTelLastHitEl) this.labTelLastHitEl.textContent = String(lab.lastHit || 0);
    if (this.labTelMaxComboEl) {
      const bestMax = Math.max(lab.maxCombo || 0, p1?.stats?.maxCombo || 0);
      lab.maxCombo = bestMax;
      this.labTelMaxComboEl.textContent = String(bestMax);
    }
    if (this.labTelDefEl) this.labTelDefEl.textContent = `${parries} / ${dodges}`;
  }

  syncTrainingLabUI() {
    const lab = this._ensureTrainingLabState();
    const active = Boolean(
      this.isP1TrainingMode?.() &&
        !this.isLandingOpen &&
        !(this.isSideScrollMode?.() ?? this.isAdventureMode?.())
    );
    if (this.appEl) {
      this.appEl.classList.toggle('is-training-lab-active', active);
    }
    if (this.trainingLabBarEl) {
      this.trainingLabBarEl.classList.toggle('hidden', !active || this.isMatchOver);
      this.trainingLabBarEl.classList.toggle('is-collapsed', Boolean(lab.collapsed));
    }
    if (this.btnLabCollapse) {
      this.btnLabCollapse.setAttribute('aria-expanded', String(!lab.collapsed));
    }
    if (this.labCollapseLabel) {
      this.labCollapseLabel.textContent = lab.collapsed ? 'LAB +' : 'LAB -';
    }
    if (this.trainingLabTelemetryEl) {
      this.trainingLabTelemetryEl.classList.toggle('hidden', !active || this.isMatchOver);
    }
    const dummyLabelMap = {
      idle: 'DUMMY: IDLE',
      auto_guard: 'DUMMY: GUARD',
      fight: 'DUMMY: FIGHT'
    };
    if (this.btnLabDummy) {
      this.btnLabDummy.setAttribute('data-dummy-mode', lab.dummyMode);
    }
    if (this.labDummyLabel) {
      this.labDummyLabel.textContent = dummyLabelMap[lab.dummyMode] || 'DUMMY: IDLE';
    }
    if (this.btnLabGauge) {
      this.btnLabGauge.setAttribute('data-gauge-mode', lab.gaugeMode);
      this.btnLabGauge.classList.toggle('is-active', lab.gaugeMode === 'instant');
    }
    if (this.labGaugeLabel) {
      this.labGaugeLabel.textContent = lab.gaugeMode === 'instant' ? 'GAUGE: FULL' : 'GAUGE: NORMAL';
    }
    if (this.btnLabHp) {
      this.btnLabHp.setAttribute('data-hp-mode', lab.hpMode);
      this.btnLabHp.classList.toggle('is-active', lab.hpMode === 'auto_heal');
    }
    if (this.labHpLabel) {
      this.labHpLabel.textContent = lab.hpMode === 'auto_heal' ? 'HP: AUTO-HEAL' : 'HP: MORTAL';
    }
    if (Array.isArray(this.pauseLabDummyBtns)) {
      for (const b of this.pauseLabDummyBtns) {
        b.classList.toggle('is-active', b.getAttribute('data-pause-lab-dummy') === lab.dummyMode);
      }
    }
    if (Array.isArray(this.pauseLabGaugeBtns)) {
      for (const b of this.pauseLabGaugeBtns) {
        b.classList.toggle('is-active', b.getAttribute('data-pause-lab-gauge') === lab.gaugeMode);
      }
    }
    if (Array.isArray(this.pauseLabHpBtns)) {
      for (const b of this.pauseLabHpBtns) {
        b.classList.toggle('is-active', b.getAttribute('data-pause-lab-hp') === lab.hpMode);
      }
    }
    if (active) {
      this.syncTrainingLabTelemetryUI();
    }
  }

  swapSides(playSound = true) {
    if (this.isSideScrollMode()) return;
    clearTimeout(this.autoNextTimeout);
    this.autoNextTimeout = null;
    this._clearAutoNextTimers?.();
    this.audio?.stopAllHeroVoices?.(0.03);
    const prevS1 = this.slot1Hero;
    const prevS1b = this.slot1PartnerHero;
    this.slot1Hero = this.slot2Hero;
    this.slot2Hero = prevS1;
    this.slot1PartnerHero = this.slot2PartnerHero;
    this.slot2PartnerHero = prevS1b;
    this.syncRosterSelectionUI(false);
    this.resetMatch();
    this.beginLiveRoundIntro?.();
    if (playSound && this.audio) {
      this.audio.play('reflect', 600);
    }
  }

  bindUI() {
    this.btnGamePause = document.getElementById('btn-game-pause');
    this.pauseSpBadge = document.getElementById('pause-sp-badge');
    this.pauseModal = document.getElementById('pause-modal');
    this.btnPauseResume = document.getElementById('btn-pause-resume');
    this.btnPauseTitle = document.getElementById('btn-pause-title');
    this.btnPauseFullZoom = document.getElementById('btn-pause-full-zoom');
    this.pauseFullZoomLabel = document.getElementById('pause-full-zoom-label');
    this.btnPauseCrt = document.getElementById('btn-pause-crt');
    this.pauseCrtLabel = document.getElementById('pause-crt-label');
    this.navCrtBtns = [
      document.getElementById('btn-nav-crt-off'),
      document.getElementById('btn-nav-crt-subtle'),
      document.getElementById('btn-nav-crt-arcade')
    ].filter(Boolean);
    this.pauseVsSection = document.getElementById('pause-vs-section');
    this.pauseAdvSection = document.getElementById('pause-adv-section');
    this.pauseAdvSectionLabel = document.getElementById('pause-adv-section-label');
    this.pauseAdvHint = document.getElementById('pause-adv-hint');
    this.pauseAdvRelics = document.getElementById('pause-adv-relics');
    this.advBtnRestart = document.getElementById('adv-btn-restart');
    this.btnVsPauseLandscape = document.getElementById('btn-vs-pause-landscape');

    this.btnVoice = document.getElementById('btn-voice');
    this.voiceLabel = document.getElementById('voice-label');
    this.inputVoiceVol = document.getElementById('input-voice-vol');
    this.voiceVolVal = document.getElementById('voice-vol-val');
    this.btnVoiceLang = document.getElementById('btn-voice-lang');
    this.btnVoicePace = document.getElementById('btn-voice-pace');
    this.btnBgm = document.getElementById('btn-bgm');
    this.bgmLabel = document.getElementById('bgm-label');
    this.inputBgmVol = document.getElementById('input-bgm-vol');
    this.bgmVolVal = document.getElementById('bgm-vol-val');
    this.btnSfx = document.getElementById('btn-sfx');
    this.sfxLabel = document.getElementById('sfx-label');
    this.inputSfxVol = document.getElementById('input-sfx-vol');
    this.sfxVolVal = document.getElementById('sfx-vol-val');

    this.navAudioWrap = document.getElementById('nav-audio-wrap');
    this.btnNavAudio = document.getElementById('btn-nav-audio');
    this.navAudioPopover = document.getElementById('nav-audio-popover');
    this.btnNavVoice = document.getElementById('btn-nav-voice');
    this.navVoiceLabel = document.getElementById('nav-voice-label');
    this.inputNavVoiceVol = document.getElementById('input-nav-voice-vol');
    this.navVoiceVolVal = document.getElementById('nav-voice-vol-val');
    this.btnNavVoiceLang = document.getElementById('btn-nav-voice-lang');
    this.btnNavVoicePace = document.getElementById('btn-nav-voice-pace');
    this.btnNavBgm = document.getElementById('btn-nav-bgm');
    this.navBgmLabel = document.getElementById('nav-bgm-label');
    this.inputNavBgmVol = document.getElementById('input-nav-bgm-vol');
    this.navBgmVolVal = document.getElementById('nav-bgm-vol-val');
    this.btnNavSfx = document.getElementById('btn-nav-sfx');
    this.navSfxLabel = document.getElementById('nav-sfx-label');
    this.inputNavSfxVol = document.getElementById('input-nav-sfx-vol');
    this.navSfxVolVal = document.getElementById('nav-sfx-vol-val');
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
    this.btnQuickHpMode = document.getElementById('btn-quick-hp-mode');
    this.quickHpModeLabel = document.getElementById('quick-hp-mode-label');
    this.kitDrawerBackdrop = document.getElementById('kit-drawer-backdrop');
    this.p1KitDrawer = document.getElementById('p1-kit-drawer');
    this.p2KitDrawer = document.getElementById('p2-kit-drawer');
    this.versusLayoutEl = document.getElementById('versus-layout');
    this.btnAutoTourney = document.getElementById('btn-auto-tourney');
    this.btnNextChallenger = document.getElementById('btn-next-challenger');
    this.btnSwapSides = document.getElementById('btn-swap-sides');
    this.vsModeOriginChip = document.getElementById('vs-mode-origin-chip');
    this.p1SubmodeGroup = document.getElementById('p1-submode-group');
    this.p1SubmodeSep = document.getElementById('p1-submode-sep');
    this.p1SubmodeBtns = Array.from(document.querySelectorAll('[data-p1-submode]'));
    this.p1ArcadeSummaryChip = document.getElementById('p1-arcade-summary-chip');
    this.quickModeGroupEl = document.getElementById('quick-mode-group');
    this.quickModeSepEl = document.getElementById('quick-mode-sep');
    this.quickStageStripEl = document.getElementById('quick-stage-strip');
    this.quickStageSepEl = document.getElementById('quick-stage-sep');
    this.quickRulesGroupEl = document.getElementById('quick-rules-group');
    this.quickRulesSepEl = document.getElementById('quick-rules-sep');
    this.rightRivalBadge = document.getElementById('right-rival-badge');
    this.hudRightPlate = document.getElementById('hud-right');
    this.victoryArcadeStrip = document.getElementById('victory-arcade-strip');
    this.victoryArcadeRankBadge = document.getElementById('victory-arcade-rank-badge');
    this.victoryArcadeNodes = document.getElementById('victory-arcade-nodes');
    this.trainingLabBarEl = document.getElementById('training-lab-bar');
    this.btnLabCollapse = document.getElementById('btn-lab-collapse');
    this.labCollapseLabel = document.getElementById('lab-collapse-label');
    this.btnLabDummy = document.getElementById('btn-lab-dummy');
    this.labDummyLabel = document.getElementById('lab-dummy-label');
    this.btnLabGauge = document.getElementById('btn-lab-gauge');
    this.labGaugeLabel = document.getElementById('lab-gauge-label');
    this.btnLabHp = document.getElementById('btn-lab-hp');
    this.labHpLabel = document.getElementById('lab-hp-label');
    this.btnLabReset = document.getElementById('btn-lab-reset');
    this.trainingLabTelemetryEl = document.getElementById('training-lab-telemetry');
    this.labTelComboBadgeEl = document.getElementById('lab-tel-combo-badge');
    this.labTelComboEl = document.getElementById('lab-tel-combo');
    this.labTelComboDmgEl = document.getElementById('lab-tel-combo-dmg');
    this.labTelLastHitEl = document.getElementById('lab-tel-last-hit');
    this.labTelMaxComboEl = document.getElementById('lab-tel-max-combo');
    this.labTelDefEl = document.getElementById('lab-tel-def');
    this.pauseTrainingBar = document.getElementById('pause-training-bar');
    this.pauseLabDummyBtns = Array.from(document.querySelectorAll('[data-pause-lab-dummy]'));
    this.pauseLabGaugeBtns = Array.from(document.querySelectorAll('[data-pause-lab-gauge]'));
    this.pauseLabHpBtns = Array.from(document.querySelectorAll('[data-pause-lab-hp]'));
    this.pauseLabResetBtn = document.getElementById('pause-lab-reset');
    this.pauseVsSectionLabel = document.getElementById('pause-vs-section-label');
    this.vsKeyHintBarEl = document.getElementById('vs-keyhint-bar');
    this.vsKeyHintTextEl = document.getElementById('vs-keyhint-text');
    this.vsTouchControlsEl = document.getElementById('vs-touch-controls');
    this.vsBtnTag = document.getElementById('vs-btn-tag');
    this.vsTagBtnLabel = document.getElementById('vs-tag-btn-label');
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
      this.btnPauseFullZoom.addEventListener('click', () => this.cycleCameraZoomMode(true));
    }
    this.syncCameraZoomUI();
    if (this.btnPauseCrt) {
      this.btnPauseCrt.addEventListener('click', () => this.cycleCrtMode(true));
    }
    if (Array.isArray(this.navCrtBtns)) {
      for (const btn of this.navCrtBtns) {
        btn.addEventListener('click', () =>
          this.setCrtMode(btn.dataset?.crtMode || 'off', { persist: true, playSound: true })
        );
      }
    }
    this.syncCrtUI();
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
      if (
        (e.code === 'Space' || e.code === 'Enter') &&
        !e.repeat &&
        this.trySkipEndMatchToOverlay()
      ) {
        e.preventDefault();
        e.stopImmediatePropagation?.();
        return;
      }
      if (
        (e.code === 'Space' || e.code === 'Enter') &&
        !this.isLandingOpen &&
        !this.isPaused &&
        !this.isMatchOver &&
        this.roundIntroTimer > 0 &&
        (this.roundIntroElapsed || 0) >= 0.45
      ) {
        e.preventDefault();
        e.stopImmediatePropagation?.();
        this.skipRoundIntro();
        return;
      }
      if (
        e.code === 'KeyZ' &&
        !e.repeat &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !this.isLandingOpen &&
        !this.isPaused &&
        !this.isMatchOver &&
        !this.isVsManualP1Active() &&
        !this.isEndlessMode() &&
        !(this.victoryOverlay && !this.victoryOverlay.classList.contains('hidden')) &&
        !(this.isAdventureMode() && (this.adventure?.isSkillTreeOpen || this.adventure?.isRelicDraftOpen))
      ) {
        e.preventDefault();
        const nextMode = this.cycleCameraZoomMode(true);
        const modeLbl = nextMode === 'full' ? 'ZOOM: FULL' : nextMode === 'mid' ? 'ZOOM: MID' : 'ZOOM: AUTO';
        if (this.vfx && this.renderer) {
          this.vfx.spawnDamageText?.(
            this.renderer.camX || 600,
            (this.renderer.groundY || 520) - 210,
            0,
            false,
            modeLbl,
            nextMode === 'full' ? '#38bdf8' : nextMode === 'mid' ? '#2dd4bf' : '#facc15'
          );
        }
        return;
      }
      if (e.code !== 'Escape') return;
      if (this.isLandingOpen) {
        if (this._kitDrawerSide) {
          e.preventDefault();
          this.closeKitDrawer(true);
          return;
        }
        if (this._navAudioOpen) {
          e.preventDefault();
          this.setNavAudioOpen(false, true);
        }
        return;
      }
      if (this.victoryOverlay && !this.victoryOverlay.classList.contains('hidden')) return;
      if (this.isEndlessMode()) {
        const hasBlockingModal = Boolean(
          this.endless?.isBlockingModalOpen?.() ||
            this.endless?.trialResult ||
            this.endless?.offlineLootModal
        );
        if (hasBlockingModal) {
          e.preventDefault();
          if (typeof this.endless?.dismissActiveModal === 'function') {
            this.endless.dismissActiveModal();
          } else if (this.endless?.trialResult) {
            this.endless.dismissTrialResult?.();
          } else if (this.endless?.offlineLootModal) {
            this.endless.claimOfflineLoot?.() ?? this.endless.dismissOfflineLoot?.();
          }
          return;
        }
        if (this.endless?.shopUI?.isDrawerOpen?.()) {
          e.preventDefault();
          this.endless.shopUI.setDrawerOpen(false);
          return;
        }
      }
      if (this.isAdventureMode() && this.adventure?.isSkillTreeOpen) {
        e.preventDefault();
        this.adventure.closeSkillTree(true);
        return;
      }
      if (this.isAdventureMode() && this.adventure?.isRelicDraftOpen) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      this.togglePause(true);
    });

    if (this.canvas) {
      this.canvas.addEventListener('pointerdown', (e) => {
        if (this.isMatchOver) {
          this.trySkipEndMatchToOverlay();
          return;
        }
        if (
          this.isEndlessMode() &&
          this.endless?.active &&
          !this.isLandingOpen &&
          !this.isPaused &&
          e.button !== 2
        ) {
          const rect = this.canvas.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && this.renderer) {
            const r = this.renderer;
            const isCssRotated = Boolean(
              document.documentElement?.classList?.contains?.('is-css-rotated-landscape')
            );
            const sx = isCssRotated
              ? ((e.clientY - rect.top) / rect.height) * r.width
              : ((e.clientX - rect.left) / rect.width) * r.width;
            const sy = isCssRotated
              ? ((rect.right - e.clientX) / rect.width) * r.height
              : ((e.clientY - rect.top) / rect.height) * r.height;
            const safeZoom = Math.max(0.35, r.camZoom || 1);
            const screenAnchorY = Math.round(
              r.height * (r.isMobileLandscape ? 0.63 : r.isMobilePortrait ? 0.54 : r.isMobile ? 0.58 : 0.68)
            );
            const worldX = (sx - r.width * 0.5) / safeZoom + (r.camX || 0);
            const worldY = (sy - screenAnchorY) / safeZoom + (r.camY || 466);
            this.endless.handleCanvasTap?.(worldX, worldY, sx, sy);
          }
        }
      });
    }

    if (this.btnTestMode) {
      this.btnTestMode.addEventListener('click', () => this.toggleTestModeUnlimitedHp(true));
    }
    if (this.landingBtnTestMode) {
      this.landingBtnTestMode.addEventListener('click', () => this.toggleTestModeUnlimitedHp(true));
    }
    if (this.btnQuickHpMode) {
      this.btnQuickHpMode.addEventListener('click', () => this.toggleTestModeUnlimitedHp(true));
    }
    this.syncTestModeUI();

    this.quickModeBtns = document.querySelectorAll('[data-quick-mode]');
    this.quickModeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.isSideScrollMode()) return;
        const modeKey = btn.getAttribute('data-quick-mode');
        if (modeKey === '1v1' || modeKey === '2v2_tag') {
          this.setGameMode(modeKey, true);
        }
      });
    });

    // Clicking either showcase pedestal switches active assignment slot cleanly
    const profileLeftEl = document.getElementById('profile-left');
    const profileRightEl = document.getElementById('profile-right');
    if (profileLeftEl) {
      profileLeftEl.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        this.setActiveSlot(this.is2v2Mode() && this.inspectLeftRole === 'partner' ? 3 : 1);
      });
    }
    if (profileRightEl) {
      profileRightEl.addEventListener('click', (e) => {
        if (this.isSideScrollMode() || this.isP1ArcadeMode() || e.target.closest('button')) return;
        this.setActiveSlot(this.is2v2Mode() && this.inspectRightRole === 'partner' ? 4 : 2);
      });
    }

    // Kit & Tiers Slide-Over Drawer + 4-Icon Skill Strip Hover & Click Triggers
    const updateStripHoverCaption = (side, slotIdx) => {
      const capEl = document.getElementById(`${side}-kit-hover-caption`);
      if (!capEl) return;
      if (slotIdx < 0) {
        capEl.textContent =
          this.isEndlessMode() && side === 'p2'
            ? 'ENDLESS CRUSADE • INFINITE REALMS'
            : this.isAdventureMode() && side === 'p2'
              ? 'TAP ICON FOR BOSS RAID KIT'
              : 'TAP ICON FOR KIT & TIERS';
        return;
      }
      if (slotIdx === 3) {
        const supName = document.getElementById(`${side}-true-ult-name`)?.textContent?.trim();
        capEl.textContent = supName ? `ULT: ${supName}` : 'SUPREME ULTIMATE';
        return;
      }
      const sName = document.getElementById(`${side}-skill-name-${slotIdx}`)?.textContent?.trim();
      const sType = document.getElementById(`${side}-skill-type-${slotIdx}`)?.textContent?.trim();
      capEl.textContent = sName ? (sType ? `${sName} • ${sType}` : sName) : 'TAP ICON FOR KIT & TIERS';
    };
    document.querySelectorAll('[data-kit-drawer]').forEach((btn) => {
      const side = btn.getAttribute('data-kit-drawer');
      const slotAttr = btn.getAttribute('data-kit-slot');
      const slotIdx = slotAttr !== null ? Number(slotAttr) : -1;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openKitDrawer(side, slotIdx);
      });
      if (slotIdx >= 0) {
        btn.addEventListener('mouseenter', () => updateStripHoverCaption(side, slotIdx));
        btn.addEventListener('focus', () => updateStripHoverCaption(side, slotIdx));
        btn.addEventListener('mouseleave', () => updateStripHoverCaption(side, -1));
        btn.addEventListener('blur', () => updateStripHoverCaption(side, -1));
      }
    });
    const btnP1KitClose = document.getElementById('btn-p1-kit-close');
    const btnP2KitClose = document.getElementById('btn-p2-kit-close');
    if (btnP1KitClose) btnP1KitClose.addEventListener('click', () => this.closeKitDrawer(true));
    if (btnP2KitClose) btnP2KitClose.addEventListener('click', () => this.closeKitDrawer(true));
    if (this.kitDrawerBackdrop) {
      this.kitDrawerBackdrop.addEventListener('click', (e) => {
        if (e.target === this.kitDrawerBackdrop) {
          this.closeKitDrawer(true);
        }
      });
    }

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
        if (this.isSideScrollMode()) return;
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
        if (this.isSideScrollMode()) return;
        this.inspectLeftRole = 'partner';
        this.setActiveSlot(3);
      });
    }
    if (this.p2TabLead) {
      this.p2TabLead.addEventListener('click', () => {
        if (this.isSideScrollMode()) {
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
        if (this.isSideScrollMode()) return;
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
      brawler_ex: document.getElementById('card-brawler_ex'),
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
      brawler_ex: document.getElementById('ribbon-brawler_ex'),
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
      brawler_ex: document.getElementById('preview-brawler_ex'),
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
      buildBadge: document.getElementById(`${side}-build-badge`),
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
      staggerBar: document.getElementById('adv-boss-stagger-bar'),
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
        if (this.isSideScrollMode()) return;
        this.inspectLeftRole = 'partner';
        this.setActiveSlot(3);
      });
    }
    if (this.slotBtnRight) {
      this.slotBtnRight.addEventListener('click', () => {
        if (this.isSideScrollMode() || this.isP1ArcadeMode()) {
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
        if (this.isSideScrollMode()) return;
        this.inspectRightRole = 'partner';
        this.setActiveSlot(4);
      });
    }

    // Sovereign Loadouts: Preset strip & inline [ I | II | III ] skill-card tabs (EX VS Mode only)
    const resolveBuildPanelTarget = (panelKey) => {
      const is2v2 = this.is2v2Mode();
      if (panelKey === 'p2') {
        const isPart = is2v2 && this.inspectRightRole === 'partner';
        return {
          slotKey: isPart ? 'p2b' : 'p2',
          heroKey: isPart ? this.slot2PartnerHero : this.slot2Hero,
          sfxX: 850
        };
      }
      const isPart = is2v2 && this.inspectLeftRole === 'partner';
      return {
        slotKey: isPart ? 'p1b' : 'p1',
        heroKey: isPart ? this.slot1PartnerHero : this.slot1Hero,
        sfxX: 350
      };
    };

    document.querySelectorAll('[data-build-panel][data-preset]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSideScrollMode()) return;
        const panelKey = btn.getAttribute('data-build-panel');
        const presetKey = btn.getAttribute('data-preset');
        const { slotKey, heroKey, sfxX } = resolveBuildPanelTarget(panelKey);
        if (!HeroBuildSystem.hasCustomBuilds(heroKey)) return;
        HeroBuildSystem.setSlotPreset(slotKey, heroKey, presetKey === 'rng' ? 'rng' : Number(presetKey));
        this.syncRosterSelectionUI(false);
        if (this.audio) this.audio.play('clock_gear', sfxX);
      });
    });

    document.querySelectorAll('[data-build-panel][data-build-cat][data-tier]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSideScrollMode()) return;
        const panelKey = btn.getAttribute('data-build-panel');
        const cat = btn.getAttribute('data-build-cat');
        const tier = Number(btn.getAttribute('data-tier'));
        const { slotKey, heroKey, sfxX } = resolveBuildPanelTarget(panelKey);
        if (!HeroBuildSystem.hasCustomBuilds(heroKey)) return;
        HeroBuildSystem.setSlotCategoryTier(slotKey, heroKey, cat, tier);
        this.syncRosterSelectionUI(false);
        if (this.audio) this.audio.play('clock_gear', sfxX);
      });
    });

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
          this.setActiveSlot(this.is2v2Mode() ? 3 : this.isSideScrollMode() ? 1 : 2);
        }
      });
    });
    document.querySelectorAll('[data-assign-p2]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSideScrollMode()) return;
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
        if (this.isSideScrollMode() || this.isP1ArcadeMode()) {
          this.assignHeroToSlot(1, heroKey, true);
          this.setActiveSlot(1);
          return;
        }
        // Assign directly to the currently active slot (swapping cleanly if already picked in another slot)
        this.assignHeroToSlot(this.activeAssignSlot || 1, heroKey, true);
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
        if (this.isSideScrollMode()) {
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
        if (targetStep === 'mode' && this.isSideScrollMode()) return;
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
    const btnTitlePlayerVsAi = document.getElementById('btn-title-player-vs-ai');
    if (btnTitlePlayerVsAi) {
      btnTitlePlayerVsAi.addEventListener('click', () => {
        if (this.isSideScrollMode() || this.gameMode === '2v2_brawl') {
          this.setGameMode('1v1', false);
        }
        this.p1SubMode = 'exhibition';
        this.arcadeRun = null;
        this.setVsControlMode('1p', { playSound: false });
        this.syncRosterSelectionUI(false);
        this.setLandingStep('roster', true);
      });
    }
    const btnGoMode = document.getElementById('btn-go-mode');
    if (btnGoMode) {
      btnGoMode.addEventListener('click', () => {
        if (this.isSideScrollMode() || this.gameMode === '2v2_brawl') {
          this.setGameMode('1v1', false);
        }
        this.p1SubMode = 'exhibition';
        this.arcadeRun = null;
        this.setVsControlMode('ai', { playSound: false });
        this.syncRosterSelectionUI(false);
        this.setLandingStep('roster', true);
      });
    }
    const btnTitleAdventure = document.getElementById('btn-title-adventure');
    if (btnTitleAdventure) {
      btnTitleAdventure.addEventListener('click', () => {
        this.p1SubMode = 'exhibition';
        this.arcadeRun = null;
        this.setVsControlMode('ai', { playSound: false });
        this.setGameMode('adventure', false);
        this.setLandingStep('roster', true);
      });
    }
    const btnTitleEndless = document.getElementById('btn-title-endless');
    if (btnTitleEndless) {
      btnTitleEndless.addEventListener('click', () => {
        this.p1SubMode = 'exhibition';
        this.arcadeRun = null;
        this.setVsControlMode('ai', { playSound: false });
        this.setGameMode('endless', false);
        this.setLandingStep('roster', true);
      });
    }
    if (Array.isArray(this.p1SubmodeBtns)) {
      for (const btn of this.p1SubmodeBtns) {
        btn.addEventListener('click', () => {
          if (!this.isVsManualP1Active()) return;
          const nextSub = btn.getAttribute('data-p1-submode') || 'exhibition';
          this.setP1SubMode(nextSub, true);
        });
      }
    }
    if (this.btnLabCollapse) {
      this.btnLabCollapse.addEventListener('click', () => {
        this.setTrainingLabCollapsed(!this._ensureTrainingLabState().collapsed, true);
      });
    }
    if (this.btnLabDummy) {
      this.btnLabDummy.addEventListener('click', () => this.cycleTrainingDummyMode(true));
    }
    if (this.btnLabGauge) {
      this.btnLabGauge.addEventListener('click', () => this.toggleTrainingGaugeMode(true));
    }
    if (this.btnLabHp) {
      this.btnLabHp.addEventListener('click', () => this.toggleTrainingHpMode(true));
    }
    if (this.btnLabReset) {
      this.btnLabReset.addEventListener('click', () => this.resetTrainingLabPositions(true));
    }
    if (Array.isArray(this.pauseLabDummyBtns)) {
      for (const btn of this.pauseLabDummyBtns) {
        btn.addEventListener('click', () =>
          this.setTrainingDummyMode(btn.getAttribute('data-pause-lab-dummy') || 'idle', true)
        );
      }
    }
    if (Array.isArray(this.pauseLabGaugeBtns)) {
      for (const btn of this.pauseLabGaugeBtns) {
        btn.addEventListener('click', () =>
          this.setTrainingGaugeMode(btn.getAttribute('data-pause-lab-gauge') || 'instant', true)
        );
      }
    }
    if (Array.isArray(this.pauseLabHpBtns)) {
      for (const btn of this.pauseLabHpBtns) {
        btn.addEventListener('click', () =>
          this.setTrainingHpMode(btn.getAttribute('data-pause-lab-hp') || 'auto_heal', true)
        );
      }
    }
    if (this.pauseLabResetBtn) {
      this.pauseLabResetBtn.addEventListener('click', () => {
        this.setPaused(false, false);
        this.resetTrainingLabPositions(true);
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
        this.goToTitleScreen(true);
      });
    }
    const btnRosterConfigBadge = document.getElementById('btn-roster-config-badge');
    if (btnRosterConfigBadge) {
      btnRosterConfigBadge.addEventListener('click', () => {
        if (!this.isSideScrollMode()) {
          this.setLandingStep('mode', true);
        }
      });
    }

    this.landingBtnAutoTourney = document.getElementById('landing-btn-auto-tourney');
    this.landingAutoTourneyTag = document.getElementById('landing-auto-tourney-tag');

    const getPreviewVoiceHeroId = () => {
      const candidates = [
        !this.isLandingOpen ? this.leftFighter?.heroId : null,
        !this.isLandingOpen ? this.rightFighter?.heroId : null,
        this.slot1Hero,
        this.slot2Hero,
        'priestess_ex'
      ];
      for (const cid of candidates) {
        if (cid && this.audio?.hasVoicePack?.(cid)) return cid;
      }
      return 'priestess_ex';
    };

    const bindVoiceLangToggle = (btn) => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audio.toggleVoiceLang?.();
        this.syncAudioMixerUI();
        this.prewarmSelectedAssets();
        this.audio.play('clock_gear', 600);
        if (this.audio?.voiceEnabled && (this.audio?.getVoiceVolume?.() ?? 0) > 0.01) {
          this.audio.playHeroVoice?.(getPreviewVoiceHeroId(), 'select', {
            speakerKey: 'mixer_preview',
            priority: 2,
            cooldownMs: 120,
            maxAsyncDelayMs: 950
          });
        }
      });
    };

    const bindVoicePaceToggle = (btn) => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pace = this.audio.toggleVoicePace?.() || 'snappy';
        this.syncAudioMixerUI();
        this.audio.play('clock_gear', 600);
        if (this.audio?.voiceEnabled && (this.audio?.getVoiceVolume?.() ?? 0) > 0.01) {
          this.audio.playHeroVoice?.(
            getPreviewVoiceHeroId(),
            pace === 'full' ? 'skill_std' : 'skill_short',
            {
              speakerKey: 'mixer_preview',
              priority: 2,
              cooldownMs: 120,
              maxAsyncDelayMs: 950
            }
          );
        }
      });
    };

    const bindVoiceToggle = (btn) => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = this.audio.toggleVoice?.();
        this.syncAudioMixerUI();
        if (on && this.audio.activeHeroVoices?.size === 0) {
          this.audio.playHeroVoice?.(getPreviewVoiceHeroId(), 'attack_1', {
            speakerKey: 'mixer_preview',
            priority: 2,
            cooldownMs: 180
          });
        }
      });
    };
    const bindSfxToggle = (btn) => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = this.audio.toggleSfx?.();
        this.syncAudioMixerUI();
        if (on) this.audio.play('clock_gear', 600);
      });
    };
    const bindBgmToggle = (btn) => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = this.audio.toggleBgm?.();
        this.syncAudioMixerUI();
        if (on) this.syncActiveBgm();
      });
    };
    const bindVoiceSlider = (slider) => {
      if (!slider) return;
      slider.addEventListener('input', (e) => {
        this.audio.setVoiceVolume?.(Number(e.target.value) / 100);
        this.syncAudioMixerUI();
      });
      slider.addEventListener('change', () => {
        if (
          this.audio?.voiceEnabled &&
          (this.audio?.getVoiceVolume?.() ?? 0) > 0.01 &&
          this.audio.activeHeroVoices?.size === 0
        ) {
          this.audio.playHeroVoice?.(getPreviewVoiceHeroId(), 'attack_1', {
            speakerKey: 'mixer_preview',
            priority: 2,
            cooldownMs: 180
          });
        }
      });
    };
    const bindBgmSlider = (slider) => {
      if (!slider) return;
      slider.addEventListener('input', (e) => {
        this.audio.setBgmVolume?.(Number(e.target.value) / 100);
        this.syncAudioMixerUI();
        if (this.audio?.bgmEnabled && (this.audio?.getBgmVolume?.() ?? 0) > 0.01) {
          this.syncActiveBgm();
        }
      });
    };
    const bindSfxSlider = (slider) => {
      if (!slider) return;
      slider.addEventListener('input', (e) => {
        this.audio.setSfxVolume?.(Number(e.target.value) / 100);
        this.syncAudioMixerUI();
      });
      slider.addEventListener('change', () => {
        if (this.audio?.sfxEnabled && (this.audio?.getSfxVolume?.() ?? 0) > 0.01) {
          this.audio.play('holy_bolt', 600);
        }
      });
    };

    bindVoiceLangToggle(this.btnVoiceLang);
    bindVoiceLangToggle(this.btnNavVoiceLang);
    bindVoicePaceToggle(this.btnVoicePace);
    bindVoicePaceToggle(this.btnNavVoicePace);
    bindVoiceToggle(this.btnVoice);
    bindVoiceToggle(this.btnNavVoice);
    bindBgmToggle(this.btnBgm);
    bindBgmToggle(this.btnNavBgm);
    bindSfxToggle(this.btnSfx);
    bindSfxToggle(this.btnNavSfx);
    bindVoiceSlider(this.inputVoiceVol);
    bindVoiceSlider(this.inputNavVoiceVol);
    bindBgmSlider(this.inputBgmVol);
    bindBgmSlider(this.inputNavBgmVol);
    bindSfxSlider(this.inputSfxVol);
    bindSfxSlider(this.inputNavSfxVol);

    if (this.btnNavAudio) {
      this.btnNavAudio.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setNavAudioOpen(!this._navAudioOpen, true);
      });
    }
    if (this.navAudioPopover) {
      this.navAudioPopover.addEventListener('click', (e) => e.stopPropagation());
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('click', (e) => {
        if (!this._navAudioOpen) return;
        if (this.navAudioWrap && typeof this.navAudioWrap.contains === 'function' && this.navAudioWrap.contains(e.target)) {
          return;
        }
        this.setNavAudioOpen(false, false);
      });
    }
    this.syncAudioMixerUI();

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
      if (!this.isSideScrollMode()) {
        if (!this.autoTourney) {
          this._clearAutoNextTimers();
          this._updateVictoryCountdownLabel();
        } else if (
          this.isMatchOver &&
          !this.isLandingOpen &&
          this.victoryOverlay &&
          !this.victoryOverlay.classList.contains('hidden')
        ) {
          this._scheduleAutoNext(9000);
        } else {
          this._updateVictoryCountdownLabel();
        }
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
      this.btnNextChallenger.addEventListener('click', () => {
        if (this.isArcadeLadderActive()) {
          this.advanceArcadeStage();
          return;
        }
        this.advanceTourneyChallenger();
      });
    }
    if (this.btnSwapSides) {
      this.btnSwapSides.addEventListener('click', () => this.swapSides(true));
    }

    this.syncVsControlUI();

    // Official Player vs AI Mode Desktop Keyboard Router (`A/D`, `W/Space`, `S`, `J/Z`, `K/X`, `L/Shift`, `U/Q`, `I/E`, `Tab`)
    window.addEventListener('keydown', (e) => {
      if (this.isLandingOpen || this.isPaused || this.isMatchOver || this.isSideScrollMode()) return;
      if (!this.isVsManualP1Active()) return;
      if (this.roundIntroTimer > 0) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const code = e.code;

      const dismissHint = () => {
        if (!this.vsInput.keyHintDismissed) this.dismissVsKeyHintBar(false);
      };

      if (code === 'KeyA' || code === 'ArrowLeft') {
        this.vsInput.heldLeft = true;
        this.syncVsStickKnobUI();
        dismissHint();
        e.preventDefault();
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        this.vsInput.heldRight = true;
        this.syncVsStickKnobUI();
        dismissHint();
        e.preventDefault();
      } else if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') {
        this.vsInput.heldUp = true;
        if (!e.repeat) this.triggerVsManualAction('jump');
        this.syncVsStickKnobUI();
        e.preventDefault();
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        this.vsInput.heldDown = true;
        if (!e.repeat) this.triggerVsManualAction('guard');
        this.syncVsStickKnobUI();
        e.preventDefault();
      } else if (code === 'KeyJ' || code === 'KeyZ') {
        this.vsInput.heldAttack = true;
        this.triggerVsManualAction('attack');
        e.preventDefault();
      } else if (code === 'KeyK' || code === 'KeyX') {
        if (!e.repeat) this.triggerVsManualAction('skill');
        e.preventDefault();
      } else if (code === 'KeyL' || code === 'ShiftLeft' || code === 'ShiftRight') {
        if (!e.repeat) this.triggerVsManualAction('dodge');
        e.preventDefault();
      } else if (code === 'KeyU' || code === 'KeyQ') {
        if (!e.repeat) this.triggerVsManualAction('overdrive');
        e.preventDefault();
      } else if (code === 'KeyI') {
        if (!e.repeat) this.triggerVsManualAction('ultimate');
        e.preventDefault();
      } else if (code === 'KeyE') {
        if (!e.repeat) {
          const p = this.getPointFighter?.(1);
          const canTrueUlt = Boolean(
            p && p.hasTrueUltimate && (p.finisherGauge || 0) >= (p.maxFinisherGauge || 100) - 0.1
          );
          if (this.gameMode === '2v2_tag' && !canTrueUlt) {
            this.triggerVsManualAction('tag');
          } else {
            this.triggerVsManualAction('ultimate');
          }
        }
        e.preventDefault();
      } else if (code === 'Tab' && this.gameMode === '2v2_tag') {
        if (!e.repeat) this.triggerVsManualAction('tag');
        e.preventDefault();
      } else if (code === 'Backspace' && this.isP1TrainingMode()) {
        if (!e.repeat) this.resetTrainingLabPositions(true);
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft') {
        this.vsInput.heldLeft = false;
        this.syncVsStickKnobUI();
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        this.vsInput.heldRight = false;
        this.syncVsStickKnobUI();
      } else if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') {
        this.vsInput.heldUp = false;
        this.syncVsStickKnobUI();
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        this.vsInput.heldDown = false;
        this.syncVsStickKnobUI();
      } else if (code === 'KeyJ' || code === 'KeyZ') {
        this.vsInput.heldAttack = false;
      }
    });

    window.addEventListener('blur', () => {
      this.clearVsManualInputs();
    });

    // Playable 1P Versus Mode Mobile Touch Stick & Action Orbs (Full-zone touch, tight 0.34x throw, soft ±16px dynamic origin & window-tracked drags)
    const vsStickZone = document.getElementById('vs-stick-zone');
    const vsStickBase = document.getElementById('vs-stick-base');
    if (vsStickZone && vsStickBase) {
      let vsStickTouchId = null;
      let vsStickPointerId = null;
      let vsOriginX = null;
      let vsOriginY = null;
      let vsMaxR = 36;
      const clampSoftOrigin = (v) => Math.max(-16, Math.min(16, v));

      const initVsOrigin = (clientX, clientY) => {
        const rect = vsStickBase.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        vsMaxR = Math.max(26, Math.min(rect.width, rect.height) * 0.34);
        vsOriginX = cx + clampSoftOrigin(clientX - cx);
        vsOriginY = cy + clampSoftOrigin(clientY - cy);
      };

      const updateVsStick = (clientX, clientY) => {
        if (vsOriginX === null || vsOriginY === null) {
          initVsOrigin(clientX, clientY);
        }
        const rawDx = clientX - vsOriginX;
        const rawDy = clientY - vsOriginY;
        const isCssRot = document.documentElement.classList.contains('is-css-rotated-landscape');
        let nx = (isCssRot ? rawDy : rawDx) / vsMaxR;
        let ny = (isCssRot ? -rawDx : rawDy) / vsMaxR;
        const mag = Math.hypot(nx, ny);
        if (mag > 1) {
          nx /= mag;
          ny /= mag;
        }
        this.vsInput.joyActive = true;
        this.vsInput.joyX = nx;
        this.vsInput.joyY = ny;
        if (ny < -0.68 && this.vsInput.joyFlickLockY >= 0) {
          this.vsInput.joyFlickLockY = -1;
          this.triggerVsManualAction('jump');
        } else if (ny > 0.68 && this.vsInput.joyFlickLockY <= 0) {
          this.vsInput.joyFlickLockY = 1;
          this.triggerVsManualAction('guard');
        } else if (Math.abs(ny) < 0.32) {
          this.vsInput.joyFlickLockY = 0;
        }
        this.syncVsStickKnobUI();
      };

      const onVsWinTouchMove = (e) => {
        if (vsStickTouchId === null) return;
        const touches = e.changedTouches || [];
        for (let i = 0; i < touches.length; i++) {
          const t = touches[i];
          if (t.identifier === vsStickTouchId) {
            if (e.cancelable) e.preventDefault();
            updateVsStick(t.clientX, t.clientY);
            break;
          }
        }
      };
      const onVsWinTouchEnd = (e) => {
        if (vsStickTouchId === null) return;
        const touches = e.changedTouches || [];
        for (let i = 0; i < touches.length; i++) {
          if (touches[i].identifier === vsStickTouchId) {
            releaseVsStick();
            break;
          }
        }
      };
      const onVsWinPointerMove = (e) => {
        if (e.pointerType === 'touch' || e.pointerId !== vsStickPointerId) return;
        if (e.cancelable) e.preventDefault();
        updateVsStick(e.clientX, e.clientY);
      };
      const onVsWinPointerEnd = (e) => {
        if (e.pointerType === 'touch' || e.pointerId !== vsStickPointerId) return;
        releaseVsStick();
      };

      const detachVsStickWin = () => {
        window.removeEventListener('touchmove', onVsWinTouchMove, { passive: false });
        window.removeEventListener('touchend', onVsWinTouchEnd);
        window.removeEventListener('touchcancel', onVsWinTouchEnd);
        window.removeEventListener('pointermove', onVsWinPointerMove);
        window.removeEventListener('pointerup', onVsWinPointerEnd);
        window.removeEventListener('pointercancel', onVsWinPointerEnd);
      };

      const releaseVsStick = () => {
        vsStickTouchId = null;
        vsStickPointerId = null;
        vsOriginX = null;
        vsOriginY = null;
        detachVsStickWin();
        this.vsInput.joyActive = false;
        this.vsInput.joyX = 0;
        this.vsInput.joyY = 0;
        this.vsInput.joyFlickLockY = 0;
        this.syncVsStickKnobUI();
      };

      const isVsAuxBtnTarget = (target) =>
        Boolean(target && typeof target.closest === 'function' && target.closest('.vs-aux-orb-btn, .vs-stick-aux-row'));

      vsStickZone.addEventListener(
        'touchstart',
        (e) => {
          if (!this.isVsManualP1Active() || isVsAuxBtnTarget(e.target)) return;
          if (vsStickTouchId === null && e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            vsStickTouchId = t.identifier;
            initVsOrigin(t.clientX, t.clientY);
            updateVsStick(t.clientX, t.clientY);
            window.addEventListener('touchmove', onVsWinTouchMove, { passive: false });
            window.addEventListener('touchend', onVsWinTouchEnd, { passive: true });
            window.addEventListener('touchcancel', onVsWinTouchEnd, { passive: true });
          }
          if (e.cancelable) e.preventDefault();
        },
        { passive: false }
      );
      vsStickZone.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' || !this.isVsManualP1Active() || isVsAuxBtnTarget(e.target)) return;
        vsStickPointerId = e.pointerId;
        try {
          vsStickZone.setPointerCapture?.(e.pointerId);
        } catch (_) {
          // Optional pointer capture
        }
        initVsOrigin(e.clientX, e.clientY);
        updateVsStick(e.clientX, e.clientY);
        window.addEventListener('pointermove', onVsWinPointerMove);
        window.addEventListener('pointerup', onVsWinPointerEnd);
        window.addEventListener('pointercancel', onVsWinPointerEnd);
        if (e.cancelable) e.preventDefault();
      });
      vsStickZone.addEventListener('lostpointercapture', () => {
        if (vsStickPointerId !== null) releaseVsStick();
      });
    }

    const bindVsTouchOrb = (id, actionName, holdAttack = false) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const press = (e) => {
        if (e?.cancelable) e.preventDefault();
        btn.classList.add('is-pressed');
        if (holdAttack) this.vsInput.uiHeldAttack = true;
        this.triggerVsManualAction(actionName);
      };
      const release = () => {
        btn.classList.remove('is-pressed');
        if (holdAttack) this.vsInput.uiHeldAttack = false;
      };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: true });
      btn.addEventListener('touchcancel', release, { passive: true });
      btn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        press(e);
      });
      btn.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch') return;
        release();
      });
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        release();
      });
    };

    bindVsTouchOrb('vs-btn-attack', 'attack', true);
    bindVsTouchOrb('vs-btn-jump', 'jump', false);
    bindVsTouchOrb('vs-btn-guard', 'guard', false);
    bindVsTouchOrb('vs-btn-dodge', 'dodge', false);
    bindVsTouchOrb('vs-btn-skill', 'skill', false);
    bindVsTouchOrb('vs-btn-overdrive', 'overdrive', false);
    bindVsTouchOrb('vs-btn-ultimate', 'ultimate', false);
    bindVsTouchOrb('vs-btn-tag', 'tag', false);

    this.btnReset.addEventListener('click', () => {
      this.setPaused(false, false);
      this.audio?.stopAllHeroVoices?.(0.03);
      if (this.isP1TrainingMode()) {
        this.resetTrainingLabPositions(true);
        return;
      }
      this.resetMatch();
      this.beginLiveRoundIntro();
    });
    this.btnPlayAgain.addEventListener('click', () => {
      this.audio?.stopAllHeroVoices?.(0.03);
      if (this.isArcadeLadderActive()) {
        if (this.arcadeRun.cleared) {
          this.startArcadeRun(this.slot1Hero);
          this.resetMatch();
          this.beginLiveRoundIntro();
        } else {
          this.retryArcadeStage();
        }
        return;
      }
      if (this.isP1TrainingMode()) {
        this.resetMatch();
        return;
      }
      this.resetMatch();
      this.beginLiveRoundIntro();
    });

    // Adventure Mode Mobile Action-RPG HUD: Independent Multi-Touch Joystick (Tight 0.34x throw, soft ±16px dynamic origin & reliable window-tracked drags)
    const joyZone = document.getElementById('adv-joystick-zone');
    const joyBase = document.getElementById('adv-joystick-base');
    if (joyZone) {
      let activeJoyTouchId = null;
      let activeJoyPointerId = null;
      let joyOriginX = null;
      let joyOriginY = null;
      let joyMaxRadius = 40;
      const clampSoftOrigin = (v) => Math.max(-16, Math.min(16, v));

      const initJoyOrigin = (clientX, clientY) => {
        const refEl = joyBase || joyZone;
        const rect = refEl.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        joyMaxRadius = Math.max(26, Math.min(rect.width, rect.height) * 0.34);
        joyOriginX = cx + clampSoftOrigin(clientX - cx);
        joyOriginY = cy + clampSoftOrigin(clientY - cy);
      };

      const updateJoyFromCoords = (clientX, clientY) => {
        if (joyOriginX === null || joyOriginY === null) {
          initJoyOrigin(clientX, clientY);
        }
        const rawDx = clientX - joyOriginX;
        const rawDy = clientY - joyOriginY;
        const isCssRotated = document.documentElement.classList.contains('is-css-rotated-landscape');
        const dx = (isCssRotated ? rawDy : rawDx) / joyMaxRadius;
        const dy = (isCssRotated ? -rawDx : rawDy) / joyMaxRadius;
        this.getActiveSideScrollManager?.()?.setJoystickVector(dx, dy, true);
      };

      const onJoyWinTouchMove = (e) => {
        if (activeJoyTouchId === null) return;
        const touches = e.changedTouches || [];
        for (let i = 0; i < touches.length; i++) {
          if (touches[i].identifier === activeJoyTouchId) {
            if (e.cancelable) e.preventDefault();
            updateJoyFromCoords(touches[i].clientX, touches[i].clientY);
            break;
          }
        }
      };
      const onJoyWinTouchEnd = (e) => {
        if (activeJoyTouchId === null) return;
        const touches = e.changedTouches || [];
        for (let i = 0; i < touches.length; i++) {
          if (touches[i].identifier === activeJoyTouchId) {
            releaseAdvJoy();
            break;
          }
        }
      };
      const onJoyWinPointerMove = (e) => {
        if (e.pointerType === 'touch' || e.pointerId !== activeJoyPointerId) return;
        if (e.cancelable) e.preventDefault();
        updateJoyFromCoords(e.clientX, e.clientY);
      };
      const onJoyWinPointerEnd = (e) => {
        if (e?.pointerType === 'touch' && activeJoyTouchId !== null) return;
        if (
          e &&
          activeJoyPointerId !== null &&
          e.pointerId !== undefined &&
          e.pointerId !== activeJoyPointerId
        ) {
          return;
        }
        releaseAdvJoy();
      };

      const detachAdvJoyWin = () => {
        window.removeEventListener('touchmove', onJoyWinTouchMove, { passive: false });
        window.removeEventListener('touchend', onJoyWinTouchEnd);
        window.removeEventListener('touchcancel', onJoyWinTouchEnd);
        window.removeEventListener('pointermove', onJoyWinPointerMove);
        window.removeEventListener('pointerup', onJoyWinPointerEnd);
        window.removeEventListener('pointercancel', onJoyWinPointerEnd);
      };

      const releaseAdvJoy = () => {
        activeJoyTouchId = null;
        activeJoyPointerId = null;
        joyOriginX = null;
        joyOriginY = null;
        detachAdvJoyWin();
        this.getActiveSideScrollManager?.()?.setJoystickVector(0, 0, false);
      };

      // Dedicated TouchEvent multi-touch tracking by touch.identifier (zero interference with right-hand Attack/Skills!)
      joyZone.addEventListener(
        'touchstart',
        (e) => {
          if (activeJoyTouchId !== null) return;
          const t = e.changedTouches?.[0];
          if (!t) return;
          if (e.cancelable) e.preventDefault();
          activeJoyTouchId = t.identifier;
          initJoyOrigin(t.clientX, t.clientY);
          updateJoyFromCoords(t.clientX, t.clientY);
          window.addEventListener('touchmove', onJoyWinTouchMove, { passive: false });
          window.addEventListener('touchend', onJoyWinTouchEnd, { passive: true });
          window.addEventListener('touchcancel', onJoyWinTouchEnd, { passive: true });
        },
        { passive: false }
      );

      // PointerEvent fallback for desktop mouse/pen/synthetic pointers
      joyZone.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        if (activeJoyPointerId !== null && activeJoyPointerId !== e.pointerId) return;
        if (e.cancelable) e.preventDefault();
        activeJoyPointerId = e.pointerId;
        try {
          joyZone.setPointerCapture?.(e.pointerId);
        } catch (_) {
          // Pointer capture optional in synthetic/headless environments
        }
        initJoyOrigin(e.clientX, e.clientY);
        updateJoyFromCoords(e.clientX, e.clientY);
        window.addEventListener('pointermove', onJoyWinPointerMove);
        window.addEventListener('pointerup', onJoyWinPointerEnd);
        window.addEventListener('pointercancel', onJoyWinPointerEnd);
      });
      joyZone.addEventListener('lostpointercapture', () => {
        if (activeJoyPointerId !== null) releaseAdvJoy();
      });
    }

    // Primary Anchor Attack Button (independent multi-touch Set — works seamlessly while dragging left joystick!)
    const advAttackBtn = document.getElementById('adv-btn-attack');
    if (advAttackBtn) {
      const activeAttackTouchIds = new Set();
      const activeAttackPointerIds = new Set();
      const syncAttackHeldState = () => {
        const held = activeAttackTouchIds.size > 0 || activeAttackPointerIds.size > 0;
        advAttackBtn.classList.toggle('is-pressed', held);
        this.getActiveSideScrollManager?.()?.setAttackHeld(held);
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
          this.getActiveSideScrollManager?.()?.triggerAction('attack');
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
        this.getActiveSideScrollManager?.()?.triggerAction('attack');
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
        this.getActiveSideScrollManager?.()?.triggerAction('attack');
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
          this.getActiveSideScrollManager?.()?.triggerAction(act);
        },
        { passive: false }
      );
      btn.addEventListener('touchend', clearPress, { passive: false });
      btn.addEventListener('touchcancel', clearPress, { passive: false });
      btn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        e.preventDefault();
        btn.classList.add('is-pressed');
        this.getActiveSideScrollManager?.()?.triggerAction(act);
      });
      btn.addEventListener('pointerup', clearPress);
      btn.addEventListener('pointercancel', clearPress);
      btn.addEventListener('click', () => {
        this.getActiveSideScrollManager?.()?.triggerAction(act);
      });
    });

    this.advCampaignBar = document.getElementById('adv-campaign-selector-bar');
    this.advCampaignSelect = document.getElementById('adv-campaign-select');
    this.advDifficultySelector = document.getElementById('adv-difficulty-selector');
    this.advDiffBtns = this.advDifficultySelector
      ? Array.from(this.advDifficultySelector.querySelectorAll('.adv-diff-btn[data-adv-tier]'))
      : [];
    this.advDiffBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tier = btn.getAttribute('data-adv-tier') || 'normal';
        this.setAdventureDifficulty(tier, true);
      });
    });
    this.syncAdventureDifficultyUI();
    this.advProgressToggle = document.getElementById('adv-progress-mode-toggle');
    this.advProgBtns = this.advProgressToggle
      ? Array.from(this.advProgressToggle.querySelectorAll('.adv-prog-btn[data-adv-progress]'))
      : [];
    this.advProgBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.getAttribute('data-adv-progress') || 'fresh';
        this.setAdventureProgressMode(nextMode, true);
      });
    });
    this.syncAdventureProgressModeUI();
    this.btnImportCampaignJson = document.getElementById('btn-import-campaign-json');
    this.inputImportCampaignJson = document.getElementById('input-import-campaign-json');
    if (this.advCampaignSelect) {
      this.advCampaignSelect.addEventListener('change', (e) => {
        const nextPackId = e.target?.value || DEFAULT_ADVENTURE_CAMPAIGN_ID;
        this.selectCampaignPack(nextPackId, { playSound: true }).catch(() => {});
      });
    }
    if (this.btnImportCampaignJson && this.inputImportCampaignJson) {
      this.btnImportCampaignJson.addEventListener('click', () => {
        this.inputImportCampaignJson.value = '';
        this.inputImportCampaignJson.click();
      });
      this.inputImportCampaignJson.addEventListener('change', (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const handleText = (txt) => {
          try {
            this.importCampaignPackJsonText(txt, file.name);
          } catch (err) {
            console.warn('Campaign JSON import rejected:', err);
          }
        };
        if (typeof file.text === 'function') {
          file
            .text()
            .then(handleText)
            .catch(() => {});
        } else if (typeof FileReader !== 'undefined') {
          const reader = new FileReader();
          reader.onload = () => handleText(String(reader.result || ''));
          reader.readAsText(file);
        }
      });
    }

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
    const advStResetLv = document.getElementById('adv-st-reset-lv');
    if (advStResetLv) {
      advStResetLv.addEventListener('click', () => {
        this.adventure?.resetHeroLevelToLv1(true);
      });
    }

    const advBtnAutoPlay = document.getElementById('adv-btn-autoplay');
    if (advBtnAutoPlay) {
      advBtnAutoPlay.addEventListener('click', () => {
        this.getActiveSideScrollManager?.()?.toggleAutoPlay(true);
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
          this.getActiveSideScrollManager?.()?.toggleAutoPlay(true);
        },
        { passive: false }
      );
      advBtnAutoSkill.addEventListener('click', () => {
        if (performance.now() - lastAutoTouchMs < 420) return;
        this.getActiveSideScrollManager?.()?.toggleAutoPlay(true);
      });
    }
    const advBtnLockEndless = document.getElementById('adv-btn-lock');
    if (advBtnLockEndless) {
      let lastLockTouchMs = 0;
      advBtnLockEndless.addEventListener(
        'touchstart',
        (e) => {
          if (!this.isEndlessMode()) return;
          e.preventDefault();
          lastLockTouchMs = performance.now();
          this.endless?.toggleTargetLock?.(true);
        },
        { passive: false }
      );
      advBtnLockEndless.addEventListener('click', () => {
        if (!this.isEndlessMode()) return;
        if (performance.now() - lastLockTouchMs < 420) return;
        this.endless?.toggleTargetLock?.(true);
      });
    }
    const advBtnRestart = document.getElementById('adv-btn-restart');
    if (advBtnRestart) {
      advBtnRestart.addEventListener('click', () => {
        if (this.isEndlessMode()) {
          const now = Date.now();
          if (this._endlessResetConfirmUntil && now < this._endlessResetConfirmUntil) {
            this._clearEndlessResetConfirm();
            this._syncAdvRestartButtonUI(true);
            this.setPaused(false, false);
            this.endless?.resetEndlessRun?.();
            return;
          }
          this._clearEndlessResetConfirm();
          this._endlessResetConfirmUntil = now + 4000;
          this._syncAdvRestartButtonUI(true);
          this.audio?.play?.('clock_gear', 600);
          this._endlessResetConfirmTimer = setTimeout(() => {
            this._clearEndlessResetConfirm();
            this._syncAdvRestartButtonUI(Boolean(this.isEndlessMode?.()));
          }, 4000);
          return;
        }
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
    this.syncCameraZoomUI();
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

  openKitDrawer(side, focusSlot = -1) {
    const validSide = side === 'p2' ? 'p2' : 'p1';
    this._kitDrawerSide = validSide;
    if (this.kitDrawerBackdrop) {
      this.kitDrawerBackdrop.classList.remove('hidden');
      this.kitDrawerBackdrop.setAttribute('data-drawer-side', validSide);
    }
    if (this.p1KitDrawer) {
      this.p1KitDrawer.classList.toggle('hidden', validSide !== 'p1');
    }
    if (this.p2KitDrawer) {
      this.p2KitDrawer.classList.toggle('hidden', validSide !== 'p2');
    }
    const activeDrawer = validSide === 'p2' ? this.p2KitDrawer : this.p1KitDrawer;
    if (activeDrawer) {
      activeDrawer.querySelectorAll('.skill-card[data-drawer-slot]').forEach((card) => {
        const sIdx = Number(card.getAttribute('data-drawer-slot'));
        card.classList.toggle('is-focused-slot', focusSlot >= 0 && sIdx === focusSlot);
      });
    }
    if (this.audio) this.audio.play('clock_gear', validSide === 'p2' ? 850 : 350);
  }

  closeKitDrawer(playSound = false) {
    if (!this._kitDrawerSide && (!this.kitDrawerBackdrop || this.kitDrawerBackdrop.classList.contains('hidden'))) {
      return;
    }
    this._kitDrawerSide = null;
    if (this.kitDrawerBackdrop) {
      this.kitDrawerBackdrop.classList.add('hidden');
      this.kitDrawerBackdrop.removeAttribute('data-drawer-side');
    }
    if (this.p1KitDrawer) this.p1KitDrawer.classList.add('hidden');
    if (this.p2KitDrawer) this.p2KitDrawer.classList.add('hidden');
    if (playSound && this.audio) this.audio.play('clock_gear', 600);
  }

  setLandingStep(step, playSound = true) {
    this.closeKitDrawer?.(false);
    let validStep = step === 'mode' || step === 'roster' ? step : 'title';
    if (validStep === 'mode' && this.isSideScrollMode()) {
      validStep = 'roster';
    }
    this.landingStep = validStep;
    if ((validStep === 'mode' || validStep === 'roster') && !this.isSideScrollMode()) {
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
    this.autoNextTimeout = null;
    this._clearAutoNextTimers?.();
    this.audio?.stopAllHeroVoices?.(0.03);
    const keys = this.getActiveRosterPool();
    const fallbackA = this.rosterVersion === 'legacy' ? 'archer' : 'archer_ex';
    const fallbackB = this.rosterVersion === 'legacy' ? 'reaper' : 'reaper_ex';
    const fallbackP = this.rosterVersion === 'legacy' ? 'priestess' : 'priestess_ex';
    if (this.is2v2Mode()) {
      const keepLead = this.isVsManualP1Active() ? this.slot1Hero : this.reigningHero || this.slot1Hero;
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
      const keepHero = this.isVsManualP1Active() ? this.slot1Hero : this.reigningHero || this.slot1Hero;
      const pool = keys.filter((k) => k !== keepHero && k !== this.slot2Hero);
      const candidates = pool.length > 0 ? pool : keys.filter((k) => k !== keepHero);
      const nextChallenger =
        candidates[Math.floor(Math.random() * candidates.length)] || fallbackA;
      this.slot1Hero = keepHero;
      this.slot2Hero = nextChallenger;
    }
    if (!this.isSideScrollMode() && HeroBuildSystem.isChallengerRngEnabled()) {
      HeroBuildSystem.rollChallengerBuild('p2', this.slot2Hero);
      if (this.is2v2Mode()) {
        HeroBuildSystem.rollChallengerBuild('p2b', this.slot2PartnerHero);
      }
    }
    this.syncRosterSelectionUI(false);
    this.resetMatch();
    this.beginLiveRoundIntro?.({ preferChallenger: true });
  }

  setActiveSlot(slotNum) {
    if (this.isSideScrollMode()) {
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

  async initCampaignCatalog(initialCampaignParam = null) {
    if (typeof fetch !== 'function') return;
    try {
      const packs = await this.adventure.fetchCampaignIndex('assets/campaigns/index.json?v=30fps203');
      if (Array.isArray(packs)) {
        const importedOnly = this.campaignIndexPacks.filter((p) => p?.isImported);
        this.campaignIndexPacks = [
          ...packs.filter((p) => p && typeof p.packId === 'string' && p.packId !== DEFAULT_ADVENTURE_CAMPAIGN_ID),
          ...importedOnly
        ];
      }
    } catch (_) {
      // Optional campaign index when running offline without packs
    }
    this.renderCampaignSelectorOptions();
    if (initialCampaignParam && initialCampaignParam !== DEFAULT_ADVENTURE_CAMPAIGN_ID) {
      await this.selectCampaignPack(initialCampaignParam, {
        playSound: false,
        restartActiveMatch: Boolean(!this.isLandingOpen && this.isAdventureMode())
      });
    } else {
      this.syncRosterSelectionUI(false);
    }
  }

  setAdventureDifficulty(tierId, playSound = true) {
    const clean = normalizeAdventureDifficultyId(tierId);
    this.selectedAdvDifficulty = clean;
    this.adventure?.setDifficultyTier?.(clean);
    try {
      if (typeof window !== 'undefined' && window?.localStorage?.setItem) {
        window.localStorage.setItem(ADVENTURE_TIER_STORAGE_KEY, clean);
      }
    } catch {
      // Ignore storage errors safely
    }
    this.syncAdventureDifficultyUI();
    this.syncAdventureProgressModeUI();
    this.syncRosterSelectionUI(false);
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
    return clean;
  }

  syncAdventureDifficultyUI() {
    const cur = normalizeAdventureDifficultyId(this.selectedAdvDifficulty);
    if (!Array.isArray(this.advDiffBtns)) return;
    this.advDiffBtns.forEach((btn) => {
      const t = btn.getAttribute('data-adv-tier') || 'normal';
      const active = t === cur;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  setAdventureProgressMode(mode, playSound = true) {
    const clean = normalizeAdventureProgressMode(mode);
    this.selectedAdvProgressMode = clean;
    saveAdventureProgressMode(clean);
    this.adventure?.setProgressMode?.(clean);
    this.syncAdventureProgressModeUI();
    this.syncAdventureClearMedalsUI();
    if (playSound && this.audio) {
      this.audio.play('clock_gear', 600);
    }
    return clean;
  }

  syncAdventureProgressModeUI() {
    const cur = normalizeAdventureProgressMode(this.selectedAdvProgressMode);
    if (!Array.isArray(this.advProgBtns)) return;
    this.advProgBtns.forEach((btn) => {
      const m = btn.getAttribute('data-adv-progress') || 'fresh';
      const active = m === cur;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  syncAdventureClearMedalsUI() {
    if (!this.cards || typeof document === 'undefined') return;
    const isAdv = this.isAdventureMode();
    const medals = isAdv ? loadAdventureMedals() : {};
    const keepLvlActive = isAdv && normalizeAdventureProgressMode(this.selectedAdvProgressMode) === 'keep';
    const savedProgress = keepLvlActive ? loadAllAdventureHeroProgress() : {};
    Object.entries(this.cards).forEach(([heroKey, cardEl]) => {
      if (!cardEl) return;
      const btn = cardEl.querySelector?.('.champ-tile-btn') || cardEl;
      let pip = cardEl.querySelector?.('.adv-clear-medal-pip') || null;
      const rec = isAdv ? medals[heroKey] : null;
      if (!isAdv || !rec) {
        if (pip) {
          pip.textContent = '';
          pip.classList.add('hidden');
          pip.removeAttribute('data-medal-tier');
        }
      } else {
        if (!pip && typeof document.createElement === 'function') {
          pip = document.createElement('span');
          pip.className = 'adv-clear-medal-pip';
          btn.appendChild(pip);
        }
        if (pip) {
          const tierCfg =
            ADVENTURE_DIFFICULTY_TIERS[rec.bestTier] || ADVENTURE_DIFFICULTY_TIERS.normal;
          pip.textContent = rec.rank || 'B';
          pip.setAttribute('data-medal-tier', tierCfg.medalTier || 'bronze');
          pip.title = `Best Adventure Clear: ${rec.rank} (${tierCfg.label} • ${rec.score} PTS)`;
          pip.classList.remove('hidden');
        }
      }

      let lvlPip = cardEl.querySelector?.('.adv-saved-lvl-pip') || null;
      const progRec = keepLvlActive ? savedProgress[heroKey] : null;
      if (!keepLvlActive || !progRec) {
        if (lvlPip) {
          lvlPip.textContent = '';
          lvlPip.removeAttribute?.('title');
          lvlPip.classList.add('hidden');
        }
        if (btn && btn !== cardEl && btn.dataset?.advLvlTooltip === '1') {
          btn.removeAttribute?.('title');
          delete btn.dataset.advLvlTooltip;
        }
      } else {
        if (!lvlPip && typeof document.createElement === 'function') {
          lvlPip = document.createElement('span');
          lvlPip.className = 'adv-saved-lvl-pip';
          btn.appendChild(lvlPip);
        }
        if (lvlPip) {
          const spentRanks = Object.values(progRec.ranks || {}).reduce((acc, v) => acc + (v || 0), 0);
          const xpDetail =
            progRec.level >= 10
              ? 'MAX'
              : `${progRec.xp || 0}/${progRec.xpToNext || 115} XP`;
          const spDetail =
            spentRanks > 0 && progRec.skillPoints > 0
              ? `${spentRanks} Rank${spentRanks === 1 ? '' : 's'} Active • ${progRec.skillPoints} SP Unspent`
              : spentRanks > 0
                ? `${spentRanks} Skill Rank${spentRanks === 1 ? '' : 's'} Active`
                : `${progRec.skillPoints} SP Ready`;
          const tip = `Saved Adventure Progress: LV.${progRec.level} (${xpDetail}) • ${spDetail}`;
          lvlPip.textContent = `LV.${progRec.level}`;
          lvlPip.title = tip;
          lvlPip.classList.remove('hidden');
          if (btn && btn !== cardEl) {
            btn.title = tip;
            if (btn.dataset) btn.dataset.advLvlTooltip = '1';
          }
        }
      }
    });
  }

  renderCampaignSelectorOptions() {
    const sel =
      this.advCampaignSelect ||
      (typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById('adv-campaign-select')
        : null);
    if (!sel || typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return;
    }
    sel.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = DEFAULT_ADVENTURE_CAMPAIGN_ID;
    defaultOpt.textContent = 'ORIGINAL PILGRIMAGE (4 REALMS • 9600PX)';
    sel.appendChild(defaultOpt);

    const seen = new Set([DEFAULT_ADVENTURE_CAMPAIGN_ID]);
    for (let i = 0; i < this.campaignIndexPacks.length; i++) {
      const meta = this.campaignIndexPacks[i];
      if (!meta || !meta.packId || seen.has(meta.packId)) continue;
      seen.add(meta.packId);
      const opt = document.createElement('option');
      opt.value = meta.packId;
      const zCnt = meta.zoneCount || 4;
      const ww = meta.worldWidth || zCnt * 2400;
      const prefix = meta.isImported ? '[JSON] ' : '';
      const rawTitle = String(meta.title || meta.packId).toUpperCase();
      opt.textContent = `${prefix}${rawTitle} (${zCnt}Z • ${ww}PX)`;
      sel.appendChild(opt);
    }

    if (
      this.selectedCampaignId !== DEFAULT_ADVENTURE_CAMPAIGN_ID &&
      !seen.has(this.selectedCampaignId)
    ) {
      const fallbackOpt = document.createElement('option');
      fallbackOpt.value = this.selectedCampaignId;
      fallbackOpt.textContent = `${this.selectedCampaignId.toUpperCase()} (STAGE PACK)`;
      sel.appendChild(fallbackOpt);
    }
    sel.value = this.selectedCampaignId || DEFAULT_ADVENTURE_CAMPAIGN_ID;
  }

  async selectCampaignPack(packId, { playSound = true, restartActiveMatch = false } = {}) {
    const targetId =
      !packId || packId === DEFAULT_ADVENTURE_CAMPAIGN_ID
        ? DEFAULT_ADVENTURE_CAMPAIGN_ID
        : String(packId).trim();

    if (targetId === DEFAULT_ADVENTURE_CAMPAIGN_ID) {
      this.selectedCampaignId = DEFAULT_ADVENTURE_CAMPAIGN_ID;
      this._pendingMatchPackId = null;
      this.adventure?.clearCampaignPack();
      this.renderCampaignSelectorOptions();
      this.syncRosterSelectionUI(false);
      if (playSound && this.audio) this.audio.play('clock_gear', 600);
      if (restartActiveMatch && !this.isLandingOpen && this.isAdventureMode()) {
        this.resetMatch();
      }
      return null;
    }

    this.selectedCampaignId = targetId;
    this.renderCampaignSelectorOptions();
    this.syncRosterSelectionUI(false);
    if (playSound && this.audio) this.audio.play('clock_gear', 600);

    let normalized = this.loadedCampaignPacks.get(targetId) || null;
    if (!normalized) {
      const meta = this.campaignIndexPacks.find((p) => p.packId === targetId);
      try {
        normalized = await this.adventure.loadCampaignPackById(
          targetId,
          meta?.file || null,
          'v=30fps203'
        );
      } catch (err) {
        console.warn(`Campaign pack "${targetId}" failed to load, reverting to default:`, err);
        this.selectedCampaignId = DEFAULT_ADVENTURE_CAMPAIGN_ID;
        this._pendingMatchPackId = null;
        this.adventure?.clearCampaignPack();
        this.renderCampaignSelectorOptions();
        this.syncRosterSelectionUI(false);
        return null;
      }
      if (normalized) {
        this.loadedCampaignPacks.set(targetId, normalized);
        this.loadedCampaignPacks.set(normalized.packId, normalized);
      }
    }

    if (this.selectedCampaignId !== targetId && this.selectedCampaignId !== normalized?.packId) {
      return normalized;
    }

    this.renderCampaignSelectorOptions();
    this.syncRosterSelectionUI(false);

    if (
      normalized &&
      !this.isLandingOpen &&
      this.isAdventureMode() &&
      (restartActiveMatch || this._pendingMatchPackId === targetId)
    ) {
      this._pendingMatchPackId = null;
      this.resetMatch();
      if (this._urlSimSec > 0) {
        const steps = Math.round(this._urlSimSec / 0.02);
        this._urlSimSec = 0;
        for (let i = 0; i < steps; i++) {
          this.ultSlowTimer = 0;
          this.renderer.hitStopTimer = 0;
          this.stepSimulation(0.02);
        }
        this.updateHUD();
      }
    }
    return normalized;
  }

  importCampaignPackJsonText(jsonText, filename = 'custom_pack.json') {
    const raw = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
    if (raw && typeof raw === 'object' && !raw.packId && filename) {
      raw.packId = String(filename)
        .replace(/\.json$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_');
    }
    const normalized = normalizeAdventureCampaignPack(raw);
    this.loadedCampaignPacks.set(normalized.packId, normalized);
    const metaEntry = {
      packId: normalized.packId,
      title: normalized.title,
      subtitle: normalized.subtitle,
      version: normalized.version,
      zoneCount: normalized.zoneCount,
      worldWidth: normalized.worldWidth,
      finalBossName: normalized.finalBoss?.enabled === false ? 'NONE' : normalized.finalBoss?.name,
      finalBossMaxHp: normalized.finalBoss?.maxHp || 11800,
      isImported: true
    };
    const existingIdx = this.campaignIndexPacks.findIndex((p) => p.packId === normalized.packId);
    if (existingIdx >= 0) {
      this.campaignIndexPacks[existingIdx] = metaEntry;
    } else {
      this.campaignIndexPacks.push(metaEntry);
    }
    this.selectedCampaignId = normalized.packId;
    this.adventure?.applyCampaignPack(normalized);
    this.renderCampaignSelectorOptions();
    this.syncRosterSelectionUI(true);
    return normalized;
  }

  getActiveSelectedCampaignSummary() {
    if (
      !this.selectedCampaignId ||
      this.selectedCampaignId === DEFAULT_ADVENTURE_CAMPAIGN_ID
    ) {
      return null;
    }
    const loaded = this.loadedCampaignPacks.get(this.selectedCampaignId);
    if (loaded) {
      return {
        packId: loaded.packId,
        title: loaded.title,
        zoneCount: loaded.zoneCount,
        worldWidth: loaded.worldWidth,
        bossEnabled: loaded.finalBoss?.enabled !== false,
        bossName:
          loaded.finalBoss?.enabled === false
            ? 'REALM GAUNTLET'
            : loaded.finalBoss?.name || 'BEHEMOTH MALPHAS',
        bossMaxHp: loaded.finalBoss?.maxHp || 11800
      };
    }
    const meta = this.campaignIndexPacks.find((p) => p.packId === this.selectedCampaignId);
    if (meta) {
      return {
        packId: meta.packId,
        title: meta.title || meta.packId,
        zoneCount: meta.zoneCount || 4,
        worldWidth: meta.worldWidth || 9600,
        bossEnabled: meta.finalBossName !== 'NONE',
        bossName: meta.finalBossName && meta.finalBossName !== 'NONE' ? meta.finalBossName : 'BEHEMOTH MALPHAS',
        bossMaxHp: meta.finalBossMaxHp || 11800
      };
    }
    return {
      packId: this.selectedCampaignId,
      title: this.selectedCampaignId.toUpperCase().replace(/_/g, ' '),
      zoneCount: 4,
      worldWidth: 9600,
      bossEnabled: true,
      bossName: 'BEHEMOTH MALPHAS',
      bossMaxHp: 11800
    };
  }

  syncRosterSelectionUI(playSound = false, soundHeroKey = null) {
    const is2v2 = this.is2v2Mode();
    const isAdv = Boolean(this.isAdventureMode?.());
    const isEndless = Boolean(this.isEndlessMode?.());
    const isSide = isAdv || isEndless;
    if (isSide) {
      this.activeAssignSlot = 1;
      this.inspectLeftRole = 'lead';
    }
    this.syncRosterVersionTabs();
    const c1 = CHAMPION_ROSTER[this.slot1Hero] || CHAMPION_ROSTER.titan;
    const c1b = CHAMPION_ROSTER[this.slot1PartnerHero] || CHAMPION_ROSTER.priestess;
    const c2 = CHAMPION_ROSTER[this.slot2Hero] || CHAMPION_ROSTER.archer;
    const c2b = CHAMPION_ROSTER[this.slot2PartnerHero] || CHAMPION_ROSTER.reaper;

    // 1. Mode Selector Bar, Inline Quick-Config Bar, Stage Selector Bar & Pause Menu VS Mode/Assist Controls
    if (this.modeBtns) {
      Object.entries(this.modeBtns).forEach(([modeKey, btn]) => {
        if (!btn) return;
        const active = this.gameMode === modeKey;
        btn.classList.toggle('active-mode', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }
    if (this.quickModeBtns) {
      this.quickModeBtns.forEach((btn) => {
        const active = !isSide && btn.getAttribute('data-quick-mode') === this.gameMode;
        btn.classList.toggle('active-quick-mode', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }
    if (this.stageBtns) {
      const currentStageKey = this.forcedStage || 'auto';
      this.stageBtns.forEach((btn) => {
        const active = !isSide && btn.getAttribute('data-stage') === currentStageKey;
        btn.classList.toggle('active-stage', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }

    // Step 02 (#landing-step-mode) Mode Isolation: hide VS Sandbox/Auto-Tourney & Stage Picker in Adventure / Endless
    const setupRulesSection = document.getElementById('setup-section-rules');
    const stageGalleryGrid = document.getElementById('stage-gallery-grid');
    const advStageLockBanner = document.getElementById('adv-stage-lock-banner');
    const setupStageHeading = document.getElementById('setup-stage-heading');
    if (setupRulesSection) setupRulesSection.classList.toggle('hidden', isSide);
    if (stageGalleryGrid) stageGalleryGrid.classList.toggle('hidden', isSide);
    if (advStageLockBanner) advStageLockBanner.classList.toggle('hidden', !isSide);
    if (setupStageHeading) {
      setupStageHeading.textContent = isEndless
        ? 'INFINITE REALM CRUSADE'
        : isAdv
          ? 'CAMPAIGN REALM PROGRESSION'
          : 'CHOOSE ARENA STAGE';
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
      this.gameMode === 'endless'
        ? 'ENDLESS CRUSADE'
        : this.gameMode === 'adventure'
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
      shogunate_glacial: 'FROST SHOGUNATE',
      cob_monitor: 'COB-OS TERMINAL',
      cob_monitor_inferno: 'INFERNO COB-OS',
      cob_monitor_glacial: 'BOREALIS COB-OS'
    };
    const advCampaignBarEl =
      this.advCampaignBar || document.getElementById('adv-campaign-selector-bar');
    if (advCampaignBarEl) {
      advCampaignBarEl.classList.toggle('hidden', !isAdv);
      advCampaignBarEl.hidden = !isAdv;
    }
    const advCampaignSelectEl =
      this.advCampaignSelect || document.getElementById('adv-campaign-select');
    if (advCampaignSelectEl && isAdv) {
      if (advCampaignSelectEl.options.length <= 1 && this.campaignIndexPacks.length > 0) {
        this.renderCampaignSelectorOptions();
      }
      advCampaignSelectEl.value = this.selectedCampaignId || DEFAULT_ADVENTURE_CAMPAIGN_ID;
    }
    this.syncAdventureDifficultyUI();
    this.syncAdventureProgressModeUI();
    const customPackSummary = isAdv ? this.getActiveSelectedCampaignSummary() : null;
    const advDiffCfg =
      ADVENTURE_DIFFICULTY_TIERS[normalizeAdventureDifficultyId(this.selectedAdvDifficulty)] ||
      ADVENTURE_DIFFICULTY_TIERS.normal;

    const stageTitleStr = isEndless
      ? 'INFINITE 4-REALM LOOP • IDLE + ACTION'
      : isAdv
        ? customPackSummary
          ? `PACK: ${String(customPackSummary.title).toUpperCase()}`
          : 'AUTO: 4-ZONE CAMPAIGN MAP'
        : stageNames[this.forcedStage || 'auto'] || 'AUTO REALM';
    const hpStr = this.vsTestModeUnlimitedHp ? 'SANDBOX UNLIMITED HP: ON' : 'MORTAL HP';
    const summaryStr = isEndless
      ? `${modeTitleStr} • ${stageTitleStr} • PARTY + ASCENSION`
      : isAdv
        ? `${modeTitleStr} • ${stageTitleStr} • RPG PROGRESSION`
        : `${modeTitleStr} • ${stageTitleStr} • ${hpStr}`;

    const titleFooterEl = document.getElementById('title-status-footer');
    if (titleFooterEl) {
      titleFooterEl.textContent =
        'PLAYER VS AI • AI ARENA • SOLO CAMPAIGN • ENDLESS CRUSADE • LOSSLESS HD-2D';
    }
    const modeSummaryEl = document.getElementById('mode-step-summary');
    if (modeSummaryEl) modeSummaryEl.textContent = summaryStr;
    const rosterBadgeTextEl = document.getElementById('roster-config-badge-text');
    if (rosterBadgeTextEl) rosterBadgeTextEl.textContent = summaryStr;
    const isP1Mode = !isSide && this.vsControlMode === '1p';
    const isP1Arcade = isP1Mode && this.p1SubMode === 'arcade';
    const isP1Training = isP1Mode && this.p1SubMode === 'training';
    const arcadeFinalCfg = isP1Arcade ? getArcadeFinalRivalConfig(this.slot1Hero) : null;
    const arcadeFinalHeroCfg = arcadeFinalCfg ? CHAMPION_ROSTER[arcadeFinalCfg.rival] || c2 : null;
    const matchupVsEl = document.getElementById('matchup-vs-text');
    if (matchupVsEl) {
      matchupVsEl.textContent = isEndless
        ? 'ENDLESS'
        : isAdv
          ? 'SOLO'
          : isP1Arcade
            ? 'ARCADE 5'
            : isP1Training
              ? 'LAB'
              : is2v2
                ? 'TAG VS'
                : '1V1';
    }

    const slotLabelMap = {
      1: 'P1 LEAD',
      2: 'P2 LEAD',
      3: 'P1B ALLY',
      4: 'P2B ALLY'
    };
    const gridPromptEl = document.getElementById('portrait-grid-label');
    if (gridPromptEl) {
      gridPromptEl.textContent = isEndless
        ? 'PICK YOUR CRUSADE LEAD HERO (RECRUIT +2 ALLIES IN RUN)'
        : isAdv
          ? '23 CHAMPIONS (12 EX • 11 LEGACY)'
          : isP1Arcade
            ? 'PICK YOUR ARCADE CHAMPION'
            : isP1Training
              ? this.activeAssignSlot === 2
                ? 'PICKING: TRAINING DUMMY'
                : 'PICKING: YOUR CHAMPION (1P)'
              : `PICKING: ${slotLabelMap[this.activeAssignSlot] || 'P1 LEAD'}`;
    }

    const activeSide =
      isSide || isP1Arcade || this.activeAssignSlot === 1 || this.activeAssignSlot === 3 ? 'left' : 'right';
    if (this.versusLayoutEl) {
      this.versusLayoutEl.setAttribute('data-active-side', activeSide);
    }

    // 2. Matchup Banner 4-Slot Names, Tags & Active Slot Highlight
    const slotLeftTagEl = document.getElementById('slot-left-tag');
    const slotRightTagEl = document.getElementById('slot-right-tag');
    if (slotLeftTagEl) slotLeftTagEl.textContent = isEndless ? 'LEAD' : isAdv ? 'HERO' : isP1Mode ? 'YOU' : 'P1';
    if (slotRightTagEl) {
      slotRightTagEl.textContent = isEndless
        ? 'INFINITE'
        : isAdv
          ? 'BOSS'
          : isP1Arcade
            ? 'STAGE 5'
            : isP1Training
              ? 'DUMMY'
              : isP1Mode
                ? 'CPU'
                : 'P2';
    }

    if (this.slotLeftName) this.slotLeftName.textContent = c1.name;
    if (this.slotLeftPartnerName) this.slotLeftPartnerName.textContent = c1b.name;
    if (this.slotRightName) {
      this.slotRightName.textContent = isEndless
        ? 'ETERNAL HORDE'
        : isAdv
          ? customPackSummary
            ? String(customPackSummary.bossName).toUpperCase()
            : 'BEHEMOTH MALPHAS'
          : isP1Arcade && arcadeFinalHeroCfg
            ? arcadeFinalHeroCfg.name
            : c2.name;
    }
    if (this.slotRightPartnerName) this.slotRightPartnerName.textContent = c2b.name;

    if (this.slotBtnLeftPartner) this.slotBtnLeftPartner.classList.toggle('hidden', !is2v2);
    if (this.slotBtnRightPartner) this.slotBtnRightPartner.classList.toggle('hidden', !is2v2);
    if (this.p1DuoTabs) this.p1DuoTabs.classList.toggle('hidden', !is2v2);
    if (this.p2DuoTabs) this.p2DuoTabs.classList.toggle('hidden', !is2v2);

    if (this.slotBtnLeft) this.slotBtnLeft.classList.toggle('active-slot', isSide || isP1Arcade || this.activeAssignSlot === 1);
    if (this.slotBtnLeftPartner)
      this.slotBtnLeftPartner.classList.toggle('active-slot', !isSide && !isP1Arcade && this.activeAssignSlot === 3);
    if (this.slotBtnRight) {
      this.slotBtnRight.classList.toggle('active-slot', !isSide && !isP1Arcade && this.activeAssignSlot === 2);
      this.slotBtnRight.classList.toggle('is-boss-slot', isSide || isP1Arcade);
      this.slotBtnRight.setAttribute('aria-disabled', String(isSide || isP1Arcade));
    }
    if (this.slotBtnRightPartner)
      this.slotBtnRightPartner.classList.toggle('active-slot', !isSide && !isP1Arcade && this.activeAssignSlot === 4);

    const p1CornerTagEl = document.getElementById('p1-corner-tag');
    const p2CornerTagEl = document.getElementById('p2-corner-tag');
    const p2SkillsHeaderEl = document.getElementById('p2-skills-header');
    const p2KitToggleLabelEl = document.getElementById('p2-kit-toggle-label');
    if (p1CornerTagEl) {
      p1CornerTagEl.textContent = isEndless
        ? 'CRUSADE LEAD'
        : isAdv
          ? 'SOLO HERO'
          : isP1Mode
            ? is2v2
              ? 'YOUR TEAM'
              : 'YOU (1P)'
            : is2v2
              ? 'TEAM 1'
              : 'P1 LEAD';
    }
    if (p2CornerTagEl) {
      p2CornerTagEl.textContent = isEndless
        ? 'INFINITE REALMS'
        : isAdv
          ? customPackSummary
            ? `STAGE PACK • ${customPackSummary.zoneCount}Z`
            : 'ZONE IV BOSS'
          : isP1Arcade
            ? 'STAGE 5 FINAL RIVAL'
            : isP1Training
              ? 'TRAINING DUMMY'
              : isP1Mode
                ? is2v2
                  ? 'CPU TEAM'
                  : 'CPU'
                : is2v2
                  ? 'TEAM 2'
                  : 'P2 LEAD';
    }
    const ctaHeadlineEl = document.getElementById('cta-headline-text');
    if (ctaHeadlineEl) {
      ctaHeadlineEl.textContent = isEndless
        ? 'START CRUSADE'
        : isAdv
          ? 'START CAMPAIGN'
          : isP1Arcade
            ? 'START ARCADE 5'
            : isP1Training
              ? 'ENTER TRAINING LAB'
              : 'START FIGHT';
    }
    const navCommenceLbl = document.getElementById('nav-commence-label');
    if (navCommenceLbl) {
      navCommenceLbl.textContent = isEndless
        ? 'START CRUSADE'
        : isAdv
          ? 'START CAMPAIGN'
          : isP1Arcade
            ? 'START ARCADE 5'
            : isP1Training
              ? 'ENTER LAB'
              : 'START MATCH';
    }
    if (p2SkillsHeaderEl) {
      p2SkillsHeaderEl.textContent = isEndless
        ? 'ENDLESS IDLE • ACTION-RPG FEATURES'
        : isAdv
          ? '3-PHASE RAID MECHANICS & CATACLYSM'
          : '4-SLOT SOVEREIGN KIT & SUPREME ULTIMATE';
    }
    if (p2KitToggleLabelEl) {
      p2KitToggleLabelEl.textContent = isEndless ? 'CRUSADE INFO' : isAdv ? 'BOSS KIT' : 'KIT & TIERS';
    }

    if (!this.isMatchOver) {
      if (this.btnNextChallenger) {
        this.btnNextChallenger.classList.toggle('hidden', Boolean(isSide || isP1Training));
      }
      if (this.btnSwapSides) {
        this.btnSwapSides.classList.toggle('hidden', Boolean(isSide || isP1Arcade || isP1Training));
      }
      if (this.btnPlayAgain) {
        this.btnPlayAgain.textContent = isEndless ? 'RESUME CRUSADE' : isAdv ? 'RETRY CAMPAIGN' : 'REMATCH';
      }
    }
    this.syncVsControlUI?.();

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

    // 3. Roster Card Badges (Clean P1 / P2 / HERO corner tags; hidden when unselected)
    Object.keys(CHAMPION_ROSTER).forEach((key) => {
      const card = this.cards[key];
      const ribbon = this.ribbons[key];
      const isP1 = this.slot1Hero === key;
      const isP1B = !isSide && is2v2 && this.slot1PartnerHero === key;
      const isP2 = !isSide && !isP1Arcade && this.slot2Hero === key;
      const isP2B = !isSide && is2v2 && this.slot2PartnerHero === key;
      if (card) {
        card.classList.toggle('selected-p1', isP1);
        card.classList.toggle('selected-p1b', isP1B);
        card.classList.toggle('selected-p2', isP2);
        card.classList.toggle('selected-p2b', isP2B);
      }
      if (ribbon) {
        ribbon.textContent = isEndless
          ? isP1
            ? 'LEAD'
            : ''
          : isAdv
            ? isP1
              ? 'HERO'
              : ''
            : isP1Arcade
              ? isP1
                ? '1P'
                : ''
              : isP1
                ? 'P1'
                : isP1B
                  ? 'P1B'
                  : isP2
                    ? isP1Training
                      ? 'DUMMY'
                      : 'P2'
                    : isP2B
                      ? 'P2B'
                      : '';
      }
    });
    this.syncAdventureClearMedalsUI();
    this.syncArcadeTrophyPipsUI();

    // 4. Populate Left (P1 / P1B) and Right (P2 / P2B or Adventure/Endless Preview) Profile Panels & Kit Drawers
    const romanTierMap = ['I', 'II', 'III'];
    const syncProfilePanel = (prefix, sideName, cfg, partnerCfg, slotKey) => {
      if (!cfg) return;
      const asideEl = document.getElementById(`profile-${sideName}`);
      const nameEl = document.getElementById(`${prefix}-profile-name`);
      const roleEl = document.getElementById(`${prefix}-profile-role`);
      const styleEl = document.getElementById(`${prefix}-profile-style`);
      const traitEl = document.getElementById(`${prefix}-profile-trait`);
      const haloEl = document.getElementById(`${prefix}-halo`);
      const trueUltNameEl = document.getElementById(`${prefix}-true-ult-name`);
      const trueUltDescEl = document.getElementById(`${prefix}-true-ult-desc`);
      const headerEl = document.getElementById(`${prefix}-skills-header`);
      const presetBarEl = document.getElementById(`${prefix}-build-preset-bar`);
      const presetLblEl = document.getElementById(`${prefix}-build-preset-label`);
      const drawerHeroNameEl = document.getElementById(`${prefix}-drawer-hero-name`);
      const drawerRoleEl = document.getElementById(`${prefix}-drawer-role`);
      const drawerPresetBarEl = document.getElementById(`${prefix}-drawer-preset-bar`);
      const drawerPresetLblEl = document.getElementById(`${prefix}-drawer-preset-label`);
      const hoverCapEl = document.getElementById(`${prefix}-kit-hover-caption`);

      const kit = HeroBuildSystem.getProfileDisplayKit(cfg.id || '', cfg, slotKey, isSide);
      const showBuild = Boolean(kit?.showBuildUI && !isSide);
      const isActivePedestal = activeSide === sideName;

      if (asideEl) {
        asideEl.className = `fighter-profile profile-${cfg.theme}${isActivePedestal ? ' is-active-pedestal' : ''}`;
      }
      if (nameEl) nameEl.textContent = cfg.name;
      if (drawerHeroNameEl) drawerHeroNameEl.textContent = cfg.name;
      const roleStr = is2v2 && partnerCfg ? `${cfg.role} • DUO: ${partnerCfg.name}` : cfg.role;
      if (roleEl) roleEl.textContent = roleStr;
      if (drawerRoleEl) drawerRoleEl.textContent = roleStr;
      if (styleEl) styleEl.textContent = cfg.style;
      if (traitEl) traitEl.textContent = kit?.trait || cfg.trait;
      if (haloEl) haloEl.className = `stage-halo halo-${cfg.theme}`;
      if (trueUltNameEl && cfg.trueUltName) trueUltNameEl.textContent = cfg.trueUltName;
      if (trueUltDescEl && cfg.trueUltDesc) trueUltDescEl.textContent = cfg.trueUltDesc;
      if (hoverCapEl) {
        hoverCapEl.textContent =
          isEndless && prefix === 'p2'
            ? 'ENDLESS CRUSADE • INFINITE REALMS'
            : isAdv && prefix === 'p2'
              ? 'TAP ICON FOR BOSS RAID KIT'
              : 'TAP ICON FOR KIT & TIERS';
      }

      if (headerEl) {
        headerEl.textContent =
          isEndless && prefix === 'p2'
            ? 'ENDLESS IDLE • ACTION-RPG FEATURES'
            : isAdv && prefix === 'p2'
              ? '3-PHASE RAID MECHANICS & CATACLYSM'
              : showBuild
                ? 'SOVEREIGN LOADOUT & KIT'
                : '4-SLOT SOVEREIGN KIT & SUPREME ULTIMATE';
      }

      const syncPresetStrip = (barEl, lblEl) => {
        if (!barEl) return;
        barEl.classList.toggle('hidden', !showBuild);
        barEl.classList.toggle('is-locked-std', Boolean(showBuild && !kit?.hasCustomBuilds));
        if (showBuild && kit?.slotBuild) {
          if (lblEl) lblEl.textContent = kit.activeSummary || 'SOVEREIGN';
          barEl.querySelectorAll('[data-preset]').forEach((btn) => {
            const pAttr = btn.getAttribute('data-preset');
            const isRngBtn = pAttr === 'rng';
            const pIdx = isRngBtn ? -99 : Number(pAttr);
            const active = isRngBtn
              ? Boolean(kit.slotBuild.rng)
              : !kit.slotBuild.rng && kit.slotBuild.presetIndex === pIdx;
            btn.classList.toggle('active-preset', active);
            if (!isRngBtn && kit.presets?.[pIdx]) {
              btn.title = `Preset ${kit.presets[pIdx].roman}: ${kit.presets[pIdx].name}`;
            }
          });
        }
      };
      syncPresetStrip(presetBarEl, presetLblEl);
      syncPresetStrip(drawerPresetBarEl, drawerPresetLblEl);

      const displaySkills = Array.isArray(kit?.skills) ? kit.skills : cfg.skills;
      if (Array.isArray(displaySkills)) {
        const tierVals = kit?.slotBuild
          ? [kit.slotBuild.aspect, kit.slotBuild.skill, kit.slotBuild.ult]
          : [0, 0, 0];
        displaySkills.forEach((sk, idx) => {
          if (!sk) return;
          const sName = document.getElementById(`${prefix}-skill-name-${idx}`);
          const sType = document.getElementById(`${prefix}-skill-type-${idx}`);
          const sDesc = document.getElementById(`${prefix}-skill-desc-${idx}`);
          const tabsEl = document.getElementById(`${prefix}-tier-tabs-${idx}`);
          const stripTierEl = document.getElementById(`${prefix}-strip-tier-${idx}`);
          if (sName) sName.textContent = sk.name;
          if (sType) sType.textContent = sk.type;
          if (sDesc) sDesc.textContent = sk.desc;
          if (stripTierEl) {
            const curTier = tierVals[idx] || 0;
            stripTierEl.classList.toggle('hidden', !showBuild || !kit?.hasCustomBuilds);
            stripTierEl.textContent = kit?.slotBuild?.rng ? '?' : romanTierMap[curTier] || 'I';
            stripTierEl.setAttribute('data-tier-val', kit?.slotBuild?.rng ? 'rng' : String(curTier));
          }
          if (tabsEl) {
            tabsEl.classList.toggle('hidden', !showBuild);
            tabsEl.classList.toggle('is-locked-std', Boolean(showBuild && !kit?.hasCustomBuilds));
            if (showBuild) {
              const curTier = tierVals[idx] || 0;
              tabsEl.querySelectorAll('[data-tier]').forEach((tBtn) => {
                const tVal = Number(tBtn.getAttribute('data-tier'));
                tBtn.classList.toggle('active-tier', !kit?.slotBuild?.rng && tVal === curTier);
              });
            }
          }
        });
      }
    };

    const leftSlotKey = is2v2 && this.inspectLeftRole === 'partner' ? 'p1b' : 'p1';
    const rightSlotKey = is2v2 && this.inspectRightRole === 'partner' ? 'p2b' : 'p2';
    const baseLeftInspected = is2v2 && this.inspectLeftRole === 'partner' ? c1b : c1;
    const leftInspected = baseLeftInspected;
    const leftOther = is2v2 && this.inspectLeftRole === 'partner' ? c1 : c1b;
    const scaledAdvBossHp = Math.round(
      (customPackSummary ? customPackSummary.bossMaxHp : 11800) * (advDiffCfg.hpMult || 1)
    );
    const advTierSuffix = advDiffCfg.id !== 'normal' ? ` • ${advDiffCfg.label}` : '';
    const rightInspected = isEndless
      ? {
          name: 'ENDLESS CRUSADE',
          role: 'INFINITE 4-REALM LOOP • AUTO + ACTION-RPG',
          theme: 'astral',
          style: 'PARTY OF 3 • TAP-SMITE • RELICS • ASCENSION',
          trait: 'ZERO GAME OVER: AUTO-FARM & RECHALLENGE BOSSES ANYTIME',
          trueUltName: 'ASCENSION & OFFLINE PROGRESS',
          trueUltDesc:
            'Reach Stage 25+ to Ascend for permanent Ascension Crystals & Blessings. Earn up to 12 hours of idle Gold & Shards while away!',
          skills: [
            {
              name: 'RECRUIT +2 AI COMPANIONS',
              type: '3-HERO PARTY',
              desc: 'Unlock & deploy up to 2 roster champions from the Crusade Shop to unleash real-time combos & Ultimates alongside you.'
            },
            {
              name: 'ARCANE TAP-SMITE & MAGNET',
              type: 'ACTIVE + IDLE',
              desc: 'Cruise hands-free with AUTO AI, take manual control anytime, or tap the battlefield to call Tap-Smite lightning & scoop Gold.'
            },
            {
              name: 'WARDEN BOSSES & MALPHAS',
              type: 'INFINITE SCALING',
              desc: 'Defeat Stage Wardens & every 10th-stage Behemoth Malphas within the timer, or toggle Farm Mode to power up infinitely.'
            }
          ]
        }
      : isAdv
        ? {
            name: customPackSummary
              ? String(customPackSummary.bossName).toUpperCase()
              : 'BEHEMOTH MALPHAS',
            role: customPackSummary
              ? `${String(customPackSummary.title).toUpperCase()} • ${scaledAdvBossHp.toLocaleString('en-US')} HP${advTierSuffix}`
              : `COLOSSAL ABYSSAL TITAN • ${scaledAdvBossHp.toLocaleString('en-US')} HP${advTierSuffix}`,
            theme: 'abyssal',
            style: customPackSummary
              ? `${customPackSummary.zoneCount}-REALM (${customPackSummary.worldWidth}PX) STAGE PACK`
              : 'LEFT-CLIFF SIEGE COLOSSUS • 3-PHASE RAID BOSS',
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
        : isP1Arcade && arcadeFinalHeroCfg
          ? {
              ...arcadeFinalHeroCfg,
              role: `${arcadeFinalCfg.title} • +18% BOSS HP`
            }
          : is2v2 && this.inspectRightRole === 'partner'
            ? c2b
            : c2;
    const rightOther = is2v2 && this.inspectRightRole === 'partner' ? c2 : c2b;

    syncProfilePanel('p1', 'left', leftInspected, leftOther, leftSlotKey);
    syncProfilePanel('p2', 'right', rightInspected, isSide || isP1Arcade ? null : rightOther, rightSlotKey);

    if (this.startDuelText) {
      if (this.isEndlessMode()) {
        this.startDuelText.textContent = `START CRUSADE • ${c1.name}`;
      } else if (this.isAdventureMode()) {
        this.startDuelText.textContent = customPackSummary
          ? `START PACK • ${c1.name}`
          : `START ADVENTURE • ${c1.name}`;
      } else if (isP1Arcade) {
        this.startDuelText.textContent = `5-STAGE LADDER • ${c1.name} -> ${arcadeFinalHeroCfg?.name || c2.name}`;
      } else if (isP1Training) {
        this.startDuelText.textContent = `${c1.name} VS. ${c2.name} (DUMMY)`;
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
      if (sfxHero) {
        this.audio.play(sfxHero.selectSfx, 600);
        this.audio.playHeroVoice?.(sfxHero.id, 'select', {
          worldX: 600,
          speakerKey: 'roster_ui',
          priority: 2,
          cooldownMs: 220,
          maxAsyncDelayMs: 950
        });
      }
    }
  }

  beginLiveRoundIntro(opts = {}) {
    const forceInTest = Boolean(opts.forceInTest);
    if (
      !forceInTest &&
      (this.simMode ||
        this.isP1TrainingMode?.() ||
        typeof window === 'undefined' ||
        typeof HTMLImageElement === 'undefined' ||
        this.isLandingOpen)
    ) {
      this.roundIntroTimer = 0;
      this.roundIntroDuration = 0;
      this._roundIntroFighter = null;
      this._roundIntroVoiceFired = false;
      return 0;
    }

    const p1 = this.getPointFighter(1);
    const isSideIntro = Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.());
    const p2 = isSideIntro ? null : this.getPointFighter(2);
    const introCandidates = isSideIntro
      ? [p1]
      : opts.preferChallenger
        ? [p2, p1]
        : [p1, p2];
    const audioReady = Boolean(
      this.audio &&
        this.audio.enabled &&
        this.audio.voiceEnabled &&
        (this.audio.getVoiceVolume?.() ?? 1) > 0.01
    );
    const voicedQueue = audioReady
      ? introCandidates.filter((f) => f && !f.isDead && this.audio?.hasVoicePack?.(f.heroId))
      : [];
    const canSpeak = voicedQueue.length > 0;

    if (canSpeak) {
      for (const spk of voicedQueue) {
        const pfx = this.audio.getVoicePackPrefix?.(spk.heroId);
        if (pfx) this.audio.loadVoiceKey?.(`${pfx}_intro`);
        this.audio.preloadHeroVoicePack?.(spk.heroId);
        PixelForge.ensureIntroBustLoaded?.(spk.heroId);
      }
      this.audio.preDuckSfxForVoice?.(3, 550);
    }

    const act1Dur = voicedQueue.length >= 2 ? (forceInTest ? 1.25 : 1.65) : 1.25;
    const slotDur = voicedQueue.length >= 2 ? (forceInTest ? 3.50 : 4.75) : 2.90;
    this._roundIntroAct1Dur = act1Dur;
    this._roundIntroSlotDur = slotDur;
    this._roundIntroQueue = voicedQueue;
    this._roundIntroSpeakerIdx = 0;
    this._introSpeakerElapsed = 0;
    this._introVoiceHeardBusy = false;
    this._introPostVoiceSilenceSec = 0;
    this._introMouthStage = undefined;
    this._introMouthHoldSec = 0;
    this.roundIntroDuration = canSpeak
      ? voicedQueue.length >= 2
        ? act1Dur + voicedQueue.length * slotDur
        : 4.15
      : 1.35;
    this.roundIntroTimer = this.roundIntroDuration;
    this.roundIntroElapsed = 0;
    this._roundIntroFighter = canSpeak ? voicedQueue[0] : null;
    this._roundIntroVoiceFired = false;
    this._roundEngageBannerTimer = 0;
    return this.roundIntroTimer;
  }

  skipRoundIntro() {
    if (!(this.roundIntroTimer > 0)) return false;
    if (Array.isArray(this.fighters)) {
      for (let i = 0; i < this.fighters.length; i++) {
        const f = this.fighters[i];
        if (!f || f.isDead || f.isBenched) continue;
        f.state = 'IDLE';
        f.vx = 0;
        f.vy = 0;
        if (Number.isFinite(f.groundY)) f.y = f.groundY;
        f._overrideFrameIdx = null;
        f.trueUltFrameOverride = null;
      }
    }
    this.roundIntroTimer = 0;
    this._roundIntroQueue = [];
    this._roundIntroSpeakerIdx = 0;
    this._introSpeakerElapsed = 0;
    this._introMouthStage = undefined;
    this._roundIntroFighter = null;
    this._roundIntroVoiceFired = true;
    this._roundEngageBannerTimer = 0.75;
    this.audio?.stopAllHeroVoices?.(0.05);
    if (this.isVsManualP1Active() && !this.simMode) {
      this.showVsKeyHintBar(4.0);
    }
    return true;
  }

  startDuel(playSound = true) {
    this.setNavAudioOpen?.(false, false);
    this.closeKitDrawer?.(false);
    this.isLandingOpen = false;
    this.setPaused(false, false);
    this._pausedFrameRendered = false;
    this.audio?.stopAllHeroVoices?.(0.03);
    clearTimeout(this._introVoiceTimeout);
    this.victoryOverlay?.classList.remove('is-defeat-plaque');
    this.victoryOverlay?.classList.remove('is-arcade-champion-plaque');
    if (this.isP1ArcadeMode()) {
      this.startArcadeRun(this.slot1Hero);
    } else if (this.isP1TrainingMode()) {
      this.gameMode = '1v1';
      this.arcadeRun = null;
      const lab = this._ensureTrainingLabState();
      lab.idleGaugeTimer = 0;
      lab.currentCombo = 0;
      lab.comboDamage = 0;
      lab.lastHit = 0;
      lab.maxCombo = 0;
      lab.comboDisplayTimer = 0;
    } else {
      this.arcadeRun = null;
    }
    if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'CHANGE HERO';
    if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';
    if (this.landingOverlay) this.landingOverlay.classList.add('hidden');
    if (this.appEl) {
      this.appEl.classList.remove('is-landing-open');
      this.appEl.classList.toggle('is-adventure-active', Boolean(this.isSideScrollMode()));
      this.appEl.classList.toggle('is-endless-active', Boolean(this.isEndlessMode()));
    }
    this.resetMatch();
    if (typeof window !== 'undefined' && typeof HTMLImageElement !== 'undefined' && !this.simMode) {
      setTimeout(() => {
        this.audio?.ensureCombatWavFiles?.();
        this.prewarmSelectedAssets();
      }, 120);
    } else {
      this.audio?.ensureCombatWavFiles?.();
    }
    if (this.isEndlessMode()) {
      this.endless?.syncControlDeckUI?.();
    } else {
      this.adventure?.syncControlDeckUI?.();
    }
    this.syncVsControlUI?.();
    this.syncPauseMenuUI?.();
    if (playSound) {
      this.beginLiveRoundIntro?.();
      if (this.audio) {
        this.audio.play('ult_cast', 600);
      }
    }
  }

  openLanding(targetStep = 'roster') {
    this.setPaused(false, false);
    this.setNavAudioOpen?.(false, false);
    this.isLandingOpen = true;
    this.roundIntroTimer = 0;
    this._roundIntroFighter = null;
    this._roundEngageBannerTimer = 0;
    clearTimeout(this.autoNextTimeout);
    this.autoNextTimeout = null;
    this._clearAutoNextTimers?.();
    clearTimeout(this._introVoiceTimeout);
    this.audio?.stopAllHeroVoices?.(0.03);
    this.victoryOverlay.classList.add('hidden');
    if (this.landingOverlay) this.landingOverlay.classList.remove('hidden');
    if (this.appEl) {
      this.appEl.classList.add('is-landing-open');
      this.appEl.classList.remove('is-adventure-active');
      this.appEl.classList.remove('is-endless-active');
      this.appEl.classList.remove('is-endless-boss-hud-visible');
      this.appEl.classList.remove('is-endless-drawer-open');
      if (this.appEl.style?.setProperty) {
        this._lastEndlessBossHudH = '0px';
        this.appEl.style.setProperty('--endless-boss-hud-h', '0px');
      }
    }
    this.updateAdventureBossHUD?.();
    if (this.isEndlessMode()) {
      this.endless?.syncControlDeckUI?.();
    } else {
      this.adventure?.syncControlDeckUI?.();
    }
    this.clearVsManualInputs?.();
    this.dismissVsKeyHintBar?.(true);
    this.syncVsControlUI?.();
    this.syncPauseMenuUI();
    if (targetStep) {
      this.setLandingStep(targetStep, false);
    }
    this.syncActiveBgm?.({ deferUntilGesture: !this.audio?._unlockedByGesture });
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

      const syncStripIcon = (slotIdx, srcCanvas) => {
        const stripCanvas = document.getElementById(`${prefix}-strip-icon-${slotIdx}`);
        if (!stripCanvas || !srcCanvas) return;
        const stx = stripCanvas.getContext('2d');
        stx.clearRect(0, 0, stripCanvas.width, stripCanvas.height);
        stx.imageSmoothingEnabled = false;
        stx.drawImage(srcCanvas, 0, 0, stripCanvas.width, stripCanvas.height);
      };

      if (Array.isArray(cfg.skills)) {
        cfg.skills.forEach((_sk, idx) => {
          const iconCanvas = document.getElementById(`${prefix}-skill-icon-${idx}`);
          if (!iconCanvas) return;
          if (iconCanvas._drawnHeroKey === primaryKey && iconCanvas._iconsReady && iconsReady) return;
          const ictx = iconCanvas.getContext('2d');
          PixelForge.drawSkillIcon(ictx, primaryKey, idx, iconCanvas.width, iconCanvas.height, t);
          syncStripIcon(idx, iconCanvas);
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
            syncStripIcon(3, supIconCanvas);
            supIconCanvas._drawnHeroKey = primaryKey;
            supIconCanvas._iconsReady = iconsReady;
          }
        }
      }
    };

    const p1Front = is2v2 && this.inspectLeftRole === 'partner' ? this.slot1PartnerHero : this.slot1Hero;
    const p1Back = is2v2 && this.inspectLeftRole === 'partner' ? this.slot1Hero : this.slot1PartnerHero;
    const p2Front = this.isP1ArcadeMode()
      ? getArcadeFinalRivalConfig(this.slot1Hero).rival
      : is2v2 && this.inspectRightRole === 'partner'
        ? this.slot2PartnerHero
        : this.slot2Hero;
    const p2Back = is2v2 && this.inspectRightRole === 'partner' ? this.slot2Hero : this.slot2PartnerHero;

    drawSideProfileVisuals('p1', p1Front, p1Back, false);
    if (this.isSideScrollMode?.() ?? this.isAdventureMode?.()) {
      const isEndlessPreview = Boolean(this.isEndlessMode?.());
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
        bctx.fillStyle = isEndlessPreview
          ? `rgba(168, 85, 247, ${(0.24 * pulse).toFixed(3)})`
          : `rgba(220, 38, 38, ${(0.22 * pulse).toFixed(3)})`;
        bctx.fillRect(70, 204, 180, 18);
        if (bossPort?.complete && bossPort.naturalWidth) {
          const bob = Math.round(Math.sin(t * 2.4) * 3);
          bctx.drawImage(bossPort, 76, 32 + bob, 168, 168);
          bctx.strokeStyle = isEndlessPreview ? '#facc15' : '#f97316';
          bctx.lineWidth = 2;
          bctx.strokeRect(76, 32 + bob, 168, 168);
        } else {
          drawAnimatedHeroOnStage(bctx, 'reaper', true, 56, 32, 208, 0, 1.0, false, cw, ch);
        }
        bctx.font = 'bold 10px monospace';
        const badgeLabel = isEndlessPreview ? 'INFINITE CRUSADE' : 'ZONE IV COLOSSUS';
        bctx.fillStyle = '#09070d';
        bctx.fillText(badgeLabel, 105, 15);
        bctx.fillStyle = isEndlessPreview ? '#facc15' : '#fb923c';
        bctx.fillText(badgeLabel, 104, 14);
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
      const syncBossStripIcon = (slotIdx, srcCanvas) => {
        const stripCanvas = document.getElementById(`p2-strip-icon-${slotIdx}`);
        if (!stripCanvas || !srcCanvas) return;
        const stx = stripCanvas.getContext('2d');
        stx.clearRect(0, 0, stripCanvas.width, stripCanvas.height);
        stx.imageSmoothingEnabled = false;
        stx.drawImage(srcCanvas, 0, 0, stripCanvas.width, stripCanvas.height);
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
          syncBossStripIcon(idx, iconCanvas);
          iconCanvas._drawnHeroKey = '__adv_boss__';
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
        syncBossStripIcon(3, supIconCanvas);
        supIconCanvas._drawnHeroKey = '__adv_boss__';
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
    if (Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.())) {
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
    if (Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.())) {
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
    this.autoNextTimeout = null;
    this._clearAutoNextTimers?.();
    clearTimeout(this.ultBannerTimeout);
    this._autoNextRemainingMs = 0;
    this._autoNextDeadlineMs = 0;
    this.roundIntroTimer = 0;
    this.roundIntroDuration = 0;
    this.roundIntroElapsed = 0;
    this._roundIntroQueue = [];
    this._roundIntroSpeakerIdx = 0;
    this._introSpeakerElapsed = 0;
    this._introMouthStage = undefined;
    this._roundIntroFighter = null;
    this._roundIntroVoiceFired = false;
    this._roundEngageBannerTimer = 0;
    this._deathVoiceWasBusy = false;
    this._postDeathVoiceBreathRemaining = 0;
    this.audio?.clearPendingDeathVoice?.();

    this.testModeUnlimitedHp = Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.())
      ? Boolean(this.explicitAdvUnlimitedHp)
      : Boolean(this.vsTestModeUnlimitedHp);

    if (this.isEndlessMode?.()) {
      if (this.adventure?.active) {
        this.adventure.stopCampaign();
      }
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
      if (this.btnSwapSides) this.btnSwapSides.classList.add('hidden');
      if (this.btnPlayAgain) this.btnPlayAgain.textContent = 'RESUME CRUSADE';
      this.clearVsManualInputs?.();
      this.dismissVsKeyHintBar?.(true);

      const gy = this.renderer.groundY;
      const heroKey = CHAMPION_ROSTER[this.slot1Hero] ? this.slot1Hero : 'warrior_ex';
      const compHeroKeys = this.endless?.companions?.getActiveHeroKeys?.() || [];
      PixelForge.releaseInactiveAssets?.([heroKey, ...compHeroKeys], [], true);
      PixelForge.ensureHeroLoaded?.(heroKey);
      PixelForge.ensureAdventureLoaded?.(0);
      PixelForge.ensureEndlessLoaded?.();
      const canAssetGate =
        typeof window !== 'undefined' &&
        typeof HTMLImageElement !== 'undefined' &&
        !this.simMode &&
        !this.isLandingOpen;
      this._matchAssetGateUntil =
        canAssetGate &&
        !PixelForge.areMatchAssetsReady?.({ heroIds: [heroKey], isAdventure: true, zoneIdx: 0 })
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
      HeroBuildSystem.applyBuildToFighter(this.leftFighter, null, true);

      this.applySideHUDTheme(this.hudEls.left, c1, this.leftFighter, null);
      PixelForge.setHUDPortraits(c1.id, c1.color, 'archfiend', '#a855f7');

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
      this.matchEndPhase = 'none';
      this.matchEndElapsed = 0;
      this.winnerShowcaseTimer = 0;
      this.matchEndWinner = null;
      this.matchEndWinnerLabel = '';
      this._victoryAudioPlayedInShowcase = false;
      this._winnerVoiceWasBusy = false;
      this._postWinnerVoiceBreathRemaining = 0;
      this.renderer?.clearEndMatchSpotlight?.();
      this.renderer?.deathFX?.clear?.();
      this.victoryOverlay.classList.remove('is-defeat-plaque');
      this.victoryOverlay.classList.add('hidden');
      if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'ROSTER SELECT';
      if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';
      if (this.ultBanner) this.ultBanner.classList.add('hidden');

      this.syncTestModeUI();
      this.syncVsControlUI?.();
      this.syncPauseMenuUI();
      this.endless.startRun(this.leftFighter, { resumeSaved: !this.simMode });
      this.updateHUD();
      if (!this.isLandingOpen && !this.simMode) {
        this.syncActiveBgm?.();
      }
      return;
    }

    if (this.endless?.active) {
      this.endless.stopRun({ save: true });
    }

    if (this.isAdventureMode()) {
      if (this.adventure?.active && this.leftFighter) {
        this.adventure.persistHeroProgressIfEnabled?.({ force: true });
      }
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
      if (this.btnSwapSides) this.btnSwapSides.classList.add('hidden');
      if (this.btnPlayAgain) this.btnPlayAgain.textContent = 'RETRY CAMPAIGN';
      if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
        const lMaxLbl = document.getElementById('tel-left-max-label');
        const rMaxLbl = document.getElementById('tel-right-max-label');
        if (lMaxLbl) lMaxLbl.textContent = 'MAX HIT';
        if (rMaxLbl) rMaxLbl.textContent = 'MAX HIT';
      }
      this.clearVsManualInputs?.();
      this.dismissVsKeyHintBar?.(true);

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
      HeroBuildSystem.applyBuildToFighter(this.leftFighter, null, true);

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
      this.matchEndPhase = 'none';
      this.matchEndElapsed = 0;
      this.winnerShowcaseTimer = 0;
      this.matchEndWinner = null;
      this.matchEndWinnerLabel = '';
      this._victoryAudioPlayedInShowcase = false;
      this._winnerVoiceWasBusy = false;
      this._postWinnerVoiceBreathRemaining = 0;
      this.renderer?.clearEndMatchSpotlight?.();
      this.renderer?.deathFX?.clear?.();
      this.victoryOverlay.classList.remove('is-defeat-plaque');
      this.victoryOverlay.classList.add('hidden');
      if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'ROSTER SELECT';
      if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';
      if (this.ultBanner) this.ultBanner.classList.add('hidden');

      this.syncTestModeUI();
      this.syncVsControlUI?.();
      this.syncPauseMenuUI();
      this.adventure.setDifficultyTier(this.selectedAdvDifficulty);
      this.adventure.setProgressMode(this.selectedAdvProgressMode);
      if (
        !this.selectedCampaignId ||
        this.selectedCampaignId === DEFAULT_ADVENTURE_CAMPAIGN_ID
      ) {
        this._pendingMatchPackId = null;
        this.adventure.startCampaign(this.leftFighter, DEFAULT_ADVENTURE_CAMPAIGN_ID);
      } else {
        const selectedPack = this.loadedCampaignPacks.get(this.selectedCampaignId);
        if (selectedPack) {
          this._pendingMatchPackId = null;
          this.adventure.startCampaign(this.leftFighter, selectedPack);
        } else {
          this._pendingMatchPackId = this.selectedCampaignId;
          this.adventure.startCampaign(this.leftFighter, DEFAULT_ADVENTURE_CAMPAIGN_ID);
          this.selectCampaignPack(this.selectedCampaignId, {
            playSound: false,
            restartActiveMatch: true
          }).catch(() => {});
        }
      }
      this.updateHUD();
      if (!this.isLandingOpen && !this.simMode) {
        this.syncActiveBgm?.();
      }
      return;
    }

    if (this.adventure?.active) {
      this.adventure.stopCampaign();
    }
    const isArcade = this.isArcadeLadderActive();
    const arcadeStage = isArcade ? this.getCurrentArcadeStage() : null;
    const isTraining = this.isP1TrainingMode();
    if (isArcade && arcadeStage) {
      this.slot2Hero = arcadeStage.heroId;
      this.testModeUnlimitedHp = false;
    } else if (isTraining) {
      this.testModeUnlimitedHp = false;
    }
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('hud-right')?.classList?.remove?.('hidden');
    }
    this.pauseSpBadge?.classList.add('hidden');
    if (this.btnNextChallenger) {
      this.btnNextChallenger.classList.remove('hidden', 'is-arcade-primary');
      this.btnNextChallenger.textContent = 'NEXT CHALLENGER';
    }
    if (this.btnSwapSides) this.btnSwapSides.classList.remove('hidden');
    if (this.btnPlayAgain) {
      this.btnPlayAgain.classList.remove('hidden');
      this.btnPlayAgain.textContent = 'REMATCH';
    }
    if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'CHANGE HERO';
    if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';
    if (this.victoryArcadeStrip) this.victoryArcadeStrip.classList.add('hidden');

    if (this.renderer) {
      if (typeof this.renderer.pickRandomStage === 'function') {
        this.renderer.pickRandomStage(isArcade && arcadeStage ? arcadeStage.stageId : this.forcedStage);
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
        typeof this.renderer.getInitialMatchZoom === 'function'
          ? this.renderer.getInitialMatchZoom()
          : this.renderer.isMobileLandscape &&
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

    const p1SpawnX = isTraining ? 460 : is2v2 ? ww * 0.25 : ww * 0.2;
    const p2SpawnX = isTraining ? 740 : is2v2 ? ww * 0.75 : ww * 0.8;
    this.leftFighter = new c1.cls(p1SpawnX, gy, 1);
    this.rightFighter = new c2.cls(p2SpawnX, gy, -1);
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
    if (!this.leftFighter.heroId) this.leftFighter.heroId = c1.id;
    if (!this.rightFighter.heroId) this.rightFighter.heroId = c2.id;
    HeroBuildSystem.applyBuildToFighter(
      this.leftFighter,
      HeroBuildSystem.resolveMatchBuild('p1', c1.id, { isAdventure: false }),
      false
    );
    HeroBuildSystem.applyBuildToFighter(
      this.rightFighter,
      HeroBuildSystem.resolveMatchBuild('p2', c2.id, { isAdventure: false }),
      false
    );

    const isFinalRivalStage = Boolean(isArcade && arcadeStage?.isFinalRival);
    if (isFinalRivalStage) {
      const bossHpMult = Number(arcadeStage.hpMult) || 1.18;
      const boostedMaxHp = Math.round(this.rightFighter.maxHp * bossHpMult);
      this.rightFighter.maxHp = boostedMaxHp;
      this.rightFighter.hp = boostedMaxHp;
    }
    if (this.rightRivalBadge) {
      this.rightRivalBadge.classList.toggle('hidden', !isFinalRivalStage);
    }
    if (this.hudRightPlate) {
      this.hudRightPlate.classList.toggle('is-final-rival-plate', isFinalRivalStage);
    }

    if (isTraining) {
      const lab = this._ensureTrainingLabState();
      this.leftFighter.trainingDummyMode = null;
      this.rightFighter.trainingDummyMode = lab.dummyMode;
      lab.idleGaugeTimer = 0;
      if (lab.gaugeMode === 'instant') {
        this.leftFighter.mana = this.leftFighter.maxMana;
        if (this.leftFighter.hasTrueUltimate) {
          this.leftFighter.finisherGauge = this.leftFighter.maxFinisherGauge;
        }
        this.leftFighter.skillCooldown = 0;
      }
    } else {
      this.leftFighter.trainingDummyMode = null;
      this.rightFighter.trainingDummyMode = null;
    }

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
      if (!this.leftPartner.heroId) this.leftPartner.heroId = c1b.id;
      if (!this.rightPartner.heroId) this.rightPartner.heroId = c2b.id;
      HeroBuildSystem.applyBuildToFighter(
        this.leftPartner,
        HeroBuildSystem.resolveMatchBuild('p1b', c1b.id, { isAdventure: false }),
        false
      );
      HeroBuildSystem.applyBuildToFighter(
        this.rightPartner,
        HeroBuildSystem.resolveMatchBuild('p2b', c2b.id, { isAdventure: false }),
        false
      );
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
        shogunate_glacial: 'FROST SHOGUNATE',
        cob_monitor: 'COB-OS TERMINAL',
        cob_monitor_inferno: 'INFERNO COB-OS',
        cob_monitor_glacial: 'BOREALIS COB-OS'
      };
      this.hudEls.stageBadge.textContent = stgNames[this.renderer?.stageId] || 'GOTHIC SANCTUARY';
    }

    this.matchTime = 0;
    this.ultSlowTimer = 0;
    this.koSlowTimer = 0;
    this.koSlowMaxTimer = 0.85;
    this.clashCooldown = 0;
    this._ensureVsManualState();
    this.vsComboState.left.hits = 0;
    this.vsComboState.left.damage = 0;
    this.vsComboState.left.timer = 0;
    this.vsComboState.right.hits = 0;
    this.vsComboState.right.damage = 0;
    this.vsComboState.right.timer = 0;
    this.vsInput.lastTouchHeroId = null;
    this.clearVsManualInputs();
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
    this.matchEndPhase = 'none'; // 'none' | 'defeat_spotlight' | 'winner_showcase' | 'overlay'
    this.matchEndElapsed = 0;
    this.winnerShowcaseTimer = 0;
    this.matchEndWinner = null;
    this.matchEndWinnerLabel = '';
    this._victoryAudioPlayedInShowcase = false;
    this._winnerVoiceWasBusy = false;
    this._postWinnerVoiceBreathRemaining = 0;
    this.renderer?.clearEndMatchSpotlight?.();
    this.renderer?.deathFX?.clear?.();
    this.victoryOverlay.classList.remove('is-defeat-plaque');
    this.victoryOverlay.classList.remove('is-arcade-champion-plaque');
    this.victoryOverlay.classList.add('hidden');
    if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'CHANGE HERO';
    if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';
    if (this.ultBanner) this.ultBanner.classList.add('hidden');
    this.syncVsManualControlFlags();
    this.syncVsControlUI();
    this.syncTrainingLabUI();
    if (this.isVsManualP1Active() && !this.isLandingOpen && !this.simMode) {
      this.showVsKeyHintBar(4.0);
    } else {
      this.dismissVsKeyHintBar(true);
    }
    this.updateHUD();
    if (!this.isLandingOpen && !this.simMode) {
      this.syncActiveBgm?.();
    }
  }

  syncFighterBuildBadge(badgeEl, fighter, isAdv = false) {
    if (!badgeEl) return;
    const cfg = !isAdv && fighter && !fighter.isMonster ? fighter.buildConfig : null;
    if (!cfg) {
      if (!badgeEl.classList.contains('hidden')) {
        badgeEl.className = 'hud-build-badge hidden';
      }
      return;
    }
    const compact = Boolean(
      this.renderer?.isMobilePortrait ||
        this.renderer?.isMobileLandscape ||
        (typeof window !== 'undefined' && window.innerWidth <= 860)
    );
    const nextText = compact ? cfg.hudCompact : cfg.hudLabel;
    const variantCls =
      cfg.isRng || cfg.presetIndex < 0
        ? ' badge-preset-custom'
        : cfg.presetIndex === 1
          ? ' badge-preset-1'
          : cfg.presetIndex === 2
            ? ' badge-preset-2'
            : '';
    const nextCls = `hud-build-badge${variantCls}`;
    if (badgeEl.textContent !== nextText) badgeEl.textContent = nextText;
    if (badgeEl.className !== nextCls) badgeEl.className = nextCls;
  }

  applySideHUDTheme(els, rosterCfg, fighter, partnerCfg = null) {
    if (!els || !rosterCfg || !fighter) return;
    if (els.name) els.name.textContent = rosterCfg.name;
    this.syncFighterBuildBadge(
      els.buildBadge,
      fighter,
      Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.())
    );
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
    if (team === 1) {
      this.vsInput.lastTouchHeroId = null;
      this.syncVsManualControlFlags();
      this.syncVsControlUI();
    }
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

  _resolveCasterCutInSide(caster) {
    if (!caster) return 'left';
    const p1 = this.getPointFighter?.(1) || this.leftFighter;
    const p2 = this.getPointFighter?.(2) || this.rightFighter;
    const isTeam2 =
      caster === p2 ||
      (this.rightFighter && caster === this.rightFighter) ||
      caster.team === 2 ||
      caster.team === 'right';
    if (!(this.isSideScrollMode?.() ?? this.isAdventureMode?.())) {
      const opp = isTeam2 ? p1 : p2;
      if (opp && opp !== caster && Number.isFinite(caster.x) && Number.isFinite(opp.x)) {
        if (caster.x > opp.x + 8) return 'right';
        if (caster.x < opp.x - 8) return 'left';
      }
    }
    if (Number.isFinite(caster.x) && Number.isFinite(this.renderer?.camX)) {
      return caster.x >= this.renderer.camX + 12 ? 'right' : 'left';
    }
    return isTeam2 || (!caster.team && (caster.facing || 1) < 0) ? 'right' : 'left';
  }

  triggerUltimateCinematic(caster) {
    this.ultSlowTimer = 0.55;
    this.renderer.triggerUltimateCamera(caster.x, caster.y - 60);
    if (typeof this.renderer.triggerUltimateCutIn === 'function') {
      this.renderer.triggerUltimateCutIn(caster, false, this._resolveCasterCutInSide(caster));
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
      this.renderer.triggerUltimateCutIn(caster, true, this._resolveCasterCutInSide(caster));
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

    if (this.isEndlessMode?.() && this.endless?.active) {
      if (deadFighter.isMonster) {
        this.endless.onMonsterDeath(deadFighter);
      } else {
        this.endless.handlePlayerZeroHp(deadFighter);
      }
      return;
    }

    if (this.audio && !deadFighter.isMonster) {
      this._deathVoiceWasBusy = false;
      this._postDeathVoiceBreathRemaining = 0;
      this.audio.stopLowPriorityHeroVoices?.(1, 0.03);
      this.audio.stopSpeakerVoice?.(deadFighter, 0.03);
      const killerRemainingMs =
        this.audio.getActiveVoiceRemainingMs?.(
          (key, entry) => key !== deadFighter && (entry?.priority || 1) >= 2
        ) || 0;
      const fireDefeatedDeathVoice = () => {
        this.audio?.playHeroVoice?.(deadFighter.heroId, 'death', {
          worldX: deadFighter.x,
          speakerKey: deadFighter,
          priority: 4,
          cooldownMs: 200,
          duckSfx: true,
          maxAsyncDelayMs: 650
        });
      };
      if (killerRemainingMs > 0) {
        const delayMs = Math.min(1350, Math.max(0, Math.round(killerRemainingMs + 140)));
        this.audio.clearPendingDeathVoice?.();
        const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this.audio._pendingDeathVoiceUntilMs = nowMs + delayMs;
        this.audio._pendingDeathVoiceTimer = setTimeout(() => {
          this.audio._pendingDeathVoiceTimer = null;
          this.audio._pendingDeathVoiceUntilMs = 0;
          if (
            this.isLandingOpen ||
            !deadFighter.isDead ||
            (this.isMatchOver && !this.victoryRevealPending)
          ) {
            return;
          }
          this.audio.stopAllHeroVoices?.(0.04);
          fireDefeatedDeathVoice();
        }, delayMs);
        if (
          this.audio._pendingDeathVoiceTimer &&
          typeof this.audio._pendingDeathVoiceTimer.unref === 'function'
        ) {
          this.audio._pendingDeathVoiceTimer.unref();
        }
      } else {
        this.audio.clearPendingDeathVoice?.();
        fireDefeatedDeathVoice();
      }
    }

    if (!deadFighter.isMonster) {
      this.renderer?.deathFX?.trigger?.(deadFighter);
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
      if (survivingAlly.team === 1) {
        this.vsInput.lastTouchHeroId = null;
        this.syncVsManualControlFlags();
        this.syncVsControlUI();
      }
      this.updateHUD();
      return;
    }

    this.isMatchOver = true;
    this.clearVsManualInputs();
    this.dismissVsKeyHintBar(true);
    this.syncVsControlUI();
    // Dramatic K.O. finishing slow-motion beat (`0.85s` ramped 0.16x -> 0.46x) so the final hit feels legendary!
    this.koSlowTimer = 0.85;
    this.koSlowMaxTimer = 0.85;
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
    const voicedWinner =
      winningFighters.find((f) => f && !f.isDead && this.audio?.hasVoicePack?.(f.heroId)) ||
      winner;
    this.lastMatchWinnerHeroId = voicedWinner?.heroId || winner?.heroId || null;
    const winnerCfg = CHAMPION_ROSTER[winner.heroId] || CHAMPION_ROSTER.warrior;
    const winnerBannerLabel =
      this.is2v2Mode() && winningFighters.length >= 2
        ? `${winningFighters[0].name.toUpperCase()} & ${winningFighters[1].name.toUpperCase()} WIN!`
        : `${winner.name.toUpperCase()} WINS!`;
    this.matchEndPhase = 'defeat_spotlight';
    this.matchEndElapsed = 0;
    this.winnerShowcaseTimer = 0;
    this.matchEndWinner = winner;
    this.matchEndWinnerLabel = winnerBannerLabel;
    this._victoryAudioPlayedInShowcase = false;
    this._winnerVoiceWasBusy = false;
    this._postWinnerVoiceBreathRemaining = 0;
    if (typeof this.renderer.setEndMatchSpotlight === 'function') {
      this.renderer.setEndMatchSpotlight('defeat_spotlight', deadFighter, winner, {
        winnerLabel: winnerBannerLabel,
        winnerColor: winner.primaryColor,
        canSkip: false
      });
    }
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

    // Restore VS Telemetry Stat Pills & One-Tap Victory Action Bar (in case previous match was Adventure Mode)
    const telLeftMaxLbl = document.getElementById('tel-left-max-label');
    const telRightMaxLbl = document.getElementById('tel-right-max-label');
    const telLeftExtraLbl = document.getElementById('tel-left-extra-label');
    const telRightSkillsLbl = document.getElementById('tel-right-skills-label');
    const telRightExtraLbl = document.getElementById('tel-right-extra-label');
    if (telLeftMaxLbl) telLeftMaxLbl.textContent = 'MAX COMBO';
    if (telRightMaxLbl) telRightMaxLbl.textContent = 'MAX COMBO';
    if (telLeftExtraLbl) telLeftExtraLbl.textContent = 'PARRY / DODGE';
    if (telRightSkillsLbl) telRightSkillsLbl.textContent = 'SKILLS / ULTS';
    if (telRightExtraLbl) telRightExtraLbl.textContent = 'PARRY / DODGE';
    if (this.btnNextChallenger) this.btnNextChallenger.classList.remove('hidden');
    if (this.btnSwapSides) this.btnSwapSides.classList.remove('hidden');
    if (this.btnPlayAgain) this.btnPlayAgain.textContent = 'REMATCH';
    if (this.btnVictorySelect) this.btnVictorySelect.textContent = 'CHANGE HERO';
    if (this.btnVictoryTitle) this.btnVictoryTitle.textContent = 'TITLE SCREEN';

    // Populate Post-Match Compact Stat Pills (aggregates team stats in 2v2!)
    const fillTel = (side, teamNum) => {
      const members = this.getTeamFighters(teamNum);
      const agg = {
        damageDealt: 0,
        skillsUsed: 0,
        ultsUsed: 0,
        maxCombo: 0,
        parries: 0,
        dodges: 0
      };
      members.forEach((m) => {
        if (!m || !m.stats) return;
        agg.damageDealt += m.stats.damageDealt || 0;
        agg.skillsUsed += m.stats.skillsUsed || 0;
        agg.ultsUsed += m.stats.ultsUsed || 0;
        agg.maxCombo = Math.max(agg.maxCombo, m.stats.maxCombo || 0);
        agg.parries += (m.stats.parries || 0) + (m.stats.clashes || 0);
        agg.dodges += m.stats.dodges || 0;
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
      if (maxEl) maxEl.textContent = `${agg.maxCombo} HIT${agg.maxCombo === 1 ? '' : 'S'}`;
      if (exEl) exEl.textContent = `${agg.parries} / ${agg.dodges}`;
    };
    fillTel('left', 1);
    fillTel('right', 2);

    const autoLabel = document.getElementById('victory-auto-next');
    if (this.isArcadeLadderActive()) {
      const run = this.arcadeRun;
      const curStage = this.getCurrentArcadeStage();
      const stageNum = curStage?.stageNumber || (run.currentStageIndex || 0) + 1;
      const isPlayerWin = winningTeam === 1;
      this.victoryOverlay?.classList.remove('is-defeat-plaque', 'is-arcade-champion-plaque');
      if (this.btnSwapSides) this.btnSwapSides.classList.add('hidden');
      if (autoLabel) autoLabel.classList.add('hidden');

      if (isPlayerWin) {
        if (curStage) curStage.defeated = true;
        run.totalTimeSec = (run.totalTimeSec || 0) + (this.matchTime || 0);
        if (stageNum < 5) {
          const nextStage = run.stages[run.currentStageIndex + 1];
          const nextCfg = CHAMPION_ROSTER[nextStage?.heroId] || CHAMPION_ROSTER.reaper_ex;
          if (eyebrowEl) eyebrowEl.textContent = `ARCADE LADDER • STAGE ${stageNum} / 5 CLEARED`;
          const winEl = document.getElementById('victory-winner');
          if (winEl) winEl.textContent = `${winner.name.toUpperCase()} ADVANCES!`;
          const statsEl = document.getElementById('victory-stats');
          if (statsEl) {
            statsEl.textContent = nextStage?.isFinalRival
              ? `FINAL SOVEREIGN RIVAL AWAITS: ${nextCfg.name} (${nextStage.rivalTitle})`
              : `NEXT CHALLENGER (STAGE ${stageNum + 1} / 5): ${nextCfg.name}`;
          }
          if (this.btnPlayAgain) this.btnPlayAgain.classList.add('hidden');
          if (this.btnNextChallenger) {
            this.btnNextChallenger.classList.remove('hidden');
            this.btnNextChallenger.classList.add('is-arcade-primary');
            this.btnNextChallenger.textContent =
              stageNum === 4
                ? 'FINAL RIVAL (STAGE 5/5)'
                : `NEXT CHALLENGER (STAGE ${stageNum + 1}/5)`;
          }
        } else {
          run.cleared = true;
          const rank = computeArcadeRank(run.continuesUsed || 0, run.totalTimeSec || 0);
          run.bestRank = rank;
          saveArcadeTrophy(run.playerHeroId, {
            rank,
            totalTimeSec: run.totalTimeSec || 0,
            continuesUsed: run.continuesUsed || 0
          });
          this.victoryOverlay?.classList.add('is-arcade-champion-plaque');
          const mins = String(Math.floor((run.totalTimeSec || 0) / 60)).padStart(2, '0');
          const secs = String(Math.floor((run.totalTimeSec || 0) % 60)).padStart(2, '0');
          if (eyebrowEl) eyebrowEl.textContent = `ARCADE CHAMPION CLEAR • RANK ${rank}`;
          const winEl = document.getElementById('victory-winner');
          if (winEl) winEl.textContent = `${winner.name.toUpperCase()} — ARCADE CHAMPION!`;
          const statsEl = document.getElementById('victory-stats');
          if (statsEl) {
            statsEl.textContent = `5/5 CLEARED • TIME ${mins}:${secs} • CONTINUES: ${run.continuesUsed || 0} • TROPHY SAVED!`;
          }
          if (this.btnNextChallenger) {
            this.btnNextChallenger.classList.add('hidden');
            this.btnNextChallenger.classList.remove('is-arcade-primary');
          }
          if (this.btnPlayAgain) {
            this.btnPlayAgain.classList.remove('hidden');
            this.btnPlayAgain.textContent = 'NEW ARCADE RUN';
          }
          this.syncArcadeTrophyPipsUI?.();
        }
      } else {
        this.victoryOverlay?.classList.add('is-defeat-plaque');
        if (eyebrowEl) {
          eyebrowEl.textContent = `ARCADE LADDER • STAGE ${stageNum} / 5 DEFEAT • CONTINUES: ${run.continuesUsed || 0}`;
        }
        const winEl = document.getElementById('victory-winner');
        if (winEl) winEl.textContent = `DEFEATED ON STAGE ${stageNum}`;
        const statsEl = document.getElementById('victory-stats');
        if (statsEl) {
          statsEl.textContent = `${winner.name.toUpperCase()} HALTED YOUR RUN — RETRY STAGE ${stageNum} WITHOUT RESTARTING!`;
        }
        if (this.btnNextChallenger) {
          this.btnNextChallenger.classList.add('hidden');
          this.btnNextChallenger.classList.remove('is-arcade-primary');
        }
        if (this.btnPlayAgain) {
          this.btnPlayAgain.classList.remove('hidden');
          this.btnPlayAgain.textContent = 'RETRY STAGE (CONTINUE)';
        }
      }
      this.renderVictoryArcadeStrip(isPlayerWin);
    } else if (this.isP1TrainingMode()) {
      if (this.victoryArcadeStrip) this.victoryArcadeStrip.classList.add('hidden');
      if (this.btnNextChallenger) this.btnNextChallenger.classList.add('hidden');
      if (this.btnSwapSides) this.btnSwapSides.classList.add('hidden');
      if (this.btnPlayAgain) {
        this.btnPlayAgain.classList.remove('hidden');
        this.btnPlayAgain.textContent = 'RESET TRAINING';
      }
      if (autoLabel) autoLabel.classList.add('hidden');
    } else {
      if (this.victoryArcadeStrip) this.victoryArcadeStrip.classList.add('hidden');
      if (this.btnNextChallenger) {
        this.btnNextChallenger.classList.remove('hidden', 'is-arcade-primary');
        this.btnNextChallenger.textContent = 'NEXT CHALLENGER';
      }
      if (this.btnPlayAgain) this.btnPlayAgain.classList.remove('hidden');
      if (autoLabel) {
        autoLabel.classList.remove('hidden');
        autoLabel.textContent = this.autoTourney
          ? 'AUTO-TOURNEY: NEXT CHALLENGER IN 9S...'
          : 'AUTO-TOURNEY PAUSED • SELECT NEXT ACTION';
      }
    }

    clearTimeout(this.victoryTimeout);
    clearTimeout(this.autoNextTimeout);
    this.autoNextTimeout = null;
    this._clearAutoNextTimers?.();
  }

  trySkipEndMatchToOverlay() {
    if (
      !this.isMatchOver ||
      !this.victoryRevealPending ||
      Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.()) ||
      this.isLandingOpen ||
      this.isPaused ||
      (this.matchEndElapsed || 0) < 1.6
    ) {
      return false;
    }
    this.revealVictoryOverlay();
    return true;
  }

  enterWinnerShowcase() {
    if (!this.isMatchOver || !this.victoryRevealPending) return;
    if (this.matchEndPhase === 'winner_showcase') return;
    this.matchEndPhase = 'winner_showcase';
    this.winnerShowcaseTimer = 0;
    this._winnerVoiceWasBusy = false;
    this._postWinnerVoiceBreathRemaining = 0;

    const winner =
      this.matchEndWinner ||
      this.fighters.find((f) => f && !f.isDead && !f.isBenched) ||
      this.leftFighter;
    this.matchEndWinner = winner;
    if (winner) {
      const winTeamFighters = this.getTeamFighters?.(winner.team) || [winner];
      for (const f of winTeamFighters) {
        if (!f || f.isDead || f.isBenched) continue;
        if (f.state !== 'VICTORY') {
          f.setState('VICTORY');
        }
        // Start Row 9 VICTORY flourish cleanly from Frame 0 right as the camera glides onto the winner!
        f.stateTimer = 0;
        f._victoryFlourishPlayed = false;
      }
    }

    this.renderer?.setEndMatchSpotlight?.('winner_showcase', this.deadMatchFighter, winner, {
      winnerLabel: this.matchEndWinnerLabel || `${winner?.name || 'CHAMPION'} WINS!`,
      winnerColor: winner?.primaryColor || '#facc15',
      canSkip: (this.matchEndElapsed || 0) >= 1.6
    });

    if (this.audio && !this._victoryAudioPlayedInShowcase) {
      this._victoryAudioPlayedInShowcase = true;
      this.audio.stopAllHeroVoices?.(0.06);
      const victorHeroId = this.lastMatchWinnerHeroId || winner?.heroId || null;
      if (victorHeroId && this.audio.hasVoicePack?.(victorHeroId)) {
        this.audio.preDuckSfxForVoice?.(4, 550);
      }
      this.audio.play?.('victory_fanfare');
      if (victorHeroId) {
        this.audio.playHeroVoice?.(victorHeroId, 'victory', {
          speakerKey: 'victory_ui',
          priority: 4,
          cooldownMs: 300,
          duckSfx: true,
          maxAsyncDelayMs: 1200
        });
      }
    }
  }

  revealVictoryOverlay() {
    if (!this.isMatchOver || !this.victoryRevealPending) return;
    this.setPaused(false, false);
    this.victoryRevealPending = false;
    this.matchEndPhase = 'overlay';
    this.matchOverSafetyTimer = 0;
    this._deathVoiceWasBusy = false;
    this._postDeathVoiceBreathRemaining = 0;
    this._winnerVoiceWasBusy = false;
    this._postWinnerVoiceBreathRemaining = 0;
    this.renderer?.setEndMatchSpotlight?.('overlay', this.deadMatchFighter, this.matchEndWinner, {
      canSkip: false
    });
    this.victoryOverlay.classList.remove('hidden');
    const isSideEnd = Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.());
    if (this.btnSwapSides) {
      this.btnSwapSides.classList.toggle(
        'hidden',
        Boolean(isSideEnd || this.isArcadeLadderActive?.() || this.isP1TrainingMode?.())
      );
    }
    if (this.audio && !this._victoryAudioPlayedInShowcase) {
      this.audio.stopAllHeroVoices?.(0.06);
      const isDefeat = Boolean(this.victoryOverlay?.classList?.contains('is-defeat-plaque'));
      const victorHeroId = !isDefeat
        ? isSideEnd
          ? this.slot1Hero
          : this.lastMatchWinnerHeroId
        : null;
      if (victorHeroId && this.audio.hasVoicePack?.(victorHeroId)) {
        this.audio.preDuckSfxForVoice?.(4, 550);
      }
      this.audio.play('victory_fanfare');
      if (victorHeroId) {
        this.audio.playHeroVoice?.(victorHeroId, 'victory', {
          speakerKey: 'victory_ui',
          priority: 4,
          cooldownMs: 300,
          duckSfx: true,
          maxAsyncDelayMs: 1200
        });
      }
    }
    if (
      this.autoTourney &&
      !isSideEnd &&
      !this.isArcadeLadderActive?.() &&
      !this.isP1TrainingMode?.() &&
      !this.isSimPaused
    ) {
      this._scheduleAutoNext(9000);
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
      if (!p._initialOwner && p.owner) {
        p._initialOwner = p.owner;
      } else if (p.owner && p._initialOwner && p.owner !== p._initialOwner && !p._countedParry) {
        p._countedParry = true;
        if (p.owner.stats) p.owner.stats.parries = (p.owner.stats.parries || 0) + 1;
      }
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

      const isAdv = Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.());
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
              const owner = p.owner;
              const prevTier = owner?._activeHitTier;
              const prevAdvSource = owner?._advActiveCastSource;
              if ((p.isMeteor || p.isUltimate) && owner && !owner.isMonster && prevTier !== 'TRUE_ULTIMATE') {
                owner._activeHitTier = 'ULTIMATE';
              }
              if (p._advCastSource && owner && !owner.isMonster) {
                owner._advActiveCastSource = p._advCastSource;
              }
              try {
                cand.takeDamage(p.damage, owner, true, 160, -240);
              } finally {
                if (owner) {
                  owner._activeHitTier = prevTier;
                  owner._advActiveCastSource = prevAdvSource;
                }
              }
              this.renderer.triggerHitStop(0.075);
            }
          }
        } else if (hitTarget) {
          const isCrit = Math.random() < 0.28;
          const owner = p.owner;
          const prevTier = owner?._activeHitTier;
          const prevAdvSource = owner?._advActiveCastSource;
          if ((p.isMeteor || p.isUltimate) && owner && !owner.isMonster && prevTier !== 'TRUE_ULTIMATE') {
            owner._activeHitTier = 'ULTIMATE';
          }
          if (p._advCastSource && owner && !owner.isMonster) {
            owner._advActiveCastSource = p._advCastSource;
          }
          try {
            hitTarget.takeDamage(isCrit ? p.damage * 1.38 : p.damage, owner, isCrit, 100, 0);
          } finally {
            if (owner) {
              owner._activeHitTier = prevTier;
              owner._advActiveCastSource = prevAdvSource;
            }
          }
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
      } else if (
        (isAdv && !p.isMeteor && p.age > 1.45) ||
        (this.isEndlessMode?.()
          ? Math.abs(p.x - (this.renderer?.camX || 0)) > 1650
          : p.x < -300 || p.x > ww + 300)
      ) {
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
            staggerBar: document.getElementById('adv-boss-stagger-bar'),
            hp: document.getElementById('adv-boss-raid-hp')
          }
        : null);
    if (!els || !els.root) return;

    const isEndless = Boolean(this.isEndlessMode?.());
    const adv = this.getActiveSideScrollManager?.() || this.adventure;
    const boss = adv?.bossEntity || null;
    const warningActive = Boolean(adv && (adv.bossWarningTimer || 0) > 0);
    const bossAlive = Boolean(boss && !boss.isDead);
    const trialActiveInEndless = Boolean(isEndless && adv?.trials?.isActive?.());
    const showBossHud = Boolean(
      adv?.active && !this.isLandingOpen && !this.isMatchOver && !trialActiveInEndless && (warningActive || bossAlive)
    );

    els.root.classList?.toggle('hidden', !showBossHud);
    const endlessHudRoot =
      isEndless && typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById('endless-hud-root')
        : null;
    const isEndlessDrawerOpen = Boolean(
      isEndless && !this.isLandingOpen && endlessHudRoot?.classList?.contains?.('is-drawer-open')
    );
    const endlessBossVisible = Boolean(isEndless && showBossHud);
    if (this.appEl) {
      this.appEl.classList?.toggle('is-endless-drawer-open', isEndlessDrawerOpen);
      this.appEl.classList?.toggle('is-endless-boss-hud-visible', endlessBossVisible);
      if (!endlessBossVisible && this.appEl.style?.setProperty) {
        if (this._lastEndlessBossHudH !== '0px') {
          this._lastEndlessBossHudH = '0px';
          this.appEl.style.setProperty('--endless-boss-hud-h', '0px');
        }
      }
    }
    if (!showBossHud) {
      this._wasBossHudVisible = false;
      this._lastBossMeasureSig = '';
      return;
    }

    const isWarningOnly = warningActive && !bossAlive;
    const cfgBoss = adv?.getBossConfig?.();
    const maxHp = Math.max(1, Math.round(boss?.maxHp || cfgBoss?.maxHp || 11800));
    const curHp = isWarningOnly ? maxHp : Math.max(0, Math.ceil(boss?.hp ?? maxHp));
    const hpRatio = isWarningOnly ? 1 : Math.max(0, Math.min(1, (boss?.hp ?? maxHp) / maxHp));
    const hpPctStr = `${(hpRatio * 100).toFixed(2)}%`;

    if (els.name) {
      const nextName = boss?.name || cfgBoss?.name || 'BEHEMOTH MALPHAS';
      if (els.name.textContent !== nextName) els.name.textContent = nextName;
    }

    const phaseNum = Math.max(1, Math.min(3, Number(boss?.bossPhase) || 1));
    const roman = phaseNum === 3 ? 'III' : phaseNum === 2 ? 'II' : 'I';
    const isGuardBroken = Boolean(!isWarningOnly && (boss?.staggerBreakTimer || 0) > 0);
    const isCoreExposed = Boolean(!isWarningOnly && ((boss?.vulnerableTimer || 0) > 0 || isGuardBroken));
    let nextPhaseText = 'INCOMING SIEGE';
    if (!isWarningOnly) {
      let statusText = 'ABYSSAL SOVEREIGN';
      if (isGuardBroken) {
        statusText = 'GUARD BREAK! (+55% DMG)';
      } else if ((boss?.vulnerableTimer || 0) > 0) {
        statusText = 'CORE EXPOSED!';
      } else if ((boss?.telegraphTimer || 0) > 0 && boss?.telegraphLabel) {
        statusText = String(boss.telegraphLabel)
          .replace(/^!\s*|\s*!$/g, '')
          .replace(/^PHASE\s+[I]+:\s*/i, '')
          .trim();
      } else if ((boss?.emergeTimer || 0) > 0) {
        statusText = 'BLACK PIT RISING';
      } else if (this.isEndlessMode?.() && Number.isFinite(adv?.bossTimer) && adv.bossTimer > 0) {
        statusText = `TIMER ${adv.bossTimer.toFixed(1)}S`;
      }
      nextPhaseText = `PHASE ${roman} • ${statusText || 'ABYSSAL SOVEREIGN'}`;
    }
    if (els.phase && els.phase.textContent !== nextPhaseText) {
      els.phase.textContent = nextPhaseText;
    }

    if (els.bar?.style) els.bar.style.width = hpPctStr;
    if (els.ghost?.style) els.ghost.style.width = hpPctStr;
    if (els.staggerBar?.style) {
      const stagRatio = isWarningOnly
        ? 0
        : isGuardBroken
          ? Math.max(0, Math.min(1, (boss?.staggerBreakTimer || 0) / 3.2))
          : Math.max(0, Math.min(1, (boss?.stagger || 0) / Math.max(1, boss?.maxStagger || 220)));
      els.staggerBar.style.width = `${(stagRatio * 100).toFixed(1)}%`;
    }

    const fmtBossNum = (n) => {
      if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
      if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
      if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
      return n.toLocaleString('en-US');
    };
    const nextHpText = `${fmtBossNum(curHp)} / ${fmtBossNum(maxHp)}`;
    if (els.hp && els.hp.textContent !== nextHpText) {
      els.hp.textContent = nextHpText;
    }

    els.root.classList?.toggle('is-boss-warning', isWarningOnly);
    els.root.classList?.toggle('is-core-exposed', isCoreExposed);
    els.root.classList?.toggle('is-guard-broken', isGuardBroken);
    els.root.classList?.toggle('is-phase-2', !isWarningOnly && phaseNum === 2);
    els.root.classList?.toggle('is-phase-3', !isWarningOnly && phaseNum >= 3);

    // Keep Mobile Portrait Boss Plaque cleanly below unified slim Endless Top Bar with 0 overlap
    if (isEndless) {
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const hudRoot = endlessHudRoot;
      const measureSig = `${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : ''}|${String(
        hudRoot?.className || ''
      )}|${Boolean(document?.documentElement?.classList?.contains?.('is-mobile-landscape'))}`;
      const needsMeasure =
        !this._wasBossHudVisible ||
        this._lastBossMeasureSig !== measureSig ||
        nowMs - (this._lastBossMeasureAt || 0) >= 240;
      if (needsMeasure) {
        this._wasBossHudVisible = true;
        this._lastBossMeasureSig = measureSig;
        this._lastBossMeasureAt = nowMs;
        const isCssRotated = Boolean(
          typeof document !== 'undefined' &&
            document.documentElement?.classList?.contains?.('is-css-rotated-landscape')
        );
        const appRect =
          typeof this.appEl?.getBoundingClientRect === 'function'
            ? this.appEl.getBoundingClientRect()
            : null;
        const appTop = appRect && Number.isFinite(appRect.top) ? appRect.top : 0;

        let endlessTopBottom = 0;
        const canQuery = typeof document !== 'undefined' && typeof document.querySelector === 'function';
        const topStackEl = canQuery
          ? document.querySelector('#endless-hud-root .endless-top-stack') ||
            document.querySelector('.endless-top-stack')
          : null;
        const shopToggleEl = canQuery ? document.querySelector('#endless-shop-toggle') : null;
        const isElVisible = (el) => {
          if (!el || typeof el.getBoundingClientRect !== 'function') return false;
          if (el.classList?.contains?.('hidden')) return false;
          if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
            const cs = window.getComputedStyle(el);
            if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
          }
          return true;
        };
        const topStackVisible = isElVisible(topStackEl);
        const measureEls = [];
        if (topStackVisible) measureEls.push(topStackEl);
        const toggleInsideTopStack = Boolean(
          topStackVisible &&
            shopToggleEl &&
            typeof topStackEl.contains === 'function' &&
            topStackEl.contains(shopToggleEl)
        );
        if (!toggleInsideTopStack && isElVisible(shopToggleEl)) {
          measureEls.push(shopToggleEl);
        }
        for (const el of measureEls) {
          const r = el.getBoundingClientRect();
          if (r && r.width > 0 && r.height > 0 && Number.isFinite(r.bottom)) {
            endlessTopBottom = Math.max(endlessTopBottom, r.bottom - appTop);
          }
        }
        if (els.root.style?.setProperty) {
          const portraitTopPx =
            endlessTopBottom > 32
              ? `${Math.ceil(endlessTopBottom + 4)}px`
              : `${Math.round((this.renderer?.getHudBottomY?.() || 56) + 46)}px`;
          if (this._lastBossPortraitTopStr !== portraitTopPx) {
            this._lastBossPortraitTopStr = portraitTopPx;
            els.root.style.setProperty('--adv-boss-portrait-top', portraitTopPx);
          }
        }

        if (this.appEl?.style?.setProperty) {
          const bossHudRect =
            typeof els.root.getBoundingClientRect === 'function'
              ? els.root.getBoundingClientRect()
              : null;
          const bossLogicalH = bossHudRect
            ? isCssRotated
              ? bossHudRect.width
              : bossHudRect.height
            : 0;
          const nextBossHudH = bossLogicalH > 4 ? `${Math.ceil(bossLogicalH + 4)}px` : '50px';
          if (this._lastEndlessBossHudH !== nextBossHudH) {
            this._lastEndlessBossHudH = nextBossHudH;
            this.appEl.style.setProperty('--endless-boss-hud-h', nextBossHudH);
          }
        }
      }
    } else if (els.root.style?.setProperty) {
      this._wasBossHudVisible = true;
      const stripRect = adv?._hudStripRect;
      const portraitTop =
        stripRect && Number.isFinite(stripRect.y) && Number.isFinite(stripRect.h)
          ? Math.round(stripRect.y + stripRect.h + 6)
          : typeof this.renderer?.getHudBottomY === 'function'
            ? Math.round(this.renderer.getHudBottomY() + 42)
            : null;
      if (portraitTop && portraitTop > 40) {
        const nextPortraitTopStr = `${portraitTop}px`;
        if (this._lastBossPortraitTopStr !== nextPortraitTopStr) {
          this._lastBossPortraitTopStr = nextPortraitTopStr;
          els.root.style.setProperty('--adv-boss-portrait-top', nextPortraitTopStr);
        }
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
    const isAdv = Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.());
    const isEndless = Boolean(this.isEndlessMode?.());
    const activeSideMgr = this.getActiveSideScrollManager?.() || this.adventure;
    this.appEl?.classList?.toggle('is-adventure-active', Boolean(isAdv && !this.isLandingOpen));
    this.appEl?.classList?.toggle('is-endless-active', Boolean(isEndless && !this.isLandingOpen));
    if (this.appEl?.classList?.toggle) {
      const endlessDrawerOpen = Boolean(
        isEndless &&
          !this.isLandingOpen &&
          typeof document !== 'undefined' &&
          typeof document.getElementById === 'function' &&
          document.getElementById('endless-hud-root')?.classList?.contains?.('is-drawer-open')
      );
      this.appEl.classList.toggle('is-endless-drawer-open', endlessDrawerOpen);
    }
    const advProg = isAdv ? activeSideMgr?.progression : null;
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
      this.syncFighterBuildBadge(els.buildBadge, f, isAdv);

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
          : activeSideMgr?.totalWaveLabel || f.skillName
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
      this.syncVsTouchDeckUI?.();
      if (this.isP1TrainingMode()) {
        this.syncTrainingLabTelemetryUI?.();
      }
    }
    this.updateAdventureBossHUD();

    const mins = String(Math.floor(this.matchTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.matchTime % 60)).padStart(2, '0');
    this.timerEl.textContent = `${mins}:${secs}`;
  }

  stepSimulation(rawDt) {
    this.renderer.update(rawDt, this.fighters);

    if (this._roundEngageBannerTimer > 0) {
      this._roundEngageBannerTimer = Math.max(0, this._roundEngageBannerTimer - rawDt);
    }

    if (this.roundIntroTimer > 0 && !this.isMatchOver) {
      this.roundIntroElapsed = (this.roundIntroElapsed || 0) + rawDt;
      const queue = Array.isArray(this._roundIntroQueue) ? this._roundIntroQueue : [];
      const isDualIntro = queue.length >= 2;
      const act1Dur = Number(this._roundIntroAct1Dur) || (isDualIntro ? 1.15 : 1.25);
      const slotDur = Number(this._roundIntroSlotDur) || (isDualIntro ? 3.35 : 2.90);
      const introTotalDur = Math.max(1.35, this.roundIntroDuration || 4.15);

      if (isDualIntro && this.roundIntroElapsed >= act1Dur) {
        this._introSpeakerElapsed = (this._introSpeakerElapsed || 0) + rawDt;

        // Wait until the speaker's MP3 actually starts playing, then hold a calm 0.62s post-line smirk/blink beat after it finishes!
        const hasVoiceProbe = typeof this.audio?.isHeroVoiceBusy === 'function';
        if (this._roundIntroVoiceFired && hasVoiceProbe) {
          if (this.audio.isHeroVoiceBusy()) {
            this._introVoiceHeardBusy = true;
            this._introPostVoiceSilenceSec = 0;
          } else if (this._introVoiceHeardBusy || this._introSpeakerElapsed >= 2.2) {
            this._introPostVoiceSilenceSec = (this._introPostVoiceSilenceSec || 0) + rawDt;
          }
        }

        const slotExpired =
          this._introSpeakerElapsed >= slotDur ||
          (this._introPostVoiceSilenceSec || 0) >= 0.62;

        if (slotExpired && (this._roundIntroSpeakerIdx || 0) + 1 < queue.length) {
          this._roundIntroSpeakerIdx = (this._roundIntroSpeakerIdx || 0) + 1;
          this._roundIntroFighter = queue[this._roundIntroSpeakerIdx];
          this._introSpeakerElapsed = 0;
          this._introVoiceHeardBusy = false;
          this._introPostVoiceSilenceSec = 0;
          this._introMouthStage = 0;
          this._introMouthHoldSec = 0;
          this._roundIntroVoiceFired = false;
          this.audio?.stopAllHeroVoices?.(0.04);
          const remSpeakers = queue.length - this._roundIntroSpeakerIdx;
          this.roundIntroTimer = Math.max(0.2, remSpeakers * slotDur);
        } else if (
          (this._introPostVoiceSilenceSec || 0) >= 0.62 &&
          (this._roundIntroSpeakerIdx || 0) + 1 >= queue.length
        ) {
          this.roundIntroTimer = Math.min(this.roundIntroTimer, rawDt * 0.5);
        }
      } else if (!isDualIntro && this._roundIntroFighter && this.roundIntroElapsed >= act1Dur) {
        this._introSpeakerElapsed = Math.max(0, this.roundIntroElapsed - act1Dur);
      }

      const speaker = this._roundIntroFighter;
      const inAct2Window = Boolean(speaker && !speaker.isDead && this.roundIntroElapsed >= (isDualIntro ? act1Dur : 0.25));
      const inTauntWindow = Boolean(
        inAct2Window &&
          (isDualIntro
            ? (this._introSpeakerElapsed || 0) < slotDur - 0.35
            : this.roundIntroElapsed < introTotalDur - 0.45)
      );

      if (inAct2Window) {
        const liveAmp = Math.max(0, Math.min(1, Number(this.audio?.getVoiceAmplitude?.() || 0)));
        this._stepIntroTalkArticulation(rawDt, liveAmp);
      }

      if (Array.isArray(this.fighters)) {
        for (let i = 0; i < this.fighters.length; i++) {
          const f = this.fighters[i];
          if (!f || f.isDead || f.isBenched) continue;
          f.moveDir = 0;
          f.vx = 0;
          f.vy = 0;
          if (Number.isFinite(f.groundY)) {
            f.y = f.groundY;
          }
          if (inTauntWindow && f === speaker) {
            const tauntElapsed = isDualIntro
              ? Math.max(0, this._introSpeakerElapsed || 0)
              : Math.max(0, this.roundIntroElapsed - 0.25);
            f.state = 'SKILL';
            f._overrideFrameIdx = 90 + (Math.floor(tauntElapsed * 10) % 8);
            f.trueUltFrameOverride = null;
          } else {
            f.state = 'IDLE';
            f._overrideFrameIdx = null;
            f.trueUltFrameOverride = null;
          }
          f.stateTimer = (f.stateTimer || 0) + rawDt;
          f.walkPhase = (f.walkPhase || 0) + rawDt * 2.8;
          f.haloPhase = (f.haloPhase || 0) + rawDt * 2.8;
          f.runeOrbit = (f.runeOrbit || 0) + rawDt * 2.6;
          f.windPhase = (f.windPhase || 0) + rawDt * 3.0;
          f.chronoPhase = (f.chronoPhase || 0) + rawDt * 2.8;
          f.headBob = Math.sin(f.walkPhase) * 2.0;
          f.updateCape?.(rawDt);
          f.fx?.update?.(rawDt);
        }
      }

      // Fire speaker's intro voice: at Act 2 start for Dual P1->P2 (so 100% of line syncs to talking bust), or 0.08s for single-speaker
      const voiceTriggerTime = isDualIntro ? act1Dur : 0.08;
      if (!this._roundIntroVoiceFired && this.roundIntroElapsed >= voiceTriggerTime) {
        this._roundIntroVoiceFired = true;
        if (speaker && !speaker.isDead) {
          this.audio?.playHeroVoice?.(speaker.heroId, 'intro', {
            worldX: speaker.x,
            speakerKey: speaker,
            priority: 3,
            cooldownMs: 120,
            duckSfx: true,
            maxAsyncDelayMs: 1400
          });
        }
      }

      this.vfx.update(rawDt, this.renderer.groundY, this.renderer, this.audio);
      this.roundIntroTimer = Math.max(0, this.roundIntroTimer - rawDt);
      if (this.roundIntroTimer <= 0) {
        if (Array.isArray(this.fighters)) {
          for (let i = 0; i < this.fighters.length; i++) {
            const f = this.fighters[i];
            if (!f || f.isDead || f.isBenched) continue;
            f.state = 'IDLE';
            f.vx = 0;
            f.vy = 0;
            if (Number.isFinite(f.groundY)) f.y = f.groundY;
            f._overrideFrameIdx = null;
            f.trueUltFrameOverride = null;
          }
        }
        this._roundIntroQueue = [];
        this._introMouthStage = undefined;
        this._roundEngageBannerTimer = 0.85;
        this.audio?.play?.('slash', 600);
        if (this.isVsManualP1Active() && !this.simMode) {
          this.showVsKeyHintBar(4.0);
        }
      }

      this.hudTimer += rawDt;
      if (this.hudTimer >= 0.05) {
        this.hudTimer = 0;
        this.updateHUD();
      }
      return;
    }

    if (this.renderer.hitStopTimer > 0) return;

    // Auto-fade VS 1P key-hint bar after 4s of active combat (or earlier on player input)
    const isSideSim = Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.());
    if (
      !isSideSim &&
      !this.isMatchOver &&
      this.roundIntroTimer <= 0 &&
      this.vsInput &&
      this.vsInput.keyHintTimer > 0
    ) {
      this.vsInput.keyHintTimer = Math.max(0, this.vsInput.keyHintTimer - rawDt);
      if (this.vsInput.keyHintTimer <= 0) {
        this.dismissVsKeyHintBar(false);
      }
    }

    // Decay VS combo tracker windows cleanly
    if (this.vsComboState) {
      for (const side of ['left', 'right']) {
        const cSlot = this.vsComboState[side];
        if (cSlot && cSlot.timer > 0) {
          cSlot.timer = Math.max(0, cSlot.timer - rawDt);
          if (cSlot.timer <= 0) {
            cSlot.hits = 0;
            cSlot.damage = 0;
          }
        }
      }
    }

    let timeScale = 1.0;
    if (this.koSlowTimer > 0) {
      this.koSlowTimer = Math.max(0, this.koSlowTimer - rawDt);
      const koProg = 1 - this.koSlowTimer / Math.max(0.01, this.koSlowMaxTimer || 0.85);
      // Dramatic K.O. finishing slow-mo beat: deep 0.16x impact hang easing smoothly into 0.46x fall
      timeScale = koProg < 0.45 ? 0.16 : 0.16 + ((koProg - 0.45) / 0.55) * 0.30;
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
      !isSideSim &&
      !this.isP1TrainingMode?.() &&
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
          if (team === 1 && this.isVsManualP1Active()) {
            // In PLAY 1P Tag VS, P1 controls Tag Swaps manually ([Tab / E] or Touch TAG pill); allow reserve cover assists only
            this.triggerTeamAssist(team, false);
            continue;
          }
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

    // Update Endless Crusade, Adventure Campaign (manual/auto-play hero + active monster horde), OR Arena Duel/2v2 fighters
    if (this.isEndlessMode?.() && this.endless?.active) {
      this.endless.update(dt);
    } else if (this.isAdventureMode?.() && this.adventure?.active) {
      this.adventure.update(dt);
    } else {
      if (this.isVsManualP1Active() && !this.isMatchOver) {
        this.updateVsManualP1(dt);
      }
      if (this.isP1TrainingMode() && !this.isMatchOver) {
        this.updateTrainingLab(dt);
      }
      for (const f of this.fighters) {
        if (!f) continue;
        const target = this.getTargetFor(f);
        if (f.chronoTimeStopTimer > 0 && !f.isDead && f.state !== 'TRUE_ULTIMATE') {
          Fighter.prototype.update.call(f, dt, target, this);
        } else if (
          this.isP1TrainingMode() &&
          (f.trainingDummyMode === 'idle' || f.trainingDummyMode === 'auto_guard') &&
          !f.isDead
        ) {
          f.fx?.update?.(dt);
          Fighter.prototype.update.call(f, dt, target, this);
        } else if (
          this.isVsManualP1Active() &&
          f.isPlayerControlled &&
          !f.adventureAutoPlay &&
          (f.heroId === 'icemage' || f.heroId === 'reaper') &&
          (f.state === 'IDLE' || f.state === 'WALK')
        ) {
          // Non-invasive Legacy manual guard (0 edits to Legacy IceMage.js / Reaper.js):
          // prevent unsolicited pre-super.update() auto-crouch/jump/dodge while ticking real cooldowns accurately.
          const savedDodgeCd = f.dodgeCooldown || 0;
          const savedCrouchCd = f.crouchCooldown || 0;
          let cdMult = f.isBerserk ? 1.25 : 1.0;
          if (this.stageEventTimer > 0 && this.renderer?.stageId === 'clocktower') {
            cdMult *= 1.35;
          }
          f.dodgeCooldown = Math.max(savedDodgeCd, 0.05);
          f.crouchCooldown = Math.max(savedCrouchCd, 0.05);
          f.update(dt, target, this);
          f.dodgeCooldown = Math.max(0, savedDodgeCd - dt * cdMult);
          f.crouchCooldown = Math.max(0, savedCrouchCd - dt * cdMult);
        } else {
          f.update(dt, target, this);
        }
      }
    }

    // Cinematic 3-Beat End-of-Match Pacing in Live Versus / Player vs AI:
    //   Beat 1 (0.0..2.6s): Defeat Spotlight — watch defeated champion's full bespoke pixel death unobstructed.
    //   Beat 2 (2.6..5.1s): Winner Showcase — glide camera onto winner performing Row 9 VICTORY pose & voice line.
    //   Beat 3 (~5.1s+):    Victory Overlay Reveal (instant-skip via Space/Enter/Click/Tap after 1.6s).
    // Keeps `simMode` fast for automated suites & Adventure defeat snappy (0.65s hold)!
    if (this.isMatchOver && this.victoryRevealPending && !this.isSimPaused) {
      this.matchOverSafetyTimer = (this.matchOverSafetyTimer || 0) + rawDt;
      const fallen = this.deadMatchFighter || this.fighters.find((f) => f && f.isDead);
      const targetFloorY =
        isSideSim && Number.isFinite(fallen?.groundY)
          ? fallen.groundY
          : this.renderer.groundY;
      const onFloor = !fallen || fallen.isColossalBoss || fallen.y >= targetFloorY - 4;
      const canGateOnDeathVoice =
        Boolean(this._enforceLiveVoiceQueueInTest) ||
        (!this.simMode && typeof HTMLImageElement !== 'undefined');
      const deathVoiceBusy =
        canGateOnDeathVoice && Boolean(this.audio?.isDeathOrMatchEndVoiceBusy?.());
      if (deathVoiceBusy) {
        this._deathVoiceWasBusy = true;
        this._postDeathVoiceBreathRemaining = 0.40;
      } else if (this._deathVoiceWasBusy && (this._postDeathVoiceBreathRemaining || 0) > 0) {
        this._postDeathVoiceBreathRemaining = Math.max(
          0,
          this._postDeathVoiceBreathRemaining - rawDt
        );
      }
      const holdForDeathVoice =
        canGateOnDeathVoice &&
        (deathVoiceBusy ||
          (this._deathVoiceWasBusy && (this._postDeathVoiceBreathRemaining || 0) > 0));

      const useCinematic3Beat =
        !isSideSim && (!this.simMode || Boolean(this._forceCinematicVictoryPacing));

      if (useCinematic3Beat) {
        this.matchEndElapsed = (this.matchEndElapsed || 0) + rawDt;
        if (this.renderer) {
          this.renderer.endMatchCanSkip = this.matchEndElapsed >= 1.6;
        }
        const defeatSpotlightDur = 3.85;
        const winnerShowcaseDur = 2.5;
        if (this.matchEndPhase !== 'winner_showcase') {
          if (
            (this.matchEndElapsed >= defeatSpotlightDur && onFloor && !holdForDeathVoice) ||
            this.matchEndElapsed >= 7.2
          ) {
            this.enterWinnerShowcase();
          }
        } else {
          this.winnerShowcaseTimer = (this.winnerShowcaseTimer || 0) + rawDt;
          this.postDeathHoldTimer = this.winnerShowcaseTimer;
          const winnerVoiceBusy =
            canGateOnDeathVoice && Boolean(this.audio?.isHeroVoiceBusy?.());
          if (winnerVoiceBusy) {
            this._winnerVoiceWasBusy = true;
            this._postWinnerVoiceBreathRemaining = 0.25;
          } else if (
            this._winnerVoiceWasBusy &&
            (this._postWinnerVoiceBreathRemaining || 0) > 0
          ) {
            this._postWinnerVoiceBreathRemaining = Math.max(
              0,
              this._postWinnerVoiceBreathRemaining - rawDt
            );
          }
          const holdForWinnerVoice =
            canGateOnDeathVoice &&
            (winnerVoiceBusy ||
              (this._winnerVoiceWasBusy && (this._postWinnerVoiceBreathRemaining || 0) > 0));
          if (this.winnerShowcaseTimer >= winnerShowcaseDur && !holdForWinnerVoice) {
            this.revealVictoryOverlay();
          }
        }
        const cinematicSafetyCeiling = 12.8;
        if (this.victoryRevealPending && this.matchOverSafetyTimer >= cinematicSafetyCeiling) {
          this.revealVictoryOverlay();
        }
      } else {
        const fullDeathDur = fallen?.isColossalBoss ? 2.4 : PixelForge.DEATH_DURATION || 1.55;
        const holdNeeded = isSideSim && fallen && !fallen.isMonster ? 0.65 : 1.35;
        const safetyCeiling =
          canGateOnDeathVoice && (deathVoiceBusy || this._deathVoiceWasBusy) ? 10.5 : 3.4;

        if (!fallen || ((fallen.deathTimer || 0) >= fullDeathDur && onFloor)) {
          this.postDeathHoldTimer = (this.postDeathHoldTimer || 0) + rawDt;
          if (this.postDeathHoldTimer >= holdNeeded && !holdForDeathVoice) {
            this.revealVictoryOverlay();
          }
        }
        if (this.victoryRevealPending && this.matchOverSafetyTimer >= safetyCeiling) {
          this.revealVictoryOverlay();
        }
      }
    } else if (!this.isMatchOver || !this.victoryRevealPending) {
      this.matchOverSafetyTimer = 0;
      this._deathVoiceWasBusy = false;
      this._postDeathVoiceBreathRemaining = 0;
      this._winnerVoiceWasBusy = false;
      this._postWinnerVoiceBreathRemaining = 0;
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
    const rawW = ctx.canvas?.width || 1280;
    const rawH = ctx.canvas?.height || 720;
    const useLogical = Boolean(
      this.renderer &&
        this.renderer.canvas === ctx.canvas &&
        this.renderer.width > 0 &&
        this.renderer.height > 0
    );
    const cw = useLogical ? Math.round(this.renderer.width) : rawW;
    const ch = useLogical ? Math.round(this.renderer.height) : rawH;
    const dprX = useLogical && cw > 0 ? rawW / cw : 1;
    const dprY = useLogical && ch > 0 ? rawH / ch : 1;
    const boxW = 296;
    const boxH = 54;
    const bx = Math.round((cw - boxW) * 0.5);
    const by = Math.round(ch * 0.16);
    const step = ((Date.now() / 110) | 0) % 8;

    ctx.save();
    ctx.setTransform(dprX, 0, 0, dprY, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, boxW - 2, boxH - 2);
    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 13px "ArcanePixel", "Press Start 2P", monospace';
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

  _stepIntroTalkArticulation(dt, amp) {
    const a = Math.max(0, Math.min(1, Number(amp) || 0));
    // 4-stage natural vowel envelope: 0=Closed(F0), 1=Small(F3), 2=Mid(F4), 3=Wide(F5)
    const rawTarget = a <= 0.07 ? 0 : a <= 0.30 ? 1 : a <= 0.62 ? 2 : 3;
    if (this._introMouthStage === undefined || this._introMouthStage === null) {
      this._introMouthStage = 0;
      this._introMouthHoldSec = 0;
    }
    this._introMouthHoldSec = (this._introMouthHoldSec || 0) + Math.max(0.001, dt || 0.016);
    if (rawTarget !== this._introMouthStage) {
      // Natural human syllable cadence (~65ms crisp vowel attack, ~85ms cushioned close — zero 22Hz strobe!)
      const minHold = rawTarget > this._introMouthStage ? 0.065 : 0.085;
      if (this._introMouthHoldSec >= minHold) {
        this._introMouthStage += rawTarget > this._introMouthStage ? 1 : -1;
        this._introMouthHoldSec = 0;
      }
    }
    return this._introMouthStage;
  }

  static computeIntroTalkFrameIndex(amp, elapsed, forcedStage = null) {
    const a = Math.max(0, Math.min(1, Number(amp) || 0));
    const t = Math.max(0, Number(elapsed) || 0);
    const stage =
      forcedStage === 0 || forcedStage === 1 || forcedStage === 2 || forcedStage === 3
        ? forcedStage
        : a <= 0.07
          ? 0
          : a <= 0.30
            ? 1
            : a <= 0.62
              ? 2
              : 3;

    // 4-beat cushioned anime blinks twice per 2.5s cycle (during BOTH calm pauses & gentle/mid speech so eyes feel alive!)
    // Preserves exact Suite 36.28 deterministic windows: t=1.5->0, t=2.30->1, t=2.38->2, t=2.0->3/4, t=2.2->5
    if (stage <= 2) {
      const blinkPhase = ((t % 2.5) + 2.5) % 2.5;
      if (
        (blinkPhase >= 1.06 && blinkPhase < 1.115) ||
        (blinkPhase >= 1.215 && blinkPhase < 1.265) ||
        (blinkPhase >= 2.28 && blinkPhase < 2.335) ||
        blinkPhase >= 2.445
      ) {
        return 1;
      }
      if (
        (blinkPhase >= 1.115 && blinkPhase < 1.215) ||
        (blinkPhase >= 2.335 && blinkPhase < 2.445)
      ) {
        return 2;
      }
    }

    if (stage === 0) {
      return 0;
    }
    if (stage === 1) {
      // Small / Soft Syllable ('m/s/i/e') -> F3
      return 3;
    }
    if (stage === 2) {
      // Medium Rounded Vowel ('o/u/eh') -> F4
      return 4;
    }
    // Wide Accented Vowel ('a!') -> F5, gently articulating F5 <-> F4 at natural ~5.5Hz (180ms/beat) on sustained shouts!
    return Math.floor(t * 5.5) % 4 === 3 ? 4 : 5;
  }

  _drawIntroBustBackEnvAndMagicFX(ctx, cfg) {
    // Layer 2 (Drawn BEHIND the Apple Vision transparent character cutout, ON TOP of stationary Cell 0 backdrop!):
    // 12 Hero-Authentic Animated Environment Overlays locked to each portrait's real painted scenery
    // (ZERO blocky vertical equalizer bars, ZERO face-cutting horizontal lines, ZERO rotate/arc/ellipse calls!)
    const {
      baseHero,
      bustX,
      bustY,
      bustSize,
      elapsed,
      amp,
      spkCol,
      turnAlpha,
      isRightSpeaker = false,
      fillRectClamped,
      drawStar4
    } = cfg;
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 4.2);
    const slowDrift = Math.sin(elapsed * 1.4);
    const sf = bustSize / 320;
    const bCx = bustX + (bustSize >> 1);
    const bCy = bustY + Math.round(bustSize * 0.48);

    const mapBgPt = (px320, py320) => [
      bustX + Math.round((isRightSpeaker ? 320 - px320 : px320) * sf),
      bustY + Math.round(py320 * sf)
    ];

    const drawMagicBloom = (gx, gy, rad, coreCol, midCol, alphaVal) => {
      if (typeof ctx.createRadialGradient !== 'function' || alphaVal <= 0.005 || rad <= 4) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, alphaVal));
      const rg = ctx.createRadialGradient(gx, gy, Math.max(2, Math.round(rad * 0.08)), gx, gy, rad);
      if (rg && typeof rg.addColorStop === 'function') {
        rg.addColorStop(0, coreCol);
        rg.addColorStop(0.45, midCol);
        rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rg;
        fillRectClamped(gx - rad, gy - rad, rad * 2, rad * 2);
      }
      ctx.restore();
    };

    const drawPixelSegment = (x0, y0, x1, y1, outerCol, coreCol, thick = 3) => {
      const steps = Math.max(4, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 3));
      const half = thick >> 1;
      for (let s = 0; s <= steps; s++) {
        const px = Math.round(x0 + ((x1 - x0) * s) / steps);
        const py = Math.round(y0 + ((y1 - y0) * s) / steps);
        ctx.fillStyle = outerCol;
        fillRectClamped(px - half, py - half, thick, thick);
        if (coreCol) {
          ctx.fillStyle = coreCol;
          fillRectClamped(px, py, Math.max(1, thick - 2), Math.max(1, thick - 2));
        }
      }
    };

    const drawForkedBolt = (startX320, startY320, dirX, segs, stepY320, seed, outerCol, coreCol = '#ffffff', alphaVal = 0.88) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, turnAlpha * alphaVal));
      let [lx, ly] = mapBgPt(startX320, startY320);
      const flipDir = isRightSpeaker ? -1 : 1;
      for (let i = 0; i < segs; i++) {
        const zig = ((i + seed) % 2 === 0 ? 1 : -1) * (5 + (((i * 7 + seed * 3) % 7))) * sf;
        const nx = Math.round(lx + (dirX * flipDir * sf) + zig);
        const ny = Math.round(ly + stepY320 * sf);
        drawPixelSegment(lx, ly, nx, ny, outerCol, coreCol, Math.max(3, Math.round(3 * sf)));
        // Crisp forked branch off mid-bolt segments!
        if (i === 1 || i === 3) {
          const bDir = i === 1 ? 1 : -1;
          const bx = Math.round(nx + bDir * flipDir * (14 + (seed % 9)) * sf);
          const by = Math.round(ny + (stepY320 * 0.72) * sf);
          drawPixelSegment(nx, ny, bx, by, outerCol, coreCol, 2);
        }
        lx = nx;
        ly = ny;
      }
      ctx.restore();
    };

    const drawPixelGear = (cx320, cy320, rad320, teeth, angle, rimCol, hiCol, alphaVal) => {
      const [gx, gy] = mapBgPt(cx320, cy320);
      const rPx = Math.max(6, Math.round(rad320 * sf));
      const rIn = Math.max(3, Math.round(rPx * 0.62));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, turnAlpha * alphaVal));
      // Outer ring & teeth (pure cos/sin pixel dots — ZERO ctx.arc/rotate!)
      const ringSteps = Math.max(16, teeth * 3);
      for (let k = 0; k < ringSteps; k++) {
        const a = angle + (k / ringSteps) * Math.PI * 2;
        const px = gx + Math.round(Math.cos(a) * rPx);
        const py = gy + Math.round(Math.sin(a) * rPx);
        ctx.fillStyle = rimCol;
        fillRectClamped(px - 1, py - 1, 3, 3);
      }
      for (let t = 0; t < teeth; t++) {
        const a = angle + (t / teeth) * Math.PI * 2;
        const tx = gx + Math.round(Math.cos(a) * (rPx + Math.max(2, Math.round(3 * sf))));
        const ty = gy + Math.round(Math.sin(a) * (rPx + Math.max(2, Math.round(3 * sf))));
        ctx.fillStyle = hiCol;
        fillRectClamped(tx - 1, ty - 1, 3, 3);
        if (t % 2 === 0) {
          const sx = gx + Math.round(Math.cos(a) * rIn);
          const sy = gy + Math.round(Math.sin(a) * rIn);
          drawPixelSegment(gx, gy, sx, sy, rimCol, null, 2);
        }
      }
      ctx.fillStyle = hiCol;
      fillRectClamped(gx - 2, gy - 2, 4, 4);
      ctx.restore();
    };

    const drawCurvedAuroraRibbon = (yBase320, amp320, freq, speed, colCore, colEdge, alphaVal) => {
      // Silky feathered Borealis / Bifrost Northern Lights curtain built from smooth overlapping radial glows
      // drifting along an undulating sine wave (ZERO segmented rectangle seams, ZERO vertical bars!)
      const blobs = 7;
      for (let i = 0; i < blobs; i++) {
        const u = (i + 0.5) / blobs;
        const env = Math.sin(u * Math.PI);
        const wave =
          Math.sin(u * freq + elapsed * speed) * amp320 +
          Math.cos(u * (freq * 0.65) - elapsed * (speed * 0.72)) * (amp320 * 0.45);
        const gx = bustX + Math.round(u * bustSize);
        const gy = bustY + Math.round((yBase320 + wave) * sf);
        const rad = Math.round((34 + env * 22) * sf);
        drawMagicBloom(gx, gy, rad, colCore, colEdge, turnAlpha * alphaVal * (0.35 + env * 0.65));
      }
    };

    const drawDiagonalGodRay = (startX320, startY320, endX320, endY320, radStart320, radEnd320, colCore, colEdge, alphaVal) => {
      // Smooth feathered cathedral sun-shaft built from overlapping radial light-pools along a diagonal axis
      // (ZERO blocky staircase rectangles!)
      const steps = 6;
      const [x0, y0] = mapBgPt(startX320, startY320);
      const [x1, y1] = mapBgPt(endX320, endY320);
      for (let k = 0; k < steps; k++) {
        const t = k / (steps - 1);
        const gx = Math.round(x0 + (x1 - x0) * t);
        const gy = Math.round(y0 + (y1 - y0) * t);
        const rad = Math.round((radStart320 + (radEnd320 - radStart320) * t) * sf);
        drawMagicBloom(gx, gy, rad, colCore, colEdge, turnAlpha * alphaVal * (1.0 - t * 0.52));
      }
    };

    ctx.save();
    // 1. 12 HERO-AUTHENTIC ANIMATED ENVIRONMENT OVERLAYS (Locked to Painted Scenery, ZERO Vertical Sound-Wave Bars!)
    if (baseHero === 'nyx') {
      // Drifting feathered violet/cyan nebula clouds + streaking diagonal pixel shooting stars + twinkling cosmos!
      for (let c = 0; c < 3; c++) {
        const cxCloud = bustX + Math.round(((elapsed * (16 + c * 5) + c * 140) % (bustSize + 140)) - 70);
        const cyCloud = bustY + Math.round(bustSize * (0.18 + c * 0.20));
        drawMagicBloom(cxCloud, cyCloud, Math.round(bustSize * 0.26), c % 2 === 0 ? '#c084fc' : '#67e8f9', '#4c1d95', turnAlpha * (0.16 + pulse * 0.07));
      }
      // 2 streaking pixel comets darting diagonally across her dark night sky!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let cm = 0; cm < 2; cm++) {
        const cycle = (elapsed * (0.55 + cm * 0.18) + cm * 0.52) % 1.0;
        if (cycle < 0.62) {
          const p = cycle / 0.62;
          const x0 = cm === 0 ? 18 + p * 175 : 296 - p * 165;
          const y0 = cm === 0 ? 22 + p * 86 : 16 + p * 92;
          const [hx, hy] = mapBgPt(x0, y0);
          const [tx, ty] = mapBgPt(x0 + (cm === 0 ? -28 : 28), y0 - 15);
          ctx.globalAlpha = turnAlpha * Math.sin(p * Math.PI) * 0.90;
          drawPixelSegment(tx, ty, hx, hy, cm === 0 ? '#67e8f9' : '#f472b6', '#ffffff', 2);
          drawStar4(hx, hy, 4, '#ffffff');
        }
      }
      ctx.restore();
      for (let s = 0; s < 12; s++) {
        const sx = bustX + 14 + ((s * 67) % Math.max(24, bustSize - 28));
        const sy = bustY + 12 + ((s * 39) % Math.max(24, Math.round(bustSize * 0.58)));
        const tw = 0.25 + 0.75 * Math.abs(Math.sin(elapsed * (2.6 + (s % 3)) + s * 1.4));
        ctx.globalAlpha = turnAlpha * tw;
        drawStar4(sx, sy, s % 3 === 0 ? 4 : 2, s % 2 === 0 ? '#f472b6' : '#67e8f9');
      }
    } else if (baseHero === 'warrior') {
      // Silky feathered golden-azure gothic cathedral skylight god-rays + sanctuary sparkle motes!
      drawMagicBloom(bCx + Math.round(slowDrift * 26), bustY + Math.round(bustSize * 0.22), Math.round(bustSize * 0.50), '#fef9c3', '#38bdf8', turnAlpha * (0.22 + pulse * 0.10 + amp * 0.12));
      for (let ray = 0; ray < 3; ray++) {
        const rPulse = 0.55 + 0.45 * Math.sin(elapsed * 2.0 + ray * 1.9);
        const topX = 32 + ray * 88 + Math.sin(elapsed * 0.85 + ray) * 14;
        drawDiagonalGodRay(
          topX,
          10,
          topX + 76,
          236,
          28,
          44,
          ray === 1 ? '#fef9c3' : '#e0f2fe',
          ray === 1 ? '#fbbf24' : '#38bdf8',
          0.16 * rPulse
        );
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let m = 0; m < 8; m++) {
        const prog = (elapsed * (0.30 + (m % 3) * 0.08) + m * 0.15) % 1;
        const [mx, my] = mapBgPt(24 + ((m * 43) % 272), 260 - prog * 230);
        ctx.globalAlpha = turnAlpha * Math.sin(prog * Math.PI) * 0.78;
        drawStar4(mx, my, m % 2 === 0 ? 3 : 2, m % 2 === 0 ? '#fef08a' : '#7dd3fc');
      }
      ctx.restore();
    } else if (baseHero === 'mage') {
      // Flickering stained-glass gothic sun window flare + pulsing lower furnace wall lava cracks + warm firelight!
      const [winX, winY] = mapBgPt(276, 98);
      drawMagicBloom(winX, winY, Math.round(52 * sf * (0.92 + pulse * 0.20)), '#ffffff', '#fbbf24', turnAlpha * (0.38 + pulse * 0.18 + amp * 0.22));
      const [lavR_x, lavR_y] = mapBgPt(280, 242);
      const [lavL_x, lavL_y] = mapBgPt(38, 256);
      drawMagicBloom(lavR_x, lavR_y, Math.round(48 * sf), '#fde047', '#ea580c', turnAlpha * (0.32 + pulse * 0.20 + amp * 0.16));
      drawMagicBloom(lavL_x, lavL_y, Math.round(40 * sf), '#fde047', '#dc2626', turnAlpha * (0.28 + pulse * 0.18));
      // Flickering molten wall crack glow lines on right masonry
      const crackFlicker = 0.45 + 0.55 * Math.abs(Math.sin(elapsed * 5.8));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = turnAlpha * crackFlicker * 0.72;
      const [c0x, c0y] = mapBgPt(254, 248);
      const [c1x, c1y] = mapBgPt(278, 232);
      const [c2x, c2y] = mapBgPt(304, 240);
      drawPixelSegment(c0x, c0y, c1x, c1y, '#f97316', '#fef08a', 3);
      drawPixelSegment(c1x, c1y, c2x, c2y, '#f97316', '#fef08a', 3);
      ctx.restore();
      const glowX = bCx + Math.round(Math.sin(elapsed * 2.8) * 16);
      drawMagicBloom(glowX, bustY + bustSize - 24, Math.round(bustSize * 0.58), '#fde047', '#ea580c', turnAlpha * (0.26 + pulse * 0.14 + amp * 0.18));
    } else if (baseHero === 'priestess') {
      // Silky feathered golden stained-glass rose-window sunbeams + shimmering radiant angel-wing light sparkles!
      const [roseX, roseY] = mapBgPt(158, 34);
      drawMagicBloom(roseX, roseY, Math.round(bustSize * 0.50), '#ffffff', '#fbbf24', turnAlpha * (0.28 + pulse * 0.12 + amp * 0.14));
      for (let ray = 0; ray < 3; ray++) {
        const rPulse = 0.55 + 0.45 * Math.sin(elapsed * 2.1 + ray * 1.8);
        drawDiagonalGodRay(
          132 + ray * 26,
          24,
          44 + ray * 116,
          246,
          26,
          46,
          '#fef9c3',
          '#f59e0b',
          0.16 * rPulse
        );
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // Shimmering sparkles rippling gently across her painted left & right angel wings!
      const wingPts = [
        [26, 152], [58, 178], [42, 212], [78, 224], [24, 246],
        [244, 166], [272, 188], [296, 168], [262, 228], [292, 238]
      ];
      for (let wi = 0; wi < wingPts.length; wi++) {
        const tw = Math.sin(elapsed * 4.4 + wi * 0.9);
        if (tw > 0.15) {
          const [wx, wy] = mapBgPt(wingPts[wi][0], wingPts[wi][1]);
          ctx.globalAlpha = turnAlpha * tw * 0.85;
          drawStar4(wx, wy, wi % 2 === 0 ? 4 : 3, '#fef9c3');
        }
      }
      ctx.restore();
    } else if (baseHero === 'chronomancer') {
      // Animated spinning pixel clockwork gears over his painted left gears + rotating cyan-gold clock hand & halo!
      const [clkX, clkY] = mapBgPt(160, 118);
      drawMagicBloom(clkX, clkY, Math.round(bustSize * 0.46), '#ccfbf1', '#14b8a6', turnAlpha * (0.24 + pulse * 0.12 + amp * 0.18));
      // Rotating brass & cyan clockwork gears cleanly matching his left painted background gears!
      drawPixelGear(42, 74, 21, 8, elapsed * 0.95, '#eab308', '#fef08a', 0.62);
      drawPixelGear(40, 168, 26, 10, -elapsed * 0.72, '#14b8a6', '#99f6e4', 0.66);
      drawPixelGear(76, 146, 13, 6, elapsed * 1.45, '#f59e0b', '#fef08a', 0.56);
      // Rotating glowing temporal clock hand + solid translucent 12-segment halo ring around his painted clockface!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const handAng = elapsed * 1.05 - Math.PI * 0.5;
      const handR = Math.round(92 * sf);
      const hx = clkX + Math.round(Math.cos(handAng) * handR);
      const hy = clkY + Math.round(Math.sin(handAng) * handR);
      ctx.globalAlpha = turnAlpha * 0.62;
      drawPixelSegment(clkX, clkY, hx, hy, '#2dd4bf', '#ffffff', 3);
      // Solid translucent geometric outer temporal ring (ZERO circling dust dots!)
      const ringR = Math.round(98 * sf * (0.98 + pulse * 0.03));
      const ringSegs = 24;
      ctx.globalAlpha = turnAlpha * (0.24 + pulse * 0.10);
      for (let k = 0; k < ringSegs; k++) {
        const a0 = (k / ringSegs) * Math.PI * 2;
        const a1 = ((k + 1) / ringSegs) * Math.PI * 2;
        drawPixelSegment(
          clkX + Math.round(Math.cos(a0) * ringR),
          clkY + Math.round(Math.sin(a0) * ringR),
          clkX + Math.round(Math.cos(a1) * ringR),
          clkY + Math.round(Math.sin(a1) * ringR),
          k % 2 === 0 ? '#5eead4' : '#fde047',
          null,
          2
        );
      }
      ctx.restore();
    } else if (baseHero === 'valkyrie') {
      // Dynamic forked golden Bifrost sky lightning bolts + silky feathered emerald-gold aurora + glowing fiery wings!
      drawCurvedAuroraRibbon(34, 13, 4.8, 1.8, '#a7f3d0', '#10b981', 0.26);
      drawCurvedAuroraRibbon(56, 10, 4.2, -1.4, '#fef08a', '#f97316', 0.18);
      const vTick = Math.floor(elapsed * 9);
      if (vTick % 4 === 0 || vTick % 7 === 0 || amp > 0.48) {
        const boltX = 212 + ((vTick * 19) % 48);
        drawForkedBolt(boltX, 4, 8, 5, 22, vTick, '#f59e0b', '#ffffff', 0.88);
        drawMagicBloom(mapBgPt(boltX + 18, 42)[0], mapBgPt(boltX + 18, 42)[1], Math.round(78 * sf), '#fef9c3', '#f59e0b', turnAlpha * 0.34);
      }
      if (vTick % 6 === 2) {
        drawForkedBolt(46 + ((vTick * 13) % 34), 6, -6, 4, 24, vTick + 3, '#fbbf24', '#ffffff', 0.72);
      }
      // Breathing fiery radiance behind both crimson-gold Valkyrie wings
      const [wLx, wLy] = mapBgPt(54, 168);
      const [wRx, wRy] = mapBgPt(264, 162);
      drawMagicBloom(wLx, wLy, Math.round(62 * sf), '#fde047', '#ea580c', turnAlpha * (0.24 + pulse * 0.14));
      drawMagicBloom(wRx, wRy, Math.round(66 * sf), '#fde047', '#f43f5e', turnAlpha * (0.24 + pulse * 0.14));
    } else if (baseHero === 'ronin') {
      // Signature Stormy Sky Forked Cyan-White Lightning Bolts flashing behind Kaze-Maru + slanting storm rain!
      const rTick = Math.floor(elapsed * 10);
      const mainBoltOn = rTick % 3 === 0 || rTick % 5 === 0 || amp > 0.42;
      const sideBoltOn = rTick % 5 === 2 || amp > 0.65;
      if (mainBoltOn) {
        const startX = 248 + ((rTick * 17) % 36);
        drawForkedBolt(startX, 2, -6, 6, 30, rTick, '#38bdf8', '#ffffff', 0.94);
        const [flX, flY] = mapBgPt(startX, 82);
        drawMagicBloom(flX, flY, Math.round(96 * sf), '#e0f2fe', '#38bdf8', turnAlpha * 0.42);
      }
      if (sideBoltOn) {
        const startX2 = 34 + ((rTick * 23) % 42);
        drawForkedBolt(startX2, 6, 7, 5, 26, rTick + 5, '#7dd3fc', '#ffffff', 0.80);
        const [fl2X, fl2Y] = mapBgPt(startX2 + 12, 68);
        drawMagicBloom(fl2X, fl2Y, Math.round(72 * sf), '#bae6fd', '#0284c7', turnAlpha * 0.28);
      }
      // Crisp slanting storm rain streaks strictly in dark sky behind his white mane!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = turnAlpha * 0.34;
      ctx.fillStyle = '#bae6fd';
      for (let rn = 0; rn < 18; rn++) {
        const prog = (elapsed * (1.85 + (rn % 3) * 0.32) + rn * 0.17) % 1;
        const rx = bustX + Math.round(((rn * 43) + prog * bustSize * 0.36) % bustSize);
        const ry = bustY + Math.round(prog * bustSize);
        fillRectClamped(rx, ry, 1, 11);
        fillRectClamped(rx + 1, ry + 9, 1, 9);
      }
      ctx.restore();
    } else if (baseHero === 'archer') {
      // Twinkling enchanted forest constellations + graceful curved emerald wind-ribbons sweeping behind Sylvara!
      for (let b = 0; b < 4; b++) {
        const bx = bustX + Math.round(bustSize * (0.16 + b * 0.22)) + Math.round(Math.sin(elapsed * 1.4 + b * 1.5) * 18);
        const by = bustY + Math.round(bustSize * (0.24 + (b % 2) * 0.32)) + Math.round(Math.cos(elapsed * 1.8 + b) * 12);
        drawMagicBloom(bx, by, Math.round(bustSize * 0.24), '#fef9c3', '#10b981', turnAlpha * (0.20 + pulse * 0.09));
      }
      // Flowing sinusoidal forest breeze ribbons sweeping smoothly across the enchanted canopy
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let w = 0; w < 2; w++) {
        const headP = (elapsed * (0.48 + w * 0.14) + w * 0.50) % 1.0;
        const baseY320 = w === 0 ? 78 : 206;
        for (let seg = 0; seg < 14; seg++) {
          const u = headP - seg * 0.028;
          if (u < 0 || u > 1) continue;
          const x320 = u * 320;
          const y320 = baseY320 + Math.sin(u * 9.0 + elapsed * 3.0 + w * 2.1) * 14;
          const [wx, wy] = mapBgPt(x320, y320);
          ctx.globalAlpha = turnAlpha * (1 - seg / 14) * Math.sin(u * Math.PI) * 0.72;
          ctx.fillStyle = seg < 4 ? '#fef9c3' : '#34d399';
          fillRectClamped(wx - 2, wy - 1, 5, 2);
        }
      }
      // Twinkling enchanted forest constellation stars matching her painted sky-lines
      const constelPts = [[48, 42], [92, 62], [218, 36], [244, 78], [212, 114], [38, 198], [272, 264]];
      for (let ci = 0; ci < constelPts.length; ci++) {
        const [cxP, cyP] = mapBgPt(constelPts[ci][0], constelPts[ci][1]);
        const tw = 0.25 + 0.75 * Math.abs(Math.sin(elapsed * 3.2 + ci * 1.1));
        ctx.globalAlpha = turnAlpha * tw;
        drawStar4(cxP, cyP, ci % 2 === 0 ? 4 : 3, ci % 3 === 0 ? '#fef08a' : '#6ee7b7');
      }
      ctx.restore();
    } else if (baseHero === 'reaper') {
      // Throbbing Crimson Blood-Eclipse corona + forked violet cursed lightning over gothic spires + rising phantom mist!
      const [eclX, eclY] = mapBgPt(158, 108);
      drawMagicBloom(eclX, eclY, Math.round(bustSize * 0.54 * (0.94 + pulse * 0.14)), '#fb7185', '#9333ea', turnAlpha * (0.38 + pulse * 0.18 + amp * 0.22));
      const rpTick = Math.floor(elapsed * 9);
      if (rpTick % 5 === 0 || amp > 0.52) {
        drawForkedBolt(36 + ((rpTick * 17) % 32), 18, 6, 4, 24, rpTick, '#c084fc', '#fae8ff', 0.78);
      }
      if (rpTick % 6 === 3) {
        drawForkedBolt(282 - ((rpTick * 13) % 28), 22, -6, 4, 24, rpTick + 4, '#e879f9', '#ffffff', 0.76);
      }
      for (let m = 0; m < 4; m++) {
        const mx = bustX + Math.round(bustSize * (0.16 + m * 0.23)) + Math.round(Math.sin(elapsed * 1.9 + m * 1.8) * 18);
        const my = bustY + bustSize - Math.round(((elapsed * 0.30 + m * 0.27) % 1) * bustSize * 0.78);
        drawMagicBloom(mx, my, Math.round(bustSize * 0.22), '#f0abfc', '#7e22ce', turnAlpha * 0.22);
      }
    } else if (baseHero === 'titan') {
      // Pulsing molten volcanic lava-crack fissure flares lighting up the cavern walls behind BOTH shoulders!
      const lavaPulse = 0.45 + 0.55 * Math.sin(elapsed * 4.8);
      const [lLx, lLy] = mapBgPt(42, 134);
      const [lRx, lRy] = mapBgPt(274, 128);
      drawMagicBloom(lLx, lLy, Math.round(58 * sf), '#fde047', '#ea580c', turnAlpha * (0.28 + lavaPulse * 0.20 + amp * 0.18));
      drawMagicBloom(lRx, lRy, Math.round(64 * sf), '#fde047', '#dc2626', turnAlpha * (0.30 + lavaPulse * 0.22 + amp * 0.18));
      // Glowing animated lava vein crack flickers on dark volcanic wall!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = turnAlpha * (0.48 + lavaPulse * 0.42);
      const veins = [
        [[26, 94], [48, 122], [36, 152], [62, 174]],
        [[286, 68], [268, 102], [292, 132], [266, 164]]
      ];
      for (const v of veins) {
        for (let k = 0; k < v.length - 1; k++) {
          const [x0, y0] = mapBgPt(v[k][0], v[k][1]);
          const [x1, y1] = mapBgPt(v[k + 1][0], v[k + 1][1]);
          drawPixelSegment(x0, y0, x1, y1, '#f97316', '#fef08a', 3);
        }
      }
      ctx.restore();
      const glowX = bCx + Math.round(Math.sin(elapsed * 2.6) * 14);
      drawMagicBloom(glowX, bustY + bustSize - 22, Math.round(bustSize * 0.58), '#fde047', '#ea580c', turnAlpha * (0.28 + pulse * 0.14 + amp * 0.18));
      drawMagicBloom(mapBgPt(204, 62)[0], mapBgPt(204, 62)[1], Math.round(bustSize * 0.30), '#a7f3d0', '#10b981', turnAlpha * (0.22 + amp * 0.16));
    } else if (baseHero === 'icemage') {
      // Undulating silky feathered Borealis aurora curtains (ZERO segmented rectangles, ZERO vertical bars!) + background parallax snow!
      drawCurvedAuroraRibbon(34, 14, 4.8, 1.5, '#e0f2fe', '#38bdf8', 0.28);
      drawCurvedAuroraRibbon(62, 11, 4.0, -1.2, '#c7d2fe', '#818cf8', 0.22);
      // Soft distant background snowflakes drifting BEHIND Lyra's crown & hair
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let sn = 0; sn < 14; sn++) {
        const prog = (elapsed * (0.20 + (sn % 3) * 0.06) + sn * 0.11) % 1;
        const sx = bustX + 10 + ((sn * 47) % Math.max(24, bustSize - 20)) + Math.round(Math.sin(elapsed * 2.0 + sn) * 9);
        const sy = bustY + 6 + Math.round(prog * (bustSize - 16));
        ctx.globalAlpha = turnAlpha * (0.58 - prog * 0.25);
        ctx.fillStyle = sn % 2 === 0 ? '#bae6fd' : '#e0f2fe';
        fillRectClamped(sx - 1, sy - 1, 3, 3);
        fillRectClamped(sx, sy - 2, 1, 5);
        fillRectClamped(sx - 2, sy, 5, 1);
      }
      ctx.restore();
    } else if (baseHero === 'brawler') {
      // RAIJIN EX BACK: Storm-indigo cloud flash & golden-indigo electric halo strictly behind Raijin's shoulders!
      drawMagicBloom(bCx, bCy, Math.round(bustSize * 0.5), '#fbbf24', '#4338ca', turnAlpha * (0.22 + pulse * 0.1 + amp * 0.16));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let sp = 0; sp < 10; sp++) {
        const prog = (elapsed * (0.52 + (sp % 3) * 0.14) + sp * 0.13) % 1;
        const sx = bustX + 14 + ((sp * 61) % Math.max(24, bustSize - 28)) + Math.round(Math.sin(elapsed * 5 + sp) * 8);
        const sy = bustY + bustSize - 10 - Math.round(prog * (bustSize - 20));
        ctx.globalAlpha = turnAlpha * (0.6 - prog * 0.36);
        drawStar4(sx, sy, 2, sp % 2 === 0 ? '#fbbf24' : '#6366f1');
      }
      ctx.restore();
    } else {
      // ANDROID: Deep-space twinkling stars + warp star-streaks + blinking holographic cockpit HUD panels strictly BEHIND her shoulders!
      drawMagicBloom(bCx, bCy, Math.round(bustSize * 0.48), '#67e8f9', '#ec4899', turnAlpha * (0.20 + pulse * 0.08 + amp * 0.16));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // Twinkling deep-space stars & subtle diagonal warp star-glints
      for (let s = 0; s < 12; s++) {
        const sx = bustX + 12 + ((s * 73) % Math.max(24, bustSize - 24));
        const sy = bustY + 10 + ((s * 41) % Math.max(24, Math.round(bustSize * 0.56)));
        const tw = 0.25 + 0.75 * Math.abs(Math.sin(elapsed * (3.0 + (s % 3)) + s));
        ctx.globalAlpha = turnAlpha * tw;
        drawStar4(sx, sy, 2, s % 2 === 0 ? '#67e8f9' : '#f472b6');
      }
      // Animated holographic starship cockpit HUD telemetry strictly inside her dark right & left monitor panels (0 face crossing!)
      const hudTick = Math.floor(elapsed * 8);
      for (let row = 0; row < 5; row++) {
        const rLen = 14 + ((hudTick * 7 + row * 13) % 36);
        const [rx, ry] = mapBgPt(244, 72 + row * 18);
        ctx.globalAlpha = turnAlpha * (0.42 + 0.28 * Math.abs(Math.sin(elapsed * 4.5 + row)));
        ctx.fillStyle = row % 2 === 0 ? '#22d3ee' : '#f472b6';
        const rw = Math.round(rLen * sf);
        fillRectClamped(isRightSpeaker ? rx - rw : rx, ry, rw, Math.max(2, Math.round(2 * sf)));
        fillRectClamped(isRightSpeaker ? rx - rw - 6 : rx + rw + 3, ry, 3, Math.max(2, Math.round(2 * sf)));
      }
      for (let row = 0; row < 4; row++) {
        const lLen = 12 + ((hudTick * 5 + row * 11) % 30);
        const [lx, ly] = mapBgPt(18, 138 + row * 16);
        ctx.globalAlpha = turnAlpha * (0.38 + 0.24 * Math.abs(Math.cos(elapsed * 4.0 + row)));
        ctx.fillStyle = row % 2 === 0 ? '#38bdf8' : '#e879f9';
        const lw = Math.round(lLen * sf);
        fillRectClamped(isRightSpeaker ? lx - lw : lx, ly, lw, Math.max(2, Math.round(2 * sf)));
      }
      // Crackling neon plasma lightning sparks along the back of her katana sky-edge!
      if (hudTick % 4 === 0 || amp > 0.45) {
        drawForkedBolt(22 + ((hudTick * 11) % 24), 52, 12, 3, 18, hudTick, '#22d3ee', '#ffffff', 0.80);
      }
      ctx.restore();
    }

    // 2. Soft Magical Back-Silhouette Rim Aura wrapping cleanly behind the transparent Apple Vision silhouette!
    drawMagicBloom(
      bCx,
      bCy,
      Math.round(bustSize * (0.46 + pulse * 0.05 + amp * 0.07)),
      '#ffffff',
      spkCol,
      turnAlpha * (0.22 + pulse * 0.10 + amp * 0.20)
    );
    ctx.restore();
    ctx.globalAlpha = turnAlpha;
  }

  _drawIntroBustHeroOverlayFX(ctx, cfg) {
    // Layer 6: Weapon/Hand/Orb-Locked Soft Magical Radial Blooms + 12 Hero-Unique Delicate Foreground Particles
    // (ZERO blocky vertical sound-wave bars, ZERO horizontal scanlines slicing across faces!)
    const {
      baseHero,
      bustX,
      bustY,
      bustSize,
      elapsed,
      amp,
      spkCol,
      turnAlpha,
      isRightSpeaker,
      bodyDx = 0,
      bodyDy = 0,
      frontDx = 0,
      frontDy = 0,
      fillRectClamped,
      drawStar4
    } = cfg;
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 6.5);
    const sf = bustSize / 320;

    const mapHotspot = (px320, py320, useFront = false) => {
      const dx = useFront ? frontDx : bodyDx;
      const dy = useFront ? frontDy : bodyDy;
      const lx = isRightSpeaker ? (320 - px320) * sf - dx : px320 * sf + dx;
      const ly = py320 * sf + dy;
      return [bustX + Math.round(lx), bustY + Math.round(ly)];
    };

    const drawSpotMagicBloom = (hx, hy, rad, coreCol, midCol, alphaVal) => {
      if (typeof ctx.createRadialGradient !== 'function' || alphaVal <= 0.005 || rad <= 4) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, Math.min(1, alphaVal));
      const rg = ctx.createRadialGradient(hx, hy, Math.max(2, Math.round(rad * 0.10)), hx, hy, rad);
      if (rg && typeof rg.addColorStop === 'function') {
        rg.addColorStop(0, coreCol);
        rg.addColorStop(0.42, midCol);
        rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rg;
        fillRectClamped(hx - rad, hy - rad, rad * 2, rad * 2);
      }
      ctx.restore();
    };

    const drawMiniHeart = (hx, hy, col) => {
      ctx.fillStyle = col;
      fillRectClamped(hx - 4, hy - 2, 3, 3);
      fillRectClamped(hx + 1, hy - 2, 3, 3);
      fillRectClamped(hx - 4, hy + 1, 8, 2);
      fillRectClamped(hx - 2, hy + 3, 4, 2);
      fillRectClamped(hx - 1, hy + 5, 2, 2);
    };

    const drawPixelSnowflake = (fx, fy, sz, col) => {
      ctx.fillStyle = col;
      fillRectClamped(fx - sz, fy, sz * 2 + 1, 2);
      fillRectClamped(fx, fy - sz, 2, sz * 2 + 1);
      if (sz >= 4) {
        fillRectClamped(fx - sz + 2, fy - sz + 2, 2, 2);
        fillRectClamped(fx + sz - 2, fy - sz + 2, 2, 2);
        fillRectClamped(fx - sz + 2, fy + sz - 2, 2, 2);
        fillRectClamped(fx + sz - 2, fy + sz - 2, 2, 2);
      }
      ctx.fillStyle = '#ffffff';
      fillRectClamped(fx - 1, fy - 1, 3, 3);
    };

    const drawStepLightning = (x0, y0, dx, dy, segs, col) => {
      let lx = x0;
      let ly = y0;
      for (let i = 0; i < segs; i++) {
        const zig = (i % 2 === 0 ? 1 : -1) * (3 + ((i * 5) % 5));
        const nx = lx + dx + zig;
        const ny = ly + dy;
        const steps = 4;
        for (let s = 0; s <= steps; s++) {
          const px = Math.round(lx + ((nx - lx) * s) / steps);
          const py = Math.round(ly + ((ny - ly) * s) / steps);
          ctx.fillStyle = col;
          fillRectClamped(px - 1, py - 1, 3, 3);
          ctx.fillStyle = '#ffffff';
          fillRectClamped(px, py, 1, 1);
        }
        lx = nx;
        ly = ny;
      }
    };

    const drawTranslucentSolarFireBed = (colOuter, colCore, speed, waveH320, alphaVal) => {
      // Used EXCLUSIVELY by Ignis Sol (`mage`): organic translucent flickering stepped-pixel furnace flames!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cols = 48;
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols;
        const env = 0.30 + 0.70 * Math.sin(u * Math.PI);
        const wv =
          0.48 +
          0.32 * Math.sin(u * 12.0 - elapsed * speed) +
          0.20 * Math.cos(u * 19.0 + elapsed * (speed * 1.4));
        const hPx = Math.max(6, Math.round(waveH320 * sf * env * wv));
        const rx0 = bustX + Math.round((c / cols) * bustSize);
        const rx1 = bustX + Math.round(((c + 1) / cols) * bustSize);
        const colW = rx1 - rx0;
        if (colW <= 0) continue;
        const ry = bustY + bustSize - hPx;
        ctx.globalAlpha = Math.max(0, Math.min(1, turnAlpha * alphaVal));
        ctx.fillStyle = colOuter;
        fillRectClamped(rx0, ry, colW, hPx);
        ctx.globalAlpha = Math.max(0, Math.min(1, turnAlpha * (alphaVal * 0.72)));
        ctx.fillStyle = colCore;
        fillRectClamped(rx0, bustY + bustSize - Math.max(3, hPx >> 1), colW, Math.max(3, hPx >> 1));
      }
      ctx.restore();
    };

    ctx.save();
    if (typeof ctx.beginPath === 'function' && typeof ctx.rect === 'function' && typeof ctx.clip === 'function') {
      ctx.beginPath();
      ctx.rect(bustX, bustY, bustSize, bustSize);
      ctx.clip();
    }

    // 1. WEAPON, HAND & MAGIC CORE LOCKED SOFT RADIAL BLOOMS (ZERO generic circling dust, ZERO reused diamond rings!)
    const MAGIC_HOTSPOTS = {
      nyx: [
        { x: 263, y: 145, r: 36, c0: '#e0f2fe', c1: '#22d3ee', front: true },
        { x: 256, y: 215, r: 22, c0: '#fce7f3', c1: '#f472b6', front: false }
      ],
      warrior: [
        { x: 268, y: 112, r: 38, c0: '#e0f2fe', c1: '#38bdf8', front: false },
        { x: 192, y: 248, r: 28, c0: '#fef9c3', c1: '#fbbf24', front: false }
      ],
      mage: [
        { x: 58, y: 196, r: 46, c0: '#ffffff', c1: '#f59e0b', front: false },
        { x: 184, y: 240, r: 30, c0: '#fef08a', c1: '#ea580c', front: false }
      ],
      priestess: [
        { x: 282, y: 132, r: 42, c0: '#ffffff', c1: '#fde047', front: false },
        { x: 162, y: 74, r: 36, c0: '#fef9c3', c1: '#fbbf24', front: false }
      ],
      chronomancer: [
        { x: 160, y: 252, r: 32, c0: '#e0f2fe', c1: '#2dd4bf', front: false },
        { x: 282, y: 112, r: 34, c0: '#ccfbf1', c1: '#14b8a6', front: false }
      ],
      valkyrie: [
        { x: 274, y: 66, r: 34, c0: '#fef9c3', c1: '#f97316', front: false },
        { x: 158, y: 248, r: 24, c0: '#fde047', c1: '#f43f5e', front: false }
      ],
      ronin: [
        { x: 294, y: 246, r: 36, c0: '#e0f2fe', c1: '#38bdf8', front: false },
        { x: 198, y: 218, r: 26, c0: '#bae6fd', c1: '#0284c7', front: false }
      ],
      archer: [
        { x: 286, y: 224, r: 40, c0: '#ecfdf5', c1: '#10b981', front: false },
        { x: 276, y: 98, r: 26, c0: '#fef9c3', c1: '#34d399', front: false }
      ],
      reaper: [
        { x: 158, y: 262, r: 38, c0: '#fae8ff', c1: '#d946ef', front: false },
        { x: 156, y: 42, r: 38, c0: '#f5d0fe', c1: '#a855f7', front: false }
      ],
      titan: [
        { x: 204, y: 64, r: 42, c0: '#d1fae5', c1: '#10b981', front: false },
        { x: 162, y: 288, r: 42, c0: '#fef08a', c1: '#ea580c', front: false }
      ],
      icemage: [
        { x: 266, y: 108, r: 40, c0: '#ffffff', c1: '#38bdf8', front: false },
        { x: 166, y: 54, r: 30, c0: '#e0f2fe', c1: '#818cf8', front: false }
      ],
      android: [
        { x: 184, y: 262, r: 38, c0: '#e0f2fe', c1: '#22d3ee', front: false },
        { x: 54, y: 92, r: 32, c0: '#fce7f3', c1: '#ec4899', front: false }
      ]
    };

    const spots = MAGIC_HOTSPOTS[baseHero] || MAGIC_HOTSPOTS.warrior;
    for (let si = 0; si < spots.length; si++) {
      const sp = spots[si];
      const [sx, sy] = mapHotspot(sp.x, sp.y, sp.front);
      const rad = Math.round(sp.r * sf * (0.90 + pulse * 0.16 + amp * 0.24));
      drawSpotMagicBloom(sx, sy, rad, sp.c0, sp.c1, turnAlpha * (0.28 + pulse * 0.10 + amp * 0.18));
    }

    // Soft Hero-Colored Lower Rim Magical Uplight
    if (typeof ctx.createLinearGradient === 'function') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = turnAlpha * (0.12 + pulse * 0.05 + amp * 0.08);
      const bgGrad = ctx.createLinearGradient(bustX, bustY + bustSize, bustX, bustY + Math.round(bustSize * 0.66));
      if (bgGrad && typeof bgGrad.addColorStop === 'function') {
        bgGrad.addColorStop(0, spkCol);
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGrad;
        fillRectClamped(bustX, bustY + Math.round(bustSize * 0.66), bustSize, Math.round(bustSize * 0.34));
      }
      ctx.restore();
    }

    // 2. 12 COMPLETELY UNIQUE TRANSLUCENT SOLID HERO EFFECTS (ZERO reused diamond/polygon rings, ZERO straight ruler sticks!)
    if (baseHero === 'nyx') {
      // UNIQUE TO NYX: Translucent cyber-streamer pixel chat/emoji bubbles & mini-hearts floating softly beside Cob!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const [cobX, cobY] = mapHotspot(263, 145, true);
      // Translucent pixel sound/chat pop-up frame hovering cleanly above Cob
      const popOff = Math.round(Math.sin(elapsed * 3.6) * 5 * sf);
      const bx = cobX - Math.round(18 * sf);
      const by = cobY - Math.round(36 * sf) + popOff;
      const bw = Math.round(36 * sf);
      const bh = Math.round(14 * sf);
      ctx.globalAlpha = turnAlpha * 0.28;
      ctx.fillStyle = '#22d3ee';
      fillRectClamped(bx, by, bw, bh);
      ctx.globalAlpha = turnAlpha * 0.56;
      ctx.fillStyle = '#e0f2fe';
      fillRectClamped(bx, by, bw, 2);
      fillRectClamped(bx, by + bh - 2, bw, 2);
      fillRectClamped(bx + 5, by + Math.round(bh * 0.42), Math.round(bw * 0.55), 2);
      for (let h = 0; h < 5; h++) {
        const prog = (elapsed * (0.34 + (h % 2) * 0.10) + h * 0.20) % 1;
        const hx = bustX + 24 + ((h * 89) % Math.max(24, bustSize - 48)) + Math.round(Math.sin(elapsed * 3.0 + h) * 7);
        const hy = bustY + bustSize - 12 - Math.round(prog * (bustSize - 32));
        ctx.globalAlpha = turnAlpha * (0.58 - prog * 0.42);
        drawMiniHeart(hx, hy, h % 2 === 0 ? '#f472b6' : '#67e8f9');
      }
      ctx.restore();
    } else if (baseHero === 'warrior') {
      // UNIQUE TO WARRIOR: Feathered traveling Dawn-Breaker blade-core specular glint + rising golden paladin aura mist!
      const swProg = (elapsed * 0.85) % 1;
      const [glX, glY] = mapHotspot(200 + swProg * 102, 238 - swProg * 204, false);
      drawSpotMagicBloom(glX, glY, Math.round(28 * sf), '#ffffff', '#38bdf8', turnAlpha * Math.sin(swProg * Math.PI) * 0.52);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = turnAlpha * Math.sin(swProg * Math.PI) * 0.72;
      drawStar4(glX, glY, Math.max(5, Math.round(7 * sf)), '#e0f2fe');
      // Soft translucent rising golden cathedral ember ribbons strictly along left/right frame edges
      for (let w = 0; w < 4; w++) {
        const prog = (elapsed * (0.36 + (w % 2) * 0.10) + w * 0.25) % 1;
        const wx = bustX + (w % 2 === 0 ? 18 + w * 12 : bustSize - 22 - w * 10);
        const wy = bustY + bustSize - 10 - Math.round(prog * (bustSize * 0.72));
        ctx.globalAlpha = turnAlpha * Math.sin(prog * Math.PI) * 0.32;
        ctx.fillStyle = w % 2 === 0 ? '#fef08a' : '#7dd3fc';
        fillRectClamped(wx - 2, wy - 8, 4, 14);
      }
      ctx.restore();
    } else if (baseHero === 'mage') {
      // UNIQUE TO MAGE: Translucent organic flickering Solar Furnace Fire-Bed along the bottom + warm rising embers!
      drawTranslucentSolarFireBed('#ea580c', '#fde047', 4.8, 38, 0.26 + amp * 0.08);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let e = 0; e < 10; e++) {
        const prog = (elapsed * (0.55 + (e % 3) * 0.14) + e * 0.11) % 1;
        const ex = bustX + 16 + ((e * 61) % Math.max(24, bustSize - 32)) + Math.round(Math.sin(elapsed * 4.8 + e) * 9);
        const ey = bustY + bustSize - 8 - Math.round(prog * (bustSize - 20));
        ctx.globalAlpha = turnAlpha * (0.64 - prog * 0.48);
        ctx.fillStyle = e % 2 === 0 ? '#fde047' : '#f97316';
        fillRectClamped(ex - 2, ey - 2, 4, 4);
      }
      ctx.restore();
    } else if (baseHero === 'priestess') {
      // UNIQUE TO PRIESTESS: Soft radiant sunburst bloom on Cross-Staff + delicate drifting solid angel feathers!
      const [stX, stY] = mapHotspot(282, 132, false);
      drawSpotMagicBloom(stX, stY, Math.round((44 + pulse * 14) * sf), '#ffffff', '#fde047', turnAlpha * (0.28 + amp * 0.12));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let f = 0; f < 8; f++) {
        const prog = (elapsed * (0.26 + (f % 3) * 0.08) + f * 0.14) % 1;
        const fx = bustX + 18 + ((f * 71) % Math.max(24, bustSize - 36)) + Math.round(Math.sin(elapsed * 2.4 + f * 1.5) * 16);
        const fy = bustY + 8 + Math.round(prog * (bustSize - 24));
        ctx.globalAlpha = turnAlpha * (0.54 - prog * 0.30);
        ctx.fillStyle = '#fef08a';
        fillRectClamped(fx - 5, fy, 10, 2);
        ctx.fillStyle = '#ffffff';
        fillRectClamped(fx - 3, fy - 1, 6, 3);
        fillRectClamped(fx + 3, fy + 1, 3, 2);
      }
      ctx.restore();
    } else if (baseHero === 'chronomancer') {
      // UNIQUE TO CHRONOMANCER: Falling luminous cyan sand stream inside his chest hourglass + subtle temporal shimmer!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const [hgTopX, hgTopY] = mapHotspot(160, 238, false);
      const [hgBotX, hgBotY] = mapHotspot(160, 266, false);
      ctx.globalAlpha = turnAlpha * (0.36 + pulse * 0.20);
      ctx.fillStyle = '#5eead4';
      fillRectClamped(hgTopX - 1, hgTopY, 3, Math.max(8, hgBotY - hgTopY));
      for (let g = 0; g < 3; g++) {
        const gp = (elapsed * 1.6 + g * 0.33) % 1.0;
        const gy = Math.round(hgTopY + gp * (hgBotY - hgTopY));
        ctx.globalAlpha = turnAlpha * 0.78;
        ctx.fillStyle = '#ffffff';
        fillRectClamped(hgTopX - 1, gy, 3, 3);
      }
      // Subtle translucent golden temporal pulse arcs at outer left/right edges (matching clockwork theme!)
      const tP = (elapsed * 0.75) % 1.0;
      const [glX, glY] = mapHotspot(282, 112, false);
      drawSpotMagicBloom(glX, glY, Math.round((24 + tP * 20) * sf), '#ccfbf1', '#14b8a6', turnAlpha * (1 - tP) * 0.32);
      ctx.restore();
    } else if (baseHero === 'valkyrie') {
      // UNIQUE TO VALKYRIE: Crackling golden Bifrost lightning along Gungnir spearhead + soaring wing-tip phoenix embers!
      const [sx, sy] = mapHotspot(272, 62, false);
      const boltTick = Math.floor(elapsed * 11);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (boltTick % 3 === 0 || amp > 0.48) {
        ctx.globalAlpha = turnAlpha * 0.62;
        drawStepLightning(sx - 8, sy - 14, 6, 12, 4, '#fbbf24');
      }
      // Warm translucent crimson-gold wing embers rising smoothly along BOTH outer portrait edges!
      for (let v = 0; v < 10; v++) {
        const prog = (elapsed * (0.50 + (v % 3) * 0.14) + v * 0.13) % 1;
        const isLeftWing = v % 2 === 0;
        const vx = bustX + (isLeftWing ? 12 + ((v * 23) % 72) : bustSize - 18 - ((v * 27) % 78));
        const vy = bustY + bustSize - 10 - Math.round(prog * (bustSize - 24));
        ctx.globalAlpha = turnAlpha * (0.58 - prog * 0.42);
        ctx.fillStyle = v % 3 === 0 ? '#fde047' : '#f97316';
        fillRectClamped(vx - 2, vy - 3, 4, 5);
        ctx.fillStyle = '#ffffff';
        fillRectClamped(vx - 1, vy - 1, 2, 2);
      }
      ctx.restore();
    } else if (baseHero === 'ronin') {
      // UNIQUE TO RONIN: ZERO ugly straight blue line! Pure storm-cloud mist + forked sky lightning + drifting pink sakura petals!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // Soft translucent dark-cyan thunder-mist drifting quietly along the lower storm edge
      for (let m = 0; m < 3; m++) {
        const mx = bustX + Math.round(((elapsed * (22 + m * 8) + m * 120) % (bustSize + 100)) - 50);
        const my = bustY + bustSize - Math.round((16 + (m % 2) * 14) * sf);
        drawSpotMagicBloom(mx, my, Math.round(52 * sf), '#7dd3fc', '#0369a1', turnAlpha * (0.14 + pulse * 0.06));
      }
      // Crisp drifting pink sakura petals blown diagonally by the storm wind!
      for (let pI = 0; pI < 12; pI++) {
        const prog = (elapsed * (0.42 + (pI % 3) * 0.11) + pI * 0.12) % 1;
        const px = bustX + Math.round(((prog * (bustSize + 40) + pI * 47) % (bustSize + 30)) - 15);
        const py = bustY + Math.round((prog * (bustSize * 0.85) + pI * 63) % bustSize) + Math.round(Math.sin(elapsed * 4.2 + pI) * 6);
        ctx.globalAlpha = turnAlpha * 0.68;
        ctx.fillStyle = pI % 2 === 0 ? '#f9a8d4' : '#f472b6';
        fillRectClamped(px, py, 5, 3);
        fillRectClamped(px + 2, py + 2, 4, 2);
        ctx.fillStyle = '#ffffff';
        fillRectClamped(px + 1, py, 2, 2);
      }
      ctx.restore();
    } else if (baseHero === 'archer') {
      // UNIQUE TO ARCHER: Graceful S-curve translucent emerald forest wind wisps + drifting sylvan leaves & fireflies!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let lv = 0; lv < 9; lv++) {
        const prog = (elapsed * (0.34 + (lv % 3) * 0.10) + lv * 0.14) % 1;
        const lx = bustX + Math.round((prog * bustSize + lv * 53) % bustSize);
        const ly = bustY + 14 + ((lv * 47) % Math.max(24, bustSize - 28)) + Math.round(Math.sin(elapsed * 3.6 + lv) * 10);
        ctx.globalAlpha = turnAlpha * 0.58;
        if (lv % 3 === 0) {
          // Warm golden forest firefly glow
          drawSpotMagicBloom(lx, ly, Math.round(11 * sf), '#fef9c3', '#34d399', turnAlpha * 0.32);
        } else {
          ctx.fillStyle = '#10b981';
          fillRectClamped(lx - 3, ly, 6, 3);
          ctx.fillStyle = '#bef264';
          fillRectClamped(lx - 1, ly - 1, 4, 2);
        }
      }
      ctx.restore();
    } else if (baseHero === 'reaper') {
      // UNIQUE TO REAPER: Translucent rising violet phantom smoke curls & flickering spectral soul wisps!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let sm = 0; sm < 4; sm++) {
        const prog = (elapsed * (0.30 + (sm % 2) * 0.08) + sm * 0.25) % 1;
        const sx = bustX + 24 + ((sm * 92) % Math.max(24, bustSize - 48)) + Math.round(Math.sin(elapsed * 2.4 + sm * 1.7) * 14);
        const sy = bustY + bustSize - Math.round(prog * bustSize * 0.65);
        drawSpotMagicBloom(sx, sy, Math.round((28 + prog * 18) * sf), '#f0abfc', '#7e22ce', turnAlpha * Math.sin(prog * Math.PI) * 0.24);
      }
      for (let sw = 0; sw < 7; sw++) {
        const prog = (elapsed * (0.42 + (sw % 3) * 0.12) + sw * 0.16) % 1;
        const wx = bustX + 18 + ((sw * 67) % Math.max(24, bustSize - 36)) + Math.round(Math.sin(elapsed * 3.8 + sw) * 11);
        const wy = bustY + bustSize - 10 - Math.round(prog * (bustSize - 24));
        ctx.globalAlpha = turnAlpha * (0.60 - prog * 0.44);
        ctx.fillStyle = '#a855f7';
        fillRectClamped(wx - 3, wy - 2, 6, 5);
        ctx.fillStyle = '#f0abfc';
        fillRectClamped(wx - 2, wy - 5, 4, 7);
      }
      ctx.restore();
    } else if (baseHero === 'titan') {
      // UNIQUE TO TITAN: Soaring golden volcanic anvil sparks + emerald Mjolnir rune-sparks rising cleanly!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cnt = amp > 0.35 ? 14 : 10;
      for (let sp = 0; sp < cnt; sp++) {
        const prog = (elapsed * (0.62 + (sp % 4) * 0.15) + sp * 0.11) % 1;
        const tx = bustX + 14 + ((sp * 57) % Math.max(24, bustSize - 28)) + Math.round(Math.cos(elapsed * 6.0 + sp) * 8);
        const ty = bustY + bustSize - 6 - Math.round(prog * (bustSize - 16));
        ctx.globalAlpha = turnAlpha * (0.68 - prog * 0.50);
        ctx.fillStyle = sp % 4 === 0 ? '#34d399' : sp % 2 === 0 ? '#fde047' : '#f97316';
        fillRectClamped(tx - 2, ty - 2, 4, 4);
        fillRectClamped(tx - 1, ty + 2, 2, 3);
      }
      ctx.restore();
    } else if (baseHero === 'icemage') {
      // UNIQUE TO ICEMAGE: Crisp translucent falling parallax pixel snowflakes + frosty diamond glints on Ice-Spear!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const [spX, spY] = mapHotspot(274, 88, false);
      ctx.globalAlpha = turnAlpha * (0.35 + pulse * 0.40);
      drawStar4(spX, spY, Math.max(4, Math.round(6 * sf)), '#ffffff');
      for (let sn = 0; sn < 11; sn++) {
        const prog = (elapsed * (0.25 + (sn % 4) * 0.07) + sn * 0.12) % 1;
        const sx = bustX + 12 + ((sn * 59) % Math.max(24, bustSize - 24)) + Math.round(Math.sin(elapsed * 2.2 + sn) * 11);
        const sy = bustY + 6 + Math.round(prog * (bustSize - 16));
        ctx.globalAlpha = turnAlpha * (0.62 - prog * 0.28);
        drawPixelSnowflake(sx, sy, sn % 3 === 0 ? 4 : 3, sn % 2 === 0 ? '#bae6fd' : '#67e8f9');
      }
      ctx.restore();
    } else if (baseHero === 'brawler') {
      // UNIQUE TO RAIJIN EX: Crackling golden-indigo storm lightning bolts & rising tempest static sparks!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const boltTick = Math.floor(elapsed * 12);
      if (boltTick % 2 === 0 || amp > 0.35) {
        ctx.globalAlpha = turnAlpha * 0.65;
        drawStepLightning(bustX + 26, bustY + 18, 6, 14, 5, '#fbbf24');
        drawStepLightning(bustX + bustSize - 24, bustY + 26, 6, 13, 5, '#6366f1');
      }
      for (let sp = 0; sp < 10; sp++) {
        const prog = (elapsed * (0.58 + (sp % 3) * 0.14) + sp * 0.13) % 1;
        const sx = bustX + 14 + ((sp * 61) % Math.max(24, bustSize - 28)) + Math.round(Math.sin(elapsed * 6 + sp) * 8);
        const sy = bustY + bustSize - 10 - Math.round(prog * (bustSize - 20));
        ctx.globalAlpha = turnAlpha * (0.64 - prog * 0.42);
        ctx.fillStyle = sp % 2 === 0 ? '#fbbf24' : '#6366f1';
        fillRectClamped(sx - 2, sy - 2, 4, 4);
        ctx.fillStyle = '#ffffff';
        fillRectClamped(sx - 1, sy - 1, 2, 2);
      }
      ctx.restore();
    } else {
      // UNIQUE TO ANDROID: Translucent starship cockpit 4-corner targeting HUD brackets + fine katana plasma crackle!
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const brkCol = pulse > 0.5 ? '#67e8f9' : '#f43f5e';
      ctx.globalAlpha = turnAlpha * 0.48;
      ctx.fillStyle = brkCol;
      fillRectClamped(bustX + 10, bustY + 10, 20, 2);
      fillRectClamped(bustX + 10, bustY + 10, 2, 20);
      fillRectClamped(bustX + bustSize - 30, bustY + 10, 20, 2);
      fillRectClamped(bustX + bustSize - 12, bustY + 10, 2, 20);
      fillRectClamped(bustX + 10, bustY + bustSize - 12, 20, 2);
      fillRectClamped(bustX + 10, bustY + bustSize - 30, 2, 20);
      fillRectClamped(bustX + bustSize - 30, bustY + bustSize - 12, 20, 2);
      fillRectClamped(bustX + bustSize - 12, bustY + bustSize - 30, 2, 20);
      // Subtle blinking status dots along right HUD frame margin (zero face overlap!)
      for (let d = 0; d < 4; d++) {
        ctx.globalAlpha = turnAlpha * (Math.floor(elapsed * 6 + d) % 2 === 0 ? 0.55 : 0.18);
        ctx.fillStyle = d % 2 === 0 ? '#22d3ee' : '#f472b6';
        fillRectClamped(bustX + bustSize - 16, bustY + 38 + d * 10, 4, 4);
      }
      ctx.restore();
    }

    ctx.restore();
    ctx.globalAlpha = turnAlpha;
  }

  _drawIntroSubtitleBar(ctx, cfg) {
    const {
      baseHero,
      spkName,
      spkCol,
      spkElapsed,
      amp,
      turnAlpha,
      cw,
      ch,
      cx,
      minTopY,
      isPortraitNarrow,
      fillRectClamped
    } = cfg;
    const entry = INTRO_DIALOGUE_SUBTITLES[baseHero] || INTRO_DIALOGUE_SUBTITLES.warrior;
    const isJa = this.audio?.getVoiceLang?.() === 'ja';
    const fullMain = entry.en || '';
    const fullSub = isJa ? entry.ja || '' : '';
    if (!fullMain) return;

    // Smooth typewriter reveal synced crisply to live speech (~1.55s so full line is readable before handoff)
    const revealFrac = Math.min(1, Math.max(0.25, spkElapsed / 1.55));
    const visChars = Math.max(1, Math.min(fullMain.length, Math.ceil(fullMain.length * revealFrac)));
    const visText = fullMain.slice(0, visChars);
    const caretOn = revealFrac < 1 || (amp > 0.08 && Math.floor(spkElapsed * 8) % 2 === 0);
    const quoted = `"${visText}${revealFrac >= 1 ? '"' : caretOn ? '_' : ''}`;

    const isCompactLand = !isPortraitNarrow && ch < 460;
    // Larger, high-legibility subtitle typography across PC Desktop (24px), Landscape (16-19px) & Mobile Portrait (16px)!
    const subFontPx = cw >= 960 ? 24 : isCompactLand ? 16 : isPortraitNarrow ? 16 : 19;
    const jaFontPx = cw >= 960 ? 18 : isCompactLand ? 12 : 13;
    const barW = Math.min(cw - 20, cw >= 960 ? 1080 : cw - 16);
    const maxCharsPerLine = Math.max(
      20,
      Math.floor((barW - 56) / Math.max(8, Math.round(subFontPx * 0.64)))
    );

    const words = quoted.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length > maxCharsPerLine && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);

    const lineGap = subFontPx + 9;
    const hasJaLine = Boolean(fullSub && !isCompactLand);
    const padY = isCompactLand ? 9 : cw >= 960 ? 14 : 12;
    const spkTagBlockH = isCompactLand ? 0 : cw >= 960 ? 24 : 18;
    const barH = Math.max(
      isCompactLand ? 46 : cw >= 960 ? 78 : 66,
      padY * 2 + lines.length * lineGap + (hasJaLine ? jaFontPx + 10 : 0) + spkTagBlockH
    );
    const desiredTop = isCompactLand
      ? ch - barH - 6
      : isPortraitNarrow
        ? Math.min(ch - barH - 16, Math.max(minTopY, Math.round(ch * 0.72)))
        : Math.min(ch - barH - 18, Math.max(minTopY, Math.round(ch * 0.80)));
    const barY = Math.max(8, Math.min(ch - barH - 6, desiredTop));
    const barX = cx - (barW >> 1);

    ctx.save();
    ctx.globalAlpha = turnAlpha;

    // Sleek borderless feathered cinema cushion
    if (typeof ctx.createLinearGradient === 'function') {
      const bgG = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      if (bgG && typeof bgG.addColorStop === 'function') {
        bgG.addColorStop(0, 'rgba(2, 6, 23, 0)');
        bgG.addColorStop(0.08, 'rgba(2, 6, 23, 0.86)');
        bgG.addColorStop(0.50, 'rgba(4, 10, 26, 0.94)');
        bgG.addColorStop(0.92, 'rgba(2, 6, 23, 0.86)');
        bgG.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = bgG;
      } else {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      }
    } else {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    }
    fillRectClamped(barX, barY, barW, barH);

    // Luminous feathered hero-accent hairlines
    if (typeof ctx.createLinearGradient === 'function') {
      const railG = ctx.createLinearGradient(barX + 24, 0, barX + barW - 24, 0);
      if (railG && typeof railG.addColorStop === 'function') {
        railG.addColorStop(0, 'rgba(0, 0, 0, 0)');
        railG.addColorStop(0.20, spkCol);
        railG.addColorStop(0.50, '#fef08a');
        railG.addColorStop(0.80, spkCol);
        railG.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = railG;
      } else {
        ctx.fillStyle = spkCol;
      }
    } else {
      ctx.fillStyle = spkCol;
    }
    fillRectClamped(barX + 24, barY, Math.max(32, barW - 48), 2);
    fillRectClamped(barX + 24, barY + barH - 2, Math.max(32, barW - 48), 2);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let textY = barY + padY;
    if (!isCompactLand) {
      const spkTagPx = cw >= 960 ? 14 : 11;
      ctx.font = `bold ${spkTagPx}px "ArcanePixel", "Press Start 2P", monospace`;
      ctx.fillStyle = '#020617';
      ctx.fillText(spkName, cx + 2, textY + 7, barW - 36);
      ctx.fillStyle = spkCol;
      ctx.fillText(spkName, cx, textY + 6, barW - 36);
      textY += spkTagBlockH;
    }

    // Large Crisp Dialogue Subtitle Lines (soft hero glow + thick pixel ink outline + bright white face!)
    ctx.font = `bold ${subFontPx}px "ArcanePixel", "Press Start 2P", sans-serif`;
    for (let i = 0; i < lines.length; i++) {
      const ly = textY + Math.round(subFontPx * 0.5) + i * lineGap;
      ctx.save();
      ctx.shadowColor = spkCol;
      ctx.shadowBlur = cw >= 960 ? 12 : 8;
      ctx.fillStyle = spkCol;
      ctx.globalAlpha = turnAlpha * 0.42;
      ctx.fillText(lines[i], cx, ly, barW - 36);
      ctx.restore();

      ctx.fillStyle = '#020617';
      ctx.fillText(lines[i], cx - 2, ly, barW - 36);
      ctx.fillText(lines[i], cx + 2, ly, barW - 36);
      ctx.fillText(lines[i], cx, ly - 2, barW - 36);
      ctx.fillText(lines[i], cx, ly + 2, barW - 36);
      ctx.fillText(lines[i], cx + 3, ly + 3, barW - 36);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lines[i], cx, ly, barW - 36);
    }

    if (hasJaLine) {
      const jaY = textY + lines.length * lineGap + Math.round(jaFontPx * 0.5) + 4;
      ctx.font = `bold ${jaFontPx}px "Hiragino Sans", "Yu Gothic", "ArcanePixel", sans-serif`;
      ctx.fillStyle = '#020617';
      ctx.fillText(fullSub, cx + 2, jaY + 2, barW - 36);
      ctx.fillStyle = '#fef08a';
      ctx.fillText(fullSub, cx, jaY, barW - 36);
    }

    ctx.restore();
  }

  _renderRoundIntroOverlay(ctx) {
    if (!ctx?.fillRect || !ctx?.fillText || this.isMatchOver) return;
    const inIntro = (this.roundIntroTimer || 0) > 0;
    const inEngage = !inIntro && (this._roundEngageBannerTimer || 0) > 0;
    if (!inIntro && !inEngage) return;

    // Respect devicePixelRatio cleanly so Retina/HiDPI PCs & Mobile render at exact logical CSS proportions!
    const rawW = ctx.canvas?.width || 1280;
    const rawH = ctx.canvas?.height || 720;
    const useLogical = Boolean(
      this.renderer &&
        this.renderer.canvas === ctx.canvas &&
        this.renderer.width > 0 &&
        this.renderer.height > 0
    );
    const cw = useLogical ? Math.round(this.renderer.width) : rawW;
    const ch = useLogical ? Math.round(this.renderer.height) : rawH;
    const dprX = useLogical && cw > 0 ? rawW / cw : 1;
    const dprY = useLogical && ch > 0 ? rawH / ch : 1;
    const cx = Math.round(cw * 0.5);
    const cy = Math.round(ch * 0.46);
    const elapsed = Math.max(0, Number(this.roundIntroElapsed) || 0);

    const fillRectClamped = (rx, ry, rw, rh) => {
      if (!(rw > 0) || !(rh > 0)) return;
      const x0 = Math.max(0, Math.min(cw, Math.round(rx)));
      const x1 = Math.max(0, Math.min(cw, Math.round(rx + rw)));
      const y0 = Math.max(0, Math.min(ch, Math.round(ry)));
      const y1 = Math.max(0, Math.min(ch, Math.round(ry + rh)));
      const wClamp = x1 - x0;
      const hClamp = y1 - y0;
      if (wClamp <= 0 || hClamp <= 0) return;
      ctx.fillRect(x0, y0, wClamp, hClamp);
    };

    const drawStar4 = (gx, gy, arm, col) => {
      ctx.fillStyle = col;
      fillRectClamped(gx - arm, gy - 1, arm * 2 + 2, 2);
      fillRectClamped(gx - 1, gy - arm, 2, arm * 2 + 2);
      ctx.fillStyle = '#ffffff';
      fillRectClamped(gx - 2, gy - 2, 4, 4);
    };

    const drawSteppedChevron = (vx, vy, dir, steps, stepH, col) => {
      ctx.fillStyle = col;
      for (let s = 0; s < steps; s++) {
        const dx = dir * s * 4;
        const dy = (s - ((steps - 1) >> 1)) * stepH;
        fillRectClamped(vx + dx, vy + dy, 5, stepH);
      }
    };

    const drawSteppedSlashBolt = (sx, sy, dxStep, dyStep, count, thick, outerCol, coreCol) => {
      for (let i = 0; i < count; i++) {
        const px = sx + i * dxStep + ((i % 3 === 1) ? dxStep : 0);
        const py = sy + i * dyStep;
        ctx.fillStyle = outerCol;
        fillRectClamped(px - 1, py - 1, thick + 2, thick + 2);
        ctx.fillStyle = coreCol;
        fillRectClamped(px, py, thick, thick);
      }
    };

    const drawChamferPlaque = (bx, by, boxW, boxH, borderCol, accentCol, baseAlpha, speedLines) => {
      const cham = Math.min(14, Math.max(6, Math.round(boxH * 0.1)));
      const halfW = Math.round(boxW * 0.5);
      const halfH = Math.round(boxH * 0.5);
      const px = bx + halfW;
      const py = by + halfH;

      ctx.globalAlpha = baseAlpha;
      ctx.fillStyle = 'rgba(4, 7, 18, 0.92)';
      fillRectClamped(bx + cham, by, boxW - cham * 2, boxH);
      for (let s = 2; s <= cham; s += 2) {
        const stripH = boxH - (cham - s) * 2;
        const sy = py - (stripH >> 1);
        fillRectClamped(bx + (cham - s), sy, 2, stripH);
        fillRectClamped(bx + boxW - (cham - s) - 2, sy, 2, stripH);
      }

      if (speedLines) {
        const scroll = Math.round(elapsed * 210) & 31;
        ctx.fillStyle = borderCol;
        ctx.globalAlpha = baseAlpha * 0.2;
        for (let sx = -halfW + 14 - scroll; sx < halfW - 14; sx += 28) {
          for (let row = -halfH + 8; row <= halfH - 10; row += 8) {
            const lx = px + sx + ((row + halfH) >> 1);
            if (lx > bx + cham + 4 && lx < bx + boxW - cham - 16) {
              fillRectClamped(lx, py + row, 14, 2);
            }
          }
        }
      }

      ctx.globalAlpha = baseAlpha;
      ctx.fillStyle = borderCol;
      fillRectClamped(bx + cham, by, boxW - cham * 2, 3);
      fillRectClamped(bx + cham, by + boxH - 3, boxW - cham * 2, 3);
      ctx.fillStyle = accentCol;
      const crestW = Math.round(boxW * 0.62);
      fillRectClamped(px - Math.round(crestW * 0.5), by, crestW, 2);
      fillRectClamped(px - Math.round(crestW * 0.5), by + boxH - 2, crestW, 2);

      ctx.fillStyle = '#ffffff';
      fillRectClamped(bx + cham + 3, by + 4, 4, 4);
      fillRectClamped(bx + boxW - cham - 7, by + 4, 4, 4);
      fillRectClamped(bx + cham + 3, by + boxH - 8, 4, 4);
      fillRectClamped(bx + boxW - cham - 7, by + boxH - 8, 4, 4);

      drawStar4(bx + 6, py, 7, accentCol);
      drawStar4(bx + boxW - 8, py, 7, accentCol);
    };

    const fitArcadeFontPx = (text, maxPx, minPx, availW) => {
      const len = Math.max(1, String(text || '').length);
      return Math.max(minPx, Math.min(maxPx, Math.floor(availW / (len * 0.95))));
    };

    // 6-layer arcade extrusion: #020617 deep drop-block -> dark accent -> hero primaryColor 3D bevel -> #f59e0b rim -> blazing face + traveling white glint
    const drawGiantArcadeText = (
      label,
      tx,
      ty,
      fontPx,
      maxW,
      darkAccentCol,
      bevelCol,
      rimCol,
      faceCol,
      phaseSeed = 0
    ) => {
      const dDeep = Math.max(3, Math.round(fontPx * 0.11));
      const dDark = Math.max(2, Math.round(fontPx * 0.08));
      const dBev = Math.max(2, Math.round(fontPx * 0.05));
      ctx.font = `bold ${fontPx}px "ArcanePixel", "Press Start 2P", monospace`;

      // Layer 0: Subtle Hero-Colored Magical Neon Back-Bloom behind typography
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = bevelCol;
      ctx.shadowBlur = Math.max(6, Math.round(fontPx * 0.42));
      ctx.fillStyle = bevelCol;
      ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.36;
      ctx.fillText(label, tx, ty, maxW);
      ctx.restore();

      // Layer 1: #020617 deep drop-block & crisp perimeter guard
      ctx.fillStyle = '#020617';
      ctx.fillText(label, tx + dDeep, ty + dDeep + 1, maxW);
      ctx.fillText(label, tx - 2, ty + 2, maxW);
      ctx.fillText(label, tx, ty - 2, maxW);

      // Layer 2: dark accent step
      ctx.fillStyle = darkAccentCol;
      ctx.fillText(label, tx + dDark, ty + dDark, maxW);

      // Layer 3: hero primaryColor 3D bevel
      ctx.fillStyle = bevelCol;
      ctx.fillText(label, tx + dBev, ty + dBev, maxW);

      // Layer 4: #f59e0b gold rim
      ctx.fillStyle = rimCol;
      ctx.fillText(label, tx + 1, ty + 1, maxW);

      // Layer 5: blazing glyph face
      ctx.fillStyle = faceCol;
      ctx.fillText(label, tx, ty, maxW);

      // Layer 6: traveling white specular glint bar across glyph tops
      const spanW = Math.min(maxW, Math.max(48, label.length * Math.round(fontPx * 0.80)));
      const sweep = (((elapsed * 1.85 + phaseSeed) % 1) - 0.5) * spanW;
      const glintX = tx + Math.round(sweep);
      const glintY = ty - Math.round(fontPx * 0.42);
      ctx.fillStyle = '#ffffff';
      fillRectClamped(glintX - 14, glintY, 28, Math.max(2, Math.round(fontPx * 0.06)));
      drawStar4(glintX, glintY + 1, Math.max(4, Math.round(fontPx * 0.1)), rimCol);
    };

    ctx.save();
    ctx.setTransform(dprX, 0, 0, dprY, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (inIntro) {
      const total = Math.max(0.2, this.roundIntroDuration || 1.35);
      const ratio = Math.max(0, Math.min(1, 1 - (this.roundIntroTimer || 0) / total));
      const f1 = this.getPointFighter?.(1) || this.leftFighter;
      const isSideBanner = Boolean(this.isSideScrollMode?.() ?? this.isAdventureMode?.());
      const f2 = isSideBanner ? null : this.getPointFighter?.(2) || this.rightFighter;
      const n1 = (f1?.name || 'CHAMPION').toUpperCase();
      const n2 = (f2?.name || 'CHALLENGER').toUpperCase();
      const p1Col = f1?.primaryColor || '#f59e0b';
      const p2Col = f2?.primaryColor || '#38bdf8';
      const speaker = this._roundIntroFighter;
      const introQueue = Array.isArray(this._roundIntroQueue) ? this._roundIntroQueue : [];
      const act1Gate = Number(this._roundIntroAct1Dur) || (introQueue.length >= 2 ? 1.15 : 1.25);
      const inAct2CutIn = Boolean(speaker && elapsed >= act1Gate);

      if (!inAct2CutIn) {
        // ====================================================================
        // ACT 1: Sleek Staggered Matchup Clash Banner (`elapsed < 1.25s`)
        //        Balanced PC & Mobile proportions — crisp ArcanePixel typography, zero overflow!
        // ====================================================================
        const slamT = Math.min(1, elapsed / 0.26);
        const slamEase = 1 - Math.pow(1 - slamT, 3);
        const slamSlide = Math.round((1 - slamEase) * Math.min(148, Math.round(cw * 0.12)));

        // Subtle atmospheric obsidian clash veil
        ctx.fillStyle = 'rgba(2, 6, 23, 0.44)';
        const veilH = Math.min(ch - 16, cw >= 960 ? 248 : ch < 460 ? 204 : 232);
        fillRectClamped(0, cy - (veilH >> 1), cw, veilH);

        const maxNamePx = cw >= 960 ? 38 : cw >= 520 ? 30 : 22;
        const minNamePx = cw >= 960 ? 32 : cw >= 520 ? 24 : 18;
        const bannerTextMaxW = Math.min(cw - 48, cw >= 960 ? 740 : Math.round(cw * 0.84));

        if (isSideBanner) {
          const advRibbonW = Math.min(cw - 24, cw >= 960 ? 760 : Math.round(cw * 0.88));
          const advRibbonH = cw >= 960 ? 112 : 92;
          const advBx = cx - (advRibbonW >> 1);
          const advBy = cy - (advRibbonH >> 1);
          drawChamferPlaque(advBx, advBy, advRibbonW, advRibbonH, p1Col, '#fef08a', 0.94, true);

          const advPx = fitArcadeFontPx(n1, maxNamePx, minNamePx, bannerTextMaxW);
          drawGiantArcadeText(
            n1,
            cx - slamSlide,
            cy - 10,
            advPx,
            bannerTextMaxW,
            '#1e1b4b',
            p1Col,
            '#f59e0b',
            '#fef08a',
            0.12
          );
          const subPx = cw >= 960 ? 14 : 11;
          const subBannerText = this.isEndlessMode?.()
            ? 'ENDLESS CRUSADE • INFINITE MARCH'
            : 'REALM PILGRIMAGE • STANDOFF';
          ctx.font = `bold ${subPx}px "ArcanePixel", "Press Start 2P", monospace`;
          ctx.fillStyle = '#020617';
          ctx.fillText(subBannerText, cx + 2, cy + (cw >= 960 ? 34 : 28) + 2, bannerTextMaxW);
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(subBannerText, cx, cy + (cw >= 960 ? 34 : 28), bannerTextMaxW);
        } else {
          const bandGapY = cw >= 960 ? 78 : ch < 460 ? 64 : 68;
          const p1BandY = cy - bandGapY;
          const p2BandY = cy + bandGapY + 2;
          const ribbonH = cw >= 960 ? 66 : cw >= 520 ? 52 : 44;
          const ribbonW = Math.min(cw - 24, cw >= 960 ? Math.min(780, Math.round(cw * 0.64)) : Math.round(cw * 0.84));
          const p1RibbonX = Math.max(0, Math.round(cx - ribbonW * 0.56) - slamSlide);
          const p2RibbonX = Math.min(cw - ribbonW, Math.round(cx - ribbonW * 0.44) + slamSlide);

          // Upper-left P1 slash ribbon slamming from left
          drawChamferPlaque(
            p1RibbonX,
            p1BandY - (ribbonH >> 1),
            ribbonW,
            ribbonH,
            p1Col,
            '#fef08a',
            0.94,
            true
          );

          // Lower-right P2 slash ribbon slamming from right
          drawChamferPlaque(
            p2RibbonX,
            p2BandY - (ribbonH >> 1),
            ribbonW,
            ribbonH,
            p2Col,
            '#e0f2fe',
            0.94,
            true
          );

          // Opposing high-velocity pixel speed streaks across upper & lower bands
          const spd = Math.round(elapsed * 280) % 48;
          for (let s = 0; s < 6; s++) {
            const lx1 = p1RibbonX + 16 + ((s * 127 + spd * 3) % Math.max(48, ribbonW - 64));
            const lx2 = p2RibbonX + ribbonW - 50 - ((s * 139 + spd * 3) % Math.max(48, ribbonW - 64));
            ctx.fillStyle = s % 2 === 0 ? p1Col : '#fef08a';
            fillRectClamped(lx1, p1BandY - (ribbonH >> 1) + 8 + (s % 3) * Math.round((ribbonH - 18) / 2), 28, 2);
            ctx.fillStyle = s % 2 === 0 ? p2Col : '#e0f2fe';
            fillRectClamped(lx2, p2BandY - (ribbonH >> 1) + 8 + (s % 3) * Math.round((ribbonH - 18) / 2), 28, 2);
          }

          // P1 Name (Upper-Left staggered, slamming rightward)
          const p1Px = fitArcadeFontPx(n1, maxNamePx, minNamePx, ribbonW - 44);
          const drawP1X = p1RibbonX + Math.round(ribbonW * 0.5);

          drawGiantArcadeText(
            n1,
            drawP1X,
            p1BandY,
            p1Px,
            ribbonW - 36,
            '#1e1b4b',
            p1Col,
            '#f59e0b',
            '#fef08a',
            0.14
          );

          // P2 Name (Lower-Right staggered, slamming leftward)
          const p2Px = fitArcadeFontPx(n2, maxNamePx, minNamePx, ribbonW - 44);
          const drawP2X = p2RibbonX + Math.round(ribbonW * 0.5);

          drawGiantArcadeText(
            n2,
            drawP2X,
            p2BandY,
            p2Px,
            ribbonW - 36,
            '#0f172a',
            p2Col,
            '#f59e0b',
            '#e0f2fe',
            0.63
          );

          // Sleek Radiant Center 'VS.' Clash Crest (centered at vsY within 12px of ch * 0.46)
          const vsY = cy + 1;
          const minVsPx = cw >= 960 ? 46 : cw >= 520 ? 36 : 28;
          const maxVsPx = cw >= 960 ? 54 : cw >= 520 ? 44 : 34;
          const vsPx = Math.max(
            minVsPx,
            Math.min(maxVsPx, minVsPx + Math.round((1 - slamEase) * (maxVsPx - minVsPx)))
          );

          // Cross-slash stepped lightning bolts & clash shockwave behind 'VS.'
          const boltSteps = cw >= 960 ? 11 : 8;
          const boltStepPx = cw >= 960 ? 7 : 5;
          drawSteppedSlashBolt(
            cx - boltSteps * boltStepPx,
            vsY - Math.round(boltSteps * 3.0),
            boltStepPx,
            6,
            boltSteps * 2 + 1,
            3,
            '#f59e0b',
            '#fef08a'
          );
          drawSteppedSlashBolt(
            cx - boltSteps * boltStepPx,
            vsY + Math.round(boltSteps * 3.0),
            boltStepPx,
            -6,
            boltSteps * 2 + 1,
            3,
            '#dc2626',
            '#ffffff'
          );

          const shockProg = Math.min(1, elapsed / 0.42);
          if (shockProg < 1) {
            const swW = Math.min(cw - 16, Math.round((cw >= 960 ? 164 : 116) + shockProg * 220));
            const swH = Math.round((cw >= 960 ? 64 : 46) + shockProg * 48);
            ctx.globalAlpha = Math.max(0, (1 - shockProg) * 0.78);
            ctx.fillStyle = '#fef08a';
            fillRectClamped(cx - (swW >> 1), vsY - (swH >> 1), swW, 3);
            fillRectClamped(cx - (swW >> 1), vsY + (swH >> 1) - 3, swW, 3);
            fillRectClamped(cx - (swW >> 1), vsY - (swH >> 1), 3, swH);
            fillRectClamped(cx + (swW >> 1) - 3, vsY - (swH >> 1), 3, swH);
            ctx.globalAlpha = 1;
          }

          // Radiant bloom behind 'VS.' crest
          if (typeof ctx.createRadialGradient === 'function') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.42;
            const vsRad = cw >= 960 ? 96 : 68;
            const vsG = ctx.createRadialGradient(cx, vsY, 8, cx, vsY, vsRad);
            if (vsG && typeof vsG.addColorStop === 'function') {
              vsG.addColorStop(0, '#fef08a');
              vsG.addColorStop(0.5, '#dc2626');
              vsG.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = vsG;
              fillRectClamped(cx - vsRad, vsY - vsRad, vsRad * 2, vsRad * 2);
            }
            ctx.restore();
          }

          // Compact Center Clash Crest Plate (generous padding around vsPx!)
          const crestW = cw >= 960 ? 174 : cw >= 520 ? 136 : 112;
          const crestH = cw >= 960 ? 74 : cw >= 520 ? 58 : 48;
          ctx.fillStyle = '#020617';
          fillRectClamped(cx - (crestW >> 1) - 3, vsY - (crestH >> 1) - 3, crestW + 6, crestH + 6);
          ctx.fillStyle = '#090d1a';
          fillRectClamped(cx - (crestW >> 1), vsY - (crestH >> 1), crestW, crestH);
          ctx.fillStyle = '#dc2626';
          fillRectClamped(cx - (crestW >> 1), vsY - (crestH >> 1), crestW, 3);
          fillRectClamped(cx - (crestW >> 1), vsY + (crestH >> 1) - 3, crestW, 3);
          ctx.fillStyle = '#fef08a';
          fillRectClamped(cx - (crestW >> 1) + 6, vsY - (crestH >> 1) + 4, crestW - 12, 2);
          fillRectClamped(cx - (crestW >> 1) + 6, vsY + (crestH >> 1) - 6, crestW - 12, 2);

          drawGiantArcadeText(
            'VS.',
            cx,
            vsY,
            vsPx,
            cw - 24,
            '#7f1d1d',
            '#dc2626',
            '#f59e0b',
            '#ffffff',
            0.38
          );

          const orbitDx = Math.round(Math.cos(elapsed * 8.0) * 7);
          drawStar4(cx - (crestW >> 1) - 12 + orbitDx, vsY, 7, '#fef08a');
          drawStar4(cx + (crestW >> 1) + 12 - orbitDx, vsY, 7, '#fef08a');

          // Dual Clash Progress Rail below lower band
          const railW = Math.min(cw - 48, cw >= 960 ? Math.min(720, Math.round(cw * 0.58)) : Math.round(cw * 0.74));
          const halfRail = railW >> 1;
          const railY = Math.min(ch - 10, p2BandY + (ribbonH >> 1) + (ch < 460 ? 8 : 12));
          const fillHalf = Math.round(halfRail * ratio);
          ctx.fillStyle = '#0f172a';
          fillRectClamped(cx - halfRail, railY, railW, 5);
          if (fillHalf > 0) {
            ctx.fillStyle = p1Col;
            fillRectClamped(cx - halfRail, railY, fillHalf, 5);
            ctx.fillStyle = '#fef08a';
            fillRectClamped(cx - halfRail, railY, fillHalf, 2);
            ctx.fillStyle = p2Col;
            fillRectClamped(cx + halfRail - fillHalf, railY, fillHalf, 5);
            ctx.fillStyle = '#e0f2fe';
            fillRectClamped(cx + halfRail - fillHalf, railY, fillHalf, 2);
          }
        }
      } else {
        // ====================================================================
        // ACT 2: Giant Half-Screen Animated Talking Bust Cut-In (`P1 -> P2`)
        //        Smooth Slide-In/Out + Smooth `F3` Mouth Gate + Livelier Bust Poise
        // ====================================================================
        const slotDur = Number(this._roundIntroSlotDur) || (introQueue.length >= 2 ? 3.35 : 2.90);
        const spkElapsed =
          Number.isFinite(this._introSpeakerElapsed) && this._introSpeakerElapsed > 0
            ? this._introSpeakerElapsed
            : Math.max(0, elapsed - act1Gate);
        const spkRem =
          introQueue.length >= 2
            ? Math.max(0, Math.min(this.roundIntroTimer || slotDur, slotDur - spkElapsed))
            : Math.max(0, this.roundIntroTimer || 0);

        const inSlideT = Math.min(1, spkElapsed / 0.34);
        const inEase = 1 - Math.pow(1 - inSlideT, 3);
        const outSlideT = spkRem < 0.28 ? Math.max(0, spkRem / 0.28) : 1;
        const outEase = 1 - Math.pow(1 - outSlideT, 2);
        const slideEase = Math.min(inEase, outEase);

        const isRightSpeaker = Boolean(
          speaker &&
            (speaker.team === 2 ||
              speaker.team === 'right' ||
              (this.rightFighter && speaker === this.rightFighter))
        );
        const sideSign = isRightSpeaker ? 1 : -1;
        const spkCol = speaker?.primaryColor || (isRightSpeaker ? p2Col : p1Col);
        const oppCol = isRightSpeaker ? p1Col : p2Col;
        const spkName = (speaker?.name || (isRightSpeaker ? n2 : n1)).toUpperCase();
        const oppName = (isRightSpeaker ? n1 : n2).toUpperCase();
        const heroKey = speaker?.heroId || this.slot1Hero || 'warrior_ex';
        const baseHero = String(heroKey).replace(/_ex$/, '');
        const heroTitle = (
          CHAMPION_ROSTER[heroKey]?.role ||
          CHAMPION_ROSTER[heroKey]?.title ||
          speaker?.title ||
          'SOVEREIGN CHAMPION'
        ).toUpperCase();

        const bustSize = Math.min(
          Math.round(ch * 0.59),
          cw >= 960 ? 430 : cw >= 520 ? 276 : 284
        );
        const isPortraitNarrow = cw < 520;
        const turnAlpha = Math.max(0.18, slideEase);

        // 1. Bold Full-Width Atmospheric Dark-Vignette + Hero-Colored Speed-Streak Cinema Band
        //    (Positioned cleanly above the larger bottom dialogue subtitle zone across all viewports!)
        const bandH = isPortraitNarrow
          ? Math.min(ch - 148, bustSize + 160)
          : Math.min(ch - 96, Math.max(Math.round(bustSize * 0.72), cw >= 960 ? 304 : 204));
        const bandY = isPortraitNarrow
          ? Math.max(38, Math.round(ch * 0.135))
          : Math.max(10, Math.round(ch * 0.43 - bandH * 0.5));

        ctx.globalAlpha = turnAlpha;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.84)';
        fillRectClamped(0, bandY, cw, bandH);
        ctx.fillStyle = 'rgba(9, 14, 34, 0.92)';
        fillRectClamped(0, bandY + 8, cw, Math.max(8, bandH - 16));

        // Top & bottom cinema slash rails
        ctx.fillStyle = spkCol;
        fillRectClamped(0, bandY, cw, 4);
        fillRectClamped(0, bandY + bandH - 4, cw, 4);
        ctx.fillStyle = '#fef08a';
        fillRectClamped(0, bandY + 4, cw, 2);
        fillRectClamped(0, bandY + bandH - 6, cw, 2);

        // Scrolling hero-colored speed-streaks across the cinema band
        const streakScroll = Math.round(elapsed * 330) % 96;
        const streakDir = isRightSpeaker ? -1 : 1;
        for (let row = 0; row < 8; row++) {
          const sy = bandY + 18 + Math.round((row * (bandH - 36)) / 7);
          for (let k = 0; k < 5; k++) {
            const rawX =
              ((row * 173 + k * 240 + streakDir * streakScroll * 3) % (cw + 120) + (cw + 120)) %
                (cw + 120) -
              60;
            const swLen = 30 + ((row + k) % 3) * 24;
            ctx.globalAlpha = turnAlpha * ((row + k) % 2 === 0 ? 0.30 : 0.18);
            ctx.fillStyle = (row + k) % 3 === 0 ? '#fef08a' : spkCol;
            fillRectClamped(rawX, sy, swLen, 3);
          }
        }
        ctx.globalAlpha = turnAlpha;

        // 2. Giant Half-Screen Living Layered Talking Bust (`bustSize x bustSize`)
        //    True side-edge spring pop-in (`P1` bursts out from LEFT edge, `P2` bursts out from RIGHT edge!)
        const sideMargin = cw >= 960 ? 28 : cw >= 520 ? 16 : Math.max(12, (cw - bustSize) >> 1);
        const targetBustX = isPortraitNarrow
          ? isRightSpeaker
            ? cw - 16 - bustSize
            : 16
          : isRightSpeaker
            ? cw - sideMargin - bustSize
            : sideMargin;
        const bustLaunchDist = Math.round(bustSize * 0.56);
        let bustSlideDx = 0;
        if (spkElapsed < 0.22) {
          const tIn = spkElapsed / 0.22;
          const easePop = 1 - Math.pow(1 - tIn, 3);
          bustSlideDx = Math.round(bustLaunchDist * (1 - easePop) - 14 * easePop) * sideSign;
        } else if (spkElapsed < 0.34) {
          const tSet = (spkElapsed - 0.22) / 0.12;
          bustSlideDx = Math.round(-14 * (1 - tSet)) * sideSign;
        } else if (spkRem < 0.28) {
          const tOut = 1 - Math.max(0, spkRem / 0.28);
          bustSlideDx = Math.round(Math.pow(tOut, 2) * bustLaunchDist) * sideSign;
        }
        const bustX = targetBustX + bustSlideDx;
        const bustY = isPortraitNarrow
          ? bandY + 12
          : Math.max(8, Math.min(ch - bustSize - 76, Math.round(ch * 0.43 - bustSize * 0.5)));

        const amp = Math.max(0, Math.min(1, Number(this.audio?.getVoiceAmplitude?.() || 0)));
        const activeMouthStage =
          this._introMouthStage === 0 ||
          this._introMouthStage === 1 ||
          this._introMouthStage === 2 ||
          this._introMouthStage === 3
            ? this._introMouthStage
            : null;
        const talkFrameIdx = Game.computeIntroTalkFrameIndex(amp, elapsed, activeMouthStage);

        // Pulsing Hero-Colored Radiant Rim Bloom behind the bust frame (0 arc/ellipse/rotate!)
        if (typeof ctx.createRadialGradient === 'function') {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = turnAlpha * (0.32 + amp * 0.24);
          const bCx = bustX + (bustSize >> 1);
          const bCy = bustY + (bustSize >> 1);
          const bRad = Math.round(bustSize * 0.68);
          const bgGlow = ctx.createRadialGradient(bCx, bCy, Math.round(bustSize * 0.24), bCx, bCy, bRad);
          if (bgGlow && typeof bgGlow.addColorStop === 'function') {
            bgGlow.addColorStop(0, spkCol);
            bgGlow.addColorStop(0.62, spkCol);
            bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = bgGlow;
            fillRectClamped(bCx - bRad, bCy - bRad, bRad * 2, bRad * 2);
          }
          ctx.restore();
        }
        ctx.globalAlpha = turnAlpha;

        // Soft obsidian shadow drop + sleek subtle hero-accent edge (all clamped cleanly to [0, cw]!)
        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        fillRectClamped(bustX - 4, bustY - 4, bustSize + 8, bustSize + 10);
        ctx.fillStyle = spkCol;
        fillRectClamped(bustX - 2, bustY + bustSize, bustSize + 4, 3);
        fillRectClamped(isRightSpeaker ? bustX - 3 : bustX + bustSize, bustY, 3, bustSize + 3);
        ctx.fillStyle = '#050816';
        fillRectClamped(bustX, bustY, bustSize, bustSize);

        const talkSheetImg = PixelForge.getIntroTalkSheet?.(heroKey) || null;
        const layersImg = PixelForge.getIntroTalkLayers?.(heroKey) || null;
        const animSheetImg = PixelForge.getIntroTalkAnimSheet?.(heroKey) || null;
        const layersReady = Boolean(
          layersImg &&
            !layersImg.__avsPending &&
            (layersImg.naturalWidth ? layersImg.naturalWidth >= 960 : layersImg.complete !== false)
        );
        const animReady = Boolean(
          animSheetImg &&
            !animSheetImg.__avsPending &&
            (animSheetImg.naturalWidth ? animSheetImg.naturalWidth >= 2560 : animSheetImg.complete !== false)
        );
        const desiredFacing = isRightSpeaker ? -1 : 1;

        // CHARACTER-ONLY MOTION (Stationary Portrait Environment NEVER shakes or warps!):
        // Smooth 8-frame V3 zero-wiggle single-component breathing/hair-wind/shimmer + grounded overscan (`ov=3`)
        // so ZERO bottom/side frame edge gaps EVER appear and ZERO 46Hz jitter-buzz vibrates the character!
        const animFrameIdx = Math.floor(elapsed * 6.5) % 8;
        const ANIM_HEAD_DYS = [0, -1, -2, -2, -2, -1, 0, 0];
        const headDy320 = ANIM_HEAD_DYS[animFrameIdx] || 0;
        const faceRoi = PixelForge.INTRO_FACE_ROIS?.[baseHero] || [120, 100, 212, 180];
        const ov = 3;
        const drawW = bustSize + ov * 2;
        const drawH = bustSize + ov * 2;
        const bodyDxLocal = Math.round(amp * 2.2 + Math.sin(elapsed * 5.0) * (amp * 0.8));
        const bodyDyLocal = -Math.round(amp * 1.1);

        // Nyx's 100% isolated floating COB Cyber-Drone hovers smoothly in independent Lissajous orbit!
        const frontDxLocal = baseHero === 'nyx' ? Math.round(Math.cos(elapsed * 2.8) * 5) : bodyDxLocal;
        const frontDyLocal = baseHero === 'nyx' ? Math.round(Math.sin(elapsed * 4.2) * 6 - amp * 3.0) : bodyDyLocal;

        const drawCharacterComposite = (ox, oy, talkSx) => {
          const baseOx = ox - ov;
          const baseOy = oy - ov;
          if (animReady && animSheetImg) {
            // Smooth 8-frame zero-wiggle single-component Apple Vision living character loop!
            ctx.drawImage(
              animSheetImg,
              animFrameIdx * 320,
              0,
              320,
              320,
              baseOx + bodyDxLocal,
              baseOy + bodyDyLocal,
              drawW,
              drawH
            );
            // Exact 0.00px-aligned real-time F0..F5 anime blinks & vowel lip-sync Face ROI stamp!
            const [fx0, fy0, fx1, fy1] = faceRoi;
            const fw = fx1 - fx0;
            const fh = fy1 - fy0;
            const dx0 = Math.round((fx0 / 320) * drawW);
            const dx1 = Math.round((fx1 / 320) * drawW);
            const dy0 = Math.round(((fy0 + headDy320) / 320) * drawH);
            const dy1 = Math.round(((fy1 + headDy320) / 320) * drawH);
            ctx.drawImage(
              talkSheetImg,
              talkSx + fx0,
              fy0,
              fw,
              fh,
              baseOx + bodyDxLocal + dx0,
              baseOy + bodyDyLocal + dy0,
              dx1 - dx0,
              dy1 - dy0
            );
          } else {
            ctx.drawImage(talkSheetImg, talkSx, 0, 320, 320, baseOx + bodyDxLocal, baseOy + bodyDyLocal, drawW, drawH);
          }
          // Nyx's truly detached floating Cob Cyber-Drone (`Cell 2`, 0 contact with body!)
          if (baseHero === 'nyx' && layersReady && layersImg) {
            ctx.drawImage(layersImg, 640, 0, 320, 320, baseOx + frontDxLocal, baseOy + frontDyLocal, drawW, drawH);
          }
        };

        ctx.save();
        if (typeof ctx.beginPath === 'function' && typeof ctx.rect === 'function' && typeof ctx.clip === 'function') {
          ctx.beginPath();
          ctx.rect(bustX, bustY, bustSize, bustSize);
          ctx.clip();
        }
        if (talkSheetImg && typeof ctx.drawImage === 'function') {
          const sx = talkFrameIdx * 320;
          const flipX = 1 !== desiredFacing;
          try {
            // LAYER 1: Stationary Non-Smeared Portrait Backdrop (`Cell 0`, 0px shake!)
            if (layersReady && layersImg) {
              if (flipX && typeof ctx.translate === 'function' && typeof ctx.scale === 'function') {
                ctx.save();
                ctx.translate(bustX + bustSize, bustY);
                ctx.scale(-1, 1);
                ctx.drawImage(layersImg, 0, 0, 320, 320, 0, 0, bustSize, bustSize);
                ctx.restore();
              } else {
                ctx.drawImage(layersImg, 0, 0, 320, 320, bustX, bustY, bustSize, bustSize);
              }
            }

            // LAYER 2: 12-Hero Authentic Animated Portrait Environment Overlays & Magical Rim Aura!
            this._drawIntroBustBackEnvAndMagicFX(ctx, {
              baseHero,
              bustX,
              bustY,
              bustSize,
              elapsed,
              amp,
              spkCol,
              turnAlpha,
              isRightSpeaker,
              fillRectClamped,
              drawStar4
            });

            // LAYERS 3, 4 & 5: Zero-Cut Apple Vision Living Character Loop + Real-Time Face Lip-Sync/Blinks + Floating Cob!
            if (flipX && typeof ctx.translate === 'function' && typeof ctx.scale === 'function') {
              ctx.save();
              ctx.translate(bustX + bustSize, bustY);
              ctx.scale(-1, 1);
              drawCharacterComposite(0, 0, sx);
              ctx.restore();
            } else {
              drawCharacterComposite(bustX, bustY, sx);
            }
          } catch (_) {}
        } else if (typeof ctx.drawImage === 'function') {
          const fb = PixelForge.getIntroFallbackBust?.(heroKey);
          if (fb?.img) {
            const flipX = fb.naturalFacing !== desiredFacing;
            try {
              if (flipX && typeof ctx.translate === 'function' && typeof ctx.scale === 'function') {
                ctx.save();
                ctx.translate(bustX + bustSize, bustY);
                ctx.scale(-1, 1);
                ctx.drawImage(
                  fb.img,
                  fb.sx,
                  fb.sy,
                  fb.sw,
                  fb.sh,
                  bodyDxLocal,
                  bodyDyLocal,
                  drawW,
                  drawH
                );
                ctx.restore();
              } else {
                ctx.drawImage(
                  fb.img,
                  fb.sx,
                  fb.sy,
                  fb.sw,
                  fb.sh,
                  bustX + bodyDxLocal,
                  bustY + bodyDyLocal,
                  drawW,
                  drawH
                );
              }
            } catch (_) {}
          }
        }
        ctx.restore();
        ctx.globalAlpha = turnAlpha;

        // LAYER 6: Weapon/Hand/Core-Locked Magical Glowing Bloom & 12-Hero Signature Foreground FX!
        this._drawIntroBustHeroOverlayFX(ctx, {
          baseHero,
          bustX,
          bustY,
          bustSize,
          elapsed,
          amp,
          spkCol,
          turnAlpha,
          isRightSpeaker,
          bodyDx: bodyDxLocal,
          bodyDy: bodyDyLocal,
          frontDx: frontDxLocal,
          frontDy: frontDyLocal,
          fillRectClamped,
          drawStar4
        });

        // Corner accent stars on living bust frame
        drawStar4(bustX, bustY, 8, '#fef08a');
        drawStar4(bustX + bustSize, bustY, 8, '#fef08a');
        drawStar4(bustX, bustY + bustSize, 8, spkCol);
        drawStar4(bustX + bustSize, bustY + bustSize, 8, spkCol);

        // 3. Balanced Speaker Name Slam (`34-42px` Desktop, `24-30px` Landscape, `20-24px` Portrait)
        //    Slides in cleanly from the speaker's own side with crisp ArcanePixel typography!
        let infoX0;
        let infoX1;
        let deckTopY;
        let deckH;

        if (isPortraitNarrow) {
          infoX0 = 18;
          infoX1 = cw - 18;
          deckTopY = bustY + bustSize - 8;
          deckH = 144;
          drawChamferPlaque(10, deckTopY, cw - 20, deckH, spkCol, '#fef08a', 0.96, true);
        } else {
          const gap = cw >= 960 ? 28 : 18;
          infoX0 = isRightSpeaker ? sideMargin : targetBustX + bustSize + gap;
          infoX1 = isRightSpeaker ? targetBustX - gap : cw - sideMargin;
          deckTopY = bandY + (cw >= 960 ? 18 : 10);
          deckH = bandH - (cw >= 960 ? 36 : 20);
        }

        const infoW = Math.max(140, infoX1 - infoX0);
        const infoSlideDx = Math.round(bustSlideDx * 0.45);
        const infoCx = infoX0 + Math.round(infoW * 0.5) + infoSlideDx;

        // Clean Centered Top Matchup Tag (`VS.` + Opponent Name, tight natural spacing!)
        const matchTagY = isPortraitNarrow
          ? Math.max(28, bandY - 20)
          : deckTopY + (cw >= 960 ? 18 : 14);
        if (!isSideBanner) {
          const vsBadgePx = cw >= 960 ? 16 : cw >= 520 ? 13 : 11;
          const oppPx = cw >= 960 ? 15 : cw >= 520 ? 12 : 10;
          const matchCx = isPortraitNarrow ? cx : infoCx;
          ctx.font = `bold ${vsBadgePx}px "ArcanePixel", "Press Start 2P", monospace`;
          const vsMeasured = typeof ctx.measureText === 'function' ? Math.ceil(ctx.measureText('VS.').width || 0) : 0;
          const vsEstW = Math.max(Math.round(vsBadgePx * 2.5), vsMeasured);
          ctx.font = `bold ${oppPx}px "ArcanePixel", "Press Start 2P", monospace`;
          const oppMeasured = typeof ctx.measureText === 'function' ? Math.ceil(ctx.measureText(oppName).width || 0) : 0;
          const oppEstW = Math.max(Math.round(oppName.length * oppPx * 0.78), oppMeasured);
          const tagGap = cw >= 960 ? 18 : 12;
          const totalLockupW = vsEstW + tagGap + oppEstW;
          const lockupLeft = matchCx - (totalLockupW >> 1);
          const vsLabelX = lockupLeft + (vsEstW >> 1);
          const oppLabelX = lockupLeft + vsEstW + tagGap + (oppEstW >> 1);

          ctx.font = `bold ${vsBadgePx}px "ArcanePixel", "Press Start 2P", monospace`;
          ctx.fillStyle = '#020617';
          ctx.fillText('VS.', vsLabelX + 2, matchTagY + 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fillText('VS.', vsLabelX, matchTagY);

          ctx.font = `bold ${oppPx}px "ArcanePixel", "Press Start 2P", monospace`;
          ctx.fillStyle = '#020617';
          ctx.fillText(oppName, oppLabelX + 2, matchTagY + 2, infoW);
          ctx.fillStyle = oppCol;
          ctx.fillText(oppName, oppLabelX, matchTagY, infoW);
        }

        // Resonance Tag
        const resPx = cw >= 960 ? 13 : cw >= 520 ? 10 : 9;
        const resY = isPortraitNarrow
          ? deckTopY + 20
          : deckTopY + (cw >= 960 ? 52 : 36);
        ctx.font = `bold ${resPx}px "ArcanePixel", "Press Start 2P", monospace`;
        ctx.fillStyle = '#020617';
        ctx.fillText('INTRO • VOICE RESONANCE', infoCx + 2, resY + 2, infoW);
        ctx.fillStyle = '#fef08a';
        ctx.fillText('INTRO • VOICE RESONANCE', infoCx, resY, infoW);

        // Sleek Balanced Speaker Name Slam (`34-42px` Desktop, `24-30px` Landscape, `20-24px` Portrait)
        const maxSpkPx = cw >= 960 ? 42 : cw >= 520 ? 30 : 24;
        const minSpkPx = cw >= 960 ? 34 : cw >= 520 ? 24 : 20;
        const spkNamePx = fitArcadeFontPx(spkName, maxSpkPx, minSpkPx, infoW);
        const spkNameY = isPortraitNarrow
          ? deckTopY + 56
          : deckTopY + Math.round(deckH * 0.44);

        drawGiantArcadeText(
          spkName,
          infoCx,
          spkNameY,
          spkNamePx,
          infoW,
          '#0f172a',
          spkCol,
          '#f59e0b',
          '#ffffff',
          0.32
        );

        // Bold Hero Title Subtitle
        const titlePx = cw >= 960 ? 14 : cw >= 520 ? 11 : 9;
        const titleY = spkNameY + Math.round(spkNamePx * 0.72) + (cw >= 960 ? 12 : 8);
        ctx.font = `bold ${titlePx}px "ArcanePixel", "Press Start 2P", monospace`;
        ctx.fillStyle = '#020617';
        ctx.fillText(heroTitle, infoCx + 2, titleY + 2, infoW);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(heroTitle, infoCx, titleY, infoW);

        // Sleek Luminous Dark-Fantasy Magical Voice Resonance Filament Wave (replaces generic boxy equalizer bars!)
        const waveW = Math.min(infoW - 20, cw >= 960 ? 440 : infoW - 12);
        const waveMidY = isPortraitNarrow
          ? deckTopY + deckH - 22
          : deckTopY + deckH - (cw >= 960 ? 28 : 20);
        const waveX0 = infoCx - (waveW >> 1);
        const maxWaveH = cw >= 960 ? 22 : 14;
        const nodes = 28;
        const nodeStep = waveW / nodes;

        // Feathered glowing center spine
        if (typeof ctx.createLinearGradient === 'function') {
          const spG = ctx.createLinearGradient(waveX0, 0, waveX0 + waveW, 0);
          if (spG && typeof spG.addColorStop === 'function') {
            spG.addColorStop(0, 'rgba(0, 0, 0, 0)');
            spG.addColorStop(0.25, spkCol);
            spG.addColorStop(0.50, '#fef08a');
            spG.addColorStop(0.75, spkCol);
            spG.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = spG;
          } else {
            ctx.fillStyle = spkCol;
          }
        } else {
          ctx.fillStyle = spkCol;
        }
        fillRectClamped(waveX0, waveMidY - 1, waveW, 2);

        // Symmetric glowing magical harmonic pulse nodes (tapered softly toward both ends!)
        for (let b = 0; b <= nodes; b++) {
          const u = b / nodes;
          const env = Math.sin(u * Math.PI); // smooth 0 -> 1 -> 0 envelope
          const harm =
            0.35 +
            0.40 * Math.abs(Math.sin(elapsed * 16 + b * 0.48)) +
            0.25 * Math.abs(Math.cos(elapsed * 23 - b * 0.72));
          const halfH = Math.max(2, Math.round((0.18 + amp * 0.82) * env * harm * maxWaveH));
          const bx = Math.round(waveX0 + b * nodeStep);
          ctx.fillStyle = spkCol;
          fillRectClamped(bx - 1, waveMidY - halfH, 3, halfH * 2);
          ctx.fillStyle = '#fef08a';
          fillRectClamped(bx, waveMidY - Math.max(1, halfH >> 1), 2, Math.max(2, halfH));
          if (halfH >= 8) {
            ctx.fillStyle = '#ffffff';
            fillRectClamped(bx, waveMidY - 2, 2, 4);
          }
        }
        drawStar4(waveX0 + 4, waveMidY, 5, spkCol);
        drawStar4(waveX0 + waveW - 4, waveMidY, 5, spkCol);
        if (amp > 0.25) {
          drawStar4(infoCx, waveMidY, Math.min(9, 5 + Math.round(amp * 4)), '#fef08a');
        }

        // 4. Larger High-Legibility Spoken Voice Dialogue Subtitle Bar at Bottom of Screen!
        this._drawIntroSubtitleBar(ctx, {
          baseHero,
          spkName,
          spkCol,
          spkElapsed,
          amp,
          turnAlpha,
          cw,
          ch,
          cx,
          minTopY: isPortraitNarrow ? deckTopY + deckH + 10 : Math.max(bustY + bustSize + 10, bandY + bandH + 10),
          isPortraitNarrow,
          fillRectClamped
        });
      }
    } else if (inEngage) {
      // ======================================================================
      // ACT 3: Punchy Full-Screen `ENGAGE!` Detonation (`54-66px` Desktop, `0.85s`)
      // ======================================================================
      const rem = Math.max(0, Number(this._roundEngageBannerTimer) || 0);
      const totalEngage = 0.85;
      const engageElapsed = Math.max(0, totalEngage - Math.min(totalEngage, rem));
      const inPhase1 = engageElapsed < 0.18;
      const inPhase3 = rem <= 0.22;
      const p1T = Math.min(1, engageElapsed / 0.18);
      const p3T = inPhase3 ? Math.max(0, Math.min(1, rem / 0.22)) : 1;

      const boxW = Math.min(cw - 24, cw >= 960 ? Math.min(760, Math.round(cw * 0.64)) : Math.round(cw * 0.84));
      const fullBoxH = cw < 520 ? 92 : cw >= 960 ? 116 : 104;
      const boxH = inPhase3 ? Math.max(20, Math.round(fullBoxH * p3T)) : fullBoxH;
      const bx = cx - Math.round(boxW * 0.5);
      const by = cy - Math.round(boxH * 0.5);
      const alpha = inPhase3 ? Math.max(0.28, p3T) : 1;

      if (inPhase1) {
        const beamH = Math.max(6, Math.round((1 - p1T) * 28));
        ctx.globalAlpha = 0.94;
        ctx.fillStyle = '#dc2626';
        fillRectClamped(0, cy - beamH - 4, cw, (beamH + 4) * 2);
        ctx.fillStyle = '#f59e0b';
        fillRectClamped(0, cy - beamH, cw, beamH * 2);
        ctx.fillStyle = '#fef08a';
        fillRectClamped(0, cy - Math.max(3, beamH >> 1), cw, Math.max(6, beamH));
        ctx.fillStyle = '#ffffff';
        fillRectClamped(0, cy - 3, cw, 6);

        const shockW = Math.min(cw - 6, Math.round(boxW * (0.58 + p1T * 0.56)));
        const shockH = Math.min(ch - 6, Math.round(fullBoxH * (0.58 + p1T * 0.72)));
        const sx0 = cx - (shockW >> 1);
        const sy0 = cy - (shockH >> 1);
        ctx.fillStyle = '#fef08a';
        fillRectClamped(sx0, sy0, shockW, 4);
        fillRectClamped(sx0, sy0 + shockH - 4, shockW, 4);
        fillRectClamped(sx0, sy0, 4, shockH);
        fillRectClamped(sx0 + shockW - 4, sy0, 4, shockH);
      }

      drawChamferPlaque(bx, by, boxW, boxH, '#f59e0b', '#fef08a', alpha, true);

      if (!inPhase3) {
        const burstProg = Math.min(1, engageElapsed / 0.63);
        for (let s = 0; s < 14; s++) {
          const dir = s % 2 === 0 ? -1 : 1;
          const lane = (s >> 1) - 3;
          const dist = Math.round(80 + burstProg * (boxW * 0.48) + ((s * 29) % 52));
          const sx = cx + dir * dist;
          const sy = cy + lane * Math.round(boxH * 0.14);
          ctx.fillStyle = s % 3 === 0 ? '#ffffff' : s % 2 === 0 ? '#fef08a' : '#f59e0b';
          fillRectClamped(sx - 12, sy - 2, 24, 3);
          fillRectClamped(sx + dir * 16, sy - 3, 5, 5);
        }
      } else {
        const railSpan = Math.min(cw - 8, Math.round(boxW + (1 - p3T) * 200));
        const rx0 = cx - (railSpan >> 1);
        ctx.fillStyle = '#dc2626';
        fillRectClamped(rx0, by - 3, railSpan, 4);
        fillRectClamped(rx0, by + boxH - 1, railSpan, 4);
        ctx.fillStyle = '#ffffff';
        fillRectClamped(0, cy - 2, cw, 4);
      }

      const chevOff = Math.max(96, Math.round(boxW * 0.42));
      drawSteppedChevron(cx - chevOff, cy - 2, -1, 5, 6, '#f59e0b');
      drawSteppedChevron(cx - chevOff + 14, cy - 2, -1, 5, 6, '#fef08a');
      drawSteppedChevron(cx + chevOff, cy - 2, 1, 5, 6, '#f59e0b');
      drawSteppedChevron(cx + chevOff - 14, cy - 2, 1, 5, 6, '#fef08a');

      // Punchy balanced 'ENGAGE!' typography:
      // Desktop (>= 960px): 54-66px | Medium (520..959px): 40-50px | Mobile (< 520px): 30-38px
      const minEngPx = cw >= 960 ? 54 : cw >= 520 ? 40 : 30;
      const maxEngPx = cw >= 960 ? 66 : cw >= 520 ? 50 : 38;
      const slamFactor = inPhase1 ? 1 - p1T : 0;
      const engagePx = Math.max(
        minEngPx,
        Math.min(maxEngPx, Math.round(minEngPx + (maxEngPx - minEngPx) * (0.25 + 0.75 * slamFactor)))
      );
      const engMaxW = boxW - 36;

      ctx.globalAlpha = alpha;
      drawGiantArcadeText(
        'ENGAGE!',
        cx,
        cy + 1,
        engagePx,
        engMaxW,
        '#7f1d1d',
        '#dc2626',
        '#f59e0b',
        '#ffffff',
        0.5
      );
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
      !(this.isAdventureMode() && (this.adventure?.isSkillTreeOpen || this.adventure?.isRelicDraftOpen))
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
      this._renderRoundIntroOverlay?.(this.renderer?.ctx);
    } else if (!this._pausedFrameRendered) {
      this.renderer.render(this.fighters, this.vfx);
      this._renderRoundIntroOverlay?.(this.renderer?.ctx);
      this._pausedFrameRendered = true;
    }
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
}
