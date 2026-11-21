// Endless Crusade HUD & Collapsible Gothic Shop Drawer Styles
// Single-source Mobile Landscape generator emits both @media (max-height: 500px)
// and html.is-mobile-landscape rules so native & CSS-rotated landscape never drift.
// Strictly Node-test safe (pure string module), zero emojis/dingbats.

function buildLandscapeCss(innerCss) {
  const trimmed = String(innerCss || "").trim();
  if (!trimmed) return "";
  const stripped = trimmed.replace(/\/\*[\s\S]*?\*\//g, "");
  const htmlRules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(stripped)) !== null) {
    const rawSel = match[1].trim();
    const body = match[2].trim();
    if (!rawSel || !body) continue;
    const prefixedSel = rawSel
      .split(",")
      .map((part) => {
        const s = part.trim();
        if (!s) return "";
        if (s.startsWith("html.is-mobile-landscape")) return s;
        if (s.startsWith("html")) return s.replace(/^html\b/, "html.is-mobile-landscape");
        return `html.is-mobile-landscape ${s}`;
      })
      .filter(Boolean)
      .join(",\n");
    if (prefixedSel) {
      htmlRules.push(`${prefixedSel} {\n  ${body.replace(/\s*\n\s*/g, "\n  ")}\n}`);
    }
  }
  return `@media (max-height: 500px) {\n${trimmed}\n}\n\n${htmlRules.join("\n\n")}`;
}

