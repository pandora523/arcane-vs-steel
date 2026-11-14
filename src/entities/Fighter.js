export class Fighter {
  constructor(opts) {
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
    this._aiSignatureCd = 0.65 + Math.random() * 0.9;
    this._aiOutstepTimer = 0;
    this._aiOutstepDir = -1;
    this._aiManueverSeq = Math.floor(Math.random() * 6);
  }

  getAiStyleProfile() {
    switch (this.heroId) {
      case 'titan':
        return {
          comboGoal: 3,
          sweetMin: 114,
          sweetMax: 138,
          counterCrouchBias: 0.68,
          midLeapMin: 195,
          midLeapMax: 315,
          midLeapChance: 0.34,
          postStyle: 'juggernaut'
        };
      case 'warrior':
        return {
          comboGoal: 3,
          sweetMin: 114,
          sweetMax: 146,
          counterCrouchBias: 0.64,
          midLeapMin: 185,
          midLeapMax: 295,
          midLeapChance: 0.38,
          postStyle: 'vanguard'
        };
      case 'ronin':
        return {
          comboGoal: 3,
          sweetMin: 78,
          sweetMax: 106,
          counterCrouchBias: 0.66,
          midLeapMin: 175,
          midLeapMax: 280,
          midLeapChance: 0.44,
          postStyle: 'iaido'
        };
      case 'android':
        return {
          comboGoal: 3,
          sweetMin: 112,
          sweetMax: 158,
          counterCrouchBias: 0.60,
          midLeapMin: 180,
          midLeapMax: 290,
          midLeapChance: 0.44,
          postStyle: 'cyber_valkyrie'
        };
      case 'reaper':
        return {
          comboGoal: 3,
          sweetMin: 118,
          sweetMax: 160,
          counterCrouchBias: 0.62,
          midLeapMin: 185,
          midLeapMax: 295,
          midLeapChance: 0.38,
          postStyle: 'harvester'
        };
      case 'chronomancer':
        return {
          comboGoal: 4,
          sweetMin: 98,
          sweetMax: 142,
          counterCrouchBias: 0.56,
          midLeapMin: 175,
          midLeapMax: 285,
          midLeapChance: 0.38,
          postStyle: 'chrono'
        };
      case 'valkyrie':
        return {
          comboGoal: 2,
          sweetMin: 310,
          sweetMax: 375,
          counterCrouchBias: 0.52,
          midLeapMin: 225,
          midLeapMax: 385,
          midLeapChance: 0.40,
          postStyle: 'sky_lancer'
        };
      case 'archer':
        return {
          comboGoal: 3,
          sweetMin: 350,
          sweetMax: 455,
          counterCrouchBias: 0.50,
          midLeapMin: 0,
          midLeapMax: 0,
          midLeapChance: 0,
          postStyle: 'marksman'
        };
      case 'icemage':
        return {
          comboGoal: 2,
          sweetMin: 345,
          sweetMax: 445,
          counterCrouchBias: 0.58,
          midLeapMin: 0,
          midLeapMax: 0,
          midLeapChance: 0,
          postStyle: 'cryo_artillery'
        };
      case 'priestess':
        return {
          comboGoal: 2,
          sweetMin: 365,
          sweetMax: 470,
          counterCrouchBias: 0.56,
          midLeapMin: 0,
          midLeapMax: 0,
          midLeapChance: 0,
          postStyle: 'sanctuary'
        };
      case 'mage':
        return {
          comboGoal: 3,
          sweetMin: 355,
          sweetMax: 460,
          counterCrouchBias: 0.48,
          midLeapMin: 0,
          midLeapMax: 0,
          midLeapChance: 0,
          postStyle: 'pyromancer'
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

  setState(newState) {
    this.state = newState;
    this.stateTimer = 0;
    this.didActionFrame = false;
    this.didSecondaryAction = false;
    if (newState === 'AUTO_ATTACK') {
      const profile = this.getAiStyleProfile();
      this._aiComboCount = (this._aiComboCount || 0) + 1;
      this._aiComboChainTimer = 1.45;
      if (this._aiComboCount >= profile.comboGoal) {
        this._aiComboCount = 0;
        this._aiComboReadyFinisher = 0.70;
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
            '★ TWIN-SOUL COMBO! ★',
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
          '★ DESPERATION OVERDRIVE! ★',
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
        (this.state === 'AUTO_ATTACK' && !this.didActionFrame && isCrit))
    ) {
      this.setState('HURT');
    }

    if (this.game) {
      this.game.vfx.spawnDamageText(this.x - this.facing * 24, this.y - 192, amount, isCrit);
      this.game.vfx.spawnBurst(this.x, this.y - 105, isCrit ? 14 : 8, this.primaryColor, 185);
      if (this.game.vfx.spawnHitImpact) {
        this.game.vfx.spawnHitImpact(this.x, this.y - 98, attacker, isCrit);
      }
      if (isCrit) {
        this.game.renderer.triggerAberration(5);
        this.game.renderer.triggerHitStop(0.035);
      }
    }

    if (this.hp <= 0) {
      this.isDead = true;
      this.state = 'DEATH';
      this.deathTimer = 0;
      this.isFlipVault = false;
      this.isAngelicAscent = false;
      this.isBlinkTeleport = false;
      this.isChronoWarp = false;
      this.isOmnislashing = false;
      this.isCrouching = false;
      this.isDeflecting = false;
      this.vy = this.y >= this.groundY - 4 ? 0 : Math.max(0, this.vy * 0.35);
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

  detectIncomingThreatType(enemy, game) {
    if (!game || !game.vfx) return null;
    // 1. Incoming enemy projectile heading toward this fighter
    if (Array.isArray(game.vfx.projectiles)) {
      for (const proj of game.vfx.projectiles) {
        if (proj.owner !== this && (!this.team || !proj.owner?.team || proj.owner.team !== this.team)) {
          const dx = this.x - proj.x;
          if (Math.abs(dx) < 205 && Math.sign(proj.vx) === Math.sign(dx)) {
            return 'projectile';
          }
        }
      }
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
    // 3. Enemy winding up a melee strike or special skill nearby
    if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      if (
        dist < 192 &&
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
        if (canCrouch && foeSwinging && dist <= 220) {
          this._aiSignatureCd = 4.0 + Math.random() * 1.1;
          this.startCrouch(enemy, game);
          return true;
        }
        if (canDash && dist > 150) {
          this.startDash(enemy, game);
          return true;
        }
        return false;
      }

      case 'juggernaut': {
        // Torgar: plant Forge-Bulwark (`CROUCH`) after 4-hit Maul combo to armor through retaliation, or Meteor-Leap (`JUMP`)!
        if (canCrouch && this._aiManueverSeq % 2 === 0 && dist <= 225) {
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
        if (pick === 2 && canDash && dist > 140) {
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
    this.game = game;
    if (!game?.adventure?.active && game?.renderer && Number.isFinite(game.renderer.groundY)) {
      this.groundY = game.renderer.groundY;
    }

    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this._evadeManaCd > 0) this._evadeManaCd = Math.max(0, this._evadeManaCd - dt);

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
      enemy.state !== 'TRUE_ULTIMATE' &&
      this.state !== 'DASH' &&
      this.state !== 'DODGE' &&
      !this.isFullyBurrowed &&
      !enemy.isFullyBurrowed
    ) {
      const isAdv3D = Boolean(game?.adventure?.active);
      const depthDiff = Math.abs((this.groundY || this.y) - (enemy.groundY || enemy.y));
      if (!isAdv3D || depthDiff < 46) {
        const dx = this.x - enemy.x;
        const absDx = Math.abs(dx);
        const minSep = isAdv3D ? 82 : 110;
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
      this.state !== 'DODGE'
    ) {
      const ally = game.getTeammateOf ? game.getTeammateOf(this) : null;
      if (ally && !ally.isDead && !ally.isBenched) {
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

    // Physics integration & Gravity (skipped while in a controlled parabolic flip-vault arc or hard-rooted)
    if (this.isRooted) {
      this.vx = 0;
      this.vy = 0;
    } else if (!this.isFlipVault) {
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
      this.deathTimer += dt;
      this.torsoAngle += (Math.PI * 0.48 * -this.facing - this.torsoAngle) * 6 * dt;
      if (this.deathTimer < 2.6 && Math.random() < 0.22) {
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
      this.state !== 'ULTIMATE' &&
      this.state !== 'TRUE_ULTIMATE' &&
      (!isManualPlayer || (this.state !== 'IDLE' && this.state !== 'WALK'))
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
      }
    }
    if (this.skillCooldown <= 0) {
      this._aiSkillReadyTime = (this._aiSkillReadyTime || 0) + dt;
    } else {
      this._aiSkillReadyTime = 0;
    }
    this.stateTimer += dt;

    // TABS Spring-damper torso physics
    const targetTorso = this.getTargetTorsoAngle();
    const force = (targetTorso - this.torsoAngle) * 130 - this.torsoVel * 11;
    this.torsoVel += force * dt;
    this.torsoAngle += this.torsoVel * dt;

    // Ambient Aura & Desperation Overdrive Particles (decluttered for the custom-shader heroes)
    const isDeclutteredHero =
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
        const aiProfile = this.getAiStyleProfile();
        const atkRange = this.getEffectiveAttackRange ? this.getEffectiveAttackRange() : this.attackRange;

        // 0. SUPREME FINISHING MOVE ("ULTIMATE" Gauge — higher tier than Overdrive!)
        if (
          this.hasTrueUltimate &&
          this.finisherGauge >= this.maxFinisherGauge &&
          !enemy.isInvulnerable &&
          typeof this.updateTrueUltimate === 'function'
        ) {
          this.finisherGauge = 0;
          if (this.stats) this.stats.ultsUsed++;
          this.setState('TRUE_ULTIMATE');
          if (typeof game.triggerTrueUltimateCinematic === 'function') {
            game.triggerTrueUltimateCinematic(this);
          } else {
            game.triggerUltimateCinematic(this);
          }
          return;
        }

        // 1. Smart Archetype Overdrive Timing (don't waste Overdrive into an invulnerable dodge or from out of effective range!)
        const ultRangeOk =
          this.heroId === 'warrior'
            ? dist <= 400
            : this.heroId === 'reaper' || this.heroId === 'titan' || this.heroId === 'ronin'
              ? dist <= 480
              : this.heroId === 'valkyrie'
                ? dist <= 620
                : true;
        if (this.mana >= this.maxMana && !enemy.isInvulnerable && ultRangeOk) {
          this.mana = 0;
          if (this.hasTrueUltimate) {
            this.gainFinisher(24);
          }
          if (this.stats) this.stats.ultsUsed++;
          this.setState('ULTIMATE');
          game.triggerUltimateCinematic(this);
          return;
        }

        // 2. Signature Counter-Read Defense (`CROUCH` Parries/Shields/Hex-Deflects/Mirrors/Burrows + `JUMP` Vaults + `DODGE` — VS Modes only)
        const isAdvMode = Boolean(game?.isAdventureMode?.());
        const threatType = !isAdvMode ? this.detectIncomingThreatType(enemy, game) : null;
        if (!isAdvMode && this.dodgeCooldown <= 0 && threatType) {
          this.triggerSignatureDefense(enemy, game, threatType);
          return;
        }

        // 3. Combo-Finisher & Tactical Window `SKILL` Execution (chains off combos & punishes commitments instead of raw frame-0 spam!)
        const maxSkillDist = this.skillTriggerRange || this.attackRange * 2.2;
        if (this.skillCooldown <= 0 && dist <= maxSkillDist && !enemy.isInvulnerable) {
          const isComboFinisher = (this._aiComboReadyFinisher || 0) > 0;
          const isPunishWindow =
            enemy.state === 'AUTO_ATTACK' ||
            enemy.state === 'SKILL' ||
            enemy.state === 'CROUCH' ||
            enemy.state === 'HURT' ||
            (enemy.stunTimer || 0) > 0;
          const isInterceptOpening = dist > atkRange * 1.06;
          const midComboHold =
            (this._aiComboCount || 0) > 0 && dist <= atkRange && (this._aiSkillReadyTime || 0) < 0.68;

          if (
            !midComboHold &&
            (isComboFinisher || isPunishWindow || isInterceptOpening || (this._aiSkillReadyTime || 0) >= 0.68)
          ) {
            this.skillCooldown = this.skillMaxCooldown * (0.86 + Math.random() * 0.28);
            this._aiSkillReadyTime = 0;
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
        if (!isAdvMode && (this._aiComboReadyFinisher || 0) > 0) {
          if (this.triggerPostComboSignature(enemy, game, dist)) {
            return;
          }
        }

        // 5. Mid-Range Aerial Vault Engage (`JUMP`) & Archetype Repositioning `DASH` (VS Modes only)
        if (
          !isAdvMode &&
          aiProfile.midLeapChance > 0 &&
          dist >= aiProfile.midLeapMin &&
          dist <= aiProfile.midLeapMax &&
          (this._aiSignatureCd || 0) <= 0 &&
          this.dodgeCooldown <= 0.35 &&
          typeof this.startJump === 'function' &&
          Math.random() < aiProfile.midLeapChance * 0.35
        ) {
          this._aiSignatureCd = 3.5 + Math.random() * 1.1;
          this.dodgeCooldown = Math.max(this.dodgeCooldown, 1.5);
          this.startJump(enemy, game, this.facing);
          return;
        }

        const shouldDash =
          !isAdvMode &&
          (this.heroId === 'ronin' || this.heroId === 'android'
            ? dist > 185
            : this.attackRange < 200
              ? dist > 205
              : dist > 490 || ((this.x < 210 || this.x > ww - 210) && dist < 260));
        if (this.dashCooldown <= 0 && shouldDash) {
          this.startDash(enemy, game);
          return;
        }

        // 6. Disciplined Combo Strings & Expressive Per-Champion Neutral Footsies
        if (dist <= atkRange) {
          const bossColossalAlive = Boolean(
            isAdvMode && game?.adventure?.bossEntity && !game.adventure.bossEntity.isDead && game.adventure.bossEntity.isColossalBoss
          );
          const effMinWall = minArenaX;
          const effBackMaxWall = bossColossalAlive ? maxArenaX + 400 : maxArenaX;
          const outstepMargin = 85;
          const rangeWallMargin = 95;
          // Brief martial out-step feint right after completing a full combo string so fighters breathe & bait whiffs!
          if ((this._aiOutstepTimer || 0) > 0 && dist < atkRange * 0.94) {
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
            this.autoCooldown = this.autoInterval * (0.88 + Math.random() * 0.22);
            this.setState('AUTO_ATTACK');
            return;
          }

          // Between attacks (autoCooldown > 0), each champion exhibits their authentic martial spacing & footwork!
          const isRangedArchetype = this.attackRange >= 300;
          if (isRangedArchetype) {
            if (this.backflipKiteTimer > 0) {
              this.backflipKiteTimer = Math.max(0, this.backflipKiteTimer - dt);
            }
            if (this.heroId === 'valkyrie') {
              if (!isAdvMode && dist < 325 && (this.backflipKiteTimer || 0) <= 0 && this.startCrouch) {
                this.backflipKiteTimer = 1.65;
                this.startCrouch(enemy, game);
                return;
              }
              const nearWall = this.x < effMinWall + rangeWallMargin || this.x > effBackMaxWall - rangeWallMargin;
              const vSweetMin = aiProfile.sweetMin || 310;
              const vSweetMax = aiProfile.sweetMax || 375;
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
              const sweetSpotMin = aiProfile.sweetMin || 350;
              const sweetSpotMax = aiProfile.sweetMax || 455;
              const nearLeft = this.x < effMinWall + rangeWallMargin;
              const nearRight = this.x > effBackMaxWall - rangeWallMargin;

              // Corner-escape aerial vault for trapped ranged champions (VS Modes only)
              if (
                !isAdvMode &&
                (nearLeft || nearRight) &&
                dist < 250 &&
                (this._aiSignatureCd || 0) <= 0 &&
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
          } else if (this.heroId === 'ronin') {
            // Iaido Samurai (Kaze-Maru): close-quarters katana maai (76..106px) so physical cuts reach enemy flesh!
            const nearSpacingWall = this.x < effMinWall + 60 || this.x > effBackMaxWall - 60;
            if (dist > 106) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.4;
              this.x += this.facing * this.moveSpeed * 0.84 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.3;
            } else if (dist < 76 && !nearSpacingWall) {
              this.state = 'WALK';
              this.moveDir = -1;
              this.walkPhase += dt * 3.8;
              this.x -= this.facing * this.moveSpeed * 0.42 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.2;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (this.heroId === 'android') {
            // Cyber-Valkyrie (VEX-09): disciplined blade-tip spacing (118..148px)
            const nearSpacingWall = this.x < effMinWall + 60 || this.x > effBackMaxWall - 60;
            if (dist > 148) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.4;
              this.x += this.facing * this.moveSpeed * 0.76 * 0.85 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.3;
            } else if (dist < 118 && !nearSpacingWall) {
              this.state = 'WALK';
              this.moveDir = -1;
              this.walkPhase += dt * 4.0;
              this.x -= this.facing * this.moveSpeed * 0.76 * 0.60 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.3;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (this.heroId === 'chronomancer') {
            // Sovereign of Time (Chronos): close-quarters Twin Clock-Blade duelist spacing (98..136px)
            const nearChronoWall = this.x < effMinWall + 65 || this.x > effBackMaxWall - 65;
            if (dist > 136) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.4;
              this.x += this.facing * this.moveSpeed * 0.88 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
            } else if (dist < 98 && !nearChronoWall) {
              this.state = 'WALK';
              this.moveDir = -1;
              this.walkPhase += dt * 4.0;
              this.x -= this.facing * this.moveSpeed * 0.62 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (this.heroId === 'titan') {
            // Unstoppable Mountain Juggernaut (Torgar): heavy, earth-shaking march into point-blank maul range (124px)
            if (dist > 124) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 3.4;
              this.x += this.facing * this.moveSpeed * 0.90 * dt;
              this.headBob = Math.abs(Math.sin((this.walkPhase * Math.PI) / 2.0)) * 1.6;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (this.heroId === 'reaper') {
            // Abyssal Harvester (Malakor): predatory scythe-hook stalking (124..152px)
            if (dist > 150) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.3;
              this.x += this.facing * this.moveSpeed * 0.86 * dt;
              this.headBob = Math.sin((this.walkPhase * Math.PI) / 2.0) * 1.4;
            } else if (dist < 118) {
              this.state = 'WALK';
              this.moveDir = -1;
              this.walkPhase += dt * 4.0;
              this.x -= this.facing * this.moveSpeed * 0.45 * dt;
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
              '★ VICTORY! ★',
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
      const fwdVel = (this.vx || 0) * this.facing;
      if (fwdVel > 40) {
        targetLean = Math.min(0.18, 0.08 + fwdVel / 950);
      } else if (this.attackRange < 260 && this.stateTimer > 0.08 && this.stateTimer < 0.38) {
        targetLean = 0.075;
      }
    }
    this.forwardLean = (this.forwardLean || 0) + (targetLean - (this.forwardLean || 0)) * Math.min(1, dt * 15);
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
