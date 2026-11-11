import { Fighter } from './Fighter.js?v=30fps66';
import { PixelForge } from '../engine/PixelForge.js?v=30fps66';
import { ArcaneShaderFX } from '../engine/ArcaneShaderFX.js?v=30fps66';
import {
  FORGE_EFFECT_REGISTRY,
  FORGE_GOLD_PALETTE,
  FORGE_JADE_PALETTE
} from '../engine/shaders/forgeShaders.js?v=30fps66';

/**
 * Torgar v5 (`titan`) — Sovereign of the World-Forge & Runic Anvil Juggernaut.
 *
 * Full v5 Kit Architecture:
 *   - Passive (`MOLTEN CRUCIBLE & MAGMA BULWARK`):
 *       Builds `0..5` orbiting Khazad Molten Crucible Cores (`this.crucibleStacks`, starts at `2`)
 *       when landing heavy Forge blows or absorbing hits during Magma Bulwark (`forgeArmorTimer > 0`,
 *       `44%` DR + Molten Thorn reflect). At `5` stacks (`MAX TEMPER`), Torgar's next Stage-3
 *       Finisher or `WORLD-ANVIL CATACLYSM` triggers **WORLD-BREAKER TEMPER** (restores HP, refreshes
 *       Magma Bulwark, and erupts a bonus `Row 2` Magma-Jade Volcanic Obelisk).
 *   - 3-Stage Auto (`TRINITY OF THE WORLD-MAUL`):
 *       1. Magnetic Fissure Sweep (`comboStep === 0`): 2H Anvil-Ram Cleave + traveling `Row 0`
 *          Tectonic Magma-Jade Fissure Wave (`390px`) that damages & magnetically wrenches kiting foes inward!
 *       2. Volcanic Horn Uppercut (`comboStep === 1`): 2H Forge Crush + rising Siege-Horn Uppercut
 *          erupting a grounded `Row 2` Magma-Jade Rune Pillar (`+1` Crucible Core).
 *       3. World-Breaker Cataclysm (`comboStep === 2`): Summons the colossal `khazadForgeAncestorAvatar`
 *          spirit behind Torgar for a unison overhead God-Maul Crit slam, triggers World-Breaker Temper
 *          at `5` stacks, and sends a Seismic Resonance detonation through any planted World-Anvil Altar!
 *   - Signature Skill (`WORLD-ANVIL CATACLYSM`):
 *       Plants a persistent **World-Forge Anvil Altar** (`Row 3` 8-Cog Mandala + `Row 1` Horned Iron Anvil,
 *       `4.2s`) with a Magnetic Gravity Slam, then batters a blazing **Ricocheting Anvil Cannonball**
 *       across the arena that rebounds ONCE off the stage wall (`★ ANVIL WALL-RICOCHET! ★`)!
 *   - Overdrive (`RAGNAROK WORLD-FORGE`, `5.0s`):
 *       Ascends to `3.0x` Colossal World-Forge Demi-God scale across `5.0s` (`6` multi-fault volcanic
 *       caldera eruptions + Anvil Altar resonance).
 *   - Supreme Ultimate (`GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER`, `4.55s`):
 *       Localized volcanic twilight dim (zero stage background overrides), summons the `Row 5` Colossal
 *       World-Forge Crucible Altar flanked by Twin `Row 2` Obelisks binding all active foes, delivers
 *       two rhythmic `Row 6` + Ancestor Tempering Strikes (`0` micro-ticks), then sky-leaps for ONE
 *       instantaneous `735`-Crit Continental Sunder burst + `7` full-stage `Row 7` Volcanic Geysers!
 */
