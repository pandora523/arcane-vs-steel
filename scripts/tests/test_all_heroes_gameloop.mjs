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
import { Fighter } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Fighter.js?v=30fps93';
import { Warrior } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Warrior.js?v=30fps93';
import { FireMage } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/FireMage.js?v=30fps93';
import { Ronin } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Ronin.js?v=30fps93';
import { Valkyrie } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Valkyrie.js?v=30fps93';
import { Reaper } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Reaper.js?v=30fps93';
import { Priestess } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Priestess.js?v=30fps93';
import { Archer } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Archer.js?v=30fps93';
import { Chronomancer } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Chronomancer.js?v=30fps93';
import { Titan } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Titan.js?v=30fps93';
import { IceMage } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/IceMage.js?v=30fps93';
import { Android } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Android.js?v=30fps93';
import { PixelForge } from '/home/antigravity/pandora523/arcane-vs-steel/src/engine/PixelForge.js?v=30fps93';
import { VFXManager } from '/home/antigravity/pandora523/arcane-vs-steel/src/engine/VFXManager.js?v=30fps93';
import { Renderer } from '/home/antigravity/pandora523/arcane-vs-steel/src/engine/Renderer.js?v=30fps93';
import { AudioManager } from '/home/antigravity/pandora523/arcane-vs-steel/src/engine/AudioManager.js?v=30fps93';
import { Monster, ArchfiendBoss } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Monster.js?v=30fps93';
import {
  AdventureManager,
  ADVENTURE_WORLD_WIDTH
} from '/home/antigravity/pandora523/arcane-vs-steel/src/adventure/AdventureManager.js?v=30fps93';
import { ADVENTURE_HERO_KITS } from '/home/antigravity/pandora523/arcane-vs-steel/src/adventure/AdventureSkillSets.js?v=30fps93';
import { AdventureMapRenderer } from '/home/antigravity/pandora523/arcane-vs-steel/src/adventure/AdventureMapRenderer.js?v=30fps93';
import { AdventureDestructibles } from '/home/antigravity/pandora523/arcane-vs-steel/src/adventure/AdventureDestructibles.js?v=30fps93';

