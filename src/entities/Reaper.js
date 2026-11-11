import { Fighter } from './Fighter.js?v=30fps65';
import { PixelForge } from '../engine/PixelForge.js?v=30fps65';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps65';
import {
  ABYSSAL_EFFECT_REGISTRY,
  ABYSSAL_VIOLET_PALETTE,
  BLOOD_MOON_CRIMSON_PALETTE
} from '../engine/shaders/abyssalShaders.js?v=30fps65';

/**
 * Malakor v5 (`reaper`) — Gothic Arch-Reaper & Sovereign of Severed Souls.
 *
 * Complete S-Tier Kit Rework:
 * - Passive (`SOUL HARVESTER & WRAITH STEP`):
 *   Harvests up to 5 orbiting **Soul Fragments** (`this.soulStacks`) around Malakor's Ferryman Lantern;
 *   empowers finishers & skills (`CRIMSON REAP`), phases through attacks via **Grave Phase** (`CROUCH`)
 *   and **Wraith Ambush** (`DODGE`), and executes cornered foes with **Reaper's Glide** (`JUMP`).
 * - 3-Stage Auto (`TRINITY OF THE SCYTHE`):
 *   (1) *Crescent Reap & Soul Wave* (wide 2H cleave + mid-range `Row 0` crescent wave projectile),
 *   (2) *Ferryman's Hook-Slash* (inward scythe pull + chain snap),
 *   (3) *Thanatos Stand Cross-Guillotine* (manifests the **Towering Hooded Thanatos Stand (`Row 3`)**
 *       behind Malakor for a unison X-cross Crit cleave + piercing/returning `Soul-Disc` boomerang).
 * - Signature Skill (`SOUL SEVER` • `4.4s CD`):
 *   Fires the Ferryman's Chain (`460px` reach) to rip a **Captive Severed Soul Effigy** (`this.severedSoul`,
 *   `Row 1` + live Soul-Link tether) out of the enemy (`2.6s` duration)—echoing `35%` bonus Soul-Resonance
 *   damage through the link (or `65%` transmitted damage when Malakor cleaves the effigy directly!), followed
 *   by a shadow-step **X-Scissor Soul-Snap Guillotine** (`Row 4` + grounded `Row 2` Obelisk) consuming souls!
 * - Overdrive (`ULTIMATE` — `DEATH'S SOVEREIGNTY`):
 *   Crisp `1.0x` HD-2D Malakor summons his **Towering Thanatos Death-God Stand (`Row 3`)** + **Twin Wraith
 *   Executioner Clones** (`this.wraithClones`) for a 3-way phantom pincer blitz culminating in a unison
 *   Stand + Malakor **Abyssal Cross-Guillotine** and 5-wave Guillotine Obelisk fault-line.
 * - Supreme Ultimate (`TRUE_ULTIMATE` — `MEMENTO MORI: OBLIVION GUILLOTINE`, `4.50s`):
 *   Localized twilight dim (`0` stage background replacement!), unsealing **Twin Cathedral Gates of Oblivion
 *   (`Row 5`)**, binding all active foes in the **Six-Scythe Death-Clock Seal (`Row 6`)** with `0` micro-ticks,
 *   and cleaving reality with **`Row 7` Oblivion Cross-Guillotine** for ONE massive instantaneous Crit burst!
 */
