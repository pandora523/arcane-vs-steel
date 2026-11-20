import { Fighter } from './Fighter.js?v=30fps195';
import { PixelForge } from '../engine/PixelForge.js?v=30fps195';
import { PixelFont } from '../engine/PixelFont.js?v=30fps195';
import { drawExBayerHalo } from '../engine/shaders/exNextGenFX.js?v=30fps195';
import {
  MALPHAS_VFX_ROW,
  blitMalphasVfxCell,
  drawMalphasBackdropAura,
  drawMalphasBodyAuraOverlays,
  drawMalphasRunicTelegraphs,
  drawMalphasActionVfxOverlay,
  drawMalphasGrabForegroundOverlay
} from '../engine/shaders/malphasBossShaders.js?v=30fps195';

/**
 * HD-2D 30fps Arcade Adventure Monster Archetypes (`ghoul`, `cultist`, `brute`)
 * and 3-Phase Final Boss (`ArchfiendBoss` — Malphas, Archfiend of the Black Pit).
 *
 * Uses native 7-row x 30-col (`208x208` cell, `6240x1456`) 30fps pixel-art sprite sheets
 * with ZERO `ctx.rotate(...)` or canvas shearing so every silhouette stays 100% crisp.
 */
const MONSTER_ARCHETYPES = {
  templar: {
    heroId: 'templar',
    name: 'ECLIPSE TEMPLAR',
    eliteName: 'FALLEN CATHEDRAL WARDEN',
    theme: 'sanctuary',
    primaryColor: '#38bdf8',
    secondaryColor: '#facc15',
    maxHp: 740,
    eliteHp: 1180,
    moveSpeed: 198,
    attackRange: 126,
    autoInterval: 1.20,
    autoDuration: 0.64,
    skillMaxCooldown: 4.9,
    skillDuration: 0.76,
    dashMaxCooldown: 4.5,
    dashDuration: 0.44,
    spriteScale: 1.02,
    eliteScale: 1.12,
    scoreValue: 260,
    deathSfx: 'parry_clang'
  },
  astrologer: {
    heroId: 'astrologer',
    name: 'ECLIPSE ACOLYTE',
    eliteName: 'ASTRAL HERETIC PRIEST',
    theme: 'sanctuary',
    primaryColor: '#38bdf8',
    secondaryColor: '#fde047',
    maxHp: 600,
    eliteHp: 980,
    moveSpeed: 154,
    attackRange: 460,
    autoInterval: 1.65,
    autoDuration: 0.72,
    skillMaxCooldown: 6.0,
    skillDuration: 0.92,
    dashMaxCooldown: 5.0,
    dashDuration: 0.44,
    spriteScale: 1.0,
    eliteScale: 1.10,
    scoreValue: 350,
    deathSfx: 'chrono_hit'
  },
  treant: {
    heroId: 'treant',
    name: 'STARWOOD BRIAR-BRUTE',
    eliteName: 'ELDER BLIGHTWOOD GUARDIAN',
    theme: 'sylvan',
    primaryColor: '#34d399',
    secondaryColor: '#2dd4bf',
    maxHp: 1420,
    eliteHp: 2080,
    moveSpeed: 126,
    attackRange: 148,
    autoInterval: 1.72,
    autoDuration: 0.84,
    skillMaxCooldown: 5.8,
    skillDuration: 0.96,
    dashMaxCooldown: 5.4,
    dashDuration: 0.62,
    spriteScale: 1.18,
    eliteScale: 1.28,
    scoreValue: 540,
    deathSfx: 'thunder_slam'
  },
  dryad: {
    heroId: 'dryad',
    name: 'STARWOOD THORN-WRAITH',
    eliteName: 'SYLVAN BRIAR-WEAVER',
    theme: 'sylvan',
    primaryColor: '#10b981',
    secondaryColor: '#a7f3d0',
    maxHp: 640,
    eliteHp: 1040,
    moveSpeed: 162,
    attackRange: 455,
    autoInterval: 1.60,
    autoDuration: 0.70,
    skillMaxCooldown: 5.8,
    skillDuration: 0.90,
    dashMaxCooldown: 4.8,
    dashDuration: 0.44,
    spriteScale: 1.0,
    eliteScale: 1.10,
    scoreValue: 360,
    deathSfx: 'frost_cast'
  },
  ghoul: {
    heroId: 'ghoul',
    name: 'OSSUARY CRYPT-GHOUL',
    eliteName: 'DREAD BONE-STALKER',
    theme: 'abyssal',
    primaryColor: '#c084fc',
    secondaryColor: '#34d399',
    maxHp: 740,
    eliteHp: 1180,
    moveSpeed: 214,
    attackRange: 118,
    autoInterval: 1.18,
    autoDuration: 0.62,
    skillMaxCooldown: 4.8,
    skillDuration: 0.74,
    dashMaxCooldown: 4.4,
    dashDuration: 0.42,
    spriteScale: 0.98,
    eliteScale: 1.10,
    scoreValue: 270,
    deathSfx: 'scythe_reap'
  },
  cultist: {
    heroId: 'cultist',
    name: 'VOID NECROMANCER',
    eliteName: 'ARCH-LICH INVOKER',
    theme: 'abyssal',
    primaryColor: '#a855f7',
    secondaryColor: '#e879f9',
    maxHp: 620,
    eliteHp: 1020,
    moveSpeed: 152,
    attackRange: 455,
    autoInterval: 1.65,
    autoDuration: 0.72,
    skillMaxCooldown: 6.2,
    skillDuration: 0.92,
    dashMaxCooldown: 5.0,
    dashDuration: 0.44,
    spriteScale: 1.0,
    eliteScale: 1.10,
    scoreValue: 360,
    deathSfx: 'chrono_hit'
  },
  brute: {
    heroId: 'brute',
    name: 'OBSIDIAN JUGGERNAUT',
    eliteName: 'HELLFORGED EXECUTIONER',
    theme: 'forge',
    primaryColor: '#f59e0b',
    secondaryColor: '#dc2626',
    maxHp: 1480,
    eliteHp: 2160,
    moveSpeed: 128,
    attackRange: 146,
    autoInterval: 1.72,
    autoDuration: 0.84,
    skillMaxCooldown: 5.8,
    skillDuration: 0.96,
    dashMaxCooldown: 5.4,
    dashDuration: 0.62,
    spriteScale: 1.20,
    eliteScale: 1.30,
    scoreValue: 550,
    deathSfx: 'thunder_slam'
  },
  fiend: {
    heroId: 'fiend',
    name: 'BLACK PIT HELLFIEND',
    eliteName: 'ASHEN ABYSS-REAVER',
    theme: 'forge',
    primaryColor: '#ef4444',
    secondaryColor: '#fb923c',
    maxHp: 820,
    eliteHp: 1280,
    moveSpeed: 222,
    attackRange: 124,
    autoInterval: 1.14,
    autoDuration: 0.60,
    skillMaxCooldown: 4.6,
    skillDuration: 0.72,
    dashMaxCooldown: 4.2,
    dashDuration: 0.40,
    spriteScale: 1.06,
    eliteScale: 1.16,
    scoreValue: 330,
    deathSfx: 'scythe_reap'
  }
};

export class Monster extends Fighter {
  constructor(kind, x, groundY, facing = -1, opts = {}) {
    const cfg = MONSTER_ARCHETYPES[kind] || MONSTER_ARCHETYPES.templar;
    const isMiniBoss = Boolean(opts.isMiniBoss);
    const isElite = Boolean(opts.isElite || isMiniBoss);
    const baseSkillLabel =
      kind === 'astrologer'
        ? 'ECLIPSE SIGIL'
        : kind === 'dryad'
          ? 'BRIAR SNARE'
          : kind === 'cultist'
            ? 'SOUL SIGIL'
            : kind === 'treant'
              ? 'BRIAR QUAKE'
              : kind === 'brute'
                ? 'SEISMIC CLEAVE'
                : kind === 'templar'
                  ? 'ECLIPSE THRUST'
                  : kind === 'fiend'
                    ? 'HELLFIRE LEAP'
                    : 'CRYPT POUNCE';
    const skillLabel =
      opts.skillLabel ||
      (isMiniBoss && kind === 'treant'
        ? 'BRIAR-CROWN CATACLYSM'
        : isMiniBoss && kind === 'cultist'
          ? 'TRI-SIGIL OSSUARY RIFT'
          : baseSkillLabel);
    const resolvedName = opts.wardenName || (isElite ? cfg.eliteName : cfg.name);
    super({
      name: resolvedName,
      heroId: cfg.heroId,
      x,
      groundY,
      facing,
      theme: cfg.theme,
      primaryColor: cfg.primaryColor,
      secondaryColor: cfg.secondaryColor,
      maxHp: opts.maxHp || (isElite ? cfg.eliteHp : cfg.maxHp),
      moveSpeed: cfg.moveSpeed * (isMiniBoss ? 1.12 : isElite ? 1.08 : 1.0),
      attackRange: cfg.attackRange + (isMiniBoss ? 14 : 0),
      autoInterval: cfg.autoInterval * (isMiniBoss ? 0.86 : isElite ? 0.90 : 1.0),
      skillMaxCooldown: cfg.skillMaxCooldown * (isMiniBoss ? 0.80 : isElite ? 0.88 : 1.0),
      skillName: skillLabel,
      ultName: 'ABYSSAL SURGE',
      deathSfx: cfg.deathSfx
    });

    this.heroId = cfg.heroId;
    this.kind = kind;
    PixelForge.ensureMonsterLoaded?.(cfg.heroId);
    this.theme = cfg.theme;
    this.primaryColor = cfg.primaryColor;
    this.secondaryColor = cfg.secondaryColor;
    this.deathSfx = cfg.deathSfx;
    this.isMonster = true;
    this.isElite = isElite;
    this.isMiniBoss = isMiniBoss;
    this.wardenTitle = opts.wardenTitle || (isMiniBoss ? 'REALM WARDEN' : '');
    this.isBoss = false;
    this.isCasterArchetype = kind === 'cultist' || kind === 'astrologer' || kind === 'dryad';
    this.isHeavyArchetype = kind === 'brute' || kind === 'treant';
    this.hasTrueUltimate = false;
    this.team = 2;
    this.dmgScale = (isMiniBoss ? 1.28 : isElite ? 1.22 : 1.0) * (opts.dmgScale || 1.0);
    this.spriteScale = opts.spriteScale || (isElite ? cfg.eliteScale : cfg.spriteScale);
    this.scoreValue =
      opts.scoreValue ||
      Math.round(cfg.scoreValue * (isMiniBoss ? 2.6 : isElite ? 1.75 : 1.0));

    this.autoDuration = cfg.autoDuration;
    this.skillDuration = cfg.skillDuration;
    this.skillMaxCooldown = cfg.skillMaxCooldown * (isMiniBoss ? 0.80 : isElite ? 0.88 : 1.0);
    this.skillName = skillLabel;
    this.ultName = 'ABYSSAL SURGE';
    this.dashDuration = cfg.dashDuration;
    this.dashMaxCooldown = cfg.dashMaxCooldown;

    this.autoCooldown = 0.55 + Math.random() * 0.55;
    this.skillCooldown = isMiniBoss ? 1.15 : 1.65 + Math.random() * 1.4;
    this.dashCooldown = 1.25 + Math.random() * 1.2;

    this.hasPoise = this.isHeavyArchetype || isElite || isMiniBoss;
    this.isInvulnerable = false;
    this.portalSpawnMax = 0.72;
    this.portalSpawnTimer = opts.skipPortal ? 0 : 0.72;
    this.telegraphLabel = '';
    this.telegraphTimer = 0;
    this.telegraphRings = [];
    this.didActionFrame = false;
    this.didSecondaryAction = false;
    this.dashStartX = x;
    this.dashTargetX = x;
    this.dashStartGy = groundY;
    this.dashTargetGy = groundY;
    this.pounceVelZ = 0;
    this.flankOffsetZ = ((Math.round(x) % 5) - 2) * 14;
    this.bruteAltSkill = 0;
    this.afterimages = [];
    this._skillCastCount = 0;
    this._skillStarted = false;

    // Warden & Colossal Boss Stagger / Guard-Break Gauge + Tactical Hazard Statuses + Elemental Death Burst
    this.maxStagger = isMiniBoss ? 100 : 0;
    this.stagger = 0;
    this.staggerBreakTimer = 0;
    this.staggerDecayDelay = 0;
    this._sporeVulnTimer = 0;
    this._cursedBuffTimer = 0;
    this._chillTimer = 0;
    this.cadenceMult = Number.isFinite(opts.cadenceMult) && opts.cadenceMult > 0 ? opts.cadenceMult : 1;
    this._deathBurstSpawned = false;
    this.deathBurstParticles = [];
  }

  shiftMonsterDepth(dz, game) {
    if (!Number.isFinite(dz) || dz === 0) return;
    const minGy = (game?.adventure?.depthMinY || 442) + 8;
    const maxGy = (game?.adventure?.depthMaxY || 680) - 8;
    const prevGy = Number.isFinite(this.groundY) ? this.groundY : 561;
    const nextGy = Math.max(minGy, Math.min(maxGy, prevGy + dz));
    const applied = nextGy - prevGy;
    if (applied === 0) return;
    this.groundY = nextGy;
    this.y += applied;
    if (Array.isArray(this.capeNodes)) {
      for (const n of this.capeNodes) {
        if (n) n.y += applied;
      }
    }
  }

  setMonsterGroundY(targetGy, game) {
    const prevGy = Number.isFinite(this.groundY) ? this.groundY : 561;
    this.shiftMonsterDepth(targetGy - prevGy, game);
  }

  setState(next) {
    // Monsters use 7-row sheets (Rows 0..6); map any crouch/jump/victory fallbacks safely
    if (next === 'CROUCH' || next === 'JUMP') {
      next = 'DASH';
    } else if (next === 'VICTORY') {
      next = 'IDLE';
    }
    this._overrideFrameIdx = null;
    this._skillStarted = false;
    super.setState(next);
    this.didActionFrame = false;
    this.didSecondaryAction = false;
  }

  getMonsterBiomeZone() {
    if (this.kind === 'templar' || this.kind === 'astrologer') return 0;
    if (this.kind === 'treant' || this.kind === 'dryad') return 1;
    if (this.kind === 'ghoul' || this.kind === 'cultist') return 2;
    return 3;
  }

  getMonsterStageVfxRow() {
    if (this.kind === 'templar' || this.kind === 'astrologer') return 10;
    if (this.kind === 'treant' || this.kind === 'dryad') return 2;
    if (this.kind === 'ghoul' || this.kind === 'cultist') return 4;
    return 6;
  }

  getMonsterStageAccentRow() {
    if (this.kind === 'templar' || this.kind === 'astrologer') return 5;
    if (this.kind === 'treant' || this.kind === 'dryad') return 1;
    if (this.kind === 'ghoul' || this.kind === 'cultist') return 8;
    return 9;
  }

  clampMonsterX(targetX, game) {
    const adv = game?.getActiveSideScrollManager?.() || game?.adventure;
    const colossalAlive = Boolean(
      adv?.bossEntity && !adv.bossEntity.isDead && adv.bossEntity.isColossalBoss
    );
    const mMin = adv?.lockActive ? adv.lockMinX + 24 : 95;
    const worldW = adv?.getWorldWidth?.() || game?.renderer?.worldWidth || 9600;
    const rawMax = adv?.lockActive ? adv.lockMaxX - 24 : worldW - 95;
    const mMax = Math.max(
      mMin + 60,
      colossalAlive ? Math.min(rawMax, (adv.bossEntity.anchorX || 9335) - 95) : rawMax
    );
    return Math.max(mMin, Math.min(mMax, targetX));
  }

  addStagger(amount, attacker = null, game = null) {
    if (
      this.maxStagger <= 0 ||
      this.isDead ||
      this.staggerBreakTimer > 0 ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return false;
    }
    const g = game || this.game;
    this.stagger = Math.min(this.maxStagger, this.stagger + amount);
    this.staggerDecayDelay = 3.5;

    if (this.stagger >= this.maxStagger) {
      this.stagger = 0;
      this.staggerBreakTimer = 3.2;
      this.staggerDecayDelay = 0;

      if (this.isColossalBoss) {
        this.releaseGrabbedTarget?.();
        this.rakeWarnOnly = false;
        this.rakeActive = false;
        this.fistVisible = false;
        this.bossAction = null;
        this.sweepLane = null;
        this.vulnerableTimer = Math.max(this.vulnerableTimer || 0, 3.2);
        this.telegraphLabel = 'GUARD BREAK! (+55% DMG)';
        this.telegraphTimer = 3.2;
        this.setState('IDLE');
      } else {
        this.stunTimer = Math.max(this.stunTimer || 0, 3.2);
        this.telegraphTimer = 0;
        this.setState('HURT');
        this.hurtTimer = Math.max(this.hurtTimer || 0, 0.55);
      }

      if (g?.audio) g.audio.play('time_shatter', this.x);
      if (g?.renderer) g.renderer.triggerShake(13, 0.26);
      if (g?.vfx) {
        g.vfx.spawnShockwave(
          this.x - (this.isBoss ? 70 : 0),
          (this.groundY || this.y) - 24,
          this.isBoss ? 225 : 150,
          '#fde047',
          0.42,
          true
        );
        g.vfx.spawnBurst(
          this.x - (this.isBoss ? 70 : 0),
          (this.groundY || this.y) - 72,
          22,
          '#facc15',
          265,
          { upBias: 155, size: 6 }
        );
        g.vfx.spawnDamageText(
          this.x - (this.isBoss ? 70 : 0),
          (this.y || this.groundY) - (this.isBoss ? 220 : 185),
          0,
          true,
          'GUARD BREAK!',
          '#fef08a'
        );
      }
      const sideMgr = g?.getActiveSideScrollManager?.() || g?.adventure;
      sideMgr?.progression?.gainSpirit?.(22);
      sideMgr?.spawnPickup?.(
        'ember',
        this.x - (this.isBoss ? 140 : 0),
        this.groundY || 561,
        { ultAmt: 22 }
      );
      sideMgr?.onMonsterGuardBroken?.(this, attacker);
      return true;
    }
    return false;
  }

  spawnElementalDeathBurst() {
    if (this._deathBurstSpawned || this.isColossalBoss) return;
    this._deathBurstSpawned = true;
    const style =
      this.kind === 'ghoul'
        ? 'bone'
        : this.kind === 'dryad' || this.kind === 'treant'
          ? 'leaf'
          : this.kind === 'cultist' || this.kind === 'fiend'
            ? 'soul_flame'
            : 'cinder_shard';
    const count = this.isMiniBoss ? 28 : this.isElite ? 22 : 16;
    const gy = Number.isFinite(this.groundY) ? this.groundY : this.y || 561;
    const scale = this.spriteScale || 1;
    this.deathBurstParticles = [];

    for (let i = 0; i < count; i++) {
      const frac = i / Math.max(1, count);
      const ang = frac * Math.PI * 2 + (i % 3) * 0.31;
      const spd = (style === 'leaf' ? 75 : style === 'soul_flame' ? 58 : 135) + (i % 5) * 32;
      let col;
      let hi;
      let w;
      let h;
      if (style === 'bone') {
        col = i % 3 === 0 ? '#f1f5f9' : i % 3 === 1 ? '#cbd5e1' : '#94a3b8';
        hi = '#ffffff';
        w = i % 2 === 0 ? 10 : 6;
        h = i % 2 === 0 ? 4 : 6;
      } else if (style === 'leaf') {
        col = i % 3 === 0 ? '#34d399' : i % 3 === 1 ? '#10b981' : '#2dd4bf';
        hi = '#d1fae5';
        w = 8;
        h = 5;
      } else if (style === 'soul_flame') {
        col = this.kind === 'fiend' ? (i % 2 === 0 ? '#ef4444' : '#fb923c') : i % 2 === 0 ? '#c084fc' : '#e879f9';
        hi = this.kind === 'fiend' ? '#fef08a' : '#fae8ff';
        w = 6 + (i % 3) * 2;
        h = 10 + (i % 3) * 3;
      } else {
        col =
          this.kind === 'templar' || this.kind === 'astrologer'
            ? i % 2 === 0
              ? '#38bdf8'
              : '#facc15'
            : i % 2 === 0
              ? '#fb923c'
              : '#ef4444';
        hi = '#fef08a';
        w = 7 + (i % 2) * 3;
        h = 5 + (i % 3) * 2;
      }
      this.deathBurstParticles.push({
        style,
        x: this.x + Math.cos(ang) * 18 * scale,
        y: gy - 26 - (i % 6) * 16 * scale,
        groundY: gy + ((i % 5) - 2) * 5,
        vx: Math.cos(ang) * spd,
        vy:
          style === 'soul_flame'
            ? -115 - (i % 4) * 38
            : style === 'leaf'
              ? -95 - (i % 4) * 30
              : -165 - (i % 5) * 44,
        w,
        h,
        col,
        hi,
        phase: i * 1.37,
        bounces: 0,
        age: 0,
        maxLife: style === 'leaf' ? 1.35 + (i % 3) * 0.16 : 0.95 + (i % 4) * 0.16
      });
    }
  }

  takeDamage(amount, attacker, isCrit = false, knockX = 95, knockY = 0) {
    const prevHp = this.hp;
    let finalAmount = amount;
    let effectiveCrit = Boolean(isCrit);
    let consumedPhantomEmpower = false;
    const sideMgr =
      this.game?.getActiveSideScrollManager?.() ||
      (this.game?.isAdventureMode?.() ? this.game.adventure : null);
    const prog = sideMgr?.progression || null;
    const resolvedCastTier =
      prog && attacker && !attacker.isMonster
        ? prog.resolveOutgoingCastTier?.(amount, attacker, attacker._advActiveCastSource || null) || null
        : null;
    if (prog && attacker && !attacker.isMonster) {
      if (attacker._phantomEmpowerReady && !this._isAdvCleaveSplash) {
        attacker._phantomEmpowerReady = false;
        attacker._phantomEmpowerTimer = 0;
        consumedPhantomEmpower = true;
        effectiveCrit = true;
      }
      finalAmount = prog.scaleOutgoingDamage(
        amount,
        attacker,
        this,
        effectiveCrit,
        attacker._advActiveCastSource || null
      );
      if (consumedPhantomEmpower) {
        finalAmount = Math.max(4, Math.round(finalAmount * 1.45));
        this.game?.vfx?.spawnShockwave?.(this.x, (this.groundY || this.y) - 52, 138, '#67e8f9', 0.30, true);
        this.game?.vfx?.spawnBurst?.(this.x, (this.groundY || this.y) - 64, 16, '#fde047', 235, {
          upBias: 115,
          size: 5
        });
        this.game?.vfx?.spawnDamageText?.(
          this.x,
          (this.y || this.groundY) - 188,
          0,
          true,
          'PHANTOM CRIT!',
          '#67e8f9'
        );
        this.game?.audio?.play?.('holy_hit', this.x);
      }
    }
    if (
      attacker &&
      !attacker.isMonster &&
      (attacker.state === 'TRUE_ULTIMATE' || resolvedCastTier === 'true_ult') &&
      amount < 9000
    ) {
      const trueUltCap = this.isColossalBoss
        ? Math.round(this.maxHp * 0.12)
        : this.isMiniBoss
          ? Math.round(this.maxHp * 0.34)
          : this.isElite
            ? Math.round(this.maxHp * 0.54)
            : Infinity;
      if (finalAmount > trueUltCap) {
        finalAmount = trueUltCap;
      }
    }
    if (this.isColossalBoss) {
      knockX = 0;
      knockY = 0;
    }
    super.takeDamage(finalAmount, attacker, effectiveCrit, knockX, knockY);
    if (this.isColossalBoss) {
      this.x = this.anchorX;
      this.vx = 0;
      this.vy = 0;
      this.y = this.anchorGroundY;
      this.groundY = this.anchorGroundY;
      this.facing = -1;
    }
    if (this.isDead && !this._deathBurstSpawned) {
      this.spawnElementalDeathBurst();
    }
    const dealt = Math.max(0, prevHp - this.hp);
    if (dealt > 0 && prog && attacker && !attacker.isMonster) {
      prog.onPlayerHitMonster(attacker, this, dealt);
      // Fill Warden / Colossal Boss Stagger Gauge on player hits (Skills, Overdrive, Perfect-Dodge counters)
      if (this.maxStagger > 0 && !this.isDead && !this._isAdvCleaveSplash) {
        const stagTier =
          resolvedCastTier ||
          (attacker.state === 'TRUE_ULTIMATE'
            ? 'true_ult'
            : attacker.state === 'ULTIMATE'
              ? 'ult'
              : attacker.state === 'SKILL'
                ? 'skill'
                : 'auto');
        let stagAmt =
          stagTier === 'true_ult' ? 95 : stagTier === 'ult' ? 62 : stagTier === 'skill' ? 34 : 6;
        if (consumedPhantomEmpower) stagAmt += 42;
        this.addStagger(stagAmt, attacker, this.game);
      }
      if (!this._isAdvCleaveSplash) {
        sideMgr?.skillSets?.onDirectMonsterHit?.(
          attacker,
          this,
          amount,
          effectiveCrit,
          knockX,
          knockY
        );
        sideMgr?.onPlayerHitMonsterRelicProc?.(attacker, this, dealt, effectiveCrit, {
          consumedPhantomEmpower
        });
      }
    }
  }

