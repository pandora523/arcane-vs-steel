import { PixelForge } from '../engine/PixelForge.js?v=30fps192';
import { PixelFont } from '../engine/PixelFont.js?v=30fps192';

export const ENDLESS_MAX_ACTIVE_SLOTS = 3;

export const ENDLESS_COMPANION_ROSTER = [
  {
    id: 'aethelgard',
    heroKey: 'warrior_ex',
    name: 'AETHELGARD',
    role: 'TANK',
    accentHex: '#38bdf8',
    recruitCost: 60,
    upgradeBaseCost: 45,
    costGrowth: 1.24,
    baseDps: 24,
    attackRange: 138,
    attackInterval: 0.95,
    skillCooldown: 7.5,
    abilityName: 'AEGIS BASTION',
    desc: 'Frontline vanguard that taunts foes and shields the hero.'
  },
  {
    id: 'seraphina',
    heroKey: 'priestess_ex',
    name: 'SERAPHINA',
    role: 'HEALER',
    accentHex: '#fde047',
    recruitCost: 95,
    upgradeBaseCost: 65,
    costGrowth: 1.25,
    baseDps: 18,
    attackRange: 380,
    attackInterval: 1.15,
    skillCooldown: 6.5,
    abilityName: 'SERAPHIC MEND',
    desc: 'Restores hero HP and smites foes with radiant light.'
  },
  {
    id: 'ignis_sol',
    heroKey: 'mage_ex',
    name: 'IGNIS SOL',
    role: 'BLASTER',
    accentHex: '#fb923c',
    recruitCost: 140,
    upgradeBaseCost: 95,
    costGrowth: 1.25,
    baseDps: 36,
    attackRange: 420,
    attackInterval: 1.05,
    skillCooldown: 5.8,
    abilityName: 'SOLAR FLARE',
    desc: 'Unleashes scorching AoE flame bursts across monster packs.'
  },
  {
    id: 'sylvanis',
    heroKey: 'archer_ex',
    name: 'SYLVANIS',
    role: 'ARCHER',
    accentHex: '#34d399',
    recruitCost: 210,
    upgradeBaseCost: 135,
    costGrowth: 1.26,
    baseDps: 44,
    attackRange: 465,
    attackInterval: 0.82,
    skillCooldown: 5.2,
    abilityName: 'STARFALL VOLLEY',
    desc: 'Rapid piercing arrows and multi-target starfall volleys.'
  },
  {
    id: 'freyja',
    heroKey: 'valkyrie_ex',
    name: 'FREYJA',
    role: 'LANCER',
    accentHex: '#facc15',
    recruitCost: 340,
    upgradeBaseCost: 210,
    costGrowth: 1.27,
    baseDps: 58,
    attackRange: 195,
    attackInterval: 0.92,
    skillCooldown: 6.0,
    abilityName: 'VALKYRIE DIVE',
    desc: 'High-impact sky-lance thrusts with heavy boss stagger.'
  },
  {
    id: 'kaze_maru',
    heroKey: 'ronin_ex',
    name: 'KAZE-MARU',
    role: 'STRIKER',
    accentHex: '#22d3ee',
    recruitCost: 520,
    upgradeBaseCost: 320,
    costGrowth: 1.28,
    baseDps: 76,
    attackRange: 165,
    attackInterval: 0.72,
    skillCooldown: 5.0,
    abilityName: 'IAIDO FLASH',
    desc: 'Blistering iaido critical slashes that shred single targets.'
  },
  {
    id: 'chronos',
    heroKey: 'chronomancer_ex',
    name: 'CHRONOS',
    role: 'WEAVER',
    accentHex: '#c084fc',
    recruitCost: 840,
    upgradeBaseCost: 500,
    costGrowth: 1.29,
    baseDps: 94,
    attackRange: 395,
    attackInterval: 1.0,
    skillCooldown: 8.0,
    abilityName: 'CHRONO HASTE',
    desc: 'Slows monsters in a temporal field and accelerates allies.'
  },
  {
    id: 'raijin_ex',
    heroKey: 'brawler_ex',
    name: 'RAIJIN EX',
    role: 'BRAWLER',
    accentHex: '#fbbf24',
    recruitCost: 1350,
    upgradeBaseCost: 820,
    costGrowth: 1.30,
    baseDps: 124,
    attackRange: 148,
    attackInterval: 0.76,
    skillCooldown: 5.5,
    abilityName: 'THUNDER BARRAGE',
    desc: 'Relentless lightning-fist barrages and thunder shockwaves.'
  }
];

const ROSTER_BY_ID = Object.create(null);
for (const cfg of ENDLESS_COMPANION_ROSTER) {
  ROSTER_BY_ID[cfg.id] = cfg;
}

const SKILL_DAMAGE_MULTIPLIER_BY_ROLE = {
  TANK: 2.2,
  HEALER: 2.0,
  BLASTER: 3.1,
  ARCHER: 2.8,
  LANCER: 3.4,
  STRIKER: 3.6,
  WEAVER: 2.4,
  BRAWLER: 3.3
};

const COMPANION_DRAW_SCALE = 0.88;
const COMPANION_ENGAGE_RANGE = 640;
const FORMATION_LANE_OFFSETS = [-62, 60, -8];
const SPAWN_X_OFFSETS = [-102, -124, -138];
const SPAWN_LANE_Y = [492, 622, 558];

function clampNum(v, lo, hi) {
  if (!Number.isFinite(v)) return lo;
  return v < lo ? lo : v > hi ? hi : v;
}

function safeEnsureHeroLoaded(heroKey) {
  if (!heroKey) return;
  if (typeof Image === 'undefined' && !PixelForge.assets) return;
  try {
    PixelForge.ensureHeroLoaded?.(heroKey);
  } catch {
    // Ignore asset preload errors in headless/test contexts
  }
}

function getSafePixelForgeAssets() {
  if (PixelForge.assets) return PixelForge.assets;
  if (typeof Image === 'undefined') return null;
  try {
    return PixelForge.initAssets?.() || null;
  } catch {
    return null;
  }
}

function drawPixelDiamond(ctx, cx, cy, halfSize, color) {
  const s = Math.max(2, Math.round(halfSize));
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  ctx.fillStyle = color;
  for (let row = -s; row <= s; row += 2) {
    const span = Math.max(2, (s - Math.abs(row)) * 2);
    ctx.fillRect(ix - Math.round(span * 0.5), iy + row, span, 2);
  }
}

function drawSteppedPixelAuraRing(ctx, cx, cy, rx, ry, outerColor, innerColor, alpha) {
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const rX = Math.max(12, Math.round(rx));
  const rY = Math.max(6, Math.round(ry));
  const step = 3;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = clampNum(alpha, 0, 1);

  for (let dy = -rY; dy <= rY; dy += step) {
    const normY = dy / rY;
    const spanSq = 1 - normY * normY;
    if (spanSq <= 0) continue;
    const halfW = Math.max(step, Math.round((Math.sqrt(spanSq) * rX) / step) * step);
    const bandY = iy + dy;
    const isTopOrBottom = Math.abs(dy) >= rY - step;

    ctx.fillStyle = outerColor;
    if (isTopOrBottom) {
      ctx.fillRect(ix - halfW, bandY, halfW * 2, step);
    } else {
      ctx.fillRect(ix - halfW, bandY, step * 2, step);
      ctx.fillRect(ix + halfW - step * 2, bandY, step * 2, step);
    }

    const innerHalfW = Math.max(step, halfW - step * 2);
    ctx.fillStyle = innerColor;
    if (Math.abs(dy) >= rY - step * 2 && Math.abs(dy) < rY - step) {
      ctx.fillRect(ix - innerHalfW, bandY, innerHalfW * 2, step);
    } else if (!isTopOrBottom && innerHalfW > step * 2) {
      ctx.fillRect(ix - innerHalfW, bandY, step, step);
      ctx.fillRect(ix + innerHalfW - step, bandY, step, step);
    }
  }
  ctx.restore();
}

