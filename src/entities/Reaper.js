import { Fighter } from './Fighter.js?v=30fps55';
import { PixelForge } from '../engine/PixelForge.js?v=30fps55';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps55';
import {
  ABYSSAL_EFFECT_REGISTRY,
  ABYSSAL_VIOLET_PALETTE,
  BLOOD_MOON_CRIMSON_PALETTE
} from '../engine/shaders/abyssalShaders.js?v=30fps55';

/**
 * Malakor (`reaper`) — Abyssal Necropolis Harvester & Sovereign of Death.
 * Powered natively by `ArcaneShaderFX` (dual-buffer 120Hz HD-2D 2.5D shader & particle engine)
 * + `assets/sprites/reaper_sheet.png` & `assets/sprites/reaper_vfx.png`.
 */
export class Reaper extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Malakor',
      maxHp: 1235,
      attackRange: 182,
      moveSpeed: 188,
      autoInterval: 1.09,
      lightColor: 'rgba(192, 132, 252, 1)',
      primaryColor: '#c084fc'
    });
    this.heroId = 'reaper';
    this.theme = 'abyssal';
    this.deathSfx = 'death_reaper';
    this.hasPoise = true;
    this.isDeflecting = false;
    this.skillMaxCooldown = 5.05;
    this.skillTriggerRange = 485;
    this.autoDuration = 0.96;
    this.skillDuration = 1.15;
    this.ultDuration = 1.65;
    this.skillName = 'SPECTRAL CHAIN';
    this.ultName = 'GRIM HARVEST';
    this.comboStep = 0;
    this.stepDustTimer = 0;

    // 100% Bespoke Soulreaper Harvester Systems
    this.soulWisps = []; // Homing Soul-Skull Wisps (Row 1 of reaper_vfx.png) ripped from enemy into Malakor
    this.tombstones = []; // Haunted Gothic Tombstone Spires & Prison Cages (Row 2 of reaper_vfx.png)
    this.deathAvatar = null; // Sovereign of Death state during GRIM HARVEST
    this.activeBoomerangScythe = null; // Returning Twin-Blade Phantom Scythe Boomerang (Row 0 of reaper_vfx.png)
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
      if (reaperAssets?.vfx?.src && !reaperAssets.vfx.src.includes('v=30fps53')) {
        reaperAssets.vfx.src = 'assets/sprites/reaper_vfx.png?v=30fps55';
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
      this.deathAvatar = null;
      this.fx?.stopByKey('deathAvatarCathedral');
    }
    if (newState === 'DEATH') {
      this.fx?.clear();
    }
  }

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.28) {
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + col,
      age: 0,
      maxLife
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
    // Every 3rd swing hurls a Returning Boomerang Phantom Scythe up to 395px!
    return this.comboStep % 3 === 2 ? 395 : this.attackRange;
  }

  /**
   * Bespoke Necrotic Soul-Siphon
   * Rips homing crimson-violet Soul-Skull Wisps (Row 1 of `reaper_vfx.png` + `skeletalChainTetherBeam` comet)
   * out of the enemy that curve into Malakor's chest.
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
    const count = Math.min(5, Math.max(2, Math.round(actual / 9)));
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
    if (this.fx) {
      this.fx.spawn('skeletalChainTetherBeam', fromX, fromY, {
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
    }
    return this.hp - prevHp;
  }

  spawnTombstoneRow(centerX, game, count = 7) {
    const ww = game.renderer.worldWidth;
    this.tombstones = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - Math.floor(count / 2)) * 96;
      const tx = Math.max(95, Math.min(ww - 95, centerX + offset));
      this.tombstones.push({
        x: Math.round(tx / 4) * 4,
        groundY: this.groundY,
        width: i % 2 === 0 ? 44 : 36,
        height: i === Math.floor(count / 2) ? 96 : i % 2 === 0 ? 80 : 68,
        delay: Math.abs(i - Math.floor(count / 2)) * 0.04,
        life: 1.55,
        maxLife: 1.55,
        shattered: false,
        isPrison: false,
        seed: i * 1.7
      });
    }
    this.fx?.spawn('necroticGraveyardSigil', centerX, this.groundY, {
      palette: ABYSSAL_VIOLET_PALETTE,
      light: 1.24,
      extra: { radius: 42, isPrison: false, customDuration: 1.1 }
    });
  }

  /**
   * Raises 2 Haunted Gothic Tombstones on BOTH sides of the hooked enemy to cage & slow them!
   */
  spawnTombstonePrison(enemyX, game) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const offsets = [-72, 72];
    for (let i = 0; i < offsets.length; i++) {
      const tx = Math.max(90, Math.min(ww - 90, enemyX + offsets[i]));
      this.tombstones.push({
        x: Math.round(tx / 4) * 4,
        groundY: this.groundY,
        width: 44,
        height: 92,
        delay: i * 0.03,
        life: 2.15,
        maxLife: 2.15,
        shattered: false,
        isPrison: true,
        seed: i * 2.3
      });
    }
    this.fx?.spawn('necroticGraveyardSigil', enemyX, this.groundY, {
      palette: ABYSSAL_VIOLET_PALETTE,
      light: 1.3,
      extra: { radius: 34, isPrison: true, isCrimson: true, customDuration: 1.45 }
    });
  }

  /**
   * Spawns a Returning Twin-Blade Phantom Scythe Boomerang that flies out 385px,
   * buzz-saws in place for 0.24s, and then reverses back to Malakor's hand!
   */
  spawnBoomerangScythe() {
    const startX = this.x + this.facing * 54;
    const startY = this.y - 102;
    this.activeBoomerangScythe = {
      x: startX,
      y: startY,
      startX,
      targetX: startX + this.facing * 385,
      dir: this.facing,
      phase: 'outbound', // 'outbound' -> 'hover' -> 'return'
      timer: 0,
      angle: 0,
      hitOutbound: false,
      hitHover: false,
      hitReturn: false
    };
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
   * CROUCH: "ABYSSAL GRAVE-SUBMERGE & UPPERCUT ERUPTION"
   * Malakor sinks completely underground into a creeping Shadow Puddle (isSubmerged = true),
   * slides 185px along the floor toward/underneath the enemy, and erupts upward with a Scythe Uppercut!
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
    this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      light: 1.28,
      extra: { radius: 30, isSubmerged: true }
    });
    this.fx?.spawn('necroticGraveyardSigil', this.x, this.groundY, {
      palette: ABYSSAL_VIOLET_PALETTE,
      light: 1.2,
      extra: { radius: 26, isPrison: false, customDuration: 0.48 }
    });
    if (game && game.audio) game.audio.play('soul_drain', this.x);
    if (game && game.vfx) {
      game.vfx.spawnShockwave(this.x, this.groundY - 2, 82, '#c084fc', 0.28, true);
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
    this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      maxDuration: 0.38,
      light: 1.22,
      extra: { radius: 24, isSubmerged: false }
    });
    if (game.audio) game.audio.play('scythe_reap', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 6, 'abyssal');
    game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'SHADOW STALK!', '#c084fc');
  }

  onStartDodge(enemy, game, dir, forceJump = false) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 0;
    const nearWall = this.x < 280 || this.x > ww - 280;

    // 1. SPECTRAL WRAITH FLOAT-GLIDE & EXECUTIONER GUILLOTINE (Row 8 JUMP)
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
      this.fx?.spawn('necroticGraveyardSigil', this.x, this.groundY, {
        palette: ABYSSAL_VIOLET_PALETTE,
        light: 1.18,
        extra: { radius: 24, isPrison: false, customDuration: 0.42 }
      });
      if (game.audio) game.audio.play('soul_drain', this.x);
      game.vfx.spawnShockwave(this.x, this.groundY, 92, '#c084fc', 0.30, true);
      game.vfx.spawnGlyphBurst(this.x, this.y - 60, 7, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, 'WRAITH GLIDE!', '#e879f9');
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
      this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY, {
        follow: this,
        offsetX: 0,
        offsetY: 0,
        useGroundY: true,
        maxDuration: 0.34,
        light: 1.28,
        extra: { radius: 28, isSubmerged: true, isCrimson: true }
      });
      if (game.audio) game.audio.play('soul_drain', this.x);
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 8, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'WRAITH PHASE!', '#e879f9');
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
    this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY, {
      follow: this,
      offsetX: 0,
      offsetY: 0,
      useGroundY: true,
      maxDuration: 0.36,
      light: 1.22,
      extra: { radius: 24, isSubmerged: false }
    });
    if (game.audio) game.audio.play('soul_drain', this.x);
    game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 7, 'abyssal');
    game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'GRAVE MELD!', '#e879f9');
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    // Row 8 (30-frame JUMP — Spectral Wraith Float-Glide & Executioner Guillotine Cleave!)
    if ((this.state === 'DODGE' || this.state === 'JUMP') && this.isFlipVault) {
      const u = Math.min(1, t / this.dashDuration);
      const ease = 0.5 - 0.5 * Math.cos(u * Math.PI);
      this.x = this.flipStartX + (this.flipTargetX - this.flipStartX) * ease;

      // Spectral Wraith Float-Glide arc (hovers weightlessly at 96px before dropping the Guillotine!)
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

      // Leave spectral wraith afterimages while floating across the sky
      if (u < 0.62 && Math.random() < 0.45) {
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 29)), 0.26);
      }

      // At u >= 0.58: Executioner Guillotine Cleave (Missing-HP Execute Damage!)
      if (u >= 0.58 && !this.didActionFrame) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('scythe_reap', this.x);
        const cx = this.x + this.facing * 52;
        const cy = this.y - 82;
        const sA = this.facing === 1 ? -1.95 : Math.PI - 1.25;
        const eA = this.facing === 1 ? 1.25 : Math.PI + 1.95;

        this.fx?.spawn('soulHarvestScytheArc', cx, cy, {
          flip: this.facing < 0,
          light: 1.38,
          extra: { radiusWorld: 138, isCrimson: true, isCross: true, isUppercut: false }
        });
        this.spawnVfxAnim(4, cx, cy, 208, 208, 0.34, {
          flipX: this.facing < 0,
          glowColor: 'crimson',
          inFront: true
        });
        game.vfx.spawnSlash(cx, cy, 138, sA, eA, '#f43f5e', 0.32);
        game.vfx.spawnSlash(cx, cy, 114, sA, eA, '#c084fc', 0.26);
        game.vfx.spawnGlyphBurst(cx, cy, 7, 'abyssal');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 205) {
          const missingRatio = Math.max(0, Math.min(1, 1 - enemy.hp / enemy.maxHp));
          const execDmg = Math.round(37 + missingRatio * 27);
          enemy.takeDamage(execDmg, this, true, -this.facing * 65, -145);
          this.leechLife(12, enemy, game, 'GUILLOTINE REAP');
          game.vfx.spawnDamageText(enemy.x, enemy.y - 156, 0, false, '★ GUILLOTINE EXECUTE! ★', '#f43f5e');
          if (game.renderer) game.renderer.triggerShake(12, 0.24);
        }
      }

      if (t >= this.dashDuration) {
        this.y = this.groundY;
        this.vy = 0;
        this.isFlipVault = false;
        this.wraithAlpha = 1.0;
        this.isInvulnerable = false;
        this.fx?.spawn('necroticGraveyardSigil', this.x, this.groundY, {
          palette: ABYSSAL_VIOLET_PALETTE,
          light: 1.18,
          extra: { radius: 24, isPrison: false, customDuration: 0.38 }
        });
        game.vfx.spawnShockwave(this.x, this.groundY, 84, '#c084fc', 0.26, true);
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

      if (Math.random() < 0.85) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 56,
          y: this.groundY - 6 - Math.random() * 24,
          vx: -this.dashDir * 60,
          vy: -45 - Math.random() * 35,
          size: 5,
          color: Math.random() > 0.45 ? '#c084fc' : '#f43f5e',
          maxLife: 0.28
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

    if (Math.random() < 0.82) {
      game.vfx.spawnParticle({
        x: this.x + (Math.random() - 0.5) * 64,
        y: this.groundY - 4 - Math.random() * 18,
        vx: -this.dashDir * 65,
        vy: -45 - Math.random() * 35,
        size: 5,
        color: Math.random() > 0.45 ? '#c084fc' : '#4c1d95',
        maxLife: 0.28
      });
    }

    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 155
    ) {
      this.didActionFrame = true;
      // Hook inward during Shadow Stalk!
      enemy.takeDamage(34, this, false, -58, -65);
      this.leechLife(10, enemy, game, 'SOUL HOOK');
      if (game.audio) game.audio.play('scythe_reap', enemy.x);
      this.fx?.spawn('soulHarvestScytheArc', this.x + this.facing * 44, this.y - 96, {
        flip: this.facing < 0,
        light: 1.24,
        extra: { radiusWorld: 118, isCrimson: false, isUppercut: false }
      });
      game.vfx.spawnSlash(this.x + this.facing * 44, this.y - 96, 118, -1.3, 1.2, '#c084fc', 0.28);
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
   * CROUCH UPDATE: "ABYSSAL GRAVE-SUBMERGE & UPPERCUT ERUPTION"
   * Phase 1 (0.00s..0.38s): Sinks into an untargetable underground Shadow Puddle and slides along the floor toward the enemy!
   * Phase 2 (0.38s..0.86s): Burst upward out of the floor right beside the enemy with a rising 2-Handed Scythe Uppercut!
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

      if (Math.random() < 0.88) {
        game.vfx.spawnParticle({
          x: this.x + (Math.random() - 0.5) * 76,
          y: this.groundY - 4 - Math.random() * 16,
          vx: -this.submergeDir * 75,
          vy: -55 - Math.random() * 40,
          size: 5.5,
          color: Math.random() > 0.45 ? '#c084fc' : '#f43f5e',
          maxLife: 0.26
        });
      }
    } else if (!this.didActionFrame) {
      // ERUPT UPWARD OUT OF THE GRAVE PUDDLE WITH A RISING SCYTHE UPPERCUT!
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
      const sA = this.facing === 1 ? 1.45 : Math.PI - 1.45;
      const eA = this.facing === 1 ? -1.75 : Math.PI + 1.75;

      this.fx?.spawn('soulHarvestScytheArc', eruptX, eruptY, {
        flip: this.facing < 0,
        light: 1.38,
        extra: { radiusWorld: 138, isCrimson: true, isUppercut: true }
      });
      this.fx?.spawn('necroticGraveyardSigil', this.x, this.groundY, {
        palette: BLOOD_MOON_CRIMSON_PALETTE,
        light: 1.28,
        extra: { radius: 30, isPrison: false, isCrimson: true, customDuration: 0.56 }
      });
      this.spawnVfxAnim(4, eruptX, eruptY, 208, 208, 0.34, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: true
      });
      game.vfx.spawnSlash(eruptX, eruptY, 136, sA, eA, '#c084fc', 0.34);
      game.vfx.spawnSlash(eruptX, eruptY, 112, sA, eA, '#f43f5e', 0.28);
      game.vfx.spawnShockwave(this.x, this.groundY, 118, '#c084fc', 0.32, true);
      game.vfx.spawnGlyphBurst(eruptX, eruptY, 8, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 152, 0, false, '★ GRAVE ERUPTION! ★', '#e879f9');

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 195) {
        enemy.takeDamage(46, this, true, -48, -195);
        this.leechLife(13, enemy, game, 'GRAVE HARVEST');
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

    // 3. Advance Returning Boomerang Phantom Scythe (rendered via Row 0 `soulScytheWaveCell`)
    if (this.activeBoomerangScythe) {
      const bs = this.activeBoomerangScythe;
      bs.timer += dt;
      bs.angle += dt * 26;

      if (bs.phase === 'outbound') {
        bs.x += bs.dir * 680 * dt;
        if (
          !bs.hitOutbound &&
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - bs.x) < 54 &&
          Math.abs(enemy.y - 96 - bs.y) < 84
        ) {
          bs.hitOutbound = true;
          enemy.takeDamage(28, this, false, -38, -50);
          this.leechLife(7, enemy, game, 'SCYTHE REAP');
          game.vfx.spawnGlyphBurst(bs.x, bs.y, 5, 'abyssal');
        }
        if (Math.abs(bs.x - bs.startX) >= 385 || bs.timer >= 0.56) {
          bs.phase = 'hover';
          bs.timer = 0;
        }
      } else if (bs.phase === 'hover') {
        if (!bs.hitHover && bs.timer >= 0.10 && enemy && !enemy.isDead && Math.abs(enemy.x - bs.x) < 68) {
          bs.hitHover = true;
          enemy.takeDamage(23, this, true, -55, -65);
          this.leechLife(7, enemy, game, 'VORTEX SHRED');
          game.vfx.spawnSlash(bs.x, bs.y, 92, 0, Math.PI * 2, '#f43f5e', 0.24);
        }
        if (bs.timer >= 0.24) {
          bs.phase = 'return';
          bs.timer = 0;
          this.fx?.spawn('skeletalChainTetherBeam', this.x + this.facing * 36, this.y - 96, {
            light: 1.24,
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
        bs.x += (dx / dist) * 760 * dt;
        bs.y += (dy / dist) * 760 * dt;
        if (
          !bs.hitReturn &&
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - bs.x) < 58 &&
          Math.abs(enemy.y - 96 - bs.y) < 84
        ) {
          bs.hitReturn = true;
          // Return hit pulls the enemy INWARD toward Malakor!
          enemy.takeDamage(32, this, true, -95, -80);
          this.leechLife(9, enemy, game, 'RETURN HOOK!');
          game.vfx.spawnDamageText(enemy.x, enemy.y - 150, 0, false, '★ BOOMERANG HOOK! ★', '#e879f9');
          game.vfx.spawnGlyphBurst(bs.x, bs.y, 6, 'abyssal');
        }
        if (dist < 42 || bs.timer >= 0.75) {
          this.activeBoomerangScythe = null;
        }
      }
    }

    // 4. Advance Homing Soul-Wisp Orbs (rendered via Row 1 `abyssalSkullWispCell`)
    for (let i = this.soulWisps.length - 1; i >= 0; i--) {
      const w = this.soulWisps[i];
      w.life += dt;
      if (w.life >= w.maxLife) {
        this.soulWisps.splice(i, 1);
      }
    }

    // 5. Advance Haunted Tombstones & apply Tombstone Prison Cage slow/soul-drain to trapped enemies!
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

    // 6. Advance Giant Grim Reaper Death Avatar state
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
        this.leechLife(12, enemy, game, 'ABYSSAL SIPHON');
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

      // Trigger Underground Grave-Submerge & Uppercut Eruption to ambush enemies from 210..340px!
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

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.28) {
      this.torsoAngle = -this.facing * 0.24 * (t / 0.28);
      if (Math.random() < 0.58) {
        game.vfx.spawnParticle({
          x: this.x - this.facing * 18 + (Math.random() - 0.5) * 28,
          y: this.y - 106 + (Math.random() - 0.5) * 28,
          vx: this.facing * 48,
          vy: -78,
          size: 5,
          color: mode === 2 ? '#f43f5e' : '#c084fc',
          maxLife: 0.26
        });
      }
    } else if (t < 0.64) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 135;
        this.torsoVel = this.facing * 13;

        const cx = this.x + this.facing * 52;
        const cy = this.y - 98;
        // Reverse-hook slash arc (curves INWARD toward Malakor!)
        const startA = this.facing === 1 ? 1.25 : Math.PI - 1.25;
        const endA = this.facing === 1 ? -1.75 : Math.PI + 1.75;

        if (mode === 2) {
          // 3rd Strike: Hurls a Returning Twin-Blade Boomerang Phantom Scythe!
          if (game.audio) game.audio.play('scythe_reap', this.x);
          game.vfx.spawnDamageText(this.x, this.y - 146, 0, false, 'BOOMERANG SCYTHE!', '#e879f9');
          this.spawnBoomerangScythe(game);
          this.spawnVfxAnim(4, cx, cy, 200, 200, 0.32, {
            flipX: this.facing < 0,
            glowColor: 'crimson',
            inFront: true
          });
        } else {
          if (game.audio) game.audio.play('scythe_reap', this.x);
        }

        this.fx?.spawn('soulHarvestScytheArc', cx, cy, {
          flip: this.facing < 0,
          light: mode === 2 ? 1.38 : 1.22,
          extra: { radiusWorld: 132, isCrimson: mode === 2, isUppercut: mode === 1 }
        });
        game.vfx.spawnSlash(cx, cy, 128, startA, endA, '#9333ea', 0.30);
        game.vfx.spawnSlash(cx, cy, 104, startA, endA, '#c084fc', 0.24);
        game.vfx.spawnGlyphBurst(cx, cy, 5, 'abyssal');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 46) {
          const isCrit = mode === 2 || Math.random() < 0.24;
          const dmg = mode === 2 ? 60 : mode === 1 ? 54 : 50;
          // Hits 1 & 2 physically HOOK and PULL the enemy INWARD toward Malakor!
          const inwardPull = mode === 2 ? -75 : -65;
          enemy.takeDamage(dmg, this, isCrit, inwardPull, mode === 2 ? -95 : -25);
          if (!enemy.unstoppablePoise) {
            const pullDir = Math.sign(this.x - enemy.x);
            enemy.x += pullDir * 22;
          }
          this.leechLife(mode === 2 ? 14 : 11, enemy, game, 'SOUL HOOK');
          if (game.audio) game.audio.play(mode === 2 ? 'soul_drain' : 'scythe_reap', enemy.x);
          if (game.renderer) game.renderer.triggerHitStop(0.055);
          game.vfx.spawnBurst(enemy.x, enemy.y - 96, 14, '#c084fc', 235);
          game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 96, 5, 'abyssal');
        }
      }
    } else if (t >= 0.86) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    // SIGNATURE SKILL: "SPECTRAL CHAIN & HAUNTED TOMBSTONE PRISON"
    const t = this.stateTimer;
    const ww = game.renderer.worldWidth;

    if (t < 0.08) {
      this.didChainPull = false;
      this.didReapFinisher = false;
      this.torsoAngle = -this.facing * 0.22;
      this.isDeflecting = enemy ? Math.abs(enemy.x - this.x) > 195 : false;
    } else if (t < 0.44) {
      if (!this.didChainPull) {
        this.didChainPull = true;
        if (game.audio) game.audio.play('chain_hook', this.x);

        const targetX = enemy ? enemy.x : this.x + this.facing * 320;
        const targetY = enemy ? enemy.y - 96 : this.y - 96;

        this.fx?.spawn('skeletalChainTetherBeam', this.x + this.facing * 44, this.y - 94, {
          light: 1.32,
          extra: {
            dx: targetX - (this.x + this.facing * 44),
            dy: targetY - (this.y - 94),
            arcH: 14,
            isCrimson: false,
            showClaw: true,
            customDuration: 0.36
          }
        });
        this.spawnVfxAnim(3, targetX, targetY, 184, 184, 0.34, {
          glowColor: 'violet',
          inFront: false
        });
        game.vfx.spawnGlyphBurst(targetX, targetY, 8, 'abyssal');

        if (enemy && !enemy.isDead) {
          enemy.takeDamage(25, this, !enemy.hasPoise, -155, -35);
          game.vfx.spawnDamageText(enemy.x, enemy.y - 154, 0, false, 'TOMBSTONE PRISON!', '#e879f9');
          game.renderer.triggerShake(10, 0.20);
        }
      }

      if (enemy && !enemy.isDead) {
        if (Math.abs(enemy.x - this.x) > 147) {
          this.x += this.facing * 120 * dt;
        }
        const desiredX = Math.max(95, Math.min(ww - 95, this.x + this.facing * 124));
        enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 5.5);
      }
    } else if (!this.didReapFinisher) {
      this.didReapFinisher = true;
      this.isDeflecting = false;
      if (game.audio) game.audio.play('scythe_reap', this.x);
      game.renderer.triggerShake(14, 0.28);
      game.renderer.triggerHitStop(0.06);

      const reapX = this.x + this.facing * 56;
      const startA = this.facing === 1 ? -1.85 : Math.PI - 1.35;
      const endA = this.facing === 1 ? 1.35 : Math.PI + 1.85;
      this.fx?.spawn('soulHarvestScytheArc', reapX, this.y - 98, {
        flip: this.facing < 0,
        light: 1.38,
        extra: { radiusWorld: 146, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(4, reapX, this.y - 98, 212, 212, 0.36, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: true
      });
      game.vfx.spawnSlash(reapX, this.y - 98, 142, startA, endA, '#c084fc', 0.34);
      game.vfx.spawnSlash(reapX, this.y - 98, 114, startA, endA, '#f43f5e', 0.28);
      game.vfx.spawnGlyphBurst(reapX, this.y - 98, 9, 'abyssal');

      // Raise 2 Haunted Gothic Tombstones on BOTH sides of the enemy to cage them!
      const prisonCenter = enemy && !enemy.isDead ? enemy.x : this.x + this.facing * 121;
      this.spawnTombstonePrison(prisonCenter, game);

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 235) {
        enemy.takeDamage(56, this, true, -30, -115);
        this.leechLife(27, enemy, game, 'SOUL DRAIN');
      }
    } else if (t >= 0.88) {
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
        0.34 + i * 0.04
      );
    }
  }

  updateUltimate(dt, enemy, game) {
    // 100% OVERHAULED SOULREAPER ULTIMATE: "GRIM HARVEST — BLOOD-MOON ECLIPSE & SOVEREIGN SCYTHE CATACLYSM"
    const t = this.stateTimer;
    const ww = game.renderer.worldWidth;
    const targetX = enemy ? enemy.x : ww * 0.5;
    this.vx = 0;
    this.vy = 0;
    this.isDeflecting = t < 1.50;
    this.isInvulnerable = t < 1.32;

    if (t < 0.04) {
      this.ultStage = 0;
      this.y = this.groundY;
      this.ultPassStartX = this.x;
      this.ultPassTargetX = targetX;
    }

    // STAGE 1 (t >= 0.04s): Blood-Moon Eclipse Cathedral, Flanking Crypt Obelisks & Sovereign of Death Awakening
    if (t >= 0.04 && this.ultStage === 0) {
      this.ultStage = 1;
      if (game.audio) game.audio.play('soul_drain', targetX);
      game.renderer.triggerShake(15, 0.28);

      // Spawn 2 flanking Haunted Crypt Obelisks framing the execution arena (rendered via Row 2 of reaper_vfx.png!)
      this.tombstones = [];
      for (const side of [-1, 1]) {
        const tx = Math.max(85, Math.min(ww - 85, targetX + side * 185));
        this.tombstones.push({
          x: tx,
          groundY: this.groundY,
          height: 122,
          delay: 0.02,
          life: 1.48,
          maxLife: 1.48,
          shattered: false,
          isPrison: true
        });
        game.vfx.spawnShockwave(tx, this.groundY, 88, '#c084fc', 0.30, true);
      }

      this.deathAvatar = {
        x: targetX,
        y: this.groundY,
        facing: this.facing,
        life: 1.52,
        maxLife: 1.52
      };

      this.fx?.spawn('deathAvatarCathedral', targetX, this.groundY, {
        light: 1.42
      });
      this.spawnVfxAnim(3, targetX, this.groundY - 104, 240, 240, 1.48, {
        glowColor: 'crimson',
        inFront: false
      });
      game.vfx.spawnShockwave(targetX, this.groundY, 210, '#f43f5e', 0.42, true);
      game.vfx.spawnShockwave(targetX, this.groundY, 155, '#c084fc', 0.36, true);
      game.vfx.spawnDamageText(targetX, this.groundY - 268, 0, false, '★ BLOOD-MOON ECLIPSE! ★', '#f43f5e');
      if (enemy && !enemy.isDead) {
        enemy.takeDamage(16, this, false, -25, 0);
        this.leechLife(8, enemy, game, 'ECLIPSE SIPHON');
      }
    }

    // STAGE 2 (t >= 0.26s): Wraith Reap Blitz I — High-Speed Shadow Dash Through Enemy + Spinning Scythe Vortex
    if (t >= 0.26 && this.ultStage === 1) {
      this.ultStage = 2;
      if (game.audio) game.audio.play('scythe_reap', targetX);
      game.renderer.triggerShake(16, 0.26);

      const dir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
      this.ultPassStartX = this.x;
      this.ultPassTargetX = Math.max(110, Math.min(ww - 110, targetX + dir * 145));
      this.facing = -dir;

      this.spawnWraithTrail(this.ultPassStartX, this.groundY, this.ultPassTargetX, this.groundY, dir, 5);
      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 102, {
        flip: dir < 0,
        light: 1.38,
        extra: { radiusWorld: 156, isCrimson: false, isCross: false, isUppercut: false }
      });
      this.spawnVfxAnim(0, targetX - dir * 65, this.groundY - 98, 192, 192, 0.42, {
        vx: dir * 290,
        vy: -18,
        flipX: dir < 0,
        glowColor: 'violet',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 102, 208, 208, 0.34, {
        flipX: dir < 0,
        glowColor: 'violet',
        inFront: true
      });

      const sA = this.facing === 1 ? -1.85 : Math.PI - 1.35;
      const eA = this.facing === 1 ? 1.35 : Math.PI + 1.85;
      game.vfx.spawnSlash(targetX, this.groundY - 102, 172, sA, eA, '#c084fc', 0.36);
      game.vfx.spawnSlash(targetX, this.groundY - 102, 138, sA, eA, '#f43f5e', 0.30);
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 98, 8, 'abyssal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(18, this, true, -dir * 40, -45);
        this.leechLife(10, enemy, game, 'WRAITH REAP I');
      }
    }

    // Smooth continuous wraith glide during Stage 2 (t = 0.26..0.50)
    if (t >= 0.26 && t < 0.50 && this.ultStage === 2) {
      const u = Math.min(1, (t - 0.26) / 0.20);
      const ease = 1 - Math.pow(1 - u, 3);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * ease;
      this.y = this.groundY - Math.sin(u * Math.PI) * 28;
    }

    // STAGE 3 (t >= 0.52s): Wraith Reap Blitz II — Curved Blood-Moon Sky-Arc Slash Across the Prey!
    if (t >= 0.52 && this.ultStage === 2) {
      this.ultStage = 3;
      if (game.audio) game.audio.play('reaper_ult', targetX);
      game.renderer.triggerShake(18, 0.28);

      const dir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
      this.ultPassStartX = this.x;
      this.ultPassTargetX = Math.max(110, Math.min(ww - 110, targetX + dir * 135));
      this.facing = -dir;

      this.spawnWraithTrail(
        this.ultPassStartX,
        this.groundY - 24,
        this.ultPassTargetX,
        this.groundY - 72,
        dir,
        5
      );
      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 116, {
        flip: dir < 0,
        light: 1.4,
        extra: { radiusWorld: 162, isCrimson: true, isCross: false, isUppercut: false }
      });
      this.spawnVfxAnim(0, targetX - dir * 60, this.groundY - 118, 196, 196, 0.42, {
        vx: dir * 265,
        vy: 38,
        flipX: dir < 0,
        glowColor: 'crimson',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 114, 212, 212, 0.36, {
        flipX: dir < 0,
        glowColor: 'crimson',
        inFront: true
      });

      const sA = this.facing === 1 ? -1.95 : Math.PI - 1.45;
      const eA = this.facing === 1 ? 1.45 : Math.PI + 1.95;
      game.vfx.spawnSlash(targetX, this.groundY - 116, 182, sA, eA, '#f43f5e', 0.38);
      game.vfx.spawnSlash(targetX, this.groundY - 116, 146, sA, eA, '#c084fc', 0.32);
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 110, 9, 'abyssal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(20, this, true, -dir * 35, -55);
        this.leechLife(10, enemy, game, 'BLOOD-MOON REAP');
      }
    }

    // Smooth parabolic sky-arc motion during Stage 3 (t = 0.52..0.76) — never freezes static in mid-air!
    if (t >= 0.52 && t < 0.76 && this.ultStage === 3) {
      const u = Math.min(1, (t - 0.52) / 0.22);
      const ease = 1 - Math.pow(1 - u, 2);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * ease;
      this.y = this.groundY - Math.sin(u * Math.PI) * 92;
    }

    // STAGE 4 (t >= 0.76s): Wraith Reap Blitz III — Ascending Vortex Uppercut & Soul-Chain Snare!
    if (t >= 0.76 && this.ultStage === 3) {
      this.ultStage = 4;
      if (game.audio) game.audio.play('chain_hook', targetX);
      game.renderer.triggerShake(20, 0.28);

      const dir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
      this.ultPassStartX = this.x;
      this.ultPassTargetX = Math.max(115, Math.min(ww - 115, targetX - dir * 118));
      this.facing = dir;

      this.spawnWraithTrail(this.ultPassStartX, this.groundY - 38, this.ultPassTargetX, this.groundY, dir, 4);
      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 104, {
        flip: dir < 0,
        light: 1.4,
        extra: { radiusWorld: 152, isCrimson: false, isCross: true, isUppercut: true }
      });
      this.fx?.spawn('skeletalChainTetherBeam', this.x, this.y - 84, {
        light: 1.34,
        extra: {
          dx: targetX - this.x,
          dy: this.groundY - 96 - (this.y - 84),
          arcH: -22,
          isCrimson: true,
          showClaw: true,
          customDuration: 0.32
        }
      });

      game.vfx.spawnShockwave(targetX, this.groundY - 96, 145, '#c084fc', 0.34, false, true);
      game.vfx.spawnGlyphBurst(targetX, this.groundY - 108, 10, 'abyssal');

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(18, this, true, 0, -90);
        this.leechLife(8, enemy, game, 'SOUL SNARE');
      }
    }

    if (t >= 0.76 && t < 1.00 && this.ultStage === 4) {
      const u = Math.min(1, (t - 0.76) / 0.22);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * u;
      this.y = this.groundY - Math.sin(u * Math.PI) * 54;
    } else if (t >= 1.00) {
      this.y = this.groundY;
    }

    if (this.deathAvatar) {
      this.deathAvatar.x = targetX;
    }

    // STAGE 5 (t >= 1.00s): Synchronized Sovereign X-Guillotine Cataclysm & 3 Abyssal Soul-Geysers!
    if (t >= 1.00 && this.ultStage === 4) {
      this.ultStage = 5;
      if (game.audio) game.audio.play('scythe_reap', targetX);

      game.renderer.triggerShake(28, 0.58);
      game.renderer.triggerAberration(16);
      game.renderer.triggerHitStop(0.095);

      // Giant Crisscrossing Crimson & Violet X-Guillotine Crescent Arcs + Row-4 Reap Nova + Row-3 Pentagram Seal
      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 108, {
        flip: false,
        light: 1.48,
        extra: { radiusWorld: 162, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.fx?.spawn('necroticGraveyardSigil', targetX, this.groundY, {
        palette: BLOOD_MOON_CRIMSON_PALETTE,
        light: 1.42,
        extra: { radius: 46, isPrison: true, isCrimson: true, customDuration: 0.62 }
      });
      this.spawnVfxAnim(3, targetX, this.groundY - 96, 236, 236, 0.48, {
        glowColor: 'crimson',
        inFront: true
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 102, 244, 244, 0.46, {
        glowColor: 'crimson',
        inFront: true
      });

      // Erupt 3 towering Abyssal Soul-Geyser Pillars (center + flanking)
      const geyserOffsets = [0, -130, 130];
      geyserOffsets.forEach((off, idx) => {
        const gx = Math.max(75, Math.min(ww - 75, targetX + off));
        game.vfx.spawnFlamePillar(gx, this.groundY, this, null, {
          theme: 'abyssal',
          delay: idx === 0 ? 0 : 0.05,
          maxLife: idx === 0 ? 0.82 : 0.68,
          scaleWidth: idx === 0 ? 1.18 : 0.86,
          isUltimate: idx === 0
        });
      });

      // Diagonal Heaven-to-Hell Crimson & Violet Execution Beams
      game.vfx.spawnBeam({
        x1: targetX - 210,
        y1: -120,
        x2: targetX + 55,
        y2: this.groundY - 6,
        width: 58,
        color: '#f43f5e',
        coreColor: '#ffffff',
        maxLife: 0.54
      });
      game.vfx.spawnBeam({
        x1: targetX + 210,
        y1: -120,
        x2: targetX - 55,
        y2: this.groundY - 6,
        width: 58,
        color: '#c084fc',
        coreColor: '#ffffff',
        maxLife: 0.54
      });

      game.vfx.spawnSlash(targetX, this.groundY - 115, 215, -2.1, 1.2, '#c084fc', 0.46);
      game.vfx.spawnSlash(targetX, this.groundY - 115, 198, Math.PI - 1.2, Math.PI + 2.1, '#f43f5e', 0.42);
      game.vfx.spawnShockwave(targetX, this.groundY, 225, '#c084fc', 0.46, true);
      game.vfx.spawnShockwave(targetX, this.groundY - 102, 175, '#f43f5e', 0.40, false, true);

      for (const tb of this.tombstones) {
        tb.shattered = true;
        tb.life = Math.min(tb.life, tb.maxLife * 0.28);
        game.vfx.spawnGlyphBurst(tb.x, this.groundY - 48, 5, 'abyssal');
        game.vfx.spawnBurst(tb.x, this.groundY - 40, 12, '#c084fc', 245, { upBias: 125, size: 6 });
      }

      if (enemy && !enemy.isDead) {
        enemy.takeDamage(64, this, true, this.facing * 165, -230);
        this.leechLife(20, enemy, game, 'GRIM HARVEST');
        game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 98, 14, 'abyssal');
      }
    }

    if (t >= 1.54) {
      this.y = this.groundY;
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
   * Background 2.5D Shader Pass (`back`) + `reaper_vfx.png` Tombstone Spires (Row 2), Pentagram Seals (Row 3) & Wraith Afterimages
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
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(img.x / 4) * 4, Math.round((img.y + 4) / 4) * 4);
        ctx.scale(img.facing, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        PixelForge.drawAfterimageFrame(ctx, sprites, img.frameIdx || 190, 208, 208);
        ctx.restore();
      }
    }

    if (!vfxSheet?.complete) return;

    // 2. Haunted Gothic Tombstone Spires (`Row 2: necroticBoneSpireCell`)
    for (const ts of this.tombstones) {
      if (ts.delay > 0 || ts.life <= 0) continue;
      const u = Math.min(1, Math.max(0, 1 - ts.life / ts.maxLife));
      const col = Math.min(29, Math.floor(u * 30));
      const pop = Math.min(1, (ts.maxLife - ts.life) / 0.18);
      const fade = Math.min(1, ts.life * 3.0);
      const sz = Math.round(164 + ((ts.height ?? 100) - 96) * 0.65);
      const by = (ts.groundY ?? this.groundY) - sz * 0.34 + (1 - pop) * 32;
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

    // 3. Background 30fps `reaper_vfx.png` Cell Animations (Row 3 Pentagram Seals, etc.)
    for (const v of this.activeVfxAnims) {
      if (v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / v.maxLife));
      const span = Math.max(1, v.endFrame - v.startFrame + 1);
      const col = Math.min(29, v.startFrame + Math.floor(u * span));
      const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        v.row,
        col,
        v.x,
        v.y,
        v.w,
        v.h,
        fade * 0.9,
        v.flipX,
        renderer,
        v.glowColor
      );
    }
  }

  /**
   * Foreground 2.5D Shader Pass (`front`) + `reaper_vfx.png` Boomerang Scythe (Row 0), Floating Skull Wisps (Row 1) & Reap Novas (Row 4)
   */
  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.reaper : null;
    const vfxSheet = sprites?.vfx;
    if (!vfxSheet?.complete) return;

    // 1. Returning Twin-Blade Phantom Scythe Boomerang (`Row 0: soulScytheWaveCell`)
    if (this.activeBoomerangScythe) {
      const bs = this.activeBoomerangScythe;
      const col = Math.floor((bs.timer * 38) % 30);
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        0,
        col,
        bs.x,
        bs.y,
        156,
        156,
        0.96,
        bs.dir < 0,
        renderer,
        bs.phase === 'return' ? 'crimson' : 'violet'
      );
    }

    // 2. Homing Necrotic Skull Wisps (`Row 1: abyssalSkullWispCell`) curving into Malakor's chest
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
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        v.row,
        col,
        v.x,
        v.y,
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
    ctx.scale(this.facing, 1);

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
