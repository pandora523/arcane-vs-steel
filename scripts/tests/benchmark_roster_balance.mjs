globalThis.Image = class MockImage {
  constructor() {
    this.complete = true;
    this.naturalWidth = 6240;
    this.naturalHeight = 2080;
    this.src = '';
  }
  addEventListener() {}
};
globalThis.window = {
  innerWidth: 1200,
  innerHeight: 600,
  devicePixelRatio: 1,
  addEventListener() {}
};

function createMockCtx() {
  const noop = () => {};
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

import { Fighter } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Fighter.js?v=30fps80';
import { Warrior } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Warrior.js?v=30fps80';
import { FireMage } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/FireMage.js?v=30fps80';
import { Archer } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Archer.js?v=30fps80';
import { Priestess } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Priestess.js?v=30fps80';
import { Reaper } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Reaper.js?v=30fps80';
import { Chronomancer } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Chronomancer.js?v=30fps80';
import { Titan } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Titan.js?v=30fps80';
import { Ronin } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Ronin.js?v=30fps80';
import { Valkyrie } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Valkyrie.js?v=30fps80';
import { IceMage } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/IceMage.js?v=30fps80';
import { Android } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Android.js?v=30fps80';
import { VFXManager } from '/home/antigravity/pandora523/arcane-vs-steel/src/engine/VFXManager.js?v=30fps80';

const ROSTER = [
  { id: 'titan', name: 'Torgar', Cls: Titan },
  { id: 'warrior', name: 'Aethelgard', Cls: Warrior },
  { id: 'reaper', name: 'Malakor', Cls: Reaper },
  { id: 'valkyrie', name: 'Freyja', Cls: Valkyrie },
  { id: 'android', name: 'VEX-09', Cls: Android },
  { id: 'chronomancer', name: 'Chronos', Cls: Chronomancer },
  { id: 'ronin', name: 'Kaze-Maru', Cls: Ronin },
  { id: 'priestess', name: 'Seraphina', Cls: Priestess },
  { id: 'icemage', name: 'Lyra', Cls: IceMage },
  { id: 'archer', name: 'Sylvara', Cls: Archer },
  { id: 'mage', name: 'Ignis Sol', Cls: FireMage }
];

const STAGES = ['cathedral', 'sylvan', 'boneyard', 'clocktower'];

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

class HeadlessArenaSim {
  constructor(mode = '1v1', stageId = 'cathedral') {
    const noop = () => {};
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

    // Fast VFXManager with particle cap so 440+ matches finish in ~3s while preserving all combat hitboxes!
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
    this.hudEls = { stageBadge: { textContent: 'GOTHIC SANCTUARY' } };
    this.renderer = {
      worldWidth: 1200,
      groundY: 460,
      stageId,
      hitStopTimer: 0,
      trueUltStageOverride: null,
      permanentStageOverride: null,
      triggerShake: noop,
      triggerAberration: noop,
      triggerHitStop: noop,
      triggerImpactFrame: noop,
      triggerUltimateCamera: noop,
      triggerUltimateCutIn: noop,
      triggerClashCamera: noop,
      triggerStageEvent: noop,
      triggerKOFinisher: noop,
      setPermanentStageOverride: noop,
      setTrueUltStageOverride: noop,
      clearTrueUltStageOverride: noop
    };
    this.fighters = [];
  }

  is2v2Mode() {
    return this.gameMode === '2v2_brawl' || this.gameMode === '2v2_tag';
  }

  getTeamFighters(team) {
    return this.fighters.filter((f) => f && f.team === team);
  }

  getTeammateOf(fighter) {
    if (!fighter || !this.is2v2Mode()) return null;
    return this.fighters.find((f) => f && f !== fighter && f.team === fighter.team) || null;
  }

  getEnemiesOf(fighter) {
    const active = this.fighters.filter((f) => f && f.team !== fighter.team && !f.isDead && !f.isBenched);
    if (active.length > 0) return active;
    const living = this.fighters.filter((f) => f && f.team !== fighter.team && !f.isDead);
    if (living.length > 0) return living;
    const fb = fighter.team === 1 ? this.rightFighter : this.leftFighter;
    return fb ? [fb] : [];
  }

  getTargetFor(fighter) {
    const enemies = this.getEnemiesOf(fighter);
    if (enemies.length <= 1) return enemies[0] || (fighter.team === 1 ? this.rightFighter : this.leftFighter);
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
    return (
      members.find((f) => f.isPoint && !f.isDead && !f.isBenched) ||
      members.find((f) => !f.isDead && !f.isBenched) ||
      members[0]
    );
  }

  getReserveFighter(team) {
    const point = this.getPointFighter(team);
    return this.getTeamFighters(team).find((f) => f !== point) || null;
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

  triggerTeamTagSwap(team) {
    if (this.gameMode !== '2v2_tag' || this.isMatchOver) return false;
    const cdKey = team === 1 ? 'team1TagCd' : 'team2TagCd';
    if (this[cdKey] > 0) return false;
    const point = this.getPointFighter(team);
    const reserve = this.getReserveFighter(team);
    if (!point || !reserve || reserve.isDead || !reserve.isBenched) return false;
    this[cdKey] = 11.0;
    const gy = this.renderer.groundY;
    const incomingX = Math.max(130, Math.min(1070, point.x + (team === 1 ? 34 : -34)));
    if (!point.isDead) {
      point.isBenched = true;
      point.isPoint = false;
      point.x = point.benchX || (team === 1 ? 76 : 1124);
      point.y = gy;
      point.vx = 0;
      point.vy = 0;
      point.setState('IDLE');
    }
    reserve.isBenched = false;
    reserve.isPoint = true;
    reserve.x = incomingX;
    reserve.y = gy - 28;
    reserve.vx = (team === 1 ? 1 : -1) * 260;
    reserve.vy = -180;
    reserve.gainMana(18);
    reserve.skillCooldown = Math.min(reserve.skillCooldown, 0.35);
    reserve.setState('SKILL');
    return true;
  }

  triggerTeamAssist(team) {
    if (!this.is2v2Mode() || this.isMatchOver) return false;
    const cdKey = team === 1 ? 'team1AssistCd' : 'team2AssistCd';
    if (this[cdKey] > 0) return false;
    const point = this.getPointFighter(team);
    const ally = this.getReserveFighter(team);
    if (!point || !ally || ally.isDead) return false;
    this[cdKey] = 5.2;
    const target = this.getTargetFor(point);
    if (!target || target.isDead) return false;
    if (this.gameMode === '2v2_tag' && ally.isBenched) {
      const dir = target.x >= ally.x ? 1 : -1;
      ally.facing = dir;
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
        type: 'blade_wave'
      });
      if (!point.isDead) {
        point.heal(35, 'TAG GRACE');
        point.gainMana(12);
      }
      return true;
    }
    point.gainMana(20);
    ally.gainMana(20);
    ally.skillCooldown = 0;
    if (ally.state === 'IDLE' || ally.state === 'WALK') {
      ally.setState('SKILL');
    }
    return true;
  }

  onFighterDeath(deadFighter) {
    if (this.isMatchOver) return;
    const survivingAlly = this.getTeammateOf(deadFighter);
    if (survivingAlly && !survivingAlly.isDead) {
      deadFighter.isPoint = false;
      survivingAlly.isPoint = true;
      if (survivingAlly.isBenched) {
        survivingAlly.isBenched = false;
        survivingAlly.x = Math.max(130, Math.min(1070, deadFighter.x + (survivingAlly.team === 1 ? -40 : 40)));
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

  updateProjectiles(dt) {
    const gy = this.renderer.groundY;
    const ww = this.renderer.worldWidth;

    for (let i = this.vfx.projectiles.length - 1; i >= 0; i--) {
      const p = this.vfx.projectiles[i];
      if (!p) continue;
      for (let j = i - 1; j >= 0; j--) {
        const q = this.vfx.projectiles[j];
        if (!q || p.owner === q.owner || (p.owner && q.owner && p.owner.team === q.owner.team)) continue;
        const dist = Math.hypot(p.x - q.x, p.y - q.y);
        if (dist < (p.radius || 18) + (q.radius || 18) + 28) {
          this.triggerClashSpark();
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
          p.owner?.onProjectileHit?.(p, hitTarget, true, this);
          for (const cand of enemies) {
            if (cand && !cand.isDead && !cand.isBenched && Math.abs(cand.x - p.x) < 230) {
              cand.takeDamage(p.damage, p.owner, true, 160, -240);
            }
          }
        } else if (hitTarget) {
          const isCrit = Math.random() < 0.28;
          hitTarget.takeDamage(isCrit ? p.damage * 1.38 : p.damage, p.owner, isCrit, 100, 0);
          if (p.type === 'phantom_scythe' && p.owner && typeof p.owner.leechLife === 'function') {
            p.owner.leechLife(p.leechAmt || 18, hitTarget, this, 'SOUL LEECH');
          } else if (p.type === 'cryo_shard' && p.owner && typeof p.owner.applyBrittleFrost === 'function') {
            p.owner.applyBrittleFrost(hitTarget, 1, this, p.x, p.y);
          }
          p.owner?.onProjectileHit?.(p, hitTarget, isCrit, this);
        }
        this.vfx.projectiles.splice(i, 1);
      } else if (p.x < -300 || p.x > ww + 300) {
        this.vfx.projectiles.splice(i, 1);
      }
    }
  }

  step(dt) {
    if (this.isMatchOver) return;
    this.matchTime += dt;
    if (this.clashCooldown > 0) this.clashCooldown = Math.max(0, this.clashCooldown - dt);
    if (this.team1TagCd > 0) this.team1TagCd = Math.max(0, this.team1TagCd - dt);
    if (this.team2TagCd > 0) this.team2TagCd = Math.max(0, this.team2TagCd - dt);
    if (this.team1AssistCd > 0) this.team1AssistCd = Math.max(0, this.team1AssistCd - dt);
    if (this.team2AssistCd > 0) this.team2AssistCd = Math.max(0, this.team2AssistCd - dt);

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
        if (this.renderer.stageId === 'sylvan') {
          activeFighters.forEach((f) => f.heal(84, 'STARLIGHT'));
        }
      }
    }

    if (this.is2v2Mode()) {
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
            this.triggerTeamTagSwap(team);
          } else {
            this.triggerTeamAssist(team);
          }
        } else if (this.gameMode === '2v2_brawl') {
          this.triggerTeamAssist(team);
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

function runDuel(h1, h2, seed, stageId) {
  const origRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    const sim = new HeadlessArenaSim('1v1', stageId);
    const f1 = new h1.Cls(240, 460, 1);
    const f2 = new h2.Cls(960, 460, -1);
    f1.game = sim;
    f2.game = sim;
    f1.team = 1;
    f2.team = 2;
    f1.isPoint = true;
    f2.isPoint = true;
    sim.leftFighter = f1;
    sim.rightFighter = f2;
    sim.fighters = [f1, f2];

    const dt = 1 / 30;
    const maxSteps = 180 * 30; // 180s hard timeout
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
      f2Heal: f2.stats.healingDone
    };
  } finally {
    Math.random = origRandom;
  }
}

// Run 11 x 10 x 4 stages = 440 directed 1v1 matches!
const heroStats = new Map();
for (const r of ROSTER) {
  const sample = new r.Cls(240, 460, 1);
  heroStats.set(r.id, {
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
  });
}

let totalMatches = 0;
let totalDuration = 0;
let matchesWithAnyOverdrive = 0;
let matchesWithAnyTrueUlt = 0;
let matchesWithBothTrueUlt = 0;
let totalTimeouts = 0;
let minDur = Infinity;
let maxDur = 0;

let seedCounter = 1001;
for (let i = 0; i < ROSTER.length; i++) {
  for (let j = 0; j < ROSTER.length; j++) {
    if (i === j) continue;
    const h1 = ROSTER[i];
    const h2 = ROSTER[j];
    for (let stIdx = 0; stIdx < STAGES.length; stIdx++) {
      const res = runDuel(h1, h2, seedCounter++, STAGES[stIdx]);
      totalMatches++;
      totalDuration += res.duration;
      if (res.timedOut) totalTimeouts++;
      minDur = Math.min(minDur, res.duration);
      maxDur = Math.max(maxDur, res.duration);
      if (res.f1Overdrives + res.f2Overdrives >= 1) matchesWithAnyOverdrive++;
      if (res.f1TrueUlts + res.f2TrueUlts >= 1) matchesWithAnyTrueUlt++;
      if (res.f1TrueUlts >= 1 && res.f2TrueUlts >= 1) matchesWithBothTrueUlt++;

      const s1 = heroStats.get(h1.id);
      const s2 = heroStats.get(h2.id);
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
    }
  }
}

console.log('====================================================================================================');
console.log(`1V1 ROUND-ROBIN BENCHMARK (${totalMatches} Mortal-HP Matches across all 4 Stages)`);
console.log('====================================================================================================');
console.log(
  `Avg Duration: ${(totalDuration / totalMatches).toFixed(1)}s (min ${minDur.toFixed(1)}s, max ${maxDur.toFixed(1)}s, timeouts@180s: ${totalTimeouts})`
);
console.log(
  `Matches w/ >=1 Overdrive: ${((matchesWithAnyOverdrive / totalMatches) * 100).toFixed(1)}%`
);
console.log(
  `Matches w/ >=1 Supreme TRUE_ULTIMATE: ${((matchesWithAnyTrueUlt / totalMatches) * 100).toFixed(1)}% (Both cast TRUE_ULT: ${((matchesWithBothTrueUlt / totalMatches) * 100).toFixed(1)}%)`
);
console.log('----------------------------------------------------------------------------------------------------');
console.log(
  'Hero          | HP   | WinRate | AvgDur | OD/gm | TrueUlt/gm | AvgDPS | AvgHeal/gm'
);
console.log('----------------------------------------------------------------------------------------------------');
const sorted = [...heroStats.values()].sort((a, b) => b.wins / b.games - a.wins / a.games);
for (const s of sorted) {
  const wr = ((s.wins / s.games) * 100).toFixed(1).padStart(5);
  const avgDur = s.totalDuration / s.games;
  const dps = (s.dmgDealt / s.totalDuration).toFixed(1).padStart(6);
  const od = (s.overdrives / s.games).toFixed(2).padStart(5);
  const tu = (s.trueUlts / s.games).toFixed(2).padStart(10);
  const hl = (s.healing / s.games).toFixed(0).padStart(10);
  console.log(
    `${s.name.padEnd(13)} | ${String(s.maxHp).padStart(4)} |  ${wr}% | ${avgDur.toFixed(1).padStart(5)}s | ${od} | ${tu} | ${dps} | ${hl}`
  );
}
console.log('====================================================================================================');

function run2v2(mode, team1Pair, team2Pair, seed, stageId) {
  const origRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    const sim = new HeadlessArenaSim(mode, stageId);
    const isTag = mode === '2v2_tag';
    const f1 = new team1Pair[0].Cls(300, 460, 1);
    const f2 = new team2Pair[0].Cls(900, 460, -1);
    const f1b = new team1Pair[1].Cls(isTag ? 76 : 168, 460, 1);
    const f2b = new team2Pair[1].Cls(isTag ? 1124 : 1032, 460, -1);
    for (const [f, team, role, pt, bench] of [
      [f1, 1, 'lead', true, false],
      [f2, 2, 'lead', true, false],
      [f1b, 1, 'partner', false, isTag],
      [f2b, 2, 'partner', false, isTag]
    ]) {
      f.game = sim;
      f.team = team;
      f.slotRole = role;
      f.isPoint = pt;
      f.isBenched = bench;
      f.benchX = team === 1 ? 76 : 1124;
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
      duration: sim.matchTime,
      firstDeathTime: firstDeathTime ?? sim.matchTime,
      timedOut: !sim.isMatchOver,
      winningTeam,
      fightersCastingUlt,
      diedWithoutTrueUlt
    };
  } finally {
    Math.random = origRandom;
  }
}

