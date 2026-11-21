// Endless Crusade Tactical Companion AI Brain
// Role-aware target splitting, flanking, ranged kiting, independent lanes,
// soft ally separation, role-sorted formations with facing hysteresis, and smart pursuit.
// Node-safe (zero browser globals), zero external dependencies, pure ASCII.

export const COMPANION_ENGAGE_SIGHTLINE = 1050;
export const COMPANION_KITE_THREAT_RADIUS = 135;
export const COMPANION_ALLY_SEPARATION_DIST = 56;
export const COMPANION_RUBBERBAND_DIST = 680;
export const COMPANION_EMERGENCY_TELEPORT_DIST = 1250;
export const COMPANION_COMBAT_HOLD_RANGE = 360;
export const COMPANION_TARGET_STICKY_SEC = 0.35;
export const COMPANION_FACING_HOLD_SEC = 0.45;
export const COMPANION_FACING_MOVE_DIST = 64;

const CLUMP_RADIUS_PX = 190;
const CLUMP_LANE_TOL_PX = 150;
const CORNER_MARGIN_PX = 70;
const DEFAULT_MIN_LANE_Y = 475;
const DEFAULT_MAX_LANE_Y = 645;
const LANE_INNER_PAD_Y = 18;

const RANGED_SAFE_DIST_BY_ROLE = Object.freeze({
  ARCHER: 185,
  BLASTER: 172,
  'CRYO MAGE': 172,
  WEAVER: 164,
  HEALER: 162,
  VANGUARD: 145
});

const RANGED_LANE_BIAS_BY_ROLE = Object.freeze({
  ARCHER: 0.16,
  HEALER: 0.24,
  VANGUARD: 0.38,
  WEAVER: 0.52,
  'CRYO MAGE': 0.76,
  BLASTER: 0.84
});

const FALLBACK_FORMATION_OFFSETS = Object.freeze([
  Object.freeze({ dx: 64, dy: -46 }),
  Object.freeze({ dx: -48, dy: 48 }),
  Object.freeze({ dx: -108, dy: -6 })
]);

function clampNum(v, lo, hi) {
  if (!Number.isFinite(v)) return lo;
  return v < lo ? lo : v > hi ? hi : v;
}

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

export function getRoleArchetype(role) {
  const key = normalizeRole(role);
  if (key === 'TANK' || key === 'BRAWLER') return 'TANK';
  if (key === 'ASSASSIN' || key === 'STRIKER' || key === 'LANCER' || key === 'REAPER') {
    return 'FLANKER';
  }
  if (
    key === 'HEALER' ||
    key === 'BLASTER' ||
    key === 'ARCHER' ||
    key === 'WEAVER' ||
    key === 'CRYO MAGE' ||
    key === 'VANGUARD'
  ) {
    return 'RANGED';
  }
  return 'FLANKER';
}

export function getRoleFormationPriority(role) {
  const key = normalizeRole(role);
  if (key === 'TANK') return 0;
  if (
    key === 'BRAWLER' ||
    key === 'ASSASSIN' ||
    key === 'STRIKER' ||
    key === 'LANCER' ||
    key === 'REAPER'
  ) {
    return 1;
  }
  if (key === 'VANGUARD') return 2;
  if (
    key === 'HEALER' ||
    key === 'BLASTER' ||
    key === 'ARCHER' ||
    key === 'WEAVER' ||
    key === 'CRYO MAGE'
  ) {
    return 3;
  }
  return 1;
}

export function getRangedBand(role, attackRange = 380) {
  const key = normalizeRole(role);
  const archetype = getRoleArchetype(key);
  const safeRange = Number.isFinite(Number(attackRange)) && Number(attackRange) > 0
    ? Number(attackRange)
    : archetype === 'RANGED'
      ? 380
      : 150;

  if (archetype !== 'RANGED') {
    return {
      minSafeDist: 0,
      preferredDist: Math.round(clampNum(safeRange * 0.72, 48, 160)),
      maxRange: safeRange,
      kiteRadius: 0
    };
  }

  const minSafeDist = RANGED_SAFE_DIST_BY_ROLE[key] || 162;
  const maxRange = Math.max(minSafeDist + 40, safeRange);
  const preferredDist = Math.round(
    clampNum(minSafeDist + (maxRange - minSafeDist) * 0.44, minSafeDist + 24, maxRange * 0.86)
  );
  return {
    minSafeDist,
    preferredDist,
    maxRange,
    kiteRadius: COMPANION_KITE_THREAT_RADIUS
  };
}

export function isTargetAlive(target) {
  if (!target || typeof target !== 'object') return false;
  if (target.isDead) return false;
  if (target.opened === true) return false;
  if (Number.isFinite(target.hp) && target.hp <= 0) return false;
  return true;
}

export function isTreasureGoblinTarget(target) {
  if (!target || typeof target !== 'object') return false;
  if (target.isTreasureGoblin) return true;
  if (target.kind === 'goblin' || target.id === 'treasure_goblin') return true;
  return typeof target.id === 'string' && target.id.startsWith('goblin_');
}

export function isTreasureChestTarget(target) {
  if (!target || typeof target !== 'object') return false;
  return Boolean(target.isTreasureChest || target.opened === false);
}

export function isBossTarget(target) {
  if (!target || typeof target !== 'object') return false;
  return Boolean(target.isColossalBoss || target.isBoss);
}

export function isEliteTarget(target) {
  if (!target || typeof target !== 'object') return false;
  return Boolean(target.isElite || target.isMiniBoss || target.isBoss || target.isColossalBoss);
}

function isActiveThreatTarget(target) {
  return isTargetAlive(target) && !isTreasureChestTarget(target);
}

function getEntityX(obj, fallback = 360) {
  return Number.isFinite(obj?.x) ? obj.x : fallback;
}

