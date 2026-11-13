/**
 * Interactive 2.5D Destructible Terrain, Building Props & Ancient Artifact Caches (`AdventureDestructibles`)
 *
 * Features:
 *  - 22 curated 2.5D destructible props across Zones I..IV (`groundY: 462..658`), keeping central
 *    movement/dodge lanes wide open and NEVER blocking player `x` or `groundY` movement.
 *  - 9 distinct HD-2D 16-bit pixel-art archetypes (`#0d0f1c` 1px Selout outline, stepped cel ramps,
 *    2.5D base plinth + contact shadow, subtle additive glow `<= 0.16`, zero canvas rotation).
 *  - 3 visual states per prop:
 *      1. Intact (`hp > maxHp * 0.55`): Crisp full silhouette + animated rune/flame/crystal glint
 *      2. Cracked (`0 < hp <= maxHp * 0.55`): Chipped silhouette, jagged pixel cracks, exposed core & sparks
 *      3. Destroyed (`hp <= 0`): Persistent low shattered floor rubble + 14..18 ballistic bouncing pixel shards
 *  - Non-invasive hit detection across player `AUTO_ATTACK`, `SKILL`, `ULTIMATE`, `TRUE_ULTIMATE`,
 *    plus `game.vfx.projectiles`, `pillars`, `skyStrikes`, `crystalSpikes`, and `beams`.
 */

const SELOUT = '#0d0f1c';

const PROP_ARCHETYPES = {
  gilded_reliquary: {
    label: 'GILDED RELIQUARY',
    maxHp: 95,
    halfW: 26,
    height: 54,
    primaryColor: '#eab308',
    accentColor: '#fde047',
    debrisCols: ['#991b1b', '#eab308', '#fef08a', '#475569'],
    hitSfx: 'clang',
    breakSfx: 'parry_clang',
    breakCallout: 'RELIQUARY SMASHED!',
    calloutColor: '#fde047'
  },
  siege_barricade: {
    label: 'SIEGE BARRICADE',
    maxHp: 80,
    halfW: 32,
    height: 48,
    primaryColor: '#fb923c',
    accentColor: '#cbd5e1',
    debrisCols: ['#78350f', '#92400e', '#64748b', '#cbd5e1'],
    hitSfx: 'heavy_cleave',
    breakSfx: 'thunder_slam',
    breakCallout: 'BARRICADE BREACHED!',
    calloutColor: '#fb923c'
  },
  sanctuary_pillar: {
    label: 'SANCTUARY PILLAR',
    maxHp: 115,
    halfW: 22,
    height: 84,
    primaryColor: '#94a3b8',
    accentColor: '#eab308',
    debrisCols: ['#334155', '#64748b', '#cbd5e1', '#eab308'],
    hitSfx: 'clang',
    breakSfx: 'earthshatter',
    breakCallout: 'PILLAR SHATTERED!',
    calloutColor: '#e2e8f0'
  },
  eclipse_astrolabe: {
    label: 'ECLIPSE ASTROLABE',
    maxHp: 135,
    halfW: 26,
    height: 76,
    isArtifact: true,
    primaryColor: '#38bdf8',
    accentColor: '#fde047',
    debrisCols: ['#d97706', '#fde047', '#38bdf8', '#334155'],
    hitSfx: 'reflect',
    breakSfx: 'time_shatter',
    breakCallout: '★ ANCIENT ARTIFACT UNSEALED! ★',
    calloutColor: '#fde047'
  },
  elven_amphora: {
    label: 'SYLVAN AMPHORA',
    maxHp: 70,
    halfW: 24,
    height: 46,
    primaryColor: '#34d399',
    accentColor: '#a7f3d0',
    debrisCols: ['#065f46', '#10b981', '#cbd5e1', '#67e8f9'],
    hitSfx: 'clang',
    breakSfx: 'ice_shatter',
    breakCallout: 'SYLVAN CACHE OPENED!',
    calloutColor: '#34d399'
  },
  starwood_crystal: {
    label: 'STARWOOD RUNESTONE',
    maxHp: 130,
    halfW: 28,
    height: 74,
    isArtifact: true,
    primaryColor: '#34d399',
    accentColor: '#67e8f9',
    debrisCols: ['#059669', '#34d399', '#38bdf8', '#ecfeff'],
    hitSfx: 'frost_cast',
    breakSfx: 'ice_shatter',
    breakCallout: '★ ANCIENT ARTIFACT UNSEALED! ★',
    calloutColor: '#67e8f9'
  },
  ossuary_obelisk: {
    label: 'OSSUARY OBELISK',
    maxHp: 120,
    halfW: 24,
    height: 82,
    primaryColor: '#c084fc',
    accentColor: '#f43f5e',
    debrisCols: ['#2e1065', '#6b21a8', '#cbd5e1', '#f43f5e'],
    hitSfx: 'clang',
    breakSfx: 'thunder_slam',
    breakCallout: 'OSSUARY SUNDERED!',
    calloutColor: '#c084fc'
  },
  soul_brazier: {
    label: 'ABYSSAL SOUL-BRAZIER',
    maxHp: 110,
    halfW: 24,
    height: 72,
    isArtifact: true,
    primaryColor: '#c084fc',
    accentColor: '#f43f5e',
    debrisCols: ['#1e293b', '#9333ea', '#f43f5e', '#cbd5e1'],
    hitSfx: 'chain_hook',
    breakSfx: 'time_shatter',
    breakCallout: '★ ANCIENT ARTIFACT UNSEALED! ★',
    calloutColor: '#e879f9'
  },
  hellfire_pylon: {
    label: 'HELLFIRE SUPPLY PYLON',
    maxHp: 125,
    halfW: 26,
    height: 76,
    primaryColor: '#ef4444',
    accentColor: '#fb923c',
    debrisCols: ['#271215', '#b45309', '#ef4444', '#fde047'],
    hitSfx: 'clang',
    breakSfx: 'meteor_impact',
    breakCallout: 'HELLFIRE PYLON SHATTERED!',
    calloutColor: '#fb923c'
  }
};

