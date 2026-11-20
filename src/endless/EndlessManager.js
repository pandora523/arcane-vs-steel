import { Fighter } from '../entities/Fighter.js?v=30fps191';
import { Monster, ArchfiendBoss } from '../entities/Monster.js?v=30fps191';
import { PixelForge } from '../engine/PixelForge.js?v=30fps191';
import { PixelFont } from '../engine/PixelFont.js?v=30fps191';
import { AdventureSkillSets, ADVENTURE_HERO_KITS } from '../adventure/AdventureSkillSets.js?v=30fps191';
import { EndlessEconomy, formatEndlessNumber } from './EndlessEconomy.js?v=30fps191';
import { EndlessCompanions } from './EndlessCompanions.js?v=30fps191';
import { EndlessShopUI } from './EndlessShopUI.js?v=30fps191';

export const ENDLESS_REALMS = [
  {
    id: 'eclipse',
    stageId: 'cathedral',
    name: 'ECLIPSE SANCTUM',
    accentHex: '#38bdf8',
    monsters: ['templar', 'astrologer'],
    warden: 'templar',
    wardenName: 'ECLIPSE GRAND WARDEN'
  },
  {
    id: 'starwood',
    stageId: 'sylvan',
    name: 'CURSED STARWOOD',
    accentHex: '#34d399',
    monsters: ['treant', 'dryad'],
    warden: 'treant',
    wardenName: 'ELDER STARWOOD TITAN'
  },
  {
    id: 'necropolis',
    stageId: 'boneyard',
    name: 'OSSUARY NECROPOLIS',
    accentHex: '#c084fc',
    monsters: ['ghoul', 'cultist'],
    warden: 'ghoul',
    wardenName: 'DREAD OSSUARY REAPER'
  },
  {
    id: 'blackpit',
    stageId: 'cathedral',
    name: 'THE BLACK PIT',
    accentHex: '#fb923c',
    monsters: ['brute', 'fiend'],
    warden: 'brute',
    wardenName: 'INFERNAL PIT OVERLORD'
  }
];

const ENDLESS_DEPTH_MIN_Y = 442;
const ENDLESS_DEPTH_MAX_Y = 680;
const ENDLESS_DEPTH_MID_Y = 561;
const ENDLESS_BASE_HERO_HP = 1400;
const ENDLESS_CORRIDOR_STEP_X = 480;
const ENDLESS_CORRIDOR_WIDTH = 1420;
const ENDLESS_VFX_CELL = 128;

const ENDLESS_MONSTER_BASE_HP = {
  templar: 320,
  astrologer: 260,
  treant: 440,
  dryad: 270,
  ghoul: 310,
  cultist: 265,
  brute: 460,
  fiend: 340
};

const RANGED_EX_LV1_PROJECTILES = {
  mage_ex: { type: 'fireball', color: '#fb923c', coreColor: '#fef08a', radius: 14, pierce: false, speed: 715 },
  priestess_ex: { type: 'holy_light', color: '#fde047', coreColor: '#ffffff', radius: 14, pierce: true, speed: 725 },
  icemage_ex: { type: 'cryo_shard', color: '#67e8f9', coreColor: '#ffffff', radius: 14, pierce: true, speed: 720 },
  valkyrie_ex: { type: 'dragon_lance', color: '#f43f5e', coreColor: '#fde047', radius: 15, pierce: true, speed: 760 },
  archer_ex: { type: 'arrow', color: '#34d399', coreColor: '#ffffff', radius: 13, pierce: true, speed: 790 }
};

function isImgReady(img) {
  if (!img) return false;
  if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
    return Boolean(img.complete && img.naturalWidth > 0);
  }
  return Boolean(img.width > 0 || img.naturalWidth > 0);
}

/**
 * Lightweight Endless Progression Adapter compatible with `Monster.takeDamage`,
 * `ArchfiendBoss`, `AdventureSkillSets`, and `main.js` HUD readouts.
 */
class EndlessProgressionAdapter {
  constructor(endless) {
    this.endless = endless;
    this.spirit = 100;
    this.maxSpirit = 100;
    this.ultCharge = 0;
    this.astralCharge = 0;
    this.skillPoints = 0;
    this.comboHits = 0;
    this.comboTimer = 0;
    this._lifestealFrac = 0;
    this._skillCdShaveThrottle = 0;
    this._seekerShotCounter = 0;
  }

  get level() {
    return Math.max(1, Math.floor(this.endless?.stage || 1));
  }

  get damageReduction() {
    const buffs = this.endless?.companions?.getPartyBuffs?.();
    const shieldDr = Number.isFinite(buffs?.damageReduction) ? buffs.damageReduction : 0;
    return Math.min(0.45, 0.06 + shieldDr);
  }

  resetForRun() {
    this.spirit = 100;
    this.ultCharge = 0;
    this.astralCharge = 0;
    this.comboHits = 0;
    this.comboTimer = 0;
    this._lifestealFrac = 0;
    this._skillCdShaveThrottle = 0;
    this._seekerShotCounter = 0;
  }

  getComputedStats() {
    const ecoStats = this.endless?.economy?.getComputedStats?.() || {};
    const partyBuffs = this.endless?.companions?.getPartyBuffs?.() || {};
    const hasteMult = (ecoStats.hasteMult || 1) * (1 + (partyBuffs.hasteBonus || 0));
    const cdDiv = Math.max(0.45, 1 / Math.max(0.5, hasteMult));
    const maxHp = Math.max(
      ENDLESS_BASE_HERO_HP,
      Math.round(ENDLESS_BASE_HERO_HP * (ecoStats.maxHpMult || 1))
    );
    return {
      ...ecoStats,
      maxHp,
      hasteMult,
      moveSpeedMult: ecoStats.moveSpeedMult || 1,
      skillSpiritCost: 28,
      skillCdMult: Math.max(0.38, cdDiv),
      mobilityCdMult: Math.max(0.42, cdDiv),
      ultResonanceAstral: 24,
      wardReduction: this.damageReduction,
      basicDmgMult: 1
    };
  }

  attachToFighter(player) {
    if (!player) return;
    if (!player._endlessOrig) {
      player._endlessOrig = {
        maxHp: player.maxHp,
        hp: player.hp,
        gainMana: typeof player.gainMana === 'function' ? player.gainMana.bind(player) : null,
        gainFinisher: typeof player.gainFinisher === 'function' ? player.gainFinisher.bind(player) : null,
        takeDamage: typeof player.takeDamage === 'function' ? player.takeDamage.bind(player) : null,
        heal: typeof player.heal === 'function' ? player.heal.bind(player) : null
      };
    }

    const stats = this.getComputedStats();
    player.maxHp = stats.maxHp;
    player.hp = stats.maxHp;
    player.isDead = false;
    player.mana = this.ultCharge;
    player.finisherGauge = this.astralCharge;

    player.gainMana = (amt) => {
      if (!Number.isFinite(amt) || amt <= 0) return;
      const gMult = this.endless?.economy?.getComputedStats?.()?.gaugeGainMult || 1;
      this.ultCharge = Math.min(100, this.ultCharge + amt * 0.45 * gMult);
      this.syncGaugesToPlayer(player);
    };

    player.gainFinisher = (amt) => {
      if (!Number.isFinite(amt) || amt <= 0) return;
      const gMult = this.endless?.economy?.getComputedStats?.()?.gaugeGainMult || 1;
      this.astralCharge = Math.min(100, this.astralCharge + amt * 0.45 * gMult);
      this.syncGaugesToPlayer(player);
    };

    player.heal = (amount, label = '') => {
      if (player.isDead || !Number.isFinite(amount) || amount <= 0) return 0;
      const origHeal = player._endlessOrig?.heal;
      if (origHeal) {
        return origHeal(Math.max(1, Math.round(amount)), label);
      }
      const prev = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + Math.round(amount));
      return Math.max(0, player.hp - prev);
    };

    player.takeDamage = (amount, attacker, isCrit = false, knockX = 95, knockY = 0) => {
      if (player.isDead || player.isBenched) return;
      if ((this.endless?._phoenixInvulnTimer || 0) > 0 || player.isInvulnerable) return;
      const dr = this.damageReduction;
      const mitigated = Math.max(1, Math.round(amount * (1 - dr)));
      if (player._endlessOrig?.takeDamage) {
        player._endlessOrig.takeDamage(mitigated, attacker, isCrit, knockX, knockY);
      } else {
        player.hp = Math.max(0, player.hp - mitigated);
      }
      if (player.hp <= 0 || player.isDead) {
        this.endless?.handlePlayerZeroHp?.(player);
      }
      this.syncGaugesToPlayer(player);
    };

    this.syncGaugesToPlayer(player);
  }

  detachFromFighter(player) {
    if (!player || !player._endlessOrig) return;
    player.maxHp = player._endlessOrig.maxHp;
    player.hp = Math.min(player.maxHp, Math.max(1, player.hp || player.maxHp));
    if (player._endlessOrig.gainMana) player.gainMana = player._endlessOrig.gainMana;
    if (player._endlessOrig.gainFinisher) player.gainFinisher = player._endlessOrig.gainFinisher;
    if (player._endlessOrig.takeDamage) player.takeDamage = player._endlessOrig.takeDamage;
    if (player._endlessOrig.heal) player.heal = player._endlessOrig.heal;
    delete player._endlessOrig;
  }

  syncMaxHpWithEconomy(player) {
    if (!player) return;
    const stats = this.getComputedStats();
    const targetMax = stats.maxHp;
    if (player.maxHp !== targetMax) {
      const delta = Math.max(0, targetMax - (player.maxHp || targetMax));
      player.maxHp = targetMax;
      if (!player.isDead) {
        player.hp = Math.min(player.maxHp, (player.hp || 0) + delta);
      }
    }
  }

  syncGaugesToPlayer(player) {
    if (!player) return;
    player.mana = Math.max(0, Math.min(player.maxMana || 100, this.ultCharge));
    player.finisherGauge = Math.max(0, Math.min(player.maxFinisherGauge || 100, this.astralCharge));
  }

  gainSpirit(amount) {
    if (!Number.isFinite(amount) || amount === 0) return;
    this.spirit = Math.max(0, Math.min(this.maxSpirit, this.spirit + amount));
  }

  trySpendSkillSpirit() {
    const cost = this.getComputedStats().skillSpiritCost;
    if (this.spirit + 0.01 < cost) return false;
    this.spirit = Math.max(0, this.spirit - cost);
    return true;
  }

  gainAdventureUlt(amount, player = null) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const gMult = this.endless?.economy?.getComputedStats?.()?.gaugeGainMult || 1;
    this.ultCharge = Math.max(0, Math.min(100, this.ultCharge + amount * gMult));
    if (player) this.syncGaugesToPlayer(player);
  }

  gainAstralRelic(amount, player = null) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const gMult = this.endless?.economy?.getComputedStats?.()?.gaugeGainMult || 1;
    this.astralCharge = Math.max(0, Math.min(100, this.astralCharge + amount * gMult));
    if (player) this.syncGaugesToPlayer(player);
  }

  resolveOutgoingCastTier(amount, attacker, castSource = null) {
    const explicit = castSource || attacker?._advActiveCastSource || null;
    if (explicit === 'true_ult') return 'true_ult';
    if (explicit === 'ult') return 'ult';
    if (explicit === 'skill') return 'skill';
    if (explicit === 'auto') {
      return amount >= 420 ? 'true_ult' : 'auto';
    }

    const st = attacker?.state;
    const hitTier = attacker?._activeHitTier;
    if (st === 'TRUE_ULTIMATE' || hitTier === 'TRUE_ULTIMATE' || amount >= 420) {
      return 'true_ult';
    }
    if (st === 'ULTIMATE' || hitTier === 'ULTIMATE') {
      return 'ult';
    }
    if (st === 'SKILL' || hitTier === 'SKILL') {
      return 'skill';
    }
    if (st === 'AUTO_ATTACK') {
      return 'auto';
    }
    if (
      attacker?._advRecentCastSource &&
      (attacker._advRecentCastTimer || 0) > 0 &&
      (attacker._advRecentCastSource === 'true_ult' ||
        attacker._advRecentCastSource === 'ult' ||
        attacker._advRecentCastSource === 'skill')
    ) {
      return attacker._advRecentCastSource;
    }
    if (amount >= 22 && amount <= 44) {
      return 'skill';
    }
    return 'auto';
  }

  scaleOutgoingDamage(amount, attacker, monster, isCrit = false, castSource = null) {
    if (!attacker || attacker.isMonster) return amount;
    if (!Number.isFinite(amount) || amount <= 0) return 0;

    // Tap-Smite hits are pre-scaled & crit-rolled inside EndlessEconomy.computeTapSmiteHit
    if (attacker.isTapSmite) {
      return Math.max(1, Math.round(amount));
    }

    // Companions already compute their own scaled power via EndlessCompanions + companionDmgMult
    // so never double-multiply by heroDmgMult or companionDmgMult here!
    if (attacker.isEndlessCompanion) {
      let compMult = 1.0;
      if ((monster?.staggerBreakTimer || 0) > 0) {
        compMult *= 1.55;
      } else if (monster?.isBoss && (monster.vulnerableTimer || 0) > 0) {
        compMult *= 1.45;
      }
      return Math.max(1, Math.round(amount * compMult));
    }

    const stats = this.endless?.economy?.getComputedStats?.() || {};
    const tier = this.resolveOutgoingCastTier(amount, attacker, castSource);
    let tierMult = 1.0;
    if (tier === 'true_ult') tierMult = 2.15;
    else if (tier === 'ult') tierMult = 1.65;
    else if (tier === 'skill') tierMult = 1.32;

    let mult = (stats.heroDmgMult || 1.0) * (stats.feverDmgMult || 1.0) * tierMult;

    if (monster && (monster.isBoss || monster.isMiniBoss || monster.isEndlessStageBoss)) {
      mult *= stats.bossDmgMult || 1.0;
    }

    const critChance = Math.max(0, Math.min(0.95, stats.critChance || 0.08));
    const critMult = Math.max(1.2, stats.critMult || 1.65);
    const rolledCrit = Boolean(isCrit) || Math.random() < critChance;
    if (rolledCrit) {
      mult *= critMult;
    }

    if ((monster?.staggerBreakTimer || 0) > 0) {
      mult *= 1.55;
    } else if (monster?.isBoss && (monster.vulnerableTimer || 0) > 0) {
      mult *= 1.45;
    }

    return Math.max(4, Math.round(amount * mult));
  }

  onPlayerHitMonster(attacker, monster, dealt) {
    if (!attacker || !Number.isFinite(dealt) || dealt <= 0) return;
    if (attacker.isTapSmite) return;

    const eco = this.endless?.economy;
    if (attacker.isEndlessCompanion) {
      if (!attacker._companionDpsAlreadyRecorded) {
        eco?.recordDamageSample?.('companion', dealt);
      }
      return;
    }

    eco?.recordDamageSample?.('hero', dealt);

    const stats = eco?.getComputedStats?.() || {};
    const gaugeMult = stats.gaugeGainMult || 1.0;
    this.comboHits++;
    this.comboTimer = 3.2;

    // Lifesteal sustain from Soul Siphon Relic
    const lsPct = stats.lifestealPct || 0;
    const player = this.endless?.game?.leftFighter || attacker;
    if (lsPct > 0 && player && !player.isDead && player.hp < player.maxHp) {
      this._lifestealFrac += dealt * lsPct;
      if (this._lifestealFrac >= 1) {
        const healAmt = Math.min(
          Math.max(1, Math.round(player.maxHp * 0.08)),
          Math.floor(this._lifestealFrac)
        );
        this._lifestealFrac -= healAmt;
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
      }
    }

    // Boost Spirit, Overdrive (mana) & Supreme Ultimate (finisherGauge) by gaugeGainMult
    const tier = this.resolveOutgoingCastTier(dealt, attacker, attacker._advActiveCastSource || null);
    if (tier === 'skill') {
      this.ultCharge = Math.min(100, this.ultCharge + (monster?.isBoss ? 5.5 : 4.2) * gaugeMult);
      this.astralCharge = Math.min(100, this.astralCharge + 2.4 * gaugeMult);
    } else if (tier === 'auto') {
      this.gainSpirit(11 * gaugeMult);
      const comboBoost = this.comboHits >= 8 ? 1.35 : this.comboHits >= 4 ? 1.15 : 1.0;
      this.ultCharge = Math.min(100, this.ultCharge + 3.6 * comboBoost * gaugeMult);
      this.astralCharge = Math.min(100, this.astralCharge + 1.8 * gaugeMult);
      if (attacker.skillCooldown > 0 && this._skillCdShaveThrottle <= 0) {
        attacker.skillCooldown = Math.max(0, attacker.skillCooldown - 0.14 * (stats.hasteMult || 1));
        this._skillCdShaveThrottle = 0.30;
      }
    }
    this.syncGaugesToPlayer(attacker);
  }

  onPlayerCastBasicAttack(player, target, game, opts = {}) {
    if (!player || !game?.vfx) return;
    const dir = (player.facing || 1) >= 0 ? 1 : -1;
    const isFreeAim = Boolean(this.endless?.skillSets?.isManualFreeAim?.());

    const rangedExCfg = RANGED_EX_LV1_PROJECTILES[player.heroId];
    if (rangedExCfg && !opts.heroAlreadySpawnedProjectile) {
      const sx = player.x + dir * 48;
      const sy = (player.y || player.groundY) - 106;
      const speed = rangedExCfg.speed;
      let vx = dir * speed;
      let vy = 0;

      if (
        !isFreeAim &&
        target &&
        !target.isDead &&
        !target.isDummyFocal &&
        (target.x - player.x) * dir > 12
      ) {
        const dx = target.x - sx;
        const ty = target.isColossalBoss ? target.y - 135 : (target.y || target.groundY) - 96;
        const rawDy = ty - sy;
        const absDx = Math.max(90, Math.abs(dx));
        const clampedSlope = Math.max(-0.24, Math.min(0.24, rawDy / absDx));
        const mag = Math.hypot(1, clampedSlope) || 1;
        vx = (dir * speed) / mag;
        vy = (clampedSlope * speed) / mag;
      }

      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        groundY: player.groundY || player.y,
        vx,
        vy,
        radius: rangedExCfg.radius,
        color: rangedExCfg.color,
        coreColor: rangedExCfg.coreColor,
        owner: player,
        damage: Math.max(48, Math.round(player.attackDamage || 56)),
        type: rangedExCfg.type,
        pierce: rangedExCfg.pierce,
        maxRange: 680,
        isMeteor: false,
        advCastSource: 'auto'
      });
      return;
    }

    if (player.heroId === 'ronin' || player.heroId === 'ronin_ex') {
      this._seekerShotCounter++;
      const variant = (((player._autoVariant ?? 0) % 4) + 4) % 4;
      if (this._seekerShotCounter % 2 !== 0 && variant !== 1 && variant !== 3) return;
      const sx = player.x + dir * 52;
      const sy = (player.y || player.groundY) - 76;
      const speed = 780;
      game.vfx.spawnProjectile({
        x: sx,
        y: sy,
        groundY: player.groundY || player.y,
        vx: dir * speed,
        vy: 0,
        radius: 18,
        color: '#38bdf8',
        coreColor: '#ffffff',
        owner: player,
        damage: 48,
        type: 'ronin_slash',
        isMeteor: false,
        pierce: true,
        maxRange: 640,
        ignoreTargets: player._lastAutoMeleeHitFoes || null,
        advCastSource: 'auto'
      });
    }
  }

  update(dt, player) {
    if (this._skillCdShaveThrottle > 0) {
      this._skillCdShaveThrottle = Math.max(0, this._skillCdShaveThrottle - dt);
    }
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer <= 0) this.comboHits = 0;
    }
    if (player && !player.isDead) {
      const stats = this.getComputedStats();
      this.syncMaxHpWithEconomy(player);
      // Natural Spirit focus regeneration
      if (this.spirit < this.maxSpirit) {
        this.gainSpirit(8.5 * (stats.hasteMult || 1) * dt);
      }
      // Passive HP/s Regen from Aegis Vitality Relic
      const regenPct = stats.hpRegenPct || 0;
      if (regenPct > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * regenPct * dt);
      }
      this.syncGaugesToPlayer(player);
    }
  }
}