function getEntityY(obj, fallback = 561) {
  if (Number.isFinite(obj?.groundY)) return obj.groundY;
  if (Number.isFinite(obj?.y)) return obj.y;
  return fallback;
}

function getCompanionKey(entity, fallbackIdx = 0) {
  if (entity?.companionId) return String(entity.companionId);
  if (entity?.id) return String(entity.id);
  if (Number.isFinite(entity?.slotIndex)) return `slot_${entity.slotIndex}`;
  return `idx_${fallbackIdx}`;
}

function resolveBounds(bounds) {
  const minLaneY = Number.isFinite(bounds?.minLaneY) ? bounds.minLaneY : DEFAULT_MIN_LANE_Y;
  const maxLaneY = Math.max(
    minLaneY + 24,
    Number.isFinite(bounds?.maxLaneY) ? bounds.maxLaneY : DEFAULT_MAX_LANE_Y
  );
  const hasStageX = Number.isFinite(bounds?.minX) && Number.isFinite(bounds?.maxX);
  const rawMinX = hasStageX ? bounds.minX : -Infinity;
  const rawMaxX = hasStageX ? bounds.maxX : Infinity;
  const clampMinX = hasStageX ? rawMinX + 28 : -Infinity;
  const clampMaxX = hasStageX ? Math.max(clampMinX + 40, rawMaxX - 28) : Infinity;
  return {
    minLaneY,
    maxLaneY,
    hasStageX,
    rawMinX,
    rawMaxX,
    clampMinX,
    clampMaxX
  };
}

export class EndlessCompanionAI {
  constructor() {
    this._memoryByKey = new Map();
    this.squadFacing = 1;
    this._facingInit = false;
    this._pendingFacing = 1;
    this._pendingFacingTimer = 0;
    this._pendingFacingOriginX = null;
    // Pre-allocated reusable scratch structures (zero per-frame Map/Set/array churn at 60Hz on mobile)
    this._assignmentsScratch = new Map();
    this._anchorsScratch = new Map();
    this._livingScratch = [];
    this._activeKeysScratch = new Set();
    this._clumpCountsScratch = new Map();
    this._claimCountsScratch = new Map();
    this._evalOrderScratch = [];
    this._candidatesScratch = [];
    this._validEntitiesScratch = [];
    this._candidateSlotsScratch = [];
    this._rangedListScratch = [];
    this._rangedLaneScratch = new Map();
  }

  reset() {
    this._memoryByKey.clear();
    this._assignmentsScratch.clear();
    this._anchorsScratch.clear();
    this._livingScratch.length = 0;
    this._activeKeysScratch.clear();
    this._clumpCountsScratch.clear();
    this._claimCountsScratch.clear();
    this._evalOrderScratch.length = 0;
    this._candidatesScratch.length = 0;
    this._validEntitiesScratch.length = 0;
    this._candidateSlotsScratch.length = 0;
    this._rangedListScratch.length = 0;
    this._rangedLaneScratch.clear();
    this.squadFacing = 1;
    this._facingInit = false;
    this._pendingFacing = 1;
    this._pendingFacingTimer = 0;
    this._pendingFacingOriginX = null;
  }

  _getMemory(entity, fallbackIdx = 0) {
    const key = getCompanionKey(entity, fallbackIdx);
    let mem = this._memoryByKey.get(key);
    if (!mem) {
      mem = {
        target: null,
        stickyTimer: 0,
        evadeDirY: fallbackIdx % 2 === 0 ? -1 : 1,
        evadeTimer: 0
      };
      this._memoryByKey.set(key, mem);
    }
    return mem;
  }

  updateSquadFacing(player = null, dt = 0) {
    const safeDt = clampNum(Number(dt) || 0, 0, 0.25);
    const hasPlayerFacing = Number.isFinite(player?.facing) && player.facing !== 0;
    const rawFacing = hasPlayerFacing ? (player.facing < 0 ? -1 : 1) : this.squadFacing;
    const px = Number.isFinite(player?.x) ? player.x : null;

    if (!this._facingInit) {
      this.squadFacing = rawFacing;
      this._pendingFacing = rawFacing;
      this._pendingFacingTimer = 0;
      this._pendingFacingOriginX = px;
      this._facingInit = true;
      return this.squadFacing;
    }

    if (rawFacing === this.squadFacing) {
      this._pendingFacing = rawFacing;
      this._pendingFacingTimer = 0;
      this._pendingFacingOriginX = px;
      return this.squadFacing;
    }

    if (this._pendingFacing !== rawFacing) {
      this._pendingFacing = rawFacing;
      this._pendingFacingTimer = 0;
      this._pendingFacingOriginX = px;
    }

    this._pendingFacingTimer += safeDt;
    const movedInNewDir =
      px !== null && this._pendingFacingOriginX !== null
        ? (px - this._pendingFacingOriginX) * rawFacing
        : 0;

    if (
      this._pendingFacingTimer >= COMPANION_FACING_HOLD_SEC ||
      movedInNewDir >= COMPANION_FACING_MOVE_DIST
    ) {
      this.squadFacing = rawFacing;
      this._pendingFacing = rawFacing;
      this._pendingFacingTimer = 0;
      this._pendingFacingOriginX = px;
    }

    return this.squadFacing;
  }

  assignSquadTargets(entities = [], player = null, targets = [], dt = 0) {
    const assignments = this._assignmentsScratch;
    assignments.clear();
    if (!Array.isArray(entities) || entities.length === 0) return assignments;

    const safeDt = clampNum(Number(dt) || 0, 0, 0.25);
    const livingTargets = this._livingScratch;
    livingTargets.length = 0;
    if (Array.isArray(targets)) {
      for (let i = 0; i < targets.length; i++) {
        if (isTargetAlive(targets[i])) livingTargets.push(targets[i]);
      }
    }
    const activeKeys = this._activeKeysScratch;
    activeKeys.clear();

    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (!ent) continue;
      const key = getCompanionKey(ent, i);
      activeKeys.add(key);
      const mem = this._getMemory(ent, i);
      mem.stickyTimer = Math.max(0, mem.stickyTimer - safeDt);
      mem.evadeTimer = Math.max(0, mem.evadeTimer - safeDt);
      if (mem.target && !isTargetAlive(mem.target)) {
        mem.target = null;
        mem.stickyTimer = 0;
      }
    }

