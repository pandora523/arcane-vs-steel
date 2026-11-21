// Endless Crusade Pixel-Art SVGs, Static Icon/Formation/Gear/Trial Specs,
// Formatting Utilities & Nearest-Neighbor Canvas Fallback Drawers.
// Strictly Node-test safe (all DOM/Canvas accesses guarded), zero emojis/dingbats.

import { formatEndlessNumber } from './EndlessEconomy.js?v=30fps201';

export const ENDLESS_VFX_SHEET_URL = 'assets/sprites/endless_crusade_vfx.png?v=30fps201';
export const ENDLESS_ICON_ROW = 7;
export const ENDLESS_SIGIL_ROW = 9;
export const ENDLESS_ICON_CELL = 128;

export const CLOSE_SVG =
  '<svg class="endless-px-svg" width="12" height="12" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="2" y="2" width="2" height="2" fill="currentColor"/>' +
  '<rect x="4" y="4" width="4" height="4" fill="currentColor"/>' +
  '<rect x="8" y="2" width="2" height="2" fill="currentColor"/>' +
  '<rect x="2" y="8" width="2" height="2" fill="currentColor"/>' +
  '<rect x="8" y="8" width="2" height="2" fill="currentColor"/>' +
  '</svg>';

export const BOSS_CROWN_SVG =
  '<svg class="endless-px-svg" width="12" height="10" viewBox="0 0 12 10" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="1" y="2" width="2" height="6" fill="#facc15"/>' +
  '<rect x="5" y="1" width="2" height="7" fill="#fef08a"/>' +
  '<rect x="9" y="2" width="2" height="6" fill="#facc15"/>' +
  '<rect x="1" y="6" width="10" height="3" fill="#d97706"/>' +
  '<rect x="2" y="5" width="8" height="2" fill="#facc15"/>' +
  '<rect x="5" y="6" width="2" height="2" fill="#ef4444"/>' +
  '</svg>';

export const SYNERGY_DIAMOND_SVG =
  '<svg class="endless-px-svg" width="8" height="8" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="3" y="0" width="2" height="8" fill="currentColor"/>' +
  '<rect x="1" y="2" width="6" height="4" fill="currentColor"/>' +
  '<rect x="0" y="3" width="8" height="2" fill="currentColor"/>' +
  '<rect x="3" y="3" width="2" height="2" fill="#ffffff"/>' +
  '</svg>';

export const DPS_BAR_SVG =
  '<svg class="endless-px-svg" width="10" height="10" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="1" y="5" width="2" height="4" fill="#38bdf8"/>' +
  '<rect x="4" y="2" width="2" height="7" fill="#facc15"/>' +
  '<rect x="7" y="4" width="2" height="5" fill="#c084fc"/>' +
  '<rect x="0" y="9" width="10" height="1" fill="#d4af37"/>' +
  '</svg>';

export const ASCEND_STAR_SVG =
  '<svg class="endless-px-svg" width="12" height="12" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="5" y="0" width="2" height="12" fill="#e9d5ff"/>' +
  '<rect x="0" y="5" width="12" height="2" fill="#c084fc"/>' +
  '<rect x="3" y="3" width="6" height="6" fill="#a855f7"/>' +
  '<rect x="4" y="4" width="4" height="4" fill="#fef08a"/>' +
  '<rect x="5" y="5" width="2" height="2" fill="#ffffff"/>' +
  '</svg>';

export const GEAR_WEAPON_SVG =
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

export const GEAR_ARMOR_SVG =
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

export const GEAR_AMULET_SVG =
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

export const GEAR_RING_SVG =
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

export const FORGE_DUST_SVG =
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

