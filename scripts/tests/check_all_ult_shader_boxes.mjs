import { VFXManager } from "/home/antigravity/pandora523/arcane-vs-steel/src/engine/VFXManager.js";
import fs from 'node:fs';
import {
  ArcaneShaderFX,
  ShaderPen
} from '/home/antigravity/pandora523/arcane-vs-steel/src/engine/ArcaneShaderFX.js?v=30fps99';
import { Warrior } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Warrior.js';
import { Titan } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Titan.js';
import { Ronin } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Ronin.js';
import { FireMage } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/FireMage.js';
import { Archer } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Archer.js';
import { Priestess } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Priestess.js';
import { Valkyrie } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Valkyrie.js';
import { IceMage } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/IceMage.js';
import { Reaper } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Reaper.js';
import { Chronomancer } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Chronomancer.js';
import { Android } from '/home/antigravity/pandora523/arcane-vs-steel/src/entities/Android.js';

const HEROES = [
  ['warrior', Warrior],
  ['titan', Titan],
  ['ronin', Ronin],
  ['mage', FireMage],
  ['archer', Archer],
  ['priestess', Priestess],
  ['valkyrie', Valkyrie],
  ['icemage', IceMage],
  ['reaper', Reaper],
  ['chronomancer', Chronomancer],
  ['android', Android],
];

// Track shadeBox boundary hits and viewport buffer edge hits during live ULTIMATE + TRUE_ULTIMATE
let currentHero = '';
let currentMode = '';
const shadeBoxClips = new Map();
const viewportClips = new Map();

const origShadeBox = ShaderPen.prototype.shadeBox;
ShaderPen.prototype.shadeBox = function (x0, y0, x1, y1, shaderFn) {
  let edgeAlbedo = 0;
  let edgeGlow = 0;
  const wrapped = (lx, ly, out) => {
    const ret = shaderFn(lx, ly, out);
    const col = ret || out.color;
    const onBoxEdge =
      Math.abs(lx - x0) <= 1.05 ||
      Math.abs(lx - x1) <= 1.05 ||
      Math.abs(ly - y0) <= 1.05 ||
      Math.abs(ly - y1) <= 1.05;
    if (onBoxEdge) {
      if (col && out.alpha > 0.15) edgeAlbedo++;
      if (out.glowStrength > 0.04) edgeGlow++;
    }
    return ret;
  };
  origShadeBox.call(this, x0, y0, x1, y1, wrapped);
  if (edgeAlbedo >= 8 || edgeGlow >= 8) {
    const key = `${currentHero}:${currentMode}:box[${Math.round(x0)},${Math.round(y0)}..${Math.round(x1)},${Math.round(y1)}]`;
    const prev = shadeBoxClips.get(key) || { edgeAlbedo: 0, edgeGlow: 0 };
    if (edgeAlbedo + edgeGlow > prev.edgeAlbedo + prev.edgeGlow) {
      shadeBoxClips.set(key, { edgeAlbedo, edgeGlow });
    }
  }
};

function makeMockGame(hero, dummy) {
  const nop = () => {};
  return new Proxy({
    fighters: [hero, dummy],
    projectiles: [],
    vfx: new VFXManager(), _oldVfx: new Proxy({
      particles: [], projectiles: [],
      shockwaves: [],
      slashes: [],
      beams: [],
      meteors: [],
      floatingTexts: [],
      groundRunes: [],
       decals: [],
      castSeals: [],
      emit: nop,
      addShockwave: nop,
      addSlash: nop,
      addBeam: nop,
      addMeteor: nop,
      addFloatingText: nop,
      addGroundRune: nop,
      addDecal: nop,
      spawnCastSeal: nop,
      spawnHitBurst: nop,
      spawnBlockBurst: nop,
      spawnParryBurst: nop,
      spawnUltBurst: nop,
      spawnTrueUltNova: nop,
      spawnDashTrail: nop,
      spawnLandingDust: nop,
      spawnTeleportBurst: nop,
      spawnHealBurst: nop,
      spawnShieldBurst: nop,
      spawnLightningBolt: nop,
      spawnChainHook: nop,
      spawnFrostShatter: nop,
      spawnFlamePillar: nop,
      spawnEarthCrack: nop,
      spawnAnvilDrop: nop,
      spawnArrowRain: nop,
      spawnFeatherBurst: nop,
      spawnChronoRift: nop,
      spawnCyberGlitch: nop
    }, { get(t, k) { return k in t ? t[k] : nop; } }),
    audio: { play: nop },
    renderer: new Proxy({
      worldWidth: 1200,
      groundY: 580,
      addShake: nop,
      triggerFlash: nop,
      triggerChromatic: nop,
      triggerHitStop: nop,
      triggerImpactFrames: nop,
      triggerWhiteoutDeletion: nop,
      triggerArenaTransition: nop,
      triggerTimeStopVisuals: nop
    }, { get(t, k) { return k in t ? t[k] : nop; } }),
    addHitStop: nop,
    triggerSlowMo: nop,
    getEnemiesOf: (f) => (f === hero ? [dummy] : [hero]),
    getTeammateOf: () => null,
    getTargetFor: (f) => (f === hero ? dummy : hero),
    spawnProjectile: (p) => {}
  }, { get(t, k) { return k in t ? t[k] : nop; } });
}