  spawnFloorTelegraph(
    x,
    radius,
    delay,
    damage,
    color = '#a855f7',
    label = 'VOID SIGIL!',
    targetGroundY = null
  ) {
    const gy = Number.isFinite(targetGroundY) ? targetGroundY : this.groundY;
    this.telegraphRings.push({
      x,
      y: gy,
      radius,
      timer: 0,
      maxTimer: delay,
      damage,
      color,
      label
    });
  }

  updateTelegraphRings(dt, game) {
    if (!this.telegraphRings.length) return;
    for (let i = this.telegraphRings.length - 1; i >= 0; i--) {
      const ring = this.telegraphRings[i];
      ring.timer += dt;
      if (ring.timer >= ring.maxTimer) {
        this.telegraphRings.splice(i, 1);
        if (this.isDead) continue;
        if (game?.audio) game.audio.play('flame_pillar', ring.x);
        if (game?.renderer) game.renderer.triggerShake(7, 0.16);
        if (game?.vfx) {
          const glyphTheme =
            this.theme === 'forge'
              ? 'forge'
              : this.theme === 'sanctuary'
                ? 'arcane'
                : this.theme === 'sylvan'
                  ? 'emerald'
                  : 'abyssal';
          game.vfx.spawnShockwave(ring.x, ring.y - 6, ring.radius * 1.35, ring.color, 0.34, true);
          game.vfx.spawnBurst(ring.x, ring.y - 18, 18, ring.color, 250, { upBias: 155, size: 6 });
          game.vfx.spawnGlyphBurst(ring.x, ring.y - 42, 6, glyphTheme);
          game.vfx.spawnDecal?.(ring.x, Math.round(ring.radius * 0.95), 'fissure', ring.color, 2.8, ring.y);
        }
        const plumeMgr = game?.getActiveSideScrollManager?.() || game?.adventure;
        plumeMgr?.spawnMonsterPlume?.(
          ring.x,
          ring.y,
          this.getMonsterStageVfxRow(),
          ring.color,
          this.isMiniBoss ? 2.45 : this.isElite ? 2.1 : 1.75,
          0.56,
          this.isMiniBoss ? 12 : 8
        );
        if (this.isElite || this.isMiniBoss) {
          plumeMgr?.spawnMonsterPlume?.(
            ring.x,
            ring.y - 8,
            this.getMonsterStageAccentRow(),
            this.secondaryColor || ring.color,
            this.isMiniBoss ? 1.85 : 1.5,
            0.46,
            6
          );
        }
        const enemies = game?.getEnemiesOf ? game.getEnemiesOf(this) : [];
        const maxDepthDelta = Math.max(54, ring.radius * 0.56);
        for (const target of enemies) {
          const tGy = target ? target.groundY || target.y : 0;
          if (
            target &&
            !target.isDead &&
            !target.isBenched &&
            Math.abs(target.x - ring.x) <= ring.radius &&
            Math.abs(tGy - ring.y) <= maxDepthDelta &&
            target.y >= tGy - 68
          ) {
            target.takeDamage(Math.round(ring.damage * this.dmgScale), this, false, 130, -140);
          }
        }
      }
    }
  }

  update(dt, enemy, game) {
    if (this.afterimages?.length) {
      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        this.afterimages[i].life -= dt;
        if (this.afterimages[i].life <= 0) {
          this.afterimages.splice(i, 1);
        }
      }
    }
    this.updateTelegraphRings(dt, game);
    if (this.telegraphTimer > 0) {
      this.telegraphTimer = Math.max(0, this.telegraphTimer - dt);
      if (this.telegraphTimer <= 0) this.telegraphLabel = '';
    }
    if (this.forgeArmorTimer > 0) {
      this.forgeArmorTimer = Math.max(0, this.forgeArmorTimer - dt);
    }
    if (this._sporeVulnTimer > 0) {
      this._sporeVulnTimer = Math.max(0, this._sporeVulnTimer - dt);
    }
    if (this._cursedBuffTimer > 0) {
      this._cursedBuffTimer = Math.max(0, this._cursedBuffTimer - dt);
    }
    if (this._chillTimer > 0) {
      this._chillTimer = Math.max(0, this._chillTimer - dt);
    }
    if (this.staggerBreakTimer > 0) {
      this.staggerBreakTimer = Math.max(0, this.staggerBreakTimer - dt);
    } else if (this.staggerDecayDelay > 0) {
      this.staggerDecayDelay = Math.max(0, this.staggerDecayDelay - dt);
    } else if (this.stagger > 0 && !this.isDead) {
      this.stagger = Math.max(0, this.stagger - (this.isBoss ? 10 : 7) * dt);
    }

    // Update elemental death burst particles (bone fragments, dryad leaves, soul flames, cinder shards)
    if (this.deathBurstParticles?.length) {
      for (let i = this.deathBurstParticles.length - 1; i >= 0; i--) {
        const dp = this.deathBurstParticles[i];
        dp.age += dt;
        if (dp.age >= dp.maxLife) {
          this.deathBurstParticles.splice(i, 1);
          continue;
        }
        if (dp.style === 'soul_flame') {
          dp.x += (dp.vx * 0.45 + Math.sin(dp.age * 11 + dp.phase) * 34) * dt;
          dp.y += dp.vy * dt;
          dp.vy *= 1 - Math.min(0.4, dt * 1.2);
        } else if (dp.style === 'leaf') {
          dp.vy += 190 * dt;
          dp.x += (dp.vx * 0.5 + Math.sin(dp.age * 7.5 + dp.phase) * 48) * dt;
          dp.y += dp.vy * dt;
          if (dp.y >= dp.groundY) {
            dp.y = dp.groundY;
            dp.vy = 0;
            dp.vx *= 0.85;
          }
        } else {
          dp.vy += 760 * dt;
          dp.x += dp.vx * dt;
          dp.y += dp.vy * dt;
          if (dp.y >= dp.groundY && dp.vy > 0) {
            dp.y = dp.groundY;
            if (dp.bounces < 2) {
              dp.vy *= -0.44;
              dp.vx *= 0.70;
              dp.bounces++;
            } else {
              dp.vy = 0;
              dp.vx *= 0.80;
            }
          }
        }
      }
    }

    // Physics, death, cooldowns, stun/root handled cleanly if we run custom monster AI before state dispatch
    if (this.isDead) {
      if (!this._deathBurstSpawned) {
        this.spawnElementalDeathBurst();
      }
      this.portalSpawnTimer = 0;
      this.telegraphRings.length = 0;
      super.update(dt, enemy, game);
      return;
    }

    // Dimensional Portal Emergence Stride (`0.72s`): monster steps decisively out of its Realm Rift while remaining targetable!
    if (this.portalSpawnTimer > 0) {
      this.portalSpawnTimer = Math.max(0, this.portalSpawnTimer - dt);
      const u = 1 - this.portalSpawnTimer / Math.max(0.1, this.portalSpawnMax || 0.72);
      if (enemy && !enemy.isDead) {
        this.facing = enemy.x >= this.x ? 1 : -1;
      }
      this.state = 'WALK';
      this.moveDir = 1;
      this.walkPhase += dt * 5.2;
      this.x += this.facing * 44 * (1 - u * 0.65) * dt;
      super.update(dt, null, game);
      if (!this.isDead && !(this.stunTimer > 0) && !this.isRooted) {
        this.state = 'WALK';
        this.moveDir = 1;
      }
      return;
    }

    const actDt = (this._chillTimer || 0) > 0 && !this.isDead ? dt * 0.72 : dt;

    // 3D Monster pack spacing so multiple enemies fan out organically across X and depth groundY
    if (game?.fighters && (this.state === 'IDLE' || this.state === 'WALK')) {
      for (const other of game.fighters) {
        if (other && other !== this && other.team === this.team && !other.isDead) {
          const dx = this.x - other.x;
          const dz = (this.groundY || this.y) - (other.groundY || other.y);
          const dist2D = Math.hypot(dx, dz * 1.45);
          const minAllySep = this.isBoss || other.isBoss ? 116 : 74;
          if (dist2D < minAllySep) {
            const nx = dist2D < 2 ? (this.x % 2 === 0 ? 1 : -1) : dx / dist2D;
            const nz = dist2D < 2 ? (Math.round(this.x) % 3 === 0 ? 0.6 : -0.6) : (dz * 1.45) / dist2D;
            const pushMag = (minAllySep - dist2D) * 3.6 * actDt;
            this.x += nx * pushMag;
            this.shiftMonsterDepth(nz * pushMag * 0.72, game);
          }
        }
      }
    }

    // Run bespoke Monster AI when in neutral IDLE / WALK, bypassing Champion Overdrive/TrueUlt AI
    if (
      (this.state === 'IDLE' || this.state === 'WALK') &&
      !(this.stunTimer > 0) &&
      !this.isRooted &&
      enemy &&
      !enemy.isDead
    ) {
      this.runMonsterNeutralAI(actDt, enemy, game);
      if (this.state === 'IDLE' || this.state === 'WALK') {
        const savedState = this.state;
        const savedMoveDir = this.moveDir;
        const savedFacing = enemy.x >= this.x ? 1 : -1;
        super.update(actDt, null, game);
        if (!this.isDead && !(this.stunTimer > 0) && !this.isRooted) {
          this.facing = savedFacing;
          this.state = savedState;
          this.moveDir = savedMoveDir;
        }
        return;
      }
    }