export const BOUNTY_SVG =
  '<svg class="endless-px-svg" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="1" y="1" width="12" height="2" fill="#d4af37"/>' +
  '<rect x="2" y="1" width="10" height="1" fill="#fef08a"/>' +
  '<rect x="2" y="3" width="10" height="8" fill="#e2c799"/>' +
  '<rect x="3" y="3" width="8" height="8" fill="#f5e6c8"/>' +
  '<rect x="11" y="3" width="1" height="8" fill="#b49263"/>' +
  '<rect x="5" y="4" width="4" height="6" fill="#dc2626"/>' +
  '<rect x="4" y="5" width="6" height="4" fill="#ef4444"/>' +
  '<rect x="5" y="5" width="4" height="4" fill="#f8fafc"/>' +
  '<rect x="6" y="6" width="2" height="2" fill="#dc2626"/>' +
  '<rect x="6" y="6" width="1" height="1" fill="#fef08a"/>' +
  '<rect x="1" y="11" width="12" height="2" fill="#b45309"/>' +
  '<rect x="2" y="11" width="10" height="1" fill="#facc15"/>' +
  '</svg>';

export const SHRINE_SVG =
  '<svg class="endless-px-svg" width="12" height="12" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="6" y="0" width="2" height="2" fill="currentColor"/>' +
  '<rect x="5" y="2" width="3" height="2" fill="currentColor"/>' +
  '<rect x="3" y="4" width="6" height="2" fill="currentColor"/>' +
  '<rect x="4" y="4" width="3" height="2" fill="#fef08a"/>' +
  '<rect x="2" y="6" width="8" height="2" fill="currentColor"/>' +
  '<rect x="4" y="6" width="4" height="2" fill="#ffffff"/>' +
  '<rect x="4" y="8" width="4" height="2" fill="currentColor"/>' +
  '<rect x="5" y="8" width="2" height="2" fill="#fef08a"/>' +
  '<rect x="4" y="10" width="2" height="2" fill="currentColor"/>' +
  '</svg>';

export const MERCHANT_SVG =
  '<svg class="endless-px-svg" width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="5" y="0" width="4" height="1" fill="#facc15"/>' +
  '<rect x="6" y="1" width="2" height="1" fill="#d4af37"/>' +
  '<rect x="3" y="2" width="8" height="2" fill="#334155"/>' +
  '<rect x="4" y="2" width="6" height="1" fill="#d4af37"/>' +
  '<rect x="3" y="4" width="1" height="7" fill="#475569"/>' +
  '<rect x="10" y="4" width="1" height="7" fill="#475569"/>' +
  '<rect x="4" y="4" width="6" height="7" fill="#f59e0b"/>' +
  '<rect x="5" y="5" width="4" height="5" fill="#facc15"/>' +
  '<rect x="6" y="5" width="2" height="4" fill="#fef08a"/>' +
  '<rect x="6" y="6" width="2" height="2" fill="#ffffff"/>' +
  '<rect x="1" y="5" width="1" height="1" fill="#c084fc"/>' +
  '<rect x="12" y="6" width="1" height="1" fill="#fef08a"/>' +
  '<rect x="2" y="11" width="10" height="2" fill="#b45309"/>' +
  '<rect x="3" y="11" width="8" height="1" fill="#facc15"/>' +
  '<rect x="4" y="13" width="6" height="1" fill="#334155"/>' +
  '</svg>';

export const STAR_ON_SVG =
  '<svg class="endless-px-svg" width="8" height="8" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="3" y="0" width="2" height="1" fill="#fef08a"/>' +
  '<rect x="3" y="1" width="2" height="1" fill="#facc15"/>' +
  '<rect x="0" y="2" width="8" height="1" fill="#facc15"/>' +
  '<rect x="2" y="2" width="4" height="1" fill="#fef08a"/>' +
  '<rect x="1" y="3" width="6" height="1" fill="#facc15"/>' +
  '<rect x="3" y="3" width="2" height="1" fill="#ffffff"/>' +
  '<rect x="2" y="4" width="4" height="1" fill="#facc15"/>' +
  '<rect x="3" y="4" width="2" height="1" fill="#fef08a"/>' +
  '<rect x="1" y="5" width="6" height="1" fill="#d97706"/>' +
  '<rect x="2" y="5" width="4" height="1" fill="#facc15"/>' +
  '<rect x="1" y="6" width="2" height="1" fill="#d97706"/>' +
  '<rect x="5" y="6" width="2" height="1" fill="#d97706"/>' +
  '<rect x="0" y="7" width="2" height="1" fill="#b45309"/>' +
  '<rect x="6" y="7" width="2" height="1" fill="#b45309"/>' +
  '</svg>';

