globalThis.Image = class MockImage {
  constructor() {
    this.complete = true;
    this.naturalWidth = 6240;
    this.naturalHeight = 1872;
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
import { Fighter } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Fighter.js?v=30fps72';
import { Warrior } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Warrior.js?v=30fps72';
import { FireMage } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/FireMage.js?v=30fps72';
import { Ronin } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Ronin.js?v=30fps72';
import { Valkyrie } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Valkyrie.js?v=30fps72';
import { Reaper } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Reaper.js?v=30fps72';
import { Priestess } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Priestess.js?v=30fps72';
import { Archer } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Archer.js?v=30fps72';
import { Chronomancer } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Chronomancer.js?v=30fps72';
import { Titan } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Titan.js?v=30fps72';
import { IceMage } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/IceMage.js?v=30fps72';
import { Android } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Android.js?v=30fps72';
import { VFXManager } from '/home/antigravity/pandora523/arcane-vs-steel/src/engine/VFXManager.js?v=30fps72';
import { Renderer } from '/home/antigravity/pandora523/arcane-vs-steel/src/engine/Renderer.js?v=30fps72';
import { AudioManager } from '/home/antigravity/pandora523/arcane-vs-steel/src/engine/AudioManager.js?v=30fps72';

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

  const states = ['IDLE', 'WALK', 'AUTO_ATTACK', 'SKILL', 'ULTIMATE', 'DASH', 'CROUCH', 'JUMP'];
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
    for (let i = 0; i < steps; i++) {
      hero.update(1 / 30, dummy, game);
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
    if (name === 'Titan' && st === 'AUTO_ATTACK') {
      // Also verify all 4 normal attack variants cycle through Row 2 sub-ranges (F00..F07, F08..F14, F15..F21, F22..F29)
      const seenRanges = new Set();
      for (let v = 0; v < 4; v++) {
        hero.comboStep = v;
        hero.setState('AUTO_ATTACK');
        for (let k = 0; k < 20; k++) {
          hero.update(1 / 30, dummy, game);
          const fIdx = hero.trueUltFrameOverride;
          if (fIdx >= 60 && fIdx <= 67) seenRanges.add(0);
          else if (fIdx >= 68 && fIdx <= 74) seenRanges.add(1);
          else if (fIdx >= 75 && fIdx <= 81) seenRanges.add(2);
          else if (fIdx >= 82 && fIdx <= 89) seenRanges.add(3);
        }
      }
      if (seenRanges.size < 4) {
        throw new Error(`Expected Titan 4 normal attack variants to cover all 4 Row 2 sub-ranges, got ${[...seenRanges]}`);
      }
      console.log(`  [OK] Titan 4-Variant World-Maul Auto-Attack verified across all 4 Row 2 sub-ranges (F00..F07, F08..F14, F15..F21, F22..F29)`);
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
  console.log(`[PASS] ${name}: all 8 combat states + shader/VFX layers simulated cleanly`);
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
  const { Chronomancer } = await import('/home/antigravity/pandora523/arcane-vs-steel/src/entities/Chronomancer.js?v=30fps72');
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

// 10. Verify Torgar v6 (`Titan`) Full Rework: Molten Crucible Cores, 4-Variant World-Maul Auto + Khazad Ancestor,
//     WORLD-ANVIL CATACLYSM Altar Resonance & Wall-Ricochet Cannonball, WORLD-BREAKER HOME RUN Overdrive (Baseball-Bat
//     Farthest-Wall Knockback + 0.8s Stun), and GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER!
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
      `Unexpected Torgar v6 kit names: skill=${torgar.skillName}, ult=${torgar.ultName}, trueUlt=${torgar.trueUltName}`
    );
  }

  // 10A. Verify 4-Variant Auto Combo ("FOURFOLD ART OF THE WORLD-MAUL"):
  //      Variant 0 spawns Magnetic Fissure Wave & pulls kiting foe inward, Variants 1 & 2 build Crucible Cores, Variant 3 manifests Khazad Ancestor!
  let sawFissureWave = false;
  let sawAncestorInAuto = false;
  torgar.crucibleStacks = 2;
  const foeStartX = 680;
  foe.x = foeStartX;
  for (let c = 0; c < 4; c++) {
    torgar.x = 400;
    if (c > 0) foe.x = 535;
    torgar.setState('AUTO_ATTACK');
    for (let i = 0; i < 27; i++) {
      torgar.update(1 / 30, foe, game);
      if (torgar.fissureWaves.length > 0) sawFissureWave = true;
      if (torgar.ancestorSpiritTimer > 0) sawAncestorInAuto = true;
      if (c === 0 && i === 18 && foe.x >= foeStartX) {
        throw new Error(`Expected Variant-1 Magnetic Fissure Wave to pull kiting foe inward from ${foeStartX}, got x=${foe.x}`);
      }
    }
  }
  if (!sawFissureWave || !sawAncestorInAuto) {
    throw new Error(
      `Torgar v6 Fourfold Art of the World-Maul check failed: fissureWave=${sawFissureWave}, ancestor=${sawAncestorInAuto}`
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

  // 10C. Verify Seismic Anvil Resonance: enemy stands near planted World-Anvil Altar while Torgar slams Variant-4 Finisher far away!
  torgar.activeAnvil = null;
  torgar.worldAnvilAltar.resonanceCd = 0;
  torgar.worldAnvilAltar.pulseTimer = 9.0;
  foe.x = torgar.worldAnvilAltar.x + 40;
  const hpBeforeResonance = foe.hp;
  torgar.x = 220; // Far away (>600px) from foe & Altar!
  torgar.facing = -1;
  torgar.comboStep = 3; // Variant-4 World-Breaker Overhead Finisher
  torgar.setState('AUTO_ATTACK');
  for (let i = 0; i < 24; i++) {
    torgar.update(1 / 30, foe, game);
  }
  const resonanceDmg = hpBeforeResonance - foe.hp;
  if (resonanceDmg <= 0) {
    throw new Error(
      `Expected Variant-4 World-Breaker Slam to detonate Seismic Resonance on distant World-Anvil Altar! hp=${foe.hp} vs ${hpBeforeResonance}`
    );
  }

  // 10C.2 Verify WORLD-BREAKER HOME RUN Overdrive (`state === 'ULTIMATE'`):
  //       Uses hammer like a baseball bat, hits enemy to the FARTHEST side of the stage, and stuns them for 0.8s!
  //       Case 1: Enemy at x=340 (closer to left wall 82 -> farthest side is right wall 1118)
  torgar.x = 260;
  foe.x = 340;
  foe.stunTimer = 0;
  const hpBeforeHomeRun = foe.hp;
  torgar.setState('ULTIMATE');
  let stunnedAtRightWall = false;
  for (let i = 0; i < 46; i++) {
    torgar.update(1 / 30, foe, game);
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
  for (let i = 0; i < 46; i++) {
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

  // 10D. Verify GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER deals 0 micro-ticks in Phase 1-2, then ONE 735-Crit burst at t >= 3.20s + 16% Max HP heal!
  torgar.hp = 1200;
  foe.x = 680;
  foe.hp = 7000;
  foe.stunTimer = 0;
  const torgarUltHits = [];
  const origTake = foe.takeDamage.bind(foe);
  foe.takeDamage = (amt, att, crit, kx, ky) => {
    // Only record hits from Torgar during TRUE_ULTIMATE (ignore any leftover projectiles)
    if (torgar.state === 'TRUE_ULTIMATE') {
      torgarUltHits.push({ t: torgar.stateTimer, amt: Math.round(amt), crit });
    }
    return origTake(amt, att, crit, kx, ky);
  };
  torgar.worldAnvilAltar = null;
  torgar.activeAnvil = null;
  torgar.fissureWaves.length = 0;

  const titanTrack = { rotateCalls: 0, quadCalls: 0, syValues: new Set() };
  const titanCtx = createMockCtx(titanTrack);
  torgar.setState('TRUE_ULTIMATE');
  for (let step = 0; step < 145; step++) {
    const dt = 1 / 30;
    torgar.update(dt, foe, game);
    torgar.drawForegroundOverlay(titanCtx, game.renderer);
    torgar.draw(titanCtx, false, game.renderer);
    torgar.drawUltimateForeground(titanCtx, game.renderer);
    if (game.renderer.trueUltStageOverride !== null || game.renderer.permanentStageOverride !== null) {
      throw new Error('Torgar v6 TRUE_ULTIMATE must NEVER replace stage background!');
    }
  }
  if (
    torgarUltHits.length !== 1 ||
    torgarUltHits[0].t < 3.19 ||
    torgarUltHits[0].amt < 700 ||
    !torgarUltHits[0].crit
  ) {
    throw new Error(
      `Expected single instantaneous >=700 Crit Continental Sunder burst at t >= 3.20s, got ${JSON.stringify(torgarUltHits)}`
    );
  }
  if (torgar.hp <= 1200 || titanTrack.rotateCalls > 0 || titanTrack.quadCalls > 0) {
    throw new Error(
      `Torgar v6 post-ult check failed: hp=${torgar.hp}, rotateCalls=${titanTrack.rotateCalls}, quadCalls=${titanTrack.quadCalls}`
    );
  }
  console.log(
    `[PASS] Torgar v6 Full Rework: 4-Variant World-Maul Auto + Khazad Ancestor, World-Anvil Altar Resonance (-${resonanceDmg} dmg) & Wall-Ricochet, WORLD-BREAKER HOME RUN (Baseball-Bat Farthest-Wall Knockback + 0.8s Stun), and SINGLE ${torgarUltHits[0].amt}-Crit Continental Sunder at t=${torgarUltHits[0].t.toFixed(2)}s!`
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

  // 13A. Verify 3-Variant Royal Ballet Auto-Attack (F00..F09 Comet, F10..F19 Snowflake Chakram, F20..F29 3-Spire March)
  const seenAutoSubRanges = [false, false, false];
  let sawChakram = false;
  let sawMarchingSpire = false;
  for (let v = 0; v < 3; v++) {
    lyra.x = 380;
    foe.x = 660;
    lyra.setState('AUTO_ATTACK');
    for (let f = 0; f < 25; f++) {
      lyra.update(1 / 30, foe, game);
      if (lyra.trueUltFrameOverride !== null) {
        const sub = Math.floor((lyra.trueUltFrameOverride - 60) / 10);
        if (sub >= 0 && sub <= 2) seenAutoSubRanges[sub] = true;
      }
      if (lyra.activeChakrams.length > 0) sawChakram = true;
      if (lyra.activeMarchingSpires.length > 0) sawMarchingSpire = true;
      lyra.drawForegroundOverlay(lyraCtx, game.renderer);
      lyra.draw(lyraCtx, false, game.renderer);
      lyra.drawUltimateForeground(lyraCtx, game.renderer);
    }
  }
  if (!seenAutoSubRanges.every(Boolean) || !sawChakram || !sawMarchingSpire) {
    throw new Error(
      `Lyra v6 3-Variant Auto failed: ranges=${JSON.stringify(seenAutoSubRanges)}, chakram=${sawChakram}, spires=${sawMarchingSpire}`
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

  // 13D. Verify Signature Skill: Glacial Jaws Twin Iceberg Crush (spread 136 -> 16)
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
  if (maxJawSpread < 120 || minJawSpread > 24 || jawsDmg < 70) {
    throw new Error(
      `Lyra v6 Glacial Jaws failed: maxSpread=${maxJawSpread}, minSpread=${minJawSpread}, dmg=${jawsDmg}`
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
    `[PASS] Lyra v6 Full Rework: 3-Variant Royal Ballet (Comet/Chakram/3-Spire March), 4-Stack Solid Crystal Freeze (${foe.stunTimer.toFixed(2)}s), 3-Step Sky-Stair, Glacial Jaws (-${Math.round(jawsDmg)} dmg), 7-Sword Winter Coronation (-${Math.round(coronationDmg)} dmg), & Polar Night 28-Shard Reality Shatter (-${Math.round(trueUltDmg)} Crit, 0 ctx.rotate)!`
  );
}




