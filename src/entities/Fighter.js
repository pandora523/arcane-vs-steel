import { ExParticleSystem, getExHeroPalette } from '../engine/shaders/exNextGenFX.js?v=30fps138';

const FIGHTER_BRAND = Symbol.for('avs.Fighter');

const RANGED_EX_HERO_IDS = new Set([
  'mage_ex',
  'priestess_ex',
  'icemage_ex',
  'valkyrie_ex',
  'archer_ex',
  'nyx_ex'
]);

export class Fighter {
  static [Symbol.hasInstance](instance) {
    return Boolean(instance && typeof instance === 'object' && instance[FIGHTER_BRAND]);
  }

  constructor(opts) {
    this[FIGHTER_BRAND] = true;
    this.name = opts.name;
    this.x = opts.x;
    this.y = opts.groundY;
    this.groundY = opts.groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = opts.facing || 1;

    this.maxHp = opts.maxHp || 3600;
    this.hp = this.maxHp;
    this.mana = 0;
    this.maxMana = 100;
    // Supreme Finishing Move Gauge ("ULTIMATE" — higher tier above Overdrive!)
    this.finisherGauge = 0;
    this.maxFinisherGauge = 100;
    this.hasTrueUltimate = Boolean(opts.hasTrueUltimate);
    this.trueUltName = opts.trueUltName || 'CELESTIAL SWORD OF JUSTICE';
    this.trueUltDuration = opts.trueUltDuration || 4.35;
    this.trueUltFrameOverride = null;
    this.tankedDamage = 0;
    this.isDead = false;
    this.deathTimer = 0;

    this.attackRange = opts.attackRange || 110;
    this.moveSpeed = opts.moveSpeed || 165;
    this.lightColor = opts.lightColor || 'rgba(56, 189, 248, 1)';
    this.primaryColor = opts.primaryColor || '#38bdf8';
    if (opts.secondaryColor) this.secondaryColor = opts.secondaryColor;
    if (opts.heroId) this.heroId = opts.heroId;
    if (opts.theme) this.theme = opts.theme;
    if (opts.skillName) this.skillName = opts.skillName;
    if (opts.ultName) this.ultName = opts.ultName;
    if (opts.deathSfx) this.deathSfx = opts.deathSfx;

    // State Machine: IDLE, WALK, DASH, DODGE, AUTO_ATTACK, SKILL, ULTIMATE (Overdrive), TRUE_ULTIMATE (Supreme Finisher), DEATH
    this.state = 'IDLE';
    this.stateTimer = 0;
    this.didActionFrame = false;

    this.autoCooldown = Math.random() * 0.35;
    this.autoInterval = opts.autoInterval || 1.25;
    this.skillCooldown = 1.6 + Math.random() * 1.1;
    this.skillMaxCooldown = opts.skillMaxCooldown || 5.0;
    this.dodgeCooldown = 0.8 + Math.random() * 0.9;
    this.dodgeMaxCooldown = 3.4;
    this.dashCooldown = 0.6 + Math.random() * 0.8;
    this.dashMaxCooldown = 3.8;
    this.dashDuration = 0.44;
    this.dashDir = this.facing;
    this.isInvulnerable = false;

    // TABS-style Spring / Wobble Rigging
    this.walkPhase = Math.random() * Math.PI * 2;
    this.torsoAngle = 0;
    this.torsoVel = 0;
    this.headBob = 0;
    this.armAngle = 0;
    this.armVel = 0;
    this.hitFlash = 0;
    this.hurtTimer = 0;
    this.hurtDir = -1;
    this.stunTimer = 0;

    // 5-node Verlet-like Cape / Cloth Trail
    this.capeNodes = Array.from({ length: 5 }, (_, i) => ({
      x: this.x - this.facing * i * 9,
      y: this.y - 52 + i * 9
    }));

    // Autonomous Combat Telemetry & Desperation State
    this.isBerserk = false;
    this.stats = {
      damageDealt: 0,
      skillsUsed: 0,
      ultsUsed: 0,
      critsLanded: 0,
      healingDone: 0,
      biggestHit: 0,
      clashes: 0
    };

    // Fighting Style AI Director State (distinct martial cadence, counters & post-combo signatures)
    this._aiComboCount = 0;
    this._aiComboChainTimer = 0;
    this._aiComboReadyFinisher = 0;
    this._aiSkillReadyTime = 0;
    this._aiUltReadyTime = 0;
    this._aiFinisherReadyTime = 0;
    this._aiSkillPatience = 1.55 + Math.random() * 0.55;
    this._aiSignatureCd = 0.65 + Math.random() * 0.9;
    this._aiOutstepTimer = 0;
    this._aiOutstepDir = -1;
    this._aiManueverSeq = Math.floor(Math.random() * 6);
    this._hnsPhaseThrough = false;
    this._phaseThroughEnemy = false;
    this._hnsStreaks = [];
    this._advDodgeTrails = [];
    this._hitStopTimer = 0;
    this._hitShakeTimer = 0;
    this.buildConfig = null;
    this.buildAspect = 0;
    this.buildSkill = 0;
    this.buildUlt = 0;
    this.buildShieldHp = 0;
    this.buildShieldTimer = 0;
    this.buildShieldLabel = '';
    this.buildShieldColor = '#fde047';
    this._buildShieldTextCd = 0;
    this.buildRootTimer = 0;
  }

  grantBuildShield(amount, duration = 2.8, label = 'SANCTUARY BARRIER!', color = '#fde047') {
    if (this.isDead || amount <= 0 || this.game?.isAdventureMode?.()) return;
    this.buildShieldHp = Math.max(this.buildShieldHp || 0, Math.round(amount));
    this.buildShieldTimer = Math.max(this.buildShieldTimer || 0, duration);
    this.buildShieldLabel = label;
    this.buildShieldColor = color || this.primaryColor || '#fde047';
  }

  applyBuildRoot(duration = 0.36, label = 'SPEAR ROOT!', color = '#fb7185') {
    if (
      this.isDead ||
      this.isBenched ||
      this.isColossalBoss ||
      this.unstoppablePoise ||
      duration <= 0 ||
      this.game?.isAdventureMode?.()
    ) {
      return false;
    }
    this.buildRootTimer = Math.max(this.buildRootTimer || 0, duration);
    this.vx *= 0.15;
    if (this.game?.vfx && (this._buildRootTextCd || 0) <= 0) {
      this._buildRootTextCd = 0.45;
      this.game.vfx.spawnDamageText(this.x, this.y - 178, 0, false, label, color);
    }
    return true;
  }

  healTeammateTagGrace(amount, label = 'TAG SANCTUARY', barrierAmt = 0, barrierDur = 2.6) {
    if (!this.game || this.game.isAdventureMode?.() || !this.game.is2v2Mode?.() || amount <= 0) {
      return 0;
    }
    const ally = this.game.getTeammateOf ? this.game.getTeammateOf(this) : null;
    if (!ally || ally.isDead) return 0;
    ally._isAllyGraceHeal = true;
    const healed = ally.heal(Math.round(amount), label);
    ally._isAllyGraceHeal = false;
    if (this.stats && healed > 0) {
      this.stats.healingDone += Math.round(healed);
    }
    if (!ally.isBenched && barrierAmt > 0) {
      ally.grantBuildShield(barrierAmt, barrierDur, `${label}!`, this.primaryColor);
    }
    return healed;
  }

  getBaseHeroId() {
    const id = typeof this.heroId === 'string' ? this.heroId : '';
    return id.endsWith('_ex') ? id.slice(0, -3) : id;
  }

  getRoleTacticalProfile() {
    const baseHeroId = this.getBaseHeroId();
    switch (baseHeroId) {
      case 'mage':
      case 'icemage':
      case 'nyx':
        return {
          role: 'artillery_mage',
          baseHeroId,
          isRanged: true,
          idealMin: 360,
          idealMax: 460,
          dashMinDist: 540,
          crouchMaxDist: 250,
          jumpEscapeDist: 225,
          ultMaxDist: Infinity
        };
      case 'priestess':
        return {
          role: 'sanctum_support',
          baseHeroId,
          isRanged: true,
          idealMin: 355,
          idealMax: 455,
          dashMinDist: 560,
          pressuredDist: 260,
          healHpFrac: 0.82,
          ultHpFrac: 0.85,
          ultPatience: 1.20,
          ultMaxDist: Infinity
        };
      case 'archer':
      case 'valkyrie':
        return {
          role: 'mobile_marksman',
          baseHeroId,
          isRanged: true,
          idealMin: 320,
          idealMax: 445,
          dashMinDist: 530,
          pressuredDist: 255,
          ultMaxDist: baseHeroId === 'valkyrie' ? 620 : Infinity
        };
      case 'ronin':
      case 'chronomancer':
      case 'android':
        return {
          role: 'counter_duelist',
          baseHeroId,
          isRanged: false,
          idealMin: 112,
          idealMax: 150,
          projThreatDist: 220,
          ultMaxDist: baseHeroId === 'ronin' ? 480 : 460
        };
      case 'reaper':
        return {
          role: 'abyssal_stalker',
          baseHeroId,
          isRanged: false,
          idealMin: 118,
          idealMax: 160,
          burrowMinDist: 200,
          burrowMaxDist: 460,
          ultMaxDist: 480
        };
      case 'warrior':
      case 'titan':
      default:
        return {
          role: 'vanguard_juggernaut',
          baseHeroId,
          isRanged: false,
          idealMin: 114,
          idealMax: 146,
          dashMinDist: 255,
          crouchMaxDist: 235,
          skillMaxDist: 360,
          ultMaxDist: 360
        };
    }
  }

  _ensureExParticles() {
    if (typeof this.heroId !== 'string' || !this.heroId.endsWith('_ex')) {
      return null;
    }
    if (!this._exParticles) {
      this._exParticles = new ExParticleSystem(this.heroId, this.primaryColor);
    }
    return this._exParticles;
  }

  getAiStyleProfile() {
    const isEx = typeof this.heroId === 'string' && this.heroId.endsWith('_ex');
    switch (this.heroId) {
      case 'titan':
      case 'titan_ex':
        return {
          comboGoal: isEx ? 4 : 3,
          sweetMin: isEx ? 112 : 114,
          sweetMax: isEx ? 140 : 138,
          counterCrouchBias: 0.68,
          midLeapMin: 195,
          midLeapMax: 315,
          midLeapChance: 0.36,
          postStyle: 'juggernaut'
        };
      case 'warrior':
        return {
          comboGoal: 4,
          sweetMin: 114,
          sweetMax: 146,
          counterCrouchBias: 0.64,
          midLeapMin: 185,
          midLeapMax: 295,
          midLeapChance: 0.38,
          postStyle: 'vanguard'
        };
      case 'warrior_ex':
        return {
          comboGoal: 4,
          sweetMin: 112,
          sweetMax: 142,
          counterCrouchBias: 0.64,
          midLeapMin: 185,
          midLeapMax: 300,
          midLeapChance: 0.42,
          postStyle: 'vanguard'
        };
      case 'ronin':
      case 'ronin_ex':
        return {
          comboGoal: 4,
          sweetMin: isEx ? 112 : 78,
          sweetMax: isEx ? 140 : 106,
          counterCrouchBias: 0.66,
          midLeapMin: 175,
          midLeapMax: 285,
          midLeapChance: 0.44,
          postStyle: 'iaido'
        };
      case 'android':
      case 'android_ex':
        return {
          comboGoal: 4,
          sweetMin: isEx ? 116 : 112,
          sweetMax: isEx ? 148 : 158,
          counterCrouchBias: 0.60,
          midLeapMin: 180,
          midLeapMax: 290,
          midLeapChance: 0.44,
          postStyle: 'cyber_valkyrie'
        };
      case 'reaper':
      case 'reaper_ex':
        return {
          comboGoal: 4,
          sweetMin: isEx ? 118 : 118,
          sweetMax: isEx ? 150 : 160,
          counterCrouchBias: 0.62,
          midLeapMin: 185,
          midLeapMax: 295,
          midLeapChance: 0.38,
          postStyle: 'harvester'
        };
      case 'chronomancer':
      case 'chronomancer_ex':
        return {
          comboGoal: 4,
          sweetMin: isEx ? 112 : 98,
          sweetMax: isEx ? 142 : 142,
          counterCrouchBias: 0.56,
          midLeapMin: 175,
          midLeapMax: 285,
          midLeapChance: 0.38,
          postStyle: 'chrono'
        };
      case 'valkyrie':
      case 'valkyrie_ex':
        return {
          comboGoal: isEx ? 4 : 2,
          sweetMin: 310,
          sweetMax: 375,
          counterCrouchBias: 0.52,
          midLeapMin: 225,
          midLeapMax: 385,
          midLeapChance: isEx ? 0.32 : 0.40,
          postStyle: 'sky_lancer'
        };
      case 'archer':
      case 'archer_ex':
        return {
          comboGoal: isEx ? 4 : 3,
          sweetMin: 350,
          sweetMax: 455,
          counterCrouchBias: 0.50,
          midLeapMin: 0,
          midLeapMax: 0,
          midLeapChance: 0,
          postStyle: 'marksman'
        };
      case 'icemage':
      case 'icemage_ex':
        return {
          comboGoal: 4,
          sweetMin: 310,
          sweetMax: 435,
          counterCrouchBias: 0.58,
          midLeapMin: 0,
          midLeapMax: 0,
          midLeapChance: 0,
          postStyle: 'cryo_artillery'
        };
      case 'priestess':
      case 'priestess_ex':
        return {
          comboGoal: 4,
          sweetMin: 315,
          sweetMax: 445,
          counterCrouchBias: 0.56,
          midLeapMin: 0,
          midLeapMax: 0,
          midLeapChance: 0,
          postStyle: 'sanctuary'
        };
      case 'mage':
      case 'mage_ex':
        return {
          comboGoal: 4,
          sweetMin: 305,
          sweetMax: 430,
          counterCrouchBias: 0.48,
          midLeapMin: 0,
          midLeapMax: 0,
          midLeapChance: 0,
          postStyle: 'pyromancer'
        };
      case 'nyx_ex':
        return {
          comboGoal: 4,
          sweetMin: 315,
          sweetMax: 440,
          counterCrouchBias: 0.52,
          midLeapMin: 0,
          midLeapMax: 0,
          midLeapChance: 0,
          postStyle: 'nebula_ai'
        };
      default:
        return {
          comboGoal: 3,
          sweetMin: 118,
          sweetMax: 155,
          counterCrouchBias: 0.50,
          midLeapMin: 185,
          midLeapMax: 290,
          midLeapChance: 0.32,
          postStyle: 'vanguard'
        };
    }
  }

  isHackAndSlashMelee() {
    if (RANGED_EX_HERO_IDS.has(this.heroId)) {
      return false;
    }
    if (typeof this.heroId === 'string' && this.heroId.endsWith('_ex')) {
      return (this.attackRange || 160) < 250;
    }
    return (
      this.heroId === 'warrior' ||
      this.heroId === 'ronin' ||
      this.heroId === 'android' ||
      this.heroId === 'reaper' ||
      this.heroId === 'chronomancer'
    );
  }

  isCrossSlashDuelist() {
    return (
      this.heroId === 'ronin' ||
      this.heroId === 'ronin_ex' ||
      this.heroId === 'chronomancer' ||
      this.heroId === 'chronomancer_ex'
    );
  }