export class EndlessCompanionEntity {
  constructor(cfg, { x = 260, groundY = 558, facing = 1, level = 1, slotIndex = 0 } = {}) {
    this.cfg = cfg;
    this.isEndlessCompanion = true;
    this.isMonster = false;
    this.isDead = false;
    this.isBenched = false;
    this.isEx = true;
    this.team = 1;
    this.heroId = cfg.heroKey;
    this.companionId = cfg.id;
    this.name = cfg.name;
    this.role = cfg.role;
    this.primaryColor = cfg.accentHex;
    this.slotIndex = slotIndex;
    this.isRanged = cfg.attackRange >= 300;
    this.attackRange = cfg.attackRange;

    this.x = Number.isFinite(x) ? x : 260;
    this.groundY = clampNum(groundY, 465, 655);
    this.y = this.groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing < 0 ? -1 : 1;
    this.moveDir = 1;

    this.state = 'IDLE';
    this.stateTimer = 0;
    this.animFrame = (slotIndex * 7) % 30;
    this.walkPhase = slotIndex * 1.1;
    this.level = Math.max(1, Math.floor(Number(level) || 1));

    this.autoDuration = clampNum(cfg.attackInterval * 0.64, 0.40, 0.68);
    this.skillDuration = 0.84;
    this.dashDuration = 0.42;

    this.attackCooldown = 0.25 + slotIndex * 0.12;
    this.skillMaxCooldown = cfg.skillCooldown;
    this.skillCooldown = Math.max(1.2, cfg.skillCooldown * (0.35 + slotIndex * 0.14));
    this.ultCharge = 0;

    this.auraRingTimer = 1.35;
    this.auraRingMax = 1.35;
    this.auraRingKind = 'summon';

    this.activeProjectiles = [];
    this.activeStrikes = [];
    this.didActionHit = false;
    this.didSkillHit = false;
    this.skillBeatMask = 0;
    this.targetMonster = null;

    // Compatibility fields for Fighter / Monster / Renderer shared pipelines
    this.mana = 0;
    this.maxMana = 100;
    this.finisherGauge = 0;
    this.maxFinisherGauge = 100;
    this.hurtTimer = 0;
    this.hitFlash = 0;
    this.stunTimer = 0;
    this.deathTimer = 0;
    this.calloutText = '';
    this.calloutTimer = 0;
    this.calloutColor = cfg.accentHex;
    this.stats = {
      damageDealt: 0,
      critsLanded: 0,
      biggestHit: 0,
      clashes: 0,
      counters: 0
    };
  }

  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.stateTimer = 0;
      this.didActionHit = false;
      this.didSkillHit = false;
      this.skillBeatMask = 0;
      if (newState === 'AUTO_ATTACK' || newState === 'SKILL' || newState === 'DASH') {
        this.animFrame = 0;
      }
    }
  }

  gainMana(amount) {
    const amt = Math.max(0, Number(amount) || 0);
    this.mana = Math.min(this.maxMana, this.mana + amt);
    this.ultCharge = Math.min(100, this.ultCharge + amt * 0.65);
  }

  gainFinisher(amount) {
    const amt = Math.max(0, Number(amount) || 0);
    this.finisherGauge = Math.min(this.maxFinisherGauge, this.finisherGauge + amt);
    this.ultCharge = Math.min(100, this.ultCharge + amt * 0.5);
  }

  takeDamage() {
    // Endless companions are immortal party aides so combat flow never breaks.
    this.hitFlash = Math.max(this.hitFlash, 0.08);
  }

  triggerAuraRing(kind = 'summon', duration = 1.25) {
    this.auraRingKind = kind === 'heal' || kind === 'buff' ? kind : 'summon';
    const dur = Math.max(0.35, Number(duration) || 1.25);
    this.auraRingTimer = Math.max(this.auraRingTimer, dur);
    this.auraRingMax = Math.max(dur, this.auraRingMax || dur);
  }

  triggerCallout(text, color = null, duration = 1.15) {
    this.calloutText = String(text || '');
    this.calloutColor = color || this.primaryColor;
    this.calloutTimer = Math.max(0.25, duration);
  }

  getAnimRowAndCol() {
    let row = 0;
    let col = 0;
    if (this.state === 'WALK') {
      row = 1;
      col = Math.floor(Math.abs(this.animFrame)) % 30;
    } else if (this.state === 'AUTO_ATTACK') {
      row = 2;
      col = clampNum(Math.floor((this.stateTimer / Math.max(0.1, this.autoDuration)) * 30), 0, 29);
    } else if (this.state === 'SKILL') {
      row = 3;
      col = clampNum(Math.floor((this.stateTimer / Math.max(0.1, this.skillDuration)) * 30), 0, 29);
    } else if (this.state === 'DASH') {
      row = 6;
      col = clampNum(Math.floor((this.stateTimer / Math.max(0.1, this.dashDuration)) * 30), 0, 29);
    } else {
      row = 0;
      col = Math.floor(Math.abs(this.animFrame)) % 30;
    }
    return { row, col };
  }

  _drawSilhouetteFallback(ctx, scale) {
    const px = 3;
    const h = Math.round(138 * scale);
    const w = Math.round(48 * scale);
    const halfW = Math.round(w * 0.5);
    const head = Math.round(24 * scale);
    const accent = this.primaryColor || '#38bdf8';

    ctx.fillStyle = accent;
    ctx.fillRect(-halfW - 6, -px, (halfW + 6) * 2, px);

    ctx.fillStyle = '#0d0f1c';
    ctx.fillRect(-Math.round(head * 0.5) - 2, -h - 2, head + 4, head + 4);
    ctx.fillRect(-halfW - 2, -h + head, w + 4, Math.round(h * 0.48) + 4);
    ctx.fillRect(-halfW + 2, -Math.round(h * 0.34), Math.round(w * 0.38), Math.round(h * 0.34));
    ctx.fillRect(Math.round(w * 0.1), -Math.round(h * 0.34), Math.round(w * 0.38), Math.round(h * 0.34));

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-Math.round(head * 0.5), -h, head, head);
    ctx.fillRect(-halfW, -h + head + 2, w, Math.round(h * 0.46));

    ctx.fillStyle = accent;
    ctx.fillRect(-halfW + 4, -h + head + 6, w - 8, 6);
    ctx.fillRect(Math.round(halfW * 0.45), -h + head + 4, 8, Math.round(h * 0.42));
  }

  _drawRoleOverheadUI(ctx) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;
    const cx = Math.round(this.x);
    const headY = Math.round(this.y - 164);

    const roleLabel = `${this.role} LV.${this.level}`;
    const textW = PixelFont.measureWidth(roleLabel, 1, 1);
    const pillW = Math.max(46, textW + 10);
    const pillH = 13;
    const pillX = Math.round(cx - pillW * 0.5);
    const pillY = headY - pillH;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Compact obsidian nameplate with companion role accent rim
    ctx.fillStyle = 'rgba(7, 10, 20, 0.84)';
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.fillStyle = '#05070e';
    ctx.fillRect(pillX - 1, pillY, 1, pillH);
    ctx.fillRect(pillX + pillW, pillY, 1, pillH);
    ctx.fillRect(pillX, pillY + pillH, pillW, 1);
    ctx.fillStyle = this.primaryColor || '#38bdf8';
    ctx.fillRect(pillX, pillY - 1, pillW, 2);

    PixelFont.drawCentered(ctx, roleLabel, cx, pillY + 7, 1, '#f8fafc', this.primaryColor, true);

    // Subtle green-to-gold skill readiness bar & ready pip directly beneath nameplate
    const barW = 38;
    const barH = 4;
    const barX = Math.round(cx - barW * 0.5);
    const barY = pillY + pillH + 2;
    const cdMax = Math.max(0.5, this.skillMaxCooldown || 6);
    const skillRatio =
      this.state === 'SKILL' ? 1 : clampNum(1 - this.skillCooldown / cdMax, 0, 1);
    const fillW = Math.round(barW * skillRatio);
    const isSkillReady = skillRatio >= 0.98 || this.state === 'SKILL';

    ctx.fillStyle = '#05070e';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#141a2b';
    ctx.fillRect(barX, barY, barW, barH);
    if (fillW > 0) {
      ctx.fillStyle = isSkillReady ? '#facc15' : '#34d399';
      ctx.fillRect(barX, barY, fillW, barH);
      ctx.fillStyle = isSkillReady ? '#fef9c3' : '#a7f3d0';
      ctx.fillRect(barX, barY, fillW, 1);
    }

    // Gold pip on right edge when skill ready or ult full
    if (isSkillReady) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(barX + barW + 2, barY, 3, 4);
    }
    if (this.ultCharge >= 100) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(barX - 5, barY, 3, 4);
    }

    // Crisp ability callout flash when skill fires
    if (this.calloutTimer > 0 && this.calloutText) {
      const fade = clampNum(this.calloutTimer / 0.35, 0, 1);
      const lift = Math.round((1.15 - Math.min(1.15, this.calloutTimer)) * 18);
      ctx.globalAlpha = fade;
      PixelFont.drawCentered(
        ctx,
        this.calloutText,
        cx,
        pillY - 11 - lift,
        1,
        '#fef9c3',
        this.calloutColor,
        true
      );
    }

    ctx.restore();
  }

  draw(ctx, isReflection = false, _renderer = null) {
    if (!ctx) return;

    safeEnsureHeroLoaded(this.heroId);
    const assets = getSafePixelForgeAssets();
    const charSet = assets?.[this.heroId] || null;
    const rawSheet = charSet?.sheet || null;
    const sheet = rawSheet ? PixelForge.ensureImage?.(rawSheet) || rawSheet : null;
    const hasSheet = Boolean(
      sheet && sheet.complete && (sheet.naturalWidth || sheet.width) > 0
    );

    const drawX = Math.round(this.x);
    const drawY = Math.round((Number.isFinite(this.y) ? this.y : this.groundY) + 3);
    const scale = COMPANION_DRAW_SCALE;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(drawX, drawY);
    ctx.scale(this.facing < 0 ? -1 : 1, 1);

    if (hasSheet && typeof ctx.drawImage === 'function') {
      const natW = sheet.naturalWidth || sheet.width;
      const natH = sheet.naturalHeight || sheet.height;
      let cellW = charSet?.cellW || 320;
      let cellH = charSet?.cellH || 240;
      let anchorX = charSet?.anchorX ?? 112;
      let anchorY = charSet?.anchorY ?? 230;

      if (natW === 6240 && natH === 2080) {
        cellW = 208;
        cellH = 208;
        anchorX = 104;
        anchorY = 198;
      } else if (
        natW > 0 &&
        natH > 0 &&
        (natW % cellW !== 0 || natH % cellH !== 0) &&
        natW % 30 === 0 &&
        natH % 10 === 0
      ) {
        const nextCellW = natW / 30;
        const nextCellH = natH / 10;
        anchorX = Math.round(anchorX * (nextCellW / cellW));
        anchorY = Math.round(anchorY * (nextCellH / cellH));
        cellW = nextCellW;
        cellH = nextCellH;
      }

      const cols = Math.max(1, Math.round(natW / cellW));
      const rows = Math.max(1, Math.round(natH / cellH));
      const anim = this.getAnimRowAndCol();
      const row = clampNum(anim.row, 0, rows - 1);
      const col = clampNum(anim.col, 0, cols - 1);
      const sx = col * cellW;
      const sy = row * cellH;

      const drawW = Math.round(cellW * scale);
      const drawH = Math.round(cellH * scale);
      const footRatio = cellH > 0 ? anchorY / cellH : 230 / 240;
      const baseX = Math.round(-anchorX * scale);
      const baseY = Math.round(-drawH * footRatio);

      if (!isReflection && this.state === 'DASH') {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = prevAlpha * 0.34;
        ctx.drawImage(sheet, sx, sy, cellW, cellH, baseX - 18, baseY, drawW, drawH);
        ctx.globalAlpha = prevAlpha;
      }

      ctx.drawImage(sheet, sx, sy, cellW, cellH, baseX, baseY, drawW, drawH);
    } else if (!isReflection && typeof ctx.fillRect === 'function') {
      this._drawSilhouetteFallback(ctx, scale);
    }

    ctx.restore();

    if (!isReflection) {
      this._drawRoleOverheadUI(ctx);
    }
  }
}

