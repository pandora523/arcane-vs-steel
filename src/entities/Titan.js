import { Fighter } from './Fighter.js?v=30fps87';
import { PixelForge } from '../engine/PixelForge.js?v=30fps87';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps87';
import {
  FORGE_EFFECT_REGISTRY,
  FORGE_GOLD_PALETTE,
  FORGE_JADE_PALETTE
} from '../engine/shaders/forgeShaders.js?v=30fps87';

/**
 * Torgar v7 (`titan`) — Sovereign of the World-Forge & Runic Anvil Juggernaut.
 *
 * Full v7 Kit Architecture:
 *   - Passive (`MOLTEN CRUCIBLE & MAGMA BULWARK`):
 *       Builds `0..5` orbiting Khazad Molten Crucible Cores (`this.crucibleStacks`, starts at `2`)
 *       when landing heavy Forge blows or absorbing hits during Magma Bulwark (`forgeArmorTimer > 0`,
 *       `44%` DR + Molten Thorn reflect). At `5` stacks (`MAX TEMPER`), Torgar's next Stage-3
 *       Finisher or `WORLD-ANVIL CATACLYSM` triggers **WORLD-BREAKER TEMPER** (restores HP, refreshes
 *       Magma Bulwark, and erupts a bonus `Row 2` Magma-Jade Volcanic Obelisk).
 *   - 3-Animation Dynamic Auto-Attack (`TRINITY OF THE WORLD-MAUL`, `Row 2 F00..F29` — 3 Distinct Model Techniques):
 *       1. Animation 1 (`comboStep === 0`, `F00..F09` — `OVERHEAD EARTH-SPLITTER SLAM`): Tall vertical
 *          2H overhead hoist into a deep split-knee floor smash + traveling `Row 0` Magnetic Fissure Wave!
 *       2. Animation 2 (`comboStep === 1`, `F10..F19` — `LEAPING SKY-BREAKER UPPERCUT`): Deep crouch floor
 *          scoop into an airborne high-knee rising uppercut + grounded `Row 2` Magma-Jade Pillar (`+1` Core).
 *       3. Animation 3 (`comboStep === 2`, `F20..F29` — `BATTERING-RAM BACKSPIN FINISHER`): Pivoting
 *          lead-leg swap & twisted torso coil into a wide split-lunge horizontal punch +
 *          `khazadForgeAncestorAvatar` Crit Finisher + World-Breaker Temper + Seismic Altar Resonance!
 *   - Signature Skill (`WORLD-ANVIL CATACLYSM`):
 *       Plants a persistent **World-Forge Anvil Altar** (`Row 3` 8-Cog Mandala + `Row 1` Horned Iron Anvil,
 *       `3.8s`) with a Magnetic Gravity Slam, then batters a blazing **Ricocheting Anvil Cannonball**
 *       across the arena that rebounds ONCE off the stage wall (`★ ANVIL WALL-RICOCHET! ★`)!
 *   - Overdrive (`WORLD-BREAKER HOME RUN`, `1.46s`):
 *       Steps into the Batter's Box cocking his symmetric 2H Mjolnir behind his rear shoulder (`Row 4 F00..F05`),
 *       and rips a chest-high horizontal Baseball-Bat Home-Run Swing (`Row 4 F06..F14`) that launches the enemy
 *       in a line-drive comet to the **farthest side of the stage**, crashing and **stunning for `0.8s`**!
 *   - Supreme Ultimate (`GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER`, `3.80s`):
 *       Grows **HUGE (`2.15x`)**, **hammers all active enemies high UP into the sky** (`groundY - 210px`) with a
 *       grounded rising Mjolnir uppercut, **fast-jumps explosively (`Super-Leap`)** continuously to the top of the sky
 *       (`groundY - 380..390px`) cleanly above the airborne foe hoisting Mjolnir overhead (`Row 4 F20..F23`), and
 *       **meteor-spikes them straight into the ground** for ONE `735`-Crit Continental Sunder + Soil & Shattered Bedrock Crater Splash + **`1.85s` Stun**!
 */