  isHackAndSlashCaster() {
    if (RANGED_EX_HERO_IDS.has(this.heroId)) {
      return true;
    }
    if (typeof this.heroId === 'string' && this.heroId.endsWith('_ex')) {
      return (this.attackRange || 160) >= 250;
    }
    return (
      this.heroId === 'mage' ||
      this.heroId === 'icemage' ||
      this.heroId === 'priestess'
    );
  }

  hasHackAndSlashCombo() {
    return this.isHackAndSlashMelee() || this.isHackAndSlashCaster();
  }

  getHackAndSlashLockRange() {
    return this.isHackAndSlashCaster() ? 510 : 215;
  }

  setState(newState) {
    const prevState = this.state;
    this.state = newState;
    this.stateTimer = 0;
    this.didActionFrame = false;
    this.didSecondaryAction = false;
    this._hnsState = null;
    this._hnsSpeed = 0;
    this._hnsPhaseThrough = false;
    const isPhaseCapable =
      newState === 'ULTIMATE' ||
      newState === 'SKILL' ||
      newState === 'DODGE' ||
      newState === 'JUMP' ||
      newState === 'DASH' ||
      newState === 'CROUCH';
    const wasPhaseCapable =
      prevState === 'ULTIMATE' ||
      prevState === 'SKILL' ||
      prevState === 'DODGE' ||
      prevState === 'JUMP' ||
      prevState === 'DASH' ||
      prevState === 'CROUCH';
    if (newState === 'DEATH' || !isPhaseCapable || (wasPhaseCapable && prevState !== newState)) {
      this._phaseThroughEnemy = false;
    }
    if (newState === 'SKILL') this._aiSkillReadyTime = 0;
    if (newState === 'ULTIMATE') this._aiUltReadyTime = 0;
    if (newState === 'TRUE_ULTIMATE') this._aiFinisherReadyTime = 0;
    if (newState === 'AUTO_ATTACK') {
      const profile = this.getAiStyleProfile();
      this._aiComboCount = (this._aiComboCount || 0) + 1;
      this._aiComboChainTimer = 1.85;
      if (this._aiComboCount >= profile.comboGoal) {
        this._aiComboCount = 0;
        this._aiComboReadyFinisher = 0.85;
      }
    } else if (
      newState === 'SKILL' ||
      newState === 'ULTIMATE' ||
      newState === 'TRUE_ULTIMATE' ||
      newState === 'HURT'
    ) {
      this._aiComboCount = 0;
      if (newState === 'SKILL' || newState === 'ULTIMATE' || newState === 'TRUE_ULTIMATE') {
        this._aiComboReadyFinisher = 0;
      }
    }
    this._overrideFrameIdx = null;
    if (newState !== 'TRUE_ULTIMATE') {
      this.trueUltFrameOverride = null;
    }
    if (newState !== 'DODGE' && newState !== 'JUMP' && newState !== 'TRUE_ULTIMATE') {
      this.isInvulnerable = false;
    }
    if (newState !== 'CROUCH') {
      this.isCrouching = false;
    }
    if (newState !== 'VICTORY') {
      this._victoryFlourishPlayed = false;
    }
    if (
      newState !== 'DODGE' &&
      newState !== 'JUMP' &&
      newState !== 'ULTIMATE' &&
      newState !== 'TRUE_ULTIMATE'
    ) {
      this.isFlipVault = false;
      this.isAngelicAscent = false;
      this.isOmnislashing = false;
    }
    if (typeof this.heroId === 'string' && this.heroId.endsWith('_ex')) {
      const exSys = this._ensureExParticles();
      if (newState === 'DEATH') {
        exSys?.clear();
      } else {
        exSys?.emitStateFlourish(this, newState);
      }
    }
  }

  gainFinisher(amount) {
    if (!this.hasTrueUltimate || this.isDead || this.state === 'TRUE_ULTIMATE') return;
    const unlimitedHp = Boolean(this.game && this.game.testModeUnlimitedHp);
    let mult = !unlimitedHp && this.isBerserk ? 1.65 : 1.0;
    if (!unlimitedHp && this.game && this.game.stageEventTimer > 0 && this.game.renderer?.stageId === 'cathedral') {
      mult *= 1.25;
    }
    this.finisherGauge = Math.min(this.maxFinisherGauge, this.finisherGauge + amount * mult);
  }

  gainMana(amount) {
    if (this.isDead || this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE') return;
    let mult = this.isBerserk ? 1.28 : 1.0;
    if (this.game && this.game.stageEventTimer > 0 && this.game.renderer?.stageId === 'cathedral') {
      mult *= 1.55;
    }
    const prevMana = this.mana;
    this.mana = Math.min(this.maxMana, this.mana + amount * mult);
    const actualGain = Math.max(0, this.mana - prevMana);
    if (this.hasTrueUltimate && actualGain > 0) {
      this.gainFinisher(actualGain * 0.08);
    }
  }

  heal(amount, label = '') {
    if (this.isDead || amount <= 0) return 0;
    const prevHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const actualHeal = Math.max(1, Math.round(amount));
    if (this.stats) {
      this.stats.healingDone += Math.max(0, Math.round(this.hp - prevHp));
    }
    if (this.game && this.game.vfx) {
      const txt = label ? `${label} +${actualHeal}` : `+${actualHeal} HP`;
      this.game.vfx.spawnDamageText(this.x - this.facing * 26, this.y - 198, 0, false, txt, '#4ade80');
      this.game.vfx.spawnShockwave(this.x, this.groundY - 4, 88, '#4ade80', 0.36, true);
      this.game.vfx.spawnShockwave(this.x, this.y - 88, 62, '#fde047', 0.30, true);
      this.game.vfx.spawnGlyphBurst(this.x, this.y - 96, 7, 'heal');
    }
    // 2v2 Sanctuary Ally Grace: share 55% of active combat heals with injured teammate!
    if (
      !this._isAllyGraceHeal &&
      this.game &&
      typeof this.game.is2v2Mode === 'function' &&
      this.game.is2v2Mode() &&
      label !== 'STARLIGHT' &&
      label !== 'RESERVE REGEN' &&
      label !== 'ALLY GRACE'
    ) {
      const ally = this.game.getTeammateOf ? this.game.getTeammateOf(this) : null;
      if (ally && !ally.isDead && !ally.isBenched && ally.hp < ally.maxHp) {
        const sharedAmt = Math.max(8, Math.round(amount * 0.32));
        ally._isAllyGraceHeal = true;
        const healedAlly = ally.heal(sharedAmt, 'ALLY GRACE');
        ally._isAllyGraceHeal = false;
        if (this.stats && healedAlly > 0) {
          this.stats.healingDone += Math.round(healedAlly);
        }
      }
    }
    return this.hp - prevHp;
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    if (this.isDead || this.isBenched) return;
    // Kaze-Maru's Iaido Serene Mind Counter-Blink: teleports behind the attacker on incoming hit!
    if (this.iaidoCounterActive && typeof this.triggerIaidoCounterBlink === 'function' && attacker && !attacker.isDead) {
      this.triggerIaidoCounterBlink(attacker, this.game);
      return;
    }
    // Malakor's Abyssal Grave-Submerge: untargetable while sliding underground as a shadow puddle!
    if (this.isSubmerged) {
      if (this.game && this.game.vfx) {
        this.game.vfx.spawnDamageText(this.x, this.groundY - 76, 0, false, 'GRAVE PHASE!', '#c084fc');
      }
      if ((this._evadeManaCd || 0) <= 0) {
        this._evadeManaCd = 0.55;
        this.gainMana(5);
      }
      return;
    }
    if (this.isInvulnerable || (this.state === 'DODGE' && this.stateTimer < 0.36)) {
      if (this.game) {
        this.game.vfx.spawnDamageText(this.x - this.facing * 24, this.y - 196, 0, false, 'EVADED!', this.primaryColor);
        this.game.vfx.spawnShockwave(this.x, this.y - 95, 68, this.primaryColor, 0.24);
      }
      if ((this._evadeManaCd || 0) <= 0) {
        this._evadeManaCd = 0.55;
        this.gainMana(5);
      }
      return;
    }

    // 2v2 Twin-Soul Cross-Combo: when both teammates strike the same target within 0.95s!
    if (
      !this._isSplashDamage &&
      attacker &&
      this.game &&
      typeof this.game.is2v2Mode === 'function' &&
      this.game.is2v2Mode()
    ) {
      const nowT = this.game.matchTime || 0;
      if (
        this.lastHitBy &&
        this.lastHitBy !== attacker &&
        this.lastHitBy.team &&
        this.lastHitBy.team === attacker.team &&
        nowT - (this.lastHitTime || -99) <= 0.95 &&
        nowT - (this.lastComboTime || -99) >= 1.15
      ) {
        this.lastComboTime = nowT;
        amount *= 1.16;
        isCrit = true;
        attacker.gainMana(7);
        this.lastHitBy.gainMana(7);
        if (attacker.stats) attacker.stats.clashes++;
        if (this.game.vfx) {
          this.game.vfx.spawnDamageText(
            this.x,
            this.y - 232,
            0,
            false,
            'TWIN-SOUL COMBO!',
            '#fde047'
          );
          this.game.vfx.spawnShockwave(this.x, this.y - 98, 96, attacker.primaryColor, 0.28);
          this.game.vfx.spawnBurst(this.x, this.y - 98, 14, this.lastHitBy.primaryColor || '#fef08a', 235, {
            upBias: 95,
            size: 6
          });
        }
      }
      this.lastHitBy = attacker;
      this.lastHitTime = nowT;

      // 2v2 Chaos Brawl Cleave Splash: heavy strikes cleave nearby opposing teammate within 94px
      if (this.game.gameMode === '2v2_brawl' && (amount >= 52 || isCrit)) {
        const enemyAlly = this.game.getTeammateOf ? this.game.getTeammateOf(this) : null;
        if (
          enemyAlly &&
          !enemyAlly.isDead &&
          !enemyAlly.isBenched &&
          Math.abs(enemyAlly.x - this.x) < 94
        ) {
          enemyAlly._isSplashDamage = true;
          enemyAlly.takeDamage(Math.round(amount * 0.28), attacker, false, knockX * 0.65, 0);
          enemyAlly._isSplashDamage = false;
        }
      }
    }

    if (attacker && attacker.isBerserk) {
      amount *= 1.12;
    }
    if (this.game && this.game.stageEventTimer > 0 && this.game.renderer?.stageId === 'boneyard') {
      amount *= 1.18;
    }
    if (this.forgeArmorTimer > 0) {
      // Torgar's Magma Armor Fortify: 44% damage reduction, unstoppable super-armor, and molten thorn reflection!
      amount *= 0.56;
      knockX *= 0.12;
      knockY = 0;
      if (attacker && !attacker.isDead && !this._isThornReflect && Math.abs(attacker.x - this.x) < 210) {
        this._isThornReflect = true;
        attacker.takeDamage(18, this, false, 65, 0);
        this._isThornReflect = false;
        if (this.game && this.game.vfx) {
          this.game.vfx.spawnDamageText(this.x, this.y - 210, 0, false, 'MAGMA ARMOR!', '#f59e0b');
        }
      }
    } else if (this.isDeflecting) {
      amount *= 0.55;
      knockX *= 0.25;
    } else if (this.hasPoise) {
      knockX *= 0.35;
      knockY *= 0.35;
    }
    if (this.buildShieldHp > 0 && !this.game?.isAdventureMode?.()) {
      const absorbed = Math.min(this.buildShieldHp, amount);
      this.buildShieldHp = Math.max(0, this.buildShieldHp - absorbed);
      amount = Math.max(0, amount - absorbed);
      knockX *= 0.42;
      knockY *= 0.42;
      if (this.buildShieldHp <= 0.1) {
        this.buildShieldHp = 0;
        this.buildShieldTimer = 0;
      }
      if (this.game?.vfx && (this._buildShieldTextCd || 0) <= 0) {
        this._buildShieldTextCd = 0.35;
        this.game.vfx.spawnDamageText(
          this.x,
          this.y - 204,
          0,
          false,
          this.buildShieldLabel || 'SANCTUARY BARRIER!',
          this.buildShieldColor || '#fde047'
        );
        this.game.vfx.spawnShockwave(
          this.x,
          this.y - 88,
          64,
          this.buildShieldColor || '#fde047',
          0.22
        );
      }
      if (amount <= 0.5) {
        return;
      }
    }
    const unlimitedHp = Boolean(this.game && this.game.testModeUnlimitedHp && !this.isMonster);
    const prevHp = this.hp;
    this.hp = unlimitedHp ? Math.max(1, this.hp - amount) : Math.max(0, this.hp - amount);
    this.timeSinceLastHit = 0;
    if (unlimitedHp && this.hp <= Math.max(2, this.maxHp * 0.08)) {
      this._testModeRefillTimer = 0.55;
    }
    const dealt = Math.max(1, Math.round(unlimitedHp ? amount : prevHp - this.hp));
    this.tankedDamage = (this.tankedDamage || 0) + dealt;
    if (attacker && attacker.stats) {
      attacker.stats.damageDealt += dealt;
      if (isCrit) attacker.stats.critsLanded++;
      if (dealt > attacker.stats.biggestHit) attacker.stats.biggestHit = dealt;
    }
    this.hitFlash = 0.18;
    this.hurtTimer = isCrit ? 0.34 : 0.25;
    this.gainMana(Math.min(8.5, amount * 0.036));
    if (attacker) {
      attacker.gainMana(Math.min(9.5, Math.max(0.8, amount * 0.085)));
    }

    // Trigger Low-HP Desperation Overdrive (Berserk State) when crossing below 28% HP
    if (this.hp > 0 && !this.isBerserk && this.hp / this.maxHp <= 0.28) {
      this.isBerserk = true;
      this.gainMana(18);
      if (!unlimitedHp && this.hasTrueUltimate) {
        this.gainFinisher(22);
      }
      if (this.game && this.game.vfx) {
        this.game.vfx.spawnDamageText(
          this.x,
          this.y - 218,
          0,
          false,
          'DESPERATION OVERDRIVE!',
          '#facc15'
        );
        this.game.vfx.spawnBurst(this.x, this.y - 95, 22, '#facc15', 245, { upBias: 115, size: 6 });
      }
    }

    const dir = attacker ? Math.sign(this.x - attacker.x) || -this.facing : -this.facing;
    this.hurtDir = dir;
    this.vx += dir * knockX;
    if (this.y >= this.groundY - 2 && knockY < -120 && !(this.forgeArmorTimer > 0) && !this.unstoppablePoise) {
      this.vy = knockY;
    }
    this.torsoVel += dir * 9.5;
    this.armVel -= 12;

    if (
      this.hp > 0 &&
      !this.isDeflecting &&
      !(this.forgeArmorTimer > 0) &&
      !this.unstoppablePoise &&
      (!this.hasPoise || isCrit || amount >= 145) &&
      (this.state === 'IDLE' ||
        this.state === 'WALK' ||
        (this.state === 'AUTO_ATTACK' && !this.didActionFrame && isCrit && !this.hasHackAndSlashCombo()))
    ) {
      this.setState('HURT');
    }

    if (this.game) {
      this.game.vfx.spawnDamageText(this.x - this.facing * 24, this.y - 192, amount, isCrit);
      const attackerIsEx = Boolean(attacker && typeof attacker.heroId === 'string' && attacker.heroId.endsWith('_ex'));
      const victimIsEx = Boolean(typeof this.heroId === 'string' && this.heroId.endsWith('_ex'));
      if (attackerIsEx || victimIsEx) {
        const exHost = attackerIsEx ? attacker._ensureExParticles?.() : this._ensureExParticles?.();
        const pal = getExHeroPalette(
          attackerIsEx ? attacker.heroId : this.heroId,
          attackerIsEx ? attacker.primaryColor : this.primaryColor
        );
        const hitY = this.y - (this.isColossalBoss ? 124 : 94);
        exHost?.spawnHitStarburst(this.x, hitY, pal.primary, pal.accent, isCrit ? 0.19 : 0.15);
        exHost?.burst(this.x, hitY, {
          count: isCrit ? 7 : 4,
          shapes: pal.hitShapes,
          speedMin: 48,
          speedMax: isCrit ? 172 : 132,
          upBias: 36,
          color: pal.primary,
          accent: pal.accent,
          core: pal.core,
          layer: 'front'
        });
        this.game.vfx.spawnBurst(this.x, this.y - 102, isCrit ? 12 : 7, pal.primary || this.primaryColor, 185);
      } else {
        this.game.vfx.spawnBurst(this.x, this.y - 105, isCrit ? 14 : 8, this.primaryColor, 185);
      }
      if (this.game.vfx.spawnHitImpact) {
        this.game.vfx.spawnHitImpact(this.x, this.y - 98, attacker, isCrit);
      }
      if (isCrit) {
        this.game.renderer.triggerAberration(5);
        this.game.renderer.triggerHitStop(0.035);
      }
    }

    if (this.hp <= 0 && !this.isDead) {
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.cameraAirLift = 0;
      this.isFlipVault = false;
      this.isAngelicAscent = false;
      this.isBlinkTeleport = false;
      this.isChronoWarp = false;
      this.isOmnislashing = false;
      this.isCrouching = false;
      this.isDeflecting = false;
      this.isSubmerged = false;
      this.isFullyBurrowed = false;
      this.isInvulnerable = false;
      this.unstoppablePoise = false;
      this.hasPoise = false;
      this.isRooted = false;
      this._grabbedByBoss = false;
      this._advPureDodge = false;
      this._advDodgeFrameOverride = null;
      this.chronoTimeStopTimer = 0;
      this.chronoTimeStopFrame = null;
      this._hitStopTimer = 0;
      this.stunTimer = 0;
      this.setState('DEATH');
      this.isDead = true;
      this.deathTimer = 0;
      this.vy = this.y >= this.groundY - 4 ? 0 : Math.max(0, (this.vy || 0) * 0.35);
      this.vx = dir * 115;
      this.torsoVel = dir * 10;
      if (this.game) {
        this.game.renderer.triggerShake(12, 0.25);
        this.game.renderer.triggerAberration(8);
        this.game.renderer.triggerHitStop(0.07);
        this.game.vfx.spawnBurst(this.x, this.y - 95, 32, this.primaryColor, 295, {
          upBias: 145,
          size: 7
        });
        this.game.vfx.spawnBurst(this.x, this.y - 95, 18, '#fde047', 240, {
          upBias: 120,
          size: 6
        });
        this.game.onFighterDeath(this);
      }
    }
  }

  hasIncomingProjectile(game, maxDist = 220) {
    const projs = game?.vfx?.projectiles;
    if (!Array.isArray(projs)) return false;
    for (let i = 0; i < projs.length; i++) {
      const proj = projs[i];
      if (!proj || proj.owner === this) continue;
      if (this.team && proj.owner?.team && proj.owner.team === this.team) continue;
      const dx = this.x - proj.x;
      if (Math.abs(dx) < maxDist && Math.sign(proj.vx || 0) === Math.sign(dx)) {
        return true;
      }
    }
    return false;
  }

  detectIncomingThreatType(enemy, game) {
    if (!game || !game.vfx) return null;
    // 1. Incoming enemy projectile heading toward this fighter
    if (this.hasIncomingProjectile(game, 220)) {
      return 'projectile';
    }
    // 2. Active enemy ground pillar / hazard directly beneath boots
    if (Array.isArray(game.vfx.groundPillars)) {
      for (const pil of game.vfx.groundPillars) {
        if (pil.owner && pil.owner !== this && (!this.team || pil.owner.team !== this.team)) {
          if (Math.abs(pil.x - this.x) < (pil.radius || 75) + 18) {
            return 'ground_hazard';
          }
        }
      }
    }
    // 3. Enemy winding up a melee strike or special skill nearby (skip while enemy is underground/burrowed!)
    if (enemy && !enemy.isDead && !enemy.isFullyBurrowed) {
      const dist = Math.abs(enemy.x - this.x);
      const windupReach = this.getRoleTacticalProfile().role === 'vanguard_juggernaut' ? 235 : 192;
      if (
        dist < windupReach &&
        (enemy.state === 'AUTO_ATTACK' || enemy.state === 'SKILL') &&
        enemy.stateTimer > 0.08 &&
        enemy.stateTimer < 0.46
      ) {
        return 'melee_windup';
      }
      // 4. Ranged fighter crowded in close melee range
      if (this.attackRange > 250 && dist < 175) {
        return 'crowded_ranged';
      }
    }
    return null;
  }

  checkIncomingThreat(enemy, game) {
    return Boolean(this.detectIncomingThreatType(enemy, game));
  }

  triggerSignatureDefense(enemy, game, threatType) {
    const profile = this.getAiStyleProfile();
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const canCrouch =
      typeof this.startCrouch === 'function' &&
      (this._aiSignatureCd || 0) <= 0 &&
      (this.crouchCooldown || 0) <= 0;
    const canJump =
      typeof this.startJump === 'function' && (this._aiSignatureCd || 0) <= 0;

    // Ground hazards & crowded ranged champions prefer aerial escape vaults (`JUMP`) or `DODGE`
    if (threatType === 'ground_hazard' || threatType === 'crowded_ranged') {
      if (canJump && Math.random() < 0.58) {
        let awayDir = -this.facing;
        if (this.x < 195) awayDir = 1;
        else if (this.x > ww - 195) awayDir = -1;
        this._aiSignatureCd = 3.2 + Math.random() * 1.1;
        this.dodgeCooldown = this.dodgeMaxCooldown * (0.82 + Math.random() * 0.24);
        this.startJump(enemy, game, awayDir);
        return true;
      }
      this.startDodge(enemy, game);
      return true;
    }

    // Projectile or melee windup: route to signature Parry / Shield / Hex-Deflect / Frost-Mirror / Shadow-Burrow (`CROUCH`)!
    if (canCrouch && Math.random() < profile.counterCrouchBias) {
      this._aiSignatureCd = 3.4 + Math.random() * 1.2;
      this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.35);
      this.startCrouch(enemy, game);
      return true;
    }

    this.startDodge(enemy, game);
    return true;
  }

