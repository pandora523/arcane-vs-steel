/**
 * Non-Invasive 2.5D Adventure Combat Adapter (`AdventureSkillSets`)
 *
 * Preserves 100% of every champion's authentic VS Mode animations, `ArcaneShaderFX` (`this.fx`)
 * shaders, signature constructs (Helios Orbiting Suns, 4-Variant Figure-Skating Ballet & Chakrams,
 * Soul Stacks & Thanatos Stand + 2 Death Companions, 4 Fin-Funnels & Satellite Buster, Crucible
 * Cores & World-Anvil, Temporal Clone & XII Time-Stop, Iaido Saya & Susanoo, Valhalla Wings &
 * Bahamut, Aegis Shield & 78 Seraphim Feathers, 180° Starlock Somersault & Yggdrasil Greatbow,
 * Stained-Glass Sanctuary & Final Grace), and skill names!
 *
 * Zero method overrides on `Fighter` instances — adapts targeting, 3D multi-lane pack cleave,
 * active wave-lock bounds, and Left-Side Colossal Raid Boss (`BEHEMOTH MALPHAS`) interactions
 * strictly externally while Adventure Mode is active.
 */

export const ADVENTURE_HERO_KITS = {
  warrior: {
    id: 'warrior',
    tags: {
      attack: 'CLEAVE',
      dodge: 'STEP',
      skill: 'CYCLONE',
      overdrive: 'GLACIAL',
      ultimate: 'JUSTICE'
    }
  },
  warrior_ex: {
    id: 'warrior_ex',
    tags: {
      attack: 'DAWN',
      dodge: 'BLITZ',
      skill: 'RUSH',
      overdrive: 'OMNISLSH',
      ultimate: 'EXVIUS'
    }
  },
  mage_ex: {
    id: 'mage_ex',
    tags: {
      attack: 'SOLAR',
      dodge: 'BLINK',
      skill: 'TRINITY',
      overdrive: 'ECLIPSE',
      ultimate: 'METEOR'
    }
  },
  priestess_ex: {
    id: 'priestess_ex',
    tags: {
      attack: 'HOLY',
      dodge: 'WINGS',
      skill: 'SANCTUM',
      overdrive: 'ORGAN',
      ultimate: 'GRACE'
    }
  },
  chronomancer_ex: {
    id: 'chronomancer_ex',
    tags: {
      attack: 'PARADOX',
      dodge: 'WARP',
      skill: 'SCHISM',
      overdrive: 'TIMELINE',
      ultimate: 'ETERNAL'
    }
  },
  valkyrie_ex: {
    id: 'valkyrie_ex',
    tags: {
      attack: 'JAVELIN',
      dodge: 'GLIDE',
      skill: 'SPEARS',
      overdrive: 'BAHAMUT',
      ultimate: 'RAGNAROK'
    }
  },
  ronin_ex: {
    id: 'ronin_ex',
    tags: {
      attack: 'RAIJIN',
      dodge: 'SURIASHI',
      skill: 'THUNDER',
      overdrive: 'STORMGOD',
      ultimate: 'AMAKAKR'
    }
  },
  archer_ex: {
    id: 'archer_ex',
    tags: {
      attack: 'ARROW',
      dodge: 'VAULT',
      skill: 'STARFALL',
      overdrive: 'STARLOCK',
      ultimate: 'YGGDRASL'
    }
  },
  reaper_ex: {
    id: 'reaper_ex',
    tags: {
      attack: 'THANATOS',
      dodge: 'WRAITH',
      skill: 'GUILLOTN',
      overdrive: 'LEGION',
      ultimate: 'OBLIVION'
    }
  },
  titan_ex: {
    id: 'titan_ex',
    tags: {
      attack: 'MJOLNIR',
      dodge: 'RUSH',
      skill: 'ANVIL',
      overdrive: 'HOMERUN',
      ultimate: 'GENESIS'
    }
  },
  icemage_ex: {
    id: 'icemage_ex',
    tags: {
      attack: 'FROST',
      dodge: 'SKATE',
      skill: 'PRISM',
      overdrive: '9-SWORDS',
      ultimate: 'BOREALIS'
    }
  },
  android_ex: {
    id: 'android_ex',
    tags: {
      attack: 'MURAMASA',
      dodge: 'THRUST',
      skill: 'FUNNELS',
      overdrive: 'HYPERLSR',
      ultimate: 'GUNG-09'
    }
  },
  nyx_ex: {
    id: 'nyx_ex',
    tags: {
      attack: 'PROMPT',
      dodge: 'CTRL-Z',
      skill: '404-COB',
      overdrive: '6-WINDO',
      ultimate: 'COB-OS'
    }
  },
  brawler_ex: {
    id: 'brawler_ex',
    tags: {
      attack: 'FISTS',
      dodge: 'STEP',
      skill: 'BREAKER',
      overdrive: '100FIST',
      ultimate: 'RAIJIN'
    }
  },
  mage: {
    id: 'mage',
    tags: {
      attack: 'SOLAR',
      dodge: 'BLINK',
      skill: 'INFERNO',
      overdrive: 'SUPRNOVA',
      ultimate: 'METEOR'
    }
  },
  archer: {
    id: 'archer',
    tags: {
      attack: 'VOLLEY',
      dodge: 'DASH',
      skill: 'RAIN',
      overdrive: 'STARLOCK',
      ultimate: 'GREATBOW'
    }
  },
  priestess: {
    id: 'priestess',
    tags: {
      attack: 'SMITE',
      dodge: 'GLIDE',
      skill: 'SANCTUM',
      overdrive: 'SPEARS',
      ultimate: 'CANNON'
    }
  },
  reaper: {
    id: 'reaper',
    tags: {
      attack: 'REAP',
      dodge: 'SHIFT',
      skill: 'THANATOS',
      overdrive: 'CLONES',
      ultimate: 'OBLIVION'
    }
  },
  chronomancer: {
    id: 'chronomancer',
    tags: {
      attack: 'GLAIVE',
      dodge: 'WARP',
      skill: 'CLONE',
      overdrive: 'STASIS',
      ultimate: 'ETERNAL'
    }
  },
  titan: {
    id: 'titan',
    tags: {
      attack: 'MJOLNIR',
      dodge: 'STRIDE',
      skill: 'ANVIL',
      overdrive: 'HOMERUN',
      ultimate: 'SUNDER'
    }
  },
  ronin: {
    id: 'ronin',
    tags: {
      attack: 'IAIDO',
      dodge: 'SURIASHI',
      skill: 'RAIJIN',
      overdrive: 'SUSANOO',
      ultimate: 'AMAKAKR'
    }
  },
  valkyrie: {
    id: 'valkyrie',
    tags: {
      attack: 'GUNGNIR',
      dodge: 'GLIDE',
      skill: 'DRAGOON',
      overdrive: 'BAHAMUT',
      ultimate: 'RAGNAROK'
    }
  },
  icemage: {
    id: 'icemage',
    tags: {
      attack: 'BALLET',
      dodge: 'SKATE',
      skill: 'JAWS',
      overdrive: '7-SWORDS',
      ultimate: '0.00 K'
    }
  },
  android: {
    id: 'android',
    tags: {
      attack: 'ODACHI',
      dodge: 'THRUST',
      skill: 'FUNNELS',
      overdrive: 'HYPERBMR',
      ultimate: 'SATELLIT'
    }
  }
};

