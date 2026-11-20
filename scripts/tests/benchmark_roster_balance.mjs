import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const noop = () => {};

function createMockCtx() {
  return {
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    setTransform: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    closePath: noop,
    stroke: noop,
    fill: noop,
    arc: noop,
    ellipse: noop,
    rect: noop,
    clip: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    drawImage: noop,
    fillText: noop,
    strokeText: noop,
    setLineDash: noop,
    measureText: () => ({ width: 20 }),
    createRadialGradient() {
      return { addColorStop: noop };
    },
    createLinearGradient() {
      return { addColorStop: noop };
    },
    getImageData(_x, _y, w, h) {
      return { data: new Uint8ClampedArray(w * h * 4) };
    },
    putImageData: noop,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: false,
    fillStyle: '#fff',
    strokeStyle: '#fff',
    lineWidth: 1,
    lineDashOffset: 0
  };
}

function installHeadlessGlobals() {
  globalThis.Image = class MockImage {
    constructor() {
      this.complete = true;
      this.naturalWidth = 6400;
      this.naturalHeight = 3072;
      this.src = '';
    }
    addEventListener() {}
    removeEventListener() {}
  };

  const makeClassList = () => ({
    add: noop,
    remove: noop,
    toggle: noop,
    contains: () => false
  });

  const mockStorage = {
    getItem: () => null,
    setItem: noop,
    removeItem: noop
  };

  globalThis.localStorage = mockStorage;
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = noop;

  globalThis.window = {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    location: { search: '', href: 'http://localhost/' },
    localStorage: mockStorage,
    addEventListener: noop,
    removeEventListener: noop
  };

  globalThis.document = {
    documentElement: {
      classList: makeClassList(),
      style: { setProperty: noop }
    },
    body: {
      classList: makeClassList(),
      style: {},
      appendChild: noop,
      removeChild: noop
    },
    head: { appendChild: noop },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    removeEventListener: noop,
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          width: 256,
          height: 256,
          style: {},
          getContext() {
            return createMockCtx();
          }
        };
      }
      return {
        style: {},
        classList: makeClassList(),
        appendChild: noop,
        addEventListener: noop,
        setAttribute: noop,
        remove: noop
      };
    }
  };
}

installHeadlessGlobals();

const [
  { Fighter },
  { VFXManager },
  { EX_HERO_KEYS, LEGACY_HERO_KEYS, CHAMPION_ROSTER, Game },
  { HeroBuildSystem, SOVEREIGN_BUILD_HERO_IDS, HERO_BUILD_CATALOG }
] = await Promise.all([
  import('../../src/entities/Fighter.js?v=30fps191'),
  import('../../src/engine/VFXManager.js?v=30fps191'),
  import('../../src/main.js?v=30fps191'),
  import('../../src/combat/HeroBuildSystem.js?v=30fps191')
]);

const STAGES = ['cathedral', 'sylvan', 'boneyard', 'clocktower'];
const PERMANENT_STAGE_KEYS = new Set([
  'inferno',
  'glacial',
  'shogunate',
  'sanctuary',
  'cob_monitor',
  'shogunate_inferno',
  'shogunate_glacial',
  'cob_monitor_inferno',
  'cob_monitor_glacial'
]);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRoster(isLegacy) {
  const keys = isLegacy ? LEGACY_HERO_KEYS : EX_HERO_KEYS;
  return keys.map((id) => {
    const cfg = CHAMPION_ROSTER[id];
    if (!cfg || !cfg.cls) {
      throw new Error(`Missing CHAMPION_ROSTER entry for hero "${id}"`);
    }
    return {
      id,
      name: cfg.name,
      Cls: cfg.cls
    };
  });
}

function attachFighterToSim(f, sim, heroId, team, role, isPoint, isBenched, isLegacy) {
  if (!f.heroId) f.heroId = heroId;
  f.game = sim;
  f.team = team;
  f.slotRole = role;
  f.isPoint = isPoint;
  f.isBenched = isBenched;
  f.benchX = team === 1 ? 76 : sim.renderer.worldWidth - 76;
  f.isPlayer = false;
  f.isPlayerControlled = false;
  f.isCPU = true;

  if (typeof f._ensureExParticles === 'function') {
    f._ensureExParticles();
  }
  if (f.fx) {
    f.fx.spawn = noop;
    f.fx.burst = noop;
  }

  // Legacy Reaper.js:431 reads this.severedSoul.x after target.takeDamage inside strikeWithSoulResonance,
  // which can null out severedSoul if a counter-kill clears state. Guard without touching Reaper.js.
  if (isLegacy && heroId === 'reaper') {
    let currentSoul = f.severedSoul ?? null;
    let lastNonNullSoul = null;
    Object.defineProperty(f, 'severedSoul', {
      configurable: true,
      enumerable: true,
      get() {
        return currentSoul || (this._inResonanceEcho ? lastNonNullSoul : null);
      },
      set(val) {
        if (val) lastNonNullSoul = val;
        currentSoul = val;
      }
    });
  }
}

class HeadlessRenderer {
  constructor(stageId, groundY, worldWidth = 1200) {
    this.worldWidth = worldWidth;
    this.groundY = groundY;
    this.stageId = stageId;
    this.hitStopTimer = 0;
    this.trueUltStageOverride = null;
    this.trueUltStageAlpha = 0;
    this.trueUltStageTimer = 0;
    this.permanentStageOverride = null;
    this.stageSliceTimer = 0;
    this.stageSliceFromId = null;
    this.stageSliceToId = null;
    this.glacialWipeTimer = 0;
    this.glacialWipeFromId = null;
    this.cobWipeTimer = 0;
    this.cobWipeFromId = null;
    this.cobAssistTimer = 0;
    this.impactFrameTimer = 0;
    this.whiteoutTimer = 0;
  }

  getActiveStageId() {
    if (this.permanentStageOverride) return this.permanentStageOverride;
    if (this.trueUltStageAlpha > 0.35 && this.trueUltStageOverride) return this.trueUltStageOverride;
    return this.stageId;
  }