    super.update(actDt, enemy, game);
  }

  runMonsterNeutralAI(dt, enemy, game) {
    const dist = Math.abs(enemy.x - this.x);
    const enemyGy = enemy.groundY || enemy.y;
    const dz = enemyGy - this.groundY;
    const absDz = Math.abs(dz);
    this.facing = enemy.x >= this.x ? 1 : -1;

    const adv = game?.getActiveSideScrollManager?.() || game?.adventure;
    const colossalAlive = Boolean(
      adv?.bossEntity && !adv.bossEntity.isDead && adv.bossEntity.isColossalBoss
    );
    const mMin = adv?.lockActive ? adv.lockMinX + 24 : 95;
    const worldW = adv?.getWorldWidth?.() || game?.renderer?.worldWidth || 9600;
    const rawMax = adv?.lockActive ? adv.lockMaxX - 24 : worldW - 95;
    const mMax = Math.max(
      mMin + 60,
      colossalAlive ? Math.min(rawMax, (adv.bossEntity.anchorX || 9335) - 95) : rawMax
    );
    const arenaMidX = (mMin + mMax) * 0.5;
    const nowT = game?.renderer?.time || 0;

    // 2.5D Stuck-Progress Watchdog: if walking for >0.28s with <5px 2.5D progress, execute a curved 2.5D unstick arc!
    if (!Number.isFinite(this._aiCheckX)) {
      this._aiCheckX = this.x;
      this._aiCheckGy = this.groundY;
      this._aiCheckTimer = 0;
    }
    if ((this._unstickTimer || 0) > 0) {
      this._unstickTimer = Math.max(0, this._unstickTimer - dt);
      this.state = 'WALK';
      this.moveDir = 1;
      this.walkPhase += dt * 4.8;
      this.x += (this._unstickDirX || 1) * this.moveSpeed * 1.05 * dt;
      this.shiftMonsterDepth((this._unstickDirZ || 1) * this.moveSpeed * 0.92 * dt, game);
      this.headBob = Math.sin(this.walkPhase * 2) * 2.0;
      this._aiCheckX = this.x;
      this._aiCheckGy = this.groundY;
      this._aiCheckTimer = 0;
      return;
    }

    const trackWalkProgress = (isWalking) => {
      if (!isWalking) {
        this._aiCheckX = this.x;
        this._aiCheckGy = this.groundY;
        this._aiCheckTimer = 0;
        return;
      }
      this._aiCheckTimer = (this._aiCheckTimer || 0) + dt;
      if (this._aiCheckTimer >= 0.28) {
        const moved = Math.hypot(this.x - this._aiCheckX, this.groundY - this._aiCheckGy);
        this._aiCheckX = this.x;
        this._aiCheckGy = this.groundY;
        this._aiCheckTimer = 0;
        if (moved < 5.5) {
          this._unstickTimer = 0.44;
          this._unstickDirX = this.x < arenaMidX ? 1 : -1;
          this._unstickDirZ = this.groundY > 561 ? -1 : 1;
        }
      }
    };

    if (this.isCasterArchetype) {
      const retreatDir = -this.facing;
      const corneredBehind =
        (retreatDir < 0 && this.x <= mMin + 72) || (retreatDir > 0 && this.x >= mMax - 72);

      // Ranged Caster spacing (`astrologer`, `dryad`, `cultist`): dash or curve AROUND hero if cornered!
      if (dist < 185 && absDz < 78 && this.dashCooldown <= 0) {
        const dashDir = corneredBehind ? this.facing : retreatDir;
        this.startMonsterDash(enemy, game, dashDir, corneredBehind ? 235 : 210);
        return;
      }
      if (this.skillCooldown <= 0 && dist <= 560) {
        this.skillCooldown = this.skillMaxCooldown;
        this.telegraphLabel =
          this.kind === 'astrologer'
            ? 'ECLIPSE SIGIL!'
            : this.kind === 'dryad'
              ? 'BRIAR SNARE!'
              : 'SOUL SIGIL!';
        this.telegraphTimer = 0.78;
        this.setState('SKILL');
        return;
      }
      if (dist <= this.attackRange && (dist >= 140 || corneredBehind) && absDz <= 140 && this.autoCooldown <= 0) {
        this.autoCooldown = this.autoInterval;
        this.setState('AUTO_ATTACK');
        return;
      }

      let moving = false;
      if (dist < 235) {
        if (corneredBehind) {
          const escapeGy = enemyGy > 561 ? 470 : 652;
          const escDz = escapeGy - this.groundY;
          this.moveDir = 1;
          this.x += this.facing * this.moveSpeed * 0.96 * dt;
          if (Math.abs(escDz) > 8) {
            this.shiftMonsterDepth(Math.sign(escDz) * this.moveSpeed * 0.92 * dt, game);
          }
          moving = true;
        } else {
          this.moveDir = -1;
          this.x += retreatDir * this.moveSpeed * 0.85 * dt;
          const kiteOrbitZ = Math.sin(nowT * 2.1 + (this.flankOffsetZ || 0)) * 48;
          const kiteDz = enemyGy + kiteOrbitZ - this.groundY;
          if (Math.abs(kiteDz) > 14) {
            this.shiftMonsterDepth(Math.sign(kiteDz) * this.moveSpeed * 0.68 * dt, game);
          }
          moving = true;
        }
      } else if (dist > 410) {
        this.moveDir = 1;
        this.x += this.facing * this.moveSpeed * dt;
        const approachArcZ =
          enemyGy +
          (this.flankOffsetZ || 0) * 1.6 +
          Math.sin(nowT * 1.8 + (this.flankOffsetZ || 0)) * 34 -
          this.groundY;
        if (Math.abs(approachArcZ) > 14) {
          this.shiftMonsterDepth(Math.sign(approachArcZ) * this.moveSpeed * 0.66 * dt, game);
        }
        moving = true;
      } else {
        const weaveGy =
          enemyGy + (this.flankOffsetZ || 0) * 1.4 + Math.sin(nowT * 1.6 + (this.flankOffsetZ || 0)) * 26;
        const casterDz = weaveGy - this.groundY;
        if (Math.abs(casterDz) > 20) {
          this.shiftMonsterDepth(Math.sign(casterDz) * this.moveSpeed * 0.58 * dt, game);
          this.moveDir = 1;
          moving = true;
        }
      }

      if (moving) {
        this.state = 'WALK';
        this.walkPhase += dt * 4.2;
        this.headBob = Math.sin(this.walkPhase * 2) * 1.8;
      } else {
        this.state = 'IDLE';
        this.moveDir = 0;
      }
      trackWalkProgress(moving);
      return;
    }

    if (this.isHeavyArchetype) {
      // Heavy Guardian (`treant`, `brute`): curved 2.5D approach that converges onto enemyGy for Charge & Quake!
      if (this.dashCooldown <= 0 && dist > 205 && dist < 520 && absDz <= 56) {
        this.telegraphLabel = this.kind === 'treant' ? '! ROOT CHARGE !' : '! BULL CHARGE !';
        this.telegraphTimer = 0.62;
        this.forgeArmorTimer = 0.65;
        this.startMonsterDash(enemy, game, this.facing, Math.min(330, dist - 55));
        return;
      }
      if (this.skillCooldown <= 0 && dist <= 380 && absDz <= 46) {
        this.skillCooldown = this.skillMaxCooldown;
        this.forgeArmorTimer = 0.72;
        this.telegraphLabel = this.kind === 'treant' ? '! BRIAR QUAKE !' : '! SEISMIC SLAM !';
        this.telegraphTimer = 0.65;
        this.setState('SKILL');
        return;
      }
      if (dist <= this.attackRange && absDz <= 48 && this.autoCooldown <= 0) {
        this.autoCooldown = this.autoInterval;
        this.setState('AUTO_ATTACK');
        return;
      }

      const arcBlend = Math.max(0, Math.min(1, (dist - 128) / 210));
      const curvedGoalGy =
        enemyGy +
        ((this.flankOffsetZ || 0) * 0.65 + Math.sin(nowT * 1.5 + (this.flankOffsetZ || 0)) * 42) *
          arcBlend;
      const heavyDz = curvedGoalGy - this.groundY;
      if (dist > 120 || Math.abs(heavyDz) > 30) {
        this.state = 'WALK';
        this.moveDir = 1;
        this.walkPhase += dt * 3.4;
        if (dist > 114) {
          this.x += this.facing * this.moveSpeed * dt;
        }
        if (Math.abs(heavyDz) > 10) {
          this.shiftMonsterDepth(
            Math.sign(heavyDz) * Math.min(Math.abs(heavyDz), this.moveSpeed * 0.88 * dt),
            game
          );
        }
        this.headBob = Math.abs(Math.sin(this.walkPhase * 2)) * 2.8;
        trackWalkProgress(true);
      } else {
        this.state = 'IDLE';
        this.moveDir = 0;
        trackWalkProgress(false);
      }
      return;
    }

    // Melee Vanguard (`templar`, `ghoul`, `fiend`): curved 3D pincer flank + signature lunge
    if (this.skillCooldown <= 0 && dist >= 130 && dist <= 310 && absDz <= 56) {
      this.skillCooldown = this.skillMaxCooldown;
      this.telegraphLabel =
        this.kind === 'templar'
          ? '! ECLIPSE THRUST !'
          : this.kind === 'fiend'
            ? '! HELLFIRE LEAP !'
            : '! CRYPT POUNCE !';
      this.telegraphTimer = 0.52;
      this.pounceVelZ = Math.max(-135, Math.min(135, dz * 2.1));
      this.setState('SKILL');
      return;
    }
    if (this.dashCooldown <= 0 && dist > 265) {
      this.startMonsterDash(enemy, game, this.facing, 195);
      return;
    }
    if (dist <= this.attackRange && absDz <= 46 && this.autoCooldown <= 0) {
      this.autoCooldown = this.autoInterval;
      this.setState('AUTO_ATTACK');
      return;
    }

    const rushArc = Math.max(0, Math.min(1, (dist - 108) / 190));
    const rushGoalGy =
      enemyGy +
      ((this.flankOffsetZ || 0) * 0.85 + Math.sin(nowT * 2.2 + (this.flankOffsetZ || 0)) * 52) *
        rushArc;
    const rushDz = rushGoalGy - this.groundY;
    if (dist > 100 || Math.abs(rushDz) > 26) {
      this.state = 'WALK';
      this.moveDir = 1;
      this.walkPhase += dt * 5.6;
      if (dist > 94) {
        this.x += this.facing * this.moveSpeed * dt;
      }
      if (Math.abs(rushDz) > 7) {
        this.shiftMonsterDepth(
          Math.sign(rushDz) * Math.min(Math.abs(rushDz), this.moveSpeed * 0.92 * dt),
          game
        );
      }
      this.headBob = Math.sin(this.walkPhase * 2) * 2.4;
      trackWalkProgress(true);
    } else {
      this.state = 'IDLE';
      this.moveDir = 0;
      trackWalkProgress(false);
    }
  }

  startMonsterDash(enemy, game, dir, distance = 200) {
    const ww = game?.renderer ? game.renderer.worldWidth : 1200;
    const dashMgr = game?.getActiveSideScrollManager?.() || game?.adventure;
    const minX = dashMgr?.lockActive ? dashMgr.lockMinX + 24 : 95;
    const maxX = dashMgr?.lockActive ? dashMgr.lockMaxX - 24 : ww - 95;
    const minGy = (dashMgr?.depthMinY || 442) + 14;
    const maxGy = (dashMgr?.depthMaxY || 680) - 14;
    this.dashCooldown = this.dashMaxCooldown;
    this.dashDir = dir || this.facing;
    this.dashStartX = this.x;
    this.dashTargetX = Math.max(minX, Math.min(maxX, this.x + this.dashDir * distance));
    this.dashStartGy = this.groundY;
    const targetGy = this.isCasterArchetype
      ? this.groundY + (this.groundY > 561 ? -58 : 58)
      : enemy
        ? enemy.groundY || enemy.y
        : this.groundY;
    this.dashTargetGy = Math.max(minGy, Math.min(maxGy, targetGy));
    this.setState('DASH');
    if (game?.audio) game.audio.play('dash_whoosh', this.x);
  }

  recordAfterimage(alpha = 0.24, life = 0.22) {
    if (this.isColossalBoss || this.isDead) return;
    if (!this.afterimages) this.afterimages = [];
    const last = this.afterimages[this.afterimages.length - 1];
    if (last && Math.abs(last.x - this.x) < 10 && Math.abs(last.y - this.y) < 6) return;
    const frameIdx =
      Number.isInteger(this._overrideFrameIdx) && this._overrideFrameIdx >= 0
        ? this._overrideFrameIdx
        : PixelForge.getFrameIndex
          ? PixelForge.getFrameIndex(this, this.walkPhase)
          : 0;
    this.afterimages.push({
      x: this.x,
      y: this.y,
      groundY: this.groundY,
      facing: this.facing,
      walkPhase: this.walkPhase,
      scale: this.spriteScale || 1.0,
      frameIdx,
      alpha,
      life,
      maxLife: life,
      color: this.primaryColor || '#38bdf8'
    });
    if (this.afterimages.length > 3) this.afterimages.shift();
  }

  updateDashOrDodge(_dt, enemy, game) {
    const dur = this.dashDuration || 0.45;
    const t = this.stateTimer;
    const u = Math.min(1, t / dur);

    if (this.isHeavyArchetype) {
      // Brief 0.20s stomp windup before unstoppable Guardian/Juggernaut Charge!
      if (t < 0.20) {
        this.vx = 0;
        return;
      }
      this.recordAfterimage(0.24, 0.20);
      const chargeU = Math.min(1, (t - 0.20) / Math.max(0.15, dur - 0.20));
      this.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * chargeU;
      this.setMonsterGroundY(
        this.dashStartGy + (this.dashTargetGy - this.dashStartGy) * chargeU,
        game
      );
      if (
        !this.didActionFrame &&
        enemy &&
        !enemy.isDead &&
        Math.abs(enemy.x - this.x) < 115 &&
        Math.abs((enemy.groundY || enemy.y) - this.groundY) < 58
      ) {
        this.didActionFrame = true;
        enemy.takeDamage(Math.round(56 * this.dmgScale), this, true, 240, -165);
        if (game?.renderer) game.renderer.triggerShake(11, 0.22);
        if (game?.vfx) {
          const col = this.kind === 'treant' ? '#34d399' : '#f59e0b';
          game.vfx.spawnShockwave(this.x + this.facing * 36, this.y - 68, 95, col, 0.28, true);
        }
      }
    } else {
      this.recordAfterimage(0.26, 0.22);
      const ease = 1 - Math.pow(1 - u, 2);
      this.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * ease;
      this.setMonsterGroundY(
        this.dashStartGy + (this.dashTargetGy - this.dashStartGy) * ease,
        game
      );
    }

    if (t >= dur) {
      this.y = this.groundY;
      game?.adventure?.spawnMonsterPlume?.(
        this.x,
        this.groundY,
        this.getMonsterStageVfxRow(),
        this.primaryColor || '#38bdf8',
        this.isHeavyArchetype ? 1.5 : 1.15,
        0.36,
        4
      );
      this.setState('IDLE');
    }
  }

  updateAutoAttack(dt, enemy, game) {
    const t = this.stateTimer;
    const hitTime = this.isHeavyArchetype ? 0.38 : this.isCasterArchetype ? 0.34 : 0.26;

    if (!this.isCasterArchetype && dt > 0) {
      if (t < hitTime * 0.55) {
        const coilSpd = this.isHeavyArchetype ? 28 : 42;
        this.x = this.clampMonsterX(this.x - this.facing * coilSpd * dt, game);
      } else if (t < hitTime && (!enemy || Math.abs(enemy.x - this.x) > 68)) {
        const stepSpd = this.isHeavyArchetype ? 108 : 142;
        this.x = this.clampMonsterX(this.x + this.facing * stepSpd * dt, game);
      }
    }

    if (t >= hitTime && !this.didActionFrame) {
      this.didActionFrame = true;
      if (this.isCasterArchetype) {
        const sx = this.x + this.facing * 44;
        const sy = this.y - 98;
        const tx = enemy ? enemy.x : sx + this.facing * 380;
        const ty = enemy ? enemy.y - 96 : sy;
        const dx = tx - sx;
        const dy = ty - sy;
        const len = Math.hypot(dx, dy) || 1;
        const spd = this.kind === 'dryad' ? 450 : 435;
        const projCol =
          this.kind === 'astrologer'
            ? '#38bdf8'
            : this.kind === 'dryad'
              ? '#34d399'
              : '#a855f7';
        const coreCol =
          this.kind === 'astrologer'
            ? '#fef08a'
            : this.kind === 'dryad'
              ? '#ecfdf5'
              : '#f3e8ff';
        if (game?.audio) game.audio.play('skill_cast', sx);
        game?.vfx?.spawnBurst?.(sx, sy, 8, projCol, 130, { upBias: 45, size: 4 });
        game?.vfx?.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / len) * spd,
          vy: (dy / len) * spd,
          radius: 15,
          color: projCol,
          coreColor: coreCol,
          damage: Math.round(34 * this.dmgScale),
          owner: this,
          type: 'monster_orb',
          theme: this.theme,
          zone: this.getMonsterBiomeZone()
        });
      } else if (this.isHeavyArchetype) {
        const isTreant = this.kind === 'treant';
        const slamCol = isTreant ? '#34d399' : '#f59e0b';
        if (game?.audio) game.audio.play('heavy_cleave', this.x);
        if (game?.renderer) game.renderer.triggerShake(9, 0.18);
        const fAng = this.facing === 1 ? 0 : Math.PI;
        game?.vfx?.spawnSlash(
          this.x + this.facing * 52,
          this.y - 88,
          86,
          fAng - 1.1,
          fAng + 1.1,
          slamCol,
          0.26,
          { owner: this }
        );
        game?.vfx?.spawnShockwave(
          this.x + this.facing * 64,
          this.groundY - 8,
          92,
          isTreant ? '#10b981' : '#ea580c',
          0.26,
          true
        );
        game?.adventure?.spawnMonsterPlume?.(
          this.x + this.facing * 56,
          this.groundY,
          this.getMonsterStageVfxRow(),
          slamCol,
          1.45,
          0.42,
          6
        );
        if (
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - this.x) <= this.attackRange + 28 &&
          Math.abs((enemy.groundY || enemy.y) - this.groundY) <= 58
        ) {
          enemy.takeDamage(Math.round(52 * this.dmgScale), this, false, 165, -90);
        }
      } else {
        // Vanguard strike: Templar Eclipse Rune-Blade / Ghoul Crypt Claw / Fiend Molten Hellfire Rake!
        const slashCol =
          this.kind === 'templar'
            ? '#38bdf8'
            : this.kind === 'fiend'
              ? '#ef4444'
              : '#c084fc';
        if (game?.audio) game.audio.play('slash', this.x);
        const fAng = this.facing === 1 ? 0 : Math.PI;
        game?.vfx?.spawnSlash(
          this.x + this.facing * 44,
          this.y - 78,
          64,
          fAng - 0.9,
          fAng + 0.9,
          slashCol,
          0.20,
          { owner: this }
        );
        game?.vfx?.spawnBurst?.(this.x + this.facing * 48, this.y - 76, 6, slashCol, 120, {
          upBias: 50,
          size: 4
        });
        if (
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - this.x) <= this.attackRange + 22 &&
          Math.abs((enemy.groundY || enemy.y) - this.groundY) <= 54
        ) {
          enemy.takeDamage(Math.round(33 * this.dmgScale), this, false, 95, 0);
        }
      }
    }

    if (t >= this.autoDuration) {
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;
    if (!this._skillStarted) {
      this._skillStarted = true;
      this._skillCastCount = (this._skillCastCount || 0) + 1;
    }
    if (this.isMiniBoss || (this.isElite && this._skillCastCount % 2 === 0)) {
      const skillDur = this.skillDuration || 0.88;
      const step = Math.min(29, Math.max(0, Math.floor((t / Math.max(0.1, skillDur)) * 30)));
      this._overrideFrameIdx = 120 + step;
    }

    if (this.isCasterArchetype) {
      if (t >= 0.18 && !this.didActionFrame) {
        this.didActionFrame = true;
        const targetX = enemy ? enemy.x : this.x + this.facing * 300;
        const targetGy = enemy ? enemy.groundY || enemy.y : this.groundY;
        const sigilCol =
          this.kind === 'astrologer'
            ? '#38bdf8'
            : this.kind === 'dryad'
              ? '#10b981'
              : '#a855f7';
        const sigilLbl = this.isMiniBoss
          ? this.skillName || 'TRI-SIGIL RIFT'
          : this.kind === 'astrologer'
            ? 'ECLIPSE SIGIL'
            : this.kind === 'dryad'
              ? 'BRIAR SNARE'
              : 'SOUL SIGIL';
        this.spawnFloorTelegraph(targetX, 84, 0.72, 54, sigilCol, sigilLbl, targetGy);
        game?.adventure?.spawnMonsterPlume?.(
          this.x,
          this.groundY,
          this.getMonsterStageVfxRow(),
          sigilCol,
          1.35,
          0.44,
          5
        );
        if (this.isMiniBoss && this.kind === 'cultist') {
          // ARCH-LICH MORVATH: Tri-Sigil Ossuary Cataclysm bracketing 3D lanes + twin void-soul bolts!
          const upperGy = Math.max(458, Math.min(664, targetGy > 540 ? 478 : 562));
          const lowerGy = Math.max(458, Math.min(664, targetGy < 590 ? 642 : 562));
          this.spawnFloorTelegraph(
            targetX + this.facing * 136,
            78,
            0.90,
            48,
            '#e879f9',
            sigilLbl,
            upperGy
          );
          this.spawnFloorTelegraph(
            targetX - this.facing * 124,
            78,
            1.08,
            48,
            '#c084fc',
            sigilLbl,
            lowerGy
          );
          for (const vyOff of [-26, 26]) {
            game?.vfx?.spawnProjectile?.({
              x: this.x + this.facing * 38,
              y: this.y - 88,
              vx: this.facing * 320,
              vy: vyOff,
              radius: 16,
              color: '#a855f7',
              coreColor: '#f3e8ff',
              damage: Math.round(36 * this.dmgScale),
              owner: this,
              type: 'monster_orb',
              theme: this.theme,
              zone: this.getMonsterBiomeZone()
            });
          }
          if (game?.renderer) game.renderer.triggerShake(9, 0.20);
        } else if (this.isElite) {
          const riftGy = Math.max(454, Math.min(668, targetGy + (targetGy > 561 ? -54 : 54)));
          this.spawnFloorTelegraph(
            targetX + this.facing * 125,
            72,
            0.88,
            46,
            this.secondaryColor || '#38bdf8',
            sigilLbl,
            riftGy
          );
        }
        if (game?.audio) game.audio.play('skill_cast', this.x);
      }
    } else if (this.isHeavyArchetype) {
      if (t >= 0.44 && !this.didActionFrame) {
        this.didActionFrame = true;
        const isTreant = this.kind === 'treant';
        const waveCol = isTreant ? '#10b981' : '#f59e0b';
        const sx = this.x + this.facing * 62;
        if (game?.audio) game.audio.play('thunder_slam', sx);
        if (game?.renderer) game.renderer.triggerShake(this.isMiniBoss ? 15 : 13, 0.26);
        game?.vfx?.spawnShockwave(
          sx,
          this.groundY - 8,
          this.isMiniBoss ? 155 : 135,
          isTreant ? '#34d399' : '#f59e0b',
          0.34,
          true
        );
        game?.vfx?.spawnBurst(
          sx,
          this.groundY - 16,
          18,
          isTreant ? '#6ee7b7' : '#fb923c',
          240,
          { upBias: 150, size: 6 }
        );
        game?.adventure?.spawnMonsterPlume?.(
          sx,
          this.groundY,
          this.getMonsterStageVfxRow(),
          waveCol,
          this.isMiniBoss ? 2.25 : 1.75,
          0.52,
          8
        );
        game?.vfx?.spawnProjectile({
          x: sx,
          y: this.groundY - 48,
          vx: this.facing * 510,
          vy: 0,
          radius: 22,
          color: waveCol,
          coreColor: isTreant ? '#d1fae5' : '#fef08a',
          damage: Math.round(54 * this.dmgScale),
          owner: this,
          type: 'monster_wave',
          zone: this.getMonsterBiomeZone(),
          vfxRow: this.getMonsterStageVfxRow()
        });
        if (this.isMiniBoss && isTreant) {
          // ELDER BRIAR-KING: 3-Lane Staggered Briar-Root Eruption across Upper, Mid & Lower causeway lanes!
          const targetX = enemy ? enemy.x : this.x + this.facing * 260;
          const rootLbl = this.skillName || 'BRIAR-CROWN CATACLYSM';
          this.spawnFloorTelegraph(targetX - 70, 76, 0.74, 48, '#34d399', rootLbl, 476);
          this.spawnFloorTelegraph(targetX + 20, 82, 0.94, 52, '#10b981', rootLbl, 560);
          this.spawnFloorTelegraph(targetX + 110, 76, 1.14, 48, '#2dd4bf', rootLbl, 644);
        }
      }
    } else {
      // Vanguard 3D Lunge (`templar` Eclipse Thrust / `ghoul` Crypt Pounce / `fiend` Hellfire Leap)
      if (t >= 0.22 && t < 0.56) {
        this.recordAfterimage(0.24, 0.22);
        this.x = this.clampMonsterX(this.x + this.facing * 410 * dt, game);
        this.shiftMonsterDepth((this.pounceVelZ || 0) * dt, game);
        this.y = this.groundY - Math.sin(((t - 0.22) / 0.34) * Math.PI) * 34;
        if (t >= 0.28 && this.isElite && this.kind === 'templar' && !this.didSecondaryAction) {
          this.didSecondaryAction = true;
          game?.vfx?.spawnProjectile?.({
            x: this.x + this.facing * 42,
            y: this.groundY - 52,
            vx: this.facing * 440,
            vy: 0,
            radius: 18,
            color: '#38bdf8',
            coreColor: '#fef08a',
            damage: Math.round(32 * this.dmgScale),
            owner: this,
            type: 'monster_wave',
            zone: 0,
            vfxRow: 10
          });
        }
        if (
          !this.didActionFrame &&
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - this.x) < 105 &&
          Math.abs((enemy.groundY || enemy.y) - this.groundY) <= 56
        ) {
          this.didActionFrame = true;
          const slashCol =
            this.kind === 'templar'
              ? '#38bdf8'
              : this.kind === 'fiend'
                ? '#fb923c'
                : '#c084fc';
          if (game?.audio) game.audio.play('scythe_reap', this.x);
          const fAng = this.facing === 1 ? 0 : Math.PI;
          game?.vfx?.spawnSlash(
            this.x + this.facing * 38,
            this.y - 76,
            68,
            fAng - 1.0,
            fAng + 1.0,
            slashCol,
            0.22,
            { owner: this }
          );
          game?.adventure?.spawnMonsterPlume?.(
            this.x + this.facing * 36,
            this.groundY,
            this.getMonsterStageVfxRow(),
            slashCol,
            1.45,
            0.44,
            6
          );
          enemy.takeDamage(Math.round(46 * this.dmgScale), this, true, 145, -80);
        }
      }
    }

    if (t >= this.skillDuration) {
      this.pounceVelZ = 0;
      this.y = this.groundY;
      this.setState('IDLE');
    }
  }

  drawTelegraphRings(ctx) {
    if (!ctx) return;
    const assets = PixelForge.initAssets();
    const fxSheet = PixelForge.ensureImage?.(assets?.advFxSheet) || assets?.advFxSheet;
    const fxReady =
      Boolean(fxSheet) &&
      (typeof HTMLImageElement === 'undefined' ||
        !(fxSheet instanceof HTMLImageElement) ||
        (fxSheet.complete && fxSheet.naturalWidth > 0));
    const zone = this.getMonsterBiomeZone();

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // A. Crisp Pixel-Art Ground Danger-Zone Telegraphs for Heavy Bull-Charge, Seismic Slam & Vanguard Lunge!
    if (!this.isDead && !this.isColossalBoss) {
      if (this.isHeavyArchetype && this.state === 'DASH') {
        const dur = Math.max(0.25, this.dashDuration || 0.62);
        const fillU = Math.max(0, Math.min(1, (this.stateTimer || 0) / 0.22));
        const x0 = Math.round(Math.min(this.dashStartX ?? this.x, this.dashTargetX ?? this.x) / 2) * 2;
        const x1 = Math.round(Math.max(this.dashStartX ?? this.x, this.dashTargetX ?? this.x) / 2) * 2;
        const laneW = Math.max(96, x1 - x0);
        const laneH = 62;
        const gy = Math.round((this.dashTargetGy ?? this.groundY) / 2) * 2;
        const y0 = gy - (laneH >> 1);
        const dir = (this.dashDir || this.facing || 1) >= 0 ? 1 : -1;
        const isAmber = this.kind !== 'treant';
        const colFill = isAmber ? 'rgba(245, 158, 11, 0.18)' : 'rgba(52, 211, 153, 0.18)';
        const colMeter = isAmber ? 'rgba(239, 68, 68, 0.34)' : 'rgba(16, 185, 129, 0.34)';
        const colBorder = fillU >= 0.85 ? '#fef08a' : isAmber ? '#ef4444' : '#34d399';

        ctx.fillStyle = colFill;
        ctx.fillRect(x0, y0, laneW, laneH);
        const progW = Math.max(4, Math.round(laneW * fillU));
        ctx.fillStyle = colMeter;
        ctx.fillRect(dir > 0 ? x0 : x0 + laneW - progW, y0 + 2, progW, laneH - 4);

        // Stepped crisp double pixel border
        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(x0 - 2, y0 - 2, laneW + 4, 4);
        ctx.fillRect(x0 - 2, y0 + laneH - 2, laneW + 4, 4);
        ctx.fillStyle = colBorder;
        ctx.fillRect(x0, y0, laneW, 2);
        ctx.fillRect(x0, y0 + laneH - 2, laneW, 2);
        ctx.fillRect(x0, y0, 2, laneH);
        ctx.fillRect(x0 + laneW - 2, y0, 2, laneH);

        // Pulsing directional pixel chevrons showing exact bull-charge trajectory
        ctx.fillStyle = '#fef08a';
        const step = 64;
        const scroll = Math.round(((this.stateTimer || 0) * 140) % step) * dir;
        for (let cx = x0 + 26; cx < x0 + laneW - 24; cx += step) {
          const px = Math.max(x0 + 10, Math.min(x0 + laneW - 14, cx + scroll));
          ctx.fillRect(px - dir * 6, gy - 8, 4, 4);
          ctx.fillRect(px - dir * 2, gy - 4, 4, 4);
          ctx.fillRect(px + dir * 2, gy - 2, 4, 4);
          ctx.fillRect(px - dir * 2, gy + 2, 4, 4);
          ctx.fillRect(px - dir * 6, gy + 6, 4, 4);
        }
      } else if (this.isHeavyArchetype && this.state === 'SKILL' && (this.stateTimer || 0) < 0.46) {
        const u = Math.max(0, Math.min(1, (this.stateTimer || 0) / 0.44));
        const cx = Math.round((this.x + (this.facing || 1) * 76) / 2) * 2;
        const gy = Math.round((this.groundY || this.y) / 2) * 2;
        const hw = this.isMiniBoss ? 124 : 104;
        const hh = 34;
        const fhw = Math.max(8, Math.round(hw * u));
        const fhh = Math.max(4, Math.round(hh * u));
        const isTreant = this.kind === 'treant';
        const rimCol = u > 0.78 ? '#fef08a' : isTreant ? '#34d399' : '#ef4444';

        ctx.fillStyle = isTreant ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)';
        ctx.fillRect(cx - hw, gy - hh, hw * 2, hh * 2);
        ctx.fillStyle = isTreant ? 'rgba(52, 211, 153, 0.36)' : 'rgba(249, 115, 22, 0.38)';
        ctx.fillRect(cx - fhw, gy - fhh, fhw * 2, fhh * 2);

        ctx.fillStyle = '#0d0f1c';
        ctx.fillRect(cx - hw - 2, gy - hh - 2, hw * 2 + 4, 4);
        ctx.fillRect(cx - hw - 2, gy + hh - 2, hw * 2 + 4, 4);
        ctx.fillStyle = rimCol;
        ctx.fillRect(cx - hw, gy - hh, hw * 2, 2);
        ctx.fillRect(cx - hw, gy + hh - 2, hw * 2, 2);
        ctx.fillRect(cx - hw, gy - hh, 2, hh * 2);
        ctx.fillRect(cx + hw - 2, gy - hh, 2, hh * 2);
      } else if (
        !this.isHeavyArchetype &&
        !this.isCasterArchetype &&
        this.state === 'SKILL' &&
        (this.stateTimer || 0) < 0.28
      ) {
        const u = Math.max(0, Math.min(1, (this.stateTimer || 0) / 0.24));
        const dir = (this.facing || 1) >= 0 ? 1 : -1;
        const len = 160;
        const x0 = Math.round((dir > 0 ? this.x : this.x - len) / 2) * 2;
        const gy = Math.round((this.groundY || this.y) / 2) * 2;
        const y0 = gy - 22;
        const progW = Math.max(6, Math.round(len * u));
        ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
        ctx.fillRect(x0, y0, len, 44);
        ctx.fillStyle = 'rgba(251, 146, 60, 0.36)';
        ctx.fillRect(dir > 0 ? x0 : x0 + len - progW, y0 + 2, progW, 40);
        ctx.fillStyle = u > 0.78 ? '#fef08a' : '#f43f5e';
        ctx.fillRect(x0, y0, len, 2);
        ctx.fillRect(x0, y0 + 42, len, 2);
        ctx.fillRect(x0, y0, 2, 44);
        ctx.fillRect(x0 + len - 2, y0, 2, 44);
      }
    }

    if (!this.telegraphRings.length) {
      ctx.restore();
      return;
    }
    for (const r of this.telegraphRings) {
      const u = Math.max(0, Math.min(1, r.timer / Math.max(0.05, r.maxTimer)));
      const rx = Math.round(r.x / 2) * 2;
      const ry = Math.round((r.y - 4) / 2) * 2;
      const radX = Math.max(12, Math.round(r.radius / 4) * 4);
      const radY = Math.max(12, Math.round((r.radius * 0.28) / 4) * 4);
      const fillRx = Math.max(4, Math.round((radX * u) / 4) * 4);
      const fillRy = Math.max(4, Math.round((radY * u) / 4) * 4);

      drawExBayerHalo(ctx, rx, ry, radX, radY, r.color, '#ffffff', Math.min(0.16, 0.08 + u * 0.08));

      if (fxReady && ctx.drawImage) {
        const sealW = radX * 2;
        const sealH = radY * 2;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.28 + u * 0.44;
        ctx.drawImage(
          fxSheet,
          (4 + zone) * 128,
          512,
          128,
          128,
          Math.round(rx - sealW * 0.5),
          Math.round(ry - sealH * 0.5),
          sealW,
          sealH
        );
      }

      // Quantized 4px-stepped pixel-art foreshortened ground fill (0 vector .ellipse calls)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.22 + u * 0.28;
      ctx.fillStyle = r.color;
      for (let dy = -fillRy; dy <= fillRy; dy += 4) {
        const ny = dy / fillRy;
        const span = Math.round((Math.sqrt(Math.max(0, 1 - ny * ny)) * fillRx) / 4) * 4;
        if (span >= 4) {
          ctx.fillRect(rx - span, ry + dy, span * 2, 4);
        }
      }

      // Stepped pixel-art foreshortened perimeter ring
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = u > 0.78 ? '#fef08a' : r.color;
      const ringT = u > 0.78 ? 4 : 3;
      let prevSpan = 0;
      for (let dy = -radY; dy <= radY; dy += 4) {
        const ny = dy / radY;
        const span = Math.round((Math.sqrt(Math.max(0, 1 - ny * ny)) * radX) / 4) * 4;
        const segW = Math.max(ringT, Math.abs(span - prevSpan) + ringT);
        const edgeX = Math.max(0, Math.max(span, prevSpan) - segW);
        ctx.fillRect(rx - edgeX - segW, ry + dy, segW, ringT);
        ctx.fillRect(rx + edgeX, ry + dy, segW, ringT);
        prevSpan = span;
      }

      // 4 inward-sliding Selout lock-brackets converging as detonation nears
      const off = Math.round(((1 - u) * 14) / 2) * 2;
      const brCol = u > 0.78 ? '#fef08a' : '#ffffff';
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(rx - radX - off - 3, ry - 5, 6, 10);
      ctx.fillRect(rx + radX + off - 3, ry - 5, 6, 10);
      ctx.fillRect(rx - 5, ry - radY - off - 3, 10, 6);
      ctx.fillRect(rx - 5, ry + radY + off - 3, 10, 6);
      ctx.fillStyle = brCol;
      ctx.fillRect(rx - radX - off - 2, ry - 4, 4, 8);
      ctx.fillRect(rx + radX + off - 2, ry - 4, 4, 8);
      ctx.fillRect(rx - 4, ry - radY - off - 2, 8, 4);
      ctx.fillRect(rx - 4, ry + radY + off - 2, 8, 4);

      if (u > 0.62) {
        const su = (u - 0.62) / 0.38;
        for (let s = 0; s < 4; s++) {
          const sx = Math.round(rx + Math.cos(s * 1.57 + su * 2.4) * radX * 0.55);
          const sy = Math.round(ry - 6 - su * 28 - (s % 2) * 8);
          ctx.globalAlpha = Math.max(0.15, (1 - su * 0.5) * 0.9);
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(sx - 3, sy - 3, 6, 6);
          ctx.fillStyle = s % 2 === 0 ? '#fef08a' : r.color;
          ctx.fillRect(sx - 2, sy - 2, 4, 4);
        }
      }
    }
    ctx.restore();
  }

  getPortalEmergeOffset() {
    if (
      this.isDead ||
      this.isColossalBoss ||
      !(this.portalSpawnTimer > 0) ||
      !Number.isFinite(this.portalEmergeFromY) ||
      this.hurtTimer > 0 ||
      this.stunTimer > 0
    ) {
      return { active: false, ox: 0, oy: 0, scale: 1, alpha: 1, u: 1 };
    }
    const maxT = Math.max(0.1, this.portalSpawnMax || 0.72);
    const u = Math.max(0, Math.min(1, 1 - this.portalSpawnTimer / maxT));
    const ease = 1 - Math.pow(1 - u, 2.2);
    const fromX = Number.isFinite(this.portalEmergeFromX) ? this.portalEmergeFromX : this.x;
    const fromY = this.portalEmergeFromY;
    const curY = Number.isFinite(this.groundY) ? this.groundY : this.y;
    return {
      active: true,
      ox: Math.round((fromX - this.x) * (1 - ease)),
      oy: Math.round((fromY - curY) * (1 - ease)),
      scale: 0.74 + 0.26 * ease,
      alpha: Math.min(1, 0.18 + u * 1.9),
      u
    };
  }

  drawOverheadPlate(ctx) {
    if (this.isDead) return;
    const emerge = this.getPortalEmergeOffset();
    if (emerge.active && emerge.u < 0.28) return;
    const scale = (this.spriteScale || 1) * (emerge.active ? emerge.scale : 1);
    const barW = this.isBoss ? 96 : this.isMiniBoss ? 86 : this.isElite ? 66 : 52;
    const barH = this.isBoss ? 7 : this.isMiniBoss ? 6 : 5;
    const bx = Math.round(this.x + emerge.ox);
    const by = Math.round(
      this.y + emerge.oy - 168 * scale - (this.isBoss ? 18 : this.isMiniBoss ? 10 : 6)
    );
    const x0 = bx - Math.floor(barW * 0.5);
    const hpPct = Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));

    ctx.save();
    if (emerge.active) {
      ctx.globalAlpha *= Math.min(1, (emerge.u - 0.28) / 0.35);
    }
    if (this.telegraphTimer > 0 && !this.isBoss) {
      // Crisp 14x14 pixel-art exclamation danger badge (replaces verbose text boxes!)
      const pulse = Math.sin((this.walkPhase || 0) * 18) > -0.2;
      const dy = by - 20;
      ctx.fillStyle = '#090512';
      ctx.fillRect(bx - 7, dy - 7, 14, 14);
      ctx.fillStyle = pulse ? '#ef4444' : '#f59e0b';
      ctx.fillRect(bx - 6, dy - 6, 12, 12);
      ctx.fillStyle = '#090512';
      ctx.fillRect(bx - 5, dy - 5, 10, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx - 1, dy - 4, 2, 5);
      ctx.fillRect(bx - 1, dy + 2, 2, 2);
    }
    if (this.isMiniBoss && !this.isBoss) {
      // Gold-Crowned Realm Mini-Boss Warden Nameplate (pure integer fillRect crown, 0 ctx.rotate!)
      const tag = this.staggerBreakTimer > 0 ? 'GUARD BROKEN!' : this.name;
      const tw = Math.max(84, tag.length * 5 + 14);
      const px0 = bx - Math.floor(tw * 0.5);
      const labelY = this.telegraphTimer > 0 ? by - 36 : by - 16;
      ctx.fillStyle = '#070a14';
      ctx.fillRect(px0, labelY, tw, 12);
      ctx.strokeStyle = this.staggerBreakTimer > 0 ? '#67e8f9' : '#d4af37';
      ctx.lineWidth = 1;
      ctx.strokeRect(px0, labelY, tw, 12);
      // 5-pixel sovereign crown crest centered above plaque
      const cy = labelY - 6;
      ctx.fillStyle = '#05070e';
      ctx.fillRect(bx - 6, cy - 1, 12, 6);
      ctx.fillStyle = this.staggerBreakTimer > 0 ? '#67e8f9' : '#facc15';
      ctx.fillRect(bx - 5, cy + 2, 10, 2);
      ctx.fillRect(bx - 5, cy, 2, 2);
      ctx.fillRect(bx - 1, cy - 1, 2, 3);
      ctx.fillRect(bx + 3, cy, 2, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx - 1, cy - 1, 2, 1);

      ctx.font = '6px "ArcanePixel", "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = this.staggerBreakTimer > 0 ? '#67e8f9' : '#fef08a';
      ctx.fillText(tag, bx, labelY + 8);
    } else if (this.isElite && !this.isBoss && this.telegraphTimer <= 0) {
      ctx.font = '6px "ArcanePixel", "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.fillText('ELITE', bx, by - 4);
    }

    ctx.fillStyle = '#05070e';
    ctx.fillRect(x0 - 1, by - 1, barW + 2, barH + 2);
    ctx.strokeStyle = this.isBoss
      ? '#ef4444'
      : this.isMiniBoss
        ? '#fde047'
        : this.isElite
          ? '#facc15'
          : '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 1, by - 1, barW + 2, barH + 2);

    ctx.fillStyle = this.isBoss ? '#dc2626' : this.primaryColor;
    ctx.fillRect(x0, by, Math.round(barW * hpPct), barH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(x0, by, Math.round(barW * hpPct), 1);
    if (this.isMiniBoss) {
      ctx.fillStyle = 'rgba(5, 7, 14, 0.72)';
      for (const frac of [0.25, 0.5, 0.75]) {
        ctx.fillRect(x0 + Math.round(barW * frac), by, 1, barH);
      }
    }

    // Slim golden Stagger / Guard-Break Gauge beneath Mini-Boss Wardens (`maxStagger > 0`)
    if (this.maxStagger > 0 && !this.isBoss) {
      const sy = by + barH + 3;
      const sh = 4;
      const stRatio =
        this.staggerBreakTimer > 0
          ? Math.max(0, Math.min(1, this.staggerBreakTimer / 3.2))
          : Math.max(0, Math.min(1, this.stagger / Math.max(1, this.maxStagger)));
      ctx.fillStyle = '#05070e';
      ctx.fillRect(x0 - 1, sy - 1, barW + 2, sh + 2);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x0, sy, barW, sh);
      ctx.fillStyle = this.staggerBreakTimer > 0 ? '#67e8f9' : '#facc15';
      ctx.fillRect(x0, sy, Math.round(barW * stRatio), sh);
      ctx.fillStyle = this.staggerBreakTimer > 0 ? '#ffffff' : '#fef08a';
      ctx.fillRect(x0, sy, Math.round(barW * stRatio), 1);
    }

    // Compact tactical hazard status pips beside HP bar (Cursed Pylon Buff / Spore Vulnerability)
    if (this._cursedBuffTimer > 0) {
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(x0 - 9, by - 1, 7, 7);
      ctx.fillStyle = '#e879f9';
      ctx.fillRect(x0 - 8, by, 5, 5);
    }
    if (this._sporeVulnTimer > 0) {
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(x0 + barW + 2, by - 1, 7, 7);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(x0 + barW + 3, by, 5, 5);
    }
    ctx.restore();
  }

  drawForegroundOverlay(ctx, renderer) {
    if (!ctx || this.isDead || this.isColossalBoss) return;
    const assets = PixelForge.initAssets();
    const zone = this.getMonsterBiomeZone();
    const emerge = this.getPortalEmergeOffset();
    const ex = this.x + emerge.ox;
    const egy = (this.groundY || this.y) + emerge.oy;

    if (this.isElite || this.isMiniBoss) {
      drawExBayerHalo(
        ctx,
        ex,
        egy - 2,
        this.isMiniBoss ? 68 : 52,
        this.isMiniBoss ? 18 : 14,
        this.primaryColor || '#38bdf8',
        this.secondaryColor || '#fef08a',
        (this.isMiniBoss ? 0.16 : 0.12) * emerge.alpha
      );
      const fxSheet = PixelForge.ensureImage?.(assets?.advFxSheet) || assets?.advFxSheet;
      const fxReady =
        Boolean(fxSheet) &&
        (typeof HTMLImageElement === 'undefined' ||
          !(fxSheet instanceof HTMLImageElement) ||
          (fxSheet.complete && fxSheet.naturalWidth > 0));
      if (fxReady && ctx.drawImage) {
        const sealW = Math.round((this.isMiniBoss ? 148 : 116) * emerge.scale);
        const sealH = Math.round((this.isMiniBoss ? 52 : 40) * emerge.scale);
        const pulse = 0.5 + 0.5 * Math.sin((renderer?.time || 0) * 5.2 + (this.x % 7));
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (0.36 + 0.14 * pulse) * emerge.alpha;
        ctx.drawImage(
          fxSheet,
          (4 + zone) * 128,
          512,
          128,
          128,
          Math.round(ex - sealW * 0.5),
          Math.round(egy - sealH * 0.5),
          sealW,
          sealH
        );
        ctx.restore();
      }
    }

    if (this.state === 'SKILL') {
      const stageVfx = PixelForge.ensureImage?.(assets?.advStageVfx) || assets?.advStageVfx;
      const stageReady =
        Boolean(stageVfx) &&
        (typeof HTMLImageElement === 'undefined' ||
          !(stageVfx instanceof HTMLImageElement) ||
          (stageVfx.complete && stageVfx.naturalWidth > 0));
      if (stageReady && ctx.drawImage) {
        const vRow = this.isMiniBoss ? 11 : this.getMonsterStageVfxRow();
        const sCol = Math.floor((this.stateTimer || 0) * 24) & 15;
        const auraSz = Math.round(144 * (this.spriteScale || 1.0));
        const ax = Math.round(this.x - auraSz * 0.5);
        const ay = Math.round(this.y - auraSz * 0.844);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.58;
        ctx.drawImage(stageVfx, sCol * 128, vRow * 128, 128, 128, ax, ay, auraSz, auraSz);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.14;
        ctx.drawImage(stageVfx, sCol * 128, vRow * 128, 128, 128, ax, ay, auraSz, auraSz);
        ctx.restore();
      }
    }
  }

  draw(ctx, isReflection = false, renderer = null) {
    const assets = PixelForge.initAssets();
    const charKey = this.heroId || this.kind;
    if (charKey) PixelForge.ensureHeroLoaded?.(charKey);
    const charSet = assets[this.heroId] || assets[this.kind];
    const sheet = PixelForge.ensureImage(charSet?.sheet);
    if (
      !isReflection &&
      ctx?.fillRect &&
      charSet &&
      sheet &&
      (!sheet.complete || !sheet.naturalWidth) &&
      typeof HTMLImageElement !== 'undefined' &&
      sheet instanceof HTMLImageElement
    ) {
      ctx.save();
      ctx.translate(Math.round(this.x), Math.round(this.y));
      PixelForge._drawLoadingSilhouette?.(ctx, { heroId: charKey, team: 2 }, this.w || 72, this.h || 104);
      ctx.restore();
      if (!isReflection) this.drawOverheadPlate(ctx);
      return;
    }
    if (charSet && sheet && sheet.complete && sheet.naturalWidth > 0) {
      const emerge = this.getPortalEmergeOffset();
      const emergeU = emerge.active
        ? emerge.u
        : this.portalSpawnTimer > 0
          ? 1 - this.portalSpawnTimer / Math.max(0.1, this.portalSpawnMax || 0.72)
          : 1;
      const emergeScale = emerge.active ? emerge.scale : emergeU < 1 ? 0.84 + 0.16 * emergeU : 1;
      const scale = (this.spriteScale || 1.0) * emergeScale;
      const drawW = Math.round(208 * scale);
      const drawH = Math.round(208 * scale);
      const shakeX =
        !isReflection && this.hurtTimer > 0 ? Math.round(Math.sin(this.hurtTimer * 55) * 4) : 0;

      if (!isReflection && this.afterimages?.length && PixelForge.resolveSheetMetrics && ctx.drawImage) {
        const metrics = PixelForge.resolveSheetMetrics(charSet, sheet, drawW, drawH);
        const { cellW, cellH, cols, rows, baseX, baseY } = metrics;
        for (const ghost of this.afterimages) {
          const gu = Math.max(0, Math.min(1, ghost.life / Math.max(0.05, ghost.maxLife || 0.22)));
          const fIdx = Math.max(0, Math.min(cols * rows - 1, ghost.frameIdx || 0));
          const col = fIdx % cols;
          const row = Math.min(rows - 1, Math.max(0, (fIdx / cols) | 0));
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(0.18, (ghost.alpha || 0.24) * gu);
          ctx.translate(Math.round(ghost.x), Math.round(ghost.y));
          ctx.scale(ghost.facing || 1, 1);
          ctx.drawImage(
            sheet,
            col * cellW,
            row * cellH,
            cellW,
            cellH,
            Math.round(baseX),
            Math.round(baseY),
            metrics.drawW,
            metrics.drawH
          );
          ctx.restore();
        }
      }

      const deathAlpha = this.isDead
        ? Math.max(0.03, 1 - Math.max(0, (this.deathTimer || 0) - 0.12) / 0.48)
        : 1;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(this.x + emerge.ox + shakeX), Math.round(this.y + emerge.oy));
      ctx.scale(this.facing, 1);

      if (emergeU < 1 && !isReflection) {
        ctx.globalAlpha *= emerge.active ? emerge.alpha : 0.45 + 0.55 * emergeU;
      }
      if (this.isDead) {
        ctx.globalAlpha *= deathAlpha;
      }

      PixelForge.drawSheetFrame(ctx, charSet, this, drawW, drawH, this.walkPhase, isReflection, renderer);

      if (!isReflection && (this.hitFlash > 0 || emergeU < 0.75 || (this.isDead && (this.deathTimer || 0) < 0.28))) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.isDead
          ? Math.min(0.42, (1 - (this.deathTimer || 0) / 0.28) * 0.42)
          : this.hitFlash > 0
            ? Math.min(0.42, this.hitFlash * 2.2)
            : (1 - emergeU) * 0.18;
        PixelForge.drawSheetFrame(ctx, charSet, this, drawW, drawH, this.walkPhase, true, renderer);
      }
      ctx.restore();

      // Render Distinct Elemental Monster Death Burst Particles (bone fragments, dryad leaves, soul flames, cinder shards)
      if (!isReflection && this.deathBurstParticles?.length && ctx?.fillRect) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (let i = 0; i < this.deathBurstParticles.length; i++) {
          const dp = this.deathBurstParticles[i];
          const rem = Math.max(0, 1 - dp.age / Math.max(0.05, dp.maxLife));
          const a = rem < 0.30 ? rem / 0.30 : 1;
          const px = Math.round(dp.x);
          const py = Math.round(dp.y);
          ctx.globalAlpha = a * 0.94;
          if (dp.style === 'bone') {
            ctx.fillStyle = '#0d0f1c';
            ctx.fillRect(px - (dp.w >> 1) - 1, py - (dp.h >> 1) - 1, dp.w + 2, dp.h + 2);
            ctx.fillStyle = dp.col;
            ctx.fillRect(px - (dp.w >> 1), py - (dp.h >> 1), dp.w, dp.h);
            ctx.fillStyle = dp.hi;
            ctx.fillRect(px - (dp.w >> 1), py - (dp.h >> 1), Math.max(2, dp.w - 2), 1);
          } else if (dp.style === 'leaf') {
            const flip = (Math.floor(dp.age * 8 + dp.phase) & 1) === 0;
            const lw = flip ? dp.w : dp.h;
            const lh = flip ? dp.h : dp.w;
            ctx.fillStyle = '#052e2b';
            ctx.fillRect(px - (lw >> 1) - 1, py - (lh >> 1) - 1, lw + 2, lh + 2);
            ctx.fillStyle = dp.col;
            ctx.fillRect(px - (lw >> 1), py - (lh >> 1), lw, lh);
            ctx.fillStyle = dp.hi;
            ctx.fillRect(px - 1, py - 1, 2, 2);
          } else if (dp.style === 'soul_flame') {
            const fh = Math.max(4, Math.round(dp.h * (0.65 + 0.35 * rem)));
            ctx.fillStyle = '#0d0f1c';
            ctx.fillRect(px - (dp.w >> 1) - 1, py - fh - 1, dp.w + 2, fh + 2);
            ctx.fillStyle = dp.col;
            ctx.fillRect(px - (dp.w >> 1), py - fh, dp.w, fh);
            ctx.fillStyle = dp.hi;
            ctx.fillRect(px - 1, py - Math.round(fh * 0.7), 2, Math.max(2, Math.round(fh * 0.45)));
          } else {
            ctx.fillStyle = '#0d0f1c';
            ctx.fillRect(px - (dp.w >> 1) - 1, py - (dp.h >> 1) - 1, dp.w + 2, dp.h + 2);
            ctx.fillStyle = dp.col;
            ctx.fillRect(px - (dp.w >> 1), py - (dp.h >> 1), dp.w, dp.h);
            ctx.fillStyle = dp.hi;
            ctx.fillRect(px - 1, py - 1, 2, 2);
          }
        }
        ctx.restore();
      }

      if (!isReflection && !this.isDead && !this.isColossalBoss && (this.isElite || this.isMiniBoss) && ctx?.fillRect) {
        const moteCount = this.isMiniBoss ? 3 : 2;
        const scaleM = this.spriteScale || 1.0;
        const centerY = this.y - 84 * scaleM;
        const tMote = renderer?.time || this.walkPhase || 0;
        const orbRx = this.isMiniBoss ? 44 : 36;
        const orbRy = this.isMiniBoss ? 20 : 16;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        for (let m = 0; m < moteCount; m++) {
          const ang = tMote * 2.8 + (m / moteCount) * Math.PI * 2;
          const mx = Math.round((this.x + Math.cos(ang) * orbRx) / 2) * 2;
          const my = Math.round((centerY + Math.sin(ang) * orbRy) / 2) * 2;
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(mx - 3, my - 3, 6, 6);
          ctx.fillStyle =
            m % 2 === 0 ? this.primaryColor || '#38bdf8' : this.secondaryColor || '#fde047';
          ctx.fillRect(mx - 2, my - 2, 4, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mx - 1, my - 1, 2, 2);
        }
        ctx.restore();
      }
      if (!isReflection && !this.isDead && !this.isColossalBoss && (this._chillTimer || 0) > 0 && ctx?.fillRect) {
        const scaleF = this.spriteScale || 1.0;
        const gyF = Math.round(this.groundY || this.y || 561);
        const mxF = Math.round(this.x);
        const tF = renderer?.time || this.walkPhase || 0;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = 'rgba(103, 232, 249, 0.32)';
        ctx.fillRect(mxF - Math.round(24 * scaleF), gyF - 5, Math.round(48 * scaleF), 6);
        for (let fi = 0; fi < 3; fi++) {
          const ang = tF * 3.4 + fi * 2.09;
          const fx = Math.round(mxF + Math.cos(ang) * 24 * scaleF);
          const fy = Math.round(gyF - 38 * scaleF - fi * 18 * scaleF + Math.sin(tF * 5 + fi) * 4);
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(fx - 3, fy - 4, 6, 8);
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(fx - 2, fy - 3, 4, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(fx - 1, fy - 1, 2, 2);
        }
        ctx.restore();
      }
    }

    if (!isReflection) {
      this.drawOverheadPlate(ctx);
    }
  }
}