export class Titan extends Fighter {
  constructor(x, groundY, facing = 1) {
    const opts = typeof x === 'object' && x !== null ? x : { x, groundY, facing };
    super({
      ...opts,
      name: opts.name || 'Torgar',
      maxHp: 4390,
      moveSpeed: 192,
      attackRange: 200,
      autoInterval: 0.94,
      lightColor: 'rgba(245, 158, 11, 1)',
      primaryColor: '#f59e0b'
    });
    this.heroId = 'titan';
    this.deathSfx = 'death_titan';
    this.skillName = 'WORLD-ANVIL CATACLYSM';
    this.ultName = 'RAGNAROK WORLD-FORGE';
    this.hasTrueUltimate = true;
    this.trueUltName = 'GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER';
    this.trueUltDuration = 4.55;
    this._trueUltStep = 0;
    this._trueUltAnvilX = 600;
    this._trueUltGeyserTimer = 0;
    this.theme = 'forge';
    this.hasPoise = true;
    this.unstoppablePoise = false;
    this.skillTriggerRange = 465;
    this.skillMaxCooldown = 4.85;
    this.dashMaxCooldown = 2.75;
    this.autoDuration = 0.88;
    this.skillDuration = 0.94;
    this.ultDuration = 5.0;
    this.crouchDuration = 0.80;
    this.dashDuration = 0.42;
    this.comboStep = 0;
    this._activeComboStage = 0;
    this.stepDustTimer = 0;

    // Torgar v5 Sovereign Mechanics:
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

    // 5. Traveling Tectonic Magma-Jade Fissure Waves (`Row 0`, Stage-1 Auto magnetic pull wave)
    this.fissureWaves = [];

    // 6. Khazad Forge-God Ancestor Spirit manifestation timer
    this.ancestorSpiritTimer = 0;

    // 7. Giant Titan Scale during Ragnarok Overdrive & Continental Sunder
    this.giantScale = 1.0;

    // 8. Active 30fps `titan_vfx.png` cell animations
    this.activeVfxAnims = [];

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
      if (titanAssets?.sheet?.src && !titanAssets.sheet.src.includes('v=30fps66')) {
        titanAssets.sheet.src = 'assets/sprites/titan_sheet.png?v=30fps66';
      }
      if (titanAssets?.vfx?.src && !titanAssets.vfx.src.includes('v=30fps66')) {
        titanAssets.vfx.src = 'assets/sprites/titan_vfx.png?v=30fps66';
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
    this.crucibleStacks = Math.max(0, this.crucibleStacks - 3);
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.85);
    this.heal(48, 'WORLD-BREAKER TEMPER');

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
        t.takeDamage(30, this, true, 110 * this.facing, -185);
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
    if (newState === 'AUTO_ATTACK') {
      this._activeComboStage = this.comboStep;
    }
    super.setState(newState);
    if (newState !== 'ULTIMATE' && newState !== 'TRUE_ULTIMATE') {
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this._ultCastTriggered = false;
      this._ultWaveStep = 0;
      this.trueUltFrameOverride = null;
    }
    if (newState === 'TRUE_ULTIMATE') {
      this._trueUltStep = 0;
      this._trueUltGeyserTimer = 0;
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
    if (this.comboStep === 0) return 245;
    if (this.comboStep === 2) return 232;
    return 204;
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
    if (this.isDead || this.state === 'DEATH') {
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
    this._crucibleOrbitPhase += dt * (this.crucibleStacks >= this.maxCrucibleStacks ? 4.4 : 2.8);

    if (this.isDead) {
      this.worldAnvilAltar = null;
      this.activeAnvil = null;
      this.fissureWaves.length = 0;
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
        for (const t of this.getActiveEnemies(enemy, game)) {
          if (Math.abs(t.x - altar.x) <= 185) {
            const pullSign = altar.x >= t.x ? 1 : -1;
            t.x = Math.max(65, Math.min(ww - 65, t.x + pullSign * 28));
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
        if (a.trailAccum >= 0.032) {
          a.trailAccum = 0;
          this.fx?.burst(a.x - a.dir * 20, a.y - 42, {
            count: 3,
            speedMin: 35,
            speedMax: 110,
            lifeMin: 0.14,
            lifeMax: 0.28,
            gravity: 45,
            angle: a.dir >= 0 ? Math.PI : 0,
            spread: 0.85,
            colors: ['#ffffff', '#fde047', '#f59e0b', '#10b981']
          });
        }

        const ww = game.renderer ? game.renderer.worldWidth : 1200;
        const targets = this.getActiveEnemies(enemy, game);
        for (const t of targets) {
          if (!a.hitTargets.has(t) && Math.abs(t.x - a.x) < 66 && Math.abs(t.y - a.y) < 110) {
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
              w: 224,
              h: 224,
              maxLife: 0.40,
              flipX: a.dir < 0,
              glowColor: a.rebounded ? 'emerald' : 'gold',
              inFront: true
            });

            if (t.x <= 185 || t.x >= ww - 185) {
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
        if ((a.x <= 64 || a.x >= ww - 64) && a.bouncesLeft > 0) {
          a.bouncesLeft -= 1;
          a.rebounded = true;
          a.x = Math.max(66, Math.min(ww - 66, a.x));
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
          this.spawnSheetBurst(4, a.x, a.y - 54, {
            w: 212,
            h: 212,
            maxLife: 0.36,
            flipX: a.dir < 0,
            glowColor: 'emerald',
            inFront: true
          });
        } else if (a.x < 36 || a.x > ww - 36 || a.age > 2.35) {
          this.fx?.spawn('moltenAnvilSparks', a.x, a.y - 38, {
            flip: a.dir < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.22
          });
          this.spawnSheetBurst(4, a.x, a.y - 52, {
            w: 204,
            h: 204,
            maxLife: 0.34,
            flipX: a.dir < 0,
            glowColor: 'gold',
            inFront: true
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
        this.fx?.burst(this.x - this.facing * 14, this.groundY - 2, {
          count: 5,
          speedMin: 25,
          speedMax: 75,
          gravity: 65,
          colors: ['#fde047', '#f59e0b', '#10b981']
        });
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
    this.forgeArmorTimer = 1.65;
    this.gainCrucibleCore(1, game);
    this.heal(26, 'FORGE TEMPER');
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
          this.fx?.spawn('forgeHammerArc', this.x + this.facing * 52, this.y - 82, {
            flip: this.facing < 0,
            palette: FORGE_GOLD_PALETTE,
            light: 1.2,
            extra: { radius: 28, width: 10.5, isFinisher: false }
          });
          this.spawnSheetBurst(4, foe.x, foe.y - 68, {
            w: 196,
            h: 196,
            maxLife: 0.34,
            flipX: this.facing < 0,
            glowColor: 'gold',
            inFront: true
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
   * 3-Stage Escalating Auto (`TRINITY OF THE WORLD-MAUL`):
   *   - Stage 0 (`MAGNETIC FISSURE SWEEP`): Cleave + traveling `Row 0` Magnetic Fissure Wave (`390px`)
   *   - Stage 1 (`VOLCANIC HORN UPPERCUT`): Crush + rising Siege-Horn Uppercut & `Row 2` Magma-Jade Pillar (`+1` Core)
   *   - Stage 2 (`WORLD-BREAKER CATACLYSM`): Manifests `khazadForgeAncestorAvatar` + God-Maul Crit Slam +
   *     World-Breaker Temper (`5` stacks) + Seismic Resonance into `worldAnvilAltar`!
   */
  updateAutoAttack(_dt, enemy, game) {
    const t = this.stateTimer;
    const dir = this.facing;
    const stage = this._activeComboStage || 0;
    const impactX = this.x + dir * 124;
    const impactY = this.groundY - 6;

    if (t < 0.25) {
      this.armAngle = -2.35;
    }

    // Strike 1 (`t >= 0.26`)
    if (t >= 0.26 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.vx = dir * (stage === 2 ? 126 : 108);
      this.armVel = 34;

      if (game?.audio) game.audio.play('heavy_cleave', impactX);
      game?.renderer?.triggerShake?.(stage === 2 ? 9 : 7, 0.16);

      if (stage === 2) {
        // Stage 3 Windup: Manifest the towering Khazad Forge-Ancestor behind Torgar!
        this.manifestAncestorAvatar(0.68, 1.44);
      }

      this.fx?.spawn('forgeHammerArc', this.x + dir * 64, this.y - 84, {
        flip: dir < 0,
        palette: stage === 2 ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: 1.26,
        extra: {
          radius: stage === 2 ? 32 : 30,
          width: 11.2,
          flipAngle: false,
          isFinisher: stage === 2
        }
      });

      if (stage === 0) {
        // Stage 1 Special: Launch traveling `Row 0` Tectonic Magma-Jade Fissure Wave!
        this.spawnFissureWave(this.x + dir * 92, dir);
      } else {
        this.spawnSheetBurst(0, impactX, impactY - 54, {
          w: 196,
          h: 196,
          maxLife: 0.34,
          flipX: dir < 0,
          glowColor: stage === 2 ? 'emerald' : 'gold',
          inFront: true
        });
      }

      let landed = false;
      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - this.x) <= 224) {
          const isCrit = Math.random() < 0.22;
          const dmg = (stage === 2 ? 45 : 39) * (isCrit ? 1.30 : 1);
          foe.takeDamage(dmg, this, isCrit, -dir * 50, -104);
          landed = true;
        }
      }
      if (landed) {
        this.gainMana(2.8);
      }
    }

    // Strike 2 (`t >= 0.64`)
    if (t >= 0.64 && !this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const isFinisher = stage === 2;
      this.comboStep = (stage + 1) % 3;
      this.vx = dir * (isFinisher ? 148 : 118);

      if (game?.audio) game.audio.play('thunder_slam', impactX);
      game?.renderer?.triggerShake?.(isFinisher ? 12 : 8, 0.20);

      this.fx?.spawn('forgeHammerArc', this.x + dir * 68, this.y - 88, {
        flip: dir < 0,
        palette: stage >= 1 ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: 1.34,
        extra: {
          radius: isFinisher ? 35 : 32,
          width: isFinisher ? 12.8 : 11.8,
          flipAngle: true,
          isFinisher
        }
      });
      this.fx?.spawn('moltenAnvilSparks', impactX, impactY - 48, {
        flip: dir < 0,
        palette: isFinisher ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: 1.30
      });

      if (stage === 1) {
        // Stage 2 Rising Volcanic Siege-Horn Uppercut: Erupt grounded `Row 2` Magma-Jade Rune Pillar!
        const pillarX =
          enemy && !enemy.isDead && Math.abs(enemy.x - this.x) <= 245 ? enemy.x : impactX;
        this.spawnSheetBurst(2, pillarX, this.groundY - 82, {
          w: 216,
          h: 216,
          maxLife: 0.46,
          flipX: dir < 0,
          glowColor: 'emerald',
          inFront: false
        });
      } else {
        this.spawnSheetBurst(4, impactX, impactY - 62, {
          w: isFinisher ? 228 : 208,
          h: isFinisher ? 228 : 208,
          maxLife: 0.38,
          flipX: dir < 0,
          glowColor: isFinisher ? 'emerald' : 'gold',
          inFront: true
        });
      }

      if (isFinisher) {
        this.fx?.spawn('tectonicCraterSlam', impactX, this.groundY - 4, {
          flip: dir < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.36,
          extra: { maxRx: 145 }
        });
      }

      let landed = false;
      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - this.x) <= (isFinisher ? 246 : 236)) {
          const isCrit = isFinisher || Math.random() < 0.25;
          const base = isFinisher ? 62 : stage === 1 ? 47 : 41;
          const dmg = base * (isCrit ? 1.30 : 1);
          foe.takeDamage(
            dmg,
            this,
            isCrit,
            dir * (isFinisher ? 165 : 90),
            isFinisher ? -210 : stage === 1 ? -175 : -135
          );
          if (isFinisher) {
            game?.vfx?.spawnDamageText?.(
              foe.x,
              foe.y - 164,
              0,
              true,
              '★ WORLD-BREAKER SLAM! ★',
              '#10b981'
            );
          } else if (stage === 1) {
            game?.vfx?.spawnDamageText?.(
              foe.x,
              foe.y - 154,
              0,
              false,
              'VOLCANIC SPIRE!',
              '#fbbf24'
            );
          }
          landed = true;
        }
      }

      if (landed) {
        this.gainMana(3.0);
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

    if (t >= (this.autoDuration || 0.88)) {
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
      for (const foe of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(foe.x - anvilX) <= 205) {
          const pullSign = anvilX >= foe.x ? 1 : -1;
          foe.x = Math.max(70, Math.min(ww - 70, foe.x + pullSign * 38));
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
   * Overdrive (`ULTIMATE` — `RAGNAROK WORLD-FORGE`, `5.0s`):
   *   - Maintains `3.0x` Colossal World-Forge Sovereign scale across the `5.0s` Overdrive
   *     (`peakScale = 3.00`, `scaleAt4s = 3.00`), maxes `5` Crucible Cores, and marches forward
   *     unleashing `6` multi-fault volcanic hammer eruptions + World-Anvil Altar resonance!
   */
  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.ultDuration || 5.0;
    const dir = this.facing;
    const grow = Math.min(1, t / 0.28);
    const shrink = t > dur - 0.32 ? Math.max(0, (dur - t) / 0.32) : 1;
    const smoothGrow = grow * grow * (3 - 2 * grow);
    this.giantScale = 1.0 + 2.0 * smoothGrow * shrink;
    this.forgeArmorTimer = Math.max(this.forgeArmorTimer, 0.55);

    const cycleStep = Math.min(29, Math.floor((t * 18) % 30));
    this.trueUltFrameOverride = 120 + cycleStep;

    const foes = this.getActiveEnemies(enemy, game);
    const leadFoe =
      foes.length > 0
        ? foes.reduce((best, f) =>
            Math.abs(f.x - this.x) < Math.abs(best.x - this.x) ? f : best
          )
        : enemy;
    if (leadFoe && !leadFoe.isDead) {
      this.facing = leadFoe.x >= this.x ? 1 : -1;
      const dist = Math.abs(leadFoe.x - this.x);
      if (dist > 175) {
        this.x += this.facing * 230 * dt;
      }
    }
    this.walkPhase += dt * 7.5;
    this.headBob = Math.abs(Math.sin(this.walkPhase)) * 5.5;

    // 1. Initial Anvil Ignition (`t >= 0.06`)
    if (t >= 0.06 && !this._ultCastTriggered) {
      this._ultCastTriggered = true;
      this._ultWaveStep = 0;
      this.crucibleStacks = this.maxCrucibleStacks;
      this.manifestAncestorAvatar(1.15, 1.5);
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          this.ultName,
          '★ RAGNAROK WORLD-FORGE (5S) ★',
          'forge',
          true
        );
      }
      if (game?.renderer) {
        game.renderer.triggerShake(16, 0.28);
        game.renderer.triggerAberration(6);
      }
      this.fx?.spawn('runicBulwarkDome', this.x, this.y - 140, {
        follow: this,
        offsetX: 0,
        offsetY: -140,
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.48,
        maxDuration: 4.8
      });
      this.fx?.spawn('tectonicCraterSlam', this.x, this.groundY - 4, {
        flip: dir < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.42,
        extra: { maxRx: 175 }
      });
    }

    const triggerCataclysmicFaultEruption = (waveIdx) => {
      const localWave = ((waveIdx - 1) % 3) + 1;
      const stride = 165 + (localWave - 1) * 95;
      const ww = game?.renderer ? game.renderer.worldWidth : 1200;
      const impactX = Math.max(95, Math.min(ww - 95, this.x + this.facing * stride));
      const impactY = this.groundY - 4;
      if (game?.audio) {
        game.audio.play('thunder_slam', impactX);
      }
      game?.renderer?.triggerShake?.(22 + localWave * 4, 0.36);
      game?.renderer?.triggerAberration?.(8 + localWave * 2);

      if (waveIdx === 3 || waveIdx === 6) {
        this.manifestAncestorAvatar(0.85, 1.5);
      }

      this.fx?.spawn('ragnarokWorldForgeWave', impactX, impactY, {
        flip: this.facing < 0,
        palette: waveIdx % 2 === 0 ? FORGE_JADE_PALETTE : FORGE_GOLD_PALETTE,
        light: 1.5,
        extra: { stage: localWave }
      });
      this.fx?.spawn('tectonicCraterSlam', impactX, impactY, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.44,
        extra: { maxRx: 185 }
      });

      const leftOffset = waveIdx % 2 === 1 ? -88 : 92;
      const rightOffset = waveIdx % 2 === 1 ? 92 : -88;
      this.spawnSheetBurst(2, impactX + this.facing * leftOffset, impactY - 98, {
        w: 320,
        h: 320,
        maxLife: 0.58,
        flipX: this.facing < 0,
        glowColor: 'emerald',
        inFront: false
      });
      this.spawnSheetBurst(4, impactX + this.facing * rightOffset, impactY - 92, {
        w: 336,
        h: 336,
        maxLife: 0.54,
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: true
      });

      for (const target of this.getActiveEnemies(enemy, game)) {
        if (Math.abs(target.x - impactX) <= 360 || waveIdx >= 5) {
          target.takeDamage(
            waveIdx >= 5 ? 72 : 54,
            this,
            true,
            waveIdx >= 5 ? 285 : -70,
            waveIdx >= 5 ? -265 : -165
          );
        }
      }

      this.triggerAnvilResonance(enemy, game, 32);
    };

    const waveTimes = [0.52, 1.25, 1.98, 2.72, 3.48, 4.24];
    for (let i = 0; i < waveTimes.length; i++) {
      if (t >= waveTimes[i] && (this._ultWaveStep || 0) < i + 1) {
        this._ultWaveStep = i + 1;
        triggerCataclysmicFaultEruption(i + 1);
      }
    }

    if (t >= dur) {
      this._ultWaveStep = 0;
      this.trueUltFrameOverride = null;
      this.giantScale = 1.0;
      this.setState('IDLE');
    }
  }

  /**
   * 3-Overdrive Supreme Ultimate (`state === 'TRUE_ULTIMATE'`, `4.55s`):
   * "GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER"
   * - NEVER overrides or alters stage background images (`trueUltStageOverride === null`).
   * - Phase 1 (`0.00s .. 1.20s`): Summons the `Row 5` Colossal World-Forge Crucible Altar flanked by
   *   Twin `Row 2` Volcanic Obelisks, grows Torgar to `2.45x`, maxes `5` Crucible Cores, and binds
   *   ALL active enemies toward `_trueUltAnvilX` with molten runic forge-chains.
   * - Phase 2 (`t >= 1.45s` & `t >= 2.25s`): Rhythmic God-Hammer Tempering Strikes (`Row 6` +
   *   `khazadForgeAncestorAvatar`, ZERO chip damage micro-ticks).
   * - Phase 3 (`t >= 3.20s`): Torgar sky-leaps and shatters the Crucible in ONE SINGLE CATACLYSMIC
   *   `735`-Crit burst across all active enemies + `16%` Max HP heal + `7` full-stage `Row 7` Geysers!
   */
  updateTrueUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const dur = this.trueUltDuration || 4.55;
    this.isInvulnerable = true;
    this.vx = 0;
    this.vy = 0;
    this.hasPoise = true;
    this.unstoppablePoise = true;

    if (this._trueUltStep >= 4 && this._trueUltGeyserTimer > 0) {
      this._trueUltGeyserTimer = Math.max(0, this._trueUltGeyserTimer - dt);
    }

    const activeFoes = this.getActiveEnemies(enemy, game);

    // Phase 1 (`0.00s .. 1.20s` — Summoning the World-Forge Crucible Altar)
    if (this._trueUltStep < 1) {
      const anchorFoe = activeFoes[0] || enemy;
      this._trueUltAnvilX = anchorFoe
        ? Math.max(250, Math.min(950, anchorFoe.x))
        : Math.max(250, Math.min(950, this.x + this.facing * 190));
    }

    if (t >= 0.04 && this._trueUltStep < 1) {
      this._trueUltStep = 1;
      this.forgeArmorTimer = 6.0;
      this.crucibleStacks = this.maxCrucibleStacks;
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
        this.y - 180,
        0,
        true,
        '★ GOD-HAMMER MJOLNIR! ★',
        '#f97316'
      );

      this.fx?.spawn('runicBulwarkDome', this.x, this.y - 125, {
        follow: this,
        offsetX: 0,
        offsetY: -125,
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.45,
        maxDuration: 4.4
      });
      this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.42,
        extra: { maxRx: 172 }
      });
      this.spawnSheetBurst(5, this._trueUltAnvilX, this.groundY - 110, {
        w: 332,
        h: 332,
        maxLife: 3.16,
        flipX: this.facing < 0,
        glowColor: 'gold',
        inFront: false
      });
    }

    // Magnetically bind ALL active enemies into the Crucible Anvil before the sunder blow!
    if (t < 3.20) {
      for (const foe of activeFoes) {
        foe.x += (this._trueUltAnvilX - foe.x) * Math.min(1, dt * 6.5);
      }
      this.facing = this._trueUltAnvilX >= this.x ? 1 : -1;
    }

    if (t < 1.20) {
      const u = Math.max(0, Math.min(1, t / 0.65));
      const ease = u * u * (3 - 2 * u);
      this.giantScale = 1.0 + 1.45 * ease;
      const standX = Math.max(95, Math.min(1105, this._trueUltAnvilX - this.facing * 95));
      this.x += (standX - this.x) * Math.min(1, dt * 10);
      this.y = this.groundY;
      this.trueUltFrameOverride = 120 + Math.min(7, Math.floor((t / 1.20) * 8));
      return;
    }

    // Phase 2 (`t >= 1.45s` Strike 1 & `t >= 2.25s` Strike 2 — Rhythmic God-Hammer Tempering Strikes)
    if (t < 3.20) {
      this.giantScale = 2.45;
      const standX = Math.max(95, Math.min(1105, this._trueUltAnvilX - this.facing * 95));
      this.x += (standX - this.x) * Math.min(1, dt * 10);

      if (t >= 1.45 && this._trueUltStep < 2) {
        this._trueUltStep = 2;
        game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
        game?.audio?.play?.('thunder_slam', this._trueUltAnvilX);
        game?.renderer?.shake?.(14, 0.25);
        game?.renderer?.triggerShake?.(14, 0.25);
        game?.vfx?.spawnDamageText?.(
          this._trueUltAnvilX,
          this.groundY - 190,
          0,
          true,
          'TEMPERING STRIKE I!',
          '#fbbf24'
        );
        this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
          flip: this.facing < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.4,
          extra: { maxRx: 158 }
        });
        this.fx?.spawn('moltenAnvilSparks', this._trueUltAnvilX, this.groundY - 82, {
          flip: this.facing < 0,
          palette: FORGE_GOLD_PALETTE,
          light: 1.38
        });
        this.spawnSheetBurst(6, this._trueUltAnvilX, this.groundY - 120, {
          w: 340,
          h: 340,
          maxLife: 0.56,
          flipX: this.facing < 0,
          glowColor: 'gold',
          inFront: true
        });
      }

      if (t >= 2.25 && this._trueUltStep < 3) {
        this._trueUltStep = 3;
        this.manifestAncestorAvatar(1.15, 1.55);
        game?.audio?.play?.('parry_clang', this._trueUltAnvilX);
        game?.audio?.play?.('thunder_slam', this._trueUltAnvilX);
        game?.renderer?.shake?.(15, 0.26);
        game?.renderer?.triggerShake?.(15, 0.26);
        game?.vfx?.spawnDamageText?.(
          this._trueUltAnvilX,
          this.groundY - 198,
          0,
          true,
          'TEMPERING STRIKE II — KHAZAD AWAKENS!',
          '#10b981'
        );
        this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.46,
          extra: { maxRx: 172 }
        });
        this.fx?.spawn('moltenAnvilSparks', this._trueUltAnvilX, this.groundY - 86, {
          flip: this.facing < 0,
          palette: FORGE_JADE_PALETTE,
          light: 1.44
        });
        this.spawnSheetBurst(6, this._trueUltAnvilX, this.groundY - 120, {
          w: 348,
          h: 348,
          maxLife: 0.62,
          flipX: this.facing < 0,
          glowColor: 'emerald',
          inFront: true
        });
      }

      if (t >= 2.20 && t < 3.18) {
        const leapU = Math.max(0, Math.min(1, (t - 2.20) / 0.98));
        this.y = this.groundY - Math.sin(leapU * Math.PI) * 142;
        this.trueUltFrameOverride = 136 + Math.min(4, Math.floor(leapU * 5));
      } else {
        this.y = this.groundY;
        const strikeU = Math.max(0, Math.min(1, (t - 1.20) / 1.0));
        this.trueUltFrameOverride = 128 + Math.min(7, Math.floor(strikeU * 8));
      }
      return;
    }

