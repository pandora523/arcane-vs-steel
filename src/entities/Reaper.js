import { Fighter } from './Fighter.js?v=30fps75';
import { PixelForge } from '../engine/PixelForge.js?v=30fps75';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps75';
import {
  ABYSSAL_EFFECT_REGISTRY,
  ABYSSAL_VIOLET_PALETTE,
  BLOOD_MOON_CRIMSON_PALETTE,
  NECRO_SOUL_EMERALD_PALETTE
} from '../engine/shaders/abyssalShaders.js?v=30fps75';

/**
 * Malakor v7 (`reaper`) — Gothic Arch-Reaper, Shadow-Burrow Stalker & Sovereign of the Death Covenant.
 *
 * Complete S-Tier Kit:
 * - Passive (`SOUL HARVESTER, ABYSSAL GRAVE-WARD & SHADOW BURROW`):
 *   Harvests up to 5 orbiting **Soul Fragments** (`this.soulStacks`) around Malakor's Ferryman Lantern;
 *   plunges **100% underground** (`this.isFullyBurrowed`, `1.72s` total / `1.26s` completely submerged)
 *   as a creeping **Pitch-Black Abyssal Shadow Pool & Predator Lock-On Indicator** before erupting into
 *   a critical **Surprise Ambush Uppercut** + **Abyssal Grave-Ward (`22%` DR)**!
 * - 3-Stage Auto (`TRINITY OF THE SCYTHE`):
 *   (1) *Crescent Reap & Soul Wave*, (2) *Ferryman's Hook-Slash*, (3) *Thanatos Stand Cross-Guillotine*
 *   with piercing/returning `Soul-Disc` boomerang and enhanced vampiric Soul Harvest.
 * - Signature Skill (`SOUL SEVER` • `4.5s CD`):
 *   Rips a **Captive Severed Soul Effigy** (`this.severedSoul`) out of the enemy that echoes Soul-Link
 *   damage, followed by a shadow-step **X-Scissor Soul-Snap Guillotine**.
 * - Overdrive (`ULTIMATE` — `DEATH'S SOVEREIGNTY`, `1.86s`):
 *   5-Beat Blood-Moon Thanatos Sky-Drop Execution: unseals Twin Obelisk Chains & `356x356` Thanatos Stand,
 *   crisscrosses with Phantom Wraith Clones, ascends `168px` into the sky for a Triple-Chain Sky-Lock,
 *   and plummets in a Reality-Crack Guillotine + 5-Wave Obelisk Fault-Line + `2.2s` Grave-Ward!
 * - Supreme Ultimate (`TRUE_ULTIMATE` — `MEMENTO MORI: OBLIVION GUILLOTINE`, `4.50s` + `12.5s` Living Companions):
 *   Deep Oblivion Eclipse (`0` stage background swap!), Twin `352x352` Cathedral Gates (`Row 5`) that summon
 *   **TWO Autonomous Living Death Companions for `12.5s`** with fortified HP & Soul-Ward Shields:
 *   • **Abyssal Death-Mage (`480 HP` + `60` Ward)**: Levitating lich casting homing **Dark-Matter Void Orbs & Hex Novas**.
 *   • **Ossuary Soul-Healer (`420 HP` + `50` Ward)**: Ethereal cleric channeling **Luminous Soul-Mend Tethers & Halos**
 *     to heal & shield the Death-Mage and splash Covenant Grace to Malakor!
 *   Culminates in a `192px` Sovereign Sky-Ascent & `720`-Crit Reality-Split Cross-Guillotine (`Row 7`) + `20%` Max HP Harvest!
 */
