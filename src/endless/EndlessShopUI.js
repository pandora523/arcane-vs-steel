// Endless Crusade Gothic Obsidian & Burnished Gold HUD & Collapsible Shop Drawer
// Strictly Node-test safe (all DOM/window/Image accesses guarded), zero emojis,
// pure nearest-neighbor blits & fillRect fallbacks, in-place DOM patching (zero 60fps click drops).

import { PixelForge } from '../engine/PixelForge.js?v=30fps191';
import { ENDLESS_RELICS, formatEndlessNumber } from './EndlessEconomy.js?v=30fps191';

const ENDLESS_VFX_SHEET_URL = 'assets/sprites/endless_crusade_vfx.png?v=30fps191';
const ENDLESS_ICON_ROW = 7;
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
  top: max(88px, calc(env(safe-area-inset-top) + 84px));
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: min(690px, calc(100% - 216px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  pointer-events: none;
  z-index: 23;
}

.endless-top-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 5px 10px;
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
  top: max(88px, calc(env(safe-area-inset-top) + 84px));
  right: max(12px, env(safe-area-inset-right));
  z-index: 28;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 6px 7px;
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
  top: max(130px, calc(env(safe-area-inset-top) + 126px));
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
  align-items: stretch;
  gap: 4px;
  padding: 5px 7px;
  background: rgba(6, 8, 15, 0.94);
  border-bottom: 1px solid rgba(212, 175, 55, 0.35);
  flex-shrink: 0;
}

.endless-tab-btn {
  flex: 1 1 0;
  min-width: 0;
  padding: 6px 4px;
  font-family: inherit;
  font-size: 0.42rem;
  letter-spacing: 0.04em;
  color: #94a3b8;
  background: rgba(13, 17, 30, 0.9);
  border: 1.5px solid #334155;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-tab-btn.is-active {
  color: #fef08a;
  border-color: #facc15;
  background: linear-gradient(180deg, rgba(66, 46, 12, 0.92) 0%, rgba(28, 20, 8, 0.96) 100%);
  box-shadow: inset 0 1px 0 rgba(254, 240, 138, 0.3);
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
   RESPONSIVE ERGONOMICS: MOBILE LANDSCAPE (844x390) & PORTRAIT (390x844)
   ========================================================================= */
@media (max-height: 500px) {
  .endless-top-stack {
    top: max(56px, calc(env(safe-area-inset-top) + 52px));
    max-width: calc(100% - 178px);
    gap: 3px;
  }

  .endless-top-bar {
    padding: 3px 6px;
    gap: 4px 6px;
    border-width: 1.5px;
  }

  .endless-stage-badge {
    font-size: 0.38rem;
    padding: 2px 5px;
  }

  .endless-wave-meter {
    min-width: 88px;
    height: 15px;
  }

  .endless-wave-label {
    font-size: 0.35rem;
  }

  .endless-currency-pill {
    font-size: 0.38rem;
    padding: 1px 5px 1px 3px;
  }

  .endless-currency-icon {
    width: 14px;
    height: 14px;
  }

  .endless-fever-meter {
    width: 66px;
    height: 14px;
  }

  .endless-fever-label {
    font-size: 0.30rem;
  }

  .endless-autoboss-btn,
  .endless-challenge-boss-btn {
    font-size: 0.36rem;
    padding: 3px 7px;
  }

  #endless-shop-toggle {
    top: max(56px, calc(env(safe-area-inset-top) + 52px));
    right: max(8px, env(safe-area-inset-right));
    padding: 4px 8px 4px 5px;
    font-size: 0.38rem;
  }

  .endless-toggle-icon {
    width: 16px;
    height: 16px;
  }

  .endless-shop-shell {
    top: max(88px, calc(env(safe-area-inset-top) + 84px));
    right: max(8px, env(safe-area-inset-right));
    bottom: max(6px, env(safe-area-inset-bottom));
    width: min(334px, 54vw);
    z-index: 34;
  }
}

html.is-mobile-landscape .endless-top-stack {
  top: 56px;
  max-width: calc(100% - 178px);
  gap: 3px;
}