/**
 * GIANT RIGHT-SIDE COLOSSAL FINAL BOSS: BEHEMOTH MALPHAS, COLOSSUS OF THE BLACK PIT
 */
export class ArchfiendBoss extends Monster {
  constructor(x = 9335, groundY = 561, _facing = -1, opts = {}) {
    const bossMaxHp =
      Number.isFinite(opts?.maxHp) && opts.maxHp > 0 ? Math.round(opts.maxHp) : 11800;
    const bossName =
      typeof opts?.name === 'string' && opts.name.trim()
        ? opts.name.trim()
        : 'BEHEMOTH MALPHAS';
    super('brute', x, groundY, -1, {
      maxHp: bossMaxHp,
      spriteScale: opts?.spriteScale || 2.18,
      dmgScale: opts?.dmgScale || 1.24,
      skipPortal: true
    });
    this.heroId = 'archfiend';
    this.kind = 'archfiend';
    this.name = bossName;
    this.theme = 'abyssal';
    this.primaryColor = '#ef4444';
    this.secondaryColor = '#f59e0b';
    this.isBoss = true;
    this.isColossalBoss = true;
    this.isElite = true;
    this.portalSpawnTimer = 0;
    this.scoreValue = 6800;

    // Permanently anchored on the FAR RIGHT side of Zone IV facing LEFT (-X)!
    this.anchorX = Number.isFinite(x) ? x : 9335;
    this.anchorGroundY = Number.isFinite(groundY) ? groundY : 561;
    this.x = this.anchorX;
    this.groundY = this.anchorGroundY;
    this.y = this.anchorGroundY;
    this.facing = -1;
    this.isInvulnerable = false;
    PixelForge.ensureHeroLoaded?.('archfiend');

    this.moveSpeed = 0;
    this.attackRange = 880;
    this.autoInterval = 1.85;
    this.autoDuration = 1.04;
    this.skillMaxCooldown =
      Number.isFinite(opts?.skillMaxCooldown) && opts.skillMaxCooldown > 0
        ? opts.skillMaxCooldown
        : 3.9;
    this.skillDuration = 1.08;
    this.ultDuration = 1.85;
    this.ultCooldown = 6.2;
    this.skillName = 'SIEGE CLAW & HELLFIRE';
    this.ultName = 'BLACK PIT CATACLYSM';

    this.hasPoise = true;
    this.unstoppablePoise = true;
    this.bossPhase = 1;
    this.didPhase2 = false;
    this.didPhase3 = false;
    this.vulnerableTimer = 0;
    this.maxStagger = 220;
    this.stagger = 0;
    this.staggerBreakTimer = 0;
    this.staggerDecayDelay = 0;

    // Dramatic Appearing Eruption & Parapet Climb (`isInvulnerable` stays false for immediate hit reachability!)
    this.emergeTimer = 1.60;
    this.emergeMax = 1.60;
    this._emergeStage = 0;
    this.autoCooldown = 1.95;
    this.skillCooldown = 2.65;
    this.jawOpen = 0;
    this.roarFlashTimer = 0;
    this._emberAccum = 0;
    this._rakeSparkAccum = 0;
    this._deathBlastStage = 0;
    this.lastEnemyRef = null;

    // Articulated Multi-Limb & Auto-Play Telegraph State (Zero ctx.rotate — pure 2.5D integer pixel blits!)
    this.skillVariant = 0;
    this.slamTargetX = this.anchorX - 380;
    this.slamTargetGy = this.anchorGroundY;
    this.fistVisible = false;
    this.fistWorldX = this.anchorX - 320;
    this.fistWorldY = 260;
    this.fistShadowGy = this.anchorGroundY;

    this.rakeActive = false;
    this.rakeWarnOnly = false;
    this.rakeLaneGy = 504;
    this.clawWorldX = this.anchorX - 165;
    this.clawWorldY = 548;
    this.bossAction = null;
    this.sweepLane = null;

    // Abyssal Siege Grab (`skillVariant === 2`) & Automatic Unavoidable Hellpit Soul-Tithe State
    this.grabWarnOnly = false;
    this.grabActive = false;
    this.grabLaneGy = this.anchorGroundY;
    this.grabTargetX = this.anchorX - 420;
    this.grabbedTarget = null;
    this._grabCrushTicks = 0;
    this._grabInitDone = false;
    this._grabSqueezeFlash = 0;
    this._phaseShiftFlashTimer = 0;

    this.soulTitheBaseCd =
      Number.isFinite(opts?.soulTitheBaseCd) && opts.soulTitheBaseCd > 0
        ? opts.soulTitheBaseCd
        : 5.4;
    this.soulTitheCooldown = this.soulTitheBaseCd;
    this.soulTitheChipScale =
      Number.isFinite(opts?.soulTitheChipScale) && opts.soulTitheChipScale > 0
        ? opts.soulTitheChipScale
        : 1.0;
    this.soulTitheWindupTimer = 0;
    this.soulTitheFlashTimer = 0;
    this.soulTitheCount = 0;

    // Upgraded 32-Cell HD-2D Wingbeat, Smooth Damped Pose Channels, Erupting Magma Spires & 3D Boulder Debris
    this.animTime = 0;
    this.wingPhase = 0;
    this.impactRecoilTimer = 0;
    this._rakeSpireStage = 0;
    this.activeMagmaSpires = [];
    this.activeMagmaDebris = [];
    this._poseBodyX = 0;
    this._poseBodyY = 0;
    this._poseShrugY = 0;
    this._poseFrontShX = 0;
    this._poseSkullX = 0;
    this._poseSkullY = 0;
    this._poseRearClawX = 0;
    this._poseRearClawY = 0;
  }