export class Reaper extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Malakor',
      maxHp: 3900,
      attackRange: 200,
      moveSpeed: 200,
      autoInterval: 0.92,
      lightColor: 'rgba(217, 70, 239, 1)',
      primaryColor: '#d946ef',
      hasTrueUltimate: true,
      trueUltName: 'MEMENTO MORI: OBLIVION GUILLOTINE',
      trueUltDuration: 4.50
    });

    this.heroId = 'reaper';
    this.theme = 'abyssal';
    this.deathSfx = 'death_reaper';
    this.hasPoise = true;
    this.unstoppablePoise = false;
    this.isDeflecting = false;

    this.skillMaxCooldown = 4.50;
    this.skillTriggerRange = 450;
    this.autoDuration = 0.90;
    this.skillDuration = 0.98;
    this.ultDuration = 1.62;

    this.skillName = 'SOUL SEVER';
    this.ultName = "DEATH'S SOVEREIGNTY";
    this.hasTrueUltimate = true;
    this.trueUltName = 'MEMENTO MORI: OBLIVION GUILLOTINE';
    this.trueUltDuration = 4.50;

    this._trueUltStep = 0;
    this._trueUltAltarX = 600;
    this._trueUltSlashFlash = 0;
    this._trueUltEnemy = null;

    this.comboStep = 0;
    this.stepDustTimer = 0;

    // Crisp 1.0x HD-2D character rendering (colossal presence comes from Thanatos Stand & Cathedral Gates!)
    this.giantScale = 1.0;

    // Malakor v5 Sovereign of Severed Souls Systems
    this.soulStacks = 2; // Starts battle with 2 harvested Soul Fragments orbiting his Ferryman Lantern
    this.maxSoulStacks = 5;
    this.soulOrbitPhase = 0;

    this.severedSoul = null; // Captive Severed Soul Effigy ripped from enemy during SOUL SEVER
    this.scytheWave = null; // Stage-1 Crescent Soul-Wave anti-kite projectile (Row 0)
    this.thanatosStand = null; // Towering Hooded Thanatos Death-God Stand Avatar (Row 3)
    this.wraithClones = []; // Crisp 1.0x HD-2D Wraith Executioner Clones during Overdrive & True Ult

    this.soulWisps = []; // Homing Soul-Leech Wisp orbs (Row 1 of reaper_vfx.png)
    this.tombstones = []; // Ground-erupting Abyssal Guillotine Obelisks (Row 2 of reaper_vfx.png)
    this.boneCage = null; // Soul-Shackle Sanctuary zone around Severed Soul
    this.faultSpireQueue = []; // Chaining 5-Wave Guillotine Obelisk Fault-Line queue
    this.deathAvatar = null; // Legacy-compatible alias synced with thanatosStand during Overdrive
    this.activeScytheBoomerang = null; // Returning Twin-Blade Phantom Soul-Disc (Hit 3)
    this.activeBoomerangScythe = null; // Alias kept in sync with activeScytheBoomerang
    this.afterimages = []; // Crisp HD-2D Wraith Afterimages
    this.activeVfxAnims = []; // Active 30fps reaper_vfx.png cell animations (Rows 0..7)

    // Wraith Phase & Grave Phase state
    this.isSubmerged = false;
    this.submergeDepth = 0;
    this.submergeDir = 1;
    this.wraithAlpha = 1.0;
    this._inResonanceEcho = false;

    this.didChainPull = false;
    this.didReapFinisher = false;
    this.ultStage = 0;
    this.dodgeMaxCooldown = 3.50;
    this.dashMaxCooldown = 3.40;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 0;
    this.crouchDuration = 0.84;
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
      if (reaperAssets?.vfx?.src && !reaperAssets.vfx.src.includes('v=30fps65')) {
        reaperAssets.vfx.src = 'assets/sprites/reaper_vfx.png?v=30fps65';
      }
      if (reaperAssets?.sheet?.src && !reaperAssets.sheet.src.includes('v=30fps65')) {
        reaperAssets.sheet.src = 'assets/sprites/reaper_sheet.png?v=30fps65';
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
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltSlashFlash = 0;
    } else if (newState !== 'ULTIMATE') {
      this.giantScale = 1.0;
      this.isInvulnerable = newState === 'DODGE' || newState === 'JUMP';
      this.deathAvatar = null;
      this.wraithClones = [];
      this.fx?.stopByKey('deathAvatarCathedral');
      this.fx?.stopByKey('necropolisBoneyardDomain');
      this.fx?.stopByKey('mementoMoriNecropolisGates');
    }
    this.unstoppablePoise =
      newState === 'SKILL' ||
      newState === 'ULTIMATE' ||
      newState === 'TRUE_ULTIMATE' ||
      (newState === 'AUTO_ATTACK' && this.comboStep % 3 === 2);

    if (newState === 'DEATH') {
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this._trueUltSlashFlash = 0;
      this.severedSoul = null;
      this.scytheWave = null;
      this.thanatosStand = null;
      this.wraithClones = [];
      this.boneCage = null;
      this.faultSpireQueue = [];
      this.fx?.clear();
    }
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

  /**
   * Manifests the Towering Hooded Thanatos Death-God Stand (`Row 3` of `reaper_vfx.png`)
   * hovering majestically behind Malakor or over the execution altar.
   */
  spawnThanatosStand(duration = 0.68, size = 272, anchorX = null, followOwner = true) {
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

  /**
   * Spawns a crisp 1.0x HD-2D Wraith Executioner Clone (`PixelForge.drawAfterimageFrame`)
   * that dashes between `startX -> endX` executing synchronized scythe slashes.
   */
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

  spawnAfterimage(x, y, facing, row = 6, col = 14, maxLife = 0.28, scale = 1.0) {
    this.afterimages.push({
      x,
      y,
      facing,
      frameIdx: row * 30 + col,
      age: 0,
      maxLife,
      scale: scale || 1.0
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
    // Stage 1 fires a mid-range Crescent Soul-Wave (315px) & Stage 3 hurls the Returning Soul-Disc (410px)!
    const mode = this.comboStep % 3;
    if (mode === 2) return 410;
    if (mode === 0) return 265;
    return this.attackRange;
  }

  /**
   * Central Soul-Resonance Damage Helper:
   * Deals scythe damage to `target` AND triggers **35% Soul-Link Resonance Echo** if `this.severedSoul`
   * is currently bound to `target`!
   */
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
   * If Malakor cleaves near the captive `this.severedSoul` while the enemy kited out of melee range,
   * striking the exposed Soul Effigy transmits `55%` damage directly down the Soul-Link into the enemy!
   */
  tryStrikeSeveredEffigy(strikeX, baseDmg, game) {
    const ss = this.severedSoul;
    if (!ss || ss.life <= 0 || (ss.echoCooldown || 0) > 0) return false;
    const tgt = ss.target;
    if (!tgt || tgt.isDead || tgt.isBenched) return false;
    if (Math.abs(strikeX - ss.x) > 135) return false;

    ss.echoCooldown = 0.30;
    const transmitted = Math.max(11, Math.round(baseDmg * 0.55));
    this._inResonanceEcho = true;
    tgt.takeDamage(transmitted, this, true, -55, -35);
    this._inResonanceEcho = false;

    if (!tgt.unstoppablePoise) {
      tgt.x += Math.sign(ss.x - tgt.x) * 26;
    }
    this.leechLife(6, tgt, game, 'SOUL LINK');
    this.spawnVfxAnim(4, ss.x, ss.y, 172, 172, 0.28, {
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
      game.vfx.spawnDamageText(tgt.x, tgt.y - 152, 0, false, '★ SOUL LINK REND! ★', '#f43f5e');
    }
    return true;
  }

  /**
   * Bespoke Ferryman Soul-Siphon:
   * Rips homing crimson-violet Soul-Leech Wisp orbs (`Row 1` of `reaper_vfx.png`) out of the target
   * into Malakor's Ferryman Lantern & sternum Soul-Core!
   */
  leechLife(amount, sourceEntity, game, label = 'SOUL HARVEST') {
    if (this.isDead || amount <= 0) return 0;
    const prevHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const actual = Math.max(1, Math.round(amount));
    if (this.stats) {
      this.stats.healingDone += Math.max(0, Math.round(this.hp - prevHp));
    }

    if (game && game.vfx) {
      game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, `${label} +${actual}`, '#e879f9');
      game.vfx.spawnGlyphBurst(this.x, this.y - 98, 5, 'abyssal');
    }

    const fromX = sourceEntity ? sourceEntity.x : this.x + this.facing * 120;
    const fromY = sourceEntity ? sourceEntity.y - 96 : this.y - 96;
    const count = Math.min(4, Math.max(2, Math.round(actual / 8)));
    for (let i = 0; i < count; i++) {
      this.soulWisps.push({
        startX: fromX + (Math.random() - 0.5) * 34,
        startY: fromY + (Math.random() - 0.5) * 34,
        arcHeight: -44 - Math.random() * 60 + (i % 2 === 0 ? -22 : 22),
        life: -i * 0.04,
        maxLife: 0.46 + Math.random() * 0.14,
        glowColor: i % 2 === 0 ? 'violet' : 'crimson'
      });
    }
    this.fx?.spawn('skeletalChainTetherBeam', fromX, fromY, {
      light: 1.24,
      extra: {
        dx: this.x - fromX,
        dy: this.y - 96 - fromY,
        arcH: -56,
        isCrimson: count % 2 === 0,
        isComet: true,
        showClaw: false,
        customDuration: 0.44
      }
    });
    return this.hp - prevHp;
  }

  /**
   * Spawns a Captive **Severed Soul Effigy** (`this.severedSoul`) ripped out of `enemy` during `SOUL SEVER`,
   * anchored between twin grounded `Row 2` Guillotine Obelisks!
   */
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

  spawnOssuaryBoneCage(enemyX, game) {
    this.spawnSeveredSoulEffigy(this._trueUltEnemy, enemyX, game);
  }

  spawnTombstonePrison(enemyX, game) {
    this.spawnSeveredSoulEffigy(this._trueUltEnemy, enemyX, game);
  }

  /**
   * Launches Stage-1 Crescent Soul-Wave (`this.scytheWave`, `Row 0`) to pressure mid-range kiters!
   */
  spawnCrescentScytheWave() {
    const startX = this.x + this.facing * 58;
    const startY = this.y - 98;
    this.scytheWave = {
      x: startX,
      y: startY,
      startX,
      dir: this.facing,
      vx: this.facing * 650,
      maxDist: 310,
      age: 0,
      maxLife: 0.48,
      didHit: false
    };
  }

  /**
   * Spawns the Spinning Twin-Blade Phantom Soul-Disc (`this.activeScytheBoomerang`, `Row 0`)
   * on Hit 3 that slices outbound and hooks enemies inward on return!
   */
  spawnBoomerangScythe() {
    const startX = this.x + this.facing * 58;
    const startY = this.y - 100;
    const boomerang = {
      x: startX,
      y: startY,
      startX,
      targetX: startX + this.facing * 400,
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

  /**
   * Queues a Chaining 5-Wave Abyssal Guillotine Obelisk Fault-Line across `this.groundY`.
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
   * CROUCH: "GRAVE PHASE & RISING SCYTHE UPPERCUT"
   */
  startCrouch(enemy, game) {
    this.crouchCooldown = 4.55;
    this.crouchDuration = 0.84;
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
      light: 1.22,
      extra: { radius: 26, isPrison: false, customDuration: 0.46 }
    });
    if (game && game.audio) game.audio.play('soul_drain', this.x);
    if (game && game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 7, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 128, 0, false, 'WRAITH SINK!', '#e879f9');
    }
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.38;
    this.isDeflecting = true;
    this.isSubmerged = false;
    this.submergeDepth = 0.35;
    this.isWraithPhase = false;
    this.vx = dir * 495;
    this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY - 4, {
      follow: this,
      offsetX: 0,
      offsetY: -4,
      useGroundY: true,
      maxDuration: 0.36,
      light: 1.24,
      extra: { radius: 24, isSubmerged: false }
    });
    if (game.audio) game.audio.play('dash_whoosh', this.x);
    if (game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 6, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'WRAITH STEP!', '#d946ef');
    }
  }

  onStartDodge(enemy, game, dir, forceJump = false) {
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const dist = enemy ? Math.abs(enemy.x - this.x) : 0;
    const nearWall = this.x < 280 || this.x > ww - 280;

    // 1. REAPER'S GLIDE & FALLING GUILLOTINE (Row 8 JUMP)
    if (forceJump || (nearWall && dist < 265)) {
      this.isFlipVault = true;
      this.isWraithPhase = false;
      this.isSubmerged = false;
      this.wraithAlpha = 0.52;
      this.flipStartX = this.x;
      this.flipAngle = 0;
      this.wallFlipCooldown = 3.1;
      this.dashDuration = 0.62;

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
        maxDuration: 0.56,
        light: 1.26,
        extra: { radius: 26, isSubmerged: false, isCrimson: true }
      });
      if (game.audio) game.audio.play('blink', this.x);
      if (game.vfx) {
        game.vfx.spawnGlyphBurst(this.x, this.y - 60, 7, 'abyssal');
        game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, "REAPER'S GLIDE!", '#e879f9');
      }
      return;
    }

    // 2. WRAITH PHASE-SHIFT BACK-AMBUSH
    if (enemy && !enemy.isDead && dist <= 235) {
      this.isFlipVault = false;
      this.isWraithPhase = true;
      this.isSubmerged = true;
      this.submergeDepth = 0.88;
      this.dashDuration = 0.34;
      this.isDeflecting = true;
      this.phaseStartX = this.x;
      const passDir = Math.sign(enemy.x - this.x) || this.facing;
      let behindX = enemy.x + passDir * 146;
      if (behindX < 105 || behindX > ww - 105) {
        behindX = enemy.x - passDir * 146;
      }
      this.phaseTargetX = Math.max(95, Math.min(ww - 95, behindX));
      this.dashDir = Math.sign(this.phaseTargetX - this.phaseStartX) || passDir;
      this.vx = 0;
      this.gainSoulStack(1);
      this.fx?.spawn('abyssalWraithMantle', this.x, this.groundY - 4, {
        follow: this,
        offsetX: 0,
        offsetY: -4,
        useGroundY: true,
        maxDuration: 0.34,
        light: 1.28,
        extra: { radius: 28, isSubmerged: true, isCrimson: true }
      });
      if (game.audio) game.audio.play('blink', this.x);
      if (game.vfx) {
        game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 8, 'abyssal');
        game.vfx.spawnDamageText(this.x, this.y - 144, 0, false, 'WRAITH AMBUSH!', '#e879f9');
      }
      return;
    }

    this.isFlipVault = false;
    this.isWraithPhase = false;
    this.isSubmerged = false;
    this.submergeDepth = 0.38;
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
    if (game.audio) game.audio.play('soul_drain', this.x);
    if (game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 24, 6, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 142, 0, false, 'SHADOW VEIL!', '#e879f9');
    }
  }

  updateDashOrDodge(dt, enemy, game) {
    const t = this.stateTimer;

    // Row 8 JUMP: Reaper's Glide & Missing-HP Falling Guillotine Execute!
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

      if (u < 0.60 && Math.random() < 0.45) {
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 29)), 0.24);
      }

      if (u >= 0.58 && !this.didActionFrame) {
        this.didActionFrame = true;
        if (game.audio) game.audio.play('scythe_reap', this.x);
        const cx = this.x + this.facing * 54;
        const cy = this.y - 82;

        this.fx?.spawn('soulHarvestScytheArc', cx, cy, {
          flip: this.facing < 0,
          light: 1.40,
          extra: { radiusWorld: 144, isCrimson: true, isCross: true, isUppercut: false }
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

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 210) {
          const missingRatio = Math.max(0, Math.min(1, 1 - enemy.hp / enemy.maxHp));
          const execDmg = Math.round(40 + missingRatio * 30);
          this.strikeWithSoulResonance(enemy, execDmg, true, -this.facing * 65, -145, game);
          this.gainSoulStack(1);
          this.leechLife(11, enemy, game, 'FALLING GUILLOTINE');
          if (game.vfx) {
            game.vfx.spawnDamageText(enemy.x, enemy.y - 156, 0, false, '★ FALLING GUILLOTINE! ★', '#f43f5e');
          }
          if (game.renderer) game.renderer.triggerShake(12, 0.24);
        } else {
          this.tryStrikeSeveredEffigy(cx, 46, game);
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
      if (Math.random() < 0.52) {
        this.spawnAfterimage(this.x, this.groundY, this.facing, 6, 12, 0.20);
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

    const speed = this.state === 'DASH' ? 495 : 435;
    this.x += this.dashDir * speed * dt;

    if (Math.random() < 0.45) {
      this.spawnAfterimage(this.x, this.groundY, this.facing, 6, 14, 0.18);
    }

    if (
      this.state === 'DASH' &&
      !this.didActionFrame &&
      enemy &&
      !enemy.isDead &&
      Math.abs(enemy.x - this.x) <= 165
    ) {
      this.didActionFrame = true;
      this.strikeWithSoulResonance(enemy, 34, false, -58, -60, game);
      this.gainSoulStack(1);
      this.leechLife(9, enemy, game, 'WRAITH REAP');
      if (game.audio) game.audio.play('scythe_reap', enemy.x);
      this.fx?.spawn('soulHarvestScytheArc', this.x + this.facing * 48, this.y - 96, {
        flip: this.facing < 0,
        light: 1.28,
        extra: { radiusWorld: 128, isCrimson: false, isUppercut: false }
      });
      this.spawnVfxAnim(0, this.x + this.facing * 48, this.y - 96, 176, 176, 0.28, {
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
   * CROUCH UPDATE: "GRAVE PHASE & RISING 2H SCYTHE UPPERCUT"
   */
  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.84;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;

    if (t < 0.36) {
      this.isCrouching = true;
      this.isSubmerged = true;
      this.isDeflecting = true;
      this.submergeDepth = Math.min(1, t / 0.14);

      if (enemy && !enemy.isDead) {
        const desiredX = enemy.x - this.submergeDir * 76;
        const delta = desiredX - this.x;
        const slideSpeed = Math.min(405, Math.max(200, Math.abs(delta) * 3.9));
        this.x += Math.sign(delta || this.submergeDir) * slideSpeed * dt;
      } else {
        this.x += this.submergeDir * 315 * dt;
      }
      this.x = Math.max(90, Math.min(ww - 90, this.x));
    } else if (!this.didActionFrame) {
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
        game.renderer.triggerShake(14, 0.26);
        game.renderer.triggerHitStop(0.055);
      }

      const eruptX = this.x + this.facing * 50;
      const eruptY = this.groundY - 96;

      this.fx?.spawn('soulHarvestScytheArc', eruptX, eruptY, {
        flip: this.facing < 0,
        light: 1.40,
        extra: { radiusWorld: 144, isCrimson: true, isUppercut: true }
      });
      this.spawnGroundedBoneSpire(eruptX, 208, 0.50, {
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
        game.vfx.spawnDamageText(this.x, this.y - 152, 0, false, '★ GRAVE UPPERCUT! ★', '#e879f9');
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 198) {
        this.strikeWithSoulResonance(enemy, 52, true, -48, -195, game);
        this.gainSoulStack(1);
        this.leechLife(11, enemy, game, 'GRAVE HARVEST');
      } else {
        this.tryStrikeSeveredEffigy(eruptX, 52, game);
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
    this.soulOrbitPhase += dt * 3.6;

    if (this._trueUltSlashFlash > 0) {
      this._trueUltSlashFlash = Math.max(0, this._trueUltSlashFlash - dt);
    }
    if (enemy) {
      this._trueUltEnemy = enemy;
    }

    // 1. Step Wraith Afterimages & Wraith Executioner Clones
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

    // 2. Step Thanatos Death-God Stand Avatar (`Row 3`)
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

    // 3. Step Captive Severed Soul Effigy (`this.severedSoul`)
    if (this.severedSoul) {
      this.severedSoul.life -= dt;
      this.severedSoul.echoCooldown = Math.max(0, (this.severedSoul.echoCooldown || 0) - dt);
      const tgt = this.severedSoul.target;
      if (!tgt || tgt.isDead || tgt.isBenched || this.severedSoul.life <= 0) {
        this.severedSoul = null;
      } else if (Math.abs(tgt.x - this.severedSoul.x) < 340 && !tgt.unstoppablePoise) {
        // Gentle Soul-Link drag pulling tethered foe toward their severed spirit!
        tgt.vx *= Math.pow(0.28, dt);
        tgt.x += (this.severedSoul.x - tgt.x) * Math.min(1, dt * 1.45);
      }
    }

    // 4. Step Stage-1 Crescent Scythe Soul-Wave (`this.scytheWave`, Row 0)
    if (this.scytheWave) {
      const sw = this.scytheWave;
      sw.age += dt;
      sw.x += sw.vx * dt;
      if (
        !sw.didHit &&
        enemy &&
        !enemy.isDead &&
        Math.abs(enemy.x - sw.x) < 58 &&
        Math.abs(enemy.y - 96 - sw.y) < 88
      ) {
        sw.didHit = true;
        this.strikeWithSoulResonance(enemy, 42, false, -38, -24, game);
        this.gainSoulStack(1);
        this.leechLife(5, enemy, game, 'SOUL WAVE');
        this.spawnVfxAnim(4, sw.x, sw.y, 148, 148, 0.24, {
          flipX: sw.dir < 0,
          glowColor: 'violet',
          inFront: true
        });
      }
      if (sw.didHit || Math.abs(sw.x - sw.startX) >= sw.maxDist || sw.age >= sw.maxLife) {
        this.scytheWave = null;
      }
    }

    // 5. Step Active 30fps `reaper_vfx.png` Animations
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

    // 6. Step Chaining 5-Wave Abyssal Guillotine Obelisk Fault-Line Queue
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
          this.fx?.spawn('deathAvatarCathedral', sp.x, this.groundY - 4, {
            light: 1.38
          });
        }
        if (enemy && !enemy.isDead && Math.abs(enemy.x - sp.x) <= 78) {
          this.strikeWithSoulResonance(enemy, 15, true, this.facing * 42, -90, game);
          this.leechLife(5, enemy, game, 'OBELISK ERUPT');
        }
      }
    }

    // 7. Advance Spinning Twin-Blade Phantom Soul-Disc (`this.activeScytheBoomerang`, Row 0)
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
          this.strikeWithSoulResonance(enemy, 42, false, -42, -52, game);
          this.gainSoulStack(1);
          this.leechLife(6, enemy, game, 'SOUL DISC');
          this.spawnVfxAnim(1, bs.x, bs.y, 124, 124, 0.26, {
            glowColor: 'violet',
            inFront: true
          });
        }
        if (Math.abs(bs.x - bs.startX) >= 400 || bs.timer >= 0.56) {
          bs.phase = 'hover';
          bs.timer = 0;
        }
      } else if (bs.phase === 'hover') {
        if (!bs.hitHover && bs.timer >= 0.09 && enemy && !enemy.isDead && Math.abs(enemy.x - bs.x) < 72) {
          bs.hitHover = true;
          this.strikeWithSoulResonance(enemy, 32, true, -58, -64, game);
          this.leechLife(5, enemy, game, 'VORTEX SHRED');
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
          this.strikeWithSoulResonance(enemy, 47, true, -96, -80, game);
          this.gainSoulStack(1);
          this.leechLife(6, enemy, game, 'RETURN REAP!');
          if (game.vfx) {
            game.vfx.spawnDamageText(enemy.x, enemy.y - 150, 0, false, '★ SOUL DISC RETURN! ★', '#e879f9');
          }
        }
        if (dist < 42 || bs.timer >= 0.75) {
          this.activeScytheBoomerang = null;
          this.activeBoomerangScythe = null;
        }
      }
    }

    // 8. Advance Homing Soul-Leech Wisps & Grounded Obelisks
    for (let i = this.soulWisps.length - 1; i >= 0; i--) {
      const w = this.soulWisps[i];
      w.life += dt;
      if (w.life >= w.maxLife) {
        this.soulWisps.splice(i, 1);
      }
    }

    if (this.boneCage) {
      this.boneCage.life -= dt;
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.boneCage.x) < this.boneCage.radius + 20) {
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

    // Autonomous Hazard Evasion & Tactical Positioning
    if (!this.isDead && (this.state === 'IDLE' || this.state === 'WALK') && this.dodgeCooldown <= 0 && game?.vfx) {
      const inPillar = game.vfx.pillars.some(
        (pil) => pil.erupted && pil.owner !== this && Math.abs(pil.x - this.x) < 105
      );
      if (inPillar) {
        this.gainSoulStack(1);
        this.leechLife(10, enemy, game, 'ABYSSAL SIPHON');
        this.skillCooldown = Math.max(0, this.skillCooldown - 0.50);
        this.startDodge(enemy, game);
        return;
      }
    }

    if (!this.isDead && enemy && !enemy.isDead && (this.state === 'IDLE' || this.state === 'WALK')) {
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const dist = Math.abs(enemy.x - this.x);
      const pinnedLeft = this.x < 240 && enemy.x > this.x;
      const pinnedRight = this.x > ww - 240 && enemy.x < this.x;

      if ((pinnedLeft || pinnedRight) && dist < 265 && this.dodgeCooldown <= 0 && this.wallFlipCooldown <= 0) {
        this.wallFlipCooldown = 3.1;
        this.startJump(enemy, game);
        return;
      }

      if (dist >= 210 && dist <= 345 && this.crouchCooldown <= 0) {
        this.startCrouch(enemy, game);
        return;
      }
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.32) {
        this.stepDustTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
        this.fx?.burst(this.x - this.facing * 14, this.groundY - 2, {
          count: 3,
          speedMin: 28,
          speedMax: 75,
          lifeMin: 0.14,
          lifeMax: 0.26,
          gravity: 25,
          colors: ['#ffffff', '#d946ef', '#f43f5e']
        });
      }
    }

    this.fx?.update(dt);
    super.update(dt, enemy, game);
  }

  /**
   * 3-STAGE AUTO-ATTACK: "TRINITY OF THE SCYTHE"
   * - Stage 1 (`mode === 0`): Crescent Reap + forward-traveling `Crescent Soul-Wave` (`Row 0`).
   * - Stage 2 (`mode === 1`): Ferryman's Hook-Slash pulling foes inward + chain snap.
   * - Stage 3 (`mode === 2`): Manifests the **Towering Thanatos Stand (`Row 3`)** behind Malakor
   *   for a unison X-Cross Guillotine Crit + hurls the piercing/returning `Soul-Disc` (`Row 0`).
   */
  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const mode = this.comboStep % 3;

    if (t < 0.25) {
      this.torsoAngle = -this.facing * 0.22 * (t / 0.25);
      if (mode === 2 && !this.thanatosStand) {
        // Pre-manifest Towering Thanatos Death-God Stand behind Malakor on Stage 3 coil!
        this.spawnThanatosStand(0.66, 268);
      }
    } else if (t < 0.62) {
      if (!this.didActionFrame) {
        this.didActionFrame = true;
        this.comboStep++;
        this.vx += this.facing * 138;
        this.torsoVel = this.facing * 13;

        const cx = this.x + this.facing * 58;
        const cy = this.y - 98;

        this.fx?.spawn('soulHarvestScytheArc', cx, cy, {
          flip: this.facing < 0,
          light: mode === 2 ? 1.42 : 1.28,
          extra: {
            radiusWorld: mode === 2 ? 150 : 138,
            isCrimson: mode === 2 || this.soulStacks >= 5,
            isCross: mode === 2,
            isUppercut: mode === 1
          }
        });
        this.spawnVfxAnim(0, cx, cy, 196, 196, 0.32, {
          flipX: this.facing < 0,
          glowColor: mode === 2 ? 'crimson' : 'violet',
          inFront: true
        });

        if (mode === 0) {
          // Stage 1: Launch mid-range Crescent Soul-Wave (`Row 0`) if enemy is outside point-blank!
          if (!enemy || Math.abs(enemy.x - this.x) > 155) {
            this.spawnCrescentScytheWave();
          }
          if (game.audio) game.audio.play('scythe_reap', this.x);
        } else if (mode === 1) {
          // Stage 2: Ferryman's Hook-Slash chain snap!
          if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 58) {
            this.fx?.spawn('skeletalChainTetherBeam', this.x + this.facing * 36, this.y - 96, {
              light: 1.28,
              extra: {
                dx: enemy.x - (this.x + this.facing * 36),
                dy: enemy.y - 96 - (this.y - 96),
                arcH: 10,
                isCrimson: false,
                showClaw: true,
                customDuration: 0.26
              }
            });
          }
          if (game.audio) game.audio.play('chain_hook', this.x);
        } else {
          // Stage 3: Unison Thanatos Stand Cross-Guillotine + Returning Soul-Disc!
          if (game.audio) game.audio.play('scythe_reap', this.x);
          this.spawnThanatosStand(0.56, 276);
          this.spawnBoomerangScythe();
          this.spawnVfxAnim(4, cx, cy, 212, 212, 0.34, {
            flipX: this.facing < 0,
            glowColor: 'crimson',
            inFront: true
          });
          if (game.vfx) {
            game.vfx.spawnDamageText(this.x, this.y - 150, 0, false, '★ THANATOS CROSS-REAP! ★', '#e879f9');
          }
        }

        if (game.vfx) game.vfx.spawnGlyphBurst(cx, cy, 5, 'abyssal');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 50) {
          const isCrit = mode === 2 || Math.random() < 0.24;
          let dmg = mode === 2 ? 92 : mode === 1 ? 80 : 71;
          if (mode === 2 && this.soulStacks >= 5) {
            this.consumeSoulStacks(2);
            dmg += 24;
            if (game.vfx) {
              game.vfx.spawnDamageText(enemy.x, enemy.y - 172, 0, false, '★ CRIMSON REAP! ★', '#f43f5e');
            }
          }
          const inwardPull = mode === 2 ? -80 : -68;
          this.strikeWithSoulResonance(enemy, dmg, isCrit, inwardPull, mode === 2 ? -95 : -28, game);
          if (!enemy.unstoppablePoise) {
            enemy.x += Math.sign(this.x - enemy.x) * (mode === 1 ? 30 : 22);
          }
          this.gainSoulStack(1);
          this.leechLife(9, enemy, game, 'SOUL HARVEST');
          if (game.audio) game.audio.play(mode === 2 ? 'soul_drain' : 'scythe_reap', enemy.x);
          if (game.renderer) game.renderer.triggerHitStop(0.055);
        } else {
          this.tryStrikeSeveredEffigy(cx, mode === 2 ? 85 : 70, game);
        }
      }
    } else if (t >= 0.84) {
      this.setState('IDLE');
    }
  }

  /**
   * SIGNATURE SKILL (`4.5s CD`): "SOUL SEVER"
   * - Beat 1 (`0.08s .. 0.44s`): Launches the Ferryman's Chain (`460px` reach) to impale the enemy
   *   and rip out a glowing **Captive Severed Soul Effigy (`this.severedSoul`, `2.4s` duration)**
   *   directly in front of Malakor, linked to the enemy by a pulsing crimson-violet Soul-Tether!
   * - Beat 2 (`t >= 0.46s`): Malakor shadow-steps forward and executes an **X-Scissor Soul-Snap
   *   Guillotine (`Row 4` + grounded `Row 2` Obelisk)** cleaving both the effigy and enemy while
   *   consuming up to `3` harvested `Soul Fragments` for bonus burst & life-drain!
   */
  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;

    if (t < 0.08) {
      this.didChainPull = false;
      this.didReapFinisher = false;
      this.torsoAngle = -this.facing * 0.20;
      this.isDeflecting = enemy ? Math.abs(enemy.x - this.x) > 190 : false;
    } else if (t < 0.46) {
      if (!this.didChainPull) {
        this.didChainPull = true;
        if (game.audio) game.audio.play('chain_hook', this.x);

        const maxHookDist = 460;
        const rawTargetX = enemy ? enemy.x : this.x + this.facing * 340;
        const clampedDx = Math.max(-maxHookDist, Math.min(maxHookDist, rawTargetX - this.x));
        const targetX = this.x + clampedDx;
        const targetY = enemy ? enemy.y - 96 : this.y - 96;

        this.fx?.spawn('skeletalChainTetherBeam', this.x + this.facing * 46, this.y - 96, {
          light: 1.38,
          extra: {
            dx: targetX - (this.x + this.facing * 46),
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
        if (game.vfx) game.vfx.spawnGlyphBurst(targetX, targetY, 8, 'abyssal');

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= maxHookDist + 30) {
          enemy.takeDamage(43, this, !enemy.hasPoise, -165, -32);
          this.gainSoulStack(1);
          const effigyX = Math.max(105, Math.min(ww - 105, this.x + this.facing * 122));
          this.spawnSeveredSoulEffigy(enemy, effigyX, game);
          if (game.vfx) {
            game.vfx.spawnDamageText(enemy.x, enemy.y - 156, 0, false, '★ SOUL SEVERED! ★', '#d946ef');
          }
          if (game.renderer) game.renderer.triggerShake(11, 0.22);
        }
      }

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 480) {
        if (Math.abs(enemy.x - this.x) > 140) {
          this.x += this.facing * 135 * dt;
        }
        const desiredX = Math.max(95, Math.min(ww - 95, this.x + this.facing * 120));
        enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 6.0);
        if (this.severedSoul) {
          this.severedSoul.x = desiredX;
        }
        if (this.boneCage) {
          this.boneCage.x = desiredX;
        }
      }
    } else if (!this.didReapFinisher) {
      // Beat 2: Shadow-Step X-Scissor Soul-Snap Guillotine!
      this.didReapFinisher = true;
      this.isDeflecting = false;
      if (game.audio) {
        game.audio.play('scythe_reap', this.x);
        game.audio.play('soul_drain', this.x);
      }
      if (game.renderer) {
        game.renderer.triggerShake(16, 0.30);
        game.renderer.triggerHitStop(0.065);
      }

      const prevX = this.x;
      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 280) {
        const lungeX = enemy.x - this.facing * 92;
        this.x = Math.max(95, Math.min(ww - 95, lungeX));
        this.spawnAfterimage(prevX, this.groundY, this.facing, 3, 14, 0.26);
      }

      const reapX =
        enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 245
          ? enemy.x
          : this.severedSoul
            ? this.severedSoul.x
            : this.x + this.facing * 114;

      this.spawnThanatosStand(0.48, 256);
      this.fx?.spawn('soulHarvestScytheArc', reapX, this.y - 98, {
        flip: this.facing < 0,
        light: 1.44,
        extra: { radiusWorld: 158, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(4, reapX, this.y - 98, 224, 224, 0.38, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: true
      });
      this.spawnGroundedBoneSpire(reapX, 208, 0.62, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: false
      });

      if (game.vfx) game.vfx.spawnGlyphBurst(reapX, this.y - 98, 9, 'abyssal');

      const consumedSouls = this.consumeSoulStacks(3);
      const bonusDmg = consumedSouls * 12;
      const bonusHeal = consumedSouls * 4;

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 250) {
        this.strikeWithSoulResonance(enemy, 84 + bonusDmg, true, -36, -125, game);
        this.leechLife(13 + bonusHeal, enemy, game, consumedSouls > 0 ? `SOUL SNAP x${consumedSouls}` : 'SOUL GUILLOTINE');
      } else {
        this.tryStrikeSeveredEffigy(reapX, 86 + bonusDmg, game);
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
        0.30 + i * 0.04,
        1.0
      );
    }
  }

  /**
   * OVERDRIVE (`ULTIMATE` — "DEATH'S SOVEREIGNTY: PHANTOM LEGION", `1.62s`):
   * - Crisp `1.0x` HD-2D Malakor (zero blurry sprite scaling!) summons the **Towering Thanatos
   *   Death-God Stand (`Row 3`, `324x324`)** over `necropolisBoneyardDomain` + **Twin Wraith
   *   Executioner Clones (`this.wraithClones`)** for a 3-way phantom pincer scythe blitz!
   * - Culminates at `t = 1.02s` in a unison **Thanatos Stand + Malakor Abyssal Cross-Guillotine**
   *   and a chaining 5-wave Guillotine Obelisk fault-line while refilling `5` Soul Fragments!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const targetX = enemy ? enemy.x : ww * 0.5;
    this.vx = 0;
    this.vy = 0;
    this.giantScale = 1.0;
    this.isDeflecting = t < 1.50;
    this.isInvulnerable = t < 1.36;

    if (t < 0.04) {
      this.ultStage = 0;
      this.y = this.groundY;
      this.ultPassStartX = this.x;
      this.ultPassTargetX = targetX;
    }

    // STAGE 1 (t >= 0.04s): Summon Towering Thanatos Stand + Twin Wraith Clones + Refill 5 Souls!
    if (t >= 0.04 && this.ultStage === 0) {
      this.ultStage = 1;
      this.soulStacks = this.maxSoulStacks;
      if (game.audio) game.audio.play('soul_drain', targetX);
      if (game.renderer) game.renderer.triggerShake(16, 0.28);

      this.tombstones = [];
      for (const side of [-1, 1]) {
        const tx = Math.max(85, Math.min(ww - 85, targetX + side * 185));
        this.tombstones.push({
          x: tx,
          groundY: this.groundY,
          size: 232,
          delay: 0.02,
          life: 1.50,
          maxLife: 1.50,
          shattered: false,
          isPrison: true
        });
      }

      this.spawnThanatosStand(1.52, 324, targetX, false);

      this.fx?.spawn('necropolisBoneyardDomain', targetX, this.groundY - 4, {
        light: 1.44
      });
      this.fx?.spawn('necroticGraveyardSigil', targetX, this.groundY - 4, {
        palette: BLOOD_MOON_CRIMSON_PALETTE,
        light: 1.38,
        extra: { radius: 52, isPrison: true, isCrimson: true, customDuration: 1.48 }
      });
      this.spawnVfxAnim(6, targetX, this.groundY - 104, 248, 248, 0.50, {
        glowColor: 'crimson',
        inFront: false
      });

      if (game.vfx) {
        game.vfx.spawnDamageText(
          targetX,
          this.groundY - 256,
          0,
          false,
          "★ DEATH'S SOVEREIGNTY: PHANTOM LEGION! ★",
          '#d946ef'
        );
      }
      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 26, false, -25, 0, game);
        this.leechLife(5, enemy, game, 'SOVEREIGN DOMAIN');
      }
    }

    // STAGE 2 (t >= 0.26s): Twin Wraith Pincer Cross-Slash I (Malakor L->R + Wraith Clone R->L)
    if (t >= 0.26 && this.ultStage === 1) {
      this.ultStage = 2;
      if (game.audio) game.audio.play('scythe_reap', targetX);
      if (game.renderer) game.renderer.triggerShake(16, 0.24);

      this.ultPassStartX = Math.max(105, Math.min(ww - 105, targetX - 155));
      this.ultPassTargetX = Math.max(105, Math.min(ww - 105, targetX + 155));
      this.x = this.ultPassStartX;
      this.facing = 1;

      // Opposite-flank Wraith Executioner Clone crosses simultaneously!
      this.spawnWraithClone(
        this.ultPassTargetX,
        this.groundY,
        this.ultPassStartX,
        this.groundY,
        -1,
        0.26,
        2,
        8,
        22
      );
      this.spawnWraithTrail(this.ultPassStartX, this.groundY, this.ultPassTargetX, this.groundY, 1, 4);

      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 104, {
        flip: false,
        light: 1.40,
        extra: { radiusWorld: 162, isCrimson: false, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(4, targetX, this.groundY - 104, 216, 216, 0.34, {
        flipX: false,
        glowColor: 'violet',
        inFront: true
      });

      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 30, true, -38, -42, game);
        this.leechLife(5, enemy, game, 'PHANTOM PINCER I');
      }
    }

    if (t >= 0.26 && t < 0.50 && this.ultStage === 2) {
      const u = Math.min(1, (t - 0.26) / 0.20);
      const ease = 1 - Math.pow(1 - u, 3);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * ease;
      this.y = this.groundY - Math.sin(u * Math.PI) * 24;
    }

    // STAGE 3 (t >= 0.52s): Twin Wraith Pincer Cross-Slash II (Malakor R->L + Aerial Wraith Clone)
    if (t >= 0.52 && this.ultStage === 2) {
      this.ultStage = 3;
      if (game.audio) game.audio.play('reaper_ult', targetX);
      if (game.renderer) game.renderer.triggerShake(18, 0.26);

      this.ultPassStartX = Math.max(105, Math.min(ww - 105, targetX + 150));
      this.ultPassTargetX = Math.max(105, Math.min(ww - 105, targetX - 150));
      this.x = this.ultPassStartX;
      this.facing = -1;

      this.spawnWraithClone(
        this.ultPassTargetX,
        this.groundY - 76,
        this.ultPassStartX,
        this.groundY,
        1,
        0.26,
        8,
        12,
        24
      );
      this.spawnWraithTrail(this.ultPassStartX, this.groundY - 20, this.ultPassTargetX, this.groundY - 54, -1, 4);

      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 112, {
        flip: true,
        light: 1.42,
        extra: { radiusWorld: 166, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(0, targetX, this.groundY - 110, 208, 208, 0.36, {
        flipX: true,
        glowColor: 'crimson',
        inFront: true
      });

      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 30, true, 35, -52, game);
        this.leechLife(5, enemy, game, 'PHANTOM PINCER II');
      }
    }

    if (t >= 0.52 && t < 0.76 && this.ultStage === 3) {
      const u = Math.min(1, (t - 0.52) / 0.22);
      const ease = 1 - Math.pow(1 - u, 2);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * ease;
      this.y = this.groundY - Math.sin(u * Math.PI) * 78;
    }

    // STAGE 4 (t >= 0.76s): Triangle Death-Chain Convergence
    if (t >= 0.76 && this.ultStage === 3) {
      this.ultStage = 4;
      if (game.audio) game.audio.play('chain_hook', targetX);
      if (game.renderer) game.renderer.triggerShake(18, 0.26);

      const dir = enemy ? Math.sign(enemy.x - this.x) || 1 : 1;
      this.ultPassStartX = targetX;
      this.ultPassTargetX = Math.max(115, Math.min(ww - 115, targetX - dir * 108));
      this.x = targetX;
      this.y = this.groundY - 104;
      this.facing = dir;

      this.spawnWraithClone(targetX - 140, this.groundY - 56, targetX - 75, this.groundY, 1, 0.28, 4, 10, 22);
      this.spawnWraithClone(targetX + 140, this.groundY - 56, targetX + 75, this.groundY, -1, 0.28, 4, 10, 22);

      this.fx?.spawn('skeletalChainTetherBeam', this.x, this.y - 58, {
        light: 1.38,
        extra: {
          dx: 0,
          dy: 82,
          arcH: 16,
          isCrimson: true,
          showClaw: true,
          customDuration: 0.30
        }
      });

      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 26, true, 0, -88, game);
        this.leechLife(5, enemy, game, 'LEGION SHACKLE');
      }
    }

    if (t >= 0.76 && t < 1.00 && this.ultStage === 4) {
      const u = Math.min(1, (t - 0.76) / 0.22);
      this.x = this.ultPassStartX + (this.ultPassTargetX - this.ultPassStartX) * u;
      this.y = this.groundY - (1 - u) * 104;
    } else if (t >= 1.00) {
      this.y = this.groundY;
    }

    if (this.thanatosStand) {
      this.thanatosStand.x = targetX;
    }

    // STAGE 5 (t >= 1.00s): Unison Thanatos Stand + Malakor Abyssal Cross-Guillotine & 5-Wave Fault-Line!
    if (t >= 1.00 && this.ultStage === 4) {
      this.ultStage = 5;
      if (game.audio) game.audio.play('scythe_reap', targetX);

      if (game.renderer) {
        game.renderer.triggerShake(26, 0.54);
        game.renderer.triggerAberration(15);
        game.renderer.triggerHitStop(0.09);
      }

      const slamDir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
      this.facing = slamDir;

      this.fx?.spawn('deathAvatarCathedral', targetX, this.groundY - 4, {
        light: 1.48
      });
      this.fx?.spawn('soulHarvestScytheArc', targetX, this.groundY - 108, {
        flip: slamDir < 0,
        light: 1.48,
        extra: { radiusWorld: 174, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.spawnVfxAnim(7, targetX, this.groundY - 108, 280, 240, 0.44, {
        flipX: slamDir < 0,
        glowColor: 'crimson',
        inFront: true
      });

      const faultStart = Math.max(95, Math.min(ww - 95, targetX - slamDir * 176));
      this.spawnNecroticFaultLine(faultStart, slamDir, game);

      for (const tb of this.tombstones) {
        tb.shattered = true;
        tb.life = Math.min(tb.life, tb.maxLife * 0.30);
      }

      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 112, true, slamDir * 165, -225, game);
        this.leechLife(15, enemy, game, 'THANATOS GUILLOTINE');
        if (game.vfx) game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 98, 14, 'abyssal');
      }
    }

    if (t >= 1.54) {
      this.y = this.groundY;
      this.giantScale = 1.0;
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.thanatosStand = null;
      this.deathAvatar = null;
      this.wraithClones = [];
      this.setState('IDLE');
    }
  }

  /**
   * SUPREME ULTIMATE (`state === 'TRUE_ULTIMATE'`, `4.50s`):
   * "MEMENTO MORI: OBLIVION GUILLOTINE"
   * - Zero stage background image override (`trueUltStageOverride` / `permanentStageOverride` untouched).
   * - Crisp `1.0x` HD-2D Malakor accompanied by **Twin Cathedral Gates of Oblivion (`Row 5`)**,
   *   **Towering Hooded Thanatos Death-God Stand (`Row 3`, `348x348`)**, **Six-Scythe Death-Clock
   *   Execution Seal (`Row 6`)**, and **Oblivion Reality-Split Cross-Guillotine (`Row 7`)**!
   */
  updateTrueUltimate(dt, enemy, game) {
    const elapsed = this.stateTimer;
    this.isInvulnerable = true;
    this.unstoppablePoise = true;
    this.isSubmerged = false;
    this.isFlipVault = false;
    this.isCrouching = false;
    this.giantScale = 1.0;
    this.vx = 0;
    this.vy = 0;
    this.y = this.groundY;

    if (enemy) {
      this._trueUltEnemy = enemy;
    }

    const targets = game?.getEnemiesOf
      ? game.getEnemiesOf(this)
      : enemy
        ? [enemy]
        : [];

    if (elapsed < 0.04 && this._trueUltStep === 0) {
      this._trueUltAltarX = enemy
        ? Math.max(260, Math.min(940, enemy.x))
        : Math.max(260, Math.min(940, this.x + this.facing * 220));
      if (Math.abs(this._trueUltAltarX - this.x) > 8) {
        this.facing = this._trueUltAltarX >= this.x ? 1 : -1;
      }
    }

    // Localized twilight dim without ever swapping stage backgrounds
    if (game?.renderer && elapsed < 4.10) {
      const dimTarget =
        elapsed <= 3.35 ? 0.54 : 0.54 * Math.max(0, 1 - (elapsed - 3.35) / 0.75);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    // =========================================================================
    // PHASE 1 (0.00s .. 1.25s): Unsealing the Twin Cathedral Gates of Oblivion
    // =========================================================================
    if (elapsed < 1.25) {
      if (elapsed >= 0.04 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        this._trueUltAltarX = enemy
          ? Math.max(260, Math.min(940, enemy.x))
          : Math.max(260, Math.min(940, this.x + this.facing * 220));

        game?.audio?.play?.('reaper_ult', this.x);
        game?.audio?.play?.('ult_cast', this._trueUltAltarX);
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#d946ef');
        game?.vfx?.spawnDamageText?.(
          this._trueUltAltarX,
          this.groundY - 248,
          0,
          true,
          '★ GATES OF OBLIVION: UNSEAL! ★',
          '#d946ef'
        );

        for (let i = 0; i < 5; i++) {
          this.spawnSoulWisp();
        }

        this.fx?.spawn('mementoMoriNecropolisGates', this._trueUltAltarX, this.groundY - 4, {
          light: 1.48
        });
        this.fx?.spawn('necropolisBoneyardDomain', this._trueUltAltarX, this.groundY - 4, {
          light: 1.44
        });
        this.fx?.spawn('necroticGraveyardSigil', this._trueUltAltarX, this.groundY - 4, {
          palette: ABYSSAL_VIOLET_PALETTE,
          light: 1.40,
          extra: { radius: 58, isPrison: true, isCrimson: false, customDuration: 3.35 }
        });
      }

      const u = Math.min(1, Math.max(0, elapsed / 1.25));
      this.trueUltFrameOverride = 120 + Math.min(8, Math.floor(u * 9));
      return;
    }

    // =========================================================================
    // PHASE 2 (1.25s .. 3.15s): Six-Scythe Death-Clock Bind & Thanatos Stand Manifestation
    // =========================================================================
    if (elapsed < 3.15) {
      if (elapsed >= 1.25 && this._trueUltStep < 2) {
        this._trueUltStep = 2;
        game?.audio?.play?.('chain_hook', this._trueUltAltarX);
        game?.audio?.play?.('soul_drain', this._trueUltAltarX);
        game?.vfx?.spawnDamageText?.(
          this._trueUltAltarX,
          this.groundY - 224,
          0,
          true,
          'MEMENTO MORI: DEATH-CLOCK SEAL!',
          '#f472b6'
        );

        for (const side of [-1, 1]) {
          const gateX = this._trueUltAltarX + side * 156;
          this.fx?.spawn('skeletalChainTetherBeam', gateX, this.groundY - 120, {
            light: 1.40,
            extra: {
              dx: this._trueUltAltarX - gateX,
              dy: 22,
              arcH: -18,
              isCrimson: side > 0,
              showClaw: true,
              customDuration: 1.88
            }
          });
        }
      }

      const uBind = Math.min(1, Math.max(0, (elapsed - 1.25) / 1.90));
      this.trueUltFrameOverride = 129 + Math.min(6, Math.floor(uBind * 7));

      // Pull and bind active enemies to this._trueUltAltarX with ZERO micro-tick damage!
      if (enemy && !enemy.isDead) {
        enemy.x += (this._trueUltAltarX - enemy.x) * Math.min(1, dt * 8.2);
        enemy.vx = 0;
      }
      for (const tgt of targets) {
        if (tgt && !tgt.isDead && !tgt.isBenched && tgt !== enemy) {
          tgt.x += (this._trueUltAltarX - tgt.x) * Math.min(1, dt * 8.2);
          tgt.vx = 0;
        }
      }
      return;
    }

    // =========================================================================
    // PHASE 3 (t >= 3.15s): Instantaneous Oblivion Reality-Split Cross-Guillotine
    // =========================================================================
    if (elapsed >= 3.15 && this._trueUltStep < 3) {
      this._trueUltStep = 3;
      this._trueUltSlashFlash = 0.92;
      this.soulStacks = this.maxSoulStacks;

      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      if (Math.abs(this._trueUltAltarX - this.x) > 8) {
        this.facing = this._trueUltAltarX >= this.x ? 1 : -1;
      }
      this.x = Math.max(95, Math.min(ww - 95, this._trueUltAltarX - this.facing * 92));
      this.y = this.groundY;

      // Twin Wraith Executioners cleave inward from both Cathedral Gates simultaneously!
      this.spawnWraithClone(
        this._trueUltAltarX - 165,
        this.groundY,
        this._trueUltAltarX + 85,
        this.groundY,
        1,
        0.44,
        4,
        14,
        24
      );
      this.spawnWraithClone(
        this._trueUltAltarX + 165,
        this.groundY,
        this._trueUltAltarX - 85,
        this.groundY,
        -1,
        0.44,
        4,
        14,
        24
      );

      game?.renderer?.triggerImpactFrame?.(
        0.12,
        this._trueUltAltarX,
        this.groundY - 112,
        'abyssal'
      );
      if (game?.renderer && game.renderer.impactFrameTimer > 1) {
        game.renderer.impactFrameFocusX = this._trueUltAltarX;
        game.renderer.impactFrameFocusY = this.groundY - 112;
        game.renderer.impactFrameMaxTimer = 0.12;
        game.renderer.impactFrameTimer = 0.12;
      }
      game?.renderer?.shake?.(26, 0.70);
      game?.renderer?.triggerShake?.(26, 0.70);
      game?.renderer?.flash?.(0.30, '#fdf4ff');

      game?.audio?.play?.('reaper_ult', this._trueUltAltarX);
      game?.audio?.play?.('scythe_reap', this._trueUltAltarX);
      game?.audio?.play?.('soul_drain', this._trueUltAltarX);

      this.fx?.spawn('deathAvatarCathedral', this._trueUltAltarX, this.groundY - 4, {
        light: 1.50
      });
      this.fx?.spawn('soulHarvestScytheArc', this._trueUltAltarX, this.groundY - 112, {
        flip: this.facing < 0,
        light: 1.50,
        extra: { radiusWorld: 186, isCrimson: true, isCross: true, isUppercut: false }
      });
      this.spawnGroundedBoneSpire(this._trueUltAltarX, 240, 0.78, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: false
      });

      // SINGLE INSTANTANEOUS EXECUTION BURST (720 primary Crit; 0.78x on secondary 2v2 foe) + 14% Max HP Harvest!
      let hitCount = 0;
      for (const t of targets) {
        if (t && !t.isDead && !t.isBenched) {
          const burstDmg = hitCount === 0 ? 720 : Math.round(720 * 0.78);
          t.takeDamage(burstDmg, this, true, 290, -260);
          hitCount++;
        }
      }
      this.heal(Math.round(this.maxHp * 0.14), 'OBLIVION HARVEST');
    }

    // =========================================================================
    // PHASE 4 (3.15s .. 4.50s): Sovereign Follow-Through & Return to Guard
    // =========================================================================
    const cleaveSpan = Math.min(1, Math.max(0, (elapsed - 3.15) / 0.55));
    if (elapsed < 3.70) {
      this.trueUltFrameOverride = 136 + Math.min(8, Math.floor(cleaveSpan * 9));
    } else {
      const recFrameSpan = Math.min(1, Math.max(0, (elapsed - 3.70) / 0.80));
      this.trueUltFrameOverride = 145 + Math.min(4, Math.floor(recFrameSpan * 5));
    }

    if (elapsed >= this.trueUltDuration) {
      this.y = this.groundY;
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this.trueUltFrameOverride = null;
      this.wraithClones = [];
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
   * Renders Twin Cathedral Gates of Oblivion (`Row 5`) + Towering Thanatos Death-God Stand (`Row 3`)
   * behind fighters during `TRUE_ULTIMATE` and `thanatosStand` manifestations.
   */
  drawBehind(ctx, renderer = null) {
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.reaper : null;
    const vfxSheet = sprites?.vfx;
    if (!vfxSheet?.complete) return;

    // 1. Active Towering Thanatos Death-God Stand (`Row 3`) during Stage-3 Auto, Skill & Overdrive!
    if (this.thanatosStand && this.state !== 'TRUE_ULTIMATE') {
      const st = this.thanatosStand;
      const u = Math.min(1, Math.max(0, st.age / st.maxLife));
      const fade = u < 0.16 ? u / 0.16 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
      const col = Math.min(29, Math.floor((st.age * 26) % 30));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        col,
        st.x,
        this.groundY - Math.round(st.size * 0.52),
        st.size,
        st.size,
        fade * 0.92,
        st.facing < 0,
        renderer,
        'crimson'
      );
    }

    if (this.state !== 'TRUE_ULTIMATE') return;

    const t = this.stateTimer || 0;
    const dur = this.trueUltDuration || 4.50;
    const fadeIn = Math.min(1, Math.max(0.15, t / 0.35));
    const fadeOut = t > dur - 0.55 ? Math.max(0, (dur - t) / 0.55) : 1.0;
    const gateAlpha = fadeIn * fadeOut * 0.96;
    if (gateAlpha <= 0.02) return;

    const col = Math.min(29, Math.floor((t * 24) % 30));
    const gateY = this.groundY - 130;

    // Twin Cathedral Gates of Oblivion (`Row 5`, 328x328)
    this.drawBloomedVfxCell(
      ctx,
      vfxSheet,
      5,
      col,
      this._trueUltAltarX - 156,
      gateY,
      328,
      328,
      gateAlpha,
      false,
      renderer,
      'violet'
    );
    this.drawBloomedVfxCell(
      ctx,
      vfxSheet,
      5,
      col,
      this._trueUltAltarX + 156,
      gateY,
      328,
      328,
      gateAlpha,
      true,
      renderer,
      'crimson'
    );

    // Towering Hooded Thanatos Death-God Stand (`Row 3`, 348x348) presiding above the Oblivion Altar!
    const standRise = Math.min(1, Math.max(0, (t - 0.25) / 0.75));
    if (standRise > 0.02) {
      const standCol = Math.min(29, Math.floor((t * 22) % 30));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        3,
        standCol,
        this._trueUltAltarX,
        this.groundY - Math.round(145 + standRise * 42),
        348,
        348,
        standRise * fadeOut * 0.95,
        this.facing < 0,
        renderer,
        'crimson'
      );
    }
  }

  /**
   * Background 2.5D Shader Pass (`back`) + Cathedral Gates, Thanatos Stand, Wraith Executioner Clones,
   * Wraith Afterimages & Grounded Abyssal Guillotine Obelisks (`Row 2`).
   */
  drawForegroundOverlay(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    this.drawBehind(ctx, renderer);

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.reaper : null;
    const vfxSheet = sprites?.vfx;

    // 1. Crisp Un-Rotated HD-2D Wraith Afterimage Silhouettes & Wraith Executioner Clones
    if (sprites?.sheet?.complete) {
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
        ctx.globalAlpha = fade * 0.42;
        PixelForge.drawAfterimageFrame(ctx, sprites, frameIdx, 208, 208);
        ctx.restore();
      }
    }

    if (!vfxSheet?.complete) return;

    // 2. Ground-Erupting Abyssal Guillotine Obelisks (`Row 2`)
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

    // 3. Background 30fps `reaper_vfx.png` Cell Animations
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
   * Foreground 2.5D Shader Pass (`front`) + Orbiting Soul Fragments, Captive Severed Soul Effigy & Tether,
   * Crescent Soul-Wave (`Row 0`), Returning Soul-Disc (`Row 0`), and Homing Soul-Leech Wisps (`Row 1`).
   */
  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.reaper : null;
    const vfxSheet = sprites?.vfx;
    if (!vfxSheet?.complete) return;

    // 1. Orbiting Harvested Soul Fragments (`this.soulStacks`: 0..5) around Malakor's Ferryman Lantern!
    if (!this.isDead && !this.isSubmerged && this.soulStacks > 0) {
      const lanternX = this.x - this.facing * 24;
      const lanternY = this.y - 116;
      const isMaxCrimson = this.soulStacks >= this.maxSoulStacks;
      for (let s = 0; s < this.soulStacks; s++) {
        const ang = this.soulOrbitPhase + (s / this.soulStacks) * Math.PI * 2;
        const ox = lanternX + Math.cos(ang) * 28;
        const oy = lanternY + Math.sin(ang) * 12;
        const col = Math.floor(((this.soulOrbitPhase * 8 + s * 6) % 30 + 30) % 30);
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          1,
          col,
          ox,
          oy,
          44,
          44,
          0.88,
          false,
          renderer,
          isMaxCrimson ? 'crimson' : 'violet'
        );
      }
    }

    // 2. Captive Severed Soul Effigy (`this.severedSoul`) + Live Soul-Link Chain Nodes to Enemy!
    if (this.severedSoul && this.severedSoul.life > 0 && this.severedSoul.target && !this.severedSoul.target.isDead) {
      const ss = this.severedSoul;
      const tgt = ss.target;
      const fade = Math.min(1, ss.life * 2.4);
      const pulseCol = Math.floor(((2.60 - ss.life) * 28) % 30);
      const effY = ss.y + Math.sin(this.soulOrbitPhase * 1.8) * 6;

      // Soul-Link bead nodes connecting Captive Soul Effigy -> Enemy Chest (zero canvas curves/rotations!)
      const tgtY = tgt.y - 96;
      for (let k = 1; k <= 4; k++) {
        const u = k / 5;
        const lx = ss.x + (tgt.x - ss.x) * u;
        const ly = effY + (tgtY - effY) * u - Math.sin(u * Math.PI) * 14;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          1,
          (pulseCol + k * 5) % 30,
          lx,
          ly,
          38,
          38,
          fade * 0.72,
          false,
          renderer,
          k % 2 === 0 ? 'crimson' : 'violet'
        );
      }

      // Rotating Death-Seal Halo + Captive Soul Effigy Core
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        6,
        pulseCol,
        ss.x,
        effY,
        176,
        176,
        fade * 0.76,
        false,
        renderer,
        'violet'
      );
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        1,
        pulseCol,
        ss.x,
        effY,
        142,
        142,
        fade * 0.96,
        tgt.x < ss.x,
        renderer,
        'crimson'
      );
    }

    // 3. Stage-1 Forward Crescent Scythe Wave (`this.scytheWave`, Row 0)
    if (this.scytheWave) {
      const sw = this.scytheWave;
      const col = Math.min(29, Math.floor((sw.age / sw.maxLife) * 30));
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        0,
        col,
        sw.x,
        sw.y,
        156,
        156,
        0.95,
        sw.dir < 0,
        renderer,
        'violet'
      );
    }

    // 4. Returning Twin-Blade Phantom Soul-Disc (`Row 0` + `Row 1` soul-core overlay)
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
        104,
        104,
        0.84,
        bs.dir < 0,
        renderer,
        'crimson'
      );
    }

    // 5. Homing Soul-Leech Wisps (`Row 1`) curving into Malakor's ribcage
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
        92,
        92,
        fade * 0.94,
        tx < w.startX,
        renderer,
        w.glowColor || 'violet'
      );
    }

    // 6. Foreground 30fps `reaper_vfx.png` Cell Animations
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

    if (!isReflection && sprites.vfx?.complete) {
      const vfxSheet = sprites.vfx;

      // Phase 2 (`1.25s .. 3.15s`): Six-Scythe Death-Clock Execution Seal (`Row 6`, 324x324)
      if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.25 && this.stateTimer <= 3.30) {
        const bindX =
          this._trueUltEnemy && !this._trueUltEnemy.isDead
            ? this._trueUltEnemy.x
            : this._trueUltAltarX;
        const bindY = this.groundY - 104;
        const bindCol = Math.min(29, Math.floor(((this.stateTimer - 1.25) * 24) % 30));
        const bindFade =
          this.stateTimer > 3.12 ? Math.max(0, 1 - (this.stateTimer - 3.12) / 0.18) : 0.96;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          6,
          bindCol,
          bindX,
          bindY,
          324,
          324,
          bindFade,
          false,
          renderer,
          'crimson'
        );
      }

      // Phase 3 (`this._trueUltSlashFlash > 0`): Oblivion Reality-Split Cross-Guillotine (`Row 7`, 480x380)
      if (this._trueUltSlashFlash > 0) {
        const uSlash = Math.min(1, Math.max(0, 1 - this._trueUltSlashFlash / 0.92));
        const slashCol = Math.min(29, Math.floor(uSlash * 30));
        const slashAlpha = Math.min(1, (this._trueUltSlashFlash / 0.24) * 0.98);
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          7,
          slashCol,
          this._trueUltAltarX,
          this.groundY - 128,
          480,
          380,
          slashAlpha,
          this.facing < 0,
          renderer,
          'crimson'
        );
      }
    }
  }
}