html.is-mobile-landscape .endless-top-bar {
  padding: 3px 6px;
  gap: 4px 6px;
}

html.is-mobile-landscape #endless-shop-toggle {
  top: 56px;
  right: 8px;
  padding: 4px 8px 4px 5px;
  font-size: 0.38rem;
}

html.is-mobile-landscape .endless-shop-shell {
  top: 88px;
  right: 8px;
  bottom: 6px;
  width: min(334px, 54vw);
  z-index: 34;
}

@media (max-width: 560px) and (orientation: portrait) {
  html:not(.is-mobile-landscape) .endless-top-stack {
    top: max(78px, calc(env(safe-area-inset-top) + 74px));
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
    gap: 4px 6px;
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
    top: max(164px, calc(env(safe-area-inset-top) + 160px));
    right: max(8px, env(safe-area-inset-right));
    padding: 5px 8px 5px 6px;
    font-size: 0.39rem;
  }

  html:not(.is-mobile-landscape) .endless-toggle-icon {
    width: 18px;
    height: 18px;
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

function drawFallbackPixelIcon(canvas, col, accentHex = '#facc15') {
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

  if (col === 0) {
    // Sovereign Gold Coin
    px(4, 3, 8, 10, '#92400e');
    px(5, 4, 6, 8, '#facc15');
    px(6, 5, 4, 6, '#fef08a');
    px(7, 6, 2, 4, '#d97706');
  } else if (col === 1) {
    // Astral Shard Crystal
    px(7, 2, 2, 12, '#bae6fd');
    px(5, 4, 6, 8, '#38bdf8');
    px(4, 6, 8, 4, '#a855f7');
    px(6, 5, 4, 5, '#ffffff');
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
    this._relicRowRefs = new Map();
    this._companionCardRefs = new Map();
    this._tabBtnRefs = new Map();
    this._tabPanelRefs = new Map();
    this._bulkBtnRefs = new Map();
    this._statRefs = new Map();
    this._refs = {};

    this._resetArmed = false;
    this._resetArmTimer = null;
    this._partyNoticeTimer = null;
    this._saveFlashTimer = null;
    this._lastSnapshot = null;

    // Data-driven tab registry so Wave 3 can append an ASCEND tab seamlessly
    this.tabs = [
      { id: 'items', label: 'ITEMS', builtIn: true },
      { id: 'companions', label: 'COMPANIONS', builtIn: true },
      { id: 'stats', label: 'STATS', builtIn: true }
    ];
  }

  _hasDom() {
    return typeof document !== 'undefined' && typeof document.createElement === 'function';
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

  _blitIconCanvas(canvas, col, accentHex, force = false) {
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const sheet = this._resolveVfxSheet();
    if (sheet) {
      if (!force && canvas._blittedSheet === sheet && canvas._blittedCol === col) {
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sx = col * ENDLESS_ICON_CELL;
      const sy = ENDLESS_ICON_ROW * ENDLESS_ICON_CELL;
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
      canvas._blittedCol = col;
      return;
    }
    if (!canvas._fallbackDrawn || force) {
      drawFallbackPixelIcon(canvas, col, accentHex);
      canvas._fallbackDrawn = true;
    }
  }

  _blitAllIcons(force = false) {
    for (let i = 0; i < this._iconCanvases.length; i++) {
      const entry = this._iconCanvases[i];
      this._blitIconCanvas(entry.canvas, entry.col, entry.accentHex, force);
    }
  }

  _blitCompanionPortrait(canvas, heroKey, accentHex) {
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const img = PixelForge?.assets?.[heroKey]?.portrait || null;
    if (img && typeof PixelForge?.ensureImage === 'function') {
      PixelForge.ensureImage(img);
    }
    if (img && img.complete && img.naturalWidth > 0) {
      if (canvas._blittedPortrait === img) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas._blittedPortrait = img;
      return;
    }
    if (img && !img.complete && typeof img.addEventListener === 'function' && !canvas._portraitLoadBound) {
      canvas._portraitLoadBound = true;
      img.addEventListener('load', () => {
        canvas._portraitLoadBound = false;
        this._blitCompanionPortrait(canvas, heroKey, accentHex);
      }, { once: true });
    }
    if (!canvas._fallbackPortraitDrawn) {
      drawFallbackPortrait(canvas, accentHex);
      canvas._fallbackPortraitDrawn = true;
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
    this._relicRowRefs.clear();
    this._companionCardRefs.clear();
    this._tabBtnRefs.clear();
    this._tabPanelRefs.clear();
    this._bulkBtnRefs.clear();
    this._statRefs.clear();
    this._refs = {};

    this._buildTopStatusBar();
    this._buildShopToggle();
    this._buildShopDrawer();

    this.setVisible(this.visible);
    this.setDrawerOpen(this.drawerOpen);
    this.setActiveTab(this.activeTab);
    this._blitAllIcons(true);

    return this;
  }

  _makeIconCanvas(size, col, accentHex, className) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    if (className) c.className = className;
    c.setAttribute('aria-hidden', 'true');
    this._iconCanvases.push({ canvas: c, col, accentHex });
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

    bar.appendChild(stageBadge);
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

    shell.appendChild(header);
    shell.appendChild(tabBar);
    shell.appendChild(body);
    this.root.appendChild(shell);

    this._refs.shopShell = shell;
    this._refs.tabBar = tabBar;
    this._refs.drawerBody = body;

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
      btn.textContent = tabDef.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setActiveTab(tabDef.id);
      });
      this._refs.tabBar.appendChild(btn);
      this._tabBtnRefs.set(tabDef.id, btn);
    } else {
      setTextIfChanged(btn, tabDef.label);
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
      } else if (tabDef.id === 'companions') {
        this._buildCompanionsPanel(panel);
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
      head.appendChild(nameEl);
      head.appendChild(lvEl);

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
        bonusEl,
        buyBtn,
        countSpan,
        costSpan
      });
    }

    panel.appendChild(bulkBar);
    panel.appendChild(list);
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

    partyBar.appendChild(partyRow);
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

  _buildStatsPanel(panel) {
    const scroll = document.createElement('div');
    scroll.className = 'endless-scroll-list';

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

    scroll.appendChild(grid);
    scroll.appendChild(actions);
    panel.appendChild(scroll);

    this._refs.saveBtn = saveBtn;
    this._refs.resetBtn = resetBtn;
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
    if (this.manager?.economy) {
      this.manager.economy.bulkMode = mode;
    }
    this._resyncNow();
  }

  _handleBuyRelic(relicId) {
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
      if (ref?.row) {
        ref.row.classList.add('is-just-bought');
        if (typeof setTimeout === 'function') {
          setTimeout(() => {
            ref.row?.classList?.remove('is-just-bought');
          }, 260);
        }
      }
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleCompanionPrimary(companionId) {
    const comps = this.manager?.companions;
    const econ = this.manager?.economy;
    if (!comps || !econ) return;

    const state = comps.rosterState?.[companionId];
    const unlocked = Boolean(state?.unlocked);
    const res = unlocked
      ? comps.upgrade?.(companionId, econ)
      : comps.recruit?.(companionId, econ);

    if (res?.ok) {
      this._playSfx('playUiConfirm');
      const hero = this.manager?.game?.fighters?.[0] || this.manager?.player || null;
      if (hero && typeof comps.syncEntitiesWithWorld === 'function') {
        comps.syncEntitiesWithWorld(hero);
      }
      if (typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      } else {
        econ.saveToStorage?.(comps.exportSnapshot?.());
      }
    } else {
      this._playSfx('playUiBack');
    }
    this._resyncNow();
  }

  _handleCompanionDeploy(companionId) {
    const comps = this.manager?.companions;
    if (!comps || typeof comps.toggleDeploy !== 'function') return;

    const res = comps.toggleDeploy(companionId);
    if (res?.ok) {
      this._playSfx('playUiClick');
      const hero = this.manager?.game?.fighters?.[0] || this.manager?.player || null;
      if (hero && typeof comps.syncEntitiesWithWorld === 'function') {
        comps.syncEntitiesWithWorld(hero);
      }
      if (typeof this.manager?.saveNow === 'function') {
        this.manager.saveNow();
      } else {
        this.manager?.economy?.saveToStorage?.(comps.exportSnapshot?.());
      }
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
      astralShards,
      autoBoss,
      bulkMode,
      tapFever,
      tapFeverTimer,
      tapFeverLevel,
      totalKills,
      bossesSlain,
      totalTaps,
      dpsMetrics,
      stats,
      relicsView,
      companions,
      activeSlotsCount,
      maxActiveSlots
    };
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
      const tier2 = feverActive && state.tapFeverLevel >= 2;
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

    // 3. Check affordability dot on Shop Toggle
    let anyAffordable = false;
    for (let i = 0; i < state.relicsView.length; i++) {
      const item = state.relicsView[i];
      if (item.canAfford ?? item.quote?.canAfford) {
        anyAffordable = true;
        break;
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

    // 4. Sync Active Tab Contents In-Place
    if (this.activeTab === 'items' || forceRebuild) {
      this._syncItemsTab(state);
    }
    if (this.activeTab === 'companions' || forceRebuild) {
      this._syncCompanionsTab(state);
    }
    if (this.activeTab === 'stats' || forceRebuild) {
      this._syncStatsTab(state);
    }

    // Sync any custom Wave 3 tabs (e.g. ASCEND)
    for (let i = 0; i < this.tabs.length; i++) {
      const t = this.tabs[i];
      if (!t.builtIn && typeof t.syncContent === 'function' && (this.activeTab === t.id || forceRebuild)) {
        const panel = this._tabPanelRefs.get(t.id);
        if (panel) t.syncContent(panel, state, this);
      }
    }
  }

  _syncItemsTab(state) {
    for (const [mode, btn] of this._bulkBtnRefs.entries()) {
      btn.classList.toggle('is-active', mode === state.bulkMode);
    }

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
      setTextIfChanged(
        ref.bonusEl,
        item.bonusText || (relicDef ? relicDef.formatBonus(lv) : '')
      );
      setTextIfChanged(ref.countSpan, `+${count}`);
      setTextIfChanged(ref.costSpan, `${formatEndlessNumber(cost)}G`);
      ref.buyBtn.disabled = !canAfford;
    }
  }

  _syncCompanionsTab(state) {
    setTextIfChanged(
      this._refs.partyCounter,
      `ACTIVE PARTY ${state.activeSlotsCount} / ${state.maxActiveSlots}`
    );

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

      this._blitCompanionPortrait(ref.portCanvas, comp.heroKey, comp.accentHex);

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

  _syncStatsTab(state) {
    const m = state.dpsMetrics || {};
    const heroDps = Number(m.heroDps) || 0;
    const tapDps = Number(m.tapDps) || 0;
    const compDps = Number(m.companionDps) || 0;
    const goldPerSec = Number(m.goldPerSec) || 0;
    const s = state.stats;

    setTextIfChanged(this._statRefs.get('stage'), `${state.stage} / BEST ${state.bestStage}`);
    setTextIfChanged(this._statRefs.get('goldPerSec'), `${formatEndlessNumber(goldPerSec)}/S`);
    setTextIfChanged(this._statRefs.get('heroDps'), formatEndlessNumber(heroDps));
    setTextIfChanged(this._statRefs.get('tapDps'), formatEndlessNumber(tapDps));
    setTextIfChanged(this._statRefs.get('companionDps'), formatEndlessNumber(compDps));
    setTextIfChanged(this._statRefs.get('totalDps'), formatEndlessNumber(heroDps + tapDps + compDps));
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
    if (this._partyNoticeTimer) {
      clearTimeout(this._partyNoticeTimer);
      this._partyNoticeTimer = null;
    }
    if (this._saveFlashTimer) {
      clearTimeout(this._saveFlashTimer);
      this._saveFlashTimer = null;
    }
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
    this._relicRowRefs.clear();
    this._companionCardRefs.clear();
    this._tabBtnRefs.clear();
    this._tabPanelRefs.clear();
    this._bulkBtnRefs.clear();
    this._statRefs.clear();
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
