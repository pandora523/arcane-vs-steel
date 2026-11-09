export class Fighter {
  constructor(opts) {
    this.name = opts.name;
    this.x = opts.x;
    this.y = opts.groundY;
    this.groundY = opts.groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = opts.facing || 1;

    this.maxHp = opts.maxHp || 1000;
    this.hp = this.maxHp;
    this.mana = 0;
    this.maxMana = 100;
    this.isDead = false;
    this.deathTimer = 0;

    this.attackRange = opts.attackRange || 110;
    this.moveSpeed = opts.moveSpeed || 165;
    this.lightColor = opts.lightColor || 'rgba(56, 189, 248, 1)';
    this.primaryColor = opts.primaryColor || '#38bdf8';

    // State Machine: IDLE, WALK, DASH, DODGE, AUTO_ATTACK, SKILL, ULTIMATE, DEATH
    this.state = 'IDLE';
    this.stateTimer = 0;
    this.didActionFrame = false;

    this.autoCooldown = Math.random() * 0.35;
    this.autoInterval = opts.autoInterval || 1.25;
    this.skillCooldown = 1.6 + Math.random() * 1.1;
    this.skillMaxCooldown = 5.0;
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
  }

  setState(newState) {
    this.state = newState;
    this.stateTimer = 0;
    this.didActionFrame = false;
    this.didSecondaryAction = false;
    if (newState !== 'DODGE' && newState !== 'JUMP') {
      this.isInvulnerable = false;
    }
    if (newState !== 'CROUCH') {
      this.isCrouching = false;
    }
    if (newState !== 'DODGE' && newState !== 'JUMP' && newState !== 'ULTIMATE') {
      this.isFlipVault = false;
      this.isAngelicAscent = false;
      this.isOmnislashing = false;
    }
  }

  gainMana(amount) {
    if (this.isDead || this.state === 'ULTIMATE') return;
    let mult = this.isBerserk ? 1.28 : 1.0;
    if (this.game && this.game.stageEventTimer > 0 && this.game.renderer?.stageId === 'cathedral') {
      mult *= 1.55;
    }
    this.mana = Math.min(this.maxMana, this.mana + amount * mult);
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
      if (ally && !ally.isDead && ally.hp < ally.maxHp) {
        const sharedAmt = Math.max(8, Math.round(amount * 0.55));
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
      this.gainMana(8);
      return;
    }
    if (this.isInvulnerable || (this.state === 'DODGE' && this.stateTimer < 0.36)) {
      if (this.game) {
        this.game.vfx.spawnDamageText(this.x - this.facing * 24, this.y - 196, 0, false, 'EVADED!', this.primaryColor);
        this.game.vfx.spawnShockwave(this.x, this.y - 95, 68, this.primaryColor, 0.24);
      }
      this.gainMana(8);
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
      if (this.game.gameMode === '2v2_brawl' && (amount >= 38 || isCrit)) {
        const enemyAlly = this.game.getTeammateOf ? this.game.getTeammateOf(this) : null;
        if (
          enemyAlly &&
          !enemyAlly.isDead &&
          !enemyAlly.isBenched &&
          Math.abs(enemyAlly.x - this.x) < 94
        ) {
          enemyAlly._isSplashDamage = true;
          enemyAlly.takeDamage(Math.round(amount * 0.52), attacker, false, knockX * 0.65, 0);
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
      // Torgar's Magma Armor Fortify: 48% damage reduction, unstoppable super-armor, and molten thorn reflection!
      amount *= 0.52;
      knockX *= 0.12;
      knockY = 0;
      if (attacker && !attacker.isDead && !this._isThornReflect && Math.abs(attacker.x - this.x) < 210) {
        this._isThornReflect = true;
        attacker.takeDamage(12, this, false, 65, 0);
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
    const prevHp = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    const dealt = Math.max(1, Math.round(prevHp - this.hp));
    if (attacker && attacker.stats) {
      attacker.stats.damageDealt += dealt;
      if (isCrit) attacker.stats.critsLanded++;
      if (dealt > attacker.stats.biggestHit) attacker.stats.biggestHit = dealt;
    }
    this.hitFlash = 0.18;
    this.hurtTimer = isCrit ? 0.34 : 0.25;
    this.gainMana(amount * 0.115);
    if (attacker) {
      attacker.gainMana(Math.min(11, Math.max(2.5, amount * 0.11)));
    }

    // Trigger Low-HP Desperation Overdrive (Berserk State) when crossing below 28% HP
    if (this.hp > 0 && !this.isBerserk && this.hp / this.maxHp <= 0.28) {
      this.isBerserk = true;
      this.gainMana(18);
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
      (!this.hasPoise || isCrit || amount >= 95) &&
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
      this.vy = -135;
      this.vx = dir * 165;
      this.torsoVel = dir * 14;
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

  checkIncomingThreat(enemy, game) {
    if (!game || !game.vfx) return false;
    // 1. Incoming enemy projectile heading toward this fighter
    for (const proj of game.vfx.projectiles) {
      if (proj.owner !== this && (!this.team || !proj.owner?.team || proj.owner.team !== this.team)) {
        const dx = this.x - proj.x;
        if (Math.abs(dx) < 185 && Math.sign(proj.vx) === Math.sign(dx)) {
          return true;
        }
      }
    }
    // 2. Enemy winding up a melee strike or skill nearby
    if (enemy && !enemy.isDead) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < 180 && (enemy.state === 'AUTO_ATTACK' || enemy.state === 'SKILL') && enemy.stateTimer > 0.18 && enemy.stateTimer < 0.45) {
        return true;
      }
      // 3. Ranged fighter crowded in close melee range
      if (this.attackRange > 250 && dist < 175) {
        return true;
      }
    }
    return false;
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
    this.groundY = game.renderer.groundY;

    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);

    // Benched Reserve Fighter on the Sanctuary Tag Pedestal (in 2v2 Tag Relay mode)
    if (this.isBenched && !this.isDead) {
      const ww = game.renderer ? game.renderer.worldWidth : 1200;
      const isLeftTeam = this.team === 'left' || this.team === 1;
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
      this.gainMana(dt * 4.2);
      if (this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + dt * 15);
      }
      this.autoCooldown = Math.max(0, this.autoCooldown - dt);
      this.skillCooldown = Math.max(0, this.skillCooldown - dt);
      this.updateCape(dt);
      return;
    }

    if (!this.isDead && this.state !== 'ULTIMATE') {
      this.gainMana(dt * 4.5);
    }

    // Personal-space repulsion so characters never crowd on top of each other
    if (enemy && !this.isDead && !enemy.isDead && this.state !== 'ULTIMATE' && this.state !== 'DASH' && this.state !== 'DODGE') {
      const dx = this.x - enemy.x;
      const absDx = Math.abs(dx);
      const minSep = 110;
      if (absDx < minSep) {
        const pushDir = dx === 0 ? -this.facing : Math.sign(dx);
        this.x += pushDir * (minSep - absDx) * 6.5 * dt;
      }
    }

    // 2v2 Teammate Tactical Spacing: keep a natural 76px Vanguard/Flanker stagger so allies never stack on the same X pixel
    if (
      game &&
      game.gameMode === '2v2_brawl' &&
      !this.isDead &&
      this.state !== 'ULTIMATE' &&
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

    // Physics integration & Gravity (skipped while in a controlled parabolic flip-vault arc)
    if (!this.isFlipVault) {
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

    // Virtual Arena boundaries (1200 units wide)
    const margin = 80;
    this.x = Math.max(margin, Math.min(game.renderer.worldWidth - margin, this.x));

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

    if (enemy && this.state !== 'ULTIMATE') {
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
    this.stateTimer += dt;

    // TABS Spring-damper torso physics
    const targetTorso = this.getTargetTorsoAngle();
    const force = (targetTorso - this.torsoAngle) * 130 - this.torsoVel * 11;
    this.torsoVel += force * dt;
    this.torsoAngle += this.torsoVel * dt;

    // Ambient Aura & Desperation Overdrive Particles
    if (Math.random() < (this.isBerserk ? 0.56 : 0.28)) {
      game.vfx.spawnParticle({
        x: this.x + (Math.random() - 0.5) * (this.isBerserk ? 48 : 34),
        y: this.y - Math.random() * (this.isBerserk ? 85 : 60),
        vx: (Math.random() - 0.5) * 24,
        vy: -38 - Math.random() * (this.isBerserk ? 55 : 35),
        size: this.isBerserk ? 5 : 3.5,
        color: this.isBerserk && Math.random() < 0.45 ? '#facc15' : this.primaryColor,
        maxLife: 0.55
      });
    }

    const dist = enemy ? Math.abs(enemy.x - this.x) : 999;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;

    if (this.state === 'IDLE' || this.state === 'WALK') {
      if (enemy && !enemy.isDead) {
        // 1. Smart Archetype Ultimate Timing (don't waste Ultimate into an invulnerable dodge or from out of effective range!)
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
          if (this.stats) this.stats.ultsUsed++;
          this.setState('ULTIMATE');
          game.triggerUltimateCinematic(this);
          return;
        }

        // 2. Active Evasive Dodge / Parry / Gap-Maker when threatened by incoming projectile, melee swing, or corner pressure
        if (this.dodgeCooldown <= 0 && this.checkIncomingThreat(enemy, game)) {
          this.startDodge(enemy, game);
          return;
        }

        // 3. Archetype Gap-Closing or Repositioning Dash
        const shouldDash =
          this.heroId === 'ronin'
            ? dist > 165
            : this.attackRange < 200
              ? dist > 185
              : dist > 490 || ((this.x < 210 || this.x > ww - 210) && dist < 260);
        if (this.dashCooldown <= 0 && shouldDash) {
          this.startDash(enemy, game);
          return;
        }

        // 4. Smart Archetype Skill Timing (wait if enemy is invulnerable mid-dodge)
        const maxSkillDist = this.skillTriggerRange || this.attackRange * 2.2;
        if (this.skillCooldown <= 0 && dist <= maxSkillDist && !enemy.isInvulnerable) {
          this.skillCooldown = this.skillMaxCooldown * (0.86 + Math.random() * 0.28);
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

        // 5. Auto-Attack & Authentic Archetype Tactical Footwork Between Attacks (Zero Static Statue Standing!)
        const atkRange = this.getEffectiveAttackRange ? this.getEffectiveAttackRange() : this.attackRange;
        if (dist <= atkRange) {
          if (this.autoCooldown <= 0) {
            this.autoCooldown = this.autoInterval * (0.88 + Math.random() * 0.24);
            this.setState('AUTO_ATTACK');
            return;
          }

          // Between attacks (autoCooldown > 0), each champion exhibits their authentic combat archetype footwork!
          const isRangedArchetype = this.attackRange >= 300;
          if (isRangedArchetype) {
            // Ranged Artillery / Marksman / Valkyrie Javelin Thrower / Sanctuary Weaver / Chronomancer:
            // Actively kite backward to maintain their 355px-480px sweet-spot spacing (or stride toward center if near a wall)
            const sweetSpotMin =
              this.heroId === 'valkyrie'
                ? 385
                : this.heroId === 'archer'
                  ? 355
                  : this.heroId === 'priestess'
                    ? 365
                    : 345;
            if (dist < sweetSpotMin) {
              const nearLeft = this.x < 175;
              const nearRight = this.x > ww - 175;
              if (!nearLeft && !nearRight) {
                this.state = 'WALK';
                this.moveDir = -1;
                this.walkPhase += dt * 4.2;
                this.x -= this.facing * this.moveSpeed * 0.78 * dt;
                this.headBob = Math.sin(this.walkPhase * 2) * 2.2;
              } else {
                this.state = 'IDLE';
                this.moveDir = 0;
              }
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (this.heroId === 'ronin') {
            // Storm-Blade Iaido Samurai (Kaze-Maru): Fast Suriashi in-and-out micro-footwork & pressure!
            this.state = 'WALK';
            this.walkPhase += dt * 6.2;
            const weaveDir = dist > 135 ? 1 : Math.sin(this.walkPhase * 1.4) > 0 ? 0.55 : -0.45;
            this.moveDir = weaveDir >= 0 ? 1 : -1;
            this.x += this.facing * this.moveSpeed * 0.75 * weaveDir * dt;
            this.headBob = Math.sin(this.walkPhase * 2) * 1.8;
          } else if (this.heroId === 'titan') {
            // Unstoppable Mountain Juggernaut (Torgar): Slow, earth-shaking heavy march into point-blank maul range (126px)
            if (dist > 126) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 3.2;
              this.x += this.facing * this.moveSpeed * 0.90 * dt;
              this.headBob = Math.abs(Math.sin(this.walkPhase * 2)) * 3.2;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else if (this.heroId === 'reaper') {
            // Relentless Harvester (Malakor): Stalk relentlessly into scythe hook range (148px)!
            if (dist > 152) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.6;
              this.x += this.facing * this.moveSpeed * 0.85 * dt;
              this.headBob = Math.sin(this.walkPhase * 2) * 2.4;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          } else {
            // Runic Vanguard (Aethelgard): Press forward into heavy melee pressure range (132px)
            if (dist > 136) {
              this.state = 'WALK';
              this.moveDir = 1;
              this.walkPhase += dt * 4.5;
              this.x += this.facing * this.moveSpeed * 0.85 * dt;
              this.headBob = Math.sin(this.walkPhase * 2) * 2.4;
            } else {
              this.state = 'IDLE';
              this.moveDir = 0;
            }
          }
        } else {
          this.state = 'WALK';
          this.moveDir = 1;
          this.walkPhase += dt * 4.5;
          this.x += this.facing * this.moveSpeed * dt;
          this.headBob = Math.sin(this.walkPhase * 2) * 2.5;
        }
      } else {
        this.state = 'IDLE';
        this.moveDir = 0;
      }
    }

    if (this.state === 'IDLE') {
      this.moveDir = 0;
      this.walkPhase += dt * 2.8;
      this.headBob = Math.sin(this.walkPhase) * 2.0;
    } else if (this.state === 'HURT') {
      if (this.stateTimer >= 0.28) {
        this.setState('IDLE');
      }
    } else if (this.state === 'DASH' || this.state === 'DODGE' || this.state === 'JUMP') {
      if (this.updateDashOrDodge) {
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
        targetLean = 0.145 + Math.sin(this.walkPhase * 2) * 0.025;
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
    if (this.state === 'WALK') return this.facing * 0.18 + Math.sin(this.walkPhase) * 0.14;
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