export class EndlessCompanions {
  constructor(endlessManager = null) {
    this.manager = endlessManager || null;
    this.rosterState = {};
    this.activeSlots = [];
    this.entities = [];
    this.activeBuffTimers = { shieldTimer: 0, hasteTimer: 0 };
    this._floorRipples = [];
    this._time = 0;
    this.reset();
  }

  reset() {
    this.rosterState = {};
    for (const cfg of ENDLESS_COMPANION_ROSTER) {
      this.rosterState[cfg.id] = { unlocked: false, level: 0 };
    }
    this.activeSlots = [];
    this.entities = [];
    this.activeBuffTimers = { shieldTimer: 0, hasteTimer: 0 };
    this._floorRipples = [];
    this._time = 0;
  }

  _getDiscountMult(economy) {
    const raw =
      typeof economy?.getCostDiscountMult === 'function' ? economy.getCostDiscountMult() : 1;
    return clampNum(Number(raw) || 1, 0.1, 1);
  }

  getRecruitCost(id, economy = null) {
    const cfg = ROSTER_BY_ID[id];
    if (!cfg) return Infinity;
    const discount = this._getDiscountMult(economy);
    return Math.max(1, Math.round(cfg.recruitCost * discount));
  }

  getUpgradeCost(id, economy = null) {
    const cfg = ROSTER_BY_ID[id];
    if (!cfg) return Infinity;
    const st = this.rosterState[id];
    const currentLv = Math.max(1, Math.floor(Number(st?.level) || 1));
    const discount = this._getDiscountMult(economy);
    return Math.max(
      1,
      Math.round(cfg.upgradeBaseCost * Math.pow(cfg.costGrowth, currentLv - 1) * discount)
    );
  }

  computeCompanionPower(id, level = 1, economy = null) {
    const cfg = ROSTER_BY_ID[id];
    if (!cfg) {
      return { attackDmg: 0, skillDmg: 0, healAmount: 0, dpsEstimate: 0 };
    }
    const lv = Math.max(1, Math.floor(Number(level) || 1));
    const stats = typeof economy?.getComputedStats === 'function' ? economy.getComputedStats() : null;
    const compMult = Math.max(0.1, Number(stats?.companionDmgMult) || 1);

    const milestoneMult = Math.pow(1.45, Math.floor(lv / 10));
    const levelScale = Math.pow(1.16, lv - 1) * (1 + (lv - 1) * 0.12) * milestoneMult;
    const scaledBaseDps = cfg.baseDps * levelScale * compMult;

    const attackDmg = Math.max(1, Math.round(scaledBaseDps * cfg.attackInterval));
    const roleSkillMult = SKILL_DAMAGE_MULTIPLIER_BY_ROLE[cfg.role] || 2.5;
    const skillDmg = Math.max(2, Math.round(attackDmg * roleSkillMult));

    const healAmount =
      cfg.role === 'HEALER'
        ? Math.max(
            45,
            Math.round((75 + (lv - 1) * 28) * Math.pow(1.10, Math.min(40, lv - 1)) * compMult)
          )
        : 0;

    const autoDps = attackDmg / Math.max(0.25, cfg.attackInterval);
    const skillDps = skillDmg / Math.max(1.5, cfg.skillCooldown);
    const dpsEstimate = Math.max(1, Math.round(autoDps + skillDps));

    return { attackDmg, skillDmg, healAmount, dpsEstimate };
  }

  getRosterView(economy = null) {
    const gold = Number.isFinite(economy?.gold) ? economy.gold : 0;
    return ENDLESS_COMPANION_ROSTER.map((cfg) => {
      const st = this.rosterState[cfg.id] || { unlocked: false, level: 0 };
      const unlocked = Boolean(st.unlocked);
      const level = unlocked ? Math.max(1, Math.floor(Number(st.level) || 1)) : 0;
      const activeSlotIndex = this.activeSlots.indexOf(cfg.id);
      const deployed = activeSlotIndex !== -1;
      const recruitCost = this.getRecruitCost(cfg.id, economy);
      const upgradeCost = this.getUpgradeCost(cfg.id, economy);
      const power = this.computeCompanionPower(cfg.id, Math.max(1, level), economy);
      return {
        id: cfg.id,
        heroKey: cfg.heroKey,
        name: cfg.name,
        role: cfg.role,
        accentHex: cfg.accentHex,
        abilityName: cfg.abilityName,
        desc: cfg.desc,
        unlocked,
        level,
        deployed,
        activeSlotIndex,
        recruitCost,
        canAffordRecruit: !unlocked && gold >= recruitCost,
        upgradeCost,
        canAffordUpgrade: unlocked && gold >= upgradeCost,
        dpsEstimate: power.dpsEstimate
      };
    });
  }

  recruit(id, economy = null) {
    const cfg = ROSTER_BY_ID[id];
    if (!cfg) {
      return { ok: false, spent: 0, autoDeployed: false, reason: 'UNKNOWN_COMPANION' };
    }
    const st = this.rosterState[id] || (this.rosterState[id] = { unlocked: false, level: 0 });
    if (st.unlocked) {
      return { ok: false, spent: 0, autoDeployed: false, reason: 'ALREADY_UNLOCKED' };
    }

    const cost = this.getRecruitCost(id, economy);
    if (economy && typeof economy.spendGold === 'function') {
      if (!economy.spendGold(cost)) {
        return { ok: false, spent: 0, autoDeployed: false, reason: 'INSUFFICIENT_GOLD' };
      }
    }

    st.unlocked = true;
    st.level = 1;

    let autoDeployed = false;
    if (this.activeSlots.length < ENDLESS_MAX_ACTIVE_SLOTS && !this.activeSlots.includes(id)) {
      this.activeSlots.push(id);
      autoDeployed = true;
    }

    safeEnsureHeroLoaded(cfg.heroKey);
    if (autoDeployed && this.manager?.player) {
      this.syncEntitiesWithWorld(this.manager.player);
    }

    return { ok: true, spent: cost, autoDeployed };
  }

