import { PixelForge } from '../engine/PixelForge.js?v=30fps98';

/**
 * Interactive 2.5D Architectural Monuments, Braziers & Ancient Artifact Shrines (`AdventureDestructibles`)
 *
 * Features:
 *  - 20 curated, hero-scaled (`drawScale: 1.50..1.66` -> `192..212px` cell, `148..185px` tall)
 *    architectural monuments across the 9600px (`4 x 2400px`) campaign, strictly matched to each
 *    Realm's architecture and anchored along colonnade piers (`groundY: 458`) and parapet
 *    copings (`groundY: 660`) so the central combat road stays wide open.
 *  - Controlled RPG economy: 12/20 architectural braziers/lanterns infuse direct Spirit & XP on
 *    shatter (`dropType: null`, zero floor clutter), leaving only 2 single-item caches (`1` Relic
 *    + `1` Solar Elixir) per 2400px Realm (`8` total across the campaign, zero double-drops).
 *  - Rendered from generated & pixel-pipeline-converted 16-bit HD-2D sprite atlas
 *    `assets/sprites/adv_props_sheet.png` (`1152x640`, `9 cols x 5 rows` of `128x128` cells,
 *    `1px` `#0d0f1c` Selout, zero canvas rotation, subtle additive glow `<= 0.15`):
 *      - Row 0 (`sy = 0`):   Intact Frame A (`bottom_y = 121` inside `128x128`)
 *      - Row 1 (`sy = 128`): Intact Gleam Frame B (animated flame/crystal/rune shimmer)
 *      - Row 2 (`sy = 256`): Cracked / Damaged (`0 < hp <= maxHp * 0.55`)
 *      - Row 3 (`sy = 384`): Persistent Low Shattered Plinth Base (`hp <= 0`)
 *      - Row 4 (`sy = 512`): Cols 0..5 RPG Pickups, Cols 6..8 `64x64` Pixel Debris Shards!
 */

const SELOUT = '#0d0f1c';
const PROP_CELL = 128;
const PROP_BASE_Y_IN_CELL = 121;