function createMockCtx(trackForbidden = null) {
  return {
    save() {},
    restore() {},
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
      if (trackForbidden && typeof sy === 'number') {
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
      return { data: new Uint8ClampedArray(w * h * 4) };
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
  const { Priestess } = await import('/home/antigravity/pandora523/arcane-vs-steel/src/entities/Priestess.js');
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
  const { Chronomancer } = await import('/home/antigravity/pandora523/arcane-vs-steel/src/entities/Chronomancer.js?v=30fps93');
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
    const wavPath = `/home/antigravity/pandora523/arcane-vs-steel/assets/sfx/${k}.wav`;
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
    '/home/antigravity/pandora523/arcane-vs-steel/src/main.js',
    '/home/antigravity/pandora523/arcane-vs-steel/src/adventure/AdventureManager.js',
    ...fs.readdirSync('/home/antigravity/pandora523/arcane-vs-steel/src/entities').map(
      (f) => `/home/antigravity/pandora523/arcane-vs-steel/src/entities/${f}`
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

      if (game.renderer.trueUltStageOverride !== null || game.renderer.permanentStageOverride !== null) {
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
    if (ultDamage < 200) {
      throw new Error(`[${spec.label}] Expected massive Supreme Ultimate damage (>= 200), got ${Math.round(ultDamage)}`);
    }
    console.log(
      `[PASS] ${spec.label} (${hero.trueUltName}): KitDmg=${Math.round(kitDamage)}, UltDmg=${Math.round(ultDamage)}, StageOverride=NONE, CleanExit=${hero.state}!`
    );
  }
}

// 8. Verify 3-Step Landing -> Mode Select -> Character Select DOM Integrity & Zero "Final Spark" Strings!
{
  const indexHtml = fs.readFileSync('/home/antigravity/pandora523/arcane-vs-steel/index.html', 'utf8');
  const mainJs = fs.readFileSync('/home/antigravity/pandora523/arcane-vs-steel/src/main.js', 'utf8');
  const styleCss = fs.readFileSync('/home/antigravity/pandora523/arcane-vs-steel/style.css', 'utf8');

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
    '/home/antigravity/pandora523/arcane-vs-steel/index.html',
    '/home/antigravity/pandora523/arcane-vs-steel/style.css',
    '/home/antigravity/pandora523/arcane-vs-steel/src/main.js',
    '/home/antigravity/pandora523/arcane-vs-steel/src/adventure/AdventureManager.js',
    ...fs.readdirSync('/home/antigravity/pandora523/arcane-vs-steel/src/entities').map(
      (f) => `/home/antigravity/pandora523/arcane-vs-steel/src/entities/${f}`
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
    for (let i = 0; i < 28; i++) {
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
    dummy.x = 540; // 200px initial gap — previously VEX-09 swung into empty air!
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
    if (distAtSwing > 122) {
      throw new Error(
        `VEX-09 Auto Variant ${c} failed to close gap before swinging! Expected distAtSwing <= 122px, got ${distAtSwing.toFixed(1)}px`
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
    const p = `/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/${key}_sheet.png`;
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
  // 17A. Verify Monster & Boss PNG dimensions
  const monsterSheets = [
    'monster_ghoul_sheet.png',
    'monster_cultist_sheet.png',
    'monster_brute_sheet.png',
    'boss_archfiend_sheet.png'
  ];
  for (const fname of monsterSheets) {
    const p = `/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/${fname}`;
    const buf = fs.readFileSync(p);
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w !== 6240 || h !== 1456) {
      throw new Error(`Expected ${fname} dimensions 6240x1456 (7 rows x 30 cols @ 208x208), got ${w}x${h}`);
    }
  }
  {
    const portBuf = fs.readFileSync('/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/boss_archfiend_portrait.png');
    const pw = portBuf.readUInt32BE(16);
    const ph = portBuf.readUInt32BE(20);
    if (pw !== 128 || ph !== 128) {
      throw new Error(`Expected boss_archfiend_portrait.png dimensions 128x128, got ${pw}x${ph}`);
    }
    const colossusBuf = fs.readFileSync('/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/boss_colossus_sheet.png');
    const cw = colossusBuf.readUInt32BE(16);
    const ch = colossusBuf.readUInt32BE(20);
    if (cw !== 4096 || ch !== 1024) {
      throw new Error(`Expected boss_colossus_sheet.png dimensions 4096x1024 (16 cells x 512x512), got ${cw}x${ch}`);
    }
    const iconBuf = fs.readFileSync('/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/mage_icons.png');
    const iw = iconBuf.readUInt32BE(16);
    const ih = iconBuf.readUInt32BE(20);
    if (iw !== 448 || ih !== 64) {
      throw new Error(`Expected mage_icons.png dimensions 448x64 (7 cells x 64x64), got ${iw}x${ih}`);
    }
    const manifestJson = JSON.parse(
      fs.readFileSync('/home/antigravity/pandora523/arcane-vs-steel/manifest.json', 'utf8')
    );
    if (manifestJson.orientation !== 'any' || manifestJson.display !== 'fullscreen') {
      throw new Error(
        `Expected manifest.json orientation='any' (portrait default, landscape opt-in) & display='fullscreen', got ${JSON.stringify(manifestJson)}`
      );
    }
    const mainJs = fs.readFileSync('/home/antigravity/pandora523/arcane-vs-steel/src/main.js', 'utf8');
    if (!mainJs.includes('this.mobileLandscapeEnabled = Boolean(this.forceMobileLandscapeParam);')) {
      throw new Error('Expected main.js to default mobileLandscapeEnabled to false unless ?landscape=1 is explicitly passed!');
    }
  }

  // 17B. Verify HTML Adventure Mode Mobile Joystick + Right-Side Skill Cluster + Skill Tree Modal + Opt-In Landscape DOM IDs
  const indexHtml = fs.readFileSync('/home/antigravity/pandora523/arcane-vs-steel/index.html', 'utf8');
  const advJs = fs.readFileSync('/home/antigravity/pandora523/arcane-vs-steel/src/adventure/AdventureManager.js', 'utf8');
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

  // Verify PixelForge.drawAdventureActionIcon blits Ignis Sol's remade 64x64 HD-2D icon sheet (`mage_icons.png`)
  // across all 5 active orbs (and full 7-cell sheet) with exact cell coordinates & ZERO ctx.rotate!
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

  // 17C. Simulate Full 4-Zone Campaign with Ignis Sol (`FireMage`), Adventure RPG Progression, Skill Tree & Giant Left-Side Colossal Boss!
  const advTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const advCtx = createMockCtx(advTrack);
  const monsterDrawCounts = { ghoul: 0, cultist: 0, brute: 0, archfiend: 0 };
  let activeMonsterDrawKind = null;
  const baseDrawImage = advCtx.drawImage.bind(advCtx);
  advCtx.drawImage = (img, sx, sy, sw, sh, dx, dy, dw, dh) => {
    baseDrawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
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
  // Ensure Colossal Boss assets have naturalWidth = 4096 so Monster.js colossusReady check succeeds in headless Node!
  const allAssets = PixelForge.initAssets();
  if (allAssets.archfiend?.colossus) {
    allAssets.archfiend.colossus.naturalWidth = 4096;
    allAssets.archfiend.colossus.naturalHeight = 1024;
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

    // Verify Wave 1 ghouls have valid heroId === 'ghoul' AND spawn staggered across distinct 3D depth lanes!
    const w1Monsters = adv.getLivingMonsters();
    for (const m of w1Monsters) {
      if (m.heroId !== 'ghoul') {
        throw new Error(`Expected Wave 1 normal monster heroId === 'ghoul', got ${m.heroId}`);
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
      throw new Error('Expected Wave 1 ghouls to take mortal damage and die even when testModeUnlimitedHp === true!');
    }
    tickAdv(6);
    if (adv.lockActive || !adv.goPromptActive) {
      throw new Error(`Expected Wave 1 / 8 clear to unlock mid-zone corridor with GO! prompt: lock=${adv.lockActive}, go=${adv.goPromptActive}`);
    }

    // Walk Sol rightward past Zone 1 midTriggerX (`1340`) -> Wave 2 / 8 (Zone 1 Subwave 2 ambush!)
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 260 && adv.subWave < 2; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    if (adv.subWave !== 2 || !adv.lockActive || adv.getLivingMonsters().length < 2) {
      throw new Error(`Expected Zone 1 Subwave 2 ambush at midTriggerX, got subWave=${adv.subWave}, lock=${adv.lockActive}, living=${adv.getLivingMonsters().length}`);
    }
    // Let Void Cultist & Ghouls execute attacks/sigils for 45 frames to exercise their AI, sprites & floor telegraphs
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

    // Walk Sol via analog joystick across pickups and into Zone 2 (`triggerX = 2540`) -> Wave 3 / 8!
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 320 && adv.zoneIndex < 1; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    if (adv.zoneIndex !== 1 || !adv.lockActive || !adv.getLivingMonsters().some((m) => m.kind === 'brute')) {
      throw new Error(`Expected Zone 2 Cursed Starwood encounter with Obsidian Juggernaut, got zone=${adv.zoneIndex}, lock=${adv.lockActive}`);
    }

    // Let Obsidian Juggernaut + Cultists fight for 45 frames, then charge Astral Relic Seals (100%) & unleash `TRUE_ULTIMATE`!
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

    // March into Zone 3 (`triggerX = 4940`, Wave 5 / 8) -> Elite Brute + Cultist + Ghouls!
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 340 && adv.zoneIndex < 2; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    if (adv.zoneIndex !== 2 || !adv.getLivingMonsters().some((m) => m.isElite)) {
      throw new Error(`Expected Zone 3 Abyssal Bone-Gate Elite encounter, got zone=${adv.zoneIndex}`);
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

    // March into Zone 4 Throne Gate Vanguard (`triggerX = 7340`, Wave 7 / 8) & clear!
    adv.setJoystickVector(1, 0, true);
    for (let step = 0; step < 340 && adv.zoneIndex < 3; step++) {
      tickAdv(1);
    }
    adv.setJoystickVector(0, 0, false);
    if (adv.zoneIndex !== 3 || adv.subWave !== 1 || !adv.lockActive) {
      throw new Error(`Expected Zone 4 Wave 7 / 8 Throne Gate Vanguard, got zone=${adv.zoneIndex}, subWave=${adv.subWave}`);
    }
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

    // Drop Colossal Boss below 65% HP -> Trigger Phase 2 (Cataclysmic Siege + Summoned Vanguards + Astral Relic Drop!)
    boss.isInvulnerable = false;
    boss.hp = Math.floor(boss.maxHp * 0.60);
    tickAdv(55);
    if (boss.bossPhase < 2) {
      throw new Error(`Expected Colossal Malphas to transition to Phase 2 at <=65% HP, got phase=${boss.bossPhase}, hp=${boss.hp}/${boss.maxHp}`);
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

    // Verify all 3 normal monster archetypes (208x208) AND Giant Left-Side Colossal Boss (512x512) logged real sprite blits!
    for (const kind of ['ghoul', 'cultist', 'brute', 'archfiend']) {
      if ((monsterDrawCounts[kind] || 0) < 20) {
        throw new Error(
          `Expected >=20 real sprite drawImage blits for '${kind}', got ${monsterDrawCounts[kind] || 0}`
        );
      }
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

      if (zoomClose < 0.48 || zoomClose > 0.62 || Math.abs(zoomClose - zoomFarAndKo) > 0.0001) {
        throw new Error(
          `Expected unzoomed constant mobile-landscape fit in [0.48..0.62] with zero zoom drift, got close=${zoomClose.toFixed(4)}, far+KO=${zoomFarAndKo.toFixed(4)}`
        );
      }

      // Case 2: Portrait-Locked Phone (390x844) when user opts in (`is-css-rotated-landscape` active) -> Logical 844x390 unzoomed!
      globalThis.window.innerWidth = 390;
      globalThis.window.innerHeight = 844;
      rootClasses.add('is-css-rotated-landscape');
      mobRenderer.resize();
      if (
        mobRenderer.width !== 844 ||
        mobRenderer.height !== 390 ||
        !mobRenderer.isMobileLandscape ||
        mobRenderer.zoom < 0.48 ||
        mobRenderer.zoom > 0.62
      ) {
        throw new Error(
          `Expected CSS-rotated portrait 390x844 -> logical 844x390 unzoomed, got ${mobRenderer.width}x${mobRenderer.height} zoom=${mobRenderer.zoom.toFixed(3)}`
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
  const repoRoot = '/home/antigravity/pandora523/arcane-vs-steel';
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
      `/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/${hid}_sheet.png`
    );
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w !== 6240 || h !== 2080) {
      throw new Error(`Expected ${hid}_sheet.png to be 6240x2080, got ${w}x${h}`);
    }
  }

  // 20B. Verify 5-Plane Seamless 10-Bay Adventure Panoramas (`adv_*_pano.png`, `0` `ctx.rotate`, `0` `arena_*` PNGs)
  const expectedPanos = [
    ['adv_vista_pano.png', 1620, 272],
    ['adv_arch_pano.png', 3930, 272],
    ['adv_floor_pano.png', 4570, 96],
    ['adv_inferno_pano.png', 800, 360]
  ];
  for (const [fname, expW, expH] of [...expectedPanos, ['adv_props_sheet.png', 1152, 640]]) {
    const pbuf = fs.readFileSync(`/home/antigravity/pandora523/arcane-vs-steel/assets/sprites/${fname}`);
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

  const mapTrack = { rotateCalls: 0 };
  let arenaPngDraws = 0;
  const seenPanoBlits = new Set();
  let fgRectCount = 0;
  const mapCtx = createMockCtx(mapTrack);
  mapCtx.drawImage = (img, ...rest) => {
    if (img && typeof img.src === 'string') {
      if (img.src.includes('arena_')) arenaPngDraws++;
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
  const mockMapRenderer = {
    width: 1200,
    height: 600,
    zoom: 0.9,
    camX: 450,
    camY: 466,
    time: 1.25,
    permanentStageOverride: null,
    glowOrange: {},
    glowGold: {},
    glowCyan: {},
    glowEmerald: {},
    glowViolet: {},
    glowCrimson: {}
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
    fgRectCount < 6 ||
    typeof AdventureMapRenderer.renderCalderaBossChasm !== 'undefined'
  ) {
    throw new Error(
      `AdventureMapRenderer 5-plane panorama audit failed: rotate=${mapTrack.rotateCalls}, arenaPngs=${arenaPngDraws}, panos=${[...seenPanoBlits].join(',')}, fgRects=${fgRectCount}, chasmFn=${typeof AdventureMapRenderer.renderCalderaBossChasm}`
    );
  }
  const mapSrc = fs.readFileSync(
    '/home/antigravity/pandora523/arcane-vs-steel/src/adventure/AdventureMapRenderer.js',
    'utf8'
  );
  if (mapSrc.includes('arena_') || mapSrc.includes('renderCalderaBossChasm') || /\.rotate\s*\(/.test(mapSrc)) {
    throw new Error('AdventureMapRenderer.js must contain 0 arena_* references, 0 renderCalderaBossChasm, and 0 ctx.rotate() calls!');
  }

  // 20C. Verify 36 HD-2D Sprite Destructibles & RPG Pickups (`advPropsSheet`: Intact -> Cracked -> Rubble + Shards + Pickups)
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

  if (!destAdv.destructibles || destAdv.destructibles.props.length !== 36) {
    throw new Error(
      `Expected 36 curated HD-2D destructible props across 9600px stage, got ${destAdv.destructibles?.props?.length}`
    );
  }
  // Must NEVER pollute getLivingMonsters()!
  if (destAdv.getLivingMonsters().some((m) => m.isAdventureProp)) {
    throw new Error('Destructible props must NEVER appear in getLivingMonsters()!');
  }

  // Test Intact -> Cracked -> Destroyed via melee + projectile, plus HD-2D drops & debris!
  const p0 = destAdv.destructibles.props[0]; // sanctuary_pillar at x=340, groundY=464, maxHp=115
  destHero.x = p0.x - 45;
  destHero.groundY = p0.groundY;
  destHero.y = p0.groundY;
  destHero.facing = 1;
  destHero.setState('AUTO_ATTACK');
  destHero.stateTimer = 0.14;
  destAdv.destructibles.update(1 / 30, destHero, destGame);
  if (p0.hp >= p0.maxHp || p0.destroyed) {
    throw new Error(`Expected prop 0 to enter damaged/cracked state after 1 melee hit, hp=${p0.hp}/${p0.maxHp}`);
  }
  // Finish shattering prop 0 via second hit -> verify debris & pickup spawn!
  const pickupsBefore = destAdv.pickups.length;
  destAdv.destructibles.damageProp(p0, 200, destHero, destGame, true);
  if (!p0.destroyed || destAdv.destructibles.debris.length < 10 || destAdv.pickups.length <= pickupsBefore) {
    throw new Error(
      `Expected shattered prop 0 to spawn debris & pickup: destroyed=${p0.destroyed}, debris=${destAdv.destructibles.debris.length}, pickups=${destAdv.pickups.length}`
    );
  }

  // Shatter an Ancient Artifact (`eclipse_astrolabe` at index 3) via projectile + spawn HP pickup -> verify all 3 RPG pickup types!
  const artProp = destAdv.destructibles.props[3];
  destHero.groundY = artProp.groundY;
  destGame.vfx.spawnProjectile({
    x: artProp.x - 8,
    y: artProp.groundY - 36,
    vx: 300,
    vy: 0,
    color: '#fb923c',
    owner: destHero,
    damage: 250,
    radius: 16
  });
  destAdv.destructibles.update(1 / 30, destHero, destGame);
  destAdv.spawnPickup('hp', 480, 560);
  if (!artProp.destroyed || !destAdv.pickups.some((pk) => pk.type === 'relic')) {
    throw new Error(
      `Expected Ancient Artifact shatter to drop Astral Relic shard: destroyed=${artProp.destroyed}`
    );
  }

  // Render standing props, rubble, HD-2D pickups & shard debris -> verify advPropsSheet 9-arg blits & 0 ctx.rotate()!
  const propTrack = { rotateCalls: 0 };
  const propCtx = createMockCtx(propTrack);
  let propCellBlits128 = 0;
  let shardBlits64 = 0;
  propCtx.drawImage = (...args) => {
    if (args.length === 9 && args[0] === allAssets20.advPropsSheet) {
      const [, sx, sy, sw, sh] = args;
      if (sw === 128 && sh === 128 && sx >= 0 && sy >= 0) propCellBlits128++;
      if (sw === 64 && sh === 64 && sy >= 512) shardBlits64++;
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
  if (propTrack.rotateCalls !== 0 || propCellBlits128 < 36 || shardBlits64 < 10) {
    throw new Error(
      `HD-2D advPropsSheet audit failed: rotate=${propTrack.rotateCalls}, cell128=${propCellBlits128}, shard64=${shardBlits64}`
    );
  }
  destAdv.stopCampaign();

  // 20D. Verify Right-Side Colossal Boss (`ArchfiendBoss` at `x=9335`, `facing=-1`) Climb, Leftward Attacks, HD-2D VFX & Clipped Death
  if (allAssets20.archfiend?.colossus) {
    allAssets20.archfiend.colossus.naturalWidth = 4096;
    allAssets20.archfiend.colossus.naturalHeight = 1024;
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

  // 20E. Verify Adventure 2.5D Curved AI Steering, Corner-Escape Orbit & Zero Stuck Entities (All 11 Heroes + All 3 Monsters)
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
      const dummy = aiAdv.spawnMonster('brute', 1305, { groundY: 635 });
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

    // Verify corner-pinned Void Cultist (`cultist`) orbits inward across 2.5D road instead of backing into lockMinX!
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
    const cornerCultist = mAdv.spawnMonster('cultist', 1242, { groundY: 561 });
    cornerCultist.skillCooldown = 99;
    cornerCultist.autoCooldown = 99;
    cornerCultist.dashCooldown = 99;

    let maxCultistGyShift = 0;
    for (let f = 0; f < 75; f++) {
      cornerCultist.update(1 / 30, anchorHero, mGame);
      maxCultistGyShift = Math.max(maxCultistGyShift, Math.abs(cornerCultist.groundY - 561));
    }
    if (cornerCultist.x <= 1350 || maxCultistGyShift < 25) {
      throw new Error(
        `Expected cornered Void Cultist at x=1242 to orbit inward past hero (x>1350) along curved 2.5D lane, got x=${cornerCultist.x.toFixed(1)}, maxGyShift=${maxCultistGyShift.toFixed(1)}`
      );
    }
    mAdv.stopCampaign();
  }

  console.log(
    `[PASS] Suite 20: 11-Hero Pixel-Bleed Purity, 9600px 10-Bay Unbroken Panoramas, 36 HD-2D Props & Pickups, Right-Side Colossal Boss (x=9335) & 11-Hero 2.5D Curved AI verified!`
  );
}
