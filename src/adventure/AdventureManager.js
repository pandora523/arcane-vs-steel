import { Fighter } from '../entities/Fighter.js?v=30fps188';
import { Monster, ArchfiendBoss } from '../entities/Monster.js?v=30fps188';
import { PixelForge } from '../engine/PixelForge.js?v=30fps188';
import { PixelFont } from '../engine/PixelFont.js?v=30fps188';
import {
  AdventureProgression,
  ADVENTURE_SKILL_TREE,
  ADVENTURE_HERO_PROGRESS_STORAGE_KEY,
  ADVENTURE_KEEP_LEVEL_STORAGE_KEY,
  getHeroSkillTreeTheme,
  normalizeAdventureProgressMode,
  loadAdventureProgressMode,
  saveAdventureProgressMode,
  loadAllAdventureHeroProgress,
  loadAdventureHeroProgress,
  saveAdventureHeroProgress,
  resetAdventureHeroProgress
} from './AdventureProgression.js?v=30fps188';
import { AdventureSkillSets, ADVENTURE_HERO_KITS } from './AdventureSkillSets.js?v=30fps188';
import { AdventureDestructibles } from './AdventureDestructibles.js?v=30fps188';
import { AdventureMapRenderer } from './AdventureMapRenderer.js?v=30fps188';

export {
  ADVENTURE_HERO_PROGRESS_STORAGE_KEY,
  ADVENTURE_KEEP_LEVEL_STORAGE_KEY,
  normalizeAdventureProgressMode,
  loadAdventureProgressMode,
  saveAdventureProgressMode,
  loadAllAdventureHeroProgress,
  loadAdventureHeroProgress,
  saveAdventureHeroProgress,
  resetAdventureHeroProgress
};

export const ADVENTURE_WORLD_WIDTH = 9600;
export const ADVENTURE_BOSS_ANCHOR_X = 9335;
export const ADVENTURE_BOSS_MAX_WALK_X = 9250;
export const ADVENTURE_DEPTH_MIN_Y = 442;
export const ADVENTURE_DEPTH_MAX_Y = 680;
export const ADVENTURE_DEPTH_MID_Y = 561;
export const DEFAULT_ADVENTURE_CAMPAIGN_ID = 'default';
export const ADVENTURE_MAX_RELICS = 4;
export const ADVENTURE_MEDALS_STORAGE_KEY = 'avs_adv_medals_v1';
export const ADVENTURE_TIER_STORAGE_KEY = 'avs_adv_tier_v1';

export const ADVENTURE_DIFFICULTY_TIERS = {
  normal: {
    id: 'normal',
    label: 'NORMAL',
    shortLabel: 'NORM',
    hpMult: 1.0,
    dmgMult: 1.0,
    cadenceMult: 1.0,
    scoreMult: 1.0,
    bossDmgMult: 0.76,
    bossSkillCd: 4.55,
    bossSoulTitheCd: 8.8,
    bossSoulTitheChipScale: 0.72,
    accentHex: '#94a3b8',
    medalTier: 'bronze'
  },
  heroic: {
    id: 'heroic',
    label: 'HEROIC',
    shortLabel: 'HEROIC',
    hpMult: 1.35,
    dmgMult: 1.22,
    cadenceMult: 1.15,
    scoreMult: 1.5,
    bossDmgMult: 1.12,
    bossSkillCd: 3.65,
    bossSoulTitheCd: 6.2,
    bossSoulTitheChipScale: 1.0,
    accentHex: '#facc15',
    medalTier: 'gold'
  },
  sovereign: {
    id: 'sovereign',
    label: 'SOVEREIGN',
    shortLabel: 'SOV',
    hpMult: 1.75,
    dmgMult: 1.4,
    cadenceMult: 1.25,
    scoreMult: 2.25,
    bossDmgMult: 1.35,
    bossSkillCd: 3.15,
    bossSoulTitheCd: 5.0,
    bossSoulTitheChipScale: 1.15,
    accentHex: '#f43f5e',
    medalTier: 'crimson'
  }
};

const ADV_RANK_ORDER = { B: 1, A: 2, S: 3, 'S+': 4 };
const ADV_TIER_ORDER = { normal: 1, heroic: 2, sovereign: 3 };

export function normalizeAdventureDifficultyId(rawTier) {
  const clean = String(rawTier || 'normal').trim().toLowerCase();
  return ADVENTURE_DIFFICULTY_TIERS[clean] ? clean : 'normal';
}

export function normalizeAdventureRankShort(rankStr) {
  const s = String(rankStr || '').trim().toUpperCase();
  if (s.startsWith('S+')) return 'S+';
  if (s.startsWith('S')) return 'S';
  if (s.startsWith('A')) return 'A';
  return 'B';
}