  releaseGrabbedTarget() {
    const target = this.grabbedTarget;
    this.grabbedTarget = null;
    this.grabWarnOnly = false;
    this.grabActive = false;
    this._grabCrushTicks = 0;
    this._grabInitDone = false;
    this._grabSqueezeFlash = 0;
    if (this.bossAction === 'claw_grab') {
      this.bossAction = null;
    }
    if (target) {
      target._grabbedByBoss = false;
      target._grabbedByBossTimer = 0;
      target.vx = 0;
      target.vy = 0;
      target.y = target.groundY || target.y || 561;
      if (!target.isDead && target.state !== 'VICTORY' && target.state === 'HURT') {
        target.hurtTimer = Math.min(target.hurtTimer || 0, 0.16);
      }
    }
  }

  takeDamage(amount, attacker, spawnHitVfx = true, knockback = 0, launchVy = 0) {
    if (this.hp - Math.max(0, amount) <= 0 && this.grabbedTarget) {
      this.releaseGrabbedTarget();
    }
    const res = super.takeDamage(amount, attacker, spawnHitVfx, knockback, launchVy);
    if (this.isDead && this.grabbedTarget) {
      this.releaseGrabbedTarget();
    }
    return res;
  }

  applyBossGuaranteedDamage(target, rawDmg, game, callout = '') {
    if (!target || target.isDead || target.state === 'VICTORY') return 0;
    const advProg = game?.adventure?.progression;
    const defenseScale = advProg ? Math.max(0.62, 1 - (advProg.damageReduction || 0) * 0.45) : 1;
    const dmg = Math.max(22, Math.round(rawDmg * defenseScale));
    const prevHp = target.hp;
    if (target.state === 'ULTIMATE' || target.state === 'TRUE_ULTIMATE') {
      target.hp = Math.max(1, target.hp - dmg);
    } else {
      target.hp = Math.max(0, target.hp - dmg);
    }
    const dealt = prevHp - target.hp;
    target.hitFlash = 0.24;
    target.timeSinceLastHit = 0;
    if (target.stats) {
      target.stats.damageTaken = (target.stats.damageTaken || 0) + dealt;
    }
    if (this.stats) {
      this.stats.damageDealt = (this.stats.damageDealt || 0) + dealt;
    }
    if (game?.vfx) {
      if (callout) {
        game.vfx.spawnDamageText(target.x, target.y - 224, 0, true, callout, '#f43f5e');
      }
      game.vfx.spawnDamageText(target.x - (target.facing || 1) * 20, target.y - 190, dealt, true);
      game.vfx.spawnBurst(target.x, target.y - 96, 12, '#ef4444', 210, { upBias: 95, size: 6 });
      game.vfx.spawnShockwave(target.x, (target.groundY || target.y) - 6, 86, '#dc2626', 0.28, true);
    }
    if (target.hp <= 0 && !target.isDead) {
      this.releaseGrabbedTarget();
      target.isDead = true;
      target.state = 'DEATH';
      target.deathTimer = 0;
      target.isFlipVault = false;
      target.isAngelicAscent = false;
      target.isBlinkTeleport = false;
      target.isChronoWarp = false;
      target.isOmnislashing = false;
      target.isCrouching = false;
      target.isDeflecting = false;
      target.vy = 0;
      target.vx = -115;
      if (game) {
        game.renderer?.triggerShake(12, 0.25);
        game.renderer?.triggerAberration(8);
        game.onFighterDeath?.(target);
      }
    }
    return dealt;
  }

  triggerUnavoidableSoulTithe(enemy, game) {
    if (!enemy || enemy.isDead || enemy.state === 'VICTORY') return 0;
    this.soulTitheCount = (this.soulTitheCount || 0) + 1;
    this.soulTitheFlashTimer = 0.48;
    this.roarFlashTimer = Math.max(this.roarFlashTimer || 0, 0.36);
    this.impactRecoilTimer = Math.max(this.impactRecoilTimer || 0, 0.22);
    const phasePct = this.bossPhase >= 3 ? 0.095 : this.bossPhase >= 2 ? 0.082 : 0.070;
    const chipScale =
      Number.isFinite(this.soulTitheChipScale) && this.soulTitheChipScale > 0
        ? this.soulTitheChipScale
        : 1.0;
    const rawTithe = Math.round(((enemy.maxHp || 3600) * phasePct + 52 * this.dmgScale) * chipScale);
    this.telegraphLabel = 'HELLPIT SOUL-TITHE! (UNAVOIDABLE)';
    this.telegraphTimer = Math.max(this.telegraphTimer || 0, 0.95);
    if (game?.audio) game.audio.play('flame_pillar', enemy.x);
    if (game?.renderer) {
      game.renderer.triggerShake(14, 0.30);
      game.renderer.triggerAberration(9);
    }
    if (game?.vfx) {
      game.vfx.spawnShockwave(this.anchorX - 110, 520, 320, '#dc2626', 0.44, true);
      game.vfx.spawnShockwave(enemy.x, (enemy.groundY || enemy.y) - 8, 165, '#f43f5e', 0.38, true);
      game.vfx.spawnGlyphBurst(enemy.x, enemy.y - 98, 7, 'abyssal');
      game.vfx.spawnDecal(enemy.x, 108, 'fissure', '#dc2626', 3.4, enemy.groundY || enemy.y);
    }
    return this.applyBossGuaranteedDamage(enemy, rawTithe, game, 'SOUL-TITHE! (UNAVOIDABLE)');
  }


  spawnBossMagmaSpire(x, groundY, scale = 1.0, maxLife = 1.05) {
    if (this.activeMagmaSpires.length >= 8) {
      this.activeMagmaSpires.shift();
    }
    this.activeMagmaSpires.push({
      x: Math.round(x),
      groundY: Math.round(groundY),
      scale,
      age: 0,
      maxLife
    });
  }

  spawnBossMagmaBoulders(originX, originY, groundY, count = 3, speedScale = 1.0) {
    const capped = Math.min(3, Math.max(1, count));
    for (let i = 0; i < capped; i++) {
      if (this.activeMagmaDebris.length >= 8) break;
      const spread = (i - (capped - 1) * 0.5) / Math.max(1, capped * 0.5);
      const seed = (this.walkPhase || 0) * 13.7 + i * 2.39;
      this.activeMagmaDebris.push({
        x: originX + spread * 74,
        y: Math.max(465, originY),
        vx: (-275 + spread * 135 + Math.sin(seed) * 30) * speedScale,
        vy: (-245 - Math.abs(Math.cos(seed)) * 110) * speedScale,
        groundY: Math.max(455, Math.min(672, groundY + Math.sin(seed * 1.7) * 24)),
        col: i % 2 === 0 ? 4 : 5,
        size: 46 + (i % 3) * 10,
        bounced: false,
        age: 0,
        maxLife: 1.02 + (i % 3) * 0.12
      });
    }
  }

  stepBossMagmaFX(dt, game) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    let sw = 0;
    for (let i = 0; i < this.activeMagmaSpires.length; i++) {
      const sp = this.activeMagmaSpires[i];
      sp.age += dt;
      if (sp.age < sp.maxLife) {
        this.activeMagmaSpires[sw++] = sp;
      }
    }
    this.activeMagmaSpires.length = sw;