export const STAR_OFF_SVG =
  '<svg class="endless-px-svg" width="8" height="8" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="3" y="0" width="2" height="1" fill="#475569"/>' +
  '<rect x="3" y="1" width="2" height="1" fill="#334155"/>' +
  '<rect x="0" y="2" width="8" height="1" fill="#334155"/>' +
  '<rect x="2" y="2" width="4" height="1" fill="#475569"/>' +
  '<rect x="1" y="3" width="6" height="1" fill="#334155"/>' +
  '<rect x="3" y="3" width="2" height="1" fill="#475569"/>' +
  '<rect x="2" y="4" width="4" height="1" fill="#334155"/>' +
  '<rect x="1" y="5" width="6" height="1" fill="#1e293b"/>' +
  '<rect x="2" y="5" width="4" height="1" fill="#334155"/>' +
  '<rect x="1" y="6" width="2" height="1" fill="#1e293b"/>' +
  '<rect x="5" y="6" width="2" height="1" fill="#1e293b"/>' +
  '<rect x="0" y="7" width="2" height="1" fill="#0f172a"/>' +
  '<rect x="6" y="7" width="2" height="1" fill="#0f172a"/>' +
  '</svg>';

export const OVERDRIVE_BOLT_SVG =
  '<svg class="endless-px-svg" width="10" height="10" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="5" y="0" width="2" height="1" fill="#facc15"/>' +
  '<rect x="4" y="1" width="3" height="1" fill="#facc15"/>' +
  '<rect x="5" y="1" width="1" height="1" fill="#ffffff"/>' +
  '<rect x="3" y="2" width="3" height="1" fill="#fef08a"/>' +
  '<rect x="4" y="2" width="1" height="1" fill="#ffffff"/>' +
  '<rect x="2" y="3" width="3" height="1" fill="#facc15"/>' +
  '<rect x="3" y="3" width="1" height="1" fill="#ffffff"/>' +
  '<rect x="1" y="4" width="7" height="1" fill="#f43f5e"/>' +
  '<rect x="2" y="4" width="5" height="1" fill="#facc15"/>' +
  '<rect x="3" y="4" width="3" height="1" fill="#ffffff"/>' +
  '<rect x="2" y="5" width="6" height="1" fill="#e11d48"/>' +
  '<rect x="5" y="5" width="2" height="1" fill="#fef08a"/>' +
  '<rect x="5" y="6" width="3" height="1" fill="#f43f5e"/>' +
  '<rect x="6" y="6" width="1" height="1" fill="#fef08a"/>' +
  '<rect x="4" y="7" width="3" height="1" fill="#f43f5e"/>' +
  '<rect x="5" y="7" width="1" height="1" fill="#facc15"/>' +
  '<rect x="3" y="8" width="3" height="1" fill="#e11d48"/>' +
  '<rect x="4" y="8" width="1" height="1" fill="#facc15"/>' +
  '<rect x="2" y="9" width="2" height="1" fill="#be123c"/>' +
  '</svg>';

export const TRIAL_VAULT_SVG =
  '<svg class="endless-px-svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="4" y="1" width="2" height="2" fill="#fef08a"/>' +
  '<rect x="7" y="0" width="3" height="3" fill="#facc15"/>' +
  '<rect x="8" y="1" width="1" height="1" fill="#ffffff"/>' +
  '<rect x="10" y="1" width="2" height="2" fill="#fde047"/>' +
  '<rect x="2" y="3" width="12" height="2" fill="#d97706"/>' +
  '<rect x="1" y="4" width="14" height="3" fill="#92400e"/>' +
  '<rect x="2" y="4" width="12" height="1" fill="#facc15"/>' +
  '<rect x="3" y="5" width="10" height="2" fill="#78350f"/>' +
  '<rect x="1" y="7" width="14" height="7" fill="#78350f"/>' +
  '<rect x="2" y="7" width="12" height="1" fill="#fef08a"/>' +
  '<rect x="4" y="8" width="8" height="5" fill="#451a03"/>' +
  '<rect x="2" y="4" width="2" height="9" fill="#facc15"/>' +
  '<rect x="12" y="4" width="2" height="9" fill="#eab308"/>' +
  '<rect x="6" y="6" width="4" height="5" fill="#facc15"/>' +
  '<rect x="7" y="7" width="2" height="3" fill="#f43f5e"/>' +
  '<rect x="7" y="7" width="1" height="1" fill="#ffffff"/>' +
  '<rect x="1" y="13" width="14" height="2" fill="#b45309"/>' +
  '<rect x="2" y="13" width="12" height="1" fill="#facc15"/>' +
  '</svg>';