  upgrade(id, economy = null) {
    const cfg = ROSTER_BY_ID[id];
    if (!cfg) {
      return { ok: false, spent: 0, newLevel: 0, reason: 'UNKNOWN_COMPANION' };
    }
    const st = this.rosterState[id];
    if (!st || !st.unlocked) {
      return { ok: false, spent: 0, newLevel: 0, reason: 'NOT_UNLOCKED' };
    }

    const cost = this.getUpgradeCost(id, economy);
    if (economy && typeof economy.spendGold === 'function') {
      if (!economy.spendGold(cost)) {
        return { ok: false, spent: 0, newLevel: st.level, reason: 'INSUFFICIENT_GOLD' };
      }
    }

    st.level = Math.max(1, Math.floor(Number(st.level) || 1)) + 1;
    const entity = this.entities.find((e) => e.companionId === id);
    if (entity) {
      entity.level = st.level;
      entity.triggerAuraRing('buff', 0.95);
      entity.triggerCallout(`LV.${st.level}`, '#facc15', 0.9);
    }

    return { ok: true, spent: cost, newLevel: st.level };
  }

  toggleDeploy(id) {
    const cfg = ROSTER_BY_ID[id];
    if (!cfg) {
      return {
        ok: false,
        deployed: false,
        activeSlots: [...this.activeSlots],
        reason: 'UNKNOWN_COMPANION'
      };
    }
    const st = this.rosterState[id];
    if (!st || !st.unlocked) {
      return {
        ok: false,
        deployed: false,
        activeSlots: [...this.activeSlots],
        reason: 'NOT_UNLOCKED'
      };
    }

    const idx = this.activeSlots.indexOf(id);
    if (idx !== -1) {
      this.activeSlots.splice(idx, 1);
      if (this.manager?.player) {
        this.syncEntitiesWithWorld(this.manager.player);
      } else {
        this.entities = this.entities.filter((e) => e.companionId !== id);
      }
      return { ok: true, deployed: false, activeSlots: [...this.activeSlots] };
    }

    if (this.activeSlots.length >= ENDLESS_MAX_ACTIVE_SLOTS) {
      return {
        ok: false,
        deployed: false,
        activeSlots: [...this.activeSlots],
        reason: 'SLOTS_FULL'
      };
    }

    this.activeSlots.push(id);
    safeEnsureHeroLoaded(cfg.heroKey);
    if (this.manager?.player) {
      this.syncEntitiesWithWorld(this.manager.player);
    }

    return { ok: true, deployed: true, activeSlots: [...this.activeSlots] };
  }

  syncEntitiesWithWorld(player = null) {
    const existingById = new Map();
    for (const ent of this.entities) {
      existingById.set(ent.companionId, ent);
    }

    const px = Number.isFinite(player?.x) ? player.x : 360;
    const pFacing = (player?.facing || 1) < 0 ? -1 : 1;
    const bounds = this.manager?.getActiveStageBounds?.() || null;

    const nextEntities = [];
    for (let i = 0; i < this.activeSlots.length; i++) {
      const id = this.activeSlots[i];
      const cfg = ROSTER_BY_ID[id];
      const st = this.rosterState[id];
      if (!cfg || !st?.unlocked) continue;

      const level = Math.max(1, Math.floor(Number(st.level) || 1));
      let ent = existingById.get(id);
      if (ent) {
        ent.level = level;
        ent.slotIndex = i;
        nextEntities.push(ent);
      } else {
        const offsetX = SPAWN_X_OFFSETS[i % SPAWN_X_OFFSETS.length];
        let spawnX = px + offsetX * pFacing;
        if (bounds && Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX)) {
          spawnX = clampNum(spawnX, bounds.minX + 36, bounds.maxX - 36);
        }
        const spawnY = clampNum(SPAWN_LANE_Y[i % SPAWN_LANE_Y.length], 475, 645);
        ent = new EndlessCompanionEntity(cfg, {
          x: spawnX,
          groundY: spawnY,
          facing: pFacing,
          level,
          slotIndex: i
        });
        ent.triggerAuraRing('summon', 1.35);
        safeEnsureHeroLoaded(cfg.heroKey);
        nextEntities.push(ent);
      }
    }