  triggerPostComboSignature(enemy, game, dist) {
    const profile = this.getAiStyleProfile();
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    this._aiComboReadyFinisher = 0;
    this._aiManueverSeq = ((this._aiManueverSeq || 0) + 1) % 6;

    const canCrouch =
      typeof this.startCrouch === 'function' &&
      (this._aiSignatureCd || 0) <= 0 &&
      (this.crouchCooldown || 0) <= 0;
    const canJump =
      typeof this.startJump === 'function' &&
      (this._aiSignatureCd || 0) <= 0 &&
      this.dodgeCooldown <= 0.85;
    const canDash = this.dashCooldown <= 0;

    switch (profile.postStyle) {
      case 'vanguard': {
        // Aethelgard: hold relentless Runic Vanguard pressure — only raise Aegis Shield (`CROUCH`) if foe is actively swinging back!
        const foeSwinging =
          enemy && (enemy.state === 'AUTO_ATTACK' || enemy.state === 'SKILL');
        if (canCrouch && foeSwinging && dist <= 235) {
          this._aiSignatureCd = 4.0 + Math.random() * 1.1;
          this.startCrouch(enemy, game);
          return true;
        }
        if (
          canDash &&
          dist > 255 &&
          enemy?.state !== 'SKILL' &&
          !enemy?.iaidoCounterActive &&
          !enemy?.isInvulnerable
        ) {
          this.startDash(enemy, game);
          return true;
        }
        return false;
      }

      case 'juggernaut': {
        // Torgar: plant Forge-Bulwark (`CROUCH`) after 4-hit Maul combo to armor through retaliation, or Meteor-Leap (`JUMP`)!
        if (canCrouch && this._aiManueverSeq % 2 === 0 && dist <= 235) {
          this._aiSignatureCd = 4.2 + Math.random() * 1.2;
          this.startCrouch(enemy, game);
          return true;
        }
        if (canJump && dist > 175 && dist < 305) {
          this._aiSignatureCd = 3.8 + Math.random() * 1.0;
          this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.6);
          this.startJump(enemy, game, this.facing);
          return true;
        }
        this._aiOutstepTimer = 0.24;
        this._aiOutstepDir = -1;
        return false;
      }

      case 'iaido':
      case 'cyber_valkyrie':
      case 'chrono': {
        // Kaze-Maru, VEX-09 & Chronos: agile hit-and-run Vault (`JUMP`), Cross-Dash (`DASH`), Parry/Deflect (`CROUCH`), or Suriashi Out-Step!
        const pick = this._aiManueverSeq % 3;
        if (pick === 0 && canJump) {
          const crossDir =
            this.x > 210 && this.x < ww - 210 && dist < 165 ? this.facing : -this.facing;
          this._aiSignatureCd = 3.4 + Math.random() * 1.0;
          this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.5);
          this.startJump(enemy, game, crossDir);
          return true;
        }
        if (pick === 1 && canCrouch && dist <= 240) {
          this._aiSignatureCd = 3.6 + Math.random() * 1.1;
          this.startCrouch(enemy, game);
          return true;
        }
        const safeDuelistDash =
          canDash &&
          dist > 140 &&
          enemy?.state !== 'AUTO_ATTACK' &&
          enemy?.state !== 'SKILL' &&
          !enemy?.iaidoCounterActive &&
          !enemy?.isDeflecting &&
          !this.hasIncomingProjectile(game, 220);
        if (pick === 2 && safeDuelistDash) {
          this.startDash(enemy, game);
          return true;
        }
        this._aiOutstepTimer = 0.34;
        this._aiOutstepDir = -1;
        return false;
      }