  setStageTransformation(stageKey, alpha = 1.0, permanent = false, holdDuration = 0) {
    let resolvedKey = stageKey;
    const isCurShogunate =
      this.permanentStageOverride === 'shogunate' ||
      this.permanentStageOverride === 'shogunate_inferno' ||
      this.permanentStageOverride === 'shogunate_glacial' ||
      this.stageId === 'shogunate' ||
      this.stageId === 'shogunate_inferno' ||
      this.stageId === 'shogunate_glacial';
    const isCurCobMonitor =
      this.permanentStageOverride === 'cob_monitor' ||
      this.permanentStageOverride === 'cob_monitor_inferno' ||
      this.permanentStageOverride === 'cob_monitor_glacial' ||
      this.stageId === 'cob_monitor' ||
      this.stageId === 'cob_monitor_inferno' ||
      this.stageId === 'cob_monitor_glacial';
    const isCurInferno =
      this.permanentStageOverride === 'inferno' ||
      this.permanentStageOverride === 'shogunate_inferno' ||
      this.permanentStageOverride === 'cob_monitor_inferno' ||
      this.trueUltStageOverride === 'inferno' ||
      this.stageId === 'inferno' ||
      this.stageId === 'shogunate_inferno' ||
      this.stageId === 'cob_monitor_inferno';
    const isCurGlacial =
      this.permanentStageOverride === 'glacial' ||
      this.permanentStageOverride === 'shogunate_glacial' ||
      this.permanentStageOverride === 'cob_monitor_glacial' ||
      this.trueUltStageOverride === 'glacial' ||
      this.stageId === 'glacial' ||
      this.stageId === 'shogunate_glacial' ||
      this.stageId === 'cob_monitor_glacial';

    if (resolvedKey === 'inferno' && isCurShogunate) {
      resolvedKey = 'shogunate_inferno';
    } else if (resolvedKey === 'glacial' && isCurShogunate) {
      resolvedKey = 'shogunate_glacial';
    } else if (resolvedKey === 'inferno' && isCurCobMonitor) {
      resolvedKey = 'cob_monitor_inferno';
    } else if (resolvedKey === 'glacial' && isCurCobMonitor) {
      resolvedKey = 'cob_monitor_glacial';
    } else if (resolvedKey === 'shogunate' && isCurInferno) {
      resolvedKey = 'shogunate_inferno';
    } else if (resolvedKey === 'shogunate' && isCurGlacial) {
      resolvedKey = 'shogunate_glacial';
    } else if (resolvedKey === 'cob_monitor' && isCurInferno) {
      resolvedKey = 'cob_monitor_inferno';
    } else if (resolvedKey === 'cob_monitor' && isCurGlacial) {
      resolvedKey = 'cob_monitor_glacial';
    }

    if (permanent && PERMANENT_STAGE_KEYS.has(resolvedKey)) {
      this.permanentStageOverride = resolvedKey;
      this.trueUltStageOverride = resolvedKey;
      this.trueUltStageAlpha = 1.0;
      this.trueUltStageTimer = Math.max(this.trueUltStageTimer, holdDuration);
      return;
    }
    if (!resolvedKey) {
      this.trueUltStageOverride = null;
      this.trueUltStageAlpha = 0;
      this.trueUltStageTimer = 0;
      return;
    }
    this.trueUltStageOverride = resolvedKey;
    this.trueUltStageAlpha = Math.max(0, Math.min(1, alpha));
    if (holdDuration > 0) {
      this.trueUltStageTimer = Math.max(this.trueUltStageTimer, holdDuration);
    }
  }

  setPermanentStageOverride(stageKey) {
    if (stageKey) {
      this.setStageTransformation(stageKey, 1.0, true, 0);
    } else {
      this.permanentStageOverride = null;
    }
  }

  setTrueUltStageOverride(stageKey, alpha = 1.0, holdDuration = 0) {
    this.setStageTransformation(stageKey, alpha, false, holdDuration);
  }

  clearTrueUltStageOverride() {
    this.trueUltStageOverride = null;
    this.trueUltStageAlpha = 0;
    this.trueUltStageTimer = 0;
  }

  triggerDimensionalStageSlice(opts = {}) {
    this.stageSliceFromId = opts.fromStageId || this.getActiveStageId() || this.stageId;
    this.stageSliceToId = opts.toStageId || 'shogunate';
    this.stageSliceTimer = Math.max(0.35, opts.duration || 1.08);
  }

  triggerGlacialStageTransition(opts = {}) {
    this.glacialWipeFromId =
      (typeof opts.fromStageId === 'string' && opts.fromStageId) ||
      this.getActiveStageId() ||
      this.stageId;
    this.glacialWipeTimer = Math.max(0.35, opts.duration || 1.38);
  }

  triggerCobMonitorTransition(opts = {}) {
    this.cobWipeFromId =
      (typeof opts.fromStageId === 'string' && opts.fromStageId) ||
      this.getActiveStageId() ||
      this.stageId;
    this.cobWipeTimer = Math.max(0.35, opts.duration || 1.28);
  }

  triggerCobAssistPulse(_nyxX, _targetX, duration = 0.90) {
    this.cobAssistTimer = Math.max(0.25, duration);
  }

  triggerInfernoStage() {}
  triggerGlacialStage() {}
  triggerShogunateStage() {}
  triggerShake() {}
  triggerAberration() {}
  triggerHitStop() {}
  triggerImpactFrame() {}
  triggerWhiteoutDeletion() {}
  triggerUltimateCamera() {}
  triggerUltimateCutIn() {}
  triggerClashCamera() {}
  triggerStageEvent() {}
  triggerKOFinisher() {}
}

class HeadlessArenaSim {
  constructor(mode = '1v1', stageId = 'cathedral', groundY = 520) {
    this.gameMode = mode;
    this.testModeUnlimitedHp = false;
    this.matchTime = 0;
    this.isMatchOver = false;
    this.winningTeam = 0;
    this.clashCooldown = 0;
    this.stageEventTriggered = false;
    this.stageEventTimer = 0;
    this.stageEventTickTimer = 0;
    this.team1TagCd = 2.4;
    this.team2TagCd = 2.8;
    this.team1AssistCd = 2.8;
    this.team2AssistCd = 3.4;
    this.ultSlowTimer = 0;
    this.koSlowTimer = 0;
    this.userSlowMo = false;

    this.vfx = new VFXManager();
    this.vfx.spawnParticle = noop;
    this.vfx.spawnBurst = noop;
    this.vfx.spawnShockwave = noop;
    this.vfx.spawnGlyphBurst = noop;
    this.vfx.spawnDamageText = noop;
    this.vfx.spawnSpecialCastAura = noop;
    this.vfx.spawnDecal = noop;
    this.vfx.spawnSlash = noop;
    this.vfx.spawnBeam = noop;
    this.vfx.spawnHitImpact = noop;

    this.audio = { play: noop };
    this.hudEls = { left: {}, right: {}, stageBadge: { textContent: '' } };
    this.vsInput = { lastTouchHeroId: null };
    this.syncVsManualControlFlags = noop;
    this.syncVsControlUI = noop;
    this.applySideHUDTheme = noop;
    this.renderer = new HeadlessRenderer(stageId, groundY, 1200);
    this.fighters = [];
  }