/**
 * Endless Crusade Mode Coordinator (`EndlessManager`)
 *
 * Infinite forward-scrolling 2.5D clicker/idle action-RPG loop:
 * - 4 cycling Realms (`Eclipse Sanctum`, `Cursed Starwood`, `Ossuary Necropolis`, `The Black Pit`) -> Ascended Loop II+
 * - 5 escalating Waves per Stage + 40s Timed Stage Boss (Crowned Warden or every 5th stage Colossal Behemoth Malphas)
 * - Zero-Punishment Boss Retreat -> continuous Wave Farming Loop until player clicks `CHALLENGE BOSS`
 * - Tap/Click Anywhere -> Arcane Tap-Smite Sky-Bolt + Magnetic Coin Scoop + Tap-Fever Overdrive
 * - AUTO ON by default with seamless manual 360-degree controls + 5 action orbs + up to 3 HD-2D Companions
 */
export class EndlessManager {
  constructor(game) {
    this.game = game;
    this.economy = new EndlessEconomy();
    this.companions = new EndlessCompanions(this);
    this.shopUI = new EndlessShopUI(this);
    this.skillSets = new AdventureSkillSets(this);
    this.progression = new EndlessProgressionAdapter(this);

    this.active = false;
    this.autoPlay = true; // AUTO ON by default in Endless Crusade
    this.manualTargetLock = false;
    this.lockedMonster = null;

    this.depthMinY = ENDLESS_DEPTH_MIN_Y;
    this.depthMaxY = ENDLESS_DEPTH_MAX_Y;
    this.depthMidY = ENDLESS_DEPTH_MID_Y;

    this.stage = 1;
    this.bestStage = 1;
    this.waveInStage = 1;
    this.wavesPerStage = 5;

    this.isBossEncounter = false;
    this.bossFarmMode = false;
    this.bossTimer = 0;
    this.bossTimerMax = 40;
    this.bossEntity = null;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;

    this.corridorOriginX = 240;
    this.corridorMinX = 60;
    this.corridorMaxX = 1480;
    this.lockActive = true;
    this.lockMinX = 60;
    this.lockMaxX = 1480;

    this.coins = [];
    this.tapSmites = [];
    this.feverBursts = [];
    this.portals = [];
    this.monsterPlumes = [];
    this.floatingCallouts = [];

    this.bannerText = '';
    this.bannerSubText = '';
    this.bannerColor = '#facc15';
    this.bannerTimer = 0;
    this.zoneIndex = 0;

    // Input state
    this.keys = {};
    this.joyVec = { x: 0, y: 0, active: false };
    this.attackHeld = false;
    this.smoothVelX = 0;
    this.smoothVelY = 0;
    this.queuedAction = null;
    this.queuedActionTimer = 0;
    this.comboResetTimer = 0;
    this._comboLockTarget = null;

    // Adventure HUD & cooldown compatibility fields
    this.isSkillTreeOpen = false;
    this.isRelicDraftOpen = false;
    this.totalWaveLabel = 'STAGE 1 • WAVE 1/5';
    this.monstersKilled = 0;
    this.score = 0;
    this.goPromptActive = false;
    this.goBlinkTimer = 0;
    this.autoCdMax = 0.44;
    this.skillCdMax = 4.2;
    this.dodgeCdMax = 1.25;
    this._renderedIconHero = null;
    this._renderedMageIconsReady = false;
    this._renderedHeroIconsReady = false;

    // Internal flow & timers
    this._waveAdvancePending = false;
    this._waveAdvanceTargetX = 240;
    this._waveAdvanceElapsed = 0;
    this._waveSpawnDelay = 0;
    this._pendingSpawnKind = 'wave'; // 'wave' | 'boss'
    this._farmWaveCount = 0;
    this._phoenixInvulnTimer = 0;
    this._bossPortalX = 0;
    this._bossPortalActive = false;
    this._autoSaveAccum = 0;
    this._uiSyncAccum = 0;
    this._lastCompanionSyncSig = '';
    this._clock = 0;

    this._boundKeyDown = (e) => this.onKeyDown(e);
    this._boundKeyUp = (e) => this.onKeyUp(e);
    this._boundBlur = () => this.clearHeldInputs();
    this._boundPageHide = () => {
      if (this.active) this.saveNow();
    };
    this._listenersAttached = false;
  }

  attachListeners() {
    if (this._listenersAttached || typeof window === 'undefined') return;
    this._listenersAttached = true;
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    window.addEventListener('blur', this._boundBlur);
    window.addEventListener('pagehide', this._boundPageHide);
  }

  clearHeldInputs() {
    this.keys = {};
    this.joyVec = { x: 0, y: 0, active: false };
    this.attackHeld = false;
    this.smoothVelX = 0;
    this.smoothVelY = 0;
    this.queuedAction = null;
    this.queuedActionTimer = 0;
    this._comboLockTarget = null;
    this.syncJoystickKnobUI();
  }