// Curated 22-prop layout across Zones I..IV (`groundY` in `462..658`, central combat corridor clear!)
const CURATED_PROP_LAYOUT = [
  // Zone I: Eclipse Cathedral Outskirts (`0..1200`) — 6 props
  { kind: 'sanctuary_pillar', zone: 0, x: 310, groundY: 464, dropType: 'ember', ultAmt: 18 },
  { kind: 'gilded_reliquary', zone: 0, x: 455, groundY: 652, dropType: 'ember', ultAmt: 20 },
  { kind: 'siege_barricade', zone: 0, x: 635, groundY: 646, dropType: 'ember', ultAmt: 18 },
  {
    kind: 'eclipse_astrolabe',
    zone: 0,
    x: 760,
    groundY: 468,
    dropType: 'relic',
    relicAmt: 22,
    bonusDrop: 'ember',
    ultAmt: 18
  },
  { kind: 'gilded_reliquary', zone: 0, x: 925, groundY: 656, dropType: 'hp' },
  { kind: 'sanctuary_pillar', zone: 0, x: 1095, groundY: 462, dropType: 'ember', ultAmt: 18 },

  // Zone II: Cursed Starwood Crossing (`1200..2400`) — 6 props
  { kind: 'elven_amphora', zone: 1, x: 1335, groundY: 648, dropType: 'ember', ultAmt: 18 },
  { kind: 'elven_amphora', zone: 1, x: 1520, groundY: 466, dropType: 'hp' },
  {
    kind: 'starwood_crystal',
    zone: 1,
    x: 1680,
    groundY: 650,
    dropType: 'relic',
    relicAmt: 22,
    bonusDrop: 'ember',
    ultAmt: 18
  },
  { kind: 'elven_amphora', zone: 1, x: 1885, groundY: 462, dropType: 'ember', ultAmt: 18 },
  {
    kind: 'starwood_crystal',
    zone: 1,
    x: 2080,
    groundY: 468,
    dropType: 'hp',
    bonusDrop: 'ember',
    ultAmt: 20
  },
  { kind: 'elven_amphora', zone: 1, x: 2285, groundY: 654, dropType: 'hp' },

  // Zone III: Sunken Bone-Bridge Necropolis (`2400..3600`) — 7 props
  { kind: 'siege_barricade', zone: 2, x: 2505, groundY: 464, dropType: 'ember', ultAmt: 18 },
  { kind: 'ossuary_obelisk', zone: 2, x: 2675, groundY: 654, dropType: 'ember', ultAmt: 20 },
  {
    kind: 'soul_brazier',
    zone: 2,
    x: 2820,
    groundY: 652,
    dropType: 'relic',
    relicAmt: 22,
    bonusDrop: 'ember',
    ultAmt: 18
  },
  { kind: 'ossuary_obelisk', zone: 2, x: 2995, groundY: 462, dropType: 'hp' },
  { kind: 'siege_barricade', zone: 2, x: 3130, groundY: 650, dropType: 'ember', ultAmt: 18 },
  {
    kind: 'soul_brazier',
    zone: 2,
    x: 3220,
    groundY: 468,
    dropType: 'ember',
    ultAmt: 24
  },
  { kind: 'ossuary_obelisk', zone: 2, x: 3455, groundY: 656, dropType: 'ember', ultAmt: 20 },

  // Zone IV: Throne of the Black Pit Boss Arena (`3600..4800`) — 3 props
  { kind: 'hellfire_pylon', zone: 3, x: 4120, groundY: 464, dropType: 'hp' },
  { kind: 'hellfire_pylon', zone: 3, x: 4460, groundY: 658, dropType: 'ember', ultAmt: 28 },
  { kind: 'hellfire_pylon', zone: 3, x: 4630, groundY: 472, dropType: 'hp' }
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

function seloutRect(ctx, x, y, w, h, baseCol, litCol = null, darkCol = null) {
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
  if (darkCol && rw > 5 && rh > 5) {
    ctx.fillStyle = darkCol;
    ctx.fillRect(rx + 1, ry + rh - 3, rw - 2, 2);
    ctx.fillRect(rx + rw - 3, ry + 1, 2, rh - 2);
  }
  if (litCol && rw > 4 && rh > 4) {
    ctx.fillStyle = litCol;
    ctx.fillRect(rx + 1, ry + 1, rw - 3, 2);
    ctx.fillRect(rx + 1, ry + 1, 2, Math.max(2, rh - 4));
  }
}

function drawSubtlePropGlow(ctx, glowTex, cx, cy, rx, ry, alpha) {
  if (!glowTex || alpha <= 0.004) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, Math.min(0.16, alpha));
  ctx.drawImage(
    glowTex,
    Math.round(cx - rx),
    Math.round(cy - ry),
    Math.round(rx * 2),
    Math.round(ry * 2)
  );
  ctx.restore();
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
        dropType: spec.dropType || 'ember',
        bonusDrop: spec.bonusDrop || null,
        ultAmt: spec.ultAmt || 20,
        relicAmt: spec.relicAmt || 22,
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
        isMonster: true, // Prevents Renderer from drawing hero-only foot flames if merged into fighters
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

  getIntactTargetInFront(player, maxDist = 420) {
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
      if (dGy > 95) continue;
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
    for (let i = 0; i < count; i++) {
      if (this.debris.length > 180) this.debris.shift();
      const spreadA = ((i / Math.max(1, count)) - 0.5) * 2.2 + (Math.random() - 0.5) * 0.45;
      const speedX = (isShatter ? 95 : 55) + Math.random() * (isShatter ? 145 : 75);
      const shardW = isShatter ? 6 + (i % 3) * 3 : 4 + (i % 2) * 2;
      const shardH = isShatter ? 5 + ((i + 1) % 3) * 2 : 4 + (i % 2) * 2;
      const col = cols[i % cols.length];
      this.debris.push({
        x: prop.x + (Math.random() - 0.5) * prop.halfW * 1.3,
        y: prop.groundY - 12 - Math.random() * Math.max(16, prop.height * 0.72),
        groundY: prop.groundY + (Math.random() - 0.5) * 14,
        vx: Math.sin(spreadA) * speedX,
        vy: -(isShatter ? 185 : 115) - Math.random() * (isShatter ? 175 : 95),
        w: shardW,
        h: shardH,
        color: col,
        hiColor: i % 3 === 0 ? prop.accentColor : '#f8fafc',
        bounces: 0,
        life: 0,
        maxLife: (isShatter ? 0.95 : 0.55) + Math.random() * 0.35
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
      prop.isArtifact ? 118 : 84,
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

      if (typeof this.adventure.spawnPickup === 'function') {
        const hasBonus = Boolean(prop.bonusDrop);
        this.adventure.spawnPickup(
          prop.dropType,
          prop.x - (hasBonus ? 20 : 0),
          prop.groundY,
          {
            ultAmt: prop.ultAmt || 20,
            relicAmt: prop.relicAmt || 22
          }
        );
        if (hasBonus) {
          this.adventure.spawnPickup(prop.bonusDrop, prop.x + 22, prop.groundY, {
            ultAmt: prop.ultAmt || 20,
            relicAmt: prop.relicAmt || 22
          });
        }
      }
    }

    vfx?.spawnDamageText?.(
      prop.x,
      prop.groundY - prop.height - 32,
      0,
      true,
      prop.breakCallout ||
        (prop.isArtifact ? '★ ANCIENT ARTIFACT UNSEALED! ★' : 'RELIQUARY SMASHED!'),
      prop.calloutColor || (prop.isArtifact ? '#fde047' : '#fb923c')
    );

    return true;
  }

  update(dt, player, game) {
    // 1. Step prop feedback timers & ballistic pixel debris
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

    // 2. Player melee / skill / overdrive / supreme-ultimate swing tracking
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
          const maxFwd = Math.min(260, atkRange + 45);
          const dmg = Math.max(38, Math.round(48 * atkMult));
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            const dx = (prop.x - player.x) * facing;
            if (dx >= -42 && dx <= maxFwd && Math.abs(prop.groundY - playerGy) <= 68) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, dmg, player, game, false);
            }
          }
        } else if (st === 'SKILL' && stTimer >= 0.14) {
          const maxFwd = Math.min(360, atkRange + 145);
          const dmg = Math.max(65, Math.round(82 * skillMult));
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            const dx = (prop.x - player.x) * facing;
            if (dx >= -85 && dx <= maxFwd && Math.abs(prop.groundY - playerGy) <= 110) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, dmg, player, game, false);
            }
          }
        } else if (st === 'ULTIMATE' && stTimer >= 0.20) {
          for (let i = 0; i < this.props.length; i++) {
            const prop = this.props[i];
            if (prop.destroyed || prop._lastHitCastId === this._playerCastId) continue;
            if (
              Math.abs(prop.x - player.x) <= 360 &&
              Math.abs(prop.groundY - playerGy) <= 185
            ) {
              prop._lastHitCastId = this._playerCastId;
              this.damageProp(prop, 140, player, game, true);
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

    // 3. VFX Projectiles, Flame Pillars, Sky Strikes, Crystal Spikes & Beams
    const vfx = game?.vfx;
    if (!vfx) return;

    // 3A. Projectiles (`p.owner && p.owner.team === 1`)
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
          if (!p.isMeteor && Math.abs(ownerGy - prop.groundY) > 74) continue;

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

    // 3B. Flame / Elemental Pillars (`pil.erupted && pil.owner?.team === 1`)
    if (Array.isArray(vfx.pillars)) {
      for (let i = 0; i < vfx.pillars.length; i++) {
        const pil = vfx.pillars[i];
        if (!pil || !pil.erupted || pil.owner?.team !== 1) continue;
        const reachX = 92 * (pil.scaleWidth || 1);
        const pilGy = pil.groundY || 561;
        for (let j = 0; j < this.props.length; j++) {
          const prop = this.props[j];
          if (prop.destroyed || (pil._hitProps && pil._hitProps.has(prop))) continue;
          if (
            Math.abs(pil.x - prop.x) <= reachX &&
            Math.abs(pilGy - prop.groundY) <= 84
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

    // 3C. Sky Strikes (`s.impacted && s.owner?.team === 1`)
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

    // 3D. Crystal Spikes (`cs.erupted && cs.owner?.team === 1`)
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

    // 3E. Beams (`b.life < 0.25`, X-span & Y-span overlap)
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
  // FLOOR SHADOWS & PERSISTENT SHATTERED RUBBLE (`renderRubbleAndShadows`)
  // ===========================================================================
  renderRubbleAndShadows(ctx, renderer) {
    if (!ctx) return;
    const zoom = Math.max(0.35, renderer?.zoom || 1);
    const camX = Number.isFinite(renderer?.camX) ? renderer.camX : 600;
    const halfView = ((renderer?.width || 1280) * 0.5) / zoom + 220;
    const viewLeft = camX - halfView;
    const viewRight = camX + halfView;
    const t = renderer?.time || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.x + p.halfW + 40 < viewLeft || p.x - p.halfW - 40 > viewRight) continue;
      const cx = Math.round(p.x);
      const gy = Math.round(p.groundY);

      if (!p.destroyed) {
        // Grounded 2.5D elliptical/stepped contact shadow
        ctx.fillStyle = 'rgba(3, 5, 12, 0.52)';
        ctx.fillRect(cx - p.halfW - 6, gy - 5, (p.halfW + 6) * 2, 10);
        ctx.fillStyle = 'rgba(3, 5, 12, 0.28)';
        ctx.fillRect(cx - p.halfW + 2, gy - 8, (p.halfW - 2) * 2, 15);

        if (p.isArtifact || p.kind === 'hellfire_pylon') {
          const glowTex = renderer?.getGlowForColor
            ? renderer.getGlowForColor(p.primaryColor)
            : renderer?.glowGold;
          const pulse = 0.78 + 0.22 * Math.sin(t * 4.5 + p.index);
          drawSubtlePropGlow(ctx, glowTex, cx, gy, p.halfW + 24, 18, 0.13 * pulse);
        }
        continue;
      }

      // Persistent Low Shattered Base Plinth / Broken Stump (`height <= 16px` above `gy`)
      ctx.fillStyle = 'rgba(3, 5, 12, 0.45)';
      ctx.fillRect(cx - p.halfW - 6, gy - 4, (p.halfW + 6) * 2, 9);

      switch (p.kind) {
        case 'siege_barricade':
          seloutRect(ctx, cx - 28, gy - 8, 26, 9, '#78350f', '#b45309');
          seloutRect(ctx, cx + 2, gy - 10, 28, 10, '#78350f', '#92400e');
          seloutRect(ctx, cx - 10, gy - 6, 18, 7, '#475569', '#94a3b8');
          break;
        case 'elven_amphora':
          seloutRect(ctx, cx - 20, gy - 8, 18, 9, '#065f46', '#34d399');
          seloutRect(ctx, cx + 2, gy - 7, 16, 8, '#64748b', '#cbd5e1');
          pxFill(ctx, cx - 8, gy - 2, 18, 4, '#22d3ee');
          break;
        case 'starwood_crystal':
          seloutRect(ctx, cx - 24, gy - 10, 48, 12, '#1e3a34', '#4b8278');
          seloutRect(ctx, cx - 12, gy - 15, 10, 8, '#059669', '#6ee7b7');
          seloutRect(ctx, cx + 4, gy - 14, 9, 7, '#0284c7', '#67e8f9');
          break;
        case 'hellfire_pylon':
          seloutRect(ctx, cx - 24, gy - 11, 48, 13, '#271215', '#b45309');
          pxFill(ctx, cx - 14, gy - 8, 28, 4, '#ea580c');
          pxFill(ctx, cx - 6, gy - 7, 12, 2, '#fde047');
          break;
        default:
          // Broken carved masonry plinth + scattered stone/brass rubble blocks
          seloutRect(ctx, cx - p.halfW, gy - 10, p.halfW * 2, 12, '#334155', '#64748b', '#1e293b');
          seloutRect(ctx, cx - 14, gy - 16, 16, 8, '#475569', '#94a3b8');
          seloutRect(ctx, cx + 6, gy - 13, 12, 6, p.debrisCols[0] || '#64748b', p.accentColor);
          break;
      }
    }

    ctx.restore();
  }

  // ===========================================================================
  // BALLISTIC BOUNCING PIXEL DEBRIS (`renderDebris` — zero canvas rotation!)
  // ===========================================================================
  renderDebris(ctx, _renderer) {
    if (!ctx || this.debris.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.debris.length; i++) {
      const d = this.debris[i];
      const rem = 1 - d.life / d.maxLife;
      const alpha = rem < 0.25 ? rem / 0.25 : 1;
      const dx = Math.round(d.x - d.w * 0.5);
      const dy = Math.round(d.y - d.h * 0.5);
      const dw = Math.round(d.w);
      const dh = Math.round(d.h);

      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = '#03050c';
      ctx.fillRect(dx + 1, Math.round(d.groundY) - 1, dw, 3);

      ctx.globalAlpha = alpha;
      seloutRect(ctx, dx, dy, dw, dh, d.color, d.hiColor);
    }

    ctx.restore();
  }

  // ===========================================================================
  // INDIVIDUAL 2.5D PROP RENDERER (9 Archetypes × Intact / Cracked States)
  // ===========================================================================
  renderProp(ctx, prop, renderer, isRefl = false) {
    if (!ctx || !prop || prop.destroyed) return;

    const zoom = Math.max(0.35, renderer?.zoom || 1);
    const camX = Number.isFinite(renderer?.camX) ? renderer.camX : prop.x;
    const halfView = ((renderer?.width || 1280) * 0.5) / zoom + 220;
    if (prop.x + prop.halfW + 48 < camX - halfView || prop.x - prop.halfW - 48 > camX + halfView) {
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

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    switch (prop.kind) {
      case 'gilded_reliquary': {
        // 1. GILDED CATHEDRAL RELIQUARY CHEST (`halfW: 26, height: 54`)
        seloutRect(ctx, cx - 26, by - 10, 52, 11, '#334155', '#64748b', '#0f172a');
        seloutRect(ctx, cx - 24, by - 36, 48, 28, '#991b1b', '#dc2626', '#450a0a');
        // Gilded brass vertical straps & corner plates
        pxFill(ctx, cx - 22, by - 35, 5, 26, '#eab308');
        pxFill(ctx, cx + 17, by - 35, 5, 26, '#eab308');
        pxFill(ctx, cx - 4, by - 35, 8, 26, '#eab308');
        // Domed reliquary lid (`y: by - 52 .. by - 36`)
        if (!isCracked) {
          seloutRect(ctx, cx - 25, by - 46, 50, 12, '#b45309', '#fde047', '#78350f');
          seloutRect(ctx, cx - 18, by - 54, 36, 10, '#eab308', '#fef9c3', '#a16207');
          // Lockplate solar cross
          pxFill(ctx, cx - 2, by - 30, 4, 10, '#fef08a');
          pxFill(ctx, cx - 5, by - 27, 10, 4, '#fef08a');
        } else {
          // Cracked & pried-ajar lid with golden treasure light seeping out!
          pxFill(ctx, cx - 18, by - 39, 36, 5, '#fef08a');
          seloutRect(ctx, cx - 24, by - 49, 44, 11, '#b45309', '#fde047', '#78350f');
          pxFill(ctx, cx - 12, by - 32, 9, 3, SELOUT);
          pxFill(ctx, cx - 5, by - 29, 8, 3, SELOUT);
          pxFill(ctx, cx + 2, by - 26, 7, 2, SELOUT);
        }
        break;
      }

      case 'siege_barricade': {
        // 2. SPIKED TIMBER & IRON SIEGE BARRICADE (`halfW: 32, height: 48`)
        seloutRect(ctx, cx - 30, by - 10, 20, 10, '#451a03', '#92400e');
        seloutRect(ctx, cx + 10, by - 10, 20, 10, '#451a03', '#92400e');
        // Heavy horizontal timber crossbeam
        seloutRect(ctx, cx - 32, by - 28, 64, 14, '#78350f', '#b45309', '#451a03');
        // Riveted iron binding bands
        seloutRect(ctx, cx - 22, by - 30, 8, 18, '#334155', '#94a3b8');
        seloutRect(ctx, cx + 14, by - 30, 8, 18, '#334155', '#94a3b8');
        // 5 Iron-shod cheval-de-frise spikes (`cracked` snaps 2 spikes!)
        const spikeOffsets = [-24, -12, 0, 12, 24];
        for (let s = 0; s < spikeOffsets.length; s++) {
          if (isCracked && (s === 1 || s === 4)) continue;
          const sx = cx + spikeOffsets[s];
          seloutRect(ctx, sx - 4, by - 42, 8, 16, '#92400e', '#d97706');
          seloutRect(ctx, sx - 3, by - 49, 6, 9, '#64748b', '#e2e8f0');
        }
        if (isCracked) {
          pxFill(ctx, cx - 14, by - 24, 16, 3, SELOUT);
          pxFill(ctx, cx - 2, by - 21, 14, 3, SELOUT);
        }
        break;
      }

      case 'sanctuary_pillar': {
        // 3. CRACKED FLUTED MARBLE SANCTUARY PILLAR (`halfW: 22, height: 84`)
        seloutRect(ctx, cx - 22, by - 12, 44, 13, '#334155', '#94a3b8', '#0f172a');
        seloutRect(ctx, cx - 18, by - 20, 36, 10, '#475569', '#cbd5e1', '#1e293b');
        const shaftH = isCracked ? 48 : 56;
        seloutRect(ctx, cx - 14, by - 20 - shaftH, 28, shaftH, '#64748b', '#cbd5e1', '#334155');
        // Vertical marble flutes
        for (const fx of [cx - 8, cx - 1, cx + 6]) {
          pxFill(ctx, fx, by - 16 - shaftH + 6, 3, shaftH - 10, '#334155');
        }
        // Gilded astragal band
        pxFill(ctx, cx - 15, by - 24, 30, 3, '#eab308');
        if (!isCracked) {
          seloutRect(ctx, cx - 20, by - 84, 40, 10, '#94a3b8', '#f8fafc', '#334155');
          pxFill(ctx, cx - 16, by - 75, 32, 3, '#eab308');
        } else {
          // Sheared top & deep diagonal masonry fissure
          seloutRect(ctx, cx - 16, by - 74, 20, 8, '#94a3b8', '#e2e8f0');
          pxFill(ctx, cx - 12, by - 56, 10, 3, SELOUT);
          pxFill(ctx, cx - 4, by - 53, 10, 3, SELOUT);
          pxFill(ctx, cx + 2, by - 50, 9, 3, SELOUT);
        }
        break;
      }

      case 'eclipse_astrolabe': {
        // 4. ANCIENT BRASS ECLIPSE ASTROLABE PEDESTAL (`halfW: 26, height: 76`, Zone I Artifact)
        seloutRect(ctx, cx - 26, by - 12, 52, 13, '#1e293b', '#64748b', '#090d16');
        seloutRect(ctx, cx - 18, by - 34, 36, 24, '#334155', '#94a3b8', '#0f172a');
        pxFill(ctx, cx - 12, by - 26, 24, 4, '#eab308');

        const oy = by - 56;
        // Stepped brass outer ring
        seloutRect(ctx, cx - 20, oy - 18, 40, 6, '#d97706', '#fde047');
        seloutRect(ctx, cx - 20, oy + 12, 40, 6, '#b45309', '#f59e0b');
        seloutRect(ctx, cx - 22, oy - 14, 7, 28, '#d97706', '#fde047');
        if (!isCracked) {
          seloutRect(ctx, cx + 15, oy - 14, 7, 28, '#d97706', '#fde047');
        }
        // Glowing Astral Core
        seloutRect(ctx, cx - 9, oy - 9 + bob * 0.5, 18, 18, '#0284c7', '#67e8f9', '#0c4a6e');
        pxFill(ctx, cx - 4, oy - 4 + bob * 0.5, 8, 8, '#fef08a');
        if (!isRefl) {
          drawSubtlePropGlow(ctx, renderer?.glowGold, cx, oy, 44, 44, 0.16 * flick);
        }
        if (isCracked) {
          pxFill(ctx, cx - 12, by - 28, 14, 3, SELOUT);
          pxFill(ctx, cx + 12, oy - 16, 4, 4, '#fef08a');
        }
        break;
      }

      case 'elven_amphora': {
        // 5. TWIN CARVED SYLVAN MOON-AMPHORAS (`halfW: 24, height: 46`)
        seloutRect(ctx, cx - 24, by - 9, 48, 10, '#1e3a34', '#528e85', '#0d2122');
        // Left tall slender moonstone ewer with carved handles & lip
        seloutRect(ctx, cx - 22, by - 34, 22, 26, '#2d544b', '#a7f3d0', '#132a28');
        seloutRect(ctx, cx - 17, by - 46, 12, 14, '#649e94', '#ecfdf5');
        seloutRect(ctx, cx - 25, by - 40, 5, 12, '#cbd5e1', '#ffffff');
        pxFill(ctx, cx - 18, by - 25, 14, 4, '#34d399');

        // Right wide-bellied emerald amphora (`chipped open when cracked`)
        seloutRect(ctx, cx + 2, by - 28, 22, 20, '#065f46', '#34d399', '#022c22');
        if (!isCracked) {
          seloutRect(ctx, cx + 6, by - 38, 14, 12, '#10b981', '#a7f3d0');
          pxFill(ctx, cx + 8, by - 20, 10, 3, '#67e8f9');
        } else {
          pxFill(ctx, cx + 5, by - 25, 13, 3, SELOUT);
          pxFill(ctx, cx + 8, by - 22, 9, 6, '#67e8f9');
          pxFill(ctx, cx - 17, by - 29, 11, 3, SELOUT);
        }
        break;
      }

      case 'starwood_crystal': {
        // 6. STARWOOD ELDER RUNESTONE CRYSTAL CLUSTER (`halfW: 28, height: 74`, Zone II Artifact)
        seloutRect(ctx, cx - 28, by - 14, 56, 15, '#1b3634', '#528e85', '#0d2122');
        // Left emerald crystal spire
        seloutRect(ctx, cx - 22, by - 50, 14, 38, '#059669', '#6ee7b7', '#064e3b');
        // Center tall starlight-cyan prism
        const mainH = isCracked ? 50 : 62;
        seloutRect(ctx, cx - 9, by - 12 - mainH, 18, mainH, '#0284c7', '#a5f3fc', '#0c4a6e');
        pxFill(ctx, cx - 3, by - 8 - mainH + 8, 6, mainH - 16, '#ecfeff');
        // Right jade crystal spire (`snapped when cracked`)
        if (!isCracked) {
          seloutRect(ctx, cx + 9, by - 46, 14, 34, '#10b981', '#a7f3d0', '#064e3b');
        } else {
          seloutRect(ctx, cx + 9, by - 28, 14, 16, '#10b981', '#a7f3d0');
          pxFill(ctx, cx - 7, by - 42, 12, 3, SELOUT);
          pxFill(ctx, cx - 2, by - 39, 10, 3, '#ffffff');
        }
        if (!isRefl) {
          drawSubtlePropGlow(ctx, renderer?.glowEmerald || renderer?.glowCyan, cx, by - 42, 48, 46, 0.16 * flick);
        }
        break;
      }

      case 'ossuary_obelisk': {
        // 7. NECROPOLIS SKULL-INLAID OSSUARY OBELISK (`halfW: 24, height: 82`)
        seloutRect(ctx, cx - 24, by - 14, 48, 15, '#271c3c', '#58428c', '#120b20');
        seloutRect(ctx, cx - 19, by - 48, 38, 36, '#332252', '#6d4cab', '#180f29');
        const upperH = isCracked ? 20 : 30;
        seloutRect(ctx, cx - 15, by - 46 - upperH, 30, upperH, '#3b275e', '#8b6cd9', '#1d1233');
        if (!isCracked) {
          seloutRect(ctx, cx - 10, by - 84, 20, 10, '#58428c', '#d8b4fe');
        }
        // Inlaid bone skull alcove & glowing soul-rose rune channel
        seloutRect(ctx, cx - 8, by - 34, 16, 15, '#cbd5e1', '#ffffff', '#64748b');
        pxFill(ctx, cx - 5, by - 29, 3, 3, '#f43f5e');
        pxFill(ctx, cx + 2, by - 29, 3, 3, '#f43f5e');
        pxFill(ctx, cx - 3, by - 64, 6, 22, '#c084fc');
        pxFill(ctx, cx - 1, by - 60, 2, 14, '#fdf4ff');
        if (isCracked) {
          pxFill(ctx, cx - 14, by - 50, 16, 3, SELOUT);
          pxFill(ctx, cx - 2, by - 47, 14, 3, SELOUT);
        }
        break;
      }

      case 'soul_brazier': {
        // 8. CHAINED ABYSSAL SOUL-LANTERN BRAZIER (`halfW: 24, height: 72`, Zone III Artifact)
        seloutRect(ctx, cx - 24, by - 12, 48, 13, '#1e1b2e', '#58428c', '#090612');
        // Wrought-iron gallows arch & chain
        seloutRect(ctx, cx - 18, by - 68, 8, 58, '#334155', '#94a3b8', '#0f172a');
        seloutRect(ctx, cx - 18, by - 72, 34, 8, '#334155', '#cbd5e1');
        pxFill(ctx, cx + 6, by - 64, 3, 12, '#94a3b8');

        // Suspended Soul-Lantern Cage + Crimson/Violet Soul Core
        const ly = by - 52 + bob;
        seloutRect(ctx, cx - 5, ly, 22, 26, '#1e293b', '#c084fc', '#090d16');
        pxFill(ctx, cx, ly + 5, 12, 16, '#9333ea');
        pxFill(ctx, cx + 3, ly + 8, 6, 10, '#fda4af');
        if (!isRefl) {
          drawSubtlePropGlow(ctx, renderer?.glowViolet, cx + 6, ly + 12, 44, 44, 0.16 * flick);
        }
        if (isCracked) {
          pxFill(ctx, cx - 4, ly + 12, 18, 3, SELOUT);
          pxFill(ctx, cx + 10, ly - 6, 4, 4, '#f43f5e');
        }
        break;
      }

      case 'hellfire_pylon':
      default: {
        // 9. BLACK PIT OBSIDIAN SUPPLY PYLON / MAGMA BRAZIER (`halfW: 26, height: 76`)
        seloutRect(ctx, cx - 26, by - 14, 52, 15, '#271215', '#b45309', '#120709');
        seloutRect(ctx, cx - 20, by - 58, 40, 46, '#3b181e', '#f59e0b', '#190a0d');
        // Glowing molten core chamber behind forged iron ribs
        pxFill(ctx, cx - 12, by - 50, 24, 30, '#dc2626');
        pxFill(ctx, cx - 7, by - 45, 14, 20, '#fb923c');
        pxFill(ctx, cx - 3, by - 40, 6, 12, '#fef08a');
        pxFill(ctx, cx - 14, by - 42, 28, 3, '#18181b');
        pxFill(ctx, cx - 14, by - 30, 28, 3, '#18181b');

        // Roaring Hellfire Brazier Crown
        const fh = Math.round((isCracked ? 12 : 18) * flick);
        seloutRect(ctx, cx - 22, by - 64, 44, 8, '#78350f', '#f59e0b');
        pxFill(ctx, cx - 12, by - 64 - fh, 24, fh, '#ef4444');
        pxFill(ctx, cx - 7, by - 64 - Math.round(fh * 0.7), 14, Math.round(fh * 0.7), '#fde047');
        if (!isRefl) {
          drawSubtlePropGlow(ctx, renderer?.glowCrimson || renderer?.glowOrange, cx, by - 52, 48, 48, 0.16 * flick);
        }
        if (isCracked) {
          pxFill(ctx, cx - 18, by - 36, 16, 3, '#fef08a');
          pxFill(ctx, cx - 6, by - 33, 18, 3, SELOUT);
        }
        break;
      }
    }

    // Crisp pixel impact-glint cross on strike (preserves 100% of prop silhouette!)
    if (!isRefl && prop.hitFlash > 0) {
      const fcy = Math.round(by - prop.height * 0.52);
      ctx.globalAlpha = Math.min(0.85, prop.hitFlash / 0.16);
      pxFill(ctx, cx - 14, fcy - 2, 28, 4, '#fef08a');
      pxFill(ctx, cx - 2, fcy - 14, 4, 28, '#fef08a');
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
        const bw = 38;
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