  isAdventureMode() {
    return false;
  }

  is2v2Mode() {
    return this.gameMode === '2v2_brawl' || this.gameMode === '2v2_tag';
  }

  triggerUltimateCinematic() {}
  triggerTrueUltimateCinematic() {}

  triggerClashSpark() {
    const f1 = this.getPointFighter(1);
    const f2 = this.getPointFighter(2);
    if (f1 && !f1.isDead) {
      f1.gainMana(10);
      if (f1.stats) f1.stats.clashes++;
    }
    if (f2 && !f2.isDead) {
      f2.gainMana(10);
      if (f2.stats) f2.stats.clashes++;
    }
  }

  onFighterDeath(deadFighter) {
    if (this.isMatchOver) return;
    const survivingAlly = this.getTeammateOf(deadFighter);
    if (survivingAlly && !survivingAlly.isDead) {
      deadFighter.isPoint = false;
      survivingAlly.isPoint = true;
      if (survivingAlly.isBenched) {
        survivingAlly.isBenched = false;
        survivingAlly.x = Math.max(
          130,
          Math.min(this.renderer.worldWidth - 130, deadFighter.x + (survivingAlly.team === 1 ? -40 : 40))
        );
        survivingAlly.y = this.renderer.groundY;
      }
      survivingAlly.heal(Math.round(survivingAlly.maxHp * 0.18), 'AVENGER GRACE');
      survivingAlly.gainMana(48);
      survivingAlly.skillCooldown = 0;
      return;
    }
    this.isMatchOver = true;
    this.winningTeam = deadFighter.team === 1 ? 2 : 1;
  }

  step(dt) {
    if (this.isMatchOver) return;
    this.matchTime += dt;
    if (this.clashCooldown > 0) this.clashCooldown = Math.max(0, this.clashCooldown - dt);
    if (this.team1TagCd > 0) this.team1TagCd = Math.max(0, this.team1TagCd - dt);
    if (this.team2TagCd > 0) this.team2TagCd = Math.max(0, this.team2TagCd - dt);
    if (this.team1AssistCd > 0) this.team1AssistCd = Math.max(0, this.team1AssistCd - dt);
    if (this.team2AssistCd > 0) this.team2AssistCd = Math.max(0, this.team2AssistCd - dt);
    if (this.renderer.trueUltStageTimer > 0) {
      this.renderer.trueUltStageTimer = Math.max(0, this.renderer.trueUltStageTimer - dt);
      if (this.renderer.trueUltStageTimer === 0 && !this.renderer.permanentStageOverride) {
        this.renderer.trueUltStageAlpha = 0;
        this.renderer.trueUltStageOverride = null;
      }
    }

    const activeFighters = this.fighters.filter((f) => f && !f.isDead && !f.isBenched);

    if (
      !this.stageEventTriggered &&
      activeFighters.length >= 2 &&
      (this.matchTime >= 11.5 || activeFighters.some((f) => f.hp / f.maxHp <= 0.58))
    ) {
      this.stageEventTriggered = true;
      this.stageEventTimer = 10.0;
      this.stageEventTickTimer = 0;
    }

    if (this.stageEventTimer > 0) {
      this.stageEventTimer = Math.max(0, this.stageEventTimer - dt);
      this.stageEventTickTimer += dt;
      if (this.stageEventTickTimer >= 2.0) {
        this.stageEventTickTimer = 0;
        const activeStg = this.renderer.getActiveStageId();
        if (activeStg === 'sylvan' || activeStg === 'sanctuary') {
          activeFighters.forEach((f) => f.heal(84, 'STARLIGHT'));
        }
      }
    }

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

    for (const f of this.fighters) {
      if (!f) continue;
      const prevState = f.state;
      const target = this.getTargetFor(f);
      if (f.chronoTimeStopTimer > 0 && !f.isDead && f.state !== 'TRUE_ULTIMATE') {
        Fighter.prototype.update.call(f, dt, target, this);
      } else {
        f.update(dt, target, this);
      }
      if (f.state === 'ULTIMATE' && prevState !== 'ULTIMATE') {
        f._simOverdrives = (f._simOverdrives || 0) + 1;
      }
      if (f.state === 'TRUE_ULTIMATE' && prevState !== 'TRUE_ULTIMATE') {
        f._simTrueUlts = (f._simTrueUlts || 0) + 1;
      }
    }

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
            f1.vx = -155;
            f2.vx = 155;
            this.triggerClashSpark();
            clashed = true;
            break;
          }
        }
      }
    }

    this.updateProjectiles(dt);
    this.vfx.update(dt, this.renderer.groundY, this.renderer, this.audio);
  }
}

HeadlessArenaSim.prototype.getTeamFighters = Game.prototype.getTeamFighters;
HeadlessArenaSim.prototype.getTeammateOf = Game.prototype.getTeammateOf;
HeadlessArenaSim.prototype.getEnemiesOf = Game.prototype.getEnemiesOf;
HeadlessArenaSim.prototype.getTargetFor = Game.prototype.getTargetFor;
HeadlessArenaSim.prototype.getPointFighter = Game.prototype.getPointFighter;
HeadlessArenaSim.prototype.getReserveFighter = Game.prototype.getReserveFighter;
HeadlessArenaSim.prototype.triggerTeamTagSwap = Game.prototype.triggerTeamTagSwap;
HeadlessArenaSim.prototype.triggerTeamAssist = Game.prototype.triggerTeamAssist;
HeadlessArenaSim.prototype.updateProjectiles = Game.prototype.updateProjectiles;

function applySimBuild(f, heroId, buildSpec, isLegacy) {
  if (isLegacy || !buildSpec) return;
  HeroBuildSystem.applyBuildToFighter(
    f,
    HeroBuildSystem.describeConcreteBuild(
      heroId,
      buildSpec.aspect ?? 0,
      buildSpec.skill ?? 0,
      buildSpec.ult ?? 0,
      false
    ),
    false
  );
}