export const ENDLESS_SHOP_CSS = [
`/* =========================================================================
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

/* Raise Endless HUD stacking context above #adv-boss-raid-hud (z-index: 24) when Trial/Offline modals are open */
#endless-hud-root:has(.endless-trial-modal:not(.hidden)),
#endless-hud-root:has(.endless-offline-modal:not(.hidden)) {
  z-index: 55;
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
  top: max(62px, calc(env(safe-area-inset-top) + 58px));
  left: 0;
  right: 0;
  width: auto;
  max-width: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  z-index: 28;
}

.endless-top-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 5px 8px;
  padding: 4px 9px;
  max-width: min(880px, calc(100% - 316px));
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

.endless-top-break {
  display: none;
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
  color: #ffffff;
  text-shadow:
    0 1px 0 #000,
    0 -1px 0 #000,
    1px 0 0 #000,
    -1px 0 0 #000,
    0 1px 3px rgba(0, 0, 0, 0.95);
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

/* Floating Shop Toggle Button (Docked at top-right on Desktop; inline in Top Bar on Mobile) */
#endless-shop-toggle {
  position: absolute;
  top: 0;
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

.endless-toggle-label-full {
  display: inline;
}

.endless-toggle-label-short {
  display: none;
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

.endless-event-alert-dot {
  display: none;
  width: 7px;
  height: 7px;
  background: #c084fc;
  border: 1px solid #fef08a;
  box-shadow: 0 0 9px #c084fc, 0 0 4px #facc15;
  animation: endlessDotPulse 0.95s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes endlessDotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.8); }
}

/* Collapsible Gothic Shop Drawer */
.endless-shop-shell {
  position: absolute;
  top: max(106px, calc(env(safe-area-inset-top) + 102px));
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

.endless-drawer-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.endless-drawer-autoboss-btn {
  font-size: 0.34rem;
  padding: 3px 6px;
  border-width: 1.5px;
  border-radius: 3px;
  line-height: 1.1;
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

/* Tab Bar (6 Single-Row Tabs: ITEMS | GEAR | ALLIES | ASCEND | TRIALS | STATS) */
.endless-tab-bar {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 2px;
  padding: 5px 4px;
  background: rgba(6, 8, 15, 0.94);
  border-bottom: 1px solid rgba(212, 175, 55, 0.35);
  flex-shrink: 0;
  overflow: hidden;
}

.endless-tab-btn {
  position: relative;
  flex: 0.96 1 0;
  min-width: 0;
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 2px;
  font-family: inherit;
  font-size: 0.31rem;
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
  flex: 0.84 1 0;
  border-color: rgba(250, 204, 21, 0.45);
  color: #fde68a;
}

.endless-tab-btn[data-tab-id="companions"] {
  flex: 1.08 1 0;
}

.endless-tab-btn[data-tab-id="ascend"] {
  flex: 1.08 1 0;
  border-color: rgba(168, 85, 247, 0.55);
  color: #d8b4fe;
}

.endless-tab-btn[data-tab-id="trials"] {
  flex: 1.08 1 0;
  border-color: rgba(244, 63, 94, 0.55);
  color: #fda4af;
}

.endless-tab-btn[data-tab-id="stats"] {
  flex: 0.96 1 0;
}

.endless-tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.endless-tab-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  pointer-events: none;
  background: #c084fc;
  border: 1px solid #fef08a;
  box-shadow: 0 0 8px #c084fc, 0 0 3px #facc15;
  animation: endlessDotPulse 1.1s ease-in-out infinite;
}

.endless-tab-dot.is-items {
  background: #facc15;
  border-color: #fffbeb;
  box-shadow: 0 0 7px #facc15, 0 0 3px #d97706;
}

.endless-tab-dot.is-gear {
  background: #facc15;
  border-color: #fef08a;
  box-shadow: 0 0 8px #facc15, 0 0 3px #34d399;
}

.endless-tab-dot.is-allies {
  background: #38bdf8;
  border-color: #e0f2fe;
  box-shadow: 0 0 8px #38bdf8, 0 0 3px #7dd3fc;
}

.endless-tab-dot.is-trials {
  background: #10b981;
  border-color: #a7f3d0;
  box-shadow: 0 0 7px #10b981, 0 0 3px #34d399;
  animation: none;
}

.endless-tab-dot.is-trials.is-trials-active {
  background: #facc15;
  border-color: #ffffff;
  box-shadow: 0 0 9px #facc15, 0 0 4px #f59e0b;
  animation: endlessDotPulse 0.85s ease-in-out infinite;
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

.endless-tab-btn[data-tab-id="trials"].is-active {
  color: #fffbeb;
  border-color: #fb7185;
  background: linear-gradient(180deg, rgba(127, 29, 29, 0.95) 0%, rgba(42, 10, 18, 0.98) 100%);
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.35),
    0 0 8px rgba(244, 63, 94, 0.48);
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
  top: max(102px, calc(env(safe-area-inset-top) + 98px));
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
  position: relative;
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
.endless-gear-bag-row.is-buy-pulse,
.endless-bounty-pill.is-buy-pulse,
.endless-merchant-card.is-buy-pulse,
.endless-trial-card.is-buy-pulse {
  animation: endlessBuyPulse 0.44s ease-out;
}

.endless-buy-btn.is-buy-pulse,
.endless-comp-btn.is-buy-pulse,
.endless-artifact-buy-btn.is-buy-pulse,
.endless-ascend-btn.is-buy-pulse,
.endless-gear-hdr-btn.is-buy-pulse,
.endless-gear-enh-btn.is-buy-pulse,
.endless-gear-act-btn.is-buy-pulse,
.endless-merchant-buy-btn.is-buy-pulse,
.endless-formation-btn.is-buy-pulse,
.endless-overdrive-btn.is-buy-pulse,
.endless-trial-enter-btn.is-buy-pulse {
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

.endless-micro-badge,
.endless-float-badge {
  position: absolute;
  left: 0;
  top: 0;
  padding: 2px 6px;
  font-family: 'ArcanePixel', 'Press Start 2P', monospace;
  font-size: 0.37rem;
  letter-spacing: 0.04em;
  color: #fef08a;
  background: rgba(10, 14, 26, 0.94);
  border: 1.5px solid #facc15;
  outline: 1px solid #000;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
  text-shadow: 0 1px 0 #000;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.28),
    0 0 10px rgba(250, 204, 21, 0.55),
    0 3px 8px rgba(0, 0, 0, 0.94);
  animation: endlessMicroBadgeFloat 0.68s ease-out forwards;
}

.endless-micro-badge.is-recruit,
.endless-float-badge.is-recruit {
  color: #f5d0fe;
  background: rgba(24, 10, 44, 0.94);
  border-color: #c084fc;
  box-shadow:
    inset 0 1px 0 rgba(233, 213, 255, 0.34),
    0 0 12px rgba(192, 132, 252, 0.65),
    0 3px 8px rgba(0, 0, 0, 0.94);
}

@keyframes endlessMicroBadgeFloat {
  0% {
    opacity: 0;
    transform: translate(-50%, 0px) scale(0.84);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -12px) scale(1.04);
  }
  74% {
    opacity: 1;
    transform: translate(-50%, -24px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -36px) scale(0.95);
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
   ========================================================================= */`,
buildLandscapeCss(`  .endless-top-stack {
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
  }`),
`
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
    top: calc(max(176px, calc(env(safe-area-inset-top) + 172px)) + var(--endless-boss-hud-h, 0px));
    width: auto;
    max-width: none;
    align-items: stretch;
    gap: 2px;
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
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    gap: 3px;
  }

  html:not(.is-mobile-landscape) .endless-synergy-badge {
    flex-shrink: 0;
    font-size: 0.25rem;
    padding: 1px 4px;
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

  html:not(.is-mobile-landscape) #app.is-endless-boss-hud-visible #endless-hud-root.is-drawer-open .endless-shop-shell {
    height: min(46vh, 390px);
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
`,
buildLandscapeCss(`  .endless-modifier-pill {
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
  }`),
`
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

.endless-gear-delta-badge {
  font-size: 0.27rem;
  padding: 1px 4px;
  border-radius: 2px;
  flex-shrink: 0;
  white-space: nowrap;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 0 #000;
}

.endless-gear-delta-badge.is-pos {
  color: #6ee7b7;
  background: rgba(6, 78, 59, 0.72);
  border: 1px solid rgba(52, 211, 153, 0.75);
}

.endless-gear-delta-badge.is-neg {
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(100, 116, 139, 0.52);
}

.endless-gear-delta-badge.hidden {
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

.endless-gear-act-btn:disabled {
  color: #64748b;
  background: linear-gradient(180deg, #141926 0%, #0b0e17 100%);
  border-color: #2d3748;
  cursor: not-allowed;
  opacity: 0.68;
}

.endless-gear-act-btn.is-enhance.is-maxed,
.endless-gear-act-btn.is-enhance.is-maxed:disabled {
  color: #fde047;
  background: linear-gradient(180deg, #422006 0%, #1c1205 100%);
  border-color: #d4af37;
  opacity: 0.88;
}

.endless-gear-act-btn.is-salvage {
  color: #fed7aa;
  background: linear-gradient(180deg, #431407 0%, #240c06 100%);
  border-color: #ea580c;
}

/* Wave 7 Responsive Ergonomics: Mobile Landscape (844x390) & Portrait (390x844) */`,
buildLandscapeCss(`  .endless-tab-bar {
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
  }`),
`
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

/* =========================================================================
   WAVE 8: UNIFIED EVENTS DOCK (BOUNTY TRACKER, SHRINE/ELIXIR BUFFS, MERCHANT)
   ========================================================================= */
.endless-events-dock {
  position: absolute;
  top: max(106px, calc(env(safe-area-inset-top) + 102px));
  right: max(14px, env(safe-area-inset-right));
  width: 232px;
  max-width: calc(100vw - 28px);
  z-index: 25;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  pointer-events: none;
}

.endless-events-dock.hidden {
  display: none !important;
}

#endless-hud-root.is-drawer-open .endless-events-dock {
  top: max(134px, calc(env(safe-area-inset-top) + 130px));
  right: max(374px, calc(env(safe-area-inset-right) + 374px));
}

/* Widget A: Compact Bounty Tracker Pill */
.endless-bounty-pill {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
  padding: 5px 7px;
  font-family: inherit;
  text-align: left;
  color: #f8fafc;
  background: linear-gradient(180deg, rgba(14, 18, 34, 0.94) 0%, rgba(7, 9, 18, 0.97) 100%);
  border: 1.5px solid rgba(212, 175, 55, 0.72);
  border-left: 3px solid #facc15;
  outline: 1px solid #000;
  border-radius: 4px;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.22),
    0 4px 12px rgba(0, 0, 0, 0.86);
  pointer-events: auto;
  cursor: default;
  transition: border-color 0.14s ease, box-shadow 0.14s ease, transform 0.08s ease;
}

.endless-bounty-pill.hidden {
  display: none !important;
}

.endless-bounty-pill.is-claimable {
  cursor: pointer;
  border-color: #fde047;
  border-left-color: #fef08a;
  background: linear-gradient(180deg, rgba(68, 48, 12, 0.96) 0%, rgba(24, 16, 6, 0.98) 100%);
  animation: endlessBountyClaimPulse 1.2s ease-in-out infinite;
}

.endless-bounty-pill.is-claimable:hover {
  border-color: #ffffff;
  filter: brightness(1.08);
}

.endless-bounty-pill.is-claimable:active {
  transform: translateY(1px);
}

@keyframes endlessBountyClaimPulse {
  0%, 100% {
    box-shadow:
      inset 0 1px 0 rgba(254, 240, 138, 0.45),
      0 0 10px rgba(250, 204, 21, 0.52),
      0 4px 12px rgba(0, 0, 0, 0.88);
  }
  50% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.62),
      0 0 18px rgba(250, 204, 21, 0.92),
      0 4px 14px rgba(0, 0, 0, 0.92);
  }
}

.endless-bounty-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  min-width: 0;
}

.endless-bounty-lead {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  flex: 1 1 auto;
}

.endless-bounty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.endless-bounty-label {
  font-size: 0.36rem;
  letter-spacing: 0.03em;
  color: #f8fafc;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-bounty-cta {
  font-size: 0.32rem;
  letter-spacing: 0.03em;
  padding: 2px 5px;
  border-radius: 2px;
  background: rgba(250, 204, 21, 0.14);
  border: 1px solid rgba(250, 204, 21, 0.52);
  color: #fde047;
  white-space: nowrap;
  flex-shrink: 0;
  text-shadow: 0 1px 0 #000;
}

.endless-bounty-pill.is-claimable .endless-bounty-cta {
  color: #090c14;
  background: linear-gradient(180deg, #fef08a 0%, #f59e0b 100%);
  border-color: #ffffff;
  text-shadow: none;
  box-shadow: 0 0 8px rgba(250, 204, 21, 0.85);
}

.endless-bounty-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: #050712;
  border: 1px solid rgba(212, 175, 55, 0.48);
  border-radius: 2px;
  overflow: hidden;
}

.endless-bounty-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  background: #facc15;
  transition: width 0.12s linear;
}

/* Widget B: Active Shrine / Elixir Buff Timer Strip */
.endless-buff-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  pointer-events: none;
}

.endless-buff-strip.hidden {
  display: none !important;
}

.endless-buff-pill {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  max-width: 100%;
  padding: 3px 6px 6px;
  background: linear-gradient(180deg, rgba(16, 20, 36, 0.94) 0%, rgba(8, 10, 19, 0.97) 100%);
  border: 1.5px solid #facc15;
  outline: 1px solid #000;
  border-radius: 4px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 3px 10px rgba(0, 0, 0, 0.84);
  overflow: hidden;
  pointer-events: auto;
}

.endless-buff-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.endless-buff-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #facc15;
}

.endless-buff-text {
  font-size: 0.31rem;
  letter-spacing: 0.03em;
  color: #fef9c3;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-buff-bar-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(5, 7, 18, 0.92);
}

.endless-buff-bar-fill {
  height: 100%;
  width: 100%;
  background: #facc15;
  transition: width 0.1s linear;
}

/* Widget C: Wandering Merchant Pop-Offer Card */
.endless-merchant-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
  padding: 6px 7px;
  background: linear-gradient(180deg, rgba(24, 16, 44, 0.96) 0%, rgba(9, 10, 22, 0.98) 100%);
  border: 1.5px solid #c084fc;
  border-left: 3px solid #facc15;
  outline: 1px solid #000;
  border-radius: 5px;
  box-shadow:
    inset 0 1px 0 rgba(233, 213, 255, 0.24),
    0 0 14px rgba(168, 85, 247, 0.36),
    0 6px 16px rgba(0, 0, 0, 0.9);
  pointer-events: auto;
}

.endless-merchant-card.hidden {
  display: none !important;
}

.endless-merchant-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
}

.endless-merchant-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
}

.endless-merchant-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.endless-merchant-title {
  font-size: 0.34rem;
  letter-spacing: 0.03em;
  color: #fde047;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-merchant-head-right {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.endless-merchant-timer {
  font-size: 0.29rem;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(168, 85, 247, 0.24);
  border: 1px solid rgba(192, 132, 252, 0.68);
  color: #e9d5ff;
  white-space: nowrap;
}

.endless-merchant-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  color: #fde047;
  background: rgba(15, 19, 32, 0.95);
  border: 1px solid rgba(212, 175, 55, 0.62);
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
}

.endless-merchant-close:hover {
  background: rgba(127, 29, 29, 0.88);
  border-color: #f87171;
  color: #ffffff;
}

.endless-merchant-sub {
  font-size: 0.29rem;
  line-height: 1.25;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000;
}

.endless-merchant-track {
  position: relative;
  width: 100%;
  height: 3px;
  background: #050712;
  border: 1px solid rgba(192, 132, 252, 0.45);
  border-radius: 2px;
  overflow: hidden;
}

.endless-merchant-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 100%;
  background: linear-gradient(90deg, #a855f7 0%, #facc15 100%);
  transition: width 0.1s linear;
}

.endless-merchant-buy-btn {
  width: 100%;
  padding: 5px 6px;
  font-family: inherit;
  font-size: 0.34rem;
  letter-spacing: 0.04em;
  color: #090c14;
  background: linear-gradient(180deg, #fef08a 0%, #eab308 100%);
  border: 1.5px solid #ffffff;
  outline: 1px solid #000;
  border-radius: 3px;
  cursor: pointer;
  text-shadow: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 0 10px rgba(250, 204, 21, 0.42);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: filter 0.12s ease, transform 0.08s ease;
}

.endless-merchant-buy-btn:hover:not(:disabled) {
  filter: brightness(1.08);
}

.endless-merchant-buy-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.endless-merchant-buy-btn:disabled {
  color: #64748b;
  background: linear-gradient(180deg, rgba(22, 28, 45, 0.92) 0%, rgba(12, 15, 26, 0.95) 100%);
  border-color: #334155;
  box-shadow: none;
  cursor: not-allowed;
}

/* Wave 8 Responsive Ergonomics: Mobile Landscape (844x390) */`,
buildLandscapeCss(`  #endless-hud-root .endless-events-dock {
    top: max(80px, calc(env(safe-area-inset-top) + 76px));
    right: max(10px, env(safe-area-inset-right));
    left: auto;
    width: 180px;
    gap: 2px;
  }

  #endless-hud-root .endless-events-dock.has-merchant {
    top: max(104px, calc(env(safe-area-inset-top) + 100px));
    right: max(204px, calc(env(safe-area-inset-right) + 196px));
    width: 174px;
  }

  #endless-hud-root.is-trial-active .endless-events-dock.has-merchant {
    top: max(112px, calc(env(safe-area-inset-top) + 108px));
  }

  #endless-hud-root.is-drawer-open .endless-events-dock {
    display: none !important;
  }

  #endless-hud-root.is-drawer-open.has-event-alert #endless-shop-toggle .endless-event-alert-dot {
    display: inline-block;
  }

  .endless-bounty-pill {
    padding: 2px 5px;
    gap: 2px;
  }

  .endless-bounty-label {
    font-size: 0.29rem;
  }

  .endless-bounty-cta {
    font-size: 0.26rem;
    padding: 1px 4px;
  }

  .endless-bounty-track {
    height: 3px;
  }

  .endless-buff-strip {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow: hidden;
    gap: 2px;
  }

  .endless-buff-pill {
    min-width: 0;
    padding: 2px 3px 4px;
  }

  .endless-buff-text {
    font-size: 0.24rem;
  }

  .endless-merchant-card {
    padding: 3px 5px;
    gap: 2px;
  }

  .endless-merchant-title {
    font-size: 0.28rem;
  }

  .endless-merchant-timer {
    font-size: 0.24rem;
    padding: 1px 3px;
  }

  .endless-merchant-close {
    width: 15px;
    height: 15px;
  }

  .endless-merchant-sub {
    font-size: 0.24rem;
  }

  .endless-merchant-buy-btn {
    padding: 3px 5px;
    font-size: 0.28rem;
  }`),
`
/* Wave 8 Responsive Ergonomics: Mobile Portrait (390x844) */
@media (max-width: 560px) {
  html:not(.is-mobile-landscape) #endless-hud-root .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-events-dock {
    display: flex;
    top: max(144px, calc(env(safe-area-inset-top) + 140px));
    left: max(8px, env(safe-area-inset-left));
    right: auto;
    width: 214px;
    max-width: calc(100vw - 154px);
    gap: 3px;
  }

  html:not(.is-mobile-landscape) #app.is-endless-boss-hud-visible #endless-hud-root:not(.has-active-party):not(.is-trial-active) .endless-events-dock,
  html:not(.is-mobile-landscape) #app.is-endless-boss-hud-visible #endless-hud-root:not(.has-active-party):not(.is-trial-active).is-drawer-open .endless-events-dock {
    top: calc(max(176px, calc(env(safe-area-inset-top) + 172px)) + var(--endless-boss-hud-h, 58px));
    width: min(374px, calc(100vw - 16px));
    max-width: calc(100vw - 16px);
  }

  html:not(.is-mobile-landscape) #app.is-endless-boss-hud-visible #endless-hud-root.is-trial-active:not(.has-active-party) .endless-events-dock,
  html:not(.is-mobile-landscape) #app.is-endless-boss-hud-visible #endless-hud-root.is-trial-active:not(.has-active-party).is-drawer-open .endless-events-dock {
    top: calc(max(195px, calc(env(safe-area-inset-top) + 191px)) + var(--endless-boss-hud-h, 58px));
    width: min(374px, calc(100vw - 16px));
    max-width: calc(100vw - 16px);
  }

  html:not(.is-mobile-landscape) #endless-hud-root .endless-events-dock.hidden,
  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-events-dock.hidden {
    display: none !important;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.has-active-party .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.has-active-party.is-drawer-open .endless-events-dock {
    top: calc(max(242px, calc(env(safe-area-inset-top) + 238px)) + var(--endless-boss-hud-h, 0px));
    width: min(374px, calc(100vw - 16px));
    max-width: calc(100vw - 16px);
  }

  html:not(.is-mobile-landscape) #endless-hud-root.has-active-party.has-active-synergies .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.has-active-party.has-active-synergies.is-drawer-open .endless-events-dock {
    top: calc(max(258px, calc(env(safe-area-inset-top) + 254px)) + var(--endless-boss-hud-h, 0px));
  }

  /* Auto-compact Events Dock while Bottom Drawer is open on Portrait so bottom stays <= 392px */
  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-events-dock {
    gap: 2px;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-bounty-pill {
    padding: 2px 5px;
    gap: 2px;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-bounty-track {
    height: 2px;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-buff-strip {
    flex-wrap: nowrap;
    overflow: hidden;
    gap: 3px;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-buff-pill {
    flex: 0 1 auto;
    min-width: 0;
    padding: 1px 4px 4px;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-buff-text {
    font-size: 0.25rem;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-merchant-card {
    padding: 3px 5px;
    gap: 2px;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-merchant-sub,
  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-merchant-desc {
    display: none;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-merchant-track {
    height: 2px;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-merchant-buy-btn {
    padding: 3px 5px;
    font-size: 0.28rem;
  }

  html:not(.is-mobile-landscape) .endless-bounty-pill {
    padding: 4px 6px;
    gap: 3px;
  }

  html:not(.is-mobile-landscape) .endless-bounty-label {
    font-size: 0.32rem;
  }

  html:not(.is-mobile-landscape) .endless-bounty-cta {
    font-size: 0.29rem;
    padding: 1px 4px;
  }

  html:not(.is-mobile-landscape) .endless-buff-strip {
    gap: 3px;
  }

  html:not(.is-mobile-landscape) .endless-buff-pill {
    padding: 2px 5px 5px;
  }

  html:not(.is-mobile-landscape) .endless-buff-text {
    font-size: 0.28rem;
  }

  html:not(.is-mobile-landscape) .endless-merchant-card {
    padding: 5px 6px;
    gap: 3px;
  }

  html:not(.is-mobile-landscape) .endless-merchant-title {
    font-size: 0.31rem;
  }

  html:not(.is-mobile-landscape) .endless-merchant-timer {
    font-size: 0.27rem;
    padding: 1px 3px;
  }

  html:not(.is-mobile-landscape) .endless-merchant-close {
    width: 17px;
    height: 17px;
  }

  html:not(.is-mobile-landscape) .endless-merchant-sub {
    font-size: 0.27rem;
  }

  html:not(.is-mobile-landscape) .endless-merchant-buy-btn {
    padding: 4px 5px;
    font-size: 0.31rem;
  }
}

/* =========================================================================
   WAVE 9: COMPANION EVOLUTION, SQUAD FORMATIONS & OVERDRIVE
   ========================================================================= */
.endless-formation-bar {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 4px;
  border-top: 1px solid rgba(212, 175, 55, 0.24);
}

.endless-formation-btns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}

.endless-formation-btn {
  padding: 4px 4px;
  font-family: inherit;
  font-size: 0.33rem;
  letter-spacing: 0.03em;
  color: #94a3b8;
  background: linear-gradient(180deg, rgba(14, 19, 34, 0.95) 0%, rgba(7, 10, 19, 0.98) 100%);
  border: 1px solid rgba(100, 116, 139, 0.55);
  outline: 1px solid #000;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000;
  transition: border-color 0.14s ease, color 0.14s ease, box-shadow 0.14s ease, transform 0.08s ease;
}

.endless-formation-btn:hover:not(.is-active) {
  color: #e2e8f0;
  border-color: rgba(212, 175, 55, 0.65);
}

.endless-formation-btn:active {
  transform: translateY(1px);
}

.endless-formation-btn.is-active {
  color: #ffffff;
  background: linear-gradient(180deg, rgba(32, 26, 16, 0.96) 0%, rgba(12, 14, 26, 0.98) 100%);
  border-width: 1.5px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 0 8px rgba(250, 204, 21, 0.32);
}

.endless-formation-desc {
  font-size: 0.29rem;
  color: #cbd5e1;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 1px 2px 0;
  text-shadow: 0 1px 0 #000;
}

.endless-comp-card.is-ex-evolved {
  border-color: #38bdf8;
  box-shadow:
    inset 0 0 14px rgba(56, 189, 248, 0.18),
    0 0 8px rgba(56, 189, 248, 0.2);
}

.endless-comp-card.is-deployed.is-ex-evolved {
  border-color: #34d399;
  box-shadow:
    inset 0 0 14px rgba(52, 211, 153, 0.22),
    0 0 10px rgba(56, 189, 248, 0.28);
}

.endless-comp-card.is-stage-locked {
  opacity: 0.84;
  border-color: rgba(71, 85, 105, 0.55);
}

.endless-comp-evo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.endless-comp-stars {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  line-height: 1;
}

.endless-comp-star {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 8px;
  height: 8px;
}

.endless-comp-badges {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.endless-comp-ex-badge {
  font-size: 0.29rem;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: 2px;
  border: 1px solid rgba(100, 116, 139, 0.55);
  background: rgba(15, 23, 42, 0.9);
  color: #94a3b8;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.15;
  text-shadow: 0 1px 0 #000;
}

.endless-comp-ex-badge.is-evolved {
  color: #fef08a;
  background: linear-gradient(180deg, rgba(14, 116, 144, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
  border-color: #38bdf8;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.36),
    0 0 8px rgba(56, 189, 248, 0.62);
  animation: endlessExBadgeGlow 1.8s ease-in-out infinite;
}

.endless-comp-aura-badge {
  font-size: 0.27rem;
  letter-spacing: 0.03em;
  padding: 1px 4px;
  border-radius: 2px;
  border: 1px solid #38bdf8;
  background: rgba(14, 34, 58, 0.95);
  color: #7dd3fc;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.15;
  text-shadow: 0 1px 0 #000;
}

.endless-comp-aura-badge.hidden {
  display: none !important;
}

.endless-comp-aura-badge.is-tier-3 {
  border-color: #38bdf8;
  color: #bae6fd;
  background: linear-gradient(180deg, rgba(12, 74, 110, 0.94) 0%, rgba(12, 20, 38, 0.98) 100%);
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.45);
}

.endless-comp-aura-badge.is-tier-4 {
  border-color: #c084fc;
  color: #f3e8ff;
  background: linear-gradient(180deg, rgba(88, 28, 135, 0.94) 0%, rgba(22, 12, 42, 0.98) 100%);
  box-shadow: 0 0 7px rgba(192, 132, 252, 0.55);
}

.endless-comp-aura-badge.is-tier-5 {
  border-color: #facc15;
  color: #fffbeb;
  background: linear-gradient(180deg, rgba(159, 18, 57, 0.96) 0%, rgba(66, 32, 6, 0.98) 100%);
  box-shadow: 0 0 9px rgba(250, 204, 21, 0.68);
}

.endless-comp-card.is-aura-4 {
  border-color: #c084fc;
  box-shadow:
    inset 0 0 14px rgba(192, 132, 252, 0.2),
    0 0 9px rgba(192, 132, 252, 0.25);
}

.endless-comp-card.is-aura-5 {
  border-color: #facc15;
  box-shadow:
    inset 0 0 16px rgba(244, 63, 94, 0.24),
    0 0 11px rgba(250, 204, 21, 0.34);
}

@keyframes endlessExBadgeGlow {
  0%, 100% {
    border-color: #38bdf8;
    box-shadow:
      inset 0 1px 0 rgba(254, 240, 138, 0.32),
      0 0 6px rgba(56, 189, 248, 0.5);
  }
  50% {
    border-color: #fde047;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.5),
      0 0 11px rgba(250, 204, 21, 0.72);
  }
}

.endless-comp-actions {
  flex-wrap: wrap;
  gap: 4px;
}

.endless-comp-btn.is-stage-locked {
  color: #94a3b8;
  background: linear-gradient(180deg, rgba(24, 29, 46, 0.95) 0%, rgba(11, 14, 25, 0.98) 100%);
  border-color: #475569;
  letter-spacing: 0.03em;
}

.endless-comp-promote-btn {
  flex: 1 0 100%;
  padding: 4px 6px;
  font-size: 0.35rem;
  color: #e0f2fe;
  background: linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%);
  border-color: #38bdf8;
}

.endless-comp-promote-btn.is-ex-ready {
  color: #fffbeb;
  background: linear-gradient(180deg, #0369a1 0%, #713f12 100%);
  border-color: #fde047;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.45),
    0 0 10px rgba(56, 189, 248, 0.55);
}

.endless-comp-promote-btn.is-max-star,
.endless-comp-promote-btn.is-max-star:disabled {
  color: #fde047;
  background: linear-gradient(180deg, rgba(52, 39, 14, 0.92) 0%, rgba(20, 16, 9, 0.96) 100%);
  border-color: rgba(212, 175, 55, 0.72);
  opacity: 0.92;
  cursor: default;
}

.endless-comp-promote-btn.hidden {
  display: none !important;
}

/* Active Companion Mini-HUD Star/EX Corner Badge & Overdrive Meter */
.endless-party-card.is-ex-evolved {
  border-color: #38bdf8;
  box-shadow:
    inset 0 1px 0 rgba(125, 211, 252, 0.28),
    0 0 8px rgba(56, 189, 248, 0.28),
    0 4px 12px rgba(0, 0, 0, 0.85);
}

.endless-party-star {
  position: absolute;
  right: 0;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 1px 2px;
  font-size: 0.24rem;
  line-height: 1;
  letter-spacing: 0.01em;
  color: #fef08a;
  background: rgba(7, 9, 18, 0.92);
  border-top: 1px solid #d4af37;
  border-left: 1px solid #d4af37;
  border-top-left-radius: 2px;
  text-shadow: 0 1px 0 #000;
  pointer-events: none;
}

.endless-party-star.is-ex,
.endless-party-star.is-aura-3 {
  color: #7dd3fc;
  border-color: #38bdf8;
  background: rgba(8, 24, 42, 0.94);
}

.endless-party-star.is-aura-4 {
  color: #e9d5ff;
  border-color: #c084fc;
  background: rgba(34, 14, 58, 0.95);
}

.endless-party-star.is-aura-5 {
  color: #fef08a;
  border-color: #f43f5e;
  background: rgba(68, 12, 26, 0.96);
}

.endless-party-syn-chip {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 5px;
  font-family: inherit;
  font-size: 0.28rem;
  letter-spacing: 0.02em;
  color: #fef08a;
  background: linear-gradient(180deg, rgba(16, 22, 40, 0.95) 0%, rgba(8, 10, 20, 0.98) 100%);
  border: 1.5px solid #d4af37;
  outline: 1px solid #000;
  border-radius: 3px;
  cursor: pointer;
  pointer-events: auto;
  white-space: nowrap;
  flex-shrink: 0;
  text-shadow: 0 1px 0 #000;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.82);
}

.endless-party-syn-chip.hidden {
  display: none !important;
}

.endless-party-syn-chip-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #facc15;
}

.endless-party-star.hidden {
  display: none !important;
}

.endless-party-star-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 6px;
  height: 6px;
}

.endless-party-star-ico svg {
  width: 6px;
  height: 6px;
}

.endless-overdrive-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 23px;
  padding: 4px 7px;
  font-family: inherit;
  color: #fef08a;
  background: linear-gradient(180deg, rgba(16, 13, 28, 0.95) 0%, rgba(8, 9, 18, 0.98) 100%);
  border: 1.5px solid rgba(244, 63, 94, 0.68);
  outline: 1px solid #000;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.2),
    0 4px 12px rgba(0, 0, 0, 0.85);
  transition: border-color 0.14s ease, box-shadow 0.14s ease, transform 0.08s ease;
}

.endless-overdrive-btn.hidden {
  display: none !important;
}

.endless-overdrive-btn:disabled {
  cursor: default;
}

.endless-overdrive-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.endless-overdrive-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  background: linear-gradient(90deg, rgba(159, 18, 57, 0.88) 0%, rgba(225, 29, 72, 0.88) 55%, rgba(245, 158, 11, 0.92) 100%);
  transition: width 0.12s linear;
  pointer-events: none;
}

.endless-overdrive-content {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  max-width: 100%;
  min-width: 0;
}

.endless-overdrive-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.endless-overdrive-label {
  font-size: 0.34rem;
  letter-spacing: 0.03em;
  color: #fffbeb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000;
}

.endless-overdrive-label-short {
  display: none;
  font-size: 0.29rem;
  letter-spacing: 0.02em;
  color: #fffbeb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000;
}

.endless-overdrive-btn.is-ready {
  border-color: #fde047;
  cursor: pointer;
  animation: endlessOverdrivePulse 1.05s ease-in-out infinite;
}

.endless-overdrive-btn.is-ready .endless-overdrive-fill {
  width: 100% !important;
  background: linear-gradient(90deg, #be123c 0%, #f43f5e 45%, #facc15 100%);
}

.endless-overdrive-btn.is-active {
  border-color: #fef08a;
  box-shadow:
    inset 0 0 12px rgba(254, 240, 138, 0.6),
    0 0 16px rgba(250, 204, 21, 0.9);
}

.endless-overdrive-btn.is-active .endless-overdrive-fill {
  background: linear-gradient(90deg, #9a3412 0%, #d97706 52%, #eab308 100%);
}

.endless-overdrive-btn.is-active .endless-overdrive-label,
.endless-overdrive-btn.is-active .endless-overdrive-label-short {
  color: #ffffff;
  background: rgba(5, 8, 18, 0.64);
  padding: 1px 6px;
  border-radius: 2px;
  text-shadow:
    -1px 0 0 #000000,
    1px 0 0 #000000,
    0 -1px 0 #000000,
    0 1px 0 #000000,
    0 1px 2px rgba(0, 0, 0, 0.95);
}

@keyframes endlessOverdrivePulse {
  0%, 100% {
    border-color: #f43f5e;
    box-shadow:
      inset 0 1px 0 rgba(254, 240, 138, 0.35),
      0 0 10px rgba(244, 63, 94, 0.65);
  }
  50% {
    border-color: #fef08a;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 0 18px rgba(250, 204, 21, 0.95);
  }
}

/* Wave 9 Responsive Ergonomics: Mobile Landscape (844x390) */`,
buildLandscapeCss(`  .endless-party-bar {
    padding: 3px 5px;
    gap: 2px;
  }

  .endless-party-counter {
    font-size: 0.34rem;
  }

  .endless-party-hint {
    display: none;
  }

  .endless-formation-bar {
    flex-direction: row;
    align-items: center;
    padding-top: 2px;
    gap: 4px;
  }

  .endless-formation-btns {
    flex: 0 0 auto;
    display: inline-flex;
    gap: 3px;
  }

  .endless-formation-btn {
    padding: 2px 5px;
    font-size: 0.27rem;
  }

  .endless-formation-desc {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.23rem;
    padding: 0;
  }

  .endless-party-synergies-box {
    flex-direction: row;
    align-items: center;
    gap: 4px;
    padding-top: 2px;
  }

  .endless-party-syn-head {
    flex-shrink: 0;
    gap: 3px;
  }

  .endless-party-syn-title {
    font-size: 0.27rem;
  }

  .endless-party-syn-count {
    font-size: 0.25rem;
    padding: 0 3px;
  }

  .endless-party-syn-list {
    flex: 1 1 auto;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    max-height: 18px;
    gap: 3px;
    scrollbar-width: none;
  }

  .endless-party-syn-pill {
    flex-shrink: 0;
    padding: 1px 4px;
  }

  .endless-party-syn-desc {
    display: none;
  }

  .endless-party-syn-empty {
    font-size: 0.23rem;
    white-space: nowrap;
  }

  .endless-comp-card {
    grid-template-columns: 34px minmax(0, 1fr);
    padding: 4px 5px;
    gap: 5px;
  }

  .endless-comp-portrait-wrap {
    width: 34px;
    height: 34px;
  }

  .endless-comp-portrait {
    width: 30px;
    height: 30px;
  }

  .endless-comp-body {
    gap: 2px;
  }

  .endless-comp-name {
    font-size: 0.34rem;
  }

  .endless-comp-role {
    font-size: 0.26rem;
    padding: 0 3px;
  }

  .endless-comp-meta {
    font-size: 0.28rem;
  }

  .endless-comp-desc {
    font-size: 0.25rem;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .endless-comp-actions {
    flex-wrap: nowrap;
    gap: 3px;
    margin-top: 1px;
  }

  .endless-comp-btn {
    padding: 3px 4px;
    font-size: 0.28rem;
  }

  .endless-comp-deploy-btn {
    min-width: 48px;
  }

  .endless-comp-promote-btn {
    flex: 1 1 auto;
    padding: 3px 4px;
    font-size: 0.27rem;
  }

  .endless-party-star {
    font-size: 0.22rem;
    padding: 0 2px;
  }

  .endless-party-star-ico {
    display: none;
  }

  .endless-overdrive-btn {
    width: 92px;
    max-width: 94px;
    align-self: flex-start;
    min-height: 18px;
    padding: 2px 4px;
  }

  .endless-overdrive-content {
    gap: 2px;
  }

  .endless-overdrive-icon svg {
    width: 8px;
    height: 8px;
  }

  .endless-overdrive-label {
    font-size: 0.24rem;
    letter-spacing: 0.01em;
  }`),
`
/* Wave 9 Responsive Ergonomics: Mobile Portrait (390x844) */
@media (max-width: 560px) {
  html:not(.is-mobile-landscape) .endless-party-star {
    font-size: 0.22rem;
    padding: 0 2px;
  }

  html:not(.is-mobile-landscape) .endless-party-star-ico {
    display: none;
  }

  html:not(.is-mobile-landscape) .endless-overdrive-btn {
    width: 214px;
    max-width: 100%;
    align-self: flex-start;
    min-height: 19px;
    padding: 2px 6px;
  }

  html:not(.is-mobile-landscape) .endless-overdrive-label {
    font-size: 0.29rem;
  }
}

/* =========================================================================
   WAVE 10: CHALLENGE TRIALS TAB, LIVE COUNTDOWN HUD, REWARD MODAL & 6-TAB POLISH
   ========================================================================= */
#endless-hud-root.is-trial-active .endless-boss-controls {
  display: none !important;
}

#endless-hud-root.is-trial-active.is-drawer-open .endless-events-dock {
  top: max(158px, calc(env(safe-area-inset-top) + 154px));
}

/* Active Trial Live Countdown HUD Strip (centered directly under .endless-top-bar) */
.endless-trial-hud {
  display: flex;
  flex-direction: column;
  width: min(444px, 100%);
  max-width: 100%;
  background: linear-gradient(180deg, rgba(20, 14, 34, 0.96) 0%, rgba(8, 10, 20, 0.98) 100%);
  border: 1.5px solid #facc15;
  outline: 1px solid #000;
  border-radius: 5px;
  overflow: hidden;
  pointer-events: auto;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.28),
    0 0 14px rgba(250, 204, 21, 0.28),
    0 5px 14px rgba(0, 0, 0, 0.88);
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}

.endless-trial-hud.hidden {
  display: none !important;
}

.endless-trial-hud.is-urgent {
  border-color: #f43f5e;
  box-shadow:
    inset 0 1px 0 rgba(254, 202, 202, 0.36),
    0 0 16px rgba(244, 63, 94, 0.68),
    0 5px 14px rgba(0, 0, 0, 0.9);
  animation: endlessTrialUrgentPulse 0.72s ease-in-out infinite;
}

@keyframes endlessTrialUrgentPulse {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.16);
  }
}

.endless-trial-hud-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 7px;
  min-width: 0;
}

.endless-trial-hud-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: #070912;
  border: 1px solid rgba(250, 204, 21, 0.68);
  border-radius: 3px;
  flex-shrink: 0;
}

.endless-trial-hud-meta {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.endless-trial-hud-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.endless-trial-hud-name {
  font-size: 0.38rem;
  color: #fef08a;
  letter-spacing: 0.03em;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.endless-trial-hud-timer {
  font-size: 0.40rem;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(250, 204, 21, 0.72);
  border-radius: 3px;
  padding: 1px 5px;
  white-space: nowrap;
  flex-shrink: 0;
  text-shadow: 0 1px 0 #000;
}

.endless-trial-hud.is-urgent .endless-trial-hud-timer {
  color: #fff1f2;
  background: rgba(159, 18, 57, 0.9);
  border-color: #fda4af;
}

.endless-trial-hud-score {
  font-size: 0.33rem;
  color: #e2e8f0;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000;
}

.endless-trial-exit-btn {
  padding: 4px 8px;
  font-family: inherit;
  font-size: 0.34rem;
  letter-spacing: 0.04em;
  color: #fecaca;
  background: linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%);
  border: 1.5px solid #f87171;
  outline: 1px solid #000;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  text-shadow: 0 1px 0 #000;
  transition: filter 0.12s ease, transform 0.08s ease;
}

.endless-trial-exit-btn:hover {
  filter: brightness(1.14);
  color: #ffffff;
}

.endless-trial-exit-btn:active {
  transform: translateY(1px);
}

.endless-trial-hud-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: #050712;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.endless-trial-hud-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 100%;
  background: #facc15;
  transition: width 0.09s linear;
}

/* TRIALS Tab Panel */
.endless-trials-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 8px;
  background: linear-gradient(180deg, rgba(28, 15, 34, 0.96) 0%, rgba(9, 11, 21, 0.98) 100%);
  border-bottom: 1.5px solid rgba(212, 175, 55, 0.42);
  flex-shrink: 0;
}

.endless-trials-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.endless-trials-title {
  font-size: 0.44rem;
  color: #fde047;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-trials-cleared {
  font-size: 0.33rem;
  color: #e9d5ff;
  background: rgba(88, 28, 135, 0.56);
  border: 1px solid rgba(192, 132, 252, 0.65);
  border-radius: 3px;
  padding: 2px 5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.endless-trials-sub {
  font-size: 0.29rem;
  color: #94a3b8;
  letter-spacing: 0.02em;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-trials-list {
  gap: 7px;
}

.endless-trial-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px 8px;
  background: linear-gradient(180deg, rgba(16, 20, 36, 0.96) 0%, rgba(8, 10, 20, 0.98) 100%);
  border: 1.5px solid rgba(100, 116, 139, 0.55);
  border-left: 3px solid #facc15;
  outline: 1px solid #000;
  border-radius: 4px;
  min-width: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}

.endless-trial-card.is-ready {
  border-color: rgba(212, 175, 55, 0.72);
}

.endless-trial-card.is-running {
  border-color: #fef08a;
  box-shadow:
    inset 0 0 14px rgba(250, 204, 21, 0.22),
    0 0 10px rgba(250, 204, 21, 0.34);
}

.endless-trial-card.is-cooldown {
  opacity: 0.86;
}

.endless-trial-card-top {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.endless-trial-icon-wrap {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #070912;
  border: 1.5px solid #d4af37;
  border-radius: 4px;
  flex-shrink: 0;
}

.endless-trial-icon-wrap svg {
  width: 22px;
  height: 22px;
}

.endless-trial-title-block {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.endless-trial-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  min-width: 0;
}

.endless-trial-name {
  font-size: 0.39rem;
  color: #f8fafc;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 0 #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.endless-trial-dur-pill {
  font-size: 0.31rem;
  padding: 1px 5px;
  border-radius: 2px;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(212, 175, 55, 0.65);
  color: #fef08a;
  white-space: nowrap;
  flex-shrink: 0;
}

.endless-trial-reward-pill {
  align-self: flex-start;
  max-width: 100%;
  font-size: 0.29rem;
  letter-spacing: 0.02em;
  padding: 2px 5px;
  border-radius: 2px;
  background: rgba(8, 11, 22, 0.94);
  border: 1px solid #facc15;
  color: #fef08a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-trial-desc {
  font-size: 0.30rem;
  color: #cbd5e1;
  line-height: 1.38;
  word-break: break-word;
}

.endless-trial-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid rgba(71, 85, 105, 0.34);
  min-width: 0;
}

.endless-trial-best {
  font-size: 0.31rem;
  color: #93c5fd;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.endless-trial-enter-btn {
  padding: 6px 10px;
  font-family: inherit;
  font-size: 0.35rem;
  letter-spacing: 0.03em;
  color: #fffbeb;
  background: linear-gradient(180deg, #92400e 0%, #451a03 100%);
  border: 1.5px solid #facc15;
  outline: 1px solid #000;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  text-shadow: 0 1px 0 #000;
  box-shadow: inset 0 1px 0 rgba(254, 240, 138, 0.35);
  transition: filter 0.12s ease, transform 0.08s ease;
}

.endless-trial-enter-btn:hover:not(:disabled) {
  filter: brightness(1.12);
}

.endless-trial-enter-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.endless-trial-enter-btn:disabled {
  color: #64748b;
  background: linear-gradient(180deg, #161b2a 0%, #0d101b 100%);
  border-color: #334155;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.85;
}

.endless-trial-enter-btn.is-active-trial,
.endless-trial-enter-btn.is-active-trial:disabled {
  color: #fef08a;
  background: linear-gradient(180deg, rgba(127, 29, 29, 0.92) 0%, rgba(56, 12, 20, 0.96) 100%);
  border-color: #fb7185;
  opacity: 1;
}

/* Trial Reward Summary Modal (z-index: 49, matching Offline Loot Modal gothic style) */
.endless-trial-modal {
  position: absolute;
  inset: 0;
  z-index: 49;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(4, 6, 14, 0.80);
  pointer-events: auto;
  overflow: hidden;
}

.endless-trial-modal.hidden {
  display: none !important;
}

.endless-trial-modal-card {
  width: min(464px, calc(100% - 8px));
  max-height: calc(100% - 10px);
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 14px 15px;
  background: linear-gradient(180deg, rgba(18, 22, 42, 0.98) 0%, rgba(8, 10, 20, 0.99) 100%);
  border: 2px solid #d4af37;
  outline: 2px solid #000;
  border-radius: 6px;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.36),
    inset 0 0 24px rgba(212, 175, 55, 0.16),
    0 14px 40px rgba(0, 0, 0, 0.96);
  animation: endlessModalPop 0.22s ease-out;
}

.endless-trial-modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 1.5px solid rgba(212, 175, 55, 0.45);
}

.endless-trial-modal-status {
  padding: 2px 8px;
  font-size: 0.35rem;
  letter-spacing: 0.06em;
  color: #090c14;
  background: linear-gradient(180deg, #fef08a 0%, #eab308 100%);
  border: 1px solid #ffffff;
  outline: 1px solid #000;
  border-radius: 3px;
}

.endless-trial-modal-status.is-exited {
  color: #e2e8f0;
  background: linear-gradient(180deg, #334155 0%, #1e293b 100%);
  border-color: #94a3b8;
}

.endless-trial-modal-title-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  max-width: 100%;
}

.endless-trial-modal-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.endless-trial-modal-icon svg {
  width: 20px;
  height: 20px;
}

.endless-trial-modal-title {
  font-size: 0.56rem;
  color: #fef08a;
  letter-spacing: 0.04em;
  text-shadow: 0 2px 0 #000;
  line-height: 1.3;
}

.endless-trial-modal-perf {
  padding: 3px 8px;
  font-size: 0.35rem;
  color: #bae6fd;
  background: rgba(12, 18, 34, 0.94);
  border: 1px solid rgba(56, 189, 248, 0.55);
  border-radius: 3px;
  letter-spacing: 0.03em;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.endless-trial-modal-rewards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.endless-trial-reward-plaque {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
  padding: 8px 6px;
  background: linear-gradient(180deg, rgba(14, 18, 34, 0.96) 0%, rgba(7, 9, 18, 0.98) 100%);
  border: 1.5px solid #d4af37;
  outline: 1px solid #000;
  border-radius: 4px;
  min-width: 0;
}

.endless-trial-reward-plaque.is-gold {
  border-color: #facc15;
  background: linear-gradient(180deg, rgba(44, 32, 10, 0.92) 0%, rgba(15, 11, 5, 0.98) 100%);
}

.endless-trial-reward-plaque.is-shard {
  border-color: #c084fc;
  background: linear-gradient(180deg, rgba(35, 18, 66, 0.92) 0%, rgba(12, 10, 26, 0.98) 100%);
}

.endless-trial-reward-plaque.is-dust {
  border-color: #38bdf8;
  background: linear-gradient(180deg, rgba(12, 36, 56, 0.92) 0%, rgba(7, 13, 24, 0.98) 100%);
}

.endless-trial-reward-plaque.is-empty {
  opacity: 0.48;
  border-color: #334155;
}

.endless-trial-reward-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.endless-trial-reward-ico canvas {
  width: 24px;
  height: 24px;
}

.endless-trial-reward-ico svg {
  width: 18px;
  height: 18px;
}

.endless-trial-reward-val {
  font-size: 0.42rem;
  color: #fef08a;
  text-shadow: 0 1px 0 #000;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-trial-reward-plaque.is-shard .endless-trial-reward-val {
  color: #e9d5ff;
}

.endless-trial-reward-plaque.is-dust .endless-trial-reward-val {
  color: #7dd3fc;
}

.endless-trial-reward-lbl {
  font-size: 0.27rem;
  color: #94a3b8;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.endless-trial-modal-gear {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px 8px;
  background: rgba(9, 12, 24, 0.94);
  border: 1px solid rgba(192, 132, 252, 0.45);
  border-radius: 4px;
}

.endless-trial-modal-gear.hidden {
  display: none !important;
}

.endless-trial-modal-gear-head {
  font-size: 0.32rem;
  color: #e9d5ff;
  letter-spacing: 0.04em;
  text-align: center;
}

.endless-trial-modal-gear-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 5px;
}

.endless-trial-gear-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 4px 7px;
  background: rgba(14, 18, 34, 0.96);
  border: 1.5px solid #c084fc;
  border-radius: 3px;
  min-width: 0;
  text-shadow: 0 1px 0 #000;
}

.endless-trial-gear-pill-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.endless-trial-gear-pill-rarity {
  font-size: 0.28rem;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

.endless-trial-gear-pill-name {
  font-size: 0.31rem;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.endless-trial-collect-btn {
  width: 100%;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.46rem;
  letter-spacing: 0.05em;
  color: #fffbeb;
  background: linear-gradient(180deg, #b45309 0%, #78350f 65%, #451a03 100%);
  border: 2px solid #facc15;
  outline: 1px solid #000;
  border-radius: 4px;
  cursor: pointer;
  text-shadow: 0 1px 0 #000;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.55),
    0 0 14px rgba(250, 204, 21, 0.48);
  transition: transform 0.08s ease, border-color 0.14s ease, box-shadow 0.14s ease;
}

.endless-trial-collect-btn:hover {
  border-color: #fef08a;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.72),
    0 0 18px rgba(250, 204, 21, 0.76);
}

.endless-trial-collect-btn:active {
  transform: translateY(1px);
}

/* Wave 10 Responsive Ergonomics: Mobile Landscape (844x390, 332px drawer) */`,
buildLandscapeCss(`  .endless-tab-bar {
    padding: 3px 3px;
    gap: 2px;
  }

  .endless-tab-btn {
    font-size: 0.27rem;
    letter-spacing: 0;
    padding: 4px 1px;
    min-height: 22px;
  }

  .endless-tab-dot {
    top: 1px;
    right: 1px;
    width: 4px;
    height: 4px;
  }

  #endless-hud-root.is-trial-active .endless-party-hud {
    top: max(112px, calc(env(safe-area-inset-top) + 108px));
  }

  #endless-hud-root.is-trial-active.is-drawer-open .endless-trial-hud {
    align-self: flex-start;
    max-width: calc(100vw - 356px);
  }

  .endless-trial-hud {
    width: min(410px, 100%);
  }

  .endless-trial-hud-row {
    padding: 2px 6px;
    gap: 5px;
  }

  .endless-trial-hud-icon {
    width: 17px;
    height: 17px;
  }

  .endless-trial-hud-icon svg {
    width: 13px;
    height: 13px;
  }

  .endless-trial-hud-meta {
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }

  .endless-trial-hud-head {
    gap: 4px;
    flex-shrink: 1;
  }

  .endless-trial-hud-name {
    font-size: 0.30rem;
    max-width: 156px;
  }

  .endless-trial-hud-timer {
    font-size: 0.31rem;
    padding: 1px 4px;
  }

  .endless-trial-hud-score {
    font-size: 0.28rem;
    flex-shrink: 1;
  }

  .endless-trial-exit-btn {
    padding: 2px 6px;
    font-size: 0.28rem;
  }

  .endless-trial-hud-track {
    height: 3px;
  }

  .endless-trials-header {
    padding: 4px 6px;
    gap: 2px;
  }

  .endless-trials-title {
    font-size: 0.38rem;
  }

  .endless-trials-cleared {
    font-size: 0.28rem;
    padding: 1px 4px;
  }

  .endless-trials-sub {
    font-size: 0.25rem;
  }

  .endless-trials-list {
    gap: 5px;
  }

  .endless-trial-card {
    padding: 5px 6px;
    gap: 4px;
  }

  .endless-trial-icon-wrap {
    width: 28px;
    height: 28px;
  }

  .endless-trial-icon-wrap svg {
    width: 18px;
    height: 18px;
  }

  .endless-trial-name {
    font-size: 0.34rem;
  }

  .endless-trial-dur-pill {
    font-size: 0.27rem;
    padding: 1px 4px;
  }

  .endless-trial-reward-pill {
    font-size: 0.26rem;
    padding: 1px 4px;
  }

  .endless-trial-desc {
    font-size: 0.27rem;
    line-height: 1.3;
  }

  .endless-trial-best {
    font-size: 0.27rem;
  }

  .endless-trial-enter-btn {
    padding: 4px 8px;
    font-size: 0.30rem;
  }

  .endless-trial-modal {
    padding: 6px 10px;
  }

  .endless-trial-modal-card {
    width: min(444px, calc(100% - 8px));
    padding: 8px 10px;
    gap: 6px;
  }

  .endless-trial-modal-header {
    gap: 3px;
    padding-bottom: 5px;
  }

  .endless-trial-modal-status {
    font-size: 0.29rem;
    padding: 1px 6px;
  }

  .endless-trial-modal-title {
    font-size: 0.45rem;
  }

  .endless-trial-modal-perf {
    font-size: 0.29rem;
    padding: 2px 6px;
  }

  .endless-trial-modal-rewards {
    gap: 5px;
  }

  .endless-trial-reward-plaque {
    flex-direction: row;
    text-align: left;
    gap: 6px;
    padding: 5px 7px;
  }

  .endless-trial-reward-ico {
    width: 18px;
    height: 18px;
  }

  .endless-trial-reward-ico canvas {
    width: 18px;
    height: 18px;
  }

  .endless-trial-reward-ico svg {
    width: 14px;
    height: 14px;
  }

  .endless-trial-reward-val {
    font-size: 0.35rem;
  }

  .endless-trial-reward-lbl {
    font-size: 0.24rem;
  }

  .endless-trial-modal-gear {
    padding: 5px 6px;
    gap: 3px;
  }

  .endless-trial-gear-pill {
    padding: 2px 5px;
  }

  .endless-trial-collect-btn {
    padding: 7px 10px;
    font-size: 0.38rem;
  }`),
`
/* Wave 10 Responsive Ergonomics: Mobile Portrait (390x844, 378px drawer) */
@media (max-width: 560px) {
  html:not(.is-mobile-landscape) .endless-tab-bar {
    padding: 4px 4px;
    gap: 2px;
  }

  html:not(.is-mobile-landscape) .endless-tab-btn {
    font-size: 0.31rem;
    letter-spacing: 0.01em;
    padding: 6px 2px;
    min-height: 28px;
  }

  html:not(.is-mobile-landscape) .endless-trial-hud {
    width: 100%;
  }

  html:not(.is-mobile-landscape) .endless-trial-hud-row {
    padding: 4px 6px;
    gap: 5px;
  }

  html:not(.is-mobile-landscape) .endless-trial-hud-name {
    font-size: 0.34rem;
  }

  html:not(.is-mobile-landscape) .endless-trial-hud-timer {
    font-size: 0.35rem;
  }

  html:not(.is-mobile-landscape) .endless-trial-hud-score {
    font-size: 0.30rem;
  }

  html:not(.is-mobile-landscape) .endless-trial-exit-btn {
    padding: 5px 7px;
    font-size: 0.32rem;
    min-height: 24px;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active #endless-shop-toggle {
    top: max(162px, calc(env(safe-area-inset-top) + 158px));
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active .endless-party-hud {
    top: calc(max(195px, calc(env(safe-area-inset-top) + 191px)) + var(--endless-boss-hud-h, 0px));
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active.is-drawer-open .endless-events-dock {
    top: calc(max(164px, calc(env(safe-area-inset-top) + 160px)) + var(--endless-boss-hud-h, 0px));
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active.has-active-party .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active.has-active-party.is-drawer-open .endless-events-dock {
    top: calc(max(260px, calc(env(safe-area-inset-top) + 256px)) + var(--endless-boss-hud-h, 0px));
    width: min(374px, calc(100vw - 16px));
    max-width: calc(100vw - 16px);
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active.has-active-party.has-active-synergies .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active.has-active-party.has-active-synergies.is-drawer-open .endless-events-dock {
    top: calc(max(278px, calc(env(safe-area-inset-top) + 274px)) + var(--endless-boss-hud-h, 0px));
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active.is-drawer-open .endless-shop-shell {
    height: min(50vh, 412px);
  }

  html:not(.is-mobile-landscape) .endless-trial-enter-btn {
    padding: 7px 10px;
    min-height: 28px;
  }

  html:not(.is-mobile-landscape) .endless-trial-modal {
    padding: 10px 8px;
  }

  html:not(.is-mobile-landscape) .endless-trial-modal-card {
    width: min(366px, calc(100% - 4px));
    padding: 12px 10px;
    gap: 8px;
  }

  html:not(.is-mobile-landscape) .endless-trial-modal-title {
    font-size: 0.48rem;
  }

  html:not(.is-mobile-landscape) .endless-trial-modal-rewards {
    gap: 5px;
  }

  html:not(.is-mobile-landscape) .endless-trial-reward-plaque {
    padding: 7px 4px;
  }

  html:not(.is-mobile-landscape) .endless-trial-reward-val {
    font-size: 0.37rem;
  }

  html:not(.is-mobile-landscape) .endless-trial-collect-btn {
    padding: 10px 8px;
    min-height: 36px;
    font-size: 0.42rem;
  }
}

/* Wave 11 Narrow-Desktop Guard (561px..1024px wide, >500px tall) */
@media (max-width: 1024px) and (min-width: 561px) and (min-height: 501px) {
  .endless-top-bar {
    max-width: calc(100% - 296px);
    padding: 3px 6px;
    gap: 3px 5px;
  }

  .endless-stage-badge {
    font-size: 0.42rem;
    padding: 2px 5px;
  }

  .endless-wave-meter {
    min-width: 94px;
    height: 16px;
  }

  .endless-currency-pill {
    font-size: 0.42rem;
    padding: 2px 5px 2px 3px;
  }

  .endless-currency-icon {
    width: 15px;
    height: 15px;
  }

  .endless-fever-meter {
    width: 72px;
    height: 15px;
  }

  .endless-modifier-pill {
    font-size: 0.34rem;
    padding: 2px 5px 2px 3px;
  }

  #endless-hud-root.is-drawer-open .endless-top-stack {
    padding-left: 10px;
    align-items: flex-start;
  }

  #endless-hud-root.is-drawer-open .endless-top-bar {
    max-width: calc(100% - 376px);
  }

  #endless-hud-root.is-drawer-open .endless-trial-hud {
    max-width: calc(100vw - 384px);
  }

  #endless-hud-root.is-drawer-open .endless-events-dock {
    top: max(158px, calc(env(safe-area-inset-top) + 154px));
    right: max(368px, calc(env(safe-area-inset-right) + 368px));
    width: 204px;
  }

  #endless-hud-root.is-trial-active.is-drawer-open .endless-events-dock {
    top: max(186px, calc(env(safe-area-inset-top) + 182px));
  }
}

/* =========================================================================
   WAVE 12: MOBILE COMPACT EVENTS STRIP, DISMISSIBLE POP-CARDS & CLEAN HUD
   Desktop 1280x800 keeps full Events Dock & Party HUD; Mobile uses slim bars
   ========================================================================= */
.endless-mobile-events-strip {
  display: none;
  position: absolute;
  z-index: 25;
  align-items: center;
  flex-wrap: nowrap;
  gap: 4px;
  height: 24px;
  max-height: 26px;
  pointer-events: none;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.endless-mobile-events-strip::-webkit-scrollbar {
  display: none;
}

.endless-mobile-events-strip.hidden {
  display: none !important;
}

.endless-m-buff-list {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  pointer-events: none;
}

.endless-m-buff-list.hidden {
  display: none !important;
}

.endless-m-evt-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 22px;
  padding: 0 5px;
  font-family: inherit;
  font-size: 0.27rem;
  letter-spacing: 0.02em;
  color: #f8fafc;
  background: linear-gradient(180deg, rgba(14, 18, 34, 0.95) 0%, rgba(7, 9, 18, 0.98) 100%);
  border: 1.5px solid rgba(212, 175, 55, 0.72);
  outline: 1px solid #000;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
  overflow: hidden;
  text-shadow: 0 1px 0 #000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.84);
  pointer-events: auto;
}

.endless-m-evt-pill.hidden {
  display: none !important;
}

.endless-m-evt-pill.is-bounty,
.endless-m-evt-pill.is-merchant {
  cursor: pointer;
}

.endless-m-evt-pill.is-bounty.is-claimable {
  color: #090c14;
  background: linear-gradient(180deg, #fef08a 0%, #eab308 100%);
  border-color: #ffffff;
  text-shadow: none;
  animation: endlessBountyClaimPulse 1.15s ease-in-out infinite;
}

.endless-m-evt-pill.is-merchant {
  color: #fef08a;
  background: linear-gradient(180deg, rgba(44, 20, 74, 0.96) 0%, rgba(12, 10, 26, 0.98) 100%);
  border-color: #c084fc;
  box-shadow: 0 0 8px rgba(192, 132, 252, 0.55), 0 2px 8px rgba(0, 0, 0, 0.86);
}

.endless-m-evt-pill.is-merchant.is-affordable {
  border-color: #facc15;
  box-shadow: 0 0 10px rgba(250, 204, 21, 0.65), 0 2px 8px rgba(0, 0, 0, 0.88);
}

.endless-m-evt-pill.is-pop-open {
  border-color: #ffffff;
  filter: brightness(1.12);
}

.endless-m-evt-pill.is-buff {
  padding: 0 5px 2px;
}

.endless-m-evt-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.endless-m-evt-ico svg {
  width: 10px;
  height: 10px;
}

.endless-m-evt-txt {
  line-height: 1;
}

.endless-m-buff-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: rgba(5, 7, 18, 0.92);
}

.endless-m-buff-fill {
  height: 100%;
  width: 100%;
  background: #facc15;
  transition: width 0.1s linear;
}

/* Mobile Dismissible Pop-Card Layer */
.endless-mobile-popcard-layer {
  display: none;
  position: absolute;
  inset: 0;
  z-index: 29;
  pointer-events: none;
}

.endless-mobile-popcard-layer.hidden {
  display: none !important;
}

.endless-mobile-popcard {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 5px 7px;
  background: linear-gradient(180deg, rgba(18, 16, 36, 0.97) 0%, rgba(8, 10, 20, 0.99) 100%);
  border: 1.5px solid #d4af37;
  border-left: 3px solid #facc15;
  outline: 1px solid #000;
  border-radius: 5px;
  box-shadow:
    inset 0 1px 0 rgba(254, 240, 138, 0.26),
    0 8px 22px rgba(0, 0, 0, 0.94);
  pointer-events: auto;
}

.endless-mobile-popcard.hidden {
  display: none !important;
}

.endless-mobile-popcard.is-merchant {
  border-color: #c084fc;
  box-shadow:
    inset 0 1px 0 rgba(233, 213, 255, 0.24),
    0 0 14px rgba(168, 85, 247, 0.4),
    0 8px 22px rgba(0, 0, 0, 0.94);
}

.endless-m-pop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  min-width: 0;
}

.endless-m-pop-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
}

.endless-m-pop-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.endless-m-pop-ico svg {
  width: 11px;
  height: 11px;
}

.endless-m-pop-title {
  font-size: 0.31rem;
  color: #fde047;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 #000;
}

.endless-m-pop-head-right {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.endless-m-pop-timer {
  font-size: 0.26rem;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(168, 85, 247, 0.26);
  border: 1px solid rgba(192, 132, 252, 0.72);
  color: #e9d5ff;
  white-space: nowrap;
}

.endless-m-pop-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  padding: 0;
  color: #fde047;
  background: rgba(15, 19, 32, 0.96);
  border: 1px solid rgba(212, 175, 55, 0.65);
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
}

.endless-m-pop-close svg {
  width: 9px;
  height: 9px;
}

.endless-m-pop-prog-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.28rem;
  min-width: 0;
}

.endless-m-pop-prog-txt {
  color: #f8fafc;
  white-space: nowrap;
}

.endless-m-pop-reward {
  color: #fde047;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-m-pop-sub {
  font-size: 0.26rem;
  color: #cbd5e1;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endless-m-pop-track {
  position: relative;
  width: 100%;
  height: 3px;
  background: #050712;
  border: 1px solid rgba(212, 175, 55, 0.45);
  border-radius: 2px;
  overflow: hidden;
}

.endless-m-pop-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  background: #facc15;
  transition: width 0.1s linear;
}

.endless-m-pop-fill.is-merchant {
  background: linear-gradient(90deg, #a855f7 0%, #facc15 100%);
}

.endless-m-pop-cta {
  width: 100%;
  padding: 4px 6px;
  font-family: inherit;
  font-size: 0.30rem;
  letter-spacing: 0.04em;
  color: #090c14;
  background: linear-gradient(180deg, #fef08a 0%, #eab308 100%);
  border: 1.5px solid #ffffff;
  outline: 1px solid #000;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
}

.endless-m-pop-cta.hidden {
  display: none !important;
}

.endless-m-pop-cta:disabled {
  color: #64748b;
  background: linear-gradient(180deg, rgba(22, 28, 45, 0.92) 0%, rgba(12, 15, 26, 0.95) 100%);
  border-color: #334155;
  cursor: not-allowed;
}
`,
buildLandscapeCss(`  /* Wave 12 Mobile Landscape (844x390): Unified Slim Top Bar + Single-Row Party Strip + Edge Events Strip */
  .endless-top-stack {
    top: max(52px, calc(env(safe-area-inset-top) + 48px));
    left: max(6px, env(safe-area-inset-left));
    right: max(6px, env(safe-area-inset-right));
    width: auto;
    max-width: none;
    align-items: center;
    gap: 3px;
  }

  .endless-top-bar {
    width: 100%;
    max-width: 100%;
    flex-wrap: nowrap;
    justify-content: space-between;
    padding: 2px 5px;
    gap: 4px;
    border-width: 1.5px;
  }

  .endless-stage-badge {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    font-size: 0.33rem;
    padding: 2px 5px;
    gap: 4px;
  }

  .endless-stage-badge > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .endless-modifier-pill {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    font-size: 0.29rem;
    padding: 1px 4px 1px 3px;
    gap: 3px;
  }

  .endless-wave-meter {
    flex-shrink: 0;
    min-width: 72px;
    height: 15px;
    padding: 0 4px;
  }

  .endless-currency-group {
    flex-shrink: 0;
    gap: 4px;
  }

  .endless-currency-pill {
    font-size: 0.34rem;
    padding: 1px 5px 1px 3px;
    gap: 3px;
  }

  .endless-fever-meter {
    flex-shrink: 0;
    width: 68px;
    height: 14px;
  }

  #endless-shop-toggle {
    position: static !important;
    top: auto !important;
    right: auto !important;
    flex-shrink: 0;
    padding: 2px 6px 2px 4px;
    font-size: 0.32rem;
    gap: 4px;
    border-width: 1.5px;
    box-shadow: none;
  }

  .endless-toggle-label-full {
    display: none;
  }

  .endless-toggle-label-short {
    display: inline;
  }

  .endless-toggle-icon {
    width: 14px;
    height: 14px;
  }

  .endless-boss-controls .endless-autoboss-btn {
    display: none !important;
  }

  .endless-boss-controls:not(.has-challenge) {
    display: none !important;
  }

  .endless-drawer-autoboss-btn {
    font-size: 0.27rem;
    padding: 2px 5px;
  }

  .endless-shop-shell {
    top: max(81px, calc(env(safe-area-inset-top) + 77px));
    right: max(6px, env(safe-area-inset-right));
    bottom: max(6px, env(safe-area-inset-bottom));
    width: min(332px, 50vw);
  }

  /* Ultra-Compact Single-Row Party Strip (height <= 34px, clears left battlefield) */
  #endless-hud-root .endless-party-hud {
    left: max(6px, env(safe-area-inset-left));
    top: max(81px, calc(env(safe-area-inset-top) + 77px));
    width: auto;
    max-width: calc(100vw - 16px);
    flex-direction: row;
    align-items: center;
    gap: 4px;
  }

  #endless-hud-root.is-trial-active .endless-party-hud {
    top: max(114px, calc(env(safe-area-inset-top) + 110px));
  }

  .endless-party-strip {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 4px;
  }

  .endless-party-card {
    position: relative;
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    padding: 0;
    gap: 0;
    overflow: hidden;
    border-radius: 4px;
  }

  .endless-party-port-wrap {
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: 0;
  }

  .endless-party-portrait {
    width: 30px;
    height: 30px;
  }

  .endless-party-meta {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    gap: 0;
    pointer-events: none;
  }

  .endless-party-head,
  .endless-party-ult-tag {
    display: none !important;
  }

  .endless-party-ult-row {
    gap: 0;
  }

  .endless-party-ult-track {
    height: 4px;
    border: none;
    border-top: 1px solid #000;
    border-radius: 0;
  }

  .endless-party-star {
    top: 0;
    right: 0;
    bottom: auto;
    padding: 0 2px;
    font-size: 0.22rem;
    border-top: none;
    border-bottom: 1px solid #d4af37;
    border-left: 1px solid #d4af37;
    border-radius: 0 0 0 2px;
  }

  .endless-party-star-ico {
    display: inline-flex;
    width: 5px;
    height: 5px;
  }

  .endless-party-star-ico svg {
    width: 5px;
    height: 5px;
  }

  .endless-synergy-hud {
    display: none !important;
  }

  .endless-party-syn-chip {
    display: inline-flex;
    height: 26px;
    padding: 0 5px;
    font-size: 0.27rem;
  }

  .endless-overdrive-btn {
    width: auto;
    min-width: 64px;
    max-width: 98px;
    height: 28px;
    min-height: 26px;
    align-self: center;
    padding: 2px 6px;
  }

  .endless-overdrive-label {
    display: none;
  }

  .endless-overdrive-label-short {
    display: inline;
    font-size: 0.27rem;
  }

  .endless-overdrive-btn.is-active .endless-overdrive-label-short {
    padding: 1px 4px;
  }

  /* Replace Desktop Events Dock with Slim Top-Right Mobile Icon Strip (clear of #adv-skill-cluster) */
  #endless-hud-root .endless-events-dock,
  #endless-hud-root .endless-events-dock.has-merchant,
  #endless-hud-root.is-trial-active .endless-events-dock.has-merchant {
    display: none !important;
  }

  #endless-hud-root .endless-mobile-events-strip {
    display: flex;
    top: max(81px, calc(env(safe-area-inset-top) + 77px));
    right: max(6px, env(safe-area-inset-right));
    left: auto;
    max-width: min(340px, calc(100vw - 260px));
    justify-content: flex-end;
  }

  #endless-hud-root.has-challenge-boss .endless-mobile-events-strip {
    max-width: min(326px, calc(50vw - 90px));
  }

  #endless-hud-root.is-trial-active .endless-mobile-events-strip {
    top: max(114px, calc(env(safe-area-inset-top) + 110px));
  }

  #endless-hud-root .endless-mobile-popcard-layer {
    display: block;
  }

  #endless-hud-root .endless-mobile-popcard {
    top: max(108px, calc(env(safe-area-inset-top) + 104px));
    right: max(6px, env(safe-area-inset-right));
    left: auto;
    width: 204px;
  }

  #endless-hud-root.is-trial-active .endless-mobile-popcard {
    top: max(141px, calc(env(safe-area-inset-top) + 137px));
  }

  #endless-hud-root.is-drawer-open .endless-mobile-events-strip,
  #endless-hud-root.is-drawer-open .endless-mobile-popcard-layer {
    display: none !important;
  }

  /* Fix Landscape ALLIES Tab PARTY SYNERGIES Right-Edge Clipping (0px overflow, clean wrap) */
  .endless-party-synergies-box {
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    padding-top: 2px;
  }

  .endless-party-syn-head {
    width: 100%;
    justify-content: space-between;
  }

  .endless-party-syn-list {
    flex: 0 0 auto;
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    overflow: visible;
    max-height: none;
    gap: 3px;
  }

  .endless-party-syn-pill {
    flex: 0 1 auto;
    max-width: 100%;
    min-width: 0;
    padding: 2px 5px;
    gap: 0;
  }

  .endless-party-syn-name {
    font-size: 0.25rem;
    gap: 3px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .endless-comp-ex-badge {
    font-size: 0.24rem;
    padding: 0 4px;
  }

  .endless-comp-aura-badge {
    font-size: 0.23rem;
    padding: 0 3px;
  }`),
`
/* Wave 12 Mobile Portrait (390x844): Unified Slim Top Bar, Compact Party Strip, Slim Events Strip & Clean Split-Screen Armory */
@media (max-width: 560px) {
  html:not(.is-mobile-landscape) .endless-top-stack {
    top: max(54px, calc(env(safe-area-inset-top) + 50px));
    left: 6px;
    right: 6px;
    width: auto;
    max-width: none;
    gap: 3px;
  }

  html:not(.is-mobile-landscape) .endless-top-bar {
    width: 100%;
    max-width: 100%;
    padding: 3px 5px;
    gap: 3px 4px;
    justify-content: space-between;
    border-width: 1.5px;
  }

  html:not(.is-mobile-landscape) .endless-stage-badge {
    order: 1;
    flex: 1 1 118px;
    min-width: 0;
    overflow: hidden;
    font-size: 0.34rem;
    padding: 2px 5px;
    gap: 4px;
  }

  html:not(.is-mobile-landscape) .endless-stage-badge > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  html:not(.is-mobile-landscape) .endless-wave-meter {
    order: 2;
    flex: 0 0 auto;
    min-width: 66px;
    height: 15px;
    padding: 0 4px;
  }

  html:not(.is-mobile-landscape) .endless-wave-label {
    font-size: 0.31rem;
  }

  html:not(.is-mobile-landscape) #endless-shop-toggle,
  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active #endless-shop-toggle {
    order: 3;
    position: static !important;
    top: auto !important;
    right: auto !important;
    flex: 0 0 auto;
    padding: 2px 6px 2px 4px;
    font-size: 0.34rem;
    gap: 4px;
    border-width: 1.5px;
    box-shadow: none;
  }

  html:not(.is-mobile-landscape) .endless-toggle-label-full {
    display: none;
  }

  html:not(.is-mobile-landscape) .endless-toggle-label-short {
    display: inline;
  }

  html:not(.is-mobile-landscape) .endless-toggle-icon {
    width: 14px;
    height: 14px;
  }

  html:not(.is-mobile-landscape) .endless-top-break {
    display: block;
    flex-basis: 100%;
    height: 0;
    order: 4;
  }

  html:not(.is-mobile-landscape) .endless-currency-group {
    order: 5;
    flex: 0 0 auto;
    gap: 4px;
  }

  html:not(.is-mobile-landscape) .endless-currency-pill {
    font-size: 0.35rem;
    padding: 1px 5px 1px 3px;
    gap: 3px;
  }

  html:not(.is-mobile-landscape) .endless-currency-icon {
    width: 13px;
    height: 13px;
  }

  html:not(.is-mobile-landscape) .endless-fever-meter {
    order: 6;
    flex: 1 1 68px;
    max-width: 108px;
    height: 14px;
  }

  html:not(.is-mobile-landscape) .endless-fever-label {
    font-size: 0.28rem;
  }

  html:not(.is-mobile-landscape) .endless-modifier-pill {
    order: 7;
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    font-size: 0.29rem;
    padding: 1px 4px 1px 3px;
    gap: 3px;
  }

  html:not(.is-mobile-landscape) .endless-modifier-icon {
    width: 12px;
    height: 12px;
  }

  html:not(.is-mobile-landscape) .endless-boss-controls .endless-autoboss-btn {
    display: none !important;
  }

  html:not(.is-mobile-landscape) .endless-boss-controls:not(.has-challenge) {
    display: none !important;
  }

  html:not(.is-mobile-landscape) .endless-drawer-autoboss-btn {
    font-size: 0.30rem;
    padding: 3px 6px;
  }

  /* Ultra-Compact Single-Row Mobile Party Strip (height <= 36px) */
  html:not(.is-mobile-landscape) #endless-hud-root .endless-party-hud {
    left: 6px;
    right: 6px;
    top: var(--endless-mobile-party-top, calc(max(106px, calc(env(safe-area-inset-top) + 102px)) + var(--endless-boss-hud-h, 0px)));
    width: auto;
    max-width: none;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 4px;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active .endless-party-hud {
    top: var(--endless-mobile-party-top, calc(max(146px, calc(env(safe-area-inset-top) + 142px)) + var(--endless-boss-hud-h, 0px)));
  }

  html:not(.is-mobile-landscape) .endless-party-strip {
    width: auto;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 4px;
  }

  html:not(.is-mobile-landscape) .endless-party-card {
    position: relative;
    flex: 0 0 34px;
    width: 34px;
    max-width: 34px;
    height: 34px;
    padding: 0;
    gap: 0;
    overflow: hidden;
    border-radius: 4px;
  }

  html:not(.is-mobile-landscape) .endless-party-port-wrap {
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: 0;
  }

  html:not(.is-mobile-landscape) .endless-party-portrait {
    width: 32px;
    height: 32px;
  }

  html:not(.is-mobile-landscape) .endless-party-meta {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    gap: 0;
    pointer-events: none;
  }

  html:not(.is-mobile-landscape) .endless-party-head,
  html:not(.is-mobile-landscape) .endless-party-ult-tag {
    display: none !important;
  }

  html:not(.is-mobile-landscape) .endless-party-ult-row {
    gap: 0;
  }

  html:not(.is-mobile-landscape) .endless-party-ult-track {
    height: 4px;
    border: none;
    border-top: 1px solid #000;
    border-radius: 0;
  }

  html:not(.is-mobile-landscape) .endless-party-star {
    top: 0;
    right: 0;
    bottom: auto;
    padding: 0 2px;
    font-size: 0.22rem;
    border-top: none;
    border-bottom: 1px solid #d4af37;
    border-left: 1px solid #d4af37;
    border-radius: 0 0 0 2px;
  }

  html:not(.is-mobile-landscape) .endless-party-star-ico {
    display: inline-flex;
    width: 5px;
    height: 5px;
  }

  html:not(.is-mobile-landscape) .endless-party-star-ico svg {
    width: 5px;
    height: 5px;
  }

  html:not(.is-mobile-landscape) .endless-synergy-hud {
    display: none !important;
  }

  html:not(.is-mobile-landscape) .endless-party-syn-chip {
    display: inline-flex;
    height: 28px;
    padding: 0 6px;
    font-size: 0.29rem;
  }

  html:not(.is-mobile-landscape) .endless-overdrive-btn {
    width: auto;
    min-width: 72px;
    max-width: 112px;
    height: 30px;
    min-height: 28px;
    align-self: center;
    padding: 2px 7px;
  }

  html:not(.is-mobile-landscape) .endless-overdrive-label {
    display: none;
  }

  html:not(.is-mobile-landscape) .endless-overdrive-label-short {
    display: inline;
    font-size: 0.29rem;
  }

  html:not(.is-mobile-landscape) .endless-overdrive-btn.is-active .endless-overdrive-label-short {
    padding: 1px 4px;
  }

  /* Slim Mobile Events Strip + Dismissible Pop-Cards (Hide Desktop Events Dock) */
  html:not(.is-mobile-landscape) #endless-hud-root .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.has-active-party .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.has-active-party.is-drawer-open .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active .endless-events-dock,
  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active.is-drawer-open .endless-events-dock {
    display: none !important;
  }

  html:not(.is-mobile-landscape) #endless-hud-root .endless-mobile-events-strip {
    display: flex;
    left: 6px;
    right: 6px;
    top: var(--endless-mobile-events-top, calc(max(106px, calc(env(safe-area-inset-top) + 102px)) + var(--endless-boss-hud-h, 0px)));
  }

  html:not(.is-mobile-landscape) #endless-hud-root.has-active-party .endless-mobile-events-strip {
    top: var(--endless-mobile-events-top, calc(max(144px, calc(env(safe-area-inset-top) + 140px)) + var(--endless-boss-hud-h, 0px)));
  }

  html:not(.is-mobile-landscape) #endless-hud-root .endless-mobile-popcard-layer {
    display: block;
  }

  html:not(.is-mobile-landscape) #endless-hud-root .endless-mobile-popcard {
    top: var(--endless-mobile-pop-top, calc(max(172px, calc(env(safe-area-inset-top) + 168px)) + var(--endless-boss-hud-h, 0px)));
    left: 6px;
    right: auto;
    width: min(244px, calc(100vw - 12px));
  }

  /* Clean Portrait Split-Screen Armory: Hide Middle HUD Widgets so Top ~48% Shows Unobstructed Combat */
  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-party-hud,
  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-mobile-events-strip,
  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open .endless-mobile-popcard-layer {
    display: none !important;
  }

  html:not(.is-mobile-landscape) #endless-hud-root.is-drawer-open.has-event-alert #endless-shop-toggle .endless-event-alert-dot {
    display: inline-block;
  }

  html:not(.is-mobile-landscape) .endless-shop-shell {
    top: auto;
    left: 6px;
    right: 6px;
    bottom: max(6px, env(safe-area-inset-bottom));
    height: min(50vh, 422px);
  }

  html:not(.is-mobile-landscape) #app.is-endless-boss-hud-visible #endless-hud-root.is-drawer-open .endless-shop-shell,
  html:not(.is-mobile-landscape) #endless-hud-root.is-trial-active.is-drawer-open .endless-shop-shell {
    height: min(48vh, 408px);
  }
}`
].join("\n");