export class Titan extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Torgar',
      maxHp: 4160,
      moveSpeed: 188,
      attackRange: 205,
      autoInterval: 0.99,
      lightColor: 'rgba(245, 158, 11, 1)',
      primaryColor: '#f59e0b'
    });
    this.heroId = 'titan';
    this.deathSfx = 'death_titan';
    this.skillName = 'WORLD-ANVIL CATACLYSM';
    this.ultName = 'WORLD-BREAKER HOME RUN';
    this.hasTrueUltimate = true;
    this.trueUltName = 'GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER';
    this.trueUltDuration = 3.80;
    this._trueUltStep = 0;
    this._trueUltDir = 1;
    this._trueUltMidAirClanged = false;
    this._trueUltAnvilX = 600;
    this._trueUltGeyserTimer = 0;
    this._trueUltBoundFoes = [];
    this._trueUltAirSparkAccum = 0;
    this._superJumpTrail = [];
    this.cameraAirLift = 0;
    this.theme = 'forge';
    this.hasPoise = true;
    this.unstoppablePoise = false;
    this.skillTriggerRange = 465;
    this.skillMaxCooldown = 5.35;
    this.dashMaxCooldown = 2.95;
    this.autoDuration = 0.76;
    this.skillDuration = 0.94;
    this.ultDuration = 1.46;
    this.crouchDuration = 0.80;
    this.dashDuration = 0.42;
    this.comboStep = 0;
    this._activeComboStage = 0;
    this.stepDustTimer = 0;

    // Torgar v7 Sovereign Mechanics:
    // 1. Orbiting Molten Crucible Cores (`0..5`) + Bulwark reactive ICD
    this.crucibleStacks = 2;
    this.maxCrucibleStacks = 5;
    this._crucibleGainIcd = 0;
    this._crucibleOrbitPhase = 0;

    // 2. Magma Bulwark Fortify timer (`44%` DR + super-armor + molten thorn reflect in Fighter.js)
    this.forgeArmorTimer = 0;

    // 3. Persistent World-Forge Anvil Altar (`Row 3` Mandala + `Row 1` Horned Anvil construct)
    this.worldAnvilAltar = null;

    // 4. Ricocheting Anvil Cannonball (`Row 1` Horned Anvil projectile with 1 wall rebound)
    this.activeAnvil = null;

    // 5. Traveling Tectonic Magma-Jade Fissure Waves (`Row 0`, Variant-1 Auto magnetic pull wave)
    this.fissureWaves = [];

    // 6. Khazad Forge-God Ancestor Spirit manifestation timer
    this.ancestorSpiritTimer = 0;

    // 7. Giant Titan Scale during Continental Sunder
    this.giantScale = 1.0;

    // 8. Active 30fps `titan_vfx.png` cell animations & 2.5D Soil/Bedrock Splash debris
    this.activeVfxAnims = [];
    this._soilRockChunks = [];
    this._soilDustPlumes = [];

    // 9. World-Breaker Home-Run Overdrive flight & impact streak state
    this._homeRunFlights = [];
    this._homeRunTargetWallX = 1118;
    this._homeRunDir = 1;
    this._homeRunSwingStreak = null;

    // Native 120Hz dual-buffer HD-2D World-Forge shader & particle runtime (`back` + `front` 2.5D layers)
    this.fx = new ArcaneShaderFX(FORGE_EFFECT_REGISTRY, {
      pixelScale: 3,
      viewW: 440,
      viewH: 220
    });
    this._mantleSlot = null;
    this._ultCastTriggered = false;

    if (typeof Image !== 'undefined') {
      const titanAssets = PixelForge.initAssets()?.titan;
      if (titanAssets?.sheet?.src && !titanAssets.sheet.src.includes('v=30fps87')) {
        titanAssets.sheet.src = 'assets/sprites/titan_sheet.png?v=30fps87';
      }
      if (titanAssets?.vfx?.src && !titanAssets.vfx.src.includes('v=30fps87')) {
        titanAssets.vfx.src = 'assets/sprites/titan_vfx.png?v=30fps87';
      }
    }
  }

  getActiveEnemies(enemy, game) {
    const raw = game?.getEnemiesOf ? game.getEnemiesOf(this) : enemy ? [enemy] : [];
    return raw.filter((t) => t && !t.isDead && !t.isBenched);
  }

  gainCrucibleCore(amount = 1, game = null) {
    const prev = this.crucibleStacks;
    this.crucibleStacks = Math.max(0, Math.min(this.maxCrucibleStacks, this.crucibleStacks + amount));
    if (prev < this.maxCrucibleStacks && this.crucibleStacks >= this.maxCrucibleStacks) {
      if (this.fx) {
        this.fx.spawn('moltenAnvilSparks', this.x, this.y - 84, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.35
        });
      }
      const g = game || this.game;
      g?.vfx?.spawnDamageText?.(
        this.x,
        this.y - 166,
        0,
        false,
        '★ CRUCIBLE MAX TEMPER! ★',
        '#10b981'
      );
    }
  }

  triggerWorldBreakerTemper(targetX, enemy, game) {
    if (this.crucibleStacks < this.maxCrucibleStacks) return false;
    this.crucibleStacks = 0;
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.55);
    this.heal(28, 'WORLD-BREAKER TEMPER');

    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const obeliskX = Math.max(75, Math.min(ww - 75, targetX));
    this.fx?.spawn('tectonicCraterSlam', obeliskX, this.groundY - 4, {
      flip: this.facing < 0,
      palette: FORGE_JADE_PALETTE,
      light: 1.38,
      extra: { maxRx: 132 }
    });
    this.spawnSheetBurst(2, obeliskX, this.groundY - 84, {
      w: 232,
      h: 232,
      maxLife: 0.56,
      flipX: this.facing < 0,
      glowColor: 'emerald',
      inFront: false
    });
    game?.vfx?.spawnDamageText?.(
      this.x,
      this.y - 172,
      0,
      true,
      '★ WORLD-BREAKER TEMPER! ★',
      '#34d399'
    );

    for (const t of this.getActiveEnemies(enemy, game)) {
      if (Math.abs(t.x - obeliskX) <= 150) {
        t.takeDamage(24, this, true, 110 * this.facing, -185);
      }
    }
    return true;
  }

  manifestAncestorAvatar(duration = 0.72, light = 1.42) {
    this.ancestorSpiritTimer = Math.max(this.ancestorSpiritTimer, duration);
    if (!this.fx) return;
    this.fx.spawn('khazadForgeAncestorAvatar', this.x - this.facing * 22, this.y - 102, {
      follow: this,
      offsetX: -this.facing * 22,
      offsetY: -102,
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light,
      maxDuration: duration
    });
  }

  triggerAnvilResonance(enemy, game, dmgBase = 36) {
    const altar = this.worldAnvilAltar;
    if (!altar || altar.life <= 0 || altar.resonanceCd > 0) return false;
    altar.resonanceCd = 0.65;

    const ax = altar.x;
    game?.audio?.play?.('clang', ax);
    game?.renderer?.triggerShake?.(9, 0.18);

    this.fx?.spawn('tectonicCraterSlam', ax, this.groundY - 4, {
      flip: this.facing < 0,
      palette: FORGE_JADE_PALETTE,
      light: 1.36,
      extra: { maxRx: 142 }
    });
    this.fx?.spawn('moltenAnvilSparks', ax, this.groundY - 64, {
      flip: this.facing < 0,
      palette: FORGE_JADE_PALETTE,
      light: 1.32
    });
    this.spawnSheetBurst(4, ax, this.groundY - 66, {
      w: 228,
      h: 228,
      maxLife: 0.42,
      flipX: this.facing < 0,
      glowColor: 'emerald',
      inFront: true
    });
    this.spawnSheetBurst(2, ax, this.groundY - 82, {
      w: 216,
      h: 216,
      maxLife: 0.48,
      flipX: this.facing < 0,
      glowColor: 'gold',
      inFront: false
    });

    game?.vfx?.spawnDamageText?.(
      ax,
      this.groundY - 142,
      0,
      true,
      '✦ ANVIL RESONANCE! ✦',
      '#34d399'
    );

    let hitAny = false;
    for (const t of this.getActiveEnemies(enemy, game)) {
      if (Math.abs(t.x - ax) <= 188) {
        const pullDir = ax >= t.x ? 1 : -1;
        t.takeDamage(dmgBase, this, true, pullDir * 105, -175);
        hitAny = true;
      }
    }
    return hitAny;
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 0, knockY = 0) {
    const prevHp = this.hp;
    super.takeDamage(amount, attacker, isCrit, knockX, knockY);
    if (
      !this.isDead &&
      prevHp > this.hp &&
      (this.forgeArmorTimer > 0 || this.isDeflecting) &&
      this._crucibleGainIcd <= 0
    ) {
      this._crucibleGainIcd = 0.85;
      this.gainCrucibleCore(1, this.game);
      this.gainMana(1.0);
    }
  }

  setState(newState) {
    if (this.state === 'TRUE_ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.cameraAirLift = 0;
      this.isFlipVault = false;
      this._superJumpTrail = [];
      if (Array.isArray(this._trueUltBoundFoes)) {
        for (const f of this._trueUltBoundFoes) {
          if (f) {
            f.isRooted = false;
            if (!f.isDead && f.y < f.groundY) f.y = f.groundY;
          }
        }
        this._trueUltBoundFoes = [];
      }
    }
    if (newState === 'AUTO_ATTACK') {
      this._activeComboStage = this.comboStep % 3;
    }
    super.setState(newState);
    if (newState === 'ULTIMATE') {
      this._ultCastTriggered = false;
      this._ultWaveStep = 0;
      this._homeRunFlights = [];
      this._homeRunSwingStreak = null;
    }
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.giantScale = 1.0;
      this.cameraAirLift = 0;
      this.isInvulnerable = false;
      this._ultCastTriggered = false;
      this._ultWaveStep = 0;
    }
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE' && newState !== 'AUTO_ATTACK') {
      this.trueUltFrameOverride = null;
    }
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltMidAirClanged = false;
      this._trueUltGeyserTimer = 0;
      this._trueUltAirSparkAccum = 0;
      this._trueUltBoundFoes = [];
      this._superJumpTrail = [];
      this.isInvulnerable = true;
    }
    this.unstoppablePoise =
      newState === 'AUTO_ATTACK' ||
      newState === 'SKILL' ||
      newState === 'CROUCH' ||
      newState === 'ULTIMATE' ||
      newState === 'TRUE_ULTIMATE';
  }

  getEffectiveAttackRange() {
    const step = this.comboStep % 3;
    if (step === 0) return 245;
    if (step === 2) return 238;
    return 214;
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
      glowColor: opts.glowColor || 'gold',
      followOwner: Boolean(opts.followOwner),
      offsetX: opts.offsetX || 0,
      offsetY: opts.offsetY || 0,
      inFront: Boolean(opts.inFront)
    });
  }

  spawnSheetBurst(row, x, y, opts = {}) {
    this.spawnVfxAnim(
      row,
      x,
      y,
      opts.w || 208,
      opts.h || 208,
      opts.maxLife || 0.42,
      opts
    );
  }

  spawnFissureWave(startX, dir) {
    this.fissureWaves.push({
      x: startX,
      y: this.groundY,
      startX,
      dir,
      vx: dir * 560,
      maxDist: 390,
      age: 0,
      maxLife: 0.72,
      hitTargets: new Set()
    });
  }

  ensureForgeMagmaMantle() {
    if (!this.fx) return;
    const shouldShowMantle =
      !this.isDead &&
      !this.isFlipVault &&
      this.state !== 'DEATH' &&
      (this.forgeArmorTimer > 0 || this.state === 'ULTIMATE' || this.state === 'TRUE_ULTIMATE');
    if (!shouldShowMantle) {
      this.fx.stopByKey('forgeMagmaMantle');
      this._mantleSlot = null;
      return;
    }
    const isFortified = this.forgeArmorTimer > 0 || this.crucibleStacks >= this.maxCrucibleStacks;
    let slot = this.fx.active.find((s) => s.key === 'forgeMagmaMantle');
    if (!slot) {
      slot = this.fx.spawn('forgeMagmaMantle', this.x, this.y - 78, {
        follow: this,
        offsetX: 0,
        offsetY: -78,
        flip: false,
        palette: FORGE_GOLD_PALETTE,
        light: 1.18,
        extra: { fortified: isFortified }
      });
    } else if (slot.inst?.cfg) {
      slot.inst.cfg.fortified = isFortified;
    }
    this._mantleSlot = slot;
  }

  update(dt, enemy, game) {
    if (this.forgeArmorTimer > 0) {
      this.forgeArmorTimer = Math.max(0, this.forgeArmorTimer - dt);
    }
    if (this._crucibleGainIcd > 0) {
      this._crucibleGainIcd = Math.max(0, this._crucibleGainIcd - dt);
    }
    if (this.ancestorSpiritTimer > 0) {
      this.ancestorSpiritTimer = Math.max(0, this.ancestorSpiritTimer - dt);
    }
    if (this._homeRunSwingStreak) {
      this._homeRunSwingStreak.age += dt;
      if (this._homeRunSwingStreak.age >= this._homeRunSwingStreak.maxLife) {
        this._homeRunSwingStreak = null;
      }
    }
    this._crucibleOrbitPhase += dt * (this.crucibleStacks >= this.maxCrucibleStacks ? 4.4 : 2.8);

    if (this.isDead) {
      this.worldAnvilAltar = null;
      this.activeAnvil = null;
      this.fissureWaves.length = 0;
      this._homeRunFlights.length = 0;
      this._homeRunSwingStreak = null;
      this._soilRockChunks.length = 0;
      this._soilDustPlumes.length = 0;
    }

    // 1. Step Active 30fps `titan_vfx.png` Cell Animations
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

    // 1B. Step Ballistic 2.5D Soil & Shattered Bedrock Chunks + Rolling Ground Dust Plumes
    for (let i = this._soilRockChunks.length - 1; i >= 0; i--) {
      const c = this._soilRockChunks[i];
      c.age += dt;
      c.x += c.vx * dt;
      c.vy += c.grav * dt;
      c.y += c.vy * dt;
      if (c.y >= this.groundY - 2) {
        c.y = this.groundY - 2;
        if (c.bounces < 1 && Math.abs(c.vy) > 90) {
          c.bounces += 1;
          c.vy = -Math.abs(c.vy) * 0.30;
          c.vx *= 0.58;
        } else {
          c.vy = 0;
          c.vx *= Math.pow(0.02, dt);
        }
      }
      if (c.age >= c.maxLife) {
        this._soilRockChunks.splice(i, 1);
      }
    }
    for (let i = this._soilDustPlumes.length - 1; i >= 0; i--) {
      const p = this._soilDustPlumes[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.vx *= Math.pow(0.18, dt);
      p.y += p.vy * dt;
      if (p.age >= p.maxLife) {
        this._soilDustPlumes.splice(i, 1);
      }
    }

    // 2. Step Traveling Tectonic Magma-Jade Fissure Waves (`Row 0`, Magnetic Pull Wave)
    if (this.fissureWaves.length > 0 && game) {
      const ww = game.renderer ? game.renderer.worldWidth : 1200;
      const targets = this.getActiveEnemies(enemy, game);
      for (let i = this.fissureWaves.length - 1; i >= 0; i--) {
        const wv = this.fissureWaves[i];
        wv.age += dt;
        wv.x += wv.vx * dt;

        for (const t of targets) {
          if (!wv.hitTargets.has(t) && Math.abs(t.x - wv.x) < 62 && Math.abs(t.y - wv.y) < 96) {
            wv.hitTargets.add(t);
            // Pull kiting enemy inward toward Torgar!
            const pullSign = this.x >= t.x ? 1 : -1;
            t.x = Math.max(65, Math.min(ww - 65, t.x + pullSign * 38));
            t.takeDamage(24, this, false, pullSign * 85, -88);
            this.gainMana(1.0);
            game.vfx?.spawnDamageText?.(t.x, t.y - 146, 0, false, 'MAGNETIC FISSURE!', '#34d399');
            this.fx?.spawn('moltenAnvilSparks', t.x, this.groundY - 36, {
              flip: wv.dir < 0,
              palette: FORGE_JADE_PALETTE,
              light: 1.22
            });
          }
        }

        // Passing through a planted World-Anvil Altar rings a mini-resonance!
        if (
          this.worldAnvilAltar &&
          this.worldAnvilAltar.resonanceCd <= 0 &&
          Math.abs(wv.x - this.worldAnvilAltar.x) < 42
        ) {
          this.triggerAnvilResonance(enemy, game, 28);
        }

        if (
          wv.age >= wv.maxLife ||
          Math.abs(wv.x - wv.startX) >= wv.maxDist ||
          wv.x < 45 ||
          wv.x > ww - 45
        ) {
          this.fissureWaves.splice(i, 1);
        }
      }
    }

    // 3. Step Persistent World-Forge Anvil Altar (`this.worldAnvilAltar`, `3.8s`)
    if (this.worldAnvilAltar && game) {
      const altar = this.worldAnvilAltar;
      altar.age += dt;
      altar.life -= dt;
      if (altar.resonanceCd > 0) altar.resonanceCd = Math.max(0, altar.resonanceCd - dt);
      if (altar.dashBoostCd > 0) altar.dashBoostCd = Math.max(0, altar.dashBoostCd - dt);

      altar.pulseTimer -= dt;
      if (altar.pulseTimer <= 0 && altar.life > 0.25) {
        altar.pulseTimer = 1.35;
        const ww = game.renderer ? game.renderer.worldWidth : 1200;
        this.fx?.spawn('tectonicCraterSlam', altar.x, this.groundY - 4, {
          flip: altar.dir < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.18,
          extra: { maxRx: 108 }
        });
        const advBounds =
          game.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
            ? game.adventure.getActiveStageBounds()
            : null;
        const pMin = advBounds ? advBounds.minX + 24 : 65;
        const pMax = advBounds ? advBounds.maxX - 24 : ww - 65;
        for (const t of this.getActiveEnemies(enemy, game)) {
          if (Math.abs(t.x - altar.x) <= 185) {
            const pullSign = altar.x >= t.x ? 1 : -1;
            if (!t.isColossalBoss) {
              t.x = Math.max(pMin, Math.min(pMax, t.x + pullSign * 28));
            }
            t.takeDamage(10, this, false, pullSign * 45, -40);
          }
        }
      }

      if (altar.life <= 0) {
        this.worldAnvilAltar = null;
      }
    }

    // 4. Step Ricocheting Anvil Cannonball (`this.activeAnvil`)
    if (this.activeAnvil && game) {
      const a = this.activeAnvil;
      a.age += dt;
      if (a.state === 'flying') {
        a.x += a.vx * dt;
        a.trailAccum = (a.trailAccum || 0) + dt;
        if (a.trailAccum >= 0.085) {
          a.trailAccum = 0;
          this.fx?.burst(a.x - a.dir * 20, a.y - 42, {
            count: 1,
            speedMin: 35,
            speedMax: 90,
            lifeMin: 0.12,
            lifeMax: 0.22,
            gravity: 45,
            angle: a.dir >= 0 ? Math.PI : 0,
            spread: 0.65,
            colors: ['#ffffff', '#fde047', '#f59e0b', '#10b981']
          });
        }

        const ww = game.renderer ? game.renderer.worldWidth : 1200;
        const advBounds =
          game.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
            ? game.adventure.getActiveStageBounds()
            : null;
        const wallMin = advBounds ? advBounds.minX + 18 : 64;
        const wallMax = advBounds ? advBounds.maxX - 18 : ww - 64;
        const targets = this.getActiveEnemies(enemy, game);
        for (const t of targets) {
          if (
            !a.hitTargets.has(t) &&
            Math.abs(t.x - a.x) < (t.isColossalBoss ? 125 : 66) &&
            (t.isColossalBoss || Math.abs(t.y - a.y) < 110)
          ) {
            a.hitTargets.add(t);
            const hitDmg = a.rebounded ? 54 : 82;
            t.takeDamage(hitDmg, this, true, a.dir * 265, -155);
            this.gainCrucibleCore(1, game);
            if (game.audio) game.audio.play('thunder_slam', t.x);
            game.renderer?.triggerShake?.(11, 0.22);
            game.renderer?.triggerHitStop?.(0.045);

            this.fx?.spawn('tectonicCraterSlam', t.x, this.groundY - 6, {
              flip: a.dir < 0,
              palette: a.rebounded ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
              light: 1.28,
              extra: { maxRx: 124 }
            });
            this.spawnSheetBurst(4, t.x, t.y - 68, {
              w: 196,
              h: 196,
              maxLife: 0.34,
              flipX: a.dir < 0,
              glowColor: a.rebounded ? 'emerald' : 'gold',
              inFront: true
            });

            if (t.isColossalBoss || t.x <= wallMin + 121 || t.x >= wallMax - 121) {
              t.takeDamage(34, this, true, -a.dir * 135, -205);
              game.vfx?.spawnDamageText?.(
                t.x,
                t.y - 165,
                0,
                true,
                '★ ANVIL WALL-CRUSH! ★',
                '#fef08a'
              );
              this.fx?.spawn('moltenAnvilSparks', t.x, t.y - 54, {
                flip: a.dir < 0,
                palette: FORGE_JADE_PALETTE,
                light: 1.38
              });
            }
          }
        }

        // Wall-Ricochet Rebound Check (`bouncesLeft > 0`)!
        if ((a.x <= wallMin || a.x >= wallMax) && a.bouncesLeft > 0) {
          a.bouncesLeft -= 1;
          a.rebounded = true;
          a.x = Math.max(wallMin + 2, Math.min(wallMax - 2, a.x));
          a.dir = -a.dir;
          a.vx = a.dir * 820;
          a.hitTargets.clear();

          game.audio?.play?.('clang', a.x);
          game.renderer?.triggerShake?.(9, 0.16);
          game.vfx?.spawnDamageText?.(
            a.x,
            this.groundY - 128,
            0,
            true,
            '★ ANVIL WALL-RICOCHET! ★',
            '#34d399'
          );
          this.fx?.spawn('moltenAnvilSparks', a.x, a.y - 44, {
            flip: a.dir < 0,
            palette: FORGE_JADE_PALETTE,
            light: 1.36
          });
        } else if (a.x < wallMin - 28 || a.x > wallMax + 28 || a.age > 2.35) {
          this.fx?.spawn('moltenAnvilSparks', a.x, a.y - 38, {
            flip: a.dir < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.22
          });
          this.activeAnvil = null;
        }
      }
    }

    // 5. Maintain 2.5D Orbiting Forge Magma Mantle & Step 120Hz `ArcaneShaderFX`
    this.ensureForgeMagmaMantle();
    if (this.fx) {
      this.fx.update(dt);
    }

    if (!this.isDead && this.state === 'WALK') {
      this.stepDustTimer += dt;
      if (this.stepDustTimer >= 0.36) {
        this.stepDustTimer = 0;
        if (game?.audio) game.audio.play('footstep_steel', this.x);
      }
    }

    super.update(dt, enemy, game);
  }

  startDodge(enemy, game) {
    this.dodgeCooldown = this.dodgeMaxCooldown * (0.86 + Math.random() * 0.28);
    const dist = enemy && !enemy.isDead ? Math.abs(enemy.x - this.x) : 999;
    if (dist < 230 || Math.random() < 0.65) {
      this.startCrouch(enemy, game);
    } else {
      this.startJump(enemy, game);
    }
  }

  startCrouch(_enemy, game) {
    this.crouchDuration = 0.80;
    this.setState('CROUCH');
    this.isCrouching = true;
    this.isDeflecting = true;
    this.forgeArmorTimer = 1.15;
    this.gainCrucibleCore(1, game);
    this.heal(14, 'FORGE TEMPER');
    this.vx = 0;
    const frontX = this.x + this.facing * 118;

    this.fx?.spawn('runicBulwarkDome', this.x, this.y - 78, {
      follow: this,
      offsetX: 0,
      offsetY: -78,
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.22
    });
    this.spawnSheetBurst(3, this.x, this.groundY - 46, {
      w: 204,
      h: 204,
      maxLife: 0.48,
      followOwner: true,
      offsetX: 0,
      offsetY: -46,
      flipX: this.facing < 0,
      glowColor: 'emerald',
      inFront: false
    });

    if (game?.audio) game.audio.play('clang', frontX);
    game?.vfx?.spawnDamageText?.(
      this.x,
      this.y - 148,
      0,
      false,
      'MAGMA BULWARK!',
      '#fbbf24'
    );
  }

  updateCrouch(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.crouchDuration || 0.80;
    this.vx *= Math.pow(0.001, dt);
    this.isDeflecting = t < 0.64;

    // Deflect incoming enemy projectiles with molten anvil clang
    if (this.isDeflecting && game?.vfx) {
      for (const proj of game.vfx.projectiles) {
        if (
          proj.owner !== this &&
          (!this.team || !proj.owner?.team || proj.owner.team !== this.team) &&
          Math.abs(proj.x - (this.x + this.facing * 60)) < 118
        ) {
          proj.owner = this;
          proj.vx = -proj.vx * 1.28;
          proj.vy = -Math.abs(proj.vy) * 0.4;
          proj.color = '#f59e0b';
          this.gainMana(8);
          this.gainCrucibleCore(1, game);
          if (game.audio) game.audio.play('clang', proj.x);
          game.vfx.spawnDamageText(this.x, this.y - 156, 0, false, 'ANVIL DEFLECT!', '#fef08a');
          this.spawnSheetBurst(4, proj.x, proj.y, {
            w: 192,
            h: 192,
            maxLife: 0.30,
            flipX: this.facing < 0,
            glowColor: 'gold',
            inFront: true
          });
        }
      }
    }

    // At t = 0.35s: Erupt a Molten Magma Hammer-Slam Nova IN FRONT of Torgar + Anvil Resonance
    if (t >= 0.35 && !this.didActionFrame) {
      this.didActionFrame = true;
      const slamX = this.x + this.facing * 124;
      if (game?.audio) game.audio.play('thunder_slam', slamX);
      game?.renderer?.triggerShake?.(8, 0.18);

      this.fx?.spawn('tectonicCraterSlam', slamX, this.groundY - 6, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.24,
        extra: { maxRx: 116 }
      });
      this.spawnSheetBurst(4, slamX, this.groundY - 68, {
        w: 220,
        h: 220,
        maxLife: 0.38,
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });

      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - slamX) <= 185) {
          foe.takeDamage(34, this, false, this.facing * 215, -155);
          game?.vfx?.spawnDamageText?.(foe.x, foe.y - 150, 0, false, 'MOLTEN NOVA!', '#fbbf24');
        }
      }
      this.triggerAnvilResonance(enemy, game, 30);
    }

    if (t >= dur) {
      this.isDeflecting = false;
      this.isCrouching = false;
      this.setState('IDLE');
    }
  }

  startJump(enemy, game) {
    this.dashDuration = 0.62;
    this.setState('JUMP');
    this.isInvulnerable = true;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    let dir = this.facing;
    if (enemy && !enemy.isDead) {
      dir = Math.sign(enemy.x - this.x) || this.facing;
    }
    this.dashDir = dir;
    this.isFlipVault = true;
    this.vaultStartX = this.x;
    const targetDist =
      enemy && !enemy.isDead ? Math.min(220, Math.max(85, Math.abs(enemy.x - this.x) - 110)) : 145;
    this.vaultTargetX = Math.max(85, Math.min(ww - 85, this.x + dir * targetDist));
    this.vx = 0;
    this.vy = 0;

    this.fx?.spawn('moltenAnvilSparks', this.x, this.groundY - 12, {
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.15
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    game?.vfx?.spawnDamageText?.(
      this.x,
      this.y - 144,
      0,
      false,
      'TECTONIC CRUSH LEAP!',
      '#fbbf24'
    );
  }

  onStartDash(_enemy, game, _dir) {
    this.isFlipVault = false;
    this.unstoppablePoise = true;

    this.fx?.spawn('runicBulwarkDome', this.x, this.y - 78, {
      follow: this,
      offsetX: 0,
      offsetY: -78,
      flip: this.facing < 0,
      palette: FORGE_GOLD_PALETTE,
      light: 1.16
    });

    if (game?.audio) game.audio.play('dash_whoosh', this.x);
    game?.vfx?.spawnDamageText?.(
      this.x,
      this.y - 144,
      0,
      false,
      'JUGGERNAUT BULL-RUSH!',
      '#f59e0b'
    );
  }

  updateDashOrDodge(_dt, enemy, game) {
    const t = this.stateTimer;
    const dur = Math.max(0.01, this.dashDuration || 0.44);
    const u = Math.min(1, t / dur);

    if (this.isFlipVault) {
      const easeU = 1 - Math.pow(1 - u, 1.55);
      this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * easeU;
      const jumpHeight = 60;
      this.y = this.groundY - Math.sin(u * Math.PI) * jumpHeight;
      this.vx = 0;
      this.vy = 0;

      if (u >= 0.82 && !this.didActionFrame) {
        this.didActionFrame = true;
        this.y = this.groundY;
        const slamX = this.x + this.facing * 124;
        if (game?.audio) game.audio.play('thunder_slam', slamX);
        game?.renderer?.triggerShake?.(10, 0.22);

        this.fx?.spawn('tectonicCraterSlam', slamX, this.groundY - 6, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.28,
          extra: { maxRx: 128 }
        });
        this.spawnSheetBurst(4, slamX, this.groundY - 68, {
          w: 224,
          h: 224,
          maxLife: 0.38,
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });

        for (const foe of this.getActiveEnemies(enemy, game)) {
          if (Math.abs(foe.x - slamX) <= 210 && foe.y >= this.groundY - 75) {
            foe.takeDamage(48, this, true, this.facing * 155, -200);
            game?.vfx?.spawnDamageText?.(foe.x, foe.y - 155, 0, true, 'SEISMIC SLAM!', '#fef08a');
          }
        }
        this.triggerAnvilResonance(enemy, game, 34);
      }

      if (t >= dur) {
        this.y = this.groundY;
        this.isFlipVault = false;
        this.isInvulnerable = false;
        this.setState('IDLE');
      }
      return;
    }

    const rushSpeed = 515 * (1 - u * 0.45);
    this.vx = this.dashDir * rushSpeed;

    // Interactive World-Anvil Synergy: Bull-Rushing through the planted Altar supercharges Torgar!
    if (
      this.worldAnvilAltar &&
      this.worldAnvilAltar.dashBoostCd <= 0 &&
      Math.abs(this.x - this.worldAnvilAltar.x) < 76
    ) {
      this.worldAnvilAltar.dashBoostCd = 2.2;
      this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.65);
      this.gainCrucibleCore(1, game);
      this.triggerAnvilResonance(enemy, game, 32);
      game?.audio?.play?.('clang', this.worldAnvilAltar.x);
      game?.vfx?.spawnDamageText?.(
        this.worldAnvilAltar.x,
        this.groundY - 135,
        0,
        true,
        '✦ CRUCIBLE OVERCHARGE! ✦',
        '#34d399'
      );
    }

    if (!this.didActionFrame) {
      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - this.x) < 116) {
          this.didActionFrame = true;
          foe.takeDamage(38, this, false, this.dashDir * 225, -135);
          if (game?.audio) game.audio.play('heavy_cleave', this.x);
          game?.renderer?.triggerShake?.(7, 0.16);
          game?.vfx?.spawnDamageText?.(foe.x, foe.y - 150, 0, false, 'SHOULDER RAM!', '#fbbf24');
          this.fx?.spawn('moltenAnvilSparks', this.x + this.facing * 52, this.y - 82, {
            flip: this.facing < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.2
          });
          break;
        }
      }
    }

    if (t >= dur) {
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Animation Dynamic Auto-Attack (`TRINITY OF THE WORLD-MAUL`, `Row 2 F00..F29` — 3 Distinct Model Techniques):
   *   - Animation 1 (`stage === 0`, `F00..F09` — `OVERHEAD EARTH-SPLITTER SLAM`): Tall vertical 2H hoist
   *     into a deep split-knee floor smash + traveling `Row 0` Magnetic Fissure Wave (`390px`).
   *   - Animation 2 (`stage === 1`, `F10..F19` — `LEAPING SKY-BREAKER UPPERCUT`): Deep crouch floor scoop
   *     into an airborne high-knee rising uppercut + grounded `Row 2` Magma-Jade Pillar (`+1` Core).
   *   - Animation 3 (`stage === 2`, `F20..F29` — `BATTERING-RAM BACKSPIN FINISHER`): Pivoting lead-leg swap
   *     & twisted coil into a wide split-lunge horizontal punch + `Forge-Aegis` + `khazadForgeAncestorAvatar`
   *     Crit Finisher + World-Breaker Temper (`5` stacks) + Seismic Resonance into `worldAnvilAltar`!
   */
  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.autoDuration || 0.72;
    const dir = this.facing;
    const stage = (this._activeComboStage || 0) % 3;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    // Map each of the 3 normal attack animations to its dedicated 10-frame martial arc on Row 2 (`60 + F00..F29`)
    const u = Math.max(0, Math.min(0.999, t / dur));
    if (stage === 0) {
      // Animation 1: F00..F09 (Overhead Earth-Splitter Vertical Slam)
      this.trueUltFrameOverride = 60 + Math.min(9, Math.floor(u * 10));
    } else if (stage === 1) {
      // Animation 2: F10..F19 (Deep Crouch Scoop -> Leaping High-Knee Sky-Uppercut)
      this.trueUltFrameOverride = 60 + 10 + Math.min(9, Math.floor(u * 10));
    } else {
      // Animation 3: F20..F29 (Pivoting Stance-Swap Coil -> Wide Split-Lunge Battering-Ram Finisher)
      this.trueUltFrameOverride = 60 + 20 + Math.min(9, Math.floor(u * 10));
    }

    // Physical model step-in during windup (`t < 0.28s`) when an enemy is in front within melee-approach range
    const foes = this.getActiveEnemies(enemy, game);
    const frontFoe = foes.find(
      (f) => (f.x - this.x) * dir > 0 && Math.abs(f.x - this.x) <= 268
    );
    if (t < 0.28 && frontFoe) {
      const dist = Math.abs(frontFoe.x - this.x);
      if (dist > 114) {
        const stepSpeed = stage === 2 ? 295 : stage === 1 ? 265 : 240;
        this.x = Math.max(80, Math.min(ww - 80, this.x + dir * stepSpeed * dt));
      }
    }

    // Stage 3 Windup (`t >= 0.06s`): Manifest the towering Khazad Forge-Ancestor behind Torgar as he coils!
    if (stage === 2 && t >= 0.06 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.manifestAncestorAvatar(0.68, 1.44);
    }

    // Decisive Heavy Maul Impact (`t >= 0.28s` — synced to F05, F14, and F24 impact frames!)
    const strikeTime = stage === 2 ? 0.30 : 0.28;
    if (t >= strikeTime && !this.didActionFrame) {
      this.didActionFrame = true;
      const isFinisher = stage === 2;
      this.comboStep = (stage + 1) % 3;
      this.vx = dir * (isFinisher ? 182 : stage === 1 ? 152 : 124);
      this.armVel = 36;

      const impactX = this.x + dir * 124;
      const impactY = this.groundY - 6;

      if (game?.audio) {
        game.audio.play(isFinisher ? 'thunder_slam' : 'heavy_cleave', impactX);
        if (stage === 0 || isFinisher) game.audio.play('thunder_slam', impactX);
      }
      game?.renderer?.triggerShake?.(isFinisher ? 12 : stage === 1 ? 9 : 8, 0.19);

      if (stage === 0) {
        // Animation 1 Overhead Earth-Splitter: Crater slam + traveling `Row 0` Magnetic Fissure Wave!
        this.fx?.spawn('tectonicCraterSlam', impactX, this.groundY - 4, {
          flip: dir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.32,
          extra: { maxRx: 126 }
        });
        this.spawnFissureWave(this.x + dir * 96, dir);
      } else if (stage === 1) {
        // Animation 2 Leaping Sky-Breaker Uppercut: Erupt grounded `Row 2` Magma-Jade Rune Pillar!
        const pillarX =
          frontFoe && Math.abs(frontFoe.x - this.x) <= 245 ? frontFoe.x : impactX;
        this.spawnSheetBurst(2, pillarX, this.groundY - 82, {
          w: 196,
          h: 196,
          maxLife: 0.42,
          flipX: dir < 0,
          glowColor: 'emerald',
          inFront: false
        });
      } else {
        // Animation 3 Battering-Ram Finisher: Molten sparks + `Row 4` Shock-Ring Nova + Crater Slam!
        this.fx?.spawn('moltenAnvilSparks', impactX, impactY - 48, {
          flip: dir < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.34
        });
        this.fx?.spawn('tectonicCraterSlam', impactX, this.groundY - 4, {
          flip: dir < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.38,
          extra: { maxRx: 145 }
        });
        this.spawnSheetBurst(4, impactX, impactY - 62, {
          w: 206,
          h: 206,
          maxLife: 0.34,
          flipX: dir < 0,
          glowColor: 'emerald',
          inFront: true
        });
      }

      let landed = false;
      for (const foe of foes) {
        if (Math.abs(foe.x - this.x) <= (isFinisher ? 246 : 236)) {
          const isCrit = isFinisher || Math.random() < 0.22;
          const base = isFinisher ? 60 : stage === 1 ? 53 : 48;
          const dmg = base * (isCrit ? 1.30 : 1);
          foe.takeDamage(
            dmg,
            this,
            isCrit,
            dir * (isFinisher ? 205 : stage === 1 ? 115 : 135),
            stage === 1 ? -205 : isFinisher ? -175 : -145
          );
          if (isFinisher) {
            game?.vfx?.spawnDamageText?.(
              foe.x,
              foe.y - 164,
              0,
              true,
              '★ BATTERING-RAM SLAM! ★',
              '#10b981'
            );
          } else if (stage === 1) {
            game?.vfx?.spawnDamageText?.(
              foe.x,
              foe.y - 156,
              0,
              false,
              'SKY-BREAKER UPPERCUT!',
              '#fbbf24'
            );
          } else {
            game?.vfx?.spawnDamageText?.(
              foe.x,
              foe.y - 152,
              0,
              false,
              'EARTH-SPLITTER!',
              '#f59e0b'
            );
          }
          landed = true;
        }
      }

      if (landed) {
        this.gainMana(3.2);
        if (stage === 1) {
          this.gainCrucibleCore(1, game);
        } else if (isFinisher) {
          if (!this.triggerWorldBreakerTemper(impactX, enemy, game)) {
            this.gainCrucibleCore(1, game);
          }
        }
      }

      // Stage 3 Finisher always sends a Seismic Resonance Pulse into any planted World-Anvil Altar!
      if (isFinisher) {
        this.triggerAnvilResonance(enemy, game, 38);
      }
    }

    if (t >= dur) {
      this.trueUltFrameOverride = null;
      this.setState('IDLE');
    }
  }

  /**
   * Signature Skill (`WORLD-ANVIL CATACLYSM`, `4.85s CD`):
   *   - Phase 1 (`t = 0.06s`): Fortifies Torgar (`Magma Bulwark` + `+1` Crucible Core) and drops a
   *     persistent **World-Forge Anvil Altar** (`this.worldAnvilAltar`, `3.8s`) with a Magnetic Gravity Slam!
   *   - Phase 2 (`t = 0.45s`): Hammers a blazing **Ricocheting Anvil Cannonball** (`this.activeAnvil`,
   *     `bouncesLeft = 1`) off the Altar across the stage while leaving the Altar planted for Resonance!
   */
  updateSkill(_dt, enemy, game) {
    const t = this.stateTimer;
    const dir = this.facing;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    // Phase 1 (`t >= 0.06`): Summon Persistent World-Forge Anvil Altar + Magnetic Gravity Slam
    if (t >= 0.06 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx = dir * 105;
      this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.75);
      this.gainCrucibleCore(1, game);

      const anvilX = Math.max(98, Math.min(ww - 98, this.x + dir * 118));
      this.worldAnvilAltar = {
        x: anvilX,
        y: this.groundY,
        dir,
        age: 0,
        life: 3.8,
        maxLife: 3.8,
        pulseTimer: 1.35,
        resonanceCd: 0.45,
        dashBoostCd: 0
      };

      this.fx?.spawn('runicBulwarkDome', this.x, this.y - 78, {
        follow: this,
        offsetX: 0,
        offsetY: -78,
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.26
      });
      this.fx?.spawn('tectonicCraterSlam', anvilX, this.groundY - 4, {
        flip: dir < 0,
        palette: FORGE_JADE_PALETTE,
        light: 1.28,
        extra: { maxRx: 130 }
      });

      if (game?.audio) {
        game.audio.play('skill_cast', anvilX);
        game.audio.play('clang', anvilX);
      }
      game?.renderer?.triggerShake?.(7, 0.15);
      game?.vfx?.spawnSpecialCastAura?.(
        this,
        this.skillName,
        '✦ WORLD-ANVIL CATACLYSM ✦',
        'forge',
        false
      );
      game?.vfx?.spawnDamageText?.(anvilX, this.groundY - 122, 0, false, 'WORLD-ANVIL ALTAR!', '#10b981');

      // Magnetic Gravity Slam pulls nearby foes toward the newly planted Altar!
      const advSkillBounds =
        game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
          ? game.adventure.getActiveStageBounds()
          : null;
      const pullMin = advSkillBounds ? advSkillBounds.minX + 24 : 70;
      const pullMax = advSkillBounds ? advSkillBounds.maxX - 24 : ww - 70;
      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - anvilX) <= 205) {
          const pullSign = anvilX >= foe.x ? 1 : -1;
          if (!foe.isColossalBoss) {
            foe.x = Math.max(pullMin, Math.min(pullMax, foe.x + pullSign * 38));
          }
          foe.takeDamage(38, this, false, pullSign * 55, -125);
        }
      }
    }

    // Phase 2 (`t >= 0.45`): Hammer Ricocheting Anvil Cannonball off the Altar's strike face!
    if (t >= 0.45 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      this.vx = dir * 145;
      const impactX = this.worldAnvilAltar ? this.worldAnvilAltar.x : this.x + dir * 124;
      const impactY = this.groundY - 6;

      if (game?.audio) {
        game.audio.play('thunder_slam', impactX);
        game.audio.play('clang', impactX);
      }
      game?.renderer?.triggerShake?.(11, 0.22);

      this.fx?.spawn('tectonicCraterSlam', impactX, impactY, {
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.34,
        extra: { maxRx: 132 }
      });
      this.fx?.spawn('moltenAnvilSparks', impactX, impactY - 52, {
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.34
      });
      this.spawnSheetBurst(4, impactX, impactY - 58, {
        w: 216,
        h: 216,
        maxLife: 0.40,
        flipX: dir < 0,
        glowColor: 'gold',
        inFront: true
      });

      // Trigger World-Breaker Temper if Torgar forged 5 Crucible Cores!
      this.triggerWorldBreakerTemper(impactX + dir * 64, enemy, game);

      game?.vfx?.spawnDamageText?.(
        impactX,
        this.y - 158,
        0,
        true,
        '★ ANVIL CANNONBALL! ★',
        '#fbbf24'
      );

      // Spawn the blazing Ricocheting Anvil Cannonball (`bouncesLeft = 1`)!
      this.activeAnvil = {
        x: impactX + dir * 18,
        y: this.groundY,
        vx: dir * 940,
        dir,
        age: 0,
        trailAccum: 0,
        state: 'flying',
        bouncesLeft: 1,
        rebounded: false,
        hitTargets: new Set()
      };

      // Close-quarters melee maul impact right at the Altar strike point
      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - impactX) < 130) {
          foe.takeDamage(36, this, true, dir * 155, -130);
        }
      }
    }

    if (t >= (this.skillDuration || 0.94)) {
      this.setState('IDLE');
    }
  }

  /**
   * Overdrive (`ULTIMATE` — `WORLD-BREAKER HOME RUN`, `1.46s`):
   *   - Phase 1 (`0.00s .. 0.42s`, `Row 4 F00..F05`): Torgar steps briskly into the Batter's Box,
   *     faces the **farthest side of the stage**, locks the enemy onto the glowing Batter's Plate,
   *     and cocks his symmetric 2H Mjolnir behind his rear shoulder (`-116°`) with an unobstructed silhouette!
   *   - Phase 2 (`t >= 0.42s`, `Row 4 F06..F10` -> `F11..F14`): Rips a chest-high horizontal Baseball-Bat
   *     Home-Run Swing (`horizontalBat: true`), blasting hit enemies in a line-drive comet across the arena
   *     into the **farthest stage wall** (`x = 82` or `x = ww - 82`) and **stunning for `0.8s`**!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 1.46;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;

    this.mana = 0;
    this.giantScale = 1.0;
    this.isInvulnerable = t < 0.88;
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.55);
    this.vx = 0;
    this.vy = 0;

    const foes = this.getActiveEnemies(enemy, game);
    const leadFoe =
      foes.length > 0
        ? foes.reduce((best, f) =>
            Math.abs(f.x - this.x) < Math.abs(best.x - this.x) ? f : best
          )
        : enemy;

    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    const wallMinX = advBounds ? advBounds.minX + 24 : 82;
    const wallMaxX = advBounds ? advBounds.maxX - 24 : ww - 82;

    // 1. Batter's Box Lock & Farthest-Wall Target Selection (`t >= 0.02`)
    if (t >= 0.02 && !this._ultCastTriggered) {
      this._ultCastTriggered = true;
      this._ultWaveStep = 0;
      this._homeRunFlights = [];
      this.gainCrucibleCore(1, game);

      const refX = leadFoe && !leadFoe.isDead ? leadFoe.x : this.x;
      if (leadFoe?.isColossalBoss) {
        this._homeRunTargetWallX = leadFoe.anchorX || leadFoe.x;
        this._homeRunDir = -1;
      } else {
        const distRight = wallMaxX - refX;
        const distLeft = refX - wallMinX;
        this._homeRunTargetWallX = distRight >= distLeft ? wallMaxX : wallMinX;
        this._homeRunDir = this._homeRunTargetWallX >= refX ? 1 : -1;
      }
      this.facing = this._homeRunDir;

      if (game?.audio) {
        game.audio.play('ult_cast', this.x);
        game.audio.play('clang', this.x);
      }
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          this.ultName,
          '★ WORLD-BREAKER HOME RUN! ★',
          'forge',
          true
        );
        game.vfx.spawnDamageText(
          this.x,
          this.y - 168,
          0,
          true,
          '★ BATTER UP! ★',
          '#fde047'
        );
      }
      game?.renderer?.triggerShake?.(9, 0.16);

      // Glowing Home-Plate Crucible Seal on the arena floor (`inFront: false` so Torgar stays 100% clear!)
      const plateX = leadFoe && !leadFoe.isDead ? leadFoe.x : this.x + this._homeRunDir * 106;
      this.spawnSheetBurst(3, plateX, this.groundY - 28, {
        w: 204,
        h: 204,
        maxLife: 0.52,
        flipX: this._homeRunDir < 0,
        glowColor: 'gold',
        inFront: false
      });
    }

    const batDir = this._homeRunDir || this.facing;
    this.facing = batDir;

    // Phase 1 (`0.00s .. 0.42s`, `Row 4 F00..F05`): Step into Batter's Box & Cock Mjolnir Behind Rear Shoulder!
    if (t < 0.42) {
      const windupU = Math.max(0, Math.min(0.999, t / 0.42));
      this.trueUltFrameOverride = 120 + Math.min(5, Math.floor(windupU * 6));

      if (leadFoe && !leadFoe.isDead) {
        if (leadFoe.isColossalBoss) {
          const bossBatterX = Math.max(wallMinX, (leadFoe.anchorX || leadFoe.x) + 112);
          const stepSpeed = t < 0.20 ? 28 : 14;
          this.x += (bossBatterX - this.x) * Math.min(1, dt * stepSpeed);
        } else {
          const clampedFoeX = Math.max(wallMinX + 110, Math.min(wallMaxX - 110, leadFoe.x));
          leadFoe.x += (clampedFoeX - leadFoe.x) * Math.min(1, dt * 16);
          const batterX = Math.max(wallMinX + 4, Math.min(wallMaxX - 4, leadFoe.x - batDir * 104));
          const stepSpeed = t < 0.20 ? 28 : 14;
          this.x += (batterX - this.x) * Math.min(1, dt * stepSpeed);
          // Hold enemies inside the Batter's Box right on the strike-zone sweet-spot
          const sweetSpotX = Math.max(wallMinX + 68, Math.min(wallMaxX - 68, this.x + batDir * 104));
          for (const f of foes) {
            if (!f.isColossalBoss && (f === leadFoe || Math.abs(f.x - sweetSpotX) <= 185)) {
              f.x += (sweetSpotX - f.x) * Math.min(1, dt * 15);
              f.vx = 0;
            }
          }
        }
      }
      return;
    }

    // Phase 2 (`t >= 0.42s`, `Row 4 F06..F10`): CRACK OF THE BAT! Chest-High Horizontal Baseball-Bat Swing!
    if (t >= 0.42 && (this._ultWaveStep || 0) < 1) {
      this._ultWaveStep = 1;
      const contactX = leadFoe?.isColossalBoss
        ? (leadFoe.anchorX || leadFoe.x) + 20
        : Math.max(wallMinX + 8, Math.min(wallMaxX - 8, this.x + batDir * 106));
      const contactY = this.groundY - 82;

      if (game?.audio) {
        game.audio.play('parry_clang', contactX);
        game.audio.play('thunder_slam', contactX);
        game.audio.play('heavy_cleave', contactX);
      }
      game?.renderer?.triggerImpactFrame?.(0.08, contactX, contactY, 'forge');
      if (game?.renderer && game.renderer.impactFrameTimer > 1) {
        game.renderer.triggerImpactFrame?.(contactX, contactY, 0.08, 'forge');
      }
      game?.renderer?.triggerShake?.(20, 0.30);
      game?.renderer?.triggerAberration?.(10);
      game?.renderer?.triggerHitStop?.(0.065);

      this.fx?.spawn('moltenAnvilSparks', contactX, contactY, {
        flip: batDir < 0,
        palette: FORGE_JADE_PALETTE,
        light: 1.44
      });

      this._homeRunSwingStreak = {
        startX: contactX,
        startY: contactY,
        targetWallX: this._homeRunTargetWallX,
        dir: batDir,
        age: 0,
        maxLife: 0.48
      };

      game?.vfx?.spawnDamageText?.(
        contactX,
        this.groundY - 178,
        0,
        true,
        '★ HOME-RUN GRAND SLAM! ★',
        '#fde047'
      );

      // Launch hit enemies inside the Batter's Box in a line-drive comet to the farthest stage wall!
      for (const foe of foes) {
        if (foe !== leadFoe && Math.abs(foe.x - contactX) > 195) continue;
        const distRight = wallMaxX - foe.x;
        const distLeft = foe.x - wallMinX;
        const targetWallX = foe.isColossalBoss
          ? foe.anchorX || foe.x
          : this._homeRunTargetWallX || (distRight >= distLeft ? wallMaxX : wallMinX);
        foe.takeDamage(44, this, true, batDir * 680, -110);
        this.mana = 0;
        this._homeRunFlights.push({
          foe,
          startX: foe.x,
          targetWallX,
          dir: batDir,
          elapsed: 0,
          duration: 0.38,
          sparkAccum: 0,
          crashed: false
        });
      }
    }

    // Step Active Home-Run Line-Drive Flights & Farthest-Wall Crash (`0.8s` Stun)!
    if (this._homeRunFlights && this._homeRunFlights.length > 0) {
      for (const fl of this._homeRunFlights) {
        if (!fl.foe || fl.foe.isDead || fl.crashed) continue;
        fl.elapsed += dt;
        const u = Math.min(1, fl.elapsed / fl.duration);
        const easeU = 1 - Math.pow(1 - u, 1.75);

        if (!fl.foe.isColossalBoss) {
          fl.foe.x = fl.startX + (fl.targetWallX - fl.startX) * easeU;
          fl.foe.y = fl.foe.groundY - Math.sin(u * Math.PI) * 38;
        }
        fl.foe.vx = 0;
        fl.foe.vy = 0;
        fl.foe.hurtTimer = Math.max(fl.foe.hurtTimer || 0, 0.18);

        fl.sparkAccum += dt;
        if (fl.sparkAccum >= 0.085) {
          fl.sparkAccum = 0;
          this.fx?.burst(fl.foe.x - fl.dir * 18, fl.foe.y - 68, {
            count: 2,
            speedMin: 42,
            speedMax: 105,
            lifeMin: 0.12,
            lifeMax: 0.22,
            gravity: 30,
            angle: fl.dir >= 0 ? Math.PI : 0,
            spread: 0.55,
            colors: ['#ffffff', '#fde047', '#f59e0b', '#10b981']
          });
        }

        if (u >= 1.0 && !fl.crashed) {
          fl.crashed = true;
          const wallX = fl.targetWallX;
          if (!fl.foe.isColossalBoss) {
            fl.foe.x = wallX;
            fl.foe.y = fl.foe.groundY;
          }
          fl.foe.vx = 0;
          fl.foe.vy = 0;

          fl.foe.takeDamage(42, this, true, -fl.dir * 35, -110);
          this.mana = 0;
          if (!fl.foe.isColossalBoss) {
            fl.foe.x = wallX;
            fl.foe.y = fl.foe.groundY;
          }
          fl.foe.vx = 0;
          fl.foe.vy = 0;

          // Apply the 0.8-second Wall-Slam Stun!
          fl.foe.stunTimer = Math.max(fl.foe.stunTimer || 0, 0.80);
          fl.foe.hurtTimer = 0.28;

          if (game?.audio) {
            game.audio.play('earthshatter', wallX);
            game.audio.play('thunder_slam', wallX);
            game.audio.play('clang', wallX);
          }
          game?.renderer?.triggerShake?.(24, 0.36);
          game?.renderer?.triggerAberration?.(12);

          this.fx?.spawn('tectonicCraterSlam', wallX, this.groundY - 4, {
            flip: fl.dir < 0,
            palette: FORGE_JADE_PALETTE,
            light: 1.44,
            extra: { maxRx: 165 }
          });
          this.fx?.spawn('moltenAnvilSparks', wallX, this.groundY - 68, {
            flip: fl.dir < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.38
          });
          this.spawnSheetBurst(4, wallX, this.groundY - 78, {
            w: 208,
            h: 208,
            maxLife: 0.40,
            flipX: fl.dir < 0,
            glowColor: 'gold',
            inFront: true
          });

          game?.vfx?.spawnDamageText?.(
            wallX,
            this.groundY - 176,
            0,
            true,
            '★ WALL CRASH! STUNNED 0.8S! ★',
            '#34d399'
          );

          this.triggerAnvilResonance(enemy, game, 34);
        }
      }
    }

    // Drive Row 4 frames `F06..F14` (`0.42s .. 1.46s`): crisp bat whip -> heroic slugger hold -> smooth return
    if (t < 0.68) {
      const swingU = Math.max(0, Math.min(0.999, (t - 0.42) / 0.26));
      this.trueUltFrameOverride = 120 + 6 + Math.min(4, Math.floor(swingU * 5));
    } else if (t < 1.08) {
      const holdU = Math.max(0, Math.min(0.999, (t - 0.68) / 0.40));
      this.trueUltFrameOverride = 120 + 10 + Math.min(1, Math.floor(holdU * 2));
    } else {
      const recU = Math.max(0, Math.min(0.999, (t - 1.08) / Math.max(0.01, dur - 1.08)));
      this.trueUltFrameOverride = 120 + 12 + Math.min(2, Math.floor(recU * 3));
    }

    if (t >= dur) {
      this._ultWaveStep = 0;
      this.trueUltFrameOverride = null;
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Overdrive Supreme Ultimate (`state === 'TRUE_ULTIMATE'`, `3.80s`):
   * "GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER"
   * - NEVER overrides or alters stage background images (`trueUltStageOverride === null`).
   * - Beat 1 (`0.00s .. 0.62s`): Torgar swells into his **HUGE `2.15x` Colossus Form** with a clean,
   *   unobstructed silhouette, maxes `5` Crucible Cores, and coils Mjolnir low along the floor (`Row 4 F15..F16`).
   * - Beat 2 (`0.62s .. 1.10s`): Planted on the ground, Giant Torgar rips a **2H Rising Mjolnir Sky-Uppercut**
   *   (`Row 4 F17..F19`), **hammering and launching all active enemies high UP into the sky (`groundY - 210px`)**!
   * - Beat 3 (`1.10s .. 1.96s`): Giant Torgar compresses into a brief deep jump-squat (`1.10s .. 1.20s`, `F16`),
   *   then **explosively fast-jumps (`Super-Leap`, `1.20s .. 1.56s`, `F20..F21`)** continuously from the ground
   *   all the way up to `groundY - 380..390px` cleanly ABOVE the airborne enemy before hoisting Mjolnir overhead (`F22..F23`)!
   * - Beat 4 (`1.96s .. 2.36s`): Giant Torgar jackknifes downward (`Row 4 F24..F26`), intercepts the airborne
   *   enemy mid-sky, and **meteor-spikes them straight into the arena floor** at `t >= 2.36s` for ONE `735`-Crit
   *   Continental Sunder + `+9%` Max HP heal + wide 2.5D **Soil, Dirt & Shattered Bedrock Crater Splash** + **`1.85s` Stun**!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 3.80;
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;
    this.hasPoise = true;
    this.unstoppablePoise = true;

    if (this._trueUltStep >= 4 && this._trueUltGeyserTimer > 0) {
      this._trueUltGeyserTimer = Math.max(0, this._trueUltGeyserTimer - dt);
    }

    const activeFoes = this.getActiveEnemies(enemy, game);

    const advBounds =
      game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
        ? game.adventure.getActiveStageBounds()
        : null;
    const zMin = advBounds ? advBounds.minX : 0;
    const zMax = advBounds ? advBounds.maxX : ww;

    if (this._trueUltStep < 1) {
      const anchorFoe = activeFoes[0] || enemy;
      if (anchorFoe?.isColossalBoss) {
        this._trueUltAnvilX = (anchorFoe.anchorX || anchorFoe.x) + 40;
        this._trueUltDir = -1;
      } else {
        const margin = advBounds ? 95 : 240;
        this._trueUltAnvilX = anchorFoe
          ? Math.max(zMin + margin, Math.min(zMax - margin, anchorFoe.x))
          : Math.max(zMin + margin, Math.min(zMax - margin, this.x + this.facing * 180));
        this._trueUltDir = this._trueUltAnvilX >= this.x ? 1 : -1;
      }
    }

    const ultDir = this._trueUltDir || this.facing;
    this.facing = ultDir;
    const standX = Math.max(zMin + 24, Math.min(zMax - 24, this._trueUltAnvilX - ultDir * 124));
    const skyApexX = Math.max(zMin + 28, Math.min(zMax - 28, this._trueUltAnvilX - ultDir * 36));

    // Beat 1 (`0.00s .. 0.62s` — Giant 2.15x Colossus Awakening & Deep Floor-Scoop Coil)
    if (t >= 0.04 && this._trueUltStep < 1) {
      this._trueUltStep = 1;
      this._superJumpTrail = [];
      this.forgeArmorTimer = 6.0;
      this.crucibleStacks = this.maxCrucibleStacks;
      this._trueUltBoundFoes = [...activeFoes];
      for (const foe of activeFoes) {
        foe.isRooted = true;
        foe.vx = 0;
        foe.vy = 0;
      }

      game?.audio?.play?.('ult_cast', this.x);
      game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
      game?.vfx?.triggerCinematicCutIn?.(this, this.trueUltName, '#f97316');
      game?.vfx?.spawnSpecialCastAura?.(
        this,
        this.trueUltName,
        '★ GOD-HAMMER MJOLNIR! ★',
        'forge',
        true
      );
      game?.vfx?.spawnDamageText?.(
        this.x,
        this.y - 185,
        0,
        true,
        '★ COLOSSUS AWAKENING! ★',
        '#f97316'
      );

      this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
        flip: ultDir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.38,
        extra: { maxRx: 165 }
      });
      this.spawnSheetBurst(5, this._trueUltAnvilX, this.groundY - 96, {
        w: 288,
        h: 288,
        maxLife: 2.40,
        flipX: ultDir < 0,
        glowColor: 'gold',
        inFront: false
      });
    }

    if (t < 0.62) {
      const growU = Math.max(0, Math.min(1, t / 0.52));
      const easeGrow = growU * growU * (3 - 2 * growU);
      this.giantScale = 1.0 + 1.15 * easeGrow;
      this.isFlipVault = false;
      this.cameraAirLift = Math.round(420 * easeGrow);
      this._superJumpTrail = [];

      for (const foe of activeFoes) {
        if (!this._trueUltBoundFoes.includes(foe)) this._trueUltBoundFoes.push(foe);
        if (!foe.isColossalBoss) {
          foe.isRooted = true;
          foe.vx = 0;
          foe.vy = 0;
          foe.x += (this._trueUltAnvilX - foe.x) * Math.min(1, dt * 16);
          foe.y = foe.groundY;
        }
      }
      this.x += (standX - this.x) * Math.min(1, dt * 18);
      this.y = this.groundY;

      // Transition from Sovereign Guard (`F00`) into Deep Floor-Scoop Coil (`F15..F16`)
      if (t < 0.24) {
        this.trueUltFrameOverride = 120;
      } else {
        const coilU = Math.max(0, Math.min(0.999, (t - 0.24) / 0.38));
        this.trueUltFrameOverride = 120 + 15 + Math.min(1, Math.floor(coilU * 2));
      }
      return;
    }

    // Beats 2 & 3 (`0.62s .. 1.96s` — Grounded Sky-Uppercut Knockup -> Explosive Fast-Jump (`Super-Leap`) -> Sky Hoist!)
    if (t < 1.96) {
      this.giantScale = 2.15;
      this.cameraAirLift = 680;

      if (t >= 0.62 && this._trueUltStep < 2) {
        this._trueUltStep = 2;
        game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
        game?.audio?.play?.('thunder_slam', this._trueUltAnvilX);
        game?.audio?.play?.('heavy_cleave', this._trueUltAnvilX);
        game?.renderer?.triggerShake?.(18, 0.26);
        game?.renderer?.triggerHitStop?.(0.05);

        game?.vfx?.spawnDamageText?.(
          this._trueUltAnvilX,
          this.groundY - 205,
          0,
          true,
          '★ MJOLNIR SKY-UPPERCUT! ★',
          '#fbbf24'
        );
        this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
          flip: ultDir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.42,
          extra: { maxRx: 168 }
        });
        this.fx?.spawn('moltenAnvilSparks', this._trueUltAnvilX, this.groundY - 92, {
          flip: ultDir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.42
        });
      }

      // Rocket all active enemies HIGH UP into the sky (`groundY -> groundY - 210px`) & hold cleanly at apex!
      const launchU = Math.max(0, Math.min(1, (t - 0.62) / 0.44));
      const easeUp = 1 - Math.pow(1 - launchU, 3);
      const hoverBob = launchU >= 1 ? Math.sin((t - 1.06) * 10.0) * 4 : 0;
      const targetFoeY = this.groundY - 210 * easeUp + hoverBob;

      for (let fIdx = 0; fIdx < activeFoes.length; fIdx++) {
        const foe = activeFoes[fIdx];
        if (!this._trueUltBoundFoes.includes(foe)) this._trueUltBoundFoes.push(foe);
        if (!foe.isColossalBoss) {
          const staggerX = fIdx === 0 ? 0 : fIdx % 2 === 1 ? 102 : -102;
          foe.isRooted = true;
          foe.vx = 0;
          foe.vy = 0;
          foe.x = Math.max(95, Math.min(ww - 95, this._trueUltAnvilX + staggerX));
          foe.y = targetFoeY;
        }
        foe.hurtTimer = Math.max(foe.hurtTimer || 0, 0.24);
      }

      this._trueUltAirSparkAccum = (this._trueUltAirSparkAccum || 0) + dt;
      if (this._trueUltAirSparkAccum >= 0.095) {
        this._trueUltAirSparkAccum = 0;
        this.fx?.burst(this._trueUltAnvilX, targetFoeY - 46, {
          count: 2,
          speedMin: 35,
          speedMax: 90,
          lifeMin: 0.12,
          lifeMax: 0.20,
          gravity: 35,
          angle: -Math.PI * 0.5,
          spread: 0.85,
          colors: ['#ffffff', '#fde047', '#f59e0b']
        });
      }

      if (t < 1.10) {
        // Beat 2 (`0.62s .. 1.10s`): Grounded Sky-Uppercut Follow-Through (`F17..F19`)
        this._superJumpTrail = [];
        this.isFlipVault = false;
        this.x = standX;
        this.y = this.groundY;
        const upU = Math.max(0, Math.min(0.999, (t - 0.62) / 0.48));
        this.trueUltFrameOverride = 120 + 17 + Math.min(2, Math.floor(upU * 3));
      } else if (t < 1.20) {
        // Beat 3A (`1.10s .. 1.20s`): Brief Deep Squat Jump-Coil on `groundY` (`F16`)
        this._superJumpTrail = [];
        this.isFlipVault = false;
        this.x = standX;
        this.y = this.groundY;
        this.trueUltFrameOverride = 120 + 16;
      } else if (t < 1.56) {
        // Beat 3B (`1.20s .. 1.56s`): Continuous Explosive Fast-Jump (`Super-Leap`) from `groundY` to `groundY - 380`!
        if (this._trueUltStep < 3) {
          this._trueUltStep = 3;
          this._superJumpTrail = [];
          game?.audio?.play?.('dash_whoosh', standX);
          game?.audio?.play?.('thunder_slam', standX);
          game?.renderer?.triggerShake?.(14, 0.20);

          // Explosive floor launch shockwave & soil/pebble kick-off under Torgar's boots (ZERO teleport blink flash!)
          this.fx?.spawn('tectonicCraterSlam', standX, this.groundY - 4, {
            flip: ultDir < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.38,
            extra: { maxRx: 156 }
          });
          this.fx?.spawn('moltenAnvilSparks', standX, this.groundY - 24, {
            flip: ultDir < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.36
          });
          this.triggerSoilRockSplash(standX, this.groundY, ww, 'leap');
          game?.vfx?.spawnDamageText?.(
            standX,
            this.groundY - 190,
            0,
            true,
            '★ COLOSSUS SKY-LEAP! ★',
            '#fbbf24'
          );
        }

        const prevFrame = this.trueUltFrameOverride || 120 + 20;
        if (!Array.isArray(this._superJumpTrail)) this._superJumpTrail = [];
        this._superJumpTrail.push({ x: this.x, y: this.y, frameIdx: prevFrame });
        if (this._superJumpTrail.length > 2) this._superJumpTrail.shift();

        const jumpU = Math.max(0, Math.min(1, (t - 1.20) / 0.36));
        const easeJump = 1 - (1 - jumpU) * (1 - jumpU);
        this.isFlipVault = true;
        this.x = standX + (skyApexX - standX) * easeJump;
        this.y = this.groundY - 380 * easeJump;
        this.trueUltFrameOverride = jumpU < 0.48 ? 120 + 20 : 120 + 21;
      } else {
        // Beat 3C (`1.56s .. 1.96s`): Apex Sky-Hang & Overhead Mjolnir Crown-Hoist (`F22..F23`) cleanly ABOVE enemy!
        this._superJumpTrail = [];
        this.isFlipVault = true;
        const hangU = Math.max(0, Math.min(1, (t - 1.56) / 0.40));
        this.x = skyApexX;
        this.y = this.groundY - 380 - Math.sin(hangU * Math.PI * 0.5) * 10;
        this.trueUltFrameOverride = hangU < 0.5 ? 120 + 22 : 120 + 23;
      }
      return;
    }

    // Beat 4 (`1.96s .. 2.36s` — Violent Downward Meteor Spike Driving Airborne Enemy Into the Ground!)
    if (t < 2.36) {
      this._superJumpTrail = [];
      this.giantScale = 2.15;
      this.isFlipVault = true;
      const plungeU = Math.max(0, Math.min(1, (t - 1.96) / 0.40));
      const accel = plungeU * plungeU;
      this.cameraAirLift = Math.round(680 * (1 - accel * 0.62));

      const advTrueBounds =
        game?.adventure?.active && typeof game.adventure.getActiveStageBounds === 'function'
          ? game.adventure.getActiveStageBounds()
          : null;
      const landMin = advTrueBounds ? advTrueBounds.minX + 36 : 115;
      const landMax = advTrueBounds ? advTrueBounds.maxX - 36 : ww - 115;
      const targetLandX = Math.max(landMin, Math.min(landMax, this._trueUltAnvilX - ultDir * 88));
      this.x = skyApexX + (targetLandX - skyApexX) * accel;
      this.y = this.groundY - 390 * (1 - accel);

      // Enemy stays suspended at `groundY - 210` until Torgar's downward Mjolnir physically intercepts them (`plungeU >= 0.34`),
      // then gets spiked straight down TOGETHER with Mjolnir into `groundY`!
      if (plungeU >= 0.34 && !this._trueUltMidAirClanged) {
        this._trueUltMidAirClanged = true;
        game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
        game?.renderer?.triggerHitStop?.(0.04);
        this.fx?.spawn('moltenAnvilSparks', this._trueUltAnvilX, this.groundY - 215, {
          flip: ultDir < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.46
        });
      }

      const foeDriveU = plungeU < 0.34 ? 0 : Math.min(1, (plungeU - 0.34) / 0.66);
      const foeY = this.groundY - 210 * (1 - foeDriveU * foeDriveU);
      for (let fIdx = 0; fIdx < activeFoes.length; fIdx++) {
        const foe = activeFoes[fIdx];
        if (!foe.isColossalBoss) {
          const staggerX = fIdx === 0 ? 0 : fIdx % 2 === 1 ? 102 : -102;
          foe.isRooted = true;
          foe.vx = 0;
          foe.vy = 0;
          foe.x = Math.max(95, Math.min(ww - 95, this._trueUltAnvilX + staggerX));
          foe.y = foeY;
        }
        foe.hurtTimer = Math.max(foe.hurtTimer || 0, 0.24);
      }

      this.trueUltFrameOverride = plungeU < 0.28 ? 120 + 24 : plungeU < 0.65 ? 120 + 25 : 120 + 26;
      return;
    }

    // Beat 5 (`t >= 2.36s`, `_trueUltStep < 4` — Cataclysmic Ground-Smash + Soil & Shattered Bedrock Crater Splash!)
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._superJumpTrail = [];
      this._trueUltGeyserTimer = 1.05;
      this.isFlipVault = false;
      this.y = this.groundY;
      this.trueUltFrameOverride = 120 + 27;

      game?.renderer?.triggerImpactFrame?.(0.12, this._trueUltAnvilX, this.groundY - 96, 'forge');
      if (game?.renderer && game.renderer.impactFrameTimer > 1) {
        game.renderer.triggerImpactFrame?.(this._trueUltAnvilX, this.groundY - 96, 0.12, 'forge');
      }
      game?.renderer?.shake?.(30, 0.80);
      game?.renderer?.triggerShake?.(30, 0.80);
      game?.renderer?.flash?.(0.30, '#fff7ed');
      game?.renderer?.triggerAberration?.(16);
      game?.renderer?.triggerHitStop?.(0.09);

      game?.audio?.play?.('ult_cast', this._trueUltAnvilX);
      game?.audio?.play?.('earthshatter', this._trueUltAnvilX);
      game?.audio?.play?.('parry_clang', this._trueUltAnvilX);

      this.heal(Math.round(this.maxHp * 0.09), 'WORLD-FORGE TEMPER');
      this.forgeArmorTimer = 1.25;
      this.crucibleStacks = this.maxCrucibleStacks;

      this.fx?.spawn('ragnarokWorldForgeWave', this._trueUltAnvilX, this.groundY - 4, {
        flip: ultDir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.55,
        extra: { stage: 3 }
      });
      this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
        flip: ultDir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.48,
        extra: { maxRx: 215 }
      });

      // Wide 2.5D Soil, Dirt & Shattered Bedrock Crater Splash (`Row 7`, `glowColor: 'none'` — ZERO vertical spikes!)
      this.spawnSheetBurst(7, this._trueUltAnvilX, this.groundY - 64, {
        w: 420,
        h: 256,
        maxLife: 0.98,
        flipX: ultDir < 0,
        glowColor: 'none',
        inFront: false
      });
      for (const side of [-1, 1]) {
        const splashX = Math.max(110, Math.min(ww - 110, this._trueUltAnvilX + side * 190));
        this.spawnSheetBurst(7, splashX, this.groundY - 46, {
          w: 284,
          h: 184,
          maxLife: 0.90,
          flipX: side < 0,
          glowColor: 'none',
          inFront: true
        });
      }
      this.triggerSoilRockSplash(this._trueUltAnvilX, this.groundY, ww, 'cataclysm');

      game?.vfx?.spawnDamageText?.(
        this._trueUltAnvilX,
        this.groundY - 210,
        0,
        true,
        '★ CONTINENTAL SUNDER! STUNNED! ★',
        '#f97316'
      );

      // Release airborne root lock, slam every enemy into the crater for ONE 735-Crit blow, and STUN (`1.85s`)!
      for (const foe of this._trueUltBoundFoes) {
        if (foe) foe.isRooted = false;
      }
      this._trueUltBoundFoes = [];

      for (const foe of activeFoes) {
        if (!foe.isColossalBoss) {
          foe.isRooted = false;
          foe.y = foe.groundY;
          foe.vx = 0;
          foe.vy = 0;
        }
        foe.takeDamage(735, this, true, ultDir * 120, 0);
        if (!foe.isDead && !foe.isColossalBoss) {
          foe.y = foe.groundY;
          foe.vx = 0;
          foe.vy = 0;
          foe.stunTimer = Math.max(foe.stunTimer || 0, 1.85);
          foe.hurtTimer = 0.36;
        }
      }
    }

    // Recovery (`2.36s .. 3.80s` — Smoothly ease `giantScale` `2.15 -> 1.0` & `cameraAirLift -> 0` and return to `IDLE`)
    this.y = this.groundY;
    this.isFlipVault = false;
    const postU = Math.max(0, Math.min(1, (t - 2.36) / Math.max(0.01, dur - 2.36)));
    const easeBack = postU * postU * (3 - 2 * postU);
    this.giantScale = 2.15 - 1.15 * easeBack;
    this.cameraAirLift = Math.round(250 * Math.max(0, 1 - postU * 2.1));

    if (t < 2.95) {
      this.trueUltFrameOverride = 120 + 27;
    } else {
      const recU = Math.max(0, Math.min(0.999, (t - 2.95) / Math.max(0.01, dur - 2.95)));
      this.trueUltFrameOverride = 120 + 28 + Math.min(1, Math.floor(recU * 2));
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.giantScale = 1.0;
      this.cameraAirLift = 0;
      this.isFlipVault = false;
      this.isInvulnerable = false;
      this.trueUltFrameOverride = null;
      this._trueUltGeyserTimer = 0;
      this._superJumpTrail = [];
      this.setState('IDLE');
    }
  }

  /**
   * Pixel-art Molten Runic Chain renderer (strictly integer `fillRect` links — ZERO `quadraticCurveTo` or `rotate`).
   */
  drawPixelForgeChain(ctx, x1, y1, x2, y2, phase = 0) {
    if (!ctx?.fillRect) return;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) return;
    const steps = Math.max(4, Math.min(28, Math.floor(dist / 14)));

    ctx.save();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const sag = Math.sin(u * Math.PI) * 12;
      const px = Math.round(x1 + dx * u);
      const py = Math.round(y1 + dy * u + sag);
      const isJade = (i + Math.floor(phase * 10)) % 3 === 0;
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(px - 4, py - 4, 8, 8);
      ctx.fillStyle = isJade ? '#10b981' : '#f59e0b';
      ctx.fillRect(px - 3, py - 3, 6, 6);
      ctx.fillStyle = isJade ? '#a7f3d0' : '#fef08a';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
    ctx.restore();
  }

  /**
   * Renders Torgar's `0..5` orbiting Molten Crucible Cores in 2.5D (`inFront = false` back half, `true` front half).
   * Uses strictly crisp integer `ctx.fillRect` pixel art — ZERO `ctx.rotate` or `quadraticCurveTo`.
   */
  drawCrucibleCores(ctx, inFront = false) {
    if (!ctx?.fillRect || this.isDead || this.crucibleStacks <= 0) return;
    const scale = this.giantScale || 1.0;
    const count = this.crucibleStacks;
    const isMax = count >= this.maxCrucibleStacks;
    const cx = this.x;
    const cy = this.y - Math.round(92 * scale);
    const rx = Math.round(54 * scale);
    const ry = Math.round(16 * scale);

    ctx.save();
    for (let i = 0; i < count; i++) {
      const ang = this._crucibleOrbitPhase + (i * Math.PI * 2) / this.maxCrucibleStacks;
      const depth = Math.sin(ang);
      if (inFront ? depth < 0 : depth >= 0) continue;

      const ox = Math.round(cx + Math.cos(ang) * rx);
      const oy = Math.round(cy + depth * ry + Math.sin(this._crucibleOrbitPhase * 1.8 + i) * 3);
      const s = scale >= 1.8 ? 2 : 1;

      // Crisp 16-bit faceted Khazad Forge-Core diamond (Selout + Obsidian + Gold/Jade Core + White Spark)
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(ox - 5 * s, oy - 3 * s, 10 * s, 6 * s);
      ctx.fillRect(ox - 3 * s, oy - 5 * s, 6 * s, 10 * s);

      ctx.fillStyle = isMax ? '#047857' : '#b45309';
      ctx.fillRect(ox - 4 * s, oy - 2 * s, 8 * s, 4 * s);
      ctx.fillRect(ox - 2 * s, oy - 4 * s, 4 * s, 8 * s);

      ctx.fillStyle = isMax ? '#34d399' : '#fbbf24';
      ctx.fillRect(ox - 2 * s, oy - 2 * s, 4 * s, 4 * s);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox - 1 * s, oy - 1 * s, 2 * s, 2 * s);
    }
    ctx.restore();
  }

  drawBehind(ctx, renderer = null) {
    if (this.state !== 'TRUE_ULTIMATE') return;
    const t = this.stateTimer || 0;
    const dur = this.trueUltDuration || 3.80;
    const ww = renderer?.worldWidth || 1200;

    // Localized volcanic crucible twilight dim (NEVER overrides stage background image!)
    if (ctx?.fillRect) {
      const envAlpha =
        t < 0.30 ? t / 0.30 : t > dur - 0.55 ? Math.max(0, (dur - t) / 0.55) : 1.0;
      ctx.save();
      ctx.fillStyle = `rgba(18, 8, 4, ${(0.44 * envAlpha).toFixed(3)})`;
      ctx.fillRect(0, -480, ww, this.groundY + 620);
      ctx.fillStyle = `rgba(245, 158, 11, ${(0.14 * envAlpha).toFixed(3)})`;
      ctx.fillRect(0, this.groundY - 12, ww, 16);

      // Vertical Heaven's Anvil Meteor Drop Pillar Sightline once Giant Torgar's Fast-Jump crests (`1.50s .. 2.36s`)!
      if (t >= 1.50 && t < 2.36) {
        const ax = Math.round(this._trueUltAnvilX || 600);
        const topY = Math.round(this.y - 210);
        const beamH = Math.max(24, Math.round(this.groundY - topY));
        ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
        ctx.fillRect(ax - 18, topY, 36, beamH);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.24)';
        ctx.fillRect(ax - 6, topY, 12, beamH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.fillRect(ax - 2, topY, 4, beamH);
      }
      ctx.restore();
    }

    if (t >= 2.36) return;

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    const vfxSheet = sprites?.vfx;
    const col = Math.floor(t * 30) % 30;
    const ax = this._trueUltAnvilX || 600;
    const ay = this.groundY - 110;

    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      // Central `Row 5` Colossal World-Forge Crucible Target Seal on the Arena Floor (`336x336`, ZERO flanking crystal spikes!)
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        5,
        col,
        ax,
        ay,
        336,
        336,
        0.96,
        this.facing < 0,
        renderer,
        'gold'
      );

      // Sovereign `Row 3` 8-Cog Sky-Mandala Halo behind Giant Torgar once his Fast-Jump crests (`t >= 1.50s`)!
      if (t >= 1.50) {
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          3,
          col,
          this.x,
          this.y - 185,
          312,
          312,
          0.88,
          this.facing < 0,
          renderer,
          'emerald'
        );
      }
    } else if (vfxSheet && ctx?.drawImage) {
      ctx.save();
      ctx.drawImage(vfxSheet, col * 208, 5 * 208, 208, 208, ax - 168, ay - 168, 336, 336);
      ctx.restore();
    }

    // Molten Runic Forge-Chains anchoring active enemies (to ground Crucible early, or to Giant Sky-Torgar above!)
    const foes = this.game ? this.getActiveEnemies(null, this.game) : [];
    for (const foe of foes) {
      if (t >= 1.50) {
        this.drawPixelForgeChain(ctx, this.x, this.y - 140, foe.x, foe.y - 64, t);
      } else {
        this.drawPixelForgeChain(ctx, ax, this.groundY - 64, foe.x, foe.y - 68, t);
      }
    }
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
    glowColor = 'gold'
  ) {
    if (!vfxSheet || !vfxSheet.complete || !vfxSheet.naturalWidth) return;
    const cell = 208;
    const sx = Math.max(0, Math.min(29, Math.floor(col))) * cell;
    const sy = Math.max(0, Math.min(7, Math.floor(row))) * cell;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);

    const useGlow = glowColor !== 'none';
    const glowSprite = !useGlow
      ? null
      : glowColor === 'emerald'
        ? renderer?.glowEmerald || renderer?.glowGold || renderer?.glowOrange
        : renderer?.glowGold || renderer?.glowOrange;
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

    if (useGlow) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.20);
      ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);
    }

    ctx.restore();
  }

  /**
   * Stamps active 30fps `titan_vfx.png` rows accurately mapped to `build_titan_vfx_30fps.mjs`:
   * - Row 0: `tectonicMagmaWaveCell` (Traveling Tectonic Volcanic Earth-Spire Wave)
   * - Row 1: `runicIronForgeAnvilCell` (Horned Khazad Iron Forge-Anvil construct & cannonball)
   * - Row 2: `tectonicMagmaPillarCell` (Erupting Magma-Jade Volcanic Rune Obelisk)
   * - Row 3: `worldForgeAnvilSealCell` (8-Cog Sovereign World-Forge Crucible Mandala)
   * - Row 4: `cataclysmCraterNovaCell` (Molten Hammer Star-Crater Shock-Ring Nova)
   * - Row 5: `worldForgeCrucibleAltarCell` (Colossal World-Forge Crucible Altar)
   * - Row 6: `godHammerLightningStrikeCell` (God-Hammer Lightning-Magma Strike)
   * - Row 7: `continentalSunderGeyserCell` (Continental Sunder Soil, Dirt & Shattered Bedrock Crater Splash)
   */
  drawActiveAnvilAndQuakes(ctx, vfxSheet = null, renderer = null, inFront = false) {
    const sheet =
      vfxSheet || (typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan?.vfx : null);
    if (!sheet || !sheet.complete) return;

    if (!inFront) {
      // 1. Background 30fps `titan_vfx.png` cell animations
      for (const v of this.activeVfxAnims) {
        if (v.inFront) continue;
        const u = Math.min(1, Math.max(0, v.age / v.maxLife));
        const span = Math.max(1, v.endFrame - v.startFrame + 1);
        const col = Math.min(29, v.startFrame + Math.floor(u * span));
        const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
        this.drawBloomedVfxCell(
          ctx,
          sheet,
          v.row,
          col,
          v.x,
          v.y,
          v.w,
          v.h,
          fade * 0.96,
          v.flipX,
          renderer,
          v.glowColor
        );
      }

      // 2. Persistent World-Forge Anvil Altar (`Row 3` 8-Cog Sovereign Mandala + `Row 1` Horned Iron Anvil!)
      if (this.worldAnvilAltar && this.worldAnvilAltar.life > 0) {
        const altar = this.worldAnvilAltar;
        const col = Math.floor(altar.age * 30) % 30;
        const fade = altar.life < 0.45 ? Math.max(0, altar.life / 0.45) : 1.0;
        this.drawBloomedVfxCell(
          ctx,
          sheet,
          3,
          col,
          altar.x,
          altar.y - 36,
          212,
          212,
          fade * 0.92,
          altar.dir < 0,
          renderer,
          'emerald'
        );
        this.drawBloomedVfxCell(
          ctx,
          sheet,
          1,
          col,
          altar.x,
          altar.y - 54,
          196,
          196,
          fade * 0.98,
          altar.dir < 0,
          renderer,
          'gold'
        );
      }
      return;
    }

    // 3. Traveling Tectonic Magma-Jade Fissure Waves (`Row 0`)
    for (const wv of this.fissureWaves) {
      const col = Math.floor(wv.age * 36) % 30;
      const u = Math.min(1, wv.age / wv.maxLife);
      const fade = u > 0.76 ? Math.max(0, (1 - u) / 0.24) : 1.0;
      this.drawBloomedVfxCell(
        ctx,
        sheet,
        0,
        col,
        wv.x,
        wv.y - 54,
        212,
        212,
        fade * 0.96,
        wv.dir < 0,
        renderer,
        'emerald'
      );
    }

    // 4. Ricocheting Anvil Cannonball (`Row 0` Magma Wake + `Row 1` Blazing Horned Iron Anvil!)
    if (this.activeAnvil && this.activeAnvil.state === 'flying') {
      const a = this.activeAnvil;
      const col = Math.floor(a.age * 30) % 30;
      this.drawBloomedVfxCell(
        ctx,
        sheet,
        0,
        col,
        a.x - a.dir * 28,
        a.y - 48,
        192,
        192,
        0.88,
        a.dir < 0,
        renderer,
        a.rebounded ? 'emerald' : 'gold'
      );
      this.drawBloomedVfxCell(
        ctx,
        sheet,
        1,
        col,
        a.x,
        a.y - 52,
        208,
        208,
        0.98,
        a.dir < 0,
        renderer,
        a.rebounded ? 'emerald' : 'gold'
      );
    }

    // 5. Foreground 30fps `titan_vfx.png` cell bursts (`Row 0`, `Row 4`, `Row 6`, `Row 7`)
    for (const v of this.activeVfxAnims) {
      if (!v.inFront) continue;
      const u = Math.min(1, Math.max(0, v.age / v.maxLife));
      const span = Math.max(1, v.endFrame - v.startFrame + 1);
      const col = Math.min(29, v.startFrame + Math.floor(u * span));
      const fade = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1.0;
      this.drawBloomedVfxCell(
        ctx,
        sheet,
        v.row,
        col,
        v.x,
        v.y,
        v.w,
        v.h,
        fade * 0.96,
        v.flipX,
        renderer,
        v.glowColor
      );
    }
  }

  /**
   * Spawns ballistic 16-bit Soil Clods, Shattered Granite Boulders & Rolling Dust Plumes.
   */
  triggerSoilRockSplash(originX, groundY, ww = 1200, preset = 'cataclysm') {
    const isBig = preset === 'cataclysm';
    const chunkCount = isBig ? 32 : 12;
    const plumeCount = isBig ? 16 : 6;
    const cx = Math.max(80, Math.min(ww - 80, originX));

    for (let i = 0; i < chunkCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const lane = Math.floor(i / 2) / Math.max(1, Math.floor(chunkCount / 2) - 1);
      // Fan outward left & right (`|vx| >= 95`) so rocks splash in a dramatic wide fountain!
      const speedX = isBig ? 95 + lane * 495 : 65 + lane * 215;
      const speedY = isBig
        ? -(690 - lane * 360 + ((i * 37) % 90))
        : -(340 - lane * 130 + ((i * 29) % 55));
      const size = isBig ? 8 + ((i * 5) % 11) : 5 + ((i * 3) % 6);
      this._soilRockChunks.push({
        x: cx + side * (12 + lane * 34),
        y: groundY - 6 - ((i * 7) % 14),
        vx: side * speedX,
        vy: speedY,
        grav: isBig ? 1520 : 1280,
        size,
        isRock: i % 3 !== 1,
        inFront: i % 2 === 0,
        bounces: 0,
        age: 0,
        maxLife: isBig ? 0.96 + (i % 4) * 0.11 : 0.52 + (i % 3) * 0.08
      });
    }

    for (let i = 0; i < plumeCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const lane = Math.floor(i / 2) / Math.max(1, Math.floor(plumeCount / 2) - 1);
      this._soilDustPlumes.push({
        x: cx + side * (18 + lane * 48),
        y: groundY - 8 - (i % 3) * 8,
        vx: side * (isBig ? 110 + lane * 340 : 75 + lane * 165),
        vy: -(isBig ? 18 + (i % 4) * 12 : 12 + (i % 3) * 8),
        r: isBig ? 18 + ((i * 7) % 16) : 11 + ((i * 5) % 9),
        inFront: i % 3 !== 0,
        age: 0,
        maxLife: isBig ? 0.88 + (i % 4) * 0.10 : 0.46 + (i % 3) * 0.06
      });
    }
  }

  /**
   * Renders 2.5D Stepped 16-Bit Pixel-Art Soil Dust Plumes, Dirt Clods & Shattered Granite Boulders.
   * Uses strictly integer `ctx.fillRect` pixel clusters — ZERO `ctx.rotate` or `quadraticCurveTo`.
   */
  drawSoilRockSplash(ctx, inFront = false) {
    if (!ctx?.fillRect) return;
    const hasPlumes = this._soilDustPlumes?.length > 0;
    const hasChunks = this._soilRockChunks?.length > 0;
    if (!hasPlumes && !hasChunks) return;

    ctx.save();
    // 1. Billowing Low-Ground Soil & Dust Plumes
    for (let i = 0; i < this._soilDustPlumes.length; i++) {
      const p = this._soilDustPlumes[i];
      if (Boolean(p.inFront) !== inFront) continue;
      const u = Math.min(1, p.age / p.maxLife);
      const alpha = u < 0.12 ? u / 0.12 : Math.max(0, 1 - (u - 0.12) / 0.88);
      if (alpha <= 0.03) continue;

      const rad = Math.max(6, Math.round((p.r * (0.65 + 0.65 * u)) / 2) * 2);
      const px = Math.round(p.x / 2) * 2;
      const py = Math.round(p.y / 2) * 2;
      const h = Math.max(6, Math.round(rad * 0.62));

      ctx.globalAlpha = alpha * 0.76;
      ctx.fillStyle = '#362214';
      ctx.fillRect(px - rad, py - Math.round(h * 0.45), rad * 2, h);
      ctx.fillStyle = '#5c3d26';
      ctx.fillRect(px - rad + 2, py - Math.round(h * 0.65), rad * 2 - 4, h - 2);
      ctx.fillStyle = '#8c6240';
      ctx.fillRect(px - Math.round(rad * 0.76), py - Math.round(h * 0.80), Math.round(rad * 1.52), Math.round(h * 0.68));
      ctx.fillStyle = '#c2a37e';
      ctx.fillRect(px - Math.round(rad * 0.52), py - Math.round(h * 0.90), Math.round(rad * 1.04), Math.round(h * 0.42));
    }

    // 2. Faceted Tumbling Granite Boulders & Heavy Wet Soil Clods
    for (let i = 0; i < this._soilRockChunks.length; i++) {
      const c = this._soilRockChunks[i];
      if (Boolean(c.inFront) !== inFront) continue;
      const u = Math.min(1, c.age / c.maxLife);
      const alpha = u > 0.76 ? Math.max(0, (1 - u) / 0.24) : 1.0;
      if (alpha <= 0.03) continue;

      const s = Math.max(4, Math.round(c.size / 2) * 2);
      const hs = Math.round(s * 0.5);
      const cx = Math.round(c.x / 2) * 2;
      const cy = Math.round(c.y / 2) * 2;

      ctx.globalAlpha = alpha * 0.98;
      // 2px Dark Loam-Obsidian Selective Outline (`#120d0a`)
      ctx.fillStyle = '#120d0a';
      ctx.fillRect(cx - hs - 2, cy - hs, s + 4, s);
      ctx.fillRect(cx - hs, cy - hs - 2, s, s + 4);

      // Shadow body (`#292524` dark basalt rock or `#362214` dark wet soil)
      ctx.fillStyle = c.isRock ? '#292524' : '#362214';
      ctx.fillRect(cx - hs, cy - hs, s, s);

      // Midtone plane (`#57534e` granite or `#5c3d26` sienna soil)
      ctx.fillStyle = c.isRock ? '#57534e' : '#5c3d26';
      ctx.fillRect(cx - hs, cy - hs, Math.max(2, s - 2), Math.max(2, s - 2));

      // Upper-lit fracture / soil clod crest (`#a8a29e` stone or `#a67c52` dry earth)
      ctx.fillStyle = c.isRock ? '#a8a29e' : '#a67c52';
      ctx.fillRect(cx - hs + 2, cy - hs, Math.max(2, s - 4), Math.max(2, Math.round(s * 0.45)));
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    const vfxSheet = sprites?.vfx;

    this.drawBehind(ctx, renderer);

    if (vfxSheet?.complete) {
      this.drawActiveAnvilAndQuakes(ctx, vfxSheet, renderer, false);
    }

    // Back-layer 2.5D Soil, Dust & Shattered Bedrock Splash
    this.drawSoilRockSplash(ctx, false);

    // Live 120Hz `ArcaneShaderFX` "back" layer (2.5D Magma Mantle, Khazad Ancestor Spirit, Craters, Ragnarok Waves)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    // Back-orbiting Molten Crucible Cores
    this.drawCrucibleCores(ctx, false);
  }

  /**
   * Renders Torgar's Baseball-Bat Home-Run Comet Trajectory & Speed-Lines across the stage.
   * Uses strictly integer `ctx.fillRect` pixel art — ZERO `ctx.rotate` or `quadraticCurveTo`.
   */
  drawHomeRunTrajectory(ctx) {
    if (!ctx?.fillRect || !this._homeRunSwingStreak) return;
    const st = this._homeRunSwingStreak;
    const u = Math.min(1, st.age / st.maxLife);
    const alpha = u < 0.15 ? u / 0.15 : Math.max(0, 1 - (u - 0.15) / 0.85);
    if (alpha <= 0.02) return;

    const flight = this._homeRunFlights?.[0];
    const endX = flight?.foe
      ? Math.round(flight.foe.x)
      : Math.round(st.startX + (st.targetWallX - st.startX) * Math.min(1, u * 1.4));
    const startX = Math.round(st.startX);
    const minX = Math.min(startX, endX);
    const spanW = Math.max(12, Math.abs(endX - startX));
    const cy = Math.round(st.startY);

    ctx.save();
    ctx.globalAlpha = alpha * 0.82;
    // Crisp warm gold/white air-compression line-drive wake (ZERO green-orange slash beam!)
    ctx.fillStyle = '#0d0f1c';
    ctx.fillRect(minX, cy - 4, spanW, 8);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(minX, cy - 3, spanW, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(minX, cy - 1, spanW, 2);

    // Stepped pixel sonic shock-rings along the home-run trajectory
    const ringCount = Math.min(6, Math.max(2, Math.floor(spanW / 135)));
    for (let i = 1; i <= ringCount; i++) {
      const rx = Math.round(startX + ((endX - startX) * i) / (ringCount + 1));
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(rx - 2, cy - 20, 4, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 1, cy - 16, 2, 32);
    }
    ctx.restore();
  }

  drawUltimateForeground(ctx, renderer = null) {
    // Live 120Hz `ArcaneShaderFX` "front" layer (Ancestor God-Maul, Sparks & Bulwark Dome)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    // Baseball-Bat Home-Run Sonic Trajectory Wake
    this.drawHomeRunTrajectory(ctx);

    // Front-orbiting Molten Crucible Cores
    this.drawCrucibleCores(ctx, true);

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    const vfxSheet = sprites?.vfx;
    if (vfxSheet?.complete) {
      this.drawActiveAnvilAndQuakes(ctx, vfxSheet, renderer, true);
    }

    // Front-layer 2.5D Flying Boulders, Soil Clods & Ground Dust Plumes
    this.drawSoilRockSplash(ctx, true);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    if (!sprites) return;

    const scale = this.giantScale || 1.0;
    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
    const groundPlantOffset = 4;

    // Crisp 2-ghost upward motion trail during Torgar's Super-Ultimate Fast-Jump (`1.20s .. 1.56s`)
    if (
      !isReflection &&
      sprites.sheet?.complete &&
      Array.isArray(this._superJumpTrail) &&
      this._superJumpTrail.length > 0 &&
      ctx?.drawImage
    ) {
      const cols = Math.max(1, Math.round((sprites.sheet.naturalWidth || 6240) / 208));
      for (let gi = 0; gi < this._superJumpTrail.length; gi++) {
        const g = this._superJumpTrail[gi];
        const gCol = g.frameIdx % cols;
        const gRow = (g.frameIdx / cols) | 0;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = gi === 0 ? 0.16 : 0.30;
        ctx.translate(Math.round(g.x), Math.round(g.y + groundPlantOffset));
        ctx.scale(this.facing * scale, scale);
        ctx.drawImage(sprites.sheet, gCol * 208, gRow * 208, 208, 208, -104, -198, w, h);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.translate(
      Math.round(this.x),
      Math.round(this.y + groundPlantOffset)
    );
    ctx.scale(this.facing * scale, scale);

    PixelForge.drawSheetFrame(ctx, sprites, this, w, h, this.walkPhase, isReflection, renderer);

    if (this.hitFlash > 0 && !isReflection) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      PixelForge.drawGhostFrame(ctx, sprites, frameIdx, w, h);
    }

    ctx.restore();
  }
}
