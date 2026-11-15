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
  parseAvsvPackHeader,
  decryptAvsvPack,
  unpackCodeVaultPayload,
  extractMasterKeyFromBootScript
} from '../../build/build_web_vault.mjs';
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/\/$/, '');
import { Fighter } from '../../src/entities/Fighter.js?v=30fps112';
import { Warrior } from '../../src/entities/Warrior.js?v=30fps112';
import { FireMage } from '../../src/entities/FireMage.js?v=30fps112';
import { Ronin } from '../../src/entities/Ronin.js?v=30fps112';
import { Valkyrie } from '../../src/entities/Valkyrie.js?v=30fps112';
import { Reaper } from '../../src/entities/Reaper.js?v=30fps112';
import { Priestess } from '../../src/entities/Priestess.js?v=30fps112';
import { Archer } from '../../src/entities/Archer.js?v=30fps112';
import { Chronomancer } from '../../src/entities/Chronomancer.js?v=30fps112';
import { Titan } from '../../src/entities/Titan.js?v=30fps112';
import { IceMage } from '../../src/entities/IceMage.js?v=30fps112';
import { Android } from '../../src/entities/Android.js?v=30fps112';
import { PixelForge } from '../../src/engine/PixelForge.js?v=30fps112';
import { ArcaneShaderFX } from '../../src/engine/ArcaneShaderFX.js?v=30fps112';
import { VFXManager } from '../../src/engine/VFXManager.js?v=30fps112';
import { Renderer } from '../../src/engine/Renderer.js?v=30fps112';
import { AudioManager } from '../../src/engine/AudioManager.js?v=30fps112';
import { Game } from '../../src/main.js?v=30fps112';
import { Monster, ArchfiendBoss } from '../../src/entities/Monster.js?v=30fps112';
import {
  AdventureManager,
  ADVENTURE_WORLD_WIDTH
} from '../../src/adventure/AdventureManager.js?v=30fps112';
import { ADVENTURE_HERO_KITS } from '../../src/adventure/AdventureSkillSets.js?v=30fps112';
import {
  ADVENTURE_SKILL_TREE,
  HERO_SKILL_TREE_THEMES,
  getHeroSkillTreeTheme
} from '../../src/adventure/AdventureProgression.js?v=30fps112';
import { AdventureMapRenderer } from '../../src/adventure/AdventureMapRenderer.js?v=30fps112';
import {
  AdventureDestructibles,
  getOrBakeOrthogonalPropsSheet
} from '../../src/adventure/AdventureDestructibles.js?v=30fps112';

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
      if (sera.isInvulnerable && sera.groundY - sera.y >= 58) sawInvulnFlight = true;
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
  const { Chronomancer } = await import('../../src/entities/Chronomancer.js?v=30fps112');
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
    a.game = game;
    b.game = game;
    for (let step = 0; step < 540; step++) {
      a.update(1 / 30, b, game);
      b.update(1 / 30, a, game);
      game.vfx.update(1 / 30, 460, game.renderer, game.audio);
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
    if (hiw !== 384 || hih !== 704) {
      throw new Error(`Expected hero_icons_sheet.png dimensions 384x704 (6 cols x 11 rows @ 64x64), got ${hiw}x${hih}`);
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
    ['android', 9]
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
    ['hero_icons_sheet.png', 384, 704]
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

  // Verify controlled campaign-wide drop economy: smashing ALL 20 monuments across 9600px yields strictly 8 single-item pickups (4 relic + 4 hp)!
  destAdv.pickups.length = 0;
  destAdv.destructibles.resetForCampaign();
  for (const mp of destAdv.destructibles.props) {
    destAdv.destructibles.damageProp(mp, 999, destHero, destGame, true);
  }
  const relicDrops = destAdv.pickups.filter((pk) => pk.type === 'relic').length;
  const hpDrops = destAdv.pickups.filter((pk) => pk.type === 'hp').length;
  if (destAdv.pickups.length !== 8 || relicDrops !== 4 || hpDrops !== 4) {
    throw new Error(
      `Expected smashing all 20 monuments to spawn strictly 8 pickups (4 relic + 4 hp), got total=${destAdv.pickups.length} (relic=${relicDrops}, hp=${hpDrops})`
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
      if (seenWrathTitles.size !== 11 || stTrack.rotateCalls !== 0) {
        throw new Error(
          `[Suite 24C] Expected 11 distinct champion Branch-I themes and 0 ctx.rotate, got distinct=${seenWrathTitles.size}, rotate=${stTrack.rotateCalls}`
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
      (m) => !m[0].includes('loading="lazy"') || !m[0].includes('decoding="async"')
    )
  ) {
    throw new Error(
      `[Suite 28A] Expected all 6 stage gallery <img> tags to carry loading="lazy" decoding="async", found ${stageImgMatches.length}`
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
          if (Math.abs(r - 1.0) < 0.01 && Math.abs(tx - 195) < 4 && sy >= 18) {
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

      const leakedPlainFiles = allDistFiles.filter((rel) => /\.(png|wav|ttf|css)$/i.test(rel));
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
        typeof codeVault.css !== 'string' ||
        codeVault.css.length < 10000
      ) {
        throw new Error('[Suite 32.2] Decrypted code+style vault missing expected modules or CSS!');
      }

      const assetEntries = Object.entries(codeVault.assets || {});
      let pngVerified = 0;
      let wavVerified = 0;
      let ttfVerified = 0;
      for (const [relAsset, [packId]] of assetEntries) {
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
      }
      if (pngVerified < 65 || wavVerified < 65 || ttfVerified < 1) {
        throw new Error(
          `[Suite 32.2] Unexpected asset counts in AVSV vault: png=${pngVerified}, wav=${wavVerified}, ttf=${ttfVerified}`
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

  const suite32ElapsedMs = performance.now() - suite32StartMs;
  if (suite32ElapsedMs >= 3000) {
    throw new Error(`[Suite 32] Expected Suite 32 runtime < 3000ms, got ${suite32ElapsedMs.toFixed(1)}ms!`);
  }

  console.log(
    `[PASS] Suite 32: Pre-Change Fallback Backup Snapshot, Web/Vercel AES-256-GCM AVSV Vault (0 plain assets, 100% SHA-256 lossless) & Apple CryptoKit AVSK sanctum.pak + Per-Launch 403 Token verified in ${suite32ElapsedMs.toFixed(0)}ms!`
  );
}





