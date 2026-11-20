// Endless Crusade Gothic Obsidian & Burnished Gold HUD & Collapsible Shop Drawer
// Strictly Node-test safe (all DOM/window/Image accesses guarded), zero emojis,
// pure nearest-neighbor blits & fillRect fallbacks, in-place DOM patching (zero 60fps click drops).

import { PixelForge } from '../engine/PixelForge.js?v=30fps198';
import { ENDLESS_RELICS, ENDLESS_RELIC_SETS, formatEndlessNumber } from './EndlessEconomy.js?v=30fps198';

const ENDLESS_VFX_SHEET_URL = 'assets/sprites/endless_crusade_vfx.png?v=30fps198';
const ENDLESS_ICON_ROW = 7;
const ENDLESS_SIGIL_ROW = 9;
const ENDLESS_ICON_CELL = 128;
const STYLE_ELEMENT_ID = 'endless-shop-ui-styles';
const ROOT_ELEMENT_ID = 'endless-hud-root';
const RELIC_DEF_BY_ID = new Map(ENDLESS_RELICS.map((r) => [r.id, r]));

const CLOSE_SVG =
  '<svg class="endless-px-svg" width="12" height="12" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="2" y="2" width="2" height="2" fill="currentColor"/>' +
  '<rect x="4" y="4" width="4" height="4" fill="currentColor"/>' +
  '<rect x="8" y="2" width="2" height="2" fill="currentColor"/>' +
  '<rect x="2" y="8" width="2" height="2" fill="currentColor"/>' +
  '<rect x="8" y="8" width="2" height="2" fill="currentColor"/>' +
  '</svg>';

const BOSS_CROWN_SVG =
  '<svg class="endless-px-svg" width="12" height="10" viewBox="0 0 12 10" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="1" y="2" width="2" height="6" fill="#facc15"/>' +
  '<rect x="5" y="1" width="2" height="7" fill="#fef08a"/>' +
  '<rect x="9" y="2" width="2" height="6" fill="#facc15"/>' +
  '<rect x="1" y="6" width="10" height="3" fill="#d97706"/>' +
  '<rect x="2" y="5" width="8" height="2" fill="#facc15"/>' +
  '<rect x="5" y="6" width="2" height="2" fill="#ef4444"/>' +
  '</svg>';

const SYNERGY_DIAMOND_SVG =
  '<svg class="endless-px-svg" width="8" height="8" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="3" y="0" width="2" height="8" fill="currentColor"/>' +
  '<rect x="1" y="2" width="6" height="4" fill="currentColor"/>' +
  '<rect x="0" y="3" width="8" height="2" fill="currentColor"/>' +
  '<rect x="3" y="3" width="2" height="2" fill="#ffffff"/>' +
  '</svg>';

const DPS_BAR_SVG =
  '<svg class="endless-px-svg" width="10" height="10" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="1" y="5" width="2" height="4" fill="#38bdf8"/>' +
  '<rect x="4" y="2" width="2" height="7" fill="#facc15"/>' +
  '<rect x="7" y="4" width="2" height="5" fill="#c084fc"/>' +
  '<rect x="0" y="9" width="10" height="1" fill="#d4af37"/>' +
  '</svg>';

const ASCEND_STAR_SVG =
  '<svg class="endless-px-svg" width="12" height="12" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="5" y="0" width="2" height="12" fill="#e9d5ff"/>' +
  '<rect x="0" y="5" width="12" height="2" fill="#c084fc"/>' +
  '<rect x="3" y="3" width="6" height="6" fill="#a855f7"/>' +
  '<rect x="4" y="4" width="4" height="4" fill="#fef08a"/>' +
  '<rect x="5" y="5" width="2" height="2" fill="#ffffff"/>' +
  '</svg>';

const GEAR_WEAPON_SVG =
  '<svg class="endless-px-svg" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="11" y="1" width="2" height="2" fill="#ffffff"/>' +
  '<rect x="10" y="2" width="2" height="2" fill="#f8fafc"/>' +
  '<rect x="9" y="3" width="2" height="2" fill="#e2e8f0"/>' +
  '<rect x="11" y="3" width="1" height="1" fill="#94a3b8"/>' +
  '<rect x="8" y="4" width="2" height="2" fill="#e2e8f0"/>' +
  '<rect x="10" y="4" width="1" height="1" fill="#94a3b8"/>' +
  '<rect x="7" y="5" width="2" height="2" fill="#cbd5e1"/>' +
  '<rect x="9" y="5" width="1" height="1" fill="#64748b"/>' +
  '<rect x="6" y="6" width="2" height="2" fill="#cbd5e1"/>' +
  '<rect x="8" y="6" width="1" height="1" fill="#64748b"/>' +
  '<rect x="3" y="6" width="2" height="2" fill="#facc15"/>' +
  '<rect x="4" y="7" width="3" height="2" fill="#fef08a"/>' +
  '<rect x="6" y="9" width="2" height="2" fill="#d97706"/>' +
  '<rect x="3" y="9" width="2" height="2" fill="#78350f"/>' +
  '<rect x="2" y="10" width="2" height="2" fill="#92400e"/>' +
  '<rect x="1" y="11" width="2" height="2" fill="#f43f5e"/>' +
  '<rect x="2" y="12" width="1" height="1" fill="#facc15"/>' +
  '</svg>';

const GEAR_ARMOR_SVG =
  '<svg class="endless-px-svg" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="1" y="2" width="3" height="4" fill="#64748b"/>' +
  '<rect x="10" y="2" width="3" height="4" fill="#64748b"/>' +
  '<rect x="2" y="2" width="2" height="1" fill="#facc15"/>' +
  '<rect x="10" y="2" width="2" height="1" fill="#facc15"/>' +
  '<rect x="3" y="3" width="8" height="7" fill="#334155"/>' +
  '<rect x="4" y="4" width="6" height="3" fill="#475569"/>' +
  '<rect x="5" y="2" width="4" height="2" fill="#0f172a"/>' +
  '<rect x="6" y="4" width="2" height="6" fill="#facc15"/>' +
  '<rect x="6" y="5" width="2" height="2" fill="#fef08a"/>' +
  '<rect x="3" y="10" width="8" height="1" fill="#d4af37"/>' +
  '<rect x="3" y="11" width="3" height="2" fill="#475569"/>' +
  '<rect x="8" y="11" width="3" height="2" fill="#475569"/>' +
  '<rect x="6" y="11" width="2" height="2" fill="#92400e"/>' +
  '</svg>';

const GEAR_AMULET_SVG =
  '<svg class="endless-px-svg" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="3" y="1" width="2" height="1" fill="#d4af37"/>' +
  '<rect x="9" y="1" width="2" height="1" fill="#d4af37"/>' +
  '<rect x="4" y="2" width="1" height="2" fill="#facc15"/>' +
  '<rect x="9" y="2" width="1" height="2" fill="#facc15"/>' +
  '<rect x="5" y="3" width="4" height="2" fill="#facc15"/>' +
  '<rect x="4" y="5" width="6" height="7" fill="#d4af37"/>' +
  '<rect x="3" y="6" width="8" height="5" fill="#facc15"/>' +
  '<rect x="4" y="6" width="6" height="5" fill="#0f172a"/>' +
  '<rect x="5" y="6" width="4" height="5" fill="#0284c7"/>' +
  '<rect x="6" y="5" width="2" height="7" fill="#38bdf8"/>' +
  '<rect x="5" y="7" width="4" height="3" fill="#7dd3fc"/>' +
  '<rect x="6" y="6" width="2" height="2" fill="#ffffff"/>' +
  '<rect x="6" y="12" width="2" height="1" fill="#fef08a"/>' +
  '</svg>';

const GEAR_RING_SVG =
  '<svg class="endless-px-svg" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="5" y="1" width="4" height="4" fill="#facc15"/>' +
  '<rect x="6" y="2" width="2" height="2" fill="#f43f5e"/>' +
  '<rect x="6" y="2" width="1" height="1" fill="#ffffff"/>' +
  '<rect x="3" y="4" width="2" height="2" fill="#fef08a"/>' +
  '<rect x="9" y="4" width="2" height="2" fill="#facc15"/>' +
  '<rect x="2" y="6" width="2" height="4" fill="#facc15"/>' +
  '<rect x="10" y="6" width="2" height="4" fill="#d4af37"/>' +
  '<rect x="3" y="10" width="2" height="2" fill="#d97706"/>' +
  '<rect x="9" y="10" width="2" height="2" fill="#b45309"/>' +
  '<rect x="5" y="11" width="4" height="2" fill="#ca8a04"/>' +
  '<rect x="5" y="11" width="4" height="1" fill="#facc15"/>' +
  '</svg>';

const FORGE_DUST_SVG =
  '<svg class="endless-px-svg" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="6" y="1" width="2" height="3" fill="#38bdf8"/>' +
  '<rect x="5" y="2" width="4" height="2" fill="#7dd3fc"/>' +
  '<rect x="6" y="2" width="1" height="1" fill="#ffffff"/>' +
  '<rect x="3" y="2" width="1" height="1" fill="#facc15"/>' +
  '<rect x="10" y="2" width="1" height="1" fill="#fb923c"/>' +
  '<rect x="1" y="5" width="12" height="2" fill="#94a3b8"/>' +
  '<rect x="3" y="5" width="9" height="1" fill="#e2e8f0"/>' +
  '<rect x="6" y="5" width="2" height="1" fill="#fb923c"/>' +
  '<rect x="4" y="7" width="6" height="3" fill="#475569"/>' +
  '<rect x="5" y="7" width="4" height="2" fill="#64748b"/>' +
  '<rect x="2" y="10" width="10" height="3" fill="#334155"/>' +
  '<rect x="3" y="10" width="8" height="1" fill="#d4af37"/>' +
  '</svg>';

const GEAR_SLOT_ORDER = Object.freeze(['weapon', 'armor', 'amulet', 'ring']);

const GEAR_SLOT_DEFAULTS = Object.freeze({
  weapon: Object.freeze({ id: 'weapon', label: 'WEAPON', shortLabel: 'WPN' }),
  armor: Object.freeze({ id: 'armor', label: 'ARMOR', shortLabel: 'ARM' }),
  amulet: Object.freeze({ id: 'amulet', label: 'AMULET', shortLabel: 'AMU' }),
  ring: Object.freeze({ id: 'ring', label: 'RELIC RING', shortLabel: 'RNG' })
});

const GEAR_SLOT_SVG_MAP = Object.freeze({
  weapon: GEAR_WEAPON_SVG,
  armor: GEAR_ARMOR_SVG,
  amulet: GEAR_AMULET_SVG,
  ring: GEAR_RING_SVG
});

const DEFAULT_MYTHIC_SETS = Object.freeze([
  Object.freeze({
    id: 'stormcaller',
    name: 'STORMCALLER',
    accentHex: '#38bdf8',
    shortDesc: 'TAP CHAIN-LIGHTNING (+3 JUMPS, 1.35X DMG)',
    fullDesc: 'Taps arc extra Chain-Lightning bolts to 3 foes even outside Fever.',
    pieces: 0,
    requiredPieces: 2,
    active: false,
    empowered: false
  }),
  Object.freeze({
    id: 'blood_reaver',
    name: 'BLOOD-REAVER',
    accentHex: '#f43f5e',
    shortDesc: 'KILL NOVA + 8% LIFESTEAL ON SLAY',
    fullDesc: 'Slaying foes unleashes a crimson shockwave (45% AoE) and heals 8% max HP.',
    pieces: 0,
    requiredPieces: 2,
    active: false,
    empowered: false
  }),
  Object.freeze({
    id: 'titan_slayer',
    name: 'TITAN-SLAYER',
    accentHex: '#facc15',
    shortDesc: 'BOSS EXECUTE <15% HP (+30% BOSS DMG)',
    fullDesc: 'Executes bosses below 15% HP instantly and grants +30% Boss Damage.',
    pieces: 0,
    requiredPieces: 2,
    active: false,
    empowered: false
  })
]);

const GEAR_BONUS_SPECS = Object.freeze([
  Object.freeze({ key: 'heroDmgPct', label: 'HERO', isCrit: false, priority: 7 }),
  Object.freeze({ key: 'tapDmgPct', label: 'TAP', isCrit: false, priority: 6 }),
  Object.freeze({ key: 'companionDmgPct', label: 'ALLY', isCrit: false, priority: 5 }),
  Object.freeze({ key: 'bossDmgPct', label: 'BOSS', isCrit: false, priority: 4 }),
  Object.freeze({ key: 'goldPct', label: 'GOLD', isCrit: false, priority: 3 }),
  Object.freeze({ key: 'maxHpPct', label: 'HP', isCrit: false, priority: 2 }),
  Object.freeze({ key: 'critBonus', label: 'CRIT', isCrit: true, priority: 1 })
]);

function getGearSlotSvg(slot) {
  return GEAR_SLOT_SVG_MAP[slot] || GEAR_WEAPON_SVG;
}

function formatGearBonusPercent(val, isCrit) {
  const pct = val * 100;
  if (isCrit) {
    const rounded1 = Math.round(pct * 10) / 10;
    return Number.isInteger(rounded1) ? `+${rounded1}%` : `+${rounded1.toFixed(1)}%`;
  }
  const rounded = Math.round(pct);
  if (rounded >= 10000) {
    return `+${formatEndlessNumber(rounded)}%`;
  }
  return `+${rounded}%`;
}

function formatGearBonuses(bonuses, maxCount = 2) {
  if (!bonuses || typeof bonuses !== 'object') return '';
  const entries = [];
  for (let i = 0; i < GEAR_BONUS_SPECS.length; i++) {
    const spec = GEAR_BONUS_SPECS[i];
    const raw = Number(bonuses[spec.key]);
    if (!Number.isFinite(raw) || raw <= 0.0001) continue;
    const score = spec.isCrit ? raw * 4 : raw;
    entries.push({ spec, raw, score });
  }
  if (entries.length === 0) return '';
  entries.sort((a, b) => (b.score - a.score) || (b.spec.priority - a.spec.priority));
  const slice = maxCount > 0 ? entries.slice(0, maxCount) : entries;
  return slice.map((e) => `${formatGearBonusPercent(e.raw, e.spec.isCrit)} ${e.spec.label}`).join(' • ');
}

function computeGearItemSignature(item) {
  if (!item || typeof item !== 'object') return 'EMPTY';
  const eb = item.effectiveBonuses || item.bonuses || {};
  return [
    item.uid || '',
    item.slot || '',
    item.rarity || '',
    item.name || '',
    item.stage || 1,
    item.enhanceLevel || 0,
    item.power || 0,
    item.enhanceCost || 0,
    item.canEnhance ? 1 : 0,
    item.isMaxEnhanced ? 1 : 0,
    item.salvageValue || 0,
    item.isUpgradeOverEquipped ? 1 : 0,
    item.setId || '',
    item.setMeta?.name || '',
    item.setMeta?.accentHex || '',
    item.rarityMeta?.label || '',
    item.rarityMeta?.color || '',
    Math.round((Number(eb.heroDmgPct) || 0) * 1000),
    Math.round((Number(eb.tapDmgPct) || 0) * 1000),
    Math.round((Number(eb.companionDmgPct) || 0) * 1000),
    Math.round((Number(eb.goldPct) || 0) * 1000),
    Math.round((Number(eb.critBonus) || 0) * 1000),
    Math.round((Number(eb.bossDmgPct) || 0) * 1000),
    Math.round((Number(eb.maxHpPct) || 0) * 1000)
  ].join(':');
}

const ETERNAL_ARTIFACT_ICON_MAP = Object.freeze({
  eternal_blade: { row: 7, col: 2, accentHex: '#f97316' },
  sovereign_vault: { row: 7, col: 11, accentHex: '#facc15' },
  banner_of_oaths: { row: 7, col: 8, accentHex: '#f43f5e' },
  astral_spark: { row: 7, col: 3, accentHex: '#c084fc' },
  chronos_hourglass: { row: 7, col: 9, accentHex: '#38bdf8' },
  gilded_ledger: { row: 7, col: 0, accentHex: '#fde047' }
});

function formatAwayTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}H ${m}M`;
  if (m > 0) return rem > 0 ? `${m}M ${rem}S` : `${m}M`;
  return `${rem}S`;
}

function resolveArtifactIconSpec(art) {
  if (art && art.id && ETERNAL_ARTIFACT_ICON_MAP[art.id]) {
    return ETERNAL_ARTIFACT_ICON_MAP[art.id];
  }
  const rawCol = Number(art?.iconCol);
  if (Number.isFinite(rawCol)) {
    return {
      row: ENDLESS_ICON_ROW,
      col: Math.max(0, Math.min(11, Math.floor(rawCol))),
      accentHex: '#c084fc'
    };
  }
  return { row: 1, col: 0, accentHex: '#c084fc' };
}

const ENDLESS_SHOP_CSS = `
/* =========================================================================
   ENDLESS CRUSADE HUD & COLLAPSIBLE GOTHIC SHOP DRAWER
   Gothic Obsidian (#0a0d18) & Burnished Gold (#d4af37 / #facc15)
   ========================================================================= */
#endless-hud-root {
  position: absolute;
  inset: 0;
  z-index: 22;
  pointer-events: none;
  font-family: 'ArcanePixel', 'Press Start 2P', monospace;
  color: #f8fafc;
  user-select: none;
  -webkit-user-select: none;
  box-sizing: border-box;
  overflow: hidden;
}

#endless-hud-root *,
#endless-hud-root *::before,
#endless-hud-root *::after {
  box-sizing: border-box;
}

#endless-hud-root.hidden,
#app.is-landing-open #endless-hud-root {
  display: none !important;
}

#endless-hud-root canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  display: block;
}

.endless-px-svg {
  display: inline-block;
  flex-shrink: 0;
}

/* Top-Center Status Stack (Status Bar + Boss Controls) */
.endless-top-stack {
  position: absolute;
  top: max(60px, calc(env(safe-area-inset-top) + 56px));
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: min(880px, calc(100% - 316px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  z-index: 23;
}

.endless-top-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 5px 8px;
  padding: 4px 9px;
  max-width: 100%;
  background: linear-gradient(180deg, rgba(14, 18, 34, 0.94) 0%, rgba(7, 9, 18, 0.97) 100%);
  border: 2px solid #d4af37;
  outline: 1px solid #000;
  border-radius: 5px;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.28),
    inset 0 0 12px rgba(212, 175, 55, 0.14),
    0 5px 16px rgba(0, 0, 0, 0.86);
  pointer-events: auto;
}

.endless-stage-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 7px;
  background: rgba(10, 13, 24, 0.92);
  border: 1px solid rgba(250, 204, 21, 0.55);
  border-left: 3px solid #38bdf8;
  border-radius: 3px;
  font-size: 0.48rem;
  letter-spacing: 0.04em;
  color: #fef08a;
  white-space: nowrap;
  text-shadow: 0 1px 0 #000;
}

.endless-loop-pill {
  padding: 1px 4px;
  background: rgba(192, 132, 252, 0.22);
  border: 1px solid #c084fc;
  border-radius: 2px;
  color: #e9d5ff;
  font-size: 0.38rem;
}

.endless-loop-pill.hidden {
  display: none;
}

.endless-wave-meter {
  position: relative;
  min-width: 112px;
  height: 18px;
  background: #070912;
  border: 1px solid rgba(212, 175, 55, 0.65);
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

.endless-wave-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 20%;
  background: linear-gradient(90deg, #1d4ed8 0%, #38bdf8 100%);
  transition: width 0.16s linear;
}

.endless-wave-meter.is-boss .endless-wave-fill {
  background: linear-gradient(90deg, #991b1b 0%, #ef4444 55%, #facc15 100%);
}

.endless-wave-meter.is-boss {
  border-color: #f87171;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.45);
}

.endless-wave-meter.is-farm .endless-wave-fill {
  background: linear-gradient(90deg, #854d0e 0%, #eab308 100%);
}

.endless-wave-label {
  position: relative;
  z-index: 1;
  font-size: 0.42rem;
  color: #ffffff;
  text-shadow: 0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000;
  white-space: nowrap;
}

.endless-currency-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.endless-currency-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px 2px 4px;
  background: rgba(8, 11, 20, 0.94);
  border: 1px solid rgba(212, 175, 55, 0.55);
  border-radius: 3px;
  font-size: 0.48rem;
  white-space: nowrap;
  text-shadow: 0 1px 0 #000;
}

.endless-currency-pill.is-gold {
  color: #fde047;
  border-color: rgba(250, 204, 21, 0.72);
}

.endless-currency-pill.is-shard {
  color: #7dd3fc;
  border-color: rgba(56, 189, 248, 0.68);
}

.endless-currency-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.endless-fever-meter {
  position: relative;
  width: 84px;
  height: 16px;
  background: #090c17;
  border: 1px solid rgba(251, 146, 60, 0.65);
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.endless-fever-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  background: linear-gradient(90deg, #b45309 0%, #f59e0b 55%, #fef08a 100%);
  transition: width 0.08s linear;
}

.endless-fever-meter.is-active {
  border-color: #fde047;
  box-shadow: 0 0 10px rgba(250, 204, 21, 0.72);
}

.endless-fever-meter.is-tier2 {
  border-color: #f43f5e;
  box-shadow: 0 0 12px rgba(244, 63, 94, 0.78);
}

.endless-fever-meter.is-tier2 .endless-fever-fill {
  background: linear-gradient(90deg, #dc2626 0%, #f97316 50%, #fef08a 100%);
}

.endless-fever-label {
  position: relative;
  z-index: 1;
  font-size: 0.36rem;
  color: #fffbeb;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
}

/* Boss Control Action Pill */
.endless-boss-controls {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  pointer-events: auto;
}

.endless-autoboss-btn {
  font-family: inherit;
  font-size: 0.42rem;
  letter-spacing: 0.03em;
  padding: 4px 8px;
  color: #cbd5e1;
  background: linear-gradient(180deg, rgba(16, 20, 34, 0.94) 0%, rgba(8, 10, 18, 0.96) 100%);
  border: 1.5px solid #475569;
  outline: 1px solid #000;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.14s ease, color 0.14s ease, transform 0.08s ease;
}

.endless-autoboss-btn.is-on {
  color: #fef08a;
  border-color: #d4af37;
  background: linear-gradient(180deg, rgba(45, 34, 12, 0.94) 0%, rgba(19, 14, 6, 0.96) 100%);
  box-shadow: inset 0 1px 0 rgba(254, 240, 138, 0.24);
}

.endless-autoboss-btn:active,
.endless-challenge-boss-btn:active,
.endless-shop-toggle:active,
.endless-buy-btn:active,
.endless-comp-btn:active {
  transform: translateY(1px);
}

.endless-challenge-boss-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: inherit;
  font-size: 0.45rem;
  letter-spacing: 0.04em;
  padding: 5px 10px;
  color: #fffbeb;
  background: linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%);
  border: 2px solid #facc15;
  outline: 1px solid #000;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  text-shadow: 0 1px 0 #000;
  box-shadow: 0 0 14px rgba(250, 204, 21, 0.55), inset 0 1px 0 rgba(254, 240, 138, 0.4);
  animation: endlessBossPulse 1.35s ease-in-out infinite;
}

.endless-challenge-boss-btn.hidden {
  display: none !important;
}

@keyframes endlessBossPulse {
  0%, 100% {
    box-shadow: 0 0 10px rgba(250, 204, 21, 0.45), inset 0 1px 0 rgba(254, 240, 138, 0.35);
    border-color: #facc15;
  }
  50% {
    box-shadow: 0 0 18px rgba(250, 204, 21, 0.92), inset 0 1px 0 rgba(254, 240, 138, 0.65);
    border-color: #fef08a;
  }
}

/* Floating Shop Toggle Button */
#endless-shop-toggle {
  position: absolute;
  top: max(60px, calc(env(safe-area-inset-top) + 56px));
  right: max(12px, env(safe-area-inset-right));
  z-index: 28;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 7px;
  font-family: inherit;
  font-size: 0.46rem;
  letter-spacing: 0.04em;
  color: #fef08a;
  background: linear-gradient(180deg, #1b172c 0%, #0a0d18 100%);
  border: 2px solid #d4af37;
  outline: 1px solid #000;
  border-radius: 5px;
  cursor: pointer;
  text-shadow: 0 1px 0 #000;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.32),
    0 5px 16px rgba(0, 0, 0, 0.88);
  white-space: nowrap;
}

#endless-shop-toggle.is-open {
  border-color: #fde047;
  background: linear-gradient(180deg, #2b2112 0%, #120e08 100%);
}

.endless-toggle-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.endless-affordable-dot {
  width: 8px;
  height: 8px;
  background: #facc15;
  border: 1px solid #000;
  box-shadow: 0 0 8px #facc15;
  animation: endlessDotPulse 1.1s ease-in-out infinite;
}

.endless-affordable-dot.hidden {
  display: none;
}

@keyframes endlessDotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.8); }
}

/* Collapsible Gothic Shop Drawer */
.endless-shop-shell {
  position: absolute;
  top: max(104px, calc(env(safe-area-inset-top) + 100px));
  right: max(12px, env(safe-area-inset-right));
  bottom: max(76px, env(safe-area-inset-bottom));
  width: 348px;
  max-width: calc(100vw - 24px);
  z-index: 30;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(13, 17, 30, 0.97) 0%, rgba(7, 9, 17, 0.98) 100%);
  border: 2px solid #d4af37;
  outline: 1px solid #000;
  border-radius: 6px;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.28),
    inset 0 0 18px rgba(212, 175, 55, 0.12),
    0 12px 32px rgba(0, 0, 0, 0.92);
  overflow: hidden;
}

.endless-shop-shell.hidden {
  display: none !important;
}

.endless-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 9px;
  background: linear-gradient(180deg, rgba(30, 24, 15, 0.94) 0%, rgba(12, 14, 24, 0.96) 100%);
  border-bottom: 1.5px solid rgba(212, 175, 55, 0.62);
  flex-shrink: 0;
}

.endless-drawer-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.endless-drawer-title {
  font-size: 0.50rem;
  color: #fde047;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
}

.endless-drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: #fde047;
  background: rgba(15, 19, 32, 0.95);
  border: 1.5px solid rgba(212, 175, 55, 0.65);
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
}

.endless-drawer-close:hover {
  background: rgba(127, 29, 29, 0.85);
  border-color: #f87171;
  color: #ffffff;
}

/* Tab Bar */
.endless-tab-bar {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 2px;
  padding: 5px 5px;
  background: rgba(6, 8, 15, 0.94);
  border-bottom: 1px solid rgba(212, 175, 55, 0.35);
  flex-shrink: 0;
  overflow: hidden;
}

.endless-tab-btn {
  flex: 0.92 1 0;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 2px;
  font-family: inherit;
  font-size: 0.34rem;
  letter-spacing: 0.01em;
  color: #94a3b8;
  background: rgba(13, 17, 30, 0.9);
  border: 1.5px solid #334155;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}

.endless-tab-btn[data-tab-id="gear"] {
  flex: 0.96 1 0;
  border-color: rgba(250, 204, 21, 0.45);
  color: #fde68a;
}

.endless-tab-btn[data-tab-id="companions"] {
  flex: 1.56 1 0;
}

.endless-tab-btn[data-tab-id="ascend"] {
  flex: 1.12 1 0;
  border-color: rgba(168, 85, 247, 0.55);
  color: #d8b4fe;
}

.endless-tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.endless-tab-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  background: #c084fc;
  border: 1px solid #fef08a;
  box-shadow: 0 0 8px #c084fc, 0 0 3px #facc15;
  animation: endlessDotPulse 1.1s ease-in-out infinite;
}

.endless-tab-dot.is-gear {
  background: #facc15;
  border-color: #fef08a;
  box-shadow: 0 0 8px #facc15, 0 0 3px #34d399;
}

.endless-tab-dot.hidden {
  display: none;
}

.endless-tab-btn.is-active {
  color: #fef08a;
  border-color: #facc15;
  background: linear-gradient(180deg, rgba(66, 46, 12, 0.92) 0%, rgba(28, 20, 8, 0.96) 100%);
  box-shadow: inset 0 1px 0 rgba(254, 240, 138, 0.3);
}

.endless-tab-btn[data-tab-id="gear"].is-active {
  color: #fffbeb;
  border-color: #fde047;
  background: linear-gradient(180deg, rgba(92, 54, 10, 0.96) 0%, rgba(36, 22, 6, 0.98) 100%);
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.38),
    0 0 8px rgba(250, 204, 21, 0.35);
}

.endless-tab-btn[data-tab-id="ascend"].is-active {
  color: #fef08a;
  border-color: #d8b4fe;
  background: linear-gradient(180deg, rgba(76, 29, 149, 0.94) 0%, rgba(30, 14, 58, 0.98) 100%);
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.35),
    0 0 8px rgba(168, 85, 247, 0.45);
}

/* Drawer Body & Panels */
.endless-drawer-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.endless-tab-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.endless-tab-panel.hidden {
  display: none !important;
}

/* Bulk Buy Strip */
.endless-bulk-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(9, 12, 22, 0.92);
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
  flex-shrink: 0;
}

.endless-bulk-label {
  font-size: 0.40rem;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

.endless-bulk-group {
  display: inline-flex;
  gap: 4px;
}

.endless-bulk-btn {
  font-family: inherit;
  font-size: 0.42rem;
  padding: 4px 8px;
  color: #cbd5e1;
  background: #0c1020;
  border: 1px solid #475569;
  border-radius: 3px;
  cursor: pointer;
}

.endless-bulk-btn.is-active {
  color: #090c14;
  background: linear-gradient(180deg, #fef08a 0%, #eab308 100%);
  border-color: #fef08a;
  font-weight: 700;
}

/* Scroll Containers */
.endless-scroll-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 7px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-width: thin;
  scrollbar-color: #d4af37 #0a0d18;
}

/* Relic Rows */
.endless-relic-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 6px;
  background: linear-gradient(180deg, rgba(16, 21, 36, 0.94) 0%, rgba(10, 13, 24, 0.96) 100%);
  border: 1.5px solid rgba(100, 116, 139, 0.45);
  border-radius: 4px;
  transition: border-color 0.14s ease, background 0.14s ease;
}

.endless-relic-row.is-affordable {
  border-color: rgba(212, 175, 55, 0.78);
}

.endless-relic-row.is-just-bought {
  border-color: #fef08a;
  box-shadow: inset 0 0 12px rgba(250, 204, 21, 0.32);
}

.endless-relic-icon-wrap {
  width: 36px;
  height: 36px;
  padding: 2px;
  background: #070912;
  border: 1.5px solid #d4af37;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.endless-relic-icon {
  width: 30px;
  height: 30px;
}

.endless-relic-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.endless-relic-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
}

