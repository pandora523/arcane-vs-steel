---
name: arcane-vs-steel-pipeline
description: Mandatory HD-2D 30fps sprite sheet, VFX sheet, portrait, champion, Adventure Mode, and iOS/macOS Swift port pipeline for pandora523/arcane-vs-steel. Always look up and follow this skill before creating or modifying any champion, sprite sheet, VFX sheet, animation, or native Apple port target in arcane-vs-steel.
---
# Arcane vs Steel — HD-2D Champion, EX Sprite Hygiene & Apple Port Pipeline

## 0. Compact Session Memory (`<= 32 KB` Cap) & Pre-Change Backup
1. **Read First on Session Start**: Read `docs/PROJECT_MEMORY_HANDOFF.md` and `docs/IMPLEMENTATION_LOG.md` FIRST (plus `docs/CHAMPION_DEVELOPMENT_PLAYBOOK.md` when designing a champion). Keep both rolling session docs `<= 32 KB` by archiving entries older than the latest 5 batches into `docs/archive/`; **do NOT read `docs/archive/*`** unless debugging an older regression.
2. **Pre-Change Snapshot**: Always run `bash scripts/create_fallback_backup.sh <label>` before modifying project code or assets (`fallback_backups/`).
3. **Update on Completion**: Record completed milestones in `docs/IMPLEMENTATION_LOG.md` and `docs/PROJECT_MEMORY_HANDOFF.md` (rotating older batches into `docs/archive/` to stay `<= 32 KB`).
4. **Protected Champions (`0` Diff Locked)**: Never alter the 6 protected champions' sprite sheets or VS combat kits (`Ignis Sol`, `Aethelgard`, `Freyja`, `Seraphina`, `Kaze-Maru`, `Chronos`) unless explicitly asked (`0` diff vs `8435209` across all 11 Legacy entities, `*Shaders.js`, and 33 Legacy PNGs).

## 1. New-Champion Design-First Gate (Zero-Rebuild Rule)
Before writing a new builder script or generating 300-cell PNG sheets, lock and align all core specs upfront (ask the user concisely if unspecified so sheets build **once**, avoiding 3-4 full-sheet rebuilds):
1. **Identity & Palette**: Name, title, elemental/archetype theme, primary weapon(s), distinct silhouette, and color ramp (`EX_HERO_PALETTES` in `src/engine/shaders/exNextGenFX.js`).
2. **Combat Role & Roster Scope**: `Melee` vs `Pure Ranged / Battle-Mage`, plus target scope (Wide-Canvas Next-Gen `EX` `9600x2400` vs Dual `Legacy 6240x2080 + EX 9600x2400`).
3. **Full Choreography Spec (`10 Rows x 30 Cols`)**:
   - `Row 2 AUTO_ATTACK` (`[[60, 8], [68, 7], [75, 8], [83, 7]]`) 4 distinct martial beats
   - `Row 3 SKILL` signature construct
   - `Row 4 ULTIMATE` (`F00..F14`) & `TRUE_ULTIMATE` (`F15..F29`) choreography, movement beats, and impact timings

## 2. Mandatory First-Pass EX Sprite & VFX Hygiene (`0` Retrofits Needed)
Apply every rule below inside the initial builder script — never wait for a second cleanup pass:
1. **Nearest-Neighbor Purity, Zero Emojis, Zero Rotation & Zero Chevron Bars**:
   - Enforce `imageSmoothingEnabled = false` (Web) and `.nearest` filtering (`texture.filteringMode = .nearest` / `MTLSamplerMinMagFilter.nearest` on Swift/SpriteKit/Metal).
   - `0` Unicode emojis/dingbats anywhere in UI, `src/**/*.js`, or `docs/**/*.md` — always use pixel-art icons (`hero_icons_sheet.png`, `mage_icons.png`, `avs_brand_logo.png`).
   - `0` `ctx.rotate` / `zRotation` calls on pixel characters, shards, petals, or lightning; use `src/engine/shaders/exNextGenFX.js` + `ArcaneShaderFX` (`0` chevron slash-bars, `0` shadeBox/viewport clips).
2. **Dual Sheet Geometries**:
   - **Legacy (`6240x2080`)**: `10 rows x 30 cols` @ `208x208` (`groundPlantOffset = 4`, boots at `y_208 = 198..199`), `6240x1664` VFX (`8x30` @ `208x208`), `128x128` portrait.
   - **Wide-Canvas EX (`9600x2400`)**: `10 rows x 30 cols` @ `320x240` (drawn at `160x120` logical resolution + `2x` nearest-neighbor upscale, with `512x512` keyposes), `6240x1664` VFX (`8x30` @ `208x208`), `256x256` `*_ex_portrait.png`.
   - **10-Row Layout**: `0: IDLE`, `1: WALK`, `2: AUTO_ATTACK`, `3: SKILL`, `4: ULTIMATE / TRUE_ULTIMATE`, `5: DEATH & HURT`, `6: DASH`, `7: CROUCH`, `8: JUMP / DODGE`, `9: VICTORY`.
3. **Mandatory `scripts/ex_sprite_clean_utils.py` Leak & Hole Pass**:
   - Every EX sheet builder MUST import `scripts/ex_sprite_clean_utils.py` (`clean_512_pose_holes_and_specks`, `seal_160_char_pinholes_and_leaks`, `filter_mask_min_area`, `_fill_enclosed_holes_rgba`).
   - Apply `clean_512_pose_holes_and_specks` on `512x512` master poses and `seal_160_char_pinholes_and_leaks` on every `160x120` logical frame before `2x` upscale (`0` stray alpha dust/leaks, `0` interior body/armor pinholes, bridged coat/cape flaps).