const hero2v2Stats = new Map();
for (const h of ROSTER) {
  hero2v2Stats.set(h.id, { name: h.name, brawlWins: 0, brawlGames: 0, tagWins: 0, tagGames: 0 });
}

for (const mode of ['2v2_brawl', '2v2_tag']) {
  let n = 0;
  let sumDur = 0;
  let sumFirstDeath = 0;
  let sumFightersCast = 0;
  let sumDiedNoUlt = 0;
  let timeouts = 0;
  const rng = mulberry32(mode === '2v2_brawl' ? 7777 : 8888);
  for (let c = 0; c < 20; c++) {
    const o0 = 0;
    const o1 = 1 + Math.floor(rng() * 9);
    let o2 = 2 + Math.floor(rng() * 8);
    while (o2 === o0 || o2 === o1) o2 = (o2 + 1) % ROSTER.length;
    let o3 = 3 + Math.floor(rng() * 7);
    while (o3 === o0 || o3 === o1 || o3 === o2) o3 = (o3 + 1) % ROSTER.length;
    for (let base = 0; base < ROSTER.length; base++) {
      const m = c * ROSTER.length + base;
      const h0 = ROSTER[(base + o0) % ROSTER.length];
      const h1 = ROSTER[(base + o1) % ROSTER.length];
      const h2 = ROSTER[(base + o2) % ROSTER.length];
      const h3 = ROSTER[(base + o3) % ROSTER.length];
      const res = run2v2(mode, [h0, h1], [h2, h3], 5000 + m, STAGES[m % STAGES.length]);
      n++;
      sumDur += res.duration;
      sumFirstDeath += res.firstDeathTime;
      sumFightersCast += res.fightersCastingUlt;
      sumDiedNoUlt += res.diedWithoutTrueUlt;
      if (res.timedOut) timeouts++;
      for (const h of [h0, h1]) {
        const st = hero2v2Stats.get(h.id);
        if (mode === '2v2_brawl') {
          st.brawlGames++;
          if (res.winningTeam === 1) st.brawlWins++;
        } else {
          st.tagGames++;
          if (res.winningTeam === 1) st.tagWins++;
        }
      }
      for (const h of [h2, h3]) {
        const st = hero2v2Stats.get(h.id);
        if (mode === '2v2_brawl') {
          st.brawlGames++;
          if (res.winningTeam === 2) st.brawlWins++;
        } else {
          st.tagGames++;
          if (res.winningTeam === 2) st.tagWins++;
        }
      }
    }
  }
  console.log(
    `[${mode.toUpperCase()}] (${n} matches) AvgDur=${(sumDur / n).toFixed(1)}s | FirstKO=${(sumFirstDeath / n).toFixed(1)}s | FightersCastingTrueUlt=${((sumFightersCast / (n * 4)) * 100).toFixed(1)}% | DiedBeforeTrueUlt=${(sumDiedNoUlt / n).toFixed(2)}/match | Timeouts=${timeouts}`
  );
}
console.log('----------------------------------------------------------------------------------------------------');
console.log('Hero          | 2v2 Brawl WR | 2v2 Tag WR | Combined 2v2 WR');
console.log('----------------------------------------------------------------------------------------------------');
const sorted2v2 = [...hero2v2Stats.values()].sort(
  (a, b) => (b.brawlWins + b.tagWins) / (b.brawlGames + b.tagGames) - (a.brawlWins + a.tagWins) / (a.brawlGames + a.tagGames)
);
for (const s of sorted2v2) {
  const bWr = ((s.brawlWins / s.brawlGames) * 100).toFixed(1).padStart(5);
  const tWr = ((s.tagWins / s.tagGames) * 100).toFixed(1).padStart(5);
  const cWr = (((s.brawlWins + s.tagWins) / (s.brawlGames + s.tagGames)) * 100).toFixed(1).padStart(5);
  console.log(`${s.name.padEnd(13)} |      ${bWr}%  |    ${tWr}%  |         ${cWr}%`);
}
console.log('====================================================================================================');