function resolveMedalStorage(storageOverride = null) {
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

export function loadAdventureMedals(storageOverride = null) {
  const store = resolveMedalStorage(storageOverride);
  if (!store || typeof store.getItem !== 'function') return {};
  try {
    const raw = store.getItem(ADVENTURE_MEDALS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out = {};
    for (const [heroId, rec] of Object.entries(parsed)) {
      if (!heroId || !rec || typeof rec !== 'object') continue;
      out[heroId] = {
        rank: normalizeAdventureRankShort(rec.rank),
        score: Number.isFinite(rec.score) ? Math.max(0, Math.round(rec.score)) : 0,
        bestTier: normalizeAdventureDifficultyId(rec.bestTier)
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveAdventureMedal(heroId, { rank = 'B', score = 0, tier = 'normal' } = {}, storageOverride = null) {
  if (!heroId || typeof heroId !== 'string') return null;
  const cleanHero = heroId.trim();
  if (!cleanHero) return null;
  const medals = loadAdventureMedals(storageOverride);
  const prev = medals[cleanHero] || null;
  const nextRank = normalizeAdventureRankShort(rank);
  const nextTier = normalizeAdventureDifficultyId(tier);
  const nextScore = Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;

  const merged = {
    rank:
      prev && (ADV_RANK_ORDER[prev.rank] || 0) > (ADV_RANK_ORDER[nextRank] || 0)
        ? prev.rank
        : nextRank,
    score: prev ? Math.max(prev.score || 0, nextScore) : nextScore,
    bestTier:
      prev && (ADV_TIER_ORDER[prev.bestTier] || 0) > (ADV_TIER_ORDER[nextTier] || 0)
        ? prev.bestTier
        : nextTier
  };
  medals[cleanHero] = merged;

  const store = resolveMedalStorage(storageOverride);
  if (store && typeof store.setItem === 'function') {
    try {
      store.setItem(ADVENTURE_MEDALS_STORAGE_KEY, JSON.stringify(medals));
    } catch {
      // Ignore storage quota or sandbox write errors safely
    }
  }
  return merged;
}

export const ADVENTURE_RELIC_BOONS = [
  {
    id: 'chain_lightning',
    name: 'CHAIN LIGHTNING STRIKES',
    shortTag: 'CHAIN',
    accentHex: '#38bdf8',
    desc: 'Every 3rd hit arcs lightning to 2 nearby foes for 45% DMG + Stagger.'
  },
  {
    id: 'exploding_dodge',
    name: 'EXPLODING DODGE AFTERIMAGE',
    shortTag: 'MIRAGE',
    accentHex: '#fb923c',
    desc: 'Evading leaves a solar mirage that detonates for 135 AoE DMG + Stagger.'
  },
  {
    id: 'twin_spirit_echo',
    name: 'TWIN SPIRIT ECHO',
    shortTag: 'ECHO',
    accentHex: '#c084fc',
    desc: 'Skills unleash a delayed astral echo (+145 AoE DMG, +18 Stagger, +12 Spirit).'
  },
  {
    id: 'executioner_detonation',
    name: 'EXECUTIONER DETONATION',
    shortTag: 'EXEC',
    accentHex: '#f43f5e',
    desc: 'Executes non-boss foes under 18% HP and detonates slain foes in a crimson blast.'
  },
  {
    id: 'orbiting_aegis_runes',
    name: 'ORBITING AEGIS RUNES',
    shortTag: 'AEGIS',
    accentHex: '#facc15',
    desc: 'Twin orbiting runes grant +12% DR and zap nearby enemies for 42 DMG + Stagger.'
  },
  {
    id: 'soul_siphon_cleave',
    name: 'SOUL-SIPHON CLEAVE',
    shortTag: 'SIPHON',
    accentHex: '#34d399',
    desc: '+20% cleave damage, +4 Spirit per hit, and restore 3.5% HP on every kill.'
  },
  {
    id: 'frostbite_shatter',
    name: 'FROSTBITE SHATTER',
    shortTag: 'FROST',
    accentHex: '#67e8f9',
    desc: 'Crits & Skills chill foes (-28% move/attack speed for 2.4s) and shatter for +85 frost DMG on Guard Break.'
  },
  {
    id: 'phantom_counter_wave',
    name: 'PHANTOM COUNTER-WAVE',
    shortTag: 'WAVE',
    accentHex: '#38bdf8',
    desc: 'Phantom Evade empowers your next strike with a piercing 220px astral shockwave (+110 AoE DMG + 25 Stagger).'
  },
  {
    id: 'guard_break_siphon',
    name: 'GUARD-BREAK SIPHON',
    shortTag: 'BREAK',
    accentHex: '#4ade80',
    desc: 'Triggering Guard Break restores 10% max HP, +35 Spirit, and +20% Overdrive charge.'
  },
  {
    id: 'meteor_calldown',
    name: 'SOLAR METEOR CALLDOWN',
    shortTag: 'METEOR',
    accentHex: '#f97316',
    desc: 'Every 4th Skill or Overdrive calls down a pixel solar meteor on the nearest foe (210 AoE DMG + 24 Stagger).'
  },
  {
    id: 'overdrive_surge',
    name: 'OVERDRIVE SURGE',
    shortTag: 'SURGE',
    accentHex: '#fbbf24',
    desc: '+30% Overdrive charge gain from all sources and +22% Overdrive & Supreme Ult damage.'
  },
  {
    id: 'haste_momentum',
    name: 'HASTE MOMENTUM',
    shortTag: 'HASTE',
    accentHex: '#2dd4bf',
    desc: '+16% 3D move speed and -20% Skill & Dodge cooldowns after every kill (4s buff).'
  }
];

const CAMPAIGN_MONSTER_KIND_MAP = {
  templar: 'templar',
  astrologer: 'astrologer',
  treant: 'treant',
  sylph: 'dryad',
  dryad: 'dryad',
  ghoul: 'ghoul',
  lich: 'cultist',
  cultist: 'cultist',
  imp: 'fiend',
  fiend: 'fiend',
  hellhound: 'brute',
  brute: 'brute'
};

const ZONE_DEFAULT_META = [
  {
    id: 'outskirts',
    stageId: 'cathedral',
    biome: 'cathedral',
    bloomPalette: 'cyan',
    title: 'ZONE I • ECLIPSE OUTSKIRTS',
    accentHex: '#38bdf8'
  },
  {
    id: 'causeway',
    stageId: 'sylvan',
    biome: 'sylvan',
    bloomPalette: 'emerald',
    title: 'ZONE II • CURSED STARWOOD',
    accentHex: '#34d399'
  },
  {
    id: 'stronghold',
    stageId: 'boneyard',
    biome: 'boneyard',
    bloomPalette: 'violet',
    title: 'ZONE III • ABYSSAL BONE-GATE',
    accentHex: '#c084fc'
  },
  {
    id: 'blackpit',
    stageId: 'clocktower',
    biome: 'clocktower',
    bloomPalette: 'ember',
    title: 'ZONE IV • THRONE OF THE BLACK PIT',
    accentHex: '#fb923c'
  }
];

function sanitizeCampaignText(val, fallback = '', maxLen = 84) {
  if (typeof val !== 'string') return fallback;
  // Strip any Unicode pictographs/dingbats so imported JSON packs always uphold zero-emoji UI purity
  const cleaned = val
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0E}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
}

function normalizeMonsterSpawnSpec(raw, zIdx, wIdx, sIdx, minX, maxX, minGy, maxGy, midGy) {
  if (!raw || typeof raw !== 'object') return null;
  const rawType = String(raw.engineKind || raw.type || raw.kind || 'templar')
    .trim()
    .toLowerCase();
  const engineKind = CAMPAIGN_MONSTER_KIND_MAP[rawType] || 'templar';
  const defaultX = minX + (wIdx === 0 ? 640 : 1680) + sIdx * 180;
  const x = Math.max(
    minX + 60,
    Math.min(maxX - 60, Number.isFinite(raw.x) ? Math.round(raw.x) : defaultX)
  );
  const groundY = Math.max(
    minGy + 8,
    Math.min(maxGy - 8, Number.isFinite(raw.groundY) ? Math.round(raw.groundY) : midGy)
  );
  const isMiniBoss = Boolean(raw.isMiniBoss);
  const isElite = Boolean(raw.isElite || isMiniBoss);
  const maxHp =
    Number.isFinite(raw.maxHp) && raw.maxHp > 0 ? Math.round(raw.maxHp) : null;
  const defaultMiniScale =
    engineKind === 'treant' || engineKind === 'brute' ? 1.36 : 1.24;
  const spriteScale =
    Number.isFinite(raw.spriteScale) && raw.spriteScale > 0
      ? raw.spriteScale
      : isMiniBoss
        ? defaultMiniScale
        : null;
  const dmgScale =
    Number.isFinite(raw.dmgScale) && raw.dmgScale > 0
      ? raw.dmgScale
      : isMiniBoss
        ? 1.16
        : null;
  return {
    id: sanitizeCampaignText(raw.id, `z${zIdx}_w${wIdx}_${sIdx}`, 48),
    type: sanitizeCampaignText(raw.type || engineKind, engineKind, 24).toLowerCase(),
    engineKind,
    x,
    groundY,
    isElite,
    isMiniBoss,
    wardenName: isMiniBoss ? sanitizeCampaignText(raw.wardenName || raw.name, '', 48) : null,
    wardenTitle: isMiniBoss ? sanitizeCampaignText(raw.wardenTitle || raw.title, '', 48) : null,
    maxHp,
    spriteScale,
    dmgScale
  };
}

/**
 * Validates and normalizes an Arcane Pixel Studio Adventure Stage Pack (`schemaVersion: "1.0.0"`),
 * accepting both primary Studio keys (`props`, `subWave0`/`subWave1`, `finalBoss`) and schema
 * aliases (`destructibles`, `waves`, `boss`).
 */
export function normalizeAdventureCampaignPack(rawPack) {
  if (!rawPack || typeof rawPack !== 'object' || Array.isArray(rawPack)) {
    throw new Error('Invalid campaign pack: expected a JSON object.');
  }

  const rawId = sanitizeCampaignText(rawPack.packId || rawPack.id, 'custom_pack', 64)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const packId =
    !rawId || rawId === DEFAULT_ADVENTURE_CAMPAIGN_ID ? 'custom_pack' : rawId;

  const rawWc =
    rawPack.walkableCauseway && typeof rawPack.walkableCauseway === 'object'
      ? rawPack.walkableCauseway
      : {};
  const zoneWidth =
    Number.isFinite(rawWc.zoneWidth) && rawWc.zoneWidth >= 1200
      ? Math.round(rawWc.zoneWidth)
      : 2400;
  const roadTopY = Number.isFinite(rawWc.roadTopY) ? Math.round(rawWc.roadTopY) : 436;
  const minY = Number.isFinite(rawWc.minY) ? Math.round(rawWc.minY) : ADVENTURE_DEPTH_MIN_Y;
  const maxY = Number.isFinite(rawWc.maxY)
    ? Math.max(minY + 80, Math.round(rawWc.maxY))
    : ADVENTURE_DEPTH_MAX_Y;
  const midY = Number.isFinite(rawWc.midY)
    ? Math.round(rawWc.midY)
    : Math.round((minY + maxY) * 0.5);
  const roadBotY = Number.isFinite(rawWc.roadBotY)
    ? Math.max(maxY + 4, Math.round(rawWc.roadBotY))
    : 686;

  const walkableCauseway = {
    zoneWidth,
    roadTopY,
    minY,
    midY,
    maxY,
    roadBotY
  };

  const rawZones = Array.isArray(rawPack.zones) ? rawPack.zones : [];
  const rawZoneCount = Number.isFinite(rawPack.zoneCount)
    ? Math.round(rawPack.zoneCount)
    : rawZones.length || 4;
  const zoneCount = Math.max(1, Math.min(4, rawZoneCount));
  const worldWidth =
    Number.isFinite(rawPack.worldWidth) && rawPack.worldWidth >= zoneWidth
      ? Math.round(rawPack.worldWidth)
      : zoneCount * zoneWidth;

  // Support optional top-level `waves` array alias (`[{ zone, subWave, spawns }]` or flat spawn list)
  const topWaveBuckets = Array.from({ length: zoneCount }, () => [[], []]);
  if (Array.isArray(rawPack.waves)) {
    for (let i = 0; i < rawPack.waves.length; i++) {
      const entry = rawPack.waves[i];
      if (!entry || typeof entry !== 'object') continue;
      if (Array.isArray(entry.spawns) || Array.isArray(entry.monsters)) {
        const list = entry.spawns || entry.monsters;
        const zIdx = Math.max(
          0,
          Math.min(
            zoneCount - 1,
            Number.isFinite(entry.zone) ? entry.zone | 0 : Math.floor(i / 2)
          )
        );
        const subIdx = Number.isFinite(entry.subWave)
          ? entry.subWave >= 2
            ? 1
            : Math.max(0, Math.min(1, entry.subWave | 0))
          : i % 2;
        topWaveBuckets[zIdx][subIdx].push(...list);
      } else {
        const sx = Number.isFinite(entry.x) ? entry.x : 720;
        const zIdx = Math.max(
          0,
          Math.min(
            zoneCount - 1,
            Number.isFinite(entry.zone) ? entry.zone | 0 : Math.floor(sx / zoneWidth)
          )
        );
        const localX = sx - zIdx * zoneWidth;
        const subIdx = Number.isFinite(entry.subWave)
          ? entry.subWave >= 2
            ? 1
            : Math.max(0, Math.min(1, entry.subWave | 0))
          : localX >= zoneWidth * 0.5
            ? 1
            : 0;
        topWaveBuckets[zIdx][subIdx].push(entry);
      }
    }
  }

  const zones = [];
  for (let zi = 0; zi < zoneCount; zi++) {
    const rz = rawZones[zi] && typeof rawZones[zi] === 'object' ? rawZones[zi] : {};
    const defMeta = ZONE_DEFAULT_META[Math.min(3, zi)];
    const zMinX = Number.isFinite(rz.minX) ? Math.round(rz.minX) : zi * zoneWidth;
    const zMaxX = Number.isFinite(rz.maxX)
      ? Math.round(rz.maxX)
      : zi === zoneCount - 1
        ? worldWidth
        : (zi + 1) * zoneWidth;
    const zSpan = Math.max(800, zMaxX - zMinX);
    const biome = sanitizeCampaignText(rz.biome || rz.stageId, defMeta.biome, 24).toLowerCase();
    const stageId = sanitizeCampaignText(rz.stageId || rz.biome, defMeta.stageId, 24).toLowerCase();
    const bloomPalette = sanitizeCampaignText(
      rz.bloomPalette,
      defMeta.bloomPalette,
      16
    ).toLowerCase();

    const rawEmissives = Array.isArray(rz.emissiveAnchors) ? rz.emissiveAnchors : [];
    const emissiveAnchors = rawEmissives
      .filter((em) => em && typeof em === 'object' && Number.isFinite(em.x))
      .map((em, ei) => ({
        id: sanitizeCampaignText(em.id, `z${zi}_em_${ei}`, 48),
        mode: em.mode === 'prism' || em.mode === 'moonwell' ? em.mode : 'brazier',
        x: Math.round(em.x),
        artY: Number.isFinite(em.artY) ? Math.round(em.artY) : 214,
        paletteKey: sanitizeCampaignText(em.paletteKey, bloomPalette, 16).toLowerCase(),
        tierSize: em.tierSize === 3 ? 3 : 2,
        vfxRow: Number.isFinite(em.vfxRow) ? Math.max(0, Math.min(11, em.vfxRow | 0)) : 0,
        worldW: Number.isFinite(em.worldW) && em.worldW > 0 ? Math.round(em.worldW) : 156,
        worldH: Number.isFinite(em.worldH) && em.worldH > 0 ? Math.round(em.worldH) : 164
      }));

    const rawW0 = Array.isArray(rz.subWave0)
      ? rz.subWave0
      : Array.isArray(rz.waves?.subWave0)
        ? rz.waves.subWave0
        : Array.isArray(rz.waves?.[0])
          ? rz.waves[0]
          : topWaveBuckets[zi][0];
    const rawW1 = Array.isArray(rz.subWave1)
      ? rz.subWave1
      : Array.isArray(rz.waves?.subWave1)
        ? rz.waves.subWave1
        : Array.isArray(rz.waves?.[1])
          ? rz.waves[1]
          : topWaveBuckets[zi][1];

    const subWave0 = rawW0
      .map((s, si) =>
        normalizeMonsterSpawnSpec(s, zi, 0, si, zMinX, zMaxX, minY, maxY, midY)
      )
      .filter(Boolean);
    const subWave1 = rawW1
      .map((s, si) =>
        normalizeMonsterSpawnSpec(s, zi, 1, si, zMinX, zMaxX, minY, maxY, midY)
      )
      .filter(Boolean);

    zones.push({
      index: zi,
      id: sanitizeCampaignText(rz.id, defMeta.id, 36),
      stageId,
      biome,
      bloomPalette,
      title: sanitizeCampaignText(rz.title, defMeta.title, 64),
      minX: zMinX,
      maxX: zMaxX,
      triggerX: Number.isFinite(rz.triggerX)
        ? Math.round(rz.triggerX)
        : zi === 0
          ? 0
          : zMinX + 140,
      midTriggerX: Number.isFinite(rz.midTriggerX)
        ? Math.round(rz.midTriggerX)
        : zMinX + Math.round(zSpan * 0.558),
      sub1LockMinX: Number.isFinite(rz.sub1LockMinX)
        ? Math.round(rz.sub1LockMinX)
        : zi === 0
          ? 80
          : zMinX + 20,
      sub1LockMaxX: Number.isFinite(rz.sub1LockMaxX)
        ? Math.round(rz.sub1LockMaxX)
        : zMinX + Math.round(zSpan * 0.508),
      lockMinX: Number.isFinite(rz.lockMinX)
        ? Math.round(rz.lockMinX)
        : zMinX + Math.round(zSpan * 0.5),
      lockMaxX: Number.isFinite(rz.lockMaxX)
        ? Math.round(rz.lockMaxX)
        : zMaxX - (zi === zoneCount - 1 ? 80 : 40),
      isBossZone: rz.isBossZone !== undefined ? Boolean(rz.isBossZone) : zi === zoneCount - 1,
      customPanoramas:
        rz.customPanoramas && typeof rz.customPanoramas === 'object'
          ? {
              vistaPng: rz.customPanoramas.vistaPng || null,
              archPng: rz.customPanoramas.archPng || null,
              floorPng: rz.customPanoramas.floorPng || null
            }
          : { vistaPng: null, archPng: null, floorPng: null },
      emissiveAnchors,
      subWave0,
      subWave1
    });
  }

  const rawPropsSource = Array.isArray(rawPack.props)
    ? rawPack.props
    : Array.isArray(rawPack.destructibles)
      ? rawPack.destructibles
      : [];
  const props = rawPropsSource
    .filter((p) => p && typeof p === 'object')
    .map((p, pi) => {
      const px = Math.max(
        90,
        Math.min(worldWidth - 90, Number.isFinite(p.x) ? Math.round(p.x) : 420 + pi * 420)
      );
      const pGy = Math.max(
        minY + 4,
        Math.min(maxY - 4, Number.isFinite(p.groundY) ? Math.round(p.groundY) : midY)
      );
      const pZone = Number.isFinite(p.zone)
        ? Math.max(0, Math.min(zoneCount - 1, p.zone | 0))
        : Math.max(0, Math.min(zoneCount - 1, Math.floor(px / zoneWidth)));
      const dropType =
        p.dropType === 'hp' ||
        p.dropType === 'ember' ||
        p.dropType === 'relic' ||
        p.dropType === 'mana' ||
        p.dropType === 'ult'
          ? p.dropType
          : null;
      const hazardType =
        p.hazardType === 'explosive_censer' ||
        p.hazardType === 'spore_pod' ||
        p.hazardType === 'cursed_pylon'
          ? p.hazardType
          : null;
      return {
        id: sanitizeCampaignText(p.id, `prop_${pi}`, 48),
        zone: pZone,
        kind: sanitizeCampaignText(p.kind, 'eclipse_brazier', 40),
        x: px,
        groundY: pGy,
        dropType,
        hazardType,
        bonusDrop: p.bonusDrop ?? null,
        isArtifact: Boolean(p.isArtifact),
        maxHp: Number.isFinite(p.maxHp) && p.maxHp > 0 ? Math.round(p.maxHp) : null,
        ultAmt: Number.isFinite(p.ultAmt) && p.ultAmt > 0 ? Math.round(p.ultAmt) : 20,
        relicAmt: Number.isFinite(p.relicAmt) && p.relicAmt > 0 ? Math.round(p.relicAmt) : 14
      };
    });

  const rawBoss =
    rawPack.finalBoss && typeof rawPack.finalBoss === 'object'
      ? rawPack.finalBoss
      : rawPack.boss && typeof rawPack.boss === 'object'
        ? rawPack.boss
        : null;
  const finalBoss = {
    enabled: rawBoss ? rawBoss.enabled !== false : true,
    kind: 'archfiend',
    name: sanitizeCampaignText(rawBoss?.name, 'BEHEMOTH MALPHAS', 56),
    maxHp:
      Number.isFinite(rawBoss?.maxHp) && rawBoss.maxHp > 0
        ? Math.round(rawBoss.maxHp)
        : 11800,
    anchorX: Number.isFinite(rawBoss?.anchorX)
      ? Math.max(960, Math.min(worldWidth - 120, Math.round(rawBoss.anchorX)))
      : worldWidth - 265,
    groundY: Number.isFinite(rawBoss?.groundY)
      ? Math.max(minY + 12, Math.min(maxY - 12, Math.round(rawBoss.groundY)))
      : midY
  };

  const rawCustomPanos =
    rawPack.customPanoramas && typeof rawPack.customPanoramas === 'object'
      ? rawPack.customPanoramas
      : {};
  const customPanoramas = {
    vistaPano: rawCustomPanos.vistaPano || null,
    archPano: rawCustomPanos.archPano || null,
    floorPano: rawCustomPanos.floorPano || null
  };

  return {
    schemaVersion: sanitizeCampaignText(rawPack.schemaVersion, '1.0.0', 16),
    packId,
    title: sanitizeCampaignText(rawPack.title, packId.toUpperCase().replace(/_/g, ' '), 72),
    subtitle: sanitizeCampaignText(
      rawPack.subtitle,
      `${zoneCount}-REALM CUSTOM ADVENTURE STAGE PACK`,
      96
    ),
    author: sanitizeCampaignText(rawPack.author, 'Arcane Pixel Studio', 48),
    version: sanitizeCampaignText(rawPack.version, '1.0.0', 16),
    zoneCount,
    worldWidth,
    walkableCauseway,
    customPanoramas,
    zones,
    props,
    finalBoss
  };
}

export const ADVENTURE_ZONES = [
  {
    index: 0,
    id: 'outskirts',
    stageId: 'cathedral',
    title: 'ZONE I • ECLIPSE OUTSKIRTS',
    minX: 0,
    maxX: 2400,
    triggerX: 0,
    midTriggerX: 1340,
    sub1LockMinX: 80,
    sub1LockMaxX: 1220,
    lockMinX: 1200,
    lockMaxX: 2360
  },
  {
    index: 1,
    id: 'causeway',
    stageId: 'sylvan',
    title: 'ZONE II • CURSED STARWOOD',
    minX: 2400,
    maxX: 4800,
    triggerX: 2540,
    midTriggerX: 3740,
    sub1LockMinX: 2420,
    sub1LockMaxX: 3580,
    lockMinX: 3600,
    lockMaxX: 4760
  },
  {
    index: 2,
    id: 'stronghold',
    stageId: 'boneyard',
    title: 'ZONE III • ABYSSAL BONE-GATE',
    minX: 4800,
    maxX: 7200,
    triggerX: 4940,
    midTriggerX: 6140,
    sub1LockMinX: 4820,
    sub1LockMaxX: 5980,
    lockMinX: 6000,
    lockMaxX: 7160
  },
  {
    index: 3,
    id: 'blackpit',
    stageId: 'clocktower',
    title: 'ZONE IV • THRONE OF THE BLACK PIT',
    minX: 7200,
    maxX: 9600,
    triggerX: 7340,
    midTriggerX: 8520,
    sub1LockMinX: 7220,
    sub1LockMaxX: 8360,
    lockMinX: 8380,
    lockMaxX: 9520,
    isBossZone: true
  }
];

/**
 * Marvel-Arcade 2.5D Beat-'Em-Up Adventure Campaign Coordinator:
 * - 9600px continuous seamless 4-Zone 3D stage (`X: 80..9520`, `groundY: 442..680`) with 8 staged
 *   wave encounters, `"GO!"` prompts, HD-2D RPG pickups (`HP`, `SOUL EMBER`, `ASTRAL RELIC`),
 *   3-Branch Skill Tree leveling, Dedicated 11-Hero 2.5D Adventure Skill Sets, and a Giant Right-Side Colossal Boss (`BEHEMOTH MALPHAS`).
 */
export class AdventureManager {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.autoPlay = false;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this._hudStripRect = null;

    this.progression = new AdventureProgression(this);
    this.skillSets = new AdventureSkillSets(this);
    this.destructibles = new AdventureDestructibles(this);
    this.isSkillTreeOpen = false;
    this.isRelicDraftOpen = false;
    this.relicDraftChoices = [];
    this._relicDraftMeta = { source: 'zone', zoneIdx: 0, wardenName: '' };
    this._lastRelicDraftKillCount = -1;
    this._lastPauseRelicSig = '';
    this.activeRelics = [];
    this._relicHitCounter = 0;
    this._relicMeteorCastCount = 0;
    this._relicHasteTimer = 0;
    this._relicChainArcs = [];
    this._relicDodgeMines = [];
    this._relicSkillEchoes = [];
    this._relicCounterWaves = [];
    this._relicMeteors = [];
    this._relicAegisOrbitT = 0;
    this._relicAegisZapCd = 0;
    this._inRelicProc = false;
    this._perfectDodgeSlowTimer = 0;
    this._perfectDodgeBannerTimer = 0;
    this.perfectDodgeCount = 0;

    this.difficultyTier = 'normal';
    this.progressMode = 'fresh';
    this._progressStorageOverride = null;
    this._progressSessionEligible = false;
    this._lastProgressSaveMs = 0;
    this._progressDirty = false;
    this._lastSavedProgressSig = '';
    this.activeCampaignId = DEFAULT_ADVENTURE_CAMPAIGN_ID;
    this.activeCampaignPack = null;
    this._campaignPackCache = new Map();

    this.depthMinY = ADVENTURE_DEPTH_MIN_Y;
    this.depthMaxY = ADVENTURE_DEPTH_MAX_Y;
    this.depthMidY = ADVENTURE_DEPTH_MID_Y;

    this.zoneIndex = 0;
    this.subWave = 0;
    this.subWaveDelay = 0;
    this.zonesCleared = [false, false, false, false];

    this.lockActive = false;
    this.lockMinX = 80;
    this.lockMaxX = ADVENTURE_WORLD_WIDTH - 80;

    this.goPromptActive = false;
    this.goPromptText = 'GO!';
    this.goBlinkTimer = 0;

    this.bossWarningTimer = 0;
    this._bossWarnPulseTimer = 0;
    this.bossSpawnPending = false;
    this.bossEntity = null;

    this.pickups = [];
    this.portals = [];
    this.monsterPlumes = [];
    this.monstersKilled = 0;
    this.totalWaveLabel = 'WAVE 1 / 8';
    this.score = 0;
    this.comboHits = 0;
    this.comboTimer = 0;

    // Input state (3D Keyboard WASD/Arrows + Smooth 360° Touch Analog Joystick + Right-Side Skill Cluster)
    this.heldLeft = false;
    this.heldRight = false;
    this.heldUp = false;
    this.heldDown = false;
    this.uiHeldLeft = false;
    this.uiHeldRight = false;
    this.uiHeldUp = false;
    this.uiHeldDown = false;
    this.joyX = 0;
    this.joyY = 0;
    this.joyActive = false;
    this.smoothVelX = 0;
    this.smoothVelY = 0;
    this.heldAttack = false;
    this.uiHeldAttack = false;
    this.queuedAction = null;
    this.queuedActionTimer = 0;
    this.comboResetTimer = 0;
    this._comboLockTarget = null;

    // Tracked cooldown maximums for smooth 360-degree radial HUD sweeps
    this.autoCdMax = 0.52;
    this.skillCdMax = 4.5;
    this.dodgeCdMax = 1.35;
    this._renderedIconHero = null;
    this._renderedMageIconsReady = false;
    this._renderedHeroIconsReady = false;

    this._boundKeyDown = (e) => this.onKeyDown(e);
    this._boundKeyUp = (e) => this.onKeyUp(e);
    this._boundBlur = () => this.clearHeldInputs();
    this._boundPageHide = () => {
      if (this.active) this.persistHeroProgressIfEnabled({ force: true });
    };
    this._listenersAttached = false;
    this.bindDOMControls();
  }

  bindDOMControls() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;

    const lockBtn = document.getElementById('adv-btn-lock');
    if (lockBtn) {
      lockBtn._advOwner = this;
      if (!lockBtn._advLockBound && typeof lockBtn.addEventListener === 'function') {
        lockBtn._advLockBound = true;
        let lastTouchTs = 0;
        lockBtn.addEventListener(
          'touchstart',
          (e) => {
            const owner = lockBtn._advOwner;
            if (!owner) return;
            e.preventDefault?.();
            lastTouchTs = Date.now();
            if (owner.autoPlay) owner.setAutoPlay(false, false);
            owner.toggleTargetLock(true);
          },
          { passive: false }
        );
        lockBtn.addEventListener('click', () => {
          const owner = lockBtn._advOwner;
          if (!owner || Date.now() - lastTouchTs < 450) return;
          if (owner.autoPlay) owner.setAutoPlay(false, false);
          owner.toggleTargetLock(true);
        });
      }
    }

    const pauseLockBtn = document.getElementById('adv-btn-pause-lock');
    if (pauseLockBtn) {
      pauseLockBtn._advOwner = this;
      if (!pauseLockBtn._advLockBound && typeof pauseLockBtn.addEventListener === 'function') {
        pauseLockBtn._advLockBound = true;
        pauseLockBtn.addEventListener('click', () => {
          pauseLockBtn._advOwner?.toggleTargetLock(true);
        });
      }
    }

    const canvas = document.getElementById('arena-canvas');
    if (canvas) {
      canvas._advOwner = this;
      if (!canvas._advStripBound && typeof canvas.addEventListener === 'function') {
        canvas._advStripBound = true;
        canvas.addEventListener('pointerdown', (e) => {
          const owner = canvas._advOwner;
          if (
            !owner ||
            !owner.active ||
            owner.game.isLandingOpen ||
            owner.game.isMatchOver ||
            owner.game.isPaused ||
            owner.isSkillTreeOpen ||
            owner.isRelicDraftOpen ||
            !owner._hudStripRect
          ) {
            return;
          }
          const renderer = owner.game.renderer;
          const cw = renderer?.width || canvas.width || 1280;
          const ch = renderer?.height || canvas.height || 720;
          const rect =
            typeof canvas.getBoundingClientRect === 'function'
              ? canvas.getBoundingClientRect()
              : null;
          let px = e.offsetX ?? e.clientX ?? -1;
          let py = e.offsetY ?? e.clientY ?? -1;
          if (rect && rect.width > 0 && rect.height > 0 && typeof e.clientX === 'number') {
            const isCssRotated = Boolean(
              document.documentElement?.classList?.contains?.('is-css-rotated-landscape')
            );
            if (isCssRotated) {
              px = ((e.clientY - rect.top) / rect.height) * cw;
              py = ((rect.right - e.clientX) / rect.width) * ch;
            } else {
              px = ((e.clientX - rect.left) / rect.width) * cw;
              py = ((e.clientY - rect.top) / rect.height) * ch;
            }
          }
          const sr = owner._hudStripRect;
          if (px >= sr.x - 4 && px <= sr.x + sr.w + 4 && py >= sr.y - 4 && py <= sr.y + sr.h + 4) {
            e.preventDefault?.();
            owner.openSkillTree(true);
          }
        });
      }
    }
  }

  attachListeners() {
    this.bindDOMControls();
    if (this._listenersAttached || typeof window === 'undefined') return;
    this._listenersAttached = true;
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    window.addEventListener('blur', this._boundBlur);
    window.addEventListener('pagehide', this._boundPageHide);
  }

  clearHeldInputs() {
    this.heldLeft = false;
    this.heldRight = false;
    this.heldUp = false;
    this.heldDown = false;
    this.uiHeldLeft = false;
    this.uiHeldRight = false;
    this.uiHeldUp = false;
    this.uiHeldDown = false;
    this.heldAttack = false;
    this.uiHeldAttack = false;
    this.smoothVelX = 0;
    this.smoothVelY = 0;
    this.queuedAction = null;
    this.queuedActionTimer = 0;
    this._comboLockTarget = null;
    this.setJoystickVector(0, 0, false);
  }

  onKeyDown(e) {
    if (!this.active || this.game.isLandingOpen || this.game.isMatchOver) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    if (this.isRelicDraftOpen) {
      if (code === 'Digit1' || code === 'Numpad1') {
        this.selectRelicBoon(0, true);
        e.preventDefault();
      } else if (code === 'Digit2' || code === 'Numpad2') {
        this.selectRelicBoon(1, true);
        e.preventDefault();
      } else if (code === 'Digit3' || code === 'Numpad3') {
        this.selectRelicBoon(2, true);
        e.preventDefault();
      }
      return;
    }
    if (code === 'KeyT') {
      if (this.game.isPaused) {
        this.game.setPaused?.(false, false);
      }
      this.toggleSkillTree(true);
      e.preventDefault();
      return;
    }
    if (code === 'Escape' && this.isSkillTreeOpen) {
      this.closeSkillTree(true);
      e.preventDefault();
      e.stopImmediatePropagation?.();
      return;
    }
    if (this.isSkillTreeOpen || this.game.isPaused) return;

    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.heldLeft = true;
      this.syncJoystickKnobUI();
      e.preventDefault();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.heldRight = true;
      this.syncJoystickKnobUI();
      e.preventDefault();
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      this.heldUp = true;
      this.syncJoystickKnobUI();
      e.preventDefault();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.heldDown = true;
      this.syncJoystickKnobUI();
      e.preventDefault();
    } else if (code === 'KeyJ') {
      this.heldAttack = true;
      this.triggerAction('attack');
      e.preventDefault();
    } else if (code === 'KeyK' || code === 'KeyX') {
      this.triggerAction('skill');
      e.preventDefault();
    } else if (
      code === 'KeyL' ||
      code === 'KeyC' ||
      code === 'Space' ||
      code === 'ShiftLeft' ||
      code === 'ShiftRight'
    ) {
      this.triggerAction('dodge');
      e.preventDefault();
    } else if (code === 'KeyU' || code === 'KeyQ') {
      this.triggerAction('overdrive');
      e.preventDefault();
    } else if (code === 'KeyI' || code === 'KeyE') {
      this.triggerAction('ultimate');
      e.preventDefault();
    } else if (code === 'KeyP') {
      this.toggleAutoPlay(true);
      e.preventDefault();
    } else if (!this.autoPlay && (code === 'Tab' || code === 'KeyR')) {
      this.toggleTargetLock(true);
      e.preventDefault();
    }
  }

  onKeyUp(e) {
    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.heldLeft = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.heldRight = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      this.heldUp = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.heldDown = false;
      this.syncJoystickKnobUI();
    } else if (code === 'KeyJ') {
      this.heldAttack = false;
    }
  }

  toggleSkillTree(playSound = true) {
    if (this.isSkillTreeOpen) {
      this.closeSkillTree(playSound);
    } else {
      this.openSkillTree(playSound);
    }
  }

  openSkillTree(playSound = true) {
    if (!this.active || this.game.isLandingOpen || this.game.isMatchOver) return;
    this.isSkillTreeOpen = true;
    this.clearHeldInputs();
    this.renderSkillTreeModal();
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('adv-skill-tree-modal')?.classList?.remove('hidden');
    }
    if (playSound && this.game.audio) {
      this.game.audio.play('clock_gear', this.game.leftFighter?.x || 600);
    }
  }

  closeSkillTree(playSound = true) {
    this.isSkillTreeOpen = false;
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('adv-skill-tree-modal')?.classList?.add('hidden');
    }
    if (playSound && this.game.audio) {
      this.game.audio.play('clock_gear', this.game.leftFighter?.x || 600);
    }
    this.syncControlDeckUI();
  }

  refundSkillTree(playSound = true) {
    const player = this.game.leftFighter;
    const refunded = this.progression.refundAllSkillPoints(player);
    if (refunded && playSound && this.game.audio) {
      this.game.audio.play('reflect', player?.x || 600);
    }
    this.renderSkillTreeModal();
    this.syncControlDeckUI();
    this.game.updateHUD?.();
  }

  setProgressMode(mode, storageOverride = undefined) {
    this.progressMode = normalizeAdventureProgressMode(mode, 'keep');
    if (storageOverride !== undefined) {
      this._progressStorageOverride = storageOverride;
    }
    return this.progressMode;
  }

  getProgressMode() {
    return normalizeAdventureProgressMode(this.progressMode, 'fresh');
  }

  persistHeroProgressIfEnabled(opts = {}) {
    const force = Boolean(opts && opts.force);
    if (this.progressMode !== 'keep' || !this._progressSessionEligible) return false;
    if (this.game?.simMode || this.game?.testModeUnlimitedHp || this.autoPlay) return false;
    const heroId = this.game?.leftFighter?.heroId;
    if (!heroId) return false;

    const snap = this.progression.exportProgressSnapshot();
    const spentRanks = Object.values(snap.ranks || {}).reduce((acc, v) => acc + (v || 0), 0);
    const isEmptyLv1 = snap.level <= 1 && snap.xp <= 0 && spentRanks === 0;
    if (isEmptyLv1 && !this._lastSavedProgressSig) {
      if (!loadAdventureHeroProgress(heroId, this._progressStorageOverride)) {
        this._progressDirty = false;
        return false;
      }
    }

    const sig = JSON.stringify(snap);
    if (!force && sig === this._lastSavedProgressSig) {
      this._progressDirty = false;
      return false;
    }

    const now = Date.now();
    if (!force && this._lastProgressSaveMs > 0 && now - this._lastProgressSaveMs < 1500) {
      this._progressDirty = true;
      return false;
    }

    this.progression.saveToStorage(heroId, this._progressStorageOverride);
    this._lastProgressSaveMs = now;
    this._lastSavedProgressSig = sig;
    this._progressDirty = false;
    this.game?.syncAdventureClearMedalsUI?.();
    return true;
  }

  flushPendingHeroProgressSave(force = false) {
    if (!this._progressDirty && !force) return false;
    return this.persistHeroProgressIfEnabled({ force });
  }

  resetHeroLevelToLv1(playSound = true) {
    const player = this.game?.leftFighter || null;
    const heroId = player?.heroId || this.game?.slot1Hero || null;
    this.progression.resetChampionToLv1(heroId, player, this._progressStorageOverride);
    this._progressDirty = false;
    this._lastSavedProgressSig = '';
    this._lastProgressSaveMs = Date.now();
    if (playSound && this.game?.audio) {
      this.game.audio.play('reflect', player?.x || 600);
    }
    this.renderSkillTreeModal();
    this.syncControlDeckUI();
    this.game?.syncAdventureClearMedalsUI?.();
    this.game?.updateHUD?.();
    return true;
  }

  setDifficultyTier(tierId) {
    this.difficultyTier = normalizeAdventureDifficultyId(tierId);
    this._lastPauseRelicSig = '';
    return this.getDifficultyConfig();
  }

  getDifficultyConfig() {
    return (
      ADVENTURE_DIFFICULTY_TIERS[this.difficultyTier] ||
      ADVENTURE_DIFFICULTY_TIERS.normal
    );
  }

  hasRelic(relicId) {
    if (!relicId || !Array.isArray(this.activeRelics)) return false;
    for (let i = 0; i < this.activeRelics.length; i++) {
      if (this.activeRelics[i]?.id === relicId) return true;
    }
    return false;
  }

  drawRelicIconCanvas(ctx, relicId, accentHex = '#facc15') {
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 32, 32);
    // Darkforge octagonal plaque background (100% stepped fillRect, 0 arc/ellipse)
    ctx.fillStyle = '#070a14';
    ctx.fillRect(4, 2, 24, 28);
    ctx.fillRect(2, 4, 28, 24);
    ctx.fillStyle = '#151c2e';
    ctx.fillRect(5, 4, 22, 24);
    ctx.fillRect(4, 5, 24, 22);
    // Accent corner rivets
    ctx.fillStyle = accentHex;
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillRect(26, 4, 2, 2);
    ctx.fillRect(4, 26, 2, 2);
    ctx.fillRect(26, 26, 2, 2);

    const px = (x, y, w, h, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
    };

    if (relicId === 'chain_lightning') {
      // Jagged storm bolt + spark pips
      px(15, 5, 6, 3, '#0d0f1c');
      px(12, 8, 8, 4, '#0d0f1c');
      px(9, 12, 13, 4, '#0d0f1c');
      px(13, 16, 8, 4, '#0d0f1c');
      px(11, 20, 7, 7, '#0d0f1c');
      px(16, 6, 4, 3, '#38bdf8');
      px(13, 9, 5, 3, '#7dd3fc');
      px(10, 12, 11, 3, '#e0f2fe');
      px(15, 15, 5, 4, '#38bdf8');
      px(12, 19, 5, 4, '#7dd3fc');
      px(11, 23, 3, 3, '#ffffff');
      px(6, 9, 2, 2, '#7dd3fc');
      px(24, 21, 2, 2, '#7dd3fc');
    } else if (relicId === 'exploding_dodge') {
      // Blazing solar mirage burst + ember trail
      px(6, 15, 6, 2, '#fb923c');
      px(4, 18, 5, 2, '#f97316');
      px(13, 7, 6, 18, '#0d0f1c');
      px(9, 11, 14, 10, '#0d0f1c');
      px(15, 8, 2, 16, '#f97316');
      px(10, 14, 12, 4, '#f97316');
      px(12, 11, 8, 10, '#fb923c');
      px(14, 13, 4, 6, '#fef08a');
      px(15, 14, 2, 4, '#ffffff');
      px(22, 8, 2, 2, '#fde047');
      px(23, 21, 2, 2, '#fb923c');
    } else if (relicId === 'twin_spirit_echo') {
      // Twin concentric astral diamonds (offset spectral echo)
      px(11, 8, 8, 14, '#7e22ce');
      px(9, 11, 12, 8, '#a855f7');
      px(12, 11, 6, 8, '#151c2e');
      px(16, 6, 8, 16, '#0d0f1c');
      px(14, 9, 12, 10, '#0d0f1c');
      px(17, 7, 6, 14, '#c084fc');
      px(15, 10, 10, 8, '#e879f9');
      px(18, 11, 4, 6, '#f5d0fe');
      px(19, 12, 2, 4, '#ffffff');
    } else if (relicId === 'executioner_detonation') {
      // Crimson downward execution blade + shockwave shards
      px(13, 5, 6, 17, '#0d0f1c');
      px(10, 11, 12, 4, '#0d0f1c');
      px(14, 6, 4, 4, '#facc15');
      px(11, 12, 10, 2, '#facc15');
      px(14, 14, 4, 8, '#f43f5e');
      px(15, 14, 2, 9, '#fda4af');
      px(15, 23, 2, 2, '#ffffff');
      px(7, 21, 3, 2, '#f43f5e');
      px(22, 21, 3, 2, '#f43f5e');
      px(9, 25, 4, 2, '#fb7185');
      px(19, 25, 4, 2, '#fb7185');
    } else if (relicId === 'orbiting_aegis_runes') {
      // Central shield crest flanked by twin orbiting golden-cyan runes
      px(11, 8, 10, 14, '#0d0f1c');
      px(13, 22, 6, 3, '#0d0f1c');
      px(12, 9, 8, 12, '#d97706');
      px(14, 21, 4, 3, '#d97706');
      px(13, 10, 6, 10, '#facc15');
      px(15, 12, 2, 6, '#fef9c3');
      // Twin orbiting runes
      px(5, 11, 4, 4, '#38bdf8');
      px(6, 12, 2, 2, '#ffffff');
      px(23, 17, 4, 4, '#38bdf8');
      px(24, 18, 2, 2, '#ffffff');
    } else if (relicId === 'frostbite_shatter') {
      // Faceted glacial snowflake crystal + shatter shards
      px(14, 5, 4, 22, '#0d0f1c');
      px(5, 14, 22, 4, '#0d0f1c');
      px(9, 9, 14, 14, '#0d0f1c');
      px(15, 6, 2, 20, '#38bdf8');
      px(6, 15, 20, 2, '#38bdf8');
      px(10, 10, 12, 12, '#0284c7');
      px(12, 12, 8, 8, '#67e8f9');
      px(14, 14, 4, 4, '#ffffff');
      px(8, 8, 3, 3, '#67e8f9');
      px(21, 8, 3, 3, '#67e8f9');
      px(8, 21, 3, 3, '#67e8f9');
      px(21, 21, 3, 3, '#67e8f9');
    } else if (relicId === 'phantom_counter_wave') {
      // Piercing forward astral crescent shockwave + speed trails
      px(6, 11, 6, 2, '#0284c7');
      px(5, 15, 8, 2, '#38bdf8');
      px(6, 19, 6, 2, '#0284c7');
      px(14, 6, 7, 20, '#0d0f1c');
      px(18, 9, 8, 14, '#0d0f1c');
      px(15, 7, 4, 3, '#38bdf8');
      px(18, 9, 5, 4, '#67e8f9');
      px(20, 13, 5, 6, '#e0f2fe');
      px(18, 19, 5, 4, '#67e8f9');
      px(15, 22, 4, 3, '#38bdf8');
      px(21, 14, 3, 4, '#ffffff');
      px(12, 14, 3, 4, '#fde047');
    } else if (relicId === 'guard_break_siphon') {
      // Cracked golden shield splitting open with rising emerald siphon core
      px(7, 8, 8, 15, '#0d0f1c');
      px(17, 8, 8, 15, '#0d0f1c');
      px(8, 9, 6, 11, '#ca8a04');
      px(18, 9, 6, 11, '#ca8a04');
      px(9, 10, 4, 9, '#facc15');
      px(19, 10, 4, 9, '#facc15');
      px(10, 20, 4, 2, '#d97706');
      px(18, 20, 4, 2, '#d97706');
      // Rising emerald vitality beam between split halves
      px(14, 6, 4, 20, '#10b981');
      px(15, 7, 2, 18, '#4ade80');
      px(15, 11, 2, 6, '#ecfdf5');
      px(13, 9, 6, 2, '#6ee7b7');
    } else if (relicId === 'meteor_calldown') {
      // Blazing diagonal pixel solar meteor + fire tail
      px(18, 5, 7, 3, '#fb923c');
      px(15, 7, 7, 4, '#f97316');
      px(12, 10, 8, 4, '#fde047');
      px(8, 13, 13, 13, '#0d0f1c');
      px(9, 14, 11, 11, '#ea580c');
      px(10, 15, 9, 9, '#f97316');
      px(11, 16, 6, 6, '#facc15');
      px(12, 17, 4, 4, '#fef9c3');
      px(13, 18, 2, 2, '#ffffff');
      px(6, 23, 3, 2, '#fb923c');
      px(21, 22, 3, 2, '#fde047');
    } else if (relicId === 'overdrive_surge') {
      // Radiant crowned solar surge core with 4-way overdrive spikes
      px(14, 4, 4, 24, '#0d0f1c');
      px(4, 14, 24, 4, '#0d0f1c');
      px(9, 9, 14, 14, '#0d0f1c');
      px(15, 5, 2, 22, '#f59e0b');
      px(5, 15, 22, 2, '#f59e0b');
      px(10, 10, 12, 12, '#f59e0b');
      px(11, 11, 10, 10, '#fbbf24');
      px(13, 13, 6, 6, '#fef08a');
      px(14, 14, 4, 4, '#ffffff');
      px(8, 8, 2, 2, '#fde047');
      px(22, 8, 2, 2, '#fde047');
      px(8, 22, 2, 2, '#fde047');
      px(22, 22, 2, 2, '#fde047');
    } else if (relicId === 'haste_momentum') {
      // Twin aerodynamic teal wind chevrons + speed streaks
      px(5, 11, 5, 2, '#0d9488');
      px(4, 15, 6, 2, '#2dd4bf');
      px(5, 19, 5, 2, '#0d9488');
      // First chevron
      px(10, 8, 4, 3, '#0d9488');
      px(12, 11, 4, 3, '#2dd4bf');
      px(14, 14, 4, 4, '#99f6e4');
      px(12, 18, 4, 3, '#2dd4bf');
      px(10, 21, 4, 3, '#0d9488');
      // Lead bright chevron
      px(18, 8, 4, 3, '#2dd4bf');
      px(20, 11, 4, 3, '#5eead4');
      px(22, 14, 4, 4, '#ffffff');
      px(20, 18, 4, 3, '#5eead4');
      px(18, 21, 4, 3, '#2dd4bf');
    } else {
      // Soul-Siphon Cleave: emerald crescent + rising vitality droplets
      px(9, 8, 14, 14, '#0d0f1c');
      px(10, 9, 10, 3, '#10b981');
      px(16, 10, 5, 10, '#34d399');
      px(10, 19, 10, 3, '#10b981');
      px(18, 12, 2, 6, '#a7f3d0');
      px(9, 14, 4, 4, '#34d399');
      px(10, 15, 2, 2, '#ecfdf5');
      px(22, 7, 2, 3, '#6ee7b7');
      px(21, 22, 2, 3, '#6ee7b7');
    }
  }

  openRelicDraft(zoneIdx = this.zoneIndex, meta = {}) {
    if (!this.active || this.game.isLandingOpen || this.game.isMatchOver) return false;
    if (this.activeRelics.length >= ADVENTURE_MAX_RELICS) return false;
    const ownedIds = new Set(this.activeRelics.map((r) => r.id));
    const pool = ADVENTURE_RELIC_BOONS.filter((b) => !ownedIds.has(b.id));
    if (!pool.length) return false;

    // Fisher-Yates shuffle on a copy so every run offers fresh synergistic 3-card drafts
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    this.relicDraftChoices = shuffled.slice(0, Math.min(3, shuffled.length));
    this._relicDraftMeta = {
      source: meta?.source === 'warden' ? 'warden' : 'zone',
      zoneIdx: zoneIdx | 0,
      wardenName: meta?.wardenName ? String(meta.wardenName).toUpperCase() : ''
    };
    this._lastRelicDraftKillCount = this.monstersKilled;
    this.isRelicDraftOpen = true;
    this.clearHeldInputs();
    this.renderRelicDraftModal(zoneIdx);
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('adv-relic-draft-modal')?.classList?.remove('hidden');
    }
    if (this.game.audio) {
      this.game.audio.play('holy_hit', this.game.leftFighter?.x || 600);
    }
    return true;
  }

  renderRelicDraftModal(zoneIdx = this.zoneIndex) {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const meta = this._relicDraftMeta || { source: 'zone', zoneIdx, wardenName: '' };
    const eyebrowEl = document.getElementById('adv-relic-draft-eyebrow');
    if (eyebrowEl) {
      eyebrowEl.textContent = meta.source === 'warden' ? 'WARDEN SLAYER BOON' : 'ZONE CLEAR BOON';
    }
    const subEl = document.getElementById('adv-relic-draft-sub');
    if (subEl) {
      const slotText = `(${this.activeRelics.length + 1} / ${ADVENTURE_MAX_RELICS})`;
      subEl.textContent =
        meta.source === 'warden'
          ? `${meta.wardenName || 'REALM WARDEN'} VANQUISHED • CHOOSE 1 SOVEREIGN RELIC BOON ${slotText}`
          : `ZONE ${Math.max(1, (zoneIdx | 0) + 1)} CLEARED • CHOOSE 1 SOVEREIGN RELIC BOON ${slotText}`;
    }
    const container = document.getElementById('adv-relic-cards');
    if (!container || typeof document.createElement !== 'function') return;
    container.innerHTML = '';

    for (let i = 0; i < this.relicDraftChoices.length; i++) {
      const boon = this.relicDraftChoices[i];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'adv-relic-card';
      card.dataset.relicId = boon.id;
      if (card.style?.setProperty) {
        card.style.setProperty('--relic-accent', boon.accentHex);
      }

      const keyBadge = document.createElement('span');
      keyBadge.className = 'adv-relic-key';
      keyBadge.textContent = `[${i + 1}]`;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'adv-relic-icon-wrap';
      const cvs = document.createElement('canvas');
      cvs.width = 32;
      cvs.height = 32;
      cvs.className = 'adv-relic-icon-canvas';
      if (typeof cvs.getContext === 'function') {
        this.drawRelicIconCanvas(cvs.getContext('2d'), boon.id, boon.accentHex);
      }
      iconWrap.appendChild(cvs);

      const titleEl = document.createElement('div');
      titleEl.className = 'adv-relic-name';
      titleEl.textContent = boon.name;

      const tagEl = document.createElement('div');
      tagEl.className = 'adv-relic-tag';
      tagEl.textContent = boon.shortTag;

      const descEl = document.createElement('p');
      descEl.className = 'adv-relic-desc';
      descEl.textContent = boon.desc;

      const ctaEl = document.createElement('span');
      ctaEl.className = 'adv-relic-cta';
      ctaEl.textContent = 'CLAIM BOON';

      card.appendChild(keyBadge);
      card.appendChild(iconWrap);
      card.appendChild(titleEl);
      card.appendChild(tagEl);
      card.appendChild(descEl);
      card.appendChild(ctaEl);
      card.addEventListener('click', () => {
        this.selectRelicBoon(i, true);
      });
      container.appendChild(card);
    }
  }

  selectRelicBoon(indexOrId, playSound = true) {
    if (!this.isRelicDraftOpen) return null;
    let chosen = null;
    if (typeof indexOrId === 'number') {
      chosen = this.relicDraftChoices[indexOrId] || null;
    } else if (typeof indexOrId === 'string') {
      chosen =
        this.relicDraftChoices.find((b) => b.id === indexOrId) ||
        ADVENTURE_RELIC_BOONS.find((b) => b.id === indexOrId) ||
        null;
    }
    if (!chosen) return null;
    if (!this.hasRelic(chosen.id) && this.activeRelics.length < ADVENTURE_MAX_RELICS) {
      this.activeRelics.push(chosen);
    }
    this.isRelicDraftOpen = false;
    this.relicDraftChoices = [];
    this._lastRelicDraftKillCount = this.monstersKilled;
    this._lastPauseRelicSig = '';
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('adv-relic-draft-modal')?.classList?.add('hidden');
    }
    const player = this.game.leftFighter;
    if (playSound && this.game.audio) {
      this.game.audio.play('reflect', player?.x || 600);
    }
    if (player && this.game.vfx) {
      this.game.vfx.spawnShockwave(player.x, player.groundY - 12, 130, chosen.accentHex, 0.34, true);
      this.game.vfx.spawnBurst(player.x, player.y - 68, 18, chosen.accentHex, 210, { upBias: 145, size: 5 });
      this.game.vfx.spawnDamageText(
        player.x,
        player.y - 160,
        0,
        true,
        `RELIC: ${chosen.shortTag}!`,
        chosen.accentHex
      );
    }
    this.renderActiveRelicsInspector();
    this.syncControlDeckUI();
    return chosen;
  }

  renderActiveRelicsInspector() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const count = this.activeRelics.length;
    const diffCfg = this.getDifficultyConfig();

    // 1. Active Relics strip inside #adv-skill-tree-modal (icon + name + full description)
    const countEl = document.getElementById('adv-st-relics-count');
    if (countEl) {
      countEl.textContent = `${count} / ${ADVENTURE_MAX_RELICS}`;
    }
    const listEl = document.getElementById('adv-st-relics-list');
    if (listEl && typeof document.createElement === 'function') {
      listEl.innerHTML = '';
      if (count === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'adv-st-relic-empty';
        emptyEl.textContent = 'NO RELICS CLAIMED YET — CLEAR A REALM OR SLAY A WARDEN TO DRAFT BOONS';
        listEl.appendChild(emptyEl);
      } else {
        for (let i = 0; i < count; i++) {
          const boon = this.activeRelics[i];
          const chip = document.createElement('div');
          chip.className = 'adv-st-relic-chip';
          chip.title = `${boon.name}: ${boon.desc}`;
          if (chip.style?.setProperty) {
            chip.style.setProperty('--relic-accent', boon.accentHex || '#facc15');
          }
          const cvs = document.createElement('canvas');
          cvs.width = 32;
          cvs.height = 32;
          cvs.className = 'adv-st-relic-icon';
          if (typeof cvs.getContext === 'function') {
            this.drawRelicIconCanvas(cvs.getContext('2d'), boon.id, boon.accentHex);
          }
          const body = document.createElement('div');
          body.className = 'adv-st-relic-body';
          const nameEl = document.createElement('div');
          nameEl.className = 'adv-st-relic-name';
          nameEl.textContent = boon.name;
          const descEl = document.createElement('div');
          descEl.className = 'adv-st-relic-desc';
          descEl.textContent = boon.desc;
          body.appendChild(nameEl);
          body.appendChild(descEl);
          chip.appendChild(cvs);
          chip.appendChild(body);
          listEl.appendChild(chip);
        }
      }
    }

    // 2. Compact Relic & Ascension summary inside #pause-adv-section (with tooltips)
    const pauseWrap = document.getElementById('pause-adv-relics');
    if (pauseWrap && typeof document.createElement === 'function') {
      const sig = `${diffCfg.id}|${this.activeRelics.map((r) => r.id).join(',')}`;
      if (this._lastPauseRelicSig === sig && pauseWrap.childNodes?.length > 0) return;
      this._lastPauseRelicSig = sig;
      pauseWrap.innerHTML = '';

      const tierPill = document.createElement('span');
      tierPill.className = `pause-adv-tier-pill tier-${diffCfg.id}`;
      tierPill.textContent = `TIER: ${diffCfg.label}`;
      tierPill.title = `${diffCfg.label} (${diffCfg.hpMult}x HP, ${diffCfg.dmgMult}x DMG, ${diffCfg.scoreMult}x SCORE)`;
      pauseWrap.appendChild(tierPill);

      const lbl = document.createElement('span');
      lbl.className = 'pause-adv-relics-lbl';
      lbl.textContent = `RELICS (${count}/${ADVENTURE_MAX_RELICS}):`;
      pauseWrap.appendChild(lbl);

      if (count === 0) {
        const noneEl = document.createElement('span');
        noneEl.className = 'pause-adv-relic-none';
        noneEl.textContent = 'NONE CLAIMED';
        pauseWrap.appendChild(noneEl);
      } else {
        for (let i = 0; i < count; i++) {
          const boon = this.activeRelics[i];
          const pill = document.createElement('span');
          pill.className = 'pause-adv-relic-pill';
          pill.title = `${boon.name} — ${boon.desc}`;
          if (pill.style?.setProperty) {
            pill.style.setProperty('--relic-accent', boon.accentHex || '#facc15');
          }
          const miniCvs = document.createElement('canvas');
          miniCvs.width = 32;
          miniCvs.height = 32;
          miniCvs.className = 'pause-adv-relic-icon';
          if (typeof miniCvs.getContext === 'function') {
            this.drawRelicIconCanvas(miniCvs.getContext('2d'), boon.id, boon.accentHex);
          }
          const txt = document.createElement('span');
          txt.textContent = boon.shortTag;
          pill.appendChild(miniCvs);
          pill.appendChild(txt);
          pauseWrap.appendChild(pill);
        }
      }
    }
  }

  closeRelicDraft(playSound = false) {
    this.isRelicDraftOpen = false;
    this.relicDraftChoices = [];
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('adv-relic-draft-modal')?.classList?.add('hidden');
    }
    if (playSound && this.game.audio) {
      this.game.audio.play('clock_gear', this.game.leftFighter?.x || 600);
    }
  }

  renderSkillTreeModal() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const prog = this.progression;
    const stats = prog.getComputedStats();
    const player = this.game.leftFighter;

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };

    const heroTitle = player?.name ? player.name.toUpperCase() : 'CHAMPION';
    setTxt('adv-st-title', `${heroTitle} • ADVENTURE SKILL TREE`);
    setTxt('adv-st-level-badge', `LV.${prog.level}`);
    const xpPct = prog.level >= prog.maxLevel ? 100 : Math.min(100, Math.round((prog.xp / Math.max(1, prog.xpToNext)) * 100));
    const xpFill = document.getElementById('adv-st-xp-fill');
    if (xpFill?.style) xpFill.style.width = `${xpPct}%`;
    setTxt(
      'adv-st-xp-text',
      prog.level >= prog.maxLevel ? 'MAX LEVEL' : `${prog.xp} / ${prog.xpToNext} XP`
    );
    setTxt('adv-st-sp-count', `${prog.skillPoints} SKILL PT${prog.skillPoints === 1 ? '' : 'S'}`);

    const curHp = player ? Math.ceil(player.hp) : stats.maxHp;
    setTxt('adv-st-stat-hp', `${curHp} / ${stats.maxHp}`);
    setTxt(
      'adv-st-stat-atk',
      `${Math.round(stats.atkMult * 100)}% / ${Math.round(stats.skillMult * 100)}%`
    );
    setTxt(
      'adv-st-stat-spirit',
      `${Math.floor(prog.spirit)}/${prog.maxSpirit} (COST ${stats.skillSpiritCost})`
    );
    setTxt(
      'adv-st-stat-ult',
      `${Math.floor(prog.ultCharge)}% / ${Math.floor(prog.astralCharge)}%`
    );
    setTxt('adv-st-stat-ward', `${Math.round(stats.wardReduction * 100)}% DR`);

    const resetLvBtn = document.getElementById('adv-st-reset-lv');
    if (resetLvBtn) {
      const heroIdForReset = player?.heroId || this.game?.slot1Hero || null;
      const hasSavedRec = Boolean(
        heroIdForReset && loadAdventureHeroProgress(heroIdForReset, this._progressStorageOverride)
      );
      const totalSpentSp =
        prog.getBranchPointsSpent('wrath') +
        prog.getBranchPointsSpent('astral') +
        prog.getBranchPointsSpent('aegis');
      const canResetLv = prog.level > 1 || prog.xp > 0 || totalSpentSp > 0 || hasSavedRec;
      resetLvBtn.disabled = !canResetLv;
      resetLvBtn.title = hasSavedRec
        ? `Reset ${heroTitle} back to Lv.1 & clear saved KEEP LVL data`
        : `Reset ${heroTitle} back to Lv.1`;
    }

    this.renderActiveRelicsInspector();

    const grid = document.getElementById('adv-st-grid');
    if (!grid || typeof document.createElement !== 'function') return;
    grid.innerHTML = '';

    const heroKey = player?.heroId || this.game?.slot1Hero || 'mage';
    const heroTheme = getHeroSkillTreeTheme(heroKey);

    const createIconCanvas = (actionSlot, extraClass = '') => {
      const cvs = document.createElement('canvas');
      cvs.width = 64;
      cvs.height = 64;
      cvs.className = extraClass ? `adv-st-icon-canvas ${extraClass}` : 'adv-st-icon-canvas';
      if (typeof cvs.getContext === 'function') {
        const ictx = cvs.getContext('2d');
        if (ictx) {
          PixelForge.drawAdventureActionIcon(ictx, heroKey, actionSlot || 'skill', 64, 64, 0);
        }
      }
      return cvs;
    };

    const branches = [
      {
        key: 'wrath',
        title: heroTheme.branches.wrath.title,
        sub: heroTheme.branches.wrath.sub,
        iconSlot: heroTheme.branches.wrath.iconSlot
      },
      {
        key: 'astral',
        title: heroTheme.branches.astral.title,
        sub: heroTheme.branches.astral.sub,
        iconSlot: heroTheme.branches.astral.iconSlot
      },
      {
        key: 'aegis',
        title: heroTheme.branches.aegis.title,
        sub: heroTheme.branches.aegis.sub,
        iconSlot: heroTheme.branches.aegis.iconSlot
      }
    ];

    for (const b of branches) {
      const col = document.createElement('div');
      col.className = `adv-st-branch adv-st-branch-${b.key}`;

      const hdr = document.createElement('div');
      hdr.className = 'adv-st-branch-hdr';
      const hdrTitleWrap = document.createElement('span');
      hdrTitleWrap.className = 'adv-st-branch-title-wrap';
      hdrTitleWrap.appendChild(createIconCanvas(b.iconSlot, 'adv-st-branch-canvas'));
      const hdrTextBox = document.createElement('span');
      const hdrTitleSpan = document.createElement('span');
      hdrTitleSpan.textContent = b.title;
      const hdrSubSpan = document.createElement('span');
      hdrSubSpan.className = 'adv-st-branch-sub';
      hdrSubSpan.textContent = b.sub;
      hdrTextBox.appendChild(hdrTitleSpan);
      hdrTextBox.appendChild(hdrSubSpan);
      hdrTitleWrap.appendChild(hdrTextBox);
      const hdrPtsSpan = document.createElement('span');
      hdrPtsSpan.textContent = `${prog.getBranchPointsSpent(b.key)} PTS`;
      hdr.appendChild(hdrTitleWrap);
      hdr.appendChild(hdrPtsSpan);
      col.appendChild(hdr);

      const nodes = ADVENTURE_SKILL_TREE.filter((n) => n.branch === b.key);
      for (const node of nodes) {
        const rank = prog.getRank(node.id);
        const canUp = prog.canUpgradeNode(node.id);
        const branchPts = prog.getBranchPointsSpent(b.key);
        const tierLocked =
          (node.tier === 2 && branchPts < 1) || (node.tier === 3 && branchPts < 2);

        const card = document.createElement('div');
        card.className = `adv-st-node ${
          rank > 0 ? 'is-unlocked' : canUp ? 'is-available' : tierLocked ? 'is-locked' : ''
        }`;

        const top = document.createElement('div');
        top.className = 'adv-st-node-top';
        const titleWrap = document.createElement('span');
        titleWrap.className = 'adv-st-node-title-wrap';
        titleWrap.appendChild(createIconCanvas(node.iconSlot || 'skill'));
        const titleSpan = document.createElement('span');
        titleSpan.className = 'adv-st-node-title';
        titleSpan.textContent = heroTheme.nodes?.[node.id] || node.name;
        titleWrap.appendChild(titleSpan);
        const rankSpan = document.createElement('span');
        rankSpan.className = 'adv-st-node-rank';
        rankSpan.textContent = `${rank} / ${node.maxRank}`;
        top.appendChild(titleWrap);
        top.appendChild(rankSpan);

        const desc = document.createElement('p');
        desc.className = 'adv-st-node-desc';
        desc.textContent = node.summary(rank);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `adv-st-upgrade-btn ${canUp ? 'can-upgrade' : ''}`;
        btn.disabled = !canUp;
        btn.textContent =
          rank >= node.maxRank
            ? 'MAXED'
            : tierLocked
              ? `REQ TIER ${node.tier - 1}`
              : prog.skillPoints <= 0
                ? 'NEED 1 SP'
                : '+ UPGRADE (1 SP)';
        btn.addEventListener('click', () => {
          if (prog.upgradeNode(node.id, this.game.leftFighter)) {
            if (this.game.audio) {
              this.game.audio.play('holy_hit', this.game.leftFighter?.x || 600);
            }
            this.renderSkillTreeModal();
            this.syncControlDeckUI();
            this.game.updateHUD?.();
          }
        });

        card.appendChild(top);
        card.appendChild(desc);
        card.appendChild(btn);
        col.appendChild(card);
      }

      grid.appendChild(col);
    }
  }

  setMoveInput(dir, pressed) {
    if (dir < 0) this.uiHeldLeft = Boolean(pressed);
    if (dir > 0) this.uiHeldRight = Boolean(pressed);
    this.syncJoystickKnobUI();
  }

  setDepthInput(dir, pressed) {
    if (dir < 0) this.uiHeldUp = Boolean(pressed);
    if (dir > 0) this.uiHeldDown = Boolean(pressed);
    this.syncJoystickKnobUI();
  }

  setAttackHeld(pressed) {
    this.uiHeldAttack = Boolean(pressed);
  }

  setJoystickVector(nx, ny, active = true) {
    if (!active) {
      this.joyActive = false;
      this.joyX = 0;
      this.joyY = 0;
    } else {
      const mag = Math.hypot(nx || 0, ny || 0);
      const scale = mag > 1 ? 1 / mag : 1;
      this.joyActive = true;
      this.joyX = (nx || 0) * scale;
      this.joyY = (ny || 0) * scale;
    }
    this.syncJoystickKnobUI();
  }

  syncJoystickKnobUI() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const base = document.getElementById('adv-joystick-base');
    const knob = document.getElementById('adv-joystick-knob');
    if (!base || !knob) return;

    let vx = 0;
    let vy = 0;
    let maxPx = 32;
    if (this.joyActive) {
      vx = this.joyX;
      vy = this.joyY;
      maxPx = 40;
    } else {
      const kbX = (this.heldRight || this.uiHeldRight ? 1 : 0) - (this.heldLeft || this.uiHeldLeft ? 1 : 0);
      const kbY = (this.heldDown || this.uiHeldDown ? 1 : 0) - (this.heldUp || this.uiHeldUp ? 1 : 0);
      const mag = Math.hypot(kbX, kbY);
      vx = mag > 1 ? kbX / mag : kbX;
      vy = mag > 1 ? kbY / mag : kbY;
    }

    const dx = Math.round(vx * maxPx);
    const dy = Math.round(vy * maxPx);
    if (knob.style) knob.style.transform = `translate3d(${dx}px, ${dy}px, 0px)`;
    base.classList?.toggle('is-active', Math.hypot(vx, vy) > 0.08);

    if (typeof base.querySelector === 'function') {
      base.querySelector('.adv-joy-n')?.classList?.toggle('is-lit', vy < -0.22);
      base.querySelector('.adv-joy-s')?.classList?.toggle('is-lit', vy > 0.22);
      base.querySelector('.adv-joy-w')?.classList?.toggle('is-lit', vx < -0.22);
      base.querySelector('.adv-joy-e')?.classList?.toggle('is-lit', vx > 0.22);
    }
  }

  shiftEntityDepth(entity, dz) {
    if (!entity || !Number.isFinite(dz) || dz === 0) return 0;
    const prevGy = Number.isFinite(entity.groundY) ? entity.groundY : ADVENTURE_DEPTH_MID_Y;
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

  triggerAction(actionName) {
    if (!this.active || this.game.isMatchOver || this.isSkillTreeOpen || this.isRelicDraftOpen) return;
    this.queuedAction = actionName;
    this.queuedActionTimer = actionName === 'attack' ? 0.62 : 0.48;
  }

  setAutoPlay(enabled, playSound = false) {
    this.autoPlay = Boolean(enabled);
    const player = this.game.leftFighter;
    if (player) {
      player.adventureAutoPlay = this.autoPlay;
      if (this.autoPlay) {
        player._manualWalkActive = false;
      }
    }
    this.syncControlDeckUI();
    if (playSound && this.game.audio) {
      this.game.audio.play('clock_gear', player ? player.x : 600);
    }
  }

  toggleAutoPlay(playSound = true) {
    this.setAutoPlay(!this.autoPlay, playSound);
  }

  acquireBestLockMonster(player = this.game.leftFighter) {
    const living = this.getLivingMonsters();
    if (!living.length) return null;
    if (!player) return living[0];
    const facing = player.facing || 1;
    const pGy = Number.isFinite(player.groundY) ? player.groundY : player.y || ADVENTURE_DEPTH_MID_Y;

    let bestFront = null;
    let bestFrontScore = Infinity;
    for (let i = 0; i < living.length; i++) {
      const m = living[i];
      const signedDx = (m.x - player.x) * facing;
      const inFront = signedDx >= -24 || (m.isColossalBoss && facing > 0);
      if (!inFront) continue;
      const mGy = Number.isFinite(m.groundY) ? m.groundY : m.y || ADVENTURE_DEPTH_MID_Y;
      const depthDist = m.isColossalBoss ? 0 : (mGy - pGy) * 1.5;
      const score =
        Math.hypot(m.x - player.x, depthDist) -
        (m.isBoss ? 55 : m.isMiniBoss ? 22 : 0);
      if (score < bestFrontScore) {
        bestFrontScore = score;
        bestFront = m;
      }
    }
    if (bestFront) return bestFront;
    return this.getNearestLivingMonster(player);
  }

  getActiveLockedMonster(player = this.game.leftFighter) {
    if (!this.manualTargetLock) {
      this.lockedMonster = null;
      return null;
    }
    if (
      this.lockedMonster &&
      !this.lockedMonster.isDead &&
      (!this.game.fighters || this.game.fighters.includes(this.lockedMonster))
    ) {
      return this.lockedMonster;
    }
    this.lockedMonster = this.acquireBestLockMonster(player);
    return this.lockedMonster;
  }

  setTargetLock(enabled, playSound = false) {
    this.manualTargetLock = Boolean(enabled);
    const player = this.game.leftFighter;
    if (this.manualTargetLock) {
      this.lockedMonster = this.acquireBestLockMonster(player);
    } else {
      this.lockedMonster = null;
      this._comboLockTarget = null;
    }
    this.syncControlDeckUI();
    if (playSound && this.game.audio) {
      this.game.audio.play('clock_gear', player ? player.x : 600);
    }
  }

  toggleTargetLock(playSound = true) {
    this.setTargetLock(!this.manualTargetLock, playSound);
  }

  refreshActionIcons(heroKey = 'mage') {
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
          PixelForge.drawAdventureActionIcon(
            ictx,
            heroKey,
            slot,
            canvas.width || 64,
            canvas.height || 64,
            0
          );
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
    this._renderedMageIconsReady = Boolean(
      mageImg &&
        (typeof HTMLImageElement === 'undefined' ||
          !(mageImg instanceof HTMLImageElement) ||
          (mageImg.complete && mageImg.naturalWidth >= 448))
    );
    this._renderedHeroIconsReady = Boolean(
      heroSheet &&
        (typeof HTMLImageElement === 'undefined' ||
          !(heroSheet instanceof HTMLImageElement) ||
          (heroSheet.complete && heroSheet.naturalWidth >= 384))
    );
  }

  syncControlDeckUI() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const visible = Boolean(this.active && !this.game.isLandingOpen && !this.game.isMatchOver);
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.classList?.toggle('is-adventure-active', visible);
    }
    const deck = document.getElementById('adventure-controls');
    if (deck) {
      deck.classList?.toggle('hidden', !visible);
    }

    const stLbl = document.getElementById('adv-skilltree-label');
    if (stLbl) {
      stLbl.textContent = `LV.${this.progression.level} SKILLS`;
    }
    const spBadge = document.getElementById('adv-sp-badge');
    if (spBadge) {
      spBadge.textContent = `${this.progression.skillPoints} SP`;
      spBadge.classList?.toggle('has-sp', this.progression.skillPoints > 0);
    }
    const pauseSpBadge = document.getElementById('pause-sp-badge');
    if (pauseSpBadge) {
      const showPip = Boolean(visible && this.progression.skillPoints > 0);
      pauseSpBadge.textContent = '';
      pauseSpBadge.classList?.toggle('hidden', !showPip);
    }

    const autoBtn = document.getElementById('adv-btn-autoplay');
    const autoLbl = document.getElementById('adv-autoplay-label');
    if (autoBtn) {
      autoBtn.setAttribute?.('aria-pressed', String(this.autoPlay));
      autoBtn.classList?.toggle('is-autoplay-on', this.autoPlay);
    }
    if (autoLbl) {
      autoLbl.textContent = this.autoPlay ? 'AI: ON' : 'AI: OFF';
    }
    const skillAutoBtn = document.getElementById('adv-btn-auto');
    const skillAutoLbl = document.getElementById('adv-auto-label');
    if (skillAutoBtn) {
      skillAutoBtn.setAttribute?.('aria-pressed', String(this.autoPlay));
      skillAutoBtn.classList?.toggle('is-autoplay-on', this.autoPlay);
    }
    if (skillAutoLbl) {
      skillAutoLbl.textContent = 'AUTO';
    }

    const lockActive = Boolean(this.manualTargetLock);
    const lockBtn = document.getElementById('adv-btn-lock');
    const lockLbl = document.getElementById('adv-lock-label');
    if (lockBtn) {
      lockBtn.setAttribute?.('aria-pressed', String(lockActive));
      lockBtn.classList?.toggle('is-lock-on', lockActive);
    }
    if (lockLbl) {
      lockLbl.textContent = 'LOCK';
    }
    const pauseLockBtn = document.getElementById('adv-btn-pause-lock');
    const pauseLockLbl = document.getElementById('adv-pause-lock-label');
    if (pauseLockBtn) {
      pauseLockBtn.setAttribute?.('aria-pressed', String(lockActive));
      pauseLockBtn.classList?.toggle('is-lock-on', lockActive);
    }
    if (pauseLockLbl) {
      pauseLockLbl.textContent = lockActive ? 'LOCK: ON' : 'LOCK: OFF';
    }

    this.syncJoystickKnobUI();
    if (visible) {
      this.renderActiveRelicsInspector();
    }

    const player = this.game.leftFighter;
    if (!player) return;

    const heroKey = player.heroId || this.game.slot1Hero || 'mage';
    const isMageIconHero = heroKey === 'mage' || heroKey === 'mage_ex';
    const mageImg = PixelForge.assets?.mage?.icons;
    const heroSheet = PixelForge.assets?.heroIconsSheet;
    const mageIconsNowReady =
      isMageIconHero &&
      Boolean(
        mageImg &&
          (typeof HTMLImageElement === 'undefined' ||
            !(mageImg instanceof HTMLImageElement) ||
            (mageImg.complete && mageImg.naturalWidth >= 448))
      );
    const heroIconsNowReady =
      !isMageIconHero &&
      Boolean(
        heroSheet &&
          (typeof HTMLImageElement === 'undefined' ||
            !(heroSheet instanceof HTMLImageElement) ||
            (heroSheet.complete && heroSheet.naturalWidth >= 384))
      );
    if (
      this._renderedIconHero !== heroKey ||
      (isMageIconHero && mageIconsNowReady && !this._renderedMageIconsReady) ||
      (!isMageIconHero && heroIconsNowReady && !this._renderedHeroIconsReady)
    ) {
      this.refreshActionIcons(heroKey);
      if (this.isSkillTreeOpen) {
        this.renderSkillTreeModal();
      }
    }

    const updateOrbSlot = (slot, mode, sweepRatio, labelText, hidden = false) => {
      const btn = document.getElementById(`adv-btn-${slot}`);
      const sweep = document.getElementById(`adv-cd-sweep-${slot}`);
      const txt = document.getElementById(`adv-cd-text-${slot}`);
      if (btn) {
        btn.classList?.toggle('hidden', Boolean(hidden));
        btn.classList?.toggle('is-ready', mode === 'ready');
        btn.classList?.toggle('is-on-cd', mode === 'cd');
        btn.classList?.toggle('is-charging', mode === 'charge');
        btn.classList?.toggle('is-low-spirit', mode === 'low_spirit');
      }
      if (sweep?.style?.setProperty) {
        const deg = Math.max(0, Math.min(360, (sweepRatio || 0) * 360));
        sweep.style.setProperty('--cd-deg', `${deg.toFixed(1)}deg`);
      }
      if (txt && txt.textContent !== labelText) {
        txt.textContent = labelText;
      }
    };

    const stats = this.progression.getComputedStats();

    // 1. Basic Attack (subtle cadence sweep while keeping primary icon vibrant)
    const autoCd = Math.max(0, player.autoCooldown || 0);
    this.autoCdMax = Math.max(0.32, this.autoCdMax || 0.44);
    updateOrbSlot('attack', 'ready', autoCd > 0.03 ? autoCd / this.autoCdMax : 0, '');

    // 2. Pure 3D Evade Dash
    const dodgeCd = Math.max(0, player.dodgeCooldown || 0);
    this.dodgeCdMax = Math.max(this.dodgeCdMax, dodgeCd, 0.5);
    if (dodgeCd > 0.05) {
      updateOrbSlot('dodge', 'cd', dodgeCd / this.dodgeCdMax, `${dodgeCd.toFixed(1)}s`);
    } else {
      updateOrbSlot('dodge', 'ready', 0, '');
    }

    // 3. Special Skill (Powered by Solar Spirit + Cooldown)
    const skillCd = Math.max(0, player.skillCooldown || 0);
    this.skillCdMax = Math.max(this.skillCdMax, skillCd, 0.5);
    if (skillCd > 0.05) {
      updateOrbSlot('skill', 'cd', skillCd / this.skillCdMax, `${skillCd.toFixed(1)}s`);
    } else if (this.progression.spirit + 0.01 < stats.skillSpiritCost) {
      const spRatio = Math.max(0, Math.min(1, this.progression.spirit / Math.max(1, stats.skillSpiritCost)));
      updateOrbSlot('skill', 'low_spirit', 1 - spRatio, `${stats.skillSpiritCost} SP`);
    } else {
      updateOrbSlot('skill', 'ready', 0, '');
    }

    // 4. Adventure Overdrive Ultimate (Soul Ember & Combo Charge 0..100%)
    const ultRatio = Math.max(0, Math.min(1, this.progression.ultCharge / 100));
    if (ultRatio < 0.999) {
      updateOrbSlot('overdrive', 'charge', 1 - ultRatio, `${Math.floor(ultRatio * 100)}%`);
    } else {
      updateOrbSlot('overdrive', 'ready', 0, 'MAX');
    }

    // 5. Supreme Cataclysm Ultimate (Astral Relic Seals 0..100%)
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

  getWorldWidth() {
    return this.activeCampaignPack ? this.activeCampaignPack.worldWidth : ADVENTURE_WORLD_WIDTH;
  }

  getActiveZones() {
    return this.activeCampaignPack ? this.activeCampaignPack.zones : ADVENTURE_ZONES;
  }

  getBossConfig() {
    if (this.activeCampaignPack?.finalBoss) {
      return this.activeCampaignPack.finalBoss;
    }
    return {
      enabled: true,
      kind: 'archfiend',
      name: 'BEHEMOTH MALPHAS',
      maxHp: 11800,
      anchorX: ADVENTURE_BOSS_ANCHOR_X,
      groundY: ADVENTURE_DEPTH_MID_Y
    };
  }

  getBossAnchorX() {
    return this.bossEntity?.anchorX || this.getBossConfig().anchorX || ADVENTURE_BOSS_ANCHOR_X;
  }

  getBossMaxWalkX() {
    return this.getBossAnchorX() - 85;
  }

  getBossMinWalkX() {
    return Math.max(80, this.getBossAnchorX() - 955);
  }

  applyCampaignPack(rawOrNormalizedPack) {
    if (!rawOrNormalizedPack || rawOrNormalizedPack === DEFAULT_ADVENTURE_CAMPAIGN_ID) {
      this.clearCampaignPack();
      return null;
    }
    const normalized =
      rawOrNormalizedPack._isNormalizedCampaignPack === true
        ? rawOrNormalizedPack
        : normalizeAdventureCampaignPack(rawOrNormalizedPack);
    Object.defineProperty(normalized, '_isNormalizedCampaignPack', {
      value: true,
      enumerable: false,
      configurable: true
    });
    this.activeCampaignPack = normalized;
    this.activeCampaignId = normalized.packId;
    this.depthMinY = normalized.walkableCauseway.minY;
    this.depthMaxY = normalized.walkableCauseway.maxY;
    this.depthMidY = normalized.walkableCauseway.midY;
    this._campaignPackCache.set(normalized.packId, normalized);
    AdventureMapRenderer.setActiveCampaign(normalized);
    this.destructibles.setCampaignProps(normalized.props);
    return normalized;
  }

  clearCampaignPack() {
    this.activeCampaignPack = null;
    this.activeCampaignId = DEFAULT_ADVENTURE_CAMPAIGN_ID;
    this.depthMinY = ADVENTURE_DEPTH_MIN_Y;
    this.depthMaxY = ADVENTURE_DEPTH_MAX_Y;
    this.depthMidY = ADVENTURE_DEPTH_MID_Y;
    AdventureMapRenderer.setActiveCampaign(null);
    this.destructibles.resetToDefaultProps();
  }

  async fetchCampaignIndex(url = 'assets/campaigns/index.json?v=30fps188') {
    if (typeof fetch !== 'function') return [];
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch campaign index (${res.status})`);
    }
    const json = await res.json();
    return Array.isArray(json?.packs) ? json.packs : [];
  }

  async loadCampaignPackById(packId, fileHint = null, cacheBust = 'v=30fps188') {
    if (!packId || packId === DEFAULT_ADVENTURE_CAMPAIGN_ID) {
      this.clearCampaignPack();
      return null;
    }
    const cleanId = String(packId).trim();
    if (this._campaignPackCache.has(cleanId)) {
      return this.applyCampaignPack(this._campaignPackCache.get(cleanId));
    }
    if (typeof fetch !== 'function') return null;
    const relFile =
      typeof fileHint === 'string' && fileHint.trim()
        ? fileHint.trim().replace(/^\/+/, '')
        : `${cleanId.replace(/[^a-z0-9_-]/gi, '')}.json`;
    const baseUrl = relFile.startsWith('assets/') ? relFile : `assets/campaigns/${relFile}`;
    const sep = baseUrl.includes('?') ? '&' : '?';
    const res = await fetch(cacheBust ? `${baseUrl}${sep}${cacheBust}` : baseUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch campaign pack "${cleanId}" (${res.status})`);
    }
    const rawJson = await res.json();
    const normalized = normalizeAdventureCampaignPack(rawJson);
    this._campaignPackCache.set(cleanId, normalized);
    this._campaignPackCache.set(normalized.packId, normalized);
    return this.applyCampaignPack(normalized);
  }

  _prewarmCustomZoneAssets(zoneIdx = 0) {
    PixelForge.ensureAdventureLoaded?.(Math.min(3, Math.max(0, zoneIdx)));
    const pack = this.activeCampaignPack;
    if (!pack) return;
    const z = pack.zones[zoneIdx];
    if (z) {
      for (const s of z.subWave0 || []) {
        PixelForge.ensureMonsterLoaded?.(s.engineKind);
      }
      for (const s of z.subWave1 || []) {
        PixelForge.ensureMonsterLoaded?.(s.engineKind);
      }
    }
    if (pack.finalBoss?.enabled && zoneIdx >= Math.max(0, pack.zones.length - 2)) {
      const assets = PixelForge.initAssets?.();
      if (assets?.advInfernoPano) PixelForge.ensureImage?.(assets.advInfernoPano);
      PixelForge.ensureHeroLoaded?.('archfiend');
      PixelForge.ensureMonsterLoaded?.('fiend');
    }
  }

  _countCustomCampaignEncounterSteps(pack) {
    if (!pack) return 8;
    let total = 0;
    for (let i = 0; i < pack.zones.length; i++) {
      const z = pack.zones[i];
      if ((z.subWave0?.length || 0) > 0) total++;
      if ((z.subWave1?.length || 0) > 0) total++;
    }
    if (pack.finalBoss?.enabled !== false) total++;
    return Math.max(1, total);
  }

  _computeCustomWaveOrdinal(pack, zoneIdx, subWave) {
    let ord = 0;
    for (let i = 0; i < zoneIdx && i < pack.zones.length; i++) {
      const pz = pack.zones[i];
      if ((pz.subWave0?.length || 0) > 0) ord++;
      if ((pz.subWave1?.length || 0) > 0) ord++;
    }
    const cz = pack.zones[zoneIdx];
    if (subWave === 1) {
      if ((cz?.subWave0?.length || 0) > 0) ord++;
    } else if (subWave === 2) {
      if ((cz?.subWave0?.length || 0) > 0) ord++;
      if ((cz?.subWave1?.length || 0) > 0) ord++;
    }
    return Math.max(1, ord);
  }

  startCampaign(playerFighter, campaignPackOverride = undefined) {
    if (campaignPackOverride !== undefined) {
      if (!campaignPackOverride || campaignPackOverride === DEFAULT_ADVENTURE_CAMPAIGN_ID) {
        this.clearCampaignPack();
      } else {
        this.applyCampaignPack(campaignPackOverride);
      }
    }

    this.attachListeners();
    this.bindDOMControls();
    this.active = true;
    this.isSkillTreeOpen = false;
    this.isRelicDraftOpen = false;
    this.relicDraftChoices = [];
    this._relicDraftMeta = { source: 'zone', zoneIdx: 0, wardenName: '' };
    this._lastRelicDraftKillCount = -1;
    this._lastPauseRelicSig = '';
    this.activeRelics = [];
    this._relicHitCounter = 0;
    this._relicMeteorCastCount = 0;
    this._relicHasteTimer = 0;
    this._relicChainArcs = [];
    this._relicDodgeMines = [];
    this._relicSkillEchoes = [];
    this._relicCounterWaves = [];
    this._relicMeteors = [];
    this._relicAegisOrbitT = 0;
    this._relicAegisZapCd = 0;
    this._inRelicProc = false;
    this._perfectDodgeSlowTimer = 0;
    this._perfectDodgeBannerTimer = 0;
    this.perfectDodgeCount = 0;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this._hudStripRect = null;
    this.clearHeldInputs();
    this.closeRelicDraft(false);
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('victory-overlay')?.classList?.remove('is-defeat-plaque');
      document.getElementById('hud-right')?.classList?.remove?.('hidden');
    }

    const activeZones = this.getActiveZones();
    const worldW = this.getWorldWidth();
    const midY = this.depthMidY || ADVENTURE_DEPTH_MID_Y;

    this.zoneIndex = 0;
    this.subWave = 0;
    this.subWaveDelay = 0;
    this.zonesCleared = activeZones.map(() => false);
    this.pickups = [];
    this.portals = [];
    this.monsterPlumes = [];
    this.monstersKilled = 0;
    this.score = 0;
    this.comboHits = 0;
    this.comboTimer = 0;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this.bossEntity = null;
    this.goPromptActive = false;

    this.skillSets.attachToFighter(playerFighter);
    this.progression.resetForNewCampaign();
    const canLoadSavedProgress =
      this.progressMode === 'keep' &&
      !this.game?.simMode &&
      !this.game?.testModeUnlimitedHp &&
      !this.autoPlay;
    this._progressSessionEligible = canLoadSavedProgress;
    this._progressDirty = false;
    this._lastProgressSaveMs = 0;
    this._lastSavedProgressSig = '';
    if (canLoadSavedProgress && playerFighter?.heroId) {
      const loadedSaved = this.progression.loadFromStorage(
        playerFighter.heroId,
        null,
        this._progressStorageOverride
      );
      if (loadedSaved) {
        this._lastSavedProgressSig = JSON.stringify(this.progression.exportProgressSnapshot());
      }
    }
    this.progression.attachToFighter(playerFighter);

    this.autoCdMax = playerFighter.autoInterval || 0.44;
    this.skillCdMax = Math.max(3.8, (playerFighter.skillMaxCooldown || 4.5) * 1.15);
    this.dodgeCdMax = 1.35;
    this._renderedIconHero = null;
    this._renderedMageIconsReady = false;
    this._renderedHeroIconsReady = false;

    const renderer = this.game.renderer;
    if (renderer) {
      renderer.worldWidth = worldW;
      renderer.adventureMode = true;
      renderer.adventureHook = this;
      renderer.stageId = activeZones[0]?.stageId || 'cathedral';
      renderer.permanentStageOverride = null;
      renderer.trueUltStageOverride = null;
      renderer.trueUltStageAlpha = 0;
      renderer.camX = 480;
      renderer.camY = midY - 95;
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

    playerFighter.x = 240;
    playerFighter.groundY = midY;
    playerFighter.y = midY;
    playerFighter.facing = 1;
    playerFighter.team = 1;
    playerFighter.isPlayerControlled = true;
    playerFighter.isManualAdventureControl = true;
    playerFighter.adventureAutoPlay = this.autoPlay;
    playerFighter._manualWalkActive = false;
    playerFighter._manualSpeedRatio = 0;
    playerFighter._advVaultVelZ = 0;
    playerFighter._advPureDodge = false;
    playerFighter._advPureDodgeTimer = 0;
    playerFighter._advPerfectDodgeTriggered = false;
    playerFighter._phantomEmpowerReady = false;
    playerFighter._phantomEmpowerTimer = 0;
    playerFighter._advRecentCastSource = null;
    playerFighter._advRecentCastTimer = 0;
    playerFighter._advActiveCastSource = null;
    playerFighter._advDodgeStartX = null;
    playerFighter._advDodgeStartGy = null;
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

    this.game.fighters = [playerFighter];
    this._bossWarnPulseTimer = 0;
    this.destructibles.resetForCampaign();
    this.closeSkillTree(false);
    this.renderSkillTreeModal();
    this.refreshActionIcons(playerFighter.heroId || 'mage');
    this.spawnZoneEncounter(0, 1);
    if (!this.game?.isLandingOpen && !this.game?.simMode && !this.bossWarningTimer && !this.bossSpawnPending) {
      this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
    }
    this.syncStageBadge();
    this.syncRightHUD();
    this.syncControlDeckUI();
  }

  stopCampaign() {
    if (this.active && this.game?.leftFighter) {
      this.persistHeroProgressIfEnabled({ force: true });
    }
    this._progressSessionEligible = false;
    this._progressDirty = false;
    this._lastSavedProgressSig = '';
    this.closeSkillTree(false);
    this.closeRelicDraft(false);
    this.activeRelics = [];
    this.relicDraftChoices = [];
    this._relicDraftMeta = { source: 'zone', zoneIdx: 0, wardenName: '' };
    this._lastRelicDraftKillCount = -1;
    this._lastPauseRelicSig = '';
    this._relicHitCounter = 0;
    this._relicMeteorCastCount = 0;
    this._relicHasteTimer = 0;
    this._relicChainArcs = [];
    this._relicDodgeMines = [];
    this._relicSkillEchoes = [];
    this._relicCounterWaves = [];
    this._relicMeteors = [];
    this._relicAegisOrbitT = 0;
    this._relicAegisZapCd = 0;
    this._inRelicProc = false;
    this._perfectDodgeSlowTimer = 0;
    this._perfectDodgeBannerTimer = 0;
    this.perfectDodgeCount = 0;
    if (this.game.leftFighter) {
      if (this.game.leftFighter._advPureDodge) {
        this.finishHeroAdventureDodge(this.game.leftFighter, false);
      }
      this.game.leftFighter._advDodgeFrameOverride = null;
      this.game.leftFighter._advDodgeTrails = [];
      this.game.leftFighter._hnsStreaks = [];
      this.game.leftFighter.isManualAdventureControl = false;
      this.game.leftFighter._manualWalkActive = false;
      this.game.leftFighter._manualSpeedRatio = 0;
      this.game.leftFighter._advPureDodge = false;
      this.game.leftFighter._advPureDodgeTimer = 0;
      this.game.leftFighter._advPerfectDodgeTriggered = false;
      this.game.leftFighter._phantomEmpowerReady = false;
      this.game.leftFighter._phantomEmpowerTimer = 0;
      this.game.leftFighter._advRecentCastSource = null;
      this.game.leftFighter._advRecentCastTimer = 0;
      this.game.leftFighter._advActiveCastSource = null;
      this.game.leftFighter._advDodgeStartX = null;
      this.game.leftFighter._advDodgeStartGy = null;
      this.game.leftFighter._advAiVelX = 0;
      this.game.leftFighter._advAiVelZ = 0;
      this.game.leftFighter._advAiStuckTimer = 0;
      this.game.leftFighter._advAiUnstickTimer = 0;
    }
    this.progression.detachFromFighter(this.game.leftFighter);
    this.skillSets.detachFromFighter(this.game.leftFighter);
    this.clearCampaignPack();
    this.active = false;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this._hudStripRect = null;
    this.lockActive = false;
    this.goPromptActive = false;
    this.bossWarningTimer = 0;
    this._bossWarnPulseTimer = 0;
    this.bossSpawnPending = false;
    this.bossEntity = null;
    this.pickups = [];
    this.portals = [];
    this.monsterPlumes = [];
    this.clearHeldInputs();
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('victory-overlay')?.classList?.remove('is-defeat-plaque');
      document.getElementById('hud-right')?.classList?.remove?.('hidden');
    }

    const renderer = this.game.renderer;
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
          : renderer.isMobileLandscape && typeof renderer.getMobileLandscapeFixedZoom === 'function'
            ? renderer.getMobileLandscapeFixedZoom(false)
            : renderer.isMobilePortrait && typeof renderer.getMobilePortraitFixedZoom === 'function'
              ? renderer.getMobilePortraitFixedZoom(false)
              : renderer.isMobile
                ? 0.72
                : 1.0;
    }
    this.syncControlDeckUI();
  }

  spawnMonster(kind, x, opts = {}) {
    const lanePool = [508, 616, 470, 646, 558];
    const defaultGy =
      kind === 'archfiend'
        ? this.depthMidY || ADVENTURE_DEPTH_MID_Y
        : lanePool[(this.game.fighters ? this.game.fighters.length : 0) % lanePool.length];
    const rawGy = Number.isFinite(opts.groundY) ? opts.groundY : defaultGy;
    const gy = Math.max(this.depthMinY + 12, Math.min(this.depthMaxY - 12, rawGy));
    const player = this.game.leftFighter;
    const spawnX =
      kind === 'archfiend' ? (Number.isFinite(x) ? x : this.getBossAnchorX()) : x;
    const facing = kind === 'archfiend' ? -1 : player && player.x > spawnX ? 1 : -1;
    const m =
      kind === 'archfiend'
        ? new ArchfiendBoss(spawnX, gy, facing, opts)
        : new Monster(kind, spawnX, gy, facing, opts);
    // Apply Ascension Difficulty Tier scaling (`NORMAL`, `HEROIC`, `SOVEREIGN`)
    const diff = this.getDifficultyConfig();
    if (diff.hpMult !== 1) {
      m.maxHp = Math.max(1, Math.round(m.maxHp * diff.hpMult));
      m.hp = m.maxHp;
    }
    if (m.isBoss) {
      const bossDmgMult =
        Number.isFinite(diff.bossDmgMult) && diff.bossDmgMult > 0
          ? diff.bossDmgMult
          : diff.dmgMult || 1;
      m.dmgScale = (m.dmgScale || 1.24) * bossDmgMult;
      if (Number.isFinite(diff.bossSkillCd) && diff.bossSkillCd > 0) {
        m.skillMaxCooldown = diff.bossSkillCd;
        m.skillCooldown = Math.min(m.skillCooldown || diff.bossSkillCd, diff.bossSkillCd);
      }
      if (Number.isFinite(diff.bossSoulTitheCd) && diff.bossSoulTitheCd > 0) {
        m.soulTitheBaseCd = diff.bossSoulTitheCd;
        m.soulTitheCooldown = diff.bossSoulTitheCd;
      }
      if (Number.isFinite(diff.bossSoulTitheChipScale) && diff.bossSoulTitheChipScale > 0) {
        m.soulTitheChipScale = diff.bossSoulTitheChipScale;
      }
      if (diff.cadenceMult !== 1) {
        m.cadenceMult = diff.cadenceMult;
        m.autoInterval = Math.max(0.35, (m.autoInterval || 1.0) / diff.cadenceMult);
        if (Number.isFinite(m.ultCooldown) && m.ultCooldown > 0) {
          m.ultCooldown = Math.max(2.2, m.ultCooldown / diff.cadenceMult);
        }
        m.autoCooldown = Math.max(0.25, (m.autoCooldown || 0.5) / diff.cadenceMult);
      }
    } else {
      if (diff.dmgMult !== 1) {
        m.dmgScale = (m.dmgScale || 1) * diff.dmgMult;
      }
      if (diff.cadenceMult !== 1) {
        m.cadenceMult = diff.cadenceMult;
        m.autoInterval = Math.max(0.35, (m.autoInterval || 1.0) / diff.cadenceMult);
        m.skillMaxCooldown = Math.max(0.9, (m.skillMaxCooldown || 3.5) / diff.cadenceMult);
        if (Number.isFinite(m.dashMaxCooldown) && m.dashMaxCooldown > 0) {
          m.dashMaxCooldown = Math.max(0.9, m.dashMaxCooldown / diff.cadenceMult);
        }
        if (Number.isFinite(m.ultCooldown) && m.ultCooldown > 0) {
          m.ultCooldown = Math.max(2.2, m.ultCooldown / diff.cadenceMult);
        }
        m.autoCooldown = Math.max(0.25, (m.autoCooldown || 0.5) / diff.cadenceMult);
        m.skillCooldown = Math.max(0.5, (m.skillCooldown || 1.5) / diff.cadenceMult);
      }
    }
    m.game = this.game;
    m.team = 2;
    m.groundY = gy;
    m.y = gy;
    this.game.fighters.push(m);
    if (!this.game.rightFighter || this.game.rightFighter.isDead || m.isBoss) {
      this.game.rightFighter = m;
    }

    // Open a biome-matched HD-2D Dimensional Summoning Portal behind every emerging Realm enemy!
    if (!m.isBoss && !opts.skipPortal) {
      const portalZone =
        kind === 'templar' || kind === 'astrologer'
          ? 0
          : kind === 'treant' || kind === 'dryad'
            ? 1
            : kind === 'ghoul' || kind === 'cultist'
              ? 2
              : kind === 'brute' || kind === 'fiend'
                ? 3
                : Math.max(0, Math.min(3, Math.floor(spawnX / 2400)));
      this.portals.push({
        x: spawnX - facing * 26,
        groundY: gy,
        zone: portalZone,
        facing,
        age: 0,
        maxLife: 1.36,
        isElite: Boolean(opts.isElite),
        primaryColor: m.primaryColor || '#38bdf8',
        seed: (this.portals.length * 1.7 + spawnX * 0.01) % 6.28
      });
    }

    if (this.game.vfx) {
      this.game.vfx.spawnShockwave(spawnX, gy - 24, m.isBoss ? 250 : 92, m.primaryColor, 0.34, true);
      this.game.vfx.spawnBurst(spawnX, gy - 44, m.isBoss ? 28 : 12, m.primaryColor, 210, { upBias: 130, size: 5 });
    }
    return m;
  }

  spawnMonsterPlume(
    x,
    groundY,
    vfxRow = 10,
    color = '#38bdf8',
    scale = 1.6,
    maxLife = 0.48,
    essenceSparks = 6
  ) {
    if (!this.monsterPlumes) this.monsterPlumes = [];
    while (this.monsterPlumes.length >= 28) {
      this.monsterPlumes.shift();
    }
    const fallbackGy = this.game?.leftFighter?.groundY || ADVENTURE_DEPTH_MID_Y;
    const gy = Number.isFinite(groundY) ? groundY : fallbackGy;
    this.monsterPlumes.push({
      x,
      groundY: gy,
      vfxRow: Math.max(0, Math.min(11, vfxRow | 0)),
      color: color || '#38bdf8',
      scale: Number.isFinite(scale) ? scale : 1.6,
      age: 0,
      maxLife: Math.max(0.18, maxLife || 0.48),
      essenceSparks: Math.max(0, Math.min(16, essenceSparks | 0)),
      seed: ((Math.abs(x) * 0.13) % 6.28)
    });
  }

  spawnPickup(type, x, groundY = null, extra = {}) {
    const fallbackGy = this.game.leftFighter?.groundY || ADVENTURE_DEPTH_MID_Y;
    const gy = Math.max(
      this.depthMinY + 16,
      Math.min(this.depthMaxY - 16, Number.isFinite(groundY) ? groundY : fallbackGy)
    );
    this.pickups.push({
      type, // 'hp' | 'ember' | 'relic' (also accepts legacy 'mana' | 'ult')
      x,
      groundY: gy,
      y: gy,
      vy: -210,
      age: 0,
      ultAmt: extra.ultAmt || 20,
      relicAmt: extra.relicAmt || 34,
      collected: false
    });
  }

  spawnZoneEncounter(zoneIdx, subWave = 1) {
    const activeZones = this.getActiveZones();
    const z = activeZones[zoneIdx];
    if (!z) return;
    this._prewarmCustomZoneAssets(zoneIdx);
    if (subWave >= 1 && zoneIdx < activeZones.length - 1) {
      const nextZone = zoneIdx + 1;
      const schedulePrewarm = () => this._prewarmCustomZoneAssets(nextZone);
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(schedulePrewarm, { timeout: 600 });
      } else {
        setTimeout(schedulePrewarm, 180);
      }
    }
    this.zoneIndex = zoneIdx;
    this.subWave = subWave;
    this.goPromptActive = false;
    this.lockActive = true;
    this.lockMinX = subWave === 1 ? z.sub1LockMinX : z.lockMinX;
    this.lockMaxX = subWave === 1 ? z.sub1LockMaxX : z.lockMaxX;

    if (this.game.renderer) {
      this.game.renderer.adventureCamMinX = z.minX;
      this.game.renderer.adventureCamMaxX = z.maxX;
      if (!this.game.renderer.permanentStageOverride) {
        this.game.renderer.stageId = z.stageId;
      }
    }

    // Custom Stage Pack Encounter Dispatcher (`schemaVersion: "1.0.0"`)
    if (this.activeCampaignPack) {
      const pack = this.activeCampaignPack;
      const lastZoneIdx = pack.zones.length - 1;
      const bossCfg = pack.finalBoss;
      const isBossSubWave =
        zoneIdx === lastZoneIdx &&
        bossCfg?.enabled !== false &&
        (subWave >= 3 || (subWave === 2 && (z.subWave1?.length || 0) === 0));

      if (isBossSubWave) {
        this.totalWaveLabel = 'COLOSSAL BOSS';
        this.bossWarningTimer = 1.85;
        this._bossWarnPulseTimer = 0;
        this.bossSpawnPending = true;
        const bossAnchorX = bossCfg.anchorX || this.getBossAnchorX();
        const bossMaxWalkX = bossAnchorX - 85;
        const player = this.game.leftFighter;
        if (player) {
          const isRangedHero = (player.attackRange || 180) >= 320;
          const bossEntryX = Math.max(
            z.lockMinX + 40,
            bossAnchorX - (isRangedHero ? 495 : 170)
          );
          if (player.x < bossAnchorX - 835) player.x = bossEntryX;
          else if (player.x > bossMaxWalkX) player.x = bossMaxWalkX;
          player.facing = 1;
        }
        if (this.game.audio) {
          this.game.audio.play('eclipse_charge', bossAnchorX);
          if (!this.game.isLandingOpen && !this.game.simMode) {
            this.game.audio.playBgm?.('bgm_boss_malphas');
          }
        }
        if (this.game.renderer) {
          this.game.renderer.triggerShake(16, 0.72);
          this.game.renderer.triggerStageEvent?.(
            `WARNING: ${(bossCfg.name || 'BEHEMOTH MALPHAS').toUpperCase()}!`,
            'COLOSSAL SOVEREIGN RISES ON THE EAST ABYSS!',
            '#ef4444',
            3.4
          );
        }
      } else {
        const spawns = subWave === 1 ? z.subWave0 || [] : z.subWave1 || [];
        const totalSteps = this._countCustomCampaignEncounterSteps(pack);
        const curStep = this._computeCustomWaveOrdinal(pack, zoneIdx, subWave);
        this.totalWaveLabel = `WAVE ${curStep} / ${totalSteps}`;

        let wardenSpawn = null;
        for (let si = 0; si < spawns.length; si++) {
          const sp = spawns[si];
          if (!sp) continue;
          const opts = {
            groundY: sp.groundY,
            isElite: Boolean(sp.isElite),
            isMiniBoss: Boolean(sp.isMiniBoss)
          };
          if (sp.wardenName) opts.wardenName = sp.wardenName;
          if (sp.wardenTitle) opts.wardenTitle = sp.wardenTitle;
          if (Number.isFinite(sp.maxHp) && sp.maxHp > 0) opts.maxHp = sp.maxHp;
          if (Number.isFinite(sp.spriteScale) && sp.spriteScale > 0) opts.spriteScale = sp.spriteScale;
          if (Number.isFinite(sp.dmgScale) && sp.dmgScale > 0) opts.dmgScale = sp.dmgScale;
          this.spawnMonster(sp.engineKind, sp.x, opts);
          if (sp.isMiniBoss && !wardenSpawn) {
            wardenSpawn = sp;
          }
        }

        const accentHex =
          z.bloomPalette === 'emerald' || z.biome === 'sylvan'
            ? '#34d399'
            : z.bloomPalette === 'violet' || z.biome === 'boneyard'
              ? '#c084fc'
              : z.bloomPalette === 'ember' || z.biome === 'clocktower'
                ? '#fb923c'
                : z.bloomPalette === 'gold'
                  ? '#facc15'
                  : '#38bdf8';
        if (wardenSpawn) {
          this.game.renderer?.triggerStageEvent?.(
            `REALM WARDEN: ${(wardenSpawn.wardenName || 'REALM WARDEN').toUpperCase()}!`,
            `${(wardenSpawn.wardenTitle || z.title || 'GUARDIAN OF THE REALM').toUpperCase()} AWAKENS!`,
            accentHex,
            2.9
          );
        } else if (spawns.length > 0 && (zoneIdx > 0 || subWave > 1)) {
          this.game.renderer?.triggerStageEvent?.(
            z.title || `ZONE ${zoneIdx + 1}`,
            subWave === 1
              ? 'DIMENSIONAL PORTALS TEAR OPEN ACROSS THE CAUSEWAY!'
              : 'SANCTUM VANGUARD REINFORCEMENTS EMERGE!',
            accentHex,
            2.5
          );
        }
      }

      this.syncStageBadge();
      this.syncRightHUD();
      return;
    }

    if (zoneIdx === 0 && subWave === 1) {
      this.totalWaveLabel = 'WAVE 1 / 8';
      this.spawnMonster('templar', 720, { groundY: 506 });
      this.spawnMonster('templar', 900, { groundY: 618 });
    } else if (zoneIdx === 0 && subWave === 2) {
      this.totalWaveLabel = 'WAVE 2 / 8';
      this.spawnMonster('templar', 1760, { groundY: 478 });
      this.spawnMonster('astrologer', 1980, { groundY: 562 });
      this.spawnMonster('templar', 2140, { groundY: 636 });
      this.game.renderer?.triggerStageEvent?.(
        'ECLIPSE CHAPEL SANCTUM!',
        'ASTRAL PORTALS OPEN — FALLEN TEMPLARS & SEER!',
        '#38bdf8',
        2.4
      );
    } else if (zoneIdx === 1 && subWave === 1) {
      this.totalWaveLabel = 'WAVE 3 / 8';
      this.spawnMonster('treant', 3120, { groundY: 562 });
      this.spawnMonster('dryad', 3290, { groundY: 478 });
      this.spawnMonster('dryad', 3420, { groundY: 642 });
      this.game.renderer?.triggerStageEvent?.(
        'ZONE II: CURSED STARWOOD',
        'BRIAR PORTALS TEAR OPEN — ELDERTREE & DRYADS!',
        '#34d399',
        2.6
      );
    } else if (zoneIdx === 1 && subWave === 2) {
      this.totalWaveLabel = 'WAVE 4 / 8';
      this.spawnMonster('treant', 4460, {
        isElite: true,
        isMiniBoss: true,
        wardenName: 'ELDER BRIAR-KING',
        wardenTitle: 'STARWOOD WARDEN',
        maxHp: 3100,
        spriteScale: 1.36,
        dmgScale: 1.16,
        groundY: 558
      });
      this.spawnMonster('dryad', 4140, { groundY: 478 });
      this.spawnMonster('dryad', 4340, { groundY: 642 });
      this.game.renderer?.triggerStageEvent?.(
        'REALM WARDEN: ELDER BRIAR-KING!',
        'SOVEREIGN OF THE CURSED STARWOOD AWAKENS!',
        '#34d399',
        2.9
      );
    } else if (zoneIdx === 2 && subWave === 1) {
      this.totalWaveLabel = 'WAVE 5 / 8';
      this.spawnMonster('ghoul', 5480, { isElite: true, groundY: 560 });
      this.spawnMonster('ghoul', 5280, { groundY: 476 });
      this.spawnMonster('ghoul', 5660, { groundY: 646 });
      this.spawnMonster('cultist', 5800, { isElite: true, groundY: 518 });
      this.game.renderer?.triggerStageEvent?.(
        'ZONE III: ABYSSAL BONE-GATE',
        'CRYPT PORTALS UNSEALED — OSSUARY UNDEAD LEGION!',
        '#c084fc',
        2.8
      );
    } else if (zoneIdx === 2 && subWave === 2) {
      this.totalWaveLabel = 'WAVE 6 / 8';
      this.spawnMonster('cultist', 6860, {
        isElite: true,
        isMiniBoss: true,
        wardenName: 'ARCH-LICH MORVATH',
        wardenTitle: 'OSSUARY WARDEN',
        maxHp: 2800,
        spriteScale: 1.24,
        dmgScale: 1.16,
        groundY: 548
      });
      this.spawnMonster('ghoul', 6560, { isElite: true, groundY: 482 });
      this.spawnMonster('ghoul', 6420, { groundY: 640 });
      this.game.renderer?.triggerStageEvent?.(
        'REALM WARDEN: ARCH-LICH MORVATH!',
        'LORD OF THE OSSUARY BONE-GATE UNSEALS THE CRYPT!',
        '#c084fc',
        2.9
      );
    } else if (zoneIdx === 3 && subWave === 1) {
      this.totalWaveLabel = 'WAVE 7 / 8';
      this.spawnMonster('brute', 7920, { isElite: true, groundY: 560 });
      this.spawnMonster('fiend', 8080, { isElite: true, groundY: 482 });
      this.spawnMonster('fiend', 8210, { groundY: 638 });
      this.spawnMonster('fiend', 7720, { groundY: 616 });
      this.game.renderer?.triggerStageEvent?.(
        'ZONE IV: BLACK PIT VANGUARD',
        'HELL-MAW PORTALS ERUPT BEFORE MALPHAS!',
        '#fb923c',
        2.7
      );
    } else if (zoneIdx === 3) {
      this.totalWaveLabel = 'COLOSSAL BOSS';
      this.bossWarningTimer = 1.85;
      this._bossWarnPulseTimer = 0;
      this.bossSpawnPending = true;
      const player = this.game.leftFighter;
      if (player) {
        const isRangedHero = (player.attackRange || 180) >= 320;
        const bossEntryX = isRangedHero ? 8840 : 9165;
        if (player.x < 8500) player.x = bossEntryX;
        else if (player.x > ADVENTURE_BOSS_MAX_WALK_X) player.x = ADVENTURE_BOSS_MAX_WALK_X;
        player.facing = 1;
      }
      if (this.game.audio) {
        this.game.audio.play('eclipse_charge', ADVENTURE_BOSS_ANCHOR_X);
        if (!this.game.isLandingOpen && !this.game.simMode) {
          this.game.audio.playBgm?.('bgm_boss_malphas');
        }
      }
      if (this.game.renderer) {
        this.game.renderer.triggerShake(16, 0.72);
        this.game.renderer.triggerStageEvent?.(
          'WARNING: BEHEMOTH MALPHAS!',
          'COLOSSAL SOVEREIGN RISES ON THE EAST ABYSS!',
          '#ef4444',
          3.4
        );
      }
    }

    this.syncStageBadge();
    this.syncRightHUD();
  }

  onBossPhaseShift(_boss, phase) {
    if (!this.active || this.game.isMatchOver) return;
    const anchorX = _boss?.anchorX || this.getBossAnchorX();
    if (phase === 2) {
      // Summon 2 flanking Shackled Pit-Fiends through Hell-Maw Portals
      this.spawnMonster('fiend', Math.max(120, anchorX - 715), { groundY: 484 });
      this.spawnMonster('fiend', Math.max(180, anchorX - 555), { groundY: 638 });
    } else if (phase === 3) {
      this.spawnPickup('relic', Math.max(180, anchorX - 335), 622, { relicAmt: 18 });
    }
  }

  getLivingMonsters() {
    if (!this.game.fighters) return [];
    return this.game.fighters.filter((f) => f && f.team === 2 && !f.isDead);
  }

  getNearestLivingMonster(player) {
    const living = this.getLivingMonsters();
    if (!living.length) return null;
    const pGy = player.groundY || player.y || ADVENTURE_DEPTH_MID_Y;
    let best = living[0];
    let bestScore = Infinity;
    for (const m of living) {
      const mGy = m.groundY || m.y || ADVENTURE_DEPTH_MID_Y;
      const depthDist = m.isColossalBoss ? 0 : (mGy - pGy) * 1.65;
      const d = Math.hypot(m.x - player.x, depthDist) - (m.isBoss ? 55 : 0);
      if (d < bestScore) {
        bestScore = d;
        best = m;
      }
    }
    return best;
  }

  onMonsterDeath(deadMonster) {
    if (!this.active) return;
    this.monstersKilled++;
    const diff = this.getDifficultyConfig();
    const pts = Math.round((deadMonster.scoreValue || 250) * (diff.scoreMult || 1));
    this.score += pts;

    const player = this.game.leftFighter;
    const xpGain = deadMonster.isBoss
      ? 320
      : deadMonster.isMiniBoss
        ? 145
        : deadMonster.isElite
          ? 95
          : 52;
    this.progression.gainXp(xpGain, player);

    if (!deadMonster.isBoss) {
      if (deadMonster.isMiniBoss) {
        // Realm Mini-Boss Wardens drop Ember + Relic Seal + Solar Elixir!
        this.spawnPickup('ember', deadMonster.x, deadMonster.groundY, { ultAmt: 24 });
        this.spawnPickup('relic', deadMonster.x + 48, deadMonster.groundY, { relicAmt: 18 });
        this.spawnPickup('hp', deadMonster.x - 48, deadMonster.groundY);
      } else if (deadMonster.isElite) {
        // Non-Warden Elites drop strictly 1 magnetic Soul Ember (0 HP / 0 Relic)
        this.spawnPickup('ember', deadMonster.x, deadMonster.groundY, { ultAmt: 18 });
      } else {
        // Regular monsters infuse essence directly into gauges with 0 floor drop clutter!
        this.progression.gainAdventureUlt(9, player);
        this.progression.gainSpirit(7);
      }

      const glyphTheme =
        deadMonster.theme === 'forge'
          ? 'forge'
          : deadMonster.theme === 'sanctuary'
            ? 'arcane'
            : deadMonster.theme === 'sylvan'
              ? 'emerald'
              : 'abyssal';
      const vfxRow = deadMonster.getMonsterStageVfxRow?.() ?? 10;
      this.spawnMonsterPlume(
        deadMonster.x,
        deadMonster.groundY,
        vfxRow,
        deadMonster.primaryColor || '#38bdf8',
        deadMonster.isMiniBoss ? 2.4 : deadMonster.isElite ? 1.95 : 1.55,
        deadMonster.isMiniBoss ? 0.62 : 0.48,
        deadMonster.isMiniBoss ? 10 : deadMonster.isElite ? 7 : 5
      );
      this.game.vfx?.spawnGlyphBurst?.(
        deadMonster.x,
        deadMonster.groundY - 64,
        deadMonster.isMiniBoss ? 9 : 5,
        glyphTheme
      );
    }

    if (player && !player.isDead) {
      // Haste Momentum Relic Boon: +16% 3D move speed & -20% Skill & Dodge CDs for 4s after every kill
      if (this.hasRelic('haste_momentum')) {
        this._relicHasteTimer = 4.0;
        if (player.skillCooldown > 0) {
          player.skillCooldown = Math.max(0, player.skillCooldown * 0.94);
        }
        if (player.dodgeCooldown > 0) {
          player.dodgeCooldown = Math.max(0, player.dodgeCooldown * 0.88);
        }
      }
      // Soul-Siphon Cleave Relic Boon: restore 3.5% max HP on every kill
      if (this.hasRelic('soul_siphon_cleave')) {
        player.heal(Math.max(12, Math.round(player.maxHp * 0.035)), 'SOUL SIPHON');
      }
      // Executioner Detonation Relic Boon: slain non-boss foes detonate in a crimson blast
      if (this.hasRelic('executioner_detonation') && !deadMonster.isBoss && !this._inRelicProc) {
        this._inRelicProc = true;
        try {
          const blastDmg = Math.min(320, Math.max(55, Math.round((deadMonster.maxHp || 300) * 0.15)));
          const gx = deadMonster.x;
          const gy = deadMonster.groundY || deadMonster.y || 561;
          this.game.vfx?.spawnShockwave?.(gx, gy - 14, 175, '#f43f5e', 0.30, true);
          this.game.vfx?.spawnBurst?.(gx, gy - 42, 16, '#fb7185', 225, { upBias: 135, size: 5 });
          this.game.audio?.play?.('fire_hit', gx);
          for (const m of this.getLivingMonsters()) {
            if (m === deadMonster || m.isDead) continue;
            const mGy = m.groundY || m.y || 561;
            const dist = m.isColossalBoss
              ? Math.abs((m.anchorX || m.x) - 110 - gx)
              : Math.hypot(m.x - gx, (mGy - gy) * 1.4);
            if (dist <= 185) {
              m.takeDamage(blastDmg, player, true, 120, 0);
              m.addStagger?.(16, player, this.game);
            }
          }
        } finally {
          this._inRelicProc = false;
        }
      }
      if (this.game.vfx) {
        this.game.vfx.spawnDamageText(
          deadMonster.x,
          deadMonster.y - 165,
          0,
          false,
          `+${xpGain} XP • +${pts}`,
          '#fde047'
        );
      }
    }

    // If the Final Boss Malphas was slain, banish any remaining minions and trigger Campaign Victory!
    if (deadMonster.isBoss) {
      for (const m of this.getLivingMonsters()) {
        if (m !== deadMonster && !m.isDead) {
          m.hp = 0;
          m.isDead = true;
          m.setState('DEATH');
        }
      }
      this.completeCampaignVictory(deadMonster);
      return;
    }

    // Warden Bonus Sovereign Relic Draft (up to 4 Relics per run; strictly auto-skipped in simMode/testMode/autoPlay)
    if (deadMonster.isMiniBoss && !deadMonster.isBoss && !this.isRelicDraftOpen) {
      const hasRelicModalDom =
        typeof document !== 'undefined' &&
        typeof document.getElementById === 'function' &&
        Boolean(document.getElementById('adv-relic-draft-modal'));
      if (
        !this.game?.simMode &&
        !this.game?.testModeUnlimitedHp &&
        !this.autoPlay &&
        this.activeRelics.length < ADVENTURE_MAX_RELICS &&
        hasRelicModalDom
      ) {
        this.openRelicDraft(this.zoneIndex, {
          source: 'warden',
          wardenName: deadMonster.name || 'REALM WARDEN'
        });
      }
    }

    this.syncRightHUD();
  }

  completeCampaignVictory(boss) {
    const g = this.game;
    const player = g.leftFighter;
    const activeZones = this.getActiveZones();
    this.lockActive = false;
    this.goPromptActive = false;
    this.zonesCleared[Math.max(0, activeZones.length - 1)] = true;

    g.setPaused?.(false, false);
    g.isMatchOver = true;
    g.koSlowTimer = 0.55;
    g.ultSlowTimer = 0;
    g.deadMatchFighter = boss;
    g.victoryRevealPending = true;
    g.postDeathHoldTimer = 0;

    if (player && !player.isDead) {
      player._manualWalkActive = false;
    }
    if (typeof g.renderer?.triggerKOFinisher === 'function' && player) {
      g.renderer.triggerKOFinisher(
        boss.x,
        boss.y - 110,
        player.primaryColor,
        player.name,
        player.heroId
      );
    }

    // Calculate Arcade Rank & Persist Champion Clear Medal
    const diff = this.getDifficultyConfig();
    const clearSec = Math.max(1, Math.round(g.matchTime || 1));
    const timeBonus = Math.round(Math.max(0, (180 - clearSec) * 20) * (diff.scoreMult || 1));
    this.score += timeBonus;
    const rank =
      this.score >= 8200 ? 'S+ SOLAR SOVEREIGN' : this.score >= 6500 ? 'S RANK' : this.score >= 4800 ? 'A RANK' : 'B RANK';
    if (player?.heroId) {
      saveAdventureMedal(player.heroId, {
        rank,
        score: this.score,
        tier: diff.id
      });
      this.persistHeroProgressIfEnabled({ force: true });
      g.syncAdventureClearMedalsUI?.();
    }

    const hasDom = typeof document !== 'undefined' && typeof document.getElementById === 'function';
    const victoryOverlay = hasDom ? document.getElementById('victory-overlay') : null;
    const eyebrowEl = hasDom ? document.getElementById('victory-eyebrow') : null;
    const winnerEl = hasDom ? document.getElementById('victory-winner') : null;
    const statsEl = hasDom ? document.getElementById('victory-stats') : null;
    const autoEl = hasDom ? document.getElementById('victory-auto-next') : null;
    const nextChallengerBtn = hasDom ? document.getElementById('btn-next-challenger') : null;
    const playAgainBtn = hasDom ? document.getElementById('btn-play-again') : null;
    const selectBtn = hasDom ? document.getElementById('btn-victory-select') : null;
    const titleBtn = hasDom ? document.getElementById('btn-victory-title') : null;

    victoryOverlay?.classList?.remove('is-defeat-plaque');
    nextChallengerBtn?.classList?.add('hidden');
    if (playAgainBtn) playAgainBtn.textContent = 'RETRY CAMPAIGN';
    if (selectBtn) {
      selectBtn.classList?.remove('hidden');
      selectBtn.textContent = 'CHANGE HERO';
    }
    if (titleBtn) {
      titleBtn.classList?.remove('hidden');
      titleBtn.textContent = 'TITLE SCREEN';
    }

    if (eyebrowEl) {
      const tierTag = diff.id !== 'normal' ? ` • ${diff.label}` : '';
      eyebrowEl.textContent = `ADVENTURE CAMPAIGN CLEARED${tierTag} • ${rank} • SCORE: ${this.score}`;
    }
    if (winnerEl && player) {
      winnerEl.textContent = `${player.name.toUpperCase()} CONQUERS THE BLACK PIT`;
    }
    if (statsEl) {
      if (this.activeCampaignPack) {
        const bossTitle = boss?.isBoss ? boss.name : this.getBossConfig().name || 'Archfiend Malphas';
        statsEl.textContent = `${bossTitle} Vanquished! ${this.monstersKilled} Monsters Slain across ${activeZones.length} Realm${activeZones.length === 1 ? '' : 's'} in ${clearSec}s.`;
      } else {
        statsEl.textContent = `Archfiend Malphas Vanquished! ${this.monstersKilled} Monsters Slain across 4 Realms in ${clearSec}s.`;
      }
    }
    if (autoEl) {
      autoEl.classList?.remove('hidden');
      autoEl.textContent = 'CAMPAIGN COMPLETE • PRESS RETRY CAMPAIGN TO REPLAY';
    }

    // Populate Left (Hero) & Right (Abyssal Horde + Boss) Telemetry
    if (hasDom) {
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
      };
      setTxt('tel-left-extra-label', 'MONSTERS SLAIN');
      setTxt('tel-right-skills-label', 'ZONE / PHASE');
      setTxt('tel-right-extra-label', 'RUN SCORE');

      setTxt('tel-left-name', player?.name || 'CHAMPION');
      setTxt('tel-left-dmg', Math.round(player?.stats?.damageDealt || 0));
      setTxt('tel-left-skills', `${player?.stats?.skillsUsed || 0} / ${player?.stats?.ultsUsed || 0}`);
      setTxt('tel-left-max', Math.round(player?.stats?.biggestHit || 0));
      setTxt('tel-left-extra', `${this.monstersKilled} SLAIN`);

      setTxt('tel-right-name', 'ARCHFIEND HORDE');
      setTxt('tel-right-dmg', Math.round(boss?.stats?.damageDealt || 0));
      setTxt('tel-right-skills', `PHASE ${boss?.bossPhase || 3}`);
      setTxt('tel-right-max', Math.round(boss?.stats?.biggestHit || 0));
      setTxt('tel-right-extra', `${this.score} PTS`);
    }

    this.syncControlDeckUI();
    g.updateHUD?.();
  }

  onPlayerDeath(player) {
    const g = this.game;
    if (this.isSkillTreeOpen) {
      this.closeSkillTree(false);
    }
    if (this.isRelicDraftOpen) {
      this.closeRelicDraft(false);
    }
    if (player) {
      if (player._advPureDodge) {
        this.finishHeroAdventureDodge(player, false);
      }
      player._grabbedByBoss = false;
      player._grabbedByBossTimer = 0;
      player._advPureDodge = false;
      player._advDodgeFrameOverride = null;
      if (Number.isFinite(player.groundY) && player.y < player.groundY) {
        player.y = player.groundY;
        player.vy = 0;
      }
    }

    g.setPaused?.(false, false);
    g.isMatchOver = true;
    g.koSlowTimer = 0.48;
    g.deadMatchFighter = player;
    g.victoryRevealPending = true;
    g.postDeathHoldTimer = 0;
    this.persistHeroProgressIfEnabled({ force: true });

    const killer = this.bossEntity || this.getLivingMonsters()[0] || null;
    const killerName = killer && killer !== player ? killer.name : 'ABYSSAL HORDE';
    const hasDom = typeof document !== 'undefined' && typeof document.getElementById === 'function';
    const victoryOverlay = hasDom ? document.getElementById('victory-overlay') : null;
    const eyebrowEl = hasDom ? document.getElementById('victory-eyebrow') : null;
    const winnerEl = hasDom ? document.getElementById('victory-winner') : null;
    const statsEl = hasDom ? document.getElementById('victory-stats') : null;
    const autoEl = hasDom ? document.getElementById('victory-auto-next') : null;
    const nextChallengerBtn = hasDom ? document.getElementById('btn-next-challenger') : null;
    const playAgainBtn = hasDom ? document.getElementById('btn-play-again') : null;
    const selectBtn = hasDom ? document.getElementById('btn-victory-select') : null;
    const titleBtn = hasDom ? document.getElementById('btn-victory-title') : null;

    victoryOverlay?.classList?.add('is-defeat-plaque');
    nextChallengerBtn?.classList?.add('hidden');
    if (playAgainBtn) playAgainBtn.textContent = 'RETRY CAMPAIGN';
    if (selectBtn) {
      selectBtn.classList?.remove('hidden');
      selectBtn.textContent = 'CHANGE HERO';
    }
    if (titleBtn) {
      titleBtn.classList?.remove('hidden');
      titleBtn.textContent = 'TITLE SCREEN';
    }

    if (eyebrowEl) {
      eyebrowEl.textContent = `PILGRIMAGE DEFEAT • ZONE ${this.zoneIndex + 1} • SCORE: ${this.score}`;
    }
    if (winnerEl) {
      winnerEl.textContent = `DEFEATED — ${killerName.toUpperCase()} PREVAILS`;
    }
    if (statsEl) {
      statsEl.textContent = 'The Black Pit claims another soul — spend Skill Points, unleash Overdrive, and retry!';
    }
    if (autoEl) {
      autoEl.classList?.remove('hidden');
      autoEl.textContent = 'PILGRIMAGE FALLEN • CHOOSE RETRY OR CHANGE HERO';
    }

    if (hasDom) {
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
      };
      setTxt('tel-left-extra-label', 'MONSTERS SLAIN');
      setTxt('tel-right-skills-label', 'ZONE / PHASE');
      setTxt('tel-right-extra-label', 'RUN SCORE');

      setTxt('tel-left-name', player?.name || 'CHAMPION');
      setTxt('tel-left-dmg', Math.round(player?.stats?.damageDealt || 0));
      setTxt('tel-left-skills', `${player?.stats?.skillsUsed || 0} / ${player?.stats?.ultsUsed || 0}`);
      setTxt('tel-left-max', Math.round(player?.stats?.biggestHit || 0));
      setTxt('tel-left-extra', `${this.monstersKilled} SLAIN`);

      setTxt('tel-right-name', killerName.toUpperCase());
      setTxt('tel-right-dmg', Math.round(killer?.stats?.damageDealt || 0));
      setTxt(
        'tel-right-skills',
        killer?.isBoss ? `PHASE ${killer.bossPhase || 1}` : `ZONE ${this.zoneIndex + 1}`
      );
      setTxt('tel-right-max', Math.round(killer?.stats?.biggestHit || 0));
      setTxt('tel-right-extra', `${this.score} PTS`);
    }

    this.syncControlDeckUI();
    g.updateHUD?.();
  }

  unlockSubWave(zoneIdx) {
    const activeZones = this.getActiveZones();
    const z = activeZones[zoneIdx] || activeZones[0] || ADVENTURE_ZONES[0];
    this.lockActive = false;
    this.lockMinX = 80;
    this.lockMaxX = z.maxX - 40;

    if (this.game.renderer) {
      this.game.renderer.adventureCamMinX = 0;
      this.game.renderer.adventureCamMaxX = z.maxX;
    }

    this.goPromptActive = true;
    this.goPromptText = zoneIdx === activeZones.length - 1 ? 'THRONE AHEAD! GO!' : 'ADVANCE! GO!';
    this.goBlinkTimer = 0;

    const p = this.game.leftFighter;
    this.progression.gainXp(25, p);
    this.progression.gainAdventureUlt(12, p);
    this.progression.gainSpirit(14);

    if (this.game.audio) {
      this.game.audio.play('reflect', p ? p.x : z.minX + 1040);
    }
  }

  unlockCurrentZone(zoneIdx) {
    const activeZones = this.getActiveZones();
    const worldW = this.getWorldWidth();
    this.zonesCleared[zoneIdx] = true;
    this.lockActive = false;
    const nextZone = activeZones[zoneIdx + 1];
    this.lockMinX = 80;
    this.lockMaxX = nextZone ? nextZone.sub1LockMaxX : worldW - 80;

    if (this.game.renderer) {
      this.game.renderer.adventureCamMinX = 0;
      this.game.renderer.adventureCamMaxX = nextZone ? nextZone.maxX : worldW;
    }

    this.goPromptActive = true;
    this.goPromptText =
      zoneIdx === activeZones.length - 2 ? 'BOSS REALM AHEAD! GO!' : 'CLEAR! GO!';
    this.goBlinkTimer = 0;

    const p = this.game.leftFighter;
    this.progression.gainXp(35, p);
    this.persistHeroProgressIfEnabled({ force: true });

    const curZ = activeZones[zoneIdx];
    const dropBaseX = p
      ? Math.min(this.lockMaxX - 180, p.x + 140)
      : (curZ ? curZ.maxX - 380 : zoneIdx * 2400 + 2020);
    if (!this.activeCampaignPack) {
      if (zoneIdx === 0) {
        this.spawnPickup('ember', dropBaseX, 548, { ultAmt: 16 });
        this.spawnPickup('relic', dropBaseX + 72, 598, { relicAmt: 12 });
      } else if (zoneIdx === 1) {
        this.spawnPickup('relic', dropBaseX + 40, 586, { relicAmt: 12 });
      } else if (zoneIdx === 2) {
        // Sanctuary Boss-Prep Cache staggered across the 3D road before Throne of the Black Pit!
        this.spawnPickup('ember', 6960, 548, { ultAmt: 16 });
        this.spawnPickup('relic', 7048, 608, { relicAmt: 12 });
      }
    } else {
      const midGy = this.depthMidY || 561;
      if (zoneIdx === 0) {
        this.spawnPickup('ember', dropBaseX, midGy - 13, { ultAmt: 16 });
        this.spawnPickup('relic', dropBaseX + 72, midGy + 37, { relicAmt: 12 });
      } else if (zoneIdx === activeZones.length - 2) {
        const prepX = Math.max(160, (curZ?.maxX || 7200) - 240);
        this.spawnPickup('ember', prepX, midGy - 13, { ultAmt: 16 });
        this.spawnPickup('relic', prepX + 88, midGy + 47, { relicAmt: 12 });
      } else {
        this.spawnPickup('relic', dropBaseX + 40, midGy + 25, { relicAmt: 12 });
      }
    }

    if (this.game.audio) {
      this.game.audio.play('reflect', dropBaseX);
    }

    // Zone-Clear Sovereign Relic Altar (up to 4 Relics per run; auto-skipped in simMode / testMode / autoPlay or right after a final-kill Warden draft)
    const hasRelicModalDom =
      typeof document !== 'undefined' &&
      typeof document.getElementById === 'function' &&
      Boolean(document.getElementById('adv-relic-draft-modal'));
    const justDraftedOnSameKill =
      this._lastRelicDraftKillCount >= 0 && this._lastRelicDraftKillCount === this.monstersKilled;
    if (
      zoneIdx < activeZones.length - 1 &&
      !this.game?.simMode &&
      !this.game?.testModeUnlimitedHp &&
      !this.autoPlay &&
      !this.isRelicDraftOpen &&
      !justDraftedOnSameKill &&
      this.activeRelics.length < ADVENTURE_MAX_RELICS &&
      hasRelicModalDom
    ) {
      this.openRelicDraft(zoneIdx, { source: 'zone' });
    }
  }

  updatePickups(dt, player) {
    if (!this.pickups.length) return;
    const pGy = player ? player.groundY || player.y : ADVENTURE_DEPTH_MID_Y;
    const stats = this.progression.getComputedStats();

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      let pkGy = Number.isFinite(pk.groundY) ? pk.groundY : ADVENTURE_DEPTH_MID_Y;
      pk.age += dt;
      if (pk.y < pkGy || pk.vy < 0) {
        pk.vy += 680 * dt;
        pk.y += pk.vy * dt;
        if (pk.y >= pkGy) {
          pk.y = pkGy;
          pk.vy = 0;
        }
      }

      // Magnetic pull on Soul Embers & Astral Relic Shards so kills flow smoothly into Sol's gauges!
      const isMagnetic =
        pk.type === 'ember' || pk.type === 'relic' || pk.type === 'mana' || pk.type === 'ult';
      if (isMagnetic && player && !player.isDead && pk.age >= 0.18) {
        const dx = player.x - pk.x;
        const dz = pGy - pkGy;
        const dist = Math.hypot(dx, dz * 1.35);
        if (dist > 4 && dist <= 265) {
          const pullSpeed = (230 + (265 - dist) * 1.45) * dt;
          pk.x += (dx / dist) * pullSpeed;
          pkGy += (dz / dist) * pullSpeed * 0.85;
          pk.groundY = pkGy;
          if (pk.vy === 0) pk.y = pkGy;
        }
      }

      if (
        player &&
        !player.isDead &&
        Math.abs(player.x - pk.x) <= 78 &&
        Math.abs(pGy - pkGy) <= 68 &&
        Math.abs(player.y - pk.y) <= 110
      ) {
        this.pickups.splice(i, 1);
        const diffPk = this.getDifficultyConfig();
        this.score += Math.round(150 * (diffPk.scoreMult || 1));
        if (this.game.audio) this.game.audio.play('holy_hit', pk.x);
        if (pk.type === 'hp') {
          player.heal(Math.round(player.maxHp * 0.18), 'SOLAR ELIXIR +HP!');
          this.game.vfx?.spawnBurst(pk.x, pk.y - 24, 14, '#4ade80', 190, { upBias: 120, size: 5 });
        } else if (pk.type === 'ember' || pk.type === 'mana') {
          const gainAmt = pk.ultAmt || 16;
          this.progression.gainAdventureUlt(gainAmt, player);
          this.progression.gainSpirit(14);
          if (stats.emberHealPct > 0) {
            player.heal(Math.max(8, Math.round(player.maxHp * stats.emberHealPct)), 'EMBER MEND');
          }
          const odTag = ADVENTURE_HERO_KITS[player.heroId]?.tags?.overdrive || 'DRIVE';
          this.game.vfx?.spawnDamageText(
            player.x,
            player.y - 148,
            0,
            false,
            `+SOUL EMBER (${odTag} ${Math.floor(this.progression.ultCharge)}%)`,
            '#fb923c'
          );
          this.game.vfx?.spawnBurst(pk.x, pk.y - 24, 14, '#fb923c', 190, { upBias: 120, size: 5 });
        } else if (pk.type === 'relic' || pk.type === 'ult') {
          const rAmt = pk.relicAmt || 18;
          this.progression.gainAstralRelic(rAmt, player, `ASTRAL SEAL +${rAmt}%!`);
          this.game.vfx?.spawnBurst(pk.x, pk.y - 24, 18, '#67e8f9', 210, { upBias: 135, size: 5 });
        }
      }
    }
  }

  syncStageBadge() {
    const badge = this.game.hudEls?.stageBadge;
    if (!badge) return;
    const ov = this.game.renderer?.permanentStageOverride;
    const zPrefix = `Z${this.zoneIndex + 1}`;
    let nextText;
    if (ov === 'inferno') {
      nextText = `${zPrefix} • LAYWASTE OF INFERNO`;
    } else if (ov === 'glacial') {
      nextText = `${zPrefix} • PERMAFROST AURORA SANCTUM`;
    } else if (ov === 'shogunate') {
      nextText = `${zPrefix} • CRIMSON MOON SHOGUNATE`;
    } else if (ov === 'shogunate_inferno') {
      nextText = `${zPrefix} • BURNING SAKURA SHOGUNATE`;
    } else if (ov === 'shogunate_glacial') {
      nextText = `${zPrefix} • FROZEN SAKURA SHOGUNATE`;
    } else {
      const activeZones = this.getActiveZones();
      const z = activeZones[this.zoneIndex] || activeZones[0] || ADVENTURE_ZONES[0];
      nextText = z.title;
    }
    if (badge.textContent !== nextText) {
      badge.textContent = nextText;
    }
  }

  syncRightHUD() {
    const g = this.game;
    const rightEls = g.hudEls?.right;
    if (!rightEls) return;

    const living = this.getLivingMonsters();
    const primaryMonster =
      this.bossEntity && !this.bossEntity.isDead
        ? this.bossEntity
        : living.find((m) => m.isMiniBoss) ||
          living.find((m) => m.isElite) ||
          living[0] ||
          g.rightFighter;

    if (primaryMonster) {
      g.rightFighter = primaryMonster;
      // Do NOT show normal enemies on the right-side player HUD during Adventure Mode;
      // Colossal Boss uses the dedicated `#adv-boss-raid-hud` Raid Plaque instead.
      const keepInternalWardenTag = Boolean(primaryMonster.isMiniBoss);
      if (rightEls.name) {
        const nextName = keepInternalWardenTag
          ? living.length > 1
            ? `${primaryMonster.name} (+${living.length - 1})`
            : `${primaryMonster.name}`
          : '';
        if (rightEls.name.textContent !== nextName) {
          rightEls.name.textContent = nextName;
        }
      }
      if (rightEls.skillText) {
        const nextSkill = keepInternalWardenTag
          ? `WARDEN • ${primaryMonster.skillName}`
          : '';
        if (rightEls.skillText.textContent !== nextSkill) {
          rightEls.skillText.textContent = nextSkill;
        }
      }
      if (rightEls.hpBar && primaryMonster.isBoss) {
        const nextBarCls = `hp-fill fill-${primaryMonster.theme || 'abyssal'}`;
        if (rightEls.hpBar.className !== nextBarCls) {
          rightEls.hpBar.className = nextBarCls;
        }
      }
      if (rightEls.partnerWing && !rightEls.partnerWing.classList?.contains?.('hidden')) {
        rightEls.partnerWing.classList?.add?.('hidden');
      }
    }

    // Keep top-left HUD portrait synced to the active Adventure hero across character switches
    const leftHeroId = g.leftFighter?.heroId || g.slot1Hero || 'mage';
    const leftCol = g.leftFighter?.primaryColor || '#fb923c';
    PixelForge.setHUDPortraits(leftHeroId, leftCol, 'archfiend', '#ef4444');

    if (g.hudEls?.crestVs) {
      const activeZones = this.getActiveZones();
      const isFinalBossZone =
        this.zoneIndex === activeZones.length - 1 && this.getBossConfig().enabled !== false;
      const nextCrest = isFinalBossZone ? 'BOSS' : `Z${this.zoneIndex + 1}`;
      if (g.hudEls.crestVs.textContent !== nextCrest) {
        g.hudEls.crestVs.textContent = nextCrest;
      }
    }
    if (g.hudEls?.modeBadge) {
      const diffBadge = this.getDifficultyConfig();
      const tierPrefix = diffBadge.id !== 'normal' ? `${diffBadge.shortLabel} • ` : '';
      let nextBadge;
      if (g.renderer?.isMobilePortrait) {
        const shortWave =
          this.totalWaveLabel === 'COLOSSAL BOSS'
            ? 'BOSS'
            : this.totalWaveLabel.replace('WAVE ', 'W').replace(/\s+/g, '');
        nextBadge = `${tierPrefix}${shortWave} • ${this.score}P`;
      } else {
        nextBadge = `${tierPrefix}LV.${this.progression.level} • ${this.totalWaveLabel} • ${this.score} PTS`;
      }
      if (g.hudEls.modeBadge.textContent !== nextBadge) {
        g.hudEls.modeBadge.textContent = nextBadge;
      }
    }
    g.updateAdventureBossHUD?.();
  }

  pushHeroDodgeTrail(player, entry) {
    if (!player) return;
    if (!player._advDodgeTrails) player._advDodgeTrails = [];
    if (player._advDodgeTrails.length >= 24) player._advDodgeTrails.shift();
    player._advDodgeTrails.push({
      age: 0,
      maxLife: entry.maxLife ?? 0.30,
      layer: entry.layer || 'back',
      kind: entry.kind || 'streak',
      x: entry.x ?? player.x,
      y: entry.y ?? player.groundY,
      w: entry.w ?? 28,
      h: entry.h ?? 4,
      color: entry.color || player.primaryColor || '#38bdf8'
    });
  }

  isImminentEnemyThreat(player) {
    if (!player || player.isDead || !this.game) return false;
    const pGy = Number.isFinite(player.groundY) ? player.groundY : player.y || ADVENTURE_DEPTH_MID_Y;
    const fighters = this.game.fighters || [];
    for (let i = 0; i < fighters.length; i++) {
      const m = fighters[i];
      if (!m || m.team !== 2 || m.isDead) continue;

      // 1. Floor telegraph rings / seismic / charge zones nearing detonation
      if (Array.isArray(m.telegraphRings)) {
        for (let j = 0; j < m.telegraphRings.length; j++) {
          const r = m.telegraphRings[j];
          if (!r) continue;
          const rx = Math.max(66, (r.radius || 76) + 46);
          const rz = Math.max(54, (r.radius || 76) * 0.72 + 32);
          const dur = Math.max(0.1, r.maxDuration || r.duration || 0.9);
          const rem = Number.isFinite(r.timer) ? r.timer : 0.25;
          const u = 1 - rem / dur;
          if (Math.abs(player.x - r.x) <= rx && Math.abs(pGy - r.y) <= rz && (rem <= 0.36 || u >= 0.40)) {
            return true;
          }
        }
      }

      // 2. Active enemy melee / bull-charge / skill attack envelope
      if (m.state === 'AUTO_ATTACK' || m.state === 'SKILL' || m.state === 'DASH') {
        const mGy = Number.isFinite(m.groundY) ? m.groundY : m.y || ADVENTURE_DEPTH_MID_Y;
        const reachX = Math.max(155, (m.attackRange || 112) + 58);
        if (
          Math.abs(player.x - m.x) <= reachX &&
          Math.abs(pGy - mGy) <= 78 &&
          (!m.didActionFrame || (m.stateTimer || 0) <= 0.45)
        ) {
          return true;
        }
      }

      // 3. Colossal Boss Malphas lane sweeps / siege grab / seismic slam
      if (m.isColossalBoss) {
        const laneGy =
          m.rakeWarnOnly || m.rakeActive
            ? m.rakeLaneGy || 561
            : m.grabWarnOnly || m.grabActive || m.bossAction === 'claw_grab'
              ? m.grabLaneGy || 561
              : m.bossAction === 'claw_sweep'
                ? m.sweepLane === 'upper'
                  ? 504
                  : 620
                : null;
        if (laneGy !== null && Math.abs(pGy - laneGy) <= 72) {
          return true;
        }
        if (m.fistVisible) {
          const sdx = Math.abs(player.x - (m.slamTargetX || 8920));
          const sdz = Math.abs(pGy - (m.slamTargetGy || 561));
          if (sdx <= 158 && sdz <= 76) return true;
        }
      }
    }

    // 4. Incoming hostile enemy projectiles within close evade window
    const projs = this.game.vfx?.projectiles;
    if (Array.isArray(projs)) {
      for (let i = 0; i < projs.length; i++) {
        const p = projs[i];
        if (!p || !p.owner || p.owner.team !== 2) continue;
        const pGyProj = Number.isFinite(p.owner.groundY) ? p.owner.groundY : p.y;
        const dxP = player.x - p.x;
        if (
          Math.abs(dxP) <= 170 &&
          Math.abs(pGy - pGyProj) <= 64 &&
          (Math.abs(dxP) <= 72 || dxP * (p.vx || 0) >= 0)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  triggerPerfectDodge(player) {
    if (!player || player._advPerfectDodgeTriggered) return false;
    player._advPerfectDodgeTriggered = true;
    this._perfectDodgeSlowTimer = 0.20;
    this._perfectDodgeBannerTimer = 1.10;
    this.perfectDodgeCount = (this.perfectDodgeCount || 0) + 1;

    // Pure non-attacking reward (Suite 17E compliant: 0 projectiles, 0 decoys, 0 damage during dodge!)
    this.progression.gainSpirit(25);
    player._phantomEmpowerReady = true;
    player._phantomEmpowerTimer = 4.5;

    this.game?.audio?.play?.('reflect', player.x);
    this.game?.vfx?.spawnShockwave?.(player.x, (player.groundY || player.y) - 16, 118, '#67e8f9', 0.26, true);
    this.game?.vfx?.spawnBurst?.(player.x, player.y - 68, 14, '#fef08a', 190, { upBias: 115, size: 4.5 });
    this.game?.vfx?.spawnDamageText?.(
      player.x,
      player.y - 162,
      0,
      true,
      'PHANTOM EVADE! +25 SP',
      '#67e8f9'
    );
    return true;
  }

  onPlayerHitMonsterRelicProc(attacker, monster, dealt, isCrit = false, procOpts = {}) {
    if (!this.active || !attacker || !monster || this._inRelicProc) return;
    this._inRelicProc = true;
    try {
      // 1. Chain Lightning Strikes: every 3rd hit arcs to up to 2 nearby living monsters
      if (this.hasRelic('chain_lightning')) {
        this._relicHitCounter = (this._relicHitCounter || 0) + 1;
        if (this._relicHitCounter % 3 === 0) {
          const arcDmg = Math.max(18, Math.round((dealt || 40) * 0.45));
          const sx = monster.isColossalBoss ? (monster.anchorX || monster.x) - 110 : monster.x;
          const sy = (monster.groundY || monster.y || 561) - 62;
          const candidates = this.getLivingMonsters()
            .filter((m) => m !== monster && !m.isDead)
            .map((m) => {
              const mx = m.isColossalBoss ? (m.anchorX || m.x) - 110 : m.x;
              const my = (m.groundY || m.y || 561) - 62;
              return { m, mx, my, d: Math.hypot(mx - sx, (my - sy) * 1.3) };
            })
            .filter((c) => c.d <= 340)
            .sort((a, b) => a.d - b.d)
            .slice(0, 2);

          if (candidates.length > 0) {
            this.game?.audio?.play?.('raijin_slash', sx);
            for (const c of candidates) {
              this._relicChainArcs.push({
                x1: sx,
                y1: sy,
                x2: c.mx,
                y2: c.my,
                age: 0,
                maxLife: 0.24,
                seed: (sx + c.mx) * 0.07
              });
              c.m.takeDamage(arcDmg, attacker, isCrit, 40, 0);
              c.m.addStagger?.(8, attacker, this.game);
            }
          }
        }
      }

      // 2. Frostbite Shatter: Crits & Skills chill foes (-28% move/attack speed for 2.4s)
      if (
        this.hasRelic('frostbite_shatter') &&
        !monster.isDead &&
        (isCrit || attacker.state === 'SKILL')
      ) {
        const wasChilled = (monster._chillTimer || 0) > 0;
        monster._chillTimer = Math.max(monster._chillTimer || 0, 2.4);
        if (!wasChilled && this.game?.vfx) {
          const fxX = monster.isColossalBoss ? (monster.anchorX || monster.x) - 110 : monster.x;
          const fxY = (monster.groundY || monster.y || 561) - 64;
          this.game.vfx.spawnBurst(fxX, fxY, 8, '#67e8f9', 155, { upBias: 95, size: 4 });
        }
      }

      // 3. Phantom Counter-Wave: Phantom Evade empowered strike unleashes a piercing 220px astral shockwave (+110 AoE DMG + 25 Stagger)
      if (procOpts?.consumedPhantomEmpower && this.hasRelic('phantom_counter_wave')) {
        const dir = (attacker.facing || 1) >= 0 ? 1 : -1;
        const ox = attacker.x;
        const ogy = Number.isFinite(attacker.groundY) ? attacker.groundY : attacker.y || ADVENTURE_DEPTH_MID_Y;
        const waveRange = 220;
        this._relicCounterWaves.push({
          x: ox,
          groundY: ogy,
          dir,
          range: waveRange,
          age: 0,
          maxLife: 0.28
        });
        this.game?.audio?.play?.('raijin_slash', ox);
        this.game?.vfx?.spawnShockwave?.(ox + dir * 70, ogy - 22, 165, '#38bdf8', 0.30, true);
        this.game?.vfx?.spawnDamageText?.(
          ox + dir * 48,
          ogy - 168,
          0,
          true,
          'COUNTER-WAVE!',
          '#38bdf8'
        );
        for (const m of this.getLivingMonsters()) {
          if (m.isDead) continue;
          const mx = m.isColossalBoss ? (m.anchorX || m.x) - 110 : m.x;
          const mGy = m.groundY || m.y || ADVENTURE_DEPTH_MID_Y;
          const along = (mx - ox) * dir;
          const dz = m.isColossalBoss ? 0 : Math.abs(mGy - ogy);
          if (along >= -28 && along <= waveRange + 24 && dz <= 95) {
            m.takeDamage(110, attacker, true, dir * 135, 0);
            m.addStagger?.(25, attacker, this.game);
          }
        }
      }

      // 4. Executioner Detonation: execute non-boss foes below 18% HP immediately
      if (
        this.hasRelic('executioner_detonation') &&
        !monster.isDead &&
        !monster.isBoss &&
        monster.hp > 0 &&
        monster.hp / Math.max(1, monster.maxHp || 1) <= 0.18
      ) {
        this.game?.vfx?.spawnDamageText?.(
          monster.x,
          (monster.y || monster.groundY || 561) - 138,
          0,
          true,
          'EXECUTED!',
          '#f43f5e'
        );
        monster.takeDamage(monster.hp + 999, attacker, true, 0, 0);
      }
    } finally {
      this._inRelicProc = false;
    }
  }

  onMonsterGuardBroken(monster, attacker = null) {
    if (!this.active || !monster) return;
    const player = attacker && !attacker.isMonster ? attacker : this.game?.leftFighter;
    if (!player || player.isDead) return;

    // Frostbite Shatter: Guard Break shatters chilled/staggered foes for +85 bonus frost DMG
    if (this.hasRelic('frostbite_shatter') && !monster.isDead) {
      const prevProc = this._inRelicProc;
      this._inRelicProc = true;
      try {
        const sx = monster.isColossalBoss ? (monster.anchorX || monster.x) - 110 : monster.x;
        const sy = (monster.groundY || monster.y || 561) - 68;
        this.game?.audio?.play?.('ice_shatter', sx);
        this.game?.vfx?.spawnShockwave?.(sx, sy + 42, 165, '#67e8f9', 0.34, true);
        this.game?.vfx?.spawnBurst?.(sx, sy, 18, '#67e8f9', 240, { upBias: 145, size: 5 });
        this.game?.vfx?.spawnDamageText?.(sx, sy - 92, 0, true, 'FROST SHATTER! +85', '#67e8f9');
        monster.takeDamage(85, player, true, 0, 0);
      } finally {
        this._inRelicProc = prevProc;
      }
    }

    // Guard-Break Siphon: restores 10% max HP, +35 Spirit, and +20% Overdrive charge
    if (this.hasRelic('guard_break_siphon')) {
      const healAmt = Math.max(20, Math.round((player.maxHp || 1040) * 0.10));
      if (player._advOrig && typeof player._advOrig.heal === 'function') {
        player._advOrig.heal(healAmt, 'GUARD SIPHON +HP');
      } else {
        player.heal?.(healAmt, 'GUARD SIPHON +HP');
      }
      this.progression.gainSpirit(35);
      this.progression.gainAdventureUlt(20, player);
      this.game?.vfx?.spawnBurst?.(player.x, (player.y || player.groundY || 561) - 72, 16, '#4ade80', 200, {
        upBias: 135,
        size: 5
      });
      this.game?.vfx?.spawnDamageText?.(
        player.x,
        (player.y || player.groundY || 561) - 172,
        0,
        true,
        'SIPHON BREAK! +10% HP',
        '#4ade80'
      );
    }
  }

  onPlayerCastSkillOrOverdrive(player) {
    if (!this.active || !player || player.isDead) return;
    if (!this.hasRelic('meteor_calldown')) return;
    this._relicMeteorCastCount = (this._relicMeteorCastCount || 0) + 1;
    if (this._relicMeteorCastCount % 4 !== 0) return;

    const target = this.getNearestLivingMonster(player);
    const dir = (player.facing || 1) >= 0 ? 1 : -1;
    const tx = target
      ? target.isColossalBoss
        ? (target.anchorX || target.x) - 110
        : target.x
      : Math.max(90, Math.min(this.getWorldWidth() - 90, player.x + dir * 210));
    const tgy = target
      ? target.groundY || target.y || ADVENTURE_DEPTH_MID_Y
      : player.groundY || ADVENTURE_DEPTH_MID_Y;

    this._relicMeteors.push({
      x: tx,
      groundY: tgy,
      timer: 0.34,
      maxTimer: 0.34,
      radius: 175
    });
    this.game?.audio?.play?.('eclipse_charge', tx);
    this.game?.vfx?.spawnDamageText?.(tx, tgy - 165, 0, true, 'SOLAR METEOR!', '#f97316');
  }

  queueTwinSpiritEcho(player) {
    if (!player || !this.hasRelic('twin_spirit_echo')) return;
    const facing = player.facing || 1;
    const ex = Math.max(
      90,
      Math.min(this.getWorldWidth() - 90, player.x + facing * 124)
    );
    const egy = Number.isFinite(player.groundY) ? player.groundY : ADVENTURE_DEPTH_MID_Y;
    this._relicSkillEchoes.push({
      x: ex,
      groundY: egy,
      timer: 0.38,
      maxTimer: 0.38
    });
  }

  updateRelicEffects(dt, player) {
    // 1. Decay Chain Lightning arcs
    for (let i = this._relicChainArcs.length - 1; i >= 0; i--) {
      const arc = this._relicChainArcs[i];
      arc.age += dt;
      if (arc.age >= arc.maxLife) {
        this._relicChainArcs.splice(i, 1);
      }
    }

    // 2. Tick Exploding Dodge Mirage mines
    for (let i = this._relicDodgeMines.length - 1; i >= 0; i--) {
      const mine = this._relicDodgeMines[i];
      mine.timer -= dt;
      if (mine.timer <= 0) {
        this._relicDodgeMines.splice(i, 1);
        this.game?.audio?.play?.('fire_hit', mine.x);
        this.game?.vfx?.spawnShockwave?.(mine.x, mine.groundY - 12, 165, '#fb923c', 0.30, true);
        this.game?.vfx?.spawnBurst?.(mine.x, mine.groundY - 38, 16, '#fef08a', 220, { upBias: 140, size: 5 });
        if (player && !player.isDead) {
          this._inRelicProc = true;
          try {
            for (const m of this.getLivingMonsters()) {
              const mGy = m.groundY || m.y || 561;
              const dist = m.isColossalBoss
                ? Math.abs((m.anchorX || m.x) - 110 - mine.x)
                : Math.hypot(m.x - mine.x, (mGy - mine.groundY) * 1.35);
              if (dist <= 170) {
                m.takeDamage(135, player, true, 120, 0);
                m.addStagger?.(14, player, this.game);
              }
            }
          } finally {
            this._inRelicProc = false;
          }
        }
      }
    }

    // 3. Tick Twin Spirit Skill Echoes
    for (let i = this._relicSkillEchoes.length - 1; i >= 0; i--) {
      const echo = this._relicSkillEchoes[i];
      echo.timer -= dt;
      if (echo.timer <= 0) {
        this._relicSkillEchoes.splice(i, 1);
        this.game?.audio?.play?.('holy_hit', echo.x);
        this.game?.vfx?.spawnShockwave?.(echo.x, echo.groundY - 14, 175, '#c084fc', 0.32, true);
        this.game?.vfx?.spawnBurst?.(echo.x, echo.groundY - 44, 14, '#e879f9', 205, { upBias: 135, size: 4.5 });
        this.progression.gainSpirit(12);
        if (player && !player.isDead) {
          this._inRelicProc = true;
          try {
            for (const m of this.getLivingMonsters()) {
              const mGy = m.groundY || m.y || 561;
              const dist = m.isColossalBoss
                ? Math.abs((m.anchorX || m.x) - 110 - echo.x)
                : Math.hypot(m.x - echo.x, (mGy - echo.groundY) * 1.35);
              if (dist <= 185) {
                m.takeDamage(145, player, true, 90, 0);
                m.addStagger?.(18, player, this.game);
              }
            }
          } finally {
            this._inRelicProc = false;
          }
        }
      }
    }

    // 4. Tick Orbiting Aegis Runes
    if (this.hasRelic('orbiting_aegis_runes') && player && !player.isDead) {
      this._relicAegisOrbitT += dt * 3.4;
      this._relicAegisZapCd = Math.max(0, (this._relicAegisZapCd || 0) - dt);
      if (this._relicAegisZapCd <= 0) {
        const pGy = Number.isFinite(player.groundY) ? player.groundY : 561;
        let closest = null;
        let closestD = 148;
        for (const m of this.getLivingMonsters()) {
          const mGy = m.groundY || m.y || 561;
          const d = m.isColossalBoss
            ? Math.abs((m.anchorX || m.x) - 110 - player.x)
            : Math.hypot(m.x - player.x, (mGy - pGy) * 1.35);
          if (d < closestD) {
            closestD = d;
            closest = m;
          }
        }
        if (closest) {
          this._relicAegisZapCd = 0.90;
          const mx = closest.isColossalBoss ? (closest.anchorX || closest.x) - 110 : closest.x;
          const my = (closest.groundY || closest.y || 561) - 58;
          this._relicChainArcs.push({
            x1: player.x,
            y1: (player.y || pGy) - 56,
            x2: mx,
            y2: my,
            age: 0,
            maxLife: 0.20,
            seed: this._relicAegisOrbitT,
            color: '#facc15'
          });
          this._inRelicProc = true;
          try {
            closest.takeDamage(42, player, false, 35, 0);
            closest.addStagger?.(8, player, this.game);
          } finally {
            this._inRelicProc = false;
          }
        }
      }
    }

    // 5. Decay Haste Momentum Kill Buff (4s)
    if ((this._relicHasteTimer || 0) > 0) {
      this._relicHasteTimer = Math.max(0, this._relicHasteTimer - dt);
    }

    // 6. Decay Phantom Counter-Wave visual sweeps
    if (this._relicCounterWaves?.length > 0) {
      for (let i = this._relicCounterWaves.length - 1; i >= 0; i--) {
        const w = this._relicCounterWaves[i];
        w.age += dt;
        if (w.age >= w.maxLife) {
          this._relicCounterWaves.splice(i, 1);
        }
      }
    }

    // 7. Tick Solar Meteor Calldown impacts (210 AoE DMG + 24 Stagger)
    if (this._relicMeteors?.length > 0) {
      for (let i = this._relicMeteors.length - 1; i >= 0; i--) {
        const met = this._relicMeteors[i];
        met.timer -= dt;
        if (met.timer <= 0) {
          this._relicMeteors.splice(i, 1);
          this.game?.audio?.play?.('fire_hit', met.x);
          this.game?.renderer?.triggerShake?.(10, 0.22);
          this.game?.vfx?.spawnShockwave?.(met.x, met.groundY - 12, met.radius || 175, '#f97316', 0.36, true);
          this.game?.vfx?.spawnBurst?.(met.x, met.groundY - 40, 22, '#fde047', 255, { upBias: 165, size: 6 });
          if (player && !player.isDead) {
            this._inRelicProc = true;
            try {
              for (const m of this.getLivingMonsters()) {
                const mGy = m.groundY || m.y || 561;
                const dist = m.isColossalBoss
                  ? Math.abs((m.anchorX || m.x) - 110 - met.x)
                  : Math.hypot(m.x - met.x, (mGy - met.groundY) * 1.35);
                if (dist <= (met.radius || 175) + 16) {
                  m.takeDamage(210, player, true, 125, 0);
                  m.addStagger?.(24, player, this.game);
                }
              }
            } finally {
              this._inRelicProc = false;
            }
          }
        }
      }
    }
  }

  finishHeroAdventureDodge(player, returnToIdle = true) {
    if (!player) return;
    const heroId = player.heroId || 'mage';
    const baseHeroId = heroId.endsWith('_ex') ? heroId.slice(0, -3) : heroId;
    const dodgeOriginX = player._advDodgeStartX;
    const dodgeOriginGy = player._advDodgeStartGy;
    player._advPureDodge = false;
    player._advDodgeFrameOverride = null;
    player._advDodgeGhostStep = 0;
    player._advDodgeArrivalDone = false;
    player._advPerfectDodgeTriggered = false;
    player._advDodgeStartX = null;
    player._advDodgeStartGy = null;
    player.isInvulnerable = false;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY;
    if (baseHeroId === 'priestess') {
      player.isAngelicAscent = false;
    } else if (baseHeroId === 'reaper' || baseHeroId === 'mage') {
      player.wraithAlpha = 1.0;
    } else if (baseHeroId === 'titan') {
      player.unstoppablePoise = false;
    }
    if (returnToIdle && !player.isDead && player.state === 'DODGE') {
      player.setState('IDLE');
    }
    // Exploding Dodge Afterimage Relic Boon: detonates at dodge origin AFTER pure dodge finishes!
    if (
      returnToIdle &&
      !player.isDead &&
      this.hasRelic('exploding_dodge') &&
      Number.isFinite(dodgeOriginX)
    ) {
      this._relicDodgeMines.push({
        x: dodgeOriginX,
        groundY: Number.isFinite(dodgeOriginGy) ? dodgeOriginGy : player.groundY || ADVENTURE_DEPTH_MID_Y,
        timer: 0.22,
        maxTimer: 0.22
      });
    }
  }

  startHeroAdventureDodge(player, evadeX, evadeZ, stats) {
    if (!player) return;
    const heroId = player.heroId || 'mage';
    const isExHero = heroId.endsWith('_ex');
    const dodgeStyle = heroId === 'warrior_ex' ? 'warrior_ex' : isExHero ? heroId.slice(0, -3) : heroId;
    if (Math.abs(evadeX) > 0.15) {
      player.facing = evadeX > 0 ? 1 : -1;
    }
    this.dodgeCdMax = Math.max(0.55, 1.35 * (stats?.mobilityCdMult ?? 1));
    player.dodgeCooldown = this.dodgeCdMax;
    player.dashDir = evadeX >= 0 ? 1 : -1;
    player._advPureDodge = true;
    player._advPureDodgeTimer = 0;
    player._advPureDodgeDur = 0.28;
    player._advPureDodgeDirX = evadeX;
    player._advPureDodgeDirZ = evadeZ;
    player._advDodgeStartX = player.x;
    player._advDodgeStartGy = Number.isFinite(player.groundY) ? player.groundY : player.y;
    player._advPerfectDodgeTriggered = false;
    player._advDodgeGhostStep = 0;
    player._advDodgeTrailAccum = 0;
    player._advDodgeArrivalDone = false;
    player._advVaultVelZ = 0;

    let speedMult = 1.08;
    let initFrame = 184;
    if (heroId === 'valkyrie') {
      speedMult = 1.08;
      initFrame = 124; // Row 4 Twin-Winged Sovereign Glide pose!
    } else if (heroId === 'valkyrie_ex') {
      speedMult = 1.12;
      initFrame = 183; // Standard Row 6 EX Sovereign Winged Glide!
    } else if (dodgeStyle === 'icemage') {
      speedMult = 1.14;
      initFrame = 182; // Row 6 Figure-Skating Ice-Slide!
    } else if (dodgeStyle === 'android') {
      speedMult = 1.16;
      initFrame = 184; // Row 6 Rocket-Thruster Boost!
    } else if (dodgeStyle === 'priestess') {
      speedMult = 1.06;
      initFrame = 182; // Row 6 + Seraphim 30f Archangel Wings!
    } else if (dodgeStyle === 'mage') {
      speedMult = 1.12;
      initFrame = 180; // Row 6 Solar Phoenix Fire-Blink!
    } else if (heroId === 'archer') {
      speedMult = 1.12;
      initFrame = 244; // Row 8 Sylvan Zephyr Wind-Vault!
    } else if (heroId === 'archer_ex') {
      speedMult = 1.14;
      initFrame = 183; // Standard Row 6 EX Astral Zephyr Vault!
    } else if (dodgeStyle === 'reaper') {
      speedMult = 1.12;
      initFrame = 183; // Row 6 Abyssal Wraith Shadow-Shift!
    } else if (dodgeStyle === 'chronomancer') {
      speedMult = 1.14;
      initFrame = 182; // Row 6 Horological Time-Warp!
    } else if (heroId === 'warrior') {
      speedMult = 1.10;
      initFrame = 184; // Row 6 Celestial Runic Flash-Step!
    } else if (heroId === 'warrior_ex') {
      speedMult = 1.15;
      initFrame = 183; // Row 6 Exvius Sword-Drag Flash-Step Blitz!
    } else if (dodgeStyle === 'ronin') {
      speedMult = 1.16;
      initFrame = 185; // Row 6 Lightning Suriashi Slide!
    } else if (dodgeStyle === 'titan') {
      speedMult = 1.08;
      initFrame = 183; // Row 6 Molten Bull-Rush Stride!
    }
    player._advDodgeSpeedMult = speedMult;
    player._advDodgeFrameOverride = initFrame;

    player.setState('DODGE');
    player._advPureDodge = true;
    player._advDodgeFrameOverride = initFrame;
    player.dashDuration = 0.28;
    player.isInvulnerable = true;
    player.isFlipVault = false;
    player.isWraithPhase = false;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY;

    this.progression.gainSpirit(18);
    if (this.isImminentEnemyThreat(player)) {
      this.triggerPerfectDodge(player);
    }
    const audio = this.game?.audio;
    const vfx = this.game?.vfx;

    // Trigger each champion's signature non-attacking Dodge Shaders, Wings, Thrusters & SFX (0 projectiles / 0 damage!)
    switch (dodgeStyle) {
      case 'valkyrie': {
        // Freyja (`GLIDE` — Wings Icon): Sovereign Winged Glide + 6-Pinion Valkyrie Light-Wings & Feather Slipstream!
        audio?.play?.('dash_whoosh', player.x);
        player.fx?.spawn('valhallaGroundBurst', player.x, player.groundY, {
          light: 1.06,
          extra: { radius: 26 }
        });
        player.fx?.spawn('valkyrieWingPlume', player.x - player.facing * 18, player.y - 116, {
          follow: player,
          offsetX: -18,
          offsetY: -116,
          flip: player.facing < 0,
          maxDuration: 0.30,
          light: 1.14,
          extra: { wingSpan: 28 }
        });
        player.fx?.spawn('valkyrieSlipstreamTrail', player.x - player.facing * 18, player.y - 94, {
          follow: player,
          offsetX: -18,
          offsetY: -94,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.04,
          extra: { length: 28, tilt: -0.08 }
        });
        vfx?.spawnShockwave?.(player.x, player.groundY - 4, 56, '#fbbf24', 0.20, true);
        break;
      }
      case 'icemage': {
        // Lyra (`SKATE` — Skate Icon): Graceful Figure-Skating Ice Slide + Glacial Skate Ribbon & Frost Track!
        audio?.play?.('frost_cast', player.x);
        audio?.play?.('dash_whoosh', player.x);
        player.ensureGlacialSkateRibbon?.();
        player.fx?.spawn('permafrostSnowflakeSigil', player.x, player.groundY - 4, {
          maxDuration: 0.30,
          light: 1.08,
          extra: { radius: 24 }
        });
        player.spawnPixelFrostRing?.(player.x, player.groundY - 10, 52, '#67e8f9', 0.20, true, false);
        this.pushHeroDodgeTrail(player, {
          kind: 'ice_track',
          layer: 'back',
          x: player.x,
          y: player.groundY - 2,
          w: 34,
          maxLife: 0.38
        });
        break;
      }
      case 'android': {
        // VEX-09 (`THRUST` — Rocket Icon): Twin Wing-Pylon Rocket-Thruster Boost & Neon Plasma Exhaust!
        audio?.play?.('dash_whoosh', player.x);
        player.fx?.spawn('wingPylonThruster', player.x - player.facing * 18, player.y - 132, {
          follow: player,
          offsetX: -18,
          offsetY: -132,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.08,
          extra: { length: 28, tilt: -0.82 }
        });
        player.fx?.spawn('wingPylonThruster', player.x - player.facing * 20, player.y - 98, {
          follow: player,
          offsetX: -20,
          offsetY: -98,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.04,
          extra: { length: 24, tilt: -0.84 }
        });
        player.fx?.spawn('cyberImpactSpark', player.x - player.facing * 16, player.groundY - 88, {
          flip: player.facing < 0,
          light: 1.10
        });
        vfx?.spawnShockwave?.(player.x, player.groundY - 6, 56, '#00f0ff', 0.18, true);
        break;
      }
      case 'priestess': {
        // Seraphina (`GLIDE` — Wings Icon): Unfurls her 30-frame `seraphim_wings.png` Archangel Wings & Radiant Slipstream!
        player.isAngelicAscent = true;
        audio?.play?.('holy_bolt', player.x);
        player.ensureSlipstream?.();
        player.fx?.spawn('graceHealBloom', player.x, player.groundY, {
          follow: player,
          offsetX: 0,
          offsetY: 0,
          useGroundY: true,
          maxDuration: 0.28,
          light: 1.12
        });
        vfx?.spawnGlyphBurst?.(player.x, player.groundY - 94, 5, 'radiant');
        break;
      }
      case 'mage': {
        // Ignis Sol (`BLINK` — Flame Rift Icon): Solar Phoenix Fire-Blink Rift & Blazing Glide Trail!
        audio?.play?.('blink', player.x);
        player.fx?.spawn('arcaneBlinkRift', player.x, player.groundY, {
          light: 1.24,
          extra: { isArrival: false }
        });
        player.ensureSolarGlideTrail?.();
        player.spawnSolarEcho?.(182, 0.85, 0.24);
        vfx?.spawnGlyphBurst?.(player.x, player.groundY - 92, 5, 'arcane');
        break;
      }
      case 'archer': {
        // Sylvara (`DASH` — Sylvan Wind Icon): Acrobatic Zephyr Wind-Vault + Astral Emerald Wing-Plume!
        audio?.play?.('zephyr_flip', player.x);
        player.fx?.spawn('zephyrGroundBurst', player.x, player.groundY, {
          light: 1.05,
          extra: { radius: 26 }
        });
        player.fx?.spawn('zephyrVaultSlipstream', player.x - player.facing * 14, player.y - 104, {
          follow: player,
          offsetX: -14,
          offsetY: -104,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.06,
          extra: { length: 28, tilt: -0.14 }
        });
        player.fx?.spawn('astralWingPlume', player.x - player.facing * 14, player.y - 110, {
          follow: player,
          offsetX: -14,
          offsetY: -110,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.08,
          extra: { wingSpan: 24 }
        });
        break;
      }
      case 'reaper': {
        // Malakor (`SHIFT` — Abyssal Wraith Icon): Ghostly Translucent Wraith Shadow-Shift & Rift Portal!
        audio?.play?.('dash_whoosh', player.x);
        player.wraithAlpha = 0.34;
        player.fx?.spawn('companionSummonRiftPortal', player.x, player.groundY - 4, {
          light: 1.18,
          extra: { radius: 26, isCrimson: false, customDuration: 0.28 }
        });
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, 4, 0.22);
        break;
      }
      case 'chronomancer': {
        // Chronos (`WARP` — Clockwork Portal Icon): Horological Time-Warp Rift + Paradox Temporal Echoes!
        audio?.play?.('time_rewind', player.x);
        player.fx?.spawn('warpPortalPairRift', player.x, player.groundY - 92, {
          flip: player.facing < 0,
          light: 1.22,
          extra: { isArrival: false }
        });
        player.spawnTemporalEcho?.(182);
        vfx?.spawnGlyphBurst?.(player.x, player.groundY - 92, 4, 'chrono');
        break;
      }
      case 'warrior': {
        // Aethelgard (`STEP` — Runic Flash-Step Icon): Celestial Paladin Runic Teleport Pillar & Speed-Mirage!
        audio?.play?.('dash_whoosh', player.x);
        player.fx?.spawn('blinkTeleportPillar', player.x, player.groundY, {
          maxDuration: 0.24,
          light: 1.16,
          extra: { width: 22, height: 138 }
        });
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, 4, 0.20);
        vfx?.spawnShockwave?.(player.x, player.groundY - 4, 54, '#38bdf8', 0.18, true);
        break;
      }
      case 'warrior_ex': {
        // Aethelgard EX (`BLITZ` — Sword-Drag Flash-Step Icon): Low Exvius Sword-Drag Cinder Blitz & Astral Mirage!
        audio?.play?.('dash_whoosh', player.x);
        player.fx?.spawn('blinkTeleportPillar', player.x, player.groundY, {
          maxDuration: 0.22,
          light: 1.22,
          extra: { width: 24, height: 142 }
        });
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, 4, 0.22, 'gold');
        vfx?.spawnShockwave?.(player.x, player.groundY - 4, 60, '#facc15', 0.18, true);
        break;
      }
      case 'ronin': {
        // Kaze-Maru (`SURIASHI` — Lightning Footwork Icon): Grounded Lightning Shunpo / Suriashi Slide!
        audio?.play?.('dash_whoosh', player.x);
        player.spawnSayaGlint?.(false);
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, 5, 0.20, 0);
        vfx?.spawnShockwave?.(player.x, player.groundY - 4, 52, '#38bdf8', 0.16, true);
        break;
      }
      case 'titan': {
        // Torgar (`STRIDE` — Molten Forge Icon): Unstoppable Khazad Bull-Rush Stride & Molten Anvil Sparks!
        audio?.play?.('dash_whoosh', player.x);
        player.unstoppablePoise = true;
        player.fx?.spawn('runicBulwarkDome', player.x, player.y - 78, {
          follow: player,
          offsetX: 0,
          offsetY: -78,
          flip: player.facing < 0,
          maxDuration: 0.28,
          light: 1.12
        });
        player.fx?.spawn('moltenAnvilSparks', player.x, player.groundY - 10, {
          flip: player.facing < 0,
          light: 1.14
        });
        this.game?.renderer?.triggerShake?.(3.5, 0.08);
        vfx?.spawnShockwave?.(player.x, player.groundY - 4, 58, '#f59e0b', 0.20, true);
        break;
      }
      default: {
        audio?.play?.('dash_whoosh', player.x);
        vfx?.spawnShockwave?.(player.x, player.groundY - 6, 46, '#bae6fd', 0.18, true);
        break;
      }
    }
  }

  updateHeroAdventureDodge(dt, player) {
    player._manualWalkActive = false;
    player._manualSpeedRatio = 0;
    if (player.isDead || player.state !== 'DODGE') {
      this.finishHeroAdventureDodge(player, false);
      return false;
    }

    const heroId = player.heroId || 'mage';
    const isExHero = heroId.endsWith('_ex');
    const dodgeStyle = heroId === 'warrior_ex' ? 'warrior_ex' : isExHero ? heroId.slice(0, -3) : heroId;
    player._advPureDodgeTimer = (player._advPureDodgeTimer || 0) + dt;
    if (
      !player._advPerfectDodgeTriggered &&
      player._advPureDodgeTimer <= 0.24 &&
      this.isImminentEnemyThreat(player)
    ) {
      this.triggerPerfectDodge(player);
    }
    const dur = player._advPureDodgeDur || 0.28;
    const u = Math.min(1, player._advPureDodgeTimer / dur);

    // Hero-specific velocity curve (Lyra SKATE glides smoothly with minimal friction; THRUST/SURIASHI burst fast!)
    const speedMult = player._advDodgeSpeedMult || 1.08;
    const speedScale =
      dodgeStyle === 'icemage'
        ? speedMult * (1.24 - 0.28 * u)
        : speedMult * 1.36 * (1 - 0.56 * u * u);
    player.x += (player._advPureDodgeDirX || 0) * 580 * speedScale * dt;
    this.shiftEntityDepth(player, (player._advPureDodgeDirZ || 0) * 355 * speedScale * dt);

    // Hero-specific vertical flight / hover / skate profile & exact sprite frame slice
    let liftY = 0;
    if (heroId === 'valkyrie') {
      liftY = Math.sin(u * Math.PI) * 30;
      player._advDodgeFrameOverride = 124 + Math.min(7, Math.floor(u * 8));
    } else if (heroId === 'valkyrie_ex') {
      liftY = Math.sin(u * Math.PI) * 28;
      player._advDodgeFrameOverride = 183 + Math.min(23, Math.floor(u * 24));
    } else if (dodgeStyle === 'priestess') {
      player.isAngelicAscent = true;
      liftY = Math.sin(u * Math.PI) * 26;
      player._advDodgeFrameOverride = 182 + Math.min(23, Math.floor(u * 24));
    } else if (heroId === 'archer') {
      liftY = Math.sin(u * Math.PI) * 34;
      player._advDodgeFrameOverride = 244 + Math.min(21, Math.floor(u * 22));
    } else if (heroId === 'archer_ex') {
      liftY = Math.sin(u * Math.PI) * 30;
      player._advDodgeFrameOverride = 183 + Math.min(23, Math.floor(u * 24));
    } else if (dodgeStyle === 'android') {
      liftY = Math.sin(u * Math.PI) * 14;
      player._advDodgeFrameOverride = 184 + Math.min(21, Math.floor(u * 22));
    } else if (dodgeStyle === 'mage') {
      liftY = Math.sin(u * Math.PI) * 16;
      player.wraithAlpha = u > 0.16 && u < 0.64 ? 0.34 : 1.0;
      player._advDodgeFrameOverride = 180 + Math.min(28, Math.floor(u * 29));
    } else if (dodgeStyle === 'icemage') {
      liftY = Math.sin(u * Math.PI) * 4;
      player._advDodgeFrameOverride = 182 + Math.min(24, Math.floor(u * 25));
    } else if (dodgeStyle === 'reaper') {
      liftY = Math.sin(u * Math.PI) * 10;
      player.wraithAlpha = u < 0.88 ? 0.34 : 1.0;
      player._advDodgeFrameOverride = 183 + Math.min(23, Math.floor(u * 24));
    } else if (dodgeStyle === 'chronomancer') {
      liftY = Math.sin(u * Math.PI) * 8;
      player._advDodgeFrameOverride = 182 + Math.min(24, Math.floor(u * 25));
    } else if (heroId === 'warrior') {
      liftY = Math.sin(u * Math.PI) * 8;
      player._advDodgeFrameOverride = 184 + Math.min(21, Math.floor(u * 22));
    } else if (heroId === 'warrior_ex') {
      liftY = 0;
      player._advDodgeFrameOverride = 183 + Math.min(23, Math.floor(u * 24));
    } else if (dodgeStyle === 'ronin') {
      liftY = 0;
      player._advDodgeFrameOverride = 185 + Math.min(20, Math.floor(u * 21));
    } else {
      liftY = 0;
      player._advDodgeFrameOverride = 183 + Math.min(22, Math.floor(u * 23));
    }

    player.isInvulnerable = true;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY - liftY;

    // Continuous mid-dodge signature trails, feathers, ice-tracks, rocket exhaust & afterimages
    player._advDodgeTrailAccum = (player._advDodgeTrailAccum || 0) + dt;
    if (player._advDodgeTrailAccum >= 0.032) {
      player._advDodgeTrailAccum = 0;
      if (dodgeStyle === 'icemage') {
        this.pushHeroDodgeTrail(player, {
          kind: 'ice_track',
          layer: 'back',
          x: player.x - player.facing * 8,
          y: player.groundY - 2,
          w: 32,
          maxLife: 0.36
        });
      } else if (dodgeStyle === 'android') {
        this.pushHeroDodgeTrail(player, {
          kind: 'rocket_exhaust',
          layer: 'back',
          x: player.x - player.facing * 24,
          y: player.y - 108,
          w: 30,
          h: 6,
          color: '#00f0ff',
          maxLife: 0.20
        });
        this.pushHeroDodgeTrail(player, {
          kind: 'rocket_exhaust',
          layer: 'back',
          x: player.x - player.facing * 26,
          y: player.y - 82,
          w: 24,
          h: 5,
          color: '#ff2e93',
          maxLife: 0.18
        });
      } else if (dodgeStyle === 'valkyrie' || dodgeStyle === 'priestess') {
        this.pushHeroDodgeTrail(player, {
          kind: 'feather_mote',
          layer: 'front',
          x: player.x - player.facing * 18,
          y: player.y - 86,
          color: dodgeStyle === 'valkyrie' ? '#fbbf24' : '#fef08a',
          maxLife: 0.30
        });
      } else if (dodgeStyle === 'ronin' || dodgeStyle === 'warrior' || dodgeStyle === 'warrior_ex') {
        this.pushHeroDodgeTrail(player, {
          kind: 'lightning_spark',
          layer: 'front',
          x: player.x - player.facing * 14,
          y: player.groundY - (dodgeStyle === 'ronin' || dodgeStyle === 'warrior_ex' ? 14 : 52),
          w: dodgeStyle === 'warrior_ex' ? 32 : 28,
          color: dodgeStyle === 'ronin' ? '#38bdf8' : '#fde047',
          maxLife: 0.22
        });
      } else if (dodgeStyle === 'titan' || dodgeStyle === 'mage') {
        this.pushHeroDodgeTrail(player, {
          kind: 'magma_tread',
          layer: 'back',
          x: player.x - player.facing * 12,
          y: player.groundY - 2,
          w: 28,
          color: dodgeStyle === 'titan' ? '#f59e0b' : '#fb923c',
          maxLife: 0.28
        });
      } else {
        this.pushHeroDodgeTrail(player, {
          kind: 'streak',
          layer: 'back',
          x: player.x - player.facing * 16,
          y: player.y - 72,
          w: 28,
          h: 4,
          color: dodgeStyle === 'reaper' ? '#a855f7' : dodgeStyle === 'archer' ? '#34d399' : '#2dd4bf',
          maxLife: 0.22
        });
      }
    }

    const gStep = player._advDodgeGhostStep || 0;
    if ((gStep === 0 && u >= 0.24) || (gStep === 1 && u >= 0.58)) {
      player._advDodgeGhostStep = gStep + 1;
      const col = Math.min(28, Math.floor(u * 24) + 4);
      if (heroId === 'valkyrie') {
        player.spawnAfterimage?.(player.x, player.y, player.facing, 4, 4 + Math.min(7, Math.floor(u * 7)), 0.18);
      } else if (heroId === 'archer') {
        player.spawnAfterimage?.(player.x, player.y, player.facing, 8, 4 + Math.min(20, Math.floor(u * 20)), 0.18);
      } else if (dodgeStyle === 'mage' && typeof player.spawnSolarEcho === 'function') {
        player.spawnSolarEcho(player._advDodgeFrameOverride, 0.78, 0.20);
      } else if (dodgeStyle === 'chronomancer' && typeof player.spawnTemporalEcho === 'function') {
        player.spawnTemporalEcho(player._advDodgeFrameOverride);
      } else if (dodgeStyle === 'ronin') {
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, col, 0.18, 0);
      } else if (heroId === 'warrior_ex') {
        player.spawnAfterimage?.(player.x, player.groundY, player.facing, 6, col, 0.18, 'gold');
      } else {
        player.spawnAfterimage?.(player.x, player.y, player.facing, 6, col, 0.18);
      }
    }

    // Arrival rift flashes for Blink / Warp / Shadow-Shift champions
    if (!player._advDodgeArrivalDone && u >= 0.82) {
      player._advDodgeArrivalDone = true;
      if (dodgeStyle === 'mage') {
        player.fx?.spawn('arcaneBlinkRift', player.x, player.groundY, {
          light: 1.20,
          extra: { isArrival: true }
        });
      } else if (dodgeStyle === 'chronomancer') {
        player.fx?.spawn('warpPortalPairRift', player.x, player.groundY - 92, {
          flip: player.facing < 0,
          light: 1.20,
          extra: { isArrival: true }
        });
      } else if (dodgeStyle === 'reaper') {
        player.fx?.spawn('companionSummonRiftPortal', player.x, player.groundY - 4, {
          light: 1.16,
          extra: { radius: 24, isCrimson: true, customDuration: 0.24 }
        });
      } else if (dodgeStyle === 'warrior' || dodgeStyle === 'warrior_ex') {
        player.fx?.spawn('blinkTeleportPillar', player.x, player.groundY, {
          maxDuration: 0.20,
          light: 1.14,
          extra: { width: 20, height: 126 }
        });
      }
    }

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

  processPlayerControls(dt, player, target) {
    player.isPlayerControlled = true;
    player.isManualAdventureControl = true;
    player.adventureAutoPlay = this.autoPlay;

    if (this.game.isMatchOver && player.isDead) {
      player._grabbedByBoss = false;
      player._grabbedByBossTimer = 0;
      player._advPureDodge = false;
      player._advDodgeFrameOverride = null;
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      player.manualMoveAxis = 0;
      if (Number.isFinite(player.groundY) && player.y < player.groundY) {
        player.y = player.groundY;
        player.vy = 0;
      }
      player.update(dt, null, this.game);
      return;
    }

    if (this.queuedActionTimer > 0) {
      this.queuedActionTimer = Math.max(0, this.queuedActionTimer - dt);
      if (this.queuedActionTimer <= 0) {
        this.queuedAction = null;
      }
    }

    if (player.state === 'AUTO_ATTACK') {
      this.comboResetTimer = 1.85;
    } else if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
      if (this.comboResetTimer <= 0) {
        this._comboLockTarget = null;
        if (player.hasHackAndSlashCombo?.()) {
          player.comboStep = 0;
        }
      }
    }

    if (!this.autoPlay) {
      if (this.manualTargetLock) {
        target = this.getActiveLockedMonster(player);
      } else {
        this.lockedMonster = null;
        this._comboLockTarget = null;
        target = null;
      }
    }

    if (
      this._comboLockTarget &&
      (this._comboLockTarget.isDead ||
        (this.game?.fighters && !this.game.fighters.includes(this._comboLockTarget)))
    ) {
      this._comboLockTarget = null;
    }

    const stickyLockMaxX = (player.getHackAndSlashLockRange?.() || 275) + 45;
    if (
      (this.autoPlay || this.manualTargetLock) &&
      player.hasHackAndSlashCombo?.() &&
      (player.comboStep || 0) !== 0 &&
      (this.comboResetTimer || 0) > 0 &&
      this._comboLockTarget &&
      !this._comboLockTarget.isDead &&
      Math.abs(this._comboLockTarget.x - player.x) <= stickyLockMaxX &&
      (this._comboLockTarget.isColossalBoss ||
        Math.abs(
          (this._comboLockTarget.groundY || this._comboLockTarget.y) -
            (player.groundY || player.y)
        ) <= 92)
    ) {
      target = this._comboLockTarget;
    }

    const stats = this.progression.getComputedStats();

    // Lock manual/auto steering & queued skills while hoisted inside Behemoth Malphas's Siege Grab!
    if (player._grabbedByBoss && (player._grabbedByBossTimer || 0) > 0) {
      player._grabbedByBossTimer = Math.max(0, player._grabbedByBossTimer - dt);
      this.queuedAction = null;
      this.queuedActionTimer = 0;
      player._advVaultVelZ = 0;
      player.manualMoveAxis = 0;
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      this.smoothVelX = 0;
      this.smoothVelY = 0;
      if (player._grabbedByBossTimer <= 0) {
        player._grabbedByBoss = false;
        player.y = player.groundY;
      }
      player.update(dt, target, this.game);
      this.progression.syncGaugesToPlayer(player);
      return;
    }

    // =========================================================================
    // OPTIONAL AUTO-PLAY AI: 2.5D CURVED TACTICAL NAVIGATOR & ANTI-STUCK ORBIT
    // =========================================================================
    if (this.autoPlay) {
      player._advVaultVelZ = 0;
      player.manualMoveAxis = 0;
      if ((player._advSideHoldTimer || 0) > 0) {
        player._advSideHoldTimer = Math.max(0, player._advSideHoldTimer - dt);
      }

      // Auto-spend Skill Points in Auto-Play so autonomous showcase runs demonstrate the Skill Tree!
      if (this.progression.skillPoints > 0) {
        const autoOrder = ['wrath_1', 'astral_1', 'aegis_1', 'wrath_2', 'astral_2', 'wrath_1', 'astral_3'];
        for (const nid of autoOrder) {
          if (this.progression.canUpgradeNode(nid)) {
            this.progression.upgradeNode(nid, player);
            break;
          }
        }
      }

      // 0. Advance active Bespoke 11-Hero Pure 3D Evade Dash smoothly during Auto-Play
      if (player._advPureDodge) {
        if (this.updateHeroAdventureDodge(dt, player)) {
          this.progression.syncGaugesToPlayer(player);
          return;
        }
      }

      const colossalAlive = Boolean(
        this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
      );
      const bossAnchorX = this.getBossAnchorX();
      const bossMinWalkX = this.getBossMinWalkX();
      const bossMaxWalkX = this.getBossMaxWalkX();
      const worldW = this.getWorldWidth();
      const minWalkX = colossalAlive
        ? this.lockActive
          ? this.lockMinX
          : bossMinWalkX
        : this.lockActive
          ? this.lockMinX
          : 80;
      const maxWalkX = colossalAlive
        ? bossMaxWalkX
        : this.lockActive
          ? this.lockMaxX
          : worldW - 80;
      const depthMin = (this.depthMinY || ADVENTURE_DEPTH_MIN_Y) + 12;
      const depthMax = (this.depthMaxY || ADVENTURE_DEPTH_MAX_Y) - 12;
      const depthMid = this.depthMidY || ADVENTURE_DEPTH_MID_Y;
      const pGy = Number.isFinite(player.groundY) ? player.groundY : depthMid;
      const aiClock = (this.goBlinkTimer || 0) + (this.game?.renderer?.time || 0) * 0.35;
      const hid = player.heroId || '';
      const isRangedEx =
        hid === 'mage_ex' ||
        hid === 'priestess_ex' ||
        hid === 'icemage_ex' ||
        hid === 'valkyrie_ex' ||
        hid === 'archer_ex';
      const rawEffRange = player.getEffectiveAttackRange
        ? player.getEffectiveAttackRange()
        : player.attackRange || 180;
      const isRangedHero =
        isRangedEx ||
        ['mage', 'priestess', 'icemage', 'valkyrie', 'archer'].includes(hid) ||
        rawEffRange >= 290;
      const effRange = isRangedEx
        ? Math.max(510, rawEffRange)
        : isRangedHero
          ? Math.max(385, rawEffRange)
          : rawEffRange;
      const isRanged = isRangedHero;
      const maxAutoVx = 268 * stats.moveSpeedMult;
      const maxAutoVz = 164 * stats.moveSpeedMult;

      // 1. Scan 2.5D Floor Telegraphs, Colossal Boss Sweeps/Slams & Incoming Projectiles
      let avoidVx = 0;
      let avoidVz = 0;
      let imminentEvade = null;
      const fighters = this.game?.fighters || [];
      for (let i = 0; i < fighters.length; i++) {
        const m = fighters[i];
        if (!m || m.team !== 2 || m.isDead) continue;
        if (Array.isArray(m.telegraphRings)) {
          for (let j = 0; j < m.telegraphRings.length; j++) {
            const r = m.telegraphRings[j];
            const rx = Math.max(54, (r.radius || 72) + 28);
            const rz = Math.max(46, (r.radius || 72) * 0.68 + 18);
            const nx = (player.x - r.x) / rx;
            const nz = (pGy - r.y) / rz;
            const nd = Math.hypot(nx, nz);
            if (nd < 1.18) {
              const escZ =
                pGy <= r.y
                  ? r.y - rz < depthMin + 14
                    ? 1
                    : -1
                  : r.y + rz > depthMax - 14
                    ? -1
                    : 1;
              const escX =
                player.x <= r.x
                  ? player.x < minWalkX + 95
                    ? 0.85
                    : -0.85
                  : player.x > maxWalkX - 95
                    ? -0.85
                    : 0.85;
              const urgency = 1.22 - nd;
              avoidVx += escX * 260 * urgency;
              avoidVz += escZ * 215 * urgency;
              if (nd < 0.92 && (r.timer || 0) <= 0.44) {
                imminentEvade = { dirX: escX, dirZ: escZ };
              }
            }
          }
        }
        if (m.isColossalBoss) {
          const laneGy =
            m.rakeWarnOnly || m.rakeActive
              ? m.rakeLaneGy || 561
              : m.grabWarnOnly || m.grabActive || m.bossAction === 'claw_grab'
                ? m.grabLaneGy || 561
                : m.bossAction === 'claw_sweep'
                  ? m.sweepLane === 'upper'
                    ? 504
                    : 620
                  : null;
          if (laneGy !== null && Math.abs(pGy - laneGy) < 68) {
            const safeGy = laneGy <= ADVENTURE_DEPTH_MID_Y ? 638 : 484;
            const dirZ = safeGy >= pGy ? 1 : -1;
            avoidVz += dirZ * 260;
            if (Math.abs(pGy - laneGy) < 48) {
              imminentEvade = { dirX: -0.35, dirZ };
            }
          }
          if (m.fistVisible) {
            const sdx = player.x - (m.slamTargetX || 8920);
            const sdz = pGy - (m.slamTargetGy || 561);
            if (Math.abs(sdx) < 155 && Math.abs(sdz) < 76) {
              const escZ = (m.slamTargetGy || 561) <= ADVENTURE_DEPTH_MID_Y ? 1 : -1;
              const escX = (m.slamTargetX || 8920) > (minWalkX + maxWalkX) * 0.5 ? -0.75 : 0.75;
              avoidVx += escX * 250;
              avoidVz += escZ * 230;
              if (Math.abs(sdx) < 112 && Math.abs(sdz) < 54) {
                imminentEvade = { dirX: escX, dirZ: escZ };
              }
            }
          }
        }
      }

      const projs = this.game?.vfx?.projectiles;
      if (Array.isArray(projs)) {
        for (let i = 0; i < projs.length; i++) {
          const p = projs[i];
          if (!p || !p.owner || p.owner.team !== 2) continue;
          const pGyProj = Number.isFinite(p.owner.groundY) ? p.owner.groundY : p.y;
          const dxP = player.x - p.x;
          if (dxP * (p.vx || 0) > 0 && Math.abs(dxP) < 230 && Math.abs(pGy - pGyProj) < 58) {
            const dodgeLaneZ = pGyProj <= ADVENTURE_DEPTH_MID_Y ? 1 : -1;
            avoidVz += dodgeLaneZ * 215;
            if (Math.abs(dxP) < 120) {
              imminentEvade = { dirX: 0.2, dirZ: dodgeLaneZ };
            }
          }
        }
      }

      // Reactive Bespoke 11-Champion Pure 3D Evade Dash out of imminent floor telegraphs / incoming fire
      if (
        imminentEvade &&
        !this.game.isMatchOver &&
        !player.isDead &&
        !(player.stunTimer > 0) &&
        !player.isRooted &&
        player.dodgeCooldown <= 0 &&
        (player.state === 'IDLE' || player.state === 'WALK' || player.state === 'AUTO_ATTACK')
      ) {
        const mag = Math.hypot(imminentEvade.dirX, imminentEvade.dirZ) || 1;
        const evX = imminentEvade.dirX / mag;
        const evZ = imminentEvade.dirZ / mag;
        this.startHeroAdventureDodge(player, evX, evZ, stats);
        this.progression.syncGaugesToPlayer(player);
        return;
      }

      // Shared 2.5D Curved Steering + Stuck-Progress Watchdog
      const applyCurvedAutoSteer = (rawGoalX, rawGoalGy, stopDist = 18, faceOverride = null) => {
        const clampedGoalX = Math.max(minWalkX + 18, Math.min(maxWalkX - 18, rawGoalX));
        const clampedGoalGy = Math.max(depthMin, Math.min(depthMax, rawGoalGy));
        const dxGoal = clampedGoalX - player.x;
        const dzGoal = clampedGoalGy - pGy;
        const distGoal = Math.hypot(dxGoal, dzGoal * 1.25);
        const hasAvoid = Math.hypot(avoidVx, avoidVz) > 16;
        const wantMove = distGoal > stopDist || hasAvoid || (player._advAiUnstickTimer || 0) > 0;

        if (!Number.isFinite(player._advAiLastX)) {
          player._advAiLastX = player.x;
          player._advAiLastGy = pGy;
        }
        const moved25D = Math.hypot(
          player.x - player._advAiLastX,
          (pGy - player._advAiLastGy) * 1.3
        );
        player._advAiLastX = player.x;
        player._advAiLastGy = pGy;

        if (wantMove) {
          if (moved25D < Math.max(0.45, 50 * dt)) {
            player._advAiStuckTimer = (player._advAiStuckTimer || 0) + dt;
          } else {
            player._advAiStuckTimer = Math.max(0, (player._advAiStuckTimer || 0) - dt * 2.2);
          }
          if ((player._advAiStuckTimer || 0) >= 0.24) {
            player._advAiStuckTimer = 0;
            player._advSideHoldTimer = 0;
            const targetInsideEffRange = Boolean(
              target &&
                !target.isDead &&
                (target.isColossalBoss
                  ? isRanged
                    ? player.x >= bossAnchorX - 855
                    : player.x >= bossAnchorX - 190
                  : Math.abs(target.x - player.x) <= effRange * 0.98)
            );
            if (targetInsideEffRange) {
              const tgtGy = target.isColossalBoss
                ? pGy
                : Number.isFinite(target.groundY)
                  ? target.groundY
                  : ADVENTURE_DEPTH_MID_Y;
              const curDz = Math.abs(tgtGy - pGy);
              player._advAiUnstickTimer = 0;
              if (!target.isColossalBoss && curDz > (isRanged ? 96 : 46)) {
                this.shiftEntityDepth(player, Math.sign(tgtGy - pGy) * Math.min(curDz, maxAutoVz * dt * 2.0));
              }
              player._advAiVelX = 0;
              player._advAiVelZ = 0;
              player._manualWalkActive = false;
              player._manualSpeedRatio = 0;
              player.moveDir = 0;
              player.state = 'IDLE';
              player.facing = target.x >= player.x ? 1 : -1;
              return false;
            }
            player._advAiUnstickTimer = 0.44;
            player._advAiUnstickDirX = player.x < (minWalkX + maxWalkX) * 0.5 ? 1 : -1;
            player._advAiUnstickDirZ = pGy > ADVENTURE_DEPTH_MID_Y ? -1 : 1;
          }
        } else {
          player._advAiStuckTimer = 0;
        }

        let desiredVx = 0;
        let desiredVz = 0;
        if (distGoal > stopDist) {
          const inv = 1 / Math.max(1, Math.hypot(dxGoal, dzGoal));
          const ramp = Math.min(1, distGoal / Math.max(24, stopDist * 2.1));
          desiredVx = dxGoal * inv * maxAutoVx * ramp;
          desiredVz = dzGoal * inv * maxAutoVz * ramp;
        }
        desiredVx += avoidVx;
        desiredVz += avoidVz;

        if ((player._advAiUnstickTimer || 0) > 0) {
          player._advAiUnstickTimer = Math.max(0, player._advAiUnstickTimer - dt);
          desiredVx = desiredVx * 0.25 + (player._advAiUnstickDirX || 1) * maxAutoVx * 1.05;
          desiredVz = desiredVz * 0.25 + (player._advAiUnstickDirZ || 1) * maxAutoVz * 0.98;
        }

        const magCheck = Math.hypot(
          desiredVx / Math.max(1, maxAutoVx),
          desiredVz / Math.max(1, maxAutoVz)
        );
        if (magCheck > 1.18) {
          desiredVx *= 1.18 / magCheck;
          desiredVz *= 1.18 / magCheck;
        }

        const smoothK = Math.min(1, dt * (wantMove ? 15 : 22));
        player._advAiVelX = (player._advAiVelX || 0) + (desiredVx - (player._advAiVelX || 0)) * smoothK;
        player._advAiVelZ = (player._advAiVelZ || 0) + (desiredVz - (player._advAiVelZ || 0)) * smoothK;

        if (wantMove && Math.hypot(player._advAiVelX, player._advAiVelZ) > 6) {
          player.x = Math.max(minWalkX, Math.min(maxWalkX, player.x + player._advAiVelX * dt));
          this.shiftEntityDepth(player, player._advAiVelZ * dt);
          player._manualWalkActive = true;
          player._manualSpeedRatio = Math.max(
            0.36,
            Math.min(
              1.18,
              Math.hypot(
                player._advAiVelX / Math.max(1, maxAutoVx),
                player._advAiVelZ / Math.max(1, maxAutoVz)
              )
            )
          );
          player.moveDir = 1;
          player.state = 'WALK';
          if (faceOverride !== null) {
            player.facing = faceOverride;
          } else if (Math.abs(player._advAiVelX) > 12) {
            player.facing = player._advAiVelX >= 0 ? 1 : -1;
          }
          return true;
        }

        player._advAiVelX = 0;
        player._advAiVelZ = 0;
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
        player.moveDir = 0;
        player.state = 'IDLE';
        if (faceOverride !== null) {
          player.facing = faceOverride;
        }
        return false;
      };

      // 2. Non-Combat / Between-Wave Curved Navigation (Unlocked March, Pickups & Wave-Lock Standby)
      if (!target && !this.game.isMatchOver) {
        if (!player.isDead && !(player.stunTimer > 0) && !player.isRooted && (player.state === 'IDLE' || player.state === 'WALK')) {
          const reachablePickup = this.pickups.find(
            (pk) => pk && pk.x >= minWalkX - 18 && pk.x <= maxWalkX + 18
          );
          if (reachablePickup) {
            const pkGy = Number.isFinite(reachablePickup.groundY)
              ? reachablePickup.groundY
              : ADVENTURE_DEPTH_MID_Y;
            const arcBlend = Math.max(
              0,
              Math.min(1, (Math.abs(reachablePickup.x - player.x) - 42) / 150)
            );
            const curveGy = pkGy + Math.sin(aiClock * 2.5) * 24 * arcBlend;
            applyCurvedAutoSteer(reachablePickup.x, curveGy, 16, null);
          } else if (this.bossSpawnPending) {
            const entryX = bossAnchorX - (isRanged ? 495 : 170);
            const entryGy = depthMid + Math.sin(aiClock * 1.9) * 32;
            applyCurvedAutoSteer(entryX, entryGy, 28, 1);
          } else if (this.lockActive) {
            const midLockX = minWalkX + (maxWalkX - minWalkX) * 0.5;
            const weaveGy = depthMid + Math.sin(aiClock * 2.0) * 36;
            applyCurvedAutoSteer(midLockX, weaveGy, 28, 1);
          } else {
            const marchX = worldW - 220;
            const marchGy =
              depthMid + Math.sin(player.x * 0.0058 + aiClock * 0.85) * 48;
            applyCurvedAutoSteer(marchX, marchGy, 22, 1);
          }
        } else {
          player._manualWalkActive = false;
          player._manualSpeedRatio = 0;
        }
        const normVz = Math.max(-1, Math.min(1, (player._advAiVelZ || 0) / Math.max(1, maxAutoVz)));
        this.skillSets.beginPlayerStep(dt, player, null, Boolean(player._manualWalkActive), normVz);
        player.update(dt, null, this.game);
        this.progression.syncGaugesToPlayer(player);
        return;
      }

      // 3. Active 2.5D Combat: Curved Standoff, Corner-Escape Orbit & True 2.5D Hit-Window Gating
      let isMovingCombat = false;
      if (target && !this.game.isMatchOver && !player.isDead && !(player.stunTimer > 0) && !player.isRooted) {
        const targetGy = target.isColossalBoss
          ? pGy
          : Number.isFinite(target.groundY)
            ? target.groundY
            : ADVENTURE_DEPTH_MID_Y;
        const dxToTarget = target.x - player.x;
        const absDx = Math.abs(dxToTarget);
        const absDz = target.isColossalBoss ? 0 : Math.abs(targetGy - pGy);
        const isHackSlash = Boolean(player.hasHackAndSlashCombo?.());
        const autoChainMaxDx = player.isHackAndSlashCaster?.() ? 475 : 210;
        const midHackChain =
          isHackSlash &&
          (player.comboStep || 0) !== 0 &&
          (this.comboResetTimer || 0) > 0 &&
          (target.isColossalBoss ? player.x >= bossAnchorX - 855 : absDx <= autoChainMaxDx && absDz <= 78);

        if (player.state === 'IDLE' || player.state === 'WALK') {
          if (
            player.hasTrueUltimate &&
            this.progression.astralCharge >= 99.9 &&
            typeof player.updateTrueUltimate === 'function'
          ) {
            player._manualWalkActive = false;
            player._manualSpeedRatio = 0;
            player.facing = target.x >= player.x ? 1 : -1;
            this.progression.astralCharge = 0;
            this.progression.syncGaugesToPlayer(player);
            if (player.stats) player.stats.ultsUsed++;
            player.setState('TRUE_ULTIMATE');
            this.game.triggerTrueUltimateCinematic(player);
          } else if (
            this.progression.ultCharge >= 99.9 &&
            (target.isColossalBoss || (absDx <= Math.max(360, effRange * 1.35) && absDz <= 115))
          ) {
            player._manualWalkActive = false;
            player._manualSpeedRatio = 0;
            player.facing = target.x >= player.x ? 1 : -1;
            this.progression.ultCharge = 0;
            this.progression.gainAstralRelic(
              stats.ultResonanceAstral,
              player,
              'ECLIPSE SEAL RESONANCE!'
            );
            this.progression.syncGaugesToPlayer(player);
            if (player.stats) player.stats.ultsUsed++;
            player.setState('ULTIMATE');
            this.onPlayerCastSkillOrOverdrive(player);
            this.game.triggerUltimateCinematic(player);
          } else if (
            !midHackChain &&
            player.skillCooldown <= 0 &&
            (target.isColossalBoss ||
              (absDx <= Math.max(255, effRange * 1.45) && absDz <= (isRanged ? 96 : 74))) &&
            this.progression.trySpendSkillSpirit()
          ) {
            player._manualWalkActive = false;
            player._manualSpeedRatio = 0;
            player.facing = target.x >= player.x ? 1 : -1;
            this.skillCdMax = Math.max(
              3.8,
              (player.skillMaxCooldown || 4.5) * 1.15 * (stats.skillCdMult ?? 1)
            );
            player.skillCooldown = this.skillCdMax;
            if (player.stats) player.stats.skillsUsed++;
            player.setState('SKILL');
            this.queueTwinSpiritEcho(player);
            this.onPlayerCastSkillOrOverdrive(player);
          } else if (
            player.autoCooldown <= 0 &&
            (midHackChain || Math.hypot(avoidVx, avoidVz) < 235) &&
            (target.isColossalBoss
              ? isRanged
                ? player.x >= bossAnchorX - 855
                : player.x >= bossAnchorX - 190
              : absDx <= (midHackChain ? Math.max(effRange, autoChainMaxDx) : effRange * 0.98) &&
                absDz <= (midHackChain ? 82 : isRanged ? 96 : 46))
          ) {
            player._manualWalkActive = false;
            player._manualSpeedRatio = 0;
            player.facing = target.x >= player.x ? 1 : -1;
            this._comboLockTarget = target;
            this.comboResetTimer = 1.85;
            player.setState('AUTO_ATTACK');
            if (isHackSlash) {
              if ((player.comboStep || 0) !== 0) {
                this.autoCdMax = 0.36;
                player.autoCooldown = player.heroId?.endsWith('_ex') ? 0.015 : 0.03;
              } else {
                this.autoCdMax = 0.62;
                player.autoCooldown = 0.62;
                this._comboLockTarget = null;
              }
            } else {
              this.autoCdMax = player.autoInterval || 0.44;
              player.autoCooldown = this.autoCdMax;
            }
          } else if (midHackChain) {
            player._manualWalkActive = false;
            player._manualSpeedRatio = 0;
          } else if (
            isRanged &&
            !target.isColossalBoss &&
            absDx < 125 &&
            player.dodgeCooldown <= 0
          ) {
            const awayDir = player.x >= target.x ? 1 : -1;
            const awayRoom = awayDir > 0 ? maxWalkX - player.x : player.x - minWalkX;
            const openEscDir =
              awayRoom >= 145
                ? awayDir
                : maxWalkX - player.x >= player.x - minWalkX
                  ? 1
                  : -1;
            const escZ = pGy > ADVENTURE_DEPTH_MID_Y ? -0.45 : 0.45;
            const mag = Math.hypot(openEscDir, escZ) || 1;
            this.startHeroAdventureDodge(player, openEscDir / mag, escZ / mag, stats);
            this.progression.syncGaugesToPlayer(player);
            return;
          } else if (target.isColossalBoss) {
            const bossGoalX = player.isHackAndSlashCaster?.()
              ? bossAnchorX - 440 + Math.sin(aiClock * 1.4) * 55
              : isRanged
                ? bossAnchorX - 470 + Math.sin(aiClock * 1.35) * 65
                : bossAnchorX - 109 + Math.sin(aiClock * 1.7) * 16;
            let bossGoalGy = depthMid + Math.sin(aiClock * 1.65) * 44;
            if (target.rakeWarnOnly || target.rakeActive) {
              bossGoalGy = (target.rakeLaneGy || 561) <= ADVENTURE_DEPTH_MID_Y ? 638 : 484;
            } else if (target.grabWarnOnly || target.grabActive || target.bossAction === 'claw_grab') {
              bossGoalGy = (target.grabLaneGy || 561) <= ADVENTURE_DEPTH_MID_Y ? 640 : 482;
            } else if (target.bossAction === 'claw_sweep') {
              bossGoalGy = target.sweepLane === 'upper' ? 636 : 484;
            } else if (target.fistVisible && Math.abs((target.slamTargetGy || 561) - pGy) < 76) {
              bossGoalGy = (target.slamTargetGy || 561) <= ADVENTURE_DEPTH_MID_Y ? 640 : 482;
            }
            isMovingCombat = applyCurvedAutoSteer(bossGoalX, bossGoalGy, 20, 1);
          } else {
            const idealDistX = Math.min(
              effRange * 0.80,
              isRangedEx
                ? 335
                : isRanged
                  ? 295
                  : Math.max(82, Math.min(132, effRange * 0.68))
            );
            const leftSlot = target.x - idealDistX;
            const rightSlot = target.x + idealDistX;
            const wallMargin = isRanged ? 72 : 40;
            const leftValid = leftSlot >= minWalkX + wallMargin;
            const rightValid = rightSlot <= maxWalkX - wallMargin;

            let candRightSide = player.x > target.x;
            if (leftValid && !rightValid) {
              candRightSide = false;
            } else if (!leftValid && rightValid) {
              candRightSide = true;
            } else if (!leftValid && !rightValid) {
              candRightSide = maxWalkX - target.x >= target.x - minWalkX;
            } else if (isRanged && absDx < 165) {
              if (player.x < minWalkX + 92) candRightSide = true;
              else if (player.x > maxWalkX - 92) candRightSide = false;
            }

            const desiredSide = candRightSide ? 'right' : 'left';
            const prevSide = player._advSideChoice;
            const prevSideValid =
              prevSide === 'right' ? rightValid : prevSide === 'left' ? leftValid : false;
            let wantRightSide = candRightSide;
            if (
              prevSide &&
              prevSide !== desiredSide &&
              prevSideValid &&
              (player._advSideHoldTimer || 0) > 0
            ) {
              wantRightSide = prevSide === 'right';
            } else if (prevSide !== desiredSide) {
              player._advSideChoice = desiredSide;
              player._advSideHoldTimer = 0.70;
            }

            const goalX = wantRightSide ? rightSlot : leftSlot;
            const crossingSides =
              (wantRightSide && player.x < target.x + 28) ||
              (!wantRightSide && player.x > target.x - 28);

            const safeZMin = depthMin + 10;
            const safeZMax = depthMax - 10;
            let goalGy = targetGy;
            if (crossingSides) {
              // Curve across the opposite 2.5D depth lane (capped <= 54px) to orbit cleanly past the monster!
              const orbitSign =
                targetGy > ADVENTURE_DEPTH_MID_Y + 12
                  ? -1
                  : targetGy < ADVENTURE_DEPTH_MID_Y - 12
                    ? 1
                    : pGy <= targetGy
                      ? -1
                      : 1;
              goalGy = Math.max(safeZMin, Math.min(safeZMax, targetGy + orbitSign * 54));
            } else {
              const distFromSlot = Math.abs(player.x - goalX);
              const curveBlend = Math.max(0, Math.min(1, (distFromSlot - 30) / 185));
              const flankSign =
                (player.heroId ? player.heroId.charCodeAt(0) : 1) % 2 === 0 ? 1 : -1;
              const rawWeave =
                (Math.sin(aiClock * 2.35) * 24 + flankSign * 16) * curveBlend +
                (isRanged ? Math.sin(aiClock * 1.95) * 18 : 0) * (1 - curveBlend);
              const clampedWeave = Math.max(-24, Math.min(24, rawWeave));
              goalGy = Math.max(safeZMin, Math.min(safeZMax, targetGy + clampedWeave));
            }

            const faceDir =
              crossingSides && Math.abs(goalX - player.x) > 45
                ? goalX >= player.x
                  ? 1
                  : -1
                : target.x >= player.x
                  ? 1
                  : -1;
            isMovingCombat = applyCurvedAutoSteer(goalX, goalGy, isRanged ? 22 : 16, faceDir);
          }
        } else {
          player._manualWalkActive = false;
          player._manualSpeedRatio = 0;
          // Simultaneous Run-and-Cast Kiting Glide during AUTO_ATTACK
          const avoidMag = Math.hypot(avoidVx, avoidVz);
          const rangedKiteActive =
            isRanged &&
            player.state === 'AUTO_ATTACK' &&
            !target.isColossalBoss &&
            (absDx < 225 || avoidMag > 20);
          if (player.state === 'AUTO_ATTACK' && (avoidMag > 20 || rangedKiteActive)) {
            if (player.isHackAndSlashMelee?.()) {
              this.shiftEntityDepth(player, avoidVz * 0.65 * dt);
            } else {
              const awayDir = player.x >= target.x ? 1 : -1;
              const awayRoom = awayDir > 0 ? maxWalkX - player.x : player.x - minWalkX;
              const openDirX =
                awayRoom >= 115
                  ? awayDir
                  : maxWalkX - player.x >= player.x - minWalkX
                    ? 1
                    : -1;
              const nearCorner = player.x < minWalkX + 95 || player.x > maxWalkX - 95;
              const kiteVx =
                rangedKiteActive && absDx < 225
                  ? openDirX * maxAutoVx * (absDx < 155 ? 0.78 : 0.56) + avoidVx * 0.60
                  : avoidVx * 0.65;
              const dzTarget = targetGy - pGy;
              const cornerEscZ = targetGy > ADVENTURE_DEPTH_MID_Y ? -1 : 1;
              const kiteVz =
                avoidMag > 20 && Math.abs(avoidVz) > 16
                  ? avoidVz * 0.72
                  : nearCorner && absDx < 175
                    ? cornerEscZ * maxAutoVz * 0.76
                    : Math.abs(dzTarget) > 14
                      ? Math.sign(dzTarget) * maxAutoVz * 0.52
                      : 0;
              const prevKiteX = player.x;
              player.x = Math.max(minWalkX, Math.min(maxWalkX, player.x + kiteVx * dt));
              const appliedDx = player.x - prevKiteX;
              if (appliedDx !== 0) {
                if (player._hnsState) {
                  player._hnsState.startX += appliedDx;
                  player._hnsState.destX += appliedDx;
                }
                if (Number.isFinite(player._beatStartX)) player._beatStartX += appliedDx;
                if (Number.isFinite(player._beatTargetX)) player._beatTargetX += appliedDx;
              }
              this.shiftEntityDepth(player, kiteVz * dt);
              player.facing = target.x >= player.x ? 1 : -1;
              isMovingCombat = true;
            }
          }
        }
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
      }

      if (player.state !== 'AUTO_ATTACK' || (player.stateTimer || 0) < 0.04) {
        player._advLv1FallbackShot = false;
      }
      const prevDidAction = Boolean(player.didActionFrame);
      const prevProjLen = this.game?.vfx?.projectiles?.length || 0;
      const combatTarget = this.skillSets.resolveTarget(player, target);
      const normAutoVz = Math.max(
        -1,
        Math.min(1, (player._advAiVelZ || 0) / Math.max(1, maxAutoVz))
      );
      this.skillSets.beginPlayerStep(dt, player, combatTarget, isMovingCombat, normAutoVz);
      player.update(dt, combatTarget, this.game);
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
        this.progression.onPlayerCastBasicAttack(player, combatTarget || target, this.game, {
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
        this.progression.onPlayerCastBasicAttack(player, combatTarget || target, this.game, {
          heroAlreadySpawnedProjectile
        });
      }
      this.progression.syncGaugesToPlayer(player);
      return;
    }

    // =========================================================================
    // MANUAL 360° 3D CONTROL: SNAPPY OBSTACLE-DODGING WALK + PURE 3D EVADE DASH
    // =========================================================================
    const maxSpeedX = 316 * stats.moveSpeedMult;
    const maxSpeedZ = 192 * stats.moveSpeedMult;
    let targetVx = 0;
    let targetVy = 0;
    let rawDirX = 0;
    let rawDirY = 0;

    if (this.joyActive) {
      const mag = Math.hypot(this.joyX, this.joyY);
      const deadzone = 0.06;
      if (mag > deadzone) {
        const u = Math.min(1, (mag - deadzone) / 0.72);
        // Snappy responsive curve: gentle thumb tilts respond immediately (>=70% speed at 50% tilt) & ~78% throw hits full speed!
        const curved = Math.pow(u, 0.72);
        const nx = this.joyX / mag;
        const ny = this.joyY / mag;
        rawDirX = nx * curved;
        rawDirY = ny * curved;
        targetVx = rawDirX * maxSpeedX;
        targetVy = rawDirY * maxSpeedZ;
      }
    } else {
      const kbX = (this.heldRight || this.uiHeldRight ? 1 : 0) - (this.heldLeft || this.uiHeldLeft ? 1 : 0);
      const kbY = (this.heldDown || this.uiHeldDown ? 1 : 0) - (this.heldUp || this.uiHeldUp ? 1 : 0);
      const mag = Math.hypot(kbX, kbY);
      if (mag > 0) {
        const inv = mag > 1 ? 1 / mag : 1;
        rawDirX = kbX * inv;
        rawDirY = kbY * inv;
        targetVx = rawDirX * maxSpeedX;
        targetVy = rawDirY * maxSpeedZ;
      }
    }

    const isReleasing = Math.abs(targetVx) < 0.01 && Math.abs(targetVy) < 0.01;
    const smoothAlpha = Math.min(1, dt * (isReleasing ? 44 : 38));
    if (targetVx !== 0 && this.smoothVelX !== 0 && targetVx * this.smoothVelX < 0) {
      this.smoothVelX = targetVx;
    } else {
      this.smoothVelX += (targetVx - this.smoothVelX) * smoothAlpha;
    }
    if (targetVy !== 0 && this.smoothVelY !== 0 && targetVy * this.smoothVelY < 0) {
      this.smoothVelY = targetVy;
    } else {
      this.smoothVelY += (targetVy - this.smoothVelY) * smoothAlpha;
    }
    if (Math.abs(targetVx) < 0.01 && Math.abs(this.smoothVelX) < 2.0) this.smoothVelX = 0;
    if (Math.abs(targetVy) < 0.01 && Math.abs(this.smoothVelY) < 2.0) this.smoothVelY = 0;

    const moveDirX = Math.abs(rawDirX) > 0.06 ? (rawDirX > 0 ? 1 : -1) : 0;
    player.manualMoveAxis = rawDirX;
    const isMoving3D = Math.hypot(this.smoothVelX, this.smoothVelY) > 1.2 || Math.hypot(rawDirX, rawDirY) > 0.012;

    // Continuous hold-to-attack on primary thumb orb or [J/Z] — works simultaneously while dragging joystick!
    if (!this.queuedAction && (this.heldAttack || this.uiHeldAttack)) {
      this.queuedAction = 'attack';
      this.queuedActionTimer = 0.58;
    }

    // Pure 3D Dodge can cancel AUTO_ATTACK immediately so players can reactively evade boss/monster telegraphs!
    const isInstantDodgeCancel =
      player.state === 'AUTO_ATTACK' && this.queuedAction === 'dodge' && player.dodgeCooldown <= 0;

    // Allow cancelling AUTO_ATTACK recovery into Skill/Overdrive/Ultimate OR combo-chaining the next Basic Attack!
    const isAttackRecoveryCancel =
      player.state === 'AUTO_ATTACK' &&
      player.didActionFrame &&
      this.queuedAction &&
      (this.queuedAction !== 'attack' ||
        (player.autoCooldown <= 0 &&
          player.stateTimer >=
            (player.hasHackAndSlashCombo?.()
              ? (player.autoDuration || 0.44) * 0.72
              : Math.min(0.35, (player.autoDuration || 0.48) * 0.72))));

    const canAct =
      !player.isDead &&
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      !player._advPureDodge &&
      (player.state === 'IDLE' ||
        player.state === 'WALK' ||
        isInstantDodgeCancel ||
        isAttackRecoveryCancel);

    const lockTarget = this.manualTargetLock && target && !target.isDead ? target : null;

    if (canAct && this.queuedAction) {
      const act = this.queuedAction;
      if (
        act === 'ultimate' &&
        player.hasTrueUltimate &&
        this.progression.astralCharge >= 99.9 &&
        typeof player.updateTrueUltimate === 'function'
      ) {
        this.queuedAction = null;
        if (lockTarget) {
          player.facing = lockTarget.x >= player.x ? 1 : -1;
        } else if (moveDirX !== 0) {
          player.facing = moveDirX;
        }
        this.progression.astralCharge = 0;
        this.progression.syncGaugesToPlayer(player);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('TRUE_ULTIMATE');
        this.game.triggerTrueUltimateCinematic(player);
      } else if (act === 'overdrive' && this.progression.ultCharge >= 99.9) {
        this.queuedAction = null;
        if (lockTarget) {
          player.facing = lockTarget.x >= player.x ? 1 : -1;
        } else if (moveDirX !== 0) {
          player.facing = moveDirX;
        }
        this.progression.ultCharge = 0;
        this.progression.gainAstralRelic(
          stats.ultResonanceAstral,
          player,
          'ECLIPSE SEAL RESONANCE!'
        );
        this.progression.syncGaugesToPlayer(player);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('ULTIMATE');
        this.onPlayerCastSkillOrOverdrive(player);
        this.game.triggerUltimateCinematic(player);
      } else if (act === 'skill' && player.skillCooldown <= 0) {
        if (this.progression.trySpendSkillSpirit()) {
          this.queuedAction = null;
          if (lockTarget) {
            player.facing = lockTarget.x >= player.x ? 1 : -1;
          } else if (moveDirX !== 0) {
            player.facing = moveDirX;
          }
          this.skillCdMax = Math.max(
            3.8,
            (player.skillMaxCooldown || 4.5) * 1.15 * (stats.skillCdMult ?? 1)
          );
          player.skillCooldown = this.skillCdMax;
          if (player.stats) player.stats.skillsUsed++;
          player.setState('SKILL');
          this.queueTwinSpiritEcho(player);
          this.onPlayerCastSkillOrOverdrive(player);
        } else {
          this.queuedAction = null;
          this.game.vfx?.spawnDamageText(
            player.x,
            player.y - 142,
            0,
            false,
            `NEED ${stats.skillSpiritCost} SPIRIT!`,
            '#c084fc'
          );
        }
      } else if (act === 'dodge' && player.dodgeCooldown <= 0) {
        // 100% Pure Non-Attacking Bespoke 11-Champion 360° 3D Evade (zero projectiles, zero decoys, zero damage!)
        this.queuedAction = null;
        const inputMag = Math.hypot(rawDirX, rawDirY);
        let evadeX = 0;
        let evadeZ = 0;
        if (inputMag > 0.08) {
          evadeX = rawDirX / inputMag;
          evadeZ = rawDirY / inputMag;
        } else if (
          lockTarget &&
          !lockTarget.isDestructibleProp &&
          Math.abs(lockTarget.x - player.x) < 280
        ) {
          evadeX = player.x <= lockTarget.x ? -1 : 1;
          evadeZ = 0;
        } else {
          evadeX = player.facing || 1;
          evadeZ = 0;
        }
        this.startHeroAdventureDodge(player, evadeX, evadeZ, stats);
      } else if (act === 'attack' && player.autoCooldown <= 0) {
        this.queuedAction = null;
        const isHns = Boolean(player.hasHackAndSlashCombo?.());
        const hnsLockRange = player.getHackAndSlashLockRange?.() || 275;
        if (!this.manualTargetLock) {
          if (moveDirX !== 0) {
            player.facing = moveDirX;
          }
          this._comboLockTarget = null;
        } else {
          const validLockMonster =
            lockTarget &&
            !lockTarget.isDead &&
            !lockTarget.isDestructibleProp &&
            !lockTarget.isDummyFocal;
          const lockableHnsTarget =
            isHns &&
            validLockMonster &&
            (lockTarget.isColossalBoss || Math.abs(lockTarget.x - player.x) <= hnsLockRange);
          if (isHns) {
            if (lockableHnsTarget) {
              player.facing = lockTarget.x >= player.x ? 1 : -1;
              this._comboLockTarget = lockTarget;
            } else if (validLockMonster) {
              player.facing = lockTarget.x >= player.x ? 1 : -1;
              this._comboLockTarget = null;
            } else {
              if (moveDirX !== 0) {
                player.facing = moveDirX;
              }
              this._comboLockTarget = null;
            }
          } else if (lockTarget) {
            player.facing = lockTarget.x >= player.x ? 1 : -1;
            this._comboLockTarget = lockTarget;
          } else if (moveDirX !== 0) {
            player.facing = moveDirX;
          }
        }
        this.comboResetTimer = 1.85;
        player.setState('AUTO_ATTACK');
        if (isHns) {
          if ((player.comboStep || 0) !== 0) {
            this.autoCdMax = 0.34;
            player.autoCooldown = player.heroId?.endsWith('_ex') ? 0.015 : 0.03;
          } else {
            this.autoCdMax = 0.36;
            player.autoCooldown = 0.34;
            this._comboLockTarget = null;
          }
        } else {
          this.autoCdMax = player.autoInterval || 0.44;
          player.autoCooldown = this.autoCdMax;
        }
      } else if (act !== 'attack' && act !== 'dodge' && act !== 'skill' && act !== 'overdrive' && act !== 'ultimate') {
        this.queuedAction = null;
      }
    }

    // Advance Bespoke 11-Champion Pure Non-Attacking 360° 3D Evade Dash when active
    if (player._advPureDodge) {
      if (this.updateHeroAdventureDodge(dt, player)) {
        return;
      }
    }

    // Apply brisk 360° 3D movement in IDLE/WALK AND allow responsive strafing during AUTO_ATTACK!
    if (
      !player.isDead &&
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      (player.state === 'IDLE' || player.state === 'WALK')
    ) {
      player._advVaultVelZ = 0;
      if (isMoving3D && !this.game.isMatchOver) {
        player._manualWalkActive = true;
        player._manualSpeedRatio = Math.max(
          0.32,
          Math.min(
            1.2,
            Math.hypot(
              this.smoothVelX / Math.max(1, maxSpeedX),
              this.smoothVelY / Math.max(1, maxSpeedZ)
            )
          )
        );
        if (moveDirX !== 0) {
          player.facing = moveDirX;
        }
        player.moveDir = 1;
        player.state = 'WALK';
        player.x += this.smoothVelX * dt;
        this.shiftEntityDepth(player, this.smoothVelY * dt);
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
        player.moveDir = 0;
        if (!this.game.isMatchOver) {
          player.state = 'IDLE';
        }
      }
      this.skillSets.beginPlayerStep(dt, player, null, isMoving3D, rawDirY);
      player.update(dt, null, this.game);
    } else {
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      if (
        player.state === 'AUTO_ATTACK' &&
        !player.isDead &&
        !(player.stunTimer > 0) &&
        !player.isRooted &&
        isMoving3D &&
        !this.game.isMatchOver
      ) {
        if (player.isHackAndSlashMelee?.()) {
          // Allow smooth 2.5D depth-lane micro-steering while preserving Hack-and-Slash cross-through & 180° turns!
          this.shiftEntityDepth(player, this.smoothVelY * 0.85 * dt);
        } else {
          // Simultaneous Run-and-Cast: glide smoothly along joystick vector!
          player.x += this.smoothVelX * 0.82 * dt;
          this.shiftEntityDepth(player, this.smoothVelY * 0.85 * dt);
          if (lockTarget) {
            player.facing = lockTarget.x >= player.x ? 1 : -1;
          } else if (moveDirX !== 0) {
            player.facing = moveDirX;
          }
        }
      } else {
        player._advVaultVelZ = 0;
      }

      if (player.state !== 'AUTO_ATTACK' || (player.stateTimer || 0) < 0.04) {
        player._advLv1FallbackShot = false;
      }
      const prevDidAction = Boolean(player.didActionFrame);
      const prevProjLen = this.game?.vfx?.projectiles?.length || 0;
      const combatTarget = this.skillSets.resolveTarget(player, lockTarget);
      this.skillSets.beginPlayerStep(dt, player, combatTarget, isMoving3D, rawDirY);
      player.update(dt, combatTarget, this.game);
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
      if (
        player.state === 'AUTO_ATTACK' &&
        !player.isHackAndSlashMelee?.() &&
        isMoving3D &&
        Math.abs(player.vx) > 8
      ) {
        const isMeleeForwardLunge =
          (player.attackRange || 180) < 300 && player.vx * this.smoothVelX >= -5;
        if (!isMeleeForwardLunge) {
          player.vx *= 0.22;
        }
      }
      const hidManual = player.heroId || '';
      const isRangedExManual =
        hidManual === 'mage_ex' ||
        hidManual === 'priestess_ex' ||
        hidManual === 'icemage_ex' ||
        hidManual === 'valkyrie_ex' ||
        hidManual === 'archer_ex';
      if (player.state === 'AUTO_ATTACK' && !prevDidAction && player.didActionFrame) {
        player._advLv1FallbackShot = true;
        this.progression.onPlayerCastBasicAttack(player, lockTarget || combatTarget, this.game, {
          heroAlreadySpawnedProjectile
        });
      } else if (
        isRangedExManual &&
        player.state === 'AUTO_ATTACK' &&
        !player.didActionFrame &&
        !player._advLv1FallbackShot &&
        (player.stateTimer || 0) >= 0.16
      ) {
        player._advLv1FallbackShot = true;
        this.progression.onPlayerCastBasicAttack(player, lockTarget || combatTarget, this.game, {
          heroAlreadySpawnedProjectile
        });
      }
      this.progression.syncGaugesToPlayer(player);
    }
  }

  getActiveStageBounds() {
    const colossalAlive = Boolean(
      this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
    );
    if (colossalAlive) {
      return { minX: this.getBossMinWalkX(), maxX: this.getBossMaxWalkX() };
    }
    if (this.lockActive) {
      return { minX: this.lockMinX, maxX: this.lockMaxX };
    }
    const activeZones = this.getActiveZones();
    const worldW = this.getWorldWidth();
    const z = activeZones[this.zoneIndex] || activeZones[0] || ADVENTURE_ZONES[0];
    return {
      minX: Math.max(80, z.minX + 60),
      maxX: Math.min(worldW - 80, z.maxX - 60)
    };
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game;
    const player = g.leftFighter;
    if (this.isSkillTreeOpen) {
      if (g.isMatchOver && player?.isDead) {
        this.closeSkillTree(false);
      } else {
        this.syncControlDeckUI();
        return;
      }
    }
    if (this.isRelicDraftOpen) {
      if (g.isMatchOver && player?.isDead) {
        this.closeRelicDraft(false);
      } else {
        this.syncControlDeckUI();
        return;
      }
    }
    if (!player) return;

    let effDt = dt;
    if (this._perfectDodgeSlowTimer > 0) {
      this._perfectDodgeSlowTimer = Math.max(0, this._perfectDodgeSlowTimer - dt);
      effDt = dt * 0.28;
    }
    if (this._perfectDodgeBannerTimer > 0) {
      this._perfectDodgeBannerTimer = Math.max(0, this._perfectDodgeBannerTimer - dt);
    }
    if (player._phantomEmpowerReady) {
      player._phantomEmpowerTimer = Math.max(0, (player._phantomEmpowerTimer || 0) - effDt);
      if (player._phantomEmpowerTimer <= 0) {
        player._phantomEmpowerReady = false;
      }
    }

    this.goBlinkTimer += dt;
    this.progression.update(effDt, player);
    this.skillSets.update(effDt, player);
    this.flushPendingHeroProgressSave(false);

    const activeZones = this.getActiveZones();
    const lastZoneIdx = Math.max(0, activeZones.length - 1);
    const worldW = this.getWorldWidth();
    const bossCfg = this.getBossConfig();
    const bossAnchorX = bossCfg.anchorX || ADVENTURE_BOSS_ANCHOR_X;
    const bossGroundY = bossCfg.groundY || this.depthMidY || ADVENTURE_DEPTH_MID_Y;
    const bossMaxWalkX = bossAnchorX - 85;
    const bossMinWalkX = Math.max(80, bossAnchorX - 955);

    // 1. Boss Warning Countdown -> Boil the East Abyssal Throne Rim, then Spawn Colossal Boss (facing -1 LEFT)!
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer = Math.max(0, this.bossWarningTimer - effDt);
      this._bossWarnPulseTimer = (this._bossWarnPulseTimer || 0) - effDt;
      if (this._bossWarnPulseTimer <= 0) {
        this._bossWarnPulseTimer = 0.28;
        const gx = bossAnchorX - 70 + Math.round(Math.random() * 145);
        g.vfx?.spawnShockwave?.(gx, 628, 125, '#fb923c', 0.30, true);
        g.vfx?.spawnBurst?.(gx, 622, 12, '#fef08a', 215, {
          upBias: 220,
          size: 5.5,
          life: 0.44
        });
        g.renderer?.triggerShake?.(6, 0.14);
      }
      if (this.bossWarningTimer <= 0 && this.bossSpawnPending) {
        this.bossSpawnPending = false;
        const isRangedHero = (player.attackRange || 180) >= 320;
        const bossEntryX = Math.max(bossMinWalkX + 60, bossAnchorX - (isRangedHero ? 495 : 170));
        if (player.x > bossMaxWalkX) player.x = bossEntryX;
        else if (player.x < bossAnchorX - 855) player.x = bossEntryX;
        else if (!isRangedHero && player.x < bossAnchorX - 255) player.x = bossEntryX;
        player.facing = 1;
        this.bossEntity = this.spawnMonster('archfiend', bossAnchorX, {
          groundY: bossGroundY,
          name: bossCfg.name,
          maxHp: bossCfg.maxHp
        });
        this.syncRightHUD();
      }
    }

    // 2. Prune decayed monster corpses (after death animation finishes) so waves stay crisp
    for (let i = g.fighters.length - 1; i >= 0; i--) {
      const f = g.fighters[i];
      if (f && f.isMonster && !f.isBoss && f.isDead && (f.deathTimer || 0) >= 1.85) {
        g.fighters.splice(i, 1);
      }
    }

    // 3. Wave Clear & 2-SubWave-Per-Realm Progression across built-in 9600px or custom Stage Packs
    if (!g.isMatchOver && !this.bossSpawnPending) {
      const livingMonsters = this.getLivingMonsters();

      if (this.lockActive && livingMonsters.length === 0) {
        if (this.subWave === 1) {
          this.unlockSubWave(this.zoneIndex);
        } else if (this.zoneIndex < lastZoneIdx) {
          this.unlockCurrentZone(this.zoneIndex);
        } else if (this.activeCampaignPack && this.subWave === 2) {
          // Final zone SubWave 2 cleared on a custom Stage Pack: launch Colossal Boss (or complete pack if boss disabled)!
          if (bossCfg.enabled !== false) {
            this.spawnZoneEncounter(lastZoneIdx, 3);
          } else {
            this.completeCampaignVictory(g.rightFighter || player);
          }
        }
      }

      // Check if player walked across the current zone's midTriggerX (SubWave 2) or next zone's triggerX (SubWave 1)
      if (!this.lockActive && !this.isRelicDraftOpen) {
        const curZone = activeZones[this.zoneIndex];
        if (curZone && this.subWave === 1 && player.x >= curZone.midTriggerX) {
          this.spawnZoneEncounter(this.zoneIndex, 2);
        } else if (this.subWave >= 2 && this.zoneIndex < lastZoneIdx) {
          const nextZone = activeZones[this.zoneIndex + 1];
          if (nextZone && player.x >= nextZone.triggerX) {
            this.spawnZoneEncounter(this.zoneIndex + 1, 1);
          }
        }
      }
    }

    // 4. Update Pickups, Dimensional Summoning Portals, Monster Plumes & Active Sovereign Relic Effects
    this.updatePickups(effDt, player);
    this.updateRelicEffects(effDt, player);
    for (let i = this.portals.length - 1; i >= 0; i--) {
      const p = this.portals[i];
      p.age += effDt;
      if (p.age >= p.maxLife) {
        this.portals.splice(i, 1);
      }
    }
    for (let i = (this.monsterPlumes?.length || 0) - 1; i >= 0; i--) {
      const plume = this.monsterPlumes[i];
      plume.age += effDt;
      if (plume.age >= plume.maxLife) {
        this.monsterPlumes.splice(i, 1);
      }
    }

    // 5. Update Player (Manual or Auto-Play) + Clamp Arena Walk Bounds + Update Active Monsters
    const syncAdvCastGrace = (isPostStep) => {
      if (!player) return;
      if (player.state === 'TRUE_ULTIMATE') {
        player._advRecentCastSource = 'true_ult';
        player._advRecentCastTimer = 0.45;
      } else if (player.state === 'ULTIMATE') {
        player._advRecentCastSource = 'ult';
        player._advRecentCastTimer = 0.45;
      } else if (player.state === 'SKILL') {
        player._advRecentCastSource = 'skill';
        player._advRecentCastTimer = 0.45;
      } else if (isPostStep && (player._advRecentCastTimer || 0) > 0) {
        player._advRecentCastTimer = Math.max(0, player._advRecentCastTimer - effDt);
        if (player._advRecentCastTimer <= 0) {
          player._advRecentCastSource = null;
        }
      }
    };
    syncAdvCastGrace(false);
    const nearestMonster = this.getNearestLivingMonster(player);
    this.processPlayerControls(effDt, player, nearestMonster);
    syncAdvCastGrace(true);

    // Keep player out of the Right-Side Colossal Boss's throne parapet & inside wave locks!
    const colossalAlive = Boolean(
      this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
    );
    const minWalkX = colossalAlive
      ? this.lockActive
        ? this.lockMinX
        : bossMinWalkX
      : this.lockActive
        ? this.lockMinX
        : 80;
    const maxWalkX = colossalAlive
      ? bossMaxWalkX
      : this.lockActive
        ? this.lockMaxX
        : worldW - 80;
    this.skillSets.endPlayerStep(effDt, player, minWalkX, maxWalkX, colossalAlive);
    if (player.x < minWalkX) player.x = minWalkX;
    if (player.x > maxWalkX) player.x = maxWalkX;

    for (const f of g.fighters) {
      if (!f || f === player) continue;
      f.update(effDt, player, g);
      if (this.lockActive && f.isMonster && !f.isDead && !f.isColossalBoss) {
        const mMin = minWalkX + 18;
        const mMax = Math.max(mMin, maxWalkX - 18);
        if (f.x < mMin) f.x = mMin;
        if (f.x > mMax) f.x = mMax;
      }
    }

    // 6. Update Interactive 2.5D Destructible Terrain, Reliquaries & Tactical Hazards
    this.destructibles.update(effDt, player, g);

    this.syncRightHUD();
    this.syncControlDeckUI();
  }

  getStandingProps() {
    return this.active && this.destructibles ? this.destructibles.getStandingProps() : [];
  }

  renderWorldFloor(ctx, renderer) {
    if (!this.active || !ctx) return;
    const t = renderer?.time || 0;
    const roadTop = 438;
    const roadBot = 684;

    // -1. Render Destructible Prop Contact Shadows & Shattered Rubble Bases on Causeway Floor
    this.destructibles?.renderRubbleAndShadows(ctx, renderer);

    // -0.5. Render Dimensional Summoning Portal 2.5D Foreshortened Ground Rune Seals (`advFxSheet` Row 4 Cols 4..7)
    if (this.portals.length > 0) {
      const assets = PixelForge.initAssets();
      const fxSheet = PixelForge.ensureImage?.(assets?.advFxSheet) || assets?.advFxSheet;
      const fxReady =
        Boolean(fxSheet) &&
        (typeof HTMLImageElement === 'undefined' ||
          !(fxSheet instanceof HTMLImageElement) ||
          (fxSheet.complete && fxSheet.naturalWidth > 0));

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const pHasBounds = Boolean(
        renderer && Number.isFinite(renderer.camX) && Number.isFinite(renderer.width) && renderer.width > 0
      );
      const pHalfSpan = pHasBounds
        ? (renderer.width * 0.5) / Math.max(0.1, renderer.zoom || 1) + 260
        : Infinity;
      for (const p of this.portals) {
        if (pHasBounds && Math.abs(p.x - renderer.camX) > pHalfSpan) continue;
        const u = Math.max(0, Math.min(1, p.age / p.maxLife));
        const openScale = p.age < 0.22 ? 0.35 + 0.65 * (p.age / 0.22) : u > 0.75 ? 1 - 0.55 * ((u - 0.75) / 0.25) : 1;
        const alpha = p.age < 0.14 ? p.age / 0.14 : u > 0.72 ? (1 - u) / 0.28 : 1;
        if (alpha <= 0.01) continue;

        const px = Math.round(p.x);
        const py = Math.round(p.groundY);
        const sealW = Math.round((p.isElite ? 196 : 176) * openScale);
        const sealH = Math.round((p.isElite ? 82 : 74) * openScale);
        const z = Math.max(0, Math.min(3, p.zone | 0));

        const glowTex = renderer?.getGlowForColor
          ? renderer.getGlowForColor(p.primaryColor)
          : renderer?.glowCyan;
        if (glowTex) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.16, 0.15 * alpha);
          ctx.drawImage(glowTex, Math.round(px - sealW * 0.55), Math.round(py - sealH * 0.55), Math.round(sealW * 1.1), Math.round(sealH * 1.1));
          ctx.restore();
        }

        ctx.globalAlpha = Math.min(0.92, alpha);
        if (fxReady && sealW >= 8 && sealH >= 6) {
          ctx.drawImage(
            fxSheet,
            (4 + z) * 128,
            512,
            128,
            128,
            Math.round(px - sealW * 0.5),
            Math.round(py - sealH * 0.5),
            sealW,
            sealH
          );
        } else {
          ctx.fillStyle = p.primaryColor || '#38bdf8';
          ctx.fillRect(Math.round(px - sealW * 0.4), py - 4, Math.round(sealW * 0.8), 8);
        }
      }
      ctx.restore();
    }

    // 0. Render Champion Adventure Skill Set 2.5D Floor Zones & Sanctuary Seals
    this.skillSets.renderFloor(ctx);

    // 1. Render Monster 3D Floor Telegraph Rings & Colossal Siege Corridors
    for (const f of this.game.fighters) {
      if (f && f.isMonster && !f.isDead && typeof f.drawTelegraphRings === 'function') {
        f.drawTelegraphRings(ctx);
      }
    }

    // 2. Render 3D Floor-Spanning Arcane Seal Barriers when screen is wave-locked
    if (this.lockActive) {
      ctx.save();
      const pulse = 0.44 + 0.22 * Math.sin(t * 6.5);
      const worldLim = this.getWorldWidth() - 70;
      for (const gateX of [this.lockMinX - 16, this.lockMaxX + 16]) {
        if (gateX <= 70 || gateX >= worldLim) continue;
        const gx = Math.round(gateX);
        ctx.fillStyle = `rgba(251, 146, 60, ${(pulse * 0.24).toFixed(3)})`;
        ctx.fillRect(gx - 6, roadTop, 12, roadBot - roadTop);
        ctx.fillStyle = `rgba(254, 240, 138, ${(pulse * 0.76).toFixed(3)})`;
        for (let seg = 0; seg < 8; seg++) {
          const sy = Math.round(roadTop + ((seg * 32 + t * 52) % (roadBot - roadTop - 12)));
          ctx.fillRect(gx - 2, sy, 4, 14);
        }
        for (const pyY of [roadTop + 4, roadBot - 4]) {
          ctx.fillStyle = '#0d0f1a';
          ctx.fillRect(gx - 7, pyY - 38, 14, 40);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(gx - 5, pyY - 36, 10, 36);
          ctx.fillStyle = '#fb923c';
          ctx.fillRect(gx - 3, pyY - 30, 6, 18);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(gx - 1, pyY - 26, 2, 10);
        }
      }
      ctx.restore();
    }

    // 3. Render Generated & Pixel-Converted HD-2D 3D RPG Pickups (`Solar Elixir +HP`, `Soul Ember +NOVA`, `Astral Relic +SEAL`)
    if (this.pickups.length > 0) {
      const assets = PixelForge.initAssets();
      const propsSheet = PixelForge.ensureImage?.(assets?.advPropsSheet) || assets?.advPropsSheet;
      const sheetReady =
        Boolean(propsSheet) &&
        (typeof HTMLImageElement === 'undefined' ||
          !(propsSheet instanceof HTMLImageElement) ||
          (propsSheet.complete && propsSheet.naturalWidth > 0));

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const pkHasBounds = Boolean(
        renderer && Number.isFinite(renderer.camX) && Number.isFinite(renderer.width) && renderer.width > 0
      );
      const pkHalfSpan = pkHasBounds
        ? (renderer.width * 0.5) / Math.max(0.1, renderer.zoom || 1) + 220
        : Infinity;
      const sortedPickups =
        this.pickups.length > 1
          ? [...this.pickups].sort(
              (a, b) => (a.groundY || a.y || 561) - (b.groundY || b.y || 561)
            )
          : this.pickups;
      for (const pk of sortedPickups) {
        if (pkHasBounds && Math.abs(pk.x - renderer.camX) > pkHalfSpan) continue;
        const pkGy = Math.round(Number.isFinite(pk.groundY) ? pk.groundY : pk.y);
        const bob = Math.round(Math.sin(t * 5.2 + pk.x * 0.03) * 6);
        const px = Math.round(pk.x);
        const py = Math.round(pk.y - 28 + bob);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.fillRect(px - 16, pkGy - 4, 32, 6);

        const isHp = pk.type === 'hp';
        const isEmber = pk.type === 'ember' || pk.type === 'mana';
        const colCore = isHp ? '#bbf7d0' : isEmber ? '#fef08a' : '#ecfeff';
        const tag = isHp ? '+HP' : isEmber ? '+EMBER' : '+SEAL';
        const baseCol = isHp ? 0 : isEmber ? 2 : 4;
        const gleam = Math.floor(t * 4.2 + pk.x * 0.05) % 2;

        // Subtle <= 0.15 floor & aura glow
        const glowTex = isHp
          ? renderer?.glowEmerald || renderer?.glowCyan
          : isEmber
            ? renderer?.glowOrange
            : renderer?.glowCyan;
        if (glowTex) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.15;
          ctx.drawImage(glowTex, px - 34, py - 34, 68, 68);
          ctx.restore();
        }

        if (sheetReady) {
          ctx.drawImage(
            propsSheet,
            (baseCol + gleam) * 128,
            512,
            128,
            128,
            px - 32,
            py - 32,
            64,
            64
          );
        } else {
          const colMain = isHp ? '#22c55e' : isEmber ? '#fb923c' : '#38bdf8';
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(px - 12, py - 12, 24, 24);
          ctx.fillStyle = colMain;
          ctx.fillRect(px - 10, py - 10, 20, 20);
        }

        ctx.font = '8px "ArcanePixel", "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#05070e';
        ctx.fillText(tag, px + 1, py - 27);
        ctx.fillStyle = colCore;
        ctx.fillText(tag, px, py - 28);
      }
      ctx.restore();
    }
  }

  renderWorldMid(ctx, renderer) {
    if (!this.active || !ctx) return;

    // Render Standing Biome-Matched HD-2D Dimensional Summoning Portals BEHIND emerging Realm enemies (`advFxSheet` Rows 0..3 Cols 0..3)
    if (this.portals.length > 0) {
      const assets = PixelForge.initAssets();
      const fxSheet = PixelForge.ensureImage?.(assets?.advFxSheet) || assets?.advFxSheet;
      const fxReady =
        Boolean(fxSheet) &&
        (typeof HTMLImageElement === 'undefined' ||
          !(fxSheet instanceof HTMLImageElement) ||
          (fxSheet.complete && fxSheet.naturalWidth > 0));

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const pHasBounds = Boolean(
        renderer && Number.isFinite(renderer.camX) && Number.isFinite(renderer.width) && renderer.width > 0
      );
      const pHalfSpan = pHasBounds
        ? (renderer.width * 0.5) / Math.max(0.1, renderer.zoom || 1) + 260
        : Infinity;
      const sortedPortals =
        this.portals.length > 1
          ? [...this.portals].sort((a, b) => (a.groundY || 561) - (b.groundY || 561))
          : this.portals;

      for (const p of sortedPortals) {
        if (pHasBounds && Math.abs(p.x - renderer.camX) > pHalfSpan) continue;
        const u = Math.max(0, Math.min(1, p.age / p.maxLife));
        let scaleX = 1.0;
        let scaleY = 1.0;
        let alpha = 1.0;

        if (p.age < 0.20) {
          const k = p.age / 0.20;
          const ease = 1 - Math.pow(1 - k, 3);
          scaleX = 0.16 + 0.88 * ease;
          scaleY = 0.76 + 0.26 * ease;
          alpha = Math.min(1, k * 1.4);
        } else if (u < 0.74) {
          const pulse = Math.sin(p.age * 12.0 + p.seed);
          scaleX = 1.0 + 0.035 * pulse;
          scaleY = 1.0 - 0.02 * pulse;
          alpha = 1.0;
        } else {
          const k = (u - 0.74) / 0.26;
          scaleX = Math.max(0.10, 1 - 0.88 * k * k);
          scaleY = 1.0 + 0.10 * k;
          alpha = Math.max(0, 1 - k);
        }
        if (alpha <= 0.01) continue;

        const px = Math.round(p.x);
        const py = Math.round(p.groundY + 6);
        const baseW = p.isElite ? 214 : 196;
        const baseH = p.isElite ? 224 : 206;
        const dw = Math.max(8, Math.round(baseW * scaleX));
        const dh = Math.max(16, Math.round(baseH * scaleY));
        const dx = Math.round(px - dw * 0.5);
        const dy = Math.round(py - (122 / 128) * dh);
        const z = Math.max(0, Math.min(3, p.zone | 0));
        const frame = Math.floor(p.age * 11.5 + p.seed) & 3;

        const glowTex = renderer?.getGlowForColor
          ? renderer.getGlowForColor(p.primaryColor)
          : renderer?.glowCyan;
        if (glowTex) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.16, 0.15 * alpha);
          ctx.drawImage(
            glowTex,
            Math.round(px - dw * 0.62),
            Math.round(py - dh * 0.82),
            Math.round(dw * 1.24),
            Math.round(dh * 0.96)
          );
          ctx.restore();
        }

        ctx.globalAlpha = alpha;
        if (fxReady) {
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

    this.skillSets.renderMid(ctx);
  }

  renderWorldForeground(ctx, renderer) {
    if (!this.active || !ctx) return;

    // Crisp foreground Portal Rim Sparks IN FRONT of emerging monsters so enemies stride through the rift plane!
    if (this.portals.length > 0) {
      const sparkCols = [
        ['#e0f2fe', '#fde047'],
        ['#a7f3d0', '#5eead4'],
        ['#f3e8ff', '#e879f9'],
        ['#fef08a', '#fb923c']
      ];
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const p of this.portals) {
        if (p.age >= 1.12) continue;
        const fade = p.age > 0.85 ? 1 - (p.age - 0.85) / 0.27 : 1;
        const z = Math.max(0, Math.min(3, p.zone | 0));
        const cols = sparkCols[z];
        for (let s = 0; s < 5; s++) {
          const cyc = (p.age * (1.8 + (s % 2) * 0.45) + s * 0.21 + p.seed) % 1;
          const sx = Math.round(
            p.x + Math.cos(p.age * 5.2 + s * 1.35) * (46 + (s % 2) * 14)
          );
          const sy = Math.round(p.groundY - 18 - cyc * 148);
          ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.88 * fade;
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(sx - 3, sy - 3, 6, 6);
          ctx.fillStyle = cols[s & 1];
          ctx.fillRect(sx - 2, sy - 2, 4, 4);
        }
      }
      ctx.restore();
    }

    if (this.monsterPlumes?.length > 0) {
      const assets = PixelForge.initAssets();
      const stageVfx = PixelForge.ensureImage?.(assets?.advStageVfx) || assets?.advStageVfx;
      const stageReady =
        Boolean(stageVfx) &&
        (typeof HTMLImageElement === 'undefined' ||
          !(stageVfx instanceof HTMLImageElement) ||
          (stageVfx.complete && stageVfx.naturalWidth > 0));
      const pHasBounds = Boolean(
        renderer && Number.isFinite(renderer.camX) && Number.isFinite(renderer.width) && renderer.width > 0
      );
      const pHalfSpan = pHasBounds
        ? (renderer.width * 0.5) / Math.max(0.1, renderer.zoom || 1) + 260
        : Infinity;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const p of this.monsterPlumes) {
        if (pHasBounds && Math.abs(p.x - renderer.camX) > pHalfSpan) continue;
        const u = Math.max(0, Math.min(1, p.age / Math.max(0.05, p.maxLife || 0.48)));
        const alpha = u < 0.15 ? u / 0.15 : Math.max(0, 1 - (u - 0.15) / 0.85);
        if (alpha <= 0.01) continue;

        if (stageReady && ctx.drawImage) {
          const frame = Math.min(15, Math.max(0, Math.floor(u * 16)));
          const drawSz = Math.round(128 * (p.scale || 1.6));
          const dx = Math.round(p.x - drawSz * 0.5);
          const dy = Math.round(p.groundY - drawSz * 0.844);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(0.92, alpha * 0.88);
          ctx.drawImage(stageVfx, frame * 128, (p.vfxRow | 0) * 128, 128, 128, dx, dy, drawSz, drawSz);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.16, alpha * 0.16);
          ctx.drawImage(stageVfx, frame * 128, (p.vfxRow | 0) * 128, 128, 128, dx, dy, drawSz, drawSz);
        }

        const sparkCnt = p.essenceSparks || 0;
        if (sparkCnt > 0 && ctx.fillRect) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(0.95, alpha * 0.92);
          const spreadR = 26 * (p.scale || 1.6);
          for (let s = 0; s < sparkCnt; s++) {
            const frac = (s + 0.5) / sparkCnt;
            const ang = p.seed + frac * Math.PI * 2 + u * 1.4;
            const lift = u * (54 + (s % 3) * 18);
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

    this.skillSets.renderForeground(ctx);
    this.destructibles?.renderDebris(ctx, renderer);

    // Sovereign Relic Boons & Phantom Evade Empower World VFX (100% nearest-neighbor stepped pixels, 0 arc/ellipse/rotate)
    const tWorld = renderer?.time || 0;
    const playerRef = this.game?.leftFighter;
    if (playerRef && !playerRef.isDead) {
      // 1. Phantom Evade Empower golden-cyan aura orbiting the hero until next crit strike
      if (playerRef._phantomEmpowerReady) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const px = Math.round(playerRef.x);
        const py = Math.round((playerRef.y || playerRef.groundY || 561) - 62);
        const pulse = 0.55 + 0.35 * Math.sin(tWorld * 14);
        ctx.globalAlpha = pulse;
        for (let i = 0; i < 4; i++) {
          const ang = tWorld * 6.5 + i * (Math.PI * 0.5);
          const ox = Math.round(px + Math.cos(ang) * 34);
          const oy = Math.round(py + Math.sin(ang) * 18);
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(ox - 4, oy - 4, 8, 8);
          ctx.fillStyle = i % 2 === 0 ? '#67e8f9' : '#fef08a';
          ctx.fillRect(ox - 3, oy - 3, 6, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ox - 1, oy - 1, 2, 2);
        }
        ctx.restore();
      }

      // 2. Orbiting Aegis Runes Relic Boon: twin pixel runes orbiting the hero
      if (this.hasRelic('orbiting_aegis_runes')) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const px = Math.round(playerRef.x);
        const py = Math.round((playerRef.y || playerRef.groundY || 561) - 56);
        for (let r = 0; r < 2; r++) {
          const ang = (this._relicAegisOrbitT || 0) + r * Math.PI;
          const rx = Math.round(px + Math.cos(ang) * 46);
          const ry = Math.round(py + Math.sin(ang) * 20);
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(rx - 5, ry - 5, 10, 10);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(rx - 4, ry - 4, 8, 8);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(rx - 2, ry - 2, 4, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(rx - 1, ry - 1, 2, 2);
        }
        ctx.restore();
      }
    }

    // 3. Chain Lightning / Aegis Zap stepped pixel lightning arcs
    if (this._relicChainArcs?.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const arc of this._relicChainArcs) {
        const u = Math.max(0, Math.min(1, arc.age / Math.max(0.05, arc.maxLife)));
        ctx.globalAlpha = Math.max(0, 1 - u);
        const segs = 7;
        let prevX = arc.x1;
        let prevY = arc.y1;
        const col = arc.color || '#38bdf8';
        for (let s = 1; s <= segs; s++) {
          const frac = s / segs;
          const jag = s === segs ? 0 : Math.sin(arc.seed + s * 4.3 + u * 24) * 14;
          const nx = arc.x1 + (arc.x2 - arc.x1) * frac;
          const ny = arc.y1 + (arc.y2 - arc.y1) * frac + jag;
          const steps = Math.max(2, Math.ceil(Math.hypot(nx - prevX, ny - prevY) / 5));
          for (let k = 0; k <= steps; k++) {
            const p = k / steps;
            const bx = Math.round(prevX + (nx - prevX) * p);
            const by = Math.round(prevY + (ny - prevY) * p);
            ctx.fillStyle = col;
            ctx.fillRect(bx - 2, by - 2, 5, 5);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(bx - 1, by - 1, 2, 2);
          }
          prevX = nx;
          prevY = ny;
        }
      }
      ctx.restore();
    }

    // 4. Exploding Dodge Afterimage solar mirage beacons
    if (this._relicDodgeMines?.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const mine of this._relicDodgeMines) {
        const u = 1 - Math.max(0, mine.timer / Math.max(0.05, mine.maxTimer || 0.22));
        const mx = Math.round(mine.x);
        const my = Math.round((mine.groundY || 561) - 34);
        const r = Math.round(10 + u * 16);
        ctx.fillStyle = 'rgba(251, 146, 60, 0.35)';
        ctx.fillRect(mx - r, Math.round((mine.groundY || 561) - 5), r * 2, 10);
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(mx - 7, my - 7, 14, 14);
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(mx - 6, my - 6, 12, 12);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(mx - 3, my - 3, 6, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx - 1, my - 1, 2, 2);
      }
      ctx.restore();
    }

    // 5. Twin Spirit Echo pending astral detonation seals
    if (this._relicSkillEchoes?.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const echo of this._relicSkillEchoes) {
        const u = 1 - Math.max(0, echo.timer / Math.max(0.05, echo.maxTimer || 0.38));
        const ex = Math.round(echo.x);
        const ey = Math.round(echo.groundY || 561);
        const hw = Math.round(28 + u * 44);
        const hh = Math.round(12 + u * 18);
        ctx.fillStyle = 'rgba(192, 132, 252, 0.24)';
        ctx.fillRect(ex - hw, ey - hh, hw * 2, hh * 2);
        ctx.fillStyle = '#e879f9';
        ctx.fillRect(ex - hw, ey - hh, hw * 2, 2);
        ctx.fillRect(ex - hw, ey + hh - 2, hw * 2, 2);
        ctx.fillRect(ex - hw, ey - hh, 2, hh * 2);
        ctx.fillRect(ex + hw - 2, ey - hh, 2, hh * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ex - 2, ey - 2, 4, 4);
      }
      ctx.restore();
    }

    // 6. Phantom Counter-Wave piercing 220px pixel astral shockwaves (100% fillRect)
    if (this._relicCounterWaves?.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const cw of this._relicCounterWaves) {
        const u = Math.max(0, Math.min(1, cw.age / Math.max(0.05, cw.maxLife || 0.28)));
        const wx = Math.round(cw.x + cw.dir * cw.range * u);
        const wy = Math.round((cw.groundY || 561) - 54);
        ctx.globalAlpha = Math.max(0, 1 - u * 0.85);
        // Stepped pixel crescent blade
        for (let row = -5; row <= 5; row++) {
          const curve = Math.round((1 - (row * row) / 28) * 18) * cw.dir;
          const bx = wx + curve;
          const by = wy + row * 7;
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(bx - 6, by - 3, 12, 6);
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(bx - 3, by - 2, 6, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx - 1, by - 1, 2, 2);
        }
      }
      ctx.restore();
    }

    // 7. Solar Meteor Calldown descending pixel meteors & ground targeting rings (100% fillRect)
    if (this._relicMeteors?.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const met of this._relicMeteors) {
        const u = 1 - Math.max(0, met.timer / Math.max(0.05, met.maxTimer || 0.34));
        const gx = Math.round(met.x);
        const gy = Math.round(met.groundY || 561);
        const dropH = Math.round((1 - u) * 380);
        const mx = Math.round(gx - (1 - u) * 95);
        const my = Math.round(gy - 28 - dropH);
        const hw = Math.round(32 + u * 44);
        const hh = Math.round(12 + u * 16);
        // Ground danger rect
        ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
        ctx.fillRect(gx - hw, gy - hh, hw * 2, hh * 2);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(gx - hw, gy - hh, hw * 2, 2);
        ctx.fillRect(gx - hw, gy + hh - 2, hw * 2, 2);
        // Blazing pixel tail + molten rock core
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(mx - 18, my - 28, 12, 16);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(mx - 12, my - 18, 14, 14);
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(mx - 11, my - 11, 22, 22);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(mx - 9, my - 9, 18, 18);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(mx - 6, my - 6, 12, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx - 3, my - 3, 6, 6);
      }
      ctx.restore();
    }

    // 8. Haste Momentum teal pixel wind streaks around the hero while buff is active
    if (playerRef && !playerRef.isDead && (this._relicHasteTimer || 0) > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const px = Math.round(playerRef.x);
      const py = Math.round((playerRef.y || playerRef.groundY || 561) - 48);
      const dir = (playerRef.facing || 1) >= 0 ? 1 : -1;
      ctx.globalAlpha = Math.min(0.85, (this._relicHasteTimer || 0) * 0.6);
      for (let i = 0; i < 3; i++) {
        const shift = ((tWorld * 140 + i * 24) % 44) * dir;
        const sx = Math.round(px - dir * 18 - shift);
        const sy = Math.round(py - 20 + i * 18);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillRect(sx - 8, sy, 16, 2);
        ctx.fillStyle = '#ccfbf1';
        ctx.fillRect(sx - 4, sy, 8, 2);
      }
      ctx.restore();
    }

    // Crisp 16-bit Pixel Target-Lock Reticle (`0` emojis, `0` ctx.rotate — Selout corner brackets + 'LOCKED' pixel tag)
    if (!this.autoPlay && this.manualTargetLock && !this.game.isMatchOver) {
      const activeLockedTarget = this.getActiveLockedMonster(this.game.leftFighter);
      if (activeLockedTarget && !activeLockedTarget.isDead) {
        const t = renderer?.time || 0;
        const pulse = Math.round(Math.sin(t * 8.0) * 3);
        let cx;
        let cy;
        let halfW;
        let halfH;
        let arm;
        if (activeLockedTarget.isColossalBoss) {
          cx = Math.round((activeLockedTarget.anchorX || activeLockedTarget.x) - 56);
          cy = Math.round((activeLockedTarget.anchorGroundY || 561) - 148);
          halfW = 74 + pulse;
          halfH = 84 + pulse;
          arm = 18;
        } else {
          cx = Math.round(activeLockedTarget.x);
          const baseY = Number.isFinite(activeLockedTarget.y)
            ? activeLockedTarget.y
            : activeLockedTarget.groundY || 561;
          const bodyH = activeLockedTarget.isMiniBoss
            ? 128
            : activeLockedTarget.isElite
              ? 108
              : 92;
          cy = Math.round(baseY - Math.round(bodyH * 0.54));
          halfW =
            (activeLockedTarget.isMiniBoss ? 50 : activeLockedTarget.isElite ? 42 : 36) + pulse;
          halfH = Math.round(bodyH * 0.52) + pulse;
          arm = 13;
        }

        const rx0 = cx - halfW;
        const rx1 = cx + halfW;
        const ry0 = cy - halfH;
        const ry1 = cy + halfH;
        const thick = 3;

        const seloutBar = (bx, by, bw, bh, col) => {
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, bw, bh);
        };

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // Stepped cyan (#38bdf8) Selout corner brackets
        seloutBar(rx0, ry0, arm, thick, '#38bdf8');
        seloutBar(rx0, ry0, thick, arm, '#38bdf8');
        seloutBar(rx1 - arm, ry0, arm, thick, '#38bdf8');
        seloutBar(rx1 - thick, ry0, thick, arm, '#38bdf8');
        seloutBar(rx0, ry1 - thick, arm, thick, '#38bdf8');
        seloutBar(rx0, ry1 - arm, thick, arm, '#38bdf8');
        seloutBar(rx1 - arm, ry1 - thick, arm, thick, '#38bdf8');
        seloutBar(rx1 - thick, ry1 - arm, thick, arm, '#38bdf8');

        // Gold (#fde047) corner vertex pips & cardinal crosshair ticks
        seloutBar(rx0, ry0, 4, 4, '#fde047');
        seloutBar(rx1 - 4, ry0, 4, 4, '#fde047');
        seloutBar(rx0, ry1 - 4, 4, 4, '#fde047');
        seloutBar(rx1 - 4, ry1 - 4, 4, 4, '#fde047');

        seloutBar(cx - 1, ry0 - 5, 3, 6, '#fde047');
        seloutBar(cx - 1, ry1 - 1, 3, 6, '#fde047');
        seloutBar(rx0 - 5, cy - 1, 6, 3, '#fde047');
        seloutBar(rx1 - 1, cy - 1, 6, 3, '#fde047');

        // Crisp darkforge 'LOCKED' pixel tag
        const tagW = 52;
        const tagH = 13;
        const tagX = cx - Math.floor(tagW * 0.5);
        const tagY = ry0 - tagH - 7;
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(tagX - 1, tagY - 1, tagW + 2, tagH + 2);
        ctx.fillStyle = '#090d18';
        ctx.fillRect(tagX, tagY, tagW, tagH);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(tagX, tagY, tagW, 1);
        ctx.fillStyle = '#fde047';
        ctx.font = '7px "ArcanePixel", "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LOCKED', cx, tagY + 10);

        ctx.restore();
      }
    }
  }

  renderScreenHUD(ctx, renderer) {
    if (!this.active || !ctx || this.game.isLandingOpen) return;
    const w = renderer.width;
    const h = renderer.height;
    const t = renderer.time || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Single Sleek Razor-Thin Top-Center RPG Bar (Zone Pips + Spirit + Level/XP using crisp PixelFont!)
    const hudBottomY =
      typeof renderer.getHudBottomY === 'function'
        ? renderer.getHudBottomY()
        : renderer.isMobilePortrait
          ? 122
          : renderer.isMobileLandscape
            ? 70
            : 82;
    const isPortrait = Boolean(renderer.isMobilePortrait);
    const isLandscapeMob = Boolean(renderer.isMobileLandscape);
    const stripW = isPortrait
      ? Math.min(342, Math.max(276, Math.round(w * 0.88)))
      : Math.min(isLandscapeMob ? 364 : 426, Math.round(w * 0.50));
    const stripH = isLandscapeMob ? 18 : 20;
    const stripX = Math.round((w - stripW) * 0.5);
    const stripY = Math.round(hudBottomY + (isPortrait ? 5 : 4));
    if (!this._hudStripRect) {
      this._hudStripRect = { x: stripX, y: stripY, w: stripW, h: stripH };
    } else {
      this._hudStripRect.x = stripX;
      this._hudStripRect.y = stripY;
      this._hudStripRect.w = stripW;
      this._hudStripRect.h = stripH;
    }

    const hasSpAlert = this.progression.skillPoints > 0;
    const spPulse = hasSpAlert ? 0.5 + 0.5 * Math.sin(t * 7.5) : 0;

    // Beveled darkforge chassis
    ctx.fillStyle = '#05070e';
    ctx.fillRect(stripX - 1, stripY - 1, stripW + 2, stripH + 2);
    ctx.fillStyle = 'rgba(7, 11, 22, 0.90)';
    ctx.fillRect(stripX, stripY, stripW, stripH);
    ctx.fillStyle = hasSpAlert && spPulse > 0.5 ? '#fde047' : '#d4af37';
    ctx.fillRect(stripX, stripY, stripW, 1);
    ctx.fillStyle = '#475569';
    ctx.fillRect(stripX, stripY + stripH - 1, stripW, 1);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(stripX, stripY, 2, 2);
    ctx.fillRect(stripX + stripW - 2, stripY, 2, 2);
    ctx.fillRect(stripX, stripY + stripH - 2, 2, 2);
    ctx.fillRect(stripX + stripW - 2, stripY + stripH - 2, 2, 2);

    const innerY = stripY + 3;
    const innerH = stripH - 6;
    const textCy = innerY + Math.floor(innerH * 0.5);

    // Left Section (~33%): Compact Zone Progress Pips (`Z1 Z2 Z3 BOSS`)
    const activeZones = this.getActiveZones();
    const zCount = Math.max(1, activeZones.length);
    const hasBoss = this.getBossConfig().enabled !== false;
    const zoneBlockW = Math.min(136, Math.max(98, Math.round(stripW * 0.33)));
    const segW = Math.floor((zoneBlockW - (zCount - 1) * 2) / zCount);
    for (let i = 0; i < zCount; i++) {
      const sx = stripX + 4 + i * (segW + 2);
      const cleared = this.zonesCleared[i];
      const current = this.zoneIndex === i;
      const isBossSeg = i === zCount - 1 && hasBoss;
      ctx.fillStyle = cleared
        ? '#16a34a'
        : current
          ? isBossSeg
            ? '#dc2626'
            : '#ea580c'
          : '#111827';
      ctx.fillRect(sx, innerY, segW, innerH);
      if (current || cleared) {
        ctx.fillStyle = cleared ? '#4ade80' : isBossSeg ? '#f87171' : '#fdba74';
        ctx.fillRect(sx, innerY, segW, 1);
      }
      const zLabel = isBossSeg ? (segW >= 26 ? 'BOSS' : 'B') : `Z${i + 1}`;
      PixelFont.drawCentered(
        ctx,
        zLabel,
        sx + Math.floor(segW * 0.5),
        textCy,
        1,
        current || cleared ? '#ffffff' : '#64748b',
        null,
        true
      );
    }

    // Divider 1
    const div1X = stripX + 4 + zoneBlockW + 3;
    ctx.fillStyle = '#334155';
    ctx.fillRect(div1X, innerY, 1, innerH);

    // Middle & Right Sections: Solar Spirit Bar + Level / XP / +SP Bar (clickable to open Skill Tree)
    const remW = stripW - (div1X - stripX) - 9;
    const spBarW = Math.floor((remW - 5) * 0.48);
    const xpBarW = remW - 5 - spBarW;
    const spX = div1X + 4;
    const xpX = spX + spBarW + 5;

    const spRatio = Math.max(0, Math.min(1, this.progression.spirit / this.progression.maxSpirit));
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(spX, innerY, spBarW, innerH);
    const spFillW = Math.round(spBarW * spRatio);
    if (spFillW > 0) {
      ctx.fillStyle = '#9333ea';
      ctx.fillRect(spX, innerY, spFillW, innerH);
      ctx.fillStyle = '#d8b4fe';
      ctx.fillRect(spX, innerY, spFillW, 2);
    }
    PixelFont.drawCentered(
      ctx,
      `SP ${Math.floor(this.progression.spirit)}`,
      spX + Math.floor(spBarW * 0.5),
      textCy,
      1,
      '#f8fafc',
      '#e9d5ff',
      true
    );

    const xpRatio =
      this.progression.level >= this.progression.maxLevel
        ? 1
        : Math.max(0, Math.min(1, this.progression.xp / Math.max(1, this.progression.xpToNext)));
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(xpX, innerY, xpBarW, innerH);
    const xpFillW = Math.round(xpBarW * xpRatio);
    if (xpFillW > 0) {
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(xpX, innerY, xpFillW, innerH);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(xpX, innerY, xpFillW, 2);
    }
    const lvLabel =
      this.progression.skillPoints > 0
        ? `LV${this.progression.level} +${this.progression.skillPoints}SP`
        : `LV${this.progression.level} [T]`;
    PixelFont.drawCentered(
      ctx,
      lvLabel,
      xpX + Math.floor(xpBarW * 0.5),
      textCy,
      1,
      hasSpAlert ? '#fef08a' : '#f8fafc',
      '#ffffff',
      true
    );

    // Compact Active Sovereign Relic Pills right beneath the slim RPG strip (only when boons are claimed)
    let belowStripY = stripY + stripH + 4;
    if (this.activeRelics?.length > 0) {
      const pillH = 12;
      const pillGap = 4;
      const pillWidths = this.activeRelics.map((r) =>
        Math.max(40, PixelFont.measureWidth(r.shortTag, 1) + 10)
      );
      const totalRelicW =
        pillWidths.reduce((a, b) => a + b, 0) + pillGap * (this.activeRelics.length - 1);
      let rx = Math.round((w - totalRelicW) * 0.5);
      for (let i = 0; i < this.activeRelics.length; i++) {
        const relic = this.activeRelics[i];
        const pw = pillWidths[i];
        ctx.fillStyle = 'rgba(7, 10, 20, 0.88)';
        ctx.fillRect(rx, belowStripY, pw, pillH);
        ctx.fillStyle = relic.accentHex || '#facc15';
        ctx.fillRect(rx, belowStripY, pw, 1);
        ctx.fillRect(rx, belowStripY + pillH - 1, pw, 1);
        PixelFont.drawCentered(
          ctx,
          relic.shortTag,
          rx + Math.floor(pw * 0.5),
          belowStripY + 6,
          1,
          relic.accentHex || '#fef08a',
          '#ffffff',
          true
        );
        rx += pw + pillGap;
      }
      belowStripY += pillH + 4;
    }

    // 1.5. Crisp PixelFont "PHANTOM EVADE!" Slow-Mo Flash Ribbon
    if (this._perfectDodgeBannerTimer > 0 && !this.game.isMatchOver) {
      const pAlpha = Math.min(1, this._perfectDodgeBannerTimer * 2.5);
      const pText = isPortrait ? 'PHANTOM EVADE! 1.45X CRIT' : 'PHANTOM EVADE! +25 SP • 1.45X CRIT';
      const pSz = isPortrait ? 1 : 2;
      const pTextW = PixelFont.measureWidth(pText, pSz);
      const pW = Math.min(w - 24, pTextW + 26);
      const pH = pSz === 2 ? 24 : 18;
      const pX = Math.round((w - pW) * 0.5);
      const pY = Math.round(belowStripY + 2);
      ctx.save();
      ctx.globalAlpha = pAlpha;
      ctx.fillStyle = 'rgba(6, 16, 30, 0.90)';
      ctx.fillRect(pX, pY, pW, pH);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(pX, pY, pW, 2);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(pX, pY + pH - 2, pW, 2);
      PixelFont.drawCentered(ctx, pText, Math.round(w * 0.5), pY + Math.floor(pH * 0.5), pSz, '#67e8f9', '#ffffff', true);
      ctx.restore();
    }

    // 2. Sleek Forged-Gold PixelFont "GO!" Arcade Advance Ribbon (zero chunky yellow box!)
    if (this.goPromptActive && !this.game.isMatchOver) {
      const pulseAlpha = 0.74 + 0.26 * Math.sin(t * 8.5);
      ctx.save();
      ctx.globalAlpha = pulseAlpha;
      const promptText = String(this.goPromptText || 'GO!').toUpperCase();
      const goPixSz = !isPortrait && PixelFont.measureWidth(promptText, 2) + 46 <= 246 ? 2 : 1;
      const textW = PixelFont.measureWidth(promptText, goPixSz);
      const chevW = 24;
      const ribW = Math.max(122, Math.min(Math.min(256, w - 28), textW + chevW + 26));
      const ribH = goPixSz === 2 ? 28 : 22;
      const gy = Math.max(
        belowStripY + 24,
        Math.round(h * (isLandscapeMob ? 0.34 : 0.35))
      );
      const shift = Math.round(Math.sin(t * 8.0) * 5);
      const rightPad = isPortrait ? 12 : isLandscapeMob ? 98 : 48;
      const ribX = Math.max(
        12,
        Math.min(Math.max(12, w - ribW - 12), w - rightPad - ribW + shift)
      );
      const ribY = gy - Math.floor(ribH * 0.5);

      // Stepped beveled darkforge gold ribbon
      ctx.fillStyle = '#05070e';
      ctx.fillRect(ribX + 2, ribY - 1, ribW - 4, ribH + 2);
      ctx.fillRect(ribX - 1, ribY + 2, ribW + 2, ribH - 4);
      ctx.fillStyle = 'rgba(11, 15, 28, 0.92)';
      ctx.fillRect(ribX, ribY, ribW, ribH);
      // Forged gold top & bottom bevel trims
      ctx.fillStyle = '#facc15';
      ctx.fillRect(ribX + 2, ribY, ribW - 4, 2);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(ribX + 2, ribY + ribH - 2, ribW - 4, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(ribX, ribY + 3, 2, ribH - 6);
      ctx.fillRect(ribX + ribW - 2, ribY + 3, 2, ribH - 6);

      const textCx = ribX + 10 + Math.floor((ribW - chevW - 14) * 0.5);
      PixelFont.drawCentered(ctx, promptText, textCx, gy, goPixSz, '#fde047', '#ffffff', true);

      // Animated twin stepped pixel chevrons (>>)
      const ax = ribX + ribW - chevW - 4;
      const drawChevron = (cx, cy, col) => {
        ctx.fillStyle = col;
        ctx.fillRect(cx, cy - 5, 3, 2);
        ctx.fillRect(cx + 2, cy - 3, 3, 2);
        ctx.fillRect(cx + 4, cy - 1, 3, 2);
        ctx.fillRect(cx + 2, cy + 1, 3, 2);
        ctx.fillRect(cx, cy + 3, 3, 2);
      };
      const cPulse = Math.floor(t * 7) % 2 === 0;
      drawChevron(ax, gy, cPulse ? '#facc15' : '#fef08a');
      drawChevron(ax + 9, gy, cPulse ? '#ffffff' : '#facc15');
      ctx.restore();
    }

    // 3. Forged Crimson-Gold PixelFont Boss Approaching Arcade Ribbon
    if (this.bossWarningTimer > 0) {
      const flash = Math.abs(Math.sin(t * 11));
      const by = Math.max(belowStripY + 34, Math.round(h * 0.34));
      const bossWarnName = (this.getBossConfig().name || 'BEHEMOTH MALPHAS').toUpperCase();
      const singleLine = `WARNING! ${bossWarnName} RISES!`;
      const canSingleLine2 = PixelFont.measureWidth(singleLine, 2) + 64 <= w - 24;
      const isTwoLine = !canSingleLine2 && w < 620;
      const banH = isTwoLine ? 46 : 42;
      const banW = Math.min(w - 20, Math.max(260, Math.round(w * (isPortrait ? 0.94 : 0.78))));
      const banX = Math.round((w - banW) * 0.5);
      const banTop = by - Math.floor(banH * 0.5);

      ctx.fillStyle = '#05070e';
      ctx.fillRect(banX - 2, banTop - 2, banW + 4, banH + 4);
      ctx.fillStyle = `rgba(48, 8, 12, ${(0.84 + flash * 0.12).toFixed(3)})`;
      ctx.fillRect(banX, banTop, banW, banH);
      // Crimson + gold dual ribbon rails
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(banX, banTop, banW, 3);
      ctx.fillRect(banX, banTop + banH - 3, banW, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(banX + 6, banTop + 4, banW - 12, 1);
      ctx.fillRect(banX + 6, banTop + banH - 5, banW - 12, 1);

      const drawHazardCrest = (cx, cy) => {
        ctx.fillStyle = '#05070e';
        ctx.fillRect(cx - 3, cy - 8, 6, 16);
        ctx.fillRect(cx - 7, cy - 4, 14, 8);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 2, cy - 7, 4, 14);
        ctx.fillRect(cx - 6, cy - 3, 12, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - 1, cy - 4, 2, 5);
        ctx.fillRect(cx - 1, cy + 2, 2, 2);
      };

      const centerX = Math.round(w * 0.5);
      drawHazardCrest(banX + 18, by);
      drawHazardCrest(banX + banW - 18, by);

      if (isTwoLine) {
        const line1 = `WARNING! ${bossWarnName}`;
        const l1Sz = PixelFont.measureWidth(line1, 2) + 46 <= banW ? 2 : 1;
        PixelFont.drawCentered(ctx, line1, centerX, by - 7, l1Sz, '#fde047', '#ffffff', true);
        PixelFont.drawCentered(ctx, 'COLOSSAL SOVEREIGN RISES!', centerX, by + 9, 1, '#fca5a5', '#ffffff', true);
      } else {
        const wSz = canSingleLine2 ? 2 : 1;
        PixelFont.drawCentered(ctx, singleLine, centerX, by, wSz, '#fde047', '#ffffff', true);
      }
    }

    ctx.restore();
  }
}