    // Phase 3 (`t >= 3.20s`, `_trueUltStep < 4` — 3rd Apocalyptic Blow: Continental Sunder)
    if (this._trueUltStep < 4) {
      this._trueUltStep = 4;
      this._trueUltGeyserTimer = 1.05;
      this.y = this.groundY;
      this.trueUltFrameOverride = 120 + 21;

      game?.renderer?.triggerImpactFrame?.(0.12, this._trueUltAnvilX, this.groundY - 96, 'forge');
      if (game?.renderer && game.renderer.impactFrameTimer > 1) {
        game.renderer.triggerImpactFrame?.(this._trueUltAnvilX, this.groundY - 96, 0.12, 'forge');
      }
      game?.renderer?.shake?.(30, 0.80);
      game?.renderer?.triggerShake?.(30, 0.80);
      game?.renderer?.flash?.(0.32, '#fff7ed');
      game?.renderer?.triggerAberration?.(16);
      game?.renderer?.triggerHitStop?.(0.09);

      game?.audio?.play?.('ult_cast', this._trueUltAnvilX);
      game?.audio?.play?.('earthshatter', this._trueUltAnvilX);
      game?.audio?.play?.('parry_clang', this._trueUltAnvilX);

      this.heal(Math.round(this.maxHp * 0.12), 'WORLD-FORGE TEMPER');
      this.forgeArmorTimer = 2.4;
      this.crucibleStacks = this.maxCrucibleStacks;

      this.fx?.spawn('ragnarokWorldForgeWave', this._trueUltAnvilX, this.groundY - 4, {
        flip: this.facing < 0,
        palette: FORGE_GOLD_PALETTE,
        light: 1.55,
        extra: { stage: 3 }
      });
      this.fx?.spawn('tectonicCraterSlam', this._trueUltAnvilX, this.groundY - 4, {
        flip: this.facing < 0,
        palette: FORGE_JADE_PALETTE,
        light: 1.52,
        extra: { maxRx: 215 }
      });

      for (let i = 0; i < 7; i++) {
        const gx = 120 + i * 160;
        this.spawnSheetBurst(7, gx, this.groundY - 145, {
          w: 240,
          h: 340,
          maxLife: 1.05,
          flipX: i % 2 === 1,
          glowColor: i % 2 === 0 ? 'gold' : 'emerald',
          inFront: i % 2 === 0
        });
      }

      game?.vfx?.spawnDamageText?.(
        this._trueUltAnvilX,
        this.groundY - 210,
        0,
        true,
        '★ CONTINENTAL SUNDER! ★',
        '#f97316'
      );

      // SINGLE CATACLYSMIC INSTANT BURST of 735 Crit damage to all active enemies!
      for (const foe of activeFoes) {
        foe.takeDamage(735, this, true, 340, -290);
      }
    }