const PROP_ARCHETYPES = {
  eclipse_brazier: {
    sheetCol: 0,
    shardCol: 6,
    drawScale: 1.54,
    hasGlow: true,
    label: 'CATHEDRAL SANCTUM BRAZIER',
    maxHp: 115,
    halfW: 42,
    height: 152,
    primaryColor: '#38bdf8',
    accentColor: '#eab308',
    debrisCols: ['#334155', '#64748b', '#38bdf8', '#eab308'],
    hitSfx: 'clang',
    breakSfx: 'earthshatter',
    breakCallout: 'BRAZIER SHATTERED! +SPIRIT',
    calloutColor: '#7dd3fc'
  },
  eclipse_reliquary: {
    sheetCol: 1,
    shardCol: 6,
    drawScale: 1.50,
    hasGlow: true,
    label: 'ECLIPSE RELIQUARY STELE',
    maxHp: 110,
    halfW: 44,
    height: 148,
    primaryColor: '#eab308',
    accentColor: '#fde047',
    debrisCols: ['#334155', '#94a3b8', '#eab308', '#fef08a'],
    hitSfx: 'clang',
    breakSfx: 'parry_clang',
    breakCallout: 'RELIQUARY UNSEALED!',
    calloutColor: '#fde047'
  },
  eclipse_astrolabe: {
    sheetCol: 2,
    shardCol: 6,
    drawScale: 1.62,
    hasGlow: true,
    label: 'ECLIPSE ASTRAL ORRERY',
    maxHp: 135,
    halfW: 46,
    height: 160,
    isArtifact: true,
    primaryColor: '#38bdf8',
    accentColor: '#fde047',
    debrisCols: ['#d97706', '#fde047', '#38bdf8', '#334155'],
    hitSfx: 'reflect',
    breakSfx: 'time_shatter',
    breakCallout: '★ ANCIENT ORRERY UNSEALED! ★',
    calloutColor: '#fde047'
  },
  starwood_lantern: {
    sheetCol: 3,
    shardCol: 7,
    drawScale: 1.54,
    hasGlow: true,
    label: 'STARWOOD SHRINE LANTERN',
    maxHp: 105,
    halfW: 42,
    height: 152,
    primaryColor: '#34d399',
    accentColor: '#67e8f9',
    debrisCols: ['#3f2a1d', '#065f46', '#34d399', '#67e8f9'],
    hitSfx: 'clang',
    breakSfx: 'ice_shatter',
    breakCallout: 'SHRINE LANTERN SUNDERED! +SPIRIT',
    calloutColor: '#34d399'
  },
  starwood_crystal: {
    sheetCol: 4,
    shardCol: 7,
    drawScale: 1.62,
    hasGlow: true,
    label: 'STARWOOD RUNESTONE MONOLITH',
    maxHp: 130,
    halfW: 46,
    height: 160,
    isArtifact: true,
    primaryColor: '#34d399',
    accentColor: '#67e8f9',
    debrisCols: ['#059669', '#34d399', '#38bdf8', '#ecfeff'],
    hitSfx: 'frost_cast',
    breakSfx: 'ice_shatter',
    breakCallout: '★ SYLVAN RUNESTONE UNSEALED! ★',
    calloutColor: '#67e8f9'
  },
  soul_brazier: {
    sheetCol: 5,
    shardCol: 7,
    drawScale: 1.56,
    hasGlow: true,
    label: 'GARGOYLE SOUL-BRAZIER',
    maxHp: 115,
    halfW: 44,
    height: 154,
    primaryColor: '#c084fc',
    accentColor: '#f43f5e',
    debrisCols: ['#1e293b', '#6b21a8', '#c084fc', '#cbd5e1'],
    hitSfx: 'chain_hook',
    breakSfx: 'thunder_slam',
    breakCallout: 'SOUL-BRAZIER BANISHED! +SPIRIT',
    calloutColor: '#d8b4fe'
  },
  ossuary_obelisk: {
    sheetCol: 6,
    shardCol: 7,
    drawScale: 1.64,
    hasGlow: true,
    label: 'OSSUARY SKULL OBELISK',
    maxHp: 135,
    halfW: 46,
    height: 162,
    isArtifact: true,
    primaryColor: '#c084fc',
    accentColor: '#f43f5e',
    debrisCols: ['#2e1065', '#9333ea', '#cbd5e1', '#f43f5e'],
    hitSfx: 'clang',
    breakSfx: 'time_shatter',
    breakCallout: '★ NECROPOLIS RELIC UNSEALED! ★',
    calloutColor: '#e879f9'
  },
  blackpit_brazier: {
    sheetCol: 7,
    shardCol: 8,
    drawScale: 1.56,
    hasGlow: true,
    label: 'BLACK PIT HELLFIRE BRAZIER',
    maxHp: 120,
    halfW: 44,
    height: 154,
    primaryColor: '#ef4444',
    accentColor: '#fb923c',
    debrisCols: ['#271215', '#7f1d1d', '#fb923c', '#fde047'],
    hitSfx: 'heavy_cleave',
    breakSfx: 'meteor_impact',
    breakCallout: 'HELLFIRE BRAZIER SMASHED! +SPIRIT',
    calloutColor: '#fb923c'
  },
  hellfire_pylon: {
    sheetCol: 8,
    shardCol: 8,
    drawScale: 1.66,
    hasGlow: true,
    label: 'ABYSSAL OBSIDIAN PYLON',
    maxHp: 140,
    halfW: 48,
    height: 164,
    isArtifact: true,
    primaryColor: '#ef4444',
    accentColor: '#fde047',
    debrisCols: ['#271215', '#b45309', '#ef4444', '#fde047'],
    hitSfx: 'clang',
    breakSfx: 'meteor_impact',
    breakCallout: '★ ABYSSAL PYLON SHATTERED! ★',
    calloutColor: '#fde047'
  }
};

// Curated 20-monument architectural layout (`5` per 2400px Realm, aligned with colonnade piers `458` & parapets `660`, only `8` single-item drops total!)
const CURATED_PROP_LAYOUT = [
  // Zone I: Eclipse Cathedral Outskirts (`0..2400`) — Gothic Stone Braziers, Reliquary Steles & Astral Orrery
  { kind: 'eclipse_brazier', zone: 0, x: 420, groundY: 458, dropType: null },
  { kind: 'eclipse_reliquary', zone: 0, x: 920, groundY: 660, dropType: null },
  { kind: 'eclipse_astrolabe', zone: 0, x: 1380, groundY: 458, dropType: 'relic', relicAmt: 28 },
  { kind: 'eclipse_brazier', zone: 0, x: 1840, groundY: 660, dropType: null },
  { kind: 'eclipse_reliquary', zone: 0, x: 2240, groundY: 458, dropType: 'hp' },

  // Zone II: Cursed Starwood Crossing (`2400..4800`) — Root-Wrapped Shrine Lanterns & Starwood Runestone Monoliths
  { kind: 'starwood_lantern', zone: 1, x: 2680, groundY: 458, dropType: null },
  { kind: 'starwood_lantern', zone: 1, x: 3160, groundY: 660, dropType: null },
  { kind: 'starwood_crystal', zone: 1, x: 3620, groundY: 458, dropType: 'relic', relicAmt: 28 },
  { kind: 'starwood_lantern', zone: 1, x: 4120, groundY: 660, dropType: null },
  { kind: 'starwood_crystal', zone: 1, x: 4580, groundY: 458, dropType: 'hp' },

  // Zone III: Sunken Bone-Bridge Necropolis (`4800..7200`) — Gargoyle Soul-Braziers & Skull-Crowned Ossuary Obelisks
  { kind: 'soul_brazier', zone: 2, x: 5080, groundY: 458, dropType: null },
  { kind: 'soul_brazier', zone: 2, x: 5560, groundY: 660, dropType: null },
  { kind: 'ossuary_obelisk', zone: 2, x: 6020, groundY: 458, dropType: 'relic', relicAmt: 30 },
  { kind: 'soul_brazier', zone: 2, x: 6520, groundY: 660, dropType: null },
  { kind: 'ossuary_obelisk', zone: 2, x: 6980, groundY: 458, dropType: 'hp' },

  // Zone IV: Throne of the Black Pit (`7200..9600`, Boss at `9335`) — Spiked Hellfire Braziers & Chained Obsidian Pylons
  { kind: 'blackpit_brazier', zone: 3, x: 7460, groundY: 458, dropType: null },
  { kind: 'blackpit_brazier', zone: 3, x: 7880, groundY: 660, dropType: null },
  { kind: 'hellfire_pylon', zone: 3, x: 8280, groundY: 458, dropType: 'relic', relicAmt: 32 },
  { kind: 'blackpit_brazier', zone: 3, x: 8660, groundY: 660, dropType: null },
  { kind: 'hellfire_pylon', zone: 3, x: 9010, groundY: 458, dropType: 'hp' }
];