.endless-relic-name {
  font-size: 0.42rem;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-relic-lv {
  font-size: 0.38rem;
  color: #fde047;
  background: rgba(250, 204, 21, 0.14);
  border: 1px solid rgba(250, 204, 21, 0.45);
  padding: 1px 4px;
  border-radius: 2px;
  flex-shrink: 0;
}

.endless-relic-bonus {
  font-size: 0.36rem;
  color: #93c5fd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-relic-sub {
  font-size: 0.32rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-buy-btn {
  min-width: 78px;
  padding: 6px 7px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-family: inherit;
  color: #fef08a;
  background: linear-gradient(180deg, #854d0e 0%, #422006 100%);
  border: 1.5px solid #facc15;
  outline: 1px solid #000;
  border-radius: 4px;
  cursor: pointer;
  text-shadow: 0 1px 0 #000;
}

.endless-buy-btn:disabled {
  color: #64748b;
  background: linear-gradient(180deg, #161b2a 0%, #0d101b 100%);
  border-color: #334155;
  cursor: not-allowed;
  opacity: 0.82;
}

.endless-buy-count {
  font-size: 0.36rem;
  color: #bae6fd;
}

.endless-buy-btn:disabled .endless-buy-count {
  color: #64748b;
}

.endless-buy-cost {
  font-size: 0.42rem;
  color: #fde047;
  white-space: nowrap;
}

.endless-buy-btn:disabled .endless-buy-cost {
  color: #94a3b8;
}

/* Companions Tab */
.endless-party-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  background: rgba(9, 12, 22, 0.94);
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
  flex-shrink: 0;
}

.endless-party-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.endless-party-counter {
  font-size: 0.44rem;
  color: #fde047;
}

.endless-party-hint {
  font-size: 0.34rem;
  color: #94a3b8;
}

.endless-party-notice {
  font-size: 0.36rem;
  color: #fca5a5;
  background: rgba(127, 29, 29, 0.55);
  border: 1px solid #ef4444;
  padding: 3px 6px;
  border-radius: 3px;
}

.endless-party-notice.hidden {
  display: none;
}

.endless-comp-card {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 8px;
  padding: 7px;
  background: linear-gradient(180deg, rgba(16, 21, 36, 0.95) 0%, rgba(10, 13, 24, 0.97) 100%);
  border: 1.5px solid rgba(100, 116, 139, 0.48);
  border-radius: 4px;
}

.endless-comp-card.is-deployed {
  border-color: #34d399;
  box-shadow: inset 0 0 12px rgba(52, 211, 153, 0.16);
}

.endless-comp-card.is-unlocked:not(.is-deployed) {
  border-color: rgba(212, 175, 55, 0.62);
}

.endless-comp-portrait-wrap {
  width: 44px;
  height: 44px;
  background: #070912;
  border: 2px solid #d4af37;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.endless-comp-portrait {
  width: 40px;
  height: 40px;
}

.endless-comp-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.endless-comp-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.endless-comp-name {
  font-size: 0.44rem;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-comp-role {
  font-size: 0.34rem;
  padding: 1px 4px;
  border-radius: 2px;
  border: 1px solid #64748b;
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
  flex-shrink: 0;
}

.endless-comp-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.35rem;
  color: #93c5fd;
}

.endless-comp-desc {
  font-size: 0.32rem;
  color: #94a3b8;
  line-height: 1.35;
}

.endless-comp-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}

.endless-comp-btn {
  flex: 1 1 0;
  min-width: 0;
  padding: 5px 6px;
  font-family: inherit;
  font-size: 0.38rem;
  color: #fef08a;
  background: linear-gradient(180deg, #854d0e 0%, #422006 100%);
  border: 1.5px solid #facc15;
  outline: 1px solid #000;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000;
}

.endless-comp-btn:disabled {
  color: #64748b;
  background: #111626;
  border-color: #334155;
  cursor: not-allowed;
}

.endless-comp-deploy-btn {
  flex: 0 0 auto;
  min-width: 72px;
  color: #e2e8f0;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-color: #64748b;
}

.endless-comp-deploy-btn.is-deployed {
  color: #d1fae5;
  background: linear-gradient(180deg, #065f46 0%, #064e3b 100%);
  border-color: #34d399;
}

.endless-comp-deploy-btn.hidden {
  display: none;
}

.endless-empty-msg {
  padding: 16px 10px;
  text-align: center;
  font-size: 0.40rem;
  color: #94a3b8;
}

.endless-empty-msg.hidden {
  display: none !important;
}

/* Stats Tab */
.endless-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.endless-stat-cell {
  padding: 6px 7px;
  background: rgba(12, 16, 29, 0.94);
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.endless-stat-label {
  font-size: 0.33rem;
  color: #94a3b8;
  letter-spacing: 0.03em;
}

.endless-stat-val {
  font-size: 0.46rem;
  color: #fef08a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-stats-actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(212, 175, 55, 0.3);
  display: flex;
  gap: 6px;
}

.endless-action-btn {
  flex: 1 1 0;
  padding: 7px 8px;
  font-family: inherit;
  font-size: 0.42rem;
  letter-spacing: 0.03em;
  color: #fef08a;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border: 1.5px solid #d4af37;
  outline: 1px solid #000;
  border-radius: 4px;
  cursor: pointer;
}

.endless-action-btn.is-danger {
  color: #fecaca;
  border-color: #b91c1c;
  background: linear-gradient(180deg, #450a0a 0%, #1f0606 100%);
}

.endless-action-btn.is-danger.is-armed {
  color: #ffffff;
  border-color: #f87171;
  background: linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%);
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.65);
}

/* =========================================================================
   WAVE 2: ACTIVE COMPANION MINI-HUD & SYNERGY BADGES
   ========================================================================= */
.endless-party-hud {
  position: absolute;
  left: max(14px, env(safe-area-inset-left));
  top: max(98px, calc(env(safe-area-inset-top) + 94px));
  z-index: 24;
  width: 184px;
  max-width: calc(100vw - 28px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  pointer-events: none;
}

.endless-party-hud.hidden {
  display: none !important;
}

.endless-party-strip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: none;
}

.endless-party-card {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding: 4px 6px 4px 4px;
  font-family: inherit;
  text-align: left;
  color: #f8fafc;
  background: linear-gradient(180deg, rgba(14, 18, 34, 0.94) 0%, rgba(7, 9, 18, 0.97) 100%);
  border: 1.5px solid #d4af37;
  outline: 1px solid #000;
  border-radius: 4px;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.24),
    0 4px 12px rgba(0, 0, 0, 0.85);
  cursor: pointer;
  pointer-events: auto;
  transition: border-color 0.14s ease, box-shadow 0.14s ease, transform 0.08s ease;
}

.endless-party-card:hover {
  border-color: #fef08a;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.36),
    0 0 10px rgba(250, 204, 21, 0.35),
    0 4px 12px rgba(0, 0, 0, 0.9);
}

.endless-party-card:active {
  transform: translateY(1px);
}

.endless-party-card.hidden {
  display: none !important;
}

.endless-party-card.is-casting-ult {
  border-color: #fef08a;
  background: linear-gradient(180deg, rgba(58, 40, 10, 0.96) 0%, rgba(20, 14, 6, 0.98) 100%);
  animation: endlessUltCastPulse 0.42s ease-in-out infinite;
}

@keyframes endlessUltCastPulse {
  0%, 100% {
    border-color: #facc15;
    box-shadow:
      inset 0 0 10px rgba(250, 204, 21, 0.45),
      0 0 12px rgba(250, 204, 21, 0.72);
  }
  50% {
    border-color: #ffffff;
    box-shadow:
      inset 0 0 16px rgba(254, 240, 138, 0.78),
      0 0 20px rgba(254, 240, 138, 0.96);
  }
}

.endless-party-port-wrap {
  width: 30px;
  height: 30px;
  padding: 1px;
  background: #060812;
  border: 1.5px solid #d4af37;
  border-radius: 3px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.endless-party-portrait {
  width: 28px;
  height: 28px;
  display: block;
}

.endless-party-meta {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.endless-party-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
}

.endless-party-name {
  font-size: 0.36rem;
  color: #f8fafc;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000;
}

.endless-party-lv {
  font-size: 0.31rem;
  color: #fde047;
  background: rgba(250, 204, 21, 0.14);
  border: 1px solid rgba(250, 204, 21, 0.45);
  border-radius: 2px;
  padding: 1px 3px;
  flex-shrink: 0;
  line-height: 1;
}

.endless-party-ult-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.endless-party-ult-track {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  height: 7px;
  background: #050712;
  border: 1px solid rgba(212, 175, 55, 0.55);
  border-radius: 2px;
  overflow: hidden;
}

.endless-party-ult-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  background: linear-gradient(90deg, #b45309 0%, #facc15 65%, #fef08a 100%);
  transition: width 0.12s linear;
}

.endless-party-card.is-casting-ult .endless-party-ult-track {
  border-color: #fef08a;
  box-shadow: 0 0 8px rgba(254, 240, 138, 0.85);
}

.endless-party-card.is-casting-ult .endless-party-ult-fill {
  width: 100% !important;
  background: linear-gradient(90deg, #facc15 0%, #ffffff 50%, #facc15 100%);
}

.endless-party-ult-tag {
  font-size: 0.27rem;
  color: #fde047;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  text-shadow: 0 1px 0 #000;
}

.endless-party-card.is-casting-ult .endless-party-ult-tag {
  color: #ffffff;
}

/* Active Synergy Badges below/beside Party Strip */
.endless-synergy-hud {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  pointer-events: auto;
}

.endless-synergy-hud.hidden {
  display: none !important;
}

.endless-synergy-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 5px;
  font-size: 0.30rem;
  letter-spacing: 0.03em;
  color: #fef08a;
  background: linear-gradient(180deg, rgba(16, 20, 36, 0.94) 0%, rgba(8, 10, 19, 0.96) 100%);
  border: 1px solid #d4af37;
  outline: 1px solid #000;
  border-radius: 3px;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.78);
}

.endless-synergy-badge-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Companions Tab Header Party Synergies Box */
.endless-party-synergies-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(212, 175, 55, 0.22);
}

.endless-party-syn-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.endless-party-syn-title {
  font-size: 0.34rem;
  color: #fde047;
  letter-spacing: 0.04em;
}

.endless-party-syn-count {
  font-size: 0.31rem;
  color: #94a3b8;
}

.endless-party-syn-count.is-active {
  color: #34d399;
}

.endless-party-syn-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.endless-party-syn-empty {
  font-size: 0.30rem;
  color: #64748b;
  line-height: 1.35;
}

.endless-party-syn-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px;
  background: rgba(12, 16, 29, 0.94);
  border: 1px solid rgba(212, 175, 55, 0.45);
  border-left: 3px solid #facc15;
  border-radius: 3px;
}

.endless-party-syn-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.34rem;
  color: #fef08a;
  letter-spacing: 0.03em;
}

.endless-party-syn-desc {
  font-size: 0.30rem;
  color: #cbd5e1;
  line-height: 1.3;
}

/* =========================================================================
   WAVE 2: REAL-TIME DPS BREAKDOWN CARD & DRAWER TELEMETRY FOOTER STRIP
   ========================================================================= */
.endless-dps-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 7px 8px;
  background: linear-gradient(180deg, rgba(16, 21, 38, 0.96) 0%, rgba(9, 12, 22, 0.98) 100%);
  border: 1.5px solid rgba(212, 175, 55, 0.72);
  outline: 1px solid #000;
  border-radius: 4px;
  box-shadow: inset 0 1px 0 rgba(254, 240, 138, 0.2);
}

.endless-dps-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.endless-dps-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.40rem;
  color: #fde047;
  letter-spacing: 0.04em;
}

.endless-dps-fever-pill {
  font-size: 0.31rem;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(250, 204, 21, 0.18);
  border: 1px solid #facc15;
  color: #fef08a;
}

.endless-dps-fever-pill.hidden {
  display: none !important;
}

.endless-dps-bar-track {
  display: flex;
  width: 100%;
  height: 12px;
  background: #050712;
  border: 1px solid rgba(212, 175, 55, 0.65);
  border-radius: 3px;
  overflow: hidden;
}

.endless-dps-bar-track.is-slim {
  height: 6px;
  border-color: rgba(212, 175, 55, 0.48);
}

.endless-dps-seg {
  height: 100%;
  width: 0%;
  transition: width 0.16s linear;
}