    // Phase 4 (`3.20s .. 4.55s` — Smoothly ease `giantScale` back to `1.0` and return to `IDLE`)
    this.y = this.groundY;
    const postU = Math.max(0, Math.min(1, (t - 3.20) / Math.max(0.01, dur - 3.20)));
    const easeBack = postU * postU * (3 - 2 * postU);
    this.giantScale = 2.45 - 1.45 * easeBack;

    if (t < 3.85) {
      const slamFrameU = Math.max(0, Math.min(1, (t - 3.20) / 0.65));
      this.trueUltFrameOverride = 120 + 21 + Math.min(4, Math.floor(slamFrameU * 5));
    } else {
      const recU = Math.max(0, Math.min(1, (t - 3.85) / Math.max(0.01, dur - 3.85)));
      this.trueUltFrameOverride = 120 + 26 + Math.min(3, Math.floor(recU * 4));
    }

    if (t >= dur) {
      this.y = this.groundY;
      this.giantScale = 1.0;
      this.isInvulnerable = false;
      this.trueUltFrameOverride = null;
      this._trueUltGeyserTimer = 0;
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
    const dur = this.trueUltDuration || 4.55;
    const ww = renderer?.worldWidth || 1200;

    // Localized volcanic crucible twilight dim (NEVER overrides stage background image!)
    if (ctx?.fillRect) {
      const envAlpha =
        t < 0.35 ? t / 0.35 : t > dur - 0.55 ? Math.max(0, (dur - t) / 0.55) : 1.0;
      ctx.save();
      ctx.fillStyle = `rgba(18, 8, 4, ${(0.44 * envAlpha).toFixed(3)})`;
      ctx.fillRect(0, 0, ww, this.groundY + 140);
      ctx.fillStyle = `rgba(245, 158, 11, ${(0.14 * envAlpha).toFixed(3)})`;
      ctx.fillRect(0, this.groundY - 12, ww, 16);
      ctx.restore();
    }

    if (t >= 3.20) return;

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    const vfxSheet = sprites?.vfx;
    const col = Math.floor(t * 30) % 30;
    const ax = this._trueUltAnvilX || 600;
    const ay = this.groundY - 110;

    // Twin Flanking `Row 2` Volcanic Forge Obelisks framing the Crucible Arena
    if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
      for (const side of [-1, 1]) {
        const ox = Math.max(85, Math.min(ww - 85, ax + side * 215));
        this.drawBloomedVfxCell(
          ctx,
          vfxSheet,
          2,
          (col + (side > 0 ? 9 : 0)) % 30,
          ox,
          this.groundY - 96,
          236,
          252,
          0.92,
          side < 0,
          renderer,
          'emerald'
        );
      }

      // Central `Row 5` Colossal World-Forge Crucible Anvil Altar (`336x336`)
      this.drawBloomedVfxCell(
        ctx,
        vfxSheet,
        5,
        col,
        ax,
        ay,
        336,
        336,
        0.97,
        this.facing < 0,
        renderer,
        'gold'
      );
    } else if (vfxSheet && ctx?.drawImage) {
      ctx.save();
      ctx.drawImage(vfxSheet, col * 208, 5 * 208, 208, 208, ax - 168, ay - 168, 336, 336);
      ctx.restore();
    }

