import { VFXManager } from '../../src/engine/VFXManager.js?v=30fps142';
import fs from 'node:fs';
import {
  ArcaneShaderFX,
  ShaderPen
} from '../../src/engine/ArcaneShaderFX.js?v=30fps142';
import {
  ShaderPen as ShaderPen114
} from '../../src/engine/ArcaneShaderFX.js?v=30fps114';
import {
  ShaderPen as ShaderPen113
} from '../../src/engine/ArcaneShaderFX.js?v=30fps113';
import {
  ShaderPen as ShaderPen112
} from '../../src/engine/ArcaneShaderFX.js?v=30fps112';
import { Warrior } from '../../src/entities/Warrior.js';
import { WarriorEx } from '../../src/entities/WarriorEx.js?v=30fps142';
import { Titan } from '../../src/entities/Titan.js';
import { TitanEx } from '../../src/entities/TitanEx.js?v=30fps142';
import { Ronin } from '../../src/entities/Ronin.js';
import { RoninEx } from '../../src/entities/RoninEx.js?v=30fps142';
import { FireMage } from '../../src/entities/FireMage.js';
import { FireMageEx } from '../../src/entities/FireMageEx.js?v=30fps142';
import { Archer } from '../../src/entities/Archer.js';
import { ArcherEx } from '../../src/entities/ArcherEx.js?v=30fps142';
import { Priestess } from '../../src/entities/Priestess.js';
import { PriestessEx } from '../../src/entities/PriestessEx.js?v=30fps142';
import { Valkyrie } from '../../src/entities/Valkyrie.js';
import { ValkyrieEx } from '../../src/entities/ValkyrieEx.js?v=30fps142';
import { IceMage } from '../../src/entities/IceMage.js';
import { IceMageEx } from '../../src/entities/IceMageEx.js?v=30fps142';
import { Reaper } from '../../src/entities/Reaper.js';
import { ReaperEx } from '../../src/entities/ReaperEx.js?v=30fps142';
import { Chronomancer } from '../../src/entities/Chronomancer.js';
import { ChronomancerEx } from '../../src/entities/ChronomancerEx.js?v=30fps142';
import { Android } from '../../src/entities/Android.js';
import { AndroidEx } from '../../src/entities/AndroidEx.js?v=30fps142';
import { NyxEx } from '../../src/entities/NyxEx.js?v=30fps142';
import { HeroBuildSystem } from '../../src/combat/HeroBuildSystem.js?v=30fps142';

const HEROES = [
  ['warrior', Warrior],
  ['warrior_ex', WarriorEx],
  ['titan', Titan],
  ['titan_ex', TitanEx],
  ['ronin', Ronin],
  ['ronin_ex', RoninEx],
  ['mage', FireMage],
  ['mage_ex', FireMageEx],
  ['archer', Archer],
  ['archer_ex', ArcherEx],
  ['priestess', Priestess],
  ['priestess_ex', PriestessEx],
  ['valkyrie', Valkyrie],
  ['valkyrie_ex', ValkyrieEx],
  ['icemage', IceMage],
  ['icemage_ex', IceMageEx],
  ['reaper', Reaper],
  ['reaper_ex', ReaperEx],
  ['chronomancer', Chronomancer],
  ['chronomancer_ex', ChronomancerEx],
  ['android', Android],
  ['android_ex', AndroidEx],
  ['nyx_ex', NyxEx]
];

// Track shadeBox boundary hits and viewport buffer edge hits during live ULTIMATE + TRUE_ULTIMATE
let currentHero = '';
let currentMode = '';
const shadeBoxClips = new Map();
const viewportClips = new Map();