export const TRIAL_MALPHAS_SVG =
  '<svg class="endless-px-svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="1" y="1" width="2" height="3" fill="#e2e8f0"/>' +
  '<rect x="2" y="3" width="2" height="3" fill="#94a3b8"/>' +
  '<rect x="13" y="1" width="2" height="3" fill="#e2e8f0"/>' +
  '<rect x="12" y="3" width="2" height="3" fill="#94a3b8"/>' +
  '<rect x="6" y="1" width="1" height="2" fill="#facc15"/>' +
  '<rect x="9" y="1" width="1" height="2" fill="#facc15"/>' +
  '<rect x="7" y="2" width="2" height="2" fill="#f43f5e"/>' +
  '<rect x="4" y="4" width="8" height="2" fill="#be123c"/>' +
  '<rect x="3" y="5" width="10" height="5" fill="#9f1239"/>' +
  '<rect x="4" y="5" width="8" height="4" fill="#e11d48"/>' +
  '<rect x="4" y="6" width="8" height="1" fill="#4c0519"/>' +
  '<rect x="4" y="7" width="3" height="2" fill="#facc15"/>' +
  '<rect x="5" y="7" width="1" height="1" fill="#ffffff"/>' +
  '<rect x="9" y="7" width="3" height="2" fill="#facc15"/>' +
  '<rect x="10" y="7" width="1" height="1" fill="#ffffff"/>' +
  '<rect x="4" y="10" width="8" height="3" fill="#881337"/>' +
  '<rect x="5" y="10" width="6" height="2" fill="#4c0519"/>' +
  '<rect x="5" y="11" width="1" height="3" fill="#f8fafc"/>' +
  '<rect x="7" y="11" width="2" height="2" fill="#fda4af"/>' +
  '<rect x="10" y="11" width="1" height="3" fill="#f8fafc"/>' +
  '<rect x="5" y="14" width="6" height="1" fill="#be123c"/>' +
  '</svg>';

export const TRIAL_HORDE_SVG =
  '<svg class="endless-px-svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="5" y="1" width="6" height="2" fill="#c084fc"/>' +
  '<rect x="3" y="2" width="10" height="2" fill="#9333ea"/>' +
  '<rect x="2" y="4" width="12" height="8" fill="#7e22ce"/>' +
  '<rect x="3" y="12" width="10" height="2" fill="#9333ea"/>' +
  '<rect x="5" y="13" width="6" height="2" fill="#c084fc"/>' +
  '<rect x="4" y="4" width="8" height="8" fill="#1e1b4b"/>' +
  '<rect x="5" y="3" width="6" height="10" fill="#3b0764"/>' +
  '<rect x="5" y="5" width="6" height="6" fill="#0f172a"/>' +
  '<rect x="3" y="3" width="2" height="2" fill="#e9d5ff"/>' +
  '<rect x="11" y="3" width="2" height="2" fill="#e9d5ff"/>' +
  '<rect x="5" y="5" width="2" height="2" fill="#38bdf8"/>' +
  '<rect x="9" y="5" width="2" height="2" fill="#38bdf8"/>' +
  '<rect x="6" y="6" width="4" height="4" fill="#c084fc"/>' +
  '<rect x="7" y="7" width="2" height="2" fill="#ffffff"/>' +
  '<rect x="5" y="9" width="2" height="2" fill="#38bdf8"/>' +
  '<rect x="9" y="9" width="2" height="2" fill="#38bdf8"/>' +
  '<rect x="3" y="11" width="2" height="2" fill="#e9d5ff"/>' +
  '<rect x="11" y="11" width="2" height="2" fill="#e9d5ff"/>' +
  '<rect x="1" y="6" width="1" height="2" fill="#facc15"/>' +
  '<rect x="14" y="8" width="1" height="2" fill="#38bdf8"/>' +
  '</svg>';

