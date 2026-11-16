import { Fighter } from './Fighter.js?v=30fps114';
import { PixelForge } from '../engine/PixelForge.js?v=30fps114';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps114';
import {
  ABYSSAL_EFFECT_REGISTRY,
  ABYSSAL_VIOLET_PALETTE,
  BLOOD_MOON_CRIMSON_PALETTE,
  NECRO_SOUL_EMERALD_PALETTE
} from '../engine/shaders/abyssalShaders.js?v=30fps114';

const AUTO_SLICES_EX = [
  [60, 8], // Beat 1 (V0, 0.38s): Wide Downward Reaping Crescent Smear -> snaps at F03 (63)
  [68, 7], // Beat 2 (V1, 0.36s): Reverse Rising Soul-Ripper Hook Smear -> snaps at F09 (69)
  [75, 8], // Beat 3 (V2, 0.40s): 2.5D Horizontal Thanatos Vortex Reap (2-Hit) -> snaps at F17/F18 (77/78)
  [83, 7]  // Beat 4 (V3, 0.54s): Airborne Leap -> Guillotine Bone-Obelisk Slam (3-Hit + phantom_scythe) -> snaps at F25 (85)
];

const BEAT_DURATIONS = [0.38, 0.36, 0.40, 0.54];
const INTRA_COMBO_LINK = 0.015;

/**
 * Malakor EX (`reaper_ex`) — Thanatos Arch-Reaper Sovereign.
 * Next-Gen Wide-Canvas (`320x240`, `9600x2400` 10x30 sheet, `anchorX=112, anchorY=230`)
 * FFBE / Last Cloudia Hack-and-Slash Remake. Coexists 100% independently alongside classic Malakor (`reaper`).
 *
 * Signature Kit:
 * - Colossal 2H Thanatos Soul-Guillotine Great-Scythe with 230-deg 4-band serrated soul-rip smears (`#fdf4ff -> #f43f5e -> #c084fc -> #3b0764`).
 * - Grounded Front-Reaping Juggernaut 4-Beat Auto (`[[60,8],[68,7],[75,8],[83,7]]`, 0 cross-through spam, 45-60ms hit-stop):
 *   V0 Downward Reaping Crescent + Mid-Range Soul-Wave; V1 Reverse Rising Soul-Ripper Hook;
 *   V2 2.5D Horizontal Thanatos Vortex Reap (2-hit + Thanatos Stand + Returning Soul-Disc);
 *   V3 Airborne Leap -> Guillotine Bone-Obelisk Slam (3-hit + `'phantom_scythe'` projectile + Grounded Obelisk).
 * - `1.72s` Underground Shadow Burrow (`1.26s` 100% submerged) & Surprise Ambush Uppercut.
 * - `SOUL SEVER` (`SKILL`), `DEATH'S SOVEREIGNTY` (`ULTIMATE`), and `MEMENTO MORI: OBLIVION GUILLOTINE`
 *   (`TRUE_ULTIMATE`, summoning the `12.5s` Living Abyssal Death-Mage & Ossuary Soul-Healer via `reaper_companions.png`).
 */