4. **Pixel-by-Pixel Sculpted Hands & Vambraces (`0` Circle/Oval Blobs)**:
   - Never use round oval/circle discs as hands. Sculpt explicit wrist cuffs/vambraces, palm plane, thumb clasp, and articulated finger knuckles wrapping weapon hilts or bowstrings (reference `draw_sculpted_elven_hand_160` in `scripts/build_archer_ex_nextgen_sheet.py` and `draw_sculpted_cyber_hand_160` in `scripts/build_android_ex_nextgen_sheet.py`).
5. **Cell Margins, Grounded Walk/Death/Victory & Landing Feet**:
   - Enforce `>= 4px` transparent inner safety margin on all `300` character cells and `240` VFX cells (`0` border clips, `0` hard `192x192` box edges in VFX).
   - `Row 1 WALK`: Bipedal `+X` forward crossover (`walkStanceDelta <= -6.0px`, `0` moonwalk, non-stick leg thickness). Keep Row-1-only walk pixel locks intact on working sheets (`warrior_ex`, `mage_ex`, `priestess_ex`, `chronomancer_ex`).
   - `Row 4 ULTIMATE / TRUE_ULTIMATE`: Clean planted touchdown feet (`cellMaxY = 229..231`, no detached/split wide skirt islands) and `setState` ground-snap (`this.y = this.groundY; this.vy = 0`).
   - `Row 5 DEATH` & `Row 9 VICTORY`: Grounded horizontal prone `DEATH` (`maxDeathH <= 136px`) and upright `VICTORY` (`minVictoryH >= 120px`) with upright `Row 4` / `Row 9` weapon poses.
6. **Pure-Ranged EX VFX Separation (`maxX <= 262` on `Row 2` & `Row 3`)**:
   - For ranged/mage heroes (`mage_ex`, `priestess_ex`, `valkyrie_ex`, `icemage_ex`, or new ranged champions), NEVER bake point-blank pillars, multi-spear rains, glacier spires, or detached forward magic circles (`x >= 230`) into `*_ex_sheet.png`. Keep character sheets caster-only (`maxX <= 262`) and spawn target-position VFX cleanly on `enemy.x` from `*_ex_vfx.png`.

## 3. Single-Pass New-Champion Wiring & Low-Token Verification
1. **Files to Wire Together Once**:
   - Art & Icons: `scripts/build_<id>_ex_nextgen_sheet.py` -> `assets/sprites/<id>_ex_{sheet,vfx,portrait}.png` + `scripts/build_all_hero_icons.py` (`hero_icons_sheet.png`).
   - Entities, Shaders & Roster: `src/entities/<HeroClass>.js` (`getAiStyleProfile()`, `setState` ground-snap), `src/engine/PixelForge.js` (sheet dimensions & `releaseInactiveAssets`), `src/engine/shaders/exNextGenFX.js` (`EX_HERO_PALETTES`), `src/main.js` (`CHAMPION_ROSTER` / `EX_HERO_KEYS`).
   - Adventure Mode: `src/adventure/AdventureSkillSets.js` (`ADVENTURE_HERO_KITS`, external 2.5D pack cleave adapter, `0` dodge attacks under `_advPureDodge`) + `src/adventure/AdventureProgression.js` (`HERO_SKILL_TREE_THEMES`).
   - Vault & Regression Tests: `build/build_web_vault.mjs` + `scripts/tests/test_all_heroes_gameloop.mjs`.
2. **Low-Token Verification Workflow**:
   - Inner-loop sprite/code checks: `node scripts/tests/test_all_heroes_gameloop.mjs --suite36 --quiet` (or `--ex-only --quiet`) + compact cropped `scratch/` PNG strips for visual inspection.
   - Doc/markdown edits (`< 50ms`): `node scripts/tests/check_docs_hygiene.mjs` (never re-run all 36 gameplay suites solely for markdown changes).
   - Pre-commit Web gates (run ONCE before `git commit` / `git push`, bumping `?v=30fpsXX` only when runtime `.js`/`.png`/`.css`/`index.html` files change):
     - `node scripts/tests/check_all_ult_shader_boxes.mjs`
     - `node scripts/tests/test_all_heroes_gameloop.mjs --quiet`
   - Reserve full `dist/` Vault builds (`node build/build_web_vault.mjs`) + Headless Chrome E2E screenshots for loader/vault, UI/CSS, shader, or `Renderer.js` changes.
   - **NEVER** run `scripts/tests/benchmark_roster_balance.mjs` unless explicitly requested by the user.

## 4. macOS Local Xcode / Swift (`apple/`) Coexistence
- Keep Xcode/Swift targets isolated under `apple/` so root Web/Vercel deployments stay untouched.
- Reuse lossless PNGs in `assets/sprites/` and 69 WAVs in `assets/sfx/` with `.nearest` texture filtering, 1:1 30fps timings, strict VS (`1v1` + `Tag VS`, seamless upper vault & intact floor reflections) vs Adventure (`9600px`, `11,800 HP` `BEHEMOTH MALPHAS` with `ABYSSAL SIEGE GRAB` & unavoidable `HELLPIT SOUL-TITHE`) separation.