export class Reaper extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Malakor',
      maxHp: 3920,
      attackRange: 200,
      moveSpeed: 202,
      autoInterval: 0.94,
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

    this.skillMaxCooldown = 4.85;
    this.skillTriggerRange = 450;
    this.autoDuration = 0.90;
    this.skillDuration = 0.98;
    this.ultDuration = 1.86;

    this.skillName = 'SOUL SEVER';
    this.ultName = "DEATH'S SOVEREIGNTY";
    this.hasTrueUltimate = true;
    this.trueUltName = 'MEMENTO MORI: OBLIVION GUILLOTINE';
    this.trueUltDuration = 4.50;

    this._trueUltStep = 0;
    this._trueUltAltarX = 600;
    this._trueUltSlashFlash = 0;
    this._ultSlashFlash = 0;
    this._trueUltEnemy = null;
    this._trueUltSummoned = false;
    this._trueUltPhantomWave1 = false;
    this._trueUltPhantomWave2 = false;
    this._trueUltSkyAscent = false;

    this.comboStep = 0;
    this.stepDustTimer = 0;
    this.graveWardTimer = 0; // Abyssal Grave-Ward DR after Shadow Burrow, Overdrive & True Ultimate

    // Crisp 1.0x HD-2D character rendering (colossal presence comes from Thanatos Stand & Cathedral Gates!)
    this.giantScale = 1.0;

    // Malakor v7 Sovereign of Severed Souls & Super-Ult Death Covenant Systems
    this.soulStacks = 2; // Starts battle with 2 harvested Soul Fragments orbiting his Ferryman Lantern
    this.maxSoulStacks = 5;
    this.soulOrbitPhase = 0;

    this.severedSoul = null; // Captive Severed Soul Effigy ripped from enemy during SOUL SEVER
    this.scytheWave = null; // Stage-1 Crescent Soul-Wave anti-kite projectile (Row 0)
    this.thanatosStand = null; // Towering Hooded Thanatos Death-God Stand Avatar (Row 3)
    this.wraithClones = []; // Crisp 1.0x HD-2D Wraith Executioner Clones during Overdrive & True Ult
    this.deathCompanions = []; // Summoned 12.5s Super-Ultimate Living Death Companions (Death-Mage + Soul-Healer!)
    this.darkMagicOrbs = []; // Dark-Matter Void Orbs cast by the summoned Death-Mage

    this.soulWisps = []; // Homing Soul-Leech Wisp orbs (Row 1 of reaper_vfx.png)
    this.tombstones = []; // Ground-erupting Abyssal Guillotine Obelisks (Row 2 of reaper_vfx.png)
    this.boneCage = null; // Soul-Shackle Sanctuary zone around Severed Soul
    this.faultSpireQueue = []; // Chaining 5-Wave Guillotine Obelisk Fault-Line queue
    this.deathAvatar = null; // Legacy-compatible alias synced with thanatosStand during Overdrive
    this.activeScytheBoomerang = null; // Returning Twin-Blade Phantom Soul-Disc (Hit 3)
    this.activeBoomerangScythe = null; // Alias kept in sync with activeScytheBoomerang
    this.afterimages = []; // Crisp HD-2D Wraith Afterimages
    this.activeVfxAnims = []; // Active 30fps reaper_vfx.png cell animations (Rows 0..7)

    // True Underground Shadow Burrow State (zero partial half-body floor sliding!)
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
    this.ultStage = 0;
    this.dodgeMaxCooldown = 3.30;
    this.dashMaxCooldown = 3.25;
    this.wallFlipCooldown = 0;
    this.crouchCooldown = 2.50;
    this.crouchDuration = 1.72;
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
      if (reaperAssets?.vfx?.src && !reaperAssets.vfx.src.includes('v=30fps75')) {
        reaperAssets.vfx.src = 'assets/sprites/reaper_vfx.png?v=30fps75';
      }
      if (reaperAssets?.sheet?.src && !reaperAssets.sheet.src.includes('v=30fps75')) {
        reaperAssets.sheet.src = 'assets/sprites/reaper_sheet.png?v=30fps75';
      }
      if (reaperAssets?.companions?.src && !reaperAssets.companions.src.includes('v=30fps75')) {
        reaperAssets.companions.src = 'assets/sprites/reaper_companions.png?v=30fps75';
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
    } else if (newState === 'ULTIMATE') {
      this.ultStage = 0;
      this._ultSlashFlash = 0;
    } else {
      this.trueUltFrameOverride = null;
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
      (newState === 'AUTO_ATTACK' && this.comboStep % 3 === 2);

    if (newState === 'DEATH') {
      this.trueUltFrameOverride = null;
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
      this.wraithClones = [];
      this.deathCompanions = [];
      this.darkMagicOrbs = [];
      this.burrowTrailNodes = [];
      this.boneCage = null;
      this.faultSpireQueue = [];
      this.fx?.clear();
    }
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

    // Death Covenant Ward (12% DR while companions live) + Abyssal Grave-Ward (16% DR post-Burrow/Ult), capped at 25%!
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
    }

    const fromX = sourceEntity ? sourceEntity.x : this.x + this.facing * 120;
    const fromY = sourceEntity ? sourceEntity.y - 96 : this.y - 96;
    if (this.soulWisps.length < 4) {
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
   * Summons TWO Autonomous Living Death Companions for `12.5` seconds during Super Ultimate (`MEMENTO MORI`):
   *   1. `mage` — **Abyssal Death-Mage** (`maxHp: 480` + `60` Soul-Ward): Levitating lich casting Dark-Matter Void Orbs & Hex Novas.
   *   2. `healer` — **Ossuary Soul-Healer** (`maxHp: 420` + `50` Soul-Ward): Ethereal cleric channeling Soul-Mend tethers,
   *      shielding & healing the Death-Mage while splashing Covenant Grace onto Malakor!
   */
  summonDeathCompanions(game = null, empowerBonus = true, altarAnchorX = null) {
    const g = game || this.game;
    const ww = g?.renderer ? g.renderer.worldWidth : 1200;

    let mageX;
    let healerX;
    if (Number.isFinite(altarAnchorX)) {
      mageX = Math.max(92, Math.min(ww - 92, altarAnchorX - 168));
      healerX = Math.max(92, Math.min(ww - 92, altarAnchorX + 168));
    } else {
      const backDir = this.x < 250 ? 1 : this.x > ww - 250 ? -1 : -this.facing;
      mageX = Math.max(96, Math.min(ww - 96, this.x + backDir * 154));
      healerX = Math.max(86, Math.min(ww - 86, mageX + backDir * 84));
      if (Math.abs(healerX - mageX) < 52) {
        healerX = Math.max(86, Math.min(ww - 86, mageX - backDir * 84));
      }
    }

    const duration = 12.5;

    const makeComp = (role, spawnX, maxHp, initShield, maxShield, damageCap) => {
      const comp = {
        id: `reaper_${role}`,
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
        '★ OBLIVION COVENANT: DEATH MAGE & SOUL HEALER! ★',
        '#e879f9'
      );
    }
    return this.deathCompanions;
  }

  /**
   * Applies enemy damage to a summoned Death Companion with Soul-Ward Overshield & Cleave Protection!
   */
  damageCompanion(comp, rawAmount, attacker = null, isCrit = false, game = null, ignoreCap = false) {
    if (!comp || comp.isDead || comp.life <= 0 || rawAmount <= 0) return 0;

    let adjusted = rawAmount;
    if (!ignoreCap) {
      if ((comp.spawnGrace || 0) > 0) {
        adjusted *= 0.55;
      }
      if (comp.damageCap > 0) {
        adjusted = Math.min(comp.damageCap, adjusted);
      }
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
          comp.role === 'mage' ? '✖ DEATH MAGE BANISHED!' : '✖ SOUL HEALER BANISHED!',
          '#fb7185'
        );
      }
    }
    return dmg;
  }

  /**
   * Steps both summoned Super-Ult Death Companions (`12.5s` active duration) + Dark-Matter Void Orbs + Counterplay!
   */
  updateCompanions(dt, enemy, game) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const enemies = game?.getEnemiesOf
      ? game.getEnemiesOf(this)
      : enemy
        ? [enemy]
        : [];
    const primaryFoe =
      enemies.find((e) => e && !e.isDead && !e.isBenched && !e.isFullyBurrowed) ||
      enemies.find((e) => e && !e.isDead && !e.isBenched) ||
      enemy;

    // 1. Step Dark-Matter Void Orbs (`this.darkMagicOrbs`) cast by the Death-Mage!
    //    (Held in stasis during `TRUE_ULTIMATE` so Memento Mori remains a pure single-hit execution!)
    if (this.state !== 'TRUE_ULTIMATE') {
      for (let i = this.darkMagicOrbs.length - 1; i >= 0; i--) {
        const orb = this.darkMagicOrbs[i];
        orb.age += dt;
        orb.trailTimer = (orb.trailTimer || 0) + dt;

        const tgt =
          orb.target && !orb.target.isDead && !orb.target.isBenched ? orb.target : primaryFoe;
        if (tgt && !tgt.isDead && !tgt.isBenched && !tgt.isFullyBurrowed) {
          const desiredX = tgt.x;
          const desiredY = tgt.y - 98;
          const dx = desiredX - orb.x;
          const dy = desiredY - orb.y;
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
          // Prevent summoned companions from infinitely battery-charging Malakor's next Ultimate or stun-locking foes!
          this.mana = manaBeforeOrb;
          hitFoe.hurtTimer = Math.min(hitFoe.hurtTimer, Math.max(prevFoeHurt, 0.06));
          if (orb.isEmpowered) {
            this.gainSoulStack(1);
          }
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

      // During `TRUE_ULTIMATE`, both companions hover majestically at the Twin Oblivion Gates channeling the Covenant!
      if (this.state === 'TRUE_ULTIMATE') {
        const gateSide = comp.role === 'mage' ? -1 : 1;
        const gateX = Math.max(92, Math.min(ww - 92, this._trueUltAltarX + gateSide * 168));
        comp.x += (gateX - comp.x) * Math.min(1, dt * 6.5);
        comp.y = this.groundY - 24 - Math.sin(comp.hoverPhase) * 7;
        comp.facing = this._trueUltAltarX >= comp.x ? 1 : -1;
        continue;
      }

      // 2. Hostile Projectile Collision against Companions (works in both Browser & Headless Sims!)
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

      // 3. Hostile Melee / Skill Cleave Counterplay against Companions!
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
          const reach =
            foe.state === 'ULTIMATE' ? 235 : foe.state === 'SKILL' ? 195 : 165;
          if (Math.abs(foe.x - comp.x) <= reach) {
            comp.hurtIcd = comp.role === 'mage' ? 0.65 : 0.68;
            const cleaveDmg =
              foe.state === 'ULTIMATE' ? 118 : foe.state === 'SKILL' ? 92 : 68;
            this.damageCompanion(comp, cleaveDmg, foe, foe.state !== 'AUTO_ATTACK', game);
            break;
          }
        }
        if (comp.isDead) {
          this.deathCompanions.splice(i, 1);
          continue;
        }
      }

      // 4. Role-Specific Tactical Hover, Kiting & Symbiotic Covenant AI!
      if (comp.role === 'mage') {
        const foeX = primaryFoe ? primaryFoe.x : this.x + this.facing * 240;
        const distToFoe = Math.abs(foeX - comp.x);
        const flankSign = this.x <= foeX ? -1 : 1;
        let desiredMageX = foeX + flankSign * 232;
        if (desiredMageX < 96 || desiredMageX > ww - 96) {
          desiredMageX = foeX - flankSign * 228;
        }
        // Smart Kiting: if enemy rushes within 165px, glide rapidly toward the open arena flank!
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

              const tx = primaryFoe.x;
              const ty = primaryFoe.y - 98;
              const dx = tx - muzzleX;
              const dy = ty - muzzleY;
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
        // OSSUARY SOUL-HEALER: Heals & Shields the Death-Mage + Mends Self + Splashes Covenant Grace to Malakor!
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

            // Self Soul-Ward sustain on every ritual pulse so Healer stays resilient
            comp.hp = Math.min(comp.maxHp, comp.hp + 34);
            comp.shield = Math.min(comp.maxShield || 65, (comp.shield || 0) + 14);

            // Splash Covenant Grace sustain onto Malakor when injured!
            if (!this.isDead && this.hp < this.maxHp) {
              this.hp = Math.min(this.maxHp, this.hp + 10);
            }

            if (mage && !mage.isDead) {
              const dstX = mage.x;
              const dstY = mage.y - 86;
              this.fx?.spawn('necroHealerSoulTether', srcX, srcY, {
                palette: NECRO_SOUL_EMERALD_PALETTE,
                light: 1.34,
                extra: { dx: dstX - srcX, dy: dstY - srcY }
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
                    `✚ MAGE MEND +${Math.round(restored)}`,
                    '#6ee7b7'
                  );
                }
              } else {
                // Mage near 100% HP -> fortify Mage's Soul-Ward Overshield & empower Dark Magic!
                mage.shield = Math.min(mage.maxShield || 75, (mage.shield || 0) + 35);
                if (game?.vfx) {
                  game.vfx.spawnDamageText(
                    mage.x,
                    mage.y - 144,
                    0,
                    false,
                    '✚ SOUL WARD + DARK COVENANT!',
                    '#67e8f9'
                  );
                }
              }
            } else {
              // If the Death-Mage was slain, Soul-Healer channels full Covenant Mend onto Malakor & itself!
              this.fx?.spawn('necroHealerMendHalo', comp.x, comp.groundY - 4, {
                palette: NECRO_SOUL_EMERALD_PALETTE,
                light: 1.28
              });
              comp.hp = Math.min(comp.maxHp, comp.hp + 32);
              if (!this.isDead && this.hp < this.maxHp) {
                this.heal(22, 'COVENANT GRACE');
              } else if (game?.vfx) {
                game.vfx.spawnDamageText(comp.x, comp.y - 144, 0, false, '✚ WARD MEND +68', '#6ee7b7');
              }
            }
          }
        }
      }
    }
  }

  /**
   * CROUCH: "ABYSSAL SHADOW BURROW & SURPRISE AMBUSH" (`1.72s` total / `1.26s` 100% underground!)
   * Malakor plunges his entire body completely beneath `groundY` (`0.00s..0.22s`), stalks unseen
   * underground for `1.26s` (`0.22s..1.48s`) as a Pitch-Black Abyssal Shadow Pool & Predator Lock-On
   * Indicator, and erupts upward at `t = 1.48s` for a devastating Surprise Attack + `1.8s` Grave-Ward!
   */
  startCrouch(enemy, game) {
    this.crouchCooldown = 9.60;
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
    if (game && game.audio) game.audio.play('soul_drain', this.x);
    if (game && game.vfx) {
      game.vfx.spawnGlyphBurst(this.x, this.groundY - 18, 3, 'abyssal');
      game.vfx.spawnDamageText(this.x, this.y - 134, 0, false, '▼ SHADOW BURROW! ▼', '#c084fc');
    }
  }

  onStartDash(enemy, game, dir) {
    this.isFlipVault = false;
    this.flipAngle = 0;
    this.dashDuration = 0.38;
    this.isDeflecting = true;
    this.isSubmerged = false;
    this.isFullyBurrowed = false;
    this.submergeDepth = 0;
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
      this.isFullyBurrowed = false;
      this.submergeDepth = 0;
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
        game.vfx.spawnDamageText(this.x, this.y - 138, 0, false, "REAPER'S GLIDE!", '#e879f9');
      }
      return;
    }

    // 2. CLOSE-RANGE DODGE -> Plunges into FULL UNDERGROUND SHADOW BURROW if off cooldown!
    if (enemy && !enemy.isDead && dist <= 235 && this.crouchCooldown <= 0) {
      this.startCrouch(enemy, game);
      return;
    }

    // 3. ABOVE-GROUND SPECTRAL WRAITH BLINK (zero half-body floor sinking!)
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
        maxDuration: 0.32,
        light: 1.26,
        extra: { radius: 26, isSubmerged: false, isCrimson: true }
      });
      if (game.audio) game.audio.play('blink', this.x);
      if (game.vfx) {
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
    if (game.audio) game.audio.play('soul_drain', this.x);
    if (game.vfx) {
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

      if (u < 0.60 && Math.random() < 0.16) {
        this.spawnAfterimage(this.x, this.y, this.facing, 8, Math.min(29, Math.floor(u * 29)), 0.18);
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
        this.spawnGroundedBoneSpire(cx, 192, 0.44, {
          flipX: this.facing < 0,
          glowColor: 'crimson',
          inFront: false
        });

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

    const speed = this.state === 'DASH' ? 495 : 435;
    this.x += this.dashDir * speed * dt;

    if (Math.random() < 0.16) {
      this.spawnAfterimage(this.x, this.groundY, this.facing, 6, 14, 0.16);
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
    }

    if (t >= this.dashDuration) {
      this.isDeflecting = false;
      this.isSubmerged = false;
      this.isFullyBurrowed = false;
      this.submergeDepth = 0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * CROUCH UPDATE: "ABYSSAL SHADOW BURROW & SURPRISE AMBUSH" (`1.72s` total)
   *   - `0.00s .. 0.22s`: Full-body descent `0 -> 204px` cleanly clipped at `groundY + 2` (zero half-body sticking out!).
   *   - `0.22s .. 1.48s`: **`1.26s` 100% invisible underground (`isFullyBurrowed = true`)**, stalking beneath/behind
   *     the enemy with a creeping **Pitch-Black Abyssal Shadow Pool & Predator Lock-On Indicator** (`t >= 1.08s`)!
   *   - `1.48s .. 1.72s`: Explosive **Surprise Attack** eruption uppercut (`abyssalShadowEruptionPillar`)!
   */
  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 1.72;
    const sinkEnd = 0.22;
    const eruptAt = 1.48;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;

    if (t < eruptAt) {
      this.isCrouching = true;
      this.isSubmerged = true;
      this.isDeflecting = true;
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;

      if (t < sinkEnd) {
        // Phase A: Smooth 100% full-body plunge into the pitch-black shadow abyss!
        this.submergeDepth = Math.min(1, t / sinkEnd);
        this.isFullyBurrowed = false;
        this.isInvulnerable = t >= 0.08;
      } else {
        // Phase B (0.22s .. 1.48s -> 1.26s completely underground!): 0% body above ground!
        this.submergeDepth = 1.0;
        this.isFullyBurrowed = true;
        this.isInvulnerable = true;
      }

      // Stealthily stalk along `groundY` to slip right beneath/behind the enemy's blindspot!
      if (enemy && !enemy.isDead) {
        let desiredX = enemy.x + this.submergeDir * 68;
        if (desiredX < 96 || desiredX > ww - 96) {
          desiredX = enemy.x - this.submergeDir * 68;
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
          game.vfx.spawnDamageText(this.x, this.groundY - 56, 0, false, '★ SHADOW LOCK! ★', '#f43f5e');
        }
      }

      // Emit Pitch-Black Abyssal Shadow Pool shader + floor trail droplets along groundY!
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
      // Phase C (t >= 1.48s): EXPLOSIVE SURPRISE AMBUSH ERUPTION!
      this.didActionFrame = true;
      this.isFullyBurrowed = false;
      this.isSubmerged = false;
      this.isInvulnerable = false;
      this.submergeDepth = 0;
      this.comboStep++;

      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      if (game.audio) {
        game.audio.play('scythe_reap', this.x);
        game.audio.play('reaper_ult', this.x);
      }
      if (game.renderer) {
        game.renderer.triggerShake(18, 0.30);
        game.renderer.triggerHitStop(0.065);
      }

      const eruptX = this.x + this.facing * 46;
      const eruptY = this.groundY - 98;

      this.fx?.spawn('abyssalShadowEruptionPillar', this.x, this.groundY - 2, {
        light: 1.44,
        extra: { facing: this.facing }
      });
      this.fx?.spawn('soulHarvestScytheArc', eruptX, eruptY, {
        flip: this.facing < 0,
        light: 1.44,
        extra: { radiusWorld: 156, isCrimson: true, isCross: true, isUppercut: true }
      });
      this.spawnGroundedBoneSpire(eruptX, 220, 0.54, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: false
      });
      this.spawnVfxAnim(4, eruptX, eruptY, 216, 216, 0.36, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: true
      });
      if (game.vfx) {
        game.vfx.spawnGlyphBurst(eruptX, eruptY, 10, 'abyssal');
        game.vfx.spawnDamageText(this.x, this.groundY - 168, 0, true, '★ SURPRISE ATTACK! ★', '#f43f5e');
      }

      // Grant 1.45s of Abyssal Grave-Ward DR upon erupting from underground!
      this.graveWardTimer = Math.max(this.graveWardTimer || 0, 1.45);

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 215) {
        this.strikeWithSoulResonance(enemy, 64, true, -this.facing * 56, -210, game);
        this.gainSoulStack(1);
        this.leechLife(13, enemy, game, 'AMBUSH HARVEST');
      } else {
        this.tryStrikeSeveredEffigy(eruptX, 64, game);
      }
    } else {
      // Rising leap follow-through arc (t = 1.48s .. 1.72s) settling crisply back to groundY!
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

  update(dt, enemy, game) {
    this.wallFlipCooldown = Math.max(0, this.wallFlipCooldown - dt);
    this.crouchCooldown = Math.max(0, this.crouchCooldown - dt);
    this.graveWardTimer = Math.max(0, (this.graveWardTimer || 0) - dt);
    this.burrowDodgeToastCd = Math.max(0, (this.burrowDodgeToastCd || 0) - dt);
    this.soulOrbitPhase += dt * 3.6;

    for (let i = this.burrowTrailNodes.length - 1; i >= 0; i--) {
      this.burrowTrailNodes[i].age += dt;
      if (this.burrowTrailNodes[i].age >= this.burrowTrailNodes[i].maxLife) {
        this.burrowTrailNodes.splice(i, 1);
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

    // 0. Step Summoned Super-Ult Living Death Companions (`12.5s` Death-Mage + Soul-Healer) & Dark Magic Orbs!
    this.updateCompanions(dt, enemy, game);

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
        this.leechLife(7, enemy, game, 'SOUL WAVE');
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
          const manaPreSpire = this.mana;
          this.strikeWithSoulResonance(enemy, 12, true, this.facing * 42, -90, game);
          this.leechLife(3, enemy, game, 'OBELISK ERUPT');
          this.mana = manaPreSpire;
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
          this.strikeWithSoulResonance(enemy, 39, false, -42, -52, game);
          this.gainSoulStack(1);
          this.leechLife(5, enemy, game, 'SOUL DISC');
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
          this.strikeWithSoulResonance(enemy, 29, true, -58, -64, game);
          this.leechLife(4, enemy, game, 'VORTEX SHRED');
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
          this.strikeWithSoulResonance(enemy, 44, true, -96, -80, game);
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

      const canDefensiveBurrow = this.hp < this.maxHp * 0.38 && dist <= 250;
      if (
        this.crouchCooldown <= 0 &&
        this.mana < this.maxMana &&
        this.finisherGauge < 100 &&
        ((dist >= 155 && dist <= 370) || canDefensiveBurrow)
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
          this.spawnVfxAnim(4, cx, cy, 172, 172, 0.28, {
            flipX: this.facing < 0,
            glowColor: 'crimson',
            inFront: true
          });
          if (game.vfx) {
            game.vfx.spawnDamageText(this.x, this.y - 150, 0, false, '★ THANATOS CROSS-REAP! ★', '#e879f9');
          }
        }

        if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= this.attackRange + 50) {
          const isCrit = mode === 2 || Math.random() < 0.24;
          let dmg = mode === 2 ? 88 : mode === 1 ? 77 : 68;
          let crimsonHeal = 0;
          if (mode === 2 && this.soulStacks >= 5) {
            this.consumeSoulStacks(2);
            dmg += 20;
            crimsonHeal = 5;
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
          this.leechLife(7 + crimsonHeal, enemy, game, 'SOUL HARVEST');
          if (game.audio) game.audio.play(mode === 2 ? 'soul_drain' : 'scythe_reap', enemy.x);
          if (game.renderer) game.renderer.triggerHitStop(0.055);
        } else {
          this.tryStrikeSeveredEffigy(cx, mode === 2 ? 82 : 68, game);
        }
      }
    } else if (t >= 0.84) {
      this.setState('IDLE');
    }
  }

  /**
   * SIGNATURE SKILL (`4.85s CD`): "SOUL SEVER"
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
          enemy.takeDamage(40, this, !enemy.hasPoise, -165, -32);
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
      const bonusDmg = consumedSouls * 10;
      const bonusHeal = consumedSouls * 3;

      if (enemy && !enemy.isDead && Math.abs(enemy.x - this.x) < 250) {
        this.strikeWithSoulResonance(enemy, 78 + bonusDmg, true, -36, -125, game);
        this.leechLife(11 + bonusHeal, enemy, game, consumedSouls > 0 ? `SOUL SNAP x${consumedSouls}` : 'SOUL GUILLOTINE');
      } else {
        this.tryStrikeSeveredEffigy(reapX, 82 + bonusDmg, game);
      }
    } else if (t >= 0.90) {
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
        0.30 + i * 0.04,
        1.0
      );
    }
  }

  /**
   * OVERDRIVE (`ULTIMATE` — "DEATH'S SOVEREIGNTY", `1.86s`):
   * 5-Beat Blood-Moon Thanatos Sky-Drop Execution (Companions now summon exclusively on Super Ultimate!):
   * - Beat 1 (`0.04s`): Localized Blood-Moon twilight (`ultDim = 0.38`), `356x356` Thanatos Stand (`Row 3`),
   *   Twin `248px` Crimson Guillotine Obelisks (`Row 2`), and Dual Skeletal Chains shackling the foe!
   * - Beat 2 (`0.28s`): High-speed L->R Phantom Pincer Cross-Slash (`Row 2` scythe cleave) + opposite Wraith Clone!
   * - Beat 3 (`0.56s`): `112px` Rising Scythe Vault R->L (`Row 8`) + Twin Criss-Crossing Wraith Clones!
   * - Beat 4 (`0.86s .. 1.18s`): High-Sky Apex Suspension (`groundY - 168`) flanked by Twin Aerial Wraith Clones
   *   firing Triple Downward Death-Chains (`★ THANATOS SKY-LOCK! ★`)!
   * - Beat 5 (`1.20s`): Cataclysmic Sky-Drop Slam with `0.08s` Abyssal Impact Frame, `30px` quake, Reality-Crack
   *   slash flash, `348x284` `Row 7` Guillotine, 5-Wave Obelisk Fault-Line & `2.2s` Abyssal Grave-Ward!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const ww = game.renderer ? game.renderer.worldWidth : 1200;
    const targetX = enemy ? Math.max(150, Math.min(ww - 150, enemy.x)) : ww * 0.5;
    this.vx = 0;
    this.vy = 0;
    this.mana = 0;
    this.giantScale = 1.0;
    this.isDeflecting = t < 1.66;
    this.isInvulnerable = t < 1.48;

    // Localized Blood-Moon twilight dim (zero stage background swap!)
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

    // BEAT 1 (t >= 0.04s): Sovereign Domain Unseal, Twin Obelisk Prison & Dual Chain Snare!
    if (t >= 0.04 && this.ultStage === 0) {
      this.ultStage = 1;
      this._ultTargetLockX = targetX;
      this.soulStacks = this.maxSoulStacks;
      if (game.audio) {
        game.audio.play('soul_drain', targetX);
        game.audio.play('chain_hook', targetX);
      }
      if (game.renderer) game.renderer.triggerShake(18, 0.28);

      this.tombstones = [];
      for (const side of [-1, 1]) {
        const tx = Math.max(85, Math.min(ww - 85, targetX + side * 182));
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

      this.fx?.spawn('necropolisBoneyardDomain', targetX, this.groundY - 4, {
        light: 1.46
      });
      this.fx?.spawn('necroticGraveyardSigil', targetX, this.groundY - 4, {
        palette: BLOOD_MOON_CRIMSON_PALETTE,
        light: 1.42,
        extra: { radius: 56, isPrison: true, isCrimson: true, customDuration: 1.68 }
      });
      this.spawnVfxAnim(6, targetX, this.groundY - 106, 268, 268, 0.54, {
        glowColor: 'crimson',
        inFront: false
      });

      if (game.vfx) {
        game.vfx.spawnGlyphBurst(targetX, this.groundY - 104, 10, 'abyssal');
        game.vfx.spawnDamageText(
          targetX,
          this.groundY - 262,
          0,
          true,
          "★ DEATH'S SOVEREIGNTY! ★",
          '#d946ef'
        );
      }
      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 14, false, -28, 0, game);
        this.mana = 0;
      }
    }

    if (t >= 0.04 && t < 0.28 && this.ultStage === 1) {
      const u1 = Math.min(1, (t - 0.04) / 0.24);
      this.trueUltFrameOverride = 122 + Math.min(6, Math.floor(u1 * 7));
      if (enemy && !enemy.isDead && !enemy.unstoppablePoise) {
        enemy.x += (lockX - enemy.x) * Math.min(1, dt * 6.5);
      }
    }

    // BEAT 2 (t >= 0.28s): Phantom Pincer Cross-Slash I (Malakor L->R + Opposite Wraith Clone R->L)
    if (t >= 0.28 && this.ultStage === 1) {
      this.ultStage = 2;
      this._ultTargetLockX = targetX;
      if (game.audio) game.audio.play('scythe_reap', targetX);
      if (game.renderer) {
        game.renderer.triggerShake(19, 0.24);
        game.renderer.triggerHitStop(0.04);
      }

      this.ultPassStartX = Math.max(105, Math.min(ww - 105, targetX - 168));
      this.ultPassTargetX = Math.max(105, Math.min(ww - 105, targetX + 168));
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
      this.spawnWraithTrail(this.ultPassStartX, this.groundY, this.ultPassTargetX, this.groundY, 1, 6, 2);
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
      this.trueUltFrameOverride = 68 + Math.min(13, Math.floor(u * 14));
    }

    // BEAT 3 (t >= 0.56s): Rising Scythe Vault II (Malakor 112px Aerial Arc R->L + Twin Criss-Crossing Clones)
    if (t >= 0.56 && this.ultStage === 2) {
      this.ultStage = 3;
      this._ultTargetLockX = targetX;
      if (game.audio) game.audio.play('reaper_ult', targetX);
      if (game.renderer) {
        game.renderer.triggerShake(20, 0.26);
        game.renderer.triggerHitStop(0.045);
      }

      this.ultPassStartX = Math.max(105, Math.min(ww - 105, targetX + 162));
      this.ultPassTargetX = Math.max(105, Math.min(ww - 105, targetX - 162));
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
      this.spawnWraithTrail(this.ultPassStartX, this.groundY - 24, this.ultPassTargetX, this.groundY - 82, -1, 6, 8);

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

    // BEAT 4 (t >= 0.86s .. 1.20s): High-Sky Apex Suspension (`groundY - 168`) & Triple Death-Chain Sky-Lock!
    if (t >= 0.86 && this.ultStage === 3) {
      this.ultStage = 4;
      this._ultTargetLockX = targetX;
      if (game.audio) game.audio.play('chain_hook', targetX);
      if (game.renderer) game.renderer.triggerShake(20, 0.28);

      const dir = enemy ? Math.sign(enemy.x - this.x) || 1 : 1;
      this.ultPassStartX = targetX;
      this.ultPassTargetX = Math.max(110, Math.min(ww - 110, targetX - dir * 96));
      this.x = targetX;
      this.y = this.groundY - 168;
      this.facing = dir;

      this.fx?.spawn('abyssalShadowEruptionPillar', targetX, this.groundY - 2, {
        light: 1.42,
        extra: { facing: dir }
      });

      // Twin Aerial Wraith Executioners flank Malakor high in the sky!
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

      if (game.vfx) {
        game.vfx.spawnDamageText(targetX, this.groundY - 246, 0, false, '★ THANATOS SKY-LOCK! ★', '#f43f5e');
      }

      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 16, true, 0, -96, game);
        this.mana = 0;
        this.leechLife(6, enemy, game, 'THANATOS SHACKLE');
      }
    }

    if (t >= 0.86 && t < 1.20 && this.ultStage === 4) {
      const u = Math.min(1, (t - 0.86) / 0.34);
      // Hold ominous apex suspension at groundY - 168 for 72% of the beat, then coil into lightning dive!
      const diveFrac = u < 0.72 ? 0 : Math.pow((u - 0.72) / 0.28, 2.2);
      this.x = lockX + (this.ultPassTargetX - lockX) * diveFrac;
      this.y = this.groundY - Math.round((1 - diveFrac) * 168 + Math.sin(u * Math.PI) * 10);
      this.trueUltFrameOverride = 253 + Math.min(6, Math.floor(u * 7));
      if (enemy && !enemy.isDead && !enemy.unstoppablePoise) {
        enemy.x += (lockX - enemy.x) * Math.min(1, dt * 8.0);
      }
    } else if (t >= 1.20) {
      this.y = this.groundY;
    }

    if (this.thanatosStand) {
      this.thanatosStand.x = lockX;
      if (this.ultStage === 4 && t < 1.20) {
        this.thanatosStand.y = this.groundY - Math.round(this.thanatosStand.size * 0.62);
      } else {
        this.thanatosStand.y = this.groundY - Math.round(this.thanatosStand.size * 0.52);
      }
    }

    // BEAT 5 (t >= 1.20s): Cataclysmic Sky-Drop Guillotine, Abyssal Impact Frame & 5-Wave Obelisk Fault-Line!
    if (t >= 1.20 && this.ultStage === 4) {
      this.ultStage = 5;
      this._ultSlashFlash = 0.48;
      this._ultSlashCenterX = lockX;
      this.graveWardTimer = Math.max(this.graveWardTimer || 0, 1.50);

      if (game.audio) {
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
      if (game.renderer) {
        game.renderer.triggerShake(30, 0.58);
        game.renderer.triggerAberration(18);
        game.renderer.triggerHitStop(0.09);
        game.renderer.flash?.(0.18, '#f5d0fe');
      }

      const slamDir = enemy ? Math.sign(enemy.x - this.x) || this.facing : this.facing;
      this.facing = slamDir;
      this.x = Math.max(95, Math.min(ww - 95, lockX - slamDir * 90));
      this.y = this.groundY;

      // Twin Aerial Wraith Clones crash diagonally from sky into the Guillotine epicenter!
      this.spawnWraithClone(lockX - 150, this.groundY - 120, lockX + 70, this.groundY, 1, 0.34, 4, 14, 24);
      this.spawnWraithClone(lockX + 150, this.groundY - 120, lockX - 70, this.groundY, -1, 0.34, 4, 14, 24);

      this.fx?.spawn('deathAvatarCathedral', lockX, this.groundY - 4, {
        light: 1.50
      });
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

      const faultStart = Math.max(95, Math.min(ww - 95, lockX - slamDir * 176));
      this.spawnNecroticFaultLine(faultStart, slamDir, game);

      for (const tb of this.tombstones) {
        tb.shattered = true;
        tb.life = Math.min(tb.life, tb.maxLife * 0.32);
      }

      if (enemy && !enemy.isDead) {
        this.strikeWithSoulResonance(enemy, 58, true, slamDir * 168, -230, game);
        this.mana = 0;
        this.leechLife(16, enemy, game, 'THANATOS SKY-GUILLOTINE');
        if (game.vfx) game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 98, 16, 'abyssal');
      }
    }

    if (t >= 1.20 && t < 1.86) {
      const uFollow = Math.min(1, (t - 1.20) / 0.66);
      this.trueUltFrameOverride = 136 + Math.min(13, Math.floor(uFollow * 14));
    }

    if (t >= 1.86) {
      this.y = this.groundY;
      this.mana = 0;
      this.giantScale = 1.0;
      this.isDeflecting = false;
      this.isInvulnerable = false;
      this.trueUltFrameOverride = null;
      this.thanatosStand = null;
      this.deathAvatar = null;
      this.wraithClones = [];
      this.setState('IDLE');
    }
  }

  /**
   * SUPREME ULTIMATE (`state === 'TRUE_ULTIMATE'`, `4.50s` + `12.5s` Summoned Death Companions!):
   * "MEMENTO MORI: OBLIVION GUILLOTINE"
   * - Zero stage background image override (`trueUltStageOverride` / `permanentStageOverride` untouched).
   * - Phase 1 (`0.00s .. 1.25s`): Deep Oblivion Eclipse (`ultDim = 0.64`), Twin `352x352` Cathedral Gates (`Row 5`),
   *   Colossal `388x388` Thanatos Stand (`Row 3`), AND at `0.38s` unseals the **12.5s Abyssal Death-Mage (`480 HP` + `60` Ward)**
   *   and **Ossuary Soul-Healer (`420 HP` + `50` Ward)** directly out of the Left & Right Oblivion Gates!
   * - Phase 2 (`1.25s .. 3.15s`): Six-Scythe Death-Clock Seal (`Row 6`, `356x356`), 4-Chain Covenant Snare,
   *   4 High-Speed Non-Damaging Phantom Wraith Clones (`1.52s` & `1.96s`), and Malakor's `192px` Sovereign Sky-Ascent (`2.36s`)!
   * - Phase 3 (`t = 3.15s`): Cataclysmic Sky-Plunge with `0.14s` Impact Frame, `34px` quake, Full-Horizon Reality-Split
   *   Slash Streak, `548x428` `Row 7` Cross-Guillotine, single `720`-Crit Execution + `12%` Max HP Harvest + `2.2s` Grave-Ward!
   */
  updateTrueUltimate(dt, enemy, game) {
    const elapsed = this.stateTimer;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
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

    // Deep Oblivion Eclipse dim without ever swapping stage backgrounds
    if (game?.renderer && elapsed < 4.35) {
      const dimTarget =
        elapsed <= 3.45 ? 0.64 : 0.64 * Math.max(0, 1 - (elapsed - 3.45) / 0.90);
      game.renderer.ultDim = Math.max(game.renderer.ultDim || 0, dimTarget);
    }

    // =========================================================================
    // PHASE 1 (0.00s .. 1.25s): Unsealing Twin Oblivion Gates & Summoning Death-Mage + Soul-Healer!
    // =========================================================================
    if (elapsed < 1.25) {
      if (elapsed >= 0.04 && this._trueUltStep < 1) {
        this._trueUltStep = 1;
        this._trueUltAltarX = enemy
          ? Math.max(260, Math.min(940, enemy.x))
          : Math.max(260, Math.min(940, this.x + this.facing * 220));

        game?.audio?.play?.('reaper_ult', this.x);
        game?.audio?.play?.('ult_cast', this._trueUltAltarX);
        game?.renderer?.triggerShake?.(18, 0.34);
        game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#d946ef');
        game?.vfx?.spawnDamageText?.(
          this._trueUltAltarX,
          this.groundY - 254,
          0,
          true,
          '★ GATES OF OBLIVION: UNSEAL! ★',
          '#d946ef'
        );

        for (let i = 0; i < 6; i++) {
          this.spawnSoulWisp();
        }

        this.fx?.spawn('mementoMoriNecropolisGates', this._trueUltAltarX, this.groundY - 4, {
          light: 1.50
        });
        this.fx?.spawn('necropolisBoneyardDomain', this._trueUltAltarX, this.groundY - 4, {
          light: 1.46
        });
        this.fx?.spawn('necroticGraveyardSigil', this._trueUltAltarX, this.groundY - 4, {
          palette: ABYSSAL_VIOLET_PALETTE,
          light: 1.44,
          extra: { radius: 60, isPrison: true, isCrimson: false, customDuration: 3.40 }
        });
      }

      // t = 0.38s: Summon the 12.5s Abyssal Death-Mage (480 HP) & Ossuary Soul-Healer (420 HP) out of the Twin Gates!
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

    // =========================================================================
    // PHASE 2 (1.25s .. 3.15s): Death-Clock Bind, Phantom Wraith Barrage & 192px Sovereign Sky-Ascent!
    // =========================================================================
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

      // t = 1.52s: Non-damaging High-Speed Grounded Phantom Wraith Cross-Slash from both Gates!
      if (elapsed >= 1.52 && !this._trueUltPhantomWave1) {
        this._trueUltPhantomWave1 = true;
        game?.audio?.play?.('scythe_reap', this._trueUltAltarX);
        game?.renderer?.triggerShake?.(16, 0.22);

        const lx = Math.max(95, Math.min(ww - 95, this._trueUltAltarX - 180));
        const rx = Math.max(95, Math.min(ww - 95, this._trueUltAltarX + 180));
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

      // t = 1.96s: Non-damaging Twin Aerial Diagonal Phantom Executioners!
      if (elapsed >= 1.96 && !this._trueUltPhantomWave2) {
        this._trueUltPhantomWave2 = true;
        game?.audio?.play?.('scythe_reap', this._trueUltAltarX);
        game?.renderer?.triggerShake?.(18, 0.24);

        const lx = Math.max(95, Math.min(ww - 95, this._trueUltAltarX - 186));
        const rx = Math.max(95, Math.min(ww - 95, this._trueUltAltarX + 186));
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

      // t = 2.36s .. 3.14s: Malakor's Sovereign Sky-Ascent Coil (`groundY - 192`) directly in front of Thanatos Stand!
      if (elapsed >= 2.36 && !this._trueUltSkyAscent) {
        this._trueUltSkyAscent = true;
        this._trueUltAscentStartX = this.x;
        game?.audio?.play?.('reaper_ult', this._trueUltAltarX);
        game?.renderer?.triggerShake?.(20, 0.30);

        this.fx?.spawn('abyssalShadowEruptionPillar', this.x, this.groundY - 2, {
          light: 1.46,
          extra: { facing: this.facing }
        });
        for (let i = 0; i < 6; i++) {
          this.spawnSoulWisp();
        }
        game?.vfx?.spawnDamageText?.(
          this._trueUltAltarX,
          this.groundY - 266,
          0,
          true,
          '★ MEMENTO MORI: FINAL TOLL! ★',
          '#f43f5e'
        );
      }

      if (elapsed >= 2.36) {
        const uAsc = Math.min(1, Math.max(0, (elapsed - 2.36) / 0.78));
        const liftEase = 1 - Math.pow(1 - Math.min(1, uAsc / 0.55), 3);
        const startX = Number.isFinite(this._trueUltAscentStartX) ? this._trueUltAscentStartX : this.x;
        this.x = startX + (this._trueUltAltarX - startX) * liftEase;
        this.y = this.groundY - Math.round(liftEase * 192 + Math.sin(uAsc * Math.PI * 2) * 5);
        this.trueUltFrameOverride = 252 + Math.min(7, Math.floor(uAsc * 8));
      } else {
        const uBind = Math.min(1, Math.max(0, (elapsed - 1.25) / 1.11));
        this.trueUltFrameOverride = 128 + Math.min(7, Math.floor(uBind * 8));
      }

      // Pull and bind active enemies to this._trueUltAltarX with ZERO micro-tick damage!
      if (enemy && !enemy.isDead) {
        enemy.x += (this._trueUltAltarX - enemy.x) * Math.min(1, dt * 8.6);
        enemy.vx = 0;
      }
      for (const tgt of targets) {
        if (tgt && !tgt.isDead && !tgt.isBenched && tgt !== enemy) {
          tgt.x += (this._trueUltAltarX - tgt.x) * Math.min(1, dt * 8.6);
          tgt.vx = 0;
        }
      }
      return;
    }

    // =========================================================================
    // PHASE 3 (t >= 3.15s): Cataclysmic Sky-Plunge & Reality-Split Oblivion Guillotine!
    // =========================================================================
    if (elapsed >= 3.15 && this._trueUltStep < 3) {
      this._trueUltStep = 3;
      this._trueUltSlashFlash = 0.98;
      this.soulStacks = this.maxSoulStacks;
      this.graveWardTimer = Math.max(this.graveWardTimer || 0, 2.20);

      if (Math.abs(this._trueUltAltarX - this.x) > 8) {
        this.facing = this._trueUltAltarX >= this.x ? 1 : -1;
      }
      const landX = Math.max(95, Math.min(ww - 95, this._trueUltAltarX - this.facing * 88));
      this.spawnWraithTrail(this._trueUltAltarX, this.groundY - 188, landX, this.groundY, this.facing, 6, 8);
      this.x = landX;
      this.y = this.groundY;

      // 4 Converging Wraith Executioners (2 Grounded + 2 Aerial) cleave inward from both Oblivion Gates!
      this.spawnWraithClone(
        this._trueUltAltarX - 172,
        this.groundY,
        this._trueUltAltarX + 90,
        this.groundY,
        1,
        0.46,
        4,
        14,
        24
      );
      this.spawnWraithClone(
        this._trueUltAltarX + 172,
        this.groundY,
        this._trueUltAltarX - 90,
        this.groundY,
        -1,
        0.46,
        4,
        14,
        24
      );
      this.spawnWraithClone(
        this._trueUltAltarX - 168,
        this.groundY - 148,
        this._trueUltAltarX + 64,
        this.groundY,
        1,
        0.42,
        8,
        14,
        24
      );
      this.spawnWraithClone(
        this._trueUltAltarX + 168,
        this.groundY - 148,
        this._trueUltAltarX - 64,
        this.groundY,
        -1,
        0.42,
        8,
        14,
        24
      );

      game?.renderer?.triggerImpactFrame?.(
        0.14,
        this._trueUltAltarX,
        this.groundY - 116,
        'abyssal'
      );
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

      this.fx?.spawn('deathAvatarCathedral', this._trueUltAltarX, this.groundY - 4, {
        light: 1.50
      });
      this.fx?.spawn('soulHarvestScytheArc', this._trueUltAltarX, this.groundY - 114, {
        flip: this.facing < 0,
        light: 1.50,
        extra: { radiusWorld: 196, isCrimson: true, isCross: true, isUppercut: false }
      });

      // Central + Twin Flanking Grounded Bone Obelisks (purely visual Row 2 spires -> 0 extra damage ticks!)
      this.spawnGroundedBoneSpire(this._trueUltAltarX, 264, 0.86, {
        flipX: this.facing < 0,
        glowColor: 'crimson',
        inFront: false
      });
      for (const side of [-1, 1]) {
        const spX = Math.max(92, Math.min(ww - 92, this._trueUltAltarX + side * 146));
        this.spawnGroundedBoneSpire(spX, 224, 0.74, {
          flipX: side < 0,
          glowColor: side < 0 ? 'violet' : 'crimson',
          inFront: false
        });
      }
      game?.vfx?.spawnGlyphBurst?.(this._trueUltAltarX, this.groundY - 112, 18, 'abyssal');

      // SINGLE INSTANTANEOUS EXECUTION BURST (720 primary Crit; 0.76x on secondary 2v2 foe) + 12% Max HP Harvest!
      const manaBeforeExec = 0;
      let hitCount = 0;
      for (const t of targets) {
        if (t && !t.isDead && !t.isBenched) {
          const burstDmg = hitCount === 0 ? 720 : Math.round(720 * 0.76);
          t.takeDamage(burstDmg, this, true, 295, -265);
          hitCount++;
        }
      }
      this.mana = manaBeforeExec;
      this.heal(Math.round(this.maxHp * 0.12), 'OBLIVION HARVEST');
    }

    // =========================================================================
    // PHASE 4 (3.15s .. 4.50s): Sovereign Follow-Through & Death Covenant Unleashed!
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
      // Note: `this.deathCompanions` (480 HP Death-Mage & 420 HP Soul-Healer) now enter active combat for a full 12.5s!
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
      ctx.globalAlpha = Math.min(1, alpha * 0.20);
      const gw = Math.round(w * 1.15);
      const gh = Math.round(h * 1.15);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.22);
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

    // Twin Cathedral Gates of Oblivion (`Row 5`, 352x352) flanking the Altar & Summoned Companions!
    this.drawBloomedVfxCell(
      ctx,
      vfxSheet,
      5,
      col,
      this._trueUltAltarX - 168,
      gateY,
      352,
      352,
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
      this._trueUltAltarX + 168,
      gateY,
      352,
      352,
      gateAlpha,
      true,
      renderer,
      'crimson'
    );

    // Colossal Towering Hooded Thanatos Death-God Stand (`Row 3`, 388x388) rising & plunging with Malakor!
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
        const alpha = Math.max(0, (1 - img.age / img.maxLife) * 0.28);
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
   * Renders Malakor's Pitch-Black Abyssal Shadow Burrow Pool, Creeping Floor Wake, Shadow Tendrils,
   * Predator Eye-Slits & Contracting Surprise-Attack Lock-On Reticle (`0` ctx.rotate / `0` quadraticCurveTo).
   */
  drawBurrowShadowIndicator(ctx, renderer = null) {
    const gy = this.groundY;

    // 1. Fading Pitch-Black Shadow Wake Puddles trailing along Malakor's underground path
    if (this.burrowTrailNodes && this.burrowTrailNodes.length > 0) {
      ctx.save();
      for (const node of this.burrowTrailNodes) {
        const u = Math.min(1, Math.max(0, node.age / node.maxLife));
        const alpha = (1 - u) * 0.78;
        if (alpha <= 0.03) continue;
        const rx = Math.max(10, (node.rx || 28) * (1 - u * 0.42));
        const ry = Math.max(3, rx * 0.25);

        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = '#1e0638';
        ctx.beginPath();
        ctx.ellipse(Math.round(node.x), Math.round(gy + 1), rx + 6, ry + 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#020006';
        ctx.beginPath();
        ctx.ellipse(Math.round(node.x), Math.round(gy + 1), rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 2. Outer Dark-Matter Void Halo & Obsidian Abyss Puddle Layers
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = isWarning ? '#3b0724' : '#1b0636';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 16, ry + 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.94;
    ctx.fillStyle = '#05010d';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 6, ry + 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pure pitch-black abyssal sinkhole core
    ctx.globalAlpha = 0.98;
    ctx.fillStyle = '#010004';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Razor abyssal rim ring
    ctx.lineWidth = isWarning ? 2.5 : 2;
    ctx.strokeStyle = isWarning ? ( pulse > 0 ? '#fb7185' : '#e879f9' ) : '#9333ea';
    ctx.globalAlpha = isWarning ? 0.95 : 0.78;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 2, ry + 1, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Pixel-Stepped Pitch-Black Shadow Tendrils rising from the floor puddle (`fillRect` only!)
    const tendrilCount = 9;
    for (let i = 0; i < tendrilCount; i++) {
      const norm = (i / (tendrilCount - 1)) * 2 - 1; // -1 .. +1
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

    // 4. Glowing Crimson Predator Eye-Slits glaring from inside the pitch-black shadow pool!
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

    // 5. Contracting Crimson-Magenta SURPRISE ATTACK Lock-On Reticle (`t = 1.08s .. 1.48s`)!
    if (isWarning) {
      const lockRx = Math.round(94 - warnU * 40);
      const lockRy = Math.max(9, Math.round(lockRx * 0.25));
      ctx.globalAlpha = 0.55 + warnU * 0.42;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = warnU > 0.65 && pulse > 0 ? '#ffffff' : '#f43f5e';
      ctx.beginPath();
      ctx.ellipse(cx, cy, lockRx, lockRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Cardinal pixel lock-on teeth & vertical ambush spark needle
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
   * Renders Malakor's Summoned `12.5s` Super-Ultimate Living Death Companions
   * (`Abyssal Death-Mage` 480 HP + 60 Ward & `Ossuary Soul-Healer` 420 HP + 50 Ward),
   * their Symbiotic Soul-Covenant Tether, 2.5D Sanctum Rings, and Soul-Ward + HP + Timer Plates!
   */
  drawDeathCompanions(ctx, sprites, renderer = null) {
    if (this.isDead || !this.deathCompanions || this.deathCompanions.length === 0) return;

    const compSheet = sprites?.companions;
    const vfxSheet = sprites?.vfx;
    const mage = this.deathCompanions.find((c) => c && !c.isDead && c.role === 'mage') || null;
    const healer = this.deathCompanions.find((c) => c && !c.isDead && c.role === 'healer') || null;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Live Symbiotic Soul-Covenant Stream (`Soul-Healer -> Death-Mage`) whenever both are alive!
    if (mage && healer) {
      const sx = healer.x + healer.facing * 18;
      const sy = healer.y - 84;
      const tx = mage.x - mage.facing * 10;
      const ty = mage.y - 86;
      const isChanneling =
        this.state === 'TRUE_ULTIMATE' ||
        healer.castAnimTimer > 0 ||
        mage.soulEmpoweredTimer > 0;
      const nodeCount = isChanneling ? 8 : 5;

      for (let i = 1; i <= nodeCount; i++) {
        const u = ((i / (nodeCount + 1)) + ((this.soulOrbitPhase * 0.45) % (1 / (nodeCount + 1))));
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
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            1,
            wispCol,
            nx,
            ny,
            32,
            32,
            0.52,
            false,
            renderer,
            'violet'
          );
        }
      }
    }

    // 2. Render each living companion (Healer slightly behind Mage in Z-order)
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

      // Ground contact shadow + 2.5D sanctum floor ring
      ctx.globalAlpha = 0.60 * lifeFade;
      ctx.fillStyle = '#03010a';
      ctx.beginPath();
      ctx.ellipse(cx, gy + 2, 36, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = (inCastPose ? 0.86 : 0.56) * lifeFade;
      ctx.lineWidth = 2;
      ctx.strokeStyle = isMage ? '#d946ef' : '#34d399';
      ctx.beginPath();
      ctx.ellipse(cx, gy + 2, 40 + Math.sin(comp.hoverPhase * 2) * 3, 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Cyan Soul-Ward Overshield ground ring when shielded!
      if (hasShield) {
        ctx.globalAlpha = 0.52 * lifeFade;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#67e8f9';
        ctx.beginPath();
        ctx.ellipse(cx, gy + 2, 46, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Soft additive aura glow behind companion
      const glowImg = isMage
        ? renderer?.glowViolet || renderer?.glowPurple || renderer?.glowCrimson
        : renderer?.glowGreen || renderer?.glowTeal || renderer?.glowGold || renderer?.glowViolet;
      if (glowImg) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (inCastPose ? 0.38 : 0.22) * lifeFade;
        ctx.drawImage(glowImg, cx - 88, cy - 162, 176, 176);
        ctx.restore();
      }

      // 30fps HD-2D Companion Sprite (`reaper_companions.png`, 208x208 cells)
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
        // Fallback silhouette only while image finishes initial decode
        ctx.globalAlpha = 0.85 * lifeFade;
        ctx.fillStyle = isMage ? '#7e22ce' : '#059669';
        ctx.fillRect(cx - 18, cy - 96, 36, 86);
      }

      // Floating Cyan Soul-Ward Aegis chevrons when companion's Overshield is active!
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

      // Soul-Empowered Covenant Motes orbiting the Death-Mage when blessed by the Soul-Healer!
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

      // 3. Crisp Pixel-Art Soul-Ward Overshield + HP + 12.5s Summon Lifespan Plate above each Companion!
      const barW = 54;
      const barX = cx - Math.floor(barW * 0.5);
      const barY = cy - 154;
      const hpFrac = Math.max(0, Math.min(1, comp.hp / Math.max(1, comp.maxHp)));
      const shieldFrac = Math.max(
        0,
        Math.min(1, (comp.shield || 0) / Math.max(1, comp.maxShield || 60))
      );
      const lifeFrac = Math.max(0, Math.min(1, comp.life / Math.max(0.1, comp.maxLife)));

      ctx.globalAlpha = 0.95 * lifeFade;
      // Outer dark plate + crisp 1px role/ward-tinted frame
      ctx.fillStyle = '#05020c';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, 15);
      ctx.strokeStyle = hasShield ? '#38bdf8' : isMage ? '#a21caf' : '#059669';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX - 1.5, barY - 1.5, barW + 3, 14);

      // Top 2px Cyan Soul-Ward Overshield Strip (`60` / `50` Ward)
      ctx.fillStyle = '#0c1929';
      ctx.fillRect(barX, barY, barW, 2);
      if (shieldFrac > 0) {
        const shW = Math.max(2, Math.round(barW * shieldFrac));
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(barX, barY, shW, 2);
        ctx.fillStyle = '#ecfeff';
        ctx.fillRect(barX, barY, shW, 1);
      }

      // Middle 5px Companion HP Bar (`480 HP` Mage / `420 HP` Healer)
      const hpY = barY + 3;
      ctx.fillStyle = '#140b24';
      ctx.fillRect(barX, hpY, barW, 5);

      const fillW = Math.max(hpFrac > 0 ? 2 : 0, Math.round(barW * hpFrac));
      if (fillW > 0) {
        ctx.fillStyle =
          hpFrac < 0.34 ? '#f43f5e' : isMage ? '#c026d3' : '#10b981';
        ctx.fillRect(barX, hpY, fillW, 5);
        ctx.fillStyle =
          hpFrac < 0.34 ? '#fda4af' : isMage ? '#f5d0fe' : '#a7f3d0';
        ctx.fillRect(barX, hpY, fillW, 2);
      }

      // 100-HP micro-segment ticks (`100, 200, 300, 400`)
      ctx.fillStyle = '#05020c';
      for (let tickHp = 100; tickHp < comp.maxHp; tickHp += 100) {
        const txTick = barX + Math.round((tickHp / comp.maxHp) * barW);
        ctx.fillRect(txTick, hpY, 1, 5);
      }

      // Bottom 2px 12.5s Summon Duration Strip
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(barX, barY + 9, barW, 2);
      const lifeW = Math.max(1, Math.round(barW * lifeFrac));
      ctx.fillStyle = isMage ? '#e879f9' : '#fde047';
      ctx.fillRect(barX, barY + 9, lifeW, 2);

      // Role Pixel Emblem to the left of the HP plate (Arcane Diamond for Mage / Soul Cross for Healer)
      const iconX = barX - 9;
      const iconY = barY + 5;
      if (isMage) {
        ctx.fillStyle = '#d946ef';
        ctx.fillRect(iconX - 3, iconY - 1, 6, 2);
        ctx.fillRect(iconX - 1, iconY - 3, 2, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(iconX - 1, iconY - 1, 2, 2);
      } else {
        ctx.fillStyle = '#34d399';
        ctx.fillRect(iconX - 3, iconY - 1, 6, 2);
        ctx.fillRect(iconX - 1, iconY - 3, 2, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(iconX - 1, iconY - 1, 2, 2);
      }
    }

    ctx.restore();
  }

  /**
   * Renders a razor-sharp HD-2D Pixel Reality-Split X-Slash + Horizon Fracture Streak
   * using stepped `ctx.fillRect` pixel bars ONLY (`0` ctx.rotate / `0` quadraticCurveTo).
   */
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
    if (alpha <= 0.02) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'lighter';

    const steps = 28;
    for (let s = -steps; s <= steps; s++) {
      const u = s / steps; // -1 .. +1
      const taper = 1 - Math.abs(u) * 0.72;
      const thickOuter = Math.max(2, Math.round(12 * taper));
      const thickCore = Math.max(1, Math.round(4 * taper));
      const xOff = Math.round(u * halfW);
      const yOff = Math.round(u * halfH);
      const segW = Math.max(6, Math.ceil((halfW * 2) / (steps * 2)) + 2);

      // Diagonal 1 (\) & Diagonal 2 (/) outer plasma
      ctx.globalAlpha = Math.min(1, alpha * 0.56);
      ctx.fillStyle = outerColor;
      ctx.fillRect(
        Math.round(cx + xOff - segW * 0.5),
        Math.round(cy + yOff - thickOuter * 0.5),
        segW,
        thickOuter
      );
      ctx.fillStyle = midColor;
      ctx.fillRect(
        Math.round(cx + xOff - segW * 0.5),
        Math.round(cy - yOff - thickOuter * 0.5),
        segW,
        thickOuter
      );

      // Pure white razor core on both diagonals
      ctx.globalAlpha = Math.min(1, alpha * 0.94);
      ctx.fillStyle = coreColor;
      ctx.fillRect(
        Math.round(cx + xOff - segW * 0.5),
        Math.round(cy + yOff - thickCore * 0.5),
        segW,
        thickCore
      );
      ctx.fillRect(
        Math.round(cx + xOff - segW * 0.5),
        Math.round(cy - yOff - thickCore * 0.5),
        segW,
        thickCore
      );
    }

    // Full-span horizontal Reality-Crack Streak across the execution epicenter
    const horizSpan = Math.round(halfW * 1.16);
    ctx.globalAlpha = Math.min(1, alpha * 0.62);
    ctx.fillStyle = midColor;
    ctx.fillRect(Math.round(cx - horizSpan), Math.round(cy - 4), horizSpan * 2, 8);
    ctx.globalAlpha = Math.min(1, alpha * 0.98);
    ctx.fillStyle = coreColor;
    ctx.fillRect(Math.round(cx - Math.round(horizSpan * 0.94)), Math.round(cy - 1), Math.round(horizSpan * 1.88), 3);

    // Central Starburst Flash Cross
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = outerColor;
    ctx.fillRect(Math.round(cx - 26), Math.round(cy - 5), 52, 10);
    ctx.fillRect(Math.round(cx - 5), Math.round(cy - 34), 10, 68);
    ctx.fillStyle = coreColor;
    ctx.fillRect(Math.round(cx - 16), Math.round(cy - 2), 32, 4);
    ctx.fillRect(Math.round(cx - 2), Math.round(cy - 22), 4, 44);

    ctx.restore();
  }

  /**
   * Foreground 2.5D Shader Pass (`front`) + Dark-Matter Void Orbs (`this.darkMagicOrbs`),
   * Orbiting Soul Fragments, Captive Severed Soul Effigy & Tether, Crescent Soul-Wave (`Row 0`),
   * Returning Soul-Disc (`Row 0`), and Homing Soul-Leech Wisps (`Row 1`).
   */
  drawUltimateForeground(ctx, renderer = null) {
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.reaper : null;
    const vfxSheet = sprites?.vfx;

    // 0. Dark-Matter Void Orbs (`this.darkMagicOrbs`) cast by the Summoned Death-Mage!
    if (this.darkMagicOrbs && this.darkMagicOrbs.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const orb of this.darkMagicOrbs) {
        const ox = Math.round(orb.x);
        const oy = Math.round(orb.y);
        const isEmp = Boolean(orb.isEmpowered);
        const coreR = isEmp ? 10 : 8;

        if (vfxSheet?.complete) {
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

        // Outer plasma corona
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = isEmp ? '#f43f5e' : '#a855f7';
        ctx.beginPath();
        ctx.arc(ox, oy, coreR + 4, 0, Math.PI * 2);
        ctx.fill();

        // Pitch-black Dark-Matter singularity core
        ctx.globalAlpha = 0.98;
        ctx.fillStyle = '#020008';
        ctx.beginPath();
        ctx.arc(ox, oy, coreR, 0, Math.PI * 2);
        ctx.fill();

        // Crisp neon rim + Soul-Covenant emerald spark when empowered by the Soul-Healer!
        ctx.lineWidth = 2;
        ctx.strokeStyle = isEmp ? '#fda4af' : '#f0abfc';
        ctx.beginPath();
        ctx.arc(ox, oy, coreR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox - 3, oy - 4, 3, 2);
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

    if (!vfxSheet?.complete) return;

    // 1. Orbiting Harvested Soul Fragments (`this.soulStacks`: 0..5) around Malakor's Ferryman Lantern!
    if (!this.isDead && !this.isSubmerged && !this.isFullyBurrowed && this.soulStacks > 0) {
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
          28,
          28,
          0.72,
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
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          1,
          col,
          wx,
          wy,
          56,
          56,
          fade * 0.78,
          tx < w.startX,
          renderer,
          w.glowColor || 'violet'
        );
      }
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

    const hasLivingCovenant =
      !this.isDead &&
      this.deathCompanions &&
      this.deathCompanions.some((c) => c && !c.isDead && c.life > 0);

    if (!isReflection) {
      // 1. Pitch-Black Underground Shadow Burrow Pool & Surprise Attack Lock-On Indicator
      this.drawBurrowShadowIndicator(ctx, renderer);
      // 2. Summoned 12.5s Super-Ultimate Living Death Companions (`Death-Mage` & `Soul-Healer`)
      this.drawDeathCompanions(ctx, sprites, renderer);
    }

    // 3. Malakor Character Sprite (100% hidden underground during `this.isFullyBurrowed`!)
    if (!this.isFullyBurrowed) {
      const isBurrowPlunging = !isReflection && this.state === 'CROUCH' && this.isSubmerged;

      // Abyssal Grave-Ward (`this.graveWardTimer > 0`) & Death Covenant Ward (`15%` DR) Aegis Aura!
      if (!isReflection && !this.isDead && (this.graveWardTimer > 0 || hasLivingCovenant)) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const wardAlpha =
          this.graveWardTimer > 0 ? Math.min(0.84, 0.35 + this.graveWardTimer * 0.32) : 0.62;
        ctx.globalAlpha = wardAlpha * 0.65;
        ctx.lineWidth = 2;
        ctx.strokeStyle = hasLivingCovenant ? '#34d399' : '#c084fc';
        ctx.beginPath();
        ctx.ellipse(
          Math.round(this.x),
          Math.round(this.groundY + 2),
          52,
          12,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();

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
      // Full 204px plunge into the pitch-black shadow abyss (zero accidental half-body sticking out!)
      const sinkOffset = isBurrowPlunging
        ? Math.round(Math.min(1, Math.max(0, this.submergeDepth || 0)) * 204)
        : 0;

      if (isBurrowPlunging && sinkOffset > 2) {
        ctx.beginPath();
        ctx.rect(this.x - 180, this.groundY - 260, 360, 262);
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

    if (!isReflection && sprites.vfx?.complete) {
      const vfxSheet = sprites.vfx;

      // Phase 2 (`1.25s .. 3.30s`): Six-Scythe Death-Clock Execution Seal (`Row 6`, 356x356)
      if (this.state === 'TRUE_ULTIMATE' && this.stateTimer >= 1.25 && this.stateTimer <= 3.30) {
        const bindX =
          this._trueUltEnemy && !this._trueUltEnemy.isDead
            ? this._trueUltEnemy.x
            : this._trueUltAltarX;
        const bindY = this.groundY - 108;
        const bindCol = Math.min(29, Math.floor(((this.stateTimer - 1.25) * 24) % 30));
        const bindFade =
          this.stateTimer > 3.12 ? Math.max(0, 1 - (this.stateTimer - 3.12) / 0.18) : 0.97;
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          6,
          bindCol,
          bindX,
          bindY,
          356,
          356,
          bindFade,
          false,
          renderer,
          'crimson'
        );

        // Sovereign Sky-Ascent (`2.36s .. 3.15s`): Converging Execution Crosshair & Guillotine Plumb-Line!
        if (this.stateTimer >= 2.36 && this.stateTimer < 3.15) {
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

          // 4 Converging Execution Corner Brackets around the condemned target
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

      // Phase 3 (`this._trueUltSlashFlash > 0`): Full-Horizon 920px Reality-Split Streak + `548x428` Cross-Guillotine!
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