    // Prune stale memory entries for benched companions
    if (this._memoryByKey.size > activeKeys.size + 6) {
      for (const key of this._memoryByKey.keys()) {
        if (!activeKeys.has(key)) {
          this._memoryByKey.delete(key);
        }
      }
    }

    if (livingTargets.length === 0) {
      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        if (!ent) continue;
        assignments.set(ent, null);
        const mem = this._getMemory(ent, i);
        mem.target = null;
        mem.stickyTimer = 0;
      }
      return assignments;
    }

    const px = getEntityX(player, getEntityX(entities[0], 360));
    const py = getEntityY(player, 561);

    // Precompute clump densities within 190px for Ranged AoE prioritization
    const clumpCounts = this._clumpCountsScratch;
    clumpCounts.clear();
    for (let i = 0; i < livingTargets.length; i++) {
      const a = livingTargets[i];
      const ax = getEntityX(a, px);
      const ay = getEntityY(a, py);
      let count = 0;
      for (let j = 0; j < livingTargets.length; j++) {
        if (i === j) continue;
        const b = livingTargets[j];
        const bx = getEntityX(b, px);
        const by = getEntityY(b, py);
        const dx = Math.abs(bx - ax);
        const dy = Math.abs(by - ay);
        if (dx <= CLUMP_RADIUS_PX && dy <= CLUMP_LANE_TOL_PX && Math.hypot(dx, dy * 0.7) <= CLUMP_RADIUS_PX) {
          count++;
        }
      }
      clumpCounts.set(a, count);
    }

    // Evaluate Tanks first, then Flankers (who split away from Tank claims), then Ranged
    const evalOrder = this._evalOrderScratch;
    evalOrder.length = 0;
    for (let idx = 0; idx < entities.length; idx++) {
      const ent = entities[idx];
      if (!ent) continue;
      const archetype = getRoleArchetype(ent.role);
      evalOrder.push({
        ent,
        idx,
        archetype,
        order: archetype === 'TANK' ? 0 : archetype === 'FLANKER' ? 1 : 2
      });
    }
    evalOrder.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      const sa = Number.isFinite(a.ent.slotIndex) ? a.ent.slotIndex : a.idx;
      const sb = Number.isFinite(b.ent.slotIndex) ? b.ent.slotIndex : b.idx;
      return sa - sb || a.idx - b.idx;
    });

    const claimCounts = this._claimCountsScratch;
    claimCounts.clear();
    const candidates = this._candidatesScratch;

    for (let k = 0; k < evalOrder.length; k++) {
      const { ent, idx, archetype } = evalOrder[k];
      const mem = this._getMemory(ent, idx);
      const ex = getEntityX(ent, px);
      const ey = getEntityY(ent, py);

      // Filter targets within expanded 1050px sightline from either companion or Hero
      candidates.length = 0;
      for (let tIdx = 0; tIdx < livingTargets.length; tIdx++) {
        const cand = livingTargets[tIdx];
        const tx = getEntityX(cand, px);
        const dxComp = Math.abs(tx - ex);
        const dxPlayer = Math.abs(tx - px);
        if (dxComp <= COMPANION_ENGAGE_SIGHTLINE || dxPlayer <= COMPANION_ENGAGE_SIGHTLINE) {
          candidates.push(cand);
        }
      }

      if (candidates.length === 0) {
        assignments.set(ent, null);
        mem.target = null;
        mem.stickyTimer = 0;
        continue;
      }

      const hasMultiple = candidates.length >= 2;
      let bestTarget = null;
      let bestScore = -Infinity;

      for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
        const cand = candidates[cIdx];
        const tx = getEntityX(cand, px);
        const ty = getEntityY(cand, py);
        const dxComp = Math.abs(tx - ex);
        const dyComp = Math.abs(ty - ey);
        const dxPlayer = Math.abs(tx - px);
        const claims = claimCounts.get(cand) || 0;
        const isGoblin = isTreasureGoblinTarget(cand);
        const isChest = isTreasureChestTarget(cand);
        const isColossal = Boolean(cand.isColossalBoss);
        const isBoss = isBossTarget(cand);
        const isElite = isEliteTarget(cand);

        let score = 1000;

        if (archetype === 'TANK') {
          score -= dxPlayer * 0.95 + dxComp * 0.32 + dyComp * 0.24;
          if (isColossal) score += 270;
          else if (isBoss) score += 190;
          else if (isElite) score += 105;
          if (isGoblin) score += 95;
          if (isChest) score -= 70;
          if (hasMultiple && claims > 0 && !isColossal) {
            score -= claims * 65;
          }
        } else if (archetype === 'FLANKER') {
          score -= dxComp * 0.42 + dyComp * 0.18;
          // Backline preference: prefer enemies farther behind the Hero's frontline
          if (!isChest && dxPlayer > 140) {
            score += Math.min(125, (dxPlayer - 120) * 0.28);
          }
          if (isGoblin) score += 265;
          else if (cand.isElite || cand.isMiniBoss) score += 200;
          else if (isColossal || isBoss) score += 165;
          if (isChest) score += 115;
          // Strong split penalty when another ally already claimed this target and 2+ targets exist
          if (hasMultiple && claims > 0) {
            score -= claims * 360;
          }
        } else {
          // RANGED: prioritize dense clumps, elites/bosses, Treasure Goblins, Gold Vault Chests + soft splitting
          const clump = clumpCounts.get(cand) || 0;
          score -= dxComp * 0.34 + dyComp * 0.14;
          score += clump * 120;
          if (isColossal) score += 220;
          else if (isBoss) score += 185;
          else if (isElite) score += 150;
          if (isGoblin) score += 230;
          if (isChest) score += 180;
          if (hasMultiple && claims > 0) {
            score -= claims * 155;
          }
        }

        // Soft target stickiness hysteresis (~0.35s hold bonus), bypassed immediately if another ally claims it
        if (mem.target === cand && (!hasMultiple || claims === 0)) {
          score += mem.stickyTimer > 0 ? 75 : 22;
        }

        if (score > bestScore) {
          bestScore = score;
          bestTarget = cand;
        }
      }

      assignments.set(ent, bestTarget);
      if (bestTarget) {
        claimCounts.set(bestTarget, (claimCounts.get(bestTarget) || 0) + 1);
        if (bestTarget !== mem.target) {
          mem.target = bestTarget;
          mem.stickyTimer = COMPANION_TARGET_STICKY_SEC;
        }
      } else {
        mem.target = null;
        mem.stickyTimer = 0;
      }
    }

    return assignments;
  }

  computeFormationAnchors(entities = [], player = null, formationOffsets = null, bounds = null, dt = 0) {
    const anchors = this._anchorsScratch;
    anchors.clear();
    const squadFacing = this.updateSquadFacing(player, dt);
    if (!Array.isArray(entities) || entities.length === 0) return anchors;

    const b = resolveBounds(bounds);
    const px = getEntityX(player, 360);
    const py = clampNum(getEntityY(player, 561), b.minLaneY, b.maxLaneY);

    const rawOffsets =
      Array.isArray(formationOffsets) && formationOffsets.length > 0
        ? formationOffsets
        : FALLBACK_FORMATION_OFFSETS;

    const sortedEntities = this._validEntitiesScratch;
    sortedEntities.length = 0;
    for (let idx = 0; idx < entities.length; idx++) {
      const ent = entities[idx];
      if (!ent) continue;
      sortedEntities.push({
        ent,
        idx,
        rolePriority: getRoleFormationPriority(ent.role),
        archetype: getRoleArchetype(ent.role),
        slotIndex: Number.isFinite(ent.slotIndex) ? ent.slotIndex : idx
      });
    }

    // Sort entities by role priority: Tank (0) -> Brawler/Flanker (1) -> Vanguard (2) -> Ranged/Healer (3)
    sortedEntities.sort(
      (a, bItem) =>
        a.rolePriority - bItem.rolePriority || a.slotIndex - bItem.slotIndex || a.idx - bItem.idx
    );

    // Pair highest-priority vanguard roles with forward-most formation slots (highest dx)
    const candidateSlots = this._candidateSlotsScratch;
    candidateSlots.length = 0;
    for (let i = 0; i < sortedEntities.length; i++) {
      const src = rawOffsets[i % rawOffsets.length];
      candidateSlots.push({
        dx: Number.isFinite(src?.dx) ? src.dx : FALLBACK_FORMATION_OFFSETS[i % 3].dx,
        dy: Number.isFinite(src?.dy) ? src.dy : FALLBACK_FORMATION_OFFSETS[i % 3].dy,
        origIdx: i
      });
    }
    candidateSlots.sort(
      (a, bSlot) =>
        bSlot.dx - a.dx || Math.abs(a.dy) - Math.abs(bSlot.dy) || a.origIdx - bSlot.origIdx
    );

    // Distribute independent preferred groundY lanes for Ranged allies across [minLaneY + 18, maxLaneY - 18]
    const innerMinY = b.minLaneY + LANE_INNER_PAD_Y;
    const innerMaxY = Math.max(innerMinY + 20, b.maxLaneY - LANE_INNER_PAD_Y);
    const innerSpan = innerMaxY - innerMinY;

    const rangedList = this._rangedListScratch;
    rangedList.length = 0;
    for (let i = 0; i < sortedEntities.length; i++) {
      if (sortedEntities[i].archetype === 'RANGED') {
        rangedList.push(sortedEntities[i]);
      }
    }
    const rangedLaneByEnt = this._rangedLaneScratch;
    rangedLaneByEnt.clear();
    if (rangedList.length === 1) {
      const only = rangedList[0];
      const roleKey = normalizeRole(only.ent.role);
      const bias = RANGED_LANE_BIAS_BY_ROLE[roleKey] ?? 0.25;
      let laneY = innerMinY + innerSpan * bias;
      // Avoid mirroring player.groundY too closely; gently pick opposite clean lane band
      if (Math.abs(laneY - py) < 28) {
        laneY = py >= (innerMinY + innerMaxY) * 0.5 ? innerMinY + innerSpan * 0.18 : innerMinY + innerSpan * 0.82;
      }
      rangedLaneByEnt.set(only.ent, Math.round(clampNum(laneY, innerMinY, innerMaxY)));
    } else if (rangedList.length > 1) {
      const fractions =
        rangedList.length === 2 ? [0.16, 0.84] : [0.12, 0.5, 0.88];
      for (let r = 0; r < rangedList.length; r++) {
        const frac = fractions[r % fractions.length];
        const laneY = Math.round(clampNum(innerMinY + innerSpan * frac, innerMinY, innerMaxY));
        rangedLaneByEnt.set(rangedList[r].ent, laneY);
      }
    }

    for (let i = 0; i < sortedEntities.length; i++) {
      const item = sortedEntities[i];
      const slot = candidateSlots[i];
      const rawX = px + slot.dx * squadFacing;
      const anchorX = clampNum(rawX, b.clampMinX, b.clampMaxX);
      const anchorY = clampNum(py + slot.dy, b.minLaneY, b.maxLaneY);
      const independentLaneY = rangedLaneByEnt.has(item.ent)
        ? rangedLaneByEnt.get(item.ent)
        : clampNum(
            innerMinY + innerSpan * (((item.slotIndex % 3) * 0.36 + 0.14) % 1),
            innerMinY,
            innerMaxY
          );

      anchors.set(item.ent, {
        x: anchorX,
        y: anchorY,
        independentLaneY,
        dx: slot.dx,
        dy: slot.dy,
        squadFacing,
        rolePriority: item.rolePriority
      });
    }

    return anchors;
  }

  computeSeparationVector(entity, allEntities = [], bounds = null) {
    if (!entity || !Array.isArray(allEntities) || allEntities.length <= 1) {
      return { x: 0, y: 0, crowding: 0 };
    }

    const b = resolveBounds(bounds);
    const ex = getEntityX(entity, 360);
    const ey = getEntityY(entity, 561);
    const mySlot = Number.isFinite(entity.slotIndex) ? entity.slotIndex : 0;

    let pushX = 0;
    let pushY = 0;
    let maxCrowding = 0;

    for (let i = 0; i < allEntities.length; i++) {
      const other = allEntities[i];
      if (!other || other === entity || other.isDead) continue;
      const ox = getEntityX(other, 360);
      const oy = getEntityY(other, 561);
      const dx = ex - ox;
      const dy = ey - oy;
      const dist = Math.hypot(dx, dy);

      if (dist >= COMPANION_ALLY_SEPARATION_DIST) continue;

      const overlap = (COMPANION_ALLY_SEPARATION_DIST - dist) / COMPANION_ALLY_SEPARATION_DIST;
      if (overlap > maxCrowding) maxCrowding = overlap;

      const otherSlot = Number.isFinite(other.slotIndex) ? other.slotIndex : i;
      const laneTieSign = mySlot < otherSlot ? -1 : mySlot > otherSlot ? 1 : (i % 2 === 0 ? -1 : 1);

      let nx;
      let ny;
      if (dist < 0.01) {
        nx = laneTieSign * 0.55;
        ny = laneTieSign * 0.835;
      } else {
        nx = dx / dist;
        ny = dy / dist;
        // Encourage vertical lane spreading when two allies overlap almost purely horizontally
        if (Math.abs(ny) < 0.35) {
          const biasedY = ny + laneTieSign * 0.52;
          const norm = Math.hypot(nx, biasedY) || 1;
          nx /= norm;
          ny = biasedY / norm;
        }
      }

      // If pinned near top or bottom lane edge, invert vertical repulsion inward so allies still separate
      if (ey <= b.minLaneY + 6 && ny < 0) ny = Math.abs(ny);
      if (ey >= b.maxLaneY - 6 && ny > 0) ny = -Math.abs(ny);

      const weight = 0.65 + overlap * 1.15;
      pushX += nx * weight;
      pushY += ny * weight;
    }

    const mag = Math.hypot(pushX, pushY);
    if (mag > 1.65) {
      pushX = (pushX / mag) * 1.65;
      pushY = (pushY / mag) * 1.65;
    }

    return { x: pushX, y: pushY, crowding: maxCrowding };
  }

  shouldRubberBandDash(entity, player = null, targets = []) {
    if (!entity || !player) return false;
    const ex = getEntityX(entity, 360);
    const px = getEntityX(player, ex);
    const distToPlayerX = Math.abs(px - ex);
    if (distToPlayerX <= COMPANION_RUBBERBAND_DIST) return false;

    // Never yank an ally away from active combat within 360px
    if (Array.isArray(targets)) {
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        if (!isTargetAlive(t)) continue;
        if (Math.abs(getEntityX(t, px) - ex) <= COMPANION_COMBAT_HOLD_RANGE) {
          return false;
        }
      }
    }
    return true;
  }

  shouldEmergencyTeleport(entity, player = null) {
    if (!entity) return false;
    if (!Number.isFinite(entity.x) || !Number.isFinite(entity.groundY)) return true;
    if (!player || !Number.isFinite(player.x)) return false;
    return Math.abs(player.x - entity.x) > COMPANION_EMERGENCY_TELEPORT_DIST;
  }

  computeMovementStep(entity, context = {}) {
    const safeDt = clampNum(Number(context.dt) || 0, 0, 0.1);
    const moveBoost = clampNum(Number(context.moveBoost) || 1, 0.8, 4.0);
    const b = resolveBounds(context.bounds);
    const player = context.player || null;
    const target = context.target && isTargetAlive(context.target) ? context.target : null;
    const targets = Array.isArray(context.targets) ? context.targets : [];
    const allEntities = Array.isArray(context.entities) ? context.entities : [entity];
    const anchor = context.anchor || null;
    const formationShiftActive = Boolean(context.formationShiftActive);

    const ex = getEntityX(entity, 360);
    const ey = clampNum(getEntityY(entity, 561), b.minLaneY, b.maxLaneY);
    const px = getEntityX(player, ex);
    const py = clampNum(getEntityY(player, 561), b.minLaneY, b.maxLaneY);
    const squadFacing = anchor?.squadFacing ?? this.squadFacing;
    const formX = clampNum(Number.isFinite(anchor?.x) ? anchor.x : px, b.clampMinX, b.clampMaxX);
    const formY = clampNum(Number.isFinite(anchor?.y) ? anchor.y : py, b.minLaneY, b.maxLaneY);
    const independentLaneY = clampNum(
      Number.isFinite(anchor?.independentLaneY) ? anchor.independentLaneY : formY,
      b.minLaneY + LANE_INNER_PAD_Y,
      Math.max(b.minLaneY + LANE_INNER_PAD_Y, b.maxLaneY - LANE_INNER_PAD_Y)
    );

    if (this.shouldEmergencyTeleport(entity, player)) {
      return {
        action: 'TELEPORT',
        nextX: formX,
        nextGroundY: formY,
        facing: squadFacing,
        moveDir: 1,
        isKiting: false,
        flankSide: 0,
        inAttackRange: false,
        moved: true,
        desiredX: formX,
        desiredY: formY,
        separation: { x: 0, y: 0, crowding: 0 }
      };
    }

    if (this.shouldRubberBandDash(entity, player, targets)) {
      return {
        action: 'DASH',
        nextX: ex,
        nextGroundY: ey,
        facing: formX >= ex ? 1 : -1,
        moveDir: 1,
        isKiting: false,
        flankSide: 0,
        inAttackRange: false,
        moved: true,
        desiredX: formX,
        desiredY: formY,
        separation: { x: 0, y: 0, crowding: 0 }
      };
    }

    const sep = this.computeSeparationVector(entity, allEntities, context.bounds);
    const sepStepX = sep.x * 225 * moveBoost * safeDt;
    const sepStepY = sep.y * 205 * moveBoost * safeDt;
    const archetype = getRoleArchetype(entity?.role);
    const mem = this._getMemory(entity, Number.isFinite(entity?.slotIndex) ? entity.slotIndex : 0);

    // 1. Brief snappy formation reshuffle transition when player switches Squad Formation
    if (formationShiftActive) {
      const shiftDx = formX - ex;
      const shiftDy = formY - ey;
      const shiftDist = Math.hypot(shiftDx, shiftDy);
      if (shiftDist > 18) {
        const shiftSpd = 340 * moveBoost;
        const stepX = (shiftDx / shiftDist) * Math.min(shiftDist, shiftSpd * safeDt) + sepStepX * 0.5;
        const stepY =
          (shiftDy / shiftDist) * Math.min(Math.abs(shiftDy), shiftSpd * 0.72 * safeDt) + sepStepY * 0.6;
        const nextX = clampNum(ex + stepX, b.clampMinX, b.clampMaxX);
        const nextGroundY = clampNum(ey + stepY, b.minLaneY, b.maxLaneY);
        const facing = Math.abs(shiftDx) > 6 ? (shiftDx > 0 ? 1 : -1) : squadFacing;
        return {
          action: 'WALK',
          nextX,
          nextGroundY,
          facing,
          moveDir: 1,
          isKiting: false,
          flankSide: 0,
          inAttackRange: false,
          moved: Math.hypot(nextX - ex, nextGroundY - ey) > 0.25,
          desiredX: formX,
          desiredY: formY,
          separation: sep
        };
      }
    }

    // 2. Active Combat Positioning when a target is assigned
    if (target) {
      const tx = getEntityX(target, ex + (entity.facing || 1) * 120);
      const ty = clampNum(getEntityY(target, py), b.minLaneY, b.maxLaneY);
      const targetDistX = Math.abs(tx - ex);
      const targetDistY = Math.abs(ty - ey);
      const faceTarget = Math.abs(tx - ex) > 4 ? (tx >= ex ? 1 : -1) : entity.facing || squadFacing;

      if (archetype === 'RANGED') {
        const band = getRangedBand(entity.role, entity.attackRange);

        // Scan all living threats (excluding static unopened chests) for proximity kiting
        let closestThreat = null;
        let closestThreatDist = Infinity;
        for (let i = 0; i < targets.length; i++) {
          const cand = targets[i];
          if (!isActiveThreatTarget(cand)) continue;
          const cx = getEntityX(cand, tx);
          const cy = getEntityY(cand, ty);
          const dx = Math.abs(cx - ex);
          const dy = Math.abs(cy - ey);
          const effDist = Math.hypot(dx, dy * 0.72);
          if (effDist < closestThreatDist) {
            closestThreatDist = effDist;
            closestThreat = cand;
          }
        }

        if (closestThreat && closestThreatDist < COMPANION_KITE_THREAT_RADIUS) {
          const threatX = getEntityX(closestThreat, tx);
          const threatY = getEntityY(closestThreat, ty);
          const awayX =
            Math.abs(ex - threatX) >= 4 ? (ex >= threatX ? 1 : -1) : -squadFacing;

          const corneredLeft = b.hasStageX && ex <= b.rawMinX + CORNER_MARGIN_PX && awayX < 0;
          const corneredRight = b.hasStageX && ex >= b.rawMaxX - CORNER_MARGIN_PX && awayX > 0;
          const isCornered = corneredLeft || corneredRight;

          let desiredX;
          let desiredY;
          if (isCornered) {
            // Corner evasion: slip laterally across groundY and diagonally past the threat
            if (mem.evadeTimer <= 0) {
              const roomUp = ey - b.minLaneY;
              const roomDown = b.maxLaneY - ey;
              if (Math.abs(roomUp - roomDown) > 20) {
                mem.evadeDirY = roomUp > roomDown ? -1 : 1;
              } else {
                mem.evadeDirY = ey <= threatY ? -1 : 1;
                if (ey <= b.minLaneY + 26) mem.evadeDirY = 1;
                if (ey >= b.maxLaneY - 26) mem.evadeDirY = -1;
              }
              mem.evadeTimer = 0.65;
            }
            const escapeDirX = -awayX; // move inward away from wall & past threat
            desiredX = clampNum(ex + escapeDirX * 165, b.clampMinX, b.clampMaxX);
            desiredY = clampNum(ey + mem.evadeDirY * 105, b.minLaneY + 12, b.maxLaneY - 12);
          } else {
            // Open-lane brisk backstep away from threat + shift toward independent lane away from threatY
            desiredX = clampNum(
              threatX + awayX * (band.minSafeDist + 36),
              b.clampMinX,
              b.clampMaxX
            );
            let kiteLaneY = independentLaneY;
            if (Math.abs(kiteLaneY - threatY) < 44) {
              const laneShift = threatY >= (b.minLaneY + b.maxLaneY) * 0.5 ? -56 : 56;
              kiteLaneY = clampNum(
                threatY + laneShift,
                b.minLaneY + LANE_INNER_PAD_Y,
                b.maxLaneY - LANE_INNER_PAD_Y
              );
            }
            desiredY = kiteLaneY;
          }

          const kdx = desiredX - ex;
          const kdy = desiredY - ey;
          const kDist = Math.hypot(kdx, kdy) || 1;
          const kiteSpd = 278 * moveBoost;
          const stepX = (kdx / kDist) * Math.min(kDist, kiteSpd * safeDt) + sepStepX * 0.45;
          const stepY =
            (kdy / kDist) * Math.min(Math.abs(kdy), kiteSpd * 0.78 * safeDt) + sepStepY * 0.55;
          const nextX = clampNum(ex + stepX, b.clampMinX, b.clampMaxX);
          const nextGroundY = clampNum(ey + stepY, b.minLaneY, b.maxLaneY);
          const facing = isCornered ? (stepX >= 0 ? 1 : -1) : faceTarget;

          return {
            action: 'KITE',
            nextX,
            nextGroundY,
            facing,
            moveDir: stepX * facing >= 0 ? 1 : -1,
            isKiting: true,
            flankSide: 0,
            inAttackRange: false,
            moved: Math.hypot(nextX - ex, nextGroundY - ey) > 0.25,
            desiredX,
            desiredY,
            separation: sep
          };
        }

        // Between kite radius (135px) and optimal minSafeDist: fire if ready, otherwise ease back into band
        const insideMinBand =
          !isTreasureChestTarget(target) && targetDistX < band.minSafeDist;
        const canAttackNow = (Number(entity.attackCooldown) || 0) <= 0;
        const laneTol = 128;

        if (targetDistX <= band.maxRange && targetDistY <= laneTol && (!insideMinBand || canAttackNow)) {
          // Maintain crisp ally separation & independent lane drift even while in range
          const nextX = clampNum(ex + sepStepX, b.clampMinX, b.clampMaxX);
          const laneDrift =
            Math.abs(independentLaneY - ey) > 22 && sep.crowding < 0.05
              ? clampNum(independentLaneY - ey, -75 * moveBoost * safeDt, 75 * moveBoost * safeDt)
              : 0;
          const nextGroundY = clampNum(ey + sepStepY + laneDrift, b.minLaneY, b.maxLaneY);
          return {
            action: 'IN_RANGE',
            nextX,
            nextGroundY,
            facing: faceTarget,
            moveDir: 1,
            isKiting: false,
            flankSide: 0,
            inAttackRange: true,
            moved: Math.hypot(nextX - ex, nextGroundY - ey) > 0.35,
            desiredX: ex,
            desiredY: independentLaneY,
            separation: sep
          };
        }

        // Reposition to optimal ranged engagement band on independent groundY lane
        const sideFromTarget =
          Math.abs(ex - tx) >= 6 ? (ex >= tx ? 1 : -1) : -squadFacing;
        const desiredX = clampNum(
          tx + sideFromTarget * band.preferredDist,
          b.clampMinX,
          b.clampMaxX
        );
        const desiredY = independentLaneY;
        const dx = desiredX - ex;
        const dy = desiredY - ey;
        const dist = Math.hypot(dx, dy) || 1;
        const walkSpd = 248 * moveBoost;
        const stepX = (dx / dist) * Math.min(dist, walkSpd * safeDt) + sepStepX * 0.65;
        const stepY =
          (dy / dist) * Math.min(Math.abs(dy), walkSpd * 0.68 * safeDt) + sepStepY * 0.7;
        const nextX = clampNum(ex + stepX, b.clampMinX, b.clampMaxX);
        const nextGroundY = clampNum(ey + stepY, b.minLaneY, b.maxLaneY);

        return {
          action: 'WALK',
          nextX,
          nextGroundY,
          facing: faceTarget,
          moveDir: stepX * faceTarget >= 0 ? 1 : -1,
          isKiting: insideMinBand,
          flankSide: 0,
          inAttackRange: false,
          moved: Math.hypot(nextX - ex, nextGroundY - ey) > 0.25,
          desiredX,
          desiredY,
          separation: sep
        };
      }

      if (archetype === 'FLANKER') {
        // Step around BEHIND the target (+48..-48px opposite Hero's side or behind enemy facing)
        const heroSide = px <= tx ? -1 : 1;
        const enemyFacing =
          Number.isFinite(target.facing) && target.facing !== 0 ? Math.sign(target.facing) : heroSide;
        let flankSide = Math.abs(px - tx) <= 440 ? -heroSide : -enemyFacing;
        const flankOffset = clampNum(Math.min((entity.attackRange || 165) * 0.32, 48), 38, 48);

        let desiredX = tx + flankSide * flankOffset;
        if (b.hasStageX) {
          if (desiredX > b.rawMaxX - 42) {
            flankSide = -1;
            desiredX = clampNum(tx - flankOffset, b.clampMinX, b.clampMaxX);
          } else if (desiredX < b.rawMinX + 42) {
            flankSide = 1;
            desiredX = clampNum(tx + flankOffset, b.clampMinX, b.clampMaxX);
          } else {
            desiredX = clampNum(desiredX, b.clampMinX, b.clampMaxX);
          }
        }

        const slotParity = (Number.isFinite(entity.slotIndex) ? entity.slotIndex : 0) % 2 === 0 ? -1 : 1;
        const desiredY = clampNum(ty + slotParity * 12, b.minLaneY, b.maxLaneY);
        const flankDistX = Math.abs(ex - desiredX);
        const alreadyOnFlankSide = (ex - tx) * flankSide >= -12;
        const attackRange = Number(entity.attackRange) || 165;

        if (
          targetDistX <= attackRange &&
          targetDistY <= 52 &&
          (alreadyOnFlankSide || flankDistX <= 46)
        ) {
          const nextX = clampNum(ex + sepStepX, b.clampMinX, b.clampMaxX);
          const nextGroundY = clampNum(ey + sepStepY, b.minLaneY, b.maxLaneY);
          return {
            action: 'IN_RANGE',
            nextX,
            nextGroundY,
            facing: faceTarget,
            moveDir: 1,
            isKiting: false,
            flankSide,
            inAttackRange: true,
            moved: Math.hypot(nextX - ex, nextGroundY - ey) > 0.35,
            desiredX,
            desiredY,
            separation: sep
          };
        }

        // Arc slightly around the enemy's groundY when crossing to the back side
        const crossingThrough = (ex - tx) * flankSide < 0 && targetDistX < 95;
        const arcY = crossingThrough
          ? clampNum(ty + slotParity * 42, b.minLaneY, b.maxLaneY)
          : desiredY;
        const dx = desiredX - ex;
        const dy = arcY - ey;
        const dist = Math.hypot(dx, dy) || 1;
        const walkSpd = 286 * moveBoost;
        const stepX = (dx / dist) * Math.min(dist, walkSpd * safeDt) + sepStepX * 0.55;
        const stepY =
          (dy / dist) * Math.min(Math.abs(dy), walkSpd * 0.72 * safeDt) + sepStepY * 0.65;
        const nextX = clampNum(ex + stepX, b.clampMinX, b.clampMaxX);
        const nextGroundY = clampNum(ey + stepY, b.minLaneY, b.maxLaneY);

        return {
          action: 'WALK',
          nextX,
          nextGroundY,
          facing: faceTarget,
          moveDir: stepX * faceTarget >= 0 ? 1 : -1,
          isKiting: false,
          flankSide,
          inAttackRange: false,
          moved: Math.hypot(nextX - ex, nextGroundY - ey) > 0.25,
          desiredX,
          desiredY,
          separation: sep
        };
      }

      // TANK / BRAWLER: Frontline intercept on Hero-facing side of the threat
      const attackRange = Number(entity.attackRange) || 138;
      if (targetDistX <= attackRange && targetDistY <= 54) {
        const nextX = clampNum(ex + sepStepX, b.clampMinX, b.clampMaxX);
        const nextGroundY = clampNum(ey + sepStepY, b.minLaneY, b.maxLaneY);
        return {
          action: 'IN_RANGE',
          nextX,
          nextGroundY,
          facing: faceTarget,
          moveDir: 1,
          isKiting: false,
          flankSide: 0,
          inAttackRange: true,
          moved: Math.hypot(nextX - ex, nextGroundY - ey) > 0.35,
          desiredX: ex,
          desiredY: ty,
          separation: sep
        };
      }

      const frontSide = px <= tx ? -1 : 1;
      const standOffset = clampNum(attackRange * 0.68, 44, 118);
      const desiredX = clampNum(tx + frontSide * standOffset, b.clampMinX, b.clampMaxX);
      const desiredY = ty;
      const dx = desiredX - ex;
      const dy = desiredY - ey;
      const dist = Math.hypot(dx, dy) || 1;
      const walkSpd = 272 * moveBoost;
      const stepX = (dx / dist) * Math.min(dist, walkSpd * safeDt) + sepStepX * 0.6;
      const stepY =
        (dy / dist) * Math.min(Math.abs(dy), walkSpd * 0.66 * safeDt) + sepStepY * 0.65;
      const nextX = clampNum(ex + stepX, b.clampMinX, b.clampMaxX);
      const nextGroundY = clampNum(ey + stepY, b.minLaneY, b.maxLaneY);

      return {
        action: 'WALK',
        nextX,
        nextGroundY,
        facing: faceTarget,
        moveDir: stepX * faceTarget >= 0 ? 1 : -1,
        isKiting: false,
        flankSide: 0,
        inAttackRange: false,
        moved: Math.hypot(nextX - ex, nextGroundY - ey) > 0.25,
        desiredX,
        desiredY,
        separation: sep
      };
    }

    // 3. No Combat Target: Follow role-sorted Squad Formation with smooth separation
    const dx = formX - ex;
    const dy = formY - ey;
    const dist = Math.hypot(dx, dy);

    if (dist > 14 || sep.crowding > 0.02) {
      const followSpd = 258 * moveBoost;
      // When already within formation pocket and crowded, yield to separation so allies never stack
      const pullGain =
        sep.crowding > 0.02 && dist <= COMPANION_ALLY_SEPARATION_DIST
          ? 0
          : sep.crowding > 0.02 && dist <= COMPANION_ALLY_SEPARATION_DIST * 1.6
            ? clampNum(
                (dist - COMPANION_ALLY_SEPARATION_DIST) / (COMPANION_ALLY_SEPARATION_DIST * 0.6),
                0,
                1
              )
            : 1;
      const moveX = dist > 14 ? (dx / dist) * Math.min(dist, followSpd * safeDt) * pullGain : 0;
      const moveY =
        dist > 14 ? (dy / dist) * Math.min(Math.abs(dy), followSpd * 0.68 * safeDt) * pullGain : 0;
      const nextX = clampNum(ex + moveX + sepStepX, b.clampMinX, b.clampMaxX);
      const nextGroundY = clampNum(ey + moveY + sepStepY, b.minLaneY, b.maxLaneY);
      const facing = Math.abs(dx) > 10 && pullGain > 0.4 ? (dx > 0 ? 1 : -1) : squadFacing;
      return {
        action: 'WALK',
        nextX,
        nextGroundY,
        facing,
        moveDir: 1,
        isKiting: false,
        flankSide: 0,
        inAttackRange: false,
        moved: Math.hypot(nextX - ex, nextGroundY - ey) > 0.25,
        desiredX: formX,
        desiredY: formY,
        separation: sep
      };
    }

    return {
      action: 'IDLE',
      nextX: ex,
      nextGroundY: ey,
      facing: squadFacing,
      moveDir: 1,
      isKiting: false,
      flankSide: 0,
      inAttackRange: false,
      moved: false,
      desiredX: formX,
      desiredY: formY,
      separation: sep
    };
  }
}