function runDuel(
  ROSTER,
  idx1,
  idx2,
  seed,
  stageId,
  groundY,
  isLegacy,
  p1Build = null,
  p2Build = null,
  tagMeta = null
) {
  const h1 = ROSTER[idx1];
  const h2 = ROSTER[idx2];
  const origRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    const sim = new HeadlessArenaSim('1v1', stageId, groundY);
    const f1 = new h1.Cls(240, groundY, 1);
    const f2 = new h2.Cls(960, groundY, -1);
    attachFighterToSim(f1, sim, h1.id, 1, 'lead', true, false, isLegacy);
    attachFighterToSim(f2, sim, h2.id, 2, 'lead', true, false, isLegacy);
    applySimBuild(f1, h1.id, p1Build, isLegacy);
    applySimBuild(f2, h2.id, p2Build, isLegacy);
    sim.leftFighter = f1;
    sim.rightFighter = f2;
    sim.fighters = [f1, f2];

    const dt = 1 / 30;
    const maxSteps = 180 * 30;
    for (let s = 0; s < maxSteps && !sim.isMatchOver; s++) {
      sim.step(dt);
    }

    let winner = sim.winningTeam;
    let timedOut = false;
    if (!sim.isMatchOver) {
      timedOut = true;
      winner = f1.hp / f1.maxHp >= f2.hp / f2.maxHp ? 1 : 2;
    }
    return {
      type: '1v1',
      idx1,
      idx2,
      duration: sim.matchTime,
      timedOut,
      winner,
      f1Overdrives: f1._simOverdrives || 0,
      f2Overdrives: f2._simOverdrives || 0,
      f1TrueUlts: f1._simTrueUlts || 0,
      f2TrueUlts: f2._simTrueUlts || 0,
      f1Dmg: f1.stats.damageDealt,
      f2Dmg: f2.stats.damageDealt,
      f1Heal: f1.stats.healingDone,
      f2Heal: f2.stats.healingDone,
      tagMeta
    };
  } finally {
    Math.random = origRandom;
  }
}

function run2v2(
  ROSTER,
  mode,
  team1Idx,
  team2Idx,
  seed,
  stageId,
  groundY,
  isLegacy,
  teamBuilds = null,
  tagMeta = null
) {
  const [i0, i1] = team1Idx;
  const [i2, i3] = team2Idx;
  const origRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    const sim = new HeadlessArenaSim(mode, stageId, groundY);
    const isTag = mode === '2v2_tag';
    const h0 = ROSTER[i0];
    const h1 = ROSTER[i1];
    const h2 = ROSTER[i2];
    const h3 = ROSTER[i3];
    const f1 = new h0.Cls(300, groundY, 1);
    const f2 = new h2.Cls(900, groundY, -1);
    const f1b = new h1.Cls(isTag ? 76 : 168, groundY, 1);
    const f2b = new h3.Cls(isTag ? 1124 : 1032, groundY, -1);
    attachFighterToSim(f1, sim, h0.id, 1, 'lead', true, false, isLegacy);
    attachFighterToSim(f2, sim, h2.id, 2, 'lead', true, false, isLegacy);
    attachFighterToSim(f1b, sim, h1.id, 1, 'partner', false, isTag, isLegacy);
    attachFighterToSim(f2b, sim, h3.id, 2, 'partner', false, isTag, isLegacy);
    if (teamBuilds) {
      applySimBuild(f1, h0.id, teamBuilds.p1, isLegacy);
      applySimBuild(f1b, h1.id, teamBuilds.p1b, isLegacy);
      applySimBuild(f2, h2.id, teamBuilds.p2, isLegacy);
      applySimBuild(f2b, h3.id, teamBuilds.p2b, isLegacy);
    }
    sim.leftFighter = f1;
    sim.rightFighter = f2;
    sim.fighters = [f1b, f2b, f1, f2];

    const dt = 1 / 30;
    const maxSteps = 180 * 30;
    let firstDeathTime = null;
    let diedWithoutTrueUlt = 0;
    for (let s = 0; s < maxSteps && !sim.isMatchOver; s++) {
      sim.step(dt);
      if (firstDeathTime === null && sim.fighters.some((x) => x.isDead)) {
        firstDeathTime = sim.matchTime;
      }
    }
    for (const x of sim.fighters) {
      if (x.isDead && (x._simTrueUlts || 0) === 0) {
        diedWithoutTrueUlt++;
      }
    }
    const fightersCastingUlt = sim.fighters.filter((x) => (x._simTrueUlts || 0) >= 1).length;
    let winningTeam = sim.winningTeam;
    if (!sim.isMatchOver) {
      const t1Hp = (f1.hp + f1b.hp) / Math.max(1, f1.maxHp + f1b.maxHp);
      const t2Hp = (f2.hp + f2b.hp) / Math.max(1, f2.maxHp + f2b.maxHp);
      winningTeam = t1Hp >= t2Hp ? 1 : 2;
    }
    return {
      type: '2v2',
      mode,
      team1: team1Idx,
      team2: team2Idx,
      duration: sim.matchTime,
      firstDeathTime: firstDeathTime ?? sim.matchTime,
      timedOut: !sim.isMatchOver,
      winningTeam,
      fightersCastingUlt,
      diedWithoutTrueUlt,
      tagMeta
    };
  } finally {
    Math.random = origRandom;
  }
}

function executeTaskBatch(tasks, isLegacy) {
  const ROSTER = buildRoster(isLegacy);
  const groundY = isLegacy ? 460 : 520;
  const results = [];
  for (const task of tasks) {
    if (task.type === '1v1') {
      results.push(
        runDuel(
          ROSTER,
          task.idx1,
          task.idx2,
          task.seed,
          task.stageId,
          groundY,
          isLegacy,
          task.p1Build || null,
          task.p2Build || null,
          task.tagMeta || null
        )
      );
    } else {
      results.push(
        run2v2(
          ROSTER,
          task.mode,
          task.team1,
          task.team2,
          task.seed,
          task.stageId,
          groundY,
          isLegacy,
          task.teamBuilds || null,
          task.tagMeta || null
        )
      );
    }
  }
  return results;
}

async function dispatchTasksInParallel(tasks, isLegacy) {
  const workerCount = Math.min(8, Math.max(1, os.cpus().length));
  const buckets = Array.from({ length: workerCount }, () => []);
  for (let i = 0; i < tasks.length; i++) {
    buckets[i % workerCount].push(tasks[i]);
  }
  const startMs = Date.now();
  const batches = await Promise.all(
    buckets
      .filter((b) => b.length > 0)
      .map(
        (chunk) =>
          new Promise((resolve, reject) => {
            const w = new Worker(new URL(import.meta.url), {
              workerData: { tasks: chunk, isLegacy }
            });
            w.once('message', resolve);
            w.once('error', reject);
            w.once('exit', (code) => {
              if (code !== 0) reject(new Error(`Benchmark worker exited with code ${code}`));
            });
          })
      )
  );
  return {
    allResults: batches.flat(),
    workerCount,
    elapsedSec: ((Date.now() - startMs) / 1000).toFixed(2)
  };
}