.endless-dps-seg.is-hero {
  background: linear-gradient(180deg, #7dd3fc 0%, #38bdf8 55%, #0284c7 100%);
}

.endless-dps-seg.is-tap {
  background: linear-gradient(180deg, #fef08a 0%, #facc15 55%, #ca8a04 100%);
}

.endless-dps-seg.is-party {
  background: linear-gradient(180deg, #e9d5ff 0%, #c084fc 55%, #9333ea 100%);
}

.endless-dps-legend {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}

.endless-dps-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 5px;
  background: rgba(7, 9, 18, 0.85);
  border: 1px solid rgba(71, 85, 105, 0.45);
  border-radius: 3px;
  min-width: 0;
}

.endless-dps-col-head {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.29rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-dps-swatch {
  width: 7px;
  height: 7px;
  border: 1px solid #000;
  flex-shrink: 0;
}

.endless-dps-swatch.is-hero {
  background: #38bdf8;
}

.endless-dps-swatch.is-tap {
  background: #facc15;
}

.endless-dps-swatch.is-party {
  background: #c084fc;
}

.endless-dps-col-val {
  font-size: 0.39rem;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-dps-col-pct {
  font-size: 0.30rem;
  color: #cbd5e1;
}

.endless-dps-col.is-hero .endless-dps-col-pct {
  color: #38bdf8;
}

.endless-dps-col.is-tap .endless-dps-col-pct {
  color: #facc15;
}

.endless-dps-col.is-party .endless-dps-col-pct {
  color: #c084fc;
}

.endless-dps-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid rgba(212, 175, 55, 0.22);
  font-size: 0.34rem;
}

.endless-dps-sum-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  white-space: nowrap;
}

.endless-dps-sum-lbl {
  color: #94a3b8;
  font-size: 0.30rem;
}

.endless-dps-sum-val {
  color: #fef08a;
  font-size: 0.38rem;
}

.endless-dps-sum-val.is-gold {
  color: #facc15;
}

/* Compact Expandable Live Telemetry Footer Strip in Drawer */
.endless-drawer-telemetry {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  background: linear-gradient(180deg, rgba(12, 15, 27, 0.96) 0%, rgba(7, 9, 17, 0.99) 100%);
  border-top: 1.5px solid rgba(212, 175, 55, 0.58);
  flex-shrink: 0;
}

.endless-telem-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.endless-telem-metrics {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.endless-telem-pair {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  font-size: 0.34rem;
}

.endless-telem-key {
  color: #94a3b8;
  font-size: 0.29rem;
}

.endless-telem-val {
  color: #fef08a;
}

.endless-telem-val.is-gold {
  color: #facc15;
}

.endless-telem-expand-btn {
  font-family: inherit;
  font-size: 0.29rem;
  letter-spacing: 0.03em;
  padding: 2px 5px;
  color: #fde047;
  background: rgba(15, 21, 36, 0.95);
  border: 1px solid rgba(212, 175, 55, 0.58);
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.endless-telem-expand-btn:hover {
  border-color: #fef08a;
  color: #ffffff;
}

.endless-telem-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding-top: 2px;
}

.endless-telem-details.hidden {
  display: none !important;
}

.endless-telem-chip {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 4px;
  background: rgba(6, 9, 18, 0.92);
  border: 1px solid rgba(71, 85, 105, 0.45);
  border-radius: 3px;
  font-size: 0.28rem;
  min-width: 0;
}

.endless-telem-chip.is-hero {
  border-left: 2px solid #38bdf8;
}

.endless-telem-chip.is-tap {
  border-left: 2px solid #facc15;
}

.endless-telem-chip.is-party {
  border-left: 2px solid #c084fc;
}

.endless-telem-chip-lbl {
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-telem-chip-val {
  color: #f8fafc;
  font-size: 0.31rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* =========================================================================
   WAVE 2: RESPONSIVE BUY-PULSE FEEDBACK & FLOATING MICRO-BADGES
   ========================================================================= */
.endless-relic-row.is-buy-pulse,
.endless-comp-card.is-buy-pulse,
.endless-artifact-row.is-buy-pulse,
.endless-gear-slot-card.is-buy-pulse,
.endless-gear-bag-row.is-buy-pulse {
  animation: endlessBuyPulse 0.44s ease-out;
}

.endless-buy-btn.is-buy-pulse,
.endless-comp-btn.is-buy-pulse,
.endless-artifact-buy-btn.is-buy-pulse,
.endless-ascend-btn.is-buy-pulse,
.endless-gear-hdr-btn.is-buy-pulse,
.endless-gear-enh-btn.is-buy-pulse,
.endless-gear-act-btn.is-buy-pulse {
  animation: endlessBuyBtnPulse 0.38s ease-out;
}

@keyframes endlessBuyPulse {
  0% {
    border-color: #ffffff;
    box-shadow:
      0 0 0 1px #fef08a,
      0 0 16px rgba(250, 204, 21, 0.88),
      inset 0 0 16px rgba(250, 204, 21, 0.42);
  }
  45% {
    border-color: #fde047;
    box-shadow:
      0 0 12px rgba(250, 204, 21, 0.58),
      inset 0 0 10px rgba(250, 204, 21, 0.22);
  }
  100% {
    border-color: rgba(212, 175, 55, 0.78);
    box-shadow: none;
  }
}

@keyframes endlessBuyBtnPulse {
  0% {
    border-color: #ffffff;
    box-shadow: 0 0 14px rgba(254, 240, 138, 0.95), inset 0 0 8px rgba(255, 255, 255, 0.45);
    filter: brightness(1.26);
  }
  100% {
    border-color: #facc15;
    box-shadow: none;
    filter: brightness(1);
  }
}

.endless-fx-layer {
  position: absolute;
  inset: 0;
  z-index: 42;
  pointer-events: none;
  overflow: hidden;
}

.endless-micro-badge {
  position: absolute;
  left: 0;
  top: 0;
  padding: 2px 5px;
  font-family: 'ArcanePixel', 'Press Start 2P', monospace;
  font-size: 0.38rem;
  letter-spacing: 0.04em;
  color: #090c14;
  background: linear-gradient(180deg, #fef08a 0%, #facc15 100%);
  border: 1.5px solid #ffffff;
  outline: 1px solid #000;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 0 10px rgba(250, 204, 21, 0.85), 0 2px 6px rgba(0, 0, 0, 0.9);
  animation: endlessMicroBadgeFloat 0.68s ease-out forwards;
}

.endless-micro-badge.is-recruit {
  color: #ffffff;
  background: linear-gradient(180deg, #a855f7 0%, #6b21a8 100%);
  border-color: #fef08a;
  box-shadow: 0 0 12px rgba(192, 132, 252, 0.9), 0 2px 6px rgba(0, 0, 0, 0.9);
}

@keyframes endlessMicroBadgeFloat {
  0% {
    opacity: 0;
    transform: translate(-50%, 4px) scale(0.82);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -8px) scale(1.06);
  }
  74% {
    opacity: 1;
    transform: translate(-50%, -20px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -30px) scale(0.95);
  }
}

/* =========================================================================
   WAVE 3: ASTRAL ASCENSION TAB & ETERNAL ARTIFACTS
   ========================================================================= */
.endless-ascend-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px 9px 10px;
  background: linear-gradient(180deg, rgba(34, 18, 62, 0.96) 0%, rgba(11, 10, 26, 0.99) 100%);
  border: 2px solid #d4af37;
  outline: 1px solid #000;
  border-radius: 5px;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.34),
    inset 0 0 20px rgba(168, 85, 247, 0.22),
    0 5px 14px rgba(0, 0, 0, 0.85);
}

.endless-ascend-card.is-ascend-flash {
  animation: endlessAscendFlash 0.68s ease-out;
}

@keyframes endlessAscendFlash {
  0% {
    border-color: #ffffff;
    box-shadow:
      0 0 0 2px #fef08a,
      0 0 26px rgba(250, 204, 21, 0.95),
      inset 0 0 28px rgba(254, 240, 138, 0.65);
    filter: brightness(1.3);
  }
  45% {
    border-color: #fde047;
    box-shadow:
      0 0 18px rgba(192, 132, 252, 0.85),
      inset 0 0 22px rgba(250, 204, 21, 0.38);
    filter: brightness(1.1);
  }
  100% {
    border-color: #d4af37;
    box-shadow:
      inset 0 1px 0 rgba(254, 240, 138, 0.34),
      inset 0 0 20px rgba(168, 85, 247, 0.22),
      0 5px 14px rgba(0, 0, 0, 0.85);
    filter: brightness(1);
  }
}

.endless-ascend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.endless-ascend-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.endless-ascend-crest {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.endless-ascend-title {
  font-size: 0.45rem;
  color: #fef08a;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-ascend-count {
  font-size: 0.33rem;
  color: #e9d5ff;
  background: rgba(88, 28, 135, 0.65);
  border: 1px solid #c084fc;
  border-radius: 3px;
  padding: 2px 5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.endless-ascend-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.endless-ascend-plaque {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 7px;
  background: rgba(8, 10, 22, 0.92);
  border: 1px solid rgba(192, 132, 252, 0.42);
  border-radius: 4px;
  min-width: 0;
}

.endless-ascend-plaque.is-preview {
  border-color: rgba(250, 204, 21, 0.52);
  background: linear-gradient(180deg, rgba(35, 19, 64, 0.88) 0%, rgba(10, 10, 24, 0.94) 100%);
}

.endless-ascend-plaque-lbl {
  font-size: 0.29rem;
  color: #a5b4fc;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-ascend-plaque-val-row {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.endless-ascend-shard-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.endless-ascend-plaque-val {
  font-size: 0.42rem;
  color: #7dd3fc;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-ascend-plaque-val.is-pending {
  font-size: 0.35rem;
  color: #fde047;
}

.endless-ascend-plaque-val.is-locked {
  color: #64748b;
}

.endless-ascend-note {
  font-size: 0.29rem;
  color: #cbd5e1;
  line-height: 1.4;
  letter-spacing: 0.02em;
}

.endless-ascend-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 10px;
  font-family: inherit;
  font-size: 0.43rem;
  letter-spacing: 0.04em;
  color: #fffbeb;
  background: linear-gradient(180deg, #7e22ce 0%, #4c1d95 62%, #2e1065 100%);
  border: 2px solid #facc15;
  outline: 1px solid #000;
  border-radius: 4px;
  cursor: pointer;
  text-shadow: 0 1px 0 #000;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.48),
    0 0 12px rgba(168, 85, 247, 0.45);
  transition: transform 0.08s ease, border-color 0.14s ease, box-shadow 0.14s ease;
}

.endless-ascend-btn:hover:not(:disabled) {
  border-color: #fef08a;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.65),
    0 0 16px rgba(192, 132, 252, 0.72);
}

.endless-ascend-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.endless-ascend-btn:disabled {
  color: #64748b;
  background: linear-gradient(180deg, #161b2a 0%, #0c101b 100%);
  border-color: #334155;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.86;
}

.endless-ascend-btn.is-armed {
  color: #ffffff;
  background: linear-gradient(180deg, #b45309 0%, #7e22ce 55%, #581c87 100%);
  border-color: #fef08a;
  animation: endlessBossPulse 0.85s ease-in-out infinite;
}

.endless-ascend-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 2px 2px 0;
}

.endless-ascend-section-title {
  font-size: 0.39rem;
  color: #e9d5ff;
  letter-spacing: 0.04em;
}

.endless-ascend-section-sub {
  font-size: 0.31rem;
  color: #94a3b8;
}

.endless-artifact-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.endless-artifact-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 6px;
  background: linear-gradient(180deg, rgba(20, 16, 39, 0.95) 0%, rgba(10, 11, 24, 0.97) 100%);
  border: 1.5px solid rgba(100, 116, 139, 0.45);
  border-radius: 4px;
  transition: border-color 0.14s ease, background 0.14s ease;
}

.endless-artifact-row.is-affordable {
  border-color: rgba(192, 132, 252, 0.85);
  box-shadow: inset 0 0 10px rgba(168, 85, 247, 0.14);
}

.endless-artifact-row.is-maxed {
  border-color: rgba(212, 175, 55, 0.72);
}

.endless-artifact-icon-wrap {
  width: 36px;
  height: 36px;
  padding: 2px;
  background: #070914;
  border: 1.5px solid #c084fc;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.endless-artifact-icon {
  width: 30px;
  height: 30px;
}

.endless-artifact-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.endless-artifact-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
}

.endless-artifact-name {
  font-size: 0.40rem;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-artifact-lv {
  font-size: 0.34rem;
  color: #e9d5ff;
  background: rgba(168, 85, 247, 0.22);
  border: 1px solid rgba(192, 132, 252, 0.55);
  padding: 1px 4px;
  border-radius: 2px;
  flex-shrink: 0;
  white-space: nowrap;
}

.endless-artifact-row.is-maxed .endless-artifact-lv {
  color: #fef08a;
  background: rgba(250, 204, 21, 0.18);
  border-color: #facc15;
}

.endless-artifact-effect {
  font-size: 0.34rem;
  color: #7dd3fc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-artifact-desc {
  font-size: 0.30rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-artifact-buy-btn {
  min-width: 82px;
  padding: 6px 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-size: 0.36rem;
  letter-spacing: 0.02em;
  color: #fef08a;
  background: linear-gradient(180deg, #6d28d9 0%, #3b0764 100%);
  border: 1.5px solid #d8b4fe;
  outline: 1px solid #000;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  text-shadow: 0 1px 0 #000;
  transition: transform 0.08s ease;
}

.endless-artifact-buy-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.endless-artifact-buy-btn:disabled {
  color: #64748b;
  background: linear-gradient(180deg, #161b2a 0%, #0d101b 100%);
  border-color: #334155;
  cursor: not-allowed;
  opacity: 0.84;
}

.endless-artifact-buy-btn.is-maxed,
.endless-artifact-buy-btn.is-maxed:disabled {
  color: #fef08a;
  background: linear-gradient(180deg, #422006 0%, #1c1205 100%);
  border-color: #d4af37;
  opacity: 1;
}

/* =========================================================================
   WAVE 3: WELCOME BACK OFFLINE LOOT MODAL (z-index: 48)
   ========================================================================= */
.endless-offline-modal {
  position: absolute;
  inset: 0;
  z-index: 48;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(4, 6, 14, 0.78);
  pointer-events: auto;
  overflow: hidden;
}

.endless-offline-modal.hidden {
  display: none !important;
}

.endless-offline-card {
  width: min(444px, calc(100% - 8px));
  max-height: calc(100% - 12px);
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 11px;
  padding: 15px 16px;
  background: linear-gradient(180deg, rgba(18, 22, 42, 0.98) 0%, rgba(8, 10, 20, 0.99) 100%);
  border: 2px solid #d4af37;
  outline: 2px solid #000;
  border-radius: 6px;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.36),
    inset 0 0 24px rgba(212, 175, 55, 0.16),
    0 14px 40px rgba(0, 0, 0, 0.95);
  animation: endlessModalPop 0.22s ease-out;
}

@keyframes endlessModalPop {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.endless-offline-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 1.5px solid rgba(212, 175, 55, 0.45);
}

.endless-offline-title {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 0.62rem;
  color: #fef08a;
  letter-spacing: 0.05em;
  text-shadow: 0 2px 0 #000;
  line-height: 1.35;
}

.endless-offline-subtitle {
  font-size: 0.34rem;
  color: #cbd5e1;
  letter-spacing: 0.03em;
}

.endless-offline-badges {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
}

.endless-offline-away-badge {
  padding: 4px 8px;
  font-size: 0.39rem;
  color: #fef08a;
  background: rgba(12, 16, 30, 0.96);
  border: 1.5px solid rgba(212, 175, 55, 0.72);
  border-radius: 3px;
  text-shadow: 0 1px 0 #000;
}

.endless-offline-cap-badge {
  padding: 4px 7px;
  font-size: 0.34rem;
  color: #e9d5ff;
  background: rgba(88, 28, 135, 0.72);
  border: 1.5px solid #c084fc;
  border-radius: 3px;
  text-shadow: 0 1px 0 #000;
}

.endless-offline-cap-badge.hidden {
  display: none !important;
}

.endless-offline-stages-badge {
  padding: 4px 7px;
  font-size: 0.33rem;
  color: #bae6fd;
  background: rgba(12, 34, 58, 0.78);
  border: 1px solid rgba(56, 189, 248, 0.55);
  border-radius: 3px;
}

.endless-offline-stages-badge.hidden {
  display: none !important;
}

.endless-offline-rewards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.endless-offline-plaque {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  padding: 11px 8px;
  background: linear-gradient(180deg, rgba(14, 18, 34, 0.96) 0%, rgba(7, 9, 18, 0.98) 100%);
  border: 2px solid #d4af37;
  outline: 1px solid #000;
  border-radius: 5px;
  min-width: 0;
  box-shadow: inset 0 1px 0 rgba(254, 240, 138, 0.24);
}

.endless-offline-plaque.is-gold {
  border-color: #facc15;
  background: linear-gradient(180deg, rgba(44, 32, 10, 0.92) 0%, rgba(15, 11, 5, 0.98) 100%);
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.35),
    0 0 14px rgba(250, 204, 21, 0.22);
}

.endless-offline-plaque.is-shard {
  border-color: #c084fc;
  background: linear-gradient(180deg, rgba(35, 18, 66, 0.92) 0%, rgba(12, 10, 26, 0.98) 100%);
  box-shadow:
    inset 0 1px 0 rgba(233, 213, 255, 0.3),
    0 0 14px rgba(168, 85, 247, 0.22);
}

.endless-offline-plaque.is-empty {
  opacity: 0.62;
  border-color: #475569;
  box-shadow: none;
}

.endless-offline-plaque-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.endless-offline-plaque-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;
  max-width: 100%;
}

.endless-offline-plaque-val {
  font-size: 0.50rem;
  letter-spacing: 0.03em;
  text-shadow: 0 1px 0 #000;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-offline-plaque.is-gold .endless-offline-plaque-val {
  color: #fde047;
}

.endless-offline-plaque.is-shard .endless-offline-plaque-val {
  color: #7dd3fc;
}

.endless-offline-plaque-lbl {
  font-size: 0.31rem;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

.endless-offline-actions {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 8px;
  padding-top: 2px;
}

.endless-offline-collect-btn,
.endless-offline-continue-btn {
  padding: 10px 10px;
  font-family: inherit;
  font-size: 0.45rem;
  letter-spacing: 0.04em;
  border-radius: 4px;
  outline: 1px solid #000;
  cursor: pointer;
  white-space: nowrap;
  text-shadow: 0 1px 0 #000;
  transition: transform 0.08s ease, box-shadow 0.14s ease, border-color 0.14s ease;
}

.endless-offline-collect-btn {
  color: #fffbeb;
  background: linear-gradient(180deg, #b45309 0%, #78350f 65%, #451a03 100%);
  border: 2px solid #facc15;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.55),
    0 0 14px rgba(250, 204, 21, 0.45);
}

.endless-offline-collect-btn:hover {
  border-color: #fef08a;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.72),
    0 0 18px rgba(250, 204, 21, 0.75);
}

.endless-offline-continue-btn {
  color: #e2e8f0;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border: 1.5px solid #d4af37;
}

.endless-offline-continue-btn:hover {
  color: #fef08a;
  border-color: #fef08a;
}

.endless-offline-collect-btn:active,
.endless-offline-continue-btn:active {
  transform: translateY(1px);
}

/* =========================================================================
   RESPONSIVE ERGONOMICS: MOBILE LANDSCAPE (844x390) & PORTRAIT (390x844)
   ========================================================================= */
@media (max-height: 500px) {
  .endless-top-stack {
    top: max(52px, calc(env(safe-area-inset-top) + 48px));
    left: max(8px, env(safe-area-inset-left));
    right: max(140px, calc(env(safe-area-inset-right) + 134px));
    transform: none;
    width: auto;
    max-width: none;
    align-items: center;
    gap: 3px;
  }

  .endless-top-bar {
    width: max-content;
    max-width: 100%;
    padding: 2px 6px;
    gap: 3px 5px;
    border-width: 1.5px;
  }

  .endless-stage-badge {
    font-size: 0.36rem;
    padding: 2px 5px;
    gap: 4px;
  }

  .endless-loop-pill {
    font-size: 0.30rem;
    padding: 1px 3px;
  }

  .endless-wave-meter {
    min-width: 82px;
    height: 15px;
    padding: 0 5px;
  }

  .endless-wave-label {
    font-size: 0.33rem;
  }

  .endless-currency-group {
    gap: 4px;
  }

  .endless-currency-pill {
    font-size: 0.36rem;
    padding: 1px 5px 1px 3px;
    gap: 4px;
  }

  .endless-currency-icon {
    width: 13px;
    height: 13px;
  }

  .endless-fever-meter {
    width: 76px;
    height: 14px;
  }

  .endless-fever-label {
    font-size: 0.29rem;
  }

  .endless-autoboss-btn,
  .endless-challenge-boss-btn {
    font-size: 0.35rem;
    padding: 3px 6px;
  }

  #endless-shop-toggle {
    top: max(52px, calc(env(safe-area-inset-top) + 48px));
    right: max(8px, env(safe-area-inset-right));
    padding: 3px 8px 3px 5px;
    font-size: 0.36rem;
    gap: 5px;
  }

  .endless-toggle-icon {
    width: 15px;
    height: 15px;
  }

  .endless-shop-shell {
    top: max(82px, calc(env(safe-area-inset-top) + 78px));
    right: max(8px, env(safe-area-inset-right));
    bottom: max(6px, env(safe-area-inset-bottom));
    width: min(332px, 50vw);
    z-index: 34;
  }

  .endless-drawer-header {
    padding: 5px 8px;
  }

  .endless-drawer-title {
    font-size: 0.44rem;
  }

  .endless-drawer-close {
    width: 21px;
    height: 21px;
  }

  .endless-tab-bar {
    padding: 4px 5px;
  }

  .endless-tab-btn {
    font-size: 0.33rem;
    padding: 4px 2px;
  }

  .endless-bulk-bar {
    padding: 4px 7px;
  }

  .endless-bulk-btn {
    padding: 3px 7px;
    font-size: 0.38rem;
  }

  .endless-scroll-list {
    padding: 5px 6px 8px;
    gap: 5px;
  }

  .endless-relic-row {
    grid-template-columns: 32px minmax(0, 1fr) auto;
    gap: 5px;
    padding: 5px;
  }

  .endless-relic-icon-wrap {
    width: 32px;
    height: 32px;
  }

  .endless-relic-icon {
    width: 26px;
    height: 26px;
  }

  .endless-relic-name {
    font-size: 0.38rem;
  }

  .endless-relic-lv {
    font-size: 0.33rem;
    padding: 1px 3px;
  }

  .endless-buy-btn {
    min-width: 68px;
    padding: 5px 5px;
  }

  .endless-artifact-row {
    grid-template-columns: 32px minmax(0, 1fr) auto;
    gap: 5px;
    padding: 5px;
  }

  .endless-artifact-icon-wrap {
    width: 32px;
    height: 32px;
  }

  .endless-artifact-icon {
    width: 26px;
    height: 26px;
  }

  .endless-artifact-buy-btn {
    min-width: 74px;
    padding: 5px 5px;
    font-size: 0.33rem;
  }

  .endless-ascend-card {
    padding: 7px 8px;
    gap: 5px;
  }

  .endless-ascend-btn {
    padding: 7px 8px;
    font-size: 0.39rem;
  }

  .endless-drawer-telemetry {
    padding: 4px 7px;
    gap: 3px;
  }

  .endless-party-bar {
    padding: 4px 6px;
    gap: 2px;
  }

  .endless-party-synergies-box {
    gap: 2px;
    padding-top: 3px;
  }

  .endless-party-syn-list {
    max-height: 56px;
    overflow-y: auto;
    gap: 2px;
    scrollbar-width: thin;
    scrollbar-color: #d4af37 #0a0d18;
  }

  .endless-party-syn-pill {
    padding: 2px 5px;
    gap: 1px;
  }

  .endless-party-hud {
    left: max(8px, env(safe-area-inset-left));
    top: max(104px, calc(env(safe-area-inset-top) + 100px));
    width: auto;
    max-width: min(296px, calc(100vw - 16px));
    gap: 3px;
  }

  .endless-party-strip {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 4px;
  }

  .endless-party-card {
    width: 92px;
    padding: 3px 4px;
    gap: 3px;
  }

  .endless-party-port-wrap {
    width: 24px;
    height: 24px;
  }

  .endless-party-portrait {
    width: 22px;
    height: 22px;
  }

  .endless-party-name {
    font-size: 0.30rem;
  }

  .endless-party-lv {
    font-size: 0.26rem;
    padding: 1px 2px;
  }

  .endless-party-ult-track {
    height: 6px;
  }

  .endless-party-ult-tag {
    font-size: 0.24rem;
  }

  .endless-synergy-badge {
    font-size: 0.27rem;
    padding: 2px 4px;
  }

  .endless-offline-modal {
    padding: 8px 10px;
  }

  .endless-offline-card {
    width: min(432px, calc(100% - 8px));
    padding: 10px 12px;
    gap: 7px;
  }

  .endless-offline-header {
    gap: 3px;
    padding-bottom: 6px;
  }

  .endless-offline-title {
    font-size: 0.50rem;
  }

  .endless-offline-subtitle {
    font-size: 0.30rem;
  }

  .endless-offline-away-badge {
    font-size: 0.34rem;
    padding: 3px 6px;
  }

  .endless-offline-cap-badge,
  .endless-offline-stages-badge {
    font-size: 0.29rem;
    padding: 3px 5px;
  }

  .endless-offline-rewards {
    gap: 7px;
  }

  .endless-offline-plaque {
    flex-direction: row;
    text-align: left;
    gap: 8px;
    padding: 7px 9px;
  }

  .endless-offline-plaque-meta {
    align-items: flex-start;
  }

  .endless-offline-plaque-icon {
    width: 26px;
    height: 26px;
  }

  .endless-offline-plaque-val {
    font-size: 0.42rem;
  }

  .endless-offline-plaque-lbl {
    font-size: 0.27rem;
  }

  .endless-offline-collect-btn,
  .endless-offline-continue-btn {
    padding: 7px 8px;
    font-size: 0.39rem;
  }
}

html.is-mobile-landscape .endless-top-stack {
  top: max(52px, calc(env(safe-area-inset-top) + 48px));
  left: max(8px, env(safe-area-inset-left));
  right: max(140px, calc(env(safe-area-inset-right) + 134px));
  transform: none;
  width: auto;
  max-width: none;
  align-items: center;
  gap: 3px;
}

html.is-mobile-landscape .endless-top-bar {
  width: max-content;
  max-width: 100%;
  padding: 2px 6px;
  gap: 3px 5px;
  border-width: 1.5px;
}

html.is-mobile-landscape .endless-stage-badge {
  font-size: 0.36rem;
  padding: 2px 5px;
  gap: 4px;
}

html.is-mobile-landscape .endless-loop-pill {
  font-size: 0.30rem;
  padding: 1px 3px;
}

html.is-mobile-landscape .endless-wave-meter {
  min-width: 82px;
  height: 15px;
  padding: 0 5px;
}

html.is-mobile-landscape .endless-wave-label {
  font-size: 0.33rem;
}

html.is-mobile-landscape .endless-currency-group {
  gap: 4px;
}

html.is-mobile-landscape .endless-currency-pill {
  font-size: 0.36rem;
  padding: 1px 5px 1px 3px;
  gap: 4px;
}

html.is-mobile-landscape .endless-currency-icon {
  width: 13px;
  height: 13px;
}

html.is-mobile-landscape .endless-fever-meter {
  width: 76px;
  height: 14px;
}

html.is-mobile-landscape .endless-fever-label {
  font-size: 0.29rem;
}

html.is-mobile-landscape .endless-autoboss-btn,
html.is-mobile-landscape .endless-challenge-boss-btn {
  font-size: 0.35rem;
  padding: 3px 6px;
}

html.is-mobile-landscape #endless-shop-toggle {
  top: max(52px, calc(env(safe-area-inset-top) + 48px));
  right: max(8px, env(safe-area-inset-right));
  padding: 3px 8px 3px 5px;
  font-size: 0.36rem;
  gap: 5px;
}

html.is-mobile-landscape .endless-toggle-icon {
  width: 15px;
  height: 15px;
}

html.is-mobile-landscape .endless-shop-shell {
  top: max(82px, calc(env(safe-area-inset-top) + 78px));
  right: max(8px, env(safe-area-inset-right));
  bottom: max(6px, env(safe-area-inset-bottom));
  width: min(332px, 50vw);
  z-index: 34;
}

html.is-mobile-landscape .endless-drawer-header {
  padding: 5px 8px;
}

html.is-mobile-landscape .endless-drawer-title {
  font-size: 0.44rem;
}

html.is-mobile-landscape .endless-drawer-close {
  width: 21px;
  height: 21px;
}

html.is-mobile-landscape .endless-tab-bar {
  padding: 4px 5px;
}

html.is-mobile-landscape .endless-tab-btn {
  font-size: 0.33rem;
  padding: 4px 2px;
}

html.is-mobile-landscape .endless-bulk-bar {
  padding: 4px 7px;
}

html.is-mobile-landscape .endless-bulk-btn {
  padding: 3px 7px;
  font-size: 0.38rem;
}

html.is-mobile-landscape .endless-scroll-list {
  padding: 5px 6px 8px;
  gap: 5px;
}

html.is-mobile-landscape .endless-relic-row {
  grid-template-columns: 32px minmax(0, 1fr) auto;
  gap: 5px;
  padding: 5px;
}

html.is-mobile-landscape .endless-relic-icon-wrap {
  width: 32px;
  height: 32px;
}

html.is-mobile-landscape .endless-relic-icon {
  width: 26px;
  height: 26px;
}

html.is-mobile-landscape .endless-relic-name {
  font-size: 0.38rem;
}

html.is-mobile-landscape .endless-relic-lv {
  font-size: 0.33rem;
  padding: 1px 3px;
}

html.is-mobile-landscape .endless-buy-btn {
  min-width: 68px;
  padding: 5px 5px;
}

html.is-mobile-landscape .endless-artifact-row {
  grid-template-columns: 32px minmax(0, 1fr) auto;
  gap: 5px;
  padding: 5px;
}

html.is-mobile-landscape .endless-artifact-icon-wrap {
  width: 32px;
  height: 32px;
}

html.is-mobile-landscape .endless-artifact-icon {
  width: 26px;
  height: 26px;
}

html.is-mobile-landscape .endless-artifact-buy-btn {
  min-width: 74px;
  padding: 5px 5px;
  font-size: 0.33rem;
}

html.is-mobile-landscape .endless-ascend-card {
  padding: 7px 8px;
  gap: 5px;
}

html.is-mobile-landscape .endless-ascend-btn {
  padding: 7px 8px;
  font-size: 0.39rem;
}

html.is-mobile-landscape .endless-drawer-telemetry {
  padding: 4px 7px;
  gap: 3px;
}

html.is-mobile-landscape .endless-party-bar {
  padding: 4px 6px;
  gap: 2px;
}

html.is-mobile-landscape .endless-party-synergies-box {
  gap: 2px;
  padding-top: 3px;
}

html.is-mobile-landscape .endless-party-syn-list {
  max-height: 56px;
  overflow-y: auto;
  gap: 2px;
  scrollbar-width: thin;
  scrollbar-color: #d4af37 #0a0d18;
}

html.is-mobile-landscape .endless-party-syn-pill {
  padding: 2px 5px;
  gap: 1px;
}

html.is-mobile-landscape .endless-party-hud {
  left: max(8px, env(safe-area-inset-left));
  top: max(104px, calc(env(safe-area-inset-top) + 100px));
  width: auto;
  max-width: min(296px, calc(100vw - 16px));
  gap: 3px;
}

html.is-mobile-landscape .endless-party-strip {
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 4px;
}

html.is-mobile-landscape .endless-party-card {
  width: 92px;
  padding: 3px 4px;
  gap: 3px;
}

html.is-mobile-landscape .endless-party-port-wrap {
  width: 24px;
  height: 24px;
}

html.is-mobile-landscape .endless-party-portrait {
  width: 22px;
  height: 22px;
}

html.is-mobile-landscape .endless-party-name {
  font-size: 0.30rem;
}

html.is-mobile-landscape .endless-party-lv {
  font-size: 0.26rem;
  padding: 1px 2px;
}

html.is-mobile-landscape .endless-party-ult-track {
  height: 6px;
}

html.is-mobile-landscape .endless-party-ult-tag {
  font-size: 0.24rem;
}

html.is-mobile-landscape .endless-synergy-badge {
  font-size: 0.27rem;
  padding: 2px 4px;
}

html.is-mobile-landscape .endless-offline-modal {
  padding: 8px 10px;
}

html.is-mobile-landscape .endless-offline-card {
  width: min(432px, calc(100% - 8px));
  padding: 10px 12px;
  gap: 7px;
}

html.is-mobile-landscape .endless-offline-plaque {
  flex-direction: row;
  text-align: left;
  gap: 8px;
  padding: 7px 9px;
}

html.is-mobile-landscape .endless-offline-plaque-meta {
  align-items: flex-start;
}

html.is-mobile-landscape .endless-offline-plaque-icon {
  width: 26px;
  height: 26px;
}

html.is-mobile-landscape .endless-offline-plaque-val {
  font-size: 0.42rem;
}

html.is-mobile-landscape .endless-offline-collect-btn,
html.is-mobile-landscape .endless-offline-continue-btn {
  padding: 7px 8px;
  font-size: 0.39rem;
}

@media (max-width: 560px) and (orientation: portrait) {
  html:not(.is-mobile-landscape) .endless-top-stack {
    top: max(56px, calc(env(safe-area-inset-top) + 52px));
    left: 6px;
    right: 6px;
    transform: none;
    width: auto;
    max-width: none;
    gap: 4px;
  }

  html:not(.is-mobile-landscape) .endless-top-bar {
    width: 100%;
    padding: 4px 6px;
    gap: 4px 5px;
  }

  html:not(.is-mobile-landscape) .endless-stage-badge {
    font-size: 0.38rem;
    padding: 2px 5px;
  }

  html:not(.is-mobile-landscape) .endless-wave-meter {
    min-width: 92px;
    height: 16px;
  }

  html:not(.is-mobile-landscape) .endless-wave-label {
    font-size: 0.35rem;
  }

  html:not(.is-mobile-landscape) .endless-currency-pill {
    font-size: 0.39rem;
    padding: 2px 5px 2px 3px;
  }

  html:not(.is-mobile-landscape) .endless-currency-icon {
    width: 15px;
    height: 15px;
  }

  html:not(.is-mobile-landscape) .endless-fever-meter {
    width: 70px;
    height: 15px;
  }

  html:not(.is-mobile-landscape) .endless-boss-controls {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  html:not(.is-mobile-landscape) .endless-autoboss-btn,
  html:not(.is-mobile-landscape) .endless-challenge-boss-btn {
    font-size: 0.37rem;
    padding: 4px 7px;
  }

  html:not(.is-mobile-landscape) #endless-shop-toggle {
    top: max(142px, calc(env(safe-area-inset-top) + 138px));
    right: max(6px, env(safe-area-inset-right));
    padding: 4px 8px 4px 6px;
    font-size: 0.39rem;
  }

  html:not(.is-mobile-landscape) .endless-toggle-icon {
    width: 18px;
    height: 18px;
  }

  html:not(.is-mobile-landscape) .endless-party-hud {
    left: 6px;
    right: 6px;
    top: max(176px, calc(env(safe-area-inset-top) + 172px));
    width: auto;
    max-width: none;
    align-items: stretch;
    gap: 3px;
  }

  html:not(.is-mobile-landscape) .endless-party-strip {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 4px;
    width: 100%;
  }

  html:not(.is-mobile-landscape) .endless-party-card {
    flex: 1 1 0;
    min-width: 0;
    max-width: 146px;
    padding: 3px 4px;
    gap: 4px;
  }

  html:not(.is-mobile-landscape) .endless-party-port-wrap {
    width: 24px;
    height: 24px;
  }

  html:not(.is-mobile-landscape) .endless-party-portrait {
    width: 22px;
    height: 22px;
  }

  html:not(.is-mobile-landscape) .endless-party-name {
    font-size: 0.30rem;
  }

  html:not(.is-mobile-landscape) .endless-party-lv {
    font-size: 0.26rem;
    padding: 1px 2px;
  }

  html:not(.is-mobile-landscape) .endless-party-ult-track {
    height: 6px;
  }

  html:not(.is-mobile-landscape) .endless-party-ult-tag {
    font-size: 0.24rem;
  }

  html:not(.is-mobile-landscape) .endless-synergy-hud {
    gap: 3px;
  }

  html:not(.is-mobile-landscape) .endless-synergy-badge {
    font-size: 0.27rem;
    padding: 2px 4px;
  }

  html:not(.is-mobile-landscape) .endless-shop-shell {
    top: auto;
    left: 6px;
    right: 6px;
    bottom: max(8px, env(safe-area-inset-bottom));
    width: auto;
    max-width: none;
    height: min(55vh, 435px);
    z-index: 36;
  }

  html:not(.is-mobile-landscape) .endless-offline-modal {
    padding: 10px 8px;
  }

  html:not(.is-mobile-landscape) .endless-offline-card {
    width: min(362px, calc(100% - 4px));
    padding: 12px 11px;
    gap: 9px;
  }

  html:not(.is-mobile-landscape) .endless-offline-title {
    font-size: 0.52rem;
    gap: 5px;
  }

  html:not(.is-mobile-landscape) .endless-offline-rewards {
    gap: 7px;
  }

  html:not(.is-mobile-landscape) .endless-offline-plaque {
    padding: 9px 6px;
  }

  html:not(.is-mobile-landscape) .endless-offline-plaque-val {
    font-size: 0.43rem;
  }

  html:not(.is-mobile-landscape) .endless-offline-actions {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    gap: 6px;
  }

  html:not(.is-mobile-landscape) .endless-offline-collect-btn,
  html:not(.is-mobile-landscape) .endless-offline-continue-btn {
    padding: 9px 6px;
    font-size: 0.40rem;
  }
}

/* Wave 4: Realm Modifier Pill, Relic Set Synergies Strip, Milestone Tags & Best-Stage Trophies */
.endless-modifier-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px 2px 4px;
  background: rgba(11, 14, 28, 0.94);
  border: 1px solid #f43f5e;
  border-radius: 3px;
  font-size: 0.39rem;
  letter-spacing: 0.03em;
  color: #fda4af;
  white-space: nowrap;
  text-shadow: 0 1px 0 #000;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.endless-modifier-pill.hidden {
  display: none !important;
}

.endless-modifier-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.endless-relic-sets-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 5px 6px;
  background: rgba(7, 10, 20, 0.94);
  border-bottom: 1px solid rgba(212, 175, 55, 0.28);
  flex-shrink: 0;
}

.endless-relic-set-pill {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 5px;
  background: rgba(14, 18, 32, 0.9);
  border: 1px solid #334155;
  border-radius: 3px;
  min-width: 0;
  opacity: 0.72;
  transition: border-color 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}

.endless-relic-set-pill.is-active {
  opacity: 1;
  background: linear-gradient(180deg, rgba(28, 24, 16, 0.95) 0%, rgba(12, 14, 24, 0.98) 100%);
  box-shadow: inset 0 1px 0 rgba(254, 240, 138, 0.18);
}

.endless-relic-set-head {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.endless-relic-set-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.endless-relic-set-name {
  font-size: 0.31rem;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-relic-set-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3px;
}

.endless-relic-set-tier {
  font-size: 0.31rem;
  color: #94a3b8;
  white-space: nowrap;
}

.endless-relic-set-pill.is-active .endless-relic-set-tier {
  color: #fde047;
}

.endless-relic-set-lv {
  font-size: 0.30rem;
  color: #64748b;
  white-space: nowrap;
}

.endless-relic-milestone {
  display: inline-block;
  padding: 1px 4px;
  margin-left: auto;
  font-size: 0.31rem;
  border-radius: 2px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid #334155;
  color: #94a3b8;
  white-space: nowrap;
  flex-shrink: 0;
}

.endless-relic-milestone.is-reached {
  background: rgba(120, 53, 15, 0.45);
  border-color: #facc15;
  color: #fef08a;
  box-shadow: 0 0 6px rgba(250, 204, 21, 0.32);
}

.endless-trophies-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 9px;
  margin-bottom: 6px;
  background: linear-gradient(180deg, rgba(22, 18, 36, 0.95) 0%, rgba(10, 12, 22, 0.97) 100%);
  border: 1.5px solid rgba(212, 175, 55, 0.65);
  border-radius: 5px;
  box-shadow: inset 0 1px 0 rgba(254, 240, 138, 0.16);
}

.endless-trophy-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.endless-trophy-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.endless-trophy-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.endless-trophy-title {
  font-size: 0.41rem;
  color: #fde047;
  letter-spacing: 0.04em;
}

.endless-trophy-bonus {
  font-size: 0.36rem;
  padding: 2px 5px;
  border-radius: 3px;
  background: rgba(250, 204, 21, 0.14);
  border: 1px solid rgba(250, 204, 21, 0.55);
  color: #fef08a;
  white-space: nowrap;
}

.endless-trophy-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.35rem;
  color: #cbd5e1;
}

.endless-trophy-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.endless-trophy-badge {
  font-size: 0.32rem;
  padding: 2px 5px;
  border-radius: 3px;
  background: rgba(15, 20, 34, 0.92);
  border: 1px solid #334155;
  color: #64748b;
  white-space: nowrap;
}

.endless-trophy-badge.is-unlocked {
  background: rgba(46, 33, 12, 0.9);
  color: #fef08a;
  box-shadow: inset 0 1px 0 rgba(254, 240, 138, 0.2);
}

@media (max-height: 500px) {
  .endless-modifier-pill {
    padding: 1px 5px 1px 3px;
    font-size: 0.33rem;
    gap: 3px;
  }

  .endless-modifier-icon {
    width: 13px;
    height: 13px;
  }

  .endless-relic-sets-strip {
    gap: 3px;
    padding: 4px 5px;
  }

  .endless-relic-set-pill {
    padding: 3px 4px;
    gap: 2px;
  }

  .endless-relic-milestone {
    font-size: 0.28rem;
    padding: 1px 3px;
  }
}

html.is-mobile-landscape .endless-modifier-pill {
  padding: 1px 5px 1px 3px;
  font-size: 0.33rem;
  gap: 3px;
}

html.is-mobile-landscape .endless-modifier-icon {
  width: 13px;
  height: 13px;
}

html.is-mobile-landscape .endless-relic-sets-strip {
  gap: 3px;
  padding: 4px 5px;
}

html.is-mobile-landscape .endless-relic-set-pill {
  padding: 3px 4px;
  gap: 2px;
}

html.is-mobile-landscape .endless-relic-milestone {
  font-size: 0.28rem;
  padding: 1px 3px;
}

@media (max-width: 560px) {
  html:not(.is-mobile-landscape) .endless-modifier-pill {
    padding: 2px 5px 2px 3px;
    font-size: 0.35rem;
  }

  html:not(.is-mobile-landscape) .endless-relic-sets-strip {
    gap: 3px;
    padding: 4px 5px;
  }
}

/* =========================================================================
   WAVE 7: ENDLESS GEAR FORGE, EQUIPPED SLOTS, MYTHIC SETS & INVENTORY BAG
   ========================================================================= */
.endless-gear-header {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 6px 7px;
  background: linear-gradient(180deg, rgba(16, 19, 34, 0.96) 0%, rgba(8, 10, 19, 0.98) 100%);
  border-bottom: 1.5px solid rgba(212, 175, 55, 0.42);
  flex-shrink: 0;
}

.endless-gear-metrics-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.endless-gear-metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  padding: 4px 6px;
  background: rgba(7, 9, 18, 0.94);
  border: 1px solid rgba(212, 175, 55, 0.45);
  border-radius: 3px;
  min-width: 0;
}

.endless-gear-metric.is-dust {
  border-color: rgba(56, 189, 248, 0.58);
}

.endless-gear-metric.is-power {
  border-color: rgba(250, 204, 21, 0.58);
}

.endless-gear-metric-left {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.endless-gear-metric-lbl {
  font-size: 0.29rem;
  color: #94a3b8;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-gear-metric-val {
  font-size: 0.39rem;
  color: #7dd3fc;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
  flex-shrink: 0;
}

.endless-gear-metric.is-power .endless-gear-metric-val {
  color: #fde047;
}

.endless-gear-actions-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.endless-gear-hdr-btn {
  padding: 5px 6px;
  font-family: inherit;
  font-size: 0.34rem;
  letter-spacing: 0.03em;
  color: #cbd5e1;
  background: linear-gradient(180deg, #1b2236 0%, #0d1221 100%);
  border: 1.5px solid #475569;
  outline: 1px solid #000;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000;
  transition: border-color 0.14s ease, color 0.14s ease, transform 0.08s ease;
}

.endless-gear-hdr-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.endless-gear-hdr-btn.is-highlight {
  color: #fffbeb;
  background: linear-gradient(180deg, #a16207 0%, #5c3208 100%);
  border-color: #facc15;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.42),
    0 0 10px rgba(250, 204, 21, 0.38);
}

.endless-gear-hdr-btn.is-salvage:not(:disabled) {
  color: #fed7aa;
  background: linear-gradient(180deg, #431407 0%, #240c06 100%);
  border-color: #f97316;
}

.endless-gear-hdr-btn:disabled {
  color: #64748b;
  background: linear-gradient(180deg, #141926 0%, #0b0e17 100%);
  border-color: #2d3748;
  cursor: not-allowed;
  opacity: 0.78;
}

.endless-gear-scroll {
  gap: 6px;
}

/* 4 Equipped Slots Grid (2x2 compact cards) */
.endless-gear-equipped-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
  flex-shrink: 0;
}

.endless-gear-slot-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 5px 6px;
  min-width: 0;
  background: linear-gradient(180deg, rgba(17, 22, 38, 0.96) 0%, rgba(9, 12, 22, 0.98) 100%);
  border: 1.5px solid #475569;
  outline: 1px solid #000;
  border-radius: 4px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}

.endless-gear-slot-card.is-empty {
  background: linear-gradient(180deg, rgba(11, 14, 25, 0.88) 0%, rgba(7, 9, 16, 0.94) 100%);
  border-style: dashed;
  border-color: rgba(71, 85, 105, 0.65);
  box-shadow: none;
}

.endless-gear-slot-top {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.endless-gear-slot-icon {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #070912;
  border: 1px solid #475569;
  border-radius: 3px;
  flex-shrink: 0;
}

.endless-gear-slot-card.is-empty .endless-gear-slot-icon {
  opacity: 0.55;
}

.endless-gear-slot-badges {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3px;
  flex: 1 1 auto;
  min-width: 0;
}

.endless-gear-rarity-pill {
  font-size: 0.27rem;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(7, 10, 20, 0.92);
  border: 1px solid #64748b;
  color: #cbd5e1;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-gear-enh-lv {
  font-size: 0.29rem;
  color: #fef08a;
  background: rgba(250, 204, 21, 0.18);
  border: 1px solid rgba(250, 204, 21, 0.65);
  border-radius: 2px;
  padding: 1px 3px;
  flex-shrink: 0;
  white-space: nowrap;
}

.endless-gear-enh-lv.hidden {
  display: none;
}

.endless-gear-slot-name {
  font-size: 0.33rem;
  color: #f8fafc;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000;
}

.endless-gear-slot-card.is-empty .endless-gear-slot-name {
  color: #64748b;
  font-size: 0.30rem;
}

.endless-gear-slot-stats {
  font-size: 0.28rem;
  color: #93c5fd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 11px;
}

.endless-gear-slot-card.is-empty .endless-gear-slot-stats {
  color: #475569;
}

.endless-gear-slot-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: auto;
  padding-top: 2px;
  border-top: 1px solid rgba(71, 85, 105, 0.28);
  min-width: 0;
}

.endless-gear-slot-card.is-empty .endless-gear-slot-foot {
  display: none;
}

.endless-gear-set-tag {
  font-size: 0.25rem;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(8, 11, 22, 0.94);
  border: 1px solid #64748b;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 100%;
}

.endless-gear-set-tag.is-pwr {
  border-color: rgba(212, 175, 55, 0.38);
  color: #fde68a;
}

.endless-gear-set-tag.hidden {
  display: none;
}

.endless-gear-enh-btn {
  padding: 3px 5px;
  font-family: inherit;
  font-size: 0.29rem;
  letter-spacing: 0.02em;
  color: #fef08a;
  background: linear-gradient(180deg, #0369a1 0%, #0c4a6e 100%);
  border: 1px solid #38bdf8;
  outline: 1px solid #000;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  text-shadow: 0 1px 0 #000;
  transition: transform 0.08s ease;
}

.endless-gear-enh-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.endless-gear-enh-btn:disabled {
  color: #64748b;
  background: #111626;
  border-color: #334155;
  cursor: not-allowed;
  opacity: 0.82;
}

.endless-gear-enh-btn.is-maxed,
.endless-gear-enh-btn.is-maxed:disabled {
  color: #fef08a;
  background: linear-gradient(180deg, #422006 0%, #1c1205 100%);
  border-color: #d4af37;
  opacity: 1;
}

/* Mythic Set Passives Strip (3 compact pills) */
.endless-gear-sets-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  flex-shrink: 0;
}

.endless-gear-set-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 5px;
  min-width: 0;
  background: rgba(11, 14, 26, 0.92);
  border: 1px solid #334155;
  border-radius: 3px;
  opacity: 0.72;
  transition: border-color 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}

.endless-gear-set-pill.is-active {
  opacity: 1;
  background: linear-gradient(180deg, rgba(24, 22, 38, 0.96) 0%, rgba(10, 12, 22, 0.98) 100%);
}

.endless-gear-set-pill.is-empowered {
  opacity: 1;
  background: linear-gradient(180deg, rgba(38, 28, 18, 0.96) 0%, rgba(12, 13, 24, 0.99) 100%);
}

.endless-gear-set-name {
  font-size: 0.27rem;
  color: #cbd5e1;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000;
}

.endless-gear-set-status {
  align-self: flex-start;
  font-size: 0.25rem;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(7, 9, 18, 0.92);
  border: 1px solid #334155;
  color: #94a3b8;
  white-space: nowrap;
}

.endless-gear-set-pill.is-active .endless-gear-set-status {
  color: #fef08a;
  background: rgba(250, 204, 21, 0.14);
}

.endless-gear-set-desc {
  font-size: 0.24rem;
  color: #94a3b8;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.endless-gear-set-pill.is-active .endless-gear-set-desc {
  color: #e2e8f0;
}

/* Inventory Bag Section */
.endless-gear-bag-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 3px 2px 1px;
  border-top: 1px solid rgba(212, 175, 55, 0.26);
  flex-shrink: 0;
}

.endless-gear-bag-title {
  font-size: 0.36rem;
  color: #fde047;
  letter-spacing: 0.04em;
}

.endless-gear-bag-hint {
  font-size: 0.28rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-gear-bag-items {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.endless-gear-bag-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 6px;
  padding: 5px 6px;
  background: linear-gradient(180deg, rgba(16, 20, 35, 0.95) 0%, rgba(9, 12, 22, 0.97) 100%);
  border: 1.5px solid #475569;
  border-radius: 4px;
  min-width: 0;
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}

.endless-gear-bag-row.is-upgrade {
  box-shadow: inset 0 0 12px rgba(52, 211, 153, 0.14);
}

.endless-gear-bag-icon-wrap {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #070912;
  border: 1.5px solid #64748b;
  border-radius: 3px;
  flex-shrink: 0;
  align-self: flex-start;
}

.endless-gear-bag-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.endless-gear-bag-top {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.endless-gear-bag-name {
  font-size: 0.35rem;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1 1 auto;
}

.endless-gear-up-badge {
  font-size: 0.28rem;
  padding: 1px 4px;
  border-radius: 2px;
  color: #052e16;
  background: linear-gradient(180deg, #6ee7b7 0%, #10b981 100%);
  border: 1px solid #d1fae5;
  flex-shrink: 0;
  white-space: nowrap;
  font-weight: 700;
}

.endless-gear-up-badge.hidden {
  display: none;
}

.endless-gear-bag-sub {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: nowrap;
  overflow: hidden;
}

.endless-gear-bag-stats {
  font-size: 0.29rem;
  color: #93c5fd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1 1 auto;
}

.endless-gear-bag-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}

.endless-gear-act-btn {
  flex: 1 1 0;
  min-width: 0;
  padding: 4px 5px;
  font-family: inherit;
  font-size: 0.30rem;
  letter-spacing: 0.02em;
  color: #f8fafc;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #64748b;
  outline: 1px solid #000;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000;
  transition: transform 0.08s ease;
}

.endless-gear-act-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.endless-gear-act-btn.hidden {
  display: none;
}

.endless-gear-act-btn.is-equip {
  color: #fef08a;
  background: linear-gradient(180deg, #713f12 0%, #3b1f08 100%);
  border-color: #d4af37;
}

.endless-gear-act-btn.is-equip.is-upgrade {
  color: #ecfdf5;
  background: linear-gradient(180deg, #059669 0%, #065f46 100%);
  border-color: #6ee7b7;
}

.endless-gear-act-btn.is-enhance {
  flex: 0.9 1 0;
  color: #e0f2fe;
  background: linear-gradient(180deg, #0369a1 0%, #0c4a6e 100%);
  border-color: #38bdf8;
}

.endless-gear-act-btn.is-salvage {
  color: #fed7aa;
  background: linear-gradient(180deg, #431407 0%, #240c06 100%);
  border-color: #ea580c;
}

/* Wave 7 Responsive Ergonomics: Mobile Landscape (844x390) & Portrait (390x844) */
@media (max-height: 500px) {
  .endless-tab-bar {
    padding: 3px 4px;
    gap: 2px;
  }

  .endless-tab-btn {
    font-size: 0.29rem;
    padding: 4px 1px;
    gap: 2px;
  }

  .endless-tab-dot {
    width: 5px;
    height: 5px;
  }

  .endless-gear-header {
    padding: 4px 6px;
    gap: 4px;
  }

  .endless-gear-metric {
    padding: 3px 5px;
  }

  .endless-gear-metric-lbl {
    font-size: 0.26rem;
  }

  .endless-gear-metric-val {
    font-size: 0.34rem;
  }

  .endless-gear-hdr-btn {
    padding: 4px 5px;
    font-size: 0.30rem;
  }

  .endless-gear-slot-card {
    padding: 4px 5px;
    gap: 3px;
  }

  .endless-gear-slot-name {
    font-size: 0.30rem;
  }

  .endless-gear-slot-stats {
    font-size: 0.26rem;
  }

  .endless-gear-enh-btn {
    padding: 2px 4px;
    font-size: 0.26rem;
  }

  .endless-gear-set-pill {
    padding: 3px 4px;
  }

  .endless-gear-bag-row {
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 5px;
    padding: 4px 5px;
  }

  .endless-gear-bag-icon-wrap {
    width: 26px;
    height: 26px;
  }

  .endless-gear-act-btn {
    padding: 3px 4px;
    font-size: 0.27rem;
  }
}

html.is-mobile-landscape .endless-tab-bar {
  padding: 3px 4px;
  gap: 2px;
}

html.is-mobile-landscape .endless-tab-btn {
  font-size: 0.29rem;
  padding: 4px 1px;
  gap: 2px;
}

html.is-mobile-landscape .endless-tab-dot {
  width: 5px;
  height: 5px;
}

html.is-mobile-landscape .endless-gear-header {
  padding: 4px 6px;
  gap: 4px;
}

html.is-mobile-landscape .endless-gear-metric {
  padding: 3px 5px;
}

html.is-mobile-landscape .endless-gear-metric-lbl {
  font-size: 0.26rem;
}

html.is-mobile-landscape .endless-gear-metric-val {
  font-size: 0.34rem;
}

html.is-mobile-landscape .endless-gear-hdr-btn {
  padding: 4px 5px;
  font-size: 0.30rem;
}

html.is-mobile-landscape .endless-gear-slot-card {
  padding: 4px 5px;
  gap: 3px;
}

html.is-mobile-landscape .endless-gear-slot-name {
  font-size: 0.30rem;
}

html.is-mobile-landscape .endless-gear-slot-stats {
  font-size: 0.26rem;
}

html.is-mobile-landscape .endless-gear-enh-btn {
  padding: 2px 4px;
  font-size: 0.26rem;
}

html.is-mobile-landscape .endless-gear-set-pill {
  padding: 3px 4px;
}

html.is-mobile-landscape .endless-gear-bag-row {
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 5px;
  padding: 4px 5px;
}

html.is-mobile-landscape .endless-gear-bag-icon-wrap {
  width: 26px;
  height: 26px;
}

html.is-mobile-landscape .endless-gear-act-btn {
  padding: 3px 4px;
  font-size: 0.27rem;
}

@media (max-width: 560px) {
  html:not(.is-mobile-landscape) .endless-tab-bar {
    padding: 4px 4px;
    gap: 2px;
  }

  html:not(.is-mobile-landscape) .endless-tab-btn {
    font-size: 0.33rem;
    padding: 5px 2px;
    gap: 2px;
  }

  html:not(.is-mobile-landscape) .endless-gear-header {
    padding: 5px 6px;
    gap: 4px;
  }

  html:not(.is-mobile-landscape) .endless-gear-slot-card {
    padding: 5px 5px;
  }

  html:not(.is-mobile-landscape) .endless-gear-act-btn {
    padding: 5px 4px;
    font-size: 0.30rem;
  }
}
`;

function setTextIfChanged(el, text) {
  if (!el) return;
  const next = String(text);
  if (el.textContent !== next) {
    el.textContent = next;
  }
}

function stopEventLeak(el) {
  if (!el || typeof el.addEventListener !== 'function') return;
  const halt = (e) => {
    e.stopPropagation();
  };
  el.addEventListener('pointerdown', halt);
  el.addEventListener('mousedown', halt);
  el.addEventListener('touchstart', halt, { passive: true });
  el.addEventListener('click', halt);
}

function drawFallbackPixelIcon(canvas, col, accentHex = '#facc15', row = ENDLESS_ICON_ROW) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width || 32;
  const h = canvas.height || 32;
  const u = Math.max(1, Math.floor(w / 16));
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  const px = (gx, gy, gw, gh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(gx * u, gy * u, gw * u, gh * u);
  };

  // Dark selout badge frame
  px(2, 2, 12, 12, '#0d0f1c');
  px(3, 3, 10, 10, '#181e34');

  if (row === 1 || (row === ENDLESS_ICON_ROW && col === 1)) {
    // Astral Shard Crystal
    px(7, 2, 2, 12, '#bae6fd');
    px(5, 4, 6, 8, '#38bdf8');
    px(4, 6, 8, 4, '#a855f7');
    px(6, 5, 4, 5, '#ffffff');
  } else if (row === 0 || (row === ENDLESS_ICON_ROW && col === 0)) {
    // Sovereign Gold Coin
    px(4, 3, 8, 10, '#92400e');
    px(5, 4, 6, 8, '#facc15');
    px(6, 5, 4, 6, '#fef08a');
    px(7, 6, 2, 4, '#d97706');
  } else if (col === 11) {
    // Gothic Obsidian-Gold Chest
    px(2, 5, 12, 8, '#0d0f1c');
    px(3, 6, 10, 6, '#78350f');
    px(3, 6, 10, 2, '#facc15');
    px(6, 7, 4, 3, '#fef08a');
    px(7, 8, 2, 1, '#0d0f1c');
  } else {
    // Crisp Relic Crest Silhouette
    px(4, 4, 8, 8, accentHex);
    px(5, 5, 6, 6, '#0d0f1c');
    px(6, 6, 4, 4, accentHex);
    px(7, 5, 2, 6, '#ffffff');
  }
}

function drawFallbackPortrait(canvas, accentHex = '#facc15') {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width || 40;
  const h = canvas.height || 40;
  const u = Math.max(1, Math.floor(w / 16));
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  const px = (gx, gy, gw, gh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(gx * u, gy * u, gw * u, gh * u);
  };

  px(0, 0, 16, 16, '#0b0f1e');
  px(1, 1, 14, 14, '#141b30');
  // Stylized pixel helm / hood bust
  px(5, 3, 6, 5, accentHex);
  px(6, 4, 4, 3, '#f8fafc');
  px(6, 5, 1, 1, '#0d0f1c');
  px(9, 5, 1, 1, '#0d0f1c');
  px(3, 9, 10, 5, accentHex);
  px(5, 10, 6, 4, '#1e293b');
}

const PIXEL_MONOGRAM_3X5 = Object.freeze({
  A: [0b010, 0b101, 0b111, 0b101, 0b101],
  B: [0b110, 0b101, 0b110, 0b101, 0b110],
  C: [0b011, 0b100, 0b100, 0b100, 0b011],
  D: [0b110, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b110, 0b100, 0b111],
  F: [0b111, 0b100, 0b110, 0b100, 0b100],
  G: [0b011, 0b100, 0b101, 0b101, 0b011],
  H: [0b101, 0b101, 0b111, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b111],
  J: [0b001, 0b001, 0b001, 0b101, 0b010],
  K: [0b101, 0b101, 0b110, 0b101, 0b101],
  L: [0b100, 0b100, 0b100, 0b100, 0b111],
  M: [0b101, 0b111, 0b111, 0b101, 0b101],
  N: [0b111, 0b101, 0b101, 0b101, 0b101],
  O: [0b010, 0b101, 0b101, 0b101, 0b010],
  P: [0b110, 0b101, 0b110, 0b100, 0b100],
  Q: [0b010, 0b101, 0b101, 0b011, 0b001],
  R: [0b110, 0b101, 0b110, 0b101, 0b101],
  S: [0b011, 0b100, 0b010, 0b001, 0b110],
  T: [0b111, 0b010, 0b010, 0b010, 0b010],
  U: [0b101, 0b101, 0b101, 0b101, 0b111],
  V: [0b101, 0b101, 0b101, 0b101, 0b010],
  W: [0b101, 0b101, 0b111, 0b111, 0b101],
  X: [0b101, 0b101, 0b010, 0b101, 0b101],
  Y: [0b101, 0b101, 0b010, 0b010, 0b010],
  Z: [0b111, 0b001, 0b010, 0b100, 0b111],
  0: [0b111, 0b101, 0b101, 0b101, 0b111],
  1: [0b010, 0b110, 0b010, 0b010, 0b111],
  2: [0b110, 0b001, 0b010, 0b100, 0b111],
  3: [0b110, 0b001, 0b010, 0b001, 0b110],
  4: [0b101, 0b101, 0b111, 0b001, 0b001],
  5: [0b111, 0b100, 0b110, 0b001, 0b110],
  6: [0b011, 0b100, 0b111, 0b101, 0b111],
  7: [0b111, 0b001, 0b010, 0b010, 0b010],
  8: [0b111, 0b101, 0b111, 0b101, 0b111],
  9: [0b111, 0b101, 0b111, 0b001, 0b110]
});

function extractMonogramLetters(label) {
  const cleaned = String(label || 'AL')
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, '')
    .trim();
  if (!cleaned) return 'AL';
  const parts = cleaned.split(/[\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`;
  }
  return cleaned.slice(0, 2);
}

function drawMonogramPortrait(canvas, accentHex = '#facc15', label = 'AL') {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width || 28;
  const h = canvas.height || 28;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  // Gothic obsidian framed tile with colored inner accent trim
  ctx.fillStyle = '#070912';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accentHex || '#facc15';
  ctx.fillRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = '#12172b';
  ctx.fillRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = '#1b223d';
  ctx.fillRect(4, 4, w - 8, Math.max(2, Math.floor((h - 8) * 0.45)));

  // Crisp 2x pixel-snapped monogram letters
  const chars = extractMonogramLetters(label);
  const scale = Math.max(1, Math.floor(w / 14));
  const charW = 3 * scale;
  const charH = 5 * scale;
  const gap = chars.length > 1 ? scale : 0;
  const totalW = chars.length * charW + (chars.length - 1) * gap;
  const startX = Math.floor((w - totalW) * 0.5);
  const startY = Math.floor((h - charH) * 0.5);

  for (let ci = 0; ci < chars.length; ci++) {
    const ch = chars[ci];
    const glyph = PIXEL_MONOGRAM_3X5[ch] || PIXEL_MONOGRAM_3X5.A;
    const ox = startX + ci * (charW + gap);
    for (let row = 0; row < 5; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 3; col++) {
        if ((bits >> (2 - col)) & 1) {
          const px = ox + col * scale;
          const py = startY + row * scale;
          ctx.fillStyle = '#050712';
          ctx.fillRect(px + 1, py + 1, scale, scale);
          ctx.fillStyle = row < 2 ? '#ffffff' : (accentHex || '#fef08a');
          ctx.fillRect(px, py, scale, scale);
        }
      }
    }
  }
}

export class EndlessShopUI {
  constructor(endlessManager = null) {
    this.manager = endlessManager || null;
    this.mounted = false;
    this.visible = false;
    this.drawerOpen = false;
    this.activeTab = 'items';

    this.root = null;
    this._createdRoot = false;
    this._vfxFallbackImg = null;
    this._iconCanvases = [];
    this._partySlotRefs = [];
    this._relicRowRefs = new Map();
    this._companionCardRefs = new Map();
    this._artifactRowRefs = new Map();
    this._gearSlotRefs = new Map();
    this._gearSetPillRefs = new Map();
    this._gearBagRowRefs = new Map();
    this._tabBtnRefs = new Map();
    this._tabPanelRefs = new Map();
    this._bulkBtnRefs = new Map();
    this._statRefs = new Map();
    this._refs = {};

    this._resetArmed = false;
    this._resetArmTimer = null;
    this._ascendArmed = false;
    this._ascendArmTimer = null;
    this._partyNoticeTimer = null;
    this._saveFlashTimer = null;
    this._ephemeralTimers = new Set();
    this._lastHudSynergySig = '';
    this._lastDrawerSynergySig = '';
    this._lastGearInvSig = '';
    this._lastGearSetSig = '';
    this._lastGearEquipSigs = new Map();
    this._lastResolvedAscension = null;
    this._telemExpanded = false;
    this._lastSnapshot = null;

    // Built-in 5-tab registry: ITEMS | GEAR | COMPANIONS | ASCEND | STATS
    this.tabs = [
      { id: 'items', label: 'ITEMS', builtIn: true },
      { id: 'gear', label: 'GEAR', builtIn: true },
      { id: 'companions', label: 'COMPANIONS', builtIn: true },
      { id: 'ascend', label: 'ASCEND', builtIn: true },
      { id: 'stats', label: 'STATS', builtIn: true }
    ];
  }

  _hasDom() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return false;
    if (typeof this._hasRealDom === 'boolean') return this._hasRealDom;
    try {
      const probe = document.createElement('div');
      this._hasRealDom = Boolean(
        probe &&
          typeof probe.setAttribute === 'function' &&
          typeof probe.appendChild === 'function' &&
          typeof probe.addEventListener === 'function'
      );
    } catch {
      this._hasRealDom = false;
    }
    return this._hasRealDom;
  }

  _injectStyles() {
    if (!this._hasDom() || !document.head) return;
    if (document.getElementById(STYLE_ELEMENT_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = ENDLESS_SHOP_CSS;
    document.head.appendChild(style);
  }

  _resolveVfxSheet() {
    const forged = PixelForge?.assets?.endlessVfx;
    if (forged && forged.complete && forged.naturalWidth >= ENDLESS_ICON_CELL * 12) {
      return forged;
    }
    if (!this._vfxFallbackImg && typeof Image !== 'undefined') {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this._blitAllIcons(true);
      };
      img.src = ENDLESS_VFX_SHEET_URL;
      this._vfxFallbackImg = img;
    }
    if (
      this._vfxFallbackImg &&
      this._vfxFallbackImg.complete &&
      this._vfxFallbackImg.naturalWidth >= ENDLESS_ICON_CELL * 12
    ) {
      return this._vfxFallbackImg;
    }
    return null;
  }

  _blitIconCanvas(canvas, col, accentHex, force = false, row = ENDLESS_ICON_ROW) {
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const sheet = this._resolveVfxSheet();
    if (sheet && sheet.naturalHeight >= (row + 1) * ENDLESS_ICON_CELL) {
      if (!force && canvas._blittedSheet === sheet && canvas._blittedRow === row && canvas._blittedCol === col) {
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sx = col * ENDLESS_ICON_CELL;
      const sy = row * ENDLESS_ICON_CELL;
      ctx.drawImage(
        sheet,
        sx,
        sy,
        ENDLESS_ICON_CELL,
        ENDLESS_ICON_CELL,
        0,
        0,
        canvas.width,
        canvas.height
      );
      canvas._blittedSheet = sheet;
      canvas._blittedRow = row;
      canvas._blittedCol = col;
      return;
    }
    if (!canvas._fallbackDrawn || force) {
      drawFallbackPixelIcon(canvas, col, accentHex, row);
      canvas._fallbackDrawn = true;
    }
  }

  _blitAllIcons(force = false) {
    for (let i = 0; i < this._iconCanvases.length; i++) {
      const entry = this._iconCanvases[i];
      this._blitIconCanvas(entry.canvas, entry.col, entry.accentHex, force, entry.row ?? ENDLESS_ICON_ROW);
    }
  }

  _resolvePortraitImage(heroKey) {
    if (!heroKey) return null;
    let assets = PixelForge?.assets || null;
    if (!assets && typeof PixelForge?.initAssets === 'function' && typeof Image !== 'undefined') {
      try {
        assets = PixelForge.initAssets();
      } catch (_err) {
        assets = null;
      }
    }
    const baseKey = String(heroKey).replace(/_ex$/, '');
    const img = assets?.[heroKey]?.portrait || assets?.[baseKey]?.portrait || null;
    if (img && typeof PixelForge?.ensureImage === 'function') {
      PixelForge.ensureImage(img);
    }
    return img;
  }

  _blitCompanionPortrait(canvas, heroKey, accentHex, fallbackLabel = null) {
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const keySig = `${heroKey || ''}|${accentHex || ''}|${fallbackLabel || ''}`;
    const img = this._resolvePortraitImage(heroKey);

    if (img && img.complete && img.naturalWidth > 0) {
      if (canvas._blittedPortrait === img && canvas._blittedKeySig === keySig) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas._blittedPortrait = img;
      canvas._blittedKeySig = keySig;
      canvas._fallbackKeySig = null;
      return;
    }

    canvas._expectedKeySig = keySig;
    if (img && !img.complete && typeof img.addEventListener === 'function' && canvas._portraitLoadBoundImg !== img) {
      canvas._portraitLoadBoundImg = img;
      img.addEventListener('load', () => {
        if (canvas._portraitLoadBoundImg === img) {
          canvas._portraitLoadBoundImg = null;
        }
        if (canvas._expectedKeySig === keySig) {
          this._blitCompanionPortrait(canvas, heroKey, accentHex, fallbackLabel);
        }
      }, { once: true });
    }

    if (canvas._fallbackKeySig !== keySig) {
      canvas._blittedPortrait = null;
      if (fallbackLabel) {
        drawMonogramPortrait(canvas, accentHex, fallbackLabel);
      } else {
        drawFallbackPortrait(canvas, accentHex);
      }
      canvas._fallbackKeySig = keySig;
    }
  }

  _playSfx(methodName) {
    const sfx = this.manager?.game?.sfx;
    if (sfx && typeof sfx[methodName] === 'function') {
      try {
        sfx[methodName]();
      } catch (_err) {
        // Ignore audio context autoplay restrictions
      }
    }
  }

  registerTab(tabDef) {
    if (!tabDef || !tabDef.id || !tabDef.label) return false;
    const existingIdx = this.tabs.findIndex((t) => t.id === tabDef.id);
    if (existingIdx >= 0) {
      this.tabs[existingIdx] = { ...this.tabs[existingIdx], ...tabDef };
    } else {
      this.tabs.push({ ...tabDef, builtIn: false });
    }
    if (this.mounted && this._hasDom()) {
      this._ensureTabElements(tabDef);
      this._syncTabVisibility();
    }
    return true;
  }

  mount() {
    if (this.mounted) return this;
    this.mounted = true;
    if (!this._hasDom()) return this;

    this._injectStyles();

    let root = document.getElementById(ROOT_ELEMENT_ID);
    if (!root) {
      root = document.createElement('section');
      root.id = ROOT_ELEMENT_ID;
      root.className = 'endless-hud-root hidden';
      root.setAttribute('aria-label', 'Endless Crusade HUD and Shop');
      const host = document.getElementById('app') || document.body;
      if (host) host.appendChild(root);
      this._createdRoot = true;
    } else {
      root.classList.add('endless-hud-root');
      if (!this.visible) root.classList.add('hidden');
      this._createdRoot = false;
    }

    this.root = root;
    this.root.textContent = '';
    this._iconCanvases = [];
    this._partySlotRefs = [];
    this._relicRowRefs.clear();
    this._relicSetPillRefs = new Map();
    this._companionCardRefs.clear();
    this._artifactRowRefs.clear();
    this._gearSlotRefs.clear();
    this._gearSetPillRefs.clear();
    this._gearBagRowRefs.clear();
    this._tabBtnRefs.clear();
    this._tabPanelRefs.clear();
    this._bulkBtnRefs.clear();
    this._statRefs.clear();
    this._lastHudSynergySig = '';
    this._lastDrawerSynergySig = '';
    this._lastTrophySig = '';
    this._lastGearInvSig = '';
    this._lastGearSetSig = '';
    this._lastGearEquipSigs.clear();
    this._modifierIconEntry = null;
    this._refs = {};

    this._buildTopStatusBar();
    this._buildActivePartyHud();
    this._buildShopToggle();
    this._buildShopDrawer();
    this._buildFxLayer();
    this._buildOfflineLootModal();

    this.setVisible(this.visible);
    this.setDrawerOpen(this.drawerOpen);
    this.setActiveTab(this.activeTab);
    this._blitAllIcons(true);

    return this;
  }

  _makeIconCanvas(size, col, accentHex, className, row = ENDLESS_ICON_ROW) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    if (className) c.className = className;
    c.setAttribute('aria-hidden', 'true');
    this._iconCanvases.push({ canvas: c, col, accentHex, row });
    return c;
  }

  _buildTopStatusBar() {
    const stack = document.createElement('div');
    stack.className = 'endless-top-stack';

    const bar = document.createElement('div');
    bar.className = 'endless-top-bar';
    stopEventLeak(bar);

    // Stage & Realm badge
    const stageBadge = document.createElement('div');
    stageBadge.className = 'endless-stage-badge';
    const stageText = document.createElement('span');
    stageText.textContent = 'STAGE 1 • ECLIPSE SANCTUM';
    const loopPill = document.createElement('span');
    loopPill.className = 'endless-loop-pill hidden';
    loopPill.textContent = 'LOOP II';
    stageBadge.appendChild(stageText);
    stageBadge.appendChild(loopPill);

    // Wave / Boss progress meter
    const waveMeter = document.createElement('div');
    waveMeter.className = 'endless-wave-meter';
    const waveFill = document.createElement('div');
    waveFill.className = 'endless-wave-fill';
    const waveLabel = document.createElement('span');
    waveLabel.className = 'endless-wave-label';
    waveLabel.textContent = 'WAVE 1/5';
    waveMeter.appendChild(waveFill);
    waveMeter.appendChild(waveLabel);

    // Currencies: Sovereign Gold & Astral Shards
    const currencyGroup = document.createElement('div');
    currencyGroup.className = 'endless-currency-group';

    const goldPill = document.createElement('div');
    goldPill.className = 'endless-currency-pill is-gold';
    goldPill.title = 'Sovereign Gold';
    const goldIcon = this._makeIconCanvas(32, 0, '#facc15', 'endless-currency-icon');
    const goldVal = document.createElement('span');
    goldVal.textContent = '0';
    goldPill.appendChild(goldIcon);
    goldPill.appendChild(goldVal);

    const shardPill = document.createElement('div');
    shardPill.className = 'endless-currency-pill is-shard';
    shardPill.title = 'Astral Shards';
    const shardIcon = this._makeIconCanvas(32, 1, '#38bdf8', 'endless-currency-icon');
    const shardVal = document.createElement('span');
    shardVal.textContent = '0';
    shardPill.appendChild(shardIcon);
    shardPill.appendChild(shardVal);

    currencyGroup.appendChild(goldPill);
    currencyGroup.appendChild(shardPill);

    // Tap-Fever meter
    const feverMeter = document.createElement('div');
    feverMeter.className = 'endless-fever-meter';
    feverMeter.title = 'Tap anywhere on the arena to unleash Arcane Smite and charge Tap-Fever';
    const feverFill = document.createElement('div');
    feverFill.className = 'endless-fever-fill';
    const feverLabel = document.createElement('span');
    feverLabel.className = 'endless-fever-label';
    feverLabel.textContent = 'FEVER 0%';
    feverMeter.appendChild(feverFill);
    feverMeter.appendChild(feverLabel);

    // Wave 4: Rotating Realm Modifier Pill (Row 9 Cols 0..3)
    const modPill = document.createElement('div');
    modPill.className = 'endless-modifier-pill';
    modPill.title = 'BLOOD MOON: +60% GOLD & +8% CRIT';
    const modIcon = this._makeIconCanvas(24, 0, '#f43f5e', 'endless-modifier-icon', ENDLESS_SIGIL_ROW);
    this._modifierIconEntry = this._iconCanvases[this._iconCanvases.length - 1] || null;
    const modName = document.createElement('span');
    modName.textContent = 'BLOOD MOON';
    modPill.appendChild(modIcon);
    modPill.appendChild(modName);

    bar.appendChild(stageBadge);
    bar.appendChild(modPill);
    bar.appendChild(waveMeter);
    bar.appendChild(currencyGroup);
    bar.appendChild(feverMeter);

    // Boss Control Action Pill
    const bossControls = document.createElement('div');
    bossControls.className = 'endless-boss-controls';
    stopEventLeak(bossControls);

    const autoBossBtn = document.createElement('button');
    autoBossBtn.type = 'button';
    autoBossBtn.className = 'endless-autoboss-btn is-on';
    autoBossBtn.textContent = 'AUTO-BOSS: ON';
    autoBossBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleToggleAutoBoss();
    });

    const challengeBtn = document.createElement('button');
    challengeBtn.type = 'button';
    challengeBtn.className = 'endless-challenge-boss-btn hidden';
    challengeBtn.innerHTML = `${BOSS_CROWN_SVG}<span>CHALLENGE BOSS</span>`;
    challengeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleChallengeBoss();
    });

    bossControls.appendChild(autoBossBtn);
    bossControls.appendChild(challengeBtn);

    stack.appendChild(bar);
    stack.appendChild(bossControls);
    this.root.appendChild(stack);

    this._refs.stageBadge = stageBadge;
    this._refs.stageText = stageText;
    this._refs.loopPill = loopPill;
    this._refs.modPill = modPill;
    this._refs.modIcon = modIcon;
    this._refs.modName = modName;
    this._refs.waveMeter = waveMeter;
    this._refs.waveFill = waveFill;
    this._refs.waveLabel = waveLabel;
    this._refs.goldVal = goldVal;
    this._refs.shardVal = shardVal;
    this._refs.feverMeter = feverMeter;
    this._refs.feverFill = feverFill;
    this._refs.feverLabel = feverLabel;
    this._refs.autoBossBtn = autoBossBtn;
    this._refs.challengeBtn = challengeBtn;
  }

  _buildActivePartyHud() {
    const partyHud = document.createElement('div');
    partyHud.className = 'endless-party-hud hidden';
    partyHud.setAttribute('aria-label', 'Active Companion Party');

    const strip = document.createElement('div');
    strip.className = 'endless-party-strip';

    this._partySlotRefs = [];
    for (let i = 0; i < 3; i++) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'endless-party-card hidden';
      card.dataset.slotIndex = String(i);
      stopEventLeak(card);

      const portWrap = document.createElement('div');
      portWrap.className = 'endless-party-port-wrap';

      const portCanvas = document.createElement('canvas');
      portCanvas.width = 28;
      portCanvas.height = 28;
      portCanvas.className = 'endless-party-portrait';
      portCanvas.setAttribute('aria-hidden', 'true');
      portWrap.appendChild(portCanvas);

      const meta = document.createElement('div');
      meta.className = 'endless-party-meta';

      const head = document.createElement('div');
      head.className = 'endless-party-head';
      const nameEl = document.createElement('span');
      nameEl.className = 'endless-party-name';
      nameEl.textContent = 'ALLY';
      const lvEl = document.createElement('span');
      lvEl.className = 'endless-party-lv';
      lvEl.textContent = 'LV.1';
      head.appendChild(nameEl);
      head.appendChild(lvEl);

      const ultRow = document.createElement('div');
      ultRow.className = 'endless-party-ult-row';
      const ultTrack = document.createElement('div');
      ultTrack.className = 'endless-party-ult-track';
      const ultFill = document.createElement('div');
      ultFill.className = 'endless-party-ult-fill';
      ultTrack.appendChild(ultFill);
      const ultTag = document.createElement('span');
      ultTag.className = 'endless-party-ult-tag';
      ultTag.textContent = '0%';
      ultRow.appendChild(ultTrack);
      ultRow.appendChild(ultTag);

      meta.appendChild(head);
      meta.appendChild(ultRow);

      card.appendChild(portWrap);
      card.appendChild(meta);

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this._playSfx('playUiClick');
        this.setActiveTab('companions');
        this.setDrawerOpen(true);
      });

      strip.appendChild(card);
      this._partySlotRefs.push({
        card,
        portWrap,
        portCanvas,
        nameEl,
        lvEl,
        ultFill,
        ultTag
      });
    }

    const synHud = document.createElement('div');
    synHud.className = 'endless-synergy-hud hidden';
    synHud.setAttribute('aria-label', 'Active Party Synergies');
    stopEventLeak(synHud);

    partyHud.appendChild(strip);
    partyHud.appendChild(synHud);
    this.root.appendChild(partyHud);

    this._refs.partyHud = partyHud;
    this._refs.partyStrip = strip;
    this._refs.synergyHud = synHud;
  }

  _buildFxLayer() {
    const fxLayer = document.createElement('div');
    fxLayer.className = 'endless-fx-layer';
    fxLayer.setAttribute('aria-hidden', 'true');
    this.root.appendChild(fxLayer);
    this._refs.fxLayer = fxLayer;
  }

  _buildOfflineLootModal() {
    const modal = document.createElement('div');
    modal.className = 'endless-offline-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Welcome Back Offline Crusade Loot');
    stopEventLeak(modal);

    const card = document.createElement('div');
    card.className = 'endless-offline-card';
    stopEventLeak(card);

    // Header
    const header = document.createElement('div');
    header.className = 'endless-offline-header';
    const title = document.createElement('div');
    title.className = 'endless-offline-title';
    title.innerHTML = `${BOSS_CROWN_SVG}<span>WELCOME BACK, CRUSADER</span>${BOSS_CROWN_SVG}`;
    const subtitle = document.createElement('div');
    subtitle.className = 'endless-offline-subtitle';
    subtitle.textContent = 'YOUR CRUSADE MARCHED ON WHILE YOU WERE AWAY';
    header.appendChild(title);
    header.appendChild(subtitle);

    // Away Time / Cap / Stages Badges
    const badges = document.createElement('div');
    badges.className = 'endless-offline-badges';
    const awayBadge = document.createElement('span');
    awayBadge.className = 'endless-offline-away-badge';
    awayBadge.textContent = 'AWAY: 0M';
    const capBadge = document.createElement('span');
    capBadge.className = 'endless-offline-cap-badge hidden';
    capBadge.textContent = '12H MAX CAP';
    const stagesBadge = document.createElement('span');
    stagesBadge.className = 'endless-offline-stages-badge hidden';
    stagesBadge.textContent = '1 STAGE SIMULATED';
    badges.appendChild(awayBadge);
    badges.appendChild(capBadge);
    badges.appendChild(stagesBadge);

    // Reward Plaques: Sovereign Gold & Astral Shards
    const rewards = document.createElement('div');
    rewards.className = 'endless-offline-rewards';

    const goldPlaque = document.createElement('div');
    goldPlaque.className = 'endless-offline-plaque is-gold';
    const goldIcon = this._makeIconCanvas(32, 0, '#facc15', 'endless-offline-plaque-icon', ENDLESS_ICON_ROW);
    const goldMeta = document.createElement('div');
    goldMeta.className = 'endless-offline-plaque-meta';
    const goldVal = document.createElement('div');
    goldVal.className = 'endless-offline-plaque-val';
    goldVal.textContent = '+0 GOLD';
    const goldLbl = document.createElement('div');
    goldLbl.className = 'endless-offline-plaque-lbl';
    goldLbl.textContent = 'SOVEREIGN GOLD';
    goldMeta.appendChild(goldVal);
    goldMeta.appendChild(goldLbl);
    goldPlaque.appendChild(goldIcon);
    goldPlaque.appendChild(goldMeta);

    const shardPlaque = document.createElement('div');
    shardPlaque.className = 'endless-offline-plaque is-shard';
    const shardIcon = this._makeIconCanvas(32, 1, '#38bdf8', 'endless-offline-plaque-icon', ENDLESS_ICON_ROW);
    const shardMeta = document.createElement('div');
    shardMeta.className = 'endless-offline-plaque-meta';
    const shardVal = document.createElement('div');
    shardVal.className = 'endless-offline-plaque-val';
    shardVal.textContent = '+0 SHARDS';
    const shardLbl = document.createElement('div');
    shardLbl.className = 'endless-offline-plaque-lbl';
    shardLbl.textContent = 'ASTRAL SHARDS';
    shardMeta.appendChild(shardVal);
    shardMeta.appendChild(shardLbl);
    shardPlaque.appendChild(shardIcon);
    shardPlaque.appendChild(shardMeta);

    rewards.appendChild(goldPlaque);
    rewards.appendChild(shardPlaque);

    // Actions: COLLECT LOOT (Primary) + CONTINUE (Secondary — still claims so gold is never forfeited!)
    const actions = document.createElement('div');
    actions.className = 'endless-offline-actions';

    const collectBtn = document.createElement('button');
    collectBtn.type = 'button';
    collectBtn.className = 'endless-offline-collect-btn';
    collectBtn.textContent = 'COLLECT LOOT';
    collectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleCollectOfflineLoot();
    });

    const continueBtn = document.createElement('button');
    continueBtn.type = 'button';
    continueBtn.className = 'endless-offline-continue-btn';
    continueBtn.textContent = 'CONTINUE';
    continueBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleContinueOfflineLoot();
    });

    actions.appendChild(collectBtn);
    actions.appendChild(continueBtn);

    card.appendChild(header);
    card.appendChild(badges);
    card.appendChild(rewards);
    card.appendChild(actions);
    modal.appendChild(card);
    this.root.appendChild(modal);

    this._refs.offlineModal = modal;
    this._refs.offlineCard = card;
    this._refs.offlineAwayBadge = awayBadge;
    this._refs.offlineCapBadge = capBadge;
    this._refs.offlineStagesBadge = stagesBadge;
    this._refs.offlineGoldPlaque = goldPlaque;
    this._refs.offlineGoldVal = goldVal;
    this._refs.offlineShardPlaque = shardPlaque;
    this._refs.offlineShardVal = shardVal;
    this._refs.offlineCollectBtn = collectBtn;
    this._refs.offlineContinueBtn = continueBtn;
  }

  _buildShopToggle() {
    const toggle = document.createElement('button');
    toggle.id = 'endless-shop-toggle';
    toggle.type = 'button';
    toggle.className = 'endless-shop-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    stopEventLeak(toggle);

    const icon = this._makeIconCanvas(32, 11, '#facc15', 'endless-toggle-icon');
    const label = document.createElement('span');
    label.textContent = 'CRUSADE SHOP';
    const dot = document.createElement('span');
    dot.className = 'endless-affordable-dot hidden';
    dot.setAttribute('aria-hidden', 'true');

    toggle.appendChild(icon);
    toggle.appendChild(label);
    toggle.appendChild(dot);

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDrawer();
    });

    this.root.appendChild(toggle);
    this._refs.shopToggle = toggle;
    this._refs.affordableDot = dot;
  }

  _buildShopDrawer() {
    const shell = document.createElement('aside');
    shell.className = 'endless-shop-shell hidden';
    shell.setAttribute('aria-label', 'Endless Crusade Shop Drawer');
    stopEventLeak(shell);

    // Drawer Header
    const header = document.createElement('div');
    header.className = 'endless-drawer-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'endless-drawer-title-wrap';
    const titleIcon = this._makeIconCanvas(32, 11, '#facc15', 'endless-currency-icon');
    const title = document.createElement('span');
    title.className = 'endless-drawer-title';
    title.textContent = 'CRUSADE ARMORY';
    titleWrap.appendChild(titleIcon);
    titleWrap.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'endless-drawer-close';
    closeBtn.setAttribute('aria-label', 'Close Crusade Shop');
    closeBtn.innerHTML = CLOSE_SVG;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setDrawerOpen(false);
    });

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    // Tab Bar
    const tabBar = document.createElement('div');
    tabBar.className = 'endless-tab-bar';
    tabBar.setAttribute('role', 'tablist');

    // Drawer Body
    const body = document.createElement('div');
    body.className = 'endless-drawer-body';

    // Compact Live Expandable Telemetry Footer Strip
    const telemetry = document.createElement('div');
    telemetry.className = 'endless-drawer-telemetry';

    const telemTop = document.createElement('div');
    telemTop.className = 'endless-telem-top';

    const telemMetrics = document.createElement('div');
    telemMetrics.className = 'endless-telem-metrics';

    const dpsPair = document.createElement('span');
    dpsPair.className = 'endless-telem-pair';
    const dpsKey = document.createElement('span');
    dpsKey.className = 'endless-telem-key';
    dpsKey.textContent = 'DPS';
    const dpsVal = document.createElement('span');
    dpsVal.className = 'endless-telem-val';
    dpsVal.textContent = '0';
    dpsPair.appendChild(dpsKey);
    dpsPair.appendChild(dpsVal);

    const goldPair = document.createElement('span');
    goldPair.className = 'endless-telem-pair';
    const goldKey = document.createElement('span');
    goldKey.className = 'endless-telem-key';
    goldKey.textContent = 'G/S';
    const goldVal = document.createElement('span');
    goldVal.className = 'endless-telem-val is-gold';
    goldVal.textContent = '0';
    goldPair.appendChild(goldKey);
    goldPair.appendChild(goldVal);

    telemMetrics.appendChild(dpsPair);
    telemMetrics.appendChild(goldPair);

    const telemExpandBtn = document.createElement('button');
    telemExpandBtn.type = 'button';
    telemExpandBtn.className = 'endless-telem-expand-btn';
    telemExpandBtn.setAttribute('aria-expanded', this._telemExpanded ? 'true' : 'false');
    telemExpandBtn.textContent = this._telemExpanded ? 'HIDE' : 'SPLIT';
    telemExpandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._playSfx('playUiClick');
      this._telemExpanded = !this._telemExpanded;
      if (this._refs.telemDetails) {
        this._refs.telemDetails.classList.toggle('hidden', !this._telemExpanded);
      }
      telemExpandBtn.setAttribute('aria-expanded', this._telemExpanded ? 'true' : 'false');
      setTextIfChanged(telemExpandBtn, this._telemExpanded ? 'HIDE' : 'SPLIT');
    });

    telemTop.appendChild(telemMetrics);
    telemTop.appendChild(telemExpandBtn);

    const telemTrack = document.createElement('div');
    telemTrack.className = 'endless-dps-bar-track is-slim';
    const telemSegHero = document.createElement('div');
    telemSegHero.className = 'endless-dps-seg is-hero';
    const telemSegTap = document.createElement('div');
    telemSegTap.className = 'endless-dps-seg is-tap';
    const telemSegParty = document.createElement('div');
    telemSegParty.className = 'endless-dps-seg is-party';
    telemTrack.appendChild(telemSegHero);
    telemTrack.appendChild(telemSegTap);
    telemTrack.appendChild(telemSegParty);

    const telemDetails = document.createElement('div');
    telemDetails.className = this._telemExpanded ? 'endless-telem-details' : 'endless-telem-details hidden';

    const makeTelemChip = (cls, lbl) => {
      const chip = document.createElement('div');
      chip.className = `endless-telem-chip ${cls}`;
      const k = document.createElement('span');
      k.className = 'endless-telem-chip-lbl';
      k.textContent = lbl;
      const v = document.createElement('span');
      v.className = 'endless-telem-chip-val';
      v.textContent = '0 (0%)';
      chip.appendChild(k);
      chip.appendChild(v);
      telemDetails.appendChild(chip);
      return v;
    };

    const telemHeroVal = makeTelemChip('is-hero', 'HERO');
    const telemTapVal = makeTelemChip('is-tap', 'TAP');
    const telemPartyVal = makeTelemChip('is-party', 'PARTY');

    telemetry.appendChild(telemTop);
    telemetry.appendChild(telemTrack);
    telemetry.appendChild(telemDetails);

    shell.appendChild(header);
    shell.appendChild(tabBar);
    shell.appendChild(body);
    shell.appendChild(telemetry);
    this.root.appendChild(shell);

    this._refs.shopShell = shell;
    this._refs.tabBar = tabBar;
    this._refs.drawerBody = body;
    this._refs.telemDpsVal = dpsVal;
    this._refs.telemGoldVal = goldVal;
    this._refs.telemExpandBtn = telemExpandBtn;
    this._refs.telemDetails = telemDetails;
    this._refs.telemSegHero = telemSegHero;
    this._refs.telemSegTap = telemSegTap;
    this._refs.telemSegParty = telemSegParty;
    this._refs.telemHeroVal = telemHeroVal;
    this._refs.telemTapVal = telemTapVal;
    this._refs.telemPartyVal = telemPartyVal;

    for (let i = 0; i < this.tabs.length; i++) {
      this._ensureTabElements(this.tabs[i]);
    }
  }

  _ensureTabElements(tabDef) {
    if (!this._refs.tabBar || !this._refs.drawerBody) return;

    let btn = this._tabBtnRefs.get(tabDef.id);
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'endless-tab-btn';
      btn.setAttribute('role', 'tab');
      btn.dataset.tabId = tabDef.id;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'endless-tab-label';
      labelSpan.textContent = tabDef.label;
      btn.appendChild(labelSpan);
      btn._labelSpan = labelSpan;

      if (tabDef.id === 'gear') {
        const dot = document.createElement('span');
        dot.className = 'endless-tab-dot is-gear hidden';
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
        this._refs.gearTabDot = dot;
      }

      if (tabDef.id === 'ascend') {
        const dot = document.createElement('span');
        dot.className = 'endless-tab-dot hidden';
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
        this._refs.ascendTabDot = dot;
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setActiveTab(tabDef.id);
      });
      this._refs.tabBar.appendChild(btn);
      this._tabBtnRefs.set(tabDef.id, btn);
    } else {
      setTextIfChanged(btn._labelSpan || btn, tabDef.label);
    }

    let panel = this._tabPanelRefs.get(tabDef.id);
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'endless-tab-panel hidden';
      panel.dataset.tabPanel = tabDef.id;
      this._refs.drawerBody.appendChild(panel);
      this._tabPanelRefs.set(tabDef.id, panel);

      if (tabDef.id === 'items') {
        this._buildItemsPanel(panel);
      } else if (tabDef.id === 'gear') {
        this._buildGearPanel(panel);
      } else if (tabDef.id === 'companions') {
        this._buildCompanionsPanel(panel);
      } else if (tabDef.id === 'ascend') {
        this._buildAscendPanel(panel);
      } else if (tabDef.id === 'stats') {
        this._buildStatsPanel(panel);
      } else if (typeof tabDef.renderContent === 'function') {
        tabDef.renderContent(panel, this);
      }
    }
  }

  _buildItemsPanel(panel) {
    const bulkBar = document.createElement('div');
    bulkBar.className = 'endless-bulk-bar';

    const bulkLabel = document.createElement('span');
    bulkLabel.className = 'endless-bulk-label';
    bulkLabel.textContent = 'BULK BUY';

    const bulkGroup = document.createElement('div');
    bulkGroup.className = 'endless-bulk-group';

    const modes = ['x1', 'x10', 'MAX'];
    for (let i = 0; i < modes.length; i++) {
      const mode = modes[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = mode === 'x1' ? 'endless-bulk-btn is-active' : 'endless-bulk-btn';
      b.dataset.bulkMode = mode;
      b.textContent = mode.toUpperCase();
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleSetBulkMode(mode);
      });
      bulkGroup.appendChild(b);
      this._bulkBtnRefs.set(mode, b);
    }

    bulkBar.appendChild(bulkLabel);
    bulkBar.appendChild(bulkGroup);

    // Wave 4: Compact Relic Set Synergies strip (Row 9 Cols 4/5/6)
    const setsStrip = document.createElement('div');
    setsStrip.className = 'endless-relic-sets-strip';
    this._relicSetPillRefs = new Map();
    for (let i = 0; i < ENDLESS_RELIC_SETS.length; i++) {
      const setDef = ENDLESS_RELIC_SETS[i];
      const pill = document.createElement('div');
      pill.className = 'endless-relic-set-pill';
      pill.dataset.setId = setDef.id;
      pill.title = `${setDef.name}: ALL LV.${setDef.tiers[0].minLevel} -> ${setDef.tiers[0].bonusDesc}`;

      const head = document.createElement('div');
      head.className = 'endless-relic-set-head';
      const iconCanvas = this._makeIconCanvas(
        24,
        setDef.sigilCol,
        setDef.color,
        'endless-relic-set-icon',
        ENDLESS_SIGIL_ROW
      );
      const nameSpan = document.createElement('span');
      nameSpan.className = 'endless-relic-set-name';
      nameSpan.textContent = setDef.name.replace("'S ", ' ');
      head.appendChild(iconCanvas);
      head.appendChild(nameSpan);

      const foot = document.createElement('div');
      foot.className = 'endless-relic-set-foot';
      const tierSpan = document.createElement('span');
      tierSpan.className = 'endless-relic-set-tier';
      tierSpan.textContent = 'LOCKED';
      const lvSpan = document.createElement('span');
      lvSpan.className = 'endless-relic-set-lv';
      lvSpan.textContent = `0/${setDef.tiers[0].minLevel}`;
      foot.appendChild(tierSpan);
      foot.appendChild(lvSpan);

      pill.appendChild(head);
      pill.appendChild(foot);
      setsStrip.appendChild(pill);
      this._relicSetPillRefs.set(setDef.id, { pill, tierSpan, lvSpan, def: setDef });
    }

    const list = document.createElement('div');
    list.className = 'endless-scroll-list';

    for (let i = 0; i < ENDLESS_RELICS.length; i++) {
      const relic = ENDLESS_RELICS[i];
      const row = document.createElement('div');
      row.className = 'endless-relic-row';
      row.dataset.relicId = relic.id;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'endless-relic-icon-wrap';
      iconWrap.style.borderColor = relic.accentHex;
      const iconCanvas = this._makeIconCanvas(32, relic.iconCol, relic.accentHex, 'endless-relic-icon');
      iconWrap.appendChild(iconCanvas);

      const info = document.createElement('div');
      info.className = 'endless-relic-info';

      const head = document.createElement('div');
      head.className = 'endless-relic-head';
      const nameEl = document.createElement('span');
      nameEl.className = 'endless-relic-name';
      nameEl.textContent = relic.name;
      const lvEl = document.createElement('span');
      lvEl.className = 'endless-relic-lv';
      lvEl.textContent = 'LV.0';
      const milestoneEl = document.createElement('span');
      milestoneEl.className = 'endless-relic-milestone';
      milestoneEl.textContent = 'LV.10 X1.5';
      head.appendChild(nameEl);
      head.appendChild(lvEl);
      head.appendChild(milestoneEl);

      const bonusEl = document.createElement('div');
      bonusEl.className = 'endless-relic-bonus';
      bonusEl.textContent = relic.formatBonus(0);

      const subEl = document.createElement('div');
      subEl.className = 'endless-relic-sub';
      subEl.textContent = relic.shortDesc;

      info.appendChild(head);
      info.appendChild(bonusEl);
      info.appendChild(subEl);

      const buyBtn = document.createElement('button');
      buyBtn.type = 'button';
      buyBtn.className = 'endless-buy-btn';
      buyBtn.dataset.relicId = relic.id;

      const countSpan = document.createElement('span');
      countSpan.className = 'endless-buy-count';
      countSpan.textContent = '+1';

      const costSpan = document.createElement('span');
      costSpan.className = 'endless-buy-cost';
      costSpan.textContent = `${formatEndlessNumber(relic.baseCost)}G`;

      buyBtn.appendChild(countSpan);
      buyBtn.appendChild(costSpan);

      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleBuyRelic(relic.id);
      });

      row.appendChild(iconWrap);
      row.appendChild(info);
      row.appendChild(buyBtn);
      list.appendChild(row);

      this._relicRowRefs.set(relic.id, {
        row,
        lvEl,
        milestoneEl,
        bonusEl,
        buyBtn,
        countSpan,
        costSpan
      });
    }

    panel.appendChild(bulkBar);
    panel.appendChild(setsStrip);
    panel.appendChild(list);
  }

  _buildGearPanel(panel) {
    // 1. Pinned Gear Forge Header Strip
    const header = document.createElement('div');
    header.className = 'endless-gear-header';

    const metricsRow = document.createElement('div');
    metricsRow.className = 'endless-gear-metrics-row';

    const dustMetric = document.createElement('div');
    dustMetric.className = 'endless-gear-metric is-dust';
    dustMetric.title = 'Forge Dust used to enhance equipped or bagged gear up to +20';
    const dustLeft = document.createElement('span');
    dustLeft.className = 'endless-gear-metric-left';
    const dustIcon = document.createElement('span');
    dustIcon.innerHTML = FORGE_DUST_SVG;
    const dustLbl = document.createElement('span');
    dustLbl.className = 'endless-gear-metric-lbl';
    dustLbl.textContent = 'FORGE DUST';
    dustLeft.appendChild(dustIcon);
    dustLeft.appendChild(dustLbl);
    const dustVal = document.createElement('span');
    dustVal.className = 'endless-gear-metric-val';
    dustVal.textContent = '0';
    dustMetric.appendChild(dustLeft);
    dustMetric.appendChild(dustVal);

    const powerMetric = document.createElement('div');
    powerMetric.className = 'endless-gear-metric is-power';
    powerMetric.title = 'Combined Gear Power across all 4 equipped slots';
    const powerLbl = document.createElement('span');
    powerLbl.className = 'endless-gear-metric-lbl';
    powerLbl.textContent = 'GEAR POWER';
    const powerVal = document.createElement('span');
    powerVal.className = 'endless-gear-metric-val';
    powerVal.textContent = '0';
    powerMetric.appendChild(powerLbl);
    powerMetric.appendChild(powerVal);

    metricsRow.appendChild(dustMetric);
    metricsRow.appendChild(powerMetric);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'endless-gear-actions-row';

    const equipBestBtn = document.createElement('button');
    equipBestBtn.type = 'button';
    equipBestBtn.className = 'endless-gear-hdr-btn is-equip-best';
    equipBestBtn.textContent = 'EQUIP BEST';
    equipBestBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleEquipBestGear();
    });

    const salvageLowerBtn = document.createElement('button');
    salvageLowerBtn.type = 'button';
    salvageLowerBtn.className = 'endless-gear-hdr-btn is-salvage';
    salvageLowerBtn.textContent = 'SALVAGE LOWER';
    salvageLowerBtn.disabled = true;
    salvageLowerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleSalvageAllLowerGear();
    });

    actionsRow.appendChild(equipBestBtn);
    actionsRow.appendChild(salvageLowerBtn);

    header.appendChild(metricsRow);
    header.appendChild(actionsRow);

    // 2. Scrollable Gear Forge Body (Equipped 2x2 + Mythic Sets + Bag)
    const scroll = document.createElement('div');
    scroll.className = 'endless-scroll-list endless-gear-scroll';

    // 2A. 4 Equipped Slots Grid (2x2 compact cards)
    const equippedGrid = document.createElement('div');
    equippedGrid.className = 'endless-gear-equipped-grid';

    this._gearSlotRefs.clear();
    for (let i = 0; i < GEAR_SLOT_ORDER.length; i++) {
      const slotId = GEAR_SLOT_ORDER[i];
      const slotDef = GEAR_SLOT_DEFAULTS[slotId];

      const card = document.createElement('div');
      card.className = 'endless-gear-slot-card is-empty';
      card.dataset.gearSlot = slotId;

      const top = document.createElement('div');
      top.className = 'endless-gear-slot-top';

      const iconWrap = document.createElement('span');
      iconWrap.className = 'endless-gear-slot-icon';
      iconWrap.innerHTML = getGearSlotSvg(slotId);

      const badges = document.createElement('div');
      badges.className = 'endless-gear-slot-badges';

      const rarityPill = document.createElement('span');
      rarityPill.className = 'endless-gear-rarity-pill';
      rarityPill.textContent = slotDef.label;

      const enhLvEl = document.createElement('span');
      enhLvEl.className = 'endless-gear-enh-lv hidden';
      enhLvEl.textContent = '+0';

      badges.appendChild(rarityPill);
      badges.appendChild(enhLvEl);
      top.appendChild(iconWrap);
      top.appendChild(badges);

      const nameEl = document.createElement('div');
      nameEl.className = 'endless-gear-slot-name';
      nameEl.textContent = 'EMPTY SLOT';

      const statsEl = document.createElement('div');
      statsEl.className = 'endless-gear-slot-stats';
      statsEl.textContent = 'NO ITEM EQUIPPED';

      const foot = document.createElement('div');
      foot.className = 'endless-gear-slot-foot';

      const setTagEl = document.createElement('span');
      setTagEl.className = 'endless-gear-set-tag is-pwr';
      setTagEl.textContent = 'PWR 0';

      const enhBtn = document.createElement('button');
      enhBtn.type = 'button';
      enhBtn.className = 'endless-gear-enh-btn';
      enhBtn.textContent = '+1';
      enhBtn.disabled = true;

      const slotRef = {
        slotId,
        card,
        iconWrap,
        rarityPill,
        enhLvEl,
        nameEl,
        statsEl,
        foot,
        setTagEl,
        enhBtn,
        currentUid: null,
        currentItem: null
      };

      enhBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (slotRef.currentUid) {
          this._handleEnhanceGear(slotRef.currentUid, slotRef.card, slotRef.enhBtn, slotRef.currentItem);
        }
      });

      foot.appendChild(setTagEl);
      foot.appendChild(enhBtn);

      card.appendChild(top);
      card.appendChild(nameEl);
      card.appendChild(statsEl);
      card.appendChild(foot);
      equippedGrid.appendChild(card);

      this._gearSlotRefs.set(slotId, slotRef);
    }

    // 2B. Mythic Set Passives Strip (3 compact pills)
    const setsStrip = document.createElement('div');
    setsStrip.className = 'endless-gear-sets-strip';
    this._gearSetPillRefs.clear();

    for (let i = 0; i < DEFAULT_MYTHIC_SETS.length; i++) {
      const def = DEFAULT_MYTHIC_SETS[i];
      const pill = document.createElement('div');
      pill.className = 'endless-gear-set-pill';
      pill.dataset.mythicSetId = def.id;
      pill.title = `${def.name}: ${def.fullDesc}`;

      const nameEl = document.createElement('div');
      nameEl.className = 'endless-gear-set-name';
      nameEl.textContent = def.name;

      const statusEl = document.createElement('span');
      statusEl.className = 'endless-gear-set-status';
      statusEl.textContent = `0/${def.requiredPieces}`;

      const descEl = document.createElement('div');
      descEl.className = 'endless-gear-set-desc';
      descEl.textContent = def.shortDesc;

      pill.appendChild(nameEl);
      pill.appendChild(statusEl);
      pill.appendChild(descEl);
      setsStrip.appendChild(pill);

      this._gearSetPillRefs.set(def.id, { pill, nameEl, statusEl, descEl, def });
    }

    // 2C. Inventory Section (BAG x/24)
    const bagHead = document.createElement('div');
    bagHead.className = 'endless-gear-bag-head';
    const bagCount = document.createElement('span');
    bagCount.className = 'endless-gear-bag-title';
    bagCount.textContent = 'BAG 0/24';
    const bagHint = document.createElement('span');
    bagHint.className = 'endless-gear-bag-hint';
    bagHint.textContent = 'LOOT INVENTORY';
    bagHead.appendChild(bagCount);
    bagHead.appendChild(bagHint);

    const bagEmpty = document.createElement('div');
    bagEmpty.className = 'endless-empty-msg';
    bagEmpty.textContent = 'SLAY BOSSES, ELITES & GOBLINS FOR LOOT';

    const bagItems = document.createElement('div');
    bagItems.className = 'endless-gear-bag-items';

    scroll.appendChild(equippedGrid);
    scroll.appendChild(setsStrip);
    scroll.appendChild(bagHead);
    scroll.appendChild(bagEmpty);
    scroll.appendChild(bagItems);

    panel.appendChild(header);
    panel.appendChild(scroll);

    this._refs.gearHeader = header;
    this._refs.gearDustMetric = dustMetric;
    this._refs.gearDustVal = dustVal;
    this._refs.gearPowerVal = powerVal;
    this._refs.gearEquipBestBtn = equipBestBtn;
    this._refs.gearSalvageLowerBtn = salvageLowerBtn;
    this._refs.gearEquippedGrid = equippedGrid;
    this._refs.gearSetsStrip = setsStrip;
    this._refs.gearBagCount = bagCount;
    this._refs.gearBagHint = bagHint;
    this._refs.gearBagEmpty = bagEmpty;
    this._refs.gearBagItems = bagItems;
  }

  _createGearBagRow(item) {
    const row = document.createElement('div');
    row.className = 'endless-gear-bag-row';
    row.dataset.gearUid = String(item.uid || '');

    const iconWrap = document.createElement('div');
    iconWrap.className = 'endless-gear-bag-icon-wrap';
    iconWrap.innerHTML = getGearSlotSvg(item.slot);

    const body = document.createElement('div');
    body.className = 'endless-gear-bag-body';

    const top = document.createElement('div');
    top.className = 'endless-gear-bag-top';

    const nameEl = document.createElement('span');
    nameEl.className = 'endless-gear-bag-name';
    nameEl.textContent = item.name || 'GEAR ITEM';

    const enhLvEl = document.createElement('span');
    enhLvEl.className = 'endless-gear-enh-lv hidden';
    enhLvEl.textContent = '+0';

    const upBadge = document.createElement('span');
    upBadge.className = 'endless-gear-up-badge hidden';
    upBadge.textContent = 'UP!';

    top.appendChild(nameEl);
    top.appendChild(enhLvEl);
    top.appendChild(upBadge);

    const sub = document.createElement('div');
    sub.className = 'endless-gear-bag-sub';

    const rarityPill = document.createElement('span');
    rarityPill.className = 'endless-gear-rarity-pill';
    rarityPill.textContent = 'COMMON';

    const setTagEl = document.createElement('span');
    setTagEl.className = 'endless-gear-set-tag hidden';
    setTagEl.textContent = '';

    const statsEl = document.createElement('span');
    statsEl.className = 'endless-gear-bag-stats';
    statsEl.textContent = '';

    sub.appendChild(rarityPill);
    sub.appendChild(setTagEl);
    sub.appendChild(statsEl);

    const actions = document.createElement('div');
    actions.className = 'endless-gear-bag-actions';

    const equipBtn = document.createElement('button');
    equipBtn.type = 'button';
    equipBtn.className = 'endless-gear-act-btn is-equip';
    equipBtn.textContent = 'EQUIP';

    const enhBtn = document.createElement('button');
    enhBtn.type = 'button';
    enhBtn.className = 'endless-gear-act-btn is-enhance hidden';
    enhBtn.textContent = '+1';

    const salvageBtn = document.createElement('button');
    salvageBtn.type = 'button';
    salvageBtn.className = 'endless-gear-act-btn is-salvage';
    salvageBtn.textContent = 'SALVAGE';

    const rowRef = {
      uid: String(item.uid || ''),
      renderedSlot: item.slot || 'weapon',
      item,
      row,
      iconWrap,
      nameEl,
      enhLvEl,
      upBadge,
      rarityPill,
      setTagEl,
      statsEl,
      equipBtn,
      enhBtn,
      salvageBtn
    };

    equipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleEquipGear(rowRef.uid, rowRef.row, rowRef.equipBtn, rowRef.item);
    });

    enhBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleEnhanceGear(rowRef.uid, rowRef.row, rowRef.enhBtn, rowRef.item);
    });

    salvageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleSalvageGear(rowRef.uid, rowRef.row, rowRef.salvageBtn, rowRef.item);
    });

    actions.appendChild(equipBtn);
    actions.appendChild(enhBtn);
    actions.appendChild(salvageBtn);

    body.appendChild(top);
    body.appendChild(sub);
    body.appendChild(actions);

    row.appendChild(iconWrap);
    row.appendChild(body);

    return rowRef;
  }

  _patchGearBagRow(rowRef, item) {
    rowRef.item = item;
    if (rowRef.renderedSlot !== item.slot) {
      rowRef.renderedSlot = item.slot;
      rowRef.iconWrap.innerHTML = getGearSlotSvg(item.slot);
    }

    const rarityColor = item.rarityMeta?.color || '#94a3b8';
    const rarityLabel = item.rarityMeta?.label || String(item.rarity || 'COMMON').toUpperCase();
    const slotLabel = item.slotMeta?.label || GEAR_SLOT_DEFAULTS[item.slot]?.label || String(item.slot || 'GEAR').toUpperCase();
    const lv = Math.max(0, Math.floor(Number(item.enhanceLevel) || 0));
    const isUpgrade = Boolean(item.isUpgradeOverEquipped);

    rowRef.row.classList.toggle('is-upgrade', isUpgrade);
    rowRef.row.style.borderColor = rarityColor;
    rowRef.iconWrap.style.borderColor = rarityColor;

    setTextIfChanged(rowRef.nameEl, item.name || `${rarityLabel} ${slotLabel}`);
    rowRef.enhLvEl.classList.toggle('hidden', lv <= 0);
    if (lv > 0) {
      setTextIfChanged(rowRef.enhLvEl, `+${lv}`);
    }
    rowRef.upBadge.classList.toggle('hidden', !isUpgrade);

    rowRef.rarityPill.style.borderColor = rarityColor;
    rowRef.rarityPill.style.color = rarityColor;
    setTextIfChanged(rowRef.rarityPill, rarityLabel);

    if (item.setMeta && item.setMeta.name) {
      const accent = item.setMeta.accentHex || '#facc15';
      rowRef.setTagEl.classList.remove('hidden');
      rowRef.setTagEl.style.borderColor = accent;
      rowRef.setTagEl.style.color = accent;
      setTextIfChanged(rowRef.setTagEl, item.setMeta.name);
    } else {
      rowRef.setTagEl.classList.add('hidden');
    }

    const bonuses = item.effectiveBonuses || item.bonuses;
    const compactStats = formatGearBonuses(bonuses, 2) || `PWR ${formatEndlessNumber(item.power || 0)}`;
    setTextIfChanged(rowRef.statsEl, compactStats);

    rowRef.equipBtn.classList.toggle('is-upgrade', isUpgrade);
    setTextIfChanged(rowRef.equipBtn, 'EQUIP');

    const canEnhance = Boolean(item.canEnhance && !item.isMaxEnhanced);
    rowRef.enhBtn.classList.toggle('hidden', !canEnhance);
    if (canEnhance) {
      const enhCost = Math.max(0, Math.floor(Number(item.enhanceCost) || 0));
      setTextIfChanged(rowRef.enhBtn, `+1 (${formatEndlessNumber(enhCost)}D)`);
      rowRef.enhBtn.disabled = false;
    }

    const salvageVal = Math.max(0, Math.floor(Number(item.salvageValue) || 0));
    setTextIfChanged(rowRef.salvageBtn, `SALVAGE +${formatEndlessNumber(salvageVal)}`);

    const fullStats = formatGearBonuses(bonuses, 0);
    const tip =
      `${item.name || slotLabel}${lv > 0 ? ` +${lv}` : ''} [${rarityLabel} ${slotLabel}] ` +
      `STG ${item.stage || 1} | PWR ${formatEndlessNumber(item.power || 0)}` +
      (fullStats ? ` | ${fullStats}` : '') +
      (item.setMeta?.name ? ` | SET: ${item.setMeta.name}` : '');
    if (rowRef.row.title !== tip) {
      rowRef.row.title = tip;
    }
  }

  _buildCompanionsPanel(panel) {
    const partyBar = document.createElement('div');
    partyBar.className = 'endless-party-bar';

    const partyRow = document.createElement('div');
    partyRow.className = 'endless-party-row';
    const counter = document.createElement('span');
    counter.className = 'endless-party-counter';
    counter.textContent = 'ACTIVE PARTY 0 / 3';
    const hint = document.createElement('span');
    hint.className = 'endless-party-hint';
    hint.textContent = 'FIGHT BESIDE HERO';
    partyRow.appendChild(counter);
    partyRow.appendChild(hint);

    const notice = document.createElement('div');
    notice.className = 'endless-party-notice hidden';
    notice.textContent = '';

    // Active Party Synergies section in Companions tab header
    const synBox = document.createElement('div');
    synBox.className = 'endless-party-synergies-box';

    const synHead = document.createElement('div');
    synHead.className = 'endless-party-syn-head';
    const synTitle = document.createElement('span');
    synTitle.className = 'endless-party-syn-title';
    synTitle.textContent = 'PARTY SYNERGIES';
    const synCount = document.createElement('span');
    synCount.className = 'endless-party-syn-count';
    synCount.textContent = '0 ACTIVE';
    synHead.appendChild(synTitle);
    synHead.appendChild(synCount);

    const synList = document.createElement('div');
    synList.className = 'endless-party-syn-list';
    const synEmpty = document.createElement('div');
    synEmpty.className = 'endless-party-syn-empty';
    synEmpty.textContent = 'DEPLOY COMPATIBLE ALLIES TO UNLOCK SQUAD BONUSES';
    synList.appendChild(synEmpty);

    synBox.appendChild(synHead);
    synBox.appendChild(synList);

    partyBar.appendChild(partyRow);
    partyBar.appendChild(synBox);
    partyBar.appendChild(notice);

    const list = document.createElement('div');
    list.className = 'endless-scroll-list';

    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'endless-empty-msg hidden';
    emptyMsg.textContent = 'NO COMPANIONS AVAILABLE YET';
    list.appendChild(emptyMsg);

    panel.appendChild(partyBar);
    panel.appendChild(list);

    this._refs.partyCounter = counter;
    this._refs.partyNotice = notice;
    this._refs.partySynCount = synCount;
    this._refs.partySynList = synList;
    this._refs.companionList = list;
    this._refs.companionEmpty = emptyMsg;
  }

  _ensureCompanionCard(comp) {
    const existing = this._companionCardRefs.get(comp.id);
    if (existing) return existing;

    const card = document.createElement('div');
    card.className = 'endless-comp-card';
    card.dataset.companionId = comp.id;

    const portWrap = document.createElement('div');
    portWrap.className = 'endless-comp-portrait-wrap';
    portWrap.style.borderColor = comp.accentHex || '#d4af37';

    const portCanvas = document.createElement('canvas');
    portCanvas.width = 40;
    portCanvas.height = 40;
    portCanvas.className = 'endless-comp-portrait';
    portCanvas.setAttribute('aria-hidden', 'true');
    portWrap.appendChild(portCanvas);

    const body = document.createElement('div');
    body.className = 'endless-comp-body';

    const top = document.createElement('div');
    top.className = 'endless-comp-top';
    const nameEl = document.createElement('span');
    nameEl.className = 'endless-comp-name';
    nameEl.textContent = comp.name || comp.id;
    const roleEl = document.createElement('span');
    roleEl.className = 'endless-comp-role';
    roleEl.textContent = comp.role || 'ALLY';
    roleEl.style.borderColor = comp.accentHex || '#d4af37';
    roleEl.style.color = comp.accentHex || '#fde047';
    top.appendChild(nameEl);
    top.appendChild(roleEl);

    const meta = document.createElement('div');
    meta.className = 'endless-comp-meta';
    const lvEl = document.createElement('span');
    lvEl.textContent = 'LOCKED';
    const dpsEl = document.createElement('span');
    dpsEl.textContent = 'DPS 0';
    meta.appendChild(lvEl);
    meta.appendChild(dpsEl);

    const descEl = document.createElement('div');
    descEl.className = 'endless-comp-desc';
    descEl.textContent = comp.abilityName
      ? `${comp.abilityName}: ${comp.desc || ''}`
      : (comp.desc || '');

    const actions = document.createElement('div');
    actions.className = 'endless-comp-actions';

    const primaryBtn = document.createElement('button');
    primaryBtn.type = 'button';
    primaryBtn.className = 'endless-comp-btn';
    primaryBtn.textContent = 'RECRUIT';
    primaryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleCompanionPrimary(comp.id);
    });

    const deployBtn = document.createElement('button');
    deployBtn.type = 'button';
    deployBtn.className = 'endless-comp-btn endless-comp-deploy-btn hidden';
    deployBtn.textContent = 'DEPLOY';
    deployBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleCompanionDeploy(comp.id);
    });

    actions.appendChild(primaryBtn);
    actions.appendChild(deployBtn);

    body.appendChild(top);
    body.appendChild(meta);
    body.appendChild(descEl);
    body.appendChild(actions);

    card.appendChild(portWrap);
    card.appendChild(body);

    if (this._refs.companionList) {
      this._refs.companionList.appendChild(card);
    }

    const ref = {
      card,
      portCanvas,
      lvEl,
      dpsEl,
      primaryBtn,
      deployBtn,
      heroKey: comp.heroKey,
      accentHex: comp.accentHex
    };
    this._companionCardRefs.set(comp.id, ref);
    return ref;
  }

  _buildAscendPanel(panel) {
    const scroll = document.createElement('div');
    scroll.className = 'endless-scroll-list';

    // Top Astral Ascension Prestige Card (Obsidian-Violet & Burnished-Gold)
    const card = document.createElement('div');
    card.className = 'endless-ascend-card';

    const head = document.createElement('div');
    head.className = 'endless-ascend-head';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'endless-ascend-title-wrap';
    const crestCanvas = this._makeIconCanvas(32, 0, '#c084fc', 'endless-ascend-crest', 1);
    const titleEl = document.createElement('span');
    titleEl.className = 'endless-ascend-title';
    titleEl.textContent = 'ASTRAL ASCENSION';
    titleWrap.appendChild(crestCanvas);
    titleWrap.appendChild(titleEl);

    const countEl = document.createElement('span');
    countEl.className = 'endless-ascend-count';
    countEl.textContent = 'ASCENSIONS: 0';

    head.appendChild(titleWrap);
    head.appendChild(countEl);

    const metrics = document.createElement('div');
    metrics.className = 'endless-ascend-metrics';

    // Current Astral Shards Badge Plaque
    const curPlaque = document.createElement('div');
    curPlaque.className = 'endless-ascend-plaque';
    const curLbl = document.createElement('span');
    curLbl.className = 'endless-ascend-plaque-lbl';
    curLbl.textContent = 'ASTRAL SHARDS';
    const curValRow = document.createElement('div');
    curValRow.className = 'endless-ascend-plaque-val-row';
    const curShardIcon = this._makeIconCanvas(32, 1, '#38bdf8', 'endless-ascend-shard-icon', ENDLESS_ICON_ROW);
    const curShardVal = document.createElement('span');
    curShardVal.className = 'endless-ascend-plaque-val';
    curShardVal.textContent = '0';
    curValRow.appendChild(curShardIcon);
    curValRow.appendChild(curShardVal);
    curPlaque.appendChild(curLbl);
    curPlaque.appendChild(curValRow);

    // Live Pending Prestige Preview Plaque
    const previewPlaque = document.createElement('div');
    previewPlaque.className = 'endless-ascend-plaque is-preview';
    const previewLbl = document.createElement('span');
    previewLbl.className = 'endless-ascend-plaque-lbl';
    previewLbl.textContent = 'ON PRESTIGE';
    const previewVal = document.createElement('span');
    previewVal.className = 'endless-ascend-plaque-val is-pending is-locked';
    previewVal.textContent = '+0 ASTRAL SHARDS';
    previewPlaque.appendChild(previewLbl);
    previewPlaque.appendChild(previewVal);

    metrics.appendChild(curPlaque);
    metrics.appendChild(previewPlaque);

    const noteEl = document.createElement('div');
    noteEl.className = 'endless-ascend-note';
    noteEl.textContent = 'RESETS STAGE, GOLD & ALLIES - KEEPS SHARDS & ETERNAL ARTIFACTS';

    const ascendBtn = document.createElement('button');
    ascendBtn.type = 'button';
    ascendBtn.className = 'endless-ascend-btn';
    ascendBtn.disabled = true;
    const ascendBtnIcon = document.createElement('span');
    ascendBtnIcon.innerHTML = ASCEND_STAR_SVG;
    const ascendBtnLabel = document.createElement('span');
    ascendBtnLabel.textContent = 'REACH STAGE 5 TO ASCEND';
    ascendBtn.appendChild(ascendBtnIcon);
    ascendBtn.appendChild(ascendBtnLabel);
    ascendBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleAscendClick();
    });

    card.appendChild(head);
    card.appendChild(metrics);
    card.appendChild(noteEl);
    card.appendChild(ascendBtn);

    // Eternal Artifacts Section Header & List
    const sectionHead = document.createElement('div');
    sectionHead.className = 'endless-ascend-section-head';
    const sectionTitle = document.createElement('span');
    sectionTitle.className = 'endless-ascend-section-title';
    sectionTitle.textContent = 'ETERNAL ARTIFACTS';
    const sectionSub = document.createElement('span');
    sectionSub.className = 'endless-ascend-section-sub';
    sectionSub.textContent = 'PERMANENT BOOSTS';
    sectionHead.appendChild(sectionTitle);
    sectionHead.appendChild(sectionSub);

    const artifactList = document.createElement('div');
    artifactList.className = 'endless-artifact-list';

    const artifactEmpty = document.createElement('div');
    artifactEmpty.className = 'endless-empty-msg hidden';
    artifactEmpty.textContent = 'ETERNAL ARTIFACTS UNAVAILABLE';
    artifactList.appendChild(artifactEmpty);

    scroll.appendChild(card);
    scroll.appendChild(sectionHead);
    scroll.appendChild(artifactList);
    panel.appendChild(scroll);

    this._refs.ascendCard = card;
    this._refs.ascendCount = countEl;
    this._refs.ascendCurShards = curShardVal;
    this._refs.ascendPendingShards = previewVal;
    this._refs.ascendBtn = ascendBtn;
    this._refs.ascendBtnLabel = ascendBtnLabel;
    this._refs.artifactSectionSub = sectionSub;
    this._refs.artifactList = artifactList;
    this._refs.artifactEmpty = artifactEmpty;
  }

  _ensureArtifactRow(art) {
    const existing = this._artifactRowRefs.get(art.id);
    if (existing) return existing;

    const iconSpec = resolveArtifactIconSpec(art);

    const row = document.createElement('div');
    row.className = 'endless-artifact-row';
    row.dataset.artifactId = art.id;

    const iconWrap = document.createElement('div');
    iconWrap.className = 'endless-artifact-icon-wrap';
    iconWrap.style.borderColor = iconSpec.accentHex;
    const iconCanvas = this._makeIconCanvas(32, iconSpec.col, iconSpec.accentHex, 'endless-artifact-icon', iconSpec.row);
    iconWrap.appendChild(iconCanvas);

    const info = document.createElement('div');
    info.className = 'endless-artifact-info';

    const head = document.createElement('div');
    head.className = 'endless-artifact-head';
    const nameEl = document.createElement('span');
    nameEl.className = 'endless-artifact-name';
    nameEl.textContent = art.name || art.id;
    const lvEl = document.createElement('span');
    lvEl.className = 'endless-artifact-lv';
    lvEl.textContent = `LV.${art.level || 0} / ${art.maxLevel || 1}`;
    head.appendChild(nameEl);
    head.appendChild(lvEl);

    const effectEl = document.createElement('div');
    effectEl.className = 'endless-artifact-effect';
    effectEl.textContent = art.effectSummary || '';

    const descEl = document.createElement('div');
    descEl.className = 'endless-artifact-desc';
    descEl.textContent = art.desc || '';

    info.appendChild(head);
    info.appendChild(effectEl);
    info.appendChild(descEl);

    const buyBtn = document.createElement('button');
    buyBtn.type = 'button';
    buyBtn.className = 'endless-artifact-buy-btn';
    buyBtn.dataset.artifactId = art.id;
    buyBtn.textContent = `${formatEndlessNumber(art.cost || 0)} SHARDS`;
    buyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleBuyEternalArtifact(art.id);
    });

    row.appendChild(iconWrap);
    row.appendChild(info);
    row.appendChild(buyBtn);

    if (this._refs.artifactList) {
      this._refs.artifactList.appendChild(row);
    }

    this._blitIconCanvas(iconCanvas, iconSpec.col, iconSpec.accentHex, true, iconSpec.row);

    const ref = {
      row,
      nameEl,
      lvEl,
      effectEl,
      descEl,
      buyBtn
    };
    this._artifactRowRefs.set(art.id, ref);
    return ref;
  }

  _buildStatsPanel(panel) {
    const scroll = document.createElement('div');
    scroll.className = 'endless-scroll-list';

    // Live Real-Time DPS Breakdown Card
    const dpsCard = document.createElement('div');
    dpsCard.className = 'endless-dps-card';

    const dpsHead = document.createElement('div');
    dpsHead.className = 'endless-dps-card-head';
    const dpsTitle = document.createElement('span');
    dpsTitle.className = 'endless-dps-title';
    dpsTitle.innerHTML = `${DPS_BAR_SVG}<span>DPS BREAKDOWN</span>`;
    const dpsFeverPill = document.createElement('span');
    dpsFeverPill.className = 'endless-dps-fever-pill hidden';
    dpsFeverPill.textContent = 'FEVER X2';
    dpsHead.appendChild(dpsTitle);
    dpsHead.appendChild(dpsFeverPill);

    const dpsBarTrack = document.createElement('div');
    dpsBarTrack.className = 'endless-dps-bar-track';
    const dpsSegHero = document.createElement('div');
    dpsSegHero.className = 'endless-dps-seg is-hero';
    const dpsSegTap = document.createElement('div');
    dpsSegTap.className = 'endless-dps-seg is-tap';
    const dpsSegParty = document.createElement('div');
    dpsSegParty.className = 'endless-dps-seg is-party';
    dpsBarTrack.appendChild(dpsSegHero);
    dpsBarTrack.appendChild(dpsSegTap);
    dpsBarTrack.appendChild(dpsSegParty);

    const dpsLegend = document.createElement('div');
    dpsLegend.className = 'endless-dps-legend';

    const makeDpsCol = (cls, labelText) => {
      const col = document.createElement('div');
      col.className = `endless-dps-col ${cls}`;
      const colHead = document.createElement('div');
      colHead.className = 'endless-dps-col-head';
      const sw = document.createElement('span');
      sw.className = `endless-dps-swatch ${cls}`;
      const lbl = document.createElement('span');
      lbl.textContent = labelText;
      colHead.appendChild(sw);
      colHead.appendChild(lbl);
      const val = document.createElement('div');
      val.className = 'endless-dps-col-val';
      val.textContent = '0';
      const pct = document.createElement('div');
      pct.className = 'endless-dps-col-pct';
      pct.textContent = '0%';
      col.appendChild(colHead);
      col.appendChild(val);
      col.appendChild(pct);
      dpsLegend.appendChild(col);
      return { val, pct };
    };

    const dpsHeroCol = makeDpsCol('is-hero', 'HERO DPS');
    const dpsTapCol = makeDpsCol('is-tap', 'TAP DPS');
    const dpsPartyCol = makeDpsCol('is-party', 'PARTY DPS');

    const dpsSummary = document.createElement('div');
    dpsSummary.className = 'endless-dps-summary';

    const sumTotal = document.createElement('div');
    sumTotal.className = 'endless-dps-sum-item';
    const sumTotalLbl = document.createElement('span');
    sumTotalLbl.className = 'endless-dps-sum-lbl';
    sumTotalLbl.textContent = 'TOTAL DPS';
    const sumTotalVal = document.createElement('span');
    sumTotalVal.className = 'endless-dps-sum-val';
    sumTotalVal.textContent = '0';
    sumTotal.appendChild(sumTotalLbl);
    sumTotal.appendChild(sumTotalVal);

    const sumGold = document.createElement('div');
    sumGold.className = 'endless-dps-sum-item';
    const sumGoldLbl = document.createElement('span');
    sumGoldLbl.className = 'endless-dps-sum-lbl';
    sumGoldLbl.textContent = 'GOLD / SEC';
    const sumGoldVal = document.createElement('span');
    sumGoldVal.className = 'endless-dps-sum-val is-gold';
    sumGoldVal.textContent = '0/S';
    sumGold.appendChild(sumGoldLbl);
    sumGold.appendChild(sumGoldVal);

    dpsSummary.appendChild(sumTotal);
    dpsSummary.appendChild(sumGold);

    dpsCard.appendChild(dpsHead);
    dpsCard.appendChild(dpsBarTrack);
    dpsCard.appendChild(dpsLegend);
    dpsCard.appendChild(dpsSummary);

    const grid = document.createElement('div');
    grid.className = 'endless-stats-grid';

    const statDefs = [
      ['stage', 'STAGE / BEST'],
      ['goldPerSec', 'GOLD / SEC'],
      ['heroDps', 'HERO DPS'],
      ['tapDps', 'TAP SMITE DPS'],
      ['companionDps', 'COMPANION DPS'],
      ['totalDps', 'COMBINED DPS'],
      ['totalKills', 'FOES SLAIN'],
      ['bossesSlain', 'BOSSES SLAIN'],
      ['totalTaps', 'ARCANE TAPS'],
      ['totalGold', 'TOTAL GOLD'],
      ['critInfo', 'CRIT RATE / DMG'],
      ['goldMult', 'GOLD / BOSS MULT'],
      ['discountInfo', 'SHOP DISCOUNT'],
      ['sustainInfo', 'LEECH / BOSS +S']
    ];

    for (let i = 0; i < statDefs.length; i++) {
      const [key, label] = statDefs[i];
      const cell = document.createElement('div');
      cell.className = 'endless-stat-cell';
      const lbl = document.createElement('span');
      lbl.className = 'endless-stat-label';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.className = 'endless-stat-val';
      val.textContent = '0';
      cell.appendChild(lbl);
      cell.appendChild(val);
      grid.appendChild(cell);
      this._statRefs.set(key, val);
    }

    const actions = document.createElement('div');
    actions.className = 'endless-stats-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'endless-action-btn';
    saveBtn.textContent = 'SAVE RUN';
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleSaveRun();
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'endless-action-btn is-danger';
    resetBtn.textContent = 'RESET RUN';
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleResetRunClick();
    });

    actions.appendChild(saveBtn);
    actions.appendChild(resetBtn);

    // Wave 4: Best-Stage Trophies Card (Row 9 Col 7 Trophy Crown)
    const trophiesCard = document.createElement('div');
    trophiesCard.className = 'endless-trophies-card';

    const trophyHead = document.createElement('div');
    trophyHead.className = 'endless-trophy-head';
    const trophyTitleWrap = document.createElement('div');
    trophyTitleWrap.className = 'endless-trophy-title-wrap';
    const trophyIcon = this._makeIconCanvas(28, 7, '#facc15', 'endless-trophy-icon', ENDLESS_SIGIL_ROW);
    const trophyTitle = document.createElement('span');
    trophyTitle.className = 'endless-trophy-title';
    trophyTitle.textContent = 'STAGE TROPHIES';
    trophyTitleWrap.appendChild(trophyIcon);
    trophyTitleWrap.appendChild(trophyTitle);

    const trophyBonus = document.createElement('span');
    trophyBonus.className = 'endless-trophy-bonus';
    trophyBonus.textContent = '+0% DMG / GOLD';
    trophyHead.appendChild(trophyTitleWrap);
    trophyHead.appendChild(trophyBonus);

    const trophyMeta = document.createElement('div');
    trophyMeta.className = 'endless-trophy-meta';
    const trophyRank = document.createElement('span');
    trophyRank.textContent = 'RANK: UNRANKED';
    const trophyNext = document.createElement('span');
    trophyNext.textContent = 'NEXT: STAGE 5';
    trophyMeta.appendChild(trophyRank);
    trophyMeta.appendChild(trophyNext);

    const trophyList = document.createElement('div');
    trophyList.className = 'endless-trophy-list';

    trophiesCard.appendChild(trophyHead);
    trophiesCard.appendChild(trophyMeta);
    trophiesCard.appendChild(trophyList);

    scroll.appendChild(dpsCard);
    scroll.appendChild(trophiesCard);
    scroll.appendChild(grid);
    scroll.appendChild(actions);
    panel.appendChild(scroll);

    this._refs.dpsFeverPill = dpsFeverPill;
    this._refs.dpsSegHero = dpsSegHero;
    this._refs.dpsSegTap = dpsSegTap;
    this._refs.dpsSegParty = dpsSegParty;
    this._refs.dpsHeroVal = dpsHeroCol.val;
    this._refs.dpsHeroPct = dpsHeroCol.pct;
    this._refs.dpsTapVal = dpsTapCol.val;
    this._refs.dpsTapPct = dpsTapCol.pct;
    this._refs.dpsPartyVal = dpsPartyCol.val;
    this._refs.dpsPartyPct = dpsPartyCol.pct;
    this._refs.dpsTotalVal = sumTotalVal;
    this._refs.dpsGoldSecVal = sumGoldVal;
    this._refs.trophyBonus = trophyBonus;
    this._refs.trophyRank = trophyRank;
    this._refs.trophyNext = trophyNext;
    this._refs.trophyList = trophyList;
    this._refs.saveBtn = saveBtn;
    this._refs.resetBtn = resetBtn;
  }

  _scheduleEphemeral(fn, delayMs) {
    if (typeof setTimeout !== 'function') return null;
    const timer = setTimeout(() => {
      this._ephemeralTimers.delete(timer);
      fn();
    }, delayMs);
    this._ephemeralTimers.add(timer);
    return timer;
  }

  _triggerBuyFeedback(cardEl, btnEl, badgeText, isRecruit = false) {
    const targets = [cardEl, btnEl].filter(Boolean);
    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      if (!el.classList) continue;
      el.classList.remove('is-buy-pulse');
      // Force synchronous reflow so consecutive purchases cleanly restart the CSS flare
      void el.offsetWidth;
      el.classList.add('is-buy-pulse');
      if (el._buyPulseTimer) {
        clearTimeout(el._buyPulseTimer);
        this._ephemeralTimers.delete(el._buyPulseTimer);
      }
      el._buyPulseTimer = this._scheduleEphemeral(() => {
        el.classList?.remove('is-buy-pulse');
        el._buyPulseTimer = null;
      }, 460);
    }

    if (badgeText && btnEl && this._hasDom()) {
      this._spawnFloatingMicroBadge(btnEl, badgeText, isRecruit);
    }
  }

  _spawnFloatingMicroBadge(anchorEl, text, isRecruit = false) {
    if (!this._hasDom() || !anchorEl) return;
    const badge = document.createElement('div');
    badge.className = isRecruit ? 'endless-micro-badge is-recruit' : 'endless-micro-badge';
    badge.textContent = String(text);

    const fxLayer = this._refs.fxLayer;
    const rootRect = this.root && typeof this.root.getBoundingClientRect === 'function'
      ? this.root.getBoundingClientRect()
      : null;
    const btnRect = typeof anchorEl.getBoundingClientRect === 'function'
      ? anchorEl.getBoundingClientRect()
      : null;

    if (fxLayer && rootRect && btnRect && rootRect.width > 0 && btnRect.width > 0) {
      const rawLeft = (btnRect.left - rootRect.left) + btnRect.width * 0.5;
      const clampedLeft = Math.max(36, Math.min(rootRect.width - 36, rawLeft));
      const clampedTop = Math.max(10, (btnRect.top - rootRect.top) - 4);
      badge.style.left = `${Math.round(clampedLeft)}px`;
      badge.style.top = `${Math.round(clampedTop)}px`;
      fxLayer.appendChild(badge);
    } else if (fxLayer) {
      badge.style.left = '50%';
      badge.style.top = '50%';
      fxLayer.appendChild(badge);
    } else if (anchorEl.parentNode) {
      anchorEl.parentNode.appendChild(badge);
    }

    this._scheduleEphemeral(() => {
      if (badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    }, 700);
  }

  _handleToggleAutoBoss() {
    this._playSfx('playUiClick');
    if (typeof this.manager?.toggleAutoBoss === 'function') {
      this.manager.toggleAutoBoss();
    } else if (this.manager?.economy) {
      this.manager.economy.autoBoss = !this.manager.economy.autoBoss;
    }
    this._resyncNow();
  }

  _handleChallengeBoss() {
    this._playSfx('playUiConfirm');
    if (typeof this.manager?.challengeBoss === 'function') {
      this.manager.challengeBoss();
    }
    this._resyncNow();
  }

  _handleSetBulkMode(mode) {
    this._playSfx('playUiClick');
    if (typeof this.manager?.setBulkMode === 'function') {
      this.manager.setBulkMode(mode);
    } else if (this.manager?.economy) {
      this.manager.economy.bulkMode = mode;
    }
    this._resyncNow();
  }

  _handleBuyRelic(relicId) {
    const bulkMode = this.manager?.economy?.bulkMode || this._lastSnapshot?.bulkMode || 'x1';
    let res = null;
    if (typeof this.manager?.buyRelic === 'function') {
      res = this.manager.buyRelic(relicId);
    } else if (this.manager?.economy && typeof this.manager.economy.buyRelic === 'function') {
      res = this.manager.economy.buyRelic(relicId);
      if (res?.ok) {
        if (typeof this.manager?.onRelicPurchased === 'function') {
          this.manager.onRelicPurchased(relicId, res);
        }
        if (typeof this.manager?.saveNow === 'function') {
          this.manager.saveNow();
        } else if (typeof this.manager.economy.saveToStorage === 'function') {
          this.manager.economy.saveToStorage(this.manager?.companions?.exportSnapshot?.());
        }
      }
    }

    if (res?.ok) {
      this._playSfx('playUiConfirm');
      const ref = this._relicRowRefs.get(relicId);
      const bought = Math.max(1, Math.floor(Number(res?.bought) || 1));
      const badgeText = res?.milestoneReached
        ? `${res.milestoneReached.tag}!`
        : Array.isArray(res?.setsUpgraded) && res.setsUpgraded.length > 0
          ? `${res.setsUpgraded[0].tierLabel} SET!`
          : bulkMode === 'MAX'
            ? (bought > 1 ? `MAX! +${bought}` : 'MAX!')
            : `+${bought}`;
      this._triggerBuyFeedback(
        ref?.row,
        ref?.buyBtn,
        badgeText,
        Boolean(res?.milestoneReached || (res?.setsUpgraded && res.setsUpgraded.length > 0))
      );
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleCompanionPrimary(companionId) {
    const comps = this.manager?.companions;
    const econ = this.manager?.economy;
    const state = comps?.rosterState?.[companionId];
    const snapComp = !state
      ? (this._lastSnapshot?.companions || this._lastSnapshot?.companionRoster || []).find((c) => c.id === companionId)
      : null;
    const unlocked = Boolean(state?.unlocked ?? snapComp?.unlocked);

    let res = null;
    if (unlocked) {
      if (typeof this.manager?.upgradeCompanion === 'function') {
        res = this.manager.upgradeCompanion(companionId);
      } else if (comps && econ) {
        res = comps.upgrade?.(companionId, econ);
        if (res?.ok) {
          const hero = this.manager?.game?.fighters?.[0] || this.manager?.player || null;
          if (hero && typeof comps.syncEntitiesWithWorld === 'function') {
            comps.syncEntitiesWithWorld(hero);
          }
          if (typeof this.manager?.saveNow === 'function') {
            this.manager.saveNow();
          } else {
            econ.saveToStorage?.(comps.exportSnapshot?.());
          }
        }
      }
    } else {
      if (typeof this.manager?.recruitCompanion === 'function') {
        res = this.manager.recruitCompanion(companionId);
      } else if (comps && econ) {
        res = comps.recruit?.(companionId, econ);
        if (res?.ok) {
          const hero = this.manager?.game?.fighters?.[0] || this.manager?.player || null;
          if (hero && typeof comps.syncEntitiesWithWorld === 'function') {
            comps.syncEntitiesWithWorld(hero);
          }
          if (typeof this.manager?.saveNow === 'function') {
            this.manager.saveNow();
          } else {
            econ.saveToStorage?.(comps.exportSnapshot?.());
          }
        }
      }
    }

    if (res?.ok) {
      this._playSfx('playUiConfirm');
      const ref = this._companionCardRefs.get(companionId);
      const badgeText = unlocked ? '+1' : 'RECRUITED!';
      this._triggerBuyFeedback(ref?.card, ref?.primaryBtn, badgeText, !unlocked);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleCompanionDeploy(companionId) {
    let res = null;
    if (typeof this.manager?.toggleCompanionDeploy === 'function') {
      res = this.manager.toggleCompanionDeploy(companionId);
    } else {
      const comps = this.manager?.companions;
      if (!comps || typeof comps.toggleDeploy !== 'function') return;
      res = comps.toggleDeploy(companionId);
      if (res?.ok) {
        const hero = this.manager?.game?.fighters?.[0] || this.manager?.player || null;
        if (hero && typeof comps.syncEntitiesWithWorld === 'function') {
          comps.syncEntitiesWithWorld(hero);
        }
        if (typeof this.manager?.saveNow === 'function') {
          this.manager.saveNow();
        } else {
          this.manager?.economy?.saveToStorage?.(comps.exportSnapshot?.());
        }
      }
    }

    if (res?.ok) {
      this._playSfx('playUiClick');
    } else if (res?.reason === 'SLOTS_FULL') {
      this._playSfx('playUiBack');
      this._showPartyNotice('PARTY FULL (3/3) - BENCH A COMPANION FIRST');
    }
    this._resyncNow();
  }

  _showPartyNotice(msg) {
    const el = this._refs.partyNotice;
    if (!el) return;
    setTextIfChanged(el, msg);
    el.classList.remove('hidden');
    if (this._partyNoticeTimer) clearTimeout(this._partyNoticeTimer);
    if (typeof setTimeout === 'function') {
      this._partyNoticeTimer = setTimeout(() => {
        el.classList.add('hidden');
        this._partyNoticeTimer = null;
      }, 2400);
    }
  }

  _handleSaveRun() {
    this._playSfx('playUiConfirm');
    if (typeof this.manager?.saveNow === 'function') {
      this.manager.saveNow();
    } else if (this.manager?.economy) {
      this.manager.economy.saveToStorage(this.manager?.companions?.exportSnapshot?.());
    }
    const btn = this._refs.saveBtn;
    if (btn) {
      setTextIfChanged(btn, 'SAVED!');
      if (this._saveFlashTimer) clearTimeout(this._saveFlashTimer);
      if (typeof setTimeout === 'function') {
        this._saveFlashTimer = setTimeout(() => {
          setTextIfChanged(btn, 'SAVE RUN');
          this._saveFlashTimer = null;
        }, 1200);
      }
    }
  }

  _disarmResetConfirm() {
    this._resetArmed = false;
    if (this._resetArmTimer) {
      clearTimeout(this._resetArmTimer);
      this._resetArmTimer = null;
    }
    if (this._refs.resetBtn) {
      this._refs.resetBtn.classList.remove('is-armed');
      setTextIfChanged(this._refs.resetBtn, 'RESET RUN');
    }
  }

  _handleResetRunClick() {
    if (!this._resetArmed) {
      this._resetArmed = true;
      this._playSfx('playUiClick');
      if (this._refs.resetBtn) {
        this._refs.resetBtn.classList.add('is-armed');
        setTextIfChanged(this._refs.resetBtn, 'CONFIRM RESET?');
      }
      if (this._resetArmTimer) clearTimeout(this._resetArmTimer);
      if (typeof setTimeout === 'function') {
        this._resetArmTimer = setTimeout(() => {
          this._disarmResetConfirm();
        }, 4000);
      }
      return;
    }

    this._disarmResetConfirm();
    this._playSfx('playUiBack');
    if (typeof this.manager?.resetEndlessRun === 'function') {
      this.manager.resetEndlessRun();
    } else if (this.manager?.economy) {
      this.manager.economy.resetRunState({ keepMeta: true });
      this.manager?.companions?.reset?.();
      this.manager.economy.saveToStorage(this.manager?.companions?.exportSnapshot?.());
    }
    this._resyncNow();
  }

  _disarmAscendConfirm() {
    this._ascendArmed = false;
    if (this._ascendArmTimer) {
      clearTimeout(this._ascendArmTimer);
      this._ascendArmTimer = null;
    }
    if (this._refs.ascendBtn) {
      this._refs.ascendBtn.classList.remove('is-armed');
    }
    if (this._refs.ascendBtnLabel) {
      const asc = this._lastResolvedAscension;
      if (asc && !asc.canAscend) {
        setTextIfChanged(this._refs.ascendBtnLabel, `REACH STAGE ${asc.unlockStage} TO ASCEND`);
      } else {
        setTextIfChanged(this._refs.ascendBtnLabel, 'ASCEND NOW');
      }
    }
  }

  _triggerAscendFlash(shardsGained = 0) {
    const card = this._refs.ascendCard;
    if (card && card.classList) {
      card.classList.remove('is-ascend-flash');
      void card.offsetWidth;
      card.classList.add('is-ascend-flash');
      if (card._ascendFlashTimer) {
        clearTimeout(card._ascendFlashTimer);
        this._ephemeralTimers.delete(card._ascendFlashTimer);
      }
      card._ascendFlashTimer = this._scheduleEphemeral(() => {
        card.classList?.remove('is-ascend-flash');
        card._ascendFlashTimer = null;
      }, 700);
    }
    const btn = this._refs.ascendBtn;
    const badgeText = shardsGained > 0 ? `+${formatEndlessNumber(shardsGained)} SHARDS!` : 'ASCENDED!';
    if (btn) {
      this._triggerBuyFeedback(null, btn, badgeText, false);
    }
  }

  _handleAscendClick() {
    const state = this._resolveState(this._lastSnapshot);
    const asc = state.ascension;
    if (!asc || !asc.canAscend) {
      this._playSfx('playUiBack');
      this._disarmAscendConfirm();
      return;
    }

    if (!this._ascendArmed) {
      this._ascendArmed = true;
      this._playSfx('playUiClick');
      if (this._refs.ascendBtn) {
        this._refs.ascendBtn.classList.add('is-armed');
      }
      setTextIfChanged(
        this._refs.ascendBtnLabel,
        `CONFIRM ASCEND? (+${formatEndlessNumber(asc.pendingShards)} SHARDS)`
      );
      if (this._ascendArmTimer) clearTimeout(this._ascendArmTimer);
      if (typeof setTimeout === 'function') {
        this._ascendArmTimer = setTimeout(() => {
          this._disarmAscendConfirm();
        }, 4000);
      }
      return;
    }

    const previewGained = asc.pendingShards;
    this._disarmAscendConfirm();

    let res = null;
    if (typeof this.manager?.performAscension === 'function') {
      res = this.manager.performAscension();
    } else if (typeof this.manager?.ascension?.performAscension === 'function' && this.manager?.economy) {
      res = this.manager.ascension.performAscension(this.manager.economy, this.manager.companions);
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const ok = res === undefined
      ? typeof this.manager?.performAscension === 'function'
      : Boolean(res?.ok !== false);
    if (ok) {
      this._playSfx('playUiConfirm');
      const gained = Math.max(0, Math.floor(Number(res?.shardsGained ?? previewGained) || 0));
      this._triggerAscendFlash(gained);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleBuyEternalArtifact(artifactId) {
    let res = null;
    if (typeof this.manager?.buyEternalArtifact === 'function') {
      res = this.manager.buyEternalArtifact(artifactId);
    } else if (typeof this.manager?.ascension?.buyArtifact === 'function' && this.manager?.economy) {
      res = this.manager.ascension.buyArtifact(artifactId, this.manager.economy);
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const ok = res === undefined
      ? typeof this.manager?.buyEternalArtifact === 'function'
      : Boolean(res?.ok);
    if (ok) {
      this._playSfx('playUiConfirm');
      const ref = this._artifactRowRefs.get(artifactId);
      this._triggerBuyFeedback(ref?.row, ref?.buyBtn, '+1', true);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleEquipGear(uid, rowEl = null, btnEl = null, itemHint = null) {
    if (!uid) return;
    let res = null;
    if (typeof this.manager?.equipGearItem === 'function') {
      res = this.manager.equipGearItem(uid);
    } else if (typeof this.manager?.gear?.equipItem === 'function') {
      res = this.manager.gear.equipItem(uid);
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const ok = res === undefined
      ? typeof this.manager?.equipGearItem === 'function'
      : Boolean(res?.ok);
    if (ok) {
      this._playSfx('playUiConfirm');
      const slotId = res?.equippedItem?.slot || itemHint?.slot || null;
      const slotRef = slotId ? this._gearSlotRefs.get(slotId) : null;
      const anchor = slotRef?.card || (btnEl?.isConnected ? btnEl : this._refs.gearEquipBestBtn);
      const isUp = Boolean(itemHint?.isUpgradeOverEquipped);
      this._triggerBuyFeedback(slotRef?.card || rowEl, anchor, isUp ? 'UPGRADED!' : 'EQUIPPED!', isUp);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleEquipBestGear() {
    let res = null;
    if (typeof this.manager?.equipBestGear === 'function') {
      res = this.manager.equipBestGear();
    } else if (typeof this.manager?.gear?.equipBest === 'function') {
      res = this.manager.gear.equipBest();
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const changed = Math.max(0, Math.floor(Number(res?.changedCount) || 0));
    const ok = Boolean(res?.ok) && changed > 0;
    const btn = this._refs.gearEquipBestBtn;
    if (ok) {
      this._playSfx('playUiConfirm');
      this._triggerBuyFeedback(this._refs.gearHeader, btn, `EQUIPPED ${changed}!`, true);
    } else if (res?.ok || res === undefined) {
      this._playSfx('playUiClick');
      if (btn) {
        this._spawnFloatingMicroBadge(btn, 'BEST EQUIPPED', false);
      }
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleEnhanceGear(uid, cardEl = null, btnEl = null, itemHint = null) {
    if (!uid) return;
    let res = null;
    if (typeof this.manager?.enhanceGearItem === 'function') {
      res = this.manager.enhanceGearItem(uid);
    } else if (typeof this.manager?.gear?.enhanceItem === 'function') {
      res = this.manager.gear.enhanceItem(uid);
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const ok = res === undefined
      ? typeof this.manager?.enhanceGearItem === 'function'
      : Boolean(res?.ok);
    if (ok) {
      this._playSfx('playUiConfirm');
      const nextLv = Math.max(
        1,
        Math.floor(Number(res?.enhanceLevel ?? res?.item?.enhanceLevel ?? ((itemHint?.enhanceLevel || 0) + 1)) || 1)
      );
      const isMilestone = nextLv >= 20 || nextLv % 5 === 0;
      const anchor = (btnEl && btnEl.isConnected !== false) ? btnEl : this._refs.gearDustMetric;
      this._triggerBuyFeedback(cardEl, anchor, `+${nextLv}!`, isMilestone);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleSalvageGear(uid, rowEl = null, btnEl = null, itemHint = null) {
    if (!uid) return;
    let res = null;
    if (typeof this.manager?.salvageGearItem === 'function') {
      res = this.manager.salvageGearItem(uid);
    } else if (typeof this.manager?.gear?.salvageItem === 'function') {
      res = this.manager.gear.salvageItem(uid);
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const ok = res === undefined
      ? typeof this.manager?.salvageGearItem === 'function'
      : Boolean(res?.ok);
    if (ok) {
      this._playSfx('playUiConfirm');
      const dust = Math.max(0, Math.floor(Number(res?.dustGained ?? itemHint?.salvageValue) || 0));
      const badge = dust > 0 ? `+${formatEndlessNumber(dust)} DUST` : 'SALVAGED!';
      const hasLiveBtn = Boolean(
        btnEl &&
          btnEl.isConnected !== false &&
          typeof btnEl.getBoundingClientRect === 'function' &&
          btnEl.getBoundingClientRect().width > 0
      );
      const anchor = hasLiveBtn ? btnEl : (this._refs.gearDustMetric || this._refs.gearSalvageLowerBtn);
      this._triggerBuyFeedback(this._refs.gearDustMetric, anchor, badge, false);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleSalvageAllLowerGear() {
    let res = null;
    if (typeof this.manager?.salvageAllLowerGear === 'function') {
      res = this.manager.salvageAllLowerGear();
    } else if (typeof this.manager?.gear?.salvageAllLower === 'function') {
      res = this.manager.gear.salvageAllLower();
      if (res?.ok && typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      }
    }

    const count = Math.max(0, Math.floor(Number(res?.count) || 0));
    const dust = Math.max(0, Math.floor(Number(res?.dustGained) || 0));
    const ok = Boolean(res?.ok) && (count > 0 || dust > 0);
    const btn = this._refs.gearSalvageLowerBtn;
    if (ok) {
      this._playSfx('playUiConfirm');
      const badge = dust > 0
        ? `+${formatEndlessNumber(dust)} DUST (${count})`
        : `SALVAGED ${count}!`;
      this._triggerBuyFeedback(this._refs.gearDustMetric, btn || this._refs.gearDustMetric, badge, true);
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleCollectOfflineLoot() {
    this._playSfx('playUiConfirm');
    let claimed = false;
    if (typeof this.manager?.claimOfflineLoot === 'function') {
      const res = this.manager.claimOfflineLoot();
      claimed = res !== false;
    } else if (this.manager?.pendingOfflineLoot) {
      const loot = this.manager.pendingOfflineLoot;
      if (loot.gold > 0) this.manager.economy?.addGold?.(loot.gold);
      if (loot.astralShards > 0) this.manager.economy?.addAstralShards?.(loot.astralShards);
      this.manager.pendingOfflineLoot = null;
      claimed = true;
    }
    if (this._lastSnapshot && typeof this._lastSnapshot === 'object' && !this.manager?.pendingOfflineLoot) {
      this._lastSnapshot = { ...this._lastSnapshot, pendingOfflineLoot: null };
    }
    if (claimed && this._refs.offlineCollectBtn) {
      this._spawnFloatingMicroBadge(this._refs.offlineCollectBtn, 'LOOT CLAIMED!', false);
    }
    this._resyncNow();
  }

  _handleContinueOfflineLoot() {
    this._playSfx('playUiConfirm');
    const hasPending = Boolean(this.manager?.pendingOfflineLoot || this._lastSnapshot?.pendingOfflineLoot);
    if (hasPending && typeof this.manager?.claimOfflineLoot === 'function') {
      this.manager.claimOfflineLoot();
    } else if (typeof this.manager?.dismissOfflineLoot === 'function') {
      this.manager.dismissOfflineLoot();
    } else if (this.manager?.pendingOfflineLoot) {
      const loot = this.manager.pendingOfflineLoot;
      if (loot.gold > 0) this.manager.economy?.addGold?.(loot.gold);
      if (loot.astralShards > 0) this.manager.economy?.addAstralShards?.(loot.astralShards);
      this.manager.pendingOfflineLoot = null;
    }
    if (this._lastSnapshot && typeof this._lastSnapshot === 'object' && !this.manager?.pendingOfflineLoot) {
      this._lastSnapshot = { ...this._lastSnapshot, pendingOfflineLoot: null };
    }
    this._resyncNow();
  }

  _resyncNow() {
    const snap = typeof this.manager?.getUiSnapshot === 'function'
      ? this.manager.getUiSnapshot()
      : this._lastSnapshot;
    this.sync(snap, false);
  }

  _syncTabVisibility() {
    for (const [id, btn] of this._tabBtnRefs.entries()) {
      const active = id === this.activeTab;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    for (const [id, panel] of this._tabPanelRefs.entries()) {
      panel.classList.toggle('hidden', id !== this.activeTab);
    }
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    if (this.visible && !this.mounted) {
      this.mount();
    }
    if (this.root) {
      this.root.classList.toggle('hidden', !this.visible);
    }
    if (!this.visible) {
      this.setDrawerOpen(false);
      this._disarmResetConfirm();
      this._disarmAscendConfirm();
    }
  }

  setDrawerOpen(open) {
    this.drawerOpen = Boolean(open);
    if (this._refs.shopShell) {
      this._refs.shopShell.classList.toggle('hidden', !this.drawerOpen);
    }
    if (this._refs.shopToggle) {
      this._refs.shopToggle.classList.toggle('is-open', this.drawerOpen);
      this._refs.shopToggle.setAttribute('aria-expanded', this.drawerOpen ? 'true' : 'false');
    }
    if (!this.drawerOpen) {
      this._disarmResetConfirm();
      this._disarmAscendConfirm();
    } else if (this._lastSnapshot || this.manager) {
      this._blitAllIcons(false);
      this._resyncNow();
    }
  }

  toggleDrawer() {
    this._playSfx('playUiClick');
    this.setDrawerOpen(!this.drawerOpen);
    return this.drawerOpen;
  }

  isDrawerOpen() {
    return Boolean(this.drawerOpen);
  }

  setActiveTab(tabId) {
    const exists = this.tabs.some((t) => t.id === tabId);
    this.activeTab = exists ? tabId : 'items';
    if (this.activeTab !== 'stats') {
      this._disarmResetConfirm();
    }
    if (this.activeTab !== 'ascend') {
      this._disarmAscendConfirm();
    }
    this._syncTabVisibility();
    if (this.drawerOpen && (this._lastSnapshot || this.manager)) {
      this.sync(this._lastSnapshot, false);
    }
  }

  _resolveState(snapshot) {
    const snap = snapshot && typeof snapshot === 'object' ? snapshot : null;
    const mgr = this.manager || null;
    const econ = mgr?.economy || null;
    const realmObj = snap?.realm || mgr?.getCurrentRealm?.() || null;

    const stage = Math.max(1, Math.floor(Number(snap?.stage ?? econ?.stage ?? mgr?.stage ?? 1) || 1));
    const bestStage = Math.max(
      stage,
      Math.floor(Number(snap?.bestStage ?? econ?.bestStage ?? mgr?.bestStage ?? stage) || stage)
    );
    const waveInStage = Math.max(
      1,
      Math.floor(Number(snap?.waveInStage ?? econ?.waveInStage ?? mgr?.waveInStage ?? 1) || 1)
    );
    const wavesPerStage = Math.max(
      1,
      Math.floor(Number(snap?.wavesPerStage ?? mgr?.wavesPerStage ?? 5) || 5)
    );
    const realmName = String(snap?.realmName ?? realmObj?.name ?? 'ECLIPSE SANCTUM');
    const realmAccent = String(snap?.realmAccent ?? realmObj?.accentHex ?? '#38bdf8');
    const ascendedLoop = Math.max(
      1,
      Math.floor(Number(snap?.ascendedLoop ?? realmObj?.ascendedLoop ?? (Math.floor((stage - 1) / 4) + 1)) || 1)
    );

    const isBossEncounter = Boolean(snap?.isBossEncounter ?? mgr?.isBossEncounter ?? false);
    const bossFarmMode = Boolean(snap?.bossFarmMode ?? mgr?.bossFarmMode ?? false);
    const bossTimer = Math.max(0, Number(snap?.bossTimer ?? mgr?.bossTimer ?? 0) || 0);
    const bossTimerMax = Math.max(1, Number(snap?.bossTimerMax ?? mgr?.bossTimerMax ?? 40) || 40);

    const gold = Number(snap?.gold ?? econ?.gold ?? 0) || 0;
    const totalGoldEarned = Number(snap?.totalGoldEarned ?? econ?.totalGoldEarned ?? gold) || 0;
    const astralShards = Number(snap?.astralShards ?? econ?.astralShards ?? 0) || 0;
    const autoBoss = snap?.autoBoss !== undefined
      ? Boolean(snap.autoBoss)
      : (econ?.autoBoss !== undefined ? Boolean(econ.autoBoss) : true);
    const bulkMode = snap?.bulkMode ?? econ?.bulkMode ?? 'x1';

    const tapFever = Math.max(0, Math.min(100, Number(snap?.tapFever ?? econ?.tapFever ?? 0) || 0));
    const tapFeverTimer = Math.max(0, Number(snap?.tapFeverTimer ?? econ?.tapFeverTimer ?? 0) || 0);
    const tapFeverLevel = Math.max(0, Math.floor(Number(snap?.tapFeverLevel ?? econ?.tapFeverLevel ?? 0) || 0));

    const totalKills = Number(snap?.totalKills ?? econ?.totalKills ?? 0) || 0;
    const bossesSlain = Number(snap?.bossesSlain ?? econ?.bossesSlain ?? 0) || 0;
    const totalTaps = Number(snap?.totalTaps ?? econ?.totalTaps ?? 0) || 0;

    const dpsMetrics = snap?.dpsMetrics || econ?.dpsMetrics || {
      heroDps: 0,
      tapDps: 0,
      companionDps: 0,
      goldPerSec: 0
    };
    const stats = snap?.stats || (typeof econ?.getComputedStats === 'function' ? econ.getComputedStats() : null);

    let relicsView = Array.isArray(snap?.relics) ? snap.relics : null;
    if (!relicsView) {
      relicsView = ENDLESS_RELICS.map((r) => {
        const level = econ ? econ.getRelicLevel(r.id) : 0;
        const quote = econ
          ? econ.getRelicCost(r.id, bulkMode)
          : { count: 1, totalCost: r.baseCost, canAfford: gold >= r.baseCost, nextCost: r.baseCost };
        return {
          id: r.id,
          level,
          count: quote.count,
          totalCost: quote.totalCost,
          canAfford: quote.canAfford,
          nextCost: quote.nextCost,
          bonusText: r.formatBonus(level)
        };
      });
    }

    let companions = Array.isArray(snap?.companions)
      ? snap.companions
      : (Array.isArray(snap?.companionRoster) ? snap.companionRoster : null);
    if (!companions && mgr?.companions && typeof mgr.companions.getRosterView === 'function') {
      companions = mgr.companions.getRosterView(econ);
    }
    if (!companions) companions = [];

    const maxActiveSlots = Math.max(1, Math.floor(Number(snap?.maxActiveSlots ?? 3) || 3));
    const activeSlotsCount = Number.isFinite(Number(snap?.activeCompanionCount))
      ? Number(snap.activeCompanionCount)
      : (Array.isArray(snap?.activeSlots)
        ? snap.activeSlots.length
        : companions.filter((c) => c.deployed).length);

    let rawHudUnits = Array.isArray(snap?.activeCompanionUnits) ? snap.activeCompanionUnits : null;
    if (!rawHudUnits && mgr?.companions && typeof mgr.companions.getActiveHudUnits === 'function') {
      rawHudUnits = mgr.companions.getActiveHudUnits();
    }
    if (!rawHudUnits) {
      rawHudUnits = companions
        .filter((c) => c.deployed)
        .slice(0, 3)
        .map((c) => ({
          id: c.id,
          heroKey: c.heroKey,
          name: c.name,
          shortName: c.shortName || c.name,
          role: c.role,
          color: c.accentHex || c.color || '#facc15',
          level: c.level || 1,
          ultCharge: 0,
          ultPct: 0,
          isCastingUlt: false,
          skillCdRatio: 0,
          dpsEstimate: c.dpsEstimate || 0,
          lastCallout: ''
        }));
    }

    const activeCompanionUnits = rawHudUnits.slice(0, 3).map((u, idx) => {
      const rawUlt = Number.isFinite(Number(u?.ultPct))
        ? Number(u.ultPct)
        : (Number.isFinite(Number(u?.ultCharge)) ? Number(u.ultCharge) : 0);
      const ultPct = rawUlt <= 1 && rawUlt > 0 && !Number.isFinite(Number(u?.ultCharge))
        ? Math.max(0, Math.min(100, rawUlt * 100))
        : Math.max(0, Math.min(100, rawUlt));
      const fullName = String(u?.name || u?.shortName || u?.id || `ALLY ${idx + 1}`);
      return {
        id: String(u?.id || u?.heroKey || `unit_${idx}`),
        heroKey: String(u?.heroKey || ''),
        name: fullName,
        shortName: String(u?.shortName || fullName),
        role: String(u?.role || 'ALLY'),
        color: String(u?.color || u?.accentHex || '#facc15'),
        level: Math.max(1, Math.floor(Number(u?.level) || 1)),
        ultCharge: Math.max(0, Math.min(100, Number(u?.ultCharge ?? ultPct) || 0)),
        ultPct,
        isCastingUlt: Boolean(u?.isCastingUlt),
        skillCdRatio: Math.max(0, Math.min(1, Number(u?.skillCdRatio) || 0)),
        dpsEstimate: Math.max(0, Number(u?.dpsEstimate) || 0),
        lastCallout: String(u?.lastCallout || '')
      };
    });

    let rawSynergies = Array.isArray(snap?.activeSynergies) ? snap.activeSynergies : null;
    if (!rawSynergies && mgr?.companions && typeof mgr.companions.getActiveSynergies === 'function') {
      rawSynergies = mgr.companions.getActiveSynergies();
    }
    const activeSynergies = Array.isArray(rawSynergies)
      ? rawSynergies.map((s, idx) => ({
          id: String(s?.id || s?.name || `syn_${idx}`),
          name: String(s?.name || s?.shortLabel || 'SYNERGY'),
          shortLabel: String(s?.shortLabel || s?.name || 'BUFF'),
          desc: String(s?.desc || ''),
          color: String(s?.color || '#facc15')
        }))
      : [];

    const feverTier = Number.isFinite(Number(snap?.feverTier))
      ? Math.max(0, Math.floor(Number(snap.feverTier)))
      : (tapFeverTimer > 0 ? (tapFeverLevel >= 2 ? 2 : 1) : 0);
    const feverGoldMult = Number.isFinite(Number(snap?.feverGoldMult))
      ? Math.max(1, Number(snap.feverGoldMult))
      : Math.max(1, Number(stats?.feverGoldMult) || (feverTier >= 2 ? 3 : feverTier === 1 ? 2 : 1));

    const rawAsc = (snap && typeof snap.ascension === 'object' && snap.ascension)
      ? snap.ascension
      : (typeof mgr?.ascension?.getAscensionView === 'function'
        ? mgr.ascension.getAscensionView(stage, econ)
        : null);

    const ascShards = Math.max(
      0,
      Math.floor(Number(rawAsc?.astralShards ?? astralShards) || 0)
    );
    const resolvedAstralShards = (snap && snap.astralShards !== undefined)
      ? astralShards
      : (econ && econ.astralShards !== undefined ? astralShards : ascShards);

    const ascension = {
      canAscend: Boolean(rawAsc?.canAscend),
      unlockStage: Math.max(1, Math.floor(Number(rawAsc?.unlockStage) || 5)),
      currentStage: Math.max(1, Math.floor(Number(rawAsc?.currentStage ?? stage) || stage)),
      pendingShards: Math.max(0, Math.floor(Number(rawAsc?.pendingShards) || 0)),
      totalAscensions: Math.max(0, Math.floor(Number(rawAsc?.totalAscensions) || 0)),
      astralShards: ascShards,
      totalAstralShards: Math.max(
        ascShards,
        Math.floor(Number(rawAsc?.totalAstralShards ?? ascShards) || ascShards)
      ),
      modifiers: rawAsc?.modifiers || null,
      artifacts: Array.isArray(rawAsc?.artifacts)
        ? rawAsc.artifacts.map((a, idx) => {
            const level = Math.max(0, Math.floor(Number(a?.level) || 0));
            const maxLevel = Math.max(1, Math.floor(Number(a?.maxLevel) || 1));
            const isMaxed = Boolean(a?.isMaxed ?? (level >= maxLevel));
            const cost = Math.max(0, Math.floor(Number(a?.cost) || 0));
            const canAfford = Boolean(
              !isMaxed && (a?.canAfford !== undefined ? a.canAfford : ascShards >= cost)
            );
            return {
              id: String(a?.id || `artifact_${idx}`),
              name: String(a?.name || a?.id || `ARTIFACT ${idx + 1}`),
              desc: String(a?.desc || ''),
              level,
              maxLevel,
              cost,
              isMaxed,
              canAfford,
              effectSummary: String(a?.effectSummary || ''),
              iconCol: a?.iconCol
            };
          })
        : []
    };

    const rawOffline = (snap && Object.prototype.hasOwnProperty.call(snap, 'pendingOfflineLoot'))
      ? snap.pendingOfflineLoot
      : (mgr?.pendingOfflineLoot ?? null);
    const pendingOfflineLoot = (rawOffline && typeof rawOffline === 'object')
      ? {
          awaySec: Math.max(0, Math.floor(Number(rawOffline.awaySec) || 0)),
          cappedSec: Math.max(0, Math.floor(Number(rawOffline.cappedSec ?? rawOffline.awaySec) || 0)),
          gold: Math.max(0, Number(rawOffline.gold) || 0),
          astralShards: Math.max(0, Math.floor(Number(rawOffline.astralShards) || 0)),
          stagesSimulated: Math.max(0, Math.floor(Number(rawOffline.stagesSimulated) || 0)),
          formattedTime: String(
            rawOffline.formattedTime || formatAwayTime(rawOffline.cappedSec ?? rawOffline.awaySec ?? 0)
          ).toUpperCase()
        }
      : null;

    const dirSnap =
      snap?.bossDirector ||
      (typeof mgr?.bossDirector?.getDirectorSnapshot === 'function'
        ? mgr.bossDirector.getDirectorSnapshot(stage, bestStage, realmObj)
        : null);
    const realmModifier = snap?.realmModifier || dirSnap?.modifier || null;
    const bestStageTrophies = snap?.bestStageTrophies || dirSnap?.trophies || null;
    const relicSets = Array.isArray(snap?.relicSets)
      ? snap.relicSets
      : (typeof econ?.getRelicSetSynergies === 'function' ? econ.getRelicSetSynergies() : []);
    const relicMilestones =
      snap?.relicMilestones && typeof snap.relicMilestones === 'object'
        ? snap.relicMilestones
        : (() => {
            const map = {};
            if (typeof econ?.getRelicMilestoneInfo === 'function') {
              for (let i = 0; i < ENDLESS_RELICS.length; i++) {
                const rid = ENDLESS_RELICS[i].id;
                map[rid] = econ.getRelicMilestoneInfo(rid);
              }
            }
            return map;
          })();

    const gear = (snap && typeof snap.gear === 'object' && snap.gear)
      ? snap.gear
      : (typeof mgr?.gear?.getGearSnapshot === 'function' ? mgr.gear.getGearSnapshot() : null);
    const forgeDust = Math.max(0, Math.floor(Number(snap?.forgeDust ?? gear?.forgeDust ?? mgr?.gear?.forgeDust ?? 0) || 0));
    const formattedForgeDust = String(
      snap?.formattedForgeDust ?? gear?.formattedForgeDust ?? formatEndlessNumber(forgeDust)
    );
    const hasGearAction = Boolean(
      snap?.hasGearAction !== undefined
        ? snap.hasGearAction
        : (gear && (gear.hasUpgradeAvailable || gear.canEnhanceEquipped))
    );

    return {
      stage,
      bestStage,
      waveInStage,
      wavesPerStage,
      realmName,
      realmAccent,
      ascendedLoop,
      isBossEncounter,
      bossFarmMode,
      bossTimer,
      bossTimerMax,
      gold,
      totalGoldEarned,
      astralShards: resolvedAstralShards,
      autoBoss,
      bulkMode,
      tapFever,
      tapFeverTimer,
      tapFeverLevel,
      feverTier,
      feverGoldMult,
      totalKills,
      bossesSlain,
      totalTaps,
      dpsMetrics,
      stats,
      relicsView,
      companions,
      activeCompanionUnits,
      activeSynergies,
      activeSlotsCount,
      maxActiveSlots,
      ascension,
      pendingOfflineLoot,
      realmModifier,
      bestStageTrophies,
      relicSets,
      relicMilestones,
      gear,
      forgeDust,
      formattedForgeDust,
      hasGearAction
    };
  }

  _computeDpsBreakdown(state) {
    const m = state?.dpsMetrics || {};
    const heroDps = Math.max(0, Number(m.heroDps) || 0);
    const tapDps = Math.max(0, Number(m.tapDps) || 0);
    const partyDps = Math.max(0, Number(m.companionDps) || 0);
    const goldPerSec = Math.max(0, Number(m.goldPerSec) || 0);
    const totalDps = heroDps + tapDps + partyDps;

    let heroWidth = 0;
    let tapWidth = 0;
    let partyWidth = 0;
    let heroPct = 0;
    let tapPct = 0;
    let partyPct = 0;

    if (totalDps > 0) {
      heroWidth = (heroDps / totalDps) * 100;
      tapWidth = (tapDps / totalDps) * 100;
      partyWidth = Math.max(0, 100 - heroWidth - tapWidth);

      heroPct = Math.round(heroWidth);
      tapPct = Math.round(tapWidth);
      partyPct = Math.max(0, 100 - heroPct - tapPct);
      if (partyDps > 0 && partyPct === 0) {
        partyPct = 1;
        if (heroPct >= tapPct && heroPct > 1) heroPct -= 1;
        else if (tapPct > 1) tapPct -= 1;
      }
    }

    return {
      heroDps,
      tapDps,
      partyDps,
      totalDps,
      goldPerSec,
      heroWidth,
      tapWidth,
      partyWidth,
      heroPct,
      tapPct,
      partyPct
    };
  }

  _syncActivePartyHud(state) {
    const partyHud = this._refs.partyHud;
    if (!partyHud) return;

    const units = state.activeCompanionUnits || [];
    const hasUnits = units.length > 0;
    partyHud.classList.toggle('hidden', !hasUnits);
    if (!hasUnits) return;

    for (let i = 0; i < this._partySlotRefs.length; i++) {
      const slot = this._partySlotRefs[i];
      const u = units[i];
      if (!u) {
        slot.card.classList.add('hidden');
        slot.card.classList.remove('is-casting-ult');
        continue;
      }

      slot.card.classList.remove('hidden');
      slot.card.classList.toggle('is-casting-ult', u.isCastingUlt);
      slot.portWrap.style.borderColor = u.isCastingUlt ? '#fef08a' : u.color;

      this._blitCompanionPortrait(
        slot.portCanvas,
        u.heroKey,
        u.color,
        u.shortName || u.name
      );

      setTextIfChanged(slot.nameEl, u.shortName || u.name);
      setTextIfChanged(slot.lvEl, `LV.${u.level}`);

      const ultPct = Math.max(0, Math.min(100, Number(u.ultPct) || 0));
      slot.ultFill.style.width = `${ultPct.toFixed(1)}%`;
      setTextIfChanged(slot.ultTag, u.isCastingUlt ? 'ULT!' : `${Math.round(ultPct)}%`);

      const tip =
        `${u.name} (${u.role}) LV.${u.level} | DPS ${formatEndlessNumber(u.dpsEstimate)} | ULT ${Math.round(ultPct)}%` +
        (u.lastCallout ? ` | ${u.lastCallout}` : '') +
        ' - Click to manage party';
      if (slot.card.title !== tip) {
        slot.card.title = tip;
      }
    }

    // Active Synergy Badges right underneath/beside the party strip
    const synHud = this._refs.synergyHud;
    if (!synHud) return;
    const synergies = state.activeSynergies || [];
    synHud.classList.toggle('hidden', synergies.length === 0);
    const sig = synergies.map((s) => `${s.id}|${s.shortLabel}|${s.name}|${s.desc}|${s.color}`).join('||');
    if (sig === this._lastHudSynergySig) return;
    this._lastHudSynergySig = sig;
    synHud.textContent = '';

    for (let i = 0; i < synergies.length; i++) {
      const s = synergies[i];
      const badge = document.createElement('div');
      badge.className = 'endless-synergy-badge';
      badge.style.borderColor = s.color;
      badge.style.color = s.color;
      badge.title = s.desc ? `${s.name}: ${s.desc}` : s.name;

      const iconWrap = document.createElement('span');
      iconWrap.innerHTML = SYNERGY_DIAMOND_SVG;
      const textSpan = document.createElement('span');
      textSpan.className = 'endless-synergy-badge-text';
      textSpan.style.color = '#fef08a';
      textSpan.textContent = s.shortLabel || s.name;

      badge.appendChild(iconWrap);
      badge.appendChild(textSpan);
      synHud.appendChild(badge);
    }
  }

  _syncDrawerTelemetry(state, breakdown = null) {
    const b = breakdown || this._computeDpsBreakdown(state);
    setTextIfChanged(this._refs.telemDpsVal, formatEndlessNumber(b.totalDps));
    setTextIfChanged(this._refs.telemGoldVal, `${formatEndlessNumber(b.goldPerSec)}/S`);

    if (this._refs.telemSegHero) this._refs.telemSegHero.style.width = `${b.heroWidth.toFixed(2)}%`;
    if (this._refs.telemSegTap) this._refs.telemSegTap.style.width = `${b.tapWidth.toFixed(2)}%`;
    if (this._refs.telemSegParty) this._refs.telemSegParty.style.width = `${b.partyWidth.toFixed(2)}%`;

    setTextIfChanged(this._refs.telemHeroVal, `${formatEndlessNumber(b.heroDps)} (${b.heroPct}%)`);
    setTextIfChanged(this._refs.telemTapVal, `${formatEndlessNumber(b.tapDps)} (${b.tapPct}%)`);
    setTextIfChanged(this._refs.telemPartyVal, `${formatEndlessNumber(b.partyDps)} (${b.partyPct}%)`);
  }

  sync(snapshot = null, forceRebuild = false) {
    if (snapshot !== null && snapshot !== undefined) {
      this._lastSnapshot = snapshot;
    }
    if (!this.mounted || !this._hasDom() || !this.root) return;

    const state = this._resolveState(snapshot ?? this._lastSnapshot);

    // Ensure icon canvases pick up endless_crusade_vfx.png as soon as it finishes loading
    this._blitAllIcons(Boolean(forceRebuild));

    // 1. Top Status Bar (in-place DOM text & bar updates)
    setTextIfChanged(this._refs.stageText, `STAGE ${state.stage} • ${state.realmName}`);
    if (this._refs.stageBadge) {
      this._refs.stageBadge.style.borderLeftColor = state.realmAccent;
    }
    if (this._refs.loopPill) {
      const showLoop = state.ascendedLoop > 1;
      this._refs.loopPill.classList.toggle('hidden', !showLoop);
      if (showLoop) {
        setTextIfChanged(this._refs.loopPill, `LOOP ${state.ascendedLoop}`);
      }
    }

    // Wave 4: Rotating Realm Modifier Pill (Row 9 Col 0..3)
    if (this._refs.modPill && this._refs.modName) {
      const mod = state.realmModifier;
      const showMod = Boolean(mod && mod.name);
      this._refs.modPill.classList.toggle('hidden', !showMod);
      if (showMod) {
        const modColor = mod.accentHex || '#f43f5e';
        setTextIfChanged(this._refs.modName, mod.name);
        this._refs.modPill.style.borderColor = modColor;
        this._refs.modPill.style.color = modColor;
        const modTip = mod.shortDesc ? `${mod.name}: ${mod.shortDesc}` : mod.name;
        if (this._refs.modPill.title !== modTip) {
          this._refs.modPill.title = modTip;
        }
        const sigilCol = Number.isFinite(Number(mod.sigilCol))
          ? Math.max(0, Math.min(11, Math.floor(Number(mod.sigilCol))))
          : 0;
        if (this._modifierIconEntry) {
          const changed =
            this._modifierIconEntry.col !== sigilCol ||
            this._modifierIconEntry.accentHex !== modColor;
          this._modifierIconEntry.col = sigilCol;
          this._modifierIconEntry.accentHex = modColor;
          if (changed && this._refs.modIcon) {
            this._blitIconCanvas(this._refs.modIcon, sigilCol, modColor, true, ENDLESS_SIGIL_ROW);
          }
        }
      }
    }

    if (this._refs.waveMeter && this._refs.waveFill && this._refs.waveLabel) {
      this._refs.waveMeter.classList.toggle('is-boss', state.isBossEncounter);
      this._refs.waveMeter.classList.toggle('is-farm', !state.isBossEncounter && state.bossFarmMode);
      if (state.isBossEncounter) {
        const pct = Math.max(0, Math.min(100, (state.bossTimer / state.bossTimerMax) * 100));
        this._refs.waveFill.style.width = `${pct.toFixed(1)}%`;
        setTextIfChanged(this._refs.waveLabel, `BOSS ${state.bossTimer.toFixed(1)}S`);
      } else if (state.bossFarmMode) {
        this._refs.waveFill.style.width = '100%';
        setTextIfChanged(this._refs.waveLabel, `FARMING W${state.waveInStage}`);
      } else {
        const pct = Math.max(8, Math.min(100, (state.waveInStage / state.wavesPerStage) * 100));
        this._refs.waveFill.style.width = `${pct.toFixed(1)}%`;
        setTextIfChanged(this._refs.waveLabel, `WAVE ${state.waveInStage}/${state.wavesPerStage}`);
      }
    }

    setTextIfChanged(this._refs.goldVal, formatEndlessNumber(state.gold));
    setTextIfChanged(this._refs.shardVal, formatEndlessNumber(state.astralShards));

    if (this._refs.feverMeter && this._refs.feverFill && this._refs.feverLabel) {
      const feverActive = state.tapFeverTimer > 0;
      const tier2 = feverActive && (state.feverTier >= 2 || state.tapFeverLevel >= 2);
      this._refs.feverMeter.classList.toggle('is-active', feverActive);
      this._refs.feverMeter.classList.toggle('is-tier2', tier2);
      this._refs.feverFill.style.width = `${Math.round(state.tapFever)}%`;
      if (tier2) {
        setTextIfChanged(this._refs.feverLabel, `FEVER X3 ${state.tapFeverTimer.toFixed(1)}S`);
      } else if (feverActive) {
        setTextIfChanged(this._refs.feverLabel, `FEVER X2 ${state.tapFeverTimer.toFixed(1)}S`);
      } else {
        setTextIfChanged(this._refs.feverLabel, `FEVER ${Math.round(state.tapFever)}%`);
      }
    }

    // 2. Boss Control Action Pill
    if (this._refs.autoBossBtn) {
      this._refs.autoBossBtn.classList.toggle('is-on', state.autoBoss);
      setTextIfChanged(this._refs.autoBossBtn, state.autoBoss ? 'AUTO-BOSS: ON' : 'AUTO-BOSS: OFF');
    }
    if (this._refs.challengeBtn) {
      const showChallenge = state.bossFarmMode && !state.isBossEncounter;
      this._refs.challengeBtn.classList.toggle('hidden', !showChallenge);
    }

    // 2B. Live Active Companion Mini-HUD & Synergy Badges (always synced, even when drawer closed)
    this._syncActivePartyHud(state);

    // 2C. Welcome Back Offline Loot Modal (always synced, even when drawer closed)
    this._syncOfflineLootModal(state);

    // 3. Check affordability dot on Shop Toggle, GEAR Tab Dot & ASCEND Tab Notification Dot
    const asc = state.ascension;
    let anyArtifactAffordable = false;
    if (asc && Array.isArray(asc.artifacts)) {
      for (let i = 0; i < asc.artifacts.length; i++) {
        const art = asc.artifacts[i];
        if (art && !art.isMaxed && art.canAfford) {
          anyArtifactAffordable = true;
          break;
        }
      }
    }
    const ascendNotify = Boolean(asc?.canAscend || anyArtifactAffordable);
    if (this._refs.ascendTabDot) {
      this._refs.ascendTabDot.classList.toggle('hidden', !ascendNotify);
    }

    const gearNotify = Boolean(state.hasGearAction);
    if (this._refs.gearTabDot) {
      this._refs.gearTabDot.classList.toggle('hidden', !gearNotify);
    }

    let anyAffordable = ascendNotify || gearNotify;
    if (!anyAffordable) {
      for (let i = 0; i < state.relicsView.length; i++) {
        const item = state.relicsView[i];
        if (item.canAfford ?? item.quote?.canAfford) {
          anyAffordable = true;
          break;
        }
      }
    }
    if (!anyAffordable) {
      for (let i = 0; i < state.companions.length; i++) {
        const c = state.companions[i];
        if ((!c.unlocked && c.canAffordRecruit) || (c.unlocked && c.canAffordUpgrade)) {
          anyAffordable = true;
          break;
        }
      }
    }
    if (this._refs.affordableDot) {
      this._refs.affordableDot.classList.toggle('hidden', !anyAffordable);
    }

    // Skip heavy drawer patching while drawer is closed (unless forceRebuild)
    if (!this.drawerOpen && !forceRebuild) return;

    const dpsBreakdown = this._computeDpsBreakdown(state);
    this._syncDrawerTelemetry(state, dpsBreakdown);

    // 4. Sync Active Tab Contents In-Place
    if (this.activeTab === 'items' || forceRebuild) {
      this._syncItemsTab(state);
    }
    if (this.activeTab === 'gear' || forceRebuild) {
      this._syncGearPanel(state, forceRebuild);
    }
    if (this.activeTab === 'companions' || forceRebuild) {
      this._syncCompanionsTab(state);
    }
    if (this.activeTab === 'ascend' || forceRebuild) {
      this._syncAscendTab(state);
    }
    if (this.activeTab === 'stats' || forceRebuild) {
      this._syncStatsTab(state, dpsBreakdown);
    }

    // Sync any custom registered tabs
    for (let i = 0; i < this.tabs.length; i++) {
      const t = this.tabs[i];
      if (!t.builtIn && typeof t.syncContent === 'function' && (this.activeTab === t.id || forceRebuild)) {
        const panel = this._tabPanelRefs.get(t.id);
        if (panel) t.syncContent(panel, state, this);
      }
    }
  }

  _syncOfflineLootModal(state) {
    const modal = this._refs.offlineModal;
    if (!modal) return;
    const loot = state.pendingOfflineLoot;
    const show = Boolean(loot);
    modal.classList.toggle('hidden', !show);
    if (!show) return;

    setTextIfChanged(this._refs.offlineAwayBadge, `AWAY: ${loot.formattedTime}`);

    const isCapped = loot.cappedSec > 0 && loot.awaySec > loot.cappedSec;
    if (this._refs.offlineCapBadge) {
      this._refs.offlineCapBadge.classList.toggle('hidden', !isCapped);
      if (isCapped) {
        const capHrs = Math.max(1, Math.round(loot.cappedSec / 3600));
        setTextIfChanged(this._refs.offlineCapBadge, `${capHrs}H MAX CAP`);
      }
    }

    if (this._refs.offlineStagesBadge) {
      const showStages = loot.stagesSimulated > 0;
      this._refs.offlineStagesBadge.classList.toggle('hidden', !showStages);
      if (showStages) {
        const unit = loot.stagesSimulated === 1 ? 'STAGE' : 'STAGES';
        setTextIfChanged(
          this._refs.offlineStagesBadge,
          `${formatEndlessNumber(loot.stagesSimulated)} ${unit} SIMULATED`
        );
      }
    }

    setTextIfChanged(this._refs.offlineGoldVal, `+${formatEndlessNumber(loot.gold)} GOLD`);
    if (this._refs.offlineGoldPlaque) {
      this._refs.offlineGoldPlaque.classList.toggle('is-empty', loot.gold <= 0);
    }

    setTextIfChanged(this._refs.offlineShardVal, `+${formatEndlessNumber(loot.astralShards)} SHARDS`);
    if (this._refs.offlineShardPlaque) {
      this._refs.offlineShardPlaque.classList.toggle('is-empty', loot.astralShards <= 0);
    }
  }

  _syncAscendTab(state) {
    const asc = state.ascension;
    if (!asc) return;
    this._lastResolvedAscension = asc;

    setTextIfChanged(this._refs.ascendCount, `ASCENSIONS: ${formatEndlessNumber(asc.totalAscensions)}`);
    setTextIfChanged(this._refs.ascendCurShards, formatEndlessNumber(asc.astralShards));
    setTextIfChanged(
      this._refs.ascendPendingShards,
      `+${formatEndlessNumber(asc.pendingShards)} ASTRAL SHARDS`
    );
    if (this._refs.ascendPendingShards) {
      this._refs.ascendPendingShards.classList.toggle('is-locked', !asc.canAscend || asc.pendingShards <= 0);
    }

    if (this._refs.ascendBtn && this._refs.ascendBtnLabel) {
      if (!asc.canAscend) {
        if (this._ascendArmed) {
          this._disarmAscendConfirm();
        }
        this._refs.ascendBtn.disabled = true;
        this._refs.ascendBtn.classList.remove('is-armed');
        setTextIfChanged(this._refs.ascendBtnLabel, `REACH STAGE ${asc.unlockStage} TO ASCEND`);
      } else {
        this._refs.ascendBtn.disabled = false;
        if (this._ascendArmed) {
          this._refs.ascendBtn.classList.add('is-armed');
          setTextIfChanged(
            this._refs.ascendBtnLabel,
            `CONFIRM ASCEND? (+${formatEndlessNumber(asc.pendingShards)} SHARDS)`
          );
        } else {
          this._refs.ascendBtn.classList.remove('is-armed');
          setTextIfChanged(this._refs.ascendBtnLabel, 'ASCEND NOW');
        }
      }
    }

    const list = Array.isArray(asc.artifacts) ? asc.artifacts : [];
    if (this._refs.artifactEmpty) {
      this._refs.artifactEmpty.classList.toggle('hidden', list.length > 0);
    }
    if (this._refs.artifactSectionSub) {
      const ownedCount = list.filter((a) => a.level > 0).length;
      setTextIfChanged(
        this._refs.artifactSectionSub,
        list.length > 0 ? `${ownedCount} / ${list.length} OWNED` : 'PERMANENT BOOSTS'
      );
    }

    for (let i = 0; i < list.length; i++) {
      const art = list[i];
      const ref = this._ensureArtifactRow(art);
      const isMaxed = Boolean(art.isMaxed);
      const canAfford = Boolean(!isMaxed && art.canAfford);

      ref.row.classList.toggle('is-affordable', canAfford);
      ref.row.classList.toggle('is-maxed', isMaxed);
      setTextIfChanged(ref.nameEl, art.name);
      setTextIfChanged(ref.lvEl, `LV.${art.level} / ${art.maxLevel}`);
      setTextIfChanged(ref.effectEl, art.effectSummary || '');
      setTextIfChanged(ref.descEl, art.desc || '');

      ref.buyBtn.classList.toggle('is-maxed', isMaxed);
      if (isMaxed) {
        setTextIfChanged(ref.buyBtn, 'MAXED');
        ref.buyBtn.disabled = true;
      } else {
        setTextIfChanged(ref.buyBtn, `${formatEndlessNumber(art.cost)} SHARDS`);
        ref.buyBtn.disabled = !canAfford;
      }
    }
  }

  _syncItemsTab(state) {
    for (const [mode, btn] of this._bulkBtnRefs.entries()) {
      btn.classList.toggle('is-active', mode === state.bulkMode);
    }

    // Wave 4: Sync Relic Set Synergies strip
    const relicSets = Array.isArray(state.relicSets) ? state.relicSets : [];
    for (let i = 0; i < relicSets.length; i++) {
      const s = relicSets[i];
      const setRef = this._relicSetPillRefs?.get?.(s.id);
      if (!setRef) continue;
      setRef.pill.classList.toggle('is-active', Boolean(s.active));
      setRef.pill.style.borderColor = s.active ? s.color || '#facc15' : '#334155';
      setTextIfChanged(setRef.tierSpan, s.tierLabel || (s.active ? `TIER ${s.tier}` : 'LOCKED'));
      const lvLabel = s.nextTierLevel ? `${s.minLevel}/${s.nextTierLevel}` : `LV.${s.minLevel}+`;
      setTextIfChanged(setRef.lvSpan, lvLabel);
      const setTip = `${s.name} (${s.tierLabel || 'LOCKED'}): ${s.bonusDesc || ''}`;
      if (setRef.pill.title !== setTip) {
        setRef.pill.title = setTip;
      }
    }

    const milestonesMap = state.relicMilestones || {};
    for (let i = 0; i < state.relicsView.length; i++) {
      const item = state.relicsView[i];
      const ref = this._relicRowRefs.get(item.id);
      if (!ref) continue;
      const relicDef = RELIC_DEF_BY_ID.get(item.id);
      const lv = Math.max(0, Math.floor(Number(item.level) || 0));
      const count = Math.max(1, Math.floor(Number(item.count ?? item.quote?.count) || 1));
      const cost = Number(item.totalCost ?? item.cost ?? item.quote?.totalCost ?? item.nextCost ?? item.quote?.nextCost ?? 0) || 0;
      const canAfford = Boolean(item.canAfford ?? item.quote?.canAfford ?? false);

      ref.row.classList.toggle('is-affordable', canAfford);
      setTextIfChanged(ref.lvEl, `LV.${lv}`);
      if (ref.milestoneEl) {
        const ms = milestonesMap[item.id];
        if (ms) {
          const reached = ms.reachedCount > 0;
          ref.milestoneEl.classList.toggle('is-reached', reached);
          const tagText = reached
            ? (ms.nextLevel ? `X${ms.activeMult} -> ${ms.nextLevel}` : `MAX X${ms.activeMult}`)
            : `LV.${ms.nextLevel || 10} X1.5`;
          setTextIfChanged(ref.milestoneEl, tagText);
        }
      }
      setTextIfChanged(
        ref.bonusEl,
        item.bonusText || (relicDef ? relicDef.formatBonus(lv) : '')
      );
      setTextIfChanged(ref.countSpan, `+${count}`);
      setTextIfChanged(ref.costSpan, `${formatEndlessNumber(cost)}G`);
      ref.buyBtn.disabled = !canAfford;
    }
  }

  _syncGearPanel(snapOrState, forceRebuild = false) {
    if (!this._refs.gearHeader) return;
    const gear = snapOrState && typeof snapOrState.gear === 'object' ? snapOrState.gear : null;

    // 1. Header Strip: Forge Dust, Gear Power, Equip Best, Salvage Lower
    const dustNum = Math.max(0, Math.floor(Number(gear?.forgeDust ?? snapOrState?.forgeDust ?? 0) || 0));
    const dustFormatted = String(
      gear?.formattedForgeDust ?? snapOrState?.formattedForgeDust ?? formatEndlessNumber(dustNum)
    );
    const totalPower = Math.max(0, Math.floor(Number(gear?.totalPower) || 0));
    setTextIfChanged(this._refs.gearDustVal, dustFormatted);
    setTextIfChanged(this._refs.gearPowerVal, formatEndlessNumber(totalPower));

    if (this._refs.gearEquipBestBtn) {
      this._refs.gearEquipBestBtn.classList.toggle('is-highlight', Boolean(gear?.hasUpgradeAvailable));
    }
    if (this._refs.gearSalvageLowerBtn) {
      this._refs.gearSalvageLowerBtn.disabled = !Boolean(gear?.hasSalvageableLower);
    }

    // 2. 4 Equipped Slots Grid (in-place patching with per-slot signature diffing)
    const equippedMap = gear?.equipped && typeof gear.equipped === 'object' ? gear.equipped : null;
    for (let i = 0; i < GEAR_SLOT_ORDER.length; i++) {
      const slotId = GEAR_SLOT_ORDER[i];
      const slotRef = this._gearSlotRefs.get(slotId);
      if (!slotRef) continue;
      const item = equippedMap ? equippedMap[slotId] || null : null;
      const sig = computeGearItemSignature(item);
      if (!forceRebuild && this._lastGearEquipSigs.get(slotId) === sig) {
        continue;
      }
      this._lastGearEquipSigs.set(slotId, sig);

      const slotDef = GEAR_SLOT_DEFAULTS[slotId];
      if (!item) {
        slotRef.currentUid = null;
        slotRef.currentItem = null;
        slotRef.card.classList.add('is-empty');
        slotRef.card.style.borderColor = '';
        slotRef.card.style.boxShadow = '';
        slotRef.iconWrap.style.borderColor = '';
        slotRef.rarityPill.style.borderColor = '';
        slotRef.rarityPill.style.color = '';
        setTextIfChanged(slotRef.rarityPill, slotDef.label);
        slotRef.enhLvEl.classList.add('hidden');
        setTextIfChanged(slotRef.nameEl, 'EMPTY SLOT');
        setTextIfChanged(slotRef.statsEl, 'NO ITEM EQUIPPED');
        slotRef.enhBtn.disabled = true;
        slotRef.enhBtn.classList.remove('is-maxed');
        const emptyTip = `${slotDef.label}: Empty Slot`;
        if (slotRef.card.title !== emptyTip) {
          slotRef.card.title = emptyTip;
        }
        continue;
      }

      slotRef.currentUid = String(item.uid || '');
      slotRef.currentItem = item;
      slotRef.card.classList.remove('is-empty');

      const rarityColor = item.rarityMeta?.color || '#94a3b8';
      const rarityLabel = item.rarityMeta?.label || String(item.rarity || 'COMMON').toUpperCase();
      const slotLabel = item.slotMeta?.label || slotDef.label;
      const lv = Math.max(0, Math.floor(Number(item.enhanceLevel) || 0));

      slotRef.card.style.borderColor = rarityColor;
      if (item.rarity === 'mythic' || item.rarity === 'sovereign') {
        slotRef.card.style.boxShadow = `inset 0 0 12px ${rarityColor}33, 0 0 8px ${rarityColor}33`;
      } else {
        slotRef.card.style.boxShadow = '';
      }
      slotRef.iconWrap.style.borderColor = rarityColor;
      slotRef.rarityPill.style.borderColor = rarityColor;
      slotRef.rarityPill.style.color = rarityColor;
      setTextIfChanged(slotRef.rarityPill, rarityLabel);

      slotRef.enhLvEl.classList.toggle('hidden', lv <= 0);
      if (lv > 0) {
        setTextIfChanged(slotRef.enhLvEl, `+${lv}`);
      }

      setTextIfChanged(slotRef.nameEl, item.name || `${rarityLabel} ${slotLabel}`);

      const bonuses = item.effectiveBonuses || item.bonuses;
      const topStats = formatGearBonuses(bonuses, 2) || `PWR ${formatEndlessNumber(item.power || 0)}`;
      setTextIfChanged(slotRef.statsEl, topStats);

      if (item.setMeta && item.setMeta.name) {
        const setAccent = item.setMeta.accentHex || '#facc15';
        slotRef.setTagEl.classList.remove('is-pwr', 'hidden');
        slotRef.setTagEl.style.borderColor = setAccent;
        slotRef.setTagEl.style.color = setAccent;
        setTextIfChanged(slotRef.setTagEl, item.setMeta.name);
      } else {
        slotRef.setTagEl.classList.add('is-pwr');
        slotRef.setTagEl.classList.remove('hidden');
        slotRef.setTagEl.style.borderColor = '';
        slotRef.setTagEl.style.color = '';
        setTextIfChanged(slotRef.setTagEl, `PWR ${formatEndlessNumber(item.power || 0)}`);
      }

      const isMax = Boolean(item.isMaxEnhanced || lv >= 20);
      slotRef.enhBtn.classList.toggle('is-maxed', isMax);
      if (isMax) {
        setTextIfChanged(slotRef.enhBtn, 'MAX');
        slotRef.enhBtn.disabled = true;
      } else {
        const cost = Math.max(0, Math.floor(Number(item.enhanceCost) || 0));
        setTextIfChanged(slotRef.enhBtn, `+1 • ${formatEndlessNumber(cost)}D`);
        slotRef.enhBtn.disabled = !item.canEnhance;
      }

      const fullStats = formatGearBonuses(bonuses, 0);
      const tip =
        `${item.name || slotLabel}${lv > 0 ? ` +${lv}` : ''} [${rarityLabel} ${slotLabel}] ` +
        `STG ${item.stage || 1} | PWR ${formatEndlessNumber(item.power || 0)}` +
        (fullStats ? ` | ${fullStats}` : '') +
        (item.setMeta?.name ? ` | SET: ${item.setMeta.name}` : '');
      if (slotRef.card.title !== tip) {
        slotRef.card.title = tip;
      }
    }

    // 3. Mythic Set Passives Strip (3 compact pills)
    const activeSets = Array.isArray(gear?.activeSets) && gear.activeSets.length > 0
      ? gear.activeSets
      : DEFAULT_MYTHIC_SETS;
    const setSig = activeSets
      .map((s) => `${s.id}:${s.pieces || 0}:${s.requiredPieces || 2}:${s.active ? 1 : 0}:${s.empowered ? 1 : 0}:${s.shortDesc || ''}`)
      .join('|');
    if (forceRebuild || setSig !== this._lastGearSetSig) {
      this._lastGearSetSig = setSig;
      for (let i = 0; i < activeSets.length; i++) {
        const s = activeSets[i];
        const ref = this._gearSetPillRefs.get(s.id);
        if (!ref) continue;
        const pieces = Math.max(0, Math.floor(Number(s.pieces) || 0));
        const req = Math.max(1, Math.floor(Number(s.requiredPieces) || 2));
        const active = Boolean(s.active);
        const empowered = Boolean(s.empowered);
        const accent = s.accentHex || ref.def.accentHex || '#facc15';
        const statusText = empowered ? 'EMPOWERED' : (active ? 'ACTIVE' : `${pieces}/${req}`);

        ref.pill.classList.toggle('is-active', active);
        ref.pill.classList.toggle('is-empowered', empowered);
        ref.pill.style.borderColor = (active || empowered) ? accent : '#334155';
        ref.pill.style.boxShadow = empowered
          ? `inset 0 0 12px ${accent}40, 0 0 8px ${accent}55`
          : active
            ? `inset 0 0 10px ${accent}30, 0 0 6px ${accent}38`
            : '';
        ref.nameEl.style.color = (active || empowered) ? accent : '#cbd5e1';
        ref.statusEl.style.borderColor = (active || empowered) ? accent : '#334155';
        ref.statusEl.style.color = empowered ? '#ffffff' : active ? accent : '#94a3b8';

        setTextIfChanged(ref.nameEl, s.name || ref.def.name);
        setTextIfChanged(ref.statusEl, statusText);
        setTextIfChanged(ref.descEl, s.shortDesc || ref.def.shortDesc || '');

        const setTip = `${s.name || ref.def.name} (${statusText}): ${s.fullDesc || s.shortDesc || ref.def.fullDesc} [${pieces}/${req}]`;
        if (ref.pill.title !== setTip) {
          ref.pill.title = setTip;
        }
      }
    }

    // 4. Inventory Bag List (smart signature diff + in-place keyed reconciliation so clicks NEVER drop)
    const inventory = Array.isArray(gear?.inventory) ? gear.inventory : [];
    const invCount = Number.isFinite(Number(gear?.inventoryCount))
      ? Math.max(0, Math.floor(Number(gear.inventoryCount)))
      : inventory.length;
    const maxInv = Math.max(1, Math.floor(Number(gear?.maxInventory) || 24));
    setTextIfChanged(this._refs.gearBagCount, `BAG ${invCount}/${maxInv}`);
    if (this._refs.gearBagHint) {
      const dropped = Math.max(0, Math.floor(Number(gear?.totalDropped) || 0));
      setTextIfChanged(
        this._refs.gearBagHint,
        dropped > 0 ? `${formatEndlessNumber(dropped)} FOUND` : 'LOOT INVENTORY'
      );
    }

    if (this._refs.gearBagEmpty) {
      this._refs.gearBagEmpty.classList.toggle('hidden', inventory.length > 0);
    }

    const container = this._refs.gearBagItems;
    if (!container) return;

    const invSig = inventory.map((it) => computeGearItemSignature(it)).join('|');
    if (!forceRebuild && invSig === this._lastGearInvSig) {
      return;
    }
    this._lastGearInvSig = invSig;

    const seenUids = new Set();
    for (let i = 0; i < inventory.length; i++) {
      const it = inventory[i];
      if (!it || !it.uid) continue;
      seenUids.add(String(it.uid));
    }

    // Remove rows for items no longer in bag
    for (const [uid, rowRef] of this._gearBagRowRefs.entries()) {
      if (!seenUids.has(uid)) {
        if (rowRef.row.parentNode === container) {
          container.removeChild(rowRef.row);
        }
        this._gearBagRowRefs.delete(uid);
      }
    }

    // Create or patch in-place and preserve exact inventory order without detaching unchanged rows
    for (let i = 0; i < inventory.length; i++) {
      const it = inventory[i];
      if (!it || !it.uid) continue;
      const uid = String(it.uid);
      let rowRef = this._gearBagRowRefs.get(uid);
      if (!rowRef) {
        rowRef = this._createGearBagRow(it);
        this._gearBagRowRefs.set(uid, rowRef);
      }
      this._patchGearBagRow(rowRef, it);
      const currentAtIdx = container.children[i] || null;
      if (currentAtIdx !== rowRef.row) {
        container.insertBefore(rowRef.row, currentAtIdx);
      }
    }
  }

  _syncCompanionsTab(state) {
    setTextIfChanged(
      this._refs.partyCounter,
      `ACTIVE PARTY ${state.activeSlotsCount} / ${state.maxActiveSlots}`
    );

    // Sync active Party Synergies header list
    const synergies = state.activeSynergies || [];
    if (this._refs.partySynCount) {
      setTextIfChanged(this._refs.partySynCount, `${synergies.length} ACTIVE`);
      this._refs.partySynCount.classList.toggle('is-active', synergies.length > 0);
    }
    if (this._refs.partySynList) {
      const sig = synergies.map((s) => `${s.id}|${s.name}|${s.shortLabel}|${s.desc}|${s.color}`).join('||');
      if (sig !== this._lastDrawerSynergySig) {
        this._lastDrawerSynergySig = sig;
        this._refs.partySynList.textContent = '';
        if (synergies.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'endless-party-syn-empty';
          empty.textContent = 'DEPLOY COMPATIBLE ALLIES TO UNLOCK SQUAD BONUSES';
          this._refs.partySynList.appendChild(empty);
        } else {
          for (let i = 0; i < synergies.length; i++) {
            const s = synergies[i];
            const pill = document.createElement('div');
            pill.className = 'endless-party-syn-pill';
            pill.style.borderLeftColor = s.color;

            const nameRow = document.createElement('div');
            nameRow.className = 'endless-party-syn-name';
            nameRow.style.color = s.color;
            const iconWrap = document.createElement('span');
            iconWrap.innerHTML = SYNERGY_DIAMOND_SVG;
            const titleTxt = document.createElement('span');
            titleTxt.style.color = '#fef08a';
            titleTxt.textContent = s.name;
            nameRow.appendChild(iconWrap);
            nameRow.appendChild(titleTxt);

            const descRow = document.createElement('div');
            descRow.className = 'endless-party-syn-desc';
            descRow.textContent = s.desc || s.shortLabel;

            pill.appendChild(nameRow);
            pill.appendChild(descRow);
            this._refs.partySynList.appendChild(pill);
          }
        }
      }
    }

    const list = state.companions || [];
    if (this._refs.companionEmpty) {
      this._refs.companionEmpty.classList.toggle('hidden', list.length > 0);
    }

    for (let i = 0; i < list.length; i++) {
      const comp = list[i];
      const ref = this._ensureCompanionCard(comp);
      const unlocked = Boolean(comp.unlocked);
      const deployed = Boolean(comp.deployed);
      const lv = Math.max(0, Math.floor(Number(comp.level) || 0));

      ref.card.classList.toggle('is-unlocked', unlocked);
      ref.card.classList.toggle('is-deployed', deployed);

      this._blitCompanionPortrait(
        ref.portCanvas,
        comp.heroKey,
        comp.accentHex,
        comp.shortName || comp.name
      );

      setTextIfChanged(ref.lvEl, unlocked ? `LV.${lv}` : 'LOCKED');
      setTextIfChanged(ref.dpsEl, `DPS ${formatEndlessNumber(comp.dpsEstimate || 0)}`);

      if (!unlocked) {
        const cost = Number(comp.recruitCost ?? 0) || 0;
        setTextIfChanged(ref.primaryBtn, `RECRUIT ${formatEndlessNumber(cost)}G`);
        ref.primaryBtn.disabled = !comp.canAffordRecruit;
        ref.deployBtn.classList.add('hidden');
      } else {
        const cost = Number(comp.upgradeCost ?? 0) || 0;
        setTextIfChanged(ref.primaryBtn, `UPGRADE ${formatEndlessNumber(cost)}G`);
        ref.primaryBtn.disabled = !comp.canAffordUpgrade;
        ref.deployBtn.classList.remove('hidden');
        ref.deployBtn.classList.toggle('is-deployed', deployed);
        setTextIfChanged(ref.deployBtn, deployed ? 'BENCH' : 'DEPLOY');
      }
    }
  }

  _syncStatsTab(state, breakdown = null) {
    const b = breakdown || this._computeDpsBreakdown(state);
    const s = state.stats;

    // Live DPS Breakdown Card
    if (this._refs.dpsFeverPill) {
      const showFever = state.feverGoldMult > 1;
      this._refs.dpsFeverPill.classList.toggle('hidden', !showFever);
      if (showFever) {
        setTextIfChanged(this._refs.dpsFeverPill, `FEVER X${Math.round(state.feverGoldMult)}`);
      }
    }
    if (this._refs.dpsSegHero) this._refs.dpsSegHero.style.width = `${b.heroWidth.toFixed(2)}%`;
    if (this._refs.dpsSegTap) this._refs.dpsSegTap.style.width = `${b.tapWidth.toFixed(2)}%`;
    if (this._refs.dpsSegParty) this._refs.dpsSegParty.style.width = `${b.partyWidth.toFixed(2)}%`;

    setTextIfChanged(this._refs.dpsHeroVal, formatEndlessNumber(b.heroDps));
    setTextIfChanged(this._refs.dpsHeroPct, `${b.heroPct}%`);
    setTextIfChanged(this._refs.dpsTapVal, formatEndlessNumber(b.tapDps));
    setTextIfChanged(this._refs.dpsTapPct, `${b.tapPct}%`);
    setTextIfChanged(this._refs.dpsPartyVal, formatEndlessNumber(b.partyDps));
    setTextIfChanged(this._refs.dpsPartyPct, `${b.partyPct}%`);
    setTextIfChanged(this._refs.dpsTotalVal, formatEndlessNumber(b.totalDps));
    setTextIfChanged(this._refs.dpsGoldSecVal, `${formatEndlessNumber(b.goldPerSec)}/S`);

    // Wave 4: Best-Stage Trophies Card
    const tr = state.bestStageTrophies;
    if (tr && this._refs.trophyBonus) {
      setTextIfChanged(this._refs.trophyBonus, `+${tr.totalBonusPct || 0}% DMG & GOLD`);
      setTextIfChanged(
        this._refs.trophyRank,
        tr.highestTrophy ? `RANK: ${tr.highestTrophy.name}` : `UNLOCKED: 0 (BEST STG ${tr.bestStage})`
      );
      setTextIfChanged(
        this._refs.trophyNext,
        tr.nextTrophy ? `NEXT STG ${tr.nextMilestoneStage}` : 'MAX RANK'
      );
      if (this._refs.trophyList && Array.isArray(tr.trophies)) {
        const displayTrophies = tr.trophies.slice(0, 8);
        const sig = displayTrophies.map((t) => `${t.id}:${t.unlocked ? 1 : 0}`).join('|');
        if (sig !== this._lastTrophySig) {
          this._lastTrophySig = sig;
          this._refs.trophyList.textContent = '';
          for (let i = 0; i < displayTrophies.length; i++) {
            const t = displayTrophies[i];
            const bEl = document.createElement('span');
            bEl.className = t.unlocked ? 'endless-trophy-badge is-unlocked' : 'endless-trophy-badge';
            if (t.unlocked && t.accentHex) {
              bEl.style.borderColor = t.accentHex;
            }
            bEl.textContent = `STG ${t.stage} ${t.name.split(' ')[0]}`;
            bEl.title = `${t.name} (Stage ${t.stage}): ${t.bonusDesc}`;
            this._refs.trophyList.appendChild(bEl);
          }
        }
      }
    }

    setTextIfChanged(this._statRefs.get('stage'), `${state.stage} / BEST ${state.bestStage}`);
    setTextIfChanged(this._statRefs.get('goldPerSec'), `${formatEndlessNumber(b.goldPerSec)}/S`);
    setTextIfChanged(this._statRefs.get('heroDps'), formatEndlessNumber(b.heroDps));
    setTextIfChanged(this._statRefs.get('tapDps'), formatEndlessNumber(b.tapDps));
    setTextIfChanged(this._statRefs.get('companionDps'), formatEndlessNumber(b.partyDps));
    setTextIfChanged(this._statRefs.get('totalDps'), formatEndlessNumber(b.totalDps));
    setTextIfChanged(this._statRefs.get('totalKills'), formatEndlessNumber(state.totalKills));
    setTextIfChanged(this._statRefs.get('bossesSlain'), formatEndlessNumber(state.bossesSlain));
    setTextIfChanged(this._statRefs.get('totalTaps'), formatEndlessNumber(state.totalTaps));
    setTextIfChanged(this._statRefs.get('totalGold'), `${formatEndlessNumber(state.totalGoldEarned)}G`);

    if (s) {
      setTextIfChanged(
        this._statRefs.get('critInfo'),
        `${(s.critChance * 100).toFixed(1)}% / X${s.critMult.toFixed(2)}`
      );
      setTextIfChanged(
        this._statRefs.get('goldMult'),
        `X${s.goldMult.toFixed(2)} / X${s.bossGoldMult.toFixed(2)}`
      );
      const discPct = Math.max(0, (1 - s.costDiscountMult) * 100);
      setTextIfChanged(this._statRefs.get('discountInfo'), `-${discPct.toFixed(1)}%`);
      setTextIfChanged(
        this._statRefs.get('sustainInfo'),
        `${(s.lifestealPct * 100).toFixed(1)}% / +${s.bossTimerBonusSec.toFixed(1)}S`
      );
    }
  }

  unmount() {
    this._disarmResetConfirm();
    this._disarmAscendConfirm();
    if (this._partyNoticeTimer) {
      clearTimeout(this._partyNoticeTimer);
      this._partyNoticeTimer = null;
    }
    if (this._saveFlashTimer) {
      clearTimeout(this._saveFlashTimer);
      this._saveFlashTimer = null;
    }
    for (const timer of this._ephemeralTimers) {
      clearTimeout(timer);
    }
    this._ephemeralTimers.clear();
    if (this.root) {
      this.root.textContent = '';
      this.root.classList.add('hidden');
      if (this._createdRoot && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
    }
    this.root = null;
    this.mounted = false;
    this._iconCanvases = [];
    this._partySlotRefs = [];
    this._relicRowRefs.clear();
    this._companionCardRefs.clear();
    this._artifactRowRefs.clear();
    this._gearSlotRefs.clear();
    this._gearSetPillRefs.clear();
    this._gearBagRowRefs.clear();
    this._tabBtnRefs.clear();
    this._tabPanelRefs.clear();
    this._bulkBtnRefs.clear();
    this._statRefs.clear();
    this._lastHudSynergySig = '';
    this._lastDrawerSynergySig = '';
    this._lastGearInvSig = '';
    this._lastGearSetSig = '';
    this._lastGearEquipSigs.clear();
    this._lastResolvedAscension = null;
    this._refs = {};
  }

  destroy() {
    this.setVisible(false);
    this.unmount();
    this._vfxFallbackImg = null;
    this._lastSnapshot = null;
    this.manager = null;
  }
}