export class ReaperEx extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Malakor EX',
      maxHp: 3960,
      attackRange: 204,
      moveSpeed: 204,
      autoInterval: 0.96,
      lightColor: 'rgba(217, 70, 239, 1)',
      primaryColor: '#d946ef',
      hasTrueUltimate: true,
      trueUltName: 'MEMENTO MORI: OBLIVION GUILLOTINE',
      trueUltDuration: 4.50
    });

    this.heroId = 'reaper_ex';
    this.theme = 'abyssal';
    this.secondaryColor = '#f43f5e';
    this.deathSfx = 'death_reaper';
    this.hasPoise = true;
    this.unstoppablePoise = false;
    this.isDeflecting = false;

    this.autoDuration = BEAT_DURATIONS[0];
    this._postFlurryInterval = 1.48;
    this.skillMaxCooldown = 4.80;
    this.skillTriggerRange = 450;
    this.skillDuration = 0.96;
    this.ultDuration = 1.86;

    this.skillName = 'SOUL SEVER';
    this.ultName = "DEATH'S SOVEREIGNTY";
    this.ultSub = 'THANATOS SKY-DROP EXECUTION';
    this.hasTrueUltimate = true;
    this.trueUltName = 'MEMENTO MORI: OBLIVION GUILLOTINE';
    this.trueUltSub = 'SUPREME FINISHER - DEATH COVENANT';
    this.trueUltDuration = 4.50;

    // 4-Beat FFBE / Last Cloudia Grounded Front-Reaper State
    this.comboStep = 0;
    this._autoVariant = 0;
    this._comboPersistTimer = 0;
    this._queuedNextBeat = false;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this._beatStartX = this.x;
    this._beatTargetX = this.x;
    this._bootsPlanted = false;
    this._dragSparkAcc = 0;
    this._overrideFrameIdx = null;
    this.razorScars = [];

    // Ultimate & True Ultimate State
    this._trueUltStep = 0;
    this._trueUltAltarX = 600;
    this._trueUltSlashFlash = 0;
    this._ultSlashFlash = 0;
    this._ultSlashCenterX = 600;
    this._trueUltEnemy = null;
    this._trueUltSummoned = false;
    this._trueUltPhantomWave1 = false;
    this._trueUltPhantomWave2 = false;
    this._trueUltSkyAscent = false;
    this._trueUltAscentStartX = this.x;
    this.ultStage = 0;
    this.ultPassStartX = this.x;
    this.ultPassTargetX = this.x;
    this._ultTargetLockX = this.x;

    this.stepDustTimer = 0;
    this.graveWardTimer = 0;
    this.giantScale = 1.0;

    // Sovereign of Severed Souls & Death Covenant Systems
    this.soulStacks = 2;
    this.maxSoulStacks = 5;
    this.soulOrbitPhase = 0;

    this.severedSoul = null;
    this.scytheWave = null;
    this.thanatosStand = null;
    this.deathAvatar = null;
    this.wraithClones = [];
    this.deathCompanions = [];
    this.darkMagicOrbs = [];
    this.soulWisps = [];
    this.tombstones = [];
    this.boneCage = null;
    this.faultSpireQueue = [];
    this.activeScytheBoomerang = null;
    this.activeBoomerangScythe = null;
    this.afterimages = [];
    this.activeVfxAnims = [];
    this._fallbackCompanionsImg = null;

    // True Underground Shadow Burrow State (`1.72s` total / `1.26s` 100% underground)
    this.isSubmerged = false;
    this.isFullyBurrowed = false;
    this.submergeDepth = 0;
    this.submergeDir = 1;
    this.burrowShaderTimer = 0;
    this.burrowWarned = false;
    this.burrowDodgeToastCd = 0;
    this.burrowTrailNodes = [];
    this.wraithAlpha = 1.0;
    this._inResonanceEcho = false;

    this.didChainPull = false;
    this.didReapFinisher = false;
    this.dodgeMaxCooldown = 3.30;
    this.dashMaxCooldown = 3.20;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 2.50;
    this.crouchDuration = 1.72;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.isWraithPhase = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.phaseStartX = this.x;
    this.phaseTargetX = this.x;
    this.cameraAirLift = 0;

    this.fx = new ArcaneShaderFX(ABYSSAL_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 480,
      viewH: 260
    });

    if (typeof Image !== 'undefined') {
      PixelForge.ensureHeroLoaded?.('reaper_ex');
      PixelForge.ensureHeroLoaded?.('reaper');
    }
  }

  getExSprites() {
    return typeof Image !== 'undefined' ? PixelForge.initAssets()?.reaper_ex : null;
  }

  getCompanionSheet() {
    if (typeof Image === 'undefined') return null;
    const exSprites = PixelForge.initAssets()?.reaper_ex;
    const compFromEx = PixelForge.ensureImage?.(exSprites?.companions) || exSprites?.companions;
    if (compFromEx) return compFromEx;

    const legacyReaper = PixelForge.initAssets()?.reaper;
    const compFromLegacy = PixelForge.ensureImage?.(legacyReaper?.companions) || legacyReaper?.companions;
    if (compFromLegacy) return compFromLegacy;

    if (!this._fallbackCompanionsImg) {
      const img = new Image();
      img.src = 'assets/sprites/reaper_companions.png?v=30fps114';
      this._fallbackCompanionsImg = img;
    }
    return this._fallbackCompanionsImg;
  }

  _clampArenaX(xv, game) {
    const margin = 84;
    const minX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMinX)
        ? game.adventure.lockMinX + 20
        : margin;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const rawMaxX =
      game?.adventure?.lockActive && Number.isFinite(game.adventure.lockMaxX)
        ? game.adventure.lockMaxX - 20
        : ww - margin;
    const bossAlive = Boolean(
      game?.adventure?.bossEntity &&
        !game.adventure.bossEntity.isDead &&
        game.adventure.bossEntity.isColossalBoss
    );
    const maxX = bossAlive
      ? Math.min(rawMaxX, (game.adventure.bossEntity.anchorX || 9335) - 96)
      : rawMaxX;
    return Math.max(minX, Math.min(maxX, xv));
  }

  setState(newState) {
    const prevState = this.state;
    super.setState(newState);

    if (
      newState !== 'CROUCH' &&
      newState !== 'DODGE' &&
      newState !== 'DASH' &&
      newState !== 'JUMP'
    ) {
      this.fx?.stopByKey('abyssalWraithMantle');
    }

    if (newState !== 'CROUCH') {
      this.isFullyBurrowed = false;
      this.isSubmerged = false;
      this.submergeDepth = 0;
      this.isCrouching = false;
      this.wraithAlpha = newState === 'JUMP' ? this.wraithAlpha : 1.0;
    }

    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltSlashFlash = 0;
      this._trueUltSummoned = false;
      this._trueUltPhantomWave1 = false;
      this._trueUltPhantomWave2 = false;
      this._trueUltSkyAscent = false;
      this.isInvulnerable = true;
    } else if (newState === 'ULTIMATE') {
      this.ultStage = 0;
      this._ultSlashFlash = 0;
      this.isInvulnerable = true;
    } else if (newState === 'AUTO_ATTACK') {
      if (this._comboPersistTimer <= 0 && prevState !== 'AUTO_ATTACK') {
        this.comboStep = 0;
      }
      this._beginComboBeat(this.comboStep % 4, this.game);
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this.deathAvatar = null;
      this.wraithClones = [];
      this.fx?.stopByKey('deathAvatarCathedral');
      this.fx?.stopByKey('necropolisBoneyardDomain');
      this.fx?.stopByKey('mementoMoriNecropolisGates');
    } else {
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.giantScale = 1.0;
      this.isInvulnerable = newState === 'DODGE' || newState === 'JUMP';
      this.deathAvatar = null;
      this.wraithClones = [];
      this.fx?.stopByKey('deathAvatarCathedral');
      this.fx?.stopByKey('necropolisBoneyardDomain');
      this.fx?.stopByKey('mementoMoriNecropolisGates');
    }

    this.unstoppablePoise =
      newState === 'CROUCH' ||
      newState === 'SKILL' ||
      newState === 'ULTIMATE' ||
      newState === 'TRUE_ULTIMATE' ||
      (newState === 'AUTO_ATTACK' && this._autoVariant >= 2);

    if (newState === 'DEATH') {
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this.isFullyBurrowed = false;
      this.isSubmerged = false;
      this.submergeDepth = 0;
      this.graveWardTimer = 0;
      this._trueUltSlashFlash = 0;
      this._ultSlashFlash = 0;
      this.severedSoul = null;
      this.scytheWave = null;
      this.thanatosStand = null;
      this.deathAvatar = null;
      this.wraithClones = [];
      this.deathCompanions = [];
      this.darkMagicOrbs = [];
      this.burrowTrailNodes = [];
      this.boneCage = null;
      this.faultSpireQueue = [];
      this.razorScars.length = 0;
      this.fx?.clear();
    }
  }

  /**
   * Initializes one beat (`0..3`) of Malakor EX's grounded front-reaping 4-beat combo (`0` cross-through spam!).
   * Steps cleanly into the `116..126px` Great-Scythe smear sweet-spot, then hard-plants boots (`vx = 0`)!
   */
  _beginComboBeat(beatIdx, game) {
    const v = ((beatIdx % 4) + 4) % 4;
    this._autoVariant = v;
    this.comboStep = (v + 1) % 4;
    this.autoDuration = BEAT_DURATIONS[v];
    this.stateTimer = 0;
    this._intraLinkTimer = 0;
    this._beatHitMask = 0;
    this.didActionFrame = false;
    this._queuedNextBeat = false;
    this._bootsPlanted = false;
    this._dragSparkAcc = 0;
    this._comboPersistTimer = 0.76;
    this.unstoppablePoise = v >= 2;

    const startFrame = AUTO_SLICES_EX[v][0];
    this.trueUltFrameOverride = startFrame;
    this._overrideFrameIdx = startFrame;

    const enemy = this._currentEnemy || null;
    if (enemy && !enemy.isDead && !enemy.isDummyFocal) {
      this.facing = enemy.x >= this.x ? 1 : -1;
    }

    this._beatStartX = this.x;
    let desiredX = this.x + this.facing * (v === 0 ? 20 : v === 2 ? 16 : 12);

    const anchorTarget =
      enemy && !enemy.isDead
        ? enemy
        : this.severedSoul && this.severedSoul.life > 0
          ? this.severedSoul
          : null;

    if (anchorTarget) {
      const sweetDist = v === 2 ? 114 : 122;
      const idealStandX = anchorTarget.x - this.facing * sweetDist;
      const rawDelta = (idealStandX - this.x) * this.facing;
      // Grounded front-reaper advance: closes gap up to +106px on Beat 1, +28..40px on follow-ups, NEVER crossing behind!
      const maxForward = v === 0 ? 106 : v === 2 ? 40 : 28;
      const clampedForward = Math.max(0, Math.min(maxForward, rawDelta));
      desiredX = this.x + this.facing * clampedForward;
    }

    this._beatTargetX = this._clampArenaX(desiredX, game);
  }

  queueNextComboBeat() {
    this._queuedNextBeat = true;
  }

  takeDamage(rawAmount, attacker, isCrit = false, knockbackX = 0, knockbackY = 0) {
    if (this.isFullyBurrowed) {
      if (this.deathCompanions?.length && rawAmount > 0) {
        const refX = attacker && Number.isFinite(attacker.x) ? attacker.x : this.x;
        for (const comp of this.deathCompanions) {
          if (comp && !comp.isDead && (comp.hurtIcd || 0) <= 0 && Math.abs(comp.x - refX) <= 175) {
            comp.hurtIcd = 0.70;
            this.damageCompanion(comp, Math.round(rawAmount * 0.45), attacker, isCrit, this.game);
            break;
          }
        }
      }
      if (this.burrowDodgeToastCd <= 0 && this.game?.vfx) {
        this.burrowDodgeToastCd = 0.42;
        this.game.vfx.spawnDamageText(this.x, this.groundY - 42, 0, false, 'SHADOW BURROW!', '#a855f7');
      }
      return 0;
    }

    let finalAmount = rawAmount;
    let finalKbX = knockbackX;
    let finalKbY = knockbackY;

    let drMult = 1.0;
    const hasLivingCovenant =
      Array.isArray(this.deathCompanions) &&
      this.deathCompanions.some((c) => c && !c.isDead && c.life > 0 && c.hp > 0);
    if (hasLivingCovenant) {
      drMult *= 0.88;
    }
    if ((this.graveWardTimer || 0) > 0) {
      drMult *= 0.84;
      finalKbX *= 0.45;
      finalKbY *= 0.50;
    }
    finalAmount *= Math.max(0.75, drMult);

    return super.takeDamage(finalAmount, attacker, isCrit, finalKbX, finalKbY);
  }

  gainSoulStack(amount = 1) {
    if (this.isDead || amount <= 0) return;
    this.soulStacks = Math.min(this.maxSoulStacks, this.soulStacks + amount);
  }

  consumeSoulStacks(maxConsume = 3) {
    const used = Math.min(maxConsume, this.soulStacks);
    this.soulStacks = Math.max(0, this.soulStacks - used);
    return used;
  }

  spawnThanatosStand(duration = 0.68, size = 276, anchorX = null, followOwner = true) {
    this.thanatosStand = {
      x: anchorX !== null ? anchorX : this.x - this.facing * 24,
      y: this.groundY - Math.round(size * 0.56),
      size,
      facing: this.facing,
      age: 0,
      maxLife: duration,
      followOwner
    };
    this.deathAvatar = this.thanatosStand;
  }

  spawnWraithClone(startX, startY, endX, endY, facing, duration = 0.42, row = 2, startCol = 8, endCol = 22) {
    this.wraithClones.push({
      startX,
      startY,
      endX,
      endY,
      x: startX,
      y: startY,
      facing,
      age: 0,
      maxLife: duration,
      row,
      startCol,
      endCol
    });
  }

  spawnSoulWisp(fromX = null, fromY = null, glowColor = null) {
    const idx = this.soulWisps.length;
    const sx =
      fromX !== null
        ? fromX
        : (this._trueUltAltarX || this.x + this.facing * 140) +
          (idx % 2 === 0 ? -1 : 1) * (65 + (idx % 3) * 35);
    const sy = fromY !== null ? fromY : this.groundY - 82 - (idx % 4) * 24;
    this.soulWisps.push({
      startX: sx,
      startY: sy,
      arcHeight: -52 - Math.random() * 58 + (idx % 2 === 0 ? -24 : 24),
      life: -(idx % 4) * 0.04,
      maxLife: 0.54 + Math.random() * 0.14,
      glowColor: glowColor || (idx % 2 === 0 ? 'violet' : 'crimson')
    });
  }

  spawnGroundedBoneSpire(x, h = 208, maxLife = 0.56, opts = {}) {
    const groundedY = this.groundY - Math.round(h * (34 / 104));
    this.spawnVfxAnim(2, x, groundedY, h, h, maxLife, {
      flipX: Boolean(opts.flipX),
      glowColor: opts.glowColor || 'crimson',
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : false
    });
  }

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.24, scale = 1.0) {
    if (this.afterimages.length >= 16) this.afterimages.shift();
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + (col % 30),
      age: 0,
      maxLife,
      scale: scale || 1.0
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.44, opts = {}) {
    if (this.activeVfxAnims.length >= 26) this.activeVfxAnims.shift();
    this.activeVfxAnims.push({
      row,
      x,
      y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      w,
      h,
      age: 0,
      maxLife,
      flipX: Boolean(opts.flipX),
      startFrame: opts.startFrame || 0,
      endFrame: opts.endFrame !== undefined ? opts.endFrame : 29,
      glowColor: opts.glowColor || 'violet',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: Boolean(opts.inFront)
    });
  }

  spawnRazorScar(cx, cy, dx, dy, maxLife = 0.22, isCrimson = false) {
    if (this.razorScars.length >= 18) this.razorScars.shift();
    this.razorScars.push({
      x0: Math.round(cx - dx * 0.5),
      y0: Math.round(cy - dy * 0.5),
      x1: Math.round(cx + dx * 0.5),
      y1: Math.round(cy + dy * 0.5),
      age: 0,
      maxLife,
      isCrimson
    });
  }

  firePhantomScythe(game, opts = {}) {
    const dir = this.facing;
    const spawnX = opts.x ?? this.x + dir * 94;
    const spawnY = opts.y ?? this.groundY - 82;
    if (game?.vfx?.spawnProjectile) {
      game.vfx.spawnProjectile({
        x: spawnX,
        y: spawnY,
        vx: dir * (opts.speed ?? 670),
        vy: 0,
        radius: opts.radius ?? 24,
        damage: opts.damage ?? 24,
        owner: this,
        color: '#e879f9',
        coreColor: '#fdf4ff',
        type: 'phantom_scythe',
        pierce: true,
        isUltimate: Boolean(opts.isUltimate),
        maxRange: opts.maxRange ?? 430
      });
    }
    this.spawnVfxAnim(0, spawnX, spawnY, 188, 188, 0.28, {
      vx: dir * 285,
      flipX: dir < 0,
      glowColor: 'crimson',
      inFront: true
    });
  }

  getEffectiveAttackRange() {
    const mode = ((this.comboStep || 0) % 4 + 4) % 4;
    if (mode === 2) return 410;
    if (mode === 0) return 265;
    return this.attackRange;
  }

  _gatherMeleeTargets(primaryEnemy, game, reachFront = 228, reachBack = 42) {
    const targets = [];
    const seen = new Set();
    const isAdv = Boolean(game?.isAdventureMode?.() && game?.adventure?.active);
    const myGy = this.groundY || this.y;

    const consider = (foe) => {
      if (!foe || foe === this || foe.isDead || foe.isBenched || foe.isFullyBurrowed || seen.has(foe)) return;
      const relX = (foe.x - this.x) * this.facing;
      const hitPad = foe.isColossalBoss ? 82 : 0;
      if (relX < -reachBack - hitPad || relX > reachFront + hitPad) return;
      if (isAdv && !foe.isColossalBoss) {
        const foeGy = foe.groundY || foe.y;
        if (Math.abs(foeGy - myGy) > 68) return;
      }
      seen.add(foe);
      targets.push(foe);
    };

    consider(primaryEnemy);
    if (game?.getEnemiesOf) {
      const list = game.getEnemiesOf(this);
      if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) consider(list[i]);
      }
    }
    if (isAdv && Array.isArray(game.adventure.enemies)) {
      for (let i = 0; i < game.adventure.enemies.length; i++) {
        consider(game.adventure.enemies[i]);
      }
    }
    if (isAdv && game.adventure.bossEntity) {
      consider(game.adventure.bossEntity);
    }
    return targets;
  }

  strikeWithSoulResonance(target, dmg, isCrit, knockX, knockY, game) {
    if (!target || target.isDead || target.isBenched) return;
    target.takeDamage(dmg, this, isCrit, knockX, knockY);

    if (
      !this._inResonanceEcho &&
      this.severedSoul &&
      this.severedSoul.life > 0 &&
      this.severedSoul.target === target &&
      !target.isDead &&
      (this.severedSoul.echoCooldown || 0) <= 0
    ) {
      this._inResonanceEcho = true;
      this.severedSoul.echoCooldown = 0.28;
      const echoDmg = Math.max(7, Math.round(dmg * 0.27));
      target.takeDamage(echoDmg, this, false, -28, 0);
      this.fx?.spawn('skeletalChainTetherBeam', this.severedSoul.x, this.severedSoul.y, {
        light: 1.32,
        extra: {
          dx: target.x - this.severedSoul.x,
          dy: target.y - 96 - this.severedSoul.y,
          arcH: -16,
          isCrimson: true,
          isComet: true,
          showClaw: false,
          customDuration: 0.28
        }
      });
      if (game?.vfx) {
        game.vfx.spawnDamageText(
          this.severedSoul.x,
          this.severedSoul.y - 44,
          0,
          false,
          `SOUL ECHO +${echoDmg}`,
          '#f472b6'
        );
      }
      this._inResonanceEcho = false;
    }
  }

  /**
   * Applies Great-Scythe impact with crunchy `45-60ms` `_hitStopTimer`, target `_hitShakeTimer`,
   * Soul-Link Resonance Echo, Soul-Leech harvest, and serrated soul-rip scars!
   */
  _applyThanatosReap(primaryEnemy, game, cfg) {
    const {
      damage = 28,
      reachFront = 228,
      reachBack = 40,
      hitStop = 0.046,
      shakeDur = 0.062,
      knockX = -32,
      knockY = -28,
      inwardDrag = 0,
      leech = 3,
      gainSoul = 1,
      isCrit = false,
      isCrimson = false,
      scarDx = 116,
      scarDy = 86,
      sfx = 'scythe_reap'
    } = cfg;

    if (game?.audio) game.audio.play(sfx, this.x + this.facing * 84);
    this.didActionFrame = true;

    const targets = this._gatherMeleeTargets(primaryEnemy, game, reachFront, reachBack);
    let landedAny = false;

    for (let i = 0; i < targets.length; i++) {
      const foe = targets[i];
      const dmg = i === 0 ? damage : Math.max(10, Math.round(damage * 0.84));
      this.strikeWithSoulResonance(foe, dmg, isCrit, knockX, knockY, game);

      if (inwardDrag > 0 && !foe.isDead && !foe.unstoppablePoise && !foe.isColossalBoss) {
        foe.x += Math.sign(this.x - foe.x) * inwardDrag;
      }

      if (!foe.isDead && !foe.isColossalBoss) {
        foe._hitStopTimer = Math.max(foe._hitStopTimer || 0, hitStop);
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur);
      } else if (!foe.isDead && foe.isColossalBoss) {
        foe._hitShakeTimer = Math.max(foe._hitShakeTimer || 0, shakeDur * 0.75);
      }

      const hitX = foe.x;
      const hitY = foe.y - (foe.isColossalBoss ? 128 : 92);
      this.spawnRazorScar(hitX, hitY, this.facing * scarDx, scarDy, 0.22, isCrimson);
      this.spawnVfxAnim(4, hitX, hitY, 186, 186, 0.22, {
        flipX: this.facing < 0,
        glowColor: isCrimson ? 'crimson' : 'violet',
        inFront: true
      });
      this.fx?.burst(hitX, hitY, {
        count: isCrit ? 8 : 5,
        speedMin: 44,
        speedMax: 156,
        lifeMin: 0.12,
        lifeMax: 0.26,
        gravity: 30,
        colors: isCrimson
          ? ['#fdf4ff', '#f43f5e', '#c084fc', '#3b0764']
          : ['#fdf4ff', '#e879f9', '#c084fc', '#f43f5e']
      });
      landedAny = true;
    }

    if (landedAny) {
      if (gainSoul > 0) this.gainSoulStack(gainSoul);
      if (leech > 0) this.leechLife(leech, targets[0], game, 'SOUL HARVEST');
      if (hitStop > 0) {
        this._hitStopTimer = Math.max(this._hitStopTimer || 0, hitStop);
        game?.renderer?.triggerHitStop?.(hitStop * 0.72);
      }
    } else {
      const strikeX = this.x + this.facing * 88;
      if (!this.tryStrikeSeveredEffigy(strikeX, damage, game)) {
        this.tryStrikeSeveredEffigy(this.x, damage, game);
      }
    }

    return landedAny;
  }

  tryStrikeSeveredEffigy(strikeX, baseDmg, game) {
    const ss = this.severedSoul;
    if (!ss || ss.life <= 0 || (ss.echoCooldown || 0) > 0) return false;
    const tgt = ss.target;
    if (!tgt || tgt.isDead || tgt.isBenched) return false;
    if (Math.abs(strikeX - ss.x) > 142) return false;

    ss.echoCooldown = 0.30;
    const transmitted = Math.max(11, Math.round(baseDmg * 0.55));
    this._inResonanceEcho = true;
    tgt.takeDamage(transmitted, this, true, -55, -35);
    this._inResonanceEcho = false;

    if (!tgt.unstoppablePoise && !tgt.isColossalBoss) {
      tgt.x += Math.sign(ss.x - tgt.x) * 26;
    }
    this.leechLife(6, tgt, game, 'SOUL LINK');
    this.spawnVfxAnim(4, ss.x, ss.y, 176, 176, 0.28, {
      flipX: this.facing < 0,
      glowColor: 'crimson',
      inFront: true
    });
    this.fx?.spawn('skeletalChainTetherBeam', ss.x, ss.y, {
      light: 1.38,
      extra: {
        dx: tgt.x - ss.x,
        dy: tgt.y - 96 - ss.y,
        arcH: -18,
        isCrimson: true,
        showClaw: false,
        customDuration: 0.30
      }
    });
    if (game?.vfx) {
      game.vfx.spawnDamageText(tgt.x, tgt.y - 152, 0, false, 'SOUL LINK REND!', '#f43f5e');
    }
    return true;
  }

  leechLife(amount, sourceEntity, game, label = 'SOUL HARVEST') {
    if (this.isDead || amount <= 0) return 0;
    const prevHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const actual = Math.max(1, Math.round(amount));
    if (this.stats) {
      this.stats.healingDone += Math.max(0, Math.round(this.hp - prevHp));
    }

    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, `${label} +${actual}`, '#e879f9');
    }

    const fromX = sourceEntity ? sourceEntity.x : this.x + this.facing * 120;
    const fromY = sourceEntity ? sourceEntity.y - 96 : this.y - 96;
    if (this.soulWisps.length < 5) {
      this.soulWisps.push({
        startX: fromX + (Math.random() - 0.5) * 24,
        startY: fromY + (Math.random() - 0.5) * 24,
        arcHeight: -42 - Math.random() * 38,
        life: 0,
        maxLife: 0.42,
        glowColor: actual >= 12 ? 'crimson' : 'violet'
      });
    }
    if (actual >= 12) {
      this.fx?.spawn('skeletalChainTetherBeam', fromX, fromY, {
        light: 1.18,
        extra: {
          dx: this.x - fromX,
          dy: this.y - 96 - fromY,
          arcH: -52,
          isCrimson: actual >= 18,
          isComet: true,
          showClaw: false,
          customDuration: 0.36
        }
      });
    }
    return this.hp - prevHp;
  }

  spawnSeveredSoulEffigy(enemy, effigyX, game) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const cx = Math.max(105, Math.min(ww - 105, effigyX));
    this.severedSoul = {
      x: cx,
      y: this.groundY - 96,
      target: enemy,
      life: 2.40,
      maxLife: 2.40,
      echoCooldown: 0
    };
    this.boneCage = {
      x: cx,
      groundY: this.groundY,
      radius: 82,
      life: 2.05,
      maxLife: 2.05
    };
    this.tombstones = [];
    for (const side of [-74, 74]) {
      const tx = Math.max(90, Math.min(ww - 90, cx + side));
      this.tombstones.push({
        x: Math.round(tx / 4) * 4,
        groundY: this.groundY,
        size: 208,
        delay: side < 0 ? 0 : 0.03,
        life: 2.05,
        maxLife: 2.05,
        shattered: false,
        isPrison: true
      });
    }
    this.fx?.spawn('necroticGraveyardSigil', cx, this.groundY - 4, {
      palette: BLOOD_MOON_CRIMSON_PALETTE,
      light: 1.36,
      extra: { radius: 38, isPrison: true, isCrimson: true, customDuration: 1.80 }
    });
  }

  spawnCrescentScytheWave() {
    const startX = this.x + this.facing * 72;
    const startY = this.y - 98;
    this.scytheWave = {
      x: startX,
      y: startY,
      startX,
      dir: this.facing,
      vx: this.facing * 670,
      maxDist: 320,
      age: 0,
      maxLife: 0.48,
      didHit: false
    };
  }

  spawnBoomerangScythe() {
    const startX = this.x + this.facing * 72;
    const startY = this.y - 100;
    const boomerang = {
      x: startX,
      y: startY,
      startX,
      targetX: startX + this.facing * 405,
      dir: this.facing,
      phase: 'outbound',
      timer: 0,
      angle: 0,
      hitOutbound: false,
      hitHover: false,
      hitReturn: false
    };
    this.activeScytheBoomerang = boomerang;
    this.activeBoomerangScythe = boomerang;
  }

  spawnNecroticFaultLine(originX, dir, game) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    this.faultSpireQueue = [];
    for (let wave = 0; wave < 5; wave++) {
      const wx = Math.max(85, Math.min(ww - 85, originX + dir * (wave * 88)));
      this.faultSpireQueue.push({
        wave,
        x: wx,
        delay: wave * 0.065,
        h: 240
      });
    }
  }

  startJump(enemy, game, customDir = null) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = customDir !== null ? customDir : this.facing;
    if (enemy && Math.abs(enemy.x - this.x) > 140) {
      dir = Math.sign(enemy.x - this.x) || this.facing;
    }
    if (this.x < 180) dir = 1;
    else if (this.x > ww - 180) dir = -1;
    this.dashDir = dir;
    this.onStartDodge(enemy, game, dir, true);
  }

  /**
   * Summons TWO Autonomous Living Death Companions for `12.5s` during `MEMENTO MORI: OBLIVION GUILLOTINE`:
   *   1. `mage` — Abyssal Death-Mage (`480 HP` + `60` Ward)
   *   2. `healer` — Ossuary Soul-Healer (`420 HP` + `50` Ward)
   */
  summonDeathCompanions(game = null, empowerBonus = true, altarAnchorX = null) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;
    const advBounds =
      g?.adventure?.active && typeof g.adventure.getActiveStageBounds === 'function'
        ? g.adventure.getActiveStageBounds()
        : null;
    const cMin = advBounds ? advBounds.minX + 48 : 92;
    const cMax = advBounds ? advBounds.maxX - 48 : ww - 92;

    let mageX;
    let healerX;
    if (Number.isFinite(altarAnchorX)) {
      mageX = Math.max(cMin, Math.min(cMax, altarAnchorX - 168));
      healerX = Math.max(cMin, Math.min(cMax, altarAnchorX + 168));
    } else {
      const sMin = advBounds ? advBounds.minX : 0;
      const sMax = advBounds ? advBounds.maxX : ww;
      const backDir = this.x < sMin + 250 ? 1 : this.x > sMax - 250 ? -1 : -this.facing;
      mageX = Math.max(cMin, Math.min(cMax, this.x + backDir * 154));
      healerX = Math.max(cMin - 6, Math.min(cMax + 6, mageX + backDir * 84));
      if (Math.abs(healerX - mageX) < 52) {
        healerX = Math.max(cMin - 6, Math.min(cMax + 6, mageX - backDir * 84));
      }
    }

    const duration = 12.5;
    const makeComp = (role, spawnX, maxHp, initShield, maxShield, damageCap) => {
      const comp = {
        id: `reaper_ex_${role}`,
        role,
        name: role === 'mage' ? 'DEATH MAGE' : 'SOUL HEALER',
        owner: this,
        team: this.team,
        x: spawnX,
        y: this.groundY - (role === 'healer' ? 20 : 18),
        groundY: this.groundY,
        facing: Number.isFinite(altarAnchorX) ? (role === 'mage' ? 1 : -1) : this.facing,
        hp: maxHp,
        maxHp,
        shield: initShield,
        maxShield,
        damageCap,
        spawnGrace: 1.0,
        life: duration,
        maxLife: duration,
        isDead: false,
        hoverPhase: role === 'healer' ? 1.85 : 0.15,
        castCooldown: role === 'mage' ? 0.55 : 99,
        castInterval: 1.48,
        healCooldown: role === 'healer' ? 0.52 : 99,
        healInterval: 1.38,
        castAnimTimer: 0,
        didCastShot: false,
        didHealPulse: false,
        soulEmpoweredTimer: role === 'mage' ? (empowerBonus ? 4.8 : 2.2) : 0,
        hitFlash: 0,
        hurtIcd: role === 'mage' ? 0.65 : 0.68,
        takeDamage: (amt, attacker, isCrit = false, ignoreCap = false) =>
          this.damageCompanion(comp, amt, attacker, isCrit, g, ignoreCap)
      };
      return comp;
    };

    const mageComp = makeComp('mage', mageX, 480, 60, 75, 125);
    const healerComp = makeComp('healer', healerX, 420, 50, 65, 110);
    this.deathCompanions = [mageComp, healerComp];

    this.fx?.spawn('companionSummonRiftPortal', mageX, this.groundY - 4, {
      light: 1.44,
      extra: { isHealer: false }
    });
    this.fx?.spawn('companionSummonRiftPortal', healerX, this.groundY - 4, {
      palette: NECRO_SOUL_EMERALD_PALETTE,
      light: 1.44,
      extra: { isHealer: true }
    });

    if (g?.vfx) {
      g.vfx.spawnGlyphBurst(mageX, this.groundY - 88, 3, 'abyssal');
      g.vfx.spawnGlyphBurst(healerX, this.groundY - 88, 3, 'emerald');
      g.vfx.spawnDamageText(
        (mageX + healerX) * 0.5,
        this.groundY - 208,
        0,
        true,
        'OBLIVION COVENANT: DEATH MAGE & SOUL HEALER!',
        '#e879f9'
      );
    }
    return this.deathCompanions;
  }

  damageCompanion(comp, rawAmount, _attacker = null, isCrit = false, game = null, ignoreCap = false) {
    if (!comp || comp.isDead || comp.life <= 0 || rawAmount <= 0) return 0;

    let adjusted = rawAmount;
    if (!ignoreCap) {
      if ((comp.spawnGrace || 0) > 0) adjusted *= 0.55;
      if (comp.damageCap > 0) adjusted = Math.min(comp.damageCap, adjusted);
    }

    const dmg = Math.max(1, Math.round(adjusted));
    const shieldAbsorb = Math.min(comp.shield || 0, dmg);
    comp.shield = Math.max(0, (comp.shield || 0) - shieldAbsorb);
    const hpLoss = dmg - shieldAbsorb;
    comp.hp = Math.max(0, comp.hp - hpLoss);
    comp.hitFlash = 0.18;
    const g = game || this.game;

    if (g?.vfx) {
      g.vfx.spawnDamageText(
        comp.x,
        comp.y - 134,
        dmg,
        isCrit,
        shieldAbsorb > 0 && hpLoss === 0 ? 'SOUL WARD!' : null,
        shieldAbsorb > 0 && hpLoss === 0 ? '#67e8f9' : comp.role === 'healer' ? '#6ee7b7' : '#f0abfc'
      );
    }

    if (comp.hp <= 0) {
      comp.isDead = true;
      comp.life = 0;
      this.fx?.spawn('companionSummonRiftPortal', comp.x, this.groundY - 4, {
        palette: comp.role === 'healer' ? NECRO_SOUL_EMERALD_PALETTE : ABYSSAL_VIOLET_PALETTE,
        light: 1.32,
        extra: { isHealer: comp.role === 'healer' }
      });
      this.fx?.spawn('darkMageHexImpactNova', comp.x, comp.y - 78, {
        light: 1.24,
        extra: { isEmpowered: comp.role === 'mage' }
      });
      if (g?.vfx) {
        g.vfx.spawnGlyphBurst(comp.x, comp.y - 80, 3, comp.role === 'healer' ? 'emerald' : 'abyssal');
        g.vfx.spawnDamageText(
          comp.x,
          comp.y - 154,
          0,
          false,
          comp.role === 'mage' ? 'DEATH MAGE BANISHED!' : 'SOUL HEALER BANISHED!',
          '#fb7185'
        );
      }
    }
    return dmg;
  }

  updateCompanions(dt, enemy, game) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const enemies = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    const primaryFoe =
      enemies.find((e) => e && !e.isDead && !e.isBenched && !e.isFullyBurrowed) ||
      enemies.find((e) => e && !e.isDead && !e.isBenched) ||
      enemy;

    if (this.state !== 'TRUE_ULTIMATE') {
      for (let i = this.darkMagicOrbs.length - 1; i >= 0; i--) {
        const orb = this.darkMagicOrbs[i];
        orb.age += dt;
        orb.trailTimer = (orb.trailTimer || 0) + dt;

        const tgt =
          orb.target && !orb.target.isDead && !orb.target.isBenched ? orb.target : primaryFoe;
        if (tgt && !tgt.isDead && !tgt.isBenched && !tgt.isFullyBurrowed) {
          const dx = tgt.x - orb.x;
          const dy = tgt.y - 98 - orb.y;
          const d = Math.hypot(dx, dy) || 1;
          const speed = orb.speed || 555;
          const steer = Math.min(1, dt * 5.0);
          orb.vx += ((dx / d) * speed - orb.vx) * steer;
          orb.vy += ((dy / d) * speed - orb.vy) * steer;
        }

        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;

        if (orb.trailTimer >= 0.16) {
          orb.trailTimer = 0;
          this.fx?.burst(orb.x, orb.y, {
            count: 1,
            speedMin: 16,
            speedMax: 42,
            lifeMin: 0.12,
            lifeMax: 0.20,
            gravity: -6,
            colors: orb.isEmpowered
              ? ['#04010a', '#d946ef', '#f43f5e', '#6ee7b7']
              : ['#04010a', '#7e22ce', '#d946ef', '#ffffff']
          });
        }

        let hitFoe = null;
        for (const cand of enemies) {
          if (
            cand &&
            !cand.isDead &&
            !cand.isBenched &&
            !cand.isFullyBurrowed &&
            Math.abs(orb.x - cand.x) < 48 &&
            Math.abs(orb.y - (cand.y - 98)) < 78
          ) {
            hitFoe = cand;
            break;
          }
        }

        if (hitFoe) {
          const knockDir = Math.sign(orb.vx || this.facing) || 1;
          const manaBeforeOrb = this.mana;
          const prevFoeHurt = hitFoe.hurtTimer;
          hitFoe.takeDamage(orb.damage, this, false, knockDir * 12, 0);
          this.mana = manaBeforeOrb;
          hitFoe.hurtTimer = Math.min(hitFoe.hurtTimer, Math.max(prevFoeHurt, 0.06));
          if (orb.isEmpowered) this.gainSoulStack(1);
          this.fx?.spawn('darkMageHexImpactNova', orb.x, orb.y, {
            light: orb.isEmpowered ? 1.38 : 1.24,
            extra: { isEmpowered: Boolean(orb.isEmpowered) }
          });
          if (game?.audio) game.audio.play('soul_drain', hitFoe.x);
          this.darkMagicOrbs.splice(i, 1);
          continue;
        }

        if (orb.age >= orb.maxLife || orb.x < -80 || orb.x > ww + 80 || orb.y > this.groundY + 20) {
          this.darkMagicOrbs.splice(i, 1);
        }
      }
    }

    if (!this.deathCompanions || this.deathCompanions.length === 0) return;
    const mage = this.deathCompanions.find((c) => c && !c.isDead && c.role === 'mage') || null;

    for (let i = this.deathCompanions.length - 1; i >= 0; i--) {
      const comp = this.deathCompanions[i];
      if (!comp || comp.isDead) {
        this.deathCompanions.splice(i, 1);
        continue;
      }

      if (this.state !== 'TRUE_ULTIMATE') {
        comp.life -= dt;
        comp.spawnGrace = Math.max(0, (comp.spawnGrace || 0) - dt);
      }
      if (comp.life <= 0 || comp.hp <= 0) {
        comp.isDead = true;
        this.fx?.spawn('companionSummonRiftPortal', comp.x, this.groundY - 4, {
          palette: comp.role === 'healer' ? NECRO_SOUL_EMERALD_PALETTE : ABYSSAL_VIOLET_PALETTE,
          light: 1.22,
          extra: { isHealer: comp.role === 'healer' }
        });
        this.deathCompanions.splice(i, 1);
        continue;
      }

      comp.groundY = this.groundY;
      comp.hoverPhase += dt * 3.2;
      comp.hitFlash = Math.max(0, (comp.hitFlash || 0) - dt);
      comp.hurtIcd = Math.max(0, (comp.hurtIcd || 0) - dt);
      if (comp.soulEmpoweredTimer > 0 && this.state !== 'TRUE_ULTIMATE') {
        comp.soulEmpoweredTimer = Math.max(0, comp.soulEmpoweredTimer - dt);
      }

      if (this.state === 'TRUE_ULTIMATE') {
        const gateSide = comp.role === 'mage' ? -1 : 1;
        const gateX = Math.max(92, Math.min(ww - 92, this._trueUltAltarX + gateSide * 168));
        comp.x += (gateX - comp.x) * Math.min(1, dt * 6.5);
        comp.y = this.groundY - 24 - Math.sin(comp.hoverPhase) * 7;
        comp.facing = this._trueUltAltarX >= comp.x ? 1 : -1;
        continue;
      }

      if (game?.vfx?.projectiles?.length) {
        for (let pIdx = game.vfx.projectiles.length - 1; pIdx >= 0; pIdx--) {
          const p = game.vfx.projectiles[pIdx];
          if (!p || !p.owner || p.owner === this) continue;
          if (this.team && p.owner.team && p.owner.team === this.team) continue;
          if (p._hitReaperComps && p._hitReaperComps.has(comp.id)) continue;
          const hitX = Math.abs(p.x - comp.x) < (p.radius || 18) + 26;
          const hitY = Math.abs(p.y - (comp.y - 84)) < (p.radius || 18) + 54;
          if (hitX && hitY) {
            if (!p._hitReaperComps) p._hitReaperComps = new Set();
            p._hitReaperComps.add(comp.id);
            const pDmg = Math.round((p.damage || 65) * (p.isMeteor ? 0.48 : 0.78));
            this.damageCompanion(comp, pDmg, p.owner, Boolean(p.isMeteor), game);
            if (!p.isMeteor && !p.piercing) {
              game.vfx.projectiles.splice(pIdx, 1);
            }
            if (comp.isDead) break;
          }
        }
        if (comp.isDead) {
          this.deathCompanions.splice(i, 1);
          continue;
        }
      }

      if (comp.hurtIcd <= 0) {
        for (const foe of enemies) {
          if (!foe || foe.isDead || foe.isBenched) continue;
          const isAttacking =
            foe.state === 'AUTO_ATTACK' ||
            foe.state === 'SKILL' ||
            foe.state === 'ULTIMATE' ||
            foe.state === 'DASH' ||
            foe.state === 'JUMP';
          if (!isAttacking || (foe.stateTimer || 0) < 0.18) continue;
          const reach = foe.state === 'ULTIMATE' ? 235 : foe.state === 'SKILL' ? 195 : 165;
          if (Math.abs(foe.x - comp.x) <= reach) {
            comp.hurtIcd = comp.role === 'mage' ? 0.65 : 0.68;
            const cleaveDmg = foe.state === 'ULTIMATE' ? 118 : foe.state === 'SKILL' ? 92 : 68;
            this.damageCompanion(comp, cleaveDmg, foe, foe.state !== 'AUTO_ATTACK', game);
            break;
          }
        }
        if (comp.isDead) {
          this.deathCompanions.splice(i, 1);
          continue;
        }
      }

      if (comp.role === 'mage') {
        const foeX = primaryFoe ? primaryFoe.x : this.x + this.facing * 240;
        const distToFoe = Math.abs(foeX - comp.x);
        const flankSign = this.x <= foeX ? -1 : 1;
        let desiredMageX = foeX + flankSign * 232;
        if (desiredMageX < 96 || desiredMageX > ww - 96) {
          desiredMageX = foeX - flankSign * 228;
        }
        if (distToFoe < 165) {
          const escapeDir = foeX > ww * 0.5 ? -1 : 1;
          desiredMageX = foeX + escapeDir * 248;
        }
        desiredMageX = Math.max(96, Math.min(ww - 96, desiredMageX));
        const kiteSpeed = distToFoe < 165 ? 4.8 : 3.5;
        comp.x += (desiredMageX - comp.x) * Math.min(1, dt * kiteSpeed);
        comp.y = this.groundY - 14 - Math.sin(comp.hoverPhase) * 6;
        comp.facing = foeX >= comp.x ? 1 : -1;

        if (primaryFoe && !primaryFoe.isDead) {
          const haste = comp.soulEmpoweredTimer > 0 ? 1.25 : 1.0;
          comp.castCooldown -= dt * haste;
          if (comp.castCooldown <= 0) {
            comp.castCooldown = comp.castInterval;
            comp.castAnimTimer = 0.62;
            comp.didCastShot = false;
          }
          if (comp.castAnimTimer > 0) {
            comp.castAnimTimer = Math.max(0, comp.castAnimTimer - dt);
            if (comp.castAnimTimer <= 0.36 && !comp.didCastShot) {
              comp.didCastShot = true;
              const isEmp = comp.soulEmpoweredTimer > 0;
              const muzzleX = comp.x + comp.facing * 32;
              const muzzleY = comp.y - 88;

              this.fx?.spawn('darkMageVoidCastSigil', muzzleX, muzzleY, {
                light: isEmp ? 1.38 : 1.26,
                extra: { isEmpowered: isEmp }
              });

              const dx = primaryFoe.x - muzzleX;
              const dy = primaryFoe.y - 98 - muzzleY;
              const dist = Math.hypot(dx, dy) || 1;
              const speed = isEmp ? 580 : 540;

              this.darkMagicOrbs.push({
                x: muzzleX,
                y: muzzleY,
                vx: (dx / dist) * speed,
                vy: (dy / dist) * speed - 42,
                speed,
                target: primaryFoe,
                age: 0,
                maxLife: 1.70,
                damage: isEmp ? 22 : 16,
                isEmpowered: isEmp,
                trailTimer: 0
              });
              if (game?.audio) game.audio.play('soul_drain', comp.x);
            }
          }
        }
      } else {
        const anchorUnit = mage && !mage.isDead ? mage : this;
        const foeX = primaryFoe ? primaryFoe.x : anchorUnit.x + anchorUnit.facing * 200;
        const retreatSign = anchorUnit.x <= foeX ? -1 : 1;
        let desiredHealerX = anchorUnit.x + retreatSign * 84;
        if (desiredHealerX < 84 || desiredHealerX > ww - 84) {
          desiredHealerX = anchorUnit.x - retreatSign * 86;
        }
        desiredHealerX = Math.max(84, Math.min(ww - 84, desiredHealerX));
        comp.x += (desiredHealerX - comp.x) * Math.min(1, dt * 3.9);
        comp.y = this.groundY - 18 - Math.sin(comp.hoverPhase) * 7;
        comp.facing = anchorUnit.x >= comp.x ? 1 : -1;

        comp.healCooldown -= dt;
        if (comp.healCooldown <= 0) {
          comp.healCooldown = comp.healInterval;
          comp.castAnimTimer = 0.66;
          comp.didHealPulse = false;
        }
        if (comp.castAnimTimer > 0) {
          comp.castAnimTimer = Math.max(0, comp.castAnimTimer - dt);
          if (comp.castAnimTimer <= 0.38 && !comp.didHealPulse) {
            comp.didHealPulse = true;
            const srcX = comp.x + comp.facing * 20;
            const srcY = comp.y - 86;

            comp.hp = Math.min(comp.maxHp, comp.hp + 34);
            comp.shield = Math.min(comp.maxShield || 65, (comp.shield || 0) + 14);

            if (!this.isDead && this.hp < this.maxHp) {
              this.hp = Math.min(this.maxHp, this.hp + 10);
            }

            if (mage && !mage.isDead) {
              this.fx?.spawn('necroHealerSoulTether', srcX, srcY, {
                palette: NECRO_SOUL_EMERALD_PALETTE,
                light: 1.34,
                extra: { dx: mage.x - srcX, dy: mage.y - 86 - srcY }
              });
              this.fx?.spawn('necroHealerMendHalo', mage.x, mage.groundY - 4, {
                palette: NECRO_SOUL_EMERALD_PALETTE,
                light: 1.32
              });

              const missingMage = mage.maxHp - mage.hp;
              const restored = Math.min(missingMage, 92);
              mage.hp = Math.min(mage.maxHp, mage.hp + 92);
              mage.soulEmpoweredTimer = 2.65;

              if (restored >= 20) {
                mage.shield = Math.min(mage.maxShield || 75, (mage.shield || 0) + 20);
                if (game?.vfx) {
                  game.vfx.spawnDamageText(
                    mage.x,
                    mage.y - 144,
                    0,
                    false,
                    `MAGE MEND +${Math.round(restored)}`,
                    '#6ee7b7'
                  );
                }
              } else {
                mage.shield = Math.min(mage.maxShield || 75, (mage.shield || 0) + 35);
                if (game?.vfx) {
                  game.vfx.spawnDamageText(
                    mage.x,
                    mage.y - 144,
                    0,
                    false,
                    'SOUL WARD + DARK COVENANT!',
                    '#67e8f9'
                  );
                }
              }
            } else {
              this.fx?.spawn('necroHealerMendHalo', comp.x, comp.groundY - 4, {
                palette: NECRO_SOUL_EMERALD_PALETTE,
                light: 1.28
              });
              comp.hp = Math.min(comp.maxHp, comp.hp + 32);
              if (!this.isDead && this.hp < this.maxHp) {
                this.heal(22, 'COVENANT GRACE');
              } else if (game?.vfx) {
                game.vfx.spawnDamageText(comp.x, comp.y - 144, 0, false, 'WARD MEND +68', '#6ee7b7');
              }
            }
          }
        }
      }
    }
  }

  /**
   * CROUCH: "ABYSSAL SHADOW BURROW & SURPRISE AMBUSH" (`1.72s` total / `1.26s` 100% underground!)
   */
  startCrouch(enemy, game) {
    this.crouchCooldown = 9.40;
    this.crouchDuration = 1.72;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isSubmerged = true;
    this.isFullyBurrowed = false;
    this.submergeDepth = 0;
    this.burrowShaderTimer = 0;
    this.burrowWarned = false;
    this.burrowTrailNodes = [];
    this.didActionFrame = false;
    this.submergeDir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
    this.facing = this.submergeDir;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;

    this.fx?.spawn('abyssalShadowBurrowPool', this.x, this.groundY - 2, {
      light: 1.18,
      extra: {
        radius: 36,
        facing: this.facing,
        isWarning: false,
        progress: 0.05
      }
    });
    if (game?.audio) game.audio.play('soul_drain', this.x);
    if (game?.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 18, 3, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 134, 0, false, 'SHADOW BURROW!', '#c084fc');
    }
  }

  onStartDash(_enemy, game, dir) {
    this.isFlipVault = false;
    this.dashDuration = 0.38;
    this.isDeflecting = true;
    this.isSubmerged = false;
    this.isFullyBurrowed = false;
    this.submergeDepth = 0;
    this.isWraithPhase = false;
    this.dashDir = dir || this.facing;
    this.vx = this.dashDir * 505;
    this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY - 4, {
      follow: this,
      offsetX: 0,
      offsetY: -4,
      useGroundY: true,
      maxDuration: 0.36,
      light: 1.24,
      extra: { radius: 24, isSubmerged: false }
    });
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'WRAITH STEP!', '#d946ef');
    }
  }

  onStartDodge(enemy, game, dir, forceJump = false) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 0;
    const nearWall = this.x < 280 || this.x > ww - 280;

    if (forceJump || (nearWall && dist < 265)) {
      this.isFlipVault = true;
      this.isWraithPhase = false;
      this.isSubmerged = false;
      this.isFullyBurrowed = false;
      this.submergeDepth = 0;
      this.wraithAlpha = 0.52;
      this.flipStartX = this.x;
      this.wallFlipCooldown = 3.1;
      this.dashDuration = 0.62;

      if (enemy && !enemy.isDead) {
        const approachSide = this.x < enemy.x ? -96 : 96;
        const target = nearWall
          ? enemy.x + (enemy.x < ww * 0.5 ? 210 : -210)
          : enemy.x + approachSide;
        this.flipTargetX = Math.max(125, Math.min(ww - 125, target));
        this.dashDir = Math.sign(this.flipTargetX - this.flipStartX) || dir;
      } else {
        this.flipTargetX = Math.max(125, Math.min(ww - 125, this.x + dir * 270));
        this.dashDir = dir;
      }

      this.vx = 0;
      this.vy = 0;
      this.fx?.spawn('abyssalWraithMantle', this.x, this.y - 44, {
        follow: this,
        offsetX: 0,
        offsetY: -44,
        maxDuration: 0.56,
        light: 1.26,
        extra: { radius: 26, isSubmerged: false, isCrimson: true }
      });
      if (game?.audio) game.audio.play('blink', this.x);
      if (game?.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, "REAPER'S GLIDE!", '#e879f9');
      }
      return;
    }

    if (enemy && !enemy.isDead && dist <= 235 && this.crouchCooldown <= 0) {
      this.startCrouch(enemy, game);
      return;
    }

    if (enemy && !enemy.isDead && dist <= 235) {
      this.isFlipVault = false;
      this.isWraithPhase = true;
      this.isSubmerged = false;
      this.isFullyBurrowed = false;
      this.submergeDepth = 0;
      this.wraithAlpha = 0.42;
      this.dashDuration = 0.32;
      this.isDeflecting = true;
      this.phaseStartX = this.x;
      const passDir = Math.sign(enemy.x - this.x) || this.facing;
      let flankX = enemy.x - passDir * 136;
      if (flankX < 105 || flankX > ww - 105) {
        flankX = enemy.x + passDir * 146;
      }
      this.phaseTargetX = Math.max(95, Math.min(ww - 95, flankX));
      this.dashDir = Math.sign(this.phaseTargetX - this.phaseStartX) || -passDir;
      this.vx = 0;
      this.gainSoulStack(1);
      this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY - 4, {
        follow: this,
        offsetX: 0,
        offsetY: -4,
        useGroundY: true,
        maxDuration: 0.32,
        light: 1.26,
        extra: { radius: 26, isSubmerged: false, isCrimson: true }
      });
      if (game?.audio) game.audio.play('blink', this.x);
      if (game?.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'WRAITH PHASE!', '#e879f9');
      }
      return;
    }

    this.isFlipVault = false;
    this.isWraithPhase = false;
    this.isSubmerged = false;
    this.isFullyBurrowed = false;
    this.submergeDepth = 0;
    this.dashDuration = 0.36;
    this.isDeflecting = true;
    const smartDir = enemy && dist > 195 ? this.facing : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 455;
    this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY - 4, {
      follow: this,
      offsetX: 0,
      offsetY: -4,
      useGroundY: true,
      maxDuration: 0.34,
      light: 1.22,
      extra: { radius: 24, isSubmerged: false }
    });
    if (game?.audio) game.audio.play('soul_drain', this.x);
    if (game?.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'SHADOW VEIL!', '#e879f9');
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    if ((this.state === 'DODGE' || this.state === 'JUMP') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const ease = 0.5 - 0.5 * Math.cos(u * Math.PI);
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * ease;

      let liftFrac = 0;
      if (u < 0.25) {
        liftFrac = Math.sin((u / 0.25) * (Math.PI * 0.5));
      } else if (u <= 0.62) {
        liftFrac = 1.0 + Math.sin(((u - 0.25) / 0.37) * Math.PI) * 0.12;
      } else {
        const p = (u - 0.62) / 0.38;
        liftFrac = Math.max(0, 1 - Math.pow(p, 2.2));
      }
      this.y = this.groundY - liftFrac * 96;
      this.wraithAlpha = u < 0.58 ? 0.52 : 0.98;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (u < 0.60 && Math.random() < 0.16) {
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 29)), 0.18);
      }

      if (u >= 0.58 && !this.didActionFrame) {
        this.didActionFrame = true;
        const cx = this.x + this.facing * 72;
        const cy = this.y - 84;

        this.fx?.spawn('soulHarvestScytheArc', cx, cy, {
          flip: this.facing < 0,
          light: 1.40,
          extra: { radiusWorld: 152, isCrimson: true, isCross: true, isUppercut: false }
        });
        this.spawnGroundedBoneSpire(cx, 196, 0.44, {
          flipX: this.facing < 0,
          glowColor: 'crimson',
          inFront: false
        });

        const missingRatio =
          enemy && !enemy.isDead && enemy.maxHp > 0
            ? Math.max(0, Math.min(1, 1 - enemy.hp / enemy.maxHp))
            : 0;
        const execDmg = Math.round(42 + missingRatio * 30);
        const landed = this._applyThanatosReap(enemy, game, {
          damage: execDmg,
          reachFront: 224,
          hitStop: 0.048,
          shakeDur: 0.068,
          knockX: -this.facing * 65,
          knockY: -145,
          leech: 11,
          gainSoul: 1,
          isCrit: true,
          isCrimson: true,
          scarDx: 118,
          scarDy: 96,
          sfx: 'scythe_reap'
        });
        if (landed && game?.vfx && enemy) {
          game.vfx.spawnDamageText(enemy.x, enemy.y - 156, 0, false, 'FALLING GUILLOTINE!', '#f43f5e');
          game?.renderer?.triggerShake?.(12, 0.24);
        }
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.wraithAlpha = 1.0;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    if (this.state === 'DODGE' && this.isWraithPhase) {
      const p = Math.min(1, t / this.dashDuration);
      const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
      this.x = this.phaseStartX + (this.phaseTargetX - this.phaseStartX) * ease;
      if (enemy) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      if (Math.random() < 0.18) {
        this.spawnAfterimage(this.x, this.groundY, this.facing, 6, 12, 0.16);
      }

      if (t >= this.dashDuration) {
        this.isWraithPhase = false;
        this.isSubmerged = false;
        this.isFullyBurrowed = false;
        this.submergeDepth = 0;
        this.wraithAlpha = 1.0;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const dir = this.dashDir || this.facing;
    const distToEnemy = enemy && !enemy.isDead ? (enemy.x - this.x) * dir : 999;
    if (this.state === 'DASH' && distToEnemy <= 118 && distToEnemy >= 68) {
      this.vx = 0;
    } else {
      const speed = this.state === 'DASH' ? 505 : 435;
      this.x = this._clampArenaX(this.x + dir * speed * dt, game);
    }

    if (Math.random() < 0.16) {
      this.spawnAfterimage(this.x, this.groundY, this.facing, 6, 14, 0.16);
    }

    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 185
    ) {
      this._applyThanatosReap(enemy, game, {
        damage: 34,
        reachFront: 196,
        hitStop: 0.045,
        shakeDur: 0.058,
        knockX: -54,
        knockY: -56,
        leech: 9,
        gainSoul: 1,
        isCrit: false,
        isCrimson: false,
        scarDx: 108,
        scarDy: 64,
        sfx: 'scythe_reap'
      });
      this.fx?.spawn('soulHarvestScytheArc', this.x + this.facing * 64, this.y - 96, {
        flip: this.facing < 0,
        light: 1.28,
        extra: { radiusWorld: 136, isCrimson: false, isUppercut: false }
      });
    }

    if (t >= this.dashDuration) {
      this.vx = 0;
      this.isDeflecting = false;
      this.isSubmerged = false;
      this.isFullyBurrowed = false;
      this.submergeDepth = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * CROUCH UPDATE: "ABYSSAL SHADOW BURROW & SURPRISE AMBUSH" (`1.72s` total / `1.26s` 100% underground!)
   */
  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 1.72;
    const sinkEnd = 0.22;
    const eruptAt = 1.48;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    if (t < eruptAt) {
      this.isCrouching = true;
      this.isSubmerged = true;
      this.isDeflecting = true;
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;

      if (t < sinkEnd) {
        this.submergeDepth = Math.min(1, t / sinkEnd);
        this.isFullyBurrowed = false;
        this.isInvulnerable = t >= 0.08;
      } else {
        this.submergeDepth = 1.0;
        this.isFullyBurrowed = true;
        this.isInvulnerable = true;
      }

      if (enemy && !enemy.isDead) {
        let desiredX = enemy.x - this.submergeDir * 98;
        if (desiredX < 96 || desiredX > ww - 96) {
          desiredX = enemy.x + this.submergeDir * 98;
        }
        desiredX = Math.max(92, Math.min(ww - 92, desiredX));
        const delta = desiredX - this.x;
        if (Math.abs(delta) > 4) {
          const slideSpeed = Math.min(355, Math.max(165, Math.abs(delta) * 3.4));
          this.x += Math.sign(delta) * Math.min(Math.abs(delta), slideSpeed * dt);
        }
        this.facing = enemy.x >= this.x ? 1 : -1;
      } else {
        this.x += this.submergeDir * 255 * dt;
      }
      this.x = Math.max(90, Math.min(ww - 90, this.x));

      const isWarning = t >= 1.08;
      if (isWarning && !this.burrowWarned) {
        this.burrowWarned = true;
        if (game?.audio) game.audio.play('chain_hook', this.x);
        if (game?.vfx) {
          game.vfx.spawnDamageText(this.x, this.groundY - 56, 0, false, 'SHADOW LOCK!', '#f43f5e');
        }
      }

      this.burrowShaderTimer -= dt;
      if (this.burrowShaderTimer <= 0) {
        this.burrowShaderTimer = isWarning ? 0.09 : 0.11;
        this.fx?.spawn('abyssalShadowBurrowPool', this.x, this.groundY - 2, {
          light: isWarning ? 1.32 : 1.12,
          extra: {
            radius: isWarning ? 38 : 34,
            facing: this.facing,
            isWarning,
            progress: t / eruptAt
          }
        });
        this.burrowTrailNodes.push({
          x: this.x,
          y: this.groundY,
          age: 0,
          maxLife: 0.42,
          rx: 26 + (this.burrowTrailNodes.length % 3) * 5
        });
        if (this.burrowTrailNodes.length > 10) {
          this.burrowTrailNodes.shift();
        }
      }
    } else if (!this.didActionFrame) {
      this.didActionFrame = true;
      this.isFullyBurrowed = false;
      this.isSubmerged = false;
      this.isInvulnerable = false;
      this.submergeDepth = 0;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      if (game?.audio) {
        game.audio.play('scythe_reap', this.x);
        game.audio.play('reaper_ult', this.x);
      }
      game?.renderer?.triggerShake?.(18, 0.30);

      const eruptX = this.x + this.facing * 68;
      const eruptY = this.groundY - 98;

      this.fx?.spawn('abyssalShadowEruptionPillar', this.x, this.groundY - 2, {
        light: 1.44,
        extra: { facing: this.facing }
      });
      this.fx?.spawn('soulHarvestScytheArc', eruptX, eruptY, {
        flip: this.facing < 0,
        light: 1.44,
        extra: { radiusWorld: 162, isCrimson: true, isCross: true, isUppercut: true }
      });
      this.spawnGroundedBoneSpire(eruptX, 220, 0.54, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: false
      });
      if (game?.vfx) {
        game.vfx.spawnGlyphBurst(eruptX, eruptY, 10, 'abyssal');
        game.vfx.spawnDamageText(this.x, this.groundY - 168, 0, true, 'SURPRISE ATTACK!', '#f43f5e');
      }

      this.graveWardTimer = Math.max(this.graveWardTimer || 0, 1.45);
      this._applyThanatosReap(enemy, game, {
        damage: 64,
        reachFront: 232,
        hitStop: 0.056,
        shakeDur: 0.082,
        knockX: -this.facing * 56,
        knockY: -210,
        leech: 13,
        gainSoul: 1,
        isCrit: true,
        isCrimson: true,
        scarDx: 124,
        scarDy: -116,
        sfx: 'scythe_reap'
      });
    } else {
      const uRise = Math.min(1, Math.max(0, (t - eruptAt) / Math.max(0.08, dur - eruptAt)));
      this.y = this.groundY - Math.sin(uRise * Math.PI) * 44;
      this.submergeDepth = 0;
      this.isFullyBurrowed = false;
      this.isSubmerged = false;
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.isCrouching = false;
      this.isFullyBurrowed = false;
      this.isSubmerged = false;
      this.submergeDepth = 0;
      this.isInvulnerable = false;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  /**
   * 4-BEAT NEXT-GEN GROUNDED FRONT-REAPING JUGGERNAUT (`Row 2 [[60,8],[68,7],[75,8],[83,7]]`):
   * - `0` chaotic cross-through spam; crisp pre-snap lunge -> hard-locked `vx = 0` planted boots!
   * - `0.015s` intra-combo link (`V0 -> V1 -> V2 -> V3`) with ZERO return to `IDLE`!
   * - `V0 (F03)`: 1-frame snap wide downward reaping crescent smear (`46ms` hit-stop + Soul-Wave when >155px).
   * - `V1 (F09)`: Reverse rising Soul-Ripper hook smear (`48ms` hit-stop + inward hook drag & pop).
   * - `V2 (F17/F18)`: 2.5D horizontal Thanatos vortex reap (`2-hit` `45ms+48ms` hit-stop + Thanatos Stand + Soul-Disc).
   * - `V3 (F25)`: Airborne leap -> towering Guillotine Bone-Obelisk slam (`3-hit` + `'phantom_scythe'` + `60ms` hit-stop!).
   */
  updateAutoAttack(dt, enemy, game) {
    this._currentEnemy = enemy;
    this._comboPersistTimer = 0.76;

    if (this._intraLinkTimer > 0) {
      this._intraLinkTimer = Math.max(0, this._intraLinkTimer - dt);
      this.vx = 0;
      this.vy = 0;
      if (this._intraLinkTimer <= 0) {
        this._beginComboBeat(this.comboStep, game);
        this._aiComboCount = (this._aiComboCount || 0) + 1;
        this._aiComboChainTimer = 0.94;
      }
      return;
    }

    const v = this._autoVariant;
    const dur = this.autoDuration || BEAT_DURATIONS[v];
    const t = this.stateTimer;
    const [sliceStart, sliceLen] = AUTO_SLICES_EX[v];

    // Snap times aligned to exact Row 2 art frames: V0->F03(0.10s), V1->F09(0.06s), V2->F17(0.08s), V3->F25(0.16s)
    const snapT = v === 0 ? 0.10 : v === 1 ? 0.06 : v === 2 ? 0.08 : 0.16;

    let localStep = 0;
    if (v === 0) {
      if (t < 0.10) localStep = Math.min(2, Math.floor((t / 0.10) * 3));
      else if (t < 0.155) localStep = 3;
      else if (t < 0.26) localStep = 4 + Math.min(1, Math.floor(((t - 0.155) / 0.105) * 2));
      else localStep = 6 + Math.min(1, Math.floor(((t - 0.26) / 0.12) * 2));
    } else if (v === 1) {
      if (t < 0.06) localStep = 0;
      else if (t < 0.12) localStep = 1;
      else if (t < 0.22) localStep = 2 + Math.min(1, Math.floor(((t - 0.12) / 0.10) * 2));
      else localStep = 4 + Math.min(2, Math.floor(((t - 0.22) / 0.14) * 3));
    } else if (v === 2) {
      if (t < 0.08) localStep = Math.min(1, Math.floor((t / 0.08) * 2));
      else if (t < 0.14) localStep = 2;
      else if (t < 0.20) localStep = 3;
      else localStep = 4 + Math.min(3, Math.floor(((t - 0.20) / 0.20) * 4));
    } else {
      if (t < 0.16) localStep = Math.min(1, Math.floor((t / 0.16) * 2));
      else if (t < 0.245) localStep = 2;
      else localStep = 3 + Math.min(3, Math.floor(((t - 0.245) / 0.295) * 4));
    }
    const frameIdx = sliceStart + Math.min(sliceLen - 1, Math.max(0, localStep));
    this.trueUltFrameOverride = frameIdx;
    this._overrideFrameIdx = frameIdx;

    // 1. Grounded Impulse-Then-Plant Footwork (0 Cross-Through Spam, 0 Ice-Skating!)
    this.vx = 0;
    if (t < snapT) {
      const lungeU = Math.min(1, Math.max(0, t / snapT));
      const eased = 1 - Math.pow(1 - lungeU, 2.2);
      this.x = this._beatStartX + (this._beatTargetX - this._beatStartX) * eased;

      if (v === 2 && !this.thanatosStand) {
        this.spawnThanatosStand(0.64, 276);
      }

      if (v === 0 && Math.abs(this._beatTargetX - this._beatStartX) > 26) {
        this._dragSparkAcc += dt;
        if (this._dragSparkAcc >= 0.034) {
          this._dragSparkAcc = 0;
          this.spawnAfterimage(this.x, this.y, this.facing, 2, localStep, 0.16);
          this.fx?.burst(this.x - this.facing * 36, this.groundY - 2, {
            count: 3,
            speedMin: 30,
            speedMax: 88,
            lifeMin: 0.10,
            lifeMax: 0.22,
            gravity: 65,
            colors: ['#fdf4ff', '#f43f5e', '#c084fc']
          });
        }
      }
    } else if (!this._bootsPlanted) {
      this._bootsPlanted = true;
      this.x = this._beatTargetX;
      this.vx = 0;
    }

    // Airborne leap arc on Beat 4 (V3: leaps F23..F24 up to 62px, slams onto groundY at F25 t = 0.16s!)
    if (v === 3) {
      if (t < 0.16) {
        const airU = t / 0.16;
        this.y = this.groundY - Math.sin(airU * Math.PI * 0.86) * 62;
        this.vy = 0;
      } else {
        this.y = this.groundY;
        this.vy = 0;
      }
    } else {
      this.y = this.groundY;
      this.vy = 0;
    }

    // 2. Beat-Specific Serrated Scythe Smear Impacts & 45-60ms Crunchy Hit-Stop
    if (v === 0) {
      // V0 (F03): Wide Downward Reaping Crescent Smear (46ms hit-stop + mid-range Crescent Soul-Wave)
      if ((this._beatHitMask & 1) === 0 && t >= 0.10) {
        this._beatHitMask |= 1;
        const cx = this.x + this.facing * 78;
        this.fx?.spawn('soulHarvestScytheArc', cx, this.y - 94, {
          flip: this.facing < 0,
          light: 1.32,
          extra: { radiusWorld: 148, isCrimson: this.soulStacks >= 5, isCross: false, isUppercut: false }
        });
        const distToFoe = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
        if (distToFoe > 155) {
          this.spawnCrescentScytheWave();
        }
        this._applyThanatosReap(enemy, game, {
          damage: 44,
          reachFront: 232,
          hitStop: 0.046,
          shakeDur: 0.062,
          knockX: -36,
          knockY: -22,
          inwardDrag: 16,
          leech: 4,
          gainSoul: 1,
          isCrit: false,
          isCrimson: false,
          scarDx: 120,
          scarDy: 92,
          sfx: 'scythe_reap'
        });
      }
    } else if (v === 1) {
      // V1 (F09): Reverse Rising Soul-Ripper Hook Smear (48ms hit-stop + skeletal hook-chain drag & pop)
      if ((this._beatHitMask & 1) === 0 && t >= 0.06) {
        this._beatHitMask |= 1;
        const cx = this.x + this.facing * 82;
        const chainOriginX = this.x + this.facing * 42;
        const chainOriginY = this.y - 96;
        const hasNearFoe = enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 245;
        this.fx?.spawn('skeletalChainTetherBeam', chainOriginX, chainOriginY, {
          light: 1.30,
          extra: {
            dx: hasNearFoe ? enemy.x - chainOriginX : this.facing * 148,
            dy: hasNearFoe ? enemy.y - 96 - chainOriginY : 4,
            arcH: 10,
            isCrimson: true,
            showClaw: true,
            customDuration: 0.26
          }
        });
        this.fx?.spawn('soulHarvestScytheArc', cx, this.y - 100, {
          flip: this.facing < 0,
          light: 1.36,
          extra: { radiusWorld: 152, isCrimson: true, isCross: false, isUppercut: true }
        });
        this._applyThanatosReap(enemy, game, {
          damage: 48,
          reachFront: 236,
          hitStop: 0.048,
          shakeDur: 0.066,
          knockX: -44,
          knockY: -124,
          inwardDrag: 24,
          leech: 4,
          gainSoul: 1,
          isCrit: false,
          isCrimson: true,
          scarDx: 118,
          scarDy: -98,
          sfx: 'chain_hook'
        });
      }
    } else if (v === 2) {
      // V2 (F17 & F18): 2.5D Horizontal Thanatos Vortex Reap -> 2-Hit Rapid Cross-Reap (45ms + 48ms hit-stop)!
      if ((this._beatHitMask & 1) === 0 && t >= 0.08) {
        this._beatHitMask |= 1;
        const cx = this.x + this.facing * 82;
        this.spawnThanatosStand(0.58, 282);
        this.spawnBoomerangScythe();
        this.fx?.spawn('soulHarvestScytheArc', cx, this.y - 92, {
          flip: this.facing < 0,
          light: 1.42,
          extra: { radiusWorld: 158, isCrimson: false, isCross: true, isUppercut: false }
        });
        this._applyThanatosReap(enemy, game, {
          damage: 28,
          reachFront: 238,
          hitStop: 0.045,
          shakeDur: 0.060,
          knockX: -28,
          knockY: -36,
          inwardDrag: 14,
          leech: 3,
          gainSoul: 1,
          isCrit: true,
          isCrimson: false,
          scarDx: 128,
          scarDy: 34,
          sfx: 'scythe_reap'
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.14) {
        this._beatHitMask |= 2;
        const empowered = this.soulStacks >= 5;
        if (empowered) {
          this.consumeSoulStacks(2);
          if (game?.vfx && enemy) {
            game.vfx.spawnDamageText(enemy.x, enemy.y - 172, 0, false, 'CRIMSON REAP!', '#f43f5e');
          }
        }
        const cx = this.x + this.facing * 86;
        this.fx?.spawn('soulHarvestScytheArc', cx, this.y - 96, {
          flip: this.facing > 0,
          light: 1.44,
          extra: { radiusWorld: 162, isCrimson: true, isCross: true, isUppercut: false }
        });
        if (game?.vfx) {
          game.vfx.spawnDamageText(this.x, this.y - 150, 0, false, 'THANATOS CROSS-REAP!', '#e879f9');
        }
        this._applyThanatosReap(enemy, game, {
          damage: empowered ? 42 : 30,
          reachFront: 240,
          hitStop: 0.048,
          shakeDur: 0.064,
          knockX: -36,
          knockY: -62,
          inwardDrag: 14,
          leech: empowered ? 5 : 3,
          gainSoul: 0,
          isCrit: true,
          isCrimson: true,
          scarDx: 128,
          scarDy: -38,
          sfx: 'soul_drain'
        });
      }
    } else {
      // V3 (F25): Airborne Leap -> Towering Guillotine Bone-Obelisk Slam (3-Hit + phantom_scythe + 60ms Hit-Stop!)
      if ((this._beatHitMask & 1) === 0 && t >= 0.16) {
        this._beatHitMask |= 1;
        const slamX =
          enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 242
            ? enemy.x
            : this.x + this.facing * 108;
        game?.renderer?.triggerShake?.(13, 0.24);
        if (game?.audio) game.audio.play('heavy_cleave', slamX);

        this.fx?.spawn('companionSummonRiftPortal', slamX, this.groundY - 4, {
          palette: BLOOD_MOON_CRIMSON_PALETTE,
          light: 1.38,
          extra: { radius: 34, isCrimson: true, customDuration: 0.48 }
        });
        this.fx?.spawn('abyssalShadowEruptionPillar', slamX, this.groundY - 6, {
          palette: BLOOD_MOON_CRIMSON_PALETTE,
          light: 1.36,
          extra: { width: 24, height: 66, isCrimson: true, customDuration: 0.44 }
        });
        this.spawnGroundedBoneSpire(slamX, 224, 0.58, {
          flipX: this.facing < 0,
          glowColor: 'crimson',
          inFront: false
        });
        if (game?.vfx) {
          game.vfx.spawnDamageText(slamX, this.groundY - 164, 0, true, 'GUILLOTINE SLAM!', '#f43f5e');
        }

        this._applyThanatosReap(enemy, game, {
          damage: 28,
          reachFront: 244,
          hitStop: 0.060,
          shakeDur: 0.088,
          knockX: 32,
          knockY: -45,
          leech: 3,
          gainSoul: 1,
          isCrit: true,
          isCrimson: true,
          scarDx: 28,
          scarDy: 142,
          sfx: 'scythe_reap'
        });

        this.firePhantomScythe(game, {
          x: slamX,
          y: this.groundY - 80,
          damage: 24,
          speed: 680,
          maxRange: 440
        });
      }
      if ((this._beatHitMask & 2) === 0 && t >= 0.21) {
        this._beatHitMask |= 2;
        this._applyThanatosReap(enemy, game, {
          damage: 18,
          reachFront: 246,
          hitStop: 0,
          shakeDur: 0.048,
          knockX: 28,
          knockY: -36,
          leech: 2,
          gainSoul: 0,
          isCrit: false,
          isCrimson: false,
          scarDx: 102,
          scarDy: 84,
          sfx: 'soul_drain'
        });
      }
      if ((this._beatHitMask & 4) === 0 && t >= 0.26) {
        this._beatHitMask |= 4;
        this._applyThanatosReap(enemy, game, {
          damage: 24,
          reachFront: 248,
          hitStop: 0,
          shakeDur: 0.058,
          knockX: 94,
          knockY: -92,
          leech: 3,
          gainSoul: 0,
          isCrit: true,
          isCrimson: true,
          scarDx: 106,
          scarDy: -88,
          sfx: 'scythe_reap'
        });
      }
    }

    // 3. Seamless Direct Beat Chaining (0.015s link, ZERO return to IDLE!)
    if (t >= dur) {
      this.y = this.groundY;
      this.vx = 0;
      const isManualPlayer = Boolean(
        (this.isPlayerControlled && !this.adventureAutoPlay) || this.isManualAdventureControl
      );
      const advHoldingAttack = Boolean(
        game?.isAdventureMode?.() &&
          (game?.adventure?.heldAttack ||
            game?.adventure?.uiHeldAttack ||
            game?.adventure?.queuedAction === 'attack' ||
            this._queuedNextBeat)
      );
      const aiWantsChain =
        !isManualPlayer &&
        enemy &&
        !enemy.isDead &&
        !enemy.isInvulnerable &&
        Math.abs(enemy.x - this.x) <= 260;

      if (v < 3 && (aiWantsChain || advHoldingAttack)) {
        if (game?.adventure?.queuedAction === 'attack') {
          game.adventure.queuedAction = null;
        }
        this._intraLinkTimer = INTRA_COMBO_LINK;
        return;
      }

      if (v === 3) {
        this.comboStep = 0;
        this._aiComboReadyFinisher = 0.92;
        this._aiOutstepTimer = 0.22;
        this._aiOutstepDir = -1;
        this.autoCooldown = isManualPlayer ? 0.06 : this._postFlurryInterval * (0.92 + Math.random() * 0.16);
      } else {
        this.autoCooldown = 0.015;
      }

      this.unstoppablePoise = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.setState('IDLE');
    }
  }

  /**
   * SIGNATURE SKILL (`4.80s CD`): "SOUL SEVER"
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    if (t < 0.08) {
      this.didChainPull = false;
      this.didReapFinisher = false;
      this.torsoAngle = -this.facing * 0.18;
      this.isDeflecting = enemy ? Math.abs(enemy.x - this.x) > 190 : false;
    } else if (t < 0.46) {
      if (!this.didChainPull) {
        this.didChainPull = true;
        if (game?.audio) game.audio.play('chain_hook', this.x);

        const maxHookDist = 460;
        const rawTargetX = enemy ? enemy.x : this.x + this.facing * 340;
        const clampedDx = Math.max(-maxHookDist, Math.min(maxHookDist, rawTargetX - this.x));
        const targetX = this.x + clampedDx;
        const targetY = enemy ? enemy.y - 96 : this.y - 96;

        this.fx?.spawn('skeletalChainTetherBeam', this.x + this.facing * 56, this.y - 96, {
          light: 1.38,
          extra: {
            dx: targetX - (this.x + this.facing * 56),
            dy: targetY - (this.y - 96),
            arcH: 10,
            isCrimson: true,
            showClaw: true,
            customDuration: 0.38
          }
        });
        this.spawnVfxAnim(6, targetX, targetY, 196, 196, 0.36, {
          glowColor: 'crimson',
          inFront: false
        });
        if (game?.vfx) game.vfx.spawnGlyphBurst(targetX, targetY, 8, 'abyssal');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= maxHookDist + 30) {
          enemy.takeDamage(40, this, !enemy.hasPoise, -165, -32);
          this.gainSoulStack(1);
          const effigyX = Math.max(105, Math.min(ww - 105, this.x + this.facing * 124));
          this.spawnSeveredSoulEffigy(enemy, effigyX, game);
          if (game?.vfx) {
            game.vfx.spawnDamageText(enemy.x, enemy.y - 156, 0, false, 'SOUL SEVERED!', '#d946ef');
          }
          game?.renderer?.triggerShake?.(11, 0.22);
        }
      }

      if (enemy && !enemy.isDead && !enemy.isColossalBoss && Math.abs(enemy.x - this.x) <= 480) {
        if (Math.abs(enemy.x - this.x) > 140) {
          this.x = this._clampArenaX(this.x + this.facing * 135 * dt, game);
        }
        const desiredX = Math.max(95, Math.min(ww - 95, this.x + this.facing * 122));
        enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 6.0);
        if (this.severedSoul) this.severedSoul.x = desiredX;
        if (this.boneCage) this.boneCage.x = desiredX;
      }
    } else if (!this.didReapFinisher) {
      this.didReapFinisher = true;
      this.isDeflecting = false;
      if (game?.audio) {
        game.audio.play('scythe_reap', this.x);
        game.audio.play('soul_drain', this.x);
      }
      game?.renderer?.triggerShake?.(16, 0.30);

      const prevX = this.x;
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 285) {
        const lungeX = enemy.x - this.facing * 112;
        this.x = this._clampArenaX(lungeX, game);
        this.spawnAfterimage(prevX, this.groundY, this.facing, 3, 14, 0.24);
      }

      const reapX =
        enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 255
          ? enemy.x
          : this.severedSoul
            ? this.severedSoul.x
            : this.x + this.facing * 118;

      this.spawnThanatosStand(0.50, 268);
      this.fx?.spawn('soulHarvestScytheArc', reapX, this.y - 98, {
        flip: this.facing < 0,
        light: 1.44,
        extra: { radiusWorld: 164, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(4, reapX, this.y - 98, 224, 224, 0.38, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: true
      });
      this.spawnGroundedBoneSpire(reapX, 212, 0.62, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: false
      });

      if (game?.vfx) game.vfx.spawnGlyphBurst(reapX, this.y - 98, 9, 'abyssal');

      const consumedSouls = this.consumeSoulStacks(3);
      const bonusDmg = consumedSouls * 10;
      const bonusHeal = consumedSouls * 3;

      const landed = this._applyThanatosReap(enemy, game, {
        damage: 78 + bonusDmg,
        reachFront: 256,
        hitStop: 0.056,
        shakeDur: 0.084,
        knockX: -36,
        knockY: -125,
        leech: 11 + bonusHeal,
        gainSoul: 0,
        isCrit: true,
        isCrimson: true,
        scarDx: 138,
        scarDy: 108,
        sfx: 'scythe_reap'
      });
      if (landed && consumedSouls > 0 && game?.vfx) {
        game.vfx.spawnDamageText(this.x, this.y - 168, 0, true, `SOUL SNAP x${consumedSouls}!`, '#f43f5e');
      }
    } else if (t >= (this.skillDuration || 0.96)) {
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  spawnWraithTrail(fromX, fromY, toX, toY, facing, count = 5, row = 4) {
    const cols = [8, 12, 16, 20, 24];
    for (let i = 0; i < count; i++) {
      const u = i / Math.max(1, count);
      this.spawnAfterimage(
        fromX + (toX - fromX) * u,
        fromY + (toY - fromY) * u,
        facing,
        row,
        cols[i % cols.length],
        0.26 + i * 0.03,
        1.0
      );
    }
  }

  /**
   * OVERDRIVE (`ULTIMATE` — "DEATH'S SOVEREIGNTY", `1.86s`):
   * 5-Beat Blood-Moon Thanatos Sky-Drop Execution + 5-Wave Obelisk Fault-Line!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    const uMin = advBounds ? advBounds.minX + 36 : 105;
    const uMax = advBounds ? advBounds.maxX - 36 : ww - 105;
    const targetX = advBounds
      ? enemy?.isColossalBoss
        ? (enemy.anchorX || enemy.x) + (enemy.facing || -1) * 115
        : Math.max(advBounds.minX + 125, Math.min(advBounds.maxX - 125, enemy ? enemy.x : this.x + this.facing * 200))
      : enemy
        ? Math.max(150, Math.min(ww - 150, enemy.x))
        : ww * 0.5;

    this.vx = 0;
    this.vy = 0;
    this.mana = 0;
    this.giantScale = 1.0;
    this.isDeflecting = t < 1.66;
    this.isInvulnerable = t < 1.48;

    if (game?.renderer && t < 1.80) {
      const dimTarget = t <= 1.38 ? 0.38 : 0.38 * Math.max(0, 1 - (t - 1.38) / 0.42);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    if (t < 0.04) {
      this.ultStage = 0;
      this.y = this.groundY;
      this.ultPassStartX = this.x;
      this.ultPassTargetX = targetX;
      this._ultTargetLockX = targetX;
      this.trueUltFrameOverride = 121;
    }

    const lockX = Number.isFinite(this._ultTargetLockX) ? this._ultTargetLockX : targetX;

    if (t >= 0.04 && this.ultStage === 0) {
      this.ultStage = 1;
      this._ultTargetLockX = targetX;
      this.soulStacks = this.maxSoulStacks;
      if (game?.audio) {
        game.audio.play('soul_drain', targetX);
        game.audio.play('chain_hook', targetX);
      }
      game?.renderer?.triggerShake?.(18, 0.28);

      this.tombstones = [];
      for (const side of [-1, 1]) {
        const tx = Math.max(
          advBounds ? advBounds.minX + 24 : 85,
          Math.min(advBounds ? advBounds.maxX - 24 : ww - 85, targetX + side * 182)
        );
        this.tombstones.push({
          x: tx,
          groundY: this.groundY,
          size: 248,
          delay: 0.01,
          life: 1.72,
          maxLife: 1.72,
          shattered: false,
          isPrison: true
        });
        this.fx?.spawn('skeletalChainTetherBeam', tx, this.groundY - 108, {
          light: 1.38,
          extra: {
            dx: targetX - tx,
            dy: 14,
            arcH: -14,
            isCrimson: side > 0,
            showClaw: true,
            customDuration: 0.44
          }
        });
      }

      this.spawnThanatosStand(1.76, 356, targetX, false);
      this.fx?.spawn('necropolisBoneyardDomain', targetX, this.groundY - 4, { light: 1.46 });
      this.fx?.spawn('necroticGraveyardSigil', targetX, this.groundY - 4, {
        palette: BLOOD_MOON_CRIMSON_PALETTE,
        light: 1.42,
        extra: { radius: 56, isPrison: true, isCrimson: true, customDuration: 1.68 }
      });
      this.spawnVfxAnim(6, targetX, this.groundY - 106, 268, 268, 0.54, {
        glowColor: 'crimson',
        inFront: false
      });

      if (game?.vfx) {
        game.vfx.spawnGlyphBurst(targetX, this.groundY - 104, 10, 'abyssal');
        game.vfx.spawnDamageText(targetX, this.groundY - 262, 0, true, "DEATH'S SOVEREIGNTY!", '#d946ef');
      }
      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 14, false, -28, 0, game);
        this.mana = 0;
      }
    }

    if (t >= 0.04 && t < 0.28 && this.ultStage === 1) {
      const u1 = Math.min(1, (t - 0.04) / 0.24);
      this.trueUltFrameOverride = 121 + Math.min(6, Math.floor(u1 * 7));
      if (enemy && !enemy.isDead && !enemy.unstoppablePoise && !enemy.isColossalBoss) {
        enemy.x += (lockX - enemy.x) * Math.min(1, dt * 6.5);
      }
    }

    if (t >= 0.28 && this.ultStage === 1) {
      this.ultStage = 2;
      this._ultTargetLockX = targetX;
      if (game?.audio) game.audio.play('scythe_reap', targetX);
      game?.renderer?.triggerShake?.(19, 0.24);
      game?.renderer?.triggerHitStop?.(0.045);

      this.ultPassStartX = Math.max(uMin, Math.min(uMax, targetX - 168));
      this.ultPassTargetX = Math.max(uMin, Math.min(uMax, targetX + 168));
      this.x = this.ultPassStartX;
      this.facing = 1;

      this.spawnWraithClone(
        this.ultPassTargetX,
        this.groundY,
        this.ultPassStartX,
        this.groundY,
        -1,
        0.28,
        2,
        8,
        22
      );
      this.spawnWraithTrail(this.ultPassStartX, this.groundY, this.ultPassTargetX, this.groundY, 1, 5, 2);
      for (let w = 0; w < 3; w++) this.spawnSoulWisp();

      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 104, {
        flip: false,
        light: 1.44,
        extra: { radiusWorld: 172, isCrimson: false, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 104, 232, 232, 0.36, {
        flipX: false,
        glowColor: 'violet',
        inFront: true
      });

      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 18, true, -38, -46, game);
        this.mana = 0;
      }
    }

    if (t >= 0.28 && t < 0.56 && this.ultStage === 2) {
      const u = Math.min(1, (t - 0.28) / 0.24);
      const ease = 1 - Math.pow(1 - u, 3);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * ease;
      this.y = this.groundY - Math.sin(u * Math.PI) * 28;
      this.trueUltFrameOverride = 68 + Math.min(6, Math.floor(u * 7));
    }

    if (t >= 0.56 && this.ultStage === 2) {
      this.ultStage = 3;
      this._ultTargetLockX = targetX;
      if (game?.audio) game.audio.play('reaper_ult', targetX);
      game?.renderer?.triggerShake?.(20, 0.26);
      game?.renderer?.triggerHitStop?.(0.048);

      this.ultPassStartX = Math.max(uMin, Math.min(uMax, targetX + 162));
      this.ultPassTargetX = Math.max(uMin, Math.min(uMax, targetX - 162));
      this.x = this.ultPassStartX;
      this.facing = -1;

      this.spawnWraithClone(
        this.ultPassTargetX,
        this.groundY - 92,
        this.ultPassStartX,
        this.groundY,
        1,
        0.28,
        8,
        12,
        24
      );
      this.spawnWraithClone(
        this.ultPassTargetX,
        this.groundY,
        this.ultPassStartX,
        this.groundY,
        1,
        0.28,
        2,
        9,
        23
      );
      this.spawnWraithTrail(this.ultPassStartX, this.groundY - 24, this.ultPassTargetX, this.groundY - 82, -1, 5, 8);

      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 114, {
        flip: true,
        light: 1.46,
        extra: { radiusWorld: 178, isCrimson: true, isCross: true, isUppercut: true }
      });
      this.spawnVfxAnim(0, targetX, this.groundY - 114, 228, 228, 0.38, {
        flipX: true,
        glowColor: 'crimson',
        inFront: true
      });

      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 18, true, 36, -64, game);
        this.mana = 0;
      }
    }

    if (t >= 0.56 && t < 0.86 && this.ultStage === 3) {
      const u = Math.min(1, (t - 0.56) / 0.26);
      const ease = 1 - Math.pow(1 - u, 2);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * ease;
      this.y = this.groundY - Math.sin(u * Math.PI) * 112;
      this.trueUltFrameOverride = 245 + Math.min(11, Math.floor(u * 12));
    }

    if (t >= 0.86 && this.ultStage === 3) {
      this.ultStage = 4;
      this._ultTargetLockX = targetX;
      if (game?.audio) game.audio.play('chain_hook', targetX);
      game?.renderer?.triggerShake?.(20, 0.28);

      const dir = enemy ? Math.sign(enemy.x - this.x) || 1 : 1;
      this.ultPassStartX = targetX;
      this.ultPassTargetX = Math.max(uMin, Math.min(uMax, targetX - dir * 96));
      this.x = Math.max(uMin, Math.min(uMax, targetX));
      this.y = this.groundY - 168;
      this.facing = dir;

      this.fx?.spawn('abyssalShadowEruptionPillar', targetX, this.groundY - 2, {
        light: 1.42,
        extra: { facing: dir }
      });

      this.spawnWraithClone(targetX - 142, this.groundY - 122, targetX - 96, this.groundY - 108, 1, 0.34, 8, 13, 20);
      this.spawnWraithClone(targetX + 142, this.groundY - 122, targetX + 96, this.groundY - 108, -1, 0.34, 8, 13, 20);

      for (const ox of [-128, 0, 128]) {
        this.fx?.spawn('skeletalChainTetherBeam', targetX + ox, this.groundY - (ox === 0 ? 210 : 176), {
          light: 1.42,
          extra: {
            dx: -ox,
            dy: ox === 0 ? 116 : 84,
            arcH: ox === 0 ? 8 : -12,
            isCrimson: true,
            showClaw: true,
            customDuration: 0.34
          }
        });
      }

      if (game?.vfx) {
        game.vfx.spawnDamageText(targetX, this.groundY - 246, 0, false, 'THANATOS SKY-LOCK!', '#f43f5e');
      }

      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 16, true, 0, -96, game);
        this.mana = 0;
        this.leechLife(6, enemy, game, 'THANATOS SHACKLE');
      }
    }

    if (t >= 0.86 && t < 1.20 && this.ultStage === 4) {
      const u = Math.min(1, (t - 0.86) / 0.34);
      const diveFrac = u < 0.72 ? 0 : Math.pow((u - 0.72) / 0.28, 2.2);
      const startDiveX = Math.max(uMin, Math.min(uMax, lockX));
      this.x = startDiveX + (this.ultPassTargetX - startDiveX) * diveFrac;
      this.y = this.groundY - Math.round((1 - diveFrac) * 168 + Math.sin(u * Math.PI) * 10);
      this.trueUltFrameOverride = 136 + Math.min(5, Math.floor(u * 6));
      if (enemy && !enemy.isDead && !enemy.unstoppablePoise && !enemy.isColossalBoss) {
        enemy.x += (lockX - enemy.x) * Math.min(1, dt * 8.0);
      }
    } else if (t >= 1.20) {
      this.y = this.groundY;
    }

    if (this.thanatosStand) {
      this.thanatosStand.x = lockX;
      this.thanatosStand.y =
        this.ultStage === 4 && t < 1.20
          ? this.groundY - Math.round(this.thanatosStand.size * 0.62)
          : this.groundY - Math.round(this.thanatosStand.size * 0.52);
    }

    if (t >= 1.20 && this.ultStage === 4) {
      this.ultStage = 5;
      this._ultSlashFlash = 0.48;
      this._ultSlashCenterX = lockX;
      this.graveWardTimer = Math.max(this.graveWardTimer || 0, 1.50);

      if (game?.audio) {
        game.audio.play('scythe_reap', lockX);
        game.audio.play('reaper_ult', lockX);
      }

      game?.renderer?.triggerImpactFrame?.(0.08, lockX, this.groundY - 110, 'abyssal');
      if (game?.renderer && game.renderer.impactFrameTimer > 0.08) {
        game.renderer.impactFrameFocusX = lockX;
        game.renderer.impactFrameFocusY = this.groundY - 110;
        game.renderer.impactFrameMaxTimer = 0.08;
        game.renderer.impactFrameTimer = 0.08;
      }
      if (game?.renderer) {
        game.renderer.triggerShake?.(30, 0.58);
        game.renderer.triggerAberration?.(18);
        game.renderer.triggerHitStop?.(0.09);
        game.renderer.flash?.(0.18, '#f5d0fe');
      }

      const slamDir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
      this.facing = slamDir;
      this.x = Math.max(uMin - 10, Math.min(uMax + 10, lockX - slamDir * 98));
      this.y = this.groundY;

      this.spawnWraithClone(lockX - 150, this.groundY - 120, lockX + 70, this.groundY, 1, 0.34, 4, 14, 24);
      this.spawnWraithClone(lockX + 150, this.groundY - 120, lockX - 70, this.groundY, -1, 0.34, 4, 14, 24);

      this.fx?.spawn('deathAvatarCathedral', lockX, this.groundY - 4, { light: 1.50 });
      this.fx?.spawn('soulHarvestScytheArc', lockX, this.groundY - 112, {
        flip: slamDir < 0,
        light: 1.50,
        extra: { radiusWorld: 186, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(7, lockX, this.groundY - 114, 348, 284, 0.48, {
        flipX: slamDir < 0,
        glowColor: 'crimson',
        inFront: true
      });

      const faultStart = Math.max(uMin - 10, Math.min(uMax + 10, lockX - slamDir * 176));
      this.spawnNecroticFaultLine(faultStart, slamDir, game);

      for (const tb of this.tombstones) {
        tb.shattered = true;
        tb.life = Math.min(tb.life, tb.maxLife * 0.32);
      }

      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 58, true, slamDir * 168, -230, game);
        this.mana = 0;
        this.leechLife(16, enemy, game, 'THANATOS SKY-GUILLOTINE');
        if (game?.vfx) game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 98, 16, 'abyssal');
      }
    }

    if (t >= 1.20 && t < 1.86) {
      const uFollow = Math.min(1, (t - 1.20) / 0.66);
      this.trueUltFrameOverride = 142 + Math.min(7, Math.floor(uFollow * 8));
    }

    if (t >= 1.86) {
      this.y = this.groundY;
      this.mana = 0;
      this.giantScale = 1.0;
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.thanatosStand = null;
      this.deathAvatar = null;
      this.wraithClones = [];
      this.setState('IDLE');
    }
  }

  /**
   * SUPREME ULTIMATE (`TRUE_ULTIMATE`, `4.50s` + `12.5s` Living Death-Mage & Soul-Healer):
   * "MEMENTO MORI: OBLIVION GUILLOTINE"
   */
  updateTrueUltimate(dt, enemy, game) {
    const elapsed = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    const tMin = advBounds ? advBounds.minX + 36 : 95;
    const tMax = advBounds ? advBounds.maxX - 36 : ww - 95;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.isSubmerged = false;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.giantScale = 1.0;
    this.vx = 0;
    this.vy = 0;
    if (elapsed < 2.36 || elapsed >= 3.15) {
      this.y = this.groundY;
    }

    if (enemy) {
      this._trueUltEnemy = enemy;
    }

    const targets = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];

    const computeAltarX = () => {
      const rawX = enemy ? enemy.x : this.x + this.facing * 220;
      if (advBounds) {
        return enemy?.isColossalBoss
          ? (enemy.anchorX || enemy.x) + (enemy.facing || -1) * 140
          : Math.max(advBounds.minX + 160, Math.min(advBounds.maxX - 160, rawX));
      }
      return Math.max(260, Math.min(940, rawX));
    };

    if (elapsed < 0.04 && this._trueUltStep === 0) {
      this._trueUltAltarX = computeAltarX();
      if (Math.abs(this._trueUltAltarX - this.x) > 8) {
        this.facing = this._trueUltAltarX >= this.x ? 1 : -1;
      }
    }

    if (game?.renderer && elapsed < 4.35) {
      const dimTarget = elapsed <= 3.45 ? 0.64 : 0.64 * Math.max(0, 1 - (elapsed - 3.45) / 0.90);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    // Phase 1 (0.00s .. 1.25s): Unsealing Twin Oblivion Gates & Summoning Death-Mage + Soul-Healer!
    if (elapsed < 1.25) {
      if (elapsed >= 0.04 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        this._trueUltAltarX = computeAltarX();

        game?.audio?.play?.('reaper_ult', this.x);
        game?.audio?.play?.('ult_cast', this._trueUltAltarX);
        game?.renderer?.triggerShake?.(18, 0.34);
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#d946ef');
        game?.vfx?.spawnDamageText?.(
          this._trueUltAltarX,
          this.groundY - 254,
          0,
          true,
          'GATES OF OBLIVION: UNSEAL!',
          '#d946ef'
        );

        for (let i = 0; i < 6; i++) this.spawnSoulWisp();

        this.fx?.spawn('mementoMoriNecropolisGates', this._trueUltAltarX, this.groundY - 4, { light: 1.50 });
        this.fx?.spawn('necropolisBoneyardDomain', this._trueUltAltarX, this.groundY - 4, { light: 1.46 });
        this.fx?.spawn('necroticGraveyardSigil', this._trueUltAltarX, this.groundY - 4, {
          palette: ABYSSAL_VIOLET_PALETTE,
          light: 1.44,
          extra: { radius: 60, isPrison: true, isCrimson: false, customDuration: 3.40 }
        });
      }

      if (elapsed >= 0.38 && !this._trueUltSummoned) {
        this._trueUltSummoned = true;
        this.summonDeathCompanions(game, true, this._trueUltAltarX);
        game?.audio?.play?.('soul_drain', this._trueUltAltarX);
        game?.renderer?.triggerShake?.(16, 0.28);

        for (const comp of this.deathCompanions) {
          if (!comp) continue;
          this.fx?.spawn('skeletalChainTetherBeam', comp.x, this.groundY - 104, {
            light: 1.38,
            extra: {
              dx: this._trueUltAltarX - comp.x,
              dy: 6,
              arcH: -22,
              isCrimson: comp.role === 'mage',
              showClaw: false,
              customDuration: 0.86
            }
          });
        }
      }

      const u = Math.min(1, Math.max(0, elapsed / 1.25));
      this.trueUltFrameOverride = 120 + Math.min(11, Math.floor(u * 12));
      return;
    }

    // Phase 2 (1.25s .. 3.15s): Death-Clock Bind, Phantom Wraith Barrage & 192px Sovereign Sky-Ascent!
    if (elapsed < 3.15) {
      if (elapsed >= 1.25 && this._trueUltStep < 2) {
        this._trueUltStep = 2;
        game?.audio?.play?.('chain_hook', this._trueUltAltarX);
        game?.audio?.play?.('soul_drain', this._trueUltAltarX);
        game?.renderer?.triggerShake?.(16, 0.26);
        game?.vfx?.spawnDamageText?.(
          this._trueUltAltarX,
          this.groundY - 228,
          0,
          true,
          'MEMENTO MORI: DEATH-CLOCK SEAL!',
          '#f472b6'
        );

        for (const side of [-1, 1]) {
          const gateX = this._trueUltAltarX + side * 168;
          this.fx?.spawn('skeletalChainTetherBeam', gateX, this.groundY - 124, {
            light: 1.44,
            extra: {
              dx: this._trueUltAltarX - gateX,
              dy: 24,
              arcH: -18,
              isCrimson: side > 0,
              showClaw: true,
              customDuration: 1.88
            }
          });
        }
      }

      if (elapsed >= 1.52 && !this._trueUltPhantomWave1) {
        this._trueUltPhantomWave1 = true;
        game?.audio?.play?.('scythe_reap', this._trueUltAltarX);
        game?.renderer?.triggerShake?.(16, 0.22);

        const lx = Math.max(tMin, Math.min(tMax, this._trueUltAltarX - 180));
        const rx = Math.max(tMin, Math.min(tMax, this._trueUltAltarX + 180));
        this.spawnWraithClone(lx, this.groundY, rx, this.groundY, 1, 0.32, 2, 8, 22);
        this.spawnWraithClone(rx, this.groundY, lx, this.groundY, -1, 0.32, 2, 8, 22);
        this.spawnWraithTrail(lx, this.groundY, rx, this.groundY, 1, 5, 2);

        this.fx?.spawn('soulHarvestScytheArc', this._trueUltAltarX, this.groundY - 106, {
          flip: false,
          light: 1.44,
          extra: { radiusWorld: 176, isCrimson: false, isCross: true, isUppercut: false }
        });
        this.spawnVfxAnim(4, this._trueUltAltarX, this.groundY - 106, 228, 228, 0.34, {
          flipX: false,
          glowColor: 'violet',
          inFront: true
        });
      }

      if (elapsed >= 1.96 && !this._trueUltPhantomWave2) {
        this._trueUltPhantomWave2 = true;
        game?.audio?.play?.('scythe_reap', this._trueUltAltarX);
        game?.renderer?.triggerShake?.(18, 0.24);

        const lx = Math.max(tMin, Math.min(tMax, this._trueUltAltarX - 186));
        const rx = Math.max(tMin, Math.min(tMax, this._trueUltAltarX + 186));
        this.spawnWraithClone(lx, this.groundY - 142, this._trueUltAltarX + 92, this.groundY, 1, 0.34, 8, 12, 24);
        this.spawnWraithClone(rx, this.groundY - 142, this._trueUltAltarX - 92, this.groundY, -1, 0.34, 8, 12, 24);

        this.fx?.spawn('soulHarvestScytheArc', this._trueUltAltarX, this.groundY - 114, {
          flip: true,
          light: 1.46,
          extra: { radiusWorld: 184, isCrimson: true, isCross: true, isUppercut: false }
        });
        this.spawnVfxAnim(0, this._trueUltAltarX, this.groundY - 114, 224, 224, 0.36, {
          flipX: true,
          glowColor: 'crimson',
          inFront: true
        });
      }

      if (elapsed >= 2.36 && !this._trueUltSkyAscent) {
        this._trueUltSkyAscent = true;
        this._trueUltAscentStartX = this.x;
        game?.audio?.play?.('reaper_ult', this._trueUltAltarX);
        game?.renderer?.triggerShake?.(20, 0.30);

        this.fx?.spawn('abyssalShadowEruptionPillar', this.x, this.groundY - 2, {
          light: 1.46,
          extra: { facing: this.facing }
        });
        for (let i = 0; i < 6; i++) this.spawnSoulWisp();
        game?.vfx?.spawnDamageText?.(
          this._trueUltAltarX,
          this.groundY - 266,
          0,
          true,
          'MEMENTO MORI: FINAL TOLL!',
          '#f43f5e'
        );
      }

      if (elapsed >= 2.36) {
        const uAsc = Math.min(1, Math.max(0, (elapsed - 2.36) / 0.78));
        const liftEase = 1 - Math.pow(1 - Math.min(1, uAsc / 0.55), 3);
        const startX = Number.isFinite(this._trueUltAscentStartX) ? this._trueUltAscentStartX : this.x;
        const clampedGoalX = Math.max(tMin, Math.min(tMax, this._trueUltAltarX));
        this.x = startX + (clampedGoalX - startX) * liftEase;
        this.y = this.groundY - Math.round(liftEase * 192 + Math.sin(uAsc * Math.PI * 2) * 5);
        // Uses Row 4 F16..F21 (136..141) Sovereign Thanatos Shadow-Winged Sky-Ascent!
        this.trueUltFrameOverride = 136 + Math.min(5, Math.floor(uAsc * 6));
      } else {
        const uBind = Math.min(1, Math.max(0, (elapsed - 1.25) / 1.11));
        this.trueUltFrameOverride = 128 + Math.min(7, Math.floor(uBind * 8));
      }

      if (enemy && !enemy.isDead && !enemy.isColossalBoss) {
        enemy.x += (this._trueUltAltarX - enemy.x) * Math.min(1, dt * 8.6);
        enemy.vx = 0;
      }
      for (const tgt of targets) {
        if (tgt && !tgt.isDead && !tgt.isBenched && !tgt.isColossalBoss && tgt !== enemy) {
          tgt.x += (this._trueUltAltarX - tgt.x) * Math.min(1, dt * 8.6);
          tgt.vx = 0;
        }
      }
      return;
    }

    // Phase 3 (t >= 3.15s): Cataclysmic Sky-Plunge & 720-Crit Reality-Split Oblivion Guillotine!
    if (elapsed >= 3.15 && this._trueUltStep < 3) {
      this._trueUltStep = 3;
      this._trueUltSlashFlash = 0.98;
      this.soulStacks = this.maxSoulStacks;
      this.graveWardTimer = Math.max(this.graveWardTimer || 0, 2.20);

      if (Math.abs(this._trueUltAltarX - this.x) > 8) {
        this.facing = this._trueUltAltarX >= this.x ? 1 : -1;
      }
      const landX = Math.max(tMin, Math.min(tMax, this._trueUltAltarX - this.facing * 96));
      this.spawnWraithTrail(this._trueUltAltarX, this.groundY - 188, landX, this.groundY, this.facing, 6, 4);
      this.x = landX;
      this.y = this.groundY;

      this.spawnWraithClone(this._trueUltAltarX - 172, this.groundY, this._trueUltAltarX + 90, this.groundY, 1, 0.46, 4, 16, 24);
      this.spawnWraithClone(this._trueUltAltarX + 172, this.groundY, this._trueUltAltarX - 90, this.groundY, -1, 0.46, 4, 16, 24);
      this.spawnWraithClone(this._trueUltAltarX - 168, this.groundY - 148, this._trueUltAltarX + 64, this.groundY, 1, 0.42, 8, 14, 24);
      this.spawnWraithClone(this._trueUltAltarX + 168, this.groundY - 148, this._trueUltAltarX - 64, this.groundY, -1, 0.42, 8, 14, 24);

      game?.renderer?.triggerImpactFrame?.(0.14, this._trueUltAltarX, this.groundY - 116, 'abyssal');
      if (game?.renderer && game.renderer.impactFrameTimer > 0.14) {
        game.renderer.impactFrameFocusX = this._trueUltAltarX;
        game.renderer.impactFrameFocusY = this.groundY - 116;
        game.renderer.impactFrameMaxTimer = 0.14;
        game.renderer.impactFrameTimer = 0.14;
      }
      game?.renderer?.shake?.(34, 0.82);
      game?.renderer?.triggerShake?.(34, 0.82);
      game?.renderer?.triggerAberration?.(22);
      game?.renderer?.flash?.(0.34, '#fdf4ff');

      game?.audio?.play?.('reaper_ult', this._trueUltAltarX);
      game?.audio?.play?.('scythe_reap', this._trueUltAltarX);
      game?.audio?.play?.('soul_drain', this._trueUltAltarX);

      this.fx?.spawn('deathAvatarCathedral', this._trueUltAltarX, this.groundY - 4, { light: 1.50 });
      this.fx?.spawn('soulHarvestScytheArc', this._trueUltAltarX, this.groundY - 114, {
        flip: this.facing < 0,
        light: 1.50,
        extra: { radiusWorld: 196, isCrimson: true, isCross: true, isUppercut: false }
      });

      this.spawnGroundedBoneSpire(this._trueUltAltarX, 264, 0.86, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: false
      });
      for (const side of [-1, 1]) {
        const spX = Math.max(tMin - 3, Math.min(tMax + 3, this._trueUltAltarX + side * 146));
        this.spawnGroundedBoneSpire(spX, 224, 0.74, {
          flipX: side < 0,
          glowColor: side < 0 ? 'violet' : 'crimson',
          inFront: false
        });
      }
      game?.vfx?.spawnGlyphBurst?.(this._trueUltAltarX, this.groundY - 112, 18, 'abyssal');

      const manaBeforeExec = 0;
      let hitCount = 0;
      for (const tgt of targets) {
        if (tgt && !tgt.isDead && !tgt.isBenched) {
          const burstDmg = hitCount === 0 ? 720 : Math.round(720 * 0.76);
          tgt.takeDamage(burstDmg, this, true, 295, -265);
          hitCount++;
        }
      }
      this.mana = manaBeforeExec;
      this.heal(Math.round(this.maxHp * 0.12), 'OBLIVION HARVEST');
    }

    const cleaveSpan = Math.min(1, Math.max(0, (elapsed - 3.15) / 0.55));
    if (elapsed < 3.70) {
      this.trueUltFrameOverride = 142 + Math.min(4, Math.floor(cleaveSpan * 5));
    } else {
      const recFrameSpan = Math.min(1, Math.max(0, (elapsed - 3.70) / 0.80));
      this.trueUltFrameOverride = 147 + Math.min(2, Math.floor(recFrameSpan * 3));
    }

    if (elapsed >= this.trueUltDuration) {
      this.y = this.groundY;
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this.trueUltFrameOverride = null;
      this._overrideFrameIdx = null;
      this.wraithClones = [];
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this._currentEnemy = enemy;
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.graveWardTimer = Math.max(0, (this.graveWardTimer || 0) - dt);
    this.burrowDodgeToastCd = Math.max(0, (this.burrowDodgeToastCd || 0) - dt);
    this.soulOrbitPhase += dt * 3.6;

    if (this._comboPersistTimer > 0 && this.state !== 'AUTO_ATTACK') {
      this._comboPersistTimer = Math.max(0, this._comboPersistTimer - dt);
      if (this._comboPersistTimer <= 0) {
        this.comboStep = 0;
      }
    }

    for (let i = this.burrowTrailNodes.length - 1; i >= 0; i--) {
      this.burrowTrailNodes[i].age += dt;
      if (this.burrowTrailNodes[i].age >= this.burrowTrailNodes[i].maxLife) {
        this.burrowTrailNodes.splice(i, 1);
      }
    }

    for (let i = this.razorScars.length - 1; i >= 0; i--) {
      this.razorScars[i].age += dt;
      if (this.razorScars[i].age >= this.razorScars[i].maxLife) {
        this.razorScars.splice(i, 1);
      }
    }

    if (this._trueUltSlashFlash > 0) {
      this._trueUltSlashFlash = Math.max(0, this._trueUltSlashFlash - dt);
    }
    if (this._ultSlashFlash > 0) {
      this._ultSlashFlash = Math.max(0, this._ultSlashFlash - dt);
    }
    if (enemy) {
      this._trueUltEnemy = enemy;
    }

    this.updateCompanions(dt, enemy, game);

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }
    for (let i = this.wraithClones.length - 1; i >= 0; i--) {
      const wc = this.wraithClones[i];
      wc.age += dt;
      const u = Math.min(1, wc.age / wc.maxLife);
      const ease = 1 - Math.pow(1 - u, 3);
      wc.x = wc.startX + (wc.endX - wc.startX) * ease;
      wc.y = wc.startY + (wc.endY - wc.startY) * ease;
      if (wc.age >= wc.maxLife) {
        this.wraithClones.splice(i, 1);
      }
    }

    if (this.thanatosStand) {
      this.thanatosStand.age += dt;
      if (this.thanatosStand.followOwner) {
        this.thanatosStand.x = this.x - this.facing * 24;
        this.thanatosStand.facing = this.facing;
      }
      if (this.thanatosStand.age >= this.thanatosStand.maxLife) {
        this.thanatosStand = null;
        if (this.state !== 'ULTIMATE') {
          this.deathAvatar = null;
        }
      }
    }

    if (this.severedSoul) {
      this.severedSoul.life -= dt;
      this.severedSoul.echoCooldown = Math.max(0, (this.severedSoul.echoCooldown || 0) - dt);
      const tgt = this.severedSoul.target;
      if (!tgt || tgt.isDead || tgt.isBenched || this.severedSoul.life <= 0) {
        this.severedSoul = null;
      } else if (!tgt.isColossalBoss && Math.abs(tgt.x - this.severedSoul.x) < 340 && !tgt.unstoppablePoise) {
        tgt.vx *= Math.pow(0.28, dt);
        tgt.x += (this.severedSoul.x - tgt.x) * Math.min(1, dt * 1.45);
      }
    }

    if (this.scytheWave) {
      const sw = this.scytheWave;
      sw.age += dt;
      sw.x += sw.vx * dt;
      if (
        !sw.didHit &&
        enemy &&
        !enemy.isDead &&
        Math.abs(enemy.x - sw.x) < 62 &&
        Math.abs(enemy.y - 96 - sw.y) < 88
      ) {
        sw.didHit = true;
        this.strikeWithSoulResonance(enemy, 40, false, -38, -24, game);
        this.gainSoulStack(1);
        this.leechLife(7, enemy, game, 'SOUL WAVE');
        this.spawnVfxAnim(4, sw.x, sw.y, 152, 152, 0.24, {
          flipX: sw.dir < 0,
          glowColor: 'violet',
          inFront: true
        });
      }
      if (sw.didHit || Math.abs(sw.x - sw.startX) >= sw.maxDist || sw.age >= sw.maxLife) {
        this.scytheWave = null;
      }
    }

    for (let i = this.activeVfxAnims.length - 1; i >= 0; i--) {
      const v = this.activeVfxAnims[i];
      v.age += dt;
      if (v.followOwner) {
        v.x = this.x + v.offsetX * this.facing;
        v.y = this.y + v.offsetY;
      } else {
        v.x += v.vx * dt;
        v.y += v.vy * dt;
      }
      if (v.age >= v.maxLife) {
        this.activeVfxAnims.splice(i, 1);
      }
    }

    for (let i = this.faultSpireQueue.length - 1; i >= 0; i--) {
      const sp = this.faultSpireQueue[i];
      sp.delay -= dt;
      if (sp.delay <= 0) {
        this.faultSpireQueue.splice(i, 1);
        const h = sp.h || 240;
        this.spawnGroundedBoneSpire(sp.x, h, 0.72, {
          glowColor: sp.wave % 2 === 0 ? 'crimson' : 'violet',
          inFront: false
        });
        this.fx?.spawn('necroticGraveyardSigil', sp.x, this.groundY - 4, {
          palette: sp.wave % 2 === 0 ? BLOOD_MOON_CRIMSON_PALETTE : ABYSSAL_VIOLET_PALETTE,
          light: 1.32,
          extra: { radius: 34, isPrison: true, isCrimson: sp.wave % 2 === 0, customDuration: 0.62 }
        });
        if (sp.wave === 0 || sp.wave === 2 || sp.wave === 4) {
          this.fx?.spawn('deathAvatarCathedral', sp.x, this.groundY - 4, { light: 1.38 });
        }
        if (enemy && !enemy.isDead && Math.abs(enemy.x - sp.x) <= 78) {
          const manaPreSpire = this.mana;
          this.strikeWithSoulResonance(enemy, 12, true, this.facing * 42, -90, game);
          this.leechLife(3, enemy, game, 'OBELISK ERUPT');
          this.mana = manaPreSpire;
        }
      }
    }

    const bs = this.activeScytheBoomerang || this.activeBoomerangScythe;
    if (bs) {
      bs.timer += dt;
      bs.angle += dt * 28;

      if (bs.phase === 'outbound') {
        bs.x += bs.dir * 700 * dt;
        if (
          !bs.hitOutbound &&
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - bs.x) < 58 &&
          Math.abs(enemy.y - 96 - bs.y) < 88
        ) {
          bs.hitOutbound = true;
          this.strikeWithSoulResonance(enemy, 26, false, -42, -52, game);
          this.gainSoulStack(1);
          this.leechLife(3, enemy, game, 'SOUL DISC');
          this.spawnVfxAnim(1, bs.x, bs.y, 124, 124, 0.26, {
            glowColor: 'violet',
            inFront: true
          });
        }
        if (Math.abs(bs.x - bs.startX) >= 405 || bs.timer >= 0.56) {
          bs.phase = 'hover';
          bs.timer = 0;
        }
      } else if (bs.phase === 'hover') {
        if (!bs.hitHover && bs.timer >= 0.09 && enemy && !enemy.isDead && Math.abs(enemy.x - bs.x) < 72) {
          bs.hitHover = true;
          const manaPreHover = this.mana;
          this.strikeWithSoulResonance(enemy, 20, true, -58, -64, game);
          this.leechLife(2, enemy, game, 'VORTEX SHRED');
          this.mana = manaPreHover;
          this.fx?.spawn('soulHarvestScytheArc', bs.x, bs.y, {
            flip: bs.dir < 0,
            light: 1.32,
            extra: { radiusWorld: 112, isCrimson: true, isCross: true }
          });
        }
        if (bs.timer >= 0.20) {
          bs.phase = 'return';
          bs.timer = 0;
          this.fx?.spawn('skeletalChainTetherBeam', this.x + this.facing * 36, this.y - 96, {
            light: 1.26,
            extra: {
              dx: bs.x - (this.x + this.facing * 36),
              dy: bs.y - (this.y - 96),
              arcH: -18,
              isCrimson: true,
              showClaw: false,
              customDuration: 0.28
            }
          });
        }
      } else if (bs.phase === 'return') {
        const dx = this.x - bs.x;
        const dy = this.y - 98 - bs.y;
        const dist = Math.hypot(dx, dy) || 1;
        bs.x += (dx / dist) * 785 * dt;
        bs.y += (dy / dist) * 785 * dt;
        if (
          !bs.hitReturn &&
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - bs.x) < 62 &&
          Math.abs(enemy.y - 96 - bs.y) < 88
        ) {
          bs.hitReturn = true;
          const manaPreRet = this.mana;
          this.strikeWithSoulResonance(enemy, 30, true, -96, -80, game);
          this.leechLife(4, enemy, game, 'RETURN REAP!');
          this.mana = Math.min(this.maxMana, manaPreRet + 4);
          if (game?.vfx) {
            game.vfx.spawnDamageText(enemy.x, enemy.y - 150, 0, false, 'SOUL DISC RETURN!', '#e879f9');
          }
        }
        if (dist < 42 || bs.timer >= 0.75) {
          this.activeScytheBoomerang = null;
          this.activeBoomerangScythe = null;
        }
      }
    }

    for (let i = this.soulWisps.length - 1; i >= 0; i--) {
      const w = this.soulWisps[i];
      w.life += dt;
      if (w.life >= w.maxLife) {
        this.soulWisps.splice(i, 1);
      }
    }

    if (this.boneCage) {
      this.boneCage.life -= dt;
      if (
        enemy &&
        !enemy.isDead &&
        !enemy.isColossalBoss &&
        Math.abs(enemy.x - this.boneCage.x) < this.boneCage.radius + 20
      ) {
        enemy.vx *= Math.pow(0.18, dt);
        enemy.x += (this.boneCage.x - enemy.x) * Math.min(1, dt * 4.2);
      }
      if (this.boneCage.life <= 0) {
        this.boneCage = null;
      }
    }

    for (let i = this.tombstones.length - 1; i >= 0; i--) {
      const ts = this.tombstones[i];
      if (ts.delay > 0) {
        ts.delay = Math.max(0, ts.delay - dt);
      } else {
        ts.life -= dt;
        if (ts.life <= 0) {
          this.tombstones.splice(i, 1);
        }
      }
    }

    if (!this.isDead && (this.state === 'IDLE' || this.state === 'WALK') && this.dodgeCooldown <= 0 && game?.vfx) {
      const inPillar = game.vfx.pillars?.some(
        (pil) => pil.erupted && pil.owner !== this && Math.abs(pil.x - this.x) < 105
      );
      if (inPillar) {
        this.gainSoulStack(1);
        this.leechLife(9, enemy, game, 'ABYSSAL SIPHON');
        this.skillCooldown = Math.max(0, this.skillCooldown - 0.50);
        if (this.crouchCooldown <= 0) {
          this.startCrouch(enemy, game);
        } else {
          this.startDodge(enemy, game);
        }
        return;
      }
    }

    const inMidCombo = (this._aiComboCount || 0) > 0 && (this._aiComboChainTimer || 0) > 0;
    if (
      !this.isDead &&
      !this.isPlayerControlled &&
      !inMidCombo &&
      enemy &&
      !enemy.isDead &&
      (this.state === 'IDLE' || this.state === 'WALK')
    ) {
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const dist = Math.abs(enemy.x - this.x);
      const pinnedLeft = this.x < 240 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 240 && enemy.x < this.x;

      if ((pinnedLeft || pinnedRight) && dist < 265 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.1;
        this.startJump(enemy, game);
        return;
      }

      const canDefensiveBurrow = this.hp < this.maxHp * 0.38 && dist <= 250;
      if (
        this.crouchCooldown <= 0 &&
        this.mana < this.maxMana &&
        (this.finisherGauge || 0) < 100 &&
        ((dist >= 165 && dist <= 370) || canDefensiveBurrow) &&
        !game?.isAdventureMode?.()
      ) {
        this.startCrouch(enemy, game);
        return;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.32) {
        this.stepDustTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
      }
    }

    this.fx?.update(dt);
    super.update(dt, enemy, game);
  }

  /**
   * Pixel-pure stepped horizontal oval fill (`fillRect` scanlines ONLY — zero `.ellipse()`, zero `.arc()`).
   */
  drawPixelOvalFill(ctx, cx, cy, rx, ry, color, alpha = 1.0) {
    if (!ctx?.fillRect || alpha <= 0.02 || rx < 2 || ry < 1) return;
    const irx = Math.max(2, Math.round(rx / 2) * 2);
    const iry = Math.max(2, Math.round(ry / 2) * 2);
    const icx = Math.round(cx / 2) * 2;
    const icy = Math.round(cy / 2) * 2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    for (let dy = -iry; dy <= iry; dy += 2) {
      const ny = dy / Math.max(1, iry);
      const span = Math.round(irx * Math.sqrt(Math.max(0, 1 - ny * ny)) / 2) * 2;
      if (span >= 2) {
        ctx.fillRect(icx - span, icy + dy, span * 2, 2);
      }
    }
    ctx.restore();
  }

  /**
   * Pixel-pure stepped horizontal ring (`fillRect` segments ONLY — zero `.ellipse()`, zero `.arc()`).
   */
  drawPixelOvalRing(ctx, cx, cy, rx, ry, color, alpha = 1.0, thickness = 2) {
    if (!ctx?.fillRect || alpha <= 0.02 || rx < 3 || ry < 2) return;
    const irx = Math.max(4, Math.round(rx / 2) * 2);
    const iry = Math.max(2, Math.round(ry / 2) * 2);
    const icx = Math.round(cx / 2) * 2;
    const icy = Math.round(cy / 2) * 2;
    const th = Math.max(2, Math.round(thickness / 2) * 2);
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    for (let dy = -iry; dy <= iry; dy += 2) {
      const ny = dy / Math.max(1, iry);
      const outer = Math.round(irx * Math.sqrt(Math.max(0, 1 - ny * ny)) / 2) * 2;
      const nyIn = Math.abs(dy) >= iry - th ? 1 : dy / Math.max(1, iry - th);
      const inner = Math.abs(dy) >= iry - 2 ? 0 : Math.round((irx - th * 2) * Math.sqrt(Math.max(0, 1 - nyIn * nyIn)) / 2) * 2;
      const segW = Math.max(2, outer - inner);
      if (inner <= 0) {
        ctx.fillRect(icx - outer, icy + dy, outer * 2, 2);
      } else {
        ctx.fillRect(icx - outer, icy + dy, segW, 2);
        ctx.fillRect(icx + inner, icy + dy, segW, 2);
      }
    }
    ctx.restore();
  }

  drawBloomedVfxCell(
    ctx,
    vfxSheet,
    row,
    col,
    x,
    y,
    w = 208,
    h = 208,
    alpha = 1.0,
    flipX = false,
    renderer = null,
    glowColor = 'violet'
  ) {
    const sheet = PixelForge.ensureImage?.(vfxSheet) || vfxSheet;
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const glowSprite =
      glowColor === 'crimson'
        ? renderer?.glowCrimson || renderer?.glowViolet || renderer?.glowPurple
        : renderer?.glowViolet || renderer?.glowPurple || renderer?.glowCrimson;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.14);
      const gw = Math.round(w * 1.06);
      const gh = Math.round(h * 1.06);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(sheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.18);
    ctx.drawImage(sheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  drawBehind(ctx, renderer = null) {
    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    if (this.thanatosStand && this.state !== 'TRUE_ULTIMATE') {
      const st = this.thanatosStand;
      const u = Math.min(1, Math.max(0, st.age / st.maxLife));
      const fade = u < 0.14 ? u / 0.14 : u > 0.80 ? (1 - u) / 0.20 : 1.0;
      const col = Math.min(29, Math.floor((st.age * 26) % 30));
      const standY = Number.isFinite(st.y) ? st.y : this.groundY - Math.round(st.size * 0.52);
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        st.x,
        standY,
        st.size,
        st.size,
        fade * 0.94,
        st.facing < 0,
        renderer,
        'crimson'
      );
    }

    if (this.state !== 'TRUE_ULTIMATE') return;

    const t = this.stateTimer || 0;
    const dur = this.trueUltDuration || 4.50;
    const fadeIn = Math.min(1, Math.max(0.18, t / 0.32));
    const fadeOut = t > dur - 0.55 ? Math.max(0, (dur - t) / 0.55) : 1.0;
    const gateAlpha = fadeIn * fadeOut * 0.97;
    if (gateAlpha <= 0.02) return;

    const col = Math.min(29, Math.floor((t * 24) % 30));
    const gateY = this.groundY - 138;

    this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, this._trueUltAltarX - 168, gateY, 352, 352, gateAlpha, false, renderer, 'violet');
    this.drawBloomedVfxCell(ctx, vfxSheet, 5, col, this._trueUltAltarX + 168, gateY, 352, 352, gateAlpha, true, renderer, 'crimson');

    const standRise = Math.min(1, Math.max(0, (t - 0.16) / 0.68));
    if (standRise > 0.02) {
      const standCol = Math.min(29, Math.floor((t * 24) % 30));
      let extraLift = 0;
      if (t >= 2.36 && t < 3.15) {
        const uAsc = Math.min(1, (t - 2.36) / 0.78);
        extraLift = Math.round(Math.sin(Math.min(1, uAsc / 0.65) * (Math.PI * 0.5)) * 38);
      } else if (t >= 3.15 && t < 3.45) {
        extraLift = -12;
      }
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        standCol,
        this._trueUltAltarX,
        this.groundY - Math.round(154 + standRise * 46 + extraLift),
        388,
        388,
        standRise * fadeOut * 0.96,
        this.facing < 0,
        renderer,
        'crimson'
      );
    }
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx?.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    this.drawBehind(ctx, renderer);

    const sprites = this.getExSprites();
    const sheet = PixelForge.ensureImage?.(sprites?.sheet) || sprites?.sheet;
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;

    if (sheet && sheet.complete && sheet.naturalWidth) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.18);
        const sc = img.scale || 1.0;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 2) * 2, Math.round((img.y + 4) / 2) * 2);
        ctx.scale(img.facing * sc, sc);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawAfterimageFrame(ctx, sprites, img.frameIdx || 190, 208, 208);
        ctx.restore();
      }

      for (const wc of this.wraithClones) {
        const u = Math.min(1, Math.max(0, wc.age / wc.maxLife));
        const fade = u < 0.14 ? u / 0.14 : u > 0.80 ? (1 - u) / 0.20 : 1.0;
        const col = Math.min(29, Math.round(wc.startCol + (wc.endCol - wc.startCol) * u));
        const frameIdx = wc.row * 30 + col;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(wc.x), Math.round(wc.y + 4));
        ctx.scale(wc.facing, 1);
        ctx.globalAlpha = fade * 0.78;
        PixelForge.drawAfterimageFrame(ctx, sprites, frameIdx, 208, 208);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.18;
        PixelForge.drawAfterimageFrame(ctx, sprites, frameIdx, 208, 208);
        ctx.restore();
      }
    }

    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    for (const ts of this.tombstones) {
      if (ts.delay > 0 || ts.life <= 0) continue;
      const u = Math.min(1, Math.max(0, 1 - ts.life / ts.maxLife));
      const col = Math.min(29, Math.floor(u * 30));
      const fade = Math.min(1, ts.life * 3.0);
      const sz = ts.size || 208;
      const by = (ts.groundY ?? this.groundY) - Math.round(sz * (34 / 104));
      this.drawBloomedVfxCell(ctx, vfxSheet, 2, col, ts.x, by, sz, sz, fade * 0.94, false, renderer, ts.isPrison ? 'crimson' : 'violet');
    }

    for (const v of this.activeVfxAnims) {
      if (v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / v.maxLife));
      const span = Math.max(1, v.endFrame - v.startFrame + 1);
      const col = Math.min(29, v.startFrame + Math.floor(u * span));
      const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
      const drawY = v.row === 2 ? this.groundY - Math.round(v.h * (34 / 104)) : v.y;
      this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, drawY, v.w, v.h, fade * 0.92, v.flipX, renderer, v.glowColor);
    }
  }

  /**
   * Renders Malakor EX's Pitch-Black Abyssal Shadow Burrow Pool & Surprise-Attack Lock-On Reticle
   * using strictly integer-stepped `fillRect` geometry (`0` `.ellipse()`, `0` `ctx.rotate`!).
   */
  drawBurrowShadowIndicator(ctx) {
    if (!ctx?.fillRect) return;
    const gy = this.groundY;

    if (this.burrowTrailNodes && this.burrowTrailNodes.length > 0) {
      for (const node of this.burrowTrailNodes) {
        const u = Math.min(1, Math.max(0, node.age / node.maxLife));
        const alpha = (1 - u) * 0.78;
        if (alpha <= 0.03) continue;
        const rx = Math.max(10, (node.rx || 28) * (1 - u * 0.42));
        const ry = Math.max(4, rx * 0.25);
        this.drawPixelOvalFill(ctx, node.x, gy + 1, rx + 6, ry + 2, '#1e0638', alpha * 0.55);
        this.drawPixelOvalFill(ctx, node.x, gy + 1, rx, ry, '#020006', alpha);
      }
    }

    if (!(this.state === 'CROUCH' && this.isSubmerged)) return;

    const t = this.stateTimer || 0;
    const eruptAt = 1.48;
    const isWarning = t >= 1.08;
    const warnU = isWarning ? Math.min(1, Math.max(0, (t - 1.08) / Math.max(0.08, eruptAt - 1.08))) : 0;
    const pulse = Math.sin(t * (isWarning ? 26 : 11));
    const cx = Math.round(this.x);
    const cy = Math.round(gy + 1);
    const rx = Math.round((this.isFullyBurrowed ? 68 : 44 + this.submergeDepth * 24) + pulse * 4);
    const ry = Math.max(10, Math.round(rx * 0.25));

    this.drawPixelOvalFill(ctx, cx, cy, rx + 16, ry + 5, isWarning ? '#3b0724' : '#1b0636', 0.62);
    this.drawPixelOvalFill(ctx, cx, cy, rx + 6, ry + 2, '#05010d', 0.94);
    this.drawPixelOvalFill(ctx, cx, cy, rx, ry, '#010004', 0.98);
    this.drawPixelOvalRing(
      ctx,
      cx,
      cy,
      rx + 2,
      ry + 1,
      isWarning ? (pulse > 0 ? '#fb7185' : '#e879f9') : '#9333ea',
      isWarning ? 0.95 : 0.78,
      2
    );

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const tendrilCount = 9;
    for (let i = 0; i < tendrilCount; i++) {
      const norm = (i / (tendrilCount - 1)) * 2 - 1;
      const tx = Math.round((cx + norm * (rx - 8)) / 2) * 2;
      const tyBase = Math.round(cy + Math.sin(i * 1.9 + t * 8) * (ry * 0.38));
      const wave = 0.5 + 0.5 * Math.sin(t * 14 + i * 1.35);
      const maxH = Math.round((12 + (1 - Math.abs(norm) * 0.45) * (isWarning ? 28 : 18)) * (0.55 + 0.45 * wave));

      ctx.globalAlpha = 0.92;
      ctx.fillStyle = '#020006';
      ctx.fillRect(tx - 3, tyBase - Math.round(maxH * 0.55), 6, Math.round(maxH * 0.55) + 2);
      ctx.fillRect(tx - 2, tyBase - maxH, 4, Math.round(maxH * 0.55));

      ctx.globalAlpha = isWarning ? 0.92 : 0.74;
      ctx.fillStyle = isWarning && i % 2 === 0 ? '#f43f5e' : '#c084fc';
      ctx.fillRect(tx - 1, tyBase - maxH - 2, 2, 3);
    }

    if (this.isFullyBurrowed) {
      const eyeBaseX = cx + this.facing * 12;
      const eyeY = cy - 2;
      ctx.globalAlpha = 0.96;
      ctx.fillStyle = isWarning ? '#ff1e56' : '#e11d48';
      ctx.fillRect(eyeBaseX - 11, eyeY - 2, 8, 3);
      ctx.fillRect(eyeBaseX + 3, eyeY - 2, 8, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(eyeBaseX - 8 + (this.facing > 0 ? 2 : 0), eyeY - 2, 3, 2);
      ctx.fillRect(eyeBaseX + 6 + (this.facing > 0 ? 2 : 0), eyeY - 2, 3, 2);
    }

    if (isWarning) {
      const lockRx = Math.round(94 - warnU * 40);
      const lockRy = Math.max(9, Math.round(lockRx * 0.25));
      this.drawPixelOvalRing(
        ctx,
        cx,
        cy,
        lockRx,
        lockRy,
        warnU > 0.65 && pulse > 0 ? '#ffffff' : '#f43f5e',
        0.55 + warnU * 0.42,
        2
      );

      ctx.globalAlpha = 0.55 + warnU * 0.42;
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(cx - lockRx - 6, cy - 1, 8, 3);
      ctx.fillRect(cx + lockRx - 2, cy - 1, 8, 3);
      ctx.fillRect(cx - 2, cy - lockRy - 4, 4, 6);
      ctx.fillRect(cx - 2, cy + lockRy - 2, 4, 6);

      const needleH = Math.round(18 + warnU * 42);
      ctx.globalAlpha = 0.38 + warnU * 0.48;
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(cx - 2, cy - needleH, 4, needleH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1, cy - Math.round(needleH * 0.72), 2, Math.round(needleH * 0.72));
    }
    ctx.restore();
  }

  /**
   * Renders Malakor EX's Summoned `12.5s` Living Death Companions (`reaper_companions.png`)
   * with pixel-pure sanctum floor rings (`0` `.ellipse()`, `0` `.arc()`!).
   */
  drawDeathCompanions(ctx, sprites, renderer = null) {
    if (this.isDead || !this.deathCompanions || this.deathCompanions.length === 0) return;

    const compSheet = this.getCompanionSheet();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    const mage = this.deathCompanions.find((c) => c && !c.isDead && c.role === 'mage') || null;
    const healer = this.deathCompanions.find((c) => c && !c.isDead && c.role === 'healer') || null;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (mage && healer) {
      const sx = healer.x + healer.facing * 18;
      const sy = healer.y - 84;
      const tx = mage.x - mage.facing * 10;
      const ty = mage.y - 86;
      const isChanneling =
        this.state === 'TRUE_ULTIMATE' || healer.castAnimTimer > 0 || mage.soulEmpoweredTimer > 0;
      const nodeCount = isChanneling ? 8 : 5;

      for (let i = 1; i <= nodeCount; i++) {
        const u = i / (nodeCount + 1) + ((this.soulOrbitPhase * 0.45) % (1 / (nodeCount + 1)));
        const clampedU = Math.min(0.96, Math.max(0.04, u));
        const nx = Math.round(sx + (tx - sx) * clampedU);
        const ny = Math.round(sy + (ty - sy) * clampedU - Math.sin(clampedU * Math.PI) * 22);
        const isEmeraldSide = clampedU < 0.56;

        ctx.globalAlpha = isChanneling ? 0.90 : 0.60;
        ctx.fillStyle = isEmeraldSide ? '#10b981' : '#c084fc';
        ctx.fillRect(nx - 4, ny - 2, 8, 4);
        ctx.fillRect(nx - 2, ny - 4, 4, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(nx - 1, ny - 1, 2, 2);

        if (isChanneling && vfxSheet?.complete && i % 2 === 1) {
          const wispCol = Math.floor(((this.soulOrbitPhase * 12 + i * 5) % 30 + 30) % 30);
          this.drawBloomedVfxCell(ctx, vfxSheet, 1, wispCol, nx, ny, 32, 32, 0.52, false, renderer, 'violet');
        }
      }
    }

    const ordered = [...this.deathCompanions].sort((a, b) =>
      a.role === b.role ? 0 : a.role === 'healer' ? -1 : 1
    );

    for (const comp of ordered) {
      if (!comp || comp.isDead || comp.life <= 0) continue;
      const isMage = comp.role === 'mage';
      const cx = Math.round(comp.x);
      const cy = Math.round(comp.y);
      const gy = Math.round(comp.groundY || this.groundY);
      const lifeFade = comp.life < 0.45 ? Math.max(0.15, comp.life / 0.45) : 1.0;
      const inCastPose = comp.castAnimTimer > 0 || this.state === 'TRUE_ULTIMATE';
      const hasShield = (comp.shield || 0) > 0;

      this.drawPixelOvalFill(ctx, cx, gy + 2, 36, 9, '#03010a', 0.60 * lifeFade);
      this.drawPixelOvalRing(
        ctx,
        cx,
        gy + 2,
        40 + Math.sin(comp.hoverPhase * 2) * 3,
        10,
        isMage ? '#d946ef' : '#34d399',
        (inCastPose ? 0.86 : 0.56) * lifeFade,
        2
      );
      if (hasShield) {
        this.drawPixelOvalRing(ctx, cx, gy + 2, 46, 12, '#67e8f9', 0.52 * lifeFade, 2);
      }

      const glowImg = isMage
        ? renderer?.glowViolet || renderer?.glowPurple || renderer?.glowCrimson
        : renderer?.glowGreen || renderer?.glowTeal || renderer?.glowGold || renderer?.glowViolet;
      if (glowImg) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (inCastPose ? 0.16 : 0.09) * lifeFade;
        ctx.drawImage(glowImg, cx - 72, cy - 148, 144, 144);
        ctx.restore();
      }

      const drawW = isMage ? 174 : 170;
      const drawH = drawW;
      let row = isMage ? 0 : 2;
      let col = Math.floor(((comp.hoverPhase * 9.2) % 30 + 30) % 30);
      if (comp.castAnimTimer > 0) {
        row = isMage ? 1 : 3;
        const castDur = isMage ? 0.62 : 0.66;
        const uCast = Math.min(1, Math.max(0, 1 - comp.castAnimTimer / castDur));
        col = Math.min(29, Math.floor(uCast * 30));
      } else if (this.state === 'TRUE_ULTIMATE') {
        row = isMage ? 1 : 3;
        col = Math.floor((((this.stateTimer || 0) * 20 + (isMage ? 0 : 8)) % 30 + 30) % 30);
      }

      if (compSheet && compSheet.complete && compSheet.naturalWidth) {
        const sx = col * 208;
        const sy = row * 208;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(cx, cy + 4);
        ctx.scale(comp.facing || 1, 1);
        ctx.globalAlpha = lifeFade;
        ctx.drawImage(compSheet, sx, sy, 208, 208, -drawW * 0.5, -drawH, drawW, drawH);

        if (comp.hitFlash > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.68 * lifeFade;
          ctx.drawImage(compSheet, sx, sy, 208, 208, -drawW * 0.5, -drawH, drawW, drawH);
        }
        ctx.restore();
      } else {
        ctx.globalAlpha = 0.85 * lifeFade;
        ctx.fillStyle = isMage ? '#7e22ce' : '#059669';
        ctx.fillRect(cx - 18, cy - 96, 36, 86);
      }

      if (hasShield) {
        for (const side of [-1, 1]) {
          const wx = cx + side * 32;
          const wy = cy - 78 + Math.round(Math.sin(comp.hoverPhase * 2.2 + side) * 4);
          ctx.globalAlpha = 0.84 * lifeFade;
          ctx.fillStyle = '#0891b2';
          ctx.fillRect(wx - 2, wy - 7, 4, 14);
          ctx.fillStyle = '#a5f3fc';
          ctx.fillRect(wx - 1, wy - 5, 2, 10);
        }
      }

      if (isMage && comp.soulEmpoweredTimer > 0) {
        for (let m = 0; m < 3; m++) {
          const ang = comp.hoverPhase * 1.9 + (m * Math.PI * 2) / 3;
          const mx = Math.round(cx + Math.cos(ang) * 36);
          const my = Math.round(cy - 78 + Math.sin(ang) * 14);
          ctx.globalAlpha = 0.92 * lifeFade;
          ctx.fillStyle = m % 2 === 0 ? '#34d399' : '#e879f9';
          ctx.fillRect(mx - 3, my - 2, 6, 4);
          ctx.fillRect(mx - 2, my - 3, 4, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mx - 1, my - 1, 2, 2);
        }
      }

      const barW = 54;
      const barX = cx - Math.floor(barW * 0.5);
      const barY = cy - 154;
      const hpFrac = Math.max(0, Math.min(1, comp.hp / Math.max(1, comp.maxHp)));
      const shieldFrac = Math.max(0, Math.min(1, (comp.shield || 0) / Math.max(1, comp.maxShield || 60)));
      const lifeFrac = Math.max(0, Math.min(1, comp.life / Math.max(0.1, comp.maxLife)));

      ctx.globalAlpha = 0.95 * lifeFade;
      ctx.fillStyle = '#05020c';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, 15);
      ctx.fillStyle = hasShield ? '#38bdf8' : isMage ? '#a21caf' : '#059669';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, 1);
      ctx.fillRect(barX - 2, barY + 12, barW + 4, 1);
      ctx.fillRect(barX - 2, barY - 2, 1, 15);
      ctx.fillRect(barX + barW + 1, barY - 2, 1, 15);

      ctx.fillStyle = '#0c1929';
      ctx.fillRect(barX, barY, barW, 2);
      if (shieldFrac > 0) {
        const shW = Math.max(2, Math.round(barW * shieldFrac));
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(barX, barY, shW, 2);
        ctx.fillStyle = '#ecfeff';
        ctx.fillRect(barX, barY, shW, 1);
      }

      const hpY = barY + 3;
      ctx.fillStyle = '#140b24';
      ctx.fillRect(barX, hpY, barW, 5);

      const fillW = Math.max(hpFrac > 0 ? 2 : 0, Math.round(barW * hpFrac));
      if (fillW > 0) {
        ctx.fillStyle = hpFrac < 0.34 ? '#f43f5e' : isMage ? '#c026d3' : '#10b981';
        ctx.fillRect(barX, hpY, fillW, 5);
        ctx.fillStyle = hpFrac < 0.34 ? '#fda4af' : isMage ? '#f5d0fe' : '#a7f3d0';
        ctx.fillRect(barX, hpY, fillW, 2);
      }

      ctx.fillStyle = '#05020c';
      for (let tickHp = 100; tickHp < comp.maxHp; tickHp += 100) {
        const txTick = barX + Math.round((tickHp / comp.maxHp) * barW);
        ctx.fillRect(txTick, hpY, 1, 5);
      }

      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(barX, barY + 9, barW, 2);
      const lifeW = Math.max(1, Math.round(barW * lifeFrac));
      ctx.fillStyle = isMage ? '#e879f9' : '#fde047';
      ctx.fillRect(barX, barY + 9, lifeW, 2);

      const iconX = barX - 9;
      const iconY = barY + 5;
      ctx.fillStyle = isMage ? '#d946ef' : '#34d399';
      ctx.fillRect(iconX - 3, iconY - 1, 6, 2);
      ctx.fillRect(iconX - 1, iconY - 3, 2, 6);
      ctx.fillStyle = isMage ? '#ffffff' : '#fef08a';
      ctx.fillRect(iconX - 1, iconY - 1, 2, 2);
    }

    ctx.restore();
  }

  drawPixelSlashStreak(
    ctx,
    cx,
    cy,
    halfW = 320,
    halfH = 132,
    alpha = 1.0,
    outerColor = '#d946ef',
    midColor = '#f43f5e',
    coreColor = '#ffffff'
  ) {
    if (!ctx?.fillRect || alpha <= 0.02) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'lighter';

    const steps = 28;
    for (let s = -steps; s <= steps; s++) {
      const u = s / steps;
      const taper = 1 - Math.abs(u) * 0.72;
      const thickOuter = Math.max(2, Math.round(7 * taper));
      const thickCore = Math.max(1, Math.round(2 * taper));
      const xOff = Math.round(u * halfW);
      const yOff = Math.round(u * halfH);
      const segW = Math.max(6, Math.ceil((halfW * 2) / (steps * 2)) + 2);

      ctx.globalAlpha = Math.min(1, alpha * 0.36);
      ctx.fillStyle = outerColor;
      ctx.fillRect(Math.round(cx + xOff - segW * 0.5), Math.round(cy + yOff - thickOuter * 0.5), segW, thickOuter);
      ctx.fillStyle = midColor;
      ctx.fillRect(Math.round(cx + xOff - segW * 0.5), Math.round(cy - yOff - thickOuter * 0.5), segW, thickOuter);

      ctx.globalAlpha = Math.min(1, alpha * 0.76);
      ctx.fillStyle = coreColor;
      ctx.fillRect(Math.round(cx + xOff - segW * 0.5), Math.round(cy + yOff - thickCore * 0.5), segW, thickCore);
      ctx.fillRect(Math.round(cx + xOff - segW * 0.5), Math.round(cy - yOff - thickCore * 0.5), segW, thickCore);
    }

    const horizSpan = Math.round(halfW * 1.16);
    ctx.globalAlpha = Math.min(1, alpha * 0.42);
    ctx.fillStyle = midColor;
    ctx.fillRect(Math.round(cx - horizSpan), Math.round(cy - 2), horizSpan * 2, 4);
    ctx.globalAlpha = Math.min(1, alpha * 0.80);
    ctx.fillStyle = coreColor;
    ctx.fillRect(Math.round(cx - Math.round(horizSpan * 0.94)), Math.round(cy - 1), Math.round(horizSpan * 1.88), 2);

    ctx.globalAlpha = Math.min(1, alpha * 0.72);
    ctx.fillStyle = outerColor;
    ctx.fillRect(Math.round(cx - 20), Math.round(cy - 3), 40, 6);
    ctx.fillRect(Math.round(cx - 3), Math.round(cy - 24), 6, 48);
    ctx.fillStyle = coreColor;
    ctx.fillRect(Math.round(cx - 12), Math.round(cy - 1), 24, 2);
    ctx.fillRect(Math.round(cx - 1), Math.round(cy - 16), 2, 32);

    ctx.restore();
  }

  drawRazorScars(ctx) {
    if (!ctx?.fillRect || this.razorScars.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this.razorScars.length; i++) {
      const s = this.razorScars[i];
      const u = Math.min(1, s.age / s.maxLife);
      const fade = u < 0.15 ? 1.0 : Math.max(0, 1 - (u - 0.15) / 0.85);
      if (fade <= 0.02) continue;

      const dx = s.x1 - s.x0;
      const dy = s.y1 - s.y0;
      const steps = Math.max(12, Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
      ctx.globalAlpha = Math.min(1, fade * 0.96);

      for (let k = 0; k <= steps; k++) {
        const su = k / steps;
        const taper = Math.sin(su * Math.PI);
        if (taper <= 0.08) continue;
        const px = Math.round((s.x0 + dx * su) / 2) * 2;
        const py = Math.round((s.y0 + dy * su) / 2) * 2;
        const rad = Math.max(2, Math.round(taper * 6) * 2);

        ctx.fillStyle = s.isCrimson ? '#3b0764' : '#581c87';
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        const mid = Math.max(2, rad - 2);
        ctx.fillStyle = s.isCrimson ? '#f43f5e' : '#c084fc';
        ctx.fillRect(px - mid, py - mid, mid * 2, mid * 2);
        if (taper > 0.35) {
          ctx.fillStyle = '#fdf4ff';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }
    }
    ctx.restore();
  }

  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx?.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    this.drawRazorScars(ctx);

    const sprites = this.getExSprites();
    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;

    if (this.darkMagicOrbs && this.darkMagicOrbs.length > 0 && ctx?.fillRect) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const orb of this.darkMagicOrbs) {
        const ox = Math.round(orb.x / 2) * 2;
        const oy = Math.round(orb.y / 2) * 2;
        const isEmp = Boolean(orb.isEmpowered);
        const coreR = isEmp ? 10 : 8;

        if (vfxSheet?.complete && vfxSheet.naturalWidth) {
          const orbCol = Math.floor(((orb.age * 36) % 30 + 30) % 30);
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            1,
            orbCol,
            ox,
            oy,
            isEmp ? 86 : 70,
            isEmp ? 86 : 70,
            0.90,
            (orb.vx || 1) < 0,
            renderer,
            isEmp ? 'crimson' : 'violet'
          );
        }

        // Pixel-stepped Dark-Matter Void Orb core (`fillRect` only — zero `.arc()`!)
        this.drawPixelOvalFill(ctx, ox, oy, coreR + 4, coreR + 4, isEmp ? '#f43f5e' : '#a855f7', 0.72);
        this.drawPixelOvalFill(ctx, ox, oy, coreR, coreR, '#020008', 0.98);
        this.drawPixelOvalRing(ctx, ox, oy, coreR, coreR, isEmp ? '#fda4af' : '#f0abfc', 0.96, 2);

        ctx.globalAlpha = 0.98;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox - 4, oy - 4, 4, 2);
        if (isEmp) {
          const spAng = orb.age * 18;
          ctx.fillStyle = '#6ee7b7';
          ctx.fillRect(
            Math.round(ox + Math.cos(spAng) * (coreR + 5)) - 2,
            Math.round(oy + Math.sin(spAng) * (coreR + 5)) - 2,
            4,
            4
          );
        }
      }
      ctx.restore();
    }

    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;

    if (!this.isDead && !this.isSubmerged && !this.isFullyBurrowed && this.soulStacks > 0) {
      const lanternX = this.x - this.facing * 26;
      const lanternY = this.y - 118;
      const isMaxCrimson = this.soulStacks >= this.maxSoulStacks;
      for (let s = 0; s < this.soulStacks; s++) {
        const ang = this.soulOrbitPhase + (s / this.soulStacks) * Math.PI * 2;
        const ox = lanternX + Math.cos(ang) * 28;
        const oy = lanternY + Math.sin(ang) * 12;
        const col = Math.floor(((this.soulOrbitPhase * 8 + s * 6) % 30 + 30) % 30);
        this.drawBloomedVfxCell(ctx, vfxSheet, 1, col, ox, oy, 28, 28, 0.72, false, renderer, isMaxCrimson ? 'crimson' : 'violet');
      }
    }

    if (this.severedSoul && this.severedSoul.life > 0 && this.severedSoul.target && !this.severedSoul.target.isDead) {
      const ss = this.severedSoul;
      const tgt = ss.target;
      const fade = Math.min(1, ss.life * 2.4);
      const pulseCol = Math.floor(((2.60 - ss.life) * 28) % 30);
      const effY = ss.y + Math.sin(this.soulOrbitPhase * 1.8) * 6;

      const tgtY = tgt.y - 96;
      for (let k = 1; k <= 4; k++) {
        const u = k / 5;
        const lx = ss.x + (tgt.x - ss.x) * u;
        const ly = effY + (tgtY - effY) * u - Math.sin(u * Math.PI) * 14;
        this.drawBloomedVfxCell(ctx, vfxSheet, 1, (pulseCol + k * 5) % 30, lx, ly, 38, 38, fade * 0.72, false, renderer, k % 2 === 0 ? 'crimson' : 'violet');
      }

      this.drawBloomedVfxCell(ctx, vfxSheet, 6, pulseCol, ss.x, effY, 176, 176, fade * 0.76, false, renderer, 'violet');
      this.drawBloomedVfxCell(ctx, vfxSheet, 1, pulseCol, ss.x, effY, 142, 142, fade * 0.96, tgt.x < ss.x, renderer, 'crimson');
    }

    if (this.scytheWave) {
      const sw = this.scytheWave;
      const col = Math.min(29, Math.floor((sw.age / sw.maxLife) * 30));
      this.drawBloomedVfxCell(ctx, vfxSheet, 0, col, sw.x, sw.y, 164, 164, 0.95, sw.dir < 0, renderer, 'violet');
    }

    const bs = this.activeScytheBoomerang || this.activeBoomerangScythe;
    if (bs) {
      const col = Math.floor((bs.timer * 38) % 30);
      this.drawBloomedVfxCell(ctx, vfxSheet, 0, col, bs.x, bs.y, 168, 168, 0.96, bs.dir < 0, renderer, bs.phase === 'return' ? 'crimson' : 'violet');
      this.drawBloomedVfxCell(ctx, vfxSheet, 1, col, bs.x, bs.y, 104, 104, 0.84, bs.dir < 0, renderer, 'crimson');
    }

    if (!this.isFullyBurrowed) {
      const tx = this.x;
      const ty = this.y - 96;
      for (const w of this.soulWisps) {
        if (w.life < 0) continue;
        const u = Math.min(1, w.life / w.maxLife);
        const wx = w.startX + (tx - w.startX) * u;
        const wy = w.startY + (ty - w.startY) * u + Math.sin(u * Math.PI) * w.arcHeight;
        const col = Math.min(29, Math.floor(u * 30));
        const fade = Math.sin(u * Math.PI);
        this.drawBloomedVfxCell(ctx, vfxSheet, 1, col, wx, wy, 56, 56, fade * 0.78, tx < w.startX, renderer, w.glowColor || 'violet');
      }
    }

    for (const v of this.activeVfxAnims) {
      if (!v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / v.maxLife));
      const span = Math.max(1, v.endFrame - v.startFrame + 1);
      const col = Math.min(29, v.startFrame + Math.floor(u * span));
      const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
      const drawY = v.row === 2 ? this.groundY - Math.round(v.h * (34 / 104)) : v.y;
      this.drawBloomedVfxCell(ctx, vfxSheet, v.row, col, v.x, drawY, v.w, v.h, fade * 0.95, v.flipX, renderer, v.glowColor);
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = this.getExSprites();
    if (!sprites) return;

    const hasLivingCovenant =
      !this.isDead &&
      this.deathCompanions &&
      this.deathCompanions.some((c) => c && !c.isDead && c.life > 0);

    if (!isReflection) {
      this.drawBurrowShadowIndicator(ctx);
      this.drawDeathCompanions(ctx, sprites, renderer);
    }

    if (!this.isFullyBurrowed) {
      const isBurrowPlunging = !isReflection && this.state === 'CROUCH' && this.isSubmerged;

      if (!isReflection && !this.isDead && (this.graveWardTimer > 0 || hasLivingCovenant) && ctx?.fillRect) {
        const wardAlpha =
          this.graveWardTimer > 0 ? Math.min(0.84, 0.35 + this.graveWardTimer * 0.32) : 0.62;
        this.drawPixelOvalRing(
          ctx,
          this.x,
          this.groundY + 2,
          52,
          12,
          hasLivingCovenant ? '#34d399' : '#c084fc',
          wardAlpha * 0.65,
          2
        );

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (let w = 0; w < 4; w++) {
          const ang = this.soulOrbitPhase * 1.6 + (w * Math.PI) / 2;
          const wx = Math.round(this.x + Math.cos(ang) * 42);
          const wy = Math.round(this.y - 78 + Math.sin(ang) * 16);
          ctx.globalAlpha = wardAlpha;
          ctx.fillStyle = '#090314';
          ctx.fillRect(wx - 3, wy - 7, 6, 14);
          ctx.fillStyle = hasLivingCovenant && w % 2 === 0 ? '#6ee7b7' : '#e879f9';
          ctx.fillRect(wx - 1, wy - 5, 2, 10);
        }
        ctx.restore();
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      const w = 208;
      const h = 208;
      const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
      const scale = this.giantScale || 1.0;

      const groundPlantOffset = 4;
      // Full 234px plunge for the 320x240 wide-canvas Great-Scythe + horns cleanly clipped at groundY!
      const sinkOffset = isBurrowPlunging
        ? Math.round(Math.min(1, Math.max(0, this.submergeDepth || 0)) * 234)
        : 0;

      if (isBurrowPlunging && sinkOffset > 2 && ctx?.rect && ctx?.clip) {
        ctx.beginPath();
        ctx.rect(this.x - 224, this.groundY - 280, 448, 282);
        ctx.clip();
      }

      ctx.translate(
        Math.round(this.x),
        Math.round(this.y + groundPlantOffset + sinkOffset)
      );
      ctx.scale(this.facing * scale, scale);

      if (!isReflection && this.wraithAlpha < 0.99) {
        ctx.globalAlpha = this.wraithAlpha;
      }

      PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

      if (this.hitFlash > 0 && !isReflection) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5;
        PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
      }

      ctx.restore();
    }

    if (!isReflection && this._ultSlashFlash > 0) {
      const ultSlashAlpha = Math.min(1, this._ultSlashFlash / 0.22);
      this.drawPixelSlashStreak(
        ctx,
        this._ultSlashCenterX || this.x,
        this.groundY - 110,
        280,
        126,
        ultSlashAlpha,
        '#d946ef',
        '#f43f5e',
        '#ffffff'
      );
    }

    const vfxSheet = PixelForge.ensureImage?.(sprites?.vfx) || sprites?.vfx;
    if (!isReflection && vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.25 && this.stateTimer <= 3.30) {
        const bindX =
          this._trueUltEnemy && !this._trueUltEnemy.isDead
            ? this._trueUltEnemy.x
            : this._trueUltAltarX;
        const bindY = this.groundY - 108;
        const bindCol = Math.min(29, Math.floor(((this.stateTimer - 1.25) * 24) % 30));
        const bindFade =
          this.stateTimer > 3.12 ? Math.max(0, 1 - (this.stateTimer - 3.12) / 0.18) : 0.97;
        this.drawBloomedVfxCell(ctx, vfxSheet, 6, bindCol, bindX, bindY, 356, 356, bindFade, false, renderer, 'crimson');

        if (this.stateTimer >= 2.36 && this.stateTimer < 3.15 && ctx?.fillRect) {
          const uLock = Math.min(1, Math.max(0, (this.stateTimer - 2.36) / 0.78));
          const bracketDist = Math.round(92 - uLock * 56);
          const ax = Math.round(this._trueUltAltarX);
          const ay = Math.round(bindY);
          const topY = Math.round(this.y - 72);

          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.42 + uLock * 0.52;
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(ax - 3, topY, 6, Math.max(12, this.groundY - topY));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ax - 1, topY, 2, Math.max(12, this.groundY - topY));

          ctx.fillStyle = uLock > 0.72 ? '#ffffff' : '#fda4af';
          for (const sxSign of [-1, 1]) {
            for (const sySign of [-1, 1]) {
              const bx = ax + sxSign * bracketDist;
              const by = ay + sySign * Math.round(bracketDist * 0.72);
              ctx.fillRect(bx - (sxSign > 0 ? 12 : 0), by - 1, 12, 3);
              ctx.fillRect(bx - 1, by - (sySign > 0 ? 12 : 0), 3, 12);
            }
          }
          ctx.restore();
        }
      }

      if (this._trueUltSlashFlash > 0) {
        const uSlash = Math.min(1, Math.max(0, 1 - this._trueUltSlashFlash / 0.98));
        const slashCol = Math.min(29, Math.floor(uSlash * 30));
        const slashAlpha = Math.min(1, (this._trueUltSlashFlash / 0.26) * 0.99);

        this.drawPixelSlashStreak(
          ctx,
          this._trueUltAltarX,
          this.groundY - 128,
          460,
          168,
          slashAlpha,
          '#e879f9',
          '#f43f5e',
          '#ffffff'
        );
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          7,
          slashCol,
          this._trueUltAltarX,
          this.groundY - 134,
          548,
          428,
          slashAlpha,
          this.facing < 0,
          renderer,
          'crimson'
        );
      }
    }
  }
}