if (!isMainThread) {
  const results = executeTaskBatch(workerData.tasks, workerData.isLegacy);
  parentPort.postMessage(results);
} else if (process.argv.includes('--builds')) {
  const heroFilterArg = process.argv.find((a) => a.startsWith('--hero='));
  const buildTargetIds = heroFilterArg
    ? heroFilterArg.slice('--hero='.length).split(',').map((s) => s.trim()).filter(Boolean)
    : SOVEREIGN_BUILD_HERO_IDS;
  const buildTargetSet = new Set(buildTargetIds);
  const ROSTER = buildRoster(false);
  const N = ROSTER.length;
  const heroIdxById = new Map(ROSTER.map((r, idx) => [r.id, idx]));
  const tasks = [];

  // Build canonical seed lookup matching the default 1v1 round-robin (`1001..1528`)
  // and enqueue the 528 canonical `0/0/0` duels once (simultaneously evaluating Preset [I] for all 12 EX heroes!)
  const canonicalSeedMap = new Map();
  let canonSeed = 1001;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      for (let stIdx = 0; stIdx < STAGES.length; stIdx++) {
        const seed = canonSeed++;
        canonicalSeedMap.set(`${i}:${j}:${stIdx}`, seed);
        tasks.push({
          type: '1v1',
          idx1: i,
          idx2: j,
          stageId: STAGES[stIdx],
          seed,
          p1Build: null,
          p2Build: null,
          tagMeta: { isCanonical000: true }
        });
      }
    }
  }

  // 1) Symmetric 1v1 Round-Robin for target EX Sovereign Heroes x Presets [II] & [III]
  for (const heroId of buildTargetIds) {
    const hIdx = heroIdxById.get(heroId);
    for (const presetIdx of [1, 2]) {
      const bSpec = { aspect: presetIdx, skill: presetIdx, ult: presetIdx };
      for (let oppIdx = 0; oppIdx < N; oppIdx++) {
        if (oppIdx === hIdx) continue;
        for (let stIdx = 0; stIdx < STAGES.length; stIdx++) {
          const stageId = STAGES[stIdx];
          tasks.push({
            type: '1v1',
            idx1: hIdx,
            idx2: oppIdx,
            stageId,
            seed: canonicalSeedMap.get(`${hIdx}:${oppIdx}:${stIdx}`),
            p1Build: bSpec,
            p2Build: null,
            tagMeta: { heroId, presetIdx, side: 1 }
          });
          tasks.push({
            type: '1v1',
            idx1: oppIdx,
            idx2: hIdx,
            stageId,
            seed: canonicalSeedMap.get(`${oppIdx}:${hIdx}:${stIdx}`),
            p1Build: null,
            p2Build: bSpec,
            tagMeta: { heroId, presetIdx, side: 2 }
          });
        }
      }
    }
  }

  // 2A) Canonical 480 `0/0/0` 2v2 matches (240 Brawl + 240 Tag) for Preset [I] across all 12 EX heroes
  // 2B) Exact same canonical 2v2 lineups & seeds (`5000 + m`) with focal Preset [II] or [III] on lead (`p1` or `p2`),
  //     giving every [II] & [III] preset 40 Brawl + 40 Tag = 80 zero-bias apples-to-apples 2v2 games!
  for (const mode of ['2v2_brawl', '2v2_tag']) {
    const rng = mulberry32(mode === '2v2_brawl' ? 7777 : 8888);
    for (let c = 0; c < 20; c++) {
      const o0 = 0;
      const o1 = 1 + Math.floor(rng() * (N - 2));
      let o2 = 2 + Math.floor(rng() * (N - 3));
      while (o2 === o0 || o2 === o1) o2 = (o2 + 1) % N;
      let o3 = 3 + Math.floor(rng() * (N - 4));
      while (o3 === o0 || o3 === o1 || o3 === o2) o3 = (o3 + 1) % N;
      for (let base = 0; base < N; base++) {
        const m = c * N + base;
        const team1 = [(base + o0) % N, (base + o1) % N];
        const team2 = [(base + o2) % N, (base + o3) % N];
        const stageId = STAGES[m % STAGES.length];
        const seed = 5000 + m;

        tasks.push({
          type: '2v2',
          mode,
          team1,
          team2,
          stageId,
          seed,
          teamBuilds: null,
          tagMeta: { isCanonical000: true }
        });

        const h1Id = ROSTER[team1[0]].id;
        const h2Id = ROSTER[team2[0]].id;
        for (const presetIdx of [1, 2]) {
          const bSpec = { aspect: presetIdx, skill: presetIdx, ult: presetIdx };
          if (buildTargetSet.has(h1Id)) {
            tasks.push({
              type: '2v2',
              mode,
              team1,
              team2,
              stageId,
              seed,
              teamBuilds: { p1: bSpec, p1b: null, p2: null, p2b: null },
              tagMeta: { heroId: h1Id, presetIdx, side: 1 }
            });
          }
          if (buildTargetSet.has(h2Id)) {
            tasks.push({
              type: '2v2',
              mode,
              team1,
              team2,
              stageId,
              seed,
              teamBuilds: { p1: null, p1b: null, p2: bSpec, p2b: null },
              tagMeta: { heroId: h2Id, presetIdx, side: 2 }
            });
          }
        }
      }
    }
  }

  // 2C) Hybrid 4-slot 2v2 cross-build smoke matches (skipped when filtering a single --hero=)
  if (!heroFilterArg) {
    const buildIdxList = SOVEREIGN_BUILD_HERO_IDS.map((id) => heroIdxById.get(id));
    for (const mode of ['2v2_tag', '2v2_brawl']) {
      for (let m = 0; m < 12; m++) {
        const i0 = buildIdxList[m % buildIdxList.length];
        const i1 = buildIdxList[(m + 3) % buildIdxList.length];
        const i2 = buildIdxList[(m + 6) % buildIdxList.length];
        const i3 = buildIdxList[(m + 9) % buildIdxList.length];
        tasks.push({
          type: '2v2',
          mode,
          team1: [i0, i1],
          team2: [i2, i3],
          stageId: STAGES[m % STAGES.length],
          seed: 9100 + m,
          teamBuilds: {
            p1: { aspect: 1, skill: 1, ult: 1 },
            p1b: { aspect: 2, skill: 0, ult: 2 },
            p2: { aspect: 0, skill: 2, ult: 1 },
            p2b: { aspect: 1, skill: 2, ult: 0 }
          }
        });
      }
    }
  }

  const { allResults, workerCount, elapsedSec } = await dispatchTasksInParallel(tasks, false);

  const presetStats = new Map();
  for (const heroId of buildTargetIds) {
    const cfg = CHAMPION_ROSTER[heroId];
    const cat = HERO_BUILD_CATALOG[heroId];
    for (const presetIdx of [0, 1, 2]) {
      const presetMeta = cat.presets[presetIdx];
      presetStats.set(`${heroId}:${presetIdx}`, {
        heroId,
        heroName: cfg.name,
        presetIdx,
        roman: presetMeta.roman,
        presetName: presetMeta.shortName,
        wins: 0,
        games: 0,
        timeouts: 0,
        totalDuration: 0,
        overdrives: 0,
        trueUlts: 0,
        dmgDealt: 0,
        healing: 0,
        brawlWins: 0,
        brawlGames: 0,
        tagWins: 0,
        tagGames: 0
      });
    }
  }

  let total1v1 = 0;
  let timeouts1v1 = 0;
  let odMatches = 0;
  let tuMatches = 0;
  let total2v2 = 0;
  let timeoutsBrawl = 0;
  let timeoutsTag = 0;

  for (const res of allResults) {
    if (res.type === '1v1') {
      total1v1++;
      if (res.timedOut) timeouts1v1++;
      if (res.f1Overdrives + res.f2Overdrives >= 1) odMatches++;
      if (res.f1TrueUlts + res.f2TrueUlts >= 1) tuMatches++;

      if (res.tagMeta?.isCanonical000) {
        const id1 = ROSTER[res.idx1].id;
        const id2 = ROSTER[res.idx2].id;
        const s1 = presetStats.get(`${id1}:0`);
        const s2 = presetStats.get(`${id2}:0`);
        if (s1) {
          s1.games++;
          if (res.winner === 1) s1.wins++;
          if (res.timedOut) s1.timeouts++;
          s1.totalDuration += res.duration;
          s1.overdrives += res.f1Overdrives;
          s1.trueUlts += res.f1TrueUlts;
          s1.dmgDealt += res.f1Dmg;
          s1.healing += res.f1Heal;
        }
        if (s2) {
          s2.games++;
          if (res.winner === 2) s2.wins++;
          if (res.timedOut) s2.timeouts++;
          s2.totalDuration += res.duration;
          s2.overdrives += res.f2Overdrives;
          s2.trueUlts += res.f2TrueUlts;
          s2.dmgDealt += res.f2Dmg;
          s2.healing += res.f2Heal;
        }
      } else if (res.tagMeta?.heroId) {
        const key = `${res.tagMeta.heroId}:${res.tagMeta.presetIdx}`;
        const st = presetStats.get(key);
        const isSide1 = res.tagMeta.side === 1;
        st.games++;
        if (res.winner === res.tagMeta.side) st.wins++;
        if (res.timedOut) st.timeouts++;
        st.totalDuration += res.duration;
        st.overdrives += isSide1 ? res.f1Overdrives : res.f2Overdrives;
        st.trueUlts += isSide1 ? res.f1TrueUlts : res.f2TrueUlts;
        st.dmgDealt += isSide1 ? res.f1Dmg : res.f2Dmg;
        st.healing += isSide1 ? res.f1Heal : res.f2Heal;
      }
    } else if (res.type === '2v2') {
      total2v2++;
      if (res.timedOut) {
        if (res.mode === '2v2_brawl') timeoutsBrawl++;
        else timeoutsTag++;
      }
      if (res.tagMeta?.isCanonical000) {
        for (const hIdx of res.team1) {
          const st = presetStats.get(`${ROSTER[hIdx].id}:0`);
          if (!st) continue;
          if (res.mode === '2v2_brawl') {
            st.brawlGames++;
            if (res.winningTeam === 1) st.brawlWins++;
          } else {
            st.tagGames++;
            if (res.winningTeam === 1) st.tagWins++;
          }
        }
        for (const hIdx of res.team2) {
          const st = presetStats.get(`${ROSTER[hIdx].id}:0`);
          if (!st) continue;
          if (res.mode === '2v2_brawl') {
            st.brawlGames++;
            if (res.winningTeam === 2) st.brawlWins++;
          } else {
            st.tagGames++;
            if (res.winningTeam === 2) st.tagWins++;
          }
        }
      } else if (res.tagMeta?.heroId) {
        const st = presetStats.get(`${res.tagMeta.heroId}:${res.tagMeta.presetIdx}`);
        if (st) {
          if (res.mode === '2v2_brawl') {
            st.brawlGames++;
            if (res.winningTeam === res.tagMeta.side) st.brawlWins++;
          } else {
            st.tagGames++;
            if (res.winningTeam === res.tagMeta.side) st.tagWins++;
          }
        }
      }
    }
  }

  const odPct = (odMatches / total1v1) * 100;
  const tuPct = (tuMatches / total1v1) * 100;

  console.log('======================================================================================================================');
  console.log(
    `SOVEREIGN LOADOUTS BENCHMARK [ALL 12 EX HEROES x 3 PRESETS = 36 BUILDS] (${total1v1} 1v1 + ${total2v2} 2v2 | ${workerCount} workers in ${elapsedSec}s)`
  );
  console.log('======================================================================================================================');
  console.log(
    `1v1 Timeouts@180s: ${timeouts1v1} | 2v2 Brawl Timeouts: ${timeoutsBrawl} | 2v2 Tag Timeouts: ${timeoutsTag} | OD: ${odPct.toFixed(1)}% | TrueUlt: ${tuPct.toFixed(1)}%`
  );
  console.log('----------------------------------------------------------------------------------------------------------------------');
  console.log(
    'Hero           | Preset          | 1v1 WR  | 2v2 WR  | AvgDur | OD/gm | TrueUlt/gm | AvgDPS | AvgHeal/gm'
  );
  console.log('----------------------------------------------------------------------------------------------------------------------');

  const failures = [];
  if (timeouts1v1 !== 0) failures.push(`1v1 timeouts expected 0, got ${timeouts1v1}`);
  if (timeoutsBrawl !== 0) failures.push(`2v2 Brawl Sovereign timeouts expected 0, got ${timeoutsBrawl}`);
  if (odPct < 90.0) failures.push(`Overdrive match rate ${odPct.toFixed(1)}% < 90.0%`);
  if (tuPct < 90.0) failures.push(`TRUE_ULTIMATE match rate ${tuPct.toFixed(1)}% < 90.0%`);

  for (const st of presetStats.values()) {
    const wrNum = (st.wins / st.games) * 100;
    const total2v2Games = st.brawlGames + st.tagGames;
    const wr2v2Num = total2v2Games > 0 ? ((st.brawlWins + st.tagWins) / total2v2Games) * 100 : 50.0;
    const wr = wrNum.toFixed(1).padStart(5);
    const wr2v2 = wr2v2Num.toFixed(1).padStart(5);
    const avgDur = st.totalDuration / st.games;
    const dps = (st.dmgDealt / st.totalDuration).toFixed(1).padStart(6);
    const od = (st.overdrives / st.games).toFixed(2).padStart(5);
    const tu = (st.trueUlts / st.games).toFixed(2).padStart(10);
    const hl = (st.healing / st.games).toFixed(0).padStart(10);
    const pTag = `[${st.roman}] ${st.presetName}`.padEnd(15);
    console.log(
      `${st.heroName.padEnd(14)} | ${pTag} |  ${wr}% |  ${wr2v2}% | ${avgDur.toFixed(1).padStart(5)}s | ${od} | ${tu} | ${dps} | ${hl}`
    );
    if (wrNum < 40.0 || wrNum > 60.0) {
      failures.push(`${st.heroName} [${st.roman}] ${st.presetName} 1v1 WR ${wrNum.toFixed(1)}% outside [40.0%, 60.0%]`);
    }
    if (wr2v2Num < 38.0 || wr2v2Num > 62.0) {
      failures.push(`${st.heroName} [${st.roman}] ${st.presetName} 2v2 WR ${wr2v2Num.toFixed(1)}% outside [38.0%, 62.0%]`);
    }
  }
  console.log('======================================================================================================================');

  if (failures.length > 0) {
    console.error('[SOVEREIGN BUILDS BALANCE GATE FAILED]');
    for (const msg of failures) console.error(` - ${msg}`);
    process.exit(1);
  } else {
    console.log(
      `[SOVEREIGN BUILDS BALANCE GATES PASSED] All 36 Presets within [40.0%, 60.0%] 1v1 WR & [38.0%, 62.0%] 2v2 WR, 0 timeouts, OD=${odPct.toFixed(1)}%, TrueUlt=${tuPct.toFixed(1)}%`
    );
  }
} else {
  const isLegacy = process.argv.includes('--legacy');
  const ROSTER = buildRoster(isLegacy);
  const groundY = isLegacy ? 460 : 520;

  const tasks = [];
  let seedCounter = 1001;
  for (let i = 0; i < ROSTER.length; i++) {
    for (let j = 0; j < ROSTER.length; j++) {
      if (i === j) continue;
      for (let stIdx = 0; stIdx < STAGES.length; stIdx++) {
        tasks.push({
          type: '1v1',
          idx1: i,
          idx2: j,
          stageId: STAGES[stIdx],
          seed: seedCounter++
        });
      }
    }
  }

  for (const mode of ['2v2_brawl', '2v2_tag']) {
    const rng = mulberry32(mode === '2v2_brawl' ? 7777 : 8888);
    const N = ROSTER.length;
    for (let c = 0; c < 20; c++) {
      const o0 = 0;
      const o1 = 1 + Math.floor(rng() * (N - 2));
      let o2 = 2 + Math.floor(rng() * (N - 3));
      while (o2 === o0 || o2 === o1) o2 = (o2 + 1) % N;
      let o3 = 3 + Math.floor(rng() * (N - 4));
      while (o3 === o0 || o3 === o1 || o3 === o2) o3 = (o3 + 1) % N;
      for (let base = 0; base < N; base++) {
        const m = c * N + base;
        tasks.push({
          type: '2v2',
          mode,
          team1: [(base + o0) % N, (base + o1) % N],
          team2: [(base + o2) % N, (base + o3) % N],
          stageId: STAGES[m % STAGES.length],
          seed: 5000 + m
        });
      }
    }
  }

  const { allResults, workerCount, elapsedSec } = await dispatchTasksInParallel(tasks, isLegacy);

  const heroStats = ROSTER.map((r) => {
    const sample = new r.Cls(240, groundY, 1);
    return {
      id: r.id,
      name: r.name,
      maxHp: sample.maxHp,
      moveSpeed: sample.moveSpeed,
      attackRange: sample.attackRange,
      wins: 0,
      games: 0,
      timeouts: 0,
      totalDuration: 0,
      overdrives: 0,
      trueUlts: 0,
      dmgDealt: 0,
      healing: 0
    };
  });

  const hero2v2Stats = ROSTER.map((r) => ({
    id: r.id,
    name: r.name,
    brawlWins: 0,
    brawlGames: 0,
    tagWins: 0,
    tagGames: 0
  }));

  let totalMatches = 0;
  let totalDuration = 0;
  let matchesWithAnyOverdrive = 0;
  let matchesWithAnyTrueUlt = 0;
  let matchesWithBothTrueUlt = 0;
  let totalTimeouts = 0;
  let minDur = Infinity;
  let maxDur = 0;

  const mode2v2Totals = {
    '2v2_brawl': { n: 0, sumDur: 0, sumFirstDeath: 0, sumFightersCast: 0, sumDiedNoUlt: 0, timeouts: 0 },
    '2v2_tag': { n: 0, sumDur: 0, sumFirstDeath: 0, sumFightersCast: 0, sumDiedNoUlt: 0, timeouts: 0 }
  };

  for (const res of allResults) {
    if (res.type === '1v1') {
      totalMatches++;
      totalDuration += res.duration;
      if (res.timedOut) totalTimeouts++;
      minDur = Math.min(minDur, res.duration);
      maxDur = Math.max(maxDur, res.duration);
      if (res.f1Overdrives + res.f2Overdrives >= 1) matchesWithAnyOverdrive++;
      if (res.f1TrueUlts + res.f2TrueUlts >= 1) matchesWithAnyTrueUlt++;
      if (res.f1TrueUlts >= 1 && res.f2TrueUlts >= 1) matchesWithBothTrueUlt++;

      const s1 = heroStats[res.idx1];
      const s2 = heroStats[res.idx2];
      s1.games++;
      s2.games++;
      if (res.winner === 1) s1.wins++;
      else s2.wins++;
      if (res.timedOut) {
        s1.timeouts++;
        s2.timeouts++;
      }
      s1.totalDuration += res.duration;
      s2.totalDuration += res.duration;
      s1.overdrives += res.f1Overdrives;
      s2.overdrives += res.f2Overdrives;
      s1.trueUlts += res.f1TrueUlts;
      s2.trueUlts += res.f2TrueUlts;
      s1.dmgDealt += res.f1Dmg;
      s2.dmgDealt += res.f2Dmg;
      s1.healing += res.f1Heal;
      s2.healing += res.f2Heal;
    } else {
      const mt = mode2v2Totals[res.mode];
      mt.n++;
      mt.sumDur += res.duration;
      mt.sumFirstDeath += res.firstDeathTime;
      mt.sumFightersCast += res.fightersCastingUlt;
      mt.sumDiedNoUlt += res.diedWithoutTrueUlt;
      if (res.timedOut) mt.timeouts++;

      for (const idx of res.team1) {
        const st = hero2v2Stats[idx];
        if (res.mode === '2v2_brawl') {
          st.brawlGames++;
          if (res.winningTeam === 1) st.brawlWins++;
        } else {
          st.tagGames++;
          if (res.winningTeam === 1) st.tagWins++;
        }
      }
      for (const idx of res.team2) {
        const st = hero2v2Stats[idx];
        if (res.mode === '2v2_brawl') {
          st.brawlGames++;
          if (res.winningTeam === 2) st.brawlWins++;
        } else {
          st.tagGames++;
          if (res.winningTeam === 2) st.tagWins++;
        }
      }
    }
  }

  const odMatchPct = (matchesWithAnyOverdrive / totalMatches) * 100;
  const tuMatchPct = (matchesWithAnyTrueUlt / totalMatches) * 100;
  const bothTuPct = (matchesWithBothTrueUlt / totalMatches) * 100;

  console.log('====================================================================================================');
  console.log(
    `1V1 ROUND-ROBIN BENCHMARK [${isLegacy ? 'LEGACY 11' : 'EX 12'}] (${totalMatches} Matches across 4 Stages | ${workerCount} workers in ${elapsedSec}s)`
  );
  console.log('====================================================================================================');
  console.log(
    `Avg Duration: ${(totalDuration / totalMatches).toFixed(1)}s (min ${minDur.toFixed(1)}s, max ${maxDur.toFixed(1)}s, timeouts@180s: ${totalTimeouts})`
  );
  console.log(`Matches w/ >=1 Overdrive: ${odMatchPct.toFixed(1)}%`);
  console.log(
    `Matches w/ >=1 Supreme TRUE_ULTIMATE: ${tuMatchPct.toFixed(1)}% (Both cast TRUE_ULT: ${bothTuPct.toFixed(1)}%)`
  );
  console.log('----------------------------------------------------------------------------------------------------');
  console.log(
    'Hero           | HP   | WinRate | AvgDur | OD/gm | TrueUlt/gm | AvgDPS | AvgHeal/gm'
  );
  console.log('----------------------------------------------------------------------------------------------------');
  const sorted = [...heroStats].sort((a, b) => b.wins / b.games - a.wins / a.games);
  for (const s of sorted) {
    const wr = ((s.wins / s.games) * 100).toFixed(1).padStart(5);
    const avgDur = s.totalDuration / s.games;
    const dps = (s.dmgDealt / s.totalDuration).toFixed(1).padStart(6);
    const od = (s.overdrives / s.games).toFixed(2).padStart(5);
    const tu = (s.trueUlts / s.games).toFixed(2).padStart(10);
    const hl = (s.healing / s.games).toFixed(0).padStart(10);
    console.log(
      `${s.name.padEnd(14)} | ${String(s.maxHp).padStart(4)} |  ${wr}% | ${avgDur.toFixed(1).padStart(5)}s | ${od} | ${tu} | ${dps} | ${hl}`
    );
  }
  console.log('====================================================================================================');

  for (const mode of ['2v2_brawl', '2v2_tag']) {
    const mt = mode2v2Totals[mode];
    console.log(
      `[${mode.toUpperCase()}] (${mt.n} matches) AvgDur=${(mt.sumDur / mt.n).toFixed(1)}s | FirstKO=${(mt.sumFirstDeath / mt.n).toFixed(1)}s | FightersCastingTrueUlt=${((mt.sumFightersCast / (mt.n * 4)) * 100).toFixed(1)}% | DiedBeforeTrueUlt=${(mt.sumDiedNoUlt / mt.n).toFixed(2)}/match | Timeouts=${mt.timeouts}`
    );
  }
  console.log('----------------------------------------------------------------------------------------------------');
  console.log('Hero           | 2v2 Brawl WR | 2v2 Tag WR | Combined 2v2 WR');
  console.log('----------------------------------------------------------------------------------------------------');
  const sorted2v2 = [...hero2v2Stats].sort(
    (a, b) =>
      (b.brawlWins + b.tagWins) / (b.brawlGames + b.tagGames) -
      (a.brawlWins + a.tagWins) / (a.brawlGames + a.tagGames)
  );
  for (const s of sorted2v2) {
    const bWr = ((s.brawlWins / s.brawlGames) * 100).toFixed(1).padStart(5);
    const tWr = ((s.tagWins / s.tagGames) * 100).toFixed(1).padStart(5);
    const cWr = (((s.brawlWins + s.tagWins) / (s.brawlGames + s.tagGames)) * 100).toFixed(1).padStart(5);
    console.log(`${s.name.padEnd(14)} |      ${bWr}%  |    ${tWr}%  |         ${cWr}%`);
  }
  console.log('====================================================================================================');

  if (!isLegacy) {
    const failures = [];
    if (totalTimeouts !== 0) {
      failures.push(`1v1 timeouts expected 0, got ${totalTimeouts}`);
    }
    if (odMatchPct < 90.0) {
      failures.push(`Overdrive match rate ${odMatchPct.toFixed(1)}% < 90.0%`);
    }
    if (tuMatchPct < 90.0) {
      failures.push(`TRUE_ULTIMATE match rate ${tuMatchPct.toFixed(1)}% < 90.0%`);
    }
    for (const s of heroStats) {
      const wr = (s.wins / s.games) * 100;
      if (wr < 40.0 || wr > 60.0) {
        failures.push(`${s.name} 1v1 WR ${wr.toFixed(1)}% outside [40.0%, 60.0%]`);
      }
    }
    for (const s of hero2v2Stats) {
      const combWr = ((s.brawlWins + s.tagWins) / (s.brawlGames + s.tagGames)) * 100;
      if (combWr < 38.0 || combWr > 62.0) {
        failures.push(`${s.name} Combined 2v2 WR ${combWr.toFixed(1)}% outside [38.0%, 62.0%]`);
      }
    }

    if (failures.length > 0) {
      console.error('[EX BALANCE GATE FAILED]');
      for (const msg of failures) console.error(` - ${msg}`);
      process.exit(1);
    } else {
      console.log(
        `[EX BALANCE GATES PASSED] 1v1 [40.0%, 60.0%], Combined 2v2 [38.0%, 62.0%], 0 timeouts, OD=${odMatchPct.toFixed(1)}%, TrueUlt=${tuMatchPct.toFixed(1)}%`
      );
    }
  }
}