function pxFill(ctx, x, y, w, h, col) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;
  if (col) ctx.fillStyle = col;
  ctx.fillRect(rx, ry, rw, rh);
}

function seloutRect(ctx, x, y, w, h, baseCol, litCol = null) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 2 || rh <= 2) {
    pxFill(ctx, rx, ry, rw, rh, baseCol);
    return;
  }
  ctx.fillStyle = SELOUT;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.fillStyle = baseCol;
  ctx.fillRect(rx + 1, ry + 1, rw - 2, rh - 2);
  if (litCol && rw > 4 && rh > 4) {
    ctx.fillStyle = litCol;
    ctx.fillRect(rx + 1, ry + 1, rw - 3, 2);
  }
}

function drawSteppedPropPixelBloom(ctx, primaryCol, accentCol, cx, cy, rx, ry, alpha) {
  if (alpha <= 0.004) return;
  const u = 4;
  const sx = Math.round(cx / u) * u;
  const sy = Math.round(cy / u) * u;
  const hw = Math.max(u * 2, Math.round(rx / u) * u);
  const hh = Math.max(u, Math.round(ry / u) * u);
  const capped = Math.max(0, Math.min(0.14, alpha));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = primaryCol || '#38bdf8';
  ctx.globalAlpha = capped * 0.48;
  ctx.fillRect(sx - hw, sy - Math.max(u, hh >> 1), hw * 2, Math.max(u * 2, hh));
  ctx.fillRect(sx - Math.max(u, hw >> 1), sy - hh, Math.max(u * 2, hw), hh * 2);

  ctx.fillStyle = accentCol || primaryCol || '#fde047';
  ctx.globalAlpha = capped * 0.78;
  ctx.fillRect(sx - Math.max(u, hw >> 1), sy - Math.max(u, hh >> 1), Math.max(u * 2, hw), Math.max(u * 2, hh));
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
}

function isPropSheetReady(img) {
  if (!img) return false;
  if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
    return Boolean(img.complete && img.naturalWidth > 0);
  }
  return true;
}

export class AdventureDestructibles {
  constructor(adventure) {
    this.adventure = adventure;
    this.props = [];
    this.debris = [];
    this._playerCastId = 0;
    this._prevPlayerState = 'IDLE';
    this._prevStateTimer = 0;
    this._prevComboStep = -1;
    this._prevAutoVariant = -1;
    this.resetForCampaign();
  }

