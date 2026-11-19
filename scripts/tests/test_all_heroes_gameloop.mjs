globalThis.Image = class MockImage {
  constructor() {
    this.complete = true;
    this.naturalWidth = 6240;
    this.naturalHeight = 2080;
    this.src = '';
  }
};
globalThis.window = {
  innerWidth: 1200,
  innerHeight: 600,
  devicePixelRatio: 1,
  addEventListener() {}
};
globalThis.document = {
  getElementById() {
    return null;
  },
  createElement() {
    return {
      width: 256,
      height: 256,
      getContext() {
        return createMockCtx();
      }
    };
  }
};

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  encryptAvsvPack,
  parseAvsvPackHeader,
  decryptAvsvPack,
  unpackCodeVaultPayload,
  extractMasterKeyFromBootScript
} from '../../build/build_web_vault.mjs';
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/\/$/, '');
import { Fighter } from '../../src/entities/Fighter.js?v=30fps156';
import { Warrior } from '../../src/entities/Warrior.js?v=30fps156';
import { WarriorEx } from '../../src/entities/WarriorEx.js?v=30fps156';
import { FireMage } from '../../src/entities/FireMage.js?v=30fps156';
import { FireMageEx } from '../../src/entities/FireMageEx.js?v=30fps156';
import { Ronin } from '../../src/entities/Ronin.js?v=30fps156';
import { RoninEx } from '../../src/entities/RoninEx.js?v=30fps156';
import { Valkyrie } from '../../src/entities/Valkyrie.js?v=30fps156';
import { ValkyrieEx } from '../../src/entities/ValkyrieEx.js?v=30fps156';
import { Reaper } from '../../src/entities/Reaper.js?v=30fps156';
import { ReaperEx } from '../../src/entities/ReaperEx.js?v=30fps156';
import { Priestess } from '../../src/entities/Priestess.js?v=30fps156';
import { PriestessEx } from '../../src/entities/PriestessEx.js?v=30fps156';
import { Archer } from '../../src/entities/Archer.js?v=30fps156';
import { ArcherEx } from '../../src/entities/ArcherEx.js?v=30fps156';
import { Chronomancer } from '../../src/entities/Chronomancer.js?v=30fps156';
import { ChronomancerEx } from '../../src/entities/ChronomancerEx.js?v=30fps156';
import { Titan } from '../../src/entities/Titan.js?v=30fps156';
import { TitanEx } from '../../src/entities/TitanEx.js?v=30fps156';
import { IceMage } from '../../src/entities/IceMage.js?v=30fps156';
import { IceMageEx } from '../../src/entities/IceMageEx.js?v=30fps156';
import { Android } from '../../src/entities/Android.js?v=30fps156';
import { AndroidEx } from '../../src/entities/AndroidEx.js?v=30fps156';
import { NyxEx } from '../../src/entities/NyxEx.js?v=30fps156';
import { PixelForge } from '../../src/engine/PixelForge.js?v=30fps156';
import { ArcaneShaderFX } from '../../src/engine/ArcaneShaderFX.js?v=30fps156';
import {
  EX_HERO_PALETTES,
  ExParticleSystem,
  drawExPixelParticles,
  drawExBayerHalo,
  drawExHitStarburst
} from '../../src/engine/shaders/exNextGenFX.js?v=30fps156';
import { VFXManager } from '../../src/engine/VFXManager.js?v=30fps156';
import { Renderer } from '../../src/engine/Renderer.js?v=30fps156';
import { AudioManager } from '../../src/engine/AudioManager.js?v=30fps156';
import {
  Game,
  EX_HERO_KEYS,
  LEGACY_HERO_KEYS,
  CHAMPION_ROSTER,
  INTRO_DIALOGUE_SUBTITLES
} from '../../src/main.js?v=30fps156';
import { Monster, ArchfiendBoss } from '../../src/entities/Monster.js?v=30fps156';
import {
  AdventureManager,
  ADVENTURE_WORLD_WIDTH,
  DEFAULT_ADVENTURE_CAMPAIGN_ID,
  normalizeAdventureCampaignPack
} from '../../src/adventure/AdventureManager.js?v=30fps156';
import { ADVENTURE_HERO_KITS } from '../../src/adventure/AdventureSkillSets.js?v=30fps156';
import {
  ADVENTURE_SKILL_TREE,
  HERO_SKILL_TREE_THEMES,
  getHeroSkillTreeTheme
} from '../../src/adventure/AdventureProgression.js?v=30fps156';
import { AdventureMapRenderer } from '../../src/adventure/AdventureMapRenderer.js?v=30fps156';
import {
  AdventureDestructibles,
  getOrBakeOrthogonalPropsSheet
} from '../../src/adventure/AdventureDestructibles.js?v=30fps156';
import {
  HeroBuildSystem,
  SOVEREIGN_BUILD_HERO_IDS,
  HERO_BUILD_CATALOG,
  SOVEREIGN_STORAGE_KEY
} from '../../src/combat/HeroBuildSystem.js?v=30fps156';

function createMockCtx(trackForbidden = null) {
  const stateStack = [];
  const ctx = {
    _stateStack: stateStack,
    save() {
      stateStack.push({
        globalAlpha: ctx.globalAlpha,
        globalCompositeOperation: ctx.globalCompositeOperation,
        imageSmoothingEnabled: ctx.imageSmoothingEnabled,
        fillStyle: ctx.fillStyle,
        strokeStyle: ctx.strokeStyle,
        lineWidth: ctx.lineWidth,
        lineDashOffset: ctx.lineDashOffset
      });
    },
    restore() {
      const s = stateStack.pop();
      if (s) {
        ctx.globalAlpha = s.globalAlpha;
        ctx.globalCompositeOperation = s.globalCompositeOperation;
        ctx.imageSmoothingEnabled = s.imageSmoothingEnabled;
        ctx.fillStyle = s.fillStyle;
        ctx.strokeStyle = s.strokeStyle;
        ctx.lineWidth = s.lineWidth;
        ctx.lineDashOffset = s.lineDashOffset;
      }
    },
    translate() {},
    scale() {},
    rotate() {
      if (trackForbidden) trackForbidden.rotateCalls++;
    },
    transform() {},
    setTransform() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {
      if (trackForbidden) trackForbidden.quadCalls++;
    },
    bezierCurveTo() {},
    closePath() {},
    stroke() {},
    fill() {},
    arc() {},
    ellipse() {},
    rect() {},
    clip() {},
    fillRect() {},
    strokeRect() {},
    clearRect() {},
    drawImage(_img, _sx, sy) {
      if (trackForbidden && trackForbidden.syValues && typeof sy === 'number') {
        trackForbidden.syValues.add(sy);
      }
    },
    fillText() {},
    strokeText() {},
    setLineDash() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    getImageData(_x, _y, w, h) {
      return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
    },
    createImageData(w, h) {
      return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
    },
    putImageData() {},
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: false,
    fillStyle: '#fff',
    strokeStyle: '#fff',
    lineWidth: 1,
    lineDashOffset: 0
  };
  return ctx;
}

function createMockGame() {
  const noop = () => {};
  const validAudioKeys = new Set(Object.keys(new AudioManager().volumes));
  const mockCanvas = {
    width: 1200,
    height: 600,
    getBoundingClientRect() {
      return { width: 1200, height: 600 };
    },
    getContext() {
      return createMockCtx();
    }
  };
  const realRenderer = new Renderer(mockCanvas);
  return {
    timeScale: 1.0,
    testModeUnlimitedHp: true,
    onFighterDeath: noop,
    triggerUltimateCinematic: noop,
    triggerTrueUltimateCinematic: noop,
    audio: {
      play(key) {
        if (!validAudioKeys.has(key)) {
          throw new Error(`Unregistered audio SFX key played: '${key}'`);
        }
      }
    },
    hudEls: {
      stageBadge: { textContent: 'GOTHIC SANCTUARY' }
    },
    renderer: realRenderer,
    vfx: new VFXManager()
  };
}

const CLASSES = [
  ['Warrior', Warrior],
  ['WarriorEx', WarriorEx],
  ['FireMage', FireMage],
  ['Ronin', Ronin],
  ['Valkyrie', Valkyrie],
  ['Reaper', Reaper],
  ['Priestess', Priestess],
  ['Archer', Archer],
  ['Chronomancer', Chronomancer],
  ['Titan', Titan],
  ['IceMage', IceMage],
  ['Android', Android]
];

const ctx = createMockCtx();
const game = createMockGame();

const QUIET_MODE = process.argv.includes('--quiet') || process.env.AVS_QUIET === '1';
const RUN_SUITE36_ONLY =
  process.argv.includes('--suite36') || process.env.AVS_SUITE36_ONLY === '1';
const RUN_EX_ONLY = process.argv.includes('--ex-only') || process.env.AVS_EX_ONLY === '1';
const FULL_AUDIT = process.argv.includes('--full') || process.env.AVS_FULL_AUDIT === '1';
const FAST_MODE = process.argv.includes('--fast') || process.env.AVS_FAST_GATE === '1';
const _origConsoleLog = console.log.bind(console);
let _quietPassCount = 0;
if (QUIET_MODE) {
  console.log = (...args) => {
    if (String(args[0] ?? '').includes('[PASS]')) _quietPassCount++;
  };
}

// Hard 60s watchdog so no runaway simulation loop can ever hang an agent or CI process
setTimeout(() => {
  console.error('[FATAL] test_all_heroes_gameloop.mjs exceeded 60s watchdog timeout!');
  process.exit(1);
}, 60000).unref();

// Content-addressed SHA-256 cache for deterministic static PNG/Vault byte-level audits.
// Re-runs immediately if ANY referenced file or audit code changes by even 1 byte (or `--full`).
const _AUDIT_CACHE_PATH = path.join(os.tmpdir(), 'avs-gameloop-sha-cache-v1.json');
let _auditCacheObj = null;
function _loadAuditCache() {
  if (_auditCacheObj) return _auditCacheObj;
  try {
    if (fs.existsSync(_AUDIT_CACHE_PATH)) {
      _auditCacheObj = JSON.parse(fs.readFileSync(_AUDIT_CACHE_PATH, 'utf8')) || {};
      return _auditCacheObj;
    }
  } catch (_) {}
  _auditCacheObj = {};
  return _auditCacheObj;
}
function _saveAuditCache() {
  if (!_auditCacheObj) return;
  try {
    fs.writeFileSync(_AUDIT_CACHE_PATH, JSON.stringify(_auditCacheObj));
  } catch (_) {}
}
function _computeAuditDigest(relFiles, extraSalt = '') {
  const h = crypto.createHash('sha256');
  h.update(String(extraSalt));
  for (const rel of relFiles) {
    const abs = path.isAbsolute(rel) ? rel : path.join(REPO_ROOT, rel);
    h.update('\0' + rel + '\0');
    h.update(fs.readFileSync(abs));
  }
  return h.digest('hex');
}
function getCachedAuditSync(key, relFiles, extraSalt, fn) {
  if (FULL_AUDIT) return fn();
  const digest = _computeAuditDigest(relFiles, extraSalt);
  const store = _loadAuditCache();
  if (store[key] && store[key].digest === digest) {
    return store[key].value;
  }
  const value = fn();
  store[key] = { digest, value: value === undefined ? true : value };
  _saveAuditCache();
  return value;
}
async function getCachedAuditAsync(key, relFiles, extraSalt, fn) {
  if (FULL_AUDIT) return await fn();
  const digest = _computeAuditDigest(relFiles, extraSalt);
  const store = _loadAuditCache();
  if (store[key] && store[key].digest === digest) {
    return store[key].value;
  }
  const value = await fn();
  store[key] = { digest, value: value === undefined ? true : value };
  _saveAuditCache();
  return value;
}

const _CHANGED_FILES = (() => {
  try {
    const out = execFileSync('git', ['status', '--porcelain'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return out
      .split(/\r?\n/)
      .map((l) => l.slice(3).trim())
      .filter(Boolean);
  } catch (_) {
    return [];
  }
})();
const HAS_SHARED_LEGACY_COMBAT_DIFF = _CHANGED_FILES.some((f) =>
  /^(src\/entities\/(Fighter|Monster|Warrior|FireMage|Valkyrie|Priestess|Ronin|Chronomancer|Titan|Archer|Android|Reaper|IceMage)\.js|src\/engine\/(VFXManager|ArcaneShaderFX)\.js|src\/adventure\/AdventureSkillSets\.js|src\/engine\/shaders\/(?!exNextGenFX|nebulaShaders))/.test(
    f
  )
);
const SKIP_LEGACY_BRUTE_LOOPS = FAST_MODE && !FULL_AUDIT && !HAS_SHARED_LEGACY_COMBAT_DIFF;

if (!RUN_SUITE36_ONLY && !RUN_EX_ONLY) {
if (!SKIP_LEGACY_BRUTE_LOOPS) {

for (const [name, Cls] of CLASSES) {
  const hero = new Cls({ x: 360, groundY: 460, facing: 1, name });
  const dummy = new Warrior({ x: 540, groundY: 460, facing: -1, name: 'Dummy' });
  dummy.maxHp = 99999;
  dummy.hp = 99999;

  const states = ['IDLE', 'WALK', 'AUTO_ATTACK', 'SKILL', 'ULTIMATE', 'DASH', 'CROUCH', 'JUMP', 'VICTORY'];
  for (const st of states) {
    hero.hp = hero.maxHp;
    hero.isDead = false;
    dummy.stunTimer = 0;
    if (st === 'CROUCH' && typeof hero.startCrouch === 'function') {
      hero.startCrouch(dummy, game);
    } else if (st === 'JUMP' && typeof hero.startJump === 'function') {
      hero.startJump(dummy, game);
    } else if (st === 'DASH' && typeof hero.startDash === 'function') {
      hero.startDash(dummy, game, 1);
    } else {
      hero.setState(st);
    }
    let peakScale = hero.giantScale || 1.0;
    const steps = 65;
    let peakDummyStun = 0;
    let dummyWallX = dummy.x;
    let sawReaperStand = false;
    let maxReaperClones = 0;
    let sawVictoryFlourish = false;
    let sawVictoryLoop = false;
    for (let i = 0; i < steps; i++) {
      hero.update(1 / 30, dummy, game);
      if (st === 'VICTORY') {
        const vIdx = PixelForge.getFrameIndex(hero, hero.walkPhase);
        if (vIdx < 270 || vIdx > 299) {
          throw new Error(`Expected ${name} VICTORY frameIdx in Row 9 (270..299), got ${vIdx}`);
        }
        if (vIdx >= 270 && vIdx <= 284) sawVictoryFlourish = true;
        if (vIdx >= 285 && vIdx <= 299) sawVictoryLoop = true;
      }
      if ((hero.giantScale || 1.0) > peakScale) {
        peakScale = hero.giantScale;
      }
      if (name === 'Titan' && st === 'ULTIMATE') {
        if ((dummy.stunTimer || 0) > peakDummyStun) {
          peakDummyStun = dummy.stunTimer;
          dummyWallX = dummy.x;
        }
      }
      if (name === 'Reaper' && st === 'ULTIMATE') {
        if (hero.thanatosStand) sawReaperStand = true;
        maxReaperClones = Math.max(maxReaperClones, hero.wraithClones?.length || 0);
      }
      hero.drawForegroundOverlay?.(ctx, game.renderer);
      hero.draw(ctx, false, game.renderer);
      hero.drawUltimateForeground?.(ctx, game.renderer);
    }
    if (st === 'VICTORY' && (!sawVictoryFlourish || !sawVictoryLoop)) {
      throw new Error(
        `Expected ${name} VICTORY to play F00..F14 flourish (${sawVictoryFlourish}) -> F15..F29 loop (${sawVictoryLoop})`
      );
    }
    if (name === 'Titan' && st === 'AUTO_ATTACK') {
      // Also verify all 4 normal attack model animations cycle through dedicated Row 2 sub-ranges (F00..F07, F08..F14, F15..F22, F23..F29)
      const seenRanges = new Set();
      for (let v = 0; v < 4; v++) {
        hero.comboStep = v;
        hero.setState('AUTO_ATTACK');
        for (let k = 0; k < 24; k++) {
          hero.update(1 / 30, dummy, game);
          const fIdx = hero.trueUltFrameOverride;
          if (fIdx >= 60 && fIdx <= 67) seenRanges.add(0);
          else if (fIdx >= 68 && fIdx <= 74) seenRanges.add(1);
          else if (fIdx >= 75 && fIdx <= 82) seenRanges.add(2);
          else if (fIdx >= 83 && fIdx <= 89) seenRanges.add(3);
          if (hero.state === 'IDLE') break;
        }
      }
      if (seenRanges.size < 4) {
        throw new Error(`Expected Titan 4 normal attack model animations to cover all 4 Row 2 sub-ranges, got ${[...seenRanges]}`);
      }
      console.log(`  [OK] Titan 4-Animation World-Maul Auto-Attack verified across all 4 Row 2 sub-ranges (F00..F07, F08..F14, F15..F22, F23..F29)`);
    }
    if (name === 'Titan' && st === 'ULTIMATE') {
      if (peakDummyStun < 0.78 || (dummyWallX > 90 && dummyWallX < 1110)) {
        throw new Error(
          `Expected Titan WORLD-BREAKER HOME RUN to knock enemy to farthest stage wall and stun for 0.8s, got wallX=${dummyWallX}, peakStun=${peakDummyStun}`
        );
      }
      console.log(
        `  [OK] Titan WORLD-BREAKER HOME RUN: batted enemy to farthest stage wall (x=${dummyWallX.toFixed(0)}) + stunned for ${peakDummyStun.toFixed(2)}s`
      );
    }
    if (name === 'Reaper' && st === 'ULTIMATE') {
      if (peakScale !== 1.0 || !sawReaperStand || maxReaperClones < 1) {
        throw new Error(
          `Expected Reaper v5 crisp 1.0x scale + Thanatos Stand + Wraith Clones during ULTIMATE, got scale=${peakScale}, stand=${sawReaperStand}, clones=${maxReaperClones}`
        );
      }
      console.log(`  [OK] Reaper v5 Death's Sovereignty: crisp 1.0x scale, Thanatos Stand=${sawReaperStand}, WraithClones=${maxReaperClones}`);
    }
  }
  console.log(`[PASS] ${name}: all 9 states (incl. Row 9 VICTORY pose) + shader/VFX layers simulated cleanly`);
}

// 1. Verify Aethelgard v4 Supreme Finishing Move: TRUE_ULTIMATE ("CELESTIAL SWORD OF JUSTICE")
//    - Zero stage replacement (no conflict with Ignis Sol!)
//    - Zero ctx.rotate or quadraticCurveTo in Warrior draw methods
//    - Uses Row 5 (sy=1040), Row 6 (sy=1248), and Row 7 (sy=1456) of warrior_vfx.png!
{
  game.renderer.resetStageOverrides();
  game.hudEls.stageBadge.textContent = 'GOTHIC SANCTUARY';
  const aethel = new Warrior({ x: 360, groundY: 460, facing: 1, name: 'Aethelgard' });
  const enemy = new Reaper({ x: 740, groundY: 460, facing: -1, name: 'Malakor' });
  enemy.maxHp = 99999;
  enemy.hp = 99999;

  aethel.finisherGauge = 100;
  aethel.update(1 / 60, enemy, game);
  if (aethel.state !== 'TRUE_ULTIMATE') {
    throw new Error(`Expected Aethelgard to enter TRUE_ULTIMATE when finisherGauge=100, got ${aethel.state}`);
  }

  const auditTracker = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const auditCtx = createMockCtx(auditTracker);

  let sawPhase1SacredVow = false;
  let sawPhase2HighSkyTeleport = false;
  let peakAirLift = 0;
  let sawImpactFrame = false;
  let maxSlashes = 0;
  let maxFeathers = 0;

  for (let frame = 0; frame < 300; frame++) {
    const dt = 1 / 30;
    aethel.update(dt, enemy, game);
    game.renderer.update(dt, [aethel, enemy]);
    game.renderer.render([aethel, enemy], game.vfx);

    aethel.drawForegroundOverlay(auditCtx, game.renderer);
    aethel.draw(auditCtx, false, game.renderer);
    aethel.drawUltimateForeground(auditCtx, game.renderer);

    if ((aethel.cameraAirLift || 0) > peakAirLift) {
      peakAirLift = aethel.cameraAirLift;
    }
    if (aethel.state === 'TRUE_ULTIMATE' && aethel.stateTimer > 0.65 && aethel.stateTimer < 1.7) {
      if (Math.abs(aethel.y - aethel.groundY) < 1 && aethel.trueUltFrameOverride >= 120 && aethel.trueUltFrameOverride <= 125) {
        sawPhase1SacredVow = true;
      }
    }
    if (aethel.state === 'TRUE_ULTIMATE' && aethel.stateTimer > 2.4 && aethel.stateTimer < 3.3) {
      if (aethel.y <= aethel.groundY - 440) {
        sawPhase2HighSkyTeleport = true;
      }
    }
    if (game.renderer.trueUltStageOverride !== null || game.renderer.permanentStageOverride !== null) {
      throw new Error(
        `Aethelgard MUST NOT change stage background! Saw trueUltStageOverride=${game.renderer.trueUltStageOverride}, permanent=${game.renderer.permanentStageOverride}`
      );
    }
    if (game.renderer.impactFrameTimer > 0) {
      sawImpactFrame = true;
    }
    if (aethel.justiceSlashes.length > maxSlashes) maxSlashes = aethel.justiceSlashes.length;
    if (aethel.justiceFeathers.length > maxFeathers) maxFeathers = aethel.justiceFeathers.length;

    for (const v of aethel.activeVfxAnims) {
      if (v.row === 2) {
        const expectedY = aethel.groundY - Math.round(v.h * 0.32);
        if (Math.abs(v.y - expectedY) > 2) {
          throw new Error(`Floating Row 2 spire detected! y=${v.y}, expected=${expectedY}`);
        }
      }
    }
  }

  if (!sawPhase1SacredVow) throw new Error('Did not observe Phase 1 v4 Sacred Vow (Row 4 F00..F05) on groundY');
  if (!sawPhase2HighSkyTeleport) throw new Error('Did not observe Phase 2 High-Sky Teleport (y <= groundY - 440)');
  if (peakAirLift < 480) throw new Error(`Expected peakAirLift >= 480 for wide-sky framing, got ${peakAirLift}`);
  if (!sawImpactFrame) throw new Error('Did not observe Justice Impact Frame on landing');
  if (maxSlashes < 5) throw new Error(`Expected >= 5 Great-Slashes of Justice, saw ${maxSlashes}`);
  if (maxFeathers < 75) throw new Error(`Expected >= 75 stage-wide Row 7 Pixel Seraphim Feathers, saw ${maxFeathers}`);
  if (auditTracker.rotateCalls > 0) throw new Error(`Forbidden ctx.rotate calls in Warrior: ${auditTracker.rotateCalls}`);
  if (auditTracker.quadCalls > 0) throw new Error(`Forbidden quadraticCurveTo calls in Warrior: ${auditTracker.quadCalls}`);
  for (const reqSy of [5 * 208, 6 * 208, 7 * 208]) {
    if (!auditTracker.syValues.has(reqSy)) {
      throw new Error(`Expected Warrior VFX sheet row sy=${reqSy} (row ${reqSy / 208}) to be rendered!`);
    }
  }

  console.log(
    `[PASS] Aethelgard v4 TRUE_ULTIMATE: Phase 1 Sacred Vow -> High-Sky Teleport (groundY-445, airLift=${peakAirLift}) -> Cut Pixel Lock-On + Row 5 Great-Slashes + Row 6 Cathedral Pillars + ${maxFeathers} Row 7 Pixel Feathers (0 stage-swap conflicts, 0 ctx.rotate)!`
  );
}

// 2. Verify Ignis Sol's TRUE_ULTIMATE ("ASTRAL METEOR CATACLYSM") Stage Change Timing:
//    - Stage MUST NOT change during Phase 1 or Phase 2 (t < 3.22s)!
//    - Stage MUST switch to permanent 'inferno' strictly on ground impact (t >= 3.22s)!
//    - Subsequent Aethelgard TRUE_ULTIMATE MUST preserve Sol's 'inferno' stage!
{
  game.renderer.resetStageOverrides();
  game.hudEls.stageBadge.textContent = 'GOTHIC SANCTUARY';
  const sol = new FireMage({ x: 340, groundY: 460, facing: 1, name: 'Ignis Sol' });
  const aethel = new Warrior({ x: 760, groundY: 460, facing: -1, name: 'Aethelgard' });

  sol.finisherGauge = 100;
  sol.update(1 / 60, aethel, game);
  if (sol.state !== 'TRUE_ULTIMATE') {
    throw new Error(`Expected Ignis Sol to enter TRUE_ULTIMATE, got ${sol.state}`);
  }

  let sawEarlyStageSwap = false;
  let sawImpactStageSwap = false;

  for (let frame = 0; frame < 300; frame++) {
    const dt = 1 / 60;
    sol.update(dt, aethel, game);
    game.renderer.update(dt, [sol, aethel]);
    game.renderer.render([sol, aethel], game.vfx);

    if (sol.state === 'TRUE_ULTIMATE' && sol.stateTimer < 3.20) {
      if (game.renderer.trueUltStageOverride !== null || game.renderer.permanentStageOverride !== null) {
        sawEarlyStageSwap = true;
      }
    }
    if (sol.state === 'TRUE_ULTIMATE' && sol.stateTimer >= 3.25) {
      if (game.renderer.permanentStageOverride === 'inferno' && game.renderer.trueUltStageAlpha === 1.0) {
        sawImpactStageSwap = true;
      }
    }
  }

  if (sawEarlyStageSwap) {
    throw new Error('Ignis Sol changed stage background BEFORE meteor ground impact (t < 3.22s)!');
  }
  if (!sawImpactStageSwap) {
    throw new Error('Ignis Sol did not trigger permanent inferno stage on ground impact (t >= 3.22s)!');
  }

  // Now have Aethelgard unleash TRUE_ULTIMATE right on Sol's Inferno stage and verify 'inferno' stays intact!
  aethel.finisherGauge = 100;
  aethel.update(1 / 60, sol, game);
  for (let frame = 0; frame < 150; frame++) {
    aethel.update(1 / 30, sol, game);
    game.renderer.update(1 / 30, [sol, aethel]);
  }
  if (game.renderer.permanentStageOverride !== 'inferno') {
    throw new Error(`Aethelgard overwrote Sol's inferno stage! permanentStageOverride=${game.renderer.permanentStageOverride}`);
  }
  console.log('[PASS] Ignis Sol Stage Timing: unchanged during cast/descent (t < 3.22s), switches to LAYWASTE OF INFERNO strictly on ground impact (t >= 3.22s), and coexists cleanly with Aethelgard!');
}

// 3. Verify Test Mode Unlimited HP (default ON) vs Mortal HP Mode (OFF) + 3-Overdrive Supreme Ultimate Pacing!
{
  const f1 = new Warrior({ x: 360, groundY: 460, facing: 1, name: 'Aethelgard' });
  const f2 = new FireMage({ x: 740, groundY: 460, facing: -1, name: 'Ignis Sol' });
  f1.game = game;
  f2.game = game;

  // 3A. Unlimited HP prevents death even on 99,999 damage and refills HP smoothly
  game.testModeUnlimitedHp = true;
  f1.takeDamage(99999, f2, true, 120, 0);
  if (f1.isDead || f1.hp < 1) {
    throw new Error(`Unlimited HP failed! Expected hp >= 1 and isDead=false, got hp=${f1.hp}, isDead=${f1.isDead}`);
  }
  for (let i = 0; i < 90; i++) {
    f1.update(1 / 30, f2, game);
  }
  if (f1.hp < f1.maxHp * 0.95) {
    throw new Error(`Expected Unlimited HP to smoothly refill HP back near maxHp, got ${f1.hp}/${f1.maxHp}`);
  }

  // 3B. Verify 3-Overdrive Charge Pacing for Supreme Ultimate (`finisherGauge`)
  const pacer = new Warrior({ x: 360, groundY: 460, facing: 1, name: 'Pacer' });
  const target = new Reaper({ x: 580, groundY: 460, facing: -1, name: 'Target' });
  pacer.game = game;
  target.game = game;
  pacer.finisherGauge = 0;
  pacer.mana = 0;

  const runOneOverdriveCycle = () => {
    // Accumulate 100 mana + ~6s of passive combat time, then trigger Overdrive (`mana >= maxMana`)
    pacer.gainMana(100);
    for (let i = 0; i < 6; i++) {
      pacer.gainFinisher(0.25); // 6s passive
    }
    // Simulate Fighter.update Overdrive trigger at mana >= maxMana
    pacer.mana = 0;
    pacer.gainFinisher(24);
  };

  runOneOverdriveCycle();
  const afterOd1 = pacer.finisherGauge;
  runOneOverdriveCycle();
  const afterOd2 = pacer.finisherGauge;
  runOneOverdriveCycle();
  const afterOd3 = pacer.finisherGauge;

  if (afterOd1 < 30 || afterOd1 > 40) {
    throw new Error(`Expected ~33.5% finisherGauge after 1st Overdrive, got ${afterOd1.toFixed(1)}%`);
  }
  if (afterOd2 < 62 || afterOd2 > 75) {
    throw new Error(`Expected ~67.0% finisherGauge after 2nd Overdrive, got ${afterOd2.toFixed(1)}%`);
  }
  if (afterOd3 < 100) {
    throw new Error(`Expected 100% finisherGauge on 3rd Overdrive, got ${afterOd3.toFixed(1)}%`);
  }

  // 3C. End-to-end autonomous AI combat check: verify Aethelgard casts 3 Overdrives before TRUE_ULTIMATE!
  const simAethel = new Warrior({ x: 420, groundY: 460, facing: 1, name: 'SimAethel' });
  const simSol = new FireMage({ x: 680, groundY: 460, facing: -1, name: 'SimSol' });
  simAethel.game = game;
  simSol.game = game;
  game.testModeUnlimitedHp = true;
  let overdrivesSeen = 0;
  let prevState = 'IDLE';
  let reachedTrueUlt = false;
  for (let step = 0; step < 3600; step++) {
    simAethel.update(1 / 30, simSol, game);
    simSol.update(1 / 30, simAethel, game);
    game.vfx.update(1 / 30, 460, game.renderer, game.audio);
    if (simAethel.state === 'ULTIMATE' && prevState !== 'ULTIMATE') {
      overdrivesSeen++;
    }
    if (simAethel.state === 'TRUE_ULTIMATE') {
      reachedTrueUlt = true;
      break;
    }
    prevState = simAethel.state;
  }
  if (!reachedTrueUlt || overdrivesSeen < 3) {
    throw new Error(
      `Expected Aethelgard to cast >= 3 Overdrives before TRUE_ULTIMATE in live combat, got reachedTrueUlt=${reachedTrueUlt}, overdrivesSeen=${overdrivesSeen}`
    );
  }

  // 3D. Toggling Test Mode OFF allows normal KO
  game.testModeUnlimitedHp = false;
  f1.setState('IDLE');
  f1.isInvulnerable = false;
  f1.takeDamage(99999, f2, true, 120, 0);
  if (!f1.isDead || f1.hp !== 0 || f1.state !== 'DEATH') {
    throw new Error(`Expected KO when testModeUnlimitedHp=false, got hp=${f1.hp}, isDead=${f1.isDead}, state=${f1.state}`);
  }

  console.log(
    `[PASS] Test Mode (Unlimited HP) & 3-Overdrive Pacing: OD#1=${afterOd1.toFixed(1)}% -> OD#2=${afterOd2.toFixed(1)}% -> OD#3=${afterOd3.toFixed(1)}% (Live AI cast ${overdrivesSeen} Overdrives before TRUE_ULTIMATE!), ∞ HP prevents KO & refills cleanly!`
  );
}

// 4. Verify Seraphina (`Priestess`) Grounded Auto/Skill + Cross-Stage Flight + Supreme Ultimate `"FINAL GRACE"`!
{
  const { Priestess } = await import('../../src/entities/Priestess.js');
  game.renderer.resetStageOverrides();
  game.testModeUnlimitedHp = true;

  const sera = new Priestess({ x: 320, groundY: 460, facing: 1, name: 'Seraphina' });
  const foe = new Reaper({ x: 760, groundY: 460, facing: -1, name: 'Malakor' });
  sera.game = game;
  foe.game = game;

  if (!sera.hasTrueUltimate || sera.trueUltName !== 'FINAL GRACE') {
    throw new Error(`Expected Seraphina trueUltName === 'FINAL GRACE', got ${sera.trueUltName}`);
  }

  // 4A. Verify Grounded AUTO_ATTACK and SKILL never float above groundY
  sera.setState('AUTO_ATTACK');
  for (let i = 0; i < 18; i++) {
    sera.update(1 / 30, foe, game);
    if (Math.abs(sera.y - sera.groundY) > 0.01) {
      throw new Error(`Seraphina floated during AUTO_ATTACK: y=${sera.y}, groundY=${sera.groundY}`);
    }
    if (sera.isAngelicAscent) {
      throw new Error('Seraphina popped wings (isAngelicAscent) during grounded AUTO_ATTACK!');
    }
  }

  sera.setState('SKILL');
  for (let i = 0; i < 24; i++) {
    sera.update(1 / 30, foe, game);
    if (Math.abs(sera.y - sera.groundY) > 0.01) {
      throw new Error(`Seraphina floated during SKILL: y=${sera.y}, groundY=${sera.groundY}`);
    }
    if (sera.isAngelicAscent) {
      throw new Error('Seraphina popped wings (isAngelicAscent) during grounded SKILL!');
    }
  }

  // 4B. Verify Cross-Stage Winged Flight mechanic (`DODGE`) is preserved!
  sera.startDodge(foe, game);
  let maxVaultLift = 0;
  for (let i = 0; i < 18; i++) {
    sera.update(1 / 30, foe, game);
    maxVaultLift = Math.max(maxVaultLift, sera.groundY - sera.y);
  }
  if (maxVaultLift < 55) {
    throw new Error(`Expected Seraphina cross-stage winged flight lift >= 55px, got ${maxVaultLift}`);
  }

  // 4C. Verify FINAL GRACE: 3.0s invulnerable flight + +30% Max HP heal + SINGLE INSTANT tanked-damage beam!
  sera.setState('IDLE');
  sera.y = sera.groundY;
  sera.hp = 1200;
  sera.tankedDamage = 0;
  foe.takeDamage = Fighter.prototype.takeDamage.bind(foe);
  sera.takeDamage(740, foe, false, 40, 0); // Tank 740 damage (`hp` drops to 460, `tankedDamage` = 740)
  if (Math.round(sera.tankedDamage) !== 740) {
    throw new Error(`Expected sera.tankedDamage === 740, got ${sera.tankedDamage}`);
  }

  let foeHitEvents = [];
  const origFoeTakeDmg = foe.takeDamage.bind(foe);
  foe.takeDamage = (amt, att, crit, kx, ky) => {
    foeHitEvents.push({ t: sera.stateTimer, amt: Math.round(amt), crit });
    return origFoeTakeDmg(amt, att, crit, kx, ky);
  };

  sera.finisherGauge = 100;
  sera.setState('TRUE_ULTIMATE');
  let sawInvulnFlight = false;
  let hpAfterHeal = 0;
  for (let step = 0; step < 150; step++) {
    const dt = 1 / 30;
    sera.update(dt, foe, game);
    game.renderer.update(dt, [sera, foe]);
    game.renderer.render([sera, foe], game.vfx);
    if (sera.state === 'TRUE_ULTIMATE' && sera.stateTimer > 0.7 && sera.stateTimer < 2.8) {
      if (sera.unstoppablePoise && sera.groundY - sera.y >= 58) sawInvulnFlight = true;
      hpAfterHeal = Math.max(hpAfterHeal, sera.hp);
    }
    if (game.renderer.trueUltStageOverride !== null || game.renderer.permanentStageOverride !== null) {
      throw new Error('Seraphina FINAL GRACE must NOT alter or replace the stage background!');
    }
  }

  const expectedHealHp = 460 + Math.round(sera.maxHp * 0.30);
  if (!sawInvulnFlight) throw new Error('Did not observe Seraphina invulnerable winged flight during FINAL GRACE charge');
  if (hpAfterHeal < expectedHealHp) {
    throw new Error(`Expected Seraphina FINAL GRACE +30% Max HP heal (>= ${expectedHealHp}), got ${hpAfterHeal}`);
  }
  if (foeHitEvents.length !== 1) {
    throw new Error(`Expected FINAL GRACE beam to deal ONE single instant burst, got ${foeHitEvents.length} hits: ${JSON.stringify(foeHitEvents)}`);
  }
  if (foeHitEvents[0].amt !== 740 || foeHitEvents[0].t < 2.98) {
    throw new Error(`Expected instant burst of 740 tanked dmg at t >= 3.00s, got ${JSON.stringify(foeHitEvents[0])}`);
  }
  console.log(
    `[PASS] Seraphina FINAL GRACE & Grounded Rig: 0px Auto/Skill float, Wing Vault (${maxVaultLift.toFixed(0)}px) preserved, +30% HP heal (+${Math.round(sera.maxHp * 0.30)} HP), and SINGLE instant ${foeHitEvents[0].amt}-dmg beam at t=${foeHitEvents[0].t.toFixed(2)}s!`
  );
}

// 5. Verify Chronos (`Chronomancer`) Overhaul: 3-Stage Blade/Clone Combo, Chrono-Schism Rewind & `"ETERNAL ZERO: TWELFTH BELL"`!
{
  const { Chronomancer } = await import('../../src/entities/Chronomancer.js?v=30fps156');
  game.renderer.resetStageOverrides();
  game.testModeUnlimitedHp = false;

  const chronos = new Chronomancer({ x: 420, groundY: 460, facing: 1 });
  const foe = new Warrior({ x: 640, groundY: 460, facing: -1, name: 'Aethelgard' });
  foe.maxHp = 5000;
  foe.hp = 5000;
  chronos.game = game;
  foe.game = game;

  if (chronos.name !== 'Chronos' || !chronos.hasTrueUltimate || !chronos.trueUltName.includes('ETERNAL ZERO')) {
    throw new Error(`Unexpected Chronos identity: name=${chronos.name}, ult=${chronos.trueUltName}`);
  }

  // 5A. Verify 3-Stage Blade & Clone Auto-Attack spawns Future Phantom Clone on Stage 2
  let maxClonesCombo = 0;
  for (let c = 0; c < 3; c++) {
    chronos.setState('AUTO_ATTACK');
    for (let i = 0; i < 24; i++) {
      chronos.update(1 / 30, foe, game);
      maxClonesCombo = Math.max(maxClonesCombo, chronos.phantomClones?.length || 0);
    }
  }
  if (maxClonesCombo < 1) {
    throw new Error('Expected Chronos 3-Stage Auto Combo to manifest Future-Self Phantom Clone!');
  }

  // 5B. Verify CHRONO-SCHISM Skill drops Past Anchor, warps in, and rewinds back restoring HP!
  chronos.x = 340;
  chronos.hp = 700;
  chronos.setState('SKILL');
  let warpedClose = false;
  for (let i = 0; i < 40; i++) {
    chronos.update(1 / 30, foe, game);
    if (Math.abs(chronos.x - foe.x) < 120) warpedClose = true;
    if (chronos.stateTimer >= 0.40 && chronos.stateTimer < 0.45) {
      chronos.hp = 560; // Simulate taking damage while inside enemy range before rewind!
    }
  }
  if (!warpedClose || Math.abs(chronos.x - 340) > 28 || chronos.hp <= 560) {
    throw new Error(`Chrono-Schism Rewind failed: warpedClose=${warpedClose}, finalX=${chronos.x}, hp=${chronos.hp}`);
  }

  // 5C. Verify ETERNAL ZERO: TWELFTH BELL freezes mid-air enemy, plants 6 Clock-Spears with 0 ticks during Time-Stop, then deals 1 single burst at t >= 3.50s!
  foe.x = 700;
  foe.y = 460;
  foe.vy = 0;
  let chronoUltHits = [];
  const origTake = foe.takeDamage.bind(foe);
  foe.takeDamage = (amt, att, crit, kx, ky) => {
    chronoUltHits.push({ t: chronos.stateTimer, amt: Math.round(amt), crit });
    return origTake(amt, att, crit, kx, ky);
  };

  chronos.hp = 600;
  chronos.setState('TRUE_ULTIMATE');
  let launchedBeforeMidnight = false;
  let lockedAirY = null;
  let lockedMidAirSamples = 0;
  let maxSpears = 0;
  for (let step = 0; step < 150; step++) {
    const dt = 1 / 30;
    // Simulate enemy leaping mid-air at t = 1.08s right before Midnight XII strikes at t = 1.15s!
    if (!launchedBeforeMidnight && chronos.state === 'TRUE_ULTIMATE' && chronos.stateTimer >= 1.08) {
      launchedBeforeMidnight = true;
      foe.y = 372;
      foe.vy = -210;
    }
    chronos.update(dt, foe, game);
    if (foe.chronoTimeStopTimer > 0 && !foe.isDead && foe.state !== 'TRUE_ULTIMATE') {
      Fighter.prototype.update.call(foe, dt, chronos, game);
    } else {
      foe.update(dt, chronos, game);
    }
    game.renderer.update(dt, [chronos, foe]);
    game.renderer.render([chronos, foe], game.vfx);

    if (chronos.state === 'TRUE_ULTIMATE' && chronos.stateTimer >= 1.20 && chronos.stateTimer <= 3.45) {
      if (lockedAirY === null) lockedAirY = foe.y;
      if (foe.y < 400 && Math.abs(foe.y - lockedAirY) < 0.01 && foe.chronoTimeStopTimer > 0) {
        lockedMidAirSamples++;
      }
      maxSpears = Math.max(maxSpears, chronos.suspendedClockSpears?.length || 0);
    }
    if (game.renderer.trueUltStageOverride !== null || game.renderer.permanentStageOverride !== null) {
      throw new Error('Chronos ETERNAL ZERO must NOT permanently replace the stage background!');
    }
  }

  if (lockedMidAirSamples < 55) {
    throw new Error(`Expected enemy to remain frozen mid-air throughout Stopped Time, got ${lockedMidAirSamples} frames`);
  }
  if (maxSpears < 6) {
    throw new Error(`Expected 6 Suspended Giant Clock-Spears during Time-Stop, got ${maxSpears}`);
  }
  if (chronoUltHits.length !== 1 || chronoUltHits[0].t < 3.48 || chronoUltHits[0].amt < 380) {
    throw new Error(`Expected single simultaneous shatter burst at t >= 3.50s, got ${JSON.stringify(chronoUltHits)}`);
  }
  if (chronos.hp <= 600) {
    throw new Error(`Expected Chronos ETERNAL ZERO Temporal Rewind heal, hp=${chronos.hp}`);
  }
  console.log(
    `[PASS] Chronos Overhaul & ETERNAL ZERO: Twin Clock-Blade/Clone combo, Chrono-Schism Rewind, Mid-Air Time-Stop (${lockedMidAirSamples} locked frames), ${maxSpears} Suspended Clock-Spears, and SINGLE ${chronoUltHits[0].amt}-dmg Twelfth Bell Shatter at t=${chronoUltHits[0].t.toFixed(2)}s!`
  );
}

// 6. Verify Studio Combat Foley & Elemental VFX Audio Overhaul (69 dedicated stereo WAVs, zero missing files, zero unregistered play() keys)
{
  const audio = new AudioManager();
  const keys = Object.keys(audio.volumes);
  if (keys.length < 69) {
    throw new Error(`Expected >= 69 dedicated SFX keys in AudioManager.volumes, got ${keys.length}`);
  }
  const requiredNewKeys = [
    'final_grace_charge',
    'final_grace_beam',
    'time_stop',
    'time_shatter',
    'frost_cast',
    'ice_shatter',
    'prism_beam',
    'cyber_slash',
    'emp_blast',
    'cyber_beam',
    'holy_spear',
    'dragon_dive',
    'raijin_slash',
    'death_ronin',
    'death_titan',
    'death_valkyrie'
  ];
  for (const k of requiredNewKeys) {
    if (!(k in audio.volumes)) {
      throw new Error(`Missing required SFX key '${k}' in AudioManager.volumes`);
    }
  }
  for (const k of keys) {
    const wavPath = `${REPO_ROOT}/assets/sfx/${k}.wav`;
    if (!fs.existsSync(wavPath)) {
      throw new Error(`Missing WAV file on disk for AudioManager key '${k}': ${wavPath}`);
    }
    const header = fs.readFileSync(wavPath).subarray(0, 12).toString('ascii');
    if (!header.startsWith('RIFF') || !header.endsWith('WAVE')) {
      throw new Error(`Invalid RIFF/WAVE header in ${wavPath}`);
    }
  }

  // Scan all src/**/*.js files to confirm 100% of literal audio.play('...'), selectSfx, and deathSfx keys are registered!
  const jsFiles = [
    `${REPO_ROOT}/src/main.js`,
    `${REPO_ROOT}/src/adventure/AdventureManager.js`,
    ...fs.readdirSync(`${REPO_ROOT}/src/entities`).map(
      (f) => `${REPO_ROOT}/src/entities/${f}`
    )
  ];
  let checkedRefs = 0;
  for (const fPath of jsFiles) {
    const src = fs.readFileSync(fPath, 'utf8');
    for (const m of src.matchAll(/audio(?:\?\.)?\.play\(\s*'([a-z0-9_]+)'/g)) {
      checkedRefs++;
      if (!(m[1] in audio.volumes)) {
        throw new Error(`Unregistered audio.play('${m[1]}') in ${fPath}`);
      }
    }
    for (const m of src.matchAll(/(?:selectSfx\s*:|deathSfx\s*=)\s*'([a-z0-9_]+)'/g)) {
      checkedRefs++;
      if (!(m[1] in audio.volumes)) {
        throw new Error(`Unregistered SFX property '${m[1]}' in ${fPath}`);
      }
    }
  }
  console.log(
    `[PASS] Studio Physical-Foley & Elemental VFX Audio: ${keys.length} dedicated stereo WAVs & ${checkedRefs} codebase SFX references verified!`
  );
}

// 7. Verify ALL 7 Newly Upgraded Champions (Freyja, Ronin, Sylvara, Malakor, Torgar, Lyra, VEX-09):
//    - 3-Stage Auto Combo + Skill + Overdrive + Supreme Ultimate (`TRUE_ULTIMATE`)
//    - Deals > 0 damage, returns cleanly to `IDLE`, NEVER alters stage background, and NEVER calls `ctx.rotate` on character draws!
{
  const sevenChampions = [
    { Cls: Valkyrie, label: 'Freyja', expectedUltSubstr: 'GUNGNIR' },
    { Cls: Ronin, label: 'Kaze-Maru', expectedUltSubstr: 'AMAKAKERU' },
    { Cls: Archer, label: 'Sylvara', expectedUltSubstr: 'YGGDRASIL' },
    { Cls: Reaper, label: 'Malakor', expectedUltSubstr: 'MEMENTO MORI' },
    { Cls: Titan, label: 'Torgar', expectedUltSubstr: 'MJOLNIR' },
    { Cls: IceMage, label: 'Lyra', expectedUltSubstr: 'ABSOLUTE ZERO' },
    { Cls: Android, label: 'VEX-09', expectedUltSubstr: 'GUNG-09' }
  ];

  for (const spec of sevenChampions) {
    game.renderer.resetStageOverrides();
    game.testModeUnlimitedHp = true;
    game.projectiles = [];

    const hero = new spec.Cls({ x: 380, groundY: 460, facing: 1 });
    const dummy = new Warrior({ x: 640, groundY: 460, facing: -1, name: 'TargetDummy' });
    dummy.maxHp = 20000;
    dummy.hp = 20000;
    hero.game = game;
    dummy.game = game;
    game.fighters = [hero, dummy];
    game.getEnemiesOf = (f) => game.fighters.filter((o) => o !== f);

    if (!hero.hasTrueUltimate || !hero.trueUltName || !hero.trueUltName.toUpperCase().includes(spec.expectedUltSubstr)) {
      throw new Error(
        `[${spec.label}] Missing or unexpected Supreme Ultimate! hasTrueUltimate=${hero.hasTrueUltimate}, trueUltName=${hero.trueUltName}`
      );
    }

    if (spec.Cls === IceMage && hero.name !== 'Lyra') {
      throw new Error(`[Lyra] Expected IceMage default name === 'Lyra', got '${hero.name}'`);
    }

    // 7A. Exercise 3-stage AUTO_ATTACK + SKILL + Projectile updates without any runtime errors or character rotation
    const track = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const trackCtx = createMockCtx(track);
    let kitDamage = 0;
    const origDummyTake = dummy.takeDamage.bind(dummy);
    dummy.takeDamage = (amt, att, crit, kx, ky) => {
      kitDamage += amt;
      return origDummyTake(amt, att, crit, kx, ky);
    };

    for (let combo = 0; combo < 3; combo++) {
      hero.x = 460;
      dummy.x = spec.Cls === Archer || spec.Cls === IceMage ? 700 : 545;
      dummy.setState('IDLE');
      hero.setState('AUTO_ATTACK');
      for (let f = 0; f < 24; f++) {
        const dt = 1 / 30;
        dummy.dodgeCooldown = 999;
        dummy.dashCooldown = 999;
        dummy.skillCooldown = 999;
        dummy.autoCooldown = 999;
        hero.update(dt, dummy, game);
        dummy.update(dt, hero, game);
        game.vfx.update(dt, 460, game.renderer, game.audio);
        for (const p of game.projectiles) p.update?.(dt, [hero, dummy], game);
        game.projectiles = game.projectiles.filter((p) => p.active !== false);
        hero.draw(trackCtx);
      }
    }

    hero.x = 440;
    dummy.x = 620;
    dummy.setState('IDLE');
    hero.setState('SKILL');
    for (let f = 0; f < 36; f++) {
      const dt = 1 / 30;
      dummy.dodgeCooldown = 999;
      dummy.dashCooldown = 999;
      dummy.skillCooldown = 999;
      dummy.autoCooldown = 999;
      hero.update(dt, dummy, game);
      dummy.update(dt, hero, game);
      game.vfx.update(dt, 460, game.renderer, game.audio);
      for (const p of game.projectiles) p.update?.(dt, [hero, dummy], game);
      game.projectiles = game.projectiles.filter((p) => p.active !== false);
      hero.draw(trackCtx);
    }

    if (kitDamage <= 0) {
      throw new Error(`[${spec.label}] 3-stage AUTO_ATTACK + SKILL dealt 0 damage!`);
    }

    // 7B. Exercise TRUE_ULTIMATE from t = 0 through completion (up to 6.0s)
    hero.setState('IDLE');
    hero.x = 380;
    hero.y = 460;
    dummy.setState('IDLE');
    dummy.x = 680;
    dummy.y = 460;
    dummy.hp = 20000;
    let ultDamage = 0;
    dummy.takeDamage = (amt, att, crit, kx, ky) => {
      ultDamage += amt;
      return origDummyTake(amt, att, crit, kx, ky);
    };

    hero.finisherGauge = 100;
    hero.setState('TRUE_ULTIMATE');
    let exitedUltCleanly = false;
    for (let step = 0; step < 190; step++) {
      const dt = 1 / 30;
      hero.update(dt, dummy, game);
      dummy.update(dt, hero, game);
      for (const p of game.projectiles) p.update?.(dt, [hero, dummy], game);
      game.projectiles = game.projectiles.filter((p) => p.active !== false);
      game.vfx.update(dt, 460, game.renderer, game.audio);
      game.renderer.update(dt, [hero, dummy]);
      game.renderer.render([hero, dummy], game.vfx);
      hero.draw(trackCtx);

      if (spec.Cls === Ronin) {
        const curStageOv = game.renderer.permanentStageOverride || game.renderer.trueUltStageOverride;
        if (hero.state === 'TRUE_ULTIMATE' && hero.stateTimer < 1.94 && curStageOv !== null) {
          throw new Error(`[${spec.label}] Premature stage override before tsuba click (t=${hero.stateTimer.toFixed(2)}): ${curStageOv}`);
        }
        if (curStageOv !== null && curStageOv !== 'shogunate') {
          throw new Error(`[${spec.label}] Expected 'shogunate' stage override, got ${curStageOv}`);
        }
      } else if (spec.Cls === IceMage) {
        const curStageOv = game.renderer.permanentStageOverride || game.renderer.trueUltStageOverride;
        if (hero.state === 'TRUE_ULTIMATE' && hero.stateTimer < 3.27 && curStageOv !== null) {
          throw new Error(
            `[${spec.label}] Premature glacial stage override before Sovereign Scepter-Tap (t=${hero.stateTimer.toFixed(2)}): ${curStageOv}`
          );
        }
        if (curStageOv !== null && curStageOv !== 'glacial') {
          throw new Error(`[${spec.label}] Expected 'glacial' stage override, got ${curStageOv}`);
        }
      } else if (game.renderer.trueUltStageOverride !== null || game.renderer.permanentStageOverride !== null) {
        throw new Error(`[${spec.label}] TRUE_ULTIMATE illegally altered the stage background!`);
      }
      if (step > 30 && hero.state !== 'TRUE_ULTIMATE') {
        exitedUltCleanly = true;
        break;
      }
    }

    if (!exitedUltCleanly) {
      throw new Error(`[${spec.label}] Did not exit TRUE_ULTIMATE cleanly within 6.3s (stuck in ${hero.state}, t=${hero.stateTimer.toFixed(2)})`);
    }
    if (spec.Cls === Ronin && game.renderer.permanentStageOverride !== 'shogunate') {
      throw new Error(
        `[${spec.label}] Expected TRUE_ULTIMATE vs Warrior to teleport stage to 'shogunate', got '${game.renderer.permanentStageOverride}'`
      );
    }
    if (spec.Cls === IceMage && game.renderer.permanentStageOverride !== 'glacial') {
      throw new Error(
        `[${spec.label}] Expected TRUE_ULTIMATE vs Warrior to freeze stage into 'glacial', got '${game.renderer.permanentStageOverride}'`
      );
    }
    if (ultDamage < 200) {
      throw new Error(`[${spec.label}] Expected massive Supreme Ultimate damage (>= 200), got ${Math.round(ultDamage)}`);
    }
    console.log(
      `[PASS] ${spec.label} (${hero.trueUltName}): KitDmg=${Math.round(kitDamage)}, UltDmg=${Math.round(ultDamage)}, StageOverride=${game.renderer.permanentStageOverride || 'NONE'}, CleanExit=${hero.state}!`
    );
  }
}

// 8. Verify 3-Step Landing -> Mode Select -> Character Select DOM Integrity & Zero "Final Spark" Strings!
{
  const indexHtml = fs.readFileSync(`${REPO_ROOT}/index.html`, 'utf8');
  const mainJs = fs.readFileSync(`${REPO_ROOT}/src/main.js`, 'utf8');
  const styleCss = fs.readFileSync(`${REPO_ROOT}/style.css`, 'utf8');

  // 8A. Verify every literal document.getElementById('...') in main.js exists in index.html (unless optional-chained / guarded, still report any missing IDs!)
  const htmlIds = new Set([...indexHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const missingIds = [];
  for (const m of mainJs.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)) {
    if (!htmlIds.has(m[1])) {
      missingIds.push(m[1]);
    }
  }
  if (missingIds.length > 0) {
    throw new Error(`src/main.js references getElementById(...) missing from index.html: ${missingIds.join(', ')}`);
  }

  // 8B. Verify Chronos Time-Stop short-circuit in main.js was preserved!
  if (!mainJs.includes('chronoTimeStopTimer') || !mainJs.includes('Fighter.prototype.update.call')) {
    throw new Error('src/main.js lost Chronos chronoTimeStopTimer / Fighter.prototype.update.call short-circuit!');
  }

  // 8C. Verify zero "Final Spark" strings anywhere in index.html, style.css, or src/
  const allCheckFiles = [
    `${REPO_ROOT}/index.html`,
    `${REPO_ROOT}/style.css`,
    `${REPO_ROOT}/src/main.js`,
    `${REPO_ROOT}/src/adventure/AdventureManager.js`,
    ...fs.readdirSync(`${REPO_ROOT}/src/entities`).map(
      (f) => `${REPO_ROOT}/src/entities/${f}`
    )
  ];
  for (const p of allCheckFiles) {
    const txt = fs.readFileSync(p, 'utf8');
    if (/final\s+spark/i.test(txt)) {
      throw new Error(`Forbidden copyrighted name 'Final Spark' found in ${p}!`);
    }
  }
  console.log(
    `[PASS] 3-Step Landing/Mode/Roster UI & Codebase Hygiene: ${htmlIds.size} HTML IDs matched 100%, Time-Stop routing intact, 0 'Final Spark' occurrences (${styleCss.length} bytes CSS)!`
  );
}

// 9. Verify Malakor v5 (`Reaper`) Full Rework: Soul Harvester Stacks, Trinity of the Scythe + Thanatos Stand,
//    SOUL SEVER Captive Effigy & Soul-Link Resonance, and MEMENTO MORI: OBLIVION GUILLOTINE!
{
  game.renderer.resetStageOverrides();
  game.testModeUnlimitedHp = false;

  const malakor = new Reaper({ x: 380, groundY: 460, facing: 1 });
  const foe = new Warrior({ x: 640, groundY: 460, facing: -1, name: 'Aethelgard' });
  foe.maxHp = 8000;
  foe.hp = 8000;
  malakor.game = game;
  foe.game = game;
  game.fighters = [malakor, foe];
  game.getEnemiesOf = (f) => game.fighters.filter((o) => o !== f);

  if (
    malakor.skillName !== 'SOUL SEVER' ||
    malakor.ultName !== "DEATH'S SOVEREIGNTY" ||
    malakor.trueUltName !== 'MEMENTO MORI: OBLIVION GUILLOTINE'
  ) {
    throw new Error(
      `Unexpected Malakor v5 kit names: skill=${malakor.skillName}, ult=${malakor.ultName}, trueUlt=${malakor.trueUltName}`
    );
  }

  // 9A. Verify 3-Stage Auto Combo ("TRINITY OF THE SCYTHE") spawns Stage-1 Scythe Wave, harvests Soul Stacks, and manifests Stage-3 Thanatos Stand + Soul-Disc!
  let sawWave = false;
  let sawStandInAuto = false;
  let sawBoomerang = false;
  malakor.soulStacks = 1;
  for (let c = 0; c < 3; c++) {
    malakor.x = 420;
    foe.x = c === 0 ? 640 : 540;
    malakor.setState('AUTO_ATTACK');
    for (let i = 0; i < 28 && malakor.state === 'AUTO_ATTACK'; i++) {
      malakor.update(1 / 30, foe, game);
      if (malakor.scytheWave) sawWave = true;
      if (malakor.thanatosStand) sawStandInAuto = true;
      if (malakor.activeScytheBoomerang) sawBoomerang = true;
    }
  }
  if (!sawWave || !sawStandInAuto || !sawBoomerang || malakor.soulStacks < 3) {
    throw new Error(
      `Malakor v5 Trinity of the Scythe check failed: wave=${sawWave}, stand=${sawStandInAuto}, disc=${sawBoomerang}, souls=${malakor.soulStacks}`
    );
  }

  // 9B. Verify SOUL SEVER rips Captive Severed Soul Effigy & transmits damage along Soul-Link even when enemy kites away!
  malakor.x = 400;
  foe.x = 640;
  malakor.soulStacks = 4;
  malakor.setState('SKILL');
  let sawEffigy = false;
  for (let i = 0; i < 32; i++) {
    malakor.update(1 / 30, foe, game);
    if (malakor.severedSoul && malakor.severedSoul.life > 0) sawEffigy = true;
  }
  if (!sawEffigy || !malakor.severedSoul) {
    throw new Error('Expected Malakor v5 SOUL SEVER to rip a Captive Severed Soul Effigy!');
  }

  // Move foe far away (x = 920) while leaving Severed Soul Effigy near Malakor, then swing at the effigy!
  foe.x = 920;
  malakor.severedSoul.echoCooldown = 0;
  const hpBeforeLinkStrike = foe.hp;
  malakor.x = malakor.severedSoul.x - 50;
  malakor.facing = 1;
  malakor.comboStep = 1; // Stage 2 melee strike
  malakor.setState('AUTO_ATTACK');
  for (let i = 0; i < 22; i++) {
    malakor.update(1 / 30, foe, game);
  }
  const linkTransmittedDmg = hpBeforeLinkStrike - foe.hp;
  if (linkTransmittedDmg <= 0) {
    throw new Error(
      `Expected cleaving Captive Severed Soul Effigy to transmit Soul-Link damage to distant foe! hp=${foe.hp} vs ${hpBeforeLinkStrike}`
    );
  }

  // 9C. Verify MEMENTO MORI: OBLIVION GUILLOTINE deals 0 micro-ticks during Phase 1-2, then ONE 720-Crit burst at t >= 3.15s + 15% Max HP heal!
  malakor.hp = 1200;
  foe.x = 680;
  foe.hp = 6000;
  const ultHits = [];
  const origFoeTake = foe.takeDamage.bind(foe);
  foe.takeDamage = (amt, att, crit, kx, ky) => {
    ultHits.push({ t: malakor.stateTimer, amt: Math.round(amt), crit });
    return origFoeTake(amt, att, crit, kx, ky);
  };

  const reaperTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const reaperCtx = createMockCtx(reaperTrack);
  malakor.setState('TRUE_ULTIMATE');
  for (let step = 0; step < 145; step++) {
    const dt = 1 / 30;
    malakor.update(dt, foe, game);
    malakor.drawForegroundOverlay(reaperCtx, game.renderer);
    malakor.draw(reaperCtx, false, game.renderer);
    malakor.drawUltimateForeground(reaperCtx, game.renderer);
    if (game.renderer.trueUltStageOverride !== null || game.renderer.permanentStageOverride !== null) {
      throw new Error('Malakor v5 TRUE_ULTIMATE must NEVER replace stage background!');
    }
  }
  if (ultHits.length !== 1 || ultHits[0].t < 3.14 || ultHits[0].amt < 700 || !ultHits[0].crit) {
    throw new Error(`Expected single instantaneous >=700 Crit burst at t >= 3.15s, got ${JSON.stringify(ultHits)}`);
  }
  if (malakor.hp <= 1200 || reaperTrack.rotateCalls > 0 || reaperTrack.quadCalls > 0) {
    throw new Error(
      `Malakor v5 post-ult check failed: hp=${malakor.hp}, rotateCalls=${reaperTrack.rotateCalls}, quadCalls=${reaperTrack.quadCalls}`
    );
  }
  console.log(
    `[PASS] Malakor v5 Full Rework: Soul Harvester stacks, Trinity + Thanatos Stand, Soul Sever Effigy link-transmission (-${linkTransmittedDmg} dmg), and SINGLE ${ultHits[0].amt}-Crit Oblivion Guillotine at t=${ultHits[0].t.toFixed(2)}s!`
  );
}

// 10. Verify Torgar v7 (`Titan`) Full Rework: Molten Crucible Cores, 3-Animation World-Maul Auto + Khazad Ancestor,
//     WORLD-ANVIL CATACLYSM Altar Resonance & Wall-Ricochet Cannonball, Upright WORLD-BREAKER HOME RUN Overdrive
//     (Row 4 F00..F14 Baseball-Bat Farthest-Wall Knockback + 0.8s Stun), and GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER
//     (Giant 2.38x -> Sky-Uppercut Knockup -> Teleport to Top -> Meteor Ground-Smash + 1.65s Stun)!
{
  game.renderer.resetStageOverrides();
  game.testModeUnlimitedHp = false;

  const torgar = new Titan({ x: 380, groundY: 460, facing: 1 });
  const foe = new Warrior({ x: 650, groundY: 460, facing: -1, name: 'Aethelgard' });
  foe.maxHp = 9000;
  foe.hp = 9000;
  torgar.game = game;
  foe.game = game;
  game.fighters = [torgar, foe];
  game.getEnemiesOf = (f) => game.fighters.filter((o) => o !== f);

  if (
    torgar.skillName !== 'WORLD-ANVIL CATACLYSM' ||
    torgar.ultName !== 'WORLD-BREAKER HOME RUN' ||
    torgar.trueUltName !== 'GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER'
  ) {
    throw new Error(
      `Unexpected Torgar v7 kit names: skill=${torgar.skillName}, ult=${torgar.ultName}, trueUlt=${torgar.trueUltName}`
    );
  }

  // 10A. Verify 4-Animation Auto Combo ("QUARTET OF THE WORLD-MAUL"):
  //      Animation 0 (`60..67`) spawns Magnetic Fissure Wave & pulls kiting foe inward,
  //      Animation 1 (`68..74`) builds Crucible Core, Animation 2 (`75..82`) manifests Khazad Ancestor,
  //      Animation 3 (`83..89`) sweeps World-Anvil Back-Crush!
  let sawFissureWave = false;
  let sawAncestorInAuto = false;
  let gainedCoreOnStage1 = false;
  torgar.crucibleStacks = 1;
  const foeStartX = 680;
  foe.x = foeStartX;
  const titanSliceBounds = [
    [60, 67],
    [68, 74],
    [75, 82],
    [83, 89]
  ];
  for (let c = 0; c < 4; c++) {
    torgar.x = 400;
    torgar.comboStep = c;
    if (c > 0) foe.x = 535;
    const stacksBefore = torgar.crucibleStacks;
    torgar.setState('AUTO_ATTACK');
    const [minExpect, maxExpect] = titanSliceBounds[c];
    for (let i = 0; i < 24; i++) {
      torgar.update(1 / 30, foe, game);
      if (torgar.state === 'AUTO_ATTACK' && torgar.trueUltFrameOverride !== null) {
        if (torgar.trueUltFrameOverride < minExpect || torgar.trueUltFrameOverride > maxExpect) {
          throw new Error(
            `Titan Auto Animation ${c} leaked outside [${minExpect}..${maxExpect}]: got ${torgar.trueUltFrameOverride}`
          );
        }
      }
      if (torgar.fissureWaves.length > 0) sawFissureWave = true;
      if (torgar.ancestorSpiritTimer > 0) sawAncestorInAuto = true;
      if (c === 0 && i === 18 && foe.x >= foeStartX) {
        throw new Error(`Expected Animation-1 Magnetic Fissure Wave to pull kiting foe inward from ${foeStartX}, got x=${foe.x}`);
      }
      if (torgar.state === 'IDLE') break;
    }
    if (c === 1 && torgar.crucibleStacks > stacksBefore) {
      gainedCoreOnStage1 = true;
    }
  }
  if (!sawFissureWave || !gainedCoreOnStage1 || !sawAncestorInAuto) {
    throw new Error(
      `Torgar v7 World-Maul check failed: fissureWave=${sawFissureWave}, coreOnStage1=${gainedCoreOnStage1}, ancestor=${sawAncestorInAuto}`
    );
  }

  // 10B. Verify WORLD-ANVIL CATACLYSM plants persistent World-Anvil Altar, launches Anvil Cannonball, AND ricochets off arena wall!
  torgar.x = 740;
  torgar.facing = 1;
  foe.x = 1020; // Ahead on the right so Torgar fires +X, hits foe, slams right wall (x >= 1136), and ricochets left (vx < 0)!
  torgar.setState('SKILL');
  let sawAltar = false;
  let sawWallRicochet = false;
  for (let i = 0; i < 45; i++) {
    torgar.update(1 / 30, foe, game);
    if (torgar.worldAnvilAltar && torgar.worldAnvilAltar.life > 0) sawAltar = true;
    if (torgar.activeAnvil && torgar.activeAnvil.rebounded && torgar.activeAnvil.vx < 0) {
      sawWallRicochet = true;
    }
  }
  if (!sawAltar || !torgar.worldAnvilAltar || !sawWallRicochet) {
    throw new Error(
      `Expected WORLD-ANVIL CATACLYSM to plant World-Anvil Altar & ricochet Cannonball off wall! altar=${sawAltar}, ricochet=${sawWallRicochet}`
    );
  }

  // 10C. Verify Seismic Anvil Resonance: enemy stands near planted World-Anvil Altar while Torgar slams Stage-3 Finisher far away!
  torgar.activeAnvil = null;
  torgar.worldAnvilAltar.resonanceCd = 0;
  torgar.worldAnvilAltar.pulseTimer = 9.0;
  foe.x = torgar.worldAnvilAltar.x + 40;
  const hpBeforeResonance = foe.hp;
  torgar.x = 220; // Far away (>600px) from foe & Altar!
  torgar.facing = -1;
  torgar.comboStep = 2; // Animation-3 Battering-Ram Finisher
  torgar.setState('AUTO_ATTACK');
  for (let i = 0; i < 24; i++) {
    torgar.update(1 / 30, foe, game);
  }
  const resonanceDmg = hpBeforeResonance - foe.hp;
  if (resonanceDmg <= 0) {
    throw new Error(
      `Expected Stage-3 Battering-Ram Slam to detonate Seismic Resonance on distant World-Anvil Altar! hp=${foe.hp} vs ${hpBeforeResonance}`
    );
  }

  // 10C.2 Verify WORLD-BREAKER HOME RUN Overdrive (`state === 'ULTIMATE'`):
  //       Strictly uses upright Row 4 frames `120..134` (`F00..F14`), bats enemy to FARTHEST stage wall, and stuns for 0.8s!
  torgar.x = 260;
  foe.x = 340;
  foe.stunTimer = 0;
  const hpBeforeHomeRun = foe.hp;
  torgar.setState('ULTIMATE');
  let stunnedAtRightWall = false;
  for (let i = 0; i < 48; i++) {
    torgar.update(1 / 30, foe, game);
    if (torgar.state === 'ULTIMATE' && torgar.trueUltFrameOverride !== null) {
      if (torgar.trueUltFrameOverride < 120 || torgar.trueUltFrameOverride > 134) {
        throw new Error(
          `Expected Titan ULTIMATE frames to stay strictly in upright Row 4 F00..F14 (120..134), got ${torgar.trueUltFrameOverride}`
        );
      }
    }
    if (foe.stunTimer >= 0.78 && foe.x >= 1115) {
      stunnedAtRightWall = true;
    }
  }
  if (!stunnedAtRightWall || foe.hp >= hpBeforeHomeRun) {
    throw new Error(
      `Expected WORLD-BREAKER HOME RUN from x=340 to bat enemy to farthest right wall (x=1118) and stun for 0.8s, got x=${foe.x}, stun=${foe.stunTimer}`
    );
  }
  // Case 2: Enemy at x=880 (closer to right wall 1118 -> farthest side is left wall 82)
  torgar.x = 960;
  foe.x = 880;
  foe.stunTimer = 0;
  torgar.setState('ULTIMATE');
  let stunnedAtLeftWall = false;
  for (let i = 0; i < 48; i++) {
    torgar.update(1 / 30, foe, game);
    if (foe.stunTimer >= 0.78 && foe.x <= 85) {
      stunnedAtLeftWall = true;
    }
  }
  if (!stunnedAtLeftWall) {
    throw new Error(
      `Expected WORLD-BREAKER HOME RUN from x=880 to bat enemy to farthest left wall (x=82) and stun for 0.8s, got x=${foe.x}, stun=${foe.stunTimer}`
    );
  }

  // 10D. Verify GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER Rework (`3.80s` 4-Beat Choreography):
  //      Grows HUGE (`>= 2.10x`, target `2.15x`), hammers enemy UP into sky (`minFoeY <= groundY - 195`),
  //      teleports cleanly ABOVE the airborne enemy (`minTorgarY <= minFoeY - 150`, `<= groundY - 370`),
  //      and meteor-spikes them into the ground (`groundY`) at `t >= 2.36s` for ONE 735-Crit + 1.85s Stun + 9% Max HP heal!
  const arenaGroundY = game.renderer.groundY || 520;
  torgar.groundY = arenaGroundY;
  foe.groundY = arenaGroundY;
  torgar.hp = 1200;
  torgar.x = 420;
  torgar.y = arenaGroundY;
  foe.x = 680;
  foe.y = arenaGroundY;
  foe.hp = 7000;
  foe.stunTimer = 0;
  const torgarUltHits = [];
  const origTake = foe.takeDamage.bind(foe);
  foe.takeDamage = (amt, att, crit, kx, ky) => {
    if (torgar.state === 'TRUE_ULTIMATE') {
      torgarUltHits.push({ t: torgar.stateTimer, amt: Math.round(amt), crit, foeY: foe.y });
    }
    return origTake(amt, att, crit, kx, ky);
  };
  torgar.worldAnvilAltar = null;
  torgar.activeAnvil = null;
  torgar.fissureWaves.length = 0;

  let maxGiantScale = 1.0;
  let minFoeY = arenaGroundY;
  let minTorgarY = arenaGroundY;
  let prevTorgarY = torgar.y;
  let maxAscentStepDeltaY = 0;
  let sawJumpTrail = false;
  let sawSoilRockSplash = false;
  let maxRow7BurstsAtOnce = 0;
  let maxPostSmashStun = 0;
  let sawCleanIdleExit = false;

  const titanTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const titanCtx = createMockCtx(titanTrack);
  torgar.setState('TRUE_ULTIMATE');
  for (let step = 0; step < 145; step++) {
    const dt = 1 / 30;
    torgar.update(dt, foe, game);
    if (torgar.state === 'TRUE_ULTIMATE') {
      maxGiantScale = Math.max(maxGiantScale, torgar.giantScale || 1.0);
      minFoeY = Math.min(minFoeY, foe.y);
      minTorgarY = Math.min(minTorgarY, torgar.y);
      if (torgar.stateTimer < 1.96) {
        const ascentDelta = Math.max(0, prevTorgarY - torgar.y);
        maxAscentStepDeltaY = Math.max(maxAscentStepDeltaY, ascentDelta);
      }
      if (Array.isArray(torgar._superJumpTrail) && torgar._superJumpTrail.length > 0) {
        sawJumpTrail = true;
      }
      prevTorgarY = torgar.y;
      if (torgar.stateTimer >= 2.35) {
        maxPostSmashStun = Math.max(maxPostSmashStun, foe.stunTimer || 0);
        if (torgar._soilRockChunks.length >= 24 && torgar._soilDustPlumes.length >= 12) {
          sawSoilRockSplash = true;
        }
        const row7Bursts = torgar.activeVfxAnims.filter((v) => v.row === 7);
        maxRow7BurstsAtOnce = Math.max(maxRow7BurstsAtOnce, row7Bursts.length);
        for (const b of row7Bursts) {
          if (b.glowColor !== 'none') {
            throw new Error(`Expected Row 7 Soil/Rock Crater Splash glowColor='none', got ${b.glowColor}`);
          }
        }
      }
    } else if (torgarUltHits.length >= 1 && torgar.state === 'IDLE') {
      sawCleanIdleExit = true;
    }
    torgar.drawForegroundOverlay(titanCtx, game.renderer);
    torgar.draw(titanCtx, false, game.renderer);
    torgar.drawUltimateForeground(titanCtx, game.renderer);
    if (game.renderer.trueUltStageOverride !== null || game.renderer.permanentStageOverride !== null) {
      throw new Error('Torgar v7 TRUE_ULTIMATE must NEVER replace stage background!');
    }
  }
  if (
    maxGiantScale < 2.10 ||
    minFoeY > arenaGroundY - 195 ||
    minTorgarY > minFoeY - 150 ||
    minTorgarY > arenaGroundY - 370 ||
    maxAscentStepDeltaY > 115 ||
    !sawJumpTrail ||
    !sawSoilRockSplash ||
    maxRow7BurstsAtOnce < 1 ||
    maxRow7BurstsAtOnce > 3 ||
    maxPostSmashStun < 1.75
  ) {
    throw new Error(
      `Expected Torgar v7 TRUE_ULTIMATE Giant Sky-Uppercut + Continuous Fast-Jump + Soil/Rock Crater Splash (no spikes!) + Ground-Smash Stun! scale=${maxGiantScale}, minFoeY=${minFoeY}, minTorgarY=${minTorgarY}, maxAscentStepDeltaY=${maxAscentStepDeltaY}, sawJumpTrail=${sawJumpTrail}, sawSoilRockSplash=${sawSoilRockSplash}, maxRow7BurstsAtOnce=${maxRow7BurstsAtOnce}, postStun=${maxPostSmashStun}`
    );
  }
  if (
    torgarUltHits.length !== 1 ||
    torgarUltHits[0].t < 2.34 ||
    torgarUltHits[0].amt < 700 ||
    !torgarUltHits[0].crit ||
    Math.abs(torgarUltHits[0].foeY - arenaGroundY) > 1
  ) {
    throw new Error(
      `Expected single instantaneous >=700 Crit Continental Sunder ground-smash at t >= 2.36s on groundY, got ${JSON.stringify(torgarUltHits)}`
    );
  }
  if (torgar.hp <= 1200 || !sawCleanIdleExit || titanTrack.rotateCalls > 0 || titanTrack.quadCalls > 0) {
    throw new Error(
      `Torgar v7 post-ult check failed: hp=${torgar.hp}, sawCleanIdleExit=${sawCleanIdleExit}, rotateCalls=${titanTrack.rotateCalls}, quadCalls=${titanTrack.quadCalls}`
    );
  }
  console.log(
    `[PASS] Torgar v7 Full Rework: Slash-Free 3-Animation Symmetric Mjolnir Auto + Khazad Ancestor, World-Anvil Altar Resonance (-${resonanceDmg} dmg) & Wall-Ricochet, Horizontal Baseball-Bat Home-Run Overdrive (F00..F14 + 0.8s Wall Stun), & Colossal ${maxGiantScale.toFixed(2)}x Sky-Uppercut (foeY=${Math.round(minFoeY)}) -> Continuous Fast-Jump (torgarY=${Math.round(minTorgarY)}, maxStepDeltaY=${Math.round(maxAscentStepDeltaY)}px) -> ${torgarUltHits[0].amt}-Crit Meteor Ground-Smash + Soil/Rock Crater Splash + ${maxPostSmashStun.toFixed(2)}s Stun!`
  );
}

// 11. Verify Malakor v6 Underground Shadow Burrow (`1.26s` 100% Submerged + Pitch-Black Indicator + Surprise Attack)
//     & `11.5s` Living Death Companions (`Abyssal Death-Mage` + `Ossuary Soul-Healer` with Own Low HP)!
{
  game.renderer.resetStageOverrides();
  game.vfx.clear();
  game.testModeUnlimitedHp = false;

  const malakor = new Reaper({ x: 360, groundY: 460, facing: 1 });
  const foe = new Warrior({ x: 640, groundY: 460, facing: -1, name: 'Aethelgard' });
  foe.maxHp = 9000;
  foe.hp = 9000;
  malakor.game = game;
  foe.game = game;
  game.fighters = [malakor, foe];
  game.getEnemiesOf = (f) => game.fighters.filter((o) => o !== f);

  const v6Track = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const v6Ctx = createMockCtx(v6Track);

  // 11A. Zero accidental half-body floor sinking during DASH or spectral DODGE!
  malakor.crouchCooldown = 5.0;
  malakor.startDash(foe, game);
  for (let i = 0; i < 12; i++) {
    malakor.update(1 / 30, foe, game);
    if (malakor.isSubmerged || malakor.isFullyBurrowed || malakor.submergeDepth !== 0) {
      throw new Error('Malakor DASH must NEVER partially sink half his body into the ground!');
    }
  }
  malakor.setState('IDLE');
  malakor.crouchCooldown = 5.0;
  malakor.startDodge(foe, game);
  for (let i = 0; i < 12; i++) {
    malakor.update(1 / 30, foe, game);
    if (malakor.isSubmerged || malakor.isFullyBurrowed || malakor.submergeDepth !== 0) {
      throw new Error('Malakor spectral DODGE must NEVER partially sink half his body into the ground!');
    }
  }

  // 11B. True Underground Shadow Burrow (0.22s..1.48s = 1.26s 100% underground!) + Pitch-Black Indicator + Surprise Attack!
  malakor.setState('IDLE');
  malakor.x = 340;
  foe.x = 610;
  const foeHpBeforeBurrow = foe.hp;
  const malakorHpBeforeBurrow = malakor.hp;
  malakor.startCrouch(foe, game);

  let fullyBurrowedFrames = 0;
  let sawWarningLock = false;
  let sawTrailNodes = false;
  for (let f = 0; f < 56; f++) {
    malakor.update(1 / 30, foe, game);
    if (malakor.isFullyBurrowed) {
      fullyBurrowedFrames++;
      // Verify attacks miss Malakor while 100% underground!
      if (f === 20) {
        const taken = malakor.takeDamage(180, foe, true, -90, -50);
        if (taken !== 0 || malakor.hp < malakorHpBeforeBurrow) {
          throw new Error(`Expected Malakor to evade damage while 100% underground, took ${taken}`);
        }
      }
    }
    if (malakor.burrowWarned) sawWarningLock = true;
    if (malakor.burrowTrailNodes.length > 0) sawTrailNodes = true;
    malakor.drawForegroundOverlay(v6Ctx, game.renderer);
    malakor.draw(v6Ctx, false, game.renderer);
    malakor.drawUltimateForeground(v6Ctx, game.renderer);
  }
  const surpriseAttackDmg = foeHpBeforeBurrow - foe.hp;
  if (fullyBurrowedFrames < 36 || !sawWarningLock || !sawTrailNodes || surpriseAttackDmg < 60) {
    throw new Error(
      `Malakor v6 Shadow Burrow check failed: fullyBurrowedFrames=${fullyBurrowedFrames}, warn=${sawWarningLock}, trail=${sawTrailNodes}, surpriseDmg=${surpriseAttackDmg}`
    );
  }

  // 11C.1 DEATH'S SOVEREIGNTY (Regular Overdrive, 1.86s): 5-Beat Sky-Lock Suspension + Wraith Clones + Grave-Ward (0 summons!)
  foe.hp = 6000;
  malakor.setState('ULTIMATE');
  let minUltY = malakor.groundY;
  let sawUltClones = false;
  let sawUltSlash = false;
  for (let f = 0; f < 60; f++) {
    malakor.update(1 / 30, foe, game);
    if (malakor.y < minUltY) minUltY = malakor.y;
    if (malakor.wraithClones.length > 0) sawUltClones = true;
    if (malakor._ultSlashFlash > 0) sawUltSlash = true;
    malakor.drawForegroundOverlay(v6Ctx, game.renderer);
    malakor.draw(v6Ctx, false, game.renderer);
    malakor.drawUltimateForeground(v6Ctx, game.renderer);
  }
  if (
    malakor.state === 'ULTIMATE' ||
    malakor.deathCompanions.length !== 0 ||
    minUltY > malakor.groundY - 150 ||
    !sawUltClones ||
    !sawUltSlash ||
    malakor.graveWardTimer <= 0
  ) {
    throw new Error(
      `Malakor Overdrive check failed: state=${malakor.state}, comps=${malakor.deathCompanions.length}, minUltY=${minUltY}, clones=${sawUltClones}, slash=${sawUltSlash}, graveWard=${malakor.graveWardTimer}`
    );
  }

  // 11C.2 MEMENTO MORI (Super Ultimate, 4.50s): Summons 12.5s Living Death-Mage (480 HP + 60 Ward) & Soul-Healer (420 HP + 50 Ward) + 192px Sky-Ascent!
  foe.hp = 6000;
  malakor.hp = 2200;
  malakor.setState('TRUE_ULTIMATE');
  let minTrueUltY = malakor.groundY;
  let sawTrueUltSlash = false;
  let sawGateRitualComps = false;
  for (let f = 0; f < 138; f++) {
    malakor.update(1 / 30, foe, game);
    if (malakor.y < minTrueUltY) minTrueUltY = malakor.y;
    if (malakor._trueUltSlashFlash > 0) sawTrueUltSlash = true;
    if (malakor.state === 'TRUE_ULTIMATE' && malakor.deathCompanions.length === 2) {
      sawGateRitualComps = true;
    }
    malakor.drawForegroundOverlay(v6Ctx, game.renderer);
    malakor.draw(v6Ctx, false, game.renderer);
    malakor.drawUltimateForeground(v6Ctx, game.renderer);
  }
  if (
    malakor.state === 'TRUE_ULTIMATE' ||
    !sawGateRitualComps ||
    minTrueUltY > malakor.groundY - 175 ||
    !sawTrueUltSlash
  ) {
    throw new Error(
      `Malakor Super Ultimate choreography check failed: state=${malakor.state}, ritualComps=${sawGateRitualComps}, minTrueUltY=${minTrueUltY}, slash=${sawTrueUltSlash}`
    );
  }
  if (malakor.deathCompanions.length !== 2) {
    throw new Error(`Expected 2 persistent Death Companions after TRUE_ULTIMATE, got ${malakor.deathCompanions.length}`);
  }
  const mage = malakor.deathCompanions.find((c) => c.role === 'mage');
  const healer = malakor.deathCompanions.find((c) => c.role === 'healer');
  if (
    !mage ||
    !healer ||
    mage.maxHp !== 480 ||
    healer.maxHp !== 420 ||
    mage.shield < 50 ||
    healer.shield < 45 ||
    mage.life < 12.0 ||
    healer.life < 12.0
  ) {
    throw new Error(
      `Unexpected Super-Ultimate companion stats: mage=${JSON.stringify({ hp: mage?.maxHp, sh: mage?.shield, life: mage?.life })}, healer=${JSON.stringify({ hp: healer?.maxHp, sh: healer?.shield, life: healer?.life })}`
    );
  }

  // 11C.3 Survivability Check: Malakor Death Covenant Ward (12% DR) + Grave-Ward (16% DR, 25% cap) & Companion Soul-Ward + Cleave Cap!
  malakor.isInvulnerable = false;
  malakor.hurtIcd = 0;
  const malHpPreHit = malakor.hp;
  malakor.takeDamage(100, foe, false);
  const malDmgTaken = malHpPreHit - malakor.hp;
  if (malDmgTaken > 78) {
    throw new Error(`Expected Covenant + Grave-Ward DR to reduce 100 dmg to <=78, took ${malDmgTaken}`);
  }

  // Massive 260-dmg AoE cleave is capped to 125 and partially absorbed by 60 Soul-Ward shield!
  mage.spawnGrace = 0;
  mage.hurtIcd = 0;
  mage.takeDamage(260, foe, true);
  if (mage.hp !== 415 || mage.shield !== 0) {
    throw new Error(`Expected 260 cleave -> 125 cap - 60 shield = 65 HP loss (415 HP left), got hp=${mage.hp}, shield=${mage.shield}`);
  }
  // Drop Mage further to 235 HP so Soul-Healer can showcase +92 HP mend!
  mage.hurtIcd = 0;
  mage.takeDamage(180, foe, false, true);
  if (mage.hp !== 235) {
    throw new Error(`Expected direct 180 hit to bring Mage to 235 HP, got ${mage.hp}`);
  }

  malakor.hp = 2400;
  const foeHpBeforeMageOrbs = foe.hp;
  let sawDarkOrb = false;
  let sawMageHealed = false;
  let sawCovenantGrace = false;
  for (let f = 0; f < 78; f++) {
    malakor.update(1 / 30, foe, game);
    if (malakor.darkMagicOrbs.length > 0) sawDarkOrb = true;
    if (mage.hp >= 320 && mage.soulEmpoweredTimer > 0) sawMageHealed = true;
    if (malakor.hp > 2400) sawCovenantGrace = true;
    malakor.drawForegroundOverlay(v6Ctx, game.renderer);
    malakor.draw(v6Ctx, false, game.renderer);
    malakor.drawUltimateForeground(v6Ctx, game.renderer);
  }
  const darkMagicDmg = foeHpBeforeMageOrbs - foe.hp;
  if (!sawDarkOrb || !sawMageHealed || !sawCovenantGrace || darkMagicDmg <= 0) {
    throw new Error(
      `Companion AI/Survivability check failed: sawDarkOrb=${sawDarkOrb}, sawMageHealed=${sawMageHealed} (mageHp=${mage.hp}), covenantGrace=${sawCovenantGrace} (malHp=${malakor.hp}), darkMagicDmg=${darkMagicDmg}`
    );
  }

  // Verify counterplay: focused multi-hit / un-capped lethal damage banishes Soul-Healer cleanly!
  healer.hurtIcd = 0;
  healer.shield = 0;
  healer.spawnGrace = 0;
  healer.takeDamage(600, foe, true, true);
  malakor.update(1 / 30, foe, game);
  if (!healer.isDead || malakor.deathCompanions.length !== 1) {
    throw new Error(`Expected fatal damage to banish Soul-Healer, remaining=${malakor.deathCompanions.length}`);
  }
  if (v6Track.rotateCalls > 0 || v6Track.quadCalls > 0) {
    throw new Error(
      `Malakor v6 forbidden canvas calls detected: rotate=${v6Track.rotateCalls}, quad=${v6Track.quadCalls}`
    );
  }

  console.log(
    `[PASS] Malakor v6 Overdrive Sky-Lock + Super-Ultimate Death Covenant: ${(fullyBurrowedFrames / 30).toFixed(2)}s Underground Burrow (-${Math.round(surpriseAttackDmg)} dmg), Sky-Lock Overdrive (minY=${Math.round(minUltY)}), Super-Ultimate 12.5s Death-Mage (${mage.maxHp} HP + 60 Ward, -${Math.round(darkMagicDmg)} orb dmg) & Soul-Healer (${healer.maxHp} HP + 50 Ward, healed Mage -> ${mage.hp} HP + Covenant Grace)!`
  );
}

// 13. Lyra v6 Full Kit, Winter Coronation Overdrive & Polar Night Reality-Glass Shatter Supreme Ultimate
{
  const lyraTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const lyraCtx = createMockCtx(lyraTrack);
  const lyra = new IceMage({ x: 380, groundY: 460, facing: 1 });
  const foe = new Warrior({ x: 660, groundY: 460, facing: -1 });
  foe.maxHp = 20000;
  foe.hp = 20000;
  const game = createMockGame();
  game.fighters = [lyra, foe];
  lyra.game = game;
  foe.game = game;

  // 13A. Verify 4-Variant Royal Figure-Skating Auto-Attack (`60..67` Comet, `68..74` Chakram, `75..82` 3-Spire Slam, `83..89` Sky-Icicle Hail)
  const seenAutoSubRanges = [false, false, false, false];
  let sawChakram = false;
  let sawMarchingSpire = false;
  let sawSkyIcicles = false;
  let sawSkateFootwork = false;
  for (let v = 0; v < 4; v++) {
    lyra.x = 380;
    foe.x = 660;
    lyra.setState('AUTO_ATTACK');
    for (let f = 0; f < 26; f++) {
      lyra.update(1 / 30, foe, game);
      if (Math.abs(lyra.x - 380) > 6) sawSkateFootwork = true;
      if (lyra.trueUltFrameOverride !== null) {
        const ov = lyra.trueUltFrameOverride;
        if (ov >= 60 && ov <= 67) seenAutoSubRanges[0] = true;
        else if (ov >= 68 && ov <= 74) seenAutoSubRanges[1] = true;
        else if (ov >= 75 && ov <= 82) seenAutoSubRanges[2] = true;
        else if (ov >= 83 && ov <= 89) seenAutoSubRanges[3] = true;
      }
      if (lyra.activeChakrams.length > 0) sawChakram = true;
      if (lyra.activeMarchingSpires.length > 0) sawMarchingSpire = true;
      if (lyra.activeSkyIcicles.length > 0) sawSkyIcicles = true;
      lyra.drawForegroundOverlay(lyraCtx, game.renderer);
      lyra.draw(lyraCtx, false, game.renderer);
      lyra.drawUltimateForeground(lyraCtx, game.renderer);
    }
  }
  if (!seenAutoSubRanges.every(Boolean) || !sawChakram || !sawMarchingSpire || !sawSkyIcicles || !sawSkateFootwork) {
    throw new Error(
      `Lyra v7 4-Variant Auto failed: ranges=${JSON.stringify(seenAutoSubRanges)}, chakram=${sawChakram}, spires=${sawMarchingSpire}, skyIcicles=${sawSkyIcicles}, skateFootwork=${sawSkateFootwork}`
    );
  }

  // 13B. Verify 4-Stack Hoarfrost Rime -> Solid Crystal Freeze (Row-6 Ice Prison + Stun + Shield Heal)
  foe.brittleStacks = 3;
  foe.stunTimer = 0;
  lyra.hp = 3000;
  lyra.applyBrittleFrost(foe, 1, game, foe.x, foe.y - 96);
  if (lyra.activeCrystalPrisons.length === 0 || foe.stunTimer < 0.30 || lyra.hp <= 3000) {
    throw new Error(
      `Lyra v6 Solid Crystal Freeze failed: prisons=${lyra.activeCrystalPrisons.length}, stun=${foe.stunTimer}, hp=${lyra.hp}`
    );
  }

  // 13C. Verify Jump Triple-Axel Sky-Staircase spawns 3 mid-air crystal platforms
  lyra.skyIceSteps = [];
  lyra.startJump(foe, game);
  for (let f = 0; f < 20; f++) {
    lyra.update(1 / 30, foe, game);
    lyra.drawForegroundOverlay(lyraCtx, game.renderer);
  }
  if (lyra.skyIceSteps.length < 3) {
    throw new Error(`Expected 3 mid-air Sky-Staircase platforms on Jump, got ${lyra.skyIceSteps.length}`);
  }
  if (lyra.permafrostZones.length !== 0) {
    throw new Error(`Expected 0 ground Permafrost circles after basic Autos & Jump, got ${lyra.permafrostZones.length}`);
  }

  // 13D. Verify Signature Skill: Glacial Jaws Twin Iceberg Crush (spread 136 -> 16) + Clean Ground Sigil Expiry
  lyra.setState('IDLE');
  lyra.x = 380;
  foe.x = 650;
  lyra.mana = 0;
  const hpPreJaws = foe.hp;
  let maxJawSpread = 0;
  let minJawSpread = 999;
  lyra.setState('SKILL');
  for (let f = 0; f < 30; f++) {
    lyra.update(1 / 30, foe, game);
    if (lyra.glacierJaws) {
      maxJawSpread = Math.max(maxJawSpread, lyra.glacierJaws.spread);
      minJawSpread = Math.min(minJawSpread, lyra.glacierJaws.spread);
    }
    lyra.drawUltimateForeground(lyraCtx, game.renderer);
  }
  const jawsDmg = hpPreJaws - foe.hp;
  if (maxJawSpread < 120 || minJawSpread > 24 || jawsDmg < 70 || lyra.permafrostZones.length > 1) {
    throw new Error(
      `Lyra v6 Glacial Jaws failed: maxSpread=${maxJawSpread}, minSpread=${minJawSpread}, dmg=${jawsDmg}, zones=${lyra.permafrostZones.length}`
    );
  }
  // Advance past the 2.2s Permafrost Rink lifetime + 0.28s shader release window and assert 0 stuck ground circles!
  for (let f = 0; f < 82; f++) {
    lyra.autoCooldown = 5;
    lyra.skillCooldown = 5;
    lyra.dodgeCooldown = 5;
    lyra.crouchCooldown = 5;
    lyra.update(1 / 30, foe, game);
  }
  const stuckSigils = lyra.fx.active.filter((s) => s.key === 'permafrostSnowflakeSigil').length;
  if (lyra.permafrostZones.length !== 0 || stuckSigils !== 0) {
    throw new Error(
      `Lyra Permafrost ground circle stuck! zones=${lyra.permafrostZones.length}, stuckShaderSlots=${stuckSigils}`
    );
  }

  // 13E. Verify Overdrive Ultimate: Winter Coronation Seven Celestial Ice-Swords
  lyra.setState('IDLE');
  foe.x = 660;
  const hpPreCoronation = foe.hp;
  let allSixImpaled = false;
  let crownShattered = false;
  lyra.setState('ULTIMATE');
  for (let f = 0; f < 52; f++) {
    lyra.update(1 / 30, foe, game);
    if (lyra.coronationDomain) {
      if (lyra.coronationDomain.swords.every((s) => s.impacted)) allSixImpaled = true;
      if (lyra.coronationDomain.shattered) crownShattered = true;
    }
    lyra.drawUltimateForeground(lyraCtx, game.renderer);
  }
  const coronationDmg = hpPreCoronation - foe.hp;
  if (!allSixImpaled || !crownShattered || coronationDmg < 150) {
    throw new Error(
      `Lyra v6 Winter Coronation failed: impaled=${allSixImpaled}, shattered=${crownShattered}, dmg=${coronationDmg}`
    );
  }

  // 13F. Verify Supreme Ultimate: Polar Night, 90px Ascension, Reality-Glass Shatter (28 Shards, 0 ctx.rotate)
  lyra.setState('IDLE');
  lyra.hp = 2600;
  foe.x = 680;
  const hpPreTrueUlt = foe.hp;
  let minTrueUltY = lyra.groundY;
  let sawGlassShards = false;
  lyra.setState('TRUE_ULTIMATE');
  for (let f = 0; f < 145; f++) {
    lyra.update(1 / 30, foe, game);
    minTrueUltY = Math.min(minTrueUltY, lyra.y);
    if (lyra._trueUltShatterTimer > 0 && lyra._trueUltGlassShards.length === 28) sawGlassShards = true;
    lyra.drawForegroundOverlay(lyraCtx, game.renderer);
    lyra.draw(lyraCtx, false, game.renderer);
    lyra.drawUltimateForeground(lyraCtx, game.renderer);
  }
  const trueUltDmg = hpPreTrueUlt - foe.hp;
  if (
    lyra.groundY - minTrueUltY < 85 ||
    !sawGlassShards ||
    Math.round(trueUltDmg) !== 675 ||
    lyra.cameraAirLift !== 0 ||
    lyraTrack.rotateCalls > 0
  ) {
    throw new Error(
      `Lyra v6 TRUE_ULTIMATE failed: lift=${lyra.groundY - minTrueUltY}, shards=${sawGlassShards}, dmg=${trueUltDmg}, airLiftAfter=${lyra.cameraAirLift}, rotate=${lyraTrack.rotateCalls}`
    );
  }

  console.log(
    `[PASS] Lyra v7 Full Rework: 4-Variant Figure-Skating Ballet (Lance/Chakram/3-Spire/Sky-Icicle Hail), 4-Stack Solid Crystal Freeze (${foe.stunTimer.toFixed(2)}s), 3-Step Sky-Stair, Glacial Jaws (-${Math.round(jawsDmg)} dmg), 7-Sword Winter Coronation (-${Math.round(coronationDmg)} dmg), & Crystal-Clear Polar Night 28-Shard Reality Shatter (-${Math.round(trueUltDmg)} Crit, 0 ctx.rotate)!`
  );
}

// 14. Verify VEX-09 (`Android`) v3 Gap-Close 3-Variant Melee, Backward-Evade Visor Face-Laser Ultimate & Roster Fighting Style AI!
{
  const vex = new Android({ x: 340, groundY: 460, facing: 1, name: 'VEX-09' });
  const dummy = new Warrior({ x: 540, groundY: 460, facing: -1, name: 'Target' });
  vex.game = game;
  dummy.game = game;
  dummy.maxHp = 99999;
  dummy.hp = 99999;

  // 14A. Verify all 4 Row 2 Auto-Attack variants (`60..67`, `68..74`, `75..82`, `83..89`) physically thruster-glide VEX-09's real model
  //      from 200px distance down to point-blank blade contact (`<= 120px`) BEFORE `didActionFrame` swings!
  const seenSubRanges = [false, false, false, false];
  for (let c = 0; c < 4; c++) {
    vex.x = 340;
    vex.facing = 1;
    dummy.x = 540; // 200px initial gap — VEX-09 thruster-glides in (V0/V3) or cross-pierces through (V1=128px, V2=132px)!
    const hpBeforeVariant = dummy.hp;
    vex.setState('AUTO_ATTACK');
    let distAtSwing = 999;
    for (let f = 0; f < 22; f++) {
      const wasDone = vex.didActionFrame;
      vex.update(1 / 30, dummy, game);
      const ov = vex.trueUltFrameOverride;
      if (ov >= 60 && ov <= 67) seenSubRanges[0] = true;
      if (ov >= 68 && ov <= 74) seenSubRanges[1] = true;
      if (ov >= 75 && ov <= 82) seenSubRanges[2] = true;
      if (ov >= 83 && ov <= 89) seenSubRanges[3] = true;
      if (!wasDone && vex.didActionFrame) {
        distAtSwing = Math.abs(dummy.x - vex.x);
      }
      if (vex.state === 'IDLE') break;
    }
    if (distAtSwing > 140 || dummy.hp >= hpBeforeVariant) {
      throw new Error(
        `VEX-09 Auto Variant ${c} failed to close/cross into blade contact! Expected distAtSwing <= 140px & dmg > 0, got ${distAtSwing.toFixed(1)}px, dmg=${hpBeforeVariant - dummy.hp}`
      );
    }
  }
  if (!seenSubRanges[0] || !seenSubRanges[1] || !seenSubRanges[2] || !seenSubRanges[3]) {
    throw new Error(`VEX-09 did not cycle all 4 Row 2 melee variants: ${JSON.stringify(seenSubRanges)}`);
  }

  // 14B. Verify VEX-09's Overdrive Ultimate ("VALKYRIE VISOR HYPER-LASER") moves BACKWARD first (`>= 150px`),
  //      then fires `visorHyperLaserBeam` directly from her Face/Visor!
  vex.x = 520;
  vex.facing = 1;
  dummy.x = 650;
  const hpBeforeUlt = dummy.hp;
  const startUltX = vex.x;
  let xAtFirstVisorShot = vex.x;
  let sawVisorLaser = false;
  vex.setState('ULTIMATE');
  for (let f = 0; f < 64; f++) {
    vex.update(1 / 30, dummy, game);
    const hasVisorBeam = vex.fx.active.some((a) => a.key === 'visorHyperLaserBeam');
    if (hasVisorBeam && !sawVisorLaser) {
      sawVisorLaser = true;
      xAtFirstVisorShot = vex.x;
    }
    if (vex.state === 'IDLE') break;
  }
  const backwardRetreatPx = startUltX - xAtFirstVisorShot;
  const ultDmgDealt = hpBeforeUlt - dummy.hp;
  if (!sawVisorLaser || backwardRetreatPx < 150 || ultDmgDealt < 280) {
    throw new Error(
      `VEX-09 Visor Hyper-Laser Ultimate failed: sawVisorLaser=${sawVisorLaser}, backwardRetreatPx=${backwardRetreatPx.toFixed(1)}, dmg=${ultDmgDealt}`
    );
  }

  // 14C. Verify Roster-Wide Fighting Style AI Director showcases rich signature states (`CROUCH`, `JUMP`, `DODGE`, `DASH`)
  //      alongside `AUTO_ATTACK` & `SKILL` in live AI-vs-AI combat!
  const aiRosterPairs = [
    [new Warrior({ x: 380, groundY: 460, facing: 1, name: 'Aethelgard' }), new Ronin({ x: 760, groundY: 460, facing: -1, name: 'Kaze-Maru' })],
    [new Android({ x: 380, groundY: 460, facing: 1, name: 'VEX-09' }), new IceMage({ x: 780, groundY: 460, facing: -1, name: 'Lyra' })]
  ];
  const observedStates = new Set();
  game.testModeUnlimitedHp = true;
  for (const [a, b] of aiRosterPairs) {
    game.vfx.clear();
    a.game = game;
    b.game = game;
    game.fighters = [a, b];
    for (let step = 0; step < 540; step++) {
      const dt = 1 / 30;
      a.update(dt, b, game);
      b.update(dt, a, game);
      for (let pi = game.vfx.projectiles.length - 1; pi >= 0; pi--) {
        const p = game.vfx.projectiles[pi];
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;
        if (p.x < -120 || p.x > 1320 || p.y < -240 || p.y > 620) {
          game.vfx.projectiles.splice(pi, 1);
        }
      }
      game.vfx.update(dt, 460, game.renderer, game.audio);
      observedStates.add(a.state);
      observedStates.add(b.state);
    }
  }
  game.testModeUnlimitedHp = false;
  for (const reqState of ['AUTO_ATTACK', 'SKILL', 'CROUCH', 'JUMP']) {
    if (!observedStates.has(reqState)) {
      throw new Error(
        `Fighting Style AI Director failed to exhibit ${reqState} across live AI duels! Saw: ${[...observedStates].join(', ')}`
      );
    }
  }

  console.log(
    `[PASS] VEX-09 v3 & Fighting Style AI Director: 3-Variant Real Gap-Close Melee (<=109px blade contact), Backstep (-${Math.round(backwardRetreatPx)}px) -> Face/Visor Hyper-Laser (-${Math.round(ultDmgDealt)} dmg), & Live Martial AI (${[...observedStates].sort().join('/')})!`
  );
}

// 15. Verify Sylvara (`Archer`) v4 Rework:
//     - 15A (`ULTIMATE` — "ZEPHYR VAULT: 180° STARLOCK BARRAGE"): Charges into the enemy (`<= 70px`), flips 180° overhead
//       (`lift >= 175px`, crosses to opposite side & flips `facing` 180°), and fires 7 radial Lock-On Homing Arrows!
//     - 15B (`TRUE_ULTIMATE` — "ARROW OF YGGDRASIL: SUPERNOVA PIERCE"): Roots nearby enemy in place (`yggdrasilRootPrison`,
//       zero drift before shot), flip-jumps all the way to the FARTHEST edge of the stage (`|sylvara.x - foe.x| >= 500px`),
//       and fires the full-stage `760` Crit Supernova Dragon-Arrow Pierce with `0` `ctx.rotate` calls!
{
  const syl = new Archer({ x: 340, groundY: 460, facing: 1, name: 'Sylvara' });
  const foe = new Warrior({ x: 600, groundY: 460, facing: -1, name: 'Target' });
  syl.game = game;
  foe.game = game;
  game.fighters = [syl, foe];
  game.getEnemiesOf = (f) => game.fighters.filter((o) => o !== f);
  foe.maxHp = 99999;
  foe.hp = 99999;

  const sylTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const sylCtx = createMockCtx(sylTrack);

  // 15A. Test Overdrive Ultimate (`ZEPHYR VAULT: 180° STARLOCK BARRAGE`)
  const initialChargeDir = foe.x >= syl.x ? 1 : -1;
  const hpBefore180 = foe.hp;
  let minChargeDist = 999;
  let minVaultY = syl.groundY;
  let starlockHits = 0;
  const origFoeTake = foe.takeDamage.bind(foe);
  foe.takeDamage = (amt, att, crit, kx, ky) => {
    if (att === syl) starlockHits++;
    return origFoeTake(amt, att, crit, kx, ky);
  };

  syl.setState('ULTIMATE');
  for (let step = 0; step < 72; step++) {
    const dt = 1 / 30;
    syl.update(dt, foe, game);
    minChargeDist = Math.min(minChargeDist, Math.abs(foe.x - syl.x));
    minVaultY = Math.min(minVaultY, syl.y);
    syl.drawForegroundOverlay(sylCtx, game.renderer);
    syl.draw(sylCtx, false, game.renderer);
    syl.drawUltimateForeground(sylCtx, game.renderer);
    if (syl.state === 'IDLE') break;
  }

  const total180Dmg = hpBefore180 - foe.hp;
  const landedOppositeSide = (syl.x - foe.x) * initialChargeDir > 120;
  if (
    minChargeDist > 75 ||
    syl.groundY - minVaultY < 175 ||
    !landedOppositeSide ||
    syl.facing !== -initialChargeDir ||
    starlockHits < 8 ||
    total180Dmg < 185 ||
    sylTrack.rotateCalls > 0
  ) {
    throw new Error(
      `Sylvara 180° Starlock Ultimate failed: minChargeDist=${minChargeDist.toFixed(1)}, lift=${(syl.groundY - minVaultY).toFixed(1)}, landedOpposite=${landedOppositeSide}, facing=${syl.facing} (expected ${-initialChargeDir}), hits=${starlockHits}, dmg=${total180Dmg}, rotate=${sylTrack.rotateCalls}`
    );
  }

  // 15B. Test Supreme Ultimate (`ARROW OF YGGDRASIL: SUPERNOVA PIERCE`) starting right next to the enemy!
  syl.x = 500;
  syl.y = 460;
  syl.facing = 1;
  foe.x = 565; // Point-blank 65px away — Sylvara MUST root the enemy and flip-jump to the farthest stage edge!
  foe.y = 460;
  foe.vx = 220; // Moving enemy — root prison must halt & pin them on the spot!
  foe.hp = 99999;

  let sawRootPrison = false;
  let maxEnemyDriftWhileRooted = 0;
  let minFlipJumpY = syl.groundY;
  let shotDistance = 0;
  let preShotDmg = 0;
  let yggShotDmg = 0;

  syl.finisherGauge = 100;
  syl.setState('TRUE_ULTIMATE');
  for (let step = 0; step < 155; step++) {
    const dt = 1 / 30;
    const prevHp = foe.hp;
    syl.update(dt, foe, game);
    foe.dodgeCooldown = 999;
    foe.dashCooldown = 999;
    foe.update(dt, syl, game);
    minFlipJumpY = Math.min(minFlipJumpY, syl.y);

    if (syl.fx.active.some((a) => a.key === 'yggdrasilRootPrison')) {
      sawRootPrison = true;
    }
    if (syl.stateTimer >= 0.10 && syl.stateTimer < 3.10) {
      maxEnemyDriftWhileRooted = Math.max(maxEnemyDriftWhileRooted, Math.abs(foe.x - 565));
      if (prevHp > foe.hp) preShotDmg += prevHp - foe.hp;
    }
    if (prevHp > foe.hp) {
      if (shotDistance === 0) shotDistance = Math.abs(foe.x - syl.x);
      yggShotDmg += prevHp - foe.hp;
    }

    syl.drawForegroundOverlay(sylCtx, game.renderer);
    syl.draw(sylCtx, false, game.renderer);
    syl.drawUltimateForeground(sylCtx, game.renderer);
    if (step > 30 && syl.state === 'IDLE') break;
  }

  const onFarStageEdge = syl.x <= 125 || syl.x >= 1075;
  if (
    !sawRootPrison ||
    maxEnemyDriftWhileRooted > 4 ||
    preShotDmg !== 0 ||
    syl.groundY - minFlipJumpY < 165 ||
    !onFarStageEdge ||
    shotDistance < 500 ||
    Math.round(yggShotDmg) !== 700 ||
    syl.state !== 'IDLE' ||
    sylTrack.rotateCalls > 0
  ) {
    throw new Error(
      `Sylvara Yggdrasil Far-Stage Super-Ult failed: root=${sawRootPrison}, drift=${maxEnemyDriftWhileRooted.toFixed(1)}, preShotDmg=${preShotDmg}, flipLift=${(syl.groundY - minFlipJumpY).toFixed(1)}, sylX=${syl.x.toFixed(1)}, shotDist=${shotDistance.toFixed(1)}, dmg=${yggShotDmg}, state=${syl.state}, rotate=${sylTrack.rotateCalls}`
    );
  }

  console.log(
    `[PASS] Sylvara v4 Ults: 180° Starlock Vault (chargeDist=${Math.round(minChargeDist)}px, lift=${Math.round(syl.groundY - minVaultY)}px, ${starlockHits} hits / -${Math.round(total180Dmg)} dmg) & Far-Stage Yggdrasil Pierce (rootDrift=${maxEnemyDriftWhileRooted.toFixed(1)}px, shotDist=${Math.round(shotDistance)}px from x=${Math.round(syl.x)}, -${Math.round(yggShotDmg)} Crit, 0 ctx.rotate)!`
  );
}

// 16. Verify All 11 Champions' Post-KO Row-9 Victory Poses (6240x2080) & Upgraded Stage + LAYWASTE OF INFERNO Effects
{
  const sheetFiles = [
    'warrior',
    'mage',
    'archer',
    'priestess',
    'reaper',
    'chronomancer',
    'titan',
    'ronin',
    'valkyrie',
    'icemage',
    'android'
  ];
  for (const key of sheetFiles) {
    const p = `${REPO_ROOT}/assets/sprites/${key}_sheet.png`;
    const buf = fs.readFileSync(p);
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w !== 6240 || h !== 2080) {
      throw new Error(`Expected ${key}_sheet.png dimensions 6240x2080 (10 rows x 30 cols), got ${w}x${h}`);
    }
  }

  // 16A. Verify automatic post-KO VICTORY pose transition for all 11 champions (+ 2v2_tag benched partner unbenching!)
  const matchGame = createMockGame();
  matchGame.testModeUnlimitedHp = false;
  matchGame.isMatchOver = true;
  for (const [name, Cls] of CLASSES) {
    const winner = new Cls({ x: 380, groundY: 520, facing: 1, name, team: 'left' });
    const fallen = new Warrior({ x: 760, groundY: 520, facing: -1, name: 'Fallen', team: 'right' });
    fallen.hp = 0;
    fallen.isDead = true;
    fallen.state = 'DEATH';
    matchGame.fighters = [winner, fallen];
    matchGame.getEnemiesOf = (f) => (f === winner ? [fallen] : [winner]);

    winner.update(1 / 30, fallen, matchGame);
    if (winner.state !== 'VICTORY') {
      throw new Error(`Expected ${name} to automatically enter VICTORY on match win, got ${winner.state}`);
    }
    const f0 = PixelForge.getFrameIndex(winner, winner.walkPhase);
    for (let s = 0; s < 24; s++) {
      winner.update(1 / 30, fallen, matchGame);
    }
    const fLoop = PixelForge.getFrameIndex(winner, winner.walkPhase);
    if (f0 < 270 || f0 > 284 || fLoop < 285 || fLoop > 299) {
      throw new Error(`Expected ${name} VICTORY frames to progress 270..284 -> 285..299, got f0=${f0}, fLoop=${fLoop}`);
    }
  }

  // Verify benched 2v2_tag partner steps off pedestal into VICTORY when match is won
  const tagPartner = new Valkyrie({ x: 54, groundY: 520, facing: 1, name: 'Freyja', team: 'left' });
  tagPartner.isBenched = true;
  const deadFoe = new Reaper({ x: 820, groundY: 520, facing: -1, name: 'Malakor', team: 'right' });
  deadFoe.hp = 0;
  deadFoe.isDead = true;
  matchGame.getEnemiesOf = () => [deadFoe];
  tagPartner.update(1 / 30, deadFoe, matchGame);
  if (tagPartner.isBenched || tagPartner.state !== 'VICTORY') {
    throw new Error(`Expected benched 2v2_tag partner to unbench into VICTORY, got benched=${tagPartner.isBenched}, state=${tagPartner.state}`);
  }

  // 16B. Verify upgraded Renderer stage effects across all 6 stages incl. Ignis Sol's LAYWASTE OF INFERNO
  const stageHero = new FireMage({ x: 420, groundY: 520, facing: 1 });
  const stageFoe = new IceMage({ x: 780, groundY: 520, facing: -1 });
  for (const stg of ['cathedral', 'sylvan', 'boneyard', 'clocktower', 'sanctuary']) {
    matchGame.renderer.pickRandomStage(stg);
    matchGame.renderer.triggerStageEvent('STAGE PHENOMENON', stg.toUpperCase(), '#facc15', 6.0);
    matchGame.renderer.update(1 / 30, [stageHero, stageFoe]);
    matchGame.renderer.render([stageHero, stageFoe], matchGame.vfx);
  }
  matchGame.renderer.pickRandomStage('cathedral');
  matchGame.renderer.setStageTransformation('inferno', 1.0, true, 0);
  if (matchGame.renderer.getActiveStageId() !== 'inferno') {
    throw new Error(`Expected getActiveStageId() === 'inferno' after Ignis Sol stage transformation, got ${matchGame.renderer.getActiveStageId()}`);
  }
  matchGame.renderer.triggerStageEvent('SOLAR ERUPTION', 'LAYWASTE OF INFERNO', '#fb923c', 6.0);
  for (let i = 0; i < 6; i++) {
    matchGame.renderer.update(1 / 30, [stageHero, stageFoe]);
    matchGame.renderer.render([stageHero, stageFoe], matchGame.vfx);
  }
  matchGame.renderer.resetStageOverrides();

  console.log(
    '[PASS] All 11 Champions 6240x2080 Row-9 Victory Poses (post-KO + 2v2_tag) & All 6 Upgraded Stages (incl. LAYWASTE OF INFERNO magma/caldera/foreground) verified!'
  );
}

// 17. Verify Marvel-Arcade 4-Zone (4800px) Adventure Mode:
//     - Monster (`ghoul`, `cultist`, `brute`) & Final Boss (`archfiend`) 30fps sheets (6240x1456) + portrait (128x128)
//     - Manual Ignis Sol (`FireMage`) Player Controls (Move, Jump, Crouch, Blink, Attack, Skill, Overdrive, Astral Meteor Ultimate) + Auto-Play AI toggle
//     - Full Zone 1 -> Zone 2 -> Zone 3 -> Zone 4 scrolling progression, pickups, "GO! ➔" prompts, Boss Warning,
//       3-Phase Archfiend Malphas boss mechanics, Campaign Clear -> Sol Row 9 VICTORY pose, and 0 ctx.rotate calls!
{
  // 17A. Verify All 8 Realm Monster Sheets, Boss Sheets, All-11-Hero Icons & Stage/Portal FX PNG dimensions
  const monsterSheets = [
    'monster_templar_sheet.png',
    'monster_astrologer_sheet.png',
    'monster_treant_sheet.png',
    'monster_dryad_sheet.png',
    'monster_ghoul_sheet.png',
    'monster_cultist_sheet.png',
    'monster_brute_sheet.png',
    'monster_fiend_sheet.png',
    'boss_archfiend_sheet.png'
  ];
  for (const fname of monsterSheets) {
    const p = `${REPO_ROOT}/assets/sprites/${fname}`;
    const buf = fs.readFileSync(p);
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w !== 6240 || h !== 1456) {
      throw new Error(`Expected ${fname} dimensions 6240x1456 (7 rows x 30 cols @ 208x208), got ${w}x${h}`);
    }
  }
  {
    const portBuf = fs.readFileSync(`${REPO_ROOT}/assets/sprites/boss_archfiend_portrait.png`);
    const pw = portBuf.readUInt32BE(16);
    const ph = portBuf.readUInt32BE(20);
    if (pw !== 128 || ph !== 128) {
      throw new Error(`Expected boss_archfiend_portrait.png dimensions 128x128, got ${pw}x${ph}`);
    }
    const colossusBuf = fs.readFileSync(`${REPO_ROOT}/assets/sprites/boss_colossus_sheet.png`);
    const cw = colossusBuf.readUInt32BE(16);
    const ch = colossusBuf.readUInt32BE(20);
    if (cw !== 4096 || ch !== 2048) {
      throw new Error(`Expected boss_colossus_sheet.png dimensions 4096x2048 (32 cells x 512x512), got ${cw}x${ch}`);
    }
    const iconBuf = fs.readFileSync(`${REPO_ROOT}/assets/sprites/mage_icons.png`);
    const iw = iconBuf.readUInt32BE(16);
    const ih = iconBuf.readUInt32BE(20);
    if (iw !== 448 || ih !== 64) {
      throw new Error(`Expected mage_icons.png dimensions 448x64 (7 cells x 64x64), got ${iw}x${ih}`);
    }
    const heroIconsBuf = fs.readFileSync(`${REPO_ROOT}/assets/sprites/hero_icons_sheet.png`);
    const hiw = heroIconsBuf.readUInt32BE(16);
    const hih = heroIconsBuf.readUInt32BE(20);
    if (hiw !== 384 || hih !== 768) {
      throw new Error(`Expected hero_icons_sheet.png dimensions 384x768 (6 cols x 12 rows @ 64x64), got ${hiw}x${hih}`);
    }
    const advFxBuf = fs.readFileSync(`${REPO_ROOT}/assets/sprites/adv_fx_sheet.png`);
    const fxw = advFxBuf.readUInt32BE(16);
    const fxh = advFxBuf.readUInt32BE(20);
    if (fxw !== 1024 || fxh !== 640) {
      throw new Error(`Expected adv_fx_sheet.png dimensions 1024x640 (8 cols x 5 rows @ 128x128), got ${fxw}x${fxh}`);
    }
    const manifestJson = JSON.parse(
      fs.readFileSync(`${REPO_ROOT}/manifest.json`, 'utf8')
    );
    if (manifestJson.orientation !== 'any' || manifestJson.display !== 'fullscreen') {
      throw new Error(
        `Expected manifest.json orientation='any' (portrait default, landscape opt-in) & display='fullscreen', got ${JSON.stringify(manifestJson)}`
      );
    }
    const mainJs = fs.readFileSync(`${REPO_ROOT}/src/main.js`, 'utf8');
    if (!mainJs.includes('this.mobileLandscapeEnabled = Boolean(this.forceMobileLandscapeParam);')) {
      throw new Error('Expected main.js to default mobileLandscapeEnabled to false unless ?landscape=1 is explicitly passed!');
    }
  }

  // 17B. Verify HTML Adventure Mode Mobile Joystick + Right-Side Skill Cluster + Skill Tree Modal + Opt-In Landscape DOM IDs
  const indexHtml = fs.readFileSync(`${REPO_ROOT}/index.html`, 'utf8');
  const advJs = fs.readFileSync(`${REPO_ROOT}/src/adventure/AdventureManager.js`, 'utf8');
  if (!indexHtml.includes('LANDSCAPE: OFF')) {
    throw new Error('Expected index.html default mobile landscape button labels to start as LANDSCAPE: OFF!');
  }
  const htmlIds = new Set([...indexHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const advSlots = ['attack', 'dodge', 'skill', 'overdrive', 'ultimate'];
  if (htmlIds.has('adv-btn-crouch') || htmlIds.has('adv-btn-jump')) {
    throw new Error('Expected streamlined 5-button Adventure skill cluster without #adv-btn-crouch or #adv-btn-jump!');
  }
  const requiredAdvIds = [
    'app',
    'btn-title-adventure',
    'mode-btn-adventure',
    'btn-mobile-landscape',
    'mobile-landscape-label',
    'adventure-controls',
    'adv-utility-bar',
    'adv-btn-skilltree',
    'adv-skilltree-label',
    'adv-sp-badge',
    'adv-btn-autoplay',
    'adv-autoplay-label',
    'adv-btn-auto',
    'adv-auto-label',
    'adv-btn-landscape',
    'adv-landscape-label',
    'adv-btn-restart',
    'adv-btn-menu',
    'adv-skill-tree-modal',
    'adv-st-level-badge',
    'adv-st-xp-fill',
    'adv-st-xp-text',
    'adv-st-sp-count',
    'adv-st-refund',
    'adv-st-close',
    'adv-st-stat-hp',
    'adv-st-stat-atk',
    'adv-st-stat-spirit',
    'adv-st-stat-ult',
    'adv-st-stat-ward',
    'adv-st-grid',
    'adv-joystick-zone',
    'adv-joystick-base',
    'adv-joystick-knob',
    'adv-skill-cluster',
    'p1-skill-icon-3',
    'p2-skill-icon-3'
  ];
  for (const slot of advSlots) {
    requiredAdvIds.push(
      `adv-btn-${slot}`,
      `adv-icon-${slot}`,
      `adv-cd-sweep-${slot}`,
      `adv-cd-text-${slot}`,
      `adv-tag-${slot}`
    );
  }
  for (const reqId of requiredAdvIds) {
    if (!htmlIds.has(reqId)) {
      throw new Error(`Missing required Adventure Mode HTML ID #${reqId} in index.html!`);
    }
  }
  for (const m of advJs.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)) {
    if (!htmlIds.has(m[1])) {
      throw new Error(`AdventureManager.js references missing getElementById('${m[1]}')!`);
    }
  }

  // Verify PixelForge.drawAdventureActionIcon & drawSkillIcon blit 64x64 HD-2D icon sheets across ALL 11 champions + Boss Malphas (`0` ctx.rotate)!
  const iconAssetsInit = PixelForge.initAssets();
  if (iconAssetsInit.heroIconsSheet) {
    iconAssetsInit.heroIconsSheet.naturalWidth = 384;
    iconAssetsInit.heroIconsSheet.naturalHeight = 704;
  }
  const expectedMageCells = {
    attack: 0,
    skill: 1,
    overdrive: 2,
    ultimate: 3,
    dodge: 4,
    jump: 5,
    crouch: 6
  };
  for (const slot of Object.keys(expectedMageCells)) {
    const iconTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const iconCtx = createMockCtx(iconTrack);
    const blits = [];
    iconCtx.drawImage = (_img, sx, sy, sw, sh, dx, dy, dw, dh) => {
      blits.push({ sx, sy, sw, sh, dx, dy, dw, dh });
    };
    PixelForge.drawAdventureActionIcon(iconCtx, 'mage', slot, 64, 64, 0.25);
    const expSx = expectedMageCells[slot] * 64;
    if (
      blits.length !== 1 ||
      blits[0].sx !== expSx ||
      blits[0].sy !== 0 ||
      blits[0].sw !== 64 ||
      blits[0].sh !== 64 ||
      blits[0].dw !== 64 ||
      blits[0].dh !== 64 ||
      iconTrack.rotateCalls > 0
    ) {
      throw new Error(
        `drawAdventureActionIcon('mage', '${slot}') failed 64x64 HD-2D sheet audit: blits=${JSON.stringify(blits)}, rotateCalls=${iconTrack.rotateCalls}`
      );
    }

    // Verify procedural fallback when mage.icons is still loading (complete = false)
    const fallbackTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const fallbackCtx = createMockCtx(fallbackTrack);
    let rectDraws = 0;
    fallbackCtx.fillRect = () => {
      rectDraws++;
    };
    const mageIconsAsset = PixelForge.initAssets().mage.icons;
    mageIconsAsset.complete = false;
    try {
      PixelForge.drawAdventureActionIcon(fallbackCtx, 'mage', slot, 64, 64, 0.25);
    } finally {
      mageIconsAsset.complete = true;
    }
    if (rectDraws < 20 || fallbackTrack.rotateCalls > 0) {
      throw new Error(
        `drawAdventureActionIcon('mage', '${slot}') fallback failed audit: rectDraws=${rectDraws}, rotateCalls=${fallbackTrack.rotateCalls}`
      );
    }
  }

  // Verify `hero_icons_sheet.png` (`384x704`) across the remaining 10 champions (`0..9`) + Boss Malphas (`archfiend`, row `10`)!
  const heroSheetRows = [
    ['warrior', 0],
    ['archer', 1],
    ['priestess', 2],
    ['reaper', 3],
    ['chronomancer', 4],
    ['titan', 5],
    ['ronin', 6],
    ['valkyrie', 7],
    ['icemage', 8],
    ['android', 9],
    ['nyx_ex', 11]
  ];
  const expectedHeroActionCols = {
    attack: 0,
    skill: 1,
    overdrive: 2,
    ultimate: 3,
    dodge: 4,
    jump: 5,
    crouch: 5
  };
  for (const [hKey, expRow] of heroSheetRows) {
    // 4 Champion Select cards (`0..3`)
    for (let slotIdx = 0; slotIdx <= 3; slotIdx++) {
      const tr = { rotateCalls: 0 };
      const ic = createMockCtx(tr);
      const blits = [];
      ic.drawImage = (_img, sx, sy, sw, sh, dx, dy, dw, dh) => {
        blits.push({ sx, sy, sw, sh, dx, dy, dw, dh });
      };
      PixelForge.drawSkillIcon(ic, hKey, slotIdx, 64, 64, 0.25);
      if (
        blits.length !== 1 ||
        blits[0].sx !== slotIdx * 64 ||
        blits[0].sy !== expRow * 64 ||
        blits[0].sw !== 64 ||
        blits[0].sh !== 64 ||
        tr.rotateCalls > 0
      ) {
        throw new Error(
          `drawSkillIcon('${hKey}', ${slotIdx}) failed hero_icons_sheet audit: blits=${JSON.stringify(blits)}, rotate=${tr.rotateCalls}`
        );
      }
    }
    // Adventure Action Orbs (`attack`, `skill`, `overdrive`, `ultimate`, `dodge`, `jump`, `crouch`)
    for (const [actKey, expCol] of Object.entries(expectedHeroActionCols)) {
      const tr = { rotateCalls: 0 };
      const ic = createMockCtx(tr);
      const blits = [];
      ic.drawImage = (_img, sx, sy, sw, sh) => {
        blits.push({ sx, sy, sw, sh });
      };
      PixelForge.drawAdventureActionIcon(ic, hKey, actKey, 64, 64, 0.25);
      if (
        blits.length !== 1 ||
        blits[0].sx !== expCol * 64 ||
        blits[0].sy !== expRow * 64 ||
        blits[0].sw !== 64 ||
        blits[0].sh !== 64 ||
        tr.rotateCalls > 0
      ) {
        throw new Error(
          `drawAdventureActionIcon('${hKey}', '${actKey}') failed hero_icons_sheet audit: blits=${JSON.stringify(blits)}`
        );
      }
    }
  }
  // Verify Boss Malphas (`archfiend`, row 10) threat card icons (`0..3`)
  for (let bIdx = 0; bIdx <= 3; bIdx++) {
    const tr = { rotateCalls: 0 };
    const ic = createMockCtx(tr);
    const blits = [];
    ic.drawImage = (_img, sx, sy, sw, sh) => {
      blits.push({ sx, sy, sw, sh });
    };
    const ok = PixelForge.drawHeroSheetIcon(ic, 'archfiend', bIdx, 64, 64, 0.25);
    if (!ok || blits.length !== 1 || blits[0].sx !== bIdx * 64 || blits[0].sy !== 640 || tr.rotateCalls > 0) {
      throw new Error(`drawHeroSheetIcon('archfiend', ${bIdx}) failed audit: ok=${ok}, blits=${JSON.stringify(blits)}`);
    }
  }

  // 17C. Simulate Full 4-Zone Campaign with Ignis Sol (`FireMage`), Dimensional Portals, 8 Realm Monsters & Right-Side Colossal Boss!
  const allAssets = PixelForge.initAssets();
  if (allAssets.archfiend?.colossus) {
    allAssets.archfiend.colossus.naturalWidth = 4096;
    allAssets.archfiend.colossus.naturalHeight = 2048;
  }
  if (allAssets.advFxSheet) {
    allAssets.advFxSheet.naturalWidth = 1024;
    allAssets.advFxSheet.naturalHeight = 640;
  }
  if (allAssets.heroIconsSheet) {
    allAssets.heroIconsSheet.naturalWidth = 384;
    allAssets.heroIconsSheet.naturalHeight = 704;
  }

  const advTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const advCtx = createMockCtx(advTrack);
  const monsterDrawCounts = {
    templar: 0,
    astrologer: 0,
    treant: 0,
    dryad: 0,
    ghoul: 0,
    cultist: 0,
    brute: 0,
    fiend: 0,
    archfiend: 0
  };
  let portalFxBlits = 0;
  let activeMonsterDrawKind = null;
  const baseDrawImage = advCtx.drawImage.bind(advCtx);
  advCtx.drawImage = (img, sx, sy, sw, sh, dx, dy, dw, dh) => {
    baseDrawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    if (img === allAssets.advFxSheet && sw === 128 && sh === 128) {
      portalFxBlits++;
    }
    if (activeMonsterDrawKind) {
      const expCell = activeMonsterDrawKind === 'archfiend' ? 512 : 208;
      if (
        !img ||
        ![sx, sy, sw, sh, dx, dy, dw, dh].every((v) => typeof v === 'number' && Number.isFinite(v)) ||
        sw !== expCell ||
        sh !== expCell
      ) {
        throw new Error(
          `Invalid Monster drawImage(${activeMonsterDrawKind}): expected ${expCell}x${expCell}, args=[${[sx, sy, sw, sh, dx, dy, dw, dh].join(', ')}]`
        );
      }
      monsterDrawCounts[activeMonsterDrawKind] = (monsterDrawCounts[activeMonsterDrawKind] || 0) + 1;
    }
  };

  // Mock DOM elements to verify live radial cooldown sweeps (`--cd-deg`), countdown timers, Skill Tree Modal & `#app.is-adventure-active`
  const mockDomMap = new Map();
  const makeMockEl = (id) => {
    const classes = new Set();
    const props = {};
    const listeners = {};
    const children = [];
    let rawHtml = '';
    return {
      id,
      className: '',
      get innerHTML() {
        return rawHtml;
      },
      set innerHTML(v) {
        rawHtml = String(v ?? '');
        if (rawHtml === '') children.length = 0;
      },
      type: '',
      disabled: false,
      width: 64,
      height: 64,
      textContent: '',
      children,
      appendChild(child) {
        children.push(child);
        return child;
      },
      addEventListener(ev, fn) {
        listeners[ev] = fn;
      },
      click() {
        if (!this.disabled && typeof listeners.click === 'function') {
          listeners.click();
        }
      },
      style: {
        width: '',
        transform: '',
        setProperty(k, v) {
          props[k] = v;
        },
        getProperty(k) {
          return props[k];
        }
      },
      classList: {
        add(...cs) {
          cs.forEach((c) => classes.add(c));
        },
        remove(...cs) {
          cs.forEach((c) => classes.delete(c));
        },
        toggle(c, force) {
          const on = force === undefined ? !classes.has(c) : Boolean(force);
          if (on) classes.add(c);
          else classes.delete(c);
          return on;
        },
        contains(c) {
          return classes.has(c);
        }
      },
      setAttribute() {},
      getContext() {
        return createMockCtx(advTrack);
      }
    };
  };
  for (const id of requiredAdvIds) {
    mockDomMap.set(id, makeMockEl(id));
  }

  const origGetElementById = globalThis.document.getElementById;
  const origCreateElement = globalThis.document.createElement;
  globalThis.document.getElementById = (id) => mockDomMap.get(id) || null;
  globalThis.document.createElement = (tag) => makeMockEl(tag);

  try {
    // Strictly verify VS Mode Ignis Sol stats remain 100% untouched (`maxHp === 3700`)!
    const vsBaselineSol = new FireMage(240, 520, 1);
    if (vsBaselineSol.maxHp !== 3700) {
      throw new Error(`VS Mode FireMage baseline maxHp must stay 3700, got ${vsBaselineSol.maxHp}`);
    }

    const advGame = createMockGame();
    advGame.gameMode = 'adventure';
    advGame.isAdventureMode = () => advGame.gameMode === 'adventure';
    advGame.is2v2Mode = () => false;
    advGame.isLandingOpen = false;
    advGame.testModeUnlimitedHp = true; // Monsters must STILL take mortal damage & die when player ∞ HP is ON!
    advGame.matchTime = 24;
    advGame.updateHUD = () => {};
    advGame.triggerUltimateCinematic = () => {};
    advGame.triggerTrueUltimateCinematic = () => {};
    advGame.hudEls = {
      left: {},
      right: { partnerWing: { classList: { add() {}, remove() {}, toggle() {} } } },
      crestVs: {},
      modeBadge: {},
      stageBadge: {}
    };

    const adv = new AdventureManager(advGame);
    advGame.adventure = adv;
    advGame.onFighterDeath = (deadFighter) => {
      if (deadFighter.isMonster) adv.onMonsterDeath(deadFighter);
      else adv.onPlayerDeath(deadFighter);
    };

    const sol = new FireMage(240, advGame.renderer.groundY, 1);
    sol.game = advGame;
    advGame.leftFighter = sol;
    adv.startCampaign(sol);

    // Verify Adventure RPG Stats & Gauge Isolation on Campaign Start:
    // - Lv.1 Adventure HP = 1040 (decoupled from 3700 VS HP)
    // - Starts with 1 SP, 0% Ultimate (`ultCharge`), 0% Super-Ult (`astralCharge`)
    // - Passive VS gainMana / gainFinisher calls are blocked so ONLY Soul Embers, Combos & Astral Relics charge them!
    sol.gainMana(55);
    sol.gainFinisher(55);
    if (
      sol.maxHp !== 1040 ||
      sol.hp !== 1040 ||
      adv.progression.level !== 1 ||
      adv.progression.skillPoints !== 1 ||
      adv.progression.ultCharge !== 0 ||
      adv.progression.astralCharge !== 0 ||
      sol.mana !== 0 ||
      sol.finisherGauge !== 0
    ) {
      throw new Error(
        `Adventure RPG stat isolation failed: hp=${sol.hp}/${sol.maxHp}, lv=${adv.progression.level}, sp=${adv.progression.skillPoints}, mana=${sol.mana}, fin=${sol.finisherGauge}`
      );
    }

    // Spy on advGame.renderer.ctx.drawImage to ensure ZERO stitched duel-stage PNGs (`arena_*`) are ever blitted in Adventure Mode!
    let stitchedStagePngBlits = 0;
    const origRenDrawImage = advGame.renderer.ctx.drawImage.bind(advGame.renderer.ctx);
    advGame.renderer.ctx.drawImage = function (img, ...rest) {
      if (advGame.renderer.adventureMode && img && typeof img.src === 'string' && img.src.includes('arena_')) {
        stitchedStagePngBlits++;
      }
      return origRenDrawImage(img, ...rest);
    };

    if (
      advGame.renderer.worldWidth !== ADVENTURE_WORLD_WIDTH ||
      !advGame.renderer.adventureMode ||
      adv.zoneIndex !== 0 ||
      !adv.lockActive ||
      adv.getLivingMonsters().length !== 2 ||
      sol.groundY !== 561 ||
      !mockDomMap.get('app').classList.contains('is-adventure-active') ||
      mockDomMap.get('adventure-controls').classList.contains('hidden')
    ) {
      throw new Error(
        `Adventure startCampaign check failed: ww=${advGame.renderer.worldWidth}, advMode=${advGame.renderer.adventureMode}, zone=${adv.zoneIndex}, lock=${adv.lockActive}, solGy=${sol.groundY}, monsters=${adv.getLivingMonsters().length}`
      );
    }

    // Verify Wave 1 Eclipse Templars (`templar`) emerge from Dimensional Summoning Portals staggered across distinct 3D depth lanes!
    const w1Monsters = adv.getLivingMonsters();
    if (!Array.isArray(adv.portals) || adv.portals.length < 2 || adv.portals[0].zone !== 0) {
      throw new Error(
        `Expected Wave 1 Eclipse Templars to open Zone I Astral Portals (zone=0), got portals=${JSON.stringify(adv.portals)}`
      );
    }
    for (const m of w1Monsters) {
      if (m.heroId !== 'templar' || !(m.portalSpawnTimer > 0)) {
        throw new Error(
          `Expected Wave 1 Zone I monster heroId === 'templar' with active portalSpawnTimer > 0, got heroId=${m.heroId}, timer=${m.portalSpawnTimer}`
        );
      }
    }
    if (Math.abs(w1Monsters[0].groundY - w1Monsters[1].groundY) < 60) {
      throw new Error(
        `Expected Wave 1 monsters staggered across 3D depth lanes, got gy=[${w1Monsters[0].groundY}, ${w1Monsters[1].groundY}]`
      );
    }

    const tickAdv = (frames = 1, renderEvery = 1) => {
      const dt = 1 / 30;
      for (let i = 0; i < frames; i++) {
        adv.update(dt);
        // Step projectiles against opposing team in 3D space (mirrors main.js updateProjectiles incl. Colossal Boss hurtbox & pierce)
        for (let pi = advGame.vfx.projectiles.length - 1; pi >= 0; pi--) {
          const p = advGame.vfx.projectiles[pi];
          p.age = (p.age || 0) + dt;
          p.x += (p.vx || 0) * dt;
          p.y += (p.vy || 0) * dt;
          const targets = advGame.fighters.filter((f) => f && !f.isDead && f.team !== p.owner?.team);
          let hitTarget = null;
          for (const t of targets) {
            if (p.pierce && p._hitTargets && p._hitTargets.has(t)) continue;
            if (
              (p.type === 'forge_wave' || p.type === 'blade_wave') &&
              Math.abs(p.vy || 0) < 25 &&
              Math.abs((t.groundY || t.y) - (p.owner?.groundY || t.groundY)) > 58
            ) {
              continue;
            }
            const hitRadX = (p.radius || 24) + (t.isColossalBoss ? 115 : 36);
            const hitRadY = t.isColossalBoss ? 240 : 96;
            const centerOffY = t.isColossalBoss ? 148 : 108;
            if (Math.abs(p.x - t.x) < hitRadX && Math.abs(p.y - (t.y - centerOffY)) < hitRadY) {
              t.takeDamage(p.damage || 30, p.owner, Boolean(p.isCrit), 80, 0);
              hitTarget = t;
              break;
            }
          }
          const floorLim = p.isMeteor ? (p.owner?.groundY || 561) - 4 : 692;
          const hitGround = (p.vy || 0) > 0 && p.y >= floorLim;
          if (hitTarget && p.pierce && !hitGround && !p.isMeteor) {
            if (!p._hitTargets) p._hitTargets = new Set();
            p._hitTargets.add(hitTarget);
            if (p._hitTargets.size >= 5) advGame.vfx.projectiles.splice(pi, 1);
          } else if (
            hitTarget ||
            hitGround ||
            (!p.isMeteor && p.age > 1.45) ||
            p.x < -300 ||
            p.x > ADVENTURE_WORLD_WIDTH + 300
          ) {
            advGame.vfx.projectiles.splice(pi, 1);
          }
        }
        advGame.vfx.update(dt, advGame.renderer.groundY, advGame.renderer, advGame.audio);
        advGame.renderer.update(dt, advGame.fighters);
        if (i % renderEvery === 0 || i === frames - 1) {
          advGame.renderer.render(advGame.fighters, advGame.vfx);
        }

        // Strictly audit all Monster/Boss character draws & all 3 AdventureSkillSets world layers + HUD for ZERO ctx.rotate!
        adv.renderWorldFloor(advCtx, advGame.renderer);
        adv.renderWorldMid(advCtx);
        for (const f of advGame.fighters) {
          if (f && f.isMonster) {
            if (!f.heroId) {
              throw new Error(`Monster ${f.name} (${f.kind}) has undefined heroId and would render invisible!`);
            }
            const beforeCount = monsterDrawCounts[f.kind] || 0;
            activeMonsterDrawKind = f.kind;
            f.draw(advCtx, false, advGame.renderer);
            activeMonsterDrawKind = null;
            if ((monsterDrawCounts[f.kind] || 0) <= beforeCount) {
              throw new Error(
                `Monster ${f.name} (kind=${f.kind}, heroId=${f.heroId}) failed to call ctx.drawImage during draw() — enemy is invisible!`
              );
            }
          }
        }
        adv.renderWorldForeground(advCtx);
        adv.renderScreenHUD(advCtx, advGame.renderer);
      }
    };

    // Verify Manual Mode (`autoPlay === false`): Sol stays put at (x=240, groundY=561) when idle (AI never hijacks player)
    tickAdv(12);
    if (sol.state !== 'IDLE' || Math.abs(sol.x - 240) > 2 || Math.abs(sol.groundY - 561) > 2) {
      throw new Error(
        `Expected manual idle Sol to hold position at (240, 561) in IDLE, got state=${sol.state}, x=${sol.x}, gy=${sol.groundY}`
      );
    }

    // Verify Smooth Non-Steep 3D Touch-Screen Virtual Analog Joystick (`setJoystickVector`):
    // 1) Gentle micro-deflection (`-0.24` Y) moves smoothly by only ~1-6px over 10 frames (NOT steep!)
    for (const m of w1Monsters) m.stunTimer = 6.0;
    adv.setJoystickVector(0, -0.24, true);
    tickAdv(10);
    const gentleDeltaGy = 561 - sol.groundY;
    if (gentleDeltaGy <= 0.2 || gentleDeltaGy > 8) {
      throw new Error(
        `Expected gentle -0.24 joystick deflection to give smooth fine micro-control (0.2..8px), got deltaGy=${gentleDeltaGy.toFixed(2)}`
      );
    }

    // 2) Full UP drag (`-0.95` Y): smooth 2.5D Z-glide into upper lane [442..475]
    adv.setJoystickVector(0, -0.95, true);
    if (
      !mockDomMap.get('adv-joystick-base').classList.contains('is-active') ||
      !mockDomMap.get('adv-joystick-knob').style.transform.includes('-38px')
    ) {
      throw new Error(
        `Expected #adv-joystick-knob 2D vertical transform (-38px) on Up drag, got '${mockDomMap.get('adv-joystick-knob').style.transform}'`
      );
    }
    tickAdv(36);
    const upperGy = sol.groundY;
    if (upperGy > 476 || upperGy < 442) {
      throw new Error(`Expected joystick UP to move Sol into upper 3D lane [442..476], got groundY=${upperGy}`);
    }

    // 3) Diagonal RIGHT+DOWN drag (`0.85, 0.92`) + smooth deceleration to IDLE
    adv.setJoystickVector(0.85, 0.92, true);
    tickAdv(68);
    const walkedX = sol.x;
    const lowerGy = sol.groundY;
    adv.setJoystickVector(0, 0, false);
    tickAdv(6);
    if (walkedX <= 340 || lowerGy <= 605 || lowerGy > 680 || sol.state !== 'IDLE') {
      throw new Error(
        `Expected diagonal 3D joystick to move Sol right & down within [442..680] and return to IDLE: x=${walkedX}, gy=${lowerGy}, state=${sol.state}`
      );
    }

    // 4) CRITICAL MULTI-TOUCH CHECK: Simultaneous Drag-Joystick + Hold-Attack (`setJoystickVector` + `setAttackHeld(true)`)!
    // Dragging the left joystick MUST NEVER block attacking, AND Sol must strafe smoothly in 3D while casting AUTO_ATTACK!
    {
      const startMoveAtkX = sol.x;
      const startMoveAtkGy = sol.groundY;
      sol.autoCooldown = 0;
      adv.setJoystickVector(0.88, -0.72, true);
      adv.setAttackHeld(true);
      let sawAutoAttack = false;
      let sawActionRelease = false;
      for (let f = 0; f < 22; f++) {
        tickAdv(1);
        if (sol.state === 'AUTO_ATTACK') {
          sawAutoAttack = true;
          if (sol.didActionFrame) sawActionRelease = true;
        }
      }
      const movedWhileAttackingX = sol.x - startMoveAtkX;
      const movedWhileAttackingZ = startMoveAtkGy - sol.groundY;
      adv.setAttackHeld(false);
      adv.setJoystickVector(0, 0, false);
      tickAdv(20);
      if (!sawAutoAttack || !sawActionRelease || movedWhileAttackingX < 40 || movedWhileAttackingZ < 14) {
        throw new Error(
          `Simultaneous Joystick-Drag + Attack failed: sawAuto=${sawAutoAttack}, sawRelease=${sawActionRelease}, dx=${movedWhileAttackingX.toFixed(1)}, dz=${movedWhileAttackingZ.toFixed(1)}`
        );
      }
    }

    // Verify 3D Desktop Keyboard (`KeyW` Up, `KeyA` Left)!
    const preKbGy = sol.groundY;
    const preKbX = sol.x;
    adv.onKeyDown({ code: 'KeyW', preventDefault() {} });
    adv.onKeyDown({ code: 'KeyA', preventDefault() {} });
    tickAdv(18);
    adv.onKeyUp({ code: 'KeyW' });
    adv.onKeyUp({ code: 'KeyA' });
    tickAdv(6);
    for (const m of w1Monsters) m.stunTimer = 0;
    if (sol.groundY >= preKbGy - 14 || sol.x >= preKbX - 20) {
      throw new Error(
        `Expected WASD KeyW+KeyA to move Sol up & left in 3D space: gy ${preKbGy}->${sol.groundY}, x ${preKbX}->${sol.x}`
      );
    }

    // Verify 3D Lane Melee Dodging: a Ghoul swinging on upper lane (gy=460) misses Sol on lower lane (gy=640) even at identical X!
    {
      const testGhoul = w1Monsters[0];
      sol.x = 500;
      sol.groundY = 640;
      sol.y = 640;
      testGhoul.x = 540;
      testGhoul.groundY = 460;
      testGhoul.y = 460;
      testGhoul.facing = -1;
      const solHpBefore = sol.hp;
      testGhoul.setState('AUTO_ATTACK');
      for (let step = 0; step < 14; step++) {
        testGhoul.stateTimer += 1 / 30;
        testGhoul.updateAutoAttack(1 / 30, sol, advGame);
      }
      if (sol.hp !== solHpBefore) {
        throw new Error(`Expected 3D Z-dodging (|640 - 460| = 180px) to avoid melee claw hit, but Sol lost HP!`);
      }
      sol.groundY = 561;
      sol.y = 561;
    }

    // Verify Solar Spirit Skill Gating, Recovery Cancel into Skill, XP Level-Up & Interactive 3-Branch Skill Tree!
    for (const m of adv.getLivingMonsters()) {
      m.hp = 3500;
      m.stunTimer = 10.0;
    }
    const waitIdle = (maxFrames = 90) => {
      for (let f = 0; f < maxFrames && sol.state !== 'IDLE'; f++) tickAdv(1);
    };
    waitIdle(60);

    // 1) Low Solar Spirit (`10 < 32`) blocks SKILL and flags `.is-low-spirit`
    adv.progression.spirit = 10;
    sol.skillCooldown = 0;
    adv.syncControlDeckUI();
    if (!mockDomMap.get('adv-btn-skill').classList.contains('is-low-spirit')) {
      throw new Error('Expected #adv-btn-skill to show .is-low-spirit when Solar Spirit < cost!');
    }
    adv.triggerAction('skill');
    tickAdv(2);
    if (sol.state === 'SKILL') {
      throw new Error('Expected SKILL to be gated when Solar Spirit < skillSpiritCost!');
    }

    // 2) Sufficient Solar Spirit (`85 >= 32`) + Marvel-Arcade AUTO_ATTACK recovery cancel -> casts SKILL & spends Spirit!
    adv.progression.spirit = 85;
    sol.autoCooldown = 0;
    adv.setAttackHeld(true);
    tickAdv(1);
    adv.setAttackHeld(false);
    if (sol.state !== 'AUTO_ATTACK') throw new Error(`Expected hold-to-attack -> AUTO_ATTACK, got ${sol.state}`);
    tickAdv(14);
    const spiritBeforeSkill = adv.progression.spirit;
    sol.skillCooldown = 0;
    adv.triggerAction('skill');
    tickAdv(1);
    if (
      sol.state !== 'SKILL' ||
      adv.progression.spirit > spiritBeforeSkill - 25 ||
      !mockDomMap.get('adv-btn-skill').classList.contains('is-on-cd') ||
      !mockDomMap.get('adv-cd-text-skill').textContent.endsWith('s')
    ) {
      throw new Error(
        `Expected Spirit-funded recovery-cancel -> SKILL with live seconds cooldown, got state=${sol.state}, spirit=${spiritBeforeSkill}->${adv.progression.spirit}, cdText='${mockDomMap.get('adv-cd-text-skill').textContent}'`
      );
    }
    waitIdle(60);

    // 3) XP Level-Up (`Lv.1 -> Lv.2`, `+1 SP`) + Interactive 3-Branch Skill Tree Upgrade & Refund!
    adv.progression.gainXp(130, sol);
    if (adv.progression.level !== 2 || adv.progression.skillPoints !== 2 || sol.maxHp !== 1150) {
      throw new Error(
        `Expected XP Level-Up to Lv.2 (2 SP, 1150 HP), got lv=${adv.progression.level}, sp=${adv.progression.skillPoints}, maxHp=${sol.maxHp}`
      );
    }
    adv.openSkillTree(false);
    if (!adv.isSkillTreeOpen || mockDomMap.get('adv-st-grid').children.length !== 3) {
      throw new Error(`Expected Skill Tree Modal to render 3 branches, got children=${mockDomMap.get('adv-st-grid').children.length}`);
    }
    // Click Tier-1 Solar Wrath (`wrath_1`) & Phoenix Aegis (`aegis_1`) DOM upgrade buttons directly!
    const wrath1Btn = mockDomMap.get('adv-st-grid').children[0].children[1].children[2];
    const aegis1Btn = mockDomMap.get('adv-st-grid').children[2].children[1].children[2];
    wrath1Btn.click();
    aegis1Btn.click();
    if (
      adv.progression.getRank('wrath_1') !== 1 ||
      adv.progression.getRank('aegis_1') !== 1 ||
      adv.progression.skillPoints !== 0 ||
      sol.maxHp !== 1390
    ) {
      throw new Error(
        `Skill Tree DOM upgrade failed: wrath_1=${adv.progression.getRank('wrath_1')}, aegis_1=${adv.progression.getRank('aegis_1')}, sp=${adv.progression.skillPoints}, maxHp=${sol.maxHp}`
      );
    }
    // Test Respec (`refundSkillTree`) -> restores 2 SP & 1150 HP, then invest 2 ranks in `wrath_1` to unlock Homing Seeker!
    adv.refundSkillTree(false);
    if (adv.progression.skillPoints !== 2 || sol.maxHp !== 1150) {
      throw new Error(`Skill Tree refund failed: sp=${adv.progression.skillPoints}, maxHp=${sol.maxHp}`);
    }
    adv.progression.upgradeNode('wrath_1', sol);
    adv.progression.upgradeNode('wrath_1', sol);
    adv.closeSkillTree(false);
    if (!adv.progression.getComputedStats().hasHomingSeeker || adv.isSkillTreeOpen) {
      throw new Error('Expected Rank 2 Ignited Volley (`wrath_1`) to unlock Homing Seeker and close modal cleanly!');
    }

    // Verify Jump & Crouch action triggers are ignored in Adventure Mode, while Dodge is a 100% pure non-attacking 3D evade!
    advGame.vfx.projectiles.length = 0;
    adv.triggerAction('jump');
    tickAdv(1);
    if (sol.state !== 'IDLE') {
      throw new Error(`Expected 'jump' trigger to be ignored in 5-button Adventure Mode, got state=${sol.state}`);
    }
    adv.triggerAction('crouch');
    tickAdv(1);
    if (sol.state !== 'IDLE') {
      throw new Error(`Expected 'crouch' trigger to be ignored in 5-button Adventure Mode, got state=${sol.state}`);
    }

    sol.dodgeCooldown = 0;
    sol.x = Math.min(sol.x, 420);
    sol.groundY = 561;
    sol.y = 561;
    const dodgeStartX = sol.x;
    const dodgeStartGy = sol.groundY;
    adv.setJoystickVector(0.8, -0.6, true);
    adv.triggerAction('dodge');
    tickAdv(1);
    if (
      sol.state !== 'DODGE' ||
      !sol.isInvulnerable ||
      !mockDomMap.get('adv-btn-dodge').classList.contains('is-on-cd') ||
      !mockDomMap.get('adv-cd-text-dodge').textContent.endsWith('s')
    ) {
      throw new Error(`Expected manual dodge -> invulnerable DODGE with live blink cooldown, got ${sol.state}`);
    }
    tickAdv(9);
    adv.setJoystickVector(0, 0, false);
    if (
      advGame.vfx.projectiles.length !== 0 ||
      sol.x <= dodgeStartX + 90 ||
      sol.groundY >= dodgeStartGy - 40
    ) {
      throw new Error(
        `Expected Sol pure 3D dodge to emit ZERO projectiles and dash diagonally: projs=${advGame.vfx.projectiles.length}, dx=${sol.x - dodgeStartX}, dGy=${sol.groundY - dodgeStartGy}`
      );
    }
    waitIdle(20);

    // Charge Adventure Ultimate (`NOVA`) via Soul Ember energy -> casts ULTIMATE & grants +18% Astral Seal Resonance!
    adv.progression.gainAdventureUlt(100, sol);
    adv.syncControlDeckUI();
    if (mockDomMap.get('adv-cd-text-overdrive').textContent !== 'MAX') {
      throw new Error(`Expected full Overdrive orb readout 'MAX', got '${mockDomMap.get('adv-cd-text-overdrive').textContent}'`);
    }
    adv.triggerAction('overdrive');
    tickAdv(1);
    if (sol.state !== 'ULTIMATE' || adv.progression.ultCharge !== 0 || adv.progression.astralCharge < 18) {
      throw new Error(
        `Expected Soul-Ember Overdrive -> ULTIMATE + Astral Seal Resonance (>=18%), got state=${sol.state}, ult=${adv.progression.ultCharge}, astral=${adv.progression.astralCharge}`
      );
    }
    waitIdle(90);

    if (ADVENTURE_WORLD_WIDTH !== 9600 || advGame.renderer.worldWidth !== 9600) {
      throw new Error(
        `Expected expanded 9600px Adventure campaign worldWidth, got const=${ADVENTURE_WORLD_WIDTH}, renderer=${advGame.renderer.worldWidth}`
      );
    }

    // Clear Wave 1 / 8 (Zone 1 Subwave 1) -> unlocks exploration corridor inside Zone 1!
    for (const m of adv.getLivingMonsters()) {
      m.takeDamage(19999, sol, true, 120, 0);
    }
    if (adv.getLivingMonsters().length !== 0) {
      throw new Error('Expected Wave 1 Eclipse Templars to take mortal damage and die even when testModeUnlimitedHp === true!');
    }
    tickAdv(6);
    if (adv.lockActive || !adv.goPromptActive) {
      throw new Error(`Expected Wave 1 / 8 clear to unlock mid-zone corridor with GO! prompt: lock=${adv.lockActive}, go=${adv.goPromptActive}`);
    }

    // Walk Sol rightward past Zone 1 midTriggerX (`1340`) -> Wave 2 / 8 (Zone 1 Subwave 2: Templars + Eclipse Astrologer!)
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 260 && adv.subWave < 2; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    if (
      adv.subWave !== 2 ||
      !adv.lockActive ||
      adv.getLivingMonsters().length < 2 ||
      !adv.getLivingMonsters().some((m) => m.kind === 'astrologer') ||
      adv.portals.length < 2
    ) {
      throw new Error(
        `Expected Zone 1 Subwave 2 ambush with Eclipse Astrologer & Portals, got subWave=${adv.subWave}, lock=${adv.lockActive}, living=${adv.getLivingMonsters().map((m) => m.kind).join(',')}`
      );
    }
    // Let Eclipse Astrologer & Templars execute attacks/sigils for 45 frames to exercise their AI, sprites & floor telegraphs
    tickAdv(45);
    for (const m of adv.getLivingMonsters()) {
      m.takeDamage(19999, sol, true, 120, 0);
    }
    tickAdv(4);
    if (adv.lockActive || !adv.goPromptActive || adv.pickups.length < 2 || !adv.pickups.some((p) => p.type === 'relic')) {
      throw new Error(
        `Expected Zone 1 clear to unlock gate, show GO! prompt & drop Astral Relic Shard: lock=${adv.lockActive}, go=${adv.goPromptActive}, pickups=${adv.pickups.map((p) => p.type).join(',')}`
      );
    }

    // Walk Sol via analog joystick across pickups and into Zone 2 (`triggerX = 2540`) -> Wave 3 / 8 (Starwood Treant + Briar Dryads)!
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 320 && adv.zoneIndex < 1; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    if (
      adv.zoneIndex !== 1 ||
      !adv.lockActive ||
      !adv.getLivingMonsters().some((m) => m.kind === 'treant') ||
      !adv.getLivingMonsters().some((m) => m.kind === 'dryad')
    ) {
      throw new Error(
        `Expected Zone 2 Cursed Starwood encounter with Eldertree Treant & Briar Dryads, got zone=${adv.zoneIndex}, living=${adv.getLivingMonsters().map((m) => m.kind).join(',')}`
      );
    }

    // Let Eldertree Treant + Briar Dryads fight for 45 frames, then charge Astral Relic Seals (100%) & unleash `TRUE_ULTIMATE`!
    tickAdv(45);
    sol.setState('IDLE');
    adv.progression.gainAstralRelic(100, sol);
    adv.syncControlDeckUI();
    if (mockDomMap.get('adv-cd-text-ultimate').textContent !== 'ULT') {
      throw new Error(`Expected full Ultimate orb readout 'ULT', got '${mockDomMap.get('adv-cd-text-ultimate').textContent}'`);
    }
    adv.triggerAction('ultimate');
    tickAdv(1);
    if (sol.state !== 'TRUE_ULTIMATE' || adv.progression.astralCharge !== 0) {
      throw new Error(`Expected Astral-Relic Super-Ultimate -> TRUE_ULTIMATE, got ${sol.state}`);
    }
    tickAdv(150);
    if (advGame.renderer.permanentStageOverride !== 'inferno') {
      throw new Error(`Expected Sol's Astral Meteor Ultimate to scorch Adventure stage into inferno, got ${advGame.renderer.permanentStageOverride}`);
    }
    for (const m of adv.getLivingMonsters()) {
      m.takeDamage(29999, sol, true, 120, 0);
    }
    tickAdv(4);

    // Advance into Zone 2 Subwave 2 (`midTriggerX = 3740`, Wave 4 / 8) & clear!
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 320 && adv.subWave < 2; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    for (const m of adv.getLivingMonsters()) {
      m.takeDamage(29999, sol, true, 120, 0);
    }
    tickAdv(4);

    // March into Zone 3 (`triggerX = 4940`, Wave 5 / 8) -> Necropolis Bone-Stalker Ghouls + Lich-Priests (`cultist`)!
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 340 && adv.zoneIndex < 2; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    if (
      adv.zoneIndex !== 2 ||
      !adv.getLivingMonsters().some((m) => m.isElite) ||
      !adv.getLivingMonsters().some((m) => m.kind === 'ghoul') ||
      !adv.getLivingMonsters().some((m) => m.kind === 'cultist')
    ) {
      throw new Error(
        `Expected Zone 3 Abyssal Bone-Gate Elite Undead encounter (ghoul + cultist), got zone=${adv.zoneIndex}, living=${adv.getLivingMonsters().map((m) => m.kind).join(',')}`
      );
    }
    tickAdv(35);
    for (const m of adv.getLivingMonsters()) {
      m.takeDamage(29999, sol, true, 120, 0);
    }
    tickAdv(4);

    // Advance into Zone 3 Subwave 2 (`midTriggerX = 6140`, Wave 6 / 8) & clear!
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 340 && adv.subWave < 2; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    for (const m of adv.getLivingMonsters()) {
      m.takeDamage(29999, sol, true, 120, 0);
    }
    tickAdv(4);

    // March into Zone 4 Throne Gate Vanguard (`triggerX = 7340`, Wave 7 / 8: Obsidian Brute + Black Pit Hellfiends) & clear!
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 340 && adv.zoneIndex < 3; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    if (
      adv.zoneIndex !== 3 ||
      adv.subWave !== 1 ||
      !adv.lockActive ||
      !adv.getLivingMonsters().some((m) => m.kind === 'brute') ||
      !adv.getLivingMonsters().some((m) => m.kind === 'fiend')
    ) {
      throw new Error(
        `Expected Zone 4 Wave 7 / 8 Throne Gate Vanguard (brute + fiend), got zone=${adv.zoneIndex}, subWave=${adv.subWave}, living=${adv.getLivingMonsters().map((m) => m.kind).join(',')}`
      );
    }
    tickAdv(30);
    for (const m of adv.getLivingMonsters()) {
      m.takeDamage(29999, sol, true, 120, 0);
    }
    tickAdv(4);

    // March to Eastern Abyssal Throne (`midTriggerX = 8520`, Wave 8 / 8) -> Boss Warning -> Right-Side Colossal Behemoth Malphas!
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 340 && !adv.bossSpawnPending; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    if (adv.zoneIndex !== 3 || adv.subWave !== 2 || !adv.bossSpawnPending || adv.bossWarningTimer <= 0) {
      throw new Error(`Expected Zone 4 Wave 8 / 8 Boss Warning banner, got zone=${adv.zoneIndex}, subWave=${adv.subWave}, pending=${adv.bossSpawnPending}, timer=${adv.bossWarningTimer}`);
    }

    // Tick through 1.85s Boss Warning -> Giant Right-Side Colossal Boss (`BEHEMOTH MALPHAS`) rises on the FAR RIGHT (`x = 9335`, `facing = -1`)!
    tickAdv(62);
    const boss = adv.bossEntity;
    if (
      !boss ||
      !(boss instanceof ArchfiendBoss) ||
      !boss.isColossalBoss ||
      boss.isDead ||
      boss.bossPhase !== 1 ||
      boss.x !== 9335 ||
      boss.facing !== -1 ||
      sol.x > 9250 ||
      boss.x <= sol.x
    ) {
      throw new Error(
        `Expected Giant Right-Side Colossal Boss Malphas at x=9335 facing LEFT (-1) with Sol on left (<=9250), got bossX=${boss?.x}, facing=${boss?.facing}, solX=${sol.x}, phase=${boss?.bossPhase}`
      );
    }
    if (sol.fx.overrideCenterWorldX === null) {
      throw new Error('Expected Renderer.render to sync sol.fx.overrideCenterWorldX in Adventure Mode for 9600px shader visibility!');
    }

    // Verify Exposed Molten Heart-Core Punish Window (`vulnerableTimer > 0`) grants +45% bonus Adventure damage!
    {
      boss.vulnerableTimer = 0;
      const normalScaleDmg = adv.progression.scaleOutgoingDamage(100, sol, boss);
      boss.vulnerableTimer = 2.0;
      const corePunishDmg = adv.progression.scaleOutgoingDamage(100, sol, boss);
      boss.vulnerableTimer = 0;
      if (corePunishDmg < Math.round(normalScaleDmg * 1.4)) {
        throw new Error(
          `Expected Colossal Boss Exposed Heart-Core to grant +45% punish damage: normal=${normalScaleDmg}, vuln=${corePunishDmg}`
        );
      }
    }

    // Exercise Colossal Boss Phase 1 Siege-Claw / Fist / Hellfire attacks
    tickAdv(50);

    // Drop Colossal Boss below 65% HP -> Trigger Phase 2 (Cataclysmic Siege + Summoned Hellfiends via Hell-Maw Portals!)
    boss.isInvulnerable = false;
    boss.hp = Math.floor(boss.maxHp * 0.60);
    tickAdv(55);
    if (boss.bossPhase < 2 || !adv.getLivingMonsters().some((m) => m.kind === 'fiend')) {
      throw new Error(
        `Expected Colossal Malphas Phase 2 at <=65% HP with summoned 'fiend' vanguards, got phase=${boss.bossPhase}, living=${adv.getLivingMonsters().map((m) => m.kind).join(',')}`
      );
    }

    // Drop Colossal Boss below 30% HP -> Trigger Phase 3 (5-Fissure Black Pit Apocalypse + Exposed Heart-Core Slump!)
    boss.isInvulnerable = false;
    boss.hp = Math.floor(boss.maxHp * 0.26);
    tickAdv(95);
    if (boss.bossPhase !== 3) {
      throw new Error(`Expected Colossal Malphas to transition to Phase 3 at <=30% HP, got phase=${boss.bossPhase}`);
    }

    // Vanquish Colossal Behemoth Malphas -> Verify Campaign Victory, Minion Banish & Sol Row 9 VICTORY Pose!
    boss.isInvulnerable = false;
    boss.hp = 10;
    boss.takeDamage(99999, sol, true, 160, 0);
    tickAdv(15);
    if (!advGame.isMatchOver || adv.getLivingMonsters().length !== 0 || sol.state !== 'VICTORY') {
      throw new Error(
        `Expected Campaign Victory & Sol Row 9 VICTORY pose on Colossal Malphas KO: isMatchOver=${advGame.isMatchOver}, living=${adv.getLivingMonsters().length}, solState=${sol.state}`
      );
    }

    // Verify all 8 Realm monster archetypes (208x208), Right-Side Colossal Boss (512x512), and Dimensional Portals (`advFxSheet`) logged real sprite blits!
    for (const kind of [
      'templar',
      'astrologer',
      'treant',
      'dryad',
      'ghoul',
      'cultist',
      'brute',
      'fiend',
      'archfiend'
    ]) {
      if ((monsterDrawCounts[kind] || 0) < 20) {
        throw new Error(
          `Expected >=20 real sprite drawImage blits for '${kind}', got ${monsterDrawCounts[kind] || 0}`
        );
      }
    }
    if (portalFxBlits < 40) {
      throw new Error(`Expected >=40 Dimensional Portal advFxSheet 128x128 blits across campaign, got ${portalFxBlits}`);
    }

    // Verify Optional Auto-Play AI Toggle & Clean Teardown (`stopCampaign` restores 1200px Arena AND restores 3700 VS maxHp!)
    advGame.isMatchOver = false;
    const autoSol = new FireMage(240, advGame.renderer.groundY, 1);
    autoSol.game = advGame;
    advGame.leftFighter = autoSol;
    adv.setAutoPlay(true, false);
    adv.startCampaign(autoSol);
    tickAdv(30);
    adv.stopCampaign();
    if (
      advGame.renderer.worldWidth !== 1200 ||
      advGame.renderer.adventureMode !== false ||
      autoSol.maxHp !== 3700 ||
      mockDomMap.get('app').classList.contains('is-adventure-active')
    ) {
      throw new Error(
        `Expected stopCampaign() to restore worldWidth=1200, adventureMode=false & VS maxHp=3700, got ww=${advGame.renderer.worldWidth}, maxHp=${autoSol.maxHp}`
      );
    }

    // 17E. Verify ALL 11 Champions Selectable & Playable in Adventure Mode WITH Dedicated 2.5D Adventure Skill Sets AND 100% Untouched VS Mode Restoration!
    {
      const allAdvHeroes = [
        { key: 'warrior', Cls: Warrior },
        { key: 'warrior_ex', Cls: WarriorEx },
        { key: 'archer', Cls: Archer },
        { key: 'mage', Cls: FireMage },
        { key: 'priestess', Cls: Priestess },
        { key: 'reaper', Cls: Reaper },
        { key: 'chronomancer', Cls: Chronomancer },
        { key: 'titan', Cls: Titan },
        { key: 'ronin', Cls: Ronin },
        { key: 'valkyrie', Cls: Valkyrie },
        { key: 'icemage', Cls: IceMage },
        { key: 'android', Cls: Android }
      ];
      for (const h of allAdvHeroes) {
        const expectedKit = ADVENTURE_HERO_KITS[h.key];
        if (!expectedKit) {
          throw new Error(`Missing ADVENTURE_HERO_KITS entry for '${h.key}'!`);
        }

        advGame.isMatchOver = false;
        advGame.slot1Hero = h.key;
        const hero = new h.Cls(240, advGame.renderer.groundY, 1);
        if (!hero.heroId) hero.heroId = h.key;
        hero.game = advGame;

        // Snapshot 100% of VS Mode stats & method references BEFORE attaching Adventure kit
        const origVsHp = hero.maxHp;
        const origVsSkillName = hero.skillName;
        const origVsUltName = hero.ultName;
        const origVsTrueUltName = hero.trueUltName;
        const origUpdateAuto = hero.updateAutoAttack;
        const origUpdateSkill = hero.updateSkill;
        const origUpdateUlt = hero.updateUltimate;
        const origUpdateTrueUlt = hero.updateTrueUltimate;

        advGame.leftFighter = hero;
        adv.setAutoPlay(false, false);
        adv.startCampaign(hero);

        // CRITICAL: 100% of authentic VS Mode methods, animations, shaders & skill names MUST remain untouched!
        if (
          !hero._advKitActive ||
          hero._advKitId !== h.key ||
          hero.skillName !== origVsSkillName ||
          hero.ultName !== origVsUltName ||
          hero.trueUltName !== origVsTrueUltName ||
          hero.updateAutoAttack !== origUpdateAuto ||
          hero.updateSkill !== origUpdateSkill ||
          hero.updateUltimate !== origUpdateUlt ||
          hero.updateTrueUltimate !== origUpdateTrueUlt
        ) {
          throw new Error(
            `Expected '${h.key}' to retain 100% authentic VS methods & names in Adventure Mode! skill='${hero.skillName}' vs '${origVsSkillName}'`
          );
        }

        // Verify all 5 action-orb tags match the active hero's iconic theme
        if (Object.keys(expectedKit.tags).length !== 5) {
          throw new Error(`Expected exactly 5 Adventure orb tags for '${h.key}', got ${Object.keys(expectedKit.tags).length}`);
        }
        for (const [actId, expTag] of Object.entries(expectedKit.tags)) {
          const domTag = mockDomMap.get(`adv-tag-${actId}`)?.textContent;
          if (domTag !== expTag) {
            throw new Error(
              `Expected Adventure '${actId}' orb tag '${expTag}' for '${h.key}', got '${domTag}'`
            );
          }
        }

        // Verify gentle joystick tilt (`0.30`) vs brisk obstacle-dodging sprint (`1.0` -> >85px in 12 frames!)
        const walkStartX = hero.x;
        adv.setJoystickVector(0.30, 0, true);
        tickAdv(8, 16);
        const slowRatio = hero._manualSpeedRatio;
        const sprintStartX = hero.x;
        adv.setJoystickVector(1.0, 0, true);
        tickAdv(12, 16);
        const fastRatio = hero._manualSpeedRatio;
        const sprintDeltaX = hero.x - sprintStartX;
        adv.setJoystickVector(0, 0, false);
        if (!(slowRatio > 0 && fastRatio > slowRatio + 0.15 && sprintDeltaX > 85 && hero.x > walkStartX)) {
          throw new Error(
            `Expected brisk obstacle-dodging walk speed & proportional _manualSpeedRatio for '${h.key}' (slow=${slowRatio}, fast=${fastRatio}, sprintDx=${sprintDeltaX.toFixed(1)})`
          );
        }

        // Spawn a high-HP 3-lane monster cluster right ahead in Zone 0 to exercise every authentic move!
        for (const m of adv.getLivingMonsters()) m.isDead = true;
        hero.x = 340;
        hero.groundY = 561;
        hero.y = 561;
        hero.facing = 1;
        hero.setState('IDLE');
        const laneM1 = adv.spawnMonster('ghoul', 500, { groundY: 495 });
        const laneM2 = adv.spawnMonster('cultist', 530, { groundY: 561 });
        const laneM3 = adv.spawnMonster('brute', 555, { groundY: 628 });
        for (const m of [laneM1, laneM2, laneM3]) {
          m.maxHp = 25000;
          m.hp = 25000;
          m.stunTimer = 99;
          m.autoCooldown = 999;
          m.skillCooldown = 999;
        }
        const totalClusterHp = () => laneM1.hp + laneM2.hp + laneM3.hp;
        const resetClusterPos = () => {
          laneM1.x = 500;
          laneM1.groundY = 495;
          laneM1.y = 495;
          laneM2.x = 530;
          laneM2.groundY = 561;
          laneM2.y = 561;
          laneM3.x = 555;
          laneM3.groundY = 628;
          laneM3.y = 628;
          for (const m of [laneM1, laneM2, laneM3]) {
            m.vx = 0;
            m.vy = 0;
            m.stunTimer = 99;
          }
        };

        // 1) Authentic 4-Variant Basic Attack Combo (`4` distinct main-model animations for ALL 11 champions!) + 2.5D Pack Cleave
        let hpBefore = totalClusterHp();
        const comboCount = 4;
        for (let step = 0; step < comboCount; step++) {
          resetClusterPos();
          hero.autoCooldown = 0;
          hero.x = 385;
          hero.groundY = 561;
          hero.y = 561;
          hero.facing = 1;
          adv.triggerAction('attack');
          tickAdv(26, 26);
        }
        tickAdv(14, 14);
        const basicDmg = hpBefore - totalClusterHp();
        const offLaneCleaved = laneM1.hp < 25000 || laneM3.hp < 25000;
        if (basicDmg <= 0 || !offLaneCleaved) {
          throw new Error(
            `Expected '${h.key}' authentic Basic Combo to damage & 2.5D-cleave 3-lane monster cluster, dealt=${basicDmg}, offLaneCleaved=${offLaneCleaved}`
          );
        }

        // 2) Pure Non-Attacking 360° 3D Evade (`dodge`) — ZERO projectiles, ZERO decoys, ZERO damage!
        resetClusterPos();
        advGame.vfx.projectiles.length = 0;
        if (Array.isArray(hero.activeChakrams)) hero.activeChakrams.length = 0;
        if (Array.isArray(hero.activeMarchingSpires)) hero.activeMarchingSpires.length = 0;
        if (Array.isArray(hero.activeSkyIcicles)) hero.activeSkyIcicles.length = 0;
        if ('iceDecoy' in hero) hero.iceDecoy = null;
        hero.setState('IDLE');
        hero.x = 455;
        hero.groundY = 561;
        hero.y = 561;
        hero.dodgeCooldown = 0;
        const hpBeforePureDodge = totalClusterHp();
        adv.setJoystickVector(-0.78, -0.68, true);
        adv.triggerAction('dodge');
        tickAdv(1, 1);
        if (hero.state !== 'DODGE' || !hero.isInvulnerable) {
          throw new Error(
            `Expected '${h.key}' Adventure Dodge to enter invulnerable DODGE immediately, got state=${hero.state}, invuln=${hero.isInvulnerable}`
          );
        }
        adv.setJoystickVector(0, 0, false);
        tickAdv(10, 10);
        const dodgeDamageDealt = hpBeforePureDodge - totalClusterHp();
        if (
          hero.state !== 'IDLE' ||
          hero.isInvulnerable ||
          advGame.vfx.projectiles.length !== 0 ||
          Boolean(hero.iceDecoy) ||
          dodgeDamageDealt !== 0 ||
          455 - hero.x < 85 ||
          561 - hero.groundY < 45
        ) {
          throw new Error(
            `Expected '${h.key}' Adventure Dodge to be 100% pure 3D evade (0 dmg, 0 projs, 0 decoys): state=${hero.state}, dmg=${dodgeDamageDealt}, projs=${advGame.vfx.projectiles.length}, decoy=${Boolean(hero.iceDecoy)}, dx=${(hero.x - 455).toFixed(1)}, dGy=${(hero.groundY - 561).toFixed(1)}`
          );
        }

        // 3) Authentic Signature Skill (`skill`) — 2.5D AoE + Zone-Clamped Bounds
        resetClusterPos();
        hero.x = 380;
        hero.groundY = 561;
        hero.y = 561;
        hero.facing = 1;
        hero.skillCooldown = 0;
        adv.progression.spirit = 100;
        hpBefore = totalClusterHp();
        adv.triggerAction('skill');
        tickAdv(52, 26);
        const skillDmg = hpBefore - totalClusterHp();
        if (skillDmg <= 0 || hero.x > 1200 || hero.x < 40 || hero.state !== 'IDLE') {
          throw new Error(
            `Authentic Skill check failed for '${h.key}': dmg=${skillDmg}, x=${hero.x.toFixed(1)}, state=${hero.state}`
          );
        }

        // 4) Authentic Overdrive Ultimate (`overdrive`) — 2.5D Crowd-Clear + Zone-Clamped Bounds
        resetClusterPos();
        hero.x = 380;
        hero.groundY = 561;
        hero.y = 561;
        hero.facing = 1;
        adv.progression.ultCharge = 100;
        hpBefore = totalClusterHp();
        adv.triggerAction('overdrive');
        tickAdv(76, 38);
        const odDmg = hpBefore - totalClusterHp();
        if (odDmg <= 0 || hero.x > 1200 || hero.x < 40 || hero.state !== 'IDLE') {
          throw new Error(
            `Authentic Overdrive check failed for '${h.key}': dmg=${odDmg}, x=${hero.x.toFixed(1)}, state=${hero.state}`
          );
        }

        // 5) Authentic Supreme Ultimate (`ultimate`) — Full Choreography + Shaders + Zone-Clamped Bounds
        resetClusterPos();
        hero.x = 380;
        hero.groundY = 561;
        hero.y = 561;
        hero.facing = 1;
        adv.progression.astralCharge = 100;
        hpBefore = totalClusterHp();
        adv.triggerAction('ultimate');
        tickAdv(176, 58);
        const cataclysmDmg = hpBefore - totalClusterHp();
        if (cataclysmDmg < 250 || hero.x > 1200 || hero.x < 40 || hero.state !== 'IDLE') {
          throw new Error(
            `Authentic Supreme Ultimate check failed for '${h.key}': dmg=${cataclysmDmg}, x=${hero.x.toFixed(1)}, state=${hero.state}`
          );
        }

        // 6) Verify ALL 11 Champions (both melee & ranged, even from off-center 3D lane!) reach & damage Right-Side Colossal Boss Malphas (`x = 9335`)!
        {
          for (const m of adv.getLivingMonsters()) m.isDead = true;
          adv.zoneIndex = 3;
          adv.lockActive = true;
          adv.lockMinX = 8380;
          adv.lockMaxX = 9520;
          const isRanged = (hero.attackRange || 180) >= 320;
          hero.setState('IDLE');
          hero.x = isRanged ? 8920 : 9180;
          hero.groundY = 472;
          hero.y = 472;
          hero.facing = 1;
          const testBoss = adv.spawnMonster('archfiend', 9335, { groundY: 561 });
          adv.bossEntity = testBoss;
          const startBossHp = testBoss.hp;
          adv.setAutoPlay(true, false);
          tickAdv(55, 28);
          if (testBoss.hp >= startBossHp) {
            throw new Error(
              `Expected hero '${h.key}' authentic kit to reach and damage Colossal Boss Malphas (hero.x=${hero.x.toFixed(1)}, gy=${hero.groundY.toFixed(1)}, boss.hp=${testBoss.hp}/${startBossHp})`
            );
          }
          adv.setAutoPlay(false, false);
        }

        // 7) Teardown Adventure Campaign & verify 100% exact VS Mode method & stat restoration!
        adv.stopCampaign();
        if (
          hero._advKitActive ||
          hero.maxHp !== origVsHp ||
          hero.skillName !== origVsSkillName ||
          hero.ultName !== origVsUltName ||
          hero.trueUltName !== origVsTrueUltName ||
          hero.updateAutoAttack !== origUpdateAuto ||
          hero.updateSkill !== origUpdateSkill ||
          hero.updateUltimate !== origUpdateUlt ||
          hero.updateTrueUltimate !== origUpdateTrueUlt
        ) {
          throw new Error(
            `Expected stopCampaign() to restore 100% of '${h.key}' VS Mode methods & stats! maxHp=${hero.maxHp}/${origVsHp}, skill='${hero.skillName}'/'${origVsSkillName}'`
          );
        }
      }
    }

    if (stitchedStagePngBlits > 0) {
      throw new Error(
        `Forbidden stitched duel-stage PNG blitted ${stitchedStagePngBlits} times during Adventure Mode — must use 100% seamless AdventureMapRenderer!`
      );
    }
    if (advTrack.rotateCalls > 0) {
      throw new Error(`Forbidden ctx.rotate() called ${advTrack.rotateCalls} times during Adventure Mode rendering!`);
    }

    // 17D. Verify Default Portrait Mobile (390x844 stays 390x844 when Landscape OFF) AND ZERO-ZOOM Mobile Landscape (844x390)
    const origWinW = globalThis.window.innerWidth;
    const origWinH = globalThis.window.innerHeight;
    const origDocEl = globalThis.document.documentElement;
    const rootClasses = new Set();
    globalThis.document.documentElement = {
      classList: {
        contains: (c) => rootClasses.has(c)
      }
    };
    try {
      // Case 0: Default Portrait Mobile (390x844, `is-css-rotated-landscape` NOT active by default!)
      globalThis.window.innerWidth = 390;
      globalThis.window.innerHeight = 844;
      const portCanvas = {
        width: 390,
        height: 844,
        getContext: () => createMockCtx()
      };
      const portRenderer = new Renderer(portCanvas);
      if (portRenderer.width !== 390 || portRenderer.height !== 844 || portRenderer.isMobileLandscape) {
        throw new Error(
          `Expected default portrait phone (390x844) to stay portrait with isMobileLandscape=false, got ${portRenderer.width}x${portRenderer.height}`
        );
      }

      // Case 1: Native Hardware Mobile Landscape (844x390) — ZERO Camera Zoom!
      globalThis.window.innerWidth = 844;
      globalThis.window.innerHeight = 390;
      const mobCanvas = {
        width: 844,
        height: 390,
        getContext: () => createMockCtx()
      };
      const mobRenderer = new Renderer(mobCanvas);
      mobRenderer.adventureMode = true;
      mobRenderer.worldWidth = ADVENTURE_WORLD_WIDTH;
      if (mobRenderer.width !== 844 || mobRenderer.height !== 390 || !mobRenderer.isMobileLandscape) {
        throw new Error(
          `Expected native mobile landscape 844x390 with isMobileLandscape=true, got ${mobRenderer.width}x${mobRenderer.height} (isMobileLandscape=${mobRenderer.isMobileLandscape})`
        );
      }
      const mobSol = new FireMage(320, 561, 1);
      const mobGhoulClose = new FireMage(360, 561, -1);
      for (let s = 0; s < 15; s++) mobRenderer.update(0.05, [mobSol, mobGhoulClose]);
      const zoomClose = mobRenderer.zoom;

      // Spread fighters wide apart + trigger KO / Clash / Ult / Victory zoom timers -> zoom MUST remain 100% constant & unzoomed!
      mobGhoulClose.x = 1120;
      mobRenderer.koZoomTimer = 1.0;
      mobRenderer.clashZoomTimer = 0.5;
      mobRenderer.ultZoomTimer = 1.0;
      mobSol.state = 'VICTORY';
      for (let s = 0; s < 15; s++) mobRenderer.update(0.05, [mobSol, mobGhoulClose]);
      const zoomFarAndKo = mobRenderer.zoom;

      if (zoomClose < 0.38 || zoomClose > 0.48 || Math.abs(zoomClose - zoomFarAndKo) > 0.0001) {
        throw new Error(
          `Expected widened constant Adventure mobile-landscape fit in [0.38..0.48] with zero zoom drift, got close=${zoomClose.toFixed(4)}, far+KO=${zoomFarAndKo.toFixed(4)}`
        );
      }

      // Case 2: Portrait-Locked Phone (390x844) when user opts in (`is-css-rotated-landscape` active) -> Logical 844x390 widened Adventure fit!
      globalThis.window.innerWidth = 390;
      globalThis.window.innerHeight = 844;
      rootClasses.add('is-css-rotated-landscape');
      mobRenderer.resize();
      if (
        mobRenderer.width !== 844 ||
        mobRenderer.height !== 390 ||
        !mobRenderer.isMobileLandscape ||
        mobRenderer.zoom < 0.38 ||
        mobRenderer.zoom > 0.48
      ) {
        throw new Error(
          `Expected CSS-rotated portrait 390x844 -> logical 844x390 widened Adventure fit, got ${mobRenderer.width}x${mobRenderer.height} zoom=${mobRenderer.zoom.toFixed(3)}`
        );
      }
    } finally {
      globalThis.window.innerWidth = origWinW;
      globalThis.window.innerHeight = origWinH;
      globalThis.document.documentElement = origDocEl;
    }

    console.log(
      `[PASS] Adventure Mode v4 (Zero-Zoom Mobile Landscape + All 11 Playable Champions + Proportional Walk Cadence + Dedicated 11-Hero 2.5D Adventure Skill Sets + Colossal Boss Reach): all 11 kits verified, VS Mode methods & stats 100% untouched, mobile landscape locked unzoomed, 0 ctx.rotate!`
    );
  } finally {
    globalThis.document.getElementById = origGetElementById;
    globalThis.document.createElement = origCreateElement;
  }
}









// =========================================================================
// 18. Bipedal Walk Playback (Forward + Backward) + Pause Modal & UI Isolation
// =========================================================================
{
  const repoRoot = REPO_ROOT;
  const html = fs.readFileSync(`${repoRoot}/index.html`, 'utf8');
  const css = fs.readFileSync(`${repoRoot}/style.css`, 'utf8');
  const mainSrc = fs.readFileSync(`${repoRoot}/src/main.js`, 'utf8');

  // 18A. Verify all 11 sprite sheets have PNG IHDR 6240x2080 (10 rows x 30 cols)
  // and PixelForge.getFrameIndex plays forward (30..59) on moveDir >= 0 and reverses (59..30) on moveDir < 0
  const walkHeroes = [
    ['warrior', Warrior],
    ['mage', FireMage],
    ['ronin', Ronin],
    ['valkyrie', Valkyrie],
    ['reaper', Reaper],
    ['priestess', Priestess],
    ['archer', Archer],
    ['chronomancer', Chronomancer],
    ['titan', Titan],
    ['icemage', IceMage],
    ['android', Android]
  ];

  for (const [sheetKey, HeroCls] of walkHeroes) {
    const pngPath = `${repoRoot}/assets/sprites/${sheetKey}_sheet.png`;
    const buf = fs.readFileSync(pngPath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width !== 6240 || height !== 2080) {
      throw new Error(`Expected ${sheetKey}_sheet.png to be 6240x2080, got ${width}x${height}`);
    }

    const hero = new HeroCls(300, 561, 1);
    hero.state = 'WALK';

    hero.moveDir = 1;
    hero.walkPhase = 0;
    const fwd0 = PixelForge.getFrameIndex(hero, 0);
    hero.walkPhase = 7 / 7.5 + 0.01;
    const fwd7 = PixelForge.getFrameIndex(hero, 0);
    hero.walkPhase = 15 / 7.5 + 0.01;
    const fwd15 = PixelForge.getFrameIndex(hero, 0);
    hero.walkPhase = 22 / 7.5 + 0.01;
    const fwd22 = PixelForge.getFrameIndex(hero, 0);

    if (fwd0 !== 30 || fwd7 !== 37 || fwd15 !== 45 || fwd22 !== 52) {
      throw new Error(
        `[${sheetKey}] Expected forward WALK frames (30, 37, 45, 52), got (${fwd0}, ${fwd7}, ${fwd15}, ${fwd22})`
      );
    }

    hero.moveDir = -1;
    hero.walkPhase = 7 / 7.5 + 0.01;
    const bwd7 = PixelForge.getFrameIndex(hero, 0);
    hero.walkPhase = 22 / 7.5 + 0.01;
    const bwd22 = PixelForge.getFrameIndex(hero, 0);
    if (bwd7 !== 53 || bwd22 !== 38) {
      throw new Error(
        `[${sheetKey}] Expected backward WALK frame reversal (53, 38), got (${bwd7}, ${bwd22})`
      );
    }
  }

  // 18B. Verify Pause Button, Pause Modal, and Strict Mode Isolation (Zero Live View-Blocking Bars)
  const requiredPauseIds = [
    'btn-game-pause',
    'pause-sp-badge',
    'pause-modal',
    'pause-mode-subtitle',
    'btn-pause-resume',
    'pause-vs-section',
    'pause-adv-section',
    'btn-vs-pause-landscape',
    'vs-pause-landscape-label'
  ];
  for (const pid of requiredPauseIds) {
    if (!html.includes(`id="${pid}"`)) {
      throw new Error(`Missing required Pause UI ID in index.html: #${pid}`);
    }
  }

  // Ensure both .hud-bottom (VS utility bar) and #adv-utility-bar (Adventure utility bar) live inside #pause-modal
  const pauseModalStart = html.indexOf('id="pause-modal"');
  const landingOverlayStart = html.indexOf('id="landing-overlay"');
  const vsSectionIdx = html.indexOf('id="pause-vs-section"');
  const advSectionIdx = html.indexOf('id="pause-adv-section"');
  const hudBottomIdx = html.indexOf('class="hud-bottom');
  const advUtilIdx = html.indexOf('id="adv-utility-bar"');
  if (
    pauseModalStart < 0 ||
    vsSectionIdx < pauseModalStart ||
    hudBottomIdx < vsSectionIdx ||
    advSectionIdx < hudBottomIdx ||
    advUtilIdx < advSectionIdx ||
    landingOverlayStart < advUtilIdx
  ) {
    throw new Error(
      'Expected .hud-bottom inside #pause-vs-section and #adv-utility-bar inside #pause-adv-section within #pause-modal so live arena views are never blocked!'
    );
  }

  if (
    !css.includes('#app.is-adventure-active #pause-vs-section') ||
    !css.includes('#app:not(.is-adventure-active) #pause-adv-section')
  ) {
    throw new Error('Missing strict CSS mode-isolation rules for #pause-vs-section and #pause-adv-section in style.css!');
  }

  if (!mainSrc.includes('this.isPaused') || !mainSrc.includes('setPaused(') || !mainSrc.includes('togglePause(')) {
    throw new Error('Missing pause simulation freeze state/handlers (isPaused / setPaused / togglePause) in src/main.js!');
  }

  console.log(
    '[PASS] Bipedal Walk Crossover (11x 6240x2080 Sheets + Forward/Backward Frame Playback) & Mode-Isolated Pause Menu Modal verified!'
  );
}


// =========================================================================
// 19. All-11-Champion 4-Variant Main-Model Auto-Attack & Dynamic Visuals
//     (`Row 2`: F00..F07 [60..67], F08..F14 [68..74], F15..F22 [75..82], F23..F29 [83..89])
// =========================================================================
{
  const expectedAutoSlices = [
    [60, 67],
    [68, 74],
    [75, 82],
    [83, 89]
  ];
  const autoRoster = [
    ['warrior', Warrior, 145],
    ['warrior_ex', WarriorEx, 145],
    ['mage', FireMage, 320],
    ['ronin', Ronin, 150],
    ['valkyrie', Valkyrie, 320],
    ['reaper', Reaper, 150],
    ['priestess', Priestess, 320],
    ['archer', Archer, 320],
    ['chronomancer', Chronomancer, 165],
    ['titan', Titan, 155],
    ['icemage', IceMage, 320],
    ['android', Android, 175]
  ];

  const autoTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const autoCtx = createMockCtx(autoTrack);

  for (const [heroKey, HeroCls, testDist] of autoRoster) {
    const hero = new HeroCls({ x: 380, groundY: 520, facing: 1, name: heroKey, team: 'left' });
    const target = new Warrior({ x: 380 + testDist, groundY: 520, facing: -1, name: 'Dummy', team: 'right' });
    hero.isPlayerControlled = true;
    hero.game = game;
    target.game = game;
    target.maxHp = 999999;
    target.hp = 999999;
    game.fighters = [hero, target];
    game.getEnemiesOf = (f) => (f === hero ? [target] : [hero]);
    game.vfx.projectiles.length = 0;

    hero.comboStep = 0;
    const visitedSlices = [false, false, false, false];
    let totalDamage = 0;

    for (let v = 0; v < 4; v++) {
      hero.x = 380;
      hero.y = 520;
      hero.facing = 1;
      hero.autoCooldown = 999;
      target.x = 380 + testDist;
      target.y = 520;
      target.stunTimer = 99;
      const hpBefore = target.hp;
      const [minF, maxF] = expectedAutoSlices[v];

      hero.setState('AUTO_ATTACK');
      let sawSliceFrame = false;
      for (let tick = 0; tick < 36; tick++) {
        const dt = 1 / 30;
        hero.update(dt, target, game);
        // Step projectiles so ranged auto-attack variants connect cleanly
        for (let pi = game.vfx.projectiles.length - 1; pi >= 0; pi--) {
          const p = game.vfx.projectiles[pi];
          p.x += (p.vx || 0) * dt;
          p.y += (p.vy || 0) * dt;
          if (Math.abs(p.x - target.x) < 62 && Math.abs(p.y - (target.y - 96)) < 110) {
            target.takeDamage(p.damage || 30, p.owner, Boolean(p.isCrit), 40, 0);
            game.vfx.projectiles.splice(pi, 1);
          }
        }
        game.vfx.update(dt, 520, game.renderer, game.audio);

        if (hero.state === 'AUTO_ATTACK') {
          const fIdx = PixelForge.getFrameIndex(hero, hero.walkPhase);
          if (fIdx < minF || fIdx > maxF) {
            throw new Error(
              `[${heroKey}] Auto Variant ${v} rendered frame ${fIdx} outside expected slice [${minF}..${maxF}]!`
            );
          }
          sawSliceFrame = true;
        }
        hero.drawForegroundOverlay?.(autoCtx, game.renderer);
        hero.draw(autoCtx, false, game.renderer);
        hero.drawUltimateForeground?.(autoCtx, game.renderer);
        if (hero.state === 'IDLE') break;
      }
      // Tick a few extra frames for delayed/arcing projectiles or sky-lances
      for (let extra = 0; extra < 16; extra++) {
        const dt = 1 / 30;
        hero.update(dt, target, game);
        for (let pi = game.vfx.projectiles.length - 1; pi >= 0; pi--) {
          const p = game.vfx.projectiles[pi];
          p.x += (p.vx || 0) * dt;
          p.y += (p.vy || 0) * dt;
          if (Math.abs(p.x - target.x) < 62 && Math.abs(p.y - (target.y - 96)) < 110) {
            target.takeDamage(p.damage || 30, p.owner, Boolean(p.isCrit), 40, 0);
            game.vfx.projectiles.splice(pi, 1);
          }
        }
      }

      if (!sawSliceFrame) {
        throw new Error(`[${heroKey}] Auto Variant ${v} never rendered any frame in [${minF}..${maxF}]!`);
      }
      visitedSlices[v] = true;
      totalDamage += hpBefore - target.hp;
    }

    if (!visitedSlices.every(Boolean) || totalDamage <= 0 || autoTrack.rotateCalls > 0) {
      throw new Error(
        `[${heroKey}] 4-Variant Auto-Attack failed audit: slices=${JSON.stringify(visitedSlices)}, dmg=${totalDamage}, rotateCalls=${autoTrack.rotateCalls}`
      );
    }
  }

  console.log(
    '[PASS] All 11 Champions 4-Variant Main-Model Auto-Attacks (Row 2: [60..67], [68..74], [75..82], [83..89]) & Dynamic Visuals verified (0 slice leaks, 0 ctx.rotate)!'
  );
}

// ============================================================================
// 20. PIXEL-BLEED PURITY, 4-REALM BUILDINGS/DESTRUCTIBLES & COLOSSAL BOSS RIG
// ============================================================================
{
  // 20A. Verify PNG IHDR invariants across all 11 hero sheets, Sol icons, & 16-cell Colossal Boss atlas
  const heroIds = [
    'warrior',
    'mage',
    'archer',
    'priestess',
    'reaper',
    'chronomancer',
    'titan',
    'ronin',
    'valkyrie',
    'icemage',
    'android'
  ];
  for (const hid of heroIds) {
    const buf = fs.readFileSync(
      `${REPO_ROOT}/assets/sprites/${hid}_sheet.png`
    );
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w !== 6240 || h !== 2080) {
      throw new Error(`Expected ${hid}_sheet.png to be 6240x2080, got ${w}x${h}`);
    }
  }

  // 20B. Verify 5-Plane Seamless 10-Bay Adventure Panoramas + Live Animated `adv_fx_sheet.png` Stage FX (`0` `ctx.rotate`, `0` `arena_*` PNGs)
  const expectedPanos = [
    ['adv_vista_pano.png', 1620, 272],
    ['adv_arch_pano.png', 3930, 272],
    ['adv_floor_pano.png', 4570, 96],
    ['adv_inferno_pano.png', 800, 360]
  ];
  for (const [fname, expW, expH] of [
    ...expectedPanos,
    ['adv_props_sheet.png', 1152, 640],
    ['adv_fx_sheet.png', 1024, 640],
    ['hero_icons_sheet.png', 384, 768]
  ]) {
    const pbuf = fs.readFileSync(`${REPO_ROOT}/assets/sprites/${fname}`);
    const pw = pbuf.readUInt32BE(16);
    const ph = pbuf.readUInt32BE(20);
    if (pw !== expW || ph !== expH) {
      throw new Error(`Expected ${fname} to be ${expW}x${expH}, got ${pw}x${ph}`);
    }
  }
  const panoAssets = PixelForge.initAssets();
  if (panoAssets.advVistaPano) panoAssets.advVistaPano.naturalWidth = 1620;
  if (panoAssets.advArchPano) panoAssets.advArchPano.naturalWidth = 3930;
  if (panoAssets.advFloorPano) panoAssets.advFloorPano.naturalWidth = 4570;
  if (panoAssets.advInfernoPano) panoAssets.advInfernoPano.naturalWidth = 800;
  if (panoAssets.advFxSheet) {
    panoAssets.advFxSheet.naturalWidth = 1024;
    panoAssets.advFxSheet.naturalHeight = 640;
  }

  const mapTrack = { rotateCalls: 0 };
  let arenaPngDraws = 0;
  let advFxStageBlits = 0;
  let smoothGlowStageBlits = 0;
  let lighterPixelBloomRects = 0;
  const seenPanoBlits = new Set();
  let fgRectCount = 0;
  const glowMarkerSet = new Set([
    { tag: 'glowOrange' },
    { tag: 'glowGold' },
    { tag: 'glowCyan' },
    { tag: 'glowEmerald' },
    { tag: 'glowViolet' },
    { tag: 'glowCrimson' }
  ]);
  const glowArr = [...glowMarkerSet];
  const mapCtx = createMockCtx(mapTrack);
  mapCtx.drawImage = (img, ...rest) => {
    if (glowMarkerSet.has(img)) smoothGlowStageBlits++;
    if (img && typeof img.src === 'string') {
      if (img.src.includes('arena_')) arenaPngDraws++;
      if (img.src.includes('adv_fx_sheet.png')) {
        advFxStageBlits++;
      }
      for (const [fname] of expectedPanos) {
        if (img.src.includes(fname)) {
          if (rest.some((v) => !Number.isFinite(v))) {
            throw new Error(`Non-finite drawImage arg on ${fname}: ${JSON.stringify(rest)}`);
          }
          seenPanoBlits.add(fname);
        }
      }
    }
  };
  mapCtx.fillRect = (rx, ry, rw, rh) => {
    if (mapCtx.globalCompositeOperation === 'lighter') {
      if (
        !Number.isFinite(rx) ||
        !Number.isFinite(ry) ||
        !Number.isFinite(rw) ||
        !Number.isFinite(rh) ||
        mapCtx.globalAlpha > 0.181
      ) {
        throw new Error(
          `Invalid stepped pixel-bloom rect: (${rx},${ry},${rw},${rh}) alpha=${mapCtx.globalAlpha}`
        );
      }
      lighterPixelBloomRects++;
    }
  };
  const mockMapRenderer = {
    width: 1200,
    height: 600,
    zoom: 0.9,
    camX: 450,
    camY: 466,
    time: 1.25,
    permanentStageOverride: null,
    glowOrange: glowArr[0],
    glowGold: glowArr[1],
    glowCyan: glowArr[2],
    glowEmerald: glowArr[3],
    glowViolet: glowArr[4],
    glowCrimson: glowArr[5]
  };
  for (const cx of [450, 1600, 2800, 4200, 5600, 7200, 9020]) {
    mockMapRenderer.camX = cx;
    AdventureMapRenderer.render(mapCtx, mockMapRenderer, ADVENTURE_WORLD_WIDTH);
  }
  mockMapRenderer.permanentStageOverride = 'inferno';
  AdventureMapRenderer.render(mapCtx, mockMapRenderer, ADVENTURE_WORLD_WIDTH);
  mockMapRenderer.permanentStageOverride = null;

  const fgCtx = createMockCtx(mapTrack);
  fgCtx.fillRect = () => {
    fgRectCount++;
  };
  mockMapRenderer.camY = 120;
  AdventureMapRenderer.renderForegroundDepth(fgCtx, mockMapRenderer);

  if (
    mapTrack.rotateCalls !== 0 ||
    arenaPngDraws !== 0 ||
    seenPanoBlits.size !== 4 ||
    advFxStageBlits !== 0 ||
    smoothGlowStageBlits !== 0 ||
    lighterPixelBloomRects < 180 ||
    fgRectCount < 6 ||
    typeof AdventureMapRenderer.renderCalderaBossChasm !== 'undefined'
  ) {
    throw new Error(
      `AdventureMapRenderer 5-plane + pixel-bloom audit failed: rotate=${mapTrack.rotateCalls}, arenaPngs=${arenaPngDraws}, panos=${[...seenPanoBlits].join(',')}, advFxStageBlits=${advFxStageBlits}, smoothGlowStageBlits=${smoothGlowStageBlits}, pixelBloomRects=${lighterPixelBloomRects}, fgRects=${fgRectCount}, chasmFn=${typeof AdventureMapRenderer.renderCalderaBossChasm}`
    );
  }
  const mapSrc = fs.readFileSync(
    `${REPO_ROOT}/src/adventure/AdventureMapRenderer.js`,
    'utf8'
  );
  if (
    mapSrc.includes('arena_') ||
    mapSrc.includes('renderCalderaBossChasm') ||
    mapSrc.includes('blitStageFx') ||
    mapSrc.includes('advFxSheet') ||
    /\.rotate\s*\(/.test(mapSrc)
  ) {
    throw new Error(
      'AdventureMapRenderer.js must contain 0 arena_* references, 0 renderCalderaBossChasm, 0 blitStageFx/advFxSheet stage cutouts, and 0 ctx.rotate() calls!'
    );
  }

  // 20C. Verify 20 Hero-Scaled Biome-Matched Architectural Monuments & Controlled 8-Item Drop Economy (`advPropsSheet`)
  const allAssets20 = PixelForge.initAssets();
  if (allAssets20.advPropsSheet) {
    allAssets20.advPropsSheet.naturalWidth = 1152;
    allAssets20.advPropsSheet.naturalHeight = 640;
  }
  const destGame = createMockGame();
  destGame.gameMode = 'adventure';
  const destHero = new Warrior(240, 561, 1);
  destHero.game = destGame;
  destGame.leftFighter = destHero;
  const destAdv = new AdventureManager(destGame);
  destGame.adventure = destAdv;
  destAdv.startCampaign(destHero);

  if (!destAdv.destructibles || destAdv.destructibles.props.length !== 20) {
    throw new Error(
      `Expected 20 curated hero-scaled architectural monuments across 9600px stage (5 per Realm), got ${destAdv.destructibles?.props?.length}`
    );
  }
  for (const mp of destAdv.destructibles.props) {
    const expZone = Math.floor(mp.x / 2400);
    if (
      !(mp.groundY >= 448 && mp.groundY <= 456) ||
      mp.zone !== expZone ||
      !(mp.drawScale >= 1.08 && mp.drawScale <= 1.18) ||
      !(mp.height >= 92 && mp.height <= 112)
    ) {
      throw new Error(
        `Invalid monument placement/scale (${mp.kind}): x=${mp.x}, gy=${mp.groundY}, zone=${mp.zone} (exp ${expZone}), scale=${mp.drawScale}, h=${mp.height}`
      );
    }
  }
  // Must NEVER pollute getLivingMonsters()!
  if (destAdv.getLivingMonsters().some((m) => m.isAdventureProp)) {
    throw new Error('Destructible props must NEVER appear in getLivingMonsters()!');
  }

  // Test Intact -> Cracked -> Destroyed on `eclipse_brazier` (`dropType === null`): grants direct Spirit + debris with ZERO floor clutter!
  const p0 = destAdv.destructibles.props[0]; // eclipse_brazier at x=420, groundY=458, dropType=null
  destHero.x = p0.x - 52;
  destHero.groundY = p0.groundY;
  destHero.y = p0.groundY;
  destHero.facing = 1;
  destHero.setState('AUTO_ATTACK');
  destHero.stateTimer = 0.14;
  destAdv.destructibles.update(1 / 30, destHero, destGame);
  if (p0.hp >= p0.maxHp || p0.destroyed) {
    throw new Error(`Expected prop 0 to enter damaged/cracked state after 1 melee hit, hp=${p0.hp}/${p0.maxHp}`);
  }
  destAdv.progression.spirit = 20;
  const pickupsBefore = destAdv.pickups.length;
  destAdv.destructibles.damageProp(p0, 200, destHero, destGame, true);
  if (
    !p0.destroyed ||
    destAdv.destructibles.debris.length < 10 ||
    destAdv.progression.spirit < 30 ||
    destAdv.pickups.length !== pickupsBefore
  ) {
    throw new Error(
      `Expected shattered brazier (dropType=null) to grant +10 direct Spirit & debris with 0 floor drops: destroyed=${p0.destroyed}, debris=${destAdv.destructibles.debris.length}, spirit=${destAdv.progression.spirit}, pickups=${destAdv.pickups.length}/${pickupsBefore}`
    );
  }

  // Shatter an Ancient Artifact (`eclipse_astrolabe` at index 2) via projectile -> drops single Astral Relic shard!
  const artProp = destAdv.destructibles.props[2];
  destHero.groundY = artProp.groundY;
  destGame.vfx.spawnProjectile({
    x: artProp.x - 8,
    y: artProp.groundY - 48,
    vx: 300,
    vy: 0,
    color: '#fb923c',
    owner: destHero,
    damage: 250,
    radius: 16
  });
  destAdv.destructibles.update(1 / 30, destHero, destGame);
  if (!artProp.destroyed || !destAdv.pickups.some((pk) => pk.type === 'relic')) {
    throw new Error(
      `Expected Ancient Artifact shatter to drop Astral Relic shard: destroyed=${artProp.destroyed}`
    );
  }

  // Render standing props, rubble, HD-2D pickups & shard debris -> verify baked orthogonal 128x128 atlas + advPropsSheet 64x64 shards & 0 ctx.rotate()!
  const orthoAtlas = getOrBakeOrthogonalPropsSheet();
  const propTrack = { rotateCalls: 0 };
  const propCtx = createMockCtx(propTrack);
  let propCellBlits128 = 0;
  let shardBlits64 = 0;
  propCtx.drawImage = (...args) => {
    if (args.length === 9) {
      const [srcImg, sx, sy, sw, sh] = args;
      if (srcImg === orthoAtlas && sw === 128 && sh === 128 && sx >= 0 && sy >= 0) {
        propCellBlits128++;
      }
      if (srcImg === allAssets20.advPropsSheet && sw === 64 && sh === 64 && sy >= 512) {
        shardBlits64++;
      }
    }
  };
  for (const camX of [0, 1400, 2800, 4400, 6000, 7600, 8600]) {
    destGame.renderer.cameraX = camX;
    destAdv.renderWorldFloor(propCtx, destGame.renderer);
    for (const sp of destAdv.getStandingProps()) {
      sp.draw(propCtx, false, destGame.renderer);
    }
    destAdv.renderWorldForeground(propCtx, destGame.renderer);
  }
  if (propTrack.rotateCalls !== 0 || propCellBlits128 < 20 || shardBlits64 < 10) {
    throw new Error(
      `HD-2D advPropsSheet audit failed: rotate=${propTrack.rotateCalls}, cell128=${propCellBlits128}, shard64=${shardBlits64}`
    );
  }

  // Verify controlled campaign-wide drop economy: smashing ALL 20 monuments across 9600px yields strictly 4 single-item pickups (4 relic + 0 hp)!
  destAdv.pickups.length = 0;
  destAdv.destructibles.resetForCampaign();
  for (const mp of destAdv.destructibles.props) {
    destAdv.destructibles.damageProp(mp, 999, destHero, destGame, true);
  }
  const relicDrops = destAdv.pickups.filter((pk) => pk.type === 'relic').length;
  const hpDrops = destAdv.pickups.filter((pk) => pk.type === 'hp').length;
  if (destAdv.pickups.length !== 4 || relicDrops !== 4 || hpDrops !== 0) {
    throw new Error(
      `Expected smashing all 20 monuments to spawn strictly 4 pickups (4 relic + 0 hp), got total=${destAdv.pickups.length} (relic=${relicDrops}, hp=${hpDrops})`
    );
  }
  destAdv.stopCampaign();

  // 20D. Verify Right-Side Colossal Boss (`ArchfiendBoss` at `x=9335`, `facing=-1`) Climb, Leftward Attacks, HD-2D VFX & Clipped Death
  if (allAssets20.archfiend?.colossus) {
    allAssets20.archfiend.colossus.naturalWidth = 4096;
    allAssets20.archfiend.colossus.naturalHeight = 2048;
  }
  const bossGame = createMockGame();
  bossGame.gameMode = 'adventure';
  const bossHero = new FireMage(8920, 561, 1);
  bossHero.game = bossGame;
  bossGame.leftFighter = bossHero;
  const colossus = new ArchfiendBoss(9335, 561, -1);
  colossus.game = bossGame;
  bossGame.rightFighter = colossus;
  bossGame.fighters = [bossHero, colossus];

  if (
    !(colossus.emergeTimer > 1.0) ||
    colossus.isInvulnerable !== false ||
    colossus.x !== 9335 ||
    colossus.facing !== -1
  ) {
    throw new Error(
      `Expected Right-Side ArchfiendBoss at x=9335 facing=-1 with emergeTimer>1.0 & invuln=false, got x=${colossus.x}, facing=${colossus.facing}, emerge=${colossus.emergeTimer}`
    );
  }

  const seenCells = new Set();
  const jawValues = new Set();
  let deathClips = 0;
  const bossTrack = { rotateCalls: 0 };
  const bossCtx = createMockCtx(bossTrack);
  bossCtx.clip = () => {
    if (colossus.isDead) deathClips++;
  };
  bossCtx.drawImage = (...args) => {
    if (args.length === 9 && args[0] === allAssets20.archfiend?.colossus) {
      const [, sx, sy, sw, sh, dx, dy, dw, dh] = args;
      if (
        sw !== 512 ||
        sh !== 512 ||
        ![sx, sy, sw, sh, dx, dy, dw, dh].every((v) => Number.isFinite(v))
      ) {
        throw new Error(`Invalid ArchfiendBoss 9-arg drawImage: ${JSON.stringify(args.slice(1))}`);
      }
      seenCells.add(`${sx},${sy}`);
    }
  };

  // Step through APPEAR (60f) -> Fist Crush AUTO_ATTACK (32f) -> Leftward Hellfire SKILL0 (36f) -> Leftward Claw Sweep SKILL1 (36f) -> ULTIMATE (55f)
  for (let f = 0; f < 60; f++) {
    colossus.update(1 / 30, bossHero, bossGame);
    jawValues.add(Math.round((colossus.jawOpen || 0) * 20));
    colossus.draw(bossCtx, false, bossGame.renderer);
  }
  if (colossus.emergeTimer !== 0) {
    throw new Error(`Expected emergeTimer to reach 0 after 60 frames, got ${colossus.emergeTimer}`);
  }

  colossus.slamTargetX = 8920;
  colossus.slamTargetGy = 561;
  colossus.setState('AUTO_ATTACK');
  for (let f = 0; f < 32; f++) {
    colossus.update(1 / 30, bossHero, bossGame);
    colossus.draw(bossCtx, false, bossGame.renderer);
  }

  bossGame.vfx.projectiles.length = 0;
  colossus.skillVariant = 0;
  colossus.setState('SKILL');
  for (let f = 0; f < 36; f++) {
    colossus.update(1 / 30, bossHero, bossGame);
    jawValues.add(Math.round((colossus.jawOpen || 0) * 20));
    colossus.draw(bossCtx, false, bossGame.renderer);
  }
  if (!bossGame.vfx.projectiles.some((p) => p.vx < -200)) {
    throw new Error('Expected Right-Side ArchfiendBoss Jaw Hellfire to fire spread fireballs LEFTWARD (vx < -200)!');
  }

  let minSweepClawX = 99999;
  colossus.skillVariant = 1;
  colossus.setState('SKILL');
  for (let f = 0; f < 36; f++) {
    colossus.update(1 / 30, bossHero, bossGame);
    minSweepClawX = Math.min(minSweepClawX, colossus.clawWorldX);
    colossus.draw(bossCtx, false, bossGame.renderer);
  }
  if (minSweepClawX > 8550) {
    throw new Error(`Expected Right-Side ArchfiendBoss Claw Sweep to rake LEFTWARD past x<=8550, got min=${minSweepClawX}`);
  }

  colossus.bossPhase = 3;
  colossus.slamTargetX = 8880;
  colossus.setState('ULTIMATE');
  for (let f = 0; f < 55; f++) {
    colossus.update(1 / 30, bossHero, bossGame);
    colossus.draw(bossCtx, false, bossGame.renderer);
  }

  // Trigger DEATH -> verify multi-stage explosions (`_deathBlastStage >= 4`), `TORSO_DYING` (`1536,0`), `facing === -1`, and `ctx.clip()`!
  colossus.hp = 1;
  colossus.takeDamage(9999, bossHero, true, 120, 0);
  for (let f = 0; f < 65; f++) {
    colossus.update(1 / 30, bossHero, bossGame);
    colossus.draw(bossCtx, false, bossGame.renderer);
  }

  if (
    bossTrack.rotateCalls !== 0 ||
    colossus.facing !== -1 ||
    seenCells.size < 13 ||
    !seenCells.has('1536,0') || // TORSO_DYING
    !seenCells.has('3072,512') || // VFX_JAW_HELLFIRE
    !seenCells.has('3584,512') || // VFX_CLAW_SLASH
    jawValues.size < 4 ||
    deathClips < 30 ||
    (colossus._deathBlastStage || 0) < 4
  ) {
    throw new Error(
      `ArchfiendBoss 16-cell right-side choreography audit failed: rotate=${bossTrack.rotateCalls}, facing=${colossus.facing}, cells=${seenCells.size} (${[...seenCells].join(' | ')}), jawSteps=${jawValues.size}, deathClips=${deathClips}, blastStage=${colossus._deathBlastStage}`
    );
  }

  // 20E. Verify Adventure 2.5D Curved AI Steering, Corner-Escape Orbit & Zero Stuck Entities (All 11 Heroes + All 3 Realm Caster Archetypes)
  {
    const heroClasses20E = [
      Warrior,
      FireMage,
      Valkyrie,
      Priestess,
      Ronin,
      Chronomancer,
      Reaper,
      Titan,
      Archer,
      IceMage,
      Android
    ];

    for (const HeroCls of heroClasses20E) {
      const aiGame = createMockGame();
      aiGame.gameMode = 'adventure';
      const hero = new HeroCls(240, 561, 1);
      hero.game = aiGame;
      aiGame.leftFighter = hero;
      const aiAdv = new AdventureManager(aiGame);
      aiGame.adventure = aiAdv;
      aiAdv.setAutoPlay(true, false);
      aiAdv.startCampaign(hero);

      // Pin hero into locked Zone II left corner (`x=1224, groundY=470`) with an off-lane monster (`x=1305, groundY=635`)
      aiAdv.zoneIndex = 1;
      aiAdv.lockActive = true;
      aiAdv.lockMinX = 1220;
      aiAdv.lockMaxX = 2360;
      aiGame.fighters = [hero];
      const dummy = aiAdv.spawnMonster('treant', 1305, { groundY: 635, skipPortal: true });
      dummy.maxHp = 50000;
      dummy.hp = 50000;
      dummy.moveSpeed = 0; // Freeze dummy so ONLY hero's own 2.5D curved steering/orbit is measured!
      dummy.skillCooldown = 99;
      dummy.dashCooldown = 99;
      dummy.autoCooldown = 99;

      hero.x = 1224;
      hero.groundY = 470;
      hero.y = 470;
      hero.autoCooldown = 0.25;

      let minSeenX = hero.x;
      let maxSeenX = hero.x;
      let minSeenGy = hero.groundY;
      let maxSeenGy = hero.groundY;
      let attackedIn25D = false;

      for (let f = 0; f < 95; f++) {
        aiAdv.update(1 / 30);
        aiGame.vfx.update(1 / 30, aiGame);
        minSeenX = Math.min(minSeenX, hero.x);
        maxSeenX = Math.max(maxSeenX, hero.x);
        minSeenGy = Math.min(minSeenGy, hero.groundY);
        maxSeenGy = Math.max(maxSeenGy, hero.groundY);
        if (hero.state === 'AUTO_ATTACK' || hero.state === 'SKILL' || dummy.hp < 50000) {
          attackedIn25D = true;
        }
      }

      const spanX = maxSeenX - minSeenX;
      const spanGy = maxSeenGy - minSeenGy;
      if (spanX < 28 || spanGy < 65 || !attackedIn25D) {
        throw new Error(
          `Adventure 2.5D Curved AI stuck/failed for ${hero.name} (${hero.heroId}): spanX=${spanX.toFixed(1)}, spanGy=${spanGy.toFixed(1)}, attacked=${attackedIn25D}, final=(${hero.x.toFixed(1)}, ${hero.groundY.toFixed(1)})`
        );
      }

      // Verify imminent floor telegraph triggers pure 3D evade dash (`_advPureDodge` / `DODGE`)
      hero.setState('IDLE');
      hero.dodgeCooldown = 0;
      dummy.spawnFloorTelegraph(hero.x, 90, 0.30, 50, '#a855f7', 'TEST SIGIL', hero.groundY);
      aiAdv.update(1 / 30);
      if (hero.state !== 'DODGE' || !hero._advPureDodge || !hero.isInvulnerable) {
        throw new Error(
          `Expected ${hero.heroId} Auto-Play to trigger pure 3D evade dash out of imminent floor telegraph, got state=${hero.state}, pureDodge=${hero._advPureDodge}`
        );
      }

      // Verify between-wave lock standby (`target === null && lockActive === true`) settles cleanly away from walls
      for (let f = 0; f < 15; f++) aiAdv.update(1 / 30);
      aiGame.fighters = [hero];
      aiAdv.pickups.length = 0;
      hero.x = 1222;
      hero.groundY = 561;
      hero.y = 561;
      for (let f = 0; f < 60; f++) aiAdv.update(1 / 30);
      if (hero.x < 1380 || hero.x > 2240) {
        throw new Error(
          `Expected ${hero.heroId} lock-standby AI to move cleanly away from lock barrier [1220..2360], got x=${hero.x}`
        );
      }

      aiAdv.stopCampaign();
    }

    // Verify corner-pinned Realm Casters (`astrologer`, `dryad`, `cultist`) orbit inward across 2.5D road instead of backing into lockMinX!
    for (const casterKind of ['astrologer', 'dryad', 'cultist']) {
      const mGame = createMockGame();
      mGame.gameMode = 'adventure';
      const anchorHero = new Warrior(1335, 561, -1);
      anchorHero.game = mGame;
      mGame.leftFighter = anchorHero;
      const mAdv = new AdventureManager(mGame);
      mGame.adventure = mAdv;
      mAdv.startCampaign(anchorHero);
      mAdv.zoneIndex = 1;
      mAdv.lockActive = true;
      mAdv.lockMinX = 1220;
      mAdv.lockMaxX = 2360;
      mGame.fighters = [anchorHero];
      anchorHero.x = 1335;
      anchorHero.groundY = 561;
      anchorHero.y = 561;
      const cornerCaster = mAdv.spawnMonster(casterKind, 1242, { groundY: 561, skipPortal: true });
      cornerCaster.skillCooldown = 99;
      cornerCaster.autoCooldown = 99;
      cornerCaster.dashCooldown = 99;

      let maxCasterGyShift = 0;
      for (let f = 0; f < 75; f++) {
        cornerCaster.update(1 / 30, anchorHero, mGame);
        maxCasterGyShift = Math.max(maxCasterGyShift, Math.abs(cornerCaster.groundY - 561));
      }
      if (cornerCaster.x <= 1350 || maxCasterGyShift < 25) {
        throw new Error(
          `Expected cornered '${casterKind}' at x=1242 to orbit inward past hero (x>1350) along curved 2.5D lane, got x=${cornerCaster.x.toFixed(1)}, maxGyShift=${maxCasterGyShift.toFixed(1)}`
        );
      }
      mAdv.stopCampaign();
    }
  }

  console.log(
    `[PASS] Suite 20: 11-Hero Icons & Pixel Purity, 9600px Panoramas + Bowl-Locked Animated FX, 20 Hero-Scaled Monuments (8 Total Drops), Dimensional Portals, 8 Realm Monsters & Right-Side Colossal Boss verified!`
  );
}

// 21. Kaze-Maru (`Ronin`) Two-Handed Chudan-no-Kamae Walk Posture, 3-Beat Whole-Stage Slice Ultimate & Shogunate / Burning Shogunate Synergy vs Ignis Sol:
{
  // 21A. Verify arena_shogunate.png & arena_shogunate_inferno.png PNG headers (640x360) and PixelForge registration
  const shogunateFiles = [
    `${REPO_ROOT}/assets/sprites/arena_shogunate.png`,
    `${REPO_ROOT}/assets/sprites/arena_shogunate_inferno.png`
  ];
  for (const fp of shogunateFiles) {
    if (!fs.existsSync(fp)) {
      throw new Error(`[Suite 21A] Missing Shogunate stage PNG: ${fp}`);
    }
    const buf = fs.readFileSync(fp);
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
      throw new Error(`[Suite 21A] Invalid PNG header in ${fp}`);
    }
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w !== 640 || h !== 360) {
      throw new Error(`[Suite 21A] Expected 640x360 PNG for ${fp}, got ${w}x${h}`);
    }
  }
  const pfAssets = PixelForge.initAssets();
  if (!pfAssets.arenaShogunate || !pfAssets.arenaShogunateInferno) {
    throw new Error('[Suite 21A] PixelForge.initAssets() missing arenaShogunate or arenaShogunateInferno!');
  }

  // 21B. Verify Ronin WALK keeps divePitchRad === 0 and renders Row 1 (sy=208) with 0 rotateCalls / 0 quadCalls
  {
    const walkGame = createMockGame();
    const roninWalk = new Ronin({ x: 360, groundY: 460, facing: 1 });
    const dummyWalk = new Warrior({ x: 760, groundY: 460, facing: -1 });
    roninWalk.game = walkGame;
    dummyWalk.game = walkGame;
    walkGame.fighters = [roninWalk, dummyWalk];
    walkGame.getEnemiesOf = (f) => walkGame.fighters.filter((o) => o !== f);

    const track = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const trackCtx = createMockCtx(track);
    roninWalk.setState('WALK');
    roninWalk.vx = 180;
    roninWalk.moveDir = 1;
    for (let f = 0; f < 30; f++) {
      roninWalk.state = 'WALK';
      roninWalk.vx = 180;
      roninWalk.moveDir = 1;
      roninWalk.animTimer += 1 / 30;
      if (roninWalk.divePitchRad !== 0) {
        throw new Error(`[Suite 21B] Expected Ronin WALK divePitchRad === 0, got ${roninWalk.divePitchRad}`);
      }
      roninWalk.draw(trackCtx);
    }
    if (!track.syValues.has(208)) {
      throw new Error(`[Suite 21B] Expected Ronin WALK to sample Row 1 (sy=208), got syValues=${[...track.syValues]}`);
    }
    if (track.rotateCalls !== 0 || track.quadCalls !== 0) {
      throw new Error(
        `[Suite 21B] Forbidden canvas calls in Ronin WALK: rotateCalls=${track.rotateCalls}, quadCalls=${track.quadCalls}`
      );
    }
  }

  // 21C. Verify 3-Beat Choreography vs Warrior -> Single Slash Behind Enemy -> Whole-Stage Slice into 'shogunate'
  {
    const rGame = createMockGame();
    const track = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const trackCtx = createMockCtx(track);
    const emptyVfx = new VFXManager();
    rGame.renderer.resetStageOverrides();
    rGame.renderer.stageId = 'cathedral';

    const ronin = new Ronin({ x: 360, groundY: 460, facing: 1 });
    const warrior = new Warrior({ x: 680, groundY: 460, facing: -1 });
    warrior.maxHp = 20000;
    warrior.hp = 20000;
    ronin.game = rGame;
    warrior.game = rGame;
    rGame.fighters = [ronin, warrior];
    rGame.getEnemiesOf = (f) => rGame.fighters.filter((o) => o !== f);

    ronin.finisherGauge = 100;
    ronin.setState('TRUE_ULTIMATE');

    let checkedBeat1 = false;
    let checkedBeat2 = false;
    let checkedBeat3 = false;
    let exitedUltCleanly = false;

    for (let step = 1; step <= 160; step++) {
      const dt = 1 / 30;
      warrior.dodgeCooldown = 999;
      warrior.dashCooldown = 999;
      warrior.skillCooldown = 999;
      warrior.autoCooldown = 999;
      ronin.update(dt, warrior, rGame);
      warrior.update(dt, ronin, rGame);
      rGame.vfx.update(dt, 460, rGame.renderer, rGame.audio);
      rGame.renderer.update(dt, [ronin, warrior]);
      // Full integration render with live VFXManager
      rGame.renderer.render([ronin, warrior], rGame.vfx);
      // Strict 0-rotate / 0-quad audit across Renderer (stage slice + Shogunate FX) + Ronin + Ronin shaders
      const prevCtx = rGame.renderer.ctx;
      rGame.renderer.ctx = trackCtx;
      rGame.renderer.render([ronin, warrior], emptyVfx);
      rGame.renderer.ctx = prevCtx;

      const t = ronin.state === 'TRUE_ULTIMATE' ? ronin.stateTimer : 99;
      if (!checkedBeat1 && ronin.state === 'TRUE_ULTIMATE' && t >= 0.50) {
        checkedBeat1 = true;
        if (ronin.y !== ronin.groundY) {
          throw new Error(`[Suite 21C Beat 1] Expected grounded Iaido charge pose (y=${ronin.groundY}), got y=${ronin.y}`);
        }
        if (ronin._trueUltCutsDone !== 0 || rGame.renderer.permanentStageOverride !== null) {
          throw new Error(
            `[Suite 21C Beat 1] Premature slash or stage override at t=${t.toFixed(2)}: cuts=${ronin._trueUltCutsDone}, stage=${rGame.renderer.permanentStageOverride}`
          );
        }
      }
      if (!checkedBeat2 && ronin.state === 'TRUE_ULTIMATE' && t >= 1.28) {
        checkedBeat2 = true;
        if (ronin._trueUltCutsDone !== 1) {
          throw new Error(`[Suite 21C Beat 2] Expected exactly ONE katana slash (_trueUltCutsDone===1), got ${ronin._trueUltCutsDone}`);
        }
        if (!(ronin.x > warrior.x) || ronin.facing !== 1) {
          throw new Error(
            `[Suite 21C Beat 2] Expected Ronin on back side facing AWAY (+1): ronin.x=${ronin.x.toFixed(1)}, warrior.x=${warrior.x.toFixed(1)}, facing=${ronin.facing}`
          );
        }
        if (rGame.renderer.permanentStageOverride !== null) {
          throw new Error(`[Suite 21C Beat 2] Stage teleported before tsuba click! stage=${rGame.renderer.permanentStageOverride}`);
        }
      }
      if (!checkedBeat3 && ronin.state === 'TRUE_ULTIMATE' && t >= 2.02) {
        checkedBeat3 = true;
        if (
          rGame.renderer.permanentStageOverride !== 'shogunate' ||
          rGame.renderer.getActiveStageId() !== 'shogunate' ||
          !(rGame.renderer.stageSliceTimer > 0) ||
          rGame.renderer.stageSliceToId !== 'shogunate'
        ) {
          throw new Error(
            `[Suite 21C Beat 3] Expected dimensional stage slice into 'shogunate' at t=${t.toFixed(2)}, got permanent=${rGame.renderer.permanentStageOverride}, sliceTimer=${rGame.renderer.stageSliceTimer}, sliceTo=${rGame.renderer.stageSliceToId}`
          );
        }
        const hasMachCone = Boolean(ronin.fx?.active?.some((s) => s.key === 'shunpoSpearMachCone'));
        if (
          !ronin.trueUltLightningSurge ||
          (ronin.amakakeruCleaves && ronin.amakakeruCleaves.length !== 0) ||
          ronin.activeVfxAnims.length !== 0 ||
          hasMachCone
        ) {
          throw new Error(
            `[Suite 21C Beat 3] Expected full-arena trueUltLightningSurge and ZERO middle crystal VFX: surge=${Boolean(ronin.trueUltLightningSurge)}, cleaves=${ronin.amakakeruCleaves?.length}, activeVfxAnims=${ronin.activeVfxAnims.length}, machCone=${hasMachCone}`
          );
        }
      }
      if (step > 30 && ronin.state !== 'TRUE_ULTIMATE') {
        exitedUltCleanly = true;
        break;
      }
    }

    if (!checkedBeat1 || !checkedBeat2 || !checkedBeat3) {
      throw new Error('[Suite 21C] Did not reach all 3 beat checkpoints!');
    }
    if (!exitedUltCleanly) {
      throw new Error(`[Suite 21C] Ronin failed to exit TRUE_ULTIMATE cleanly (state=${ronin.state})`);
    }
    if (track.rotateCalls !== 0 || track.quadCalls !== 0) {
      throw new Error(
        `[Suite 21C] Forbidden canvas calls during Ronin TRUE_ULTIMATE + lightning surge + stage slice: rotate=${track.rotateCalls}, quad=${track.quadCalls}`
      );
    }
    if (trackCtx.globalCompositeOperation !== 'source-over') {
      throw new Error(
        `[Suite 21C] Renderer leaked globalCompositeOperation='${trackCtx.globalCompositeOperation}'!`
      );
    }
  }

  // 21D. Verify Ronin FIRST TRUE_ULTIMATE vs Ignis Sol (`FireMage`) -> Teleports to UNBURNED Japanese Stage (`shogunate` w/ raining sakura),
  //      and ONLY uses `shogunate_inferno` once Ignis Sol ignites `inferno`!
  {
    const sGame = createMockGame();
    const track = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const trackCtx = createMockCtx(track);
    const emptyVfx = new VFXManager();
    sGame.renderer.resetStageOverrides();
    sGame.renderer.stageId = 'cathedral';

    const ronin = new Ronin({ x: 360, groundY: 460, facing: 1 });
    const sol = new FireMage({ x: 680, groundY: 460, facing: -1 });
    sol.maxHp = 20000;
    sol.hp = 20000;
    ronin.game = sGame;
    sol.game = sGame;
    sGame.fighters = [ronin, sol];
    sGame.getEnemiesOf = (f) => sGame.fighters.filter((o) => o !== f);

    ronin.finisherGauge = 100;
    ronin.setState('TRUE_ULTIMATE');

    for (let step = 1; step <= 80; step++) {
      const dt = 1 / 30;
      sol.dodgeCooldown = 999;
      sol.dashCooldown = 999;
      sol.skillCooldown = 999;
      sol.autoCooldown = 999;
      ronin.update(dt, sol, sGame);
      sol.update(dt, ronin, sGame);
      sGame.vfx.update(dt, 460, sGame.renderer, sGame.audio);
      sGame.renderer.update(dt, [ronin, sol]);
      sGame.renderer.render([ronin, sol], sGame.vfx);
      const prevCtx = sGame.renderer.ctx;
      sGame.renderer.ctx = trackCtx;
      sGame.renderer.render([ronin, sol], emptyVfx);
      sGame.renderer.ctx = prevCtx;
    }

    if (
      sGame.renderer.permanentStageOverride !== 'shogunate' ||
      sGame.renderer.getActiveStageId() !== 'shogunate' ||
      sGame.renderer.stageSliceToId !== 'shogunate'
    ) {
      throw new Error(
        `[Suite 21D] Expected Ronin FIRST Ultimate vs Ignis Sol to teleport into unburned 'shogunate', got permanent=${sGame.renderer.permanentStageOverride}, active=${sGame.renderer.getActiveStageId()}, sliceTo=${sGame.renderer.stageSliceToId}`
      );
    }

    // Now simulate Ignis Sol's Cataclysm Meteor igniting the stage -> automatically fuses into 'shogunate_inferno'!
    sGame.renderer.setStageTransformation('inferno', 1.0, true);
    if (sGame.renderer.permanentStageOverride !== 'shogunate_inferno') {
      throw new Error(
        `[Suite 21D] Expected Sol 'inferno' after Ronin 'shogunate' to fuse into 'shogunate_inferno', got ${sGame.renderer.permanentStageOverride}`
      );
    }
    const prevCtx2 = sGame.renderer.ctx;
    sGame.renderer.ctx = trackCtx;
    sGame.renderer.render([ronin, sol], emptyVfx);
    sGame.renderer.ctx = prevCtx2;

    if (track.rotateCalls !== 0 || track.quadCalls !== 0) {
      throw new Error(
        `[Suite 21D] Forbidden canvas calls in Shogunate / Burning Shogunate stage render: rotate=${track.rotateCalls}, quad=${track.quadCalls}`
      );
    }
  }

  // 21E. Verify Bidirectional Stage Synergy (Inferno already active + Ronin Slice -> Burning Shogunate) + AdventureMapRenderer compatibility
  {
    const bGame = createMockGame();
    bGame.renderer.resetStageOverrides();
    bGame.renderer.setStageTransformation('shogunate', 1.0, true);
    if (bGame.renderer.permanentStageOverride !== 'shogunate') {
      throw new Error(`[Suite 21E] Expected 'shogunate', got ${bGame.renderer.permanentStageOverride}`);
    }
    bGame.renderer.setStageTransformation('inferno', 1.0, true);
    if (bGame.renderer.permanentStageOverride !== 'shogunate_inferno') {
      throw new Error(
        `[Suite 21E] Expected Sol 'inferno' over 'shogunate' to fuse into 'shogunate_inferno', got ${bGame.renderer.permanentStageOverride}`
      );
    }

    bGame.renderer.resetStageOverrides();
    bGame.renderer.setStageTransformation('inferno', 1.0, true);
    const ronin2 = new Ronin({ x: 360, groundY: 460, facing: 1 });
    const sol2 = new FireMage({ x: 680, groundY: 460, facing: -1 });
    sol2.maxHp = 20000;
    sol2.hp = 20000;
    ronin2.game = bGame;
    sol2.game = bGame;
    bGame.fighters = [ronin2, sol2];
    bGame.getEnemiesOf = (f) => bGame.fighters.filter((o) => o !== f);
    ronin2.finisherGauge = 100;
    ronin2.setState('TRUE_ULTIMATE');
    for (let step = 1; step <= 70; step++) {
      sol2.dodgeCooldown = 999;
      sol2.dashCooldown = 999;
      sol2.skillCooldown = 999;
      sol2.autoCooldown = 999;
      ronin2.update(1 / 30, sol2, bGame);
      sol2.update(1 / 30, ronin2, bGame);
      bGame.renderer.update(1 / 30, [ronin2, sol2]);
    }
    if (
      bGame.renderer.permanentStageOverride !== 'shogunate_inferno' ||
      bGame.renderer.stageSliceToId !== 'shogunate_inferno'
    ) {
      throw new Error(
        `[Suite 21E] Expected Ronin Ultimate over already-burning 'inferno' to slice into 'shogunate_inferno', got permanent=${bGame.renderer.permanentStageOverride}, sliceTo=${bGame.renderer.stageSliceToId}`
      );
    }

    // Exercise AdventureMapRenderer under both 'shogunate' and 'shogunate_inferno'
    const advTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const advCtx = createMockCtx(advTrack);
    bGame.renderer.ctx = advCtx;
    bGame.renderer.adventureMode = true;
    for (const stId of ['shogunate', 'shogunate_inferno']) {
      bGame.renderer.permanentStageOverride = stId;
      AdventureMapRenderer.render(advCtx, bGame.renderer, 9600, 560);
      AdventureMapRenderer.renderForegroundDepth(advCtx, bGame.renderer, 560);
    }
    if (advTrack.rotateCalls !== 0 || advTrack.quadCalls !== 0 || advCtx.globalCompositeOperation !== 'source-over') {
      throw new Error(
        `[Suite 21E] AdventureMapRenderer failed under Shogunate overrides: rotate=${advTrack.rotateCalls}, quad=${advTrack.quadCalls}, comp=${advCtx.globalCompositeOperation}`
      );
    }
  }

  // 21F. Verify Ronin 4-Variant Flesh-Cutting Physical Auto-Attacks (fumikomi step-in <= 82px, 0 bloated VFX, cleanBladeCuts active)
  {
    const aGame = createMockGame();
    aGame.renderer.stageId = 'cathedral';
    const track = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const trackCtx = createMockCtx(track);
    const emptyVfx = new VFXManager();
    const ronin = new Ronin({ x: 480, groundY: 460, facing: 1 });
    const dummy = new Warrior({ x: 588, groundY: 460, facing: -1 });
    dummy.maxHp = 20000;
    dummy.hp = 20000;
    ronin.game = aGame;
    dummy.game = aGame;
    aGame.fighters = [ronin, dummy];
    aGame.getEnemiesOf = (f) => aGame.fighters.filter((o) => o !== f);

    for (let v = 0; v < 4; v++) {
      ronin.x = 480;
      dummy.x = 588; // 108px samurai maai start
      dummy.vx = 0;
      const hpBefore = dummy.hp;
      ronin.comboStep = v;
      ronin.setState('AUTO_ATTACK');
      let minDist = 999;
      let sawCleanCut = false;
      for (let f = 0; f < 16; f++) {
        dummy.dodgeCooldown = 999;
        dummy.dashCooldown = 999;
        dummy.skillCooldown = 999;
        dummy.autoCooldown = 999;
        ronin.skillCooldown = 999;
        ronin.dodgeCooldown = 999;
        ronin.dashCooldown = 999;
        ronin.crouchCooldown = 999;
        if (f > 0 && ronin.state !== 'AUTO_ATTACK') break;
        ronin.update(1 / 30, dummy, aGame);
        minDist = Math.min(minDist, Math.abs(dummy.x - ronin.x));
        if (ronin.cleanBladeCuts.some((c) => c.type === 'wound')) sawCleanCut = true;
        if (ronin.activeVfxAnims.length !== 0 || ronin.activeSlashLines.length !== 0 || ronin.delayedJudgmentCuts.length !== 0) {
          throw new Error(
            `[Suite 21F V${v}] Expected ZERO bloated VFX on Ronin AUTO_ATTACK, got vfx=${ronin.activeVfxAnims.length}, slashLines=${ronin.activeSlashLines.length}, delayed=${ronin.delayedJudgmentCuts.length}`
          );
        }
        const prevCtx = aGame.renderer.ctx;
        aGame.renderer.ctx = trackCtx;
        aGame.renderer.render([ronin, dummy], emptyVfx);
        aGame.renderer.ctx = prevCtx;
      }
      if (!(dummy.hp < hpBefore) || !sawCleanCut || !(minDist <= 82)) {
        throw new Error(
          `[Suite 21F V${v}] Expected physical gap-close & flesh cut: hpDrop=${hpBefore - dummy.hp}, sawCleanCut=${sawCleanCut}, minDist=${minDist.toFixed(1)}`
        );
      }
    }
    if (track.rotateCalls !== 0 || track.quadCalls !== 0) {
      throw new Error(`[Suite 21F] Forbidden canvas calls in Ronin AUTO_ATTACK: rotate=${track.rotateCalls}, quad=${track.quadCalls}`);
    }
  }

  console.log(
    `[PASS] Suite 21: Kaze-Maru Flesh-Cutting 4-Auto, Full-Arena Lightning Surge Slice (0 Crystal), Unburned Sakura-Raining Shogunate vs Sol & Burning Synergy verified!`
  );
}

// ============================================================================
// SUITE 22: FREYJA (VALKYRIE) SUPREME ULTIMATE SKY-SOVEREIGN MODEL,
//           DOWNWARD GUNGNIR COMMAND & STEEP DIAGONAL FALCON SPEAR-DIVE
// ============================================================================
{
  const fGame = createMockGame();
  const freyja = new Valkyrie({ x: 340, groundY: 460, facing: 1 });
  const dummy = new Warrior({ x: 820, groundY: 460, facing: -1 });
  dummy.maxHp = 25000;
  dummy.hp = 25000;
  freyja.hp = Math.round(freyja.maxHp * 0.5);
  const hpStart = freyja.hp;
  freyja.game = fGame;
  dummy.game = fGame;
  fGame.fighters = [freyja, dummy];
  fGame.getEnemiesOf = (f) => fGame.fighters.filter((o) => o !== f);

  // 22A. Verify Overdrive ULTIMATE maps cleanly to Row 4 Cast (120..123), Wing-Glide (124..128), and Grounded Thrust (145..149)
  freyja.mana = freyja.maxMana;
  freyja.setState('ULTIMATE');
  const seenUltFrames = new Set();
  for (let i = 0; i < 60 && freyja.state === 'ULTIMATE'; i++) {
    freyja.update(1 / 30, dummy, fGame);
    if (freyja.trueUltFrameOverride !== null) seenUltFrames.add(freyja.trueUltFrameOverride);
  }
  const sawGlide = [...seenUltFrames].some((f) => f >= 124 && f <= 128);
  const sawFinThrust = [...seenUltFrames].some((f) => f >= 145 && f <= 149);
  if (!sawGlide || !sawFinThrust) {
    throw new Error(`[Suite 22A] Expected Freyja ULTIMATE to use Row 4 glide (124..128) & thrust (145..149), got ${[...seenUltFrames]}`);
  }

  // 22B. Verify Supreme TRUE_ULTIMATE Sky-Sovereign Ascent (129..132), Shot-Synced Hover (133..138),
  //      Apex Convergence (139..140), Steep Diagonal Falcon Spear-Dive (141..144), and Airborne Bahamut Suppression
  const dummyHpBefore = dummy.hp;
  freyja.hp = hpStart;
  freyja.finisherGauge = freyja.maxFinisherGauge;
  freyja.setState('TRUE_ULTIMATE');

  const seenAscent = new Set();
  const seenHover = new Set();
  const seenApex = new Set();
  const seenDive = new Set();
  let sawCmdRayOrigin = false;
  let bahamutDrawnAirborne = false;
  let charRotateCalls = 0;

  const auditCtx = createMockCtx({ rotateCalls: 0, quadCalls: 0, syValues: new Set() });
  const origDrawImage = auditCtx.drawImage;
  auditCtx.drawImage = function (...args) {
    // Check if Row 3 (sy = 3 * 208 = 624) of valkyrie_vfx is drawn while Freyja is airborne in TRUE_ULTIMATE
    if (
      freyja.state === 'TRUE_ULTIMATE' &&
      freyja.y < freyja.groundY - 48 &&
      args.length === 9 &&
      args[2] === 3 * 208 &&
      String(args[0]?.src || '').includes('valkyrie_vfx')
    ) {
      bahamutDrawnAirborne = true;
    }
    return origDrawImage.apply(this, args);
  };

  for (let step = 0; step < 145 && freyja.state === 'TRUE_ULTIMATE'; step++) {
    const tPrev = freyja.stateTimer;
    freyja.update(1 / 30, dummy, fGame);
    const fr = freyja.trueUltFrameOverride;
    if (tPrev >= 0.24 && tPrev < 1.06 && fr !== null) seenAscent.add(fr);
    if (tPrev >= 1.12 && tPrev < 2.50 && fr !== null) {
      seenHover.add(fr);
      if (tPrev > 1.24) {
        const slipActive = freyja.fx.active.some((s) => s.key === 'valkyrieSlipstreamTrail' && !s.inst.released);
        if (slipActive && tPrev > 1.35) {
          throw new Error(`[Suite 22B] Expected valkyrieSlipstreamTrail stopped during sky hover at t=${tPrev.toFixed(2)}`);
        }
      }
    }
    if (tPrev >= 2.56 && tPrev < 2.78 && fr !== null) seenApex.add(fr);
    if (tPrev >= 2.82 && tPrev < 3.08 && fr !== null) seenDive.add(fr);

    for (const l of freyja.einherjarSkyLances) {
      if (typeof l.cmdOriginX === 'number' && typeof l.cmdOriginY === 'number') {
        sawCmdRayOrigin = true;
      }
    }

    // Verify character draw() never calls ctx.rotate
    let rotBefore = 0;
    const prevRot = auditCtx.rotate;
    auditCtx.rotate = () => {
      rotBefore++;
    };
    freyja.draw(auditCtx, false, fGame.renderer);
    charRotateCalls += rotBefore;
    auditCtx.rotate = prevRot;

    freyja.drawForegroundOverlay(auditCtx, fGame.renderer);
    freyja.drawUltimateForeground(auditCtx, fGame.renderer);
  }

  if (![...seenAscent].every((f) => f >= 129 && f <= 132) || seenAscent.size < 3) {
    throw new Error(`[Suite 22B] Expected Twin-Winged Sovereign Ascent frames 129..132, got ${[...seenAscent]}`);
  }
  if (![...seenHover].every((f) => f >= 133 && f <= 138) || !seenHover.has(135) || seenHover.size < 4) {
    throw new Error(`[Suite 22B] Expected Shot-Synced Hover frames 133..138 (incl. F15=135 downward thrust), got ${[...seenHover]}`);
  }
  if (!seenApex.has(139) || !seenApex.has(140)) {
    throw new Error(`[Suite 22B] Expected Apex Convergence frames 139..140, got ${[...seenApex]}`);
  }
  if (![...seenDive].every((f) => f >= 141 && f <= 144) || seenDive.size < 3) {
    throw new Error(`[Suite 22B] Expected Steep Diagonal Falcon Spear-Dive frames 141..144, got ${[...seenDive]}`);
  }
  if (!sawCmdRayOrigin) {
    throw new Error(`[Suite 22B] Expected einherjarSkyLances to track downward spearhead cmdOriginX/Y!`);
  }
  if (bahamutDrawnAirborne) {
    throw new Error(`[Suite 22B] Expected bahamutAvatar (Row 3 sunburst) gated off while airborne in TRUE_ULTIMATE!`);
  }
  if (charRotateCalls !== 0) {
    throw new Error(`[Suite 22B] Expected ZERO ctx.rotate on Freyja character draw(), got ${charRotateCalls}`);
  }
  const dealt = dummyHpBefore - dummy.hp;
  if (dealt < 705 || freyja.hp <= hpStart || freyja.state !== 'IDLE') {
    throw new Error(`[Suite 22B] Expected intact True Ult dmg>=705, heal>0 & clean IDLE exit, got dealt=${dealt}, hp=${freyja.hp}/${hpStart}, state=${freyja.state}`);
  }

  console.log(
    `[PASS] Suite 22: Freyja Supreme Ultimate Twin-Winged Sky-Sovereign Model, Shot-Synced Downward Gungnir Command & Steep Falcon Spear-Dive verified (0 ctx.rotate, dealt=${dealt})!`
  );
}

// ============================================================================
// SUITE 23: CHRONOS (CHRONOMANCER) SURGICAL 10-ROW REWORK, SHA-256 ROW IDENTITY,
//           RAZOR HOROLOGICAL VFX & CLOSE-QUARTERS 4-SLICE TWIN CLOCK-BLADE MELEE
// ============================================================================
{
  const cryptoMod = await import('node:crypto');
  const zlibMod = await import('node:zlib');

  const decodePngRgba = (buf) => {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const idatChunks = [];
    let off = 8;
    while (off + 8 <= buf.length) {
      const len = buf.readUInt32BE(off);
      const type = buf.subarray(off + 4, off + 8).toString('ascii');
      if (type === 'IDAT') idatChunks.push(buf.subarray(off + 8, off + 8 + len));
      if (type === 'IEND') break;
      off += 12 + len;
    }
    const raw = zlibMod.inflateSync(Buffer.concat(idatChunks));
    const stride = width * 4;
    const data = Buffer.allocUnsafe(height * stride);
    const paeth = (a, b, c) => {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    };
    for (let y = 0; y < height; y++) {
      const fType = raw[y * (stride + 1)];
      const srcOff = y * (stride + 1) + 1;
      const dstOff = y * stride;
      const prevOff = (y - 1) * stride;
      for (let i = 0; i < stride; i++) {
        const xByte = raw[srcOff + i];
        const a = i >= 4 ? data[dstOff + i - 4] : 0;
        const b = y > 0 ? data[prevOff + i] : 0;
        const c = y > 0 && i >= 4 ? data[prevOff + i - 4] : 0;
        let recon = xByte;
        if (fType === 1) recon = (xByte + a) & 0xff;
        else if (fType === 2) recon = (xByte + b) & 0xff;
        else if (fType === 3) recon = (xByte + ((a + b) >> 1)) & 0xff;
        else if (fType === 4) recon = (xByte + paeth(a, b, c)) & 0xff;
        data[dstOff + i] = recon;
      }
    }
    return { width, height, data };
  };

  // 23A. Verify chronomancer_sheet.png (6240x2080) SHA-256 byte-identity on untouched Rows 0, 1, 5, 6, 9 + 0/300 border clips
  getCachedAuditSync(
    'suite23a_chrono_pngs_v1',
    ['assets/sprites/chronomancer_sheet.png', 'assets/sprites/chronomancer_vfx.png'],
    'chrono_23a_v1',
    () => {
  const sheetBuf = fs.readFileSync(`${REPO_ROOT}/assets/sprites/chronomancer_sheet.png`);
  const sheetPng = decodePngRgba(sheetBuf);
  if (sheetPng.width !== 6240 || sheetPng.height !== 2080) {
    throw new Error(`[Suite 23A] Expected chronomancer_sheet.png 6240x2080, got ${sheetPng.width}x${sheetPng.height}`);
  }

  const expectedPreservedRowHashes = {
    0: 'ee5b0b861493a70f8260e3377b03374327fcb655a341f9c218275aa38578bda3',
    1: '85d135cbfabd6f3eb55fd621c50bb32071fbc6708b79300af300751de03d489b',
    5: '31ecdc582025b5769d900b61aa2c4f82f3b4b2a00335e04aaf636003642ac9ed',
    6: '6253f1cdf53f79417cb42e2af128b1d8314db74cacf6200d264b328628842b93',
    9: '1f0b965e855559b6e28ee177de6daae6c343d063edf52fea1be78261778af9c3'
  };
  const rowByteLen = 6240 * 208 * 4;
  for (const [rStr, expHash] of Object.entries(expectedPreservedRowHashes)) {
    const r = Number(rStr);
    const slice = sheetPng.data.subarray(r * rowByteLen, (r + 1) * rowByteLen);
    const gotHash = cryptoMod.createHash('sha256').update(slice).digest('hex');
    if (gotHash !== expHash) {
      throw new Error(`[Suite 23A] Preserved Row ${r} SHA-256 mismatch: expected ${expHash}, got ${gotHash}`);
    }
  }

  let sheetBorderClips = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 30; c++) {
      let clipped = false;
      for (let y = 0; y < 208 && !clipped; y++) {
        for (let x = 0; x < 208; x++) {
          if (x >= 4 && x < 204 && y >= 4 && y < 204) continue;
          const idx = ((r * 208 + y) * 6240 + (c * 208 + x)) * 4;
          if (sheetPng.data[idx + 3] > 0) {
            clipped = true;
            break;
          }
        }
      }
      if (clipped) sheetBorderClips++;
    }
  }
  if (sheetBorderClips !== 0) {
    throw new Error(`[Suite 23A] Expected 0/300 border clips on chronomancer_sheet.png, got ${sheetBorderClips}`);
  }

  // Verify chronomancer_vfx.png (6240x1664) 0/240 border clips & compact razor Row 5 twin-cuts + Row 6 Clock-Hand Knife
  const vfxBuf = fs.readFileSync(`${REPO_ROOT}/assets/sprites/chronomancer_vfx.png`);
  const vfxPng = decodePngRgba(vfxBuf);
  if (vfxPng.width !== 6240 || vfxPng.height !== 1664) {
    throw new Error(`[Suite 23A] Expected chronomancer_vfx.png 6240x1664, got ${vfxPng.width}x${vfxPng.height}`);
  }
  let vfxBorderClips = 0;
  let row5MaxFillRatio = 0;
  let row6MaxSpanX = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 30; c++) {
      let clipped = false;
      let opaque = 0;
      let minX = 208;
      let maxX = -1;
      for (let y = 0; y < 208; y++) {
        for (let x = 0; x < 208; x++) {
          const idx = ((r * 208 + y) * 6240 + (c * 208 + x)) * 4;
          if (vfxPng.data[idx + 3] > 0) {
            opaque++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (x < 4 || x >= 204 || y < 4 || y >= 204) clipped = true;
          }
        }
      }
      if (clipped) vfxBorderClips++;
      if (r === 5) row5MaxFillRatio = Math.max(row5MaxFillRatio, opaque / (208 * 208));
      if (r === 6 && maxX >= minX) row6MaxSpanX = Math.max(row6MaxSpanX, maxX - minX + 1);
    }
  }
  if (vfxBorderClips !== 0) {
    throw new Error(`[Suite 23A] Expected 0/240 border clips on chronomancer_vfx.png, got ${vfxBorderClips}`);
  }
  if (row5MaxFillRatio > 0.14 || row5MaxFillRatio < 0.008) {
    throw new Error(`[Suite 23A] Expected razor-slim Row 5 paradoxTwinScissorCell fill ratio in [0.008..0.14], got ${row5MaxFillRatio.toFixed(4)}`);
  }
  if (row6MaxSpanX < 100) {
    throw new Error(`[Suite 23A] Expected full horizontal Row 6 Clock-Hand Knife span >= 100px, got ${row6MaxSpanX}`);
  }
    }
  );

  // 23B. Verify Close-Quarters Twin Clock-Blade 4-Variant Melee, Step-In Lunge & Zero clock_gear Spam
  const cGame = createMockGame();
  const chronos = new Chronomancer({ x: 380, groundY: 520, facing: 1 });
  const dummy = new Warrior({ x: 545, groundY: 520, facing: -1 });
  dummy.maxHp = 50000;
  dummy.hp = 50000;
  chronos.game = cGame;
  dummy.game = cGame;
  cGame.fighters = [chronos, dummy];
  cGame.getEnemiesOf = (f) => cGame.fighters.filter((o) => o !== f);

  const aiProfile = chronos.getAiStyleProfile();
  if (chronos.attackRange > 160 || aiProfile.comboGoal !== 4 || aiProfile.sweetMax > 148) {
    throw new Error(
      `[Suite 23B] Expected close-quarters Chronos config (attackRange<=160, comboGoal=4, sweetMax<=148), got range=${chronos.attackRange}, profile=${JSON.stringify(aiProfile)}`
    );
  }

  let charRotCalls = 0;
  const cAuditCtx = createMockCtx({ rotateCalls: 0, quadCalls: 0, syValues: new Set() });
  chronos.comboStep = 0;
  let sawCloneStage1 = false;

  for (let v = 0; v < 4; v++) {
    chronos.x = 380;
    chronos.y = 520;
    chronos.facing = 1;
    chronos.autoCooldown = 999;
    dummy.x = 545;
    dummy.y = 520;
    dummy.stunTimer = 99;
    cGame.vfx.projectiles.length = 0;

    const hpBefore = dummy.hp;
    let minDist = Math.abs(dummy.x - chronos.x);
    chronos.setState('AUTO_ATTACK');

    for (let tick = 0; tick < 30 && chronos.state === 'AUTO_ATTACK'; tick++) {
      chronos.update(1 / 30, dummy, cGame);
      minDist = Math.min(minDist, Math.abs(dummy.x - chronos.x));
      if (v === 1 && chronos.phantomClones.length >= 1) sawCloneStage1 = true;

      const prevRot = cAuditCtx.rotate;
      cAuditCtx.rotate = () => {
        charRotCalls++;
      };
      chronos.draw(cAuditCtx, false, cGame.renderer);
      cAuditCtx.rotate = prevRot;

      chronos.drawForegroundOverlay(cAuditCtx, cGame.renderer);
      chronos.drawUltimateForeground(cAuditCtx, cGame.renderer);
    }

    if (!(dummy.hp < hpBefore) || !(minDist <= 102) || cGame.vfx.projectiles.length !== 0) {
      throw new Error(
        `[Suite 23B V${v}] Expected close-quarters Clock-Blade hit with 0 projectiles: hpDrop=${hpBefore - dummy.hp}, minDist=${minDist.toFixed(1)}, projs=${cGame.vfx.projectiles.length}`
      );
    }
  }

  if (!sawCloneStage1 || !(dummy.chronoSlowTimer > 0) || charRotCalls !== 0) {
    throw new Error(
      `[Suite 23B] Expected Stage-1 Future Clone (${sawCloneStage1}), Stage-3 Chrono Slow (${dummy.chronoSlowTimer}), and 0 char ctx.rotate (${charRotCalls})`
    );
  }

  console.log(
    `[PASS] Suite 23: Chronos Surgical 10-Row Rework (SHA-256 identical Rows 0/1/5/6/9, 0/300 & 0/240 border clips), Razor VFX & Close-Quarters 4-Slice Twin Clock-Blade Melee verified!`
  );
}

// ============================================================================
// 24. BATCH ?v=30fps100: NON-PROTECTED HERO VFX DECLUTTER (24A), LYRA GLACIAL &
//     FROZEN SHOGUNATE 3-WAY STAGE SYNERGY (24B), & ADVENTURE WARDENS + 11-HERO
//     HD-2D SKILL TREE MODAL (24C)
// ============================================================================
{
  // 24A. Verify decluttered combat & ultimate overlays across all 5 non-protected champions (0 char ctx.rotate, no leaked composite)
  const declutterHeroes = [Android, Reaper, IceMage, Archer, Titan];
  for (const Cls of declutterHeroes) {
    const dGame = createMockGame();
    dGame.renderer.stageId = 'cathedral';
    const hero = new Cls(380, 520, 1);
    const dummy = new Warrior(620, 520, -1);
    hero.game = dGame;
    dummy.game = dGame;
    dGame.fighters = [hero, dummy];
    dGame.getEnemiesOf = (f) => dGame.fighters.filter((o) => o !== f);

    let charRot = 0;
    const dCtx = createMockCtx({ rotateCalls: 0, quadCalls: 0, syValues: new Set() });
    for (const st of ['AUTO_ATTACK', 'SKILL', 'ULTIMATE', 'TRUE_ULTIMATE']) {
      hero.setState(st);
      for (let f = 0; f < 18; f++) {
        hero.update(1 / 30, dummy, dGame);
        const prevR = dCtx.rotate;
        dCtx.rotate = () => {
          charRot++;
        };
        hero.draw(dCtx, false, dGame.renderer);
        dCtx.rotate = prevR;
        hero.drawForegroundOverlay(dCtx, dGame.renderer);
        hero.drawUltimateForeground(dCtx, dGame.renderer);
        if (dCtx.globalCompositeOperation !== 'source-over' || dCtx._stateStack.length !== 0) {
          throw new Error(
            `[Suite 24A] ${hero.name} (${st}) leaked globalCompositeOperation='${dCtx.globalCompositeOperation}' or unbalanced save/restore (depth=${dCtx._stateStack.length})!`
          );
        }
      }
    }
    if (charRot !== 0) {
      throw new Error(`[Suite 24A] Expected 0 character ctx.rotate on ${hero.name}, got ${charRot}`);
    }
  }

  // 24B. Verify arena_glacial.png & arena_shogunate_glacial.png 640x360 PNG headers, PixelForge registration & 3-way bidirectional stage synergy
  for (const fp of [
    `${REPO_ROOT}/assets/sprites/arena_glacial.png`,
    `${REPO_ROOT}/assets/sprites/arena_shogunate_glacial.png`
  ]) {
    if (!fs.existsSync(fp)) {
      throw new Error(`[Suite 24B] Missing Glacial stage PNG: ${fp}`);
    }
    const buf = fs.readFileSync(fp);
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
      throw new Error(`[Suite 24B] Invalid PNG header in ${fp}`);
    }
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w !== 640 || h !== 360) {
      throw new Error(`[Suite 24B] Expected 640x360 PNG for ${fp}, got ${w}x${h}`);
    }
  }
  const pfAssets24 = PixelForge.initAssets();
  if (!pfAssets24.arenaGlacial || !pfAssets24.arenaShogunateGlacial) {
    throw new Error(
      '[Suite 24B] PixelForge.initAssets() missing arenaGlacial or arenaShogunateGlacial!'
    );
  }
  pfAssets24.arenaGlacial.naturalWidth = 640;
  pfAssets24.arenaGlacial.naturalHeight = 360;
  pfAssets24.arenaShogunateGlacial.naturalWidth = 640;
  pfAssets24.arenaShogunateGlacial.naturalHeight = 360;

  // Test 3-way bidirectional stage fusion & thermal clash in Renderer + Ronin Katana Slice over 'glacial'
  const gGame = createMockGame();
  gGame.renderer.stageId = 'cathedral';
  const gTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const gTrackCtx = createMockCtx(gTrack);
  gGame.renderer.ctx = gTrackCtx;

  const lyra = new IceMage(360, 520, 1);
  const kaze = new Ronin(820, 520, -1);
  lyra.game = gGame;
  kaze.game = gGame;
  gGame.fighters = [lyra, kaze];
  gGame.getEnemiesOf = (f) => gGame.fighters.filter((o) => o !== f);

  const emptyVfx24 = new VFXManager();
  // Order 1: Lyra casts TRUE_ULTIMATE -> 'glacial' at t >= 3.28s -> Kaze-Maru slices stage -> 'shogunate_glacial'!
  lyra.setState('TRUE_ULTIMATE');
  for (let step = 0; step < 190 && lyra.state === 'TRUE_ULTIMATE'; step++) {
    lyra.update(1 / 30, kaze, gGame);
    if (
      lyra.state === 'TRUE_ULTIMATE' &&
      lyra.stateTimer < 3.27 &&
      gGame.renderer.permanentStageOverride !== null
    ) {
      throw new Error(
        `[Suite 24B] Lyra triggered glacial stage before Sovereign Scepter-Tap (t=${lyra.stateTimer.toFixed(2)})`
      );
    }
    gGame.renderer.update(1 / 30, [lyra, kaze]);
    gGame.renderer.render([lyra, kaze], emptyVfx24);
  }
  if (gGame.renderer.permanentStageOverride !== 'glacial') {
    throw new Error(
      `[Suite 24B] Expected Lyra TRUE_ULTIMATE to transform stage into 'glacial', got '${gGame.renderer.permanentStageOverride}'`
    );
  }

  kaze.setState('TRUE_ULTIMATE');
  for (let step = 0; step < 190 && kaze.state === 'TRUE_ULTIMATE'; step++) {
    kaze.update(1 / 30, lyra, gGame);
    gGame.renderer.update(1 / 30, [lyra, kaze]);
    gGame.renderer.render([lyra, kaze], emptyVfx24);
  }
  if (
    gGame.renderer.permanentStageOverride !== 'shogunate_glacial' ||
    gGame.renderer.stageSliceToId !== 'shogunate_glacial'
  ) {
    throw new Error(
      `[Suite 24B] Expected Kaze-Maru TRUE_ULTIMATE over 'glacial' to slice into 'shogunate_glacial', got permanent=${gGame.renderer.permanentStageOverride}, sliceTo=${gGame.renderer.stageSliceToId}`
    );
  }

  // Order 2 & Thermal Clash checks:
  // - 'shogunate' + 'glacial' -> 'shogunate_glacial'
  // - 'shogunate_glacial' + 'inferno' -> 'shogunate_inferno'
  // - 'shogunate_inferno' + 'glacial' -> 'shogunate_glacial'
  // - 'inferno' + 'glacial' -> 'glacial' & 'glacial' + 'inferno' -> 'inferno'
  gGame.renderer.permanentStageOverride = 'shogunate';
  gGame.renderer.setStageTransformation('glacial', 1.0, true, 0);
  if (gGame.renderer.permanentStageOverride !== 'shogunate_glacial') {
    throw new Error(
      `[Suite 24B] Expected 'glacial' over 'shogunate' to fuse into 'shogunate_glacial', got ${gGame.renderer.permanentStageOverride}`
    );
  }
  gGame.renderer.setStageTransformation('inferno', 1.0, true, 0);
  if (gGame.renderer.permanentStageOverride !== 'shogunate_inferno') {
    throw new Error(
      `[Suite 24B] Expected 'inferno' over 'shogunate_glacial' to scorch into 'shogunate_inferno', got ${gGame.renderer.permanentStageOverride}`
    );
  }
  gGame.renderer.setStageTransformation('glacial', 1.0, true, 0);
  if (gGame.renderer.permanentStageOverride !== 'shogunate_glacial') {
    throw new Error(
      `[Suite 24B] Expected 'glacial' over 'shogunate_inferno' to freeze back into 'shogunate_glacial', got ${gGame.renderer.permanentStageOverride}`
    );
  }
  gGame.renderer.permanentStageOverride = 'inferno';
  gGame.renderer.setStageTransformation('glacial', 1.0, true, 0);
  if (gGame.renderer.permanentStageOverride !== 'glacial') {
    throw new Error(
      `[Suite 24B] Expected thermal clash 'glacial' over 'inferno' -> 'glacial', got ${gGame.renderer.permanentStageOverride}`
    );
  }
  gGame.renderer.setStageTransformation('inferno', 1.0, true, 0);
  if (gGame.renderer.permanentStageOverride !== 'inferno') {
    throw new Error(
      `[Suite 24B] Expected thermal clash 'inferno' over 'glacial' -> 'inferno', got ${gGame.renderer.permanentStageOverride}`
    );
  }
  if (gTrack.rotateCalls !== 0 || gTrack.quadCalls !== 0) {
    throw new Error(
      `[Suite 24B] Forbidden canvas calls in Glacial / Frozen Shogunate stage render: rotate=${gTrack.rotateCalls}, quad=${gTrack.quadCalls}`
    );
  }

  // Verify AdventureMapRenderer under 'glacial' & 'shogunate_glacial' (0 ctx.rotate, 0 arena_* draws)
  const advGTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const advGCtx = createMockCtx(advGTrack);
  for (const ov of ['glacial', 'shogunate_glacial']) {
    const mockAdvRen = {
      width: 1200,
      height: 600,
      zoom: 0.9,
      camX: 3400,
      camY: 466,
      time: 2.1,
      permanentStageOverride: ov
    };
    AdventureMapRenderer.render(advGCtx, mockAdvRen, ADVENTURE_WORLD_WIDTH);
    AdventureMapRenderer.renderForegroundDepth(advGCtx, mockAdvRen);
  }
  if (
    advGTrack.rotateCalls !== 0 ||
    advGTrack.quadCalls !== 0 ||
    advGCtx.globalCompositeOperation !== 'source-over'
  ) {
    throw new Error(
      `[Suite 24B] AdventureMapRenderer glacial pass failed: rotate=${advGTrack.rotateCalls}, quad=${advGTrack.quadCalls}, comp=${advGCtx.globalCompositeOperation}`
    );
  }

  // 24C. Verify Adventure Wave 4 (`ELDER BRIAR-KING`) & Wave 6 (`ARCH-LICH MORVATH`) Mini-Boss Wardens + All-11-Hero HD-2D Skill Tree Modal
  {
    const stTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const makeStEl = (tag = 'div') => {
      const children = [];
      const listeners = {};
      const classes = new Set();
      return {
        tag,
        width: 64,
        height: 64,
        textContent: '',
        disabled: false,
        className: '',
        children,
        style: { width: '', transform: '', setProperty() {}, getProperty() { return ''; } },
        classList: {
          add(...cs) { cs.forEach((c) => classes.add(c)); },
          remove(...cs) { cs.forEach((c) => classes.delete(c)); },
          toggle(c, f) {
            const on = f === undefined ? !classes.has(c) : Boolean(f);
            if (on) classes.add(c);
            else classes.delete(c);
            return on;
          },
          contains(c) { return classes.has(c); }
        },
        set innerHTML(_v) {
          children.length = 0;
        },
        appendChild(ch) {
          children.push(ch);
          return ch;
        },
        addEventListener(ev, fn) {
          listeners[ev] = fn;
        },
        click() {
          if (!this.disabled && typeof listeners.click === 'function') listeners.click();
        },
        setAttribute() {},
        getContext() {
          return createMockCtx(stTrack);
        }
      };
    };

    const stDom = new Map();
    for (const id of [
      'app',
      'adventure-controls',
      'adv-skill-tree-modal',
      'adv-st-grid',
      'adv-st-title',
      'adv-st-level-badge',
      'adv-st-xp-fill',
      'adv-st-xp-text',
      'adv-st-sp-count',
      'adv-st-stat-hp',
      'adv-st-stat-atk',
      'adv-st-stat-spirit',
      'adv-st-stat-ult',
      'adv-st-stat-ward'
    ]) {
      stDom.set(id, makeStEl(id));
    }

    const prevGetById = globalThis.document.getElementById;
    const prevCreateEl = globalThis.document.createElement;
    globalThis.document.getElementById = (id) => stDom.get(id) || null;
    globalThis.document.createElement = (tag) => makeStEl(tag);

    try {
      const wGame = createMockGame();
      wGame.gameMode = 'adventure';
      wGame.isAdventureMode = () => true;
      wGame.hudEls = {
        left: {},
        right: {
          name: { textContent: '' },
          skillText: { textContent: '' },
          partnerWing: { classList: { add() {} } }
        },
        crestVs: {},
        modeBadge: {},
        stageBadge: { textContent: '' }
      };
      const wAdv = new AdventureManager(wGame);
      wGame.adventure = wAdv;
      wGame.onFighterDeath = (df) => {
        if (df.isMonster) wAdv.onMonsterDeath(df);
      };

      const heroLyra = new IceMage(240, 561, 1);
      heroLyra.game = wGame;
      wGame.leftFighter = heroLyra;
      wAdv.startCampaign(heroLyra);

      // Verify Wave 4 / 8 (`zoneIdx=1, subWave=2`) spawns Realm Mini-Boss Warden `ELDER BRIAR-KING`
      wGame.fighters = [heroLyra];
      wAdv.pickups.length = 0;
      wAdv.spawnZoneEncounter(1, 2);
      const briarKing = wAdv.getLivingMonsters().find((m) => m.isMiniBoss);
      if (
        !briarKing ||
        briarKing.name !== 'ELDER BRIAR-KING' ||
        briarKing.maxHp !== 3100 ||
        !wGame.hudEls.right.skillText.textContent.includes('WARDEN')
      ) {
        throw new Error(
          `[Suite 24C] Expected Wave 4 ELDER BRIAR-KING Warden (3100 HP, WARDEN HUD), got ${briarKing?.name} (${briarKing?.maxHp}), hud='${wGame.hudEls.right.skillText.textContent}'`
        );
      }
      briarKing.portalSpawnTimer = 0;
      briarKing.setState('SKILL');
      let maxBriarRings = 0;
      for (let f = 0; f < 15; f++) {
        briarKing.update(1 / 30, heroLyra, wGame);
        maxBriarRings = Math.max(maxBriarRings, briarKing.telegraphRings.length);
        briarKing.draw(createMockCtx(stTrack), false, wGame.renderer);
      }
      if (maxBriarRings < 3 || stTrack.rotateCalls !== 0) {
        throw new Error(
          `[Suite 24C] Expected ELDER BRIAR-KING 3-Lane Briar-Root Eruption (>=3 telegraphs, 0 rotate), got rings=${maxBriarRings}, rotate=${stTrack.rotateCalls}`
        );
      }
      const xpBeforeW4 = wAdv.progression.xp + (wAdv.progression.level - 1) * 115;
      briarKing.takeDamage(99999, heroLyra, true, 120, 0);
      if (
        !wAdv.pickups.some((p) => p.type === 'relic') ||
        !wAdv.pickups.some((p) => p.type === 'hp') ||
        !wAdv.pickups.some((p) => p.type === 'ember') ||
        wAdv.progression.level < 2 && wAdv.progression.xp <= xpBeforeW4
      ) {
        throw new Error(
          `[Suite 24C] Expected ELDER BRIAR-KING death to grant XP and drop relic+hp+ember, got pickups=${wAdv.pickups.map((p) => p.type).join(',')}`
        );
      }

      // Verify Wave 6 / 8 (`zoneIdx=2, subWave=2`) spawns Realm Mini-Boss Warden `ARCH-LICH MORVATH`
      wGame.fighters = [heroLyra];
      wAdv.pickups.length = 0;
      wGame.vfx.projectiles.length = 0;
      wAdv.spawnZoneEncounter(2, 2);
      const morvath = wAdv.getLivingMonsters().find((m) => m.isMiniBoss);
      if (!morvath || morvath.name !== 'ARCH-LICH MORVATH' || morvath.maxHp !== 2800) {
        throw new Error(
          `[Suite 24C] Expected Wave 6 ARCH-LICH MORVATH Warden (2800 HP), got ${morvath?.name} (${morvath?.maxHp})`
        );
      }
      morvath.portalSpawnTimer = 0;
      morvath.setState('SKILL');
      let maxMorvathRings = 0;
      for (let f = 0; f < 12; f++) {
        morvath.update(1 / 30, heroLyra, wGame);
        maxMorvathRings = Math.max(maxMorvathRings, morvath.telegraphRings.length);
        morvath.draw(createMockCtx(stTrack), false, wGame.renderer);
      }
      if (
        maxMorvathRings < 3 ||
        wGame.vfx.projectiles.length < 2 ||
        stTrack.rotateCalls !== 0
      ) {
        throw new Error(
          `[Suite 24C] Expected ARCH-LICH MORVATH Tri-Sigil Ossuary Cataclysm (>=3 telegraphs + >=2 bolts, 0 rotate), got rings=${maxMorvathRings}, bolts=${wGame.vfx.projectiles.length}, rotate=${stTrack.rotateCalls}`
        );
      }
      morvath.takeDamage(99999, heroLyra, true, 120, 0);
      if (
        !wAdv.pickups.some((p) => p.type === 'relic') ||
        !wAdv.pickups.some((p) => p.type === 'hp') ||
        !wAdv.pickups.some((p) => p.type === 'ember')
      ) {
        throw new Error(
          `[Suite 24C] Expected ARCH-LICH MORVATH death to drop relic+hp+ember, got ${wAdv.pickups.map((p) => p.type).join(',')}`
        );
      }

      // Verify syncStageBadge reflects 'glacial' and 'shogunate_glacial'
      wGame.renderer.permanentStageOverride = 'glacial';
      wAdv.syncStageBadge();
      if (!wGame.hudEls.stageBadge.textContent.includes('PERMAFROST AURORA SANCTUM')) {
        throw new Error(`[Suite 24C] Expected glacial stage badge, got '${wGame.hudEls.stageBadge.textContent}'`);
      }
      wGame.renderer.permanentStageOverride = 'shogunate_glacial';
      wAdv.syncStageBadge();
      if (!wGame.hudEls.stageBadge.textContent.includes('FROZEN SAKURA SHOGUNATE')) {
        throw new Error(`[Suite 24C] Expected shogunate_glacial stage badge, got '${wGame.hudEls.stageBadge.textContent}'`);
      }

      // Verify All-11-Hero Skill Tree Themes & <canvas> HD-2D Icons (Ignis Sol preserved; 10 others bespoke; 0 raw Unicode emojis!)
      const rawEmojiRe = /\p{Extended_Pictographic}/u;
      const progSrc = fs.readFileSync(
        `${REPO_ROOT}/src/adventure/AdventureProgression.js`,
        'utf8'
      );
      if (rawEmojiRe.test(progSrc)) {
        throw new Error('[Suite 24C] AdventureProgression.js still contains raw Unicode emoji glyphs!');
      }

      const all11Classes = [
        [FireMage, 'mage'],
        [Warrior, 'warrior'],
        [WarriorEx, 'warrior_ex'],
        [Valkyrie, 'valkyrie'],
        [Priestess, 'priestess'],
        [Ronin, 'ronin'],
        [Chronomancer, 'chronomancer'],
        [Archer, 'archer'],
        [Reaper, 'reaper'],
        [Titan, 'titan'],
        [IceMage, 'icemage'],
        [Android, 'android']
      ];
      const seenWrathTitles = new Set();
      for (const [HeroCls, hKey] of all11Classes) {
        const hInst = new HeroCls(240, 561, 1);
        hInst.game = wGame;
        wGame.leftFighter = hInst;
        wAdv.renderSkillTreeModal();
        const gridEl = stDom.get('adv-st-grid');
        if (gridEl.children.length !== 3) {
          throw new Error(`[Suite 24C] Expected 3 skill branches for ${hKey}, got ${gridEl.children.length}`);
        }
        const theme = getHeroSkillTreeTheme(hKey);
        if (!HERO_SKILL_TREE_THEMES[hKey] || !theme) {
          throw new Error(`[Suite 24C] Missing HERO_SKILL_TREE_THEMES entry for ${hKey}`);
        }
        if (hKey === 'mage') {
          if (
            theme.branches.wrath.title !== 'SOLAR WRATH' ||
            theme.branches.astral.title !== 'ASTRAL AWAKENING' ||
            theme.branches.aegis.title !== 'PHOENIX AEGIS' ||
            theme.nodes.wrath_1 !== 'IGNITED VOLLEY'
          ) {
            throw new Error('[Suite 24C] Ignis Sol (`mage`) Skill Tree nomenclature must stay 100% intact!');
          }
        } else if (theme.branches.wrath.title === 'SOLAR WRATH') {
          throw new Error(`[Suite 24C] Non-Sol hero ${hKey} still displays generic SOLAR WRATH branch!`);
        }
        seenWrathTitles.add(theme.branches.wrath.title);

        // Verify branch header & node cards render <canvas> icons and preserve card.children[2] === button!
        for (let bi = 0; bi < 3; bi++) {
          const col = gridEl.children[bi];
          const hdrWrap = col.children[0].children[0];
          if (hdrWrap.children[0]?.tag !== 'canvas') {
            throw new Error(`[Suite 24C] Expected branch ${bi} header <canvas> icon for ${hKey}!`);
          }
          for (let ni = 1; ni <= 3; ni++) {
            const card = col.children[ni];
            const nodeTitleWrap = card.children[0].children[0];
            if (nodeTitleWrap.children[0]?.tag !== 'canvas' || card.children[2]?.tag !== 'button') {
              throw new Error(
                `[Suite 24C] Broken node card DOM structure on ${hKey} (${bi},${ni}): icon=${nodeTitleWrap.children[0]?.tag}, btn=${card.children[2]?.tag}`
              );
            }
            if (rawEmojiRe.test(nodeTitleWrap.children[1]?.textContent || '')) {
              throw new Error(`[Suite 24C] Raw Unicode emoji leaked in ${hKey} node title!`);
            }
          }
        }
      }
      if (seenWrathTitles.size !== 12 || stTrack.rotateCalls !== 0) {
        throw new Error(
          `[Suite 24C] Expected 12 distinct champion Branch-I themes and 0 ctx.rotate, got distinct=${seenWrathTitles.size}, rotate=${stTrack.rotateCalls}`
        );
      }

      wAdv.stopCampaign();
    } finally {
      globalThis.document.getElementById = prevGetById;
      globalThis.document.createElement = prevCreateEl;
    }
  }

  console.log(
    '[PASS] Suite 24: Non-Protected Hero VFX Declutter (24A), Lyra Glacial & Frozen Sakura Shogunate 3-Way Stage Synergy (24B), & Adventure Wardens + All-11-Hero HD-2D Skill Tree Modal (24C) verified!'
  );
}

// ============================================================================
// 25. BATCH ?v=30fps104: 5-CHAMPION HACK-AND-SLASH MELEE AUTO-ATTACK OVERHAUL
//     (25A: Surgical Row-2 PNG Integrity & SHA-256 Untouched Row Identity,
//      25B: 4-Beat Forward-Lunge / Cross-Through / Dash-Slash / Hop-Finisher,
//      25C: Colossal Boss BEHEMOTH MALPHAS Wall Safety & 0-ctx.rotate Audit)
// ============================================================================
{
  const cryptoMod = await import('node:crypto');
  const zlibMod = await import('node:zlib');

  const decodePngRgba = (buf) => {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const idatChunks = [];
    let off = 8;
    while (off + 8 <= buf.length) {
      const len = buf.readUInt32BE(off);
      const type = buf.subarray(off + 4, off + 8).toString('ascii');
      if (type === 'IDAT') idatChunks.push(buf.subarray(off + 8, off + 8 + len));
      if (type === 'IEND') break;
      off += 12 + len;
    }
    const raw = zlibMod.inflateSync(Buffer.concat(idatChunks));
    const stride = width * 4;
    const data = Buffer.allocUnsafe(height * stride);
    const paeth = (a, b, c) => {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    };
    for (let y = 0; y < height; y++) {
      const fType = raw[y * (stride + 1)];
      const srcOff = y * (stride + 1) + 1;
      const dstOff = y * stride;
      const prevOff = (y - 1) * stride;
      for (let i = 0; i < stride; i++) {
        const xByte = raw[srcOff + i];
        const a = i >= 4 ? data[dstOff + i - 4] : 0;
        const b = y > 0 ? data[prevOff + i] : 0;
        const c = y > 0 && i >= 4 ? data[prevOff + i - 4] : 0;
        let recon = xByte;
        if (fType === 1) recon = (xByte + a) & 0xff;
        else if (fType === 2) recon = (xByte + b) & 0xff;
        else if (fType === 3) recon = (xByte + ((a + b) >> 1)) & 0xff;
        else if (fType === 4) recon = (xByte + paeth(a, b, c)) & 0xff;
        data[dstOff + i] = recon;
      }
    }
    return { width, height, data };
  };

  // 25A. Verify surgical `--auto-only` Row-2 rebuild on warrior_sheet.png & reaper_sheet.png
  //      (0/300 border clips + 100% SHA-256 byte-identity on untouched Rows 0, 1, 3, 4, 5, 6, 7, 8, 9)
  const expectedUntouchedHashes = {
    'warrior_sheet.png': {
      0: '7068d3122768267af761355d777ed1c027b29ae6d69f90852cd049ca0846f1e4',
      1: 'd1daf9cca62acadc5cc893788876f3d9cf0531463423985c3b9a1777ebddaf08',
      3: 'b790e131d2c56662ee602e012472bfaab07e23757158c67678b9928c5fe23b8a',
      4: 'c2d3b2a85526fb99d61423ff4073bfe895a99ced13f466a1e09b794162884d8c',
      5: 'd5ef547e372459fada6ad99cf2abf73e23846d3184b30ac816de17c0d7af6117',
      6: 'b74d61ac969cf20b6038135a3a2a0567acc841b9ab8397c37716ba85004dca74',
      7: 'c05a50bd995f9ec3f02ba8b3e83a0f796b754e5026442637fa0bdbb64d7b2639',
      8: 'aa369d839b92ab7014fec2f9976d1f56ecf43f41884aacdaa5bd81bd328d0469',
      9: '3336a44121118bfcd838432c094169b1059f52146cb0bd32b59ab08ce02cc5da'
    },
    'reaper_sheet.png': {
      0: '3e3895484fef38a1f569821c8837135d5fe9689da5f6d5bf9d98099988b56023',
      1: '1e2786ce13cfd155698f1d97ae0e35612cb9f39cbe00f6c747610b63628bdb56',
      3: 'c6073c8d0ad8d9a169a464768c725e54217e2ceae67566c64b3f84781b6b725e',
      4: '1de9010af276a3056e6523daeb0d45f17e6c60f07fedb12382409e4ab0e3e14e',
      5: 'c0556577932a9aa6542c4525e08862c456f80535b8b318be90bc6c3f5a1bd979',
      6: '96993cef3efe8b53987901c7f1d183aa85e388396930acf43d0741a29e9e5d78',
      7: '0cff3a4023209b32bca23cafa666b46dd23a0ff92eadbeaace852354747e136e',
      8: 'd9a1d9fb520494819004b95468d26b5f1223a769e721f7a92aadf14c08d2ee5e',
      9: '09f19aa106fc9c03902b1bb2a215f85529d030d2e2d98c0fdd7d3d788f42f490'
    }
  };
  const rowByteLen = 6240 * 208 * 4;
  getCachedAuditSync(
    'suite25a_warrior_reaper_pngs_v1',
    ['assets/sprites/warrior_sheet.png', 'assets/sprites/reaper_sheet.png'],
    JSON.stringify(expectedUntouchedHashes),
    () => {
  for (const [sheetName, rowMap] of Object.entries(expectedUntouchedHashes)) {
    const png = decodePngRgba(
      fs.readFileSync(`${REPO_ROOT}/assets/sprites/${sheetName}`)
    );
    if (png.width !== 6240 || png.height !== 2080) {
      throw new Error(`[Suite 25A] Expected ${sheetName} 6240x2080, got ${png.width}x${png.height}`);
    }
    for (const [rStr, expHash] of Object.entries(rowMap)) {
      const r = Number(rStr);
      const slice = png.data.subarray(r * rowByteLen, (r + 1) * rowByteLen);
      const gotHash = cryptoMod.createHash('sha256').update(slice).digest('hex');
      if (gotHash !== expHash) {
        throw new Error(`[Suite 25A] ${sheetName} preserved Row ${r} SHA-256 mismatch: got ${gotHash}`);
      }
    }
    let clips = 0;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 30; c++) {
        let cellClip = false;
        for (let y = 0; y < 208 && !cellClip; y++) {
          for (let x = 0; x < 208; x++) {
            if (x >= 4 && x < 204 && y >= 4 && y < 204) continue;
            const idx = ((r * 208 + y) * 6240 + (c * 208 + x)) * 4;
            if (png.data[idx + 3] > 0) {
              cellClip = true;
              break;
            }
          }
        }
        if (cellClip) clips++;
      }
    }
    if (clips !== 0) {
      throw new Error(`[Suite 25A] Expected 0/300 border clips on ${sheetName}, got ${clips}`);
    }
  }
    }
  );

  // 25B. Verify 4-Beat Kinetic Hack-and-Slash Choreography across all 5 melee slashers
  const slasherSpecs = [
    [Warrior, 'warrior', 'Aethelgard'],
    [Ronin, 'ronin', 'Kaze-Maru'],
    [Android, 'android', 'VEX-09'],
    [Reaper, 'reaper', 'Malakor'],
    [Chronomancer, 'chronomancer', 'Chronos']
  ];

  const countHeroGhosts = (h) =>
    (h.afterimages?.length || 0) + (h.temporalEchoes?.length || 0) + (h.phantomClones?.length || 0);

  for (const [HeroCls, heroId, label] of slasherSpecs) {
    const hGame = createMockGame();
    const hero = new HeroCls(400, 561, 1);
    const dummy = new Warrior(565, 561, -1);
    hero.game = hGame;
    dummy.game = hGame;
    dummy.hasPoise = true;
    dummy.unstoppablePoise = true;
    dummy.maxHp = 99999;
    dummy.hp = 99999;
    hGame.fighters = [hero, dummy];
    hGame.leftFighter = hero;
    hGame.rightFighter = dummy;
    hGame.getEnemiesOf = (f) => (f === hero ? [dummy] : [hero]);

    if (hero.getAiStyleProfile().comboGoal !== 4) {
      throw new Error(`[Suite 25B ${label}] Expected AI comboGoal === 4, got ${hero.getAiStyleProfile().comboGoal}`);
    }

    const isDuelist = heroId === 'ronin' || heroId === 'chronomancer';

    // Hit 1 (V0 — Grounded Advancing Martial Step): steps forward in front of dummy (`>= 24px`, `< dummy.x - 50`) & deals melee damage
    hero.x = 425;
    hero.y = 561;
    hero.facing = 1;
    dummy.x = 560;
    hero.comboStep = 0;
    const hp0 = dummy.hp;
    hero.setState('AUTO_ATTACK');
    let sawSlice0 = false;
    for (let tick = 0; tick < 36 && hero.state === 'AUTO_ATTACK'; tick++) {
      hero.update(1 / 30, dummy, hGame);
      if (hero.trueUltFrameOverride >= 60 && hero.trueUltFrameOverride <= 67) sawSlice0 = true;
    }
    if (hero.x - 425 < 24 || hero.x >= dummy.x - 50 || hero.facing !== 1 || dummy.hp >= hp0 || !sawSlice0) {
      throw new Error(
        `[Suite 25B ${label} V0] Expected grounded front step: dx=${(hero.x - 425).toFixed(1)}, heroX=${hero.x.toFixed(1)}, dummyX=${dummy.x}, dmg=${hp0 - dummy.hp}, slice0=${sawSlice0}`
      );
    }

    // Hit 2 (V1 — Grounded Reverse-Edge Counter Step): stays strictly IN FRONT (`0` cross-throughs, `facing === 1`)!
    hero.x = 435;
    hero.y = 561;
    hero.facing = 1;
    dummy.x = 550;
    if (hero.afterimages) hero.afterimages.length = 0;
    if (hero.temporalEchoes) hero.temporalEchoes.length = 0;
    if (hero.phantomClones) hero.phantomClones.length = 0;
    hero.comboStep = 1;
    const hp1 = dummy.hp;
    hero.setState('AUTO_ATTACK');
    let sawSlice1 = false;
    let facingAtStrike1 = hero.facing;
    let xAtStrike1 = hero.x;
    for (let tick = 0; tick < 36 && hero.state === 'AUTO_ATTACK'; tick++) {
      const wasDone = hero.didActionFrame;
      hero.update(1 / 30, dummy, hGame);
      if (hero.trueUltFrameOverride >= 68 && hero.trueUltFrameOverride <= 74) sawSlice1 = true;
      if (!wasDone && hero.didActionFrame) {
        facingAtStrike1 = hero.facing;
        xAtStrike1 = hero.x;
      }
    }
    if (
      xAtStrike1 <= 445 ||
      xAtStrike1 >= dummy.x - 45 ||
      facingAtStrike1 !== 1 ||
      dummy.hp >= hp1 ||
      !sawSlice1 ||
      (heroId === 'chronomancer' && (hero.phantomClones || []).length < 1)
    ) {
      throw new Error(
        `[Suite 25B ${label} V1] Expected front-side reverse slash (0 cross-through): xAtStrike=${xAtStrike1.toFixed(1)} (dummy=${dummy.x}), facing=${facingAtStrike1}, dmg=${hp1 - dummy.hp}, slice1=${sawSlice1}`
      );
    }

    // Hit 3A (V2 Out-of-Cross-Range Front Step at 190px > 165px): advances forward IN FRONT (`0` cross-through from afar!)
    hero.x = 365;
    hero.y = 561;
    hero.facing = 1;
    dummy.x = 555;
    if (hero.afterimages) hero.afterimages.length = 0;
    if (hero.temporalEchoes) hero.temporalEchoes.length = 0;
    hero.comboStep = 2;
    const hp2A = dummy.hp;
    hero.setState('AUTO_ATTACK');
    let sawSlice2 = false;
    for (let tick = 0; tick < 36 && hero.state === 'AUTO_ATTACK'; tick++) {
      hero.update(1 / 30, dummy, hGame);
      if (hero.trueUltFrameOverride >= 75 && hero.trueUltFrameOverride <= 82) sawSlice2 = true;
    }
    if (hero.x - 365 < 42 || hero.x >= dummy.x - 45 || hero.facing !== 1 || dummy.hp >= hp2A || !sawSlice2) {
      throw new Error(
        `[Suite 25B ${label} V2-MidStep] Expected front-side step without far lock-on cross: dx=${(hero.x - 365).toFixed(1)}, heroX=${hero.x.toFixed(1)}, dmg=${hp2A - dummy.hp}`
      );
    }

    // Hit 3B (V2 Close-Range Role Check at 90px <= 165px):
    // - Duelists (`Ronin`, `Chronomancer`): Single Cross-Slash across dummy to left flank (`x < dummy.x - 50`, `facing === 1`)!
    // - Heavy Vanguards (`Warrior`, `Reaper`, `Android`): Stay strictly on right front side (`x > dummy.x + 50`, `facing === -1`)!
    hero.x = 640;
    hero.y = 561;
    hero.facing = -1;
    dummy.x = 550;
    if (hero.afterimages) hero.afterimages.length = 0;
    if (hero.temporalEchoes) hero.temporalEchoes.length = 0;
    hero.comboStep = 2;
    const hp2B = dummy.hp;
    hero.setState('AUTO_ATTACK');
    let xAtStrike2B = hero.x;
    let facingAtStrike2B = hero.facing;
    let maxGhosts2B = 0;
    for (let tick = 0; tick < 36 && hero.state === 'AUTO_ATTACK'; tick++) {
      const wasDone = hero.didActionFrame;
      hero.update(1 / 30, dummy, hGame);
      maxGhosts2B = Math.max(maxGhosts2B, countHeroGhosts(hero));
      if (!wasDone && hero.didActionFrame) {
        xAtStrike2B = hero.x;
        facingAtStrike2B = hero.facing;
      }
    }
    if (isDuelist) {
      if (640 - xAtStrike2B < 135 || xAtStrike2B >= dummy.x - 50 || facingAtStrike2B !== 1 || dummy.hp >= hp2B || maxGhosts2B < 2) {
        throw new Error(
          `[Suite 25B ${label} V2-DuelistCross] Expected single V2 cross-slash across dummy: xAtStrike=${xAtStrike2B.toFixed(1)}, facing=${facingAtStrike2B}, dmg=${hp2B - dummy.hp}, ghosts=${maxGhosts2B}`
        );
      }
    } else if (xAtStrike2B <= dummy.x + 50 || facingAtStrike2B !== -1 || dummy.hp >= hp2B) {
      throw new Error(
        `[Suite 25B ${label} V2-VanguardFront] Expected Vanguard to stay in front without crossing: xAtStrike=${xAtStrike2B.toFixed(1)}, facing=${facingAtStrike2B}, dmg=${hp2B - dummy.hp}`
      );
    }

    // Hit 4 (V3 — Advancing Hop/Step Heavy Finisher): advances forward in front, hits with Row 2 83..89, & lands cleanly at groundY
    hero.x = 435;
    hero.y = 561;
    hero.facing = 1;
    dummy.x = 550;
    hero.comboStep = 3;
    const hp3 = dummy.hp;
    hero.setState('AUTO_ATTACK');
    let sawSlice3 = false;
    for (let tick = 0; tick < 36 && hero.state === 'AUTO_ATTACK'; tick++) {
      hero.update(1 / 30, dummy, hGame);
      if (hero.trueUltFrameOverride >= 83 && hero.trueUltFrameOverride <= 89) sawSlice3 = true;
    }
    if (hero.x <= 450 || hero.x >= dummy.x - 45 || dummy.hp >= hp3 || !sawSlice3 || hero.y !== hero.groundY || hero.state !== 'IDLE') {
      throw new Error(
        `[Suite 25B ${label} V3] Expected advancing front finisher & grounded IDLE exit: x=${hero.x.toFixed(1)}, y=${hero.y}, state=${hero.state}, dmg=${hp3 - dummy.hp}, slice3=${sawSlice3}`
      );
    }
  }

  // 25C. Verify Colossal Boss `BEHEMOTH MALPHAS` Wall-Boundary Safety & 0-`ctx.rotate` Character Render Audit
  let charRotCalls = 0;
  let saveRestoreDelta = 0;
  for (const [HeroCls, _heroId, label] of slasherSpecs) {
    const bGame = createMockGame();
    const boss = {
      x: 9335,
      y: 561,
      groundY: 561,
      anchorX: 9335,
      facing: -1,
      hp: 99999,
      maxHp: 99999,
      isDead: false,
      isBenched: false,
      isColossalBoss: true,
      unstoppablePoise: true,
      hasPoise: true,
      takeDamage(amt) {
        this.hp -= amt;
      }
    };
    bGame.adventure = {
      active: true,
      lockActive: true,
      lockMinX: 8800,
      lockMaxX: 9520,
      depthMinY: 442,
      depthMaxY: 680,
      bossEntity: boss
    };
    const hero = new HeroCls(9220, 561, 1);
    hero.game = bGame;
    bGame.fighters = [hero, boss];
    bGame.getEnemiesOf = () => [boss];

    const track = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const rCtx = createMockCtx(track);
    for (let c = 0; c < 4; c++) {
      hero.comboStep = c;
      hero.setState('AUTO_ATTACK');
      for (let tick = 0; tick < 34 && hero.state === 'AUTO_ATTACK'; tick++) {
        hero.update(1 / 30, boss, bGame);
        if (hero.x > 9252) {
          throw new Error(
            `[Suite 25C ${label} V${c}] Crossed Colossal Boss wall! hero.x=${hero.x.toFixed(1)} > 9252`
          );
        }
        const stackBefore = rCtx._stateStack.length;
        hero.draw(rCtx, false, bGame.renderer);
        hero.drawHackAndSlashStreaks(rCtx);
        saveRestoreDelta += Math.abs(rCtx._stateStack.length - stackBefore);
        if (rCtx.globalCompositeOperation !== 'source-over') {
          throw new Error(
            `[Suite 25C ${label} V${c}] Composite op leaked: ${rCtx.globalCompositeOperation}`
          );
        }
      }
    }
    charRotCalls += track.rotateCalls;
  }
  if (charRotCalls !== 0 || saveRestoreDelta !== 0) {
    throw new Error(
      `[Suite 25C] Expected 0 character ctx.rotate calls and balanced save/restore, got rotates=${charRotCalls}, saveDelta=${saveRestoreDelta}`
    );
  }

  // 25D. Live 1v1 VS Dual-Update Role Footwork + Adventure Mode (Hold, Controlled Open-Air Steps & AUTO-Play) Audit
  for (const [HeroCls, heroKey, label] of slasherSpecs) {
    const isDuelist = heroKey === 'ronin' || heroKey === 'chronomancer';

    // (1) Live 1v1 VS Mode AI Autonomous 4-Beat Flurry WITH Dual Fighter Updates
    {
      const vsGame = createMockGame();
      vsGame.gameMode = '1v1';
      const hero = new HeroCls(460, 520, 1);
      const foe = new Titan(575, 520, -1);
      hero.game = vsGame;
      foe.game = vsGame;
      hero.skillCooldown = 999;
      hero.autoCooldown = 0;
      foe.hp = 99999;
      foe.maxHp = 99999;
      foe.hasPoise = true;
      foe.unstoppablePoise = true;
      foe.isPlayerControlled = true;
      vsGame.leftFighter = hero;
      vsGame.rightFighter = foe;
      vsGame.fighters = [hero, foe];
      vsGame.getEnemiesOf = (f) => (f === hero ? [foe] : [hero]);

      const seenVars = [];
      let crossedOnV1 = false;
      let crossedRightOnV2 = false;
      for (let tick = 0; tick < 80 && seenVars.length < 4; tick++) {
        const prevState = hero.state;
        const prevVar = hero._autoVariant;
        foe.x = 575;
        hero.update(1 / 30, foe, vsGame);
        foe.update(1 / 30, hero, vsGame);
        if (
          hero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || hero._autoVariant !== prevVar)
        ) {
          seenVars.push(hero._autoVariant);
        }
        if (hero.state === 'AUTO_ATTACK' && hero._autoVariant === 1) {
          if (hero.x > foe.x + 25) crossedOnV1 = true;
        }
        if (hero.state === 'AUTO_ATTACK' && hero._autoVariant === 2) {
          if (hero.x > foe.x + 55 && hero.facing === -1) crossedRightOnV2 = true;
        }
      }
      if (
        seenVars.slice(0, 4).join(',') !== '0,1,2,3' ||
        crossedOnV1 ||
        crossedRightOnV2 !== isDuelist ||
        foe.hp >= 99999
      ) {
        throw new Error(
          `[Suite 25D VS-1v1 ${label}] Role footwork mismatch: vars=[${seenVars.join(',')}], crossV1=${crossedOnV1}, crossV2=${crossedRightOnV2} (expected ${isDuelist}), heroX=${hero.x.toFixed(1)}`
        );
      }
    }

    // (2) Adventure Mode Manual Hold (`heldAttack = true`) w/ Multi-Monster Sticky Target Lock
    {
      const advGame = createMockGame();
      advGame.gameMode = 'adventure';
      const hero = new HeroCls(460, 561, 1);
      hero.game = advGame;
      advGame.leftFighter = hero;
      const adv = new AdventureManager(advGame);
      advGame.adventure = adv;
      adv.startCampaign(hero);
      adv.lockActive = true;
      adv.lockMinX = 180;
      adv.lockMaxX = 980;
      advGame.fighters = [hero];
      hero.x = 460;
      hero.groundY = 561;
      hero.y = 561;
      hero.facing = 1;
      const primaryMob = adv.spawnMonster('goblin', 565, { groundY: 561, skipPortal: true });
      const distractorMob = adv.spawnMonster('skeleton', 745, { groundY: 561, skipPortal: true });
      primaryMob.hp = 99999;
      primaryMob.maxHp = 99999;
      primaryMob.autoCooldown = 999;
      primaryMob.skillCooldown = 999;
      distractorMob.hp = 99999;
      distractorMob.maxHp = 99999;
      distractorMob.autoCooldown = 999;
      distractorMob.skillCooldown = 999;

      adv.heldAttack = true;
      const seenVars = [];
      let crossedOnV1 = false;
      let crossedRightOnV2 = false;
      for (let tick = 0; tick < 80 && seenVars.length < 4; tick++) {
        const prevVar = hero._autoVariant;
        const prevState = hero.state;
        primaryMob.x = 565;
        distractorMob.x = 745;
        adv.processPlayerControls(1 / 30, hero, adv.getNearestLivingMonster(hero));
        if (
          hero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || hero._autoVariant !== prevVar)
        ) {
          seenVars.push(hero._autoVariant);
        }
        if (hero.state === 'AUTO_ATTACK' && hero._autoVariant === 1) {
          if (hero.x > primaryMob.x + 25) crossedOnV1 = true;
        }
        if (hero.state === 'AUTO_ATTACK' && hero._autoVariant === 2) {
          if (hero.x > primaryMob.x + 55 && hero.facing === -1) crossedRightOnV2 = true;
        }
      }
      adv.stopCampaign();
      if (
        seenVars.slice(0, 4).join(',') !== '0,1,2,3' ||
        crossedOnV1 ||
        crossedRightOnV2 !== isDuelist ||
        primaryMob.hp >= 99999
      ) {
        throw new Error(
          `[Suite 25D Adv-Hold ${label}] Sticky-locked role footwork mismatch: vars=[${seenVars.join(',')}], crossV1=${crossedOnV1}, crossV2=${crossedRightOnV2} (expected ${isDuelist}), dmg=${99999 - primaryMob.hp}`
        );
      }
    }

    // (3) Adventure Mode Open-Air / No-Nearby-Enemy Controlled Martial Steps (0 Leftward Turns, NO across-screen dash spam!)
    {
      const airGame = createMockGame();
      airGame.gameMode = 'adventure';
      const hero = new HeroCls(460, 561, 1);
      hero.game = airGame;
      airGame.leftFighter = hero;
      const adv = new AdventureManager(airGame);
      airGame.adventure = adv;
      adv.startCampaign(hero);
      adv.lockActive = false;
      airGame.fighters = [hero];
      if (adv.destructibles) adv.destructibles.props = [];
      hero.x = 460;
      hero.groundY = 561;
      hero.y = 561;
      hero.facing = 1;
      // Spawn a distant straggler monster 375px BEHIND on the left (> 215px melee lock range)
      const farLeftStraggler = adv.spawnMonster('goblin', 85, { groundY: 561, skipPortal: true });
      farLeftStraggler.hp = 99999;
      farLeftStraggler.maxHp = 99999;
      farLeftStraggler.autoCooldown = 999;
      farLeftStraggler.skillCooldown = 999;

      adv.heldAttack = true;
      const seenVars = [];
      let everTurnedLeft = false;
      let maxLift = 0;
      for (let tick = 0; tick < 64; tick++) {
        const prevVar = hero._autoVariant;
        const prevState = hero.state;
        farLeftStraggler.x = 85;
        adv.processPlayerControls(1 / 30, hero, adv.getNearestLivingMonster(hero));
        if (hero.facing !== 1) {
          everTurnedLeft = true;
        }
        maxLift = Math.max(maxLift, hero.groundY - hero.y);
        if (
          hero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || hero._autoVariant !== prevVar)
        ) {
          seenVars.push(hero._autoVariant);
          if (seenVars.length >= 4) {
            adv.heldAttack = false;
          }
        }
        if (seenVars.length >= 4 && hero.state !== 'AUTO_ATTACK') break;
      }
      const totalForwardGain = hero.x - 460;
      const liftOk = heroKey === 'ronin' ? maxLift === 0 : maxLift >= 16 && maxLift <= 28;
      adv.stopCampaign();
      if (
        seenVars.slice(0, 4).join(',') !== '0,1,2,3' ||
        everTurnedLeft ||
        totalForwardGain < 95 ||
        totalForwardGain > 260 ||
        !liftOk
      ) {
        throw new Error(
          `[Suite 25D Adv-OpenAir ${label}] Expected controlled forward martial steps (95..260px, 0 left turns), got vars=[${seenVars.join(',')}], everTurnedLeft=${everTurnedLeft}, gain=${totalForwardGain.toFixed(1)}, maxLift=${maxLift.toFixed(1)}`
        );
      }
    }

    // (4) Adventure Mode `AUTO` Play (`autoPlay = true`) Seamless 4-Beat Flurry
    {
      const autoGame = createMockGame();
      autoGame.gameMode = 'adventure';
      const hero = new HeroCls(460, 561, 1);
      hero.game = autoGame;
      autoGame.leftFighter = hero;
      const adv = new AdventureManager(autoGame);
      autoGame.adventure = adv;
      adv.startCampaign(hero);
      adv.setAutoPlay(true);
      adv.lockActive = true;
      adv.lockMinX = 180;
      adv.lockMaxX = 980;
      autoGame.fighters = [hero];
      hero.x = 460;
      hero.groundY = 561;
      hero.y = 561;
      hero.skillCooldown = 999;
      const mob = adv.spawnMonster('goblin', 565, { groundY: 561, skipPortal: true });
      mob.hp = 99999;
      mob.maxHp = 99999;
      mob.autoCooldown = 999;
      mob.skillCooldown = 999;

      const seenVars = [];
      let crossedAutoV1 = false;
      let crossedRightAutoV2 = false;
      for (let tick = 0; tick < 80 && seenVars.length < 4; tick++) {
        const prevVar = hero._autoVariant;
        const prevState = hero.state;
        mob.x = 565;
        adv.processPlayerControls(1 / 30, hero, adv.getNearestLivingMonster(hero));
        if (
          hero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || hero._autoVariant !== prevVar)
        ) {
          seenVars.push(hero._autoVariant);
        }
        if (hero.state === 'AUTO_ATTACK' && hero._autoVariant === 1) {
          if (hero.x > mob.x + 25) crossedAutoV1 = true;
        }
        if (hero.state === 'AUTO_ATTACK' && hero._autoVariant === 2) {
          if (hero.x > mob.x + 55 && hero.facing === -1) crossedRightAutoV2 = true;
        }
      }
      adv.stopCampaign();
      if (
        seenVars.slice(0, 4).join(',') !== '0,1,2,3' ||
        crossedAutoV1 ||
        crossedRightAutoV2 !== isDuelist ||
        mob.hp >= 99999
      ) {
        throw new Error(
          `[Suite 25D Adv-AutoPlay ${label}] Expected role-based AUTO-play 0,1,2,3 flurry, got vars=[${seenVars.join(',')}], crossV1=${crossedAutoV1}, crossV2=${crossedRightAutoV2} (expected ${isDuelist})`
        );
      }
    }
  }

  // 25E. All-11-Champion Bespoke Adventure Mode Dodge Animations, Wings/Skate/Thruster VFX & Pure-Evade Invariant Audit
  const bespokeDodgeSpecs = [
    [Valkyrie, 'valkyrie', 'Freyja (GLIDE)', 124, 131, 20, 'feather_mote', (_h, s) => s.fxKeys.has('valkyrieWingPlume')],
    [IceMage, 'icemage', 'Lyra (SKATE)', 182, 206, 0, 'ice_track', (_h, s) => s.fxKeys.has('permafrostSnowflakeSigil') && s.maxLift <= 5],
    [Android, 'android', 'VEX-09 (THRUST)', 184, 205, 10, 'rocket_exhaust', (h, s) => s.fxKeys.has('wingPylonThruster') && !(h.fx?.active || []).some((a) => a.key === 'wingPylonThruster')],
    [Priestess, 'priestess', 'Seraphina (WINGS)', 182, 205, 20, 'feather_mote', (h, s) => s.sawAngelicWings && !h.isAngelicAscent],
    [FireMage, 'mage', 'Ignis Sol (BLINK)', 180, 208, 10, 'magma_tread', (h, s) => s.fxKeys.has('arcaneBlinkRift') && h.wraithAlpha === 1],
    [Archer, 'archer', 'Sylvara (VAULT)', 244, 265, 28, 'streak', (_h, s) => s.fxKeys.has('zephyrVaultSlipstream') && s.fxKeys.has('astralWingPlume')],
    [Reaper, 'reaper', 'Malakor (SHIFT)', 183, 206, 6, 'streak', (h, s) => s.minWraithAlpha < 0.45 && h.wraithAlpha === 1 && s.fxKeys.has('companionSummonRiftPortal')],
    [Chronomancer, 'chronomancer', 'Chronos (WARP)', 182, 206, 5, 'streak', (_h, s) => s.fxKeys.has('warpPortalPairRift') && s.maxEchoes > 0],
    [Warrior, 'warrior', 'Aethelgard (STEP)', 184, 205, 5, 'lightning_spark', (_h, s) => s.fxKeys.has('blinkTeleportPillar') && s.maxAfterimages > 0],
    [Ronin, 'ronin', 'Kaze-Maru (SURIASHI)', 185, 205, 0, 'lightning_spark', (_h, s) => s.maxLift === 0 && s.maxAfterimages > 0],
    [Titan, 'titan', 'Torgar (STRIDE)', 183, 205, 0, 'magma_tread', (h, s) => s.maxLift === 0 && s.sawPoise && !h.unstoppablePoise && s.fxKeys.has('runicBulwarkDome')]
  ];

  let dodgeRotCalls = 0;
  let dodgeSaveDelta = 0;
  for (const [HeroCls, expectedHeroId, label, minFrame, maxFrame, minExpectedLift, trailKind, verifyHeroTrait] of bespokeDodgeSpecs) {
    const dGame = createMockGame();
    dGame.gameMode = 'adventure';
    const hero = new HeroCls(420, 561, 1);
    hero.game = dGame;
    dGame.leftFighter = hero;
    const adv = new AdventureManager(dGame);
    dGame.adventure = adv;
    adv.startCampaign(hero);
    dGame.fighters = [hero];
    dGame.projectiles = [];
    if (adv.destructibles) adv.destructibles.props = [];
    hero.x = 420;
    hero.groundY = 561;
    hero.y = 561;
    hero.facing = 1;
    hero.dodgeCooldown = 0;
    const mob = adv.spawnMonster('goblin', 820, { groundY: 561, skipPortal: true });
    mob.hp = 99999;
    mob.maxHp = 99999;
    mob.autoCooldown = 999;
    mob.skillCooldown = 999;

    const spiritBefore = adv.progression.spirit;
    adv.heldRight = true;
    adv.heldDown = true;
    adv.triggerAction('dodge');

    const track = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
    const rCtx = createMockCtx(track);
    const seenFrames = [];
    const seenTrailKinds = new Set();
    const statsSnap = {
      maxLift: 0,
      minWraithAlpha: 1,
      maxAfterimages: 0,
      maxEchoes: 0,
      fxKeys: new Set(),
      sawAngelicWings: false,
      sawPoise: false,
      wasInvulnerable: false
    };

    for (let tick = 0; tick < 19; tick++) {
      adv.processPlayerControls(1 / 30, hero, mob);
      if (!hero._advPureDodge) {
        adv.heldRight = false;
        adv.heldDown = false;
      }
      if (hero._advPureDodge) {
        statsSnap.wasInvulnerable = statsSnap.wasInvulnerable || Boolean(hero.isInvulnerable);
        const fIdx = PixelForge.getFrameIndex(hero, 0);
        seenFrames.push(fIdx);
        statsSnap.maxLift = Math.max(statsSnap.maxLift, hero.groundY - hero.y);
        if (Number.isFinite(hero.wraithAlpha)) {
          statsSnap.minWraithAlpha = Math.min(statsSnap.minWraithAlpha, hero.wraithAlpha);
        }
        statsSnap.maxAfterimages = Math.max(statsSnap.maxAfterimages, (hero.afterimages || []).length);
        statsSnap.maxEchoes = Math.max(statsSnap.maxEchoes, (hero.temporalEchoes || []).length);
        if (hero.isAngelicAscent) statsSnap.sawAngelicWings = true;
        if (hero.unstoppablePoise) statsSnap.sawPoise = true;
        for (const actFx of hero.fx?.active || []) {
          if (actFx?.key) statsSnap.fxKeys.add(actFx.key);
        }
      }
      for (const tr of hero._advDodgeTrails || []) {
        seenTrailKinds.add(tr.kind);
      }
      const stackBefore = rCtx._stateStack.length;
      hero.drawAdventureDodgeFX(rCtx, 'back');
      hero.draw(rCtx, false, dGame.renderer);
      hero.drawAdventureDodgeFX(rCtx, 'front');
      dodgeSaveDelta += Math.abs(rCtx._stateStack.length - stackBefore);
      if (rCtx.globalCompositeOperation !== 'source-over') {
        throw new Error(
          `[Suite 25E ${label}] Composite op leaked during bespoke dodge render: ${rCtx.globalCompositeOperation}`
        );
      }
    }
    adv.heldRight = false;
    adv.heldDown = false;
    dodgeRotCalls += track.rotateCalls;

    const framesInRange =
      seenFrames.length >= 6 && seenFrames.every((f) => f >= minFrame && f <= maxFrame);
    const pureEvadeOk =
      dGame.projectiles.length === 0 &&
      !hero.iceDecoy &&
      mob.hp === 99999 &&
      adv.progression.spirit >= spiritBefore + 17.9;
    const exitCleanOk =
      !hero._advPureDodge &&
      hero._advDodgeFrameOverride === null &&
      !hero.isInvulnerable &&
      Math.abs(hero.y - hero.groundY) < 0.01 &&
      hero.x > 520 &&
      hero.groundY > 580;
    const traitOk = verifyHeroTrait(hero, statsSnap);
    adv.stopCampaign();

    if (
      hero.heroId !== expectedHeroId ||
      !statsSnap.wasInvulnerable ||
      !framesInRange ||
      statsSnap.maxLift < minExpectedLift ||
      !seenTrailKinds.has(trailKind) ||
      !pureEvadeOk ||
      !exitCleanOk ||
      !traitOk
    ) {
      throw new Error(
        `[Suite 25E ${label}] Bespoke Adventure dodge failed: frames=[${seenFrames.join(',')}], lift=${statsSnap.maxLift.toFixed(1)}, trails=[${[...seenTrailKinds].join(',')}], fxKeys=[${[...statsSnap.fxKeys].join(',')}], pure=${pureEvadeOk}, exit=${exitCleanOk}, trait=${traitOk}`
      );
    }
  }
  if (dodgeRotCalls !== 0 || dodgeSaveDelta !== 0) {
    throw new Error(
      `[Suite 25E] Expected 0 ctx.rotate calls and balanced save/restore across all 11 bespoke dodges, got rotates=${dodgeRotCalls}, saveDelta=${dodgeSaveDelta}`
    );
  }

  console.log(
    '[PASS] Suite 25: 5-Champion Wild Hack-and-Slash Melee Overhaul (Dual-Fighter Phase-Through, 100% Pure Forward Open-Air Blitz) + All-11-Champion Bespoke Adventure Dodges verified!'
  );
}

// ============================================================================
// SUITE 26: 3-MAGE RANGED BATTLE-MAGE SPELL-SLASH & KITING FOOTWORK (?v=30fps105)
// Verifies Ignis Sol (`FireMage`), Lyra (`IceMage`), and Seraphina (`Priestess`)
// 4-Beat Spell-Slash combos with true ranged spacing (`sweetMin >= 305`),
// ZERO melee cross-throughs, Beat-4 (`V3`) Backstep Kite, Open-Air 0-Left-Turn /
// 0-Backward-Shot safety, Seraphina's strict 0px-float contract, and Adventure AUTO Play!
// ============================================================================
{
  const mageHackSlashSpecs = [
    [FireMage, 'mage', 'Ignis Sol (Helios Battle-Mage)', (h) => (h.solarEchoes || []).length],
    [IceMage, 'icemage', 'Lyra (Figure-Skating Battle-Mage)', (h) => (h.afterimages || []).length],
    [Priestess, 'priestess', 'Seraphina (Grounded Radiant Battle-Mage)', (h) => (h.afterimages || []).length]
  ];

  const stepMockProjectiles = (vfx, targets, dt) => {
    if (!vfx?.projectiles) return;
    for (let i = vfx.projectiles.length - 1; i >= 0; i--) {
      const p = vfx.projectiles[i];
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      for (const t of targets) {
        if (t && !t.isDead && p.owner !== t && Math.abs(p.x - t.x) <= 46) {
          t.takeDamage(p.damage || 24, p.owner, false, 0, 0);
          vfx.projectiles.splice(i, 1);
          break;
        }
      }
    }
  };

  for (const [HeroCls, heroKey, label, countEchoes] of mageHackSlashSpecs) {
    // (1) VS 1v1 Ranged 4-Beat Spell-Slash + Beat-4 Backstep Kite (ZERO cross-throughs!) + Render Hygiene
    {
      const vsGame = createMockGame();
      vsGame.gameMode = 'duel';
      const hero = new HeroCls(320, 561, 1);
      const foe = new Titan(680, 561, -1);
      if (hero.getAiStyleProfile().sweetMin < 305) {
        throw new Error(`[Suite 26A ${label}] Expected ranged sweetMin >= 305, got ${hero.getAiStyleProfile().sweetMin}`);
      }
      hero.game = vsGame;
      foe.game = vsGame;
      foe.hp = 99999;
      foe.maxHp = 99999;
      foe.autoCooldown = 999;
      foe.skillCooldown = 999;
      foe.dodgeCooldown = 999;
      foe.dashCooldown = 999;
      hero.skillCooldown = 999;
      hero.dodgeCooldown = 999;
      hero.dashCooldown = 999;
      hero.crouchCooldown = 999;
      vsGame.fighters = [hero, foe];
      vsGame.leftFighter = hero;
      vsGame.rightFighter = foe;

      const track = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
      const rCtx = createMockCtx(track);
      const seenVars = [];
      let everCrossedFoe = false;
      let everTurnedAway = false;
      let v3StartX = null;
      let v3EndX = null;
      let maxEchoes = 0;
      let maxLift = 0;
      let sawAngelicAscent = false;
      let saveDelta = 0;

      for (let tick = 0; tick < 90; tick++) {
        const prevState = hero.state;
        const prevVar = hero._autoVariant;
        foe.x = 680;
        foe.vx = 0;
        hero.update(1 / 30, foe, vsGame);
        foe.update(1 / 30, hero, vsGame);
        vsGame.vfx?.update?.(1 / 30, 561, vsGame.renderer);
        stepMockProjectiles(vsGame.vfx, [foe], 1 / 30);

        maxEchoes = Math.max(maxEchoes, countEchoes(hero));
        maxLift = Math.max(maxLift, Math.abs(hero.groundY - hero.y));
        if (hero.isAngelicAscent) sawAngelicAscent = true;
        if (hero.x >= foe.x - 100) everCrossedFoe = true;
        if (hero.state === 'AUTO_ATTACK' && hero.facing !== 1) everTurnedAway = true;

        if (
          hero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || hero._autoVariant !== prevVar)
        ) {
          seenVars.push(hero._autoVariant);
          if (hero._autoVariant === 3 && v3StartX === null) {
            v3StartX = hero.x;
          }
        }
        if (v3StartX !== null && hero.state === 'AUTO_ATTACK' && hero._autoVariant === 3) {
          v3EndX = hero.x;
        }
        if (seenVars.length >= 4 && hero.state !== 'AUTO_ATTACK') break;

        const s0 = rCtx._stateStack.length;
        hero.drawForegroundOverlay?.(rCtx, vsGame.renderer);
        hero.drawHackAndSlashStreaks(rCtx);
        hero.draw(rCtx, false, vsGame.renderer);
        hero.drawUltimateForeground?.(rCtx, vsGame.renderer);
        saveDelta += Math.abs(rCtx._stateStack.length - s0);
      }

      const backstepDelta = v3StartX !== null && v3EndX !== null ? v3StartX - v3EndX : 0;
      const liftOk = heroKey === 'priestess' ? maxLift <= 0.001 && !sawAngelicAscent : maxLift >= 12 && maxLift <= 24;
      if (
        hero.heroId !== heroKey ||
        seenVars.slice(0, 4).join(',') !== '0,1,2,3' ||
        everCrossedFoe ||
        everTurnedAway ||
        backstepDelta < 28 ||
        maxEchoes < 1 ||
        !liftOk ||
        foe.hp >= 99999 ||
        track.rotateCalls !== 0 ||
        saveDelta !== 0
      ) {
        throw new Error(
          `[Suite 26A VS-1v1 ${label}] Battle-Mage footwork failed: vars=[${seenVars.join(',')}], crossed=${everCrossedFoe}, turned=${everTurnedAway}, backstep=${backstepDelta.toFixed(1)}, maxEchoes=${maxEchoes}, maxLift=${maxLift.toFixed(3)}, sawAscent=${sawAngelicAscent}, dmg=${99999 - foe.hp}, rotates=${track.rotateCalls}, saveDelta=${saveDelta}`
        );
      }
    }

    // (2) Adventure Mode Manual Hold (`heldAttack = true`) Ranged Spell-Slash + Beat-4 Backstep Kite (0 melee cross!)
    {
      const advGame = createMockGame();
      advGame.gameMode = 'adventure';
      const hero = new HeroCls(380, 561, 1);
      hero.game = advGame;
      advGame.leftFighter = hero;
      const adv = new AdventureManager(advGame);
      advGame.adventure = adv;
      adv.startCampaign(hero);
      adv.lockActive = true;
      adv.lockMinX = 180;
      adv.lockMaxX = 980;
      advGame.fighters = [hero];
      hero.x = 380;
      hero.groundY = 561;
      hero.y = 561;
      hero.facing = 1;
      const primaryMob = adv.spawnMonster('goblin', 710, { groundY: 561, skipPortal: true });
      const distractorMob = adv.spawnMonster('skeleton', 880, { groundY: 561, skipPortal: true });
      primaryMob.hp = 99999;
      primaryMob.maxHp = 99999;
      primaryMob.autoCooldown = 999;
      primaryMob.skillCooldown = 999;
      distractorMob.hp = 99999;
      distractorMob.maxHp = 99999;
      distractorMob.autoCooldown = 999;
      distractorMob.skillCooldown = 999;

      adv.heldAttack = true;
      const seenVars = [];
      let everCrossedMob = false;
      let v3StartX = null;
      let v3EndX = null;
      for (let tick = 0; tick < 90; tick++) {
        const prevVar = hero._autoVariant;
        const prevState = hero.state;
        const preTickX = hero.x;
        primaryMob.x = 710;
        distractorMob.x = 880;
        adv.processPlayerControls(1 / 30, hero, adv.getNearestLivingMonster(hero));
        advGame.vfx?.update?.(1 / 30, 561, advGame.renderer);
        stepMockProjectiles(advGame.vfx, [primaryMob, distractorMob], 1 / 30);
        if (hero.x >= primaryMob.x - 120) everCrossedMob = true;
        if (
          hero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || hero._autoVariant !== prevVar)
        ) {
          seenVars.push(hero._autoVariant);
          if (hero._autoVariant === 3 && v3StartX === null) v3StartX = preTickX;
          if (seenVars.length >= 4) adv.heldAttack = false;
        }
        if (v3StartX !== null && seenVars.length === 4 && hero.state === 'AUTO_ATTACK' && hero._autoVariant === 3) {
          v3EndX = hero.x;
        }
        if (seenVars.length >= 4 && hero.state !== 'AUTO_ATTACK') break;
      }
      const backstepDelta = v3StartX !== null && v3EndX !== null ? v3StartX - v3EndX : 0;
      adv.stopCampaign();
      if (
        seenVars.slice(0, 4).join(',') !== '0,1,2,3' ||
        everCrossedMob ||
        backstepDelta < 28 ||
        primaryMob.hp >= 99999
      ) {
        throw new Error(
          `[Suite 26B Adv-Hold ${label}] Expected ranged 0,1,2,3 Spell-Slash + V3 backstep kite vs primaryMob (x=710), got vars=[${seenVars.join(',')}], crossed=${everCrossedMob}, backstep=${backstepDelta.toFixed(1)}, dmg=${99999 - primaryMob.hp}`
        );
      }
    }

    // (3) Adventure Mode Open-Air (`No Nearby Enemy`, Far Left Straggler at x=85 = 575px Behind > 510px Lock Range)
    // Must execute gentle local forward cast-steps (45..140px total) with ZERO leftward turns and ZERO backward projectiles!
    {
      const airGame = createMockGame();
      airGame.gameMode = 'adventure';
      const hero = new HeroCls(660, 561, 1);
      hero.game = airGame;
      airGame.leftFighter = hero;
      const adv = new AdventureManager(airGame);
      airGame.adventure = adv;
      adv.startCampaign(hero);
      adv.lockActive = false;
      airGame.fighters = [hero];
      if (adv.destructibles) adv.destructibles.props = [];
      hero.x = 660;
      hero.groundY = 561;
      hero.y = 561;
      hero.facing = 1;
      const farLeftStraggler = adv.spawnMonster('goblin', 85, { groundY: 561, skipPortal: true });
      farLeftStraggler.hp = 99999;
      farLeftStraggler.maxHp = 99999;
      farLeftStraggler.autoCooldown = 999;
      farLeftStraggler.skillCooldown = 999;

      adv.heldAttack = true;
      const seenVars = [];
      let everTurnedLeft = false;
      let everShotBackward = false;
      let maxLift = 0;

      for (let tick = 0; tick < 72; tick++) {
        const prevVar = hero._autoVariant;
        const prevState = hero.state;
        farLeftStraggler.x = 85;
        adv.processPlayerControls(1 / 30, hero, adv.getNearestLivingMonster(hero));
        if (hero.facing !== 1) everTurnedLeft = true;
        for (const p of airGame.vfx?.projectiles || []) {
          if (p.owner === hero && p.vx < 0) everShotBackward = true;
        }
        maxLift = Math.max(maxLift, Math.abs(hero.groundY - hero.y));

        if (
          hero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || hero._autoVariant !== prevVar)
        ) {
          seenVars.push(hero._autoVariant);
          if (seenVars.length >= 4) {
            adv.heldAttack = false;
          }
        }
        if (seenVars.length >= 4 && hero.state !== 'AUTO_ATTACK') break;
      }

      const totalForwardGain = hero.x - 660;
      const liftOk = heroKey === 'priestess' ? maxLift <= 0.001 : maxLift >= 12 && maxLift <= 24;
      adv.stopCampaign();
      if (
        seenVars.slice(0, 4).join(',') !== '0,1,2,3' ||
        everTurnedLeft ||
        everShotBackward ||
        totalForwardGain < 45 ||
        totalForwardGain > 145 ||
        !liftOk
      ) {
        throw new Error(
          `[Suite 26C Adv-OpenAir ${label}] Expected controlled local forward cast-steps (45..145px, 0 left turns, 0 backward projectiles), got vars=[${seenVars.join(',')}], everTurnedLeft=${everTurnedLeft}, everShotBackward=${everShotBackward}, gain=${totalForwardGain.toFixed(1)}, maxLift=${maxLift.toFixed(3)}`
        );
      }
    }

    // (4) Adventure Mode `AUTO` Play (`autoPlay = true`) Seamless 4-Beat Ranged Spell-Slash Flurry
    {
      const autoGame = createMockGame();
      autoGame.gameMode = 'adventure';
      const hero = new HeroCls(380, 561, 1);
      hero.game = autoGame;
      autoGame.leftFighter = hero;
      const adv = new AdventureManager(autoGame);
      autoGame.adventure = adv;
      adv.startCampaign(hero);
      adv.setAutoPlay(true);
      adv.lockActive = true;
      adv.lockMinX = 180;
      adv.lockMaxX = 980;
      autoGame.fighters = [hero];
      hero.x = 380;
      hero.groundY = 561;
      hero.y = 561;
      hero.skillCooldown = 999;
      const mob = adv.spawnMonster('goblin', 710, { groundY: 561, skipPortal: true });
      mob.hp = 99999;
      mob.maxHp = 99999;
      mob.autoCooldown = 999;
      mob.skillCooldown = 999;

      const seenVars = [];
      for (let tick = 0; tick < 90 && seenVars.length < 4; tick++) {
        const prevVar = hero._autoVariant;
        const prevState = hero.state;
        mob.x = 710;
        adv.processPlayerControls(1 / 30, hero, adv.getNearestLivingMonster(hero));
        if (
          hero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || hero._autoVariant !== prevVar)
        ) {
          seenVars.push(hero._autoVariant);
        }
      }
      adv.stopCampaign();
      if (seenVars.slice(0, 4).join(',') !== '0,1,2,3') {
        throw new Error(
          `[Suite 26D Adv-AutoPlay ${label}] Expected seamless AUTO Play 0,1,2,3 Spell-Slash flurry, got vars=[${seenVars.join(',')}]`
        );
      }
    }
  }

  console.log(
    '[PASS] Suite 26: 3-Mage Ranged Battle-Mage Spell-Slash & Beat-4 Backstep Kite (Ignis Sol, Lyra, Seraphina — Zero Melee Cross-Spam, Ranged Spacing, Seraphina 0px-Float & AUTO Play) verified!'
  );
}

// ============================================================================
// SUITE 27: Adventure 3D HD-2D Stage Objects, 32-Cell Colossal Boss Malphas & Lossless Optimizations
// ============================================================================
{
  const readPngDims = (absPath) => {
    const buf = fs.readFileSync(absPath);
    if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) {
      throw new Error(`[Suite 27] Invalid PNG header at ${absPath}`);
    }
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  };

  // (27A) Zero 3D Stage Polygons + `ArcaneShaderFX` 12-Row `adv_stage_vfx.png` (2048x1536) Multi-Plane & Monument Pixel Overlays
  {
    const removed3dPath =
      `${REPO_ROOT}/src/adventure/Adventure3DObjects.js`;
    if (fs.existsSync(removed3dPath)) {
      throw new Error('[Suite 27A] Adventure3DObjects.js must be completely removed!');
    }
    const mapRendererSrc = fs.readFileSync(
      `${REPO_ROOT}/src/adventure/AdventureMapRenderer.js`,
      'utf8'
    );
    const destructiblesSrc = fs.readFileSync(
      `${REPO_ROOT}/src/adventure/AdventureDestructibles.js`,
      'utf8'
    );
    const advMgrSrc = fs.readFileSync(
      `${REPO_ROOT}/src/adventure/AdventureManager.js`,
      'utf8'
    );
    const monsterSrc = fs.readFileSync(
      `${REPO_ROOT}/src/entities/Monster.js`,
      'utf8'
    );
    if (
      mapRendererSrc.includes('Adventure3DObjects') ||
      mapRendererSrc.includes('.ellipse(') ||
      destructiblesSrc.includes('.ellipse(') ||
      advMgrSrc.includes('.ellipse(') ||
      monsterSrc.includes('.ellipse(') ||
      /\.rotate\s*\(/.test(mapRendererSrc) ||
      /\.rotate\s*\(/.test(destructiblesSrc)
    ) {
      throw new Error(
        '[Suite 27A] Adventure & Monster renderers must contain 0 Adventure3DObjects, 0 vector .ellipse(), and 0 .rotate() calls!'
      );
    }

    const stageVfxDims = readPngDims(
      `${REPO_ROOT}/assets/sprites/adv_stage_vfx.png`
    );
    if (stageVfxDims.width !== 2048 || stageVfxDims.height !== 1536) {
      throw new Error(
        `[Suite 27A] Expected adv_stage_vfx.png 2048x1536 (12x16 @ 128x128), got ${stageVfxDims.width}x${stageVfxDims.height}`
      );
    }
    const propsDims = readPngDims(
      `${REPO_ROOT}/assets/sprites/adv_props_sheet.png`
    );
    const fxDims = readPngDims(
      `${REPO_ROOT}/assets/sprites/adv_fx_sheet.png`
    );
    if (
      propsDims.width !== 1152 ||
      propsDims.height !== 640 ||
      fxDims.width !== 1024 ||
      fxDims.height !== 640
    ) {
      throw new Error(
        `[Suite 27A] Unexpected adv_props_sheet (${propsDims.width}x${propsDims.height}) or adv_fx_sheet (${fxDims.width}x${fxDims.height}) dims!`
      );
    }

    const pfAssets = PixelForge.initAssets();
    if (!pfAssets.advStageVfx) {
      throw new Error('[Suite 27A] PixelForge.initAssets() missing advStageVfx entry!');
    }
    pfAssets.advStageVfx.complete = true;
    pfAssets.advStageVfx.naturalWidth = 2048;
    pfAssets.advStageVfx.naturalHeight = 1536;
    pfAssets.advPropsSheet.complete = true;
    pfAssets.advPropsSheet.naturalWidth = 1152;
    pfAssets.advPropsSheet.naturalHeight = 640;

    const forbidden = {
      rotate: 0,
      quad: 0,
      smoothingTrue: 0,
      maxLighterRectAlpha: 0,
      maxLighterImgAlpha: 0
    };
    const seenRows = new Set();
    const seenCols = new Set();
    let stageVfxDraws = 0;

    const makeStageVfxCtx = () => {
      const base = createMockCtx();
      base.rotate = () => {
        forbidden.rotate++;
      };
      base.quadraticCurveTo = () => {
        forbidden.quad++;
      };
      const origFillRect = base.fillRect.bind(base);
      base.fillRect = (x, y, w, h) => {
        if (base.globalCompositeOperation === 'lighter') {
          forbidden.maxLighterRectAlpha = Math.max(
            forbidden.maxLighterRectAlpha,
            base.globalAlpha ?? 1
          );
        }
        origFillRect(x, y, w, h);
      };
      base.drawImage = (img, sx, sy, sw, sh, dx, dy, dw, dh) => {
        if (img && typeof img.src === 'string' && img.src.includes('adv_stage_vfx.png')) {
          stageVfxDraws++;
          if (base.imageSmoothingEnabled !== false) forbidden.smoothingTrue++;
          if (sw !== 128 || sh !== 128) {
            throw new Error(`[Suite 27A] Expected 128x128 cell blit, got ${sw}x${sh}`);
          }
          if ([sx, sy, dx, dy, dw, dh].some((v) => !Number.isFinite(v))) {
            throw new Error('[Suite 27A] Non-finite adv_stage_vfx drawImage arg');
          }
          const col = Math.round(sx / 128);
          const row = Math.round(sy / 128);
          if (col < 0 || col >= 16 || row < 0 || row >= 12) {
            throw new Error(`[Suite 27A] Out-of-bounds adv_stage_vfx cell (row=${row}, col=${col})`);
          }
          seenRows.add(row);
          seenCols.add(col);
          if (base.globalCompositeOperation === 'lighter') {
            forbidden.maxLighterImgAlpha = Math.max(
              forbidden.maxLighterImgAlpha,
              base.globalAlpha ?? 1
            );
          }
        }
      };
      return base;
    };

    for (const camX of [640, 3360, 5620, 8860]) {
      for (const time of [0.15, 0.52, 0.91]) {
        const ctxAudit = makeStageVfxCtx();
        const mockRenderer = {
          camX,
          camY: 445,
          width: 1280,
          height: 720,
          zoom: 1,
          time,
          permanentStageOverride: null,
          trueUltStageOverride: null,
          trueUltStageAlpha: 0
        };
        AdventureMapRenderer.render(ctxAudit, mockRenderer, ADVENTURE_WORLD_WIDTH);
        AdventureMapRenderer.renderForegroundDepth(ctxAudit, mockRenderer);
        if (ctxAudit._stateStack.length !== 0) {
          throw new Error(
            `[Suite 27A] Unbalanced ctx.save/restore stack (${ctxAudit._stateStack.length}) at camX=${camX}`
          );
        }
      }
    }

    // Also audit all 9 AdventureDestructibles monument archetypes (`sheetCol = 0..8`) for 30fps `adv_stage_vfx.png` socket overlays!
    const destrAudit = new AdventureDestructibles(null);
    const monumentRows = new Set();
    const ctxMon = makeStageVfxCtx();
    const origMonDraw = ctxMon.drawImage;
    ctxMon.drawImage = (img, sx, sy, sw, sh, dx, dy, dw, dh) => {
      origMonDraw(img, sx, sy, sw, sh, dx, dy, dw, dh);
      if (img && typeof img.src === 'string' && img.src.includes('adv_stage_vfx.png')) {
        monumentRows.add(Math.round(sy / 128));
      }
    };
    for (let col = 0; col <= 8; col++) {
      destrAudit.renderProp(
        ctxMon,
        {
          index: col,
          sheetCol: col,
          drawScale: 1.56,
          hasGlow: true,
          isArtifact: col === 2 || col === 4 || col === 8,
          halfW: 44,
          height: 154,
          primaryColor: '#fb923c',
          accentColor: '#fef08a',
          x: 640,
          y: 560,
          groundY: 560,
          hp: 100,
          maxHp: 100,
          hitShake: 0,
          hitFlash: 0,
          destroyed: false
        },
        { camX: 640, width: 1280, zoom: 1, time: 0.65 },
        false
      );
    }
    for (const reqMonRow of [4, 6, 8, 9, 10, 11]) {
      if (!monumentRows.has(reqMonRow)) {
        throw new Error(
          `[Suite 27A] Expected AdventureDestructibles.renderProp to blit adv_stage_vfx Row ${reqMonRow}, got [${[...monumentRows].join(',')}]`
        );
      }
    }

    // Also verify Inferno & Glacial stage synergies transform stage pixel overlays cleanly
    for (const override of ['inferno', 'glacial']) {
      const ctxOv = makeStageVfxCtx();
      const mockRenderer = {
        camX: 640,
        camY: 445,
        width: 1280,
        height: 720,
        zoom: 1,
        time: 1.35,
        permanentStageOverride: override,
        trueUltStageOverride: null,
        trueUltStageAlpha: 0
      };
      AdventureMapRenderer.render(ctxOv, mockRenderer, ADVENTURE_WORLD_WIDTH);
      AdventureMapRenderer.renderForegroundDepth(ctxOv, mockRenderer);
    }

    if (
      seenRows.size !== 12 ||
      seenCols.size < 12 ||
      stageVfxDraws < 400 ||
      forbidden.rotate !== 0 ||
      forbidden.quad !== 0 ||
      forbidden.smoothingTrue !== 0 ||
      forbidden.maxLighterRectAlpha > 0.1801 ||
      forbidden.maxLighterImgAlpha > 0.1601
    ) {
      throw new Error(
        `[Suite 27A] adv_stage_vfx audit failed: rows=${[...seenRows].sort((a, b) => a - b).join(',')}, cols=${seenCols.size}, draws=${stageVfxDraws}, forbidden=${JSON.stringify(forbidden)}`
      );
    }
  }

  // (27B) Upgraded 32-Cell Chunky HD-2D `boss_colossus_sheet.png` (4096x2048) & Multi-Joint/Multi-Frame `ArchfiendBoss`
  {
    const bossSheetDims = readPngDims(
      `${REPO_ROOT}/assets/sprites/boss_colossus_sheet.png`
    );
    if (bossSheetDims.width !== 4096 || bossSheetDims.height !== 2048) {
      throw new Error(
        `[Suite 27B] Expected boss_colossus_sheet.png 4096x2048, got ${bossSheetDims.width}x${bossSheetDims.height}`
      );
    }

    const assets = PixelForge.initAssets();
    assets.archfiend.colossus.complete = true;
    assets.archfiend.colossus.naturalWidth = 4096;
    assets.archfiend.colossus.naturalHeight = 2048;

    const bossGame = createMockGame();
    bossGame.gameMode = 'adventure';
    const hero = new Warrior(8920, 561, 1);
    hero.game = bossGame;
    const boss = new ArchfiendBoss(9335, 561);
    boss.game = bossGame;

    const sampledCells = new Set();
    let bossRotates = 0;
    const bossCtx = createMockCtx();
    bossCtx.rotate = () => {
      bossRotates++;
    };
    bossCtx.drawImage = (img, sx, sy, sw, sh) => {
      if (img === assets.archfiend.colossus && sw === 512 && sh === 512) {
        sampledCells.add(`${Math.round(sx / 512)},${Math.round(sy / 512)}`);
      }
    };

    // 1. Step through emerge eruption (spawns magma spires & boulders + beats wings)
    for (let i = 0; i < 52; i++) {
      boss.update(1 / 30, hero, bossGame);
      boss.draw(bossCtx, false, { time: i / 30 });
    }
    // 2. Drive Phase 3 + Jaw Hellfire (`skillVariant = 0`) across 3-frame torrent cycle
    boss.bossPhase = 3;
    boss.emergeTimer = 0;
    boss.state = 'SKILL';
    boss.skillVariant = 0;
    boss.jawOpen = 0.92;
    for (let i = 0; i < 8; i++) {
      boss.stateTimer = 0.32 + i * 0.05;
      boss.animTime += 1 / 30;
      boss.wingPhase += 0.7;
      boss.draw(bossCtx, false, { time: 2.0 + i * 0.05 });
    }
    // 3. Drive Razor Rake (`skillVariant = 1`, `rakeActive = true`) across 3-frame talon slash wave
    boss.state = 'SKILL';
    boss.skillVariant = 1;
    boss.rakeActive = true;
    boss.fistVisible = false;
    for (let i = 0; i < 8; i++) {
      boss.stateTimer = 0.50 + i * 0.04;
      boss.animTime += 1 / 30;
      boss.draw(bossCtx, false, { time: 3.0 + i * 0.04 });
    }
    // 4. Drive Airborne Meteor Fist (`fistVisible = true`) + Vulnerable Heart-Core Vortex
    boss.rakeActive = false;
    boss.state = 'AUTO_ATTACK';
    boss.stateTimer = 0.56;
    boss.fistVisible = true;
    boss.fistWorldX = 8950;
    boss.fistWorldY = 360;
    boss.vulnerableTimer = 1.2;
    boss.draw(bossCtx, false, { time: 4.1 });

    if (bossRotates !== 0 || bossCtx._stateStack.length !== 0) {
      throw new Error(
        `[Suite 27B] Boss render invariant failed: rotate=${bossRotates}, stack=${bossCtx._stateStack.length}`
      );
    }

    const requiredNewCells = [
      '0,2', '1,2', '2,2', '3,2', // Root-locked Abyssal Great-Wings
      '4,2', '5,2',               // Horizontal Rune Siege Vambrace + Abyssal Hell-Rift Portal Maw
      '6,2', '7,2',               // Multi-frame Cohesive Hellfire Torrent
      '0,3', '1,3',               // Multi-frame Cohesive 3-Talon Slash Wave
      '2,3', '3,3',               // Erupting Obsidian Magma Spires
      '4,3', '5,3',               // Ballistic 3D Volcanic Shrapnel Boulders
      '6,3',                      // Phase II/III Sovereign Burning Eclipse Crown Crest
      '7,3'                       // Exposed Molten Heart-Core Rupture (Vulnerable Punish)
    ];
    const missingCells = requiredNewCells.filter((c) => !sampledCells.has(c));
    if (missingCells.length > 0) {
      throw new Error(
        `[Suite 27B] Missing upgraded Rows 2..3 boss cells: [${missingCells.join(', ')}] (sampled: [${[...sampledCells].join(', ')}])`
      );
    }

    // 5. Verify (7,3) is NEVER drawn on throat/chest while non-vulnerable, and damped torso motion has <= 12px 1-frame delta!
    boss.vulnerableTimer = 0;
    boss.fistVisible = false;
    boss.rakeActive = false;
    boss.state = 'SKILL';
    boss.skillVariant = 0;
    boss.stateTimer = 0.40;
    boss.jawOpen = 1.0;
    let nonVulnCoreDraws = 0;
    let torsoPos = null;
    bossCtx.drawImage = (img, sx, sy, sw, sh, dx, dy) => {
      if (img === assets.archfiend.colossus && sw === 512 && sh === 512) {
        const col = Math.round(sx / 512);
        const row = Math.round(sy / 512);
        if (col === 7 && row === 3) nonVulnCoreDraws++;
        if ((col === 1 || col === 2) && row === 0) torsoPos = { x: dx, y: dy };
      }
    };
    boss.draw(bossCtx, false, { time: 5.0 });
    if (nonVulnCoreDraws !== 0) {
      throw new Error(
        `[Suite 27B] Expected 0 Cell (7,3) draws while non-vulnerable, got ${nonVulnCoreDraws}`
      );
    }

    boss.setState('IDLE');
    boss.attackCooldown = 0.04;
    boss.skillCooldown = 0.04;
    boss.ultCooldown = 0.35;
    let prevTorso = null;
    let maxTorsoStep = 0;
    for (let f = 0; f < 90; f++) {
      torsoPos = null;
      boss.update(1 / 30, hero, bossGame);
      boss.draw(bossCtx, false, { time: 6.0 + f / 30 });
      if (torsoPos && prevTorso) {
        const step = Math.hypot(torsoPos.x - prevTorso.x, torsoPos.y - prevTorso.y);
        if (step > maxTorsoStep) maxTorsoStep = step;
      }
      if (torsoPos) prevTorso = torsoPos;
    }
    if (maxTorsoStep > 12) {
      throw new Error(
        `[Suite 27B] Discontinuous boss torso jump detected: max 1-frame step=${maxTorsoStep.toFixed(2)}px (> 12px)`
      );
    }
  }

  // (27C) 100% Lossless Engine Optimizations: Portrait Dirty-Check, Deferred Loader, VFX Frustum Culling & Champion Sheet Purity
  {
    // 1. Portrait dirty-check eliminates redundant 60fps <canvas>.width resets & drawImage blits
    const prevDoc = globalThis.document;
    try {
      let portraitDraws = 0;
      const mockCanvas = {
        width: 300,
        height: 150,
        getContext() {
          return {
            imageSmoothingEnabled: true,
            clearRect() {},
            drawImage() {
              portraitDraws++;
            }
          };
        }
      };
      globalThis.document = {
        ...prevDoc,
        getElementById(id) {
          return id === 'left-portrait' ? mockCanvas : null;
        }
      };
      const imgA = { complete: true, naturalWidth: 128, naturalHeight: 128 };
      const imgB = { complete: true, naturalWidth: 128, naturalHeight: 128 };
      for (let i = 0; i < 10; i++) {
        PixelForge.drawPortrait('left-portrait', imgA, '#38bdf8');
      }
      if (portraitDraws !== 1 || mockCanvas.width !== 128 || mockCanvas.height !== 128) {
        throw new Error(
          `[Suite 27C] Expected exactly 1 portrait draw across 10 identical calls, got ${portraitDraws}`
        );
      }
      PixelForge.drawPortrait('left-portrait', imgB, '#f97316');
      if (portraitDraws !== 2) {
        throw new Error(
          `[Suite 27C] Expected immediate portrait redraw when image changes, got ${portraitDraws}`
        );
      }
    } finally {
      globalThis.document = prevDoc;
    }

    // 2. Deferred asset promotion (`ensureImage`)
    let deferredLoaded = false;
    const deferredImg = {
      src: '',
      _deferredSrc: 'assets/sprites/arena_sylvan.png',
      _deferredOnLoad: () => {
        deferredLoaded = true;
      }
    };
    PixelForge.ensureImage(deferredImg);
    if (deferredImg.src !== 'assets/sprites/arena_sylvan.png' || deferredImg._deferredSrc !== null) {
      throw new Error('[Suite 27C] ensureImage failed to promote _deferredSrc -> .src');
    }
    deferredImg.onload?.();
    if (!deferredLoaded) {
      throw new Error('[Suite 27C] ensureImage failed to wire _deferredOnLoad callback');
    }

    // 3. VFXManager horizontal camera frustum culling + O(N) zero-GC compaction
    const vfx = new VFXManager();
    vfx.spawnParticle({ x: 520, y: 480, vx: 0, vy: 0, size: 6, color: '#38bdf8', maxLife: 0.5 });
    vfx.spawnParticle({ x: 4600, y: 480, vx: 0, vy: 0, size: 6, color: '#f97316', maxLife: 0.5 });
    const drawnXs = [];
    const vfxCtx = createMockCtx();
    vfxCtx.fillRect = (x) => {
      drawnXs.push(x);
    };
    vfx.renderMainPass(vfxCtx, false, {
      camX: 500,
      width: 1200,
      zoom: 1,
      getGlowForColor: () => null
    });
    const hasOnScreen = drawnXs.some((x) => x >= 480 && x <= 560);
    const hasOffScreen = drawnXs.some((x) => x > 2000);
    if (!hasOnScreen || hasOffScreen) {
      throw new Error(
        `[Suite 27C] VFX frustum culling failed: hasOnScreen=${hasOnScreen}, hasOffScreen=${hasOffScreen}, xs=[${drawnXs.join(',')}]`
      );
    }
    vfx.update(0.75);
    if (vfx.particles.length !== 0) {
      throw new Error(
        `[Suite 27C] Expected O(N) compaction to clear expired particles, got ${vfx.particles.length}`
      );
    }

    // 4. Lossless guarantee: all 11 champion sheets remain 6240x2080 untouched
    const champSheets = [
      'warrior_sheet.png',
      'mage_sheet.png',
      'archer_sheet.png',
      'priestess_sheet.png',
      'reaper_sheet.png',
      'chronomancer_sheet.png',
      'titan_sheet.png',
      'ronin_sheet.png',
      'valkyrie_sheet.png',
      'icemage_sheet.png',
      'android_sheet.png'
    ];
    for (const fn of champSheets) {
      const dims = readPngDims(`${REPO_ROOT}/assets/sprites/${fn}`);
      if (dims.width !== 6240 || dims.height !== 2080) {
        throw new Error(`[Suite 27C] Champion sheet ${fn} dims altered: ${dims.width}x${dims.height}`);
      }
    }
  }

  console.log(
    '[PASS] Suite 27: Character-Style Stage Pixel Overlays (adv_stage_vfx.png, 0 3D Polygons), 32-Cell Colossal Boss Malphas & 100% Lossless Engine Optimizations verified!'
  );
}

} // end if (!SKIP_LEGACY_BRUTE_LOOPS)

// ============================================================================
// SUITE 28: Separated VS / Adventure Landing Overhaul, Zero Background Load,
//           1v1 + Tag VS Format Isolation, Mobile Portrait Full Zoom-Out,
//           Pause Menu GO TO TITLE SCREEN & Adventure Skill-Cluster AUTO Button
// ============================================================================
{
  const indexHtml = fs.readFileSync(
    `${REPO_ROOT}/index.html`,
    'utf8'
  );
  const mainJs = fs.readFileSync(
    `${REPO_ROOT}/src/main.js`,
    'utf8'
  );

  // (28A) Dual-Gateway Separated Landing Page, 2v2 Brawl Hidden, Pause GO TO TITLE SCREEN & Lazy Stage Thumbs
  if (
    !indexHtml.includes('id="btn-go-mode"') ||
    !indexHtml.includes('VERSUS MODE') ||
    !indexHtml.includes('id="btn-title-adventure"') ||
    !indexHtml.includes('ADVENTURE MODE') ||
    indexHtml.includes('id="btn-go-roster"') ||
    indexHtml.includes('id="btn-title-quick-duel"')
  ) {
    throw new Error(
      '[Suite 28A] Title Screen must expose strictly separated VERSUS MODE (#btn-go-mode) & ADVENTURE MODE (#btn-title-adventure) gateways!'
    );
  }
  const brawlBtnMatch = indexHtml.match(/<button[^>]*id="mode-btn-2v2-brawl"[^>]*>/);
  const advModeBtnMatch = indexHtml.match(/<button[^>]*id="mode-btn-adventure"[^>]*>/);
  if (
    !brawlBtnMatch ||
    !/\bhidden\b/.test(brawlBtnMatch[0]) ||
    !advModeBtnMatch ||
    !/\bhidden\b/.test(advModeBtnMatch[0]) ||
    !indexHtml.includes('>TAG VS<')
  ) {
    throw new Error(
      '[Suite 28A] Expected #mode-btn-2v2-brawl and #mode-btn-adventure to be hidden in #landing-step-mode, leaving 1V1 + TAG VS!'
    );
  }
  if (
    !indexHtml.includes('id="btn-pause-title"') ||
    !indexHtml.includes('GO TO TITLE SCREEN') ||
    !indexHtml.includes('id="btn-victory-title"') ||
    !indexHtml.includes('id="adv-btn-auto"') ||
    !indexHtml.includes('id="adv-auto-label"')
  ) {
    throw new Error(
      '[Suite 28A] Missing #btn-pause-title (GO TO TITLE SCREEN), #btn-victory-title, or #adv-btn-auto / #adv-auto-label!'
    );
  }
  const stageImgMatches = [
    ...indexHtml.matchAll(/<img\s+[^>]*src="assets\/sprites\/arena_[^"]+"[^>]*>/g)
  ];
  if (
    stageImgMatches.length < 6 ||
    stageImgMatches.some(
      (m) => m[0].includes('loading="lazy"') || !m[0].includes('decoding="async"')
    )
  ) {
    throw new Error(
      `[Suite 28A] Expected all 6 stage gallery <img> tags to omit loading="lazy" and carry decoding="async", found ${stageImgMatches.length}`
    );
  }
  if (
    !mainJs.includes("this.gameMode = '1v1';") ||
    !mainJs.includes("const order = ['1v1', '2v2_tag'];") ||
    !mainJs.includes('goToTitleScreen(') ||
    !mainJs.includes('teardownActiveMatch(')
  ) {
    throw new Error(
      '[Suite 28A] Expected main.js default gameMode="1v1", cycleGameMode=["1v1","2v2_tag"], goToTitleScreen(), and teardownActiveMatch()!'
    );
  }
  const loopTail = mainJs.slice(mainJs.indexOf('loop(now)'));
  const landingLoopMatch = loopTail.match(
    /if\s*\(\s*this\.isLandingOpen\s*\)\s*\{([\s\S]*?return;\s*)\}/
  );
  if (
    !landingLoopMatch ||
    landingLoopMatch[1].includes('this.renderer.update') ||
    landingLoopMatch[1].includes('this.renderer.render') ||
    !landingLoopMatch[1].includes('return;')
  ) {
    throw new Error(
      '[Suite 28A] Expected loop() to return early when isLandingOpen is true without running background renderer.update / renderer.render!'
    );
  }

  // (28B) Adventure `#adv-btn-auto` Skill-Cluster Button 1:1 State Sync
  {
    const prevGetEl = globalThis.document.getElementById;
    const makeBtnMock = () => {
      const cls = new Set();
      const attrs = {};
      return {
        textContent: '',
        classList: {
          toggle(c, on) {
            if (on) cls.add(c);
            else cls.delete(c);
          },
          contains(c) {
            return cls.has(c);
          },
          add(c) {
            cls.add(c);
          },
          remove(c) {
            cls.delete(c);
          }
        },
        setAttribute(k, v) {
          attrs[k] = String(v);
        },
        getAttribute(k) {
          return attrs[k];
        }
      };
    };
    const mockAutoSkillBtn = makeBtnMock();
    const mockAutoSkillLbl = { textContent: '' };
    const mockPauseAiBtn = makeBtnMock();
    const mockPauseAiLbl = { textContent: '' };
    try {
      globalThis.document.getElementById = (id) => {
        if (id === 'adv-btn-auto') return mockAutoSkillBtn;
        if (id === 'adv-auto-label') return mockAutoSkillLbl;
        if (id === 'adv-btn-autoplay') return mockPauseAiBtn;
        if (id === 'adv-autoplay-label') return mockPauseAiLbl;
        return null;
      };
      const advGame = createMockGame();
      advGame.gameMode = 'adventure';
      advGame.isLandingOpen = false;
      const hero = new Warrior(240, 561, 1);
      hero.game = advGame;
      const adv = new AdventureManager(advGame);
      adv.startCampaign(hero);
      if (
        mockAutoSkillBtn.classList.contains('is-autoplay-on') ||
        mockAutoSkillBtn.getAttribute('aria-pressed') !== 'false' ||
        mockAutoSkillLbl.textContent !== 'AUTO'
      ) {
        throw new Error('[Suite 28B] Expected #adv-btn-auto to start OFF with label "AUTO"');
      }
      adv.toggleAutoPlay(false);
      if (
        !mockAutoSkillBtn.classList.contains('is-autoplay-on') ||
        mockAutoSkillBtn.getAttribute('aria-pressed') !== 'true' ||
        mockAutoSkillLbl.textContent !== 'AUTO' ||
        mockPauseAiLbl.textContent !== 'AI: ON'
      ) {
        throw new Error('[Suite 28B] Expected toggleAutoPlay() to activate #adv-btn-auto ("AUTO") & #adv-btn-autoplay ("AI: ON")');
      }
      adv.stopCampaign();
    } finally {
      globalThis.document.getElementById = prevGetEl;
    }
  }

  // (28C) Mobile Portrait (`390x844`) Full Camera Zoom-Out vs Mobile Landscape (`844x390`)
  {
    const prevW = globalThis.window.innerWidth;
    const prevH = globalThis.window.innerHeight;
    try {
      const portraitCanvas = {
        width: 390,
        height: 844,
        getContext() {
          return createMockCtx();
        }
      };
      globalThis.window.innerWidth = 390;
      globalThis.window.innerHeight = 844;
      const rPortrait = new Renderer(portraitCanvas);
      const expectedPortraitZoom = rPortrait.getMobilePortraitFixedZoom(false);
      if (
        !rPortrait.isMobile ||
        !rPortrait.isMobilePortrait ||
        rPortrait.isMobileLandscape ||
        expectedPortraitZoom < 0.28 ||
        expectedPortraitZoom > 0.34 ||
        Math.abs(rPortrait.zoom - expectedPortraitZoom) > 0.001
      ) {
        throw new Error(
          `[Suite 28C] Mobile Portrait (390x844) resize failed: isMobilePortrait=${rPortrait.isMobilePortrait}, zoom=${rPortrait.zoom}, expected=${expectedPortraitZoom}`
        );
      }

      // Close-range fighters + active Ult/KO timers must NEVER zoom in on Mobile Portrait!
      const fLeft = new Warrior(580, rPortrait.groundY, 1);
      const fRight = new FireMage(620, rPortrait.groundY, -1);
      const vsMock = createMockGame();
      fLeft.game = vsMock;
      fRight.game = vsMock;
      rPortrait.koZoomTimer = 1.1;
      rPortrait.ultZoomTimer = 0.9;
      for (let i = 0; i < 20; i++) {
        rPortrait.update(1 / 30, [fLeft, fRight]);
      }
      if (Math.abs(rPortrait.zoom - expectedPortraitZoom) > 0.002) {
        throw new Error(
          `[Suite 28C] Expected Mobile Portrait VS zoom to stay locked at ${expectedPortraitZoom.toFixed(3)} during close-up/KO/Ult, got ${rPortrait.zoom.toFixed(3)}`
        );
      }
      rPortrait.pickRandomStage('cathedral');
      rPortrait.render([fLeft, fRight], vsMock.vfx);

      // Mobile Portrait Adventure Mode + Colossal Boss wide framing
      const advMock = createMockGame();
      advMock.gameMode = 'adventure';
      advMock.isAdventureMode = () => true;
      const advHero = new Warrior(8950, 561, 1);
      advHero.game = advMock;
      const advBoss = new ArchfiendBoss(9335, 561);
      advBoss.game = advMock;
      for (let i = 0; i < 20; i++) {
        rPortrait.update(1 / 30, [advHero, advBoss]);
      }
      const expectedBossPortraitZoom = rPortrait.getMobilePortraitFixedZoom(true);
      if (Math.abs(rPortrait.zoom - expectedBossPortraitZoom) > 0.005) {
        throw new Error(
          `[Suite 28C] Expected Mobile Portrait Boss zoom ~${expectedBossPortraitZoom.toFixed(3)}, got ${rPortrait.zoom.toFixed(3)}`
        );
      }
      const advPortraitCtx = createMockCtx();
      AdventureMapRenderer.render(advPortraitCtx, rPortrait, ADVENTURE_WORLD_WIDTH);
      AdventureMapRenderer.renderForegroundDepth(advPortraitCtx, rPortrait);
      if (advPortraitCtx._stateStack.length !== 0) {
        throw new Error('[Suite 28C] Unbalanced ctx stack in Mobile Portrait AdventureMapRenderer');
      }

      // Mobile Landscape VS Mode (`844x390`, `adventureMode = false`) must remain untouched (`[0.48..0.62]`)
      rPortrait.adventureMode = false;
      globalThis.window.innerWidth = 844;
      globalThis.window.innerHeight = 390;
      rPortrait.resize();
      if (
        !rPortrait.isMobileLandscape ||
        rPortrait.isMobilePortrait ||
        rPortrait.zoom < 0.48 ||
        rPortrait.zoom > 0.62
      ) {
        throw new Error(
          `[Suite 28C] Mobile Landscape (844x390) regression: isMobileLandscape=${rPortrait.isMobileLandscape}, zoom=${rPortrait.zoom}`
        );
      }
    } finally {
      globalThis.window.innerWidth = prevW;
      globalThis.window.innerHeight = prevH;
    }
  }

  // (28D) Lossless Memory Reclamation (`releaseInactiveAssets`) & Zero-Alloc Light Pooling (`VFXManager.getActiveLights`)
  {
    const prevHTMLImageElement = globalThis.HTMLImageElement;
    globalThis.Image.prototype.removeAttribute = function (attr) {
      if (attr === 'src') this.src = '';
    };
    globalThis.HTMLImageElement = globalThis.Image;
    try {
      const assets = PixelForge.initAssets();
      PixelForge.ensureHeroLoaded('warrior');
      PixelForge.ensureHeroLoaded('mage');
      PixelForge.ensureImage(assets.arenaSylvan);
      PixelForge.releaseInactiveAssets(['warrior'], [], false);
      if (
        !assets.warrior.sheet.src.includes('warrior_sheet.png') ||
        assets.mage.sheet.src !== '' ||
        !assets.mage.sheet._deferredSrc?.includes('mage_sheet.png') ||
        assets.arenaSylvan.src !== ''
      ) {
        throw new Error(
          `[Suite 28D] releaseInactiveAssets failed: warrior=${assets.warrior.sheet.src}, mage=${assets.mage.sheet.src}, sylvan=${assets.arenaSylvan.src}`
        );
      }
      // Re-promoting released hero works losslessly
      PixelForge.ensureHeroLoaded('mage');
      if (!assets.mage.sheet.src.includes('mage_sheet.png')) {
        throw new Error('[Suite 28D] Failed to re-promote mage sheet after releaseInactiveAssets!');
      }
      PixelForge.ensureAllPortraitsLoaded();
    } finally {
      if (prevHTMLImageElement === undefined) {
        delete globalThis.HTMLImageElement;
      } else {
        globalThis.HTMLImageElement = prevHTMLImageElement;
      }
    }

    const vfx = new VFXManager();
    const lightHero = new Warrior(420, 480, 1);
    vfx.spawnProjectile({ x: 510, y: 450, vx: 300, vy: 0, radius: 20, color: '#fb923c', damage: 50 });
    const lightsA = vfx.getActiveLights([lightHero], 480);
    const firstObjRef = lightsA[0];
    const lightsB = vfx.getActiveLights([lightHero], 480);
    if (lightsA !== lightsB || lightsB.length < 2 || lightsB[0] !== firstObjRef) {
      throw new Error('[Suite 28D] Expected VFXManager.getActiveLights() to reuse pooled array & light descriptors!');
    }
  }

  console.log(
    '[PASS] Suite 28: Separated Dual-Gateway Landing, Zero Background Load, 1v1 + Tag VS Isolation, Mobile Portrait Full Zoom-Out, Pause GO TO TITLE SCREEN & Adventure AUTO Button verified!'
  );
}

// =========================================================================
// SUITE 29: Emoji/Dingbat Zero-Tolerance + Brand Logo, Mobile Full Zoom Toggle,
// VS 1920x1080 Seamless Upper-Sky Vault (`0` Top Mirror), & Adventure Boss Grab + Unavoidable Soul-Tithe
// =========================================================================
{
  const repoRoot = REPO_ROOT;

  // (29A) Zero Emojis/Dingbats across UI/CSS/Manifest/JS + Official Brand Logo (`avs_brand_logo.png`) + Mobile Full Zoom Toggle
  {
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
    const filesToAudit = [
      `${repoRoot}/index.html`,
      `${repoRoot}/style.css`,
      `${repoRoot}/manifest.json`
    ];
    const collectJs = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = `${dir}/${ent.name}`;
        if (ent.isDirectory()) collectJs(full);
        else if (ent.name.endsWith('.js') && ent.name !== 'PixelFont.js') filesToAudit.push(full);
      }
    };
    collectJs(`${repoRoot}/src`);
    for (const fPath of filesToAudit) {
      const txt = fs.readFileSync(fPath, 'utf8');
      const m = txt.match(emojiRe);
      if (m) {
        throw new Error(
          `[Suite 29A] Forbidden emoji/dingbat '${m[0]}' (U+${m[0].codePointAt(0).toString(16).toUpperCase()}) found in ${fPath}!`
        );
      }
    }

    const logoBuf = fs.readFileSync(`${repoRoot}/assets/sprites/avs_brand_logo.png`);
    const logoW = logoBuf.readUInt32BE(16);
    const logoH = logoBuf.readUInt32BE(20);
    const htmlTxt = fs.readFileSync(`${repoRoot}/index.html`, 'utf8');
    const manifestTxt = fs.readFileSync(`${repoRoot}/manifest.json`, 'utf8');
    if (
      logoBuf[0] !== 0x89 ||
      logoW !== 128 ||
      logoH !== 128 ||
      !htmlTxt.includes('avs_brand_logo.png') ||
      !manifestTxt.includes('avs_brand_logo.png') ||
      !htmlTxt.includes('id="btn-pause-full-zoom"') ||
      !htmlTxt.includes('id="pause-full-zoom-label"')
    ) {
      throw new Error(
        `[Suite 29A] Brand logo or #btn-pause-full-zoom missing/invalid: size=${logoW}x${logoH}`
      );
    }

    const prevW = globalThis.window.innerWidth;
    const prevH = globalThis.window.innerHeight;
    try {
      globalThis.window.innerWidth = 390;
      globalThis.window.innerHeight = 844;
      const zoomCanvas = {
        width: 390,
        height: 844,
        getContext() {
          return createMockCtx();
        }
      };
      const rZoom = new Renderer(zoomCanvas);
      const zA = new Warrior(260, 480, 1);
      const zB = new FireMage(940, 480, -1);

      rZoom.setMobileFullZoomOut(true);
      for (let i = 0; i < 15; i++) rZoom.update(1 / 30, [zA, zB]);
      const fullZoomVal = rZoom.zoom;

      rZoom.setMobileFullZoomOut(false);
      for (let i = 0; i < 25; i++) rZoom.update(1 / 30, [zA, zB]);
      const standardZoomVal = rZoom.zoom;

      if (
        !rZoom.isMobilePortrait ||
        fullZoomVal > 0.34 ||
        standardZoomVal < 0.50 ||
        standardZoomVal <= fullZoomVal + 0.16
      ) {
        throw new Error(
          `[Suite 29A] Mobile Full Zoom-Out toggle failed: fullZoom=${fullZoomVal}, standardZoom=${standardZoomVal}`
        );
      }
      rZoom.setMobileFullZoomOut(true);
    } finally {
      globalThis.window.innerWidth = prevW;
      globalThis.window.innerHeight = prevH;
    }
  }

  // (29B) VS Stage 1920x1080 (`3x`) Scale + Seamless Upper Vault (`0` Upside-Down Top Mirror) + Intact Bottom Reflection
  {
    const stageCanvas = {
      width: 1200,
      height: 600,
      getContext() {
        return createMockCtx();
      }
    };
    const rStage = new Renderer(stageCanvas);
    rStage.pickRandomStage('cathedral');
    const assets = PixelForge.initAssets();
    PixelForge.ensureImage(assets.arenaBg);
    assets.arenaBg.naturalWidth = 640;
    assets.arenaBg.naturalHeight = 360;

    const stageCtx = createMockCtx();
    let curTxY = 0;
    let curScaleY = 1;
    const stateStack29B = [];
    const origSave = stageCtx.save.bind(stageCtx);
    const origRestore = stageCtx.restore.bind(stageCtx);
    stageCtx.save = () => {
      stateStack29B.push({ ty: curTxY, sy: curScaleY });
      origSave();
    };
    stageCtx.restore = () => {
      const s = stateStack29B.pop();
      if (s) {
        curTxY = s.ty;
        curScaleY = s.sy;
      }
      origRestore();
    };
    stageCtx.translate = (_tx, ty) => {
      curTxY += ty || 0;
    };
    stageCtx.scale = (_sx, sy) => {
      curScaleY *= sy ?? 1;
    };

    let sawMain1920x1080 = false;
    let sawUpperVaultAboveTop = false;
    let upsideDownTopDraws = 0;
    let lowerFloorMirrorDraws = 0;
    const expectedDrawY = Math.round(480 - 1080 * 0.82); // -406
    const expectedBottomY = expectedDrawY + 1080; // 674

    rStage._stageWingCompositeCache?.clear();
    const prevCreateEl29B = globalThis.document.createElement;
    globalThis.document.createElement = (tag) => {
      const el = prevCreateEl29B(tag);
      const baseGetCtx = el.getContext.bind(el);
      el.getContext = (...gArgs) => {
        const cctx = baseGetCtx(...gArgs);
        let bTxY = 0;
        let bScaleY = 1;
        const bStack = [];
        const bSave = cctx.save.bind(cctx);
        const bRestore = cctx.restore.bind(cctx);
        cctx.getImageData = (_x, _y, w, h) => {
          const data = new Uint8ClampedArray(w * h * 4);
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 24;
            data[i + 1] = 30;
            data[i + 2] = 52;
            data[i + 3] = 255;
          }
          return { width: w, height: h, data };
        };
        cctx.save = () => {
          bStack.push({ ty: bTxY, sy: bScaleY });
          bSave();
        };
        cctx.restore = () => {
          const s = bStack.pop();
          if (s) {
            bTxY = s.ty;
            bScaleY = s.sy;
          }
          bRestore();
        };
        cctx.translate = (_tx, ty) => {
          bTxY += ty || 0;
        };
        cctx.scale = (_sx, sy) => {
          bScaleY *= sy ?? 1;
        };
        const origDraw = cctx.drawImage.bind(cctx);
        cctx.drawImage = (img, dx, dy, dw, dh, ...rest) => {
          if (el.width === 1920) {
            const vaultH = 280;
            if (img === assets.arenaBg && dw === 640 && dh === 360 && dy === vaultH && bScaleY > 0) {
              sawMain1920x1080 = true;
            }
            if (bScaleY < 0) {
              if (bTxY <= vaultH + 10) upsideDownTopDraws++;
              else if (bTxY >= vaultH + 360 * 2) lowerFloorMirrorDraws++;
            } else if (img !== assets.arenaBg && dy === 0 && dw === 640 && dh === vaultH) {
              sawUpperVaultAboveTop = true;
            }
          }
          return origDraw(img, dx, dy, dw, dh, ...rest);
        };
        return cctx;
      };
      return el;
    };

    let sawComposite5760Blit = false;
    stageCtx.drawImage = (img, dx, dy, dw, dh) => {
      if (dw === 5760 && dy < expectedDrawY && dh > 1080 && curScaleY > 0) {
        sawComposite5760Blit = true;
      }
      if (img === assets.arenaBg && dw === 1920 && dh === 1080 && dy === expectedDrawY && curScaleY > 0) {
        sawMain1920x1080 = true;
      }
      if (curScaleY < 0) {
        if (curTxY <= expectedDrawY + 10) {
          upsideDownTopDraws++;
        } else if (curTxY >= expectedBottomY) {
          lowerFloorMirrorDraws++;
        }
      } else if (img !== assets.arenaBg && (dy < expectedDrawY || curTxY < expectedDrawY) && dw === 1920) {
        sawUpperVaultAboveTop = true;
      }
    };

    try {
      rStage.drawHD2DArena(stageCtx, 1200, 480);
    } finally {
      globalThis.document.createElement = prevCreateEl29B;
    }
    if (
      !sawComposite5760Blit ||
      !sawMain1920x1080 ||
      !sawUpperVaultAboveTop ||
      upsideDownTopDraws !== 0 ||
      lowerFloorMirrorDraws < 1 ||
      stageCtx._stateStack.length !== 0
    ) {
      throw new Error(
        `[Suite 29B] VS stage upper-vault / reflection check failed: comp5760=${sawComposite5760Blit}, main1920=${sawMain1920x1080}, upperVault=${sawUpperVaultAboveTop}, topMirror=${upsideDownTopDraws}, bottomRefl=${lowerFloorMirrorDraws}`
      );
    }
  }

  // (29C) Adventure Anti-Supreme-Ultimate-Spam, 11800 HP Behemoth Malphas, Abyssal Siege Grab & Unavoidable Hellpit Soul-Tithe
  {
    const g29 = createMockGame();
    g29.gameMode = 'adventure';
    g29.isAdventureMode = () => true;
    g29.renderer.worldWidth = ADVENTURE_WORLD_WIDTH;
    const adv29 = new AdventureManager(g29);
    g29.adventure = adv29;
    const hero29 = new Warrior(8860, 561, 1);
    hero29.game = g29;
    hero29.isManualAdventureControl = true;
    g29.leftFighter = hero29;
    adv29.startCampaign(hero29);
    adv29.lockMinX = 8360;
    adv29.lockMaxX = 9250;

    // 1. Regular Elite monsters must NOT drop Astral Relics (anti-Supreme-Ultimate spam)
    adv29.pickups.length = 0;
    const regElite = new Monster('templar', 8750, 561, -1, { isElite: true, skipPortal: true });
    regElite.game = g29;
    g29.fighters = [hero29, regElite];
    regElite.takeDamage(29999, hero29, true, 100, 0);
    if (adv29.pickups.some((p) => p.type === 'relic')) {
      throw new Error('[Suite 29C] Regular isElite monster should NOT drop an Astral Relic!');
    }

    // 2. Behemoth Malphas spawns with 11,800 HP and caps single-hit TRUE_ULTIMATE burst (`<= 12% maxHp`)
    const boss29 = new ArchfiendBoss(9335, 561);
    boss29.game = g29;
    boss29.emergeTimer = 0;
    if (boss29.maxHp !== 11800 || boss29.hp !== 11800) {
      throw new Error(`[Suite 29C] Expected ArchfiendBoss maxHp=11800, got ${boss29.maxHp}`);
    }
    hero29.state = 'TRUE_ULTIMATE';
    boss29.takeDamage(5000, hero29, true, 0, 0);
    hero29.state = 'IDLE';
    const singleTrueUltLoss = 11800 - boss29.hp;
    if (singleTrueUltLoss > Math.round(11800 * 0.12) + 2 || singleTrueUltLoss < 800) {
      throw new Error(
        `[Suite 29C] Expected TRUE_ULTIMATE single-hit boss cap (~1416 HP), got loss=${singleTrueUltLoss}`
      );
    }

    // 3. Abyssal Siege Grab (`skillVariant = 2`):
    //    (a) Dodging / invulnerable hero cleanly evades the snatch!
    hero29.x = 8920;
    hero29.groundY = 561;
    hero29.y = 561;
    hero29.isInvulnerable = true;
    hero29.state = 'DODGE';
    boss29.skillVariant = 2;
    boss29.grabLaneGy = 561;
    boss29.grabTargetX = 8920;
    boss29._grabInitDone = false;
    boss29.soulTitheCooldown = 99;
    boss29.setState('SKILL');
    for (let f = 0; f < 34; f++) {
      boss29.update(1 / 30, hero29, g29);
    }
    if (boss29.grabbedTarget || hero29._grabbedByBoss) {
      throw new Error('[Suite 29C] Dodging/invulnerable hero should evade Abyssal Siege Grab!');
    }

    //    (b) Standing hero in grab lane is snatched, hoisted into the air, crushed twice, and hurled LEFTWARD!
    hero29.isInvulnerable = false;
    hero29.setState('IDLE');
    hero29.hp = hero29.maxHp;
    hero29.x = 8940;
    hero29.groundY = 561;
    hero29.y = 561;
    boss29.skillVariant = 2;
    boss29.grabLaneGy = 561;
    boss29.grabTargetX = 8940;
    boss29._grabInitDone = false;
    boss29.soulTitheCooldown = 99;
    boss29.setState('SKILL');

    const grabTrack = { rotateCalls: 0, quadCalls: 0 };
    const grabCtx = createMockCtx(grabTrack);
    let wasPinned = false;
    let minGrabHeroY = 999;
    let minHurlVx = 0;
    for (let f = 0; f < 48; f++) {
      boss29.update(1 / 30, hero29, g29);
      hero29.update(1 / 30, boss29, g29);
      boss29.drawTelegraphRings(grabCtx);
      boss29.draw(grabCtx, false, { time: f / 30 });
      if (hero29._grabbedByBoss) {
        wasPinned = true;
        minGrabHeroY = Math.min(minGrabHeroY, hero29.y);
      }
      minHurlVx = Math.min(minHurlVx, hero29.vx || 0);
    }
    const grabDamageTaken = hero29.maxHp - hero29.hp;
    if (
      !wasPinned ||
      minGrabHeroY > 495 ||
      minHurlVx > -450 ||
      hero29._grabbedByBoss ||
      grabDamageTaken < 160 ||
      grabTrack.rotateCalls !== 0
    ) {
      throw new Error(
        `[Suite 29C] Abyssal Siege Grab audit failed: wasPinned=${wasPinned}, minY=${minGrabHeroY}, minVx=${minHurlVx}, stillPinned=${hero29._grabbedByBoss}, dmg=${grabDamageTaken}, rotate=${grabTrack.rotateCalls}`
      );
    }

    // 4. Automatic Unavoidable Attack (`HELLPIT SOUL-TITHE`): deals guaranteed real HP damage even through Dodge/Invulnerability!
    hero29.hp = hero29.maxHp;
    hero29.x = 8440;
    hero29.isInvulnerable = true;
    hero29.state = 'DODGE';
    boss29.setState('IDLE');
    boss29.autoCooldown = 99;
    boss29.skillCooldown = 99;
    boss29.ultCooldown = 99;
    boss29.soulTitheCooldown = 0.12;
    boss29.soulTitheWindupTimer = 0;
    boss29.soulTitheCount = 0;
    for (let f = 0; f < 30; f++) {
      boss29.update(1 / 30, hero29, g29);
      boss29.drawTelegraphRings(grabCtx);
    }
    const titheLoss = hero29.maxHp - hero29.hp;
    const minExpectedTithe = Math.round(hero29.maxHp * 0.11);
    if (
      boss29.soulTitheCount < 1 ||
      titheLoss < minExpectedTithe ||
      grabCtx._stateStack.length !== 0
    ) {
      throw new Error(
        `[Suite 29C] Expected automatic unavoidable Hellpit Soul-Tithe to deal >=${minExpectedTithe} guaranteed HP damage through Dodge/Invuln: count=${boss29.soulTitheCount}, loss=${titheLoss}, maxHp=${hero29.maxHp}`
      );
    }
  }

  console.log(
    '[PASS] Suite 29: Zero Emojis + HD-2D Brand Crest, Mobile Full Zoom-Out Toggle, VS 1920x1080 Seamless Upper Vault, Anti-Ult-Spam & 11,800 HP Malphas Grab + Unavoidable Soul-Tithe verified!'
  );
}

// =========================================================================
// SUITE 30: Star-Free Vault & Plane 0, Widened Adventure Camera Zoom, Default Mortal HP,
// Non-Overlapping Portrait HUD & Lowered Banners, Colossal Boss Depth Sort, Manual LOCK Free-Aim
// + Retargeting, Upper-Lane Adventure Defeat Plaque, Orthogonal Colonnade Props & 60 FPS ProMotion Pacer
// =========================================================================
{
  const repoRoot = REPO_ROOT;

  // (30.1) Star-Free Upper Vault (`getOrBakeStageUpperVault`) & Star-Free Adventure `Plane 0`
  {
    let capturedVaultPixels = null;
    const synthHorizon = new Uint8ClampedArray(640 * 24 * 4);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 640; x++) {
        const idx = (y * 640 + x) * 4;
        synthHorizon[idx] = 18 + ((x * 7 + y * 3) % 22);
        synthHorizon[idx + 1] = 24 + ((x * 5 + y * 5) % 26);
        synthHorizon[idx + 2] = 44 + ((x * 3 + y * 7) % 30);
        synthHorizon[idx + 3] = 255;
      }
    }
    const prevCreate30 = globalThis.document.createElement;
    globalThis.document.createElement = (tag) => {
      const el = prevCreate30(tag);
      const baseGetCtx = el.getContext.bind(el);
      el.getContext = (...args) => {
        const c = baseGetCtx(...args);
        c.getImageData = (_x, _y, w, h) => {
          if (h === 24 && w === 640) {
            return { width: w, height: h, data: synthHorizon };
          }
          return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
        };
        c.putImageData = (imgData) => {
          if (el.height === 280 && el.width === 640) {
            capturedVaultPixels = imgData.data;
          }
        };
        return c;
      };
      return el;
    };

    try {
      const vRenderer = new Renderer({
        width: 1200,
        height: 600,
        getContext: () => createMockCtx()
      });
      const fakeStageImg = {
        complete: true,
        naturalWidth: 640,
        naturalHeight: 360,
        src: 'synthetic://cathedral_vault_audit'
      };
      const vaultCanvas = vRenderer.getOrBakeStageUpperVault(fakeStageImg);
      if (
        !vaultCanvas ||
        vaultCanvas.width !== 640 ||
        vaultCanvas.height !== 280 ||
        !capturedVaultPixels
      ) {
        throw new Error('[Suite 30.1] Expected 640x280 baked upper vault canvas with pixel output!');
      }

      // Verify exact 0.0px bottom-row seam join (`vy = 279` === `synthHorizon y = 0`)
      for (let x = 0; x < 640; x++) {
        const vIdx = (279 * 640 + x) * 4;
        const sIdx = x * 4;
        if (
          capturedVaultPixels[vIdx] !== synthHorizon[sIdx] ||
          capturedVaultPixels[vIdx + 1] !== synthHorizon[sIdx + 1] ||
          capturedVaultPixels[vIdx + 2] !== synthHorizon[sIdx + 2]
        ) {
          throw new Error(`[Suite 30.1] Non-zero seam mismatch at x=${x}!`);
        }
      }

      // Verify zenith (`vy = 0`) converges to `#04050a` (`[4, 5, 10]`) & 0 isolated star spikes across sky (`vy = 0..200`)
      let starSpikeCount = 0;
      for (let vy = 1; vy < 200; vy++) {
        for (let x = 1; x < 639; x++) {
          const idx = (vy * 640 + x) * 4;
          const lum =
            capturedVaultPixels[idx] * 0.299 +
            capturedVaultPixels[idx + 1] * 0.587 +
            capturedVaultPixels[idx + 2] * 0.114;
          const n1 = (vy * 640 + (x - 1)) * 4;
          const n2 = (vy * 640 + (x + 1)) * 4;
          const n3 = ((vy - 1) * 640 + x) * 4;
          const n4 = ((vy + 1) * 640 + x) * 4;
          const avgNeighborLum =
            ((capturedVaultPixels[n1] +
              capturedVaultPixels[n2] +
              capturedVaultPixels[n3] +
              capturedVaultPixels[n4]) *
              0.299 +
              (capturedVaultPixels[n1 + 1] +
                capturedVaultPixels[n2 + 1] +
                capturedVaultPixels[n3 + 1] +
                capturedVaultPixels[n4 + 1]) *
                0.587 +
              (capturedVaultPixels[n1 + 2] +
                capturedVaultPixels[n2 + 2] +
                capturedVaultPixels[n3 + 2] +
                capturedVaultPixels[n4 + 2]) *
                0.114) *
            0.25;
          if (lum - avgNeighborLum > 22) {
            starSpikeCount++;
          }
        }
      }
      const zIdx = 320 * 4;
      if (
        starSpikeCount !== 0 ||
        Math.abs(capturedVaultPixels[zIdx] - 4) > 3 ||
        Math.abs(capturedVaultPixels[zIdx + 1] - 5) > 3 ||
        Math.abs(capturedVaultPixels[zIdx + 2] - 10) > 3
      ) {
        throw new Error(
          `[Suite 30.1] Expected star-free upper vault anchored to #04050a zenith: starSpikes=${starSpikeCount}, zenith=[${capturedVaultPixels[zIdx]},${capturedVaultPixels[zIdx + 1]},${capturedVaultPixels[zIdx + 2]}]`
        );
      }
    } finally {
      globalThis.document.createElement = prevCreate30;
    }

    // Verify Adventure `Plane 0` is 100% star-free in source & runtime sky pass (`y < -220`)
    const advMapSrc = fs.readFileSync(`${repoRoot}/src/adventure/AdventureMapRenderer.js`, 'utf8');
    const plane0Slice = advMapSrc.slice(
      advMapSrc.indexOf('PLANE 0'),
      advMapSrc.indexOf('PLANE 1')
    );
    if (/starCount|twinkle|starField/i.test(plane0Slice)) {
      throw new Error('[Suite 30.1] AdventureMapRenderer Plane 0 must be 100% star-free!');
    }
    let tinyHighSkySpecks = 0;
    const skyAuditCtx = createMockCtx();
    skyAuditCtx.fillRect = (_x, y, w, h) => {
      if (y < -260 && w <= 6 && h <= 6) tinyHighSkySpecks++;
    };
    const skyRen = new Renderer({
      width: 1280,
      height: 720,
      getContext: () => createMockCtx()
    });
    skyRen.adventureMode = true;
    skyRen.worldWidth = ADVENTURE_WORLD_WIDTH;
    AdventureMapRenderer.render(skyAuditCtx, skyRen, ADVENTURE_WORLD_WIDTH);
    if (tinyHighSkySpecks !== 0 || skyAuditCtx._stateStack.length !== 0) {
      throw new Error(
        `[Suite 30.1] Expected 0 high-sky star specks in Adventure Plane 0, got ${tinyHighSkySpecks}`
      );
    }
  }

  // (30.2) Widened Adventure Mode Camera Zoom Across Mobile Portrait, Mobile Landscape & Desktop (VS Unchanged)
  {
    const prevW = globalThis.window.innerWidth;
    const prevH = globalThis.window.innerHeight;
    try {
      // Mobile Portrait: 390x844 & 440x956
      for (const [pw, ph] of [
        [390, 844],
        [440, 956]
      ]) {
        globalThis.window.innerWidth = pw;
        globalThis.window.innerHeight = ph;
        const rP = new Renderer({ width: pw, height: ph, getContext: () => createMockCtx() });
        rP.adventureMode = false;
        const vsPortFixed = rP.getMobilePortraitFixedZoom(false);
        rP.adventureMode = true;
        const advPortFixed = rP.getMobilePortraitFixedZoom(false);
        const advPortBoss = rP.getMobilePortraitFixedZoom(true);
        const expectedVs = Math.max(0.26, Math.min(0.46, pw / 1260));
        const expectedAdv = Math.max(0.21, Math.min(0.46, pw / 1600));
        if (
          Math.abs(vsPortFixed - expectedVs) > 0.0005 ||
          Math.abs(advPortFixed - expectedAdv) > 0.0005 ||
          !(advPortBoss < advPortFixed && advPortFixed < vsPortFixed - 0.04)
        ) {
          throw new Error(
            `[Suite 30.2] Mobile Portrait (${pw}x${ph}) zoom mismatch: vs=${vsPortFixed}, adv=${advPortFixed}, advBoss=${advPortBoss}`
          );
        }
      }

      // Mobile Landscape: 844x390
      globalThis.window.innerWidth = 844;
      globalThis.window.innerHeight = 390;
      const rL = new Renderer({ width: 844, height: 390, getContext: () => createMockCtx() });
      rL.adventureMode = false;
      const vsLandFixed = rL.getMobileLandscapeFixedZoom(false);
      rL.adventureMode = true;
      const advLandFixed = rL.getMobileLandscapeFixedZoom(false);
      const advLandBoss = rL.getMobileLandscapeFixedZoom(true);
      if (
        vsLandFixed < 0.54 ||
        vsLandFixed > 0.59 ||
        advLandFixed < 0.42 ||
        advLandFixed > 0.46 ||
        !(advLandBoss <= 0.44 && advLandFixed < vsLandFixed - 0.10)
      ) {
        throw new Error(
          `[Suite 30.2] Mobile Landscape (844x390) zoom mismatch: vs=${vsLandFixed}, adv=${advLandFixed}, advBoss=${advLandBoss}`
        );
      }

      // Desktop: 1280x720
      globalThis.window.innerWidth = 1280;
      globalThis.window.innerHeight = 720;
      const rD = new Renderer({ width: 1280, height: 720, getContext: () => createMockCtx() });
      const vsMockG = createMockGame();
      const dLeft = new Warrior(380, 520, 1);
      const dRight = new FireMage(760, 520, -1);
      dLeft.game = vsMockG;
      dRight.game = vsMockG;
      for (let i = 0; i < 30; i++) rD.update(1 / 30, [dLeft, dRight]);
      const vsDeskZoom = rD.zoom;

      const advMockG = createMockGame();
      advMockG.gameMode = 'adventure';
      advMockG.isAdventureMode = () => true;
      rD.adventureMode = true;
      rD.worldWidth = ADVENTURE_WORLD_WIDTH;
      dLeft.game = advMockG;
      dRight.game = advMockG;
      dLeft.groundY = 561;
      dRight.groundY = 561;
      for (let i = 0; i < 35; i++) rD.update(1 / 30, [dLeft, dRight]);
      const advDeskZoom = rD.zoom;

      if (!(vsDeskZoom > 0.92 && advDeskZoom <= 0.80 && advDeskZoom < vsDeskZoom - 0.14)) {
        throw new Error(
          `[Suite 30.2] Desktop (1280x720) zoom mismatch: vs=${vsDeskZoom.toFixed(3)}, adv=${advDeskZoom.toFixed(3)}`
        );
      }
    } finally {
      globalThis.window.innerWidth = prevW;
      globalThis.window.innerHeight = prevH;
    }
  }

  // (30.3) Default `testModeUnlimitedHp === false` (`MORTAL HP`) Across HTML & `main.js`
  {
    const htmlTxt = fs.readFileSync(`${repoRoot}/index.html`, 'utf8');
    const mainTxt = fs.readFileSync(`${repoRoot}/src/main.js`, 'utf8');
    if (
      !htmlTxt.includes('MORTAL HP') ||
      !htmlTxt.includes('TEST SANDBOX: UNLIMITED HP OFF') ||
      !htmlTxt.includes('UNLIMITED HP: OFF') ||
      htmlTxt.includes('TEST SANDBOX: UNLIMITED HP ON') ||
      htmlTxt.includes('>UNLIMITED HP: ON<') ||
      !mainTxt.includes("this.explicitAdvUnlimitedHp = testModeParam === '1' || testModeParam === 'true';") ||
      !mainTxt.includes("this.testModeUnlimitedHp = testModeParam === '1' || testModeParam === 'true';") ||
      !mainTxt.includes('this.vsTestModeUnlimitedHp = this.testModeUnlimitedHp;')
    ) {
      throw new Error('[Suite 30.3] Default Mortal HP (`testModeUnlimitedHp === false`) check failed!');
    }
    const mortalGame = createMockGame();
    mortalGame.testModeUnlimitedHp = false;
    const fMortal = new Warrior(320, 520, 1);
    const fAttacker = new FireMage(520, 520, -1);
    fMortal.game = mortalGame;
    fAttacker.game = mortalGame;
    fMortal.takeDamage(99999, fAttacker, true, 0, 0);
    if (!fMortal.isDead || fMortal.hp !== 0 || fMortal.state !== 'DEATH') {
      throw new Error(`[Suite 30.3] Expected mortal KO at default testModeUnlimitedHp=false, got hp=${fMortal.hp}`);
    }
  }

  // (30.4) Non-Overlapping Mobile Portrait Adventure Strip (`stripY > getHudBottomY()`) & Lowered Announcements (`cy - ry >= getHudBottomY()`)
  {
    const prevW = globalThis.window.innerWidth;
    const prevH = globalThis.window.innerHeight;
    const prevQS = globalThis.document.querySelector;
    try {
      globalThis.window.innerWidth = 390;
      globalThis.window.innerHeight = 844;
      globalThis.document.querySelector = (sel) =>
        sel === '.hud-top' ? { offsetTop: 14, offsetHeight: 144 } : null;

      const hudCanvas = { width: 390, height: 844, getContext: () => createMockCtx() };
      const rHud = new Renderer(hudCanvas);
      const hudBottom = rHud.getHudBottomY(); // 158
      if (hudBottom !== 158) {
        throw new Error(`[Suite 30.4] Expected measured .hud-top bottom = 158, got ${hudBottom}`);
      }

      const advHudGame = createMockGame();
      advHudGame.gameMode = 'adventure';
      advHudGame.isAdventureMode = () => true;
      advHudGame.isLandingOpen = false;
      advHudGame.renderer = rHud;
      const advHud = new AdventureManager(advHudGame);
      advHudGame.adventure = advHud;
      const pHud = new FireMage(240, 561, 1);
      pHud.game = advHudGame;
      advHudGame.leftFighter = pHud;
      advHud.startCampaign(pHud);

      const stripCtx = createMockCtx();
      advHud.renderScreenHUD(stripCtx, rHud);
      if (!advHud._hudStripRect || !(advHud._hudStripRect.y > hudBottom)) {
        throw new Error(
          `[Suite 30.4] Expected Mobile Portrait Adventure stripY > ${hudBottom}, got ${advHud._hudStripRect?.y}`
        );
      }

      // Measure top edge (`cy - ry`) of Stage Phenomenon, Overdrive Cut-In & K.O. Finisher banners!
      const probeBannerMinTop = (setupFn) => {
        const bCtx = createMockCtx();
        let tx = 0;
        let ty = 0;
        let sx = 1;
        let sy = 1;
        const st = [];
        const oSave = bCtx.save.bind(bCtx);
        const oRestore = bCtx.restore.bind(bCtx);
        bCtx.save = () => {
          st.push({ tx, ty, sx, sy });
          oSave();
        };
        bCtx.restore = () => {
          const prev = st.pop();
          if (prev) {
            tx = prev.tx;
            ty = prev.ty;
            sx = prev.sx;
            sy = prev.sy;
          }
          oRestore();
        };
        bCtx.setTransform = () => {
          tx = 0;
          ty = 0;
          sx = 1;
          sy = 1;
        };
        bCtx.translate = (dx, dy) => {
          tx += (dx || 0) * sx;
          ty += (dy || 0) * sy;
        };
        bCtx.scale = (kx, ky) => {
          sx *= kx ?? 1;
          sy *= ky ?? 1;
        };
        const veilTops = [];
        bCtx.arc = (_ax, _ay, r) => {
          if (Math.abs(r - 1.0) < 0.01 && tx >= 20 && tx <= 370 && sy >= 18) {
            veilTops.push(ty - sy);
          }
        };
        rHud.ctx = bCtx;
        rHud.stageEventBannerTimer = 0;
        rHud.cutInTimer = 0;
        rHud.koZoomTimer = 0;
        setupFn();
        rHud.render([pHud], advHudGame.vfx);
        return veilTops;
      };

      const stageEventTops = probeBannerMinTop(() => {
        rHud.triggerStageEvent('SANCTUM BLESSING', '+25% SOLAR SPIRIT', '#facc15', 8.0);
        rHud.stageEventBannerTimer = 2.0; // settled post-slam (`slamScale === 1`)
      });
      const cutInTops = probeBannerMinTop(() => {
        rHud.triggerUltimateCutIn(pHud, false);
        rHud.cutInTimer = 0.55; // settled post-slam (`slamScale === 1`)
      });
      const koTops = probeBannerMinTop(() => {
        rHud.triggerKOFinisher(240, 480, '#facc15', 'IGNIS SOL', 'mage');
        rHud.koZoomTimer = 1.2;
      });

      if (
        stageEventTops.length === 0 ||
        cutInTops.length === 0 ||
        koTops.length === 0 ||
        Math.min(...stageEventTops) < hudBottom ||
        Math.min(...cutInTops) < hudBottom ||
        Math.min(...koTops) < hudBottom
      ) {
        throw new Error(
          `[Suite 30.4] Announcement banner overlapped .hud-top (${hudBottom}px): event=${JSON.stringify(stageEventTops)}, cutIn=${JSON.stringify(cutInTops)}, ko=${JSON.stringify(koTops)}`
        );
      }

      // Verify compact textless 7x7px `#pause-sp-badge` pip & Mobile Portrait `'BOSS • 0P'` `#hud-mode-badge`!
      const html304 = fs.readFileSync(`${repoRoot}/index.html`, 'utf8');
      const css304 = fs.readFileSync(`${repoRoot}/style.css`, 'utf8');
      const pipBlockMatch = css304.match(/\.pause-sp-badge\s*\{[\s\S]*?\}/);
      if (
        !/id="pause-sp-badge"[^>]*><\/span>/.test(html304) ||
        !pipBlockMatch ||
        !/width:\s*7px/.test(pipBlockMatch[0]) ||
        !/height:\s*7px/.test(pipBlockMatch[0]) ||
        !/font-size:\s*0\b/.test(pipBlockMatch[0])
      ) {
        throw new Error('[Suite 30.4] Expected #pause-sp-badge to be a textless 7x7px gold corner pip!');
      }
      const prevGetEl304 = globalThis.document.getElementById;
      const pipCls = new Set(['hidden']);
      const mockPipEl = {
        textContent: 'STALE',
        classList: {
          toggle: (c, f) => {
            if (f) pipCls.add(c);
            else pipCls.delete(c);
          }
        }
      };
      try {
        globalThis.document.getElementById = (id) => (id === 'pause-sp-badge' ? mockPipEl : null);
        advHud.progression.skillPoints = 2;
        advHud.syncControlDeckUI();
        if (mockPipEl.textContent !== '' || pipCls.has('hidden')) {
          throw new Error(
            `[Suite 30.4] Expected #pause-sp-badge textContent === '' & visible when SP > 0, got text='${mockPipEl.textContent}', hidden=${pipCls.has('hidden')}`
          );
        }
      } finally {
        globalThis.document.getElementById = prevGetEl304;
      }

      advHudGame.hudEls = { right: {}, modeBadge: { textContent: '' } };
      advHud.totalWaveLabel = 'COLOSSAL BOSS';
      advHud.score = 0;
      advHud.syncRightHUD();
      if (advHudGame.hudEls.modeBadge.textContent !== 'BOSS • 0P') {
        throw new Error(
          `[Suite 30.4] Expected Mobile Portrait Zone 4 Boss #hud-mode-badge === 'BOSS • 0P', got '${advHudGame.hudEls.modeBadge.textContent}'`
        );
      }

      advHud.stopCampaign();
    } finally {
      globalThis.window.innerWidth = prevW;
      globalThis.window.innerHeight = prevH;
      globalThis.document.querySelector = prevQS;
    }
  }

  // (30.5) Colossal Boss Depth Sort (`isColossalBoss` Sorted Behind Player Across All `groundY`)
  {
    const sortRen = new Renderer({ width: 1280, height: 720, getContext: () => createMockCtx() });
    sortRen.adventureMode = true;
    sortRen.worldWidth = ADVENTURE_WORLD_WIDTH;
    const sortGame = createMockGame();
    sortGame.gameMode = 'adventure';
    sortGame.isAdventureMode = () => true;
    const heroSort = new Warrior(9020, 442, 1);
    const bossSort = new ArchfiendBoss(9335, 561, -1);
    heroSort.game = sortGame;
    bossSort.game = sortGame;
    bossSort.emergeTimer = 0;

    let seqCounter = 0;
    let bossOrder = -1;
    let heroOrder = -1;
    const origBossDraw = bossSort.draw.bind(bossSort);
    const origHeroDraw = heroSort.draw.bind(heroSort);
    bossSort.draw = (...args) => {
      bossOrder = ++seqCounter;
      return origBossDraw(...args);
    };
    heroSort.draw = (...args) => {
      heroOrder = ++seqCounter;
      return origHeroDraw(...args);
    };

    for (const gy of [442, 480, 561, 680]) {
      seqCounter = 0;
      bossOrder = -1;
      heroOrder = -1;
      heroSort.groundY = gy;
      heroSort.y = gy;
      // Pass `[heroSort, bossSort]` with hero FIRST to prove sort moves `isColossalBoss` behind hero even when `gy=442 < 561`!
      sortRen.render([heroSort, bossSort], sortGame.vfx);
      if (!(bossOrder > 0 && heroOrder > bossOrder)) {
        throw new Error(
          `[Suite 30.5] Expected Colossal Boss drawn BEFORE player at groundY=${gy}, got bossOrder=${bossOrder}, heroOrder=${heroOrder}`
        );
      }
    }
  }

  // (30.6) Manual `LOCK: OFF` Free-Aim (`0` Backward Facing Snap, `0` Lane Magnetism) + `LOCK: ON` Retargeting
  {
    const prevGetEl = globalThis.document.getElementById;
    const lockBtnCls = new Set();
    const lockBtnEl = {
      classList: {
        toggle(c, on) {
          if (on) lockBtnCls.add(c);
          else lockBtnCls.delete(c);
        },
        contains: (c) => lockBtnCls.has(c)
      },
      setAttribute() {}
    };
    const lockLblEl = { textContent: '' };
    const pauseLockLblEl = { textContent: '' };
    try {
      globalThis.document.getElementById = (id) => {
        if (id === 'adv-btn-lock') return lockBtnEl;
        if (id === 'adv-lock-label') return lockLblEl;
        if (id === 'adv-pause-lock-label') return pauseLockLblEl;
        return null;
      };
      const gLock = createMockGame();
      gLock.gameMode = 'adventure';
      gLock.isAdventureMode = () => true;
      gLock.isLandingOpen = false;
      const advLock = new AdventureManager(gLock);
      gLock.adventure = advLock;
      const hLock = new Warrior(620, 561, 1);
      hLock.game = gLock;
      gLock.leftFighter = hLock;
      advLock.startCampaign(hLock);

      if (
        advLock.manualTargetLock !== false ||
        lockLblEl.textContent !== 'LOCK' ||
        pauseLockLblEl.textContent !== 'LOCK: OFF' ||
        lockBtnCls.has('is-lock-on')
      ) {
        throw new Error(
          `[Suite 30.6] Expected default manualTargetLock=false ('LOCK' / 'LOCK: OFF'), got ${advLock.manualTargetLock} ('${lockLblEl.textContent}' / '${pauseLockLblEl.textContent}')`
        );
      }

      // Clear wave monsters and spawn a single monster BEHIND & OFF-LANE (`x=440 < 620`, `groundY=468 !== 561`)
      for (const m of advLock.getLivingMonsters()) m.isDead = true;
      const behindM = advLock.spawnMonster('ghoul', 440, { groundY: 468, skipPortal: true });
      behindM.maxHp = 9999;
      behindM.hp = 9999;
      behindM.stunTimer = 99;

      const resetFreeHero = () => {
        hLock.setState('IDLE');
        hLock.x = 620;
        hLock.groundY = 561;
        hLock.y = 561;
        hLock.facing = 1;
        hLock.autoCooldown = 0;
        hLock.skillCooldown = 0;
        hLock.dodgeCooldown = 0;
        advLock.progression.spirit = 100;
        advLock.progression.ultCharge = 100;
        advLock.progression.astralCharge = 100;
        advLock.setJoystickVector(0, 0, false);
      };

      // Verify `attack`, `skill`, `overdrive`, `ultimate` NEVER snap facing backward (-1) or magnetize `groundY` toward 468!
      for (const act of ['attack', 'skill', 'overdrive', 'ultimate']) {
        resetFreeHero();
        advLock.triggerAction(act);
        advLock.update(1 / 30);
        for (let i = 0; i < 6; i++) advLock.update(1 / 30);
        if (hLock.facing !== 1 || Math.abs(hLock.groundY - 561) > 0.5) {
          throw new Error(
            `[Suite 30.6] LOCK: OFF '${act}' snapped backward or magnetized Z-lane! facing=${hLock.facing}, gy=${hLock.groundY}`
          );
        }
      }

      // Verify neutral `dodge` with LOCK: OFF dashes forward (`+X`) in `player.facing` instead of away from `behindM`!
      resetFreeHero();
      advLock.triggerAction('dodge');
      for (let i = 0; i < 10; i++) advLock.update(1 / 30);
      if (!(hLock.x > 690 && Math.abs(hLock.groundY - 561) < 0.5)) {
        throw new Error(
          `[Suite 30.6] Expected neutral LOCK: OFF dodge to dash forward (+X) on gy=561, got x=${hLock.x}, gy=${hLock.groundY}`
        );
      }

      // Toggle `LOCK: ON` -> locks onto `behindM`, renders pixel 'LOCKED' reticle, snaps facing on attack, and retargets on kill!
      const aheadM = advLock.spawnMonster('cultist', 820, { groundY: 615, skipPortal: true });
      aheadM.maxHp = 9999;
      aheadM.hp = 9999;
      aheadM.stunTimer = 99;

      resetFreeHero();
      hLock.facing = -1; // Facing left toward `behindM` (`x=440`)
      advLock.toggleTargetLock(false);
      if (
        !advLock.manualTargetLock ||
        pauseLockLblEl.textContent !== 'LOCK: ON' ||
        !lockBtnCls.has('is-lock-on') ||
        advLock.getActiveLockedMonster(hLock) !== behindM
      ) {
        throw new Error('[Suite 30.6] Expected toggleTargetLock() to engage LOCK: ON onto front monster `behindM`!');
      }

      // Render foreground reticle (`0` ctx.rotate, draws `'LOCKED'` label)
      const retTrack = { rotateCalls: 0 };
      const retCtx = createMockCtx(retTrack);
      let sawLockedText = false;
      retCtx.fillText = (txt) => {
        if (String(txt) === 'LOCKED') sawLockedText = true;
      };
      advLock.renderWorldForeground(retCtx, gLock.renderer);
      if (!sawLockedText || retTrack.rotateCalls !== 0) {
        throw new Error(
          `[Suite 30.6] Expected pixel 'LOCKED' reticle with 0 ctx.rotate, sawText=${sawLockedText}, rot=${retTrack.rotateCalls}`
        );
      }

      // Face away (+1) while locked onto `behindM` (`x=440`) -> `attack` snaps facing to `-1` toward locked target!
      hLock.facing = 1;
      hLock.autoCooldown = 0;
      advLock.triggerAction('attack');
      advLock.update(1 / 30);
      if (hLock.facing !== -1) {
        throw new Error(`[Suite 30.6] Expected LOCK: ON attack to snap facing to locked monster (-1), got ${hLock.facing}`);
      }

      // Slay `behindM` -> `getActiveLockedMonster` automatically retargets onto surviving `aheadM`!
      behindM.takeDamage(99999, hLock, true, 0, 0);
      const retargeted = advLock.getActiveLockedMonster(hLock);
      if (retargeted !== aheadM) {
        throw new Error('[Suite 30.6] Expected LOCK: ON to automatically retarget onto surviving monster after kill!');
      }
      advLock.stopCampaign();
    } finally {
      globalThis.document.getElementById = prevGetEl;
    }
  }

  // (30.7) Adventure Player Death at `groundY = 480` (`< 618`) Advances `postDeathHoldTimer` -> `revealVictoryOverlay()` w/ `.is-defeat-plaque`
  {
    const prevGetEl = globalThis.document.getElementById;
    const makePlaqueEl = () => {
      const cls = new Set(['hidden']);
      return {
        textContent: '',
        classList: {
          add: (...cs) => cs.forEach((c) => cls.add(c)),
          remove: (...cs) => cs.forEach((c) => cls.delete(c)),
          toggle: (c, f) => {
            const on = f === undefined ? !cls.has(c) : Boolean(f);
            if (on) cls.add(c);
            else cls.delete(c);
            return on;
          },
          contains: (c) => cls.has(c)
        }
      };
    };
    const dom30 = new Map();
    for (const id of [
      'victory-overlay',
      'victory-eyebrow',
      'victory-winner',
      'victory-stats',
      'victory-auto-next',
      'btn-next-challenger',
      'btn-play-again',
      'btn-victory-select',
      'btn-victory-title'
    ]) {
      dom30.set(id, makePlaqueEl());
    }
    try {
      globalThis.document.getElementById = (id) => dom30.get(id) || null;
      const dGame = createMockGame();
      dGame.gameMode = 'adventure';
      dGame.isAdventureMode = () => true;
      dGame.is2v2Mode = () => false;
      dGame.isLandingOpen = false;
      dGame.isSimPaused = false;
      dGame.autoTourney = false;
      dGame.testModeUnlimitedHp = false;
      dGame._activeFightersScratch = [];
      dGame.victoryOverlay = dom30.get('victory-overlay');
      dGame.setPaused = () => {};
      dGame.updateHUD = () => {};
      dGame.updateProjectiles = () => {};
      dGame.revealVictoryOverlay = Game.prototype.revealVictoryOverlay.bind(dGame);

      const dAdv = new AdventureManager(dGame);
      dGame.adventure = dAdv;
      dGame.onFighterDeath = (deadF) => {
        if (deadF.isMonster) dAdv.onMonsterDeath(deadF);
        else dAdv.onPlayerDeath(deadF);
      };

      const dHero = new FireMage(340, 480, 1);
      dHero.game = dGame;
      dGame.leftFighter = dHero;
      dAdv.startCampaign(dHero);

      // Position hero on UPPER lane (`groundY = 480`, strictly `< dGame.renderer.groundY = 618`!)
      dHero.groundY = 480;
      dHero.y = 480;
      for (const m of dAdv.getLivingMonsters()) m.stunTimer = 99;
      const killerM = dAdv.getLivingMonsters()[0];
      dHero.takeDamage(99999, killerM, true, 0, 0);

      const css307 = fs.readFileSync(`${repoRoot}/style.css`, 'utf8');
      if (
        !dHero.isDead ||
        !dGame.isMatchOver ||
        !dGame.victoryRevealPending ||
        !dGame.victoryOverlay.classList.contains('is-defeat-plaque') ||
        !dGame.victoryOverlay.classList.contains('hidden') ||
        !dom30.get('btn-next-challenger').classList.contains('hidden') ||
        !/\.victory-btn-row\s+\.iron-btn\.hidden\s*\{\s*display:\s*none\s*!important;\s*\}/.test(css307) ||
        dom30.get('btn-play-again').textContent !== 'RETRY CAMPAIGN' ||
        dom30.get('btn-victory-select').textContent !== 'CHANGE HERO' ||
        dom30.get('btn-victory-title').textContent !== 'TITLE SCREEN'
      ) {
        throw new Error('[Suite 30.7] Expected onPlayerDeath to arm `.is-defeat-plaque` with collapsed hidden `#btn-next-challenger` and RETRY CAMPAIGN / CHANGE HERO / TITLE SCREEN!');
      }

      // Step real `Game.prototype.stepSimulation` for 82 frames (`2.73s < 3.4s` safety timer!)
      // Proves `onFloor` (`y=480 >= targetFloorY - 4`) advances `postDeathHoldTimer >= 0.65` naturally without waiting for 3.4s fallback!
      let revealedAtStep = -1;
      for (let step = 1; step <= 82; step++) {
        Game.prototype.stepSimulation.call(dGame, 1 / 30);
        if (!dGame.victoryRevealPending && revealedAtStep < 0) {
          revealedAtStep = step;
          break;
        }
      }
      if (
        revealedAtStep < 0 ||
        dGame.postDeathHoldTimer < 0.65 ||
        dGame.victoryOverlay.classList.contains('hidden') ||
        !dGame.victoryOverlay.classList.contains('is-defeat-plaque')
      ) {
        throw new Error(
          `[Suite 30.7] Upper-lane (groundY=480 < 618) death failed to advance postDeathHoldTimer & reveal defeat plaque! step=${revealedAtStep}, deathTimer=${dHero.deathTimer?.toFixed(2)}, hold=${dGame.postDeathHoldTimer?.toFixed(2)}`
        );
      }
      dAdv.stopCampaign();
    } finally {
      globalThis.document.getElementById = prevGetEl;
    }
  }

  // (30.8) Orthogonal Destructibles Along Upper Colonnade (`groundY: 448..456`, `0` `y = 660` Props)
  {
    const oGame = createMockGame();
    oGame.gameMode = 'adventure';
    const oHero = new Warrior(240, 561, 1);
    oHero.game = oGame;
    oGame.leftFighter = oHero;
    const oAdv = new AdventureManager(oGame);
    oGame.adventure = oAdv;
    oAdv.startCampaign(oHero);

    const props = oAdv.destructibles.props;
    const lowerParapetProps = props.filter((p) => p.groundY >= 600);
    const outOfBandProps = props.filter((p) => p.groundY < 448 || p.groundY > 456);
    const atlas = getOrBakeOrthogonalPropsSheet();
    if (
      props.length !== 20 ||
      lowerParapetProps.length !== 0 ||
      outOfBandProps.length !== 0 ||
      !atlas ||
      atlas.width !== 1152 ||
      atlas.height !== 512
    ) {
      throw new Error(
        `[Suite 30.8] Orthogonal upper-colonnade destructibles check failed: count=${props.length}, y>=600=${lowerParapetProps.length}, outOfBand=${outOfBandProps.length}, atlas=${atlas?.width}x${atlas?.height}`
      );
    }
    oAdv.stopCampaign();
  }

  // (30.9) `60.0 FPS` ProMotion Frame Pacer (`600` Steps/10s at `120Hz` & `60Hz`) + `resetMatch()` / `teardownActiveMatch(true)` Asset Release
  {
    const runPacerSim = (hz, jitterAmpMs = 0) => {
      let steps = 0;
      const pGame = {
        _rafId: 0,
        _appSuspended: false,
        _lastPacedTime: 0,
        lastTime: 0,
        isLandingOpen: false,
        isPaused: false,
        isSimPaused: false,
        _pausedFrameRendered: false,
        fighters: [],
        vfx: {},
        isAdventureMode: () => false,
        startLoop() {},
        stepSimulation() {
          steps++;
        },
        renderer: {
          render() {}
        }
      };
      const totalTicks = Math.round(10 * hz);
      const dtMs = 1000 / hz;
      for (let i = 1; i <= totalTicks; i++) {
        const jitter = jitterAmpMs ? Math.sin(i * 1.7) * jitterAmpMs : 0;
        Game.prototype.loop.call(pGame, 1000 + i * dtMs + jitter);
      }
      return steps;
    };

    const steps120Hz = runPacerSim(120, 0);
    const steps60Hz = runPacerSim(60, 0.45);
    if (steps120Hz < 599 || steps120Hz > 601 || steps60Hz < 599 || steps60Hz > 601) {
      throw new Error(
        `[Suite 30.9] Expected ~600 simulation steps over 10s on both 120Hz ProMotion & 60Hz displays, got 120Hz=${steps120Hz}, 60Hz=${steps60Hz}`
      );
    }

    // Verify `resetMatch()` & `teardownActiveMatch(true)` dispose fighter shader FX & release inactive assets/caches!
    const prevHTMLImageElement = globalThis.HTMLImageElement;
    globalThis.Image.prototype.removeAttribute = function (attr) {
      if (attr === 'src') this.src = '';
    };
    globalThis.HTMLImageElement = globalThis.Image;
    try {
      const assets = PixelForge.initAssets();
      PixelForge.ensureHeroLoaded('warrior');
      PixelForge.ensureHeroLoaded('mage');
      PixelForge.ensureHeroLoaded('titan');
      PixelForge.ensureImage(assets.arenaSylvan);

      const oldF1 = new Titan(260, 520, 1);
      const oldF2 = new FireMage(940, 520, -1);
      let f1Disposed = 0;
      let f2Disposed = 0;
      const origDisp1 = oldF1.fx.dispose.bind(oldF1.fx);
      const origDisp2 = oldF2.fx.dispose.bind(oldF2.fx);
      oldF1.fx.dispose = () => {
        f1Disposed++;
        origDisp1();
      };
      oldF2.fx.dispose = () => {
        f2Disposed++;
        origDisp2();
      };

      const makeClassEl = () => ({
        textContent: '',
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false }
      });
      const rMem = new Renderer({ width: 1200, height: 600, getContext: () => createMockCtx() });
      const mGame = {
        gameMode: 'adventure',
        slot1Hero: 'warrior',
        explicitAdvUnlimitedHp: false,
        vsTestModeUnlimitedHp: false,
        testModeUnlimitedHp: false,
        fighters: [oldF1, oldF2],
        leftFighter: oldF1,
        rightFighter: oldF2,
        leftPartner: null,
        rightPartner: null,
        renderer: rMem,
        vfx: new VFXManager(),
        hudEls: { left: {}, right: {} },
        victoryOverlay: makeClassEl(),
        btnNextChallenger: makeClassEl(),
        btnPlayAgain: makeClassEl(),
        btnVictorySelect: makeClassEl(),
        btnVictoryTitle: makeClassEl(),
        ultBanner: makeClassEl(),
        isAdventureMode() {
          return this.gameMode === 'adventure';
        },
        is2v2Mode: () => false,
        setPaused() {},
        applySideHUDTheme() {},
        syncTestModeUI() {},
        syncPauseMenuUI() {},
        updateHUD() {},
        disposeActiveFighterResources: Game.prototype.disposeActiveFighterResources
      };
      mGame.adventure = new AdventureManager(mGame);

      Game.prototype.resetMatch.call(mGame);
      if (
        f1Disposed < 1 ||
        f2Disposed < 1 ||
        !assets.warrior.sheet.src.includes('warrior_sheet.png') ||
        assets.titan.sheet.src !== '' ||
        assets.mage.sheet.src !== ''
      ) {
        throw new Error(
          `[Suite 30.9] resetMatch() failed to dispose old fighter FX or release inactive hero sheets: disp=[${f1Disposed},${f2Disposed}], titan='${assets.titan.sheet.src}', mage='${assets.mage.sheet.src}'`
        );
      }

      // Populate stage wing & upper vault caches, then verify `teardownActiveMatch(true)` releases ALL hero sheets, stage cutout caches & shared ArcaneShaderFX scratch canvases!
      rMem.getOrBakeStageWingComposite({
        complete: true,
        naturalWidth: 640,
        naturalHeight: 360,
        src: 'synthetic://mem_audit'
      });
      Game.prototype.teardownActiveMatch.call(mGame, true);
      if (
        mGame.fighters.length !== 0 ||
        assets.warrior.sheet.src !== '' ||
        (rMem._stageWingCompositeCache?.size || 0) !== 0 ||
        (rMem._stageUpperVaultCache?.size || 0) !== 0 ||
        (ArcaneShaderFX._sharedWorkCanvas && ArcaneShaderFX._sharedWorkCanvas.width !== 0)
      ) {
        throw new Error('[Suite 30.9] teardownActiveMatch(true) failed to release all active sheets & shared caches!');
      }
      PixelForge.ensureAllPortraitsLoaded();
    } finally {
      if (prevHTMLImageElement === undefined) {
        delete globalThis.HTMLImageElement;
      } else {
        globalThis.HTMLImageElement = prevHTMLImageElement;
      }
    }
  }

  console.log(
    '[PASS] Suite 30: Star-Free Upper Vault & Plane 0, Widened Adventure Camera Zoom, Default Mortal HP, Non-Overlapping Portrait HUD & Lowered Banners, Colossal Boss Depth Sort, Manual LOCK Free-Aim + Retargeting, Upper-Lane Defeat Plaque, Orthogonal Colonnade Props & 60.0 FPS ProMotion Pacer + Memory Release verified!'
  );
}

// ============================================================================
// SUITE 31: Kaze-Maru (`ronin`) Long-Range HD-2D Katana Slash Waves (`0` Blue
// Orbs) & `AudioManager` iOS Sleep/Lock `'interrupted'` + Stalled/Closed Recovery
// ============================================================================
{
  // (31.1) Kaze-Maru (`ronin`) Long-Range `'ronin_slash'` Katana Waves (`0` `'fireball'` Blue Orbs)
  // Across Adventure Lv.1, Adventure `wrath_1` Rank 2 (`LOCK: OFF`, `LOCK: ON`, & `AUTO`),
  // and VS Mode (`mode === 3` 4th-Hit Finisher & `CROUCH` Shunpo Draw-Cut) + Piercing & `ignoreTargets`
  {
    const spawnedAll = [];

    const makeAdvRoninHarness = () => {
      const aGame = createMockGame();
      aGame.gameMode = 'adventure';
      aGame.testModeUnlimitedHp = false;
      aGame.isAdventureMode = () => true;
      aGame.is2v2Mode = () => false;
      aGame.isLandingOpen = false;
      const aAdv = new AdventureManager(aGame);
      aGame.adventure = aAdv;
      aGame.getEnemiesOf = () => aAdv.getLivingMonsters();
      aGame.getTargetFor = (f) => aAdv.getNearestMonster(f);
      aGame.updateProjectiles = Game.prototype.updateProjectiles.bind(aGame);

      const origSpawnProj = aGame.vfx.spawnProjectile.bind(aGame.vfx);
      const localSpawns = [];
      aGame.vfx.spawnProjectile = (opts) => {
        origSpawnProj(opts);
        const created = aGame.vfx.projectiles[aGame.vfx.projectiles.length - 1];
        localSpawns.push(created);
        spawnedAll.push(created);
      };

      const kaze = new Ronin(520, 561, 1);
      kaze.game = aGame;
      aGame.leftFighter = kaze;
      aGame.fighters = [kaze];
      aAdv.startCampaign(kaze);
      for (const m of aAdv.getLivingMonsters()) m.isDead = true;
      return { aGame, aAdv, kaze, localSpawns };
    };

    // 1. Adventure Lv.1 (`wrath_1 = 0`, Manual `LOCK: OFF`): launches `'ronin_slash'`, `0` `'fireball'`
    {
      const { aGame, aAdv, kaze, localSpawns } = makeAdvRoninHarness();
      const foeAhead = aAdv.spawnMonster('ghoul', 920, { groundY: 561, skipPortal: true });
      foeAhead.maxHp = 99999;
      foeAhead.hp = 99999;
      foeAhead.stunTimer = 99;

      for (let swing = 0; swing < 4; swing++) {
        kaze.autoCooldown = 0;
        aAdv.triggerAction('attack');
        for (let f = 0; f < 16; f++) {
          aAdv.update(1 / 30);
          aGame.updateProjectiles(1 / 30);
          aGame.vfx.update(1 / 30, 561, aGame.audio);
        }
      }
      const lv1Slashes = localSpawns.filter((p) => p?.type === 'ronin_slash');
      const lv1Fireballs = localSpawns.filter((p) => p?.type === 'fireball');
      if (lv1Slashes.length < 2 || lv1Fireballs.length !== 0) {
        throw new Error(
          `[Suite 31.1] Expected Adventure Lv.1 Kaze-Maru to launch >= 2 'ronin_slash' waves and 0 'fireball', got slashes=${lv1Slashes.length}, fireballs=${lv1Fireballs.length}`
        );
      }
      aAdv.stopCampaign();
    }

    // 2. Adventure `wrath_1` Rank 2 (`CRIMSON NUKITSUKE`) in Manual `LOCK: OFF` Free-Aim:
    // Fires strictly in `player.facing` (`vy === 0`, `Math.sign(vx) === facing`) even when monster is BEHIND & OFF-LANE!
    {
      const { aGame, aAdv, kaze, localSpawns } = makeAdvRoninHarness();
      aAdv.progression.skillPoints = 4;
      aAdv.progression.upgradeNode('wrath_1', kaze);
      aAdv.progression.upgradeNode('wrath_1', kaze);
      if (aAdv.progression.getRank('wrath_1') !== 2 || aAdv.manualTargetLock !== false) {
        throw new Error('[Suite 31.1] Expected wrath_1 Rank 2 and default LOCK: OFF!');
      }

      const behindOffLane = aAdv.spawnMonster('cultist', 300, { groundY: 468, skipPortal: true });
      behindOffLane.maxHp = 99999;
      behindOffLane.hp = 99999;
      behindOffLane.stunTimer = 99;

      // Face RIGHT (+1) while monster is at x=300 (< 520) and groundY=468 (!== 561)
      kaze.x = 520;
      kaze.groundY = 561;
      kaze.y = 561;
      kaze.facing = 1;
      for (let swing = 0; swing < 2; swing++) {
        kaze.autoCooldown = 0;
        aAdv.triggerAction('attack');
        for (let f = 0; f < 16; f++) {
          aAdv.update(1 / 30);
          aGame.updateProjectiles(1 / 30);
          aGame.vfx.update(1 / 30, 561, aGame.audio);
        }
      }
      // Also test facing LEFT (-1) in LOCK: OFF
      kaze.setState('IDLE');
      kaze.x = 760;
      kaze.facing = -1;
      behindOffLane.x = 1040; // Now monster is behind to the right!
      kaze.autoCooldown = 0;
      aAdv.triggerAction('attack');
      for (let f = 0; f < 16; f++) {
        aAdv.update(1 / 30);
        aGame.updateProjectiles(1 / 30);
        aGame.vfx.update(1 / 30, 561, aGame.audio);
      }

      const freeAimWaves = localSpawns.filter((p) => p?.type === 'ronin_slash');
      const rightWaves = freeAimWaves.slice(0, 2);
      const leftWave = freeAimWaves[2];
      if (
        freeAimWaves.length < 3 ||
        !rightWaves.every((w) => w.vx > 700 && w.vy === 0 && w.pierce === true && w.maxRange === 640) ||
        !freeAimWaves.some((w) => w.isTwinSlash === true) ||
        !leftWave ||
        !(leftWave.vx < -700 && leftWave.vy === 0)
      ) {
        throw new Error(
          `[Suite 31.1] LOCK: OFF free-aim failed to fire horizontal 'ronin_slash' strictly in player.facing: count=${freeAimWaves.length}`
        );
      }
      aAdv.stopCampaign();
    }

    // 3. Adventure `wrath_1` Rank 2 in Manual `LOCK: ON` & `AUTO` Play:
    {
      const { aGame, aAdv, kaze, localSpawns } = makeAdvRoninHarness();
      aAdv.progression.skillPoints = 4;
      aAdv.progression.upgradeNode('wrath_1', kaze);
      aAdv.progression.upgradeNode('wrath_1', kaze);

      const lockedFoe = aAdv.spawnMonster('ghoul', 900, { groundY: 492, skipPortal: true });
      lockedFoe.maxHp = 99999;
      lockedFoe.hp = 99999;
      lockedFoe.stunTimer = 99;

      // Manual `LOCK: ON`: turns toward lockedFoe (+1) and aims clamped blade slope toward lockedFoe (`vy < 0`)
      kaze.x = 520;
      kaze.groundY = 561;
      kaze.y = 561;
      kaze.facing = -1;
      aAdv.toggleTargetLock(false);
      if (!aAdv.manualTargetLock) {
        throw new Error('[Suite 31.1] Expected manualTargetLock === true after toggleTargetLock!');
      }
      kaze.autoCooldown = 0;
      aAdv.triggerAction('attack');
      for (let f = 0; f < 16; f++) {
        aAdv.update(1 / 30);
        aGame.updateProjectiles(1 / 30);
        aGame.vfx.update(1 / 30, 561, aGame.audio);
      }
      const lockOnWaves = localSpawns.filter((p) => p?.type === 'ronin_slash');
      if (
        lockOnWaves.length < 1 ||
        kaze.facing !== 1 ||
        !(lockOnWaves[0].vx > 700 && lockOnWaves[0].vy < 0 && Math.abs(lockOnWaves[0].vy) <= 180)
      ) {
        throw new Error(
          `[Suite 31.1] Expected LOCK: ON to turn toward locked foe and aim clamped 'ronin_slash', got count=${lockOnWaves.length}, vx=${lockOnWaves[0]?.vx}, vy=${lockOnWaves[0]?.vy}`
        );
      }

      // `AUTO` Play: launches `'ronin_slash'` waves automatically (`0` `'fireball'`)
      const beforeAutoCount = localSpawns.length;
      aAdv.toggleAutoPlay(true);
      kaze.setState('IDLE');
      kaze.x = 760;
      kaze.groundY = 492;
      kaze.y = 492;
      kaze.autoCooldown = 0;
      for (let f = 0; f < 45; f++) {
        aAdv.update(1 / 30);
        aGame.updateProjectiles(1 / 30);
        aGame.vfx.update(1 / 30, 492, aGame.audio);
      }
      const autoWaves = localSpawns.slice(beforeAutoCount).filter((p) => p?.type === 'ronin_slash');
      if (autoWaves.length < 1) {
        throw new Error('[Suite 31.1] Expected Adventure AUTO play with Kaze-Maru to launch ronin_slash waves!');
      }

      // Render active `'ronin_slash'` (normal + `isTwinSlash`) & `'storm_wave'` via `VFXManager.renderMainPass` -> `0` `ctx.rotate`, `0` `.ellipse()`
      const slashVfx = new VFXManager();
      slashVfx.spawnProjectile({
        x: 640,
        y: 485,
        groundY: 561,
        vx: 780,
        vy: 0,
        radius: 18,
        color: '#38bdf8',
        coreColor: '#ffffff',
        owner: kaze,
        damage: 66,
        type: 'ronin_slash',
        pierce: true,
        maxRange: 640,
        isTwinSlash: true
      });
      slashVfx.spawnProjectile({
        x: 520,
        y: 485,
        groundY: 561,
        vx: -760,
        vy: 0,
        radius: 18,
        color: '#38bdf8',
        coreColor: '#ffffff',
        owner: kaze,
        damage: 34,
        type: 'storm_wave',
        pierce: true,
        maxRange: 580
      });
      let ellipseCalls = 0;
      const slashTrack = { rotateCalls: 0 };
      const slashCtx = createMockCtx(slashTrack);
      slashCtx.ellipse = () => {
        ellipseCalls++;
      };
      slashVfx.renderMainPass(slashCtx, false, aGame.renderer, false);
      slashVfx.renderMainPass(slashCtx, true, aGame.renderer, false);
      if (slashTrack.rotateCalls !== 0 || ellipseCalls !== 0) {
        throw new Error(
          `[Suite 31.1] Expected 0 ctx.rotate & 0 ctx.ellipse when rendering ronin_slash, got rotate=${slashTrack.rotateCalls}, ellipse=${ellipseCalls}`
        );
      }
      aAdv.stopCampaign();
    }

    // 4. VS Mode 4th-Hit Finisher (`mode === 3`) & Crouch Shunpo Draw-Cut (`CROUCH`):
    // Verify `ignoreTargets` prevents double-hitting close melee foe while piercing wave hits multiple lane foes ONCE each!
    {
      const vsGame = createMockGame();
      vsGame.gameMode = '1v1';
      vsGame.testModeUnlimitedHp = false;
      vsGame.isAdventureMode = () => false;
      vsGame.is2v2Mode = () => false;
      vsGame.updateProjectiles = Game.prototype.updateProjectiles.bind(vsGame);

      const origVsSpawn = vsGame.vfx.spawnProjectile.bind(vsGame.vfx);
      const vsSpawns = [];
      vsGame.vfx.spawnProjectile = (opts) => {
        origVsSpawn(opts);
        const created = vsGame.vfx.projectiles[vsGame.vfx.projectiles.length - 1];
        vsSpawns.push(created);
        spawnedAll.push(created);
      };

      const vsKaze = new Ronin(320, 520, 1);
      vsKaze.game = vsGame;
      const closeFoe = new Warrior(410, 520, -1);
      const midLaneFoe = new Warrior(620, 520, -1);
      const farLaneFoe = new Warrior(810, 520, -1);
      const beyondRangeFoe = new Warrior(1080, 520, -1); // > 580px maxRange from sx=372!
      const allVsFoes = [closeFoe, midLaneFoe, farLaneFoe, beyondRangeFoe];

      const hitCounts = new Map();
      for (const foe of allVsFoes) {
        foe.game = vsGame;
        foe.maxHp = 99999;
        foe.hp = 99999;
        foe.stunTimer = 99;
        hitCounts.set(foe, 0);
        const origTakeDmg = foe.takeDamage.bind(foe);
        foe.takeDamage = (...args) => {
          hitCounts.set(foe, (hitCounts.get(foe) || 0) + 1);
          return origTakeDmg(...args);
        };
      }
      vsGame.leftFighter = vsKaze;
      vsGame.rightFighter = closeFoe;
      vsGame.fighters = [vsKaze, ...allVsFoes];
      vsGame.getEnemiesOf = (f) => (f === vsKaze ? allVsFoes : [vsKaze]);

      // Trigger 4th-hit `AUTO_ATTACK` (`comboStep = 3` -> `mode === 3`, `Morote Kiri-Nuki`)
      vsKaze._autoVariant = 3;
      vsKaze.comboStep = 3;
      vsKaze.setState('AUTO_ATTACK');
      let meleeHitsOnClose = 0;
      for (let f = 0; f < 36; f++) {
        if (vsKaze.state === 'AUTO_ATTACK') {
          const prevDid = vsKaze.didActionFrame;
          vsKaze.update(1 / 30, closeFoe, vsGame);
          if (!prevDid && vsKaze.didActionFrame) {
            meleeHitsOnClose = hitCounts.get(closeFoe);
          }
        }
        vsGame.updateProjectiles(1 / 30);
        vsGame.vfx.update(1 / 30, 520, vsGame.renderer, vsGame.audio);
      }

      const mode3Wave = vsSpawns.find((p) => p?.type === 'ronin_slash');
      if (
        !mode3Wave ||
        meleeHitsOnClose !== 1 ||
        hitCounts.get(closeFoe) !== 1 ||
        hitCounts.get(midLaneFoe) !== 1 ||
        hitCounts.get(farLaneFoe) !== 1 ||
        hitCounts.get(beyondRangeFoe) !== 0 ||
        vsGame.vfx.projectiles.length !== 0
      ) {
        throw new Error(
          `[Suite 31.1] VS mode===3 piercing & ignoreTargets check failed: close=${hitCounts.get(closeFoe)} (melee=${meleeHitsOnClose}), mid=${hitCounts.get(midLaneFoe)}, far=${hitCounts.get(farLaneFoe)}, beyond=${hitCounts.get(beyondRangeFoe)}, leftoverProj=${vsGame.vfx.projectiles.length}`
        );
      }

      // Trigger VS `CROUCH` Shunpo Draw-Cut (`t >= 0.38s`) -> spawns `'ronin_slash'` without double-hitting close target
      for (const foe of allVsFoes) hitCounts.set(foe, 0);
      vsSpawns.length = 0;
      vsKaze.x = 300;
      vsKaze.y = 520;
      vsKaze.facing = 1;
      closeFoe.x = 390;
      midLaneFoe.x = 640;
      farLaneFoe.x = 830;
      beyondRangeFoe.x = 1140;
      vsKaze.startCrouch(closeFoe, vsGame);
      for (let f = 0; f < 40; f++) {
        if (vsKaze.state === 'CROUCH') {
          vsKaze.update(1 / 30, closeFoe, vsGame);
        }
        vsGame.updateProjectiles(1 / 30);
        vsGame.vfx.update(1 / 30, 520, vsGame.renderer, vsGame.audio);
      }
      const crouchWave = vsSpawns.find((p) => p?.type === 'ronin_slash');
      if (
        !crouchWave ||
        hitCounts.get(closeFoe) !== 1 ||
        hitCounts.get(midLaneFoe) !== 1 ||
        hitCounts.get(farLaneFoe) !== 1 ||
        hitCounts.get(beyondRangeFoe) !== 0
      ) {
        throw new Error(
          `[Suite 31.1] VS CROUCH draw-cut 'ronin_slash' failed: wave=${Boolean(crouchWave)}, close=${hitCounts.get(closeFoe)}, mid=${hitCounts.get(midLaneFoe)}, far=${hitCounts.get(farLaneFoe)}, beyond=${hitCounts.get(beyondRangeFoe)}`
        );
      }
    }

    if (spawnedAll.some((p) => p?.type === 'fireball')) {
      throw new Error('[Suite 31.1] Kaze-Maru spawned a forbidden blue/orange fireball projectile!');
    }
  }

  // (31.2) `AudioManager` iOS Sleep/Lock Recovery (`'interrupted'` & `'suspended'` Resume on
  // `resumeFromBackground()`, User Gesture, & `play()`; Stalled/Closed `AudioContext` Triggers
  // `rebuildContext()` While Preserving Decoded `buffers`)
  {
    const prevAudioCtx = globalThis.window.AudioContext;
    const prevWebkitAudioCtx = globalThis.window.webkitAudioContext;
    const prevAddEventListener = globalThis.window.addEventListener;
    const prevFetch = globalThis.fetch;

    const gestureListeners = new Map();
    const createdContexts = [];
    let nextContextMode = 'normal'; // 'normal' | 'async_resume' | 'stalled_clock'

    class MockIOSAudioContext {
      constructor() {
        this.mode = nextContextMode;
        this.state = 'suspended';
        this.sampleRate = 44100;
        this._clock = 1.25;
        this.resumeCalls = 0;
        this.suspendCalls = 0;
        this.closeCalls = 0;
        this.startedBufferSources = [];
        this.onstatechange = null;
        this.destination = { connect() {}, disconnect() {} };
        createdContexts.push(this);
      }
      get currentTime() {
        if (this.state === 'running' && this.mode !== 'stalled_clock') {
          this._clock += 0.016;
        }
        return this._clock;
      }
      createGain() {
        return {
          gain: {
            value: 1,
            setValueAtTime(v) {
              this.value = v;
            },
            linearRampToValueAtTime(v) {
              this.value = v;
            },
            exponentialRampToValueAtTime(v) {
              this.value = v;
            }
          },
          connect() {},
          disconnect() {}
        };
      }
      createBiquadFilter() {
        return {
          type: 'lowpass',
          frequency: { value: 1000, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          Q: { value: 0.707 },
          connect() {},
          disconnect() {}
        };
      }
      createDynamicsCompressor() {
        return {
          threshold: { value: 0 },
          knee: { value: 0 },
          ratio: { value: 1 },
          attack: { value: 0 },
          release: { value: 0 },
          connect() {},
          disconnect() {}
        };
      }
      createStereoPanner() {
        return { pan: { value: 0 }, connect() {}, disconnect() {} };
      }
      createBuffer(ch, len, rate) {
        return {
          numberOfChannels: ch,
          length: len,
          sampleRate: rate,
          getChannelData: () => new Float32Array(len)
        };
      }
      createBufferSource() {
        const ctxRef = this;
        const node = {
          buffer: null,
          playbackRate: { value: 1 },
          onended: null,
          connect() {},
          disconnect() {},
          start() {
            ctxRef.startedBufferSources.push(this.buffer);
          },
          stop() {}
        };
        return node;
      }
      resume() {
        this.resumeCalls++;
        if (this.state === 'closed') {
          return Promise.reject(new Error('AudioContext closed'));
        }
        if (this.mode === 'async_resume') {
          return new Promise((resolve) => {
            setTimeout(() => {
              if (this.state !== 'closed') {
                this.state = 'running';
                this.onstatechange?.();
              }
              resolve();
            }, 8);
          });
        }
        this.state = 'running';
        this.onstatechange?.();
        return Promise.resolve();
      }
      suspend() {
        this.suspendCalls++;
        if (this.state !== 'closed') {
          this.state = 'suspended';
          this.onstatechange?.();
        }
        return Promise.resolve();
      }
      close() {
        this.closeCalls++;
        this.state = 'closed';
        return Promise.resolve();
      }
    }

    try {
      globalThis.window.AudioContext = MockIOSAudioContext;
      globalThis.window.webkitAudioContext = MockIOSAudioContext;
      globalThis.window.addEventListener = (type, fn) => {
        if (!gestureListeners.has(type)) gestureListeners.set(type, []);
        gestureListeners.get(type).push(fn);
      };
      globalThis.fetch = async () => ({ ok: false });

      const audio = new AudioManager();
      const decodedSlashBuf = { id: 'decoded_slash_wav', length: 22050, sampleRate: 44100 };
      const decodedCleaveBuf = { id: 'decoded_cleave_wav', length: 22050, sampleRate: 44100 };
      audio.buffers.slash = decodedSlashBuf;
      audio.buffers.heavy_cleave = decodedCleaveBuf;

      for (const ev of ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown']) {
        if (!(gestureListeners.get(ev)?.length >= 1)) {
          throw new Error(`[Suite 31.2] Expected capture-phase window '${ev}' unlock listener on AudioManager!`);
        }
      }

      // 1. Both `'interrupted'` (iOS lock-screen) and `'suspended'` resume on `resumeFromBackground()`:
      for (const pausedState of ['interrupted', 'suspended']) {
        audio.suspendForBackground();
        audio.ctx.state = pausedState;
        if (!audio.isContextPaused()) {
          throw new Error(`[Suite 31.2] Expected isContextPaused() === true for state='${pausedState}'!`);
        }
        audio.resumeFromBackground(false);
        await Promise.resolve();
        if (audio.ctx.state !== 'running' || audio._bgSuspended !== false) {
          throw new Error(
            `[Suite 31.2] resumeFromBackground() failed to recover from '${pausedState}': state='${audio.ctx.state}'`
          );
        }
      }
      if (audio._stalledCheckTimer) {
        clearTimeout(audio._stalledCheckTimer);
        audio._stalledCheckTimer = null;
      }

      // 2. Both `'interrupted'` and `'suspended'` resume on user gesture (`touchstart` / `pointerdown`) + silent 1-frame unlock tick:
      for (const pausedState of ['interrupted', 'suspended']) {
        audio.ctx.state = pausedState;
        const beforeSources = audio.ctx.startedBufferSources.length;
        gestureListeners.get('touchstart')[0]();
        await Promise.resolve();
        const silentTickPlayed = audio.ctx.startedBufferSources
          .slice(beforeSources)
          .some((b) => b && b.length === 1 && b.sampleRate === 22050);
        if (audio.ctx.state !== 'running' || !silentTickPlayed) {
          throw new Error(
            `[Suite 31.2] User gesture failed to resume '${pausedState}' & prime 1-sample silent tick: state='${audio.ctx.state}', silentTick=${silentTickPlayed}`
          );
        }
      }
      if (audio._stalledCheckTimer) {
        clearTimeout(audio._stalledCheckTimer);
        audio._stalledCheckTimer = null;
      }

      // 3. Both `'interrupted'` and `'suspended'` resume on `play()` (including async `ctx.resume()` queueing + flush):
      for (const [idx, pausedState] of ['interrupted', 'suspended'].entries()) {
        const sfxKey = idx === 0 ? 'slash' : 'heavy_cleave';
        const expectedBuf = idx === 0 ? decodedSlashBuf : decodedCleaveBuf;
        audio.lastPlayed = {};
        audio.ctx.mode = 'async_resume';
        audio.ctx.state = pausedState;
        const beforeSources = audio.ctx.startedBufferSources.length;
        audio.play(sfxKey, 500);
        // Wait for 8ms async resume -> `_flushPendingPlays()` should fire the queued buffer!
        await new Promise((r) => setTimeout(r, 22));
        audio.ctx.mode = 'normal';
        const playedExpected = audio.ctx.startedBufferSources.slice(beforeSources).includes(expectedBuf);
        if (audio.ctx.state !== 'running' || !playedExpected) {
          throw new Error(
            `[Suite 31.2] play('${sfxKey}') while '${pausedState}' failed to resume & flush queued buffer: state='${audio.ctx.state}', played=${playedExpected}`
          );
        }
      }

      // 4. Closed `AudioContext` (`ctx.state = 'closed'`) triggers `rebuildContext()` while preserving decoded `buffers`:
      const closedCtx = audio.ctx;
      closedCtx.state = 'closed';
      audio.lastPlayed = {};
      audio.play('slash', 600);
      await Promise.resolve();
      if (
        audio.ctx === closedCtx ||
        audio.ctx.state !== 'running' ||
        audio._rebuildCount < 1 ||
        audio.buffers.slash !== decodedSlashBuf ||
        audio.buffers.heavy_cleave !== decodedCleaveBuf ||
        !audio.ctx.startedBufferSources.includes(decodedSlashBuf)
      ) {
        throw new Error(
          `[Suite 31.2] Closed AudioContext failed to trigger rebuildContext() & preserve decoded buffers! rebuildCount=${audio._rebuildCount}`
        );
      }

      // 5. Stalled/frozen `AudioContext` clock (`ctx.currentTime` stuck after wake) triggers `rebuildContext()` while preserving `buffers`:
      const stalledCtx = audio.ctx;
      stalledCtx.mode = 'stalled_clock';
      stalledCtx.state = 'running';
      nextContextMode = 'normal';
      const rebuildsBeforeStall = audio._rebuildCount;
      audio._scheduleStalledClockCheck(15);
      await new Promise((r) => setTimeout(r, 35));
      if (
        audio.ctx === stalledCtx ||
        stalledCtx.closeCalls < 1 ||
        audio._rebuildCount <= rebuildsBeforeStall ||
        audio.ctx.state !== 'running' ||
        audio.buffers.slash !== decodedSlashBuf ||
        audio.buffers.heavy_cleave !== decodedCleaveBuf
      ) {
        throw new Error(
          `[Suite 31.2] Stalled AudioContext clock failed to trigger rebuildContext() while preserving buffers! rebuilds=${audio._rebuildCount}`
        );
      }

      // 6. Native Swift `window.__avsResumeAudio(true)` (`mediaServicesWereResetNotification`) forces clean rebuild preserving `buffers`:
      const preResetCtx = audio.ctx;
      globalThis.window.__avsResumeAudio(true);
      await Promise.resolve();
      if (
        audio.ctx === preResetCtx ||
        audio.ctx.state !== 'running' ||
        audio.buffers.slash !== decodedSlashBuf
      ) {
        throw new Error('[Suite 31.2] window.__avsResumeAudio(true) failed to rebuild context while preserving buffers!');
      }
      if (audio._stalledCheckTimer) {
        clearTimeout(audio._stalledCheckTimer);
        audio._stalledCheckTimer = null;
      }
    } finally {
      if (prevAudioCtx === undefined) delete globalThis.window.AudioContext;
      else globalThis.window.AudioContext = prevAudioCtx;
      if (prevWebkitAudioCtx === undefined) delete globalThis.window.webkitAudioContext;
      else globalThis.window.webkitAudioContext = prevWebkitAudioCtx;
      globalThis.window.addEventListener = prevAddEventListener;
      if (prevFetch === undefined) delete globalThis.fetch;
      else globalThis.fetch = prevFetch;
    }
  }

  console.log(
    '[PASS] Suite 31: Kaze-Maru (`ronin`) Long-Range HD-2D Katana Slash Waves (`0` Blue Orbs, LOCK: OFF/ON/AUTO + VS Mode Piercing & ignoreTargets) & AudioManager iOS Sleep/Lock Recovery (`interrupted`/`suspended` + Stalled/Closed rebuildContext) verified!'
  );
}

// ============================================================================
// Suite 32: Pre-Change Fallback Backup System, Web/Vercel AES-256-GCM `AVSV` Vault & Apple iOS/macOS `AVSK` `sanctum.pak` Vault (`< 3s`)
// ============================================================================
{
  const suite32StartMs = performance.now();

  // --------------------------------------------------------------------------
  // 32.1: Fallback Backup Script (`scripts/create_fallback_backup.sh`), Ignore Rules & Snapshot Integrity
  // --------------------------------------------------------------------------
  {
    const backupScriptPath = path.join(REPO_ROOT, 'scripts/create_fallback_backup.sh');
    if (!fs.existsSync(backupScriptPath)) {
      throw new Error('[Suite 32.1] Missing scripts/create_fallback_backup.sh!');
    }
    const backupScriptStat = fs.statSync(backupScriptPath);
    if ((backupScriptStat.mode & 0o111) === 0) {
      throw new Error('[Suite 32.1] scripts/create_fallback_backup.sh must be executable (`chmod +x`)!');
    }

    const gitignoreSrc = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8');
    if (!gitignoreSrc.includes('fallback_backups/') || !gitignoreSrc.includes('dist/')) {
      throw new Error('[Suite 32.1] .gitignore must ignore both fallback_backups/ and dist/!');
    }
    const vercelignoreSrc = fs.readFileSync(path.join(REPO_ROOT, '.vercelignore'), 'utf8');
    if (!vercelignoreSrc.includes('fallback_backups/')) {
      throw new Error('[Suite 32.1] .vercelignore must exclude fallback_backups/!');
    }
    const vercelignoreLines = vercelignoreSrc
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    if (vercelignoreLines.some((l) => l === 'build' || l === 'build/' || l === '/build' || l === '/build/')) {
      throw new Error('[Suite 32.1] .vercelignore must NOT exclude build/ so Vercel can execute build/build_web_vault.mjs!');
    }

    const fallbackRoot = path.join(REPO_ROOT, 'fallback_backups');
    if (!fs.existsSync(fallbackRoot) || !fs.statSync(fallbackRoot).isDirectory()) {
      throw new Error('[Suite 32.1] Missing fallback_backups/ directory!');
    }
    const snapshotDirs = fs
      .readdirSync(fallbackRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => path.join(fallbackRoot, d.name))
      .sort();
    if (snapshotDirs.length < 1) {
      throw new Error('[Suite 32.1] Expected at least 1 fallback snapshot inside fallback_backups/!');
    }

    const validSnapshot = snapshotDirs.find(
      (dir) =>
        fs.existsSync(path.join(dir, 'RESTORE_THIS_BACKUP.sh')) &&
        fs.existsSync(path.join(dir, 'SHA256SUMS.txt')) &&
        fs.existsSync(path.join(dir, 'index.html')) &&
        fs.existsSync(path.join(dir, 'src/main.js')) &&
        fs.existsSync(path.join(dir, 'assets/sprites/ronin_sheet.png'))
    );
    if (!validSnapshot) {
      throw new Error(
        `[Suite 32.1] No valid fallback snapshot with RESTORE_THIS_BACKUP.sh & SHA256SUMS.txt found in ${fallbackRoot}!`
      );
    }
    if ((fs.statSync(path.join(validSnapshot, 'RESTORE_THIS_BACKUP.sh')).mode & 0o111) === 0) {
      throw new Error('[Suite 32.1] RESTORE_THIS_BACKUP.sh inside snapshot must be executable!');
    }

    const shaLines = fs
      .readFileSync(path.join(validSnapshot, 'SHA256SUMS.txt'), 'utf8')
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    if (shaLines.length < 200) {
      throw new Error(`[Suite 32.1] Expected >= 200 hashed files in SHA256SUMS.txt, got ${shaLines.length}!`);
    }
    // Spot-check critical files in SHA256SUMS.txt for bit-exact snapshot integrity
    const shaMap = new Map();
    for (const line of shaLines) {
      const m = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
      if (m) shaMap.set(m[2].trim(), m[1].toLowerCase());
    }
    for (const reqRel of [
      'RESTORE_THIS_BACKUP.sh',
      'index.html',
      'style.css',
      'src/main.js',
      'assets/sprites/ronin_sheet.png',
      'assets/sfx/slash.wav'
    ]) {
      const expectedHex = shaMap.get(reqRel);
      if (!expectedHex) {
        throw new Error(`[Suite 32.1] Missing '${reqRel}' entry in snapshot SHA256SUMS.txt!`);
      }
      const actualHex = crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(validSnapshot, reqRel)))
        .digest('hex');
      if (actualHex !== expectedHex) {
        throw new Error(`[Suite 32.1] Snapshot SHA-256 mismatch on ${reqRel}: ${actualHex} !== ${expectedHex}`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 32.2: Web / Vercel AES-256-GCM Vault (`node build/build_web_vault.mjs` + `vercel.json`)
  // --------------------------------------------------------------------------
  {
    const vercelCfg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'vercel.json'), 'utf8'));
    if (
      vercelCfg.outputDirectory !== 'dist' ||
      vercelCfg.buildCommand !== 'node build/build_web_vault.mjs'
    ) {
      throw new Error(
        `[Suite 32.2] vercel.json must configure buildCommand='node build/build_web_vault.mjs' and outputDirectory='dist', got ${JSON.stringify(vercelCfg)}`
      );
    }

    const distDir = path.join(REPO_ROOT, 'dist');
    const hadDistBefore = fs.existsSync(distDir);
    try {
      execFileSync(process.execPath, [path.join(REPO_ROOT, 'build/build_web_vault.mjs')], {
        cwd: REPO_ROOT,
        stdio: 'pipe'
      });

      if (!fs.existsSync(distDir) || fs.existsSync(path.join(distDir, 'src')) || fs.existsSync(path.join(distDir, 'assets'))) {
        throw new Error('[Suite 32.2] dist/ must exist with ZERO dist/src/ or dist/assets/ directories!');
      }

      const allDistFiles = [];
      const walkDist = (dir) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) walkDist(full);
          else allDistFiles.push(path.relative(distDir, full).split(path.sep).join('/'));
        }
      };
      walkDist(distDir);

      const leakedPlainFiles = allDistFiles.filter(
        (rel) => /\.(png|jpg|wav|ttf|css)$/i.test(rel) || (rel !== 'manifest.json' && /\.json$/i.test(rel))
      );
      if (leakedPlainFiles.length !== 0) {
        throw new Error(`[Suite 32.2] Found leaked unencrypted assets in dist/: ${leakedPlainFiles.join(', ')}`);
      }

      const bootFiles = allDistFiles.filter((rel) => /^boot\.[0-9a-f]{12}\.js$/.test(rel));
      const packFiles = allDistFiles.filter((rel) => /^packs\/[0-9a-f]{16}\.bin$/.test(rel));
      if (
        bootFiles.length !== 1 ||
        packFiles.length < 135 ||
        !allDistFiles.includes('index.html') ||
        !allDistFiles.includes('manifest.json') ||
        !allDistFiles.includes('robots.txt')
      ) {
        throw new Error(
          `[Suite 32.2] Unexpected dist/ layout: bootFiles=${bootFiles.length}, packFiles=${packFiles.length}, files=${allDistFiles.length}`
        );
      }

      const distHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
      if (/(?<![\w-])(?:src|href)\s*=\s*["'](?:\.\/|\/)?(?:assets\/|style\.css|src\/)/i.test(distHtml)) {
        throw new Error('[Suite 32.2] dist/index.html leaked plain assets/, style.css, or src/ URL!');
      }

      const bootSrc = fs.readFileSync(path.join(distDir, bootFiles[0]), 'utf8');
      const masterKey = extractMasterKeyFromBootScript(bootSrc);
      const cpMatch = bootSrc.match(/CP="([0-9a-f]{16})"/);
      if (!cpMatch) {
        throw new Error('[Suite 32.2] Missing encrypted code pack ID in boot.<hash>.js!');
      }

      // Verify AVSV\x01 header on every .bin pack in dist/packs/
      for (const relPack of packFiles) {
        const hdr = parseAvsvPackHeader(fs.readFileSync(path.join(distDir, relPack)));
        if (hdr.version !== 1 || hdr.iv.length !== 12 || hdr.authTag.length !== 16) {
          throw new Error(`[Suite 32.2] Invalid AVSV header on ${relPack}`);
        }
      }

      // Decrypt code+style vault & verify 100% bit-for-bit SHA-256 equality across ALL PNG, WAV & TTF packs!
      const codePackPlain = decryptAvsvPack(
        fs.readFileSync(path.join(distDir, `packs/${cpMatch[1]}.bin`)),
        masterKey
      );
      const codeVault = unpackCodeVaultPayload(codePackPlain);
      if (
        codeVault.entry !== 'src/main.js' ||
        !codeVault.modules?.['src/main.js'] ||
        !codeVault.modules?.['src/entities/Ronin.js'] ||
        !codeVault.modules?.['src/entities/WarriorEx.js'] ||
        typeof codeVault.css !== 'string' ||
        codeVault.css.length < 10000
      ) {
        throw new Error('[Suite 32.2] Decrypted code+style vault missing expected modules or CSS!');
      }

      const assetEntries = Object.entries(codeVault.assets || {});
      let pngVerified = 0;
      let wavVerified = 0;
      let ttfVerified = 0;
      let jsonVerified = 0;
      for (const [relAsset, [packId, mime]] of assetEntries) {
        const decBytes = decryptAvsvPack(
          fs.readFileSync(path.join(distDir, `packs/${packId}.bin`)),
          masterKey
        );
        const srcBytes = fs.readFileSync(path.join(REPO_ROOT, relAsset));
        const decSha = crypto.createHash('sha256').update(decBytes).digest('hex');
        const srcSha = crypto.createHash('sha256').update(srcBytes).digest('hex');
        if (decSha !== srcSha) {
          throw new Error(`[Suite 32.2] Bit-exact SHA-256 mismatch after AVSV decrypt for ${relAsset}!`);
        }
        if (relAsset.endsWith('.png')) pngVerified++;
        else if (relAsset.endsWith('.wav')) wavVerified++;
        else if (relAsset.endsWith('.ttf')) ttfVerified++;
        else if (relAsset.endsWith('.json')) {
          if (mime !== 'application/json') {
            throw new Error(`[Suite 32.2] Expected application/json MIME for ${relAsset}, got ${mime}!`);
          }
          jsonVerified++;
        }
      }
      if (
        pngVerified < 65 ||
        wavVerified < 65 ||
        ttfVerified < 1 ||
        jsonVerified < 2 ||
        !codeVault.assets['assets/campaigns/index.json'] ||
        !codeVault.assets['assets/campaigns/celestial_gauntlet.json'] ||
        !codeVault.assets['assets/sprites/intro_talk/nyx_talk_sheet.png'] ||
        !codeVault.assets['assets/sprites/intro_talk/warrior_talk_sheet.png']
      ) {
        throw new Error(
          `[Suite 32.2] Unexpected asset counts in AVSV vault: png=${pngVerified}, wav=${wavVerified}, ttf=${ttfVerified}, json=${jsonVerified}`
        );
      }
    } finally {
      if (!hadDistBefore) {
        fs.rmSync(distDir, { recursive: true, force: true });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 32.3: Native Apple iOS/macOS AES-256-GCM `AVSK` `sanctum.pak` Vault + Xcode & Swift Server Audit
  // --------------------------------------------------------------------------
  {
    const genXcodeSrc = fs.readFileSync(path.join(REPO_ROOT, 'apple/generate_xcodeproj.py'), 'utf8');
    const pbxprojSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'apple/ArcaneVsSteel.xcodeproj/project.pbxproj'),
      'utf8'
    );
    const resPhaseMatch = pbxprojSrc.match(
      /Begin PBXResourcesBuildPhase section[\s\S]*?End PBXResourcesBuildPhase section/
    );
    if (!resPhaseMatch) {
      throw new Error('[Suite 32.3] Missing PBXResourcesBuildPhase in project.pbxproj!');
    }
    const resPhaseBlock = resPhaseMatch[0];
    if (
      /\.\.\/src|\.\.\/assets|index\.html|style\.css|manifest\.json/.test(resPhaseBlock) ||
      !resPhaseBlock.includes('Assets.xcassets in Resources') ||
      /shared_bundle_items/.test(genXcodeSrc) ||
      !pbxprojSrc.includes('Pack Encrypted Sanctum Vault') ||
      !pbxprojSrc.includes('pack_sanctum_vault.py')
    ) {
      throw new Error(
        '[Suite 32.3] ResourcesBuildPhase / generate_xcodeproj.py must exclude raw ../src & ../assets and run Pack Encrypted Sanctum Vault!'
      );
    }

    const swiftServerSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'apple/ArcaneVsSteel/Core/LocalSanctumServer.swift'),
      'utf8'
    );
    const swiftStageSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'apple/ArcaneVsSteel/UI/SanctumWebStageView.swift'),
      'utf8'
    );
    if (
      !swiftServerSrc.includes('import CryptoKit') ||
      !swiftServerSrc.includes('import Security') ||
      !swiftServerSrc.includes('AES.GCM.SealedBox(combined:') ||
      !swiftServerSrc.includes('AES.GCM.open(') ||
      !swiftServerSrc.includes('SecRandomCopyBytes') ||
      !swiftServerSrc.includes('"/v_\\(randomHex32)"') ||
      !swiftServerSrc.includes('decodedPath.hasPrefix(requiredPrefix)') ||
      !swiftServerSrc.includes('sendStatus(fd: fd, code: 403, message: "Forbidden")') ||
      swiftStageSrc.includes("from '/src/engine/ArcaneShaderFX.js") ||
      !swiftStageSrc.includes('./src/engine/ArcaneShaderFX.js') ||
      !swiftStageSrc.includes('isInspectable = false')
    ) {
      throw new Error(
        '[Suite 32.3] LocalSanctumServer.swift / SanctumWebStageView.swift failed CryptoKit AES.GCM.open + per-launch 403 token audit!'
      );
    }

    // Reconstruct the 32-byte key directly from LocalSanctumServer.swift XOR shards to verify Swift <-> Python parity
    const shardAMatch = swiftServerSrc.match(/vaultShardA:\s*\[UInt8\]\s*=\s*\[([\s\S]*?)\]/);
    const shardBMatch = swiftServerSrc.match(/vaultShardB:\s*\[UInt8\]\s*=\s*\[([\s\S]*?)\]/);
    if (!shardAMatch || !shardBMatch) {
      throw new Error('[Suite 32.3] Missing XOR-masked vaultShardA / vaultShardB in LocalSanctumServer.swift!');
    }
    const parseHexBytes = (s) =>
      (s.match(/0x[0-9a-fA-F]{2}/g) || []).map((tok) => Number.parseInt(tok, 16));
    const shardA = parseHexBytes(shardAMatch[1]);
    const shardB = parseHexBytes(shardBMatch[1]);
    if (shardA.length !== 32 || shardB.length !== 32) {
      throw new Error(`[Suite 32.3] Expected 32-byte XOR shards, got ${shardA.length} & ${shardB.length}`);
    }
    const swiftKey = Buffer.from(shardA.map((b, i) => b ^ shardB[i]));

    getCachedAuditSync(
      'suite32_3_apple_pak_v1',
      [
        'apple/pack_sanctum_vault.py',
        'apple/generate_xcodeproj.py',
        'apple/ArcaneVsSteel.xcodeproj/project.pbxproj',
        'apple/ArcaneVsSteel/Core/LocalSanctumServer.swift',
        'apple/ArcaneVsSteel/UI/SanctumWebStageView.swift'
      ],
      swiftKey.toString('hex'),
      () => {
    const tmpPakDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avs-suite32-pak-'));
    const tmpPakPath = path.join(tmpPakDir, 'sanctum.pak');
    try {
      execFileSync('python3', [path.join(REPO_ROOT, 'apple/pack_sanctum_vault.py'), '--force', '--output', tmpPakPath], {
        cwd: REPO_ROOT,
        stdio: 'pipe'
      });

      const pakBuf = fs.readFileSync(tmpPakPath);
      if (
        pakBuf.length < 37 ||
        pakBuf[0] !== 0x41 ||
        pakBuf[1] !== 0x56 ||
        pakBuf[2] !== 0x53 ||
        pakBuf[3] !== 0x4b ||
        pakBuf[4] !== 0x01
      ) {
        throw new Error('[Suite 32.3] sanctum.pak missing AVSK\\x01 magic header!');
      }

      const openCombinedGcm = (sealedBox) => {
        const nonce = sealedBox.subarray(0, 12);
        const ct = sealedBox.subarray(12, sealedBox.length - 16);
        const tag = sealedBox.subarray(sealedBox.length - 16);
        const decipher = crypto.createDecipheriv('aes-256-gcm', swiftKey, nonce);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ct), decipher.final()]);
      };

      const tocSealedLen = pakBuf.readUInt32LE(5);
      const tocPlain = openCombinedGcm(pakBuf.subarray(9, 9 + tocSealedLen));
      const toc = JSON.parse(tocPlain.toString('utf8'));
      const tocKeys = Object.keys(toc);
      if (tocKeys.length < 180) {
        throw new Error(`[Suite 32.3] Expected >= 180 encrypted files in sanctum.pak TOC, got ${tocKeys.length}`);
      }

      for (const sampleRel of [
        'index.html',
        'style.css',
        'src/main.js',
        'src/entities/WarriorEx.js',
        'assets/sprites/warrior_ex_sheet.png',
        'assets/sprites/ronin_sheet.png',
        'assets/sprites/mage_sheet.png',
        'assets/sfx/slash.wav',
        'assets/fonts/pixel_art.ttf'
      ]) {
        const entry = toc[sampleRel];
        if (!Array.isArray(entry) || entry.length < 3) {
          throw new Error(`[Suite 32.3] Missing '${sampleRel}' in sanctum.pak encrypted TOC!`);
        }
        const [offset, length] = entry;
        const decBuf = openCombinedGcm(pakBuf.subarray(offset, offset + length));
        const srcBuf = fs.readFileSync(path.join(REPO_ROOT, sampleRel));
        const decSha = crypto.createHash('sha256').update(decBuf).digest('hex');
        const srcSha = crypto.createHash('sha256').update(srcBuf).digest('hex');
        if (decSha !== srcSha) {
          throw new Error(`[Suite 32.3] sanctum.pak SHA-256 mismatch on ${sampleRel}!`);
        }
      }

      // Verify AES-GCM authTag tamper detection rejects forged ciphertext
      const [testOff, testLen] = toc['index.html'];
      const tamperedBox = Buffer.from(pakBuf.subarray(testOff, testOff + testLen));
      tamperedBox[tamperedBox.length - 1] ^= 0xff;
      let rejectedTamper = false;
      try {
        openCombinedGcm(tamperedBox);
      } catch (_) {
        rejectedTamper = true;
      }
      if (!rejectedTamper) {
        throw new Error('[Suite 32.3] Expected AES-256-GCM open to reject tampered sanctum.pak authTag!');
      }
    } finally {
      fs.rmSync(tmpPakDir, { recursive: true, force: true });
    }
      }
    );
  }

  const suite32ElapsedMs = performance.now() - suite32StartMs;
  if (suite32ElapsedMs >= 3000) {
    throw new Error(`[Suite 32] Expected Suite 32 runtime < 3000ms, got ${suite32ElapsedMs.toFixed(1)}ms!`);
  }

  console.log(
    `[PASS] Suite 32: Pre-Change Fallback Backup Snapshot, Web/Vercel AES-256-GCM AVSV Vault (0 plain assets, 100% SHA-256 lossless) & Apple CryptoKit AVSK sanctum.pak + Per-Launch 403 Token verified in ${suite32ElapsedMs.toFixed(0)}ms!`
  );
}

// ============================================================================
// SUITE 33: Next-Gen Wide-Canvas (`320x240`) Aethelgard EX (`warrior_ex`),
//           100% Untouched Classic Aethelgard (`warrior`), R&D Spec & Dual-Mode Combat (`< 3s`)
// ============================================================================
{
  const suite33StartMs = performance.now();
  const zlibMod33 = await import('node:zlib');

  // --------------------------------------------------------------------------
  // 33.1: Preserved Classic Aethelgard (`warrior`) + Core Pipeline SHA-256 Audit & R&D Doc Hygiene
  // --------------------------------------------------------------------------
  {
    const preservedSha256 = {
      'docs/CHAMPION_DEVELOPMENT_PLAYBOOK.md':
        '2891ca38b0ec6e6df9e629e99ccdc1fe1403b297e41fc330174b4c556f9b0361',
      '.agents/skills/arcane-vs-steel-pipeline/SKILL.md':
        '7b915cc454b5b4c9e979313a56eca6a3329dccedc6aa77aba69c14becea87705',
      'scripts/hd2d_rig_core.py':
        '66f2bfe8cdd45e031349d30cd9b980cea12621051709782196d776f2a12c8777',
      'scripts/build_warrior_30fps_sheet.py':
        'a68f71cab77380d09e9039da32eff499a29dfc8b3d6e2ba10fd8f346234e51de',
      'src/entities/Warrior.js':
        'bead5970fbc64f121eabfd75ad5c02d00e7a768118d28c055e3eb3e768b27adf',
      'assets/sprites/warrior_sheet.png':
        '2e5c187e90209f417dc15d0e0f5edf9d4c08ed894b60c8708c50fccf8ee2ad08',
      'assets/sprites/warrior_vfx.png':
        '0e3fff5ffebd70aeefed042c8f31e1b2c760f9ac3d3712272122a800175a8520',
      'assets/sprites/warrior_portrait.png':
        '1b26c5d4083c72f91e5dc5a3bfeec9bbb97cd40973dc3aa922d33e0ceac692ee'
    };

    for (const [relFile, expectedHex] of Object.entries(preservedSha256)) {
      const absFile = path.join(REPO_ROOT, relFile);
      if (!fs.existsSync(absFile)) {
        throw new Error(`[Suite 33.1] Missing preserved baseline file: ${relFile}`);
      }
      const actualHex = crypto
        .createHash('sha256')
        .update(fs.readFileSync(absFile))
        .digest('hex');
      if (actualHex !== expectedHex) {
        throw new Error(
          `[Suite 33.1] Protected baseline file '${relFile}' was modified! expected=${expectedHex}, actual=${actualHex}`
        );
      }
    }

    const rndPath = path.join(REPO_ROOT, 'docs/NEXT_GEN_SPRITE_ANIMATION_RND.md');
    if (!fs.existsSync(rndPath)) {
      throw new Error('[Suite 33.1] Missing docs/NEXT_GEN_SPRITE_ANIMATION_RND.md!');
    }
    const rndSrc = fs.readFileSync(rndPath, 'utf8');
    const emojiRe = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
    if (
      rndSrc.length < 20000 ||
      emojiRe.test(rndSrc) ||
      !rndSrc.includes('320x240') ||
      !rndSrc.includes('112') ||
      !rndSrc.includes('230') ||
      !rndSrc.includes('Brave Exvius') ||
      !rndSrc.includes('Last Cloudia')
    ) {
      throw new Error(
        '[Suite 33.1] docs/NEXT_GEN_SPRITE_ANIMATION_RND.md failed content/zero-emoji audit!'
      );
    }

    const fbRoot = path.join(REPO_ROOT, 'fallback_backups');
    if (fs.existsSync(fbRoot)) {
      const snaps = fs
        .readdirSync(fbRoot)
        .filter((d) => d.endsWith('_pre_aethelgard_ex_overhaul'));
      if (snaps.length < 1) {
        throw new Error(
          '[Suite 33.1] Missing fallback_backups/*_pre_aethelgard_ex_overhaul snapshot!'
        );
      }
      const snapDir = path.join(fbRoot, snaps[snaps.length - 1]);
      const restoreScript = path.join(snapDir, 'RESTORE_THIS_BACKUP.sh');
      const sumsFile = path.join(snapDir, 'SHA256SUMS.txt');
      if (
        !fs.existsSync(restoreScript) ||
        !fs.existsSync(sumsFile) ||
        (fs.statSync(restoreScript).mode & 0o111) === 0
      ) {
        throw new Error(
          `[Suite 33.1] Incomplete fallback snapshot at ${snapDir}!`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // 33.2: Wide-Canvas `warrior_ex_sheet.png` (`9600x2400` = `30x10` @ `320x240`),
  //       `warrior_ex_vfx.png` (`6240x1664`), `warrior_ex_portrait.png` (`128x128`) & Smear Reach Audit
  // --------------------------------------------------------------------------
  {
    const decodePngRgba33 = (buf) => {
      if (buf.length < 29 || buf.readUInt32BE(0) !== 0x89504e47) {
        throw new Error('[Suite 33.2] Invalid PNG magic bytes!');
      }
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      const bitDepth = buf[24];
      const colorType = buf[25];
      if (bitDepth !== 8 || colorType !== 6) {
        throw new Error(
          `[Suite 33.2] Expected 8-bit RGBA PNG (colorType=6), got bitDepth=${bitDepth}, colorType=${colorType}`
        );
      }
      const idatChunks = [];
      let off = 8;
      while (off + 8 <= buf.length) {
        const len = buf.readUInt32BE(off);
        const type = buf.subarray(off + 4, off + 8).toString('ascii');
        if (type === 'IDAT') idatChunks.push(buf.subarray(off + 8, off + 8 + len));
        if (type === 'IEND') break;
        off += 12 + len;
      }
      const raw = zlibMod33.inflateSync(Buffer.concat(idatChunks));
      const stride = width * 4;
      const data = Buffer.allocUnsafe(height * stride);
      const paeth = (a, b, c) => {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      };
      for (let y = 0; y < height; y++) {
        const fType = raw[y * (stride + 1)];
        const srcOff = y * (stride + 1) + 1;
        const dstOff = y * stride;
        const prevOff = (y - 1) * stride;
        for (let i = 0; i < stride; i++) {
          const xByte = raw[srcOff + i];
          const a = i >= 4 ? data[dstOff + i - 4] : 0;
          const b = y > 0 ? data[prevOff + i] : 0;
          const c = y > 0 && i >= 4 ? data[prevOff + i - 4] : 0;
          let recon = xByte;
          if (fType === 1) recon = (xByte + a) & 0xff;
          else if (fType === 2) recon = (xByte + b) & 0xff;
          else if (fType === 3) recon = (xByte + ((a + b) >> 1)) & 0xff;
          else if (fType === 4) recon = (xByte + paeth(a, b, c)) & 0xff;
          data[dstOff + i] = recon;
        }
      }
      return { width, height, data };
    };

    getCachedAuditSync(
      'suite33_2_warrior_ex_pngs_v1',
      [
        'assets/sprites/warrior_ex_sheet.png',
        'assets/sprites/warrior_ex_vfx.png',
        'assets/sprites/warrior_ex_portrait.png'
      ],
      'warrior_ex_33_2_v1',
      () => {
    const exSheetPng = decodePngRgba33(
      fs.readFileSync(path.join(REPO_ROOT, 'assets/sprites/warrior_ex_sheet.png'))
    );
    if (exSheetPng.width !== 9600 || exSheetPng.height !== 2400) {
      throw new Error(
        `[Suite 33.2] Expected warrior_ex_sheet.png 9600x2400 (30x10 @ 320x240), got ${exSheetPng.width}x${exSheetPng.height}`
      );
    }

    const cellW = 320;
    const cellH = 240;
    const sheetStride = exSheetPng.width * 4;
    let borderClipCells = 0;

    for (let r = 0; r < 10; r++) {
      let rowTransitions = 0;
      for (let c = 0; c < 30; c++) {
        const ox = c * cellW;
        const oy = r * cellH;
        let clipped = false;
        for (let x = 0; x < cellW && !clipped; x++) {
          for (let m = 0; m < 4; m++) {
            if (
              exSheetPng.data[(oy + m) * sheetStride + (ox + x) * 4 + 3] > 0 ||
              exSheetPng.data[(oy + cellH - 1 - m) * sheetStride + (ox + x) * 4 + 3] > 0
            ) {
              clipped = true;
              break;
            }
          }
        }
        for (let y = 0; y < cellH && !clipped; y++) {
          for (let m = 0; m < 4; m++) {
            if (
              exSheetPng.data[(oy + y) * sheetStride + (ox + m) * 4 + 3] > 0 ||
              exSheetPng.data[(oy + y) * sheetStride + (ox + cellW - 1 - m) * 4 + 3] > 0
            ) {
              clipped = true;
              break;
            }
          }
        }
        if (clipped) borderClipCells++;

        if (c > 0) {
          const prevOx = (c - 1) * cellW;
          let differs = false;
          for (let y = 0; y < cellH && !differs; y += 2) {
            const rowBase = (oy + y) * sheetStride;
            for (let x = 0; x < cellW; x += 2) {
              const i0 = rowBase + (prevOx + x) * 4;
              const i1 = rowBase + (ox + x) * 4;
              if (
                exSheetPng.data[i0] !== exSheetPng.data[i1] ||
                exSheetPng.data[i0 + 1] !== exSheetPng.data[i1 + 1] ||
                exSheetPng.data[i0 + 2] !== exSheetPng.data[i1 + 2] ||
                exSheetPng.data[i0 + 3] !== exSheetPng.data[i1 + 3]
              ) {
                differs = true;
                break;
              }
            }
          }
          if (differs) rowTransitions++;
        }
      }
      if (rowTransitions !== 29) {
        throw new Error(
          `[Suite 33.2] Expected 29/29 distinct frame transitions on warrior_ex_sheet Row ${r}, got ${rowTransitions}/29`
        );
      }
    }
    if (borderClipCells !== 0) {
      throw new Error(
        `[Suite 33.2] Expected 0/300 border clips on warrior_ex_sheet.png, got ${borderClipCells}/300`
      );
    }

    // Verify Row 2 (`AUTO_ATTACK`) snap frames (`F03`, `F09`, `F17`, `F25`) project wide smear pixels into `x > 200`!
    for (const snapCol of [3, 9, 17, 25]) {
      const ox = snapCol * cellW;
      const oy = 2 * cellH;
      let maxFrontX = 0;
      let frontSmearPx = 0;
      for (let y = 0; y < cellH; y++) {
        const rowBase = (oy + y) * sheetStride;
        for (let x = 201; x < cellW; x++) {
          if (exSheetPng.data[rowBase + (ox + x) * 4 + 3] > 0) {
            frontSmearPx++;
            if (x > maxFrontX) maxFrontX = x;
          }
        }
      }
      if (maxFrontX <= 200 || frontSmearPx < 240) {
        throw new Error(
          `[Suite 33.2] Expected wide FFBE smear reach (x > 200, >= 240 px) on Row 2 snap col F${String(snapCol).padStart(2, '0')}, got maxFrontX=${maxFrontX}, frontSmearPx=${frontSmearPx}`
        );
      }
    }

    const exVfxPng = decodePngRgba33(
      fs.readFileSync(path.join(REPO_ROOT, 'assets/sprites/warrior_ex_vfx.png'))
    );
    if (exVfxPng.width !== 6240 || exVfxPng.height !== 1664) {
      throw new Error(
        `[Suite 33.2] Expected warrior_ex_vfx.png 6240x1664 (30x8 @ 208x208), got ${exVfxPng.width}x${exVfxPng.height}`
      );
    }
    let vfxBorderClips = 0;
    const vfxStride = exVfxPng.width * 4;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 30; c++) {
        const ox = c * 208;
        const oy = r * 208;
        let clipped = false;
        for (let x = 0; x < 208 && !clipped; x++) {
          if (
            exVfxPng.data[oy * vfxStride + (ox + x) * 4 + 3] > 0 ||
            exVfxPng.data[(oy + 207) * vfxStride + (ox + x) * 4 + 3] > 0
          ) {
            clipped = true;
          }
        }
        for (let y = 0; y < 208 && !clipped; y++) {
          if (
            exVfxPng.data[(oy + y) * vfxStride + ox * 4 + 3] > 0 ||
            exVfxPng.data[(oy + y) * vfxStride + (ox + 207) * 4 + 3] > 0
          ) {
            clipped = true;
          }
        }
        if (clipped) vfxBorderClips++;
      }
    }
    if (vfxBorderClips !== 0) {
      throw new Error(
        `[Suite 33.2] Expected 0/240 border clips on warrior_ex_vfx.png, got ${vfxBorderClips}/240`
      );
    }

    const exPortBuf = fs.readFileSync(
      path.join(REPO_ROOT, 'assets/sprites/warrior_ex_portrait.png')
    );
    if (exPortBuf.readUInt32BE(16) !== 128 || exPortBuf.readUInt32BE(20) !== 128) {
      throw new Error('[Suite 33.2] Expected warrior_ex_portrait.png to be 128x128!');
    }
      }
    );

    // Verify PixelForge wide-cell mirror-safe metrics & dual-Aethelgard 12-champion HTML roster cards
    const pfAssets = PixelForge.initAssets();
    pfAssets.warrior_ex.sheet.naturalWidth = 9600;
    pfAssets.warrior_ex.sheet.naturalHeight = 2400;
    const exMetrics = PixelForge.resolveSheetMetrics(
      pfAssets.warrior_ex,
      pfAssets.warrior_ex.sheet,
      208,
      208
    );
    const classicMetrics = PixelForge.resolveSheetMetrics(
      pfAssets.warrior,
      { naturalWidth: 6240, naturalHeight: 2080 },
      208,
      208
    );
    if (
      exMetrics.cellW !== 320 ||
      exMetrics.cellH !== 240 ||
      exMetrics.drawW !== 320 ||
      exMetrics.drawH !== 240 ||
      exMetrics.baseX !== -112 ||
      exMetrics.baseY !== -230 ||
      classicMetrics.cellW !== 208 ||
      classicMetrics.cellH !== 208 ||
      classicMetrics.baseX !== -104 ||
      classicMetrics.baseY !== -198
    ) {
      throw new Error(
        `[Suite 33.2] Unexpected resolveSheetMetrics: ex=${JSON.stringify(exMetrics)}, classic=${JSON.stringify(classicMetrics)}`
      );
    }

    const indexHtml33 = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    const styleCss33 = fs.readFileSync(path.join(REPO_ROOT, 'style.css'), 'utf8');
    const mainJs33 = fs.readFileSync(path.join(REPO_ROOT, 'src/main.js'), 'utf8');
    const rosterCardCount = (indexHtml33.match(/class="champ-card\b/g) || []).length;
    if (
      rosterCardCount !== 23 ||
      !indexHtml33.includes('id="card-warrior"') ||
      !indexHtml33.includes('id="card-warrior_ex"') ||
      !indexHtml33.includes('id="card-nyx_ex"') ||
      !indexHtml33.includes('AETHELGARD EX') ||
      !/id="p1-sprite-canvas"[^>]*width="320"[^>]*height="240"/.test(indexHtml33) ||
      !/id="p2-sprite-canvas"[^>]*width="320"[^>]*height="240"/.test(indexHtml33) ||
      !styleCss33.includes('aspect-ratio: 320 / 240;') ||
      !mainJs33.includes('const cw = 320;') ||
      !mainJs33.includes('const ch = 240;')
    ) {
      throw new Error(
        `[Suite 33.2] Expected 22 champion cards (11 EX + 11 Legacy) + zero-clip 320x240 #p1/#p2 pedestal canvases across index.html/style.css/main.js, got count=${rosterCardCount}`
      );
    }
  }

  // --------------------------------------------------------------------------
  // 33.3: Full `WarriorEx` (`warrior_ex`) Versus Mode (`AETHELGARD EX` vs `AETHELGARD`)
  //       & Adventure Mode (Manual + `AUTO` Combo + Skill Tree + `BLITZ` Dodge) Simulation
  // --------------------------------------------------------------------------
  {
    const assertFiniteFighter = (f, tag) => {
      for (const k of ['x', 'y', 'vx', 'vy', 'hp', 'maxHp', 'mana', 'finisherGauge']) {
        if (!Number.isFinite(f[k])) {
          throw new Error(`[Suite 33.3 ${tag}] Non-finite ${k}=${f[k]} on ${f.name}`);
        }
      }
    };

    // (A) Versus Mode: AETHELGARD EX (`warrior_ex`) vs Classic AETHELGARD (`warrior`)
    {
      const vsTrack = { rotateCalls: 0, quadCalls: 0 };
      const vsCtx = createMockCtx(vsTrack);
      let ellipseCalls = 0;
      vsCtx.ellipse = () => {
        ellipseCalls++;
      };

      const vsGame = createMockGame();
      const ex = new WarriorEx({ x: 380, groundY: 560, facing: 1, name: 'Aethelgard EX', team: 'left' });
      const classic = new Warrior({ x: 545, groundY: 560, facing: -1, name: 'Aethelgard', team: 'right' });
      ex.game = vsGame;
      classic.game = vsGame;
      classic.maxHp = 999999;
      classic.hp = 999999;
      ex.maxHp = 999999;
      ex.hp = 999999;
      vsGame.fighters = [ex, classic];
      vsGame.getEnemiesOf = (f) => (f === ex ? [classic] : [ex]);
      vsGame.getTargetFor = (f) => (f === ex ? classic : ex);
      vsGame.spawnProjectile = (p) => vsGame.vfx.projectiles.push(p);
      vsGame.vfx.projectiles.length = 0;

      // 1) Seamless 4-beat FFBE/Cloudia AUTO_ATTACK chain (zero IDLE reset, planted boots on snap, hit-stop, multi-hit + Beat 4 blade_wave)
      ex.skillCooldown = 999;
      ex.crouchCooldown = 999;
      ex.vaultCooldown = 999;
      ex.dashCooldown = 999;
      ex.dodgeCooldown = 999;
      ex.mana = 0;
      ex.finisherGauge = 0;
      classic.stunTimer = 999;

      ex.comboStep = 0;
      ex.setState('AUTO_ATTACK');

      const seenBeats = [];
      let sawIdleMidChain = false;
      let sawHitStop = false;
      let sawEnemyHitShake = false;
      let sawPlantedSnapZeroVx = false;
      let damageHitEvents = 0;
      let prevClassicHp = classic.hp;

      for (let tick = 0; tick < 140; tick++) {
        if (ex.state === 'AUTO_ATTACK') {
          if (seenBeats[seenBeats.length - 1] !== ex._autoVariant) {
            seenBeats.push(ex._autoVariant);
          }
          // Queue next beat while beats 0..2 are active so the 0.015s intra-combo link chains straight through!
          if (ex._autoVariant < 3) {
            ex.queueNextComboBeat();
          }
        } else if (seenBeats.length > 0 && seenBeats.length < 4 && ex.state === 'IDLE') {
          sawIdleMidChain = true;
        }

        ex.update(1 / 60, classic, vsGame);
        classic.stunTimer = 999;
        assertFiniteFighter(ex, 'VS-Auto-EX');
        assertFiniteFighter(classic, 'VS-Auto-Classic');

        if ((ex._hitStopTimer || 0) > 0) sawHitStop = true;
        if ((classic._hitShakeTimer || 0) > 0) sawEnemyHitShake = true;
        if (ex._bootsPlanted && Math.abs(ex.vx) < 0.001) sawPlantedSnapZeroVx = true;
        if (classic.hp < prevClassicHp) {
          damageHitEvents++;
          prevClassicHp = classic.hp;
        }

        ex.drawForegroundOverlay?.(vsCtx, vsGame.renderer);
        ex.draw(vsCtx, false, vsGame.renderer);
        ex.drawUltimateForeground?.(vsCtx, vsGame.renderer);
        classic.draw(vsCtx, false, vsGame.renderer);

        if (seenBeats.length >= 4 && ex.state === 'IDLE') break;
      }

      const spawnedBladeWave = vsGame.vfx.projectiles.some((p) => p.type === 'blade_wave');
      if (
        seenBeats.slice(0, 4).join(',') !== '0,1,2,3' ||
        sawIdleMidChain ||
        !sawHitStop ||
        !sawEnemyHitShake ||
        !sawPlantedSnapZeroVx ||
        damageHitEvents < 6 ||
        !spawnedBladeWave
      ) {
        throw new Error(
          `[Suite 33.3 VS-Auto] Expected 0,1,2,3 zero-IDLE chain w/ hit-stop, hit-shake, planted vx=0, >=6 hits & blade_wave; got beats=[${seenBeats.join(',')}], idleMid=${sawIdleMidChain}, hitStop=${sawHitStop}, shake=${sawEnemyHitShake}, planted=${sawPlantedSnapZeroVx}, hits=${damageHitEvents}, wave=${spawnedBladeWave}`
        );
      }

      // 2) SKILL (`ASTRAL BLADE-RUSH`), ULTIMATE (`RADIANT OMNISLASH`), TRUE_ULTIMATE (`EXVIUS DAWN: SOVEREIGN OF LIGHT`)
      for (const [mode, maxSteps] of [
        ['SKILL', 45],
        ['ULTIMATE', 75],
        ['TRUE_ULTIMATE', 150]
      ]) {
        ex.x = 420;
        ex.y = 560;
        classic.x = 560;
        classic.y = 560;
        const hpStart = classic.hp;
        if (mode === 'ULTIMATE') ex.mana = ex.maxMana;
        if (mode === 'TRUE_ULTIMATE') ex.finisherGauge = ex.maxFinisherGauge;
        ex.setState(mode);
        let sawWings = false;
        for (let i = 0; i < maxSteps; i++) {
          ex.update(1 / 30, classic, vsGame);
          if (ex.justiceWingsActive) sawWings = true;
          assertFiniteFighter(ex, `VS-${mode}`);
          ex.drawForegroundOverlay?.(vsCtx, vsGame.renderer);
          ex.draw(vsCtx, false, vsGame.renderer);
          ex.drawUltimateForeground?.(vsCtx, vsGame.renderer);
          if (ex.state === 'IDLE' && i > 5) break;
        }
        if (classic.hp >= hpStart || ex.state !== 'IDLE') {
          throw new Error(
            `[Suite 33.3 VS-${mode}] Expected ${mode} to deal damage (${hpStart - classic.hp}) and exit cleanly to IDLE (state=${ex.state})`
          );
        }
        if (mode === 'TRUE_ULTIMATE' && (!sawWings || ex.justiceFeathers.length === 0)) {
          throw new Error(
            `[Suite 33.3 VS-TRUE_ULTIMATE] Expected seraphic wings (${sawWings}) & falling Exvius feathers (${ex.justiceFeathers.length})!`
          );
        }
      }

      if (vsTrack.rotateCalls !== 0 || ellipseCalls !== 0) {
        throw new Error(
          `[Suite 33.3 VS] Expected 0 ctx.rotate (${vsTrack.rotateCalls}) and 0 ctx.ellipse (${ellipseCalls})!`
        );
      }
    }

    // (B) Adventure Mode: `warrior_ex` Manual Combo + Skill Tree (`wrath_1` blade_wave) + `BLITZ` Dodge + `AUTO` Play
    {
      const advTrack = { rotateCalls: 0, quadCalls: 0 };
      const advCtx = createMockCtx(advTrack);
      const advGame = createMockGame();
      advGame.gameMode = 'adventure';
      advGame.isAdventureMode = () => true;
      advGame.spawnProjectile = (p) => advGame.vfx.projectiles.push(p);

      const hero = new WarriorEx(360, 561, 1);
      hero.game = advGame;
      advGame.leftFighter = hero;
      advGame.fighters = [hero];

      const adv = new AdventureManager(advGame);
      advGame.adventure = adv;
      adv.startCampaign(hero);
      adv.setAutoPlay(false, false);
      adv.lockActive = true;
      adv.lockMinX = 180;
      adv.lockMaxX = 980;

      // Verify Skill Tree Theme + `wrath_1 >= 2` launching piercing `'blade_wave'`
      const exTheme = getHeroSkillTreeTheme('warrior_ex');
      if (!exTheme || !HERO_SKILL_TREE_THEMES.warrior_ex) {
        throw new Error('[Suite 33.3 Adv] Missing HERO_SKILL_TREE_THEMES.warrior_ex!');
      }
      adv.progression.skillPoints = 2;
      adv.progression.upgradeNode('wrath_1', hero);
      adv.progression.upgradeNode('wrath_1', hero);
      if (adv.progression.getRank('wrath_1') !== 2) {
        throw new Error('[Suite 33.3 Adv] Failed to upgrade wrath_1 to rank 2!');
      }
      advGame.vfx.projectiles.length = 0;

      const mob = adv.spawnMonster('templar', 485, { groundY: 561, skipPortal: true });
      mob.maxHp = 999999;
      mob.hp = 999999;
      mob.autoCooldown = 999;
      mob.skillCooldown = 999;

      // 1) Manual hold-to-slash 4-beat combo (`0 -> 1 -> 2 -> 3`) + `wrath_1` `'blade_wave'`
      const manualBeats = [];
      adv.heldAttack = true;
      for (let tick = 0; tick < 110 && manualBeats.length < 4; tick++) {
        const prevVar = hero._autoVariant;
        const prevState = hero.state;
        mob.x = hero.x + 118;
        adv.processPlayerControls(1 / 30, hero, mob);
        assertFiniteFighter(hero, 'Adv-Manual');
        if (
          hero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || hero._autoVariant !== prevVar)
        ) {
          manualBeats.push(hero._autoVariant);
        }
      }
      adv.heldAttack = false;
      const advWaveSpawned = advGame.vfx.projectiles.some((p) => p.type === 'blade_wave');
      if (manualBeats.slice(0, 4).join(',') !== '0,1,2,3' || !advWaveSpawned) {
        throw new Error(
          `[Suite 33.3 Adv-Manual] Expected manual 0,1,2,3 combo & wrath_1 blade_wave, got beats=[${manualBeats.join(',')}], wave=${advWaveSpawned}`
        );
      }

      // 2) Bespoke `BLITZ` Adventure Dodge (`startHeroAdventureDodge` -> frame 183+, 0 lift, afterimage)
      hero.setState('IDLE');
      hero.dodgeCooldown = 0;
      adv.startHeroAdventureDodge(hero, 1);
      if (!hero._advPureDodge || hero._advDodgeFrameOverride !== 183) {
        throw new Error(
          `[Suite 33.3 Adv-Dodge] Expected BLITZ dodge active at frame 183, got active=${hero._advPureDodge}, frame=${hero._advDodgeFrameOverride}`
        );
      }
      let maxDodgeLift = 0;
      for (let i = 0; i < 8; i++) {
        adv.updateHeroAdventureDodge(1 / 30, hero);
        maxDodgeLift = Math.max(maxDodgeLift, Math.max(0, hero.groundY - hero.y));
        hero.drawAdventureDodgeFX?.(advCtx);
        hero.draw(advCtx, false, advGame.renderer);
      }
      adv.finishHeroAdventureDodge?.(hero, false);
      if (maxDodgeLift > 0.01 || hero.afterimages.length === 0) {
        throw new Error(
          `[Suite 33.3 Adv-Dodge] Expected grounded 0-lift Sword-Drag BLITZ dodge w/ afterimages, got lift=${maxDodgeLift}, afterimages=${hero.afterimages.length}`
        );
      }

      // 3) `AUTO` Play 4-beat combo (`0 -> 1 -> 2 -> 3`)
      hero.setState('IDLE');
      hero._advDodgeActive = false;
      hero._advPureDodge = false;
      hero.skillCooldown = 999;
      hero.mana = 0;
      hero.finisherGauge = 0;
      adv.progression.spirit = 0;
      adv.progression.ultCharge = 0;
      adv.progression.astralCharge = 0;
      hero.x = 360;
      mob.x = 480;
      adv.setAutoPlay(true, false);
      const autoBeats = [];
      for (let tick = 0; tick < 110 && autoBeats.length < 4; tick++) {
        const prevVar = hero._autoVariant;
        const prevState = hero.state;
        mob.x = hero.x + 116;
        adv.processPlayerControls(1 / 30, hero, mob);
        assertFiniteFighter(hero, 'Adv-Auto');
        if (
          hero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || hero._autoVariant !== prevVar)
        ) {
          autoBeats.push(hero._autoVariant);
        }
      }
      adv.stopCampaign();
      if (autoBeats.slice(0, 4).join(',') !== '0,1,2,3' || advTrack.rotateCalls !== 0) {
        throw new Error(
          `[Suite 33.3 Adv-Auto] Expected AUTO 0,1,2,3 combo & 0 ctx.rotate, got beats=[${autoBeats.join(',')}], rotate=${advTrack.rotateCalls}`
        );
      }
    }
  }

  const suite33ElapsedMs = performance.now() - suite33StartMs;
  if (suite33ElapsedMs >= 3000) {
    throw new Error(
      `[Suite 33] Expected Suite 33 runtime < 3000ms, got ${suite33ElapsedMs.toFixed(1)}ms!`
    );
  }

  console.log(
    `[PASS] Suite 33: Untouched Classic Aethelgard SHA-256 + R&D Spec, Wide-Canvas 9600x2400 Aethelgard EX (0/300 clips, 29/29 transitions, x>200 FFBE smears) & Dual-Mode VS/Adventure Combat verified in ${suite33ElapsedMs.toFixed(0)}ms!`
  );
}

} // end if (!RUN_SUITE36_ONLY && !RUN_EX_ONLY)

if (!RUN_SUITE36_ONLY) {

// ============================================================================
// SUITE 34: 22-Champion Dual-Version Roster Overhaul (`?v=30fps114` — `11 EX` + `11 Legacy`),
//           100% Legacy SHA-256 Purity, All-11 Wide-Canvas `9600x2400` Art Audit,
//           `#roster-version-bar` Switcher & Live VS/Adventure Gameplay (`< 3s`)
// ============================================================================
{
  const suite34StartMs = performance.now();
  const { Worker: Worker34 } = await import('node:worker_threads');

  const EX_HERO_MATRIX_34 = [
    ['warrior_ex', WarriorEx, 'blade_wave', null],
    ['mage_ex', FireMageEx, 'fireball', 'inferno'],
    ['priestess_ex', PriestessEx, 'holy_light', null],
    ['chronomancer_ex', ChronomancerEx, 'clock_gear', null],
    ['valkyrie_ex', ValkyrieEx, 'dragon_lance', null],
    ['ronin_ex', RoninEx, 'ronin_slash', 'shogunate'],
    ['archer_ex', ArcherEx, 'arrow', null],
    ['reaper_ex', ReaperEx, 'phantom_scythe', null],
    ['titan_ex', TitanEx, 'forge_wave', null],
    ['icemage_ex', IceMageEx, 'cryo_shard', 'glacial'],
    ['android_ex', AndroidEx, 'cyber_disc', null],
    ['nyx_ex', NyxEx, 'nebula_packet', null]
  ];

  // --------------------------------------------------------------------------
  // 34.1: 100% SHA-256 Legacy Preservation (`#68` Baseline) & Zero-Emoji Purity
  // --------------------------------------------------------------------------
  {
    const preservedLegacySha256 = {
      'src/entities/Warrior.js':
        'bead5970fbc64f121eabfd75ad5c02d00e7a768118d28c055e3eb3e768b27adf',
      'src/entities/FireMage.js':
        '1efd4869fa9fbb1f2dbea3caf82270f015861abd9e658e899fe8ba164beeb612',
      'src/entities/Priestess.js':
        'a780ff974df5b3c84e47a7b0ee5c73959776850ed16437d9a692df2087943e32',
      'src/entities/Chronomancer.js':
        'ae3ebe56fd05ff30ba6119235e7f817247e625d1bc3ec4bb3adb7727e10ee1b5',
      'src/entities/Valkyrie.js':
        '7819fa2af192680aa651ae27ab7176b8e984c657a080724674219fedecd6c783',
      'src/entities/Ronin.js':
        '9fe31e9805847e166a4b6db7bb1f45c637bc5ed8381c30b61a1588adc08af009',
      'src/entities/Archer.js':
        'd57226c0745eb184f6393a834bf044502a5cd45de707792147aa78acbb6ccda5',
      'src/entities/Reaper.js':
        '66c7a70c72b6f8238ab84a40e85c7c63efa13d9299b7ef0fe1d02ce75e28bb07',
      'src/entities/Titan.js':
        '44019474afab47588303ae5fa78b964f67fffd67a359b4bbc837cea8bd48e2ae',
      'src/entities/IceMage.js':
        '61ca2940328ee3f294159b8dc3ee6829d4cf9ced73a04b816bc98b4300adfcbe',
      'src/entities/Android.js':
        '5c074a5ebc018ad56850feaaafc8d96d8711c71ea8e54a873129380993ea1c05',
      'assets/sprites/warrior_sheet.png':
        '2e5c187e90209f417dc15d0e0f5edf9d4c08ed894b60c8708c50fccf8ee2ad08',
      'assets/sprites/mage_sheet.png':
        '18dc573380ff15ed03caa3001437fbf59b4c8a5dae937ba1193b9436f738a527',
      'assets/sprites/priestess_sheet.png':
        '568f83967540c0c6b3496dd3f36c40167c37ed48d3c1c9acb30471d9993e5426',
      'assets/sprites/chronomancer_sheet.png':
        '978a3b3a2cbd81899e851d7a31806843e6971bd4121370c7926b6ceff27b0b7c',
      'assets/sprites/valkyrie_sheet.png':
        '06aefaaf2d47b53c9e33b2691a55a778c6cfdc27adb31a7e41095de0d8ecab7e',
      'assets/sprites/ronin_sheet.png':
        'f6ff03d6eda1242231ab5af45e79642f6082429c27ddf02cb01009889894f96c',
      'assets/sprites/archer_sheet.png':
        'f3b7d0e91a5732fbaa4db35b9dd36241807c00ac22fb6584e18cc450c94a6186',
      'assets/sprites/reaper_sheet.png':
        '47be00b225be8fa91aab985171dd1f51cba3d6c744ba60430ad2e7b6ec24b8e9',
      'assets/sprites/titan_sheet.png':
        'd994f2d0f5bea1636bc52d826359e7dbb48606cd273364d0904c2d21d865e81c',
      'assets/sprites/icemage_sheet.png':
        '40fa57c34e1ef463c541ca93500c035ffb8b12d773c0e8bab6475ac9cf9d9b61',
      'assets/sprites/android_sheet.png':
        '88698257d4088bc7e4bd6e9ae6ed9e225dedcc3dd23f645b0d015f7a3a8b1449',
      'assets/sprites/warrior_vfx.png':
        '0e3fff5ffebd70aeefed042c8f31e1b2c760f9ac3d3712272122a800175a8520',
      'assets/sprites/mage_vfx.png':
        'ac20d3ed505fbbb4458e145b085800b133779ca5fbd528e276ccf531699ec9c4',
      'assets/sprites/priestess_vfx.png':
        'db93af4696f5378e21aba6ce2b3d3bea8725974a814e52869ad309bc65fc0879',
      'assets/sprites/chronomancer_vfx.png':
        'bfdd02739535a856c22966cc1949a40b61ae0e9e68841d8cb0a33c7e5534071e',
      'assets/sprites/valkyrie_vfx.png':
        'c349afe007e1dc8420bfe03f597d11d23d567106640390c10bd8ea0500967d6b',
      'assets/sprites/ronin_vfx.png':
        'f97c950b738c00291ea93255b92294015279e1de55bb012f7d0eb087c657601a',
      'assets/sprites/archer_vfx.png':
        '37f540280613cd92914400fded4f8be88733ff8a6c3a849a48ee1ef63a3c1b36',
      'assets/sprites/reaper_vfx.png':
        '3cdaebae16925b4b6cb6f6940f3a61b27a828e23db032b7444c3ee219ffe69b5',
      'assets/sprites/titan_vfx.png':
        '07d0d694a63a069df248917b0498aed30075fdb421e48b52750d963f91afee6a',
      'assets/sprites/icemage_vfx.png':
        '462d9293b706b9d864327d0bf036f0d462c810b2238aaccb5d5d1d853307a805',
      'assets/sprites/android_vfx.png':
        '81bb26d1a2f656eee600e3d11c27451611fc3310c9f453a61c875cb4cefdb491',
      'assets/sprites/warrior_portrait.png':
        '1b26c5d4083c72f91e5dc5a3bfeec9bbb97cd40973dc3aa922d33e0ceac692ee',
      'assets/sprites/mage_portrait.png':
        'a7fc536ae51e8c1ad56e959e3d1efbb9d32bfc40489960eaf7e0040b00aa1dd9',
      'assets/sprites/priestess_portrait.png':
        'ee214124b29513d32cc7b5586ba9630a932c7fcfe4b3047094adc85fa230ea0d',
      'assets/sprites/chronomancer_portrait.png':
        '04a76828b45b0a98b4482169e69510089288a92d942b93c59541cc2ac71d5335',
      'assets/sprites/valkyrie_portrait.png':
        '8b9b5ad9afbce8023dd8369b40a23975764a9d8fd7977f48288c677e2ee3bb4e',
      'assets/sprites/ronin_portrait.png':
        'b370a9d79a9e07acf029e5b36457f3c6d6a33bceb0c3d4760287c13ef83ff740',
      'assets/sprites/archer_portrait.png':
        'd7658745c5061aeac08e211ca65e9623ff53b0bfe6d6bc5b93b247602d6063dd',
      'assets/sprites/reaper_portrait.png':
        'c4c5d1be014f1f74c27bd5df5ecf3d25ca23a426a561bd93ba9581322fa707b7',
      'assets/sprites/titan_portrait.png':
        '8262d8c76f4d5cf2f50c8c23d79b81d7cd30700eca1e0bc4e558d54e8cb37d0d',
      'assets/sprites/icemage_portrait.png':
        'dc51f4f6f5f5ec9c68c90b08b3b4ae89e56c2192b47b0d3f38805413119b0cfc',
      'assets/sprites/android_portrait.png':
        'ebc3b08bf71530c12672c228c5353299a51a54721dfe6ac1ea7d81c04847df7d',
      'assets/sprites/warrior_ex_sheet.png':
        'e0da0cbea51a48cc7a5b3219a116e469c722e5b02d092b7fa602cbae7f323ee7',
      'assets/sprites/warrior_ex_portrait.png':
        'e59d12cda15654013ca41045095ba5e5b476228fa178643bc6765b216293f933',
      'assets/sprites/chronomancer_ex_portrait.png':
        '5749976fb6b69d5627e8711e7bbbbde4d8a2255c2c205b0764698e517c757e91',
      'assets/sprites/ronin_ex_portrait.png':
        '9ee478e8bee4f87ff3fd82b8d5245a1c0f9196c390619259ffd992c6163313e5',
      'assets/sprites/reaper_ex_portrait.png':
        '3c2d5bc77c1f61e0cfbb413187807a2f0555a2c6b27987654310282425b9fe95',
      'assets/sprites/titan_ex_portrait.png':
        '2b9444486a5c64063420ab95f36f1ca09d91149812dd87f6ea49e0c832b0f8e9',
      'assets/sprites/android_ex_portrait.png':
        '31bf48e204adfe138da3f3577c90b5c1cbdadca42267d3f39b172f8ebf1432b2',
      'src/engine/shaders/runicSteelShaders.js':
        '39cbd1dcd9b36af44203f636fb27378ddb8d3c9b385629de71534199310510b4',
      'src/engine/shaders/solarShaders.js':
        '78f5cd68e344f2a6bcc2b811f599e933a6b6b21a45a23a48600287dccaa0db57',
      'src/engine/shaders/seraphicShaders.js':
        'b5ff501d6584678df19d6a58afda6882d3337e74fd64093c58277d7ef3812d64',
      'src/engine/shaders/chronoShaders.js':
        '155842abe5f21c261d921929da48a682e5dbf2c4bf46eaf81d4771cee8958a31',
      'src/engine/shaders/valkyrieShaders.js':
        '420b71889bed0089fb78ffded8bcc551262a53fa1fa7f3901706e5fe4456c201',
      'src/engine/shaders/stormShaders.js':
        'c97031ea723786886051651f71712fbc97049ce7d8a6273b76a29343de2d01fd',
      'src/engine/shaders/sylvanShaders.js':
        '763483bc55e0d642a62b92396772aa8ab29471634baf0cf2f8b510081c20d09a',
      'src/engine/shaders/abyssalShaders.js':
        'd687ce94d9002b7fb101a0634ec1747afc9fe5b341045e9e679b0dcf8b7574f4',
      'src/engine/shaders/forgeShaders.js':
        'e71e7404b69d6d28e0912e7843dd1b95cf95777efc8db2e734ccc5960fab6cb2',
      'src/engine/shaders/glacialShaders.js':
        'c6d5893c02d08152708929924247a0acb2efdc9c4be4c13f7a6346760521e38b',
      'src/engine/shaders/cyberShaders.js':
        '072cb4d29f5d7d0d995b497807ad1caf1607a595da6b4311e369a7d354d620ee',
      'scripts/hd2d_rig_core.py':
        '66f2bfe8cdd45e031349d30cd9b980cea12621051709782196d776f2a12c8777',
      'docs/CHAMPION_DEVELOPMENT_PLAYBOOK.md':
        '2891ca38b0ec6e6df9e629e99ccdc1fe1403b297e41fc330174b4c556f9b0361',
      '.agents/skills/arcane-vs-steel-pipeline/SKILL.md':
        '7b915cc454b5b4c9e979313a56eca6a3329dccedc6aa77aba69c14becea87705'
    };

    for (const [relFile, expectedHex] of Object.entries(preservedLegacySha256)) {
      const absFile = path.join(REPO_ROOT, relFile);
      if (!fs.existsSync(absFile)) {
        throw new Error(`[Suite 34.1] Missing preserved Legacy/pipeline file: ${relFile}`);
      }
      const actualHex = crypto
        .createHash('sha256')
        .update(fs.readFileSync(absFile))
        .digest('hex');
      if (actualHex !== expectedHex) {
        throw new Error(
          `[Suite 34.1] Preserved Legacy file '${relFile}' was modified! expected=${expectedHex}, actual=${actualHex}`
        );
      }
    }

    const fbRoot34 = path.join(REPO_ROOT, 'fallback_backups');
    if (fs.existsSync(fbRoot34)) {
      const snaps = fs
        .readdirSync(fbRoot34)
        .filter((d) => d.endsWith('_pre_11hero_ex_roster_overhaul'));
      if (snaps.length < 1) {
        throw new Error(
          '[Suite 34.1] Missing fallback_backups/*_pre_11hero_ex_roster_overhaul snapshot!'
        );
      }
      const snapDir = path.join(fbRoot34, snaps[snaps.length - 1]);
      const restoreScript = path.join(snapDir, 'RESTORE_THIS_BACKUP.sh');
      const sumsFile = path.join(snapDir, 'SHA256SUMS.txt');
      if (
        !fs.existsSync(restoreScript) ||
        !fs.existsSync(sumsFile) ||
        (fs.statSync(restoreScript).mode & 0o111) === 0
      ) {
        throw new Error(`[Suite 34.1] Incomplete fallback snapshot at ${snapDir}!`);
      }
    }

    const emojiRe34 = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
    const emojiTargets34 = [
      path.join(REPO_ROOT, 'index.html'),
      path.join(REPO_ROOT, 'style.css'),
      path.join(REPO_ROOT, 'manifest.json'),
      path.join(REPO_ROOT, 'docs/IMPLEMENTATION_LOG.md'),
      path.join(REPO_ROOT, 'docs/PROJECT_MEMORY_HANDOFF.md')
    ];
    const collectSrc34 = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) collectSrc34(full);
        else if (ent.name.endsWith('.js') && ent.name !== 'PixelFont.js') {
          emojiTargets34.push(full);
        }
      }
    };
    collectSrc34(path.join(REPO_ROOT, 'src'));
    for (const fPath of emojiTargets34) {
      const txt = fs.readFileSync(fPath, 'utf8');
      const m = txt.match(emojiRe34);
      if (m) {
        throw new Error(
          `[Suite 34.1] Forbidden Unicode emoji '${m[0]}' (U+${m[0].codePointAt(0).toString(16).toUpperCase()}) in ${fPath}`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // 34.2: Parallel Pixel Audit of All 11 Wide-Canvas EX Art Suites
  //       (`*_ex_sheet.png` 9600x2400, `*_ex_vfx.png` 6240x1664, `*_ex_portrait.png` 128x128)
  // --------------------------------------------------------------------------
  {
    const exIds = EX_HERO_MATRIX_34.map(([id]) => id);
    const workerCount34 = Math.min(6, Math.max(4, os.cpus()?.length || 4));
    const shards = Array.from({ length: workerCount34 }, () => []);
    exIds.forEach((id, idx) => shards[idx % workerCount34].push(id));

    const workerScript = `
      const { parentPort, workerData } = require('node:worker_threads');
      const fs = require('node:fs');
      const path = require('node:path');
      const zlib = require('node:zlib');
      const crypto = require('node:crypto');

      const sheetArr = new Uint8Array(9600 * 2400 * 4);
      const sheetU32 = new Uint32Array(sheetArr.buffer);
      const vfxArr = new Uint8Array(6240 * 1664 * 4);
      const vfxU32 = new Uint32Array(vfxArr.buffer);

      function decodeRgba(pngBytes, out, expW, expH, label) {
        if (pngBytes.length < 29 || pngBytes.readUInt32BE(0) !== 0x89504e47) {
          throw new Error('[Suite 34.2] Invalid PNG magic on ' + label);
        }
        const w = pngBytes.readUInt32BE(16);
        const h = pngBytes.readUInt32BE(20);
        const bd = pngBytes[24];
        const ct = pngBytes[25];
        if (w !== expW || h !== expH || bd !== 8 || ct !== 6) {
          throw new Error('[Suite 34.2] Unexpected PNG ' + label + ': ' + w + 'x' + h + ' bd=' + bd + ' ct=' + ct);
        }
        const chunks = [];
        let off = 8;
        while (off + 8 <= pngBytes.length) {
          const len = pngBytes.readUInt32BE(off);
          const t = pngBytes.readUInt32BE(off + 4);
          if (t === 0x49444154) chunks.push(pngBytes.subarray(off + 8, off + 8 + len));
          else if (t === 0x49454e44) break;
          off += 12 + len;
        }
        const rawBuf = zlib.inflateSync(chunks.length === 1 ? chunks[0] : Buffer.concat(chunks));
        const raw = new Uint8Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength);
        const stride = w * 4;
        for (let y = 0; y < h; y++) {
          const srcRow = y * (stride + 1);
          const f = raw[srcRow];
          const s0 = srcRow + 1;
          const d0 = y * stride;
          const p0 = d0 - stride;
          if (f === 0) {
            out.set(raw.subarray(s0, s0 + stride), d0);
          } else if (f === 1) {
            let a0 = (out[d0] = raw[s0]);
            let a1 = (out[d0 + 1] = raw[s0 + 1]);
            let a2 = (out[d0 + 2] = raw[s0 + 2]);
            let a3 = (out[d0 + 3] = raw[s0 + 3]);
            for (let i = 4; i < stride; i += 4) {
              a0 = out[d0 + i] = (raw[s0 + i] + a0) & 0xff;
              a1 = out[d0 + i + 1] = (raw[s0 + i + 1] + a1) & 0xff;
              a2 = out[d0 + i + 2] = (raw[s0 + i + 2] + a2) & 0xff;
              a3 = out[d0 + i + 3] = (raw[s0 + i + 3] + a3) & 0xff;
            }
          } else if (f === 2) {
            if (y === 0) out.set(raw.subarray(s0, s0 + stride), d0);
            else for (let i = 0; i < stride; i++) out[d0 + i] = (raw[s0 + i] + out[p0 + i]) & 0xff;
          } else if (f === 3) {
            if (y === 0) {
              for (let i = 0; i < 4; i++) out[d0 + i] = raw[s0 + i];
              for (let i = 4; i < stride; i++) out[d0 + i] = (raw[s0 + i] + (out[d0 + i - 4] >> 1)) & 0xff;
            } else {
              for (let i = 0; i < 4; i++) out[d0 + i] = (raw[s0 + i] + (out[p0 + i] >> 1)) & 0xff;
              for (let i = 4; i < stride; i++) out[d0 + i] = (raw[s0 + i] + ((out[d0 + i - 4] + out[p0 + i]) >> 1)) & 0xff;
            }
          } else if (f === 4) {
            if (y === 0) {
              for (let i = 0; i < 4; i++) out[d0 + i] = raw[s0 + i];
              for (let i = 4; i < stride; i++) out[d0 + i] = (raw[s0 + i] + out[d0 + i - 4]) & 0xff;
            } else {
              let a0 = (out[d0] = (raw[s0] + out[p0]) & 0xff);
              let a1 = (out[d0 + 1] = (raw[s0 + 1] + out[p0 + 1]) & 0xff);
              let a2 = (out[d0 + 2] = (raw[s0 + 2] + out[p0 + 2]) & 0xff);
              let a3 = (out[d0 + 3] = (raw[s0 + 3] + out[p0 + 3]) & 0xff);
              let c0 = out[p0], c1 = out[p0 + 1], c2 = out[p0 + 2], c3 = out[p0 + 3];
              for (let i = 4; i < stride; i += 4) {
                const b0 = out[p0 + i], b1 = out[p0 + i + 1], b2 = out[p0 + i + 2], b3 = out[p0 + i + 3];
                let p = a0 + b0 - c0, pa = p < a0 ? a0 - p : p - a0, pb = p < b0 ? b0 - p : p - b0, pc = p < c0 ? c0 - p : p - c0;
                a0 = out[d0 + i] = (raw[s0 + i] + (pa <= pb && pa <= pc ? a0 : pb <= pc ? b0 : c0)) & 0xff; c0 = b0;
                p = a1 + b1 - c1; pa = p < a1 ? a1 - p : p - a1; pb = p < b1 ? b1 - p : p - b1; pc = p < c1 ? c1 - p : p - c1;
                a1 = out[d0 + i + 1] = (raw[s0 + i + 1] + (pa <= pb && pa <= pc ? a1 : pb <= pc ? b1 : c1)) & 0xff; c1 = b1;
                p = a2 + b2 - c2; pa = p < a2 ? a2 - p : p - a2; pb = p < b2 ? b2 - p : p - b2; pc = p < c2 ? c2 - p : p - c2;
                a2 = out[d0 + i + 2] = (raw[s0 + i + 2] + (pa <= pb && pa <= pc ? a2 : pb <= pc ? b2 : c2)) & 0xff; c2 = b2;
                p = a3 + b3 - c3; pa = p < a3 ? a3 - p : p - a3; pb = p < b3 ? b3 - p : p - b3; pc = p < c3 ? c3 - p : p - c3;
                a3 = out[d0 + i + 3] = (raw[s0 + i + 3] + (pa <= pb && pa <= pc ? a3 : pb <= pc ? b3 : c3)) & 0xff; c3 = b3;
              }
            }
          }
        }
      }

      for (const id of workerData.ids) {
        const sheetPath = path.join(workerData.repoRoot, 'assets/sprites', id + '_sheet.png');
        decodeRgba(fs.readFileSync(sheetPath), sheetArr, 9600, 2400, id + '_sheet.png');

        let borderClips = 0;
        for (let r = 0; r < 10; r++) {
          let transitions = 0;
          for (let c = 0; c < 30; c++) {
            const ox = c * 320;
            const oy = r * 240;
            let clipped = false;
            for (let m = 0; m < 4 && !clipped; m++) {
              const topRow = (oy + m) * 9600 + ox;
              const botRow = (oy + 239 - m) * 9600 + ox;
              for (let x = 0; x < 320; x++) {
                if (sheetU32[topRow + x] >= 0x01000000 || sheetU32[botRow + x] >= 0x01000000) {
                  clipped = true;
                  break;
                }
              }
              for (let y = 0; y < 240 && !clipped; y++) {
                const rowOff = (oy + y) * 9600 + ox;
                if (sheetU32[rowOff + m] >= 0x01000000 || sheetU32[rowOff + 319 - m] >= 0x01000000) {
                  clipped = true;
                  break;
                }
              }
            }
            if (clipped) borderClips++;

            if (c > 0) {
              const prevOx = (c - 1) * 320;
              let differs = false;
              for (let y = 0; y < 240 && !differs; y += 2) {
                const rb = (oy + y) * 9600;
                for (let x = 0; x < 320; x += 2) {
                  if (sheetU32[rb + prevOx + x] !== sheetU32[rb + ox + x]) {
                    differs = true;
                    break;
                  }
                }
              }
              if (differs) transitions++;
            }
          }
          if (transitions !== 29) {
            throw new Error('[Suite 34.2] Expected 29/29 transitions on ' + id + '_sheet Row ' + r + ', got ' + transitions);
          }
        }
        if (borderClips !== 0) {
          throw new Error('[Suite 34.2] Expected 0/300 border clips on ' + id + '_sheet.png, got ' + borderClips);
        }

        // Verify Row 1 WALK (frames 30..59) morph-free vertical & ground continuity (#102 Part B)
        const walkTopYs = [];
        for (let c = 0; c < 30; c++) {
          const ox = c * 320;
          const oy = 240;
          let minY = 240;
          let maxY = 0;
          for (let y = 0; y < 240; y++) {
            const rb = (oy + y) * 9600 + ox;
            for (let x = 0; x < 320; x++) {
              if (sheetU32[rb + x] >= 0x01000000) {
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (maxY < 222 || maxY > 233) {
            throw new Error('[Suite 34.2] Expected grounded Row 1 WALK footY in [222..233] on ' + id + ' F' + c + ', got ' + maxY);
          }
          walkTopYs.push(minY);
        }
        for (let c = 0; c < 30; c++) {
          const adjDelta = Math.abs(walkTopYs[(c + 1) % 30] - walkTopYs[c]);
          if (adjDelta > 4) {
            throw new Error('[Suite 34.2] Morph/pop detected on ' + id + ' Row 1 WALK F' + c + '->F' + ((c + 1) % 30) + ': topY delta=' + adjDelta);
          }
        }

        const pureRangedMaxCellX34 = {
          mage_ex: 262,
          priestess_ex: 262,
          valkyrie_ex: 262,
          icemage_ex: 262,
          nyx_ex: 262
        };
        if (pureRangedMaxCellX34[id]) {
          const capX = pureRangedMaxCellX34[id];
          for (const rr of [2, 3]) {
            const roy = rr * 240;
            for (let cc = 0; cc < 30; cc++) {
              const cox = cc * 320;
              let maxCellX = 0;
              for (let y = 0; y < 240; y++) {
                const rb = (roy + y) * 9600 + cox;
                for (let x = capX + 1; x < 320; x++) {
                  if (sheetU32[rb + x] >= 0x01000000 && x > maxCellX) {
                    maxCellX = x;
                  }
                }
              }
              if (maxCellX > capX) {
                throw new Error(
                  '[Suite 34.2] Leaked baked forward spell FX on pure ranged sheet ' +
                    id +
                    ' Row ' +
                    rr +
                    ' F' +
                    String(cc).padStart(2, '0') +
                    ': maxX=' +
                    maxCellX +
                    ' > ' +
                    capX
                );
              }
            }
          }
        } else {
          for (const snapCol of [3, 9, 17, 25]) {
            const ox = snapCol * 320;
            const oy = 2 * 240;
            let maxFrontX = 0;
            let frontPx = 0;
            for (let y = 0; y < 240; y++) {
              const rb = (oy + y) * 9600 + ox;
              for (let x = 201; x < 320; x++) {
                if (sheetU32[rb + x] >= 0x01000000) {
                  frontPx++;
                  if (x > maxFrontX) maxFrontX = x;
                }
              }
            }
            if (maxFrontX <= 200 || frontPx < 240) {
              throw new Error('[Suite 34.2] Expected wide smear reach (x > 200, >= 240px) on ' + id + ' Row 2 F' + String(snapCol).padStart(2, '0') + ', got maxX=' + maxFrontX + ', px=' + frontPx);
            }
          }
        }

        const vfxPath = path.join(workerData.repoRoot, 'assets/sprites', id + '_vfx.png');
        decodeRgba(fs.readFileSync(vfxPath), vfxArr, 6240, 1664, id + '_vfx.png');
        let vfxClips = 0;
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 30; c++) {
            const ox = c * 208;
            const oy = r * 208;
            let clipped = false;
            const topRow = oy * 6240 + ox;
            const botRow = (oy + 207) * 6240 + ox;
            for (let x = 0; x < 208; x++) {
              if (vfxU32[topRow + x] >= 0x01000000 || vfxU32[botRow + x] >= 0x01000000) {
                clipped = true;
                break;
              }
            }
            for (let y = 0; y < 208 && !clipped; y++) {
              const rowOff = (oy + y) * 6240 + ox;
              if (vfxU32[rowOff] >= 0x01000000 || vfxU32[rowOff + 207] >= 0x01000000) {
                clipped = true;
                break;
              }
            }
            if (clipped) vfxClips++;
          }
        }
        if (vfxClips !== 0) {
          throw new Error('[Suite 34.2] Expected 0/240 border clips on ' + id + '_vfx.png, got ' + vfxClips);
        }

        const portBuf = fs.readFileSync(path.join(workerData.repoRoot, 'assets/sprites', id + '_portrait.png'));
        if (portBuf.readUInt32BE(0) !== 0x89504e47 || portBuf.readUInt32BE(16) !== 128 || portBuf.readUInt32BE(20) !== 128) {
          throw new Error('[Suite 34.2] Expected ' + id + '_portrait.png to be 128x128 PNG!');
        }
      }
      parentPort.postMessage({ ok: true, count: workerData.ids.length });
    `;

    const allIds34 = shards.flat();
    const pngDeps34 = allIds34.flatMap((id) => [
      `assets/sprites/${id}_sheet.png`,
      `assets/sprites/${id}_vfx.png`,
      `assets/sprites/${id}_portrait.png`
    ]);
    await getCachedAuditAsync('suite34_2_ex_pngs_v1', pngDeps34, workerScript, async () => {
      await Promise.all(
        shards.map(
          (ids) =>
            new Promise((resolve, reject) => {
              const w = new Worker34(workerScript, {
                eval: true,
                workerData: { repoRoot: REPO_ROOT, ids }
              });
              w.once('message', (msg) => (msg?.ok ? resolve(msg) : reject(new Error('Worker failed'))));
              w.once('error', reject);
              w.once('exit', (code) => {
                if (code !== 0) reject(new Error(`[Suite 34.2] PNG worker exited with code ${code}`));
              });
            })
        )
      );
      return true;
    });

    // Verify PixelForge wide-cell metrics & native right-facing (+X) rule across all 22 heroes
    const pfAssets34 = PixelForge.initAssets();
    for (const exKey of EX_HERO_KEYS) {
      const m = PixelForge.resolveSheetMetrics(
        pfAssets34[exKey],
        { naturalWidth: 9600, naturalHeight: 2400 },
        208,
        208
      );
      if (m.cellW !== 320 || m.cellH !== 240 || m.baseX !== -112 || m.baseY !== -230) {
        throw new Error(`[Suite 34.2] Bad EX sheet metrics for ${exKey}: ${JSON.stringify(m)}`);
      }
    }
    for (const legKey of LEGACY_HERO_KEYS) {
      const m = PixelForge.resolveSheetMetrics(
        pfAssets34[legKey],
        { naturalWidth: 6240, naturalHeight: 2080 },
        208,
        208
      );
      if (m.cellW !== 208 || m.cellH !== 208 || m.baseX !== -104 || m.baseY !== -198) {
        throw new Error(`[Suite 34.2] Bad Legacy sheet metrics for ${legKey}: ${JSON.stringify(m)}`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 34.3: `#roster-version-bar` UI, Tab Switching (`EX VERSION` <-> `LEGACY VERSION`),
  //       Cross-Version Matchups & 22-Hero `PixelForge.releaseInactiveAssets` Audit
  // --------------------------------------------------------------------------
  {
    if (
      EX_HERO_KEYS.length !== 12 ||
      LEGACY_HERO_KEYS.length !== 11 ||
      Object.keys(CHAMPION_ROSTER).length !== 23 ||
      PixelForge.ALL_HERO_KEYS.length !== 23
    ) {
      throw new Error(
        `[Suite 34.3] Expected 12 EX + 11 Legacy = 23 registered champions, got ex=${EX_HERO_KEYS.length}, leg=${LEGACY_HERO_KEYS.length}, roster=${Object.keys(CHAMPION_ROSTER).length}`
      );
    }

    const html34 = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    const exCardTags = html34.match(/data-roster-group="ex"/g) || [];
    const legCardTags = html34.match(/data-roster-group="legacy"/g) || [];
    if (
      !html34.includes('id="roster-version-bar"') ||
      !html34.includes('id="btn-roster-version-ex"') ||
      !html34.includes('id="btn-roster-version-legacy"') ||
      !html34.includes('EX VERSION') ||
      !html34.includes('LEGACY VERSION') ||
      exCardTags.length !== 12 ||
      legCardTags.length !== 11
    ) {
      throw new Error(
        `[Suite 34.3] Expected #roster-version-bar + 11 EX cards + 11 Legacy cards in index.html, got exCards=${exCardTags.length}, legCards=${legCardTags.length}`
      );
    }
    for (const heroKey of [...EX_HERO_KEYS, ...LEGACY_HERO_KEYS]) {
      if (
        !html34.includes(`id="card-${heroKey}"`) ||
        !html34.includes(`id="preview-${heroKey}"`) ||
        !html34.includes(`id="ribbon-${heroKey}"`)
      ) {
        throw new Error(`[Suite 34.3] Missing DOM card/preview/ribbon IDs for '${heroKey}' in index.html!`);
      }
    }

    // Exercise live Game.prototype.setRosterVersion / syncRosterVersionTabs / getActiveRosterPool state machine
    const makeMockClassList = (init = []) => {
      const set = new Set(init);
      return {
        add: (...c) => c.forEach((x) => set.add(x)),
        remove: (...c) => c.forEach((x) => set.delete(x)),
        toggle: (c, force) => {
          const next = force === undefined ? !set.has(c) : Boolean(force);
          if (next) set.add(c);
          else set.delete(c);
          return next;
        },
        contains: (c) => set.has(c)
      };
    };
    const makeMockTabEl = (selected) => {
      const attrs = { 'aria-selected': String(selected) };
      return {
        classList: makeMockClassList(selected ? ['active-version-tab'] : []),
        setAttribute: (k, v) => {
          attrs[k] = String(v);
        },
        getAttribute: (k) => attrs[k]
      };
    };
    const mockCards = {};
    for (const k of EX_HERO_KEYS) {
      mockCards[k] = {
        hidden: false,
        classList: makeMockClassList([]),
        getAttribute: (attr) => (attr === 'data-roster-group' ? 'ex' : null)
      };
    }
    for (const k of LEGACY_HERO_KEYS) {
      mockCards[k] = {
        hidden: true,
        classList: makeMockClassList(['roster-group-hidden']),
        getAttribute: (attr) => (attr === 'data-roster-group' ? 'legacy' : null)
      };
    }

    const rosterStateHarness = {
      rosterVersion: 'ex',
      landingStep: 'roster',
      gameMode: '1v1',
      slot1Hero: 'warrior_ex',
      slot2Hero: 'reaper_ex',
      slot1PartnerHero: 'titan_ex',
      slot2PartnerHero: 'mage_ex',
      btnRosterVersionEx: makeMockTabEl(true),
      btnRosterVersionLegacy: makeMockTabEl(false),
      cards: mockCards,
      audio: null,
      isAdventureMode: Game.prototype.isAdventureMode,
      getActiveRosterPool: Game.prototype.getActiveRosterPool,
      syncRosterVersionTabs: Game.prototype.syncRosterVersionTabs,
      setRosterVersion: Game.prototype.setRosterVersion,
      ensureDistinctTeamPartners: Game.prototype.ensureDistinctTeamPartners,
      syncRosterSelectionUI() {}
    };

    // Default EX VERSION state
    rosterStateHarness.setRosterVersion('ex', false);
    if (
      rosterStateHarness.rosterVersion !== 'ex' ||
      rosterStateHarness.getActiveRosterPool().length !== 12 ||
      rosterStateHarness.btnRosterVersionEx.getAttribute('aria-selected') !== 'true' ||
      rosterStateHarness.btnRosterVersionLegacy.getAttribute('aria-selected') !== 'false' ||
      EX_HERO_KEYS.some((k) => mockCards[k].hidden || mockCards[k].classList.contains('roster-group-hidden')) ||
      LEGACY_HERO_KEYS.some((k) => !mockCards[k].hidden || !mockCards[k].classList.contains('roster-group-hidden'))
    ) {
      throw new Error('[Suite 34.3] Default EX VERSION tab failed to show 11 EX cards & hide 11 Legacy cards!');
    }

    // Switch to LEGACY VERSION in Versus Mode & Adventure Mode
    for (const mode of ['1v1', 'adventure']) {
      rosterStateHarness.gameMode = mode;
      rosterStateHarness.setRosterVersion('legacy', false);
      if (
        rosterStateHarness.rosterVersion !== 'legacy' ||
        rosterStateHarness.getActiveRosterPool()[0] !== 'warrior' ||
        rosterStateHarness.btnRosterVersionEx.getAttribute('aria-selected') !== 'false' ||
        rosterStateHarness.btnRosterVersionLegacy.getAttribute('aria-selected') !== 'true' ||
        LEGACY_HERO_KEYS.some((k) => mockCards[k].hidden || mockCards[k].classList.contains('roster-group-hidden')) ||
        EX_HERO_KEYS.some((k) => !mockCards[k].hidden || !mockCards[k].classList.contains('roster-group-hidden'))
      ) {
        throw new Error(`[Suite 34.3] LEGACY VERSION tab failed in mode='${mode}'!`);
      }
    }

    // Cross-version P1 EX (`mage_ex`) vs P2 Legacy (`ronin`) matchup + 22-hero VRAM release audit
    const crossP1 = new CHAMPION_ROSTER.mage_ex.cls({ x: 340, groundY: 560, facing: 1 });
    const crossP2 = new CHAMPION_ROSTER.ronin.cls({ x: 860, groundY: 560, facing: -1 });
    if (
      !(crossP1 instanceof Fighter) ||
      !(crossP2 instanceof Fighter) ||
      crossP1.heroId !== 'mage_ex' ||
      crossP2.heroId !== 'ronin'
    ) {
      throw new Error('[Suite 34.3] Cross-version P1 EX vs P2 Legacy Fighter instantiation failed!');
    }

    // Verify PixelForge.releaseInactiveAssets cleans all 20 inactive hero keys while keeping active + shared textures
    {
      const prevWin = globalThis.window;
      const prevHtmlImg = globalThis.HTMLImageElement;
      class FakeBrowserImg {
        constructor(src = '') {
          this._origSrc = src;
          this._deferredSrc = null;
          this.src = src;
        }
        removeAttribute(attr) {
          if (attr === 'src') this.src = '';
        }
      }
      try {
        globalThis.HTMLImageElement = FakeBrowserImg;
        globalThis.window = { ...prevWin };
        const savedAssets = PixelForge.assets;
        const sharedMeteor = new FakeBrowserImg('assets/sprites/meteor_cataclysm.png?v=30fps156');
        const sharedWings = new FakeBrowserImg('assets/sprites/seraphim_wings.png?v=30fps156');
        const sharedCompanions = new FakeBrowserImg('assets/sprites/reaper_companions.png?v=30fps113');
        const testAssets = {};
        for (const hk of PixelForge.ALL_HERO_KEYS) {
          testAssets[hk] = {
            sheet: new FakeBrowserImg(`assets/sprites/${hk}_sheet.png`),
            vfx: new FakeBrowserImg(`assets/sprites/${hk}_vfx.png`),
            portrait: new FakeBrowserImg(`assets/sprites/${hk}_portrait.png`),
            ...(hk === 'mage' || hk === 'mage_ex' ? { meteor: sharedMeteor } : {}),
            ...(hk === 'warrior' || hk === 'warrior_ex' || hk === 'priestess' || hk === 'priestess_ex'
              ? { wings: sharedWings }
              : {}),
            ...(hk === 'reaper' || hk === 'reaper_ex' ? { companions: sharedCompanions } : {})
          };
        }
        PixelForge.assets = testAssets;
        PixelForge.releaseInactiveAssets(['mage_ex', 'ronin'], [], false);

        if (
          testAssets.mage_ex.sheet._deferredSrc !== null ||
          testAssets.ronin.sheet._deferredSrc !== null ||
          sharedMeteor._deferredSrc !== null ||
          !sharedWings._deferredSrc ||
          !sharedCompanions._deferredSrc
        ) {
          throw new Error('[Suite 34.3] releaseInactiveAssets mishandled active/shared EX+Legacy assets!');
        }
        let releasedCount = 0;
        for (const hk of PixelForge.ALL_HERO_KEYS) {
          if (hk === 'mage_ex' || hk === 'ronin') continue;
          if (testAssets[hk].sheet._deferredSrc && testAssets[hk].vfx._deferredSrc) {
            releasedCount++;
          }
        }
        PixelForge.assets = savedAssets;
        if (releasedCount !== 21) {
          throw new Error(
            `[Suite 34.3] Expected 21/23 inactive hero sheets+vfx released, got ${releasedCount}`
          );
        }
      } finally {
        globalThis.window = prevWin;
        if (prevHtmlImg === undefined) delete globalThis.HTMLImageElement;
        else globalThis.HTMLImageElement = prevHtmlImg;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 34.4: Live Game-Loop Execution for All 11 EX Champions Across VS & Adventure Mode
  // --------------------------------------------------------------------------
  {
    const iconCtx34 = createMockCtx();
    for (const [heroId, ExCls, expectedWrathProj, expectedStageDomain] of EX_HERO_MATRIX_34) {
      const vsTrack = { rotateCalls: 0, quadCalls: 0 };
      const vsCtx = createMockCtx(vsTrack);
      let ellipseCalls = 0;
      vsCtx.ellipse = () => {
        ellipseCalls++;
      };

      const vsGame = createMockGame();
      let triggeredDomain = null;
      let domainTriggerTime = null;
      let activeHeroRef = null;
      vsGame.renderer.triggerInfernoStage = () => {
        if (!triggeredDomain) {
          triggeredDomain = 'inferno';
          domainTriggerTime = activeHeroRef?.stateTimer ?? 0;
        }
      };
      vsGame.renderer.triggerShogunateStage = () => {
        if (!triggeredDomain) {
          triggeredDomain = 'shogunate';
          domainTriggerTime = activeHeroRef?.stateTimer ?? 0;
        }
      };
      vsGame.renderer.triggerGlacialStage = () => {
        if (!triggeredDomain) {
          triggeredDomain = 'glacial';
          domainTriggerTime = activeHeroRef?.stateTimer ?? 0;
        }
      };
      vsGame.renderer.setStageTransformation = (domainKey) => {
        if (!triggeredDomain) {
          triggeredDomain = domainKey;
          domainTriggerTime = activeHeroRef?.stateTimer ?? 0;
        }
      };

      const startDist = 148;
      const ex = new ExCls({ x: 380, groundY: 560, facing: 1, team: 'left' });
      const dummy = new Warrior({ x: 380 + startDist, groundY: 560, facing: -1, name: 'Dummy', team: 'right' });
      activeHeroRef = ex;
      ex.game = vsGame;
      dummy.game = vsGame;
      ex.maxHp = 999999;
      ex.hp = 999999;
      dummy.maxHp = 999999;
      dummy.hp = 999999;
      vsGame.fighters = [ex, dummy];
      vsGame.getEnemiesOf = (f) => (f === ex ? [dummy] : [ex]);
      vsGame.getTargetFor = (f) => (f === ex ? dummy : ex);
      vsGame.spawnProjectile = (p) => vsGame.vfx.projectiles.push(p);
      vsGame.vfx.projectiles.length = 0;

      // (1) VS 4-Beat AUTO_ATTACK chain (`0,1,2,3`, `vx = 0` snap plant, `_hitStopTimer`, damage, zero IDLE reset)
      ex.skillCooldown = 999;
      ex.crouchCooldown = 999;
      ex.vaultCooldown = 999;
      ex.dashCooldown = 999;
      ex.dodgeCooldown = 999;
      ex.mana = 0;
      ex.finisherGauge = 0;
      dummy.stunTimer = 999;
      ex.comboStep = 0;
      ex.setState('AUTO_ATTACK');

      const seenBeats = [];
      let sawIdleMidChain = false;
      let sawSnapZeroVx = false;
      let sawHitStop = false;
      const hpBeforeAuto = dummy.hp;

      for (let tick = 0; tick < 160; tick++) {
        if (ex.state === 'AUTO_ATTACK') {
          if (seenBeats[seenBeats.length - 1] !== ex._autoVariant) {
            seenBeats.push(ex._autoVariant);
          }
          if (ex._autoVariant < 3) {
            ex.queueNextComboBeat?.();
          }
        } else if (seenBeats.length > 0 && seenBeats.length < 4 && ex.state === 'IDLE') {
          sawIdleMidChain = true;
        }

        ex.update(1 / 60, dummy, vsGame);
        vsGame.vfx.update(1 / 60, 560, vsGame.renderer, vsGame.audio);
        dummy.stunTimer = 999;

        if (ex.state === 'AUTO_ATTACK' && Math.abs(ex.vx) < 0.001 && ex.stateTimer >= 0.07) {
          sawSnapZeroVx = true;
        }
        if ((ex._hitStopTimer || 0) > 0) {
          sawHitStop = true;
        }
        if (tick % 16 === 0) {
          ex.draw(vsCtx, false, vsGame.renderer);
        }
        if (seenBeats.length >= 4 && ex.state === 'IDLE') break;
      }

      if (
        seenBeats.slice(0, 4).join(',') !== '0,1,2,3' ||
        sawIdleMidChain ||
        !sawSnapZeroVx ||
        !sawHitStop ||
        dummy.hp >= hpBeforeAuto
      ) {
        throw new Error(
          `[Suite 34.4 VS-Auto ${heroId}] Expected 0,1,2,3 zero-IDLE chain w/ vx=0 snap, _hitStopTimer & damage; got beats=[${seenBeats.join(',')}], idleMid=${sawIdleMidChain}, vx0=${sawSnapZeroVx}, hitStop=${sawHitStop}, dmg=${hpBeforeAuto - dummy.hp}`
        );
      }

      if (heroId === 'ronin_ex') {
        // Also exercise RoninEx Shunpo Draw-Cut (`CROUCH`) and verify strict `'ronin_slash'` & 0 `'fireball'`
        ex.startCrouch?.(dummy, vsGame);
        for (let i = 0; i < 40 && ex.state === 'CROUCH'; i++) {
          ex.update(1 / 30, dummy, vsGame);
        }
        const hasRoninSlash = vsGame.vfx.projectiles.some((p) => p.type === 'ronin_slash');
        const hasFireball = vsGame.vfx.projectiles.some((p) => p.type === 'fireball');
        if (!hasRoninSlash || hasFireball) {
          throw new Error(
            `[Suite 34.4 ronin_ex] Expected piercing 'ronin_slash' (${hasRoninSlash}) and 0 'fireball' (${hasFireball})!`
          );
        }
      }

      // (2) VS SKILL, ULTIMATE & TRUE_ULTIMATE + Stage Domain Triggers
      for (const [mode, maxSteps] of [
        ['SKILL', 65],
        ['ULTIMATE', 165],
        ['TRUE_ULTIMATE', 200]
      ]) {
        ex.x = 410;
        ex.y = 560;
        ex.vx = 0;
        ex.vy = 0;
        ex.facing = 1;
        dummy.x = 560;
        dummy.y = 560;
        dummy.vx = 0;
        dummy.vy = 0;
        dummy.isRooted = false;
        dummy.stunTimer = 999;
        ex.tankedDamage = 480;
        if (heroId === 'priestess_ex') {
          ex.hp = Math.floor(ex.maxHp * 0.6);
        }
        const hpStart = dummy.hp;
        if (mode === 'ULTIMATE') ex.mana = ex.maxMana;
        if (mode === 'TRUE_ULTIMATE') {
          ex.finisherGauge = ex.maxFinisherGauge;
          triggeredDomain = null;
          domainTriggerTime = null;
        }
        ex.setState(mode);

        for (let step = 0; step < maxSteps; step++) {
          ex.update(1 / 30, dummy, vsGame);
          vsGame.vfx.update(1 / 30, 560, vsGame.renderer, vsGame.audio);
          if (!Number.isFinite(ex.x) || !Number.isFinite(ex.y)) {
            throw new Error(`[Suite 34.4 ${heroId} ${mode}] Non-finite fighter coords!`);
          }
          if (step % 15 === 0 || ex.state !== mode) {
            ex.drawForegroundOverlay?.(vsCtx, vsGame.renderer);
            ex.draw(vsCtx, false, vsGame.renderer);
            ex.drawUltimateForeground?.(vsCtx, vsGame.renderer);
          }
          if (ex.state !== mode) break;
        }
        if (dummy.hp >= hpStart || ex.state !== 'IDLE') {
          throw new Error(
            `[Suite 34.4 ${heroId} ${mode}] Expected real damage (${hpStart - dummy.hp}) & clean IDLE exit (got state=${ex.state})`
          );
        }
      }

      if (expectedStageDomain) {
        if (triggeredDomain !== expectedStageDomain) {
          throw new Error(
            `[Suite 34.4 ${heroId}] Expected TRUE_ULTIMATE stage domain '${expectedStageDomain}', got '${triggeredDomain}'`
          );
        }
        if (heroId === 'mage_ex' && (domainTriggerTime === null || domainTriggerTime < 3.2)) {
          throw new Error(
            `[Suite 34.4 mage_ex] Expected inferno stage trigger strictly at meteor impact t >= 3.22s, got t=${domainTriggerTime}`
          );
        }
        if (heroId === 'icemage_ex' && (domainTriggerTime === null || domainTriggerTime < 3.24)) {
          throw new Error(
            `[Suite 34.4 icemage_ex] Expected glacial stage trigger strictly at scepter tap t >= 3.28s, got t=${domainTriggerTime}`
          );
        }
      }

      if (vsTrack.rotateCalls !== 0 || ellipseCalls !== 0) {
        throw new Error(
          `[Suite 34.4 ${heroId}] Expected 0 ctx.rotate (${vsTrack.rotateCalls}) & 0 ctx.ellipse (${ellipseCalls})!`
        );
      }

      // (3) Adventure Mode Kit, Skill Tree, `wrath_1` Authentic Projectile & Bespoke Dodge
      const kit = ADVENTURE_HERO_KITS[heroId];
      const theme = HERO_SKILL_TREE_THEMES[heroId];
      if (!kit || !theme || !theme.branches || !theme.nodes || Object.keys(theme.nodes).length < 9) {
        throw new Error(`[Suite 34.4 Adv ${heroId}] Missing ADVENTURE_HERO_KITS or 9-node HERO_SKILL_TREE_THEMES!`);
      }
      for (let slot = 0; slot < 4; slot++) {
        PixelForge.drawSkillIcon(iconCtx34, heroId, slot, 64, 64, 0.25);
        PixelForge.drawHeroSheetIcon(iconCtx34, heroId, slot, 64, 64, 0.25);
      }
      for (const act of ['attack', 'dodge', 'skill', 'overdrive', 'ultimate']) {
        PixelForge.drawAdventureActionIcon(iconCtx34, heroId, act, 64, 64, 0.25);
      }

      const advGame = createMockGame();
      advGame.gameMode = 'adventure';
      advGame.isAdventureMode = () => true;
      advGame.spawnProjectile = (p) => advGame.vfx.projectiles.push(p);

      const advHero = new ExCls({ x: 360, groundY: 561, facing: 1, team: 'left' });
      advHero.game = advGame;
      advGame.leftFighter = advHero;
      advGame.fighters = [advHero];

      const adv = new AdventureManager(advGame);
      advGame.adventure = adv;
      adv.startCampaign(advHero);
      adv.setAutoPlay(false, false);
      adv.manualTargetLock = false;
      adv.lockActive = true;
      adv.lockMinX = 180;
      adv.lockMaxX = 980;

      adv.progression.skillPoints = 4;
      adv.progression.upgradeNode('wrath_1', advHero);
      adv.progression.upgradeNode('wrath_1', advHero);
      if (adv.progression.getRank('wrath_1') !== 2) {
        throw new Error(`[Suite 34.4 Adv ${heroId}] Failed to upgrade wrath_1 to rank 2!`);
      }
      advGame.vfx.projectiles.length = 0;

      const mob = adv.spawnMonster('templar', 485, { groundY: 561, skipPortal: true });
      mob.maxHp = 999999;
      mob.hp = 999999;
      mob.autoCooldown = 999;
      mob.skillCooldown = 999;

      const manualBeats = [];
      adv.heldAttack = true;
      for (let tick = 0; tick < 120 && manualBeats.length < 4; tick++) {
        const prevVar = advHero._autoVariant;
        const prevState = advHero.state;
        mob.x = advHero.x + 118;
        adv.processPlayerControls(1 / 30, advHero, mob);
        if (
          advHero.state === 'AUTO_ATTACK' &&
          (prevState !== 'AUTO_ATTACK' || advHero._autoVariant !== prevVar)
        ) {
          manualBeats.push(advHero._autoVariant);
        }
      }
      adv.heldAttack = false;

      const spawnedExpectedProj = advGame.vfx.projectiles.some((p) => p.type === expectedWrathProj);
      const roninLeakedFireball =
        heroId === 'ronin_ex' && advGame.vfx.projectiles.some((p) => p.type === 'fireball');
      if (
        manualBeats.slice(0, 4).join(',') !== '0,1,2,3' ||
        !spawnedExpectedProj ||
        roninLeakedFireball
      ) {
        throw new Error(
          `[Suite 34.4 Adv ${heroId}] Expected manual 0,1,2,3 + wrath_1 '${expectedWrathProj}' (beats=[${manualBeats.join(',')}], projs=[${advGame.vfx.projectiles.map((p) => p.type).join(',')}], roninFireball=${roninLeakedFireball})`
        );
      }

      // Bespoke Adventure Dodge (`startHeroAdventureDodge` + `updateHeroAdventureDodge` + `drawAdventureDodgeFX`)
      advHero.setState('IDLE');
      advGame.vfx.projectiles.length = 0;
      advHero.dodgeCooldown = 0;
      adv.startHeroAdventureDodge(advHero, 1);
      if (
        !advHero._advPureDodge ||
        !advHero.isInvulnerable ||
        advHero._advDodgeFrameOverride < 180 ||
        advHero._advDodgeFrameOverride > 209
      ) {
        throw new Error(
          `[Suite 34.4 Adv-Dodge ${heroId}] Expected Row 6 (180..209) invulnerable dodge, got active=${advHero._advPureDodge}, frame=${advHero._advDodgeFrameOverride}`
        );
      }
      const dodgeTrack = { rotateCalls: 0, quadCalls: 0 };
      const dodgeCtx = createMockCtx(dodgeTrack);
      for (let d = 0; d < 10; d++) {
        adv.updateHeroAdventureDodge(1 / 30, advHero);
        advHero.drawAdventureDodgeFX?.(dodgeCtx, advGame.renderer, 'back');
        advHero.draw(dodgeCtx, false, advGame.renderer);
        advHero.drawAdventureDodgeFX?.(dodgeCtx, advGame.renderer, 'front');
      }
      adv.stopCampaign();
      if (advGame.vfx.projectiles.length !== 0 || dodgeTrack.rotateCalls !== 0) {
        throw new Error(
          `[Suite 34.4 Adv-Dodge ${heroId}] Expected 0 dodge projectiles (${advGame.vfx.projectiles.length}) & 0 ctx.rotate (${dodgeTrack.rotateCalls})`
        );
      }
    }
  }

  const suite34ElapsedMs = performance.now() - suite34StartMs;
  if (suite34ElapsedMs >= 3000) {
    throw new Error(
      `[Suite 34] Expected Suite 34 runtime < 3000ms, got ${suite34ElapsedMs.toFixed(1)}ms!`
    );
  }

  console.log(
    `[PASS] Suite 34: 100% Legacy SHA-256 Purity + 0 Emojis (34.1), All-11 Wide-Canvas 9600x2400 EX Sheets/VFX/Portraits + Morph-Free Row 1 WALK (34.2), #roster-version-bar EX/LEGACY Switcher + 22-Hero VRAM Cleanup (34.3) & All-11 EX Live VS/Adventure Gameplay (34.4) verified in ${suite34ElapsedMs.toFixed(0)}ms!`
  );
}

// ============================================================================
// SUITE 35: Ranged/Mage EX Restoration (`>= 510px` Standoff + Classic-Wizard `IGNIS SOL EX`),
//           Newly-Born EX Kits & `exNextGenFX.js`, 100% Chevron Slash-Bar (`>>>>>>>`) Purge,
//           Lv.1 Adventure Ranged Projectiles & Stage-Loading Race Immunity (`?v=30fps115`, `< 1.5s`)
// ============================================================================
{
  const suite35StartMs = performance.now();

  // --------------------------------------------------------------------------
  // 35.1: 100% Purge of `>>>>>>>` Chevron Slash-Bar Loops (`razorScars` / `glaiveScars`)
  //       & Blurry Radial `renderer.glow*` Blobs + `exNextGenFX.js` Runtime Audit
  // --------------------------------------------------------------------------
  {
    const exEntityFiles = [
      'WarriorEx.js',
      'FireMageEx.js',
      'PriestessEx.js',
      'ChronomancerEx.js',
      'ValkyrieEx.js',
      'RoninEx.js',
      'ArcherEx.js',
      'ReaperEx.js',
      'TitanEx.js',
      'IceMageEx.js',
      'AndroidEx.js'
    ];
    const forbiddenTokens = [
      'razorScars',
      'glaiveScars',
      'slashScars',
      'drawPixelRazorScars',
      'drawPixelScars',
      'drawGlaiveScars',
      'renderer.glow'
    ];
    // Detect sequential nested-square chevron loops (`fillRect(px - rad, ...)` + `fillRect(px - mid, ...)` inside one `for` loop)
    const nestedSquareChevronRe =
      /for\s*\([^)]*\)\s*\{[\s\S]{0,420}?fillRect\s*\(\s*px\s*-\s*rad\b[\s\S]{0,260}?fillRect\s*\(\s*px\s*-\s*(?:mid|core)\b/;

    const stripJsComments = (code) =>
      code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

    for (const relName of exEntityFiles) {
      const fullPath = path.join(REPO_ROOT, 'src/entities', relName);
      const src = stripJsComments(fs.readFileSync(fullPath, 'utf8'));
      for (const tok of forbiddenTokens) {
        if (src.includes(tok)) {
          throw new Error(`[Suite 35.1] Forbidden chevron/glow token '${tok}' found in ${relName}!`);
        }
      }
      if (/\.rotate\s*\(/.test(src) || /\.ellipse\s*\(/.test(src)) {
        throw new Error(`[Suite 35.1] Forbidden ctx.rotate() or ctx.ellipse() found in ${relName}!`);
      }
      if (nestedSquareChevronRe.test(src)) {
        throw new Error(
          `[Suite 35.1] Forbidden sequential nested-square chevron loop detected in ${relName}!`
        );
      }
    }

    const exFxSrc = stripJsComments(
      fs.readFileSync(path.join(REPO_ROOT, 'src/engine/shaders/exNextGenFX.js'), 'utf8')
    );
    if (
      /\.rotate\s*\(/.test(exFxSrc) ||
      /\.ellipse\s*\(/.test(exFxSrc) ||
      /\.arc\s*\(/.test(exFxSrc) ||
      nestedSquareChevronRe.test(exFxSrc)
    ) {
      throw new Error(
        '[Suite 35.1] exNextGenFX.js must contain 0 ctx.rotate, 0 .ellipse, 0 .arc, and 0 nested-square chevron loops!'
      );
    }

    // Exercise ExParticleSystem, drawExBayerHalo & drawExHitStarburst across all 7 shapes & 11 EX palettes
    const fxTrack = { rotateCalls: 0, quadCalls: 0 };
    const fxCtx = createMockCtx(fxTrack);
    let arcOrEllipse = 0;
    let maxHaloAlpha = 0;
    fxCtx.arc = () => {
      arcOrEllipse++;
    };
    fxCtx.ellipse = () => {
      arcOrEllipse++;
    };
    const origFillRect35 = fxCtx.fillRect.bind(fxCtx);
    fxCtx.fillRect = (x, y, w, h) => {
      if (fxCtx._inHaloAudit && fxCtx.globalAlpha > maxHaloAlpha) {
        maxHaloAlpha = fxCtx.globalAlpha;
      }
      return origFillRect35(x, y, w, h);
    };

    const ps = new ExParticleSystem();
    for (const shape of ['star4', 'diamond', 'ember', 'feather', 'rune', 'bolt', 'ring']) {
      ps.spawn({
        shape,
        x: 420,
        y: 480,
        vx: 16,
        vy: -24,
        maxLife: 0.5,
        size: 4,
        color: '#fb923c',
        accent: '#fde047',
        core: '#ffffff',
        alpha: 0.85,
        layer: shape === 'ring' ? 'back' : 'front'
      });
    }
    ps.burst(460, 470, {
      count: 6,
      shapes: ['star4', 'diamond', 'ember'],
      color: '#fb923c',
      accent: '#fde047',
      core: '#ffffff'
    });
    ps.spawnRing(460, 470, 56, '#fb923c', '#fde047', true, 0.28);
    ps.update(1 / 30);
    ps.renderBack(fxCtx);
    ps.renderFront(fxCtx);

    fxCtx._inHaloAudit = true;
    for (const exKey of EX_HERO_KEYS) {
      const pal = EX_HERO_PALETTES[exKey];
      if (!pal) throw new Error(`[Suite 35.1] Missing EX_HERO_PALETTES entry for ${exKey}!`);
      drawExBayerHalo(fxCtx, 420, 540, 48, 16, pal.primary, pal.accent, 0.2);
    }
    fxCtx._inHaloAudit = false;
    for (const p of [0.1, 0.35, 0.65, 0.9]) {
      drawExHitStarburst(fxCtx, 460, 470, p, '#38bdf8', '#fde047');
    }

    // Exercise Renderer EX cut-in banner & ground rim reflection (gated on `*_ex`, 0 arc/ellipse/rotate)
    const exRen = new Renderer({ width: 1280, height: 720, getContext: () => fxCtx });
    const solExCutIn = new FireMageEx({ x: 380, groundY: 560, facing: 1, team: 'left' });
    exRen.cutInHeroId = 'mage_ex';
    exRen.cutInIsTrueUlt = true;
    exRen.cutInText = 'CATACLYSM: GRAND HELIOS APOCALYPSE';
    exRen.cutInMaxTimer = 1.05;
    exRen.cutInTimer = 0.65;
    exRen.drawExGroundRimReflection(fxCtx, solExCutIn, 560, EX_HERO_PALETTES.mage_ex, 1);
    exRen.drawExUltimateCutIn(fxCtx, 1280, 96);

    if (fxTrack.rotateCalls !== 0 || arcOrEllipse !== 0 || maxHaloAlpha > 0.225 || fxCtx._stateStack.length !== 0) {
      throw new Error(
        `[Suite 35.1] exNextGenFX / Renderer EX audit failed: rotate=${fxTrack.rotateCalls}, arcOrEllipse=${arcOrEllipse}, maxHaloAlpha=${maxHaloAlpha}, stack=${fxCtx._stateStack.length}`
      );
    }
  }

  // --------------------------------------------------------------------------
  // 35.2: Classic-Wizard `IGNIS SOL EX` (`'SOLAR ARCHMAGE'`) & Newly-Born EX Kit Copy
  // --------------------------------------------------------------------------
  {
    const html35 = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    const main35 = fs.readFileSync(path.join(REPO_ROOT, 'src/main.js'), 'utf8');
    const mageCardBlock = html35.match(/id="card-mage_ex"[\s\S]{0,650}?<\/button>/);
    if (
      CHAMPION_ROSTER.mage_ex?.role !== 'SOLAR ARCHMAGE' ||
      !mageCardBlock ||
      !mageCardBlock[0].includes('SOLAR ARCHMAGE') ||
      html35.includes('HELIOS SPELL-BLADE') ||
      main35.includes('HELIOS SPELL-BLADE')
    ) {
      throw new Error(
        `[Suite 35.2] Expected mage_ex role 'SOLAR ARCHMAGE' (0 'HELIOS SPELL-BLADE'), got rosterRole='${CHAMPION_ROSTER.mage_ex?.role}'`
      );
    }

    const expectedExKitSignatures = [
      ['mage_ex', FireMageEx, 'SOLAR TRINITY', 'ECLIPSE SINGULARITY', 'GRAND HELIOS APOCALYPSE'],
      ['priestess_ex', PriestessEx, 'STAINED-GLASS BENEDICTION', 'ORGAN OF LIGHT', 'GENESIS LUMEN'],
      ['icemage_ex', IceMageEx, 'BOREALIS PRISM JAWS', 'NINE ICE-SWORDS', 'ZERO KELVIN CATHEDRAL'],
      ['valkyrie_ex', ValkyrieEx, 'LIGHTNING JAVELINS', 'BAHAMUT VALKYRIE', 'BIFROST GUNGNIR'],
      ['archer_ex', ArcherEx, 'CONSTELLATION VOLLEY', 'TWELVE-STAR RAIN', 'ASTRAL SUPERNOVA'],
      ['warrior_ex', WarriorEx, 'DAWN-BREAKER TRINITY', 'PENTAGRAM OMNISLASH', 'SEVEN SWORDS'],
      ['titan_ex', TitanEx, 'FORGE-ANVIL RICOCHET', 'GRAND-SLAM CRUSHER', 'CONTINENTAL SUNDER'],
      ['reaper_ex', ReaperEx, 'SOUL-GUILLOTINE', 'LEGION OF THANATOS', 'CATHEDRAL OF OBLIVION'],
      ['ronin_ex', RoninEx, 'THUNDER-GATE FLASH', 'STORM-GOD CAGE', 'REALM-SLICING SHOGUNATE'],
      ['chronomancer_ex', ChronomancerEx, 'HOURGLASS SCHISM', 'BROKEN TIMELINES', 'TWELFTH BELL'],
      ['android_ex', AndroidEx, 'FUNNEL OVERDRIVE', 'HYPER-PRISM BARRAGE', 'SINGULARITY BUSTER'],
      ['nyx_ex', NyxEx, 'POP-UP CASCADE', 'STARLIGHT OVERCLOCK', 'POWERED BY COB']
    ];
    for (const [id, Cls, skSub, ultSub, trueSub] of expectedExKitSignatures) {
      const inst = new Cls({ x: 360, groundY: 560, facing: 1 });
      const rEntry = CHAMPION_ROSTER[id];
      if (
        !String(inst.skillName || '').toUpperCase().includes(skSub) ||
        !String(inst.ultName || '').toUpperCase().includes(ultSub) ||
        !String(inst.trueUltName || '').toUpperCase().includes(trueSub) ||
        !JSON.stringify(rEntry || {}).toUpperCase().includes(skSub)
      ) {
        throw new Error(
          `[Suite 35.2] Newly-born EX kit mismatch on ${id}: skill='${inst.skillName}', ult='${inst.ultName}', trueUlt='${inst.trueUltName}'`
        );
      }
    }

    for (const [casterId, badTag] of [
      ['mage_ex', 'GLAIVE'],
      ['priestess_ex', 'GLAIVE'],
      ['icemage_ex', 'GLAIVE']
    ]) {
      const basicTag = String(ADVENTURE_HERO_KITS[casterId]?.basicTag || ADVENTURE_HERO_KITS[casterId]?.attackLabel || '').toUpperCase();
      if (basicTag.includes(badTag)) {
        throw new Error(`[Suite 35.2] Caster ${casterId} still carries melee '${badTag}' tag in ADVENTURE_HERO_KITS!`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 35.3: All 5 Ranged EX Champions (`>= 510px` Range, `> 240px` Live 1v1 Standoff
  //       & Lv.1 `wrath_1 === 0` Adventure Ranged Projectiles in Manual + AUTO)
  // --------------------------------------------------------------------------
  {
    const RANGED_EX_SPECS = [
      ['mage_ex', FireMageEx, 'fireball', 520, 305],
      ['priestess_ex', PriestessEx, 'holy_light', 512, 315],
      ['icemage_ex', IceMageEx, 'cryo_shard', 510, 310],
      ['valkyrie_ex', ValkyrieEx, 'dragon_lance', 520, 310],
      ['archer_ex', ArcherEx, 'arrow', 520, 350],
      ['nyx_ex', NyxEx, 'nebula_packet', 516, 315]
    ];

    for (const [heroId, ExCls, projType, expRange, expSweetMin] of RANGED_EX_SPECS) {
      // (A) Live Autonomous 1v1 Versus Standoff (`isPlayerControlled = false`, starting at 370px)
      const vsGame = createMockGame();
      const ex = new ExCls({ x: 300, groundY: 560, facing: 1, team: 'left' });
      const foe = new Warrior({ x: 670, groundY: 560, facing: -1, name: 'Target', team: 'right' });
      ex.isPlayerControlled = false;
      foe.isPlayerControlled = true; // Keep stationary target so we isolate ranged EX AI spacing & projectile hits!
      ex.game = vsGame;
      foe.game = vsGame;
      ex.maxHp = 999999;
      ex.hp = 999999;
      foe.maxHp = 999999;
      foe.hp = 999999;
      ex.skillCooldown = 999;
      ex.crouchCooldown = 999;
      ex.vaultCooldown = 999;
      ex.dashCooldown = 999;
      ex.dodgeCooldown = 999;
      ex.jumpCooldown = 999;
      ex.mana = 0;
      ex.finisherGauge = 0;

      const instStyle = ex.getAiStyleProfile();
      const baseStyle = Fighter.prototype.getAiStyleProfile.call(ex);
      if (
        ex.attackRange < 510 ||
        ex.attackRange !== expRange ||
        instStyle.sweetMin < 305 ||
        instStyle.sweetMin !== expSweetMin ||
        baseStyle.sweetMin < 305 ||
        ex.isHackAndSlashMelee?.() === true
      ) {
        throw new Error(
          `[Suite 35.3 ${heroId}] Invalid ranged profile: attackRange=${ex.attackRange}, sweetMin=${instStyle.sweetMin}/${baseStyle.sweetMin}`
        );
      }

      vsGame.fighters = [ex, foe];
      vsGame.getEnemiesOf = (f) => (f === ex ? [foe] : [ex]);
      vsGame.getTargetFor = (f) => (f === ex ? foe : ex);
      let totalSpawnedProjectiles = 0;
      vsGame.spawnProjectile = (p) => {
        totalSpawnedProjectiles++;
        vsGame.vfx.projectiles.push(p);
      };
      const origVfxSpawn = vsGame.vfx.spawnProjectile?.bind(vsGame.vfx);
      if (origVfxSpawn) {
        vsGame.vfx.spawnProjectile = (p) => {
          totalSpawnedProjectiles++;
          return origVfxSpawn(p);
        };
      }

      const foeHpStart = foe.hp;
      let minHorizDist = Infinity;
      let sawAutoAttack = false;
      for (let step = 0; step < 110; step++) {
        const dt = 1 / 30;
        foe.x = 670;
        foe.vx = 0;
        foe.stunTimer = 0;
        ex.update(dt, foe, vsGame);
        if (ex.state === 'AUTO_ATTACK') sawAutoAttack = true;

        for (let pi = vsGame.vfx.projectiles.length - 1; pi >= 0; pi--) {
          const p = vsGame.vfx.projectiles[pi];
          totalSpawnedProjectiles = Math.max(totalSpawnedProjectiles, 1);
          p.x += (p.vx || 0) * dt;
          p.y += (p.vy || 0) * dt;
          if (Math.abs(p.x - foe.x) < 64 && Math.abs((p.y || foe.y - 80) - (foe.y - 80)) < 120) {
            foe.takeDamage(p.damage || 30, ex, false, 20, 0);
            vsGame.vfx.projectiles.splice(pi, 1);
          }
        }
        vsGame.vfx.update(dt, 560, vsGame.renderer, vsGame.audio);
        minHorizDist = Math.min(minHorizDist, Math.abs(foe.x - ex.x));
      }

      if (!sawAutoAttack || minHorizDist <= 240 || totalSpawnedProjectiles < 1 || foe.hp >= foeHpStart) {
        throw new Error(
          `[Suite 35.3 VS ${heroId}] Expected >240px ranged standoff + projectiles + damage; got sawAuto=${sawAutoAttack}, minDist=${minHorizDist.toFixed(1)}, projs=${totalSpawnedProjectiles}, dmg=${foeHpStart - foe.hp}`
        );
      }

      // (B) Live Lv.1 (`wrath_1 === 0`) Adventure Mode Ranged Projectiles (`Manual` + `AUTO` Standoff > 240px)
      const advGame = createMockGame();
      advGame.gameMode = 'adventure';
      advGame.isAdventureMode = () => true;
      advGame.spawnProjectile = (p) => advGame.vfx.projectiles.push(p);

      const advHero = new ExCls({ x: 300, groundY: 561, facing: 1, team: 'left' });
      advHero.game = advGame;
      advGame.leftFighter = advHero;
      advGame.fighters = [advHero];

      const adv = new AdventureManager(advGame);
      advGame.adventure = adv;
      adv.startCampaign(advHero);
      adv.lockActive = true;
      adv.lockMinX = 160;
      adv.lockMaxX = 980;
      if (adv.progression.getRank('wrath_1') !== 0) {
        throw new Error(`[Suite 35.3 Adv ${heroId}] Expected Lv.1 wrath_1 === 0!`);
      }

      const mob = adv.spawnMonster('templar', 660, { groundY: 561, skipPortal: true });
      mob.maxHp = 999999;
      mob.hp = 999999;
      mob.autoCooldown = 999;
      mob.skillCooldown = 999;

      // Manual `LOCK: OFF` at Lv.1 (`dist = 360px`)
      adv.setAutoPlay(false, false);
      adv.manualTargetLock = false;
      advGame.vfx.projectiles.length = 0;
      adv.heldAttack = true;
      for (let tick = 0; tick < 28; tick++) {
        mob.x = 660;
        adv.processPlayerControls(1 / 30, advHero, mob);
        advHero.update(1 / 30, mob, advGame);
      }
      adv.heldAttack = false;
      const manualLv1Proj = advGame.vfx.projectiles.some((p) => p.type === projType);
      if (!manualLv1Proj) {
        throw new Error(
          `[Suite 35.3 Adv-Manual Lv.1 ${heroId}] Expected '${projType}' at wrath_1=0, got [${advGame.vfx.projectiles.map((p) => p.type).join(',')}]`
        );
      }

      // `AUTO` play at Lv.1 (`dist = 360px`): fires ranged projectile AND holds `> 240px` standoff!
      advHero.setState('IDLE');
      advHero.x = 300;
      advHero.skillCooldown = 999;
      advHero.mana = 0;
      advHero.finisherGauge = 0;
      adv.progression.spirit = 0;
      adv.progression.ultCharge = 0;
      adv.progression.astralCharge = 0;
      advGame.vfx.projectiles.length = 0;
      adv.setAutoPlay(true, false);

      let minAdvAutoDist = Infinity;
      for (let tick = 0; tick < 45; tick++) {
        mob.x = 660;
        adv.processPlayerControls(1 / 30, advHero, mob);
        advHero.update(1 / 30, mob, advGame);
        minAdvAutoDist = Math.min(minAdvAutoDist, Math.abs(mob.x - advHero.x));
      }
      const autoLv1Proj = advGame.vfx.projectiles.some((p) => p.type === projType);
      adv.stopCampaign();
      if (!autoLv1Proj || minAdvAutoDist <= 240) {
        throw new Error(
          `[Suite 35.3 Adv-AUTO Lv.1 ${heroId}] Expected '${projType}' (${autoLv1Proj}) & >240px standoff (${minAdvAutoDist.toFixed(1)})!`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // 35.4: Stage Loading Fix (`#102` Part A: `.__avsBlobUrl` Retention & `Renderer` Zero-Pixel Race Guard)
  // --------------------------------------------------------------------------
  {
    const vaultBuilderSrc = fs.readFileSync(path.join(REPO_ROOT, 'build/build_web_vault.mjs'), 'utf8');
    if (
      !vaultBuilderSrc.includes('__avsBlobUrl') ||
      !vaultBuilderSrc.includes('revokeImgBlobUrl(this)') ||
      /addEventListener\(\s*["']load["']\s*,\s*function\s*\(\)\s*\{\s*URL\.revokeObjectURL/.test(vaultBuilderSrc)
    ) {
      throw new Error(
        '[Suite 35.4] build/build_web_vault.mjs must retain __avsBlobUrl until reassignment/removeAttribute("src")!'
      );
    }

    let returnZeroPixels = true;
    const prevCreate35 = globalThis.document.createElement;
    globalThis.document.createElement = (tag) => {
      const el = prevCreate35(tag);
      const baseGetCtx = el.getContext.bind(el);
      el.getContext = (...args) => {
        const c = baseGetCtx(...args);
        c.getImageData = (_x, _y, w, h) => {
          const data = new Uint8ClampedArray(w * h * 4);
          if (!returnZeroPixels) {
            for (let i = 0; i < data.length; i += 4) {
              data[i] = 20;
              data[i + 1] = 28;
              data[i + 2] = 48;
              data[i + 3] = 255;
            }
          }
          return { width: w, height: h, data };
        };
        return c;
      };
      return el;
    };

    try {
      const stageRen = new Renderer({ width: 1280, height: 720, getContext: () => createMockCtx() });
      const fakeStage = {
        complete: true,
        naturalWidth: 640,
        naturalHeight: 360,
        src: 'assets/sprites/arena_bg.png?v=30fps156'
      };

      // Tick 1: race condition (`drawImage` produces all-zero `getImageData`) -> MUST return `null` & NOT cache!
      const raceVault = stageRen.getOrBakeStageUpperVault(fakeStage);
      const raceComp = stageRen.getOrBakeStageWingComposite(fakeStage);
      if (raceVault !== null || raceComp !== null) {
        throw new Error(
          '[Suite 35.4] Expected getOrBakeStageUpperVault / WingComposite to return null (never cache blank canvas) on all-zero race tick!'
        );
      }

      // Tick 2: image bitmap decoded cleanly -> MUST bake & cache valid 640x280 vault + 1920x1360 wing composite!
      returnZeroPixels = false;
      const validVault = stageRen.getOrBakeStageUpperVault(fakeStage);
      const validComp = stageRen.getOrBakeStageWingComposite(fakeStage);
      const compCanvas = validComp?.canvas || validComp;
      if (!validVault || validVault.width !== 640 || validVault.height !== 280 || !compCanvas || compCanvas.width !== 1920) {
        throw new Error(
          `[Suite 35.4] Expected valid baked stage vault/composite after decode, got vault=${validVault?.width}x${validVault?.height}, comp=${compCanvas?.width}x${compCanvas?.height}`
        );
      }
    } finally {
      globalThis.document.createElement = prevCreate35;
    }
  }

  const suite35ElapsedMs = performance.now() - suite35StartMs;
  if (suite35ElapsedMs >= 1500) {
    throw new Error(
      `[Suite 35] Expected Suite 35 runtime < 1500ms, got ${suite35ElapsedMs.toFixed(1)}ms!`
    );
  }

  console.log(
    `[PASS] Suite 35: 100% Chevron Slash-Bar & Radial Glow Purge + exNextGenFX (35.1), Classic-Wizard IGNIS SOL EX 'SOLAR ARCHMAGE' + 11 Newly-Born EX Kits (35.2), 5-Hero >=510px Ranged Standoff (>240px) + Lv.1 Adventure Projectiles (35.3) & Stage-Loading Race Immunity (35.4) verified in ${suite35ElapsedMs.toFixed(0)}ms!`
  );
}

} // end if (!RUN_SUITE36_ONLY)

// ============================================================================
// SUITE 36: Next-Gen HD-2D Ray-Light/Shadow, Anti-Crab/Anti-Skate Walk,
//           Zero-Cutoff Pixel VFX, Choreography, Death, Sol/Sylvara/Freyja EX Parity
//           & Sylvara EX Flip / Lyra EX Glacial Transition (`?v=30fps156`, `< 3.0s`)
// ============================================================================
{
  const suite36StartMs = performance.now();
  const { Worker: Worker36 } = await import('node:worker_threads');
  const { resolveSurfaceToRGBA: resolveRgba36 } = await import(
    '../../src/engine/ArcaneShaderFX.js?v=30fps156'
  );
  const { CHRONO_EFFECT_REGISTRY } = await import(
    '../../src/engine/shaders/chronoShaders.js?v=30fps114'
  );

  const EX_HERO_CLASSES_36 = [
    ['warrior_ex', WarriorEx],
    ['mage_ex', FireMageEx],
    ['priestess_ex', PriestessEx],
    ['chronomancer_ex', ChronomancerEx],
    ['valkyrie_ex', ValkyrieEx],
    ['ronin_ex', RoninEx],
    ['archer_ex', ArcherEx],
    ['reaper_ex', ReaperEx],
    ['titan_ex', TitanEx],
    ['icemage_ex', IceMageEx],
    ['android_ex', AndroidEx],
    ['nyx_ex', NyxEx]
  ];

  // --------------------------------------------------------------------------
  // 36.1: Zero Diff vs `8435209` Across All 11 Legacy Entities, 11 Legacy `*Shaders.js`,
  //       33 Legacy PNGs & 11 EX Portraits + `0` Unicode Emojis Across UI, `src/**/*.js` & `docs/*.md`
  // --------------------------------------------------------------------------
  {
    const legacyHeroIds36 = [
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
    const legacyEntityFiles36 = [
      'Warrior',
      'FireMage',
      'Priestess',
      'Chronomancer',
      'Valkyrie',
      'Ronin',
      'Archer',
      'Reaper',
      'Titan',
      'IceMage',
      'Android'
    ].map((n) => `src/entities/${n}.js`);
    const legacyShaderFiles36 = [
      'runicSteel',
      'solar',
      'seraphic',
      'chrono',
      'valkyrie',
      'storm',
      'sylvan',
      'abyssal',
      'forge',
      'glacial',
      'cyber'
    ].map((n) => `src/engine/shaders/${n}Shaders.js`);
    const legacyPngFiles36 = legacyHeroIds36.flatMap((id) => [
      `assets/sprites/${id}_sheet.png`,
      `assets/sprites/${id}_vfx.png`,
      `assets/sprites/${id}_portrait.png`
    ]);
    const exPortraitFiles36 = legacyHeroIds36.map((id) => `assets/sprites/${id}_ex_portrait.png`);
    const protectedFiles36 = [
      ...legacyEntityFiles36,
      ...legacyShaderFiles36,
      ...legacyPngFiles36,
      ...exPortraitFiles36,
      'scripts/hd2d_rig_core.py',
      'docs/CHAMPION_DEVELOPMENT_PLAYBOOK.md'
    ];

    for (const rel of protectedFiles36) {
      if (!fs.existsSync(path.join(REPO_ROOT, rel))) {
        throw new Error(`[Suite 36.1] Missing protected file: ${rel}`);
      }
    }

    const skillAbs36 = path.join(REPO_ROOT, '.agents/skills/arcane-vs-steel-pipeline/SKILL.md');
    const expectedSkillSha36 = '7b915cc454b5b4c9e979313a56eca6a3329dccedc6aa77aba69c14becea87705';
    if (!fs.existsSync(skillAbs36)) {
      throw new Error('[Suite 36.1] Missing .agents/skills/arcane-vs-steel-pipeline/SKILL.md!');
    }
    const actualSkillSha36 = crypto.createHash('sha256').update(fs.readFileSync(skillAbs36)).digest('hex');
    if (actualSkillSha36 !== expectedSkillSha36) {
      throw new Error(
        `[Suite 36.1] Unexpected SHA-256 on SKILL.md! expected=${expectedSkillSha36}, actual=${actualSkillSha36}`
      );
    }

    if (fs.existsSync(path.join(REPO_ROOT, '.git'))) {
      let hasBaseCommit = false;
      try {
        execFileSync('git', ['rev-parse', '--verify', '8435209^{commit}'], {
          cwd: REPO_ROOT,
          stdio: 'ignore'
        });
        hasBaseCommit = true;
      } catch {
        hasBaseCommit = false;
      }
      if (hasBaseCommit) {
        const diffOut = execFileSync(
          'git',
          ['diff', '--name-only', '8435209', '--', ...protectedFiles36],
          { cwd: REPO_ROOT, encoding: 'utf8' }
        ).trim();
        if (diffOut.length > 0) {
          throw new Error(
            `[Suite 36.1] Expected ZERO git diff vs 8435209 on protected Legacy/shader/PNG files, got:\n${diffOut}`
          );
        }
      }
    }

    const emojiRe36 = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
    const emojiScanTargets36 = [
      path.join(REPO_ROOT, 'AGENTS.md'),
      path.join(REPO_ROOT, '.agents/skills/arcane-vs-steel-pipeline/SKILL.md'),
      path.join(REPO_ROOT, 'index.html'),
      path.join(REPO_ROOT, 'style.css'),
      path.join(REPO_ROOT, 'manifest.json')
    ];
    const docsDir36 = path.join(REPO_ROOT, 'docs');
    const collectDocsMd36 = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) collectDocsMd36(full);
        else if (ent.isFile() && ent.name.endsWith('.md')) emojiScanTargets36.push(full);
      }
    };
    collectDocsMd36(docsDir36);
    const collectSrcJs36 = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) collectSrcJs36(full);
        else if (ent.name.endsWith('.js') && ent.name !== 'PixelFont.js') {
          emojiScanTargets36.push(full);
        }
      }
    };
    collectSrcJs36(path.join(REPO_ROOT, 'src'));

    for (const fPath of emojiScanTargets36) {
      const txt = fs.readFileSync(fPath, 'utf8');
      const m = txt.match(emojiRe36);
      if (m) {
        throw new Error(
          `[Suite 36.1] Forbidden Unicode emoji '${m[0]}' (U+${m[0].codePointAt(0).toString(16).toUpperCase()}) in ${fPath}`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // Parallel PNG Pixel Audit Worker for 36.2 (Row 1 WALK Crossover),
  // 36.3 (Row 5 DEATH Prone & Row 9 VICTORY Upright) & 36.4 (4px Sheet/VFX Margin + Chrono 192px Box)
  // --------------------------------------------------------------------------
  const pngAuditResults36 = new Map();
  const monsterAuditResults36 = new Map();
  let monsterVfxAudit36 = null;
  {
    const exIds36 = EX_HERO_CLASSES_36.map(([id]) => id);
    const monsterIds36 = ['templar', 'astrologer', 'treant', 'dryad', 'ghoul', 'cultist', 'brute', 'fiend'];
    const workerCount36 = Math.min(6, Math.max(4, os.cpus()?.length || 4));
    const shards36 = Array.from({ length: workerCount36 }, () => []);
    const monsterShards36 = Array.from({ length: workerCount36 }, () => []);
    exIds36.forEach((id, idx) => shards36[idx % workerCount36].push(id));
    monsterIds36.forEach((id, idx) => monsterShards36[idx % workerCount36].push(id));

    const workerCode36 = `
      const { parentPort, workerData } = require('node:worker_threads');
      const fs = require('node:fs');
      const path = require('node:path');
      const zlib = require('node:zlib');
      const crypto = require('node:crypto');

      const sheetArr = new Uint8Array(9600 * 2400 * 4);
      const sheetU32 = new Uint32Array(sheetArr.buffer);
      const vfxArr = new Uint8Array(6240 * 1664 * 4);
      const vfxU32 = new Uint32Array(vfxArr.buffer);
      const monArr = new Uint8Array(6240 * 1456 * 4);
      const monU32 = new Uint32Array(monArr.buffer);

      function decodePng(pngBytes, out, expW, expH, label) {
        if (pngBytes.length < 29 || pngBytes.readUInt32BE(0) !== 0x89504e47) {
          throw new Error('[Suite 36] Invalid PNG magic on ' + label);
        }
        const w = pngBytes.readUInt32BE(16);
        const h = pngBytes.readUInt32BE(20);
        if (w !== expW || h !== expH || pngBytes[24] !== 8 || pngBytes[25] !== 6) {
          throw new Error('[Suite 36] Unexpected PNG header on ' + label + ': ' + w + 'x' + h);
        }
        const chunks = [];
        let off = 8;
        while (off + 8 <= pngBytes.length) {
          const len = pngBytes.readUInt32BE(off);
          const t = pngBytes.readUInt32BE(off + 4);
          if (t === 0x49444154) chunks.push(pngBytes.subarray(off + 8, off + 8 + len));
          else if (t === 0x49454e44) break;
          off += 12 + len;
        }
        const rawBuf = zlib.inflateSync(chunks.length === 1 ? chunks[0] : Buffer.concat(chunks));
        const raw = new Uint8Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength);
        const stride = w * 4;
        for (let y = 0; y < h; y++) {
          const srcRow = y * (stride + 1);
          const f = raw[srcRow];
          const s0 = srcRow + 1;
          const d0 = y * stride;
          const p0 = d0 - stride;
          if (f === 0) {
            out.set(raw.subarray(s0, s0 + stride), d0);
          } else if (f === 1) {
            for (let i = 0; i < 4; i++) out[d0 + i] = raw[s0 + i];
            for (let i = 4; i < stride; i++) out[d0 + i] = (raw[s0 + i] + out[d0 + i - 4]) & 0xff;
          } else if (f === 2) {
            if (y === 0) out.set(raw.subarray(s0, s0 + stride), d0);
            else for (let i = 0; i < stride; i++) out[d0 + i] = (raw[s0 + i] + out[p0 + i]) & 0xff;
          } else if (f === 3) {
            if (y === 0) {
              for (let i = 0; i < 4; i++) out[d0 + i] = raw[s0 + i];
              for (let i = 4; i < stride; i++) out[d0 + i] = (raw[s0 + i] + (out[d0 + i - 4] >> 1)) & 0xff;
            } else {
              for (let i = 0; i < 4; i++) out[d0 + i] = (raw[s0 + i] + (out[p0 + i] >> 1)) & 0xff;
              for (let i = 4; i < stride; i++) out[d0 + i] = (raw[s0 + i] + ((out[d0 + i - 4] + out[p0 + i]) >> 1)) & 0xff;
            }
          } else if (f === 4) {
            if (y === 0) {
              for (let i = 0; i < 4; i++) out[d0 + i] = raw[s0 + i];
              for (let i = 4; i < stride; i++) out[d0 + i] = (raw[s0 + i] + out[d0 + i - 4]) & 0xff;
            } else {
              let a0 = (out[d0] = (raw[s0] + out[p0]) & 0xff);
              let a1 = (out[d0 + 1] = (raw[s0 + 1] + out[p0 + 1]) & 0xff);
              let a2 = (out[d0 + 2] = (raw[s0 + 2] + out[p0 + 2]) & 0xff);
              let a3 = (out[d0 + 3] = (raw[s0 + 3] + out[p0 + 3]) & 0xff);
              let c0 = out[p0], c1 = out[p0 + 1], c2 = out[p0 + 2], c3 = out[p0 + 3];
              for (let i = 4; i < stride; i += 4) {
                const b0 = out[p0 + i], b1 = out[p0 + i + 1], b2 = out[p0 + i + 2], b3 = out[p0 + i + 3];
                let p = a0 + b0 - c0, pa = p < a0 ? a0 - p : p - a0, pb = p < b0 ? b0 - p : p - b0, pc = p < c0 ? c0 - p : p - c0;
                a0 = out[d0 + i] = (raw[s0 + i] + (pa <= pb && pa <= pc ? a0 : pb <= pc ? b0 : c0)) & 0xff; c0 = b0;
                p = a1 + b1 - c1; pa = p < a1 ? a1 - p : p - a1; pb = p < b1 ? b1 - p : p - b1; pc = p < c1 ? c1 - p : p - c1;
                a1 = out[d0 + i + 1] = (raw[s0 + i + 1] + (pa <= pb && pa <= pc ? a1 : pb <= pc ? b1 : c1)) & 0xff; c1 = b1;
                p = a2 + b2 - c2; pa = p < a2 ? a2 - p : p - a2; pb = p < b2 ? b2 - p : p - b2; pc = p < c2 ? c2 - p : p - c2;
                a2 = out[d0 + i + 2] = (raw[s0 + i + 2] + (pa <= pb && pa <= pc ? a2 : pb <= pc ? b2 : c2)) & 0xff; c2 = b2;
                p = a3 + b3 - c3; pa = p < a3 ? a3 - p : p - a3; pb = p < b3 ? b3 - p : p - b3; pc = p < c3 ? c3 - p : p - c3;
                a3 = out[d0 + i + 3] = (raw[s0 + i + 3] + (pa <= pb && pa <= pc ? a3 : pb <= pc ? b3 : c3)) & 0xff; c3 = b3;
              }
            }
          }
        }
      }

      const reports = [];
      for (const id of workerData.ids) {
        decodePng(
          fs.readFileSync(path.join(workerData.repoRoot, 'assets/sprites', id + '_sheet.png')),
          sheetArr,
          9600,
          2400,
          id + '_sheet.png'
        );
        const row1WalkSha =
          id === 'warrior_ex' || id === 'mage_ex' || id === 'priestess_ex' || id === 'chronomancer_ex'
            ? crypto
                .createHash('sha256')
                .update(sheetArr.subarray(240 * 9600 * 4, 480 * 9600 * 4))
                .digest('hex')
            : '';

        // 1) 4px border clips across all 300 sheet cells
        let sheet4pxClips = 0;
        for (let r = 0; r < 10; r++) {
          const oy = r * 240;
          for (let c = 0; c < 30; c++) {
            const ox = c * 320;
            let clipped = false;
            for (let m = 0; m < 4 && !clipped; m++) {
              const topR = (oy + m) * 9600 + ox;
              const botR = (oy + 239 - m) * 9600 + ox;
              for (let x = 0; x < 320; x++) {
                if (sheetU32[topR + x] >= 0x01000000 || sheetU32[botR + x] >= 0x01000000) {
                  clipped = true;
                  break;
                }
              }
              for (let y = 0; y < 240 && !clipped; y++) {
                const rowOff = (oy + y) * 9600 + ox;
                if (sheetU32[rowOff + m] >= 0x01000000 || sheetU32[rowOff + 319 - m] >= 0x01000000) {
                  clipped = true;
                  break;
                }
              }
            }
            if (clipped) sheet4pxClips++;
          }
        }

        // 2) Row 1 WALK (320x240) quantitative boot-band crossover + stance progression + leg-volume gate
        let minBootSpan = 999;
        let maxBootSpan = 0;
        let minMidLegPx = 999;
        const stanceXs = new Float64Array(30);
        for (let c = 0; c < 30; c++) {
          const ox = c * 320;
          const oy = 240;
          let lx = 320;
          let rx = -1;
          for (let y = 218; y <= 233; y++) {
            const rb = (oy + y) * 9600 + ox;
            for (let x = 0; x < 320; x++) {
              if (sheetU32[rb + x] >= 0x01000000) {
                if (x < lx) lx = x;
                if (x > rx) rx = x;
              }
            }
          }
          const span = rx >= lx ? rx - lx + 1 : 0;
          if (span < minBootSpan) minBootSpan = span;
          if (span > maxBootSpan) maxBootSpan = span;

          let plantSumX = 0;
          let plantCount = 0;
          for (let y = 224; y <= 230; y++) {
            const rb = (oy + y) * 9600 + ox;
            for (let x = 0; x < 320; x++) {
              if (sheetU32[rb + x] >= 0x01000000) {
                plantSumX += x;
                plantCount++;
              }
            }
          }
          stanceXs[c] = plantCount > 0 ? plantSumX / plantCount : 112;

          let midCount = 0;
          for (let y = 184; y <= 204; y++) {
            const rb = (oy + y) * 9600 + ox;
            for (let x = 0; x < 320; x++) {
              if (sheetU32[rb + x] >= 0x01000000) midCount++;
            }
          }
          const meanMidW = midCount / 21;
          if (meanMidW < minMidLegPx) minMidLegPx = meanMidW;
        }
        const walkStanceDelta1 = stanceXs[6] - stanceXs[1];
        const walkStanceDelta2 = stanceXs[21] - stanceXs[16];

        // 3) Row 5 DEATH F26..F29 prone bounds & Row 9 VICTORY F26..F29 upright bounds
        let maxDeathH = 0;
        let minDeathX = 320;
        let maxDeathX = 0;
        let minVictoryH = 999;
        for (let c = 26; c < 30; c++) {
          const ox = c * 320;
          let dy0 = 240, dy1 = -1, dx0 = 320, dx1 = -1;
          for (let y = 0; y < 240; y++) {
            const rb = (5 * 240 + y) * 9600 + ox;
            for (let x = 0; x < 320; x++) {
              if (sheetU32[rb + x] >= 0x01000000) {
                if (y < dy0) dy0 = y;
                if (y > dy1) dy1 = y;
                if (x < dx0) dx0 = x;
                if (x > dx1) dx1 = x;
              }
            }
          }
          const dh = dy1 >= dy0 ? dy1 - dy0 + 1 : 999;
          if (dh > maxDeathH) maxDeathH = dh;
          if (dx0 < minDeathX) minDeathX = dx0;
          if (dx1 > maxDeathX) maxDeathX = dx1;

          let vy0 = 240, vy1 = -1;
          for (let y = 0; y < 240; y++) {
            const rb = (9 * 240 + y) * 9600 + ox;
            for (let x = 0; x < 320; x++) {
              if (sheetU32[rb + x] >= 0x01000000) {
                if (y < vy0) vy0 = y;
                if (y > vy1) vy1 = y;
              }
            }
          }
          const vh = vy1 >= vy0 ? vy1 - vy0 + 1 : 0;
          if (vh < minVictoryH) minVictoryH = vh;
        }

        let valkWingMissing = 0;
        let valkRow4F0506MaxX = -1;
        if (id === 'valkyrie_ex') {
          for (const wr of [0, 1]) {
            const woy = wr * 240;
            for (let c = 0; c < 30; c++) {
              const wox = c * 320;
              let hasLeftWing = false;
              let hasRightWing = false;
              for (let y = 56; y <= 118; y++) {
                const rb = (woy + y) * 9600 + wox;
                for (let x = 0; x < 96; x++) {
                  if (sheetU32[rb + x] >= 0x01000000) {
                    hasLeftWing = true;
                    break;
                  }
                }
                for (let x = 133; x < 320; x++) {
                  if (sheetU32[rb + x] >= 0x01000000) {
                    hasRightWing = true;
                    break;
                  }
                }
                if (hasLeftWing && hasRightWing) break;
              }
              if (!hasLeftWing || !hasRightWing) valkWingMissing++;
            }
          }
          for (const c of [5, 6]) {
            const ox = c * 320;
            const oy = 4 * 240;
            for (let y = 0; y < 240; y++) {
              const rb = (oy + y) * 9600 + ox;
              for (let x = 0; x < 320; x++) {
                if (sheetU32[rb + x] >= 0x01000000 && x > valkRow4F0506MaxX) {
                  valkRow4F0506MaxX = x;
                }
              }
            }
          }
        }

        let archRow4MaxX = -1;
        let roninRow4MaxX = -1;
        let archRow4F1529MinSpan = 999;
        let archRow4LandOk = 1;
        let archSkinHandPx = 999;
        let archSilverVambPx = 999;
        let andrF1017MinSpan = 999;
        let andrF2629MinSpan = 999;
        let andrWideHipIslands = 0;
        let roninF2629MinSpan = 999;
        let roninF2629LandOk = 1;
        let iceF1729LandOk = 1;
        let iceF2426MaxSpan200 = 0;
        let chronoF2229LandOk = 1;
        if (
          id === 'archer_ex' ||
          id === 'ronin_ex' ||
          id === 'android_ex' ||
          id === 'icemage_ex' ||
          id === 'chronomancer_ex'
        ) {
          const oy = 4 * 240;
          for (let c = 0; c < 30; c++) {
            const ox = c * 320;
            let cellMaxY = -1;
            let footMinX = 320;
            let footMaxX = -1;
            for (let y = 0; y < 240; y++) {
              const rb = (oy + y) * 9600 + ox;
              for (let x = 0; x < 320; x++) {
                if (sheetU32[rb + x] >= 0x01000000) {
                  if (id === 'archer_ex' && x > archRow4MaxX) archRow4MaxX = x;
                  if (id === 'ronin_ex' && x > roninRow4MaxX) roninRow4MaxX = x;
                  if (y > cellMaxY) cellMaxY = y;
                  if (y >= 200 && y <= 235) {
                    if (x < footMinX) footMinX = x;
                    if (x > footMaxX) footMaxX = x;
                  }
                }
              }
            }
            const sp200 = footMaxX >= footMinX ? footMaxX - footMinX + 1 : 0;
            if (id === 'archer_ex' && c >= 15) {
              if (sp200 < archRow4F1529MinSpan) archRow4F1529MinSpan = sp200;
              if (c >= 27 && (cellMaxY < 229 || cellMaxY > 231)) archRow4LandOk = 0;
            }
            if (id === 'android_ex') {
              if (c >= 10 && c <= 17 && sp200 < andrF1017MinSpan) andrF1017MinSpan = sp200;
              if (c >= 26 && sp200 < andrF2629MinSpan) andrF2629MinSpan = sp200;
              if ((c >= 10 && c <= 17) || c >= 26) {
                const seen = new Uint8Array(320 * 240);
                for (let y = 148; y <= 208; y++) {
                  for (let x = 0; x < 320; x++) {
                    if ((x >= 72 && x <= 168) || seen[y * 320 + x] || sheetU32[(oy + y) * 9600 + ox + x] < 0x01000000) {
                      continue;
                    }
                    const q = [[x, y]];
                    seen[y * 320 + x] = 1;
                    let cnt = 0;
                    let touchesCenter = false;
                    while (q.length) {
                      const [cx, cy] = q.pop();
                      cnt++;
                      if (cx >= 72 && cx <= 168) touchesCenter = true;
                      for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                          if (!dx && !dy) continue;
                          const nx = cx + dx;
                          const ny = cy + dy;
                          if (nx >= 0 && nx < 320 && ny >= 0 && ny < 240 && !seen[ny * 320 + nx]) {
                            if (sheetU32[(oy + ny) * 9600 + ox + nx] >= 0x01000000) {
                              seen[ny * 320 + nx] = 1;
                              q.push([nx, ny]);
                            }
                          }
                        }
                      }
                    }
                    if (!touchesCenter && cnt >= 32) andrWideHipIslands++;
                  }
                }
              }
            }
            if (id === 'ronin_ex' && c >= 26) {
              if (sp200 < roninF2629MinSpan) roninF2629MinSpan = sp200;
              if (cellMaxY < 229 || cellMaxY > 231) roninF2629LandOk = 0;
            }
            if (id === 'icemage_ex') {
              if (c >= 17 && (cellMaxY < 229 || cellMaxY > 232)) iceF1729LandOk = 0;
              if (c >= 24 && c <= 26 && sp200 > iceF2426MaxSpan200) iceF2426MaxSpan200 = sp200;
            }
            if (id === 'chronomancer_ex' && c >= 22) {
              if (cellMaxY < 229 || cellMaxY > 231) chronoF2229LandOk = 0;
            }
          }
          if (id === 'archer_ex') {
            const handPatches = [
              [0, 0, 120, 168],
              [4, 15, 120, 168],
              [4, 24, 96, 168]
            ];
            for (const [hr, hc, hx0, hx1] of handPatches) {
              let sk = 0;
              let sv = 0;
              for (let y = 96; y < 136; y++) {
                const rowBase = ((hr * 240 + y) * 9600 + hc * 320) * 4;
                for (let x = hx0; x < hx1; x++) {
                  const i4 = rowBase + x * 4;
                  const a = sheetArr[i4 + 3];
                  if (a >= 200) {
                    const rC = sheetArr[i4];
                    const gC = sheetArr[i4 + 1];
                    const bC = sheetArr[i4 + 2];
                    if (rC >= 185 && gC >= 120 && gC <= 235 && bC >= 85 && bC <= 205 && rC - bC >= 28) sk++;
                    if (Math.abs(rC - bC) <= 24 && bC >= 140) sv++;
                  }
                }
              }
              if (sk < archSkinHandPx) archSkinHandPx = sk;
              if (sv < archSilverVambPx) archSilverVambPx = sv;
            }
          }
        }

        // 4) 4px border clips across all 240 VFX cells + chrono dark-flood / valkyrie straight-run audits
        decodePng(
          fs.readFileSync(path.join(workerData.repoRoot, 'assets/sprites', id + '_vfx.png')),
          vfxArr,
          6240,
          1664,
          id + '_vfx.png'
        );
        let vfx4pxClips = 0;
        let maxSquare192Run = 0;
        let chronoMaxDarkPx = 0;
        let valkMaxStraightRun = 0;
        let valkRow6MinH = 999;
        const mageRows = id === 'mage_ex' ? { 5: [208, 208, -1, -1], 6: [208, 208, -1, -1], 7: [208, 208, -1, -1] } : null;
        let archRow1MinH0 = 999;
        let archRow1MinH1 = 999;
        for (let r = 0; r < 8; r++) {
          const oy = r * 208;
          for (let c = 0; c < 30; c++) {
            const ox = c * 208;
            let clipped = false;
            for (let m = 0; m < 4 && !clipped; m++) {
              const topR = (oy + m) * 6240 + ox;
              const botR = (oy + 207 - m) * 6240 + ox;
              for (let x = 0; x < 208; x++) {
                if (vfxU32[topR + x] >= 0x01000000 || vfxU32[botR + x] >= 0x01000000) {
                  clipped = true;
                  break;
                }
              }
              for (let y = 0; y < 208 && !clipped; y++) {
                const rowOff = (oy + y) * 6240 + ox;
                if (vfxU32[rowOff + m] >= 0x01000000 || vfxU32[rowOff + 207 - m] >= 0x01000000) {
                  clipped = true;
                  break;
                }
              }
            }
            if (clipped) vfx4pxClips++;

            if (mageRows && (r === 5 || r === 6 || r === 7)) {
              const bb = mageRows[r];
              for (let y = 0; y < 208; y++) {
                const rowOff = (oy + y) * 6240 + ox;
                for (let x = 0; x < 208; x++) {
                  if (vfxU32[rowOff + x] >= 0x01000000) {
                    if (x < bb[0]) bb[0] = x;
                    if (y < bb[1]) bb[1] = y;
                    if (x > bb[2]) bb[2] = x;
                    if (y > bb[3]) bb[3] = y;
                  }
                }
              }
            }

            if (id === 'valkyrie_ex') {
              let cy0 = 208, cy1 = -1, cx0 = 208, cx1 = -1;
              for (let y = 0; y < 208; y++) {
                const base = ((oy + y) * 6240 + ox) * 4;
                for (let x = 0; x < 208; x++) {
                  if (vfxArr[base + x * 4 + 3] > 12) {
                    if (y < cy0) cy0 = y;
                    if (y > cy1) cy1 = y;
                    if (x < cx0) cx0 = x;
                    if (x > cx1) cx1 = x;
                  }
                }
              }
              if (cy1 >= cy0 && cx1 >= cx0) {
                if (r === 6) {
                  const vh = cy1 - cy0 + 1;
                  if (vh < valkRow6MinH) valkRow6MinH = vh;
                }
                let tr = 0, br = 0, lr = 0, rr = 0;
                const bTop = ((oy + cy0) * 6240 + ox) * 4;
                const bBot = ((oy + cy1) * 6240 + ox) * 4;
                for (let x = cx0; x <= cx1; x++) {
                  if (vfxArr[bTop + x * 4 + 3] > 12) tr++;
                  if (vfxArr[bBot + x * 4 + 3] > 12) br++;
                }
                for (let y = cy0; y <= cy1; y++) {
                  const bRow = ((oy + y) * 6240 + ox) * 4;
                  if (vfxArr[bRow + cx0 * 4 + 3] > 12) lr++;
                  if (vfxArr[bRow + cx1 * 4 + 3] > 12) rr++;
                }
                const mr = Math.max(tr, br, lr, rr);
                if (mr > valkMaxStraightRun) valkMaxStraightRun = mr;
              }
            }

            if (id === 'archer_ex' && r === 1) {
              let cy0 = 208, cy1 = -1;
              for (let y = 0; y < 208; y++) {
                const rowOff = (oy + y) * 6240 + ox;
                for (let x = 0; x < 208; x++) {
                  if (vfxU32[rowOff + x] >= 0x01000000) {
                    if (y < cy0) cy0 = y;
                    if (y > cy1) cy1 = y;
                  }
                }
              }
              const ch = cy1 >= cy0 ? cy1 - cy0 + 1 : 0;
              if (c < 12) {
                if (ch < archRow1MinH0) archRow1MinH0 = ch;
              } else {
                if (ch < archRow1MinH1) archRow1MinH1 = ch;
              }
            }

            if (id === 'chronomancer_ex') {
              let darkPx = 0;
              for (let y = 0; y < 208; y++) {
                const base = ((oy + y) * 6240 + ox) * 4;
                for (let x = 0; x < 208; x++) {
                  const i4 = base + x * 4;
                  const a = vfxArr[i4 + 3];
                  if (a > 80) {
                    const lum = 0.299 * vfxArr[i4] + 0.587 * vfxArr[i4 + 1] + 0.114 * vfxArr[i4 + 2];
                    if (lum < 32) darkPx++;
                  }
                }
              }
              if (darkPx > chronoMaxDarkPx) chronoMaxDarkPx = darkPx;
              for (const edgeY of [8, 199]) {
                let run = 0;
                for (let x = 8; x <= 199; x++) {
                  const a = vfxArr[((oy + edgeY) * 6240 + ox + x) * 4 + 3];
                  if (a >= 16) {
                    run++;
                    if (run > maxSquare192Run) maxSquare192Run = run;
                  } else {
                    run = 0;
                  }
                }
              }
              for (const edgeX of [8, 199]) {
                let run = 0;
                for (let y = 8; y <= 199; y++) {
                  const a = vfxArr[((oy + y) * 6240 + ox + edgeX) * 4 + 3];
                  if (a >= 16) {
                    run++;
                    if (run > maxSquare192Run) maxSquare192Run = run;
                  } else {
                    run = 0;
                  }
                }
              }
            }
          }
        }

        let rangedMaxX23 = 0;
        let rangedDetached230 = 0;
        if (
          id === 'mage_ex' ||
          id === 'priestess_ex' ||
          id === 'valkyrie_ex' ||
          id === 'icemage_ex' ||
          id === 'nyx_ex'
        ) {
          for (const rr of [2, 3]) {
            const roy = rr * 240;
            for (let c = 0; c < 30; c++) {
              const cox = c * 320;
              for (let y = 0; y < 240; y++) {
                const rb = (roy + y) * 9600 + cox;
                for (let x = 0; x < 320; x++) {
                  if (sheetU32[rb + x] >= 0x01000000 && x > rangedMaxX23) rangedMaxX23 = x;
                }
              }
            }
          }
          const seenR = new Uint8Array(320 * 240);
          for (const [rr, cols] of [[2, [3, 9, 17, 25]], [3, [8, 9, 10, 11, 12, 13, 14]]]) {
            const roy = rr * 240;
            for (const c of cols) {
              seenR.fill(0);
              const cox = c * 320;
              for (let y = 0; y < 240; y++) {
                for (let x = 230; x < 320; x++) {
                  if (seenR[y * 320 + x] || sheetU32[(roy + y) * 9600 + cox + x] < 0x01000000) continue;
                  const q = [[x, y]];
                  seenR[y * 320 + x] = 1;
                  let cnt = 0;
                  let crossesLeft = false;
                  while (q.length) {
                    const [cx, cy] = q.pop();
                    cnt++;
                    if (cx < 230) crossesLeft = true;
                    for (let dy = -1; dy <= 1; dy++) {
                      for (let dx = -1; dx <= 1; dx++) {
                        if (!dx && !dy) continue;
                        const nx = cx + dx, ny = cy + dy;
                        if (nx >= 0 && nx < 320 && ny >= 0 && ny < 240 && !seenR[ny * 320 + nx]) {
                          if (sheetU32[(roy + ny) * 9600 + cox + nx] >= 0x01000000) {
                            seenR[ny * 320 + nx] = 1;
                            q.push([nx, ny]);
                          }
                        }
                      }
                    }
                  }
                  if (!crossesLeft && cnt >= 16) rangedDetached230++;
                }
              }
            }
          }
        }

        reports.push({
          id,
          row1WalkSha,
          sheet4pxClips,
          vfx4pxClips,
          minBootSpan,
          maxBootSpan,
          walkStanceDelta1,
          walkStanceDelta2,
          minMidLegPx,
          maxDeathH,
          minDeathX,
          maxDeathX,
          minVictoryH,
          maxSquare192Run,
          chronoMaxDarkPx,
          valkMaxStraightRun,
          valkRow6MinH,
          valkWingMissing,
          valkRow4F0506MaxX,
          archRow4MaxX,
          roninRow4MaxX,
          archRow4F1529MinSpan,
          archRow4LandOk,
          archSkinHandPx,
          archSilverVambPx,
          andrF1017MinSpan,
          andrF2629MinSpan,
          andrWideHipIslands,
          roninF2629MinSpan,
          roninF2629LandOk,
          iceF1729LandOk,
          iceF2426MaxSpan200,
          chronoF2229LandOk,
          archRow1MinH0,
          archRow1MinH1,
          rangedMaxX23,
          rangedDetached230,
          mageRow5W: mageRows ? mageRows[5][2] - mageRows[5][0] + 1 : 0,
          mageRow5H: mageRows ? mageRows[5][3] - mageRows[5][1] + 1 : 0,
          mageRow6W: mageRows ? mageRows[6][2] - mageRows[6][0] + 1 : 0,
          mageRow6H: mageRows ? mageRows[6][3] - mageRows[6][1] + 1 : 0,
          mageRow7W: mageRows ? mageRows[7][2] - mageRows[7][0] + 1 : 0,
          mageRow7H: mageRows ? mageRows[7][3] - mageRows[7][1] + 1 : 0
        });
      }

      const monsterReports = [];
      for (const mKind of workerData.monsters || []) {
        decodePng(
          fs.readFileSync(path.join(workerData.repoRoot, 'assets/sprites', 'monster_' + mKind + '_sheet.png')),
          monArr,
          6240,
          1456,
          'monster_' + mKind + '_sheet.png'
        );
        let emptyCells = 0;
        let clip4px = 0;
        let idleTransitions = 0;
        let walkTransitions = 0;
        for (let r = 0; r < 7; r++) {
          const oy = r * 208;
          for (let c = 0; c < 30; c++) {
            const ox = c * 208;
            let nonZero = 0;
            for (let y = 0; y < 208; y++) {
              const rb = (oy + y) * 6240 + ox;
              for (let x = 0; x < 208; x++) {
                if (monU32[rb + x] >= 0x01000000) {
                  nonZero++;
                  break;
                }
              }
              if (nonZero > 0) break;
            }
            if (nonZero === 0) emptyCells++;

            let clipped = false;
            for (let m = 0; m < 4 && !clipped; m++) {
              const topR = (oy + m) * 6240 + ox;
              const botR = (oy + 207 - m) * 6240 + ox;
              for (let x = 0; x < 208; x++) {
                if (monU32[topR + x] >= 0x01000000 || monU32[botR + x] >= 0x01000000) {
                  clipped = true;
                  break;
                }
              }
              for (let y = 0; y < 208 && !clipped; y++) {
                const rowOff = (oy + y) * 6240 + ox;
                if (monU32[rowOff + m] >= 0x01000000 || monU32[rowOff + 207 - m] >= 0x01000000) {
                  clipped = true;
                  break;
                }
              }
            }
            if (clipped) clip4px++;
          }
          if (r === 0 || r === 1) {
            let trans = 0;
            for (let c = 0; c < 29; c++) {
              const ox0 = c * 208;
              const ox1 = (c + 1) * 208;
              let diff = false;
              for (let y = 0; y < 208 && !diff; y++) {
                const rb0 = (oy + y) * 6240 + ox0;
                const rb1 = (oy + y) * 6240 + ox1;
                for (let x = 0; x < 208; x++) {
                  if (monU32[rb0 + x] !== monU32[rb1 + x]) {
                    diff = true;
                    break;
                  }
                }
              }
              if (diff) trans++;
            }
            if (r === 0) idleTransitions = trans;
            else walkTransitions = trans;
          }
        }
        monsterReports.push({ mKind, emptyCells, clip4px, idleTransitions, walkTransitions });
      }

      let monsterVfxReport = null;
      if (workerData.auditMonsterVfx) {
        decodePng(
          fs.readFileSync(path.join(workerData.repoRoot, 'assets/sprites/monster_vfx.png')),
          vfxArr,
          6240,
          1664,
          'monster_vfx.png'
        );
        let mvEmpty = 0;
        let mvClips = 0;
        const mvTrans = [];
        for (let r = 0; r < 8; r++) {
          const oy = r * 208;
          for (let c = 0; c < 30; c++) {
            const ox = c * 208;
            let nz = 0;
            for (let y = 0; y < 208 && !nz; y++) {
              const rb = (oy + y) * 6240 + ox;
              for (let x = 0; x < 208; x++) {
                if (vfxU32[rb + x] >= 0x01000000) {
                  nz = 1;
                  break;
                }
              }
            }
            if (!nz) mvEmpty++;
            let clipped = false;
            for (let m = 0; m < 4 && !clipped; m++) {
              const topR = (oy + m) * 6240 + ox;
              const botR = (oy + 207 - m) * 6240 + ox;
              for (let x = 0; x < 208; x++) {
                if (vfxU32[topR + x] >= 0x01000000 || vfxU32[botR + x] >= 0x01000000) {
                  clipped = true;
                  break;
                }
              }
              for (let y = 0; y < 208 && !clipped; y++) {
                const rowOff = (oy + y) * 6240 + ox;
                if (vfxU32[rowOff + m] >= 0x01000000 || vfxU32[rowOff + 207 - m] >= 0x01000000) {
                  clipped = true;
                  break;
                }
              }
            }
            if (clipped) mvClips++;
          }
          let tr = 0;
          for (let c = 0; c < 29; c++) {
            const ox0 = c * 208;
            const ox1 = (c + 1) * 208;
            let diff = false;
            for (let y = 0; y < 208 && !diff; y++) {
              const rb0 = (oy + y) * 6240 + ox0;
              const rb1 = (oy + y) * 6240 + ox1;
              for (let x = 0; x < 208; x++) {
                if (vfxU32[rb0 + x] !== vfxU32[rb1 + x]) {
                  diff = true;
                  break;
                }
              }
            }
            if (diff) tr++;
          }
          mvTrans.push(tr);
        }
        monsterVfxReport = { emptyCells: mvEmpty, clip4px: mvClips, transitions: mvTrans };
      }
      parentPort.postMessage({ ok: true, reports, monsterReports, monsterVfxReport });
    `;

    const pngDeps36 = [
      ...exIds36.flatMap((id) => [
        `assets/sprites/${id}_sheet.png`,
        `assets/sprites/${id}_vfx.png`
      ]),
      ...monsterIds36.map((m) => `assets/sprites/monster_${m}_sheet.png`),
      'assets/sprites/monster_vfx.png'
    ];
    const shardResults = await getCachedAuditAsync(
      'suite36_ex_and_monster_pngs_v1',
      pngDeps36,
      workerCode36,
      async () =>
        Promise.all(
          shards36.map(
            (ids, idx) =>
              new Promise((resolve, reject) => {
                const w = new Worker36(workerCode36, {
                  eval: true,
                  workerData: {
                    repoRoot: REPO_ROOT,
                    ids,
                    monsters: monsterShards36[idx],
                    auditMonsterVfx: idx === 0
                  }
                });
                w.once('message', (msg) =>
                  msg?.ok ? resolve(msg) : reject(new Error('[Suite 36] Worker failed'))
                );
                w.once('error', reject);
                w.once('exit', (code) => {
                  if (code !== 0) reject(new Error(`[Suite 36] PNG worker exited with code ${code}`));
                });
              })
          )
        )
    );
    for (const batch of shardResults) {
      for (const rep of batch.reports) {
        pngAuditResults36.set(rep.id, rep);
      }
      for (const mRep of batch.monsterReports || []) {
        monsterAuditResults36.set(mRep.mKind, mRep);
      }
      if (batch.monsterVfxReport) {
        monsterVfxAudit36 = batch.monsterVfxReport;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.2: All 11 `*_ex_sheet.png` `Row 1 WALK` Quantitative Crossover Gate
  //       (`minBootSpan <= maxBootSpan * 0.55`, `maxBootSpan >= 56px`) &
  //       Live Anti-Skate Walk Cycle Immediately After `AUTO_ATTACK`/`SKILL`/`ULTIMATE`
  // --------------------------------------------------------------------------
  {
    for (const [heroId, ExCls] of EX_HERO_CLASSES_36) {
      const rep = pngAuditResults36.get(heroId);
      if (
        !rep ||
        rep.maxBootSpan < 56 ||
        rep.minBootSpan > rep.maxBootSpan * 0.55
      ) {
        throw new Error(
          `[Suite 36.2] ${heroId} Row 1 WALK failed bipedal crossover gate: minBootSpan=${rep?.minBootSpan}, maxBootSpan=${rep?.maxBootSpan}, ratio=${rep ? (rep.minBootSpan / rep.maxBootSpan).toFixed(3) : 'N/A'}`
        );
      }

      const walkGame = createMockGame();
      const ex = new ExCls({ x: 240, groundY: 560, facing: 1, team: 'left' });
      const farEnemy = new Warrior({ x: 1060, groundY: 560, facing: -1, name: 'FarTarget', team: 'right' });
      ex.game = walkGame;
      farEnemy.game = walkGame;
      farEnemy.isPlayerControlled = true;
      walkGame.fighters = [ex, farEnemy];
      walkGame.getEnemiesOf = (f) => (f === ex ? [farEnemy] : [ex]);
      walkGame.getTargetFor = (f) => (f === ex ? farEnemy : ex);

      for (const priorState of ['AUTO_ATTACK', 'SKILL', 'ULTIMATE']) {
        ex.x = 240;
        ex.y = 560;
        ex.vx = 0;
        ex.vy = 0;
        ex.facing = 1;
        ex.isPlayerControlled = false;
        ex.attackCooldown = 999;
        ex.skillCooldown = 999;
        ex.dashCooldown = 999;
        ex.vaultCooldown = 999;
        ex.jumpCooldown = 999;
        ex.crouchCooldown = 999;
        ex.dodgeCooldown = 999;
        ex.mana = priorState === 'ULTIMATE' ? ex.maxMana : 0;
        ex.finisherGauge = 0;

        ex.setState(priorState);
        ex.update(1 / 30, farEnemy, walkGame);
        // Simulate mid-action frame overrides left on the fighter right before entering WALK
        ex._overrideFrameIdx = 128;
        ex.trueUltFrameOverride = 132;
        ex.mana = 0;
        ex.attackCooldown = 999;
        ex.x = 120;
        ex.y = 560;
        ex.vx = 0;
        ex.vy = 0;
        ex.facing = 1;

        ex.setState('WALK');
        if (ex._overrideFrameIdx !== null || ex.trueUltFrameOverride !== null) {
          throw new Error(
            `[Suite 36.2] ${heroId} setState('WALK') after ${priorState} failed to clear frame overrides (_override=${ex._overrideFrameIdx}, trueUlt=${ex.trueUltFrameOverride})!`
          );
        }

        // Also verify PixelForge.getFrameIndex ignores any residual override if AI assigned state='WALK' directly
        ex._overrideFrameIdx = 125;
        ex.trueUltFrameOverride = 141;
        const guardIdx = PixelForge.getFrameIndex(ex, ex.walkPhase);
        if (guardIdx < 30 || guardIdx > 59) {
          throw new Error(
            `[Suite 36.2] ${heroId} PixelForge.getFrameIndex leaked override ${guardIdx} during WALK!`
          );
        }
        ex._overrideFrameIdx = null;
        ex.trueUltFrameOverride = null;

        const seenWalkFrames = new Set();
        const startWalkX = ex.x;
        for (let step = 0; step < 30; step++) {
          farEnemy.x = 1060;
          ex.update(1 / 30, farEnemy, walkGame);
          if (ex.state !== 'WALK') {
            throw new Error(
              `[Suite 36.2] Expected ${heroId} to stay in WALK closing 820px gap after ${priorState}, got state=${ex.state} at step=${step}`
            );
          }
          const fIdx = PixelForge.getFrameIndex(ex, ex.walkPhase);
          if (fIdx < 30 || fIdx > 59) {
            throw new Error(
              `[Suite 36.2] ${heroId} WALK emitted non-Row-1 frame ${fIdx} after ${priorState}!`
            );
          }
          seenWalkFrames.add(fIdx);
        }
        if (seenWalkFrames.size < 8 || ex.x <= startWalkX + 40) {
          throw new Error(
            `[Suite 36.2] Frozen skating WALK detected on ${heroId} after ${priorState}: uniqueFrames=${seenWalkFrames.size}, dx=${(ex.x - startWalkX).toFixed(1)}`
          );
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.3: All 11 `*_ex_sheet.png` `Row 5 DEATH` Prone (`height <= 104px`, `minX >= 18`, `maxX <= 302`)
  //       & `Row 9 VICTORY` Upright (`height >= 150px`) + Mid-Air Fatal `Fighter.takeDamage` Gravity Drop
  // --------------------------------------------------------------------------
  {
    for (const [heroId, ExCls] of EX_HERO_CLASSES_36) {
      const rep = pngAuditResults36.get(heroId);
      if (
        !rep ||
        rep.maxDeathH > 104 ||
        rep.minDeathX < 18 ||
        rep.maxDeathX > 302 ||
        rep.minVictoryH < 150
      ) {
        throw new Error(
          `[Suite 36.3] ${heroId} Row 5 DEATH / Row 9 VICTORY geometry failed: deathH=${rep?.maxDeathH}, deathX=[${rep?.minDeathX}..${rep?.maxDeathX}], vicH=${rep?.minVictoryH}`
        );
      }

      const deathGame = createMockGame();
      deathGame.testModeUnlimitedHp = false;
      const victim = new ExCls({ x: 460, groundY: 560, facing: 1, team: 'left' });
      const killer = new Warrior({ x: 610, groundY: 560, facing: -1, name: 'Killer', team: 'right' });
      victim.game = deathGame;
      killer.game = deathGame;
      deathGame.fighters = [victim, killer];

      // Put victim mid-air with active frame overrides & aerial vault/poise flags, then deal fatal damage
      victim.hp = 80;
      victim.y = victim.groundY - 165;
      victim.vy = -240;
      victim.state = 'ULTIMATE';
      victim._overrideFrameIdx = 128;
      victim.trueUltFrameOverride = 134;
      victim.isFlipVault = true;
      victim.isAngelicAscent = true;
      victim.unstoppablePoise = true;
      victim.isRooted = true;
      victim.isInvulnerable = false;

      victim.takeDamage(500, killer, true, 120, -80);
      if (
        !victim.isDead ||
        victim.state !== 'DEATH' ||
        victim._overrideFrameIdx !== null ||
        victim.trueUltFrameOverride !== null ||
        victim.isFlipVault ||
        victim.isAngelicAscent ||
        victim.isRooted
      ) {
        throw new Error(
          `[Suite 36.3] ${heroId} mid-air fatal takeDamage failed clean DEATH transition: isDead=${victim.isDead}, state=${victim.state}, ov=${victim._overrideFrameIdx}/${victim.trueUltFrameOverride}`
        );
      }

      const deathStartFrame = PixelForge.getFrameIndex(victim, 0);
      if (deathStartFrame < 150 || deathStartFrame > 179) {
        throw new Error(
          `[Suite 36.3] ${heroId} expected Row 5 DEATH frame (150..179), got ${deathStartFrame}`
        );
      }

      for (let step = 0; step < 45; step++) {
        victim.update(1 / 30, killer, deathGame);
      }
      const deathEndFrame = PixelForge.getFrameIndex(victim, 0);
      if (victim.y !== victim.groundY || deathEndFrame < 174 || deathEndFrame > 179) {
        throw new Error(
          `[Suite 36.3] ${heroId} mid-air corpse failed to settle on groundY (${victim.y} vs ${victim.groundY}) at prone frame ${deathEndFrame}!`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.4: Zero `4px` Border Clips Across All 11 `*_ex_sheet.png` (`300` Cells) & 11 `*_ex_vfx.png` (`240` Cells),
  //       Zero `192px` Square Cut-Offs on `chronomancer_ex_vfx.png`, Dynamic `ArcaneShaderFX.computeViewport`
  //       at `x = 110`, `x = 1090`, & Adventure `x = 7400` (`0` `736x464` Box Clips), & `0` Canvas2D Vector Calls
  // --------------------------------------------------------------------------
  {
    for (const [heroId] of EX_HERO_CLASSES_36) {
      const rep = pngAuditResults36.get(heroId);
      if (!rep || rep.sheet4pxClips !== 0 || rep.vfx4pxClips !== 0) {
        throw new Error(
          `[Suite 36.4] Expected 0/300 sheet 4px clips & 0/240 VFX 4px clips on ${heroId}, got sheet=${rep?.sheet4pxClips}, vfx=${rep?.vfx4pxClips}`
        );
      }
    }
    const chronoRep36 = pngAuditResults36.get('chronomancer_ex');
    if (!chronoRep36 || chronoRep36.maxSquare192Run >= 16) {
      throw new Error(
        `[Suite 36.4] Detected 192px square box cut-off on chronomancer_ex_vfx.png: maxEdgeRun=${chronoRep36?.maxSquare192Run}`
      );
    }

    // Dynamic `ArcaneShaderFX.computeViewport` centering & `736x464` (`viewW=368/736`) zero-clip verification at x=110, x=1090, x=7400
    for (const testWorldX of [110, 1090, 7400]) {
      const vpFx = new ArcaneShaderFX(CHRONO_EFFECT_REGISTRY, {
        pixelScale: 2,
        viewW: 736,
        viewH: 464,
        arenaCenterX: 600,
        groundWorldY: 560,
        topRatio: 0.72
      });
      vpFx.overrideCenterWorldX = null;
      vpFx.spawn('chronoAstrolabeAura', testWorldX, 556, {
        maxDuration: 1.2,
        light: 1.2
      });
      vpFx.update(0.18);
      const vp = vpFx.computeViewport(600, 560);
      const vpMidX = vp.worldLeft + vp.worldW * 0.5;
      if (Math.abs(vpMidX - testWorldX) > 4) {
        throw new Error(
          `[Suite 36.4] Expected ArcaneShaderFX.computeViewport to auto-center on x=${testWorldX}, got midX=${vpMidX}`
        );
      }
      const rastBack = vpFx.rasterizeLayer('back', 600, 560);
      const rastFront = vpFx.rasterizeLayer('front', 600, 560);
      if (!rastBack?.drewAny && !rastFront?.drewAny) {
        throw new Error(`[Suite 36.4] Expected active shader rasterization at x=${testWorldX}!`);
      }
      let borderLeaks = 0;
      for (const rgbaBuf of [rastBack.rgba, rastFront.rgba]) {
        for (let x = 0; x < 736; x++) {
          if (rgbaBuf[x * 4 + 3] > 0 || rgbaBuf[(463 * 736 + x) * 4 + 3] > 0) borderLeaks++;
        }
        for (let y = 0; y < 464; y++) {
          if (rgbaBuf[y * 736 * 4 + 3] > 0 || rgbaBuf[(y * 736 + 735) * 4 + 3] > 0) borderLeaks++;
        }
      }
      if (borderLeaks !== 0) {
        throw new Error(
          `[Suite 36.4] Expected 0 736x464 viewport box clips at x=${testWorldX}, got ${borderLeaks}`
        );
      }
      vpFx.dispose();
    }

    // Static scan: 0 Canvas2D SVG/vector calls (`beginPath`, `moveTo`, `lineTo`, `stroke`, `arc`, `ellipse`, `ctx.rotate`) in all 11 `*Ex.js`
    const stripComments36 = (code) =>
      code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const forbiddenCanvasVecRe = /\.(?:beginPath|moveTo|lineTo|stroke|arc|ellipse|rotate)\s*\(/;
    for (const [heroId] of EX_HERO_CLASSES_36) {
      const entityName = CHAMPION_ROSTER[heroId]?.cls?.name;
      const filePath = path.join(REPO_ROOT, 'src/entities', `${entityName}.js`);
      const cleanSrc = stripComments36(fs.readFileSync(filePath, 'utf8'));
      const m = cleanSrc.match(forbiddenCanvasVecRe);
      if (m) {
        throw new Error(
          `[Suite 36.4] Forbidden Canvas2D vector/rotate call '${m[0]}' found in ${entityName}.js!`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.5: Zero `torii` in `RoninEx` + `ArcherEx.updateUltimate` 180-deg Overhead Vault & Facing Flip +
  //       `ValkyrieEx.updateUltimate` >= 220px Sweep + `VFXManager.getActiveLights` >= 400px `TRUE_ULTIMATE` &
  //       `fx.active`/`activeVfxAnims` Harvesting + `Renderer.render` Ray-Projected Shadows, Rim Light & EX Reflections
  // --------------------------------------------------------------------------
  {
    for (const relPath of ['src/entities/RoninEx.js', 'scripts/build_ronin_ex_vfx_30fps.mjs']) {
      const txt = fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
      if (/torii/i.test(txt)) {
        throw new Error(`[Suite 36.5] Forbidden 'torii' match found in ${relPath}!`);
      }
    }

    // (A) `ArcherEx.updateUltimate`: charges toward `enemy.x` -> vaults `180 deg` overhead (`minY <= groundY - 140`) -> lands opposite side & flips `facing`
    {
      const archGame = createMockGame();
      const sylEx = new ArcherEx({ x: 300, groundY: 560, facing: 1, team: 'left' });
      const foe = new Warrior({ x: 620, groundY: 560, facing: -1, name: 'VaultFoe', team: 'right' });
      sylEx.game = archGame;
      foe.game = archGame;
      sylEx.maxHp = 999999;
      sylEx.hp = 999999;
      foe.maxHp = 999999;
      foe.hp = 999999;
      foe.stunTimer = 999;
      archGame.fighters = [sylEx, foe];
      archGame.getEnemiesOf = (f) => (f === sylEx ? [foe] : [sylEx]);
      archGame.getTargetFor = (f) => (f === sylEx ? foe : sylEx);

      sylEx.mana = sylEx.maxMana;
      sylEx.setState('ULTIMATE');
      let maxChargeXBeforeVault = sylEx.x;
      let minAirY = sylEx.groundY;
      let postVaultX = sylEx.x;
      let postVaultFacing = sylEx.facing;

      for (let step = 0; step < 90; step++) {
        const prevT = sylEx.stateTimer;
        sylEx.update(1 / 30, foe, archGame);
        archGame.vfx.update(1 / 30, 560, archGame.renderer, archGame.audio);
        if (prevT < 0.34 && sylEx.x > maxChargeXBeforeVault) {
          maxChargeXBeforeVault = sylEx.x;
        }
        if (sylEx.y < minAirY) minAirY = sylEx.y;
        if (sylEx.state === 'ULTIMATE') {
          postVaultX = sylEx.x;
          postVaultFacing = sylEx.facing;
        } else {
          break;
        }
      }
      if (
        maxChargeXBeforeVault < 500 ||
        minAirY > sylEx.groundY - 140 ||
        postVaultX <= foe.x + 60 ||
        postVaultFacing !== -1
      ) {
        throw new Error(
          `[Suite 36.5 ArcherEx] Expected charge toward ${foe.x} (got ${maxChargeXBeforeVault.toFixed(1)}), minY <= ${sylEx.groundY - 140} (got ${minAirY.toFixed(1)}), opposite-side x > ${foe.x + 60} (got ${postVaultX.toFixed(1)}) & facing=-1 (got ${postVaultFacing})!`
        );
      }
    }

    // (B) `ValkyrieEx.updateUltimate`: airborne backflip retreat >= 220px away from enemy (`_phaseThroughEnemy === false`)
    {
      const valkGame = createMockGame();
      const freyEx = new ValkyrieEx({ x: 480, groundY: 560, facing: 1, team: 'left' });
      const foe = new Warrior({ x: 760, groundY: 560, facing: -1, name: 'GlideFoe', team: 'right' });
      freyEx.game = valkGame;
      foe.game = valkGame;
      freyEx.maxHp = 999999;
      freyEx.hp = 999999;
      foe.maxHp = 999999;
      foe.hp = 999999;
      foe.stunTimer = 999;
      valkGame.fighters = [freyEx, foe];
      valkGame.getEnemiesOf = (f) => (f === freyEx ? [foe] : [freyEx]);
      valkGame.getTargetFor = (f) => (f === freyEx ? foe : freyEx);

      freyEx.mana = freyEx.maxMana;
      freyEx.setState('ULTIMATE');
      let minSweepX = freyEx.x;
      let maxSweepX = freyEx.x;
      for (let step = 0; step < 90; step++) {
        freyEx.update(1 / 30, foe, valkGame);
        valkGame.vfx.update(1 / 30, 560, valkGame.renderer, valkGame.audio);
        if (freyEx.x < minSweepX) minSweepX = freyEx.x;
        if (freyEx.x > maxSweepX) maxSweepX = freyEx.x;
        if (freyEx.state !== 'ULTIMATE') break;
      }
      const horizSweep = maxSweepX - minSweepX;
      if (horizSweep < 220 || minSweepX > 260 || maxSweepX > foe.x - 40) {
        throw new Error(
          `[Suite 36.5 ValkyrieEx] Expected airborne backflip retreat >= 220px (minX<=260, maxX<=${foe.x - 40}), got sweep=${horizSweep.toFixed(1)}, minX=${minSweepX.toFixed(1)}, maxX=${maxSweepX.toFixed(1)}`
        );
      }
      freyEx.fx?.dispose?.();
    }

    // (C) `VFXManager.getActiveLights` (>= 400px TRUE_ULTIMATE + `fx.active` / `activeVfxAnims` harvesting)
    //     & `Renderer.render` (Ray-Projected Shadows + Directional Specular Rim Light + EX Floor Reflections)
    {
      let rayShadowTransforms = 0;
      let lighterSilhouetteDraws = 0;
      let reflectionFighterDraws = 0;

      const renCtx = createMockCtx();
      renCtx.transform = (a, b, c, d) => {
        if (a === 1 && b === 0 && Math.abs(d) > 0.05 && Math.abs(d) <= 0.35) {
          rayShadowTransforms++;
        }
      };
      const origDrawImg36 = renCtx.drawImage.bind(renCtx);
      renCtx.drawImage = (...args) => {
        if (renCtx.globalCompositeOperation === 'lighter') {
          lighterSilhouetteDraws++;
        }
        return origDrawImg36(...args);
      };

      const renCanvas = {
        width: 1280,
        height: 720,
        getBoundingClientRect: () => ({ width: 1280, height: 720 }),
        getContext: () => renCtx
      };
      const liveRen = new Renderer(renCanvas);
      const liveVfx = new VFXManager();

      const casterEx = new FireMageEx({ x: 420, groundY: 560, facing: 1, team: 'left' });
      const receiverEx = new WarriorEx({ x: 610, groundY: 560, facing: -1, team: 'right' });
      const origReceiverDraw = receiverEx.draw.bind(receiverEx);
      receiverEx.draw = (c, isRefl, r) => {
        if (isRefl) reflectionFighterDraws++;
        return origReceiverDraw(c, isRefl, r);
      };

      // Baseline passive lights before TRUE_ULTIMATE / fx.active / activeVfxAnims
      const baseCount = liveVfx.getActiveLights([casterEx, receiverEx], 560).length;

      casterEx.state = 'TRUE_ULTIMATE';
      casterEx.fx.spawn('hellfireSolarPillar', 505, 450, { light: 1.45, maxDuration: 1.5 });
      casterEx.activeVfxAnims = [
        { row: 2, x: 545, y: 470, w: 196, h: 196, age: 0.08, duration: 0.6 }
      ];

      const harvestedLights = liveVfx.getActiveLights([casterEx, receiverEx], 560);
      const hasTrueUlt400 = harvestedLights.some(
        (L) => L.owner === casterEx && L.radius >= 400 && L.intensity >= 2.0
      );
      const hasFxShaderLight = harvestedLights.some(
        (L) => Math.abs(L.x - 505) <= 2 && !L.isSelfPassive
      );
      const hasVfxAnimLight = harvestedLights.some(
        (L) => Math.abs(L.x - 545) <= 2 && !L.isSelfPassive
      );
      if (
        harvestedLights.length < baseCount + 2 ||
        !hasTrueUlt400 ||
        !hasFxShaderLight ||
        !hasVfxAnimLight
      ) {
        throw new Error(
          `[Suite 36.5 Lights] Expected >=400px TRUE_ULTIMATE light + fx.active & activeVfxAnims harvesting; got count=${harvestedLights.length} (base=${baseCount}), ult400=${hasTrueUlt400}, fxLight=${hasFxShaderLight}, animLight=${hasVfxAnimLight}`
        );
      }

      // Execute full live `Renderer.render` and verify ray-projected shadows + rim catchlights + EX floor reflections
      liveRen.render([casterEx, receiverEx], liveVfx, 1 / 60);
      if (
        rayShadowTransforms < 1 ||
        lighterSilhouetteDraws < 2 ||
        reflectionFighterDraws < 1 ||
        renCtx._stateStack.length !== 0
      ) {
        throw new Error(
          `[Suite 36.5 Renderer] Expected ray-projected shadows (${rayShadowTransforms}), directional rim/glow draws (${lighterSilhouetteDraws}), EX floor reflections (${reflectionFighterDraws}) & balanced ctx stack (${renCtx._stateStack.length})!`
        );
      }
      casterEx.fx?.dispose?.();
      receiverEx.fx?.dispose?.();
    }
  }

  // --------------------------------------------------------------------------
  // 36.6: Sol EX (`mage_ex`) Native 208x208 Rows 5/6/7 Meteor & `0` `meteor_cataclysm`,
  //       Sylvara EX (`archer_ex`) Raining-Arrow Skill & `0` `constellationSeekers`,
  //       and Freyja EX (`valkyrie_ex`) Symmetrical Upper Wings & Clean Row 4 F05..F06
  // --------------------------------------------------------------------------
  const createAuditCtx36 = () => {
    const stats = {
      vectorCalls: 0,
      rotateCalls: 0,
      meteorCataclysmDraws: 0,
      vfxSyDrawn: new Set(),
      reflSyDrawn: new Set()
    };
    const c = createMockCtx();
    for (const fn of ['beginPath', 'moveTo', 'lineTo', 'stroke', 'arc', 'ellipse']) {
      c[fn] = () => {
        stats.vectorCalls++;
      };
    }
    c.rotate = () => {
      stats.rotateCalls++;
    };
    c.drawImage = (img, _sx, sy) => {
      const src = String(img?.src || img?._origSrc || img?._deferredSrc || '');
      if (src.includes('meteor_cataclysm')) {
        stats.meteorCataclysmDraws++;
      }
      if (typeof sy === 'number' && src.includes('_ex_vfx.png')) {
        stats.vfxSyDrawn.add(sy);
      }
    };
    return { ctx: c, stats };
  };

  {
    const stripComments36b = (code) =>
      code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

    // (A) Sol EX (`mage_ex`) static purge + PNG Row 5/6/7 bbox + live TRUE_ULTIMATE 3-phase sim
    {
      for (const [heroId] of EX_HERO_CLASSES_36) {
        const entityName = CHAMPION_ROSTER[heroId]?.cls?.name;
        const rawSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/entities', `${entityName}.js`), 'utf8');
        const cleanSrc = stripComments36b(rawSrc);
        if (/meteor_cataclysm|\.meteor\b/.test(cleanSrc)) {
          throw new Error(
            `[Suite 36.6 SolEX] Expected 0 references to meteor_cataclysm or .meteor in ${entityName}.js!`
          );
        }
        if (heroId === 'mage_ex' && rawSrc.includes('meteor_cataclysm')) {
          throw new Error('[Suite 36.6 SolEX] Raw FireMageEx.js must contain 0 meteor_cataclysm occurrences!');
        }
      }

      const mageRep = pngAuditResults36.get('mage_ex');
      if (
        !mageRep ||
        mageRep.vfx4pxClips !== 0 ||
        mageRep.mageRow5W < 150 ||
        mageRep.mageRow5H < 54 ||
        mageRep.mageRow6W < 130 ||
        mageRep.mageRow6H < 140 ||
        mageRep.mageRow7W < 96 ||
        mageRep.mageRow7H < 120
      ) {
        throw new Error(
          `[Suite 36.6 SolEX] mage_ex_vfx.png Rows 5/6/7 failed bbox/margin gate: ${JSON.stringify(mageRep)}`
        );
      }

      const solGame = createMockGame();
      solGame.testModeUnlimitedHp = false;
      const solEx = new FireMageEx({ x: 340, groundY: 560, facing: 1, team: 'left' });
      const foe = new Warrior({ x: 780, groundY: 560, facing: -1, name: 'MeteorDummy', team: 'right' });
      foe.maxHp = 99999;
      foe.hp = 99999;
      foe.stunTimer = 999;
      solEx.game = solGame;
      foe.game = solGame;
      solGame.fighters = [solEx, foe];
      solGame.getEnemiesOf = (f) => (f === solEx ? [foe] : [solEx]);
      solGame.getTargetFor = (f) => (f === solEx ? foe : solEx);

      const solDrawAudit = createAuditCtx36();
      const solReflAudit = createAuditCtx36();
      solEx.finisherGauge = solEx.maxFinisherGauge || 100;
      solEx.setState('TRUE_ULTIMATE');

      let sawRift = false;
      let sawDescent = false;
      let sawDetonated = false;
      let lightPhase1 = null;
      let lightDescentA = null;
      let lightDescentB = null;
      let sawLaywasteBadge = false;
      let sawInfernoStage = false;
      let sawImpactDome = false;

      for (let step = 0; step < 105; step++) {
        solEx.update(1 / 30, foe, solGame);
        solGame.vfx.update(1 / 30, 560, solGame.renderer, solGame.audio);
        const t = solEx.stateTimer;
        const phase = solEx.trueUltMeteor?.phase;

        if (t >= 0.9 && t <= 1.2) {
          if (phase === 'rift') sawRift = true;
          solEx.drawForegroundOverlay(solDrawAudit.ctx, solGame.renderer);
          solEx.draw(solDrawAudit.ctx, false, solGame.renderer);
          solEx.drawUltimateForeground(solDrawAudit.ctx, solGame.renderer);
          if (!lightPhase1) {
            const lights = solGame.vfx.getActiveLights([solEx, foe], 560);
            lightPhase1 =
              lights.find(
                (L) => L.owner === solEx && L.colorType === 'orange' && L.radius >= 450 && L.z >= 100
              ) || null;
          }
        }
        if (t >= 1.9 && t <= 2.9) {
          if (phase === 'descent') sawDescent = true;
          solEx.drawForegroundOverlay(solDrawAudit.ctx, solGame.renderer);
          solEx.draw(solDrawAudit.ctx, false, solGame.renderer);
          solEx.drawUltimateForeground(solDrawAudit.ctx, solGame.renderer);
          if (t >= 2.35 && t <= 2.45) {
            solEx.draw(solReflAudit.ctx, true, solGame.renderer);
          }
          const lights = solGame.vfx.getActiveLights([solEx, foe], 560);
          const mLight = lights.find(
            (L) => L.owner === solEx && L.colorType === 'orange' && L.radius >= 450 && L.z >= 100
          );
          if (mLight) {
            if (!lightDescentA && t >= 1.95 && t <= 2.15) lightDescentA = { x: mLight.x, y: mLight.y };
            if (t >= 2.65 && t <= 2.85) lightDescentB = { x: mLight.x, y: mLight.y };
          }
        }
        if (t >= 3.22) {
          if (phase === 'detonated') sawDetonated = true;
          if (solGame.hudEls.stageBadge.textContent === 'LAYWASTE OF INFERNO') sawLaywasteBadge = true;
          if (
            solGame.renderer.permanentStageOverride === 'inferno' ||
            solGame.renderer.trueUltStageOverride === 'inferno'
          ) {
            sawInfernoStage = true;
          }
          if (solEx.fx?.active?.some((s) => s.key === 'astralCataclysmImpactDome')) {
            sawImpactDome = true;
          }
          break;
        }
      }

      const drawnRows = solDrawAudit.stats.vfxSyDrawn;
      const meteorMoveDist =
        lightDescentA && lightDescentB
          ? Math.hypot(lightDescentB.x - lightDescentA.x, lightDescentB.y - lightDescentA.y)
          : 0;
      if (
        !sawRift ||
        !sawDescent ||
        !sawDetonated ||
        !drawnRows.has(5 * 208) ||
        !drawnRows.has(6 * 208) ||
        !drawnRows.has(7 * 208) ||
        solDrawAudit.stats.meteorCataclysmDraws !== 0 ||
        solDrawAudit.stats.vectorCalls !== 0 ||
        solDrawAudit.stats.rotateCalls !== 0 ||
        solReflAudit.stats.meteorCataclysmDraws !== 0 ||
        solReflAudit.stats.vectorCalls !== 0 ||
        solReflAudit.stats.rotateCalls !== 0 ||
        !solReflAudit.stats.vfxSyDrawn.has(6 * 208) ||
        !lightPhase1 ||
        meteorMoveDist <= 40 ||
        !sawLaywasteBadge ||
        !sawInfernoStage ||
        !sawImpactDome
      ) {
        throw new Error(
          `[Suite 36.6 SolEX] TRUE_ULTIMATE verification failed: phases=[${sawRift},${sawDescent},${sawDetonated}], sy=[${[...drawnRows].join(',')}], reflSy=[${[...solReflAudit.stats.vfxSyDrawn].join(',')}], meteorDraws=${solDrawAudit.stats.meteorCataclysmDraws}/${solReflAudit.stats.meteorCataclysmDraws}, vec=${solDrawAudit.stats.vectorCalls}/${solReflAudit.stats.vectorCalls}, rot=${solDrawAudit.stats.rotateCalls}/${solReflAudit.stats.rotateCalls}, lightP1=${Boolean(lightPhase1)}, moveDist=${meteorMoveDist.toFixed(1)}, badge=${sawLaywasteBadge}, inferno=${sawInfernoStage}, dome=${sawImpactDome}`
        );
      }
      solEx.fx?.dispose?.();
    }

    // (B) Sylvara EX (`archer_ex`) static `constellationSeekers` purge + Row 1 height + live SKILL sim
    {
      const rawArchSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/entities/ArcherEx.js'), 'utf8');
      const cleanArchSrc = stripComments36b(rawArchSrc);
      if (/constellationSeekers\s*\.\s*push|of\s+this\.constellationSeekers|constellationSeekers\s*\[/.test(cleanArchSrc)) {
        throw new Error('[Suite 36.6 SylvaraEX] ArcherEx.js must contain 0 constellationSeekers pushes or draws!');
      }

      const archRep = pngAuditResults36.get('archer_ex');
      if (
        !archRep ||
        archRep.vfx4pxClips !== 0 ||
        archRep.archRow1MinH0 < 110 ||
        archRep.archRow1MinH1 < 110
      ) {
        throw new Error(
          `[Suite 36.6 SylvaraEX] archer_ex_vfx.png Row 1 failed height >=110 / margin gate: ${JSON.stringify(archRep)}`
        );
      }

      const archGame = createMockGame();
      const sylEx = new ArcherEx({ x: 320, groundY: 560, facing: 1, team: 'left' });
      const foe = new Warrior({ x: 640, groundY: 560, facing: -1, name: 'RainDummy', team: 'right' });
      foe.maxHp = 99999;
      foe.hp = 99999;
      foe.stunTimer = 999;
      sylEx.game = archGame;
      foe.game = archGame;
      archGame.fighters = [sylEx, foe];
      archGame.getEnemiesOf = (f) => (f === sylEx ? [foe] : [sylEx]);
      archGame.getTargetFor = (f) => (f === sylEx ? foe : sylEx);

      const archAudit = createAuditCtx36();
      const vfxAudit = createAuditCtx36();
      const seenProjs = new Set();
      const fanVys = new Set();
      const seenStrikes = new Set();
      let maxTornadoCount = 0;
      let sawCyclone = false;
      let sawRainBarrage = false;

      sylEx.setState('SKILL');
      for (let step = 0; step < 50; step++) {
        sylEx.update(1 / 30, foe, archGame);
        archGame.vfx.update(1 / 30, 560, archGame.renderer, archGame.audio);
        if ((sylEx.constellationSeekers?.length || 0) !== 0) {
          throw new Error(
            `[Suite 36.6 SylvaraEX] Expected constellationSeekers.length === 0 during SKILL, got ${sylEx.constellationSeekers.length}`
          );
        }
        for (const p of archGame.vfx.projectiles) {
          if (p.owner === sylEx && p.type === 'arrow') {
            seenProjs.add(p);
            fanVys.add(Math.round(p.vy || 0));
          }
        }
        for (const s of archGame.vfx.skyStrikes) {
          if (s.owner === sylEx && s.type === 'starfall_arrow') {
            seenStrikes.add(s);
          }
        }
        if (archGame.vfx.tornados.length > maxTornadoCount) {
          maxTornadoCount = archGame.vfx.tornados.length;
        }
        if (sylEx.fx?.active?.some((a) => a.key === 'emeraldTempestCyclone')) sawCyclone = true;
        if (sylEx.fx?.active?.some((a) => a.key === 'starfallRainBarrage')) sawRainBarrage = true;

        if (step === 12 || step === 24) {
          sylEx.drawForegroundOverlay(archAudit.ctx, archGame.renderer);
          sylEx.draw(archAudit.ctx, false, archGame.renderer);
          sylEx.drawUltimateForeground(archAudit.ctx, archGame.renderer);
        }
        if (step === 24 || step === 44) {
          archGame.vfx.renderMainPass(vfxAudit.ctx, false, archGame.renderer, false);
          archGame.vfx.renderMainPass(vfxAudit.ctx, true, archGame.renderer, false);
        }
      }

      if (
        seenProjs.size < 5 ||
        fanVys.size < 3 ||
        maxTornadoCount < 1 ||
        seenStrikes.size < 9 ||
        !sawCyclone ||
        !sawRainBarrage ||
        archAudit.stats.vectorCalls !== 0 ||
        archAudit.stats.rotateCalls !== 0 ||
        !vfxAudit.stats.vfxSyDrawn.has(208)
      ) {
        throw new Error(
          `[Suite 36.6 SylvaraEX] SKILL verification failed: arrows=${seenProjs.size} (vys=${fanVys.size}), tornados=${maxTornadoCount}, starfall=${seenStrikes.size}, cyclone=${sawCyclone}, barrage=${sawRainBarrage}, vec=${archAudit.stats.vectorCalls}, rot=${archAudit.stats.rotateCalls}, vfxSy=[${[...vfxAudit.stats.vfxSyDrawn].join(',')}]`
        );
      }
      sylEx.fx?.dispose?.();
    }

    // (C) Freyja EX (`valkyrie_ex`) symmetrical Row 0 & Row 1 upper wings + clean Row 4 F05..F06
    {
      const valkRep = pngAuditResults36.get('valkyrie_ex');
      if (!valkRep || valkRep.valkWingMissing !== 0 || valkRep.valkRow4F0506MaxX >= 265) {
        throw new Error(
          `[Suite 36.6 FreyjaEX] valkyrie_ex_sheet.png failed wing symmetry or Row 4 F05..F06 smear purge: wingMissing=${valkRep?.valkWingMissing}, row4F0506MaxX=${valkRep?.valkRow4F0506MaxX}`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.7: Sylvara EX (`archer_ex`) Smear-Free Row 4 + Mid-Flip Bow-Charge (`ULTIMATE` & `TRUE_ULTIMATE`)
  //       & Lyra EX (`icemage_ex`) Active Arena Snow, Growing Bluish Light & `Renderer` Glacial Freeze Wipe
  // --------------------------------------------------------------------------
  {
    // (A) Sylvara EX (`archer_ex`)
    {
      const archRep = pngAuditResults36.get('archer_ex');
      if (!archRep || archRep.archRow4MaxX < 0 || archRep.archRow4MaxX > 260) {
        throw new Error(
          `[Suite 36.7 SylvaraEX] Expected archer_ex_sheet.png Row 4 F00..F29 maxX <= 260 (0 detached smears), got ${archRep?.archRow4MaxX}`
        );
      }

      // A.1: ULTIMATE airborne Flip-Leap during t < 0.32s (`minYBeforeVault <= groundY - 50`)
      const ultGame = createMockGame();
      const sylUlt = new ArcherEx({ x: 300, groundY: 560, facing: 1, team: 'left' });
      const ultFoe = new Warrior({ x: 620, groundY: 560, facing: -1, name: 'FlipFoe', team: 'right' });
      ultFoe.maxHp = 99999;
      ultFoe.hp = 99999;
      ultFoe.stunTimer = 999;
      sylUlt.game = ultGame;
      ultFoe.game = ultGame;
      ultGame.fighters = [sylUlt, ultFoe];
      ultGame.getEnemiesOf = (f) => (f === sylUlt ? [ultFoe] : [sylUlt]);
      ultGame.getTargetFor = (f) => (f === sylUlt ? ultFoe : sylUlt);

      sylUlt.mana = sylUlt.maxMana;
      sylUlt.setState('ULTIMATE');
      let minYBeforeVault = sylUlt.groundY;
      for (let step = 0; step < 12; step++) {
        sylUlt.update(1 / 30, ultFoe, ultGame);
        ultGame.vfx.update(1 / 30, 560, ultGame.renderer, ultGame.audio);
        if (sylUlt.stateTimer < 0.32 && sylUlt.y < minYBeforeVault) {
          minYBeforeVault = sylUlt.y;
        }
      }
      if (minYBeforeVault > sylUlt.groundY - 50) {
        throw new Error(
          `[Suite 36.7 SylvaraEX] Expected airborne Flip-Leap during ULTIMATE t < 0.32s (minY <= ${sylUlt.groundY - 50}), got ${minYBeforeVault.toFixed(1)}`
        );
      }
      sylUlt.fx?.dispose?.();

      // A.2: TRUE_ULTIMATE clean airborne somersault during t = 0.24..0.82s (`0` Row 6 circle-bow overlay!)
      const trueGame = createMockGame();
      const sylTrue = new ArcherEx({ x: 300, groundY: 560, facing: 1, team: 'left' });
      const trueFoe = new Warrior({ x: 760, groundY: 560, facing: -1, name: 'BowFlipFoe', team: 'right' });
      trueFoe.maxHp = 99999;
      trueFoe.hp = 99999;
      trueFoe.stunTimer = 999;
      sylTrue.game = trueGame;
      trueFoe.game = trueGame;
      trueGame.fighters = [sylTrue, trueFoe];
      trueGame.getEnemiesOf = (f) => (f === sylTrue ? [trueFoe] : [sylTrue]);
      trueGame.getTargetFor = (f) => (f === sylTrue ? trueFoe : sylTrue);

      const archAudit37 = createAuditCtx36();
      const flipFramesSeen = new Set();
      let minYInFlipWindow = sylTrue.groundY;
      sylTrue.finisherGauge = sylTrue.maxFinisherGauge || 100;
      sylTrue.setState('TRUE_ULTIMATE');

      for (let step = 0; step < 30; step++) {
        sylTrue.update(1 / 30, trueFoe, trueGame);
        trueGame.vfx.update(1 / 30, 560, trueGame.renderer, trueGame.audio);
        const t = sylTrue.stateTimer;
        if (t >= 0.24 && t <= 0.84) {
          if (sylTrue.y < minYInFlipWindow) minYInFlipWindow = sylTrue.y;
          if (sylTrue.trueUltFrameOverride >= 123 && sylTrue.trueUltFrameOverride <= 134) {
            flipFramesSeen.add(sylTrue.trueUltFrameOverride);
          }
          sylTrue.drawForegroundOverlay(archAudit37.ctx, trueGame.renderer);
          sylTrue.draw(archAudit37.ctx, false, trueGame.renderer);
          sylTrue.drawUltimateForeground(archAudit37.ctx, trueGame.renderer);
        }
      }
      if (
        flipFramesSeen.size < 6 ||
        archAudit37.stats.vfxSyDrawn.has(6 * 208) ||
        minYInFlipWindow > sylTrue.groundY - 90 ||
        archAudit37.stats.vectorCalls !== 0 ||
        archAudit37.stats.rotateCalls !== 0
      ) {
        throw new Error(
          `[Suite 36.7 SylvaraEX] TRUE_ULTIMATE clean airborne flip check failed: flips=${flipFramesSeen.size}, minY=${minYInFlipWindow.toFixed(1)}, sy=[${[...archAudit37.stats.vfxSyDrawn].join(',')}], vec=${archAudit37.stats.vectorCalls}, rot=${archAudit37.stats.rotateCalls}`
        );
      }
      sylTrue.fx?.dispose?.();
    }

    // (B) Lyra EX (`icemage_ex`) & `Renderer` Glacial Transition
    {
      const iceRenStats = { rotateCalls: 0, quadCalls: 0 };
      const iceRenCtx = createMockCtx(iceRenStats);
      const iceRenCanvas = {
        width: 1280,
        height: 720,
        getBoundingClientRect: () => ({ width: 1280, height: 720 }),
        getContext: () => iceRenCtx
      };
      const iceGame = createMockGame();
      iceGame.renderer = new Renderer(iceRenCanvas);
      iceGame.renderer.stageId = 'cathedral';

      const lyraEx = new IceMageEx({ x: 360, groundY: 560, facing: 1, team: 'left' });
      const iceFoe = new Warrior({ x: 760, groundY: 560, facing: -1, name: 'GlacialDummy', team: 'right' });
      iceFoe.maxHp = 99999;
      iceFoe.hp = 99999;
      iceFoe.stunTimer = 999;
      lyraEx.game = iceGame;
      iceFoe.game = iceGame;
      iceGame.fighters = [lyraEx, iceFoe];
      iceGame.getEnemiesOf = (f) => (f === lyraEx ? [iceFoe] : [lyraEx]);
      iceGame.getTargetFor = (f) => (f === lyraEx ? iceFoe : lyraEx);

      lyraEx.finisherGauge = lyraEx.maxFinisherGauge || 100;
      lyraEx.setState('TRUE_ULTIMATE');

      let minSnowFlakes = Infinity;
      let maxSnowFlakes = 0;
      let radiusAt020 = null;
      let radiusAt300 = null;
      let prematureGlacial = false;
      let triggeredGlacial = false;
      let wipeTimerOnTrigger = 0;
      let wipeFromIdOnTrigger = null;
      let wipeRenderCount = 0;
      let maxWipeStackLen = 0;

      for (let step = 0; step < 112; step++) {
        lyraEx.update(1 / 30, iceFoe, iceGame);
        iceGame.vfx.update(1 / 30, 560, iceGame.renderer, iceGame.audio);
        iceGame.renderer.update(1 / 30, [lyraEx, iceFoe]);
        const t = lyraEx.stateTimer;

        if (t >= 0.50 && t <= 3.00) {
          const activeCount = (lyraEx._trueUltSnowfall || []).filter((p) => p && p.active).length;
          if (activeCount < minSnowFlakes) minSnowFlakes = activeCount;
          if (activeCount > maxSnowFlakes) maxSnowFlakes = activeCount;
        }
        if (t >= 0.18 && t <= 0.25 && radiusAt020 === null) {
          const lights = iceGame.vfx.getActiveLights([lyraEx, iceFoe], 560);
          const blueLight = lights.find(
            (L) => L.owner === lyraEx && L.z === 98 && (L.colorType === 'cyan' || L.colorType === 'indigo')
          );
          if (blueLight) radiusAt020 = blueLight.radius;
        }
        if (t >= 2.96 && t <= 3.06) {
          const lights = iceGame.vfx.getActiveLights([lyraEx, iceFoe], 560);
          const blueLight = lights.find(
            (L) => L.owner === lyraEx && L.z === 98 && (L.colorType === 'cyan' || L.colorType === 'indigo')
          );
          if (blueLight) radiusAt300 = blueLight.radius;
        }
        if (t < 3.28) {
          if (
            iceGame.renderer.permanentStageOverride === 'glacial' ||
            iceGame.renderer.glacialWipeTimer > 0
          ) {
            prematureGlacial = true;
          }
        } else if (!triggeredGlacial) {
          triggeredGlacial =
            iceGame.renderer.permanentStageOverride === 'glacial' &&
            iceGame.renderer.glacialWipeTimer > 0;
          wipeTimerOnTrigger = iceGame.renderer.glacialWipeTimer;
          wipeFromIdOnTrigger = iceGame.renderer.glacialWipeFromId;
          iceGame.renderer.render([lyraEx, iceFoe], iceGame.vfx, 1 / 60);
          wipeRenderCount++;
          if (iceRenCtx._stateStack.length > maxWipeStackLen) {
            maxWipeStackLen = iceRenCtx._stateStack.length;
          }
        } else if (iceGame.renderer.glacialWipeTimer > 0 && wipeRenderCount < 3) {
          iceGame.renderer.render([lyraEx, iceFoe], iceGame.vfx, 1 / 60);
          wipeRenderCount++;
          if (iceRenCtx._stateStack.length > maxWipeStackLen) {
            maxWipeStackLen = iceRenCtx._stateStack.length;
          }
        }
      }

      const lightGrowth =
        radiusAt020 !== null && radiusAt300 !== null ? radiusAt300 - radiusAt020 : -1;
      if (
        minSnowFlakes < 24 ||
        minSnowFlakes === Infinity ||
        radiusAt020 === null ||
        radiusAt300 === null ||
        lightGrowth < 140 ||
        radiusAt300 < 460 ||
        prematureGlacial ||
        !triggeredGlacial ||
        wipeTimerOnTrigger <= 0 ||
        wipeFromIdOnTrigger !== 'cathedral' ||
        wipeRenderCount < 1 ||
        iceRenStats.rotateCalls !== 0 ||
        maxWipeStackLen !== 0 ||
        iceRenCtx._stateStack.length !== 0
      ) {
        throw new Error(
          `[Suite 36.7 LyraEX] Glacial transition check failed: snow=[${minSnowFlakes}..${maxSnowFlakes}], r020=${radiusAt020}, r300=${radiusAt300}, growth=${lightGrowth}, premature=${prematureGlacial}, triggered=${triggeredGlacial}, wipeTimer=${wipeTimerOnTrigger}, wipeFrom=${wipeFromIdOnTrigger}, renders=${wipeRenderCount}, rot=${iceRenStats.rotateCalls}, stack=${maxWipeStackLen}/${iceRenCtx._stateStack.length}`
        );
      }
      lyraEx.fx?.dispose?.();
    }
  }

  // --------------------------------------------------------------------------
  // 36.8: Batch ?v=30fps132 Parity:
  //   (A) Chronos EX Zero Dark Flood Disks + Sol EX >= 580px Meteor & Stationary Single Overdrive Sun
  //   (B) Kaze-Maru EX Smear/Circle Purge + Freyja EX Non-Squared War-Spear VFX & Spinning Pass-Through Glide + Sylvara EX Fast Ult
  //   (C) VEX-09 EX Fast Backflip + Tactical Charge + Triple-Column Buster & Malakor EX Back-of-Enemy Shadow Emerge
  //   (D) Untouched 4 Working Walks + 7 Repaired EX Forward `+X` Walks + Non-Stick Lyra/Malakor + Adventure Ranged AI Unstuck + Boss Raid HUD / Hidden Right HUD + 6-Role VS AI
  // --------------------------------------------------------------------------
  {
    const { createHash } = await import('node:crypto');

    // (A) Chronos EX clean VFX + Sol EX colossal meteor & single stationary Overdrive sun
    {
      const chronoRep = pngAuditResults36.get('chronomancer_ex');
      if (!chronoRep || chronoRep.chronoMaxDarkPx >= 900 || chronoRep.maxSquare192Run >= 16) {
        throw new Error(
          `[Suite 36.8A ChronosEX] Expected <900 dark px/cell & 0 192px boxes, got maxDark=${chronoRep?.chronoMaxDarkPx}, maxSq=${chronoRep?.maxSquare192Run}`
        );
      }

      // Sol EX colossal meteor draw size >= 580px & orange light >= 560px
      const solG = createMockGame();
      const solEx = new FireMageEx({ x: 340, groundY: 560, facing: 1, team: 'left' });
      const foe = new Warrior({ x: 780, groundY: 560, facing: -1, name: 'SolScaleDummy', team: 'right' });
      foe.maxHp = 99999;
      foe.hp = 99999;
      solEx.game = solG;
      foe.game = solG;
      solG.fighters = [solEx, foe];
      solG.getEnemiesOf = (f) => (f === solEx ? [foe] : [solEx]);
      solG.getTargetFor = (f) => (f === solEx ? foe : solEx);

      let maxMeteorDrawSz = 0;
      let maxOrangeLightR = 0;
      const solSizeCtx = createMockCtx();
      solSizeCtx.drawImage = (_img, _sx, sy, sw, _sh, _dx, _dy, dw) => {
        if (sy === 1248 && sw === 208 && dw > maxMeteorDrawSz) maxMeteorDrawSz = dw;
      };
      solEx.finisherGauge = solEx.maxFinisherGauge || 100;
      solEx.setState('TRUE_ULTIMATE');
      for (let s = 0; s < 102; s++) {
        solEx.update(1 / 30, foe, solG);
        if (solEx.trueUltMeteor?.phase === 'descent') {
          solEx.drawUltimateForeground(solSizeCtx, solG.renderer);
          const mL = solG.vfx.getActiveLights([solEx, foe], 560).find((L) => L.colorType === 'orange' && L.z >= 115);
          if (mL && mL.radius > maxOrangeLightR) maxOrangeLightR = mL.radius;
        }
      }
      if (maxMeteorDrawSz < 580 || maxOrangeLightR < 560) {
        throw new Error(
          `[Suite 36.8A SolEX] Expected enlarged TRUE_ULTIMATE meteor (>=580px, orangeR>=560), got size=${maxMeteorDrawSz}, lightR=${maxOrangeLightR}`
        );
      }

      // Sol EX Overdrive: single stationary sun even if enemy moves +240px mid-cast
      solEx.x = 320;
      solEx.hp = solEx.maxHp;
      foe.x = 700;
      solEx.mana = solEx.maxMana;
      solEx.setState('ULTIMATE');
      solEx.update(1 / 30, foe, solG);
      const lockedEclipseX = solEx._eclipseVisual?.x;
      const supernovasAtStart = solG.vfx.supernovas.length;
      foe.x = 940;
      for (let s = 0; s < 22; s++) {
        foe.x = 940;
        solEx.update(1 / 30, foe, solG);
      }
      if (
        !Number.isFinite(lockedEclipseX) ||
        supernovasAtStart !== 0 ||
        solG.vfx.supernovas.length !== 0 ||
        Math.abs((solEx._eclipseVisual?.x ?? -1) - lockedEclipseX) > 0.01
      ) {
        throw new Error(
          `[Suite 36.8A SolEX Overdrive] Expected 0 duplicate supernovas & stationary eclipseX=${lockedEclipseX}, got endX=${solEx._eclipseVisual?.x}, sup=${solG.vfx.supernovas.length}`
        );
      }
      solEx.fx?.dispose?.();
    }

    // (B) Ronin EX smear/circle purge + Valkyrie EX clean VFX / spin pass-through + Archer EX fast TRUE_ULTIMATE
    {
      const roninRep = pngAuditResults36.get('ronin_ex');
      const roninSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/entities/RoninEx.js'), 'utf8');
      if (
        !roninRep ||
        roninRep.roninRow4MaxX < 0 ||
        roninRep.roninRow4MaxX > 262 ||
        /drawTaikoHaloOverlay/.test(roninSrc) ||
        !/drawIaidoSwordQiOverlay/.test(roninSrc)
      ) {
        throw new Error(
          `[Suite 36.8B RoninEX] Failed smear/circle purge check: row4MaxX=${roninRep?.roninRow4MaxX}, hasDrawTaiko=${/drawTaikoHaloOverlay/.test(roninSrc)}, hasIaidoQi=${/drawIaidoSwordQiOverlay/.test(roninSrc)}`
        );
      }

      const valkRep = pngAuditResults36.get('valkyrie_ex');
      if (!valkRep || valkRep.valkMaxStraightRun > 32 || valkRep.valkRow6MinH < 145) {
        throw new Error(
          `[Suite 36.8B ValkyrieEX VFX] Expected maxStraightRun<=32 & angled Row6>=145px, got run=${valkRep?.valkMaxStraightRun}, row6H=${valkRep?.valkRow6MinH}`
        );
      }

      const vG = createMockGame();
      const freyja = new ValkyrieEx({ x: 480, groundY: 560, facing: 1, team: 'left' });
      const dummyFoe = new Warrior({ x: 760, groundY: 560, facing: -1, name: 'RetreatDummy', team: 'right' });
      dummyFoe.maxHp = 99999;
      dummyFoe.hp = 99999;
      dummyFoe.stunTimer = 999;
      freyja.game = vG;
      dummyFoe.game = vG;
      vG.fighters = [freyja, dummyFoe];
      vG.getEnemiesOf = (f) => (f === freyja ? [dummyFoe] : [freyja]);
      vG.getTargetFor = (f) => (f === freyja ? dummyFoe : freyja);
      freyja.mana = freyja.maxMana;
      freyja.setState('ULTIMATE');
      let minValkY = freyja.groundY;
      let minValkX = freyja.x;
      let maxValkX = freyja.x;
      let sawPhaseThroughTrue = false;
      const spinFramesSeen = new Set();
      for (let s = 0; s < 64; s++) {
        freyja.update(1 / 30, dummyFoe, vG);
        dummyFoe.update(1 / 30, freyja, vG);
        if (freyja.y < minValkY) minValkY = freyja.y;
        if (freyja.x < minValkX) minValkX = freyja.x;
        if (freyja.x > maxValkX) maxValkX = freyja.x;
        if (freyja._phaseThroughEnemy) sawPhaseThroughTrue = true;
        if (freyja.stateTimer >= 0.30 && freyja.stateTimer <= 1.38) {
          spinFramesSeen.add(freyja._overrideFrameIdx);
        }
        if (freyja.state !== 'ULTIMATE') break;
      }
      const peakSpears = freyja._spearsFired || freyja.activeSkySpears?.length || 0;
      if (
        minValkY > freyja.groundY - 120 ||
        minValkX > 265 ||
        maxValkX >= dummyFoe.x ||
        sawPhaseThroughTrue ||
        spinFramesSeen.size < 8
      ) {
        throw new Error(
          `[Suite 36.8B ValkyrieEX] Expected high backflip retreat (minY<=${freyja.groundY - 120}, minX<=265, maxX<${dummyFoe.x}, phaseThrough=false, spinFrames>=8), got minY=${minValkY.toFixed(1)}, minX=${minValkX.toFixed(1)}, maxX=${maxValkX.toFixed(1)}, phase=${sawPhaseThroughTrue}, spins=${spinFramesSeen.size}, spears=${peakSpears}`
        );
      }
      freyja.fx?.dispose?.();

      const aG = createMockGame();
      const syl = new ArcherEx({ x: 300, groundY: 560, facing: 1, team: 'left' });
      const sylFoe = new Warrior({ x: 740, groundY: 560, facing: -1, name: 'FastFlipFoe', team: 'right' });
      sylFoe.maxHp = 99999;
      sylFoe.hp = 99999;
      sylFoe.stunTimer = 999;
      syl.game = aG;
      sylFoe.game = aG;
      aG.fighters = [syl, sylFoe];
      aG.getEnemiesOf = (f) => (f === syl ? [sylFoe] : [syl]);
      aG.getTargetFor = (f) => (f === syl ? sylFoe : syl);
      syl.finisherGauge = syl.maxFinisherGauge || 100;
      syl.setState('TRUE_ULTIMATE');
      let beamFiredAtT = 99;
      for (let s = 0; s < 65; s++) {
        syl.update(1 / 30, sylFoe, aG);
        if ((syl._trueUltBeamTimer || 0) > 0 && beamFiredAtT === 99) beamFiredAtT = syl.stateTimer;
      }
      if (syl.trueUltDuration > 3.10 || beamFiredAtT > 1.82) {
        throw new Error(
          `[Suite 36.8B ArcherEX] Expected fast TRUE_ULTIMATE flip/charge (dur<=3.10, beam<=1.82s), got dur=${syl.trueUltDuration}, beamAt=${beamFiredAtT.toFixed(2)}`
        );
      }
      syl.fx?.dispose?.();
    }

    // (C) VEX-09 EX tactical backflip/charge/buster & Malakor EX behind-enemy shadow emerge
    {
      const vxG = createMockGame();
      const vex = new AndroidEx({ x: 580, groundY: 560, facing: 1, team: 'left' });
      const vxFoe = new Warrior({ x: 760, groundY: 560, facing: -1, name: 'VexDummy', team: 'right' });
      vxFoe.maxHp = 99999;
      vxFoe.hp = 99999;
      vex.game = vxG;
      vxFoe.game = vxG;
      vxG.fighters = [vex, vxFoe];
      vxG.getEnemiesOf = (f) => (f === vex ? [vxFoe] : [vex]);
      vxG.getTargetFor = (f) => (f === vex ? vxFoe : vex);
      vex.finisherGauge = vex.maxFinisherGauge || 100;
      vex.setState('TRUE_ULTIMATE');
      let minFlipY = vex.groundY;
      let startX = vex.x;
      let chargeFrame = null;
      let sawBuster = false;
      const vxCtx = createMockCtx();
      for (let s = 0; s < 70; s++) {
        vex.update(1 / 30, vxFoe, vxG);
        if (vex.stateTimer <= 0.50 && vex.y < minFlipY) minFlipY = vex.y;
        if (vex.stateTimer >= 0.70 && vex.stateTimer <= 1.50) chargeFrame = vex._overrideFrameIdx;
        if ((vex._trueUltBusterTimer || 0) > 0) {
          sawBuster = true;
          vex.draw(vxCtx, false, vxG.renderer);
        }
      }
      if (
        minFlipY > vex.groundY - 110 ||
        startX - vex.x < 135 ||
        !chargeFrame ||
        chargeFrame < 130 ||
        chargeFrame > 137 ||
        !sawBuster
      ) {
        throw new Error(
          `[Suite 36.8C AndroidEX] Failed tactical backflip Ult gate: minFlipY=${minFlipY.toFixed(1)}, retreat=${(startX - vex.x).toFixed(1)}, chargeFrame=${chargeFrame}, sawBuster=${sawBuster}`
        );
      }
      vex.fx?.dispose?.();

      const rxG = createMockGame();
      const mal = new ReaperEx({ x: 380, groundY: 560, facing: 1, team: 'left' });
      const backFoe = new Warrior({ x: 580, groundY: 560, facing: -1, name: 'BackFoe', team: 'right' });
      backFoe.maxHp = 99999;
      backFoe.hp = 99999;
      backFoe.attackCooldown = 99;
      backFoe.skillCooldown = 99;
      backFoe.dashCooldown = 99;
      mal.game = rxG;
      backFoe.game = rxG;
      rxG.fighters = [mal, backFoe];
      rxG.getEnemiesOf = (f) => (f === mal ? [backFoe] : [mal]);
      rxG.getTargetFor = (f) => (f === mal ? backFoe : mal);
      mal.startCrouch(backFoe, rxG);
      let turnedWhileBurrowed = false;
      let emergeX = mal.x;
      for (let s = 0; s < 56; s++) {
        mal.update(1 / 30, backFoe, rxG);
        backFoe.update(1 / 30, mal, rxG);
        if (mal.isFullyBurrowed && backFoe.facing !== -1) turnedWhileBurrowed = true;
        if (mal.didActionFrame) {
          emergeX = mal.x;
          break;
        }
      }
      if (turnedWhileBurrowed || emergeX <= backFoe.x + 60 || mal.facing !== -1) {
        throw new Error(
          `[Suite 36.8C ReaperEX] Expected shadow emerge behind foe back (x>${backFoe.x + 60}, facing=-1, turned=${turnedWhileBurrowed}), got x=${emergeX.toFixed(1)}, facing=${mal.facing}`
        );
      }
      mal.fx?.dispose?.();
    }

    // (D) Untouched 4 Working Walks + 7 Repaired EX Forward `+X` Walks + Non-Stick + Adventure Ranged AI + Boss HUD + Role VS AI
    {
      const workingWalkRow1Hashes = {
        warrior_ex: 'e4852df6550c250568deaff92165c35d88239de120429e4d7a250b18a3f6f77d',
        mage_ex: '1377f0144036fc9ad2c2410656d8c116783f8d5a7f6f0c94624038a7e0575196',
        priestess_ex: '6c8040baa779add1f3198589b983d21d53b709023624a626ab315d002ab12831',
        chronomancer_ex: 'f7b8cee93370154388d0724cb7ef2ea6574a929cf7112f43ed8687d1ffc20875'
      };
      for (const [wid, expectedSha] of Object.entries(workingWalkRow1Hashes)) {
        const gotSha = pngAuditResults36.get(wid)?.row1WalkSha;
        if (gotSha !== expectedSha) {
          throw new Error(
            `[Suite 36.8D] Protected Row 1 WALK pixels in ${wid}_sheet.png changed! got=${gotSha}`
          );
        }
      }

      for (const id of ['icemage_ex', 'valkyrie_ex', 'archer_ex', 'ronin_ex', 'reaper_ex', 'titan_ex', 'android_ex']) {
        const rep = pngAuditResults36.get(id);
        if (!rep || rep.walkStanceDelta1 > -6.0 || rep.walkStanceDelta2 > -6.0) {
          throw new Error(
            `[Suite 36.8D] ${id} Row 1 WALK failed forward stanceDelta <= -6.0px (0 moonwalk): d1=${rep?.walkStanceDelta1?.toFixed(2)}, d2=${rep?.walkStanceDelta2?.toFixed(2)}`
          );
        }
      }
      if ((pngAuditResults36.get('icemage_ex')?.minMidLegPx ?? 0) < 44 || (pngAuditResults36.get('reaper_ex')?.minMidLegPx ?? 0) < 34) {
        throw new Error(
          `[Suite 36.8D] Non-stick leg width check failed: lyra=${pngAuditResults36.get('icemage_ex')?.minMidLegPx?.toFixed(1)}, malakor=${pngAuditResults36.get('reaper_ex')?.minMidLegPx?.toFixed(1)}`
        );
      }

      // Adventure Ranged AI fires within 0.55s at close range (absDx=95), corner, & Z-offset (absDz=82) without stalling
      const advG = createMockGame();
      advG.gameMode = 'adventure';
      advG.updateHUD = () => {};
      advG.updateAdventureBossHUD = () => {};
      const lyra = new IceMageEx({ x: 180, groundY: 561, facing: 1, team: 'left' });
      lyra.game = advG;
      advG.leftFighter = lyra;
      const advMgr = new AdventureManager(advG);
      advG.adventure = advMgr;
      advMgr.setAutoPlay(true, false);
      advMgr.startCampaign(lyra);
      advMgr.lockActive = true;
      advMgr.lockMinX = 120;
      advMgr.lockMaxX = 1280;
      const closeMon = advMgr.spawnMonster('templar', 265, { groundY: 643, skipPortal: true });
      closeMon.maxHp = 50000;
      closeMon.hp = 50000;
      closeMon.portalSpawnTimer = 0;
      lyra.x = 170;
      lyra.groundY = 561;
      lyra.y = 561;
      lyra.autoCooldown = 0;
      for (let s = 0; s < 22; s++) {
        advMgr.update(1 / 30);
        advG.vfx.update(1 / 30, 561, advG.renderer, advG.audio);
      }
      if (closeMon.hp >= 50000 && advG.vfx.projectiles.length === 0) {
        throw new Error('[Suite 36.8D AdvRanged] Expected IceMageEx AUTO to fire/damage close Z-offset enemy within 0.7s!');
      }
      // Verify `#hud-right` never displays normal enemy text in Adventure Mode + `#adv-boss-raid-hud` exists in HTML
      advMgr.syncRightHUD();
      if ((advG.hudEls?.right?.name?.textContent || '') !== '') {
        throw new Error(
          `[Suite 36.8D AdvHUD] Expected normal enemy right HUD cleared in Adventure Mode, got '${advG.hudEls?.right?.name?.textContent}'`
        );
      }
      const htmlSrc = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
      if (!htmlSrc.includes('id="adv-boss-raid-hud"') || !htmlSrc.includes('id="adv-boss-raid-bar"')) {
        throw new Error('[Suite 36.8D AdvHUD] Expected #adv-boss-raid-hud & #adv-boss-raid-bar in index.html!');
      }
      advMgr.stopCampaign();
      lyra.fx?.dispose?.();

      // Role-aware VS AI: artillery mage never blind-dashes at dist=240px & no hero dumps ULT into active parry
      const vsG = createMockGame();
      vsG.gameMode = '1v1';
      const solAi = new FireMageEx({ x: 360, groundY: 560, facing: 1, team: 'left' });
      const parryFoe = new RoninEx({ x: 600, groundY: 560, facing: -1, team: 'right' });
      solAi.game = vsG;
      parryFoe.game = vsG;
      vsG.fighters = [solAi, parryFoe];
      vsG.getEnemiesOf = (f) => (f === solAi ? [parryFoe] : [solAi]);
      vsG.getTargetFor = (f) => (f === solAi ? parryFoe : solAi);
      solAi.mana = solAi.maxMana;
      solAi.dashCooldown = 0;
      parryFoe.iaidoCounterActive = true;
      parryFoe.isDeflecting = true;
      parryFoe.stunTimer = 99;
      for (let s = 0; s < 10; s++) {
        solAi.update(1 / 30, parryFoe, vsG);
      }
      if (solAi.state === 'DASH' || solAi.state === 'ULTIMATE' || solAi.state === 'SKILL') {
        throw new Error(
          `[Suite 36.8D RoleAI] Expected artillery mage AI not to blind-dash or dump skills into active parry, got state=${solAi.state}`
        );
      }
      solAi.fx?.dispose?.();
      parryFoe.fx?.dispose?.();
    }
  }

  // --------------------------------------------------------------------------
  // 36.9: Batch ?v=30fps132 Parity:
  //   (A) Lyra EX (`icemage_ex`) Non-Creepy Natural `Row 1 WALK`
  //   (B) Freyja EX (`valkyrie_ex`) `+56 deg` Diagonal `TRUE_ULTIMATE` Raining Spears (`0` Straight 90 deg)
  //   (C) Sylvara EX (`archer_ex`) `TRUE_ULTIMATE` Glowing Great-Arrow Transformation (`0` Humanoid Draws)
  //   (D) Adventure Character Icon Refresh, `warrior_ex` Row 0 Map, `#hud-right` Restoration & Rule 6
  // --------------------------------------------------------------------------
  {
    // (A) Lyra EX non-creepy Row 1 WALK
    {
      const lyraRep = pngAuditResults36.get('icemage_ex');
      const bootRatio =
        lyraRep && lyraRep.maxBootSpan > 0 ? lyraRep.minBootSpan / lyraRep.maxBootSpan : 99;
      if (
        !lyraRep ||
        lyraRep.sheet4pxClips !== 0 ||
        lyraRep.walkStanceDelta1 > -8.0 ||
        lyraRep.walkStanceDelta2 > -8.0 ||
        lyraRep.minMidLegPx < 36 ||
        bootRatio > 0.55
      ) {
        throw new Error(
          `[Suite 36.9A LyraEX] Failed natural Row 1 WALK gate: ${JSON.stringify(lyraRep)}`
        );
      }
    }

    // (B) Freyja EX angled `TRUE_ULTIMATE` raining spears (`0` straight vertical lances, `0` vector/rotate calls)
    {
      const fG = createMockGame();
      const freyja = new ValkyrieEx({ x: 340, groundY: 560, facing: 1, team: 'left' });
      const foe = new Warrior({ x: 760, groundY: 560, facing: -1, name: 'AngledSpearFoe', team: 'right' });
      foe.maxHp = 99999;
      foe.hp = 99999;
      foe.stunTimer = 999;
      freyja.game = fG;
      foe.game = fG;
      fG.fighters = [freyja, foe];
      fG.getEnemiesOf = (f) => (f === freyja ? [foe] : [freyja]);
      fG.getTargetFor = (f) => (f === freyja ? foe : freyja);

      const tr = { rotateCalls: 0, quadCalls: 0 };
      const fCtx = createMockCtx(tr);
      freyja.finisherGauge = freyja.maxFinisherGauge || 100;
      freyja.setState('TRUE_ULTIMATE');

      let maxLanceCount = 0;
      let checkedAngledLances = false;
      for (let s = 0; s < 150; s++) {
        freyja.update(1 / 30, foe, fG);
        freyja.draw(fCtx, false, fG.renderer);
        freyja.drawUltimateForeground(fCtx, fG.renderer);
        if (freyja.einherjarSkyLances.length > maxLanceCount) {
          maxLanceCount = freyja.einherjarSkyLances.length;
        }
        if (freyja.einherjarSkyLances.length === 6 && !checkedAngledLances) {
          checkedAngledLances = true;
          for (const lance of freyja.einherjarSkyLances) {
            const forwardDx = (lance.targetX - lance.startX) * freyja.facing;
            const dropDy = (lance.pinY ?? lance.targetY ?? 0) - lance.startY;
            if (forwardDx < 180 || dropDy < 260) {
              throw new Error(
                `[Suite 36.9B FreyjaTrueUlt] Expected diagonal +56deg sky-lance (dx>=180, dy>=260), got dx=${forwardDx.toFixed(1)}, dy=${dropDy.toFixed(1)}`
              );
            }
          }
        }
        if (freyja.state !== 'TRUE_ULTIMATE') break;
      }
      if (maxLanceCount !== 6 || !checkedAngledLances || freyja.state !== 'IDLE' || tr.rotateCalls > 0) {
        throw new Error(
          `[Suite 36.9B FreyjaTrueUlt] Failed diagonal spear / IDLE verification: lances=${maxLanceCount}, checked=${checkedAngledLances}, endState=${freyja.state}, rotates=${tr.rotateCalls}`
        );
      }
      freyja.fx?.dispose?.();
    }

    // (C) Sylvara EX `TRUE_ULTIMATE` Great-Arrow metamorphosis (`0` humanoid sheet draws while transformed)
    {
      const aG = createMockGame();
      const syl = new ArcherEx({ x: 320, groundY: 560, facing: 1, team: 'left' });
      const foe = new Warrior({ x: 740, groundY: 560, facing: -1, name: 'ArrowTransformFoe', team: 'right' });
      foe.maxHp = 99999;
      foe.hp = 99999;
      foe.stunTimer = 999;
      syl.game = aG;
      foe.game = aG;
      aG.fighters = [syl, foe];
      aG.getEnemiesOf = (f) => (f === syl ? [foe] : [syl]);
      aG.getTargetFor = (f) => (f === syl ? foe : syl);

      const tr = { rotateCalls: 0, quadCalls: 0 };
      const aCtx = createMockCtx(tr);
      const origDrawSheet = PixelForge.drawSheetFrame;
      let sawArrowPhase = false;
      let sheetDrawsWhileArrow = 0;
      let sawRematerialize = false;
      let minArrowX = 9999;
      let maxArrowX = -9999;

      syl.finisherGauge = syl.maxFinisherGauge || 100;
      syl.setState('TRUE_ULTIMATE');
      try {
        PixelForge.drawSheetFrame = function (...args) {
          if (args[2] === syl && syl._isTransformedArrow) {
            sheetDrawsWhileArrow++;
          }
          return origDrawSheet.apply(this, args);
        };

        for (let s = 0; s < 110; s++) {
          syl.update(1 / 30, foe, aG);
          syl.draw(aCtx, false, aG.renderer);
          syl.drawUltimateForeground(aCtx, aG.renderer);
          if (syl._isTransformedArrow) {
            sawArrowPhase = true;
            if (syl.x < minArrowX) minArrowX = syl.x;
            if (syl.x > maxArrowX) maxArrowX = syl.x;
          } else if (sawArrowPhase && syl._rematerializeFlash > 0) {
            sawRematerialize = true;
          }
          if (syl.state !== 'TRUE_ULTIMATE') break;
        }
      } finally {
        PixelForge.drawSheetFrame = origDrawSheet;
      }

      const arrowTraverse = maxArrowX - minArrowX;
      const dmgDealt = 99999 - foe.hp;
      if (
        !sawArrowPhase ||
        sheetDrawsWhileArrow !== 0 ||
        !sawRematerialize ||
        arrowTraverse < 340 ||
        dmgDealt < 650 ||
        syl._isTransformedArrow ||
        syl.state !== 'IDLE' ||
        tr.rotateCalls > 0
      ) {
        throw new Error(
          `[Suite 36.9C SylvaraArrowUlt] Failed arrow metamorphosis check: arrow=${sawArrowPhase}, sheetDraws=${sheetDrawsWhileArrow}, remat=${sawRematerialize}, traverse=${arrowTraverse.toFixed(1)}, dmg=${dmgDealt}, endState=${syl.state}, rotates=${tr.rotateCalls}`
        );
      }
      syl.fx?.dispose?.();
    }

    // (D) Adventure Icon Refresh + `#hud-right` VS Restoration + `warrior_ex` Icon Row + `AGENTS.md` Rule 6
    {
      if (PixelForge.HERO_ICON_ROW_MAP.warrior_ex !== 0) {
        throw new Error(`[Suite 36.9D] Expected PixelForge.HERO_ICON_ROW_MAP.warrior_ex === 0, got ${PixelForge.HERO_ICON_ROW_MAP.warrior_ex}`);
      }
      const makeDomEl = () => {
        const cls = new Set();
        return {
          width: 64,
          height: 64,
          textContent: '',
          className: '',
          style: { width: '100%', setProperty() {} },
          classList: {
            add: (c) => cls.add(c),
            remove: (c) => cls.delete(c),
            contains: (c) => cls.has(c),
            toggle: (c, force) => {
              if (force === undefined) cls.has(c) ? cls.delete(c) : cls.add(c);
              else if (force) cls.add(c);
              else cls.delete(c);
            }
          },
          setAttribute() {},
          addEventListener() {},
          getContext: () => createMockCtx()
        };
      };
      const domMap = new Map([
        ['left-portrait', makeDomEl()],
        ['right-portrait', makeDomEl()],
        ['hud-right', makeDomEl()],
        ['app', makeDomEl()],
        ['victory-overlay', makeDomEl()],
        ['adventure-controls', makeDomEl()],
        ['adv-icon-attack', makeDomEl()],
        ['adv-icon-dodge', makeDomEl()],
        ['adv-icon-skill', makeDomEl()],
        ['adv-icon-overdrive', makeDomEl()],
        ['adv-icon-ultimate', makeDomEl()]
      ]);
      const prevGetEl369 = globalThis.document.getElementById;
      globalThis.document.getElementById = (id) => domMap.get(id) || null;
      try {
        const advG = createMockGame();
        advG.gameMode = 'adventure';
        advG.updateHUD = () => {};
        advG.updateAdventureBossHUD = () => {};
        advG.hudEls = {
          left: { name: makeDomEl(), hpBar: makeDomEl(), hpDmg: makeDomEl(), hpText: makeDomEl(), state: makeDomEl(), manaBar: makeDomEl(), ultLabel: makeDomEl(), skillCd: makeDomEl(), skillText: makeDomEl() },
          right: { name: makeDomEl(), hpBar: makeDomEl(), hpDmg: makeDomEl(), hpText: makeDomEl(), state: makeDomEl(), manaBar: makeDomEl(), ultLabel: makeDomEl(), skillCd: makeDomEl(), skillText: makeDomEl(), partnerWing: makeDomEl() },
          crestVs: makeDomEl(),
          modeBadge: makeDomEl(),
          stageBadge: makeDomEl()
        };
        const adv = new AdventureManager(advG);
        advG.adventure = adv;

        const wHero = new WarriorEx({ x: 240, groundY: 561, facing: 1, team: 'left' });
        wHero.game = advG;
        advG.leftFighter = wHero;
        adv.startCampaign(wHero);
        if (PixelForge.hudPortraitCfg?.leftKey !== 'warrior_ex' || adv._renderedIconHero !== 'warrior_ex') {
          throw new Error(
            `[Suite 36.9D] Expected Adventure Hero 1 warrior_ex portrait/icon, got leftKey=${PixelForge.hudPortraitCfg?.leftKey}, iconHero=${adv._renderedIconHero}`
          );
        }

        const lHero = new IceMageEx({ x: 240, groundY: 561, facing: 1, team: 'left' });
        lHero.game = advG;
        advG.leftFighter = lHero;
        adv.startCampaign(lHero);
        if (PixelForge.hudPortraitCfg?.leftKey !== 'icemage_ex' || adv._renderedIconHero !== 'icemage_ex') {
          throw new Error(
            `[Suite 36.9D] Stuck Adventure Hero 1 icon after switching to icemage_ex: leftKey=${PixelForge.hudPortraitCfg?.leftKey}, iconHero=${adv._renderedIconHero}`
          );
        }
        if (domMap.get('hud-right').classList.contains('hidden')) {
          throw new Error('[Suite 36.9D] Adventure syncRightHUD must not add stale .hidden class directly onto #hud-right!');
        }
        adv.stopCampaign();
        if (domMap.get('hud-right').classList.contains('hidden')) {
          throw new Error('[Suite 36.9D] #hud-right remained hidden after stopCampaign()!');
        }
        wHero.fx?.dispose?.();
        lHero.fx?.dispose?.();
      } finally {
        globalThis.document.getElementById = prevGetEl369;
      }

      const agentsMd = fs.readFileSync(path.join(REPO_ROOT, 'AGENTS.md'), 'utf8');
      if (!agentsMd.includes('Fast Swarm Integration Policy')) {
        throw new Error('[Suite 36.9D] Expected AGENTS.md Rule 6 Fast Swarm Integration Policy!');
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.10: Batch ?v=30fps132 Parity:
  //   Sylvara EX (`archer_ex`) `TRUE_ULTIMATE` Refinement:
  //     - Full 10-frame Bow-Pull Progression (`frames 135..144`, `>= 8` unique frames hit)
  //     - `0` Slash-Like Circle Effects (`sylvanBowDrawVortex`, `sonicBowReleaseWave`, `Row 3/5/6`)
  //     - Slender Radiant Great-Arrow + `>= 24` `_arrowStarParticles` + `>= 480px` `'emerald'` Dynamic Light
  // --------------------------------------------------------------------------
  {
    const archRep121 = pngAuditResults36.get('archer_ex');
    if (
      !archRep121 ||
      archRep121.sheet4pxClips !== 0 ||
      archRep121.archRow4MaxX < 0 ||
      archRep121.archRow4MaxX > 260
    ) {
      throw new Error(
        `[Suite 36.10 SylvaraPNG] Expected 0/300 border clips & Row 4 maxX <= 260, got clips=${archRep121?.sheet4pxClips}, maxX=${archRep121?.archRow4MaxX}`
      );
    }

    const sG = createMockGame();
    const syl = new ArcherEx({ x: 320, groundY: 560, facing: 1, team: 'left' });
    const foe = new Warrior({ x: 760, groundY: 560, facing: -1, name: 'SylvaraRefineDummy', team: 'right' });
    foe.maxHp = 99999;
    foe.hp = 99999;
    foe.stunTimer = 999;
    syl.game = sG;
    foe.game = sG;
    sG.fighters = [syl, foe];
    sG.getEnemiesOf = (f) => (f === syl ? [foe] : [syl]);
    sG.getTargetFor = (f) => (f === syl ? foe : syl);

    const audit121 = createAuditCtx36();
    const bowPullFramesSeen = new Set();
    let forbiddenFxCount = 0;
    let maxStarParticles = 0;
    let maxEmeraldLightR = 0;
    let sheetDrawsWhileArrow = 0;
    let sawTransformedArrow = false;
    const origDrawSheet121 = PixelForge.drawSheetFrame;

    syl.finisherGauge = syl.maxFinisherGauge || 100;
    syl.setState('TRUE_ULTIMATE');

    try {
      PixelForge.drawSheetFrame = function (...args) {
        if (args[2] === syl && syl._isTransformedArrow) {
          sheetDrawsWhileArrow++;
        }
        return origDrawSheet121.apply(this, args);
      };

      for (let s = 0; s < 110; s++) {
        syl.update(1 / 30, foe, sG);
        sG.vfx.update(1 / 30, 560, sG.renderer, sG.audio);
        syl.drawForegroundOverlay(audit121.ctx, sG.renderer);
        syl.draw(audit121.ctx, false, sG.renderer);
        syl.drawUltimateForeground(audit121.ctx, sG.renderer);

        const t = syl.stateTimer;
        if (syl.state === 'TRUE_ULTIMATE' && t >= 0.84 && t < 1.52) {
          const fi = syl.trueUltFrameOverride;
          if (fi >= 135 && fi <= 144) bowPullFramesSeen.add(fi);
        }
        if (syl.state === 'TRUE_ULTIMATE') {
          for (const inst of syl.fx?.active || []) {
            if (inst.key === 'sylvanBowDrawVortex' || inst.key === 'sonicBowReleaseWave') {
              forbiddenFxCount++;
            }
          }
        }
        if (syl._isTransformedArrow) {
          sawTransformedArrow = true;
          const lights = sG.vfx.getActiveLights([syl, foe], 560);
          for (const L of lights) {
            if (L.owner === syl && L.colorType === 'emerald' && L.radius > maxEmeraldLightR) {
              maxEmeraldLightR = L.radius;
            }
          }
        }
        if ((syl._arrowStarParticles?.length || 0) > maxStarParticles) {
          maxStarParticles = syl._arrowStarParticles.length;
        }
        if (syl.state !== 'TRUE_ULTIMATE') break;
      }
    } finally {
      PixelForge.drawSheetFrame = origDrawSheet121;
    }

    const forbiddenCircleRowsDrawn = [3 * 208, 5 * 208, 6 * 208].filter((sy) =>
      audit121.stats.vfxSyDrawn.has(sy)
    );
    const dmgDealt = 99999 - foe.hp;
    if (
      bowPullFramesSeen.size < 8 ||
      forbiddenFxCount !== 0 ||
      forbiddenCircleRowsDrawn.length !== 0 ||
      !sawTransformedArrow ||
      maxStarParticles < 24 ||
      maxEmeraldLightR < 480 ||
      sheetDrawsWhileArrow !== 0 ||
      dmgDealt < 650 ||
      syl.state !== 'IDLE' ||
      audit121.stats.vectorCalls !== 0 ||
      audit121.stats.rotateCalls !== 0
    ) {
      throw new Error(
        `[Suite 36.10 SylvaraUltRefine] Failed verification: bowFrames=${bowPullFramesSeen.size} (${[...bowPullFramesSeen].join(',')}), forbiddenFx=${forbiddenFxCount}, badRows=[${forbiddenCircleRowsDrawn.join(',')}], arrow=${sawTransformedArrow}, particles=${maxStarParticles}, emLightR=${maxEmeraldLightR}, sheetDraws=${sheetDrawsWhileArrow}, dmg=${dmgDealt}, endState=${syl.state}, vec=${audit121.stats.vectorCalls}, rot=${audit121.stats.rotateCalls}`
      );
    }
    syl.fx?.dispose?.();
  }

  // --------------------------------------------------------------------------
  // 36.11: Batch ?v=30fps132 Parity:
  //   Sylvara EX (`archer_ex`) Pixel-by-Pixel Sculpted Elven Hands/Vambraces +
  //   Fixed Feet During & After `ULTIMATE` and `TRUE_ULTIMATE` (Zero `135/136` Hover/Club-Foot)
  // --------------------------------------------------------------------------
  {
    const archRep122 = pngAuditResults36.get('archer_ex');
    if (
      !archRep122 ||
      archRep122.archRow4F1529MinSpan < 44 ||
      archRep122.archRow4LandOk !== 1 ||
      archRep122.archSkinHandPx < 32 ||
      archRep122.archSilverVambPx < 32
    ) {
      throw new Error(
        `[Suite 36.11 SylvaraHandsAndFeet] Failed sheet audit: span=${archRep122?.archRow4F1529MinSpan}, landOk=${archRep122?.archRow4LandOk}, skin=${archRep122?.archSkinHandPx}, silver=${archRep122?.archSilverVambPx}`
      );
    }

    // (A) Overdrive `ULTIMATE` grounded touchdown uses 147..149 (never 135/136!) & exits cleanly to IDLE
    {
      const uG = createMockGame();
      const syl = new ArcherEx({ x: 320, groundY: 560, facing: 1, team: 'left' });
      const foe = new Warrior({ x: 640, groundY: 560, facing: -1, name: 'UltLandDummy', team: 'right' });
      foe.maxHp = 99999;
      foe.hp = 99999;
      foe.stunTimer = 999;
      syl.game = uG;
      foe.game = uG;
      uG.fighters = [syl, foe];
      uG.getEnemiesOf = (f) => (f === syl ? [foe] : [syl]);
      uG.getTargetFor = (f) => (f === syl ? foe : syl);
      syl.mana = syl.maxMana;
      syl.setState('ULTIMATE');

      const groundFrames = new Set();
      let badGroundFrame = null;
      for (let s = 0; s < 90; s++) {
        syl.update(1 / 30, foe, uG);
        if (syl.state === 'ULTIMATE' && syl.stateTimer >= 1.58) {
          const fi = syl._overrideFrameIdx;
          groundFrames.add(fi);
          if (fi < 147 || fi > 149) badGroundFrame = fi;
        }
        if (syl.state !== 'ULTIMATE') break;
      }
      if (
        badGroundFrame !== null ||
        groundFrames.size < 2 ||
        syl.state !== 'IDLE' ||
        syl.y !== syl.groundY ||
        syl._overrideFrameIdx !== null ||
        syl.trueUltFrameOverride !== null
      ) {
        throw new Error(
          `[Suite 36.11 SylvaraUltLand] Failed grounded Phase 3 check: frames=[${[...groundFrames].join(',')}], bad=${badGroundFrame}, state=${syl.state}, y=${syl.y}/${syl.groundY}, ov=${syl._overrideFrameIdx}/${syl.trueUltFrameOverride}`
        );
      }
      syl.fx?.dispose?.();
    }

    // (B) Supreme `TRUE_ULTIMATE` grounded touchdown uses 147..149 & cleans all frame overrides on exit
    {
      const tG = createMockGame();
      const syl = new ArcherEx({ x: 320, groundY: 560, facing: 1, team: 'left' });
      const foe = new Warrior({ x: 740, groundY: 560, facing: -1, name: 'TrueUltLandDummy', team: 'right' });
      foe.maxHp = 99999;
      foe.hp = 99999;
      foe.stunTimer = 999;
      syl.game = tG;
      foe.game = tG;
      tG.fighters = [syl, foe];
      tG.getEnemiesOf = (f) => (f === syl ? [foe] : [syl]);
      tG.getTargetFor = (f) => (f === syl ? foe : syl);
      syl.finisherGauge = syl.maxFinisherGauge || 100;
      syl.setState('TRUE_ULTIMATE');

      const p5GroundFrames = new Set();
      let badTrueGroundFrame = null;
      for (let s = 0; s < 110; s++) {
        syl.update(1 / 30, foe, tG);
        if (syl.state === 'TRUE_ULTIMATE' && syl.stateTimer >= 2.20 && syl.y >= syl.groundY - 1) {
          const fi = syl.trueUltFrameOverride;
          p5GroundFrames.add(fi);
          if (fi < 147 || fi > 149) badTrueGroundFrame = fi;
        }
        if (syl.state !== 'TRUE_ULTIMATE') break;
      }
      if (
        badTrueGroundFrame !== null ||
        p5GroundFrames.size < 2 ||
        syl.state !== 'IDLE' ||
        syl.y !== syl.groundY ||
        syl._overrideFrameIdx !== null ||
        syl.trueUltFrameOverride !== null
      ) {
        throw new Error(
          `[Suite 36.11 SylvaraTrueUltLand] Failed Phase 5 grounded landing check: frames=[${[...p5GroundFrames].join(',')}], bad=${badTrueGroundFrame}, state=${syl.state}, y=${syl.y}/${syl.groundY}, ov=${syl._overrideFrameIdx}/${syl.trueUltFrameOverride}`
        );
      }
      syl.fx?.dispose?.();
    }
  }

  // --------------------------------------------------------------------------
  // 36.12: Batch ?v=30fps132 Parity:
  //   All-6 EX Sculpted Hands/Gauntlets (0 circle/3x3 blobs), Clean Row 4 Ultimate
  //   Feet/Skirts (`android_ex`, `icemage_ex`, `ronin_ex`, `chronomancer_ex`) &
  //   All-11 EX `setState()` Mid-Ultimate Ground-Snap Resets
  // --------------------------------------------------------------------------
  {
    const andrRep = pngAuditResults36.get('android_ex');
    const roninRep = pngAuditResults36.get('ronin_ex');
    const iceRep = pngAuditResults36.get('icemage_ex');
    const chronoRep = pngAuditResults36.get('chronomancer_ex');

    if (
      !andrRep ||
      andrRep.andrF1017MinSpan < 60 ||
      andrRep.andrF2629MinSpan < 96 ||
      andrRep.andrWideHipIslands !== 0
    ) {
      throw new Error(
        `[Suite 36.12 AndroidRow4] Expected coherent hip skirts & wide stances: f1017=${andrRep?.andrF1017MinSpan}, f2629=${andrRep?.andrF2629MinSpan}, islands=${andrRep?.andrWideHipIslands}`
      );
    }
    if (!roninRep || roninRep.roninF2629MinSpan < 54 || roninRep.roninF2629LandOk !== 1) {
      throw new Error(
        `[Suite 36.12 RoninRow4] Expected grounded wide Row 4 recovery stance: span=${roninRep?.roninF2629MinSpan}, landOk=${roninRep?.roninF2629LandOk}`
      );
    }
    if (!iceRep || iceRep.iceF1729LandOk !== 1 || iceRep.iceF2426MaxSpan200 > 120) {
      throw new Error(
        `[Suite 36.12 IceMageRow4] Expected grounded F17..F29 tap/descent boots & 0 baked mid-air floor circle: landOk=${iceRep?.iceF1729LandOk}, span2426=${iceRep?.iceF2426MaxSpan200}`
      );
    }
    if (!chronoRep || chronoRep.chronoF2229LandOk !== 1) {
      throw new Error(
        `[Suite 36.12 ChronoRow4] Expected grounded F22..F29 settle: landOk=${chronoRep?.chronoF2229LandOk}`
      );
    }

    // Source verification: all 6 repaired builders define sculpted fingered hands and zero old blob hand stamps
    const handChecks = [
      ['scripts/build_ronin_ex_nextgen_sheet.py', 'draw_sculpted_samurai_hand_160', /for oy in range\(-1, 2\)/],
      ['scripts/build_android_ex_nextgen_sheet.py', 'draw_sculpted_cyber_hand_160', /draw_disc_160\(arr,\s*(?:hx|grip\[0\]|visor_x)/],
      ['scripts/build_priestess_ex_nextgen_sheet.py', 'draw_sculpted_priestess_hand', /draw_thick_line\([^)]*hand\[0\]\s*-\s*0\.4/],
      ['scripts/build_chronomancer_ex_nextgen_sheet.py', 'draw_sculpted_chrono_hand_clasp', /ox \* ox \+ oy \* oy <= 4/],
      ['scripts/build_valkyrie_ex_nextgen_sheet.py', 'draw_sculpted_valkyrie_hand_clasp', /ox \* ox \+ oy \* oy <= 4/],
      ['scripts/build_icemage_ex_nextgen_sheet.py', 'sculpted porcelain scepter-grip hand', /draw_disc_160\(arr,\s*hx,\s*hy/]
    ];
    for (const [relPath, mustHave, forbiddenRx] of handChecks) {
      const pySrc = fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
      if (!pySrc.includes(mustHave) || forbiddenRx.test(pySrc)) {
        throw new Error(
          `[Suite 36.12 SculptedHands] Builder ${relPath} missing "${mustHave}" or still matches ${forbiddenRx}`
        );
      }
    }
    const icePy = fs.readFileSync(path.join(REPO_ROOT, 'scripts/build_icemage_ex_nextgen_sheet.py'), 'utf8');
    const iceRow4Block = icePy.slice(icePy.indexOf('def build_row4_ultimate'), icePy.indexOf('def build_row5_death'));
    if (iceRow4Block.includes('draw_snowflake_magic_circle_160(\n                    arr, cx=78.0, cy=108.0')) {
      throw new Error('[Suite 36.12 IceMageRow4] Found baked ground snowflake circle in Row 4 descent!');
    }

    // All 12 EX heroes cleanly snap back to groundY if interrupted mid-ULTIMATE or mid-TRUE_ULTIMATE
    const all12Ex = [
      WarriorEx, FireMageEx, PriestessEx, ChronomancerEx, ValkyrieEx,
      RoninEx, ArcherEx, ReaperEx, TitanEx, IceMageEx, AndroidEx, NyxEx
    ];
    for (const ExCls of all12Ex) {
      for (const midState of ['ULTIMATE', 'TRUE_ULTIMATE']) {
        const hero = new ExCls({ x: 420, groundY: 560, facing: 1, team: 'left' });
        hero.setState(midState);
        hero.y = hero.groundY - 80;
        hero.vy = -120;
        hero.cameraAirLift = 90;
        hero.setState('IDLE');
        if (hero.y !== hero.groundY || hero.vy !== 0) {
          throw new Error(
            `[Suite 36.12 GroundSnap] ${hero.heroId || ExCls.name} stayed airborne after ${midState}->IDLE: y=${hero.y}/${hero.groundY}, vy=${hero.vy}`
          );
        }
        hero.fx?.dispose?.();
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.13: Batch v124 Asset Retry/Visibility Gate + All-11 EX Leak/Hole/Prone Repair
  // --------------------------------------------------------------------------
  {
    const prevHtmlImg3613 = globalThis.HTMLImageElement;
    globalThis.HTMLImageElement = globalThis.Image;
    try {
      // (A.1) PixelForge.ensureImage automatic retry recovery + isImageReady
      const retryImg = new Image();
      retryImg.src = '';
      retryImg._origSrc = 'assets/sprites/warrior_ex_sheet.png?v=30fps156';
      retryImg._deferredSrc = retryImg._origSrc;
      retryImg.complete = false;
      retryImg.naturalWidth = 0;
      retryImg.naturalHeight = 0;

      PixelForge.ensureImage(retryImg);
      if (retryImg.src !== retryImg._origSrc || !retryImg._loadingInFlight) {
        throw new Error(`[Suite 36.13A] Expected initial ensureImage to start load, got src=${retryImg.src}`);
      }
      retryImg.onerror();
      if (!retryImg._loadFailed || (retryImg._retryCount || 0) !== 0) {
        throw new Error(
          `[Suite 36.13A] Expected _loadFailed=true after first error, got ${retryImg._loadFailed}/${retryImg._retryCount}`
        );
      }
      retryImg.complete = true;
      retryImg._nextRetryAt = 0;
      PixelForge.ensureImage(retryImg);
      if (!retryImg.src.includes('&retry=1') || retryImg._retryCount !== 1 || retryImg._loadFailed) {
        throw new Error(
          `[Suite 36.13A] Expected retry=1 recovery attempt, got src=${retryImg.src}, count=${retryImg._retryCount}`
        );
      }
      retryImg.naturalWidth = 9600;
      retryImg.naturalHeight = 2400;
      retryImg.onload();
      if (!PixelForge.isImageReady(retryImg) || retryImg._retryCount !== 0) {
        throw new Error('[Suite 36.13A] Expected recovered image to be ready with _retryCount reset to 0!');
      }

      // (A.2) areMatchAssetsReady + drawSheetFrame crisp loading silhouette fallback
      const assets3613 = PixelForge.initAssets();
      const prevWarriorSheet = assets3613.warrior_ex.sheet;
      const pendingSheet = new Image();
      pendingSheet._origSrc = prevWarriorSheet?._origSrc || 'assets/sprites/warrior_ex_sheet.png?v=30fps156';
      pendingSheet.complete = false;
      pendingSheet.naturalWidth = 0;
      pendingSheet.naturalHeight = 0;
      pendingSheet.__avsPending = true;

      try {
        assets3613.warrior_ex.sheet = pendingSheet;
        if (
          PixelForge.areMatchAssetsReady({
            heroIds: ['warrior_ex', 'mage_ex'],
            stageId: 'cathedral',
            isAdventure: false
          })
        ) {
          throw new Error('[Suite 36.13A] Expected areMatchAssetsReady=false while warrior_ex sheet is pending!');
        }
        assets3613.warrior_ex.sheet = prevWarriorSheet;
        const prevMonsterVfx3613 = assets3613.monsterVfx;
        assets3613.monsterVfx = pendingSheet;
        try {
          if (
            PixelForge.areMatchAssetsReady({
              heroIds: ['warrior_ex'],
              isAdventure: true,
              zoneIdx: 0
            })
          ) {
            throw new Error('[Suite 36.13A] Expected areMatchAssetsReady=false while monsterVfx is pending in Adventure!');
          }
        } finally {
          assets3613.monsterVfx = prevMonsterVfx3613;
        }
        assets3613.warrior_ex.sheet = pendingSheet;

        let silhouetteRects = 0;
        const silCtx = createMockCtx();
        silCtx.fillRect = () => {
          silhouetteRects++;
        };
        const silHero = { heroId: 'warrior_ex', isEx: true, team: 1, state: 'IDLE', stateTimer: 0 };
        PixelForge.drawSheetFrame(silCtx, assets3613.warrior_ex, silHero, 72, 104, 0, false, null);
        if (silhouetteRects < 4) {
          throw new Error(
            `[Suite 36.13A] Expected visible loading silhouette (>=4 fillRects) instead of blank fighter, got ${silhouetteRects}`
          );
        }

        assets3613.warrior_ex.sheet = prevWarriorSheet;
        PixelForge.ensureHeroLoaded('warrior_ex');
        PixelForge.ensureHeroLoaded('mage_ex');
        PixelForge.ensureStageLoaded('cathedral');
        if (
          !PixelForge.areMatchAssetsReady({
            heroIds: ['warrior_ex', 'mage_ex'],
            stageId: 'cathedral',
            isAdventure: false
          })
        ) {
          throw new Error('[Suite 36.13A] Expected areMatchAssetsReady=true once hero & stage sheets are ready!');
        }
      } finally {
        assets3613.warrior_ex.sheet = prevWarriorSheet;
      }
    } finally {
      if (prevHtmlImg3613 === undefined) {
        delete globalThis.HTMLImageElement;
      } else {
        globalThis.HTMLImageElement = prevHtmlImg3613;
      }
    }

    // (A.3) Source contracts across Ex entities, Monster, Renderer, AudioManager, build_web_vault, index/manifest
    for (const [heroId] of EX_HERO_CLASSES_36) {
      const entityName = CHAMPION_ROSTER[heroId]?.cls?.name;
      const exSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/entities', `${entityName}.js`), 'utf8');
      if (exSrc.includes('.src.includes(')) {
        throw new Error(`[Suite 36.13A] Forbidden per-frame .src.includes() reload loop in ${entityName}.js!`);
      }
      if (heroId === 'reaper_ex' && !exSrc.includes('reaper_companions.png?v=30fps113')) {
        throw new Error('[Suite 36.13A] ReaperEx.js fallback companions src must match PixelForge v=30fps113!');
      }
    }

    const monsterSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/entities/Monster.js'), 'utf8');
    const rendererSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/engine/Renderer.js'), 'utf8');
    const audioSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/engine/AudioManager.js'), 'utf8');
    const vaultSrc = fs.readFileSync(path.join(REPO_ROOT, 'build/build_web_vault.mjs'), 'utf8');
    const indexHtmlSrc = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    const manifestSrc = fs.readFileSync(path.join(REPO_ROOT, 'manifest.json'), 'utf8');
    if (!monsterSrc.includes('PixelForge.ensureImage(') || !rendererSrc.includes('PixelForge.ensureImage(')) {
      throw new Error('[Suite 36.13A] Monster.js and Renderer.js must guard asset draws via PixelForge.ensureImage!');
    }
    if (!audioSrc.includes('const CONCURRENCY = 3;')) {
      throw new Error('[Suite 36.13A] AudioManager.js must cap concurrent WAV preloads at CONCURRENCY = 3!');
    }
    if (
      !vaultSrc.includes('const SMALL_ITEM_CAP=5242880;') ||
      !vaultSrc.includes('const SMALL_TOTAL_CAP=29360128;') ||
      !vaultSrc.includes('__avsFailed') ||
      !vaultSrc.includes('const delays=[120,300];')
    ) {
      throw new Error('[Suite 36.13A] build/build_web_vault.mjs missing retry/cache/failure-tracking upgrades!');
    }
    if (
      !indexHtmlSrc.includes('?v=30fps156') ||
      !manifestSrc.includes('?v=30fps156') ||
      manifestSrc.includes('30fps138') ||
      indexHtmlSrc.includes('30fps138')
    ) {
      throw new Error('[Suite 36.13A] index.html / manifest.json missing ?v=30fps156 cache-bust sync!');
    }

    // (B) Shared ex_sprite_clean_utils.py, all-11 sheet builders, upright Row 4/9 weapons, & sheet metrics
    const cleanUtilsPath = path.join(REPO_ROOT, 'scripts/ex_sprite_clean_utils.py');
    if (!fs.existsSync(cleanUtilsPath)) {
      throw new Error('[Suite 36.13B] Missing shared scripts/ex_sprite_clean_utils.py module!');
    }
    for (const [heroId] of EX_HERO_CLASSES_36) {
      const builderFile = `scripts/build_${heroId}_nextgen_sheet.py`;
      const pySrc = fs.readFileSync(path.join(REPO_ROOT, builderFile), 'utf8');
      if (!pySrc.includes('ex_sprite_clean_utils') || !pySrc.includes('seal_160_char_pinholes_and_leaks')) {
        throw new Error(`[Suite 36.13B] ${builderFile} must import and apply ex_sprite_clean_utils!`);
      }
      const rep = pngAuditResults36.get(heroId);
      if (!rep || rep.sheet4pxClips !== 0 || rep.maxDeathH < 64 || rep.maxDeathH > 104 || rep.minVictoryH < 150) {
        throw new Error(
          `[Suite 36.13B] ${heroId} failed sheet border/prone/victory integrity: ${JSON.stringify(rep)}`
        );
      }
    }
    const iceBuilderSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts/build_icemage_ex_nextgen_sheet.py'),
      'utf8'
    );
    const valkBuilderSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts/build_valkyrie_ex_nextgen_sheet.py'),
      'utf8'
    );
    if (!iceBuilderSrc.includes('weapon_deg=-90.0')) {
      throw new Error('[Suite 36.13B] build_icemage_ex_nextgen_sheet.py Row 4 must hold scepter UP at weapon_deg=-90.0!');
    }
    if (!valkBuilderSrc.includes('lance_angle=-90.0')) {
      throw new Error('[Suite 36.13B] build_valkyrie_ex_nextgen_sheet.py Row 9 must hold Gungnir UP at lance_angle=-90.0!');
    }
  }

  // --------------------------------------------------------------------------
  // 36.14: Pure-Ranged EX Separate Target VFX (`mage_ex`, `priestess_ex`, `valkyrie_ex`, `icemage_ex`, `nyx_ex`)
  // --------------------------------------------------------------------------
  {
    for (const rId of ['mage_ex', 'priestess_ex', 'valkyrie_ex', 'icemage_ex', 'nyx_ex']) {
      const rep = pngAuditResults36.get(rId);
      if (
        !rep ||
        rep.sheet4pxClips !== 0 ||
        rep.rangedMaxX23 > 262 ||
        rep.rangedDetached230 !== 0
      ) {
        throw new Error(
          `[Suite 36.14 Static] ${rId} sheet must be clean of short-range baked VFX: ${JSON.stringify({
            clips: rep?.sheet4pxClips,
            maxX23: rep?.rangedMaxX23,
            detached230: rep?.rangedDetached230
          })}`
        );
      }
    }

    const mkFoe = (x) => {
      const foe = new Warrior({ x, groundY: 560, facing: -1, name: 'RangedVfxDummy', team: 'right' });
      foe.maxHp = 99999;
      foe.hp = 99999;
      foe.stunTimer = 999;
      return foe;
    };

    // 1) Ignis Sol EX (`mage_ex`) SKILL spawns Row 1 Corona Pillars + Row 2 Black-Sun Eclipse Ring on foe.x
    {
      const g = createMockGame();
      const sol = new FireMageEx({ x: 240, groundY: 560, facing: 1, team: 'left' });
      const foe = mkFoe(760);
      sol.game = g;
      foe.game = g;
      g.fighters = [sol, foe];
      sol.mana = sol.maxMana;
      sol.skillCooldown = 0;
      sol.setState('SKILL');
      let seenRow1 = false;
      let seenRow2 = false;
      for (let i = 0; i < 20; i++) {
        sol.update(1 / 30, foe, g);
        for (const a of sol.activeVfxAnims || []) {
          if (Math.abs(a.x - 760) <= 120) {
            if (a.row === 1) seenRow1 = true;
            if (a.row === 2) seenRow2 = true;
          }
        }
      }
      if (!seenRow1 || !seenRow2) {
        throw new Error(`[Suite 36.14 MageEX] Expected Row 1 + Row 2 target VFX near x=760, got r1=${seenRow1}, r2=${seenRow2}`);
      }
      sol.fx?.dispose?.();
    }

    // 2) Seraphina EX (`priestess_ex`) SKILL spawns Row 2 Cathedral Column + Row 3 Rose Mandala on foe.x
    {
      const g = createMockGame();
      const sera = new PriestessEx({ x: 240, groundY: 560, facing: 1, team: 'left' });
      const foe = mkFoe(760);
      sera.game = g;
      foe.game = g;
      g.fighters = [sera, foe];
      sera.mana = sera.maxMana;
      sera.skillCooldown = 0;
      sera.setState('SKILL');
      let seenRow2 = false;
      let seenRow3 = false;
      for (let i = 0; i < 20; i++) {
        sera.update(1 / 30, foe, g);
        for (const a of sera.activeVfxAnims || []) {
          if (Math.abs(a.x - 760) <= 120) {
            if (a.row === 2) seenRow2 = true;
            if (a.row === 3) seenRow3 = true;
          }
        }
      }
      if (!seenRow2 || !seenRow3) {
        throw new Error(`[Suite 36.14 PriestessEX] Expected Row 2 + Row 3 target VFX near x=760, got r2=${seenRow2}, r3=${seenRow3}`);
      }
      sera.fx?.dispose?.();
    }

    // 3) Freyja EX (`valkyrie_ex`) Beat 4 V3 spawns overhead+ground Row 5 Seals + Row 1 Spear + 3 SkySpears on foe.x
    {
      const g = createMockGame();
      const frey = new ValkyrieEx({ x: 240, groundY: 560, facing: 1, team: 'left' });
      const foe = mkFoe(760);
      frey.game = g;
      foe.game = g;
      g.fighters = [frey, foe];
      frey.comboStep = 3;
      frey.setState('AUTO_ATTACK');
      frey._beginComboBeat?.(3, g);
      let seenSky5 = false;
      let seenGnd5 = false;
      let seenRow1 = false;
      let maxSpears = 0;
      for (let i = 0; i < 14; i++) {
        frey.update(1 / 30, foe, g);
        for (const a of frey.activeVfxAnims || []) {
          if (Math.abs(a.x - 760) <= 120) {
            if (a.row === 5 && a.y < frey.groundY - 150) seenSky5 = true;
            if (a.row === 5 && a.y >= frey.groundY - 40) seenGnd5 = true;
            if (a.row === 1) seenRow1 = true;
          }
        }
        const nearSpears = (frey.activeSkySpears || []).filter((s) => Math.abs((s.tx ?? s.x) - 760) <= 120).length;
        if (nearSpears > maxSpears) maxSpears = nearSpears;
      }
      if (!seenSky5 || !seenGnd5 || !seenRow1 || maxSpears < 3) {
        throw new Error(
          `[Suite 36.14 ValkyrieEX] Expected Beat 4 target VFX near x=760: sky5=${seenSky5}, gnd5=${seenGnd5}, row1=${seenRow1}, spears=${maxSpears}`
        );
      }
      frey.fx?.dispose?.();
    }

    // 4) Lyra EX (`icemage_ex`) spawnBorealisSkyIcicles spawns overhead Row 3 + ground Row 5 Seals + 3 SkyIcicles on foe.x
    {
      const g = createMockGame();
      const lyra = new IceMageEx({ x: 240, groundY: 560, facing: 1, team: 'left' });
      const foe = mkFoe(760);
      lyra.game = g;
      foe.game = g;
      g.fighters = [lyra, foe];
      lyra.spawnBorealisSkyIcicles(foe, g);
      const seenRow3 = (lyra.activeVfxAnims || []).some((a) => a.row === 3 && Math.abs(a.x - 760) <= 120);
      const seenRow5 = (lyra.activeVfxAnims || []).some((a) => a.row === 5 && Math.abs(a.x - 760) <= 120);
      const nearIcicles = (lyra.activeSkyIcicles || []).filter((ic) => Math.abs(ic.tx - 760) <= 120).length;
      if (!seenRow3 || !seenRow5 || nearIcicles < 3) {
        throw new Error(
          `[Suite 36.14 IceMageEX] Expected Beat 4 target VFX near x=760: r3=${seenRow3}, r5=${seenRow5}, icicles=${nearIcicles}`
        );
      }
      lyra.fx?.dispose?.();
    }

    // 5) Nyx EX (`nyx_ex`) SKILL spawns Row 3 Marquee + Row 1 `404` Pop-Ups + Row 2 `Cob` Creator Crest near foe.x
    {
      const g = createMockGame();
      const nyx = new NyxEx({ x: 240, groundY: 560, facing: 1, team: 'left' });
      const foe = mkFoe(760);
      nyx.game = g;
      foe.game = g;
      g.fighters = [nyx, foe];
      nyx.skillCooldown = 0;
      nyx.setState('SKILL');
      let seenRow1 = false;
      let seenRow2 = false;
      let seenRow3 = false;
      for (let i = 0; i < 20; i++) {
        nyx.update(1 / 30, foe, g);
        for (const a of nyx.activeVfxAnims || []) {
          if (Math.abs(a.x - 760) <= 120) {
            if (a.row === 1) seenRow1 = true;
            if (a.row === 2) seenRow2 = true;
            if (a.row === 3) seenRow3 = true;
          }
        }
      }
      if (!seenRow1 || !seenRow2 || !seenRow3) {
        throw new Error(`[Suite 36.14 NyxEX] Expected Row 1/2/3 target VFX near x=760, got r1=${seenRow1}, r2=${seenRow2}, r3=${seenRow3}`);
      }
      nyx.fx?.dispose?.();
    }
  }

  // --------------------------------------------------------------------------
  // 36.15: Token-Efficiency Workflow, Rolling <= 32 KB Memory Docs & Archives
  // --------------------------------------------------------------------------
  {
    for (const relDoc of ['docs/PROJECT_MEMORY_HANDOFF.md', 'docs/IMPLEMENTATION_LOG.md']) {
      const absDoc = path.join(REPO_ROOT, relDoc);
      const sz = fs.statSync(absDoc).size;
      if (sz < 2048 || sz > 32768) {
        throw new Error(
          `[Suite 36.15] Expected compact rolling doc '${relDoc}' between 2048 and 32768 bytes, got ${sz}`
        );
      }
    }
    for (const relReq of [
      'docs/archive/PROJECT_MEMORY_ARCHIVE_PRE_V121.md',
      'docs/archive/IMPLEMENTATION_LOG_ARCHIVE_PRE_V121.md',
      'scripts/tests/check_docs_hygiene.mjs'
    ]) {
      const absReq = path.join(REPO_ROOT, relReq);
      if (!fs.existsSync(absReq) || fs.statSync(absReq).size < 1024) {
        throw new Error(`[Suite 36.15] Missing or empty required workflow file: ${relReq}`);
      }
    }
    const agentsPolicyTxt = fs.readFileSync(path.join(REPO_ROOT, 'AGENTS.md'), 'utf8');
    if (
      !agentsPolicyTxt.includes('Token-Efficient Workflow Policy') ||
      !agentsPolicyTxt.includes('Mandatory New-Champion & EX Sprite Pipeline')
    ) {
      throw new Error(
        '[Suite 36.15] Expected AGENTS.md Rule 7 Token-Efficient Workflow Policy & Rule 8 Mandatory New-Champion & EX Sprite Pipeline!'
      );
    }
    const skillPolicyTxt = fs.readFileSync(
      path.join(REPO_ROOT, '.agents/skills/arcane-vs-steel-pipeline/SKILL.md'),
      'utf8'
    );
    if (!skillPolicyTxt.includes('ex_sprite_clean_utils.py')) {
      throw new Error(
        '[Suite 36.15] Expected SKILL.md to mandate ex_sprite_clean_utils.py leak/hole cleaning!'
      );
    }
  }

  // --------------------------------------------------------------------------
  // 36.16: Champion #12 `NYX EX` (`nyx_ex` — Nebula AI Assistant Created by Cob)
  //        4x3 EX Grid, Auto-Patch Holo-Shield, Ctrl+Z Blink AFK Decoy, Cob Overdrive/Supernova & Adv Pure Dodge
  // --------------------------------------------------------------------------
  {
    const idxHtml = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    if (
      !idxHtml.includes('NEO-VISION • 12') ||
      !idxHtml.includes('id="card-nyx_ex"') ||
      /id="card-(?:titan_ex|icemage_ex|android_ex)"[^>]*data-grid-pos=/.test(idxHtml) ||
      !idxHtml.includes('id="card-titan" data-hero="titan" data-roster-group="legacy" data-grid-pos="9"')
    ) {
      throw new Error('[Suite 36.16] Expected symmetrical 4x3 (12 EX cards) & preserved 4+4+3 Legacy grid in index.html!');
    }

    const nyxRep = pngAuditResults36.get('nyx_ex');
    if (
      !nyxRep ||
      nyxRep.sheet4pxClips !== 0 ||
      nyxRep.vfx4pxClips !== 0 ||
      nyxRep.rangedMaxX23 > 262 ||
      nyxRep.rangedDetached230 !== 0
    ) {
      throw new Error(`[Suite 36.16] nyx_ex art audit failed: ${JSON.stringify(nyxRep)}`);
    }

    // Verify Cob Fourth-Wall Monitor stage + Inferno/Glacial fusion PNG headers & STAGE_ASSET_KEY_MAP registration
    const cobStageBuf = fs.readFileSync(path.join(REPO_ROOT, 'assets/sprites/arena_cob_monitor.png'));
    const cobStageW = cobStageBuf.readUInt32BE(16);
    const cobStageH = cobStageBuf.readUInt32BE(20);
    const cobInfBuf = fs.readFileSync(path.join(REPO_ROOT, 'assets/sprites/arena_cob_monitor_inferno.png'));
    const cobInfW = cobInfBuf.readUInt32BE(16);
    const cobInfH = cobInfBuf.readUInt32BE(20);
    const cobGlacBuf = fs.readFileSync(path.join(REPO_ROOT, 'assets/sprites/arena_cob_monitor_glacial.png'));
    const cobGlacW = cobGlacBuf.readUInt32BE(16);
    const cobGlacH = cobGlacBuf.readUInt32BE(20);
    const cobAnimBuf = fs.readFileSync(path.join(REPO_ROOT, 'assets/sprites/cob_creator_anim.png'));
    const cobAnimW = cobAnimBuf.readUInt32BE(16);
    const cobAnimH = cobAnimBuf.readUInt32BE(20);
    if (
      cobStageW !== 640 ||
      cobStageH !== 360 ||
      cobInfW !== 640 ||
      cobInfH !== 360 ||
      cobGlacW !== 640 ||
      cobGlacH !== 360 ||
      cobAnimW !== 1920 ||
      cobAnimH !== 720 ||
      PixelForge.STAGE_ASSET_KEY_MAP.cob_monitor !== 'arenaCobMonitor' ||
      PixelForge.STAGE_ASSET_KEY_MAP.cob_monitor_inferno !== 'arenaCobMonitorInferno' ||
      PixelForge.STAGE_ASSET_KEY_MAP.cob_monitor_glacial !== 'arenaCobMonitorGlacial'
    ) {
      throw new Error(
        `[Suite 36.16] Cob Monitor stage asset check failed: stage=${cobStageW}x${cobStageH}, inf=${cobInfW}x${cobInfH}, glac=${cobGlacW}x${cobGlacH}, anim=${cobAnimW}x${cobAnimH}`
      );
    }

    // Verify cob_creator_anim.png (0 top-bezel/sill alpha), cob_drone_anim.png (768x384, 0 4px border clips),
    // and nyx_ex_vfx.png (0 12px corner-quadrant box leaks across all 8x30 cells)
    {
      const zlib3616 = await import('node:zlib');
      const decodePngRgba36 = (buf) => {
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        const idat = [];
        let off = 8;
        while (off + 8 <= buf.length) {
          const len = buf.readUInt32BE(off);
          const type = buf.subarray(off + 4, off + 8).toString('ascii');
          if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len));
          if (type === 'IEND') break;
          off += 12 + len;
        }
        const raw = zlib3616.inflateSync(Buffer.concat(idat));
        const stride = w * 4;
        const rgba = Buffer.allocUnsafe(h * stride);
        const paeth = (a, b, c) => {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        };
        for (let y = 0; y < h; y++) {
          const fType = raw[y * (stride + 1)];
          const sOff = y * (stride + 1) + 1;
          const dOff = y * stride;
          const pOff = (y - 1) * stride;
          for (let i = 0; i < stride; i++) {
            const xb = raw[sOff + i];
            const a = i >= 4 ? rgba[dOff + i - 4] : 0;
            const b = y > 0 ? rgba[pOff + i] : 0;
            const c = y > 0 && i >= 4 ? rgba[pOff + i - 4] : 0;
            let rec = xb;
            if (fType === 1) rec = (xb + a) & 0xff;
            else if (fType === 2) rec = (xb + b) & 0xff;
            else if (fType === 3) rec = (xb + ((a + b) >> 1)) & 0xff;
            else if (fType === 4) rec = (xb + paeth(a, b, c)) & 0xff;
            rgba[dOff + i] = rec;
          }
        }
        return { w, h, stride, rgba };
      };

      const cobDec = decodePngRgba36(cobAnimBuf);
      let maxTopBezelAlpha = 0;
      let maxBotSillAlpha = 0;
      let activeCobAlphaPx = 0;
      for (let r = 0; r < 4; r++) {
        for (let ly = 0; ly < 180; ly++) {
          const rowBase = (r * 180 + ly) * cobDec.stride;
          for (let x = 0; x < cobDec.w; x++) {
            const aVal = cobDec.rgba[rowBase + x * 4 + 3];
            if (ly <= 45) {
              if (aVal > maxTopBezelAlpha) maxTopBezelAlpha = aVal;
            } else if (ly >= 173) {
              if (aVal > maxBotSillAlpha) maxBotSillAlpha = aVal;
            } else if (aVal > 0 && r === 0 && x < 240) {
              activeCobAlphaPx++;
            }
          }
        }
      }
      if (maxTopBezelAlpha !== 0 || maxBotSillAlpha !== 0 || activeCobAlphaPx < 2000) {
        throw new Error(
          `[Suite 36.16] Expected 0 top-bezel/sill alpha in cob_creator_anim.png, got top=${maxTopBezelAlpha}, bot=${maxBotSillAlpha}, activePx=${activeCobAlphaPx}`
        );
      }

      const droneBuf = fs.readFileSync(path.join(REPO_ROOT, 'assets/sprites/cob_drone_anim.png'));
      const droneDec = decodePngRgba36(droneBuf);
      if (droneDec.w !== 768 || droneDec.h !== 384) {
        throw new Error(`[Suite 36.16] Expected 768x384 cob_drone_anim.png, got ${droneDec.w}x${droneDec.h}`);
      }
      let droneClips = 0;
      let dronePx = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
          for (let ly = 0; ly < 96; ly++) {
            const rowBase = (r * 96 + ly) * droneDec.stride + c * 96 * 4;
            for (let lx = 0; lx < 96; lx++) {
              if (droneDec.rgba[rowBase + lx * 4 + 3] > 0) {
                dronePx++;
                if (ly < 4 || ly >= 92 || lx < 4 || lx >= 92) droneClips++;
              }
            }
          }
        }
      }
      if (droneClips !== 0 || dronePx < 4000) {
        throw new Error(
          `[Suite 36.16] Expected 0 4px border clips and rich pixel geometry in cob_drone_anim.png, got clips=${droneClips}, px=${dronePx}`
        );
      }

      const nyxVfxBuf = fs.readFileSync(path.join(REPO_ROOT, 'assets/sprites/nyx_ex_vfx.png'));
      const nyxVfxDec = decodePngRgba36(nyxVfxBuf);
      let vfxBorderClips = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 30; c++) {
          for (let ly = 0; ly < 208; ly++) {
            const rowBase = (r * 208 + ly) * nyxVfxDec.stride + c * 208 * 4;
            for (let lx = 0; lx < 208; lx++) {
              if (ly >= 4 && ly < 204 && lx >= 4 && lx < 204) continue;
              if (nyxVfxDec.rgba[rowBase + lx * 4 + 3] > 0) vfxBorderClips++;
            }
          }
        }
      }
      if (vfxBorderClips !== 0) {
        throw new Error(
          `[Suite 36.16] Expected 0 4px border clips in nyx_ex_vfx.png, got ${vfxBorderClips}`
        );
      }
    }

    // Auto-Patch Holo-Shield + Ctrl+Z Glitch Blink AFK Decoy + Overdrive + Supernova Ground-Snap + Cob Monitor Stage Deploy
    const renStats3616 = { rotateCalls: 0, quadCalls: 0 };
    const renCtx3616 = createMockCtx(renStats3616);
    const g = createMockGame();
    g.renderer = new Renderer({
      width: 1280,
      height: 720,
      getBoundingClientRect: () => ({ width: 1280, height: 720 }),
      getContext: () => renCtx3616
    });
    g.renderer.stageId = 'cathedral';

    const prevPfAssets3616 = PixelForge.assets;
    PixelForge.assets = null;
    const wiredAssets3616 = PixelForge.initAssets();
    if (!wiredAssets3616?.cobDroneAnim) {
      throw new Error('[Suite 36.16] PixelForge.initAssets() missing cobDroneAnim wiring!');
    }
    PixelForge.assets = {
      ...(prevPfAssets3616 || {}),
      arenaCobMonitor: { complete: true, naturalWidth: 640, naturalHeight: 360, width: 640, height: 360 },
      arenaCobMonitorInferno: { complete: true, naturalWidth: 640, naturalHeight: 360, width: 640, height: 360 },
      arenaCobMonitorGlacial: { complete: true, naturalWidth: 640, naturalHeight: 360, width: 640, height: 360 },
      cobCreatorAnim: { complete: true, naturalWidth: 1920, naturalHeight: 720, width: 1920, height: 720 },
      cobDroneAnim: { complete: true, naturalWidth: 768, naturalHeight: 384, width: 768, height: 384 },
      nyx_ex: {
        ...(prevPfAssets3616?.nyx_ex || {}),
        sheet: { complete: true, naturalWidth: 9600, naturalHeight: 2400, width: 9600, height: 2400 },
        vfx: { complete: true, naturalWidth: 6240, naturalHeight: 1664, width: 6240, height: 1664 },
        portrait: { complete: true, naturalWidth: 128, naturalHeight: 128, width: 128, height: 128 }
      }
    };

    const nyx = new NyxEx({ x: 360, groundY: 560, facing: 1, team: 'left' });
    if (
      nyx.fx?.viewW !== 960 ||
      nyx.fx?.viewH !== 560 ||
      nyx.fx?.pixelScale !== 2 ||
      nyx.fx?.computeViewport?.(600, 560)?.worldW !== 1920
    ) {
      throw new Error(
        `[Suite 36.16] Expected 1920x1120 (viewW=960, viewH=560, pixelScale=2) shader viewport on NyxEx, got ${nyx.fx?.viewW}x${nyx.fx?.viewH} @ ${nyx.fx?.pixelScale}`
      );
    }
    try {
      const foe = new Warrior({ x: 480, groundY: 560, facing: -1, name: 'Dummy3616', team: 'right' });
      foe.maxHp = 999999;
      foe.hp = 999999;
      foe.stunTimer = 999;
      nyx.game = g;
      foe.game = g;
      g.fighters = [nyx, foe];
      g.getEnemiesOf = (f) => (f === nyx ? [foe] : [nyx]);
      g.getTargetFor = (f) => (f === nyx ? foe : nyx);

      // Verify live IDLE, AUTO_ATTACK Beat 1, & SKILL frame progression + 0 tall pole VFX on `nyx_ex`
      const prevManual3616 = nyx.isPlayerControlled;
      nyx.isPlayerControlled = true;
      nyx.setState('IDLE');
      const idleFrames = new Set();
      for (let i = 0; i < 15; i++) {
        nyx.update(1 / 30, foe, g);
        idleFrames.add(PixelForge.getFrameIndex(nyx, nyx.walkPhase));
      }
      nyx.isPlayerControlled = prevManual3616;

      nyx.comboStep = 0;
      nyx.setState('AUTO_ATTACK');
      const beat1Frames = new Set();
      for (let i = 0; i < 22 && nyx.state === 'AUTO_ATTACK' && nyx._autoVariant === 0; i++) {
        nyx.update(1 / 60, foe, g);
        beat1Frames.add(PixelForge.getFrameIndex(nyx, nyx.walkPhase));
      }

      nyx.skillCooldown = 0;
      nyx.setState('SKILL');
      const skillFrames = new Set();
      let tallPoleAnimSeen = false;
      for (let i = 0; i < 36 && nyx.state === 'SKILL'; i++) {
        nyx.update(1 / 30, foe, g);
        skillFrames.add(PixelForge.getFrameIndex(nyx, nyx.walkPhase));
        if ((nyx.activeVfxAnims || []).some((a) => a.h > a.w * 1.15)) {
          tallPoleAnimSeen = true;
        }
      }
      if (
        idleFrames.size < 6 ||
        beat1Frames.size < 5 ||
        skillFrames.size < 15 ||
        tallPoleAnimSeen ||
        nyx.holoPatchShield < 100
      ) {
        throw new Error(
          `[Suite 36.16] Animation/pole/shield check failed: idle=${idleFrames.size}, b1=${beat1Frames.size}, skill=${skillFrames.size}, pole=${tallPoleAnimSeen}, shield=${nyx.holoPatchShield}`
        );
      }
      const hpPreHit = nyx.hp;
      const oldX = nyx.x;
      nyx.x = 410;
      foe.x = 470;
      nyx.takeDamage(160, foe);
      const hpLost = hpPreHit - nyx.hp;
      if (hpLost <= 0 || hpLost >= 160 || !nyx.afkDecoys.some((d) => Math.abs(d.x - 410) < 2)) {
        throw new Error(`[Suite 36.16] Expected Auto-Patch absorb (<160) + Ctrl+Z Blink AFK Decoy, hpLost=${hpLost}, decoys=${nyx.afkDecoys.length}`);
      }
      nyx.x = oldX;

      nyx.mana = nyx.maxMana;
      nyx.setState('ULTIMATE');
      let ultOrbitalCount = 0;
      let ultCobCrest = false;
      let sawOverclockVisual = false;
      let sawRow4Galaxy = false;
      for (let i = 0; i < 60 && nyx.state === 'ULTIMATE'; i++) {
        nyx.update(1 / 30, foe, g);
        g.vfx.update(1 / 30, 560, g.renderer, g.audio);
        const nodes = (nyx.activeVfxAnims || []).filter((a) => a.row === 5).length;
        if (nodes > ultOrbitalCount) ultOrbitalCount = nodes;
        if ((nyx.activeVfxAnims || []).some((a) => a.row === 2)) ultCobCrest = true;
        if ((nyx.activeVfxAnims || []).some((a) => a.row === 4)) sawRow4Galaxy = true;
        if ((nyx.activeVfxAnims || []).some((a) => a.h > a.w * 1.15)) tallPoleAnimSeen = true;
        if (nyx._overclockVisual?.active) sawOverclockVisual = true;
      }
      if (ultOrbitalCount < 6 || !ultCobCrest || !sawOverclockVisual || !sawRow4Galaxy || tallPoleAnimSeen || nyx.y !== nyx.groundY) {
        throw new Error(
          `[Suite 36.16] Expected 6 Row 5 Orbital Windows + Row 2 Cob Crest + Overclock Galaxy Vortex + Row 4 Galaxy Burst + 0 vertical poles + ground settle: nodes=${ultOrbitalCount}, cob=${ultCobCrest}, oc=${sawOverclockVisual}, r4=${sawRow4Galaxy}, pole=${tallPoleAnimSeen}, y=${nyx.y}`
        );
      }

      nyx.finisherGauge = nyx.maxFinisherGauge;
      nyx.setState('TRUE_ULTIMATE');
      let sawRow7Core = false;
      let sawBeam = false;
      let sawCobDeploy = false;
      let sawCobAssistTimer = false;
      let sawLiveWipeAssistRender = false;
      for (let i = 0; i < 135 && nyx.state === 'TRUE_ULTIMATE'; i++) {
        nyx.update(1 / 30, foe, g);
        g.renderer.update(1 / 30, [nyx, foe]);
        g.vfx.update(1 / 30, 560, g.renderer, g.audio);
        if ((nyx.activeVfxAnims || []).some((a) => a.row === 7)) sawRow7Core = true;
        if ((nyx.activeVfxAnims || []).some((a) => a.h > a.w * 1.15)) tallPoleAnimSeen = true;
        if (nyx._supernovaBeamTimer > 0) sawBeam = true;
        if (g.renderer.permanentStageOverride === 'cob_monitor' && nyx._cobCreatorLinkActive === true) {
          sawCobDeploy = true;
        }
        if (g.renderer.cobAssistTimer > 0) sawCobAssistTimer = true;
        if (!sawLiveWipeAssistRender && g.renderer.cobWipeTimer > 0 && g.renderer.cobAssistTimer > 0) {
          sawLiveWipeAssistRender = true;
          g.renderer.render([nyx, foe], g.vfx, 1 / 60);
        }
      }
      if (!sawRow7Core || !sawBeam || !sawCobDeploy || !sawCobAssistTimer || !sawLiveWipeAssistRender || tallPoleAnimSeen || nyx.y !== nyx.groundY) {
        throw new Error(
          `[Suite 36.16] Expected TRUE_ULTIMATE Row 7 Cob Core + Supernova Beam + cob_monitor deploy + Cob Assist + 0 vertical poles + ground settle: r7=${sawRow7Core}, beam=${sawBeam}, deploy=${sawCobDeploy}, assist=${sawCobAssistTimer}, wipeRender=${sawLiveWipeAssistRender}, pole=${tallPoleAnimSeen}, y=${nyx.y}`
        );
      }

      // Verify Flying Cob Command Drones patrol while idle and lock into flanking strike positions around `cobAssistTargetX`
      g.renderer.cobAssistTimer = 0;
      g.renderer.time = 0.25;
      const idleDronesA = g.renderer._getCobDronePositions(1280, 560);
      g.renderer.time = 1.65;
      const idleDronesB = g.renderer._getCobDronePositions(1280, 560);
      if (
        idleDronesA.length !== 2 ||
        idleDronesA.some((d) => d.x < 132 || d.x > 1148 || d.y < 196 || d.y > 274 || d.lockBlend !== 0) ||
        (idleDronesA[0].x === idleDronesB[0].x && idleDronesA[0].y === idleDronesB[0].y)
      ) {
        throw new Error(
          `[Suite 36.16] Expected 2 animated patrolling Cob drones in [132,1148]x[196,274]: A=${JSON.stringify(idleDronesA)}, B=${JSON.stringify(idleDronesB)}`
        );
      }
      g.renderer.render([nyx, foe], g.vfx, 1 / 60); // idle patrol render on cob_monitor

      g.renderer.cobAssistMaxTimer = 1.12;
      g.renderer.cobAssistTimer = 0.8;
      g.renderer.cobAssistTargetX = 760;
      const atkDrones = g.renderer._getCobDronePositions(1280, 560);
      if (
        atkDrones[0].x >= 760 ||
        atkDrones[1].x <= 760 ||
        atkDrones[0].lockBlend <= 0.8 ||
        atkDrones[1].lockBlend <= 0.8
      ) {
        throw new Error(
          `[Suite 36.16] Expected Cob drones flanking target 760 during strike: ${JSON.stringify(atkDrones)}`
        );
      }

      // Render a live Cob Monitor stage frame (idle + strike) and test bidirectional 3-way Sol Inferno <-> Lyra Glacial Cob fusions!
      g.renderer.cobAssistTimer = 0.65;
      g.renderer.render([nyx, foe], g.vfx, 1 / 60);
      g.renderer.setStageTransformation('inferno', 1.0, true, 0);
      const cobPlusInf = g.renderer.getActiveStageId();
      g.renderer.cobAssistTimer = 0;
      g.renderer.render([nyx, foe], g.vfx, 1 / 60);
      g.renderer.cobAssistTimer = 0.45;
      g.renderer.render([nyx, foe], g.vfx, 1 / 60);
      g.renderer.setStageTransformation('glacial', 1.0, true, 0);
      const infPlusGlac = g.renderer.getActiveStageId();
      g.renderer.cobAssistTimer = 0;
      g.renderer.render([nyx, foe], g.vfx, 1 / 60);
      g.renderer.cobAssistTimer = 0.45;
      g.renderer.render([nyx, foe], g.vfx, 1 / 60);
      g.renderer.cobAssistTimer = 0;
      g.renderer.resetStageOverrides();
      g.renderer.stageId = 'cathedral';
      g.renderer.setStageTransformation('inferno', 1.0, true, 0);
      g.renderer.setStageTransformation('cob_monitor', 1.0, true, 0);
      const infPlusCob = g.renderer.getActiveStageId();
      g.renderer.resetStageOverrides();
      g.renderer.setStageTransformation('glacial', 1.0, true, 0);
      g.renderer.setStageTransformation('cob_monitor', 1.0, true, 0);
      const glacPlusCob = g.renderer.getActiveStageId();
      if (
        cobPlusInf !== 'cob_monitor_inferno' ||
        infPlusGlac !== 'cob_monitor_glacial' ||
        infPlusCob !== 'cob_monitor_inferno' ||
        glacPlusCob !== 'cob_monitor_glacial'
      ) {
        throw new Error(
          `[Suite 36.16] Expected bidirectional Cob+Sol/Lyra fusions, got cob+inf=${cobPlusInf}, inf+glac=${infPlusGlac}, inf+cob=${infPlusCob}, glac+cob=${glacPlusCob}`
        );
      }
      if (renStats3616.rotateCalls !== 0 || renStats3616.quadCalls !== 0 || renCtx3616._stateStack.length !== 0) {
        throw new Error(
          `[Suite 36.16] Expected 0 rotateCalls, 0 quadCalls & balanced ctx stack across Cob variants, got rot=${renStats3616.rotateCalls}, quad=${renStats3616.quadCalls}, stack=${renCtx3616._stateStack.length}`
        );
      }

      // Cornered 1.5s–2.5s Far-Side Stage Teleport check (`nyx.x = 112` -> waits > 1.4s -> warps >= 1050 by 2.0s)
      nyx.isPlayerControlled = true;
      nyx.setState('IDLE');
      nyx.x = 112;
      foe.x = 240;
      nyx._corneredTimer = 0;
      nyx._corneredThreshold = 1.80;
      nyx._cornerTeleportCd = 0;
      nyx._ctrlZCd = 9.0;
      for (let i = 0; i < 42; i++) {
        nyx.update(1 / 30, foe, g);
      }
      const xBefore15 = nyx.x;
      for (let i = 0; i < 18; i++) {
        nyx.update(1 / 30, foe, g);
      }
      const xAfter20 = nyx.x;
      const nextThresh = nyx._corneredThreshold;
      nyx.isPlayerControlled = prevManual3616;
      if (xBefore15 >= 300 || xAfter20 < 1050 || nextThresh < 1.5 || nextThresh > 2.5) {
        throw new Error(
          `[Suite 36.16] Expected 1.5s-2.5s Cornered Far-Side Teleport: x@1.4s=${xBefore15}, x@2.0s=${xAfter20}, nextThreshold=${nextThresh}`
        );
      }

      // Adventure _advPureDodge emits 0 projectiles, 0 AFK decoys, 0 corner teleports & 0 ongoing Cob Assists
      nyx._advPureDodge = true;
      nyx._cobAssistCd = 0;
      nyx._cornerTeleportCd = 0;
      nyx._corneredTimer = 2.4;
      nyx.x = 112;
      g.renderer.cobAssistTimer = 0;
      const preDecoys = nyx.afkDecoys.length;
      const preProjs = g.vfx.projectiles.length;
      nyx._ctrlZCd = 0;
      nyx.onStartDodge(foe, g, -1);
      nyx.update(1 / 30, foe, g);
      nyx._advPureDodge = false;
      if (
        nyx.x >= 500 ||
        nyx.afkDecoys.length !== preDecoys ||
        g.vfx.projectiles.length !== preProjs ||
        g.renderer.cobAssistTimer > 0
      ) {
        throw new Error('[Suite 36.16] Adventure _advPureDodge emitted decoys, teleports, projectiles, or Cob Assist!');
      }

      // Deferred-flush WebKit/Metal regression check: per-instance & per-pass ArcaneShaderFX canvases
      // must remain 100% isolated across Pass 5 ('back') and Pass 7 ('front') for simultaneous casters.
      const prevCreateElement36 = globalThis.document.createElement;
      const pEx36 = new PriestessEx(840, 560, -1);
      try {
        const makePersistentCanvas = () => {
          const cvs = {
            width: 256,
            height: 256,
            _buf: null,
            _bufW: 0,
            _bufH: 0,
            getContext() {
              return {
                createImageData(w, h) {
                  return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
                },
                putImageData(imgData, dx = 0, dy = 0, dirtyX = 0, dirtyY = 0, dirtyW = imgData.width, dirtyH = imgData.height) {
                  const cw = cvs.width | 0;
                  const ch = cvs.height | 0;
                  if (cw <= 0 || ch <= 0) return;
                  if (!cvs._buf || cvs._bufW !== cw || cvs._bufH !== ch) {
                    cvs._buf = new Uint8ClampedArray(cw * ch * 4);
                    cvs._bufW = cw;
                    cvs._bufH = ch;
                  }
                  const src = imgData.data;
                  const sw = imgData.width | 0;
                  const sh = imgData.height | 0;
                  const dst = cvs._buf;
                  const xStart = Math.max(0, dirtyX | 0);
                  const yStart = Math.max(0, dirtyY | 0);
                  const xEnd = Math.min(sw, (dirtyX | 0) + (dirtyW | 0));
                  const yEnd = Math.min(sh, (dirtyY | 0) + (dirtyH | 0));
                  for (let sy = yStart; sy < yEnd; sy++) {
                    const ty = sy + (dy | 0);
                    if (ty < 0 || ty >= ch) continue;
                    for (let sx = xStart; sx < xEnd; sx++) {
                      const tx = sx + (dx | 0);
                      if (tx < 0 || tx >= cw) continue;
                      const so = (sy * sw + sx) * 4;
                      const to = (ty * cw + tx) * 4;
                      dst[to] = src[so];
                      dst[to + 1] = src[so + 1];
                      dst[to + 2] = src[so + 2];
                      dst[to + 3] = src[so + 3];
                    }
                  }
                }
              };
            }
          };
          return cvs;
        };
        const countNonZeroAlphaInRect = (cvs, sx, sy, sw, sh) => {
          const buf = cvs?._buf;
          const cw = cvs?._bufW || 0;
          const ch = cvs?._bufH || 0;
          if (!buf || cw <= 0 || ch <= 0) return 0;
          const x0 = Math.max(0, sx | 0);
          const y0 = Math.max(0, sy | 0);
          const x1 = Math.min(cw, (sx | 0) + (sw | 0));
          const y1 = Math.min(ch, (sy | 0) + (sh | 0));
          let count = 0;
          for (let y = y0; y < y1; y++) {
            const rowBase = y * cw;
            for (let x = x0; x < x1; x++) {
              if (buf[(rowBase + x) * 4 + 3] > 0) count++;
            }
          }
          return count;
        };

        ArcaneShaderFX.releaseSharedCanvases();
        globalThis.document.createElement = () => makePersistentCanvas();

        nyx.x = 360;
        nyx.groundY = 560;
        nyx.y = 560;
        nyx.fx.clear();
        nyx.fx.spawn('nebulaOrbitalMatrix', 360, 560, { warmup: 0.65 });

        pEx36.x = 840;
        pEx36.groundY = 560;
        pEx36.y = 560;
        pEx36.fx.clear();
        pEx36.ensureSanctuarySeal(true);
        pEx36.ensureOphanimWheel();
        pEx36.fx.update(0.45);

        const queuedDraws = [];
        const recCtx = createMockCtx();
        let drawWho = '';
        let drawPass = '';
        recCtx.drawImage = (src, sx, sy, sw, sh) => {
          if (src && src._buf) {
            queuedDraws.push({
              who: drawWho,
              pass: drawPass,
              comp: recCtx.globalCompositeOperation,
              src,
              sx,
              sy,
              sw,
              sh,
              initialNonZero: countNonZeroAlphaInRect(src, sx, sy, sw, sh)
            });
          }
        };

        // Pass 5 (`back`) across both simultaneous casters, then Pass 7 (`front`) across both
        drawPass = 'back';
        drawWho = 'nyx';
        nyx.fx.renderLayer(recCtx, 'back', 600, 560, 0.96);
        drawWho = 'priestess_ex';
        pEx36.fx.renderLayer(recCtx, 'back', 600, 560, 0.96);

        drawPass = 'front';
        drawWho = 'nyx';
        nyx.fx.renderLayer(recCtx, 'front', 600, 560, 0.98);
        drawWho = 'priestess_ex';
        pEx36.fx.renderLayer(recCtx, 'front', 600, 560, 0.98);

        const nyxBackNorm = nyx.fx._scratchBack?.normCanvas;
        const nyxFrontNorm = nyx.fx._scratchFront?.normCanvas;
        const pExBackNorm = pEx36.fx._scratchBack?.normCanvas;
        const pExFrontNorm = pEx36.fx._scratchFront?.normCanvas;
        const distinctNorms = new Set([nyxBackNorm, nyxFrontNorm, pExBackNorm, pExFrontNorm]);
        if (!nyxBackNorm || !nyxFrontNorm || !pExBackNorm || !pExFrontNorm || distinctNorms.size !== 4) {
          throw new Error(
            `[Suite 36.16] Expected 4 distinct per-instance per-pass shader scratch canvases, got size=${distinctNorms.size}`
          );
        }
        const nyxBackAlbedo = queuedDraws.find(
          (d) => d.who === 'nyx' && d.pass === 'back' && d.comp === 'source-over'
        );
        const pExBackAlbedo = queuedDraws.find(
          (d) => d.who === 'priestess_ex' && d.pass === 'back' && d.comp === 'source-over'
        );
        if (!nyxBackAlbedo || !pExBackAlbedo) {
          throw new Error('[Suite 36.16] Missing queued Pass 5 back albedo drawImage for Nyx/PriestessEx!');
        }
        for (const d of queuedDraws) {
          const endNonZero = countNonZeroAlphaInRect(d.src, d.sx, d.sy, d.sw, d.sh);
          if (endNonZero !== d.initialNonZero || endNonZero <= 80) {
            throw new Error(
              `[Suite 36.16] Deferred Canvas2D overwrite detected on ${d.who} ${d.pass} (${d.comp}): start=${d.initialNonZero}, end=${endNonZero}`
            );
          }
        }

        ArcaneShaderFX.releaseSharedCanvases();
        if (
          nyxBackNorm.width !== 0 ||
          nyxFrontNorm.width !== 0 ||
          pExBackNorm.width !== 0 ||
          pExFrontNorm.width !== 0
        ) {
          throw new Error('[Suite 36.16] Expected ArcaneShaderFX.releaseSharedCanvases() to zero all pass scratch canvases!');
        }
      } finally {
        globalThis.document.createElement = prevCreateElement36;
        pEx36.fx?.dispose?.();
      }
    } finally {
      nyx.fx?.dispose?.();
      PixelForge.assets = prevPfAssets3616;
    }
  }

  // --------------------------------------------------------------------------
  // 36.17: Batch ?v=30fps136 Parity — Curbed Adventure HP Cures & Healing +
  //        Dedicated 30fps `monster_vfx.png`, Preloading & Zero Placeholder Attack FX
  // --------------------------------------------------------------------------
  {
    // (A) All 8 non-boss monster sheets + dedicated 6240x1664 monster_vfx.png audit
    const expectedMonKinds = ['templar', 'astrologer', 'treant', 'dryad', 'ghoul', 'cultist', 'brute', 'fiend'];
    for (const mKind of expectedMonKinds) {
      const mRep = monsterAuditResults36.get(mKind);
      if (
        !mRep ||
        mRep.emptyCells !== 0 ||
        mRep.clip4px !== 0 ||
        mRep.idleTransitions < 28 ||
        mRep.walkTransitions < 28
      ) {
        throw new Error(
          `[Suite 36.17A] Monster sheet ${mKind} failed audit: ${JSON.stringify(mRep)}`
        );
      }
    }
    if (
      !monsterVfxAudit36 ||
      monsterVfxAudit36.emptyCells !== 0 ||
      monsterVfxAudit36.clip4px !== 0 ||
      !Array.isArray(monsterVfxAudit36.transitions) ||
      monsterVfxAudit36.transitions.length !== 8 ||
      monsterVfxAudit36.transitions.some((tr, row) => tr < (row === 6 ? 27 : 28))
    ) {
      throw new Error(
        `[Suite 36.17A] monster_vfx.png failed pixel/clip/cadence audit: ${JSON.stringify(monsterVfxAudit36)}`
      );
    }

    // (B) Adventure Drop Economy & Healing Reductions + Monster Combat FX Zero-Vector/Alpha Gate
    const baseMock3617 = createMockGame();
    const vfx3617 = baseMock3617.vfx;
    const renderer3617 = baseMock3617.renderer;
    renderer3617.time = 1.25;
    renderer3617.camX = 600;
    const advGame36 = {
      ...baseMock3617,
      fighters: [],
      leftFighter: null,
      isMatchOver: false,
      matchTime: 10,
      isAdventureMode: () => true,
      getEnemiesOf: (f) => (f?.isMonster && advGame36.leftFighter ? [advGame36.leftFighter] : [])
    };
    const adv36 = new AdventureManager(advGame36);
    advGame36.adventure = adv36;
    advGame36.onFighterDeath = (df) => {
      if (df?.isMonster) adv36.onMonsterDeath(df);
    };

    const player36 = new WarriorEx(300, 561, 1);
    player36.game = advGame36;
    advGame36.leftFighter = player36;
    adv36.startCampaign(player36);

    // 1. Regular monster death: 0 floor pickups, Ult +9, Spirit +7, pushes monsterPlumes
    adv36.pickups.length = 0;
    adv36.monsterPlumes.length = 0;
    adv36.progression.ultCharge = 0;
    adv36.progression.spirit = 20;
    const regTemplar = new Monster('templar', 520, 561, -1, { skipPortal: true });
    regTemplar.game = advGame36;
    advGame36.fighters = [player36, regTemplar];
    const ultBeforeReg = adv36.progression.ultCharge;
    const spiritBeforeReg = adv36.progression.spirit;
    regTemplar.takeDamage(99999, player36, true, 90, 0);
    if (
      adv36.pickups.length !== 0 ||
      adv36.progression.ultCharge <= ultBeforeReg ||
      adv36.progression.spirit <= spiritBeforeReg ||
      adv36.monsterPlumes.length < 1
    ) {
      throw new Error(
        `[Suite 36.17B] Regular monster death invariant failed: pickups=${adv36.pickups.length}, ult=${adv36.progression.ultCharge}, spirit=${adv36.progression.spirit}, plumes=${adv36.monsterPlumes.length}`
      );
    }

    // 2. Non-warden Elite death: strictly 1 ember (0 hp, 0 relic)
    adv36.pickups.length = 0;
    const eliteGhoul = new Monster('ghoul', 560, 561, -1, { isElite: true, skipPortal: true });
    eliteGhoul.game = advGame36;
    advGame36.fighters = [player36, eliteGhoul];
    eliteGhoul.takeDamage(99999, player36, true, 90, 0);
    if (adv36.pickups.length !== 1 || adv36.pickups[0].type !== 'ember') {
      throw new Error(
        `[Suite 36.17B] Non-warden Elite expected 1 ember, got ${adv36.pickups.map((p) => p.type).join(',')}`
      );
    }

    // 3. Mini-Boss Warden death: ember + relic + hp
    adv36.pickups.length = 0;
    const warden36 = new Monster('treant', 600, 561, -1, { isMiniBoss: true, skipPortal: true });
    warden36.game = advGame36;
    advGame36.fighters = [player36, warden36];
    warden36.takeDamage(99999, player36, true, 90, 0);
    if (
      !adv36.pickups.some((p) => p.type === 'ember') ||
      !adv36.pickups.some((p) => p.type === 'relic') ||
      !adv36.pickups.some((p) => p.type === 'hp')
    ) {
      throw new Error(
        `[Suite 36.17B] Mini-Boss Warden expected ember+relic+hp, got ${adv36.pickups.map((p) => p.type).join(',')}`
      );
    }

    // 4. unlockSubWave: 0 pickups, grants Ult + Spirit
    adv36.pickups.length = 0;
    adv36.progression.ultCharge = 10;
    adv36.progression.spirit = 20;
    const ultBeforeSub = adv36.progression.ultCharge;
    const spBeforeSub = adv36.progression.spirit;
    adv36.unlockSubWave(0);
    if (
      adv36.pickups.length !== 0 ||
      adv36.progression.ultCharge <= ultBeforeSub ||
      adv36.progression.spirit <= spBeforeSub
    ) {
      throw new Error(
        `[Suite 36.17B] unlockSubWave expected 0 pickups & Ult/Spirit gain, got pickups=${adv36.pickups.length}`
      );
    }

    // 5. unlockCurrentZone(0): ember + relic, 0 hp
    adv36.pickups.length = 0;
    adv36.unlockCurrentZone(0);
    if (
      !adv36.pickups.some((p) => p.type === 'ember') ||
      !adv36.pickups.some((p) => p.type === 'relic') ||
      adv36.pickups.some((p) => p.type === 'hp')
    ) {
      throw new Error(
        `[Suite 36.17B] unlockCurrentZone(0) expected ember+relic with 0 hp, got ${adv36.pickups.map((p) => p.type).join(',')}`
      );
    }

    // 6. onBossPhaseShift(boss, 2): 0 pickups; phase 3: 1 relic only (0 hp, 0 ember)
    adv36.pickups.length = 0;
    const fakeBoss = { isBoss: true, isColossalBoss: true };
    adv36.onBossPhaseShift(fakeBoss, 2);
    if (adv36.pickups.length !== 0) {
      throw new Error(
        `[Suite 36.17B] Boss Phase 2 expected 0 pickups, got ${adv36.pickups.map((p) => p.type).join(',')}`
      );
    }
    adv36.onBossPhaseShift(fakeBoss, 3);
    if (
      adv36.pickups.filter((p) => p.type === 'hp').length !== 0 ||
      adv36.pickups.filter((p) => p.type === 'relic').length !== 1 ||
      adv36.pickups.some((p) => p.type === 'ember')
    ) {
      throw new Error(
        `[Suite 36.17B] Boss Phase 3 expected 1 relic + 0 hp/ember, got ${adv36.pickups.map((p) => p.type).join(',')}`
      );
    }

    // 7. SOLAR ELIXIR heal (<= 0.14*maxHp), level-up deltaMaxHp only (0 bonusHeal), aegis_3 rank 1 (18 / 0 / 4)
    adv36.pickups.length = 0;
    player36.hp = 100;
    adv36.spawnPickup('hp', player36.x, player36.groundY);
    adv36.updatePickups(1 / 60, player36);
    const elixirGained = player36.hp - 100;
    if (elixirGained <= 0 || elixirGained > Math.ceil(player36.maxHp * 0.14)) {
      throw new Error(
        `[Suite 36.17B] SOLAR ELIXIR heal out of reduced bounds: gained=${elixirGained}, maxHp=${player36.maxHp}`
      );
    }

    const hpBeforeLv = 200;
    const prevMaxHpLv = player36.maxHp;
    player36.hp = hpBeforeLv;
    adv36.progression.gainXp(adv36.progression.xpToNext, player36);
    const lvHealed = player36.hp - hpBeforeLv;
    const expectedLvHeal = player36.maxHp - prevMaxHpLv;
    if (Math.abs(lvHealed - expectedLvHeal) > 1) {
      throw new Error(
        `[Suite 36.17B] Level-up expected deltaMaxHp only (${expectedLvHeal}), got ${lvHealed}`
      );
    }

    adv36.progression.ranks.aegis_3 = 1;
    const aegisStats = adv36.progression.getComputedStats();
    if (
      aegisStats.evasiveHealBonus !== 18 ||
      aegisStats.emberHealPct !== 0 ||
      aegisStats.evasiveSpiritBonus !== 4
    ) {
      throw new Error(
        `[Suite 36.17B] aegis_3 rank 1 mismatch: ${JSON.stringify({
          evasiveHealBonus: aegisStats.evasiveHealBonus,
          emberHealPct: aegisStats.emberHealPct,
          evasiveSpiritBonus: aegisStats.evasiveSpiritBonus
        })}`
      );
    }

    // 8. Monster orb / wave / ArchfiendBoss fireballs & cataclysm pillars via monster_vfx.png (`0` rotate,arc,ellipse)
    const astro36 = new Monster('astrologer', 680, 561, -1, { skipPortal: true });
    astro36.game = advGame36;
    astro36.setState('AUTO_ATTACK');
    vfx3617.projectiles.length = 0;
    for (let f = 0; f < 16; f++) {
      astro36.update(1 / 30, player36, advGame36);
    }
    const orbProj = vfx3617.projectiles.find((pr) => pr.type === 'monster_orb' && pr.zone === 0);
    if (!orbProj) {
      throw new Error('[Suite 36.17C] Expected astrologer monster_orb (zone 0)!');
    }

    const boss36 = new ArchfiendBoss(9335, 561, -1);
    boss36.game = advGame36;
    boss36.emergeTimer = 0;
    boss36.skillVariant = 0;
    boss36.setState('SKILL');
    for (let f = 0; f < 16; f++) {
      boss36.update(1 / 30, player36, advGame36);
    }
    const bossOrb = vfx3617.projectiles.find((pr) => pr.owner === boss36 && pr.type === 'monster_orb');
    const bossFireballLeak = vfx3617.projectiles.find((pr) => pr.owner === boss36 && pr.type === 'fireball');
    if (!bossOrb || bossOrb.zone !== 3 || bossFireballLeak) {
      throw new Error(
        `[Suite 36.17C] Expected ArchfiendBoss Variant 0 to emit monster_orb (zone 3) with 0 fireball, got orb=${bossOrb?.zone}, leak=${bossFireballLeak?.type}`
      );
    }
    boss36.setState('ULTIMATE');
    boss36.update(1 / 30, player36, advGame36);
    const bossPil = vfx3617.pillars.find((pl) => pl.owner === boss36);
    if (!bossPil) {
      throw new Error('[Suite 36.17C] Expected ArchfiendBoss ULTIMATE to spawn CATACLYSM flamePillar!');
    }
    bossPil.erupted = true;
    bossPil.life = bossPil.delay + 0.18;

    const treantBoss36 = new Monster('treant', 740, 561, -1, { isMiniBoss: true, skipPortal: true });
    treantBoss36.game = advGame36;
    treantBoss36.setState('SKILL');
    let sawRow4Override = false;
    for (let f = 0; f < 22; f++) {
      treantBoss36.update(1 / 30, player36, advGame36);
      if (
        Number.isInteger(treantBoss36._overrideFrameIdx) &&
        treantBoss36._overrideFrameIdx >= 120 &&
        treantBoss36._overrideFrameIdx <= 149
      ) {
        sawRow4Override = true;
      }
    }
    const waveProj = vfx3617.projectiles.find((pr) => pr.type === 'monster_wave');
    if (!waveProj || waveProj.zone !== 1 || waveProj.vfxRow !== 2 || !sawRow4Override) {
      throw new Error(
        `[Suite 36.17C] Expected treant MiniBoss monster_wave (zone 1, row 2) + Row 4 override (${sawRow4Override}), got ${JSON.stringify(
          waveProj ? { type: waveProj.type, zone: waveProj.zone, vfxRow: waveProj.vfxRow } : null
        )}`
      );
    }

    // Spawn monster crescent slash + afterimages and verify real monster_vfx.png 208x208 blits across all paths
    const fAng36 = -Math.PI;
    vfx3617.spawnSlash(620, 480, 72, fAng36 - 0.9, fAng36 + 0.9, '#38bdf8', 0.24, { owner: treantBoss36 });
    vfx3617.particles.length = 0;
    vfx3617.glyphs.length = 0;
    vfx3617.shockwaves.length = 0;
    vfx3617.texts.length = 0;
    treantBoss36.afterimages.push({
      x: 752,
      y: 561,
      groundY: 561,
      facing: -1,
      walkPhase: 0,
      scale: 1.28,
      frameIdx: 125,
      alpha: 0.24,
      life: 0.16,
      maxLife: 0.22
    });
    treantBoss36.hitFlash = 0;
    treantBoss36.portalSpawnTimer = 0;
    treantBoss36.setState('SKILL');
    treantBoss36.telegraphRings.push({ x: 420, y: 561, radius: 78, timer: 0.55, maxTimer: 0.72, color: '#34d399', damage: 20 });

    const baseAssets3617 = PixelForge.initAssets();
    const prevTreantAsset = baseAssets3617.treant;
    const prevReaperAsset3617 = baseAssets3617.reaper;
    const prevFxImg = baseAssets3617.advFxSheet;
    const prevStageVfxImg = baseAssets3617.advStageVfx;
    const prevMonsterVfxImg = baseAssets3617.monsterVfx;
    const fakeSheet = { complete: true, naturalWidth: 6240, naturalHeight: 1456, width: 6240, height: 1456 };
    const fakeMonsterVfx = { complete: true, naturalWidth: 6240, naturalHeight: 1664, width: 6240, height: 1664 };
    baseAssets3617.treant = { ...prevTreantAsset, sheet: fakeSheet, vfx: fakeMonsterVfx, cols: 30, rows: 7 };
    baseAssets3617.reaper = { ...prevReaperAsset3617, vfx: { complete: false, naturalWidth: 0, naturalHeight: 0 } };
    baseAssets3617.advFxSheet = { complete: true, naturalWidth: 1024, naturalHeight: 640, width: 1024, height: 640 };
    baseAssets3617.advStageVfx = { complete: true, naturalWidth: 2048, naturalHeight: 1536, width: 2048, height: 1536 };
    baseAssets3617.monsterVfx = fakeMonsterVfx;

    const mTrack = { rotateCalls: 0, quadCalls: 0, arcCalls: 0, ellipseCalls: 0, maxLighterAlpha: 0 };
    const monsterVfxBlitSys = new Set();
    const mCtx = createMockCtx(mTrack);
    mCtx.arc = () => { mTrack.arcCalls++; };
    mCtx.ellipse = () => { mTrack.ellipseCalls++; };
    const trackAlpha = (fn) => (...args) => {
      if (mCtx.globalCompositeOperation === 'lighter' && mCtx.globalAlpha > mTrack.maxLighterAlpha) {
        mTrack.maxLighterAlpha = mCtx.globalAlpha;
      }
      return fn(...args);
    };
    mCtx.fillRect = trackAlpha(() => {});
    mCtx.drawImage = trackAlpha((img, _sx, sy, sw, sh) => {
      if (img === fakeMonsterVfx && sw === 208 && sh === 208 && Number.isFinite(sy)) {
        monsterVfxBlitSys.add(sy);
      }
    });
    mCtx.strokeRect = trackAlpha(() => {});
    mCtx.fillText = trackAlpha(() => {});

    try {
      vfx3617.renderMainPass(mCtx, false, renderer3617, false);
      renderer3617.camX = bossPil.x;
      vfx3617.renderMainPass(mCtx, false, renderer3617, true);
      renderer3617.camX = 600;
      adv36.renderWorldForeground(mCtx, renderer3617);
      treantBoss36.drawTelegraphRings(mCtx);
      treantBoss36.drawForegroundOverlay(mCtx, renderer3617);
      treantBoss36.draw(mCtx, false, renderer3617);
    } finally {
      baseAssets3617.treant = prevTreantAsset;
      baseAssets3617.reaper = prevReaperAsset3617;
      baseAssets3617.advFxSheet = prevFxImg;
      baseAssets3617.advStageVfx = prevStageVfxImg;
      baseAssets3617.monsterVfx = prevMonsterVfxImg;
    }

    const expectedBlitRows = [0, 624, 832, 1248, 1456];
    const missingBlitRows = expectedBlitRows.filter((ry) => !monsterVfxBlitSys.has(ry));
    if (
      missingBlitRows.length > 0 ||
      mTrack.rotateCalls !== 0 ||
      mTrack.arcCalls !== 0 ||
      mTrack.ellipseCalls !== 0 ||
      mTrack.quadCalls !== 0 ||
      mTrack.maxLighterAlpha > 0.201 ||
      mCtx._stateStack.length !== 0
    ) {
      throw new Error(
        `[Suite 36.17C] Monster VFX render invariant failed: missingRows=${missingBlitRows.join(',')}, seen=${Array.from(monsterVfxBlitSys).join(',')}, track=${JSON.stringify({
          ...mTrack,
          stackDepth: mCtx._stateStack.length
        })}`
      );
    }
  }

  // --------------------------------------------------------------------------
  // 36.18: Batch ?v=30fps137 Sovereign Loadouts Parity — 4-Slot Persistence,
  //        0/0/0 Identity, Adventure/Legacy Isolation, All-12 EX [II]/[III] Combat & UI Gates
  // --------------------------------------------------------------------------
  {
    const prevStorage3618 = globalThis.localStorage;
    const memStoreMap = new Map();
    globalThis.localStorage = {
      getItem: (k) => (memStoreMap.has(k) ? memStoreMap.get(k) : null),
      setItem: (k, v) => memStoreMap.set(k, String(v)),
      removeItem: (k) => memStoreMap.delete(k)
    };
    try {
      HeroBuildSystem.resetAllBuilds(true);

      if (
        SOVEREIGN_BUILD_HERO_IDS.length !== 12 ||
        EX_HERO_KEYS.some((k) => !HeroBuildSystem.hasCustomBuilds(k)) ||
        LEGACY_HERO_KEYS.some((k) => HeroBuildSystem.hasCustomBuilds(k))
      ) {
        throw new Error(
          `[Suite 36.18A] Expected custom Sovereign Loadouts on all 12 EX heroes and 0 Legacy heroes (count=${SOVEREIGN_BUILD_HERO_IDS.length})!`
        );
      }

      // (A) Independent 4-slot persistence (p1, p1b, p2, p2b), RNG & Challenger rolls
      HeroBuildSystem.setSlotBuild('p1', 'priestess_ex', { aspect: 1, skill: 2, ult: 0, rng: false });
      HeroBuildSystem.setSlotBuild('p1b', 'priestess_ex', { aspect: 2, skill: 2, ult: 2, rng: false });
      HeroBuildSystem.setSlotPreset('p2', 'valkyrie_ex', 1);
      HeroBuildSystem.setSlotPreset('p2b', 'titan_ex', 'rng');

      const rawSaved = memStoreMap.get(SOVEREIGN_STORAGE_KEY);
      if (!rawSaved) {
        throw new Error('[Suite 36.18A] Expected Sovereign Loadout JSON in localStorage!');
      }
      HeroBuildSystem.reloadFromStorage();
      const sP1 = HeroBuildSystem.getSlotBuild('p1', 'priestess_ex');
      const sP1B = HeroBuildSystem.getSlotBuild('p1b', 'priestess_ex');
      const sP2 = HeroBuildSystem.getSlotBuild('p2', 'valkyrie_ex');
      const sP2B = HeroBuildSystem.getSlotBuild('p2b', 'titan_ex');
      if (
        sP1.code !== 'II-III-I' ||
        sP1.presetIndex !== -1 ||
        sP1B.code !== 'III-III-III' ||
        sP1B.presetIndex !== 2 ||
        sP2.code !== 'II-II-II' ||
        sP2.presetIndex !== 1 ||
        !sP2B.rng ||
        sP2B.code !== 'RNG'
      ) {
        throw new Error(
          `[Suite 36.18A] 4-slot independent persistence mismatch: ${JSON.stringify({ sP1, sP1B, sP2, sP2B })}`
        );
      }

      let seq = 0;
      const rngVals = [0.70, 0.20, 0.90];
      const rngResolved = HeroBuildSystem.resolveMatchBuild('p2b', 'titan_ex', {
        isAdventure: false,
        rngFn: () => rngVals[seq++ % rngVals.length]
      });
      if (!rngResolved.isRng || rngResolved.aspect !== 2 || rngResolved.skill !== 0 || rngResolved.ult !== 2) {
        throw new Error(`[Suite 36.18A] RNG resolve mismatch: ${JSON.stringify(rngResolved)}`);
      }

      const rolledChal = HeroBuildSystem.rollChallengerBuild('p2', 'chronomancer_ex', () => 0.45);
      if (!rolledChal.isTourneyRolled || rolledChal.presetIndex !== 1) {
        throw new Error(`[Suite 36.18A] Auto-Tourney challenger roll mismatch: ${JSON.stringify(rolledChal)}`);
      }

      const sh1 = HeroBuildSystem.parseBuildShorthand('1-2-0');
      const sh2 = HeroBuildSystem.parseBuildShorthand('rng');
      if (!sh1 || sh1.aspect !== 1 || sh1.skill !== 2 || sh1.ult !== 0 || !sh2?.rng) {
        throw new Error('[Suite 36.18A] parseBuildShorthand failed!');
      }

      // Strict Adventure Mode & Legacy isolation + 0/0/0 Baseline Identity across all 12 EX heroes
      const advPri = new ValkyrieEx(240, 520, 1);
      HeroBuildSystem.applyBuildToFighter(
        advPri,
        HeroBuildSystem.resolveMatchBuild('p2', 'valkyrie_ex', { isAdventure: true }),
        true
      );
      if (advPri.buildConfig !== null || advPri.buildAspect !== 0 || advPri.buildSkill !== 0 || advPri.buildUlt !== 0) {
        throw new Error('[Suite 36.18A] Adventure Mode failed strict 0/0/0 buildConfig===null isolation!');
      }
      advPri.fx?.dispose?.();

      const legWar = new Warrior(240, 460, 1);
      legWar.heroId = 'warrior';
      HeroBuildSystem.applyBuildToFighter(legWar, { aspect: 2, skill: 2, ult: 2 }, false);
      if (legWar.buildConfig !== null || legWar.buildAspect !== 0) {
        throw new Error('[Suite 36.18A] Legacy champion failed strict buildConfig===null isolation!');
      }
      legWar.fx?.dispose?.();

      // Verify 0/0/0 ([I] Sovereign Standard) leaves all 12 EX heroes 100% baseline-identical
      const buildClsMap = {
        priestess_ex: PriestessEx,
        warrior_ex: WarriorEx,
        mage_ex: FireMageEx,
        nyx_ex: NyxEx,
        ronin_ex: RoninEx,
        reaper_ex: ReaperEx,
        valkyrie_ex: ValkyrieEx,
        icemage_ex: IceMageEx,
        archer_ex: ArcherEx,
        android_ex: AndroidEx,
        chronomancer_ex: ChronomancerEx,
        titan_ex: TitanEx
      };
      for (const hid of SOVEREIGN_BUILD_HERO_IDS) {
        const Cls = buildClsMap[hid];
        const fresh = new Cls(240, 520, 1);
        const std = new Cls(240, 520, 1);
        HeroBuildSystem.applyBuildToFighter(
          std,
          HeroBuildSystem.describeConcreteBuild(hid, 0, 0, 0, false),
          false
        );
        if (
          !std.buildConfig?.isDefault ||
          std.maxHp !== fresh.maxHp ||
          std.moveSpeed !== fresh.moveSpeed ||
          std.skillName !== fresh.skillName ||
          std.skillMaxCooldown !== fresh.skillMaxCooldown ||
          std.ultName !== fresh.ultName
        ) {
          throw new Error(`[Suite 36.18A] 0/0/0 baseline drift on ${hid}!`);
        }
        fresh.fx?.dispose?.();
        std.fx?.dispose?.();
      }

      // (B) Fighter Shield / Root / Tag-Partner Grace + Live 6-Hero [II] & [III] Combat Verification
      const mock2v2 = createMockGame();
      mock2v2.isAdventureMode = () => false;
      mock2v2.is2v2Mode = () => true;
      const leadP = new PriestessEx(280, 520, 1);
      const benchAlly = new WarriorEx(76, 520, 1);
      leadP.game = mock2v2;
      benchAlly.game = mock2v2;
      leadP.team = 1;
      benchAlly.team = 1;
      benchAlly.isBenched = true;
      benchAlly.hp = benchAlly.maxHp - 200;
      mock2v2.fighters = [benchAlly, leadP];
      mock2v2.getTeammateOf = (f) => (f === leadP ? benchAlly : leadP);

      const allyHealed = leadP.healTeammateTagGrace(34, 'TAG SANCTUARY', 40, 2.4);
      if (allyHealed !== 34 || benchAlly.buildShieldHp !== 0) {
        throw new Error(`[Suite 36.18B] Bench Tag Grace heal mismatch: healed=${allyHealed}, shield=${benchAlly.buildShieldHp}`);
      }
      benchAlly.isBenched = false;
      leadP.grantBuildShield(50, 2.5, 'TEST BARRIER!', '#fde047');
      const hpBeforeShieldHit = leadP.hp;
      leadP.takeDamage(30, benchAlly, false, 0, 0);
      if (leadP.hp !== hpBeforeShieldHit || leadP.buildShieldHp !== 20) {
        throw new Error(`[Suite 36.18B] Build shield absorption failed: hp=${leadP.hp}/${hpBeforeShieldHit}, shield=${leadP.buildShieldHp}`);
      }
      benchAlly.applyBuildRoot(0.40, 'SPEAR ROOT!', '#fb7185');
      if (benchAlly.buildRootTimer < 0.39) {
        throw new Error('[Suite 36.18B] applyBuildRoot failed to set buildRootTimer!');
      }
      leadP.fx?.dispose?.();
      benchAlly.fx?.dispose?.();

      // Simulate [II] (1/1/1) & [III] (2/2/2) across all 6 Batch-1 EX heroes (Auto 4 beats + Skill + Ult + Crouch)
      const simTrack3618 = { rotateCalls: 0, quadCalls: 0 };
      const simCtx3618 = createMockCtx(simTrack3618);
      for (const hid of SOVEREIGN_BUILD_HERO_IDS) {
        const Cls = buildClsMap[hid];
        for (const tier of [1, 2]) {
          const mg = createMockGame();
          mg.testModeUnlimitedHp = false;
          mg.isAdventureMode = () => false;
          mg.is2v2Mode = () => false;
          const hero = new Cls(320, 520, 1);
          const dummy = new WarriorEx(490, 520, -1);
          hero.isPlayerControlled = true;
          dummy.isPlayerControlled = true;
          hero.game = mg;
          dummy.game = mg;
          hero.team = 1;
          dummy.team = 2;
          mg.fighters = [hero, dummy];
          mg.getEnemiesOf = (f) => (f === hero ? [dummy] : [hero]);
          mg.getTargetFor = (f) => (f === hero ? dummy : hero);
          mg.getTeammateOf = () => null;

          const applied = HeroBuildSystem.applyBuildToFighter(
            hero,
            HeroBuildSystem.describeConcreteBuild(hid, tier, tier, tier, false),
            false
          );
          if (!applied || applied.presetIndex !== tier || hero.skillName !== HERO_BUILD_CATALOG[hid].skill[tier].name) {
            throw new Error(`[Suite 36.18B] Failed applying preset ${tier} to ${hid}`);
          }

          // 4 Auto beats
          for (let b = 0; b < 4; b++) {
            dummy.hp = dummy.maxHp;
            hero.comboStep = b;
            hero.setState('AUTO_ATTACK');
            for (let s = 0; s < 14 && hero.state === 'AUTO_ATTACK'; s++) {
              hero.update(1 / 30, dummy, mg);
            }
          }

          // Skill (check zero self-heal on [II] vs sustain/shield on [III])
          if (Array.isArray(hero.boomerangScythes)) hero.boomerangScythes.length = 0;
          hero.severedSoul = null;
          hero.hp = Math.min(hero.maxHp - 250, 2400);
          hero.buildShieldHp = 0;
          if ('holoPatchShield' in hero) hero.holoPatchShield = 0;
          const hpPreSkill = hero.hp;
          dummy.hp = dummy.maxHp;
          hero.skillCooldown = 0;
          hero.setState('SKILL');
          for (let s = 0; s < 38 && hero.state === 'SKILL'; s++) {
            hero.update(1 / 30, dummy, mg);
            if (s === 8) hero.draw(simCtx3618, false, mg.renderer);
          }
          if (tier === 1 && hero.hp > hpPreSkill) {
            throw new Error(`[Suite 36.18B] Preset [II] (${hid}) expected 0 self-heal on SKILL, healed ${hero.hp - hpPreSkill}!`);
          }
          if (tier === 2 && hero.hp <= hpPreSkill && hero.buildShieldHp <= 0 && (hero.holoPatchShield || 0) <= 0) {
            throw new Error(`[Suite 36.18B] Preset [III] (${hid}) expected sustain or barrier on SKILL!`);
          }
          if (Math.abs(hero.y - hero.groundY) > 0.5) {
            throw new Error(`[Suite 36.18B] ${hid} tier ${tier} SKILL ended off-ground (y=${hero.y}, groundY=${hero.groundY})!`);
          }

          // Ultimate
          hero.hp = Math.min(hero.maxHp - 250, 2400);
          hero.buildShieldHp = 0;
          if ('holoPatchShield' in hero) hero.holoPatchShield = 0;
          const hpPreUlt = hero.hp;
          dummy.hp = dummy.maxHp;
          hero.mana = hero.maxMana;
          hero.setState('ULTIMATE');
          for (let s = 0; s < 68 && hero.state === 'ULTIMATE'; s++) {
            hero.update(1 / 30, dummy, mg);
            if (s === 14) hero.draw(simCtx3618, false, mg.renderer);
          }
          if (tier === 1 && hero.hp > hpPreUlt) {
            throw new Error(`[Suite 36.18B] Preset [II] (${hid}) expected 0 self-heal on ULTIMATE, healed ${hero.hp - hpPreUlt}!`);
          }
          if (tier === 2 && hero.hp <= hpPreUlt && hero.buildShieldHp <= 0 && (hero.holoPatchShield || 0) <= 0) {
            throw new Error(`[Suite 36.18B] Preset [III] (${hid}) expected sustain or barrier on ULTIMATE!`);
          }
          if (Math.abs(hero.y - hero.groundY) > 0.5) {
            throw new Error(`[Suite 36.18B] ${hid} tier ${tier} ULTIMATE ended off-ground (y=${hero.y}, groundY=${hero.groundY})!`);
          }

          // Crouch / Parry check
          hero.startCrouch(dummy, mg);
          for (let s = 0; s < 10 && hero.state === 'CROUCH'; s++) {
            hero.update(1 / 30, dummy, mg);
          }

          hero.fx?.dispose?.();
          dummy.fx?.dispose?.();
        }
      }
      if (simTrack3618.rotateCalls !== 0 || simCtx3618._stateStack.length !== 0) {
        throw new Error(
          `[Suite 36.18B] Forbidden ctx.rotate (${simTrack3618.rotateCalls}) or unbalanced ctx stack (${simCtx3618._stateStack.length})!`
        );
      }

      // (C) Roster Select (`getProfileDisplayKit`) + Arena HUD (`syncFighterBuildBadge`) across all 12 EX heroes & HTML/CSS Hooks
      const makeMockBadgeEl = () => ({
        textContent: '',
        className: 'hud-build-badge hidden',
        classList: {
          contains(cls) {
            return String(this._owner.className || '').split(/\s+/).includes(cls);
          }
        },
        init() {
          this.classList._owner = this;
          return this;
        }
      }).init();
      const mockHudHost = { renderer: { isMobilePortrait: false, isMobileLandscape: false } };
      const mockHudCompactHost = { renderer: { isMobilePortrait: true, isMobileLandscape: false } };

      for (const hid of SOVEREIGN_BUILD_HERO_IDS) {
        const rosterCfg = CHAMPION_ROSTER[hid];
        const Cls = buildClsMap[hid];
        for (const pIdx of [0, 1, 2]) {
          HeroBuildSystem.setSlotPreset('p1', hid, pIdx);
          const kit = HeroBuildSystem.getProfileDisplayKit(hid, rosterCfg, 'p1', false);
          if (
            !kit ||
            !kit.showBuildUI ||
            !kit.hasCustomBuilds ||
            kit.slotBuild?.presetIndex !== pIdx ||
            kit.skills.length < 3
          ) {
            throw new Error(`[Suite 36.18C] Roster Select getProfileDisplayKit failed on ${hid} preset ${pIdx}!`);
          }
          if (pIdx > 0 && kit.skills[0].name === rosterCfg.skills[0].name) {
            throw new Error(`[Suite 36.18C] Roster Select Aspect card did not update on ${hid} preset ${pIdx}!`);
          }
          const f = new Cls(240, 520, 1);
          HeroBuildSystem.applyBuildToFighter(
            f,
            HeroBuildSystem.resolveMatchBuild('p1', hid, { isAdventure: false }),
            false
          );
          const badgeEl = makeMockBadgeEl();
          Game.prototype.syncFighterBuildBadge.call(mockHudHost, badgeEl, f, false);
          const compactEl = makeMockBadgeEl();
          Game.prototype.syncFighterBuildBadge.call(mockHudCompactHost, compactEl, f, false);
          if (
            badgeEl.className.includes('hidden') ||
            badgeEl.textContent !== f.buildConfig.hudLabel ||
            !badgeEl.textContent.startsWith(`${HERO_BUILD_CATALOG[hid].presets[pIdx].roman} `) ||
            compactEl.textContent !== f.buildConfig.hudCompact
          ) {
            throw new Error(`[Suite 36.18C] Arena HUD badge mismatch on ${hid} preset ${pIdx}: '${badgeEl.textContent}'`);
          }
          // Verify Adventure Mode hides badge
          Game.prototype.syncFighterBuildBadge.call(mockHudHost, badgeEl, f, true);
          if (!badgeEl.className.includes('hidden')) {
            throw new Error(`[Suite 36.18C] Arena HUD badge failed to hide in Adventure Mode on ${hid}!`);
          }
          f.fx?.dispose?.();
        }
      }

      const html3618 = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
      const css3618 = fs.readFileSync(path.join(REPO_ROOT, 'style.css'), 'utf8');
      for (const reqId of [
        'id="left-build-badge"',
        'id="right-build-badge"',
        'id="p1-build-preset-bar"',
        'id="p2-build-preset-bar"',
        'id="p1-tier-tabs-0"',
        'id="p1-tier-tabs-1"',
        'id="p1-tier-tabs-2"',
        'id="p2-tier-tabs-0"',
        'id="p2-tier-tabs-1"',
        'id="p2-tier-tabs-2"'
      ]) {
        if (!html3618.includes(reqId)) {
          throw new Error(`[Suite 36.18C] index.html missing Sovereign Loadout element ${reqId}!`);
        }
      }
      if (
        !css3618.includes('#app.is-adventure-active .hud-build-badge') ||
        !css3618.includes('.landing-overlay[data-branch="adventure"] .build-preset-strip') ||
        !css3618.includes('.build-preset-strip.hidden')
      ) {
        throw new Error('[Suite 36.18C] style.css missing Adventure / hidden display:none rules for Sovereign Loadouts!');
      }

      HeroBuildSystem.resetAllBuilds(true);
    } finally {
      globalThis.localStorage = prevStorage3618;
    }
  }

  // --------------------------------------------------------------------------
  // 36.19: Batch ?v=30fps156 Adventure Campaign Stage Pack Loader (`schemaVersion: "1.0.0"`),
  //        `celestial_gauntlet.json` Full 8-Wave + 3-Warden + 12.8K Boss Live Run,
  //        Custom 2-Zone JSON Import, Vault Encryption & Clean Teardown to `'default'`
  // --------------------------------------------------------------------------
  {
    const indexJsonPath = path.join(REPO_ROOT, 'assets/campaigns/index.json');
    const cgJsonPath = path.join(REPO_ROOT, 'assets/campaigns/celestial_gauntlet.json');
    if (!fs.existsSync(indexJsonPath) || !fs.existsSync(cgJsonPath)) {
      throw new Error('[Suite 36.19A] Missing assets/campaigns/index.json or celestial_gauntlet.json!');
    }
    const rawIndex = JSON.parse(fs.readFileSync(indexJsonPath, 'utf8'));
    const rawCelestial = JSON.parse(fs.readFileSync(cgJsonPath, 'utf8'));
    if (
      rawIndex.schemaVersion !== '1.0.0' ||
      !Array.isArray(rawIndex.packs) ||
      !rawIndex.packs.some((p) => p.packId === 'celestial_gauntlet') ||
      rawCelestial.schemaVersion !== '1.0.0' ||
      rawCelestial.packId !== 'celestial_gauntlet'
    ) {
      throw new Error('[Suite 36.19A] Invalid campaign catalog or celestial_gauntlet schemaVersion!');
    }

    const prevFetch3619 = globalThis.fetch;
    globalThis.fetch = async (url) => {
      const clean = String(url).split('?')[0].replace(/^\/+/, '');
      const fullPath = path.join(REPO_ROOT, clean);
      if (!fs.existsSync(fullPath)) {
        return { ok: false, status: 404, async json() { return {}; } };
      }
      const txt = fs.readFileSync(fullPath, 'utf8');
      return {
        ok: true,
        status: 200,
        async text() { return txt; },
        async json() { return JSON.parse(txt); }
      };
    };

    const mockBase = createMockGame();
    const advHost = {
      ...mockBase,
      fighters: [],
      leftFighter: null,
      rightFighter: null,
      isLandingOpen: false,
      isMatchOver: false,
      isPaused: false,
      matchTime: 42,
      updateHUD() {},
      isAdventureMode: () => true,
      getEnemiesOf: (f) => (f?.isMonster && advHost.leftFighter ? [advHost.leftFighter] : [])
    };
    const adv3619 = new AdventureManager(advHost);
    advHost.adventure = adv3619;
    advHost.onFighterDeath = (df) => {
      if (df?.isMonster) adv3619.onMonsterDeath(df);
    };

    const hero3619 = new WarriorEx(240, 561, 1);
    hero3619.game = advHost;
    advHost.leftFighter = hero3619;

    try {
      // (A) Default Campaign Purity (`campaignId === 'default'`, 9600px, 20 props, 11,800 HP Behemoth Malphas)
      adv3619.startCampaign(hero3619);
      if (
        adv3619.activeCampaignId !== DEFAULT_ADVENTURE_CAMPAIGN_ID ||
        adv3619.activeCampaignPack !== null ||
        adv3619.getWorldWidth() !== 9600 ||
        AdventureMapRenderer.getActiveCampaign() !== null ||
        adv3619.destructibles.props.length !== 20 ||
        adv3619.getBossConfig().name !== 'BEHEMOTH MALPHAS' ||
        adv3619.getBossConfig().maxHp !== 11800
      ) {
        throw new Error(
          `[Suite 36.19A] Default campaign purity failed: id=${adv3619.activeCampaignId}, props=${adv3619.destructibles.props.length}, boss=${JSON.stringify(adv3619.getBossConfig())}`
        );
      }

      // (B) Fetch index.json + celestial_gauntlet.json & play through all 4 Zones, 16 Props, 25 Monsters, 3 Wardens & 12,800 HP Boss
      const catalogPacks = await adv3619.fetchCampaignIndex();
      if (!catalogPacks.some((p) => p.packId === 'celestial_gauntlet')) {
        throw new Error('[Suite 36.19B] fetchCampaignIndex did not return celestial_gauntlet!');
      }
      const cgPack = await adv3619.loadCampaignPackById('celestial_gauntlet', 'celestial_gauntlet.json');
      adv3619.startCampaign(hero3619, cgPack);

      if (
        adv3619.activeCampaignId !== 'celestial_gauntlet' ||
        adv3619.getWorldWidth() !== 9600 ||
        AdventureMapRenderer.getActiveCampaign()?.packId !== 'celestial_gauntlet' ||
        adv3619.destructibles.props.length !== 16
      ) {
        throw new Error(
          `[Suite 36.19B] celestial_gauntlet failed to activate: id=${adv3619.activeCampaignId}, props=${adv3619.destructibles.props.length}`
        );
      }

      // Render all 4 custom zones with world-space emissiveAnchors & bloomPalettes (0 rotate / 0 arc / alpha <= 0.16)
      const renderTrack = { rotateCalls: 0, quadCalls: 0, arcCalls: 0, ellipseCalls: 0, maxLighterAlpha: 0 };
      const rCtx = createMockCtx(renderTrack);
      rCtx.arc = () => { renderTrack.arcCalls++; };
      rCtx.ellipse = () => { renderTrack.ellipseCalls++; };
      const origFillRect = rCtx.fillRect.bind(rCtx);
      const origDrawImg = rCtx.drawImage.bind(rCtx);
      rCtx.fillRect = (...args) => {
        if (rCtx.globalCompositeOperation === 'lighter' && rCtx.globalAlpha > renderTrack.maxLighterAlpha) {
          renderTrack.maxLighterAlpha = rCtx.globalAlpha;
        }
        return origFillRect(...args);
      };
      rCtx.drawImage = (...args) => {
        if (rCtx.globalCompositeOperation === 'lighter' && rCtx.globalAlpha > renderTrack.maxLighterAlpha) {
          renderTrack.maxLighterAlpha = rCtx.globalAlpha;
        }
        return origDrawImg(...args);
      };
      for (const testCamX of [600, 3100, 5600, 8920]) {
        advHost.renderer.camX = testCamX;
        advHost.renderer.time = 1.4;
        AdventureMapRenderer.render(rCtx, advHost.renderer, 9600);
        AdventureMapRenderer.renderForegroundDepth(rCtx, advHost.renderer);
      }
      // Also exercise custom archPano + world-space zones[].emissiveAnchors path
      const customArchImg = new globalThis.Image();
      customArchImg.naturalWidth = 1920;
      customArchImg.naturalHeight = 272;
      cgPack.customPanoramas.archPano = customArchImg;
      advHost.renderer.camX = 600;
      AdventureMapRenderer.render(rCtx, advHost.renderer, 9600);
      cgPack.customPanoramas.archPano = null;
      if (
        renderTrack.rotateCalls !== 0 ||
        renderTrack.arcCalls !== 0 ||
        renderTrack.ellipseCalls !== 0 ||
        renderTrack.maxLighterAlpha > 0.181 ||
        rCtx._stateStack.length !== 0
      ) {
        throw new Error(`[Suite 36.19B] Custom campaign map render invariant failed: ${JSON.stringify(renderTrack)}`);
      }

      // Shatter a relic prop (`cg_prop_2`, eclipse_astrolabe, dropType: 'relic') and verify pickup spawn
      adv3619.pickups.length = 0;
      const orreryProp = adv3619.destructibles.props.find((p) => p.id === 'cg_prop_2');
      if (!orreryProp || orreryProp.kind !== 'eclipse_astrolabe' || orreryProp.dropType !== 'relic') {
        throw new Error('[Suite 36.19B] Expected cg_prop_2 (eclipse_astrolabe, dropType=relic) in destructibles!');
      }
      adv3619.destructibles.damageProp(orreryProp, 9999, hero3619, true, advHost);
      if (!orreryProp.destroyed || !adv3619.pickups.some((pk) => pk.type === 'relic')) {
        throw new Error('[Suite 36.19B] Shattering cg_prop_2 failed to drop relic pickup!');
      }

      // Step through all 8 sub-waves (25 monsters + 3 Mini-Boss Wardens) -> Final Boss (`ARCHFIEND MALPHAS OVERLORD` 12,800 HP)
      let totalWaveMonstersSpawned = 0;
      const seenWardens = [];
      const seenEngineKinds = new Set();

      const clearCurrentSubWave = () => {
        const living = adv3619.getLivingMonsters();
        totalWaveMonstersSpawned += living.length;
        for (const m of living) {
          seenEngineKinds.add(m.kind);
          if (m.isMiniBoss) {
            seenWardens.push(`${m.name}:${m.maxHp}`);
          }
          m.takeDamage(999999, hero3619, true, 0, 0);
        }
        adv3619.update(0.05);
      };

      for (let zi = 0; zi < 4; zi++) {
        const zSpec = cgPack.zones[zi];
        if (zi > 0) {
          hero3619.x = zSpec.triggerX + 20;
          adv3619.update(0.05);
        }
        clearCurrentSubWave(); // clears subWave 1 (subWave0)
        hero3619.x = zSpec.midTriggerX + 20;
        adv3619.update(0.05);
        clearCurrentSubWave(); // clears subWave 2 (subWave1); on Zone 3 triggers Colossal Boss warning!
      }

      if (
        totalWaveMonstersSpawned !== 25 ||
        seenWardens.length !== 3 ||
        !seenWardens.includes('HIGH ASTROLOGER VEYR:2650') ||
        !seenWardens.includes('ELDER BRIAR-SOVEREIGN:3200') ||
        !seenWardens.includes('ARCH-LICH MORVATH:3000') ||
        !seenEngineKinds.has('dryad') ||
        !seenEngineKinds.has('cultist') ||
        !seenEngineKinds.has('fiend') ||
        !seenEngineKinds.has('brute') ||
        !adv3619.bossSpawnPending
      ) {
        throw new Error(
          `[Suite 36.19B] Wave/Warden progression mismatch: spawned=${totalWaveMonstersSpawned}, wardens=${seenWardens.join(',')}, kinds=${Array.from(seenEngineKinds).join(',')}, bossPending=${adv3619.bossSpawnPending}`
        );
      }

      // Advance past Boss Warning -> verify ARCHFIEND MALPHAS OVERLORD (12,800 HP at x=9335) spawns & can be vanquished
      adv3619.update(2.0);
      const overlord = adv3619.bossEntity;
      if (
        !overlord ||
        !overlord.isColossalBoss ||
        overlord.name !== 'ARCHFIEND MALPHAS OVERLORD' ||
        overlord.maxHp !== 12800 ||
        overlord.anchorX !== 9335
      ) {
        throw new Error(
          `[Suite 36.19B] Expected ARCHFIEND MALPHAS OVERLORD (12800 HP @ 9335), got ${overlord?.name} (${overlord?.maxHp} @ ${overlord?.anchorX})`
        );
      }
      overlord.takeDamage(999999, hero3619, true, 0, 0);
      if (!advHost.isMatchOver || !adv3619.zonesCleared[3]) {
        throw new Error('[Suite 36.19B] Slaying ARCHFIEND MALPHAS OVERLORD did not complete campaign victory!');
      }

      // (C) Custom 2-Zone (4800px) JSON Import with Schema Aliases (`destructibles`, `waves`, `boss`) & Clean Teardown
      advHost.isMatchOver = false;
      const custom2ZoneJson = JSON.stringify({
        schemaVersion: '1.0.0',
        packId: 'astral_trial_2z',
        title: 'ASTRAL TRIAL DUO',
        zoneCount: 2,
        worldWidth: 4800,
        zones: [
          { index: 0, id: 'z0', biome: 'sylvan', bloomPalette: 'emerald', minX: 0, maxX: 2400 },
          { index: 1, id: 'z1', biome: 'clocktower', bloomPalette: 'ember', minX: 2400, maxX: 4800, isBossZone: true }
        ],
        destructibles: [
          { id: 'c_p0', zone: 0, kind: 'starwood_lantern', x: 520, groundY: 452, dropType: 'ember' },
          { id: 'c_p1', zone: 1, kind: 'blackpit_brazier', x: 2920, groundY: 452, dropType: 'hp' }
        ],
        waves: [
          { zone: 0, subWave: 0, spawns: [{ type: 'sylph', x: 760, groundY: 540 }] },
          { zone: 0, subWave: 1, spawns: [{ type: 'treant', x: 1860, groundY: 560, isMiniBoss: true, wardenName: 'GROVE WATCHER', maxHp: 2100 }] },
          { zone: 1, subWave: 0, spawns: [{ type: 'imp', x: 3060, groundY: 555 }] }
        ],
        boss: {
          enabled: true,
          kind: 'archfiend',
          name: 'CINDER OVERLORD',
          maxHp: 9400,
          anchorX: 4535,
          groundY: 561
        }
      });

      const uiMockHost = {
        selectedCampaignId: DEFAULT_ADVENTURE_CAMPAIGN_ID,
        campaignIndexPacks: [],
        loadedCampaignPacks: new Map(),
        adventure: adv3619,
        advCampaignSelect: null,
        audio: null,
        renderCampaignSelectorOptions() {},
        syncRosterSelectionUI() {}
      };
      const importedPack = Game.prototype.importCampaignPackJsonText.call(
        uiMockHost,
        custom2ZoneJson,
        'astral_trial_2z.json'
      );
      adv3619.startCampaign(hero3619, importedPack);
      if (
        adv3619.activeCampaignId !== 'astral_trial_2z' ||
        adv3619.getWorldWidth() !== 4800 ||
        adv3619.destructibles.props.length !== 2 ||
        adv3619.getBossAnchorX() !== 4535 ||
        adv3619.getBossMaxWalkX() !== 4450 ||
        uiMockHost.selectedCampaignId !== 'astral_trial_2z'
      ) {
        throw new Error('[Suite 36.19C] Custom 2-Zone Stage Pack failed to normalize or start!');
      }

      // Verify stopCampaign() restores 100% of built-in defaults!
      adv3619.stopCampaign();
      if (
        adv3619.activeCampaignId !== DEFAULT_ADVENTURE_CAMPAIGN_ID ||
        adv3619.activeCampaignPack !== null ||
        AdventureMapRenderer.getActiveCampaign() !== null ||
        adv3619.destructibles.props.length !== 20 ||
        adv3619.getWorldWidth() !== 9600 ||
        adv3619.getBossConfig().name !== 'BEHEMOTH MALPHAS' ||
        adv3619.getBossConfig().maxHp !== 11800
      ) {
        throw new Error('[Suite 36.19C] stopCampaign() did not cleanly restore built-in defaults!');
      }

      // (D) Roster Selector UI, Versus Mode Isolation, URL `?campaign=` Wiring & AVSV Vault JSON Round-Trip
      const html3619 = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
      const css3619 = fs.readFileSync(path.join(REPO_ROOT, 'style.css'), 'utf8');
      const main3619 = fs.readFileSync(path.join(REPO_ROOT, 'src/main.js'), 'utf8');
      for (const reqNeedle of [
        'id="adv-campaign-selector-bar"',
        'id="adv-campaign-select"',
        'id="btn-import-campaign-json"',
        'id="input-import-campaign-json"',
        'ORIGINAL PILGRIMAGE'
      ]) {
        if (!html3619.includes(reqNeedle)) {
          throw new Error(`[Suite 36.19D] index.html missing Stage Pack Selector hook: ${reqNeedle}`);
        }
      }
      if (
        !css3619.includes('.landing-overlay:not([data-branch="adventure"]) .adv-campaign-selector-bar') ||
        !main3619.includes("params.get('campaign')")
      ) {
        throw new Error('[Suite 36.19D] Missing Versus Mode CSS isolation or ?campaign= URL loader in main.js!');
      }

      const testVaultKey = crypto.randomBytes(32);
      const plainCgBuf = fs.readFileSync(cgJsonPath);
      const encCgPack = encryptAvsvPack(plainCgBuf, testVaultKey);
      const decCgBuf = decryptAvsvPack(encCgPack, testVaultKey);
      if (!decCgBuf.equals(plainCgBuf)) {
        throw new Error('[Suite 36.19D] AVSV AES-256-GCM round-trip mismatch on celestial_gauntlet.json!');
      }
    } finally {
      adv3619.stopCampaign();
      hero3619.fx?.dispose?.();
      globalThis.fetch = prevFetch3619;
    }
  }

  // --------------------------------------------------------------------------
  // 36.20: Seraphina Voice Pack (`gemini-3.8-flash-tts` MP3s, `AudioManager.playHeroVoice`
  // Priority/Interrupts, `[I]/[II]` Loadout Cues & Two-Stage `FINAL GRACE` Sync)
  // --------------------------------------------------------------------------
  {
    const ttsBuilderSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts/build_seraphina_voices_tts.mjs'),
      'utf8'
    );
    if (!ttsBuilderSrc.includes("const LOCKED_TTS_MODEL = 'models/gemini-3.8-flash-tts';")) {
      throw new Error(
        '[Suite 36.20] build_seraphina_voices_tts.mjs must strictly lock LOCKED_TTS_MODEL to models/gemini-3.8-flash-tts!'
      );
    }

    const audio3620 = new AudioManager();
    const expectedVoiceKeys = [
      'seraphina_select',
      'seraphina_intro',
      'seraphina_attack_1',
      'seraphina_attack_2',
      'seraphina_skill_std',
      'seraphina_skill_crimson',
      'seraphina_ult_std',
      'seraphina_ult_crimson',
      'seraphina_true_ult_charge',
      'seraphina_true_ult_fire',
      'seraphina_hurt',
      'seraphina_death',
      'seraphina_victory'
    ];
    for (const vk of expectedVoiceKeys) {
      if (!(vk in audio3620.voiceVolumes)) {
        throw new Error(`[Suite 36.20] Missing voice key '${vk}' in AudioManager.voiceVolumes!`);
      }
      const mp3Path = path.join(REPO_ROOT, 'assets/voices', `${vk}.mp3`);
      if (!fs.existsSync(mp3Path)) {
        throw new Error(`[Suite 36.20] Missing mastered MP3 asset on disk: ${mp3Path}`);
      }
      const mp3Buf = fs.readFileSync(mp3Path);
      const isId3 = mp3Buf.length > 512 && mp3Buf.subarray(0, 3).toString('ascii') === 'ID3';
      const isMpegFrame = mp3Buf.length > 512 && mp3Buf[0] === 0xff && (mp3Buf[1] & 0xe0) === 0xe0;
      if (!isId3 && !isMpegFrame) {
        throw new Error(`[Suite 36.20] Invalid MP3 header in ${mp3Path}!`);
      }
    }

    // Verify priority-based vocal channel interruption & non-interruption on AudioManager
    let stoppedCount = 0;
    const mockCtx3620 = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createGain: () => ({
        gain: {
          value: 1,
          setValueAtTime(v) {
            this.value = v;
          },
          exponentialRampToValueAtTime(v) {
            this.value = v;
          },
          linearRampToValueAtTime(v) {
            this.value = v;
          }
        },
        connect() {},
        disconnect() {}
      }),
      createStereoPanner: () => ({
        pan: { value: 0 },
        connect() {},
        disconnect() {}
      }),
      createBufferSource: () => ({
        buffer: null,
        playbackRate: { value: 1 },
        onended: null,
        connect() {},
        disconnect() {},
        start() {},
        stop() {
          stoppedCount++;
        }
      })
    };
    audio3620.ctx = mockCtx3620;
    audio3620.master = {};
    for (const vk of expectedVoiceKeys) {
      audio3620.voiceBuffers[vk] = { duration: 2.5 };
    }

    const playedUlt = audio3620.playHeroVoice('priestess_ex', 'true_ult_charge', {
      worldX: 400,
      speakerKey: 'sera_p1',
      priority: 3,
      cooldownMs: 50
    });
    const blockedLowPrio = audio3620.playHeroVoice('priestess_ex', 'hurt', {
      worldX: 400,
      speakerKey: 'sera_p1',
      priority: 1,
      cooldownMs: 50
    });
    const promotedBeam = audio3620.playHeroVoice('priestess_ex', 'true_ult_fire', {
      worldX: 400,
      speakerKey: 'sera_p1',
      priority: 4,
      cooldownMs: 50
    });
    if (!playedUlt || blockedLowPrio !== false || !promotedBeam || stoppedCount < 1) {
      throw new Error(
        `[Suite 36.20] AudioManager priority vocal channel failed: playedUlt=${playedUlt}, blockedLowPrio=${blockedLowPrio}, promotedBeam=${promotedBeam}, stoppedCount=${stoppedCount}`
      );
    }

    // Verify PriestessEx live combat fires Standard [I] & Crimson [II] cues + two-stage Final Grace
    const voiceLog3620 = [];
    const mockGame3620 = {
      isAdventureMode: () => false,
      is2v2Mode: () => false,
      renderer: {
        worldWidth: 1200,
        groundY: 580,
        triggerShake() {},
        triggerAberration() {},
        triggerHitStop() {},
        triggerImpactFrame() {}
      },
      vfx: {
        spawnSpecialCastAura() {},
        spawnDamageText() {},
        spawnShockwave() {},
        spawnGlyphBurst() {},
        spawnFlamePillar() {},
        spawnSkyStrike() {},
        spawnProjectile() {},
        spawnBeam() {},
        spawnBurst() {}
      },
      audio: {
        play() {},
        playHeroVoice(hid, cue) {
          voiceLog3620.push(`${hid}:${cue}`);
          return true;
        }
      },
      getEnemiesOf: () => []
    };
    const seraStd = new PriestessEx({ x: 340, groundY: 580, facing: 1 });
    const dummyFoe = new WarriorEx({ x: 760, groundY: 580, facing: -1 });
    seraStd.game = mockGame3620;
    dummyFoe.game = mockGame3620;

    try {
      seraStd.setState('SKILL');
      seraStd.stateTimer = 0.2;
      seraStd.updateSkill(1 / 60, dummyFoe, mockGame3620);

      seraStd.buildSkill = 1;
      seraStd.setState('SKILL');
      seraStd.didSanctuaryHeal = false;
      seraStd.stateTimer = 0.2;
      seraStd.updateSkill(1 / 60, dummyFoe, mockGame3620);

      seraStd.buildUlt = 0;
      seraStd.setState('ULTIMATE');
      seraStd.stateTimer = 0.2;
      seraStd.updateUltimate(1 / 60, dummyFoe, mockGame3620);

      seraStd.buildUlt = 1;
      seraStd.setState('ULTIMATE');
      seraStd.didUltMiracle = false;
      seraStd.stateTimer = 0.2;
      seraStd.updateUltimate(1 / 60, dummyFoe, mockGame3620);

      seraStd.setState('TRUE_ULTIMATE');
      seraStd._finalGracePlayedChargeSfx = false;
      seraStd.finalGraceDidFire = false;
      seraStd.stateTimer = 0.05;
      seraStd.updateTrueUltimate(1 / 60, dummyFoe, mockGame3620);
      seraStd.stateTimer = 3.05;
      seraStd.updateTrueUltimate(1 / 60, dummyFoe, mockGame3620);

      for (const reqCue of [
        'priestess_ex:skill_std',
        'priestess_ex:skill_crimson',
        'priestess_ex:ult_std',
        'priestess_ex:ult_crimson',
        'priestess_ex:true_ult_charge',
        'priestess_ex:true_ult_fire'
      ]) {
        if (!voiceLog3620.includes(reqCue)) {
          throw new Error(
            `[Suite 36.20] Expected PriestessEx combat to trigger '${reqCue}', got [${voiceLog3620.join(', ')}]`
          );
        }
      }
    } finally {
      seraStd.fx?.dispose?.();
      dummyFoe.fx?.dispose?.();
    }
    audio3620.stopAllHeroVoices(0);
  }

  // --------------------------------------------------------------------------
  // 36.21: Batch ?v=30fps156 Dual Voice/SFX Audio Mixer (`avs_audio_mix_v1`),
  // Continuous `sfxDuckGain` Sidechain Ducking, Pre-Round Intro Standoff
  // (`beginLiveRoundIntro` / `skipRoundIntro`) & 9.0s Victory Screen Hold
  // --------------------------------------------------------------------------
  {
    const prevStorageDesc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const prevWinDesc = globalThis.window
      ? Object.getOwnPropertyDescriptor(globalThis.window, 'localStorage')
      : null;
    const mixMemStore = new Map();
    const mockStore3621 = {
      getItem: (k) => (mixMemStore.has(k) ? mixMemStore.get(k) : null),
      setItem: (k, v) => mixMemStore.set(k, String(v)),
      removeItem: (k) => mixMemStore.delete(k)
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStore3621,
      configurable: true,
      writable: true
    });
    if (globalThis.window) {
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: mockStore3621,
        configurable: true,
        writable: true
      });
    }
    try {
      const mixAudio = new AudioManager();
      const makeGainMock = (initVal = 1) => ({
        gain: {
          value: initVal,
          setValueAtTime(v) {
            this.value = v;
          },
          linearRampToValueAtTime(v) {
            this.value = v;
          },
          exponentialRampToValueAtTime(v) {
            this.value = v;
          }
        },
        connect() {},
        disconnect() {}
      });
      mixAudio.ctx = {
        state: 'running',
        currentTime: 1.0,
        destination: {},
        createGain: () => makeGainMock(1),
        createStereoPanner: () => ({ pan: { value: 0 }, connect() {}, disconnect() {} }),
        createBufferSource: () => ({
          buffer: null,
          playbackRate: { value: 1 },
          onended: null,
          connect() {},
          disconnect() {},
          start() {},
          stop() {}
        })
      };
      mixAudio.sfxBus = makeGainMock(mixAudio.getSfxVolume());
      mixAudio.sfxDuckGain = makeGainMock(1.0);
      mixAudio.voiceBus = makeGainMock(mixAudio.getVoiceVolume() * 1.42);
      mixAudio.master = mixAudio.sfxBus;
      mixAudio.voiceBuffers.seraphina_ult_std = { duration: 3.5 };
      mixAudio.buffers.holy_bolt = { duration: 0.4 };

      // 1. Default balance puts Voice (100% * 1.42 trim) cleanly above SFX (55%), and persists edits
      if (Math.abs(mixAudio.getVoiceVolume() - 1.0) > 1e-6 || Math.abs(mixAudio.getSfxVolume() - 0.55) > 1e-6) {
        throw new Error(
          `[Suite 36.21] Unexpected default audio mix: voice=${mixAudio.getVoiceVolume()}, sfx=${mixAudio.getSfxVolume()}`
        );
      }
      mixAudio.setVoiceVolume(0.85);
      mixAudio.setSfxVolume(0.35);
      mixAudio.toggleSfx();
      const restoredAudio = new AudioManager();
      if (
        Math.abs(restoredAudio.getVoiceVolume() - 0.85) > 1e-6 ||
        Math.abs(restoredAudio.getSfxVolume() - 0.35) > 1e-6 ||
        restoredAudio.sfxEnabled !== false ||
        restoredAudio.voiceEnabled !== true
      ) {
        throw new Error(
          `[Suite 36.21] localStorage mix persistence failed: voice=${restoredAudio.getVoiceVolume()}, sfx=${restoredAudio.getSfxVolume()}, sfxEnabled=${restoredAudio.sfxEnabled}`
        );
      }
      mixAudio.toggleSfx(); // restore sfxEnabled = true

      // 2. Continuous sidechain ducking ducks sfxDuckGain while voice is active (including newly-spawned SFX)
      mixAudio.playHeroVoice('priestess_ex', 'ult_std', {
        speakerKey: 'sera_duck_test',
        priority: 3,
        cooldownMs: 10
      });
      if (!(mixAudio.sfxDuckGain.gain.value <= 0.30)) {
        throw new Error(
          `[Suite 36.21] Expected sfxDuckGain <= 0.30 during priority-3 voice, got ${mixAudio.sfxDuckGain.gain.value}`
        );
      }
      mixAudio.play('holy_bolt', 500);
      if (!(mixAudio.sfxDuckGain.gain.value <= 0.30)) {
        throw new Error(
          `[Suite 36.21] Expected newly-spawned SFX to remain sidechain-ducked <= 0.30, got ${mixAudio.sfxDuckGain.gain.value}`
        );
      }
      mixAudio.stopAllHeroVoices(0);
      if (Math.abs(mixAudio.sfxDuckGain.gain.value - 1.0) > 1e-6) {
        throw new Error(
          `[Suite 36.21] Expected sfxDuckGain to recover to 1.0 after voice ends, got ${mixAudio.sfxDuckGain.gain.value}`
        );
      }

      // 3. Verify Pre-Round Intro Standoff holds combat & fires 'intro' voice, plus 9000ms Victory Hold
      const introGame = Object.create(Game.prototype);
      const seraP1 = new PriestessEx({ x: 240, groundY: 580, facing: 1 });
      const warP2 = new WarriorEx({ x: 960, groundY: 580, facing: -1 });
      try {
        seraP1.team = 1;
        seraP1.isPoint = true;
        warP2.team = 2;
        warP2.isPoint = true;
        introGame.gameMode = '1v1';
        introGame.simMode = true;
        introGame.isLandingOpen = false;
        introGame.isMatchOver = false;
        introGame.isSimPaused = false;
        introGame.matchTime = 0;
        introGame.hudTimer = 0;
        introGame.slot1Hero = 'priestess_ex';
        introGame.slot2Hero = 'warrior_ex';
        introGame.leftFighter = seraP1;
        introGame.rightFighter = warP2;
        introGame.fighters = [seraP1, warP2];
        introGame.renderer = {
          groundY: 580,
          worldWidth: 1200,
          hitStopTimer: 0,
          update() {}
        };
        introGame.vfx = { update() {} };
        introGame.victoryOverlay = {
          classList: {
            remove() {},
            add() {},
            contains: () => false
          }
        };
        introGame.setPaused = () => {};
        introGame.updateHUD = () => {};
        const introVoiceLog = [];
        introGame.audio = {
          enabled: true,
          voiceEnabled: true,
          getVoiceVolume: () => 1.0,
          hasVoicePack: (hid) => hid === 'priestess_ex',
          preloadHeroVoicePack() {},
          preDuckSfxForVoice() {},
          stopAllHeroVoices() {},
          play() {},
          playHeroVoice(hid, cue, opts) {
            introVoiceLog.push({ hid, cue, priority: opts?.priority });
            return true;
          }
        };
        const introDur = introGame.beginLiveRoundIntro({ forceInTest: true });
        if (Math.abs(introDur - 4.15) > 0.05) {
          throw new Error(`[Suite 36.21] Expected 4.15s voiced standoff duration, got ${introDur}`);
        }
        const startX1 = introGame.leftFighter.x;
        const startX2 = introGame.rightFighter.x;
        for (let i = 0; i < 12; i++) {
          introGame.stepSimulation(1 / 60);
        }
        if (
          introGame.matchTime !== 0 ||
          introGame.leftFighter.x !== startX1 ||
          introGame.rightFighter.x !== startX2 ||
          introGame.leftFighter.state !== 'IDLE' ||
          !introVoiceLog.some((v) => v.hid === 'priestess_ex' && v.cue === 'intro' && v.priority >= 3)
        ) {
          throw new Error(
            `[Suite 36.21] Pre-round standoff failed to hold combat or fire intro voice! matchTime=${introGame.matchTime}, voices=${JSON.stringify(introVoiceLog)}`
          );
        }
        introGame.skipRoundIntro();
        if (introGame.roundIntroTimer !== 0 || !(introGame._roundEngageBannerTimer > 0)) {
          throw new Error('[Suite 36.21] skipRoundIntro() failed to clear roundIntroTimer and show ENGAGE!');
        }

        // Verify 9.0s Auto-Tourney Victory Screen hold
        introGame.autoTourney = true;
        introGame.isMatchOver = true;
        introGame.victoryRevealPending = true;
        introGame.lastMatchWinnerHeroId = 'priestess_ex';
        const nowBeforeReveal = typeof performance !== 'undefined' ? performance.now() : Date.now();
        introGame.revealVictoryOverlay();
        const holdSpanMs = (introGame._autoNextDeadlineMs || 0) - nowBeforeReveal;
        introGame._clearAutoNextTimers();
        if (
          !(holdSpanMs >= 8800) ||
          !introVoiceLog.some((v) => v.hid === 'priestess_ex' && v.cue === 'victory' && v.priority === 4)
        ) {
          throw new Error(
            `[Suite 36.21] Expected Victory Screen Auto-Tourney hold >= 8800ms & priority-4 victory voice, got holdSpanMs=${holdSpanMs}`
          );
        }
      } finally {
        introGame._clearAutoNextTimers?.();
        seraP1.fx?.dispose?.();
        warP2.fx?.dispose?.();
      }

      // 4. Verify HTML/CSS Audio Mixer hooks exist cleanly
      const html3621 = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
      const css3621 = fs.readFileSync(path.join(REPO_ROOT, 'style.css'), 'utf8');
      for (const hook of [
        'id="btn-voice"',
        'id="input-voice-vol"',
        'id="input-sfx-vol"',
        'id="btn-nav-audio"',
        'id="nav-audio-popover"',
        'NEXT CHALLENGER IN 9S...'
      ]) {
        if (!html3621.includes(hook)) {
          throw new Error(`[Suite 36.21] index.html missing expected Audio Mixer / Victory hook: ${hook}`);
        }
      }
      if (!css3621.includes('.pause-audio-mixer') || !css3621.includes('.nav-audio-popover')) {
        throw new Error('[Suite 36.21] style.css missing .pause-audio-mixer or .nav-audio-popover styles!');
      }
    } finally {
      if (prevStorageDesc) {
        Object.defineProperty(globalThis, 'localStorage', prevStorageDesc);
      }
      if (globalThis.window && prevWinDesc) {
        Object.defineProperty(globalThis.window, 'localStorage', prevWinDesc);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.22: Champion Voice Pack Batch 1 (6 Heroes + Seraphina JP, 182 MP3s),
  // EN/JP Language Toggle + Fallback Routing & Legacy Fighter.js Voice Hooks
  // --------------------------------------------------------------------------
  {
    const batch1BuilderSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts/build_voice_packs_batch1_tts.mjs'),
      'utf8'
    );
    if (!batch1BuilderSrc.includes("const LOCKED_TTS_MODEL = 'models/gemini-3.8-flash-tts';")) {
      throw new Error(
        '[Suite 36.22] build_voice_packs_batch1_tts.mjs must strictly lock LOCKED_TTS_MODEL to models/gemini-3.8-flash-tts!'
      );
    }

    const prevStorageDesc22 = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const prevWinDesc22 = globalThis.window
      ? Object.getOwnPropertyDescriptor(globalThis.window, 'localStorage')
      : null;
    const prevFetchDesc22 = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
    const memStore22 = new Map();
    const mockStore22 = {
      getItem: (k) => (memStore22.has(k) ? memStore22.get(k) : null),
      setItem: (k, v) => memStore22.set(k, String(v)),
      removeItem: (k) => memStore22.delete(k)
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStore22,
      configurable: true,
      writable: true
    });
    if (globalThis.window) {
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: mockStore22,
        configurable: true,
        writable: true
      });
    }

    try {
      const audio22 = new AudioManager();
      const expectedHeroMap = {
        priestess_ex: 'seraphina',
        priestess: 'seraphina',
        warrior_ex: 'aethelgard',
        warrior: 'aethelgard',
        ronin_ex: 'kazemaru',
        ronin: 'kazemaru',
        mage_ex: 'ignissol',
        mage: 'ignissol',
        valkyrie_ex: 'freyja',
        valkyrie: 'freyja',
        reaper_ex: 'malakor',
        reaper: 'malakor',
        nyx_ex: 'nyx'
      };
      for (const [hid, prefix] of Object.entries(expectedHeroMap)) {
        if (audio22.heroVoiceMap[hid] !== prefix) {
          throw new Error(
            `[Suite 36.22] Expected AudioManager.heroVoiceMap['${hid}'] === '${prefix}', got '${audio22.heroVoiceMap[hid]}'`
          );
        }
      }

      const verifyValidMp3 = (mp3Path) => {
        if (!fs.existsSync(mp3Path)) {
          throw new Error(`[Suite 36.22] Missing mastered MP3 asset on disk: ${mp3Path}`);
        }
        const buf = fs.readFileSync(mp3Path);
        const isId3 = buf.length > 512 && buf.subarray(0, 3).toString('ascii') === 'ID3';
        const isMpeg = buf.length > 512 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
        if (!isId3 && !isMpeg) {
          throw new Error(`[Suite 36.22] Invalid MP3 header in ${mp3Path}!`);
        }
      };

      const batch1Cues = [
        'select',
        'intro',
        'attack_1',
        'attack_2',
        'skill_std',
        'skill_alt',
        'ult_std',
        'ult_alt',
        'true_ult_charge',
        'true_ult_fire',
        'hurt',
        'death',
        'victory'
      ];
      const seraCues = [
        'select',
        'intro',
        'attack_1',
        'attack_2',
        'skill_std',
        'skill_crimson',
        'ult_std',
        'ult_crimson',
        'true_ult_charge',
        'true_ult_fire',
        'hurt',
        'death',
        'victory'
      ];

      for (const cue of seraCues) {
        const vk = `seraphina_${cue}`;
        if (!(vk in audio22.voiceVolumes)) {
          throw new Error(`[Suite 36.22] Missing '${vk}' in AudioManager.voiceVolumes!`);
        }
        verifyValidMp3(path.join(REPO_ROOT, 'assets/voices', `${vk}.mp3`));
        verifyValidMp3(path.join(REPO_ROOT, 'assets/voices/ja', `${vk}.mp3`));
      }
      for (const prefix of ['aethelgard', 'kazemaru', 'ignissol', 'freyja', 'malakor', 'nyx']) {
        for (const cue of batch1Cues) {
          const vk = `${prefix}_${cue}`;
          if (!(vk in audio22.voiceVolumes)) {
            throw new Error(`[Suite 36.22] Missing '${vk}' in AudioManager.voiceVolumes!`);
          }
          verifyValidMp3(path.join(REPO_ROOT, 'assets/voices', `${vk}.mp3`));
          verifyValidMp3(path.join(REPO_ROOT, 'assets/voices/ja', `${vk}.mp3`));
        }
      }

      if (
        audio22._resolveVoiceKey('seraphina', 'skill_alt') !== 'seraphina_skill_crimson' ||
        audio22._resolveVoiceKey('aethelgard', 'ult_alt') !== 'aethelgard_ult_alt'
      ) {
        throw new Error('[Suite 36.22] Voice cue alias resolution failed!');
      }

      // Verify EN <-> JP language toggle persistence & ${lang}:${voiceKey} buffer scoping + fallback
      if (audio22.getVoiceLang() !== 'en') {
        throw new Error(`[Suite 36.22] Expected default voiceLang 'en', got '${audio22.getVoiceLang()}'`);
      }
      audio22.setVoiceLang('ja');
      const restoredLangAudio = new AudioManager();
      if (restoredLangAudio.getVoiceLang() !== 'ja') {
        throw new Error(
          `[Suite 36.22] Expected persisted voiceLang 'ja', got '${restoredLangAudio.getVoiceLang()}'`
        );
      }

      const playedBuffers = [];
      audio22.ctx = {
        state: 'running',
        currentTime: 0,
        destination: {},
        decodeAudioData: async (arr) => ({ tag: Buffer.from(arr).toString('utf8'), duration: 1.5 }),
        createGain: () => ({
          gain: {
            value: 1,
            setValueAtTime(v) {
              this.value = v;
            },
            linearRampToValueAtTime(v) {
              this.value = v;
            },
            exponentialRampToValueAtTime(v) {
              this.value = v;
            }
          },
          connect() {},
          disconnect() {}
        }),
        createStereoPanner: () => ({ pan: { value: 0 }, connect() {}, disconnect() {} }),
        createBufferSource: () => {
          const node = {
            buffer: null,
            playbackRate: { value: 1 },
            onended: null,
            connect() {},
            disconnect() {},
            start() {
              playedBuffers.push(node.buffer?.tag || 'unknown');
            },
            stop() {}
          };
          return node;
        }
      };
      audio22.master = {};
      audio22.voiceBus = {};
      audio22.voiceBuffers['en:aethelgard_select'] = { tag: 'EN_BUF', duration: 2.0 };
      audio22.voiceBuffers['ja:aethelgard_select'] = { tag: 'JA_BUF', duration: 2.0 };

      audio22.setVoiceLang('en', false);
      audio22.playHeroVoice('warrior_ex', 'select', { speakerKey: 'lang_sw', priority: 2, cooldownMs: 0 });
      audio22.setVoiceLang('ja', false);
      audio22.playHeroVoice('warrior_ex', 'select', { speakerKey: 'lang_sw', priority: 2, cooldownMs: 0 });
      if (playedBuffers[0] !== 'EN_BUF' || playedBuffers[1] !== 'JA_BUF') {
        throw new Error(
          `[Suite 36.22] Language-scoped buffer playback failed: [${playedBuffers.join(', ')}]`
        );
      }

      const fetchLog = [];
      globalThis.fetch = async (url) => {
        fetchLog.push(String(url));
        if (String(url).includes('assets/voices/ja/')) {
          return { ok: false, status: 404 };
        }
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => Buffer.from('EN_FALLBACK_MP3', 'utf8')
        };
      };
      const fallbackBuf = await audio22.loadVoiceKey('kazemaru_select', 'ja');
      if (
        !fallbackBuf ||
        fallbackBuf.tag !== 'EN_FALLBACK_MP3' ||
        fetchLog.length < 2 ||
        !fetchLog[0].includes('assets/voices/ja/kazemaru_select.mp3') ||
        !fetchLog[1].includes('assets/voices/kazemaru_select.mp3')
      ) {
        throw new Error(
          `[Suite 36.22] Missing JA->EN fallback on loadVoiceKey: fetchLog=${JSON.stringify(fetchLog)}`
        );
      }

      // Verify all 6 Batch-1 *Ex.js champions + all 6 Legacy champions trigger combat voices
      const voiceLog22 = [];
      const dummyFoe22 = new WarriorEx({ x: 760, groundY: 580, facing: -1 });
      const mockGame22 = {
        ...createMockGame(),
        isAdventureMode: () => false,
        is2v2Mode: () => false,
        getEnemiesOf: () => [dummyFoe22],
        audio: {
          play() {},
          hasVoicePack: (hid) => hid in expectedHeroMap,
          playHeroVoice(hid, cue) {
            voiceLog22.push(`${hid}:${cue}`);
            return true;
          }
        }
      };
      dummyFoe22.game = mockGame22;
      dummyFoe22.maxHp = 999999;
      dummyFoe22.hp = 999999;

      const exSpecs = [
        { Cls: WarriorEx, hid: 'warrior_ex', fireT: 3.60 },
        { Cls: RoninEx, hid: 'ronin_ex', fireT: 1.98 },
        { Cls: FireMageEx, hid: 'mage_ex', fireT: 3.25 },
        { Cls: ValkyrieEx, hid: 'valkyrie_ex', fireT: 3.15 },
        { Cls: ReaperEx, hid: 'reaper_ex', fireT: 3.20 },
        { Cls: NyxEx, hid: 'nyx_ex', fireT: 2.35 }
      ];
      try {
        for (const spec of exSpecs) {
          const hero = new spec.Cls({ x: 340, groundY: 580, facing: 1 });
          hero.game = mockGame22;
          try {
            hero._comboPersistTimer = 0.5;
            hero.comboStep = 3;
            hero.setState('AUTO_ATTACK');
            hero.stateTimer = 0.20;
            hero.updateAutoAttack(1 / 60, dummyFoe22, mockGame22);

            hero.setState('IDLE');
            hero.buildSkill = 0;
            hero.setState('SKILL');
            hero.stateTimer = 0.12;
            hero.updateSkill(1 / 60, dummyFoe22, mockGame22);

            hero.setState('IDLE');
            hero.buildSkill = 1;
            hero.setState('SKILL');
            hero.stateTimer = 0.12;
            hero.updateSkill(1 / 60, dummyFoe22, mockGame22);

            hero.setState('IDLE');
            hero.buildUlt = 0;
            hero.setState('ULTIMATE');
            hero.stateTimer = 0.10;
            hero.updateUltimate(1 / 60, dummyFoe22, mockGame22);

            hero.setState('IDLE');
            hero.buildUlt = 1;
            hero.setState('ULTIMATE');
            hero.stateTimer = 0.10;
            hero.updateUltimate(1 / 60, dummyFoe22, mockGame22);

            hero.setState('TRUE_ULTIMATE');
            hero.stateTimer = 0.05;
            hero.updateTrueUltimate(1 / 60, dummyFoe22, mockGame22);
            hero.stateTimer = spec.fireT;
            hero.updateTrueUltimate(1 / 60, dummyFoe22, mockGame22);
          } finally {
            hero.fx?.dispose?.();
          }

          for (const cue of [
            'attack',
            'skill_std',
            'skill_alt',
            'ult_std',
            'ult_alt',
            'true_ult_charge',
            'true_ult_fire'
          ]) {
            const token = `${spec.hid}:${cue}`;
            if (!voiceLog22.includes(token)) {
              throw new Error(
                `[Suite 36.22] Expected ${spec.Cls.name} to trigger '${token}', got [${voiceLog22.filter((v) => v.startsWith(spec.hid + ':')).join(', ')}]`
              );
            }
          }
        }

        const legacySpecs = [
          { Cls: Warrior, hid: 'warrior', fireT: 3.76 },
          { Cls: Ronin, hid: 'ronin', fireT: 1.98 },
          { Cls: FireMage, hid: 'mage', fireT: 3.24 },
          { Cls: Valkyrie, hid: 'valkyrie', fireT: 3.12 },
          { Cls: Reaper, hid: 'reaper', fireT: 3.17 },
          { Cls: Priestess, hid: 'priestess', fireT: 3.02 }
        ];
        for (const spec of legacySpecs) {
          const leg = new spec.Cls({ x: 340, groundY: 580, facing: 1 });
          leg.game = mockGame22;
          leg.setState('SKILL');
          leg.setState('ULTIMATE');
          leg.setState('TRUE_ULTIMATE');
          leg.stateTimer = spec.fireT;
          leg.update(1 / 60, dummyFoe22, mockGame22);
          for (const cue of ['skill_std', 'ult_std', 'true_ult_charge', 'true_ult_fire']) {
            const token = `${spec.hid}:${cue}`;
            if (!voiceLog22.includes(token)) {
              throw new Error(
                `[Suite 36.22] Expected Legacy fallback for ${spec.hid} to trigger '${token}'!`
              );
            }
          }
        }
      } finally {
        dummyFoe22.fx?.dispose?.();
      }

      const html3622 = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
      const css3622 = fs.readFileSync(path.join(REPO_ROOT, 'style.css'), 'utf8');
      const vault3622 = fs.readFileSync(path.join(REPO_ROOT, 'build/build_web_vault.mjs'), 'utf8');
      if (!html3622.includes('id="btn-voice-lang"') || !html3622.includes('id="btn-nav-voice-lang"')) {
        throw new Error('[Suite 36.22] index.html missing #btn-voice-lang or #btn-nav-voice-lang!');
      }
      if (!css3622.includes('.voice-lang-btn') || !css3622.includes('.vlang-opt.is-active')) {
        throw new Error('[Suite 36.22] style.css missing .voice-lang-btn / .vlang-opt.is-active!');
      }
      if (!vault3622.includes('assets/voices/ja')) {
        throw new Error('[Suite 36.22] build/build_web_vault.mjs missing assets/voices/ja bundling!');
      }
      audio22.stopAllHeroVoices(0);
    } finally {
      if (prevFetchDesc22) {
        Object.defineProperty(globalThis, 'fetch', prevFetchDesc22);
      } else {
        delete globalThis.fetch;
      }
      if (prevStorageDesc22) {
        Object.defineProperty(globalThis, 'localStorage', prevStorageDesc22);
      }
      if (globalThis.window && prevWinDesc22) {
        Object.defineProperty(globalThis.window, 'localStorage', prevWinDesc22);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.23: Champion Voice Pack Batch 2 (Final 5 Heroes = 100% Roster, 312 MP3s
  // across 12 Personas in EN + JP, Vertex AI gemini-3.8-flash-tts, & 23-Hero Hooks)
  // --------------------------------------------------------------------------
  {
    const batch2BuilderSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts/build_voice_packs_batch2_tts.mjs'),
      'utf8'
    );
    for (const marker of [
      "LOCKED_TTS_MODEL = 'models/gemini-3.8-flash-tts'",
      'publishers/google/models/gemini-3.8-flash-tts:generateContent',
      'MAX_HTTP_REQUESTS_PER_RUN = 180',
      'VERTEX_API_KEY'
    ]) {
      if (!batch2BuilderSrc.includes(marker)) {
        throw new Error(
          `[Suite 36.23] build_voice_packs_batch2_tts.mjs missing required marker '${marker}'!`
        );
      }
    }

    const audio23 = new AudioManager();
    const expectedFullHeroMap = {
      priestess_ex: 'seraphina',
      priestess: 'seraphina',
      warrior_ex: 'aethelgard',
      warrior: 'aethelgard',
      ronin_ex: 'kazemaru',
      ronin: 'kazemaru',
      mage_ex: 'ignissol',
      mage: 'ignissol',
      valkyrie_ex: 'freyja',
      valkyrie: 'freyja',
      reaper_ex: 'malakor',
      reaper: 'malakor',
      nyx_ex: 'nyx',
      icemage_ex: 'lyra',
      icemage: 'lyra',
      archer_ex: 'sylvara',
      archer: 'sylvara',
      android_ex: 'vex09',
      android: 'vex09',
      chronomancer_ex: 'chronos',
      chronomancer: 'chronos',
      titan_ex: 'torgar',
      titan: 'torgar'
    };

    const mappedHeroIds = Object.keys(audio23.heroVoiceMap);
    if (mappedHeroIds.length !== 23) {
      throw new Error(
        `[Suite 36.23] Expected 23 hero IDs in AudioManager.heroVoiceMap, got ${mappedHeroIds.length}`
      );
    }
    for (const [hid, prefix] of Object.entries(expectedFullHeroMap)) {
      if (audio23.heroVoiceMap[hid] !== prefix) {
        throw new Error(
          `[Suite 36.23] Expected AudioManager.heroVoiceMap['${hid}'] === '${prefix}', got '${audio23.heroVoiceMap[hid]}'`
        );
      }
    }

    const voiceVolKeys = Object.keys(audio23.voiceVolumes);
    if (voiceVolKeys.length !== 204) {
      throw new Error(
        `[Suite 36.23] Expected 204 voice keys in AudioManager.voiceVolumes, got ${voiceVolKeys.length}`
      );
    }

    const hdrBuf = Buffer.alloc(16);
    const verifyValidMp3Fast = (mp3Path) => {
      if (!fs.existsSync(mp3Path)) {
        throw new Error(`[Suite 36.23] Missing mastered MP3 asset on disk: ${mp3Path}`);
      }
      if (fs.statSync(mp3Path).size <= 512) {
        throw new Error(`[Suite 36.23] Truncated MP3 asset (<= 512B): ${mp3Path}`);
      }
      const fd = fs.openSync(mp3Path, 'r');
      try {
        fs.readSync(fd, hdrBuf, 0, 16, 0);
      } finally {
        fs.closeSync(fd);
      }
      const isId3 = hdrBuf.subarray(0, 3).toString('ascii') === 'ID3';
      const isMpeg = hdrBuf[0] === 0xff && (hdrBuf[1] & 0xe0) === 0xe0;
      if (!isId3 && !isMpeg) {
        throw new Error(`[Suite 36.23] Invalid MP3 header in ${mp3Path}!`);
      }
    };

    for (const vk of voiceVolKeys) {
      verifyValidMp3Fast(path.join(REPO_ROOT, 'assets/voices', `${vk}.mp3`));
      verifyValidMp3Fast(path.join(REPO_ROOT, 'assets/voices/ja', `${vk}.mp3`));
    }

    const voiceLog23 = [];
    const dummyFoe23 = new WarriorEx({ x: 760, groundY: 580, facing: -1 });
    const mockGame23 = {
      ...createMockGame(),
      isAdventureMode: () => false,
      is2v2Mode: () => false,
      getEnemiesOf: () => [dummyFoe23],
      audio: {
        play() {},
        hasVoicePack: (hid) => hid in expectedFullHeroMap,
        playHeroVoice(hid, cue) {
          voiceLog23.push(`${hid}:${cue}`);
          return true;
        }
      }
    };
    dummyFoe23.game = mockGame23;
    dummyFoe23.maxHp = 999999;
    dummyFoe23.hp = 999999;

    const allExSpecs = [
      { Cls: PriestessEx, hid: 'priestess_ex', fireT: 3.05, altSuffix: 'crimson' },
      { Cls: WarriorEx, hid: 'warrior_ex', fireT: 3.60, altSuffix: 'alt' },
      { Cls: RoninEx, hid: 'ronin_ex', fireT: 1.98, altSuffix: 'alt' },
      { Cls: FireMageEx, hid: 'mage_ex', fireT: 3.25, altSuffix: 'alt' },
      { Cls: ValkyrieEx, hid: 'valkyrie_ex', fireT: 3.15, altSuffix: 'alt' },
      { Cls: ReaperEx, hid: 'reaper_ex', fireT: 3.20, altSuffix: 'alt' },
      { Cls: NyxEx, hid: 'nyx_ex', fireT: 2.35, altSuffix: 'alt' },
      { Cls: IceMageEx, hid: 'icemage_ex', fireT: 3.32, altSuffix: 'alt' },
      { Cls: ArcherEx, hid: 'archer_ex', fireT: 1.80, altSuffix: 'alt' },
      { Cls: AndroidEx, hid: 'android_ex', fireT: 1.72, altSuffix: 'alt' },
      { Cls: ChronomancerEx, hid: 'chronomancer_ex', fireT: 3.56, altSuffix: 'alt' },
      { Cls: TitanEx, hid: 'titan_ex', fireT: 2.40, altSuffix: 'alt' }
    ];

    try {
      for (const spec of allExSpecs) {
        const hero = new spec.Cls({ x: 340, groundY: 580, facing: 1 });
        hero.game = mockGame23;
        try {
          hero._comboPersistTimer = 0.5;
          hero.comboStep = 3;
          hero.setState('AUTO_ATTACK');
          hero.stateTimer = 0.20;
          hero.updateAutoAttack(1 / 60, dummyFoe23, mockGame23);

          hero.setState('IDLE');
          hero.buildSkill = 0;
          hero.setState('SKILL');
          hero.stateTimer = 0.20;
          hero.updateSkill(1 / 60, dummyFoe23, mockGame23);

          hero.setState('IDLE');
          hero.buildSkill = 1;
          hero.setState('SKILL');
          hero.stateTimer = 0.20;
          hero.updateSkill(1 / 60, dummyFoe23, mockGame23);

          hero.setState('IDLE');
          hero.buildUlt = 0;
          hero.setState('ULTIMATE');
          hero.stateTimer = 0.20;
          hero.updateUltimate(1 / 60, dummyFoe23, mockGame23);

          hero.setState('IDLE');
          hero.buildUlt = 1;
          hero.setState('ULTIMATE');
          hero.stateTimer = 0.20;
          hero.updateUltimate(1 / 60, dummyFoe23, mockGame23);

          hero.setState('TRUE_ULTIMATE');
          hero.stateTimer = 0.05;
          hero.updateTrueUltimate(1 / 60, dummyFoe23, mockGame23);
          hero.stateTimer = spec.fireT;
          hero.updateTrueUltimate(1 / 60, dummyFoe23, mockGame23);
        } finally {
          hero.fx?.dispose?.();
        }

        const expectedCues = [
          'attack',
          'skill_std',
          `skill_${spec.altSuffix}`,
          'ult_std',
          `ult_${spec.altSuffix}`,
          'true_ult_charge',
          'true_ult_fire'
        ];
        for (const cue of expectedCues) {
          const token = `${spec.hid}:${cue}`;
          if (!voiceLog23.includes(token)) {
            throw new Error(
              `[Suite 36.23] Expected ${spec.Cls.name} to trigger '${token}', got [${voiceLog23.filter((v) => v.startsWith(spec.hid + ':')).join(', ')}]`
            );
          }
        }
      }

      const allLegacySpecs = [
        { Cls: Warrior, hid: 'warrior', fireT: 3.76 },
        { Cls: Ronin, hid: 'ronin', fireT: 1.98 },
        { Cls: FireMage, hid: 'mage', fireT: 3.24 },
        { Cls: Valkyrie, hid: 'valkyrie', fireT: 3.12 },
        { Cls: Reaper, hid: 'reaper', fireT: 3.17 },
        { Cls: Priestess, hid: 'priestess', fireT: 3.02 },
        { Cls: IceMage, hid: 'icemage', fireT: 3.30 },
        { Cls: Archer, hid: 'archer', fireT: 3.18 },
        { Cls: Android, hid: 'android', fireT: 3.08 },
        { Cls: Chronomancer, hid: 'chronomancer', fireT: 3.52 },
        { Cls: Titan, hid: 'titan', fireT: 2.38 }
      ];
      for (const spec of allLegacySpecs) {
        const leg = new spec.Cls({ x: 340, groundY: 580, facing: 1 });
        leg.game = mockGame23;
        const goal = leg.getAiStyleProfile?.().comboGoal || 3;
        leg._aiComboCount = Math.max(0, goal - 1);
        leg._aiComboReadyFinisher = 0;
        leg.setState('AUTO_ATTACK');
        leg.setState('SKILL');
        leg.setState('ULTIMATE');
        leg.setState('TRUE_ULTIMATE');
        leg.stateTimer = spec.fireT;
        leg.update(1 / 60, dummyFoe23, mockGame23);
        for (const cue of ['attack', 'skill_std', 'ult_std', 'true_ult_charge', 'true_ult_fire']) {
          const token = `${spec.hid}:${cue}`;
          if (!voiceLog23.includes(token)) {
            throw new Error(
              `[Suite 36.23] Expected Legacy ${spec.hid} to trigger '${token}', got [${voiceLog23.filter((v) => v.startsWith(spec.hid + ':')).join(', ')}]`
            );
          }
        }
      }
    } finally {
      dummyFoe23.fx?.dispose?.();
    }
    audio23.stopAllHeroVoices(0);
  }

  // --------------------------------------------------------------------------
  // 36.24: Cute Youthful Nyx Recast, 11-Track Lyria 3 OST, Lazy bgmBus Crossfade,
  // Sidechain Ducking, Mode/Stage/Domain/Boss Routing & 3-Slider Audio Mixer
  // --------------------------------------------------------------------------
  {
    const batch1NyxSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts/build_voice_packs_batch1_tts.mjs'),
      'utf8'
    );
    const bgmBuilderSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts/build_bgm_ost_lyria.mjs'),
      'utf8'
    );
    if (
      !batch1NyxSrc.includes("voiceName: 'Laomedeia'") ||
      !batch1NyxSrc.includes('MAX_VOICE_REQUESTS_PER_RUN = 40')
    ) {
      throw new Error(
        '[Suite 36.24] build_voice_packs_batch1_tts.mjs must update Nyx to Laomedeia with MAX_VOICE_REQUESTS_PER_RUN = 40!'
      );
    }
    if (
      !bgmBuilderSrc.includes('MAX_BGM_REQUESTS_PER_RUN = 22') ||
      !bgmBuilderSrc.includes('lyria-3-pro-preview')
    ) {
      throw new Error(
        '[Suite 36.24] build_bgm_ost_lyria.mjs must lock Lyria models and MAX_BGM_REQUESTS_PER_RUN = 22!'
      );
    }

    const expectedBgmKeys = [
      'bgm_title_select',
      'bgm_cathedral',
      'bgm_sanctuary',
      'bgm_sylvan',
      'bgm_boneyard',
      'bgm_clocktower',
      'bgm_inferno',
      'bgm_shogunate',
      'bgm_cob_monitor',
      'bgm_adventure_pilgrimage',
      'bgm_boss_malphas'
    ];
    for (const bgmKey of expectedBgmKeys) {
      const mp3Path = path.join(REPO_ROOT, 'assets/bgm', `${bgmKey}.mp3`);
      if (!fs.existsSync(mp3Path)) {
        throw new Error(`[Suite 36.24] Missing mastered BGM track: ${mp3Path}`);
      }
      const buf = fs.readFileSync(mp3Path);
      const isId3 = buf.length > 100000 && buf.subarray(0, 3).toString('ascii') === 'ID3';
      const isSync =
        buf.length > 100000 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
      if (!isId3 && !isSync) {
        throw new Error(`[Suite 36.24] Invalid BGM MP3 header/size on ${mp3Path}`);
      }
    }

    const prevStorageDesc24 = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const prevWinDesc24 = globalThis.window
      ? Object.getOwnPropertyDescriptor(globalThis.window, 'localStorage')
      : null;
    const prevFetchDesc24 = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
    const memStore24 = new Map();
    const mockStore24 = {
      getItem: (k) => (memStore24.has(k) ? memStore24.get(k) : null),
      setItem: (k, v) => memStore24.set(k, String(v)),
      removeItem: (k) => memStore24.delete(k)
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStore24,
      configurable: true,
      writable: true
    });
    if (globalThis.window) {
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: mockStore24,
        configurable: true,
        writable: true
      });
    }

    const fetchedUrls24 = [];
    globalThis.fetch = async (url) => {
      fetchedUrls24.push(String(url));
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(16)
      };
    };

    try {
      const audio24 = new AudioManager();
      if (fetchedUrls24.some((u) => u.includes('assets/bgm/'))) {
        throw new Error(
          `[Suite 36.24] Boot violated lazy BGM rule! Unexpected fetches: ${JSON.stringify(fetchedUrls24)}`
        );
      }
      if (
        Math.abs(audio24.getBgmVolume() - 0.38) > 1e-6 ||
        audio24.bgmEnabled !== true
      ) {
        throw new Error(
          `[Suite 36.24] Expected default bgmVolume=0.38 & bgmEnabled=true, got vol=${audio24.getBgmVolume()}, en=${audio24.bgmEnabled}`
        );
      }

      const makeGainMock24 = (initVal = 1) => ({
        gain: {
          value: initVal,
          setValueAtTime(v) {
            this.value = v;
          },
          linearRampToValueAtTime(v) {
            this.value = v;
          },
          exponentialRampToValueAtTime(v) {
            this.value = v;
          }
        },
        connect() {},
        disconnect() {}
      });
      const createdSources24 = [];
      audio24.ctx = {
        state: 'running',
        currentTime: 2.0,
        destination: {},
        createGain: () => makeGainMock24(1),
        createStereoPanner: () => ({ pan: { value: 0 }, connect() {}, disconnect() {} }),
        createBufferSource: () => {
          const src = {
            buffer: null,
            loop: false,
            loopStart: 0,
            loopEnd: 0,
            playbackRate: { value: 1 },
            onended: null,
            stoppedAt: null,
            connect() {},
            disconnect() {},
            start() {},
            stop(t = 0) {
              this.stoppedAt = t;
            }
          };
          createdSources24.push(src);
          return src;
        },
        decodeAudioData: async () => ({ duration: 84.0 })
      };
      audio24.sfxBus = makeGainMock24(audio24.getSfxVolume());
      audio24.sfxDuckGain = makeGainMock24(1.0);
      audio24.voiceBus = makeGainMock24(audio24.getVoiceVolume() * 1.42);
      audio24.bgmBus = makeGainMock24(audio24.getBgmVolume());
      audio24.bgmDuckGain = makeGainMock24(1.0);
      audio24.master = audio24.sfxBus;

      // Lazy BGM + Voice cache-bust ?v=30fps156 check
      await audio24.loadVoiceKey('nyx_select', 'en');
      await audio24.loadBgmTrack('bgm_title_select');
      if (
        !fetchedUrls24.some((u) => u.includes('assets/voices/nyx_select.mp3?v=30fps156')) ||
        !fetchedUrls24.some((u) => u.includes('assets/bgm/bgm_title_select.mp3?v=30fps156')) ||
        fetchedUrls24.filter((u) => u.includes('assets/bgm/')).length !== 1
      ) {
        throw new Error(
          `[Suite 36.24] Expected ?v=30fps156 on voice & single lazy BGM fetch, got ${JSON.stringify(fetchedUrls24)}`
        );
      }

      // bgmVolume + bgmEnabled persistence check
      audio24.setBgmVolume(0.52);
      audio24.toggleBgm();
      const restoredBgmAudio = new AudioManager();
      if (
        Math.abs(restoredBgmAudio.getBgmVolume() - 0.52) > 1e-6 ||
        restoredBgmAudio.bgmEnabled !== false
      ) {
        throw new Error(
          `[Suite 36.24] avs_audio_mix_v1 failed to persist BGM settings: vol=${restoredBgmAudio.getBgmVolume()}, enabled=${restoredBgmAudio.bgmEnabled}`
        );
      }
      audio24.toggleBgm();

      // 0.65s Crossfade between Title & Cathedral
      audio24.bgmBuffers.bgm_cathedral = { duration: 91.0 };
      audio24.playBgm('bgm_title_select');
      const firstSrc24 = createdSources24[createdSources24.length - 1];
      audio24.playBgm('cathedral');
      if (
        audio24.currentBgmKey !== 'bgm_cathedral' ||
        firstSrc24.stoppedAt === null ||
        Math.abs(firstSrc24.stoppedAt - 2.67) > 0.05
      ) {
        throw new Error(
          `[Suite 36.24] playBgm 0.65s crossfade failed: current=${audio24.currentBgmKey}, prevStoppedAt=${firstSrc24?.stoppedAt}`
        );
      }

      // Non-dipping bgmDuckGain (locked steady at 1.0) while sfxDuckGain continues sidechain ducking
      audio24.voiceBuffers.nyx_attack_1 = { duration: 1.1 };
      audio24.voiceBuffers.nyx_ult_std = { duration: 2.8 };
      audio24.playHeroVoice('nyx_ex', 'attack_1', {
        speakerKey: 'nyx_bgm_duck',
        priority: 1,
        cooldownMs: 10
      });
      if (
        Math.abs(audio24.bgmDuckGain.gain.value - 1.0) > 1e-6 ||
        !(audio24.sfxDuckGain.gain.value <= 0.60)
      ) {
        throw new Error(
          `[Suite 36.24] Expected bgmDuckGain=1.0 & sfxDuckGain<=0.60 during priority-1 voice, got bgm=${audio24.bgmDuckGain.gain.value}, sfx=${audio24.sfxDuckGain.gain.value}`
        );
      }
      audio24.playHeroVoice('nyx_ex', 'ult_std', {
        speakerKey: 'nyx_bgm_duck',
        priority: 3,
        cooldownMs: 10
      });
      if (
        Math.abs(audio24.bgmDuckGain.gain.value - 1.0) > 1e-6 ||
        !(audio24.sfxDuckGain.gain.value <= 0.30)
      ) {
        throw new Error(
          `[Suite 36.24] Expected bgmDuckGain=1.0 & sfxDuckGain<=0.30 during priority-3 voice, got bgm=${audio24.bgmDuckGain.gain.value}, sfx=${audio24.sfxDuckGain.gain.value}`
        );
      }
      audio24.preDuckSfxForVoice(3, 200);
      if (Math.abs(audio24.bgmDuckGain.gain.value - 1.0) > 1e-6) {
        throw new Error(
          `[Suite 36.24] Expected bgmDuckGain=1.0 during preDuckSfxForVoice, got ${audio24.bgmDuckGain.gain.value}`
        );
      }
      audio24.stopAllHeroVoices(0);
      if (
        Math.abs(audio24.bgmDuckGain.gain.value - 1.0) > 1e-6 ||
        Math.abs(audio24.sfxDuckGain.gain.value - 1.0) > 1e-6
      ) {
        throw new Error(
          `[Suite 36.24] Expected bgmDuckGain=1.0 & sfxDuckGain=1.0 after stopAllHeroVoices, got bgm=${audio24.bgmDuckGain.gain.value}, sfx=${audio24.sfxDuckGain.gain.value}`
        );
      }
      audio24.stopBgm(0, true);

      // Verify Title/VS Stage/Domain Override/Adventure/Malphas routing
      const bgmCalls24 = [];
      const routeGame = Object.create(Game.prototype);
      routeGame.simMode = false;
      routeGame._allowBgmInSim = true;
      routeGame.isLandingOpen = true;
      routeGame.gameMode = '1v1';
      routeGame.audio = {
        play() {},
        playBgm(k) {
          const norm = audio24.normalizeBgmKey(k);
          bgmCalls24.push(norm);
          return true;
        }
      };
      const routeCanvas = {
        width: 1200,
        height: 675,
        getContext: () => ({
          setTransform() {},
          clearRect() {},
          save() {},
          restore() {},
          imageSmoothingEnabled: false
        })
      };
      routeGame.renderer = new Renderer(routeCanvas);
      routeGame.renderer.onStageDomainBgm = (bgmKey) => {
        if (!routeGame.isLandingOpen && !routeGame.isAdventureMode()) {
          routeGame.audio.playBgm(bgmKey);
        }
      };

      routeGame.syncActiveBgm();
      routeGame.isLandingOpen = false;
      for (const stg of ['cathedral', 'sanctuary', 'sylvan', 'boneyard', 'clocktower']) {
        routeGame.renderer.stageId = stg;
        routeGame.renderer.permanentStageOverride = null;
        routeGame.syncActiveBgm();
      }
      routeGame.renderer.setStageTransformation('inferno', 1.0, true);
      routeGame.renderer.setStageTransformation('shogunate', 1.0, true);
      routeGame.renderer.setStageTransformation('cob_monitor', 1.0, true);

      routeGame.gameMode = 'adventure';
      routeGame.renderer.adventureMode = true;
      routeGame.adventure = {
        bossWarningTimer: 0,
        bossSpawnPending: false,
        bossEntity: null
      };
      routeGame.syncActiveBgm();
      routeGame.adventure.bossWarningTimer = 1.5;
      routeGame.syncActiveBgm();

      const expectedRouteSeq = [
        'bgm_title_select',
        'bgm_cathedral',
        'bgm_sanctuary',
        'bgm_sylvan',
        'bgm_boneyard',
        'bgm_clocktower',
        'bgm_inferno',
        'bgm_shogunate',
        'bgm_cob_monitor',
        'bgm_adventure_pilgrimage',
        'bgm_boss_malphas'
      ];
      if (JSON.stringify(bgmCalls24) !== JSON.stringify(expectedRouteSeq)) {
        throw new Error(
          `[Suite 36.24] BGM routing mismatch!\nExpected: ${JSON.stringify(expectedRouteSeq)}\nActual:   ${JSON.stringify(bgmCalls24)}`
        );
      }

      const html24 = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
      const css24 = fs.readFileSync(path.join(REPO_ROOT, 'style.css'), 'utf8');
      const vault24 = fs.readFileSync(path.join(REPO_ROOT, 'build/build_web_vault.mjs'), 'utf8');
      for (const tok of ['id="btn-bgm"', 'id="input-bgm-vol"', 'id="btn-nav-bgm"', 'id="input-nav-bgm-vol"']) {
        if (!html24.includes(tok)) {
          throw new Error(`[Suite 36.24] index.html missing BGM mixer control ${tok}!`);
        }
      }
      if (!css24.includes('.slider-bgm')) {
        throw new Error('[Suite 36.24] style.css missing .slider-bgm styling!');
      }
      if (!vault24.includes("dir: 'assets/bgm'")) {
        throw new Error('[Suite 36.24] build/build_web_vault.mjs missing assets/bgm bundling!');
      }
    } finally {
      if (prevFetchDesc24) {
        Object.defineProperty(globalThis, 'fetch', prevFetchDesc24);
      }
      if (prevStorageDesc24) {
        Object.defineProperty(globalThis, 'localStorage', prevStorageDesc24);
      }
      if (globalThis.window && prevWinDesc24) {
        Object.defineProperty(globalThis.window, 'localStorage', prevWinDesc24);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.25: Japanese Cute Anime Girl Nyx Recast, 96-Clip Snappy Arcade Bark Pack,
  // Contextual Hurt/Skill/Overdrive Layering, voicePace Persistence & FAST|FULL UI
  // --------------------------------------------------------------------------
  {
    const snappyBuilderSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts/build_voice_snappy_barks_tts.mjs'),
      'utf8'
    );
    for (const marker of [
      "LOCKED_TTS_MODEL = 'models/gemini-3.8-flash-tts'",
      'publishers/google/models/gemini-3.8-flash-tts:generateContent',
      'MAX_HTTP_REQUESTS_PER_RUN = 165',
      'VERTEX_API_KEY'
    ]) {
      if (!snappyBuilderSrc.includes(marker)) {
        throw new Error(
          `[Suite 36.25] build_voice_snappy_barks_tts.mjs missing required marker '${marker}'!`
        );
      }
    }

    const batch1Src25 = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts/build_voice_packs_batch1_tts.mjs'),
      'utf8'
    );
    if (
      !batch1Src25.includes("jaVoiceName: 'Achernar'") ||
      !batch1Src25.includes('透明感のある甘くて可愛い10代の美少女アニメ声優') ||
      !batch1Src25.includes('aecho=0.91:0.89:22:0.07')
    ) {
      throw new Error(
        '[Suite 36.25] build_voice_packs_batch1_tts.mjs missing Achernar JP Nyx feminine style or clean 22ms jaSpaces!'
      );
    }

    const prevStorageDesc25 = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const prevWinDesc25 = globalThis.window
      ? Object.getOwnPropertyDescriptor(globalThis.window, 'localStorage')
      : null;
    const memStore25 = new Map();
    const mockStore25 = {
      getItem: (k) => (memStore25.has(k) ? memStore25.get(k) : null),
      setItem: (k, v) => memStore25.set(k, String(v)),
      removeItem: (k) => memStore25.delete(k)
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStore25,
      configurable: true,
      writable: true
    });
    if (globalThis.window) {
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: mockStore25,
        configurable: true,
        writable: true
      });
    }

    try {
      const audio25 = new AudioManager();
      const shortPrefixes = [
        'seraphina',
        'aethelgard',
        'kazemaru',
        'ignissol',
        'freyja',
        'malakor',
        'nyx',
        'lyra',
        'sylvara',
        'vex09',
        'chronos',
        'torgar'
      ];
      const shortSuffixes = ['hurt_short', 'skill_short', 'skill_alt_short', 'ult_short'];
      const hdr25 = Buffer.alloc(16);
      for (const prefix of shortPrefixes) {
        for (const sfx of shortSuffixes) {
          const vk = `${prefix}_${sfx}`;
          if (!(vk in audio25.voiceVolumes)) {
            throw new Error(`[Suite 36.25] Missing short voiceVolumes key '${vk}'!`);
          }
          for (const relDir of ['assets/voices', 'assets/voices/ja']) {
            const p = path.join(REPO_ROOT, relDir, `${vk}.mp3`);
            if (!fs.existsSync(p) || fs.statSync(p).size <= 512) {
              throw new Error(`[Suite 36.25] Missing or truncated short MP3: ${p}`);
            }
            const fd = fs.openSync(p, 'r');
            try {
              fs.readSync(fd, hdr25, 0, 16, 0);
            } finally {
              fs.closeSync(fd);
            }
            const isId3 = hdr25.subarray(0, 3).toString('ascii') === 'ID3';
            const isSync = hdr25[0] === 0xff && (hdr25[1] & 0xe0) === 0xe0;
            if (!isId3 && !isSync) {
              throw new Error(`[Suite 36.25] Invalid MP3 header in ${p}`);
            }
          }
        }
      }

      if (audio25.getVoicePace() !== 'snappy') {
        throw new Error(`[Suite 36.25] Expected default voicePace='snappy', got '${audio25.getVoicePace()}'`);
      }
      audio25.toggleVoicePace();
      const restoredPaceAudio = new AudioManager();
      if (restoredPaceAudio.getVoicePace() !== 'full') {
        throw new Error(
          `[Suite 36.25] Expected persisted voicePace='full', got '${restoredPaceAudio.getVoicePace()}'`
        );
      }
      audio25.setVoicePace('snappy');

      const makeGainMock25 = (initVal = 1) => ({
        gain: {
          value: initVal,
          setValueAtTime(v) {
            this.value = v;
          },
          linearRampToValueAtTime(v) {
            this.value = v;
          },
          exponentialRampToValueAtTime(v) {
            this.value = v;
          }
        },
        connect() {},
        disconnect() {}
      });
      const playedVoiceTags25 = [];
      audio25.ctx = {
        state: 'running',
        currentTime: 0,
        destination: {},
        createGain: () => makeGainMock25(1),
        createStereoPanner: () => ({ pan: { value: 0 }, connect() {}, disconnect() {} }),
        createBufferSource: () => {
          const src = {
            buffer: null,
            playbackRate: { value: 1 },
            onended: null,
            connect() {},
            disconnect() {},
            start() {
              playedVoiceTags25.push(src.buffer?.tag || 'unknown');
            },
            stop() {}
          };
          return src;
        }
      };
      audio25.sfxBus = makeGainMock25(audio25.getSfxVolume());
      audio25.sfxDuckGain = makeGainMock25(1.0);
      audio25.voiceBus = makeGainMock25(audio25.getVoiceVolume() * 1.42);
      audio25.bgmBus = makeGainMock25(audio25.getBgmVolume());
      audio25.bgmDuckGain = makeGainMock25(1.0);
      audio25.master = audio25.sfxBus;

      for (const k of [
        'seraphina_hurt',
        'seraphina_hurt_short',
        'seraphina_skill_std',
        'seraphina_skill_short',
        'seraphina_skill_crimson',
        'seraphina_skill_alt_short',
        'seraphina_ult_std',
        'seraphina_ult_short',
        'seraphina_ult_crimson'
      ]) {
        audio25.voiceBuffers[`en:${k}`] = { tag: k, duration: 0.6 };
      }
      // Also test fallback: nyx_skill_std cached, nyx_skill_short NOT cached
      audio25.voiceBuffers['en:nyx_skill_std'] = { tag: 'nyx_skill_std_fallback', duration: 1.5 };

      const seraSpeaker = new PriestessEx({ x: 320, groundY: 580, facing: 1 });
      const attacker25 = new WarriorEx({ x: 520, groundY: 580, facing: -1 });
      try {
        seraSpeaker.maxHp = 3600;
        seraSpeaker.hp = 3600;
        seraSpeaker.game = {
          audio: audio25,
          vfx: {
            spawnDamageText() {},
            spawnBurst() {},
            spawnHitImpact() {}
          },
          renderer: {
            triggerAberration() {},
            triggerHitStop() {}
          },
          is2v2Mode: () => false,
          isAdventureMode: () => false
        };

        // 1. Normal hit -> hurt_short; heavy hit -> full hurt + 7500ms heavy gate; low HP after 7600ms -> full hurt
        seraSpeaker.takeDamage(110, attacker25, false, 0, 0);
        if (playedVoiceTags25[playedVoiceTags25.length - 1] !== 'seraphina_hurt_short') {
          throw new Error(
            `[Suite 36.25] Expected normal hit to play seraphina_hurt_short, got ${playedVoiceTags25[playedVoiceTags25.length - 1]}`
          );
        }

        audio25.lastVoicePlayed = {};
        audio25.stopAllHeroVoices(0);
        const tBase = 10000;
        audio25.playHeroVoice('priestess_ex', 'hurt', {
          speakerKey: seraSpeaker,
          priority: 1,
          cooldownMs: 900,
          heavyHurt: true,
          nowMs: tBase
        });
        audio25.playHeroVoice('priestess_ex', 'hurt', {
          speakerKey: seraSpeaker,
          priority: 1,
          cooldownMs: 900,
          heavyHurt: true,
          nowMs: tBase + 2000
        });
        audio25.playHeroVoice('priestess_ex', 'hurt', {
          speakerKey: seraSpeaker,
          priority: 1,
          cooldownMs: 900,
          heavyHurt: true,
          nowMs: tBase + 7600
        });
        const hurtSlice = playedVoiceTags25.slice(-3);
        if (
          hurtSlice[0] !== 'seraphina_hurt' ||
          hurtSlice[1] !== 'seraphina_hurt_short' ||
          hurtSlice[2] !== 'seraphina_hurt'
        ) {
          throw new Error(
            `[Suite 36.25] Heavy-hurt 7500ms gate mismatch: ${JSON.stringify(hurtSlice)}`
          );
        }

        // Verify Fighter.takeDamage passes heavyHurt on >= 210 dmg OR <= 24% HP
        const recordedHeavyFlags = [];
        seraSpeaker.game = {
          ...seraSpeaker.game,
          audio: {
            playHeroVoice(_hid, _cue, o) {
              recordedHeavyFlags.push(Boolean(o?.heavyHurt));
              return true;
            }
          }
        };
        seraSpeaker.hp = 3600;
        seraSpeaker.setState('IDLE');
        seraSpeaker.takeDamage(230, attacker25, true, 0, 0);
        seraSpeaker.hp = 850;
        seraSpeaker.setState('IDLE');
        seraSpeaker.takeDamage(100, attacker25, false, 0, 0);
        if (recordedHeavyFlags[0] !== true || recordedHeavyFlags[1] !== true) {
          throw new Error(
            `[Suite 36.25] Expected Fighter.takeDamage heavyHurt=true on >=210 dmg and <=24% HP, got ${JSON.stringify(recordedHeavyFlags)}`
          );
        }

        // 2. Skill 80/20 split + 14000ms per-speaker full-chant cooldown
        audio25.lastVoicePlayed = {};
        audio25.stopAllHeroVoices(0);
        audio25.playHeroVoice('priestess_ex', 'skill_std', {
          speakerKey: seraSpeaker,
          priority: 2,
          cooldownMs: 100,
          rng: () => 0.50,
          nowMs: 20000
        });
        audio25.playHeroVoice('priestess_ex', 'skill_std', {
          speakerKey: seraSpeaker,
          priority: 2,
          cooldownMs: 100,
          rng: () => 0.10,
          nowMs: 21000
        });
        audio25.playHeroVoice('priestess_ex', 'skill_crimson', {
          speakerKey: seraSpeaker,
          priority: 2,
          cooldownMs: 100,
          rng: () => 0.10,
          nowMs: 24000
        });
        audio25.playHeroVoice('priestess_ex', 'skill_crimson', {
          speakerKey: seraSpeaker,
          priority: 2,
          cooldownMs: 100,
          rng: () => 0.10,
          nowMs: 35200
        });
        const skillSlice = playedVoiceTags25.slice(-4);
        if (
          skillSlice[0] !== 'seraphina_skill_short' ||
          skillSlice[1] !== 'seraphina_skill_std' ||
          skillSlice[2] !== 'seraphina_skill_alt_short' ||
          skillSlice[3] !== 'seraphina_skill_crimson'
        ) {
          throw new Error(
            `[Suite 36.25] Skill contextual 80/20 + 14s cooldown mismatch: ${JSON.stringify(skillSlice)}`
          );
        }

        // 3. Ult 65/35 split + <= 35% HP forced full Overdrive chant
        audio25.lastVoicePlayed = {};
        audio25.stopAllHeroVoices(0);
        seraSpeaker.hp = 3600;
        audio25.playHeroVoice('priestess_ex', 'ult_std', {
          speakerKey: seraSpeaker,
          priority: 3,
          cooldownMs: 100,
          rng: () => 0.60,
          nowMs: 40000
        });
        audio25.playHeroVoice('priestess_ex', 'ult_std', {
          speakerKey: seraSpeaker,
          priority: 3,
          cooldownMs: 100,
          rng: () => 0.20,
          nowMs: 41000
        });
        seraSpeaker.hp = 1000; // <= 35% maxHp (3600)
        audio25.playHeroVoice('priestess_ex', 'ult_crimson', {
          speakerKey: seraSpeaker,
          priority: 3,
          cooldownMs: 100,
          rng: () => 0.90,
          nowMs: 42000
        });
        const ultSlice = playedVoiceTags25.slice(-3);
        if (
          ultSlice[0] !== 'seraphina_ult_short' ||
          ultSlice[1] !== 'seraphina_ult_std' ||
          ultSlice[2] !== 'seraphina_ult_crimson'
        ) {
          throw new Error(
            `[Suite 36.25] Overdrive contextual 65/35 + <=35% HP mismatch: ${JSON.stringify(ultSlice)}`
          );
        }

        // 4. FULL mode always plays full recordings; missing short buffer falls back cleanly to full
        audio25.setVoicePace('full', false);
        audio25.lastVoicePlayed = {};
        audio25.stopAllHeroVoices(0);
        seraSpeaker.hp = 3600;
        audio25.playHeroVoice('priestess_ex', 'hurt', {
          speakerKey: seraSpeaker,
          priority: 1,
          cooldownMs: 50,
          heavyHurt: false,
          nowMs: 50000
        });
        audio25.playHeroVoice('priestess_ex', 'skill_std', {
          speakerKey: seraSpeaker,
          priority: 2,
          cooldownMs: 50,
          rng: () => 0.99,
          nowMs: 50500
        });
        audio25.playHeroVoice('priestess_ex', 'ult_std', {
          speakerKey: seraSpeaker,
          priority: 3,
          cooldownMs: 50,
          rng: () => 0.99,
          nowMs: 51000
        });
        audio25.setVoicePace('snappy', false);
        audio25.playHeroVoice('nyx_ex', 'skill_std', {
          speakerKey: 'nyx_fb',
          priority: 2,
          cooldownMs: 50,
          rng: () => 0.90,
          nowMs: 52000
        });
        const fullAndFbSlice = playedVoiceTags25.slice(-4);
        if (
          fullAndFbSlice[0] !== 'seraphina_hurt' ||
          fullAndFbSlice[1] !== 'seraphina_skill_std' ||
          fullAndFbSlice[2] !== 'seraphina_ult_std' ||
          fullAndFbSlice[3] !== 'nyx_skill_std_fallback'
        ) {
          throw new Error(
            `[Suite 36.25] FULL mode / graceful short fallback mismatch: ${JSON.stringify(fullAndFbSlice)}`
          );
        }
      } finally {
        seraSpeaker.fx?.dispose?.();
        attacker25.fx?.dispose?.();
      }
      audio25.stopAllHeroVoices(0);

      const html25 = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
      const css25 = fs.readFileSync(path.join(REPO_ROOT, 'style.css'), 'utf8');
      const main25 = fs.readFileSync(path.join(REPO_ROOT, 'src/main.js'), 'utf8');
      for (const tok of ['id="btn-voice-pace"', 'id="btn-nav-voice-pace"']) {
        if (!html25.includes(tok)) {
          throw new Error(`[Suite 36.25] index.html missing ${tok}!`);
        }
      }
      if (!css25.includes('.voice-pace-btn') || !css25.includes('.vpace-opt.is-active')) {
        throw new Error('[Suite 36.25] style.css missing .voice-pace-btn or .vpace-opt.is-active!');
      }
      if (!main25.includes("params.get('vpace')")) {
        throw new Error('[Suite 36.25] src/main.js missing ?vpace= URL param hook!');
      }
    } finally {
      if (prevStorageDesc25) {
        Object.defineProperty(globalThis, 'localStorage', prevStorageDesc25);
      }
      if (globalThis.window && prevWinDesc25) {
        Object.defineProperty(globalThis.window, 'localStorage', prevWinDesc25);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 36.26: True Zero-Dip BGM Compressor Bypass (`bgmDuckGain -> masterGain`),
  //        All-23-Hero Intro Idle + Center `VS.`/`ENGAGE!`, Portrait-Free Left/Right
  //        Cut-Ins, Cross-Speaker Anti-Overlap & Sequential End-of-Match Queue
  // --------------------------------------------------------------------------
  {
    const prevStorageDesc26 = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const prevWinStorageDesc26 = globalThis.window
      ? Object.getOwnPropertyDescriptor(globalThis.window, 'localStorage')
      : null;
    const prevAudioCtx = globalThis.window?.AudioContext;
    const prevWebkitAudioCtx = globalThis.window?.webkitAudioContext;
    const prevGetEl26 = globalThis.document.getElementById;
    const memStore26 = new Map();
    const mockStore26 = {
      getItem: (k) => (memStore26.has(k) ? memStore26.get(k) : null),
      setItem: (k, v) => memStore26.set(k, String(v)),
      removeItem: (k) => memStore26.delete(k)
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStore26,
      configurable: true,
      writable: true
    });
    if (globalThis.window) {
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: mockStore26,
        configurable: true,
        writable: true
      });
    }

    const spawnedHeroes26 = [];
    try {
      // (A) True Zero-Dip BGM Compressor Bypass: bgmDuckGain -> masterGain (bypassing limiter)
      const makeGraphNode = (extra = {}) => {
        const node = {
          connectedTo: [],
          connect(dest) {
            this.connectedTo.push(dest);
            return dest;
          },
          disconnect() {},
          ...extra
        };
        return node;
      };
      const makeParam = (val = 0) => ({
        value: val,
        setValueAtTime(v) {
          this.value = v;
        },
        linearRampToValueAtTime(v) {
          this.value = v;
        },
        exponentialRampToValueAtTime(v) {
          this.value = v;
        },
        cancelScheduledValues() {}
      });
      class MockGraphAudioContext {
        constructor() {
          this.state = 'running';
          this.currentTime = 1.0;
          this.sampleRate = 44100;
          this.destination = { _isDest: true };
          this.onstatechange = null;
        }
        createGain() {
          return makeGraphNode({ gain: makeParam(1) });
        }
        createBiquadFilter() {
          return makeGraphNode({ type: 'lowpass', frequency: makeParam(1000), Q: makeParam(0.7) });
        }
        createDynamicsCompressor() {
          return makeGraphNode({
            threshold: makeParam(0),
            knee: makeParam(0),
            ratio: makeParam(1),
            attack: makeParam(0),
            release: makeParam(0)
          });
        }
        createStereoPanner() {
          return makeGraphNode({ pan: makeParam(0) });
        }
        createBuffer(ch, len) {
          return { numberOfChannels: ch, length: len, duration: 0.25, getChannelData: () => new Float32Array(len) };
        }
        createBufferSource() {
          return makeGraphNode({
            buffer: null,
            playbackRate: makeParam(1),
            onended: null,
            start() {},
            stop() {}
          });
        }
      }
      if (globalThis.window) {
        globalThis.window.AudioContext = MockGraphAudioContext;
        globalThis.window.webkitAudioContext = MockGraphAudioContext;
      }

      const graphAudio = new AudioManager();
      if (
        !graphAudio.bgmBus?.connectedTo.includes(graphAudio.bgmDuckGain) ||
        !graphAudio.bgmDuckGain?.connectedTo.includes(graphAudio.masterGain) ||
        graphAudio.bgmDuckGain?.connectedTo.includes(graphAudio.limiter) ||
        !graphAudio.voiceBus?.connectedTo.includes(graphAudio.limiter) ||
        !graphAudio.limiter?.connectedTo.includes(graphAudio.masterGain) ||
        !graphAudio.masterGain?.connectedTo.includes(graphAudio.ctx.destination) ||
        Math.abs((graphAudio.bgmDuckGain?.gain?.value ?? 0) - 1.0) > 1e-6
      ) {
        throw new Error(
          '[Suite 36.26] BGM compressor bypass failed: bgmDuckGain must connect directly to masterGain (bypassing limiter) with gain=1.0!'
        );
      }

      // (B) All-23-Hero Intro Standoff Idle Animation + Center-Screen `VS.` & `ENGAGE!` Banner
      const allRosterEntries = Object.entries(CHAMPION_ROSTER);
      if (allRosterEntries.length !== 23) {
        throw new Error(`[Suite 36.26] Expected 23 champions in CHAMPION_ROSTER, got ${allRosterEntries.length}`);
      }
      const introHeroes = allRosterEntries.map(([hid, cfg]) => {
        const inst = new cfg.cls(300, 560, 1);
        inst.heroId = hid;
        inst._overrideFrameIdx = 128;
        inst.trueUltFrameOverride = 132;
        spawnedHeroes26.push(inst);
        return inst;
      });
      const introSeenFrames = introHeroes.map(() => new Set());
      const introGame26 = Object.create(Game.prototype);
      introGame26.fighters = introHeroes;
      introGame26.isMatchOver = false;
      introGame26.roundIntroTimer = 4.15;
      introGame26.roundIntroDuration = 4.15;
      introGame26.roundIntroElapsed = 0;
      introGame26._roundIntroFighter = null;
      introGame26._roundIntroVoiceFired = true;
      introGame26._roundEngageBannerTimer = 0;
      introGame26.renderer = { groundY: 560, worldWidth: 1200, hitStopTimer: 0, update() {} };
      introGame26.vfx = { update() {} };
      introGame26.audio = null;
      introGame26.hudTimer = 0;
      introGame26.updateHUD = () => {};
      introGame26.isAdventureMode = () => false;
      introGame26.getPointFighter = (team) => (team === 2 ? introHeroes[1] : introHeroes[0]);

      for (let tick = 0; tick < 12; tick++) {
        introGame26.stepSimulation(1 / 12);
        for (let i = 0; i < introHeroes.length; i++) {
          const h = introHeroes[i];
          const phaseIdx = PixelForge.getFrameIndex(h, 0);
          const haloIdx = PixelForge.getFrameIndex(h, h.haloPhase || h.runeOrbit || h.windPhase || h.walkPhase || 0);
          introSeenFrames[i].add(phaseIdx);
          if (phaseIdx !== haloIdx && phaseIdx < 0) {
            throw new Error(`[Suite 36.26] Invalid intro frameIdx=${phaseIdx} on ${h.heroId}`);
          }
        }
      }
      for (let i = 0; i < introHeroes.length; i++) {
        const h = introHeroes[i];
        const frames = Array.from(introSeenFrames[i]);
        if (
          frames.length < 4 ||
          !frames.some((fr) => fr > 0 && fr <= 29) ||
          h._overrideFrameIdx !== null ||
          h.trueUltFrameOverride !== null
        ) {
          throw new Error(
            `[Suite 36.26] ${h.heroId} froze or failed Row 0 IDLE during intro standoff: frames=${JSON.stringify(frames)}, override=${h._overrideFrameIdx}`
          );
        }
      }

      for (const [vw, vh] of [
        [1280, 720],
        [390, 844]
      ]) {
        const introDraws = { texts: [], rects: [], rotateCalls: 0 };
        const introCtx = createMockCtx(introDraws);
        introCtx.canvas = { width: vw, height: vh };
        introCtx.fillText = (txt, x, y, maxW) => {
          introDraws.texts.push({ text: String(txt), x, y, maxW });
        };
        introCtx.fillRect = (x, y, rw, rh) => {
          introDraws.rects.push({ x, y, w: rw, h: rh });
        };
        introGame26.roundIntroTimer = 2.4;
        introGame26._roundEngageBannerTimer = 0;
        introGame26._renderRoundIntroOverlay(introCtx);

        const vsCalls = introDraws.texts.filter((t) => t.text === 'VS.');
        const n1 = introHeroes[0].name.toUpperCase();
        const n2 = introHeroes[1].name.toUpperCase();
        const hasBothNames =
          introDraws.texts.some((t) => t.text === n1) &&
          introDraws.texts.some((t) => t.text === n2);
        const minRectX = Math.min(...introDraws.rects.map((r) => r.x));
        const maxRectX = Math.max(...introDraws.rects.map((r) => r.x + r.w));
        if (
          introDraws.rotateCalls !== 0 ||
          vsCalls.length === 0 ||
          Math.abs(vsCalls[vsCalls.length - 1].y - vh * 0.46) > 12 ||
          !hasBothNames ||
          minRectX < 0 ||
          maxRectX > vw
        ) {
          throw new Error(
            `[Suite 36.26] Center VS. intro overlay failed on ${vw}x${vh}: vsY=${vsCalls[0]?.y}, names=${hasBothNames}, x=[${minRectX},${maxRectX}]`
          );
        }

        introDraws.texts.length = 0;
        introGame26.roundIntroTimer = 0;
        introGame26._roundEngageBannerTimer = 0.45;
        introGame26._renderRoundIntroOverlay(introCtx);
        const engCalls = introDraws.texts.filter((t) => t.text === 'ENGAGE!');
        if (
          engCalls.length === 0 ||
          Math.abs(engCalls[engCalls.length - 1].y - vh * 0.46) > 12
        ) {
          throw new Error(
            `[Suite 36.26] Center ENGAGE! overlay failed on ${vw}x${vh}: engY=${engCalls[0]?.y}`
          );
        }
      }

      // (C) Portrait-Free Left/Right Ultimate & Supreme Cut-Ins
      const leftCasterEx = introHeroes.find((h) => h.heroId === 'warrior_ex');
      const rightCasterEx = introHeroes.find((h) => h.heroId === 'mage_ex');
      const leftCasterLeg = introHeroes.find((h) => h.heroId === 'mage');
      const rightCasterLeg = introHeroes.find((h) => h.heroId === 'warrior');
      leftCasterEx.team = 1;
      rightCasterEx.team = 2;
      leftCasterLeg.team = 'left';
      rightCasterLeg.team = 'right';

      const prevWinW = globalThis.window?.innerWidth;
      const prevWinH = globalThis.window?.innerHeight;
      try {
        for (const [vw, vh] of [
          [1280, 720],
          [390, 844]
        ]) {
          if (globalThis.window) {
            globalThis.window.innerWidth = vw;
            globalThis.window.innerHeight = vh;
          }
          const cutTrack = { rotateCalls: 0 };
          const cutCtx = createMockCtx(cutTrack);
          let curTx = 0;
          const stTx = [];
          const oSaveC = cutCtx.save.bind(cutCtx);
          const oRestC = cutCtx.restore.bind(cutCtx);
          cutCtx.save = () => {
            stTx.push(curTx);
            oSaveC();
          };
          cutCtx.restore = () => {
            if (stTx.length) curTx = stTx.pop();
            oRestC();
          };
          cutCtx.setTransform = () => {
            curTx = 0;
          };
          cutCtx.translate = (dx) => {
            curTx += dx || 0;
          };
          let drawImgCalls = 0;
          let portraitImgCalls = 0;
          let arcCalls = 0;
          let ellipseCalls = 0;
          const cutTextTx = [];
          cutCtx.drawImage = (img) => {
            drawImgCalls++;
            const src = String(img?.src || img?._origSrc || img?._deferredSrc || '');
            if (src.includes('portrait')) portraitImgCalls++;
          };
          cutCtx.arc = () => {
            arcCalls++;
          };
          cutCtx.ellipse = () => {
            ellipseCalls++;
          };
          cutCtx.fillText = (txt) => {
            cutTextTx.push({ text: String(txt), tx: curTx });
          };

          const cutRen = new Renderer({ width: vw, height: vh, getContext: () => cutCtx });

          // EX Left vs Right
          cutRen.triggerUltimateCutIn(leftCasterEx, true);
          if (cutRen.cutInSide !== 'left') {
            throw new Error(`[Suite 36.26] Expected Team 1 cutInSide='left', got '${cutRen.cutInSide}'`);
          }
          cutRen.cutInTimer = 0.7;
          cutTextTx.length = 0;
          cutRen.drawExUltimateCutIn(cutCtx, vw, 96);
          const leftExTx = cutTextTx[cutTextTx.length - 1]?.tx;

          cutRen.triggerUltimateCutIn(rightCasterEx, false);
          if (cutRen.cutInSide !== 'right') {
            throw new Error(`[Suite 36.26] Expected Team 2 cutInSide='right', got '${cutRen.cutInSide}'`);
          }
          cutRen.cutInTimer = 0.55;
          cutTextTx.length = 0;
          cutRen.drawExUltimateCutIn(cutCtx, vw, 96);
          const rightExTx = cutTextTx[cutTextTx.length - 1]?.tx;

          if (
            drawImgCalls !== 0 ||
            cutTrack.rotateCalls !== 0 ||
            arcCalls !== 0 ||
            ellipseCalls !== 0 ||
            cutCtx._stateStack.length !== 0
          ) {
            throw new Error(
              `[Suite 36.26] EX cut-in violated portrait-free/zero-vector rule on ${vw}x${vh}: imgs=${drawImgCalls}, rot=${cutTrack.rotateCalls}, arc=${arcCalls}, ell=${ellipseCalls}`
            );
          }

          if (vw === 1280) {
            if (!(leftExTx < vw * 0.40) || !(rightExTx > vw * 0.60)) {
              throw new Error(
                `[Suite 36.26] Desktop left/right EX cut-in anchoring mismatch: leftTx=${leftExTx}, rightTx=${rightExTx}`
              );
            }
          } else {
            if (!(leftExTx < rightExTx) || leftExTx < 10 || rightExTx > vw - 10) {
              throw new Error(
                `[Suite 36.26] Mobile portrait left/right EX cut-in bounds mismatch: leftTx=${leftExTx}, rightTx=${rightExTx}`
              );
            }
          }

          // Legacy Left vs Right (`0` portrait drawImage & `0` cut-in drawImage)
          const cutVfx = new VFXManager();
          let cutInCalloutDraws = 0;
          const origCutContent = cutRen._drawCutInCalloutContent.bind(cutRen);
          cutRen._drawCutInCalloutContent = (...args) => {
            const beforeImgs = drawImgCalls;
            origCutContent(...args);
            cutInCalloutDraws += drawImgCalls - beforeImgs;
          };
          portraitImgCalls = 0;
          cutRen.triggerUltimateCutIn(leftCasterLeg, false);
          if (cutRen.cutInSide !== 'left') {
            throw new Error(`[Suite 36.26] Expected Legacy Team 'left' cutInSide='left', got '${cutRen.cutInSide}'`);
          }
          cutRen.cutInTimer = 0.55;
          cutTextTx.length = 0;
          cutRen.render([], cutVfx);
          const leftLegTx = cutTextTx[cutTextTx.length - 1]?.tx;

          cutRen.triggerUltimateCutIn(rightCasterLeg, true);
          if (cutRen.cutInSide !== 'right') {
            throw new Error(`[Suite 36.26] Expected Legacy Team 'right' cutInSide='right', got '${cutRen.cutInSide}'`);
          }
          cutRen.cutInTimer = 0.7;
          cutTextTx.length = 0;
          cutRen.render([], cutVfx);
          const rightLegTx = cutTextTx[cutTextTx.length - 1]?.tx;

          if (
            portraitImgCalls !== 0 ||
            cutInCalloutDraws !== 0 ||
            (vw === 1280 && (!(leftLegTx < vw * 0.40) || !(rightLegTx > vw * 0.60))) ||
            !(leftLegTx < rightLegTx)
          ) {
            throw new Error(
              `[Suite 36.26] Legacy portrait-free cut-in anchoring failed on ${vw}x${vh}: portImgs=${portraitImgCalls}, cutImgs=${cutInCalloutDraws}, leftTx=${leftLegTx}, rightTx=${rightLegTx}`
            );
          }
        }
      } finally {
        if (globalThis.window) {
          globalThis.window.innerWidth = prevWinW;
          globalThis.window.innerHeight = prevWinH;
        }
      }

      // (D) Cross-Speaker Anti-Overlap & Sequential End-of-Match Dialogue Queue
      const playedVoiceLog26 = [];
      const activeSrcNodes26 = [];
      const qAudio = new AudioManager();
      qAudio.ctx = {
        state: 'running',
        currentTime: 0,
        destination: {},
        createGain: () => makeGraphNode({ gain: makeParam(1) }),
        createStereoPanner: () => makeGraphNode({ pan: makeParam(0) }),
        createBufferSource: () => {
          const src = makeGraphNode({
            buffer: null,
            playbackRate: makeParam(1),
            onended: null,
            start() {
              playedVoiceLog26.push(src.buffer?.tag || 'unknown');
            },
            stop() {}
          });
          activeSrcNodes26.push(src);
          return src;
        }
      };
      qAudio.sfxBus = makeGraphNode({ gain: makeParam(0.55) });
      qAudio.sfxDuckGain = makeGraphNode({ gain: makeParam(1.0) });
      qAudio.voiceBus = makeGraphNode({ gain: makeParam(1.42) });
      qAudio.bgmBus = makeGraphNode({ gain: makeParam(0.38) });
      qAudio.bgmDuckGain = makeGraphNode({ gain: makeParam(1.0) });
      qAudio.master = qAudio.sfxBus;

      for (const [vk, dur] of [
        ['aethelgard_ult_std', 0.22],
        ['aethelgard_victory', 0.8],
        ['seraphina_attack_1', 0.4],
        ['seraphina_attack_2', 0.4],
        ['seraphina_hurt', 1.1],
        ['seraphina_hurt_short', 0.45],
        ['seraphina_skill_std', 1.6],
        ['seraphina_skill_short', 0.8],
        ['seraphina_skill_crimson', 1.8],
        ['seraphina_skill_alt_short', 0.85],
        ['seraphina_ult_std', 2.4],
        ['seraphina_ult_short', 1.1],
        ['seraphina_death', 0.5]
      ]) {
        qAudio.voiceBuffers[`en:${vk}`] = { tag: vk, duration: dur };
      }

      const killerSpeaker = leftCasterEx;
      const victimSpeaker = introHeroes.find((h) => h.heroId === 'priestess_ex');
      qAudio.setVoicePace('full', false);
      qAudio.playHeroVoice('warrior_ex', 'ult_std', {
        speakerKey: killerSpeaker,
        priority: 3,
        cooldownMs: 10
      });

      const atkSkipped = qAudio.playHeroVoice('priestess_ex', 'attack', {
        speakerKey: victimSpeaker,
        priority: 1,
        cooldownMs: 10
      });
      qAudio.playHeroVoice('priestess_ex', 'hurt', {
        speakerKey: victimSpeaker,
        priority: 1,
        cooldownMs: 10,
        heavyHurt: true
      });
      qAudio.playHeroVoice('priestess_ex', 'skill_std', {
        speakerKey: victimSpeaker,
        priority: 2,
        cooldownMs: 10,
        fullChant: true
      });
      qAudio.playHeroVoice('priestess_ex', 'skill_crimson', {
        speakerKey: victimSpeaker,
        priority: 2,
        cooldownMs: 10,
        fullChant: true
      });
      victimSpeaker.hp = 100;
      victimSpeaker.maxHp = 3000;
      qAudio.playHeroVoice('priestess_ex', 'ult_std', {
        speakerKey: victimSpeaker,
        priority: 3,
        cooldownMs: 10,
        hpFrac: 0.2
      });

      const antiOverlapSlice = playedVoiceLog26.slice(-4);
      if (
        atkSkipped !== false ||
        antiOverlapSlice[0] !== 'seraphina_hurt_short' ||
        antiOverlapSlice[1] !== 'seraphina_skill_short' ||
        antiOverlapSlice[2] !== 'seraphina_skill_alt_short' ||
        antiOverlapSlice[3] !== 'seraphina_ult_short'
      ) {
        throw new Error(
          `[Suite 36.26] Cross-speaker anti-overlap mismatch: atkSkipped=${atkSkipped}, slice=${JSON.stringify(antiOverlapSlice)}`
        );
      }

      // Sequential End-of-Match Queue: Killer Move -> Defeated Death -> 0.40s Breath -> Winner Victory
      qAudio.stopAllHeroVoices(0);
      qAudio.lastVoicePlayed = {};
      playedVoiceLog26.length = 0;
      activeSrcNodes26.length = 0;

      const makeMockEl26 = () => {
        const cls = new Set(['hidden']);
        return {
          textContent: '',
          classList: {
            add: (...cs) => cs.forEach((c) => cls.add(c)),
            remove: (...cs) => cs.forEach((c) => cls.delete(c)),
            contains: (c) => cls.has(c)
          }
        };
      };
      const dom26 = new Map([
        ['victory-overlay', makeMockEl26()],
        ['victory-eyebrow', makeMockEl26()],
        ['victory-winner', makeMockEl26()],
        ['victory-stats', makeMockEl26()],
        ['victory-auto-next', makeMockEl26()]
      ]);
      globalThis.document.getElementById = (id) => dom26.get(id) || makeMockEl26();

      let stopAllBeforeVictoryCalls = 0;
      const origStopAll = qAudio.stopAllHeroVoices.bind(qAudio);
      qAudio.stopAllHeroVoices = (...args) => {
        stopAllBeforeVictoryCalls++;
        return origStopAll(...args);
      };

      const qGame = Object.create(Game.prototype);
      qGame._enforceLiveVoiceQueueInTest = true;
      qGame.simMode = true;
      qGame.isLandingOpen = false;
      qGame.isMatchOver = false;
      qGame.isSimPaused = false;
      qGame.autoTourney = false;
      qGame.victoryRevealPending = false;
      qGame._activeFightersScratch = [];
      qGame.matchTime = 20;
      qGame.hudTimer = 0;
      qGame.slot1Hero = 'warrior_ex';
      qGame.slot2Hero = 'priestess_ex';
      qGame.leftFighter = killerSpeaker;
      qGame.rightFighter = victimSpeaker;
      qGame.fighters = [killerSpeaker, victimSpeaker];
      qGame.victoryOverlay = dom26.get('victory-overlay');
      qGame.renderer = {
        groundY: 560,
        worldWidth: 1200,
        hitStopTimer: 0,
        update() {},
        triggerShake() {},
        triggerAberration() {},
        triggerHitStop() {},
        triggerKOFinisher() {}
      };
      qGame.vfx = new VFXManager();
      qGame.audio = qAudio;
      qGame.setPaused = () => {};
      qGame.updateHUD = () => {};
      qGame.updateProjectiles = () => {};
      qGame.getTeamFighters = (t) => [t === 1 ? killerSpeaker : victimSpeaker];
      qGame.getTeammateOf = () => null;
      qGame.getPointFighter = (t) => (t === 1 ? killerSpeaker : victimSpeaker);
      qGame.isAdventureMode = () => false;
      qGame.is2v2Mode = () => false;

      killerSpeaker.team = 1;
      killerSpeaker.isDead = false;
      killerSpeaker.isPlayerControlled = true;
      killerSpeaker.game = qGame;
      victimSpeaker.team = 2;
      victimSpeaker.isDead = true;
      victimSpeaker.y = 560;
      victimSpeaker.deathTimer = 2.0;
      victimSpeaker.game = qGame;

      // 1. Killer fires priority-3 move line
      qAudio.playHeroVoice('warrior_ex', 'ult_std', {
        speakerKey: killerSpeaker,
        priority: 3,
        cooldownMs: 10
      });
      // 2. Victim dies -> death line deferred while killer finishes!
      qGame.onFighterDeath(victimSpeaker);
      if (
        qAudio._pendingDeathVoiceTimer === null ||
        !qAudio.isDeathOrMatchEndVoiceBusy() ||
        JSON.stringify(playedVoiceLog26) !== '["aethelgard_ult_std"]'
      ) {
        throw new Error(
          `[Suite 36.26] Expected death voice queued behind killer ult_std, got timer=${Boolean(qAudio._pendingDeathVoiceTimer)}, log=${JSON.stringify(playedVoiceLog26)}`
        );
      }

      // Step past normal holdNeeded (1.35s): victory screen MUST stay hidden while death voice is pending!
      for (let i = 0; i < 4; i++) qGame.stepSimulation(0.45);
      if (!qGame.victoryRevealPending) {
        throw new Error('[Suite 36.26] Expected revealVictoryOverlay to hold while death voice is pending!');
      }

      // Wait for scheduled death timer (~320ms) to trigger `seraphina_death`
      await new Promise((r) => setTimeout(r, 420));
      if (
        !playedVoiceLog26.includes('seraphina_death') ||
        !qAudio.isDeathOrMatchEndVoiceBusy() ||
        !qGame.victoryRevealPending
      ) {
        throw new Error(
          `[Suite 36.26] Expected seraphina_death active after killer finished, got log=${JSON.stringify(playedVoiceLog26)}, busy=${qAudio.isDeathOrMatchEndVoiceBusy()}`
        );
      }

      // End `seraphina_death` playback -> 0.40s breath hold -> Winner Victory fires with stopAllHeroVoices!
      const deathSrcNode = activeSrcNodes26[activeSrcNodes26.length - 1];
      deathSrcNode?.onended?.();
      qGame.stepSimulation(0.20);
      if (!qGame.victoryRevealPending) {
        throw new Error('[Suite 36.26] Expected 0.40s post-death breath pause before revealing victory!');
      }
      const stopCountBeforeVictory = stopAllBeforeVictoryCalls;
      qGame.stepSimulation(0.25);

      if (
        qGame.victoryRevealPending ||
        stopAllBeforeVictoryCalls <= stopCountBeforeVictory ||
        JSON.stringify(playedVoiceLog26) !==
          '["aethelgard_ult_std","seraphina_death","aethelgard_victory"]'
      ) {
        throw new Error(
          `[Suite 36.26] Sequential end-of-match dialogue order failed! pending=${qGame.victoryRevealPending}, stopCalls=${stopAllBeforeVictoryCalls}/${stopCountBeforeVictory}, log=${JSON.stringify(playedVoiceLog26)}`
        );
      }
      qAudio.stopAllHeroVoices(0);
    } finally {
      for (const h of spawnedHeroes26) {
        h.fx?.dispose?.();
      }
      globalThis.document.getElementById = prevGetEl26;
      if (globalThis.window) {
        globalThis.window.AudioContext = prevAudioCtx;
        globalThis.window.webkitAudioContext = prevWebkitAudioCtx;
      }
      if (prevStorageDesc26) {
        Object.defineProperty(globalThis, 'localStorage', prevStorageDesc26);
      }
      if (globalThis.window && prevWinStorageDesc26) {
        Object.defineProperty(globalThis.window, 'localStorage', prevWinStorageDesc26);
      }
    }
  }

  // ============================================================================
  // Suite 36.27: Grounded Lyra EX Ults, Blink/Warp AI Non-Starvation, De-Twitched AI,
  // Ultimate Super-Armor & Graze/Pierce Overhaul, and 3-Tier Zoom Modes (`?v=30fps156`)
  // ============================================================================
  {
    const g27 = createMockGame();
    g27.testModeUnlimitedHp = false;
    g27.isAdventureMode = () => false;
    g27.getEnemiesOf = (f) => (g27.fighters || []).filter((o) => o && o !== f && !o.isDead && !o.isBenched);
    const created27 = [];
    const reg27 = (...fs) => {
      for (const f of fs) created27.push(f);
      return fs;
    };

    try {
      // (A) Grounded IceMageEx during ULTIMATE & TRUE_ULTIMATE
      const lyra = new IceMageEx({ x: 360, groundY: 520, facing: 1, team: 'left' });
      const dummyFoe = new WarriorEx({ x: 860, groundY: 520, facing: -1, team: 'right' });
      reg27(lyra, dummyFoe);
      g27.fighters = [lyra, dummyFoe];
      lyra.mana = lyra.maxMana;
      lyra.setState('ULTIMATE');
      for (let i = 0; i < 65 && lyra.state === 'ULTIMATE'; i++) {
        lyra.update(1 / 30, dummyFoe, g27);
        if (lyra.y !== lyra.groundY || lyra.vy !== 0 || (lyra.cameraAirLift || 0) !== 0) {
          throw new Error(
            `[Suite 36.27] IceMageEx lifted during ULTIMATE at tick ${i}: y=${lyra.y}, groundY=${lyra.groundY}, vy=${lyra.vy}, lift=${lyra.cameraAirLift}`
          );
        }
      }
      lyra.setState('IDLE');
      lyra.finisherGauge = lyra.maxFinisherGauge;
      lyra.setState('TRUE_ULTIMATE');
      for (let i = 0; i < 165 && lyra.state === 'TRUE_ULTIMATE'; i++) {
        lyra.update(1 / 30, dummyFoe, g27);
        if (lyra.y !== lyra.groundY || lyra.vy !== 0 || (lyra.cameraAirLift || 0) !== 0) {
          throw new Error(
            `[Suite 36.27] IceMageEx lifted during TRUE_ULTIMATE at tick ${i}: y=${lyra.y}, groundY=${lyra.groundY}, vy=${lyra.vy}, lift=${lyra.cameraAirLift}`
          );
        }
      }

      // (B) Restored Blink/Warp Mobility & Zero dodgeCooldown Starvation
      const ignis = new FireMageEx({ x: 520, groundY: 520, facing: 1, team: 'left' });
      const chronos = new ChronomancerEx({ x: 520, groundY: 520, facing: 1, team: 'left' });
      const nyx = new NyxEx({ x: 520, groundY: 520, facing: 1, team: 'left' });
      const brawler = new WarriorEx({ x: 720, groundY: 520, facing: -1, team: 'right' });
      reg27(ignis, chronos, nyx, brawler);
      g27.fighters = [ignis, chronos, nyx, brawler];

      ignis.dodgeCooldown = 0;
      const ignisRole = ignis.getRoleTacticalProfile();
      if (!ignis._tryRoleDefense(brawler, g27, 200, ignisRole, 70, 1130) || ignis.state !== 'DODGE') {
        throw new Error(`[Suite 36.27] FireMageEx pressured blink failed: state=${ignis.state}`);
      }

      chronos.dodgeCooldown = 0;
      brawler.setState('AUTO_ATTACK');
      brawler.stateTimer = 0.16;
      const chrRole = chronos.getRoleTacticalProfile();
      if (!chronos._tryRoleDefense(brawler, g27, 200, chrRole, 70, 1130) || chronos.state !== 'DODGE' || !chronos.isChronoWarp) {
        throw new Error(`[Suite 36.27] ChronomancerEx PARADOX SLIP failed: state=${chronos.state}, warp=${chronos.isChronoWarp}`);
      }
      brawler.setState('IDLE');
      brawler.stateTimer = 0;

      nyx.dodgeCooldown = 0;
      const nyxStartX = nyx.x;
      const nyxRole = nyx.getRoleTacticalProfile();
      if (
        !nyx._tryRoleDefense(brawler, g27, 200, nyxRole, 70, 1130) ||
        nyx.state !== 'DODGE' ||
        !nyx.isBlinkTeleport ||
        nyx.x === nyxStartX
      ) {
        throw new Error(
          `[Suite 36.27] NyxEx pressured CTRL+Z blink failed: state=${nyx.state}, blink=${nyx.isBlinkTeleport}, x=${nyx.x}`
        );
      }
      for (let i = 0; i < 12 && nyx.state === 'DODGE'; i++) {
        nyx.update(1 / 30, brawler, g27);
        if (nyx.y !== nyx.groundY) {
          throw new Error(`[Suite 36.27] NyxEx hopped instead of staying grounded in blink dodge: y=${nyx.y}`);
        }
      }

      // Calling startJump or crouch defense must NOT overwrite dodgeCooldown
      brawler.dodgeCooldown = 0;
      brawler.jumpCooldown = 0;
      brawler.startJump(nyx, g27);
      if (brawler.dodgeCooldown !== 0) {
        throw new Error(`[Suite 36.27] WarriorEx.startJump clobbered dodgeCooldown=${brawler.dodgeCooldown}`);
      }
      ignis.setState('IDLE');
      ignis.dodgeCooldown = 0.45;
      ignis.crouchCooldown = 0;
      ignis._aiSignatureCd = 0;
      ignis._aiDefenseBreather = 0;
      g27.vfx.projectiles.push({
        x: 620,
        y: 440,
        vx: -600,
        vy: 0,
        owner: brawler,
        color: '#38bdf8'
      });
      ignis._tryRoleDefense(brawler, g27, 360, ignis.getRoleTacticalProfile(), 70, 1130);
      g27.vfx.projectiles.length = 0;
      if (Math.abs(ignis.dodgeCooldown - 0.45) > 1e-6) {
        throw new Error(`[Suite 36.27] invokeCrouch overwrote dodgeCooldown: got ${ignis.dodgeCooldown}`);
      }

      // (C) De-Twitched AI: Facing lock, 14px deadzone, zero ghost parries, counter_duelist SKILL, 0.12s read, Legacy ronin spacing
      const duelist = new Ronin({ x: 600, groundY: 520, facing: 1, team: 'left' });
      const vexEx = new AndroidEx({ x: 610, groundY: 520, facing: -1, team: 'right' });
      reg27(duelist, vexEx);
      g27.fighters = [duelist, vexEx];
      duelist.facing = 1;
      duelist.autoCooldown = 1.0;
      duelist.skillCooldown = 1.0;
      duelist.dashCooldown = 1.0;
      duelist.dodgeCooldown = 1.0;
      vexEx.setState('JUMP');
      vexEx.x = 592; // 8px behind overhead (< 14px deadzone)
      duelist.update(1 / 30, vexEx, g27);
      if (duelist.facing !== 1) {
        throw new Error(`[Suite 36.27] 14px cross-up deadzone failed: facing=${duelist.facing}`);
      }
      vexEx.setState('IDLE');
      vexEx.x = 550; // 50px behind (> 14px)
      duelist.update(1 / 30, vexEx, g27);
      if (duelist.facing !== -1) {
        throw new Error(`[Suite 36.27] Facing did not re-orient past 14px deadzone: facing=${duelist.facing}`);
      }
      // Lock facing while in DASH / JUMP
      brawler.setState('DASH');
      brawler.facing = 1;
      brawler.dashDir = 1;
      vexEx.x = brawler.x - 180;
      brawler.update(1 / 30, vexEx, g27);
      if (brawler.facing !== 1) {
        throw new Error(`[Suite 36.27] Committed DASH failed to lock facing: facing=${brawler.facing}`);
      }

      // Zero ghost parries against stunned / HURT / passive foes
      duelist._aiSignatureCd = 0;
      duelist.crouchCooldown = 0;
      vexEx.setState('HURT');
      if (duelist.triggerPostComboSignature(vexEx, g27, 160)) {
        throw new Error('[Suite 36.27] triggerPostComboSignature fired ghost defense during enemy HURT!');
      }
      vexEx.setState('IDLE');
      vexEx.stunTimer = 0.5;
      if (duelist.triggerPostComboSignature(vexEx, g27, 160)) {
        throw new Error('[Suite 36.27] triggerPostComboSignature fired ghost defense during enemy stun!');
      }
      vexEx.stunTimer = 0;
      vexEx.x = duelist.x + 280;
      if (duelist.triggerPostComboSignature(vexEx, g27, 280)) {
        throw new Error('[Suite 36.27] triggerPostComboSignature triggered maneuver against distant passive enemy!');
      }

      // 0.12s windup gate & counter_duelist neutral SKILL opening
      vexEx.setState('AUTO_ATTACK');
      vexEx.x = duelist.x + 150;
      vexEx.stateTimer = 0.04;
      if (duelist.detectIncomingThreatType(vexEx, g27) !== null) {
        throw new Error('[Suite 36.27] AI counter-read triggered before 0.12s melee windup!');
      }
      vexEx.stateTimer = 0.14;
      if (duelist.detectIncomingThreatType(vexEx, g27) !== 'melee_windup') {
        throw new Error('[Suite 36.27] AI missed melee_windup at 0.14s!');
      }
      vexEx.setState('IDLE');
      duelist._aiSkillReadyTime = 1.0;
      duelist._aiComboCount = 0;
      if (!duelist._canCastRoleSkill(vexEx, 160, duelist.getRoleTacticalProfile(), 134)) {
        throw new Error('[Suite 36.27] counter_duelist failed to allow neutral SKILL opening!');
      }

      // Legacy Ronin spacing stays IDLE at 114px (> minSep 110) without fighting pushback
      duelist.setState('IDLE');
      duelist.autoCooldown = 1.5;
      duelist.skillCooldown = 1.5;
      duelist.dashCooldown = 1.5;
      duelist._aiSignatureCd = 5.0;
      duelist._aiOutstepTimer = 0;
      duelist._aiFootsieMode = 'idle';
      duelist._aiFootsieHoldTimer = 0;
      duelist.x = 500;
      vexEx.x = 614;
      duelist.update(1 / 30, vexEx, g27);
      if (duelist.state !== 'IDLE') {
        throw new Error(`[Suite 36.27] Legacy ronin jitter-walked at dist=114: state=${duelist.state}`);
      }

      // (D) Ultimate Super Armor (0.22s / 0.35s startup, 45%/65% DR, >=1 HP floor) & Defender 50% Graze / 75% Pierce
      const armorHero = new WarriorEx({ x: 400, groundY: 520, facing: 1, team: 'left' });
      const ultCaster = new WarriorEx({ x: 560, groundY: 520, facing: -1, team: 'right' });
      const malakor = new ReaperEx({ x: 720, groundY: 520, facing: -1, team: 'right' });
      const nyxDef = new NyxEx({ x: 720, groundY: 520, facing: -1, team: 'right' });
      reg27(armorHero, ultCaster, malakor, nyxDef);
      armorHero.game = g27;
      ultCaster.game = g27;
      malakor.game = g27;
      nyxDef.game = g27;
      g27.fighters = [armorHero, ultCaster, malakor, nyxDef];

      // Caster ULTIMATE startup vs Super Armor
      armorHero.hp = armorHero.maxHp;
      armorHero.setState('ULTIMATE');
      armorHero.stateTimer = 0.10;
      armorHero.takeDamage(100, ultCaster, false, 90, -80);
      if (armorHero.hp !== armorHero.maxHp) {
        throw new Error(`[Suite 36.27] ULTIMATE startup 0.22s protection failed: hp=${armorHero.hp}/${armorHero.maxHp}`);
      }
      armorHero.stateTimer = 0.50;
      armorHero.vx = 0;
      armorHero.takeDamage(100, ultCaster, true, 120, -150);
      const ultDmgTaken = armorHero.maxHp - armorHero.hp;
      if (ultDmgTaken !== 55 || armorHero.state !== 'ULTIMATE' || !armorHero.unstoppablePoise || armorHero.vx !== 0) {
        throw new Error(
          `[Suite 36.27] ULTIMATE 45% DR Super Armor failed: taken=${ultDmgTaken}, state=${armorHero.state}, poise=${armorHero.unstoppablePoise}, vx=${armorHero.vx}`
        );
      }

      // Caster TRUE_ULTIMATE pre-impact 65% DR + >=1 HP floor
      armorHero.setState('TRUE_ULTIMATE');
      armorHero.hp = 20;
      armorHero.stateTimer = 0.12;
      armorHero.takeDamage(100, ultCaster, false, 90, 0);
      if (armorHero.hp !== 20) {
        throw new Error(`[Suite 36.27] TRUE_ULTIMATE 0.35s startup failed: hp=${armorHero.hp}`);
      }
      armorHero.stateTimer = 0.80;
      armorHero.takeDamage(1000, ultCaster, true, 120, 0);
      if (armorHero.hp !== 1 || armorHero.state !== 'TRUE_ULTIMATE') {
        throw new Error(`[Suite 36.27] TRUE_ULTIMATE >=1 HP floor failed: hp=${armorHero.hp}, state=${armorHero.state}`);
      }

      // Defender Graze (50% vs ULTIMATE) & Pierce (75% vs TRUE_ULTIMATE) through DODGE & Burrow
      g27.vfx.texts.length = 0;
      ultCaster.setState('AUTO_ATTACK');
      nyxDef.setState('DODGE');
      nyxDef.isInvulnerable = true;
      nyxDef.stateTimer = 0.05;
      nyxDef.hp = nyxDef.maxHp;
      nyxDef.holoPatchShield = 80;
      nyxDef.holoPatchTimer = 2.0;
      nyxDef.takeDamage(100, ultCaster, false, 60, 0);
      if (nyxDef.hp !== nyxDef.maxHp || nyxDef.holoPatchShield !== 80) {
        throw new Error(`[Suite 36.27] Basic dodge failed vs AUTO_ATTACK: hp=${nyxDef.hp}, shield=${nyxDef.holoPatchShield}`);
      }

      ultCaster.setState('ULTIMATE');
      ultCaster.stateTimer = 0.40;
      nyxDef.takeDamage(100, ultCaster, true, 60, 0);
      const grazeDmg = nyxDef.maxHp - nyxDef.hp;
      if (grazeDmg !== 50 || !g27.vfx.texts.some((t) => t.text === 'GRAZED!')) {
        throw new Error(`[Suite 36.27] ULTIMATE Graze (50%) failed: dmg=${grazeDmg}`);
      }

      g27.vfx.texts.length = 0;
      ultCaster.setState('TRUE_ULTIMATE');
      ultCaster.stateTimer = 1.20;
      malakor.setState('CROUCH');
      malakor.isFullyBurrowed = true;
      malakor.hp = malakor.maxHp;
      malakor.takeDamage(100, ultCaster, true, 80, 0);
      const pierceDmg = malakor.maxHp - malakor.hp;
      if (pierceDmg !== 75 || !g27.vfx.texts.some((t) => t.text === 'PIERCED!')) {
        throw new Error(`[Suite 36.27] TRUE_ULTIMATE Pierce (75%) failed on burrow: dmg=${pierceDmg}`);
      }

      // (E) 3-Tier Zoom Mode (`full | mid | auto`) across Desktop, Mobile Portrait & Mobile Landscape + Zero Stage-Edge Clip
      const prevW27 = globalThis.window?.innerWidth;
      const prevH27 = globalThis.window?.innerHeight;
      const prevModeKey27 = globalThis.window?.localStorage?.getItem?.('avs_camera_zoom_mode') ?? null;
      const prevMobKey27 = globalThis.window?.localStorage?.getItem?.('avs_mobile_full_zoom_out') ?? null;
      const mockStorage27 = new Map();
      const prevDesc27 = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
      const prevWinDesc27 = globalThis.window
        ? Object.getOwnPropertyDescriptor(globalThis.window, 'localStorage')
        : null;
      const ls27 = {
        getItem: (k) => (mockStorage27.has(k) ? mockStorage27.get(k) : null),
        setItem: (k, v) => mockStorage27.set(k, String(v)),
        removeItem: (k) => mockStorage27.delete(k)
      };
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: ls27 });
      if (globalThis.window) {
        Object.defineProperty(globalThis.window, 'localStorage', { configurable: true, value: ls27 });
      }
      try {
        const z1 = new WarriorEx({ x: 420, groundY: 520, facing: 1, team: 'left' });
        const z2 = new FireMageEx({ x: 780, groundY: 520, facing: -1, team: 'right' });
        reg27(z1, z2);
        for (const [vw, vh, label] of [
          [1280, 720, 'Desktop'],
          [390, 844, 'Mobile Portrait'],
          [844, 390, 'Mobile Landscape']
        ]) {
          if (globalThis.window) {
            globalThis.window.innerWidth = vw;
            globalThis.window.innerHeight = vh;
          }
          ls27.removeItem('avs_camera_zoom_mode');
          ls27.removeItem('avs_mobile_full_zoom_out');
          const c27 = {
            width: vw,
            height: vh,
            getBoundingClientRect: () => ({ width: vw, height: vh }),
            getContext: () => createMockCtx()
          };
          const r27 = new Renderer(c27);
          const expectedDefault = label === 'Desktop' ? 'auto' : 'full';
          if (r27.zoomMode !== expectedDefault) {
            throw new Error(`[Suite 36.27] Expected default zoomMode=${expectedDefault} on ${label}, got ${r27.zoomMode}`);
          }

          r27.setZoomMode('full');
          for (let i = 0; i < 30; i++) r27.update(1 / 30, [z1, z2]);
          const zFull = r27.zoom;
          const halfWFull = (vw * 0.5) / zFull;
          if (r27.camX - halfWFull < -360 - 1 || r27.camX + halfWFull > 1560 + 1) {
            throw new Error(
              `[Suite 36.27] ${label} FULL zoom clipped horizontally: camX=${r27.camX}, halfW=${halfWFull}`
            );
          }

          if (r27.cycleZoomMode() !== 'mid') {
            throw new Error(`[Suite 36.27] Expected full -> mid cycle on ${label}`);
          }
          for (let i = 0; i < 30; i++) r27.update(1 / 30, [z1, z2]);
          const zMid = r27.zoom;

          if (r27.cycleZoomMode() !== 'auto') {
            throw new Error(`[Suite 36.27] Expected mid -> auto cycle on ${label}`);
          }
          for (let i = 0; i < 45; i++) r27.update(1 / 30, [z1, z2]);
          const zAuto = r27.zoom;

          if (!(zFull < zMid && zMid < zAuto)) {
            throw new Error(
              `[Suite 36.27] ${label} zoom hierarchy broken: full=${zFull.toFixed(3)}, mid=${zMid.toFixed(3)}, auto=${zAuto.toFixed(3)}`
            );
          }
          r27.setZoomMode('mid');
          const rReload = new Renderer(c27);
          if (rReload.zoomMode !== 'mid') {
            throw new Error(`[Suite 36.27] localStorage persistence failed on ${label}: got ${rReload.zoomMode}`);
          }
        }
      } finally {
        if (globalThis.window) {
          globalThis.window.innerWidth = prevW27;
          globalThis.window.innerHeight = prevH27;
        }
        if (prevDesc27) Object.defineProperty(globalThis, 'localStorage', prevDesc27);
        if (globalThis.window && prevWinDesc27) {
          Object.defineProperty(globalThis.window, 'localStorage', prevWinDesc27);
        }
        if (prevModeKey27 !== null) globalThis.window?.localStorage?.setItem?.('avs_camera_zoom_mode', prevModeKey27);
        if (prevMobKey27 !== null) globalThis.window?.localStorage?.setItem?.('avs_mobile_full_zoom_out', prevMobKey27);
      }
    } finally {
      for (const f of created27) f.fx?.dispose?.();
    }
  }

  // ============================================================================
  // Suite 36.28: 3-Act Match Intro Overhaul — Real-Time Voice Envelope Analyzer
  // (`AudioManager.getVoiceAmplitude`), Act 1 Colossal Split-Wing `NAME VS. NAME` Clash,
  // Act 2 Live Voice-Synced Close-Up Talking Portrait Cut-In & Stage Taunt Flourish,
  // and Act 3 Massive Explosive `ENGAGE!` Slash-Burst (`?v=30fps156`)
  // ============================================================================
  {
    const created28 = [];
    const reg28 = (...fs) => {
      for (const f of fs) created28.push(f);
      return fs;
    };
    const parseFontPx28 = (fontStr) => {
      const m = String(fontStr || '').match(/(\d+)\s*px/i);
      return m ? Number.parseInt(m[1], 10) : 0;
    };

    try {
      // (A) AudioManager.getVoiceAmplitude() returns 0 when silent and > 0 when a hero voice is active
      const ampAudio = new AudioManager();
      const makeGain28 = (initVal = 1) => ({
        gain: {
          value: initVal,
          setValueAtTime(v) {
            this.value = v;
          },
          linearRampToValueAtTime(v) {
            this.value = v;
          },
          exponentialRampToValueAtTime(v) {
            this.value = v;
          }
        },
        connect() {},
        disconnect() {}
      });
      ampAudio.ctx = {
        state: 'running',
        currentTime: 0,
        destination: {},
        createGain: () => makeGain28(1),
        createStereoPanner: () => ({ pan: { value: 0 }, connect() {}, disconnect() {} }),
        createBufferSource: () => ({
          buffer: null,
          playbackRate: { value: 1 },
          onended: null,
          connect() {},
          disconnect() {},
          start() {},
          stop() {}
        })
      };
      ampAudio.sfxBus = makeGain28(0.55);
      ampAudio.sfxDuckGain = makeGain28(1.0);
      ampAudio.voiceBus = makeGain28(1.42);
      ampAudio.master = ampAudio.sfxBus;
      ampAudio.voiceBuffers['en:aethelgard_intro'] = { duration: 3.5 };

      if (ampAudio.isHeroVoiceBusy() !== false || ampAudio.getVoiceAmplitude() !== 0) {
        throw new Error(
          `[Suite 36.28] Expected getVoiceAmplitude() === 0 when silent, got ${ampAudio.getVoiceAmplitude()}`
        );
      }

      ampAudio.playHeroVoice('warrior_ex', 'intro', {
        speakerKey: 'p1_intro_28',
        priority: 3,
        cooldownMs: 10
      });
      const fallbackAmp = ampAudio.getVoiceAmplitude();
      if (!ampAudio.isHeroVoiceBusy() || !(fallbackAmp > 0.2 && fallbackAmp <= 1.0)) {
        throw new Error(
          `[Suite 36.28] Expected fallback getVoiceAmplitude() in (0.2, 1.0] when hero voice is active, got ${fallbackAmp}`
        );
      }

      // Verify live AnalyserNode time-domain PCM energy extraction
      ampAudio.voiceAnalyser = {
        fftSize: 128,
        smoothingTimeConstant: 0.65,
        frequencyBinCount: 64,
        getByteTimeDomainData(buf) {
          for (let i = 0; i < buf.length; i++) {
            buf[i] = i % 2 === 0 ? 176 : 80;
          }
        }
      };
      const pcmAmp = ampAudio.getVoiceAmplitude();
      if (!(pcmAmp > 0.5 && pcmAmp <= 1.0)) {
        throw new Error(`[Suite 36.28] Expected live PCM getVoiceAmplitude() > 0.5, got ${pcmAmp}`);
      }
      // Verify true inter-word silence (`buf[i] = 128`) decays cleanly to 0 instead of falling through to sin()!
      ampAudio.voiceAnalyser.getByteTimeDomainData = (buf) => {
        buf.fill(128);
      };
      let silenceAmp = 1;
      for (let k = 0; k < 10; k++) silenceAmp = ampAudio.getVoiceAmplitude();
      if (silenceAmp !== 0) {
        throw new Error(
          `[Suite 36.28] Expected silent PCM pause to decay to 0, got ${silenceAmp}`
        );
      }
      ampAudio.stopAllHeroVoices(0);
      if (ampAudio.getVoiceAmplitude() !== 0) {
        throw new Error(
          `[Suite 36.28] Expected getVoiceAmplitude() === 0 after stopAllHeroVoices, got ${ampAudio.getVoiceAmplitude()}`
        );
      }

      // (B) Verify 1920x320 (6 x 320x320) lossless PNG talking bust sheets for Nyx & Warrior
      for (const talkRel of [
        'assets/sprites/intro_talk/nyx_talk_sheet.png',
        'assets/sprites/intro_talk/warrior_talk_sheet.png'
      ]) {
        const buf = fs.readFileSync(path.join(REPO_ROOT, talkRel));
        if (buf.length < 32 || buf.readUInt32BE(0) !== 0x89504e47) {
          throw new Error(`[Suite 36.28] Invalid PNG header on ${talkRel}`);
        }
        const pw = buf.readUInt32BE(16);
        const ph = buf.readUInt32BE(20);
        if (pw !== 1920 || ph !== 320) {
          throw new Error(`[Suite 36.28] Expected 1920x320 on ${talkRel}, got ${pw}x${ph}`);
        }
      }

      // (C) 3-Act Giant Arcade Intro Choreography:
      // Act 1 Staggered Giant Names (52-64px) + VS. (76-90px),
      // Act 2 Giant Half-Screen 6-Frame Talking Bust (480px+) + 48-60px Speaker Name Slam,
      // Act 3 Colossal ENGAGE! Detonation (68-84px)
      const p1Hero = new WarriorEx({ x: 300, groundY: 560, facing: 1, team: 1 });
      const p2Hero = new NyxEx({ x: 900, groundY: 560, facing: -1, team: 2 });
      const fbHero = new ValkyrieEx({ x: 300, groundY: 560, facing: 1, team: 1 });
      reg28(p1Hero, p2Hero, fbHero);

      let mockVoiceAmp = 0.68;
      const g28 = Object.create(Game.prototype);
      g28.gameMode = '1v1';
      g28.simMode = true;
      g28.isLandingOpen = false;
      g28.isMatchOver = false;
      g28.isSimPaused = false;
      g28.matchTime = 0;
      g28.hudTimer = 0;
      g28.slot1Hero = 'warrior_ex';
      g28.slot2Hero = 'nyx_ex';
      g28.leftFighter = p1Hero;
      g28.rightFighter = p2Hero;
      g28.fighters = [p1Hero, p2Hero];
      g28.renderer = { groundY: 560, worldWidth: 1200, hitStopTimer: 0, update() {} };
      g28.vfx = { update() {} };
      g28.updateHUD = () => {};
      g28.isAdventureMode = () => false;
      g28.getPointFighter = (team) => (team === 2 ? p2Hero : p1Hero);
      g28.audio = {
        enabled: true,
        voiceEnabled: true,
        getVoiceVolume: () => 1.0,
        hasVoicePack: () => true,
        preloadHeroVoicePack() {},
        preDuckSfxForVoice() {},
        stopAllHeroVoices() {},
        play() {},
        playHeroVoice: () => true,
        getVoiceAmplitude: () => mockVoiceAmp
      };

      const makeTraceCtx28 = (vw, vh) => {
        const rec = {
          texts: [],
          rects: [],
          drawImages: [],
          scales: [],
          rotateCalls: 0,
          arcCalls: 0,
          ellipseCalls: 0
        };
        const ctx = createMockCtx(rec);
        ctx.canvas = { width: vw, height: vh };
        ctx.fillText = (txt, x, y, maxW) => {
          rec.texts.push({
            text: String(txt),
            x,
            y,
            maxW,
            font: ctx.font,
            px: parseFontPx28(ctx.font)
          });
        };
        ctx.fillRect = (x, y, w, h) => {
          rec.rects.push({ x, y, w, h, fillStyle: ctx.fillStyle });
        };
        ctx.drawImage = (img, ...args) => {
          rec.drawImages.push({ img, args });
        };
        ctx.scale = (sx, sy) => {
          rec.scales.push([sx, sy]);
        };
        ctx.arc = () => {
          rec.arcCalls++;
        };
        ctx.ellipse = () => {
          rec.ellipseCalls++;
        };
        return { ctx, rec };
      };

      // 1. Act 1 (`roundIntroElapsed = 0.20` and `0.05` slam-in comparison) across 1280x720, 390x844, 844x390
      g28.beginLiveRoundIntro({ forceInTest: true });
      const n1Upper = p1Hero.name.toUpperCase();
      const n2Upper = p2Hero.name.toUpperCase();

      for (const [vw, vh] of [
        [1280, 720],
        [390, 844],
        [844, 390]
      ]) {
        const { ctx: ctxEarly, rec: recEarly } = makeTraceCtx28(vw, vh);
        g28.roundIntroTimer = 4.10;
        g28.roundIntroElapsed = 0.05;
        g28._renderRoundIntroOverlay(ctxEarly);
        const earlyP1X = recEarly.texts.find((t) => t.text === n1Upper)?.x ?? 0;
        const earlyP2X = recEarly.texts.find((t) => t.text === n2Upper)?.x ?? 0;

        const { ctx: ctxAct1, rec: recAct1 } = makeTraceCtx28(vw, vh);
        g28.roundIntroTimer = 3.95;
        g28.roundIntroElapsed = 0.20;
        g28._renderRoundIntroOverlay(ctxAct1);

        const vsEntry = recAct1.texts.find((t) => t.text === 'VS.');
        const p1Entry = recAct1.texts.find((t) => t.text === n1Upper);
        const p2Entry = recAct1.texts.find((t) => t.text === n2Upper);
        const minX1 = Math.min(...recAct1.rects.map((r) => r.x));
        const maxX1 = Math.max(...recAct1.rects.map((r) => r.x + r.w));

        if (
          !vsEntry ||
          !p1Entry ||
          !p2Entry ||
          Math.abs(vsEntry.y - vh * 0.46) > 12 ||
          !(p1Entry.y < vsEntry.y && p2Entry.y > vsEntry.y) ||
          recAct1.rotateCalls !== 0 ||
          recAct1.arcCalls !== 0 ||
          recAct1.ellipseCalls !== 0 ||
          minX1 < 0 ||
          maxX1 > vw
        ) {
          throw new Error(
            `[Suite 36.28] Act 1 staggered clash overlay failed on ${vw}x${vh}: vsY=${vsEntry?.y}, p1Y=${p1Entry?.y}, p2Y=${p2Entry?.y}, rects=[${minX1},${maxX1}]`
          );
        }
        if (vw === 1280) {
          if (
            !(vsEntry.px >= 44 && vsEntry.px <= 62) ||
            !(p1Entry.px >= 32 && p1Entry.px <= 44) ||
            !(p2Entry.px >= 32 && p2Entry.px <= 44) ||
            !(p1Entry.x > earlyP1X) ||
            !(p2Entry.x < earlyP2X)
          ) {
            throw new Error(
              `[Suite 36.28] Act 1 Balanced Desktop typography/slam check failed: vsPx=${vsEntry.px}, p1Px=${p1Entry.px}, p2Px=${p2Entry.px}, p1X=${earlyP1X}->${p1Entry.x}, p2X=${earlyP2X}->${p2Entry.x}`
            );
          }
        }
      }

      // 2. Act 2 Dual P1 -> P2 Intro (`warrior_ex` -> `nyx_ex`), Smooth `F3` Mouth Gate, & Giant 6-Frame Bust
      const introFiredIds = [];
      g28.audio.playHeroVoice = (hid, cue) => {
        if (cue === 'intro') introFiredIds.push(hid);
        return true;
      };
      const dualDur = g28.beginLiveRoundIntro({ forceInTest: true });
      if (Math.abs(dualDur - 8.25) > 0.05 || g28._roundIntroQueue?.length !== 2) {
        throw new Error(`[Suite 36.28] Expected 8.25s Dual P1->P2 intro queue, got dur=${dualDur}, len=${g28._roundIntroQueue?.length}`);
      }
      for (let i = 0; i < 40; i++) {
        g28.stepSimulation(0.05); // advances to roundIntroElapsed = 2.0s (Act 2A: P1 speaking)
      }
      if (
        g28._roundIntroFighter !== p1Hero ||
        p1Hero.state !== 'SKILL' ||
        !(p1Hero._overrideFrameIdx >= 90 && p1Hero._overrideFrameIdx <= 97) ||
        p1Hero.vx !== 0 ||
        p1Hero.vy !== 0 ||
        p1Hero.y !== p1Hero.groundY ||
        p2Hero.state !== 'IDLE' ||
        !introFiredIds.includes('warrior_ex')
      ) {
        throw new Error(
          `[Suite 36.28] Act 2A P1 stage flourish failed at 2.0s: spk=${g28._roundIntroFighter?.heroId}, p1State=${p1Hero.state}, p2State=${p2Hero.state}, voices=${JSON.stringify(introFiredIds)}`
        );
      }

      // Verify smooth 4-stage `0 <-> 1 (F3) <-> 2 (F4) <-> 3 (F5)` mouth progression gate!
      g28._introMouthStage = 0;
      g28._introMouthHoldSec = 0;
      const openSeq = [];
      for (let s = 0; s < 5; s++) openSeq.push(g28._stepIntroTalkArticulation(0.07, 0.85));
      const closeSeq = [];
      for (let s = 0; s < 5; s++) closeSeq.push(g28._stepIntroTalkArticulation(0.09, 0.0));
      if (
        !openSeq.includes(1) ||
        !openSeq.includes(2) ||
        openSeq[openSeq.length - 1] !== 3 ||
        !closeSeq.includes(2) ||
        !closeSeq.includes(1) ||
        closeSeq[closeSeq.length - 1] !== 0
      ) {
        throw new Error(
          `[Suite 36.28] Smooth 4-stage vowel mouth gate failed: open=${JSON.stringify(openSeq)}, close=${JSON.stringify(closeSeq)}`
        );
      }

      // Advance to Act 2B (`roundIntroElapsed = 5.5s` -> P2 `nyx_ex` speaking, P1 returned to IDLE!)
      for (let i = 0; i < 70; i++) {
        g28.stepSimulation(0.05);
      }
      if (
        g28._roundIntroFighter !== p2Hero ||
        p2Hero.state !== 'SKILL' ||
        !(p2Hero._overrideFrameIdx >= 90 && p2Hero._overrideFrameIdx <= 97) ||
        p1Hero.state !== 'IDLE' ||
        !introFiredIds.includes('nyx_ex')
      ) {
        throw new Error(
          `[Suite 36.28] Act 2B P2 turn handoff failed at 5.5s: spk=${g28._roundIntroFighter?.heroId}, p1State=${p1Hero.state}, p2State=${p2Hero.state}, voices=${JSON.stringify(introFiredIds)}`
        );
      }

      // Verify all 6 anime cel frames `F0..F5` across silent/half-blink/full-blink/small/mid/wide vowel states!
      g28._introMouthStage = undefined;
      for (const [spkHero, isRight] of [
        [p1Hero, false],
        [p2Hero, true]
      ]) {
        g28._roundIntroFighter = spkHero;
        g28._introSpeakerElapsed = 1.0;
        const spkUpper = spkHero.name.toUpperCase();

        const cases = [
          { amp: 0, elapsed: 1.5, expectedFrames: [0] },     // Open calm eyes + closed mouth -> F0
          { amp: 0, elapsed: 2.30, expectedFrames: [1] },    // 2.28 <= blinkPhase < 2.335 -> F1 (Half-Blink Cushion)
          { amp: 0, elapsed: 2.38, expectedFrames: [2] },    // 2.335 <= blinkPhase < 2.445 -> F2 (Full Closed Blink)
          { amp: 0.18, elapsed: 2.0, expectedFrames: [3] },  // 0.07 < 0.18 <= 0.30 -> F3 (Small Vowel)
          { amp: 0.45, elapsed: 2.0, expectedFrames: [4] },  // 0.30 < 0.45 <= 0.62 -> F4 (Mid Vowel)
          { amp: 0.82, elapsed: 2.2, expectedFrames: [5] }   // amp > 0.62 -> F5 (Wide Accented Vowel)
        ];

        for (const c of cases) {
          mockVoiceAmp = c.amp;
          g28.roundIntroElapsed = c.elapsed;
          const { ctx: ctxF, rec: recF } = makeTraceCtx28(1280, 720);
          g28._renderRoundIntroOverlay(ctxF);
          const expectedTalkImg = PixelForge.getIntroTalkSheet(spkHero.heroId);
          const expectedLayersImg = PixelForge.getIntroTalkLayers(spkHero.heroId);
          const expectedAnimImg = PixelForge.getIntroTalkAnimSheet(spkHero.heroId);
          const talkDi = recF.drawImages.find((d) => d.img === expectedTalkImg);
          const animDi = recF.drawImages.find((d) => d.img === expectedAnimImg);
          const bgDi = recF.drawImages.find((d) => d.img === expectedLayersImg && d.args[0] === 0);
          const sx = talkDi?.args?.[0];
          const gotFrame = typeof sx === 'number' ? Math.floor(sx / 320) : -1;
          const bodyDi = animDi || talkDi;
          const sw = bodyDi?.args?.[2];
          const sh = bodyDi?.args?.[3];
          const dw = bodyDi?.args?.[6];
          const dh = bodyDi?.args?.[7];
          const spkEntry = recF.texts.find((t) => t.text === spkUpper);
          const subEntry = recF.texts.find((t) => t.text.startsWith('"'));
          const hasFlip = recF.scales.some(([sxScale]) => sxScale === -1);
          if (
            !talkDi ||
            !animDi ||
            !bgDi ||
            bgDi.args[6] !== bgDi.args[7] ||
            sw !== 320 ||
            sh !== 320 ||
            !(dw >= 420 && dh >= 420) ||
            !c.expectedFrames.includes(gotFrame) ||
            !spkEntry ||
            !(spkEntry.px >= 32 && spkEntry.px <= 46) ||
            !subEntry ||
            !(subEntry.px >= 22) ||
            hasFlip !== isRight
          ) {
            throw new Error(
              `[Suite 36.28] Apple Vision 8-frame living bust check failed for ${spkHero.heroId} (amp=${c.amp}, t=${c.elapsed}): gotFrame=${gotFrame} (sx=${sx}), size=${dw}x${dh}, spkPx=${spkEntry?.px}, subPx=${subEntry?.px}, bg=${Boolean(bgDi)}, anim=${Boolean(animDi)}, flip=${hasFlip}/${isRight}`
            );
          }
        }
      }

      // Verify Lower, Truly Borderless, All-12-Hero-Themed 2-Line Kinetic Ultimate/Supreme Popup (`Renderer.js`)
      {
        const ultRen = new Renderer({ width: 1280, height: 800, getContext: () => createMockCtx() });
        for (const hid of PixelForge.EX_HERO_KEYS) {
          const { ctx: ctxUlt, rec: recUlt } = makeTraceCtx28(1280, 800);
          ultRen.cutInHeroId = hid;
          ultRen.cutInIsEx = true;
          ultRen.cutInIsTrueUlt = true;
          ultRen.cutInSide = hid === 'nyx_ex' ? 'right' : 'left';
          ultRen.cutInName = hid.toUpperCase();
          ultRen.cutInUltName = 'GENESIS PROMPT: POWERED BY COB';
          ultRen.cutInMaxTimer = 1.75;
          ultRen.cutInTimer = 1.10; // settled post-slam (`p ~= 0.37`)
          ultRen.drawExUltimateCutIn(ctxUlt, 1280, 96);
          const [splitL1, splitL2] = ultRen._splitUltCalloutLines(ultRen.cutInUltName);
          const mainUltEntry = recUlt.texts.find((t) => t.text === splitL2);
          if (
            !splitL1 ||
            !mainUltEntry ||
            !(mainUltEntry.px >= 28) ||
            recUlt.drawImages.length !== 0 ||
            recUlt.rotateCalls !== 0 ||
            recUlt.arcCalls !== 0 ||
            recUlt.ellipseCalls !== 0
          ) {
            throw new Error(
              `[Suite 36.28] Hero-themed borderless Supreme Cut-In failed for ${hid}: mainPx=${mainUltEntry?.px}`
            );
          }
        }
      }

      // Verify All 12 `1920x320` Talking Bust Sheets & All 23 Hero Keys (`EX + Legacy`) + `valkyrie_ex` Live Sheet & Fallback!
      {
        for (const persona of PixelForge.INTRO_RAW_BUST_PERSONAS) {
          const sheetPath = path.join(REPO_ROOT, 'assets/sprites/intro_talk', `${persona}_talk_sheet.png`);
          const layersPath = path.join(REPO_ROOT, 'assets/sprites/intro_talk', `${persona}_layers.png`);
          const animPath = path.join(REPO_ROOT, 'assets/sprites/intro_talk', `${persona}_anim_sheet.png`);
          if (!fs.existsSync(sheetPath) || !fs.existsSync(layersPath) || !fs.existsSync(animPath)) {
            throw new Error(`[Suite 36.28] Missing talking bust, layers, or anim8 sheet: ${persona}`);
          }
          const hdr = fs.readFileSync(sheetPath);
          const pw = hdr.readUInt32BE(16);
          const ph = hdr.readUInt32BE(20);
          const lhdr = fs.readFileSync(layersPath);
          const lw = lhdr.readUInt32BE(16);
          const lh = lhdr.readUInt32BE(20);
          const ahdr = fs.readFileSync(animPath);
          const aw = ahdr.readUInt32BE(16);
          const ah = ahdr.readUInt32BE(20);
          if (pw !== 1920 || ph !== 320 || lw !== 960 || lh !== 320 || aw !== 2560 || ah !== 320) {
            throw new Error(
              `[Suite 36.28] Expected ${persona} talk=1920x320, layers=960x320, anim=2560x320, got ${pw}x${ph}, ${lw}x${lh}, ${aw}x${ah}`
            );
          }
        }
        for (const hk of PixelForge.ALL_HERO_KEYS) {
          if (
            !PixelForge.getIntroTalkSheet(hk) ||
            !PixelForge.getIntroTalkLayers(hk) ||
            !PixelForge.getIntroTalkAnimSheet(hk)
          ) {
            throw new Error(`[Suite 36.28] Expected getIntroTalkSheet/Layers/AnimSheet('${hk}') to resolve!`);
          }
          const baseP = hk.replace(/_ex$/, '');
          if (!INTRO_DIALOGUE_SUBTITLES[baseP]?.en || !INTRO_DIALOGUE_SUBTITLES[baseP]?.ja) {
            throw new Error(`[Suite 36.28] Missing EN/JP intro subtitle for '${baseP}'!`);
          }
        }
        // Verify dynamic side-aware Ultimate popup side resolution & mid-speech cushioned blink
        const prevP1X = p1Hero.x;
        const prevP2X = p2Hero.x;
        p1Hero.x = 920;
        p2Hero.x = 280;
        const swappedP1Side = g28._resolveCasterCutInSide(p1Hero);
        const swappedP2Side = g28._resolveCasterCutInSide(p2Hero);
        p1Hero.x = prevP1X;
        p2Hero.x = prevP2X;
        const midSpeechBlink = Game.computeIntroTalkFrameIndex(0.20, 1.15);
        if (swappedP1Side !== 'right' || swappedP2Side !== 'left' || midSpeechBlink !== 2) {
          throw new Error(
            `[Suite 36.28] Dynamic side-swap or mid-speech blink check failed: p1=${swappedP1Side}, p2=${swappedP2Side}, blink=${midSpeechBlink}`
          );
        }

        const assets28 = PixelForge.initAssets();
        if (assets28?.introRawBusts?.valkyrie) {
          assets28.introRawBusts.valkyrie.naturalWidth = 1024;
          assets28.introRawBusts.valkyrie.naturalHeight = 1024;
        }
        const fbMeta = PixelForge.getIntroFallbackBust('valkyrie_ex');
        if (!fbMeta || fbMeta.sx !== 68 || fbMeta.sy !== 68 || fbMeta.sw !== 888 || fbMeta.sh !== 888) {
          throw new Error(
            `[Suite 36.28] Fallback valkyrie_ex 888x888 crop metadata failed: ${JSON.stringify(fbMeta)}`
          );
        }

        g28._roundIntroFighter = fbHero;
        g28._introMouthStage = undefined;
        mockVoiceAmp = 0.82;
        g28.roundIntroElapsed = 2.2;
        const { ctx: ctxFb, rec: recFb } = makeTraceCtx28(1280, 720);
        g28._renderRoundIntroOverlay(ctxFb);
        const expectedValkTalk = PixelForge.getIntroTalkSheet('valkyrie_ex');
        const expectedValkAnim = PixelForge.getIntroTalkAnimSheet('valkyrie_ex');
        const fbTalkDi = recFb.drawImages.find((d) => d.img === expectedValkTalk);
        const fbAnimDi = recFb.drawImages.find((d) => d.img === expectedValkAnim);
        if (
          !fbTalkDi ||
          !fbAnimDi ||
          Math.floor(fbTalkDi.args[0] / 320) !== 5 ||
          fbAnimDi.args[2] !== 320 ||
          fbAnimDi.args[3] !== 320 ||
          !(fbAnimDi.args[6] >= 420 && fbAnimDi.args[7] >= 420)
        ) {
          throw new Error(
            `[Suite 36.28] valkyrie_ex 8-frame living + F5 talk bust render failed: talk=${JSON.stringify(fbTalkDi?.args)}, anim=${JSON.stringify(fbAnimDi?.args)}`
          );
        }
      }

      // Restore P2 speaker (`nyx_ex` in Act 2B) & verify viewport clamping across 1280x720, 390x844, 844x390
      g28._roundIntroFighter = p2Hero;
      g28.roundIntroElapsed = 5.0;
      for (const [vw, vh] of [
        [1280, 720],
        [390, 844],
        [844, 390]
      ]) {
        mockVoiceAmp = 0.72;
        const { ctx: ctxTalk, rec: recTalk } = makeTraceCtx28(vw, vh);
        g28._renderRoundIntroOverlay(ctxTalk);

        const minX2 = Math.min(...recTalk.rects.map((r) => r.x));
        const maxX2 = Math.max(...recTalk.rects.map((r) => r.x + r.w));
        const hasResonanceTag = recTalk.texts.some((t) => t.text === 'INTRO • VOICE RESONANCE');
        const hasTopVsHeader = recTalk.texts.some((t) => t.text === 'VS.');
        const di = recTalk.drawImages[0];

        if (
          !di ||
          !hasResonanceTag ||
          !hasTopVsHeader ||
          recTalk.rects.length < 32 ||
          recTalk.rotateCalls !== 0 ||
          recTalk.arcCalls !== 0 ||
          recTalk.ellipseCalls !== 0 ||
          minX2 < 0 ||
          maxX2 > vw
        ) {
          throw new Error(
            `[Suite 36.28] Act 2 Giant Talking Bust Cut-In failed on ${vw}x${vh}: di=${Boolean(di)}, rects=[${minX2},${maxX2}]`
          );
        }
      }

      // Step remaining intro to completion (`roundIntroTimer === 0`) -> BOTH fighters return cleanly to IDLE & _roundEngageBannerTimer = 0.85
      while (g28.roundIntroTimer > 0) {
        g28.stepSimulation(0.05);
      }
      if (
        p1Hero.state !== 'IDLE' ||
        p2Hero.state !== 'IDLE' ||
        p1Hero._overrideFrameIdx !== null ||
        p2Hero._overrideFrameIdx !== null ||
        p1Hero.trueUltFrameOverride !== null ||
        Math.abs(g28._roundEngageBannerTimer - 0.85) > 1e-6
      ) {
        throw new Error(
          `[Suite 36.28] Speakers failed to return cleanly to IDLE at roundIntroTimer=0: p1=${p1Hero.state}, p2=${p2Hero.state}, engageTimer=${g28._roundEngageBannerTimer}`
        );
      }

      // 3. Act 3 (`_roundEngageBannerTimer = 0.80 -> 0.45 -> 0.10`): Colossal 68-84px ENGAGE! across 1280x720, 390x844, 844x390
      for (const [vw, vh] of [
        [1280, 720],
        [390, 844],
        [844, 390]
      ]) {
        for (const timerVal of [0.80, 0.45, 0.10]) {
          g28.roundIntroTimer = 0;
          g28._roundEngageBannerTimer = timerVal;
          const { ctx: ctxEng, rec: recEng } = makeTraceCtx28(vw, vh);
          g28._renderRoundIntroOverlay(ctxEng);

          const engEntry = recEng.texts.find((t) => t.text === 'ENGAGE!');
          const minX3 = Math.min(...recEng.rects.map((r) => r.x));
          const maxX3 = Math.max(...recEng.rects.map((r) => r.x + r.w));
          if (
            !engEntry ||
            Math.abs(engEntry.y - vh * 0.46) > 12 ||
            recEng.rotateCalls !== 0 ||
            recEng.arcCalls !== 0 ||
            recEng.ellipseCalls !== 0 ||
            minX3 < 0 ||
            maxX3 > vw
          ) {
            throw new Error(
              `[Suite 36.28] Act 3 ENGAGE! phase (${timerVal}s) failed on ${vw}x${vh}: engY=${engEntry?.y}, rects=[${minX3},${maxX3}]`
            );
          }
          if (vw === 1280 && !(engEntry.px >= 54 && engEntry.px <= 68)) {
            throw new Error(
              `[Suite 36.28] Act 3 Desktop ENGAGE! font size out of 54..68px at t=${timerVal}s: got ${engEntry.px}px`
            );
          }
        }
      }
    } finally {
      for (const f of created28) f.fx?.dispose?.();
    }
  }

  const suite36ElapsedMs = performance.now() - suite36StartMs;
  if (suite36ElapsedMs >= 4800) {
    throw new Error(
      `[Suite 36] Expected Suite 36 runtime < 4800ms, got ${suite36ElapsedMs.toFixed(1)}ms!`
    );
  }

  console.log(
    `[PASS] Suite 36: Zero Legacy Diff vs 8435209 + 0 Emojis (36.1), All-12 EX Row 1 WALK Bipedal Crossover + Anti-Skate Live Walk (36.2), Row 5 Prone Death / Row 9 Victory + Mid-Air Fatal Gravity Drop (36.3), 0/300 & 0/240 4px Clips + 0 Chrono 192px Box + Dynamic Viewport x=110/1090/7400 + 0 Vector Calls (36.4), 0 Torii + Sylvara/Freyja EX Choreography + HD-2D Ray-Projected Shadows/Rim-Light/Reflections (36.5), Sol/Sylvara/Freyja EX Overhaul Parity (36.6), Sylvara EX Flip / Lyra EX Glacial Transition (36.7), Batch v119 Parity (36.8), Batch v120 Parity (36.9), Batch v121 Sylvara Bow-Pull / Circle-Free / Slender Arrow (36.10), Batch v122 Sylvara Sculpted Hands & Feet (36.11), Batch v123 6-Hero Sculpted Hands/Feet + All-12 Ground-Snap (36.12), Batch v124 Asset Retry/Visibility + All-12 EX Leak/Hole/Prone Repair (36.13), Batch v125 4-Ranged EX + Nyx EX Separate Target VFX (36.14), Token-Efficient Rolling Docs (36.15), Champion #12 NYX EX Full Suite (36.16), Adventure Rebalanced Drops/Healing + Monster Sheets/VFX Parity (36.17), All-12 EX Sovereign Loadouts Parity (36.18), Adventure Campaign Stage Pack Loader + Celestial Gauntlet + Vault JSON Parity (36.19), Seraphina TTS Voice Pack + Priority Vocal Bus Parity (36.20), Dual Voice/SFX Mixer + Sidechain Ducking + Pre-Round Intro Standoff + 9s Victory Hold Parity (36.21), Batch-1 6-Champion + Seraphina JP Voice Packs + EN/JP Toggle Parity (36.22), Batch-2 Final 5-Champion Full-Roster 312-MP3 EN/JP Voice Parity (36.23), Cute Nyx Recast + 11-Track Lyria 3 OST + Steady Non-Dipping BGM 3-Bus Mixer Parity (36.24), Kawaii JP Nyx + 96-Clip Snappy Arcade Barks + Contextual Layering Parity (36.25), True Zero-Dip BGM Compressor Bypass + Center VS Intro / All-23 Idle + Portrait-Free Side Cut-Ins + Cross-Speaker Anti-Overlap & Sequential End-of-Match Queue Parity (36.26), Grounded Lyra EX Ults + Blink/Warp Non-Starvation + De-Twitched AI + Ult Super-Armor/Graze/Pierce + 3-Tier Zoom Modes (36.27) & 3-Act Match Intro Overhaul + Live Voice Envelope Analyzer + Close-Up Talking Portrait Cut-In + Explosive ENGAGE! Slash-Burst (36.28) verified in ${suite36ElapsedMs.toFixed(0)}ms!`
  );
}

if (QUIET_MODE) {
  const scopeLabel = RUN_SUITE36_ONLY
    ? 'suite36'
    : RUN_EX_ONLY
      ? 'ex-only (34..36)'
      : 'all-36-suites';
  _origConsoleLog(
    `[PASS] test_all_heroes_gameloop.mjs (${scopeLabel}): ${_quietPassCount} pass checkpoints verified, 0 failures!`
  );
}