  onKeyDown(e) {
    if (!this.active || this.game?.isLandingOpen || this.game?.isMatchOver || this.game?.isPaused) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.keys.left = true;
      this.syncJoystickKnobUI();
      e.preventDefault?.();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.keys.right = true;
      this.syncJoystickKnobUI();
      e.preventDefault?.();
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      this.keys.up = true;
      this.syncJoystickKnobUI();
      e.preventDefault?.();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.keys.down = true;
      this.syncJoystickKnobUI();
      e.preventDefault?.();
    } else if (code === 'KeyJ') {
      this.attackHeld = true;
      this.triggerAction('attack');
      e.preventDefault?.();
    } else if (code === 'KeyK' || code === 'KeyX') {
      this.triggerAction('skill');
      e.preventDefault?.();
    } else if (
      code === 'KeyL' ||
      code === 'KeyC' ||
      code === 'Space' ||
      code === 'ShiftLeft' ||
      code === 'ShiftRight'
    ) {
      this.triggerAction('dodge');
      e.preventDefault?.();
    } else if (code === 'KeyU' || code === 'KeyQ') {
      this.triggerAction('overdrive');
      e.preventDefault?.();
    } else if (code === 'KeyI' || code === 'KeyE') {
      this.triggerAction('ultimate');
      e.preventDefault?.();
    } else if (code === 'KeyP') {
      this.toggleAutoPlay(true);
      e.preventDefault?.();
    } else if (!this.autoPlay && (code === 'Tab' || code === 'KeyR')) {
      this.toggleTargetLock(true);
      e.preventDefault?.();
    } else if (code === 'KeyB' && this.bossFarmMode && !this.isBossEncounter) {
      this.challengeBoss();
      e.preventDefault?.();
    } else if (code === 'KeyT') {
      this.shopUI?.toggleDrawer?.();
      e.preventDefault?.();
    }
  }

  onKeyUp(e) {
    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.keys.left = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.keys.right = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      this.keys.up = false;
      this.syncJoystickKnobUI();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.keys.down = false;
      this.syncJoystickKnobUI();
    } else if (code === 'KeyJ') {
      this.attackHeld = false;
    }
  }

  get player() {
    return this.game?.leftFighter || null;
  }

  getWorldWidth() {
    return Math.max(9600, this.corridorMaxX + 2400);
  }

  getActiveStageBounds() {
    const colossalAlive = Boolean(
      this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
    );
    if (colossalAlive) {
      const anchorX = this.bossEntity.anchorX || this.lockMaxX - 180;
      return {
        minX: this.lockMinX,
        maxX: Math.max(this.lockMinX + 240, anchorX - 85)
      };
    }
    return { minX: this.lockMinX, maxX: this.lockMaxX };
  }

  getBossAnchorX() {
    return this.bossEntity?.anchorX || Math.round(this.lockMaxX - 180);
  }

  getBossMaxWalkX() {
    return this.getBossAnchorX() - 85;
  }

  getBossMinWalkX() {
    return Math.max(60, this.lockMinX);
  }

  getCurrentRealm() {
    const safeStage = Math.max(1, Math.floor(this.stage || 1));
    const realmIndex = (safeStage - 1) % ENDLESS_REALMS.length;
    const ascendedLoop = Math.floor((safeStage - 1) / ENDLESS_REALMS.length) + 1;
    return {
      ...ENDLESS_REALMS[realmIndex],
      realmIndex,
      ascendedLoop
    };
  }

  _prewarmRealmAssets(realmIndex = 0) {
    const idx = ((realmIndex | 0) % ENDLESS_REALMS.length + ENDLESS_REALMS.length) % ENDLESS_REALMS.length;
    PixelForge.ensureAdventureLoaded?.(idx);
    const realm = ENDLESS_REALMS[idx];
    if (realm) {
      for (const mk of realm.monsters) {
        PixelForge.ensureMonsterLoaded?.(mk);
      }
      PixelForge.ensureMonsterLoaded?.(realm.warden);
    }
    if (this.stage % 5 === 0 || (this.stage + 1) % 5 === 0) {
      PixelForge.ensureHeroLoaded?.('archfiend');
      PixelForge.ensureMonsterLoaded?.('fiend');
    }
    const assets = PixelForge.initAssets?.();
    if (assets?.endlessVfx) {
      PixelForge.ensureImage?.(assets.endlessVfx);
    }
    const compKeys = this.companions?.getActiveHeroKeys?.() || [];
    for (const hk of compKeys) {
      PixelForge.ensureHeroLoaded?.(hk);
    }
  }

  showBanner(text, subText = '', color = '#facc15', duration = 2.4) {
    this.bannerText = String(text || '').toUpperCase();
    this.bannerSubText = String(subText || '').toUpperCase();
    this.bannerColor = color || '#facc15';
    this.bannerTimer = Math.max(0.5, duration || 2.4);
  }

  spawnFloatingCallout(x, y, text, color = '#facc15', scale = 1, maxLife = 0.95) {
    if (!text) return;
    while (this.floatingCallouts.length >= 32) {
      this.floatingCallouts.shift();
    }
    this.floatingCallouts.push({
      x: Math.round(x),
      y: Math.round(y),
      vy: -54,
      text: String(text).toUpperCase(),
      color: color || '#facc15',
      scale: scale >= 2 ? 2 : 1,
      age: 0,
      maxLife: Math.max(0.35, maxLife)
    });
  }

  // =========================================================================
  // LIFECYCLE: START, STOP, SAVE, RESET
  // =========================================================================

  startRun(playerFighter, { resumeSaved = true } = {}) {
    this.attachListeners();
    this.active = true;
    this.isSkillTreeOpen = false;
    this.isRelicDraftOpen = false;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this.clearHeldInputs();

    this.coins = [];
    this.tapSmites = [];
    this.feverBursts = [];
    this.portals = [];
    this.monsterPlumes = [];
    this.floatingCallouts = [];
    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerSubText = '';

    this.isBossEncounter = false;
    this.bossEntity = null;
    this.bossTimer = 0;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this._bossPortalActive = false;
    this._waveAdvancePending = false;
    this._waveAdvanceElapsed = 0;
    this._waveSpawnDelay = 0;
    this._farmWaveCount = 0;
    this._phoenixInvulnTimer = 0;
    this._autoSaveAccum = 0;
    this._uiSyncAccum = 0;
    this._clock = 0;
    this.monstersKilled = 0;
    this.score = 0;

    // Load or initialize persistent Endless Crusade save state
    const canResume = Boolean(
      resumeSaved && !this.game?.simMode && !this.game?.urlAutoPlay
    );
    let loadedSnap = null;
    if (canResume && typeof this.economy.loadFromStorage === 'function') {
      loadedSnap = this.economy.loadFromStorage();
    }
    if (loadedSnap) {
      this.economy.importSaveSnapshot(loadedSnap);
      const compSnap = loadedSnap.companions || loadedSnap.companionSnapshot || null;
      if (compSnap) {
        this.companions.importSnapshot(compSnap);
      } else {
        this.companions.reset();
      }
      this.stage = Math.max(1, Math.floor(this.economy.stage || 1));
      this.bestStage = Math.max(this.stage, Math.floor(this.economy.bestStage || this.stage));
      this.waveInStage = Math.max(
        1,
        Math.min(this.wavesPerStage, Math.floor(this.economy.waveInStage || 1))
      );
      this.bossFarmMode = Boolean(loadedSnap.meta?.bossFarmMode);
      if (typeof loadedSnap.meta?.autoPlay === 'boolean') {
        this.autoPlay = loadedSnap.meta.autoPlay;
      } else {
        this.autoPlay = true;
      }
    } else {
      this.economy.resetRunState({ keepMeta: !resumeSaved });
      this.companions.reset();
      this.stage = Math.max(1, Math.floor(this.economy.stage || 1));
      this.bestStage = Math.max(this.stage, Math.floor(this.economy.bestStage || this.stage));
      this.waveInStage = 1;
      this.bossFarmMode = false;
      this.autoPlay = true;
    }

    this.economy.stage = this.stage;
    this.economy.bestStage = this.bestStage;
    this.economy.waveInStage = this.waveInStage;
    this.economy.activeHeroId =
      playerFighter?.heroId || this.game?.slot1Hero || this.economy.activeHeroId || 'mage_ex';

    const realm = this.getCurrentRealm();
    this.zoneIndex = realm.realmIndex;

    // Initialize infinite corridor origin
    this.corridorOriginX = 240;
    this.corridorMinX = 60;
    this.corridorMaxX = this.corridorOriginX + ENDLESS_CORRIDOR_WIDTH - 180;
    this.lockMinX = this.corridorMinX;
    this.lockMaxX = this.corridorMaxX;
    this.lockActive = true;

    this.progression.resetForRun();
    if (playerFighter) {
      this.skillSets.attachToFighter(playerFighter);
      this.progression.attachToFighter(playerFighter);

      playerFighter.x = this.corridorOriginX;
      playerFighter.groundY = this.depthMidY;
      playerFighter.y = this.depthMidY;
      playerFighter.facing = 1;
      playerFighter.team = 1;
      playerFighter.isPlayerControlled = true;
      playerFighter.isManualAdventureControl = true;
      playerFighter.adventureAutoPlay = this.autoPlay;
      playerFighter._manualWalkActive = false;
      playerFighter._manualSpeedRatio = 0;
      playerFighter._advPureDodge = false;
      playerFighter._advPureDodgeTimer = 0;
      playerFighter._advDodgeFrameOverride = null;
      playerFighter._advRecentCastSource = null;
      playerFighter._advRecentCastTimer = 0;
      playerFighter._advActiveCastSource = null;
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

      this.autoCdMax = playerFighter.autoInterval || 0.44;
      this.skillCdMax = Math.max(3.6, (playerFighter.skillMaxCooldown || 4.5) * 1.1);
      this.dodgeCdMax = 1.25;
      this.game.fighters = [playerFighter];
    } else {
      this.game.fighters = [];
    }

    this._renderedIconHero = null;
    this._renderedMageIconsReady = false;
    this._renderedHeroIconsReady = false;

    const renderer = this.game?.renderer;
    if (renderer) {
      renderer.worldWidth = this.getWorldWidth();
      renderer.adventureMode = true;
      renderer.adventureHook = this;
      renderer.stageId = realm.stageId;
      renderer.permanentStageOverride = null;
      renderer.trueUltStageOverride = null;
      renderer.trueUltStageAlpha = 0;
      renderer.adventureCamMinX = Math.max(0, this.corridorMinX - 60);
      renderer.adventureCamMaxX = this.corridorMaxX + 180;
      renderer.camX = this.corridorOriginX + 240;
      renderer.camY = this.depthMidY - 95;
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

    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('victory-overlay')?.classList?.remove('is-defeat-plaque');
      document.getElementById('hud-right')?.classList?.add?.('hidden');
    }

    this._prewarmRealmAssets(this.zoneIndex);
    if (playerFighter) {
      this.companions.syncEntitiesWithWorld(playerFighter);
      this._lastCompanionSyncSig = this._computeCompanionSyncSig();
      this.refreshActionIcons(playerFighter.heroId || 'mage_ex');
    }

    this.shopUI?.mount?.();
    this.shopUI?.setVisible?.(true);

    this._spawnWaveMonsters();
    this.showBanner(
      `STAGE ${this.stage} • ${realm.name}`,
      realm.ascendedLoop > 1
        ? `ASCENDED LOOP ${realm.ascendedLoop} • TAP TO SMITE!`
        : 'AUTO CRUSADE ACTIVE • TAP TO SMITE!',
      realm.accentHex,
      2.4
    );

    if (!this.game?.isLandingOpen && !this.game?.simMode) {
      this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
    }

    this.syncStageBadge();
    this.syncRightHUD();
    this.syncControlDeckUI();
    this.shopUI?.sync?.(this.getUiSnapshot(), true);
  }

  stopRun({ save = true } = {}) {
    // Scoop any floating coins before exiting so player never loses earned gold
    if (this.coins.length > 0) {
      this._scoopAllCoinsInstant();
    }
    if (save && this.active) {
      this.saveNow();
    }

    const player = this.game?.leftFighter;
    if (player) {
      if (player._advPureDodge) {
        this.finishHeroAdventureDodge(player, false);
      }
      player._advDodgeFrameOverride = null;
      player._advDodgeTrails = [];
      player._hnsStreaks = [];
      player.isManualAdventureControl = false;
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      player._advPureDodge = false;
      player._advPureDodgeTimer = 0;
      player._advRecentCastSource = null;
      player._advRecentCastTimer = 0;
      player._advActiveCastSource = null;
      player._grabbedByBoss = false;
      player._grabbedByBossTimer = 0;
      player.isInvulnerable = false;
      this.progression.detachFromFighter(player);
      this.skillSets.detachFromFighter(player);
    }

    this.bossEntity?.releaseGrabbedTarget?.();
    this.active = false;
    this.manualTargetLock = false;
    this.lockedMonster = null;
    this.isBossEncounter = false;
    this.bossEntity = null;
    this.bossTimer = 0;
    this.bossWarningTimer = 0;
    this.bossSpawnPending = false;
    this._bossPortalActive = false;
    this._waveAdvancePending = false;
    this.lockActive = false;
    this.coins = [];
    this.tapSmites = [];
    this.feverBursts = [];
    this.portals = [];
    this.monsterPlumes = [];
    this.floatingCallouts = [];
    this.clearHeldInputs();

    this.shopUI?.setVisible?.(false);

    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      document.getElementById('hud-right')?.classList?.remove?.('hidden');
    }

    const renderer = this.game?.renderer;
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
          : renderer.isMobile
            ? 0.72
            : 1.0;
    }

    this.syncControlDeckUI();
  }

  saveNow() {
    if (!this.economy || typeof this.economy.saveToStorage !== 'function') return null;
    if (this.game?.simMode || this.game?.urlAutoPlay) return null;
    this.economy.stage = this.stage;
    this.economy.bestStage = Math.max(this.economy.bestStage || 1, this.bestStage);
    this.economy.waveInStage = this.waveInStage;
    const compSnap = this.companions?.exportSnapshot?.() || null;
    const metaSnap = {
      autoPlay: this.autoPlay,
      bossFarmMode: this.bossFarmMode,
      stage: this.stage,
      bestStage: this.bestStage,
      waveInStage: this.waveInStage
    };
    return this.economy.saveToStorage(compSnap, metaSnap);
  }

  resetEndlessRun() {
    this.economy.resetRunState({ keepMeta: true });
    this.companions.reset();
    this.stage = 1;
    this.bestStage = Math.max(1, this.economy.bestStage || 1);
    this.waveInStage = 1;
    this.isBossEncounter = false;
    this.bossFarmMode = false;
    this.bossTimer = 0;
    this.bossEntity?.releaseGrabbedTarget?.();
    this.bossEntity = null;
    this._bossPortalActive = false;
    this._waveAdvancePending = false;
    this._farmWaveCount = 0;
    this.coins = [];
    this.tapSmites = [];
    this.feverBursts = [];
    this.portals = [];
    this.monsterPlumes = [];
    this.floatingCallouts = [];

    this.economy.stage = 1;
    this.economy.waveInStage = 1;
    const realm = this.getCurrentRealm();
    this.zoneIndex = realm.realmIndex;

    this.corridorOriginX = 240;
    this.corridorMinX = 60;
    this.corridorMaxX = this.corridorOriginX + ENDLESS_CORRIDOR_WIDTH - 180;
    this.lockMinX = this.corridorMinX;
    this.lockMaxX = this.corridorMaxX;
    this.lockActive = true;

    const player = this.game?.leftFighter;
    if (player) {
      this.progression.resetForRun();
      this.progression.syncMaxHpWithEconomy(player);
      player.hp = player.maxHp;
      player.isDead = false;
      player.x = this.corridorOriginX;
      player.groundY = this.depthMidY;
      player.y = this.depthMidY;
      player.facing = 1;
      player.setState('IDLE');
      this.game.fighters = [player];
      this.companions.syncEntitiesWithWorld(player);
    }

    if (this.game?.renderer) {
      this.game.renderer.worldWidth = this.getWorldWidth();
      this.game.renderer.stageId = realm.stageId;
      this.game.renderer.adventureCamMinX = Math.max(0, this.corridorMinX - 60);
      this.game.renderer.adventureCamMaxX = this.corridorMaxX + 180;
      this.game.renderer.camX = this.corridorOriginX + 240;
    }

    this._spawnWaveMonsters();
    this.showBanner('CRUSADE RESET', 'STAGE 1 • ECLIPSE SANCTUM', '#38bdf8', 2.2);
    this.saveNow();
    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), true);
    return true;
  }

  // =========================================================================
  // SHOP & COMPANION ACTION HELPERS (CALLED BY UI OR DIRECTLY)
  // =========================================================================

  buyRelic(relicId, bulkModeOverride = null) {
    if (!this.economy || typeof this.economy.buyRelic !== 'function') {
      return { ok: false, bought: 0, spent: 0, newLevel: 0 };
    }
    const res = this.economy.buyRelic(relicId, bulkModeOverride);
    if (res?.ok) {
      const player = this.game?.leftFighter;
      if (player) {
        this.progression.syncMaxHpWithEconomy(player);
      }
      this.game?.audio?.play?.('holy_hit', player?.x || 600);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return res;
  }

  setBulkMode(mode) {
    if (mode === 'x1' || mode === 'x10' || mode === 'MAX') {
      this.economy.bulkMode = mode;
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return this.economy.bulkMode;
  }

  recruitCompanion(id) {
    const res = this.companions?.recruit?.(id, this.economy);
    if (res?.ok) {
      const player = this.game?.leftFighter;
      if (player) this.companions.syncEntitiesWithWorld(player);
      this._lastCompanionSyncSig = this._computeCompanionSyncSig();
      this.game?.audio?.play?.('holy_hit', player?.x || 600);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), true);
    }
    return res || { ok: false };
  }

  upgradeCompanion(id) {
    const res = this.companions?.upgrade?.(id, this.economy);
    if (res?.ok) {
      const player = this.game?.leftFighter;
      if (player) this.companions.syncEntitiesWithWorld(player);
      this._lastCompanionSyncSig = this._computeCompanionSyncSig();
      this.game?.audio?.play?.('clock_gear', player?.x || 600);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }
    return res || { ok: false };
  }

  toggleCompanionDeploy(id) {
    const res = this.companions?.toggleDeploy?.(id);
    if (res?.ok) {
      const player = this.game?.leftFighter;
      if (player) this.companions.syncEntitiesWithWorld(player);
      this._lastCompanionSyncSig = this._computeCompanionSyncSig();
      this.game?.audio?.play?.('clock_gear', player?.x || 600);
      this.saveNow();
      this.shopUI?.sync?.(this.getUiSnapshot(), true);
    }
    return res || { ok: false };
  }

  _computeCompanionSyncSig() {
    const slots = this.companions?.activeSlots || [];
    const rs = this.companions?.rosterState || {};
    return slots.map((id) => `${id}:${rs[id]?.level || 0}`).join('|');
  }

  // =========================================================================
  // WAVE & BOSS ENCOUNTER ENGINE
  // =========================================================================

  _despawnAllMonsters() {
    if (!Array.isArray(this.game?.fighters)) return;
    const player = this.game.leftFighter;
    for (const f of this.game.fighters) {
      if (f && f.isColossalBoss) {
        f.releaseGrabbedTarget?.();
      }
    }
    this.game.fighters = player ? [player] : [];
    this.bossEntity = null;
  }

  _spawnEndlessMonster(kind, x, opts = {}) {
    const lanePool = [480, 526, 561, 604, 646];
    const count = this.game?.fighters ? this.game.fighters.length : 0;
    const rawGy = Number.isFinite(opts.groundY) ? opts.groundY : lanePool[count % lanePool.length];
    const gy = Math.max(this.depthMinY + 12, Math.min(this.depthMaxY - 12, rawGy));
    const player = this.game?.leftFighter;
    const facing = opts.isColossalBoss ? -1 : player && player.x > x ? 1 : -1;

    const stageIdx = Math.max(0, (this.stage || 1) - 1);
    const waveIdx = Math.max(0, (this.waveInStage || 1) - 1);
    const baseHp = ENDLESS_MONSTER_BASE_HP[kind] || 320;
    const defaultScaledHp = Math.max(
      40,
      Math.round(
        baseHp *
          Math.pow(1.28, stageIdx) *
          (1 + waveIdx * 0.08) *
          (opts.isElite ? 1.45 : 1.0)
      )
    );
    const defaultDmgScale = 0.56 * Math.pow(1.14, stageIdx) * (opts.isElite ? 1.12 : 1.0);

    const spawnOpts = {
      ...opts,
      maxHp: Number.isFinite(opts.maxHp) && opts.maxHp > 0 ? Math.round(opts.maxHp) : defaultScaledHp,
      dmgScale: Number.isFinite(opts.dmgScale) && opts.dmgScale > 0 ? opts.dmgScale : defaultDmgScale
    };

    const m =
      kind === 'archfiend'
        ? new ArchfiendBoss(x, gy, -1, spawnOpts)
        : new Monster(kind, x, gy, facing, spawnOpts);

    m.game = this.game;
    m.team = 2;
    m.groundY = gy;
    m.y = gy;
    if (kind === 'archfiend') {
      m.anchorX = x;
      m.anchorGroundY = gy;
      m.x = x;
      m.facing = -1;
      m.isBoss = true;
      m.isColossalBoss = true;
      m.isEndlessStageBoss = true;
    } else if (opts.isEndlessStageBoss) {
      m.isEndlessStageBoss = true;
    }

    if (this.game?.fighters) {
      this.game.fighters.push(m);
    }
    if (!this.game.rightFighter || this.game.rightFighter.isDead || m.isEndlessStageBoss) {
      this.game.rightFighter = m;
    }

    // Back-wall dimensional summoning portal (y = 446, adv_fx_sheet.png)
    if (!opts.skipPortal && kind !== 'archfiend') {
      const portalZone = this.zoneIndex;
      const portalX = Math.max(this.lockMinX + 86, Math.min(this.lockMaxX - 86, Math.round(x)));
      this.portals.push({
        x: portalX,
        groundY: 446,
        targetGroundY: gy,
        zone: portalZone,
        facing,
        age: 0,
        maxLife: 1.55,
        isElite: Boolean(opts.isElite),
        primaryColor: m.primaryColor || '#38bdf8',
        seed: (this.portals.length * 1.7 + portalX * 0.01) % 6.28
      });
      m.portalEmergeFromX = portalX;
      m.portalEmergeFromY = 450;
    }

    if (this.game?.vfx) {
      const fxX = Number.isFinite(m.portalEmergeFromX) ? m.portalEmergeFromX : x;
      const fxY = Number.isFinite(m.portalEmergeFromY) ? m.portalEmergeFromY - 56 : gy - 24;
      this.game.vfx.spawnShockwave(fxX, fxY, m.isEndlessStageBoss ? 220 : 92, m.primaryColor, 0.34, true);
      this.game.vfx.spawnBurst(fxX, fxY - 10, m.isEndlessStageBoss ? 24 : 12, m.primaryColor, 200, {
        upBias: 115,
        size: 5
      });
    }

    return m;
  }

  _spawnWaveMonsters() {
    const realm = this.getCurrentRealm();
    const waveNum = Math.max(1, Math.min(this.wavesPerStage, this.waveInStage));
    const count = this.bossFarmMode ? 4 : waveNum <= 2 ? 3 : waveNum <= 4 ? 4 : 5;
    const lanes = [480, 561, 642, 514, 608];

    const playerX = this.game?.leftFighter?.x ?? this.corridorOriginX;
    const minSpawnX = Math.max(this.lockMinX + 380, playerX + 260);
    const maxSpawnX = this.lockMaxX - 110;
    const span = Math.max(180, maxSpawnX - minSpawnX);

    for (let i = 0; i < count; i++) {
      const kind = realm.monsters[i % realm.monsters.length] || 'templar';
      const frac = count > 1 ? i / (count - 1) : 0.5;
      const sx = Math.round(minSpawnX + frac * span);
      const gy = lanes[(i + waveNum + this._farmWaveCount) % lanes.length];
      const isElite =
        (this.bossFarmMode && i === count - 1) ||
        (waveNum >= 3 && i === count - 1) ||
        (waveNum >= 5 && i === 1);
      this._spawnEndlessMonster(kind, sx, { groundY: gy, isElite });
    }

    this.totalWaveLabel = this.bossFarmMode
      ? `STAGE ${this.stage} • FARMING`
      : `STAGE ${this.stage} • WAVE ${this.waveInStage}/${this.wavesPerStage}`;
    this.syncStageBadge();
    this.syncRightHUD();
  }

  startBossEncounter() {
    if (!this.active) return false;
    this._despawnAllMonsters();
    this._waveAdvancePending = false;
    this._waveSpawnDelay = 0;

    const realm = this.getCurrentRealm();
    const stats = this.economy.getComputedStats();
    this.isBossEncounter = true;
    this.bossFarmMode = false;
    this.bossTimerMax = 40 + (stats.bossTimerBonusSec || 0);
    this.bossTimer = this.bossTimerMax;

    this.lockMinX = this.corridorMinX;
    this.lockMaxX = this.corridorMaxX;
    this.lockActive = true;

    const bossX = Math.round(this.lockMaxX - 180);
    this._bossPortalX = bossX;
    this._bossPortalActive = true;

    const player = this.game?.leftFighter;
    const isColossal = this.stage % 5 === 0;
    if (player) {
      const safeRight = isColossal ? bossX - 165 : bossX - 240;
      if (player.x > safeRight) player.x = Math.max(this.lockMinX + 60, safeRight);
      if (player.x < this.lockMinX + 40) player.x = this.lockMinX + 80;
      player.facing = 1;
    }

    if (this.game?.renderer) {
      this.game.renderer.worldWidth = this.getWorldWidth();
      this.game.renderer.adventureCamMinX = Math.max(0, this.lockMinX - 60);
      this.game.renderer.adventureCamMaxX = this.lockMaxX + 180;
    }

    if (isColossal) {
      PixelForge.ensureHeroLoaded?.('archfiend');
      const colossalHp = Math.round(11800 * Math.pow(1.30, Math.max(0, this.stage - 5)));
      const bossDmgMult = 0.72 * Math.pow(1.14, Math.max(0, this.stage - 1));
      const tierNum = Math.floor(this.stage / 5);
      const bossName = tierNum > 1 ? `BEHEMOTH MALPHAS MK-${tierNum}` : 'BEHEMOTH MALPHAS';
      this.bossEntity = this._spawnEndlessMonster('archfiend', bossX, {
        groundY: this.depthMidY,
        name: bossName,
        maxHp: colossalHp,
        dmgScale: bossDmgMult,
        bossDmgMult,
        skipPortal: true,
        isEndlessStageBoss: true
      });
      this.totalWaveLabel = `STAGE ${this.stage} • COLOSSAL BOSS`;
      this.showBanner(
        `STAGE ${this.stage} COLOSSAL BOSS`,
        `${bossName} • ${Math.round(this.bossTimerMax)}S TIMER!`,
        '#ef4444',
        2.8
      );
      if (!this.game?.isLandingOpen && !this.game?.simMode) {
        this.game?.audio?.play?.('eclipse_charge', bossX);
        this.game?.audio?.playBgm?.('bgm_boss_malphas');
      }
      this.game?.renderer?.triggerShake?.(14, 0.55);
    } else {
      const baseHp = ENDLESS_MONSTER_BASE_HP[realm.warden] || 360;
      const wardenHp = Math.round(baseHp * Math.pow(1.28, Math.max(0, this.stage - 1)) * 4.8);
      const wardenDmgScale = 0.65 * Math.pow(1.14, Math.max(0, this.stage - 1));
      this.bossEntity = this._spawnEndlessMonster(realm.warden, bossX, {
        groundY: this.depthMidY,
        isMiniBoss: true,
        isElite: true,
        isEndlessStageBoss: true,
        wardenName: realm.wardenName,
        wardenTitle: `STAGE ${this.stage} WARDEN`,
        maxHp: wardenHp,
        dmgScale: wardenDmgScale,
        spriteScale: realm.warden === 'treant' || realm.warden === 'brute' ? 1.38 : 1.28,
        skipPortal: true
      });
      this.totalWaveLabel = `STAGE ${this.stage} • WARDEN BOSS`;
      this.showBanner(
        `STAGE ${this.stage} BOSS: ${realm.wardenName}`,
        `SLAY WITHIN ${Math.round(this.bossTimerMax)}S TO ADVANCE!`,
        realm.accentHex,
        2.6
      );
      this.game?.audio?.play?.('eclipse_charge', bossX);
      this.game?.renderer?.triggerShake?.(8, 0.32);
    }

    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return true;
  }

  challengeBoss() {
    if (!this.active || this.isBossEncounter) return false;
    for (let i = 0; i < this.coins.length; i++) {
      if (this.coins[i]) this.coins[i].magnetForced = true;
    }
    return this.startBossEncounter();
  }

  toggleAutoBoss(val = undefined) {
    this.economy.autoBoss = val === undefined ? !this.economy.autoBoss : Boolean(val);
    this.saveNow();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
    return this.economy.autoBoss;
  }

  _advanceCorridorForNextWave(nextSpawnKind = 'wave') {
    this.corridorOriginX += ENDLESS_CORRIDOR_STEP_X;
    this.corridorMinX = Math.max(60, this.corridorOriginX - 240);
    this.corridorMaxX = this.corridorOriginX + ENDLESS_CORRIDOR_WIDTH - 180;

    // Smoothly unlock right side so hero & companions march forward into the new arena
    this.lockActive = false;
    this.lockMaxX = this.corridorMaxX;
    this._waveAdvancePending = true;
    this._waveAdvanceTargetX = this.corridorOriginX + 80;
    this._waveAdvanceElapsed = 0;
    this._pendingSpawnKind = nextSpawnKind;

    if (this.game?.renderer) {
      this.game.renderer.worldWidth = this.getWorldWidth();
      this.game.renderer.adventureCamMaxX = this.corridorMaxX + 180;
    }
  }

  _handleBossDefeated(boss) {
    // Banish any remaining adds cleanly
    for (const m of this.getLivingMonsters()) {
      if (m !== boss && !m.isDead) {
        m.hp = 0;
        m.isDead = true;
        m.setState('DEATH');
      }
    }

    const clearedStage = this.stage;
    const isColossal = Boolean(boss?.isColossalBoss || clearedStage % 5 === 0);
    const bx = boss?.isColossalBoss ? (boss.anchorX || boss.x) - 110 : boss?.x || this.corridorOriginX + 420;
    const bGy = boss?.groundY || this.depthMidY;

    // Huge Sovereign Gold Coin shower + Astral Shards!
    const rawBossGold = this.economy.computeMonsterGoldReward(clearedStage, {
      isElite: true,
      isWarden: !isColossal,
      isColossalBoss: isColossal
    });
    const instantGold = Math.round(rawBossGold * 0.35);
    const showerGold = Math.max(1, rawBossGold - instantGold);
    if (instantGold > 0) {
      this.economy.addGold(instantGold, { isBoss: true, applyMult: true });
    }
    this.spawnGoldCoins(bx, bGy, showerGold, {
      count: isColossal ? 18 : 12,
      isBoss: true,
      applyMult: true
    });

    const shardCount = clearedStage % 5 === 0 ? Math.max(2, Math.floor(clearedStage / 2)) : 1;
    this.economy.addAstralShards(shardCount);
    this._spawnAstralShardVisuals(bx, bGy, Math.min(6, shardCount));

    this.economy.bossesSlain = (this.economy.bossesSlain || 0) + 1;
    this.isBossEncounter = false;
    this.bossTimer = 0;
    this._bossPortalActive = false;
    this.bossEntity = null;

    // Advance Stage & cycle Realm seamlessly
    this.stage = clearedStage + 1;
    this.bestStage = Math.max(this.bestStage, this.stage);
    this.waveInStage = 1;
    this.bossFarmMode = false;
    this._farmWaveCount = 0;
    this.economy.stage = this.stage;
    this.economy.bestStage = Math.max(this.economy.bestStage || 1, this.bestStage);
    this.economy.waveInStage = 1;

    const nextRealm = this.getCurrentRealm();
    this.zoneIndex = nextRealm.realmIndex;
    this._prewarmRealmAssets(this.zoneIndex);

    if (this.game?.renderer && !this.game.renderer.permanentStageOverride) {
      this.game.renderer.stageId = nextRealm.stageId;
    }

    if (isColossal && !this.game?.isLandingOpen && !this.game?.simMode) {
      this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
    }
    this.game?.audio?.play?.('holy_hit', bx);
    this.game?.renderer?.triggerShake?.(isColossal ? 12 : 7, 0.34);

    this.spawnFloatingCallout(
      bx,
      bGy - 165,
      `+${shardCount} ASTRAL SHARD${shardCount === 1 ? '' : 'S'}!`,
      '#38bdf8',
      2,
      1.45
    );
    this.showBanner(
      `STAGE ${clearedStage} CLEAR!`,
      `+${shardCount} ASTRAL SHARD${shardCount === 1 ? '' : 'S'} • ENTERING ${nextRealm.name}`,
      '#facc15',
      2.8
    );

    this.saveNow();
    this._advanceCorridorForNextWave('wave');
    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
  }

  _handleBossRetreat(reason = 'timeout') {
    if (!this.isBossEncounter) return;
    const player = this.game?.leftFighter;
    this.bossEntity?.releaseGrabbedTarget?.();
    this._despawnAllMonsters();

    this.isBossEncounter = false;
    this.bossTimer = 0;
    this._bossPortalActive = false;
    this.bossFarmMode = true;
    this._farmWaveCount = 0;

    // Zero-punishment full revive + 2.0s golden invulnerability (100% Gold/Relics/Companions/Stage kept!)
    if (player) {
      this._revivePlayerPhoenix(player, false);
    }

    if (!this.game?.isLandingOpen && !this.game?.simMode) {
      this.game?.audio?.playBgm?.('bgm_adventure_pilgrimage');
    }

    this.showBanner(
      'BOSS RETREATED • FARMING WAVE',
      reason === 'hp'
        ? 'HERO RESTORED 100% HP • UPGRADE & CLICK CHALLENGE BOSS!'
        : 'TIME UP • 100% GOLD KEPT • FARM & CLICK CHALLENGE BOSS!',
      '#fb923c',
      3.2
    );

    this._waveSpawnDelay = 0.55;
    this.totalWaveLabel = `STAGE ${this.stage} • FARMING`;
    this.saveNow();
    this.syncStageBadge();
    this.syncRightHUD();
    this.shopUI?.sync?.(this.getUiSnapshot(), false);
  }

  _revivePlayerPhoenix(player, showPhoenixBanner = true) {
    if (!player) return;
    player.isDead = false;
    player.hp = player.maxHp;
    player.deathTimer = 0;
    player.hurtTimer = 0;
    player.stunTimer = 0;
    player.isRooted = false;
    player._grabbedByBoss = false;
    player._grabbedByBossTimer = 0;
    player._advPureDodge = false;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY || this.depthMidY;
    player.setState('IDLE');
    player.isInvulnerable = true;
    this._phoenixInvulnTimer = 2.0;

    if (this.game) {
      this.game.isMatchOver = false;
      this.game.victoryRevealPending = false;
      this.game.deadMatchFighter = null;
    }

    this.game?.audio?.play?.('holy_hit', player.x);
    this.game?.vfx?.spawnShockwave?.(player.x, (player.groundY || player.y) - 12, 220, '#facc15', 0.42, true);
    this.game?.vfx?.spawnBurst?.(player.x, player.y - 72, 24, '#fef08a', 240, { upBias: 155, size: 6 });

    // Knock back nearby regular monsters to give safe breathing room
    for (const m of this.getLivingMonsters()) {
      if (m.isColossalBoss) continue;
      const dx = m.x - player.x;
      if (Math.abs(dx) <= 280) {
        const pushDir = dx >= 0 ? 1 : -1;
        m.x = Math.max(this.lockMinX + 24, Math.min(this.lockMaxX - 24, m.x + pushDir * 140));
        m.vx = pushDir * 220;
      }
    }

    if (showPhoenixBanner) {
      this.spawnFloatingCallout(player.x, player.y - 165, 'PHOENIX SURGE! 100% HP', '#facc15', 2, 1.3);
      this.showBanner('PHOENIX SURGE!', '100% HP RESTORED • 0 GOLD LOST', '#facc15', 1.8);
    }
  }

  handlePlayerZeroHp(player) {
    if (!this.active) return;
    if (this.isBossEncounter) {
      this._handleBossRetreat('hp');
    } else {
      this._revivePlayerPhoenix(player || this.game?.leftFighter, true);
    }
  }

  onPlayerDeath(player) {
    this.handlePlayerZeroHp(player);
  }

  onBossPhaseShift(boss, phase) {
    if (!this.active || !boss) return;
    const anchorX = boss.anchorX || this.getBossAnchorX();
    if (phase === 2) {
      this._spawnEndlessMonster('fiend', Math.max(this.lockMinX + 120, anchorX - 620), { groundY: 486 });
      this._spawnEndlessMonster('fiend', Math.max(this.lockMinX + 160, anchorX - 480), { groundY: 636 });
    }
  }

  onMonsterGuardBroken(monster, _attacker = null) {
    if (!this.active || !monster) return;
    const sx = monster.isColossalBoss ? (monster.anchorX || monster.x) - 110 : monster.x;
    const sy = (monster.groundY || monster.y || 561) - 140;
    this.spawnFloatingCallout(sx, sy, 'GUARD BREAK! 1.55X', '#facc15', 2, 1.1);
  }

  onMonsterDeath(deadMonster) {
    if (!this.active || !deadMonster || deadMonster._endlessDeathHandled) return;
    deadMonster._endlessDeathHandled = true;
    this.monstersKilled++;
    this.economy.totalKills = (this.economy.totalKills || 0) + 1;
    this.score += deadMonster.scoreValue || 250;

    if (
      deadMonster === this.bossEntity ||
      deadMonster.isEndlessStageBoss ||
      deadMonster.isBoss
    ) {
      this._handleBossDefeated(deadMonster);
      return;
    }

    // Normal / Elite monster gold drop + plume VFX
    const rawGold = this.economy.computeMonsterGoldReward(this.stage, {
      isElite: Boolean(deadMonster.isElite),
      isWarden: false,
      isColossalBoss: false
    });
    this.spawnGoldCoins(deadMonster.x, deadMonster.groundY || this.depthMidY, rawGold, {
      count: deadMonster.isElite ? 6 : 3,
      isBoss: false,
      applyMult: true
    });

    const vfxRow = deadMonster.getMonsterStageVfxRow?.() ?? 10;
    this.spawnMonsterPlume(
      deadMonster.x,
      deadMonster.groundY,
      vfxRow,
      deadMonster.primaryColor || '#38bdf8',
      deadMonster.isElite ? 1.9 : 1.5,
      0.46,
      deadMonster.isElite ? 7 : 5
    );

    const player = this.game?.leftFighter;
    if (player && !player.isDead) {
      this.progression.gainAdventureUlt(7, player);
      this.progression.gainSpirit(10);
    }

    this.syncRightHUD();
  }

  // =========================================================================
  // COINS, ASTRAL SHARDS & ARCANE TAP-SMITE
  // =========================================================================

  spawnGoldCoins(x, groundY, totalRawGold, { count = 4, isBoss = false, applyMult = true } = {}) {
    if (!Number.isFinite(totalRawGold) || totalRawGold <= 0) return;
    const roundedTotal = Math.max(1, Math.round(totalRawGold));
    const n = Math.max(1, Math.min(20, Math.min(roundedTotal, count | 0)));
    const basePerCoin = Math.floor(roundedTotal / n);
    const remainder = roundedTotal - basePerCoin * n;
    const gy = Math.max(this.depthMinY + 12, Math.min(this.depthMaxY - 12, groundY || this.depthMidY));

    for (let i = 0; i < n; i++) {
      while (this.coins.length >= 64) {
        const oldest = this.coins.shift();
        if (oldest && oldest.kind === 'gold' && oldest.rawGold > 0) {
          this.economy.addGold(oldest.rawGold, { isBoss: oldest.isBoss, applyMult: oldest.applyMult });
        }
      }
      const spread = (i - (n - 1) * 0.5) * 26 + (Math.random() * 18 - 9);
      const laneOff = (Math.random() - 0.5) * 34;
      const targetGy = Math.max(this.depthMinY + 12, Math.min(this.depthMaxY - 12, gy + laneOff));
      this.coins.push({
        kind: 'gold',
        x: x + spread * 0.35,
        y: targetGy - 18,
        groundY: targetGy,
        vx: spread * 2.2,
        vy: -(180 + Math.random() * 110),
        rawGold: basePerCoin + (i === 0 ? remainder : 0),
        isBoss: Boolean(isBoss),
        applyMult: Boolean(applyMult),
        magnetForced: false,
        age: 0,
        frameOffset: (i * 2) % 12
      });
    }
  }

  _spawnAstralShardVisuals(x, groundY, count = 2) {
    const n = Math.max(1, Math.min(8, count | 0));
    const gy = Math.max(this.depthMinY + 12, Math.min(this.depthMaxY - 12, groundY || this.depthMidY));
    for (let i = 0; i < n; i++) {
      const spread = (i - (n - 1) * 0.5) * 32;
      this.coins.push({
        kind: 'shard',
        x: x + spread * 0.4,
        y: gy - 26,
        groundY: gy,
        vx: spread * 2.0,
        vy: -(230 + Math.random() * 90),
        rawGold: 0,
        isBoss: true,
        applyMult: false,
        magnetForced: true,
        age: 0,
        frameOffset: (i * 3) % 12
      });
    }
  }

  _scoopAllCoinsInstant() {
    let totalAdded = 0;
    for (const c of this.coins) {
      if (c && c.kind === 'gold' && c.rawGold > 0) {
        totalAdded += this.economy.addGold(c.rawGold, { isBoss: c.isBoss, applyMult: c.applyMult });
      }
    }
    this.coins = [];
    return totalAdded;
  }

  _updateCoins(dt, player) {
    if (!this.coins.length) return;
    const stats = this.economy.getComputedStats();
    const baseRadius = Math.max(180, stats.coinMagnetRadius || 210);
    const px = player ? player.x : this.corridorOriginX;
    const pGy = player ? player.groundY || player.y || this.depthMidY : this.depthMidY;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.age += dt;

      // Arc physics before settling on road
      if (c.y < c.groundY || c.vy < 0) {
        c.vy += 680 * dt;
        c.y += c.vy * dt;
        c.x += (c.vx || 0) * dt;
        c.vx *= Math.max(0, 1 - dt * 3.5);
        if (c.y >= c.groundY) {
          c.y = c.groundY;
          c.vy = 0;
          c.vx = 0;
        }
      }

      // Magnetic vacuum pull (auto-pulls after 0.85s or immediately when magnetForced / within radius)
      const dx = px - c.x;
      const dz = pGy - c.groundY;
      const dist = Math.hypot(dx, dz * 1.25);
      const shouldPull =
        player &&
        (c.magnetForced || c.age >= 0.85 || (c.age >= 0.20 && dist <= baseRadius));

      if (shouldPull && dist > 6) {
        const pullSpeed = (c.magnetForced ? 760 : 460 + Math.min(340, c.age * 240)) * dt;
        c.x += (dx / dist) * pullSpeed;
        c.groundY += (dz / dist) * pullSpeed * 0.9;
        if (c.vy === 0) c.y = c.groundY;
      }

      if (dist <= 62 || c.age >= 3.2) {
        this.coins.splice(i, 1);
        if (c.kind === 'gold' && c.rawGold > 0) {
          const gained = this.economy.addGold(c.rawGold, {
            isBoss: c.isBoss,
            applyMult: c.applyMult
          });
          if (gained > 0 && (c.isBoss || Math.random() < 0.45)) {
            this.spawnFloatingCallout(
              px + (Math.random() * 28 - 14),
              pGy - 134,
              `+${formatEndlessNumber(gained)}G`,
              '#fde047',
              1,
              0.72
            );
          }
        }
        if (this.game?.audio && Math.random() < 0.35) {
          this.game.audio.play('clock_gear', px);
        }
      }
    }
  }

  handleCanvasTap(worldX, worldY, _screenX = 0, _screenY = 0) {
    if (!this.active || this.game?.isPaused || this.game?.isLandingOpen) {
      return { hit: false };
    }

    const wx = Number.isFinite(worldX) ? worldX : this.game?.leftFighter?.x || this.corridorOriginX;
    const wy = Number.isFinite(worldY)
      ? Math.max(this.depthMinY, Math.min(this.depthMaxY, worldY))
      : this.depthMidY;

    // 1. Immediately magnetize Sovereign Gold Coins within 220px toward the hero!
    let scooped = 0;
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (!c) continue;
      const d = Math.hypot(c.x - wx, (c.groundY || c.y) - wy);
      if (d <= 220) {
        c.magnetForced = true;
        scooped++;
      }
    }

    // 2. Find nearest alive monster within 260px of tap, else nearest alive monster on screen
    const living = this.getLivingMonsters();
    let target = null;
    let bestNearDist = 260;
    let fallbackTarget = null;
    let bestFallbackDist = Infinity;

    const camX = this.game?.renderer?.camX ?? wx;
    const halfView =
      this.game?.renderer && this.game.renderer.width > 0
        ? (this.game.renderer.width * 0.5) / Math.max(0.25, this.game.renderer.zoom || 0.76) + 120
        : 900;

    for (let i = 0; i < living.length; i++) {
      const m = living[i];
      if (!m || m.isDead) continue;
      const mx = m.isColossalBoss ? (m.anchorX || m.x) - 105 : m.x;
      const my = m.isColossalBoss ? (m.anchorGroundY || this.depthMidY) - 85 : (m.groundY || m.y) - 54;
      const d = Math.hypot(mx - wx, my - wy);
      const nearCap = m.isColossalBoss ? 340 : 260;
      if (d <= nearCap && d < bestNearDist) {
        bestNearDist = d;
        target = m;
      }
      if (Math.abs(mx - camX) <= halfView && d < bestFallbackDist) {
        bestFallbackDist = d;
        fallbackTarget = m;
      }
    }
    if (!target) {
      target = fallbackTarget || living[0] || null;
    }

    if (!target) {
      // Visual sky-bolt tap spark on empty ground
      this.tapSmites.push({
        x: wx,
        groundY: wy,
        kind: 'bolt',
        age: 0,
        maxLife: 0.34,
        scale: 1.05
      });
      this.game?.audio?.play?.('hit_light', wx);
      return { hit: false, scooped };
    }

    const isBoss = Boolean(
      target.isBoss || target.isMiniBoss || target.isEndlessStageBoss || target === this.bossEntity
    );
    const smite = this.economy.computeTapSmiteHit(this.stage, { isBoss }) || {
      damage: 12,
      isCrit: false,
      feverActive: false,
      feverTier: 0,
      feverTriggered: false,
      goldBonus: 0
    };
    const dmg = Math.max(1, Math.round(smite.damage || 10));
    const tx = target.isColossalBoss ? (target.anchorX || target.x) - 105 : target.x;
    const tGy = target.isColossalBoss ? target.anchorGroundY || this.depthMidY : target.groundY || target.y || this.depthMidY;

    const tapAttacker = {
      isTapSmite: true,
      isMonster: false,
      team: 1,
      x: tx,
      y: tGy,
      groundY: tGy,
      facing: 1,
      heroId: 'tap_smite'
    };

    const knockDir = target.isColossalBoss ? 0 : target.x >= (this.game?.leftFighter?.x || 0) ? 1 : -1;
    target.takeDamage(dmg, tapAttacker, Boolean(smite.isCrit), knockDir * 42, 0);
    this.economy.recordDamageSample('tap', dmg);
    if ((target.isDead || target.hp <= 0) && !target._endlessDeathHandled) {
      target.isDead = true;
      this.onMonsterDeath(target);
    }

    // Spawn TAP_SMITE_SKYBOLT (Row 2)
    while (this.tapSmites.length >= 24) this.tapSmites.shift();
    this.tapSmites.push({
      x: tx,
      groundY: tGy,
      kind: 'bolt',
      age: 0,
      maxLife: 0.38,
      scale: smite.isCrit ? 1.55 : 1.32
    });

    // Spawn CRIT_STARBURST (Row 3) when critical hit
    if (smite.isCrit) {
      this.tapSmites.push({
        x: tx,
        groundY: tGy - 62,
        kind: 'crit',
        age: 0,
        maxLife: 0.36,
        scale: 1.45
      });
    }

    // Spawn GOLD_FEVER_BURST (Row 4) when Tap-Fever Overdrive triggers!
    if (smite.feverTriggered) {
      while (this.feverBursts.length >= 8) this.feverBursts.shift();
      this.feverBursts.push({
        x: tx,
        groundY: tGy - 36,
        age: 0,
        maxLife: 0.56,
        scale: 1.95
      });
      const tierLabel = smite.feverTier >= 2 ? 'GOLD FEVER TIER II!' : 'GOLD FEVER OVERDRIVE!';
      const tierSub = smite.feverTier >= 2 ? '3X GOLD & MAXIMUM SURGE!' : '2X GOLD & HERO SURGE!';
      this.showBanner(tierLabel, tierSub, '#facc15', 2.0);
      this.game?.renderer?.triggerShake?.(9, 0.24);
      this.game?.audio?.play?.('holy_hit', tx);
    } else {
      this.game?.audio?.play?.(smite.isCrit ? 'raijin_slash' : 'holy_bolt', tx);
    }

    // Fever Bonus Gold Coins!
    if ((smite.goldBonus || 0) > 0) {
      this.spawnGoldCoins(tx, tGy, smite.goldBonus, {
        count: smite.feverTier >= 2 ? 3 : 1,
        isBoss: false,
        applyMult: true
      });
    }

    const dmgLabel = smite.isCrit
      ? `CRIT ${formatEndlessNumber(dmg)}!`
      : formatEndlessNumber(dmg);
    this.spawnFloatingCallout(
      tx + (Math.random() * 24 - 12),
      tGy - 118,
      dmgLabel,
      smite.isCrit ? '#fb923c' : '#38bdf8',
      smite.isCrit ? 2 : 1,
      0.85
    );

    if (this.game?.vfx) {
      this.game.vfx.spawnBurst(tx, tGy - 58, smite.isCrit ? 12 : 6, smite.isCrit ? '#facc15' : '#38bdf8', 180, {
        upBias: 110,
        size: 4
      });
    }

    return {
      hit: true,
      target,
      damage: dmg,
      isCrit: Boolean(smite.isCrit),
      feverActive: Boolean(smite.feverActive),
      feverTriggered: Boolean(smite.feverTriggered),
      scooped
    };
  }

  // =========================================================================
  // CONTROLS, AUTO-PLAY AI & PURE 3D DODGE
  // =========================================================================

  setJoystickVector(dx, dy, active = true) {
    if (!active) {
      this.joyVec = { x: 0, y: 0, active: false };
    } else {
      const mag = Math.hypot(dx || 0, dy || 0);
      const scale = mag > 1 ? 1 / mag : 1;
      this.joyVec = { x: (dx || 0) * scale, y: (dy || 0) * scale, active: true };
    }
    this.syncJoystickKnobUI();
  }

  setMoveInput(dir, pressed) {
    if (dir < 0) this.keys.uiLeft = Boolean(pressed);
    if (dir > 0) this.keys.uiRight = Boolean(pressed);
    this.syncJoystickKnobUI();
  }

  setDepthInput(dir, pressed) {
    if (dir < 0) this.keys.uiUp = Boolean(pressed);
    if (dir > 0) this.keys.uiDown = Boolean(pressed);
    this.syncJoystickKnobUI();
  }

  setAttackHeld(held) {
    this.attackHeld = Boolean(held);
  }

  triggerAction(action) {
    if (!this.active || this.game?.isMatchOver) return;
    this.queuedAction = action;
    this.queuedActionTimer = action === 'attack' ? 0.62 : 0.48;
  }

  setAutoPlay(val, playSound = false) {
    this.autoPlay = Boolean(val);
    const player = this.game?.leftFighter;
    if (player) {
      player.adventureAutoPlay = this.autoPlay;
      if (this.autoPlay) {
        player._manualWalkActive = false;
      }
    }
    this.syncControlDeckUI();
    if (playSound && this.game?.audio) {
      this.game.audio.play('clock_gear', player ? player.x : 600);
    }
  }

  toggleAutoPlay(playSound = true) {
    this.setAutoPlay(!this.autoPlay, playSound);
  }

  setTargetLock(enabled, playSound = false) {
    this.manualTargetLock = Boolean(enabled);
    const player = this.game?.leftFighter;
    if (this.manualTargetLock) {
      this.lockedMonster = this.getNearestLivingMonster(player);
    } else {
      this.lockedMonster = null;
      this._comboLockTarget = null;
    }
    this.syncControlDeckUI();
    if (playSound && this.game?.audio) {
      this.game.audio.play('clock_gear', player ? player.x : 600);
    }
  }

  toggleTargetLock(playSound = true) {
    this.setTargetLock(!this.manualTargetLock, playSound);
  }

  getActiveLockedMonster(player = this.game?.leftFighter) {
    if (!this.manualTargetLock) {
      this.lockedMonster = null;
      return null;
    }
    if (
      this.lockedMonster &&
      !this.lockedMonster.isDead &&
      (!this.game?.fighters || this.game.fighters.includes(this.lockedMonster))
    ) {
      return this.lockedMonster;
    }
    this.lockedMonster = this.getNearestLivingMonster(player);
    return this.lockedMonster;
  }

  shiftEntityDepth(entity, dz) {
    if (!entity || !Number.isFinite(dz) || dz === 0) return 0;
    const prevGy = Number.isFinite(entity.groundY) ? entity.groundY : this.depthMidY;
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

  getLivingMonsters() {
    if (!Array.isArray(this.game?.fighters)) return [];
    return this.game.fighters.filter((f) => f && f.team === 2 && !f.isDead);
  }

  getNearestLivingMonster(player) {
    const living = this.getLivingMonsters();
    if (!living.length) return null;
    if (!player) return living[0];
    const pGy = player.groundY || player.y || this.depthMidY;
    let best = living[0];
    let bestScore = Infinity;
    for (let i = 0; i < living.length; i++) {
      const m = living[i];
      const mGy = m.groundY || m.y || this.depthMidY;
      const depthDist = m.isColossalBoss ? 0 : (mGy - pGy) * 1.5;
      const score = Math.hypot(m.x - player.x, depthDist) - (m.isEndlessStageBoss ? 48 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  finishHeroAdventureDodge(player, returnToIdle = true) {
    if (!player) return;
    player._advPureDodge = false;
    player._advDodgeFrameOverride = null;
    player._advDodgeGhostStep = 0;
    player.isInvulnerable = (this._phoenixInvulnTimer || 0) > 0;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY;
    player.isAngelicAscent = false;
    player.wraithAlpha = 1.0;
    if (returnToIdle && !player.isDead && player.state === 'DODGE') {
      player.setState('IDLE');
    }
  }

  startHeroAdventureDodge(player, evadeX, evadeZ, stats) {
    if (!player) return;
    if (Math.abs(evadeX) > 0.15) {
      player.facing = evadeX > 0 ? 1 : -1;
    }
    this.dodgeCdMax = Math.max(0.45, 1.25 * (stats?.mobilityCdMult ?? 1));
    player.dodgeCooldown = this.dodgeCdMax;
    player.dashDir = evadeX >= 0 ? 1 : -1;
    player._advPureDodge = true;
    player._advPureDodgeTimer = 0;
    player._advPureDodgeDur = 0.26;
    player._advPureDodgeDirX = evadeX;
    player._advPureDodgeDirZ = evadeZ;
    player._advDodgeFrameOverride = 183;
    player.setState('DODGE');
    player._advPureDodge = true;
    player.dashDuration = 0.26;
    player.isInvulnerable = true;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY;
    this.progression.gainSpirit(16);
    this.game?.audio?.play?.('dash_whoosh', player.x);
    this.game?.vfx?.spawnShockwave?.(player.x, player.groundY - 6, 54, '#38bdf8', 0.18, true);
  }

  updateHeroAdventureDodge(dt, player) {
    player._manualWalkActive = false;
    player._manualSpeedRatio = 0;
    if (player.isDead || player.state !== 'DODGE') {
      this.finishHeroAdventureDodge(player, false);
      return false;
    }
    player._advPureDodgeTimer = (player._advPureDodgeTimer || 0) + dt;
    const dur = player._advPureDodgeDur || 0.26;
    const u = Math.min(1, player._advPureDodgeTimer / dur);
    const speedScale = 1.38 * (1 - 0.52 * u * u);
    player.x += (player._advPureDodgeDirX || 0) * 580 * speedScale * dt;
    this.shiftEntityDepth(player, (player._advPureDodgeDirZ || 0) * 340 * speedScale * dt);
    player._advDodgeFrameOverride = 182 + Math.min(24, Math.floor(u * 25));
    const liftY = Math.sin(u * Math.PI) * 14;
    player.isInvulnerable = true;
    player.vx = 0;
    player.vy = 0;
    player.y = player.groundY - liftY;

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

  _hasManualDirectionalInput() {
    if (this.joyVec.active && Math.hypot(this.joyVec.x, this.joyVec.y) > 0.08) return true;
    return Boolean(
      this.keys.left ||
        this.keys.right ||
        this.keys.up ||
        this.keys.down ||
        this.keys.uiLeft ||
        this.keys.uiRight ||
        this.keys.uiUp ||
        this.keys.uiDown
    );
  }

  _processPlayerStep(dt, player, target) {
    player.isPlayerControlled = true;
    player.isManualAdventureControl = true;
    player.adventureAutoPlay = this.autoPlay;

    if (this.queuedActionTimer > 0) {
      this.queuedActionTimer = Math.max(0, this.queuedActionTimer - dt);
      if (this.queuedActionTimer <= 0) this.queuedAction = null;
    }

    if (player.state === 'AUTO_ATTACK') {
      this.comboResetTimer = 1.85;
    } else if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
      if (this.comboResetTimer <= 0) {
        this._comboLockTarget = null;
        if (player.hasHackAndSlashCombo?.()) player.comboStep = 0;
      }
    }

    const stats = this.progression.getComputedStats();

    // Respect Boss Siege Grab lock
    if (player._grabbedByBoss && (player._grabbedByBossTimer || 0) > 0) {
      player._grabbedByBossTimer = Math.max(0, player._grabbedByBossTimer - dt);
      this.queuedAction = null;
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      if (player._grabbedByBossTimer <= 0) {
        player._grabbedByBoss = false;
        player.y = player.groundY;
      }
      player.update(dt, target, this.game);
      this.progression.syncGaugesToPlayer(player);
      return;
    }

    if (player._advPureDodge) {
      if (this.updateHeroAdventureDodge(dt, player)) {
        this.progression.syncGaugesToPlayer(player);
        return;
      }
    }

    const manualOverrideActive =
      !this.autoPlay ||
      this._hasManualDirectionalInput() ||
      this.attackHeld ||
      Boolean(this.queuedAction);

    if (!manualOverrideActive && this.autoPlay) {
      this._stepAutoPlayHero(dt, player, target, stats);
      return;
    }

    this._stepManualHero(dt, player, target, stats);
  }

  _stepAutoPlayHero(dt, player, target, stats) {
    const bounds = this.getActiveStageBounds();
    const minWalkX = bounds.minX;
    const maxWalkX = bounds.maxX;
    const depthMin = this.depthMinY + 12;
    const depthMax = this.depthMaxY - 12;
    const pGy = Number.isFinite(player.groundY) ? player.groundY : this.depthMidY;
    const bossAnchorX = this.getBossAnchorX();

    const hid = player.heroId || '';
    const isRangedEx = Boolean(RANGED_EX_LV1_PROJECTILES[hid]);
    const rawEffRange = player.getEffectiveAttackRange
      ? player.getEffectiveAttackRange()
      : player.attackRange || 180;
    const isRanged =
      isRangedEx ||
      ['mage', 'priestess', 'icemage', 'valkyrie', 'archer'].includes(hid) ||
      rawEffRange >= 290;
    const effRange = isRangedEx ? Math.max(500, rawEffRange) : isRanged ? Math.max(380, rawEffRange) : rawEffRange;
    const maxAutoVx = 295 * (stats.moveSpeedMult || 1);
    const maxAutoVz = 175 * (stats.moveSpeedMult || 1);

    const steerToward = (goalX, goalGy, stopDist = 18, faceOverride = null) => {
      const cx = Math.max(minWalkX + 14, Math.min(maxWalkX - 14, goalX));
      const cz = Math.max(depthMin, Math.min(depthMax, goalGy));
      const dx = cx - player.x;
      const dz = cz - pGy;
      const dist = Math.hypot(dx, dz * 1.25);
      if (dist > stopDist) {
        const inv = 1 / Math.max(1, Math.hypot(dx, dz));
        const vx = dx * inv * maxAutoVx;
        const vz = dz * inv * maxAutoVz;
        player.x = Math.max(minWalkX, Math.min(maxWalkX, player.x + vx * dt));
        this.shiftEntityDepth(player, vz * dt);
        player._manualWalkActive = true;
        player._manualSpeedRatio = 1.0;
        player.moveDir = 1;
        player.state = 'WALK';
        player.facing = faceOverride !== null ? faceOverride : vx >= 0 ? 1 : -1;
        return true;
      }
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      player.moveDir = 0;
      player.state = 'IDLE';
      if (faceOverride !== null) player.facing = faceOverride;
      return false;
    };

    // 1. Between-wave forward advance march
    if (!target) {
      if (!player.isDead && !(player.stunTimer > 0) && !player.isRooted && (player.state === 'IDLE' || player.state === 'WALK')) {
        const marchX = this._waveAdvancePending ? this._waveAdvanceTargetX : this.corridorOriginX + 120;
        const marchGy = this.depthMidY + Math.sin(this._clock * 2.1) * 32;
        steerToward(marchX, marchGy, 20, 1);
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
      }
      this.skillSets.beginPlayerStep(dt, player, null, Boolean(player._manualWalkActive), 0);
      player.update(dt, null, this.game);
      this.progression.syncGaugesToPlayer(player);
      return;
    }

    // 2. Active Combat Auto-Play (4-beat combos, Skills, Overdrive, Supreme Ultimates)
    const targetGy = target.isColossalBoss ? pGy : Number.isFinite(target.groundY) ? target.groundY : this.depthMidY;
    const absDx = Math.abs(target.x - player.x);
    const absDz = target.isColossalBoss ? 0 : Math.abs(targetGy - pGy);
    const isHackSlash = Boolean(player.hasHackAndSlashCombo?.());
    let isMovingCombat = false;

    if (!player.isDead && !(player.stunTimer > 0) && !player.isRooted) {
      if (player.state === 'IDLE' || player.state === 'WALK') {
        if (
          player.hasTrueUltimate &&
          this.progression.astralCharge >= 99.9 &&
          typeof player.updateTrueUltimate === 'function'
        ) {
          player._manualWalkActive = false;
          player.facing = target.x >= player.x ? 1 : -1;
          this.progression.astralCharge = 0;
          this.progression.syncGaugesToPlayer(player);
          if (player.stats) player.stats.ultsUsed++;
          player.setState('TRUE_ULTIMATE');
          this.game?.triggerTrueUltimateCinematic?.(player);
        } else if (
          this.progression.ultCharge >= 99.9 &&
          (target.isColossalBoss || (absDx <= Math.max(360, effRange * 1.35) && absDz <= 115))
        ) {
          player._manualWalkActive = false;
          player.facing = target.x >= player.x ? 1 : -1;
          this.progression.ultCharge = 0;
          this.progression.gainAstralRelic(stats.ultResonanceAstral || 24, player);
          this.progression.syncGaugesToPlayer(player);
          if (player.stats) player.stats.ultsUsed++;
          player.setState('ULTIMATE');
          this.game?.triggerUltimateCinematic?.(player);
        } else if (
          player.skillCooldown <= 0 &&
          (target.isColossalBoss || (absDx <= Math.max(255, effRange * 1.35) && absDz <= (isRanged ? 98 : 76))) &&
          this.progression.trySpendSkillSpirit()
        ) {
          player._manualWalkActive = false;
          player.facing = target.x >= player.x ? 1 : -1;
          this.skillCdMax = Math.max(2.2, (player.skillMaxCooldown || 4.2) * (stats.skillCdMult || 1));
          player.skillCooldown = this.skillCdMax;
          if (player.stats) player.stats.skillsUsed++;
          player.setState('SKILL');
        } else if (
          player.autoCooldown <= 0 &&
          (target.isColossalBoss
            ? isRanged
              ? player.x >= bossAnchorX - 850
              : player.x >= bossAnchorX - 195
            : absDx <= effRange * 0.96 && absDz <= (isRanged ? 96 : 52))
        ) {
          player._manualWalkActive = false;
          player.facing = target.x >= player.x ? 1 : -1;
          this._comboLockTarget = target;
          this.comboResetTimer = 1.85;
          player.setState('AUTO_ATTACK');
          const hasteDiv = Math.max(0.55, 1 / Math.max(0.5, stats.hasteMult || 1));
          if (isHackSlash) {
            if ((player.comboStep || 0) !== 0) {
              this.autoCdMax = 0.34 * hasteDiv;
              player.autoCooldown = player.heroId?.endsWith('_ex') ? 0.015 : 0.03;
            } else {
              this.autoCdMax = 0.50 * hasteDiv;
              player.autoCooldown = this.autoCdMax;
              this._comboLockTarget = null;
            }
          } else {
            this.autoCdMax = Math.max(0.24, (player.autoInterval || 0.44) * hasteDiv);
            player.autoCooldown = this.autoCdMax;
          }
        } else if (target.isColossalBoss) {
          const goalX = isRanged ? bossAnchorX - 450 : bossAnchorX - 118;
          const goalGy = this.depthMidY + Math.sin(this._clock * 1.8) * 42;
          isMovingCombat = steerToward(goalX, goalGy, 20, 1);
        } else {
          const idealDist = isRanged ? Math.min(320, effRange * 0.72) : Math.max(82, Math.min(126, effRange * 0.68));
          const goalX = player.x <= target.x ? target.x - idealDist : target.x + idealDist;
          const clampedGoalX = Math.max(minWalkX + 36, Math.min(maxWalkX - 36, goalX));
          isMovingCombat = steerToward(clampedGoalX, targetGy, 18, target.x >= player.x ? 1 : -1);
        }
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
      }
    }

    if (player.state !== 'AUTO_ATTACK' || (player.stateTimer || 0) < 0.04) {
      player._advLv1FallbackShot = false;
    }
    const prevDidAction = Boolean(player.didActionFrame);
    const prevProjLen = this.game?.vfx?.projectiles?.length || 0;
    const combatTarget = this.skillSets.resolveTarget(player, target);
    this.skillSets.beginPlayerStep(dt, player, combatTarget, isMovingCombat, 0);
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
  }

  _stepManualHero(dt, player, nearestMonster, stats) {
    const maxSpeedX = 320 * (stats.moveSpeedMult || 1);
    const maxSpeedZ = 195 * (stats.moveSpeedMult || 1);
    let rawDirX = 0;
    let rawDirY = 0;
    let targetVx = 0;
    let targetVy = 0;

    if (this.joyVec.active) {
      const mag = Math.hypot(this.joyVec.x, this.joyVec.y);
      if (mag > 0.06) {
        const u = Math.min(1, (mag - 0.06) / 0.72);
        const curved = Math.pow(u, 0.72);
        rawDirX = (this.joyVec.x / mag) * curved;
        rawDirY = (this.joyVec.y / mag) * curved;
        targetVx = rawDirX * maxSpeedX;
        targetVy = rawDirY * maxSpeedZ;
      }
    } else {
      const kbX = (this.keys.right || this.keys.uiRight ? 1 : 0) - (this.keys.left || this.keys.uiLeft ? 1 : 0);
      const kbY = (this.keys.down || this.keys.uiDown ? 1 : 0) - (this.keys.up || this.keys.uiUp ? 1 : 0);
      const mag = Math.hypot(kbX, kbY);
      if (mag > 0) {
        const inv = mag > 1 ? 1 / mag : 1;
        rawDirX = kbX * inv;
        rawDirY = kbY * inv;
        targetVx = rawDirX * maxSpeedX;
        targetVy = rawDirY * maxSpeedZ;
      }
    }

    const alpha = Math.min(1, dt * 38);
    this.smoothVelX += (targetVx - this.smoothVelX) * alpha;
    this.smoothVelY += (targetVy - this.smoothVelY) * alpha;
    if (Math.abs(targetVx) < 0.01 && Math.abs(this.smoothVelX) < 2) this.smoothVelX = 0;
    if (Math.abs(targetVy) < 0.01 && Math.abs(this.smoothVelY) < 2) this.smoothVelY = 0;

    const moveDirX = Math.abs(rawDirX) > 0.06 ? (rawDirX > 0 ? 1 : -1) : 0;
    player.manualMoveAxis = rawDirX;
    const isMoving3D = Math.hypot(this.smoothVelX, this.smoothVelY) > 1.2 || Math.hypot(rawDirX, rawDirY) > 0.015;

    if (!this.queuedAction && this.attackHeld) {
      this.queuedAction = 'attack';
      this.queuedActionTimer = 0.56;
    }

    const lockTarget = this.manualTargetLock
      ? this.getActiveLockedMonster(player)
      : this.autoPlay
        ? nearestMonster
        : null;

    const isInstantDodgeCancel =
      player.state === 'AUTO_ATTACK' && this.queuedAction === 'dodge' && player.dodgeCooldown <= 0;
    const isAttackRecoveryCancel =
      player.state === 'AUTO_ATTACK' &&
      player.didActionFrame &&
      this.queuedAction &&
      (this.queuedAction !== 'attack' || player.autoCooldown <= 0);
    const canAct =
      !player.isDead &&
      !(player.stunTimer > 0) &&
      !player.isRooted &&
      !player._advPureDodge &&
      (player.state === 'IDLE' || player.state === 'WALK' || isInstantDodgeCancel || isAttackRecoveryCancel);

    if (canAct && this.queuedAction) {
      const act = this.queuedAction;
      if (
        act === 'ultimate' &&
        player.hasTrueUltimate &&
        this.progression.astralCharge >= 99.9 &&
        typeof player.updateTrueUltimate === 'function'
      ) {
        this.queuedAction = null;
        if (lockTarget) player.facing = lockTarget.x >= player.x ? 1 : -1;
        else if (moveDirX !== 0) player.facing = moveDirX;
        this.progression.astralCharge = 0;
        this.progression.syncGaugesToPlayer(player);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('TRUE_ULTIMATE');
        this.game?.triggerTrueUltimateCinematic?.(player);
      } else if (act === 'overdrive' && this.progression.ultCharge >= 99.9) {
        this.queuedAction = null;
        if (lockTarget) player.facing = lockTarget.x >= player.x ? 1 : -1;
        else if (moveDirX !== 0) player.facing = moveDirX;
        this.progression.ultCharge = 0;
        this.progression.gainAstralRelic(stats.ultResonanceAstral || 24, player);
        this.progression.syncGaugesToPlayer(player);
        if (player.stats) player.stats.ultsUsed++;
        player.setState('ULTIMATE');
        this.game?.triggerUltimateCinematic?.(player);
      } else if (act === 'skill' && player.skillCooldown <= 0) {
        if (this.progression.trySpendSkillSpirit()) {
          this.queuedAction = null;
          if (lockTarget) player.facing = lockTarget.x >= player.x ? 1 : -1;
          else if (moveDirX !== 0) player.facing = moveDirX;
          this.skillCdMax = Math.max(2.2, (player.skillMaxCooldown || 4.2) * (stats.skillCdMult || 1));
          player.skillCooldown = this.skillCdMax;
          if (player.stats) player.stats.skillsUsed++;
          player.setState('SKILL');
        } else {
          this.queuedAction = null;
        }
      } else if (act === 'dodge' && player.dodgeCooldown <= 0) {
        this.queuedAction = null;
        const mag = Math.hypot(rawDirX, rawDirY);
        const evX = mag > 0.08 ? rawDirX / mag : player.facing || 1;
        const evZ = mag > 0.08 ? rawDirY / mag : 0;
        this.startHeroAdventureDodge(player, evX, evZ, stats);
        return;
      } else if (act === 'attack' && player.autoCooldown <= 0) {
        this.queuedAction = null;
        if (lockTarget) player.facing = lockTarget.x >= player.x ? 1 : -1;
        else if (moveDirX !== 0) player.facing = moveDirX;
        this.comboResetTimer = 1.85;
        player.setState('AUTO_ATTACK');
        const hasteDiv = Math.max(0.55, 1 / Math.max(0.5, stats.hasteMult || 1));
        if (player.hasHackAndSlashCombo?.()) {
          this.autoCdMax = 0.34 * hasteDiv;
          player.autoCooldown = (player.comboStep || 0) !== 0 ? 0.02 : this.autoCdMax;
        } else {
          this.autoCdMax = Math.max(0.24, (player.autoInterval || 0.44) * hasteDiv);
          player.autoCooldown = this.autoCdMax;
        }
      } else {
        this.queuedAction = null;
      }
    }

    if (!player.isDead && !(player.stunTimer > 0) && !player.isRooted && (player.state === 'IDLE' || player.state === 'WALK')) {
      if (isMoving3D) {
        player._manualWalkActive = true;
        player._manualSpeedRatio = 1.0;
        if (moveDirX !== 0) player.facing = moveDirX;
        player.moveDir = 1;
        player.state = 'WALK';
        player.x += this.smoothVelX * dt;
        this.shiftEntityDepth(player, this.smoothVelY * dt);
      } else {
        player._manualWalkActive = false;
        player._manualSpeedRatio = 0;
        player.moveDir = 0;
        player.state = 'IDLE';
      }
      this.skillSets.beginPlayerStep(dt, player, null, isMoving3D, rawDirY);
      player.update(dt, null, this.game);
    } else {
      player._manualWalkActive = false;
      player._manualSpeedRatio = 0;
      if (player.state === 'AUTO_ATTACK' && isMoving3D && !player.isHackAndSlashMelee?.()) {
        player.x += this.smoothVelX * 0.78 * dt;
        this.shiftEntityDepth(player, this.smoothVelY * 0.85 * dt);
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
      if (player.state === 'AUTO_ATTACK' && !prevDidAction && player.didActionFrame) {
        this.progression.onPlayerCastBasicAttack(player, lockTarget || combatTarget, this.game, {
          heroAlreadySpawnedProjectile
        });
      }
    }

    this.progression.syncGaugesToPlayer(player);
  }

  // =========================================================================
  // MAIN FIXED-STEP UPDATE LOOP
  // =========================================================================

  update(dt) {
    if (!this.active) return;
    const g = this.game;
    const player = g?.leftFighter;
    if (!player) return;

    const effDt = Math.min(0.05, Math.max(0, dt || 0));
    this._clock += effDt;
    this.goBlinkTimer += effDt;

    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - effDt);
    }
    if (this._phoenixInvulnTimer > 0) {
      this._phoenixInvulnTimer = Math.max(0, this._phoenixInvulnTimer - effDt);
      if (this._phoenixInvulnTimer <= 0 && !player._advPureDodge) {
        player.isInvulnerable = false;
      } else {
        player.isInvulnerable = true;
      }
    }

    // 1. Update Economy (Tap-Fever decay & 5s DPS/Gold metrics), Progression & SkillSets
    this.economy.update(effDt);
    this.progression.update(effDt, player);
    this.skillSets.update(effDt, player);

    // Keep companions synced if user recruited/deployed/upgraded directly via ShopUI
    const compSig = this._computeCompanionSyncSig();
    if (compSig !== this._lastCompanionSyncSig) {
      this.companions.syncEntitiesWithWorld(player);
      this._lastCompanionSyncSig = compSig;
    }

    // 2. Boss Encounter Countdown & Zero-Punishment Boss Fail
    if (this.isBossEncounter) {
      this.bossTimer = Math.max(0, this.bossTimer - effDt);
      if (player.isDead || player.hp <= 0) {
        this._handleBossRetreat('hp');
      } else if (this.bossTimer <= 0) {
        this._handleBossRetreat('timeout');
      }
    } else if (player.isDead || player.hp <= 0) {
      this._revivePlayerPhoenix(player, true);
    }

    // 3. Ensure any newly fallen monsters trigger death rewards once, then prune decayed corpses
    if (Array.isArray(g.fighters)) {
      for (let i = g.fighters.length - 1; i >= 0; i--) {
        const f = g.fighters[i];
        if (!f || !f.isMonster) continue;
        if ((f.isDead || f.hp <= 0) && !f._endlessDeathHandled) {
          f.isDead = true;
          this.onMonsterDeath(f);
        }
        if (f.isDead && (f.deathTimer || 0) >= 1.55) {
          g.fighters.splice(i, 1);
        }
      }
    }

    // 4. Wave Clear, Forward Corridor March & Boss Trigger
    const livingMonsters = this.getLivingMonsters();
    if (this._waveSpawnDelay > 0) {
      this._waveSpawnDelay = Math.max(0, this._waveSpawnDelay - effDt);
      if (this._waveSpawnDelay <= 0 && livingMonsters.length === 0 && !this.isBossEncounter) {
        this._spawnWaveMonsters();
      }
    } else if (this._waveAdvancePending) {
      this._waveAdvanceElapsed += effDt;
      const reachedTarget = player.x >= this._waveAdvanceTargetX - 64;
      const timedOut = this._waveAdvanceElapsed >= (this.autoPlay ? 1.15 : 1.55);
      if (reachedTarget || timedOut) {
        this._waveAdvancePending = false;
        this._waveAdvanceElapsed = 0;
        this.lockMinX = this.corridorMinX;
        this.lockMaxX = this.corridorMaxX;
        this.lockActive = true;
        if (player.x < this.lockMinX + 40) player.x = this.lockMinX + 60;
        if (g.renderer) {
          g.renderer.worldWidth = this.getWorldWidth();
          g.renderer.adventureCamMinX = Math.max(0, this.lockMinX - 60);
          g.renderer.adventureCamMaxX = this.lockMaxX + 180;
        }
        if (this._pendingSpawnKind === 'boss') {
          this.startBossEncounter();
        } else {
          this._spawnWaveMonsters();
        }
      }
    } else if (!this.isBossEncounter && this.lockActive && livingMonsters.length === 0) {
      if (this.bossFarmMode) {
        this._farmWaveCount++;
        this._advanceCorridorForNextWave('wave');
      } else if (this.waveInStage < this.wavesPerStage) {
        this.waveInStage++;
        this.economy.waveInStage = this.waveInStage;
        this._advanceCorridorForNextWave('wave');
      } else if (this.economy.autoBoss) {
        this._advanceCorridorForNextWave('boss');
      } else {
        this.bossFarmMode = true;
        this._farmWaveCount++;
        this._advanceCorridorForNextWave('wave');
      }
    }

    // 5. Update Player (AUTO or Manual) + Clamp Corridor Bounds
    const syncCastGrace = (isPost) => {
      if (player.state === 'TRUE_ULTIMATE') {
        player._advRecentCastSource = 'true_ult';
        player._advRecentCastTimer = 0.45;
      } else if (player.state === 'ULTIMATE') {
        player._advRecentCastSource = 'ult';
        player._advRecentCastTimer = 0.45;
      } else if (player.state === 'SKILL') {
        player._advRecentCastSource = 'skill';
        player._advRecentCastTimer = 0.45;
      } else if (isPost && (player._advRecentCastTimer || 0) > 0) {
        player._advRecentCastTimer = Math.max(0, player._advRecentCastTimer - effDt);
        if (player._advRecentCastTimer <= 0) player._advRecentCastSource = null;
      }
    };
    syncCastGrace(false);
    const nearestMonster = this.getNearestLivingMonster(player);
    this._processPlayerStep(effDt, player, nearestMonster);
    syncCastGrace(true);

    const colossalAlive = Boolean(
      this.bossEntity && !this.bossEntity.isDead && this.bossEntity.isColossalBoss
    );
    const bounds = this.getActiveStageBounds();
    this.skillSets.endPlayerStep(effDt, player, bounds.minX, bounds.maxX, colossalAlive);
    if (player.x < bounds.minX) player.x = bounds.minX;
    if (player.x > bounds.maxX) player.x = bounds.maxX;

    // 6. Update Active Monsters
    if (Array.isArray(g.fighters)) {
      for (const f of g.fighters) {
        if (!f || f === player) continue;
        f.update(effDt, player, g);
        if (this.lockActive && f.isMonster && !f.isDead && !f.isColossalBoss) {
          const mMin = bounds.minX + 18;
          const mMax = Math.max(mMin, bounds.maxX - 18);
          if (f.x < mMin) f.x = mMin;
          if (f.x > mMax) f.x = mMax;
        }
      }
    }

    // 7. Update Autonomous HD-2D Companions
    this.companions.update(effDt, player, this.getLivingMonsters(), this.economy, g);

    // 8. Update Magnetic Coins, Tap-Smites, Fever Bursts, Portals, Plumes & Floating Callouts
    this._updateCoins(effDt, player);
    for (let i = this.tapSmites.length - 1; i >= 0; i--) {
      this.tapSmites[i].age += effDt;
      if (this.tapSmites[i].age >= this.tapSmites[i].maxLife) this.tapSmites.splice(i, 1);
    }
    for (let i = this.feverBursts.length - 1; i >= 0; i--) {
      this.feverBursts[i].age += effDt;
      if (this.feverBursts[i].age >= this.feverBursts[i].maxLife) this.feverBursts.splice(i, 1);
    }
    for (let i = this.portals.length - 1; i >= 0; i--) {
      this.portals[i].age += effDt;
      if (this.portals[i].age >= this.portals[i].maxLife) this.portals.splice(i, 1);
    }
    for (let i = this.monsterPlumes.length - 1; i >= 0; i--) {
      this.monsterPlumes[i].age += effDt;
      if (this.monsterPlumes[i].age >= this.monsterPlumes[i].maxLife) this.monsterPlumes.splice(i, 1);
    }
    for (let i = this.floatingCallouts.length - 1; i >= 0; i--) {
      const fc = this.floatingCallouts[i];
      fc.age += effDt;
      fc.y += fc.vy * effDt;
      fc.vy *= Math.max(0, 1 - effDt * 2.4);
      if (fc.age >= fc.maxLife) this.floatingCallouts.splice(i, 1);
    }

    // 9. Auto-save every 10s + throttled UI sync (~10Hz)
    this._autoSaveAccum += effDt;
    if (this._autoSaveAccum >= 10.0) {
      this._autoSaveAccum = 0;
      this.saveNow();
    }

    this._uiSyncAccum += effDt;
    if (this._uiSyncAccum >= 0.10) {
      this._uiSyncAccum = 0;
      this.shopUI?.sync?.(this.getUiSnapshot(), false);
    }

    this.syncStageBadge();
    this.syncRightHUD();
    this.syncControlDeckUI();
  }

  // =========================================================================
  // COMPATIBILITY HOOKS FOR MONSTER, RENDERER & MAIN.JS
  // =========================================================================

  spawnMonsterPlume(
    x,
    groundY,
    vfxRow = 10,
    color = '#38bdf8',
    scale = 1.6,
    maxLife = 0.48,
    essenceSparks = 6
  ) {
    while (this.monsterPlumes.length >= 24) this.monsterPlumes.shift();
    const gy = Number.isFinite(groundY) ? groundY : this.depthMidY;
    this.monsterPlumes.push({
      x,
      groundY: gy,
      vfxRow: Math.max(0, Math.min(11, vfxRow | 0)),
      color: color || '#38bdf8',
      scale: Number.isFinite(scale) ? scale : 1.6,
      age: 0,
      maxLife: Math.max(0.18, maxLife || 0.48),
      essenceSparks: Math.max(0, Math.min(14, essenceSparks | 0)),
      seed: (Math.abs(x) * 0.13) % 6.28
    });
  }

  onPlayerHitMonsterRelicProc(_attacker, _monster, _dealt, _isCrit = false, _procOpts = {}) {
    // Reserved hook for Monster.takeDamage compatibility (Endless relics scale cleanly in progression)
  }

  getStandingProps() {
    if (!this.active) return [];
    const list = this.companions?.getActiveEntities?.();
    return Array.isArray(list) ? list : [];
  }

  // =========================================================================
  // RENDERING HOOKS (100% NEAREST-NEIGHBOR, 0 ROTATE / ELLIPSE / ARC, 0 EMOJIS)
  // =========================================================================

  renderWorldFloor(ctx, renderer) {
    if (!this.active || !ctx) return;
    const t = renderer?.time || this._clock || 0;
    const roadTop = 438;
    const roadBot = 684;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Back-wall Summoning Portal 2.5D Ground Rune Seals (`adv_fx_sheet.png`)
    if (this.portals.length > 0) {
      const assets = PixelForge.initAssets?.();
      const fxSheet = PixelForge.ensureImage?.(assets?.advFxSheet) || assets?.advFxSheet;
      const fxReady = isImgReady(fxSheet);
      for (const p of this.portals) {
        const u = Math.max(0, Math.min(1, p.age / p.maxLife));
        const openScale = p.age < 0.24 ? 0.3 + 0.7 * (p.age / 0.24) : u > 0.78 ? 1 - 0.55 * ((u - 0.78) / 0.22) : 1;
        const alpha = p.age < 0.14 ? p.age / 0.14 : u > 0.76 ? (1 - u) / 0.24 : 1;
        if (alpha <= 0.01) continue;
        const px = Math.round(p.x);
        const py = Math.round(p.groundY);
        const sealW = Math.round((p.isElite ? 192 : 172) * openScale);
        const sealH = Math.round((p.isElite ? 50 : 44) * openScale);
        const sealY = Math.round(Math.max(roadTop + Math.ceil(sealH * 0.5) + 1, py + 18));
        const z = Math.max(0, Math.min(3, p.zone | 0));

        ctx.globalAlpha = 0.48 * alpha;
        ctx.fillStyle = '#05070e';
        ctx.fillRect(Math.round(px - sealW * 0.45), py - 3, Math.round(sealW * 0.9), 6);

        ctx.globalAlpha = Math.min(0.92, alpha);
        if (fxReady && sealW >= 8 && sealH >= 6 && ctx.drawImage) {
          ctx.drawImage(
            fxSheet,
            (4 + z) * 128,
            512,
            128,
            128,
            Math.round(px - sealW * 0.5),
            Math.round(sealY - sealH * 0.5),
            sealW,
            sealH
          );
        } else {
          ctx.fillStyle = p.primaryColor || '#38bdf8';
          ctx.fillRect(Math.round(px - sealW * 0.4), sealY - 4, Math.round(sealW * 0.8), 8);
        }
      }
    }

    // 2. Boss Gate Portal Floor Aura (`endless_crusade_vfx.png` Row 6)
    if (this.isBossEncounter && this._bossPortalActive) {
      const bx = Math.round(this._bossPortalX || this.lockMaxX - 180);
      const bGy = this.depthMidY;
      const pulse = 0.72 + 0.22 * Math.sin(t * 5.2);
      ctx.globalAlpha = 0.46 * pulse;
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(bx - 96, bGy - 12, 192, 24);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(bx - 84, bGy - 8, 168, 16);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bx - 64, bGy - 4, 128, 8);
    }

    ctx.restore();

    // 3. SkillSet floor zones + Companion Floor Contact Shadows & Isometric Aura Rings
    this.skillSets.renderFloor(ctx);

    const compList = this.companions?.getActiveEntities?.() || [];
    if (compList.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = 'rgba(5, 7, 14, 0.46)';
      for (const comp of compList) {
        if (!comp) continue;
        const cx = Math.round(comp.x);
        const cGy = Math.round(comp.groundY || this.depthMidY);
        ctx.fillRect(cx - 26, cGy - 4, 52, 8);
        ctx.fillRect(cx - 20, cGy - 6, 40, 12);
      }
      ctx.restore();
    }
    this.companions?.renderFloorAuras?.(ctx, renderer);

    // 4. Monster 3D Floor Telegraph Rings
    if (Array.isArray(this.game?.fighters)) {
      for (const f of this.game.fighters) {
        if (f && f.isMonster && !f.isDead && typeof f.drawTelegraphRings === 'function') {
          f.drawTelegraphRings(ctx);
        }
      }
    }

    // 5. Wave-Gate Arcane Runes when locked
    if (this.lockActive) {
      const realm = this.getCurrentRealm();
      const pulse = 0.44 + 0.22 * Math.sin(t * 6.5);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const gateX of [this.lockMinX - 16, this.lockMaxX + 16]) {
        if (gateX <= 50) continue;
        const gx = Math.round(gateX);
        ctx.globalAlpha = pulse * 0.24;
        ctx.fillStyle = this.isBossEncounter ? '#ef4444' : realm.accentHex || '#facc15';
        ctx.fillRect(gx - 6, roadTop, 12, roadBot - roadTop);
        ctx.globalAlpha = pulse * 0.80;
        ctx.fillStyle = '#fef08a';
        for (let seg = 0; seg < 8; seg++) {
          const sy = Math.round(roadTop + ((seg * 32 + t * 52) % (roadBot - roadTop - 12)));
          ctx.fillRect(gx - 2, sy, 4, 14);
        }
        for (const pyY of [roadTop + 4, roadBot - 4]) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#0d0f1a';
          ctx.fillRect(gx - 7, pyY - 38, 14, 40);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(gx - 5, pyY - 36, 10, 36);
          ctx.fillStyle = this.isBossEncounter ? '#ef4444' : realm.accentHex || '#fb923c';
          ctx.fillRect(gx - 3, pyY - 30, 6, 18);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(gx - 1, pyY - 26, 2, 10);
        }
      }
      ctx.restore();
    }
  }

  renderWorldMid(ctx, renderer) {
    if (!this.active || !ctx) return;
    const t = renderer?.time || this._clock || 0;

    // 1. Standing Back-Wall Summoning Portals (`adv_fx_sheet.png` Rows 0..3)
    if (this.portals.length > 0) {
      const assets = PixelForge.initAssets?.();
      const fxSheet = PixelForge.ensureImage?.(assets?.advFxSheet) || assets?.advFxSheet;
      const fxReady = isImgReady(fxSheet);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const p of this.portals) {
        const u = Math.max(0, Math.min(1, p.age / p.maxLife));
        let scaleX = 1.0;
        let scaleY = 1.0;
        let alpha = 1.0;
        if (p.age < 0.24) {
          const k = p.age / 0.24;
          const ease = 1 - Math.pow(1 - k, 3);
          scaleX = 0.2 + 0.8 * ease;
          scaleY = 0.82 + 0.18 * ease;
          alpha = Math.min(1, k * 1.45);
        } else if (u >= 0.78) {
          const k = (u - 0.78) / 0.22;
          scaleX = Math.max(0.12, 1 - 0.86 * k * k);
          alpha = Math.max(0, 1 - k);
        }
        if (alpha <= 0.01) continue;
        const px = Math.round(p.x);
        const py = Math.round(p.groundY);
        const dw = Math.max(8, Math.round((p.isElite ? 210 : 190) * scaleX));
        const dh = Math.max(16, Math.round((p.isElite ? 218 : 198) * scaleY));
        const dx = Math.round(px - dw * 0.5);
        const dy = Math.round(py - (122 / 128) * dh);
        const z = Math.max(0, Math.min(3, p.zone | 0));
        const frame = Math.floor(p.age * 10.5 + p.seed) & 3;
        ctx.globalAlpha = alpha;
        if (fxReady && ctx.drawImage) {
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

    // 2. Boss Gate Portal Arch behind active Boss (`endless_crusade_vfx.png` Row 6, 12f loop)
    if (this.isBossEncounter && this._bossPortalActive) {
      const vfxImg = PixelForge.assets?.endlessVfx;
      const bx = Math.round(this._bossPortalX || this.lockMaxX - 180);
      const bGy = this.depthMidY;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (isImgReady(vfxImg) && ctx.drawImage) {
        const frame = Math.floor(t * 14) % 12;
        const drawSz = 264;
        const dx = Math.round(bx - drawSz * 0.5);
        const dy = Math.round(bGy - drawSz * 0.88);
        ctx.globalAlpha = 0.92;
        ctx.drawImage(
          vfxImg,
          frame * ENDLESS_VFX_CELL,
          6 * ENDLESS_VFX_CELL,
          ENDLESS_VFX_CELL,
          ENDLESS_VFX_CELL,
          dx,
          dy,
          drawSz,
          drawSz
        );
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.16;
        ctx.drawImage(
          vfxImg,
          frame * ENDLESS_VFX_CELL,
          6 * ENDLESS_VFX_CELL,
          ENDLESS_VFX_CELL,
          ENDLESS_VFX_CELL,
          dx,
          dy,
          drawSz,
          drawSz
        );
      } else {
        // Stepped gothic crimson-gold portal fallback
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(bx - 64, bGy - 210, 128, 210);
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(bx - 54, bGy - 198, 108, 194);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx - 42, bGy - 184, 84, 174);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(bx - 64, bGy - 210, 128, 6);
      }
      ctx.restore();
    }

    // 3. Monster Plumes (`adv_stage_vfx.png`)
    if (this.monsterPlumes.length > 0) {
      const assets = PixelForge.initAssets?.();
      const stageVfx = PixelForge.ensureImage?.(assets?.advStageVfx) || assets?.advStageVfx;
      const stageReady = isImgReady(stageVfx);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const p of this.monsterPlumes) {
        const u = Math.max(0, Math.min(1, p.age / Math.max(0.05, p.maxLife || 0.48)));
        const alpha = u < 0.15 ? u / 0.15 : Math.max(0, 1 - (u - 0.15) / 0.85);
        if (alpha <= 0.01) continue;
        if (stageReady && ctx.drawImage) {
          const frame = Math.min(15, Math.max(0, Math.floor(u * 16)));
          const drawSz = Math.round(128 * (p.scale || 1.6));
          const dx = Math.round(p.x - drawSz * 0.5);
          const dy = Math.round(p.groundY - drawSz * 0.844);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(0.90, alpha * 0.86);
          ctx.drawImage(stageVfx, frame * 128, (p.vfxRow | 0) * 128, 128, 128, dx, dy, drawSz, drawSz);
        }
        const sparkCnt = p.essenceSparks || 0;
        if (sparkCnt > 0 && ctx.fillRect) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(0.95, alpha * 0.92);
          const spreadR = 24 * (p.scale || 1.5);
          for (let s = 0; s < sparkCnt; s++) {
            const ang = p.seed + ((s + 0.5) / sparkCnt) * Math.PI * 2 + u * 1.4;
            const lift = u * (50 + (s % 3) * 16);
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

    this.skillSets.renderMid(ctx);
  }

  renderWorldForeground(ctx, renderer) {
    if (!this.active || !ctx) return;
    const t = renderer?.time || this._clock || 0;
    const vfxImg = PixelForge.assets?.endlessVfx;
    const vfxReady = isImgReady(vfxImg);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Spinning Magnetic Sovereign Gold Coins (Row 0) & Astral Shards (Row 1)
    if (this.coins.length > 0) {
      for (let i = 0; i < this.coins.length; i++) {
        const c = this.coins[i];
        const cx = Math.round(c.x);
        const cy = Math.round(c.y - 18 + Math.sin(t * 7 + c.frameOffset) * 3);
        const gY = Math.round(c.groundY);
        const isShard = c.kind === 'shard';

        // Crisp ground contact shadow
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#05070e';
        ctx.fillRect(cx - 10, gY - 2, 20, 4);

        ctx.globalAlpha = 1;
        if (vfxReady && ctx.drawImage) {
          const frame = (Math.floor(t * 16) + c.frameOffset) % 12;
          const row = isShard ? 1 : 0;
          const sz = isShard ? 46 : 40;
          ctx.drawImage(
            vfxImg,
            frame * ENDLESS_VFX_CELL,
            row * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            Math.round(cx - sz * 0.5),
            Math.round(cy - sz * 0.5),
            sz,
            sz
          );
        } else if (isShard) {
          // Crisp pixel diamond fallback for Astral Shard
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(cx - 7, cy - 11, 14, 22);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(cx - 5, cy - 9, 10, 18);
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(cx - 3, cy - 5, 6, 10);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 1, cy - 7, 2, 6);
        } else {
          // Crisp pixel coin fallback
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(cx - 8, cy - 8, 16, 16);
          ctx.fillStyle = '#d97706';
          ctx.fillRect(cx - 6, cy - 6, 12, 12);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cx - 4, cy - 4, 8, 8);
          ctx.fillStyle = '#fef9c3';
          ctx.fillRect(cx - 2, cy - 4, 4, 4);
        }
      }
    }

    // 2. Arcane Tap-Smite Sky-Bolts (Row 2) & Crit Starbursts (Row 3)
    if (this.tapSmites.length > 0) {
      for (let i = 0; i < this.tapSmites.length; i++) {
        const s = this.tapSmites[i];
        const u = Math.max(0, Math.min(1, s.age / Math.max(0.05, s.maxLife)));
        const frame = Math.min(11, Math.floor(u * 12));
        const sx = Math.round(s.x);
        const sy = Math.round(s.groundY);
        const isCrit = s.kind === 'crit';
        const alpha = u > 0.72 ? Math.max(0, 1 - (u - 0.72) / 0.28) : 1;

        if (vfxReady && ctx.drawImage) {
          const row = isCrit ? 3 : 2;
          const dw = Math.round((isCrit ? 128 : 144) * (s.scale || 1.3));
          const dh = Math.round((isCrit ? 128 : 220) * (s.scale || 1.3));
          const dx = Math.round(sx - dw * 0.5);
          const dy = isCrit ? Math.round(sy - dh * 0.5) : Math.round(sy - dh * 0.88);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            vfxImg,
            frame * ENDLESS_VFX_CELL,
            row * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            dw,
            dh
          );
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.16, alpha * 0.16);
          ctx.drawImage(
            vfxImg,
            frame * ENDLESS_VFX_CELL,
            row * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            dw,
            dh
          );
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha;
          if (isCrit) {
            const r = Math.round(14 + u * 34);
            ctx.fillStyle = '#fb923c';
            ctx.fillRect(sx - r, sy - 3, r * 2, 6);
            ctx.fillRect(sx - 3, sy - r, 6, r * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 6, sy - 6, 12, 12);
          } else {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(sx - 6, sy - 260, 12, 260);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(sx - 2, sy - 260, 4, 260);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 18, sy - 8, 36, 10);
          }
        }
      }
    }

    // 3. Gold Fever Overdrive Bursts (Row 4)
    if (this.feverBursts.length > 0) {
      for (let i = 0; i < this.feverBursts.length; i++) {
        const fb = this.feverBursts[i];
        const u = Math.max(0, Math.min(1, fb.age / Math.max(0.05, fb.maxLife)));
        const frame = Math.min(11, Math.floor(u * 12));
        const fx = Math.round(fb.x);
        const fy = Math.round(fb.groundY);
        const alpha = u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1;

        if (vfxReady && ctx.drawImage) {
          const sz = Math.round(140 * (fb.scale || 1.8));
          const dx = Math.round(fx - sz * 0.5);
          const dy = Math.round(fy - sz * 0.5);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            vfxImg,
            frame * ENDLESS_VFX_CELL,
            4 * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            sz,
            sz
          );
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.16, alpha * 0.16);
          ctx.drawImage(
            vfxImg,
            frame * ENDLESS_VFX_CELL,
            4 * ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            ENDLESS_VFX_CELL,
            dx,
            dy,
            sz,
            sz
          );
        } else {
          const r = Math.round(28 + u * 86);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = alpha * 0.85;
          ctx.fillStyle = '#facc15';
          ctx.fillRect(fx - r, fy - 4, r * 2, 8);
          ctx.fillRect(fx - 4, fy - r, 8, r * 2);
          ctx.fillStyle = '#fef9c3';
          ctx.fillRect(fx - 12, fy - 12, 24, 24);
        }
      }
    }

    ctx.restore();

    // 4. Companions foreground projectiles/strikes & SkillSets foreground
    this.companions?.renderForegroundFX?.(ctx, renderer);
    this.skillSets.renderForeground(ctx);

    // 5. Crisp PixelFont Floating World Callouts
    if (this.floatingCallouts.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < this.floatingCallouts.length; i++) {
        const fc = this.floatingCallouts[i];
        const u = fc.age / fc.maxLife;
        ctx.globalAlpha = u > 0.65 ? Math.max(0, 1 - (u - 0.65) / 0.35) : 1;
        PixelFont.drawCentered(ctx, fc.text, Math.round(fc.x), Math.round(fc.y), fc.scale, fc.color, '#ffffff', true);
      }
      ctx.restore();
    }

    // 6. Manual Target-Lock Reticle (pure stepped pixel brackets, 0 rotate/ellipse/arc)
    if (!this.autoPlay && this.manualTargetLock) {
      const locked = this.getActiveLockedMonster(this.game?.leftFighter);
      if (locked && !locked.isDead) {
        const pulse = Math.round(Math.sin(t * 8) * 3);
        const cx = Math.round(locked.isColossalBoss ? (locked.anchorX || locked.x) - 56 : locked.x);
        const cy = Math.round(
          locked.isColossalBoss
            ? (locked.anchorGroundY || this.depthMidY) - 148
            : (locked.y || locked.groundY || this.depthMidY) - 56
        );
        const hw = (locked.isColossalBoss ? 72 : 38) + pulse;
        const hh = (locked.isColossalBoss ? 82 : 48) + pulse;
        const arm = 12;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const bar = (x, y, w, h, col) => {
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
          ctx.fillStyle = col;
          ctx.fillRect(x, y, w, h);
        };
        bar(cx - hw, cy - hh, arm, 3, '#38bdf8');
        bar(cx - hw, cy - hh, 3, arm, '#38bdf8');
        bar(cx + hw - arm, cy - hh, arm, 3, '#38bdf8');
        bar(cx + hw - 3, cy - hh, 3, arm, '#38bdf8');
        bar(cx - hw, cy + hh - 3, arm, 3, '#38bdf8');
        bar(cx - hw, cy + hh - arm, 3, arm, '#38bdf8');
        bar(cx + hw - arm, cy + hh - 3, arm, 3, '#38bdf8');
        bar(cx + hw - 3, cy + hh - arm, 3, arm, '#38bdf8');
        PixelFont.drawCentered(ctx, 'LOCKED', cx, cy - hh - 10, 1, '#fde047', '#ffffff', true);
        ctx.restore();
      }
    }
  }

  renderScreenHUD(ctx, renderer) {
    if (!this.active || !ctx || this.game?.isLandingOpen) return;
    const w = renderer?.width || 1280;
    const h = renderer?.height || 720;
    const t = renderer?.time || this._clock || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Tap-Fever Golden Screen-Edge Pulse (100% fillRect, 0 rotate/ellipse/arc)
    const feverTimer = this.economy?.tapFeverTimer || 0;
    if (feverTimer > 0) {
      const tier = this.economy?.tapFeverLevel || 1;
      const pulse = 0.32 + 0.24 * Math.sin(t * (tier >= 2 ? 16 : 11));
      const railCol = tier >= 2 ? '#fef08a' : '#facc15';
      const trimCol = tier >= 2 ? '#fb923c' : '#d97706';
      const thickness = tier >= 2 ? 6 : 4;

      ctx.globalAlpha = pulse;
      ctx.fillStyle = trimCol;
      ctx.fillRect(0, 0, w, thickness + 2);
      ctx.fillRect(0, h - thickness - 2, w, thickness + 2);
      ctx.fillRect(0, 0, thickness + 2, h);
      ctx.fillRect(w - thickness - 2, 0, thickness + 2, h);

      ctx.globalAlpha = Math.min(0.88, pulse * 1.4);
      ctx.fillStyle = railCol;
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, h - 2, w, 2);
      ctx.fillRect(0, 0, 2, h);
      ctx.fillRect(w - 2, 0, 2, h);
      ctx.globalAlpha = 1;
    }

    // 2. Phoenix Surge Golden Flash Rail
    if (this._phoenixInvulnTimer > 1.3) {
      const pAlpha = Math.min(0.45, (this._phoenixInvulnTimer - 1.3) * 0.65);
      ctx.globalAlpha = pAlpha;
      ctx.fillStyle = '#fde047';
      ctx.fillRect(0, 0, w, 4);
      ctx.fillRect(0, h - 4, w, 4);
      ctx.globalAlpha = 1;
    }

    // 3. Stage Clear / Boss Retreat / Gold Fever PixelFont Banner Ribbon
    if (this.bannerTimer > 0 && this.bannerText) {
      const fade = this.bannerTimer < 0.35 ? this.bannerTimer / 0.35 : 1;
      const isCompact = w < 640;
      const mainSz = !isCompact && PixelFont.measureWidth(this.bannerText, 2) + 40 <= w - 32 ? 2 : 1;
      const mainW = PixelFont.measureWidth(this.bannerText, mainSz);
      const subW = this.bannerSubText ? PixelFont.measureWidth(this.bannerSubText, 1) : 0;
      const banW = Math.min(w - 24, Math.max(240, Math.max(mainW, subW) + 40));
      const banH = this.bannerSubText ? (mainSz === 2 ? 46 : 36) : mainSz === 2 ? 32 : 24;
      const banX = Math.round((w - banW) * 0.5);
      const hudBot = typeof renderer?.getHudBottomY === 'function' ? renderer.getHudBottomY() : 82;
      const banY = Math.round(hudBot + (isCompact ? 54 : 58));

      ctx.globalAlpha = fade;
      ctx.fillStyle = '#05070e';
      ctx.fillRect(banX - 2, banY - 2, banW + 4, banH + 4);
      ctx.fillStyle = 'rgba(10, 13, 24, 0.92)';
      ctx.fillRect(banX, banY, banW, banH);
      ctx.fillStyle = this.bannerColor || '#facc15';
      ctx.fillRect(banX, banY, banW, 2);
      ctx.fillRect(banX, banY + banH - 2, banW, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(banX, banY, 3, 3);
      ctx.fillRect(banX + banW - 3, banY, 3, 3);
      ctx.fillRect(banX, banY + banH - 3, 3, 3);
      ctx.fillRect(banX + banW - 3, banY + banH - 3, 3, 3);

      const cx = Math.round(w * 0.5);
      if (this.bannerSubText) {
        PixelFont.drawCentered(
          ctx,
          this.bannerText,
          cx,
          banY + (mainSz === 2 ? 15 : 12),
          mainSz,
          this.bannerColor || '#facc15',
          '#ffffff',
          true
        );
        PixelFont.drawCentered(
          ctx,
          this.bannerSubText,
          cx,
          banY + banH - 10,
          1,
          '#e2e8f0',
          '#ffffff',
          true
        );
      } else {
        PixelFont.drawCentered(
          ctx,
          this.bannerText,
          cx,
          banY + Math.floor(banH * 0.5),
          mainSz,
          this.bannerColor || '#facc15',
          '#ffffff',
          true
        );
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // =========================================================================
  // HUD, CONTROL DECK & SHOP SNAPSHOT SYNC
  // =========================================================================

  syncJoystickKnobUI() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const base = document.getElementById('adv-joystick-base');
    const knob = document.getElementById('adv-joystick-knob');
    if (!base || !knob) return;

    let vx = 0;
    let vy = 0;
    let maxPx = 32;
    if (this.joyVec.active) {
      vx = this.joyVec.x;
      vy = this.joyVec.y;
      maxPx = 40;
    } else {
      const kbX = (this.keys.right || this.keys.uiRight ? 1 : 0) - (this.keys.left || this.keys.uiLeft ? 1 : 0);
      const kbY = (this.keys.down || this.keys.uiDown ? 1 : 0) - (this.keys.up || this.keys.uiUp ? 1 : 0);
      const mag = Math.hypot(kbX, kbY);
      vx = mag > 1 ? kbX / mag : kbX;
      vy = mag > 1 ? kbY / mag : kbY;
    }

    if (knob.style) {
      knob.style.transform = `translate3d(${Math.round(vx * maxPx)}px, ${Math.round(vy * maxPx)}px, 0px)`;
    }
    base.classList?.toggle('is-active', Math.hypot(vx, vy) > 0.08);
  }

  refreshActionIcons(heroKey = 'mage_ex') {
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
          PixelForge.drawAdventureActionIcon?.(ictx, heroKey, slot, canvas.width || 64, canvas.height || 64, 0);
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
    this._renderedMageIconsReady = isImgReady(mageImg);
    this._renderedHeroIconsReady = isImgReady(heroSheet);
  }

  syncStageBadge() {
    const badge = this.game?.hudEls?.stageBadge;
    if (!badge) return;
    const realm = this.getCurrentRealm();
    const nextText = `STAGE ${this.stage} • ${realm.name}`;
    if (badge.textContent !== nextText) {
      badge.textContent = nextText;
    }
  }

  syncRightHUD() {
    const g = this.game;
    if (!g) return;
    const leftHeroId = g.leftFighter?.heroId || g.slot1Hero || 'mage_ex';
    const leftCol = g.leftFighter?.primaryColor || '#fb923c';
    PixelForge.setHUDPortraits?.(leftHeroId, leftCol, 'archfiend', '#ef4444');

    if (g.hudEls?.crestVs) {
      const nextCrest = this.isBossEncounter ? 'BOSS' : `S${this.stage}`;
      if (g.hudEls.crestVs.textContent !== nextCrest) {
        g.hudEls.crestVs.textContent = nextCrest;
      }
    }
    if (g.hudEls?.modeBadge) {
      const nextBadge = this.isBossEncounter
        ? `STAGE ${this.stage} • BOSS ${Math.max(0, this.bossTimer).toFixed(1)}S`
        : this.bossFarmMode
          ? `STAGE ${this.stage} • FARMING • ${formatEndlessNumber(this.economy.gold)}G`
          : `STAGE ${this.stage} • WAVE ${this.waveInStage}/${this.wavesPerStage}`;
      if (g.hudEls.modeBadge.textContent !== nextBadge) {
        g.hudEls.modeBadge.textContent = nextBadge;
      }
    }
    g.updateAdventureBossHUD?.();
  }

  syncControlDeckUI() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const visible = Boolean(this.active && !this.game?.isLandingOpen && !this.game?.isMatchOver);
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.classList?.toggle('is-adventure-active', visible);
      appEl.classList?.toggle('is-endless-active', visible);
    }
    const deck = document.getElementById('adventure-controls');
    if (deck) {
      deck.classList?.toggle('hidden', !visible);
    }
    const pauseSpBadge = document.getElementById('pause-sp-badge');
    if (pauseSpBadge && visible) {
      pauseSpBadge.classList?.add('hidden');
    }

    const autoBtn = document.getElementById('adv-btn-autoplay');
    const autoLbl = document.getElementById('adv-autoplay-label');
    if (autoBtn) {
      autoBtn.setAttribute?.('aria-pressed', String(this.autoPlay));
      autoBtn.classList?.toggle('is-autoplay-on', this.autoPlay);
    }
    if (autoLbl) autoLbl.textContent = this.autoPlay ? 'AI: ON' : 'AI: OFF';

    const skillAutoBtn = document.getElementById('adv-btn-auto');
    if (skillAutoBtn) {
      skillAutoBtn.setAttribute?.('aria-pressed', String(this.autoPlay));
      skillAutoBtn.classList?.toggle('is-autoplay-on', this.autoPlay);
    }

    const lockBtn = document.getElementById('adv-btn-lock');
    if (lockBtn) {
      lockBtn.setAttribute?.('aria-pressed', String(Boolean(this.manualTargetLock)));
      lockBtn.classList?.toggle('is-lock-on', Boolean(this.manualTargetLock));
    }

    this.syncJoystickKnobUI();

    const player = this.game?.leftFighter;
    if (!player) return;

    const heroKey = player.heroId || this.game?.slot1Hero || 'mage_ex';
    const isMageIcon = heroKey === 'mage' || heroKey === 'mage_ex';
    if (
      this._renderedIconHero !== heroKey ||
      (isMageIcon && isImgReady(PixelForge.assets?.mage?.icons) && !this._renderedMageIconsReady) ||
      (!isMageIcon && isImgReady(PixelForge.assets?.heroIconsSheet) && !this._renderedHeroIconsReady)
    ) {
      this.refreshActionIcons(heroKey);
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
    const autoCd = Math.max(0, player.autoCooldown || 0);
    updateOrbSlot('attack', 'ready', autoCd > 0.03 ? autoCd / Math.max(0.24, this.autoCdMax) : 0, '');

    const dodgeCd = Math.max(0, player.dodgeCooldown || 0);
    if (dodgeCd > 0.05) {
      updateOrbSlot('dodge', 'cd', dodgeCd / Math.max(0.45, this.dodgeCdMax), `${dodgeCd.toFixed(1)}s`);
    } else {
      updateOrbSlot('dodge', 'ready', 0, '');
    }

    const skillCd = Math.max(0, player.skillCooldown || 0);
    if (skillCd > 0.05) {
      updateOrbSlot('skill', 'cd', skillCd / Math.max(0.5, this.skillCdMax), `${skillCd.toFixed(1)}s`);
    } else if (this.progression.spirit + 0.01 < stats.skillSpiritCost) {
      const spRatio = Math.max(0, Math.min(1, this.progression.spirit / Math.max(1, stats.skillSpiritCost)));
      updateOrbSlot('skill', 'low_spirit', 1 - spRatio, `${stats.skillSpiritCost} SP`);
    } else {
      updateOrbSlot('skill', 'ready', 0, '');
    }

    const ultRatio = Math.max(0, Math.min(1, this.progression.ultCharge / 100));
    if (ultRatio < 0.999) {
      updateOrbSlot('overdrive', 'charge', 1 - ultRatio, `${Math.floor(ultRatio * 100)}%`);
    } else {
      updateOrbSlot('overdrive', 'ready', 0, 'MAX');
    }

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

  getUiSnapshot() {
    const realm = this.getCurrentRealm();
    const stats = this.economy.getComputedStats();
    const companionsView = this.companions?.getRosterView?.(this.economy) || [];
    const activeSlots = this.companions?.activeSlots || [];

    const hasAffordableCompanion = companionsView.some(
      (c) => (!c.unlocked && c.canAffordRecruit) || (c.unlocked && c.canAffordUpgrade)
    );
    let hasAffordableRelic = false;
    if (typeof this.economy.getRelicCost === 'function' && this.economy.relicLevels) {
      for (const rid of Object.keys(this.economy.relicLevels)) {
        const quote = this.economy.getRelicCost(rid);
        if (quote?.canAfford) {
          hasAffordableRelic = true;
          break;
        }
      }
    }

    const boss = this.isBossEncounter && this.bossEntity && !this.bossEntity.isDead ? this.bossEntity : null;
    return {
      active: this.active,
      stage: this.stage,
      bestStage: this.bestStage,
      waveInStage: this.waveInStage,
      wavesPerStage: this.wavesPerStage,
      waveProgress: this.isBossEncounter
        ? Math.max(0, Math.min(1, this.bossTimer / Math.max(1, this.bossTimerMax)))
        : Math.max(0, Math.min(1, this.waveInStage / Math.max(1, this.wavesPerStage))),
      realm,
      realmName: realm.name,
      ascendedLoop: realm.ascendedLoop,
      accentHex: realm.accentHex,
      isBossEncounter: this.isBossEncounter,
      bossFarmMode: this.bossFarmMode,
      canChallengeBoss: Boolean(this.bossFarmMode && !this.isBossEncounter),
      bossTimer: this.bossTimer,
      bossTimerMax: this.bossTimerMax,
      bossName: boss ? boss.name : '',
      bossHp: boss ? Math.max(0, Math.round(boss.hp)) : 0,
      bossMaxHp: boss ? Math.max(1, Math.round(boss.maxHp)) : 0,
      isColossalBoss: Boolean(boss?.isColossalBoss),
      gold: this.economy.gold || 0,
      formattedGold: formatEndlessNumber(this.economy.gold || 0),
      totalGoldEarned: this.economy.totalGoldEarned || 0,
      astralShards: this.economy.astralShards || 0,
      formattedAstralShards: formatEndlessNumber(this.economy.astralShards || 0),
      autoBoss: Boolean(this.economy.autoBoss),
      autoPlay: Boolean(this.autoPlay),
      bulkMode: this.economy.bulkMode || 'x1',
      tapFever: this.economy.tapFever || 0,
      tapFeverTimer: this.economy.tapFeverTimer || 0,
      tapFeverLevel: this.economy.tapFeverLevel || 0,
      feverActive: (this.economy.tapFeverTimer || 0) > 0,
      dpsMetrics: this.economy.dpsMetrics || { heroDps: 0, tapDps: 0, companionDps: 0, goldPerSec: 0 },
      totalKills: this.economy.totalKills || this.monstersKilled || 0,
      bossesSlain: this.economy.bossesSlain || 0,
      totalTaps: this.economy.totalTaps || 0,
      activeHeroId: this.economy.activeHeroId || this.game?.leftFighter?.heroId || 'mage_ex',
      stats,
      economy: this.economy,
      companions: companionsView,
      activeCompanionCount: activeSlots.length,
      maxCompanionSlots: 3,
      hasAffordableRelic,
      hasAffordableCompanion,
      hasAffordableUpgrade: hasAffordableRelic || hasAffordableCompanion
    };
  }
}