  resetForCampaign() {
    this.debris = [];
    this._playerCastId = 0;
    this._prevPlayerState = 'IDLE';
    this._prevStateTimer = 0;
    this._prevComboStep = -1;
    this._prevAutoVariant = -1;

    const self = this;
    this.props = CURATED_PROP_LAYOUT.map((spec, idx) => {
      const arch = PROP_ARCHETYPES[spec.kind];
      const prop = {
        id: `adv_prop_${idx}_${spec.kind}`,
        index: idx,
        kind: spec.kind,
        sheetCol: arch.sheetCol,
        shardCol: arch.shardCol,
        drawScale: arch.drawScale || 1.54,
        hasGlow: Boolean(arch.hasGlow || arch.isArtifact),
        name: arch.label,
        zone: spec.zone,
        x: spec.x,
        groundY: spec.groundY,
        y: spec.groundY,
        vx: 0,
        vy: 0,
        halfW: arch.halfW,
        height: arch.height,
        maxHp: arch.maxHp,
        hp: arch.maxHp,
        isArtifact: Boolean(arch.isArtifact || spec.isArtifact),
        dropType: spec.dropType ?? null,
        bonusDrop: spec.bonusDrop ?? null,
        ultAmt: spec.ultAmt || 20,
        relicAmt: spec.relicAmt || 28,
        primaryColor: arch.primaryColor,
        accentColor: arch.accentColor,
        debrisCols: arch.debrisCols,
        hitSfx: arch.hitSfx,
        breakSfx: arch.breakSfx,
        breakCallout: arch.breakCallout,
        calloutColor: arch.calloutColor,
        destroyed: false,
        isDead: false,
        isBenched: false,
        isFullyBurrowed: false,
        isColossalBoss: false,
        isMonster: true,
        isAdventureProp: true,
        isDummyFocal: true,
        hasPoise: true,
        unstoppablePoise: true,
        stunTimer: 0,
        state: 'IDLE',
        facing: -1,
        team: 2,
        attackRange: 80,
        moveSpeed: 0,
        hitShake: 0,
        hitFlash: 0,
        _lastHitCastId: -1,
        takeDamage() {
          return 0;
        },
        draw(ctx, isRefl = false, renderer = null) {
          self.renderProp(ctx, prop, renderer, isRefl);
        }
      };
      return prop;
    });
  }