    let dw = 0;
    for (let i = 0; i < this.activeMagmaDebris.length; i++) {
      const d = this.activeMagmaDebris[i];
      d.age += dt;
      if (d.age >= d.maxLife) continue;
      d.vy += 860 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (!d.bounced && d.y >= d.groundY && d.vy > 0) {
        d.y = d.groundY;
        d.vy = -d.vy * 0.42;
        d.vx *= 0.68;
        d.bounced = true;
        game?.vfx?.spawnBurst(d.x, d.groundY - 6, 4, '#fb923c', 120, { upBias: 75, size: 4.5 });
      }
      this.activeMagmaDebris[dw++] = d;
    }
    this.activeMagmaDebris.length = dw;
  }

  pinColossalAnchor() {
    this.x = this.anchorX;
    this.vx = 0;
    this.vy = 0;
    this.groundY = this.anchorGroundY;
    this.y = this.anchorGroundY;
    this.facing = -1;
  }

  update(dt, enemy, game) {
    this.pinColossalAnchor();
    if (enemy) {
      this.lastEnemyRef = enemy;
    }
    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
    this.animTime = (this.animTime || 0) + safeDt;
    this.stepBossMagmaFX(safeDt, game);
    this.impactRecoilTimer = Math.max(0, (this.impactRecoilTimer || 0) - safeDt);
    this.soulTitheFlashTimer = Math.max(0, (this.soulTitheFlashTimer || 0) - safeDt);
    this._grabSqueezeFlash = Math.max(0, (this._grabSqueezeFlash || 0) - safeDt);
    this._phaseShiftFlashTimer = Math.max(0, (this._phaseShiftFlashTimer || 0) - safeDt);

    if (this.isDead) {
      this.releaseGrabbedTarget();
      this.soulTitheWindupTimer = 0;
      this.soulTitheFlashTimer = 0;
      this.fistVisible = false;
      this.rakeActive = false;
      this.rakeWarnOnly = false;
      this.bossAction = null;
      this.sweepLane = null;
      this.emergeTimer = 0;
      this.wingPhase = (this.wingPhase || 0) + safeDt * 3.8;
      super.update(dt, enemy, game);
      this.pinColossalAnchor();

      // Staggered Cataclysmic Chain-Explosions as Malphas's cracked torso shatters into the Eastern Black Pit!
      const dtDeath = this.deathTimer || 0;
      const triggerCollapseBlast = (bx, by, radius, colA, colB, sfx, shakeAmp) => {
        if (game?.audio) game.audio.play(sfx, bx);
        if (game?.renderer) game.renderer.triggerShake(shakeAmp, 0.30);
        this.spawnBossMagmaBoulders(bx - 40, by, 595, 3, 0.95);
        if (game?.vfx) {
          game.vfx.spawnShockwave(bx, by, radius, colA, 0.42, true);
          game.vfx.spawnBurst(bx, by, 24, colA, 300, { upBias: 175, size: 7 });
          game.vfx.spawnBurst(bx, by, 14, colB, 240, { upBias: 140, size: 6 });
          game.vfx.spawnGlyphBurst(bx, by - 16, 6, 'abyssal');
        }
      };

      if (this._deathBlastStage === 0 && dtDeath >= 0.02) {
        this._deathBlastStage = 1;
        triggerCollapseBlast(
          this.anchorX + 115,
          390,
          195,
          '#ef4444',
          '#fde047',
          'thunder_slam',
          16
        );
      } else if (this._deathBlastStage === 1 && dtDeath >= 0.36) {
        this._deathBlastStage = 2;
        triggerCollapseBlast(
          this.anchorX - 35,
          410,
          210,
          '#f97316',
          '#fef08a',
          'flame_pillar',
          17
        );
      } else if (this._deathBlastStage === 2 && dtDeath >= 0.74) {
        this._deathBlastStage = 3;
        if (game?.renderer) game.renderer.triggerAberration(12);
        triggerCollapseBlast(
          this.anchorX + 28,
          468,
          260,
          '#ef4444',
          '#ffffff',
          'meteor_impact',
          22
        );
      } else if (this._deathBlastStage === 3 && dtDeath >= 1.14) {
        this._deathBlastStage = 4;
        triggerCollapseBlast(
          this.anchorX + 42,
          342,
          225,
          '#fb923c',
          '#fde047',
          'thunder_slam',
          18
        );
      } else if (this._deathBlastStage === 4 && dtDeath >= 1.56) {
        this._deathBlastStage = 5;
        if (game?.renderer) game.renderer.triggerAberration(14);
        triggerCollapseBlast(
          this.anchorX + 20,
          612,
          310,
          '#ea580c',
          '#fef08a',
          'meteor_impact',
          24
        );
      }
      return;
    }

    this.walkPhase = (this.walkPhase || 0) + safeDt * 2.0;
    const bossCdDt = (this._chillTimer || 0) > 0 ? safeDt * 0.72 : safeDt;
    this.ultCooldown = Math.max(0, this.ultCooldown - bossCdDt);
    this.roarFlashTimer = Math.max(0, (this.roarFlashTimer || 0) - safeDt);

    // Weighty, majestic Colossal Abyssal Wingbeat cadence (4 steps = 1 full Up-Mid-Down-Mid cycle)
    let wingStepHz = 3.6;
    if (this.vulnerableTimer > 0) {
      wingStepHz = 2.2;
    } else if (
      this.emergeTimer > 0 ||
      this.roarFlashTimer > 0 ||
      this.state === 'ULTIMATE' ||
      this.bossPhase >= 3
    ) {
      wingStepHz = 5.8;
    } else if (this.state === 'SKILL' || this.state === 'AUTO_ATTACK' || this.bossPhase >= 2) {
      wingStepHz = 4.6;
    }
    this.wingPhase = (this.wingPhase || 0) + safeDt * wingStepHz;

    // Subtle rising Abyssal Brimstone Embers along the obsidian throne parapet (`y ~ 634`)
    this._emberAccum = (this._emberAccum || 0) + safeDt;
    if (this._emberAccum >= 0.12) {
      this._emberAccum = 0;
      if (game?.vfx) {
        const emberX = this.anchorX - 155 + ((Math.sin(this.walkPhase * 7.3) * 0.5 + 0.5) * 330);
        game.vfx.spawnParticle({
          x: emberX,
          y: 634,
          vx: -14 + Math.cos(this.walkPhase * 5.1) * 18,
          vy: -78 - (this.bossPhase || 1) * 18,
          size: 5,
          color: (Math.round(this.walkPhase * 10) % 2 === 0) ? '#fb923c' : '#fde047',
          maxLife: 0.62,
          gravity: -18,
          additive: true
        });
      }
    }

    if (this.vulnerableTimer > 0) {
      this.vulnerableTimer = Math.max(0, this.vulnerableTimer - safeDt);
      this.unstoppablePoise = false;
      if (this.vulnerableTimer <= 0) {
        this.unstoppablePoise = true;
      }
    }

    const hpRatio = this.hp / Math.max(1, this.maxHp);
    if (this.emergeTimer > 0 && hpRatio <= 0.65) {
      // If extreme burst pushes Malphas into Phase 2 early, finish climb immediately
      this.emergeTimer = 0;
    }

    // Staged 1.60s Appearing Eruption & Parapet Climb (`isInvulnerable` remains false!)
    if (this.emergeTimer > 0) {
      this.isInvulnerable = false;
      this.emergeTimer = Math.max(0, this.emergeTimer - safeDt);
      const elapsed = this.emergeMax - this.emergeTimer;

      if (this._emergeStage === 0 && elapsed >= 0.02) {
        this._emergeStage = 1;
        this.telegraphLabel = 'THE EASTERN PIT ERUPTS!';
        this.telegraphTimer = 1.05;
        this.spawnBossMagmaSpire(this.anchorX - 118, 604, 0.92, 1.05);
        this.spawnBossMagmaBoulders(this.anchorX + 10, 610, 596, 5, 1.05);
        if (game?.audio) game.audio.play('flame_pillar', this.anchorX);
        if (game?.renderer) game.renderer.triggerShake(14, 0.40);
        if (game?.vfx) {
          game.vfx.spawnShockwave(this.anchorX + 24, 618, 250, '#ea580c', 0.48, true);
          game.vfx.spawnBurst(this.anchorX + 24, 622, 26, '#fb923c', 310, {
            upBias: 230,
            size: 7
          });
        }
      } else if (this._emergeStage === 1 && elapsed >= 0.42) {
        this._emergeStage = 2;
        this.impactRecoilTimer = 0.24;
        this.spawnBossMagmaSpire(this.anchorX - 162, 566, 1.0, 1.05);
        this.spawnBossMagmaBoulders(this.anchorX - 138, 560, 566, 4, 0.95);
        if (game?.audio) game.audio.play('thunder_slam', this.anchorX - 120);
        if (game?.renderer) game.renderer.triggerShake(16, 0.34);
        if (game?.vfx) {
          game.vfx.spawnShockwave(this.anchorX - 138, 566, 175, '#f59e0b', 0.38, true);
          game.vfx.spawnBurst(this.anchorX - 138, 560, 20, '#fde047', 260, {
            upBias: 165,
            size: 6
          });
          game.vfx.spawnDecal(this.anchorX - 138, 108, 'fissure', '#ea580c', 4.2, 568);
        }
      } else if (this._emergeStage === 2 && elapsed >= 1.10) {
        this._emergeStage = 3;
        this.jawOpen = 1.0;
        this.roarFlashTimer = 0.50;
        this.impactRecoilTimer = 0.28;
        this.spawnBossMagmaBoulders(this.anchorX - 54, 420, 560, 4, 1.0);
        this.telegraphLabel = 'SOVEREIGN OF THE BLACK PIT!';
        this.telegraphTimer = 0.95;
        if (game?.audio) game.audio.play('fireball', this.anchorX - 70);
        if (game?.renderer) {
          game.renderer.triggerShake(18, 0.45);
          game.renderer.triggerAberration(10);
        }
        if (game?.vfx) {
          game.vfx.spawnShockwave(this.anchorX - 90, 520, 290, '#ef4444', 0.55, true);
          game.vfx.spawnSpecialCastAura(
            this,
            this.name || 'BEHEMOTH MALPHAS',
            'SOVEREIGN OF THE BLACK PIT',
            'abyssal',
            true
          );
          game.vfx.spawnBurst(this.anchorX - 54, 344, 22, '#fef08a', 295, {
            upBias: 95,
            size: 6
          });
        }
      }
    }

    // Phase 2 Transition (`<= 65% HP`)
    if (!this.didPhase2 && hpRatio <= 0.65 && this.state !== 'ULTIMATE') {
      this.didPhase2 = true;
      this.bossPhase = 2;
      this.ultCooldown = 0.45;
      const baseTitheCd2 =
        Number.isFinite(this.soulTitheBaseCd) && this.soulTitheBaseCd > 0 ? this.soulTitheBaseCd : 5.4;
      this.soulTitheCooldown = Math.min(
        this.soulTitheCooldown || baseTitheCd2,
        baseTitheCd2 >= 8.0 ? 2.2 : 0.85
      );
      this.jawOpen = 1.0;
      this.roarFlashTimer = 0.72;
      this.impactRecoilTimer = 0.30;
      this._phaseShiftFlashTimer = 1.15;
      this.spawnBossMagmaSpire(this.anchorX - 192, 512, 1.02, 1.15);
      this.spawnBossMagmaSpire(this.anchorX - 228, 616, 1.06, 1.15);
      this.spawnBossMagmaBoulders(this.anchorX - 120, 520, 565, 5, 1.08);
      this.telegraphLabel = 'PHASE II: SIEGE CLAW AWAKENING!';
      this.telegraphTimer = 1.75;
      if (game?.renderer) {
        game.renderer.triggerShake(18, 0.55);
        game.renderer.triggerAberration(12);
      }
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          'COLOSSAL CALDERA SURGE',
          'BEHEMOTH PHASE II',
          'abyssal',
          true
        );
        game.vfx.spawnShockwave(this.anchorX - 80, this.anchorGroundY - 54, 280, '#ef4444', 0.52, true);
      }
      (game?.getActiveSideScrollManager?.() || game?.adventure)?.onBossPhaseShift?.(this, 2);
    }

    // Phase 3 Transition (`<= 30% HP`)
    if (!this.didPhase3 && hpRatio <= 0.30 && this.state !== 'ULTIMATE') {
      this.didPhase3 = true;
      this.bossPhase = 3;
      this.isBerserk = true;
      this.ultCooldown = 0.2;
      const baseTitheCd3 =
        Number.isFinite(this.soulTitheBaseCd) && this.soulTitheBaseCd > 0 ? this.soulTitheBaseCd : 5.4;
      this.soulTitheCooldown = Math.min(
        this.soulTitheCooldown || baseTitheCd3,
        baseTitheCd3 >= 8.0 ? 2.0 : 0.75
      );
      this.jawOpen = 1.0;
      this.roarFlashTimer = 0.85;
      this.impactRecoilTimer = 0.34;
      this._phaseShiftFlashTimer = 1.15;
      this.spawnBossMagmaSpire(this.anchorX - 185, 498, 1.14, 1.25);
      this.spawnBossMagmaSpire(this.anchorX - 265, 572, 1.18, 1.25);
      this.spawnBossMagmaSpire(this.anchorX - 210, 632, 1.12, 1.25);
      this.spawnBossMagmaBoulders(this.anchorX - 130, 510, 565, 6, 1.16);
      this.telegraphLabel = 'PHASE III: BLACK PIT CATACLYSM!';
      this.telegraphTimer = 1.9;
      if (game?.renderer) {
        game.renderer.triggerShake(24, 0.72);
        game.renderer.triggerAberration(16);
      }
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          'BLACK PIT CATACLYSM',
          'FINAL COLOSSUS ENRAGE',
          'arcane',
          true
        );
        game.vfx.spawnShockwave(this.anchorX - 80, this.anchorGroundY - 58, 340, '#f59e0b', 0.62, true);
      }
      (game?.getActiveSideScrollManager?.() || game?.adventure)?.onBossPhaseShift?.(this, 3);
    }

    // Autonomous Unavoidable Arena-Wide Blood-Pact Pulse (`HELLPIT SOUL-TITHE`) — deliberate unavoidable boss attrition!
    if (
      this.emergeTimer <= 0 &&
      safeDt > 0 &&
      enemy &&
      !enemy.isDead &&
      enemy.state !== 'VICTORY' &&
      !game?.isMatchOver
    ) {
      if (this.soulTitheWindupTimer > 0) {
        this.soulTitheWindupTimer = Math.max(0, this.soulTitheWindupTimer - safeDt);
        if (this.soulTitheWindupTimer <= 0) {
          const baseTitheCd =
            Number.isFinite(this.soulTitheBaseCd) && this.soulTitheBaseCd > 0
              ? this.soulTitheBaseCd
              : 5.4;
          const phaseScale = this.bossPhase >= 3 ? 0.84 : this.bossPhase >= 2 ? 0.94 : 1.08;
          this.soulTitheCooldown = Math.max(3.6, +(baseTitheCd * phaseScale).toFixed(2));
          this.triggerUnavoidableSoulTithe(enemy, game);
        }
      } else {
        this.soulTitheCooldown = Math.max(
          0,
          (this.soulTitheCooldown ?? this.soulTitheBaseCd ?? 5.4) - safeDt
        );
        if (this.soulTitheCooldown <= 0) {
          this.soulTitheWindupTimer = 0.56;
          this.telegraphLabel = 'UNAVOIDABLE: HELLPIT SOUL-TITHE!';
          this.telegraphTimer = Math.max(this.telegraphTimer || 0, 0.68);
          if (game?.audio) game.audio.play('fireball', this.anchorX - 95);
        }
      }
    }

    // Smooth articulated claw hover along the front-left parapet when not actively raking, grabbing, or slamming
    if (this.state !== 'AUTO_ATTACK' && this.state !== 'ULTIMATE') {
      this.fistVisible = false;
    }
    if (this.state !== 'SKILL') {
      if (this.grabbedTarget || this.grabWarnOnly || this.grabActive) {
        this.releaseGrabbedTarget();
      }
      this.rakeActive = false;
      this.rakeWarnOnly = false;
      this.bossAction = null;
      this.sweepLane = null;
      const slumpOff = this.vulnerableTimer > 0 ? 18 : 0;
      let targetClawX;
      let targetClawY;
      if (this.emergeTimer > 0) {
        const eu = 1 - this.emergeTimer / Math.max(0.01, this.emergeMax);
        const gripDrop = eu < 0.26 ? Math.round((1 - eu / 0.26) * 135) : 0;
        targetClawX = this.anchorX - 154 - Math.sin(eu * Math.PI) * 14;
        targetClawY = 542 + gripDrop;
      } else {
        targetClawX = this.anchorX - 162 - Math.sin(this.walkPhase * 1.2) * 10;
        targetClawY = 536 + Math.cos(this.walkPhase * 1.5) * 8 + slumpOff;
      }
      const clawLerp = this.emergeTimer > 0 ? 1 : 1 - Math.exp(-10 * safeDt);
      this.clawWorldX = Number.isFinite(this.clawWorldX)
        ? this.clawWorldX + (targetClawX - this.clawWorldX) * clawLerp
        : targetClawX;
      this.clawWorldY = Number.isFinite(this.clawWorldY)
        ? this.clawWorldY + (targetClawY - this.clawWorldY) * clawLerp
        : targetClawY;
    }

    // Smoothly articulate demon lower mandible (`jawOpen: 0..1`) across roar, breath, snarl & idle pant
    let targetJaw = 0.08 + 0.12 * Math.max(0, Math.sin(this.walkPhase * 1.4));
    if (this.bossPhase >= 3 || this.vulnerableTimer > 0) {
      targetJaw = 0.18 + 0.18 * Math.max(0, Math.sin(this.walkPhase * 2.1));
    }
    if (this.emergeTimer > 0) {
      const eu = 1 - this.emergeTimer / Math.max(0.01, this.emergeMax);
      targetJaw = eu >= 0.68 && eu <= 0.96 ? 1.0 : 0.16;
    } else if (this.roarFlashTimer > 0) {
      targetJaw = 1.0;
    } else if (this.state === 'SKILL' && this.skillVariant === 0) {
      targetJaw = this.stateTimer < 0.20 ? 0.06 : this.stateTimer < 0.84 ? 1.0 : 0.26;
    } else if (this.state === 'SKILL' && this.skillVariant === 1) {
      targetJaw = this.rakeActive ? 0.62 : 0.30;
    } else if (this.state === 'SKILL' && this.skillVariant === 2) {
      targetJaw = this.grabbedTarget ? 0.88 : this.grabActive ? 0.68 : 0.28;
    } else if (this.state === 'ULTIMATE') {
      targetJaw = 0.92;
    } else if (this.state === 'AUTO_ATTACK') {
      targetJaw = this.stateTimer >= 0.44 && this.stateTimer <= 0.72 ? 0.58 : 0.22;
    } else if (this.hurtTimer > 0) {
      targetJaw = Math.max(targetJaw, 0.44);
    }
    const jawLerp = 1 - Math.exp(-13 * safeDt);
    this.jawOpen = (this.jawOpen || 0) + (targetJaw - (this.jawOpen || 0)) * jawLerp;

    // Frame-rate-independent damped pose channels (`0` 1-frame 20-36px teleports!)
    const emergeU =
      this.emergeTimer > 0
        ? Math.max(0, Math.min(1, 1 - this.emergeTimer / Math.max(0.01, this.emergeMax || 1.6)))
        : 1;
    const isVulnerable = this.vulnerableTimer > 0;
    const isRoaring =
      this.roarFlashTimer > 0 ||
      (this.emergeTimer > 0 && emergeU >= 0.68 && emergeU <= 0.96) ||
      (this.state === 'SKILL' &&
        this.skillVariant === 0 &&
        this.stateTimer >= 0.22 &&
        this.stateTimer <= 0.84);
    const isHoistingFist =
      (this.state === 'AUTO_ATTACK' && this.stateTimer < 0.50) ||
      (this.state === 'ULTIMATE' && this.stateTimer < 0.80);
    const isRakingClaw = this.state === 'SKILL' && (this.skillVariant === 1 || this.skillVariant === 2);
    const isClawWindup = this.rakeWarnOnly || this.grabWarnOnly;
    const isClawThrust = this.rakeActive || this.grabActive;
    const isWindingUp =
      (this.state === 'AUTO_ATTACK' && this.stateTimer < 0.44) ||
      (isRakingClaw && isClawWindup) ||
      (this.state === 'SKILL' && this.skillVariant === 0 && this.stateTimer < 0.22) ||
      (this.state === 'ULTIMATE' && this.stateTimer < 0.72);
    const isLungingStrike =
      (this.state === 'AUTO_ATTACK' && this.stateTimer >= 0.48 && this.stateTimer <= 0.74) ||
      (isRakingClaw && isClawThrust) ||
      (this.state === 'ULTIMATE' && this.stateTimer >= 0.72 && this.stateTimer <= 1.22) ||
      isRoaring;

    const enemyGy = this.lastEnemyRef ? this.lastEnemyRef.groundY || this.lastEnemyRef.y || 561 : 561;
    const laneLookY = Math.max(-6, Math.min(8, (enemyGy - 561) * 0.07));

    const tgtBodyX = (isLungingStrike ? -12 : isWindingUp ? 9 : 0) + (isVulnerable ? 14 : 0);
    const tgtBodyY = (isWindingUp ? -6 : isLungingStrike ? 5 : 0) + (isVulnerable ? 18 : 0);
    const tgtShrugY = isHoistingFist ? -8 : isRoaring ? -6 : isLungingStrike ? 4 : isVulnerable ? 7 : 0;
    const tgtFrontShX = isRakingClaw
      ? isClawThrust
        ? -11
        : 7
      : isLungingStrike
        ? -7
        : isWindingUp
          ? 6
          : 0;
    const tgtSkullX = isRoaring ? -5 : isWindingUp ? 4 : 0;
    const tgtSkullY = (isRoaring ? -4 : isVulnerable ? 6 : 0) + laneLookY;
    const tgtRearClawX = isLungingStrike ? 7 : isWindingUp ? -8 : 0;
    const tgtRearClawY = isRoaring ? -8 : isLungingStrike ? 5 : 0;

    const poseLerp = 1 - Math.exp(-9.5 * safeDt);
    this._poseBodyX = (this._poseBodyX || 0) + (tgtBodyX - (this._poseBodyX || 0)) * poseLerp;
    this._poseBodyY = (this._poseBodyY || 0) + (tgtBodyY - (this._poseBodyY || 0)) * poseLerp;
    this._poseShrugY = (this._poseShrugY || 0) + (tgtShrugY - (this._poseShrugY || 0)) * poseLerp;
    this._poseFrontShX =
      (this._poseFrontShX || 0) + (tgtFrontShX - (this._poseFrontShX || 0)) * poseLerp;
    this._poseSkullX = (this._poseSkullX || 0) + (tgtSkullX - (this._poseSkullX || 0)) * poseLerp;
    this._poseSkullY = (this._poseSkullY || 0) + (tgtSkullY - (this._poseSkullY || 0)) * poseLerp;
    this._poseRearClawX =
      (this._poseRearClawX || 0) + (tgtRearClawX - (this._poseRearClawX || 0)) * poseLerp;
    this._poseRearClawY =
      (this._poseRearClawY || 0) + (tgtRearClawY - (this._poseRearClawY || 0)) * poseLerp;

    super.update(dt, enemy, game);
    this.pinColossalAnchor();
  }

  runMonsterNeutralAI(_dt, enemy, game) {
    this.pinColossalAnchor();
    if (this.emergeTimer > 0) {
      // Hold outgoing attacks while climbing the throne parapet, keeping incoming hitboxes open!
      this.state = 'IDLE';
      this.moveDir = 0;
      return;
    }

    if (this.vulnerableTimer > 0) {
      this.state = 'IDLE';
      this.moveDir = 0;
      this.telegraphLabel =
        (this.staggerBreakTimer || 0) > 0
          ? 'GUARD BREAK! (+55% DMG)'
          : 'HEART CORE EXPOSED! (+45% DMG)';
      this.telegraphTimer = Math.max(this.telegraphTimer, 0.14);
      return;
    }

    const enemyGy = enemy ? enemy.groundY || enemy.y : 561;

    // Phase 2 & Phase 3 Colossal Signature Cataclysm (`ULTIMATE`)
    if (this.bossPhase >= 2 && this.ultCooldown <= 0) {
      this.ultCooldown = (this.bossPhase >= 3 ? 6.6 : 8.0) / Math.max(0.5, this.cadenceMult || 1);
      this.slamTargetX = Math.max(
        this.anchorX - 895,
        Math.min(this.anchorX - 145, enemy ? enemy.x : this.anchorX - 455)
      );
      this.slamTargetGy = Math.max(462, Math.min(660, enemyGy));
      this.telegraphLabel =
        this.bossPhase >= 3 ? 'BLACK PIT CATACLYSM!' : 'CALDERA FIST BARRAGE!';
      this.telegraphTimer = 1.45;
      this.setState('ULTIMATE');
      if (game?.vfx) {
        game.vfx.spawnSpecialCastAura(
          this,
          this.bossPhase >= 3 ? 'BLACK PIT CATACLYSM' : 'CALDERA FIST BARRAGE',
          'COLOSSUS OVERDRIVE',
          'abyssal',
          true
        );
      }
      return;
    }

    // 3-Way Special Skill Rotation: (0) Jaw Hellfire Fan -> (1) Colossal Claw Lane Sweep -> (2) Abyssal Siege Grab!
    if (this.skillCooldown <= 0) {
      this.skillCooldown = this.skillMaxCooldown * (this.bossPhase >= 3 ? 0.76 : 1.0);
      this.skillVariant = ((this.skillVariant ?? 0) + 1) % 3;
      this.skillDuration = this.skillVariant === 2 ? 2.20 : 1.08;
      if (this.skillVariant === 1) {
        this.rakeLaneGy = enemyGy <= 561 ? 500 : 624;
        this.sweepLane = this.rakeLaneGy <= 561 ? 'upper' : 'lower';
        this.bossAction = 'claw_sweep';
        this._rakeSparkAccum = 0;
        this._rakeSpireStage = 0;
        this.telegraphLabel =
          this.rakeLaneGy <= 561 ? 'CLAW SWEEP: UPPER ROAD!' : 'CLAW SWEEP: LOWER ROAD!';
        this.telegraphTimer = 0.95;
      } else if (this.skillVariant === 2) {
        this.grabLaneGy = Math.max(468, Math.min(654, enemyGy));
        this.grabTargetX = Math.max(
          this.anchorX - 880,
          Math.min(this.anchorX - 180, enemy ? enemy.x : this.anchorX - 460)
        );
        this.grabWarnOnly = true;
        this.grabActive = false;
        this._grabCrushTicks = 0;
        this._grabInitDone = true;
        this.sweepLane = null;
        this.bossAction = 'claw_grab';
        this.telegraphLabel = 'ABYSSAL SIEGE GRAB!';
        this.telegraphTimer = 0.95;
        this.spawnFloorTelegraph(
          this.grabTargetX,
          96,
          0.42,
          0,
          '#c084fc',
          'SIEGE GRAB',
          this.grabLaneGy
        );
      } else {
        this.sweepLane = null;
        this.bossAction = null;
        this.telegraphLabel = 'ABYSSAL JAW HELLFIRE!';
        this.telegraphTimer = 0.85;
      }
      this.setState('SKILL');
      return;
    }

    // Primary Colossal Fist Sky-Crush tracking player's 3D position!
    if (this.autoCooldown <= 0) {
      this.autoCooldown = this.autoInterval * (this.bossPhase >= 3 ? 0.80 : 1.0);
      this.slamTargetX = Math.max(
        this.anchorX - 905,
        Math.min(this.anchorX - 125, enemy ? enemy.x : this.anchorX - 415)
      );
      this.slamTargetGy = Math.max(462, Math.min(662, enemyGy));
      this.telegraphLabel = '! COLOSSAL FIST CRUSH !';
      this.telegraphTimer = 0.68;
      this.setState('AUTO_ATTACK');
      this.spawnFloorTelegraph(
        this.slamTargetX,
        104,
        0.58,
        72,
        '#f59e0b',
        'FIST CRUSH',
        this.slamTargetGy
      );
      return;
    }

    this.state = 'IDLE';
    this.moveDir = 0;
  }

  updateAutoAttack(dt, _enemy, game) {
    const t = this.stateTimer;
    this.fistVisible = true;
    this.fistShadowGy = this.slamTargetGy;

    if (t < 0.48) {
      // Hoist giant runic fist high above target 3D lane
      const u = t / 0.48;
      const ease = 1 - Math.pow(1 - u, 2);
      this.fistWorldX = this.anchorX - 190 + (this.slamTargetX - (this.anchorX - 190)) * ease;
      this.fistWorldY = this.slamTargetGy - 250 - Math.sin(u * Math.PI * 0.5) * 95;
    } else if (t < 0.62) {
      // Meteoric downward slam onto the road!
      const u = (t - 0.48) / 0.14;
      this.fistWorldX = this.slamTargetX;
      this.fistWorldY = this.slamTargetGy - 345 * (1 - u * u);
      if (game?.vfx && dt > 0) {
        game.vfx.spawnParticle({
          x: this.fistWorldX + (Math.sin(t * 90) * 28),
          y: this.fistWorldY - 64,
          vx: 0,
          vy: -130,
          size: 7,
          color: '#fb923c',
          maxLife: 0.24,
          additive: true
        });
      }
      if (u >= 0.72 && !this.didActionFrame) {
        this.didActionFrame = true;
        this.impactRecoilTimer = 0.26;
        this.spawnBossMagmaSpire(this.slamTargetX, this.slamTargetGy, 1.04, 1.02);
        this.spawnBossMagmaBoulders(
          this.slamTargetX,
          this.slamTargetGy - 14,
          this.slamTargetGy,
          5,
          1.0
        );
        if (game?.audio) game.audio.play('thunder_slam', this.slamTargetX);
        if (game?.renderer) game.renderer.triggerShake(16, 0.28);
        game?.vfx?.spawnShockwave(this.slamTargetX, this.slamTargetGy - 8, 165, '#f59e0b', 0.36, true);
        game?.vfx?.spawnBurst(this.slamTargetX, this.slamTargetGy - 18, 24, '#fb923c', 300, {
          upBias: 175,
          size: 7
        });
        game?.vfx?.spawnDecal(this.slamTargetX, 122, 'fissure', '#ea580c', 4.5, this.slamTargetGy);
      }
    } else {
      // Retract giant fist back toward right parapet
      const u = Math.min(1, (t - 0.62) / Math.max(0.15, this.autoDuration - 0.62));
      this.fistWorldX = this.slamTargetX + (this.anchorX - 190 - this.slamTargetX) * u;
      this.fistWorldY = this.slamTargetGy - u * 165;
    }

    if (t >= this.autoDuration) {
      this.fistVisible = false;
      this.setState('IDLE');
    }
  }

  updateSkill(dt, enemy, game) {
    const t = this.stateTimer;

    if (this.skillVariant === 2) {
      // Variant C: Abyssal Siege-Claw Grab -> Dramatic Air-Hoist & Hold (`0.68s..1.92s`) -> 3 Vise-Crush Beats -> Violent Leftward Hurl (`t=1.92s`)!
      if (!this._grabInitDone) {
        this._grabInitDone = true;
        this.skillDuration = 2.20;
        this._grabCrushTicks = 0;
        this._grabSqueezeFlash = 0;
        const initGy = enemy ? enemy.groundY || enemy.y || 561 : 561;
        this.grabLaneGy = Math.max(468, Math.min(654, this.grabLaneGy || initGy));
        this.grabTargetX = Math.max(
          this.anchorX - 880,
          Math.min(this.anchorX - 180, enemy ? enemy.x : this.anchorX - 460)
        );
      }

      if (t < 0.42) {
        // 0.00s–0.42s: Fair Telegraph Coil (100% dodgeable)
        this.grabWarnOnly = true;
        this.grabActive = false;
        this.bossAction = 'claw_grab';
        const coil = t / 0.42;
        this.clawWorldX = this.anchorX - 118 + coil * 44;
        this.clawWorldY = this.grabLaneGy + 12 - Math.sin(coil * Math.PI * 0.5) * 18;
      } else if (t < 0.68) {
        // 0.42s–0.68s: Snatch Lunge across target lane (dodge/invuln evades cleanly!)
        this.grabWarnOnly = false;
        this.grabActive = true;
        this.bossAction = 'claw_grab';
        if (!this.didSecondaryAction) {
          this.didSecondaryAction = true;
          this.impactRecoilTimer = 0.22;
          if (game?.audio) game.audio.play('heavy_cleave', this.clawWorldX);
          if (game?.renderer) game.renderer.triggerShake(12, 0.22);
        }
        const u = (t - 0.42) / 0.26;
        const reachX = Math.max(
          this.anchorX - 910,
          Math.min(this.grabTargetX - 36, this.anchorX - 815)
        );
        this.clawWorldX = this.anchorX - 74 + (reachX - (this.anchorX - 74)) * u;
        this.clawWorldY = this.grabLaneGy + 10;

        if (
          !this.grabbedTarget &&
          enemy &&
          !enemy.isDead &&
          !enemy.isInvulnerable &&
          enemy.state !== 'DODGE' &&
          !(enemy._advDodgeTimer > 0) &&
          !enemy.isSubmerged &&
          Math.abs(enemy.x - this.clawWorldX) <= 132 &&
          Math.abs((enemy.groundY || enemy.y) - this.grabLaneGy) <= 66
        ) {
          this.grabbedTarget = enemy;
          enemy._grabbedByBoss = true;
          enemy._grabbedByBossTimer = 1.65;
          enemy.vx = 0;
          enemy.vy = 0;
          enemy.moveDir = 0;
          enemy.facing = 1;
          enemy.setState('HURT');
          enemy.hurtTimer = 1.55;
          this._grabSqueezeFlash = 0.22;
          this.telegraphLabel = 'GRABBED! SIEGE CLAW VISE!';
          this.telegraphTimer = 1.35;
          if (game?.audio) game.audio.play('thunder_slam', enemy.x);
          if (game?.renderer) game.renderer.triggerShake(14, 0.26);
          game?.vfx?.spawnShockwave(enemy.x, this.grabLaneGy - 20, 128, '#c084fc', 0.30, true);
          this.applyBossGuaranteedDamage(enemy, Math.round(40 * this.dmgScale), game, 'GRABBED!');
        }

        if (this.grabbedTarget && !this.grabbedTarget.isDead) {
          this.grabbedTarget._grabbedByBossTimer = Math.max(this.grabbedTarget._grabbedByBossTimer || 0, 1.35);
          this.grabbedTarget.x = Math.round(this.clawWorldX - 18);
          this.grabbedTarget.y = Math.round(
            Math.min((this.grabbedTarget.groundY || this.grabLaneGy) - 18, this.clawWorldY + 8)
          );
          this.grabbedTarget.vx = 0;
          this.grabbedTarget.vy = 0;
        }
      } else if (t < 1.92) {
        if (this.grabbedTarget && !this.grabbedTarget.isDead) {
          // 0.68s–1.92s (`1.24s` total hoist+hold, ~`0.92s` visibly held aloft at apex with 3 vise-crush squeeze beats!)
          this.grabWarnOnly = false;
          this.grabActive = true;
          this.bossAction = 'claw_grab';
          const uHoist = Math.min(1, (t - 0.68) / 0.32);
          const easeH = 1 - Math.pow(1 - uHoist, 2);
          const startX = Math.max(this.anchorX - 880, this.grabTargetX);
          const hoistX = this.anchorX - 246;
          const hoistY = 408;
          const squeezeShake = (this._grabSqueezeFlash || 0) > 0 ? Math.sin(t * 78) * 6 : Math.sin(t * 16) * 3;
          const apexHoverY = uHoist >= 1 ? Math.sin((t - 1.0) * 6.5) * 6 : 0;
          this.clawWorldX = startX + (hoistX - startX) * easeH + squeezeShake;
          this.clawWorldY = this.grabLaneGy + 10 + (hoistY - (this.grabLaneGy + 10)) * easeH + apexHoverY;

          const victim = this.grabbedTarget;
          const pinGy = Math.round(this.grabLaneGy + (561 - this.grabLaneGy) * easeH);
          victim.groundY = pinGy;
          victim.x = Math.round(this.clawWorldX - 24);
          // Cradle victim's chest (`y - 68`) squarely inside Malphas's clenched siege-claw palm (`clawWorldY`) so boots dangle aloft!
          victim.y = Math.round(Math.min(pinGy - 30, this.clawWorldY + 58));
          victim.vx = 0;
          victim.vy = 0;
          victim.facing = 1;
          victim._grabbedByBoss = true;
          victim._grabbedByBossTimer = Math.max(victim._grabbedByBossTimer || 0, 0.35);
          if (!victim.isDead && victim.state !== 'VICTORY') {
            victim.state = 'HURT';
            victim.stateTimer = Math.min(victim.stateTimer || 0, 0.12);
            victim.hurtTimer = 0.42;
          }

          // 3 distinct dramatic vise-crush squeeze beats at t = 0.94s, 1.30s, 1.66s (total grab raw = 40 + 32*3 + 76 = 212!)
          const crushBeats = [
            { time: 0.94, label: 'VISE CRUSH!' },
            { time: 1.30, label: 'SOUL VISE!' },
            { time: 1.66, label: 'CRUSHING GRIP!' }
          ];
          const beatIdx = this._grabCrushTicks || 0;
          if (beatIdx < crushBeats.length && t >= crushBeats[beatIdx].time) {
            this._grabCrushTicks = beatIdx + 1;
            this._grabSqueezeFlash = 0.24;
            this.impactRecoilTimer = 0.20;
            this.roarFlashTimer = Math.max(this.roarFlashTimer || 0, 0.16);
            this.telegraphLabel = crushBeats[beatIdx].label;
            this.telegraphTimer = 0.42;
            if (game?.audio) game.audio.play('heavy_cleave', victim.x);
            if (game?.renderer) {
              game.renderer.triggerShake(12 + beatIdx * 2, 0.20);
              game.renderer.triggerAberration?.(5 + beatIdx * 2);
            }
            if (game?.vfx) {
              game.vfx.spawnShockwave(victim.x, victim.y - 78, 118 + beatIdx * 18, '#d946ef', 0.26, true);
              game.vfx.spawnBurst(victim.x, victim.y - 78, 12, '#f5d0fe', 220, { upBias: 90, size: 5.5 });
              game.vfx.spawnGlyphBurst(victim.x, victim.y - 84, 5, 'abyssal');
            }
            this.applyBossGuaranteedDamage(
              victim,
              Math.round(32 * this.dmgScale),
              game,
              crushBeats[beatIdx].label
            );
          }
        } else {
          // Player evaded / dodged the grab snatch -> retract claw cleanly at t = 1.00s!
          this.grabWarnOnly = false;
          this.grabActive = false;
          this.bossAction = null;
          const uRet = Math.min(1, (t - 0.68) / 0.32);
          this.clawWorldX = (this.anchorX - 815) * (1 - uRet) + (this.anchorX - 166) * uRet;
          this.clawWorldY = this.grabLaneGy + 10 - Math.sin(uRet * Math.PI) * 22;
          if (t >= 1.00) {
            this.releaseGrabbedTarget();
            this.skillDuration = 1.08;
            this.setState('IDLE');
            return;
          }
        }
      } else {
        // t >= 1.92s: Violent Leftward Abyssal Hurl Slam (`skillDuration = 2.20s`)!
        if (!this.didActionFrame) {
          this.didActionFrame = true;
          const victim = this.grabbedTarget;
          this.releaseGrabbedTarget();
          if (victim && !victim.isDead && victim.state !== 'VICTORY') {
            const slamGy = Math.max(468, Math.min(654, victim.groundY || 561));
            victim.groundY = slamGy;
            victim.y = Math.min(slamGy - 18, victim.y);
            victim.vx = -655;
            victim.vy = -205;
            victim.setState('HURT');
            victim.hurtTimer = 0.50;
            this.impactRecoilTimer = 0.28;
            this.spawnBossMagmaSpire(
              Math.max(this.anchorX - 880, victim.x - 120),
              slamGy,
              1.02,
              1.05
            );
            this.spawnBossMagmaBoulders(victim.x - 60, slamGy - 14, slamGy, 4, 1.04);
            if (game?.audio) game.audio.play('meteor_impact', victim.x);
            if (game?.renderer) {
              game.renderer.triggerShake(18, 0.32);
              game.renderer.triggerAberration(10);
            }
            game?.vfx?.spawnShockwave(victim.x - 40, slamGy - 12, 185, '#c084fc', 0.38, true);
            game?.vfx?.spawnDecal(
              Math.max(this.anchorX - 880, victim.x - 90),
              116,
              'fissure',
              '#ea580c',
              4.0,
              slamGy
            );
            this.applyBossGuaranteedDamage(
              victim,
              Math.round(76 * this.dmgScale),
              game,
              'ABYSSAL HURL!'
            );
          }
        }
        const uThrow = Math.min(1, (t - 1.92) / 0.28);
        this.clawWorldX =
          (this.anchorX - 340) * (1 - uThrow) + (this.anchorX - 166) * uThrow;
        this.clawWorldY = 456 + uThrow * 80;
      }

      if (t >= 2.20) {
        this.releaseGrabbedTarget();
        this.skillDuration = 1.08;
        this.setState('IDLE');
      }
      return;
    }

    if (this.skillVariant === 1) {
      // Variant B: Giant Flexed Siege-Claw + HD-2D 3-Talon Slash Arc 3D Leftward Lane Sweep (`x: 9225 -> 8395`)!
      this.sweepLane = this.rakeLaneGy <= 561 ? 'upper' : 'lower';
      if (t < 0.48) {
        this.rakeWarnOnly = true;
        this.rakeActive = false;
        this.bossAction = 'claw_sweep';
        this._rakeSpireStage = 0;
        const coil = t / 0.48;
        this.clawWorldX = this.anchorX - 120 + coil * 46;
        this.clawWorldY = this.rakeLaneGy + 18 - Math.sin(coil * Math.PI * 0.5) * 14;
      } else if (t < 0.94) {
        this.rakeWarnOnly = false;
        this.rakeActive = true;
        this.bossAction = 'claw_sweep';
        const u = (t - 0.48) / 0.46;
        this.clawWorldX = this.anchorX - 110 - u * 830;
        this.clawWorldY = this.rakeLaneGy + 18;

        if (!this.didSecondaryAction) {
          this.didSecondaryAction = true;
          this.impactRecoilTimer = 0.24;
          if (game?.audio) game.audio.play('heavy_cleave', this.clawWorldX);
          if (game?.renderer) game.renderer.triggerShake(14, 0.25);
        }

        // Staggered Obsidian Magma Spires & 3D Magma Boulders erupting in the claw's furrow!
        if (this._rakeSpireStage === 0 && u >= 0.14) {
          this._rakeSpireStage = 1;
          this.spawnBossMagmaSpire(this.clawWorldX + 28, this.rakeLaneGy, 0.88, 0.90);
          this.spawnBossMagmaBoulders(this.clawWorldX, this.rakeLaneGy, this.rakeLaneGy, 3, 0.85);
        } else if (this._rakeSpireStage === 1 && u >= 0.48) {
          this._rakeSpireStage = 2;
          this.spawnBossMagmaSpire(this.clawWorldX + 28, this.rakeLaneGy, 0.96, 0.94);
        } else if (this._rakeSpireStage === 2 && u >= 0.82) {
          this._rakeSpireStage = 3;
          this.spawnBossMagmaSpire(this.clawWorldX + 28, this.rakeLaneGy, 1.02, 0.98);
          this.spawnBossMagmaBoulders(this.clawWorldX, this.rakeLaneGy, this.rakeLaneGy, 3, 0.92);
        }

        // Molten furrow sparks & scorched claw fissure trail across the raked lane
        this._rakeSparkAccum = (this._rakeSparkAccum || 0) + dt;
        if (this._rakeSparkAccum >= 0.065) {
          this._rakeSparkAccum = 0;
          if (game?.vfx) {
            game.vfx.spawnBurst(this.clawWorldX - 46, this.rakeLaneGy - 8, 6, '#fb923c', 210, {
              upBias: 125,
              size: 5.5
            });
            game.vfx.spawnDecal(this.clawWorldX, 74, 'fissure', '#dc2626', 2.8, this.rakeLaneGy);
          }
        }

        if (
          !this.didActionFrame &&
          enemy &&
          !enemy.isDead &&
          Math.abs(enemy.x - this.clawWorldX) <= 125 &&
          Math.abs((enemy.groundY || enemy.y) - this.rakeLaneGy) <= 64 &&
          enemy.y >= (enemy.groundY || enemy.y) - 62
        ) {
          this.didActionFrame = true;
          enemy.takeDamage(Math.round(66 * this.dmgScale), this, true, -220, -110);
          game?.vfx?.spawnShockwave(enemy.x, this.rakeLaneGy - 18, 120, '#ef4444', 0.28, true);
        }
      } else {
        this.rakeWarnOnly = false;
        this.rakeActive = false;
        this.bossAction = null;
        const u = Math.min(1, (t - 0.94) / Math.max(0.1, this.skillDuration - 0.94));
        this.clawWorldX = this.anchorX - 940 * (1 - u) - 168 * u;
        this.clawWorldY = this.rakeLaneGy + 18 - Math.sin(u * Math.PI) * 28;
      }

      if (t >= this.skillDuration) {
        this.rakeWarnOnly = false;
        this.rakeActive = false;
        this.bossAction = null;
        this.sweepLane = null;
        this.setState('IDLE');
      }
      return;
    }

    // Variant A: Abyssal Open-Jaw Hellfire Torrent & Fireball Fan Leftward (`-X`) across Zone IV!
    const mouthX = this.anchorX - 26;
    const mouthY = 358;
    if (t < 0.30 && game?.vfx && dt > 0) {
      game.vfx.spawnParticle({
        x: mouthX - 18 + Math.cos(t * 50) * 14,
        y: mouthY + Math.sin(t * 50) * 12,
        vx: 38,
        vy: -14,
        size: 5.5,
        color: '#fef08a',
        maxLife: 0.22,
        additive: true
      });
    }

    if (t >= 0.32 && !this.didActionFrame) {
      this.didActionFrame = true;
      this.impactRecoilTimer = 0.22;
      const sx = mouthX - 34;
      const sy = mouthY + 4;
      const tx = enemy ? Math.min(sx - 180, enemy.x) : sx - 480;
      const ty = enemy ? (enemy.groundY || enemy.y) - 62 : 500;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      this.spawnBossMagmaBoulders(sx - 210, 548, 565, 2, 0.90);
      if (game?.audio) game.audio.play('fireball', sx);
      if (game?.renderer) game.renderer.triggerShake(11, 0.22);
      game?.vfx?.spawnShockwave(sx - 24, sy, 135, '#fb923c', 0.30, true);
      game?.vfx?.spawnBurst(sx - 18, sy, 16, '#fef08a', 260, { upBias: 60, size: 6 });

      const spreadOffsets = this.bossPhase >= 2 ? [-95, -46, 0, 46, 95] : [-58, 0, 58];
      spreadOffsets.forEach((vyOff, idx) => {
        const isCenter = idx === Math.floor(spreadOffsets.length / 2);
        game?.vfx?.spawnProjectile({
          x: sx,
          y: sy,
          vx: (dx / len) * 525,
          vy: (dy / len) * 525 + vyOff,
          radius: isCenter ? 19 : 14,
          color: '#ef4444',
          coreColor: '#fef08a',
          damage: isCenter ? 54 : 42,
          owner: this,
          type: 'monster_orb',
          zone: 3
        });
      });

      if (enemy) {
        this.spawnFloorTelegraph(
          Math.min(this.anchorX - 125, enemy.x),
          94,
          0.78,
          60,
          '#ef4444',
          'HELLFIRE SEAL',
          enemy.groundY || enemy.y
        );
      }
    }

    if (t >= this.skillDuration) {
      this.setState('IDLE');
    }
  }

  updateUltimate(dt, enemy, game) {
    const t = this.stateTimer;
    const minX = this.anchorX - 905;
    const maxX = this.anchorX - 145;
    const minGy = (game?.adventure?.depthMinY || 442) + 20;
    const maxGy = (game?.adventure?.depthMaxY || 680) - 20;

    this.fistVisible = true;
    this.fistShadowGy = this.slamTargetGy;

    if (!this.didSecondaryAction) {
      this.didSecondaryAction = true;
      const base = Math.max(minX, Math.min(maxX, enemy ? enemy.x : this.anchorX - 475));
      const baseGy = enemy ? enemy.groundY || enemy.y : 561;
      const count = this.bossPhase >= 3 ? 5 : 3;
      const xOffsets = count === 5 ? [-240, -120, 0, 120, 240] : [-155, 0, 155];
      const zOffsets = count === 5 ? [-64, 54, 0, -54, 64] : [-56, 0, 56];

      xOffsets.forEach((off, idx) => {
        const px = Math.max(minX, Math.min(maxX, base + off));
        const pGy = Math.max(minGy, Math.min(maxGy, baseGy + zOffsets[idx]));
        const delay = 0.56 + idx * 0.14;
        this.spawnFloorTelegraph(px, 88, delay, 68, '#ef4444', 'CATACLYSM', pGy);
        game?.vfx?.spawnFlamePillar(px, pGy, this, enemy, {
          theme: 'abyssal',
          delay,
          maxLife: 1.25,
          scaleWidth: idx === Math.floor(count / 2) ? 1.22 : 0.92,
          isUltimate: true,
          groundY: pGy
        });
      });
    }

    if (t < 0.72) {
      const u = t / 0.72;
      this.fistWorldX = this.slamTargetX;
      this.fistWorldY = this.slamTargetGy - 280 - Math.sin(u * Math.PI * 0.5) * 90;
    } else if (t < 1.05) {
      const u = (t - 0.72) / 0.33;
      this.fistWorldX = this.slamTargetX;
      this.fistWorldY = this.slamTargetGy - 370 * (1 - u * u);
      if (game?.vfx && dt > 0) {
        game.vfx.spawnParticle({
          x: this.fistWorldX + Math.cos(t * 85) * 32,
          y: this.fistWorldY - 72,
          vx: 0,
          vy: -145,
          size: 8,
          color: '#fef08a',
          maxLife: 0.26,
          additive: true
        });
      }
      if (u >= 0.85 && !this.didActionFrame) {
        this.didActionFrame = true;
        this.impactRecoilTimer = 0.34;
        this.spawnBossMagmaSpire(this.slamTargetX, this.slamTargetGy, 1.24, 1.28);
        this.spawnBossMagmaSpire(
          Math.max(minX, this.slamTargetX - 148),
          Math.max(minGy, this.slamTargetGy - 34),
          0.96,
          1.12
        );
        this.spawnBossMagmaSpire(
          Math.min(maxX, this.slamTargetX + 148),
          Math.min(maxGy, this.slamTargetGy + 34),
          0.96,
          1.12
        );
        this.spawnBossMagmaBoulders(
          this.slamTargetX,
          this.slamTargetGy - 18,
          this.slamTargetGy,
          6,
          1.18
        );
        if (game?.audio) game.audio.play('meteor_impact', this.slamTargetX);
        if (game?.renderer) {
          game.renderer.triggerShake(20, 0.45);
          game.renderer.triggerAberration(12);
        }
        game?.vfx?.spawnShockwave(this.slamTargetX, this.slamTargetGy - 10, 230, '#ef4444', 0.46, true);
        game?.vfx?.spawnBurst(this.slamTargetX, this.slamTargetGy - 18, 26, '#f59e0b', 330, {
          upBias: 185,
          size: 7
        });
        game?.vfx?.spawnDecal(this.slamTargetX, 138, 'fissure', '#ef4444', 5.2, this.slamTargetGy);
      }
    } else {
      const u = Math.min(1, (t - 1.05) / 0.75);
      this.fistWorldX = this.slamTargetX + (this.anchorX - 185 - this.slamTargetX) * u;
      this.fistWorldY = this.slamTargetGy - u * 180;
    }

    if (t >= this.ultDuration) {
      this.fistVisible = false;
      this.vulnerableTimer = this.bossPhase >= 3 ? 2.2 : 1.45;
      this.telegraphLabel = 'HEART CORE EXPOSED! (+45% DMG)';
      this.telegraphTimer = this.vulnerableTimer;
      this.setState('IDLE');
    }
  }

  computeColossusPoseCoords(t) {
    const torsoSize = 456;
    const anchorBaseX = Math.round(this.anchorX - 201);
    const rimBaseY = 654 - torsoSize; // 198 -> bottom of 456px parapet rim lands cleanly on y = 654

    let riseY = 0;
    let emergeU = 1;
    if (!this.isDead && this.emergeTimer > 0) {
      emergeU = Math.max(0, Math.min(1, 1 - this.emergeTimer / Math.max(0.01, this.emergeMax || 1.6)));
      const climbPhase = Math.min(1, emergeU / 0.78);
      riseY = Math.round(Math.pow(1 - climbPhase, 2.15) * 310);
    }

    const dtDeath = this.isDead ? Math.max(0, this.deathTimer || 0) : 0;
    const deathProgress = this.isDead ? Math.min(1, dtDeath / 2.15) : 0;
    const sinkY = this.isDead ? Math.round(Math.pow(deathProgress, 1.42) * 336) : 0;

    const hurtShakeX =
      !this.isDead && this.hurtTimer > 0 ? Math.round(Math.sin(this.hurtTimer * 34) * 3) : 0;
    const deathShakeX = this.isDead
      ? Math.round(Math.sin(dtDeath * 42) * (1 - deathProgress * 0.65) * 7)
      : 0;
    const emergeShakeX =
      !this.isDead && this.emergeTimer > 0 && emergeU < 0.76
        ? Math.round(Math.sin(t * 32) * 2)
        : 0;
    const recU =
      !this.isDead && this.impactRecoilTimer > 0
        ? Math.max(0, Math.min(1, this.impactRecoilTimer / 0.30))
        : 0;
    const recImpulse = Math.sin(recU * Math.PI) * recU;
    const recoilX = Math.round(recImpulse * 6);
    const recoilY = Math.round(recImpulse * 4);

    const isVulnerable = !this.isDead && this.vulnerableTimer > 0;
    const isRoaring =
      (!this.isDead && this.roarFlashTimer > 0) ||
      (!this.isDead && this.emergeTimer > 0 && emergeU >= 0.68 && emergeU <= 0.96) ||
      (!this.isDead &&
        this.state === 'SKILL' &&
        this.skillVariant === 0 &&
        this.stateTimer >= 0.22 &&
        this.stateTimer <= 0.84);

    const breathAmp = this.bossPhase >= 3 ? 6 : 4.5;
    const breatheY = !this.isDead ? Math.sin(t * 2.1) * breathAmp : 0;

    const poseBodyX = this.isDead ? 0 : this._poseBodyX || (isVulnerable ? 14 : 0);
    const poseBodyY = this.isDead ? 0 : this._poseBodyY || (isVulnerable ? 18 : 0);
    const poseShrugY = this.isDead ? 0 : this._poseShrugY || 0;
    const poseFrontShX = this.isDead ? 0 : this._poseFrontShX || 0;
    const poseSkullX = this.isDead ? 0 : this._poseSkullX || 0;
    const poseSkullY = this.isDead ? 0 : this._poseSkullY || 0;

    const torsoX = Math.round(
      anchorBaseX + hurtShakeX + deathShakeX + emergeShakeX + recoilX + poseBodyX
    );
    const torsoY = Math.round(rimBaseY + breatheY + poseBodyY + recoilY + riseY + sinkY);

    const rearPauldronX = Math.round(
      torsoX +
        Math.cos(t * 2.1 - 0.45) * (this.isDead ? 1 : 3) +
        (this.isDead ? -8 * deathProgress : 0)
    );
    const rearPauldronY = Math.round(
      torsoY +
        (this.isDead
          ? Math.round(18 * deathProgress)
          : Math.sin(t * 2.1 - 0.35) * 4 + poseShrugY)
    );
    const frontPauldronX = Math.round(
      torsoX +
        Math.sin(t * 2.1 + 0.35) * (this.isDead ? 1 : 3) +
        (this.isDead ? Math.round(10 * deathProgress) : poseFrontShX)
    );
    const frontPauldronY = Math.round(
      torsoY +
        (this.isDead
          ? Math.round(20 * deathProgress)
          : Math.sin(t * 2.1 - 0.25) * 4.5 + poseShrugY)
    );

    const hurtRecoilX = !this.isDead && this.hurtTimer > 0 ? 4 : 0;
    const skullX = Math.round(
      torsoX + (this.isDead ? 0 : Math.cos(t * 2.1) * 2 + poseSkullX) + hurtRecoilX
    );
    const skullY = Math.round(
      torsoY +
        (this.isDead
          ? Math.round(12 * deathProgress)
          : Math.sin(t * 2.1 - 0.20) * 2.5 + poseSkullY)
    );

    const jawRatio = this.isDead ? 0.95 : Math.max(0, Math.min(1, this.jawOpen || 0));
    const jawDropPx = Math.round(jawRatio * 20);
    const jawX = Math.round(skullX + (jawRatio > 0.55 ? -2 : 0));
    const jawY = Math.round(skullY + jawDropPx);

    const wingStep = Math.floor(this.wingPhase || 0) & 3;
    const wingPoseCol = [0, 1, 2, 1][wingStep];
    const wingFrame12 = Math.floor((this.wingPhase || 0) * 3) % 12;
    const wingCollapseY = this.isDead ? Math.round(30 * deathProgress) : 0;
    const wingBreathY = Math.round(Math.sin((this.wingPhase || 0) * Math.PI * 0.5) * 6);

    const wingRSize = 376;
    const wingRX = frontPauldronX + 294;
    const wingRY = frontPauldronY - 38 - wingBreathY + wingCollapseY;
    const wingLSize = 396;
    const wingLX = rearPauldronX - 236;
    const wingLY = rearPauldronY - 42 - Math.round(wingBreathY * 0.65) + wingCollapseY;

    return {
      torsoSize,
      anchorBaseX,
      rimBaseY,
      riseY,
      emergeU,
      dtDeath,
      deathProgress,
      sinkY,
      deathShakeX,
      isVulnerable,
      isRoaring,
      torsoX,
      torsoY,
      rearPauldronX,
      rearPauldronY,
      frontPauldronX,
      frontPauldronY,
      skullX,
      skullY,
      jawDropPx,
      jawX,
      jawY,
      wingStep,
      wingPoseCol,
      wingFrame12,
      wingRSize,
      wingRX,
      wingRY,
      wingLSize,
      wingLX,
      wingLY
    };
  }

  drawTelegraphRings(ctx) {
    if (!ctx) return;
    const assets = PixelForge.initAssets();
    const bossVfxImg = PixelForge.ensureImage(assets?.archfiend?.bossVfx);
    const t = Number.isFinite(this.animTime) ? this.animTime : (this.walkPhase || 0) / 2.0;
    drawMalphasRunicTelegraphs(ctx, this, t, bossVfxImg);
  }

  drawForegroundOverlay(ctx, renderer = null) {
    // Step 5 (BEHIND Malphas's 512x512 body rig): Volumetric caldera aura, Phase II Burning Eclipse,
    // Phase III Abyssal Lightning, Phase-Shift Shockwave & 12-frame articulated Right Counter-Wing!
    if (!ctx) return;
    const assets = PixelForge.initAssets();
    const bossVfxImg = PixelForge.ensureImage(assets?.archfiend?.bossVfx);
    const bossVfxReady = Boolean(bossVfxImg && bossVfxImg.complete && bossVfxImg.naturalWidth > 0);
    const rawT = renderer?.time;
    const t = Math.max(
      Number.isFinite(rawT) && rawT > 0 ? rawT : 0,
      Number.isFinite(this.animTime) ? this.animTime : (this.walkPhase || 0) / 2.0
    );
    const p = this.computeColossusPoseCoords(t);
    this._lastBackVfxFrame = bossVfxReady;

    drawMalphasBackdropAura(ctx, this, t, p, renderer, bossVfxImg);

    // Draw the 12-frame articulated Right Counter-Wing inside the exact same Chasm Clip Mask (`y <= 641`)
    // on non-mid frames (`wingFrame12 !== 3 && wingFrame12 !== 9`); mid-beats draw `(3,2)` inside `draw()` -> 0 ghosting!
    if (bossVfxReady && (!this.isDead || p.dtDeath < 2.22) && p.wingFrame12 !== 3 && p.wingFrame12 !== 9) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.beginPath();
      ctx.rect(p.anchorBaseX - 380, -600, 1450, 1241);
      ctx.clip();
      blitMalphasVfxCell(
        ctx,
        bossVfxImg,
        p.wingFrame12,
        MALPHAS_VFX_ROW.RIGHT_WING_FLAP,
        p.wingRX,
        p.wingRY,
        p.wingRSize,
        p.wingRSize
      );
      ctx.restore();
    }
  }

  drawUltimateForeground(ctx, renderer = null) {
    // Step 7 (IN FRONT OF Malphas & Heroes):
    //   1. Left-Wing ember shimmer + breathing furnace/throat Bayer glow + rising Sovereign embers
    //   2. High-frame-rate 30fps Hellfire Torrent, 3-Talon Slash Wave, Magma Plume & Vulnerable Heart-Core Shatter Vortex
    //   3. Foreground Clamping Siege-Claw Talons, Abyssal Chains & Contracting Violet Rune-Vise OVER grabbed hero!
    if (!ctx) return;
    const assets = PixelForge.initAssets();
    const bossVfxImg = PixelForge.ensureImage(assets?.archfiend?.bossVfx);
    const rawT = renderer?.time;
    const t = Math.max(
      Number.isFinite(rawT) && rawT > 0 ? rawT : 0,
      Number.isFinite(this.animTime) ? this.animTime : (this.walkPhase || 0) / 2.0
    );
    const p = this.computeColossusPoseCoords(t);

    if (!this.isDead) {
      drawMalphasBodyAuraOverlays(ctx, this, t, p, bossVfxImg);

      // 30fps Exposed Heart-Core Shatter Vortex (`Row 11` — strictly when `isVulnerable`!)
      if (p.isVulnerable) {
        const coreX = Math.round(p.torsoX + 197);
        const coreY = Math.round(p.torsoY + 256);
        drawMalphasActionVfxOverlay(
          ctx,
          this,
          t,
          'heart_vortex',
          { x: coreX - 118, y: coreY - 118, w: 236, h: 236, alpha: 0.72 },
          bossVfxImg
        );
      }

      // 30fps Open-Jaw Hellfire Torrent overlay (`Row 6`)
      const showJawHellfire =
        (this.state === 'SKILL' &&
          this.skillVariant === 0 &&
          this.stateTimer >= 0.24 &&
          this.stateTimer <= 0.84) ||
        (this.emergeTimer > 0 && p.emergeU >= 0.69 && p.emergeU <= 0.95) ||
        this.roarFlashTimer > 0.18;
      if (showJawHellfire) {
        const mouthWorldX = p.skullX + 180;
        const mouthWorldY = p.skullY + 148 + Math.round(p.jawDropPx * 0.45);
        const coneW = 392;
        const coneH = 276;
        const coneX = Math.round(mouthWorldX - coneW * 0.91);
        const coneY = Math.round(mouthWorldY - coneH * 0.50);
        drawMalphasActionVfxOverlay(
          ctx,
          this,
          t,
          'hellfire',
          { x: coneX - 24, y: coneY - 8, w: coneW + 28, h: coneH + 16, alpha: 0.66 },
          bossVfxImg
        );
      }

      // 30fps Road-Impact Magma Eruption Plume (`Row 8`)
      const showImpactGeyser =
        (this.state === 'AUTO_ATTACK' && this.stateTimer >= 0.58 && this.stateTimer <= 0.90) ||
        (this.state === 'ULTIMATE' && this.stateTimer >= 1.00 && this.stateTimer <= 1.52);
      if (showImpactGeyser) {
        const gSz = this.state === 'ULTIMATE' ? 324 : 268;
        const gx = this.slamTargetX - gSz * 0.5;
        const gy = this.slamTargetGy - gSz + 22;
        drawMalphasActionVfxOverlay(
          ctx,
          this,
          t,
          'magma_plume',
          { x: gx - 12, y: gy - 18, w: gSz + 24, h: gSz + 24, alpha: 0.62 },
          bossVfxImg
        );
      }

      // 30fps Triple-Talon Slash Wave (`Row 7`) during Claw Sweep
      if (this.rakeActive && !this.fistVisible) {
        const clawSz = 252;
        const cx = Math.round(this.clawWorldX - clawSz * 0.44);
        const cy = Math.round(this.clawWorldY - clawSz * 0.52);
        const slashW = 324;
        const slashH = 276;
        const slashX = Math.round(cx - slashW * 0.44);
        const slashY = Math.round(cy + clawSz * 0.50 - slashH * 0.52);
        drawMalphasActionVfxOverlay(
          ctx,
          this,
          t,
          'slash',
          { x: slashX - 18, y: slashY - 10, w: slashW + 24, h: slashH + 20, alpha: 0.72 },
          bossVfxImg
        );
      }
    }

    // Foreground Clamping Siege-Claw Talons, Taut Abyssal Chains & Contracting Violet Rune-Vise OVER grabbed hero!
    drawMalphasGrabForegroundOverlay(ctx, this, t, renderer, bossVfxImg);
  }

  draw(ctx, isReflection = false, renderer = null) {
    if (isReflection || !ctx) return;
    const assets = PixelForge.initAssets();
    PixelForge.ensureHeroLoaded?.('archfiend');
    const charSet = assets.archfiend;
    const colossusImg = PixelForge.ensureImage(charSet?.colossus);

    if (colossusImg && colossusImg.complete && colossusImg.naturalWidth > 0) {
      // Strict 9-arg 512x512 integer pixel blit helper (obeys Suite 17C/20D/27B spy & zero ctx.rotate!)
      const blitCell = (col, row, dx, dy, dw, dh) => {
        if (
          !Number.isFinite(dx) ||
          !Number.isFinite(dy) ||
          !Number.isFinite(dw) ||
          !Number.isFinite(dh)
        ) {
          return;
        }
        ctx.drawImage(
          colossusImg,
          col * 512,
          row * 512,
          512,
          512,
          Math.round(dx),
          Math.round(dy),
          Math.max(1, Math.round(dw)),
          Math.max(1, Math.round(dh))
        );
      };

      const rawT = renderer?.time;
      const t = Math.max(
        Number.isFinite(rawT) && rawT > 0 ? rawT : 0,
        Number.isFinite(this.animTime) ? this.animTime : (this.walkPhase || 0) / 2.0
      );
      const p = this.computeColossusPoseCoords(t);
      const {
        torsoSize,
        anchorBaseX,
        rimBaseY,
        riseY,
        emergeU,
        dtDeath,
        deathProgress,
        sinkY,
        deathShakeX,
        isVulnerable,
        isRoaring,
        torsoX,
        torsoY,
        rearPauldronX,
        rearPauldronY,
        frontPauldronX,
        frontPauldronY,
        skullX,
        skullY,
        jawDropPx,
        jawX,
        jawY,
        wingPoseCol,
        wingFrame12,
        wingRSize,
        wingRX,
        wingRY,
        wingLSize,
        wingLX,
        wingLY
      } = p;

      // Select Torso Cell: (3,0) Cracked Dying, or living pulsing heartbeat between (1,0) & (2,0)!
      let torsoCol = 1;
      if (this.isDead) {
        torsoCol = 3;
      } else {
        const fastPulse =
          this.bossPhase >= 2 ||
          isVulnerable ||
          isRoaring ||
          this.state === 'SKILL' ||
          this.state === 'ULTIMATE';
        const heartWave = fastPulse
          ? Math.sin(t * 8.5) > -0.10
          : Math.sin(t * 3.6) + 0.45 * Math.sin(t * 7.2) > 0.35;
        torsoCol = heartWave ? 2 : 1;
      }

      const geyserCol = Math.floor(t * 10) % 2 === 0 ? 4 : 5;
      const showCalderaGeyser =
        (!this.isDead && this.emergeTimer > 0.24) ||
        (!this.isDead && this.roarFlashTimer > 0.12) ||
        (!this.isDead && this.state === 'ULTIMATE' && this.stateTimer < 1.15) ||
        (this.isDead && dtDeath < 2.05);

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // 1. Subtle Abyssal Magma Underglow tucked strictly inside the curved CALDERA_RIM (`0,0`) mouth
      ctx.fillStyle = isRoaring ? 'rgba(251, 146, 60, 0.20)' : 'rgba(239, 68, 68, 0.14)';
      ctx.fillRect(anchorBaseX + 108, 596, torsoSize - 216, 30);

      // 2. Chasm Clip Mask (`y <= 641 <= 654`) BEFORE stationary CALDERA_RIM!
      ctx.save();
      ctx.beginPath();
      ctx.rect(anchorBaseX - 380, -600, 1450, 1241);
      ctx.clip();

      if (showCalderaGeyser) {
        const geyserY = this.isDead
          ? Math.round(284 + Math.max(0, dtDeath - 1.25) * 150)
          : Math.round(274 + Math.sin(t * 14) * 8);
        blitCell(geyserCol, 1, anchorBaseX + 30, geyserY, 396, 396);
      }

      // Only draw clipped body rig while above the chasm floor (`deathProgress < 0.98`)
      if (!this.isDead || dtDeath < 2.22) {
        // 2a. Root-Locked Synchronized Colossal Abyssal Great-Wings:
        //     - Right Counter-Wing: `drawForegroundOverlay` renders 12-frame fluid flapping from `boss_malphas_vfx_30fps.png`
        //       on non-mid beats; on mid-beats (`3, 9`) or when `drawForegroundOverlay` didn't run, blit `(3,2)` -> 0 ghosting!
        if (!this._lastBackVfxFrame || wingFrame12 === 3 || wingFrame12 === 9) {
          blitCell(3, 2, wingRX, wingRY, wingRSize, wingRSize);
        }
        this._lastBackVfxFrame = false;

        blitCell(wingPoseCol, 2, wingLX, wingLY, wingLSize, wingLSize);

        // 2b. Phase II/III Sovereign Burning Eclipse Crown Diadem (`Cell 6,3`) floating cleanly ABOVE Malphas's horns!
        if (!this.isDead && this.bossPhase >= 2) {
          const crestSz = this.bossPhase >= 3 ? 232 : 212;
          const crestCx = skullX + 204;
          const crestArchY = skullY + 28 + Math.round(Math.sin(t * 3.4) * 4);
          blitCell(6, 3, crestCx - crestSz * 0.5, crestArchY - crestSz * 0.52, crestSz, crestSz);
        }

        // 2c. Rear Parapet-Gripping Siege-Claw (`Cell 0/1,1`) tucked behind left parapet lip (`0` chest-crossing arm stumps!)
        const rearClawCol =
          this.isDead ||
          this.bossPhase >= 3 ||
          this.state === 'ULTIMATE' ||
          this.emergeTimer > 0 ||
          isRoaring
            ? 1
            : 0;
        const rearClawSz = 212;
        const chasmTuckX = Math.round(Math.min(1, (riseY + sinkY) / 95) * 114);
        const rearClawX = Math.round(
          torsoX -
            78 +
            chasmTuckX +
            (this.isDead ? 0 : (this._poseRearClawX || 0) + Math.cos(t * 2.1) * 4)
        );
        const rearClawY = Math.round(
          torsoY +
            196 +
            (this.isDead ? 0 : (this._poseRearClawY || 0) + Math.sin(t * 2.1) * 4)
        );
        blitCell(rearClawCol, 1, rearClawX, rearClawY, rearClawSz, rearClawSz);

        // 2d. Registered Core Anatomy: Rear Spiked Pauldron -> Pulsing/Cracked Ribcage Torso -> Demon Skull -> Mandible -> Front Pauldron
        // Note: `SKULL_UPPER (6,0)` has its own custom-painted blazing hellfire throat revealed naturally by `jawY`!
        blitCell(4, 0, rearPauldronX, rearPauldronY, torsoSize, torsoSize);
        blitCell(torsoCol, 0, torsoX, torsoY, torsoSize, torsoSize);
        blitCell(6, 0, skullX, skullY, torsoSize, torsoSize);
        blitCell(7, 0, jawX, jawY, torsoSize, torsoSize);
        blitCell(5, 0, frontPauldronX, frontPauldronY, torsoSize, torsoSize);

        // Restrained <=0.16 Neo-Vision EX additive molten-gold & abyssal-violet catchlight + stepped-pixel rising hell-embers
        if (!this.isDead) {
          const exAlpha = this.hitFlash > 0
            ? Math.min(0.16, 0.08 + this.hitFlash * 0.9)
            : 0.06 + 0.04 * Math.sin(t * 4.2);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = exAlpha;
          blitCell(2, 0, torsoX, torsoY, torsoSize, torsoSize);
          blitCell(6, 0, skullX, skullY, torsoSize, torsoSize);
          ctx.restore();

          const emberBase = Math.floor(t * 20);
          for (let ei = 0; ei < 6; ei++) {
            const ph = (t * 1.45 + ei * 0.17) % 1.0;
            const ex = Math.round((torsoX + 90 + ((ei * 73 + emberBase) % 270)) / 2) * 2;
            const ey = Math.round((torsoY + 340 - ph * 220) / 2) * 2;
            ctx.fillStyle = ei % 2 === 0 ? '#fde047' : '#f43f5e';
            ctx.fillRect(ex, ey, 4, 4);
            ctx.fillStyle = '#c084fc';
            ctx.fillRect(ex, ey + 4, 4, 2);
          }
        }

        // During DEATH collapse, the foreground Claw + Horizontal Vambrace (`4,2`) sink strictly inside the obsidian parapet!
        if (this.isDead) {
          const deadClawSz = 216;
          const deadClawX = Math.round(anchorBaseX + 76 + deathProgress * 26 + deathShakeX);
          const deadClawY = Math.round(426 + sinkY * 0.92);
          const deadVamSz = 200;
          blitCell(4, 2, deadClawX + 114, deadClawY + 3, deadVamSz, deadVamSz);
          blitCell(1, 1, deadClawX, deadClawY, deadClawSz, deadClawSz);
        }
      }

      ctx.restore(); // End Chasm Clip Mask (`y <= 641`)

      // 3. Stationary Foreground Chained Dark-Obsidian Throne Parapet Rim (`Cell 0,0`) anchored at `y_bot = 654`!
      blitCell(0, 0, anchorBaseX, rimBaseY, torsoSize, torsoSize);

      // 4. Exposed Molten Heart-Core Rupture (`Cell 7,3`) & Target Reticle at exact ribcage heart `(torsoX+197, torsoY+256)`!
      if (isVulnerable) {
        const coreX = Math.round(torsoX + 197);
        const coreY = Math.round(torsoY + 256);
        const ruptureSz = 192 + Math.round(Math.sin(t * 9.0) * 10);
        blitCell(7, 3, coreX - ruptureSz * 0.5, coreY - ruptureSz * 0.5, ruptureSz, ruptureSz);
        const pulseR = 26 + Math.round(Math.sin(t * 10.0) * 4);
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 2;
        ctx.strokeRect(coreX - pulseR, coreY - pulseR, pulseR * 2, pulseR * 2);
        ctx.strokeStyle = '#fef08a';
        ctx.strokeRect(coreX - pulseR + 5, coreY - pulseR + 5, (pulseR - 5) * 2, (pulseR - 5) * 2);
      }

      // 5. Erupting Obsidian Magma Spires (`Cells 2,3 & 3,3`) along raked/slammed 3D road lanes!
      if (this.activeMagmaSpires && this.activeMagmaSpires.length > 0) {
        for (let i = 0; i < this.activeMagmaSpires.length; i++) {
          const sp = this.activeMagmaSpires[i];
          const u = Math.max(0, Math.min(1, sp.age / Math.max(0.05, sp.maxLife)));
          const riseFrac =
            u < 0.16 ? u / 0.16 : u > 0.74 ? Math.max(0.18, (1 - u) / 0.26) : 1.0;
          const spireCol = u < 0.24 || u > 0.76 ? 2 : 3;
          const spireW = Math.round(184 * sp.scale);
          const spireH = Math.max(48, Math.round(208 * sp.scale * riseFrac));
          ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
          ctx.fillRect(Math.round(sp.x - spireW * 0.32), Math.round(sp.groundY - 3), Math.round(spireW * 0.64), 7);
          blitCell(
            spireCol,
            3,
            sp.x - spireW * 0.5,
            sp.groundY - spireH + Math.round(22 * sp.scale),
            spireW,
            spireH
          );
        }
      }

      // 5b. Cohesive 3-Frame Animated Horizontal Hellfire Torrent (`6,1 -> 6,2 -> 7,2` @ 12fps) anchored at open jaws!
      const showJawHellfire =
        !this.isDead &&
        ((this.state === 'SKILL' &&
          this.skillVariant === 0 &&
          this.stateTimer >= 0.24 &&
          this.stateTimer <= 0.84) ||
          (this.emergeTimer > 0 && emergeU >= 0.69 && emergeU <= 0.95) ||
          this.roarFlashTimer > 0.18);
      if (showJawHellfire) {
        const mouthWorldX = skullX + 180;
        const mouthWorldY = skullY + 148 + Math.round(jawDropPx * 0.45);
        const hfFrames = [
          [6, 1],
          [6, 2],
          [7, 2]
        ];
        const hfStep = Math.floor(t * 12) % 3;
        const [hfCol, hfRow] = hfFrames[hfStep];
        const coneW = 392;
        const coneH = 276;
        const coneX = Math.round(mouthWorldX - coneW * 0.91);
        const coneY = Math.round(mouthWorldY - coneH * 0.50);
        blitCell(hfCol, hfRow, coneX, coneY, coneW, coneH);
      }

      // 5c. Road-Impact Magma Geyser (`Cell 4,1` / `5,1`) erupting strictly upon Fist Crush & Cataclysm impact!
      const showImpactGeyser =
        !this.isDead &&
        ((this.state === 'AUTO_ATTACK' && this.stateTimer >= 0.58 && this.stateTimer <= 0.90) ||
          (this.state === 'ULTIMATE' && this.stateTimer >= 1.00 && this.stateTimer <= 1.52));
      if (showImpactGeyser) {
        const gSz = this.state === 'ULTIMATE' ? 324 : 268;
        blitCell(
          geyserCol,
          1,
          this.slamTargetX - gSz * 0.5,
          this.slamTargetGy - gSz + 22,
          gSz,
          gSz
        );
      }

      // 6. Foreground Main Siege-Limb:
      //    - Airborne Fist (`2,1`/`3,1`) plunges vertically down out of an Abyssal Hell-Rift Portal Maw (`5,2`)!
      //    - Horizontal Claw (`0,1`/`1,1`) docks seamlessly onto its Horizontal Obsidian-Rune Siege Vambrace (`4,2`)!
      if (!this.isDead) {
        const hideEarlyClimbClaw = this.emergeTimer > 0 && emergeU < 0.24;
        if (this.fistVisible) {
          const isMeteoricPlunge =
            this.state === 'ULTIMATE' ||
            this.bossPhase >= 3 ||
            (this.state === 'AUTO_ATTACK' && this.stateTimer >= 0.46 && this.stateTimer <= 0.68);
          const fistCol = isMeteoricPlunge ? 3 : 2;
          const fistSz = 256;
          const fx = Math.round(this.fistWorldX - fistSz * 0.5);
          const fy = Math.round(this.fistWorldY - fistSz + 22);

          // Grounded 2.5D stepped pixel shadow beneath the airborne fist (0 vector .ellipse calls)
          const shX = Math.round(this.fistWorldX / 2) * 2;
          const shY = Math.round((this.fistShadowGy - 4) / 2) * 2;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
          ctx.fillRect(shX - 28, shY - 16, 56, 6);
          ctx.fillRect(shX - 46, shY - 10, 92, 6);
          ctx.fillRect(shX - 56, shY - 4, 112, 8);
          ctx.fillRect(shX - 46, shY + 4, 92, 6);
          ctx.fillRect(shX - 28, shY + 10, 56, 6);

          // Overhead Abyssal Hell-Rift Siege Portal Maw (`Cell 5,2`) crowning the vertical gauntlet cuff!
          const riftW = 312;
          const riftH = 228;
          const riftX = Math.round(this.fistWorldX - riftW * 0.5);
          const riftY = Math.round(fy + 22 - riftH * 0.54);
          blitCell(5, 2, riftX, riftY, riftW, riftH);
          blitCell(fistCol, 1, fx, fy, fistSz, fistSz);
        } else if (!hideEarlyClimbClaw) {
          const useFlexedClaw =
            this.rakeActive ||
            this.grabActive ||
            Boolean(this.grabbedTarget) ||
            (this.emergeTimer > 0 && emergeU >= 0.24 && emergeU <= 0.74) ||
            this.bossPhase >= 3;
          const clawCol = useFlexedClaw ? 1 : 0;
          const clawSz = 252;
          const cx = Math.round(this.clawWorldX - clawSz * 0.44);
          const cy = Math.round(this.clawWorldY - clawSz * 0.52);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
          ctx.fillRect(Math.round(this.clawWorldX - 46), Math.round(this.clawWorldY + 26), 112, 8);

          // Seamless Horizontal Obsidian-Rune Siege Vambrace (`Cell 4,2`) socketed directly into the claw's cuff!
          const vamSz = 236;
          const vamX = cx + Math.round(clawSz * 0.53);
          const vamY = cy + Math.round(clawSz * 0.01);
          if (vamX + vamSz < anchorBaseX + 115) {
            // When raking far down-road past the throne, anchor trailing elbow inside an Abyssal Hell-Rift Breach!
            blitCell(5, 2, vamX + vamSz - 134, vamY + 26, 212, 184);
          }
          blitCell(4, 2, vamX, vamY, vamSz, vamSz);
          blitCell(clawCol, 1, cx, cy, clawSz, clawSz);

          // Cohesive 3-Frame Animated Molten Talon Crescent Wave (`7,1 -> 0,3 -> 1,3` @ 12fps) sweeping LEFT (`-X`)!
          if (this.rakeActive) {
            const slashFrames = [
              [7, 1],
              [0, 3],
              [1, 3]
            ];
            const sStep = Math.floor(t * 12) % 3;
            const [sCol, sRow] = slashFrames[sStep];
            const slashW = 324;
            const slashH = 276;
            const slashX = Math.round(cx - slashW * 0.44);
            const slashY = Math.round(cy + clawSz * 0.50 - slashH * 0.52);
            blitCell(sCol, sRow, slashX, slashY, slashW, slashH);
          }
        }
      }

      // 6b. Ballistic 3D Obsidian Magma Boulders (`Cells 4,3 & 5,3`) tumbling & bouncing across the arena!
      if (this.activeMagmaDebris && this.activeMagmaDebris.length > 0) {
        for (let i = 0; i < this.activeMagmaDebris.length; i++) {
          const d = this.activeMagmaDebris[i];
          const fade = d.age > d.maxLife * 0.78 ? (d.maxLife - d.age) / (d.maxLife * 0.22) : 1.0;
          ctx.fillStyle = `rgba(0, 0, 0, ${(0.36 * fade).toFixed(2)})`;
          ctx.fillRect(Math.round(d.x - d.size * 0.22), Math.round(d.groundY - 2), Math.round(d.size * 0.44), 5);
          if (fade < 0.99) {
            ctx.save();
            ctx.globalAlpha = Math.max(0.08, fade);
            blitCell(d.col, 3, d.x - d.size * 0.5, d.y - d.size * 0.76, d.size, d.size);
            ctx.restore();
          } else {
            blitCell(d.col, 3, d.x - d.size * 0.5, d.y - d.size * 0.76, d.size, d.size);
          }
        }
      }

      ctx.restore();
    } else {
      super.draw(ctx, false, renderer);
      return;
    }

    // 7. Colossal Boss Crisp PixelFont Crimson-Gold Mini-Ribbon above Front Shoulder (never collides with top banners!)
    if (!this.isDead) {
      const hasRaidHud =
        Boolean(this.game?.adventure?.active) &&
        typeof document !== 'undefined' &&
        typeof document.getElementById === 'function' &&
        Boolean(document.getElementById('adv-boss-raid-hud'));
      const bx = Math.round(this.anchorX - 168);
      const by = 216;
      const barW = 148;
      const barH = 8;
      const x0 = bx - Math.floor(barW * 0.5);
      const hpPct = Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (this.telegraphTimer > 0 && this.telegraphLabel) {
        const labelStr = String(this.telegraphLabel).toUpperCase();
        const isBreakOrVuln = (this.staggerBreakTimer || 0) > 0 || (this.vulnerableTimer || 0) > 0;
        const txtW = PixelFont.measureWidth(labelStr, 1);
        const ribW = Math.max(114, txtW + 24);
        const ribH = 16;
        const rx = bx - Math.floor(ribW * 0.5);
        const ry = by - ribH - 6;

        // Stepped bevel obsidian outline
        ctx.fillStyle = '#05070e';
        ctx.fillRect(rx + 2, ry - 1, ribW - 4, ribH + 2);
        ctx.fillRect(rx - 1, ry + 2, ribW + 2, ribH - 4);
        // Crimson-darkforge (or cyan-stagger) ribbon body
        ctx.fillStyle = isBreakOrVuln ? 'rgba(6, 20, 36, 0.94)' : 'rgba(38, 7, 13, 0.94)';
        ctx.fillRect(rx, ry, ribW, ribH);
        // Top gold / cyan rail + bottom crimson / sky bevel
        ctx.fillStyle = isBreakOrVuln ? '#67e8f9' : '#facc15';
        ctx.fillRect(rx + 2, ry, ribW - 4, 2);
        ctx.fillStyle = isBreakOrVuln ? '#0284c7' : '#dc2626';
        ctx.fillRect(rx + 2, ry + ribH - 2, ribW - 4, 2);
        // Side crimson-gold accent brackets & corner pips
        ctx.fillStyle = isBreakOrVuln ? '#38bdf8' : '#ef4444';
        ctx.fillRect(rx, ry + 2, 2, ribH - 4);
        ctx.fillRect(rx + ribW - 2, ry + 2, 2, ribH - 4);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(rx + 3, ry + 6, 2, 4);
        ctx.fillRect(rx + ribW - 5, ry + 6, 2, 4);

        PixelFont.drawCentered(
          ctx,
          labelStr,
          bx,
          ry + Math.floor(ribH * 0.5),
          1,
          isBreakOrVuln ? '#ecfeff' : '#fef08a',
          '#ffffff',
          true
        );
      } else if (!hasRaidHud) {
        const phaseTxt = `COLOSSUS • PHASE ${this.bossPhase || 1}`;
        PixelFont.drawCentered(ctx, phaseTxt, bx, by - 10, 1, '#fca5a5', '#ffffff', true);
      }

      if (!hasRaidHud) {
        ctx.fillStyle = '#05070e';
        ctx.fillRect(x0 - 1, by - 1, barW + 2, barH + 2);
        ctx.strokeStyle = this.vulnerableTimer > 0 ? '#67e8f9' : '#ef4444';
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = this.vulnerableTimer > 0 ? '#38bdf8' : '#dc2626';
        ctx.fillRect(x0, by, Math.round(barW * hpPct), barH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
        ctx.fillRect(x0, by, Math.round(barW * hpPct), 2);
      }
      ctx.restore();
    }
  }
}
