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
      ultimate: 'JUSTICE',
      crouch: 'AEGIS',
      jump: 'LEAP'
    }
  },
  mage: {
    id: 'mage',
    tags: {
      attack: 'SOLAR',
      dodge: 'BLINK',
      skill: 'INFERNO',
      overdrive: 'SUPRNOVA',
      ultimate: 'METEOR',
      crouch: 'WARD',
      jump: 'VAULT'
    }
  },
  archer: {
    id: 'archer',
    tags: {
      attack: 'VOLLEY',
      dodge: 'GALE',
      skill: 'RAIN',
      overdrive: 'STARLOCK',
      ultimate: 'GREATBOW',
      crouch: 'SNARE',
      jump: 'VAULT'
    }
  },
  priestess: {
    id: 'priestess',
    tags: {
      attack: 'SMITE',
      dodge: 'GRACE',
      skill: 'SANCTUM',
      overdrive: 'SPEARS',
      ultimate: 'CANNON',
      crouch: 'AEGIS',
      jump: 'ASCEND'
    }
  },
  reaper: {
    id: 'reaper',
    tags: {
      attack: 'REAP',
      dodge: 'BURROW',
      skill: 'THANATOS',
      overdrive: 'CLONES',
      ultimate: 'OBLIVION',
      crouch: 'SHROUD',
      jump: 'DIVE'
    }
  },
  chronomancer: {
    id: 'chronomancer',
    tags: {
      attack: 'GLAIVE',
      dodge: 'WARP',
      skill: 'CLONE',
      overdrive: 'STASIS',
      ultimate: 'ETERNAL',
      crouch: 'REWIND',
      jump: 'SHIFT'
    }
  },
  titan: {
    id: 'titan',
    tags: {
      attack: 'MJOLNIR',
      dodge: 'CHARGE',
      skill: 'ANVIL',
      overdrive: 'HOMERUN',
      ultimate: 'SUNDER',
      crouch: 'BULWARK',
      jump: 'METEOR'
    }
  },
  ronin: {
    id: 'ronin',
    tags: {
      attack: 'IAIDO',
      dodge: 'SURIASHI',
      skill: 'RAIJIN',
      overdrive: 'SUSANOO',
      ultimate: 'AMAKAKR',
      crouch: 'PARRY',
      jump: 'SWALLOW'
    }
  },
  valkyrie: {
    id: 'valkyrie',
    tags: {
      attack: 'GUNGNIR',
      dodge: 'GLIDE',
      skill: 'DRAGOON',
      overdrive: 'BAHAMUT',
      ultimate: 'RAGNAROK',
      crouch: 'PINIONS',
      jump: 'SKYDIVE'
    }
  },
  icemage: {
    id: 'icemage',
    tags: {
      attack: 'BALLET',
      dodge: 'DECOY',
      skill: 'JAWS',
      overdrive: '7-SWORDS',
      ultimate: '0.00 K',
      crouch: 'MIRROR',
      jump: 'STAIRS'
    }
  },
  android: {
    id: 'android',
    tags: {
      attack: 'ODACHI',
      dodge: 'THRUST',
      skill: 'FUNNELS',
      overdrive: 'HYPERBMR',
      ultimate: 'SATELLIT',
      crouch: 'HEXSHLD',
      jump: 'BOOST'
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
  }

  resetEffects() {
    this._frameCleavedMonsters.clear();
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

  /**
   * Provides an in-zone focal target ONLY during active Skill / Overdrive / Ultimate casts when no
   * living monster exists, preventing `enemy ? enemy.x : ww * 0.5` from targeting `x = 2400`!
   */
  resolveTarget(player, nearestMonster) {
    if (nearestMonster && !nearestMonster.isDead) {
      return nearestMonster;
    }
    if (
      player &&
      (player.state === 'SKILL' || player.state === 'ULTIMATE' || player.state === 'TRUE_ULTIMATE')
    ) {
      const focalX = this.clampX(player.x + (player.facing || 1) * 240, 44);
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
    return nearestMonster || null;
  }

  /**
   * Adapts 2.5D depth lane alignment and Colossal Boss vertical hitplane right before `player.update`.
   */
  beginPlayerStep(dt, player, target, _isMoving3D = false, rawDirY = 0) {
    if (!player) return;
    if (player.fx) {
      const camX = this.adventure?.game?.renderer?.camX;
      player.fx.overrideCenterWorldX = Number.isFinite(camX) ? camX : player.x;
    }

    if (!target || target.isDead || target.isDummyFocal) return;

    if (target.isColossalBoss) {
      // Align Colossal Boss hitplane Y to the player's active 3D lane during player.update so all 11
      // champions' real melee checks (`|this.y - enemy.y| < 95`) and horizontal projectiles hit cleanly!
      this._savedBossRef = target;
      this._savedBossY = target.anchorGroundY || target.y || 561;
      target.y = player.groundY || player.y || 561;
      return;
    }

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

    const st = attacker.state;
    let radX = (attacker.attackRange || 180) < 300 ? 155 : 130;
    let radZ = 100;
    let splashMult = 0.75;

    if (st === 'TRUE_ULTIMATE') {
      radX = 680;
      radZ = 240;
      splashMult = 0.90;
    } else if (st === 'ULTIMATE') {
      radX = 310;
      radZ = 175;
      splashMult = 0.85;
    } else if (st === 'SKILL' || st === 'CROUCH' || st === 'JUMP' || st === 'DODGE' || st === 'DASH') {
      radX = 215;
      radZ = 128;
      splashMult = 0.80;
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

    const focusMin = colossalAlive ? 3865 : safeMin;
    for (const key of HERO_FOCUS_TARGET_KEYS) {
      if (Number.isFinite(player[key])) {
        player[key] = Math.max(focusMin, Math.min(safeMax, player[key]));
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

    // Keep Aethelgard's 78 Seraphim Justice Feathers raining around the active Adventure camera!
    if (
      player.heroId === 'warrior' &&
      Array.isArray(player.justiceFeathers) &&
      player.justiceFeathers.length > 0
    ) {
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