  getStandingProps() {
    const out = [];
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (!p.destroyed) {
        p.y = p.groundY;
        out.push(p);
      }
    }
    return out;
  }

  getIntactTargetInFront(player, maxDist = 460) {
    if (!player) return null;
    const facing = player.facing || 1;
    const pGy = Number.isFinite(player.groundY) ? player.groundY : player.y || 561;
    let best = null;
    let bestScore = Infinity;

    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.destroyed) continue;
      const dx = (p.x - player.x) * facing;
      if (dx < 20 || dx > maxDist) continue;
      const dGy = Math.abs(p.groundY - pGy);
      if (dGy > 112) continue;
      const score = dx + dGy * 1.15 - (p.isArtifact ? 18 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  spawnPropDebris(prop, count = 8, isShatter = false) {
    const cols = prop.debrisCols || ['#475569', '#94a3b8', prop.accentColor];
    const shardCol = prop.shardCol ?? 6;
    for (let i = 0; i < count; i++) {
      if (this.debris.length > 180) this.debris.shift();
      const spreadA = ((i / Math.max(1, count)) - 0.5) * 2.2 + (Math.random() - 0.5) * 0.45;
      const speedX = (isShatter ? 105 : 60) + Math.random() * (isShatter ? 155 : 80);
      const drawSize = isShatter ? 30 + (i % 3) * 5 : 22 + (i % 2) * 4;
      const col = cols[i % cols.length];
      this.debris.push({
        x: prop.x + (Math.random() - 0.5) * prop.halfW * 1.3,
        y: prop.groundY - 16 - Math.random() * Math.max(22, prop.height * 0.72),
        groundY: prop.groundY + (Math.random() - 0.5) * 16,
        vx: Math.sin(spreadA) * speedX,
        vy: -(isShatter ? 195 : 120) - Math.random() * (isShatter ? 180 : 95),
        size: drawSize,
        shardCol,
        quad: i & 3,
        color: col,
        hiColor: i % 3 === 0 ? prop.accentColor : '#f8fafc',
        bounces: 0,
        life: 0,
        maxLife: (isShatter ? 0.98 : 0.58) + Math.random() * 0.35
      });
    }
  }

  damageProp(prop, dmg, attacker, game, isCrit = false) {
    if (!prop || prop.destroyed || dmg <= 0) return false;

    const amount = Math.max(1, Math.round(dmg));
    prop.hp = Math.max(0, prop.hp - amount);
    prop.hitShake = 0.22;
    prop.hitFlash = 0.16;

    const vfx = game?.vfx || this.adventure?.game?.vfx;
    const audio = game?.audio || this.adventure?.game?.audio;
    const renderer = game?.renderer || this.adventure?.game?.renderer;
    const hero = attacker || game?.leftFighter || this.adventure?.game?.leftFighter;

    this.spawnPropDebris(prop, 6, false);
    vfx?.spawnDamageText?.(prop.x, prop.groundY - prop.height - 8, amount, isCrit);
    vfx?.spawnBurst?.(prop.x, prop.groundY - prop.height * 0.55, 6, prop.accentColor, 150, {
      upBias: 70,
      size: 4.5,
      life: 0.30
    });

    if (prop.hp > 0) {
      audio?.play?.(prop.hitSfx || 'clang', prop.x);
      return false;
    }

    // Shattered (`hp <= 0`)!
    prop.destroyed = true;
    prop.isDead = true;
    prop.hitShake = 0;
    prop.hitFlash = 0;

    this.spawnPropDebris(prop, 16, true);
    vfx?.spawnShockwave?.(
      prop.x,
      prop.groundY - 16,
      prop.isArtifact ? 128 : 96,
      prop.accentColor,
      0.34,
      true
    );
    vfx?.spawnBurst?.(
      prop.x,
      prop.groundY - prop.height * 0.5,
      prop.isArtifact ? 18 : 12,
      prop.accentColor,
      205,
      {
        upBias: 115,
        size: 5.5,
        life: 0.42
      }
    );
    audio?.play?.(prop.breakSfx || 'thunder_slam', prop.x);
    renderer?.triggerShake?.(prop.isArtifact ? 7 : 4, 0.16);

    if (this.adventure) {
      this.adventure.score = (this.adventure.score || 0) + (prop.isArtifact ? 220 : 95);
      this.adventure.progression?.gainXp?.(prop.isArtifact ? 24 : 10, hero);
      this.adventure.progression?.gainSpirit?.(prop.isArtifact ? 14 : 10);

      if (prop.dropType && typeof this.adventure.spawnPickup === 'function') {
        const hasBonus = Boolean(prop.bonusDrop);
        this.adventure.spawnPickup(
          prop.dropType,
          prop.x - (hasBonus ? 22 : 0),
          prop.groundY,
          {
            ultAmt: prop.ultAmt || 20,
            relicAmt: prop.relicAmt || 28
          }
        );
        if (hasBonus) {
          this.adventure.spawnPickup(prop.bonusDrop, prop.x + 24, prop.groundY, {
            ultAmt: prop.ultAmt || 20,
            relicAmt: prop.relicAmt || 28
          });
        }
      }
    }

    vfx?.spawnDamageText?.(
      prop.x,
      prop.groundY - prop.height - 28,
      0,
      true,
      prop.breakCallout ||
        (prop.isArtifact ? '★ ANCIENT ARTIFACT UNSEALED! ★' : 'MONUMENT SHATTERED!'),
      prop.calloutColor || (prop.isArtifact ? '#fde047' : '#fb923c')
    );

    return true;
  }

  update(dt, player, game) {
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      p.y = p.groundY;
      if (p.hitShake > 0) p.hitShake = Math.max(0, p.hitShake - dt);
      if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        this.debris.splice(i, 1);
        continue;
      }
      d.vy += 760 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y >= d.groundY && d.vy > 0) {
        d.y = d.groundY;
        if (d.bounces < 2) {
          d.vy *= -0.44;
          d.vx *= 0.72;
          d.bounces++;
        } else {
          d.vy = 0;
          d.vx *= 0.82;
        }
      }
    }

    if (player && !player.isDead) {
      const st = player.state || 'IDLE';
      const stTimer = Number(player.stateTimer) || 0;
      const comboStep = player.comboStep ?? 0;
      const autoVar = player._autoVariant ?? 0;
      const isAtkState =
        st === 'AUTO_ATTACK' ||
        st === 'SKILL' ||
        st === 'ULTIMATE' ||
        st === 'TRUE_ULTIMATE';

      if (
        isAtkState &&
        (st !== this._prevPlayerState ||
          comboStep !== this._prevComboStep ||
          autoVar !== this._prevAutoVariant ||
          stTimer < this._prevStateTimer - 0.001)
      ) {
        this._playerCastId++;
      }

      this._prevPlayerState = st;
      this._prevStateTimer = stTimer;
      this._prevComboStep = comboStep;
      this._prevAutoVariant = autoVar;

      if (isAtkState) {
        const stats = this.adventure?.progression?.getComputedStats?.();
        const atkMult = stats?.atkMult ?? 1.0;
        const skillMult = stats?.skillMult ?? 1.0;
        const playerGy = Number.isFinite(player.groundY) ? player.groundY : player.y || 561;
        const facing = player.facing || 1;
        const atkRange = player.attackRange || 180;

        if (st === 'AUTO_ATTACK' && stTimer >= 0.10) {
          const maxFwd = Math.min(276, atkRange + 60);
          const dmg = Math.max(38, Math.round(48 * atkMult));
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            const dx = (prop.x - player.x) * facing;
            if (dx >= -52 && dx <= maxFwd && Math.abs(prop.groundY - playerGy) <= 78) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, dmg, player, game, false);
            }
          }
        } else if (st === 'SKILL' && stTimer >= 0.14) {
          const maxFwd = Math.min(375, atkRange + 155);
          const dmg = Math.max(65, Math.round(82 * skillMult));
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            const dx = (prop.x - player.x) * facing;
            if (dx >= -92 && dx <= maxFwd && Math.abs(prop.groundY - playerGy) <= 118) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, dmg, player, game, false);
            }
          }
        } else if (st === 'ULTIMATE' && stTimer >= 0.20) {
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            if (
              Math.abs(prop.x - player.x) <= 380 &&
              Math.abs(prop.groundY - playerGy) <= 215
            ) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, 145, player, game, true);
            }
          }
        } else if (st === 'TRUE_ULTIMATE' && stTimer >= 0.65) {
          const centerX = Number.isFinite(game?.renderer?.camX)
            ? game.renderer.camX
            : player.x;
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            if (Math.abs(prop.x - centerX) <= 680) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, 999, player, game, true);
            }
          }
        }
      }
    }

    const vfx = game?.vfx;
    if (!vfx) return;

    if (Array.isArray(vfx.projectiles)) {
      for (let i = vfx.projectiles.length - 1; i >= 0; i--) {
        const p = vfx.projectiles[i];
        if (!p || !p.owner || p.owner.team !== 1) continue;
        const pr = p.radius || 14;
        const ownerGy = Number.isFinite(p.owner.groundY) ? p.owner.groundY : p.y;

        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed) continue;
          if (p._hitProps && p._hitProps.has(prop)) continue;
          if (!p.isMeteor && Math.abs(ownerGy - prop.groundY) > 84) continue;

          if (
            Math.abs(p.x - prop.x) <= pr + prop.halfW + 14 &&
            Math.abs(p.y - (prop.groundY - prop.height * 0.55)) <= pr + prop.height * 0.65 + 24
          ) {
            const dmg = p.isMeteor ? 999 : Math.max(42, Math.round(p.damage || 45));
            this.damageProp(prop, dmg, p.owner, game, Boolean(p.isUltimate || p.isMeteor));
            if (!p.pierce && !p.isMeteor) {
              vfx.spawnBurst?.(p.x, p.y, 8, p.color || '#fb923c', 165, {
                upBias: 60,
                size: 5,
                life: 0.28
              });
              vfx.projectiles.splice(i, 1);
              break;
            } else {
              if (!p._hitProps) p._hitProps = new Set();
              p._hitProps.add(prop);
            }
          }
        }
      }
    }

    if (Array.isArray(vfx.pillars)) {
      for (let i = 0; i < vfx.pillars.length; i++) {
        const pil = vfx.pillars[i];
        if (!pil || !pil.erupted || pil.owner?.team !== 1) continue;
        const reachX = 96 * (pil.scaleWidth || 1);
        const pilGy = pil.groundY || 561;
        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed || (pil._hitProps && pil._hitProps.has(prop))) continue;
          if (
            Math.abs(pil.x - prop.x) <= reachX &&
            Math.abs(pilGy - prop.groundY) <= 94
          ) {
            if (!pil._hitProps) pil._hitProps = new Set();
            pil._hitProps.add(prop);
            this.damageProp(
              prop,
              pil.isUltimate ? 135 : 78,
              pil.owner,
              game,
              Boolean(pil.isUltimate)
            );
          }
        }
      }
    }

    if (Array.isArray(vfx.skyStrikes)) {
      for (let i = 0; i < vfx.skyStrikes.length; i++) {
        const s = vfx.skyStrikes[i];
        if (!s || !s.impacted || s.owner?.team !== 1) continue;
        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed || (s._hitProps && s._hitProps.has(prop))) continue;
          if (Math.abs(s.x - prop.x) <= 96) {
            if (!s._hitProps) s._hitProps = new Set();
            s._hitProps.add(prop);
            this.damageProp(
              prop,
              Math.max(54, Math.round(s.damage || 62)),
              s.owner,
              game,
              Boolean(s.isUltimate)
            );
          }
        }
      }
    }

    if (Array.isArray(vfx.crystalSpikes)) {
      for (let i = 0; i < vfx.crystalSpikes.length; i++) {
        const cs = vfx.crystalSpikes[i];
        if (!cs || !cs.erupted || cs.owner?.team !== 1) continue;
        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed || (cs._hitProps && cs._hitProps.has(prop))) continue;
          if (Math.abs(cs.x - prop.x) <= 82) {
            if (!cs._hitProps) cs._hitProps = new Set();
            cs._hitProps.add(prop);
            this.damageProp(
              prop,
              Math.max(54, Math.round(cs.damage || 60)),
              cs.owner,
              game,
              Boolean(cs.isUltimate)
            );
          }
        }
      }
    }

    if (Array.isArray(vfx.beams)) {
      for (let i = 0; i < vfx.beams.length; i++) {
        const b = vfx.beams[i];
        if (!b || (b.owner && b.owner.team !== 1) || (b.life ?? 0) >= 0.25) continue;
        const minBx = Math.min(b.x1, b.x2) - 24;
        const maxBx = Math.max(b.x1, b.x2) + 24;
        const halfBw = (b.width || 44) * 0.5 + 36;
        const minBy = Math.min(b.y1, b.y2) - halfBw;
        const maxBy = Math.max(b.y1, b.y2) + halfBw;

        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed || (b._hitProps && b._hitProps.has(prop))) continue;
          const propTop = prop.groundY - prop.height - 16;
          const propBot = prop.groundY + 18;
          if (
            prop.x >= minBx &&
            prop.x <= maxBx &&
            propBot >= minBy &&
            propTop <= maxBy
          ) {
            if (!b._hitProps) b._hitProps = new Set();
            b._hitProps.add(prop);
            this.damageProp(prop, 95, player || b.owner, game, true);
          }
        }
      }
    }
  }

  // ===========================================================================
  // FLOOR SHADOWS & PERSISTENT HD-2D SHATTERED RUBBLE (`renderRubbleAndShadows`)
  // ===========================================================================
  renderRubbleAndShadows(ctx, renderer) {
    if (!ctx) return;
    const zoom = Math.max(0.35, renderer?.zoom || 1);
    const camX = Number.isFinite(renderer?.camX) ? renderer.camX : 600;
    const halfView = ((renderer?.width || 1280) * 0.5) / zoom + 220;
    const viewLeft = camX - halfView;
    const viewRight = camX + halfView;
    const t = renderer?.time || 0;

    const assets = PixelForge.initAssets();
    const sheet = assets?.advPropsSheet;
    const sheetReady = isPropSheetReady(sheet);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.x + p.halfW + 52 < viewLeft || p.x - p.halfW - 52 > viewRight) continue;
      const cx = Math.round(p.x);
      const gy = Math.round(p.groundY);

      if (!p.destroyed) {
        // Grounded 2.5D elliptical stepped contact shadow
        ctx.fillStyle = 'rgba(3, 5, 12, 0.50)';
        ctx.fillRect(cx - p.halfW - 6, gy - 5, (p.halfW + 6) * 2, 10);
        ctx.fillStyle = 'rgba(3, 5, 12, 0.26)';
        ctx.fillRect(cx - p.halfW + 2, gy - 8, (p.halfW - 2) * 2, 14);

        if (p.hasGlow || p.isArtifact) {
          const pulse = 0.78 + 0.22 * Math.sin(t * 4.5 + p.index);
          drawSteppedPropPixelBloom(
            ctx,
            p.primaryColor,
            p.accentColor,
            cx,
            gy,
            p.halfW + 16,
            12,
            0.11 * pulse
          );
        }
        continue;
      }

      // Persistent Low Shattered Base Plinth from `advPropsSheet` Row 3 (`sy = 384`)
      ctx.fillStyle = 'rgba(3, 5, 12, 0.44)';
      ctx.fillRect(cx - p.halfW - 6, gy - 4, (p.halfW + 6) * 2, 9);

      if (sheetReady) {
        const dw = Math.round(PROP_CELL * p.drawScale);
        const dh = Math.round(PROP_CELL * p.drawScale);
        const dx = Math.round(cx - dw * 0.5);
        const dy = Math.round(gy - (PROP_BASE_Y_IN_CELL / PROP_CELL) * dh);
        ctx.drawImage(
          sheet,
          p.sheetCol * PROP_CELL,
          3 * PROP_CELL,
          PROP_CELL,
          PROP_CELL,
          dx,
          dy,
          dw,
          dh
        );
      } else {
        seloutRect(ctx, cx - p.halfW, gy - 10, p.halfW * 2, 12, '#334155', '#64748b');
      }
    }

    ctx.restore();
  }

  // ===========================================================================
  // BALLISTIC BOUNCING PIXEL DEBRIS (`renderDebris` — HD-2D Shards, zero rotation!)
  // ===========================================================================
  renderDebris(ctx, _renderer) {
    if (!ctx || this.debris.length === 0) return;
    const assets = PixelForge.initAssets();
    const sheet = assets?.advPropsSheet;
    const sheetReady = isPropSheetReady(sheet);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.debris.length; i++) {
      const d = this.debris[i];
      const rem = 1 - d.life / d.maxLife;
      const alpha = rem < 0.25 ? rem / 0.25 : 1;
      const sz = Math.round(d.size || 24);
      const dx = Math.round(d.x - sz * 0.5);
      const dy = Math.round(d.y - sz * 0.5);

      ctx.globalAlpha = alpha * 0.38;
      ctx.fillStyle = '#03050c';
      ctx.fillRect(Math.round(d.x) - 5, Math.round(d.groundY) - 1, 10, 3);

      ctx.globalAlpha = alpha;
      if (sheetReady) {
        const q = d.quad & 3;
        const sx = (d.shardCol || 6) * PROP_CELL + (q & 1) * 64;
        const sy = 4 * PROP_CELL + ((q >> 1) & 1) * 64;
        ctx.drawImage(sheet, sx, sy, 64, 64, dx, dy, sz, sz);
      } else {
        seloutRect(ctx, Math.round(d.x - 4), Math.round(d.y - 4), 8, 8, d.color, d.hiColor);
      }
    }

    ctx.restore();
  }

  // ===========================================================================
  // INDIVIDUAL 2.5D HD-2D SPRITE PROP RENDERER (9 Archetypes × Intact A/B & Cracked)
  // ===========================================================================
  renderProp(ctx, prop, renderer, isRefl = false) {
    if (!ctx || !prop || prop.destroyed) return;

    const zoom = Math.max(0.35, renderer?.zoom || 1);
    const camX = Number.isFinite(renderer?.camX) ? renderer.camX : prop.x;
    const halfView = ((renderer?.width || 1280) * 0.5) / zoom + 240;
    if (prop.x + prop.halfW + 84 < camX - halfView || prop.x - prop.halfW - 84 > camX + halfView) {
      return;
    }

    const t = renderer?.time || 0;
    const shakeX =
      !isRefl && prop.hitShake > 0
        ? Math.round(Math.sin(t * 62 + prop.index * 2.1) * 4 * (prop.hitShake / 0.22))
        : 0;
    const cx = Math.round(prop.x + shakeX);
    const by = Math.round(prop.groundY);
    const isCracked = prop.hp <= prop.maxHp * 0.55;
    const flick = 0.78 + 0.22 * Math.sin(t * 6.4 + prop.index * 1.7);
    const bob = Math.round(Math.sin(t * 3.4 + prop.index) * 3);

    const assets = PixelForge.initAssets();
    const sheet = assets?.advPropsSheet;
    const sheetReady = isPropSheetReady(sheet);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (sheetReady) {
      // Row 0: Intact Frame A, Row 1: Intact Gleam Frame B, Row 2: Cracked (`0 < hp <= 55%`)
      const gleamFrame = Math.floor(t * 2.8 + prop.index * 0.7) % 2;
      const sheetRow = isCracked ? 2 : gleamFrame;
      const dw = Math.round(PROP_CELL * prop.drawScale);
      const dh = Math.round(PROP_CELL * prop.drawScale);
      const dx = Math.round(cx - dw * 0.5);
      const dy = Math.round(by - (PROP_BASE_Y_IN_CELL / PROP_CELL) * dh);

      ctx.drawImage(
        sheet,
        prop.sheetCol * PROP_CELL,
        sheetRow * PROP_CELL,
        PROP_CELL,
        PROP_CELL,
        dx,
        dy,
        dw,
        dh
      );
    } else {
      seloutRect(
        ctx,
        cx - prop.halfW,
        by - prop.height,
        prop.halfW * 2,
        prop.height,
        prop.primaryColor,
        prop.accentColor
      );
    }

    // Subtle stepped pixel-grid core bloom on lit braziers, lanterns & artifact monuments (`alpha <= 0.12`)
    if (!isRefl && (prop.hasGlow || prop.isArtifact)) {
      drawSteppedPropPixelBloom(
        ctx,
        prop.primaryColor,
        prop.accentColor,
        cx,
        by - prop.height * 0.62,
        40,
        40,
        0.12 * flick
      );
    }

    // Crisp pixel impact-glint cross on strike
    if (!isRefl && prop.hitFlash > 0) {
      const fcy = Math.round(by - prop.height * 0.52);
      ctx.globalAlpha = Math.min(0.85, prop.hitFlash / 0.16);
      pxFill(ctx, cx - 16, fcy - 2, 32, 4, '#fef08a');
      pxFill(ctx, cx - 2, fcy - 16, 4, 32, '#fef08a');
      pxFill(ctx, cx - 6, fcy - 6, 12, 12, '#ffffff');
      ctx.globalAlpha = 1;
    }

    // Subtle Ancient Artifact overhead diamond beacon + damaged mini pixel HP bar
    if (!isRefl) {
      if (prop.isArtifact) {
        const ay = by - prop.height - 14 + bob;
        seloutRect(ctx, cx - 5, ay - 5, 10, 10, prop.accentColor, '#ffffff');
      }
      if (prop.hp < prop.maxHp) {
        const bw = 48;
        const bx = cx - (bw >> 1);
        const barY = by - prop.height - (prop.isArtifact ? 26 : 12);
        const ratio = Math.max(0, Math.min(1, prop.hp / prop.maxHp));
        pxFill(ctx, bx - 1, barY - 1, bw + 2, 6, SELOUT);
        pxFill(ctx, bx, barY, bw, 4, '#1e293b');
        pxFill(
          ctx,
          bx,
          barY,
          Math.max(2, Math.round(bw * ratio)),
          4,
          isCracked ? '#ef4444' : '#facc15'
        );
      }
    }

    ctx.restore();
  }
}
