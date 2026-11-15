---
name: arcane-vs-steel-pipeline
description: Mandatory HD-2D 30fps sprite sheet, VFX sheet, portrait, champion, Adventure Mode, and iOS/macOS Swift port pipeline for pandora523/arcane-vs-steel. Always look up and follow this skill before creating or modifying any champion, sprite sheet, VFX sheet, animation, or native Apple port target in arcane-vs-steel.
---
# Arcane vs Steel — HD-2D Champion, Adventure, 30fps Animation & Apple Port Pipeline

## 0. Mandatory Crash-Safe Continuous Implementation Logging (READ & UPDATE EVERY STEP!)
1. **Read First on Session Start**: Always read `docs/IMPLEMENTATION_LOG.md` AND `docs/PROJECT_MEMORY_HANDOFF.md` FIRST alongside `docs/CHAMPION_DEVELOPMENT_PLAYBOOK.md` and `docs/champion_pipeline_db.json` (plus `~/.gemini/jetski/arcane_vs_steel_live_log.md` if present).
2. **Log Every Single Implementation Step Immediately**: Whenever you start (`[IN PROGRESS]`) or finish (`[COMPLETED]`) any feature, champion pass, stage asset, Xcode/Swift target, or milestone, **immediately update** `docs/IMPLEMENTATION_LOG.md` (and `~/.gemini/jetski/arcane_vs_steel_live_log.md` if present) with exact files modified, version, test/build status, and commit SHA.

## 1. Session Continuity, Protected Champions & Verification
- **Baseline & Cache-Busting**: Live web baseline is `?v=30fps110+` (`6240x2080` = `10 rows x 30 cols` @ `208x208` character sheets incl. `Row 9 VICTORY` poses, `vfx` sheets, `128x128` portraits, `64x64` HD-2D skill icon atlases `mage_icons.png` & `hero_icons_sheet.png`, `128x128` `avs_brand_logo.png`, and `9600px` 4-Realm Adventure Mode). Bump `?v=30fpsXX` across `index.html`, `src/`, and `scripts/` whenever changing web assets/JS/CSS.
- **Protected Champions (DO NOT ALTER UNLESS EXPLICITLY ASKED)**:
  1. `Ignis Sol` (`FireMage.js`, `mage`) — `LAYWASTE OF INFERNO` triggers strictly at meteor impact (`t >= 3.22s`).
  2. `Aethelgard` (`Warrior.js`, `warrior`) — `v4` 2H Greatsword rig + High-Sky Sacred Vow & Cathedral Pillar Ult.
  3. `Freyja` (`Valkyrie.js`, `valkyrie`) — Twin-Winged Sky-Sovereign `Row 4`, downward Gungnir command & articulated steep falcon spear-dive.
  4. `Seraphina` (`Priestess.js`, `priestess`) — Strictly grounded `foot_y=99.0` Auto/Skill rig (Wing Vault `86px` preserved) + `FINAL GRACE` (`+30%` heal + `740` beam at `t = 3.03s`).
  5. `Kaze-Maru / Ronin` (`Ronin.js`, `ronin`) — Two-handed *Chūdan-no-Kamae* `Row 1` walk, flesh-cutting gap-close 4-Auto, & 3-beat `AMAKAKERU: SHOGUNATE REALM SLICE` (`shogunate` unburned w/ raining `Sakura Fubuki` blossoms; fuses to `shogunate_inferno` when `inferno` is active or `shogunate_glacial` when `glacial` is active).
  6. `Chronos` (`Chronomancer.js`, `chronomancer`) — Close-quarters 4-slice Twin Clock-Blade/Clone melee (`0` `clock_gear` auto spam), Chrono-Schism Rewind, Mid-Air Time-Stop + `ETERNAL ZERO` (`680` dmg at `t = 3.53s`).
- **Mandatory Pre-Change Fallback Backup (`fallback_backups/`)**:
  - Before modifying project code/assets in any task, always run `bash scripts/create_fallback_backup.sh <label>` so a clean fallback snapshot (`RESTORE_THIS_BACKUP.sh` + `SHA256SUMS.txt`) is saved in `fallback_backups/`.
- **Mandatory Pre-Push Web Test Suites**:
  - `node scripts/tests/check_all_ult_shader_boxes.mjs`
  - `node scripts/tests/test_all_heroes_gameloop.mjs`
- **Character Balance Benchmark Policy (`benchmark_roster_balance.mjs`)**:
  - **NEVER run `scripts/tests/benchmark_roster_balance.mjs` or adjust character combat balance during normal UI, engine, stage, Adventure, audio, or platform tasks — ONLY run `benchmark_roster_balance.mjs` when the user explicitly asks to test or change character balance!**

## 2. Core Non-Negotiable HD-2D Sprite & Rendering Rules (Web & Native Swift/SpriteKit/Metal)
1. **Nearest-Neighbor Pixel Purity (`0` Bilinear Blur, `0` Emojis)**:
   - Web: `imageSmoothingEnabled = false`; Native Swift/SpriteKit/Metal: always enforce `.nearest` texture filtering (`texture.filteringMode = .nearest` / `MTLSamplerMinMagFilter.nearest`) on all sprites, stages, portraits, brand crest (`avs_brand_logo.png`), and VFX atlases. Never use Unicode emojis in UI — use official pixel-art icons and `avs_brand_logo.png`.
2. **10-Row `6240x2080` Layout & Grounded Rig Invariants**:
   - All 11 champions use `10 rows x 30 frames` (`6240x2080`, `208x208` per cell):
     - `Row 0`: `IDLE` | `Row 1`: `WALK` | `Row 2`: `AUTO_ATTACK` (`[[60, 8], [68, 7], [75, 8], [83, 7]]`) | `Row 3`: `SKILL` | `Row 4`: `ULTIMATE` / `TRUE_ULTIMATE` | `Row 5`: `DEATH & HURT` | `Row 6`: `DASH` | `Row 7`: `CROUCH` | `Row 8`: `JUMP` / `DODGE` | `Row 9`: `VICTORY`.
   - Grounded boots plant at `y_104 = 99` (`y_208 = 198..199`) with `groundPlantOffset = 4`.
   - Never use sprite rotation/skew (`0` `ctx.rotate` / `zRotation` on pixel characters, petals, shards, or lightning).
   - Keep VS bottom floor & character reflections intact while using seamless upper sky/vault extension (`0` upside-down top stage mirror).

## 3. macOS Local Xcode / Swift (iOS + macOS) Workflow
- When running locally on macOS, inspect `xcode-select -p` and `xcodebuild -version` directly via terminal tools.
- Reuse the exact lossless PNG assets in `assets/sprites/` and 69 stereo WAVs in `assets/sfx/` without lossy recompression, preserving 1:1 30fps combat timings, separated Versus (`1v1` + `Tag VS`) vs Adventure gateways, and Colossal Boss `BEHEMOTH MALPHAS` (`11,800 HP`, `ABYSSAL SIEGE GRAB`, and unavoidable `HELLPIT SOUL-TITHE`).