    this.entities = nextEntities;
    return this.entities;
  }

  getActiveEntities() {
    return this.entities;
  }

  getActiveHeroKeys() {
    const keys = [];
    for (const id of this.activeSlots) {
      const cfg = ROSTER_BY_ID[id];
      if (cfg) keys.push(cfg.heroKey);
    }
    return keys;
  }

  getPartyBuffs() {
    return {
      damageReduction: this.activeBuffTimers.shieldTimer > 0 ? 0.16 : 0,
      hasteBonus: this.activeBuffTimers.hasteTimer > 0 ? 0.20 : 0
    };
  }

  _spawnFloorRipple(x, y, kind = 'buff', maxAge = 0.72, scaleMult = 1.0) {
    this._floorRipples.push({
      x: Math.round(x),
      y: Math.round(y),
      kind,
      age: 0,
      maxAge: Math.max(0.25, maxAge),
      scaleMult
    });
    if (this._floorRipples.length > 24) {
      this._floorRipples.shift();
    }
  }

  _spawnStrikeFX(entity, kind, x, y, color, facing = 1, maxAge = 0.26, scale = 1) {
    entity.activeStrikes.push({
      kind,
      x: Math.round(x),
      y: Math.round(y),
      color: color || entity.primaryColor,
      facing: facing < 0 ? -1 : 1,
      age: 0,
      maxAge,
      scale
    });
    if (entity.activeStrikes.length > 16) {
      entity.activeStrikes.shift();
    }
  }

  _spawnProjectile(entity, target, dmg, isCrit, opts = {}) {
    const startX = entity.x + entity.facing * 28;
    const startY = entity.y - 76;
    const targetX = Number.isFinite(target?.x) ? target.x : startX + entity.facing * 260;
    const targetY = (Number.isFinite(target?.groundY) ? target.groundY : entity.groundY) - 68;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = opts.speed || 760;

    entity.activeProjectiles.push({
      x: startX,
      y: startY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      target,
      dmg: Math.max(1, Math.round(dmg)),
      isCrit: Boolean(isCrit),
      knockX: opts.knockX ?? 42,
      color: opts.color || entity.primaryColor,
      coreColor: opts.coreColor || '#ffffff',
      style: opts.style || 'bolt',
      splashRadius: opts.splashRadius || 0,
      life: 0,
      maxLife: opts.maxLife || 0.85
    });
    if (entity.activeProjectiles.length > 24) {
      entity.activeProjectiles.shift();
    }
  }

  _applyCompanionDamage(entity, target, rawDmg, isCrit, knockX, economy, game) {
    if (!target || target.isDead) return 0;
    if (Number.isFinite(target.hp) && target.hp <= 0) return 0;

    const dmg = Math.max(1, Math.round(rawDmg));
    const prevHp = Number.isFinite(target.hp) ? target.hp : dmg;

    // Real Monster.takeDamage delegates to EndlessManager.progression.onPlayerHitMonster
    // which records the companion damage sample itself. Detect that path cleanly to avoid 2x DPS stats.
    const willProgRecord = Boolean(
      typeof target.takeDamage === 'function' &&
        typeof target.spawnElementalDeathBurst === 'function' &&
        target.game?.isAdventureMode?.() &&
        typeof target.game?.adventure?.progression?.onPlayerHitMonster === 'function'
    );

    if (typeof target.takeDamage === 'function') {
      target.takeDamage(dmg, entity, Boolean(isCrit), knockX, 0);
    } else {
      target.hp = Math.max(0, prevHp - dmg);
      if (target.hp <= 0) {
        target.isDead = true;
      }
    }

    let dealt = Number.isFinite(target.hp) ? Math.max(0, prevHp - target.hp) : dmg;
    if (dealt <= 0 && prevHp > 0 && target.hp === prevHp) {
      dealt = dmg;
    }

    if (dealt > 0) {
      if (!willProgRecord) {
        economy?.recordDamageSample?.('companion', dealt);
        entity.ultCharge = Math.min(100, entity.ultCharge + (isCrit ? 4.5 : 2.5));
        entity.stats.damageDealt += dealt;
        if (isCrit) entity.stats.critsLanded += 1;
        if (dealt > entity.stats.biggestHit) entity.stats.biggestHit = dealt;
      }
      if (!willProgRecord && game?.vfx?.spawnDamageText) {
        game.vfx.spawnDamageText(
          target.x,
          (target.y || target.groundY || entity.groundY) - 148,
          dealt,
          Boolean(isCrit)
        );
      }
    }

    return dealt;
  }

  _isBossTarget(monster) {
    return Boolean(monster && (monster.isBoss || monster.isMiniBoss || monster.isColossalBoss));
  }

  _scaleHit(baseDmg, target, stats, forceCrit = false) {
    const feverMult = Math.max(1, Number(stats?.feverDmgMult) || 1);
    const bossMult = this._isBossTarget(target) ? Math.max(1, Number(stats?.bossDmgMult) || 1) : 1;
    const critChance = clampNum(Number(stats?.critChance) || 0.08, 0, 0.85);
    const critMult = Math.max(1.25, Number(stats?.critMult) || 1.5);
    const isCrit = forceCrit || Math.random() < critChance;
    const total = Math.max(1, Math.round(baseDmg * feverMult * bossMult * (isCrit ? critMult : 1)));
    return { dmg: total, isCrit };
  }

  _findTarget(entity, player, aliveMonsters) {
    if (!aliveMonsters.length) return null;
    const refX = Number.isFinite(player?.x) ? player.x : entity.x;
    let best = null;
    let bestScore = Infinity;

    for (const m of aliveMonsters) {
      const mx = Number.isFinite(m.x) ? m.x : refX;
      const my = Number.isFinite(m.groundY) ? m.groundY : Number.isFinite(m.y) ? m.y : 561;
      const dxComp = Math.abs(mx - entity.x);
      const dxPlayer = Math.abs(mx - refX);
      if (dxComp > COMPANION_ENGAGE_RANGE && dxPlayer > COMPANION_ENGAGE_RANGE) continue;
      const dy = Math.abs(my - entity.groundY);
      const score = dxComp + dy * 0.45 - (this._isBossTarget(m) ? 35 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }

    return best;
  }

  _executeRoleSkill(entity, player, target, aliveMonsters, power, stats, economy, game) {
    const role = entity.role;
    const tx = Number.isFinite(target?.x) ? target.x : entity.x + entity.facing * 140;
    const ty = Number.isFinite(target?.groundY) ? target.groundY : entity.groundY;

    entity.ultCharge = Math.min(100, entity.ultCharge + 14);
    entity.triggerCallout(entity.cfg.abilityName, entity.primaryColor, 1.15);

    if (role === 'TANK') {
      // Aethelgard: AEGIS BASTION — party shield + nearby monster taunt & bastion shockwave
      this.activeBuffTimers.shieldTimer = Math.max(this.activeBuffTimers.shieldTimer, 5.5);
      entity.triggerAuraRing('buff', 1.45);
      if (player) {
        this._spawnFloorRipple(player.x, player.groundY || 561, 'buff', 1.15, 1.12);
      }
      this._spawnStrikeFX(entity, 'shockwave', entity.x, entity.groundY - 12, '#38bdf8', entity.facing, 0.34, 1.25);

      for (const m of aliveMonsters) {
        const dx = Math.abs((m.x || 0) - entity.x);
        const dy = Math.abs((m.groundY || m.y || 561) - entity.groundY);
        if (dx <= 270 && dy <= 145) {
          m._tauntedTimer = Math.max(m._tauntedTimer || 0, 3.5);
          m._tauntTarget = entity;
          if (!m.isColossalBoss && Math.abs((m.x || 0) - entity.x) > 12) {
            m.facing = entity.x >= m.x ? 1 : -1;
          }
          const hit = this._scaleHit(power.skillDmg * 0.85, m, stats, false);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 55, economy, game);
          if (typeof m.addStagger === 'function') {
            m.addStagger(22, entity, game);
          }
        }
      }
      return;
    }

    if (role === 'HEALER') {
      // Seraphina: SERAPHIC MEND — restores hero HP + radiant smite burst
      entity.triggerAuraRing('heal', 1.5);
      if (player && !player.isDead && Number.isFinite(player.hp) && Number.isFinite(player.maxHp)) {
        const pctFloor = Math.round(player.maxHp * 0.14);
        const healAmt = Math.max(power.healAmount, pctFloor);
        const before = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        const actualHeal = Math.max(0, Math.round(player.hp - before));
        this._spawnFloorRipple(player.x, player.groundY || 561, 'heal', 1.25, 1.18);
        if (actualHeal > 0 && game?.vfx?.spawnDamageText) {
          game.vfx.spawnDamageText(
            player.x,
            (player.y || player.groundY || 561) - 178,
            0,
            false,
            `+${actualHeal} MEND`,
            '#4ade80'
          );
        }
      }
      if (target) {
        const hit = this._scaleHit(power.skillDmg, target, stats, false);
        this._spawnStrikeFX(entity, 'pillar', tx, ty, '#fde047', entity.facing, 0.34, 1.1);
        this._applyCompanionDamage(entity, target, hit.dmg, hit.isCrit, 48, economy, game);
      }
      return;
    }

    if (role === 'BLASTER') {
      // Ignis Sol: SOLAR FLARE — scorching AoE flame burst across monster pack
      entity.triggerAuraRing('buff', 1.15);
      this._spawnFloorRipple(tx, ty, 'buff', 0.8, 1.25);
      this._spawnStrikeFX(entity, 'pillar', tx, ty, '#fb923c', entity.facing, 0.38, 1.35);
      this._spawnStrikeFX(entity, 'burst', tx, ty - 68, '#fde047', entity.facing, 0.32, 1.3);

      let hitCount = 0;
      for (const m of aliveMonsters) {
        if (hitCount >= 6) break;
        const dx = Math.abs((m.x || 0) - tx);
        const dy = Math.abs((m.groundY || m.y || 561) - ty);
        if (m === target || (dx <= 215 && dy <= 130)) {
          const splashMult = m === target ? 1.0 : 0.82;
          const hit = this._scaleHit(power.skillDmg * splashMult, m, stats, false);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 72, economy, game);
          hitCount++;
        }
      }
      return;
    }

    if (role === 'ARCHER') {
      // Sylvanis: STARFALL VOLLEY — 3-bolt piercing salvo across up to 3 targets
      entity.triggerAuraRing('buff', 1.05);
      const sortedTargets = [...aliveMonsters].sort((a, b) => {
        const da = Math.abs((a.x || 0) - entity.x);
        const db = Math.abs((b.x || 0) - entity.x);
        return da - db;
      });
      const salvoTargets = sortedTargets.length > 0 ? sortedTargets : target ? [target] : [];
      if (salvoTargets.length > 0) {
        for (let i = 0; i < 3; i++) {
          const tMon = salvoTargets[i % salvoTargets.length];
          const hit = this._scaleHit(power.skillDmg * 0.46, tMon, stats, i === 2);
          this._spawnProjectile(entity, tMon, hit.dmg, hit.isCrit, {
            speed: 880 + i * 55,
            color: '#34d399',
            coreColor: '#fef08a',
            style: 'arrow',
            knockX: 38
          });
        }
      }
      return;
    }

    if (role === 'LANCER') {
      // Freyja: VALKYRIE DIVE — lunging sky-lance thrust with heavy boss stagger
      entity.triggerAuraRing('buff', 1.15);
      if (target) {
        const lungeDist = clampNum((tx - entity.x) * 0.45, -110, 110);
        entity.x += lungeDist;
        entity.groundY = clampNum(entity.groundY + (ty - entity.groundY) * 0.5, 465, 655);
        entity.y = entity.groundY;
        const hit = this._scaleHit(power.skillDmg, target, stats, false);
        this._spawnStrikeFX(entity, 'slash', tx, ty - 76, '#facc15', entity.facing, 0.32, 1.35);
        this._spawnStrikeFX(entity, 'shockwave', tx, ty - 8, '#fde047', entity.facing, 0.30, 1.15);
        this._applyCompanionDamage(entity, target, hit.dmg, hit.isCrit, 110, economy, game);
        if (typeof target.addStagger === 'function') {
          target.addStagger(55, entity, game);
        } else if (!this._isBossTarget(target)) {
          target.stunTimer = Math.max(target.stunTimer || 0, 0.45);
        }
      }
      return;
    }

    if (role === 'STRIKER') {
      // Kaze-Maru: IAIDO FLASH — guaranteed-crit rapid 3-slash single-target shredder
      entity.triggerAuraRing('buff', 1.05);
      if (target) {
        const dashDx = clampNum((tx - entity.x) * 0.55, -135, 135);
        entity.x += dashDx;
        entity.groundY = clampNum(ty, 465, 655);
        entity.y = entity.groundY;
        for (let s = 0; s < 3; s++) {
          const hit = this._scaleHit(power.skillDmg * 0.42, target, stats, true);
          this._spawnStrikeFX(
            entity,
            'slash',
            tx + (s - 1) * 18,
            ty - 88 + s * 14,
            s === 1 ? '#fde047' : '#22d3ee',
            s % 2 === 0 ? entity.facing : -entity.facing,
            0.28 + s * 0.05,
            1.2
          );
          this._applyCompanionDamage(entity, target, hit.dmg, true, s === 2 ? 90 : 28, economy, game);
        }
      }
      return;
    }

    if (role === 'WEAVER') {
      // Chronos: CHRONO HASTE — temporal slow field on monsters + party haste acceleration
      this.activeBuffTimers.hasteTimer = Math.max(this.activeBuffTimers.hasteTimer, 6.0);
      entity.triggerAuraRing('buff', 1.45);
      if (player) {
        this._spawnFloorRipple(player.x, player.groundY || 561, 'buff', 1.2, 1.15);
      }
      this._spawnFloorRipple(tx, ty, 'summon', 1.1, 1.35);

      for (const m of aliveMonsters) {
        const dx = Math.abs((m.x || 0) - entity.x);
        if (dx <= 440) {
          m._chillTimer = Math.max(m._chillTimer || 0, 4.5);
          const hit = this._scaleHit(power.skillDmg * 0.72, m, stats, false);
          this._spawnStrikeFX(entity, 'burst', m.x || tx, (m.groundY || ty) - 74, '#c084fc', entity.facing, 0.28, 0.95);
          this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 35, economy, game);
        }
      }
      return;
    }

    // BRAWLER (Raijin EX): THUNDER BARRAGE — lightning-fist shockwave barrage
    entity.triggerAuraRing('buff', 1.2);
    this._spawnStrikeFX(entity, 'pillar', tx, ty, '#fbbf24', entity.facing, 0.34, 1.25);
    this._spawnStrikeFX(entity, 'shockwave', entity.x + entity.facing * 42, entity.groundY - 10, '#38bdf8', entity.facing, 0.34, 1.35);
    for (const m of aliveMonsters) {
      const dx = Math.abs((m.x || 0) - tx);
      const dy = Math.abs((m.groundY || m.y || 561) - ty);
      if (m === target || (dx <= 200 && dy <= 125)) {
        const hit = this._scaleHit(power.skillDmg * (m === target ? 1.0 : 0.78), m, stats, false);
        this._applyCompanionDamage(entity, m, hit.dmg, hit.isCrit, 88, economy, game);
        if (typeof m.addStagger === 'function') {
          m.addStagger(36, entity, game);
        }
      }
    }
  }

  _updateProjectilesAndStrikes(entity, safeDt, aliveMonsters, economy, game) {
    for (let i = entity.activeStrikes.length - 1; i >= 0; i--) {
      const st = entity.activeStrikes[i];
      st.age += safeDt;
      if (st.age >= st.maxAge) {
        entity.activeStrikes.splice(i, 1);
      }
    }

    for (let i = entity.activeProjectiles.length - 1; i >= 0; i--) {
      const p = entity.activeProjectiles[i];
      p.life += safeDt;
      p.x += p.vx * safeDt;
      p.y += p.vy * safeDt;

      let hitMonster = null;
      if (p.target && !p.target.isDead && !(Number.isFinite(p.target.hp) && p.target.hp <= 0)) {
        const ty = (Number.isFinite(p.target.groundY) ? p.target.groundY : entity.groundY) - 68;
        if (Math.hypot(p.x - p.target.x, p.y - ty) <= 52) {
          hitMonster = p.target;
        }
      }
      if (!hitMonster) {
        for (const m of aliveMonsters) {
          const ty = (Number.isFinite(m.groundY) ? m.groundY : entity.groundY) - 68;
          if (Math.hypot(p.x - m.x, p.y - ty) <= 44) {
            hitMonster = m;
            break;
          }
        }
      }

      if (hitMonster) {
        this._applyCompanionDamage(entity, hitMonster, p.dmg, p.isCrit, p.knockX, economy, game);
        this._spawnStrikeFX(
          entity,
          'burst',
          hitMonster.x,
          (hitMonster.groundY || entity.groundY) - 70,
          p.color,
          p.vx < 0 ? -1 : 1,
          0.22,
          p.isCrit ? 1.15 : 0.85
        );
        entity.activeProjectiles.splice(i, 1);
        continue;
      }

      if (p.life >= p.maxLife) {
        entity.activeProjectiles.splice(i, 1);
      }
    }
  }

  update(dt, player = null, monsters = [], economy = null, game = null) {
    const safeDt = clampNum(Number(dt) || 0, 0, 0.1);
    this._time += safeDt;

    this.activeBuffTimers.shieldTimer = Math.max(0, this.activeBuffTimers.shieldTimer - safeDt);
    this.activeBuffTimers.hasteTimer = Math.max(0, this.activeBuffTimers.hasteTimer - safeDt);

    for (let i = this._floorRipples.length - 1; i >= 0; i--) {
      this._floorRipples[i].age += safeDt;
      if (this._floorRipples[i].age >= this._floorRipples[i].maxAge) {
        this._floorRipples.splice(i, 1);
      }
    }

    // Keep live entities aligned with activeSlots automatically
    if (
      this.entities.length !== this.activeSlots.length ||
      this.entities.some((e, idx) => e.companionId !== this.activeSlots[idx])
    ) {
      this.syncEntitiesWithWorld(player);
    }

    if (this.entities.length === 0) return;

    const aliveMonsters = Array.isArray(monsters)
      ? monsters.filter((m) => m && !m.isDead && !(Number.isFinite(m.hp) && m.hp <= 0))
      : [];

    const stats = typeof economy?.getComputedStats === 'function' ? economy.getComputedStats() : null;
    const hasteMult = Math.max(
      0.5,
      (Number(stats?.hasteMult) || 1) + (this.activeBuffTimers.hasteTimer > 0 ? 0.20 : 0)
    );
    const moveBoost = Math.max(0.8, Number(stats?.moveSpeedMult) || 1);
    const bounds = this.manager?.getActiveStageBounds?.() || null;
    const minLaneY = Math.max(475, (this.manager?.depthMinY || 442) + 33);
    const maxLaneY = Math.min(645, (this.manager?.depthMaxY || 680) - 35);

    const px = Number.isFinite(player?.x) ? player.x : 360;
    const py = clampNum(Number.isFinite(player?.groundY) ? player.groundY : 561, minLaneY, maxLaneY);
    const pFacing = (player?.facing || 1) < 0 ? -1 : 1;

    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      const st = this.rosterState[ent.companionId];
      if (st?.unlocked) {
        ent.level = Math.max(1, Math.floor(Number(st.level) || 1));
      }

      ent.stateTimer += safeDt;
      ent.attackCooldown = Math.max(0, ent.attackCooldown - safeDt * hasteMult);
      ent.skillCooldown = Math.max(0, ent.skillCooldown - safeDt * hasteMult);
      ent.auraRingTimer = Math.max(0, ent.auraRingTimer - safeDt);
      ent.hitFlash = Math.max(0, ent.hitFlash - safeDt);
      ent.calloutTimer = Math.max(0, ent.calloutTimer - safeDt);

      this._updateProjectilesAndStrikes(ent, safeDt, aliveMonsters, economy, game);

      // Tidy role-aware 2.5D formation slot around the hero
      const roleOffsetX =
        ent.role === 'TANK'
          ? 56
          : ent.isRanged
            ? -(98 + i * 20)
            : -(54 + i * 24);
      const formX = px + roleOffsetX * pFacing;
      const formY = clampNum(
        py + FORMATION_LANE_OFFSETS[i % FORMATION_LANE_OFFSETS.length],
        minLaneY,
        maxLaneY
      );

      const distToPlayerX = Math.abs(px - ent.x);
      if (distToPlayerX > 960) {
        ent.x = formX;
        ent.groundY = formY;
        ent.y = formY;
        ent.facing = pFacing;
        ent.setState('IDLE');
        ent.triggerAuraRing('summon', 1.0);
        continue;
      }

      const target = this._findTarget(ent, player, aliveMonsters);
      ent.targetMonster = target;

      // Rapid catch-up sprint whenever player surges far ahead
      if (distToPlayerX > 380 && ent.state !== 'SKILL') {
        ent.setState('DASH');
      }

      if (ent.state === 'DASH') {
        const dx = formX - ent.x;
        const dy = formY - ent.groundY;
        const dist = Math.hypot(dx, dy);
        if (dist <= 36 || ent.stateTimer >= ent.dashDuration) {
          ent.setState('IDLE');
        } else {
          const dashSpeed = 480 * moveBoost;
          ent.x += (dx / dist) * dashSpeed * safeDt;
          ent.groundY = clampNum(ent.groundY + (dy / dist) * (dashSpeed * 0.55) * safeDt, minLaneY, maxLaneY);
          ent.facing = dx < -4 ? -1 : 1;
          ent.animFrame = (ent.animFrame + safeDt * 30) % 30;
        }
      } else if (ent.state === 'SKILL') {
        if (target && Math.abs((target.x || 0) - ent.x) > 4) {
          ent.facing = target.x >= ent.x ? 1 : -1;
        }
        if (!ent.didSkillHit && ent.stateTimer >= ent.skillDuration * 0.40) {
          ent.didSkillHit = true;
          const power = this.computeCompanionPower(ent.companionId, ent.level, economy);
          this._executeRoleSkill(ent, player, target, aliveMonsters, power, stats, economy, game);
        }
        if (ent.stateTimer >= ent.skillDuration) {
          ent.skillCooldown = ent.skillMaxCooldown;
          ent.setState('IDLE');
        }
      } else if (ent.state === 'AUTO_ATTACK') {
        if (target && Math.abs((target.x || 0) - ent.x) > 4) {
          ent.facing = target.x >= ent.x ? 1 : -1;
        }
        if (!ent.didActionHit && ent.stateTimer >= ent.autoDuration * 0.42) {
          ent.didActionHit = true;
          if (target) {
            const power = this.computeCompanionPower(ent.companionId, ent.level, economy);
            const hit = this._scaleHit(power.attackDmg, target, stats, false);
            const distToTarget = Math.abs((target.x || 0) - ent.x);
            if (ent.isRanged && distToTarget > 95) {
              this._spawnProjectile(ent, target, hit.dmg, hit.isCrit, {
                speed: ent.role === 'ARCHER' ? 860 : 740,
                color: ent.primaryColor,
                coreColor: '#ffffff',
                style: ent.role === 'ARCHER' ? 'arrow' : 'bolt',
                knockX: 36
              });
            } else {
              this._applyCompanionDamage(ent, target, hit.dmg, hit.isCrit, 48, economy, game);
              this._spawnStrikeFX(
                ent,
                ent.role === 'BRAWLER' ? 'burst' : 'slash',
                target.x,
                (target.groundY || ent.groundY) - 76,
                ent.primaryColor,
                ent.facing,
                0.24,
                hit.isCrit ? 1.15 : 0.9
              );
            }
          }
        }
        if (ent.stateTimer >= ent.autoDuration) {
          ent.attackCooldown = Math.max(0.16, ent.cfg.attackInterval - ent.autoDuration * 0.45);
          ent.setState('IDLE');
        }
      } else {
        // IDLE / WALK decision pass
        const playerNeedsHeal = Boolean(
          ent.role === 'HEALER' &&
            player &&
            !player.isDead &&
            Number.isFinite(player.hp) &&
            Number.isFinite(player.maxHp) &&
            player.hp < player.maxHp * 0.88
        );
        const targetDistX = target ? Math.abs((target.x || 0) - ent.x) : Infinity;
        const targetDistY = target
          ? Math.abs((Number.isFinite(target.groundY) ? target.groundY : py) - ent.groundY)
          : Infinity;
        const skillRange = Math.max(ent.attackRange + 55, 220);

        if (
          ent.skillCooldown <= 0 &&
          (playerNeedsHeal ||
            (target &&
              (targetDistX <= skillRange ||
                ((ent.role === 'TANK' || ent.role === 'WEAVER') && targetDistX <= 460))))
        ) {
          if (target && Math.abs((target.x || 0) - ent.x) > 4) {
            ent.facing = target.x >= ent.x ? 1 : -1;
          }
          ent.setState('SKILL');
        } else if (target) {
          const laneTol = ent.isRanged ? 120 : 54;
          if (targetDistX <= ent.attackRange && targetDistY <= laneTol) {
            if (Math.abs((target.x || 0) - ent.x) > 4) {
              ent.facing = target.x >= ent.x ? 1 : -1;
            }
            if (ent.attackCooldown <= 0) {
              ent.setState('AUTO_ATTACK');
            } else {
              ent.setState('IDLE');
              ent.animFrame = (ent.animFrame + safeDt * 12) % 30;
            }
          } else {
            const desiredStandX =
              target.x - Math.sign(target.x - ent.x || ent.facing || 1) * (ent.attackRange * 0.78);
            const desiredStandY = ent.isRanged
              ? formY
              : clampNum(Number.isFinite(target.groundY) ? target.groundY : formY, minLaneY, maxLaneY);
            const dx = desiredStandX - ent.x;
            const dy = desiredStandY - ent.groundY;
            const dist = Math.hypot(dx, dy) || 1;
            const walkSpd = (ent.isRanged ? 235 : 268) * moveBoost;
            ent.x += (dx / dist) * Math.min(dist, walkSpd * safeDt);
            ent.groundY = clampNum(
              ent.groundY + (dy / dist) * Math.min(Math.abs(dy), walkSpd * 0.62 * safeDt),
              minLaneY,
              maxLaneY
            );
            ent.facing = (target.x || 0) >= ent.x ? 1 : -1;
            ent.moveDir = dx * ent.facing >= 0 ? 1 : -1;
            ent.setState('WALK');
            ent.walkPhase += safeDt * 4.4;
            ent.animFrame = (ent.animFrame + safeDt * 24) % 30;
          }
        } else {
          // Follow tidy formation around player
          const dx = formX - ent.x;
          const dy = formY - ent.groundY;
          const dist = Math.hypot(dx, dy);
          if (dist > 14) {
            const followSpd = 255 * moveBoost;
            ent.x += (dx / dist) * Math.min(dist, followSpd * safeDt);
            ent.groundY = clampNum(
              ent.groundY + (dy / dist) * Math.min(Math.abs(dy), followSpd * 0.65 * safeDt),
              minLaneY,
              maxLaneY
            );
            ent.facing = Math.abs(dx) > 6 ? (dx > 0 ? 1 : -1) : pFacing;
            ent.moveDir = 1;
            ent.setState('WALK');
            ent.walkPhase += safeDt * 4.2;
            ent.animFrame = (ent.animFrame + safeDt * 24) % 30;
          } else {
            ent.facing = pFacing;
            ent.setState('IDLE');
            ent.animFrame = (ent.animFrame + safeDt * 11) % 30;
          }
        }
      }

      if (bounds && Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX)) {
        ent.x = clampNum(ent.x, bounds.minX + 28, bounds.maxX - 28);
      }
      ent.groundY = clampNum(ent.groundY, minLaneY, maxLaneY);
      ent.y = ent.groundY;
    }
  }

  _drawAuraRingInstance(ctx, vfxImg, hasVfx, cx, cy, kind, alpha, scaleMult, phaseTime) {
    const a = clampNum(alpha, 0, 1);
    if (a <= 0.02) return;

    if (hasVfx && typeof ctx.drawImage === 'function') {
      const colBase = kind === 'heal' ? 4 : kind === 'buff' ? 8 : 0;
      const frame = Math.floor(Math.max(0, phaseTime) * 10) % 4;
      const sx = (colBase + frame) * 128;
      const sy = 5 * 128;
      const drawW = Math.round(134 * scaleMult);
      const drawH = Math.round(92 * scaleMult);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = a;
      ctx.drawImage(
        vfxImg,
        sx,
        sy,
        128,
        128,
        Math.round(cx - drawW * 0.5),
        Math.round(cy - drawH * 0.52),
        drawW,
        drawH
      );
      ctx.restore();
      return;
    }

    const outerCol = kind === 'heal' ? '#34d399' : kind === 'buff' ? '#fb923c' : '#38bdf8';
    const innerCol = kind === 'heal' ? '#fef08a' : kind === 'buff' ? '#facc15' : '#bae6fd';
    drawSteppedPixelAuraRing(ctx, cx, cy, 48 * scaleMult, 16 * scaleMult, outerCol, innerCol, a);
  }

  renderFloorAuras(ctx, _renderer = null) {
    if (!ctx) return;
    const assets = getSafePixelForgeAssets();
    const rawVfx = assets?.endlessVfx || null;
    const vfxImg = rawVfx ? PixelForge.ensureImage?.(rawVfx) || rawVfx : null;
    const hasVfx = Boolean(
      vfxImg &&
        vfxImg.complete &&
        (vfxImg.naturalWidth || vfxImg.width) >= 1536 &&
        (vfxImg.naturalHeight || vfxImg.height) >= 768
    );

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const ent of this.entities) {
      if (ent.auraRingTimer > 0) {
        const fade = clampNum(ent.auraRingTimer / 0.35, 0, 1);
        const pulse = 0.94 + 0.08 * Math.sin(this._time * 9 + ent.slotIndex);
        this._drawAuraRingInstance(
          ctx,
          vfxImg,
          hasVfx,
          ent.x,
          ent.groundY + 2,
          ent.auraRingKind,
          0.82 * fade,
          pulse,
          this._time + ent.slotIndex * 0.25
        );
      } else if (ent.state === 'SKILL') {
        this._drawAuraRingInstance(
          ctx,
          vfxImg,
          hasVfx,
          ent.x,
          ent.groundY + 2,
          ent.role === 'HEALER' ? 'heal' : 'buff',
          0.62,
          1.05,
          this._time
        );
      } else if (this.activeBuffTimers.hasteTimer > 0) {
        this._drawAuraRingInstance(
          ctx,
          vfxImg,
          hasVfx,
          ent.x,
          ent.groundY + 2,
          'buff',
          0.26,
          0.86,
          this._time + ent.slotIndex * 0.2
        );
      }
    }

    for (const r of this._floorRipples) {
      const u = clampNum(r.age / r.maxAge, 0, 1);
      const fade = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
      const grow = r.scaleMult * (0.85 + u * 0.32);
      this._drawAuraRingInstance(ctx, vfxImg, hasVfx, r.x, r.y + 2, r.kind, 0.78 * fade, grow, r.age * 1.4);
    }

    ctx.restore();
  }

  renderForegroundFX(ctx, _renderer = null) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const ent of this.entities) {
      // 1. Crisp ranged pixel bolts & arrows (multi-pass dark selout -> accent -> white core)
      for (const p of ent.activeProjectiles) {
        const px = Math.round(p.x);
        const py = Math.round(p.y);
        const speed = Math.hypot(p.vx, p.vy) || 1;
        const nx = p.vx / speed;
        const ny = p.vy / speed;
        const tailLen = p.style === 'arrow' ? 28 : 22;

        // Pass 1: dark selout body & tail
        ctx.fillStyle = '#0d0f1c';
        for (let s = 0; s <= 4; s++) {
          const frac = s / 4;
          const bx = Math.round(px - nx * tailLen * frac);
          const by = Math.round(py - ny * tailLen * frac);
          const sz = Math.max(4, 10 - s * 2);
          ctx.fillRect(bx - Math.round(sz * 0.5) - 1, by - Math.round(sz * 0.5) - 1, sz + 2, sz + 2);
        }

        // Pass 2: colored energy streak
        ctx.fillStyle = p.color;
        for (let s = 0; s <= 4; s++) {
          const frac = s / 4;
          const bx = Math.round(px - nx * tailLen * frac);
          const by = Math.round(py - ny * tailLen * frac);
          const sz = Math.max(3, 8 - s * 1.5);
          const isz = Math.round(sz);
          ctx.fillRect(bx - Math.round(isz * 0.5), by - Math.round(isz * 0.5), isz, isz);
        }

        // Pass 3: incandescent white core + 4-pt pixel glint tip
        ctx.fillStyle = p.coreColor || '#ffffff';
        ctx.fillRect(px - 3, py - 3, 6, 6);
        ctx.fillRect(px - 7, py - 1, 14, 2);
        ctx.fillRect(px - 1, py - 7, 2, 14);
      }

      // 2. Crisp pixel melee slashes, starbursts, vertical pillars & ground shockwaves
      for (const st of ent.activeStrikes) {
        const u = clampNum(st.age / st.maxAge, 0, 1);
        const alpha = u < 0.25 ? 1 : clampNum(1 - (u - 0.25) / 0.75, 0, 1);
        if (alpha <= 0.03) continue;
        const sx = Math.round(st.x);
        const sy = Math.round(st.y);
        const sc = st.scale || 1;

        ctx.globalAlpha = alpha;

        if (st.kind === 'slash') {
          const steps = 7;
          const spanX = Math.round(32 * sc);
          const spanY = Math.round(28 * sc);
          // Separate full-geometry passes: dark selout -> accent -> white core
          ctx.fillStyle = '#0d0f1c';
          for (let k = -steps; k <= steps; k++) {
            const t = k / steps;
            const bx = sx + Math.round(t * spanX * st.facing);
            const by = sy + Math.round(t * spanY);
            ctx.fillRect(bx - 4, by - 4, 8, 8);
          }
          ctx.fillStyle = st.color;
          for (let k = -steps; k <= steps; k++) {
            const t = k / steps;
            const bx = sx + Math.round(t * spanX * st.facing);
            const by = sy + Math.round(t * spanY);
            ctx.fillRect(bx - 3, by - 3, 6, 6);
          }
          ctx.fillStyle = '#ffffff';
          for (let k = -steps + 1; k <= steps - 1; k++) {
            const t = k / steps;
            const bx = sx + Math.round(t * spanX * st.facing);
            const by = sy + Math.round(t * spanY);
            ctx.fillRect(bx - 1, by - 1, 3, 3);
          }
        } else if (st.kind === 'pillar') {
          const halfW = Math.max(6, Math.round((20 - u * 10) * sc));
          const beamH = Math.round(210 * sc);
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(sx - halfW - 2, sy - beamH, (halfW + 2) * 2, beamH);
          ctx.fillStyle = st.color;
          ctx.fillRect(sx - halfW, sy - beamH, halfW * 2, beamH);
          ctx.fillStyle = '#ffffff';
          const coreW = Math.max(4, Math.round(halfW * 0.45));
          ctx.fillRect(sx - coreW, sy - beamH, coreW * 2, beamH);
          drawPixelDiamond(ctx, sx, sy - Math.round(16 * sc), Math.round(18 * sc * (1 - u * 0.4)), '#fef08a');
        } else if (st.kind === 'shockwave') {
          const halfW = Math.round((26 + u * 78) * sc);
          ctx.fillStyle = '#0d0f1c';
          ctx.fillRect(sx - halfW - 2, sy - 4, (halfW + 2) * 2, 8);
          ctx.fillStyle = st.color;
          ctx.fillRect(sx - halfW, sy - 3, halfW * 2, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - Math.round(halfW * 0.55), sy - 1, Math.round(halfW * 1.1), 2);
        } else {
          // 4-point pixel diamond starburst
          const r = Math.round((10 + u * 16) * sc);
          drawPixelDiamond(ctx, sx, sy, r + 2, '#0d0f1c');
          drawPixelDiamond(ctx, sx, sy, r, st.color);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - Math.round(r * 1.3), sy - 1, Math.round(r * 2.6), 2);
          ctx.fillRect(sx - 1, sy - Math.round(r * 1.3), 2, Math.round(r * 2.6));
        }
      }
    }

    ctx.restore();
  }

  exportSnapshot() {
    const rosterState = {};
    for (const cfg of ENDLESS_COMPANION_ROSTER) {
      const st = this.rosterState[cfg.id] || { unlocked: false, level: 0 };
      rosterState[cfg.id] = {
        unlocked: Boolean(st.unlocked),
        level: st.unlocked ? Math.max(1, Math.floor(Number(st.level) || 1)) : 0
      };
    }
    return {
      rosterState,
      activeSlots: [...this.activeSlots]
    };
  }

  importSnapshot(snap) {
    this.reset();
    if (!snap || typeof snap !== 'object') return;

    const srcRoster = snap.rosterState && typeof snap.rosterState === 'object' ? snap.rosterState : {};
    for (const cfg of ENDLESS_COMPANION_ROSTER) {
      const entry = srcRoster[cfg.id];
      if (entry && entry.unlocked) {
        this.rosterState[cfg.id] = {
          unlocked: true,
          level: Math.max(1, Math.floor(Number(entry.level) || 1))
        };
      }
    }

    const srcSlots = Array.isArray(snap.activeSlots) ? snap.activeSlots : [];
    const seen = new Set();
    for (const id of srcSlots) {
      if (this.activeSlots.length >= ENDLESS_MAX_ACTIVE_SLOTS) break;
      if (typeof id !== 'string' || seen.has(id)) continue;
      if (!ROSTER_BY_ID[id] || !this.rosterState[id]?.unlocked) continue;
      seen.add(id);
      this.activeSlots.push(id);
      safeEnsureHeroLoaded(ROSTER_BY_ID[id].heroKey);
    }

    if (this.manager?.player) {
      this.syncEntitiesWithWorld(this.manager.player);
    }
  }
}