const HERO_MOVE_WAYPOINT_KEYS = [
  'flipTargetX',
  'blinkTargetX',
  'dashTargetX',
  'warpTargetX',
  'vaultTargetX',
  'ascentTargetX',
  'dragoonTargetX',
  '_skillSkimTargetX',
  '_trueUltLandX',
  '_trueUltFlipEndX'
];

const HERO_FOCUS_TARGET_KEYS = [
  '_ultTargetX',
  '_trueUltTargetX',
  '_justiceLockTargetX',
  'eternalTargetX'
];

export class AdventureSkillSets {
  constructor(adventure) {
    this.adventure = adventure;
    this._frameCleavedMonsters = new Set();
    this._savedBossRef = null;
    this._savedBossY = 561;
    this._origGetEnemiesOf = null;
    this._wrappedGameRef = null;
    this._facingLockedPlayer = null;
    this._facingLockedValue = 1;
    this._freeAimCastState = null;
    this._freeAimCastFacing = 1;
    this._freeAimOriginX = null;
    this._freeAimFocalX = null;
    this._freeAimLastTimer = 0;
  }

  _restoreStepGuards() {
    if (this._facingLockedPlayer) {
      const p = this._facingLockedPlayer;
      const val = this._facingLockedValue || 1;
      this._facingLockedPlayer = null;
      Object.defineProperty(p, 'facing', {
        value: val,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    if (this._origGetEnemiesOf && this._wrappedGameRef) {
      this._wrappedGameRef.getEnemiesOf = this._origGetEnemiesOf;
      this._origGetEnemiesOf = null;
      this._wrappedGameRef = null;
    }
  }

  resetEffects() {
    this._frameCleavedMonsters.clear();
    this._restoreStepGuards();
    this._freeAimCastState = null;
    this._freeAimOriginX = null;
    this._freeAimFocalX = null;
    this._freeAimLastTimer = 0;
    if (this._savedBossRef) {
      this._savedBossRef.y = this._savedBossRef.anchorGroundY || this._savedBossY;
      this._savedBossRef = null;
    }
  }

  /**
   * Attaches non-invasive Adventure metadata ONLY — 100% of the champion's real VS class methods,
   * animations, shaders, and skill names remain completely untouched!
   */
  attachToFighter(fighter) {
    if (!fighter) return;
    this.resetEffects();
    fighter._advKitActive = true;
    fighter._advKitId = fighter.heroId || 'mage';
  }

  detachFromFighter(fighter) {
    this.resetEffects();
    if (!fighter) return;
    fighter._advKitActive = false;
    fighter._advKitId = null;
    if (fighter.fx) {
      fighter.fx.overrideCenterWorldX = null;
    }
  }

  getBounds(pad = 24) {
    const raw = this.adventure?.getActiveStageBounds?.() || { minX: 80, maxX: 4720 };
    const minX = raw.minX + pad;
    const maxX = Math.max(minX + 40, raw.maxX - pad);
    return { minX, maxX };
  }

  clampX(x, pad = 24) {
    const { minX, maxX } = this.getBounds(pad);
    return Math.max(minX, Math.min(maxX, x));
  }

  update(_dt, player) {
    this._frameCleavedMonsters.clear();
    if (player?.fx) {
      const camX = this.adventure?.game?.renderer?.camX;
      player.fx.overrideCenterWorldX = Number.isFinite(camX) ? camX : player.x;
    }
  }

  isManualFreeAim() {
    return Boolean(
      this.adventure?.active && !this.adventure?.autoPlay && !this.adventure?.manualTargetLock
    );
  }

  getFreeAimEnvelope(player) {
    const st = player?.state || 'IDLE';
    const hid = player?.heroId || '';
    const isRangedEx =
      hid === 'mage_ex' ||
      hid === 'priestess_ex' ||
      hid === 'icemage_ex' ||
      hid === 'valkyrie_ex' ||
      hid === 'archer_ex';
    const isRanged = Boolean(
      isRangedEx ||
        player?.isHackAndSlashCaster?.() ||
        hid === 'archer' ||
        (player?.attackRange || 0) >= 260
    );
    const baseRange = isRangedEx
      ? Math.max(510, player?.attackRange || 510)
      : player?.attackRange || (isRanged ? 420 : 180);
    if (st === 'ULTIMATE' || st === 'TRUE_ULTIMATE') {
      return { maxForward: Math.max(620, baseRange + 240), laneTol: 148 };
    }
    if (st === 'SKILL') {
      return { maxForward: Math.max(480, baseRange + 160), laneTol: 112 };
    }
    if (st === 'AUTO_ATTACK') {
      return {
        maxForward: isRanged ? Math.max(520, baseRange + 90) : Math.max(245, baseRange + 65),
        laneTol: isRanged ? 94 : 88
      };
    }
    return { maxForward: isRanged ? 500 : 240, laneTol: 88 };
  }

  isMonsterInFreeAimArc(player, m, facing = player?.facing || 1, refX = player?.x || 0) {
    if (!player || !m || m.isDead || m.isFullyBurrowed) return false;
    const dir = facing >= 0 ? 1 : -1;
    if (m.isColossalBoss) {
      const bossMinReachX = Math.max(80, (m.anchorX || 9335) - 885);
      return dir > 0 && player.x >= bossMinReachX;
    }
    const { maxForward, laneTol } = this.getFreeAimEnvelope(player);
    const signedDx = (m.x - refX) * dir;
    if (signedDx < -36 || signedDx > maxForward) return false;
    const pGy = Number.isFinite(player.groundY) ? player.groundY : player.y || 561;
    const mGy = Number.isFinite(m.groundY) ? m.groundY : m.y || 561;
    if (Math.abs(mGy - pGy) > laneTol) return false;
    const worldW = this.adventure?.getWorldWidth?.() || 9600;
    if (
      this.adventure?.lockActive &&
      (m.x < (this.adventure.lockMinX ?? 0) - 48 || m.x > (this.adventure.lockMaxX ?? worldW) + 48)
    ) {
      return false;
    }
    return true;
  }

  findBestFreeAimMonster(player, facing = player?.facing || 1, refX = player?.x || 0) {
    if (!player) return null;
    const living = this.adventure?.getLivingMonsters?.() || [];
    if (!living.length) return null;
    const dir = facing >= 0 ? 1 : -1;
    const pGy = Number.isFinite(player.groundY) ? player.groundY : player.y || 561;
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < living.length; i++) {
      const m = living[i];
      const matchesRef = this.isMonsterInFreeAimArc(player, m, dir, refX);
      const matchesCur =
        !matchesRef && refX !== player.x && this.isMonsterInFreeAimArc(player, m, dir, player.x);
      if (!matchesRef && !matchesCur) continue;
      let score;
      if (m.isColossalBoss) {
        score = Math.max(0, (m.x - player.x) * 0.85);
      } else {
        const signedDx = (m.x - player.x) * dir;
        const mGy = Number.isFinite(m.groundY) ? m.groundY : m.y || 561;
        const xCost = signedDx < 0 ? Math.abs(signedDx) + 28 : signedDx;
        score = xCost + Math.abs(mGy - pGy) * 0.9 - (m.isMiniBoss ? 18 : 0);
      }
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  _syncFreeAimCastSession(player) {
    if (!player) {
      this._freeAimCastState = null;
      return;
    }
    const st = player.state;
    const isCast = st === 'SKILL' || st === 'ULTIMATE' || st === 'TRUE_ULTIMATE';
    if (!isCast) {
      this._freeAimCastState = null;
      this._freeAimLastTimer = 0;
      return;
    }
    const curTimer = player.stateTimer || 0;
    if (
      this._freeAimCastState !== st ||
      curTimer <= 0.04 ||
      curTimer < (this._freeAimLastTimer || 0)
    ) {
      const facing = player.facing || 1;
      const rawFocalX = this.clampX(player.x + facing * 220, 44);
      this._freeAimCastState = st;
      this._freeAimCastFacing = facing;
      this._freeAimOriginX = player.x;
      this._freeAimFocalX =
        (rawFocalX - player.x) * facing < 16 ? player.x + facing * 20 : rawFocalX;
    }
    this._freeAimLastTimer = curTimer;
  }

  _buildDummyFocal(player, focalX) {
    const gy = Number.isFinite(player.groundY) ? player.groundY : player.y || 561;
    return {
      x: focalX,
      y: gy,
      groundY: gy,
      vx: 0,
      vy: 0,
      hp: 1,
      maxHp: 1,
      isDead: false,
      isDummyFocal: true,
      hasPoise: true,
      attackRange: 140,
      moveSpeed: 150,
      takeDamage() {}
    };
  }

  /**
   * Provides an in-zone focal target during active Skill / Overdrive / Ultimate casts when no
   * qualifying living monster exists, and enforces forward-only manual free-aim when `LOCK: OFF`.
   */
  resolveTarget(player, nearestMonster) {
    if (this.isManualFreeAim()) {
      this._syncFreeAimCastSession(player);
      if (
        !player ||
        (player.state !== 'AUTO_ATTACK' &&
          player.state !== 'SKILL' &&
          player.state !== 'ULTIMATE' &&
          player.state !== 'TRUE_ULTIMATE')
      ) {
        return null;
      }

      const facing =
        player.state === 'AUTO_ATTACK'
          ? player.facing || 1
          : this._freeAimCastFacing || player.facing || 1;
      const refX =
        player.state === 'AUTO_ATTACK'
          ? player.x
          : Number.isFinite(this._freeAimOriginX)
            ? this._freeAimOriginX
            : player.x;

      const frontMonster = this.findBestFreeAimMonster(player, facing, refX);
      if (frontMonster) {
        return frontMonster;
      }

      const propTarget = this.adventure?.destructibles?.getIntactTargetInFront?.(
        player,
        Math.max(220, (player.attackRange || 180) + 75)
      );
      if (
        propTarget &&
        (propTarget.x - player.x) * (player.facing || 1) >= -36 &&
        (!this.adventure?.lockActive ||
          (propTarget.x >= (this.adventure.lockMinX ?? 0) &&
            propTarget.x <= (this.adventure.lockMaxX ?? (this.adventure.getWorldWidth?.() || 9600))))
      ) {
        return propTarget;
      }

      if (player.state === 'AUTO_ATTACK') {
        return null;
      }

      const rawFocalX = this.clampX(player.x + (player.facing || 1) * 220, 44);
      const safeFocalX = Number.isFinite(this._freeAimFocalX)
        ? this._freeAimFocalX
        : (rawFocalX - player.x) * (player.facing || 1) < 16
          ? player.x + (player.facing || 1) * 20
          : rawFocalX;
      return this._buildDummyFocal(player, safeFocalX);
    }

    if (nearestMonster && !nearestMonster.isDead) {
      return nearestMonster;
    }
    if (
      player &&
      (player.state === 'AUTO_ATTACK' ||
        player.state === 'SKILL' ||
        player.state === 'ULTIMATE' ||
        player.state === 'TRUE_ULTIMATE')
    ) {
      const propTarget = this.adventure?.destructibles?.getIntactTargetInFront?.(
        player,
        Math.max(220, (player.attackRange || 180) + 75)
      );
      if (
        propTarget &&
        (!this.adventure?.lockActive ||
          (propTarget.x >= (this.adventure.lockMinX ?? 0) &&
            propTarget.x <= (this.adventure.lockMaxX ?? (this.adventure.getWorldWidth?.() || 9600))))
      ) {
        return propTarget;
      }
      if (player.state === 'AUTO_ATTACK') {
        return null;
      }
      const focalX = this.clampX(player.x + (player.facing || 1) * 240, 44);
      return this._buildDummyFocal(player, focalX);
    }
    return nearestMonster || null;
  }

  /**
   * Adapts 2.5D depth lane alignment and Colossal Boss vertical hitplane right before `player.update`.
   */
  beginPlayerStep(dt, player, target, _isMoving3D = false, rawDirY = 0) {
    this._restoreStepGuards();
    if (!player) return;
    if (player.fx) {
      const camX = this.adventure?.game?.renderer?.camX;
      player.fx.overrideCenterWorldX = Number.isFinite(camX) ? camX : player.x;
    }

    const activeBoss =
      target && target.isColossalBoss && !target.isDead
        ? target
        : this.adventure?.bossEntity &&
            !this.adventure.bossEntity.isDead &&
            this.adventure.bossEntity.isColossalBoss
          ? this.adventure.bossEntity
          : null;
    if (activeBoss) {
      // Align Colossal Boss hitplane Y to the player's active 3D lane during player.update so all 11
      // champions' real melee checks (`|this.y - enemy.y| < 95`) and horizontal projectiles hit cleanly!
      this._savedBossRef = activeBoss;
      this._savedBossY = activeBoss.anchorGroundY || activeBoss.y || 561;
      activeBoss.y = player.groundY || player.y || 561;
    }

    if (this.isManualFreeAim()) {
      this._syncFreeAimCastSession(player);
      const isActiveCombatState =
        player.state === 'AUTO_ATTACK' ||
        player.state === 'SKILL' ||
        player.state === 'ULTIMATE' ||
        player.state === 'TRUE_ULTIMATE';
      const game = this.adventure?.game;
      if (
        isActiveCombatState &&
        game &&
        typeof game.getEnemiesOf === 'function' &&
        !this._origGetEnemiesOf
      ) {
        const origGetEnemiesOf = game.getEnemiesOf;
        const self = this;
        const stepFacing =
          player.state === 'SKILL' ||
          player.state === 'ULTIMATE' ||
          player.state === 'TRUE_ULTIMATE'
            ? this._freeAimCastFacing || player.facing || 1
            : player.facing || 1;
        const stepOriginX =
          (player.state === 'SKILL' ||
            player.state === 'ULTIMATE' ||
            player.state === 'TRUE_ULTIMATE') &&
          Number.isFinite(this._freeAimOriginX)
            ? this._freeAimOriginX
            : player.x;
        this._origGetEnemiesOf = origGetEnemiesOf;
        this._wrappedGameRef = game;
        game.getEnemiesOf = function freeAimGetEnemiesOf(fighter) {
          const raw = origGetEnemiesOf.call(this, fighter);
          if (fighter !== player || !Array.isArray(raw) || !self.isManualFreeAim()) {
            return raw;
          }
          const activeFacing =
            player.state === 'AUTO_ATTACK' ? player.facing || stepFacing : stepFacing;
          const refX = player.state === 'AUTO_ATTACK' ? player.x : stepOriginX;
          return raw.filter(
            (m) =>
              self.isMonsterInFreeAimArc(player, m, activeFacing, refX) ||
              (refX !== player.x && self.isMonsterInFreeAimArc(player, m, activeFacing, player.x))
          );
        };
      }

      const isDuelistV2Cross = Boolean(
        player.state === 'AUTO_ATTACK' &&
          typeof player.isCrossSlashDuelist === 'function' &&
          player.isCrossSlashDuelist() &&
          target &&
          !target.isDummyFocal &&
          !target.isAdventureProp &&
          (player._autoVariant === 2 ||
            player.comboStep === 2 ||
            (target.x - player.x) * (player.facing || 1) >= 0)
      );
      const shouldLockFacing =
        !isDuelistV2Cross &&
        (player.state === 'AUTO_ATTACK' ||
          player.state === 'SKILL' ||
          ((player.state === 'ULTIMATE' || player.state === 'TRUE_ULTIMATE') &&
            (player.stateTimer || 0) <= 0.06));
      if (shouldLockFacing) {
        const lockedFacing = player.facing || 1;
        this._facingLockedPlayer = player;
        this._facingLockedValue = lockedFacing;
        Object.defineProperty(player, 'facing', {
          get() {
            return lockedFacing;
          },
          set(_v) {},
          enumerable: true,
          configurable: true
        });
      }
      // Zero automatic shiftEntityDepth lane magnetism in manual LOCK: OFF!
      return;
    }

    if (!target || target.isDead || target.isDummyFocal || target.isColossalBoss) return;

    const targetGy = Number.isFinite(target.groundY) ? target.groundY : target.y;
    const playerGy = Number.isFinite(player.groundY) ? player.groundY : player.y;
    const dz = targetGy - playerGy;

    if (
      player.state === 'SKILL' ||
      player.state === 'ULTIMATE' ||
      player.state === 'TRUE_ULTIMATE'
    ) {
      if (Math.abs(dz) > 4) {
        this.adventure?.shiftEntityDepth?.(
          player,
          Math.sign(dz) * Math.min(Math.abs(dz), 380 * dt)
        );
      }
    } else if (
      player.state === 'AUTO_ATTACK' &&
      Math.abs(rawDirY) < 0.12 &&
      Math.abs(dz) > 6 &&
      Math.abs(dz) <= 140
    ) {
      this.adventure?.shiftEntityDepth?.(
        player,
        Math.sign(dz) * Math.min(Math.abs(dz), 240 * dt)
      );
    }
  }

  /**
   * Frame-deduplicated 2.5D multi-lane pack cleave triggered whenever any authentic champion attack,
   * projectile, stand, companion, funnel, or shader strike damages a monster in Adventure Mode!
   */
  onDirectMonsterHit(attacker, primaryMonster, rawAmount, isCrit, knockX = 0, knockY = 0) {
    if (
      !this.adventure?.active ||
      !attacker ||
      attacker.isMonster ||
      !primaryMonster ||
      primaryMonster._isAdvCleaveSplash
    ) {
      return;
    }

    const living = this.adventure.getLivingMonsters?.();
    if (!living || living.length <= 1) return;

    const cleaveTier =
      this.adventure?.progression?.resolveOutgoingCastTier?.(
        rawAmount,
        attacker,
        attacker._advActiveCastSource || null
      ) ||
      (attacker.state === 'TRUE_ULTIMATE'
        ? 'true_ult'
        : attacker.state === 'ULTIMATE'
          ? 'ult'
          : attacker.state === 'SKILL'
            ? 'skill'
            : 'auto');
    let radX = attacker.hasHackAndSlashCombo?.() || (attacker.attackRange || 180) < 300 ? 155 : 130;
    let radZ = 100;
    let splashMult = 0.45;

    if (cleaveTier === 'true_ult') {
      radX = 460;
      radZ = 220;
      splashMult = 1.00;
    } else if (cleaveTier === 'ult') {
      radX = 360;
      radZ = 195;
      splashMult = 0.95;
    } else if (cleaveTier === 'skill') {
      radX = 255;
      radZ = 150;
      splashMult = 0.90;
    }

    const srcX = primaryMonster.x;
    const srcGy = Number.isFinite(primaryMonster.groundY) ? primaryMonster.groundY : primaryMonster.y;
    const splashDmg = Math.max(6, Math.round(rawAmount * splashMult));

    for (const m of living) {
      if (
        !m ||
        m === primaryMonster ||
        m.isDead ||
        m.isColossalBoss ||
        this._frameCleavedMonsters.has(m)
      ) {
        continue;
      }
      const mGy = Number.isFinite(m.groundY) ? m.groundY : m.y;
      if (Math.abs(m.x - srcX) <= radX && Math.abs(mGy - srcGy) <= radZ) {
        this._frameCleavedMonsters.add(m);
        m._isAdvCleaveSplash = true;
        try {
          m.takeDamage(splashDmg, attacker, Boolean(isCrit), knockX * 0.7, knockY * 0.7);
        } finally {
          m._isAdvCleaveSplash = false;
        }
      }
    }
  }

  /**
   * Restores Colossal Boss anchor Y and clamps hero movement waypoints inside active stage bounds.
   */
  endPlayerStep(_dt, player, minWalkX, maxWalkX, colossalAlive = false) {
    this._restoreStepGuards();
    if (this._savedBossRef) {
      this._savedBossRef.y = this._savedBossRef.anchorGroundY || this._savedBossY;
      this._savedBossRef = null;
    }
    if (!player) return;

    const safeMin = minWalkX + 24;
    const safeMax = Math.max(safeMin, maxWalkX - 24);
    for (const key of HERO_MOVE_WAYPOINT_KEYS) {
      if (Number.isFinite(player[key])) {
        player[key] = Math.max(safeMin, Math.min(safeMax, player[key]));
      }
    }

    const focusMax = colossalAlive
      ? Math.max(safeMax, this.adventure?.bossEntity?.anchorX || 9335)
      : safeMax;
    for (const key of HERO_FOCUS_TARGET_KEYS) {
      if (Number.isFinite(player[key])) {
        player[key] = Math.max(safeMin, Math.min(focusMax, player[key]));
      }
    }

    if (player._ultWaypoints) {
      const wpMin = minWalkX + 32;
      const wpMax = Math.max(wpMin, maxWalkX - 32);
      const list = Array.isArray(player._ultWaypoints)
        ? player._ultWaypoints
        : Object.values(player._ultWaypoints);
      for (const wp of list) {
        if (wp && Number.isFinite(wp.x)) {
          wp.x = Math.max(wpMin, Math.min(wpMax, wp.x));
        }
      }
    }

    // Keep Seraphim Justice Feathers raining around the active Adventure camera!
    if (Array.isArray(player.justiceFeathers) && player.justiceFeathers.length > 0) {
      const camX = Number.isFinite(this.adventure?.game?.renderer?.camX)
        ? this.adventure.game.renderer.camX
        : player.x;
      for (const f of player.justiceFeathers) {
        if (f && Number.isFinite(f.x) && Math.abs(f.x - camX) > 650) {
          const span = 1200;
          const rel = (((f.x - (camX - 600)) % span) + span) % span;
          f.x = camX - 600 + rel;
        }
      }
    }
  }

  renderFloor(_ctx) {}
  renderMid(_ctx) {}
  renderForeground(_ctx) {}
}