    // Molten Runic Forge-Chains binding active enemies to the Crucible Anvil
    const foes = this.game ? this.getActiveEnemies(null, this.game) : [];
    for (const foe of foes) {
      this.drawPixelForgeChain(ctx, ax, this.groundY - 64, foe.x, foe.y - 68, t);
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

    const glowSprite =
      glowColor === 'emerald'
        ? renderer?.glowEmerald || renderer?.glowGold || renderer?.glowOrange
        : renderer?.glowGold || renderer?.glowOrange;
    if (glowSprite) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * 0.38);
      const gw = Math.round(w * 1.15);
      const gh = Math.round(h * 1.15);
      ctx.drawImage(glowSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.44);
    ctx.drawImage(vfxSheet, sx, sy, cell, cell, -w * 0.5, -h * 0.5, w, h);

    ctx.restore();
  }

  /**
   * Stamps active 30fps `titan_vfx.png` rows accurately mapped to `build_titan_vfx_30fps.mjs`:
   * - Row 0: `tectonicMagmaWaveCell` (Traveling Tectonic Magma-Jade Fissure Wave)
   * - Row 1: `runicIronForgeAnvilCell` (Horned Khazad Iron Forge-Anvil construct & cannonball)
   * - Row 2: `tectonicMagmaPillarCell` (Erupting Magma-Jade Volcanic Rune Obelisk)
   * - Row 3: `worldForgeAnvilSealCell` (8-Cog Sovereign World-Forge Crucible Mandala)
   * - Row 4: `cataclysmCraterNovaCell` (Molten Hammer Star-Crater Shock-Ring Nova)
   * - Row 5: `worldForgeCrucibleAltarCell` (Colossal World-Forge Crucible Altar)
   * - Row 6: `godHammerLightningStrikeCell` (God-Hammer Lightning-Magma Strike Arc)
   * - Row 7: `continentalSunderGeyserCell` (Continental Sunder Volcanic Rune Geysers)
   */
  drawActiveAnvilAndQuakes(ctx, vfxSheet = null, renderer = null, inFront = false) {
    const sheet =
      vfxSheet || (typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan?.vfx : null);
    if (!sheet || !sheet.complete) return;

    if (!inFront) {
      // 1. Background 30fps `titan_vfx.png` cell animations (`Row 2` Pillars & `Row 3` Seals)
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
          fade * 0.94,
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

  drawForegroundOverlay(ctx, renderer = null) {
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    const vfxSheet = sprites?.vfx;

    this.drawBehind(ctx, renderer);

    if (vfxSheet?.complete) {
      this.drawActiveAnvilAndQuakes(ctx, vfxSheet, renderer, false);
    }

    // Live 120Hz `ArcaneShaderFX` "back" layer (2.5D Magma Mantle, Khazad Ancestor Spirit, Craters, Ragnarok Waves)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'back', arenaCenterX, this.groundY, 0.96);

    // Back-orbiting Molten Crucible Cores
    this.drawCrucibleCores(ctx, false);
  }

  drawUltimateForeground(ctx, renderer = null) {
    // Live 120Hz `ArcaneShaderFX` "front" layer (World-Breaker Cleaves, Ancestor God-Maul, Sparks & Bulwark Dome)
    const arenaCenterX = renderer?.worldWidth ? renderer.worldWidth * 0.5 : 600;
    this.fx.renderLayer(ctx, 'front', arenaCenterX, this.groundY, 0.98);

    // Front-orbiting Molten Crucible Cores
    this.drawCrucibleCores(ctx, true);

    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    const vfxSheet = sprites?.vfx;
    if (!vfxSheet?.complete) return;

    this.drawActiveAnvilAndQuakes(ctx, vfxSheet, renderer, true);
  }

  draw(ctx, isReflection = false, renderer = null) {
    const sprites = typeof Image !== 'undefined' ? PixelForge.initAssets()?.titan : null;
    if (!sprites) return;
    const vfxSheet = sprites.vfx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const scale = this.giantScale || 1.0;
    const w = 208;
    const h = 208;
    const frameIdx = PixelForge.getFrameIndex(this, this.walkPhase);
    const groundPlantOffset = 4;

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

    if (!isReflection && this.state === 'TRUE_ULTIMATE') {
      const t = this.stateTimer || 0;
      const ax = this._trueUltAnvilX || 600;
      if (t >= 1.45 && t < 3.20) {
        const col = Math.floor(t * 30) % 30;
        const ay = this.groundY - 120;
        if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            6,
            col,
            ax,
            ay,
            344,
            344,
            0.95,
            this.facing < 0,
            renderer,
            this._trueUltStep >= 3 ? 'emerald' : 'gold'
          );
        } else if (vfxSheet && ctx?.drawImage) {
          ctx.save();
          ctx.drawImage(vfxSheet, col * 208, 6 * 208, 208, 208, ax - 172, ay - 172, 344, 344);
          ctx.restore();
        }
      }
    }

    // Erupt 7 full-stage `titan_vfx.png` Row 7 (Continental Sunder Volcanic Rune Geysers, 240x340) across the 1200px arena
    if (!isReflection && this._trueUltGeyserTimer > 0) {
      const u = Math.max(0, Math.min(1, 1 - this._trueUltGeyserTimer / 1.05));
      const baseCol = Math.min(29, Math.floor(u * 30));
      const fade = this._trueUltGeyserTimer < 0.22 ? this._trueUltGeyserTimer / 0.22 : 1.0;
      for (let i = 0; i < 7; i++) {
        const gx = 120 + i * 160;
        const gy = this.groundY - 145;
        const col = (baseCol + i * 2) % 30;
        if (vfxSheet && vfxSheet.complete && vfxSheet.naturalWidth) {
          this.drawBloomedVfxCell(
            ctx,
            vfxSheet,
            7,
            col,
            gx,
            gy,
            240,
            340,
            fade * 0.96,
            i % 2 === 1,
            renderer,
            i % 2 === 0 ? 'gold' : 'emerald'
          );
        } else if (vfxSheet && ctx?.drawImage) {
          ctx.save();
          ctx.drawImage(vfxSheet, col * 208, 7 * 208, 208, 208, gx - 120, gy - 170, 240, 340);
          ctx.restore();
        }
      }
    }
  }
}