for (const [id, Cls] of HEROES) {
  const modes = id === 'reaper' ? ['CROUCH', 'ULTIMATE', 'TRUE_ULTIMATE'] : ['ULTIMATE', 'TRUE_ULTIMATE'];
  for (const mode of modes) {
    currentHero = id;
    currentMode = mode;
    const hero = new Cls(320, 580, 1);
    const dummy = new Warrior(820, 580, -1);
    dummy.maxHp = 999999;
    dummy.hp = 999999;
    hero.maxHp = 999999;
    hero.hp = 999999;
    hero.tankedDamage = 450;
    const game = makeMockGame(hero, dummy);
    hero.game = game;
    dummy.game = game;

    if (mode === 'CROUCH') {
      hero.startCrouch(dummy, game);
    } else if (mode === 'ULTIMATE') {
      hero.mana = hero.maxMana;
      hero.setState('ULTIMATE');
    } else {
      hero.finisherGauge = hero.maxFinisherGauge;
      hero.setState('TRUE_ULTIMATE');
    }

    const totalT = mode === 'CROUCH' ? 2.1 : mode === 'ULTIMATE' ? (id === 'reaper' ? 4.8 : 2.5) : 5.2;
    const dt = 1 / 30;
    for (let t = 0; t < totalT; t += dt) {
      dummy.hp = 999999;
      dummy.isDead = false;
      if (id === 'reaper' && mode === 'ULTIMATE' && t > 2.0 && hero.deathCompanions?.[0]) {
        // Keep mage slightly below maxHp once so Soul-Healer triggers necroHealerSoulTether + necroHealerMendHalo!
        if (Math.abs(t - 2.1) < 0.02) hero.deathCompanions[0].hp = 260;
      }
      hero.update(dt, dummy, game);
      if (hero.fx) {
        for (const pass of ['back', 'front']) {
          const res = hero.fx.rasterizeLayer(pass, 600, 580);
          if (res.drewAny) {
            const w = hero.fx.viewW;
            const h = hero.fx.viewH;
            const surf = pass === 'back' ? hero.fx.surfaceBack : hero.fx.surfaceFront;
            let topH = 0, botH = 0, leftH = 0, rightH = 0;
            for (let x = 0; x < w; x++) {
              for (let dy = 0; dy < 8; dy++) {
                if (surf.albedo[dy * w + x] || surf.emissive[dy * w + x]) topH++;
                if (surf.albedo[(h - 1 - dy) * w + x] || surf.emissive[(h - 1 - dy) * w + x]) botH++;
              }
            }
            for (let y = 0; y < h; y++) {
              for (let dx = 0; dx < 8; dx++) {
                if (surf.albedo[y * w + dx] || surf.emissive[y * w + dx]) leftH++;
                if (surf.albedo[y * w + (w - 1 - dx)] || surf.emissive[y * w + (w - 1 - dx)]) rightH++;
              }
            }
            const total = topH + botH + leftH + rightH;
            if (total > 8) {
              const keys = hero.fx.active.map(a => a.key).join("+");
              const vKey = `${id}:${mode}:${pass}(${w}x${h}) [${keys}]`;
              const prev = viewportClips.get(vKey) || { topH: 0, botH: 0, leftH: 0, rightH: 0, total: 0 };
              if (total > prev.total) {
                viewportClips.set(vKey, { topH, botH, leftH, rightH, total });
              }
            }
          }
        }
      }
    }
  }
}

const reaperShadeClips = [...shadeBoxClips.keys()].filter((k) => k.startsWith('reaper:'));
console.log("=== REAPER SHADEBOX CLIPS ===", reaperShadeClips.length);
for (const k of reaperShadeClips) {
  const v = shadeBoxClips.get(k);
  console.log(`  ${k}: edgeAlbedo=${v.edgeAlbedo} edgeGlow=${v.edgeGlow}`);
}
console.log("=== VIEWPORT BUFFER CLIPS ===", viewportClips.size);
for (const [k, v] of viewportClips.entries()) {
  console.log(`  ${k}: top=${v.topH} bot=${v.botH} left=${v.leftH} right=${v.rightH}`);
}
if (reaperShadeClips.length > 0 || viewportClips.size > 0) {
  process.exit(1);
}
console.log("[PASS] Zero viewport border leaks across all 11 champions AND zero shadeBox/viewport clips across Malakor CROUCH, ULTIMATE & TRUE_ULTIMATE!");