export const DEFAULT_SQUAD_FORMATIONS = Object.freeze([
  Object.freeze({
    id: 'vanguard_wall',
    name: 'VANGUARD WALL',
    shortLabel: 'VANGUARD',
    accentHex: '#38bdf8',
    desc: '+30% MAX HP, +2% HP/S REGEN, +15% HERO DMG'
  }),
  Object.freeze({
    id: 'balanced_phalanx',
    name: 'BALANCED PHALANX',
    shortLabel: 'PHALANX',
    accentHex: '#facc15',
    desc: '+18% ALLY DMG, +15% GOLD, +10% HERO DMG'
  }),
  Object.freeze({
    id: 'all_out_blitz',
    name: 'ALL-OUT BLITZ',
    shortLabel: 'BLITZ',
    accentHex: '#f43f5e',
    desc: '+35% ALLY DMG, +18% CRIT, +22% BOSS DMG'
  })
]);

export const TRIAL_SVG_MAP = Object.freeze({
  gold_vault: TRIAL_VAULT_SVG,
  malphas_gauntlet: TRIAL_MALPHAS_SVG,
  abyssal_horde: TRIAL_HORDE_SVG
});

export const DEFAULT_TRIAL_DEFS = Object.freeze([
  Object.freeze({
    id: 'gold_vault',
    name: 'GILDED VAULT SPRINT',
    shortName: 'GOLD VAULT',
    durationSec: 30,
    cooldownSec: 30,
    accentHex: '#facc15',
    glowHex: '#fef08a',
    rewardTag: 'MASSIVE GOLD JACKPOT',
    desc: '30S non-stop Treasure Goblins and Gold Chests for huge Gold jackpots.'
  }),
  Object.freeze({
    id: 'malphas_gauntlet',
    name: 'COLOSSAL MALPHAS GAUNTLET',
    shortName: 'MALPHAS RUSH',
    durationSec: 45,
    cooldownSec: 30,
    accentHex: '#f43f5e',
    glowHex: '#fda4af',
    rewardTag: 'ASTRAL SHARDS + MYTHIC DUST',
    desc: '45S pure DPS check vs Behemoth Malphas paying Shards and Forge Dust per damage tier.'
  }),
  Object.freeze({
    id: 'abyssal_horde',
    name: 'ABYSSAL HORDE SURVIVAL',
    shortName: 'HORDE SURVIVAL',
    durationSec: 45,
    cooldownSec: 30,
    accentHex: '#c084fc',
    glowHex: '#e9d5ff',
    rewardTag: 'GUARANTEED HEROIC+ GEAR',
    desc: '45S dense monster swarm awarding guaranteed Heroic, Sovereign or Mythic Gear.'
  })
]);

export const TRIAL_RARITY_COLORS = Object.freeze({
  common: '#94a3b8',
  arcane: '#38bdf8',
  heroic: '#c084fc',
  sovereign: '#facc15',
  mythic: '#f43f5e'
});

export const GEAR_SLOT_ORDER = Object.freeze(['weapon', 'armor', 'amulet', 'ring']);

export const GEAR_SLOT_DEFAULTS = Object.freeze({
  weapon: Object.freeze({ id: 'weapon', label: 'WEAPON', shortLabel: 'WPN' }),
  armor: Object.freeze({ id: 'armor', label: 'ARMOR', shortLabel: 'ARM' }),
  amulet: Object.freeze({ id: 'amulet', label: 'AMULET', shortLabel: 'AMU' }),
  ring: Object.freeze({ id: 'ring', label: 'RELIC RING', shortLabel: 'RNG' })
});