for (const PenCls of new Set([ShaderPen, ShaderPen114, ShaderPen113, ShaderPen112])) {
  const origShadeBox = PenCls.prototype.shadeBox;
  PenCls.prototype.shadeBox = function (x0, y0, x1, y1, shaderFn) {
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
}

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
  const isReaperFamily = id === 'reaper' || id === 'reaper_ex';
  const modes = isReaperFamily ? ['CROUCH', 'ULTIMATE', 'TRUE_ULTIMATE'] : ['ULTIMATE', 'TRUE_ULTIMATE'];
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

    const totalT = mode === 'CROUCH' ? 2.1 : mode === 'ULTIMATE' ? (isReaperFamily ? 4.8 : 2.5) : 5.2;
    const dt = 1 / 30;
    for (let t = 0; t < totalT; t += dt) {
      dummy.hp = 999999;
      dummy.isDead = false;
      if (isReaperFamily && (mode === 'ULTIMATE' || mode === 'TRUE_ULTIMATE') && t > 2.0 && hero.deathCompanions?.[0]) {
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

// Also verify Sovereign Loadout Presets [II] (1/1/1) & [III] (2/2/2) SKILL + ULTIMATE shaders across all 12 EX Heroes
const SOVEREIGN_SHADER_HEROES = [
  ['priestess_ex', PriestessEx],
  ['warrior_ex', WarriorEx],
  ['mage_ex', FireMageEx],
  ['nyx_ex', NyxEx],
  ['ronin_ex', RoninEx],
  ['reaper_ex', ReaperEx],
  ['valkyrie_ex', ValkyrieEx],
  ['icemage_ex', IceMageEx],
  ['archer_ex', ArcherEx],
  ['android_ex', AndroidEx],
  ['chronomancer_ex', ChronomancerEx],
  ['titan_ex', TitanEx]
];
for (const [id, Cls] of SOVEREIGN_SHADER_HEROES) {
  for (const tier of [1, 2]) {
    for (const mode of ['SKILL', 'ULTIMATE']) {
      currentHero = `${id}_tier${tier}`;
      currentMode = mode;
      const hero = new Cls(320, 580, 1);
      const dummy = new Warrior(820, 580, -1);
      dummy.maxHp = 999999;
      dummy.hp = 999999;
      const game = makeMockGame(hero, dummy);
      hero.game = game;
      dummy.game = game;
      HeroBuildSystem.applyBuildToFighter(
        hero,
        HeroBuildSystem.describeConcreteBuild(id, tier, tier, tier, false),
        false
      );
      hero.maxHp = 999999;
      hero.hp = 999999;
      if (mode === 'SKILL') {
        hero.skillCooldown = 0;
        hero.setState('SKILL');
      } else {
        hero.mana = hero.maxMana;
        hero.setState('ULTIMATE');
      }
      const totalT = mode === 'SKILL' ? 1.3 : id === 'reaper_ex' ? 4.8 : 2.5;
      const dt = 1 / 30;
      for (let t = 0; t < totalT; t += dt) {
        dummy.hp = 999999;
        dummy.isDead = false;
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
                const keys = hero.fx.active.map((a) => a.key).join('+');
                const vKey = `${id}[T${tier}]:${mode}:${pass}(${w}x${h}) [${keys}]`;
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
}

const targetShadeClips = [...shadeBoxClips.keys()].filter(
  (k) => k.startsWith('reaper:') || k.includes('_ex:')
);
console.log('=== REAPER & ALL 11 EX SHADEBOX CLIPS ===', targetShadeClips.length);
for (const k of targetShadeClips) {
  const v = shadeBoxClips.get(k);
  console.log(`  ${k}: edgeAlbedo=${v.edgeAlbedo} edgeGlow=${v.edgeGlow}`);
}
console.log('=== VIEWPORT BUFFER CLIPS (ALL 23 HEROES) ===', viewportClips.size);
for (const [k, v] of viewportClips.entries()) {
  console.log(`  ${k}: top=${v.topH} bot=${v.botH} left=${v.leftH} right=${v.rightH}`);
}
if (HEROES.length !== 23 || targetShadeClips.length > 0 || viewportClips.size > 0) {
  process.exit(1);
}
console.log('[PASS] Zero viewport border leaks across all 23 champions (11 Legacy + 12 EX) AND zero shadeBox/viewport clips across Malakor & all 12 EX Champions!');
