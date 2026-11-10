import { Fighter } from './Fighter.js?v=30fps57';
import { PixelForge } from '../engine/PixelForge.js?v=30fps57';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps57';
import {
  ABYSSAL_EFFECT_REGISTRY,
  ABYSSAL_VIOLET_PALETTE,
  BLOOD_MOON_CRIMSON_PALETTE
} from '../engine/shaders/abyssalShaders.js?v=30fps57';

/**
 * Malakor (`reaper`) — Abyssal Necropolis Harvester & Sovereign of Death.
 * Powered 100% natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D 2.5D shader & particle engine)
 * + `assets/sprites/reaper_sheet.png` (2H Cursed Bone-and-Obsidian Soul-Reaper Great-Scythe)
 * & `assets/sprites/reaper_vfx.png` (zero legacy canvas slashes/shockwaves/bursts/decals).
 */
export class Reaper extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Malakor',
      maxHp: 1235,
      attackRange: 188,
      moveSpeed: 188,
      autoInterval: 1.06,
      lightColor: 'rgba(192, 132, 252, 1)',
      primaryColor: '#c084fc'
    });
    this.heroId = 'reaper';
    this.theme = 'abyssal';
    this.deathSfx = 'death_reaper';
    this.hasPoise = true;
    this.unstoppablePoise = false;
    this.isDeflecting = false;
    this.skillMaxCooldown = 4.95;
    this.skillTriggerRange = 440;
    this.autoDuration = 0.94;
    this.skillDuration = 1.12;
    this.ultDuration = 1.68;
    this.skillName = "DEATH'S GRASP";
    this.ultName = 'GRIM HARVEST: SOVEREIGN OF DEATH';
    this.comboStep = 0;
    this.stepDustTimer = 0;

    // Colossal Lich Sovereign scale (1.0 normal -> 2.25 during GRIM HARVEST: SOVEREIGN OF DEATH)
    this.giantScale = 1.0;

    // 100% Bespoke Soulreaper Harvester Systems
    this.soulWisps = []; // Homing Soul-Leech Wisp orbs (Row 1 of reaper_vfx.png) that heal Malakor
    this.tombstones = []; // Ground-erupting Necrotic Bone & Soul-Crystal Spires (Row 2 of reaper_vfx.png)
    this.boneCage = null; // Cursed Ossuary Bone-Cage grounded on this.groundY during DEATH'S GRASP
    this.faultSpireQueue = []; // Chaining 5-Wave Necrotic Bone & Soul-Crystal Spire Fault-Line queue
    this.deathAvatar = null; // Sovereign of Death state during GRIM HARVEST
    this.activeScytheBoomerang = null; // Returning Twin-Blade Phantom Scythe Boomerang
    this.activeBoomerangScythe = null; // Alias kept in sync with activeScytheBoomerang
    this.afterimages = []; // Crisp HD-2D Wraith Afterimages
    this.activeVfxAnims = []; // Active 30fps reaper_vfx.png cell animations (Rows 0..4)

    // Underground Grave-Submerge & Spectral Wraith Float state
    this.isSubmerged = false;
    this.submergeDepth = 0;
    this.submergeDir = 1;
    this.wraithAlpha = 1.0;

    this.didChainPull = false;
    this.didReapFinisher = false;
    this.ultStage = 0;
    this.dodgeMaxCooldown = 3.60;
    this.dashMaxCooldown = 3.50;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.86;
    this.isCrouching = false;
    this.isFlipVault = false;
    this.flipStartX = this.x;
    this.flipTargetX = this.x;
    this.flipAngle = 0;

    this.fx = new ArcaneShaderFX(ABYSSAL_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });

    if (typeof Image !== 'undefined') {
      const reaperAssets = PixelForge.initAssets()?.reaper;
      if (reaperAssets?.vfx?.src && !reaperAssets.vfx.src.includes('v=30fps57')) {
        reaperAssets.vfx.src = 'assets/sprites/reaper_vfx.png?v=30fps57';
      }
    }
  }

  setState(newState) {
    super.setState(newState);
    if (
      newState !== 'CROUCH' &&
      newState !== 'DODGE' &&
      newState !== 'DASH' &&
      newState !== 'JUMP'
    ) {
      this.fx?.stopByKey('abyssalWraithMantle');
    }
    if (newState !== 'ULTIMATE') {
      this.giantScale = 1.0;
      this.deathAvatar = null;
      this.fx?.stopByKey('deathAvatarCathedral');
      this.fx?.stopByKey('necropolisBoneyardDomain');
    }
    this.unstoppablePoise =
      newState === 'SKILL' ||
      newState === 'ULTIMATE' ||
      (newState === 'AUTO_ATTACK' && this.comboStep % 3 === 2);
    if (newState === 'DEATH') {
      this.giantScale = 1.0;
      this.boneCage = null;
      this.faultSpireQueue = [];
      this.fx?.clear();
    }
  }

  /**
   * Computes the exact grounded center Y for Row 2 (`necroticBoneSpireCell`), whose curved
   * 2.5D ossuary crater base is anchored at `baseY = 34` (+34px from center in 104x104 space):
   *   `this.groundY - Math.round(h * (34 / 104))`
   * (`this.groundY - 68` for `h = 208`, `this.groundY - 78` for `h = 240`).
   */
  getGroundedBoneSpireY(h = 208) {
    return this.groundY - Math.round(h * (34 / 104));
  }

  spawnGroundedBoneSpire(x, h = 208, maxLife = 0.56, opts = {}) {
    const groundedY = this.groundY - Math.round(h * (34 / 104));
    this.spawnVfxAnim(2, x, groundedY, h, h, maxLife, {
      flipX: Boolean(opts.flipX),
      glowColor: opts.glowColor || 'crimson',
      inFront: opts.inFront !== undefined ? Boolean(opts.inFront) : false
    });
  }

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.28, scale = null) {
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + col,
      age: 0,
      maxLife,
      scale: scale || this.giantScale || 1.0
    });
  }

  spawnVfxAnim(row, x, y, w = 208, h = 208, maxLife = 0.44, opts = {}) {
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

  getEffectiveAttackRange() {
    // Hit 3 (Finisher) hurls the Spinning Twin-Blade Phantom Scythe Boomerang up to 405px!
    return this.comboStep % 3 === 2 ? 405 : this.attackRange;
  }

  /**
   * Bespoke Necrotic Soul-Siphon:
   * Rips homing crimson-violet Soul-Leech Wisp orbs (Row 1 + Row 0 of `reaper_vfx.png` +
   * `skeletalChainTetherBeam` comet) out of the enemy that curve back into Malakor's ribcage
   * and heal him (`+14 HP` on Auto-Attack hits!).
   */
  leechLife(amount, sourceEntity, game, label = 'SOUL LEECH') {
    if (this.isDead || amount <= 0) return 0;
    const prevHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const actual = Math.max(1, Math.round(amount));

    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, `${label} +${actual}`, '#e879f9');
      game.vfx.spawnGlyphBurst(this.x, this.y - 98, 5, 'abyssal');
    }

    const fromX = sourceEntity ? sourceEntity.x : this.x + this.facing * 120;
    const fromY = sourceEntity ? sourceEntity.y - 96 : this.y - 96;
    const count = Math.min(5, Math.max(2, Math.round(actual / 7)));
    for (let i = 0; i < count; i++) {
      this.soulWisps.push({
        startX: fromX + (Math.random() - 0.5) * 36,
        startY: fromY + (Math.random() - 0.5) * 36,
        arcHeight: -45 - Math.random() * 65 + (i % 2 === 0 ? -25 : 25),
        life: -i * 0.045,
        maxLife: 0.48 + Math.random() * 0.14,
        glowColor: i % 2 === 0 ? 'violet' : 'crimson'
      });
    }
    this.fx?.spawn('skeletalChainTetherBeam', fromX, fromY, {
      light: 1.26,
      extra: {
        dx: this.x - fromX,
        dy: this.y - 96 - fromY,
        arcH: -60,
        isCrimson: count % 2 === 0,
        isComet: true,
        showClaw: false,
        customDuration: 0.48
      }
    });
    return this.hp - prevHp;
  }

  /**
   * EruptsMalakor's Cursed Ossuary Bone-Cage (`this.boneCage`) grounded directly on `this.groundY`
   * around `enemyX`, trapping the hooked enemy between twin grounded `necroticBoneSpireCell`
   * ossuary pillars (`this.groundY - 68` for `h = 208`)!
   */
  spawnOssuaryBoneCage(enemyX, game) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const cx = Math.max(105, Math.min(ww - 105, enemyX));
    this.boneCage = {
      x: cx,
      groundY: this.groundY,
      radius: 76,
      life: 2.15,
      maxLife: 2.15
    };
    this.tombstones = [];
    const offsets = [-72, 72];
    for (let i = 0; i < offsets.length; i++) {
      const tx = Math.max(90, Math.min(ww - 90, cx + offsets[i]));
      this.tombstones.push({
        x: Math.round(tx / 4) * 4,
        groundY: this.groundY,
        size: 208,
        delay: i * 0.03,
        life: 2.15,
        maxLife: 2.15,
        shattered: false,
        isPrison: true,
        seed: i * 2.3
      });
    }
    this.fx?.spawn('necroticGraveyardSigil', cx, this.groundY - 4, {
      palette: BLOOD_MOON_CRIMSON_PALETTE,
      light: 1.34,
      extra: { radius: 36, isPrison: true, isCrimson: true, customDuration: 1.55 }
    });
  }

  spawnTombstonePrison(enemyX, game) {
    this.spawnOssuaryBoneCage(enemyX, game);
  }

  /**
   * Spawns the Spinning Twin-Blade Phantom Scythe Boomerang (`this.activeScytheBoomerang`
   * + Row 0 & Row 1 `reaper_vfx.png`) that slices through enemies on both outbound and return flight!
   */
  spawnBoomerangScythe() {
    const startX = this.x + this.facing * 56;
    const startY = this.y - 100;
    const boomerang = {
      x: startX,
      y: startY,
      startX,
      targetX: startX + this.facing * 395,
      dir: this.facing,
      phase: 'outbound', // 'outbound' -> 'hover' -> 'return'
      timer: 0,
      angle: 0,
      hitOutbound: false,
      hitHover: false,
      hitReturn: false
    };
    this.activeScytheBoomerang = boomerang;
    this.activeBoomerangScythe = boomerang;
  }

  /**
   * Queues a Chaining 5-Wave Necrotic Bone & Soul-Crystal Spire Fault-Line across `this.groundY`
   * during the climax of `GRIM HARVEST: SOVEREIGN OF DEATH`!
   * Every Row 2 `necroticBoneSpireCell` (`h = 240`) is strictly grounded at
   * `this.groundY - Math.round(240 * (34 / 104))` (`this.groundY - 78`) and every
   * `deathAvatarCathedral` is anchored on `this.groundY - 4`.
   */
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
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
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
   * CROUCH: "ABYSSAL GRAVE-SUBMERGE & RISING SCYTHE UPPERCUT"
   */
  startCrouch(enemy, game) {
    this.crouchCooldown = 4.65;
    this.crouchDuration = 0.86;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isSubmerged = true;
    this.submergeDepth = 0;
    this.didActionFrame = false;
    this.submergeDir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
    this.facing = this.submergeDir;
    this.vx = 0;
    this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY - 4, {
      follow: this,
      offsetX: 0,
      offsetY: -4,
      useGroundY: true,
      light: 1.28,
      extra: { radius: 30, isSubmerged: true }
    });
    this.fx?.spawn('necroticGraveyardSigil', this.x, this.groundY - 4, {
      palette: ABYSSAL_VIOLET_PALETTE,
      light: 1.2,
      extra: { radius: 26, isPrison: false, customDuration: 0.48 }
    });
    if (game && game.audio) game.audio.play('soul_drain', this.x);
    if (game && game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 7, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 126, 0, false, 'GRAVE SUBMERGE!', '#e879f9');
    }
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.40;
    this.isDeflecting = true;
    this.isSubmerged = false;
    this.submergeDepth = 0.45;
    this.isWraithPhase = false;
    this.vx = dir * 485;
    this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY - 4, {
      follow: this,
      offsetX: 0,
      offsetY: -4,
      useGroundY: true,
      maxDuration: 0.38,
      light: 1.22,
      extra: { radius: 24, isSubmerged: false }
    });
    if (game.audio) game.audio.play('scythe_reap', this.x);
    if (game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 6, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'WRAITH RUSH!', '#c084fc');
    }
  }

  onStartDodge(enemy, game, dir, forceJump = false) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 0;
    const nearWall = this.x < 280 || this.x > ww - 280;

    // 1. SPECTRAL WRAITH FLOAT-LEAP & AERIAL GUILLOTINE (Row 8 JUMP)
    if (forceJump || (nearWall && dist < 265)) {
      this.isFlipVault = true;
      this.isWraithPhase = false;
      this.isSubmerged = false;
      this.wraithAlpha = 0.46;
      this.flipStartX = this.x;
      this.flipAngle = 0;
      this.wallFlipCooldown = 3.2;
      this.dashDuration = 0.64;

      if (enemy && !enemy.isDead) {
        const approachSide = this.x < enemy.x ? -76 : 76;
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
        maxDuration: 0.58,
        light: 1.24,
        extra: { radius: 26, isSubmerged: false, isCrimson: true }
      });
      this.fx?.spawn('necroticGraveyardSigil', this.x, this.groundY - 4, {
        palette: ABYSSAL_VIOLET_PALETTE,
        light: 1.18,
        extra: { radius: 24, isPrison: false, customDuration: 0.42 }
      });
      if (game.audio) game.audio.play('soul_drain', this.x);
      if (game.vfx) {
        game.vfx.spawnGlyphBurst(this.x, this.y - 60, 7, 'abyssal');
        game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'WRAITH GLIDE!', '#e879f9');
      }
      return;
    }

    // 2. WRAITH PHASE-SHIFT AMBUSH (Sinks underground and phases through the enemy's back!)
    if (enemy && !enemy.isDead && dist <= 225) {
      this.isFlipVault = false;
      this.isWraithPhase = true;
      this.isSubmerged = true;
      this.submergeDepth = 0.92;
      this.dashDuration = 0.34;
      this.isDeflecting = true;
      this.phaseStartX = this.x;
      const passDir = Math.sign(enemy.x - this.x) || this.facing;
      let behindX = enemy.x + passDir * 148;
      if (behindX < 105 || behindX > ww - 105) {
        behindX = enemy.x - passDir * 148;
      }
      this.phaseTargetX = Math.max(95, Math.min(ww - 95, behindX));
      this.dashDir = Math.sign(this.phaseTargetX - this.phaseStartX) || passDir;
      this.vx = 0;
      this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY - 4, {
        follow: this,
        offsetX: 0,
        offsetY: -4,
        useGroundY: true,
        maxDuration: 0.34,
        light: 1.28,
        extra: { radius: 28, isSubmerged: true, isCrimson: true }
      });
      if (game.audio) game.audio.play('soul_drain', this.x);
      if (game.vfx) {
        game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 8, 'abyssal');
        game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'WRAITH PHASE!', '#e879f9');
      }
      return;
    }

    this.isFlipVault = false;
    this.isWraithPhase = false;
    this.isSubmerged = false;
    this.submergeDepth = 0.45;
    this.dashDuration = 0.38;
    this.isDeflecting = true;
    const smartDir = enemy && dist > 195 ? this.facing : dir;
    this.dashDir = smartDir;
    this.vx = smartDir * 445;
    this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY - 4, {
      follow: this,
      offsetX: 0,
      offsetY: -4,
      useGroundY: true,
      maxDuration: 0.36,
      light: 1.22,
      extra: { radius: 24, isSubmerged: false }
    });
    if (game.audio) game.audio.play('soul_drain', this.x);
    if (game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 7, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'GRAVE MELD!', '#e879f9');
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    // Row 8 (30-frame JUMP — Spectral Wraith Float-Leap & Aerial Guillotine!)
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
      this.wraithAlpha = u < 0.60 ? 0.48 : 0.96;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }

      if (u < 0.62 && Math.random() < 0.45) {
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 29)), 0.26);
      }

      // At u >= 0.58: Aerial Guillotine Cleave (Missing-HP Execute Damage!)
      if (u >= 0.58 && !this.didActionFrame) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('scythe_reap', this.x);
        const cx = this.x + this.facing * 52;
        const cy = this.y - 82;

        this.fx?.spawn('soulHarvestScytheArc', cx, cy, {
          flip: this.facing < 0,
          light: 1.38,
          extra: { radiusWorld: 142, isCrimson: true, isCross: true, isUppercut: false }
        });
        this.spawnVfxAnim(4, cx, cy, 208, 208, 0.34, {
          flipX: this.facing < 0,
          glowColor: 'crimson',
          inFront: true
        });
        this.spawnGroundedBoneSpire(cx, 208, 0.48, {
          flipX: this.facing < 0,
          glowColor: 'crimson',
          inFront: false
        });
        if (game.vfx) game.vfx.spawnGlyphBurst(cx, cy, 7, 'abyssal');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 205) {
          const missingRatio = Math.max(0, Math.min(1, 1 - enemy.hp / enemy.maxHp));
          const execDmg = Math.round(38 + missingRatio * 28);
          enemy.takeDamage(execDmg, this, true, -this.facing * 65, -145);
          this.leechLife(14, enemy, game, 'GUILLOTINE REAP');
          if (game.vfx) {
            game.vfx.spawnDamageText(enemy.x, enemy.y - 156, 0, false, '★ GUILLOTINE EXECUTE! ★', '#f43f5e');
          }
          if (game.renderer) game.renderer.triggerShake(12, 0.24);
        }
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.wraithAlpha = 1.0;
        this.isInvulnerable = false;
        this.fx?.spawn('necroticGraveyardSigil', this.x, this.groundY - 4, {
          palette: ABYSSAL_VIOLET_PALETTE,
          light: 1.18,
          extra: { radius: 24, isPrison: false, customDuration: 0.38 }
        });
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

      if (Math.random() < 0.65) {
        this.fx?.burst(this.x, this.groundY - 12, {
          count: 2,
          speedMin: 35,
          speedMax: 95,
          lifeMin: 0.14,
          lifeMax: 0.28,
          gravity: -15,
          colors: ['#ffffff', '#c084fc', '#f43f5e']
        });
      }

      if (t >= this.dashDuration) {
        this.isWraithPhase = false;
        this.isSubmerged = false;
        this.submergeDepth = 0;
        this.isDeflecting = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const speed = this.state === 'DASH' ? 485 : 425;
    this.x += this.dashDir * speed * dt;

    if (Math.random() < 0.55) {
      this.fx?.burst(this.x - this.dashDir * 18, this.groundY - 14, {
        count: 2,
        speedMin: 35,
        speedMax: 95,
        lifeMin: 0.14,
        lifeMax: 0.28,
        gravity: -10,
        colors: ['#ffffff', '#c084fc', '#f43f5e']
      });
    }

    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 160
    ) {
      this.didActionFrame = true;
      enemy.takeDamage(34, this, false, -58, -65);
      this.leechLife(12, enemy, game, 'SOUL HOOK');
      if (game.audio) game.audio.play('scythe_reap', enemy.x);
      this.fx?.spawn('soulHarvestScytheArc', this.x + this.facing * 48, this.y - 96, {
        flip: this.facing < 0,
        light: 1.28,
        extra: { radiusWorld: 126, isCrimson: false, isUppercut: false }
      });
      this.spawnVfxAnim(0, this.x + this.facing * 48, this.y - 96, 176, 176, 0.30, {
        flipX: this.facing < 0,
        glowColor: 'violet',
        inFront: true
      });
    }

    if (t >= this.dashDuration) {
      this.isDeflecting = false;
      this.isSubmerged = false;
      this.submergeDepth = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * CROUCH UPDATE: "ABYSSAL GRAVE-SUBMERGE & RISING 2H SCYTHE UPPERCUT"
   */
  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.86;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;

    if (t < 0.38) {
      this.isCrouching = true;
      this.isSubmerged = true;
      this.isDeflecting = true;
      this.submergeDepth = Math.min(1, t / 0.14);

      if (enemy && !enemy.isDead) {
        const desiredX = enemy.x - this.submergeDir * 78;
        const delta = desiredX - this.x;
        const slideSpeed = Math.min(395, Math.max(195, Math.abs(delta) * 3.8));
        this.x += Math.sign(delta || this.submergeDir) * slideSpeed * dt;
      } else {
        this.x += this.submergeDir * 310 * dt;
      }
      this.x = Math.max(90, Math.min(ww - 90, this.x));

      if (Math.random() < 0.65) {
        this.fx?.burst(this.x, this.groundY - 8, {
          count: 2,
          speedMin: 35,
          speedMax: 90,
          lifeMin: 0.14,
          lifeMax: 0.26,
          gravity: -18,
          colors: ['#ffffff', '#c084fc', '#f43f5e']
        });
      }
    } else if (!this.didActionFrame) {
      // ERUPT UPWARD OUT OF THE GRAVE SHADOW MANTLE WITH A RISING 2H GREAT-SCYTHE UPPERCUT!
      this.didActionFrame = true;
      this.isSubmerged = false;
      this.submergeDepth = 0;
      this.comboStep++;
      this.fx?.stopByKey('abyssalWraithMantle');
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      if (game.audio) game.audio.play('scythe_reap', this.x);
      if (game.renderer) {
        game.renderer.triggerShake(14, 0.28);
        game.renderer.triggerHitStop(0.055);
      }

      const eruptX = this.x + this.facing * 48;
      const eruptY = this.groundY - 96;

      this.fx?.spawn('soulHarvestScytheArc', eruptX, eruptY, {
        flip: this.facing < 0,
        light: 1.38,
        extra: { radiusWorld: 142, isCrimson: true, isUppercut: true }
      });
      this.fx?.spawn('necroticGraveyardSigil', this.x, this.groundY - 4, {
        palette: BLOOD_MOON_CRIMSON_PALETTE,
        light: 1.28,
        extra: { radius: 30, isPrison: false, isCrimson: true, customDuration: 0.56 }
      });
      this.spawnGroundedBoneSpire(eruptX, 208, 0.52, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: false
      });
      this.spawnVfxAnim(4, eruptX, eruptY, 208, 208, 0.34, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: true
      });
      if (game.vfx) {
        game.vfx.spawnGlyphBurst(eruptX, eruptY, 8, 'abyssal');
        game.vfx.spawnDamageText(this.x, this.y - 152, 0, false, '★ GRAVE ERUPTION! ★', '#e879f9');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 195) {
        enemy.takeDamage(46, this, true, -48, -195);
        this.leechLife(14, enemy, game, 'GRAVE HARVEST');
      }
    } else {
      this.submergeDepth = Math.max(0, this.submergeDepth - dt * 5);
    }

    if (t >= dur) {
      this.isCrouching = false;
      this.isSubmerged = false;
      this.submergeDepth = 0;
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  update(dt, enemy, game) {
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);

    // 1. Step Wraith Afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt;
      if (this.afterimages[i].age >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    // 2. Step Active 30fps `reaper_vfx.png` Animations
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

    // 3. Step Chaining 5-Wave Necrotic Bone & Soul-Crystal Spire Fault-Line Queue
    for (let i = this.faultSpireQueue.length - 1; i >= 0; i--) {
      const sp = this.faultSpireQueue[i];
      sp.delay -= dt;
      if (sp.delay <= 0) {
        this.faultSpireQueue.splice(i, 1);
        const h = sp.h || 240;
        // Strictly grounded at this.groundY - Math.round(h * (34 / 104)) (this.groundY - 78 for h=240!)
        this.spawnGroundedBoneSpire(sp.x, h, 0.72, {
          glowColor: sp.wave % 2 === 0 ? 'crimson' : 'violet',
          inFront: false
        });
        this.fx?.spawn('necroticGraveyardSigil', sp.x, this.groundY - 4, {
          palette: sp.wave % 2 === 0 ? BLOOD_MOON_CRIMSON_PALETTE : ABYSSAL_VIOLET_PALETTE,
          light: 1.32,
          extra: { radius: 34, isPrison: true, isCrimson: sp.wave % 2 === 0, customDuration: 0.64 }
        });
        if (sp.wave === 0 || sp.wave === 2 || sp.wave === 4) {
          this.fx?.spawn('deathAvatarCathedral', sp.x, this.groundY - 4, {
            light: 1.38
          });
        }
        if (enemy && !enemy.isDead && Math.abs(enemy.x - sp.x) <= 78) {
          enemy.takeDamage(16, this, true, this.facing * 45, -95);
          this.leechLife(8, enemy, game, 'OSSUARY SPIRE');
        }
      }
    }

    // 4. Advance Spinning Twin-Blade Phantom Scythe Boomerang (`this.activeScytheBoomerang` + Row 0 & Row 1 `reaper_vfx.png`)
    const bs = this.activeScytheBoomerang || this.activeBoomerangScythe;
    if (bs) {
      bs.timer += dt;
      bs.angle += dt * 28;

      if (bs.phase === 'outbound') {
        bs.x += bs.dir * 690 * dt;
        if (
          !bs.hitOutbound &&
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - bs.x) < 58 &&
          Math.abs(enemy.y - 96 - bs.y) < 88
        ) {
          bs.hitOutbound = true;
          enemy.takeDamage(30, this, false, -42, -55);
          this.leechLife(14, enemy, game, 'PHANTOM SCYTHE');
          this.spawnVfxAnim(1, bs.x, bs.y, 128, 128, 0.28, {
            glowColor: 'violet',
            inFront: true
          });
          if (game.vfx) game.vfx.spawnGlyphBurst(bs.x, bs.y, 5, 'abyssal');
        }
        if (Math.abs(bs.x - bs.startX) >= 395 || bs.timer >= 0.56) {
          bs.phase = 'hover';
          bs.timer = 0;
        }
      } else if (bs.phase === 'hover') {
        if (!bs.hitHover && bs.timer >= 0.09 && enemy && !enemy.isDead && Math.abs(enemy.x - bs.x) < 72) {
          bs.hitHover = true;
          enemy.takeDamage(24, this, true, -58, -68);
          this.leechLife(10, enemy, game, 'VORTEX SHRED');
          this.fx?.spawn('soulHarvestScytheArc', bs.x, bs.y, {
            flip: bs.dir < 0,
            light: 1.32,
            extra: { radiusWorld: 112, isCrimson: true, isCross: true }
          });
        }
        if (bs.timer >= 0.22) {
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
        bs.x += (dx / dist) * 775 * dt;
        bs.y += (dy / dist) * 775 * dt;
        if (
          !bs.hitReturn &&
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - bs.x) < 62 &&
          Math.abs(enemy.y - 96 - bs.y) < 88
        ) {
          bs.hitReturn = true;
          // Return flight hooks and pulls the enemy INWARD toward Malakor!
          enemy.takeDamage(34, this, true, -98, -82);
          this.leechLife(14, enemy, game, 'RETURN REAP!');
          this.spawnVfxAnim(1, bs.x, bs.y, 136, 136, 0.30, {
            glowColor: 'crimson',
            inFront: true
          });
          if (game.vfx) {
            game.vfx.spawnDamageText(enemy.x, enemy.y - 150, 0, false, '★ BOOMERANG REAP! ★', '#e879f9');
            game.vfx.spawnGlyphBurst(bs.x, bs.y, 6, 'abyssal');
          }
        }
        if (dist < 42 || bs.timer >= 0.75) {
          this.activeScytheBoomerang = null;
          this.activeBoomerangScythe = null;
        }
      }
    }

    // 5. Advance Homing Soul-Leech Wisp Orbs (rendered via Row 1 `abyssalSkullWispCell`)
    for (let i = this.soulWisps.length - 1; i >= 0; i--) {
      const w = this.soulWisps[i];
      w.life += dt;
      if (w.life >= w.maxLife) {
        this.soulWisps.splice(i, 1);
      }
    }

    // 6. Advance Cursed Ossuary Bone-Cage (`this.boneCage`) & Grounded Spire Tombstones
    if (this.boneCage) {
      this.boneCage.life -= dt;
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.boneCage.x) < this.boneCage.radius + 22) {
        enemy.vx *= Math.pow(0.15, dt);
        const pullIn = this.boneCage.x - enemy.x;
        enemy.x += pullIn * Math.min(1, dt * 4.8);
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
        if (ts.isPrison && enemy && !enemy.isDead && Math.abs(enemy.x - ts.x) < 68) {
          enemy.vx *= Math.pow(0.18, dt);
          const pushIn = ts.x < this.x + this.facing * 120 ? 1 : -1;
          enemy.x += pushIn * 36 * dt;
        }
        if (ts.life <= 0) {
          this.tombstones.splice(i, 1);
        }
      }
    }

    // 7. Advance Sovereign of Death Avatar state
    if (this.deathAvatar) {
      this.deathAvatar.life -= dt;
      if (this.deathAvatar.life <= 0) {
        this.deathAvatar = null;
      }
    }

    if (!this.isDead && (this.state === 'IDLE' || this.state === 'WALK') && this.dodgeCooldown <= 0 && game.vfx) {
      const inPillar = game.vfx.pillars.some(
        (pil) => pil.erupted && pil.owner !== this && Math.abs(pil.x - this.x) < 105
      );
      if (inPillar) {
        this.leechLife(14, enemy, game, 'ABYSSAL SIPHON');
        this.skillCooldown = Math.max(0, this.skillCooldown - 0.55);
        this.startDodge(enemy, game);
        return;
      }
    }

    if (!this.isDead && enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const ww = game.renderer ? game.renderer.worldWidth : 1200;
      const dist = Math.abs(enemy.x - this.x);
      const pinnedLeft = this.x < 240 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 240 && enemy.x < this.x;

      if ((pinnedLeft || pinnedRight) && dist < 265 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.2;
        this.startJump(enemy, game);
        return;
      }

      if (dist >= 210 && dist <= 340 && this.crouchCooldown <= 0) {
        this.startCrouch(enemy, game);
        return;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.32) {
        this.stepDustTimer = 0;
        if (game.audio) game.audio.play('footstep_steel', this.x);
        this.fx?.burst(this.x - this.facing * 14, this.groundY - 2, {
          count: 4,
          speedMin: 30,
          speedMax: 80,
          lifeMin: 0.14,
          lifeMax: 0.28,
          gravity: 25,
          colors: ['#ffffff', '#c084fc', '#f43f5e']
        });
      }
    }

    this.fx?.update(dt);
    super.update(dt, enemy, game);
  }

  /**
   * AUTO-ATTACK: "3-HIT 2H SOUL-HARVEST & RETURNING PHANTOM SCYTHE BOOMERANG"
   * - Hit 1 & Hit 2: Wide 2H `soulHarvestScytheArc` cleaves + Row 0 `reaper_vfx.png` slash +
   *   Soul-Leech Wisp orbs that home back to Malakor and heal him (`+14 HP` per hit).
   * - Hit 3 (Finisher): Cleaves and hurls the Spinning Twin-Blade Phantom Scythe Boomerang
   *   (`this.activeScytheBoomerang` + Row 1 `reaper_vfx.png`) that slices through enemies on
   *   both the outbound and return flight!
   */
  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.26) {
      this.torsoAngle = -this.facing * 0.24 * (t / 0.26);
      if (Math.random() < 0.45) {
        this.fx?.burst(this.x - this.facing * 18, this.y - 104, {
          count: 2,
          speedMin: 25,
          speedMax: 75,
          lifeMin: 0.12,
          lifeMax: 0.24,
          gravity: -20,
          colors: mode === 2 ? ['#ffffff', '#f43f5e', '#c084fc'] : ['#ffffff', '#c084fc', '#9333ea']
        });
      }
    } else if (t < 0.64) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 135;
        this.torsoVel = this.facing * 13;

        const cx = this.x + this.facing * 56;
        const cy = this.y - 98;

        // Wide 2H `soulHarvestScytheArc` cleave + Row 0 `reaper_vfx.png` slash on every swing
        this.fx?.spawn('soulHarvestScytheArc', cx, cy, {
          flip: this.facing < 0,
          light: mode === 2 ? 1.40 : 1.26,
          extra: {
            radiusWorld: mode === 2 ? 146 : 136,
            isCrimson: mode === 2,
            isCross: mode === 2,
            isUppercut: mode === 1
          }
        });
        this.spawnVfxAnim(0, cx, cy, 196, 196, 0.34, {
          flipX: this.facing < 0,
          glowColor: mode === 2 ? 'crimson' : 'violet',
          inFront: true
        });

        if (mode === 2) {
          // Hit 3 (Finisher): Cleaves & hurls the Spinning Twin-Blade Phantom Scythe Boomerang
          // (`this.activeScytheBoomerang` + Row 1 `reaper_vfx.png`)!
          if (game.audio) game.audio.play('scythe_reap', this.x);
          if (game.vfx) {
            game.vfx.spawnDamageText(this.x, this.y - 148, 0, false, 'PHANTOM SCYTHE BOOMERANG!', '#e879f9');
          }
          this.spawnBoomerangScythe();
          this.spawnVfxAnim(1, cx, cy, 168, 168, 0.36, {
            flipX: this.facing < 0,
            glowColor: 'crimson',
            inFront: true
          });
          this.spawnVfxAnim(4, cx, cy, 208, 208, 0.34, {
            flipX: this.facing < 0,
            glowColor: 'crimson',
            inFront: true
          });
        } else {
          if (game.audio) game.audio.play('scythe_reap', this.x);
        }

        if (game.vfx) game.vfx.spawnGlyphBurst(cx, cy, 5, 'abyssal');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 48) {
          const isCrit = mode === 2 || Math.random() < 0.24;
          const dmg = mode === 2 ? 62 : mode === 1 ? 54 : 50;
          const inwardPull = mode === 2 ? -78 : -68;
          enemy.takeDamage(dmg, this, isCrit, inwardPull, mode === 2 ? -95 : -28);
          if (!enemy.unstoppablePoise) {
            const pullDir = Math.sign(this.x - enemy.x);
            enemy.x += pullDir * 24;
          }
          // Heal +14 HP per hit via homing Soul-Leech Wisp orbs (Row 1 of reaper_vfx.png)!
          this.leechLife(14, enemy, game, 'SOUL HARVEST');
          if (game.audio) game.audio.play(mode === 2 ? 'soul_drain' : 'scythe_reap', enemy.x);
          if (game.renderer) game.renderer.triggerHitStop(0.055);
          this.fx?.burst(enemy.x, enemy.y - 96, {
            count: 10,
            speedMin: 55,
            speedMax: 185,
            lifeMin: 0.16,
            lifeMax: 0.32,
            gravity: 35,
            colors: ['#ffffff', '#c084fc', '#f43f5e']
          });
          if (game.vfx) game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 5, 'abyssal');
        }
      }
    } else if (t >= 0.86) {
      this.setState('IDLE');
    }
  }

  /**
   * SKILL: "DEATH'S GRASP: BONE-CHAIN HOOK & OSSUARY GUILLOTINE"
   * - Launches the Vertebrated Bone-Chain & Giant Skeletal Claw (`skeletalChainTetherBeam` +
   *   Row 3 `reaper_vfx.png`) up to `440px` to impale the enemy,
   * - Yanks them directly into Malakor's Cursed Ossuary Bone-Cage (`this.boneCage` grounded on `this.groundY`),
   * - And executes a 360° Two-Handed Whirlwind Scythe Execution Reap that bursts a grounded
   *   `necroticBoneSpireCell` (Row 2 at `this.groundY - 68` / `this.groundY - 78`) under the enemy and drains life!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;

    if (t < 0.08) {
      this.didChainPull = false;
      this.didReapFinisher = false;
      this.torsoAngle = -this.facing * 0.22;
      this.isDeflecting = enemy ? Math.abs(enemy.x - this.x) > 195 : false;
    } else if (t < 0.46) {
      if (!this.didChainPull) {
        this.didChainPull = true;
        if (game.audio) game.audio.play('chain_hook', this.x);

        const maxHookDist = 440;
        const rawTargetX = enemy ? enemy.x : this.x + this.facing * 340;
        const clampedDx = Math.max(-maxHookDist, Math.min(maxHookDist, rawTargetX - this.x));
        const targetX = this.x + clampedDx;
        const targetY = enemy ? enemy.y - 96 : this.y - 96;

        this.fx?.spawn('skeletalChainTetherBeam', this.x + this.facing * 44, this.y - 94, {
          light: 1.36,
          extra: {
            dx: targetX - (this.x + this.facing * 44),
            dy: targetY - (this.y - 94),
            arcH: 12,
            isCrimson: false,
            showClaw: true,
            customDuration: 0.38
          }
        });
        this.spawnVfxAnim(3, targetX, targetY, 192, 192, 0.36, {
          glowColor: 'violet',
          inFront: false
        });
        if (game.vfx) game.vfx.spawnGlyphBurst(targetX, targetY, 8, 'abyssal');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= maxHookDist + 30) {
          enemy.takeDamage(26, this, !enemy.hasPoise, -165, -35);
          // Trap enemy inside Malakor's Cursed Ossuary Bone-Cage grounded on this.groundY!
          const cageX = Math.max(105, Math.min(ww - 105, this.x + this.facing * 124));
          this.spawnOssuaryBoneCage(cageX, game);
          if (game.vfx) {
            game.vfx.spawnDamageText(enemy.x, enemy.y - 154, 0, false, "★ DEATH'S GRASP: OSSUARY CAGE! ★", '#e879f9');
          }
          if (game.renderer) game.renderer.triggerShake(11, 0.22);
        }
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 465) {
        if (Math.abs(enemy.x - this.x) > 142) {
          this.x += this.facing * 125 * dt;
        }
        const desiredX = Math.max(95, Math.min(ww - 95, this.x + this.facing * 122));
        enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 6.2);
        if (this.boneCage) {
          this.boneCage.x = desiredX;
        }
      }
    } else if (!this.didReapFinisher) {
      // 360° Two-Handed Whirlwind Scythe Execution Reap + Grounded Necrotic Bone Spire Eruption!
      this.didReapFinisher = true;
      this.isDeflecting = false;
      if (game.audio) game.audio.play('scythe_reap', this.x);
      if (game.renderer) {
        game.renderer.triggerShake(15, 0.30);
        game.renderer.triggerHitStop(0.065);
      }

      const reapX = enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 235
        ? enemy.x
        : this.x + this.facing * 116;

      this.fx?.spawn('soulHarvestScytheArc', this.x + this.facing * 56, this.y - 98, {
        flip: this.facing < 0,
        light: 1.42,
        extra: { radiusWorld: 154, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(0, this.x + this.facing * 56, this.y - 98, 212, 212, 0.38, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: true
      });
      this.spawnVfxAnim(4, reapX, this.y - 98, 216, 216, 0.38, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: true
      });

      // Burst a grounded `necroticBoneSpireCell` (Row 2 at `this.groundY - 68` for `h = 208`) under the enemy!
      this.spawnGroundedBoneSpire(reapX, 208, 0.62, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: false
      });
      this.spawnOssuaryBoneCage(reapX, game);

      if (game.vfx) game.vfx.spawnGlyphBurst(reapX, this.y - 98, 9, 'abyssal');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 245) {
        enemy.takeDamage(58, this, true, -35, -125);
        this.leechLife(28, enemy, game, 'OSSUARY GUILLOTINE');
      }
    } else if (t >= 0.90) {
      this.isDeflecting = false;
      this.setState('IDLE');
    }
  }

  spawnWraithTrail(fromX, fromY, toX, toY, facing, count = 4) {
    const cols = [8, 12, 16, 20];
    for (let i = 0; i < count; i++) {
      const u = i / Math.max(1, count);
      this.spawnAfterimage(
        fromX + (toX - fromX) * u,
        fromY + (toY - fromY) * u,
        facing,
        4,
        cols[i % cols.length],
        0.34 + i * 0.04,
        this.giantScale || 1.0
      );
    }
  }

  /**
   * ULTIMATE: "GRIM HARVEST: SOVEREIGN OF DEATH"
   * - Malakor grows 2.25x bigger (`this.giantScale = 2.25`),
   * - Unfolds the Necropolis Boneyard Domain (`necropolisBoneyardDomain` + Row 4 `reaper_vfx.png`)
   *   across `this.groundY - 4`,
   * - Executes 3 High-Speed Wraith Teleport Cross-Slashes (`LEFT`, `RIGHT`, `ABOVE`) across the
   *   target with twin `soulHarvestScytheArc` cross-cuts,
   * - And plunges down for the Cataclysmic Lich-Sovereign Guillotine Slam that erupts a
   *   Chaining 5-Wave Necrotic Bone & Soul-Crystal Spire Fault-Line (`deathAvatarCathedral` on
   *   `this.groundY - 4` + Row 2 `necroticBoneSpireCell` grounded at `this.groundY - 78`) across
   *   the arena floor!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : ww * 0.5;
    this.vx = 0;
    this.vy = 0;
    this.isDeflecting = t < 1.54;
    this.isInvulnerable = t < 1.38;

    // Smoothly scale Malakor up to a 2.25x Colossal Lich Sovereign!
    if (t < 0.16) {
      this.giantScale = 1.0 + 1.25 * Math.min(1, t / 0.16);
    } else if (t <= 1.36) {
      this.giantScale = 2.25;
    } else {
      const uDown = Math.min(1, (t - 1.36) / 0.24);
      this.giantScale = 2.25 - 1.25 * uDown;
    }

    if (t < 0.04) {
      this.ultStage = 0;
      this.y = this.groundY;
      this.ultPassStartX = this.x;
      this.ultPassTargetX = targetX;
    }

    // STAGE 1 (t >= 0.04s): Sovereign Ascension (2.25x Scale) & Necropolis Boneyard Domain across this.groundY
    if (t >= 0.04 && this.ultStage === 0) {
      this.ultStage = 1;
      if (game.audio) game.audio.play('soul_drain', targetX);
      if (game.renderer) game.renderer.triggerShake(16, 0.28);

      // Spawn 2 flanking grounded Necrotic Bone & Soul-Crystal Spires framing the Boneyard Domain
      this.tombstones = [];
      for (const side of [-1, 1]) {
        const tx = Math.max(85, Math.min(ww - 85, targetX + side * 185));
        this.tombstones.push({
          x: tx,
          groundY: this.groundY,
          size: 240,
          delay: 0.02,
          life: 1.52,
          maxLife: 1.52,
          shattered: false,
          isPrison: true
        });
      }

      this.deathAvatar = {
        x: targetX,
        y: this.groundY - 4,
        facing: this.facing,
        life: 1.54,
        maxLife: 1.54
      };

      // Unfold Necropolis Boneyard Domain + Death Avatar Cathedral strictly on this.groundY - 4!
      this.fx?.spawn('necropolisBoneyardDomain', targetX, this.groundY - 4, {
        light: 1.44
      });
      this.fx?.spawn('necroticGraveyardSigil', targetX, this.groundY - 4, {
        palette: BLOOD_MOON_CRIMSON_PALETTE,
        light: 1.38,
        extra: { radius: 52, isPrison: true, isCrimson: true, customDuration: 1.50 }
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 104, 240, 240, 0.46, {
        glowColor: 'crimson',
        inFront: true
      });
      this.spawnGroundedBoneSpire(targetX, 240, 0.68, {
        glowColor: 'crimson',
        inFront: false
      });

      if (game.vfx) {
        game.vfx.spawnDamageText(
          targetX,
          this.groundY - 268,
          0,
          false,
          '★ GRIM HARVEST: SOVEREIGN OF DEATH! ★',
          '#f43f5e'
        );
      }
      if (enemy && !enemy.isDead) {
        enemy.takeDamage(18, this, false, -25, 0);
        this.leechLife(10, enemy, game, 'BONEYARD DOMAIN');
      }
    }

    // STAGE 2 (t >= 0.26s): Wraith Teleport Cross-Slash I (LEFT -> RIGHT across target with twin cross-cuts)
    if (t >= 0.26 && this.ultStage === 1) {
      this.ultStage = 2;
      if (game.audio) game.audio.play('scythe_reap', targetX);
      if (game.renderer) game.renderer.triggerShake(16, 0.26);

      this.ultPassStartX = Math.max(105, Math.min(ww - 105, targetX - 155));
      this.ultPassTargetX = Math.max(105, Math.min(ww - 105, targetX + 155));
      this.x = this.ultPassStartX;
      this.facing = 1;

      this.spawnWraithTrail(this.ultPassStartX, this.groundY, this.ultPassTargetX, this.groundY, 1, 5);
      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 104, {
        flip: false,
        light: 1.40,
        extra: { radiusWorld: 162, isCrimson: false, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(0, targetX - 60, this.groundY - 98, 198, 198, 0.40, {
        vx: 295,
        vy: -14,
        flipX: false,
        glowColor: 'violet',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 104, 212, 212, 0.34, {
        flipX: false,
        glowColor: 'violet',
        inFront: true
      });
      if (game.vfx) game.vfx.spawnGlyphBurst(targetX, this.groundY - 98, 8, 'abyssal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(20, this, true, -40, -45);
        this.leechLife(10, enemy, game, 'WRAITH CROSS I');
      }
    }

    if (t >= 0.26 && t < 0.50 && this.ultStage === 2) {
      const u = Math.min(1, (t - 0.26) / 0.20);
      const ease = 1 - Math.pow(1 - u, 3);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * ease;
      this.y = this.groundY - Math.sin(u * Math.PI) * 28;
    }

    // STAGE 3 (t >= 0.52s): Wraith Teleport Cross-Slash II (RIGHT -> LEFT across target with twin cross-cuts)
    if (t >= 0.52 && this.ultStage === 2) {
      this.ultStage = 3;
      if (game.audio) game.audio.play('reaper_ult', targetX);
      if (game.renderer) game.renderer.triggerShake(18, 0.28);

      this.ultPassStartX = Math.max(105, Math.min(ww - 105, targetX + 150));
      this.ultPassTargetX = Math.max(105, Math.min(ww - 105, targetX - 150));
      this.x = this.ultPassStartX;
      this.facing = -1;

      this.spawnWraithTrail(
        this.ultPassStartX,
        this.groundY - 24,
        this.ultPassTargetX,
        this.groundY - 64,
        -1,
        5
      );
      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 114, {
        flip: true,
        light: 1.42,
        extra: { radiusWorld: 168, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(0, targetX + 55, this.groundY - 114, 200, 200, 0.40, {
        vx: -275,
        vy: 32,
        flipX: true,
        glowColor: 'crimson',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 114, 216, 216, 0.36, {
        flipX: true,
        glowColor: 'crimson',
        inFront: true
      });
      if (game.vfx) game.vfx.spawnGlyphBurst(targetX, this.groundY - 110, 9, 'abyssal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(20, this, true, 35, -55);
        this.leechLife(10, enemy, game, 'WRAITH CROSS II');
      }
    }

    if (t >= 0.52 && t < 0.76 && this.ultStage === 3) {
      const u = Math.min(1, (t - 0.52) / 0.22);
      const ease = 1 - Math.pow(1 - u, 2);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * ease;
      this.y = this.groundY - Math.sin(u * Math.PI) * 86;
    }

    // STAGE 4 (t >= 0.76s): Wraith Teleport Cross-Slash III (ABOVE target with twin cross-cuts & Soul-Chain Snare)
    if (t >= 0.76 && this.ultStage === 3) {
      this.ultStage = 4;
      if (game.audio) game.audio.play('chain_hook', targetX);
      if (game.renderer) game.renderer.triggerShake(20, 0.28);

      const dir = enemy ? Math.sign(enemy.x - this.x) || 1 : 1;
      this.ultPassStartX = targetX;
      this.ultPassTargetX = Math.max(115, Math.min(ww - 115, targetX - dir * 110));
      this.x = targetX;
      this.y = this.groundY - 112;
      this.facing = dir;

      this.spawnWraithTrail(targetX, this.groundY - 112, this.ultPassTargetX, this.groundY, dir, 4);
      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 108, {
        flip: dir < 0,
        light: 1.44,
        extra: { radiusWorld: 164, isCrimson: true, isCross: true, isUppercut: true }
      });
      this.fx?.spawn('skeletalChainTetherBeam', this.x, this.y - 64, {
        light: 1.36,
        extra: {
          dx: 0,
          dy: 84,
          arcH: 18,
          isCrimson: true,
          showClaw: true,
          customDuration: 0.30
        }
      });
      if (game.vfx) game.vfx.spawnGlyphBurst(targetX, this.groundY - 108, 10, 'abyssal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(18, this, true, 0, -90);
        this.leechLife(10, enemy, game, 'WRAITH CROSS III');
      }
    }

    if (t >= 0.76 && t < 1.00 && this.ultStage === 4) {
      const u = Math.min(1, (t - 0.76) / 0.22);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * u;
      this.y = this.groundY - (1 - u) * 112;
    } else if (t >= 1.00) {
      this.y = this.groundY;
    }

    if (this.deathAvatar) {
      this.deathAvatar.x = targetX;
    }

    // STAGE 5 (t >= 1.00s): Cataclysmic Lich-Sovereign Guillotine Slam & Chaining 5-Wave Necrotic Bone Spire Fault-Line!
    if (t >= 1.00 && this.ultStage === 4) {
      this.ultStage = 5;
      if (game.audio) game.audio.play('scythe_reap', targetX);

      if (game.renderer) {
        game.renderer.triggerShake(28, 0.58);
        game.renderer.triggerAberration(16);
        game.renderer.triggerHitStop(0.095);
      }

      const slamDir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
      this.facing = slamDir;

      // Grounded Death Avatar Cathedral on this.groundY - 4 + Twin Cross-Arc + Row 4 Nova
      this.fx?.spawn('deathAvatarCathedral', targetX, this.groundY - 4, {
        light: 1.48
      });
      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 108, {
        flip: slamDir < 0,
        light: 1.48,
        extra: { radiusWorld: 172, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.fx?.spawn('necroticGraveyardSigil', targetX, this.groundY - 4, {
        palette: BLOOD_MOON_CRIMSON_PALETTE,
        light: 1.44,
        extra: { radius: 52, isPrison: true, isCrimson: true, customDuration: 0.72 }
      });
      this.spawnVfxAnim(3, targetX, this.groundY - 96, 236, 236, 0.48, {
        glowColor: 'crimson',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 102, 244, 244, 0.46, {
        glowColor: 'crimson',
        inFront: true
      });

      // Erupt the Chaining 5-Wave Necrotic Bone & Soul-Crystal Spire Fault-Line across the arena floor
      // (every Row 2 `necroticBoneSpireCell` with h=240 is grounded at `this.groundY - 78`!)
      const faultStart = Math.max(95, Math.min(ww - 95, targetX - slamDir * 176));
      this.spawnNecroticFaultLine(faultStart, slamDir, game);

      for (const tb of this.tombstones) {
        tb.shattered = true;
        tb.life = Math.min(tb.life, tb.maxLife * 0.32);
        if (game.vfx) game.vfx.spawnGlyphBurst(tb.x, this.groundY - 48, 5, 'abyssal');
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(64, this, true, slamDir * 165, -230);
        this.leechLife(22, enemy, game, 'SOVEREIGN GUILLOTINE');
        if (game.vfx) game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 98, 14, 'abyssal');
      }
    }

    if (t >= 1.56) {
      this.y = this.groundY;
      this.giantScale = 1.0;
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.deathAvatar = null;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Pass HD-2D Additive Bloom Renderer for Malakor's 208x208 VFX Sheet (`assets/sprites/reaper_vfx.png`).
   */
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
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(4, Math.floor(row))) * cell;

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
      ctx.globalAlpha = Math.min(1, alpha * 0.42);
      const gw = Math.round(w * 1.15);
      const gh = Math.round(h * 1.15);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.48);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  /**
   * Background 2.5D Shader Pass (`back`) + Grounded `reaper_vfx.png` Necrotic Bone Spires (Row 2),
   * Pentagram Seals (Row 3) & Wraith Afterimages
   */
  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.reaper : null;
    const vfxSheet = sprites?.vfx;

    // 1. Crisp Un-Rotated HD-2D Wraith Afterimage Silhouettes
    if (this.afterimages.length > 0 && sprites?.sheet?.complete) {
      for (const img of this.afterimages) {
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.52);
        const sc = img.scale || 1.0;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 4) * 4, Math.round((img.y + 4) / 4) * 4);
        ctx.scale(img.facing * sc, sc);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawAfterimageFrame(ctx, sprites, img.frameIdx || 190, 208, 208);
        ctx.restore();
      }
    }

    if (!vfxSheet?.complete) return;

    // 2. Ground-Erupting Necrotic Bone & Soul-Crystal Spires (`Row 2: necroticBoneSpireCell`)
    //    Strictly grounded at `this.groundY - Math.round(sz * (34 / 104))`!
    for (const ts of this.tombstones) {
      if (ts.delay > 0 || ts.life <= 0) continue;
      const u = Math.min(1, Math.max(0, 1 - ts.life / ts.maxLife));
      const col = Math.min(29, Math.floor(u * 30));
      const fade = Math.min(1, ts.life * 3.0);
      const sz = ts.size || 208;
      const by = (ts.groundY ?? this.groundY) - Math.round(sz * (34 / 104));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        2,
        col,
        ts.x,
        by,
        sz,
        sz,
        fade * 0.94,
        false,
        renderer,
        ts.isPrison ? 'crimson' : 'violet'
      );
    }

    // 3. Background 30fps `reaper_vfx.png` Cell Animations (Row 2 Grounded Spires, Row 3 Pentagram Seals)
    for (const v of this.activeVfxAnims) {
      if (v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / v.maxLife));
      const span = Math.max(1, v.endFrame - v.startFrame + 1);
      const col = Math.min(29, v.startFrame + Math.floor(u * span));
      const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
      const drawY =
        v.row === 2
          ? this.groundY - Math.round(v.h * (34 / 104))
          : v.y;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        v.row,
        col,
        v.x,
        drawY,
        v.w,
        v.h,
        fade * 0.92,
        v.flipX,
        renderer,
        v.glowColor
      );
    }
  }

  /**
   * Foreground 2.5D Shader Pass (`front`) + `reaper_vfx.png` Boomerang Scythe (Row 0 & Row 1),
   * Homing Soul-Leech Wisps (Row 1) & Reap Novas (Row 4)
   */
  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.reaper : null;
    const vfxSheet = sprites?.vfx;
    if (!vfxSheet?.complete) return;

    // 1. Returning Twin-Blade Phantom Scythe Boomerang (`Row 0` + `Row 1` soul-core overlay)
    const bs = this.activeScytheBoomerang || this.activeBoomerangScythe;
    if (bs) {
      const col = Math.floor((bs.timer * 38) % 30);
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        0,
        col,
        bs.x,
        bs.y,
        164,
        164,
        0.96,
        bs.dir < 0,
        renderer,
        bs.phase === 'return' ? 'crimson' : 'violet'
      );
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        col,
        bs.x,
        bs.y,
        112,
        112,
        0.84,
        bs.dir < 0,
        renderer,
        'crimson'
      );
    }

    // 2. Homing Necrotic Soul-Leech Wisps (`Row 1: abyssalSkullWispCell`) curving into Malakor's ribcage
    const tx = this.x;
    const ty = this.y - 96;
    for (const w of this.soulWisps) {
      if (w.life < 0) continue;
      const u = Math.min(1, w.life / w.maxLife);
      const wx = w.startX + (tx - w.startX) * u;
      const wy = w.startY + (ty - w.startY) * u + Math.sin(u * Math.PI) * w.arcHeight;
      const col = Math.min(29, Math.floor(u * 30));
      const fade = Math.sin(u * Math.PI);
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        col,
        wx,
        wy,
        96,
        96,
        fade * 0.94,
        tx < w.startX,
        renderer,
        w.glowColor || 'violet'
      );
    }

    // 3. Foreground 30fps `reaper_vfx.png` Cell Animations (Row 0 Scythe Waves, Row 3 Pentagrams & Row 4 Reap Novas)
    for (const v of this.activeVfxAnims) {
      if (!v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / v.maxLife));
      const span = Math.max(1, v.endFrame - v.startFrame + 1);
      const col = Math.min(29, v.startFrame + Math.floor(u * span));
      const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
      const drawY =
        v.row === 2
          ? this.groundY - Math.round(v.h * (34 / 104))
          : v.y;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        v.row,
        col,
        v.x,
        drawY,
        v.w,
        v.h,
        fade * 0.95,
        v.flipX,
        renderer,
        v.glowColor
      );
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.reaper : null;
    if (!sprites) return;

    const showShadowPool =
      !isReflection && (this.isSubmerged || ((this.state === 'DODGE' || this.state === 'DASH') && !this.isFlipVault));

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
    const scale = this.giantScale || 1.0;

    const groundPlantOffset = 4;
    const sinkOffset = showShadowPool
      ? Math.round((this.submergeDepth || 0.7) * 52)
      : 0;

    // Clip to floor when sinking underground during Grave-Submerge!
    if (showShadowPool && sinkOffset > 12) {
      ctx.beginPath();
      ctx.rect(this.x - 160, this.groundY - 240, 320, 246);
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
}