export const GEAR_SLOT_SVG_MAP = Object.freeze({
  weapon: GEAR_WEAPON_SVG,
  armor: GEAR_ARMOR_SVG,
  amulet: GEAR_AMULET_SVG,
  ring: GEAR_RING_SVG
});

export const DEFAULT_MYTHIC_SETS = Object.freeze([
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

export const GEAR_BONUS_SPECS = Object.freeze([
  Object.freeze({ key: 'heroDmgPct', label: 'HERO', isCrit: false, priority: 7 }),
  Object.freeze({ key: 'tapDmgPct', label: 'TAP', isCrit: false, priority: 6 }),
  Object.freeze({ key: 'companionDmgPct', label: 'ALLY', isCrit: false, priority: 5 }),
  Object.freeze({ key: 'bossDmgPct', label: 'BOSS', isCrit: false, priority: 4 }),
  Object.freeze({ key: 'goldPct', label: 'GOLD', isCrit: false, priority: 3 }),
  Object.freeze({ key: 'maxHpPct', label: 'HP', isCrit: false, priority: 2 }),
  Object.freeze({ key: 'critBonus', label: 'CRIT', isCrit: true, priority: 1 })
]);

export const ETERNAL_ARTIFACT_ICON_MAP = Object.freeze({
  eternal_blade: { row: 7, col: 2, accentHex: '#f97316' },
  sovereign_vault: { row: 7, col: 11, accentHex: '#facc15' },
  banner_of_oaths: { row: 7, col: 8, accentHex: '#f43f5e' },
  astral_spark: { row: 7, col: 3, accentHex: '#c084fc' },
  chronos_hourglass: { row: 7, col: 9, accentHex: '#38bdf8' },
  gilded_ledger: { row: 7, col: 0, accentHex: '#fde047' }
});

export function getTrialSvg(trialId) {
  return TRIAL_SVG_MAP[trialId] || TRIAL_VAULT_SVG;
}

export function formatTrialBestScore(trial) {
  const score = Math.max(0, Number(trial?.bestScore) || 0);
  if (score <= 0) return 'BEST: --';
  const rawFmt = trial?.formattedBestScore
    ? String(trial.formattedBestScore).trim().toUpperCase()
    : formatEndlessNumber(score).toUpperCase();
  if (trial?.id === 'gold_vault') {
    const tag = rawFmt.endsWith('G') ? rawFmt : `${rawFmt}G`;
    return `BEST: ${tag}`;
  }
  if (trial?.id === 'malphas_gauntlet') {
    return `BEST: ${rawFmt} DMG`;
  }
  if (trial?.id === 'abyssal_horde') {
    return `BEST: ${rawFmt} KILLS`;
  }
  return `BEST: ${rawFmt}`;
}

export function formatTrialHudScore(active) {
  if (!active || typeof active !== 'object') return '';
  if (active.id === 'gold_vault') {
    const goldStr = String(active.formattedGoldEarned || formatEndlessNumber(active.goldEarned || 0)).toUpperCase();
    const gobs = Math.max(0, Math.floor(Number(active.goblinsSlain) || 0));
    const chests = Math.max(0, Math.floor(Number(active.chestsCracked) || 0));
    if (chests > 0) {
      return `GOLD +${goldStr} | GOB ${gobs} | CHEST ${chests}`;
    }
    return `GOLD +${goldStr} | GOBLINS ${gobs}`;
  }
  if (active.id === 'malphas_gauntlet') {
    const dmgStr = String(active.formattedDamageDealt || formatEndlessNumber(active.damageDealt || 0)).toUpperCase();
    const tier = Math.max(0, Math.floor(Number(active.currentTier) || 0));
    return `DMG ${dmgStr} | TIER ${tier}`;
  }
  const kills = Math.max(0, Math.floor(Number(active.kills) || 0));
  if (active.id === 'abyssal_horde') {
    const tierTag = kills >= 28 ? 'MYTHIC' : kills >= 12 ? 'SOVEREIGN' : 'HEROIC';
    return `KILLS ${kills} | ${tierTag}`;
  }
  return `KILLS ${kills}`;
}

export function formatTrialResultPerf(res) {
  if (!res || typeof res !== 'object') return '';
  const usedSec = Math.max(0, Number(res.durationUsedSec) || 0);
  const durTag = `${usedSec.toFixed(1)}S`;
  if (res.trialId === 'gold_vault') {
    const gobs = Math.max(0, Math.floor(Number(res.goblinsSlain) || 0));
    const chests = Math.max(0, Math.floor(Number(res.chestsCracked) || 0));
    return `GOBLINS ${gobs} | CHESTS ${chests} | ${durTag}`;
  }
  if (res.trialId === 'malphas_gauntlet') {
    const dmgStr = String(
      res.formattedDamageDealt || res.formattedDamage || formatEndlessNumber(res.damageDealt || 0)
    ).toUpperCase();
    const tier = Math.max(0, Math.floor(Number(res.tierReached) || 0));
    return `DMG ${dmgStr} | TIER ${tier} | ${durTag}`;
  }
  const kills = Math.max(0, Math.floor(Number(res.kills) || 0));
  return `MONSTERS SLAIN ${kills} | ${durTag}`;
}

export function getGearSlotSvg(slot) {
  return GEAR_SLOT_SVG_MAP[slot] || GEAR_WEAPON_SVG;
}

export function formatGearBonusPercent(val, isCrit) {
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

export function formatGearBonuses(bonuses, maxCount = 2) {
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

export function resolveGearPowerDelta(item, equippedMap = null) {
  if (!item || typeof item !== 'object') return 0;
  if (Number.isFinite(Number(item.powerDelta))) {
    return Math.round(Number(item.powerDelta));
  }
  const itemPwr = Math.max(0, Math.round(Number(item.power) || 0));
  const eqPwr = Number.isFinite(Number(item.equippedPower))
    ? Math.max(0, Math.round(Number(item.equippedPower)))
    : Math.max(0, Math.round(Number(equippedMap?.[item.slot]?.power) || 0));
  return itemPwr - eqPwr;
}

export function computeGearItemSignature(item, equippedMap = null) {
  if (!item || typeof item !== 'object') return 'EMPTY';
  const eb = item.effectiveBonuses || item.bonuses || {};
  const delta = equippedMap !== null || Number.isFinite(Number(item.powerDelta))
    ? resolveGearPowerDelta(item, equippedMap)
    : 0;
  return [
    item.uid || '',
    item.slot || '',
    item.rarity || '',
    item.name || '',
    item.stage || 1,
    item.enhanceLevel || 0,
    item.power || 0,
    delta,
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

export function formatAwayTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}H ${m}M`;
  if (m > 0) return rem > 0 ? `${m}M ${rem}S` : `${m}M`;
  return `${rem}S`;
}

export function formatGoldTag(formatted, rawGold) {
  const base = formatted
    ? String(formatted).trim()
    : formatEndlessNumber(Math.max(0, Number(rawGold) || 0));
  const upper = base.toUpperCase();
  return upper.endsWith('G') ? upper : `${upper}G`;
}

export function resolveArtifactIconSpec(art) {
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

export function setTextIfChanged(el, text) {
  if (!el) return;
  const next = String(text);
  if (el.textContent !== next) {
    el.textContent = next;
  }
}

export function stopEventLeak(el) {
  if (!el || typeof el.addEventListener !== 'function') return;
  const halt = (e) => {
    e.stopPropagation();
  };
  el.addEventListener('pointerdown', halt);
  el.addEventListener('mousedown', halt);
  el.addEventListener('touchstart', halt, { passive: true });
  el.addEventListener('click', halt);
}

export function drawFallbackPixelIcon(canvas, col, accentHex = '#facc15', row = ENDLESS_ICON_ROW) {
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

export function drawFallbackPortrait(canvas, accentHex = '#facc15') {
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

export const PIXEL_MONOGRAM_3X5 = Object.freeze({
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

export function extractMonogramLetters(label) {
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

export function drawMonogramPortrait(canvas, accentHex = '#facc15', label = 'AL') {
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