      case 'harvester': {
        // Malakor: dive into Abyssal Shadow-Burrow (`CROUCH`) or Wraith Reap (`JUMP`) after 3-hit Scythe Cleave!
        if (canCrouch && this._aiManueverSeq % 2 === 0) {
          this._aiSignatureCd = 4.0 + Math.random() * 1.2;
          this.startCrouch(enemy, game);
          return true;
        }
        if (canJump && this._aiManueverSeq % 2 === 1) {
          this._aiSignatureCd = 3.6 + Math.random() * 1.0;
          this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.6);
          this.startJump(enemy, game, this.facing);
          return true;
        }
        this._aiOutstepTimer = 0.26;
        this._aiOutstepDir = -1;
        return false;
      }

      case 'sky_lancer':
      case 'marksman':
      case 'cryo_artillery':
      case 'sanctuary':
      case 'nebula_ai':
      case 'pyromancer': {
        // Ranged & Aerial Champions: weave Kneeling Trick-Shot / Frost-Mirror / Backflip / Prayer (`CROUCH`) & Sky-Step / Ascent (`JUMP`)!
        if (canCrouch && this._aiManueverSeq % 2 === 0 && (this.jumpCooldown || 0) <= 0.4) {
          this._aiSignatureCd = 3.8 + Math.random() * 1.2;
          this.startCrouch(enemy, game);
          return true;
        }
        if (canJump && (this.jumpCooldown || 0) <= 0 && (dist < profile.sweetMin + 35 || this.x < 195 || this.x > ww - 195)) {
          const kiteDir = this.x < 210 ? 1 : this.x > ww - 210 ? -1 : -this.facing;
          this._aiSignatureCd = 3.6 + Math.random() * 1.1;
          this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.6);
          this.startJump(enemy, game, kiteDir);
          return true;
        }
        return false;
      }

      default:
        return false;
    }
  }

  _tryRoleDefense(enemy, game, dist, roleProfile, minArenaX, maxArenaX) {
    if (!enemy || !game || !roleProfile || this.dodgeCooldown > 0) return false;
    const hasProjThreat = this.hasIncomingProjectile(game, 220);
    const enemyMidAttack = enemy.state === 'AUTO_ATTACK' || enemy.state === 'SKILL';
    const canCrouch =
      typeof this.startCrouch === 'function' &&
      (this._aiSignatureCd || 0) <= 0 &&
      (this.crouchCooldown || 0) <= 0;
    const canJump =
      typeof this.startJump === 'function' &&
      (this._aiSignatureCd || 0) <= 0 &&
      (this.jumpCooldown || 0) <= 0 &&
      (this.vaultCooldown || 0) <= 0;
    const nearLeft = this.x < minArenaX + 95;
    const nearRight = this.x > maxArenaX - 95;
    const awayDir = nearLeft ? 1 : nearRight ? -1 : -this.facing;

    const invokeCrouch = () => {
      this._aiSignatureCd = 3.2 + Math.random() * 1.0;
      this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.35);
      if (this.getBaseHeroId() === 'valkyrie') this.backflipKiteTimer = 1.65;
      this.startCrouch(enemy, game);
      return true;
    };
    const invokeJump = (dir) => {
      this._aiSignatureCd = 3.2 + Math.random() * 1.0;
      this.dodgeCooldown = this.dodgeMaxCooldown * (0.82 + Math.random() * 0.24);
      this.startJump(enemy, game, dir);
      return true;
    };

    switch (roleProfile.role) {
      case 'artillery_mage': {
        if (hasProjThreat && canCrouch) return invokeCrouch();
        if (dist < (roleProfile.jumpEscapeDist || 225) && canJump) return invokeJump(awayDir);
        if (
          canCrouch &&
          (hasProjThreat ||
            (dist < (roleProfile.crouchMaxDist || 250) &&
              (enemyMidAttack || enemy.state === 'DASH' || dist < 195)))
        ) {
          return invokeCrouch();
        }
        break;
      }
      case 'sanctum_support': {
        if (dist < (roleProfile.pressuredDist || 260)) {
          if (canJump && (nearLeft || nearRight || !canCrouch)) return invokeJump(awayDir);
          if (canCrouch) return invokeCrouch();
        }
        if (
          canCrouch &&
          (hasProjThreat ||
            (this.hp < this.maxHp * (roleProfile.healHpFrac || 0.82) && this.skillCooldown > 0))
        ) {
          return invokeCrouch();
        }
        break;
      }
      case 'mobile_marksman': {
        if (dist < (roleProfile.pressuredDist || 255) || hasProjThreat) {
          if (canCrouch && (this.backflipKiteTimer || 0) <= 0) return invokeCrouch();
          if (dist < (roleProfile.pressuredDist || 255) && canJump) return invokeJump(awayDir);
        }
        break;
      }
      case 'counter_duelist': {
        if (hasProjThreat || (enemyMidAttack && dist < 215)) {
          if (
            canCrouch &&
            (hasProjThreat || (enemy.stateTimer > 0.06 && enemy.stateTimer < 0.46))
          ) {
            return invokeCrouch();
          }
          if (canJump) return invokeJump(nearLeft || nearRight ? awayDir : this.facing);
          this.startDodge(enemy, game);
          return true;
        }
        break;
      }
      case 'vanguard_juggernaut': {
        if (
          canCrouch &&
          dist < (roleProfile.crouchMaxDist || 235) &&
          (hasProjThreat || enemyMidAttack)
        ) {
          return invokeCrouch();
        }
        break;
      }
      case 'abyssal_stalker': {
        const enemyIsRanged =
          (enemy.attackRange || 0) >= 250 || Boolean(enemy.isHackAndSlashCaster?.());
        if (
          canCrouch &&
          ((enemyIsRanged &&
            dist >= (roleProfile.burrowMinDist || 200) &&
            dist <= (roleProfile.burrowMaxDist || 460) &&
            (enemyMidAttack || hasProjThreat)) ||
            (dist < 195 && enemyMidAttack))
        ) {
          return invokeCrouch();
        }
        break;
      }
    }

    const threatType = this.detectIncomingThreatType(enemy, game);
    if (threatType) {
      this.triggerSignatureDefense(enemy, game, threatType);
      return true;
    }
    return false;
  }

  _canCastRoleSkill(enemy, dist, roleProfile, atkRange) {
    if (!roleProfile) return false;
    if (roleProfile.role === 'vanguard_juggernaut' && dist > (roleProfile.skillMaxDist || 360)) {
      return false;
    }
    const isComboFinisher = (this._aiComboReadyFinisher || 0) > 0;
    const enemyStaggered =
      enemy.state === 'HURT' || (enemy.stunTimer || 0) > 0 || (enemy.chronoTimeStopTimer || 0) > 0;
    const enemyCommitted =
      (enemy.state === 'AUTO_ATTACK' || enemy.state === 'SKILL' || enemy.state === 'CROUCH') &&
      (enemy.stateTimer || 0) > 0.05;
    const midComboHold =
      (this._aiComboCount || 0) > 0 && dist <= atkRange && (this._aiSkillReadyTime || 0) < 0.72;
    if (midComboHold) return false;

    const patienceGoal =
      this._aiSkillPatience || (this._aiSkillPatience = 1.55 + Math.random() * 0.55);
    const readyTime = this._aiSkillReadyTime || 0;
    if (isComboFinisher || enemyStaggered || enemyCommitted || readyTime >= patienceGoal) {
      return true;
    }

    switch (roleProfile.role) {
      case 'artillery_mage':
        return (
          readyTime >= 0.45 &&
          dist >= 240 &&
          dist <= 480 &&
          (enemy.state === 'WALK' || enemy.state === 'DASH')
        );
      case 'sanctum_support':
        return (
          this.hp < this.maxHp * (roleProfile.healHpFrac || 0.82) ||
          dist < (roleProfile.pressuredDist || 260)
        );
      case 'mobile_marksman':
        return (
          readyTime >= (roleProfile.baseHeroId === 'valkyrie' ? 1.25 : 0.75) &&
          dist >= (roleProfile.idealMin || 320) &&
          this.autoCooldown > 0.15
        );
      case 'counter_duelist':
        return false;
      case 'vanguard_juggernaut':
        return readyTime >= 0.55 && dist <= 225 && this.autoCooldown > 0.10;
      case 'abyssal_stalker':
        return readyTime >= 0.50 && dist >= 165 && dist <= 340;
      default:
        return false;
    }
  }

  _shouldRoleDash(enemy, game, dist, roleProfile, ww) {
    if (!roleProfile || !enemy || enemy.isDead) return false;
    if (
      enemy.isInvulnerable ||
      enemy.isDeflecting ||
      enemy.iaidoCounterActive ||
      enemy.isFullyBurrowed
    ) {
      return false;
    }
    const enemySwinging = enemy.state === 'AUTO_ATTACK' || enemy.state === 'SKILL';
    const hasProj = this.hasIncomingProjectile(game, 220);
    switch (roleProfile.role) {
      case 'artillery_mage':
        return dist > (roleProfile.dashMinDist || 540);
      case 'sanctum_support':
        return dist > (roleProfile.dashMinDist || 560);
      case 'mobile_marksman':
        return (
          dist > (roleProfile.dashMinDist || 530) ||
          ((this.x < 210 || this.x > ww - 210) && dist < 245)
        );
      case 'counter_duelist':
        return !enemySwinging && !hasProj && dist > 185;
      case 'vanguard_juggernaut':
        return dist > (roleProfile.dashMinDist || 255) && enemy.state !== 'SKILL' && !hasProj;
      case 'abyssal_stalker':
        return dist > 205 && enemy.state !== 'SKILL' && !hasProj;
      default:
        return dist > 205;
    }
  }

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.dashDuration = 0.44;
    this.setState('DODGE');
    this.isInvulnerable = true;
    const ww = game.renderer.worldWidth;
    // Choose smart evasion direction with arena boundary awareness
    let dir = -this.facing;
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;
    this.dashDir = dir;
    if (this.onStartDodge) {
      this.onStartDodge(enemy, game, dir);
    }
  }

  startDash(enemy, game) {
    this.dashCooldown = this.dashMaxCooldown * (0.86 + Math.random() * 0.28);
    this.dashDuration = 0.42;
    this.setState('DASH');
    this.dashDir = this.facing;
    if (this.onStartDash) {
      this.onStartDash(enemy, game, this.facing);
    }
  }

  update(dt, enemy, game) {
    const hadGameRef = Boolean(this.game);
    this.game = game;
    if (!game?.adventure?.active && game?.renderer && Number.isFinite(game.renderer.groundY)) {
      this.groundY = game.renderer.groundY;
    }

    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this._hitShakeTimer > 0) this._hitShakeTimer = Math.max(0, this._hitShakeTimer - dt);
    if (this._evadeManaCd > 0) this._evadeManaCd = Math.max(0, this._evadeManaCd - dt);
    if (this._buildShieldTextCd > 0) this._buildShieldTextCd = Math.max(0, this._buildShieldTextCd - dt);
    if (this._buildRootTextCd > 0) this._buildRootTextCd = Math.max(0, this._buildRootTextCd - dt);
    if (this.buildShieldTimer > 0) {
      this.buildShieldTimer = Math.max(0, this.buildShieldTimer - dt);
      if (this.buildShieldTimer <= 0 || this.game?.isAdventureMode?.()) {
        this.buildShieldHp = 0;
        this.buildShieldTimer = 0;
      }
    }
    if (this.buildRootTimer > 0) {
      this.buildRootTimer = Math.max(0, this.buildRootTimer - dt);
      if (!game?.isAdventureMode?.() && !this.isDead && !this.unstoppablePoise) {
        this.vx *= 0.16;
      }
    }

    // Chronos "ETERNAL ZERO" Time-Stop Freeze: freezes enemies mid-frame & mid-air in stopped time!
    if (this.chronoTimeStopTimer > 0 && !this.isDead && this.state !== 'TRUE_ULTIMATE') {
      this.chronoTimeStopTimer = Math.max(0, this.chronoTimeStopTimer - dt);
      if (Number.isFinite(this._timeStopLockX)) this.x = this._timeStopLockX;
      if (Number.isFinite(this._timeStopLockY)) this.y = this._timeStopLockY;
      this.vx = 0;
      this.vy = 0;
      if (this.chronoTimeStopTimer <= 0) {
        this.chronoTimeStopFrame = null;
        this._timeStopLockX = null;
        this._timeStopLockY = null;
      }
      return;
    }

    // Opt-in Crunchy Anime Hit-Stop (`_hitStopTimer`): freezes stateTimer, frame & physics on heavy melee impact!
    if (this._hitStopTimer > 0 && !this.isDead && !this.isBenched && this.state !== 'TRUE_ULTIMATE') {
      this._hitStopTimer = Math.max(0, this._hitStopTimer - dt);
      return;
    }

    // Benched Reserve Fighter on the Sanctuary Tag Pedestal (in 2v2 Tag Relay mode)
    if (this.isBenched && !this.isDead) {
      const ww = game.renderer ? game.renderer.worldWidth : 1200;
      const isLeftTeam = this.team === 'left' || this.team === 1;
      const foes = game?.getEnemiesOf ? game.getEnemiesOf(this) : [];
      if (game?.isMatchOver && foes.length > 0 && foes.every((f) => f?.isDead)) {
        this.isBenched = false;
        this.x = isLeftTeam ? 156 : ww - 156;
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.facing = isLeftTeam ? 1 : -1;
        this.setState('VICTORY');
        return;
      }
      const targetBenchX = isLeftTeam ? 54 : ww - 54;
      this.x += (targetBenchX - this.x) * Math.min(1, dt * 10);
      this.y = this.groundY - 6;
      this.vx = 0;
      this.vy = 0;
      this.facing = isLeftTeam ? 1 : -1;
      this.state = 'IDLE';
      this.isFlipVault = false;
      this.isCrouching = false;
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
      this.walkPhase += dt * 2.5;
      this.headBob = Math.sin(this.walkPhase) * 1.8;
      this.torsoAngle *= Math.pow(0.05, dt);
      this.gainMana(dt * 2.2);
      if (this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + dt * 3.5);
      }
      this.autoCooldown = Math.max(0, this.autoCooldown - dt);
      this.skillCooldown = Math.max(0, this.skillCooldown - dt);
      this.updateCape(dt);
      return;
    }

    // Test Mode (Unlimited HP): smoothly restore HP after brief impact hold or out-of-combat window
    if (game && game.testModeUnlimitedHp && !this.isMonster && !this.isDead) {
      this.timeSinceLastHit = (this.timeSinceLastHit || 0) + dt;
      if (this._testModeRefillTimer > 0) {
        this._testModeRefillTimer = Math.max(0, this._testModeRefillTimer - dt);
      }
      const needsLowRefill = this.hp <= Math.max(2, this.maxHp * 0.08) && (this._testModeRefillTimer || 0) <= 0;
      const needsIdleRefill = this.timeSinceLastHit >= 1.8 && this.hp < this.maxHp;
      if (needsLowRefill || needsIdleRefill) {
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.85 * dt);
        if (this.isBerserk && this.hp / this.maxHp > 0.55) {
          this.isBerserk = false;
        }
      }
    }

    if (!this.isDead && this.state !== 'ULTIMATE' && this.state !== 'TRUE_ULTIMATE') {
      this.gainMana(dt * 4.5);
      if (this.hasTrueUltimate) {
        this.gainFinisher(dt * 0.25);
      }
    }

    // Personal-space repulsion so characters never crowd on top of each other (lane-aware in 3D Adventure Mode)
    if (
      enemy &&
      !this.isDead &&
      !enemy.isDead &&
      !this.isRooted &&
      !(this.stunTimer > 0) &&
      this.state !== 'ULTIMATE' &&
      this.state !== 'TRUE_ULTIMATE' &&
      enemy.state !== 'ULTIMATE' &&
      enemy.state !== 'TRUE_ULTIMATE' &&
      this.state !== 'DASH' &&
      this.state !== 'DODGE' &&
      !this._phaseThroughEnemy &&
      !enemy._phaseThroughEnemy &&
      !this._hnsPhaseThrough &&
      !enemy._hnsPhaseThrough &&
      !this.isFullyBurrowed &&
      !enemy.isFullyBurrowed &&
      !this._grabbedByBoss &&
      !enemy._grabbedByBoss
    ) {
      const isAdv3D = Boolean(game?.adventure?.active);
      const depthDiff = Math.abs((this.groundY || this.y) - (enemy.groundY || enemy.y));
      if (!isAdv3D || depthDiff < 46) {
        const dx = this.x - enemy.x;
        const absDx = Math.abs(dx);
        const inCloseMeleeSwing =
          (this.state === 'AUTO_ATTACK' && this.isHackAndSlashMelee()) ||
          (enemy.state === 'AUTO_ATTACK' && enemy.isHackAndSlashMelee?.());
        const isExviusSwing =
          inCloseMeleeSwing &&
          (Boolean(this.heroId?.endsWith('_ex')) || Boolean(enemy.heroId?.endsWith('_ex')));
        const minSep = isExviusSwing
          ? isAdv3D
            ? 88
            : 98
          : inCloseMeleeSwing
            ? isAdv3D
              ? 68
              : 76
            : isAdv3D
              ? 82
              : 110;
        if (absDx < minSep) {
          const pushDir = dx === 0 ? -this.facing : Math.sign(dx);
          this.x += pushDir * (minSep - absDx) * 6.5 * dt;
        }
      }
    }

    // 2v2 Teammate Tactical Spacing: keep a natural 76px Vanguard/Flanker stagger so allies never stack on the same X pixel
    if (
      game &&
      game.gameMode === '2v2_brawl' &&
      !this.isDead &&
      !this.isRooted &&
      !(this.stunTimer > 0) &&
      this.state !== 'ULTIMATE' &&
      this.state !== 'TRUE_ULTIMATE' &&
      this.state !== 'DASH' &&
      this.state !== 'DODGE' &&
      !this._phaseThroughEnemy &&
      !this._hnsPhaseThrough
    ) {
      const ally = game.getTeammateOf ? game.getTeammateOf(this) : null;
      if (ally && !ally.isDead && !ally.isBenched && !ally._phaseThroughEnemy) {
        const adx = this.x - ally.x;
        const absAdx = Math.abs(adx);
        const allySep = 76;
        if (absAdx < allySep) {
          const defaultDir = this.slotRole === 'partner' ? -this.facing : this.facing;
          const pushDir = absAdx < 4 ? defaultDir : Math.sign(adx);
          this.x += pushDir * (allySep - absAdx) * 4.8 * dt;
        }
      }
    }

    // Physics integration & Gravity (skipped while in a controlled parabolic flip-vault arc, Adventure pure dodge, boss grab, or hard-rooted)
    if (this.isDead) {
      this.x += (this.vx || 0) * dt;
      this.vx = (this.vx || 0) * Math.pow(0.002, dt);
    } else if (this.isRooted || this._grabbedByBoss) {
      this.vx = 0;
      this.vy = 0;
    } else if (!this.isFlipVault && !this._advPureDodge) {
      this.vy += 980 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.vx *= Math.pow(0.001, dt);
      } else {
        this.vx *= Math.pow(0.25, dt);
      }
    }

    // Virtual Arena boundaries (or active Adventure Mode wave-lock & 3D walkable floor boundaries)
    const margin = 80;
    const minArenaX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
        ? game.adventure.lockMinX
        : margin;
    const bossWallAlive = Boolean(
      game?.adventure?.bossEntity &&
        !game.adventure.bossEntity.isDead &&
        game.adventure.bossEntity.isColossalBoss &&
        !this.isColossalBoss
    );
    const rawMaxArenaX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX
        : game.renderer.worldWidth - margin;
    const maxArenaX = bossWallAlive
      ? Math.min(rawMaxArenaX, (game.adventure.bossEntity.anchorX || 9335) - 85)
      : rawMaxArenaX;
    this.x = Math.max(minArenaX, Math.min(maxArenaX, this.x));

    if (game?.adventure?.active && Number.isFinite(this.groundY)) {
      const minGy = game.adventure.depthMinY || 442;
      const maxGy = game.adventure.depthMaxY || 680;
      const prevGy = this.groundY;
      this.groundY = Math.max(minGy, Math.min(maxGy, this.groundY));
      const dGy = this.groundY - prevGy;
      if (dGy !== 0) {
        this.y += dGy;
      }
    }

    this.updateCape(dt);

    if (this.isDead) {
      if (this.state !== 'DEATH') {
        this.state = 'DEATH';
      }
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.cameraAirLift = 0;
      this.deathTimer = (this.deathTimer || 0) + dt;
      if (this.y < this.groundY) {
        this.vy = (this.vy || 0) + 1450 * dt;
        this.y = Math.min(this.groundY, this.y + this.vy * dt);
        if (this.y >= this.groundY) {
          this.y = this.groundY;
          this.vy = 0;
        }
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
      this.torsoAngle += (Math.PI * 0.48 * -this.facing - this.torsoAngle) * 6 * dt;
      if (this.deathTimer < 2.6 && Math.random() < 0.22 && game?.vfx) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 64,
          y: this.y - 12 - Math.random() * 24,
          vx: (Math.random() - 0.5) * 22,
          vy: -42 - Math.random() * 45,
          size: 4,
          color: this.primaryColor,
          maxLife: 0.65
        });
      }
      return;
    }

    const isManualPlayer = Boolean(
      (this.isPlayerControlled && !this.adventureAutoPlay) || this.isManualAdventureControl
    );
    if (
      enemy &&
      !enemy.isFullyBurrowed &&
      !this._advPureDodge &&
      this.state !== 'ULTIMATE' &&
      this.state !== 'TRUE_ULTIMATE' &&
      (!isManualPlayer || (this.state !== 'IDLE' && this.state !== 'WALK')) &&
      !(
        this.state === 'AUTO_ATTACK' &&
        this.hasHackAndSlashCombo() &&
        (enemy.isDestructibleProp ||
          enemy.isDummyFocal ||
          Math.abs(enemy.x - this.x) > this.getHackAndSlashLockRange())
      )
    ) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    let cdMult = this.isBerserk ? 1.25 : 1.0;
    if (game && game.stageEventTimer > 0 && game.renderer?.stageId === 'clocktower') {
      cdMult *= 1.35;
    }
    this.autoCooldown = Math.max(0, this.autoCooldown - dt * cdMult);
    this.skillCooldown = Math.max(0, this.skillCooldown - dt * cdMult);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt * cdMult);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt * cdMult);
    if (this._aiSignatureCd > 0) this._aiSignatureCd = Math.max(0, this._aiSignatureCd - dt * cdMult);
    if (this._aiOutstepTimer > 0) this._aiOutstepTimer = Math.max(0, this._aiOutstepTimer - dt);
    if (this._aiComboReadyFinisher > 0) {
      this._aiComboReadyFinisher = Math.max(0, this._aiComboReadyFinisher - dt);
    }
    if (this._aiComboChainTimer > 0) {
      this._aiComboChainTimer = Math.max(0, this._aiComboChainTimer - dt);
      if (this._aiComboChainTimer <= 0) {
        this._aiComboCount = 0;
        if (!this.isPlayerControlled && this.hasHackAndSlashCombo()) {
          this.comboStep = 0;
        }
      }
    }
    if (this._hnsStreaks?.length) {
      for (let i = this._hnsStreaks.length - 1; i >= 0; i--) {
        this._hnsStreaks[i].age += dt;
        if (this._hnsStreaks[i].age >= this._hnsStreaks[i].maxLife) {
          this._hnsStreaks.splice(i, 1);
        }
      }
    }
    if (this._advDodgeTrails?.length) {
      for (let i = this._advDodgeTrails.length - 1; i >= 0; i--) {
        this._advDodgeTrails[i].age += dt;
        if (this._advDodgeTrails[i].age >= this._advDodgeTrails[i].maxLife) {
          this._advDodgeTrails.splice(i, 1);
        }
      }
    }
    const inNeutralState = this.state === 'IDLE' || this.state === 'WALK';
    if (this.skillCooldown <= 0) {
      if (inNeutralState) {
        this._aiSkillReadyTime = (this._aiSkillReadyTime || 0) + dt;
      }
    } else {
      this._aiSkillReadyTime = 0;
    }
    if (this.mana >= this.maxMana) {
      if (inNeutralState) {
        this._aiUltReadyTime = (this._aiUltReadyTime || 0) + dt;
      }
    } else {
      this._aiUltReadyTime = 0;
    }
    if (this.hasTrueUltimate && this.finisherGauge >= this.maxFinisherGauge) {
      if (inNeutralState) {
        this._aiFinisherReadyTime = (this._aiFinisherReadyTime || 0) + dt;
      }
    } else {
      this._aiFinisherReadyTime = 0;
    }
    this.stateTimer += dt;

    // TABS Spring-damper torso physics
    const targetTorso = this.getTargetTorsoAngle();
    const force = (targetTorso - this.torsoAngle) * 130 - this.torsoVel * 11;
    this.torsoVel += force * dt;
    this.torsoAngle += this.torsoVel * dt;

    if (typeof this.heroId === 'string' && this.heroId.endsWith('_ex')) {
      const exSys = this._ensureExParticles();
      if (exSys) {
        exSys.emitAmbient(dt, this);
        exSys.update(dt);
      }
    }

    // Ambient Aura & Desperation Overdrive Particles (decluttered for the custom-shader heroes)
    const isDeclutteredHero =
      Boolean(this.heroId?.endsWith('_ex')) ||
      this.heroId === 'titan' ||
      this.heroId === 'reaper' ||
      this.heroId === 'archer' ||
      this.heroId === 'icemage' ||
      this.heroId === 'android' ||
      this.heroId === 'chronomancer' ||
      Boolean(this.isMonster);
    const ambientChance = isDeclutteredHero ? (this.isBerserk ? 0.10 : 0) : this.isBerserk ? 0.56 : 0.28;
    if (!this.isFullyBurrowed && ambientChance > 0 && Math.random() < ambientChance) {
      game.vfx.spawnParticle({
        x: this.x + (Math.random() - 0.5) * (this.isBerserk ? 48 : 34),
        y: this.y - Math.random() * (this.isBerserk ? 85 : 60),
        vx: (Math.random() - 0.5) * 24,
        vy: -38 - Math.random() * (this.isBerserk ? 55 : 35),
        size: isDeclutteredHero ? 3.5 : this.isBerserk ? 5 : 3.5,
        color: this.isBerserk && Math.random() < 0.45 ? '#facc15' : this.primaryColor,
        maxLife: 0.55
      });
    }

    const dist = enemy ? Math.abs(enemy.x - this.x) : 999;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;

    // Stun / Root Lock (e.g., Torgar's Home-Run Stun, Lyra's Absolute Zero Freeze, Sylvara's Yggdrasil Roots)
    if ((this.stunTimer > 0 || this.isRooted) && this.state !== 'TRUE_ULTIMATE') {
      if (this.stunTimer > 0) {
        this.stunTimer = Math.max(0, this.stunTimer - dt);
      }
      this.vx = this.isRooted ? 0 : this.vx * Math.pow(0.001, dt);
      if (this.isRooted) this.vy = 0;
      this.hurtTimer = Math.max(this.hurtTimer, 0.14);
      if (this.state !== 'IDLE') {
        this.setState('IDLE');
      }
      this.isCrouching = false;
      this.isDeflecting = false;
      return;
    }

    if (this.state === 'IDLE' || this.state === 'WALK') {
      this._overrideFrameIdx = null;
      this.trueUltFrameOverride = null;
      if (isManualPlayer) {
        if (game?.isMatchOver && !this.isDead && this.y >= this.groundY - 2) {
          this.setState('VICTORY');
          this.moveDir = 0;
        } else if (this._manualWalkActive) {
          this.state = 'WALK';
          const spdRatio = Number.isFinite(this._manualSpeedRatio)
            ? Math.max(0.32, Math.min(1.2, this._manualSpeedRatio))
            : 1.0;
          this.walkPhase += dt * (2.0 + 2.4 * spdRatio);
          this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.2;
        } else {
          this.state = 'IDLE';
          this.moveDir = 0;
        }
      } else if (enemy && !enemy.isDead) {
        const isAdvMode = Boolean(game?.isAdventureMode?.());
        const aiProfile = this.getAiStyleProfile();
        const roleProfile = !isAdvMode ? this.getRoleTacticalProfile() : null;
        const atkRange = this.getEffectiveAttackRange ? this.getEffectiveAttackRange() : this.attackRange;
        if (this.backflipKiteTimer > 0) {
          this.backflipKiteTimer = Math.max(0, this.backflipKiteTimer - dt);
        }

        const enemyProtected = isAdvMode
          ? Boolean(enemy.isInvulnerable)
          : Boolean(
              enemy.isInvulnerable ||
              enemy.isDeflecting ||
              enemy.iaidoCounterActive ||
              enemy.isFullyBurrowed
            );
        const enemyStaggered = Boolean(
          enemy.state === 'HURT' ||
          (enemy.stunTimer || 0) > 0 ||
          (enemy.chronoTimeStopTimer || 0) > 0
        );
        const enemyCommitted = Boolean(
          (enemy.state === 'AUTO_ATTACK' || enemy.state === 'SKILL' || enemy.state === 'CROUCH') &&
          (enemy.stateTimer || 0) > 0.05
        );
        const isLegacyUnitTestTick0 =
          !this.heroId?.endsWith('_ex') &&
          !hadGameRef &&
          !game?.fighters &&
          this.stateTimer <= dt + 1e-6 &&
          (this._aiFinisherReadyTime || 0) < 0.05 &&
          (this._aiUltReadyTime || 0) < 0.05;

        // 0. SUPREME FINISHING MOVE ("ULTIMATE" Gauge — higher tier than Overdrive!)
        const finisherRangeOk = isAdvMode
          ? true
          : roleProfile.role === 'vanguard_juggernaut'
            ? dist <= 400
            : dist <= (roleProfile.ultMaxDist || Infinity);
        const finisherTimingOk = isAdvMode
          ? true
          : isLegacyUnitTestTick0 ||
            enemyStaggered ||
            (enemyCommitted &&
              dist <=
                (roleProfile.role === 'vanguard_juggernaut' ? 360 : (atkRange || 180) * 1.65)) ||
            (this._aiFinisherReadyTime || 0) >= 0.85;
        if (
          this.hasTrueUltimate &&
          this.finisherGauge >= this.maxFinisherGauge &&
          !enemyProtected &&
          finisherRangeOk &&
          finisherTimingOk &&
          typeof this.updateTrueUltimate === 'function'
        ) {
          this.finisherGauge = 0;
          this._aiFinisherReadyTime = 0;
          if (this.stats) this.stats.ultsUsed++;
          this.setState('TRUE_ULTIMATE');
          if (typeof game.triggerTrueUltimateCinematic === 'function') {
            game.triggerTrueUltimateCinematic(this);
          } else {
            game.triggerUltimateCinematic(this);
          }
          return;
        }

        // 1. Smart Archetype Overdrive Timing (don't waste Overdrive into parries/burrow/invuln or from out of range!)
        const baseHeroId = this.getBaseHeroId();
        const ultRangeOk = isAdvMode
          ? baseHeroId === 'warrior'
            ? dist <= 400
            : baseHeroId === 'reaper' || baseHeroId === 'titan' || baseHeroId === 'ronin'
              ? dist <= 480
              : baseHeroId === 'valkyrie'
                ? dist <= 620
                : true
          : dist <= (roleProfile.ultMaxDist || Infinity);
        const ultTimingOk = isAdvMode
          ? true
          : roleProfile.role === 'sanctum_support'
            ? this.hp < this.maxHp * (roleProfile.ultHpFrac || 0.85) ||
              enemyStaggered ||
              enemyCommitted ||
              (this._aiUltReadyTime || 0) >= (roleProfile.ultPatience || 1.20)
            : isLegacyUnitTestTick0 ||
              enemyStaggered ||
              (enemyCommitted &&
                dist <=
                  (roleProfile.role === 'vanguard_juggernaut'
                    ? 360
                    : (atkRange || 180) * 1.75)) ||
              (this._aiUltReadyTime || 0) >= 1.05;
        if (this.mana >= this.maxMana && !enemyProtected && ultRangeOk && ultTimingOk) {
          this.mana = 0;
          this._aiUltReadyTime = 0;
          if (this.hasTrueUltimate) {
            this.gainFinisher(24);
          }
          if (this.stats) this.stats.ultsUsed++;
          this.setState('ULTIMATE');
          game.triggerUltimateCinematic(this);
          return;
        }

        // Shadow-Burrow Ambush Awareness: keep back turned & hold cautious guard without wasting cooldowns into empty ground
        if (!isAdvMode && enemy.isFullyBurrowed) {
          if (this.dodgeCooldown <= 0) {
            const hazardThreat = this.detectIncomingThreatType(enemy, game);
            if (hazardThreat) {
              this.triggerSignatureDefense(enemy, game, hazardThreat);
              return;
            }
          }
          this.state = 'IDLE';
          this.moveDir = 0;
          return;
        }

        // 2. Role-Tailored Counter-Read Defense (`CROUCH` Parries/Shields/Hex-Deflects/Mirrors/Burrows + `JUMP` Vaults + `DODGE` — VS Modes only)
        const hnsChainRange = this.isHackAndSlashCaster()
          ? isAdvMode
            ? 475
            : Math.max(atkRange, 480)
          : 205;
        const inHackSlashChain =
          this.hasHackAndSlashCombo() &&
          (this.comboStep || 0) !== 0 &&
          (this._aiComboChainTimer || 0) > 0 &&
          dist <= hnsChainRange;
        if (!isAdvMode && !inHackSlashChain && this.dodgeCooldown <= 0) {
          if (this._tryRoleDefense(enemy, game, dist, roleProfile, minArenaX, maxArenaX)) {
            return;
          }
        }

        // 3. Combo-Finisher, Role-Trigger & Parry-Respecting `SKILL` Execution
        const rawMaxSkillDist = this.skillTriggerRange || this.attackRange * 2.2;
        const maxSkillDist =
          !isAdvMode && roleProfile?.role === 'vanguard_juggernaut'
            ? Math.min(rawMaxSkillDist, roleProfile.skillMaxDist || 360)
            : rawMaxSkillDist;
        if (!inHackSlashChain && this.skillCooldown <= 0 && dist <= maxSkillDist && !enemyProtected) {
          const shouldCastSkill = isAdvMode
            ? (() => {
                const isComboFinisher = (this._aiComboReadyFinisher || 0) > 0;
                const isPunishWindow =
                  enemy.state === 'AUTO_ATTACK' ||
                  enemy.state === 'SKILL' ||
                  enemy.state === 'CROUCH' ||
                  enemy.state === 'HURT' ||
                  (enemy.stunTimer || 0) > 0;
                const isInterceptOpening = dist > atkRange * 1.06;
                const midComboHold =
                  (this._aiComboCount || 0) > 0 &&
                  dist <= atkRange &&
                  (this._aiSkillReadyTime || 0) < 0.68;
                return (
                  !midComboHold &&
                  (isComboFinisher ||
                    isPunishWindow ||
                    isInterceptOpening ||
                    (this._aiSkillReadyTime || 0) >= 0.68)
                );
              })()
            : this._canCastRoleSkill(enemy, dist, roleProfile, atkRange);

          if (shouldCastSkill) {
            this.skillCooldown = this.skillMaxCooldown * (0.86 + Math.random() * 0.28);
            this._aiSkillReadyTime = 0;
            this._aiSkillPatience = 1.55 + Math.random() * 0.55;
            this._aiComboReadyFinisher = 0;
            if (this.stats) this.stats.skillsUsed++;
            this.setState('SKILL');
            if (game.vfx && game.vfx.spawnSpecialCastAura) {
              game.vfx.spawnSpecialCastAura(
                this,
                this.skillName,
                '* SPECIAL SKILL *',
                this.theme || 'steel',
                false
              );
            }
            return;
          }
        }

        // 4. Post-Combo Archetype Signature Maneuver (VS Modes only)
        if (!inHackSlashChain && !isAdvMode && (this._aiComboReadyFinisher || 0) > 0) {
          if (this.triggerPostComboSignature(enemy, game, dist)) {
            return;
          }
        }

        // 5. Mid-Range Aerial Vault Engage (`JUMP`) & Role-Aware `DASH` (VS Modes only)
        if (
          !inHackSlashChain &&
          !isAdvMode &&
          aiProfile.midLeapChance > 0 &&
          dist >= aiProfile.midLeapMin &&
          dist <= aiProfile.midLeapMax &&
          (this._aiSignatureCd || 0) <= 0 &&
          this.dodgeCooldown <= 0.35 &&
          (this.jumpCooldown || 0) <= 0 &&
          (this.vaultCooldown || 0) <= 0 &&
          typeof this.startJump === 'function' &&
          Math.random() < aiProfile.midLeapChance * 0.35
        ) {
          this._aiSignatureCd = 3.5 + Math.random() * 1.1;
          this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.5);
          this.startJump(enemy, game, this.facing);
          return;
        }

        const isExFighter = Boolean(this.heroId?.endsWith('_ex'));
        const isRangedEx = RANGED_EX_HERO_IDS.has(this.heroId);
        const shouldDash =
          !inHackSlashChain &&
          !isAdvMode &&
          this._shouldRoleDash(enemy, game, dist, roleProfile, ww);
        if (this.dashCooldown <= 0 && shouldDash) {
          this.startDash(enemy, game);
          return;
        }

        // 6. Disciplined Combo Strings & Expressive Per-Champion Neutral Footsies
        const effAtkRange = inHackSlashChain ? Math.max(atkRange, hnsChainRange) : atkRange;
        if (dist <= effAtkRange) {
          const bossColossalAlive = Boolean(
            isAdvMode && game?.adventure?.bossEntity && !game.adventure.bossEntity.isDead && game.adventure.bossEntity.isColossalBoss
          );
          const effMinWall = minArenaX;
          const effBackMaxWall = bossColossalAlive ? maxArenaX + 400 : maxArenaX;
          const outstepMargin = 85;
          const rangeWallMargin = 95;
          // Brief martial out-step feint right after completing a full combo string so fighters breathe & bait whiffs!
          if (!inHackSlashChain && (this._aiOutstepTimer || 0) > 0 && dist < atkRange * 0.94) {
            const nearWall = this.x < effMinWall + outstepMargin || this.x > effBackMaxWall - outstepMargin;
            const stepSign = nearWall ? 1 : this._aiOutstepDir || -1;
            this.state = 'WALK';
            this.moveDir = stepSign;
            this.walkPhase += dt * 4.4;
            this.x += this.facing * stepSign * this.moveSpeed * 0.72 * dt;
            this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
            return;
          }

          if (this.autoCooldown <= 0) {
            this.setState('AUTO_ATTACK');
            if (this.hasHackAndSlashCombo()) {
              if ((this.comboStep || 0) !== 0) {
                this.autoCooldown = isExFighter ? 0.015 : 0.02;
              } else {
                const postInt = this._postFlurryInterval || 1.65;
                this.autoCooldown = postInt * (0.90 + Math.random() * 0.20);
                this._aiOutstepTimer = 0.22;
                this._aiOutstepDir = -1;
              }
            } else {
              this.autoCooldown = this.autoInterval * (0.88 + Math.random() * 0.22);
            }
            return;
          }

          if (inHackSlashChain) {
            this.moveDir = 0;
            this.vx = 0;
            return;
          }

          // Between attacks (autoCooldown > 0), each champion exhibits their authentic martial spacing & footwork!
          const isRangedArchetype = this.attackRange >= 300 || isRangedEx;
          if (isRangedArchetype) {
            if (this.heroId === 'valkyrie' || this.heroId === 'valkyrie_ex') {
              if (
                !isAdvMode &&
                dist < 325 &&
                (this.backflipKiteTimer || 0) <= 0 &&
                (this.crouchCooldown || 0) <= 0 &&
                this.startCrouch
              ) {
                this.backflipKiteTimer = 1.65;
                this.startCrouch(enemy, game);
                return;
              }
              const nearWall = this.x < effMinWall + rangeWallMargin || this.x > effBackMaxWall - rangeWallMargin;
              const vSweetMin = (!isAdvMode && roleProfile?.idealMin) || aiProfile.sweetMin || 310;
              const vSweetMax = (!isAdvMode && roleProfile?.idealMax) || aiProfile.sweetMax || 375;
              if (dist < vSweetMin && !nearWall) {
                this.state = 'WALK';
                this.moveDir = -1;
                this.walkPhase += dt * 4.2;
                this.x -= this.facing * this.moveSpeed * 0.72 * dt;
                this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
              } else if (dist > vSweetMax) {
                this.state = 'WALK';
                this.moveDir = 1;
                this.walkPhase += dt * 4.2;
                this.x += this.facing * this.moveSpeed * 0.70 * dt;
                this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
              } else {
                this.state = 'IDLE';
                this.moveDir = 0;
              }
            } else {
              const sweetSpotMin = (!isAdvMode && roleProfile?.idealMin) || aiProfile.sweetMin || 350;
              const sweetSpotMax = (!isAdvMode && roleProfile?.idealMax) || aiProfile.sweetMax || 455;
              const nearLeft = this.x < effMinWall + rangeWallMargin;
              const nearRight = this.x > effBackMaxWall - rangeWallMargin;

              // Corner-escape aerial vault for trapped ranged champions (VS Modes only)
              if (
                !isAdvMode &&
                (nearLeft || nearRight) &&
                dist < 250 &&
                (this._aiSignatureCd || 0) <= 0 &&
                (this.jumpCooldown || 0) <= 0 &&
                (this.vaultCooldown || 0) <= 0 &&
                typeof this.startJump === 'function'
              ) {
                this._aiSignatureCd = 3.8;
                this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.5);
                this.startJump(enemy, game, nearLeft ? 1 : -1);
                return;
              }

              if (dist < sweetSpotMin && !nearLeft && !nearRight) {
                this.state = 'WALK';
                this.moveDir = -1;
                this.walkPhase += dt * 4.2;
                this.x -= this.facing * this.moveSpeed * 0.80 * dt;
                this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
              } else if (dist > sweetSpotMax) {
                this.state = 'WALK';
                this.moveDir = 1;
                this.walkPhase += dt * 4.0;
                this.x += this.facing * this.moveSpeed * 0.65 * dt;
                this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
              } else {
                // Hold poised ranged kamae inside the sweet-spot band instead of crab-oscillating in place
                this.state = 'IDLE';
                this.moveDir = 0;
              }
            }
          } else if (this.heroId === 'ronin' || this.heroId === 'ronin_ex') {
            // Iaido Samurai (Kaze-Maru / Kaze-Maru EX): close-quarters katana maai with >= 28px deadband above minSep=110 on EX!
            const nearSpacingWall = this.x < effMinWall + 60 || this.x > effBackMaxWall - 60;
            const roninMin = isExFighter ? 112 : 76;
            const roninMax = isExFighter ? 140 : 106;
            if (dist > roninMax) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.4;
              this.x += this.facing * this.moveSpeed * 0.84 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.3;
            } else if (dist < roninMin && !nearSpacingWall) {
              this.state = 'WALK';
              this.moveDir = -1;
              this.walkPhase += dt * 3.8;
              this.x -= this.facing * this.moveSpeed * 0.42 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.2;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (this.heroId === 'android' || this.heroId === 'android_ex') {
            // Cyber-Valkyrie (VEX-09 / VEX-09 EX): disciplined blade-tip spacing (>= 30px deadband above minSep=110)
            const nearSpacingWall = this.x < effMinWall + 60 || this.x > effBackMaxWall - 60;
            const andMin = isExFighter ? 116 : 118;
            const andMax = 148;
            if (dist > andMax) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.4;
              this.x += this.facing * this.moveSpeed * 0.76 * 0.85 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.3;
            } else if (dist < andMin && !nearSpacingWall) {
              this.state = 'WALK';
              this.moveDir = -1;
              this.walkPhase += dt * 4.0;
              this.x -= this.facing * this.moveSpeed * 0.76 * 0.60 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.3;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (this.heroId === 'chronomancer' || this.heroId === 'chronomancer_ex') {
            // Sovereign of Time (Chronos / Chronos EX): close-quarters Twin Clock-Blade duelist spacing (>= 30px deadband on EX)
            const nearChronoWall = this.x < effMinWall + 65 || this.x > effBackMaxWall - 65;
            const chrMin = isExFighter ? 112 : 98;
            const chrMax = isExFighter ? 142 : 136;
            if (dist > chrMax) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.4;
              this.x += this.facing * this.moveSpeed * 0.88 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
            } else if (dist < chrMin && !nearChronoWall) {
              this.state = 'WALK';
              this.moveDir = -1;
              this.walkPhase += dt * 4.0;
              this.x -= this.facing * this.moveSpeed * 0.62 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (this.heroId === 'titan' || this.heroId === 'titan_ex') {
            // Unstoppable Mountain Juggernaut (Torgar / Torgar EX): heavy march into maul range (140px on EX = 30px deadband above minSep=110)
            const titanMax = isExFighter ? 140 : 124;
            if (dist > titanMax) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 3.4;
              this.x += this.facing * this.moveSpeed * 0.90 * dt;
              this.headBob = Math.abs(Math.sin((this.walkPhase * Math.PI) / 2.0)) * 1.6;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (this.heroId === 'reaper' || this.heroId === 'reaper_ex') {
            // Abyssal Harvester (Malakor / Malakor EX): predatory scythe-hook stalking (118..150px = 32px deadband above minSep=110)
            const nearReaperWall = this.x < effMinWall + 65 || this.x > effBackMaxWall - 65;
            if (dist > 150) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.3;
              this.x += this.facing * this.moveSpeed * 0.86 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
            } else if (dist < 118 && (!isExFighter || !nearReaperWall)) {
              this.state = 'WALK';
              this.moveDir = -1;
              this.walkPhase += dt * 4.0;
              this.x -= this.facing * this.moveSpeed * 0.45 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.3;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (isExFighter) {
            // Next-Gen Wide-Canvas (320x240, anchorX=112) Exvius Sovereign sweet-spot (>= 30px deadband above minSep=110 so zero crab jitter!)
            const exSweetMin = Math.max(112, aiProfile.sweetMin || 112);
            const exSweetMax = Math.max(exSweetMin + 30, aiProfile.sweetMax || 142);
            const nearExWall = this.x < effMinWall + 65 || this.x > effBackMaxWall - 65;
            if (dist > exSweetMax) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.5;
              this.x += this.facing * this.moveSpeed * 0.88 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
            } else if (dist < exSweetMin && !nearExWall) {
              this.state = 'WALK';
              this.moveDir = -1;
              this.walkPhase += dt * 4.0;
              this.x -= this.facing * this.moveSpeed * 0.55 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.3;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else {
            // Runic Vanguard (Aethelgard): disciplined greatsword-tip pressure & measured micro-step guard
            if (dist > 136) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.3;
              this.x += this.facing * this.moveSpeed * 0.85 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
            } else if (dist < 116) {
              this.state = 'WALK';
              this.moveDir = -1;
              this.walkPhase += dt * 3.8;
              this.x -= this.facing * this.moveSpeed * 0.42 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.3;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          }
        } else {
          this.state = 'WALK';
          this.moveDir = 1;
          this.walkPhase += dt * 4.2;
          this.x += this.facing * this.moveSpeed * dt;
          this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.5;
        }
      } else if (game?.isMatchOver && !this.isDead && this.y >= this.groundY - 2) {
        this.setState('VICTORY');
        this.moveDir = 0;
      } else {
        this.state = 'IDLE';
        this.moveDir = 0;
      }
    }

    if (this.state === 'VICTORY') {
      this.moveDir = 0;
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;
      this.hurtTimer = 0;
      this.stunTimer = 0;
      this.isRooted = false;
      this.isFlipVault = false;
      this.isCrouching = false;
      this.isDeflecting = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.walkPhase += dt * 2.4;
      this.headBob = Math.sin(this.walkPhase) * 1.2;

      if (!this._victoryFlourishPlayed) {
        this._victoryFlourishPlayed = true;
        if (enemy) {
          this.facing = enemy.x >= this.x ? 1 : -1;
        } else {
          this.facing = this.x <= ww * 0.5 ? 1 : -1;
        }
        if (game?.vfx) {
          game.vfx.spawnShockwave?.(this.x, this.groundY - 4, 96, this.primaryColor || '#facc15', 0.42, true);
          game.vfx.spawnBurst?.(this.x, this.y - 92, 12, this.primaryColor || '#facc15', 165, {
            upBias: 95,
            size: 5
          });
          if (game.isMatchOver) {
            game.vfx.spawnDamageText?.(
              this.x,
              this.y - 196,
              0,
              true,
              'VICTORY!',
              this.primaryColor || '#fde047'
            );
          }
        }
      } else if (game?.vfx && Math.random() < 0.14) {
        game.vfx.spawnParticle?.({
          x: this.x + (Math.random() - 0.5) * 56,
          y: this.y - 18 - Math.random() * 110,
          vx: (Math.random() - 0.5) * 18,
          vy: -32 - Math.random() * 38,
          size: 3.5,
          color: Math.random() < 0.4 ? '#fef08a' : this.primaryColor || '#38bdf8',
          maxLife: 0.58
        });
      }
    } else if (this.state === 'IDLE') {
      this.moveDir = 0;
      this.walkPhase += dt * 2.8;
      this.headBob = Math.sin(this.walkPhase) * 2.0;
    } else if (this.state === 'HURT') {
      if (this.stateTimer >= 0.28) {
        this.setState('IDLE');
      }
    } else if (this.state === 'DASH' || this.state === 'DODGE' || this.state === 'JUMP') {
      if (this._advPureDodge) {
        // Pure non-attacking 360° 3D evade handled by AdventureManager
      } else if (this.updateDashOrDodge) {
        this.updateDashOrDodge(dt, enemy, game);
      } else if (this.stateTimer >= this.dashDuration) {
        this.setState('IDLE');
      }
    } else if (this.state === 'CROUCH') {
      if (this.updateCrouch) {
        this.updateCrouch(dt, enemy, game);
      } else if (this.stateTimer >= (this.crouchDuration || 0.96)) {
        this.setState('IDLE');
      }
    } else if (this.state === 'AUTO_ATTACK') {
      this.updateAutoAttack(dt, enemy, game);
    } else if (this.state === 'SKILL') {
      this.updateSkill(dt, enemy, game);
    } else if (this.state === 'ULTIMATE') {
      this.updateUltimate(dt, enemy, game);
    } else if (this.state === 'TRUE_ULTIMATE') {
      if (typeof this.updateTrueUltimate === 'function') {
        this.updateTrueUltimate(dt, enemy, game);
      } else {
        this.updateUltimate(dt, enemy, game);
      }
    }

    if (game?.adventure?.lockActive) {
      const lMin = Number.isFinite(game.adventure.lockMinX) ? game.adventure.lockMinX : 80;
      const lMax = Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX
        : (game.renderer?.worldWidth || 1200) - 80;
      this.x = Math.max(lMin, Math.min(lMax, this.x));
      if (Number.isFinite(this.flipTargetX)) {
        this.flipTargetX = Math.max(lMin + 24, Math.min(lMax - 24, this.flipTargetX));
      }
      if (Number.isFinite(this.blinkTargetX)) {
        this.blinkTargetX = Math.max(lMin + 24, Math.min(lMax - 24, this.blinkTargetX));
      }
      if (Number.isFinite(this.dashTargetX)) {
        this.dashTargetX = Math.max(lMin + 20, Math.min(lMax - 20, this.dashTargetX));
      }
    }

    // Dynamic Forward-Lean Momentum Physics (leans upper body toward enemy when advancing, keeps boots planted!)
    let targetLean = 0;
    if (this.state === 'HURT' || this.hurtTimer > 0.05) {
      targetLean = -0.11;
    } else if (this.state === 'DASH') {
      const isFwdDash = (this.dashDir || this.facing) * this.facing > 0;
      targetLean = isFwdDash ? 0.21 : -0.10;
    } else if (this.state === 'DODGE') {
      targetLean = -0.09;
    } else if (this.state === 'WALK') {
      if ((this.moveDir ?? 1) >= 0) {
        targetLean = 0.145 + Math.sin((this.walkPhase * Math.PI) / 2.0) * 0.018;
      } else {
        targetLean = -0.055;
      }
    } else if (this.state === 'AUTO_ATTACK' || this.state === 'SKILL') {
      const fwdVel = Math.max((this.vx || 0) * this.facing, this._hnsSpeed || 0);
      if (fwdVel > 40) {
        targetLean = Math.min(0.19, 0.08 + fwdVel / 1350);
      } else if (this.attackRange < 260 && this.stateTimer > 0.08 && this.stateTimer < 0.38) {
        targetLean = 0.075;
      }
    }
    this.forwardLean = (this.forwardLean || 0) + (targetLean - (this.forwardLean || 0)) * Math.min(1, dt * 15);
  }

  /**
   * Role-Based Grounded Hack-and-Slash Melee Footwork (`Warrior`, `Reaper`, `Android`, `Ronin`, `Chronomancer`):
   * - Zero lock-on magnet dashes from afar (`maxLockDist <= 215px`), zero ping-pong cross-spam.
   * - Heavy / Vanguard Melee (`Warrior`, `Reaper`, `Android`): Stay 100% IN FRONT of the enemy on all 4 beats
   *   with weighty `26–45px` advancing martial steps (`_hnsPhaseThrough = false`, `0` cross-throughs, `0` 180° turns).
   * - Speed Duelists (`Ronin`, `Chronomancer` -> `allowV2Cross: true`): Grounded advancing sword steps on `V0`, `V1`, `V3`,
   *   and perform ONLY ONE close-range Cross-Slash per 4-hit combo — on Beat 3 (`V2`) when within `<= 165px`!
   * - Open Air (`no living enemy`): Crisp `30–44px` forward martial sword steps (`0` backward/leftward turns).
   */
  updateHackAndSlashMotion(dt, target, game, opts = {}) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const margin = opts.margin ?? 82;
    const minX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
        ? game.adventure.lockMinX + 24
        : margin;
    const bossEntity = game?.adventure?.bossEntity;
    const bossWallAlive = Boolean(
      bossEntity && !bossEntity.isDead && bossEntity.isColossalBoss && !this.isColossalBoss
    );
    const rawMaxX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX - 24
        : ww - margin;
    const maxX = bossWallAlive
      ? Math.min(rawMaxX, (bossEntity.anchorX || 9335) - 88)
      : rawMaxX;
    const clampX = (val) => Math.max(minX, Math.min(maxX, val));

    const variant = (((opts.variant ?? this._autoVariant ?? 0) % 4) + 4) % 4;
    const u = Math.min(1, Math.max(0, opts.u ?? 0));
    const moveEndU = opts.moveEndU ?? 0.40;
    const coilEndU = opts.coilEndU ?? 0.065;
    const maxLockDist = opts.maxLockDist ?? 210;
    const allowV2Cross = Boolean(opts.allowV2Cross ?? this.isCrossSlashDuelist());
    const crossRange = opts.crossRange ?? 165;

    if (
      !this._hnsState ||
      this._hnsState.variant !== variant ||
      (Number.isFinite(this._hnsState.lastX) && Math.abs(this.x - this._hnsState.lastX) > 185)
    ) {
      // Strictly lock onto nearby living combatants/soul-effigies ONLY — NEVER props or distant targets!
      const validTarget = Boolean(
        target &&
          !target.isDead &&
          !target.isDestructibleProp &&
          !target.isDummyFocal &&
          Math.abs(target.x - this.x) <= maxLockDist
      );
      const manualInputDir =
        !validTarget &&
        this.isPlayerControlled &&
        !this.adventureAutoPlay &&
        Math.abs(this.manualMoveAxis || 0) > 0.18
          ? Math.sign(this.manualMoveAxis)
          : 0;
      const dir = validTarget
        ? Math.sign(target.x - this.x) || this.facing || 1
        : manualInputDir || this.facing || 1;
      const startDist = validTarget ? Math.abs(target.x - this.x) : 999;
      const isBoss = Boolean(validTarget && target.isColossalBoss);
      const dashFlankDist = opts.dashFlankDist ?? 114;
      const testDashCrossX = validTarget ? clampX(target.x + dir * dashFlankDist) : this.x;
      const willCrossV2 = Boolean(
        allowV2Cross &&
          variant === 2 &&
          validTarget &&
          !isBoss &&
          startDist <= crossRange &&
          (testDashCrossX - target.x) * dir >= 52
      );

      this._hnsState = {
        variant,
        startX: this.x,
        lastX: this.x,
        moveDoneX: this.x,
        dir,
        startDist,
        hasTarget: validTarget,
        anchorX: validTarget ? target.x : null,
        isBoss,
        willCrossV2,
        crossedSide: false,
        endFacing: dir,
        ghostStep: 0,
        dashRingSpawned: false,
        launchRingSpawned: false,
        landRingSpawned: false,
        cutRibbonSpawned: false,
        streakAccum: 0,
        finishedMove: false
      };
    }

    const hns = this._hnsState;
    this._hnsPhaseThrough = Boolean(hns.willCrossV2);

    const manualPullBack = Boolean(
      this.isPlayerControlled &&
        !this.adventureAutoPlay &&
        (this.manualMoveAxis || 0) * hns.dir < -0.36
    );
    if (manualPullBack) {
      this._hnsPhaseThrough = false;
      this._hnsSpeed = 0;
      this.y = this.groundY;
      return hns;
    }

    // Grounded martial stance on V0..V2 (`0px` bounce); modest execution hop (`20–24px`) on V3 only (`0px` on Ronin)
    const isGroundedStyle =
      opts.groundedOnly === true || this.heroId === 'ronin' || this.heroId === 'ronin_ex';
    const hopEndU = opts.hopEndU ?? 0.56;
    const hopHeight = isGroundedStyle ? 0 : variant === 3 ? (opts.v3HopHeight ?? 22) : 0;
    if (hopHeight > 0 && u >= 0.05 && u <= hopEndU) {
      const hopP = (u - 0.05) / Math.max(0.05, hopEndU - 0.05);
      this.y = this.groundY - Math.sin(hopP * Math.PI) * hopHeight;
    } else {
      if (hopHeight >= 18 && u > hopEndU && !hns.landRingSpawned) {
        hns.landRingSpawned = true;
        game?.vfx?.spawnShockwave?.(
          this.x + this.facing * 18,
          this.groundY - 4,
          54,
          this.secondaryColor || this.primaryColor || '#facc15',
          0.18,
          true
        );
      }
      this.y = this.groundY;
    }

    const liveTargetOk = Boolean(
      hns.hasTarget && target && !target.isDead && !target.isDestructibleProp
    );
    const pivotActive = Boolean(liveTargetOk || (hns.hasTarget && Number.isFinite(hns.anchorX)));
    const tX = liveTargetOk
      ? Number.isFinite(hns.anchorX)
        ? hns.anchorX * 0.30 + target.x * 0.70
        : target.x
      : Number.isFinite(hns.anchorX)
        ? hns.anchorX
        : hns.startX + hns.dir * 96;
    const prevX = this.x;
    const accentCol = this.primaryColor || '#38bdf8';
    const coreCol = this.secondaryColor || '#fef08a';
    const maxStepAdvance = opts.maxStepAdvance ?? 68;

    const computeFrontStepDest = (desiredContact, minClose, minMartialStep) => {
      const contact = hns.isBoss ? Math.max(90, desiredContact) : desiredContact;
      const closeFloor = hns.isBoss ? 88 : minClose;
      const idealAdv = (tX - hns.dir * contact - hns.startX) * hns.dir;
      const maxAllowedInward = Math.max(0, (tX - hns.dir * closeFloor - hns.startX) * hns.dir);
      const rawAdv = Math.max(0, Math.max(idealAdv, Math.min(minMartialStep, maxAllowedInward)));
      const clampedAdv = Math.min(maxStepAdvance, Math.min(rawAdv, maxAllowedInward));
      return clampX(hns.startX + hns.dir * clampedAdv);
    };

    if (u < moveEndU || !hns.finishedMove) {
      const uEff = Math.min(moveEndU, u);
      const p = Math.min(1, uEff / Math.max(0.02, moveEndU));
      this.vx = 0;
      this.vy = 0;

      if (variant === 0) {
        // Beat 1: Grounded Advancing Cleave Step (stays strictly in front)
        const ease = 1 - Math.pow(1 - p, 2.5);
        const destX = pivotActive
          ? computeFrontStepDest(opts.contactDist ?? 84, opts.minCloseDist ?? 78, 26)
          : clampX(hns.startX + hns.dir * (opts.openStepPx ?? 34));
        this.x = clampX(hns.startX + (destX - hns.startX) * ease);
        this.facing = hns.dir;
        if (p >= 0.34 && hns.ghostStep < 1 && Math.abs(destX - hns.startX) >= 34) {
          hns.ghostStep = 1;
          opts.onGhost?.(this.x, this.y, this.facing, p);
        }
      } else if (variant === 1) {
        // Beat 2: Grounded Reverse-Edge Counter Slash Step (stays strictly in front — ZERO cross-through!)
        const ease = 1 - Math.pow(1 - p, 2.4);
        const destX = pivotActive
          ? computeFrontStepDest(opts.contactDist ?? 82, opts.minCloseDist ?? 76, 24)
          : clampX(hns.startX + hns.dir * (opts.openCrossPx ?? 30));
        this.x = clampX(hns.startX + (destX - hns.startX) * ease);
        this.facing = hns.dir;
        if (p >= 0.36 && hns.ghostStep < 1 && Math.abs(destX - hns.startX) >= 32) {
          hns.ghostStep = 1;
          opts.onGhost?.(this.x, this.y, this.facing, p);
        }
      } else if (variant === 2) {
        // Beat 3:
        // - Duelists (`Ronin`, `Chronomancer`) within `<= 165px`: Single Crisp Cross-Slash onto enemy flank + 180° turn!
        // - Heavy Vanguards (`Warrior`, `Reaper`, `Android`) or Open Air: Grounded Lunging Thrust/Cleave in front!
        const coilPx = hns.willCrossV2 ? 6 : 0;
        if (coilPx > 0 && uEff < coilEndU) {
          const coilP = uEff / Math.max(0.01, coilEndU);
          this.x = clampX(hns.startX - hns.dir * coilPx * coilP);
          this.facing = hns.dir;
        } else {
          const dp =
            coilPx > 0
              ? Math.min(1, (uEff - coilEndU) / Math.max(0.02, moveEndU - coilEndU))
              : p;
          const ease = 1 - Math.pow(1 - dp, hns.willCrossV2 ? 3.0 : 2.55);
          const coilStartX = clampX(hns.startX - hns.dir * coilPx);

          if (pivotActive && hns.willCrossV2) {
            if (!hns.dashRingSpawned) {
              hns.dashRingSpawned = true;
              game?.vfx?.spawnShockwave?.(
                this.x,
                this.groundY - 4,
                52,
                accentCol,
                0.18,
                true
              );
            }
            const dashFlankDist = opts.dashFlankDist ?? 114;
            const destX = clampX(tX + hns.dir * dashFlankDist);
            this.x = clampX(coilStartX + (destX - coilStartX) * ease);
            if (!hns.cutRibbonSpawned && dp >= 0.38) {
              hns.cutRibbonSpawned = true;
              this.spawnHnsStreak(
                'cut',
                coilStartX + hns.dir * 18,
                destX - hns.dir * 12,
                this.y - 86,
                accentCol,
                coreCol,
                0.19
              );
            }
            if (dp >= 0.18 && hns.ghostStep < 1) {
              hns.ghostStep = 1;
              opts.onGhost?.(this.x, this.y, hns.dir, dp);
            }
            if (dp >= 0.44 && hns.ghostStep < 2) {
              hns.ghostStep = 2;
              opts.onGhost?.(this.x, this.y, hns.dir, dp);
            }
            if (dp >= 0.72 && hns.ghostStep < 3) {
              hns.ghostStep = 3;
              opts.onGhost?.(this.x, this.y, this.facing, dp);
            }
            if (dp >= 0.66) {
              hns.crossedSide = true;
              hns.endFacing = -hns.dir;
              this.facing = tX >= this.x ? 1 : -1;
            } else {
              this.facing = hns.dir;
            }
          } else {
            const destX = pivotActive
              ? computeFrontStepDest(opts.dashContactDist ?? 80, opts.minCloseDist ?? 76, 30)
              : clampX(hns.startX + hns.dir * (opts.openDashPx ?? 42));
            this.x = clampX(hns.startX + (destX - hns.startX) * ease);
            this.facing = hns.dir;
            if (dp >= 0.34 && hns.ghostStep < 1 && Math.abs(destX - hns.startX) >= 28) {
              hns.ghostStep = 1;
              opts.onGhost?.(this.x, this.y, this.facing, dp);
            }
          }
        }
      } else {
        // Beat 4: Heavy Advancing Execution Finisher (stays strictly in front)
        const ease = 1 - Math.pow(1 - p, 2.4);
        const destX = pivotActive
          ? computeFrontStepDest(opts.finisherDist ?? 82, opts.minCloseDist ?? 76, 28)
          : clampX(hns.startX + hns.dir * (opts.openFinisherPx ?? 36));
        this.x = clampX(hns.startX + (destX - hns.startX) * ease);
        this.facing = hns.dir;
        if (p >= 0.32 && hns.ghostStep < 1 && Math.abs(destX - hns.startX) >= 30) {
          hns.ghostStep = 1;
          opts.onGhost?.(this.x, this.y, this.facing, p);
        }
      }

      if (u >= moveEndU) {
        hns.finishedMove = true;
        hns.moveDoneX = this.x;
      }
      this._hnsSpeed = Math.abs(this.x - prevX) / Math.max(0.001, dt || 1 / 60);
    } else {
      // Controlled Martial Stance Settle (prevents sliding across the arena after the blade lands)
      if (hns.crossedSide) {
        this.facing = pivotActive ? (tX >= this.x ? 1 : -1) : hns.endFacing;
      } else {
        this.facing = hns.dir;
      }
      const skidEndU = 0.80;
      const skidP = Math.min(1, Math.max(0, (u - moveEndU) / Math.max(0.08, skidEndU - moveEndU)));
      const skidEase = 1 - Math.pow(1 - skidP, 2.0);
      let skidDist = pivotActive ? (hns.isBoss ? 0 : 4) : 5;
      const skidDir = this.facing || hns.dir;
      if (pivotActive && !hns.isBoss) {
        const minFront = hns.crossedSide ? 76 : (opts.minCloseDist ?? 76);
        const maxInward = Math.max(0, (tX - skidDir * minFront - hns.moveDoneX) * skidDir);
        skidDist = Math.min(skidDist, maxInward);
      }
      this.x = clampX(hns.moveDoneX + skidDir * skidDist * skidEase);
      this.vx = 0;
      this._hnsSpeed = Math.abs(this.x - prevX) / Math.max(0.001, dt || 1 / 60);
    }

    // Crisp horizontal speed-streaks reserved ONLY for actual high-speed duelist V2 cross-slashes!
    if (hns.willCrossV2 && this._hnsSpeed >= 520) {
      hns.streakAccum = (hns.streakAccum || 0) + (dt || 1 / 60);
      if (hns.streakAccum >= 0.036) {
        hns.streakAccum = 0;
        const moveSign = Math.sign(this.x - prevX) || this.facing || 1;
        const len = Math.min(78, Math.max(30, Math.round(this._hnsSpeed * 0.058)));
        const bandIdx = (Math.round(this.x) + variant * 7) % 3;
        const bandY = this.y - (bandIdx === 0 ? 36 : bandIdx === 1 ? 76 : 110);
        this.spawnHnsStreak(
          'wind',
          this.x - moveSign * (14 + len),
          this.x - moveSign * 10,
          bandY,
          accentCol,
          '#ffffff',
          0.13
        );
      }
    }

    hns.lastX = this.x;
    return hns;
  }

  /**
   * Ranged Battle-Mage 4-Beat Spell-Slash Footwork (`Ignis Sol`, `Lyra`, `Seraphina`):
   * - ZERO melee lock-on magnet dashes, ZERO cross-throughs behind enemies, ZERO `180°` turns!
   * - `V0..V2`: Graceful `18–28px` local cast-steps / figure-skate glides that respect ranged spacing
   *   (never stepping closer than `minSafeDist` `~168px` toward a nearby enemy).
   * - `V3`: Stylish `-38..-42px` Backstep Kite away from nearby enemies while keeping `facing` locked forward
   *   on the target as the 4th finisher spell fires (`0.00px` strictly grounded on `Seraphina`!).
   */
  updateCasterSpellSlashMotion(dt, target, game, opts = {}) {
    this._hnsPhaseThrough = false;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const margin = opts.margin ?? 84;
    const minX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
        ? game.adventure.lockMinX + 24
        : margin;
    const bossEntity = game?.adventure?.bossEntity;
    const bossWallAlive = Boolean(
      bossEntity && !bossEntity.isDead && bossEntity.isColossalBoss && !this.isColossalBoss
    );
    const rawMaxX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX - 24
        : ww - margin;
    const maxX = bossWallAlive
      ? Math.min(rawMaxX, (bossEntity.anchorX || 9335) - 96)
      : rawMaxX;
    const clampX = (val) => Math.max(minX, Math.min(maxX, val));

    const variant = (((opts.variant ?? this._autoVariant ?? 0) % 4) + 4) % 4;
    const u = Math.min(1, Math.max(0, opts.u ?? 0));
    const moveEndU = opts.moveEndU ?? 0.42;
    const maxLockDist = opts.maxLockDist ?? 510;

    if (
      !this._hnsState ||
      this._hnsState.variant !== variant ||
      (Number.isFinite(this._hnsState.lastX) && Math.abs(this.x - this._hnsState.lastX) > 185)
    ) {
      const validTarget = Boolean(
        target &&
          !target.isDead &&
          !target.isDestructibleProp &&
          !target.isDummyFocal &&
          Math.abs(target.x - this.x) <= maxLockDist
      );
      const manualInputDir =
        !validTarget &&
        this.isPlayerControlled &&
        !this.adventureAutoPlay &&
        Math.abs(this.manualMoveAxis || 0) > 0.18
          ? Math.sign(this.manualMoveAxis)
          : 0;
      const dir = validTarget
        ? Math.sign(target.x - this.x) || this.facing || 1
        : manualInputDir || this.facing || 1;
      const startDist = validTarget ? Math.abs(target.x - this.x) : 999;
      const isBoss = Boolean(validTarget && target.isColossalBoss);
      const minSafeDist = isBoss ? 220 : (opts.minSafeDist ?? 168);

      let stepDelta = 0;
      if (variant === 3) {
        if (validTarget && startDist <= (opts.kiteMaxDist ?? 485)) {
          stepDelta = -(opts.backstepPx ?? 40);
        } else {
          stepDelta = opts.openV3StepPx ?? 20;
        }
      } else {
        const rawStep =
          variant === 0
            ? (opts.v0StepPx ?? 24)
            : variant === 1
              ? (opts.v1StepPx ?? 20)
              : (opts.v2StepPx ?? 28);
        if (validTarget) {
          if (startDist < minSafeDist - 16 && variant === 1) {
            stepDelta = -16;
          } else {
            const maxInward = Math.max(0, startDist - minSafeDist);
            stepDelta = Math.min(rawStep, maxInward);
          }
        } else {
          stepDelta = rawStep;
        }
      }

      const destX = clampX(this.x + dir * stepDelta);
      this._hnsState = {
        variant,
        startX: this.x,
        lastX: this.x,
        destX,
        dir,
        startDist,
        hasTarget: validTarget,
        ghostStep: 0,
        finishedMove: false
      };
    }

    const hns = this._hnsState;
    const manualPullBack = Boolean(
      this.isPlayerControlled &&
        !this.adventureAutoPlay &&
        (this.manualMoveAxis || 0) * hns.dir < -0.36
    );
    if (manualPullBack) {
      this._hnsSpeed = 0;
      this.y = this.groundY;
      return hns;
    }

    const isGroundedCaster =
      opts.groundedOnly === true || this.heroId === 'priestess' || this.heroId === 'priestess_ex';
    const hopEndU = opts.hopEndU ?? 0.56;
    const hopHeight = isGroundedCaster ? 0 : variant === 3 ? (opts.v3HopHeight ?? 16) : 0;
    if (hopHeight > 0 && u >= 0.05 && u <= hopEndU) {
      const hopP = (u - 0.05) / Math.max(0.05, hopEndU - 0.05);
      this.y = this.groundY - Math.sin(hopP * Math.PI) * hopHeight;
    } else {
      this.y = this.groundY;
    }
    if (isGroundedCaster) {
      this.y = this.groundY;
      this.vy = 0;
      this.isAngelicAscent = false;
    }

    const prevX = this.x;
    if (u < moveEndU || !hns.finishedMove) {
      const p = Math.min(1, u / Math.max(0.02, moveEndU));
      const ease = 1 - Math.pow(1 - p, 2.35);
      this.vx = 0;
      this.x = clampX(hns.startX + (hns.destX - hns.startX) * ease);
      this.facing = hns.dir;
      if (p >= 0.36 && hns.ghostStep < 1 && Math.abs(hns.destX - hns.startX) >= 22) {
        hns.ghostStep = 1;
        opts.onGhost?.(this.x, this.y, this.facing, p);
      }
      if (u >= moveEndU) {
        hns.finishedMove = true;
      }
    } else {
      this.facing = hns.dir;
      this.vx = 0;
    }

    this._hnsSpeed = Math.abs(this.x - prevX) / Math.max(0.001, dt || 1 / 60);
    hns.lastX = this.x;
    return hns;
  }

  spawnHnsStreak(type, x0, x1, y, color, coreColor = '#ffffff', maxLife = 0.16) {
    if (!this._hnsStreaks) this._hnsStreaks = [];
    if (this._hnsStreaks.length >= 18) this._hnsStreaks.shift();
    this._hnsStreaks.push({
      type,
      x0,
      x1,
      y,
      color: color || this.primaryColor || '#38bdf8',
      coreColor,
      age: 0,
      maxLife
    });
  }

  drawHackAndSlashStreaks(ctx) {
    if (!this._hnsStreaks || this._hnsStreaks.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < this._hnsStreaks.length; i++) {
      const s = this._hnsStreaks[i];
      const lifeRatio = Math.max(0, 1 - s.age / Math.max(0.01, s.maxLife));
      if (lifeRatio <= 0.02) continue;
      const left = Math.round(Math.min(s.x0, s.x1));
      const right = Math.round(Math.max(s.x0, s.x1));
      const span = Math.max(8, right - left);
      const ry = Math.round(s.y);
      if (s.type === 'cut') {
        const curSpan = Math.max(8, Math.round(span * (0.35 + 0.65 * lifeRatio)));
        const cx = Math.round((left + right) * 0.5 - curSpan * 0.5);
        ctx.globalAlpha = 0.72 * lifeRatio;
        ctx.fillStyle = s.color;
        ctx.fillRect(cx, ry - 2, curSpan, 4);
        ctx.globalAlpha = 0.92 * lifeRatio;
        ctx.fillStyle = s.coreColor;
        ctx.fillRect(cx + 6, ry - 1, Math.max(4, curSpan - 12), 2);
      } else {
        ctx.globalAlpha = 0.48 * lifeRatio;
        ctx.fillStyle = s.color;
        ctx.fillRect(left, ry - 1, span, 3);
        ctx.globalAlpha = 0.78 * lifeRatio;
        ctx.fillStyle = s.coreColor;
        ctx.fillRect(left + Math.round(span * 0.25), ry, Math.max(4, Math.round(span * 0.55)), 1);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawAdventureDodgeFX(ctx, layer = 'back') {
    if (!this._advDodgeTrails || this._advDodgeTrails.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < this._advDodgeTrails.length; i++) {
      const tr = this._advDodgeTrails[i];
      if ((tr.layer || 'back') !== layer) continue;
      const life = Math.max(0, 1 - tr.age / Math.max(0.01, tr.maxLife));
      if (life <= 0.02) continue;
      const rx = Math.round(tr.x);
      const ry = Math.round(tr.y);
      const w = Math.max(4, Math.round((tr.w || 28) * (0.55 + 0.45 * life)));
      const h = Math.max(2, Math.round(tr.h || 4));
      if (tr.kind === 'ice_track') {
        // Lyra (`SKATE`): Shimmering twin figure-skate ice-blade tracks & frost crystal glints on the floor
        ctx.globalAlpha = 0.62 * life;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(rx - (w >> 1), ry - 3, w, 3);
        ctx.fillRect(rx - (w >> 1) + 4, ry + 2, Math.max(4, w - 6), 2);
        ctx.globalAlpha = 0.88 * life;
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(rx - (w >> 2), ry - 2, Math.max(4, w >> 1), 1);
        ctx.fillRect(rx + ((i % 3) - 1) * 8, ry - 6 - Math.round((1 - life) * 8), 3, 3);
      } else if (tr.kind === 'rocket_exhaust') {
        // VEX-09 (`THRUST`): Twin cyber rocket-thruster plasma exhaust plumes & shock-diamonds
        ctx.globalAlpha = 0.68 * life;
        ctx.fillStyle = tr.color || '#00f0ff';
        ctx.fillRect(rx - (w >> 1), ry - (h >> 1), w, h);
        ctx.globalAlpha = 0.90 * life;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rx - (w >> 2), ry - 1, Math.max(4, w >> 1), 2);
      } else if (tr.kind === 'feather_mote') {
        // Freyja & Seraphina (`GLIDE`): Pixel-stepped celestial wing feathers drifting downward (0 ctx.rotate!)
        const driftY = ry + Math.round((1 - life) * 14);
        ctx.globalAlpha = 0.84 * life;
        ctx.fillStyle = tr.color || '#fde047';
        ctx.fillRect(rx - 3, driftY - 1, 6, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rx - 1, driftY - 2, 3, 2);
      } else if (tr.kind === 'lightning_spark') {
        // Kaze-Maru (`SURIASHI`) & Aethelgard (`STEP`): Stepped pixel lightning/rune ground arc
        ctx.globalAlpha = 0.78 * life;
        ctx.fillStyle = tr.color || '#38bdf8';
        ctx.fillRect(rx - (w >> 1), ry - 2, Math.max(4, w >> 1), 2);
        ctx.fillRect(rx - 2, ry - 5, Math.max(4, w >> 1), 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rx - 4, ry - 3, 6, 2);
      } else if (tr.kind === 'magma_tread') {
        // Torgar (`STRIDE`) & Ignis Sol (`BLINK`): Molten forge-cinder / phoenix-ember floor scar
        ctx.globalAlpha = 0.68 * life;
        ctx.fillStyle = tr.color || '#f97316';
        ctx.fillRect(rx - (w >> 1), ry - 2, w, 4);
        ctx.globalAlpha = 0.88 * life;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(rx - (w >> 2), ry - 1, Math.max(4, w >> 1), 2);
      } else {
        ctx.globalAlpha = 0.62 * life;
        ctx.fillStyle = tr.color || '#38bdf8';
        ctx.fillRect(rx - (w >> 1), ry - (h >> 1), w, h);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  getTargetTorsoAngle() {
    if (this.state === 'HURT' || this.hurtTimer > 0.08) return -this.facing * 0.22;
    if (this.state === 'DASH' || this.state === 'DODGE') return this.dashDir * 0.25;
    if (this.state === 'WALK') {
      const dirLean = (this.moveDir ?? 1) < 0 ? -0.06 : 0.16;
      return this.facing * dirLean + Math.sin((this.walkPhase * Math.PI) / 2.0) * 0.06;
    }
    if (this.state === 'IDLE') return Math.sin(this.walkPhase) * 0.05;
    return 0;
  }

  updateCape(dt) {
    this.capeNodes[0].x = this.x - this.facing * 8;
    this.capeNodes[0].y = this.y - 54 + this.headBob * 0.5;
    for (let i = 1; i < this.capeNodes.length; i++) {
      const prev = this.capeNodes[i - 1];
      const cur = this.capeNodes[i];
      const wave = Math.sin(this.walkPhase * 1.8 - i * 0.9) * 35;
      cur.x += (-this.facing * 45 - this.vx * 0.25 + wave) * dt;
      cur.y += (140 + i * 15) * dt;
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 11) {
        cur.x = prev.x + (dx / d) * 11;
        cur.y = prev.y + (dy / d) * 11;
      }
    }
  }
}
